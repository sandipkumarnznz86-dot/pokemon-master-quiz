import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { QuizRoutingModule } from './quiz-routing.module';
import { QuizComponent } from './quiz.component';
import { ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../shared/shared.module';
import { GameModeSelectComponent } from './game-mode-select/game-mode-select.component';
import { KnowledgeQuizComponent } from './knowledge-quiz/knowledge-quiz.component';
import { GuessPokemonComponent } from './guess-pokemon/guess-pokemon.component';
import { WhoAmIComponent } from './who-am-i/who-am-i.component';
import { SpeedBattleComponent } from './speed-battle/speed-battle.component';
import { ResultComponent } from './result/result.component';


@NgModule({
  declarations: [
    QuizComponent,
    GameModeSelectComponent,
    KnowledgeQuizComponent,
    GuessPokemonComponent,
    WhoAmIComponent,
    SpeedBattleComponent,
    ResultComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SharedModule,
    QuizRoutingModule,
  ]
})
export class QuizModule { }
