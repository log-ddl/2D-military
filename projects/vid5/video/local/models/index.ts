// Tổng hợp toàn bộ mô hình 3D đã kiểm 4 góc của dự án vid5 (Bước A2 khoá chuẩn trước Bước B).
import type { ModelSet } from '@lib/3d/turntable';
import { MODELS as F15EX_MODELS } from './F15EX';
import { MODELS as F35A_MODELS } from './F35A';
import { MODELS as F15LEG_MODELS } from './F15Legacy';
import { MODELS as LW_MODELS } from './LoyalWingman';
import { MODELS as SAM_MODELS } from './SamAndOrdnance';

export {
  F15EX,
  F15_STA1_POS,
  F15_STA9_POS,
  F15_CENTERLINE_POS,
  F15_NOZZLE_L,
  F15_NOZZLE_R,
  F15_FLARE_POS,
  type F15EXProps,
} from './F15EX';

export { F35A, F35_NOZZLE_POS, type F35AProps } from './F35A';

export { F15Legacy, F15_BREAK_POS, type F15LegacyProps } from './F15Legacy';

export { LoyalWingman, type LoyalWingmanProps } from './LoyalWingman';

export {
  SamBattery,
  HypersonicMissile,
  AMRAAM,
  type SamBatteryProps,
  type MissileProps,
} from './SamAndOrdnance';

export const MODELS: ModelSet = {
  ...F15EX_MODELS,
  ...F35A_MODELS,
  ...F15LEG_MODELS,
  ...LW_MODELS,
  ...SAM_MODELS,
};
