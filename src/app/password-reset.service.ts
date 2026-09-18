import { Injectable } from '@angular/core';
import { httpsCallable } from 'firebase/functions';
import { firebaseFunctions } from './firebase';

interface ResetRequestResponse {
  resetId: string;
}

interface VerifyResponse {
  resetToken: string;
}

@Injectable({ providedIn: 'root' })
export class PasswordResetService {
  private resetId = '';
  private resetToken = '';
  private email = '';

  async requestCode(email: string): Promise<void> {
    const callable = httpsCallable<{ email: string }, ResetRequestResponse>(
      firebaseFunctions,
      'requestPasswordResetCode',
    );
    const result = await callable({ email: email.trim().toLowerCase() });
    this.email = email.trim().toLowerCase();
    this.resetId = result.data.resetId;
    this.resetToken = '';
  }

  async resendCode(): Promise<void> {
    if (!this.email) {
      throw new Error('reset-session-missing');
    }
    await this.requestCode(this.email);
  }

  async verifyCode(code: string): Promise<void> {
    if (!this.resetId) {
      throw new Error('reset-session-missing');
    }
    const callable = httpsCallable<
      { resetId: string; code: string },
      VerifyResponse
    >(firebaseFunctions, 'verifyPasswordResetCode');
    const result = await callable({ resetId: this.resetId, code });
    this.resetToken = result.data.resetToken;
  }

  async completePassword(password: string): Promise<void> {
    if (!this.resetToken) {
      throw new Error('reset-session-missing');
    }
    const callable = httpsCallable<
      { resetToken: string; password: string },
      { success: boolean }
    >(firebaseFunctions, 'completePasswordReset');
    await callable({ resetToken: this.resetToken, password });
    this.resetToken = '';
    this.resetId = '';
  }

  get maskedEmail(): string {
    const [name, domain] = this.email.split('@');
    if (!name || !domain) return '';
    return `${name.charAt(0)}${'*'.repeat(Math.max(2, name.length - 1))}@${domain}`;
  }

  get hasResetRequest(): boolean {
    return Boolean(this.resetId);
  }

  get hasVerifiedToken(): boolean {
    return Boolean(this.resetToken);
  }

  clear(): void {
    this.resetId = '';
    this.resetToken = '';
    this.email = '';
  }
}
