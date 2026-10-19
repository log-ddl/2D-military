import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { rig } from './shared/rig';
import { arrow, xMark } from './shared/ui';
import { smoke } from './shared/fx';

// Chương 3 (79.85–128): tầng trung → radar bị Trái đất che. NGANG; mặt đất cong dần từ 100 s.
const GY = 860;
const XR = 330;                         // chân radar
const KMAX = 0.00022;
const kAt = (t: number) => KMAX * A.sm(t, 99.5, 105.5);
const gY = (x: number, k: number) => GY + k * (x - XR) * (x - XR);

function earth(c: CanvasRenderingContext2D, cam: K.Cam, k: number) {
  const v = K.view(cam, 200);
  c.beginPath();
  c.moveTo(v.x0, v.y1 + 600);
  for (let x = v.x0; x <= v.x1; x += 40) c.lineTo(x, gY(x, k));
  c.lineTo(v.x1, gY(v.x1, k));
  c.lineTo(v.x1, v.y1 + 600);
  c.closePath();
  c.fillStyle = D.GROUND; c.fill();
  c.beginPath();
  for (let x = v.x0; x <= v.x1; x += 40) (x === v.x0 ? c.moveTo(x, gY(x, k)) : c.lineTo(x, gY(x, k)));
  c.strokeStyle = P.ink; c.lineWidth = 5; c.lineJoin = 'round'; c.stroke();
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const k = kAt(t);
    const hz = A.sm(t, 99.5, 105.5);
    const cam: K.Cam = { x: A.lerp(960, 1000, hz), y: A.lerp(540, 935, hz), z: A.lerp(1, 0.93, hz) };
    K.begin(c, cam);
    D.skyFill(c, cam, 3000);
    earth(c, cam, k);

    // ── 79.9–95.4: tầng trung ─────────────────────────────────────
    const showMed = t < 101;
    const medX = 760;
    if (showMed) {
      const fo = 1 - A.sm(t, 98.5, 100.4);
      // tầng dài còn mờ phía sau, vòm trung nổi lên
      D.dome(c, 300, GY, 700, P.olive, 0.05 * fo, A.eo(t, 79.9, 81), 4, 1550);
      const d30 = A.eo(t, 84.6, 86.6), d50 = A.eo(t, 86.9, 88.4);
      const grow = A.eo(t, 80.2, 83);
      D.dome(c, medX, GY, 340 * Math.min(d30 + 0.0, 1) + 0.01, P.olive, 0.16 * fo, d30 > 0 ? 1 : 0, 5, 620);
      D.dome(c, medX, GY, 520, P.olive, 0.07 * fo, d50, 5, 1020);
      // đường dọc: chân trời nhà - quân
      D.house(c, 110, GY, 1.3, fo); D.house(c, 250, GY, 1.1, fo);
      // xe: lái vào vị trí rồi dựng bệ
      const drive = A.eio(t, 80.2, 84.0);
      const lx = A.lerp(-300, medX, drive);
      const spin = 0;
      D.launcherSide(c, lx, GY, 1.7, { elev: 0.15 + 0.5 * A.sm(t, 83.4, 85.0), a: fo });
      // quân đang ngoài trận địa
      for (let i = 0; i < 3; i++) rig(c, { x: 1360 + i * 70, y: GY, s: 1.1, dir: -1, skin: 'ally', weapon: 'rifle', alpha: fo });
      D.gunSide(c, 1620, GY, 0.9, { elev: 0.1, dir: -1, a: fo });
      // thân dòng 30 / 50
      // bắn nhiều lần: "nơi bắn nhiều nhất"
      const wave = [[91.0, 1880, 380], [92.4, 1980, 520], [93.7, 1900, 270]] as const;
      wave.forEach(([th, x0, y0], i) => {
        const x = A.lerp(x0, 900 - i * 80, A.ph(t, th - 2.2, th + 0.2));
        const hit = th + 0.2;
        if (t < hit + 1.6) {
          const f = A.ph(t, hit, hit + 1.5);
          if (f <= 0) D.jetSide(c, x, y0, 0.95, { dir: -1 });
          else if (f < 1) { D.jetSide(c, x + f * -120, y0 + f * f * 500, 0.95, { dir: -1, a: 1 - f * f, pitch: f * 1.2 }); smoke(c, x - f * 120, y0 + f * f * 500, f * 1.5, 1, 5); }
        }
        if (t > th - 1.2) W.intercept(c, t, [medX + 160, GY - 190], [x, y0], th - 1.2, hit, { L: 90, boom: 80, bend: 120 });
      });
    }

    // ── radar + bệ phóng: phụ thuộc radar (95.4–101.6) ─────────────
    const radarT = A.eo(t, 95.2, 96.2);
    const rx = XR;
    if (t >= 95.2) {
      D.radarSide(c, rx, gY(rx, k), 1.15, { ph: t * 2.2, a: radarT });
      const ry = gY(rx, k) - 245;
      if (t < 101.4) {
        // liên kết radar → bệ phóng
        const lA = A.sm(t, 95.6, 96.4);
        W.link(c, [rx + 20, ry + 30], [medX - 120, GY - 140], P.amber, 5, lA * (1 - A.sm(t, 100.5, 101.4)), t);
        // chùm tia thẳng
        withA(c, A.sm(t, 96.6, 97.4) * (1 - A.sm(t, 100.8, 101.4)), () => {
          for (let i = 0; i < 3; i++) {
            const a = -0.18 + i * 0.16;
            line(c, [[rx + 20, ry], [rx + 20 + Math.cos(a) * 1500, ry + Math.sin(a) * 1500]], P.sky, 4, [18, 12]);
          }
        });
        // máy bay thấp bay dưới chùm, radar không thấy
        const lp = A.lerp(1950, 450, A.ph(t, 97.4, 101.4));
        D.jetSide(c, lp, GY - 120, 0.9, { dir: -1 });
        if (t > 98.8) withA(c, A.sm(t, 98.8, 99.8), () => xMark(c, rx + 520, ry - 30, 34, 1, P.slate, 8));
      }
    }

    // ── 101.6–128: đường nhìn radar trên mặt cong ─────────────────
    if (t >= 100.4) {
      const a0 = A.sm(t, 100.8, 102.4);
      const ry = gY(rx, k) - 245 + 15;      // độ cao anten
      const bx = rx + 20;
      // đường nhìn ngang (tiếp tuyến)
      withA(c, a0, () => line(c, [[bx, ry], [bx + 2200, ry]], P.sky, 5, [20, 12]));
      // vùng mù: dưới đường nhìn, trên mặt đất
      const blind = A.sm(t, 119.0, 122.6);
      if (blind > 0) {
        withA(c, blind * 0.38, () => {
          c.beginPath(); c.moveTo(bx + 30, ry);
          for (let x = bx + 30; x <= bx + 2200; x += 40) c.lineTo(x, gY(x, k));
          c.lineTo(bx + 2200, ry); c.closePath();
          c.fillStyle = '#94a3b8'; c.fill();
        });
      }
      // máy bay cao: thấy từ xa
      const hiX = A.lerp(2150, 1400, A.ph(t, 105.4, 109.6));
      if (t > 105.4 && t < 112.6) {
        D.jetSide(c, hiX, ry - 90, 0.9, { dir: -1 });
        const det = A.eo(t, 106.4, 107.2) * (1 - A.sm(t, 111.4, 112.4));
        W.bracket(c, hiX, ry - 90, 70, P.sky, det);
      }
      // máy bay thấp: luôn cách đất 40 px, bay vào
      const pos = A.keysLin(t, [[106.0, 2200], [112.0, 1900], [118.8, 1500], [124.0, bx + 640], [127.9, bx + 560]]);
      if (t > 105.6) {
        const gx = pos, gyp = gY(gx, k) - 40;
        const seen = gyp <= ry + 6;
        D.jetSide(c, gx, gyp, 0.9, { dir: -1, a: seen ? 1 : 0.85 });
        if (seen) W.bracket(c, gx, gyp, 70, P.sky, A.eo(t, 124.4, 125.0));
        // thước 50 m
        const r = A.eo(t, 116.0, 117.4) * (1 - A.sm(t, 119.4, 120.2));
        if (r > 0) withA(c, r, () => {
          const gxp = gx + 90;
          line(c, [[gxp, gyp + 20], [gxp, gY(gxp, k)]], P.ink, 6);
          line(c, [[gxp - 14, gyp + 20], [gxp + 14, gyp + 20]], P.ink, 6);
          line(c, [[gxp - 14, gY(gxp, k)], [gxp + 14, gY(gxp, k)]], P.ink, 6);
        });
        // thước khoảng cách từ radar tới chỗ thấy
        const kd = A.eo(t, 124.2, 126.6);
        if (kd > 0) withA(c, kd, () => {
          const yy = gY(bx, k) + 70;
          line(c, [[bx, yy], [bx + (gx - bx) * kd, yy]], P.ink, 5);
          line(c, [[bx, yy - 14], [bx, yy + 14]], P.ink, 5);
          line(c, [[bx + (gx - bx) * kd, yy - 14], [bx + (gx - bx) * kd, yy + 14]], P.ink, 5);
        });
      }
    }
    K.end(c);

    // callout số
    const [s30x, s30y] = K.toScreen(cam, medX + 620, GY);
    const [s50x, s50y] = K.toScreen(cam, medX + 1020, GY);
    if (t < 99.5) {
      D.tag(c, '30 km', s30x, s30y + 60, A.eo(t, 86.6, 87.2) * (1 - A.sm(t, 92, 93)));
      D.tag(c, '50 km', s50x - 20, s50y + 60, A.eo(t, 87.2, 87.8) * (1 - A.sm(t, 92, 93)));
    }
    if (t > 116 && t < 120.4) {
      const gx = A.keysLin(t, [[106.0, 2200], [112.0, 1900], [118.8, 1500], [124.0, 970]]);
      const [sx, sy] = K.toScreen(cam, gx + 90, gY(gx, k) - 20);
      D.tag(c, '50 m', sx + 90, sy - 70, A.eo(t, 116.3, 117.0) * (1 - A.sm(t, 119.4, 120.2)));
    }
  }
}
