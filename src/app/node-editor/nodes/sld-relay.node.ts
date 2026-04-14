import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_RELAY } from './sld-ports';

export function registerSldRelay(): void {
  Graph.registerNode(
    'sld-relay',
    {
      inherit: 'rect',
      width: 54,
      height: 54,
      markup: [
        { tagName: 'circle', selector: 'body' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        body: {
          refCx: '50%',
          refCy: '55%',
          refR: '42%',
          stroke: '#1F1F1F',
          strokeWidth: 1,
          fill: '#FFFFFF',
        },
        label: {
          refX: '50%',
          refY: '56%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 11,
          fontWeight: 800,
          fill: '#1F1F1F',
          text: '87',
        },
      },
      ports: SLD_PORTS_RELAY,
    },
    true,
  );
}

export function buildSldRelayMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-relay',
    width: 54,
    height: 54,
    ports,
    data: { kind: 'relay' },
  };
}
