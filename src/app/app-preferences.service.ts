import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type AppTheme = 'light' | 'dark';
export type AppLanguage = 'ko' | 'en';

const THEME_KEY = 'ge-vernova-theme';
const LANG_KEY = 'ge-vernova-lang';

@Injectable({ providedIn: 'root' })
export class AppPreferencesService {
  private readonly themeSubject = new BehaviorSubject<AppTheme>(
    this.readStoredTheme(),
  );
  private readonly languageSubject = new BehaviorSubject<AppLanguage>(
    this.readStoredLanguage(),
  );

  readonly theme$ = this.themeSubject.asObservable();
  readonly language$ = this.languageSubject.asObservable();

  get theme(): AppTheme {
    return this.themeSubject.value;
  }

  get language(): AppLanguage {
    return this.languageSubject.value;
  }

  /** 앱 부트 시 document/body 반영 */
  syncDom(): void {
    this.applyTheme(this.theme);
    this.applyLanguage(this.language);
  }

  setTheme(theme: AppTheme): void {
    localStorage.setItem(THEME_KEY, theme);
    this.themeSubject.next(theme);
    this.applyTheme(theme);
  }

  setLanguage(lang: AppLanguage): void {
    localStorage.setItem(LANG_KEY, lang);
    this.languageSubject.next(lang);
    this.applyLanguage(lang);
  }

  private readStoredTheme(): AppTheme {
    return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light';
  }

  private readStoredLanguage(): AppLanguage {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'ko';
  }

  private applyTheme(theme: AppTheme): void {
    document.body.classList.toggle('theme-dark', theme === 'dark');
  }

  private applyLanguage(lang: AppLanguage): void {
    document.documentElement.lang = lang === 'en' ? 'en' : 'ko';
  }
}
