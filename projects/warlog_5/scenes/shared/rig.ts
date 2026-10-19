// kit/rig.ts — người lính tối giản, đúng kiểu testvideo2:
// hai chân = hai nét thẳng, tay = một nét, thân = khối bo góc, đầu tròn + mũ nửa vòm, súng = một nét.
// Không khớp gối/khuỷu, không chi tiết. Đơn vị: người cao ~100, gốc ở chân. s = hệ số phóng.
import { C, type Pt, withA, line, poly, rrect, circle } from './art';

export interface Skin { body: string; limb: string; hat: boolean }
export const SKINS = {
  ally: { body: C.ally, limb: C.allyD, hat: true },
  foe: { body: C.foe, limb: C.foeD, hat: true },
  civil: { body: '#5b8ac9', limb: '#3f679e', hat: false },
} satisfies Record<string, Skin>;

export type Weapon = 'rifle' | 'tube' | null;

export interface RigOpts {
  x: number;
  y: number; // mặt đất
  s?: number;
  dir?: 1 | -1; // 1 = nhìn sang phải
  skin?: Skin | keyof typeof SKINS;
  /** Đi: pha bước (vd. lt * 8). Bỏ trống = đứng yên. */
  walk?: number;
  /** Nằm sấp bắn (prone) hoặc ngã chết (dead). */
  lie?: 'prone' | 'dead' | null;
  /** Góc tay + súng: 0 = ngang, + = chếch lên (radian). */
  aim?: number;
  /** Mặc định 'rifle'. */
  weapon?: Weapon;
  alpha?: number;
}

export interface Sockets {
  head: Pt;
  hand: Pt;
  /** Miệng nòng và hướng bắn (toạ độ người gọi) khi có vũ khí. */
  muzzle?: Pt;
  muzzleAng?: number;
  /** Hộp bao (toạ độ người gọi) cho camera.fit. */
  box: { x: number; y: number; w: number; h: number };
}

const SH: Pt = [0, -61]; // vai

/** Vẽ một người lính, trả điểm gắn ở toạ độ người gọi. */
export function rig(c: CanvasRenderingContext2D, o: RigOpts): Sockets {
  const s = o.s ?? 1, dir = o.dir ?? 1;
  const sk: Skin = typeof o.skin === 'string' ? SKINS[o.skin] : o.skin ?? SKINS.ally;
  const wp: Weapon = o.lie === 'dead' ? null : o.weapon === undefined ? 'rifle' : o.weapon;
  // Nằm: xoay cả người 90° quanh chân, nhấc lên nửa bề dày thân để nằm sát đất.
  const rot = o.lie === 'prone' ? Math.PI / 2 : o.lie === 'dead' ? -Math.PI / 2 : 0;
  // Nằm sấp thì tay súng vẫn hướng ra trước (bù lại góc xoay).
  const arm = (o.aim ?? 0) + (o.lie === 'prone' ? Math.PI / 2 : 0);
  const sw = o.walk === undefined || o.lie ? 0 : Math.sin(o.walk) * 14;
  const reach = 12;

  withA(c, o.alpha ?? 1, () => {
    c.save();
    c.translate(o.x, o.y);
    c.scale(dir * s, s);
    if (rot) { c.translate(0, -11); c.rotate(rot); }
    line(c, [[0, -34], [-sw, 0]], sk.limb, 7);
    line(c, [[0, -34], [sw, 0]], sk.limb, 7);
    rrect(c, -11, -76, 22, 46, 8, sk.body, C.ink, 2.5);
    circle(c, 0, -88, 10, C.skin, C.ink, 2.5);
    if (sk.hat) {
      c.beginPath(); c.arc(0, -90, 11, Math.PI, 0); c.closePath();
      c.fillStyle = sk.limb; c.fill(); c.strokeStyle = C.ink; c.lineWidth = 2.5; c.stroke();
    }
    c.save(); c.translate(SH[0], SH[1]); c.rotate(-arm);
    if (wp === 'rifle') line(c, [[6, -1], [34, -3]], C.steelDark, 6);
    if (wp === 'tube') {
      line(c, [[-30, -9], [40, -17]], C.steelDark, 7);
      poly(c, [[40, -23], [58, -17], [40, -11]], C.red, C.ink, 2);
    }
    line(c, [[0, 1], [reach, -1]], sk.limb, 6);
    c.restore();
    c.restore();
  });

  // Điểm gắn: cùng phép biến đổi với lúc vẽ.
  const T = (q: Pt): Pt => {
    let [x, y] = q;
    if (rot) { const cs = Math.cos(rot), sn = Math.sin(rot); [x, y] = [x * cs - y * sn, x * sn + y * cs - 11]; }
    return [o.x + dir * s * x, o.y + s * y];
  };
  const inArm = (q: Pt): Pt => {
    const cs = Math.cos(-arm), sn = Math.sin(-arm);
    return [SH[0] + q[0] * cs - q[1] * sn, SH[1] + q[0] * sn + q[1] * cs];
  };
  const so: Sockets = { head: T([0, -88]), hand: T(inArm([reach, -1])), box: { x: 0, y: 0, w: 0, h: 0 } };
  if (wp) {
    so.muzzle = T(inArm(wp === 'tube' ? [58, -17] : [34, -3]));
    const a = rot - arm;
    so.muzzleAng = dir > 0 ? a : Math.PI - a;
  }
  const pts = [T([-14, -101]), T([14, -101]), T([-14, 2]), T([14, 2]), ...(so.muzzle ? [so.muzzle] : [])];
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  so.box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return so;
}
