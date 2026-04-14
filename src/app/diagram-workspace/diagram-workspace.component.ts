import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramModelService,
  NgDiagramMinimapComponent,
  NgDiagramSelectionService,
  NgDiagramViewportService,
  initializeModel,
  provideNgDiagram,
  type Edge,
  type ModelAdapter,
  type Node,
} from 'ng-diagram';

import { parseSldImportPayload } from '../node-editor/sld-import-payload';
import { SldIoMessageService } from '../sld-io-message/sld-io-message.service';

type SaveFilePickerFn = (options?: {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<FileSystemSaveHandle>;

interface FileSystemSaveHandle {
  createWritable(): Promise<FileSystemWritableLike>;
}

interface FileSystemWritableLike {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

type SerializedCell = {
  id: string;
  shape: 'ng-node' | 'ng-edge';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  source?: { cell: string; port?: string };
  target?: { cell: string; port?: string };
  data?: Record<string, unknown>;
  type?: string;
  groupId?: string;
  isGroup?: boolean;
};

@Component({
  selector: 'app-diagram-workspace',
  templateUrl: './diagram-workspace.component.html',
  styleUrls: ['./diagram-workspace.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  providers: [provideNgDiagram()],
  imports: [
    TranslateModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    NgDiagramMinimapComponent,
  ],
})
export class DiagramWorkspaceComponent implements AfterViewInit, OnChanges {
  private static readonly INITIAL_CANVAS_ZOOM = 0.8;

  @Input() diagramId = '';
  @Input() diagramName = '';
  @Input() pendingImportCells: object[] | null = null;

  @Output() readonly pendingImportConsumed = new EventEmitter<{
    diagramId: string;
  }>();
  @Output() readonly importToNewTab = new EventEmitter<{
    fileName: string;
    cells: object[];
  }>();
  @Output() readonly saveSessionRequested = new EventEmitter<void>();

  @ViewChild('importFileInput', { static: true })
  importFileInput!: ElementRef<HTMLInputElement>;

  readonly model: ModelAdapter = initializeModel({
    nodes: [],
    edges: [],
    metadata: {},
  });
  readonly diagramConfig = {
    debugMode: false,
    zoom: {
      min: 0.2,
      max: 3,
      step: 0.1,
      zoomToFit: {
        onInit: false,
        padding: 24,
      },
    },
    edgeRouting: {
      defaultRouting: 'polyline',
    },
    viewportPanningEnabled: true,
    nodeDraggingEnabled: true,
  } as const;

  private readonly destroyRef = inject(DestroyRef);
  private readonly modelService = inject(NgDiagramModelService);
  private readonly selectionService = inject(NgDiagramSelectionService);
  private readonly viewportService = inject(NgDiagramViewportService);

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly hostRef: ElementRef<HTMLElement>,
    private readonly sldIoMessage: SldIoMessageService,
    private readonly translate: TranslateService,
  ) {}

  ngAfterViewInit(): void {
    this.translate.onLangChange
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.cdr.markForCheck());

    this.tryConsumePendingImport();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pendingImportCells'] && this.pendingImportCells != null) {
      this.tryConsumePendingImport();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocKeydown(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement | null;
    const inEditable =
      target != null &&
      (target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.getAttribute('contenteditable') === 'true');

    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.code === 'KeyE') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.exportDiagram();
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.code === 'KeyS') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.saveSessionRequested.emit();
      return;
    }
  }

  private isActiveWorkspaceTab(): boolean {
    return !this.hostRef.nativeElement.classList.contains(
      'layout__workspace-item--hidden',
    );
  }

  zoomToFit(): void {
    this.viewportService.zoomToFit({ padding: 24 });
  }

  undo(): void {
    this.model.undo();
    this.cdr.markForCheck();
  }

  redo(): void {
    this.model.redo();
    this.cdr.markForCheck();
  }

  canUndo(): boolean {
    return true;
  }

  canRedo(): boolean {
    return true;
  }

  canDeleteSelection(): boolean {
    const selection = this.selectionService.selection();
    return selection.nodes.length > 0 || selection.edges.length > 0;
  }

  deleteSelected(): void {
    this.selectionService.deleteSelection();
    this.cdr.markForCheck();
  }

  exportDiagram(): void {
    void this.exportDiagramAsync();
  }

  /** 저장용: exportDiagram과 동일한 export JSON payload를 graph 상태에서 생성합니다. */
  getExportPayload(): {
    format: 'ge-vernova-sld';
    version: 1;
    exportedAt: string;
    graph: unknown;
  } {
    const graph = { cells: this.serializeCells() };
    return {
      format: 'ge-vernova-sld',
      version: 1,
      exportedAt: new Date().toISOString(),
      graph,
    };
  }

  private async exportDiagramAsync(): Promise<void> {
    const graph = { cells: this.serializeCells() };
    const payload = {
      format: 'ge-vernova-sld',
      version: 1,
      exportedAt: new Date().toISOString(),
      graph,
    };
    const json = JSON.stringify(payload, null, 2);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const filename = `sld-${stamp}.json`;

    const picker = (
      window as Window & { showSaveFilePicker?: SaveFilePickerFn }
    ).showSaveFilePicker?.bind(window);
    if (picker != null && window.isSecureContext) {
      try {
        const handle = await picker({
          suggestedName: filename,
          types: [
            {
              description: 'JSON',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
        const writable = await (
          handle as FileSystemSaveHandle
        ).createWritable();
        await writable.write(
          new Blob([json], { type: 'application/json;charset=utf-8' }),
        );
        await writable.close();
        this.sldIoMessage.showIoMessage(
          this.translate.instant('messages.exportSaved'),
        );
        this.cdr.markForCheck();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const detail = err instanceof Error ? err.message : String(err);
        console.error('SLD export failed', err);
        this.sldIoMessage.showIoMessage(
          this.translate.instant('messages.exportFailed', { detail }),
          { variant: 'error' },
        );
        this.cdr.markForCheck();
      }
      return;
    }

    const blob = new Blob([json], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    this.sldIoMessage.showIoMessage(
      this.translate.instant('messages.downloadStarted'),
    );
    this.cdr.markForCheck();
  }

  openImportFilePicker(): void {
    const input = this.importFileInput?.nativeElement;
    if (!input) {
      return;
    }
    input.value = '';
    input.click();
  }

  onImportFileSelected(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const raw = reader.result as string;
        const text = raw.replace(/^\uFEFF/, '');
        const parsed = JSON.parse(text) as unknown;
        const { cells } = parseSldImportPayload(parsed);
        this.importToNewTab.emit({ fileName: file.name, cells });
      } catch (err) {
        const detail = err instanceof Error ? err.message : String(err);
        console.error('SLD import failed', err);
        this.sldIoMessage.showIoMessage(
          this.translate.instant('messages.importFailed', { detail }),
          { variant: 'error' },
        );
      }
      this.cdr.markForCheck();
    };
    reader.onerror = () => {
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.fileReadError'),
        { variant: 'error' },
      );
      this.cdr.markForCheck();
    };
    reader.readAsText(file, 'utf-8');
  }

  private tryConsumePendingImport(): void {
    if (this.pendingImportCells == null) {
      return;
    }
    try {
      const model = this.deserializeCells(this.pendingImportCells);
      this.model.updateNodes(model.nodes);
      this.model.updateEdges(model.edges);
      queueMicrotask(() => this.viewportService.zoomToFit({ padding: 24 }));
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.diagramLoaded'),
      );
      this.pendingImportConsumed.emit({ diagramId: this.diagramId });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error('SLD pending import failed', err);
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.importFailed', { detail }),
        { variant: 'error' },
      );
      this.pendingImportConsumed.emit({ diagramId: this.diagramId });
    }
    this.cdr.markForCheck();
  }

  onSelectionChanged(): void {
    this.cdr.markForCheck();
  }

  onDiagramInit(): void {
    queueMicrotask(() => {
      this.viewportService.moveViewport(0, 0);
      this.applyInitialCanvasZoomLevel();
    });
  }

  private applyInitialCanvasZoomLevel(): void {
    const current = this.viewportService.scale();
    if (current <= 0) {
      return;
    }
    const target = Math.min(
      this.viewportService.maxZoom,
      Math.max(
        this.viewportService.minZoom,
        DiagramWorkspaceComponent.INITIAL_CANVAS_ZOOM,
      ),
    );
    this.viewportService.zoom(target / current);
  }

  private serializeCells(): SerializedCell[] {
    const nodes = this.modelService.nodes();
    const edges = this.modelService.edges();
    const nodeCells: SerializedCell[] = nodes.map((n) => ({
      id: n.id,
      shape: 'ng-node',
      x: n.position.x,
      y: n.position.y,
      width: n.size?.width,
      height: n.size?.height,
      data: (n.data ?? {}) as Record<string, unknown>,
      type: n.type,
      groupId: n.groupId,
      isGroup: (n as { isGroup?: boolean }).isGroup ?? false,
    }));
    const edgeCells: SerializedCell[] = edges.map((e) => ({
      id: e.id,
      shape: 'ng-edge',
      source: { cell: e.source, port: e.sourcePort },
      target: { cell: e.target, port: e.targetPort },
      data: (e.data ?? {}) as Record<string, unknown>,
      type: e.type,
    }));
    return [...nodeCells, ...edgeCells];
  }

  private deserializeCells(cells: object[]): { nodes: Node[]; edges: Edge[] } {
    const typed = cells as SerializedCell[];
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    for (const cell of typed) {
      if (cell == null || typeof cell !== 'object') {
        continue;
      }
      const sourceCell =
        typeof cell.source === 'string' ? cell.source : cell.source?.cell;
      const targetCell =
        typeof cell.target === 'string' ? cell.target : cell.target?.cell;

      if (sourceCell != null && targetCell != null) {
        edges.push({
          id: cell.id,
          source: sourceCell,
          target: targetCell,
          sourcePort:
            typeof cell.source === 'string' ? undefined : cell.source?.port,
          targetPort:
            typeof cell.target === 'string' ? undefined : cell.target?.port,
          routing: 'polyline',
          type: cell.type,
          data: cell.data ?? {},
        });
        continue;
      }

      const resolvedType = this.resolveNodeType(cell);
      const resolvedKind = this.resolveNodeKind(cell, resolvedType);

      const baseNode: Node = {
        id: cell.id,
        type: resolvedType,
        position: { x: cell.x ?? 0, y: cell.y ?? 0 },
        size: { width: cell.width ?? 140, height: cell.height ?? 64 },
        autoSize: false,
        resizable: true,
        rotatable: true,
        draggable: true,
        data: { ...(cell.data ?? {}), kind: resolvedKind },
        groupId: cell.groupId,
      };
      if (cell.isGroup === true) {
        nodes.push({ ...baseNode, isGroup: true });
      } else {
        nodes.push(baseNode);
      }
    }
    return { nodes, edges };
  }

  private resolveNodeType(cell: SerializedCell): string {
    if (cell.type != null) {
      return cell.type;
    }
    if (cell.shape != null && cell.shape !== 'ng-node') {
      return cell.shape;
    }
    const data = (cell.data ?? {}) as Record<string, unknown>;
    if (typeof data['kind'] === 'string') {
      return data['kind'];
    }
    return 'sld-node';
  }

  private resolveNodeKind(cell: SerializedCell, fallback: string): string {
    const data = (cell.data ?? {}) as Record<string, unknown>;
    if (typeof data['kind'] === 'string') {
      return data['kind'];
    }
    if (cell.type != null) {
      return cell.type;
    }
    if (cell.shape != null && cell.shape !== 'ng-node') {
      return cell.shape;
    }
    return fallback;
  }
}
