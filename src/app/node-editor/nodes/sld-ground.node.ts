import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_GROUND } from './sld-ports';

export function registerSldGround(): void {
  Graph.registerNode(
    'sld-ground',
    {
      inherit: 'rect',
      width: 56,
      height: 56,
      markup: [
        { tagName: 'rect', selector: 'vline' },
        { tagName: 'rect', selector: 'g1' },
        { tagName: 'rect', selector: 'g2' },
        { tagName: 'rect', selector: 'g3' },
      ],
      attrs: {
        vline: {
          refX: `${(58 / 56) * 100 - 56}%`,
          refY: `${(10 / 56) * 100}%`,
          refWidth: `${(3 / 56) * 100}%`,
          refHeight: `${(18 / 56) * 100}%`,
          fill: '#1F1F1F',
        },
        g1: {
          refX: `${(42 / 56) * 100 - 56}%`,
          refY: `${(30 / 56) * 100}%`,
          refWidth: `${(35 / 56) * 100}%`,
          refHeight: `${(2 / 56) * 100}%`,
          fill: '#1F1F1F',
        },
        g2: {
          refX: `${(47 / 56) * 100 - 56}%`,
          refY: `${(35 / 56) * 100}%`,
          refWidth: `${(25 / 56) * 100}%`,
          refHeight: `${(2 / 56) * 100}%`,
          fill: '#1F1F1F',
        },
        g3: {
          refX: `${(52 / 56) * 100 - 56}%`,
          refY: `${(40 / 56) * 100}%`,
          refWidth: `${(15 / 56) * 100}%`,
          refHeight: `${(2 / 56) * 100}%`,
          fill: '#1F1F1F',
        },
      },
      ports: SLD_PORTS_GROUND,
    },
    true,
  );
}

export function buildSldGroundMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-ground',
    width: 56,
    height: 56,
    ports,
    data: { kind: 'ground' },
  };
}
