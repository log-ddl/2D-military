// Danh mục mô hình 3D riêng của dự án `test` cho bàn xoay kiểm định (sheet.py --model <Tên>) và các cảnh 3D.
import React from 'react';
import type { ModelSet } from '@lib/3d/turntable';
import { MBT } from './MBT';
import { FPVDrone } from './FPVDrone';
import { TopAttackMissile } from './TopAttackMissile';

export { MBT } from './MBT';
export { FPVDrone } from './FPVDrone';
export { TopAttackMissile } from './TopAttackMissile';

const MBTTurntable: React.FC = () => React.createElement(MBT, { turretYaw: 0.12, gunElev: 0.05, aps: false });
const MBTAPSTurntable: React.FC = () => React.createElement(MBT, { turretYaw: 0.18, gunElev: 0.05, aps: true, apsYaw: 0.45 });
const FPVDroneTurntable: React.FC = () =>
  React.createElement('group', { position: [0, 0.34, 0] }, React.createElement(FPVDrone, { rotorSpin: 0.5, cameraPitch: -0.2 }));
const MissileTurntable: React.FC = () =>
  React.createElement('group', { position: [0, 0.38, 0] }, React.createElement(TopAttackMissile, { finDeploy: 1, thrust: 0 }));

export const MODELS: ModelSet = {
  MBT: { C: MBTTurntable, size: 8.4, center: [0.35, 1.35, 0] },
  MBT_APS: { C: MBTAPSTurntable, size: 8.4, center: [0.35, 1.4, 0] },
  FPVDrone: { C: FPVDroneTurntable, size: 0.92, center: [0.04, 0.32, 0] },
  TopAttackMissile: { C: MissileTurntable, size: 1.15, center: [0, 0.38, 0] },
};
