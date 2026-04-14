import { Injectable, effect, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'ko' | 'en';

const THEME_KEY = 'ge-vernova-theme';
const LANG_KEY = 'ge-vernova-lang';

@Injectable({ providedIn: 'root' })
export class AppPreferencesService {
  private readonly themeSignal = signal<AppTheme>(this.readStoredTheme());
  private readonly languageSignal = signal<AppLanguage>(this.readStoredLanguage());

  readonly themeState = this.themeSignal.asReadonly();
  readonly languageState = this.languageSignal.asReadonly();
  readonly theme$ = toObservable(this.themeState);
  readonly language$ = toObservable(this.languageState);

  constructor() {
    effect(() => this.applyTheme(this.themeSignal()));
    effect(() => this.applyLanguage(this.languageSignal()));
  }

  get theme(): AppTheme {
    return this.themeSignal();
  }

  get language(): AppLanguage {
    return this.languageSignal();
  }

  /** 호환성 유지를 위한 no-op (effect가 즉시 반영). */
  syncDom(): void {
    this.applyTheme(this.themeSignal());
    this.applyLanguage(this.languageSignal());
  }

  setTheme(theme: AppTheme): void {
    localStorage.setItem(THEME_KEY, theme);
    this.themeSignal.set(theme);
  }

  setLanguage(lang: AppLanguage): void {
    localStorage.setItem(LANG_KEY, lang);
    this.languageSignal.set(lang);
  }

  private readStoredTheme(): AppTheme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }

  private readStoredLanguage(): AppLanguage {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ko';
  }

  private applyTheme(theme: AppTheme): void {
    const isDark = theme === 'dark';
    document.body.classList.toggle('theme-dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  }

  private applyLanguage(lang: AppLanguage): void {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ko';
  }
}
