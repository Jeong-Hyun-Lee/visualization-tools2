import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_METER } from './sld-ports';

export function registerSldMeter(): void {
  Graph.registerNode(
    'sld-meter',
    {
      inherit: 'rect',
      width: 128,
      height: 52,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          stroke: '#1F1F1F',
          strokeWidth: 0.8,
          fill: '#FFFFFF',
          rx: 3,
          ry: 3,
        },
        label: {
          refX: '50%',
          refY: '50%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 8,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: 'PXM6000\nMETER',
        },
      },
      ports: SLD_PORTS_METER,
    },
    true,
  );
}

export function buildSldMeterMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-meter',
    width: 128,
    height: 52,
    ports,
    data: { kind: 'meter' },
  };
}
