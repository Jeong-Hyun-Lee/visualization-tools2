import { Injectable, computed, signal } from '@angular/core';
import type { ModelChanges } from 'ng-diagram';

import {
  loadCurrentSldSessionFromIndexDB,
  saveCurrentSldSessionToIndexDB,
  type SldSavedSession,
} from './indexdb/sld-session-indexdb';

export type DiagramPage = {
  id: string;
  name: string;
  storageKey: string;
};

const UNTITLED_NAME_KO = '제목없는 다이어그램';
const UNTITLED_NAME_EN = 'Untitled diagram';

function getUntitledName(): string {
  return localStorage.getItem('ge-vernova-lang') === 'en'
    ? UNTITLED_NAME_EN
    : UNTITLED_NAME_KO;
}

@Injectable({ providedIn: 'root' })
export class DiagramPagesService {
  private readonly pagesSignal = signal<DiagramPage[]>([this.createPage(1)]);
  private readonly activePageIdSignal = signal<string>(
    this.pagesSignal()[0].id,
  );
  private isHydrated = false;
  private readonly graphCache = new Map<string, ModelChanges>();

  readonly pages = this.pagesSignal.asReadonly();
  readonly activePageId = this.activePageIdSignal.asReadonly();
  readonly activePage = computed(
    () =>
      this.pagesSignal().find(
        (page) => page.id === this.activePageIdSignal(),
      ) ?? this.pagesSignal()[0],
  );
  readonly activeIndex = computed(() =>
    Math.max(
      0,
      this.pagesSignal().findIndex(
        (page) => page.id === this.activePageIdSignal(),
      ),
    ),
  );

  constructor() {
    void this.restoreFromSession();
  }

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

  removePageByIndex(index: number): void {
    const pages = this.pagesSignal();
    if (index <= 0 || index >= pages.length) {
      return;
    }

    const pageToRemove = pages[index];
    const nextPages = pages.filter((page) => page.id !== pageToRemove.id);
    this.pagesSignal.set(nextPages);

    const activePageId = this.activePageIdSignal();
    if (activePageId === pageToRemove.id) {
      const fallbackIndex = Math.min(index - 1, nextPages.length - 1);
      const fallbackPage = nextPages[Math.max(0, fallbackIndex)];
      if (fallbackPage) {
        this.activePageIdSignal.set(fallbackPage.id);
      }
    }
    this.graphCache.delete(pageToRemove.storageKey);
  }

  private createPage(index: number): DiagramPage {
    const id = crypto.randomUUID();
    const untitled = getUntitledName();
    return {
      id,
      name: index <= 1 ? untitled : `${untitled} ${index}`,
      storageKey: `diagram-${id}`,
    };
  }

  setPageGraph(storageKey: string, graph: ModelChanges): void {
    this.graphCache.set(storageKey, graph);
  }

  getPageGraph(storageKey: string): ModelChanges | undefined {
    return this.graphCache.get(storageKey);
  }

  async saveAllTabsToSession(): Promise<void> {
    if (!this.isHydrated) {
      return;
    }

    const tabs = this.pagesSignal().map((page) => ({
      diagramId: page.id,
      diagramName: page.name,
      payload: {
        format: 'ge-vernova-sld' as const,
        version: 1 as const,
        exportedAt: new Date().toISOString(),
        graph:
          this.graphCache.get(page.storageKey) ?? {
            nodes: [],
            edges: [],
            metadata: { viewport: { x: 0, y: 0, scale: 1 } },
          },
      },
    }));

    await saveCurrentSldSessionToIndexDB({
      format: 'ge-vernova-sld-session',
      version: 1,
      savedAt: new Date().toISOString(),
      tabs,
    });
  }

  private async restoreFromSession(): Promise<void> {
    try {
      const session = await loadCurrentSldSessionFromIndexDB();
      if (session) {
        this.applySession(session);
      }
    } catch (error) {
      console.warn('Failed to restore tabs from indexDB session:', error);
    } finally {
      this.isHydrated = true;
    }
  }

  private applySession(session: SldSavedSession): void {
    if (!session.tabs.length) {
      return;
    }

    const pages = session.tabs.map((tab, idx) => {
      const id = tab.diagramId || crypto.randomUUID();
      const storageKey = id;
      const untitled = getUntitledName();

      const graph = this.toModelChanges(tab.payload?.graph);
      if (graph) {
        this.graphCache.set(storageKey, graph);
      }

      return {
        id,
        name:
          tab.diagramName?.trim() ||
          (idx === 0 ? untitled : `${untitled} ${idx + 1}`),
        storageKey,
      };
    });

    this.pagesSignal.set(pages);
    this.activePageIdSignal.set(pages[0].id);
  }

  private toModelChanges(raw: unknown): ModelChanges | null {
    if (!raw || typeof raw !== 'object') {
      return null;
    }
    const maybe = raw as Partial<ModelChanges>;
    return {
      nodes: Array.isArray(maybe.nodes) ? maybe.nodes : [],
      edges: Array.isArray(maybe.edges) ? maybe.edges : [],
      metadata:
        maybe.metadata && typeof maybe.metadata === 'object'
          ? maybe.metadata
          : { viewport: { x: 0, y: 0, scale: 1 } },
    };
  }
}
