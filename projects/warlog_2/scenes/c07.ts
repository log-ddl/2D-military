// Chương 7 · 238.68–279.22 · Ai quyết định gửi gì: đẩy (push) và kéo (pull), rồi trộn.
// Sơ đồ mạng một bản duy nhất: kho (trái) → trạm trung chuyển → ba đơn vị (phải, mỗi đơn vị có "nhu cầu" = màu kiện).
// Quy ước: kiện đi trái→phải; thẻ yêu cầu (kiện rỗng viền nét đứt) đi phải→trái.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as M from './shared/map';
import * as U from './shared/ui';
import * as S from './_assets';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

const DEPOT: Pt = [230, 540], RELAY: Pt = [900, 540];
const UNITS: Pt[] = [[1560, 270], [1560, 540], [1560, 810]];
const NEED: S.CrateKind[] = ['fuel', 'ammo', 'water'];
const GUESS: S.CrateKind[] = ['cargo', 'water', 'fuel', 'part', 'cargo', 'ammo', 'water'];
const KIND_COL: Record<string, string> = { fuel: P.amber, ammo: P.dark, water: P.sky, part: P.sand, cargo: P.sand, empty: '#e5e9ee' };

function path(i: number): Pt[] { return [DEPOT, RELAY, UNITS[i]!]; }

function ghostCrate(c: Ctx, x: number, y: number, kind: S.CrateKind, s = 1.4, a = 1) {
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.scale(s, s); c.setLineDash([6, 5]);
    A.rrect(c, -18, -32, 36, 32, 4, 'rgba(255,255,255,0.8)', KIND_COL[kind] ?? INK, A.px(c, 3));
    c.setLineDash([]);
    A.circle(c, 0, -16, 7, KIND_COL[kind] ?? INK, INK, A.px(c, 1.5));
    c.restore();
  });
}

function needBubble(c: Ctx, i: number, a = 1) {
  const [x, y] = UNITS[i]!;
  A.withA(c, a, () => {
    A.rrect(c, x - 70, y - 230 / 2 + 0, 0, 0, 0, null, null, 0);
    A.rrect(c, x + 120, y - 50, 100, 100, 16, '#ffffff', INK, A.px(c, 3.4));
    S.crate(c, x + 170, y + 28, 1.45, NEED[i]!);
  });
}

function base(c: Ctx, t: number) {
  A.clear(c, '#f4f8fb');
  c.fillStyle = '#e8eff4';
  // đường nối
  for (let i = 0; i < 3; i++) { A.line(c, path(i), 'rgba(30,41,59,0.18)', A.px(c, 26)); }
  S.depotTop(c, DEPOT[0], DEPOT[1], 1.5);
  M.unit(c, RELAY[0], RELAY[1], 'hq', 'ally', 190);
  UNITS.forEach(([x, y], i) => { M.unit(c, x, y, (['mech', 'armor', 'art'] as const)[i]!, 'ally', 200); });
  void t;
}

export default class C07 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    base(c, t);
    // nhu cầu của từng đơn vị
    const needA = A.sm(t, 239.3, 240.3);
    for (let i = 0; i < 3; i++) needBubble(c, i, needA);
    // 241.3–243: hai hướng — mũi tên đẩy (phải) và kéo (trái)
    if (t > 241.2 && t < 243.4) {
      const k = A.win(t, 241.2, 243.4, 0.3, 0.3);
      A.withA(c, k, () => {
        U.arrow(c, [450, 400], [760, 400], { p: A.eo(t, 241.3, 242.0), color: P.olive, w: 18, head: 40 });
        U.arrow(c, [1250, 700], [940, 700], { p: A.eo(t, 242.0, 242.8), color: P.amber, w: 18, head: 40 });
      });
    }
    // 243–247.5 và 254.3–258.6: đẩy
    const pushOn = (t >= 243.0 && t < 247.6) || (t >= 254.2 && t < 258.8);
    if (pushOn || (t > 258.8 && false)) this.push(c, t);
    // 247.96–252.3: kéo gọn (đúng, nhanh)
    if (t >= 247.9 && t < 252.4) this.pullFast(c, t);
    // 259–265.5: kéo chậm — thẻ leo qua các tầng, đồng hồ chạy
    if (t >= 258.9 && t < 265.8) this.pullSlow(c, t);
    // 265.5–279.2: trộn, hai làn
    if (t >= 265.5) this.mix(c, t);
  }

  private push(c: Ctx, t: number) {
    const t0 = t < 250 ? 243.0 : 254.2;
    const piles = [0, 0, 0];
    for (let n = 0; n < 12; n++) {
      const emit = t0 + n * 0.55;
      const ui = n % 3;
      const kind = GUESS[n % GUESS.length]!;
      const k = A.ph(t, emit, emit + 3.0);
      if (k <= 0) continue;
      const [x, y, ] = S.along(path(ui), A.eio(k, 0, 1));
      const match = kind === NEED[ui];
      const arrived = k >= 1;
      if (!arrived) S.crate(c, x, y, 1.5, kind);
      else {
        const [ux, uy] = UNITS[ui]!;
        const off = piles[ui]!++;
        S.crate(c, ux - 150 + (off % 3) * 52, uy + 120 - Math.floor(off / 3) * 40, 1.3, kind, match ? 0.35 : 1);
        if (!match) U.xMark(c, ux - 150 + (off % 3) * 52, uy + 100 - Math.floor(off / 3) * 40, 16, 1, P.enemy, 6);
      }
    }
    // 254.3–258.6: một pallet sai đến và đứng đó
    if (t >= 254.2) {
      const k = A.eio(t, 254.6, 257.0);
      const [x, y] = S.along(path(1), k);
      for (let j = 0; j < 3; j++) S.crate(c, x - 30 + j * 30, y + 40 - 0, 1.8, 'water');
      if (k >= 1) U.xMark(c, UNITS[1]![0] - 90, UNITS[1]![1] + 20, 40, A.eo(t, 257.0, 257.6), P.enemy, 10);
    }
  }

  private pullFast(c: Ctx, t: number) {
    for (let i = 0; i < 3; i++) {
      const tr = 248.0 + i * 0.7;
      const kq = A.ph(t, tr, tr + 1.4), ka = A.ph(t, tr + 1.4, tr + 3.0);
      if (kq > 0 && kq < 1) { const [x, y] = S.along([UNITS[i]!, RELAY, DEPOT], kq); ghostCrate(c, x, y, NEED[i]!, 1.4); }
      if (ka > 0 && ka < 1) { const [x, y] = S.along(path(i), ka); S.crate(c, x, y, 1.5, NEED[i]!); }
      if (ka >= 1) { S.crate(c, UNITS[i]![0] - 140, UNITS[i]![1] + 100, 1.5, NEED[i]!); A.circle(c, UNITS[i]![0] - 140, UNITS[i]![1] + 50, 14, '#16a34a', INK, A.px(c, 2)); }
    }
  }

  private pullSlow(c: Ctx, t: number) {
    const u = 1; // đơn vị giữa
    const dt = t - 259.0;
    // token: UNIT → RELAY (1.4s), dừng 0.9, RELAY → DEPOT (1.4s), dừng 0.6, rồi kiện về DEPOT → RELAY (1.4), dừng 0.9, → UNIT (1.4)
    const seq: [number, Pt, Pt, boolean][] = [
      [0, UNITS[u]!, RELAY, false], [2.3, RELAY, DEPOT, false],
      [4.0, DEPOT, RELAY, true], [5.4, RELAY, UNITS[u]!, true],
    ];
    const dur = [1.4, 1.4, 1.4, 1.4];
    let drawn = false;
    seq.forEach(([s0, a, b, answer], idx) => {
      const k = A.ph(dt, s0, s0 + dur[idx]!);
      if (k > 0 && k < 1 && !drawn) {
        drawn = true;
        const x = A.lerp(a[0], b[0], A.eio(k, 0, 1)), y = A.lerp(a[1], b[1], A.eio(k, 0, 1));
        if (answer) S.crate(c, x, y, 1.6, NEED[u]!); else ghostCrate(c, x, y, NEED[u]!, 1.5);
      }
    });
    if (dt >= 6.8) S.crate(c, UNITS[u]![0] - 140, UNITS[u]![1] + 100, 1.6, NEED[u]!);
    if (dt >= 2.8 && dt < 4.0) ghostCrate(c, DEPOT[0] + 130, DEPOT[1] - 100, NEED[u]!, 1.5);
    if (dt >= 1.4 && dt < 2.3) ghostCrate(c, RELAY[0], RELAY[1] - 120, NEED[u]!, 1.5);
    // đồng hồ: vòng chạy suốt thời gian chờ
    const cx = 960, cy = 150, r = 78;
    A.circle(c, cx, cy, r, '#ffffff', INK, A.px(c, 4));
    const q = A.ph(dt, 0, 6.6);
    c.save(); c.strokeStyle = P.amber; c.lineWidth = A.px(c, 14); c.lineCap = 'butt';
    c.beginPath(); c.arc(cx, cy, r - 10, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 2); c.stroke(); c.restore();
    A.line(c, [[cx, cy], [cx + Math.cos(-Math.PI / 2 + q * 6.28) * (r - 24), cy + Math.sin(-Math.PI / 2 + q * 6.28) * (r - 24)]], INK, A.px(c, 5));
  }

  private mix(c: Ctx, t: number) {
    A.clear(c, '#f4f8fb');
    const yPush = 330, yPull = 780;
    // hai làn
    c.fillStyle = '#e8eff4';
    c.fillRect(0, yPush - 90, 1920, 190); c.fillRect(0, yPull - 90, 1920, 190);
    A.line(c, [[0, yPush - 90], [1920, yPush - 90]], INK, A.px(c, 3));
    A.line(c, [[0, yPush + 100], [1920, yPush + 100]], INK, A.px(c, 3));
    A.line(c, [[0, yPull - 90], [1920, yPull - 90]], INK, A.px(c, 3));
    A.line(c, [[0, yPull + 100], [1920, yPull + 100]], INK, A.px(c, 3));
    // đích: ba đơn vị phải
    M.unit(c, 1720, yPush, 'mech', 'ally', 180); M.unit(c, 1720, yPull, 'mech', 'ally', 180);
    S.depotTop(c, 150, yPush, 1.2); S.depotTop(c, 150, yPull, 1.2);
    // hàng chờ ở giữa: sắp xếp
    const kinds: S.CrateKind[] = ['fuel', 'part', 'ammo', 'part', 'water', 'cargo'];
    const sort = A.eio(t, 267.4, 270.4);
    kinds.forEach((kind, i) => {
      const isPush = kind === 'fuel' || kind === 'ammo' || kind === 'water';
      const x0 = 520 + i * 100, y0 = 540 + 34;
      const x = x0, y = A.lerp(y0, isPush ? yPush + 50 : yPull + 50, sort);
      S.crate(c, x, y, 1.6, kind);
    });
    // làn đẩy: đều nhịp
    if (t > 271.5) {
      const k = A.win(t, 271.5, 277.0, 0.4, 0.8);
      A.withA(c, k, () => {
        for (let i = 0; i < 10; i++) {
          const x = ((t - 271.5) * 260 + i * 260) % 2600 - 300;
          S.crate(c, x, yPush + 50, 1.5, (['fuel', 'ammo', 'water'] as S.CrateKind[])[i % 3]);
        }
        // nhịp đều: các vạch dưới làn
        for (let x = 100; x < 1900; x += 130) A.line(c, [[x, yPush + 118], [x, yPush + 138]], INK, A.px(c, 4));
      });
    }
    // làn kéo: một yêu cầu → một kiện
    if (t > 277.0) {
      const k = A.ph(t, 277.2, 278.4), ka = A.ph(t, 278.4, 279.2);
      if (k > 0 && ka === 0) ghostCrate(c, A.lerp(1720, 150, k), yPull + 50, 'part', 1.6);
      if (ka > 0) S.crate(c, A.lerp(150, 1500, A.ph(t, 278.4, 279.6)), yPull + 50, 1.6, 'part');
    }
  }
}
