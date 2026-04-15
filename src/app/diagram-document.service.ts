import { Injectable, signal } from '@angular/core';

const UNTITLED_DIAGRAM_NAME_KO = '제목없는 다이어그램';
const UNTITLED_DIAGRAM_NAME_EN = 'Untitled diagram';

function getUntitledDiagramName(): string {
  return localStorage.getItem('ge-vernova-lang') === 'en'
    ? UNTITLED_DIAGRAM_NAME_EN
    : UNTITLED_DIAGRAM_NAME_KO;
}

@Injectable({ providedIn: 'root' })
export class DiagramDocumentService {
  private readonly currentNameSignal = signal<string>(getUntitledDiagramName());

  readonly currentName = this.currentNameSignal.asReadonly();

  rename(name: string): void {
    const trimmed = name.trim();
    this.currentNameSignal.set(
      trimmed.length > 0 ? trimmed : getUntitledDiagramName(),
    );
  }

  createUntitled(): void {
    this.currentNameSignal.set(getUntitledDiagramName());
  }
}
