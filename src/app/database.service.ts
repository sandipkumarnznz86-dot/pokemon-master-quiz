import { Injectable } from '@angular/core';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { firebaseAuth, firebaseDb } from './firebase';
import { getRank } from './ranking';
import { normalizeGameMode } from './pages/quiz/game.models';

export interface QuizResult {
  score: number;
  correctAnswers: number;
  questionCount: number;
  difficulty: 'easy' | 'normal' | 'hard';
  bestStreak: number;
  gameMode?: 'knowledge' | 'guess' | 'type' | 'who-am-i' | 'speed';
  wrongAnswers?: number;
  accuracy?: number;
  timeLimit?: number;
  questionsAnswered?: number;
  bestCombo?: number;
}

export interface StoredQuizResult extends QuizResult {
  id: string;
  createdAt: Date | null;
  playedAt?: Date | null;
}

export interface QuizSummary {
  gamesPlayed: number;
  correctAnswers: number;
  totalQuestions: number;
  accuracy: number;
  currentStreak: number;
  bestScore: number | null;
  recentResult: StoredQuizResult | null;
}

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  private readonly db = firebaseDb;

  async getBestScore(): Promise<number | null> {
    try {
      await firebaseAuth.authStateReady();
      const user = firebaseAuth.currentUser;
      if (!user) {
        return null;
      }

      const snapshot = await getDoc(doc(this.db, 'users', user.uid));
      const score = snapshot.data()?.['bestScore'];
      return typeof score === 'number' ? score : null;
    } catch (error) {
      this.logDatabaseError('[database] best score read failed', error);
      throw error;
    }
  }

  async saveQuizResult(result: QuizResult): Promise<void> {
    try {
      await firebaseAuth.authStateReady();
      const user = firebaseAuth.currentUser;
      if (!user) {
        throw new Error('auth-session-missing');
      }

      const userRef = doc(this.db, 'users', user.uid);
      const resultRef = doc(collection(this.db, 'users', user.uid, 'quizResults'));
      const resultData = Object.fromEntries(
        Object.entries({
          ...result,
          uid: user.uid,
          gameMode: normalizeGameMode(result.gameMode),
        }).filter(([, value]) => value !== undefined),
      );

      await runTransaction(this.db, async (transaction) => {
        const userSnapshot = await transaction.get(userRef);
        const userData = userSnapshot.data() ?? {};
        const storedBest = userData['bestScore'];
        const storedRankPoints =
          typeof userData['rankPoints'] === 'number'
            ? userData['rankPoints']
            : 0;
        const rankPoints = storedRankPoints + Math.max(0, result.score);
        const bestScore =
          typeof storedBest === 'number'
            ? Math.max(storedBest, result.score)
            : result.score;

        transaction.set(resultRef, {
          ...resultData,
          createdAt: serverTimestamp(),
          playedAt: serverTimestamp(),
        });
        transaction.set(
          userRef,
          {
            uid: user.uid,
            email: user.email ?? '',
            bestScore,
            rankPoints,
            rank: getRank(rankPoints).name,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        );
      });
      console.info('[database] quiz result saved', { uid: user.uid });
    } catch (error) {
      this.logDatabaseError('[database] quiz result write failed', error);
      throw error;
    }
  }

  async getQuizHistory(): Promise<StoredQuizResult[]> {
    try {
      await firebaseAuth.authStateReady();
      const user = firebaseAuth.currentUser;
      if (!user) {
        return [];
      }

      const snapshot = await getDocs(
        collection(this.db, 'users', user.uid, 'quizResults'),
      );

      const results = snapshot.docs
        .map((result) => {
        const data = result.data();
        const timestamp = data['createdAt'];
        return {
          id: result.id,
          score: typeof data['score'] === 'number' ? data['score'] : 0,
          correctAnswers:
            typeof data['correctAnswers'] === 'number'
              ? data['correctAnswers']
              : 0,
          questionCount:
            typeof data['questionCount'] === 'number'
              ? data['questionCount']
              : 0,
          difficulty:
            data['difficulty'] === 'easy' ||
            data['difficulty'] === 'hard'
              ? data['difficulty']
              : 'normal',
          bestStreak:
            typeof data['bestStreak'] === 'number' ? data['bestStreak'] : 0,
          gameMode: normalizeGameMode(
            data['gameMode'] ?? data['gameType'] ?? data['category'],
          ),
          wrongAnswers:
            typeof data['wrongAnswers'] === 'number'
              ? data['wrongAnswers']
              : Math.max(
                  0,
                  (typeof data['questionCount'] === 'number'
                    ? data['questionCount']
                    : 0) -
                    (typeof data['correctAnswers'] === 'number'
                      ? data['correctAnswers']
                      : 0),
                ),
          accuracy:
            typeof data['accuracy'] === 'number'
              ? data['accuracy']
              : typeof data['questionCount'] === 'number' &&
                  data['questionCount']
                ? Math.round(
                    ((typeof data['correctAnswers'] === 'number'
                      ? data['correctAnswers']
                      : 0) /
                      data['questionCount']) *
                      100,
                  )
                : 0,
          createdAt:
            timestamp && typeof timestamp.toDate === 'function'
              ? timestamp.toDate()
              : null,
          playedAt:
            timestamp && typeof timestamp.toDate === 'function'
              ? timestamp.toDate()
              : null,
        } as StoredQuizResult;
        })
        .sort((first, second) => {
          const firstTime = first.createdAt?.getTime() ?? 0;
          const secondTime = second.createdAt?.getTime() ?? 0;
          return secondTime - firstTime;
        });
      console.info('[database] quiz history retrieved', {
        uid: user.uid,
        count: results.length,
      });
      return results;
    } catch (error) {
      this.logDatabaseError('[database] quiz history read failed', error);
      throw error;
    }
  }

  async getQuizSummary(): Promise<QuizSummary> {
    const results = await this.getQuizHistory();
    const correctAnswers = results.reduce(
      (total, result) => total + result.correctAnswers,
      0,
    );
    const totalQuestions = results.reduce(
      (total, result) => total + result.questionCount,
      0,
    );
    const scores = results.map((result) => result.score);

    return {
      gamesPlayed: results.length,
      correctAnswers,
      totalQuestions,
      accuracy: totalQuestions
        ? Math.round((correctAnswers / totalQuestions) * 100)
        : 0,
      currentStreak: results[0]?.bestStreak ?? 0,
      bestScore: scores.length ? Math.max(...scores) : null,
      recentResult: results[0] ?? null,
    };
  }

  private logDatabaseError(message: string, error: unknown): void {
    const safeError = error as { code?: string; message?: string };
    console.error(message, {
      code: safeError?.code ?? 'unknown',
      message: safeError?.message ?? 'Unknown Firestore error',
    });
  }
}
