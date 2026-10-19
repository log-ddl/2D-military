// Helper dùng chung giữa các chương (không phải kit).
import * as A from './shared/art';
import * as R from './shared/rig';
import { P } from './shared/palette';
import * as S from './_assets';

type Ctx = CanvasRenderingContext2D;

/** Giây tuyệt đối → tiến độ trong [a,b] (alias ngắn). */
export const p = A.ph;

/** Khói xả nhỏ phía sau xe (x,y là ống xả). */
export function exhaust(c: Ctx, x: number, y: number, t: number, dir: 1 | -1 = 1, s = 1, rate = 3) {
  for (let i = 0; i < 4; i++) {
    const age = ((t * rate + i / 4) % 1);
    A.circle(c, x - dir * age * 70 * s, y - age * 40 * s, (6 + age * 14) * s, `rgba(100,116,139,${0.38 * (1 - age)})`, null, 0);
  }
}

/** Lính ngang đứng/đi, chân đặt ở (x,y). s ~ 1 → cao ~100. */
export function soldier(c: Ctx, x: number, y: number, s = 1, op: { dir?: 1 | -1; walk?: number; skin?: 'ally' | 'foe' | 'civil'; aim?: number; weapon?: 'rifle' | 'tube' | null; lie?: 'prone' | 'dead'; alpha?: number } = {}) {
  return R.rig(c, { x, y, s, dir: op.dir ?? 1, walk: op.walk, aim: op.aim, skin: op.skin ?? 'ally', weapon: op.weapon, lie: op.lie, alpha: op.alpha } as R.RigOpts);
}

/** Doanh trại: hai lều + cờ + vạch chỉ vị trí (nhìn ngang). Gốc: chạm đất, giữa. */
export function camp(c: Ctx, x: number, gy: number, s = 1, a = 1) {
  S.at(c, x, gy, s, 1, () => {
    const l = A.px(c, 3.4), li = A.px(c, 2);
    A.poly(c, [[-170, 0], [-110, -78], [-50, 0]], P.sand, S.INK, l);
    A.poly(c, [[-20, 0], [40, -96], [100, 0]], P.sand, S.INK, l);
    A.line(c, [[40, -96], [40, -150]], S.INK, l);
    A.poly(c, [[40, -150], [84, -138], [40, -124]], P.olive, S.INK, li);
    S.crate(c, 130, 0, 1, 'ammo'); S.crate(c, 168, 0, 1, 'cargo');
  }, a);
}

/** Đường kích thước nằm ngang (SIDE/TOP) với hai đầu chặn. */
export function dimLine(c: Ctx, x0: number, x1: number, y: number, p: number, color = S.INK, w = 4) {
  if (p <= 0) return;
  const xe = A.lerp(x0, x1, p);
  A.line(c, [[x0, y], [xe, y]], color, A.px(c, w));
  A.line(c, [[x0, y - 14], [x0, y + 14]], color, A.px(c, w));
  if (p >= 1) A.line(c, [[x1, y - 14], [x1, y + 14]], color, A.px(c, w));
  // đầu mũi tên
  const hs = 18;
  A.poly(c, [[xe, y], [xe - hs, y - hs * 0.55], [xe - hs, y + hs * 0.55]], color, null, 0);
}

/** Vòng nhấn quanh vật đang theo dõi (trong thế giới). */
export function track(c: Ctx, x: number, y: number, r: number, a = 1, color: string = P.amber) {
  A.withA(c, a, () => {
    c.save();
    c.strokeStyle = color; c.lineWidth = A.px(c, 5); c.setLineDash([14, 10]);
    c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.stroke();
    c.restore();
  });
}

/** Sóng biển nhìn ngang (đường lượn), trong camera. */
export function sea(c: Ctx, x0: number, x1: number, y: number, t: number, depth = 400, col = '#cfe3ee') {
  c.fillStyle = col;
  c.beginPath(); c.moveTo(x0, y + depth);
  for (let x = x0; x <= x1; x += 30) c.lineTo(x, y + Math.sin(x / 90 + t * 1.4) * 5);
  c.lineTo(x1, y + depth); c.closePath(); c.fill();
  A.line(c, (() => { const pts: [number, number][] = []; for (let x = x0; x <= x1; x += 30) pts.push([x, y + Math.sin(x / 90 + t * 1.4) * 5]); return pts; })(), '#7fb3cf', A.px(c, 3));
}

export const F = (a: number, b: number, t: number) => A.ph(t, a, b);
