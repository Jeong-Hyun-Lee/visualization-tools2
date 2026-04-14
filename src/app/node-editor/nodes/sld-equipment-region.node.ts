import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_NONE } from './sld-ports';

export function registerSldEquipmentRegion(): void {
  Graph.registerNode(
    'sld-equipment-region',
    {
      inherit: 'rect',
      width: 200,
      height: 100,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          fill: 'rgba(255,255,255,0.02)',
          stroke: '#6B7280',
          strokeWidth: 0.6,
          strokeDasharray: '4 3',
          rx: 6,
          ry: 6,
        },
        label: {
          refX: '10',
          refY: '16',
          textAnchor: 'start',
          textVerticalAnchor: 'middle',
          fontSize: 11,
          fontWeight: 700,
          fill: '#374151',
          text: 'USG-1A',
        },
      },
      ports: SLD_PORTS_NONE,
    },
    true,
  );
}

export function buildSldEquipmentRegionMeta(): Node.Metadata {
  return {
    shape: 'sld-equipment-region',
    width: 200,
    height: 100,
    ports: SLD_PORTS_NONE,
    data: { kind: 'equipment-region' },
  };
}
