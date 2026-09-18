import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { LoginComponent } from './login.component';
import { ForgotPasswordComponent } from './forgot-password.component';
import { VerifyResetCodeComponent } from './verify-reset-code.component';
import { ResetPasswordComponent } from './reset-password.component';
import { ResetSessionGuard } from './reset-session.guard';

const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'home',
  },
  {
    path: 'login',
    component: LoginComponent,
  },
  {
    path: 'forgot-password',
    component: ForgotPasswordComponent,
  },
  {
    path: 'verify-reset-code',
    component: VerifyResetCodeComponent,
  },
  {
    path: 'reset-password',
    component: ResetPasswordComponent,
    canActivate: [ResetSessionGuard],
  },
  {
    path: 'quiz',
    loadChildren: () =>
      import('./pages/quiz/quiz.module').then((m) => m.QuizModule),
    canActivate: [AuthGuard],
  },
  {
    path: '',
    loadChildren: () =>
      import('./pages/pages.module').then((m) => m.PagesModule),
    canActivate: [AuthGuard],
    runGuardsAndResolvers: 'always',
  },
  { path: '**', redirectTo: '' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
