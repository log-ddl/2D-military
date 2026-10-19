// Chương 9 · 337.28–400.84 · Xe hỏng: các tầng sửa chữa, thay nguyên cụm power pack, phụ tùng, tháo lấy bộ phận.
// SIDE: hỏng nhiều hơn bị phá (cột so sánh) → ba kiểu hỏng → tổ lái sửa → xưởng tiểu đoàn: MẶT CẮT thân xe, cẩu nhấc power pack
// (động cơ + hộp số một khối) → TOP: cụm hỏng về kho xa mặt trận → SIDE: xe nghìn đô nằm vì phụ tùng → tháo xe này giữ hai xe kia.
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

function gear(c: Ctx, x: number, y: number, r: number, rot: number, col: string = P.light, cracked = 0) {
  c.save(); c.translate(x, y); c.rotate(rot);
  c.beginPath();
  const n = 10;
  for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = i % 2 ? r * 0.8 : r; c.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  c.closePath(); A.fs(c, col, INK, A.px(c, 3));
  A.circle(c, 0, 0, r * 0.3, '#f4f8fb', INK, A.px(c, 2.5));
  if (cracked > 0) A.line(c, [[r * 0.2, -r * 0.2], [r * 0.5 * cracked + r * 0.2, r * 0.3 * cracked], [r * 0.3, r * 0.9 * cracked]], P.enemy, A.px(c, 5));
  c.restore();
}

function wrench(c: Ctx, x: number, y: number, s = 1, ang = 0.7) {
  c.save(); c.translate(x, y); c.rotate(ang); c.scale(s, s);
  A.capsule(c, [-34, 0], [34, 0], 10, P.light, INK, A.px(c, 3));
  A.circle(c, 38, 0, 14, P.light, INK, A.px(c, 3)); A.rrect(c, 34, -6, 18, 12, 0, '#f4f8fb', null, 0);
  c.restore();
}

/** Mặt cắt xe tăng nhìn ngang: thân trong mờ, power pack (động cơ + hộp số) ở đuôi bên trái. packY nâng cụm lên. */
function tankCut(c: Ctx, x: number, y: number, s: number, op: { packY?: number; packA?: number; packCol?: string; ph?: number; gap?: boolean; noPack?: boolean } = {}) {
  S.at(c, x, y, s, 1, () => {
    const l = A.px(c, 3.4), li = A.px(c, 2);
    A.rrect(c, -104, -36, 208, 38, 19, P.dark, INK, l);
    for (let i = 0; i < 6; i++) S.wheel(c, -78 + i * 31, -17, 11, (op.ph ?? 0));
    // thân (trong suốt)
    A.poly(c, [[-98, -36], [100, -36], [116, -52], [64, -66], [-90, -66]], 'rgba(125,139,90,0.28)', INK, l);
    // tháp pháo
    A.rrect(c, -34, -96, 90, 32, 14, 'rgba(169,180,127,0.55)', INK, l);
    A.capsule(c, [54, -80], [170, -80], 10, P.oliveDark, INK, li);
    // khoang cụm (đuôi): khung gợi vị trí
    c.save(); c.setLineDash([6, 5]); A.rrect(c, -96, -64, 78, 30, 3, null, 'rgba(30,41,59,0.55)', li); c.restore();
    // truyền động tới bánh chủ động (đuôi)
    A.line(c, [[-78, -50], [-80, -22]], INK, li);
    // phần phía trước: khoang lái
    A.rrect(c, 40, -60, 50, 22, 3, 'rgba(255,255,255,0.45)', INK, li);
    // power pack
    const py = op.packY ?? 0, pa = op.noPack ? 0 : (op.packA ?? 1);
    A.withA(c, pa, () => {
      c.save(); c.translate(0, py);
      // động cơ: khối + xylanh + cánh tản nhiệt
      A.rrect(c, -92, -62, 48, 26, 3, op.packCol ?? P.amber, INK, l);
      for (let i = 0; i < 4; i++) A.rrect(c, -88 + i * 11, -68, 8, 8, 1, P.dark, INK, li);
      // hộp số: khối nhỏ nối với động cơ, hai bánh răng
      A.rrect(c, -44, -58, 26, 20, 3, op.packCol ?? P.amber, INK, l);
      A.line(c, [[-44, -48], [-18, -48]], INK, li);
      gear(c, -31, -48, 7, (op.ph ?? 0) * 1.3, P.light);
      // khung chung (đóng gói một khối)
      c.save(); c.setLineDash([5, 4]); A.rrect(c, -96, -72, 82, 40, 4, null, INK, li); c.restore();
      c.restore();
    });
  });
}

/** Power pack riêng (động cơ + hộp số một khối), toạ độ thế giới; tâm khối ở (x,y), tỉ lệ s. */
function packDraw(c: Ctx, x: number, y: number, s: number, col: string, ph = 0, a = 1) {
  S.at(c, x, y, s, 1, () => {
    const l = A.px(c, 3.4), li = A.px(c, 2);
    A.withA(c, a, () => {
      A.rrect(c, -48, -26, 48, 26, 3, col, INK, l);
      for (let i = 0; i < 4; i++) A.rrect(c, -44 + i * 11, -32, 8, 8, 1, P.dark, INK, li);
      A.rrect(c, 4, -22, 26, 20, 3, col, INK, l);
      A.line(c, [[4, -12], [30, -12]], INK, li);
      gear(c, 17, -12, 7, ph * 1.3, P.light);
      c.save(); c.setLineDash([5, 4]); A.rrect(c, -52, -36, 86, 40, 4, null, INK, li); c.restore();
    });
  });
}

function crane(c: Ctx, x: number, gy: number, tipX: number, tipY: number, s = 1.2, ph = 0) {
  // xe cứu kéo + cần cẩu (nhìn ngang), đầu cần ở (tipX,tipY)
  S.at(c, x, gy, s, 1, () => {
    A.rrect(c, -90, -50, 180, 26, 5, P.oliveDark, INK, A.px(c, 3.4));
    A.rrect(c, 40, -88, 56, 40, 4, P.olive, INK, A.px(c, 3.4));
    for (const wx of [-60, -10, 55]) S.wheel(c, wx, -18, 18, ph);
  });
  const bx = x - 20 * s, by = gy - 80 * s;
  A.line(c, [[bx, by], [tipX, tipY]], INK, A.px(c, 14));
  A.line(c, [[bx, by], [tipX, tipY]], P.amber, A.px(c, 8));
}

export default class C09 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 351.9) this.s1(c, t);
    else if (t < 357.2) this.s2(c, t);
    else if (t < 369.2) this.s3(c, t);
    else if (t < 376.4) this.s4(c, t);
    else if (t < 386.2) this.s5(c, t);
    else this.s6(c, t);
  }

  // hỏng nhiều hơn bị phá; ba kiểu hỏng
  private s1(c: Ctx, t: number) {
    const GY = 760;
    const cam: K.Cam = { x: 960, y: 600, z: 1.3 };
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = '#e3e9ee'; c.fillRect(v.x0, GY, v.x1 - v.x0, 600);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 240, 3);
    // mặt đất xấu: đá và ổ gà
    for (let i = 0; i < 12; i++) A.poly(c, [[v.x0 + 100 + i * 180, GY], [v.x0 + 130 + i * 180, GY - 20 - (i % 3) * 8], [v.x0 + 170 + i * 180, GY]], '#c9d1d9', INK, A.px(c, 2));
    A.line(c, [[v.x0, GY], [v.x1, GY]], INK, A.px(c, 4));
    // xe tăng: chạy 337.3–344.4, hỏng xích 344.4, quá nhiệt 346.4, hộp số 348.4
    const stop = 344.6;
    const x = A.lerp(260, 1000, A.sm(t, 337.3, stop)) + (t > stop ? 0 : 0);
    const bump = t < stop ? Math.sin(t * 9) * 3 : 0;
    S.tankSide(c, x, GY + bump, 1.5, { ph: t < stop ? t * 3 : 0 });
    // đứt xích: mảnh văng ra
    if (t >= stop) {
      const k = A.ph(t, stop, stop + 0.9);
      const px = x - 100 * 1.5 + k * 80, py = GY - 25 * 1.5 - Math.sin(k * Math.PI) * 60 + k * 40;
      A.rrect(c, px - 18, py - 8, 36, 16, 3, P.dark, INK, A.px(c, 2.5));
      A.line(c, [[x - 150 - 4, GY - 54], [x - 150 + 30, GY - 6]], P.enemy, A.px(c, 5));
    }
    // quá nhiệt: khói + nhiệt kế
    if (t >= 346.2) {
      const k = A.clamp01((t - 346.2) / 1.0);
      F.smoke(c, x - 90, GY - 105, A.clamp(t - 346.2, 0, 6), 1.2, 5, '#6b7280', 18);
      // nhiệt kế
      const tx = x + 240, ty = GY - 340;
      A.rrect(c, tx - 16, ty - 90, 32, 160, 14, '#ffffff', INK, A.px(c, 3.4));
      c.fillStyle = P.enemy; c.fillRect(tx - 9, ty + 60 - 140 * k, 18, 140 * k + 4);
      A.circle(c, tx, ty + 78, 24, P.enemy, INK, A.px(c, 3.4));
    }
    // hộp số hỏng: bánh răng nứt
    if (t >= 348.2) {
      const k = A.ph(t, 348.2, 349.4);
      gear(c, x - 20, GY - 330, 70, t * 0.4 * (1 - k), P.light, k);
    }
    K.end(c);
    // so sánh: số hỏng (cờ lê) >> số bị phá (X). Hai cột nhỏ ở góc, 342–344
    if (t > 341.9) {
      const a = A.sm(t, 341.9, 342.8);
      A.withA(c, a, () => {
        A.rrect(c, 1380, 80, 460, 340, 18, 'rgba(255,255,255,0.92)', INK, 3.4);
        c.fillStyle = P.slate; c.fillRect(1450, 380 - 240 * A.eo(t, 342.2, 343.4), 120, 240 * A.eo(t, 342.2, 343.4));
        c.fillStyle = P.enemy; c.fillRect(1660, 380 - 70 * A.eo(t, 343.0, 343.8), 120, 70 * A.eo(t, 343.0, 343.8));
        wrench(c, 1510, 125, 0.9, 0.5);
        U.xMark(c, 1720, 150, 26, 1, P.enemy, 9);
      });
    }
  }

  // tổ lái tự sửa bằng đồ nghề trên xe
  private s2(c: Ctx, t: number) {
    const GY = 780;
    const cam: K.Cam = { x: 800, y: 620, z: 1.4 };
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = '#e3e9ee'; c.fillRect(v.x0, GY, v.x1 - v.x0, 600);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 240, 3);
    A.line(c, [[v.x0, GY], [v.x1, GY]], INK, A.px(c, 4));
    const fixed = A.sm(t, 355.0, 356.2);
    S.tankSide(c, 800, GY, 1.6, { ph: t * 3 * fixed });
    // hộp đồ nghề trên thân + hai người
    A.rrect(c, 760, GY - 190, 70, 36, 5, P.dark, INK, A.px(c, 3.4));
    Cm.soldier(c, 540, GY, 1.5, { dir: 1, aim: 0.0, weapon: null });
    Cm.soldier(c, 620, GY, 1.5, { dir: 1, weapon: null });
    // mắt xích mới trượt vào
    const k = A.eio(t, 353.2, 355.0);
    const lx = A.lerp(600, 540, k), ly = A.lerp(GY - 140, GY - 36, k);
    if (t < 355.0) A.rrect(c, lx - 20, ly - 9, 40, 18, 3, P.dark, INK, A.px(c, 2.5));
    wrench(c, 680 + Math.sin(t * 6) * 6, GY - 40, 1.2, 0.9 - 0.3 * Math.sin(t * 6));
    K.end(c);
    this.ladder(c, 1, t);
  }

  // thang ba tầng ở góc: tổ lái → xưởng tiểu đoàn → kho sau
  private ladder(c: Ctx, level: number, t: number) {
    void t;
    const x = 150, y0 = 880;
    for (let i = 0; i < 3; i++) {
      const on = i < level;
      A.rrect(c, x + i * 80, y0 - i * 70, 74, 64 + i * 70, 6, on ? P.olive : '#e5e9ee', INK, 3.4);
    }
  }

  // mặt cắt: xưởng tiểu đoàn thay nguyên cụm — giàn cẩu nhấc cụm hỏng, đặt sang bên, đưa cụm mới vào
  private s3(c: Ctx, t: number) {
    const GY = 860;
    const cam: K.Cam = K.track(t, [[357.2, { x: 700, y: 560, z: 1.0 }], [361.4, { x: 700, y: 560, z: 1.0 }], [362.3, { x: 640, y: 600, z: 1.55 }], [367.6, { x: 640, y: 600, z: 1.55 }], [369.2, { x: 800, y: 560, z: 1.1 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 300);
    c.fillStyle = '#e3e9ee'; c.fillRect(v.x0, GY, v.x1 - v.x0, 700);
    A.line(c, [[v.x0, GY], [v.x1, GY]], INK, A.px(c, 4));
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 260, 3);
    const TX = 800, SC = 2.0;
    // vị trí cụm trong khoang (toạ độ thế giới): tâm khối
    const bayX = TX + SC * (-44), bayY = GY + SC * (-37);
    const groundY = GY - 6;
    const oldRest = TX + SC * (-250), newRest = TX + SC * (-400);
    const liftY = GY - SC * 150;
    // tiến trình
    const e = (a: number, b: number) => A.eio(t, a, b);
    const oldX = A.lerp(bayX, oldRest, e(363.6, 364.6));
    const oldY = t < 363.6 ? A.lerp(bayY, liftY, e(362.4, 363.6)) : A.lerp(liftY, groundY, e(364.4, 364.9));
    const newX = A.lerp(newRest, bayX, e(365.6, 366.5));
    const newY = t < 366.5 ? A.lerp(groundY, liftY, e(365.2, 365.9)) : A.lerp(liftY, bayY, e(366.5, 367.2));
    // trolley trên dầm
    const beamY = GY - 560;
    const trX = t < 363.6 ? bayX : t < 365.0 ? A.lerp(bayX, newRest, e(364.5, 365.2)) : (t < 365.6 ? newRest : newX);
    const trX2 = t < 364.6 ? oldX : trX;
    const hookX = t < 364.6 ? oldX : newX;
    const hookY = (t < 364.6 ? oldY : newY) - 40;
    // giàn cẩu: hai trụ, dầm
    const g0 = TX + SC * (-470), g1 = TX + SC * 80;
    A.line(c, [[g0, GY], [g0, beamY]], INK, A.px(c, 16)); A.line(c, [[g1, GY], [g1, beamY]], INK, A.px(c, 16));
    A.line(c, [[g0, GY], [g0, beamY]], P.amber, A.px(c, 9)); A.line(c, [[g1, GY], [g1, beamY]], P.amber, A.px(c, 9));
    A.line(c, [[g0 - 30, beamY], [g1 + 30, beamY]], INK, A.px(c, 20)); A.line(c, [[g0 - 30, beamY], [g1 + 30, beamY]], P.amber, A.px(c, 12));
    // xe tăng cắt lớp (không có cụm; cụm vẽ riêng)
    tankCut(c, TX, GY, SC, { noPack: true, ph: 0 });
    // cụm hỏng / cụm mới
    packDraw(c, oldX, oldY + 0, SC, t < 364.6 ? P.enemyLight : P.slate);
    if (t > 364.4) packDraw(c, newX, newY, SC, P.oliveLight);
    // xe xưởng (đứng chờ ở bên trái, cho biết đây là xưởng tiểu đoàn)
    S.truckSide(c, TX + SC * (-640), GY, 1.4, { load: 0 });
    // cáp và móc: chỉ khi giàn đang làm việc
    if (t > 362.0) {
      const tx = hookX;
      A.line(c, [[tx, beamY], [hookX, hookY]], INK, A.px(c, 4));
      A.circle(c, tx, beamY, 18, P.dark, INK, A.px(c, 3));
      A.rrect(c, hookX - 16, hookY - 6, 32, 14, 3, P.dark, INK, A.px(c, 3));
    }
    void trX2;
    K.end(c);
    // đồng hồ: xong trong vài giờ
    if (t > 362.0) {
      const q = A.ph(t, 362.1, 367.4);
      const cx = 1700, cy = 190, r = 90;
      A.circle(c, cx, cy, r, '#ffffff', INK, 4);
      c.save(); c.strokeStyle = P.amber; c.lineWidth = 16; c.beginPath(); c.arc(cx, cy, r - 12, -Math.PI / 2, -Math.PI / 2 + q * Math.PI * 0.5); c.stroke(); c.restore();
      A.line(c, [[cx, cy], [cx + Math.cos(-Math.PI / 2 + q * 1.57) * 62, cy + Math.sin(-Math.PI / 2 + q * 1.57) * 62]], INK, 6);
    }
    this.ladder(c, 2, t);
    // cờ lê gạch chéo: không sửa tại chỗ (358–361.8)
    if (t > 358.0 && t < 361.8) {
      const a = A.win(t, 358.0, 361.8, 0.3, 0.4);
      A.withA(c, a, () => { wrench(c, 1550, 250, 2.2, 0.6); U.xMark(c, 1550, 250, 80, A.eo(t, 358.6, 359.4), P.enemy, 14); });
    }
  }

  // cụm hỏng về kho xa mặt trận: được dựng lại bằng dụng cụ chuẩn, không ai bắn vào thợ
  private s4(c: Ctx, t: number) {
    const cam: K.Cam = { x: 700, y: 0, z: 0.7 };
    K.begin(c, cam);
    const v = K.view(cam, 400);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 260, 'rgba(0,0,0,0)');
    M.forest(c, 400, 330, 220, 2); M.forest(c, 100, -330, 200, 6); M.hill(c, 1500, -300, 260, 4, 3);
    S.roadLine(c, [[-300, 0], [1700, 0]], 40);
    // mặt trận bên phải: chớp lửa, đơn vị
    M.unit(c, 1700, -140, 'armor', 'ally', 250); M.unit(c, 1700, 140, 'armor', 'ally', 250);
    M.unit(c, 2200, 0, 'armor', 'foe', 230);
    F.explosion(c, 2000, -80, 60, A.ph((t * 0.8) % 1, 0, 0.7));
    // kho xa: bên trái
    S.depotTop(c, -200, 0, 2.0);
    // xe tải chở cụm hỏng đi trái: 369.3–373.4
    const k = A.eio(t, 369.4, 373.0);
    const x = A.lerp(1400, -120, k);
    S.truckTop(c, x, 0, 1.6, { ang: Math.PI, load: 0 });
    c.save(); c.translate(x - 30, 0); A.rrect(c, -50, -24, 60, 48, 4, P.enemyLight, INK, A.px(c, 3.4)); c.restore();
    // dựng lại tại kho: bàn + bánh răng quay + cụm xanh khi xong (373–376)
    if (t > 373.0) {
      const w = A.ph(t, 373.0, 375.6);
      c.save(); c.translate(-200, 150);
      A.rrect(c, -90, -30, 180, 60, 6, P.light, INK, A.px(c, 3.4));
      A.rrect(c, -60, -62, 120, 36, 4, A.lerpColor(P.enemyLight, P.oliveLight, w), INK, A.px(c, 3.4));
      c.restore();
      gear(c, -90, 130, 36, t * 2, P.light);
      wrench(c, -300, 120, 1.3, 0.6 + Math.sin(t * 6) * 0.3);
    }
    K.end(c);
  }

  // xe hàng triệu nằm vì một bộ phận nhỏ
  private s5(c: Ctx, t: number) {
    const GY = 780;
    const cam: K.Cam = { x: 900, y: 600, z: 1.35 };
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = '#e3e9ee'; c.fillRect(v.x0, GY, v.x1 - v.x0, 700);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 240, 5);
    A.line(c, [[v.x0, GY], [v.x1, GY]], INK, A.px(c, 4));
    // xe lớn, đứng yên, với ổ thiếu (nét đứt) ở khoang cụm
    S.tankSide(c, 740, GY, 1.9, { ph: 0 });
    c.save(); c.setLineDash([8, 6]);
    A.circle(c, 560, GY - 160, 34, null, P.enemy, A.px(c, 6));
    c.restore();
    // bộ phận nhỏ ở xa bên phải (kho), đi chậm: kiện 'part'
    const k = A.ph(t, 381.4, 385.6);
    S.crate(c, A.lerp(1850, 1450, A.eo(k, 0, 0.3)), GY, 1.0, 'part');
    gear(c, 1180, GY - 430, 40, t * 0.5, P.light);
    K.end(c);
    // lịch: ngày trôi (tuần), ô lấp dần
    const q = A.ph(t, 381.0, 385.6);
    for (let i = 0; i < 21; i++) {
      const filled = i / 21 < q;
      A.rrect(c, 160 + (i % 7) * 52, 120 + Math.floor(i / 7) * 52, 44, 44, 5, filled ? P.amber : '#ffffff', INK, 3);
    }
    // mặt trời/ bóng chuyển: ngày trôi
    A.circle(c, 160 + 7 * 52 + 100, 180, 28, P.amber, INK, 3);
  }

  // tháo xe này giữ hai xe kia chạy
  private s6(c: Ctx, t: number) {
    const GY = 780;
    const cam: K.Cam = { x: 960, y: 600, z: 1.15 };
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = '#e3e9ee'; c.fillRect(v.x0, GY, v.x1 - v.x0, 700);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.6, '#dde7ee', 240, 7);
    A.line(c, [[v.x0, GY], [v.x1, GY]], INK, A.px(c, 4));
    const give = A.ph(t, 388.0, 392.0);
    // hai xe nhận (trái, phải) và một xe cho (giữa)
    const run = (a: number) => t * 3 * a;
    S.tankSide(c, 360, GY, 1.1, { ph: run(A.sm(give, 0.5, 1)) });
    S.tankSide(c, 1560, GY, 1.1, { ph: run(A.sm(give, 0.7, 1)), dir: 1 });
    S.tankSide(c, 960, GY, 1.1, { ph: 0, a: 1 - 0.0 });
    // bộ phận bay từ xe giữa sang hai xe
    const parts: [Pt, Pt, string][] = [[[960, GY - 70], [360, GY - 80], P.light], [[960, GY - 90], [1560, GY - 90], P.oliveLight], [[900, GY - 40], [360, GY - 40], P.dark], [[1020, GY - 40], [1560, GY - 40], P.amber]];
    parts.forEach(([a, b, col], i) => {
      const k = A.eio(give, i * 0.15, 0.55 + i * 0.15);
      if (k > 0 && k < 1) { const x = A.lerp(a[0], b[0], k), y = A.lerp(a[1], b[1], k) - Math.sin(k * Math.PI) * 120; gear(c, x, y, 22, k * 10, col); }
    });
    // khói xả hai xe đang chạy
    if (give > 0.9) { Cm.exhaust(c, 260, GY - 100, t, 1, 1.1); Cm.exhaust(c, 1460, GY - 100, t, 1, 1.1); }
    // xe giữa bị tháo: thiếu bánh xích, tháp pháo lệch, màu xám dần
    if (give > 0.4) { c.save(); c.globalAlpha *= 0.35 * A.sm(give, 0.4, 1); c.fillStyle = '#9aa3ad'; c.fillRect(960 - 130, GY - 140, 260, 140); c.restore(); }
    K.end(c);
    // 395–400.5: bao nhiêu ngày chiến đấu không có nhà máy — dải ngày, nhà máy gạch chéo
    if (t > 395.0) {
      const a = A.sm(t, 395.0, 396.0);
      A.withA(c, a, () => {
        A.rrect(c, 120, 90, 1680, 170, 18, 'rgba(255,255,255,0.92)', INK, 3.4);
        S.factoryTop(c, 230, 175, 1.0);
        U.xMark(c, 230, 175, 70, A.eo(t, 395.4, 396.2), P.enemy, 10);
        const q = A.ph(t, 396.0, 400.4);
        for (let i = 0; i < 20; i++) A.rrect(c, 360 + i * 70, 130, 60, 90, 6, i / 20 < q ? P.amber : '#ffffff', INK, 3);
      });
    }
  }
}
