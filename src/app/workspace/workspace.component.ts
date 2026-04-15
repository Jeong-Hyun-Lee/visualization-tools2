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
import type { NgDiagramConfig, NgDiagramPaletteItem } from 'ng-diagram';
import {
  configureShortcuts,
  initializeModelAdapter,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
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
  readonly isPanActive = computed(
    () => this.spacePanningActive() || this.interactionMode() === 'pan',
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
