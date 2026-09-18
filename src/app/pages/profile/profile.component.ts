import { Component, OnDestroy, OnInit } from '@angular/core';
import { AuthService } from '../../auth.service';
import { DatabaseService } from '../../database.service';
import { LanguageService } from '../../language.service';
import { getNextRank, getRankProgress } from '../../ranking';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit, OnDestroy {
  bestScore: number | null = null;
  quizCount = 0;
  isEditing = false;
  isSaving = false;
  editName = '';
  editAge: number | null = null;
  editPhoto = '';
  editPhotoFile: File | null = null;
  profileError = '';

  constructor(
    readonly authService: AuthService,
    readonly languageService: LanguageService,
    private readonly databaseService: DatabaseService,
  ) {}

  ngOnInit(): void {
    void this.loadProfileStats();
  }

  ngOnDestroy(): void {}

  private async loadProfileStats(): Promise<void> {
    try {
      const [score, results] = await Promise.all([
        this.databaseService.getBestScore(),
        this.databaseService.getQuizHistory(),
      ]);
      this.bestScore = score;
      this.quizCount = results.length;
    } catch (error) {
      console.error('[profile] database read failed', error);
    }
  }

  getInitials(name: string): string {
    return name.split(' ').filter(Boolean).map((part) => part[0]).slice(0, 2).join('').toUpperCase() || 'T';
  }

  nextRank(points: number): string {
    return getNextRank(points)?.name ?? 'Max rank';
  }

  rankProgress(points: number): number {
    return getRankProgress(points);
  }

  beginEdit(name: string, age: number | null, photo: string): void {
    this.editName = name;
    this.editAge = age;
    this.editPhoto = photo;
    this.editPhotoFile = null;
    this.profileError = '';
    this.isEditing = true;
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!file || !allowedTypes.includes(file.type)) {
      this.profileError = 'Please choose a JPG, PNG, or WebP image.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.profileError = 'Image size must be less than 5 MB.';
      return;
    }

    this.editPhotoFile = file;
    const reader = new FileReader();
    reader.onload = () => {
      this.editPhoto = typeof reader.result === 'string' ? reader.result : '';
    };
    reader.readAsDataURL(file);
  }

  async saveProfile(): Promise<void> {
    if (!this.editName.trim() || this.editAge === null || this.editAge < 1 || this.editAge > 120) {
      this.profileError = 'Please enter a name and an age between 1 and 120.';
      return;
    }

    this.isSaving = true;
    this.profileError = '';
    try {
      await this.authService.updateUserProfile(
        this.editName,
        this.editAge,
        this.editPhotoFile,
        this.editPhotoFile ? '' : this.editPhoto,
      );
      this.isEditing = false;
    } catch {
      this.profileError = 'Profile photo or profile update failed. Please try again.';
    } finally {
      this.isSaving = false;
    }
  }
}
