import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { DatabaseService } from '../../database.service';
import { AuthService } from '../../auth.service';
import { GameMode, GameResult } from './game.models';

@Injectable({ providedIn: 'root' })
export class GameService {
  private pendingResult: GameResult | null = null;
  private finishing = false;
  private lastSaveFailed = false;

  constructor(
    private readonly router: Router,
    private readonly databaseService: DatabaseService,
    private readonly authService: AuthService,
  ) {}

  randomId(max: number, used: Set<number>): number {
    let id = Math.floor(Math.random() * max) + 1;
    while (used.has(id) && used.size < max) {
      id = Math.floor(Math.random() * max) + 1;
    }
    return id;
  }

  shuffle<T>(items: T[]): T[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  async finish(result: GameResult): Promise<void> {
    if (this.finishing) {
      return;
    }

    this.finishing = true;
    this.pendingResult = result;
    this.lastSaveFailed = false;
    try {
      await this.saveResult(result);
      await this.authService.refreshGameUser();
    } catch (error) {
      this.lastSaveFailed = true;
      this.logSaveError(error);
      // Keep the result screen usable if Firestore is temporarily unavailable.
    } finally {
      this.finishing = false;
      await this.router.navigate(['/quiz/result']);
    }
  }

  get resultSaveFailed(): boolean {
    return this.lastSaveFailed;
  }

  saveResult(
    result: GameResult,
    difficulty: 'easy' | 'normal' | 'hard' = 'normal',
  ): Promise<void> {
    return this.databaseService.saveQuizResult({
      gameMode: result.gameMode,
      score: result.score,
      correctAnswers: result.correctAnswers,
      wrongAnswers: result.wrongAnswers,
      questionCount: result.totalQuestions,
      accuracy: result.accuracy,
      bestStreak: result.bestStreak,
      bestCombo: result.bestCombo,
      timeLimit: result.timeLimit,
      questionsAnswered: result.questionsAnswered,
      difficulty,
    });
  }

  private logSaveError(error: unknown): void {
    const safeError = error as { code?: string; message?: string };
    console.error('[quiz-history] result save failed', {
      code: safeError?.code ?? 'unknown',
      message: safeError?.message ?? 'Unknown Firestore error',
    });
  }

  consumeResult(): GameResult | null {
    const result = this.pendingResult;
    this.pendingResult = null;
    return result;
  }

  modeLabel(mode: GameMode): string {
    return {
      knowledge: 'Knowledge Quiz',
      guess: 'Guess the Pokémon',
      type: 'Type Challenge',
      'who-am-i': 'Who Am I?',
      speed: 'Speed Battle',
    }[mode];
  }
}
