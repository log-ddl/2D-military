// Chương 7 (300 – 367.9): im lặng. Âm truyền xa trong nước → mỗi máy là một "giọng" → đệm, chân vịt, ngói → sâu hơn thì êm hơn → chậm.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain } from './_c';

const CUTS = [308.9, 314.7, 319.5, 322.3, 331.0, 340.0, 356.0];

export default class S07 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 308.9) this.heard(c, t);
    else if (t < 314.7) this.speed(c, t);
    else if (t < 319.5) this.voices(c, t);
    else if (t < 322.3) this.mounts(c, t);
    else if (t < 331.0) this.prop(c, t);
    else if (t < 340.0) this.tiles(c, t);
    else if (t < 356.0) this.deeper(c, t);
    else this.slow(c, t);
    for (const at of CUTS) S.cutDip(c, t, at, 0.12);
    chain(c, t);
  }

  // 300 – 308.9: kẻ thù nghe thấy
  private heard(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cde3ee');
    for (let x = 0; x <= A.W; x += 120) A.line(c, [[x, 0], [x, A.H]], 'rgba(60,110,140,0.14)', 2);
    for (let y = 0; y <= A.H; y += 120) A.line(c, [[0, y], [A.W, y]], 'rgba(60,110,140,0.14)', 2);
    S.drawSubTop(c, t, { x: 560, y: 520, s: 0.5 });
    S.drawSubTop(c, t, { x: 1500, y: 360, s: 0.5, color: P.enemy, rot: Math.PI });
    const r = 1100, per = 2.2;
    for (let i = 0; i < 3; i++) {
      const ph = (((t - 302.4) / per) + i / 3) % 1;
      if (t > 302.4) A.withA(c, (1 - ph) * 0.85 * A.sm(t, 302.4, 303), () => A.circle(c, 560, 520, r * ph, null, P.ink2, 4));
    }
    // kẻ nghe: vòng quanh + tai
    const heardA = A.sm(t, 305.6, 306.2);
    U.ring(c, 1500, 360, 120, ((t - 305.6) / 1.1) % 1 * (t > 305.6 ? 1 : 2), P.enemy, 6);
    if (heardA > 0) A.withA(c, heardA, () => { U.circleMark(c, 1500, 360, 130, 1, P.enemy, 8); });
  }

  // 308.9 – 314.7: âm trong nước nhanh hơn 4,5 lần
  private speed(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#e8f0f5');
    const lane = (y: number, col: string, v: number, label: 'air' | 'water') => {
      A.rrect(c, 120, y - 90, 1680, 180, 14, label === 'water' ? '#bcd9ea' : '#f7fafc', P.ink, 5);
      // nguồn
      A.circle(c, 200, y, 24, P.ink, null, 0);
      const d = Math.min(1560, v * (t - 309.4) * 0.5);
      const fx = 200 + d;
      for (let i = 0; i < 3; i++) {
        const xx = fx - i * 70; if (xx > 230 && t > 309.4) A.withA(c, 1 - i * 0.3, () => { c.beginPath(); c.arc(200, y, xx - 200, -1.0, 1.0); c.strokeStyle = col; c.lineWidth = 7; c.lineCap = 'round'; c.stroke(); });
      }
      // vạch km
      for (let i = 1; i <= 8; i++) A.line(c, [[200 + i * 195, y + 70], [200 + i * 195, y + 90]], P.ink2, 4);
      return fx;
    };
    lane(330, P.ink2, 280, 'air');
    lane(700, P.sky, 1260, 'water');
    A.withA(c, A.sm(t, 313.2, 314.0), () => { A.circle(c, 1760, 700, 36, null, P.enemy, 6); });
  }

  // 314.8 – 319.5: mỗi máy là một giọng
  private voices(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 420, z: 1.5 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    S.drawSubSide(c, t, { x: 0, y: 420, s: 1, cut: 1, plant: 'diesel', plantRun: 1, prop: t * 5, breath: t * 1.6, hl: ['plant', 'batt', 'life'], glow: P.amber });
    const srcs: [number, number, number][] = [[-160, 410, 314.9], [-40, 440, 315.6], [-306, 420, 316.4], [100, 400, 317.0]];
    for (const [x, y, t0] of srcs) S.waves(c, x, y, t, { R: 150, n: 2, per: 1.1, color: P.enemy, w: 4, a: A.sm(t, t0, t0 + 0.4), t0 });
    K.end(c);
  }

  // 319.5 – 322.3: đệm cao su và bè nổi
  private mounts(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#e8f0f5');
    const shake = Math.sin(t * 46) * 14;
    const damp = A.sm(t, 320.0, 321.2);
    const hullY = 800;
    A.rrect(c, 100, hullY, 1720, 120, 0, P.slate, P.ink, 6);        // vỏ thân
    // đệm 1 (dưới bè), bè, đệm 2 (dưới máy), máy
    const spring = (x: number, y0: number, y1: number, amp: number) => {
      const pts: A.Pt[] = [];
      for (let i = 0; i <= 10; i++) pts.push([x + (i % 2 ? 16 : -16) * (i > 0 && i < 10 ? 1 : 0), A.lerp(y0, y1, i / 10)]);
      A.line(c, pts, P.dark, 6); void amp;
    };
    const raftY = hullY - 150 - shake * 0.35 * (1 - damp * 0.9);
    const machY = raftY - 150 - shake * (1 - damp * 0.97);
    for (const x of [420, 900, 1380]) spring(x, hullY, raftY + 20, 0);
    A.rrect(c, 340, raftY, 1120, 26, 8, P.sand, P.ink, 5);
    for (const x of [620, 1180]) spring(x, raftY, machY + 120, 0);
    A.rrect(c, 540, machY, 760, 130, 14, '#fff', P.ink, 6);
    for (let i = 0; i < 4; i++) A.circle(c, 640 + i * 170, machY + 65, 40, null, P.ink2, 5);
    // rung: nhiều khi không giảm; vòng sóng chỉ ra từ máy, không lan xuống thân khi có đệm
    S.waves(c, 920, machY + 60, t, { R: 260 * (1 - damp * 0.6), n: 2, per: 0.9, color: P.enemy, w: 4, a: 1 - damp * 0.8 });
    // thân vỏ yên
    A.withA(c, damp, () => { A.line(c, [[200, hullY + 150], [1720, hullY + 150]], '#16a34a', 8); });
  }

  // 322.3 – 331: chân vịt nhìn từ phía sau; bọt khi nhanh
  private prop(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cde3ee');
    const cx = 960, cy = 520, spd = A.sm(t, 325.0, 329.0);
    const R = 330;
    A.circle(c, cx, cy, 52, P.dark, P.ink, 8);
    for (let i = 0; i < 5; i++) {
      const a = t * (2 + spd * 8) + i * (Math.PI * 2 / 5);
      c.save(); c.translate(cx, cy); c.rotate(a);
      c.beginPath(); c.moveTo(24, -12); c.quadraticCurveTo(R * 0.6, -70, R, -26); c.quadraticCurveTo(R * 0.95, 34, R * 0.4, 50); c.lineTo(24, 18); c.closePath();
      A.fs(c, P.slate, P.ink, 6);
      c.restore();
      // bọt ở mép lưỡi khi chạy nhanh
      const bx = cx + Math.cos(a - 0.12) * R * 0.94, by = cy + Math.sin(a - 0.12) * R * 0.94;
      if (spd > 0.15) for (let k = 0; k < 4; k++) A.circle(c, bx + Math.cos(t * 13 + k + i) * 18, by + Math.sin(t * 11 + k * 2 + i) * 18, 5 + 4 * A.rnd(k + i * 3), '#fff', P.sky, 2.5);
    }
    // lách tách: vòng sóng sắc
    S.waves(c, cx, cy, t, { R: 520, n: 4, per: 0.5, color: P.enemy, w: 4, a: spd });
  }

  // 331 – 340: ngói cao su nuốt xung sonar
  private tiles(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cde3ee');
    const hx = 980;
    // vỏ: nửa trên trơ (phản xạ), nửa dưới có ngói (nuốt)
    A.rrect(c, hx, 0, 400, 1080, 0, P.olive, P.ink, 8);
    for (let j = 0; j < 8; j++) for (let i = 0; i < 4; i++) {
      A.rrect(c, hx + 14 + i * 94, 560 + j * 64 + (i % 2) * 0, 84, 56, 8, 'rgba(30,41,59,0.75)', '#0f172a', 3);
    }
    A.withA(c, A.sm(t, 332, 332.8), () => { for (const yy of [200, 760]) { /* chỗ nhận xung */ A.circle(c, hx - 30, yy, 10, P.amber, null, 0); } });
    // sóng đến từ trái: phản xạ lại ở nửa trên, tắt ở nửa dưới
    for (const [yy, refl] of [[260, true], [800, false]] as const) {
      for (let i = 0; i < 3; i++) {
        const ph = ((t - 332.4) * 0.6 + i / 3) % 1;
        if (t < 332.4) continue;
        const x = 140 + (hx - 160) * ph;
        const a = refl ? 1 : 1 - A.sm(ph, 0.55, 1);
        A.withA(c, a, () => A.line(c, [[x, yy - 120], [x, yy + 120]], P.sky, 8));
        if (refl && ph > 0.9) A.withA(c, 0.7, () => { const x2 = hx - (ph - 0.9) * 1800; A.line(c, [[x2, yy - 120], [x2, yy + 120]], P.enemy, 6); });
      }
    }
    // mức ồn của tàu dưới mức ồn đại dương
    const g = A.sm(t, 336.4, 338.4);
    A.withA(c, A.sm(t, 336.2, 336.8), () => {
      A.rrect(c, 1500, 220, 320, 640, 20, '#fff', P.ink, 5);
      A.line(c, [[1510, 480], [1810, 480]], P.sky, 6, [14, 10]);
      A.rrect(c, 1540, A.lerp(260, 540, g), 100, A.lerp(560, 280, g), 14, P.enemy, null, 0);
      A.rrect(c, 1680, 480, 100, 340, 14, 'rgba(56,189,248,0.7)', null, 0);
    });
  }

  // 340 – 356: sâu hơn thì bọt khó hình thành
  private deeper(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 480, z: 0.9 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    const v = A.sm(t, 346, 352);
    const ys = [220, 760];
    for (let k = 0; k < 2; k++) {
      const y = ys[k]!;
      S.drawSubSide(c, t, { x: -300, y, s: 0.7, cut: 0, prop: t * (4 + v * 10) });
      const bub = k === 0 ? 1 : A.sm(v, 0.85, 1);
      const m = A.sm(v, 0.2, 1) * bub;
      if (m > 0.05) { S.bubbles(c, -560, y, 120, 40, t, 10, 30 + k, m); S.waves(c, -540, y, t, { R: 360, n: 3, per: 0.7, color: P.enemy, w: 4, a: m }); }
    }
    K.end(c);
    S.ruler(c, cam, 0, 3, { x: 60, a: 0.8 });
    // tốc độ chung của hai tàu
    A.withA(c, A.sm(t, 343, 344), () => { for (const [x, y] of [[1500, 220], [1500, 760]] as const) A.circle(c, x, y, 20, null, P.ink, 5); });
  }

  // 356 – 367.9: chậm là chiến thuật; bằng tốc độ đi bộ
  private slow(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#e8f0f5');
    const cam: K.Cam = { x: 0, y: 420, z: 1.15 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    const mv = ((t - 356) * 36) % 700 - 350;
    S.drawSubSide(c, t, { x: mv * 0, y: 420, s: 0.9, cut: 0, prop: t * 1.4 });
    K.end(c);
    // trên mặt đất bên dưới: người đi bộ cùng nhịp
    const gy = 940;
    A.line(c, [[0, gy], [A.W, gy]], P.ink2, 5);
    const px = 400 + ((t - 356) * 120) % 1200;
    S.person(c, px, gy, 150, P.dark);
    A.withA(c, A.sm(t, 363, 364), () => { for (let i = 0; i < 12; i++) A.line(c, [[200 + i * 150 - (t * 120 % 150), gy + 14], [240 + i * 150 - (t * 120 % 150), gy + 14]], P.ink2, 4); });
    const gp = A.sm(t, 358, 359);
    // đồng hồ tốc độ thấp
    A.withA(c, gp, () => {
      c.save(); c.translate(1700, 190);
      A.circle(c, 0, 0, 85, '#fff', P.ink, 5);
      const a = Math.PI * (0.8 + 1.4 * 0.14);
      A.line(c, [[0, 0], [Math.cos(a) * 60, Math.sin(a) * 60]], P.amber, 7);
      c.restore();
    });
  }
}
