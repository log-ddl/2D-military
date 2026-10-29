import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { bump, lerp, prog } from '@kit/theme';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { contours } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { BlueprintGrid, F15Front2D, F35Front2D } from '../local/jets2d';
import { P } from '../local/palette';

/** Tạo cung quạt quét radar (tính bằng độ, 0° hướng +X, tăng thuận chiều kim đồng hồ). */
const wedgePath = (cx: number, cy: number, r: number, a0Deg: number, a1Deg: number) => {
  const r0 = (a0Deg * Math.PI) / 180;
  const r1 = (a1Deg * Math.PI) / 180;
  const x0 = cx + Math.cos(r0) * r;
  const y0 = cy + Math.sin(r0) * r;
  const x1 = cx + Math.cos(r1) * r;
  const y1 = cy + Math.sin(r1) * r;
  return `M${cx} ${cy} L${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} Z`;
};

/** Đường viền bóng mờ phát sáng hổ phách của xe đầu kéo 18 bánh (Semi-Truck) chiếu trực diện lồng khớp F-15EX. */
const SemiTruckGhost: React.FC<{ x: number; y: number; scale?: number; opacity: number }> = ({
  x,
  y,
  scale = 1,
  opacity,
}) => {
  if (opacity <= 0.005) return null;

  const drawFrame = (sw: number, op: number, col: string) => (
    <g
      fill="none"
      stroke={col}
      strokeWidth={sw}
      strokeLinejoin="round"
      strokeLinecap="round"
      opacity={op}
    >
      {/* Thùng container phía sau cao khớp hai cánh đuôi đứng F-15EX */}
      <rect x={-124} y={-126} width={248} height={198} rx={6} strokeDasharray="12 6" />
      {/* Vòm lướt gió nóc cabin đầu kéo */}
      <path d="M-84,-74 Q0,-118 84,-74 L94,-32 L-94,-32 Z" />
      {/* Thân cabin & hai kính chắn gió chia đôi */}
      <path d="M-96,-32 L96,-32 L104,58 L-104,58 Z" />
      <polygon points="-82,-24 -6,-24 -6,4 -88,4" />
      <polygon points="6,-24 82,-24 88,4 6,4" />
      {/* Hai ống xả khói thẳng đứng hai bên cabin */}
      <rect x={-110} y={-118} width={10} height={114} rx={3} />
      <rect x={100} y={-118} width={10} height={114} rx={3} />
      {/* Gương chiếu hậu bản rộng vươn ra ngoài khớp sải giá treo cánh */}
      <path d="M-98,-18 L-138,-18 L-138,14 L-99,14" />
      <rect x={-146} y={-22} width={10} height={40} rx={3} />
      <path d="M98,-18 L138,-18 L138,14 L99,14" />
      <rect x={136} y={-22} width={10} height={40} rx={3} />
      {/* Mặt lưới tản nhiệt đứng cỡ lớn */}
      <rect x={-48} y={10} width={96} height={48} rx={4} />
      {[-32, -16, 0, 16, 32].map((gx) => (
        <line key={gx} x1={gx} y1={12} x2={gx} y2={56} />
      ))}
      {/* Cụm đèn pha đôi hai bên */}
      <rect x={-94} y={28} width={34} height={18} rx={3} />
      <rect x={60} y={28} width={34} height={18} rx={3} />
      {/* Cản trước thép bản dày */}
      <rect x={-112} y={58} width={224} height={22} rx={5} />
      {/* Cụm bánh kép đầu kéo & rơ-moóc 18 bánh nhìn trực diện */}
      <rect x={-108} y={80} width={22} height={34} rx={5} />
      <rect x={-82} y={80} width={20} height={34} rx={5} />
      <rect x={62} y={80} width={20} height={34} rx={5} />
      <rect x={86} y={80} width={22} height={34} rx={5} />
    </g>
  );

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      {/* Mảng bóng mờ hổ phách nhẹ để vẫn thấy rõ F-15EX bên trong */}
      <rect x={-124} y={-126} width={248} height={206} rx={8} fill={P.amber} opacity={0.05} />
      {/* Nét kép phát sáng (halo rộng + lõi sáng sắc nét, không dùng filter glow trên nét lớn trong Cam2D) */}
      {drawFrame(8.5, 0.15, P.amber)}
      {drawFrame(4, 0.28, P.amber)}
      {drawFrame(2.0, 0.82, P.amberHot)}
      {/* 5 đèn nóc thùng xe & 4 đèn pha rực sáng */}
      {[-92, -46, 0, 46, 92].map((lx) => (
        <circle key={lx} cx={lx} cy={-120} r={3.6} fill={P.amberHot} />
      ))}
      {[-84, -70, 70, 84].map((hx) => (
        <circle key={hx} cx={hx} cy={37} r={5} fill={P.amberHot} />
      ))}
    </g>
  );
};

const S02: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const mapLines = useMemo(() => contours('s02_airdef', 2500, 1440, 7, 22, 560), []);

  // Tọa độ màn hình radar cực PPI trung tâm
  const ppiX = 960;
  const ppiY = 545;
  const ppiR = 320;

  // Mục tiêu F-15EX trên màn PPI đặt ở góc -12.05° (x = 960 + 182 = 1142, y = 545 - 39 = 506)
  // Chu kỳ quét 1.86s neo tại CUE.s02_radarSweep (34.54s) để kim quét không trùng pha lấy mẫu và quét trúng đích đúng mốc voice!
  const hitAngle = -12.05;
  const period = 1.86;
  const sweepDeg = hitAngle + ((t - CUE.s02_radarSweep) / period) * 360;
  const sweepRad = (sweepDeg * Math.PI) / 180;

  const pOpenWind = prog(t, CUE.s02_openWind - 0.3, CUE.s02_openWind + 0.9);
  const pRadarOn = prog(t, CUE.s02_radarSweep - 0.15, CUE.s02_radarSweep + 0.35);
  const pRcsSpike = prog(t, CUE.s02_rcsSpike - 0.12, CUE.s02_rcsSpike + 0.4);
  const pTruck = prog(t, CUE.s02_truckGhost - 0.15, CUE.s02_truckGhost + 0.75);

  // Xung chấn khi kim quét đập vào F-15EX tại 34.54s và bùng nổ cực đại tại 37.22s
  const ping1 = bump(t, CUE.s02_radarSweep, 0.85);
  const ping2 = bump(t, CUE.s02_rcsSpike, 1.05);
  const ping3 = bump(t, CUE.s02_radarSweep + period * 2, 0.9);
  const pulse = Math.max(ping1 * 0.75, ping2, ping3 * 0.85);

  // Chuyển động Cam2D giữ trọn vẹn cả 3 ô đối chiếu (F-35A · PPI · F-15EX Semi-Truck) không cắt mép trái
  const pushIn = prog(t, 28.0, 35.0);
  const leanRight = prog(t, 38.8, 41.6);
  const camX = lerp(lerp(960, 965, pushIn), 982, leanRight);
  const camY = lerp(540, 536, pushIn);
  const camZoom = lerp(lerp(0.97, 1.0, pushIn), 1.01, leanRight);
  const hh = handheld(t, 3.2, 's02_cam');
  const impactJolt = bump(t, CUE.s02_rcsSpike, 0.32) * 8;
  const shake: readonly [number, number] = [
    hh[0] + Math.sin(t * 48) * impactJolt,
    hh[1] + Math.cos(t * 41) * impactJolt * 0.7,
  ];

  const f35BlipX = ppiX - 176;
  const f35BlipY = ppiY - 39;
  const f15BlipX = ppiX + 182;
  const f15BlipY = ppiY - 39;

  return (
    <AbsoluteFill style={{ background: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <Layer>
          <Defs2D />
          <BlueprintGrid x0={-500} y0={-360} w={2920} h={1800} step={110} id="s02_bp" tint="#0a182c" />

          {/* Đường đồng mức địa hình khu vực phòng không mờ sâu phía dưới */}
          <g transform="translate(-290 -180)" opacity={0.15}>
            {mapLines.map((c) => (
              <path
                key={c.level}
                d={c.d}
                fill="none"
                stroke={c.level % 2 === 0 ? P.gridBright : P.grid}
                strokeWidth={c.level % 3 === 0 ? 1.5 : 0.9}
              />
            ))}
          </g>

          {/* Thanh thước kỹ thuật viền trên & dưới tạo khung đài chỉ huy radar */}
          <g opacity={0.45}>
            <line x1={70} y1={58} x2={1850} y2={58} stroke={P.gridBright} strokeWidth={1.5} />
            <line x1={70} y1={1028} x2={1850} y2={1028} stroke={P.gridBright} strokeWidth={1.5} />
            {Array.from({ length: 36 }, (_, i) => {
              const tx = 85 + i * 50;
              return (
                <g key={i}>
                  <line x1={tx} y1={58} x2={tx} y2={i % 5 === 0 ? 44 : 51} stroke={P.gridBright} strokeWidth={1.3} />
                  <line x1={tx} y1={1028} x2={tx} y2={i % 5 === 0 ? 1042 : 1035} stroke={P.gridBright} strokeWidth={1.3} />
                </g>
              );
            })}
          </g>

          {/* ==================== 1. Ô TRÁI: F-35A CHIẾU TRỰC DIỆN (CỠ QUẢ BÓNG GOLF) ==================== */}
          <g filter="url(#sh)">
            <rect
              x={78}
              y={248}
              width={456}
              height={590}
              rx={16}
              fill="#0c1b31"
              fillOpacity={0.9}
              stroke={P.gridBright}
              strokeWidth={2}
            />
          </g>
          {/* Góc ngắm khung trái */}
          <g stroke={P.cyan} strokeWidth={2.5} fill="none" opacity={0.7}>
            <path d="M96,286 L96,266 L116,266" />
            <path d="M516,286 L516,266 L496,266" />
            <path d="M96,800 L96,820 L116,820" />
            <path d="M516,800 L516,820 L496,820" />
          </g>
          {/* Lưới tâm ngắm mảnh sau lưng F-35A */}
          <circle cx={306} cy={468} r={148} fill="none" stroke={P.grid} strokeWidth={1.1} strokeDasharray="6 6" opacity={0.5} />
          <line x1={140} y1={468} x2={472} y2={468} stroke={P.grid} strokeWidth={1} opacity={0.4} />
          <line x1={306} y1={310} x2={306} y2={620} stroke={P.grid} strokeWidth={1} opacity={0.4} />

          {/* Sóng radar trượt lệch khỏi bề mặt vát kim cương tàng hình của F-35A */}
          <g opacity={0.75}>
            {[0, 1, 2].map((k) => {
              const travel = ((t * 0.9 + k * 0.33) % 1);
              const wx = lerp(500, 385, travel);
              return (
                <path
                  key={k}
                  d={`M${wx} ${435 - k * 6} Q${wx - 22} 468 ${wx} ${501 + k * 6}`}
                  fill="none"
                  stroke={P.cyan}
                  strokeWidth={1.8}
                  opacity={(1 - travel) * 0.7}
                />
              );
            })}
            {/* Tia phản xạ trượt xiên lên/xuống không dội về đài phát */}
            <path d="M358,452 L432,356" fill="none" stroke={P.cyanSoft} strokeWidth={1.8} strokeDasharray="5 5" />
            <polygon points="436,351 425,356 432,363" fill={P.cyanSoft} />
            <path d="M358,484 L432,580" fill="none" stroke={P.cyanSoft} strokeWidth={1.8} strokeDasharray="5 5" />
            <polygon points="436,585 432,573 425,580" fill={P.cyanSoft} />
          </g>

          <F35Front2D x={306} y={468} scale={1.42} />

          {/* Thước quy đổi thu nhỏ thành quả bóng golf kim loại (0.005 m²) */}
          <path d="M168,548 L192,690 M444,548 L224,690" stroke={P.cyan} strokeWidth={1.3} strokeDasharray="4 5" opacity={0.45} />
          <g transform="translate(208 712)">
            <defs>
              <radialGradient id="golfBallGrad" cx="35%" cy="32%" r="65%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="52%" stopColor="#bdd2e6" />
                <stop offset="100%" stopColor="#4c647d" />
              </radialGradient>
            </defs>
            <circle cx={0} cy={0} r={24} fill="none" stroke={P.cyan} strokeWidth={1.4} strokeDasharray="4 4" opacity={0.65} />
            <circle cx={0} cy={0} r={15} fill="url(#golfBallGrad)" stroke={P.ink} strokeWidth={1.6} />
            {/* Họa tiết lúm đồng tiền (dimples) quả bóng golf kim loại */}
            {[
              [-5, -5],
              [2, -7],
              [7, -2],
              [-7, 2],
              [0, 1],
              [6, 5],
              [-3, 7],
            ].map(([dx, dy], idx) => (
              <circle key={idx} cx={dx} cy={dy} r={1.7} fill="#536b85" opacity={0.55} />
            ))}
          </g>
          {/* Thanh đo cường độ phản xạ RCS cực thấp của F-35A */}
          <rect x={256} y={700} width={236} height={24} rx={6} fill="#081322" stroke={P.grid} strokeWidth={1.6} />
          <rect x={260} y={704} width={10} height={16} rx={3} fill={P.cyan} />
          {Array.from({ length: 11 }, (_, i) => (
            <line
              key={i}
              x1={276 + i * 19}
              y1={704}
              x2={276 + i * 19}
              y2={720}
              stroke={P.grid}
              strokeWidth={1}
              opacity={0.35}
            />
          ))}

          {/* ==================== 2. TRUNG TÂM: MÀN HÌNH RADAR PHÒNG KHÔNG PPI ==================== */}
          <g filter="url(#sh)">
            <circle cx={ppiX} cy={ppiY} r={ppiR + 22} fill="#0b182b" stroke={P.gridBright} strokeWidth={3} />
          </g>
          <defs>
            <radialGradient id="ppiScreen" cx="50%" cy="50%" r="52%">
              <stop offset="0%" stopColor="#0f2742" />
              <stop offset="72%" stopColor="#081629" />
              <stop offset="100%" stopColor="#040b15" />
            </radialGradient>
            <clipPath id="ppiClip">
              <circle cx={ppiX} cy={ppiY} r={ppiR} />
            </clipPath>
          </defs>
          <circle cx={ppiX} cy={ppiY} r={ppiR} fill="url(#ppiScreen)" stroke={P.cyan} strokeWidth={2} strokeOpacity={0.55} />

          {/* Vạch chia độ quanh vành ngoài PPI */}
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i * 5 * Math.PI) / 180;
            const major = i % 6 === 0;
            const rIn = ppiR + 3;
            const rOut = ppiR + (major ? 16 : 9);
            return (
              <line
                key={i}
                x1={ppiX + Math.cos(a) * rIn}
                y1={ppiY + Math.sin(a) * rIn}
                x2={ppiX + Math.cos(a) * rOut}
                y2={ppiY + Math.sin(a) * rOut}
                stroke={major ? P.cyanSoft : P.gridBright}
                strokeWidth={major ? 2 : 1.1}
                opacity={major ? 0.8 : 0.45}
              />
            );
          })}

          {/* Lưới vòng cự ly & nan phương vị bên trong màn PPI */}
          <g clipPath="url(#ppiClip)">
            {[80, 160, 240, 318].map((rr) => (
              <circle
                key={rr}
                cx={ppiX}
                cy={ppiY}
                r={rr}
                fill="none"
                stroke={P.cyan}
                strokeWidth={rr === 160 ? 1.5 : 1}
                opacity={rr === 160 ? 0.35 : 0.22}
              />
            ))}
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i * 30 * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={ppiX}
                  y1={ppiY}
                  x2={ppiX + Math.cos(a) * ppiR}
                  y2={ppiY + Math.sin(a) * ppiR}
                  stroke={P.cyan}
                  strokeWidth={1}
                  opacity={0.2}
                />
              );
            })}

            {/* Đuôi phosphor của chùm tia quét radar xoay tròn */}
            {Array.from({ length: 14 }, (_, k) => {
              const step = 3.6;
              const a1 = sweepDeg - k * step;
              const a0 = a1 - step - 0.4;
              return (
                <path
                  key={k}
                  d={wedgePath(ppiX, ppiY, ppiR, a0, a1)}
                  fill={P.cyan}
                  opacity={((14 - k) / 14) * 0.22}
                />
              );
            })}

            {/* Chấm tín hiệu F-35A siêu nhỏ bên trái màn radar */}
            <circle cx={f35BlipX} cy={f35BlipY} r={8} fill={P.cyan} opacity={0.16} />
            <circle cx={f35BlipX} cy={f35BlipY} r={3.2} fill={P.ordWhite} />

            {/* Khối tín hiệu dội radar khổng lồ 100–200 sq ft của F-15EX bên phải màn PPI */}
            {(() => {
              const baseBlob = 16 + 26 * pRadarOn + 34 * pRcsSpike + 18 * pulse;
              return (
                <g>
                  {/* Sóng xung kích radar đỏ lan rộng khi vượt ngưỡng 100-200 sq ft */}
                  {pRadarOn > 0.02 &&
                    [0, 1, 2].map((w) => {
                      const ph = ((t - CUE.s02_radarSweep + w * 0.42) % 1.26) / 1.26;
                      const ringR = baseBlob * 0.6 + ph * (95 + 55 * pRcsSpike);
                      return (
                        <circle
                          key={w}
                          cx={f15BlipX}
                          cy={f15BlipY}
                          r={ringR}
                          fill="none"
                          stroke={w % 2 === 0 ? P.red : P.amber}
                          strokeWidth={3.2 * (1 - ph)}
                          opacity={(1 - ph) * (0.55 + 0.4 * pRcsSpike)}
                        />
                      );
                    })}

                  {/* Cánh hoa đồ thị cực RCS (polar radar lobes) */}
                  {pRcsSpike > 0.02 && (
                    <polygon
                      points={Array.from({ length: 24 }, (_, j) => {
                        const ang = (j / 24) * Math.PI * 2;
                        const lobe =
                          1 +
                          0.45 * Math.abs(Math.cos(ang * 2)) +
                          0.25 * Math.sin(ang * 4 + t * 5);
                        const rad = baseBlob * 0.85 * lobe;
                        return `${(f15BlipX + Math.cos(ang) * rad).toFixed(1)},${(
                          f15BlipY +
                          Math.sin(ang) * rad
                        ).toFixed(1)}`;
                      }).join(' ')}
                      fill={P.red}
                      fillOpacity={0.28 * pRcsSpike}
                      stroke={P.amber}
                      strokeWidth={2}
                      opacity={pRcsSpike}
                    />
                  )}

                  <circle cx={f15BlipX} cy={f15BlipY} r={baseBlob * 1.25} fill={P.red} opacity={0.24 + 0.2 * pulse} />
                  <circle cx={f15BlipX} cy={f15BlipY} r={baseBlob * 0.72} fill={P.red} opacity={0.65} />
                  <circle cx={f15BlipX} cy={f15BlipY} r={baseBlob * 0.38} fill={P.amberHot} />
                </g>
              );
            })()}

            {/* Kim quét radar sáng sắc nét (nét kép halo + lõi) */}
            <line
              x1={ppiX}
              y1={ppiY}
              x2={ppiX + Math.cos(sweepRad) * ppiR}
              y2={ppiY + Math.sin(sweepRad) * ppiR}
              stroke={P.cyan}
              strokeWidth={7}
              opacity={0.24}
            />
            <line
              x1={ppiX}
              y1={ppiY}
              x2={ppiX + Math.cos(sweepRad) * ppiR}
              y2={ppiY + Math.sin(sweepRad) * ppiR}
              stroke="#d6fbff"
              strokeWidth={2.6}
            />
            <circle cx={ppiX} cy={ppiY} r={6} fill={P.cyanSoft} stroke={P.ink} strokeWidth={1.5} />
          </g>

          {/* Đường gióng kết nối từ 2 chấm tín hiệu trên PPI sang 2 ô chiếu trực diện */}
          <path
            d={`M${f35BlipX} ${f35BlipY} L612 ${f35BlipY} L534 468`}
            fill="none"
            stroke={P.cyan}
            strokeWidth={1.8}
            strokeDasharray="6 6"
            opacity={0.65}
          />
          <path
            d={`M${f15BlipX} ${f15BlipY} L1275 ${f15BlipY} L1342 480`}
            fill="none"
            stroke={pRadarOn > 0.1 ? P.red : P.amber}
            strokeWidth={2.6 + 1.2 * pRcsSpike}
            opacity={0.85}
          />

          {/* ==================== 3. Ô PHẢI: F-15EX TREO ĐẦY VŨ KHÍ & BÓNG XE ĐẦU KÉO ==================== */}
          <g filter="url(#sh)">
            <rect
              x={1342}
              y={248}
              width={504}
              height={590}
              rx={16}
              fill="#101c30"
              fillOpacity={0.92}
              stroke={pRadarOn > 0.1 ? P.red : P.gridBright}
              strokeWidth={pRcsSpike > 0.1 ? 3.4 : 2.2}
            />
          </g>
          {/* Khung cảnh báo khóa mục tiêu góc ô phải */}
          <g stroke={pRadarOn > 0.1 ? P.red : P.amber} strokeWidth={2.8} fill="none" opacity={0.85}>
            <path d="M1360,288 L1360,266 L1382,266" />
            <path d="M1828,288 L1828,266 L1806,266" />
            <path d="M1360,798 L1360,820 L1382,820" />
            <path d="M1828,798 L1828,820 L1806,820" />
          </g>

          {/* Vòng sóng dội radar đỏ-vàng khổng lồ phát ngược ra từ F-15EX tại 34.54s và 37.22s */}
          {pRadarOn > 0.02 && (
            <g>
              {[0, 1, 2, 3].map((k) => {
                const ph = ((t - CUE.s02_radarSweep + k * 0.34) % 1.36) / 1.36;
                const rr = 65 + ph * (175 + 45 * pRcsSpike);
                return (
                  <circle
                    key={k}
                    cx={1594}
                    cy={478}
                    r={rr}
                    fill="none"
                    stroke={k % 2 === 0 ? P.red : P.amber}
                    strokeWidth={(4.2 - ph * 3) * (0.7 + 0.5 * pRcsSpike)}
                    opacity={(1 - ph) * (0.55 + 0.4 * pRcsSpike)}
                  />
                );
              })}
              {/* Các cung sóng dội ngược thẳng về đài radar trung tâm */}
              {[0, 1, 2].map((m) => {
                const w = ((t * 1.35 + m * 0.33) % 1);
                const arcX = lerp(1465, 1348, w);
                return (
                  <path
                    key={m}
                    d={`M${arcX} ${410 - w * 28} Q${arcX - 34} 478 ${arcX} ${546 + w * 28}`}
                    fill="none"
                    stroke={P.red}
                    strokeWidth={3}
                    opacity={(1 - w) * (0.6 + 0.4 * pRcsSpike)}
                  />
                );
              })}
            </g>
          )}

          {/* Luồng gió mở (open wind) lướt qua dàn đạn, bom & thùng dầu lộ thiên từ 29.5s */}
          {pOpenWind > 0.01 && (
            <g opacity={0.45 * pOpenWind}>
              {[-180, -110, -45, 45, 110, 180].map((dx, idx) => (
                <line
                  key={idx}
                  x1={1594 + dx}
                  y1={325}
                  x2={1594 + dx}
                  y2={615}
                  stroke={P.gridBright}
                  strokeWidth={1.2}
                  strokeDasharray="8 10"
                />
              ))}
            </g>
          )}

          {/* F-15EX nhìn trực diện treo đầy thùng dầu phụ, bom và 8 tên lửa ngoài gió */}
          <F15Front2D x={1594} y={482} scale={1.34} loadout="heavyRadar" />

          {/* Điểm đánh dấu các góc phản xạ vuông góc (2 đuôi đứng 90°, cửa hút khí, 3 thùng dầu/bom) */}
          {pOpenWind > 0.05 && (
            <g opacity={pOpenWind * (1 - 0.35 * pTruck)}>
              {[
                [1594 - 102, 518, 18],
                [1594 + 102, 518, 18],
                [1594, 524, 19],
                [1594 - 50, 392, 14],
                [1594 + 50, 392, 14],
                [1594 - 189, 507, 11],
                [1594 + 189, 507, 11],
              ].map(([hx, hy, hr], idx) => (
                <circle
                  key={idx}
                  cx={hx}
                  cy={hy}
                  r={hr + Math.sin(t * 7 + idx) * 2}
                  fill="none"
                  stroke={pRadarOn > 0.2 ? P.red : P.amber}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
              ))}
            </g>
          )}

          {/* Đường viền bóng mờ hổ phách chiếc xe đầu kéo 18 bánh lồng khớp kích thước F-15EX tại 39.50s */}
          <SemiTruckGhost x={1594} y={484} scale={1.54} opacity={pTruck} />

          {/* Đồng hồ đo xung đỉnh RCS quá tải ở đáy ô phải */}
          <g>
            {/* Đồ thị xung nhọn radar (RCS spike waveform) */}
            <path
              d={Array.from({ length: 33 }, (_, i) => {
                const sx = 1378 + i * 13.5;
                const norm = (i - 16) / 6.5;
                const env = Math.exp(-(norm * norm));
                const amp = (14 + 46 * pRadarOn + 38 * pRcsSpike) * env;
                const sy = 690 - amp * (0.65 + 0.35 * Math.abs(Math.sin(t * 14 + i * 1.7)));
                return `${i === 0 ? 'M' : 'L'}${sx.toFixed(1)} ${sy.toFixed(1)}`;
              }).join(' ')}
              fill="none"
              stroke={pRcsSpike > 0.1 ? P.red : P.amber}
              strokeWidth={2.6}
            />
            <rect x={1378} y={700} width={432} height={24} rx={6} fill="#081322" stroke={P.grid} strokeWidth={1.6} />
            {Array.from({ length: 18 }, (_, i) => {
              const fillRatio = 0.22 + 0.45 * pRadarOn + 0.33 * pRcsSpike;
              const active = (i + 1) / 18 <= fillRatio;
              const col = i < 7 ? P.amber : i < 12 ? P.flame : P.red;
              return (
                <rect
                  key={i}
                  x={1383 + i * 23.6}
                  y={704}
                  width={19.5}
                  height={16}
                  rx={2.5}
                  fill={active ? col : '#152842'}
                  opacity={active ? 0.95 : 0.35}
                />
              );
            })}
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.42} />

      <Label
        t={t}
        text="100–200 SQ FT"
        x={960}
        y={122}
        from={CUE.s02_rcsSpike}
        until={41.8}
        bg={P.red}
        fg={P.paper}
      />
    </AbsoluteFill>
  );
};

export default S02;
