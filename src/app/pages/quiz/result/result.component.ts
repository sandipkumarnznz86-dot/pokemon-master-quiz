import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { GameResult } from '../game.models';
import { GameService } from '../game.service';
import { LanguageService } from '../../../language.service';

@Component({ selector: 'app-result', templateUrl: './result.component.html', styleUrls: ['./result.component.scss'] })
export class ResultComponent implements OnInit {
  result: GameResult | null = null;
  saveFailed = false;
  constructor(private readonly games: GameService, private readonly router: Router, readonly languageService: LanguageService) {}
  ngOnInit(): void {
    this.result = this.games.consumeResult();
    this.saveFailed = this.games.resultSaveFailed;
    if (!this.result) this.router.navigate(['/quiz']);
  }
  playAgain(): void { if (this.result) this.router.navigate(['/quiz', this.result.gameMode]); }
  gamesLabel(mode: GameResult['gameMode']): string {
    if (this.languageService.language === 'ja') {
      return {
        knowledge: '知識クイズ',
        guess: 'ポケモン当て',
        type: 'タイプチャレンジ',
        'who-am-i': '私は誰？',
        speed: 'スピードバトル',
      }[mode];
    }
    return this.games.modeLabel(mode);
  }
}
