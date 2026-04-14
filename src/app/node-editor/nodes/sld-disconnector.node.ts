import { Graph, Node } from '@antv/x6';

import { DISCONNECTOR_SWITCH_OPEN } from './sld-disconnector-switch';
import { SLD_PORTS_DISCONNECTOR } from './sld-ports';

export function registerSldDisconnector(): void {
  Graph.registerNode(
    'sld-disconnector',
    {
      inherit: 'rect',
      width: 140,
      height: 56,
      markup: [
        {
          tagName: 'g',
          selector: 'left-group',
          children: [
            { tagName: 'rect', selector: 'left', groupSelector: 'line' },
            { tagName: 'circle', selector: 'lco', groupSelector: 'co' },
            { tagName: 'circle', selector: 'lci', groupSelector: 'ci' },
          ],
        },
        { tagName: 'rect', selector: 'switch', groupSelector: 'line' },
        {
          tagName: 'g',
          selector: 'right-group',
          children: [
            { tagName: 'rect', selector: 'right', groupSelector: 'line' },
            { tagName: 'circle', selector: 'rco', groupSelector: 'co' },
            { tagName: 'circle', selector: 'rci', groupSelector: 'ci' },
          ],
        },
        { tagName: 'text', selector: 'label' },
      ],
      attrs: {
        line: {
          refY: `${(28 / 56) * 100}%`,
          refHeight: `${(2 / 56) * 100}%`,
          fill: '#1F1F1F',
          stroke: '#1F1F1F',
        },
        left: {
          refX: '0%',
          refWidth: `${(50 / 140) * 100}%`,
        },
        right: {
          refX: `${(90 / 140) * 100}%`,
          refWidth: `${(50 / 140) * 100}%`,
        },
        co: {
          refR: `${(8 / 56) * 100}%`,
          refCy: `${(28 / 56) * 100}%`,
          fill: '#1F1F1F',
        },
        ci: {
          refR: `${(4 / 56) * 100}%`,
          refCy: `${(28 / 56) * 100}%`,
          fill: '#FFFFFF',
        },
        lco: { refCx: `${(50 / 140) * 100}%` },
        lci: { refCx: `${(50 / 140) * 100}%` },
        rco: { refCx: `${(90 / 140) * 100}%` },
        rci: { refCx: `${(90 / 140) * 100}%` },
        switch: {
          refX: `${(56 / 140) * 100}%`,
          refY: `${(27 / 56) * 100}%`,
          refWidth: `${(34 / 140) * 100}%`,
          refHeight: `${(2 / 56) * 100}%`,
          transform: DISCONNECTOR_SWITCH_OPEN,
          fill: '#1F1F1F',
        },
        label: {
          refX: '50%',
          refY: `0%`,
          textAnchor: 'middle',
          textVerticalAnchor: 'middle',
          fontSize: 12,
          fontWeight: 700,
          fill: '#1F1F1F',
          text: 'DS',
        },
      },
      ports: SLD_PORTS_DISCONNECTOR,
    },
    true,
  );
}

export function buildSldDisconnectorMeta(
  ports: Node.Metadata['ports'],
): Node.Metadata {
  return {
    shape: 'sld-disconnector',
    width: 140,
    height: 56,
    ports,
    data: { kind: 'disconnector' },
  };
}
