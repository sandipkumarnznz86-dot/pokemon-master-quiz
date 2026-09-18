import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup } from '@angular/forms';
import { forkJoin, Subscription } from 'rxjs';
import { DataService, Pokemon, PokemonSpecies } from '../../data.service';
import { LanguageService } from '../../language.service';
import { AuthService } from '../../auth.service';
import { DatabaseService } from '../../database.service';
import { GameService } from './game.service';

type Difficulty = 'easy' | 'normal' | 'hard';
type AnswerState = 'unanswered' | 'correct' | 'incorrect';

@Component({
  selector: 'app-quiz',
  templateUrl: './quiz.component.html',
  styleUrls: ['./quiz.component.scss'],
})
export class QuizComponent implements OnInit, OnDestroy {
  readonly typeNames = [
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy',
  ];
  readonly japaneseTypeNames: Record<string, string> = {
    normal: 'ノーマル',
    fire: 'ほのお',
    water: 'みず',
    electric: 'でんき',
    grass: 'くさ',
    ice: 'こおり',
    fighting: 'かくとう',
    poison: 'どく',
    ground: 'じめん',
    flying: 'ひこう',
    psychic: 'エスパー',
    bug: 'むし',
    rock: 'いわ',
    ghost: 'ゴースト',
    dragon: 'ドラゴン',
    dark: 'あく',
    steel: 'はがね',
    fairy: 'フェアリー',
  };

  quizForm: FormGroup;
  pokemon: Pokemon | null = null;
  pokemonName = '';
  answerOptions: string[] = [];
  askedIds = new Set<number>();

  difficulty: Difficulty = 'normal';
  questionCount = 10;
  questionNumber = 1;
  score = 0;
  correctAnswers = 0;
  streak = 0;
  bestStreak = 0;
  bestScore = 0;
  timeLimit = 20;
  timeLeft = 20;

  loading = true;
  submitted = false;
  timeExpired = false;
  quizComplete = false;
  errorMessage = '';

  private timerId?: ReturnType<typeof setInterval>;
  private routeSubscription?: Subscription;
  private localBestScoreKey = '';
  private finishing = false;
  resultSaveFailed = false;

  constructor(
    private fb: FormBuilder,
    private dataService: DataService,
    private databaseService: DatabaseService,
    private games: GameService,
    private route: ActivatedRoute,
    private authService: AuthService,
    readonly languageService: LanguageService,
  ) {
    this.quizForm = this.fb.group({ answer: [''] });
  }

  ngOnInit(): void {
    this.routeSubscription = this.route.queryParamMap.subscribe((params) => {
      const difficulty = params.get('difficulty');
      const questions = Number(params.get('questions'));

      if (difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard') {
        this.difficulty = difficulty;
      }
      if ([5, 10, 15, 20, 30, 40, 50].includes(questions)) {
        this.questionCount = questions;
      }

      this.timeLimit = this.difficulty === 'easy' ? 30 : this.difficulty === 'hard' ? 12 : 20;
      this.timeLeft = this.timeLimit;
      this.loadCloudBestScore();
      this.loadQuestion();
    });
  }

  ngOnDestroy(): void {
    this.clearTimer();
    this.routeSubscription?.unsubscribe();
  }

  get correctType(): string {
    return this.pokemon?.types[0]?.type.name ?? '';
  }

  get answerState(): AnswerState {
    if (!this.submitted) {
      return 'unanswered';
    }

    return this.quizForm.value.answer === this.correctType && !this.timeExpired
      ? 'correct'
      : 'incorrect';
  }

  get progressPercent(): number {
    return (this.questionNumber / this.questionCount) * 100;
  }

  get timerPercent(): number {
    return (this.timeLeft / this.timeLimit) * 100;
  }

  get difficultyLabel(): string {
    return {
      easy: 'かんたん',
      normal: 'ふつう',
      hard: 'むずかしい',
    }[this.difficulty];
  }

  get accuracyPercent(): number {
    return this.questionNumber
      ? Math.round((this.correctAnswers / this.questionNumber) * 100)
      : 0;
  }

  loadQuestion(): void {
    this.clearTimer();
    this.loading = true;
    this.submitted = false;
    this.timeExpired = false;
    this.errorMessage = '';
    this.pokemon = null;
    this.quizForm.reset({ answer: '' });

    const pokemonId = this.getRandomPokemonId();
    this.askedIds.add(pokemonId);

    forkJoin({
      pokemon: this.dataService.getPokemon(pokemonId),
      species: this.dataService.getPokemonSpecies(pokemonId),
    }).subscribe({
      next: ({ pokemon, species }) => {
        this.pokemon = pokemon;
        this.pokemonName = this.getJapanesePokemonName(species, pokemon.name);
        this.answerOptions = this.createAnswerOptions(this.correctType);
        this.loading = false;
        this.startTimer();
      },
      error: () => {
        this.loading = false;
        this.errorMessage = 'ãƒã‚±ãƒ¢ãƒ³ã®æƒ…å ±ã‚’å–å¾—ã§ãã¾ã›ã‚“ã§ã—ãŸã€‚ã‚‚ã†ä¸€åº¦ãŠè©¦ã—ãã ã•ã„ã€‚';
      },
    });
  }

  submitAnswer(expired = false): void {
    if (this.submitted) {
      return;
    }

    this.timeExpired = expired;
    this.submitted = true;
    this.clearTimer();

    if (this.answerState === 'correct') {
      this.correctAnswers++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += 100 + this.timeLeft * 5 + Math.max(0, this.streak - 1) * 25;
      this.saveBestScore();
    } else {
      this.streak = 0;
    }
  }

  async nextQuestion(): Promise<void> {
    if (this.finishing) {
      return;
    }

    if (this.questionNumber >= this.questionCount) {
      this.finishing = true;
      this.saveBestScore();
      try {
        await this.saveResult();
      } catch (error) {
        this.resultSaveFailed = true;
        console.error('[quiz-history] type challenge result save failed', error);
        // Keep the local result available if Firestore is temporarily unavailable.
      } finally {
        this.quizComplete = true;
        this.finishing = false;
      }
      return;
    }

    this.questionNumber++;
    this.loadQuestion();
  }

  restartGame(): void {
    this.askedIds.clear();
    this.questionNumber = 1;
    this.score = 0;
    this.correctAnswers = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.quizComplete = false;
    this.resultSaveFailed = false;
    this.finishing = false;
    this.loadQuestion();
  }

  formatName(name: string): string {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  formatTypeName(type: string): string {
    return this.japaneseTypeNames[type] ?? type;
  }

  isSelected(option: string): boolean {
    return this.quizForm.value.answer === option;
  }

  private startTimer(): void {
    this.timeLeft = this.timeLimit;
    this.timerId = setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.submitAnswer(true);
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = undefined;
    }
  }

  private getRandomPokemonId(): number {
    const maxId = this.difficulty === 'easy'
      ? 151
      : this.difficulty === 'hard'
        ? 1025
        : 493;
    let id = Math.floor(Math.random() * maxId) + 1;

    while (this.askedIds.has(id) && this.askedIds.size < maxId) {
      id = Math.floor(Math.random() * maxId) + 1;
    }

    return id;
  }

  private createAnswerOptions(correctType: string): string[] {
    const incorrectTypes = this.shuffle(
      this.typeNames.filter((type) => type !== correctType),
    ).slice(0, 3);

    return this.shuffle([correctType, ...incorrectTypes]);
  }

  private shuffle(items: string[]): string[] {
    return [...items].sort(() => Math.random() - 0.5);
  }

  private getJapanesePokemonName(
    species: PokemonSpecies,
    fallbackName: string,
  ): string {
    return species.names.find((entry) => entry.language.name === 'ja')?.name
      ?? this.formatName(fallbackName);
  }

  private saveBestScore(): void {
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      if (this.localBestScoreKey) {
        localStorage.setItem(this.localBestScoreKey, String(this.bestScore));
      }
    }
  }

  private async loadCloudBestScore(): Promise<void> {
    try {
      const user = await this.authService.getAuthenticatedUser();
      if (!user) {
        return;
      }

      this.localBestScoreKey = `pokedex-quiz-best-score:${user.uid}`;
      const localScore = Number(localStorage.getItem(this.localBestScoreKey));
      if (Number.isFinite(localScore)) {
        this.bestScore = Math.max(this.bestScore, localScore);
      }

      const score = await this.databaseService.getBestScore();
        if (score !== null) {
          this.bestScore = Math.max(this.bestScore, score);
        }
    } catch (error) {
      console.error('[quiz-history] best score synchronization failed', error);
    }
  }

  private saveResult(): Promise<void> {
    return this.games.saveResult({
      gameMode: 'type',
      score: this.score,
      correctAnswers: this.correctAnswers,
      wrongAnswers: this.questionCount - this.correctAnswers,
      totalQuestions: this.questionCount,
      accuracy: this.accuracyPercent,
      bestStreak: this.bestStreak,
    }, this.difficulty);
  }
}
