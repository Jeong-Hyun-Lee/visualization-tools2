import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_LOAD } from './sld-ports';

export const SLD_LOAD_W = 56;
export const SLD_LOAD_H = 56;
export const SLD_LOAD_RING_R = 26;

export function registerSldLoad(): void {
  Graph.registerNode(
    'sld-load',
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
          text: 'MOTOR',
        },
      },
      ports: SLD_PORTS_LOAD,
    },
    true,
  );
}

export function buildSldLoadMeta(ports: Node.Metadata['ports']): Node.Metadata {
  return {
    shape: 'sld-load',
    width: SLD_LOAD_W,
    height: SLD_LOAD_H,
    ports,
    data: { kind: 'load' },
  };
}
