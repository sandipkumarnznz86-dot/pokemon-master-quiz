import { Component, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { AuthService } from './auth.service';
import { LanguageService } from './language.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent implements OnDestroy {
  isRegisterMode = false;
  isForgotMode = false;
  loginStep: 'email' | 'password' = 'email';
  loginEmail = '';
  isSubmitting = false;
  errorMessage = '';
  successMessage = '';
  photoPreview = '';
  private photoFile: File | null = null;
  private previewObjectUrl = '';

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    age: [0, [Validators.required, Validators.min(1), Validators.max(120)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]],
  });

  constructor(
    private readonly formBuilder: FormBuilder,
    private readonly authService: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute,
    readonly languageService: LanguageService,
  ) {}

  ngOnDestroy(): void {
    this.revokePreviewUrl();
  }

  async submit(): Promise<void> {
    const requiredControls = this.isForgotMode
      ? {
          invalid: this.form.controls.email.invalid,
          markAllAsTouched: () => this.form.controls.email.markAsTouched(),
        }
      : this.isRegisterMode
      ? this.form
      : this.loginStep === 'email'
      ? {
          invalid: this.form.controls.email.invalid,
          markAllAsTouched: () => this.form.controls.email.markAsTouched(),
        }
      : {
          invalid: this.form.controls.password.invalid,
          markAllAsTouched: () => this.form.controls.password.markAsTouched(),
        };

    if (requiredControls.invalid) {
      requiredControls.markAllAsTouched();
      return;
    }

    const { email, password, name, age, confirmPassword } = this.form.getRawValue();
    if (this.isRegisterMode && password !== confirmPassword) {
      this.form.controls.confirmPassword.markAsTouched();
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    try {
      if (this.isForgotMode) {
        await this.authService.resetPassword(email);
        this.successMessage =
          this.languageService.language === 'en'
            ? 'Password reset instructions have been sent to your email.'
            : 'パスワード再設定の手順をメールで送信しました。';
      } else if (this.isRegisterMode) {
        await this.authService.register(
          email,
          password,
          name,
          age,
          this.photoFile,
        );
      } else if (this.loginStep === 'email') {
        this.loginEmail = email.trim();
        this.form.controls.password.reset('');
        this.loginStep = 'password';
        return;
      } else {
        await this.authService.login(this.loginEmail, password);
      }

      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
      if (!this.isForgotMode) {
        await this.router.navigateByUrl(returnUrl || '/home');
      }
    } catch (error: unknown) {
      this.logAuthError(error);
      this.errorMessage = this.getAuthErrorMessage(error);
    } finally {
      this.isSubmitting = false;
    }
  }

  toggleMode(): void {
    this.isRegisterMode = !this.isRegisterMode;
    this.isForgotMode = false;
    this.loginStep = 'email';
    this.loginEmail = '';
    this.form.reset({
      name: '',
      age: 0,
      email: '',
      password: '',
      confirmPassword: '',
    });
    this.photoFile = null;
    this.photoPreview = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  showForgotPassword(): void {
    void this.router.navigate(['/forgot-password']);
  }

  backToLogin(): void {
    this.isForgotMode = false;
    this.isRegisterMode = false;
    this.loginStep = 'email';
    this.loginEmail = '';
    this.form.controls.confirmPassword.reset('');
    this.errorMessage = '';
    this.successMessage = '';
  }

  backToEmail(): void {
    this.loginStep = 'email';
    this.form.controls.password.reset('');
    this.errorMessage = '';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      this.errorMessage = 'Please choose a JPG, PNG, or WebP image.';
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage = 'Image size must be less than 5 MB.';
      input.value = '';
      return;
    }
    this.photoFile = file;

    if (!file.type.startsWith('image/')) {
      this.errorMessage = this.languageService.language === 'en'
        ? 'Please choose an image file.'
        : '画像ファイルを選択してください。';
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.photoPreview = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  }

  private revokePreviewUrl(): void {
    if (this.previewObjectUrl) {
      URL.revokeObjectURL(this.previewObjectUrl);
      this.previewObjectUrl = '';
    }
  }

  private getAuthErrorMessage(error: unknown): string {
    const code = (error as { code?: string })?.code;
    const isJapanese = this.languageService.language === 'ja';

    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return isJapanese
          ? 'メールアドレスまたはパスワードが正しくありません。'
          : 'The email or password is incorrect.';
      case 'auth/email-already-in-use':
        return isJapanese
          ? 'このメールアドレスはすでに登録されています。'
          : 'This email is already registered. Please log in instead.';
      case 'auth/weak-password':
        return isJapanese
          ? 'パスワードは6文字以上で入力してください。'
          : 'Password must be at least 6 characters.';
      case 'auth/invalid-email':
        return isJapanese
          ? '有効なメールアドレスを入力してください。'
          : 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return isJapanese
          ? '試行回数が多すぎます。しばらくしてから再試行してください。'
          : 'Too many attempts. Please try again later.';
      case 'auth/network-request-failed':
        return isJapanese
          ? 'ネットワークに接続できません。接続を確認して再試行してください。'
          : 'Unable to connect. Please check your internet connection and try again.';
      case 'auth/operation-not-allowed':
        return isJapanese
          ? 'このログイン方法は現在利用できません。'
          : 'Email and password authentication is not enabled. Please contact support.';
      case 'auth/invalid-api-key':
      case 'auth/app-deleted':
      case 'auth/internal-error':
        return isJapanese
          ? '認証サービスに接続できません。しばらくしてから再試行してください。'
          : 'The authentication service is unavailable. Please try again later.';
      case 'profile-photo-upload-failed':
        return isJapanese
          ? 'プロフィールを作成できませんでした。もう一度お試しください。'
          : 'We could not finish creating your profile. Please try again.';
      case 'permission-denied':
      case 'failed-precondition':
      case 'unavailable':
      case 'profile-save-failed':
        return 'Your account was created, but the user profile could not be saved. Check the Firebase configuration and rules.';
      default:
        return isJapanese
          ? '認証に失敗しました。もう一度お試しください。'
          : 'Authentication failed. Please try again.';
    }
  }

  private logAuthError(error: unknown): void {
    const safeError = error as { code?: string; message?: string };
    console.error('[authentication] request failed', {
      code: safeError?.code ?? 'unknown',
      message: safeError?.message ?? 'Unknown authentication error',
    });
  }
}
