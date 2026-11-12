// Ký hiệu tác chiến vẽ trên bản đồ (SVG, toạ độ thế giới — đặt trong hàm con của <GeoBase> / <SatBase>):
// mũi tiến công, đường mặt trận, vùng kiểm soát, tuyến tiếp tế, vòng tầm bắn, ký hiệu đơn vị, tên địa danh.
// Mọi thứ tất định theo `t` (giây voice tuyệt đối). `k` = 1 / zoom của Cam2D để nét và chữ giữ nguyên cỡ trên màn hình khi máy phóng vào.
import React from 'react';
import { prog } from '@core/time';
import { FONT, M, sideColor, type Side } from './theme';

export type Pt = [number, number];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const fade = (t: number, from: number, until?: number, i = 0.35, o = 0.35) => prog(t, from, from + i) * (until === undefined ? 1 : 1 - prog(t, until - o, until));

/** Lấy mẫu đường cong mượt (Catmull-Rom) đi qua `pts` thành `n` điểm cách đều theo tham số. */
export const sampleCurve = (pts: Pt[], n = 64): Pt[] => {
  if (pts.length < 3) return pts.length === 2 ? Array.from({ length: n + 1 }, (_, i) => [pts[0][0] + ((pts[1][0] - pts[0][0]) * i) / n, pts[0][1] + ((pts[1][1] - pts[0][1]) * i) / n] as Pt) : pts;
  const P = [pts[0], ...pts, pts[pts.length - 1]];
  const out: Pt[] = [];
  const segs = pts.length - 1;
  for (let i = 0; i <= n; i++) {
    const u = (i / n) * segs, s = Math.min(segs - 1, Math.floor(u)), f = u - s;
    const [p0, p1, p2, p3] = [P[s], P[s + 1], P[s + 2], P[s + 3]];
    const c = (a: number, b: number, cc: number, d: number) => 0.5 * (2 * b + (-a + cc) * f + (2 * a - 5 * b + 4 * cc - d) * f * f + (-a + 3 * b - 3 * cc + d) * f * f * f);
    out.push([c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1])]);
  }
  return out;
};

/** Cắt đường gấp khúc tại phần `p` (0..1) chiều dài; trả các điểm tới đó + hướng (radian) ở mút. */
export const cutAt = (line: Pt[], p: number): { pts: Pt[]; tip: Pt; angle: number; length: number } => {
  const acc = [0];
  for (let i = 1; i < line.length; i++) acc.push(acc[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]));
  const total = acc[acc.length - 1], want = total * clamp(p);
  const out: Pt[] = [line[0]];
  let tip = line[0], angle = line.length > 1 ? Math.atan2(line[1][1] - line[0][1], line[1][0] - line[0][0]) : 0;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1], b = line[i];
    angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    if (acc[i] >= want) {
      const f = acc[i] === acc[i - 1] ? 0 : (want - acc[i - 1]) / (acc[i] - acc[i - 1]);
      tip = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      out.push(tip);
      return { pts: out, tip, angle, length: total };
    }
    out.push(b);
    tip = b;
  }
  return { pts: out, tip, angle, length: total };
};

const line = (pts: Pt[], close = false) => (pts.length ? 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + (close ? ' Z' : '') : '');

/**
 * Mũi tiến công: thân thuôn (đuôi hẹp, đầu rộng) chạy dọc đường cong qua `pts`, mọc dần từ `from` trong `dur` giây, đầu mũi tên luôn ở mút.
 * `width` = bề rộng thân ở đầu (px thế giới). `feint` = nét đứt (nghi binh / dự kiến). `retreat` = rút lui (thân rỗng).
 */
export const Arrow2D: React.FC<{ t: number; pts: Pt[]; from: number; dur?: number; until?: number; side?: Side | string; width?: number; k?: number; feint?: boolean; retreat?: boolean; opacity?: number }> = ({
  t, pts, from, dur = 1.6, until, side = 'red', width = 22, k = 1, feint, retreat, opacity = 1,
}) => {
  const p = prog(t, from, from + dur);
  const vis = (until === undefined ? 1 : 1 - prog(t, until - 0.4, until)) * opacity;
  if (p <= 0.004 || vis <= 0.004 || pts.length < 2) return null;
  const color = sideColor(side), w = width * k;
  const { pts: body, tip, angle, length } = cutAt(sampleCurve(pts, 72), p);
  const head = Math.min(w * 2.1, length * p * 0.6);
  const stem = cutAt(body, Math.max(0, 1 - head / Math.max(1, length * p))).pts;   // thân dừng trước đầu mũi tên
  const left: Pt[] = [], right: Pt[] = [];
  stem.forEach((q, i) => {
    const a = stem[Math.max(0, i - 1)], b = stem[Math.min(stem.length - 1, i + 1)];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) + Math.PI / 2;
    const half = (w / 2) * (0.28 + 0.72 * (i / Math.max(1, stem.length - 1)));
    left.push([q[0] + Math.cos(ang) * half, q[1] + Math.sin(ang) * half]);
    right.push([q[0] - Math.cos(ang) * half, q[1] - Math.sin(ang) * half]);
  });
  const hx = Math.cos(angle), hy = Math.sin(angle);
  const base: Pt = [tip[0] - hx * head, tip[1] - hy * head];
  const tri: Pt[] = [tip, [base[0] - hy * w * 1.05, base[1] + hx * w * 1.05], [base[0] + hy * w * 1.05, base[1] - hx * w * 1.05]];
  const shape = line([...left, ...right.reverse()], true);
  const hollow = feint || retreat;
  return (
    <g opacity={vis}>
      <path d={shape} transform={`translate(0 ${4 * k})`} fill="rgba(2,6,12,0.45)" />
      <path d={shape} fill={hollow ? 'none' : color} fillOpacity={0.9} stroke={color} strokeWidth={(hollow ? 2.6 : 1.2) * k} strokeLinejoin="round" strokeDasharray={feint ? `${10 * k} ${8 * k}` : undefined} />
      <path d={line(tri, true)} fill={retreat ? 'none' : color} stroke={color} strokeWidth={(hollow ? 2.6 : 1.2) * k} strokeLinejoin="round" />
    </g>
  );
};

/**
 * Đường mặt trận: nét đậm qua `pts`, răng tam giác chĩa về phía `teeth` ('left' | 'right' so với chiều vẽ; 'none' = ranh giới thường).
 * Dịch chuyển mặt trận: truyền `to` (cùng số điểm) và `shift` 0..1 (thường là prog(t, a, b)).
 */
export const FrontLine: React.FC<{ t: number; pts: Pt[]; to?: Pt[]; shift?: number; from: number; dur?: number; until?: number; side?: Side | string; teeth?: 'left' | 'right' | 'none'; k?: number; width?: number; dashed?: boolean }> = ({
  t, pts, to, shift = 0, from, dur = 1.4, until, side = 'red', teeth = 'left', k = 1, width = 5, dashed,
}) => {
  const p = prog(t, from, from + dur);
  const vis = until === undefined ? 1 : 1 - prog(t, until - 0.4, until);
  if (p <= 0.004 || vis <= 0.004) return null;
  const s = clamp(shift);
  const cur = to && to.length === pts.length ? pts.map(([x, y], i) => [x + (to[i][0] - x) * s, y + (to[i][1] - y) * s] as Pt) : pts;
  const full = sampleCurve(cur, 96);
  const { pts: drawn, length } = cutAt(full, p);
  const color = sideColor(side), sgn = teeth === 'left' ? -1 : 1, gap = 34 * k, tooth = 9 * k;
  const marks: string[] = [];
  if (teeth !== 'none') {
    for (let d = gap / 2; d < length * p; d += gap) {
      const c = cutAt(full, d / length);
      const nx = -Math.sin(c.angle) * sgn, ny = Math.cos(c.angle) * sgn, tx = Math.cos(c.angle), ty = Math.sin(c.angle);
      marks.push(line([[c.tip[0] - tx * tooth, c.tip[1] - ty * tooth], [c.tip[0] + nx * tooth * 1.5, c.tip[1] + ny * tooth * 1.5], [c.tip[0] + tx * tooth, c.tip[1] + ty * tooth]], true));
    }
  }
  return (
    <g opacity={vis}>
      <path d={line(drawn)} fill="none" stroke="rgba(2,6,12,0.5)" strokeWidth={(width + 5) * k} strokeLinecap="round" strokeLinejoin="round" />
      <path d={line(drawn)} fill="none" stroke={color} strokeWidth={width * k} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? `${14 * k} ${10 * k}` : undefined} />
      {marks.map((d, i) => <path key={i} d={d} fill={color} />)}
    </g>
  );
};

/** Vùng kiểm soát / túi bao vây: đa giác mượt qua `pts`, tô màu phe + gạch chéo. Thu hẹp vòng vây: truyền `to` + `shift` như FrontLine. */
export const Zone2D: React.FC<{ t: number; pts: Pt[]; to?: Pt[]; shift?: number; from: number; until?: number; side?: Side | string; fill?: number; hatch?: boolean; k?: number; id?: string }> = ({
  t, pts, to, shift = 0, from, until, side = 'red', fill = 0.2, hatch = true, k = 1, id = 'z',
}) => {
  const vis = fade(t, from, until, 0.6, 0.5);
  if (vis <= 0.004) return null;
  const s = clamp(shift);
  const cur = to && to.length === pts.length ? pts.map(([x, y], i) => [x + (to[i][0] - x) * s, y + (to[i][1] - y) * s] as Pt) : pts;
  const ring = sampleCurve([...cur, cur[0]], 96);
  const color = sideColor(side), pid = `hatch_${id}`;
  return (
    <g opacity={vis}>
      <defs>
        <pattern id={pid} width={14 * k} height={14 * k} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1={0} y1={0} x2={0} y2={14 * k} stroke={color} strokeWidth={2.2 * k} opacity={0.5} />
        </pattern>
      </defs>
      <path d={line(ring, true)} fill={color} fillOpacity={fill} />
      {hatch && <path d={line(ring, true)} fill={`url(#${pid})`} />}
      <path d={line(ring, true)} fill="none" stroke={color} strokeWidth={2.4 * k} strokeDasharray={`${12 * k} ${7 * k}`} strokeLinejoin="round" />
    </g>
  );
};

/** Tuyến tiếp tế / hành quân: nét đứt chạy dọc `pts`, các vạch trôi theo chiều tuyến (speed px/s; 0 = đứng yên). `cut` = giây tuyến bị cắt (nét tắt dần, hiện dấu X ở `cutPos` 0..1). */
export const Route2D: React.FC<{ t: number; pts: Pt[]; from: number; dur?: number; until?: number; side?: Side | string; k?: number; width?: number; speed?: number; cut?: number; cutPos?: number }> = ({
  t, pts, from, dur = 1.8, until, side = 'amber', k = 1, width = 4, speed = 26, cut, cutPos = 0.5,
}) => {
  const p = prog(t, from, from + dur);
  const vis = until === undefined ? 1 : 1 - prog(t, until - 0.4, until);
  if (p <= 0.004 || vis <= 0.004) return null;
  const full = sampleCurve(pts, 96), color = sideColor(side);
  const { pts: drawn } = cutAt(full, p);
  const dead = cut === undefined ? 0 : prog(t, cut, cut + 0.5);
  const x = cut === undefined ? null : cutAt(full, cutPos).tip, r = 13 * k;
  return (
    <g opacity={vis}>
      <path d={line(drawn)} fill="none" stroke="rgba(2,6,12,0.5)" strokeWidth={(width + 4) * k} strokeLinecap="round" />
      <path d={line(drawn)} fill="none" stroke={color} strokeOpacity={1 - dead * 0.65} strokeWidth={width * k} strokeLinecap="butt" strokeDasharray={`${13 * k} ${9 * k}`} strokeDashoffset={-(dead > 0 ? cut! : t) * speed * k} />
      {x && dead > 0 && (
        <g opacity={dead} stroke={M.red} strokeWidth={5 * k} strokeLinecap="round">
          <line x1={x[0] - r} y1={x[1] - r} x2={x[0] + r} y2={x[1] + r} />
          <line x1={x[0] - r} y1={x[1] + r} x2={x[0] + r} y2={x[1] - r} />
        </g>
      )}
    </g>
  );
};

/** Vòng tầm bắn / bán kính tác chiến: `r` px thế giới (lấy từ proj.km(km, tâm)). Vòng mở ra từ tâm ở `from`; `sweep` = có tia quét radar. */
export const RangeRing: React.FC<{ t: number; at: Pt; r: number; from: number; until?: number; side?: Side | string; k?: number; fill?: number; sweep?: boolean }> = ({ t, at, r, from, until, side = 'amber', k = 1, fill = 0.08, sweep }) => {
  const p = prog(t, from, from + 1.1);
  const vis = until === undefined ? 1 : 1 - prog(t, until - 0.4, until);
  if (p <= 0.004 || vis <= 0.004) return null;
  const color = sideColor(side), rr = r * p, a = (t - from) * 1.4;
  return (
    <g opacity={vis}>
      <circle cx={at[0]} cy={at[1]} r={rr} fill={color} fillOpacity={fill} stroke={color} strokeWidth={2.2 * k} strokeDasharray={`${9 * k} ${7 * k}`} />
      {sweep && <line x1={at[0]} y1={at[1]} x2={at[0] + Math.cos(a) * rr} y2={at[1] + Math.sin(a) * rr} stroke={color} strokeWidth={2 * k} opacity={0.75} />}
      <circle cx={at[0]} cy={at[1]} r={4.5 * k} fill={color} />
    </g>
  );
};

export type UnitKind = 'infantry' | 'armor' | 'mech' | 'artillery' | 'airborne' | 'recon' | 'air' | 'supply' | 'hq';
export type Echelon = 'company' | 'battalion' | 'regiment' | 'brigade' | 'division' | 'corps' | 'army';
const ECH: Record<Echelon, string> = { company: 'I', battalion: 'II', regiment: 'III', brigade: 'X', division: 'XX', corps: 'XXX', army: 'XXXX' };

/**
 * Ký hiệu đơn vị kiểu bản đồ tham mưu: khung chữ nhật màu phe, biểu tượng binh chủng bên trong, vạch cấp đơn vị phía trên, tên bên phải.
 * Di chuyển: đổi `at` theo t (vd lấy cutAt(sampleCurve(tuyến), prog(...)).tip). `hit` = giây đơn vị bị loại khỏi vòng chiến (mờ đi + gạch chéo).
 */
export const UnitMark: React.FC<{ t: number; at: Pt; kind?: UnitKind; echelon?: Echelon; side?: Side | string; name?: string; from: number; until?: number; k?: number; size?: number; hit?: number }> = ({
  t, at, kind = 'infantry', echelon, side = 'blue', name, from, until, k = 1, size = 46, hit,
}) => {
  const vis = fade(t, from, until, 0.3, 0.3);
  if (vis <= 0.004) return null;
  const color = sideColor(side), w = size * k, h = w * 0.66, x = at[0] - w / 2, y = at[1] - h / 2, sw = 2.6 * k;
  const pop = 0.7 + 0.3 * prog(t, from, from + 0.3);
  const dead = hit === undefined ? 0 : prog(t, hit, hit + 0.4);
  const icon = () => {
    const diag = <><line x1={x} y1={y} x2={x + w} y2={y + h} /><line x1={x} y1={y + h} x2={x + w} y2={y} /></>;
    const oval = <rect x={x + w * 0.2} y={y + h * 0.26} width={w * 0.6} height={h * 0.48} rx={h * 0.24} fill="none" />;
    switch (kind) {
      case 'infantry': return diag;
      case 'armor': return oval;
      case 'mech': return <>{diag}{oval}</>;
      case 'artillery': return <circle cx={at[0]} cy={at[1]} r={h * 0.17} fill={M.ink} stroke="none" />;
      case 'recon': return <line x1={x} y1={y + h} x2={x + w} y2={y} />;
      case 'airborne': return <>{diag}<path d={`M${at[0] - w * 0.2} ${y + h * 0.86} q${w * 0.1} ${-h * 0.2} ${w * 0.2} 0 q${w * 0.1} ${-h * 0.2} ${w * 0.2} 0`} fill="none" /></>;
      case 'air': return <path d={`M${at[0]} ${at[1]} c${-w * 0.3} ${-h * 0.42} ${-w * 0.3} ${h * 0.42} 0 0 c${w * 0.3} ${-h * 0.42} ${w * 0.3} ${h * 0.42} 0 0`} fill="none" />;
      case 'supply': return <line x1={x} y1={y + h * 0.74} x2={x + w} y2={y + h * 0.74} />;
      case 'hq': return <line x1={x} y1={y + h} x2={x} y2={y + h * 1.6} />;
    }
  };
  return (
    <g opacity={vis * (1 - dead * 0.6)} transform={`translate(${at[0]} ${at[1]}) scale(${pop}) translate(${-at[0]} ${-at[1]})`}>
      <rect x={x + 3 * k} y={y + 4 * k} width={w} height={h} fill="rgba(2,6,12,0.5)" />
      <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity={0.92} stroke={M.ink} strokeWidth={sw} />
      <g stroke={M.ink} strokeWidth={sw} strokeLinecap="round">{icon()}</g>
      {echelon && <text x={at[0]} y={y - 5 * k} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={13 * k} fill={M.ink} stroke="rgba(2,6,12,0.7)" strokeWidth={3 * k} paintOrder="stroke" letterSpacing={1.5 * k}>{ECH[echelon]}</text>}
      {name && <text x={x + w + 9 * k} y={at[1] + 6 * k} fontFamily={FONT} fontWeight={600} fontSize={18 * k} fill={M.ink} stroke="rgba(2,6,12,0.75)" strokeWidth={4 * k} paintOrder="stroke">{name}</text>}
      {dead > 0 && <g stroke={M.ink} strokeWidth={4 * k} strokeLinecap="round" opacity={dead}><line x1={x - 5 * k} y1={y - 5 * k} x2={x + w + 5 * k} y2={y + h + 5 * k} /></g>}
    </g>
  );
};

/**
 * Chữ trên bản đồ (nằm trong thế giới, đi theo bản đồ khi máy lia). `kind`: 'city' (chấm + tên) | 'region' (IN HOA giãn chữ, mờ — tên nước, vùng)
 * | 'water' (nghiêng — biển, sông) | 'plain' (chỉ chữ). Đây là thành phần DUY NHẤT được vẽ chữ SVG; cảnh và part không tự viết <text>.
 */
export const MapLabel: React.FC<{ t: number; at: Pt; text: string; from: number; until?: number; kind?: 'city' | 'region' | 'water' | 'plain'; k?: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; dx?: number; dy?: number }> = ({
  t, at, text, from, until, kind = 'city', k = 1, size, color, anchor, dx = 0, dy = 0,
}) => {
  const vis = fade(t, from, until);
  if (vis <= 0.004) return null;
  const fs = (size ?? (kind === 'region' ? 30 : kind === 'water' ? 22 : 20)) * k;
  const fill = color ?? (kind === 'region' ? M.dim : kind === 'water' ? '#6f9cc4' : M.ink);
  const m = fill.trim().match(/^#([0-9a-f]{6})$/i);
  const darkFill = m ? (0.299 * ((parseInt(m[1], 16) >> 16) & 255) + 0.587 * ((parseInt(m[1], 16) >> 8) & 255) + 0.114 * (parseInt(m[1], 16) & 255)) / 255 < 0.45 : false;
  const halo = darkFill ? 'rgba(248,250,252,0.88)' : 'rgba(2,6,12,0.78)';
  const city = kind === 'city';
  return (
    <g opacity={vis * (kind === 'region' ? 0.7 : 1)}>
      {city && <><circle cx={at[0]} cy={at[1]} r={6.5 * k} fill={halo} /><circle cx={at[0]} cy={at[1]} r={4.2 * k} fill={fill} /></>}
      <text
        x={at[0] + (city ? 12 * k : 0) + dx * k}
        y={at[1] + (city ? fs * 0.34 : 0) + dy * k}
        textAnchor={anchor ?? (city ? 'start' : 'middle')}
        fontFamily={FONT}
        fontWeight={kind === 'region' ? 700 : 600}
        fontStyle={kind === 'water' ? 'italic' : 'normal'}
        fontSize={fs}
        letterSpacing={kind === 'region' ? fs * 0.28 : 0}
        fill={fill}
        stroke={halo}
        strokeWidth={fs * 0.22}
        paintOrder="stroke"
        strokeLinejoin="round"
      >
        {kind === 'region' ? text.toUpperCase() : text}
      </text>
    </g>
  );
};

/** Chớp giao tranh tại một điểm: vòng xung kích lan ra + lõi sáng, lặp `count` lần cách nhau `every` giây. Dùng cho "nơi đang đánh nhau", không thay cho vụ nổ cụ thể. */
export const Clash2D: React.FC<{ t: number; at: Pt; from: number; count?: number; every?: number; k?: number; side?: Side | string; size?: number }> = ({ t, at, from, count = 3, every = 0.55, k = 1, side = 'amber', size = 34 }) => {
  const color = sideColor(side);
  return (
    <g>
      {Array.from({ length: count }, (_, i) => {
        const p = prog(t, from + i * every, from + i * every + 0.9, (x) => x);
        if (p <= 0 || p >= 1) return null;
        return (
          <g key={i} opacity={1 - p}>
            <circle cx={at[0]} cy={at[1]} r={size * k * (0.25 + p)} fill="none" stroke={color} strokeWidth={3 * k * (1 - p) + 0.6 * k} />
            <circle cx={at[0]} cy={at[1]} r={size * k * 0.22 * (1 - p)} fill="#fff4d6" />
          </g>
        );
      })}
    </g>
  );
};
