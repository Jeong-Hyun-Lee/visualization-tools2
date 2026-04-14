import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_SMALL_BOX } from './sld-ports';

export function registerSldSb(): void {
  Graph.registerNode(
    'sld-sb',
    {
      inherit: 'rect',
      width: 48,
      height: 48,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          stroke: '#1F1F1F',
          strokeWidth: 1,
          fill: '#FFFFFF',
          rx: 2,
          ry: 2,
        },
        label: {
          refX: '50%',
          refY: '50%',
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 12,
          fontWeight: 800,
          fill: '#1F1F1F',
          text: 'SB',
        },
      },
      ports: SLD_PORTS_SMALL_BOX,
    },
    true,
  );
}

export function buildSldSbMeta(ports: Node.Metadata['ports']): Node.Metadata {
  return {
    shape: 'sld-sb',
    width: 48,
    height: 48,
    ports,
    data: { kind: 'sb' },
  };
}
