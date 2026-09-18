import { Component, OnInit } from '@angular/core';
import { forkJoin } from 'rxjs';
import { DataService, Pokemon, PokemonSpecies } from '../../../data.service';
import { GameService } from '../game.service';
import { LanguageService } from '../../../language.service';

@Component({ selector: 'app-who-am-i', templateUrl: './who-am-i.component.html', styleUrls: ['./who-am-i.component.scss'] })
export class WhoAmIComponent implements OnInit {
  pokemon: Pokemon | null = null; species: PokemonSpecies | null = null; options: Pokemon[] = [];
  japaneseNames: Record<number, string> = {};
  clues: string[] = []; revealed = 1; question = 1; score = 0; correct = 0; bestStreak = 0; streak = 0;
  selected: Pokemon | null = null; locked = false; loading = true; error = ''; private used = new Set<number>();
  constructor(private readonly data: DataService, private readonly games: GameService, readonly languageService: LanguageService) {}
  ngOnInit(): void { this.load(); }
  load(): void {
    this.loading = true; this.locked = false; this.selected = null; this.revealed = 1;
    const ids = [this.games.randomId(151, this.used)]; this.used.add(ids[0]);
    while (ids.length < 4) { const id = this.games.randomId(151, this.used); if (!ids.includes(id)) { ids.push(id); this.used.add(id); } }
    forkJoin({ target: this.data.getPokemon(ids[0]), species: this.data.getPokemonSpecies(ids[0]), choices: forkJoin(ids.map((id) => this.data.getPokemon(id))) }).subscribe({
      next: ({ target, species, choices }) => {
        this.pokemon = target; this.species = species; this.options = this.games.shuffle(choices);
        const type = target.types[0]?.type.name || 'Pokémon'; const genus = species.genera?.find((g) => g.language.name === 'en')?.genus || 'Pokémon';
        this.clues = this.languageService.language === 'en'
          ? [`I am a ${type}-type Pokémon.`, `My species category is ${genus}.`, `My Pokédex number is ${target.id}.`]
          : [`私は${type}タイプのポケモンです。`, `分類は「${genus}」です。`, `図鑑番号は${target.id}です。`];
        this.data.getJapanesePokemonNames(this.options).subscribe({
          next: (names) => { this.japaneseNames = names; this.loading = false; },
          error: () => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; },
        });
      },
      error: () => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; },
    });
  }
  reveal(): void { if (this.revealed < this.clues.length) this.revealed++; }
  answer(option: Pokemon): void {
    if (this.locked || !this.pokemon) return; this.locked = true; this.selected = option;
    if (option.id === this.pokemon.id) { this.correct++; this.streak++; this.bestStreak = Math.max(this.bestStreak, this.streak); this.score += [100,80,60,40][this.revealed] || 40; } else this.streak = 0;
  }
  next(): void {
    if (this.question >= 10) { this.games.finish({ gameMode:'who-am-i', score:this.score, correctAnswers:this.correct, wrongAnswers:10-this.correct, totalQuestions:10, accuracy:this.correct*10, bestStreak:this.bestStreak }); return; }
    this.question++; this.load();
  }
  name(p: Pokemon): string {
    return this.languageService.language === 'ja'
      ? this.japaneseNames[p.id] ?? 'ポケモン'
      : p.name.replace(/-/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase());
  }
}
