import {
  ChangeDetectionStrategy,
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Model, NgDiagramConfig, NgDiagramPaletteItem } from 'ng-diagram';
import {
  initializeModelAdapter,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramPaletteItemComponent,
  NgDiagramPaletteItemPreviewComponent,
  NgDiagramSelectionService,
  NgDiagramService,
  NgDiagramViewportService,
} from 'ng-diagram';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';

import { DiagramPagesService } from '../diagram-pages.service';
import { IndexedDbModelAdapter } from './indexeddb-model-adapter';

type DemoNodeData = {
  label: string;
};

@Component({
  selector: 'app-workspace',
  standalone: true,
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
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
  readonly interactionMode = signal<'select' | 'pan'>('select');
  private diagramService = inject(NgDiagramService);
  private viewportService = inject(NgDiagramViewportService);
  private selectionService = inject(NgDiagramSelectionService);
  private diagramPages = inject(DiagramPagesService);
  private spacePanningActive = signal(false);
  readonly isPanActive = computed(
    () => this.spacePanningActive() || this.interactionMode() === 'pan',
  );

  readonly selectedNode = computed(
    () => this.selectionService.selection().nodes[0] ?? null,
  );
  readonly selectedNodeLabel = computed(() => {
    const data = this.selectedNode()?.data as DemoNodeData | undefined;
    return data?.label ?? 'Unknown Node';
  });
  readonly selectedNodeId = computed(() => this.selectedNode()?.id ?? '-');

  readonly paletteModel: NgDiagramPaletteItem[] = [
    { data: { label: 'Process' }, resizable: true, rotatable: true },
    { data: { label: 'Decision' }, resizable: true, rotatable: true },
    { data: { label: 'Start / End' }, resizable: true, rotatable: false },
    { data: { label: 'Data' }, resizable: true, rotatable: true },
  ];

  readonly typeOptions = [{ label: 'Process', value: 'process' }];
  mockType = 'process';

  /** 팔레트 행 아이콘 (PrimeIcons) */
  paletteIconClass(label: string): string {
    const key = label.trim().toLowerCase();
    if (key.includes('decision')) {
      return 'pi pi-share-alt';
    }
    if (key.includes('start') || key.includes('end')) {
      return 'pi pi-circle';
    }
    if (key.includes('data')) {
      return 'pi pi-database';
    }
    return 'pi pi-square';
  }

  config: NgDiagramConfig = {
    zoom: {
      zoomToFit: {
        onInit: true,
        padding: [28, 320, 28, 280],
      },
    },
    viewportPanningEnabled: false,
    nodeDraggingEnabled: true,
  };

  model = this.createModel(this.diagramPages.activePage()?.storageKey);

  constructor() {
    effect(() => {
      const activePage = this.diagramPages.activePage();
      if (!activePage) {
        return;
      }
      this.model = this.createModel(activePage.storageKey);
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

  private generateId(): string {
    return crypto.randomUUID();
  }

  private createModel(storageKey?: string) {
    const resolvedStorageKey = storageKey ?? 'ng-diagram-custom-demo';
    const initialState = this.diagramPages.getPageGraph(resolvedStorageKey);
    const adapter = new IndexedDbModelAdapter(
      resolvedStorageKey,
      this.getDefaultModel(),
      initialState,
    );
    adapter.onChange((data) => {
      this.diagramPages.setPageGraph(resolvedStorageKey, data);
    });

    return initializeModelAdapter(
      adapter,
    );
  }

  @HostListener('window:keydown', ['$event'])
  onWindowKeydown(event: KeyboardEvent): void {
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
    if (event.code !== 'Space' && event.key !== ' ') {
      return;
    }
    event.preventDefault();
    this.toggleSpacePanning(false);
  }

  @HostListener('window:blur')
  onWindowBlur(): void {
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

  private getDefaultModel(): Model {
    const nodeId1 = this.generateId();
    const nodeId2 = this.generateId();

    return {
      nodes: [
        {
          id: nodeId1,
          position: { x: 120, y: 120 },
          data: { label: 'Node 1' },
          resizable: true,
          rotatable: true,
        },
        {
          id: nodeId2,
          position: { x: 580, y: 120 },
          data: { label: 'Node 2' },
          resizable: true,
          rotatable: true,
        },
      ],
      edges: [
        {
          id: this.generateId(),
          source: nodeId1,
          target: nodeId2,
          sourcePort: 'port-right',
          targetPort: 'port-left',
          data: {},
        },
      ],
      metadata: {},
    };
  }
}
