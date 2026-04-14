import { Injectable, signal } from '@angular/core';

const UNTITLED_DIAGRAM_NAME = '제목없는 다이어그램';

@Injectable({ providedIn: 'root' })
export class DiagramDocumentService {
  private readonly currentNameSignal = signal<string>(UNTITLED_DIAGRAM_NAME);

  readonly currentName = this.currentNameSignal.asReadonly();

  rename(name: string): void {
    const trimmed = name.trim();
    this.currentNameSignal.set(trimmed.length > 0 ? trimmed : UNTITLED_DIAGRAM_NAME);
  }

  createUntitled(): void {
    this.currentNameSignal.set(UNTITLED_DIAGRAM_NAME);
  }
}
