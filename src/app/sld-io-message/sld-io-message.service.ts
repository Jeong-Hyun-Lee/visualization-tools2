import { Injectable, NgZone, signal } from '@angular/core';

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
  readonly state = signal<SldIoMessageState | null>(null);

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
      this.state.set({ text, variant });
      this.hideTimer = setTimeout(() => {
        this.state.set(null);
        this.hideTimer = null;
      }, durationMs);
    });
  }
}
