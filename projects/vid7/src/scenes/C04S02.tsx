import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld } from '@core/frame';
import { lerp, prog, useT } from '@core/time';
import { Puff2D } from '@skill/military/2d/fx';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { arcAngle, arcAt, arcPath, drawOn, smoothPath, type Pt } from '@skill/military/2d/path';
import { contours } from '@skill/military/2d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { P2D } from '../design/palette';
import { B25Top2D, CompassRose2D } from '../parts/Silhouettes2D';

// Hệ chiếu kinh-vĩ độ thực tế Đông Á (115°E..144°E, 24°N..46.5°N) sang toạ độ hải đồ thế giới (3000 × 2400 px)
const mapX = (lon: number) => 240 + (lon - 116) * 76;
const mapY = (lat: number) => 140 + (45.5 - lat) * 90;
const ll = (lon: number, lat: number): Pt => [mapX(lon), mapY(lat)];

// Đường bờ biển lục địa Liên Xô (Vladivostok) – Triều Tiên – Đông Trung Quốc (Thượng Hải, Chiết Giang, Phúc Kiến)
const MAINLAND_PTS: Pt[] = [
  ll(139.2, 46.8),
  ll(137.4, 45.4),
  ll(135.6, 44.0),
  ll(134.1, 43.1),
  ll(132.9, 42.8), // Nakhodka
  ll(132.3, 43.25),
  ll(131.88, 43.08), // Bán đảo Vladivostok
  ll(131.3, 42.85),
  ll(130.7, 42.45),
  ll(129.8, 41.8), // Đông Bắc Triều Tiên
  ll(128.4, 40.3),
  ll(127.55, 39.25), // Wonsan
  ll(128.7, 38.0),
  ll(129.38, 36.1), // Pohang
  ll(129.08, 35.12), // Busan
  ll(127.8, 34.68),
  ll(126.35, 34.48), // Tây Nam Triều Tiên
  ll(126.55, 35.85),
  ll(126.62, 37.45), // Incheon
  ll(125.25, 37.85),
  ll(125.45, 38.72),
  ll(124.35, 39.88), // Cửa sông Áp Lục
  ll(122.8, 39.55),
  ll(121.18, 38.82), // Bán đảo Liêu Đông (Đại Liên)
  ll(122.15, 40.58),
  ll(120.75, 40.55),
  ll(119.55, 39.85),
  ll(117.85, 38.98), // Vịnh Bột Hải
  ll(118.95, 38.05),
  ll(119.95, 37.25),
  ll(121.38, 37.55), // Yantai
  ll(122.58, 37.38), // Mũi Sơn Đông
  ll(120.42, 36.08), // Thanh Đảo
  ll(119.45, 35.05),
  ll(120.32, 33.95), // Giang Tô
  ll(121.05, 32.55),
  ll(121.88, 31.58), // Cửa Trường Giang
  ll(121.65, 31.12), // Thượng Hải
  ll(120.88, 30.55), // Vịnh Hàng Châu
  ll(121.75, 29.98), // Ninh Ba / Chu Sơn
  ll(121.95, 29.35), // Bờ biển Chiết Giang (đích chạm bờ của 15 chiếc B-25)
  ll(121.52, 28.58),
  ll(120.82, 27.88), // Ôn Châu
  ll(120.25, 26.95),
  ll(119.75, 25.95), // Phúc Châu
  ll(118.78, 24.85),
  ll(117.4, 23.8),
  ll(112.5, 23.8),
  ll(112.5, 46.8),
];

// Quần đảo Nhật Bản: Honshu, Kyushu, Shikoku, Hokkaido và các đảo lân cận
const HONSHU_PTS: Pt[] = [
  ll(140.85, 41.32),
  ll(141.45, 40.2),
  ll(141.85, 39.1),
  ll(141.1, 38.28), // Sendai
  ll(140.88, 36.8),
  ll(140.82, 35.72), // Choshi
  ll(139.95, 35.15),
  ll(139.78, 35.58), // Vịnh Tokyo
  ll(138.92, 34.72), // Izu
  ll(138.1, 34.68),
  ll(136.92, 34.92), // Nagoya / Vịnh Ise
  ll(136.75, 34.25),
  ll(135.78, 33.48), // Bán đảo Kii
  ll(135.18, 34.58), // Osaka / Kobe
  ll(133.85, 34.45),
  ll(132.45, 34.28), // Hiroshima
  ll(130.92, 33.98), // Shimonoseki
  ll(131.55, 34.58),
  ll(133.05, 35.48),
  ll(135.25, 35.62), // Vịnh Wakasa
  ll(136.75, 36.75),
  ll(137.32, 37.45), // Bán đảo Noto
  ll(137.25, 36.82),
  ll(138.95, 37.88), // Niigata
  ll(139.95, 39.75), // Akita
  ll(140.28, 41.08),
];

const KYUSHU_PTS: Pt[] = [
  ll(130.92, 33.88),
  ll(131.72, 33.25),
  ll(131.55, 32.15),
  ll(130.72, 31.02),
  ll(130.18, 31.35),
  ll(130.25, 32.35),
  ll(129.75, 32.78),
  ll(129.58, 33.32),
  ll(130.32, 33.68),
];

const SHIKOKU_PTS: Pt[] = [
  ll(132.15, 33.42),
  ll(132.98, 32.78),
  ll(133.58, 33.48),
  ll(134.72, 33.82),
  ll(134.52, 34.28),
  ll(133.15, 34.08),
];

const HOKKAIDO_PTS: Pt[] = [
  ll(140.05, 41.48),
  ll(141.05, 41.78),
  ll(140.92, 42.38),
  ll(143.18, 42.02),
  ll(144.35, 43.25),
  ll(142.2, 44.8),
  ll(141.35, 44.45),
  ll(140.32, 43.25),
  ll(139.82, 42.18),
];

const TAIWAN_PTS: Pt[] = [
  ll(121.55, 25.25),
  ll(121.95, 24.85),
  ll(121.35, 23.5),
  ll(120.22, 23.5),
  ll(120.45, 24.45),
  ll(121.05, 25.05),
];

const JEJU_PTS: Pt[] = [
  ll(126.18, 33.32),
  ll(126.55, 33.22),
  ll(126.92, 33.45),
  ll(126.55, 33.56),
];

// Biên giới đường đứt nét phân định vùng Viễn Đông Liên Xô (Primorsky Krai / Vladivostok) với Mãn Châu & Triều Tiên
const USSR_BORDER_PTS: Pt[] = [
  ll(130.65, 42.45),
  ll(130.4, 42.95),
  ll(131.15, 43.95),
  ll(131.05, 45.0),
  ll(133.4, 45.95),
  ll(134.9, 46.8),
];

// Tiền tính 1 lần ở cấp module để cực nhẹ và tất định 100%
const STATIC_MAP = (() => {
  const landPaths = [
    smoothPath(MAINLAND_PTS, true),
    smoothPath(HONSHU_PTS, true),
    smoothPath(KYUSHU_PTS, true),
    smoothPath(SHIKOKU_PTS, true),
    smoothPath(HOKKAIDO_PTS, true),
    smoothPath(TAIWAN_PTS, true),
    smoothPath(JEJU_PTS, true),
  ];
  const ussrBorder = smoothPath(USSR_BORDER_PTS, false);
  const topo = contours('c04s02-east-asia-topo', 2650, 2250, 7, 26, 430);
  return { landPaths, ussrBorder, topo };
})();

// Toạ độ các mốc chiến lược trên hải đồ
const POS_TOKYO = ll(139.78, 35.62); // (2047, 1029)
const POS_NAGOYA = ll(136.92, 35.08); // (1830, 1078)
const POS_VLADIVOSTOK = ll(131.9, 43.12); // (1448, 354)
const POS_SPLIT_P8: Pt = [1605, 1012]; // Điểm chiếc #8 tách đội hình ngoài khơi bờ tây Honshu
const POS_SQUAD_START: Pt = [1495, 1122]; // Đội hình 15 chiếc rời bờ biển tây Nhật Bản
const POS_SQUAD_MID: Pt = [1218, 1278]; // Đầu nửa sau (633.3 s) đã thoát hẳn đảo Kyushu ra giữa Biển Hoa Đông
const POS_SQUAD_END: Pt = [1068, 1362]; // Cuối cảnh (644.98 s) giữa đại dương mở
const POS_RUN_DRY: Pt = [904, 1454]; // Điểm cạn sạch xăng giữa biển khơi sâu (cách bờ hơn 100 dặm)
const POS_CHINA_COAST: Pt = [644, 1598]; // Bờ biển Chiết Giang (Trung Quốc) thẳng trục bay (~300 px khoảng hụt rõ rệt!)
const POS_CHUQIAO = ll(118.92, 28.95); // (462, 1630) Sân bay đích Chuqiao sâu trong đất liền

// Bố cục 15 chiếc B-25B xếp 3 biên đội chữ V (5 chiếc/biên đội) theo hệ trục hướng bay cục bộ
const SQUAD_OFFSETS: { f: number; s: number }[] = [
  // Biên đội dẫn đầu (5 chiếc)
  { f: 42, s: 0 },
  { f: 18, s: -28 },
  { f: 18, s: 28 },
  { f: -6, s: -56 },
  { f: -6, s: 56 },
  // Biên đội cánh bắc (5 chiếc)
  { f: -22, s: -96 },
  { f: -44, s: -122 },
  { f: -44, s: -72 },
  { f: -68, s: -146 },
  { f: -68, s: -48 },
  // Biên đội cánh nam (5 chiếc)
  { f: -24, s: 96 },
  { f: -46, s: 72 },
  { f: -46, s: 122 },
  { f: -70, s: 48 },
  { f: -70, s: 146 },
];

/** Tạo chuỗi điểm ngôi sao 5 cánh đều (không chữ) cho phù hiệu sân bay Liên Xô tại Vladivostok */
function starPoints(cx: number, cy: number, rOuter: number, rInner: number): string {
  const pts: string[] = [];
  for (let k = 0; k < 5; k++) {
    const a1 = -Math.PI / 2 + (k * Math.PI * 2) / 5;
    const a2 = a1 + Math.PI / 5;
    pts.push(`${(cx + Math.cos(a1) * rOuter).toFixed(1)},${(cy + Math.sin(a1) * rOuter).toFixed(1)}`);
    pts.push(`${(cx + Math.cos(a2) * rInner).toFixed(1)},${(cy + Math.sin(a2) * rInner).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Thanh đồng hồ nhiên liệu trực quan thuần ký hiệu đồ hoạ (10 vạch xăng + icon can xăng + tam giác cảnh báo đỏ, không dùng thẻ chữ SVG) */
const VisualFuelGauge: React.FC<{
  x: number;
  y: number;
  level: number; // 0..1
  alertPulse: number; // 0..1
  scale?: number;
}> = ({ x, y, level, alertPulse, scale = 1 }) => {
  const lv = Math.max(0, Math.min(1, level));
  const isCritical = lv < 0.22;
  const isEmpty = lv <= 0.02;
  const borderCol = isEmpty
    ? alertPulse > 0.5
      ? '#ffffff'
      : P2D.dangerRed
    : isCritical
      ? P2D.dangerRed
      : P2D.fuelAmber;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Bóng cứng kiểu thẻ hải đồ tác chiến */}
      <rect x={-124} y={-22} width={248} height={44} rx={8} fill="rgba(7,16,28,0.58)" transform="translate(5 7)" />
      <rect
        x={-124}
        y={-22}
        width={248}
        height={44}
        rx={8}
        fill={P2D.blueprintBg}
        stroke={borderCol}
        strokeWidth={2.8}
      />

      {/* Biểu tượng can xăng 5-gal + giọt nhiên liệu bên trái */}
      <g transform="translate(-100 0)">
        <rect x={-11} y={-11} width={18} height={23} rx={2.5} fill={isEmpty ? P2D.dangerRed : P2D.fuelAmber} stroke={P2D.ink} strokeWidth={1.6} />
        <line x1={-7} y1={-5} x2={3} y2={7} stroke={P2D.ink} strokeWidth={1.5} />
        <line x1={3} y1={-5} x2={-7} y2={7} stroke={P2D.ink} strokeWidth={1.5} />
        <rect x={-6} y={-15} width={8} height={4} rx={1} fill={P2D.paper} />
        <path d="M 13 -6 C 17 0 18 4 18 7 A 5 5 0 1 1 8 7 C 8 4 9 0 13 -6 Z" fill={isEmpty ? P2D.dangerRed : P2D.fuelBright} />
      </g>

      {/* 10 ô vạch mức xăng (rút dần từ phải sang trái về 0; khi cạn sạch hiện viền & gạch chéo cảnh báo đỏ rõ nét) */}
      {Array.from({ length: 10 }, (_, i) => {
        const segThresh = (i + 1) / 10;
        const fillFrac = Math.max(0, Math.min(1, (lv - i * 0.1) * 10));
        const bx = -70 + i * 14.8;
        const segColor = i < 2 ? P2D.dangerRed : i < 5 ? P2D.fuelAmber : P2D.fuelBright;
        return (
          <g key={i}>
            <rect
              x={bx}
              y={-11}
              width={11.5}
              height={22}
              rx={2}
              fill={isEmpty ? '#260c10' : '#0a1826'}
              stroke={isEmpty ? (alertPulse > 0.45 ? P2D.dangerRed : '#872323') : '#2d5575'}
              strokeWidth={isEmpty ? 1.4 : 1.1}
            />
            {fillFrac > 0.02 && (
              <rect
                x={bx + 1}
                y={-10 + (1 - fillFrac) * 20}
                width={9.5}
                height={20 * fillFrac}
                rx={1.4}
                fill={isCritical ? P2D.dangerRed : segColor}
                opacity={segThresh > lv + 0.05 ? 0.85 : 1}
              />
            )}
          </g>
        );
      })}
      {isEmpty && (
        <line
          x1={-69}
          y1={9}
          x2={74}
          y2={-9}
          stroke={P2D.dangerRed}
          strokeWidth={2.4}
          opacity={0.55 + 0.45 * alertPulse}
        />
      )}

      {/* Đèn tam giác chấm than nhấp nháy đỏ khi cạn xăng / lỗi bộ chế hoà khí */}
      <g transform="translate(99 0)" opacity={isCritical ? 0.45 + 0.55 * alertPulse : 0.25}>
        <polygon
          points="0,-13 14,11 -14,11"
          fill={isEmpty ? P2D.dangerRed : P2D.fuelAmber}
          stroke={P2D.paper}
          strokeWidth={1.8}
          strokeLinejoin="round"
        />
        <rect x={-1.8} y={-6.5} width={3.6} height={8.5} rx={1.4} fill={P2D.ink} />
        <circle cx={0} cy={6.2} r={2} fill={P2D.ink} />
      </g>
    </g>
  );
};

/** Xoáy mặt trận khí áp bão (Barometric Storm Front Vortex) hình thành sau đuôi đội hình lúc 643.86 s */
const StormFrontVortex2D: React.FC<{ x: number; y: number; t: number; appear: number }> = ({ x, y, t, appear }) => {
  if (appear <= 0.005) return null;
  const spinDeg = (t - 643.0) * 34;
  const pushWave = (t * 1.8) % 1;

  // Mặt trận lạnh vòng cung gắn gai tam giác khí tượng đẩy thẳng về phía Tây - Tây Nam (sau lưng 15 chiếc B-25)
  const frontArc = arcPath(-85, -135, 32, 138, 68, 1, 32);

  return (
    <g transform={`translate(${x} ${y}) scale(${0.55 + 0.45 * appear})`} opacity={appear}>
      {/* Quầng mây áp thấp nhiều tầng */}
      <circle r={156} fill="#7ec8e8" opacity={0.11} />
      <circle r={108} fill="#a8e1f7" opacity={0.14} />
      <circle r={134} fill="none" stroke="#8fd4f0" strokeWidth={1.8} strokeDasharray="10 8" opacity={0.48} />
      <circle r={86} fill="none" stroke="#c7eefc" strokeWidth={1.6} strokeDasharray="7 6" opacity={0.55} />

      {/* 4 cánh tay xoáy thuận khí áp quay mượt */}
      <g transform={`rotate(${spinDeg})`}>
        {[0, 90, 180, 270].map((ang) => (
          <g key={ang} transform={`rotate(${ang})`}>
            <path
              d="M 14 0 C 32 -36 82 -44 128 -14 C 148 0 156 26 146 52"
              fill="none"
              stroke="#9be0fa"
              strokeWidth={11}
              strokeLinecap="round"
              opacity={0.22}
            />
            <path
              d="M 12 0 C 32 -36 82 -44 128 -14 C 148 0 156 26 146 52"
              fill="none"
              stroke="#e5f8ff"
              strokeWidth={3.2}
              strokeLinecap="round"
              strokeDasharray="18 10"
              opacity={0.78}
            />
          </g>
        ))}
        <circle r={16} fill="none" stroke="#ffffff" strokeWidth={2.6} opacity={0.85} />
      </g>

      {/* Đường mặt trận lạnh (Cold Front) với răng tam giác khí tượng hướng sang trái-dưới (hướng bờ biển Trung Quốc) */}
      <g transform="translate(-52 24)">
        <path d={frontArc} fill="none" stroke={P2D.safeTeal} strokeWidth={10} strokeLinecap="round" opacity={0.24} />
        <path d={frontArc} fill="none" stroke="#d8fbff" strokeWidth={3.6} strokeLinecap="round" />
        {[0.14, 0.32, 0.5, 0.68, 0.86].map((s, idx) => {
          const [bx, by] = arcAt(-85, -135, 32, 138, 68, s);
          const tang = arcAngle(-85, -135, 32, 138, 68, s);
          return (
            <polygon
              key={idx}
              points="-9,0 9,0 0,15"
              fill={P2D.safeTeal}
              stroke="#ffffff"
              strokeWidth={1.2}
              transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)}) rotate(${(tang + 90).toFixed(1)})`}
            />
          );
        })}

        {/* Các mũi tên luồng gió xuôi (tailwind chevrons) thúc từ xoáy bão vào đuôi đội hình 15 B-25 */}
        {[-52, 0, 52].map((oy, idx) => {
          const shift = ((pushWave + idx * 0.33) % 1) * 44;
          return (
            <g
              key={idx}
              transform={`translate(${-56 - shift * 0.88} ${oy + shift * 0.44}) rotate(153)`}
              opacity={0.85 * Math.sin(((pushWave + idx * 0.33) % 1) * Math.PI)}
            >
              <polyline
                points="-14,-11 4,0 -14,11"
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={3.4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </g>
          );
        })}
      </g>
    </g>
  );
};

const C04S02: React.FC = () => {
  const t = useT();

  // Điều phối máy quay <Cam2D>:
  // Nửa đầu (625.50–633.30 s): Khung Bắc Á (Honshu – Biển Nhật Bản – Triều Tiên – Vladivostok) theo chiếc #8 rẽ lên Bắc
  // Nửa sau (633.30–644.98 s): Lia mượt xuống Tây Nam mở toàn cảnh Biển Hoa Đông – Bờ biển Trung Quốc (khoảng hụt 100+ dặm)
  const pFollow8 = prog(t, 628.8, 632.6);
  const pPanSouth = prog(t, 633.25, 636.35);
  const pTightGap = prog(t, 639.6, 643.8);

  let camX = lerp(1575, 1480, pFollow8);
  let camY = lerp(830, 628, pFollow8);
  let camZoom = lerp(1.06, 1.16, pFollow8);

  camX = lerp(camX, 945, pPanSouth);
  camY = lerp(camY, 1405, pPanSouth);
  camZoom = lerp(camZoom, 1.25, pPanSouth);

  camX = lerp(camX, 896, pTightGap);
  camY = lerp(camY, 1445, pTightGap);
  camZoom = lerp(camZoom, 1.32, pTightGap);

  const shake = handheld(t, 2.2, 'c04s02-chart');

  // --- Tiến độ Nửa đầu: Chiếc B-25 số 8 hao xăng bộ chế hoà khí & rẽ lên Vladivostok ---
  const pApproach8 = prog(t, 625.2, 629.5);
  const pDivert8 = prog(t, 629.5, 632.58);
  const isCarbFault = t >= 627.1;
  const carbPulse = 0.5 + 0.5 * Math.sin(t * 15.5);

  const fullDivertArc = useMemo(
    () => arcPath(POS_SPLIT_P8[0], POS_SPLIT_P8[1], POS_VLADIVOSTOK[0], POS_VLADIVOSTOK[1], -108, 1, 64),
    [],
  );

  // Vị trí & góc hướng bay chiếc #8
  let p8Pos: Pt;
  let p8Rot: number;
  if (t < 629.5) {
    p8Pos = [lerp(1715, POS_SPLIT_P8[0], pApproach8), lerp(1038, POS_SPLIT_P8[1], pApproach8)];
    p8Rot = -170;
  } else {
    p8Pos = arcAt(POS_SPLIT_P8[0], POS_SPLIT_P8[1], POS_VLADIVOSTOK[0], POS_VLADIVOSTOK[1], -108, pDivert8);
    p8Rot = arcAngle(POS_SPLIT_P8[0], POS_SPLIT_P8[1], POS_VLADIVOSTOK[0], POS_VLADIVOSTOK[1], -108, pDivert8);
  }
  const p8FuelLevel = lerp(0.46, 0.08, prog(t, 626.2, 632.4));
  const p8Landed = prog(t, 632.35, 633.1);

  // --- Tiến độ Nửa sau: Đội hình 15 chiếc B-25 vượt Biển Hoa Đông, cạn xăng cách bờ hơn 100 dặm & xoáy bão ---
  const pSquadLeg1 = prog(t, 625.2, 633.3);
  const pSquadLeg2 = prog(t, 633.3, 644.98);
  const squadCenter: Pt =
    t <= 633.3
      ? [lerp(POS_SQUAD_START[0], POS_SQUAD_MID[0], pSquadLeg1), lerp(POS_SQUAD_START[1], POS_SQUAD_MID[1], pSquadLeg1)]
      : [lerp(POS_SQUAD_MID[0], POS_SQUAD_END[0], pSquadLeg2), lerp(POS_SQUAD_MID[1], POS_SQUAD_END[1], pSquadLeg2)];

  // Vector đơn vị hướng bay của 15 chiếc sang bờ biển Trung Quốc
  const dirVec = useMemo(() => {
    const dx = POS_RUN_DRY[0] - POS_SQUAD_START[0];
    const dy = POS_RUN_DRY[1] - POS_SQUAD_START[1];
    const len = Math.hypot(dx, dy);
    return { ux: dx / len, uy: dy / len, rotDeg: (Math.atan2(dy, dx) * 180) / Math.PI };
  }, []);

  // Thanh nhiên liệu của 15 chiếc tụt cạn về 0 đúng mốc "15 bombers will run dry over open ocean" (638.12 s)
  const squadFuel = lerp(0.34, 0.0, prog(t, 634.1, 638.25));
  const pBarrCalc = prog(t, 634.1, 636.1);
  const pRedTrack = prog(t, CUE.c04_s02_15_run_dry, 638.55);
  const pShortGap = prog(t, 639.85, 641.2);
  const pStorm = prog(t, 643.15, 644.35);
  const dangerPulse = 0.5 + 0.5 * Math.sin(t * 13.0);

  // Đường bay đã qua (từ Nhật tới tâm đội hình) & đường dự phóng vạch đứt đỏ cạn xăng
  const flownPathD = `M ${POS_TOKYO[0]} ${POS_TOKYO[1]} Q 1785 1065 ${POS_SQUAD_START[0]} ${POS_SQUAD_START[1]} L ${squadCenter[0].toFixed(1)} ${squadCenter[1].toFixed(1)}`;
  const nosePos: Pt = [squadCenter[0] + dirVec.ux * 54, squadCenter[1] + dirVec.uy * 54];
  const redDryEnd: Pt = [
    lerp(nosePos[0], POS_RUN_DRY[0], pRedTrack),
    lerp(nosePos[1], POS_RUN_DRY[1], pRedTrack),
  ];
  const redDryFullD = `M ${nosePos[0].toFixed(1)} ${nosePos[1].toFixed(1)} L ${POS_RUN_DRY[0]} ${POS_RUN_DRY[1]}`;
  const redDryDashD = `M ${nosePos[0].toFixed(1)} ${nosePos[1].toFixed(1)} L ${redDryEnd[0].toFixed(1)} ${redDryEnd[1].toFixed(1)}`;

  // Vector pháp tuyến vuông góc trục bay để vẽ thước kẹp (caliper) đo khoảng hụt 100+ dặm
  const nx = -dirVec.uy;
  const ny = dirVec.ux;

  return (
    <AbsoluteFill style={{ background: P2D.seaDeep }}>
      {/* BẮT BUỘC: Đặt <Defs2D> bên ngoài <Cam2D> để tránh lỗi cắt vùng filter khi zoom/pan */}
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(6, 15, 26, 0.46)" />
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P2D.seaDeep}>
        <svg width={3000} height={2400} viewBox="0 0 3000 2400" style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id="c04s02-land-clip">
              {STATIC_MAP.landPaths.map((d, idx) => (
                <path key={idx} d={d} />
              ))}
            </clipPath>
          </defs>

          {/* ==================== 1. NỀN BIỂN HẢI ĐỒ 3 LỚP (seaDeep -> seaMid -> seaShallow) ==================== */}
          <rect x={-400} y={-400} width={3800} height={3200} fill={P2D.seaDeep} />

          {/* Lớp thềm lục địa trung bình (seaMid) & chuyển tiếp mượt (không bị sọc răng cưa) */}
          <g opacity={0.96}>
            {STATIC_MAP.landPaths.map((d, idx) => (
              <path
                key={`mid-${idx}`}
                d={d}
                fill={P2D.seaMid}
                stroke={P2D.seaMid}
                strokeWidth={186}
                strokeLinejoin="round"
              />
            ))}
          </g>

          {/* Lớp biển nông ven bờ (seaShallow) ôm mượt sát bờ biển */}
          <g>
            {STATIC_MAP.landPaths.map((d, idx) => (
              <React.Fragment key={`sh-${idx}`}>
                <path
                  d={d}
                  fill="#1b476b"
                  stroke="#1b476b"
                  strokeWidth={118}
                  strokeLinejoin="round"
                />
                <path
                  d={d}
                  fill={P2D.seaShallow}
                  stroke={P2D.seaShallow}
                  strokeWidth={62}
                  strokeLinejoin="round"
                />
              </React.Fragment>
            ))}
          </g>

          {/* ==================== 2. LƯỚI KINH VĨ ĐỘ HẢI ĐỒ & HOA GIÓ LA BÀN ==================== */}
          <g opacity={0.34}>
            {/* Kinh tuyến từ 115°E tới 145°E mỗi 2.5° */}
            {Array.from({ length: 13 }, (_, i) => {
              const lon = 115 + i * 2.5;
              const x = mapX(lon);
              const major = i % 2 === 0;
              return (
                <line
                  key={`lon-${lon}`}
                  x1={x}
                  y1={-100}
                  x2={x}
                  y2={2350}
                  stroke={P2D.seaGrid}
                  strokeWidth={major ? 1.6 : 0.9}
                  strokeDasharray={major ? undefined : '6 7'}
                />
              );
            })}
            {/* Vĩ tuyến từ 25°N tới 45°N mỗi 2.5° */}
            {Array.from({ length: 10 }, (_, i) => {
              const lat = 25 + i * 2.5;
              const y = mapY(lat);
              const major = i % 2 === 0;
              return (
                <line
                  key={`lat-${lat}`}
                  x1={-100}
                  y1={y}
                  x2={2750}
                  y2={y}
                  stroke={P2D.seaGrid}
                  strokeWidth={major ? 1.6 : 0.9}
                  strokeDasharray={major ? undefined : '6 7'}
                />
              );
            })}
          </g>

          {/* Hai hoa gió la bàn cổ điển đặt ở Biển Nhật Bản (nửa đầu) và Biển Hoa Đông (nửa sau) */}
          <CompassRose2D x={1755} y={595} r={54} />
          <CompassRose2D x={1335} y={1685} r={58} />

          {/* ==================== 3. ĐẤT LIỀN GIẤY DA THUỘC + ĐƯỜNG ĐỒNG MỨC CONTOURS() ==================== */}
          {/* Lớp bóng đổ bờ biển tạo chiều sâu nổi khối */}
          <g transform="translate(8 11)" opacity={0.36}>
            {STATIC_MAP.landPaths.map((d, idx) => (
              <path key={`lsh-${idx}`} d={d} fill="#06121f" />
            ))}
          </g>

          {/* Mảng giấy da thuộc P2D.land */}
          <g>
            {STATIC_MAP.landPaths.map((d, idx) => (
              <path key={`land-${idx}`} d={d} fill={P2D.land} />
            ))}
          </g>

          {/* Vùng cao nguyên sáng màu + đường đồng mức địa hình contours() cắt gọn trong đất liền */}
          <g clipPath="url(#c04s02-land-clip)">
            {STATIC_MAP.topo.map((lv) => (
              <path
                key={lv.level}
                d={lv.d}
                fill="none"
                stroke={lv.level >= 5 ? P2D.landHigh : P2D.contour}
                strokeWidth={lv.level % 2 === 0 ? 1.55 : 1.0}
                opacity={lv.level >= 5 ? 0.55 : 0.42}
              />
            ))}
            {/* Đường biên giới Liên Xô (Primorsky Krai / Vladivostok) – Mãn Châu / Triều Tiên */}
            <path
              d={STATIC_MAP.ussrBorder}
              fill="none"
              stroke={P2D.jpDark}
              strokeWidth={4.5}
              opacity={0.22}
            />
            <path
              d={STATIC_MAP.ussrBorder}
              fill="none"
              stroke={P2D.inkMuted}
              strokeWidth={2.2}
              strokeDasharray="10 7"
              opacity={0.75}
            />
          </g>

          {/* Viền bóng trong bờ biển (landShadow) & nét mực bản đồ sắc sảo (P2D.ink) */}
          <g>
            {STATIC_MAP.landPaths.map((d, idx) => (
              <React.Fragment key={`edge-${idx}`}>
                <path d={d} fill="none" stroke={P2D.landShadow} strokeWidth={5.5} strokeLinejoin="round" opacity={0.48} />
                <path d={d} fill="none" stroke={P2D.ink} strokeWidth={2.4} strokeLinejoin="round" />
              </React.Fragment>
            ))}
          </g>

          {/* ==================== 4. KÝ HIỆU ĐỊA ĐIỂM CHIẾN LƯỢC (KHÔNG DÙNG THẺ CHỮ SVG) ==================== */}
          {/* Mốc xuất phát từ mục tiêu vừa oanh tạc trên đất Nhật (Tokyo & Nagoya bốc khói) */}
          {[POS_TOKYO, POS_NAGOYA].map(([tx, ty], idx) => (
            <g key={`jp-tgt-${idx}`} transform={`translate(${tx} ${ty})`}>
              <circle r={24} fill={P2D.jpMain} opacity={0.18} />
              <circle r={12} fill="none" stroke={P2D.jpMain} strokeWidth={2.4} />
              <circle r={4.5} fill={P2D.jpMain} />
              <Puff2D x={-6} y={-12} r={14} color="#58524c" opacity={0.55} seed={idx + 11} />
              <Puff2D x={7} y={-22} r={18} color="#756d65" opacity={0.4} seed={idx + 23} />
            </g>
          ))}

          {/* Căn cứ Liên Xô tại VLADIVOSTOK (Băng hạ cánh chữ thập + Ngôi sao đỏ 5 cánh + Vòng sóng đón chiếc #8) */}
          <g transform={`translate(${POS_VLADIVOSTOK[0]} ${POS_VLADIVOSTOK[1]})`}>
            <circle
              r={34 + p8Landed * 16}
              fill={P2D.fuelAmber}
              opacity={0.12 + p8Landed * 0.16}
            />
            <circle
              r={26}
              fill={P2D.paper}
              fillOpacity={0.88}
              stroke={P2D.ink}
              strokeWidth={2.4}
            />
            {/* Đường băng sân bay giao nhau */}
            <rect x={-18} y={-3} width={36} height={6} rx={1.5} fill={P2D.inkMuted} transform="rotate(-24)" />
            <rect x={-14} y={-2.2} width={28} height={4.4} rx={1.2} fill={P2D.inkMuted} transform="rotate(52)" />
            {/* Phù hiệu Ngôi sao đỏ Liên Xô nổi bật */}
            <polygon
              points={starPoints(0, -28, 15, 6.2)}
              fill="#d62c27"
              stroke={P2D.paper}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            {p8Landed > 0.02 && (
              <circle
                r={26 + p8Landed * 28}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={3 * (1 - p8Landed * 0.5)}
                opacity={0.9 * (1 - p8Landed * 0.4)}
              />
            )}
          </g>

          {/* Sân bay đồng minh Trung Quốc tại Chuqiao (Chuchow) sâu trong đất liền Chiết Giang */}
          <g transform={`translate(${POS_CHUQIAO[0]} ${POS_CHUQIAO[1]})`}>
            <circle r={42} fill="none" stroke={P2D.usMain} strokeWidth={1.6} strokeDasharray="7 6" opacity={0.55} />
            <circle r={20} fill={P2D.blueprintBg} stroke={P2D.usLight} strokeWidth={2.4} />
            <rect x={-13} y={-2.6} width={26} height={5.2} rx={1.2} fill={P2D.usLight} transform="rotate(-18)" />
            <line x1={-9} y1={-1.8} x2={9} y2={1.8} stroke={P2D.blueprintBg} strokeWidth={1.2} strokeDasharray="3 3" />
            <circle r={4} fill={P2D.safeTeal} />
          </g>

          {/* ==================== 5. NỬA ĐẦU: CHIẾC B-25 SỐ 8 LỖI CHẾ HOÀ KHÍ RẼ LÊN VLADIVOSTOK ==================== */}
          {/* Hành trình bay từ Tokyo/Nagoya ra bờ tây Honshu */}
          <path
            d={`M ${POS_TOKYO[0]} ${POS_TOKYO[1]} Q 1835 1018 ${POS_SPLIT_P8[0]} ${POS_SPLIT_P8[1]}`}
            fill="none"
            stroke={P2D.usLight}
            strokeWidth={3}
            strokeDasharray="9 7"
            opacity={0.55}
          />

          {/* Cung rẽ lên phía Bắc (arcPath + drawOn, vẽ nét kép halo mờ + lõi sáng vàng hổ phách) */}
          {pDivert8 > 0.002 && (
            <g>
              <path
                d={fullDivertArc}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={13}
                strokeLinecap="round"
                opacity={0.26}
                {...drawOn(820, pDivert8)}
              />
              <path
                d={fullDivertArc}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={4.2}
                strokeLinecap="round"
                {...drawOn(820, pDivert8)}
              />
            </g>
          )}

          {/* Vệt khói xăng hao hụt do lỗi bộ chế hoà khí (faulty carburetors @ 628.54 s) dọc theo đuôi chiếc #8 */}
          {isCarbFault && t < 632.8 && (
            <g>
              {[0.04, 0.09, 0.15, 0.22].map((lag, idx) => {
                const tSample = Math.max(625.5, t - lag * 4.5);
                const pA = prog(tSample, 625.2, 629.5);
                const pD = prog(tSample, 629.5, 632.58);
                const [sx, sy] =
                  tSample < 629.5
                    ? [lerp(1715, POS_SPLIT_P8[0], pA), lerp(1038, POS_SPLIT_P8[1], pA)]
                    : arcAt(POS_SPLIT_P8[0], POS_SPLIT_P8[1], POS_VLADIVOSTOK[0], POS_VLADIVOSTOK[1], -108, pD);
                return (
                  <Puff2D
                    key={idx}
                    x={sx}
                    y={sy}
                    r={7 + idx * 3.5}
                    color={idx < 2 ? P2D.fuelAmber : '#7c7669'}
                    opacity={0.62 - idx * 0.12}
                    seed={80 + idx}
                  />
                );
              })}
            </g>
          )}

          {/* Chiếc B25Top2D số 8 kèm vòng cảnh báo chế hoà khí hổ phách nhấp nháy & đồng hồ xăng mini */}
          <g transform={`translate(${p8Pos[0].toFixed(1)} ${p8Pos[1].toFixed(1)})`}>
            {t >= CUE.c04_s02_plane8 && t < 633.5 && (
              <>
                <circle
                  r={36 + carbPulse * 9}
                  fill={P2D.fuelAmber}
                  opacity={isCarbFault ? 0.14 + 0.16 * carbPulse : 0.12}
                />
                <circle
                  r={31}
                  fill="none"
                  stroke={isCarbFault && carbPulse > 0.45 ? P2D.fuelBright : P2D.fuelAmber}
                  strokeWidth={2.6}
                  strokeDasharray="8 5"
                />
              </>
            )}

            <B25Top2D x={0} y={0} rot={p8Rot} ppm={3.4} tint="olive" propPhase={t * 22} />

            {/* Chớp lửa cam-vàng nhấp nháy ngay tại 2 vỏ động cơ chế hoà khí lỗi */}
            {isCarbFault && t < 632.6 && (
              <g transform={`rotate(${p8Rot})`} opacity={0.35 + 0.65 * carbPulse}>
                <circle cx={6} cy={-10.4} r={5.2} fill={P2D.fuelAmber} />
                <circle cx={6} cy={10.4} r={5.2} fill={P2D.fuelAmber} />
                <circle cx={6} cy={-10.4} r={2.5} fill="#ffffff" />
                <circle cx={6} cy={10.4} r={2.5} fill="#ffffff" />
              </g>
            )}

            {/* Thanh mức xăng mini của riêng chiếc #8 lúc đang rẽ lên Vladivostok */}
            {t >= 626.8 && t < 633.3 && (
              <VisualFuelGauge x={96} y={-44} level={p8FuelLevel} alertPulse={carbPulse} scale={0.62} />
            )}
          </g>

          {/* ==================== 6. NỬA SAU: 15 CHIẾC CẠN XĂNG CÁCH BỜ 100+ DẶM & XOÁY BÃO ==================== */}
          {/* Vệt đường bay xanh dương đã bay của đội hình 15 chiếc từ Nhật ra giữa Biển Hoa Đông */}
          <path d={flownPathD} fill="none" stroke={P2D.usMain} strokeWidth={11} strokeLinecap="round" opacity={0.2} />
          <path d={flownPathD} fill="none" stroke={P2D.usLight} strokeWidth={3.6} strokeLinecap="round" />

          {/* Vòng compa đo đạc hàng hải của hoa tiêu George Barr (634.26 s) quét kiểm tra tầm bay còn lại */}
          {pBarrCalc > 0.01 && (
            <g opacity={0.55 * (1 - prog(t, 640.0, 641.5))}>
              <circle
                cx={squadCenter[0]}
                cy={squadCenter[1]}
                r={lerp(60, Math.hypot(POS_RUN_DRY[0] - squadCenter[0], POS_RUN_DRY[1] - squadCenter[1]), pBarrCalc)}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={1.8}
                strokeDasharray="10 8"
              />
            </g>
          )}

          {/* Đường bay dự phóng chuyển sang VẠCH ĐỨT ĐỎ (P2D.dangerRed) dừng cụt giữa đại dương lúc cạn xăng (638.12 s) */}
          {pRedTrack > 0.005 && (
            <g>
              <path
                d={redDryFullD}
                fill="none"
                stroke={P2D.dangerRed}
                strokeWidth={15}
                strokeLinecap="round"
                opacity={0.25}
                {...drawOn(460, pRedTrack)}
              />
              <path
                d={redDryDashD}
                fill="none"
                stroke={P2D.dangerRed}
                strokeWidth={5.2}
                strokeDasharray="16 11"
                strokeLinecap="round"
              />

              {/* Vạch chặn dừng cụt chữ T & dấu X đỏ cảnh báo rơi xuống biển khơi tại POS_RUN_DRY */}
              {pRedTrack > 0.82 && (
                <g transform={`translate(${POS_RUN_DRY[0]} ${POS_RUN_DRY[1]})`}>
                  <circle
                    r={28 + dangerPulse * 14}
                    fill={P2D.dangerRed}
                    opacity={0.16 + 0.14 * dangerPulse}
                  />
                  <circle r={24} fill="none" stroke={P2D.dangerRed} strokeWidth={2.5} strokeDasharray="6 5" />
                  <line
                    x1={-nx * 36}
                    y1={-ny * 36}
                    x2={nx * 36}
                    y2={ny * 36}
                    stroke={P2D.dangerRed}
                    strokeWidth={5.5}
                    strokeLinecap="round"
                  />
                  <g transform={`rotate(${dirVec.rotDeg})`}>
                    <line x1={-11} y1={-11} x2={11} y2={11} stroke="#ffffff" strokeWidth={3.8} strokeLinecap="round" />
                    <line x1={11} y1={-11} x2={-11} y2={11} stroke="#ffffff" strokeWidth={3.8} strokeLinecap="round" />
                  </g>
                </g>
              )}
            </g>
          )}

          {/* DẢI ĐO KHOẢNG HỤT ĐỎ RỰC "100+ MILES SHORT" nối từ điểm cạn xăng tới bờ biển Trung Quốc (640.40 s) */}
          {pShortGap > 0.005 && (
            <g opacity={pShortGap}>
              {/* Vùng hành lang thiếu hụt đỏ rực trên mặt đại dương kèm sọc chéo cảnh báo nguy hiểm */}
              <line
                x1={POS_RUN_DRY[0]}
                y1={POS_RUN_DRY[1]}
                x2={lerp(POS_RUN_DRY[0], POS_CHINA_COAST[0], pShortGap)}
                y2={lerp(POS_RUN_DRY[1], POS_CHINA_COAST[1], pShortGap)}
                stroke={P2D.dangerRed}
                strokeWidth={64}
                opacity={0.26}
              />
              {Array.from({ length: 11 }, (_, hIdx) => {
                const frac = (hIdx + 0.5) / 11;
                if (pShortGap < frac) return null;
                const hx = lerp(POS_RUN_DRY[0], POS_CHINA_COAST[0], frac);
                const hy = lerp(POS_RUN_DRY[1], POS_CHINA_COAST[1], frac);
                return (
                  <line
                    key={`hz-${hIdx}`}
                    x1={hx - nx * 28 - dirVec.ux * 10}
                    y1={hy - ny * 28 - dirVec.uy * 10}
                    x2={hx + nx * 28 + dirVec.ux * 10}
                    y2={hy + ny * 28 + dirVec.uy * 10}
                    stroke={P2D.dangerRed}
                    strokeWidth={2}
                    opacity={0.38}
                  />
                );
              })}

              {/* Các vạch chia thước đo mỗi ~25 dặm (4+ khoảng lớn trực quan = hơn 100 dặm thiếu hụt!) */}
              {[0.2, 0.4, 0.6, 0.8].map((frac, idx) => {
                if (pShortGap < frac) return null;
                const tx = lerp(POS_RUN_DRY[0], POS_CHINA_COAST[0], frac);
                const ty = lerp(POS_RUN_DRY[1], POS_CHINA_COAST[1], frac);
                return (
                  <line
                    key={idx}
                    x1={tx - nx * 24}
                    y1={ty - ny * 24}
                    x2={tx + nx * 24}
                    y2={ty + ny * 24}
                    stroke="#ffb8b8"
                    strokeWidth={2.8}
                    opacity={0.88}
                  />
                );
              })}

              {/* Hai ngàm thước kẹp (caliper brackets) vuông góc tại điểm cạn xăng và tại mép bờ biển Trung Quốc */}
              <line
                x1={POS_CHINA_COAST[0] - nx * 46}
                y1={POS_CHINA_COAST[1] - ny * 46}
                x2={POS_CHINA_COAST[0] + nx * 46}
                y2={POS_CHINA_COAST[1] + ny * 46}
                stroke="#ffffff"
                strokeWidth={5.2}
                strokeLinecap="round"
              />
              <line
                x1={POS_CHINA_COAST[0] - nx * 46}
                y1={POS_CHINA_COAST[1] - ny * 46}
                x2={POS_CHINA_COAST[0] + nx * 46}
                y2={POS_CHINA_COAST[1] + ny * 46}
                stroke={P2D.dangerRed}
                strokeWidth={2.6}
                strokeLinecap="round"
              />

              {/* Trục mũi tên hai đầu đỏ-trắng đo chính xác khoảng cách hụt tới bờ biển */}
              <line
                x1={POS_RUN_DRY[0]}
                y1={POS_RUN_DRY[1]}
                x2={lerp(POS_RUN_DRY[0], POS_CHINA_COAST[0], pShortGap)}
                y2={lerp(POS_RUN_DRY[1], POS_CHINA_COAST[1], pShortGap)}
                stroke={P2D.dangerRed}
                strokeWidth={13}
                opacity={0.42}
              />
              <line
                x1={POS_RUN_DRY[0]}
                y1={POS_RUN_DRY[1]}
                x2={lerp(POS_RUN_DRY[0], POS_CHINA_COAST[0], pShortGap)}
                y2={lerp(POS_RUN_DRY[1], POS_CHINA_COAST[1], pShortGap)}
                stroke="#ffffff"
                strokeWidth={3.8}
              />

              {/* Đầu mũi tên chạm hai ngàm thước đo */}
              <polygon
                points="0,0 -17,-9.5 -17,9.5"
                fill="#ffffff"
                transform={`translate(${POS_CHINA_COAST[0]} ${POS_CHINA_COAST[1]}) rotate(${dirVec.rotDeg})`}
              />
              <polygon
                points="0,0 -17,-9.5 -17,9.5"
                fill="#ffffff"
                transform={`translate(${POS_RUN_DRY[0]} ${POS_RUN_DRY[1]}) rotate(${dirVec.rotDeg + 180})`}
              />

              {/* Đường đứt mảnh nối tiếp từ bờ biển vào sân bay đích Chuqiao */}
              <line
                x1={POS_CHINA_COAST[0]}
                y1={POS_CHINA_COAST[1]}
                x2={POS_CHUQIAO[0]}
                y2={POS_CHUQIAO[1]}
                stroke={P2D.dangerRed}
                strokeWidth={2.6}
                strokeDasharray="7 7"
                opacity={0.62}
              />
            </g>
          )}

          {/* XOÁY MẶT TRẬN KHÍ ÁP BÃO hình thành ngay sau đuôi đội hình lúc 643.86 s ("halfway across the sea") */}
          <StormFrontVortex2D
            x={squadCenter[0] - dirVec.ux * 172}
            y={squadCenter[1] - dirVec.uy * 172}
            t={t}
            appear={pStorm}
          />

          {/* ĐỘI HÌNH 15 CHIẾC B-25B MITCHELL (B25Top2D) vượt Biển Hoa Đông */}
          <g>
            {SQUAD_OFFSETS.map((off, idx) => {
              const bx = squadCenter[0] + dirVec.ux * off.f + nx * off.s;
              const by = squadCenter[1] + dirVec.uy * off.f + ny * off.s;
              return (
                <g key={`b25-${idx}`}>
                  {/* Cảnh báo vòng đỏ nhấp nháy quanh từng oanh tạc cơ khi đồng hồ xăng đã tụt về 0 */}
                  {squadFuel <= 0.05 && (
                    <circle
                      cx={bx}
                      cy={by}
                      r={19}
                      fill="none"
                      stroke={P2D.dangerRed}
                      strokeWidth={1.6}
                      opacity={0.3 + 0.45 * dangerPulse}
                    />
                  )}
                  <B25Top2D
                    x={bx}
                    y={by}
                    rot={dirVec.rotDeg}
                    ppm={2.55}
                    tint="olive"
                    propPhase={t * 24 + idx * 0.7}
                  />
                </g>
              );
            })}
          </g>

          {/* Thanh nhiên liệu trực quan của toàn đội hình 15 chiếc treo ngay phía trên biên đội ở nửa sau */}
          {t >= 633.5 && (
            <VisualFuelGauge
              x={squadCenter[0] - 12}
              y={squadCenter[1] - 165}
              level={squadFuel}
              alertPulse={dangerPulse}
              scale={0.96}
            />
          )}
        </svg>
      </Cam2D>

      {/* Lớp hạt giấy bản đồ cổ điển phủ cuối cảnh đúng chuẩn thiết kế mỹ thuật */}
      <Grain opacity={0.42} />

      {/* 2 NHÃN <Label> NỐI TIẾP KHÔNG CHỒNG NHAU (tuyệt đối tối đa 1 nhãn trên màn hình tại mọi thời điểm) */}
      <Label
        t={t}
        text="PLANE #8 · VLADIVOSTOK"
        x={485}
        y={180}
        from={CUE.c04_s02_diverts_north}
        until={633.2}
        size={48}
      />

      <Label
        t={t}
        text="100+ MILES SHORT"
        x={920}
        y={895}
        from={CUE.c04_s02_100_miles_short}
        until={644.5}
        size={52}
        bg={P2D.dangerRed}
        fg="#ffffff"
      />
    </AbsoluteFill>
  );
};

export default C04S02;
