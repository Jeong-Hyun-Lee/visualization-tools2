import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  Injector,
  computed as ngComputed,
  computed,
  effect,
  inject,
  input,
  runInInjectionContext,
  signal,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { FormsModule } from '@angular/forms';
import type { NgDiagramConfig, NgDiagramPaletteItem, Node } from 'ng-diagram';
import {
  configureShortcuts,
  initializeModelAdapter,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramMinimapComponent,
  NgDiagramNodeService,
  NgDiagramPaletteItemComponent,
  NgDiagramPaletteItemPreviewComponent,
  NgDiagramSelectionService,
  NgDiagramService,
  NgDiagramViewportService,
  provideNgDiagram,
} from 'ng-diagram';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { AppPreferencesService } from '../app-preferences.service';
import { DiagramPagesService } from '../diagram-pages.service';
import { I18nRefreshService } from '../i18n-refresh.service';
import { IndexedDbModelAdapter } from './indexeddb-model-adapter';

type DemoNodeData = {
  label: string;
};

@Component({
  selector: 'app-workspace',
  standalone: true,
  providers: [provideNgDiagram()],
  imports: [
    FormsModule,
    NgDiagramComponent,
    NgDiagramBackgroundComponent,
    NgDiagramMinimapComponent,
    NgDiagramPaletteItemComponent,
    NgDiagramPaletteItemPreviewComponent,
    CardModule,
    ButtonModule,
    ToolbarModule,
    InputTextModule,
    SelectModule,
    TagModule,
    DividerModule,
    TooltipModule,
    TranslateModule,
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
  readonly storageKey = input('ng-diagram-custom-demo');
  readonly interactionMode = signal<'select' | 'pan'>('select');
  readonly canUndo = signal(false);
  readonly canRedo = signal(false);
  private diagramService = inject(NgDiagramService);
  private nodeService = inject(NgDiagramNodeService);
  private viewportService = inject(NgDiagramViewportService);
  private selectionService = inject(NgDiagramSelectionService);
  private diagramPages = inject(DiagramPagesService);
  private preferences = inject(AppPreferencesService);
  private translate = inject(TranslateService);
  private i18nRefresh = inject(I18nRefreshService);
  private readonly document = inject(DOCUMENT);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  private spacePanningActive = signal(false);
  private currentAdapter: IndexedDbModelAdapter | null = null;
  readonly canZoomIn = this.viewportService.canZoomIn;
  readonly canZoomOut = this.viewportService.canZoomOut;
  readonly zoomPercent = computed(() => {
    const scale = this.viewportService.scale();
    const percent = Math.round(scale * 100);
    return Number.isFinite(percent) ? percent : 100;
  });
  readonly zoomOptions = [
    { label: '25%', value: 25 },
    { label: '50%', value: 50 },
    { label: '75%', value: 75 },
    { label: '100%', value: 100 },
    { label: '125%', value: 125 },
    { label: '150%', value: 150 },
    { label: '200%', value: 200 },
    { label: '300%', value: 300 },
  ];
  readonly isPanActive = computed(
    () => this.spacePanningActive() || this.interactionMode() === 'pan',
  );

  private readonly defaultNodeSize = { width: 160, height: 100 };

  readonly canAlignSelection = computed(
    () => this.selectionService.selection().nodes.length >= 2,
  );

  readonly selectedNode = computed(
    () => this.selectionService.selection().nodes[0] ?? null,
  );
  readonly selectedNodeLabel = computed(() => {
    this.i18nRefresh.revision();
    this.preferences.languageState();
    const data = this.selectedNode()?.data as DemoNodeData | undefined;
    return data?.label ?? this.translate.instant('workspace.unknownNode');
  });
  readonly selectedNodeId = computed(() => this.selectedNode()?.id ?? '-');

  readonly paletteModel = ngComputed<NgDiagramPaletteItem[]>(() => {
    this.i18nRefresh.revision();
    this.preferences.languageState();
    const t = (key: string) => this.translate.instant(key);
    return [
      {
        data: {
          label: t('workspace.paletteProcess'),
          icon: 'pi pi-square',
          key: 'process',
        },
        resizable: true,
        rotatable: true,
      },
      {
        data: {
          label: t('workspace.paletteDecision'),
          icon: 'pi pi-share-alt',
          key: 'decision',
        },
        resizable: true,
        rotatable: true,
      },
      {
        data: {
          label: t('workspace.paletteStartEnd'),
          icon: 'pi pi-circle',
          key: 'startEnd',
        },
        resizable: true,
        rotatable: false,
      },
      {
        data: {
          label: t('workspace.paletteData'),
          icon: 'pi pi-database',
          key: 'data',
        },
        resizable: true,
        rotatable: true,
      },
    ];
  });

  readonly typeOptions = ngComputed(() => {
    this.i18nRefresh.revision();
    this.preferences.languageState();
    return [
      {
        label: this.translate.instant('workspace.paletteProcess'),
        value: 'process',
      },
    ];
  });
  mockType = 'process';

  /** 팔레트 행 아이콘 (PrimeIcons) */
  paletteIconClass(icon?: string): string {
    return icon ?? 'pi pi-square';
  }

  paletteTrackBy(item: NgDiagramPaletteItem, index: number): string | number {
    const data = item.data as { key?: string } | undefined;
    return data?.key ?? index;
  }

  paletteItemIcon(item: NgDiagramPaletteItem): string {
    const data = item.data as { icon?: string } | undefined;
    return this.paletteIconClass(data?.icon);
  }

  config: NgDiagramConfig = {
    shortcuts: configureShortcuts([
      {
        actionName: 'undo',
        bindings: [{ key: 'z', modifiers: { primary: true } }],
      },
      {
        actionName: 'redo',
        bindings: [
          { key: 'y', modifiers: { primary: true } },
          { key: 'z', modifiers: { primary: true, shift: true } },
        ],
      },
    ]),
    zoom: {
      zoomToFit: {
        onInit: true,
        padding: [28, 320, 28, 280],
      },
    },
    viewportPanningEnabled: false,
    nodeDraggingEnabled: true,
  };

  model = this.createModel('ng-diagram-custom-demo');

  constructor() {
    const shortcutHandler = (event: KeyboardEvent): void => {
      if (!this.isActiveTabWorkspace()) {
        return;
      }
      if (event.repeat || this.isEditableTarget(event.target)) {
        return;
      }

      const isPrimary = event.ctrlKey || event.metaKey;
      if (!isPrimary || event.altKey) {
        return;
      }

      const key = event.key?.toLowerCase();
      const code = event.code;
      const isUndo = !event.shiftKey && (key === 'z' || code === 'KeyZ');
      const isRedo =
        (!event.shiftKey && (key === 'y' || code === 'KeyY')) ||
        (event.shiftKey && (key === 'z' || code === 'KeyZ'));

      if (!isUndo && !isRedo) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      if (isUndo) {
        this.onUndo();
      } else if (isRedo) {
        this.onRedo();
      }
    };

    this.document.addEventListener('keydown', shortcutHandler, true);
    this.destroyRef.onDestroy(() =>
      this.document.removeEventListener('keydown', shortcutHandler, true),
    );

    effect(() => {
      const key = this.storageKey();
      this.model = this.createModel(key);
      queueMicrotask(() => this.viewportService.zoomToFit());
    });
  }

  setInteractionMode(mode: 'select' | 'pan'): void {
    if (this.interactionMode() === mode) {
      return;
    }
    this.interactionMode.set(mode);
    this.applyInteractionMode();
  }

  private createModel(storageKey?: string) {
    const resolvedStorageKey = storageKey ?? 'ng-diagram-custom-demo';
    const initialState = this.diagramPages.getPageGraph(resolvedStorageKey);
    const adapter = new IndexedDbModelAdapter(
      resolvedStorageKey,
      undefined,
      initialState,
    );
    this.currentAdapter = adapter;
    this.syncUndoRedoState();
    adapter.onChange((data) => {
      this.diagramPages.setPageGraph(resolvedStorageKey, data);
      this.syncUndoRedoState();
    });

    return runInInjectionContext(this.injector, () =>
      initializeModelAdapter(adapter),
    );
  }

  onUndo(): void {
    if (!this.isActiveTabWorkspace()) {
      return;
    }
    this.diagramService.transaction(() => {
      this.currentAdapter?.undo();
    });
    queueMicrotask(() => this.syncUndoRedoState());
  }

  onRedo(): void {
    if (!this.isActiveTabWorkspace()) {
      return;
    }
    this.diagramService.transaction(() => {
      this.currentAdapter?.redo();
    });
    queueMicrotask(() => this.syncUndoRedoState());
  }

  onZoomIn(): void {
    if (!this.isActiveTabWorkspace() || !this.canZoomIn()) {
      return;
    }
    this.viewportService.zoom(1.1);
  }

  onZoomOut(): void {
    if (!this.isActiveTabWorkspace() || !this.canZoomOut()) {
      return;
    }
    this.viewportService.zoom(1 / 1.1);
  }

  onZoomPercentChange(value: number | string | null | undefined): void {
    if (!this.isActiveTabWorkspace()) {
      return;
    }
    const nextPercent = Number(value);
    if (!Number.isFinite(nextPercent) || nextPercent <= 0) {
      return;
    }
    const currentScale = this.viewportService.scale();
    if (!Number.isFinite(currentScale) || currentScale <= 0) {
      return;
    }
    const targetScale = Math.min(
      this.viewportService.maxZoom,
      Math.max(this.viewportService.minZoom, nextPercent / 100),
    );
    const factor = targetScale / currentScale;
    if (!Number.isFinite(factor) || factor === 1) {
      return;
    }
    this.viewportService.zoom(factor);
  }

  /** 세로 기준선(선택 노드 가로 중심의 평균)에 맞춤 */
  onAlignVertical(): void {
    if (!this.isActiveTabWorkspace() || !this.canAlignSelection()) {
      return;
    }
    const selected = this.selectionService.selection().nodes;
    if (selected.length < 2) {
      return;
    }
    const metrics = selected.map((node) => {
      const { w } = this.getNodeSize(node);
      return { id: node.id, cx: node.position.x + w / 2 };
    });
    const avgX = metrics.reduce((s, m) => s + m.cx, 0) / metrics.length;
    const idSet = new Set(metrics.map((m) => m.id));

    this.runAlignUpdate(idSet, (n) => {
      const { w } = this.getNodeSize(n);
      return { x: avgX - w / 2, y: n.position.y };
    });
  }

  /** 가로 기준선(선택 노드 세로 중심의 평균)에 맞춤 */
  onAlignHorizontal(): void {
    if (!this.isActiveTabWorkspace() || !this.canAlignSelection()) {
      return;
    }
    const selected = this.selectionService.selection().nodes;
    if (selected.length < 2) {
      return;
    }
    const metrics = selected.map((node) => {
      const { h } = this.getNodeSize(node);
      return { id: node.id, cy: node.position.y + h / 2 };
    });
    const avgY = metrics.reduce((s, m) => s + m.cy, 0) / metrics.length;
    const idSet = new Set(metrics.map((m) => m.id));

    this.runAlignUpdate(idSet, (n) => {
      const { h } = this.getNodeSize(n);
      return { x: n.position.x, y: avgY - h / 2 };
    });
  }

  /**
   * ModelAdapter.updateNodes()만 쓰면 flowCore 엣지 재계산이 안 도는 경우가 있어,
   * 드래그와 동일하게 `moveNodesBy`(→ applyUpdate `moveNodesBy`)로 이동한다.
   */
  private runAlignUpdate(
    movedIds: Set<string>,
    buildTargetPosition: (n: Node) => { x: number; y: number },
  ): void {
    const selected = this.selectionService.selection().nodes.filter((n) =>
      movedIds.has(n.id),
    );
    const moves = selected
      .map((n) => {
        const p = buildTargetPosition(n);
        const delta = {
          x: p.x - n.position.x,
          y: p.y - n.position.y,
        };
        if (delta.x === 0 && delta.y === 0) {
          return null;
        }
        return { node: n, delta };
      })
      .filter(
        (m): m is { node: Node; delta: { x: number; y: number } } =>
          m !== null,
      );

    if (moves.length === 0) {
      return;
    }

    void this.diagramService
      .transaction(async () => {
        for (const { node, delta } of moves) {
          await this.nodeService.moveNodesBy([node], delta);
        }
      })
      .catch((err) => {
        console.error('Align update failed', err);
      });
  }

  private getNodeSize(node: Node): { w: number; h: number } {
    const w = node.size?.width ?? this.defaultNodeSize.width;
    const h = node.size?.height ?? this.defaultNodeSize.height;
    return { w, h };
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
    if (!this.isActiveTabWorkspace()) {
      return;
    }
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }
    if (event.repeat || this.spacePanningActive()) {
      return;
    }
    event.preventDefault();
    this.toggleSpacePanning(true);
  }

  @HostListener('window:keyup', ['$event'])
  onWindowKeyup(event: KeyboardEvent): void {
    if (!this.isActiveTabWorkspace()) {
      return;
    }
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.toggleSpacePanning(false);
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
    if (!this.isActiveTabWorkspace()) {
      return;
    }
    this.toggleSpacePanning(false);
  }

  private toggleSpacePanning(active: boolean): void {
    if (this.spacePanningActive() === active) {
      return;
    }
    this.spacePanningActive.set(active);
    this.applyInteractionMode();
  }

  private applyInteractionMode(): void {
    const panActive = this.isPanActive();
    this.diagramService.updateConfig({
      viewportPanningEnabled: panActive,
      nodeDraggingEnabled: !panActive,
    });
  }

  private syncUndoRedoState(): void {
    this.canUndo.set(this.currentAdapter?.canUndo() ?? false);
    this.canRedo.set(this.currentAdapter?.canRedo() ?? false);
  }

  private isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
      return false;
    }
    const tag = target.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') {
      return true;
    }
    return target.isContentEditable;
  }

  private isActiveTabWorkspace(): boolean {
    return this.diagramPages.activePage()?.storageKey === this.storageKey();
  }
}
