import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetService } from './password-reset.service';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  loading = false;
  error = '';
  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly resetService: PasswordResetService,
    private readonly router: Router,
  ) {}

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.resetService.requestCode(this.form.controls.email.value);
      await this.router.navigate(['/verify-reset-code']);
    } catch (error: unknown) {
      this.logRecoveryError(error);
      this.error = this.getRecoveryErrorMessage(error);
    } finally {
      this.loading = false;
    }
  }

  private getRecoveryErrorMessage(error: unknown): string {
    const code = (error as { code?: string })?.code ?? '';

    switch (code) {
      case 'functions/invalid-argument':
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'functions/resource-exhausted':
      case 'auth/too-many-requests':
        return 'Too many recovery attempts. Please wait and try again later.';
      case 'functions/unavailable':
      case 'functions/deadline-exceeded':
      case 'functions/network-request-failed':
      case 'auth/network-request-failed':
        return 'A network error occurred. Please check your connection and try again.';
      case 'functions/not-found':
        return 'The password recovery service is not available. Please contact support.';
      case 'functions/internal':
        return 'The recovery email service is temporarily unavailable. Please try again later.';
      default:
        return 'We could not start password recovery. Please try again later.';
    }
  }

  private logRecoveryError(error: unknown): void {
    if (!this.isDevelopment()) {
      return;
    }

    const safeError = error as { code?: string; message?: string };
    console.error('[password-recovery] request failed', {
      code: safeError?.code ?? 'unknown',
      message: safeError?.message ?? 'Unknown error',
    });
  }

  private isDevelopment(): boolean {
    return typeof window !== 'undefined' && window.location.hostname === 'localhost';
  }
}
