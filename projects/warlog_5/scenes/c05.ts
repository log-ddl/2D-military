// Chương 5 (190.6 – 253.8): kéo ↔ tự hành; radar phản pháo; bắn rồi rời; vị trí dùng hai lần.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as M from './shared/map';
import { P } from './shared/palette';
import * as X from './_art';

export const T5 = {
  towFire: 199.0, spFire: 205.6, ourFire: 211.0, ourLand: 219.5, enemyFire: 220.3, enemyLand: 224.1,
  mapFires: [226.45, 227.0, 227.55], p1Boom: 229.7, hideFire: 233.6, hop: [240.4, 242.4], p1Fire: 245.0, p1Boom2: 246.4,
};

const TOP: K.Cam = { x: 1000, y: 420, z: 0.55 };
const P1: A.Pt = [330, 250], P2: A.Pt = [560, 560], P3: A.Pt = [240, 640], P4: A.Pt = [720, 330];
const RADAR: A.Pt = [1750, 380], EGUN: A.Pt = [1950, 270];

export default class S05 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 193.2) this.pair(c, t);
    else if (t < 200.8) this.towed(c, t);
    else if (t < 210.5) this.selfProp(c, t);
    else if (t < 225.15) this.radarSide(c, t);
    else if (t < 247.0) this.map(c, t);
    else this.pan(c, t);
    for (const at of [193.2, 200.8, 210.5, 225.18, 247.0]) X.dip(c, t, at, 0.1);
  }

  // 190.6–193.2: hai cách di chuyển
  private pair(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -200, z: 0.85 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const a = A.back(t, 190.7, 191.3), b = A.back(t, 191.2, 191.8);
    if (a > 0) { X.towedGun(c, { x: -560, s: 0.85 * Math.min(1, a), elev: 0.2, deploy: 0.1 }); X.truck(c, { x: -170, s: 0.8 * Math.min(1, a), load: 0 }); }
    if (b > 0) X.spGun(c, { x: 480, s: 0.8 * Math.min(1, b), elev: 0.2 });
    K.end(c);
  }

  // 193.2–200.8: pháo kéo — rẻ, nhẹ, dễ giấu, nhưng chậm triển khai
  private towed(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 120, y: -230, z: 0.95 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const arrive = A.eo(t, 193.2, 195.0);
    const gx = A.lerp(-1000, -120, arrive);
    // xe kéo: tới → rời → quay lại ở làn xa → kéo đi
    let tx = gx + 380, ty = 0, ts = 0.8, dep = 0.1;
    if (t >= 196.4 && t < 197.8) { tx = -120 + 380 + 1300 * A.ei(t, 196.4, 197.8); }
    else if (t >= 197.8 && t < 199.4) { tx = 3000; }
    else if (t >= 199.4) {
      const k = A.eo(t, 199.4, 200.1);
      const leave = A.ei(t, 200.3, 201.0);
      tx = A.lerp(-600, 260, k) + leave * 900; ty = -26; ts = 0.7;
    }
    // trạng thái chân càng và nòng
    let elev = 0.2, gdx = gx;
    if (t >= 197.4) dep = A.sm(t, 197.4, 198.0);
    if (t >= 198.2) elev = A.lerp(0.2, 0.7, A.sm(t, 198.2, 198.8));
    if (t >= 199.5) { dep = 1 - A.sm(t, 199.5, 200.1); elev = A.lerp(0.7, 0.2, A.sm(t, 199.5, 200.1)); }
    if (t >= 200.3) gdx = -120 + A.ei(t, 200.3, 201.0) * 900;
    const rc = A.bump(t, T5.towFire, 0.7) * 0.9;
    const wheel = (t < 196.4 ? gx : gdx) * 0.04;
    X.truck(c, { x: tx, y: ty, s: ts, load: 0, wheel: tx * 0.04 });
    const m = X.towedGun(c, { x: gdx, elev, deploy: dep, recoil: rc, s: 0.95, wheel });
    if (t >= T5.towFire) F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, T5.towFire, T5.towFire + 0.25), 1.3);
    if (t >= T5.towFire && t < T5.towFire + 1.2) F.smoke(c, m.x, m.y, t - T5.towFire, 0.9, 4, '#6b7280', 30);
    // lưới nguỵ trang: dễ giấu
    const nn = A.win(t, 195.5, 196.5, 0.3, 0.3);
    if (nn > 0) X.net(c, gdx + 60, 420, 200, nn);
    K.end(c);
    // biểu tượng rẻ / nhẹ
    const ic = A.back(t, 193.6, 194.1);
    if (ic > 0 && t < 196.4) { X.coin(c, 300, 150, 0.9 * Math.min(1, ic)); }
    const ic2 = A.back(t, 194.5, 195.0);
    if (ic2 > 0 && t < 196.4) { X.weightIcon(c, 470, 160, 0.55 * Math.min(1, ic2), P.light); }
    // đồng hồ: mất phút
    const sw = A.win(t, 196.4, 200.7, 0.3, 0.3);
    if (sw > 0) A.withA(c, sw, () => X.stopwatch(c, 1700, 170, 90, A.ph(t, 196.5, 200.6) * 0.85));
  }

  // 200.8–210.5: tự hành — dừng, bắn, đi trong chưa tới một phút; đắt, tốn nhiên liệu
  private selfProp(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 120, y: -230, z: 0.9 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const come = A.eo(t, 200.9, 202.4);
    const leave = A.ei(t, 206.4, 207.9);
    const x = A.lerp(-1200, -60, come) + leave * 1400;
    const track = x * 0.5;
    const morph = A.sm(t, 202.9, 203.5) * (1 - A.sm(t, 204.0, 204.5));  // bánh xích → bánh lốp rồi về
    const wheeled = A.sm(t, 202.9, 203.5) * (1 - A.sm(t, 204.0, 204.5)) > 0.5;
    const elev = A.lerp(0.15, 0.75, A.sm(t, 203.8, 204.8));
    const e2 = t > 206.1 ? A.lerp(elev, 0.15, A.sm(t, 206.1, 206.6)) : elev;
    const rc = A.bump(t, T5.spFire, 0.7) * 0.9;
    A.withA(c, 1 - morph * 0.0, () => {
      const m = X.spGun(c, { x, elev: e2, recoil: rc, track, wheels: wheeled, s: 0.95 });
      if (t >= T5.spFire) F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, T5.spFire, T5.spFire + 0.25), 1.4);
      if (t >= T5.spFire && t < T5.spFire + 1.2) F.smoke(c, m.x, m.y, t - T5.spFire, 0.9, 4, '#6b7280', 30);
    });
    if ((t > 201.0 && t < 202.5) || (t > 206.4 && t < 208.0)) F.dust(c, x - 150, 0, (t * 2.5) % 1, 1.1);
    K.end(c);
    const sw = A.win(t, 205.0, 208.0, 0.2, 0.3);
    if (sw > 0) A.withA(c, sw, () => X.stopwatch(c, 1700, 170, 90, A.ph(t, 205.0, 207.9) * 0.28));
    // đắt: chồng đồng tiền cao; tốn xăng: can nhiên liệu
    const n = Math.round(4 * A.sm(t, 208.2, 209.0));
    for (let i = 0; i < n; i++) X.coin(c, 520, 840 - i * 70, 0.9);
    const fa = A.back(t, 209.1, 209.6);
    if (fa > 0) {
      c.save(); c.translate(1100, 780); c.scale(Math.min(1, fa), Math.min(1, fa));
      A.rrect(c, -50, -70, 100, 130, 14, P.sand, P.ink, 5);
      A.rrect(c, -50, -92, 40, 26, 6, P.dark, P.ink, 4);
      A.line(c, [[-20, 0], [20, 0]], P.ink, 6); A.line(c, [[0, -20], [0, 20]], P.ink, 6);
      for (let i = 0; i < 3; i++) A.circle(c, 70 + i * 4, 60 + ((t * 80 + i * 30) % 90), 7, '#0ea5e9', null, 0);
      c.restore();
    }
  }

  // 210.5–225.15: radar thấy đạn, dò ngược vị trí pháo, bắn trả; ta rời đi
  private radarSide(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 1000, y: -330, z: 0.62 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    X.trench(c, 2380, 1.0, 2);
    // radar địch + pháo địch
    const rs = 0.5;
    X.radar(c, { x: 1830, s: rs, dir: -1, spin: t * 2.2 });
    const eg = X.spGun(c, { x: 2120, dir: -1, s: 0.55, elev: 0.7, tint: P.enemy, recoil: A.bump(t, T5.enemyFire, 0.7) * 0.9 });
    // pháo ta (rời đi từ 221.6)
    const away = A.ei(t, 221.6, 223.4);
    const gx = -900 * away;
    const el = 0.8;
    const m = X.spGun(c, { x: gx, elev: el, recoil: A.bump(t, T5.ourFire, 0.8) * 0.9, track: gx * 0.4 });
    if (t >= 221.6 && t < 223.6) F.dust(c, gx + 200, 0, (t * 2.4) % 1, 1.4);
    const start: A.Pt = X.spMuzzleP(el);
    const land: A.Pt = [2300, -8];
    const h = X.arcH(start, land, el);
    const ph = A.ph(t, T5.ourFire + 0.05, T5.ourLand);
    if (t >= T5.ourFire) { F.muzzleFlash(c, m.x, m.y, m.ang, A.ph(t, T5.ourFire, T5.ourFire + 0.3), 1.6); F.smoke(c, m.x, m.y, Math.min(t - T5.ourFire, 3), 1.2, 5, '#6b7280', 30); }
    X.flight(c, start, land, h, ph, { s: 1.0, w: A.px(c, 5) });
    if (t >= T5.ourLand) F.explosion(c, land[0], -20, 100, A.ph(t, T5.ourLand, T5.ourLand + 0.7), 4);
    // quạt radar + vòng bám đạn
    const rp = A.win(t, 212.6, 217.0, 0.3, 0.5);
    if (rp > 0) {
      A.withA(c, rp, () => {
        c.beginPath(); c.moveTo(1830, -170); c.arc(1830, -170, 1100, Math.PI * 1.02, Math.PI * 1.45); c.closePath();
        c.fillStyle = 'rgba(56,189,248,0.18)'; c.fill();
        c.strokeStyle = P.sky; c.lineWidth = A.px(c, 3); c.stroke();
      });
      if (ph > 0 && ph < 1) {
        const [sx, sy] = X.arcAt(start, land, h, ph);
        U.ring(c, sx, sy, 90, (t * 1.6) % 1, P.sky, A.px(c, 4));
      }
    }
    // dò ngược cung → vị trí pháo ta
    const bp = A.sm(t, 215.4, 217.4);
    if (bp > 0) {
      const mid = A.ph(t, T5.ourFire + 0.05, T5.ourLand);
      const p0 = A.clamp(0.52 - 0.52 * bp, 0, 1);
      const pts: A.Pt[] = [];
      for (let i = 0; i <= 30; i++) { const u = 0.52 - (0.52 - 0) * bp * (i / 30); const [x, y] = X.arcAt(start, land, h, u); pts.push([x, y]); }
      void mid; void p0;
      A.line(c, pts, P.enemy, A.px(c, 6), [14, 10]);
    }
    if (t >= 217.6 && t < 223.4) {
      const k = A.sm(t, 217.6, 218.1);
      U.crosshair(c, 120, -170, 70 * (2 - k), P.enemy, k, t * 0.6);
    }
    // quả đạn phản pháo
    if (t >= T5.enemyFire) {
      F.muzzleFlash(c, eg.x, eg.y, eg.ang, A.ph(t, T5.enemyFire, T5.enemyFire + 0.3), 1.4);
      const ea: A.Pt = [eg.x, eg.y], eb: A.Pt = [220, -8];
      X.flight(c, ea, eb, X.arcH(ea, eb, 0.7) + 40, A.ph(t, T5.enemyFire + 0.05, T5.enemyLand), { s: 1.0, trail: P.enemy, w: A.px(c, 5) });
      if (t >= T5.enemyLand) { F.explosion(c, eb[0], -20, 110, A.ph(t, T5.enemyLand, T5.enemyLand + 0.8), 4); F.debris(c, eb[0], -20, t - T5.enemyLand, 1.0, 10, 4, 0); }
    }
    K.end(c);
    // đồng hồ một-hai phút
    const cw = A.win(t, 217.9, 221.4, 0.3, 0.4);
    if (cw > 0) A.withA(c, cw, () => X.stopwatch(c, 1700, 170, 90, A.ph(t, 217.9, 221.0) * 0.9, P.enemy));
  }

  // 225.18–247.0: bản đồ — bắn rồi rời, bị đánh dấu, dùng hai lần
  private map(c: CanvasRenderingContext2D, t: number) {
    K.begin(c, TOP);
    M.mapBg(c, TOP, { color: '#ece6cf' });
    M.forest(c, 560, 560, 120, 3); M.forest(c, 470, 640, 80, 9); M.forest(c, 650, 640, 70, 5);
    M.forest(c, 1100, 250, 90, 11); M.forest(c, 1250, 640, 110, 4);
    // phía địch
    X.top(c, 'radar', RADAR[0], RADAR[1], Math.PI, 1.7, 'foe');
    X.top(c, 'sp', EGUN[0], EGUN[1], Math.PI, 1.4, 'foe');
    X.top(c, 'sp', EGUN[0], EGUN[1] + 260, Math.PI, 1.4, 'foe');

    // đường đi của pháo ta
    const g = this.gunPath(t);
    // các vị trí đã dùng (vòng đánh dấu)
    const marks: [A.Pt, number][] = [[P1, 227.8], [P2, 234.8], [P3, 240.6], [P4, 242.6]];
    for (const [p, tm] of marks) {
      if (t >= tm) {
        const a = A.sm(t, tm, tm + 0.4);
        A.withA(c, a, () => { A.circle(c, p[0], p[1], 70, 'rgba(180,73,60,0.16)', P.enemy, A.px(c, 4)); U.crosshair(c, p[0], p[1], 36, P.enemy, 1, 0); });
      }
    }
    // tuyến di chuyển (mờ)
    if (t > 228.0) A.line(c, [P1, P2], 'rgba(30,41,59,0.35)', A.px(c, 3), [14, 12]);
    // pháo ta
    const gunA = g.show ? 1 : 0;
    if (gunA > 0 && !g.dead) X.top(c, 'sp', g.x, g.y, g.rot, 2.0, 'ally');
    // rừng phủ lên pháo (giấu) ở P2
    if (t > 232.7 && t < 235.5 && g.at === 'P2') { M.forest(c, P2[0], P2[1], 90, 21); }
    // quả đạn ta (nét đứt) về phía địch
    const sh = (tf: number, from: A.Pt, to: A.Pt, tl = 1.0) => {
      const p = A.ph(t, tf, tf + tl);
      if (p <= 0) return;
      A.line(c, [from, [A.lerp(from[0], to[0], p), A.lerp(from[1], to[1], p)]], P.amber, A.px(c, 4), [12, 10]);
      if (p < 1) A.circle(c, A.lerp(from[0], to[0], p), A.lerp(from[1], to[1], p), 9, P.amber, P.ink, 2);
    };
    for (const tf of T5.mapFires) { sh(tf, P1, [1560, P1[1] + 100]); if (t >= tf) F.muzzleFlash(c, P1[0] + 70, P1[1], 0, A.ph(t, tf, tf + 0.25), 0.7); }
    sh(T5.hideFire, P2, [1560, P2[1] - 120]);
    for (const tf of T5.hop) { const p = tf < 241 ? P3 : P4; sh(tf, p, [1560, p[1] - 80]); }
    sh(T5.p1Fire, P1, [1560, P1[1] + 80]);
    // phản pháo đỏ: về P1 rồi P1 lần hai
    const cf = (tf: number, tl: number, to: A.Pt) => {
      const p = A.ph(t, tf, tf + tl);
      if (p <= 0) return;
      const from = EGUN;
      A.line(c, [from, [A.lerp(from[0], to[0], p), A.lerp(from[1], to[1], p)]], P.enemy, A.px(c, 5), [12, 10]);
      if (p < 1) A.circle(c, A.lerp(from[0], to[0], p), A.lerp(from[1], to[1], p), 10, P.enemy, P.ink, 2);
      else F.explosion(c, to[0], to[1], 80, A.ph(t, tf + tl, tf + tl + 0.7), 3);
    };
    cf(T5.p1Boom - 2.5, 2.5, P1);
    cf(T5.p1Boom2 - 1.4, 1.4, P1);
    // quét radar: chỉ thấy phát bắn
    const sw = (t - 225) * 1.2;
    const fanOn = t > 232.7;
    if (fanOn) {
      const a0 = Math.PI * 0.88 + 0.22 * Math.sin(sw), a1 = a0 + 0.38;
      M.fan(c, RADAR[0], RADAR[1], 1300, a0, a1, 1, P.sky);
    }
    K.end(c);
    // đồng hồ dưới một phút
    const sa = A.win(t, 230.3, 232.4, 0.3, 0.3);
    if (sa > 0) A.withA(c, sa, () => X.stopwatch(c, 1740, 170, 92, A.ph(t, 230.3, 232.2) * 0.72, P.olive));
    // mắt gạch chéo: radar không cần thấy pháo
    const ey = A.win(t, 233.0, 236.0, 0.3, 0.4);
    if (ey > 0) A.withA(c, ey, () => { const s = K.toScreen(TOP, P2[0] - 20, P2[1] - 110); X.eye(c, s[0], s[1], 46, A.sm(t, 233.2, 233.7)); });
  }

  // trạng thái pháo ta trên bản đồ
  private gunPath(t: number): { x: number; y: number; rot: number; show: boolean; at: string; dead: boolean } {
    const lerpP = (a: A.Pt, b: A.Pt, p: number): A.Pt => [A.lerp(a[0], b[0], p), A.lerp(a[1], b[1], p)];
    const ang = (a: A.Pt, b: A.Pt) => Math.atan2(b[1] - a[1], b[0] - a[0]);
    const S: A.Pt = [160, 110];
    type Seg = [number, number, A.Pt, A.Pt, string];
    const segs: Seg[] = [
      [225.18, 226.2, S, P1, 'P1'],
      [228.0, 229.8, P1, P2, 'P2'],
      [235.3, 236.8, P2, P3, 'P3'],
      [240.8, 241.6, P3, P4, 'P4'],
      [243.0, 244.2, P4, P1, 'P1'],
    ];
    let pos: A.Pt = S, rot = ang(P1, [1560, P1[1] + 100]) , at = 'S';
    if (t < 225.18) return { x: S[0], y: S[1], rot, show: false, at, dead: false };
    // hold positions by time
    const holds: [number, number, A.Pt, string][] = [
      [226.2, 228.0, P1, 'P1'], [229.8, 235.3, P2, 'P2'], [236.8, 240.8, P3, 'P3'], [241.6, 243.0, P4, 'P4'], [244.2, 247.0, P1, 'P1'],
    ];
    for (const [a, b, p, n] of holds) if (t >= a && t < b) { pos = p; at = n; rot = ang(p, [1560, p[1]]) * 0; }
    for (const [a, b, p, q, n] of segs) if (t >= a && t < b) { const k = A.eio(t, a, b); pos = lerpP(p, q, k); rot = ang(p, q); at = n; }
    const dead = t > T5.p1Boom2 + 0.1;
    return { x: pos[0], y: pos[1], rot, show: true, at, dead };
  }

  // 247.0–253.8: bản đồ lùi, nhìn sang nơi khẩu pháo chưa biết bắn vào đâu
  private pan(c: CanvasRenderingContext2D, t: number) {
    const k = A.eio(t, 247.2, 252.4);
    const cam = K.mix(TOP, { x: 2300, y: 380, z: 0.55 }, k);
    K.begin(c, cam);
    M.mapBg(c, cam, { color: '#ece6cf' });
    M.forest(c, 560, 560, 120, 3); M.forest(c, 1100, 250, 90, 11); M.forest(c, 1250, 640, 110, 4); M.forest(c, 2050, 600, 100, 2);
    X.top(c, 'sp', P1[0], P1[1], 0, 2.0, 'ally');
    X.top(c, 'radar', RADAR[0], RADAR[1], Math.PI, 1.7, 'foe');
    X.top(c, 'sp', EGUN[0], EGUN[1], Math.PI, 1.4, 'foe');
    M.town(c, 2700, 360, 110, 4);
    M.unit(c, 2700, 360, 'inf', 'foe', 80);
    // đường liên lạc đứt từ pháo tới vùng chưa biết
    const dp = A.sm(t, 249.0, 252.6);
    A.line(c, [P1, [A.lerp(P1[0], 2700, dp), A.lerp(P1[1], 360, dp)]], P.sky, A.px(c, 5), [18, 14]);
    K.end(c);
    // khoảng trống: dấu hỏi vẽ bằng nét (không chữ)
    const q = A.sm(t, 251.2, 252.0);
    if (q > 0) {
      const s = K.toScreen(cam, 2700, 190);
      A.withA(c, q, () => { c.save(); c.translate(s[0], s[1]); A.circle(c, 0, 0, 60, '#fff', P.sky, 6); A.circle(c, 0, 0, 14, P.sky, null, 0); c.restore(); });
    }
  }
}
