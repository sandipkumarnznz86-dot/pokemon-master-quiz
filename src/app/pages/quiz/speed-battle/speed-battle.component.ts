import { Component, OnDestroy, OnInit } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { DataService, Pokemon } from '../../../data.service';
import { GameService } from '../game.service';
import { LanguageService } from '../../../language.service';

@Component({ selector: 'app-speed-battle', templateUrl: './speed-battle.component.html', styleUrls: ['./speed-battle.component.scss'] })
export class SpeedBattleComponent implements OnInit, OnDestroy {
  pokemon: Pokemon | null = null; options: Pokemon[] = []; selected: Pokemon | null = null;
  japaneseNames: Record<number, string> = {};
  timeLeft = 60; score = 0; correct = 0; answered = 0; combo = 0; bestCombo = 0; loading = true; error = '';
  private timer?: ReturnType<typeof setInterval>; private used = new Set<number>();
  private finished = false;
  constructor(private readonly data: DataService, private readonly games: GameService, readonly languageService: LanguageService) {}
  ngOnInit(): void { this.load(); this.timer = setInterval(() => { this.timeLeft--; if (this.timeLeft <= 0) this.finish(); }, 1000); }
  ngOnDestroy(): void { this.clearTimer(); }
  load(): void {
    this.loading = true; this.selected = null;
    const id = this.games.randomId(151, this.used); this.used.add(id);
    const ids = [id]; while (ids.length < 4) { const next = this.games.randomId(151, this.used); if (!ids.includes(next)) { ids.push(next); this.used.add(next); } }
    Promise.all(ids.map((item) => firstValueFrom(this.data.getPokemon(item)))).then((items) => {
      const pokemon = items.filter((item): item is Pokemon => !!item); this.pokemon = pokemon[0]; this.options = this.games.shuffle(pokemon);
      this.data.getJapanesePokemonNames(this.options).subscribe({
        next: (names) => { this.japaneseNames = names; this.loading = false; },
        error: () => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; },
      });
    }).catch(() => { this.loading = false; this.error = 'Unable to load Pokémon data. Please try again.'; });
  }
  answer(option: Pokemon): void {
    if (!this.pokemon || this.loading || this.timeLeft <= 0) return; this.selected = option; this.answered++;
    if (option.id === this.pokemon.id) { this.correct++; this.combo++; this.bestCombo = Math.max(this.bestCombo, this.combo); this.score += 100 + Math.min(this.combo * 20, 100); } else this.combo = 0;
    this.load();
  }
  finish(): void {
    if (this.finished) return;
    this.finished = true;
    if (this.timeLeft < 0) this.timeLeft = 0; this.clearTimer();
    this.games.finish({ gameMode:'speed', score:this.score, correctAnswers:this.correct, wrongAnswers:this.answered-this.correct, totalQuestions:this.answered, accuracy:this.answered ? Math.round(this.correct/this.answered*100) : 0, bestStreak:this.bestCombo, bestCombo:this.bestCombo, timeLimit:60, questionsAnswered:this.answered });
  }
  private clearTimer(): void { if (this.timer) { clearInterval(this.timer); this.timer = undefined; } }
  name(p: Pokemon): string {
    return this.languageService.language === 'ja'
      ? this.japaneseNames[p.id] ?? 'ポケモン'
      : p.name.replace(/-/g,' ').replace(/\b\w/g,(c)=>c.toUpperCase());
  }
}
