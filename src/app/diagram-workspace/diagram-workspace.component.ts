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
  NgDiagramClipboardService,
  NgDiagramComponent,
  NgDiagramModelService,
  NgDiagramMinimapComponent,
  NgDiagramNodeTemplateMap,
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
import { SldDiagramNodeComponent } from './sld-diagram-node.component';

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

type PaletteItem = {
  type: string;
  labelKey: string;
  template?: boolean;
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
    NgDiagramMinimapComponent,
  ],
})
export class DiagramWorkspaceComponent implements AfterViewInit, OnChanges {
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
  readonly nodeTemplateMap = new NgDiagramNodeTemplateMap([
    ['sld-node', SldDiagramNodeComponent],
    ['sld-group', SldDiagramNodeComponent],
    ['sld-bus', SldDiagramNodeComponent],
    ['sld-bus-v', SldDiagramNodeComponent],
    ['sld-breaker', SldDiagramNodeComponent],
    ['sld-disconnector', SldDiagramNodeComponent],
    ['sld-transformer', SldDiagramNodeComponent],
    ['sld-generator', SldDiagramNodeComponent],
    ['sld-load', SldDiagramNodeComponent],
    ['sld-ground', SldDiagramNodeComponent],
    ['sld-relay', SldDiagramNodeComponent],
    ['sld-fuse', SldDiagramNodeComponent],
    ['sld-ct', SldDiagramNodeComponent],
    ['sld-ts', SldDiagramNodeComponent],
    ['sld-sb', SldDiagramNodeComponent],
    ['sld-indicator', SldDiagramNodeComponent],
    ['sld-terminal', SldDiagramNodeComponent],
    ['sld-meter', SldDiagramNodeComponent],
    ['sld-pothead', SldDiagramNodeComponent],
    ['sld-equipment-region', SldDiagramNodeComponent],
  ]);

  readonly diagramConfig = {
    debugMode: false,
    zooming: {
      minZoom: 0.5,
      maxZoom: 3,
      wheelStep: 0.1,
    },
    panning: {
      enabled: true,
    },
  } as const;

  readonly paletteItems: readonly PaletteItem[] = [
    { type: 'sld-bus', labelKey: 'workspace.sldBus' },
    { type: 'sld-bus-v', labelKey: 'workspace.sldBusV' },
    { type: 'sld-breaker', labelKey: 'workspace.sldBreaker' },
    { type: 'sld-disconnector', labelKey: 'workspace.sldDisconnector' },
    { type: 'sld-transformer', labelKey: 'workspace.sldTransformer' },
    { type: 'sld-generator', labelKey: 'workspace.sldGenerator' },
    { type: 'sld-load', labelKey: 'workspace.sldLoad' },
    { type: 'sld-ground', labelKey: 'workspace.sldGround' },
    { type: 'sld-relay', labelKey: 'workspace.sldRelay' },
    { type: 'sld-fuse', labelKey: 'workspace.sldFuse' },
    { type: 'sld-ct', labelKey: 'workspace.sldCt' },
    { type: 'sld-ts', labelKey: 'workspace.sldTs' },
    { type: 'sld-sb', labelKey: 'workspace.sldSb' },
    { type: 'sld-indicator', labelKey: 'workspace.sldIndicator' },
    { type: 'sld-terminal', labelKey: 'workspace.sldTerminal' },
    { type: 'sld-meter', labelKey: 'workspace.sldMeter' },
    { type: 'sld-pothead', labelKey: 'workspace.sldPothead' },
    { type: 'sld-equipment-region', labelKey: 'workspace.sldRegion' },
    { type: 'bay-template-1', labelKey: 'workspace.bay1Title', template: true },
    { type: 'bay-template-2', labelKey: 'workspace.bay2Title', template: true },
  ];

  private readonly destroyRef = inject(DestroyRef);
  private readonly modelService = inject(NgDiagramModelService);
  private readonly clipboardService = inject(NgDiagramClipboardService);
  private readonly selectionService = inject(NgDiagramSelectionService);
  private readonly viewportService = inject(NgDiagramViewportService);
  private nextNodeIndex = 1;
  private lastPointerFlowPos = { x: 300, y: 200 };

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

    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.code === 'KeyZ') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      if (ev.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.code === 'KeyY') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.redo();
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.code === 'KeyA') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      const nodes = this.modelService.nodes().map((n) => n.id);
      const edges = this.modelService.edges().map((e) => e.id);
      this.selectionService.select(nodes, edges);
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.code === 'KeyC') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.clipboardService.copy();
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.code === 'KeyX') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.clipboardService.cut();
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && !ev.shiftKey && !ev.altKey && ev.code === 'KeyV') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.clipboardService.paste(this.lastPointerFlowPos);
      this.cdr.markForCheck();
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && !ev.altKey && ev.code === 'KeyG') {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      if (ev.shiftKey) {
        this.ungroupSelected();
      } else {
        this.groupSelected();
      }
      return;
    }

    if (!ev.ctrlKey && !ev.metaKey && !ev.altKey && (ev.code === 'Delete' || ev.code === 'Backspace')) {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.deleteSelected();
    }
  }

  @HostListener('document:mousemove', ['$event'])
  onDocMouseMove(ev: MouseEvent): void {
    if (!this.isActiveWorkspaceTab()) {
      return;
    }
    this.lastPointerFlowPos = this.viewportService.clientToFlowPosition({
      x: ev.clientX,
      y: ev.clientY,
    });
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

  groupSelected(): void {
    const selectedNodes = this.selectionService
      .selection()
      .nodes.filter((n) => !n.groupId && !(n as { isGroup?: boolean }).isGroup);
    if (selectedNodes.length < 2) {
      return;
    }

    const boxes = selectedNodes.map((n) => {
      const width = n.size?.width ?? 140;
      const height = n.size?.height ?? 64;
      return {
        x: n.position.x,
        y: n.position.y,
        width,
        height,
      };
    });
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.width));
    const maxY = Math.max(...boxes.map((b) => b.y + b.height));
    const paddingX = 24;
    const paddingTop = 28;
    const paddingBottom = 18;
    const groupId = this.newId('group');
    const groupNode: Node = {
      id: groupId,
      type: 'sld-group',
      isGroup: true,
      position: { x: minX - paddingX, y: minY - paddingTop },
      size: {
        width: maxX - minX + paddingX * 2,
        height: maxY - minY + paddingTop + paddingBottom,
      },
      data: { kind: 'bay-group', label: 'GROUP' },
      autoSize: false,
      resizable: true,
      rotatable: false,
      draggable: true,
    };
    this.modelService.addNodes([groupNode]);
    this.modelService.updateNodes(
      selectedNodes.map((n) => ({ id: n.id, groupId })),
    );
    this.selectionService.select([groupId, ...selectedNodes.map((n) => n.id)]);
    this.cdr.markForCheck();
  }

  ungroupSelected(): void {
    const selectedGroups = this.selectionService
      .selection()
      .nodes.filter((n) => (n as { isGroup?: boolean }).isGroup);
    if (!selectedGroups.length) {
      return;
    }
    const groupIds = selectedGroups.map((g) => g.id);
    const allNodes = this.modelService.nodes();
    const childNodes = allNodes.filter(
      (n) => n.groupId != null && groupIds.includes(n.groupId),
    );
    if (childNodes.length) {
      this.modelService.updateNodes(
        childNodes.map((n) => ({ id: n.id, groupId: undefined })),
      );
      this.selectionService.select(childNodes.map((n) => n.id));
    }
    this.modelService.deleteNodes(groupIds);
    this.cdr.markForCheck();
  }

  addFromPalette(type: string, isTemplate = false): void {
    if (isTemplate) {
      this.addBayTemplate(type as 'bay-template-1' | 'bay-template-2');
      return;
    }
    const next = this.computeNextPosition();
    this.modelService.addNodes([
      {
        id: this.newId('node'),
        type,
        position: next,
        size: { width: 140, height: 64 },
        autoSize: false,
        resizable: true,
        rotatable: true,
        draggable: true,
        data: { kind: type, label: type.replace('sld-', '').toUpperCase() },
      },
    ]);
    this.cdr.markForCheck();
  }

  onSelectionChanged(): void {
    this.cdr.markForCheck();
  }

  onDiagramInit(): void {
    this.viewportService.zoomToFit({ padding: 24 });
  }

  private addBayTemplate(kind: 'bay-template-1' | 'bay-template-2'): void {
    const origin = this.computeNextPosition();
    const parts =
      kind === 'bay-template-1'
        ? ['sld-bus', 'sld-breaker', 'sld-load']
        : ['sld-bus', 'sld-breaker', 'sld-transformer', 'sld-generator'];

    const nodes: Node[] = [];
    const edges: Edge[] = [];
    let x = origin.x;
    for (const part of parts) {
      const id = this.newId('node');
      nodes.push({
        id,
        type: part,
        position: { x, y: origin.y },
        size: { width: 140, height: 64 },
        autoSize: false,
        resizable: true,
        rotatable: true,
        draggable: true,
        data: { kind: part, label: part.replace('sld-', '').toUpperCase() },
      });
      x += 200;
    }
    for (let i = 0; i < nodes.length - 1; i += 1) {
      edges.push({
        id: this.newId('edge'),
        source: nodes[i].id,
        target: nodes[i + 1].id,
        sourcePort: 'right',
        targetPort: 'left',
        data: {},
      });
    }
    const groupId = this.newId('group');
    const groupNode: Node = {
      id: groupId,
      type: 'sld-group',
      isGroup: true,
      position: { x: origin.x - 24, y: origin.y - 30 },
      size: { width: (nodes.length - 1) * 200 + 188, height: 112 },
      autoSize: false,
      resizable: true,
      rotatable: false,
      draggable: true,
      data: {
        kind: 'bay-group',
        label:
          kind === 'bay-template-1'
            ? this.translate.instant('workspace.bayExpanded1')
            : this.translate.instant('workspace.bayExpanded2'),
      },
    };
    this.modelService.addNodes([groupNode, ...nodes]);
    this.modelService.updateNodes(nodes.map((n) => ({ id: n.id, groupId })));
    this.modelService.addEdges(edges);
    this.selectionService.select([groupId, ...nodes.map((n) => n.id)]);
    queueMicrotask(() => this.viewportService.zoomToFit({ padding: 24 }));
    this.cdr.markForCheck();
  }

  private computeNextPosition(): { x: number; y: number } {
    const idx = this.nextNodeIndex++;
    const col = (idx - 1) % 4;
    const row = Math.floor((idx - 1) / 4);
    return { x: 80 + col * 220, y: 80 + row * 140 };
  }

  private newId(prefix: string): string {
    return `${prefix}-${crypto.randomUUID()}`;
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
