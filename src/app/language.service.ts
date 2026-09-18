import { Injectable, signal } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type Language = 'en' | 'ja';

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly languageSubject = new BehaviorSubject<Language>(this.readLanguage());
  private readonly languageSignal = signal<Language>(this.languageSubject.value);
  readonly language$ = this.languageSubject.asObservable();

  get language(): Language {
    return this.languageSignal();
  }

  setLanguage(language: Language): void {
    localStorage.setItem('pokedex-quiz-language', language);
    this.languageSignal.set(language);
    this.languageSubject.next(language);
  }

  private readLanguage(): Language {
    return localStorage.getItem('pokedex-quiz-language') === 'ja' ? 'ja' : 'en';
  }
}
