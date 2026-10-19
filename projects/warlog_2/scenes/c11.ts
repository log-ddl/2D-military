// Chương 11 · 431.50–457.74 · Kho lớn là mục tiêu lớn: tầm đánh xa ép kho lùi → đường tới pháo dài ra.
// TOP một bản đồ: mặt trận (đường dọc), kho đạn (3), pháo; các đòn đánh từ phải; kho lùi (nét đứt = chưa xác nhận);
// đoạn đường kho→pháo dài ra, xe tải nhiều lên, cột "đã đốt" tăng — cái bẫy của phần mở đầu do đối phương áp đặt.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as U from './shared/ui';
import * as F from './shared/fx';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

export const STRIKES: { t: number; to: Pt; from: Pt }[] = [
  { t: 434.2, to: [760, -200], from: [2300, -420] },
  { t: 435.6, to: [760, 0], from: [2300, 40] },
  { t: 437.0, to: [760, 200], from: [2300, 380] },
];
const DEP_NEAR: Pt[] = [[760, -200], [760, 0], [760, 200]];
const DEP_FAR: Pt[] = [[-220, -200], [-220, 0], [-220, 200]];
const GUNS: Pt[] = [[1060, -170], [1060, 0], [1060, 170]];

export default class C11 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    const cam: K.Cam = K.track(t, [[431.5, { x: 1000, y: 0, z: 0.8 }], [440.0, { x: 1000, y: 0, z: 0.8 }], [443.0, { x: 560, y: 0, z: 0.82 }], [457.74, { x: 560, y: 0, z: 0.82 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 300);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 260, 'rgba(0,0,0,0)');
    M.forest(c, 300, 380, 210, 3); M.forest(c, 1300, -420, 220, 6); M.forest(c, -300, -400, 200, 9); M.hill(c, 1500, 400, 240, 4, 1);
    // đường chính kho→pháo
    const moved = A.eio(t, 438.3, 441.0);
    const roadEnd = 1060;
    S.roadLine(c, [[-420, 0], [roadEnd, 0]], 40);
    // mặt trận (đường kẻ dọc) và phe kia bên phải
    M.front(c, [[1300, -520], [1260, -250], [1320, 0], [1260, 250], [1300, 520]], 1, { color: P.ink, side: 1 });
    M.unit(c, 1700, -260, 'art', 'foe', 230); M.unit(c, 1700, 20, 'armor', 'foe', 230); M.unit(c, 1700, 280, 'art', 'foe', 230);
    // pháo ta
    GUNS.forEach(([x, y]) => M.unit(c, x, y, 'art', 'ally', 190));
    // kho: gần mặt trận → bị đánh → lùi
    DEP_NEAR.forEach(([x, y], i) => {
      const hit = STRIKES[i]!.t;
      const wrecked = A.sm(t, hit + 0.55, hit + 0.8);
      const newX = A.lerp(x, DEP_FAR[i]![0], moved);
      const dashed = t > 441.0 && t < 443.3 ? 1 : (t >= 443.3 ? 1 : 0);
      // vị trí cũ: bóng nét đứt sau khi lùi
      if (moved > 0.02) {
        A.withA(c, 0.5, () => { c.save(); c.setLineDash([12, 10]); A.rrect(c, x - 104, y - 72, 208, 144, 10, null, INK, A.px(c, 3.5)); c.restore(); });
      }
      const alive = i === 1 ? 1 : 1; // mọi kho đều được di chuyển; bị đánh chỉ mất một phần đạn
      A.withA(c, alive, () => S.depotTop(c, newX, y, 1.0, { fill: 1 - 0.5 * wrecked, dash: dashed > 0 && moved > 0.5 }));
      // vụ nổ lúc trúng (đánh vào vị trí cũ)
      if (t > hit + 0.55 && t < hit + 3.0) {
        F.explosion(c, x, y, 120, A.ph(t, hit + 0.55, hit + 1.7));
        F.smoke(c, x, y - 20, A.clamp(t - hit - 0.8, 0, 4), 1.3, 5);
      }
    });
    // các đòn: cung rocket từ phải
    for (const s of STRIKES) {
      const k = A.ph(t, s.t, s.t + 0.6);
      if (k > 0 && k < 1) F.arcShot(c, s.from, s.to, k, 160, { color: P.enemy, w: 6, trail: true });
    }
    // đoạn đường giữa kho và pháo dài ra; xe tải theo
    if (t > 443.0) {
      const dx = DEP_FAR[1]![0] + 130;
      Cm.dimLine(c, dx, GUNS[1]![0] - 110, -290, A.eo(t, 444.0, 446.0), P.ink, 8);
      const n = Math.round(A.keys(t, [[443.0, 3], [449.0, 5], [452.0, 10], [456.0, 16]]));
      for (let i = 0; i < n; i++) {
        const u = ((t * 0.22) + i / n) % 1;
        const out = u < 0.5, k = out ? u / 0.5 : (u - 0.5) / 0.5;
        const x = out ? A.lerp(dx, GUNS[1]![0] - 130, k) : A.lerp(GUNS[1]![0] - 130, dx, k);
        S.truckTop(c, x, out ? -14 : 14, 0.8, { ang: out ? 0 : Math.PI, load: out ? 1 : 0, kind: 'ammo', body: out ? P.olive : P.slate });
      }
    }
    K.end(c);
    // cột "đến nơi / đã đốt" (trái, UI) khi nhắc cái bẫy ban đầu
    if (t > 451.0) {
      const a = A.sm(t, 451.0, 452.0);
      const burned = A.keys(t, [[451.0, 0.12], [457.0, 0.55]]);
      A.withA(c, a, () => {
        A.rrect(c, 60, 230, 250, 640, 14, 'rgba(255,255,255,0.9)', INK, 3.4);
        S.loadColumn(c, 185, 750, 100, 440, burned);
        S.truckSide(c, 185, 820, 0.6, { load: 1 });
      });
    }
    void U;
  }
}
