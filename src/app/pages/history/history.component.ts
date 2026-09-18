import { Component, OnInit } from '@angular/core';
import { DatabaseService, StoredQuizResult } from '../../database.service';
import { LanguageService } from '../../language.service';
import { AuthService } from '../../auth.service';
import { GameMode, normalizeGameMode } from '../quiz/game.models';
import { firstValueFrom, take } from 'rxjs';

@Component({
  selector: 'app-history',
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
  results: StoredQuizResult[] = [];
  selectedMode: GameMode | 'all' = 'all';
  readonly gameModes: GameMode[] = [
    'knowledge',
    'guess',
    'type',
    'who-am-i',
    'speed',
  ];
  loading = true;
  error = false;

  constructor(
    readonly databaseService: DatabaseService,
    readonly languageService: LanguageService,
    private readonly authService: AuthService,
  ) {}

  ngOnInit(): void {
    void this.loadHistory();
  }

  private async loadHistory(): Promise<void> {
    try {
      const user = await firstValueFrom(this.authService.authState$.pipe(take(1)));
      if (!user) {
        this.results = [];
        return;
      }

      this.results = await this.databaseService.getQuizHistory();
    } catch (error) {
      this.logHistoryError(error);
      this.error = true;
    } finally {
      this.loading = false;
    }
  }

  accuracy(result: StoredQuizResult): number {
    return result.questionCount
      ? Math.round((result.correctAnswers / result.questionCount) * 100)
      : 0;
  }

  filteredResults(): StoredQuizResult[] {
    return this.selectedMode === 'all'
      ? this.results
      : this.results.filter(
          (result) => this.gameMode(result) === this.selectedMode,
        );
  }

  gameMode(result: StoredQuizResult): GameMode {
    return normalizeGameMode(result.gameMode);
  }

  gameLabel(mode: GameMode): string {
    if (this.languageService.language === 'ja') {
      return {
        knowledge: '知識クイズ',
        guess: 'ポケモン当て',
        type: 'タイプチャレンジ',
        'who-am-i': '私は誰？',
        speed: 'スピードバトル',
      }[mode];
    }

    return {
      knowledge: 'Knowledge Quiz',
      guess: 'Guess the Pokémon',
      type: 'Type Challenge',
      'who-am-i': 'Who Am I?',
      speed: 'Speed Battle',
    }[mode];
  }

  filterLabel(mode: GameMode | 'all'): string {
    return mode === 'all'
      ? this.languageService.language === 'en'
        ? 'All'
        : 'すべて'
      : this.gameLabel(mode);
  }

  private logHistoryError(error: unknown): void {
    const safeError = error as { code?: string; message?: string };
    console.error('[quiz-history] history load failed', {
      code: safeError?.code ?? 'unknown',
      message: safeError?.message ?? 'Unknown Firestore error',
    });
  }
}
