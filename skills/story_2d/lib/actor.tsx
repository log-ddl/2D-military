// Khung giải phẫu nhân vật 2.5D cơ bản (`@skill/story_2d/actor`):
// Chỉ cung cấp phôi hình học nền tảng (dáng đầu, vóc người, ngũ quan cơ bản, nhép miệng, tay/chân động học dài hoặc cộc, ánh sáng 2.5D và các khe lắp ghép SVG).
// KHÔNG chứa nhân vật cụ thể hay tủ quần áo đóng sẵn — mỗi dự án tự định hình nhân vật và tự sáng tạo trang phục theo bối cảnh từng cảnh.
import React, { useId } from 'react';
import { mix, rnd } from '@core/time';
import { BRUSH_FONT, S, STROKE } from './theme';
import type { Pt } from './stage';

export type ActorMood =
  | 'neutral'
  | 'happy'
  | 'laugh'
  | 'worried'
  | 'shocked'
  | 'angry'
  | 'suspicious'
  | 'sleepy'
  | 'sleep'
  | 'deadpan'
  | 'wink'
  | 'smug'
  | 'sad'
  | 'silhouette';

export type HeadShape =
  | 'round'   // đầu elip tròn hoạt hình tối giản
  | 'oval'    // khuôn mặt thuôn cân đối có cằm rõ
  | 'square'  // gò má & xương hàm vuông góc cạnh
  | 'jowls'   // thái dương gọn, má dưới đầy + hàm cằm dày
  | 'wide'    // mặt bầu rộng ngang
  | 'narrow'; // trán cao rộng, thu gọn dần xuống cằm nhỏ

export type BodyBuild = 'slim' | 'regular' | 'broad' | 'heavy';

export type EyeStyle = 'dot' | 'almond' | 'squint' | 'hooded';
export type BrowStyle = 'arch' | 'bushy' | 'flat' | 'thin';
export type NoseStyle = 'none' | 'button' | 'straight' | 'bulbous' | 'pointed' | 'hooked';
export type MouthStyle = 'default' | 'pursed' | 'smirk' | 'stern' | 'warm' | 'grin';
export type FacialHairStyle = 'none' | 'stubble' | 'mustache' | 'goatee' | 'beard' | 'full-beard';

export type HairStyle =
  | 'none'
  | 'short'
  | 'parted'
  | 'tousled'
  | 'slick'
  | 'curly'
  | 'receding'
  | 'balding'
  | 'bob'
  | 'long'
  | 'ponytail'
  | 'bun'
  | 'spiky';

export type GlassesStyle = 'none' | 'rect' | 'round' | 'sunglasses';

/** Phôi cổ & thân cơ bản — chỉ định hình đường cắt hõm cổ/vai, chi tiết áo vẽ qua `bodyClipSlot` / `bodySlot`. */
export type TorsoStyle =
  | 'plain'      // thân trơn nguyên khối (tự vẽ toàn bộ cổ/áo qua `bodyClipSlot`)
  | 'crew'       // hõm da cổ tròn cơ bản (mặc định)
  | 'vneck'      // hõm da cổ chữ V cơ bản
  | 'tank'       // khoét cổ chữ U + lộ hai bả vai màu da
  | 'open'       // khoác mở hai bên lộ lớp lót `accentColor` ở giữa
  | 'silhouette';

export type SleeveStyle = 'long' | 'short' | 'sleeveless' | 'stick';
export type BottomStyle = 'pants' | 'shorts' | 'skirt' | 'stick';
export type ShoeStyle = 'dress' | 'sneakers' | 'sandals' | 'bare';

export type ArmPose = 'rest' | 'hip' | 'wave' | 'point-side' | 'point-up' | 'hold-front' | 'overhead' | 'chin';

export type Actor2DProps = {
  /** Toạ độ bàn chân đứng (hoặc tâm hông nếu `seated` / `bust`). */
  x: number;
  y: number;
  /** Hệ số phóng (`s = 1` cao `~298px`; cận cảnh `s = 2.2..4.0`). */
  s?: number;
  /** Hướng mặt chính: `1` = nhìn hơi sang phải, `-1` = nhìn sang trái. */
  flip?: 1 | -1;
  t?: number;
  seed?: number;
  skin?: string;
  mood?: ActorMood;
  /** Hướng liếc con ngươi `[-1..1, -1..1]`. */
  look?: readonly [number, number];
  /** Nhép miệng: `boolean`, độ mở `0..1`, hoặc danh sách khoảng giây `[from, to][]` nhân vật đang nói. */
  talk?: boolean | number | readonly (readonly [number, number])[];

  // --- Phôi giải phẫu đầu & mặt cơ bản ---
  headShape?: HeadShape;
  build?: BodyBuild;
  ears?: boolean;
  eyeStyle?: EyeStyle;
  /** Khoảng cách nửa mắt tính từ trục giữa mặt (mặc định `20`). */
  eyeSpacing?: number;
  eyeBags?: boolean;
  browStyle?: BrowStyle;
  browColor?: string;
  nose?: NoseStyle;
  mouthStyle?: MouthStyle;
  facialHair?: FacialHairStyle;
  facialHairColor?: string;
  nasolabial?: boolean;
  foreheadLines?: boolean;
  doubleChin?: boolean;

  hair?: HairStyle;
  hairColor?: string;
  glasses?: GlassesStyle;

  // --- Phôi thân / tay / chân cơ bản (chỉ định hình phom, không đóng sẵn quần áo mẫu) ---
  torso?: TorsoStyle;
  bodyColor?: string;
  accentColor?: string;
  sleeves?: SleeveStyle;
  sleeveColor?: string;
  bottom?: BottomStyle;
  pantsColor?: string;
  shoes?: ShoeStyle;
  shoesColor?: string;

  /** Tư thế tay trái/phải theo preset hoặc truyền toạ độ đích thế giới `[wx, wy]` để cầm/chạm vật thể. */
  leftArm?: ArmPose;
  rightArm?: ArmPose;
  leftHandTo?: Pt;
  rightHandTo?: Pt;
  /** Ngồi bàn (ẩn chân) / chỉ vẽ nửa thân trên (`bust`). */
  seated?: boolean;
  bust?: boolean;
  /** Chu kỳ bước đi (vd `t * 7`). */
  walk?: number;

  /** Hướng nguồn sáng chiếu vào nhân vật để vẽ vành Rim Light 2.5D. */
  lightSide?: 'left' | 'right' | 'top' | 'none';
  rimColor?: string;
  rimStrength?: number;

  /** Phụ kiện trạng thái biểu cảm tức thì. */
  sweat?: boolean;
  zzz?: boolean;
  blush?: boolean;
  /** Độ nghiêng thân người (độ, xoay quanh hông: dương = chồm sang phải, âm = ngả sang trái). */
  lean?: number;

  // --- 5 Khe lắp ghép SVG tự do theo đúng thứ tự lớp Z-order ---
  /** Gốc `(0, 0)` tại tâm mặt (scale `s`), nằm trên da mặt & dưới kính/tóc (vẽ nếp mặt, quầng mắt, vết sẹo, râu riêng). */
  faceSlot?: React.ReactNode;
  /** Gốc `(0, 0)` tại tâm đầu (scale `s`) — vẽ mái tóc đặc trưng hoặc mũ nón riêng cho kịch bản. */
  hairSlot?: React.ReactNode;
  /**
   * Gốc `(0, 0)` tại đỉnh thân `(x, bodyTop)` (scale `s`), tự động cắt khít trong đường cong thân người (`bodyClip`) và nằm dưới viền mực ngoài `STROKE.outer`.
   * Vùng hiển thị lộ dưới cằm: `x: -55..55` (`broad`/`heavy`: `-70..70`), `y = 32` (ngay dưới cằm) → `y = 128` (gấu áo tại hông).
   * Dùng để tự vẽ cổ áo, ve áo, cà vạt, khoá kéo, túi áo, thắt lưng, hoạ tiết trang phục riêng theo từng cảnh.
   */
  bodyClipSlot?: React.ReactNode;
  /** Gốc `(0, 0)` tại đỉnh thân `(x, bodyTop)` (scale `s`), KHÔNG cắt clip — vẽ chi tiết tràn khỏi thân (áo choàng, khăn bay, dây đeo…). */
  bodySlot?: React.ReactNode;
  /** Gốc `(0, 0)` tại tâm đầu (scale `s`), lớp trên cùng (tai nghe, phụ kiện cầm/đội đặc biệt…). */
  accessory?: React.ReactNode;
  opacity?: number;
};

function getBuildDims(build: BodyBuild = 'regular') {
  switch (build) {
    case 'slim':
      return { bodyW: 96, bodyH: 128, shoulderX: 37 };
    case 'broad':
      return { bodyW: 138, bodyH: 132, shoulderX: 52 };
    case 'heavy':
      return { bodyW: 152, bodyH: 134, shoulderX: 56 };
    case 'regular':
    default:
      return { bodyW: 110, bodyH: 128, shoulderX: 42 };
  }
}

function getHeadGeometry(hx: number, hy: number, s: number, shape: HeadShape) {
  const u = s;
  const f = (n: number) => n.toFixed(1);
  switch (shape) {
    case 'oval': {
      const d = `M ${f(hx)} ${f(hy - 60 * u)}
        C ${f(hx + 38 * u)} ${f(hy - 60 * u)}, ${f(hx + 60 * u)} ${f(hy - 36 * u)}, ${f(hx + 60 * u)} ${f(hy - 4 * u)}
        C ${f(hx + 60 * u)} ${f(hy + 26 * u)}, ${f(hx + 40 * u)} ${f(hy + 58 * u)}, ${f(hx)} ${f(hy + 60 * u)}
        C ${f(hx - 40 * u)} ${f(hy + 58 * u)}, ${f(hx - 60 * u)} ${f(hy + 26 * u)}, ${f(hx - 60 * u)} ${f(hy - 4 * u)}
        C ${f(hx - 60 * u)} ${f(hy - 36 * u)}, ${f(hx - 38 * u)} ${f(hy - 60 * u)}, ${f(hx)} ${f(hy - 60 * u)} Z`;
      return { d, rx: 60 * u, ry: 60 * u, earX: 59 * u, chinY: hy + 60 * u };
    }
    case 'square': {
      const d = `M ${f(hx)} ${f(hy - 60 * u)}
        C ${f(hx + 40 * u)} ${f(hy - 60 * u)}, ${f(hx + 63 * u)} ${f(hy - 38 * u)}, ${f(hx + 63 * u)} ${f(hy - 4 * u)}
        C ${f(hx + 63 * u)} ${f(hy + 16 * u)}, ${f(hx + 60 * u)} ${f(hy + 33 * u)}, ${f(hx + 51 * u)} ${f(hy + 44 * u)}
        C ${f(hx + 40 * u)} ${f(hy + 57 * u)}, ${f(hx + 22 * u)} ${f(hy + 60 * u)}, ${f(hx)} ${f(hy + 60 * u)}
        C ${f(hx - 22 * u)} ${f(hy + 60 * u)}, ${f(hx - 40 * u)} ${f(hy + 57 * u)}, ${f(hx - 51 * u)} ${f(hy + 44 * u)}
        C ${f(hx - 60 * u)} ${f(hy + 33 * u)}, ${f(hx - 63 * u)} ${f(hy + 16 * u)}, ${f(hx - 63 * u)} ${f(hy - 4 * u)}
        C ${f(hx - 63 * u)} ${f(hy - 38 * u)}, ${f(hx - 40 * u)} ${f(hy - 60 * u)}, ${f(hx)} ${f(hy - 60 * u)} Z`;
      return { d, rx: 63 * u, ry: 60 * u, earX: 62 * u, chinY: hy + 60 * u };
    }
    case 'jowls': {
      const d = `M ${f(hx)} ${f(hy - 59 * u)}
        C ${f(hx + 36 * u)} ${f(hy - 59 * u)}, ${f(hx + 58 * u)} ${f(hy - 38 * u)}, ${f(hx + 59 * u)} ${f(hy - 10 * u)}
        C ${f(hx + 60 * u)} ${f(hy + 6 * u)}, ${f(hx + 70 * u)} ${f(hy + 18 * u)}, ${f(hx + 66 * u)} ${f(hy + 36 * u)}
        C ${f(hx + 62 * u)} ${f(hy + 54 * u)}, ${f(hx + 36 * u)} ${f(hy + 62 * u)}, ${f(hx)} ${f(hy + 62 * u)}
        C ${f(hx - 36 * u)} ${f(hy + 62 * u)}, ${f(hx - 62 * u)} ${f(hy + 54 * u)}, ${f(hx - 66 * u)} ${f(hy + 36 * u)}
        C ${f(hx - 70 * u)} ${f(hy + 18 * u)}, ${f(hx - 60 * u)} ${f(hy + 6 * u)}, ${f(hx - 59 * u)} ${f(hy - 10 * u)}
        C ${f(hx - 58 * u)} ${f(hy - 38 * u)}, ${f(hx - 36 * u)} ${f(hy - 59 * u)}, ${f(hx)} ${f(hy - 59 * u)} Z`;
      return { d, rx: 64 * u, ry: 61 * u, earX: 60 * u, chinY: hy + 62 * u };
    }
    case 'wide': {
      const d = `M ${f(hx)} ${f(hy - 59 * u)}
        C ${f(hx + 44 * u)} ${f(hy - 59 * u)}, ${f(hx + 67 * u)} ${f(hy - 36 * u)}, ${f(hx + 70 * u)} ${f(hy - 4 * u)}
        C ${f(hx + 73 * u)} ${f(hy + 22 * u)}, ${f(hx + 68 * u)} ${f(hy + 46 * u)}, ${f(hx + 46 * u)} ${f(hy + 56 * u)}
        C ${f(hx + 28 * u)} ${f(hy + 62 * u)}, ${f(hx - 28 * u)} ${f(hy + 62 * u)}, ${f(hx - 46 * u)} ${f(hy + 56 * u)}
        C ${f(hx - 68 * u)} ${f(hy + 46 * u)}, ${f(hx - 73 * u)} ${f(hy + 22 * u)}, ${f(hx - 70 * u)} ${f(hy - 4 * u)}
        C ${f(hx - 67 * u)} ${f(hy - 36 * u)}, ${f(hx - 44 * u)} ${f(hy - 59 * u)}, ${f(hx)} ${f(hy - 59 * u)} Z`;
      return { d, rx: 70 * u, ry: 61 * u, earX: 69 * u, chinY: hy + 61 * u };
    }
    case 'narrow': {
      const d = `M ${f(hx)} ${f(hy - 63 * u)}
        C ${f(hx + 39 * u)} ${f(hy - 63 * u)}, ${f(hx + 61 * u)} ${f(hy - 38 * u)}, ${f(hx + 61 * u)} ${f(hy - 5 * u)}
        C ${f(hx + 61 * u)} ${f(hy + 13 * u)}, ${f(hx + 44 * u)} ${f(hy + 33 * u)}, ${f(hx + 31 * u)} ${f(hy + 48 * u)}
        C ${f(hx + 21 * u)} ${f(hy + 58 * u)}, ${f(hx + 11 * u)} ${f(hy + 60 * u)}, ${f(hx)} ${f(hy + 60 * u)}
        C ${f(hx - 11 * u)} ${f(hy + 60 * u)}, ${f(hx - 21 * u)} ${f(hy + 58 * u)}, ${f(hx - 31 * u)} ${f(hy + 48 * u)}
        C ${f(hx - 44 * u)} ${f(hy + 33 * u)}, ${f(hx - 61 * u)} ${f(hy + 13 * u)}, ${f(hx - 61 * u)} ${f(hy - 5 * u)}
        C ${f(hx - 61 * u)} ${f(hy - 38 * u)}, ${f(hx - 39 * u)} ${f(hy - 63 * u)}, ${f(hx)} ${f(hy - 63 * u)} Z`;
      return { d, rx: 61 * u, ry: 61 * u, earX: 60 * u, chinY: hy + 60 * u };
    }
    case 'round':
    default: {
      const rx = 66 * u;
      const ry = 58 * u;
      const d = `M ${f(hx - rx)} ${f(hy)}
        a ${f(rx)} ${f(ry)} 0 1 0 ${f(rx * 2)} 0
        a ${f(rx)} ${f(ry)} 0 1 0 ${f(-rx * 2)} 0 Z`;
      return { d, rx, ry, earX: 65 * u, chinY: hy + ry };
    }
  }
}

function resolveArmOffset(pose: ArmPose, side: -1 | 1, t: number): [number, number] {
  const waveWobble = Math.sin(t * 9) * 14;
  switch (pose) {
    case 'hip':
      return [side * 58, 38];
    case 'wave':
      return [side * (88 + waveWobble * 0.4), -86 + waveWobble];
    case 'point-side':
      return [side * 124, -18];
    case 'point-up':
      return [side * 78, -118];
    case 'hold-front':
      return [side * 54, 6];
    case 'overhead':
      return [side * 68, -142];
    case 'chin':
      return [side * 24, -44];
    case 'rest':
    default:
      return [side * 56, 68];
  }
}

export type ActorSocketMap = {
  head: [number, number];
  top: [number, number];
  mouth: [number, number];
  chest: [number, number];
  leftHand: [number, number];
  rightHand: [number, number];
  box: { x: number; y: number; w: number; h: number };
};

/** Tính trước toạ độ thế giới của đầu, miệng, ngực và 2 bàn tay để gắn đạo cụ / bóng thoại / `fitBox`. */
export function actorSockets(p: Actor2DProps): ActorSocketMap {
  const s = p.s ?? 1;
  const dir = p.flip ?? 1;
  const t = p.t ?? 0;
  const dims = getBuildDims(p.build);
  const legH = p.seated || p.bust ? 0 : 72 * s;
  const bob = p.walk ? Math.abs(Math.sin(p.walk * 2)) * 6 * s : 0;

  const hipY = p.y - legH - bob;
  const shoulderY = hipY - 96 * s;
  const headX = p.x;
  const headY = hipY - 156 * s;

  const lShoulder: [number, number] = [p.x - dims.shoulderX * s * dir, shoulderY];
  const rShoulder: [number, number] = [p.x + dims.shoulderX * s * dir, shoulderY];

  const lo = resolveArmOffset(p.leftArm ?? 'rest', -1, t);
  const ro = resolveArmOffset(p.rightArm ?? 'rest', 1, t);

  const leftHand: [number, number] = p.leftHandTo
    ? [p.leftHandTo[0], p.leftHandTo[1]]
    : [lShoulder[0] + lo[0] * s * dir, lShoulder[1] + lo[1] * s];
  const rightHand: [number, number] = p.rightHandTo
    ? [p.rightHandTo[0], p.rightHandTo[1]]
    : [rShoulder[0] + ro[0] * s * dir, rShoulder[1] + ro[1] * s];

  const totalH = (p.seated || p.bust ? 228 : 298) * s;
  const halfW = Math.max(95, dims.bodyW * 0.78) * s;
  const mouthOffsetY = p.nose && p.nose !== 'none' ? 30 * s : 24 * s;
  return {
    head: [headX, headY],
    top: [headX, headY - 72 * s],
    mouth: [headX + 8 * s * dir, headY + mouthOffsetY],
    chest: [p.x, hipY - 68 * s],
    leftHand,
    rightHand,
    box: { x: p.x - halfW, y: p.y - totalH, w: halfW * 2, h: totalH },
  };
}

function resolveTalkAmount(talk: Actor2DProps['talk'], t: number): number {
  if (!talk) return 0;
  if (typeof talk === 'number') return Math.max(0, Math.min(1, talk));
  if (talk === true) return 0.35 + 0.65 * Math.abs(Math.sin(t * 19));
  for (const [a, b] of talk) {
    if (t >= a && t <= b) {
      return 0.3 + 0.7 * Math.abs(Math.sin((t - a) * 20) * Math.cos((t - a) * 7.5));
    }
  }
  return 0;
}

function ActorArm({
  shoulder,
  hand,
  bendDir,
  s,
  skin,
  sleeveColor,
  sleeveMode,
  silhouette,
}: {
  shoulder: [number, number];
  hand: [number, number];
  bendDir: number;
  s: number;
  skin: string;
  sleeveColor: string;
  sleeveMode: SleeveStyle;
  silhouette: boolean;
}) {
  const mx = (shoulder[0] + hand[0]) / 2;
  const my = (shoulder[1] + hand[1]) / 2;
  const dx = hand[0] - shoulder[0];
  const dy = hand[1] - shoulder[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * 22 * s * bendDir;
  const ny = (dx / len) * 22 * s * bendDir;
  const cx = mx + nx;
  const cy = my + ny;

  const ang = Math.atan2(hand[1] - cy, hand[0] - cx);
  const fLen = 13.5 * s;
  const armD = `M ${shoulder[0].toFixed(1)} ${shoulder[1].toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${hand[0].toFixed(1)} ${hand[1].toFixed(1)}`;

  // Chia De Casteljau tại u = 0.40 cho ống tay cộc (short) bám đúng độ cong bắp tay
  const u = 0.4;
  const q0x = shoulder[0] + (cx - shoulder[0]) * u;
  const q0y = shoulder[1] + (cy - shoulder[1]) * u;
  const q1x = cx + (hand[0] - cx) * u;
  const q1y = cy + (hand[1] - cy) * u;
  const sxEnd = q0x + (q1x - q0x) * u;
  const syEnd = q0y + (q1y - q0y) * u;
  const sAng = Math.atan2(q1y - q0y, q1x - q0x);
  const px = -Math.sin(sAng);
  const py = Math.cos(sAng);
  const shortD = `M ${shoulder[0].toFixed(1)} ${shoulder[1].toFixed(1)} Q ${q0x.toFixed(1)} ${q0y.toFixed(1)} ${sxEnd.toFixed(1)} ${syEnd.toFixed(1)}`;

  return (
    <g>
      {silhouette || sleeveMode === 'stick' ? (
        <path d={armD} fill="none" stroke={S.ink} strokeWidth={STROKE.limb * s} strokeLinecap="round" />
      ) : sleeveMode === 'sleeveless' ? (
        <>
          <path d={armD} fill="none" stroke={S.ink} strokeWidth={15.5 * s} strokeLinecap="round" />
          <path d={armD} fill="none" stroke={skin} strokeWidth={8.2 * s} strokeLinecap="round" />
        </>
      ) : sleeveMode === 'short' ? (
        <>
          <path d={armD} fill="none" stroke={S.ink} strokeWidth={15 * s} strokeLinecap="round" />
          <path d={armD} fill="none" stroke={skin} strokeWidth={8 * s} strokeLinecap="round" />
          <circle cx={shoulder[0]} cy={shoulder[1]} r={10.25 * s} fill={S.ink} />
          <path d={shortD} fill="none" stroke={S.ink} strokeWidth={20.5 * s} strokeLinecap="butt" />
          <line
            x1={sxEnd - px * 8.6 * s}
            y1={syEnd - py * 8.6 * s}
            x2={sxEnd + px * 8.6 * s}
            y2={syEnd + py * 8.6 * s}
            stroke={S.ink}
            strokeWidth={3.6 * s}
            strokeLinecap="round"
          />
          <circle cx={shoulder[0]} cy={shoulder[1]} r={6.5 * s} fill={sleeveColor} />
          <path d={shortD} fill="none" stroke={sleeveColor} strokeWidth={13 * s} strokeLinecap="butt" />
        </>
      ) : (
        <>
          <path d={armD} fill="none" stroke={S.ink} strokeWidth={16 * s} strokeLinecap="round" />
          <path d={armD} fill="none" stroke={sleeveColor} strokeWidth={8.5 * s} strokeLinecap="round" />
        </>
      )}

      {[-0.46, 0, 0.46].map((a, i) => (
        <line
          key={i}
          x1={hand[0]}
          y1={hand[1]}
          x2={hand[0] + Math.cos(ang + a) * fLen}
          y2={hand[1] + Math.sin(ang + a) * fLen}
          stroke={silhouette ? S.silhouette : S.ink}
          strokeWidth={4.8 * s}
          strokeLinecap="round"
        />
      ))}
      <circle
        cx={hand[0]}
        cy={hand[1]}
        r={(sleeveMode !== 'stick' ? 7.2 : 5.5) * s}
        fill={silhouette ? S.silhouette : skin}
        stroke={S.ink}
        strokeWidth={2.8 * s}
      />
    </g>
  );
}

/** Khung giải phẫu nhân vật hoạt hình 2.5D cơ bản — lắp mặt trong `cast`, tự sáng tạo trang phục theo từng cảnh. */
export const Actor2D: React.FC<Actor2DProps> = (props) => {
  const {
    x,
    y,
    s = 1,
    flip = 1,
    t = 0,
    seed = 1,
    skin = S.skin2,
    mood = 'neutral',
    look = [0, 0],
    talk,
    headShape = 'round',
    build = 'regular',
    ears,
    eyeStyle = 'dot',
    eyeSpacing = 20,
    eyeBags = false,
    browStyle = 'arch',
    browColor,
    nose = 'none',
    mouthStyle = 'default',
    facialHair = 'none',
    facialHairColor,
    nasolabial = false,
    foreheadLines = false,
    doubleChin = false,
    hair = 'short',
    hairColor,
    glasses = 'none',
    torso = 'crew',
    bodyColor = '#334155',
    accentColor,
    sleeves,
    sleeveColor,
    bottom,
    pantsColor,
    shoes,
    shoesColor,
    seated = false,
    bust = false,
    walk = 0,
    lightSide = 'right',
    rimColor = '#FFE082',
    rimStrength = 0.82,
    sweat = false,
    zzz = false,
    blush = false,
    lean = 0,
    faceSlot,
    hairSlot,
    bodyClipSlot,
    bodySlot,
    accessory,
    opacity = 1,
  } = props;

  const uid = useId().replace(/:/g, '');
  const isSil = mood === 'silhouette' || torso === 'silhouette';
  const sock = actorSockets(props);
  const dims = getBuildDims(build);
  const legH = seated || bust ? 0 : 72 * s;
  const bob = walk ? Math.abs(Math.sin(walk * 2)) * 6 * s : 0;
  const hipY = y - legH - bob;
  const [hx, hy] = sock.head;

  const showEars = ears ?? headShape !== 'round';
  const sleeveMode: SleeveStyle = sleeves ?? (torso === 'tank' ? 'sleeveless' : 'long');
  const bottomMode: BottomStyle = bottom ?? (sleeveMode === 'stick' ? 'stick' : 'pants');
  const shoeMode: ShoeStyle = shoes ?? (bottomMode === 'shorts' ? 'sneakers' : 'dress');

  // Chớp mắt tự nhiên tất định theo `t` + `seed`
  const blinkPhase = (t + rnd(seed * 31) * 4.7) % 4.3;
  const isBlinking =
    !isSil && mood !== 'sleepy' && mood !== 'sleep' && mood !== 'happy' && mood !== 'laugh' && blinkPhase > 4.14;
  const talkAmt = resolveTalkAmount(talk, t);

  const resolvedSkin = isSil ? S.silhouette : skin;
  const skinShadow = isSil ? '#05070A' : mix(skin, '#2A140B', 0.28);
  const skinHi = isSil ? '#1B2432' : mix(skin, '#FFFDF5', 0.28);
  const creaseCol = mix(resolvedSkin, S.ink, 0.56);

  const resolvedBody = isSil ? S.silhouette : bodyColor;
  const resolvedSleeveCol = isSil ? S.silhouette : (sleeveColor ?? resolvedBody);
  const resolvedPants = isSil ? S.silhouette : (pantsColor ?? '#1E293B');

  const resolvedHairCol =
    hairColor ?? (hair === 'receding' || hair === 'balding' ? '#9CA3AF' : '#18181B');
  const resolvedBrowCol = browColor ?? resolvedHairCol;
  const resolvedBeardCol = facialHairColor ?? resolvedHairCol;

  const rimDx = lightSide === 'right' ? -10 * s : lightSide === 'left' ? 10 * s : 0;
  const rimDy = lightSide === 'top' ? 9 * s : 3 * s;

  const headGeo = getHeadGeometry(hx, hy, s, headShape);
  const rx = headGeo.rx;
  const ry = headGeo.ry;
  const bodyW = dims.bodyW * s;
  const bodyH = dims.bodyH * s;
  const bodyTop = hipY - bodyH;

  const shoulderL: [number, number] = [x - dims.shoulderX * s * flip, hipY - 96 * s];
  const shoulderR: [number, number] = [x + dims.shoulderX * s * flip, hipY - 96 * s];

  const faceShiftX = flip * 5.5 * s + look[0] * 7 * s;
  const faceShiftY = look[1] * 5 * s;
  const eyeY = hy - 3 * s + faceShiftY;
  const sep = eyeSpacing * s;
  const eyeLx = hx - sep + faceShiftX;
  const eyeRx = hx + sep + faceShiftX;
  const noseX = hx + faceShiftX * 0.85;
  const noseTopY = eyeY + 2 * s;
  const mouthY = hy + (nose !== 'none' ? 31 : 25) * s + faceShiftY * 0.35;
  const mouthX = hx + faceShiftX * 0.65;

  const shoulderTopSlope = build === 'broad' ? 0.44 : build === 'heavy' ? 0.4 : 0.36;
  const waistSpread = build === 'heavy' ? 0.56 : build === 'broad' ? 0.5 : 0.48;
  const bodyPath = `M ${(x - bodyW * waistSpread).toFixed(1)} ${hipY.toFixed(1)}
    C ${(x - bodyW * 0.56).toFixed(1)} ${(bodyTop + bodyH * 0.32).toFixed(1)}, ${(x - bodyW * shoulderTopSlope).toFixed(1)} ${bodyTop.toFixed(1)}, ${x.toFixed(1)} ${bodyTop.toFixed(1)}
    C ${(x + bodyW * shoulderTopSlope).toFixed(1)} ${bodyTop.toFixed(1)}, ${(x + bodyW * 0.56).toFixed(1)} ${(bodyTop + bodyH * 0.32).toFixed(1)}, ${(x + bodyW * waistSpread).toFixed(1)} ${hipY.toFixed(1)}
    Z`;

  return (
    <g opacity={opacity}>
      <defs>
        <radialGradient id={`skin_${uid}`} cx={lightSide === 'left' ? '34%' : '64%'} cy="36%" r="68%">
          <stop offset="0%" stopColor={skinHi} />
          <stop offset="62%" stopColor={resolvedSkin} />
          <stop offset="100%" stopColor={skinShadow} />
        </radialGradient>
        <clipPath id={`headClip_${uid}`}>
          <path d={headGeo.d} />
        </clipPath>
        <mask id={`rimMask_${uid}`}>
          <rect x={hx - 130 * s} y={hy - 130 * s} width={260 * s} height={260 * s} fill="white" />
          <g
            transform={`translate(${(hx + rimDx).toFixed(1)}, ${(hy + rimDy).toFixed(1)}) scale(0.955) translate(${(-hx).toFixed(1)}, ${(-hy).toFixed(1)})`}
          >
            <path d={headGeo.d} fill="black" />
          </g>
        </mask>
        <clipPath id={`bodyClip_${uid}`}>
          <path d={bodyPath} />
        </clipPath>
      </defs>

      {/* Bóng đổ mặt đất dưới chân */}
      {!seated && !bust && (
        <ellipse cx={x} cy={y + 4 * s} rx={dims.bodyW * 0.52 * s} ry={11 * s} fill="rgba(0,0,0,0.34)" />
      )}

      {/* Phôi chân cơ bản (`pants` | `shorts` | `skirt` | `stick`) + bàn chân (`shoes`) */}
      {!seated && !bust && (() => {
        const legPts = ([-1, 1] as const).map((legSide) => {
          const swing = walk ? Math.sin(walk + (legSide === 1 ? Math.PI : 0)) * 22 * s : 0;
          const lx0 = x + legSide * (dims.bodyW * 0.2) * s;
          const lx1 = lx0 + swing;
          const ly1 = y - Math.max(0, -swing * 0.25);
          const su = 0.46;
          const sx1 = lx0 + (lx1 - lx0) * su;
          const sy1 = hipY - 2 * s + (ly1 - (hipY - 2 * s)) * su;
          const ldx = lx1 - lx0;
          const ldy = ly1 - (hipY - 2 * s);
          const llen = Math.hypot(ldx, ldy) || 1;
          const lpx = -ldy / llen;
          const lpy = ldx / llen;
          return { legSide, lx0, lx1, ly1, sx1, sy1, lpx, lpy, ux: ldx / llen, uy: ldy / llen };
        });
        const shortsHalfW = (dims.bodyW * 0.2 + 12) * s;
        const pantsHalfW = (dims.bodyW * 0.2 + 8.75) * s;

        return (
          <g>
            {legPts.map(({ legSide, lx0, lx1, ly1 }) => (
              <g key={`calf_${legSide}`}>
                {isSil || bottomMode === 'stick' ? (
                  <line x1={lx0} y1={hipY - 4 * s} x2={lx1} y2={ly1} stroke={S.ink} strokeWidth={STROKE.limb * s} strokeLinecap="round" />
                ) : bottomMode !== 'pants' ? (
                  <>
                    <line x1={lx0} y1={hipY} x2={lx1} y2={ly1 - 3 * s} stroke={S.ink} strokeWidth={14.5 * s} strokeLinecap="round" />
                    <line x1={lx0} y1={hipY} x2={lx1} y2={ly1 - 3 * s} stroke={resolvedSkin} strokeWidth={7.8 * s} strokeLinecap="round" />
                  </>
                ) : null}
              </g>
            ))}

            {!isSil && bottomMode === 'pants' && (
              <g>
                <rect x={x - pantsHalfW} y={hipY - 9 * s} width={pantsHalfW * 2} height={17 * s} rx={5 * s} fill={S.ink} />
                {legPts.map(({ legSide, lx0, lx1, ly1 }) => (
                  <line key={`pi_${legSide}`} x1={lx0} y1={hipY} x2={lx1} y2={ly1 - 3 * s} stroke={S.ink} strokeWidth={17.5 * s} strokeLinecap="round" />
                ))}
                <rect x={x - pantsHalfW + 3.5 * s} y={hipY - 5.5 * s} width={(pantsHalfW - 3.5 * s) * 2} height={10 * s} rx={3 * s} fill={resolvedPants} />
                {legPts.map(({ legSide, lx0, lx1, ly1 }) => (
                  <line key={`pf_${legSide}`} x1={lx0} y1={hipY} x2={lx1} y2={ly1 - 3 * s} stroke={resolvedPants} strokeWidth={10.5 * s} strokeLinecap="round" />
                ))}
              </g>
            )}

            {!isSil && bottomMode === 'shorts' && (
              <g>
                <rect x={x - shortsHalfW} y={hipY - 10 * s} width={shortsHalfW * 2} height={20 * s} rx={6 * s} fill={S.ink} />
                {legPts.map(({ legSide, lx0, sx1, sy1, lpx, lpy }) => (
                  <g key={`si_${legSide}`}>
                    <line x1={lx0} y1={hipY} x2={sx1} y2={sy1} stroke={S.ink} strokeWidth={24 * s} strokeLinecap="butt" />
                    <line
                      x1={sx1 - lpx * 10.2 * s}
                      y1={sy1 - lpy * 10.2 * s}
                      x2={sx1 + lpx * 10.2 * s}
                      y2={sy1 + lpy * 10.2 * s}
                      stroke={S.ink}
                      strokeWidth={3.8 * s}
                      strokeLinecap="round"
                    />
                  </g>
                ))}
                <rect x={x - shortsHalfW + 3.6 * s} y={hipY - 6.4 * s} width={(shortsHalfW - 3.6 * s) * 2} height={12.8 * s} rx={3 * s} fill={resolvedPants} />
                {legPts.map(({ legSide, lx0, sx1, sy1, ux, uy }) => (
                  <line
                    key={`sf_${legSide}`}
                    x1={lx0}
                    y1={hipY}
                    x2={sx1 - ux * 1.8 * s}
                    y2={sy1 - uy * 1.8 * s}
                    stroke={resolvedPants}
                    strokeWidth={16.8 * s}
                    strokeLinecap="butt"
                  />
                ))}
                <line x1={x} y1={hipY + 1 * s} x2={x} y2={hipY + 8 * s} stroke={S.ink} strokeWidth={2.4 * s} strokeLinecap="round" />
              </g>
            )}

            {!isSil && bottomMode === 'skirt' && (
              <polygon
                points={`${x - dims.bodyW * 0.44 * s},${hipY - 6 * s} ${x + dims.bodyW * 0.44 * s},${hipY - 6 * s} ${x + dims.bodyW * 0.56 * s},${hipY + 34 * s} ${x - dims.bodyW * 0.56 * s},${hipY + 34 * s}`}
                fill={resolvedPants}
                stroke={S.ink}
                strokeWidth={3.6 * s}
                strokeLinejoin="round"
              />
            )}

            {legPts.map(({ legSide, lx1, ly1 }) => (
              <g key={`shoe_${legSide}`}>
                {isSil || bottomMode === 'stick' ? (
                  <line x1={lx1 - 4 * s * flip} y1={ly1} x2={lx1 + 16 * s * flip} y2={ly1} stroke={S.ink} strokeWidth={STROKE.limb * s} strokeLinecap="round" />
                ) : shoeMode === 'bare' ? (
                  <ellipse cx={lx1 + 6 * s * flip} cy={ly1 - 2 * s} rx={11.5 * s} ry={5 * s} fill={resolvedSkin} stroke={S.ink} strokeWidth={2.8 * s} />
                ) : shoeMode === 'sandals' ? (
                  <g>
                    <ellipse cx={lx1 + 6 * s * flip} cy={ly1 - 3 * s} rx={11 * s} ry={4.8 * s} fill={resolvedSkin} stroke={S.ink} strokeWidth={2.6 * s} />
                    <line x1={lx1 - 7 * s * flip} y1={ly1 + 1.5 * s} x2={lx1 + 19 * s * flip} y2={ly1 + 1.5 * s} stroke="#0F172A" strokeWidth={4.2 * s} strokeLinecap="round" />
                    <line x1={lx1 + 2 * s * flip} y1={ly1 + 1 * s} x2={lx1 + 9 * s * flip} y2={ly1 - 5.8 * s} stroke={shoesColor ?? '#EF4444'} strokeWidth={3.2 * s} strokeLinecap="round" />
                  </g>
                ) : shoeMode === 'sneakers' ? (
                  <g>
                    <path
                      d={`M ${lx1 - 7 * s * flip} ${ly1 + 1 * s}
                          Q ${lx1 - 6 * s * flip} ${ly1 - 9.5 * s} ${lx1 + 4 * s * flip} ${ly1 - 8.5 * s}
                          L ${lx1 + 19 * s * flip} ${ly1 - 2 * s}
                          L ${lx1 + 19 * s * flip} ${ly1 + 1 * s} Z`}
                      fill={shoesColor ?? '#F8FAFC'}
                      stroke={S.ink}
                      strokeWidth={2.8 * s}
                      strokeLinejoin="round"
                    />
                    <line x1={lx1 - 6.5 * s * flip} y1={ly1 + 0.5 * s} x2={lx1 + 18.5 * s * flip} y2={ly1 + 0.5 * s} stroke={S.white} strokeWidth={3.2 * s} strokeLinecap="round" />
                  </g>
                ) : (
                  <path
                    d={`M ${lx1 - 6 * s * flip} ${ly1 + 1 * s}
                        Q ${lx1 - 5 * s * flip} ${ly1 - 7 * s} ${lx1 + 18 * s * flip} ${ly1 - 1 * s}
                        L ${lx1 + 18 * s * flip} ${ly1 + 1 * s} Z`}
                    fill={shoesColor ?? '#0F172A'}
                    stroke={S.ink}
                    strokeWidth={2.8 * s}
                    strokeLinejoin="round"
                  />
                )}
              </g>
            ))}
          </g>
        );
      })()}

      <g transform={lean ? `rotate(${lean.toFixed(1)} ${x} ${hipY})` : undefined}>
        {/* Tay sau */}
        <ActorArm
          shoulder={shoulderL}
          hand={sock.leftHand}
          bendDir={-flip}
          s={s}
          skin={resolvedSkin}
          sleeveColor={resolvedSleeveCol}
          sleeveMode={sleeveMode}
          silhouette={isSil}
        />

        {/* Phôi thân người cơ bản + `bodyClipSlot` tự thiết kế trang phục */}
        <g>
          <path d={bodyPath} fill={resolvedBody} stroke="none" />

          <g clipPath={`url(#bodyClip_${uid})`}>
            {!isSil && lightSide !== 'none' && (
              <ellipse
                cx={x + (lightSide === 'right' ? bodyW * 0.46 : -bodyW * 0.46)}
                cy={bodyTop + bodyH * 0.5}
                rx={bodyW * 0.24}
                ry={bodyH * 0.56}
                fill={rimColor}
                opacity={rimStrength * 0.22}
              />
            )}

            {torso === 'crew' && !isSil && (
              <g>
                <ellipse cx={x} cy={bodyTop + 26 * s} rx={22 * s} ry={18 * s} fill={resolvedSkin} stroke={S.ink} strokeWidth={2.8 * s} />
                {accentColor && (
                  <path
                    d={`M ${x - 24 * s} ${bodyTop + 31 * s} Q ${x} ${bodyTop + 49 * s} ${x + 24 * s} ${bodyTop + 31 * s}`}
                    fill="none"
                    stroke={accentColor}
                    strokeWidth={4.6 * s}
                    strokeLinecap="round"
                  />
                )}
              </g>
            )}

            {torso === 'vneck' && !isSil && (
              <polygon
                points={`${x - 20 * s},${bodyTop + 24 * s} ${x + 20 * s},${bodyTop + 24 * s} ${x},${bodyTop + 58 * s}`}
                fill={accentColor ?? resolvedSkin}
                stroke={S.ink}
                strokeWidth={2.6 * s}
                strokeLinejoin="round"
              />
            )}

            {torso === 'tank' && !isSil && (
              <g stroke={S.ink} strokeWidth={3.2 * s}>
                <ellipse cx={x - bodyW * 0.48} cy={bodyTop + 24 * s} rx={24 * s} ry={34 * s} fill={resolvedSkin} />
                <ellipse cx={x + bodyW * 0.48} cy={bodyTop + 24 * s} rx={24 * s} ry={34 * s} fill={resolvedSkin} />
                <ellipse cx={x} cy={bodyTop + 26 * s} rx={21 * s} ry={26 * s} fill={resolvedSkin} />
              </g>
            )}

            {torso === 'open' && !isSil && (
              <g stroke={S.ink} strokeLinejoin="round">
                <rect x={x - 21 * s} y={bodyTop + 22 * s} width={42 * s} height={bodyH} fill={accentColor ?? S.offWhite} stroke="none" />
                <ellipse cx={x} cy={bodyTop + 24 * s} rx={19 * s} ry={15 * s} fill={resolvedSkin} strokeWidth={2.6 * s} />
                <line x1={x - 19 * s} y1={bodyTop + 28 * s} x2={x - 23 * s} y2={hipY} strokeWidth={3 * s} />
                <line x1={x + 19 * s} y1={bodyTop + 28 * s} x2={x + 23 * s} y2={hipY} strokeWidth={3 * s} />
              </g>
            )}

            {bodyClipSlot && !isSil && (
              <g transform={`translate(${x.toFixed(1)}, ${bodyTop.toFixed(1)}) scale(${s})`}>{bodyClipSlot}</g>
            )}
          </g>

          <path
            d={bodyPath}
            fill="none"
            stroke={S.ink}
            strokeWidth={STROKE.outer * s}
            strokeLinejoin="round"
          />
        </g>

        {bodySlot && <g transform={`translate(${x.toFixed(1)}, ${bodyTop.toFixed(1)}) scale(${s})`}>{bodySlot}</g>}

        {/* Tóc lớp sau */}
        {(hair === 'bob' || hair === 'long') && !isSil && (
          <path
            d={`M ${hx - rx * 1.1} ${hy - 12 * s}
                C ${hx - rx * 1.22} ${hy + 58 * s}, ${hx - rx * 0.94} ${hy + (hair === 'long' ? 88 : 66) * s}, ${hx - rx * 0.52} ${hy + (hair === 'long' ? 84 : 62) * s}
                L ${hx + rx * 0.52} ${hy + (hair === 'long' ? 84 : 62) * s}
                C ${hx + rx * 0.94} ${hy + (hair === 'long' ? 88 : 66) * s}, ${hx + rx * 1.22} ${hy + 58 * s}, ${hx + rx * 1.1} ${hy - 12 * s} Z`}
            fill={resolvedHairCol}
            stroke={S.ink}
            strokeWidth={STROKE.outer * s}
            strokeLinejoin="round"
          />
        )}
        {hair === 'ponytail' && !isSil && (
          <ellipse
            cx={hx - rx * 0.98 * flip}
            cy={hy + 12 * s}
            rx={18 * s}
            ry={38 * s}
            transform={`rotate(${18 * flip} ${hx - rx * 0.98 * flip} ${hy + 12 * s})`}
            fill={resolvedHairCol}
            stroke={S.ink}
            strokeWidth={STROKE.outer * s}
          />
        )}

        {/* Đôi tai */}
        {showEars && !isSil && (
          <g>
            {[-1, 1].map((sd) => {
              const ex = hx + sd * headGeo.earX;
              const ey = hy + 3 * s;
              return (
                <g key={sd}>
                  <ellipse cx={ex} cy={ey} rx={10.5 * s} ry={16.5 * s} fill={resolvedSkin} stroke={S.ink} strokeWidth={STROKE.outer * s} />
                  <path
                    d={`M ${ex - sd * 2 * s} ${ey - 7 * s} Q ${ex + sd * 4.5 * s} ${ey} ${ex - sd * 2 * s} ${ey + 7 * s}`}
                    fill="none"
                    stroke={creaseCol}
                    strokeWidth={2.2 * s}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>
        )}

        {/* Khối đầu + bóng cầu 2.5D + vành Rim Light */}
        <g>
          <path d={headGeo.d} fill={`url(#skin_${uid})`} stroke={S.ink} strokeWidth={STROKE.outer * s} strokeLinejoin="round" />
          {!isSil && lightSide !== 'none' && (
            <rect
              x={hx - 95 * s}
              y={hy - 95 * s}
              width={190 * s}
              height={190 * s}
              fill={rimColor}
              opacity={rimStrength * 0.72}
              clipPath={`url(#headClip_${uid})`}
              mask={`url(#rimMask_${uid})`}
            />
          )}

          {(facialHair === 'stubble' || facialHair === 'beard' || facialHair === 'full-beard') && !isSil && (
            <g clipPath={`url(#headClip_${uid})`}>
              <path
                d={`M ${hx - 80 * s} ${hy + 12 * s}
                    Q ${hx} ${hy + (facialHair === 'full-beard' ? 18 : 26) * s} ${hx + 80 * s} ${hy + 12 * s}
                    L ${hx + 80 * s} ${hy + 80 * s} L ${hx - 80 * s} ${hy + 80 * s} Z`}
                fill={facialHair === 'stubble' ? mix(resolvedSkin, '#1F2937', 0.26) : resolvedBeardCol}
                stroke={facialHair === 'stubble' ? 'none' : S.ink}
                strokeWidth={2.6 * s}
              />
              {facialHair !== 'stubble' && (
                <ellipse cx={mouthX} cy={mouthY + 2 * s} rx={22 * s} ry={12 * s} fill={resolvedSkin} />
              )}
            </g>
          )}

          <path d={headGeo.d} fill="none" stroke={S.ink} strokeWidth={STROKE.outer * s} strokeLinejoin="round" />
        </g>

        {/* Nếp tuổi tác cơ bản */}
        {!isSil && (
          <g>
            {foreheadLines && (
              <g stroke={creaseCol} strokeWidth={2 * s} strokeLinecap="round" fill="none" opacity={0.78}>
                <path d={`M ${hx - 22 * s + faceShiftX * 0.4} ${hy - 33 * s} Q ${hx + faceShiftX * 0.4} ${hy - 36 * s} ${hx + 22 * s + faceShiftX * 0.4} ${hy - 33 * s}`} />
                <path d={`M ${hx - 16 * s + faceShiftX * 0.4} ${hy - 27 * s} Q ${hx + faceShiftX * 0.4} ${hy - 29 * s} ${hx + 16 * s + faceShiftX * 0.4} ${hy - 27 * s}`} />
              </g>
            )}

            {eyeBags && (
              <g stroke={creaseCol} strokeWidth={2.1 * s} strokeLinecap="round" fill="none" opacity={0.82}>
                <path d={`M ${eyeLx - 9 * s} ${eyeY + 9 * s} Q ${eyeLx} ${eyeY + 13.5 * s} ${eyeLx + 9 * s} ${eyeY + 9 * s}`} />
                <path d={`M ${eyeRx - 9 * s} ${eyeY + 9 * s} Q ${eyeRx} ${eyeY + 13.5 * s} ${eyeRx + 9 * s} ${eyeY + 9 * s}`} />
              </g>
            )}

            {nasolabial && (
              <g stroke={creaseCol} strokeWidth={2.3 * s} strokeLinecap="round" fill="none" opacity={0.85}>
                <path d={`M ${noseX - 13 * s} ${hy + 13 * s} Q ${mouthX - 24 * s} ${mouthY - 4 * s} ${mouthX - 20 * s} ${mouthY + 6 * s}`} />
                <path d={`M ${noseX + 13 * s} ${hy + 13 * s} Q ${mouthX + 24 * s} ${mouthY - 4 * s} ${mouthX + 20 * s} ${mouthY + 6 * s}`} />
              </g>
            )}

            {(doubleChin || headShape === 'jowls') && (
              <path
                d={`M ${hx - 24 * s + faceShiftX * 0.3} ${hy + 47 * s} Q ${hx + faceShiftX * 0.3} ${hy + 55 * s} ${hx + 24 * s + faceShiftX * 0.3} ${hy + 47 * s}`}
                fill="none"
                stroke={creaseCol}
                strokeWidth={2.4 * s}
                strokeLinecap="round"
              />
            )}
          </g>
        )}

        {faceSlot && (
          <g transform={`translate(${(hx + faceShiftX * 0.5).toFixed(1)}, ${(hy + faceShiftY * 0.5).toFixed(1)}) scale(${s})`}>
            {faceSlot}
          </g>
        )}

        {/* Ngũ quan biểu cảm */}
        <g>
          {blush && !isSil && (
            <g stroke="#F472B6" strokeWidth={2.5 * s} strokeLinecap="round" opacity={0.75}>
              <line x1={eyeLx - 14 * s} y1={eyeY + 15 * s} x2={eyeLx - 8 * s} y2={eyeY + 21 * s} />
              <line x1={eyeLx - 7 * s} y1={eyeY + 15 * s} x2={eyeLx - 1 * s} y2={eyeY + 21 * s} />
              <line x1={eyeRx + 4 * s} y1={eyeY + 15 * s} x2={eyeRx + 10 * s} y2={eyeY + 21 * s} />
              <line x1={eyeRx + 11 * s} y1={eyeY + 15 * s} x2={eyeRx + 17 * s} y2={eyeY + 21 * s} />
            </g>
          )}

          {/* Mắt */}
          {isSil ? (
            <g fill={S.white}>
              <ellipse cx={eyeLx} cy={eyeY} rx={9 * s} ry={6.5 * s} />
              <ellipse cx={eyeRx} cy={eyeY} rx={9 * s} ry={6.5 * s} />
            </g>
          ) : isBlinking || mood === 'sleepy' || mood === 'sleep' ? (
            <g stroke={S.ink} strokeWidth={3.6 * s} strokeLinecap="round" fill="none">
              <path d={`M ${eyeLx - 10 * s} ${eyeY + 2 * s} Q ${eyeLx} ${eyeY + 8 * s} ${eyeLx + 10 * s} ${eyeY + 2 * s}`} />
              <path d={`M ${eyeRx - 10 * s} ${eyeY + 2 * s} Q ${eyeRx} ${eyeY + 8 * s} ${eyeRx + 10 * s} ${eyeY + 2 * s}`} />
            </g>
          ) : mood === 'happy' || mood === 'laugh' ? (
            <g stroke={S.ink} strokeWidth={3.8 * s} strokeLinecap="round" fill="none">
              <path d={`M ${eyeLx - 10 * s} ${eyeY + 4 * s} Q ${eyeLx} ${eyeY - 9 * s} ${eyeLx + 10 * s} ${eyeY + 4 * s}`} />
              <path d={`M ${eyeRx - 10 * s} ${eyeY + 4 * s} Q ${eyeRx} ${eyeY - 9 * s} ${eyeRx + 10 * s} ${eyeY + 4 * s}`} />
            </g>
          ) : mood === 'shocked' || mood === 'worried' ? (
            <g>
              <circle cx={eyeLx} cy={eyeY} r={10.5 * s} fill={S.white} stroke={S.ink} strokeWidth={3.2 * s} />
              <circle cx={eyeRx} cy={eyeY} r={10.5 * s} fill={S.white} stroke={S.ink} strokeWidth={3.2 * s} />
              <circle cx={eyeLx + look[0] * 3 * s} cy={eyeY + look[1] * 3 * s} r={mood === 'shocked' ? 2.8 * s : 4 * s} fill={S.ink} />
              <circle cx={eyeRx + look[0] * 3 * s} cy={eyeY + look[1] * 3 * s} r={mood === 'shocked' ? 2.8 * s : 4 * s} fill={S.ink} />
            </g>
          ) : mood === 'wink' ? (
            <g>
              <ellipse cx={eyeLx} cy={eyeY} rx={4.8 * s} ry={6.8 * s} fill={S.ink} />
              <path d={`M ${eyeRx - 10 * s} ${eyeY + 2 * s} Q ${eyeRx} ${eyeY - 7 * s} ${eyeRx + 10 * s} ${eyeY + 2 * s}`} stroke={S.ink} strokeWidth={3.6 * s} strokeLinecap="round" fill="none" />
            </g>
          ) : eyeStyle === 'squint' ? (
            <g>
              {[eyeLx, eyeRx].map((ex, i) => (
                <g key={i}>
                  <path
                    d={`M ${ex - 11 * s} ${eyeY + 1 * s} Q ${ex} ${eyeY - 5.5 * s} ${ex + 11 * s} ${eyeY + 1 * s} Q ${ex} ${eyeY + 5.5 * s} ${ex - 11 * s} ${eyeY + 1 * s} Z`}
                    fill={S.white}
                    stroke={S.ink}
                    strokeWidth={2.8 * s}
                    strokeLinejoin="round"
                  />
                  <circle cx={ex + look[0] * 2.5 * s} cy={eyeY + 0.5 * s} r={3.6 * s} fill={S.ink} />
                  <line x1={ex - 12 * s} y1={eyeY - 2.2 * s} x2={ex + 12 * s} y2={eyeY - 1 * s} stroke={S.ink} strokeWidth={3.2 * s} strokeLinecap="round" />
                </g>
              ))}
            </g>
          ) : eyeStyle === 'hooded' ? (
            <g>
              {[eyeLx, eyeRx].map((ex, i) => (
                <g key={i}>
                  <path
                    d={`M ${ex - 10.5 * s} ${eyeY - 0.5 * s} L ${ex + 10.5 * s} ${eyeY - 0.5 * s} Q ${ex} ${eyeY + 9.5 * s} ${ex - 10.5 * s} ${eyeY - 0.5 * s} Z`}
                    fill={S.white}
                    stroke={S.ink}
                    strokeWidth={2.8 * s}
                    strokeLinejoin="round"
                  />
                  <circle cx={ex + look[0] * 2.5 * s} cy={eyeY + 2.4 * s} r={4.1 * s} fill="#334155" />
                  <circle cx={ex + look[0] * 2.5 * s} cy={eyeY + 2.4 * s} r={2.2 * s} fill={S.ink} />
                  <circle cx={ex + 1.4 * s} cy={eyeY + 1.2 * s} r={1.1 * s} fill={S.white} />
                  <line x1={ex - 11.5 * s} y1={eyeY - 1 * s} x2={ex + 11.5 * s} y2={eyeY - 0.5 * s} stroke={S.ink} strokeWidth={3.5 * s} strokeLinecap="round" />
                </g>
              ))}
            </g>
          ) : eyeStyle === 'almond' ? (
            <g>
              {[eyeLx, eyeRx].map((ex, i) => (
                <g key={i}>
                  <ellipse cx={ex} cy={eyeY + 0.5 * s} rx={9.5 * s} ry={5.6 * s} fill={S.white} stroke={S.ink} strokeWidth={2.8 * s} />
                  <circle cx={ex + look[0] * 2.6 * s} cy={eyeY + 0.8 * s + look[1] * 1.5 * s} r={4.1 * s} fill={S.ink} />
                  <circle cx={ex + 1.5 * s} cy={eyeY - 1 * s} r={1.3 * s} fill={S.white} />
                  <path d={`M ${ex - 10.5 * s} ${eyeY} Q ${ex} ${eyeY - 7 * s} ${ex + 10.5 * s} ${eyeY}`} fill="none" stroke={S.ink} strokeWidth={3.4 * s} strokeLinecap="round" />
                </g>
              ))}
            </g>
          ) : (
            <g fill={S.ink}>
              <ellipse cx={eyeLx} cy={eyeY} rx={4.8 * s} ry={6.8 * s} />
              <ellipse cx={eyeRx} cy={eyeY} rx={4.8 * s} ry={6.8 * s} />
              {mood === 'suspicious' && (
                <g stroke={S.ink} strokeWidth={3.2 * s}>
                  <line x1={eyeLx - 9 * s} y1={eyeY - 4 * s} x2={eyeLx + 9 * s} y2={eyeY - 4 * s} />
                  <line x1={eyeRx - 9 * s} y1={eyeY - 4 * s} x2={eyeRx + 9 * s} y2={eyeY - 4 * s} />
                </g>
              )}
            </g>
          )}

          {/* Lông mày */}
          {!isSil && (
            <g>
              {browStyle === 'bushy' ? (
                <g fill={resolvedBrowCol} stroke={S.ink} strokeWidth={2.6 * s} strokeLinejoin="round">
                  <polygon
                    points={
                      mood === 'angry' || mood === 'smug'
                        ? `${eyeLx - 14 * s},${eyeY - 18 * s} ${eyeLx + 12 * s},${eyeY - 11 * s} ${eyeLx + 11 * s},${eyeY - 6 * s} ${eyeLx - 14 * s},${eyeY - 12 * s}`
                        : `${eyeLx - 14 * s},${eyeY - 14 * s} ${eyeLx + 12 * s},${eyeY - 16 * s} ${eyeLx + 12 * s},${eyeY - 10 * s} ${eyeLx - 13 * s},${eyeY - 8 * s}`
                    }
                  />
                  <polygon
                    points={
                      mood === 'angry'
                        ? `${eyeRx - 12 * s},${eyeY - 11 * s} ${eyeRx + 14 * s},${eyeY - 18 * s} ${eyeRx + 14 * s},${eyeY - 12 * s} ${eyeRx - 11 * s},${eyeY - 6 * s}`
                        : `${eyeRx - 12 * s},${eyeY - 16 * s} ${eyeRx + 14 * s},${eyeY - 14 * s} ${eyeRx + 13 * s},${eyeY - 8 * s} ${eyeRx - 12 * s},${eyeY - 10 * s}`
                    }
                  />
                </g>
              ) : browStyle === 'thin' ? (
                <g stroke={resolvedBrowCol} strokeWidth={2.8 * s} strokeLinecap="round" fill="none">
                  <path d={`M ${eyeLx - 10 * s} ${eyeY - 11 * s} Q ${eyeLx} ${eyeY - 14 * s} ${eyeLx + 9 * s} ${eyeY - 10 * s}`} />
                  <path d={`M ${eyeRx - 9 * s} ${eyeY - 10 * s} Q ${eyeRx} ${eyeY - 14 * s} ${eyeRx + 10 * s} ${eyeY - 11 * s}`} />
                </g>
              ) : browStyle === 'flat' ? (
                <g stroke={resolvedBrowCol} strokeWidth={3.8 * s} strokeLinecap="round">
                  <line x1={eyeLx - 12 * s} y1={eyeY - 12 * s} x2={eyeLx + 11 * s} y2={eyeY - 11 * s} />
                  <line x1={eyeRx - 11 * s} y1={eyeY - 11 * s} x2={eyeRx + 12 * s} y2={eyeY - 12 * s} />
                </g>
              ) : (
                <g stroke={resolvedBrowCol} strokeWidth={3.6 * s} strokeLinecap="round" fill="none">
                  {mood === 'angry' ? (
                    <>
                      <line x1={eyeLx - 11 * s} y1={eyeY - 19 * s} x2={eyeLx + 9 * s} y2={eyeY - 11 * s} />
                      <line x1={eyeRx - 9 * s} y1={eyeY - 11 * s} x2={eyeRx + 11 * s} y2={eyeY - 19 * s} />
                    </>
                  ) : mood === 'worried' || mood === 'sad' ? (
                    <>
                      <line x1={eyeLx - 11 * s} y1={eyeY - 12 * s} x2={eyeLx + 9 * s} y2={eyeY - 19 * s} />
                      <line x1={eyeRx - 9 * s} y1={eyeY - 19 * s} x2={eyeRx + 11 * s} y2={eyeY - 12 * s} />
                    </>
                  ) : (
                    <>
                      <path d={`M ${eyeLx - 10 * s} ${eyeY - 15 * s} Q ${eyeLx} ${eyeY - 21 * s} ${eyeLx + 10 * s} ${eyeY - 15 * s}`} />
                      <path d={`M ${eyeRx - 10 * s} ${eyeY - 15 * s} Q ${eyeRx} ${eyeY - 21 * s} ${eyeRx + 10 * s} ${eyeY - 15 * s}`} />
                    </>
                  )}
                </g>
              )}
            </g>
          )}

          {/* Mũi cơ bản */}
          {nose !== 'none' && !isSil && (
            <g stroke={S.ink} strokeWidth={2.9 * s} strokeLinecap="round" strokeLinejoin="round" fill="none">
              {nose === 'button' && (
                <path d={`M ${noseX - 2 * flip * s} ${noseTopY + 7 * s} Q ${noseX + 8 * flip * s} ${noseTopY + 11 * s} ${noseX - 3 * flip * s} ${noseTopY + 15 * s}`} />
              )}
              {nose === 'straight' && (
                <path d={`M ${noseX + 1 * flip * s} ${noseTopY + 1 * s} L ${noseX + 7.5 * flip * s} ${noseTopY + 13 * s} Q ${noseX + 3 * flip * s} ${noseTopY + 16 * s} ${noseX - 4 * flip * s} ${noseTopY + 14.5 * s}`} />
              )}
              {nose === 'bulbous' && (
                <path
                  d={`M ${noseX + 1 * flip * s} ${noseTopY + 2 * s} C ${noseX + 9 * flip * s} ${noseTopY + 7 * s}, ${noseX + 12 * flip * s} ${noseTopY + 16 * s}, ${noseX + 2 * flip * s} ${noseTopY + 16.5 * s} Q ${noseX - 8 * flip * s} ${noseTopY + 16.5 * s} ${noseX - 8.5 * flip * s} ${noseTopY + 11.5 * s}`}
                  fill={mix(resolvedSkin, '#E11D48', 0.08)}
                />
              )}
              {nose === 'pointed' && (
                <path d={`M ${noseX} ${noseTopY} L ${noseX + 11.5 * flip * s} ${noseTopY + 15.5 * s} L ${noseX - 4 * flip * s} ${noseTopY + 16.5 * s}`} fill={mix(resolvedSkin, '#000000', 0.05)} />
              )}
              {nose === 'hooked' && (
                <path d={`M ${noseX} ${noseTopY} Q ${noseX + 13 * flip * s} ${noseTopY + 8 * s} ${noseX + 4 * flip * s} ${noseTopY + 17 * s} L ${noseX - 4 * flip * s} ${noseTopY + 14.5 * s}`} />
              )}
            </g>
          )}

          {/* Kính mắt cơ bản */}
          {glasses !== 'none' && !isSil && (
            <g stroke={S.ink} strokeWidth={3.1 * s}>
              {glasses === 'sunglasses' ? (
                <g fill="#0E1116">
                  <rect x={eyeLx - 15 * s} y={eyeY - 9 * s} width={28 * s} height={18 * s} rx={4 * s} />
                  <rect x={eyeRx - 13 * s} y={eyeY - 9 * s} width={28 * s} height={18 * s} rx={4 * s} />
                  <line x1={eyeLx + 13 * s} y1={eyeY - 2 * s} x2={eyeRx - 13 * s} y2={eyeY - 2 * s} />
                  <line x1={hx - rx + 2 * s} y1={eyeY - 3 * s} x2={eyeLx - 15 * s} y2={eyeY - 1 * s} />
                  <line x1={eyeRx + 15 * s} y1={eyeY - 1 * s} x2={hx + rx - 2 * s} y2={eyeY - 3 * s} />
                </g>
              ) : glasses === 'round' ? (
                <g fill="rgba(255,255,255,0.16)">
                  <circle cx={eyeLx} cy={eyeY} r={13 * s} />
                  <circle cx={eyeRx} cy={eyeY} r={13 * s} />
                  <line x1={eyeLx + 13 * s} y1={eyeY} x2={eyeRx - 13 * s} y2={eyeY} />
                </g>
              ) : (
                <g fill="rgba(255,255,255,0.15)">
                  <rect x={eyeLx - 15.5 * s} y={eyeY - 8.5 * s} width={30 * s} height={17 * s} rx={3.5 * s} />
                  <rect x={eyeRx - 14.5 * s} y={eyeY - 8.5 * s} width={30 * s} height={17 * s} rx={3.5 * s} />
                  <line x1={eyeLx + 14.5 * s} y1={eyeY - 1.5 * s} x2={eyeRx - 14.5 * s} y2={eyeY - 1.5 * s} />
                  <line x1={hx - rx + 2 * s} y1={eyeY - 3 * s} x2={eyeLx - 15.5 * s} y2={eyeY - 1.5 * s} />
                  <line x1={eyeRx + 15.5 * s} y1={eyeY - 1.5 * s} x2={hx + rx - 2 * s} y2={eyeY - 3 * s} />
                </g>
              )}
            </g>
          )}

          {/* Ria mép / Râu cằm cơ bản */}
          {(facialHair === 'mustache' || facialHair === 'goatee' || facialHair === 'full-beard') && !isSil && (
            <path
              d={`M ${mouthX - 18 * s} ${mouthY - 3 * s}
                  Q ${mouthX} ${mouthY - 13 * s} ${mouthX + 18 * s} ${mouthY - 3 * s}
                  Q ${mouthX} ${mouthY - 6 * s} ${mouthX - 18 * s} ${mouthY - 3 * s} Z`}
              fill={resolvedBeardCol}
              stroke={S.ink}
              strokeWidth={2.5 * s}
              strokeLinejoin="round"
            />
          )}
          {facialHair === 'goatee' && !isSil && (
            <path
              d={`M ${mouthX - 12 * s} ${mouthY + 12 * s} Q ${mouthX} ${mouthY + 26 * s} ${mouthX + 12 * s} ${mouthY + 12 * s} Z`}
              fill={resolvedBeardCol}
              stroke={S.ink}
              strokeWidth={2.5 * s}
            />
          )}

          {/* Miệng & nhép thoại `talk` */}
          {!isSil && (
            <g>
              {mouthStyle === 'pursed' && mood !== 'laugh' ? (
                <g>
                  <ellipse
                    cx={mouthX}
                    cy={mouthY}
                    rx={(10.5 + talkAmt * 3) * s}
                    ry={(7.5 + talkAmt * 6) * s}
                    fill={mix(resolvedSkin, '#FDA4AF', 0.42)}
                    stroke={creaseCol}
                    strokeWidth={2 * s}
                  />
                  <ellipse
                    cx={mouthX}
                    cy={mouthY}
                    rx={(5.8 + talkAmt * 2.5) * s}
                    ry={(3.6 + talkAmt * 5.2) * s}
                    fill="#450A0A"
                    stroke={S.ink}
                    strokeWidth={2.8 * s}
                  />
                </g>
              ) : talkAmt > 0.08 ? (
                <ellipse
                  cx={mouthX}
                  cy={mouthY}
                  rx={(10 + talkAmt * 6) * s}
                  ry={(4 + talkAmt * 11) * s}
                  fill="#58131A"
                  stroke={S.ink}
                  strokeWidth={3.2 * s}
                />
              ) : mood === 'laugh' || mood === 'happy' || mouthStyle === 'grin' ? (
                <path
                  d={`M ${mouthX - 14.5 * s} ${mouthY - 3 * s} Q ${mouthX} ${mouthY + 13 * s} ${mouthX + 14.5 * s} ${mouthY - 3 * s} Z`}
                  fill={mood === 'laugh' ? '#7F1D1D' : '#FEFCE8'}
                  stroke={S.ink}
                  strokeWidth={3.1 * s}
                  strokeLinejoin="round"
                />
              ) : mood === 'shocked' ? (
                <ellipse cx={mouthX} cy={mouthY + 1 * s} rx={7.5 * s} ry={10.5 * s} fill="#450A0A" stroke={S.ink} strokeWidth={3.2 * s} />
              ) : mouthStyle === 'smirk' || mood === 'smug' ? (
                <g stroke={S.ink} strokeWidth={3.1 * s} strokeLinecap="round" fill="none">
                  <path d={`M ${mouthX - 13 * s * flip} ${mouthY + 2 * s} Q ${mouthX + 1 * s * flip} ${mouthY + 4.5 * s} ${mouthX + 14 * s * flip} ${mouthY - 3.5 * s}`} />
                  <path d={`M ${mouthX + 15 * s * flip} ${mouthY - 6.5 * s} Q ${mouthX + 18 * s * flip} ${mouthY - 2.5 * s} ${mouthX + 14 * s * flip} ${mouthY + 0.5 * s}`} strokeWidth={2.2 * s} />
                </g>
              ) : mouthStyle === 'warm' ? (
                <path d={`M ${mouthX - 13 * s} ${mouthY - 1 * s} Q ${mouthX} ${mouthY + 7 * s} ${mouthX + 13 * s} ${mouthY - 1 * s}`} fill="none" stroke={S.ink} strokeWidth={3.2 * s} strokeLinecap="round" />
              ) : mouthStyle === 'stern' || mood === 'sad' || mood === 'worried' || mood === 'angry' ? (
                <path d={`M ${mouthX - 12 * s} ${mouthY + 3 * s} Q ${mouthX} ${mouthY - 3.5 * s} ${mouthX + 12 * s} ${mouthY + 3 * s}`} fill="none" stroke={S.ink} strokeWidth={3.2 * s} strokeLinecap="round" />
              ) : (
                <line x1={mouthX - 9 * s} y1={mouthY} x2={mouthX + 9 * s} y2={mouthY} stroke={S.ink} strokeWidth={3.2 * s} strokeLinecap="round" />
              )}
            </g>
          )}
        </g>

        {/* Phôi tóc cơ bản lớp trước */}
        {hair !== 'none' && !isSil && (
          <g stroke={S.ink} strokeWidth={STROKE.outer * s} strokeLinejoin="round" strokeLinecap="round" fill={resolvedHairCol}>
            {hair === 'tousled' && (
              <path
                d={`M ${hx - rx * 0.93 * flip} ${hy - 14 * s}
                    C ${hx - rx * 0.98 * flip} ${hy - 36 * s}, ${hx - 54 * s * flip} ${hy - 60 * s}, ${hx - 32 * s * flip} ${hy - 68 * s}
                    L ${hx - 14 * s * flip} ${hy - 74 * s}
                    L ${hx - 4 * s * flip} ${hy - 68 * s}
                    L ${hx + 20 * s * flip} ${hy - 75 * s}
                    C ${hx + 48 * s * flip} ${hy - 70 * s}, ${hx + rx * 0.98 * flip} ${hy - 44 * s}, ${hx + rx * 0.93 * flip} ${hy - 14 * s}
                    L ${hx + rx * 0.82 * flip} ${hy - 28 * s}
                    Q ${hx + 28 * s * flip} ${hy - 34 * s} ${hx + 6 * s * flip} ${hy - 39 * s}
                    L ${hx - 8 * s * flip} ${hy - 33 * s}
                    Q ${hx - 32 * s * flip} ${hy - 38 * s} ${hx - rx * 0.82 * flip} ${hy - 28 * s} Z`}
              />
            )}
            {hair === 'receding' && (
              <path
                d={`M ${hx - rx * 0.98} ${hy - 14 * s}
                    C ${hx - rx * 1.0} ${hy - 36 * s}, ${hx - 48 * s} ${hy - 56 * s}, ${hx - 28 * s} ${hy - 58 * s}
                    Q ${hx} ${hy - 68 * s} ${hx + 28 * s} ${hy - 58 * s}
                    C ${hx + 48 * s} ${hy - 56 * s}, ${hx + rx * 1.0} ${hy - 36 * s}, ${hx + rx * 0.98} ${hy - 14 * s}
                    L ${hx + 50 * s} ${hy - 36 * s}
                    Q ${hx + 34 * s} ${hy - 54 * s} ${hx + 16 * s} ${hy - 48 * s}
                    Q ${hx} ${hy - 44 * s} ${hx - 16 * s} ${hy - 48 * s}
                    Q ${hx - 34 * s} ${hy - 54 * s} ${hx - 50 * s} ${hy - 36 * s} Z`}
              />
            )}
            {hair === 'slick' && (
              <path
                d={`M ${hx - rx * 0.98} ${hy - 12 * s}
                    C ${hx - rx * 1.04} ${hy - 44 * s}, ${hx - 36 * s} ${hy - 70 * s}, ${hx} ${hy - 70 * s}
                    C ${hx + 36 * s} ${hy - 70 * s}, ${hx + rx * 1.04} ${hy - 44 * s}, ${hx + rx * 0.98} ${hy - 12 * s}
                    L ${hx + rx * 0.86} ${hy - 32 * s}
                    Q ${hx} ${hy - 46 * s} ${hx - rx * 0.86} ${hy - 32 * s} Z`}
              />
            )}
            {hair === 'parted' && (
              <path
                d={`M ${hx - rx * 1.01 * flip} ${hy - 6 * s}
                    L ${hx - rx * 1.08 * flip} ${hy - 22 * s}
                    C ${hx - rx * 0.9 * flip} ${hy - ry * 1.22}, ${hx + rx * 0.88 * flip} ${hy - ry * 1.22}, ${hx + rx * 1.04 * flip} ${hy - 8 * s}
                    L ${hx + rx * 0.92 * flip} ${hy - 22 * s}
                    Q ${hx + 12 * s * flip} ${hy - ry * 0.72} ${hx - rx * 0.86 * flip} ${hy - 18 * s} Z`}
              />
            )}
            {(hair === 'bob' || hair === 'long' || hair === 'ponytail') && (
              <path
                d={`M ${hx - rx * 1.03} ${hy - 12 * s}
                    C ${hx - rx * 0.85} ${hy - ry * 1.22}, ${hx + rx * 0.85} ${hy - ry * 1.22}, ${hx + rx * 1.03} ${hy - 12 * s}
                    Q ${hx + 8 * s} ${hy - 28 * s} ${hx - rx * 1.03} ${hy - 12 * s} Z`}
              />
            )}
            {hair === 'short' && (
              <path
                d={`M ${hx - rx * 0.98} ${hy - 14 * s}
                    C ${hx - rx * 0.82} ${hy - ry * 1.2}, ${hx + rx * 0.82} ${hy - ry * 1.2}, ${hx + rx * 0.98} ${hy - 14 * s}
                    Q ${hx + 14 * s * flip} ${hy - 30 * s} ${hx - rx * 0.98} ${hy - 14 * s} Z`}
              />
            )}
            {hair === 'curly' && (
              <path
                d={`M ${hx - rx * 0.98} ${hy - 12 * s}
                    Q ${hx - rx * 0.85} ${hy - ry * 1.15} ${hx - rx * 0.35} ${hy - ry * 1.05}
                    Q ${hx} ${hy - ry * 1.25} ${hx + rx * 0.38} ${hy - ry * 1.05}
                    Q ${hx + rx * 0.88} ${hy - ry * 1.15} ${hx + rx * 0.98} ${hy - 12 * s}
                    Q ${hx} ${hy - 30 * s} ${hx - rx * 0.98} ${hy - 12 * s} Z`}
              />
            )}
            {hair === 'balding' && (
              <g>
                <path d={`M ${hx - rx * 1.02} ${hy - 6 * s} Q ${hx - rx * 0.95} ${hy - 26 * s} ${hx - rx * 0.72} ${hy - 22 * s} Z`} />
                <path d={`M ${hx + rx * 1.02} ${hy - 6 * s} Q ${hx + rx * 0.95} ${hy - 26 * s} ${hx + rx * 0.72} ${hy - 22 * s} Z`} />
              </g>
            )}
            {hair === 'bun' && (
              <g>
                <circle cx={hx} cy={hy - ry - 14 * s} r={20 * s} />
                <path
                  d={`M ${hx - rx * 0.95} ${hy - 16 * s}
                      C ${hx - rx * 0.75} ${hy - ry * 1.12}, ${hx + rx * 0.75} ${hy - ry * 1.12}, ${hx + rx * 0.95} ${hy - 16 * s}
                      Q ${hx} ${hy - 30 * s} ${hx - rx * 0.95} ${hy - 16 * s} Z`}
                />
              </g>
            )}
            {hair === 'spiky' && (
              <polygon
                points={`${hx - rx * 0.9},${hy - 18 * s} ${hx - 42 * s},${hy - ry - 18 * s} ${hx - 16 * s},${hy - ry + 2 * s} ${hx + 4 * s},${hy - ry - 22 * s} ${hx + 24 * s},${hy - ry + 2 * s} ${hx + 48 * s},${hy - ry - 14 * s} ${hx + rx * 0.9},${hy - 18 * s}`}
              />
            )}
          </g>
        )}

        {hairSlot && <g transform={`translate(${hx.toFixed(1)}, ${hy.toFixed(1)}) scale(${s})`}>{hairSlot}</g>}

        {/* Giọt mồ hôi căng thẳng */}
        {sweat && (
          <path
            d={`M ${hx - 46 * s * flip} ${hy - 24 * s}
                C ${hx - 55 * s * flip} ${hy - 6 * s}, ${hx - 37 * s * flip} ${hy - 6 * s}, ${hx - 46 * s * flip} ${hy - 24 * s} Z`}
            fill="#7DD3FC"
            stroke={S.ink}
            strokeWidth={2.6 * s}
            transform={`scale(1, 1.45) translate(0, ${(-hy * 0.31).toFixed(1)})`}
          />
        )}

        {/* Ký hiệu ngủ gật zZz */}
        {zzz && (
          <g fontFamily={BRUSH_FONT} fontWeight={800} fill={S.white} stroke={S.ink} strokeWidth={4 * s} style={{ paintOrder: 'stroke fill' }}>
            {[0, 1, 2].map((k) => {
              const p = (t * 0.7 + k * 0.33) % 1;
              return (
                <text key={k} x={hx + (38 + p * 44) * s} y={hy - (38 + p * 64) * s} fontSize={(18 + p * 14) * s} opacity={1 - p * 0.75}>
                  z
                </text>
              );
            })}
          </g>
        )}

        {accessory && <g transform={`translate(${hx.toFixed(1)}, ${hy.toFixed(1)}) scale(${s})`}>{accessory}</g>}

        {/* Tay trước */}
        <ActorArm
          shoulder={shoulderR}
          hand={sock.rightHand}
          bendDir={flip}
          s={s}
          skin={resolvedSkin}
          sleeveColor={resolvedSleeveCol}
          sleeveMode={sleeveMode}
          silhouette={isSil}
        />
      </g>
    </g>
  );
};

/** Cánh tay đưa vào từ mép khung (dùng cho góc nhìn mặt bàn thao tác tay). */
export const TopDownHand: React.FC<{
  fromPt: Pt;
  toPt: Pt;
  sleeveColor?: string;
  skin?: string;
  gloved?: boolean;
  width?: number;
}> = ({ fromPt, toPt, sleeveColor = '#1E293B', skin = S.skin2, gloved = false, width = 46 }) => {
  const ang = (Math.atan2(toPt[1] - fromPt[1], toPt[0] - fromPt[0]) * 180) / Math.PI;
  const dist = Math.hypot(toPt[0] - fromPt[0], toPt[1] - fromPt[1]);
  const cuffLen = Math.max(0, dist - 42);
  const handFill = gloved ? '#111827' : skin;

  return (
    <g transform={`translate(${fromPt[0].toFixed(1)}, ${fromPt[1].toFixed(1)}) rotate(${ang.toFixed(1)})`}>
      <rect x={0} y={-width / 2} width={cuffLen} height={width} rx={6} fill={sleeveColor} stroke={S.ink} strokeWidth={STROKE.outer} />
      {!gloved && (
        <rect x={cuffLen - 12} y={-width * 0.44} width={16} height={width * 0.88} fill={S.offWhite} stroke={S.ink} strokeWidth={3} />
      )}
      <ellipse cx={cuffLen + 22} cy={0} rx={24} ry={width * 0.42} fill={handFill} stroke={S.ink} strokeWidth={STROKE.outer} />
      <ellipse cx={cuffLen + 14} cy={-width * 0.42} rx={10} ry={6.5} fill={handFill} stroke={S.ink} strokeWidth={3.2} />
    </g>
  );
};

/** Wrapper nhân hoá vật thể (`AliveProp`). */
export const AliveProp: React.FC<{
  x: number;
  y: number;
  faceOffset?: Pt;
  faceScale?: number;
  mood?: Exclude<ActorMood, 'silhouette'>;
  look?: Pt;
  zzz?: boolean;
  sweat?: boolean;
  run?: number;
  legLength?: number;
  t?: number;
  children: React.ReactNode;
}> = ({
  x,
  y,
  faceOffset = [0, 0],
  faceScale = 1,
  mood = 'neutral',
  look = [0, 0],
  zzz = false,
  sweat = false,
  run,
  legLength = 48,
  t = 0,
  children,
}) => {
  const fx = faceOffset[0];
  const fy = faceOffset[1];
  const fs = faceScale;
  const bounce = run !== undefined ? Math.abs(Math.sin(run * 2)) * 7 : 0;

  return (
    <g transform={`translate(${x.toFixed(1)}, ${(y - bounce).toFixed(1)})`}>
      {run !== undefined && (
        <g stroke={S.ink} strokeWidth={6.5} strokeLinecap="round">
          {[-1, 1].map((side) => {
            const sw = Math.sin(run + (side === 1 ? Math.PI : 0)) * 24;
            return (
              <g key={side}>
                <line x1={side * 16} y1={0} x2={side * 16 + sw} y2={legLength} />
                <line x1={side * 16 + sw} y1={legLength} x2={side * 16 + sw + 14} y2={legLength} />
              </g>
            );
          })}
        </g>
      )}

      {children}

      <g transform={`translate(${fx.toFixed(1)}, ${fy.toFixed(1)}) scale(${fs})`}>
        {mood === 'sleepy' ? (
          <g stroke={S.ink} strokeWidth={3.6} strokeLinecap="round" fill="none">
            <path d="M -26 0 Q -16 8 -6 0" />
            <path d="M 6 0 Q 16 8 26 0" />
            <circle
              cx={26 + Math.sin(t * 2.4) * 3}
              cy={12}
              r={11 + Math.sin(t * 2.4) * 3.5}
              fill="rgba(224, 242, 254, 0.78)"
              stroke={S.ink}
              strokeWidth={2.5}
            />
          </g>
        ) : (
          <g>
            <circle cx={-16} cy={0} r={11} fill={S.white} stroke={S.ink} strokeWidth={3.2} />
            <circle cx={16} cy={0} r={11} fill={S.white} stroke={S.ink} strokeWidth={3.2} />
            <circle cx={-16 + look[0] * 4} cy={look[1] * 4} r={mood === 'shocked' ? 3 : 4.5} fill={S.ink} />
            <circle cx={16 + look[0] * 4} cy={look[1] * 4} r={mood === 'shocked' ? 3 : 4.5} fill={S.ink} />
            {mood === 'shocked' ? (
              <ellipse cx={0} cy={22} rx={8} ry={11} fill="#450A0A" stroke={S.ink} strokeWidth={3} />
            ) : mood === 'happy' ? (
              <path d="M -12 18 Q 0 30 12 18" fill="none" stroke={S.ink} strokeWidth={3.2} strokeLinecap="round" />
            ) : mood === 'angry' || mood === 'suspicious' ? (
              <>
                <line x1={-26} y1={-14} x2={-6} y2={-8} stroke={S.ink} strokeWidth={3.5} strokeLinecap="round" />
                <line x1={6} y1={-8} x2={26} y2={-14} stroke={S.ink} strokeWidth={3.5} strokeLinecap="round" />
                <line x1={-9} y1={21} x2={9} y2={21} stroke={S.ink} strokeWidth={3.2} strokeLinecap="round" />
              </>
            ) : (
              <line x1={-8} y1={20} x2={8} y2={20} stroke={S.ink} strokeWidth={3.2} strokeLinecap="round" />
            )}
          </g>
        )}

        {sweat && <circle cx={-34} cy={-8} r={5.5} fill="#7DD3FC" stroke={S.ink} strokeWidth={2.4} />}
        {zzz && (
          <text
            x={32}
            y={-18 - ((t * 18) % 24)}
            fontFamily={BRUSH_FONT}
            fontWeight={800}
            fontSize={22}
            fill={S.white}
            stroke={S.ink}
            strokeWidth={4}
            style={{ paintOrder: 'stroke fill' }}
          >
            zZz
          </text>
        )}
      </g>
    </g>
  );
};

/** Dải đám đông nền / tiền cảnh tạo chiều sâu không gian đông người. */
export const CrowdStrip: React.FC<{
  x: number;
  y: number;
  width: number;
  count?: number;
  scale?: number;
  seed?: number;
  silhouette?: boolean;
}> = ({ x, y, width, count = 12, scale = 0.62, seed = 7, silhouette = false }) => {
  const skins = [S.skin1, S.skin2, S.skin3, S.skin4, S.skin5, S.skin6];
  const tops = ['#334155', '#1E293B', '#3F6236', '#5B21B6', '#7C2D12', '#1D4ED8', '#374151'];
  const hairs: HairStyle[] = ['short', 'parted', 'bob', 'curly', 'bun', 'balding'];
  const hairColors = ['#18181B', '#4A3321', '#78350F', '#9CA3AF'];

  return (
    <g>
      {Array.from({ length: count }).map((_, i) => {
        const px = x + ((i + 0.5) / count) * width + (rnd(seed + i * 11) - 0.5) * 26;
        const py = y + (rnd(seed + i * 23) - 0.5) * 18;
        return (
          <Actor2D
            key={i}
            x={px}
            y={py}
            s={scale * (0.92 + rnd(seed + i * 7) * 0.16)}
            bust
            skin={skins[i % skins.length]}
            hair={hairs[i % hairs.length]}
            hairColor={hairColors[i % hairColors.length]}
            torso={silhouette ? 'silhouette' : 'crew'}
            mood={silhouette ? 'silhouette' : 'neutral'}
            bodyColor={tops[i % tops.length]}
            lightSide="top"
            rimStrength={0.35}
          />
        );
      })}
    </g>
  );
};
