import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { PasswordResetService } from './password-reset.service';

@Injectable({ providedIn: 'root' })
export class ResetSessionGuard implements CanActivate {
  constructor(
    private readonly resetService: PasswordResetService,
    private readonly router: Router,
  ) {}

  canActivate(): boolean | UrlTree {
    return this.resetService.hasVerifiedToken
      ? true
      : this.router.createUrlTree(['/forgot-password']);
  }
}
