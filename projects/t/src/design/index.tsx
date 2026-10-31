// Thiết kế mỹ thuật riêng cho video `t`:
// "Amber Steppe Dusk & Telemetry Cutaway Vault" — đối lập giữa chiến trường thảo nguyên hoàng hôn lạnh
// và buồng giải phẫu vật lý thép tối sâu, đồng nhất chất liệu sơn quân sự NATO/Đông Âu & HUD kỹ thuật.
import React from 'react';
import { loadFont } from '@remotion/google-fonts/SpaceGrotesk';
import { useSpring } from '@core/time';
import type { StageProps } from '@skill/military/3d/stage';
import type { TerrainColors } from '@skill/military/3d/terrain';

export const { fontFamily: HUD_FONT } = loadFont('normal', {
  weights: ['500', '700'],
  subsets: ['latin', 'vietnamese'],
});

export const THEME = {
  // Màu sơn khí tài chủ đạo (bù gamma cho paint() CanvasTexture sRGB → lên hình chuẩn NATO Olive-Slate & Steppe Camo)
  armorBase: '#879378',
  armorCamo1: '#65705a',
  armorCamo2: '#a69d7e',
  armorDark: '#3f463b',
  steelRaw: '#8b95a1',
  steelDark: '#39414a',
  rubber: '#1f2124',

  // Màu mã hoá vật lý & giải phẫu giáp
  armorStrong: '#38b6ff', // Giáp trước 800mm RHA
  armorWeak: '#ff4d2e',   // Tử huyệt giáp mỏng 30-40mm
  copperLiner: '#d87a38', // Phễu đồng nguyên bản
  copperJet: '#ffd166',   // Luồng xuyên kim loại siêu tốc 8 km/s
  explosiveHE: '#f4a236', // Khối thuốc nổ mạnh RDX/Octol
  threatRed: '#ff3b30',   // Đường đạn / khóa mục tiêu đe dọa
  apsCyan: '#00e5ff',     // Vòm radar AESA 360° & đánh chặn chủ động
  amberGold: '#ffb703',   // Nhấn số liệu chiến thuật

  // Bảng màu HUD
  hudBg: 'rgba(11, 18, 28, 0.88)',
  hudText: '#f4f7fb',
  hudMuted: '#93a4b8',
} as const;

/** Cấu hình ánh sáng <Stage> cho các cảnh chiến trường thảo nguyên hoàng hôn lạnh (S01–S04, S07, S10). */
export const STAGE_BATTLE: Omit<StageProps, 'children'> = {
  sky: ['#182842', '#7a6f78', '#d9955f'],
  sun: [-58, 26, 34],
  sunColor: '#ffd29a',
  sunIntensity: 3.1,
  shadowArea: 38,
  fog: [95, 430],
  fogColor: '#8d7973',
  env: 0.42,
  ambient: 0.22,
  exposure: 1.06,
  post: { bloom: 0.78, bloomThreshold: 0.8, ao: 2.3, aoRadius: 2.4, vignette: 0.46 },
};

/** Cấu hình ánh sáng <Stage> cho buồng thử nghiệm & giải phẫu giáp 3D tối sâu (S05, S06, S08, đầu S09). */
export const STAGE_LAB: Omit<StageProps, 'children'> = {
  sky: ['#070d17', '#132033', '#09101b'],
  sun: [34, 54, 28],
  sunColor: '#e8f1ff',
  sunIntensity: 2.75,
  shadowArea: 22,
  fog: [55, 220],
  fogColor: '#0e1826',
  env: 0.5,
  ambient: 0.26,
  exposure: 1.08,
  post: { bloom: 0.88, bloomThreshold: 0.76, ao: 2.4, aoRadius: 2.0, vignette: 0.52 },
};

/** Bảng màu đất thảo nguyên Đông Âu nhiều vệt khô & đá dăm. */
export const TERRAIN_STEPPE: TerrainColors = {
  low: '#3f4830',
  high: '#6d6746',
  rock: '#575149',
  dry: '#968055',
};

/**
 * Nhãn số liệu chiến thuật ngắn gọn (tối đa 1 nhãn trên màn hình khi voice đọc số/thuật ngữ cốt lõi).
 * Bật mượt theo lò xo tại `from`, thu gọn tại `until`.
 */
export const HUDLabel: React.FC<{
  t: number;
  text: string;
  sub?: string;
  x: number;
  y: number;
  from: number;
  until?: number;
  accent?: string;
  size?: number;
}> = ({ t, text, sub, x, y, from, until, accent = THEME.amberGold, size = 44 }) => {
  const s = useSpring(t, from, 13, 170);
  const out = until === undefined ? 1 : 1 - useSpring(t, until, 24, 200);
  if (t < from || out <= 0.002) return null;
  const k = Math.max(0, s * out);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${0.86 + 0.14 * k})`,
        opacity: Math.min(1, k * 1.6),
        background: THEME.hudBg,
        borderLeft: `6px solid ${accent}`,
        borderTop: '1px solid rgba(255,255,255,0.14)',
        borderRight: '1px solid rgba(255,255,255,0.14)',
        borderBottom: '1px solid rgba(255,255,255,0.14)',
        borderRadius: 10,
        padding: `${Math.round(size * 0.26)}px ${Math.round(size * 0.52)}px`,
        boxShadow: `0 14px 32px rgba(0, 0, 0, 0.48), 0 0 22px ${accent}26`,
        fontFamily: HUD_FONT,
        color: THEME.hudText,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontSize: size, fontWeight: 700, letterSpacing: '0.04em', lineHeight: 1.05 }}>{text}</div>
      {sub && (
        <div
          style={{
            fontSize: Math.round(size * 0.42),
            fontWeight: 500,
            color: accent,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginTop: 5,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};
