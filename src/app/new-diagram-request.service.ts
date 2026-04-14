import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { map, skip } from 'rxjs/operators';

/**
 * 앱 툴바 등 상위 UI에서 새 다이어그램 탭 추가를 요청할 때 사용합니다.
 */
@Injectable({ providedIn: 'root' })
export class NewDiagramRequestService {
  private readonly requestNonceSignal = signal(0);

  readonly requestNonce = this.requestNonceSignal.asReadonly();
  readonly requested$ = toObservable(this.requestNonce).pipe(
    skip(1),
    map(() => void 0),
  );

  requestNew(): void {
    this.requestNonceSignal.update((v) => v + 1);
  }
}
