import { Component, computed, inject, input } from '@angular/core';
import {
  NgDiagramModelService,
  NgDiagramNodeSelectedDirective,
  NgDiagramPortComponent,
  type Node,
} from 'ng-diagram';

@Component({
  selector: 'app-sld-diagram-node',
  standalone: true,
  imports: [NgDiagramPortComponent, NgDiagramNodeSelectedDirective],
  template: `
    <div
      class="sld-node"
      [class.sld-node--group]="isGroup"
      [class.sld-node--disconnector-open]="isDisconnectorOpen()"
      ngDiagramNodeSelected
      [node]="node()"
      (dblclick)="onNodeDblClick()"
    >
      <div class="sld-node__glyph" [attr.data-kind]="kind()">{{ glyph }}</div>
      <div class="sld-node__label">{{ label }}</div>
      <ng-diagram-port id="left" side="left" type="both"></ng-diagram-port>
      <ng-diagram-port id="right" side="right" type="both"></ng-diagram-port>
      <ng-diagram-port id="top" side="top" type="both"></ng-diagram-port>
      <ng-diagram-port id="bottom" side="bottom" type="both"></ng-diagram-port>
    </div>
  `,
  styles: `
    .sld-node {
      width: 100%;
      height: 100%;
      border: 1px solid #94a3b8;
      border-radius: 8px;
      background: #ffffff;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: flex-start;
      position: relative;
      box-sizing: border-box;
      padding: 0 10px;
      color: #1e293b;
      font-size: 12px;
      font-weight: 600;
    }

    .sld-node--group {
      border-style: dashed;
      background: rgba(219, 234, 254, 0.35);
    }

    .sld-node.ng-diagram-node-selected {
      border-color: #3f51b5;
      box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.2);
    }

    .sld-node__glyph {
      flex: 0 0 auto;
      width: 20px;
      height: 20px;
      border-radius: 6px;
      border: 1px solid #cbd5e1;
      background: #f8fafc;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      line-height: 1;
      font-weight: 700;
      color: #334155;
    }

    .sld-node__label {
      flex: 1 1 auto;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }

    .sld-node__glyph[data-kind='sld-bus'],
    .sld-node__glyph[data-kind='sld-bus-v'] {
      background: #e0e7ff;
      border-color: #818cf8;
      color: #3730a3;
    }

    .sld-node__glyph[data-kind='sld-breaker'],
    .sld-node__glyph[data-kind='sld-disconnector'] {
      background: #fef3c7;
      border-color: #f59e0b;
      color: #92400e;
    }

    .sld-node__glyph[data-kind='sld-transformer'],
    .sld-node__glyph[data-kind='sld-generator'] {
      background: #dcfce7;
      border-color: #22c55e;
      color: #166534;
    }

    .sld-node__glyph[data-kind='sld-load'],
    .sld-node__glyph[data-kind='sld-meter'] {
      background: #ede9fe;
      border-color: #8b5cf6;
      color: #5b21b6;
    }

    .sld-node--disconnector-open .sld-node__glyph {
      background: #fee2e2;
      border-color: #ef4444;
      color: #b91c1c;
    }
  `,
})
export class SldDiagramNodeComponent {
  readonly node = input.required<Node>();
  private readonly modelService = inject(NgDiagramModelService);

  readonly kind = computed(() => {
    const n = this.node();
    const data = (n.data ?? {}) as Record<string, unknown>;
    return String(data['kind'] ?? n.type ?? 'node');
  });

  readonly isDisconnectorOpen = computed(() => {
    if (this.kind() !== 'sld-disconnector') {
      return false;
    }
    const data = (this.node().data ?? {}) as Record<string, unknown>;
    return data['open'] === true;
  });

  get label(): string {
    const n = this.node();
    const data = (n.data ?? {}) as Record<string, unknown>;
    const candidate = data['label'] ?? data['kind'] ?? n.type ?? n.id;
    return String(candidate);
  }

  get isGroup(): boolean {
    return (this.node() as { isGroup?: boolean }).isGroup === true;
  }

  get glyph(): string {
    switch (this.kind()) {
      case 'sld-bus':
        return 'BUS';
      case 'sld-bus-v':
        return 'V';
      case 'sld-breaker':
        return 'BRK';
      case 'sld-disconnector':
        return this.isDisconnectorOpen() ? 'OPEN' : 'CLOSE';
      case 'sld-transformer':
        return 'TR';
      case 'sld-generator':
        return 'GEN';
      case 'sld-load':
        return 'LOAD';
      case 'sld-ground':
        return 'GND';
      case 'sld-relay':
        return 'REL';
      case 'sld-fuse':
        return 'FUSE';
      case 'sld-ct':
        return 'CT';
      case 'sld-ts':
        return 'TS';
      case 'sld-sb':
        return 'SB';
      case 'sld-indicator':
        return 'IND';
      case 'sld-terminal':
        return 'TERM';
      case 'sld-meter':
        return 'MTR';
      case 'sld-pothead':
        return 'POT';
      case 'sld-equipment-region':
        return 'REG';
      default:
        return 'N';
    }
  }

  onNodeDblClick(): void {
    if (this.kind() !== 'sld-disconnector') {
      return;
    }
    const n = this.node();
    const data = { ...(n.data as Record<string, unknown>), open: !this.isDisconnectorOpen() };
    this.modelService.updateNodeData(n.id, data);
  }
}
