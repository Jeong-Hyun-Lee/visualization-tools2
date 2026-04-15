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
import type { Model, NgDiagramConfig, Node, NgDiagramPaletteItem } from 'ng-diagram';
import {
  initializeModelAdapter,
  NgDiagramBackgroundComponent,
  NgDiagramComponent,
  NgDiagramModelService,
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
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToolbarModule } from 'primeng/toolbar';

import { DiagramPagesService } from '../diagram-pages.service';
import { LocalStorageModelAdapter } from './local-storage-model-adapter';

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
    ScrollPanelModule,
  ],
  templateUrl: './workspace.component.html',
  styleUrl: './workspace.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceComponent {
  readonly interactionMode = signal<'select' | 'pan'>('select');
  private modelService = inject(NgDiagramModelService);
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

  async addNode() {
    const existingNodes = this.modelService.nodes();
    const newId = this.generateId();
    const randomX = Math.floor(Math.random() * 540) + 120;
    const randomY = Math.floor(Math.random() * 360) + 70;

    const newNode: Node = {
      id: newId,
      position: { x: randomX, y: randomY },
      data: { label: `Node ${existingNodes.length + 1}` },
      resizable: true,
      rotatable: true,
    };

    await this.diagramService.transaction(
      () => {
        this.modelService.addNodes([newNode]);
      },
      { waitForMeasurements: true },
    );
    this.viewportService.zoomToFit();
  }

  reset() {
    if (window.confirm('Are you sure you want to reset the diagram?')) {
      this.resetDiagramToDefault();
    }
  }

  setInteractionMode(mode: 'select' | 'pan'): void {
    if (this.interactionMode() === mode) {
      return;
    }
    this.interactionMode.set(mode);
    this.applyInteractionMode();
  }

  private async resetDiagramToDefault() {
    const nodeIds = this.modelService.nodes().map((node) => node.id);
    const edgeIds = this.modelService.edges().map((edge) => edge.id);
    const defaultModel = this.getDefaultModel();

    await this.diagramService.transaction(
      () => {
        this.modelService.deleteNodes(nodeIds);
        this.modelService.deleteEdges(edgeIds);

        this.modelService.addNodes(defaultModel.nodes);
        this.modelService.addEdges(defaultModel.edges);
      },
      { waitForMeasurements: true },
    );
    this.viewportService.zoomToFit();
  }

  private generateId(): string {
    return crypto.randomUUID();
  }

  private createModel(storageKey?: string) {
    return initializeModelAdapter(
      new LocalStorageModelAdapter(
        storageKey ?? 'ng-diagram-custom-demo',
        this.getDefaultModel(),
      ),
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
