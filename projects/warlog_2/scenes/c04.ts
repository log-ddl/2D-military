// Chương 4 · 113.74–167.14 · Xe tải: đi được mọi nơi có đường, thêm theo trăm; Red Ball Express; cái bẫy lặp lại.
// TOP: đầu mối đường sắt → xe tải rẽ nhánh (113.7–130) · TOP Red Ball: hai làn một chiều, vòng dài ra theo mặt trận,
// cột "đã đốt" tăng (130–167). Hướng: hậu phương trái, mặt trận phải. Sơ đồ, không đúng tỉ lệ thật.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

// ── a) đầu mối đường sắt → mạng đường ───────────────────────────
const HEAD: Pt = [-300, 0];
const BRANCH: Pt[][] = [
  [[-300, 0], [100, -20], [500, -200], [950, -260]],
  [[-300, 0], [200, 10], [700, 30], [1200, 40]],
  [[-300, 0], [100, 30], [450, 240], [900, 330]],
  [[100, 0], [500, -20], [700, -180], [1250, -300]],
];
const UNITS: Pt[] = [[1050, -280], [1300, 40], [1000, 340], [1370, -320]];

function truckOn(c: Ctx, path: Pt[], u: number, s: number, load: number, kind: S.CrateKind = 'cargo') {
  const [x, y, a] = S.along(path, A.clamp01(u));
  S.truckTop(c, x, y, s, { ang: a, load, kind });
}

function drawLandA(c: Ctx, cam: K.Cam) {
  const v = K.view(cam, 200);
  c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
  M.forest(c, 300, 350, 200, 3); M.forest(c, 1400, 280, 230, 8); M.forest(c, 600, -360, 180, 12);
  M.river(c, [[-100, -800], [-60, -400], [-140, 100], [-80, 800]], 0);
  M.hill(c, 1600, -100, 240, 5, 6);
  // ray tới đầu mối rồi hết
  S.railLine(c, [[-1500, 0], HEAD], 22);
  A.rrect(c, HEAD[0] - 20, -60, 120, 120, 6, P.light, INK, A.px(c, 3.4));
  A.line(c, [[HEAD[0] - 20, -34], [HEAD[0] - 20, 34]], INK, A.px(c, 10));
  // hạ tầng: đường
  for (const b of BRANCH) S.roadLine(c, b, 30);
  UNITS.forEach(([x, y], i) => M.unit(c, x, y, i % 2 ? 'mech' : 'armor', 'ally', 170));
}

// ── b/c) Red Ball ─────────────────────────────────────────────────
const BASE: Pt = [-300, 0];
const xf = (t: number) => A.keys(t, [[130, 1000], [146.6, 1300], [154, 2000], [160, 2450], [166, 2600]]);
const GY0 = -130, GY1 = 130; // làn đi / làn về
function rbPath(x0: number, x1: number): Pt[] {
  return [[x0, GY0], [x1, GY0], [x1 + 80, 0], [x1, GY1], [x0, GY1], [x0 - 80, 0], [x0, GY0]];
}

export default class C04 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 130.2) this.a(c, t); else this.b(c, t);
  }

  private a(c: Ctx, t: number) {
    const z1: K.Cam = { x: HEAD[0] + 340, y: 0, z: 0.95 };
    const z2: K.Cam = { x: 560, y: -20, z: 0.55 };
    const cam = K.mix(z1, z2, A.eio(t, 123.6, 126.4));
    K.begin(c, cam);
    drawLandA(c, cam);
    // tàu hỏa vào đầu mối, chuyển kiện sang xe tải
    const tx = A.lerp(-1500, HEAD[0] - 30, A.eo(t, 113.5, 116.2));
    S.trainTop(c, tx, 0, 0.9, { wagons: 4, load: 1 - A.ph(t, 117.5, 121.0) });
    // xe tải nối đuôi: mỗi xe rời đầu mối theo một nhánh
    const kinds: S.CrateKind[] = ['fuel', 'ammo', 'cargo', 'water', 'cargo', 'fuel', 'ammo', 'part'];
    for (let i = 0; i < 16; i++) {
      const b = BRANCH[i % 4]!;
      const t0 = 117.6 + i * 0.55;
      const u = A.ph(t, t0, t0 + 9.5);
      if (u <= 0 || u >= 1) { if (u >= 1) truckOn(c, b, 1, 0.9, 0, kinds[i % 8]); continue; }
      truckOn(c, b, u, 0.9, 1, kinds[i % 8]);
    }
    // 124–130: xe đang thêm hàng trăm — bóng mờ nhân đôi theo từng nhánh
    const extra = A.sm(t, 124.6, 128.0);
    if (extra > 0) {
      for (let i = 0; i < 28; i++) {
        const b = BRANCH[i % 4]!;
        const u = ((t * 0.07 + i * 0.113) % 1);
        truckOn(c, b, u, 0.9, 1, kinds[i % 8]);
      }
    }
    K.end(c);
  }

  private b(c: Ctx, t: number) {
    const cam = K.track(t, [
      [130.2, { x: 400, y: 0, z: 0.95 }],
      [146.0, { x: 700, y: 0, z: 0.8 }],
      [154.0, { x: 1050, y: 0, z: 0.62 }],
      [160.0, { x: 1300, y: 0, z: 0.54 }],
      [167.14, { x: 1300, y: 0, z: 0.54 }],
    ], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
    // bờ biển bên trái
    c.fillStyle = S.SEABG; c.fillRect(v.x0, v.y0, -480 - v.x0, v.y1 - v.y0);
    A.line(c, [[-480, v.y0], [-480, v.y1]], '#7fb3cf', A.px(c, 5));
    M.forest(c, 300, 340, 200, 4); M.forest(c, 900, -340, 200, 9); M.forest(c, 1700, 330, 240, 3); M.forest(c, 2300, -330, 230, 1); M.hill(c, 1500, -360, 230, 4, 2);
    // mặt trận di chuyển
    const f = xf(t);
    // khoảng trống / "cầu nối" giữa đầu mối cuối cùng và mặt trận (nền sọc)
    // đường hai làn một chiều
    const rb = rbPath(BASE[0], f);
    S.roadLine(c, [[BASE[0], GY0], [f, GY0]], 50);
    S.roadLine(c, [[BASE[0], GY1], [f, GY1]], 50);
    // mũi tên một chiều
    for (let x = BASE[0] + 150; x < f - 100; x += 320) {
      Cm.dimLine(c, x, x + 90, GY0, 1, '#475569', 5);
      Cm.dimLine(c, x + 90, x, GY1, 1, '#475569', 5);
    }
    // điểm đầu (bãi) và đầu cuối (kho tiền phương)
    S.depotTop(c, BASE[0] - 140, 0, 1.6);
    S.depotTop(c, f + 190, 0, 1.6);
    // mặt trận: các đơn vị
    M.unit(c, f + 480, -170, 'armor', 'ally', 250); M.unit(c, f + 480, 190, 'mech', 'ally', 250);
    M.unit(c, f + 960, -150, 'armor', 'foe', 220); M.unit(c, f + 960, 160, 'inf', 'foe', 210);
    // xe tải: số lượng tăng theo thời gian (hàng nghìn; sơ đồ)
    const n = Math.round(A.keys(t, [[130.4, 7], [138, 14], [146.6, 22], [160, 40]]));
    const L = 2 * (f - BASE[0]) + 480;
    const spd = 700;
    for (let i = 0; i < n; i++) {
      const ph = ((i / n) + (t * spd) / L) % 1;
      const u = ph;
      // vị trí theo vòng: 0–0.5 lượt đi (làn trên), 0.5–1 lượt về (làn dưới)
      let x: number, y: number, ang: number, load: number;
      if (u < 0.5) { const k = u / 0.5; x = A.lerp(BASE[0], f, k); y = GY0; ang = 0; load = 1; }
      else { const k = (u - 0.5) / 0.5; x = A.lerp(f, BASE[0], k); y = GY1; ang = Math.PI; load = 0; }
      const kinds: S.CrateKind[] = ['fuel', 'ammo', 'cargo', 'water'];
      S.truckTop(c, x, y, 0.95, { ang, load, kind: u < 0.5 ? kinds[i % 4]! : 'empty', body: u < 0.5 ? P.olive : P.slate, a: 1 - A.sm(t, 164.0, 166.4) });
    }
    // 160–167: cầu — dải nền sọc chỉ khoảng cách đã nối
    if (t > 158.3) {
      const k = A.sm(t, 158.3, 160.4);
      A.withA(c, k, () => {
        const gx0 = BASE[0] + 200, gx1 = f - 200;
        c.save(); c.setLineDash([22, 16]); A.line(c, [[gx0, -250], [gx1, -250]], 'rgba(30,41,59,0.55)', A.px(c, 6)); c.restore();
        Cm.dimLine(c, gx0, gx1, -230, 1, '#475569', 6);
      });
    }
    K.end(c);
    // cột "đến nơi / đã đốt" (UI màn hình) tăng khi mặt trận lùi xa
    if (t > 146.9) {
      const a = A.sm(t, 146.9, 148.0);
      const burned = A.keys(t, [[146.98, 0.18], [154.5, 0.45], [158.5, 0.58], [166, 0.6]]);
      A.withA(c, a, () => {
        A.rrect(c, 60, 230, 250, 640, 14, 'rgba(255,255,255,0.9)', INK, 3.4);
        S.loadColumn(c, 185, 750, 100, 440, burned);
        S.truckSide(c, 185, 820, 0.6, { load: 1 });
      });
    }
  }
}
