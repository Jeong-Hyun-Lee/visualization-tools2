import { Graph, Node } from '@antv/x6';

import {
  SLD_LOAD_H,
  SLD_LOAD_RING_R,
  SLD_LOAD_W,
} from './sld-load.node';
import { SLD_PORTS_GENERATOR } from './sld-ports';

export function registerSldGenerator(): void {
  Graph.registerNode(
    'sld-generator',
    {
      inherit: 'rect',
      width: SLD_LOAD_W,
      height: SLD_LOAD_H,
      markup: [
        { tagName: 'circle', selector: 'ring' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        ring: {
          refCx: '50%',
          refCy: '50%',
          refR: `${(SLD_LOAD_RING_R / SLD_LOAD_H) * 100}%`,
          stroke: '#1F1F1F',
          strokeWidth: 2,
          fill: 'transparent',
        },
        label: {
          refX: '50%',
          refY: '50%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 10,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: 'GEN',
        },
      },
      ports: SLD_PORTS_GENERATOR,
    },
    true,
  );
}

export function buildSldGeneratorMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-generator',
    width: SLD_LOAD_W,
    height: SLD_LOAD_H,
    ports,
    data: { kind: 'generator' },
  };
}
