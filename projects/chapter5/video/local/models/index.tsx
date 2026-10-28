// Mô hình riêng của chapter5. Kiểm: python3 tools/sheet.py chapter5 --model <Tên>
import type { ModelSet } from '@lib/3d/turntable';
import { SPH } from './sph';
import { Shell155 } from './shell';
import { RadarTruck } from './radar';

export { SPH, muzzleOf, TRUNNION, OLIVE } from './sph';
export { Shell155 } from './shell';
export { RadarTruck } from './radar';

export const MODELS: ModelSet = {
  SPH: { C: () => <SPH elev={0.35} hatch={1} />, size: 9, center: [0.5, 1.6, 0] },
  Shell155: { C: () => <group position={[0, 0.08, 0]}><Shell155 /></group>, size: 1, center: [0.4, 0.15, 0] },
  RadarTruck: { C: () => <RadarTruck yaw={0.6} glow={0.6} />, size: 10, center: [0, 1.8, 0] },
};
