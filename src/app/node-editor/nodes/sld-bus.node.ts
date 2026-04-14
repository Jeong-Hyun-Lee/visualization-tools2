import { Graph, Node } from '@antv/x6';

import { buildSldPorts } from './sld-ports';

export function registerSldBus(): void {
  Graph.registerNode(
    'sld-bus',
    {
      inherit: 'rect',
      width: 140,
      height: 56,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'rect', selector: 'bar' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          stroke: 'transparent',
          strokeWidth: 0,
          fill: 'transparent',
          rx: 10,
          ry: 10,
        },
        bar: {
          refX: '0%',
          refY: `${(24 / 56) * 100}%`,
          refWidth: '100%',
          refHeight: `${(6 / 56) * 100}%`,
          rx: 2,
          fill: '#1F1F1F',
        },
        label: {
          refX: '50%',
          refY: `${(13 / 56) * 100}%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 11,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: 'MAIN BUS',
        },
      },
      ports: buildSldPorts('horizontal'),
    },
    true,
  );
}

export function buildSldBusMeta(ports: Node.Metadata['ports']): Node.Metadata {
  return {
    shape: 'sld-bus',
    width: 140,
    height: 56,
    ports,
    data: { kind: 'bus' },
  };
}
