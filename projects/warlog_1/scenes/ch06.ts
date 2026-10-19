// Chương 6 (201.5–297.6): xe tăng: sửa gì, mất gì, vì sao không đi một mình.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { dip, sideCam, halo, at, arcPts, type Pt } from './_common';

const T_TOP = 252.34;

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < 214.84) this.ifvLoses(c, t);
    else if (t < 222.5) this.gun(c, t);
    else if (t < 226.3) this.armor(c, t);
    else if (t < 229.9) this.tracks(c, t);
    else if (t < 235.2) this.pull(c, t);
    else if (t < 240.8) this.chain(c, t);
    else if (t < T_TOP) this.fuel(c, t);
    else if (t < 264.9) this.blind(c, t);
    else if (t < 269.1) this.obstacles(c, t);
    else if (t < 274.0) this.hold(c, t);
    else if (t < 282.9) this.escort(c, t);
    else this.combined(c, t);
    for (const at0 of [214.84, 222.5, 226.3, 229.9, 235.2, 240.8, T_TOP, 264.9, 269.1, 274.0, 282.9]) dip(c, t, at0, 0.15);
  }

  // ── A: IFV gặp pháo xe tăng
  private ifvLoses(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(380, 1.9, 810);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false });
    const die = A.sm(t, 209.9, 210.2);
    const ex = 70, tx = 760;
    // IFV: sống tới 209.9 rồi cháy
    V.ifv(c, ex, 0, 1, { a: 1 - die * 0.5, fire: A.bump(t, 202.2, 0.2) });
    if (die > 0) {
      F.fire(c, ex + 20, -60, t - 210, 1.2); F.smoke(c, ex + 20, -80, t - 210, 1.2, 6, '#555b64', 14);
    }
    // xe tăng đối phương
    V.tank(c, tx, 0, 1, { side: 'foe', flip: true, recoil: A.bump(t, 209.0, 0.4) });
    // đạn pháo IFV bắn vào xe tăng địch: nảy ra (201.8–205)
    if (t > 201.8 && t < 205.2) {
      for (let j = 0; j < 4; j++) {
        const u = ((t - 201.8) * 2.6 + j / 4) % 1;
        F.tracer(c, [ex + 92, -76], [tx - 70, -40], u, 0.12, P.amber, 4);
        if (u > 0.9) F.sparks(c, tx - 70, -40, (u - 0.9) * 10, 0.8, Math.PI, 2.2, j + 1);
      }
    }
    // mảnh pháo rơi lên IFV: nảy (205.2–207.7)
    if (t > 205.2 && t < 208.2) {
      for (let j = 0; j < 7; j++) {
        const u = ((t - 205.2) * 1.5 + j * 0.14) % 1;
        const x = ex - 40 + j * 22;
        const y = -250 + u * 190;
        if (u < 0.99) A.line(c, [[x - 4, y - 24], [x, y]], P.ink, A.px(c, 3));
        if (u > 0.95) F.sparks(c, x, -64, (u - 0.95) * 20, 0.6, -Math.PI / 2, 2.4, j + 3);
      }
    }
    // phát bắn của xe tăng địch → IFV
    const sh = A.ph(t, 209.15, 209.9);
    const mz = V.tankMuzzle(tx, 0, 1, { flip: true });
    if (sh > 0) {
      F.muzzleFlash(c, mz[0], mz[1], Math.PI, A.ph(t, 209.0, 209.25), 1.0);
      if (sh < 1) V.shellHead(c, A.lerp(mz[0], ex + 60, sh), A.lerp(mz[1], -58, sh), Math.PI);
    }
    if (t > 209.9 && t < 210.8) F.explosion(c, ex + 20, -50, 90, A.ph(t, 209.9, 210.8));
    // xe tăng của ta tiến vào (212.6–214.8)
    const inP = A.eo(t, Q.tankRepairs, 214.7);
    if (inP > 0) V.tank(c, -420 + inP * 420 - 80, 0, 1, { ph: inP * 420 * 1.2 });
    K.end(c);
    if (t > 210.4 && t < 213.4) {
      const [sx, sy] = K.toScreen(cam, ex, -100);
      U.callout(c, 'IFV', sx, sy - 190, { to: [sx, sy - 20], p: A.win(t, 210.9, 213.2, 0.3, 0.3), size: 44, color: P.enemy });
    }
    if (t > Q.tankRepairs) {
      const [fx, fy] = K.toScreen(cam, ex, -130);
      V.flaw(c, fx, fy - 30, 1.7, A.eo(t, Q.tankRepairs, Q.tankRepairs + 0.6));
    }
  }

  // ── B1: pháo lớn phá mục tiêu kiên cố từ xa
  private gun(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(520, 1.35, 800);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false });
    const fire = 219.2;
    V.tank(c, 40, 0, 1, { recoil: A.bump(t, fire, 0.5) });
    const mz = V.tankMuzzle(40, 0, 1, { recoil: A.bump(t, fire, 0.5) });
    // mục tiêu kiên cố: khối bê tông dày
    const hit = 220.35, X = 1020;
    const broke = A.sm(t, hit, hit + 0.3);
    A.withA(c, 1 - broke * 0.7, () => {
      A.rrect(c, X - 70, -90, 140, 90, 6, '#c9d0d8', P.ink, A.px(c, 3.5));
      A.rrect(c, X - 40, -64, 80, 16, 3, P.dark, P.ink, A.px(c, 2));
      for (let i = 0; i < 4; i++) A.line(c, [[X - 70 + i * 36, -90], [X - 70 + i * 36, 0]], '#aab3bd', A.px(c, 2));
    });
    if (t > hit && t < hit + 0.9) F.explosion(c, X, -50, 90, A.ph(t, hit, hit + 0.9));
    if (t > hit + 0.1) F.debris(c, X, -50, t - hit - 0.1, 1, 10, 4, 0);
    // khoảng cách: đường đo hai đầu
    const dp = A.eo(t, 218.6, 219.6);
    if (dp > 0) {
      const y = -140, x0 = mz[0], x1 = X;
      A.withA(c, 1, () => {
        A.line(c, [[x0, y], [A.lerp(x0, x1, dp), y]], P.ink2, A.px(c, 3), [14, 9]);
        A.line(c, [[x0, y - 14], [x0, y + 14]], P.ink2, A.px(c, 3));
        if (dp > 0.98) A.line(c, [[x1, y - 14], [x1, y + 14]], P.ink2, A.px(c, 3));
      });
    }
    // phát bắn
    F.muzzleFlash(c, mz[0], mz[1], 0, A.ph(t, fire, fire + 0.2), 1.0);
    if (t > fire + 0.05 && t < hit) {
      const u = A.ph(t, fire + 0.05, hit);
      V.shellHead(c, A.lerp(mz[0] + 20, X - 70, u), A.lerp(mz[1], -60, u), 0);
    }
    K.end(c);
  }

  // ── B2: giáp đủ dày để sống sót trước chính loại pháo ấy
  private armor(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(80, 3.4, 880);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false });
    V.tank(c, 0, 0, 1, { cut: 0.0 });
    // tấm giáp trước: tách lớp (nhấn chỗ dày)
    const slab = A.sm(t, 222.6, 223.2);
    A.withA(c, slab, () => {
      for (let i = 0; i < 4; i++) {
        A.poly(c, [[52 + i * 3, -52 + i * 2], [86 + i * 3, -34 + i * 2], [80 + i * 3, -32 + i * 2], [48 + i * 3, -49 + i * 2]], i % 2 ? P.slate : P.dark, P.ink, A.px(c, 1.6));
      }
    });
    // phát đạn tới từ bên phải: dừng ở giáp
    for (const [t0, y0] of [[223.1, -46], [224.9, -40]] as const) {
      const u = A.ph(t, t0, t0 + 0.55);
      if (u > 0 && u < 1) V.shellHead(c, A.lerp(520, 82, u), y0, Math.PI);
      if (u >= 1) {
        F.sparks(c, 80, y0, A.ph(t, t0 + 0.55, t0 + 1.1), 1.2, 0, 2.4, 2);
        F.shock(c, 80, y0, 60, A.ph(t, t0 + 0.55, t0 + 1.0), 3);
      }
    }
    K.end(c);
    const [sx, sy] = K.toScreen(cam, 70, -42);
    halo(c, sx, sy, 100, 74, A.win(t, 223.4, 225.8, 0.3, 0.4), P.amber, 6);
  }

  // ── B3: xích đi qua nơi nuốt xe tải
  private tracks(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(500, 1.5, 820);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false, mud: [[260, 900]] });
    // xe tải mắc lại
    const tIn = A.eo(t, 226.3, 227.8), sink = A.sm(t, 227.4, 228.3);
    const tx = -150 + tIn * 640;
    V.truck(c, tx, 0, 1, { ph: t < 228.3 ? tx * 1.2 : t * 300, mud: sink, a: 1 });
    if (t > 227.4) for (let j = 0; j < 3; j++) F.dust(c, tx - 40 + j * 30, 4, ((t * 1.3 + j * 0.3) % 1), 0.8, '#a58f63');
    // xe tăng chạy qua phía sau
    const kx = A.lerp(-300, 1200, A.eio(t, 227.8, 229.9));
    c.save(); c.translate(0, -6);
    V.tank(c, kx, 0, 0.92, { ph: kx * 1.2 });
    c.restore();
    K.end(c);
  }

  // ── B4: ba thuộc tính kéo nhau (sơ đồ tam giác)
  private pull(c: CanvasRenderingContext2D, t: number) {
    const cx = 960, cy = 590, R = 330;
    const vtx: Pt[] = [0, 1, 2].map((i) => [cx + Math.cos(-Math.PI / 2 + (i * 2 * Math.PI) / 3) * R, cy + Math.sin(-Math.PI / 2 + (i * 2 * Math.PI) / 3) * R]);
    const p = A.sm(t, 229.9, 230.8);
    A.withA(c, p, () => {
      A.poly(c, vtx, 'rgba(255,255,255,0.7)', P.ink2, 4);
      // puck kéo về từng đỉnh
      const k = (t - 231) * 0.9;
      const w = [0, 1, 2].map((i) => Math.max(0.04, 0.5 + 0.5 * Math.sin(k * 2.1 + i * 2.1)));
      const sum = w[0]! + w[1]! + w[2]!;
      const wn = w.map((x) => x / sum);
      const px = vtx[0]![0] * wn[0]! + vtx[1]![0] * wn[1]! + vtx[2]![0] * wn[2]!;
      const py = vtx[0]![1] * wn[0]! + vtx[1]![1] * wn[1]! + vtx[2]![1] * wn[2]!;
      for (let i = 0; i < 3; i++) A.line(c, [[px, py], vtx[i]!], P.amber, 3 + wn[i]! * 22);
      A.circle(c, px, py, 20, '#fff', P.ink, 4);
      // biểu tượng ở đỉnh: pháo / giáp / xích
      c.save(); c.translate(vtx[0]![0], vtx[0]![1] - 64); c.scale(1.4, 1.4);
      A.capsule(c, [-40, 0], [40, 0], 12, P.dark, P.ink, 3); V.shellHead(c, 56, 0, 0);
      c.restore();
      c.save(); c.translate(vtx[1]![0] + 100, vtx[1]![1] + 40); c.scale(1.4, 1.4);
      for (let i = 0; i < 4; i++) A.poly(c, [[-14 + i * 6, -30], [10 + i * 6, -30], [10 + i * 6, 30], [-14 + i * 6, 30]], i % 2 ? P.slate : P.dark, P.ink, 2);
      c.restore();
      c.save(); c.translate(vtx[2]![0] - 100, vtx[2]![1] + 40); c.scale(1.2, 1.2);
      A.rrect(c, -70, -22, 140, 44, 22, P.dark, P.ink, 3);
      for (let i = 0; i < 4; i++) A.circle(c, -45 + i * 30, 0, 11, P.slate, P.ink, 2);
      c.restore();
    });
  }

  // ── B5: giáp dày → nặng → động cơ lớn → khát nhiên liệu
  private chain(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(40, 4.2, 900);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: false });
    const arm = A.sm(t, 235.4, 236.6), wt = A.sm(t, 236.6, 237.8), eng = A.sm(t, 238.2, 239.3), fuel = A.sm(t, 239.4, 240.6);
    V.tank(c, 0, wt * 4, 1, { cut: 1 });
    // giáp dày hơn
    A.withA(c, 0.95, () => {
      A.poly(c, [[52, -52], [86, -34], [78, -30 + 0], [54 - arm * 2, -40]], P.slate, P.ink, A.px(c, 2));
      A.rrect(c, 58 - arm * 22, -50, 24 + arm * 22, 20, 2, P.slate, P.ink, A.px(c, 2));
    });
    // động cơ lớn hơn
    A.rrect(c, -76 - eng * 6, -48 - eng * 8, 46 + eng * 14, 20 + eng * 10, 3, P.amber, P.ink, A.px(c, 2));
    K.end(c);
    // mũi tên nhân quả phía trên
    const steps = [A.eo(t, 236.4, 237.0), A.eo(t, 238.0, 238.6), A.eo(t, 239.2, 239.8)];
    const xs = [650, 960, 1270];
    steps.forEach((p, i) => { if (p > 0) U.arrow(c, [xs[i]! - 90, 250], [xs[i]! + 90, 250], { p, color: P.amber, w: 10, head: 30 }); });
    // đồng hồ nhiên liệu cạn nhanh hơn
    if (fuel > 0) {
      A.rrect(c, 760, 860, 400, 44, 14, '#fff', P.ink, 4);
      A.rrect(c, 766, 866, 388 * (1 - fuel * 0.75), 32, 10, P.amber, null, 0);
    }
  }

  // ── B6–B7: 60 tấn; vài lít cho mỗi km
  private fuel(c: CanvasRenderingContext2D, t: number) {
    const drive = A.ph(t, 245.6, T_TOP);
    const dx = drive * drive * 1400 * 0 + A.eio(t, 245.7, T_TOP) * 1100;
    const cam = sideCam(dx + 200, 1.8, 820);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: dx, road: true });
    // cột mốc km
    for (let i = 0; i < 6; i++) {
      const x = 400 + i * 420;
      A.rrect(c, x - 6, -64, 12, 64, 3, '#fff', P.ink, A.px(c, 3));
      A.rrect(c, x - 22, -78, 44, 20, 4, P.sky, P.ink, A.px(c, 2));
    }
    V.tank(c, dx, 0, 1, { ph: dx * 1.2 });
    // giọt nhiên liệu rơi theo từng km
    for (let i = 0; i < 6; i++) {
      const x = 400 + i * 420;
      if (dx > x - 150) V.cargo(c, x, -90 - Math.max(0, 40 - (dx - x + 150) * 0.3), 'drum', 0.6, A.clamp01(1 - (dx - x) / 500));
    }
    K.end(c);
    // đồng hồ 60 t và nhiên liệu
    const tag = A.win(t, 244.7, 247.6, 0.3, 0.4);
    if (tag > 0) {
      const [sx, sy] = K.toScreen(cam, dx, -100);
      U.callout(c, '60 t', sx, sy - 160, { to: [sx, sy], p: tag, size: 46 });
    }
    const gp = A.ph(t, Q.fuelKm, T_TOP);
    if (gp > 0) {
      A.rrect(c, 60, 900, 360, 40, 14, '#fff', P.ink, 4);
      A.rrect(c, 66, 906, 348 * (1 - gp * 0.85), 28, 10, P.amber, null, 0);
    }
  }

  // ── C1: mù (nhìn TRÊN)
  private blind(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 120, y: 0, z: 2.4 };
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 200, patches: true });
    V.tankTop(c, 0, 0, 1, {});
    // kính ngắm hẹp: ba khe
    const sp = A.win(t, 257.6, 264.8, 0.5, 0.4);
    A.withA(c, sp, () => {
      c.fillStyle = 'rgba(56,189,248,0.28)';
      for (const a of [-0.55, 0, 0.55]) {
        c.beginPath(); c.moveTo(6, -6); c.arc(6, -6, 330, a - 0.11, a + 0.11); c.closePath(); c.fill();
      }
      c.beginPath(); c.moveTo(6, -6); c.arc(6, -6, 330, Math.PI - 0.11, Math.PI + 0.11); c.closePath(); c.fill();
    });
    // lính đối phương đi vòng ra ngoài tầm nhìn rồi bắn vào hông
    const w = A.eio(t, 259.5, 262.4);
    const ang = A.lerp(-1.1, -2.0, w);
    const sx = Math.cos(ang) * 260, sy = Math.sin(ang) * 260 * -1;
    if (t > 258.8) V.soldierTop(c, sx, sy, 1.4, { side: 'foe', ang: Math.atan2(-sy, -sx) });
    if (t > 262.4 && t < 264.6) {
      const u = ((t - 262.4) * 3) % 1;
      F.tracer(c, [sx, sy], [10, 0], u, 0.2, '#d95a48', 5);
      F.sparks(c, 10, 0, A.ph(t, 262.7, 263.3), 0.9, 0, Math.PI, 2);
    }
    K.end(c);
  }

  // ── C2: hào, nhà, sông chặn xe tăng
  private obstacles(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, [[264.96, { x: -500, y: 0, z: 1.3 }], [266.2, { x: 80, y: 0, z: 1.3 }], [267.5, { x: 900, y: 0, z: 1.3 }], [269.1, { x: 1000, y: 0, z: 1.3 }]], A.eio);
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250, patches: true });
    W.topRiver(c, [[1500, -800], [1500, 800]], 150);
    W.topRoad(c, [[-1400, 0], [1400, 0]], 80);
    // hào có lính
    c.save(); c.strokeStyle = '#8a7a58'; c.lineWidth = A.px(c, 26); c.beginPath(); c.moveTo(-100, -240); c.lineTo(-100, 240); c.stroke(); c.restore();
    V.soldierTop(c, -100, -90, 1.4, { side: 'foe', ang: Math.PI });
    V.soldierTop(c, -100, 90, 1.4, { side: 'foe', ang: Math.PI });
    // nhà
    A.rrect(c, 480, -250, 200, 180, 8, '#cfd5dc', P.ink, A.px(c, 3));
    A.rrect(c, 480, 70, 200, 180, 8, '#cfd5dc', P.ink, A.px(c, 3));
    V.soldierTop(c, 500, -70, 1.4, { side: 'foe', ang: Math.PI });
    // xe tăng dừng lần lượt trước mỗi chướng ngại
    const stops = [[-100 - 130, 265.2, 266.3], [480 - 130, 266.5, 267.7], [1500 - 160, 267.8, 269.0]];
    let x = -900;
    for (const [sx, , t1] of stops as number[][]) { void t1; x = sx!; }
    const kx = A.keys(t, [[264.96, -900], [265.9, -230], [266.4, -230], [267.2, 350], [267.8, 350], [268.8, 1340], [269.1, 1340]]);
    void x;
    V.tankTop(c, kx, 0, 1, { ph: kx });
    K.end(c);
    // dấu chặn
    const marks: [number, number, number][] = [[-100, 0, 266.0], [480, 0, 267.3], [1500, 0, 268.8]];
    marks.forEach(([wx, wy, at0]) => { const [sx, sy] = K.toScreen(cam, wx, wy); U.xMark(c, sx - 30, sy - 120, 34, A.eo(t, at0, at0 + 0.4), P.enemy, 9); });
  }

  // ── C3: xe tăng không giữ được đất
  private hold(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 120, y: 0, z: 1.25 };
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250, patches: true });
    W.topRoad(c, [[-1000, 0], [1000, 0]], 90);
    // thị trấn: dãy nhà hai bên đường
    for (let i = 0; i < 5; i++) {
      A.rrect(c, -380 + i * 190, -230, 150, 130, 6, '#cfd5dc', P.ink, A.px(c, 3));
      A.rrect(c, -380 + i * 190, 110, 150, 130, 6, '#cfd5dc', P.ink, A.px(c, 3));
    }
    const kx = A.keys(t, [[269.12, -150], [271.4, 60], [272.2, 60], [273.9, 800]]);
    // vùng "giữ": quanh xe, mất dần khi xe đi
    const held = 1 - A.sm(t, 272.2, 273.4);
    const hx = 60;
    A.withA(c, held, () => { c.fillStyle = 'rgba(125,139,90,0.22)'; c.beginPath(); c.arc(hx, 0, 300, 0, 6.283); c.fill(); c.strokeStyle = P.olive; c.lineWidth = A.px(c, 4); c.stroke(); });
    // địch ló ra từ cửa sổ nhà, bắn lúc xe đi
    const k = [0, 1, 2, 3, 4, 5];
    k.forEach((i) => {
      const bx = -300 + i * 190 + (i > 2 ? -190 * 3 + 0 : 0);
      const by = i % 2 ? 80 : -75;
      const x = i < 3 ? -300 + i * 190 : -300 + (i - 3) * 190;
      const y = i < 3 ? -85 : 85;
      void bx; void by;
      const pop = A.sm(t, 270.4 + i * 0.3, 270.9 + i * 0.3);
      if (pop > 0) V.soldierTop(c, x, y, 1.3, { side: 'foe', a: pop, ang: i < 3 ? Math.PI / 2 : -Math.PI / 2 });
    });
    V.tankTop(c, kx, 0, 1, { ph: kx });
    K.end(c);
  }

  // ── C4: đi cùng xe chở quân, xe chiến đấu bộ binh
  private escort(c: CanvasRenderingContext2D, t: number) {
    const dx = (t - 274.0) * 70;
    const cam: K.Cam = { x: dx + 100, y: 0, z: 1.35 };
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250, patches: true });
    W.topRoad(c, [[-400, 0], [2400, 0]], 120);
    const p = A.eo(t, 274.2, 276.0);
    V.tankTop(c, dx, 0, 1, { ph: dx });
    V.ifvTop(c, dx - 230 + (1 - p) * -200, -56, 1, { ph: dx, a: p });
    V.apcTop(c, dx - 230 + (1 - p) * -200, 56, 1, { ph: dx, a: p, cut: 1, riders: 6 });
    // bộ binh đi bộ hai bên
    for (let i = 0; i < 5; i++) V.soldierTop(c, dx + 120 + i * 14, (i % 2 ? 1 : -1) * (90 + (i >> 1) * 10), 1.4, { a: p });
    K.end(c);
  }

  // ── C5–C6: phá tuyến, giữ đất, bù điểm yếu cho nhau
  private combined(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, [[282.98, { x: 520, y: 0, z: 1.3 }], [290.5, { x: 520, y: 0, z: 1.3 }], [297.5, { x: 620, y: 0, z: 0.95 }]], A.eio);
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250, patches: true });
    // tuyến địch: các ổ trên x=700, mở ra khi xe tăng đâm
    const open = A.sm(t, 284.2, 285.4);
    for (let i = -4; i <= 4; i++) {
      const y = i * 90 + (Math.abs(i) <= 1 ? Math.sign(i || 1) * open * 150 : 0);
      A.rrect(c, 690, y - 30, 40, 60, 6, P.enemy, P.ink, A.px(c, 3));
    }
    // vùng giữ phía sau tuyến
    const held = A.sm(t, 287.0, 288.4);
    A.withA(c, held, () => { c.fillStyle = 'rgba(125,139,90,0.22)'; c.fillRect(730, -330, 380, 660); c.strokeStyle = P.olive; c.lineWidth = A.px(c, 4); c.setLineDash([16, 10]); c.strokeRect(730, -330, 380, 660); c.setLineDash([]); });
    // xe tăng đâm thẳng
    const tkx = A.lerp(60, 880, A.eio(t, 283.0, 285.8));
    for (const y of [-60, 60]) V.tankTop(c, tkx, y, 1, { ph: tkx });
    // IFV/APC theo sau qua lỗ hổng rồi xuống quân
    const fx = A.lerp(-150, 900, A.eio(t, 284.6, 287.2));
    V.ifvTop(c, fx, -42, 1, { ph: fx });
    V.apcTop(c, fx - 20, 48, 1, { ph: fx, cut: 1, riders: 6, ramp: A.eo(t, 287.0, 287.8) });
    const dis = A.eo(t, 287.4, 288.6);
    for (let i = 0; i < 6; i++) V.soldierTop(c, fx - 80 - dis * 0 + dis * (60 + i * 16), (i - 2.5) * 42, 1.4, { a: dis });
    // bù điểm yếu: nan quạt mù quanh xe tăng được lính che
    if (t > 288.2 && t < 295) {
      const k = A.win(t, 288.2, 294.6, 0.5, 0.6);
      A.withA(c, k, () => {
        for (const y of [-60, 60]) {
          c.fillStyle = 'rgba(125,139,90,0.28)';
          c.beginPath(); c.moveTo(tkx, y); c.arc(tkx, y, 150, Math.PI * 0.55, Math.PI * 1.45); c.closePath(); c.fill();
        }
      });
    }
    // lính chống tăng địch bị chặn
    if (t > 288.8 && t < 292) {
      const u = A.ph(t, 288.8, 290.4);
      V.soldierTop(c, 940, A.lerp(-330, -110, A.eo(u, 0, 1)), 1.4, { side: 'foe', a: 1 - A.sm(t, 290.8, 291.4) });
      F.tracer(c, [fx + 160, -90], [940, A.lerp(-330, -110, u)], A.ph(t, 290.0, 290.6), 0.2, P.amber, 4);
    }
    K.end(c);
    void at; void arcPts;
  }
}
