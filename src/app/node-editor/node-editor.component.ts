import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  HostListener,
  AfterViewInit,
  NgZone,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { NewDiagramRequestService } from '../new-diagram-request.service';
import { parseSldImportPayload } from './sld-import-payload';
import {
  saveCurrentSldSessionToIndexDB,
  loadCurrentSldSessionFromIndexDB,
  type SldSavedSession,
} from '../indexdb/sld-session-indexdb';
import { DiagramWorkspaceComponent } from '../diagram-workspace/diagram-workspace.component';
import { SldIoMessageService } from '../sld-io-message/sld-io-message.service';

@Component({
  selector: 'app-node-editor',
  templateUrl: './node-editor.component.html',
  styleUrls: ['./node-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeEditorComponent implements OnInit, OnDestroy {
  private readonly destroy$ = new Subject<void>();

  @ViewChild('globalImportInput', { static: true })
  globalImportInput!: ElementRef<HTMLInputElement>;

  @ViewChildren(DiagramWorkspaceComponent)
  private readonly workspaces!: QueryList<DiagramWorkspaceComponent>;

  constructor(
    private readonly newDiagramRequest: NewDiagramRequestService,
    private readonly cdr: ChangeDetectorRef,
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
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.addDiagram();
        this.cdr.markForCheck();
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

      this.diagrams = tabs.map((t) => ({ id: t.diagramId, name: t.diagramName }));
      this.activeDiagramId = tabs[0].diagramId;
      this.pendingImports = pending;
      this.nextDiagramIndex = Math.max(this.nextDiagramIndex, maxIdx + 1);
      this.cdr.markForCheck();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('IndexDB restore failed', err);
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.restoreFailed', { detail }),
        { variant: 'error' },
      );
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Properties 패널 목업용 (도메인 연동 없음) */
  mockVoltage = '345';
  mockState = 'normal';
  mockTagId = 'SLD-BUS-001';

  diagrams: { id: string; name: string }[] = [
    { id: 'sld-1', name: 'SLD 1' },
  ];
  activeDiagramId = this.diagrams[0].id;
  private nextDiagramIndex = 2;

  /** Material sidenav `opened` — Properties 패널 표시 여부 */
  propertiesOpened = true;

  /** pendingImportCells는 탭별로 다중 지원 */
  private pendingImports: Record<string, object[]> = {};

  addDiagram(): void {
    const name = `SLD ${this.nextDiagramIndex}`;
    const id = `sld-${this.nextDiagramIndex}`;
    this.nextDiagramIndex += 1;
    this.diagrams = [...this.diagrams, { id, name }];
    this.activeDiagramId = id;
  }

  selectDiagram(id: string): void {
    this.activeDiagramId = id;
  }

  closeDiagram(id: string, ev: Event): void {
    ev.stopPropagation();
    if (this.diagrams.length === 1) {
      return;
    }
    const idx = this.diagrams.findIndex((d) => d.id === id);
    if (idx < 0) {
      return;
    }
    const next = this.diagrams.filter((d) => d.id !== id);
    if (this.activeDiagramId === id) {
      const pick = next[idx - 1] ?? next[idx] ?? next[0];
      this.activeDiagramId = pick.id;
    }
    this.diagrams = next;
  }

  toggleProperties(): void {
    this.propertiesOpened = !this.propertiesOpened;
    this.cdr.markForCheck();
  }

  async saveAllTabsToIndexDB(): Promise<void> {
    const workspaces = this.workspaces?.toArray() ?? [];
    const wsById = new Map(workspaces.map((w) => [w.diagramId, w]));

    const tabs = this.diagrams
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
    return this.pendingImports[diagramId] ?? null;
  }

  onPendingImportConsumed(ev: { diagramId: string }): void {
    if (this.pendingImports[ev.diagramId] != null) {
      const next = { ...this.pendingImports };
      delete next[ev.diagramId];
      this.pendingImports = next;
      this.cdr.markForCheck();
    }
  }

  /** 가져오기 버튼(import)에서 들어온 파일을 '무조건' 새 탭으로 생성 */
  onImportToNewTab(ev: { fileName: string; cells: object[] }): void {
    const tabName = this.tabNameFromFileName(ev.fileName);
    const id = `sld-${this.nextDiagramIndex}`;
    this.nextDiagramIndex += 1;
    this.pendingImports = { ...this.pendingImports, [id]: ev.cells };
    this.diagrams = [...this.diagrams, { id, name: tabName }];
    this.activeDiagramId = id;
    this.cdr.markForCheck();
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
          this.pendingImports = { ...this.pendingImports, [id]: cells };
          this.diagrams = [...this.diagrams, { id, name: tabName }];
          this.activeDiagramId = id;
          this.cdr.markForCheck();
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
        this.cdr.markForCheck();
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
