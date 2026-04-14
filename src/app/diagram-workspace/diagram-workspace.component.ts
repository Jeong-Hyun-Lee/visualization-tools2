import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Edge, Graph, Node } from '@antv/x6';
import { History } from '@antv/x6-plugin-history';
import { Keyboard } from '@antv/x6-plugin-keyboard';
import { MiniMap } from '@antv/x6-plugin-minimap';
import { Selection } from '@antv/x6-plugin-selection';
import { Snapline } from '@antv/x6-plugin-snapline';
import { Stencil } from '@antv/x6-plugin-stencil';
import { Clipboard } from '@antv/x6-plugin-clipboard';
import { Transform } from '@antv/x6-plugin-transform';

import {
  COLOR_PORT_BLUE,
  COLOR_PORT_GRAY,
  DISCONNECTOR_SWITCH_CENTER,
  DISCONNECTOR_SWITCH_CLOSE,
  DISCONNECTOR_SWITCH_OPEN,
  SLD_PORTS_BREAKER,
  SLD_PORTS_DISCONNECTOR,
  SLD_PORTS_GENERATOR,
  SLD_PORTS_GROUND,
  SLD_PORTS_LOAD,
  SLD_PORTS_TRANSFORMER,
  buildSldBusMeta,
  buildSldBusVMeta,
  buildSldBreakerMeta,
  buildSldCtMeta,
  buildSldDisconnectorMeta,
  buildSldEquipmentRegionMeta,
  buildSldFuseMeta,
  buildSldGeneratorMeta,
  buildSldGroundMeta,
  buildSldIndicatorMeta,
  buildSldLoadMeta,
  buildSldMeterMeta,
  buildSldPotheadMeta,
  buildSldPorts,
  buildSldRelayMeta,
  buildSldSbMeta,
  buildSldTerminalMeta,
  buildSldTransformerMeta,
  buildSldTsMeta,
  ensureGlobalX6Styles,
  registerSldEdge,
  registerSldShapes,
  SLD_PORTS_CT,
  SLD_PORTS_FUSE,
  SLD_PORTS_METER,
  SLD_PORTS_POTHEAD,
  SLD_PORTS_RELAY,
  SLD_PORTS_SMALL_BOX,
  SLD_PORTS_TERMINAL,
} from '../node-editor/sld-node-registry';
import { parseSldImportPayload } from '../node-editor/sld-import-payload';
import { SldIoMessageService } from '../sld-io-message/sld-io-message.service';

/** `buildBayTemplateMeta` 높이와 동일 — 드롭 미리보기 세로 중앙에 모선·차단기 축 맞춤 */
const BAY_TEMPLATE_PREVIEW_H = 64;
/** 인접 노드 사이 가로 간격 — 맨해튼 라우터가 노드 박스를 피해 돌지 않도록 여유 */
const BAY_TEMPLATE_GAP_X = 64;

type SaveFilePickerFn = (options?: {
  suggestedName?: string;
  types?: Array<{ description?: string; accept: Record<string, string[]> }>;
}) => Promise<FileSystemSaveHandle>;

/** Chromium File System Access — lib.dom 버전에 따라 생략될 수 있음 */
interface FileSystemSaveHandle {
  createWritable(): Promise<FileSystemWritableLike>;
}

interface FileSystemWritableLike {
  write(data: Blob): Promise<void>;
  close(): Promise<void>;
}

@Component({
  selector: 'app-diagram-workspace',
  templateUrl: './diagram-workspace.component.html',
  styleUrls: ['./diagram-workspace.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DiagramWorkspaceComponent
  implements AfterViewInit, OnDestroy, OnChanges
{
  @Input() diagramId = '';
  @Input() diagramName = '';
  /** 부모(node-editor)에서 새 탭으로 JSON을 넣을 때만 전달, 적용 후 `pendingImportConsumed`로 비움 */
  @Input() pendingImportCells: object[] | null = null;

  @Output() readonly pendingImportConsumed = new EventEmitter<{
    diagramId: string;
  }>();

  /** 가져오기 버튼에서 읽은 파일 내용을 부모로 올려 새 탭에 적용 */
  @Output() readonly importToNewTab = new EventEmitter<{
    fileName: string;
    cells: object[];
  }>();

  /** node-editor에서 '현재 열려있는 모든 탭 저장'을 수행하도록 요청 */
  @Output() readonly saveSessionRequested = new EventEmitter<void>();

  @ViewChild('stencilHost', { static: true })
  stencilHost!: ElementRef<HTMLDivElement>;

  @ViewChild('graphHost', { static: true })
  graphHost!: ElementRef<HTMLDivElement>;

  @ViewChild('minimapHost', { static: true })
  minimapHost!: ElementRef<HTMLDivElement>;

  @ViewChild('importFileInput', { static: true })
  importFileInput!: ElementRef<HTMLInputElement>;

  private graph?: Graph;
  private stencil?: Stencil;

  stencilLoaded = false;
  stencilError: string | null = null;

  private spaceDown = false;
  private readonly destroy$ = new Subject<void>();

  constructor(
    private readonly cdr: ChangeDetectorRef,
    private readonly ngZone: NgZone,
    private readonly hostRef: ElementRef<HTMLElement>,
    private readonly sldIoMessage: SldIoMessageService,
    private readonly translate: TranslateService,
  ) {}

  ngAfterViewInit(): void {
    ensureGlobalX6Styles();
    registerSldEdge();
    registerSldShapes();

    this.initGraph();
    this.loadStencil();

    this.translate.onLangChange
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.ngZone.run(() => this.rebuildStencil());
      });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (
      changes['pendingImportCells'] &&
      this.graph != null &&
      this.pendingImportCells != null
    ) {
      const cur = changes['pendingImportCells'].currentValue;
      const prev = changes['pendingImportCells'].previousValue;
      if (cur !== prev) {
        this.tryConsumePendingImport();
      }
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    this.stencil?.dispose();
    this.stencil = undefined;

    this.graph?.dispose();
    this.graph = undefined;
  }

  @HostListener('document:keydown', ['$event'])
  onDocKeydown(ev: KeyboardEvent): void {
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
      ev.code === 'KeyE'
    ) {
      if (inEditable || !this.isActiveWorkspaceTab()) {
        return;
      }
      ev.preventDefault();
      this.exportDiagram();
      return;
    }

    if (ev.code !== 'Space' || this.spaceDown) {
      return;
    }
    if (inEditable || !this.isActiveWorkspaceTab()) {
      return;
    }

    this.spaceDown = true;
    this.graph?.disableSelection?.();
  }

  @HostListener('document:keyup', ['$event'])
  onDocKeyup(ev: KeyboardEvent): void {
    if (ev.code !== 'Space') {
      return;
    }
    this.spaceDown = false;
    this.graph?.enableSelection?.();
  }

  /** 숨김 탭의 워크스페이스는 전역 단축키(저장, 스페이스 팬)에서 무시 */
  private isActiveWorkspaceTab(): boolean {
    return !this.hostRef.nativeElement.classList.contains(
      'layout__workspace-item--hidden',
    );
  }

  zoomToFit(): void {
    this.graph?.centerContent?.({ padding: 0 });
  }

  undo(): void {
    if (this.graph?.canUndo()) {
      this.graph.undo();
    }
  }

  redo(): void {
    if (this.graph?.canRedo()) {
      this.graph.redo();
    }
  }

  canUndo(): boolean {
    return this.graph?.canUndo() ?? false;
  }

  canRedo(): boolean {
    return this.graph?.canRedo() ?? false;
  }

  /** 선택된 셀이 1개 이상일 때만 삭제 허용 */
  canDeleteSelection(): boolean {
    return (this.graph?.getSelectedCells().length ?? 0) > 0;
  }

  deleteSelected(): void {
    if (!this.graph) {
      return;
    }
    const cells = this.graph.getSelectedCells();
    if (cells.length) {
      this.graph.removeCells(cells);
    }
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
  } | null {
    if (!this.graph) {
      return null;
    }
    const graph = this.graph.toJSON();
    return {
      format: 'ge-vernova-sld',
      version: 1,
      exportedAt: new Date().toISOString(),
      graph,
    };
  }

  private async exportDiagramAsync(): Promise<void> {
    if (!this.graph) {
      return;
    }
    const graph = this.graph.toJSON();
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
        this.ngZone.run(() => {
          this.sldIoMessage.showIoMessage(
            this.translate.instant('messages.exportSaved'),
          );
          this.cdr.markForCheck();
        });
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }
        const detail = err instanceof Error ? err.message : String(err);
        console.error('SLD export failed', err);
        this.ngZone.run(() => {
          this.sldIoMessage.showIoMessage(
            this.translate.instant('messages.exportFailed', { detail }),
            { variant: 'error' },
          );
          this.cdr.markForCheck();
        });
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
    this.ngZone.run(() => {
      this.sldIoMessage.showIoMessage(
        this.translate.instant('messages.downloadStarted'),
      );
      this.cdr.markForCheck();
    });
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
      this.ngZone.run(() => {
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

  private tryConsumePendingImport(): void {
    if (!this.graph || this.pendingImportCells == null) {
      return;
    }
    try {
      this.graph.fromJSON({ cells: this.pendingImportCells });
      this.graph.cleanHistory();
      this.graph.cleanSelection();
      this.graph.centerContent({ padding: 24 });
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
    if (!this.graph) {
      return;
    }
    const selectedNodes = this.graph
      .getSelectedCells()
      .filter((c) => c.isNode())
      .map((c) => c as Node)
      .filter((n) => !n.getParent());
    if (selectedNodes.length < 2) {
      return;
    }

    const boxes = selectedNodes.map((n) => n.getBBox());
    const minX = Math.min(...boxes.map((b) => b.x));
    const minY = Math.min(...boxes.map((b) => b.y));
    const maxX = Math.max(...boxes.map((b) => b.x + b.width));
    const maxY = Math.max(...boxes.map((b) => b.y + b.height));
    const paddingX = 24;
    const paddingTop = 28;
    const paddingBottom = 18;

    this.graph.startBatch('grouping', { ui: true });
    try {
      const groupNode = this.graph.addNode({
        shape: 'rect',
        x: minX - paddingX,
        y: minY - paddingTop,
        width: maxX - minX + paddingX * 2,
        height: maxY - minY + paddingTop + paddingBottom,
        attrs: {
          body: {
            fill: 'transparent',
            stroke: '#93C5FD',
            strokeWidth: 1,
            strokeDasharray: '6 4',
            rx: 10,
            ry: 10,
          },
          label: {
            text: 'GROUP',
            fill: '#1E3A8A',
            fontSize: 11,
            fontWeight: 700,
            textAnchor: 'start',
            textVerticalAnchor: 'middle',
            refX: 10,
            refY: 14,
          },
        },
        data: { kind: 'bay-group' },
      } as Node.Metadata);

      selectedNodes.forEach((n) => groupNode.addChild(n));
      this.graph.resetSelection([groupNode, ...selectedNodes]);
    } finally {
      this.graph.stopBatch('grouping', { ui: true });
    }
  }

  ungroupSelected(): void {
    if (!this.graph) {
      return;
    }
    const selectedNodes = this.graph
      .getSelectedCells()
      .filter((c) => c.isNode())
      .map((c) => c as Node);
    if (!selectedNodes.length) {
      return;
    }

    const ungrouped: Node[] = [];
    this.graph.startBatch('ungrouping', { ui: true });
    try {
      selectedNodes.forEach((groupNode) => {
        const kind = groupNode.getData<{ kind?: string }>()?.kind;
        const children = (groupNode.getChildren() || []).filter((c) =>
          c.isNode(),
        ) as Node[];
        if (!children.length || kind !== 'bay-group') {
          return;
        }
        children.forEach((child) => groupNode.unembed(child));
        groupNode.remove({ deep: false });
        ungrouped.push(...children);
      });
    } finally {
      this.graph.stopBatch('ungrouping', { ui: true });
    }

    if (ungrouped.length) {
      this.graph.resetSelection(ungrouped);
    }
  }

  private initGraph(): void {
    let g: Graph;
    g = new Graph({
      container: this.graphHost.nativeElement,
      autoResize: true,
      grid: true,
      virtual: true,
      panning: {
        enabled: true,
        modifiers: ['space'],
        eventTypes: ['leftMouseDown', 'rightMouseDown'],
      },
      mousewheel: {
        enabled: true,
        minScale: 0.5,
        maxScale: 3,
      },
      connecting: {
        snap: true,
        allowBlank: false,
        allowLoop: false,
        highlight: true,
        router: {
          name: 'manhattan',
          args: {
            offset: 'center',
          },
        },
        connector: { name: 'rounded', args: { radius: 8 } },
        createEdge: (): Edge =>
          g.createEdge({
            shape: 'sld-edge',
            attrs: {
              line: {
                stroke: '#1F1F1F',
                strokeWidth: 2,
              },
            },
          }),
        validateMagnet: ({ magnet }) =>
          magnet.getAttribute('port-group') !== null,
      },
      highlighting: {
        magnetAdsorbed: {
          name: 'stroke',
          args: {
            attrs: {
              stroke: COLOR_PORT_BLUE,
            },
          },
        },
      },
    });

    g.use(new Snapline({ enabled: true }));
    g.use(
      new MiniMap({
        container: this.minimapHost.nativeElement,
        width: 220,
        height: 140,
        padding: 8,
      }),
    );
    g.use(
      new Transform({
        rotating: true,
        resizing: true,
      }),
    );
    g.use(
      new Selection({
        enabled: true,
        multiple: true,
        rubberband: true,
        movable: true,
        selectCellOnMoved: true,
        selectNodeOnMoved: true,
        selectEdgeOnMoved: true,
        showNodeSelectionBox: true,
      }),
    );
    g.on('selection:changed', () => {
      this.ngZone.run(() => this.cdr.markForCheck());
    });
    g.use(
      new History({
        enabled: true,
        beforeAddCommand: (event, args) => {
          const eventArgs = args as {
            options?: Record<string, unknown>;
            key?: string;
          };
          if (eventArgs.options?.['ignoreHistory']) {
            return false;
          }
          if (event === 'cell:change:*' && eventArgs.key === 'ports') {
            return false;
          }
          return true;
        },
      }),
    );
    g.use(new Keyboard({ enabled: true }));
    g.use(new Clipboard({ enabled: true }));

    g.bindKey(['del', 'backspace'], () => {
      const cells = g.getSelectedCells();
      if (cells.length) {
        g.removeCells(cells);
      }
    });
    g.bindKey(['meta+z', 'ctrl+z'], () => g.canUndo() && g.undo());
    g.bindKey(['meta+shift+z', 'ctrl+shift+z', 'meta+y', 'ctrl+y'], () => {
      if (g.canRedo()) {
        g.redo();
      }
    });

    g.bindKey(['meta+a', 'ctrl+a'], () => {
      const nodes = g.getNodes();
      if (nodes) {
        g.select(nodes);
      }
    });

    g.bindKey(['meta+c', 'ctrl+c'], () => {
      const cells = g.getSelectedCells();
      if (cells.length) {
        g.copy(cells);
      }
      return false;
    });
    g.bindKey(['meta+x', 'ctrl+x'], () => {
      const cells = g.getSelectedCells();
      if (cells.length) {
        g.cut(cells);
        g.cleanSelection();
      }
      return false;
    });
    g.bindKey(['meta+v', 'ctrl+v'], () => {
      if (!g.isClipboardEmpty()) {
        const pastedCells = g.paste({ offset: { dx: 32, dy: 32 } });
        g.cleanSelection();
        if (pastedCells.length) {
          g.select(pastedCells);
        }
      }
      return false;
    });
    g.bindKey(['meta+g', 'ctrl+g'], () => {
      this.groupSelected();
      return false;
    });
    g.bindKey(['meta+shift+g', 'ctrl+shift+g'], () => {
      this.ungroupSelected();
      return false;
    });

    g.on('history:change', () => this.cdr.markForCheck());

    this.bindMinimapContentRefresh(g);
    this.bindPortHover(g);
    this.bindEdgeTools(g);
    this.bindPortStateWithEdges(g);
    this.bindDisconnectorSwitch(g);
    this.bindBayTemplateDrop(g);

    this.graph = g;
    this.initStencil(g);
    this.tryConsumePendingImport();
  }

  private bindMinimapContentRefresh(g: Graph): void {
    type MinimapInternal = {
      updateViewport(): void;
      targetGraph: Graph;
    };
    const plugin = g.getPlugin('minimap') as MinimapInternal | undefined;
    if (!plugin?.updateViewport || !plugin.targetGraph) {
      return;
    }

    let raf = 0;
    const schedule = (): void => {
      if (raf !== 0) {
        return;
      }
      raf = requestAnimationFrame(() => {
        raf = 0;
        plugin.targetGraph.zoomToFit({ padding: 4 });
        plugin.updateViewport();
      });
    };

    g.on('node:change:position', schedule);
    g.on('node:change:size', schedule);
    g.on('node:change:angle', schedule);
    g.on('edge:change:vertices', schedule);
  }

  private initStencil(graph: Graph): void {
    const stencil = new Stencil({
      title: this.translate.instant('workspace.stencilTitle'),
      target: graph,
      search(cell, keyword) {
        const lowerKeyword = keyword.toLowerCase();
        if (cell.shape.toLowerCase().indexOf(lowerKeyword) !== -1) {
          return true;
        }
        if (cell.isNode()) {
          const kind = cell.getData<{ kind?: string }>()?.kind;
          return (
            kind != null && kind.toLowerCase().indexOf(lowerKeyword) !== -1
          );
        }
        return false;
      },
      placeholder: this.translate.instant('workspace.searchPlaceholder'),
      stencilGraphWidth: 240,
      stencilGraphHeight: 1700,
      collapsable: true,
      groups: [
        {
          title: this.translate.instant('workspace.groupSldNodes'),
          collapsable: true,
          name: 'sld-node',
          graphHeight: 1700,
          layoutOptions: {
            columns: 1,
            columnWidth: 230,
            rowHeight: 88,
            dx: 0,
            dy: 8,
          },
        },
        {
          title: this.translate.instant('workspace.groupBayTemplates'),
          collapsable: true,
          name: 'sld-bay-group',
          graphHeight: 280,
          layoutOptions: {
            columns: 1,
            columnWidth: 230,
            rowHeight: 108,
            dx: 0,
            dy: 8,
          },
        },
      ],
    });
    this.stencilHost.nativeElement.appendChild(
      stencil.container as HTMLElement,
    );
    this.stencil = stencil;
  }

  private loadStencil(): void {
    this.stencilError = null;
    this.loadStencilGroups();
    this.stencilLoaded = true;
    this.cdr.markForCheck();
  }

  /** 언어 전환 시 X6 Stencil UI 문자열만 재적용 */
  private rebuildStencil(): void {
    if (!this.graph) {
      return;
    }
    this.stencil?.dispose();
    this.stencil = undefined;
    this.stencilHost.nativeElement.innerHTML = '';
    this.initStencil(this.graph);
    this.loadStencilGroups();
    this.cdr.markForCheck();
  }

  private loadStencilGroups(): void {
    if (!this.stencil) {
      return;
    }

    if (this.graph) {
      this.stencil.load(
        [
          buildSldBusMeta(buildSldPorts('horizontal')),
          buildSldBusVMeta(buildSldPorts('vertical')),
          buildSldTerminalMeta(SLD_PORTS_TERMINAL),
          buildSldBreakerMeta(SLD_PORTS_BREAKER),
          buildSldDisconnectorMeta(SLD_PORTS_DISCONNECTOR),
          buildSldFuseMeta(SLD_PORTS_FUSE),
          buildSldTransformerMeta(SLD_PORTS_TRANSFORMER),
          buildSldCtMeta(SLD_PORTS_CT),
          buildSldRelayMeta(SLD_PORTS_RELAY),
          buildSldMeterMeta(SLD_PORTS_METER),
          buildSldLoadMeta(SLD_PORTS_LOAD),
          buildSldGeneratorMeta(SLD_PORTS_GENERATOR),
          buildSldGroundMeta(SLD_PORTS_GROUND),
          buildSldTsMeta(SLD_PORTS_SMALL_BOX),
          buildSldSbMeta(SLD_PORTS_SMALL_BOX),
          buildSldIndicatorMeta(buildSldPorts('all')),
          buildSldPotheadMeta(SLD_PORTS_POTHEAD),
          buildSldEquipmentRegionMeta(),
        ],
        'sld-node',
      );

      this.stencil.load(
        [
          this.buildBayTemplateMeta(
            'bay-template-1',
            this.translate.instant('workspace.bay1Title'),
            this.translate.instant('workspace.bay1Subtitle'),
          ),
          this.buildBayTemplateMeta(
            'bay-template-2',
            this.translate.instant('workspace.bay2Title'),
            this.translate.instant('workspace.bay2Subtitle'),
          ),
        ],
        'sld-bay-group',
      );
    }
  }

  private buildBayTemplateMeta(
    kind: 'bay-template-1' | 'bay-template-2',
    title: string,
    subtitle: string,
  ): Node.Metadata {
    return {
      shape: 'rect',
      width: 220,
      height: 64,
      attrs: {
        body: {
          stroke: '#93C5FD',
          strokeWidth: 1,
          fill: '#EFF6FF',
          rx: 10,
          ry: 10,
        },
        label: {
          text: `${title}\n${subtitle}`,
          fill: '#1E3A8A',
          fontSize: 12,
          fontWeight: 600,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
        },
      },
      data: { kind },
    };
  }

  private bindBayTemplateDrop(graph: Graph): void {
    graph.on('node:added', ({ node, options }) => {
      const kind = node.getData<{ kind?: string }>()?.kind;
      if (
        (kind !== 'bay-template-1' && kind !== 'bay-template-2') ||
        options?.['templateExpanded']
      ) {
        return;
      }

      const origin = node.getPosition();
      const templateTitle =
        kind === 'bay-template-1'
          ? this.translate.instant('workspace.bayExpanded1')
          : this.translate.instant('workspace.bayExpanded2');
      const templates =
        kind === 'bay-template-1'
          ? [
              buildSldBusMeta(buildSldPorts('horizontal')),
              buildSldBreakerMeta(SLD_PORTS_BREAKER),
              buildSldLoadMeta(SLD_PORTS_LOAD),
            ]
          : [
              buildSldBusMeta(buildSldPorts('horizontal')),
              buildSldBreakerMeta(SLD_PORTS_BREAKER),
              buildSldTransformerMeta(SLD_PORTS_TRANSFORMER),
              buildSldGeneratorMeta(SLD_PORTS_GENERATOR),
            ];

      const centerY = origin.y + BAY_TEMPLATE_PREVIEW_H / 2;

      graph.removeNode(node);

      const created: Node[] = [];
      let xCursor = origin.x;
      for (const meta of templates) {
        const w = (meta.width as number) ?? 0;
        const h = (meta.height as number) ?? 56;
        const n = graph.addNode(
          {
            ...meta,
            x: xCursor,
            y: centerY - h / 2,
          } as Node.Metadata,
          { templateExpanded: true },
        );
        created.push(n);
        xCursor += w + BAY_TEMPLATE_GAP_X;
      }
      for (let i = 0; i < created.length - 1; i += 1) {
        const sourcePort = this.getPortIdByGroup(created[i], 'right');
        const targetPort = this.getPortIdByGroup(created[i + 1], 'left');
        if (!sourcePort || !targetPort) {
          continue;
        }
        graph.addEdge(
          {
            shape: 'sld-edge',
            source: { cell: created[i].id, port: sourcePort },
            target: { cell: created[i + 1].id, port: targetPort },
            attrs: {
              line: {
                stroke: '#1F1F1F',
                strokeWidth: 2,
              },
            },
          },
          { templateExpanded: true },
        );
      }

      const boxes = created.map((n) => n.getBBox());
      const minX = Math.min(...boxes.map((b) => b.x));
      const minY = Math.min(...boxes.map((b) => b.y));
      const maxX = Math.max(...boxes.map((b) => b.x + b.width));
      const maxY = Math.max(...boxes.map((b) => b.y + b.height));
      const paddingX = 24;
      const paddingTop = 30;
      const paddingBottom = 18;

      const bayGroup = graph.addNode(
        {
          shape: 'rect',
          x: minX - paddingX,
          y: minY - paddingTop,
          width: maxX - minX + paddingX * 2,
          height: maxY - minY + paddingTop + paddingBottom,
          attrs: {
            body: {
              fill: 'transparent',
              stroke: '#93C5FD',
              strokeWidth: 1,
              strokeDasharray: '6 4',
              rx: 10,
              ry: 10,
            },
            label: {
              text: templateTitle,
              fill: '#1E3A8A',
              fontSize: 11,
              fontWeight: 700,
              textAnchor: 'start',
              textVerticalAnchor: 'middle',
              refX: 10,
              refY: 14,
            },
          },
          data: { kind: 'bay-group' },
        } as Node.Metadata,
        { templateExpanded: true },
      );

      created.forEach((n) => bayGroup.addChild(n));
      graph.resetSelection([bayGroup, ...created]);
    });
  }

  private getPortIdByGroup(node: Node, group: 'left' | 'right'): string | null {
    const port = node.getPorts().find((p) => p.group === group);
    return (port?.id as string | undefined) ?? null;
  }

  private bindPortHover(graph: Graph): void {
    graph.on('node:mouseenter', ({ node }) => {
      this.showNodePorts(node, true);
    });
    graph.on('node:mouseleave', ({ node }) => {
      this.showNodePorts(node, false);
    });
  }

  private bindEdgeTools(graph: Graph): void {
    graph.on('edge:mouseenter', ({ edge }) => {
      edge.addTools({ name: 'button-remove', args: { distance: -40 } });
    });
    graph.on('edge:mouseleave', ({ edge }) => {
      edge.removeTools();
    });
  }

  private bindPortStateWithEdges(graph: Graph): void {
    graph.on(
      'edge:connected',
      ({
        currentCell,
        currentPort,
      }: {
        currentCell: Node;
        currentPort?: string;
      }) => {
        if (!currentPort) {
          return;
        }
        this.setPortColor(currentCell, currentPort, COLOR_PORT_BLUE);
      },
    );

    graph.on('edge:added', ({ edge }) => {
      this.withNodePort(
        edge.getSourceCellId(),
        edge.getSourcePortId(),
        (n, p) => this.setPortColor(n, p, COLOR_PORT_BLUE),
      );
      this.withNodePort(
        edge.getTargetCellId(),
        edge.getTargetPortId(),
        (n, p) => this.setPortColor(n, p, COLOR_PORT_BLUE),
      );
    });

    graph.on('edge:removed', ({ edge }) => {
      this.withNodePort(
        edge.getSourceCellId(),
        edge.getSourcePortId(),
        (n, p) => {
          if (!this.isPortConnected(n, p))
            this.setPortColor(n, p, COLOR_PORT_GRAY);
        },
      );
      this.withNodePort(
        edge.getTargetCellId(),
        edge.getTargetPortId(),
        (n, p) => {
          if (!this.isPortConnected(n, p))
            this.setPortColor(n, p, COLOR_PORT_GRAY);
        },
      );
    });
  }

  private bindDisconnectorSwitch(graph: Graph): void {
    graph.on('node:click', ({ node }) => {
      if (node.shape !== 'sld-disconnector') {
        return;
      }

      const attrPath = 'attrs/switch/transform';
      const current = node.prop(attrPath) as string | undefined;
      const target =
        current === DISCONNECTOR_SWITCH_OPEN
          ? DISCONNECTOR_SWITCH_CLOSE
          : DISCONNECTOR_SWITCH_OPEN;

      node.transition(attrPath, target, {
        interp: (a: string, b: string) => {
          const reg = /-?\d+(\.\d+)?/g;
          const start = parseFloat(a.match(reg)?.[0] ?? '-30');
          const end = parseFloat(b.match(reg)?.[0] ?? '-10');
          const delta = end - start;
          return (t: number) =>
            `rotate(${start + delta * t} ${DISCONNECTOR_SWITCH_CENTER.x} ${DISCONNECTOR_SWITCH_CENTER.y})`;
        },
      });
    });
  }

  private isPortConnected(node: Node, portId: string): boolean {
    if (!this.graph) {
      return false;
    }
    const edges = this.graph.getConnectedEdges(node);
    return edges.some((e) => {
      return (
        (e.getSourceCellId() === node.id && e.getSourcePortId() === portId) ||
        (e.getTargetCellId() === node.id && e.getTargetPortId() === portId)
      );
    });
  }

  private setPortVisible(node: Node, portId: string, visible: boolean): void {
    node.setPortProp(
      portId,
      'attrs/circle/style/visibility',
      visible ? 'visible' : 'hidden',
      { ignoreHistory: true },
    );
  }

  private setPortColor(node: Node, portId: string, color: string): void {
    const options = { ignoreHistory: true };
    node.setPortProp(portId, 'attrs/circle/fill', color, options);
    node.setPortProp(portId, 'attrs/circle/stroke', color, options);
  }

  private withNodePort(
    cellId?: string | null,
    portId?: string | null,
    fn?: (node: Node, portId: string) => void,
  ): void {
    if (!cellId || !portId || !fn || !this.graph) {
      return;
    }
    const cell = this.graph.getCellById(cellId);
    if (cell && cell.isNode()) {
      fn(cell as Node, portId);
    }
  }

  private showNodePorts(node: Node, show: boolean): void {
    const ps = node.getPorts();
    for (let i = 0; i < ps.length; i += 1) {
      const id = ps[i].id as string;
      if (show) {
        const connected = this.isPortConnected(node, id);
        this.setPortVisible(node, id, true);
        this.setPortColor(
          node,
          id,
          connected ? COLOR_PORT_BLUE : COLOR_PORT_GRAY,
        );
      } else {
        this.setPortVisible(node, id, false);
        this.setPortColor(node, id, COLOR_PORT_GRAY);
      }
    }
  }
}
