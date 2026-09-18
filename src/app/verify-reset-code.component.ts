import { Component } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { PasswordResetService } from './password-reset.service';

@Component({
  selector: 'app-verify-reset-code',
  templateUrl: './verify-reset-code.component.html',
  styleUrls: ['./verify-reset-code.component.scss'],
})
export class VerifyResetCodeComponent {
  loading = false;
  error = '';
  cooldown = 0;
  private cooldownTimer?: ReturnType<typeof setInterval>;
  readonly form = this.formBuilder.nonNullable.group({
    code: ['', [Validators.required, Validators.pattern(/^\d{6}$/)]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    readonly resetService: PasswordResetService,
    private readonly router: Router,
  ) {
    if (!this.resetService.hasResetRequest) {
      void this.router.navigate(['/forgot-password']);
    }
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.resetService.verifyCode(this.form.controls.code.value);
      await this.router.navigate(['/reset-password']);
    } catch {
      this.error = 'The code is invalid, expired, or no longer available. Request a new code and try again.';
    } finally {
      this.loading = false;
    }
  }

  async resend(): Promise<void> {
    if (this.cooldown > 0) return;
    this.loading = true;
    this.error = '';
    try {
      await this.resetService.resendCode();
      this.startCooldown();
    } catch {
      this.error = 'We could not resend the code. Please try again later.';
    } finally {
      this.loading = false;
    }
  }

  private startCooldown(): void {
    this.cooldown = 60;
    this.cooldownTimer = setInterval(() => {
      this.cooldown--;
      if (this.cooldown <= 0 && this.cooldownTimer) {
        clearInterval(this.cooldownTimer);
        this.cooldownTimer = undefined;
      }
    }, 1000);
  }
}
