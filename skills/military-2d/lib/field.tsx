// Sân khấu & đồ nghề vẽ 2D chiến thuật, hành động và cơ chế / mặt cắt (tất định theo `t`, đặt trong <Cam2D> trừ FocusBox / preview2D):
// - <SideStage>: sân khấu góc ngang (bầu trời + đồi skyline nhiều lớp dịch thị sai + mặt đất) cho hành động, bắn/nổ, công sự, khí tài.
// - <TopStage>: sân khấu sa bàn cục bộ từ trên xuống (đường đồng mức contours + lưới chiến thuật) cho đội hình, phục kích, góc quạt bắn.
// - <Soldier2D> + soldierSockets(): người lính 2D tối giản (đứng, đi, nằm bắn, ngã, súng trường / ống phóng) trả đúng toạ độ miệng nòng & đầu.
// - <Fan2D>, <Tracer2D>, <ArcShot2D>, <Shock2D>: góc quạt tầm bắn/quan sát, đạn vạch, quỹ đạo cầu vồng, sóng xung kích.
// - <FocusBox>, fitBox(), preview2D(): khung ngắm khoanh vùng cơ chế, hàm ôm hộp chủ thể 65–90% khung, ảnh kiểm 4 ô cho `check.py --part`.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import type { Preview } from '@core/preview';
import { deg, lerp, prog } from '@core/time';
import { Defs2D } from '@skill/military/2d/look';
import { contours, skyline } from '@skill/military/2d/terrain';
import { FONT, LINE, M, P, sideColor, type Side } from './theme';

export type Pt = [number, number];
export type Box = { x: number; y: number; w: number; h: number };

const clamp = (x: number) => Math.max(0, Math.min(1, x));

/**
 * Tính `{ x, y, zoom }` cho `<Cam2D>` để hộp chủ thể `box` nằm giữa khung và chiếm đúng tỉ lệ `frac` (mặc định 0.78, tức 78% chiều chặt hơn).
 * Dùng để giữ chủ thể lớn, có sức nặng thị giác (65–90% khung), tránh để xe / lính / cụm cơ chế nhỏ xíu giữa nền trống.
 */
export const fitBox = (box: Box, frac = 0.78): { x: number; y: number; zoom: number } => ({
  x: box.x + box.w / 2,
  y: box.y + box.h / 2,
  zoom: Math.min((1920 * frac) / Math.max(1, box.w), (1080 * frac) / Math.max(1, box.h)),
});

const MOODS = {
  day: { skyTop: '#dce8f3', skyBot: P.bg, hillFar: '#cddae6', hillMid: '#b5c7b8', hillNear: '#9bb08a', ground: P.earth, groundTop: P.grass, line: P.ink },
  dusk: { skyTop: '#1e2c42', skyBot: '#6e5649', hillFar: '#323f54', hillMid: '#283344', hillNear: '#1e2734', ground: '#262320', groundTop: '#3a342c', line: '#11161f' },
  night: { skyTop: '#08111e', skyBot: '#14263c', hillFar: '#122236', hillMid: '#0e1b2c', hillNear: '#0a1422', ground: '#0d1621', groundTop: '#18283b', line: '#294360' },
  cutaway: { skyTop: '#edf2f7', skyBot: P.paper, hillFar: '#e2e8f0', hillMid: '#cbd5e1', hillNear: '#b8c4d0', ground: '#d8e0e8', groundTop: '#cbd5e1', line: P.ink2 },
} as const;

export type StageMood = keyof typeof MOODS;

/**
 * Sân khấu góc ngang 2D (đặt trong `<Cam2D>`): bầu trời chuyển sắc + 3 lớp đồi `skyline` có thị sai theo `camX` + mặt đất tại `groundY`.
 * Với cảnh mặt cắt cơ chế (`mood="cutaway"`), mặc định tắt đồi (`showHills={false}`) và tắt mặt đất nếu truyền `groundY={null}` để tập trung vào vật thể.
 */
export const SideStage: React.FC<{
  width?: number;
  height?: number;
  groundY?: number | null;
  camX?: number;
  seed?: string;
  mood?: StageMood;
  showHills?: boolean;
  children?: React.ReactNode;
}> = ({ width = 3840, height = 2160, groundY = 780, camX = 960, seed = 'field', mood = 'day', showHills, children }) => {
  const pal = MOODS[mood];
  const hillsOn = showHills ?? mood !== 'cutaway';
  const gy = groundY;
  const span = Math.max(width, 3840);
  const x0 = -span * 0.5, x1 = span * 1.5, bot = height + 800;
  const hills = useMemo(
    () => (hillsOn && gy !== null
      ? {
          far: skyline(seed + '_f', x0, x1, gy - 110, 210, 920, bot),
          mid: skyline(seed + '_m', x0, x1, gy - 55, 145, 640, bot),
          near: skyline(seed + '_n', x0, x1, gy - 12, 85, 420, bot),
        }
      : null),
    [hillsOn, gy, seed, x0, x1, bot],
  );
  const dx = camX - 960;
  const gradId = `sky_${seed}_${mood}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <Defs2D />
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={pal.skyTop} />
          <stop offset="100%" stopColor={pal.skyBot} />
        </linearGradient>
      </defs>
      <rect x={x0} y={-800} width={x1 - x0} height={bot + 800} fill={`url(#${gradId})`} />
      {hills && (
        <g>
          <path d={hills.far} transform={`translate(${dx * 0.55} 0)`} fill={pal.hillFar} />
          <path d={hills.mid} transform={`translate(${dx * 0.32} 0)`} fill={pal.hillMid} />
          <path d={hills.near} transform={`translate(${dx * 0.14} 0)`} fill={pal.hillNear} />
        </g>
      )}
      {gy !== null && (
        <g>
          <rect x={x0} y={gy} width={x1 - x0} height={bot - gy} fill={pal.ground} />
          <rect x={x0} y={gy} width={x1 - x0} height={18} fill={pal.groundTop} />
          <line x1={x0} y1={gy} x2={x1} y2={gy} stroke={pal.line} strokeWidth={LINE.outer} />
        </g>
      )}
      {children}
    </svg>
  );
};

/**
 * Sân khấu sa bàn chiến thuật cục bộ nhìn từ trên xuống (đặt trong `<Cam2D>`): đường đồng mức `contours` + lưới ô vuông.
 * Dùng cho trận đánh cấp tiểu đoàn / đại đội, phục kích, hoả lực chéo, đội hình hoặc học thuyết — nơi cần vẽ địa hình cục bộ (sông, đường, rừng, công sự, xe/pháo) thay vì bản đồ thế giới.
 */
export const TopStage: React.FC<{
  width?: number;
  height?: number;
  seed?: string;
  tone?: 'light' | 'dark';
  gridStep?: number;
  showContours?: boolean;
  levels?: number;
  children?: React.ReactNode;
}> = ({ width = 2400, height = 1400, seed = 'tac', tone = 'light', gridStep = 160, showContours = true, levels = 8, children }) => {
  const lines = useMemo(() => (showContours ? contours(seed, width, height, levels, 18, 520) : []), [showContours, seed, width, height, levels]);
  const bg = tone === 'light' ? P.bg : M.land;
  const gridCol = tone === 'light' ? '#cfdbe6' : M.grid;
  const contCol = tone === 'light' ? '#b8c7b0' : '#2c4c6e';
  const nx = Math.ceil(width / gridStep), ny = Math.ceil(height / gridStep);
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
      <Defs2D />
      <rect x={-400} y={-400} width={width + 800} height={height + 800} fill={bg} />
      <g stroke={gridCol} strokeWidth={1} opacity={tone === 'light' ? 0.55 : 0.28}>
        {Array.from({ length: nx + 1 }, (_, i) => <line key={`gx${i}`} x1={i * gridStep} y1={0} x2={i * gridStep} y2={height} />)}
        {Array.from({ length: ny + 1 }, (_, j) => <line key={`gy${j}`} x1={0} y1={j * gridStep} x2={width} y2={j * gridStep} />)}
      </g>
      {lines.length > 0 && (
        <g fill="none" stroke={contCol} strokeLinecap="round">
          {lines.map((l) => <path key={l.level} d={l.d} strokeWidth={l.level % 3 === 0 ? 1.8 : 1} opacity={l.level % 3 === 0 ? 0.55 : 0.32} />)}
        </g>
      )}
      {children}
    </svg>
  );
};

// ---------------------------------------------------------------- Người lính tối giản (port chuẩn từ kit/rig.ts cũ)

export interface SoldierSkin {
  body: string;
  limb: string;
  hat: boolean;
}

export const SKINS = {
  ally: { body: P.olive, limb: P.oliveDark, hat: true },
  blue: { body: P.ally, limb: P.allyDark, hat: true },
  foe: { body: P.enemy, limb: P.enemyDark, hat: true },
  civil: { body: '#5b8ac9', limb: '#3f679e', hat: false },
} satisfies Record<string, SoldierSkin>;

export type WeaponKind = 'rifle' | 'tube' | null;

export interface SoldierOpts {
  x: number;
  /** Toạ độ Y mặt đất tại chân người lính. */
  y: number;
  /** Hệ số tỉ lệ (ở `s = 1`, người cao ~100 px thế giới). */
  s?: number;
  /** `1` = nhìn sang phải (`+X`), `-1` = nhìn sang trái (`-X`). */
  dir?: 1 | -1;
  skin?: SoldierSkin | keyof typeof SKINS;
  /** Pha bước đi (vd `t * 8`); bỏ trống = đứng yên. */
  walk?: number;
  /** `'prone'` = nằm sấp bắn (súng vẫn hướng ra trước) · `'dead'` = ngã nằm, rơi súng. */
  lie?: 'prone' | 'dead' | null;
  /** Góc nâng tay + súng tính bằng radian (`0` = bắn ngang, `+` = chếch lên trời, `-` = chúc xuống). */
  aim?: number;
  /** Vũ khí cầm tay: `'rifle'` (mặc định), `'tube'` (ống phóng chống tăng / RPG), hoặc `null`. */
  weapon?: WeaponKind;
  opacity?: number;
}

export interface SoldierSockets {
  head: Pt;
  hand: Pt;
  /** Toạ độ miệng nòng trong không gian thế giới (khi cầm vũ khí). */
  muzzle?: Pt;
  /** Góc bắn tính bằng radian trong không gian thế giới. */
  muzzleRad?: number;
  /** Góc bắn tính bằng độ — truyền thẳng vào `<Muzzle2D angle={so.muzzleDeg} />`. */
  muzzleDeg?: number;
  /** Hộp bao thế giới — truyền được vào `fitBox(so.box)`. */
  box: Box;
}

const SH: Pt = [0, -61]; // khớp vai cục bộ

/** Tính trước các điểm gắn (`head`, `hand`, `muzzle`, `muzzleDeg`, `box`) khớp tuyệt đối với hình vẽ `<Soldier2D>`. */
export function soldierSockets(o: SoldierOpts): SoldierSockets {
  const s = o.s ?? 1, dir = o.dir ?? 1;
  const wp: WeaponKind = o.lie === 'dead' ? null : o.weapon === undefined ? 'rifle' : o.weapon;
  const rot = o.lie === 'prone' ? Math.PI / 2 : o.lie === 'dead' ? -Math.PI / 2 : 0;
  const arm = (o.aim ?? 0) + (o.lie === 'prone' ? Math.PI / 2 : 0);

  const T = (q: Pt): Pt => {
    let [x, y] = q;
    if (rot) {
      const cs = Math.cos(rot), sn = Math.sin(rot);
      [x, y] = [x * cs - y * sn, x * sn + y * cs - 11];
    }
    return [o.x + dir * s * x, o.y + s * y];
  };
  const inArm = (q: Pt): Pt => {
    const cs = Math.cos(-arm), sn = Math.sin(-arm);
    return [SH[0] + q[0] * cs - q[1] * sn, SH[1] + q[0] * sn + q[1] * cs];
  };

  const so: SoldierSockets = {
    head: T([0, -88]),
    hand: T(inArm([12, -1])),
    box: { x: 0, y: 0, w: 0, h: 0 },
  };
  if (wp) {
    so.muzzle = T(inArm(wp === 'tube' ? [58, -17] : [34, -3]));
    const a = rot - arm;
    so.muzzleRad = dir > 0 ? a : Math.PI - a;
    so.muzzleDeg = deg(so.muzzleRad);
  }
  const pts: Pt[] = [T([-14, -101]), T([14, -101]), T([-14, 2]), T([14, 2]), ...(so.muzzle ? [so.muzzle] : [])];
  const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
  so.box = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  return so;
}

/**
 * Người lính 2D tối giản (gốc toạ độ ở chân trên mặt đất, cao ~100 px ở `s = 1`):
 * hai chân nét thẳng, thân khối bo góc, đầu tròn + mũ vòm, tay cầm súng trường hoặc ống phóng.
 * Dùng kèm `soldierSockets(props)` khi cần lấy `muzzle` / `muzzleDeg` cho `<Muzzle2D>` hoặc `<Tracer2D>`.
 */
export const Soldier2D: React.FC<SoldierOpts> = (o) => {
  const s = o.s ?? 1, dir = o.dir ?? 1, op = o.opacity ?? 1;
  if (op <= 0.004) return null;
  const sk: SoldierSkin = typeof o.skin === 'string' ? SKINS[o.skin] : o.skin ?? SKINS.ally;
  const wp: WeaponKind = o.lie === 'dead' ? null : o.weapon === undefined ? 'rifle' : o.weapon;
  const rotDeg = o.lie === 'prone' ? 90 : o.lie === 'dead' ? -90 : 0;
  const armDeg = deg((o.aim ?? 0) + (o.lie === 'prone' ? Math.PI / 2 : 0));
  const sw = o.walk === undefined || o.lie ? 0 : Math.sin(o.walk) * 14;

  return (
    <g opacity={op} transform={`translate(${o.x} ${o.y}) scale(${dir * s} ${s})`}>
      <g transform={rotDeg ? `translate(0 -11) rotate(${rotDeg})` : undefined}>
        <line x1={0} y1={-34} x2={-sw} y2={0} stroke={sk.limb} strokeWidth={7} strokeLinecap="round" />
        <line x1={0} y1={-34} x2={sw} y2={0} stroke={sk.limb} strokeWidth={7} strokeLinecap="round" />
        <rect x={-11} y={-76} width={22} height={46} rx={8} fill={sk.body} stroke={P.ink} strokeWidth={2.5} />
        <circle cx={0} cy={-88} r={10} fill={P.skin} stroke={P.ink} strokeWidth={2.5} />
        {sk.hat && <path d="M -11 -90 A 11 11 0 0 1 11 -90 Z" fill={sk.limb} stroke={P.ink} strokeWidth={2.5} strokeLinejoin="round" />}
        <g transform={`translate(${SH[0]} ${SH[1]}) rotate(${-armDeg})`}>
          {wp === 'rifle' && <line x1={6} y1={-1} x2={34} y2={-3} stroke={P.dark} strokeWidth={6} strokeLinecap="round" />}
          {wp === 'tube' && (
            <>
              <line x1={-30} y1={-9} x2={40} y2={-17} stroke={P.dark} strokeWidth={7} strokeLinecap="round" />
              <polygon points="40,-23 58,-17 40,-11" fill={M.red} stroke={P.ink} strokeWidth={2} strokeLinejoin="round" />
            </>
          )}
          <line x1={0} y1={1} x2={12} y2={-1} stroke={sk.limb} strokeWidth={6} strokeLinecap="round" />
        </g>
      </g>
    </g>
  );
};

// ---------------------------------------------------------------- Chiến thuật & Hoả lực 2D (quạt bắn, đạn vạch, cầu vồng, xung kích)

/**
 * Góc quạt tầm bắn / vùng quan sát / hoả lực chéo (đặt trong `<TopStage>`, `<SideStage>` hoặc bản đồ):
 * tâm tại `at`, bán kính `r`, quét từ góc `a0` tới `a1` (độ; `0` = sang phải `+X`, `-90` = lên trên).
 */
export const Fan2D: React.FC<{
  t: number;
  at: Pt;
  r: number;
  a0: number;
  a1: number;
  from: number;
  dur?: number;
  until?: number;
  side?: Side | string;
  fill?: number;
  k?: number;
}> = ({ t, at, r, a0, a1, from, dur = 0.7, until, side = 'red', fill = 0.16, k = 1 }) => {
  const p = prog(t, from, from + dur);
  const vis = until === undefined ? 1 : 1 - prog(t, until - 0.35, until);
  if (p <= 0.004 || vis <= 0.004) return null;
  const color = sideColor(side);
  const rr = r * p;
  const r0 = (a0 * Math.PI) / 180, r1 = (a1 * Math.PI) / 180;
  const x0 = at[0] + Math.cos(r0) * rr, y0 = at[1] + Math.sin(r0) * rr;
  const x1 = at[0] + Math.cos(r1) * rr, y1 = at[1] + Math.sin(r1) * rr;
  const span = Math.abs(a1 - a0);
  const large = span > 180 ? 1 : 0;
  const sweep = a1 >= a0 ? 1 : 0;
  const wedge = `M ${at[0]} ${at[1]} L ${x0} ${y0} A ${rr} ${rr} 0 ${large} ${sweep} ${x1} ${y1} Z`;
  const arc = `M ${x0} ${y0} A ${rr} ${rr} 0 ${large} ${sweep} ${x1} ${y1}`;
  return (
    <g opacity={vis}>
      <path d={wedge} fill={color} fillOpacity={fill} />
      <line x1={at[0]} y1={at[1]} x2={x0} y2={y0} stroke={color} strokeWidth={2 * k} strokeOpacity={0.75} />
      <line x1={at[0]} y1={at[1]} x2={x1} y2={y1} stroke={color} strokeWidth={2 * k} strokeOpacity={0.75} />
      <path d={arc} fill="none" stroke={color} strokeWidth={2.6 * k} strokeDasharray={`${10 * k} ${7 * k}`} />
    </g>
  );
};

/**
 * Đạn bắn thẳng vệt sáng (`Tracer2D`): một tia đạn ngắn lao vút từ `fromPt` sang `toPt` trong `[at, at + dur]` rồi tắt hẳn (không treo vệt tĩnh).
 */
export const Tracer2D: React.FC<{
  t: number;
  fromPt: Pt;
  toPt: Pt;
  at: number;
  dur?: number;
  len?: number;
  color?: string;
  core?: string;
  width?: number;
  k?: number;
}> = ({ t, fromPt, toPt, at, dur = 0.22, len = 0.22, color = '#ff9f2e', core = '#fff7d6', width = 4.5, k = 1 }) => {
  const u = (t - at) / Math.max(0.02, dur);
  if (u <= 0 || u >= 1 + len) return null;
  const h = clamp(u), tl = clamp(u - len);
  if (h - tl <= 0.002) return null;
  const ax = lerp(fromPt[0], toPt[0], tl), ay = lerp(fromPt[1], toPt[1], tl);
  const bx = lerp(fromPt[0], toPt[0], h), by = lerp(fromPt[1], toPt[1], h);
  return (
    <g strokeLinecap="round">
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={color} strokeWidth={width * 1.9 * k} opacity={0.42} />
      <line x1={ax} y1={ay} x2={bx} y2={by} stroke={core} strokeWidth={width * k} />
    </g>
  );
};

/** Điểm + hướng tiếp tuyến dọc quỹ đạo cầu vồng từ `fromPt` sang `toPt` ở tiến độ `p` (0..1), nhô cao `lift` px. */
export const arcPoint = (fromPt: Pt, toPt: Pt, p: number, lift = 220): { pos: Pt; rad: number; deg: number } => {
  const u = clamp(p);
  const x = lerp(fromPt[0], toPt[0], u);
  const y = lerp(fromPt[1], toPt[1], u) - 4 * lift * u * (1 - u);
  const dx = toPt[0] - fromPt[0];
  const dy = toPt[1] - fromPt[1] - 4 * lift * (1 - 2 * u);
  const r = Math.atan2(dy, dx);
  return { pos: [x, y], rad: r, deg: deg(r) };
};

/**
 * Đạn cầu vồng pháo / cối / tên lửa (`ArcShot2D`): vẽ đường quỹ đạo đứt nét mọc theo quả đạn + đầu đạn xoay đúng tiếp tuyến, chạm đích tại `at + dur`.
 * Kết hợp `<Blast2D t={t} at={at + dur} x={toPt[0]} y={toPt[1]} />` để nổ đúng khoảnh khắc chạm đất.
 */
export const ArcShot2D: React.FC<{
  t: number;
  fromPt: Pt;
  toPt: Pt;
  at: number;
  dur?: number;
  lift?: number;
  trailUntil?: number;
  side?: Side | string;
  shellSize?: number;
  k?: number;
}> = ({ t, fromPt, toPt, at, dur = 1.25, lift = 220, trailUntil, side = 'amber', shellSize = 15, k = 1 }) => {
  if (t < at) return null;
  const endTrail = trailUntil ?? at + dur + 1.2;
  if (t > endTrail) return null;
  const p = clamp((t - at) / Math.max(0.05, dur));
  const trailVis = t <= at + dur ? 1 : 1 - prog(t, endTrail - 0.5, endTrail);
  const color = sideColor(side);
  const steps = 36;
  const n = Math.max(1, Math.round(steps * p));
  const d = Array.from({ length: n + 1 }, (_, i) => {
    const q = arcPoint(fromPt, toPt, (p * i) / n, lift).pos;
    return `${i === 0 ? 'M' : 'L'}${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
  }).join(' ');
  const cur = arcPoint(fromPt, toPt, p, lift);
  const flying = t < at + dur;
  const sz = shellSize * k;
  return (
    <g>
      {trailVis > 0.004 && (
        <path d={d} fill="none" stroke={color} strokeWidth={3 * k} strokeDasharray={`${10 * k} ${8 * k}`} opacity={0.78 * trailVis} strokeLinecap="round" />
      )}
      {flying && (
        <g transform={`translate(${cur.pos[0]} ${cur.pos[1]}) rotate(${cur.deg})`}>
          <polygon points={`${sz},0 ${-sz * 0.65},${-sz * 0.42} ${-sz * 0.4},0 ${-sz * 0.65},${sz * 0.42}`} fill={color} stroke={P.ink} strokeWidth={2 * k} strokeLinejoin="round" />
        </g>
      )}
    </g>
  );
};

/** Vòng sóng xung kích lan nhanh tại `(x, y)` lúc `at` — nhấn khoảnh khắc xuyên giáp, va chạm hoặc vụ nổ lớn. */
export const Shock2D: React.FC<{
  t: number;
  at: number;
  x: number;
  y: number;
  r?: number;
  dur?: number;
  color?: string;
  k?: number;
}> = ({ t, at, x, y, r = 130, dur = 0.45, color = '#fff5d6', k = 1 }) => {
  const dt = t - at;
  if (dt <= 0 || dt >= dur) return null;
  const p = 1 - (1 - dt / dur) ** 3;
  return <circle cx={x} cy={y} r={r * p} fill="none" stroke={color} strokeWidth={5 * (1 - p) * k + 0.8 * k} opacity={1 - p} />;
};

// ---------------------------------------------------------------- Lớp màn hình (ngoài Cam2D) & Xem trước Part 2D

/**
 * Khung ngắm 4 góc vuông (`FocusBox`, đặt NGOÀI `<Cam2D>` theo toạ độ màn hình 1920×1080; dùng `screenOf(cam, pt)` để bám điểm thế giới).
 * Khoanh vùng cụm cơ chế / bộ phận bên trong / điểm giao chiến đang được giải thích.
 */
export const FocusBox: React.FC<{
  t: number;
  x: number;
  y: number;
  w: number;
  h: number;
  from: number;
  until?: number;
  color?: string;
  corner?: number;
  strokeWidth?: number;
}> = ({ t, x, y, w, h, from, until, color = M.amber, corner = 22, strokeWidth = 3.2 }) => {
  const p = prog(t, from, from + 0.32);
  const out = until === undefined ? 1 : 1 - prog(t, until - 0.28, until);
  const vis = p * out;
  if (vis <= 0.004) return null;
  const scale = 1.16 - 0.16 * p;
  const hw = (w * scale) / 2, hh = (h * scale) / 2, c = Math.min(corner, hw * 0.6, hh * 0.6);
  const corners = [
    `M ${x - hw} ${y - hh + c} L ${x - hw} ${y - hh} L ${x - hw + c} ${y - hh}`,
    `M ${x + hw - c} ${y - hh} L ${x + hw} ${y - hh} L ${x + hw} ${y - hh + c}`,
    `M ${x - hw} ${y + hh - c} L ${x - hw} ${y + hh} L ${x - hw + c} ${y + hh}`,
    `M ${x + hw - c} ${y + hh} L ${x + hw} ${y + hh} L ${x + hw} ${y + hh - c}`,
  ].join(' ');
  return (
    <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: vis }}>
      <path d={corners} fill="none" stroke="rgba(6,10,18,0.55)" strokeWidth={strokeWidth + 2.4} strokeLinecap="round" strokeLinejoin="round" />
      <path d={corners} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

export type Part2DSlot = {
  label: string;
  render: () => React.ReactNode;
  bg?: string;
};

/**
 * Tạo `export const preview: Preview` cho tài sản 2D trong `src/parts/<Tên>.tsx` để kiểm nhanh bằng `python3 core/tools/check.py <id> --part <Tên>`.
 * Truyền 1–4 trạng thái / góc vẽ (vd: toàn thân ngang, nhìn trên xuống, mặt cắt trong vỏ, trạng thái khai hoả) — mỗi ô tự bọc `<svg 1920×1080>` + `<Defs2D />`.
 */
export function preview2D(slots: Part2DSlot[], defaultBg: string = P.bg): Preview {
  const list: Part2DSlot[] = slots.length >= 4 ? slots : [...slots, ...Array.from({ length: 4 - slots.length }, (_, i) => slots[i % Math.max(1, slots.length)])];
  return {
    views: list.length,
    C: ({ view }) => {
      const slot = list[view % list.length];
      return (
        <AbsoluteFill style={{ background: slot?.bg ?? defaultBg }}>
          <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
            <Defs2D />
            {slot?.render()}
          </svg>
          {slot?.label && (
            <div style={{ position: 'absolute', left: 36, top: 28, padding: '6px 14px', background: 'rgba(15,23,42,0.78)', color: '#f8fafc', fontFamily: FONT, fontSize: 20, fontWeight: 600, borderRadius: 4 }}>
              {slot.label}
            </div>
          )}
        </AbsoluteFill>
      );
    },
  };
}
