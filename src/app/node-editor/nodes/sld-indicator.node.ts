import { Graph, Node } from '@antv/x6';

import { buildSldPorts } from './sld-ports';

export function registerSldIndicator(): void {
  Graph.registerNode(
    'sld-indicator',
    {
      inherit: 'rect',
      width: 56,
      height: 56,
      markup: [
        { tagName: 'circle', selector: 'ring' },
        { tagName: 'path', selector: 'burst' },
      ],
      attrs: {
        ring: {
          refCx: '50%',
          refCy: '50%',
          refR: '32%',
          stroke: '#1F1F1F',
          strokeWidth: 1,
          fill: '#FFFFFF',
        },
        burst: {
          d: 'M 28 6 L 28 14 M 28 42 L 28 50 M 8 28 L 16 28 M 40 28 L 48 28 M 12 12 L 17 17 M 39 39 L 44 44 M44 12 L39 17 M17 39 L12 44',
          stroke: '#1F1F1F',
          strokeWidth: 0.9,
          fill: 'none',
        },
      },
      ports: buildSldPorts('all'),
    },
    true,
  );
}

export function buildSldIndicatorMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-indicator',
    width: 56,
    height: 56,
    ports,
    data: { kind: 'indicator' },
  };
}
