import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetService } from './password-reset.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent {
  loading = false;
  success = false;
  error = '';
  readonly form = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly resetService: PasswordResetService,
    private readonly router: Router,
  ) {
    if (!this.resetService.hasVerifiedToken) {
      void this.router.navigate(['/forgot-password']);
    }
  }

  async submit(): Promise<void> {
    const { password, confirmPassword } = this.form.getRawValue();
    if (this.form.invalid || password !== confirmPassword) {
      this.form.markAllAsTouched();
      this.error = password !== confirmPassword
        ? 'Passwords do not match.'
        : 'Password must be at least 6 characters.';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.resetService.completePassword(password);
      this.success = true;
    } catch {
      this.error = 'This reset session has expired or was already used. Please start again.';
    } finally {
      this.loading = false;
    }
  }

  goToLogin(): void {
    void this.router.navigate(['/login']);
  }
}
