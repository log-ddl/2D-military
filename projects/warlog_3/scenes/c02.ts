// Chương 2 (47.96 – 82.7): biển ép → vì sao thân hình trụ có sườn → hai độ sâu.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain } from './_c';

const KPM = 3;
const depthM = (t: number) => 400 * A.eio(t, 51.0, 56.2);

export default class S02 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 59.4) this.descend(c, t);
    else if (t < 63.6) this.boxVsRing(c, t);
    else if (t < 65.8) this.flatVsRound(c, t);
    else if (t < 67.7) this.ribs(c, t);
    else this.ladder(c, t);
    for (const at of [59.4, 63.6, 65.8, 67.7]) S.cutDip(c, t, at, 0.12);
    chain(c, t);
  }

  private descend(c: CanvasRenderingContext2D, t: number) {
    const d = depthM(t), sy = 30 + d * KPM;
    const cam: K.Cam = { x: 0, y: sy + 40, z: 0.95 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1500 });
    S.drawSubSide(c, t, { x: 0, y: sy + Math.sin(t * 1.4) * (d < 1 ? 4 : 0), s: 1, cut: 0, prop: t * 6 });
    S.pressureArrows(c, 0, sy, A.sm(d, 3, 90) * (0.4 + 0.6 * d / 400), t, cam.z);
    K.end(c);
    S.ruler(c, cam, 0, KPM, { x: 60 });
    // khối áp lực: 1 ô = 1 atm, thêm một ô mỗi 10 m
    const ux = 1400, uy = 96, sz = 34, gp = 8;
    const unit = A.back(t, 51.0, 51.5);
    if (unit > 0) A.rrect(c, ux, uy, sz * unit, sz * unit, 4, P.amber, P.ink, 3);
    const n = Math.floor(d / 10);
    for (let i = 0; i < Math.min(40, n); i++) {
      const col = i % 10, row = Math.floor(i / 10);
      const k = A.back(d, (i + 1) * 10, (i + 1) * 10 + 8);
      const sx = ux + col * (sz + gp), syy = uy + 90 + row * (sz + gp);
      A.rrect(c, sx, syy, sz * Math.min(1, k), sz * Math.min(1, k), 4, P.sky, P.ink, 3);
    }
    if (t > 57.4) {
      // 40 lần: nhắc lại ô đơn vị cạnh cả khối
      const k = A.bump(t, 57.4, 1.6);
      A.circle(c, ux - 36, uy + sz / 2, 14 + 6 * k, null, P.amber, 4);
    }
  }

  private boxVsRing(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#b7d4e5');
    const pr = A.sm(t, 60.2, 62.8);
    const bx = 520, by = 470, half = 190, rx = 1400, ry = 470, R = 200;
    // mũi tên áp lực quanh cả hai
    const arrow = (x: number, y: number, ang: number, r: number) => {
      const g = (30 + 70 * pr) * (0.8 + 0.2 * Math.sin(t * 5 + ang));
      const x1 = x + Math.cos(ang) * (r + 20), y1 = y + Math.sin(ang) * (r + 20);
      S.arrowW(c, [x1 + Math.cos(ang) * g * 1.8, y1 + Math.sin(ang) * g * 1.8], [x1, y1], 1, P.sky, 7, 26);
    };
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      arrow(rx, ry, a, R);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const dx = Math.cos(a), dy = Math.sin(a);
      const k = Math.max(Math.abs(dx), Math.abs(dy));
      const r = half / k;
      arrow(bx, by, a, r - 20 + 0);
    }
    // hộp: cạnh phẳng võng vào
    const bow = 70 * pr;
    c.beginPath();
    c.moveTo(bx - half, by - half);
    c.quadraticCurveTo(bx, by - half + bow * 2, bx + half, by - half);
    c.quadraticCurveTo(bx + half - bow * 2, by, bx + half, by + half);
    c.quadraticCurveTo(bx, by + half - bow * 2, bx - half, by + half);
    c.quadraticCurveTo(bx - half + bow * 2, by, bx - half, by - half);
    c.closePath();
    A.fs(c, '#f6fafc', P.ink, 18);
    for (const [cx0, cy0] of [[bx - half, by - half], [bx + half, by - half], [bx + half, by + half], [bx - half, by + half]] as const) {
      A.withA(c, A.sm(pr, 0.55, 0.9), () => { A.line(c, [[cx0 - 14, cy0 - 14], [cx0 + 14, cy0 + 14]], P.enemy, 6); A.line(c, [[cx0 + 14, cy0 - 14], [cx0 - 14, cy0 + 14]], P.enemy, 6); });
    }
    // vòng: giữ nguyên hình
    const rr = R * (1 - 0.03 * pr);
    A.circle(c, rx, ry, rr, '#f6fafc', P.ink, 18);
    for (const [x, y] of [[bx, by], [rx, ry]] as const) {
      for (let i = 0; i < 3; i++) A.rrect(c, x - 56, y - 56 + i * 46, 112, 22, 11, i % 2 ? P.sand : P.light, P.ink, 3);
    }
    U.xMark(c, bx, by, 60, A.sm(pr, 0.8, 1.0) * A.ph(t, 62.4, 63.0), P.enemy, 10);
  }

  private flatVsRound(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#b7d4e5');
    const pr = A.sm(t, 63.8, 64.6);
    const draw = (y: number, flat: boolean) => {
      const x0 = 360, x1 = 1560, h = 70;
      // áp lực dọc thân và ở hai đầu
      for (let x = x0 + 60; x <= x1 - 60; x += 120) {
        S.arrowW(c, [x, y - h - 78], [x, y - h - 18], pr, P.sky, 6, 22);
        S.arrowW(c, [x, y + h + 78], [x, y + h + 18], pr, P.sky, 6, 22);
      }
      S.arrowW(c, [x0 - 110, y], [x0 - 22, y], pr, P.sky, 6, 22);
      S.arrowW(c, [x1 + 110, y], [x1 + 22, y], pr, P.sky, 6, 22);
      if (flat) { A.rrect(c, x0, y - h, x1 - x0, 2 * h, 0, '#f6fafc', P.ink, 10); }
      else {
        c.beginPath();
        c.moveTo(x0 + h, y - h); c.lineTo(x1 - h, y - h); c.arc(x1 - h, y, h, -Math.PI / 2, Math.PI / 2); c.lineTo(x0 + h, y + h); c.arc(x0 + h, y, h, Math.PI / 2, Math.PI * 1.5); c.closePath();
        A.fs(c, '#f6fafc', P.ink, 10);
      }
      if (flat) {
        for (const [px, py] of [[x0, y - h], [x1, y - h], [x0, y + h], [x1, y + h]] as const) {
          A.withA(c, pr * (0.6 + 0.4 * Math.sin(t * 10)), () => A.circle(c, px, py, 18, P.enemy, null, 0));
        }
      }
    };
    draw(300, true);
    draw(740, false);
  }

  private ribs(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#b7d4e5');
    const off = -60 * A.ph(t, 65.8, 67.7);
    const y0 = 330, y1 = 750, wall = 44;
    // áp lực ép ngoài
    for (let x = 160; x <= 1760; x += 140) {
      S.arrowW(c, [x, y0 - 120], [x, y0 - 22], 1, P.sky, 6, 22);
      S.arrowW(c, [x, y1 + 120], [x, y1 + 22], 1, P.sky, 6, 22);
    }
    A.rrect(c, 60, y0, 1800, y1 - y0, 0, '#f6fafc', null, 0);
    // vỏ dày
    A.rrect(c, 60, y0 - wall, 1800, wall, 0, P.slate, P.ink, 5);
    A.rrect(c, 60, y1, 1800, wall, 0, P.slate, P.ink, 5);
    // sườn trong (khung)
    for (let i = -1; i < 20; i++) {
      const x = 130 + i * 100 + (off % 100);
      A.rrect(c, x - 9, y0, 18, 62, 3, P.dark, P.ink, 3);
      A.rrect(c, x - 9, y1 - 62, 18, 62, 3, P.dark, P.ink, 3);
      A.line(c, [[x, y0 + 62], [x, y1 - 62]], 'rgba(71,85,105,0.25)', 3);
    }
    // người ngủ bên trong để giữ thang
    for (let i = 0; i < 3; i++) A.rrect(c, 560 + i * 330, 520, 200, 40, 18, i % 2 ? P.sand : P.light, P.ink, 3);
    // thước độ dày vỏ
    const k = A.sm(t, 66.2, 66.8);
    A.line(c, [[1810, y0 - wall], [1810, y0]], P.amber, 6 * k);
    A.line(c, [[1790, y0 - wall], [1830, y0 - wall]], P.amber, 5 * k); A.line(c, [[1790, y0], [1830, y0]], P.amber, 5 * k);
  }

  private ladder(c: CanvasRenderingContext2D, t: number) {
    const TEST = 1500, CRUSH = 2160;
    const subY = A.lerp(1100, TEST, A.eio(t, 75.0, 79.0));
    const cam = K.track(t, [[67.7, { x: 0, y: 1260, z: 0.95 }], [74.5, { x: 0, y: 1300, z: 0.95 }], [79.5, { x: 0, y: 1560, z: 0.9 }], [82.7, { x: 0, y: 1760, z: 0.8 }]], A.eio);
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 2800 });
    const v = K.view(cam, 40);
    // những con số lưu truyền: chỉ là đoán — dải mờ nhấp nháy ở nhiều độ sâu
    const guess = A.sm(t, 67.7, 68.6) * (1 - A.sm(t, 72.4, 73.2));
    if (guess > 0) {
      for (let i = 0; i < 7; i++) {
        const gy = 1250 + A.rnd(i + 3) * 1050;
        const fl = 0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.9);
        A.withA(c, guess * fl, () => {
          c.fillStyle = 'rgba(71,85,105,0.22)'; c.fillRect(v.x0, gy - 22, v.x1 - v.x0, 44);
          A.line(c, [[v.x0, gy], [v.x1, gy]], P.ink2, A.px(c, 3), [18, 12]);
        });
      }
    }
    // hai mốc thật
    const tp = A.sm(t, 75.0, 75.8);
    if (tp > 0) A.line(c, [[v.x0, TEST], [v.x0 + (v.x1 - v.x0) * tp, TEST]], '#16a34a', A.px(c, 7));
    const cp = A.sm(t, 81.7, 82.5);
    if (cp > 0) {
      c.save(); c.globalAlpha *= cp;
      c.fillStyle = 'rgba(180,73,60,0.14)'; c.fillRect(v.x0, CRUSH, v.x1 - v.x0, v.y1 - CRUSH);
      c.restore();
      A.line(c, [[v.x0, CRUSH], [v.x0 + (v.x1 - v.x0) * cp, CRUSH]], P.enemy, A.px(c, 7));
    }
    S.drawSubSide(c, t, { x: 0, y: subY, s: 1, cut: 0, prop: t * 3 });
    S.pressureArrows(c, 0, subY, 0.7 + 0.3 * A.sm(t, 75, 79), t, cam.z);
    if (cp > 0.05) {
      S.drawSubSide(c, t, { x: 0, y: CRUSH, s: 1, cut: 0, alpha: 0.35 * cp });
      U.xMark(c, 0, CRUSH, 70, A.ph(cp, 0.4, 1), P.enemy, A.px(c, 10));
    }
    K.end(c);
    S.ruler(c, cam, 0, KPM, { x: 60 });
    // mặt cắt thân ở mỗi mốc: nguyên vẹn ở độ sâu thử, méo ở độ sâu nghiền
    if (t > 75.8) {
      const a = A.sm(t, 75.8, 76.6);
      A.withA(c, a, () => S.drawHullRing(c, 1650, 250, 95, { frames: true }));
    }
    if (cp > 0.1) A.withA(c, cp, () => { S.drawHullRing(c, 1650, 620, 95, { frames: true, squash: A.sm(t, 81.9, 82.6) }); });
  }
}
