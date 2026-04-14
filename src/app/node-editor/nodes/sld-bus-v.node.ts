import { Graph, Node } from '@antv/x6';

import { buildSldPorts } from './sld-ports';

export const SLD_BUS_V_W = 44;
export const SLD_BUS_V_H = 140;
export const SLD_BUS_V_BAR_PX = 6;

export function registerSldBusV(): void {
  Graph.registerNode(
    'sld-bus-v',
    {
      inherit: 'rect',
      width: SLD_BUS_V_W,
      height: SLD_BUS_V_H,
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
          fill: 'transparent',
        },
        bar: {
          refX: `${((SLD_BUS_V_W - SLD_BUS_V_BAR_PX) / 2 / SLD_BUS_V_W) * 100}%`,
          refY: '0%',
          refWidth: `${(SLD_BUS_V_BAR_PX / SLD_BUS_V_W) * 100}%`,
          refHeight: '100%',
          rx: 1,
          fill: '#1F1F1F',
        },
        label: {
          refX: '50%',
          refY: `-4%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 9,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: 'BUS',
        },
      },
      ports: buildSldPorts('vertical'),
    },
    true,
  );
}

export function buildSldBusVMeta(ports: Node.Metadata['ports']): Node.Metadata {
  return {
    shape: 'sld-bus-v',
    width: SLD_BUS_V_W,
    height: SLD_BUS_V_H,
    ports,
    data: { kind: 'bus-v' },
  };
}
