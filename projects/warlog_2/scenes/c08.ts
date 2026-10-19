// Chương 8 · 279.22–337.28 · Chặng cuối và khối lượng: tải cơ bản, giao hàng ban đêm, chuỗi nghìn km, nước và nhiên liệu.
// 279–287.8 SIDE tiểu đoàn mang tải cơ bản · 287.8–298 TOP đêm: đoàn xe nhỏ tới, thả, nhận, rời trước bình minh ·
// 298–305.3 TOP: tuyến, giờ hẹn, đơn vị đã dời chỗ · 305.6–312.2 TOP toàn cảnh chuỗi, mắt xích cuối đứt → cả chuỗi mờ ·
// 312.2–324 SIDE nước: một người → cả đơn vị → đoàn xe bồn · 324.4–337.3 cột cơ cấu khối lượng (sơ đồ): nhiên liệu + nước vượt đạn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as U from './shared/ui';
import * as F from './shared/fx';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

function person(c: Ctx, x: number, y: number, s = 1, col: string = P.dark) {
  A.circle(c, x, y - 16 * s, 5 * s, P.skin, INK, A.px(c, 1.5));
  A.rrect(c, x - 5 * s, y - 11 * s, 10 * s, 12 * s, 3 * s, col, INK, A.px(c, 1.5));
}

function night(c: Ctx, a: number) {
  if (a <= 0) return;
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = `rgba(28,40,84,${0.42 * a})`; c.fillRect(0, 0, 1920, 1080);
  c.restore();
}

export default class C08 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 287.8) this.s1(c, t);
    else if (t < 298.1) this.s2(c, t);
    else if (t < 305.5) this.s3(c, t);
    else if (t < 312.2) this.s4(c, t);
    else if (t < 324.2) this.s5(c, t);
    else this.s6(c, t);
  }

  // tiểu đoàn tiếp xúc: tải cơ bản trên chính các xe; nhìn ngang
  private s1(c: Ctx, t: number) {
    const GY = 760;
    const cam: K.Cam = { x: 1010, y: 600, z: 1.5 };
    K.begin(c, cam);
    c.fillStyle = '#e3e9ee'; c.fillRect(-100, GY, 2200, 500);
    A.line(c, [[-100, GY], [2100, GY]], INK, A.px(c, 4));
    S.hillsBack(c, 960, GY, -100, 2100, 0.5, '#dde7ee', 220, 6);
    // xe của tiểu đoàn: xe tăng + hai xe tải chở đạn, nhận tải đầy
    const fill = A.ph(t, 280.0, 283.0);
    S.tankSide(c, 520, GY, 1.2, { aim: 0.05 });
    for (let i = 0; i < 3; i++) if (fill * 3 > i) S.crate(c, 430 + i * 60, GY - 170, 1.2, 'ammo');
    S.truckSide(c, 960, GY, 1.1, { load: fill, kind: 'ammo' });
    S.truckSide(c, 1330, GY, 1.1, { load: fill, kind: 'fuel' });
    Cm.soldier(c, 1560, GY, 1.3, { dir: 1, aim: 0.05 });
    // "không chở thêm được": một kiện thêm không vào chỗ (bật ra, gạch đỏ)
    const k = A.ph(t, 284.4, 286.6);
    if (k > 0) {
      const x = A.lerp(1000, 1180, k), y = GY - 260 - Math.sin(k * Math.PI) * 70 + k * 190;
      S.crate(c, x, y, 1.4, 'ammo', 1 - A.ph(k, 0.8, 1));
      U.xMark(c, 1090, GY - 200, 34, A.sm(k, 0.3, 0.8), P.enemy, 9);
    }
    // phía địch bên phải: chớp nòng và đạn vạch (đang tiếp xúc)
    const fl = (t * 3.1) % 1;
    if (t > 281.5) {
      F.muzzleFlash(c, 1840, GY - 80, Math.PI, A.ph(fl, 0, 0.3), 1.2);
      F.tracer(c, [1830, GY - 80], [1640, GY - 150], A.ph((t * 2.1) % 1, 0, 1), 0.2, '#f59e0b', 5);
    }
    // hai phát pháo (khớp sound.json 283.2, 285.6): chớp lớn, bụi rơi gần tiểu đoàn
    for (const ct of [283.2, 285.6]) {
      F.muzzleFlash(c, 1850, GY - 60, Math.PI, A.ph(t, ct, ct + 0.3), 2.0);
      F.dust(c, 1380, GY - 4, A.ph(t, ct + 0.45, ct + 1.5), 1.6);
    }
    K.end(c);
  }

  // đêm: đoàn xe nhỏ tìm đơn vị, thả pallet, nhận hộp rỗng và thương binh, rời trước bình minh
  private s2(c: Ctx, t: number) {
    const cam: K.Cam = K.track(t, [[287.8, { x: 280, y: 0, z: 0.9 }], [292.0, { x: 560, y: 0, z: 1.15 }], [298.0, { x: 560, y: 0, z: 1.15 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = '#dfe6dc'; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
    M.forest(c, 100, 280, 170, 2); M.forest(c, 980, -300, 190, 5); M.forest(c, 900, 320, 170, 9);
    // đường dẫn tới vị trí
    S.roadLine(c, [[-500, 40], [100, 20], [300, 0], [520, 0]], 30);
    // vị trí tiểu đoàn: vòng xe
    const cx = 700, cy = 0;
    A.circle(c, cx, cy, 190, 'rgba(125,139,90,0.15)', INK, A.px(c, 2));
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2 + 0.3; S.tankTop(c, cx + Math.cos(a) * 130, cy + Math.sin(a) * 130, 0.5, { ang: a + Math.PI / 2 }); }
    M.unit(c, cx, cy, 'armor', 'ally', 110);
    // đoàn xe: 3 xe, tới (287.8–291), dừng, thả, nhận, rời (294.8–297.6)
    const arrive = A.eio(t, 288.0, 291.0), leave = A.eio(t, 294.6, 297.6);
    const x0 = -450, xStop = 330;
    const base = A.lerp(x0, xStop, arrive) - A.lerp(0, 1000, leave);
    for (let i = 0; i < 3; i++) {
      const x = base - i * 140;
      const dir = leave > 0 ? Math.PI : 0;
      const out = A.lerp(1, 0, A.ph(t, 291.2, 292.4));
      const back = A.ph(t, 292.6, 294.6);
      S.truckTop(c, x, 8 + (leave > 0 ? 30 : 0), 0.85, { ang: dir, load: leave > 0 ? back * 0.5 : out, kind: i === 0 ? 'ammo' : i === 1 ? 'fuel' : 'cargo', body: P.oliveDark });
    }
    // pallet thả (291.2–292.4) bên cạnh vòng xe
    const drop = A.ph(t, 291.2, 292.6);
    for (let i = 0; i < 4; i++) {
      const k = A.eo(drop, i * 0.12, i * 0.12 + 0.6);
      if (k > 0) S.crate(c, A.lerp(xStop + 40, 520 + i * 36, k), A.lerp(8, 30 + (i % 2) * 26, k), 1.6, (['ammo', 'fuel', 'water', 'ammo'] as S.CrateKind[])[i]);
    }
    // hộp rỗng + thương binh lên xe (292.6–294.6)
    const take = A.ph(t, 292.6, 294.4);
    for (let i = 0; i < 3; i++) {
      const k = A.eio(take, i * 0.15, i * 0.15 + 0.5);
      S.crate(c, A.lerp(560 + i * 30, xStop - 50, k), A.lerp(70, 8, k) + 6, 1.4, 'empty', 1 - A.ph(take, 0.75, 1));
    }
    // thương binh: cáng
    const kw = A.eio(t, 293.0, 294.5);
    c.save(); c.translate(A.lerp(580, xStop - 60, kw), A.lerp(90, 10, kw));
    A.rrect(c, -34, -12, 68, 24, 6, '#ffffff', INK, A.px(c, 3));
    A.rrect(c, -4, -9, 8, 18, 0, P.enemy, null, 0); A.rrect(c, -9, -4, 18, 8, 0, P.enemy, null, 0);
    c.restore();
    K.end(c);
    // đêm → bình minh
    const dawn = A.ph(t, 287.8, 297.8);
    night(c, 1 - A.sm(dawn, 0.55, 1.0) * 0.9);
    // đồng hồ cung: mặt trăng → mặt trời
    const ax = 1750, ay = 140;
    c.save(); c.strokeStyle = INK; c.lineWidth = 5; c.beginPath(); c.arc(ax, ay + 40, 90, Math.PI, 0); c.stroke(); c.restore();
    const th = Math.PI + dawn * Math.PI;
    A.circle(c, ax + Math.cos(th) * 90, ay + 40 + Math.sin(th) * 90, 20, dawn < 0.6 ? '#e5e9ee' : P.amber, INK, 4);
  }

  // mỗi chuyến giao là một cuộc hành quân nhỏ: tuyến, giờ hẹn, đơn vị đã dời
  private s3(c: Ctx, t: number) {
    const cam: K.Cam = { x: 600, y: 0, z: 0.95 };
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
    M.forest(c, 400, 300, 200, 4); M.forest(c, 1000, -300, 190, 8); M.river(c, [[700, -600], [650, -100], [780, 200], [700, 600]], 40);
    // ba tuyến có thể chọn
    const routes: Pt[][] = [[[-300, 0], [200, -80], [900, -120], [1250, -100]], [[-300, 0], [300, 20], [1000, 10], [1250, 40]], [[-300, 0], [200, 120], [700, 230], [1250, 180]]];
    const rk = A.eo(t, 298.4, 300.0);
    routes.forEach((r, i) => {
      const chosen = i === 1 && t > 301.0;
      A.withA(c, i === 1 ? 1 : 1 - 0.45 * A.sm(t, 301, 302), () => {
        c.save(); c.setLineDash([16, 12]);
        const seg = S.along(r, rk);
        const pts: Pt[] = [r[0]!]; for (let q = 1; q <= 10; q++) pts.push(S.along(r, rk * q / 10).slice(0, 2) as Pt);
        A.line(c, pts, chosen ? P.olive : 'rgba(30,41,59,0.55)', A.px(c, chosen ? 7 : 5));
        c.restore(); void seg;
      });
    });
    // điểm hẹn cũ (đã bỏ) và vị trí mới
    const old: Pt = [1150, 40], now: Pt = [1180, -190];
    const mv = A.eio(t, 301.6, 303.6);
    const ux = A.lerp(old[0], now[0], mv), uy = A.lerp(old[1], now[1], mv);
    c.save(); c.setLineDash([10, 8]);
    A.circle(c, old[0], old[1], 120, null, 'rgba(30,41,59,0.5)', A.px(c, 4));
    c.restore();
    M.unit(c, ux, uy, 'mech', 'ally', 190);
    if (mv > 0) U.arrow(c, [old[0] + 30, old[1] - 60], [now[0] - 20, now[1] + 70], { p: mv, color: P.amber, w: 10, head: 28 });
    // đồng hồ giờ hẹn (vòng) ở trên
    const cx = 600, cy = -330;
    A.circle(c, cx, cy, 70, '#fff', INK, A.px(c, 4));
    const q = A.ph(t, 298.4, 303.0);
    A.line(c, [[cx, cy], [cx + Math.cos(-Math.PI / 2 + q * 6.28) * 54, cy + Math.sin(-Math.PI / 2 + q * 6.28) * 54]], INK, A.px(c, 6));
    // đoàn xe đi tuyến giữa tới vị trí cũ rồi chững lại
    const k = A.eio(t, 300.2, 303.4);
    const [x, y, ang] = S.along(routes[1]!, k);
    S.truckTop(c, x, y, 1.0, { ang, load: 1, kind: 'ammo', body: P.oliveDark });
    S.truckTop(c, x - 130 * Math.cos(ang), y - 130 * Math.sin(ang), 1.0, { ang, load: 1, kind: 'fuel', body: P.oliveDark });
    if (t > 303.6) { const w = A.win(t, 303.6, 305.5, 0.2, 0.2); U.circleMark(c, x, y, 90, w, P.enemy, 8); }
    K.end(c);
  }

  // toàn cảnh chuỗi: mắt xích cuối đứt → cả chuỗi mờ đi
  private s4(c: Ctx, t: number) {
    const cam: K.Cam = K.track(t, [[305.5, { x: 1900, y: 0, z: 1.0 }], [307.8, { x: 450, y: 0, z: 0.5 }], [312.2, { x: 450, y: 0, z: 0.5 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 400);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 300, 'rgba(0,0,0,0)');
    // chuỗi: nhà máy (x=-1500) → cảng → ray → kho → xe tải cuối (x=2100)
    const NODE: Pt[] = [[-1500, 60], [-700, -80], [0, 80], [800, -50], [1500, 60], [2000, -20]];
    const dead = A.eio(t, 309.9, 311.8); // 0 → 1: mờ từ phải sang trái
    const nodeCol = (i: number) => { const lim = (NODE.length - 1 - i) / (NODE.length - 1); return A.clamp01((dead * 1.4 - lim) / 0.4); };
    // đoạn nối
    for (let i = 0; i < NODE.length - 1; i++) {
      const g = nodeCol(i + 1);
      c.save(); if (i === 0) c.setLineDash([22, 18]);
      A.line(c, [NODE[i]!, NODE[i + 1]!], A.lerpColor('#334155', '#b6bdc6', g), A.px(c, 14));
      c.restore();
    }
    NODE.forEach(([x, y], i) => {
      const g = nodeCol(i);
      A.withA(c, 1 - g * 0.6, () => {
        if (i === 0) S.factoryTop(c, x, y, 2.6);
        else if (i === 1) { A.rrect(c, x - 110, y - 70, 220, 140, 8, P.light, INK, A.px(c, 3.4)); }
        else if (i === 2) { A.rrect(c, x - 110, y - 70, 220, 140, 8, P.light, INK, A.px(c, 3.4)); A.line(c, [[x - 110, y], [x + 110, y]], INK, A.px(c, 10)); }
        else if (i === 3) S.depotTop(c, x, y, 2.2);
        else if (i === 4) S.depotTop(c, x, y, 2.2);
      });
    });
    // xe tải cuối chuỗi + dấu X khi không tới
    const [fx, fy] = NODE[5]!;
    const stall = A.sm(t, 309.6, 310.2);
    const fk = A.eio(t, 306.0, 309.4);
    const tx = A.lerp(NODE[4]![0], fx, fk), ty = A.lerp(NODE[4]![1], fy, fk);
    S.truckTop(c, tx, ty, 2.4, { ang: Math.atan2(fy - NODE[4]![1], fx - NODE[4]![0]), load: 1, kind: 'ammo' });
    M.unit(c, fx + 340, fy, 'armor', 'ally', 330);
    if (stall > 0) U.circleMark(c, tx, ty, 130 + 12 * Math.sin(t * 9), stall, P.enemy, 12);
    K.end(c);
  }

  // nước: một người → cả đơn vị → đoàn xe bồn chỉ chở nước
  private s5(c: Ctx, t: number) {
    const GY = 760;
    const cam: K.Cam = K.track(t, [[312.2, { x: 700, y: 620, z: 1.9 }], [317.0, { x: 700, y: 620, z: 1.9 }], [318.8, { x: 1150, y: 600, z: 1.2 }], [321.8, { x: 1150, y: 600, z: 1.2 }], [324.2, { x: 1150, y: 600, z: 1.2 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = '#e3e9ee'; c.fillRect(v.x0, GY, v.x1 - v.x0, 600);
    A.line(c, [[v.x0, GY], [v.x1, GY]], INK, A.px(c, 4));
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 260, 9);
    // một người lính: số lít nước mỗi ngày tăng (uống → thêm rửa/nấu): các can nước xếp cạnh
    Cm.soldier(c, 520, GY, 1.7, { dir: 1 });
    const n = Math.round(A.keys(t, [[313.0, 0], [316.2, 3], [319.0, 6]]));
    for (let i = 0; i < 6; i++) if (i < n) S.crate(c, 700 + (i % 3) * 56, GY - Math.floor(i / 3) * 42, 1.5, 'water');
    // cả đơn vị: hàng lính nhiều (từ 317.4)
    const m = A.eo(t, 317.4, 319.6);
    for (let i = 0; i < 14; i++) {
      const x = 900 + i * 70;
      A.withA(c, m * (i / 14 > m ? 0 : 1), () => { Cm.soldier(c, x, GY - 0, 0.95, { dir: 1 }); });
      if (m > 0.6) S.crate(c, x + 22, GY, 0.75, 'water', A.ph(m, 0.6, 1));
    }
    // đoàn xe bồn nước đến (320–324): chỉ chở nước
    const tk = A.eo(t, 320.0, 322.4);
    for (let i = 0; i < 3; i++) {
      const x = A.lerp(-300 - i * 330, 560 - 0 + i * 0 - i * 330 + 700, tk);
      S.at(c, x, GY, 1.1, 1, () => {
        A.rrect(c, -110, -92, 140, 48, 24, P.sky, INK, A.px(c, 3.4));
        A.rrect(c, -112, -44, 218, 14, 3, P.dark, INK, A.px(c, 3.4));
        A.poly(c, [[36, -44], [36, -100], [76, -100], [102, -68], [108, -44]], P.olive, INK, A.px(c, 3.4));
        A.poly(c, [[44, -92], [72, -92], [91, -70], [44, -70]], P.glass, INK, A.px(c, 2));
        for (const wx of [-80, -42, 72]) S.wheel(c, wx, -20, 20, x / 24);
      });
    }
    K.end(c);
  }

  // cơ cấu khối lượng hàng chuyển (sơ đồ): nhiên liệu + nước vượt xa đạn
  private s6(c: Ctx, t: number) {
    A.clear(c, '#f4f8fb');
    const bx = 700, base = 960, w = 380, H = 760;
    const seg: [string, number, number][] = [[P.amber, 0.38, 325.0], [P.sky, 0.30, 327.0], [P.sand, 0.20, 333.0], [P.dark, 0.12, 332.0]];
    // thứ tự vẽ từ đáy: nhiên liệu, nước, (sand), ammo
    let y = base;
    A.line(c, [[bx - w / 2 - 60, base], [bx + w / 2 + 60, base]], INK, A.px(c, 5));
    const order = [0, 1, 3, 2];
    const tops: Record<number, [number, number]> = {};
    for (const idx of order) {
      const [col, share, on] = seg[idx]!;
      const g = A.eo(t, on, on + 1.0);
      const h = H * share * g;
      c.fillStyle = col; c.fillRect(bx - w / 2, y - h, w, h);
      A.rrect(c, bx - w / 2, y - h, w, h, 0, null, INK, A.px(c, 3.4));
      tops[idx] = [y, y - h];
      y -= h;
    }
    // biểu tượng bên phải: bồn nhiên liệu, bồn nước, đạn (nhỏ) — người hình dung "đạn"
    S.truckSide(c, 1300, 420, 0.9, { tank: 1 });
    S.crate(c, 1520, 400, 2.2, 'fuel', A.sm(t, 325.2, 326.0));
    A.withA(c, A.sm(t, 327.2, 328.0), () => { S.crate(c, 1520, 620, 2.2, 'water'); });
    // ngoặc gộp nhiên liệu + nước
    if (t > 329.5) {
      const k = A.eo(t, 329.5, 331.0), y0 = tops[0]![0], y1 = tops[1]![1];
      A.withA(c, k, () => {
        A.line(c, [[bx + w / 2 + 40, y0], [bx + w / 2 + 70, y0], [bx + w / 2 + 70, y1], [bx + w / 2 + 40, y1]], P.ink, A.px(c, 7));
      });
    }
    // đạn: kiện nhỏ trong bóng suy nghĩ người xem (331.2–336.7)
    const th = A.sm(t, 332.0, 333.0);
    if (th > 0) {
      person(c, 1180, 960, 7.0);
      A.withA(c, th, () => { A.circle(c, 1360, 740, 120, '#ffffff', INK, A.px(c, 4)); S.crate(c, 1330, 780, 2.2, 'ammo'); S.crate(c, 1400, 780, 2.2, 'ammo'); });
    }
  }
}
