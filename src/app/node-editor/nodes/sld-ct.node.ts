import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_CT } from './sld-ports';

export function registerSldCt(): void {
  Graph.registerNode(
    'sld-ct',
    {
      inherit: 'rect',
      width: 84,
      height: 42,
      markup: [
        { tagName: 'rect', selector: 'bus' },
        { tagName: 'circle', selector: 'c1' },
        { tagName: 'circle', selector: 'c2' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        bus: {
          refX: '0%',
          refY: `${(20 / 42) * 100}%`,
          refWidth: '100%',
          refHeight: `${(2 / 42) * 100}%`,
          fill: '#1F1F1F',
        },
        c1: {
          refCx: '36%',
          refCy: '50%',
          refR: '24%',
          stroke: '#1F1F1F',
          strokeWidth: 1,
          fill: '#FFFFFF',
        },
        c2: {
          refCx: '64%',
          refCy: '50%',
          refR: '24%',
          stroke: '#1F1F1F',
          strokeWidth: 1,
          fill: '#FFFFFF',
        },
        label: {
          refX: '50%',
          refY: '10%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 8,
          fontWeight: 600,
          fill: '#374151',
          text: '500:5',
        },
      },
      ports: SLD_PORTS_CT,
    },
    true,
  );
}

export function buildSldCtMeta(ports: Node.Metadata['ports']): Node.Metadata {
  return {
    shape: 'sld-ct',
    width: 84,
    height: 42,
    ports,
    data: { kind: 'ct' },
  };
}
