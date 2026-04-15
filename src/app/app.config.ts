import {
  APP_INITIALIZER,
  ApplicationConfig,
  importProvidersFrom,
  provideZoneChangeDetection,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { HttpClient } from '@angular/common/http';
import { providePrimeNG } from 'primeng/config';

import { VernovaPreset } from './vernova-preset';
import { TranslateLoader, TranslateModule, TranslateService } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { firstValueFrom } from 'rxjs';

import { AppPreferencesService } from './app-preferences.service';
import { appRoutes } from './app.routes';

export function httpTranslateLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

export function translateAppInitializerFactory(
  translate: TranslateService,
  prefs: AppPreferencesService,
): () => Promise<unknown> {
  return () => {
    translate.setDefaultLang('ko');
    return firstValueFrom(translate.use(prefs.language));
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection(),
    provideRouter(appRoutes),
    provideHttpClient(),
    provideAnimationsAsync(),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: VernovaPreset,
        options: {
          // 복합 선택자(body.theme-dark)는 styled 엔진에서 custom으로 처리되어
          // 다크 토큰이 :root에 제대로 적용되지 않을 수 있음 — 단일 클래스만 class 규칙에 매칭됨
          darkModeSelector: '.theme-dark',
        },
      },
    }),
    importProvidersFrom(
      TranslateModule.forRoot({
        defaultLanguage: 'ko',
        loader: {
          provide: TranslateLoader,
          useFactory: httpTranslateLoaderFactory,
          deps: [HttpClient],
        },
      }),
    ),
    {
      provide: APP_INITIALIZER,
      useFactory: translateAppInitializerFactory,
      deps: [TranslateService, AppPreferencesService],
      multi: true,
    },
  ],
};
