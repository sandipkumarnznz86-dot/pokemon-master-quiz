import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { GameMode } from '../game.models';
import { GameService } from '../game.service';
import { LanguageService } from '../../../language.service';

@Component({
  selector: 'app-game-mode-select',
  templateUrl: './game-mode-select.component.html',
  styleUrls: ['./game-mode-select.component.scss'],
})
export class GameModeSelectComponent {
  readonly modes: Array<{
    id: GameMode;
    icon: string;
    title: string;
    description: string;
    difficulty: string;
  }> = [
    { id: 'knowledge', icon: '◈', title: 'Knowledge Quiz', description: 'Test your Pokémon knowledge.', difficulty: '★★☆' },
    { id: 'guess', icon: '◉', title: 'Guess the Pokémon', description: 'Identify Pokémon from their artwork.', difficulty: '★★☆' },
    { id: 'type', icon: '⚡', title: 'Type Challenge', description: 'Master Pokémon types.', difficulty: '★★★' },
    { id: 'who-am-i', icon: '?', title: 'Who Am I?', description: 'Solve the clues and reveal the answer.', difficulty: '★★★' },
    { id: 'speed', icon: '⏱', title: 'Speed Battle', description: 'Answer as many as possible in 60 seconds.', difficulty: '★★★★' },
  ];

  constructor(
    private readonly router: Router,
    readonly languageService: LanguageService,
  ) {}

  play(mode: GameMode): void {
    this.router.navigate(['/quiz', mode]);
  }
}
