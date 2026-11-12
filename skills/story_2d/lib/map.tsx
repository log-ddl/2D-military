// Bản đồ phẳng tối giản kiểu truyện tranh (StoryMap2D) — chỉ dùng 2–5s để định vị nhanh địa danh, tuyến bay
// hoặc thả cột sáng xếp hạng quốc gia (giữ đúng 100% thẩm mỹ hoạt hình 2D của Paper Millions, không dùng ảnh vệ tinh).
import React from 'react';
import { Easing } from 'remotion';
import { GeoMap, type GeoBounds, type GeoProjection, type LonLat } from '@skill/military/2d/map';
import { lerp, prog, useSpring } from '@core/time';
import { S, STROKE } from './theme';
import { StoryDefs } from './stage';
import { StoryText } from './cards';

export type { GeoBounds, GeoProjection, LonLat };
export type StoryMapBounds = GeoBounds | { west: number; south: number; east: number; north: number };
export type StoryMapProjection = GeoProjection & { pt: (lonLat: LonLat) => [number, number] };

export const StoryMap2D: React.FC<{
  bounds: StoryMapBounds;
  tone?: 'day' | 'noir' | 'paper';
  highlight?: Record<string, string>;
  width?: number;
  height?: number;
  children?: (proj: StoryMapProjection) => React.ReactNode;
}> = ({ bounds, tone = 'day', highlight = {}, width = 1920, height = 1080, children }) => {
  const tupleBounds: GeoBounds = Array.isArray(bounds)
    ? bounds
    : [bounds.west, bounds.south, bounds.east, bounds.north];
  const sea = tone === 'noir' ? '#0C1829' : tone === 'paper' ? '#BFD6DE' : '#7AAEC4';
  const land = tone === 'noir' ? '#1A2D46' : tone === 'paper' ? '#EDE5CE' : '#DFD6C0';
  const stroke = tone === 'noir' ? '#070B12' : S.ink;

  const mappedHi: Record<string, { fill: string; stroke: string; strokeWidth: number }> = {};
  for (const [iso, col] of Object.entries(highlight)) {
    mappedHi[iso] = { fill: col, stroke: S.ink, strokeWidth: 3.2 };
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', overflow: 'hidden' }}>
      <GeoMap
        bounds={tupleBounds}
        width={width}
        height={height}
        padding={24}
        seaFill={sea}
        landFill={land}
        landStroke={stroke}
        landStrokeWidth={2.4}
        highlight={mappedHi}
        showGrid={tone === 'noir'}
        gridColor="rgba(148,163,184,0.18)"
        showContours={false}
      >
        {(proj) => (
          <g>
            <StoryDefs />
            {children ? children({ ...proj, pt: proj.project }) : null}
          </g>
        )}
      </GeoMap>
    </svg>
  );
};

/** Ghim đỏ hoạt hình + nhãn địa danh hoặc thẻ số liệu bật lên trên `StoryMap2D` (`600,000 H200 CHIPS`). */
export const MapPin2D: React.FC<{
  t: number;
  from: number;
  at: readonly [number, number];
  label?: string;
  cardTitle?: string;
  cardSub?: string;
  color?: string;
  k?: number;
}> = ({ t, from, at, label, cardTitle, cardSub, color = S.red, k = 1 }) => {
  if (t < from) return null;
  const sp = useSpring(t, from, 10, 200);
  const [x, y] = at;

  return (
    <g transform={`translate(${x.toFixed(1)}, ${y.toFixed(1)}) scale(${(Math.min(1.06, sp) * k).toFixed(3)})`}>
      {/* Chân ghim giọt nước */}
      <path
        d="M 0 0 C -18 -20, -22 -46, 0 -46 C 22 -46, 18 -20, 0 0 Z"
        fill={color}
        stroke={S.ink}
        strokeWidth={STROKE.outer}
      />
      <circle cx={0} cy={-29} r={7} fill={S.white} stroke={S.ink} strokeWidth={2.5} />

      {label && <StoryText x={0} y={26} text={label} size={26} color={S.white} strokeWidth={7} />}

      {cardTitle && (
        <g transform="translate(0, -104)" filter="url(#storyDropHard)">
          <rect x={-125} y={-44} width={250} height={82} rx={10} fill={S.white} stroke={S.ink} strokeWidth={STROKE.outer} />
          <polygon points="-14,38 14,38 0,56" fill={S.white} stroke={S.ink} strokeWidth={STROKE.outer} />
          <StoryText x={0} y={cardSub ? -12 : 0} text={cardTitle} size={30} color={S.ink} strokeWidth={0} />
          {cardSub && <StoryText x={0} y={18} text={cardSub} size={18} color="#475569" strokeWidth={0} />}
        </g>
      )}
    </g>
  );
};

/** Đường bay vòng cung nét đứt nối 2 điểm trên `StoryMap2D` (Santa Clara → Hong Kong, Đài Loan → Mỹ). */
export const MapFlightArc: React.FC<{
  t: number;
  from: number;
  dur?: number;
  a: readonly [number, number];
  b: readonly [number, number];
  lift?: number;
  color?: string;
  k?: number;
}> = ({ t, from, dur = 1.1, a, b, lift = 120, color = S.red, k = 1 }) => {
  if (t < from) return null;
  const p = prog(t, from, from + dur, Easing.bezier(0.25, 0.1, 0.25, 1));
  const mx = (a[0] + b[0]) / 2;
  const my = Math.min(a[1], b[1]) - lift;

  const steps = 28;
  const maxStep = Math.max(1, Math.round(steps * p));
  let d = '';
  for (let i = 0; i <= maxStep; i++) {
    const u = i / steps;
    const px = (1 - u) * (1 - u) * a[0] + 2 * (1 - u) * u * mx + u * u * b[0];
    const py = (1 - u) * (1 - u) * a[1] + 2 * (1 - u) * u * my + u * u * b[1];
    d += `${i === 0 ? 'M' : 'L'}${px.toFixed(1)},${py.toFixed(1)}`;
  }

  return (
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={4.5 * k}
      strokeDasharray={`${12 * k} ${10 * k}`}
      strokeLinecap="round"
    />
  );
};

/** Cột tháp phát sáng thả từ trên trời xuống vị trí quốc gia + tuỳ chọn đội vương miện vàng (cảnh `most valuable company on earth`). */
export const MapPillar2D: React.FC<{
  t: number;
  from: number;
  at: readonly [number, number];
  height?: number;
  width?: number;
  color?: string;
  crownAt?: number;
}> = ({ t, from, at, height = 160, width = 38, color = S.green, crownAt }) => {
  if (t < from) return null;
  const p = prog(t, from, from + 0.35, Easing.out(Easing.cubic));
  const dropY = lerp(-420, 0, p);
  const [x, y] = at;
  const crownSp = crownAt !== undefined && t >= crownAt ? useSpring(t, crownAt, 10, 200) : 0;

  return (
    <g>
      {/* Vệt sáng chiếu từ đỉnh màn hình xuống */}
      <rect x={x - width * 0.45} y={-200} width={width * 0.9} height={y + 200} fill={color} opacity={0.14 * p} />
      <ellipse cx={x} cy={y} rx={width * 1.15} ry={14} fill={color} opacity={0.45 * p} />

      <g transform={`translate(${x.toFixed(1)}, ${(y + dropY).toFixed(1)})`}>
        <rect
          x={-width / 2}
          y={-height}
          width={width}
          height={height}
          rx={4}
          fill={color}
          stroke={S.ink}
          strokeWidth={STROKE.outer}
        />
        {crownSp > 0.01 && (
          <polygon
            points={`${-width * 0.62},${-height - 4} ${-width * 0.72},${-height - 32} ${-width * 0.22},${-height - 16} 0,${-height - 38} ${width * 0.22},${-height - 16} ${width * 0.72},${-height - 32} ${width * 0.62},${-height - 4}`}
            fill={S.gold}
            stroke={S.ink}
            strokeWidth={3.5}
            transform={`scale(${Math.min(1.08, crownSp).toFixed(3)})`}
          />
        )}
      </g>
    </g>
  );
};
