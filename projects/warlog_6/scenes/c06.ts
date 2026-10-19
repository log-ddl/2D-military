import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { rig } from './shared/rig';
import { arrow, xMark, bar } from './shared/ui';

// Chương 6 (213–238.5): tốc độ và quyết định. TRÊN XUỐNG rồi sơ đồ quy trình.
const BAT: A.Pt = [480, 600];
const R = 760;
const START: A.Pt = [1315, 339];
const END: A.Pt = [520, 470];
const jetPos = (t: number): A.Pt => { const p = A.ph(t, 213, 227.7); return [A.lerp(START[0], END[0], p), A.lerp(START[1], END[1], p)]; };
const ang = Math.atan2(END[1] - START[1], END[0] - START[0]);

function doc(c: CanvasRenderingContext2D, x: number, y: number, s = 1, ck = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  rrect(c, -50, -64, 100, 128, 10, '#fff', P.ink, 4);
  for (let i = 0; i < 4; i++) line(c, [[-30, -36 + i * 22], [30, -36 + i * 22]], P.light, 6);
  if (ck > 0) {
    const e = A.clamp01(ck);
    line(c, [[-22, 40], [-6 , 40 + 0 * e], ], 'rgba(0,0,0,0)', 1);
    c.beginPath(); c.moveTo(-26, 38); c.lineTo(-10, 54 * (0.7 + 0.3 * e)); c.lineTo(8 + 18 * e, 22);
    c.strokeStyle = P.olive; c.lineWidth = 9; c.lineCap = 'round'; c.stroke();
  }
  c.restore();
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 228.0) { this.map(c, t); return; }
    this.flow(c, t);
  }

  private map(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    W.topBg(c, cam);
    // vòng 30 km của bệ
    const rg = A.eo(t, 216.6, 218.0);
    W.rangeRing(c, BAT[0], BAT[1], R, P.sky, 1, { fill: 0.05, lw: 5, a: 1 });
    D.radarTop(c, BAT[0] - 60, BAT[1] - 70, 2.0, { ph: t * 2.4 });
    const fired = t > 226.3;
    D.launcherTop(c, BAT[0] + 20, BAT[1] + 70, -0.5, 2.0, { loaded: fired ? 1 : 2 });
    const [jx, jy] = jetPos(t);
    const hit = 227.7;
    if (t < hit) {
      // vệt tốc độ
      for (let i = 0; i < 4; i++) {
        const o = 80 + i * 55;
        withA(c, 0.6 - i * 0.12, () => line(c, [[jx + Math.cos(ang + Math.PI) * o, jy + Math.sin(ang + Math.PI) * o + (i - 1.5) * 18], [jx + Math.cos(ang + Math.PI) * (o + 90), jy + Math.sin(ang + Math.PI) * (o + 90) + (i - 1.5) * 18]], P.ink2, 4));
      }
      D.planeTop(c, jx, jy, ang, 2.2, { side: 'atk' });
      // bước 1: nhận ra thù địch
      const h = A.eo(t, 223.0, 223.8);
      if (h > 0) withA(c, h, () => {
        W.bracket(c, jx, jy, 80, P.sky, h);
        c.save(); c.translate(jx, jy - 120);
        poly(c, [[0, -30], [36, 0], [0, 30], [-36, 0]], '#f2a7a0', P.ink, 5);
        c.restore();
      });
      // bước 2: chọn tên lửa (ống sáng) + đường ngắm
      const sel = A.eo(t, 224.6, 225.4);
      if (sel > 0) withA(c, sel, () => {
        line(c, [[BAT[0] + 60, BAT[1] + 20], [jx, jy]], P.amber, 5, [14, 10]);
        circle(c, BAT[0] + 20, BAT[1] + 70, 66, null, P.amber, 6);
      });
    }
    // bước 3: bắn
    if (t > 226.4) W.intercept(c, t, [BAT[0] + 60, BAT[1] + 20], jetPos(hit), 226.4, hit, { L: 90, boom: 110, bend: 40 });
    if (t >= hit) {
      const f = A.ph(t, hit, hit + 1.2);
      if (f < 1) D.planeTop(c, jetPos(hit)[0] + f * -50, jetPos(hit)[1] + f * 60, ang + f * 2.4, 2.2 * (1 - f * 0.5), { side: 'atk', a: 1 - f });
    }
    // đồng hồ một phút (góc phải)
    const ck = A.eo(t, 214.4, 215.2);
    if (ck > 0) withA(c, ck, () => {
      c.save(); c.translate(1680, 220);
      circle(c, 0, 0, 120, '#fff', P.ink, 6);
      const p = A.ph(t, 215.6, 227.4);
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 112, -Math.PI / 2, -Math.PI / 2 + p * Math.PI * 2); c.closePath();
      c.fillStyle = P.amber; c.fill();
      for (let i = 0; i < 12; i++) { const g = i / 12 * Math.PI * 2; line(c, [[Math.cos(g) * 100, Math.sin(g) * 100], [Math.cos(g) * 112, Math.sin(g) * 112]], P.ink, 4); }
      circle(c, 0, 0, 120, null, P.ink, 6);
      c.restore();
    });
    K.end(c);
    // con số
    const [rx, ry] = K.toScreen(cam, BAT[0] + R * Math.cos(-0.45), BAT[1] + R * Math.sin(-0.45));
    D.tag(c, '500 m/s', 1120, 150, A.eo(t, 215.4, 216.0) * (1 - A.sm(t, 221.0, 222.0)));
    D.tag(c, '30 km', rx - 30, ry + 40, A.eo(t, 217.4, 218.0) * (1 - A.sm(t, 222.4, 223.0)));
  }

  private flow(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    W.topBg(c, cam);
    // đường ống: radar → máy tính → bệ phóng
    const Y = 460;
    const nodes: A.Pt[] = [[300, Y], [960, Y], [1620, Y]];
    const a0 = A.eo(t, 228.0, 229.0);
    withA(c, a0, () => {
      line(c, [nodes[0]!, nodes[2]!], P.ink, 8);
      D.radarTop(c, nodes[0]![0], Y, 2.4, { ph: t * 2.4 });
      rrect(c, 960 - 90, Y - 90, 180, 180, 28, '#fff', P.ink, 5);
      // bánh răng đơn giản
      c.save(); c.translate(960, Y); c.rotate(t * 1.2);
      for (let i = 0; i < 8; i++) { c.rotate(Math.PI / 4); rrect(c, -10, -64, 20, 30, 4, P.slate, P.ink, 3); }
      circle(c, 0, 0, 44, P.slate, P.ink, 4);
      circle(c, 0, 0, 18, '#fff', P.ink, 4);
      c.restore();
      D.launcherTop(c, nodes[2]![0], Y, 0, 2.4);
      // xung chạy nhanh dần theo tốc độ đe doạ
      const sp = A.lerp(0.6, 2.2, A.sm(t, 231.2, 235.0));
      for (let i = 0; i < 3; i++) W.pulse(c, nodes[0]!, nodes[2]!, t, sp, i / 3, P.amber, 12);
    });
    // người có quyền phủ quyết: đứng trên nút giữa
    const hp = A.eo(t, 229.0, 229.8) * (1 - A.sm(t, 232.4, 233.6));
    if (hp > 0) withA(c, hp, () => {
      rig(c, { x: 960, y: 355, s: 2.2, dir: 1, skin: 'civil', weapon: null, aim: 0.8 });
      const v = A.bump(t, 230.2, 1.2);
      if (v > 0) { rrect(c, 960 - 90, Y - 110, 180, 16, 4, P.enemy, P.ink, 3); xMark(c, 960, Y, 60, A.eo(t, 230.5, 231.0), P.enemy, 12); }
    });
    // đường thời gian: nhiều tuần trước vs một phút
    const tl = A.eo(t, 232.6, 234.0);
    if (tl > 0) withA(c, tl, () => {
      const y = 840;
      // trục
      line(c, [[160, y], [1760, y]], P.ink, 8);
      rrect(c, 160, y - 40, 1180, 80, 20, '#dbe7d0', P.ink, 4);
      rrect(c, 1640, y - 40, 120, 80, 20, '#f7d9d3', P.ink, 4);
      // mốc ngày
      for (let i = 0; i < 12; i++) line(c, [[220 + i * 100, y - 40], [220 + i * 100, y - 18]], P.ink2, 4);
      doc(c, 520, y - 170, 1.4, A.eo(t, 234.8, 236.0));
      // một phút (nhỏ)
      D.launcherTop(c, 1700, y - 120, 0, 1.0);
      const s = A.eo(t, 236.0, 237.4);
      withA(c, s, () => arrow(c, [640, y - 150], [1180, y - 150], { color: P.olive, w: 8 }));
    });
    K.end(c);
  }
}
