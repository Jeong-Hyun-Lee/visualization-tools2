import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_BREAKER } from './sld-ports';

export const SLD_BREAKER_W = 132;
export const SLD_BREAKER_H = 76;

export function registerSldBreaker(): void {
  Graph.registerNode(
    'sld-breaker',
    {
      inherit: 'rect',
      width: SLD_BREAKER_W,
      height: SLD_BREAKER_H,
      markup: [
        { tagName: 'rect', selector: 'lineL' },
        { tagName: 'rect', selector: 'lineR' },
        { tagName: 'text', selector: 'markL' },
        { tagName: 'text', selector: 'markR' },
        { tagName: 'rect', selector: 'plate' },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        lineL: {
          refX: '0%',
          refY: `${(37 / SLD_BREAKER_H) * 100}%`,
          refWidth: `${(22 / SLD_BREAKER_W) * 100}%`,
          refHeight: `${(4 / SLD_BREAKER_H) * 100}%`,
          fill: '#1F1F1F',
        },
        lineR: {
          refX: `${(110 / SLD_BREAKER_W) * 100}%`,
          refY: `${(37 / SLD_BREAKER_H) * 100}%`,
          refWidth: `${(22 / SLD_BREAKER_W) * 100}%`,
          refHeight: `${(4 / SLD_BREAKER_H) * 100}%`,
          fill: '#1F1F1F',
        },
        markL: {
          refX: `${(20 / SLD_BREAKER_W) * 100}%`,
          refY: `${(35 / SLD_BREAKER_H) * 100}%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 12,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: '×',
        },
        markR: {
          refX: `${(112 / SLD_BREAKER_W) * 100}%`,
          refY: `${(35 / SLD_BREAKER_H) * 100}%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 12,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: '×',
        },
        plate: {
          refX: `${(22 / SLD_BREAKER_W) * 100}%`,
          refY: `${(14 / SLD_BREAKER_H) * 100}%`,
          refWidth: `${(88 / SLD_BREAKER_W) * 100}%`,
          refHeight: `${(50 / SLD_BREAKER_H) * 100}%`,
          stroke: '#1F1F1F',
          strokeWidth: 1.6,
          fill: '#FFFFFF',
          rx: 2,
          ry: 2,
        },
        label: {
          refX: `${(66 / SLD_BREAKER_W) * 100}%`,
          refY: `${(39 / SLD_BREAKER_H) * 100}%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 8,
          fontWeight: 700,
          fill: '#1F1F1F',
          lineHeight: 10,
          text: '52-M1\n1200A\nN.C.',
        },
      },
      ports: SLD_PORTS_BREAKER,
    },
    true,
  );
}

export function buildSldBreakerMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-breaker',
    width: SLD_BREAKER_W,
    height: SLD_BREAKER_H,
    ports,
    data: { kind: 'breaker' },
  };
}
