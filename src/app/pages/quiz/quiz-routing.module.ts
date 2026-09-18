import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { QuizComponent } from './quiz.component';
import { GameModeSelectComponent } from './game-mode-select/game-mode-select.component';
import { KnowledgeQuizComponent } from './knowledge-quiz/knowledge-quiz.component';
import { GuessPokemonComponent } from './guess-pokemon/guess-pokemon.component';
import { WhoAmIComponent } from './who-am-i/who-am-i.component';
import { SpeedBattleComponent } from './speed-battle/speed-battle.component';
import { ResultComponent } from './result/result.component';

const routes: Routes = [
  {
    path: '',
    component: GameModeSelectComponent,
  },
  { path: 'knowledge', component: KnowledgeQuizComponent },
  { path: 'guess', component: GuessPokemonComponent },
  { path: 'type', component: QuizComponent },
  { path: 'who-am-i', component: WhoAmIComponent },
  { path: 'speed', component: SpeedBattleComponent },
  { path: 'result', component: ResultComponent },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class QuizRoutingModule {}
