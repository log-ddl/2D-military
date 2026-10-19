// scenes/_state.ts — Quản lý trạng thái thế giới và tọa độ xuyên chương cho war_15
// Giúp các điểm nối giữa chương (seam) khớp 100% vị trí, góc nhìn và trạng thái vật thể.

import * as A from './shared/art';
import * as K from './shared/camera';
import * as Assets from './_assets';
import { P, LINE } from './shared/palette';

export interface LayerDiagramOpts {
  activeLayer?: 0 | 1 | 2 | 3; // 0: tất cả, 1: LEO 500km, 2: MEO 20000km, 3: GEO 36000km
  leoAngle?: number;
  meoAngle?: number;
  geoAngle?: number;
  earthRot?: number;
  showRays?: boolean;
}

/**
 * Sơ đồ mặt cắt dọc 3 tầng quỹ đạo (Orbital Layers Cross-Section) dùng xuyên suốt:
 * - Cuối Chương 1 (62.04–74.76s) nối sang đầu Chương 2 (74.76s)
 * - Đầu Chương 3 (221.72–241.26s)
 * - Đầu Chương 4 (290.78–306.70s)
 * - Cuối Chương 6 (468.42–481.54s)
 * Tâm Trái Đất đặt tại (960, 1750), bán kính R_earth = 720 (đỉnh bề mặt ở y = 1030).
 * - Tầng 1 (LEO ~500 km): bán kính quỹ đạo R1 = 870 (đỉnh y = 880)
 * - Tầng 2 (MEO ~20.000 km): bán kính quỹ đạo R2 = 1220 (đỉnh y = 530)
 * - Tầng 3 (GEO ~36.000 km): bán kính quỹ đạo R3 = 1560 (đỉnh y = 190)
 */
export const ORBIT_WORLD = {
  cx: 960,
  cy: 1750,
  rEarth: 720,
  rLeo: 870,
  rMeo: 1220,
  rGeo: 1560,
} as const;

export function drawThreeLayersWorld(
  c: CanvasRenderingContext2D,
  t: number,
  opt: LayerDiagramOpts = {}
) {
  const { cx, cy, rEarth, rLeo, rMeo, rGeo } = ORBIT_WORLD;
  const lw = A.px(c, LINE.outer);
  const li = A.px(c, LINE.inner);

  // Vẽ 3 vòng quỹ đạo đứt nét
  const drawOrbitArc = (r: number, col: string, bold: boolean) => {
    c.save();
    c.beginPath();
    c.arc(cx, cy, r, -Math.PI * 0.85, -Math.PI * 0.15);
    c.setLineDash([A.px(c, 16), A.px(c, 12)]);
    c.strokeStyle = col;
    c.lineWidth = bold ? lw * 1.15 : li;
    c.stroke();
    c.restore();
  };

  drawOrbitArc(rLeo, opt.activeLayer === 1 ? P.amber : P.slate, opt.activeLayer === 1);
  drawOrbitArc(rMeo, opt.activeLayer === 2 ? P.sky : P.slate, opt.activeLayer === 2);
  drawOrbitArc(rGeo, opt.activeLayer === 3 ? P.enemy : P.slate, opt.activeLayer === 3);

  // Vẽ cung Trái Đất ở đáy
  Assets.drawEarthArc(c, cx, cy, rEarth, {
    rot: opt.earthRot ?? 0,
    showAtmo: true,
    showGrid: true,
  });

  // Vị trí góc (0 = đỉnh 12h thẳng đứng phía trên tâm Trái Đất)
  const aLeo = opt.leoAngle ?? 0;
  const aMeo = opt.meoAngle ?? -0.22;
  const aGeo = opt.geoAngle ?? 0.18;

  const posOnOrbit = (r: number, ang: number): A.Pt => [
    cx + Math.sin(ang) * r,
    cy - Math.cos(ang) * r,
  ];

  const [lx, ly] = posOnOrbit(rLeo, aLeo);
  const [mx, my] = posOnOrbit(rMeo, aMeo);
  const [gx, gy] = posOnOrbit(rGeo, aGeo);

  if (opt.showRays) {
    // Chùm tia phủ xuống bề mặt Trái Đất
    A.withA(c, 0.16, () => {
      A.poly(c, [[lx, ly], [lx - 90, cy - rEarth], [lx + 90, cy - rEarth]], P.amber, null, 0);
      A.poly(c, [[mx, my], [mx - 280, cy - rEarth + 40], [mx + 280, cy - rEarth + 40]], P.sky, null, 0);
      A.poly(c, [[gx, gy], [cx - 520, cy - rEarth + 140], [cx + 520, cy - rEarth + 140]], P.enemyLight, null, 0);
    });
  }

  // Vệ tinh ở mỗi tầng
  Assets.drawOpticalSat(c, lx, ly, 0.55, 'side', { rot: aLeo });
  Assets.drawNavSat(c, mx, my, 0.58, 'cutaway', { rot: aMeo, clockPhase: t * 3 });
  Assets.drawGeoWarningSat(c, gx, gy, 0.58, 'side', { rot: aGeo, irLock: 0.6 });

  return {
    leoPos: [lx, ly] as A.Pt,
    meoPos: [mx, my] as A.Pt,
    geoPos: [gx, gy] as A.Pt,
  };
}

/** Camera chuẩn tại ranh giới cuối Chương 1 / đầu Chương 2 (đang nhìn vào vệ tinh LEO ở (960, 880)). */
export const CAM_CH1_END: K.Cam = { x: 960, y: 880, z: 1.55 };
export const CAM_THREE_LAYERS_WIDE: K.Cam = { x: 960, y: 630, z: 0.92 };
