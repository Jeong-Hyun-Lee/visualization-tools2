import type {
  Edge,
  Metadata,
  Model,
  ModelAdapter,
  ModelChanges,
  Node,
} from 'ng-diagram';

export class LocalStorageModelAdapter implements ModelAdapter {
  private callbacks: Array<(data: ModelChanges) => void> = [];
  constructor(
    private readonly storageKey: string = 'ng-diagram-data',
    initialData?: Partial<Model>,
  ) {
    if (!localStorage.getItem(this.storageKey)) {
      const defaultData = {
        nodes: initialData?.nodes || [],
        edges: initialData?.edges || [],
        metadata: initialData?.metadata || {
          viewport: { x: 0, y: 0, scale: 1 },
        },
      };
      localStorage.setItem(this.storageKey, JSON.stringify(defaultData));
    }
  }

  getNodes(): Node[] {
    const data = this.getStorageData();
    return data.nodes || [];
  }

  getEdges(): Edge[] {
    const data = this.getStorageData();
    return data.edges || [];
  }

  getMetadata(): Metadata {
    const data = this.getStorageData();
    return data.metadata || { viewport: { x: 0, y: 0, scale: 1 } };
  }

  updateNodes(next: Node[] | ((prev: Node[]) => Node[])): void {
    const currentNodes = this.getNodes();
    const newNodes = typeof next === 'function' ? next(currentNodes) : next;
    this.updateStorageData({ nodes: newNodes });
    this.notifyCallbacks();
  }

  updateEdges(next: Edge[] | ((prev: Edge[]) => Edge[])): void {
    const currentEdges = this.getEdges();
    const newEdges = typeof next === 'function' ? next(currentEdges) : next;
    this.updateStorageData({ edges: newEdges });
    this.notifyCallbacks();
  }

  updateMetadata(next: Metadata | ((prev: Metadata) => Metadata)): void {
    const currentMetadata = this.getMetadata();
    const newMetadata =
      typeof next === 'function' ? next(currentMetadata) : next;
    this.updateStorageData({ metadata: newMetadata });
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
    return JSON.stringify(this.getStorageData());
  }

  destroy(): void {
    this.callbacks = [];
  }

  private getStorageData(): ModelChanges {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored
        ? JSON.parse(stored)
        : {
            nodes: [],
            edges: [],
            metadata: { viewport: { x: 0, y: 0, scale: 1 } },
          };
    } catch (error) {
      console.warn('Failed to read from localStorage:', error);
      return {
        nodes: [],
        edges: [],
        metadata: { viewport: { x: 0, y: 0, scale: 1 } },
      };
    }
  }

  private updateStorageData(updates: Partial<ModelChanges>): void {
    try {
      const currentData = this.getStorageData();
      const newData = { ...currentData, ...updates };
      localStorage.setItem(this.storageKey, JSON.stringify(newData));
    } catch (error) {
      console.warn('Failed to save to localStorage:', error);
    }
  }

  private notifyCallbacks(): void {
    const data = this.getStorageData();

    for (const callback of this.callbacks) {
      callback(data);
    }
  }
}
