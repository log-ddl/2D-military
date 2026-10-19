// Chương 3 · 50.54–113.74 · Tàu biển và tàu hỏa trước; điểm yếu là mốc cố định; Normandy.
// 50.5–57.6 SIDE bến: tàu → cẩu → tàu hỏa · 57.98–66 SIDE so cùng thang: một tàu vs lưới xe tải (nhiên liệu, người)
// 66.4–74 SIDE tàu hỏa + cột chi phí (ship/rail/truck; thêm air ở ch.5) · 74–91.8 TOP bờ biển: cảng & đầu mối là mốc bị nhắm
// 86.5–105.4 TOP Normandy: Cherbourg bị phá, Mulberry kéo bằng dây · 105.4–113.7 SIDE caisson trên dây kéo.
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

/** Cột chi phí chung (ch.3 và ch.5): giá trị giản lược theo thang tương đối, không phải số đo. */
export const COST = { ship: 0.16, rail: 0.26, truck: 0.62, air: 1.0 };

function person(c: Ctx, x: number, y: number, s = 1, col: string = P.dark) {
  A.circle(c, x, y - 16 * s, 5 * s, P.skin, INK, A.px(c, 1.5));
  A.rrect(c, x - 5 * s, y - 11 * s, 10 * s, 12 * s, 3 * s, col, INK, A.px(c, 1.5));
}

export function costChart(c: Ctx, x0: number, base: number, h: number, t: number, ts: { ship: number; rail: number; truck: number; air?: number }, w = 150, gap = 110) {
  const items: [keyof typeof COST, number][] = [['ship', ts.ship], ['rail', ts.rail], ['truck', ts.truck]];
  if (ts.air !== undefined) items.push(['air', ts.air]);
  A.line(c, [[x0 - 70, base], [x0 + items.length * (w + gap) - gap + 70, base]], INK, A.px(c, 5));
  items.forEach(([k, t0], i) => {
    const bx = x0 + i * (w + gap) + w / 2;
    const g = A.eo(t, t0, t0 + 0.9);
    const bh = h * COST[k] * g;
    c.fillStyle = P.amber; c.fillRect(bx - w / 2, base - bh, w, bh);
    A.rrect(c, bx - w / 2, base - bh, w, bh, 2, null, INK, A.px(c, 3.4));
    const ic = 0.34;
    if (k === 'ship') S.shipSide(c, bx, base + 58, 0.2);
    if (k === 'rail') S.trainSide(c, bx + 40, base + 62, 0.34, { wagons: 1 });
    if (k === 'truck') S.truckSide(c, bx, base + 60, 0.42, { load: 1 });
    if (k === 'air') S.planeSide(c, bx, base + 62, 0.3);
    void ic;
  });
}

// ── Normandy: bản đồ xoay (Anh bên trái, Pháp bên phải; hậu phương trái) ─────────────────
const COAST: [number, number][] = [[-130, -900], [-90, -500], [-150, -250], [-110, 0], [-140, 250], [-230, 420], [-330, 560], [-420, 560], [-380, 700], [-120, 760], [-90, 900]];
const ENG: [number, number][] = [[-2400, -900], [-1300, -900], [-1350, -300], [-1250, 200], [-1330, 700], [-2400, 900]];
const CHERB: [number, number] = [-400, 610];
const BEACH: [number, number] = [-135, 30];
const ENGPORT: [number, number] = [-1280, -120];

function drawNormandy(c: Ctx, cam: K.Cam, t: number) {
  const v = K.view(cam, 200);
  c.fillStyle = S.SEABG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
  // Anh
  c.beginPath(); ENG.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath(); c.fillStyle = S.TOPBG; c.fill();
  c.strokeStyle = '#7fb3cf'; c.lineWidth = A.px(c, 4); c.stroke();
  // Pháp
  c.beginPath(); c.moveTo(1500, -900); COAST.forEach(([x, y]) => c.lineTo(x, y)); c.lineTo(1500, 900); c.closePath();
  c.fillStyle = S.TOPBG; c.fill(); c.stroke();
  S.topBg(c, { x: cam.x, y: cam.y, z: cam.z }, 250, 'rgba(0,0,0,0)');
  M.forest(c, 300, -300, 200, 4); M.forest(c, 700, 300, 240, 8); M.hill(c, 900, -420, 230, 4, 3);
  M.river(c, [[400, -900], [350, -300], [450, 200], [350, 900]], 40);
  M.town(c, 150, 450, 110, 3);
  void t;
}

function caissonTop(c: Ctx, x: number, y: number, ang = 0, s = 1, a = 1) {
  A.withA(c, a, () => {
    c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
    A.rrect(c, -62, -26, 124, 52, 4, P.light, INK, A.px(c, 3.4));
    A.line(c, [[-20, -26], [-20, 26]], INK, A.px(c, 2)); A.line(c, [[20, -26], [20, 26]], INK, A.px(c, 2));
    c.restore();
  });
}
function tugTop(c: Ctx, x: number, y: number, ang = 0, s = 1) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  A.poly(c, [[-26, -14], [18, -14], [32, 0], [18, 14], [-26, 14]], P.oliveDark, INK, A.px(c, 3.4));
  A.rrect(c, -14, -8, 18, 16, 3, P.paper, INK, A.px(c, 2));
  c.restore();
}

export default class C03 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 57.8) this.s1(c, t);
    else if (t < 66.2) this.s2(c, t);
    else if (t < 74.0) this.s3(c, t);
    else if (t < 86.4) this.s4(c, t);
    else if (t < 105.4) this.s5(c, t);
    else this.s6(c, t);
  }

  // 50.5–57.6: bến — tàu cập, cẩu đưa kiện sang tàu hỏa, tàu hỏa chạy đi
  private s1(c: Ctx, t: number) {
    const GY = 700;
    const cam: K.Cam = K.track(t, [[50.5, { x: 520, y: GY - 150, z: 0.95 }], [57.6, { x: 900, y: GY - 150, z: 0.95 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 200, 3);
    // biển (trái, x<760), bờ + ray (phải)
    Cm.sea(c, v.x0, 760, GY - 14, t, 500);
    c.fillStyle = '#e3e9ee'; c.fillRect(760, GY, v.x1 - 760, 900);
    A.line(c, [[760, GY], [v.x1, GY]], INK, A.px(c, 4));
    A.rrect(c, 700, GY - 30, 130, 30, 3, P.light, INK, A.px(c, 3.4)); // bến
    A.line(c, [[800, GY + 32], [v.x1, GY + 32]], INK, A.px(c, 5));
    // tàu thủy: vào bến 50.5–54, đứng yên
    const sx = A.lerp(80, 480, A.eo(t, 50.5, 54.0));
    S.shipSide(c, sx, GY - 6, 0.85, { load: A.clamp01(1 - A.ph(t, 53.8, 56.5)), bob: Math.sin(t * 1.4) * 3 });
    // cần cẩu cố định
    A.line(c, [[760, GY - 30], [760, GY - 330]], INK, A.px(c, 6));
    A.line(c, [[760, GY - 330], [560, GY - 330]], INK, A.px(c, 6));
    // kiện chuyển từ tàu sang tàu hỏa
    for (let i = 0; i < 4; i++) {
      const k = A.ph(t, 54.0 + i * 0.5, 55.8 + i * 0.5);
      if (k <= 0 || k >= 1) { if (k >= 1) S.crate(c, 1010 + i * 0, GY - 70 - 0, 0, 'cargo'); continue; }
      const px: [number, number][] = [[470, GY - 160], [560, GY - 350], [980, GY - 350], [1010, GY - 60]];
      const [x, y] = S.along(px, k);
      S.crate(c, x, y + 30, 1.1, (['fuel', 'ammo', 'cargo', 'water'] as S.CrateKind[])[i]);
    }
    // tàu hỏa: đứng ở bến, rồi chạy sang phải
    const tx = 1200 + A.ei(t, 56.0, 57.7) * 1200;
    S.trainSide(c, tx, GY + 32, 0.9, { wagons: 3, load: A.ph(t, 55.0, 56.0), ph: tx / 20 });
    K.end(c);
  }

  // 57.98–66: một tàu bằng cả lưới xe tải; nhiên liệu và người
  private s2(c: Ctx, t: number) {
    const cam: K.Cam = { x: 960, y: 560, z: 1 };
    K.begin(c, cam);
    c.fillStyle = '#f4f8fb'; c.fillRect(-100, -100, 2200, 1300);
    // tàu ở trên
    const sy = 230;
    const k = A.eo(t, 58.0, 59.0);
    S.shipSide(c, 560 - (1 - k) * 800, sy, 0.92, { load: A.clamp01(1 - A.ph(t, 59.2, 61.4)) });
    // lưới xe tải
    const cols = 8, rows = 4, x0 = 250, y0 = 520, dx = 190, dy = 135;
    for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
      const i = r * cols + q;
      const a = A.eo(t, 59.3 + i * 0.05, 59.9 + i * 0.05);
      const edge = (q === cols - 1 ? 0.4 : 1) * (r === rows - 1 ? 0.5 : 1);
      if (a <= 0) continue;
      const x = x0 + q * dx, y = y0 + r * dy;
      S.truckSide(c, x, y, 0.66, { load: A.ph(t, 59.6 + i * 0.05, 60.4 + i * 0.05), a: a * (edge < 1 ? 0.55 : 1) });
      // nhiên liệu mỗi xe, người lái
      const f = A.eo(t, 62.9, 63.7);
      if (f > 0) { S.crate(c, x + 82, y, 0.5 * f, 'fuel'); }
      const d = A.eo(t, 64.1, 65.0);
      if (d > 0) person(c, x + 48, y - 52, 0.95 * d);
    }
    // tàu: một thùng nhiên liệu, vài thủy thủ
    const f = A.eo(t, 62.9, 63.7);
    if (f > 0) S.crate(c, 1150, sy, 1.8 * f, 'fuel');
    const d = A.eo(t, 64.1, 65.0);
    if (d > 0) for (let i = 0; i < 4; i++) person(c, 240 + i * 30, sy - 120, 1.8 * d);
    // dấu "và nhiều nữa" (đuôi mờ) cho lưới
    A.withA(c, A.sm(t, 60.4, 61.4), () => {
      for (let i = 0; i < 3; i++) A.circle(c, x0 + cols * dx + 20 + i * 26, y0 + 160, 7, P.slate, null, 0);
    });
    K.end(c);
  }

  // 66.4–74: tàu hỏa; cột chi phí
  private s3(c: Ctx, t: number) {
    const GY = 560;
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    c.fillStyle = '#e3e9ee'; c.fillRect(-100, GY, 2200, 700);
    A.line(c, [[-100, GY], [2100, GY]], INK, A.px(c, 4));
    A.line(c, [[-100, GY + 22], [2100, GY + 22]], INK, A.px(c, 5));
    const tx = A.lerp(1100, 2900, A.ph(t, 66.2, 74.0));
    S.trainSide(c, tx, GY + 22, 1.0, { wagons: 5, load: 1, ph: tx / 20 });
    // cột chi phí xuất hiện sau khi "rẻ nhất"
    if (t > 68.2) {
      const u = t - 68.4;
      const fade = A.sm(t, 68.2, 69.0);
      A.withA(c, fade, () => costChart(c, 420, 1000, 330, u, { ship: 0.2, rail: 0.5, truck: 0.9 }));
    }
    K.end(c);
  }

  // 74–86.4: cảng và đầu mối là mốc cố định; kẻ địch nhìn vào đó
  private s4(c: Ctx, t: number) {
    const cam: K.Cam = K.track(t, [[74.0, { x: 900, y: -40, z: 0.88 }], [86.4, { x: 1050, y: -40, z: 0.88 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = S.SEABG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    // đất liền từ x=60
    c.beginPath(); c.moveTo(60, v.y0); c.lineTo(110, -250); c.lineTo(40, -60); c.lineTo(90, 100); c.lineTo(30, 300); c.lineTo(60, v.y1); c.lineTo(v.x1, v.y1); c.lineTo(v.x1, v.y0); c.closePath();
    c.fillStyle = S.TOPBG; c.fill(); c.strokeStyle = '#7fb3cf'; c.lineWidth = A.px(c, 5); c.stroke();
    S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
    M.forest(c, 900, -420, 200, 2); M.forest(c, 1500, 380, 230, 6); M.hill(c, 1900, -250, 240, 4, 1); M.forest(c, 1400, -450, 160, 9);
    // đường ray từ cảng tới đầu mối; sau đó trống
    const PORT: [number, number] = [70, 0], HEAD: [number, number] = [1100, 0], FRONT: [number, number] = [2000, 0];
    S.railLine(c, [PORT, [500, 0], HEAD], 22);
    // vùng chưa có hạ tầng: nét đứt
    A.line(c, [HEAD, FRONT], 'rgba(30,41,59,0.45)', A.px(c, 5), [18, 16]);
    // cảng
    A.rrect(c, 20, -70, 130, 140, 6, P.light, INK, A.px(c, 3.4));
    A.line(c, [[40, -70], [40, -150]], INK, A.px(c, 6)); A.line(c, [[40, -150], [120, -150]], INK, A.px(c, 6));
    A.rrect(c, 1040, -60, 120, 120, 6, P.light, INK, A.px(c, 3.4));
    M.unit(c, FRONT[0], FRONT[1], 'armor', 'ally', 240);
    // 76.3–78.6 tàu chỉ tới được cảng; tàu hỏa chỉ chạy trên ray
    const shipX = A.lerp(-420, -110, A.eo(t, 74.2, 78.4));
    S.shipTop(c, shipX, 0, 0.8, { load: 1 });
    const trX = A.lerp(PORT[0] + 160, HEAD[0] - 80, A.eio(t, 76.8, 82.0));
    if (t > 76.6) S.trainTop(c, trX, 0, 0.7, { wagons: 2, load: 1 });
    // 78.6–83.8 hai điểm cuối bị khoanh
    const k = A.eo(t, 79.0, 80.0), k2 = A.eo(t, 80.8, 81.8);
    if (k > 0) S.pin(c, PORT[0] + 60, 0, 70 * k, P.amber);
    if (k2 > 0) S.pin(c, HEAD[0] + 60, 0, 70 * k2, P.amber);
    // 83.8–86.4 địch nhìn: quạt tầm quan sát về hai mốc
    const e = A.eo(t, 83.8, 84.8);
    if (e > 0) {
      const ex = 1180, ey = -520;
      M.unit(c, ex, ey, 'recon', 'foe', 210 * e, { a: e });
      const fanA = Math.atan2(0 - ey, 130 - ex);
      c.save(); c.globalAlpha *= 0.9;
      M.fan(c, ex, ey, 1300, fanA - 0.28, fanA + 0.34, e, '#dc2626');
      c.restore();
      const [sx, sy] = K.toScreen(cam, 130, 0), [hx, hy] = K.toScreen(cam, HEAD[0] + 60, 0);
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0);
      U.crosshair(c, sx, sy, 70, P.enemy, A.eo(t, 84.6, 85.4), t * 0.6);
      U.crosshair(c, hx, hy, 70, P.enemy, A.eo(t, 85.0, 85.8), t * 0.6);
      c.restore();
    }
    K.end(c);
  }

  // 86.5–105.4: Normandy
  private s5(c: Ctx, t: number) {
    const wide: K.Cam = { x: -520, y: 170, z: 0.82 };
    const cherb: K.Cam = { x: -420, y: 500, z: 1.35 };
    const beach: K.Cam = { x: -640, y: 40, z: 0.95 };
    let cam = wide;
    if (t < 92.0) cam = wide;
    else if (t < 98.4) cam = K.mix(wide, cherb, A.eio(t, 91.8, 93.4));
    else cam = K.mix(cherb, beach, A.eio(t, 98.4, 99.8));
    if (t < 98.4 && t >= 98.0) cam = cherb;
    K.begin(c, cam);
    drawNormandy(c, cam, t);
    // cảng Anh
    A.rrect(c, ENGPORT[0] - 90, ENGPORT[1] - 60, 120, 120, 6, P.light, INK, A.px(c, 3.4));
    // bãi đổ bộ: tàu đổ bộ từ trái, kế hoạch dựa vào cảng lớn (nét đứt tới Cherbourg)
    if (t < 98.4) {
      const k = A.eo(t, 86.8, 90.6);
      for (let i = 0; i < 4; i++) {
        const x = A.lerp(ENGPORT[0] + 40, BEACH[0] - 40, k), y = ENGPORT[1] + i * 40 + A.lerp(0, BEACH[1] - ENGPORT[1] - 40, k) ;
        S.shipTop(c, x, y, 0.3, { load: 1 });
      }
      const plan = A.eo(t, 89.4, 91.4);
      if (plan > 0) {
        const pts: [number, number][] = [[BEACH[0] + 10, BEACH[1] + 40], [-250, 330], [CHERB[0] + 20, CHERB[1] - 30]];
        c.save(); c.setLineDash([16, 14]);
        const seg = S.along(pts, plan);
        A.line(c, [pts[0]!, [seg[0], seg[1]]], P.amber, A.px(c, 7));
        c.restore();
      }
    }
    // Cherbourg: bến, bị phá
    const wrecked = A.sm(t, 95.0, 95.6);
    A.rrect(c, CHERB[0] - 60, CHERB[1] - 36, 120, 72, 6, A.lerpColor('#cbd5e1', '#8f8f8f', wrecked), INK, A.px(c, 3.4));
    A.line(c, [[CHERB[0] - 30, CHERB[1] - 36], [CHERB[0] - 30, CHERB[1] - 100]], INK, A.px(c, 6));
    if (wrecked > 0) {
      // đống đổ nát + tàu đắm
      for (let i = 0; i < 6; i++) {
        const rx = CHERB[0] - 80 + i * 30, ry = CHERB[1] + 60 + (i % 2) * 20;
        A.poly(c, [[rx - 16, ry + 10], [rx, ry - 14], [rx + 18, ry + 8]], '#6b7280', INK, A.px(c, 2));
      }
      for (let i = 0; i < 3; i++) S.shipTop(c, CHERB[0] - 170 + i * 40, CHERB[1] - 90 + i * 40, 0.2, { ang: 0.5 + i * 0.4, load: 0, a: wrecked });
      F.explosion(c, CHERB[0] - 40, CHERB[1] - 20, 90, A.ph(t, 95.2, 96.3));
      F.explosion(c, CHERB[0] + 50, CHERB[1] + 30, 70, A.ph(t, 95.6, 96.6));
      F.smoke(c, CHERB[0], CHERB[1] - 40, A.clamp(t - 95.6, 0, 6), 1.4);
    }
    // 92–95: lực lượng ta tiến vào Cherbourg
    if (t > 91.6) {
      const k = A.eio(t, 92.4, 95.0);
      const pts: [number, number][] = [[BEACH[0] + 40, BEACH[1] + 100], [-250, 330], [CHERB[0] + 90, CHERB[1] - 60]];
      M.advance(c, pts, k, { color: P.olive, w: 36 });
    }
    // 96.8–98.4: "mất vài tuần" – lịch ba hàng
    if (t > 96.7 && t < 98.7) {
      const q = A.ph(t, 96.8, 98.3);
      const cx = CHERB[0] + 330, cy = CHERB[1] - 20;
      for (let i = 0; i < 21; i++) {
        const filled = i / 21 < q;
        A.rrect(c, cx + (i % 7) * 34, cy + Math.floor(i / 7) * 34, 28, 28, 4, filled ? P.amber : P.paper, INK, A.px(c, 2.5));
      }
    }
    // 98.5–105.4: Mulberry — caisson kéo từ Anh, ghép thành vòng cung ngoài bãi
    if (t > 98.4) {
      const arc: [number, number][] = [[-330, -130], [-300, -70], [-285, -10], [-290, 50], [-310, 110], [-345, 170]];
      for (let i = 0; i < arc.length; i++) {
        const s0 = 98.8 + i * 0.7, s1 = s0 + 3.4;
        const k = A.eio(t, s0, s1);
        const x = A.lerp(ENGPORT[0] + 100, arc[i]![0], k), y = A.lerp(ENGPORT[1] + 40 * (i - 2.5), arc[i]![1], k);
        if (k > 0 && k < 1) {
          // dây kéo + tàu kéo
          const tx = x - 90, ty = y;
          A.line(c, [[tx + 26, ty], [x - 62, y]], INK, A.px(c, 3));
          tugTop(c, tx, ty, 0, 2.0);
        }
        caissonTop(c, x, y, Math.PI / 2, 1.3);
      }
      // tàu cập vòng cung, kiện đi qua bãi mở
      const sh = A.eo(t, 103.0, 104.0);
      if (sh > 0) {
        S.shipTop(c, -500, 20, 0.34, { load: 1, ang: 0 });
        for (let i = 0; i < 5; i++) {
          const k = (t * 0.4 + i / 5) % 1;
          const [x, y] = S.along([[-300, 10], [-140, 30], [20, 20]], k);
          S.crate(c, x, y + 14, 1.8, (['fuel', 'ammo', 'cargo', 'water', 'part'] as S.CrateKind[])[i]);
        }
      }
    }
    K.end(c);
  }

  // 105.4–113.7: caisson trên dây kéo; cái giá của một cảng bị thiếu
  private s6(c: Ctx, t: number) {
    const GY = 700;
    const cam: K.Cam = K.track(t, [[105.4, { x: 760, y: GY - 210, z: 1.05 }], [110.0, { x: 1150, y: GY - 210, z: 1.05 }], [113.7, { x: 1300, y: GY - 210, z: 1.05 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 200, 7);
    Cm.sea(c, v.x0, 1700, GY - 14, t, 500);
    c.fillStyle = '#e3e9ee'; c.fillRect(1700, GY, 900, 700);
    A.line(c, [[1700, GY], [2600, GY]], INK, A.px(c, 4));
    // bến thiếu: viền nét đứt hình cảng
    const ghost = 1 - A.sm(t, 109.2, 111.0);
    A.withA(c, 0.8 * ghost, () => {
      c.save(); c.setLineDash([14, 10]);
      A.rrect(c, 1560, GY - 90, 300, 90, 4, null, 'rgba(30,41,59,0.55)', A.px(c, 4));
      c.restore();
    });
    // caisson + tàu kéo
    const cx = A.lerp(300, 1640, A.eio(t, 105.4, 110.2));
    const bob = Math.sin(t * 1.6) * 5;
    const y = GY - 6 + bob;
    // dây kéo võng
    const tugX = cx - 560;
    const pts: [number, number][] = [];
    for (let i = 0; i <= 14; i++) { const u = i / 14; pts.push([A.lerp(tugX + 70, cx - 220, u), y - 40 + Math.sin(u * Math.PI) * 30]); }
    A.line(c, pts, INK, A.px(c, 4));
    // tàu kéo
    Cm.exhaust(c, tugX - 40, y - 70, t, 1, 1.2);
    S.at(c, tugX, y, 1.1, 1, () => {
      A.poly(c, [[-80, -10], [60, -10], [96, -36], [90, -60], [-80, -60]], P.oliveDark, INK, A.px(c, 3.4));
      A.rrect(c, -30, -100, 54, 40, 4, P.paper, INK, A.px(c, 3));
      A.rrect(c, -70, -88, 20, 28, 3, P.amber, INK, A.px(c, 3));
    });
    // caisson bê tông khổng lồ
    S.at(c, cx, y, 1, 1, () => {
      A.rrect(c, -220, -190, 440, 190, 6, P.light, INK, A.px(c, 4));
      for (let i = -2; i <= 2; i++) A.line(c, [[i * 80, -190], [i * 80, 0]], INK, A.px(c, 2));
      A.line(c, [[-220, -100], [220, -100]], INK, A.px(c, 2));
    });
    // đã vào vị trí: tàu cập sát, bốc hàng
    if (t > 110.6) {
      const k = A.eo(t, 110.6, 112.0);
      S.shipSide(c, cx - 500 + 300 * (1 - k) * 0 + 0, GY - 6, 0.5, { load: 1 - A.ph(t, 112.0, 113.6), a: k });
    }
    K.end(c);
  }
}
