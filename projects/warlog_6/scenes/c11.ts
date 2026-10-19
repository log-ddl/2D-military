import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { xMark, arrow } from './shared/ui';

// Chương 11 (436.15–478.5): thước đo đúng + quay lại hình mở đầu. TRÊN XUỐNG; có inset ngang cho "bay thấp".
const SITE: A.Pt = [600, 560];
const R = 340;
const CITY: A.Pt = [560, 560];
const B: A.Pt = [700, 600], LCH: A.Pt = [590, 735];   // hình hook (như c01)

function tick(c: CanvasRenderingContext2D, x: number, y: number, kind: 'kill' | 'turn', a = 1) {
  withA(c, a, () => {
    if (kind === 'kill') { D.planeTop(c, x, y, -Math.PI / 2, 0.8, { side: 'atk' }); xMark(c, x, y, 20, 1, P.enemy, 6); }
    else { D.planeTop(c, x, y, -Math.PI / 2, 0.8, { side: 'atk', a: 0.35 }); circle(c, x, y, 28, null, P.olive, 4); }
  });
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    W.topBg(c, cam);
    if (t < 458.9) this.measure(c, t); else this.callback(c, t);
    K.end(c);
    if (t > 460.2 && t < 463.8) D.tag(c, '400 km', 1260, 450, A.eo(t, 460.5, 461.1) * (1 - A.sm(t, 463.2, 463.8)));
  }

  private site(c: CanvasRenderingContext2D, t: number, a = 1) {
    // trận địa + thành phố bên trong vòng
    W.rangeRing(c, SITE[0], SITE[1], R, P.olive, 1, { fill: 0.08, lw: 5, a });
    for (let i = 0; i < 4; i++) rrect(c, CITY[0] - 70 + (i % 2) * 70, CITY[1] - 52 + Math.floor(i / 2) * 64, 56, 48, 7, '#f1e6c8', P.ink, 4);
    D.radarTop(c, SITE[0] + 140, SITE[1] - 120, 1.9, { ph: t * 2.4, a });
    D.launcherTop(c, SITE[0] + 160, SITE[1] + 90, -0.3, 1.9, { a });
  }

  private measure(c: CanvasRenderingContext2D, t: number) {
    this.site(c, t);
    // bảng đếm: bắn hạ vs ngăn được
    const pn = A.eo(t, 438.6, 439.4);
    if (pn > 0) withA(c, pn, () => {
      rrect(c, 1180, 40, 700, 220, 22, '#fff', P.ink, 4);
      // hàng 1: bị bắn hạ
      circle(c, 1235, 100, 22, P.enemy, P.ink, 3);
      for (let i = 0; i < 3; i++) { const e = A.eo(t, [440.5, 441.1, 441.7][i]! + 0.1, [440.5, 441.1, 441.7][i]! + 0.6); if (e > 0) tick(c, 1330 + i * 90, 100, 'kill', e); }
      // hàng 2: không bao giờ tới
      circle(c, 1235, 200, 22, P.olive, P.ink, 3);
      for (let i = 0; i < 5; i++) { const e = A.eo(t, 443.0 + i * 0.4, 443.5 + i * 0.4); if (e > 0) tick(c, 1330 + i * 90, 200, 'turn', e); }
    });
    // 438.6–441.8: ba kẻ vào vòng, bị bắn hạ
    for (let i = 0; i < 3; i++) {
      const hit = [440.5, 441.1, 441.7][i]!;
      const pr = A.ph(t, 438.4 + i * 0.3, hit);
      const sx = 1960, sy = 200 + i * 300, ex = 760 + i * 60, ey = 460 + i * 80;
      const pos: A.Pt = [A.lerp(sx, ex, pr), A.lerp(sy, ey, pr)];
      const ang = Math.atan2(ey - sy, ex - sx) + Math.PI;
      if (t > 438.3 && t < hit) D.planeTop(c, pos[0], pos[1], ang, 1.7, { side: 'atk' });
      else if (t >= hit && t < hit + 0.8) D.bang(c, pos[0], pos[1], 80, A.ph(t, hit, hit + 0.8));
      if (t > hit - 1.4 && t < hit + 0.1) W.intercept(c, t, [SITE[0] + 160, SITE[1] + 70], [A.lerp(sx, ex, 1), A.lerp(sy, ey, 1)], hit - 1.4, hit, { L: 70, boom: 0, bend: 0 });
    }
    // 442–444.6: kẻ khác tới mép vòng rồi quay lại (không bị bắn)
    for (let i = 0; i < 5; i++) {
      const t0 = 442.0 + i * 0.4;
      const ya = 140 + i * 190;
      const edge: A.Pt = [SITE[0] + Math.cos(-0.7 + i * 0.35) * (R + 120), SITE[1] + Math.sin(-0.7 + i * 0.35) * (R + 120)];
      const p = A.ph(t, t0 - 1.6, t0 + 0.8);
      if (t > t0 - 1.6 && t < t0 + 3.2) {
        const q = A.eio(p, 0, 1);
        const turn = A.sm(p, 0.75, 1.0);
        const x = p < 1 ? A.lerp(1980, edge[0], q) : A.lerp(edge[0], 2100, A.ph(t, t0 + 0.8, t0 + 3.2));
        const y = p < 1 ? A.lerp(ya, edge[1], q) : A.lerp(edge[1], ya - 100, A.ph(t, t0 + 0.8, t0 + 3.2));
        D.planeTop(c, x, y, p < 1 ? Math.atan2(edge[1] - ya, edge[0] - 1980) + Math.PI : Math.atan2(ya - 100 - edge[1], 2100 - edge[0]) + Math.PI, 1.7, { side: 'atk', a: 1 - 0.5 * (t > t0 + 0.8 ? 1 : 0) });
      }
    }
    // 444.8–451.4: cách người bay chọn: thấp, vòng xa, quay lại (không phát tên lửa nào)
    if (t > 444.6) {
      const f = A.sm(t, 444.6, 445.4);
      // bảng đếm mờ đi
      const lowIn = A.eo(t, 445.0, 445.8) * (1 - A.sm(t, 447.0, 447.8));
      if (lowIn > 0) {
        c.save(); c.translate(1180 , 500 + (1 - lowIn) * 600);
        rrect(c, 0, 0, 660, 360, 20, '#eef5fa', P.ink, 5);
        c.beginPath(); c.roundRect(0, 0, 660, 360, 20); c.clip();
        c.fillStyle = D.GROUND; c.fillRect(0, 290, 660, 80);
        line(c, [[0, 290], [660, 290]], P.ink, 5);
        // chùm radar bay cao ở trên, phi công thấp bên dưới
        withA(c, 0.8, () => line(c, [[0, 120], [660, 60]], P.sky, 6, [16, 12]));
        D.jetSide(c, A.lerp(700, -80, A.ph(t, 445.4, 447.6)), 252, 0.8, { dir: -1 });
        c.restore();
      }
      // đường vòng xa
      const arcT = A.ph(t, 447.2, 450.2);
      if (arcT > 0) {
        const pts: A.Pt[] = [[1980, 120], [1500, 60], [900, 40], [350, 120], [150, 380], [200, 640]];
        const [x, y, a] = W.along(pts, A.eio(arcT, 0, 1));
        const seg: A.Pt[] = []; for (let i = 0; i <= 50; i++) { const r = W.along(pts, (i / 50) * A.eio(arcT, 0, 1)); seg.push([r[0], r[1]]); }
        withA(c, 0.8, () => line(c, seg, P.enemy, 6, [18, 12]));
        if (arcT < 1) D.planeTop(c, x, y, a + Math.PI, 1.7, { side: 'atk' });
      }
    }
    // 451.7–458.7: sản phẩm thật: một tuyến địch không đi
    const rt = A.eo(t, 452.0, 453.2);
    if (rt > 0) {
      withA(c, rt, () => {
        line(c, [[1980, 560], [SITE[0] + 60, SITE[1]]], P.slate, 12, [26, 18]);
        const x = A.eo(t, 454.4, 455.6);
        xMark(c, 1100, 560, 90, x, P.enemy, 16);
        // sáng nhẹ
        withA(c, 0.25 + 0.15 * Math.sin(t * 3), () => line(c, [[1980, 560], [SITE[0] + 60, SITE[1]]], P.enemy, 40));
      });
    }
  }

  private callback(c: CanvasRenderingContext2D, t: number) {
    // hình hook: vòng radar 400 km (lớn) và vòng tên lửa nhỏ
    const rr = A.eo(t, 459.0, 460.6);
    const R_RADAR = 560, R_MIS = 140;
    W.rangeRing(c, B[0], B[1], R_RADAR, P.sky, rr, { fill: 0.07, a: 0.95 });
    W.rangeRing(c, LCH[0], LCH[1], R_MIS, P.olive, A.eo(t, 461.0, 462.0), { fill: 0.16 });
    if (t < 462.0 || t > 463.7) { /* giữ */ }
    D.radarTop(c, B[0], B[1], 2.0, { ph: t * 2.4 });
    D.launcherTop(c, LCH[0], LCH[1], -0.35, 2.0);
    // 463.9–471.6: các tầng + mạng lấp khoảng trống
    const layers = [
      { r: 430, t0: 464.2, kind: 'big' as const, ang: -0.55 },
      { r: 300, t0: 465.6, kind: 'med' as const, ang: 0.05 },
      { r: 190, t0: 466.8, kind: 'gun' as const, ang: 0.75 },
      { r: 95, t0: 467.8, kind: 'sol' as const, ang: 1.35 },
    ];
    layers.forEach((L, i) => {
      const e = A.eo(t, L.t0, L.t0 + 0.9);
      if (e <= 0) return;
      W.rangeRing(c, B[0], B[1], L.r * e, [P.oliveDark, P.olive, '#8aa05a', P.oliveLight][i]!, 1, { fill: 0.06, lw: 4.5 });
      const px = B[0] + Math.cos(L.ang) * L.r, py = B[1] + Math.sin(L.ang) * L.r;
      if (L.kind === 'big') D.launcherTop(c, px, py, 0.3, 1.6, { big: true, a: e });
      if (L.kind === 'med') D.launcherTop(c, px, py, 0.3, 1.5, { a: e });
      if (L.kind === 'gun') D.gunTop(c, px, py, 0.3, 1.3, { a: e });
      if (L.kind === 'sol') D.soldierTop(c, px, py, 0.3, 1.9, { a: e });
      if (t > 468.4) W.link(c, [px, py], B, P.amber, 4, A.sm(t, 468.4, 469.6), t);
    });
    if (t > 468.4) W.hub(c, B[0] + 220, B[1] - 330, 1.4, A.sm(t, 468.4, 469.6));
    if (t > 468.4) W.link(c, [B[0] + 220, B[1] - 330], B, P.amber, 4, A.sm(t, 468.4, 469.6), t);
    // 471.8–478.5: vùng trời quá đắt để vào: tô vùng đỏ nhạt, kẻ địch vòng tránh
    const hz = A.eo(t, 472.0, 474.6);
    if (hz > 0) {
      withA(c, hz * 0.28, () => { circle(c, B[0], B[1], 560, P.enemy, null, 0); });
      withA(c, hz * 0.8, () => circle(c, B[0], B[1], 560, null, P.enemy, 8));
    }
    // máy bay đi vòng quanh vùng
    if (t > 474.7) {
      const pts: A.Pt[][] = [
        [[1980, 250], [1500, 120], [1000, 40], [480, 70], [160, 250], [60, 520]],
        [[1980, 860], [1500, 1000], [1000, 1060], [480, 1010], [160, 860], [60, 640]],
      ];
      pts.forEach((p, i) => {
        const pr = A.ph(t, 474.7 + i * 0.4, 478.4);
        const [x, y, a] = W.along(p, pr);
        const seg: A.Pt[] = []; for (let k = 0; k <= 40; k++) { const r = W.along(p, (k / 40) * pr); seg.push([r[0], r[1]]); }
        withA(c, 0.8, () => line(c, seg, P.enemy, 5, [16, 12]));
        D.planeTop(c, x, y, a + Math.PI, 1.8, { side: 'atk' });
      });
    }
    // đường bay cũ: máy bay bay sâu tới, nay bị chặn
    if (t > 471.8 && t < 474.7) {
      const pr = A.ph(t, 471.8, 473.6);
      D.planeTop(c, A.lerp(1960, 1330, pr), A.lerp(300, 360, pr), Math.PI + 0.1, 1.8, { side: 'atk', a: 1 - A.sm(t, 473.4, 474.4) });
    }
  }
}
