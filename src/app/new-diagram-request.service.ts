import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

/**
 * 앱 툴바 등 상위 UI에서 새 다이어그램 탭 추가를 요청할 때 사용합니다.
 */
@Injectable({ providedIn: 'root' })
export class NewDiagramRequestService {
  private readonly requested = new Subject<void>();

  readonly requested$: Observable<void> = this.requested.asObservable();

  requestNew(): void {
    this.requested.next();
  }
}
