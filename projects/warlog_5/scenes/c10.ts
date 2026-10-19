// Chương 10 (368.5 – 406): hậu cần — mỗi phát 40 kg phải đi bằng xe tải từ nhà máy; pháo thiếu đạn là tượng đài.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as M from './shared/map';
import { P } from './shared/palette';
import * as X from './_art';

const CAM: K.Cam = { x: 1000, y: 400, z: 0.88 };
const FAC: A.Pt = [200, 430], DEP: A.Pt = [1000, 430], GUN: A.Pt = [1800, 300];
const ROAD: A.Pt[] = [FAC, [600, 470], DEP, [1400, 380], [1700, 310]];
export const FIRE10: number[] = [];
for (let i = 0; i < 10; i++) FIRE10.push(369.0 + i * 0.35);

function factory(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.rrect(c, -90, -50, 180, 100, 8, P.light, P.ink, 5);
  A.poly(c, [[-90, -50], [-50, -90], [-50, -50]], P.slate, P.ink, 4); A.poly(c, [[-50, -50], [-10, -90], [-10, -50]], P.slate, P.ink, 4);
  A.rrect(c, 40, -120, 30, 80, 4, P.dark, P.ink, 4);
  A.rrect(c, -60, 0, 50, 50, 4, P.dark, P.ink, 3);
  c.restore();
}
function depot(c: CanvasRenderingContext2D, x: number, y: number, s: number) {
  c.save(); c.translate(x, y); c.scale(s, s);
  A.poly(c, [[-100, 40], [-100, -30], [0, -80], [100, -30], [100, 40]], P.sand, P.ink, 5);
  A.rrect(c, -34, -4, 68, 44, 4, P.dark, P.ink, 4);
  c.restore();
}

export default class S10 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 400.0) this.chain(c, t); else this.monument(c, t);
    X.dip(c, t, 400.0, 0.1);
  }

  private chain(c: CanvasRenderingContext2D, t: number) {
    K.begin(c, CAM);
    M.mapBg(c, CAM, { color: '#ece6cf' });
    M.forest(c, 560, 700, 110, 3); M.forest(c, 1350, 640, 100, 6); M.forest(c, 900, 150, 90, 9);
    M.road(c, ROAD, 56);
    factory(c, FAC[0], FAC[1] - 40, 2.0);
    depot(c, DEP[0], DEP[1] - 30, 2.0);
    // pháo + bắn
    const lastFire = FIRE10.filter((f) => f <= t).pop();
    const m = X.top(c, 'sp', GUN[0], GUN[1], -0.1, 2.6, 'ally');
    void m;
    if (t >= 369 && t < 373.4) for (const f of FIRE10) if (t >= f && t < f + 0.3) F.muzzleFlash(c, GUN[0] + 210, GUN[1] - 20, -0.1, A.ph(t, f, f + 0.3), 1.2);
    void lastFire;
    // đạn trong giá của pháo: thanh cạn dần rồi nạp lại nhờ xe
    // dây chuyền tô sáng ở 395.96+
    const hl = A.sm(t, 396.0, 397.0);
    if (hl > 0) {
      for (let i = 0; i < ROAD.length - 1; i++) A.withA(c, hl, () => A.line(c, [ROAD[i]!, ROAD[i + 1]!], P.amber, A.px(c, 10)));
    }
    // xe tải: nhiều chuyến sau 375.8
    const nTr = t > 392 ? 4 : t > 375 ? 2 : 0;
    for (let i = 0; i < nTr; i++) {
      const u = ((((t - 375.8) / 7.5) + i / nTr) % 1 + 1) % 1;
      const seg = u * (ROAD.length - 1), k = Math.floor(seg), f = seg - k;
      const a = ROAD[k]!, b = ROAD[Math.min(ROAD.length - 1, k + 1)]!;
      const x = A.lerp(a[0], b[0], f), y = A.lerp(a[1], b[1], f);
      X.top(c, 'truck', x, y, Math.atan2(b[1] - a[1], b[0] - a[0]), 1.9, 'ally');
    }
    // sản lượng nhà máy: đạn ra từng cái một
    if (t >= 382) {
      for (let i = 0; i < 6; i++) {
        const u = ((t - 382) * 0.5 + i / 6) % 1;
        if (t > 387.2) { /* quá tải: đạn ra chậm hơn nhu cầu */ }
        X.shell(c, FAC[0] + 170 + u * 200, FAC[1] + 100, 0, 0.8);
      }
    }
    // người bốc dỡ ở kho
    if (t >= 394.0) for (let i = 0; i < 3; i++) X.top(c, 'mortar', DEP[0] - 70 + i * 70, DEP[1] + 110, 0, 0.7, 'ally', 0);
    K.end(c);
    // số: 40 kg, 155
    X.bigNum(c, '40 kg', 960, 150, A.win(t, 376.8, 381.2, 0.2, 0.4), 130);
    X.bigNum(c, '155', 960, 150, A.win(t, 382.7, 386.6, 0.2, 0.4), 130);
    if (t > 376 && t < 381.6) X.weightIcon(c, 960, 300, 1.2);
    // thanh nhu cầu vs sản xuất (387–392)
    const cmp = A.win(t, 387.4, 392.0, 0.3, 0.4);
    if (cmp > 0) A.withA(c, cmp, () => {
      const g = A.sm(t, 387.6, 389.5);
      A.rrect(c, 1100, 860, 80, 150, 8, P.olive, P.ink, 4);
      A.rrect(c, 1240, 1010 - 150 - 330 * g, 80, 150 + 330 * g, 8, P.enemy, P.ink, 4);
    });
    // thanh đạn cạn dần (368.6–372)
    const dr = A.win(t, 368.6, 375.8, 0.3, 0.5);
    if (dr > 0) A.withA(c, dr, () => U.bar(c, 1420, 870, 340, 54, 1 - A.ph(t, 369.0, 372.4) + 0.2 * Math.sin(t * 8) * 0.0, P.amber));
  }

  // 400–406: pháo không đạn — tượng đài đắt tiền
  private monument(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: -230, z: 1.0 };
    K.begin(c, cam);
    X.sideGround(c, cam);
    const a = A.sm(t, 400.0, 401.0);
    A.rrect(c, -330, -30, 660, 50, 6, P.light, P.ink, 5);
    A.rrect(c, -300, -64, 600, 40, 6, P.light, P.ink, 5);
    X.spGun(c, { x: 0, y: -64, elev: 0.5 });
    // hộp đạn rỗng bên cạnh
    A.rrect(c, 420, -50, 150, 50, 6, P.oliveDark, P.ink, 4);
    A.line(c, [[430, -50], [560, -90]], P.oliveDark, 10);
    // cỏ mọc
    for (let i = 0; i < 6; i++) { const gx = -280 + i * 110; A.line(c, [[gx, 20], [gx - 8, -4 - 14 * a]], P.olive, 5); A.line(c, [[gx, 20], [gx + 8, -2 - 12 * a]], P.olive, 5); }
    K.end(c);
    void U; void F;
  }
}
