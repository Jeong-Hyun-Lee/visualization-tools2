/** 공개 API — SLD 노드 정의는 `nodes/` 모듈에 분리되어 있습니다. */

export {
  COLOR_PORT_BLUE,
  COLOR_PORT_GRAY,
  SLD_PORTS_BREAKER,
  SLD_PORTS_CT,
  SLD_PORTS_DISCONNECTOR,
  SLD_PORTS_FUSE,
  SLD_PORTS_GENERATOR,
  SLD_PORTS_GROUND,
  SLD_PORTS_LOAD,
  SLD_PORTS_METER,
  SLD_PORTS_NONE,
  SLD_PORTS_POTHEAD,
  SLD_PORTS_RELAY,
  SLD_PORTS_SMALL_BOX,
  SLD_PORTS_TERMINAL,
  SLD_PORTS_TRANSFORMER,
  buildSldPorts,
  type SldPortMode,
} from './nodes/sld-ports';

export {
  DISCONNECTOR_SWITCH_CENTER,
  DISCONNECTOR_SWITCH_CLOSE,
  DISCONNECTOR_SWITCH_OPEN,
} from './nodes/sld-disconnector-switch';

export { ensureGlobalX6Styles } from './nodes/sld-global-styles';
export { registerSldEdge } from './nodes/sld-edge';

export {
  SLD_BUS_V_BAR_PX,
  SLD_BUS_V_H,
  SLD_BUS_V_W,
} from './nodes/sld-bus-v.node';

export { SLD_BREAKER_H, SLD_BREAKER_W } from './nodes/sld-breaker.node';

export {
  SLD_LOAD_H,
  SLD_LOAD_RING_R,
  SLD_LOAD_W,
} from './nodes/sld-load.node';

export { SLD_TR_H, SLD_TR_W } from './nodes/sld-transformer.node';

export { buildSldBusMeta, registerSldBus } from './nodes/sld-bus.node';
export { buildSldBusVMeta, registerSldBusV } from './nodes/sld-bus-v.node';
export { buildSldBreakerMeta, registerSldBreaker } from './nodes/sld-breaker.node';
export { buildSldLoadMeta, registerSldLoad } from './nodes/sld-load.node';
export {
  buildSldTransformerMeta,
  registerSldTransformer,
} from './nodes/sld-transformer.node';
export {
  buildSldDisconnectorMeta,
  registerSldDisconnector,
} from './nodes/sld-disconnector.node';
export { buildSldGroundMeta, registerSldGround } from './nodes/sld-ground.node';
export {
  buildSldGeneratorMeta,
  registerSldGenerator,
} from './nodes/sld-generator.node';
export { buildSldRelayMeta, registerSldRelay } from './nodes/sld-relay.node';
export { buildSldFuseMeta, registerSldFuse } from './nodes/sld-fuse.node';
export { buildSldCtMeta, registerSldCt } from './nodes/sld-ct.node';
export { buildSldTsMeta, registerSldTs } from './nodes/sld-ts.node';
export { buildSldSbMeta, registerSldSb } from './nodes/sld-sb.node';
export {
  buildSldIndicatorMeta,
  registerSldIndicator,
} from './nodes/sld-indicator.node';
export {
  buildSldTerminalMeta,
  registerSldTerminal,
} from './nodes/sld-terminal.node';
export { buildSldMeterMeta, registerSldMeter } from './nodes/sld-meter.node';
export {
  buildSldPotheadMeta,
  registerSldPothead,
} from './nodes/sld-pothead.node';
export {
  buildSldEquipmentRegionMeta,
  registerSldEquipmentRegion,
} from './nodes/sld-equipment-region.node';

import { registerSldBreaker } from './nodes/sld-breaker.node';
import { registerSldBus } from './nodes/sld-bus.node';
import { registerSldBusV } from './nodes/sld-bus-v.node';
import { registerSldCt } from './nodes/sld-ct.node';
import { registerSldDisconnector } from './nodes/sld-disconnector.node';
import { registerSldEquipmentRegion } from './nodes/sld-equipment-region.node';
import { registerSldFuse } from './nodes/sld-fuse.node';
import { registerSldGenerator } from './nodes/sld-generator.node';
import { registerSldGround } from './nodes/sld-ground.node';
import { registerSldIndicator } from './nodes/sld-indicator.node';
import { registerSldLoad } from './nodes/sld-load.node';
import { registerSldMeter } from './nodes/sld-meter.node';
import { registerSldPothead } from './nodes/sld-pothead.node';
import { registerSldRelay } from './nodes/sld-relay.node';
import { registerSldSb } from './nodes/sld-sb.node';
import { registerSldTerminal } from './nodes/sld-terminal.node';
import { registerSldTransformer } from './nodes/sld-transformer.node';
import { registerSldTs } from './nodes/sld-ts.node';

export function registerSldShapes(): void {
  registerSldBus();
  registerSldBusV();
  registerSldBreaker();
  registerSldLoad();
  registerSldTransformer();
  registerSldDisconnector();
  registerSldGround();
  registerSldGenerator();
  registerSldRelay();
  registerSldFuse();
  registerSldCt();
  registerSldTs();
  registerSldSb();
  registerSldIndicator();
  registerSldTerminal();
  registerSldMeter();
  registerSldPothead();
  registerSldEquipmentRegion();
}
