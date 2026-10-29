// Tổng hợp toàn bộ mô hình 3D & hằng động học cho dự án `gem` (khoá xong Bước A2 trước khi dựng cảnh Bước B).
import type { ModelSet } from '@lib/3d/turntable';
import { MODELS as M_SHAHED } from './Shahed136';
import { MODELS as M_SKYHOOK } from './ScanEagleSkyHook';
import { MODELS as M_TOWER22 } from './Tower22Structures';
import { MODELS as M_MLIDS } from './MlidsCoyote';
import { MODELS as M_B1B } from './B1BLancer';

export {
  Shahed136,
  SHAHED_CENTER_Y,
  SHAHED_PROP_POS,
  type Shahed136Props,
} from './Shahed136';

export {
  ScanEagle,
  SkyHookCrane,
  SCANEAGLE_RIGHT_HOOK_OFFSET,
  SCANEAGLE_LEFT_HOOK_OFFSET,
  SKYHOOK_APEX,
  SKYHOOK_CATCH_POINT,
  SKYHOOK_CABLE_TOP,
  SKYHOOK_CATCH_POS,
  getSkyHookCablePoint,
  type ScanEagleProps,
  type SkyHookCraneProps,
} from './ScanEagleSkyHook';

export {
  ChuContainer,
  TWall,
  HescoWall,
  NightHawkMast,
  ConcreteBunker,
  type ChuContainerProps,
  type TWallProps,
  type HescoWallProps,
  type NightHawkMastProps,
  type ConcreteBunkerProps,
} from './Tower22Structures';

export {
  KurfsRadarUnit,
  CoyoteBlock2,
  COYOTE_LAUNCHER_PIVOT,
  COYOTE_MUZZLE_LOCAL,
  getCoyoteMuzzlePos,
  getCoyoteLaunchDir,
  type KurfsRadarUnitProps,
  type CoyoteBlock2Props,
} from './MlidsCoyote';

export {
  B1BLancer,
  B1B_GROUND_Y,
  B1B_FWD_BAY_POS,
  B1B_AFT_BAY_POS,
  type B1BLancerProps,
} from './B1BLancer';

export const MODELS: ModelSet = {
  ...M_SHAHED,
  ...M_SKYHOOK,
  ...M_TOWER22,
  ...M_MLIDS,
  ...M_B1B,
};
