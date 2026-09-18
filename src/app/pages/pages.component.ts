import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LanguageService } from '../language.service';
import { AuthService } from '../auth.service';
import { DatabaseService, QuizSummary } from '../database.service';

type Difficulty = 'easy' | 'normal' | 'hard';

@Component({
  selector: 'app-pages',
  templateUrl: './pages.component.html',
  styleUrls: ['./pages.component.scss'],
})
export class PagesComponent {
  difficulty: Difficulty = 'normal';
  questionCount = 10;
  readonly questionCounts = [5, 10, 15, 20, 30, 40, 50];
  summary: QuizSummary | null = null;

  readonly difficulties: Array<{
    value: Difficulty;
    label: string;
    description: string;
  }> = [
    { value: 'easy', label: 'Easy', description: 'Pokémon from the first generation' },
    { value: 'normal', label: 'Normal', description: 'Pokémon from generations 1â€“4' },
    { value: 'hard', label: 'Hard', description: 'Pokémon from the full Pokédex' },
  ];

  constructor(
    private router: Router,
    readonly languageService: LanguageService,
    readonly authService: AuthService,
    private readonly databaseService: DatabaseService,
  ) {}

  ngOnInit(): void {
    void this.databaseService.getQuizSummary().then((summary) => {
      this.summary = summary;
    }).catch((error: unknown) => {
      console.error('[dashboard] database read failed', error);
    });
  }

  startGame(): void {
    this.router.navigate(['/quiz/type'], {
      queryParams: {
        difficulty: this.difficulty,
        questions: this.questionCount,
      },
    });
  }
}
