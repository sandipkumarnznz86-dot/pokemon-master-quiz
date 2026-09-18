import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DataService, Pokemon } from '../../../data.service';
import { GameService } from '../game.service';
import { LanguageService } from '../../../language.service';

@Component({ selector: 'app-guess-pokemon', templateUrl: './guess-pokemon.component.html', styleUrls: ['./guess-pokemon.component.scss'] })
export class GuessPokemonComponent implements OnInit {
  pokemon: Pokemon | null = null; options: Pokemon[] = []; selected: Pokemon | null = null;
  japaneseNames: Record<number, string> = {};
  question = 1; score = 0; correct = 0; streak = 0; bestStreak = 0; locked = false; loading = true; error = '';
  private used = new Set<number>();
  constructor(private readonly data: DataService, private readonly games: GameService, readonly languageService: LanguageService) {}
  ngOnInit(): void { this.load(); }
  get progress(): number { return this.question * 10; }
  load(): void {
    this.loading = true; this.locked = false; this.selected = null;
    const ids = [this.games.randomId(151, this.used)]; this.used.add(ids[0]);
    while (ids.length < 4) { const id = this.games.randomId(151, this.used); if (!ids.includes(id)) { ids.push(id); this.used.add(id); } }
    forkJoin(ids.map((id) => this.data.getPokemon(id))).subscribe({
      next: (items) => {
        this.pokemon = items[0];
        this.options = this.games.shuffle(items);
        this.data.getJapanesePokemonNames(this.options).subscribe({
          next: (names) => { this.japaneseNames = names; this.loading = false; },
          error: () => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; },
        });
      },
      error: () => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; },
    });
  }
  answer(option: Pokemon): void {
    if (this.locked || !this.pokemon) return; this.locked = true; this.selected = option;
    if (option.id === this.pokemon.id) { this.correct++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); this.score += 100 + this.streak * 20; } else this.streak = 0;
  }
  next(): void {
    if (this.question >= 10) { this.games.finish({ gameMode:'guess', score:this.score, correctAnswers:this.correct, wrongAnswers:10-this.correct, totalQuestions:10, accuracy:this.correct*10, bestStreak:this.bestStreak }); return; }
    this.question++; this.load();
  }
  name(p: Pokemon): string {
    return this.languageService.language === 'ja'
      ? this.japaneseNames[p.id] ?? 'ポケモン'
      : p.name.replace(/-/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase());
  }
  image(p: Pokemon): string { return p.sprites.other?.['official-artwork']?.front_default || p.sprites.front_default || ''; }
}
