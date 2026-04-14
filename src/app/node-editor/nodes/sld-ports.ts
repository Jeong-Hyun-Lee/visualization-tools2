import { Node } from '@antv/x6';

export const COLOR_PORT_GRAY = '#C2C8D5';
export const COLOR_PORT_BLUE = '#5F95FF';

/** 포트 좌표는 노드 bbox 대비 %/px — 리사이즈 시에도 비율이 유지되도록 `absolute` + `args` 사용 */
export type SldPortMode = 'all' | 'horizontal' | 'vertical';

export function buildSldPorts(mode: SldPortMode): Node.Metadata['ports'] {
  const getPortTemplate = (type: 'left' | 'right' | 'top' | 'bottom') => {
    return {
      position: type,
      attrs: {
        circle: {
          r: 4,
          magnet: true,
          stroke: '#5F95FF',
          strokeWidth: 1,
          fill: '#fff',
          style: {
            visibility: 'hidden',
          },
        },
      },
    };
  };

  const useHorizontal = mode === 'all' || mode === 'horizontal';
  const useVertical = mode === 'all' || mode === 'vertical';

  const groups: Record<string, unknown> = {};
  const items: Array<{ group: 'left' | 'right' | 'top' | 'bottom' }> = [];

  if (useHorizontal) {
    groups['left'] = getPortTemplate('left');
    groups['right'] = getPortTemplate('right');
    items.push({ group: 'left' }, { group: 'right' });
  }

  if (useVertical) {
    groups['top'] = getPortTemplate('top');
    groups['bottom'] = getPortTemplate('bottom');
    items.push({ group: 'top' }, { group: 'bottom' });
  }

  return {
    groups,
    items,
  } as Node.Metadata['ports'];
}

export const SLD_PORTS_BREAKER = buildSldPorts('horizontal');
export const SLD_PORTS_LOAD = buildSldPorts('all');
export const SLD_PORTS_TRANSFORMER = buildSldPorts('horizontal');
export const SLD_PORTS_DISCONNECTOR = buildSldPorts('horizontal');
export const SLD_PORTS_GROUND = buildSldPorts('vertical');
export const SLD_PORTS_GENERATOR = buildSldPorts('all');
export const SLD_PORTS_FUSE = buildSldPorts('horizontal');
export const SLD_PORTS_RELAY = buildSldPorts('horizontal');
export const SLD_PORTS_CT = buildSldPorts('horizontal');
export const SLD_PORTS_METER = buildSldPorts('horizontal');
export const SLD_PORTS_SMALL_BOX = buildSldPorts('all');
export const SLD_PORTS_TERMINAL = buildSldPorts('vertical');
export const SLD_PORTS_POTHEAD = buildSldPorts('vertical');

export const SLD_PORTS_NONE = {
  groups: {},
  items: [],
} as unknown as Node.Metadata['ports'];
