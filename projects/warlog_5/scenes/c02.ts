// Chương 2 (50.9 – 116.7): đánh đổi cổ nhất — trọng lượng ↔ tầm; 155 mm; nòng mòn dần.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as X from './_art';

export const T = { tube: 54.4, arcs: 58.2, shellsBoom: 62.0, ranges: 73.5 };

export default class S02 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 54.15) this.trade(c, t);
    else if (t < 58.1) this.tubes(c, t);
    else if (t < 60.3) this.arcs(c, t);
    else if (t < 63.1) this.shells(c, t);
    else if (t < 68.76) this.bigger(c, t);
    else if (t < 73.4) this.cal(c, t);
    else if (t < 88.1) this.reach(c, t);
    else if (t < 111.6) this.wear(c, t);
    else this.scatter(c, t);
    for (const at of [54.15, 58.1, 60.3, 63.1, 68.76, 73.4, 88.1, 111.6]) X.dip(c, t, at, 0.1);
  }

  // 50.9–54.15: cân — tầm đi cùng trọng lượng
  private trade(c: CanvasRenderingContext2D, t: number) {
    const g = A.sm(t, 51.2, 53.8);
    const sc = 1 + 0.8 * g;
    X.balance(c, 960, 360, Math.sin((t - 50.9) * 1.6) * 0.03, (p) => {
      p.save(); p.scale(sc * 0.9, sc * 0.9);
      const L = 40 + 70 * g;
      U.arrow(p, [-L, -40], [L, -40], { color: P.amber, w: 9, head: 30 });
      U.arrow(p, [L, -40], [-L, -40], { color: P.amber, w: 9, head: 30 });
      p.restore();
    }, (p) => { X.weightIcon(p, 0, -34, 0.9 + 0.8 * g); }, 1.15);
  }

  // 54.15–58.1: mặt cắt hai nòng: khí đẩy lâu hơn
  private tubes(c: CanvasRenderingContext2D, t: number) {
    const f = t - T.tube;
    const rows = [
      { y: 320, x0: 180, L: 560, dur: 1.5, v: 0 },
      { y: 740, x0: 180, L: 1300, dur: 2.3, v: 0 },
    ];
    for (const r of rows) {
      const u = A.clamp01(f / r.dur);
      const inTube = f < r.dur;
      const sx = r.x0 + (inTube ? r.L * u * u : r.L + (2 * r.L / r.dur) * (f - r.dur));
      // thành nòng
      A.rrect(c, r.x0 - 70, r.y - 40, r.L + 110, 22, 6, P.dark, P.ink, 4);
      A.rrect(c, r.x0 - 70, r.y + 18, r.L + 110, 22, 6, P.dark, P.ink, 4);
      A.rrect(c, r.x0 - 100, r.y - 40, 50, 80, 8, P.slate, P.ink, 4);
      // khí đẩy
      if (f > 0 && inTube) {
        const k = 1 - 0.6 * u;
        const n = 6;
        c.save();
        c.beginPath(); c.rect(r.x0 - 52, r.y - 18, sx - (r.x0 - 52) - 40, 36); c.clip();
        for (let i = 0; i < n; i++) {
          const cx = r.x0 - 40 + (sx - r.x0 + 40) * (i + 0.5) / n;
          A.circle(c, cx, r.y + Math.sin(i * 2 + f * 20) * 5, 26 * k, '#fb923c', null, 0);
        }
        c.restore();
        // mũi tên áp lực
        U.arrow(c, [sx - 100, r.y], [sx - 40, r.y], { color: P.enemy, w: 8, head: 26 });
      }
      if (f > 0) X.shell(c, sx - 30, r.y, 0, 1.0);
      if (!inTube) F.dust(c, r.x0 + r.L + 60, r.y, A.ph(f, r.dur, r.dur + 0.8), 0.9);
    }
    // so tốc độ sau khi ra nòng
    const sp = A.sm(t, 57.1, 57.8);
    if (sp > 0) {
      U.arrow(c, [1480, 300], [1480 + 120 * sp, 300], { color: P.ink, w: 8, head: 28 });
      U.arrow(c, [1480, 700], [1480 + 380 * sp, 700], { color: P.ink, w: 8, head: 28 });
    }
  }

  // 58.1–60.3: nòng dài đi xa hơn
  private arcs(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 640, y: -260, z: 1.0 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const fa = A.bump(t, 58.4, 0.8) * 0.8, fb = A.bump(t, 58.7, 0.8) * 0.8;
    const A0 = X.towedGun(c, { x: -170, elev: 0.75, len: 0.6, recoil: fa, s: 1.0 });
    const B0 = X.towedGun(c, { x: 150, elev: 0.75, len: 1.6, recoil: fb, s: 1.0 });
    const la: A.Pt = [620, -6], lb: A.Pt = [1380, -6];
    X.flight(c, [A0.x, A0.y], la, 360, A.ph(t, 58.45, 59.5), { s: 1.0, w: A.px(c, 5) });
    X.flight(c, [B0.x, B0.y], lb, 560, A.ph(t, 58.75, 60.0), { s: 1.0, w: A.px(c, 5) });
    F.muzzleFlash(c, A0.x, A0.y, A0.ang, A.ph(t, 58.4, 58.65), 1.0);
    F.muzzleFlash(c, B0.x, B0.y, B0.ang, A.ph(t, 58.7, 58.95), 1.0);
    if (t > 59.5) F.dust(c, la[0], 0, A.ph(t, 59.5, 60.2), 1.2);
    if (t > 60.0) F.dust(c, lb[0], 0, A.ph(t, 60.0, 60.3), 1.2);
    K.end(c);
  }

  // 60.3–63.1: đạn nặng chứa nhiều thuốc nổ hơn
  private shells(c: CanvasRenderingContext2D, t: number) {
    const a = A.back(t, 60.5, 61.1), b = A.back(t, 60.9, 61.6);
    const cut = (x: number, y: number, s: number, p: number) => {
      c.save(); c.translate(x, y); c.scale(s * p, s * p);
      A.rrect(c, -90, -28, 140, 56, 10, P.oliveLight, P.ink, 4);
      A.poly(c, [[48, -28], [118, 0], [48, 28]], P.enemy, P.ink, 4);
      A.rrect(c, -78, -16, 112, 32, 6, '#f59e0b', P.ink, 2.5);
      c.restore();
    };
    cut(560, 540, 1.6, a);
    c.save(); c.translate(1260, 540); c.scale(2.7 * b, 2.7 * b);
    A.rrect(c, -90, -28, 140, 56, 10, P.oliveLight, P.ink, 3);
    A.poly(c, [[48, -28], [118, 0], [48, 28]], P.enemy, P.ink, 3);
    A.rrect(c, -80, -22, 124, 44, 6, '#f59e0b', P.ink, 2);
    c.restore();
    const e = A.ph(t, T.shellsBoom, T.shellsBoom + 0.8);
    F.explosion(c, 560, 250, 80, e, 4);
    F.explosion(c, 1260, 200, 150, A.ph(t, T.shellsBoom + 0.15, T.shellsBoom + 1.0), 4);
  }

  // 63.1–68.76: nặng → khó kéo, khó giấu, lâu triển khai
  private bigger(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -180, z: 1.0 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const g = A.eio(t, 63.2, 64.4);                    // to dần
    const mv = A.eio(t, 64.5, 66.5);
    const vA = A.lerp(-860, -600, mv), vB = A.lerp(-330, -190, mv);
    const sA = 0.62 + 0.08 * g, sB = 0.62 + 0.55 * g;
    X.truck(c, { x: vA - 180, s: 0.62, load: 0, wheel: vA * 0.05 });
    X.towedGun(c, { x: vA + 60, s: sA, elev: 0.2, len: 0.8 + 0.1 * g, deploy: 0.1, wheel: vA * 0.05 });
    X.truck(c, { x: vB - 250, s: 0.8, load: 0, wheel: vB * 0.03 });
    X.towedGun(c, { x: vB + 150, s: sB, elev: 0.2, len: 0.9 + 0.6 * g, deploy: 0.1, wheel: vB * 0.03 });
    if (t > 64.5 && t < 66.6) { F.dust(c, vA - 300, 0, (A.ph(t, 64.5, 66.5) * 3) % 1, 0.9); F.dust(c, vB - 380, 0, (A.ph(t, 64.5, 66.5) * 2) % 1, 1.1); }
    const nt = A.sm(t, 66.76, 67.4);
    if (nt > 0) {
      X.net(c, vA + 30, 440, 190, nt);
      X.net(c, vB + 140, 760, 230, nt);
    }
    K.end(c);
    const cp = A.win(t, 67.4, 68.7, 0.2, 0.3);
    if (cp > 0) A.withA(c, cp, () => {
      X.stopwatch(c, 360, 230, 84, A.ph(t, 67.5, 68.0));
      X.stopwatch(c, 1180, 230, 84, A.ph(t, 67.5, 68.7) * 0.9);
    });
  }

  // 68.76–73.4: 155 mm, nhiều quân đội
  private cal(c: CanvasRenderingContext2D, t: number) {
    const a = A.back(t, 68.8, 69.5);
    // nòng nhìn trực diện: đường kính
    c.save(); c.translate(560, 540); c.scale(a, a);
    A.circle(c, 0, 0, 230, P.dark, P.ink, 8);
    A.circle(c, 0, 0, 168, '#0f172a', P.ink, 4);
    for (let i = 0; i < 16; i++) { const an = i * Math.PI / 8; A.line(c, [[Math.cos(an) * 168, Math.sin(an) * 168], [Math.cos(an) * 148, Math.sin(an) * 148]], P.slate, 8); }
    c.restore();
    U.arrow(c, [560 - 168, 800], [560 + 168, 800], { p: A.eo(t, 69.4, 70.0), color: P.amber, w: 9, head: 30 });
    X.bigNum(c, '155 mm', 560, 910, A.sm(t, 69.6, 70.0), 90);
    // nhiều quân đội dùng cùng cỡ
    const row = [0, 1, 2, 3];
    row.forEach((i) => {
      const p = A.back(t, 71.7 + i * 0.28, 72.2 + i * 0.28);
      if (p > 0) X.spGun(c, { x: 1060 + (i % 2) * 400, y: 360 + Math.floor(i / 2) * 340, s: 0.5 * p, elev: 0.3, dir: 1 });
    });
  }

  // 73.4–88.1: tầm bắn và các cách kéo xa; mỗi km tốn gì
  private reach(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 880, y: -260, z: 0.74 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const KM = 52;
    // thước dưới đất mỗi 10 km
    for (let k = 0; k <= 40; k += 10) {
      A.line(c, [[k * KM, 36], [k * KM, 76]], P.ink, A.px(c, 4));
    }
    A.line(c, [[0, 56], [40 * KM, 56]], P.ink, A.px(c, 3.5));
    const band = A.sm(t, 74.8, 75.6);
    if (band > 0) {
      c.fillStyle = 'rgba(37,99,235,0.18)'; c.fillRect(20 * KM, 20, 10 * KM * band, 56);
    }
    // pháo
    const lenK: A.Pt[] = [[77.0, 1], [78.4, 1.55]];
    const len = A.keys(t, lenK);
    const rec = A.bump(t, 73.9, 0.9) * 0.8;
    const m = X.spGun(c, { x: -40, elev: 0.78, len, recoil: rec });
    const reachKm = A.keys(t, [[73.6, 25], [76.9, 25], [78.6, 30], [80.0, 33], [82.3, 36], [83.9, 40]]);
    const from: A.Pt = [m.x, m.y];
    const land: A.Pt = [reachKm * KM, -6];
    const draw = A.sm(t, 73.9, 74.9);
    if (t > 73.9) {
      const pts = X.arcPts(from, land, 40 + reachKm * 12, 1, 60);
      A.line(c, pts, P.amber, A.px(c, 5), [18, 12]);
      if (draw < 1) { const [x, y, an] = X.arcAt(from, land, 40 + reachKm * 12, draw); X.shell(c, x, y, an, 0.8); }
      else X.shell(c, land[0], land[1] - 22, 1.2, 0.8);
    }
    K.end(c);
    // "20" "30" "40"
    const s20 = K.toScreen(cam, 20 * KM, 56), s30 = K.toScreen(cam, 30 * KM, 56), s40 = K.toScreen(cam, 40 * KM, 56);
    X.bigNum(c, '20', s20[0], s20[1] + 70, A.win(t, 75.6, 80, 0.1, 0.6), 70);
    X.bigNum(c, '30', s30[0], s30[1] + 70, A.win(t, 76.2, 80, 0.1, 0.6), 70);
    X.bigNum(c, '40', s40[0], s40[1] + 70, A.win(t, 83.9, 89, 0.1, 0.4), 100, P.amber);
    // ba cách: nòng dài, đạn tên lửa, đạn xả khí đáy
    const ic = (x: number, y: number, a: number, f: () => void) => { if (a > 0) A.withA(c, a, f); };
    const bx = 1500, by = 190;
    ic(bx, by, A.win(t, 77.1, 78.8, 0.2, 0.3), () => { A.rrect(c, bx - 120, by - 10, 200, 20, 10, P.dark, P.ink, 4); U.arrow(c, [bx + 50, by + 50], [bx + 130, by + 50], { color: P.amber, w: 8, head: 24 }); });
    ic(bx, by, A.win(t, 78.7, 80.1, 0.2, 0.3), () => { X.shell(c, bx, by, 0, 1.6, 'rocket'); F.fire(c, bx - 138, by, t, 1.1); });
    ic(bx, by, A.win(t, 80.1, 82.6, 0.2, 0.4), () => {
      c.save(); c.translate(bx, by); c.scale(1.7, 1.7);
      A.rrect(c, -40, -11, 62, 22, 5, P.oliveLight, P.ink, 3);
      A.rrect(c, -40, -7, 18, 14, 3, P.amber, P.ink, 2);
      for (let i = 0; i < 4; i++) A.circle(c, -50 - ((t * 40 + i * 20) % 80), Math.sin(i * 2 + t * 5) * 6, 6 + i, 'rgba(100,116,139,0.6)', null, 0);
      c.restore();
    });
    // chi phí mỗi km
    const w = A.back(t, 85.0, 85.5), mo = A.back(t, 86.1, 86.6), bl = A.back(t, 87.0, 87.5);
    if (w > 0) X.weightIcon(c, 1170, 880, 0.9 * w);
    if (mo > 0) X.coin(c, 1420, 880, 1.0 * mo);
    if (bl > 0) X.barrelLife(c, 1680, 870, 1.1 * bl, 1 - 0.7 * A.sm(t, 87.2, 87.8));
  }

  // 88.1–111.6: nòng là ống thép bị nổ liên tục → mòn
  private wear(c: CanvasRenderingContext2D, t: number) {
    // nòng mặt cắt ngang giữa khung
    const shots = A.keys(t, [[90.7, 0], [97.6, 8], [100.8, 12]]);
    const wearK = A.sm(t, 93, 100.8);
    const dead = A.sm(t, 99.8, 100.8);
    const hot = A.clamp01(wearK * 1.1);
    const inTube = t >= 90.7 && t < 101.2;
    if (inTube) {
      const y = 300, x0 = 200, L = 1500;
      const col = A.lerpColor('#334155', '#b4493c', hot * 0.9);
      A.rrect(c, x0 - 40, y - 52, L + 60, 26, 6, col, P.ink, 4);
      A.rrect(c, x0 - 40, y + 26, L + 60, 26, 6, col, P.ink, 4);
      A.rrect(c, x0 - 80, y - 52, 50, 104, 8, P.slate, P.ink, 4);
      // xung nổ ở đáy nòng, lặp
      const per = 0.62, ph = ((t - 90.7) % per) / per;
      if (t >= 90.7) {
        F.explosion(c, x0 - 4, y, 60, ph * 0.9, 3);
        const sx = x0 + L * A.eo(ph, 0.05, 1);
        X.shell(c, sx, y, 0, 0.9);
      }
      // dãy hạt đếm số phát bắn
      for (let i = 0; i < Math.min(12, Math.floor(shots)); i++) A.circle(c, 260 + i * 56, 440, 18, A.lerpColor('#7d8b5a', '#b4493c', i / 12), P.ink, 3);
    }
    // vòng lòng nòng nhìn đầu: răng cưỡng giảm
    if (t >= 95.0) {
      const a = A.sm(t, 95.0, 95.6);
      const cx = 960, cy = 770, R = 190;
      A.withA(c, a, () => {
        A.circle(c, cx, cy, R + 50, P.dark, P.ink, 7);
        A.circle(c, cx, cy, R, '#0f172a', P.ink, 4);
        const teeth = 18, depth = 36 * (1 - A.sm(t, 95.6, 98.4));
        for (let i = 0; i < teeth; i++) {
          const an = (i / teeth) * Math.PI * 2;
          const r0 = R, r1 = R - depth;
          const hw = 0.09;
          A.poly(c, [[cx + Math.cos(an - hw) * r0, cy + Math.sin(an - hw) * r0], [cx + Math.cos(an - hw) * r1, cy + Math.sin(an - hw) * r1], [cx + Math.cos(an + hw) * r1, cy + Math.sin(an + hw) * r1], [cx + Math.cos(an + hw) * r0, cy + Math.sin(an + hw) * r0]], P.slate, null, 0);
        }
      });
    }
    // thanh tuổi thọ
    if (t >= 97.9 && t < 101.2) {
      const p = A.sm(t, 97.9, 100.8);
      A.withA(c, A.sm(t, 97.9, 98.3), () => {
        X.barrelLife(c, 1650, 780, 1.6, 1 - p);
        if (dead > 0.5) U.xMark(c, 1650, 790, 50, A.sm(t, 100.2, 100.8), P.enemy, 10);
      });
    }
    // 88.1–90.4 chỗ vừa nói "cái giá cuối cùng"
    if (t < 90.7) A.withA(c, 1 - A.sm(t, 90.2, 90.7), () => X.barrelLife(c, 960, 520, 2.4, 1));
    // 101.2–111.6: nòng mòn → bắn ngắn; sổ nhật ký + máy tính chỉnh
    if (t >= 101.2) this.worn(c, t);
  }

  private worn(c: CanvasRenderingContext2D, t: number) {
    // nền phủ lên cảnh nòng (đã hết dùng)
    A.clear(c);
    const cam: K.Cam = { x: 800, y: -250, z: 0.75 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const tgt = 1600;
    // mục tiêu
    X.soldier(c, tgt, 0, 1.5, -1, 'foe');
    const m = X.spGun(c, { x: -40, elev: 0.78, recoil: A.bump(t, 101.5, 0.8) * 0.8 + A.bump(t, 108.4, 0.8) * 0.8 });
    const from: A.Pt = [m.x, m.y];
    // phát 1: ngắn
    const shortLand: A.Pt = [tgt - 330, -6];
    const p1 = A.ph(t, 101.6, 103.3);
    X.flight(c, from, shortLand, 480, p1, { s: 0.9, w: A.px(c, 5) });
    if (t > 103.3) F.dust(c, shortLand[0], 0, A.ph(t, 103.3, 104.2), 1.3);
    // phát chỉnh
    const p2 = A.ph(t, 108.5, 110.4);
    const fix = A.sm(t, 109.1, 110.0);
    const L2: A.Pt = [tgt, -6];
    if (t >= 108.5) X.flight(c, from, L2, 520, p2, { s: 0.9, w: A.px(c, 5), trail: P.sky });
    if (t > 110.4) F.explosion(c, tgt, -20, 70, A.ph(t, 110.4, 111.1), 4);
    K.end(c);
    // tốc độ ra nòng: mũi tên ngắn
    const sa = A.win(t, 101.2, 104.8, 0.2, 0.4);
    if (sa > 0) A.withA(c, sa, () => { U.arrow(c, [400, 160], [400 + 130, 160], { color: P.ink, w: 9, head: 30 }); });
    // sổ ghi
    const lg = A.sm(t, 105.2, 105.8) * (1 - A.sm(t, 111.2, 111.6));
    if (lg > 0) A.withA(c, lg, () => {
      A.rrect(c, 1380, 120, 380, 330, 14, '#fffdf2', P.ink, 5);
      const rows = Math.floor(A.keys(t, [[105.3, 0], [107.8, 7]]));
      for (let i = 0; i < 7; i++) {
        const y = 170 + i * 38;
        A.line(c, [[1410, y + 12], [1730, y + 12]], '#cbd5e1', 2.5);
        if (i < rows) { A.line(c, [[1420, y - 6], [1440, y + 8], [1470, y - 14]], P.olive, 5); A.rrect(c, 1530, y - 8, 70 + (i % 3) * 20, 14, 4, P.amber, null, 0); }
      }
      // túi thuốc đẩy
      if (t > 107.9) X.weightIcon(c, 1640, 390, 0.5, P.sand);
    });
    // máy tính điều chỉnh góc
    const pc = A.sm(t, 109.1, 109.6) * (1 - A.sm(t, 111.0, 111.6));
    if (pc > 0) A.withA(c, pc, () => {
      A.rrect(c, 160, 200, 360, 230, 18, '#1e293b', P.ink, 6);
      A.rrect(c, 180, 220, 320, 190, 10, '#0b1220', null, 0);
      const arcP = X.arcPts([200, 390], [470, 390], 90 + 40 * fix, 1, 24);
      A.line(c, arcP, P.sky, 5);
      A.line(c, [[200, 390], [470, 390]], P.ink2, 3);
    });
  }

  // 111.6–116.7: mỗi phát lệch rộng dần
  private scatter(c: CanvasRenderingContext2D, t: number) {
    const cx = 960, cy = 560;
    for (let i = 1; i <= 4; i++) A.circle(c, cx, cy, i * 90, i % 2 ? '#fff' : '#f1e9d0', P.ink, 3);
    A.circle(c, cx, cy, 14, P.enemy, P.ink, 3);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const tt = 111.7 + i * 0.2;
      const a = A.sm(t, tt, tt + 0.12);
      if (a <= 0) continue;
      const spread = 20 + (i / n) * 300;
      const ang = A.rnd(i + 3) * Math.PI * 2, d = spread * (0.35 + 0.65 * A.rnd(i + 9));
      A.circle(c, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d, 12 * a, P.amber, P.ink, 3);
    }
  }
}
