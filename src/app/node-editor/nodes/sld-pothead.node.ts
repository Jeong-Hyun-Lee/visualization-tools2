import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_POTHEAD } from './sld-ports';

export function registerSldPothead(): void {
  Graph.registerNode(
    'sld-pothead',
    {
      inherit: 'rect',
      width: 52,
      height: 58,
      markup: [
        { tagName: 'circle', selector: 'head' },
        { tagName: 'rect', selector: 'stem' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        head: {
          refCx: '50%',
          refCy: `${(16 / 58) * 100}%`,
          refR: `${(10 / 58) * 100}%`,
          stroke: '#1F1F1F',
          strokeWidth: 1,
          fill: '#FFFFFF',
        },
        stem: {
          refX: '48.5%',
          refY: `${(26 / 58) * 100}%`,
          refWidth: '3%',
          refHeight: `${(20 / 58) * 100}%`,
          fill: '#1F1F1F',
        },
        label: {
          refX: '50%',
          refY: `${(47 / 58) * 100}%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'top',
          fontSize: 7,
          fontWeight: 600,
          fill: '#374151',
          text: '(3) POT',
        },
      },
      ports: SLD_PORTS_POTHEAD,
    },
    true,
  );
}

export function buildSldPotheadMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-pothead',
    width: 52,
    height: 58,
    ports,
    data: { kind: 'pothead' },
  };
}
