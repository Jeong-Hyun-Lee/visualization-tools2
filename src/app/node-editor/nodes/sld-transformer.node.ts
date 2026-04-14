import { Graph, Node } from '@antv/x6';

import { SLD_PORTS_TRANSFORMER } from './sld-ports';

export const SLD_TR_W = 88;
/** 상·하 라벨과 이중 원호 사이 여유 */
export const SLD_TR_H = 74;

export function registerSldTransformer(): void {
  Graph.registerNode(
    'sld-transformer',
    {
      inherit: 'rect',
      width: SLD_TR_W,
      height: SLD_TR_H,
      markup: [
        { tagName: 'rect', selector: 'body' },
        { tagName: 'circle', selector: 'coilL' },
        { tagName: 'circle', selector: 'coilR' },
        { tagName: 'text', selector: 'label' },
        { tagName: 'text', selector: 'sublabel' },
      ],
      attrs: {
        body: {
          refWidth: '100%',
          refHeight: '100%',
          stroke: 'transparent',
          strokeWidth: 0,
          fill: 'transparent',
          rx: 8,
          ry: 8,
        },
        coilL: {
          refCx: '42%',
          refCy: `${(37 / SLD_TR_H) * 100}%`,
          refR: '36%',
          stroke: '#1F1F1F',
          strokeWidth: 2,
          fill: 'none',
        },
        coilR: {
          refCx: '58%',
          refCy: `${(37 / SLD_TR_H) * 100}%`,
          refR: '36%',
          stroke: '#1F1F1F',
          strokeWidth: 2,
          fill: 'none',
        },
        label: {
          refX: '50%',
          refY: `${(2 / SLD_TR_H) * 100}%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'top',
          fontSize: 9,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: 'PT / VT',
        },
        sublabel: {
          refX: '50%',
          refY: `${(66 / SLD_TR_H) * 100}%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'top',
          fontSize: 7,
          fill: '#374151',
          text: '14.4k:120V',
        },
      },
      ports: SLD_PORTS_TRANSFORMER,
    },
    true,
  );
}

export function buildSldTransformerMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-transformer',
    width: SLD_TR_W,
    height: SLD_TR_H,
    ports,
    data: { kind: 'transformer' },
  };
}
