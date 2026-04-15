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
  private readonly undoStack: ModelChanges[] = [];
  private readonly redoStack: ModelChanges[] = [];
  private readonly maxHistory = 100;

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
    return this.cloneData(this.state.nodes ?? []);
  }

  getEdges(): Edge[] {
    return this.cloneData(this.state.edges ?? []);
  }

  getMetadata(): Metadata {
    return this.cloneData(
      this.state.metadata ?? { viewport: { x: 0, y: 0, scale: 1 } },
    );
  }

  updateNodes(next: Node[] | ((prev: Node[]) => Node[])): void {
    const currentNodes = this.getNodes();
    const newNodes = typeof next === 'function' ? next(currentNodes) : next;
    this.commit({
      ...this.state,
      nodes: this.cloneData(newNodes),
    });
  }

  updateEdges(next: Edge[] | ((prev: Edge[]) => Edge[])): void {
    const currentEdges = this.getEdges();
    const newEdges = typeof next === 'function' ? next(currentEdges) : next;
    this.commit({
      ...this.state,
      edges: this.cloneData(newEdges),
    });
  }

  updateMetadata(next: Metadata | ((prev: Metadata) => Metadata)): void {
    const currentMetadata = this.getMetadata();
    const newMetadata =
      typeof next === 'function' ? next(currentMetadata) : next;
    this.commit({
      ...this.state,
      metadata: this.normalizeMetadata(this.cloneData(newMetadata)),
    });
  }

  onChange(callback: (data: ModelChanges) => void): void {
    this.callbacks.push(callback);
  }

  unregisterOnChange(callback: (data: ModelChanges) => void): void {
    this.callbacks = this.callbacks.filter((cb) => cb !== callback);
  }

  undo(): void {
    const currentKey = this.stateKey(this.state);
    let previous = this.undoStack.pop();

    while (previous && this.stateKey(previous) === currentKey) {
      previous = this.undoStack.pop();
    }

    if (!previous) {
      return;
    }

    this.redoStack.push(this.snapshotState(this.state));
    this.state = this.snapshotState(previous);
    this.notifyCallbacks();
  }

  redo(): void {
    const currentKey = this.stateKey(this.state);
    let next = this.redoStack.pop();

    while (next && this.stateKey(next) === currentKey) {
      next = this.redoStack.pop();
    }

    if (!next) {
      return;
    }

    this.undoStack.push(this.snapshotState(this.state));
    this.state = this.snapshotState(next);
    this.notifyCallbacks();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  toJSON(): string {
    return JSON.stringify(this.state);
  }

  destroy(): void {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
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
    const snapshot = this.snapshotState(this.state);
    for (const callback of this.callbacks) {
      callback(snapshot);
    }
  }

  private commit(next: ModelChanges): void {
    const nextSnapshot = this.snapshotState(next);
    if (this.stateKey(nextSnapshot) === this.stateKey(this.state)) {
      // ng-diagram은 일부 제스처(예: 링크 드래그 임시 edge)에서
      // 모델 내용이 같아도 onChange를 렌더 트리거로 사용한다.
      // 따라서 히스토리는 쌓지 않되 콜백은 반드시 통지한다.
      this.state = nextSnapshot;
      this.notifyCallbacks();
      return;
    }

    this.undoStack.push(this.snapshotState(this.state));
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
    this.state = nextSnapshot;
    this.notifyCallbacks();
  }

  private snapshotState(source: ModelChanges): ModelChanges {
    return {
      nodes: this.cloneData(source.nodes ?? []),
      edges: this.cloneData(source.edges ?? []),
      metadata: this.normalizeMetadata(this.cloneData(source.metadata)),
    };
  }

  private cloneData<T>(value: T): T {
    if (typeof structuredClone === 'function') {
      return structuredClone(value);
    }
    return JSON.parse(JSON.stringify(value)) as T;
  }

  private stateKey(state: ModelChanges): string {
    return JSON.stringify({
      nodes: state.nodes ?? [],
      edges: state.edges ?? [],
    });
  }
}
