import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramModelService,
  NgDiagramMinimapComponent,
  NgDiagramViewportService,
  initializeModel,
  provideNgDiagram,
  type Edge,
  type ModelAdapter,
  type Node,
} from 'ng-diagram';

import { SldIoMessageService } from '../sld-io-message/sld-io-message.service';

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
    MatIconModule,
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
  private readonly viewportService = inject(NgDiagramViewportService);

  constructor(
    private readonly cdr: ChangeDetectorRef,
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
