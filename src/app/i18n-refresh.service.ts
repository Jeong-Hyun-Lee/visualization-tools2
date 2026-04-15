import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslateService } from '@ngx-translate/core';

/**
 * `translate.instant()`는 JSON 로딩 전에 호출되면 키가 그대로 노출된다.
 * 시그널 기반 `computed`는 번역 로드 완료를 알 수 없으므로, 번역 스토어가
 * 갱신될 때마다 revision을 올려 `computed`가 다시 계산되게 한다.
 */
@Injectable({ providedIn: 'root' })
export class I18nRefreshService {
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly revision = signal(0);

  constructor() {
    this.translate.onTranslationChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revision.update((n) => n + 1));

    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.revision.update((n) => n + 1));
  }
}
