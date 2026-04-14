import { Graph } from '@antv/x6';

export function registerSldEdge(): void {
  Graph.registerEdge(
    'sld-edge',
    {
      inherit: 'edge',
      attrs: {
        line: {
          stroke: '#1F1F1F',
          strokeWidth: 2,
          targetMarker: {
            name: 'block',
            width: 10,
            height: 6,
          },
        },
      },
    },
    true,
  );
}
