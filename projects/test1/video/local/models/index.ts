// Đăng ký toàn bộ mô hình 3D của dự án test1 để kiểm 4 góc bằng tools/sheet.py test1 --model <Tên>
// và xuất lại cho các cảnh S01..S11 sử dụng.
import React from 'react';
import type { ModelSet } from '@lib/3d/turntable';
import { MQ9Reaper, MQ9_MTSB_POS, MQ9_GBU12_RIGHT, MQ9_GBU12_LEFT } from './MQ9Reaper';
import { MQ1Predator } from './MQ1Predator';
import { GBU39SDB } from './GBU39SDB';
import { FortifiedBunker, TacticalTruck } from './DesertTargets';
import { AGM114Hellfire, DualHellfireRack, GBU12Paveway } from './Munitions3D';

export {
  MQ9Reaper,
  MQ9_MTSB_POS,
  MQ9_GBU12_RIGHT,
  MQ9_GBU12_LEFT,
  MQ1Predator,
  GBU39SDB,
  FortifiedBunker,
  TacticalTruck,
  AGM114Hellfire,
  DualHellfireRack,
  GBU12Paveway,
};

const GBU39Turntable: React.FC = () => React.createElement(GBU39SDB, { position: [0, 0.42, 0], deploy: 1 });

export const MODELS: ModelSet = {
  MQ9Reaper: { C: MQ9Reaper, size: 16, center: [0, 1.35, 0] },
  MQ1Predator: { C: MQ1Predator, size: 12.5, center: [0, 1.05, 0] },
  GBU39SDB: { C: GBU39Turntable, size: 2.3, center: [0, 0.45, 0] },
  FortifiedBunker: { C: FortifiedBunker, size: 10.5, center: [0, 1.6, 0] },
  TacticalTruck: { C: TacticalTruck, size: 8.2, center: [0, 1.4, 0] },
};
