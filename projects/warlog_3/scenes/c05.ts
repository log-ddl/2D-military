// Chương 5 (178.1 – 270.2): động cơ. Diesel cần khí → ắc quy → ống thở → AIP → lò phản ứng → giới hạn là kho lương → bơm không tắt được.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain } from './_c';

const GREEN = '#16a34a';

export default class S05 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 199.0) this.dieselElectric(c, t);
    else if (t < 206.8) this.battery(c, t);
    else if (t < 221.0) this.snorkel(c, t);
    else if (t < 231.5) this.aip(c, t);
    else if (t < 243.2) this.reactor(c, t);
    else if (t < 260.9) this.pantry(c, t);
    else this.pumps(c, t);
    for (const at of [199.0, 206.8, 221.0, 231.5, 243.2, 260.9]) S.cutDip(c, t, at, 0.12);
    chain(c, t);
  }

  // 178.1 – 199: diesel đốt khí; mặt nước: diesel chạy + nạp ắc quy; dưới nước: ắc quy → mô tơ
  private dieselElectric(c: CanvasRenderingContext2D, t: number) {
    const y = A.keys(t, [[178.1, 420], [186.4, 420], [188.8, 34], [194.0, 34], [196.4, 420], [199, 420]]);
    const cam: K.Cam = { x: 0, y: y * 0.55 + 90, z: 1.5 };
    const surfaced = t > 189.2 && t < 194.4;
    const run = t < 183.4 ? 1 : t < 185.8 ? 1 - A.sm(t, 183.4, 185.8) : surfaced ? 1 : 0;
    const batt = A.keys(t, [[178.1, 1], [186, 1], [189.6, 0.34], [194, 1], [199, 0.9]]);
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    S.drawSubSide(c, t, { x: 0, y, s: 1, cut: 1, plant: 'diesel', plantRun: run, batt, hl: surfaced || t >= 194.4 ? ['plant', 'batt'] : ['plant'], glow: P.amber, prop: t * (surfaced || t >= 194.6 ? 6 : t < 185 ? 4 : 0), breath: t * 1.5 });
    // khí vào máy: bị chặn khi chìm kín
    if (t < 186.4) {
      const k = A.sm(t, 179.5, 180.1);
      S.arrowW(c, [-140, y - 160], [-140, y - 72], k, P.sky, 7, 24 / cam.z);
      if (t > 181.4) U.xMark(c, -140, y - 66, 30, A.sm(t, 181.4, 182.4), P.enemy, A.px(c, 9));
      // khí trong thân cạn dần: bọt trong khoang máy giảm
      const air = 1 - A.sm(t, 181.0, 186);
      S.bubbles(c, -170, y + 10, 60, 40, t, 6, 11, air * 0.9);
    }
    // dòng điện
    if (t >= 190.0 && t < 194.0) {
      for (let i = 0; i < 6; i++) { const u = ((t * 0.9 + i / 6) % 1); A.circle(c, A.lerp(-100, -10, u), y + 30, 5, P.amber, P.ink, A.px(c, 1.5)); }
      // khói/xả diesel lên mặt nước
      S.bubbles(c, -150, y - 70, 30, 70, t, 5, 4, 0.8, '#94a3b8');
    }
    if (t >= 195.4 && t < 199) {
      for (let i = 0; i < 6; i++) { const u = ((t * 0.9 + i / 6) % 1); A.circle(c, A.lerp(10, -230, u), y + 30, 5, GREEN, P.ink, A.px(c, 1.5)); }
    }
    K.end(c);
    S.ruler(c, cam, 0, 3, { x: 60, a: 0.8 });
    if (t >= 178.1 && t < 186.4) {
      const a = A.sm(t, 181.4, 182.0) * (1 - A.sm(t, 185.6, 186.2));
      A.withA(c, a, () => { A.rrect(c, 1560, 90, 240, 34, 17, '#fff', P.ink, 4); A.rrect(c, 1566, 96, 228 * (1 - A.sm(t, 181.4, 186)), 22, 11, P.sky, null, 0); });
    }
  }

  // 199 – 206.8: so sánh hai nhịp xả ắc quy
  private battery(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#dbeaf3');
    const cols: [number, boolean][] = [[600, true], [1320, false]];
    for (const [x, fast] of cols) {
      const drain = fast ? A.sm(t, 200.7, 203.8) : 0.18 * A.sm(t, 201.0, 206.5);
      // ắc quy
      A.rrect(c, x - 90, 250, 180, 300, 18, '#fff', P.ink, 6);
      A.rrect(c, x - 30, 224, 60, 28, 6, P.ink, null, 0);
      const h = 270 * (1 - drain);
      A.rrect(c, x - 76, 536 - h, 152, h, 10, drain > 0.85 ? P.enemy : '#4ade80', null, 0);
      // tàu và vệt nước
      const vx = x - 190;
      S.drawSubSide(c, t, { x, y: 740, s: 0.38, cut: 0, prop: t * (fast ? 14 : 2) });
      const n = fast ? 8 : 2;
      for (let i = 0; i < n; i++) {
        const xx = x - 120 - ((t * (fast ? 260 : 40) + i * 60) % 200);
        A.line(c, [[xx, 700 + (i % 3) * 18], [xx - (fast ? 70 : 20), 700 + (i % 3) * 18]], '#ffffff', 4);
      }
      void vx;
      // thời gian: một giờ (đồng hồ quay một vòng) / nhiều ngày (dãy ô)
      if (fast) {
        A.circle(c, x, 880, 64, '#fff', P.ink, 5);
        const a = -Math.PI / 2 + 2 * Math.PI * A.ph(t, 200.7, 203.8);
        A.line(c, [[x, 880], [x + Math.cos(a) * 46, 880 + Math.sin(a) * 46]], P.enemy, 7);
      } else {
        const n7 = 10;
        const k = Math.floor(A.ph(t, 201.0, 206.5) * n7);
        for (let i = 0; i < n7; i++) A.rrect(c, x - 220 + i * 44, 850, 36, 60, 6, i < k ? P.amber : '#fff', P.ink, 4);
      }
    }
  }

  // 206.8 – 221: ống thở
  private snorkel(c: CanvasRenderingContext2D, t: number) {
    const y = A.keys(t, [[206.8, 400], [210.4, 400], [212.4, 118], [221, 118]]);
    const cam: K.Cam = { x: 0, y: y * 0.45 + 30, z: 1.5 };
    const mast = A.sm(t, 210.8, 212.6);
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    // sóng vòng loang tại đầu ống (dấu hiệu lộ)
    const mx = 90, my = 0;
    S.drawSubSide(c, t, { x: 0, y, s: 1, cut: 1, plant: 'diesel', plantRun: mast > 0.9 ? 1 : 0, batt: 0.3 + 0.7 * A.sm(t, 212.6, 220), hl: ['plant'], glow: P.amber, prop: t * 3, breath: t * 1.5 });
    // ống thở: từ tháp lên khỏi mặt nước
    const topY = A.lerp(y - 100, -46, mast);
    A.line(c, [[mx, y - 100], [mx, topY]], P.dark, A.px(c, 8));
    A.line(c, [[mx, topY], [mx + 22, topY]], P.dark, A.px(c, 8));
    if (mast > 0.95) {
      // khí vào theo ống → tới diesel
      for (let i = 0; i < 7; i++) {
        const u = (t * 0.7 + i / 7) % 1;
        const pts: A.Pt[] = [[mx + 22, topY - 6], [mx, topY - 6], [mx, y - 60], [-150, y - 50]];
        const seg = [0.5, 0.2, 0.3];
        void seg;
        const L = [22, topY - 6 - (y - 60) > 0 ? 0 : 0];
        void L;
        const p = A.lerpPt(pts[0]!, pts[3]!, 0);
        void p;
        // đi theo đường gấp khúc theo độ dài
        const lens = [22, Math.abs(y - 60 - (topY - 6)), mx + 150];
        const tot = lens[0]! + lens[1]! + lens[2]!;
        let d = u * tot, x0 = pts[0]![0], y0 = pts[0]![1];
        for (let k = 0; k < 3; k++) {
          if (d <= lens[k]!) { const f = d / lens[k]!; x0 = A.lerp(pts[k]![0], pts[k + 1]![0], f); y0 = A.lerp(pts[k]![1], pts[k + 1]![1], f); break; }
          d -= lens[k]!;
        }
        A.circle(c, x0, y0, 5, P.sky, P.ink, A.px(c, 1.5));
      }
      // ồn: vòng sóng âm quanh động cơ; vệt sóng ở mặt nước
      S.waves(c, -150, y - 6, t, { R: 360, n: 3, per: 1.2, color: P.enemy, w: 4, a: A.sm(t, 214.8, 215.8) });
      for (let i = 0; i < 3; i++) {
        const ph = ((t * 0.8 + i / 3) % 1);
        A.withA(c, 1 - ph, () => A.line(c, [[mx - 20 - 60 * ph, -4], [mx + 40 + 60 * ph, -4]], '#ffffff', A.px(c, 4)));
      }
    }
    K.end(c);
    S.ruler(c, cam, 0, 3, { x: 60, a: 0.8 });
  }

  // 221 – 231.5: AIP
  private aip(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 420, z: 1.55 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    S.drawSubSide(c, t, { x: 0, y: 420, s: 1, cut: 1, plant: 'aip', plantRun: 1, batt: 0.8, hl: ['plant', 'batt'], glow: GREEN, prop: t * 2.2, breath: t * 1.5 });
    // dòng năng lượng chậm từ module AIP sang mô tơ
    for (let i = 0; i < 5; i++) { const u = (t * 0.5 + i / 5) % 1; A.circle(c, A.lerp(-100, -222, u), 420 + 0, 5, GREEN, P.ink, A.px(c, 1.5)); }
    K.end(c);
    // thanh thời gian: diesel-điện chỉ vài ngày, AIP kéo dài hàng tuần mà không cần ống thở
    const y0 = 930;
    A.rrect(c, 280, y0 - 70, 1360, 30, 15, '#fff', P.ink, 4);
    A.rrect(c, 284, y0 - 66, 300, 22, 11, P.amber, null, 0);
    A.rrect(c, 280, y0, 1360, 30, 15, '#fff', P.ink, 4);
    A.rrect(c, 284, y0 + 4, 1352 * A.sm(t, 226.6, 231), 22, 11, GREEN, null, 0);
  }

  // 231.5 – 243.2: lò phản ứng → hơi → tuabin → trục
  private reactor(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#e3eef5');
    const k = A.sm(t, 231.6, 232.6);
    const rx = 360, ry = 500;
    // lò
    A.circle(c, rx, ry, 130, '#fff', P.ink, 7);
    A.circle(c, rx, ry, 78, `rgba(245,158,11,${0.5 + 0.35 * Math.sin(t * 3)})`, P.ink, 5);
    for (let i = 0; i < 5; i++) A.line(c, [[rx - 50 + i * 25, ry - 50], [rx - 50 + i * 25, ry + 50]], P.ink, 5);
    // vòng nhiệt → bộ sinh hơi → tuabin → trục → chân vịt
    const gx = 780, tx = 1150, sx = 1450;
    A.rrect(c, gx - 90, ry - 100, 180, 200, 24, '#fff', P.ink, 6);
    A.line(c, [[rx + 130, ry - 40], [gx - 90, ry - 40]], P.enemy, 10);
    A.line(c, [[rx + 130, ry + 40], [gx - 90, ry + 40]], '#f59e0b', 10);
    for (let i = 0; i < 4; i++) A.line(c, [[gx - 70, ry - 60 + i * 40], [gx + 70, ry - 60 + i * 40 + 20]], '#7dd3fc', 6);
    A.line(c, [[gx + 90, ry], [tx - 100, ry]], '#cbd5e1', 18);
    // tuabin
    A.circle(c, tx, ry, 100, '#fff', P.ink, 6);
    for (let i = 0; i < 8; i++) { const a = t * 6 + i * Math.PI / 4; A.line(c, [[tx, ry], [tx + Math.cos(a) * 84, ry + Math.sin(a) * 84]], P.slate, 8); }
    A.line(c, [[tx + 100, ry], [sx + 120, ry]], P.dark, 14);
    // chân vịt cuối trục
    for (let i = 0; i < 3; i++) { const l = 60 * Math.sin(t * 6 + i * 2.094); A.capsule(c, [sx + 140, ry], [sx + 140, ry + l], 14, P.slate, P.ink, 3); }
    // hạt hơi/nhiệt chạy
    const path: A.Pt[] = [[rx + 130, ry - 40], [gx - 90, ry - 40]];
    for (let i = 0; i < 5; i++) { const u = (t * 0.7 + i / 5) % 1; A.circle(c, A.lerp(path[0]![0], path[1]![0], u), ry - 40, 8, P.enemy, P.ink, 2); }
    for (let i = 0; i < 5; i++) { const u = (t * 0.7 + i / 5) % 1; A.circle(c, A.lerp(gx + 90, tx - 100, u), ry, 9, '#e2e8f0', P.ink, 2); }
    A.withA(c, A.sm(t, 237.0, 237.8), () => {
      // không có khí vào: mũi tên bị gạch bỏ
      S.arrowW(c, [gx - 40, 150], [gx - 40, 260], 1, P.sky, 8, 28);
      U.xMark(c, gx - 40, 205, 46, 1, P.enemy, 12);
    });
    void k;
  }

  // 243.2 – 260.9: lõi bền nhiều năm, kho lương mới là giới hạn
  private pantry(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#e3eef5');
    // lò: thanh nhiên liệu gần như không đổi
    A.circle(c, 520, 460, 160, '#fff', P.ink, 7);
    A.circle(c, 520, 460, 100, `rgba(245,158,11,0.75)`, P.ink, 5);
    A.rrect(c, 380, 700, 280, 40, 20, '#fff', P.ink, 5);
    A.rrect(c, 386, 706, 268 * (1 - 0.04 * A.ph(t, 245, 260)), 28, 14, '#fbbf24', null, 0);
    // dải nhiều năm
    for (let i = 0; i < 20; i++) A.rrect(c, 380 + i * 14, 780, 10, 30, 3, i < Math.floor(A.ph(t, 245, 260) * 20) ? P.dark : '#cbd5e1', null, 0);
    // kho lương: 3 kệ, thùng hết dần
    A.rrect(c, 1020, 240, 720, 460, 10, '#fff', P.ink, 6);
    const total = 18, used = Math.floor(total * A.sm(t, 248, 259));
    for (let i = 0; i < total; i++) {
      const col = i % 6, row = Math.floor(i / 6);
      const gone = i >= total - used;
      if (!gone) A.rrect(c, 1050 + col * 112, 270 + row * 140, 94, 100, 6, P.sand, P.ink, 4);
      else A.rrect(c, 1050 + col * 112, 270 + row * 140, 94, 100, 6, null, 'rgba(71,85,105,0.3)', 3);
    }
    for (let r = 0; r < 3; r++) A.line(c, [[1030, 370 + r * 140], [1730, 370 + r * 140]], P.ink2, 5);
    // khi thấy hết hàng: tàu quay về (mũi tên)
    const hp = A.sm(t, 258.4, 260);
    if (hp > 0) S.arrowW(c, [1300, 810], [800 + 0, 810], hp, P.amber, 14, 50);
  }

  // 260.9 – 270.2: bơm làm mát không tắt được
  private pumps(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#cfe3ee');
    S.drawSubSide(c, t, { x: 520, y: 520, s: 0.74, cut: 1, plant: 'nuclear', plantRun: 1, hl: ['plant'], glow: P.amber, prop: t * 3, breath: t });
    S.drawSubSide(c, t, { x: 1420, y: 520, s: 0.74, cut: 1, plant: 'diesel', plantRun: 0, batt: 0.7, hl: ['batt'], glow: GREEN, prop: t * 0.8, breath: t });
    // bơm quay + sóng ồn
    const bx = 520 - 150 * 0.74 + 0, by = 520 - 5 * 0.74;
    S.waves(c, bx, by, t, { R: 240, n: 3, per: 1.6, color: P.enemy, w: 4, a: A.sm(t, 262.0, 262.8) });
    A.withA(c, A.sm(t, 261.6, 262.4), () => {
      A.circle(c, 520, 220, 52, '#fff', P.ink, 6);
      for (let i = 0; i < 3; i++) { const a = t * 8 + i * 2.094; A.line(c, [[520, 220], [520 + Math.cos(a) * 40, 220 + Math.sin(a) * 40]], P.ink, 8); }
      A.circle(c, 1420, 220, 52, '#fff', P.ink, 6);
      for (let i = 0; i < 3; i++) { const a = i * 2.094; A.line(c, [[1420, 220], [1420 + Math.cos(a) * 40, 220 + Math.sin(a) * 40]], 'rgba(71,85,105,0.4)', 8); }
    });
  }
}
