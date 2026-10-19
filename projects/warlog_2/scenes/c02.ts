// Chương 2 · 26.98–50.54 · Cả chuỗi: nhà máy → cảng → đường sắt → kho → mặt trận.
// TOP bản đồ chuỗi (quy ước: trái = hậu phương, phải = mặt trận). Năm loại hàng chạy cả chuỗi, rồi
// MỘT kiện được theo suốt; mỗi chặng đổi phương tiện — chuỗi này là xương sống của cả phim.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

export const NODE: [number, number][] = [[-1560, 140], [-780, -90], [0, 110], [780, -70], [1560, 80]];
export const CHAIN = NODE;
const SEA: [number, number][] = [[-1250, -900], [-950, -900], [-1010, -400], [-930, -150], [-990, 100], [-940, 400], [-1000, 900], [-1250, 900], [-1190, 500], [-1260, 150], [-1200, -200], [-1270, -500]];

const U = (t: number, ts: [number, number][]) => A.keys(t, ts); // tiến độ chuỗi 0..4
const crateU = (t: number) => A.keysLin(t, [[43.88, 0], [46.0, 1], [46.5, 1], [47.9, 2], [48.2, 2], [49.2, 3], [49.5, 3], [50.4, 4]]);

function posU(u: number): [number, number, number] {
  return S.along(NODE, A.clamp(u, 0, 4) / 4);
}

export function drawChainMap(c: CanvasRenderingContext2D, cam: K.Cam, t: number, lit: number) {
  const v = K.view(cam, 200);
  c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  S.topBg(c, cam, 220);
  // biển
  c.beginPath(); SEA.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  c.fillStyle = S.SEABG; c.fill();
  c.strokeStyle = '#7fb3cf'; c.lineWidth = A.px(c, 4); c.stroke();
  // địa hình
  M.river(c, [[-300, -700], [-250, -250], [-380, 100], [-300, 700]], 60);
  M.forest(c, -620, 320, 190, 3); M.forest(c, 380, 330, 220, 7); M.forest(c, 1050, -330, 190, 11); M.forest(c, -120, -330, 200, 5);
  M.hill(c, 1250, 330, 230, 5, 2); M.hill(c, 1800, -300, 200, 4, 9);
  M.town(c, 780, 190, 120, 4);
  // mạng đường (phụ)
  S.roadLine(c, [[0, 110], [-200, 330], [-500, 450]], 24);
  // chuỗi: biển (đứt), ray, đường
  c.save(); c.setLineDash([22, 18]); c.strokeStyle = '#4b88a8'; c.lineWidth = A.px(c, 7);
  c.beginPath(); c.moveTo(NODE[0]![0], NODE[0]![1]); c.lineTo(NODE[1]![0], NODE[1]![1]); c.stroke(); c.restore();
  S.railLine(c, [NODE[1]!, [-420, 0], NODE[2]!], 22);
  S.roadLine(c, [NODE[2]!, [380, 40], NODE[3]!, [1180, 40], NODE[4]!], 48);
  // nút
  S.factoryTop(c, NODE[0]![0], NODE[0]![1], 1.9);
  // cảng: bến + cần cẩu
  c.save(); c.translate(NODE[1]![0], NODE[1]![1]); c.scale(2, 2);
  A.rrect(c, -60, -40, 120, 80, 4, P.light, S.INK, A.px(c, 3.4));
  A.line(c, [[-30, -40], [-30, -80]], S.INK, A.px(c, 4)); A.line(c, [[-30, -80], [30, -80]], S.INK, A.px(c, 4));
  c.restore();
  // đầu mối đường sắt
  c.save(); c.translate(NODE[2]![0], NODE[2]![1]); c.scale(2, 2);
  A.rrect(c, -70, -40, 140, 80, 4, P.light, S.INK, A.px(c, 3.4)); A.line(c, [[-70, 0], [70, 0]], S.INK, A.px(c, 6));
  c.restore();
  S.depotTop(c, NODE[3]![0], NODE[3]![1], 1.7);
  // mặt trận: đơn vị ta, địch phía xa bên phải
  M.unit(c, NODE[4]![0], NODE[4]![1], 'armor', 'ally', 280);
  M.unit(c, NODE[4]![0] + 260, NODE[4]![1] - 240, 'armor', 'foe', 230);
  M.unit(c, NODE[4]![0] + 260, NODE[4]![1] + 220, 'inf', 'foe', 210);
  void lit; void t;
}

export default class C02 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const wide: K.Cam = { x: 120, y: 0, z: 0.5 };
    let cam: K.Cam = wide;
    const at1: K.Cam = { x: NODE[0]![0] + 300, y: 100, z: 0.9 };
    if (t >= 39.14 && t < 43.9) cam = K.mix(wide, at1, A.eio(t, 39.2, 41.0));
    else if (t >= 43.9) {
      const f = K.follow(t, (u) => { const [x, y] = posU(crateU(u)); return [x, y]; }, 0.95, 0.45);
      cam = K.mix(at1, f, A.eio(t, 43.2, 44.4));
      cam = K.mix(cam, wide, A.eio(t, 49.0, 50.5));
    }
    K.begin(c, cam);
    drawChainMap(c, cam, t, 0);

    // 26.98–31.8: đường kích thước từ nhà máy tới mặt trận + chuỗi hiện dần (nét đứt)
    if (t < 39) {
      const dp = A.eo(t, 27.3, 31.0);
      Cm.dimLine(c, NODE[0]![0], NODE[4]![0], -470, dp, P.ink, 8);
    }
    // 31.82–38.9: năm loại hàng chạy cả chuỗi
    if (t >= 31.82 && t < 39.3) {
      const kinds: S.CrateKind[] = ['fuel', 'ammo', 'cargo', 'water', 'part'];
      for (let i = 0; i < 5; i++) {
        const u = 4 * A.ph(t, 31.9 + i * 0.5, 38.4 + i * 0.1);
        const [x, y] = posU(u);
        const fade = A.ph(t, 38.4, 38.9);
        S.crate(c, x, y + 40 + (i - 2) * 14, 3.2, kinds[i]!, 1 - fade * 0.0);
      }
    }
    // mốc "đúng nơi, đúng ngày": vòng xung + lịch tại mặt trận
    if (t >= 37.2 && t < 39.8) {
      const q = A.ph(t, 37.4, 38.9);
      A.withA(c, A.win(t, 37.2, 39.8, 0.3, 0.5), () => {
        A.circle(c, NODE[4]![0], NODE[4]![1], 190 + q * 60, null, P.amber, A.px(c, 8));
      });
    }
    // 39.14–50.5: một kiện duy nhất
    if (t >= 39.14) {
      const u = crateU(t);
      const [x, y, ang] = posU(u);
      // phương tiện của chặng hiện tại
      const leg = Math.min(3, Math.floor(u - 1e-6));
      for (let i = 0; i <= leg + (u % 1 > 0 || u === 0 ? 0 : 0); i++) {
        const [vx, vy, va] = i === leg ? [x, y, ang] : (() => { const q = posU(i + 1); return [q[0], q[1], q[2]] as [number, number, number]; })();
        const ghost = i === leg ? 1 : 0.35;
        if (t < 43.88 && i === 0) continue;
        const rot = i === leg ? va : va;
        if (i === 0) S.shipTop(c, vx, vy, 0.7, { ang: rot, a: ghost, load: 0 });
        if (i === 1) S.trainTop(c, vx, vy, 0.62, { ang: rot, a: ghost, wagons: 2, load: 0 });
        if (i === 2) S.truckTop(c, vx, vy, 1.5, { ang: rot, a: ghost, load: 0 });
        if (i === 3) S.truckTop(c, vx, vy, 1.2, { ang: rot, a: ghost, load: 0, body: P.oliveDark });
      }
      S.crate(c, x, y + 26, 3.4, 'cargo');
      Cm.track(c, x, y - 22, 100 + 8 * Math.sin(t * 6), 1);
      // chặng đứt: dấu hiệu "vấn đề mới" ở mỗi nút
      for (let i = 1; i <= 3; i++) {
        const k = A.ph(u, i - 0.02, i + 0.02);
        if (k > 0 && k < 1.0 && u >= i) {
          const [nx, ny] = NODE[i]!;
          const pulse = A.bump(t, [46.0, 47.9, 49.2][i - 1]!, 1.0);
          if (pulse > 0) A.circle(c, nx, ny, 150 + pulse * 90, null, P.amber, A.px(c, 7));
        }
      }
    }
    K.end(c);
  }
}
