import { Component, OnDestroy, OnInit } from '@angular/core';
import { forkJoin, Subscription } from 'rxjs';
import { DataService, Pokemon } from '../../../data.service';
import { GameService } from '../game.service';
import { LanguageService } from '../../../language.service';

@Component({
  selector: 'app-knowledge-quiz',
  templateUrl: './knowledge-quiz.component.html',
  styleUrls: ['./knowledge-quiz.component.scss'],
})
export class KnowledgeQuizComponent implements OnInit, OnDestroy {
  pokemon: Pokemon | null = null;
  options: Pokemon[] = [];
  japaneseNames: Record<number, string> = {};
  question = 1;
  score = 0;
  correct = 0;
  streak = 0;
  bestStreak = 0;
  selected: Pokemon | null = null;
  locked = false;
  loading = true;
  error = '';
  private used = new Set<number>();
  private request?: Subscription;

  constructor(
    private readonly data: DataService,
    private readonly games: GameService,
    readonly languageService: LanguageService,
  ) {}

  ngOnInit(): void { this.loadQuestion(); }
  ngOnDestroy(): void { this.request?.unsubscribe(); }

  get total(): number { return 10; }
  get progress(): number { return (this.question / this.total) * 100; }

  loadQuestion(): void {
    this.loading = true;
    this.locked = false;
    this.selected = null;
    const ids = [this.games.randomId(151, this.used)];
    this.used.add(ids[0]);
    while (ids.length < 4) {
      const id = this.games.randomId(151, this.used);
      if (!ids.includes(id)) { ids.push(id); this.used.add(id); }
    }
    this.request?.unsubscribe();
    this.request = forkJoin(ids.map((id) => this.data.getPokemon(id))).subscribe({
      next: (pokemon) => {
        this.pokemon = pokemon[0];
        this.options = this.games.shuffle(pokemon);
        this.data.getJapanesePokemonNames(this.options).subscribe({
          next: (names) => { this.japaneseNames = names; this.loading = false; },
          error: () => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; },
        });
      },
      error: () => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; },
    });
  }

  answer(option: Pokemon): void {
    if (this.locked || !this.pokemon) return;
    this.locked = true;
    this.selected = option;
    if (option.id === this.pokemon.id) {
      this.correct++;
      this.streak++;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      this.score += 100 + this.streak * 10;
    } else {
      this.streak = 0;
    }
  }

  next(): void {
    if (this.question >= this.total) {
      this.games.finish({
        gameMode: 'knowledge', score: this.score, correctAnswers: this.correct,
        wrongAnswers: this.total - this.correct, totalQuestions: this.total,
        accuracy: Math.round((this.correct / this.total) * 100), bestStreak: this.bestStreak,
      });
      return;
    }
    this.question++;
    this.loadQuestion();
  }

  name(pokemon: Pokemon): string {
    return this.languageService.language === 'ja'
      ? this.japaneseNames[pokemon.id] ?? 'ポケモン'
      : pokemon.name.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
  image(pokemon: Pokemon): string { return pokemon.sprites.other?.['official-artwork']?.front_default || pokemon.sprites.front_default || ''; }
}
