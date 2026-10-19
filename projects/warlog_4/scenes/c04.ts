// Chương 4 (134.4 – 168.7): sàn thẳng → đâm máy bay đậu → sàn xiên, bolter, phóng cùng lúc. TRÊN.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import { P } from './shared/palette';
import * as S from './_ship';
import { chain } from './_c';

const T_PARK0 = 138.6;           // máy bay đậu hiện dần
const TD1 = 143.0;               // chạm sàn, trượt dây
const T_HIT = TD1 + (225 + 430) / 215;   // ≈ 146.05
const T_RESET = 148.2;
const T_ANG0 = 151.8, T_ANG1 = 154.6;    // sàn xoay thành sàn xiên
const TD2 = 157.0;               // bolter chạm sàn
const T_LAUNCH = 163.4;          // phóng ở mũi
const TD3 = 164.6;               // hạ cánh trúng dây, cùng lúc

const PARK: A.Pt[] = [[270, -1], [270, 1], [330, -1], [330, 1], [390, -1], [390, 1], [450, -1], [450, 1]];

// vòng bay của bolter: lượn trên sàn xiên → ra mạn trái → vòng lại phía sau
export const BOLT = S.makePath([[-950, 190], [-700, 120], [-450, 40], [-150, -14], [190, -80], [430, -130], [640, -190], [680, -300], [450, -380], [0, -390], [-600, -360], [-900, -250], [-940, -30], [-950, 190]], 3);
function nearestU(path: ReturnType<typeof S.makePath>, px: number, py: number) {
  let best = 0, bd = 1e9;
  for (let i = 0; i <= 2000; i++) { const [x, y] = path.at(i / 2000); const d = Math.hypot(x - px, y - py); if (d < bd) { bd = d; best = i / 2000; } }
  return best;
}
const BOLT_TD = nearestU(BOLT, -450, 40); // u tại điểm chạm
const LAND = S.makePath([[-950, 190], [-700, 120], [-450, 40], [-150, -14], [-40, -35]], 2);

export default class C04 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    const k = A.sm(t, T_ANG0, T_ANG1) * (t < T_RESET ? 0 : 1);
    const cam = K.track(t, [
      [134.4, { x: 15, y: 0, z: 1.55 }], [138.0, { x: 15, y: 0, z: 1.55 }],
      [140.6, { x: 90, y: 0, z: 2.3 }], [147.5, { x: 90, y: 0, z: 2.3 }],
      [149.6, { x: 15, y: 0, z: 1.55 }], [155.0, { x: 15, y: 0, z: 1.55 }],
      [157.2, { x: -90, y: -90, z: 1.3 }], [168.7, { x: -90, y: -90, z: 1.3 }],
    ], A.eio);
    K.begin(c, cam);
    S.seaTop(c, cam, -t * 70);
    const wires = 4;
    const straight = t < T_RESET + 3.4 ? (t >= T_RESET ? 0 : 0) : 0;
    void straight;
    // trước khi xoay: sàn thẳng; sau reset: sàn thẳng rồi xoay thành xiên
    const kk = t < T_RESET ? 0 : k;
    S.carrierTop(c, t, { x: 0, y: 0, angled: kk, wires, hl: kk > 0.9 ? 'wire' : undefined });
    this.park(c, t, kk);
    this.jets(c, t);
    K.end(c);
    if (t > 150.0 && t < 152.4) S.tag(c, '1950s', 960, 470, A.win(t, 150.0, 152.4, 0.3, 0.4), { size: 48 });
    S.cutDip(c, t, T_RESET, 0.14);
  }

  private park(c: CanvasRenderingContext2D, t: number, k: number) {
    // máy bay đậu: thẳng hàng giữa sàn → dạt sang hai bên khi sàn xiên
    const spread = A.sm(t, T_ANG0, T_ANG1) * (t >= T_RESET ? 1 : 0);
    PARK.forEach(([x, s], i) => {
      const appear = A.back(t, T_PARK0 + i * 0.28, T_PARK0 + i * 0.28 + 0.4);
      if (appear <= 0.01) return;
      let y = s * (12 + 30 * spread);
      let a = 1, rot = 0, dx = 0, dy = 0;
      // sau va chạm (trước reset)
      if (t >= T_HIT && t < T_RESET && x < 380) {
        const age = t - T_HIT;
        dx = 60 * age * (1 + i * 0.1); dy = (i % 2 ? 1 : -1) * 70 * age;
        rot = age * (2 + i * 0.3); a = 1 - A.sm(t, T_HIT + 1, T_HIT + 2);
      }
      void k;
      const sc = Math.min(1, appear) * 0.8;
      S.jetTop(c, x + dx, y + dy, sc, { fold: 1, a, ang: rot });
    });
    // sau reset: sắp lại nguyên vẹn (hiện từ vị trí gốc)
  }

  private jets(c: CanvasRenderingContext2D, t: number) {
    // — sàn thẳng: phi cơ trượt dây rồi đâm vào máy bay đậu
    if (t < T_RESET) {
      // phản lực nhân vật đậu chờ ở đầu (hiện lúc đầu chương, mới vừa dừng ở dây)
      if (t < 138.4) {
        const x = 14 + 0 * t;
        S.jetTop(c, x, 0, 1.0, { hero: true });
      } else if (t < TD1 - 1.6) {
        // cất vào chỗ đậu: lượn tới cuối hàng rồi biến thành một chiếc đậu
        const u = A.eio(t, 138.4, 139.6);
        S.jetTop(c, A.lerp(14, 14, u), A.lerp(0, 0, u), 1.0, { hero: true, a: 1 - u });
      }
      if (t >= TD1 - 1.7 && t < T_HIT + 0.2) {
        const x = -430 + 215 * (t - TD1);
        // lưỡi lửa phanh hụt: nét đứt chỉ đường đi
        if (t > TD1) S.dashPath(c, [[-430, 0], [-190, 0]], 1, P.amber, 5, [14, 12]);
        S.jetTop(c, x, 0, 1.0, { hero: true, flame: t > TD1 + 0.1 ? 0.8 : 0 });
      }
      if (t >= T_HIT && t < T_HIT + 1.4) {
        const p = (t - T_HIT) / 0.9;
        F.explosion(c, 240, 0, 70, p, A.px(c, 3));
      }
      if (t >= T_HIT + 0.3 && t < T_RESET) {
        F.smoke(c, 245, 0, (t - T_HIT - 0.3) * 2.2, 0.8);
        F.debris(c, 240, 0, t - T_HIT, 0.35, 10, 5, 1e9, P.slate);
      }
      return;
    }
    // — sàn xiên: bolter
    if (t >= 155.0 && t < 168.7) {
      // chu kỳ bay vòng của chiếc thứ nhất (bolter): vào 155.0, lượn đi, quay lại gần 168
      const dur = 10.4;
      const u0 = BOLT_TD - (TD2 - 155.0) * (215 / BOLT.len);
      const u = u0 + (t - 155.0) * (215 / BOLT.len) * (t < TD2 ? 1 : 1.0);
      if (u > 0 && u < 1) {
        const [x, y, ang] = BOLT.at(u);
        const onDeck = u > BOLT_TD && u < 0.42;
        S.jetTop(c, x, y, 1.0, { hero: true, ang, flame: u > BOLT_TD ? 0.9 : 0 });
        // hook trượt qua dây: chấm nhỏ báo "hụt"
        if (u > BOLT_TD && u < BOLT_TD + 0.05) F.sparks(c, x - 40, y, (u - BOLT_TD) / 0.05, 0.6, Math.PI, 1.2, 4);
        void onDeck; void dur;
      }
      // vệt đi tiếp phía ngoài mạn trái
      if (t > TD2 + 1.8) S.dashPath(c, BOLT.pts.slice(Math.floor(BOLT.pts.length * 0.38), Math.floor(BOLT.pts.length * 0.8)), 1, 'rgba(245,158,11,0.55)', 4, [14, 12]);
    }
    // — phóng ở mũi
    if (t >= T_LAUNCH - 0.6 && t < T_LAUNCH + 4.0) {
      const u = A.clamp01((t - T_LAUNCH) / 1.7);
      const x = 190 + 280 * u * u + (t > T_LAUNCH + 1.7 ? 300 * (t - T_LAUNCH - 1.7) : 0);
      const a = A.sm(t, T_LAUNCH - 0.6, T_LAUNCH - 0.2);
      const y = -14 - (t > T_LAUNCH + 1.7 ? 10 * (t - T_LAUNCH - 1.7) : 0);
      S.jetTop(c, x, y, 1.0, { flame: u > 0 ? 0.9 : 0, a });
    }
    // — hạ cánh cùng lúc, bắt dây ba
    if (t >= TD3 - 1.6 && t < TD3 + 2.4) {
      const dist = LAND.len;
      let x: number, y: number, ang: number;
      if (t < TD3) { [x, y, ang] = LAND.at(0.62 - (TD3 - t) * 215 / dist); }
      else {
        const uu = A.clamp01((t - TD3) / 1.9), e = 1 - (1 - uu) * (1 - uu);
        [x, y, ang] = LAND.at(0.62 + 0.38 * e * 0.55);
      }
      if (t >= TD3 - 1.6) S.jetTop(c, x, y, 1.0, { ang, a: A.sm(t, TD3 - 1.6, TD3 - 1.2) * (1 - A.sm(t, TD3 + 1.6, TD3 + 2.4)), flame: 0.5 });
    }
  }
}
