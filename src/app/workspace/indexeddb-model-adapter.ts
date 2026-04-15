import type {
  Edge,
  Metadata,
  Model,
  ModelAdapter,
  ModelChanges,
  Node,
} from 'ng-diagram';

export class IndexedDbModelAdapter implements ModelAdapter {
  private callbacks: Array<(data: ModelChanges) => void> = [];
  private readonly defaultState: ModelChanges;
  private state: ModelChanges;

  constructor(
    private readonly storageKey: string = 'ng-diagram-data',
    initialData?: Partial<Model>,
    initialState?: ModelChanges,
  ) {
    this.defaultState = {
      nodes: initialData?.nodes ?? [],
      edges: initialData?.edges ?? [],
      metadata: this.normalizeMetadata(initialData?.metadata),
    };
    this.state = initialState
      ? {
          nodes: initialState.nodes ?? this.defaultState.nodes,
          edges: initialState.edges ?? this.defaultState.edges,
          metadata: this.normalizeMetadata(initialState.metadata),
        }
      : { ...this.defaultState };
  }

  getNodes(): Node[] {
    return this.state.nodes ?? [];
  }

  getEdges(): Edge[] {
    return this.state.edges ?? [];
  }

  getMetadata(): Metadata {
    return this.state.metadata ?? { viewport: { x: 0, y: 0, scale: 1 } };
  }

  updateNodes(next: Node[] | ((prev: Node[]) => Node[])): void {
    const currentNodes = this.getNodes();
    const newNodes = typeof next === 'function' ? next(currentNodes) : next;
    this.state = { ...this.state, nodes: newNodes };
    this.notifyCallbacks();
  }

  updateEdges(next: Edge[] | ((prev: Edge[]) => Edge[])): void {
    const currentEdges = this.getEdges();
    const newEdges = typeof next === 'function' ? next(currentEdges) : next;
    this.state = { ...this.state, edges: newEdges };
    this.notifyCallbacks();
  }

  updateMetadata(next: Metadata | ((prev: Metadata) => Metadata)): void {
    const currentMetadata = this.getMetadata();
    const newMetadata =
      typeof next === 'function' ? next(currentMetadata) : next;
    this.state = { ...this.state, metadata: newMetadata };
    this.notifyCallbacks();
  }

  onChange(callback: (data: ModelChanges) => void): void {
    this.callbacks.push(callback);
  }

  unregisterOnChange(callback: (data: ModelChanges) => void): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  undo(): void {
    console.log('Undo operation - implement based on your requirements');
  }

  redo(): void {
    console.log('Redo operation - implement based on your requirements');
  }

  toJSON(): string {
    return JSON.stringify(this.state);
  }

  destroy(): void {
    this.callbacks = [];
  }

  private normalizeMetadata(value: unknown): Metadata {
    const fallback = { viewport: { x: 0, y: 0, scale: 1 } };
    if (!value || typeof value !== 'object') {
      return fallback;
    }

    const maybeMetadata = value as {
      viewport?: { x?: number; y?: number; scale?: number };
    };

    const viewport = maybeMetadata.viewport;
    if (!viewport) {
      return fallback;
    }

    return {
      ...maybeMetadata,
      viewport: {
        x: typeof viewport.x === 'number' ? viewport.x : 0,
        y: typeof viewport.y === 'number' ? viewport.y : 0,
        scale: typeof viewport.scale === 'number' ? viewport.scale : 1,
      },
    } as Metadata;
  }

  private notifyCallbacks(): void {
    for (const callback of this.callbacks) {
      callback(this.state);
    }
  }
}
