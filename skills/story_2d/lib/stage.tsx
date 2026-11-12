// Hạ tầng kỹ thuật máy quay 2.5D ba lớp chiều sâu (Whip-Pan + Rack Focus), nguồn sáng an toàn trên Chromium,
// khung chia bố cục trống SplitStage (ngang/dọc) và helper preview đạo cụ `src/parts/`.
// Không chứa bối cảnh đóng hộp — mỗi dự án tự dựng không gian & bảng màu riêng theo đúng kịch bản.
import React, { useId } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { lerp, prog } from '@core/time';
import type { Preview } from '@core/preview';
import { BRUSH_FONT, S, STROKE } from './theme';

export type Pt = readonly [number, number];

export type CamPose = {
  x: number;
  y: number;
  zoom?: number;
  rot?: number;
  shake?: Pt;
};

export type WhipStop = {
  /** Mốc bắt đầu chuyển máy sang điểm này (bỏ trống cho điểm mở đầu). */
  at?: number;
  /** Thời lượng chuyển máy (vd 0.25..0.35s cho cú lia nhanh whip-pan, hoặc 1.5..4s cho lia/zoom mượt). */
  dur?: number;
  x: number;
  y: number;
  zoom?: number;
  rot?: number;
};

/**
 * Nội suy đường đi máy quay qua chuỗi điểm dừng + tự sinh độ nhoè chuyển động theo hướng `blurX, blurY`
 * khi tốc độ lia máy đủ nhanh (whip-pan). Truyền `driftSeed` > 0 để máy có nhịp thở tự nhiên cực nhẹ.
 */
export function whipCam(t: number, stops: WhipStop[], driftSeed = 0): CamPose & { blurX: number; blurY: number } {
  if (!stops.length) return { x: 960, y: 540, zoom: 1, rot: 0, blurX: 0, blurY: 0 };
  let x = stops[0].x;
  let y = stops[0].y;
  let zoom = stops[0].zoom ?? 1;
  let rot = stops[0].rot ?? 0;
  let vx = 0;
  let vy = 0;

  const ease = Easing.bezier(0.28, 0.0, 0.18, 1);
  for (let i = 1; i < stops.length; i++) {
    const st = stops[i];
    const at = st.at ?? 0;
    const dur = Math.max(0.08, st.dur ?? 0.28);
    if (t <= at) break;
    const p = prog(t, at, at + dur, ease);
    const prevX = x, prevY = y, prevZ = zoom, prevR = rot;
    const nx = st.x, ny = st.y, nz = st.zoom ?? prevZ, nr = st.rot ?? prevR;
    x = lerp(prevX, nx, p);
    y = lerp(prevY, ny, p);
    zoom = lerp(prevZ, nz, p);
    rot = lerp(prevR, nr, p);

    if (t > at && t < at + dur) {
      const dt = 0.016;
      const p2 = prog(Math.min(at + dur, t + dt), at, at + dur, ease);
      const speedX = ((Math.abs(nx - prevX) * Math.abs(p2 - p)) / dt) * zoom;
      const speedY = ((Math.abs(ny - prevY) * Math.abs(p2 - p)) / dt) * zoom;
      if (speedX > 1400) vx = Math.min(34, (speedX - 1400) * 0.009);
      if (speedY > 1400) vy = Math.min(28, (speedY - 1400) * 0.009);
    }
  }

  const shake: Pt = driftSeed
    ? [
        Math.sin(t * 1.35 + driftSeed) * 2.2 + Math.sin(t * 2.9 + driftSeed * 3) * 0.8,
        Math.cos(t * 1.1 + driftSeed * 2) * 1.6,
      ]
    : [0, 0];

  return { x, y, zoom, rot, shake, blurX: vx, blurY: vy };
}

/** Căn hộp chủ thể `{x, y, w, h}` vừa khung nhìn `StoryCam`, chiếm tỉ lệ `frac` (mặc định 0.78). */
export function fitBox(box: { x: number; y: number; w: number; h: number }, frac = 0.78): { x: number; y: number; zoom: number } {
  const z = Math.min((1920 * frac) / Math.max(80, box.w), (1080 * frac) / Math.max(80, box.h));
  return { x: box.x + box.w / 2, y: box.y + box.h / 2, zoom: Math.round(z * 1000) / 1000 };
}

/** Đổi toạ độ thế giới `[wx, wy]` sang toạ độ màn hình `[sx, sy]` 1920×1080. */
export function screenOf(cam: CamPose, pt: Pt): [number, number] {
  const z = cam.zoom ?? 1;
  const r = ((cam.rot ?? 0) * Math.PI) / 180;
  const sh = cam.shake ?? [0, 0];
  const dx = (pt[0] - cam.x) * z;
  const dy = (pt[1] - cam.y) * z;
  const c = Math.cos(r), s = Math.sin(r);
  return [960 + sh[0] + dx * c - dy * s, 540 + sh[1] + dx * s + dy * c];
}

/** Bộ SVG defs bóng đổ chuẩn an toàn trên Chromium. */
export const StoryDefs: React.FC = () => (
  <defs>
    <filter id="storyDropSoft" x="-25%" y="-25%" width="150%" height="165%">
      <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="rgba(0,0,0,0.42)" />
    </filter>
    <filter id="storyDropHard" x="-15%" y="-15%" width="135%" height="145%">
      <feDropShadow dx="5" dy="7" stdDeviation="0" floodColor="rgba(8,8,10,0.72)" />
    </filter>
  </defs>
);

export type StoryCamProps = CamPose & {
  /** Màu nền CSS tuỳ chỉnh (mã màu đơn hoặc gradient từ `src/design/palette.ts`). */
  bgColor?: string;
  /** Cặp màu gradient dọc nhanh nếu không truyền `bgColor`. */
  bgTop?: string;
  bgBot?: string;
  /** Vệt nhoè ngang/dọc tự động từ `whipCam(t, ...)`. */
  blurX?: number;
  blurY?: number;
  /** Lớp hậu cảnh xa (thị sai mặc định 0.65, hỗ trợ Rack Focus qua `bgBlur`). */
  bg?: React.ReactNode;
  bgBlur?: number;
  bgParallax?: number;
  /** Làm mờ lớp trung cảnh khi Rack Focus chuyển nét sang hậu cảnh hoặc tiền cảnh. */
  midBlur?: number;
  /** Lớp tiền cảnh gần ống kính (thị sai mặc định 1.28). */
  fg?: React.ReactNode;
  fgBlur?: number;
  fgParallax?: number;
  /** Độ tối bốn góc Vignette (0..1, mặc định 0.45; đặt 0 nếu cảnh sáng trong trẻo không cần tối góc). */
  vignette?: number;
  children?: React.ReactNode;
};

/**
 * Máy quay 2.5D ba lớp chiều sâu (`bg` · `children` trung cảnh · `fg`) kèm:
 * - Bảng màu nền tự do theo thiết kế riêng của từng phim (`bgColor` hoặc `bgTop`/`bgBot`)
 * - Chuyển nét chiều sâu `Rack Focus` (`bgBlur`, `midBlur`, `fgBlur`)
 * - Nhoè hướng chuyển động `Whip-Pan` (`blurX`, `blurY`)
 * - Vignette tuỳ chỉnh độ mạnh
 */
export const StoryCam: React.FC<StoryCamProps> = ({
  x,
  y,
  zoom = 1,
  rot = 0,
  shake = [0, 0],
  bgColor,
  bgTop = '#0F172A',
  bgBot = '#1E293B',
  blurX = 0,
  blurY = 0,
  bg,
  bgBlur = 0,
  bgParallax = 0.65,
  midBlur = 0,
  fg,
  fgBlur = 2.5,
  fgParallax = 1.28,
  vignette = 0.45,
  children,
}) => {
  const uid = useId().replace(/:/g, '');
  const hasWhip = blurX > 0.4 || blurY > 0.4;

  const layerTransform = (parallax: number) => {
    const px = 960 + (x - 960) * parallax;
    const py = 540 + (y - 540) * parallax;
    const pz = 1 + (zoom - 1) * parallax;
    return `translate(${960 + shake[0] * parallax}px, ${540 + shake[1] * parallax}px) rotate(${rot}deg) scale(${pz}) translate(${-px}px, ${-py}px)`;
  };

  return (
    <AbsoluteFill
      style={{
        background: bgColor ?? `linear-gradient(180deg, ${bgTop} 0%, ${bgBot} 100%)`,
        overflow: 'hidden',
      }}
    >
      {hasWhip && (
        <svg width={0} height={0} style={{ position: 'absolute' }}>
          <defs>
            <filter id={`whip_${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation={`${blurX.toFixed(1)},${blurY.toFixed(1)}`} />
            </filter>
          </defs>
        </svg>
      )}

      <AbsoluteFill style={hasWhip ? { filter: `url(#whip_${uid})` } : undefined}>
        {bg && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transformOrigin: '0 0',
              transform: layerTransform(bgParallax),
              filter: bgBlur > 0.15 ? `blur(${bgBlur.toFixed(1)}px)` : undefined,
            }}
          >
            {bg}
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            transformOrigin: '0 0',
            transform: `translate(${960 + shake[0]}px, ${540 + shake[1]}px) rotate(${rot}deg) scale(${zoom}) translate(${-x}px, ${-y}px)`,
            filter: midBlur > 0.15 ? `blur(${midBlur.toFixed(1)}px)` : undefined,
          }}
        >
          {children}
        </div>

        {fg && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              transformOrigin: '0 0',
              transform: layerTransform(fgParallax),
              filter: fgBlur > 0.15 ? `blur(${fgBlur.toFixed(1)}px)` : undefined,
              pointerEvents: 'none',
            }}
          >
            {fg}
          </div>
        )}
      </AbsoluteFill>

      {vignette > 0 && <Vignette strength={vignette} />}
    </AbsoluteFill>
  );
};

/** Lớp tối 4 góc gom thị giác vào tâm điểm. */
export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.45 }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
      background: `radial-gradient(ellipse 72% 68% at 50% 48%, rgba(0,0,0,0) 46%, rgba(0,0,0,${strength.toFixed(2)}) 100%)`,
    }}
  />
);

/** Chùm sáng hình nón chiếu từ nguồn sáng bất kỳ (đặt trong SVG thế giới). */
export const LightCone: React.FC<{
  x: number;
  y: number;
  toX?: number;
  toY?: number;
  topWidth?: number;
  botWidth?: number;
  color?: string;
  opacity?: number;
}> = ({ x, y, toX, toY, topWidth = 80, botWidth = 680, color = '#FFE082', opacity = 0.16 }) => {
  const uid = useId().replace(/:/g, '');
  const tx = toX ?? x;
  const ty = toY ?? y + 760;
  const hw0 = topWidth / 2;
  const hw1 = botWidth / 2;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <linearGradient id={`lc_${uid}`} x1={x} y1={y} x2={tx} y2={ty} gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={color} stopOpacity={opacity * 1.35} />
          <stop offset="70%" stopColor={color} stopOpacity={opacity * 0.45} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`${x - hw0},${y} ${x + hw0},${y} ${tx + hw1},${ty} ${tx - hw1},${ty}`} fill={`url(#lc_${uid})`} />
    </g>
  );
};

/** Vầng hào quang phát sáng nhiều lớp an toàn tuyệt đối khi zoom lớn (không bị Chromium cắt hộp filter). */
export const NeonGlow: React.FC<{
  x: number;
  y: number;
  r?: number;
  rx?: number;
  ry?: number;
  color?: string;
  opacity?: number;
  pulse?: number;
}> = ({ x, y, r = 220, rx, ry, color = S.sky, opacity = 0.36, pulse = 0 }) => {
  const uid = useId().replace(/:/g, '');
  const k = 1 + Math.sin(pulse * 4) * (pulse ? 0.06 : 0);
  const a = (rx ?? r) * k;
  const b = (ry ?? r) * k;
  return (
    <g style={{ pointerEvents: 'none' }}>
      <defs>
        <radialGradient id={`ng_${uid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity={opacity} />
          <stop offset="45%" stopColor={color} stopOpacity={opacity * 0.42} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={x} cy={y} rx={a} ry={b} fill={`url(#ng_${uid})`} />
    </g>
  );
};

export type SplitPanelSpec = {
  /** Giây khung này trượt vào (mặc định hiện từ đầu). */
  from?: number;
  /** Hướng trượt vào của khung. */
  slideFrom?: 'left' | 'right' | 'top' | 'bottom' | 'none';
  /** Tỉ trọng kích thước khung (hỗ trợ giá trị động theo `t` để khung đang nói mở rộng trước rồi nhường chỗ khi khung sau trượt vào). */
  weight?: number;
  /** Màu nền CSS tự do của ô này. */
  bg?: string;
  bgTop?: string;
  bgBot?: string;
  render: (w: number, h: number) => React.ReactNode;
};

/**
 * Khung chia ô bố cục trống (`SplitStage`): hỗ trợ chia cột dọc (`direction="horizontal"`, mặc định)
 * hoặc chia tầng ngang trên–dưới (`direction="vertical"`), kèm lớp `overlay` tuỳ chọn vẽ xuyên qua vách ngăn.
 * Chỉ dùng khi kịch bản thực sự cần đặt song song nhiều vế hoặc đối lập 2 không gian cùng lúc.
 */
export const SplitStage: React.FC<{
  t: number;
  panels: SplitPanelSpec[];
  direction?: 'horizontal' | 'vertical';
  dividerWidth?: number;
  dividerColor?: string;
  vignette?: number;
  overlay?: React.ReactNode;
}> = ({
  t,
  panels,
  direction = 'horizontal',
  dividerWidth = STROKE.panel,
  dividerColor = S.ink,
  vignette = 0.3,
  overlay,
}) => {
  const isVert = direction === 'vertical';
  const totalWeight = panels.reduce((acc, p) => acc + Math.max(0.05, p.weight ?? 1), 0);
  let cursor = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: dividerColor, overflow: 'hidden' }}>
      {panels.map((p, idx) => {
        const frac = Math.max(0.05, p.weight ?? 1) / totalWeight;
        const w = isVert ? 1920 : frac * 1920;
        const h = isVert ? frac * 1080 : 1080;
        const pos = cursor;
        cursor += isVert ? h : w;

        const enterP = p.from !== undefined ? prog(t, p.from, p.from + 0.34, Easing.bezier(0.2, 0.9, 0.25, 1)) : 1;
        if (enterP <= 0.001) return null;

        const defaultDir = isVert
          ? idx === 0
            ? 'top'
            : 'bottom'
          : idx === 0
            ? 'left'
            : idx === panels.length - 1
              ? 'right'
              : 'top';
        const dir = p.slideFrom ?? defaultDir;
        const tx = dir === 'left' ? (1 - enterP) * -w : dir === 'right' ? (1 - enterP) * w : 0;
        const ty = dir === 'top' ? (1 - enterP) * -h : dir === 'bottom' ? (1 - enterP) * h : 0;
        const background = p.bg ?? `linear-gradient(180deg, ${p.bgTop ?? '#0F172A'} 0%, ${p.bgBot ?? '#1E293B'} 100%)`;

        return (
          <div
            key={idx}
            style={{
              position: 'absolute',
              left: isVert ? 0 : pos,
              top: isVert ? pos : 0,
              width: w,
              height: h,
              overflow: 'hidden',
              background,
              borderRight: !isVert && idx < panels.length - 1 ? `${dividerWidth}px solid ${dividerColor}` : undefined,
              borderBottom: isVert && idx < panels.length - 1 ? `${dividerWidth}px solid ${dividerColor}` : undefined,
              boxSizing: 'border-box',
              transform: `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`,
            }}
          >
            {p.render(w, h)}
          </div>
        );
      })}
      {overlay && (
        <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {overlay}
        </svg>
      )}
      {vignette > 0 && <Vignette strength={vignette} />}
    </AbsoluteFill>
  );
};

/** Helper sinh `export const preview = previewStory([...])` cuối mỗi file `src/parts/<Tên>.tsx` để kiểm bằng `check.py --part`. */
export function previewStory(
  slots: { label: string; bg?: string; bgTop?: string; bgBot?: string; render: () => React.ReactNode }[],
): Preview {
  return {
    views: Math.max(1, slots.length),
    C: ({ view }) => {
      const slot = slots[view % slots.length];
      return (
        <AbsoluteFill
          style={{
            background: slot.bg ?? `linear-gradient(180deg, ${slot.bgTop ?? '#0F172A'} 0%, ${slot.bgBot ?? '#1E293B'} 100%)`,
            overflow: 'hidden',
          }}
        >
          <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ position: 'absolute', inset: 0 }}>
            <StoryDefs />
            {slot.render()}
          </svg>
          <Vignette strength={0.35} />
          <div
            style={{
              position: 'absolute',
              left: 36,
              bottom: 32,
              padding: '10px 20px',
              background: S.hudBg,
              borderLeft: `6px solid ${S.sky}`,
              borderRadius: 8,
              color: S.white,
              fontFamily: BRUSH_FONT,
              fontWeight: 700,
              fontSize: 28,
            }}
          >
            {slot.label}
          </div>
        </AbsoluteFill>
      );
    },
  };
}
