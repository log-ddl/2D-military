// Hiệu ứng 2D tất định theo t: nổ, lửa đầu nòng, khói, bụi. Vẽ trong <svg> (toạ độ của cảnh).
import React from 'react';

const r1 = (i: number, k: number, s: number) => { const v = Math.sin(i * 12.9898 + k * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

/** Một cụm khói tròn có viền mềm (nhiều vòng chồng nhau). */
export const Puff2D: React.FC<{ x: number; y: number; r: number; color?: string; opacity?: number; seed?: number }> = ({ x, y, r, color = '#d9d3c7', opacity = 1, seed = 1 }) => {
  if (opacity <= 0.003) return null;
  return (
    <g opacity={opacity}>
      {[0, 1, 2, 3, 4].map((i) => {
        const a = r1(i, 1, seed) * Math.PI * 2, d = r * 0.45 * r1(i, 2, seed);
        return <circle key={i} cx={x + Math.cos(a) * d} cy={y + Math.sin(a) * d} r={r * (0.55 + 0.35 * r1(i, 3, seed))} fill={color} />;
      })}
      <circle cx={x - r * 0.2} cy={y - r * 0.25} r={r * 0.35} fill="#fff" opacity={0.18} />
    </g>
  );
};

/**
 * Nổ tại (x, y) — y là mặt đất — lúc `at`: chớp + cầu lửa + mảnh văng + cột khói bốc lên tan dần. `size` ~ bán kính lửa (px).
 * `air`: nổ trên không (không có bụi đất, mảnh văng toả tròn).
 */
export const Blast2D: React.FC<{ t: number; at: number; x: number; y: number; size?: number; seed?: number; life?: number; air?: boolean; smoke?: string }> = ({
  t, at, x, y, size = 60, seed = 1, life = 5, air = false, smoke = '#8d857a',
}) => {
  const dt = t - at;
  if (dt < 0 || dt > life) return null;
  const fire = Math.max(0, 1 - dt / 0.5);
  return (
    <g>
      {dt < 0.15 && (
        <>
          <defs>
            <radialGradient id={`fl${seed}`}>
              <stop offset="0" stopColor="#fff6d6" stopOpacity={0.9} />
              <stop offset="1" stopColor="#fff6d6" stopOpacity={0} />
            </radialGradient>
          </defs>
          <circle cx={x} cy={y - size * 0.4} r={size * 4} fill={`url(#fl${seed})`} opacity={1 - dt / 0.15} />
        </>
      )}
      {Array.from({ length: 10 }, (_, i) => {
        const born = i * 0.06, age = dt - born;
        if (age < 0) return null;
        const k = age / (life - born);
        const rise = air ? size * 0.4 * age : size * (0.8 + i * 0.25) * ease(age / 2) + age * 12;
        return <Puff2D key={i} seed={seed + i} x={x + (r1(i, 4, seed) - 0.5) * size * 1.4 + age * 10} y={y - size * 0.4 - rise} r={size * (0.7 + ease(age / 2.5) * 1.1)} color={i < 3 && age < 0.6 ? '#4b4038' : smoke} opacity={0.9 * (1 - k)} />;
      })}
      {fire > 0 && (
        <g>
          <circle cx={x} cy={y - size * 0.5} r={size * (0.6 + ease(dt / 0.3) * 0.7)} fill="#ff7a1f" opacity={fire} />
          <circle cx={x} cy={y - size * 0.55} r={size * (0.4 + ease(dt / 0.3) * 0.5)} fill="#ffc04a" opacity={fire} />
          <circle cx={x} cy={y - size * 0.6} r={size * (0.2 + ease(dt / 0.3) * 0.3)} fill="#fff4c2" opacity={fire} />
        </g>
      )}
      {dt < 1.6 && Array.from({ length: 14 }, (_, i) => {
        const a = air ? r1(i, 5, seed) * Math.PI * 2 : -Math.PI * (0.1 + 0.8 * r1(i, 5, seed));
        const v = size * (4 + r1(i, 6, seed) * 5);
        const px = x + Math.cos(a) * v * dt, py = y - size * 0.4 + Math.sin(a) * v * dt + 400 * dt * dt;
        if (!air && py > y) return null;
        return <rect key={i} x={px} y={py} width={size * 0.1} height={size * 0.07} fill="#3a342e" transform={`rotate(${dt * 600 + i * 40} ${px} ${py})`} />;
      })}
      {!air && <ellipse cx={x} cy={y} rx={size * (1 + ease(dt / 1) * 2.5)} ry={size * 0.25} fill="#b8a885" opacity={0.6 * Math.max(0, 1 - dt / 2.5)} />}
    </g>
  );
};

/** Lửa đầu nòng tại (x, y) hướng `angle` độ + khói phụt. */
export const Muzzle2D: React.FC<{ t: number; at: number; x: number; y: number; angle: number; size?: number; seed?: number }> = ({ t, at, x, y, angle, size = 40, seed = 2 }) => {
  const dt = t - at;
  if (dt < 0 || dt > 3) return null;
  const f = Math.max(0, 1 - dt / 0.1);
  const rad = (angle * Math.PI) / 180;
  return (
    <g>
      {Array.from({ length: 8 }, (_, i) => {
        const spread = (r1(i, 1, seed) - 0.5) * 1.6, d = size * (1 + ease(dt / 0.7) * (i < 4 ? 4 : 1.5));
        return <Puff2D key={i} seed={seed + i} x={x + Math.cos(rad + spread) * d} y={y + Math.sin(rad + spread) * d - dt * 20} r={size * (0.5 + ease(dt / 1.5) * 1.2)} color="#e3ddd2" opacity={0.8 * (1 - dt / 3)} />;
      })}
      {f > 0 && (
        <g transform={`translate(${x} ${y}) rotate(${angle})`} opacity={f}>
          <ellipse cx={size * 1.1} cy={0} rx={size * 1.4} ry={size * 0.55} fill="#ffb347" />
          <ellipse cx={size * 0.8} cy={0} rx={size * 0.9} ry={size * 0.35} fill="#fff1b8" />
          <path d={`M0 0 L${size * 0.5} ${-size * 1.2} L${size * 0.7} 0 L${size * 0.5} ${size * 1.2} Z`} fill="#ffcf6a" />
        </g>
      )}
    </g>
  );
};
