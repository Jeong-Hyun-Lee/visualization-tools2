import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type SldIoMessageVariant = 'success' | 'error';

export type SldIoMessageState = {
  text: string;
  variant: SldIoMessageVariant;
};

export type ShowSldIoMessageOptions = {
  durationMs?: number;
  variant?: SldIoMessageVariant;
};

@Injectable({ providedIn: 'root' })
export class SldIoMessageService {
  private readonly stateSubject = new BehaviorSubject<SldIoMessageState | null>(
    null,
  );
  readonly state$ = this.stateSubject.asObservable();

  private hideTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(private readonly ngZone: NgZone) {}

  showIoMessage(text: string, options?: ShowSldIoMessageOptions): void {
    const durationMs = options?.durationMs ?? 4500;
    const variant = options?.variant ?? 'success';

    this.ngZone.run(() => {
      if (this.hideTimer != null) {
        clearTimeout(this.hideTimer);
        this.hideTimer = null;
      }
      this.stateSubject.next({ text, variant });
      this.hideTimer = setTimeout(() => {
        this.stateSubject.next(null);
        this.hideTimer = null;
      }, durationMs);
    });
  }
}
