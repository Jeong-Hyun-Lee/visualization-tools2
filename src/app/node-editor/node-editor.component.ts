import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  NgZone,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateService } from '@ngx-translate/core';
import { TranslateModule } from '@ngx-translate/core';

import { NewDiagramRequestService } from '../new-diagram-request.service';
import { parseSldImportPayload } from './sld-import-payload';
import {
  saveCurrentSldSessionToIndexDB,
  loadCurrentSldSessionFromIndexDB,
  type SldSavedSession,
} from '../indexdb/sld-session-indexdb';
import { DiagramWorkspaceComponent } from '../diagram-workspace/diagram-workspace.component';
import { SldIoMessageComponent } from '../sld-io-message/sld-io-message.component';
import { SldIoMessageService } from '../sld-io-message/sld-io-message.service';

@Component({
  selector: 'app-node-editor',
  templateUrl: './node-editor.component.html',
  styleUrls: ['./node-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    DiagramWorkspaceComponent,
    SldIoMessageComponent,
  ],
})
export class NodeEditorComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('globalImportInput', { static: true })
  globalImportInput!: ElementRef<HTMLInputElement>;

  @ViewChildren(DiagramWorkspaceComponent)
  private readonly workspaces!: QueryList<DiagramWorkspaceComponent>;

  constructor(
    private readonly newDiagramRequest: NewDiagramRequestService,
    private readonly ngZone: NgZone,
    private readonly sldIoMessage: SldIoMessageService,
    private readonly translate: TranslateService,
  ) {}

  @HostListener('document:keydown', ['$event'])
  onDocKeydownImport(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement | null;
    const inEditable =
      target != null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true');

    if (
      (ev.ctrlKey || ev.metaKey) &&
      !ev.shiftKey &&
      !ev.altKey &&
      ev.code === 'KeyI'
    ) {
      if (inEditable) {
        return;
      }
      ev.preventDefault();
      this.openGlobalImport();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocKeydownSave(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement | null;
    const inEditable =
      target != null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true');

    if (
      (ev.ctrlKey || ev.metaKey) &&
      !ev.shiftKey &&
      !ev.altKey &&
      ev.code === 'KeyS'
    ) {
      if (inEditable) {
        return;
      }
      ev.preventDefault();
      void this.saveAllTabsToIndexDB();
    }
  }

  ngOnInit(): void {
    void this.restoreFromIndexDB();

    this.newDiagramRequest.requested$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.addDiagram();
      });
  }

  private async restoreFromIndexDB(): Promise<void> {
    try {
      const session = await loadCurrentSldSessionFromIndexDB();
      if (!session?.tabs?.length) {
        return;
      }

      const tabs = session.tabs;
      const pending: Record<string, object[]> = {};
      let maxIdx = 0;

      for (const t of tabs) {
        const m = t.diagramId.match(/^sld-(\d+)$/);
        if (m) {
          maxIdx = Math.max(maxIdx, Number(m[1]));
        }
        const { cells } = parseSldImportPayload(t.payload as unknown);
        pending[t.diagramId] = cells;
      }

      this.diagrams.set(tabs.map((t) => ({ id: t.diagramId, name: t.diagramName })));
      this.activeDiagramId.set(tabs[0].diagramId);
      this.pendingImports.set(pending);
      this.nextDiagramIndex = Math.max(this.nextDiagramIndex, maxIdx + 1);
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('IndexDB restore failed', err);
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.restoreFailed', { detail }),
        { variant: 'error' },
      );
    }
  }

  readonly diagrams = signal<{ id: string; name: string }[]>([
    { id: 'sld-1', name: 'SLD 1' },
  ]);
  readonly activeDiagramId = signal(this.diagrams()[0].id);
  private nextDiagramIndex = 2;

  /** pendingImportCells는 탭별로 다중 지원 */
  private readonly pendingImports = signal<Record<string, object[]>>({});

  addDiagram(): void {
    const name = `SLD ${this.nextDiagramIndex}`;
    const id = `sld-${this.nextDiagramIndex}`;
    this.nextDiagramIndex += 1;
    this.diagrams.update((prev) => [...prev, { id, name }]);
    this.activeDiagramId.set(id);
  }

  selectDiagram(id: string): void {
    this.activeDiagramId.set(id);
  }

  closeDiagram(id: string, ev: Event): void {
    ev.stopPropagation();
    const diagrams = this.diagrams();
    if (diagrams.length === 1) {
      return;
    }
    const idx = diagrams.findIndex((d) => d.id === id);
    if (idx < 0) {
      return;
    }
    const next = diagrams.filter((d) => d.id !== id);
    if (this.activeDiagramId() === id) {
      const pick = next[idx - 1] ?? next[idx] ?? next[0];
      this.activeDiagramId.set(pick.id);
    }
    this.diagrams.set(next);
  }

  async saveAllTabsToIndexDB(): Promise<void> {
    const workspaces = this.workspaces?.toArray() ?? [];
    const wsById = new Map(workspaces.map((w) => [w.diagramId, w]));

    const tabs = this.diagrams()
      .map((d) => {
        const ws = wsById.get(d.id);
        const payload = ws?.getExportPayload?.() ?? null;
        if (!payload) {
          return null;
        }
        return {
          diagramId: d.id,
          diagramName: d.name,
          payload,
        };
      })
      .filter((t): t is NonNullable<typeof t> => t != null);

    const session: SldSavedSession = {
      format: 'ge-vernova-sld-session',
      version: 1,
      savedAt: new Date().toISOString(),
      tabs,
    };

    try {
      await saveCurrentSldSessionToIndexDB(session);
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.saveTabsSuccess', {
          count: tabs.length,
        }),
      );
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('IndexDB save failed', err);
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.saveFailed', { detail }),
        { variant: 'error' },
      );
    }
  }

  trackByDiagramId(_: number, diagram: { id: string }): string {
    return diagram.id;
  }

  pendingCellsForDiagram(diagramId: string): object[] | null {
    return this.pendingImports()[diagramId] ?? null;
  }

  onPendingImportConsumed(ev: { diagramId: string }): void {
    const pending = this.pendingImports();
    if (pending[ev.diagramId] != null) {
      const next = { ...pending };
      delete next[ev.diagramId];
      this.pendingImports.set(next);
    }
  }

  /** 가져오기 버튼(import)에서 들어온 파일을 '무조건' 새 탭으로 생성 */
  onImportToNewTab(ev: { fileName: string; cells: object[] }): void {
    const tabName = this.tabNameFromFileName(ev.fileName);
    const id = `sld-${this.nextDiagramIndex}`;
    this.nextDiagramIndex += 1;
    this.pendingImports.update((prev) => ({ ...prev, [id]: ev.cells }));
    this.diagrams.update((prev) => [...prev, { id, name: tabName }]);
    this.activeDiagramId.set(id);
  }

  openGlobalImport(): void {
    const input = this.globalImportInput?.nativeElement;
    if (!input) {
      return;
    }
    input.value = '';
    input.click();
  }

  onGlobalImportFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      this.ngZone.run(() => {
        try {
          const raw = reader.result as string;
          const text = raw.replace(/^\uFEFF/, '');
          const parsed = JSON.parse(text) as unknown;
          const { cells } = parseSldImportPayload(parsed);
          const tabName = this.tabNameFromFileName(file.name);
          const id = `sld-${this.nextDiagramIndex}`;
          this.nextDiagramIndex += 1;
          this.pendingImports.update((prev) => ({ ...prev, [id]: cells }));
          this.diagrams.update((prev) => [...prev, { id, name: tabName }]);
          this.activeDiagramId.set(id);
        } catch (err) {
          const detail = err instanceof Error ? err.message : String(err);
          console.error('SLD global import failed', err);
          this.sldIoMessage.showIoMessage(
            this.translate.instant('messages.importFailed', { detail }),
            { variant: 'error' },
          );
        }
      });
    };
    reader.onerror = () => {
      this.ngZone.run(() => {
        this.sldIoMessage.showIoMessage(
          this.translate.instant('messages.fileReadError'),
          { variant: 'error' },
        );
      });
    };
    reader.readAsText(file, 'utf-8');
  }

  private tabNameFromFileName(fileName: string): string {
    const base = fileName.replace(/^.*[/\\]/, '');
    const noExt = base.replace(/\.[^./\\]+$/, '').trim();
    const cleaned = noExt
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .slice(0, 80);
    return (
      cleaned || this.translate.instant('messages.importedDiagramDefault')
    );
  }
}
