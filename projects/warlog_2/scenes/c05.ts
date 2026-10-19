// Chương 5 · 167.14–215.42 · Máy bay (đắt, nhỏ, nhanh) và con số học của quãng đường.
// 167–173.6 SIDE máy bay bay qua nơi không có đường/ray/cảng · 173.6–180.4 TOP cầu hàng không Berlin
// 180.4–191.3 SIDE tàu hỏa vs máy bay (cột chi phí thêm "air") · 191.3–215.4 sơ đồ: quãng đường → số xe → nhiên liệu/người/phụ tùng/đường;
// thêm xe làm tổng xấu đi; cách sửa là rút ngắn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as U from './shared/ui';
import * as S from './_assets';
import * as Cm from './_common';
import { costChart } from './c03';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

function person(c: Ctx, x: number, y: number, s = 1, col: string = P.dark) {
  A.circle(c, x, y - 16 * s, 5 * s, P.skin, INK, A.px(c, 1.5));
  A.rrect(c, x - 5 * s, y - 11 * s, 10 * s, 12 * s, 3 * s, col, INK, A.px(c, 1.5));
}

export default class C05 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 173.6) this.s1(c, t);
    else if (t < 180.45) this.s2(c, t);
    else if (t < 191.3) this.s3(c, t);
    else this.s4(c, t);
  }

  // máy bay bay trên vùng không có hạ tầng; ký hiệu đường/ray/cảng bị gạch dưới nó
  private s1(c: Ctx, t: number) {
    const GY = 780;
    const cam: K.Cam = K.track(t, [[167.14, { x: 700, y: 520, z: 1.0 }], [173.6, { x: 2300, y: 520, z: 1.0 }]], A.sm);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.5, '#dde7ee', 260, 4);
    S.hillsBack(c, cam.x, GY, v.x0, v.x1, 0.75, '#d3e0e8', 160, 8);
    S.sideGround(c, v.x0, v.x1, GY, { road: false, depth: 700 });
    // ký hiệu hạ tầng bị bỏ qua: đường, ray, cảng (đều gạch chéo)
    const marks = [[900, 'road'], [1500, 'rail'], [2100, 'port']] as [number, string][];
    for (const [mx, kind] of marks) {
      c.save(); c.translate(mx, GY + 90);
      A.rrect(c, -90, -50, 180, 100, 10, 'rgba(255,255,255,0.9)', INK, A.px(c, 3));
      if (kind === 'road') { A.line(c, [[-60, 20], [-10, -20], [60, -22]], '#8f8670', A.px(c, 14)); A.line(c, [[-60, 20], [-10, -20], [60, -22]], '#fbf8ec', A.px(c, 8)); }
      if (kind === 'rail') { A.line(c, [[-60, 0], [60, 0]], INK, A.px(c, 8)); for (let i = -2; i <= 2; i++) A.line(c, [[i * 24, -14], [i * 24, 14]], INK, A.px(c, 3)); }
      if (kind === 'port') { A.line(c, [[-30, 28], [-30, -26]], INK, A.px(c, 6)); A.line(c, [[-30, -26], [30, -26]], INK, A.px(c, 6)); A.line(c, [[30, -26], [30, 0]], INK, A.px(c, 3)); }
      const k = A.eo(t, 168.2 + marks.findIndex(m => m[0] === mx) * 1.0, 169.0 + marks.findIndex(m => m[0] === mx) * 1.0);
      if (k > 0) {
        A.line(c, [[-70, -45], [-70 + 140 * k, 45]], P.enemy, A.px(c, 8));
        if (k >= 1) A.line(c, [[70, -45], [-70, 45]], P.enemy, A.px(c, 8));
      }
      c.restore();
    }
    // máy bay: bay xuyên qua, bóng rơi xuống đất
    const px = A.lerp(380, 2700, A.sm(t, 167.14, 173.6));
    const py = 430 + Math.sin(t * 1.5) * 8;
    A.ellipse(c, px, GY + 8, 150, 14, 0, 'rgba(30,41,59,0.15)', null, 0);
    S.planeSide(c, px, py, 1.05, { ph: t, tilt: -0.02 });
    // hàng trong máy bay: nhìn thấy khoang? chỉ vài kiện thả xuống
    K.end(c);
  }

  // cầu hàng không: thành phố bị vây, máy bay bay vào theo hành lang
  private s2(c: Ctx, t: number) {
    const cam: K.Cam = K.track(t, [[173.6, { x: 280, y: 0, z: 0.95 }], [180.45, { x: 40, y: 0, z: 0.95 }]], A.eio);
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
    M.forest(c, -700, 420, 240, 4); M.forest(c, 800, -420, 230, 9); M.forest(c, 760, 480, 200, 2); M.forest(c, -760, -380, 200, 7);
    // đường và ray đi vào thành phố từ phía phải, bị chặn ở vòng vây
    S.roadLine(c, [[1500, -100], [900, -80], [480, -20]], 30);
    S.railLine(c, [[1500, 90], [900, 100], [440, 40]], 18);
    S.roadLine(c, [[-1500, 120], [-900, 90], [-480, 40]], 30);
    // thành phố
    M.town(c, 0, 0, 230, 3);
    A.circle(c, 0, 0, 310, 'rgba(255,255,255,0.0)', P.dark, A.px(c, 4));
    // vòng vây: nét đứt đỏ + các đơn vị đối phương
    const ring = A.eo(t, 175.0, 177.0);
    c.save(); c.setLineDash([26, 16]); c.strokeStyle = P.enemy; c.lineWidth = A.px(c, 8);
    c.beginPath(); c.arc(0, 0, 520, 0, Math.PI * 2 * ring); c.stroke(); c.restore();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.2, k = A.eo(t, 175.4 + i * 0.12, 176.2 + i * 0.12);
      if (k > 0) M.unit(c, Math.cos(a) * 520, Math.sin(a) * 520, 'armor', 'foe', 170 * k);
    }
    // chỗ đường/ray cắt vòng vây: bị chặn
    for (const [x, y] of [[520, -26], [512, 40], [-520, 40]] as Pt[]) U.xMark; // (xMark vẽ ở lớp màn hình)
    // hành lang bay: ba đường từ trái
    const corr: Pt[][] = [[[-1300, -230], [-300, -60]], [[-1300, 10], [-300, 0]], [[-1300, 250], [-300, 70]]];
    for (const cr of corr) { c.save(); c.setLineDash([10, 12]); A.line(c, cr, 'rgba(30,41,59,0.35)', A.px(c, 3)); c.restore(); }
    for (let i = 0; i < 9; i++) {
      const cr = corr[i % 3]!;
      const k = ((t - 173.6) * 0.14 + i / 9) % 1;
      const [x, y, a] = [A.lerp(cr[0]![0], 0, k), A.lerp(cr[0]![1], 0, k) * (1 - k) + cr[1]![1] * k * 0.0, 0] as [number, number, number];
      const yy = A.lerp(cr[0]![1], cr[1]![1], Math.min(1, k * 1.45));
      const ang = Math.atan2(cr[1]![1] - cr[0]![1], cr[1]![0] - cr[0]![0]);
      if (t > 174.2) S.planeTop(c, x, yy, 0.3, { ang, ph: t });
      void y; void a;
    }
    // kiện rơi xuống thành phố
    for (let i = 0; i < 6; i++) {
      const k = A.ph(((t - 175.0) * 0.5 + i / 6) % 1, 0, 1);
      if (t > 175.0) S.crate(c, -120 + i * 50, -30 + (i % 2) * 50 - (1 - k) * 90, 2.0, (['fuel', 'ammo', 'cargo', 'water'] as S.CrateKind[])[i % 4], A.sm(k, 0, 0.3));
    }
    K.end(c);
    // dấu chặn đường/ray: gạch đỏ theo toạ độ màn hình
    const k2 = A.eo(t, 177.4, 178.2);
    if (k2 > 0) for (const [wx, wy] of [[520, -40], [490, 36], [-500, 40]] as Pt[]) {
      const [sx, sy] = K.toScreen(cam, wx, wy);
      U.xMark(c, sx, sy, 34, k2, P.enemy, 9);
    }
  }

  // tàu hỏa vs máy bay: sức chở và chi phí; máy bay cho thứ không thể chờ
  private s3(c: Ctx, t: number) {
    const GY = 560;
    const cam: K.Cam = { x: 960, y: 540, z: 1 };
    K.begin(c, cam);
    c.fillStyle = '#e3e9ee'; c.fillRect(-100, GY + 20, 2200, 800);
    A.line(c, [[-100, GY + 20], [2100, GY + 20]], INK, A.px(c, 4));
    // tàu hỏa tĩnh: nhiều kiện
    const tx = A.lerp(2700, 1800, A.eo(t, 180.5, 182.8));
    S.trainSide(c, tx, GY + 20, 1.0, { wagons: 6, load: 1, ph: tx / 20 });
    // máy bay: vài kiện
    const ax = A.lerp(-300, 560, A.eo(t, 180.6, 182.4));
    const ay = 220 + Math.sin(t * 2) * 6;
    S.planeSide(c, ax, ay, 1.0, { ph: t });
    for (let i = 0; i < 3; i++) S.crate(c, ax - 110 + i * 80, ay + 110, 1.3, ['fuel', 'ammo', 'cargo'][i] as S.CrateKind);
    // 183–186: cột chi phí có thêm "air"
    if (t > 183.0) {
      const a = A.sm(t, 183.0, 183.8);
      A.withA(c, a, () => {
        A.rrect(c, 90, 560, 900, 490, 16, 'rgba(255,255,255,0.92)', INK, A.px(c, 3.4));
        costChart(c, 200, 960, 300, t - 183.6, { ship: 0.1, rail: 0.5, truck: 0.9, air: 1.5 }, 120, 100);
      });
    }
    // 186–191: một kiện khẩn bay thẳng tới lính, trong khi tàu hỏa còn chạy
    if (t > 186.0) {
      const k = A.eio(t, 186.2, 189.0);
      const x = A.lerp(ax + 40, 1450, k), y = A.lerp(ay + 110, GY + 10, k);
      S.crate(c, x, y, 1.6, 'part');
      A.withA(c, A.sm(t, 188.5, 189.4), () => Cm.soldier(c, 1530, GY + 20, 1.3, { dir: -1 }));
    }
    K.end(c);
  }

  // sơ đồ số học
  private s4(c: Ctx, t: number) {
    A.clear(c, '#f4f8fb');
    // quãng đường, số xe
    const D = A.keys(t, [[191.3, 480], [194.4, 480], [199.3, 1120], [211.5, 1120], [215.4, 380]]);
    const nAdd = A.keys(t, [[207.2, 0], [211.4, 8]]);
    const nBase = A.keys(t, [[191.3, 3], [194.4, 3], [199.3, 8], [211.5, 8], [215.4, 2]]);
    const n = nBase + nAdd;
    const roadY = 330, x0 = 260;
    // đường + đơn vị cuối
    c.fillStyle = '#e8eff4'; c.fillRect(0, roadY - 110, 1920, 220);
    S.roadLine(c, [[x0 - 80, roadY], [x0 + D, roadY]], 110);
    S.factoryTop(c, x0 - 160, roadY, 1.3);
    M.unit(c, x0 + D + 130, roadY, 'armor', 'ally', 220);
    Cm.dimLine(c, x0 - 80, x0 + D, roadY - 160, 1, P.ink, 8);
    // xe dọc đường
    const nn = Math.max(1, Math.round(n));
    for (let i = 0; i < nn; i++) {
      const x = x0 - 20 + (D - 40) * (i + 0.5) / nn;
      S.truckTop(c, x, roadY + (i % 2 ? 24 : -24), 0.95, { load: 1, kind: (['fuel', 'cargo', 'ammo', 'water'] as S.CrateKind[])[i % 4] });
    }
    // bốn cột: nhiên liệu / người lái / phụ tùng / mòn đường
    const base = 1010, bw = 150, hmax = 460;
    const rel = A.clamp01(n / 16);
    const cols: { x: number; col: string; on: number; kind: number }[] = [
      { x: 300, col: P.amber, on: 200.6, kind: 0 }, { x: 590, col: P.sky, on: 202.4, kind: 1 },
      { x: 880, col: P.sand, on: 204.2, kind: 2 }, { x: 1170, col: P.light, on: 205.6, kind: 3 },
    ];
    A.line(c, [[140, base], [1330, base]], INK, A.px(c, 5));
    cols.forEach((o, i) => {
      const g = A.eo(t, o.on, o.on + 1.0);
      const h = hmax * (0.12 + 0.88 * rel) * (g > 0 ? 1 : 0) * (0.7 + 0.3 * g) * (i === 3 ? 0.85 : 1);
      c.fillStyle = o.col; c.fillRect(o.x - bw / 2, base - h, bw, h);
      A.rrect(c, o.x - bw / 2, base - h, bw, h, 2, null, INK, A.px(c, 3.4));
      const hv = Math.min(hmax, h);
      // biểu tượng trên đỉnh cột
      const yIcon = base - hv - 34;
      if (g > 0.1) {
        if (o.kind === 0) S.crate(c, o.x, yIcon + 30, 1.3, 'fuel');
        if (o.kind === 1) person(c, o.x, yIcon + 30, 2.2);
        if (o.kind === 2) S.crate(c, o.x, yIcon + 30, 1.3, 'part');
        if (o.kind === 3) { A.line(c, [[o.x - 36, yIcon + 22], [o.x - 6, yIcon - 6], [o.x + 8, yIcon + 14], [o.x + 36, yIcon - 10]], INK, A.px(c, 5)); }
      }
    });
    // phần "đến nơi" còn lại cho người đánh: thu hẹp khi thêm xe
    const burned = A.clamp01(0.12 + n * 0.052);
    S.loadColumn(c, 1580, base, 170, hmax, burned);
    const dx = 1580;
    A.withA(c, A.sm(t, 196, 197), () => Cm.soldier(c, dx + 190, base, 1.4, { dir: -1 }));
    // 211.5–215.4: cách sửa — rút ngắn; mũi tên co lại
    K.begin(c, { x: 960, y: 540, z: 1 }); K.end(c);
  }
}
