import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_FUSE } from './sld-ports';

export function registerSldFuse(): void {
  Graph.registerNode(
    'sld-fuse',
    {
      inherit: 'rect',
      width: 72,
      height: 34,
      markup: [
        { tagName: 'rect', selector: 'lineL' },
        { tagName: 'rect', selector: 'lineR' },
        { tagName: 'rect', selector: 'element' },
      ],
      attrs: {
        lineL: {
          refX: '0%',
          refY: `${(16 / 34) * 100}%`,
          refWidth: `${(30 / 72) * 100}%`,
          refHeight: `${(2 / 34) * 100}%`,
          fill: '#1F1F1F',
        },
        lineR: {
          refX: `${(44 / 72) * 100}%`,
          refY: `${(16 / 34) * 100}%`,
          refWidth: `${(28 / 72) * 100}%`,
          refHeight: `${(2 / 34) * 100}%`,
          fill: '#1F1F1F',
        },
        element: {
          refX: `${(30 / 72) * 100}%`,
          refY: `${(6 / 34) * 100}%`,
          refWidth: `${(14 / 72) * 100}%`,
          refHeight: `${(22 / 34) * 100}%`,
          stroke: '#1F1F1F',
          strokeWidth: 0.75,
          fill: '#F3F4F6',
          rx: 1,
        },
      },
      ports: SLD_PORTS_FUSE,
    },
    true,
  );
}

export function buildSldFuseMeta(ports: Node.Metadata['ports']): Node.Metadata {
  return {
    shape: 'sld-fuse',
    width: 72,
    height: 34,
    ports,
    data: { kind: 'fuse' },
  };
}
