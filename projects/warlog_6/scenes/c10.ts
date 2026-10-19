import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { withA, line, circle, rrect, poly, capsule } from './shared/art';
import { P } from './shared/palette';
import * as D from './_ad';
import * as W from './_c';
import { xMark, arrow } from './shared/ui';

// Chương 10 (385.3–436.1): băng đạn cạn + đối xứng tấn công/phòng thủ. TRÊN XUỐNG.
const BAT: A.Pt = [640, 640];
const CITY: A.Pt = [1500, 880];
const NR = 8;
const T_LAUNCH = (i: number) => 395.3 + 0.42 * i;

function strip(c: CanvasRenderingContext2D, x: number, y: number, filled: number, scale = 1, a = 1) {
  withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(scale, scale);
    rrect(c, -330, -70, 660, 140, 20, '#fff', P.ink, 5);
    for (let i = 0; i < NR; i++) {
      const sx = -280 + i * 80;
      rrect(c, sx - 26, -50, 52, 100, 10, '#eef2f6', P.light, 3);
      if (i < filled) D.missile(c, sx, 0, -Math.PI / 2, 84, {});
    }
    c.restore();
  });
}
function crane(c: CanvasRenderingContext2D, x: number, y: number, ang: number, s = 1) {
  c.save(); c.translate(x, y); c.scale(s, s);
  rrect(c, -90, -36, 180, 72, 12, P.oliveDark, P.ink, 5);
  rrect(c, 40, -30, 44, 60, 8, P.oliveLight, P.ink, 3.5);
  c.save(); c.translate(-20, 0); c.rotate(ang);
  line(c, [[0, 0], [150, 0]], P.ink, 12); line(c, [[0, 0], [150, 0]], P.amber, 6);
  circle(c, 150, 0, 12, P.amber, P.ink, 3);
  c.restore();
  circle(c, -20, 0, 18, P.slate, P.ink, 4);
  c.restore();
}

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    W.topBg(c, cam);
    if (t < 409.2) this.mag(c, t); else this.country(c, t);
    K.end(c);
  }

  private mag(c: CanvasRenderingContext2D, t: number) {
    // thành phố cần bảo vệ
    for (let i = 0; i < 6; i++) rrect(c, CITY[0] - 130 + (i % 3) * 90, CITY[1] - 60 + Math.floor(i / 3) * 80, 72, 60, 8, '#f1e6c8', P.ink, 4);
    // số đạn còn
    let fired = 0;
    for (let i = 0; i < NR; i++) if (t >= T_LAUNCH(i)) fired++;
    const left = NR - fired;
    W.rangeRing(c, BAT[0], BAT[1], 380, P.olive, 1, { fill: 0.07, lw: 5 });
    D.radarTop(c, BAT[0] - 120, BAT[1] + 110, 2.1, { ph: t * 2.4 });
    D.launcherTop(c, BAT[0], BAT[1], -Math.PI / 2 + 0.2, 2.4, { big: true, loaded: Math.ceil(left / 2) });
    // băng đạn: nằm trên cùng khi cần
    const sc = A.lerp(1, 1.5, A.sm(t, 402.8, 404.2));
    const sx = A.lerp(1480, 960, A.sm(t, 402.8, 404.2)), sy = A.lerp(130, 420, A.sm(t, 402.8, 404.2));
    strip(c, sx, sy, left, sc, A.eo(t, 385.6, 386.4));
    // 389–394: xe tiếp đạn + cẩu + kíp: chậm
    const rl = A.eo(t, 389.1, 391.4) * (1 - A.sm(t, 395.4, 396.0));
    if (rl > 0) {
      const x = A.lerp(2050, 960, rl), y = 800;
      crane(c, x, y, -0.7 + 0.5 * A.sm(t, 391.4, 393.6), 1.5);
      for (let i = 0; i < 3; i++) D.soldierTop(c, x - 140 - i * 46, y + 50 - i * 30, 0, 1.6, { tube: false });
      // thanh tiến độ "lâu": vòng chậm
      const p = A.ph(t, 391.6, 394.4);
      rrect(c, x - 120, y + 90, 240, 30, 15, '#fff', P.ink, 4);
      rrect(c, x - 116, y + 94, 232 * p * 0.18 + 8, 22, 11, P.amber, null, 0);
    }
    // làn sóng 1: 10 mục tiêu rẻ từ trên xuống
    const w1 = (i: number): A.Pt => [A.lerp(260 + i * 140, 520 + i * 90, A.ph(t, 393.6, 401.4)), A.lerp(-120 - (i % 3) * 60, 760, A.ph(t, 393.6 + (i % 3) * 0.2, 401.4))];
    for (let i = 0; i < 10; i++) {
      const killAt = i < NR ? T_LAUNCH(i) + 1.25 : 999;
      const [x, y] = w1(i);
      if (t < killAt) D.planeTop(c, x, y, Math.PI / 2 + 0.2, 1.7, { side: 'atk', kind: 'drone' });
      else if (t < killAt + 1) { const f = A.ph(t, killAt, killAt + 1); D.bang(c, x, y, 60, A.ph(t, killAt, killAt + 0.6)); }
      if (i < NR && t >= T_LAUNCH(i) && t < killAt + 0.1) W.intercept(c, t, [BAT[0], BAT[1] - 30], [w1(i)[0] + 0, w1(i)[1]], T_LAUNCH(i), killAt, { L: 80, boom: 0, bend: 0 });
    }
    // làn sóng 2: máy bay thật bay thẳng tới thành phố
    const w2 = (i: number): A.Pt => [A.lerp(1000 + i * 250, 1260 + i * 130, A.ph(t, 399.0, 402.2)), A.lerp(-100, CITY[1] - 30, A.ph(t, 399.0, 402.2))];
    if (t > 398.9) for (let i = 0; i < 3; i++) {
      const [x, y] = w2(i);
      if (t < 402.2 + i * 0.15) D.planeTop(c, x, y, Math.PI / 2 + 0.25, 1.0, { side: 'atk', kind: 'bomber' });
      else D.bang(c, x, y, 110, A.ph(t, 402.2 + i * 0.15, 403.0 + i * 0.15));
    }
    // 402.7–408.6: số quan trọng là đạn còn lại
    const emp = A.eo(t, 403.4, 404.4);
    if (emp > 0) {
      // vòng tầm bị gạch mờ
      withA(c, emp * 0.9, () => xMark(c, BAT[0], BAT[1], 140, A.eo(t, 404.2, 405.2), P.enemy, 12));
      arrow(c, [1100, 140], [1100, 300], { color: P.enemy, w: 10, p: A.eo(t, 405.0, 406.0) });
      rrect(c, 960 - 360 * sc / 1.5, sy - 78, 720 * sc / 1.5, 156, 22, null, P.enemy, 8);
    }
  }

  private country(c: CanvasRenderingContext2D, t: number) {
    // đất nước: khối nền
    const outline: A.Pt[] = [[260, 300], [560, 130], [980, 100], [1380, 160], [1680, 340], [1720, 640], [1500, 900], [1020, 990], [560, 950], [280, 760], [180, 520]];
    c.beginPath(); outline.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
    c.fillStyle = '#e7e1c4'; c.fill(); c.lineWidth = 7; c.strokeStyle = P.ink; c.lineJoin = 'round'; c.stroke();
    const small: A.Pt[] = [[420, 380], [760, 250], [1180, 260], [1560, 440], [1400, 560], [820, 460], [440, 700], [820, 840], [1180, 860], [1560, 760], [300, 560], [1020, 600]];
    const cap: A.Pt = [960, 400], plant: A.Pt = [600, 640], base: A.Pt = [1340, 720];
    const house = (p: A.Pt, s = 1) => rrect(c, p[0] - 26 * s, p[1] - 20 * s, 52 * s, 40 * s, 6, '#f1e6c8', P.ink, 3.5);
    small.forEach((p) => house(p));
    // thủ đô, nhà máy điện, căn cứ
    for (let i = 0; i < 4; i++) house([cap[0] - 50 + (i % 2) * 70, cap[1] - 30 + Math.floor(i / 2) * 60], 1.1);
    rrect(c, plant[0] - 50, plant[1] - 36, 100, 72, 8, '#cbd2da', P.ink, 4); rrect(c, plant[0] + 20, plant[1] - 60, 22, 44, 4, '#94a3b8', P.ink, 3);
    line(c, [[base[0] - 90, base[1]], [base[0] + 90, base[1]]], P.ink, 14); line(c, [[base[0] - 90, base[1]], [base[0] + 90, base[1]]], '#fff', 4, [20, 16]);

    // 409.3–416: kẻ tấn công chọn thời điểm, nơi chốn, số lượng: ~100 mục tiêu tới một điểm
    if (t < 416.2) {
      const a = A.ph(t, 409.6, 415.4);
      for (let i = 0; i < 100; i++) {
        const r = A.rnd(i + 3), r2 = A.rnd(i * 7 + 11);
        const sx = -50 + (i % 20) * 40, sy = -80 - Math.floor(i / 20) * 70;
        const ex = plant[0] + (r - 0.5) * 140, ey = plant[1] + (r2 - 0.5) * 140;
        const p = A.clamp01(a * 1.2 - r * 0.2);
        D.planeTop(c, A.lerp(sx, ex, p), A.lerp(sy, ey, p), Math.atan2(ey - sy, ex - sx), 1.0, { side: 'atk', kind: 'drone' });
      }
    }
    // 416–421: phòng thủ phải che cả nước: vòng nhỏ rải đều, hở
    const ph = A.eo(t, 416.2, 418.4) * (1 - A.sm(t, 421.2, 422.2) * 0);
    if (t >= 416.2 && t < 421.6) {
      const sites = [...small, cap, plant, base];
      sites.forEach((p, i) => W.rangeRing(c, p[0], p[1], 90 * ph, P.olive, 1, { fill: 0.12, lw: 3.5, a: 1 }));
      // gạch bỏ ý "tốt ở mọi nơi"
      const x = A.eo(t, 419.2, 420.4);
      if (x > 0) xMark(c, 960, 560, 360, x, P.enemy, 18);
    }
    // 421.4–426.4: bảo vệ vài thứ thật kỹ, chấp nhận trúng phần còn lại
    if (t >= 421.4) {
      const pr = (p: A.Pt, k: number) => {
        const e = A.eo(t, 421.6 + k * 0.5, 422.6 + k * 0.5);
        W.rangeRing(c, p[0], p[1], 150 * e, P.olive, 1, { fill: 0.22, lw: 9, dash: false });
        D.dome(c, p[0], p[1] + 0, 0, P.olive, 0, 0, 0);
      };
      pr(cap, 0); pr(plant, 1); pr(base, 2);
      // phần còn lại bị đánh dấu trúng
      const hitsAt = [423.6, 424.3, 425.0, 425.7];
      const spots: A.Pt[] = [small[0]!, small[3]!, small[7]!, small[10]!];
      spots.forEach((p, i) => {
        const f = A.ph(t, hitsAt[i]! - 0.0, hitsAt[i]! + 0.8);
        if (f > 0) D.bang(c, p[0], p[1], 70, f);
        if (f >= 1) { circle(c, p[0], p[1], 20, '#6b6f78', P.ink, 3); }
      });
      // tên lửa/máy bay tới các điểm đó
      spots.forEach((p, i) => {
        const h = hitsAt[i]!;
        const pp = A.ph(t, h - 1.4, h);
        if (pp > 0 && pp < 1) D.planeTop(c, A.lerp(p[0] + (i % 2 ? 500 : -500), p[0], pp), A.lerp(-100, p[1], pp), Math.atan2(p[1] + 100, (i % 2 ? -500 : 500)), 1.4, { side: 'atk', kind: 'drone' });
      });
    }
    // 429.5–435.7: lựa chọn viết trước báo động
    const tl = A.eo(t, 429.6, 430.8);
    if (tl > 0) withA(c, tl, () => {
      rrect(c, 160, 960, 1600, 80, 24, '#fff', P.ink, 4);
      rrect(c, 170, 970, 1260, 60, 18, '#dbe7d0', null, 0);
      // thẻ bảo vệ: thủ đô, nhà máy, căn cứ hiện trên trục
      [[320, cap], [620, plant], [920, base]].forEach(([x, p], i) => {
        const e = A.eo(t, 431.0 + i * 0.5, 431.8 + i * 0.5);
        if (e <= 0) return;
        withA(c, e, () => {
          circle(c, x as number, 1000, 24, P.olive, P.ink, 4);
          c.beginPath(); c.moveTo((x as number) - 10, 1000); c.lineTo((x as number) - 2, 1010); c.lineTo((x as number) + 12, 990); c.strokeStyle = '#fff'; c.lineWidth = 5; c.stroke();
        });
      });
      // báo động ở cuối
      const al = A.eo(t, 434.2, 435.0);
      if (al > 0) { circle(c, 1650, 1000, 30, P.enemy, P.ink, 4); ring(c, 1650, 1000, 80, A.ph(t, 434.4, 435.6), P.enemy, 5); }
    });
  }
}
function ring(c: CanvasRenderingContext2D, x: number, y: number, r: number, p: number, color: string, w = 5) {
  if (p <= 0 || p >= 1) return;
  withA(c, 1 - p, () => circle(c, x, y, r * (0.2 + 0.8 * p), null, color, w));
}
