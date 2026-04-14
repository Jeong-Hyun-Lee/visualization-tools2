import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_TERMINAL } from './sld-ports';

export function registerSldTerminal(): void {
  Graph.registerNode(
    'sld-terminal',
    {
      inherit: 'rect',
      width: 52,
      height: 58,
      markup: [{ tagName: 'polygon', selector: 'tip' }],
      attrs: {
        tip: {
          refPoints: '26,6 8,50 44,50',
          stroke: '#1F1F1F',
          strokeWidth: 1,
          fill: '#FFFFFF',
        },
      },
      ports: SLD_PORTS_TERMINAL,
    },
    true,
  );
}

export function buildSldTerminalMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-terminal',
    width: 52,
    height: 58,
    ports,
    data: { kind: 'terminal' },
  };
}
