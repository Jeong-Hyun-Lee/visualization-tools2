import { Injectable, computed, signal } from '@angular/core';

export type DiagramPage = {
  id: string;
  name: string;
  storageKey: string;
};

const UNTITLED_NAME = '제목없는 다이어그램';

@Injectable({ providedIn: 'root' })
export class DiagramPagesService {
  private readonly pagesSignal = signal<DiagramPage[]>([
    this.createPage(1),
  ]);
  private readonly activePageIdSignal = signal<string>(this.pagesSignal()[0].id);

  readonly pages = this.pagesSignal.asReadonly();
  readonly activePageId = this.activePageIdSignal.asReadonly();
  readonly activePage = computed(
    () =>
      this.pagesSignal().find((page) => page.id === this.activePageIdSignal()) ??
      this.pagesSignal()[0],
  );
  readonly activeIndex = computed(() =>
    Math.max(
      0,
      this.pagesSignal().findIndex((page) => page.id === this.activePageIdSignal()),
    ),
  );

  addUntitledPage(): void {
    const next = this.createPage(this.pagesSignal().length + 1);
    this.pagesSignal.update((pages) => [...pages, next]);
    this.activePageIdSignal.set(next.id);
  }

  selectPageByIndex(index: number): void {
    const page = this.pagesSignal()[index];
    if (!page) return;
    this.activePageIdSignal.set(page.id);
  }

  private createPage(index: number): DiagramPage {
    const id = crypto.randomUUID();
    return {
      id,
      name: UNTITLED_NAME,
      storageKey: `ng-diagram-custom-demo-${index}-${id.slice(0, 8)}`,
    };
  }
}
