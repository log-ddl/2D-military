// Chương 2 (41.8–98.2): xe tải: làm gì, lỗi ở đâu?
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as R from './shared/rig';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { dip, sideCam, halo, LINE, LINE_ORDER, along, at, arcPts, type LineKey, type Pt } from './_common';
import { drawKind, TOP_OF } from './_lineup';

const ROAD: Pt[] = [[-3000, 0], [3000, 0]];
const SNAKE: Pt[] = [[-2600, 520], [-1300, 520], [-700, -300], [700, -300], [1300, 420], [2800, 420]];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < Q.fuelTanker) this.intro(c, t);
    else if (t < Q.chain) this.supply(c, t);
    else if (t < Q.fragile - 0.4) this.topChain(c, t);
    else this.fragile(c, t);
    dip(c, t, Q.chain, 0.18);
    dip(c, t, Q.fragile - 0.4, 0.18);
    dip(c, t, 85.0, 0.15);
  }

  // NGANG: từ hàng xe → riêng xe tải; xe dân sự đứng cạnh
  private intro(c: CanvasRenderingContext2D, t: number) {
    const row = sideCam(636, 1.45), pair = sideCam(-10, 2.7, 830);
    const cam = K.mix(row, pair, A.eio(t, 42.0, 44.4));
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, roadA: A.sm(t, 43, 45) });
    const fadeOthers = 1 - A.sm(t, 42.0, 43.4);
    LINE_ORDER.forEach((k) => { if (k !== 'truck') drawKind(c, k, LINE[k], 0, 1, { a: fadeOthers }); });
    // xe tải quân sự đứng yên ở LINE.truck
    const mil = LINE.truck;
    V.truck(c, mil, 0, 1, {});
    // xe dân sự chạy tới đứng cạnh rồi đi
    const inP = A.eo(t, Q.civil - 0.4, Q.civil + 1.4), outP = A.ei(t, 50.1, 51.9);
    const cx = -150 - (1 - inP) * 1100 - outP * 1000;
    if (inP > 0 && outP < 1) V.truck(c, cx, 0, 1, { side: 'civil', ph: (cx + 1000) });
    // nhấn khác biệt: gầm cao + vá ngụy trang
    const ringP = A.win(t, 47.7, 50.0, 0.3, 0.5);
    K.end(c);
    if (ringP > 0) {
      const [wx, wy] = K.toScreen(cam, mil, -14);
      halo(c, wx, wy, 110 * cam.z, 26 * cam.z, ringP, P.amber, 6);
      const [bx, by] = K.toScreen(cam, mil - 10, -56);
      halo(c, bx, by, 100 * cam.z, 28 * cam.z, A.win(t, 48.8, 50.0, 0.3, 0.4), P.amber, 6);
    }
    // hàng cũ: dấu lỗi → sửa mờ dần để nối từ chương 1
    const fa = 1 - A.sm(t, 41.78, 42.5);
    if (fa > 0.01) {
      const cam0 = row;
      const pairs: [LineKey, LineKey][] = [['truck', 'apc'], ['apc', 'ifv'], ['ifv', 'tank'], ['tank', 'arv'], ['tank', 'bridge']];
      c.save(); c.globalAlpha = fa;
      pairs.forEach(([a, b], i) => {
        const [ax, ay] = K.toScreen(cam0, LINE[a], -TOP_OF[a] - 12), [bx, by] = K.toScreen(cam0, LINE[b], -TOP_OF[b] - 12);
        const h = 90 + Math.abs(bx - ax) * 0.18, pts: Pt[] = [];
        for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push([A.lerp(ax, bx, u), A.lerp(ay, by, u) - 10 - 4 * h * u * (1 - u)]); }
        U.pathArrow(c, pts, { color: P.amber, w: 8, head: 26 });
        if (i !== 4) V.flaw(c, ax, ay - 52, 1.7, 1);
      });
      c.restore();
    }
  }

  // NGANG: nhiên liệu, đạn, hàng đủ loại tới bằng xe tải
  private supply(c: CanvasRenderingContext2D, t: number) {
    const wide = sideCam(90, 1.7, 820), onTruck = sideCam(-190, 3.3, 860);
    const cam = K.mix(wide, onTruck, A.eio(t, Q.cargoList - 0.1, Q.cargoList + 1.0));
    const tankX = 350;
    const sc = 0;
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: sc });
    // xe tăng nhận
    V.tank(c, tankX, 0, 1, {});
    // xe bồn chạy tới, bơm xăng
    const tIn = A.eo(t, Q.fuelTanker - 0.2, Q.fuelTanker + 1.6);
    const tX = 70 - (1 - tIn) * 900;
    V.truck(c, tX, 0, 1, { load: 'tanker', ph: tX * 1.2 });
    const hose = arcPts([tX + 20, -50], [tankX - 80, -36], -30, 28);
    const hoseP = A.eo(t, 53.0, 53.8);
    if (hoseP > 0) A.line(c, hose.slice(0, Math.max(2, Math.round(hose.length * hoseP))), P.dark, A.px(c, 5));
    if (t > 53.6 && t < 57.0) {
      for (let j = 0; j < 6; j++) {
        const u = (t * 0.9 + j / 6) % 1, k = Math.min(hose.length - 1, Math.floor(u * (hose.length - 1)));
        A.circle(c, hose[k]![0], hose[k]![1], 4.2, P.amber, P.ink, A.px(c, 1.5));
      }
    }
    // xe chở hàng tới, đạn chuyển sang xe tăng
    const cIn = A.eo(t, 54.5, 56.2);
    const cX = -190 - (1 - cIn) * 800;
    const cargoOpen = A.sm(t, 59.9, 60.6);
    c.save();
    V.truck(c, cX, 0, 1, { ph: cX * 1.2, a: 1 - cargoOpen * 0 });
    c.restore();
    if (cargoOpen > 0) {
      c.save(); c.globalAlpha = cargoOpen; c.fillStyle = W.GROUND;
      c.fillRect(cX - 92, -70, 124, 42); c.restore();
      V.truck(c, cX, 0, 1, { load: 'open', driver: true, a: cargoOpen });
    }
    // đạn bay cung từ thùng sang tháp xe tăng
    if (t > 55.0 && t < 59.0) {
      for (let j = 0; j < 3; j++) {
        const u = (t * 0.55 + j / 3) % 1;
        const a: Pt = [cX - 20, -70], b: Pt = [tankX - 10, -86];
        const [px, py] = [A.lerp(a[0], b[0], u), A.lerp(a[1], b[1], u) - Math.sin(u * Math.PI) * 120];
        V.cargo(c, px, py + 12, 'shell', 0.95, Math.min(1, u * 6) * Math.min(1, (1 - u) * 5));
      }
    }
    // hàng trong thùng: nhiên liệu, đạn, thức ăn, nước, phụ tùng
    if (t > Q.cargoList) {
      const items: [V.CrateKind, number][] = [['drum', 60.1], ['shell', 60.8], ['ration', 61.5], ['water', 62.2], ['parts', 62.9]];
      items.forEach(([k, at0], i) => {
        const p = A.back(t, at0, at0 + 0.45, 1.5);
        if (t < at0) return;
        V.cargo(c, cX - 76 + i * 25, -38 - Math.min(1, p) * 0, k, 0.85 * p, 1);
      });
    }
    K.end(c);
    // nhấn "xe tải là cách tất cả tới nơi"
    const rp = A.win(t, 57.6, 59.7, 0.3, 0.4);
    if (rp > 0) {
      const [x1, y1] = K.toScreen(cam, tX, -40), [x2, y2] = K.toScreen(cam, cX, -40);
      halo(c, x1, y1, 170, 80, rp, P.amber, 6); halo(c, x2, y2, 170, 80, rp, P.amber, 6);
    }
    // thanh nhiên liệu của xe tăng
    const fp = A.ph(t, 53.8, 56.5);
    if (fp > 0 && t < 59.8) {
      const [gx, gy] = K.toScreen(cam, tankX, -110);
      A.rrect(c, gx - 60, gy - 52, 120, 22, 8, '#fff', P.ink, 3);
      A.rrect(c, gx - 57, gy - 49, 114 * fp, 16, 5, P.amber, null, 0);
    }
  }

  // TRÊN: chuỗi dài, xe tải là các mắt xích; rồi cả dòng xe tải
  private topChain(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(t, [[Q.chain, { x: -250, y: 0, z: 1.05 }], [66.4, { x: -250, y: 0, z: 1.05 }], [68.6, { x: 0, y: 0, z: 0.42 }], [75.28, { x: 2300, y: 0, z: 0.42 }]], A.eio);
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 300, patches: true });
    const road: Pt[] = [];
    for (let x = -4200; x <= 4200; x += 100) road.push([x, 250 * Math.sin(x / 1250)]);
    W.topRoad(c, road, 72);
    // kho + nhóm xe tăng ở hai đầu
    A.rrect(c, -4150, -380, 300, 200, 10, '#d3dbe2', P.ink, A.px(c, 3));
    V.tankTop(c, 3900, 280, 1, {}); V.tankTop(c, 3900, 400, 1, {}); V.tankTop(c, 4020, 340, 1, {});
    // xe tải dọc đường
    const gap = 320, off = (t - Q.chain) * 90;
    const Lm = 8600;
    const links = A.eo(t, 65.7, 66.9);
    for (let i = -2; i < 28; i++) {
      const s0 = i * gap + off - 600 + 4400 - 4400;
      const sPos = s0 % (Lm);
      if (sPos < 0) continue;
      const p = along(road, sPos);
      at(c, p.x, p.y, p.ang, () => V.truckTop(c, 0, 0, 1, { ph: off }));
      if (links > 0.01) {
        for (let k = 1; k <= 2; k++) {
          const q = along(road, sPos + 100 + k * 55);
          A.withA(c, links, () => at(c, q.x, q.y, q.ang, () => V.chainLink(c, 0, 0, 17, k % 2 ? 0 : Math.PI / 2, P.ink2)));
        }
      }
    }
    K.end(c);
  }

  // NGANG: mỏng, sa lầy, kính, trở thành mục tiêu
  private fragile(c: CanvasRenderingContext2D, t: number) {
    const mudX0 = 560, mudX1 = 1000;
    const txA = (u: number) => A.lerp(-200, 650, A.eio(u, Q.fragile, Q.mud + 0.5));
    const stuck = A.sm(t, Q.mud + 0.3, Q.mud + 1.0);
    let tx = txA(t);
    if (t >= 85.0) tx = A.lerp(60, 520, A.eio(t, 85.0, 90.0));
    if (t >= 90.0) tx = 520;
    const follow = A.lerp(1, 0, A.sm(t, Q.glass - 0.3, Q.glass + 0.6));
    let cam: K.Cam;
    if (t < 85.0) {
      const camF = sideCam(tx + 170, 2.3, 800);
      const camG = sideCam(txA(Q.glass) + 40, 4.2, 900);
      cam = K.mix(camG, camF, follow);
      if (t < Q.glass - 0.3) cam = camF;
    } else {
      const x = A.lerp(tx + 150, 640, A.sm(t, 86.4, 88.0));
      cam = sideCam(x, A.lerp(2.0, 1.7, A.sm(t, 86.4, 88.0)), 810);
      if (t > 91.5) cam = K.mix(cam, sideCam(640, 2.0, 810), A.eio(t, 91.5, 93.2));
    }
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: true, mud: t < 85.0 ? [[mudX0, mudX1]] : [] });
    // đối phương
    const en = A.sm(t, 86.6, 87.6);
    if (en > 0) V.tank(c, 1010, 0, 1, { side: 'foe', flip: true, a: en });
    const ph = t < Q.mud + 0.5 ? tx * 1.2 : t * 400 * (1 - stuck * 0.5);
    V.truck(c, tx, 0, 1, { ph: t >= 85 ? tx * 1.2 : ph, mud: t < 85 ? stuck : 0, driver: t > 80.5 && t < 85.5, load: 'tarp' });
    // mảnh đạn xuyên cửa buồng lái
    if (t > 78.0 && t < 80.4) {
      for (let j = 0; j < 4; j++) {
        const t0 = 78.2 + j * 0.34;
        const u = A.ph(t, t0, t0 + 0.4);
        if (u <= 0 || u >= 1) { if (u >= 1) F.sparks(c, tx + 64, -60 + j * 5, A.ph(t, t0 + 0.4, t0 + 0.8), 0.8, Math.PI, Math.PI, j + 1); continue; }
        const px = A.lerp(tx + 520, tx + 64, u), y = -60 + j * 5;
        A.poly(c, [[px, y], [px + 26, y - 5], [px + 22, y + 5]], P.ink2, P.ink, A.px(c, 2));
      }
    }
    if (t < 85) for (let j = 0; j < 4; j++) if (t > 78.6 + j * 0.34) A.circle(c, tx + 62 - j * 2, -60 + j * 5, 3.2, P.ink, null, 0);
    // bùn bắn
    if (t > Q.mud + 0.3 && t < 85) for (let j = 0; j < 3; j++) F.dust(c, tx - 50 + j * 36, 4, ((t * 1.4 + j * 0.33) % 1), 0.9, '#a58f63');
    // nhắm vào xe
    if (t > Q.target + 0.8 && t < 91.6) {
      A.line(c, [[1010 - 124, -68], [tx + 50, -50]], P.enemy, A.px(c, 3), [12, 10]);
    }
    // vùng nguy hiểm + lính (91.8–98)
    if (t > 91.5) {
      const zp = A.sm(t, 91.8, 93.2);
      A.withA(c, zp, () => {
        c.fillStyle = 'rgba(180,73,60,0.12)'; c.fillRect(780, -170, 380, 170);
        c.strokeStyle = P.enemy; c.lineWidth = A.px(c, 3); c.setLineDash([14, 10]); c.strokeRect(780, -170, 380, 170); c.setLineDash([]);
      });
      const out = A.eo(t, 92.6, 94.2);
      for (let i = 0; i < 4; i++) {
        R.rig(c, { x: tx + 52 + i * 26 + out * (40 + i * 5), y: 0, s: 0.5, walk: out > 0.02 && out < 0.98 ? t * 9 + i : undefined });
      }
    }
    K.end(c);
    // kính: khung nhấn quanh buồng lái
    if (t > Q.glass && t < 85.0) {
      const [sx, sy] = K.toScreen(cam, tx + 62, -58);
      U.focus(c, sx - 190, sy - 150, 380, 300, A.win(t, Q.glass + 0.2, 84.4, 0.3, 0.4), P.amber, 6);
    }
    // tâm ngắm trên xe
    if (t > Q.target && t < 91.6) {
      const [sx, sy] = K.toScreen(cam, tx, -42), p = A.sm(t, Q.target, Q.target + 0.6);
      U.crosshair(c, sx, sy, 90 + (1 - p) * 90, P.enemy, p, t * 0.6);
    }
    // lỗi sinh ra xe kế tiếp
    if (t > Q.setsUp) {
      const [fx, fy] = K.toScreen(cam, tx, -120);
      V.flaw(c, fx, fy - 20, 1.8, A.eo(t, Q.setsUp, Q.setsUp + 0.8));
    }
    // ai chở họ qua?
    const ap = A.eo(t, Q.carryPeople + 1.0, Q.carryPeople + 3.0);
    if (ap > 0) {
      const [ax, ay] = K.toScreen(cam, 700, -200), [bx, by] = K.toScreen(cam, 1130, -200);
      U.pathArrow(c, [[ax, ay], [bx, by]], { p: ap, color: P.amber, w: 10, head: 32, dash: [24, 16] });
    }
  }
}
