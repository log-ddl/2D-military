import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog } from '@kit/theme';
import { handheld, Label, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Puff2D } from '@lib/2d/fx';
import { drawOn, smoothPath, type Pt } from '@lib/2d/path';
import { CUE } from '../cues';
import { MBT_SPEC, P2D } from '../local/palette';

// Tỉ lệ bản vẽ kỹ thuật: 1 mét thật = 108 px trên mặt giấy (thân xe 7.9m = 853px, cả pháo 9.6m = 1037px)
const S = 108;
const OX = 945; // Tâm X của xe tăng trên bàn cân
const BASE_PLAT_Y = 648; // Cao độ mặt bàn cân ở trạng thái không tải
const FLOOR_Y = 876; // Dầm móng cố định của hệ bàn cân cơ khí

const toPoly = (pts: readonly [number, number][]) =>
  pts.map(([mx, my]) => `${(mx * S).toFixed(1)},${(-my * S).toFixed(1)}`).join(' ');

/** Vẽ lò xo trụ chịu tải bị nén giữa yTop và yBot. */
const CoilSpring: React.FC<{
  x: number;
  yTop: number;
  yBot: number;
  strain: number;
}> = ({ x, yTop, yBot, strain }) => {
  const coils = 6;
  const w = lerp(24, 31, strain);
  const pad = 10;
  const h = Math.max(24, yBot - yTop - pad * 2);
  let d = `M ${x} ${yTop} L ${x} ${yTop + pad}`;
  for (let i = 0; i < coils; i++) {
    const y1 = yTop + pad + ((i + 0.25) / coils) * h;
    const y2 = yTop + pad + ((i + 0.75) / coils) * h;
    const y3 = yTop + pad + ((i + 1) / coils) * h;
    d += ` L ${x - w} ${y1.toFixed(1)} L ${x + w} ${y2.toFixed(1)} L ${x} ${y3.toFixed(1)}`;
  }
  d += ` L ${x} ${yBot}`;
  const springCol = mix(P2D.steelMid, P2D.weakRed, strain * 0.82);

  return (
    <g>
      {/* Ty giảm chấn thủy lực đồng tâm bên trong lò xo */}
      <rect
        x={x - 7}
        y={(yTop + yBot) * 0.5 - 4}
        width={14}
        height={(yBot - yTop) * 0.5 + 4}
        rx={2}
        fill={P2D.steelLo}
        stroke={P2D.paperInk}
        strokeWidth={2}
      />
      <rect
        x={x - 4}
        y={yTop + 4}
        width={8}
        height={(yBot - yTop) * 0.55}
        fill={P2D.ceramicHi}
        stroke={P2D.paperInk}
        strokeWidth={1.6}
      />
      {/* Đế đệm cao su trên & dưới */}
      <rect
        x={x - 28}
        y={yTop - 2}
        width={56}
        height={8}
        rx={2}
        fill={P2D.steelDark}
      />
      <rect
        x={x - 32}
        y={yBot - 6}
        width={64}
        height={8}
        rx={2}
        fill={P2D.steelDark}
      />
      {/* Cuộn dây thép lò xo */}
      <path
        d={d}
        fill="none"
        stroke={P2D.paperInk}
        strokeWidth={8.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={d}
        fill="none"
        stroke={springCol}
        strokeWidth={5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  );
};

/** Kẹp thước đo độ dày kỹ thuật rõ nét (2 mũi tên kẹp ngược chiều nhau hoặc căng trong lòng tấm giáp dày). */
const ThicknessCaliper: React.FC<{
  x: number;
  yOuter: number;
  yInner: number;
  color: string;
  alpha: number;
  inside?: boolean;
}> = ({ x, yOuter, yInner, color, alpha, inside = false }) => {
  if (alpha <= 0.01) return null;
  if (inside) {
    return (
      <g opacity={alpha}>
        <line
          x1={x}
          y1={yOuter + 6}
          x2={x}
          y2={yInner - 6}
          stroke={color}
          strokeWidth={3.8}
        />
        <polygon
          points={`${x},${yOuter + 2} ${x - 9},${yOuter + 16} ${x + 9},${yOuter + 16}`}
          fill={color}
        />
        <polygon
          points={`${x},${yInner - 2} ${x - 9},${yInner - 16} ${x + 9},${yInner - 16}`}
          fill={color}
        />
        <line
          x1={x - 22}
          y1={yOuter}
          x2={x + 22}
          y2={yOuter}
          stroke={color}
          strokeWidth={3}
        />
        <line
          x1={x - 22}
          y1={yInner}
          x2={x + 22}
          y2={yInner}
          stroke={color}
          strokeWidth={3}
        />
      </g>
    );
  }
  const stem = 42;
  return (
    <g opacity={alpha}>
      {/* Mũi tên ép từ trên xuống mặt ngoài giáp mỏng */}
      <line
        x1={x}
        y1={yOuter - stem}
        x2={x}
        y2={yOuter - 4}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <polygon
        points={`${x},${yOuter - 1} ${x - 9.5},${yOuter - 17} ${x + 9.5},${yOuter - 17}`}
        fill={color}
      />
      {/* Mũi tên ép từ dưới lên mặt trong giáp mỏng */}
      <line
        x1={x}
        y1={yInner + stem}
        x2={x}
        y2={yInner + 4}
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
      />
      <polygon
        points={`${x},${yInner + 1} ${x - 9.5},${yInner + 17} ${x + 9.5},${yInner + 17}`}
        fill={color}
      />
      {/* Gạch gióng ngang */}
      <line
        x1={x - 20}
        y1={yOuter}
        x2={x + 20}
        y2={yOuter}
        stroke={color}
        strokeWidth={2.8}
      />
      <line
        x1={x - 20}
        y1={yInner}
        x2={x + 20}
        y2={yInner}
        stroke={color}
        strokeWidth={2.8}
      />
    </g>
  );
};

const S04: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== TIẾN ĐỘ CÁC PHA KỸ THUẬT ====================
  // Pha 1 (21.0 -> 28.2s): Ốp khối giáp thép dày 800mm kín mọi phía -> sập bàn cân & quá tải động cơ
  const pClampTop = prog(t, CUE.s04_weight_law, CUE.s04_all_800mm - 0.15);
  const pClampSides = prog(t, CUE.s04_weight_law + 0.3, CUE.s04_all_800mm);
  const slamBump = bump(t, CUE.s04_all_800mm, 0.48);

  // Pha 2A (28.35 -> 30.64s): Rút giáp khỏi nóc/đuôi/gầm, dồn toàn bộ ra mặt trước
  const pShiftFront = prog(t, 28.35, CUE.s04_shift_front + 0.25);
  const pFlowArrows =
    prog(t, 28.3, 29.3) * (1 - prog(t, 31.1, 32.0));

  // Mức quá tải trọng lượng (0 = cân bằng, 1 = quá tải sập đáy ở 26.26..28.35s)
  const overloadBuild =
    0.35 * prog(t, CUE.s04_weight_law + 0.3, CUE.s04_engine_strain + 0.4) +
    0.65 * prog(t, CUE.s04_engine_strain + 0.2, CUE.s04_all_800mm + 0.08);
  const overload =
    overloadBuild * (1 - prog(t, 28.45, CUE.s04_shift_front + 0.1));

  // Động cơ cháy đỏ & khói xám bất lực khi bị đè khối giáp 800mm bọc kín
  const engineStrain =
    prog(t, CUE.s04_engine_strain - 0.15, CUE.s04_all_800mm) *
    (1 - prog(t, 28.4, 30.2));

  // Pha 2B (32.60 -> 35.95s): Bật tức thì cảnh báo tử huyệt nóc tháp pháo (32.60s) & nắp khoang động cơ (33.46s)
  const pThinRoof = prog(t, CUE.s04_thin_roof - 0.08, CUE.s04_thin_roof + 0.2);
  const pThinEngine = prog(
    t,
    CUE.s04_thin_engine - 0.08,
    CUE.s04_thin_engine + 0.22,
  );
  const warnPulse = 0.8 + 0.2 * Math.sin(t * 9.5);

  // Khi xe đã nhẹ và cân bằng (từ ~29.4s), động cơ kéo bánh xích lăn êm về phía trước
  const mobility = prog(t, 29.35, 30.9);
  const wheelAngle =
    mobility > 0.01
      ? (t - 29.35) * 4.8 * mobility
      : engineStrain * 0.16 * Math.sin(t * 42);

  // Độ lún của bàn cân cơ khí (px)
  const sinkPx = 18 + overload * 64 + slamBump * 11;
  const platY = BASE_PLAT_Y + sinkPx;
  const hullSquat = overload * 7 + slamBump * 3;

  // ==================== CAMERA 2D ====================
  // Đẩy zoom nhẹ lên phần thân trên & nóc xe từ mốc CUE.s04_thin_roof (32.60s), giữ trọn đế bàn cân trong khung
  const pZoomUpper = prog(
    t,
    CUE.s04_thin_roof - 0.35,
    CUE.s04_thin_engine + 0.55,
  );
  const camX = lerp(940, 916, pZoomUpper);
  const camY = lerp(548, 504, pZoomUpper);
  const camZoom = lerp(1.0, 1.14, pZoomUpper);
  const drift = handheld(t, 1.8, 's04-blueprint');
  const slamShakeY = slamBump * 12 * Math.sin((t - CUE.s04_all_800mm) * 38);
  const strainJolt = engineStrain * 1.8 * Math.sin(t * 54);
  const camShake = [drift[0] + strainJolt, drift[1] + slamShakeY] as const;

  // Độ dày lớp vỏ giáp 800mm ở nóc/đuôi/gầm (Pha 1 dày 76px -> Pha 2 rút hết về 0 để lộ vỏ mỏng)
  const heavyShellAlpha =
    prog(t, CUE.s04_weight_law, CUE.s04_weight_law + 0.45) *
    (1 - prog(t, 29.95, 30.7));
  const shellThick = 76 * (1 - pShiftFront);

  // Rung bần bật tại khối động cơ khi quá tải
  const engVibX = engineStrain * 3.5 * Math.sin(t * 63);
  const engVibY = engineStrain * 2.8 * Math.cos(t * 71);

  // Góc kim đồng hồ đo tải trọng (-42 độ = Xanh cân bằng, +118 độ = Kịch kim Đỏ quá tải)
  const dialDeg =
    lerp(-42, 118, overload) +
    (overload > 0.82 ? 3.5 * Math.sin(t * 52) : 0) -
    mobility * 8;

  // 3 đường mũi tên dòng chảy phân bổ vật liệu giáp từ nóc & đuôi dồn ra mũi xe
  const flowPath1 = smoothPath([
    [-255, -298],
    [-40, -338],
    [155, -310],
    [255, -238],
  ] as Pt[]);
  const flowPath2 = smoothPath([
    [-435, -212],
    [-195, -232],
    [70, -198],
    [325, -155],
  ] as Pt[]);
  const flowPath3 = smoothPath([
    [-310, -24],
    [-40, -18],
    [195, -45],
    [380, -95],
  ] as Pt[]);

  return (
    <AbsoluteFill>
      <Cam2D
        x={camX}
        y={camY}
        zoom={camZoom}
        shake={camShake}
        bg={P2D.paperBg}
      >
        <svg
          width={1920}
          height={1080}
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
        >
          <Defs2D shadow="rgba(24, 33, 43, 0.22)" />
          <defs>
            <linearGradient id="paperGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P2D.paperPanel} />
              <stop offset="65%" stopColor={P2D.paperBg} />
              <stop offset="100%" stopColor={P2D.paperWarm} />
            </linearGradient>
            <pattern
              id="gridMinor"
              width="36"
              height="36"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 36 0 L 0 0 0 36"
                fill="none"
                stroke={P2D.paperGrid}
                strokeWidth="0.8"
                opacity="0.55"
              />
            </pattern>
            <pattern
              id="gridMajor"
              width="180"
              height="180"
              patternUnits="userSpaceOnUse"
            >
              <rect width="180" height="180" fill="url(#gridMinor)" />
              <path
                d="M 180 0 L 0 0 0 180"
                fill="none"
                stroke={P2D.paperGrid}
                strokeWidth="1.7"
                opacity="0.85"
              />
            </pattern>
            <pattern
              id="armorHatch"
              width="14"
              height="14"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(42)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="14"
                stroke="#ffffff"
                strokeWidth="2.2"
                opacity="0.18"
              />
            </pattern>
            <pattern
              id="safeHatch"
              width="12"
              height="12"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-35)"
            >
              <line
                x1="0"
                y1="0"
                x2="0"
                y2="12"
                stroke="#ffffff"
                strokeWidth="2.6"
                opacity="0.28"
              />
            </pattern>
            <pattern
              id="hazardStripe"
              width="18"
              height="18"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <rect width="9" height="18" fill={P2D.paperInk} opacity="0.14" />
            </pattern>
          </defs>

          {/* ==================== 1. NỀN GIẤY HỒ SƠ KỸ SƯ & KHUNG BẢN VẼ ==================== */}
          <rect
            x={-260}
            y={-180}
            width={2440}
            height={1440}
            fill="url(#paperGrad)"
          />
          <rect
            x={-260}
            y={-180}
            width={2440}
            height={1440}
            fill="url(#gridMajor)"
          />

          {/* Khung viền kép bản vẽ kỹ thuật */}
          <rect
            x={54}
            y={46}
            width={1812}
            height={988}
            fill="none"
            stroke={P2D.paperInk}
            strokeWidth={3}
            opacity={0.75}
          />
          <rect
            x={66}
            y={58}
            width={1788}
            height={964}
            fill="none"
            stroke={P2D.paperInk}
            strokeWidth={1.1}
            opacity={0.48}
          />
          {(
            [
              [54, 46, 1, 1],
              [1866, 46, -1, 1],
              [54, 1034, 1, -1],
              [1866, 1034, -1, -1],
            ] as [number, number, number, number][]
          ).map(([cx, cy, sx, sy], idx) => (
            <path
              key={idx}
              d={`M ${cx} ${cy + sy * 28} L ${cx} ${cy} L ${cx + sx * 28} ${cy}`}
              fill="none"
              stroke={P2D.paperInk}
              strokeWidth={5}
            />
          ))}
          {Array.from({ length: 29 }, (_, i) => {
            const rx = 180 + i * 56;
            const tall = i % 5 === 0 ? 14 : 7;
            return (
              <line
                key={i}
                x1={rx}
                y1={58}
                x2={rx}
                y2={58 + tall}
                stroke={P2D.paperInk}
                strokeWidth={i % 5 === 0 ? 1.8 : 1}
                opacity={0.45}
              />
            );
          })}

          {/* Vòng cung thước đo góc kỹ sư mờ phía sau xe tăng */}
          <g transform={`translate(${OX - 15} ${BASE_PLAT_Y - 110})`} opacity={0.22}>
            <circle
              cx={0}
              cy={0}
              r={420}
              fill="none"
              stroke={P2D.paperMuted}
              strokeWidth={1.4}
              strokeDasharray="10 8"
            />
            <circle
              cx={0}
              cy={0}
              r={310}
              fill="none"
              stroke={P2D.paperMuted}
              strokeWidth={1}
            />
            <line
              x1={-490}
              y1={0}
              x2={540}
              y2={0}
              stroke={P2D.paperMuted}
              strokeWidth={1}
              strokeDasharray="6 6"
            />
            <line
              x1={0}
              y1={-450}
              x2={0}
              y2={140}
              stroke={P2D.paperMuted}
              strokeWidth={1}
              strokeDasharray="6 6"
            />
          </g>

          {/* ==================== 2. HỆ BÀN CÂN TẢI TRỌNG CƠ KHÍ & ĐỒNG HỒ KIM ==================== */}
          <g filter="url(#sh)">
            <rect
              x={385}
              y={FLOOR_Y}
              width={1160}
              height={42}
              rx={5}
              fill={P2D.paperWarm}
              stroke={P2D.paperInk}
              strokeWidth={3}
            />
            <rect
              x={385}
              y={FLOOR_Y}
              width={1160}
              height={42}
              fill="url(#hazardStripe)"
            />
            {[465, 1465].map((bx, i) => (
              <rect
                key={i}
                x={bx - 18}
                y={FLOOR_Y - 122}
                width={36}
                height={122}
                rx={3}
                fill={
                  overload > 0.85
                    ? mix(P2D.steelLo, P2D.weakRed, 0.5)
                    : P2D.steelLo
                }
                stroke={P2D.paperInk}
                strokeWidth={2.5}
              />
            ))}
          </g>

          {/* 4 cụm lò xo trụ chịu lực dưới dầm bàn cân */}
          {[565, 815, 1065, 1315].map((sx, idx) => (
            <CoilSpring
              key={idx}
              x={sx}
              yTop={platY + 38}
              yBot={FLOOR_Y}
              strain={overload}
            />
          ))}

          {/* Dầm chữ I mặt bàn cân chịu tải */}
          <g filter="url(#sh)">
            <rect
              x={405}
              y={platY}
              width={1120}
              height={38}
              rx={4}
              fill={mix(P2D.steelMid, P2D.weakRed, overload * 0.35)}
              stroke={P2D.paperInk}
              strokeWidth={3.2}
            />
            <rect
              x={412}
              y={platY + 5}
              width={1106}
              height={8}
              fill={P2D.steelHi}
              opacity={0.55}
            />
            {Array.from({ length: 15 }, (_, i) => (
              <circle
                key={i}
                cx={445 + i * 74}
                cy={platY + 21}
                r={3.6}
                fill={P2D.paperBg}
                stroke={P2D.paperInk}
                strokeWidth={1.4}
              />
            ))}
            {mobility > 0.05 &&
              Array.from({ length: 8 }, (_, k) => {
                const lx =
                  440 +
                  ((((k * 138 - (t - 29.3) * 190 * mobility) % 1040) + 1040) %
                    1040);
                return (
                  <line
                    key={k}
                    x1={lx}
                    y1={platY - 2}
                    x2={lx + 38}
                    y2={platY - 2}
                    stroke={P2D.armorSafe}
                    strokeWidth={3.2}
                    opacity={0.6 * mobility}
                    strokeLinecap="round"
                  />
                );
              })}
          </g>

          {/* Thanh đòn bẩy cơ khí nối từ bàn cân sang Đồng hồ đo tải trọng bên trái */}
          <g>
            <line
              x1={408}
              y1={platY + 19}
              x2={315}
              y2={690 + (sinkPx - 18) * 0.35}
              stroke={P2D.paperInk}
              strokeWidth={7}
              strokeLinecap="round"
            />
            <line
              x1={408}
              y1={platY + 19}
              x2={315}
              y2={690 + (sinkPx - 18) * 0.35}
              stroke={P2D.ceramicHi}
              strokeWidth={3.5}
              strokeLinecap="round"
            />
            <circle
              cx={408}
              cy={platY + 19}
              r={6.5}
              fill={P2D.explosive}
              stroke={P2D.paperInk}
              strokeWidth={2.2}
            />
          </g>

          {/* Đồng hồ kim đo tải trọng cơ khí (bên trái bàn cân) */}
          <g transform="translate(230 675)" filter="url(#sh)">
            <path
              d="M -46 110 L -28 240 L 58 240 L 40 110 Z"
              fill={P2D.steelLo}
              stroke={P2D.paperInk}
              strokeWidth={3}
            />
            <circle
              cx={0}
              cy={0}
              r={118}
              fill={P2D.steelMid}
              stroke={P2D.paperInk}
              strokeWidth={3.5}
            />
            <circle
              cx={0}
              cy={0}
              r={103}
              fill={P2D.paperPanel}
              stroke={P2D.paperInk}
              strokeWidth={2.5}
            />
            <path
              d="M -72 -50 A 88 88 0 0 1 -22 -85"
              fill="none"
              stroke="#2fb36d"
              strokeWidth={15}
              strokeLinecap="butt"
            />
            <path
              d="M -22 -85 A 88 88 0 0 1 62 -62"
              fill="none"
              stroke={P2D.explosive}
              strokeWidth={15}
              strokeLinecap="butt"
            />
            <path
              d="M 62 -62 A 88 88 0 0 1 74 48"
              fill="none"
              stroke={P2D.weakRed}
              strokeWidth={17}
              strokeLinecap="butt"
            />
            {Array.from({ length: 17 }, (_, i) => {
              const degA = -125 + (i / 16) * 250;
              const rad = ((degA - 90) * Math.PI) / 180;
              const r1 = i % 4 === 0 ? 70 : 77;
              const r2 = 96;
              return (
                <line
                  key={i}
                  x1={Math.cos(rad) * r1}
                  y1={Math.sin(rad) * r1}
                  x2={Math.cos(rad) * r2}
                  y2={Math.sin(rad) * r2}
                  stroke={degA > 45 ? P2D.weakRed : P2D.paperInk}
                  strokeWidth={i % 4 === 0 ? 3 : 1.6}
                />
              );
            })}
            <circle
              cx={0}
              cy={56}
              r={13}
              fill={overload > 0.65 ? P2D.weakRed : P2D.steelLo}
              stroke={P2D.paperInk}
              strokeWidth={2.2}
              filter={overload > 0.75 ? 'url(#glow)' : undefined}
            />
            <g transform={`rotate(${dialDeg})`}>
              <polygon
                points="-7,22 -3,-86 0,-94 3,-86 7,22"
                fill={overload > 0.65 ? P2D.weakRed : P2D.paperInk}
              />
            </g>
            <circle
              cx={0}
              cy={0}
              r={12}
              fill={P2D.steelHi}
              stroke={P2D.paperInk}
              strokeWidth={2.5}
            />
          </g>

          {/* ==================== 3. XE TĂNG MBT NHÌN NGANG & LỚP GIÁP BIẾN ĐỔI ==================== */}
          <g transform={`translate(${OX} ${platY})`}>
            {/* --- 3A. HỆ BÁNH XÍCH 7 BÁNH CHỊU NẶNG --- */}
            <g>
              <path
                d={`M ${-3.42 * S} ${-0.84 * S} L ${3.4 * S} ${-0.82 * S} A ${0.38 * S} ${0.38 * S} 0 0 1 ${3.32 * S} ${-0.04 * S} L ${-3.32 * S} ${-0.04 * S} A ${0.4 * S} ${0.4 * S} 0 0 1 ${-3.42 * S} ${-0.84 * S} Z`}
                fill={P2D.steelDark}
                stroke={P2D.paperInk}
                strokeWidth={4}
              />
              <path
                d={`M ${-3.35 * S} ${-0.8 * S} L ${3.35 * S} ${-0.78 * S} A ${0.34 * S} ${0.34 * S} 0 0 1 ${3.28 * S} ${-0.06 * S} L ${-3.28 * S} ${-0.06 * S} A ${0.36 * S} ${0.36 * S} 0 0 1 ${-3.35 * S} ${-0.8 * S} Z`}
                fill="none"
                stroke={P2D.ceramicHi}
                strokeWidth={5}
                strokeDasharray="16 11"
                strokeDashoffset={-wheelAngle * 36}
              />
              {[
                ...MBT_SPEC.wheelXs.map((wx) => ({
                  x: wx * S,
                  y: -0.37 * S,
                  r: 0.32 * S,
                  hub: 0.14 * S,
                })),
                { x: 3.32 * S, y: -0.44 * S, r: 0.27 * S, hub: 0.11 * S },
                { x: -3.36 * S, y: -0.46 * S, r: 0.3 * S, hub: 0.14 * S },
              ].map((w, wi) => (
                <g key={wi} transform={`translate(${w.x} ${w.y})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={w.r}
                    fill={P2D.steelLo}
                    stroke={P2D.paperInk}
                    strokeWidth={2.8}
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={w.r * 0.76}
                    fill={P2D.steelMid}
                    stroke={P2D.paperInk}
                    strokeWidth={1.8}
                  />
                  <g transform={`rotate(${(wheelAngle * 180) / Math.PI})`}>
                    {[0, 1, 2, 3, 4, 5].map((sp) => {
                      const a = (sp * Math.PI) / 3;
                      return (
                        <circle
                          key={sp}
                          cx={Math.cos(a) * w.r * 0.48}
                          cy={Math.sin(a) * w.r * 0.48}
                          r={3.2}
                          fill={P2D.paperBg}
                        />
                      );
                    })}
                    <line
                      x1={-w.r * 0.65}
                      y1={0}
                      x2={w.r * 0.65}
                      y2={0}
                      stroke={P2D.steelHi}
                      strokeWidth={2.2}
                    />
                  </g>
                  <circle
                    cx={0}
                    cy={0}
                    r={w.hub}
                    fill={P2D.ceramicHi}
                    stroke={P2D.paperInk}
                    strokeWidth={2}
                  />
                </g>
              ))}
            </g>

            {/* --- 3B. THÂN XE, THÁP PHÁO, MẶT CẮT X-QUANG ĐỘNG CƠ & CÁC LỚP GIÁP --- */}
            <g transform={`translate(0 ${hullSquat})`}>
              {/* Khói xả xám đen đậm đặc phụt ra từ ống xả đuôi xe khi động cơ quá tải (Pha 1) */}
              {engineStrain > 0.04 &&
                Array.from({ length: 11 }, (_, si) => {
                  const cycle = ((t - 23.6) * 1.4 + si / 11) % 1;
                  if (cycle < 0) return null;
                  const px = -438 - cycle * 175 - si * 4;
                  const py =
                    -140 -
                    cycle * cycle * 170 -
                    Math.sin(si * 2.1 + t * 3) * 14;
                  const pr = 18 + cycle * 46;
                  return (
                    <Puff2D
                      key={si}
                      seed={40 + si}
                      x={px}
                      y={py}
                      r={pr}
                      color={si % 2 === 0 ? '#57524b' : '#7c766d'}
                      opacity={engineStrain * (1 - cycle * 0.88) * 0.9}
                    />
                  );
                })}

              {/* 120mm L/55 Pháo chính có bầu hút khói */}
              <g filter="url(#sh)">
                <rect
                  x={1.7 * S}
                  y={-2.06 * S}
                  width={3.92 * S}
                  height={0.18 * S}
                  rx={3}
                  fill={P2D.steelMid}
                  stroke={P2D.paperInk}
                  strokeWidth={2.8}
                />
                <rect
                  x={1.7 * S}
                  y={-2.05 * S}
                  width={3.9 * S}
                  height={0.055 * S}
                  fill={P2D.ceramicHi}
                  opacity={0.65}
                />
                <rect
                  x={3.05 * S}
                  y={-2.11 * S}
                  width={0.78 * S}
                  height={0.28 * S}
                  rx={5}
                  fill={P2D.steelHi}
                  stroke={P2D.paperInk}
                  strokeWidth={2.6}
                />
                <rect
                  x={5.48 * S}
                  y={-2.09 * S}
                  width={0.18 * S}
                  height={0.24 * S}
                  rx={2}
                  fill={P2D.steelLo}
                  stroke={P2D.paperInk}
                  strokeWidth={2.4}
                />
              </g>

              {/* Thân xe chính theo chuẩn MBT_SPEC.hullPts */}
              <g filter="url(#sh)">
                <polygon
                  points={toPoly(MBT_SPEC.hullPts)}
                  fill={P2D.steelMid}
                  stroke={P2D.paperInk}
                  strokeWidth={3.4}
                  strokeLinejoin="round"
                />
                <polygon
                  points={`${-3.82 * S},${-1.15 * S} ${-3.78 * S},${-1.63 * S} ${-1.55 * S},${-1.64 * S} ${-1.42 * S},${-1.52 * S} ${2.15 * S},${-1.46 * S} ${3.88 * S},${-0.97 * S} ${3.6 * S},${-0.88 * S} ${-3.82 * S},${-1.02 * S}`}
                  fill={P2D.steelHi}
                  opacity={0.55}
                />
                {Array.from({ length: 6 }, (_, ki) => (
                  <rect
                    key={ki}
                    x={(-1.35 + ki * 0.78) * S}
                    y={-1.26 * S}
                    width={0.74 * S}
                    height={0.44 * S}
                    rx={3}
                    fill={P2D.steelMid}
                    stroke={P2D.paperInk}
                    strokeWidth={2.2}
                  />
                ))}
              </g>

              {/* MẶT CẮT X-QUANG KHOANG ĐỘNG CƠ PHÍA SAU */}
              <g transform={`translate(${engVibX} ${engVibY})`}>
                <rect
                  x={-3.72 * S}
                  y={-1.54 * S}
                  width={2.12 * S}
                  height={0.94 * S}
                  rx={10}
                  fill={mix(P2D.steelDark, '#3b1111', engineStrain * 0.78)}
                  stroke={engineStrain > 0.3 ? P2D.weakRed : P2D.paperInk}
                  strokeWidth={2.8}
                />
                <path
                  d={`M ${-3.45 * S} ${-1.28 * S} L ${-3.98 * S} ${-1.28 * S}`}
                  stroke={mix(P2D.steelHi, P2D.weakRed, engineStrain)}
                  strokeWidth={13}
                  strokeLinecap="round"
                />
                <rect
                  x={-3.02 * S}
                  y={-1.38 * S}
                  width={1.28 * S}
                  height={0.66 * S}
                  rx={6}
                  fill={mix(P2D.steelMid, P2D.weakRed, engineStrain * 0.9)}
                  stroke={P2D.paperInk}
                  strokeWidth={2.4}
                  filter={engineStrain > 0.5 ? 'url(#glow)' : undefined}
                />
                {[0, 1, 2, 3].map((pi) => {
                  const px = (-2.86 + pi * 0.28) * S;
                  const strokePhase =
                    wheelAngle * 2.4 + pi * (Math.PI * 0.5);
                  const pistOffset = Math.sin(strokePhase) * 11;
                  return (
                    <g key={pi}>
                      <rect
                        x={px - 10}
                        y={-1.33 * S}
                        width={20}
                        height={44}
                        rx={3}
                        fill={P2D.steelDark}
                      />
                      <rect
                        x={px - 8}
                        y={-1.21 * S + pistOffset}
                        width={16}
                        height={16}
                        rx={2}
                        fill={
                          engineStrain > 0.35
                            ? mix(P2D.explosive, P2D.weakGlow, engineStrain)
                            : P2D.ceramicHi
                        }
                      />
                    </g>
                  );
                })}
                <g transform={`translate(${-3.36 * S} ${-1.06 * S})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={28}
                    fill={P2D.steelLo}
                    stroke={
                      engineStrain > 0.4 ? P2D.weakGlow : P2D.ceramicHi
                    }
                    strokeWidth={2.2}
                  />
                  <g
                    transform={`rotate(${(wheelAngle * 320) / Math.PI})`}
                  >
                    {[0, 1, 2, 3].map((bi) => (
                      <line
                        key={bi}
                        x1={-22}
                        y1={0}
                        x2={22}
                        y2={0}
                        stroke={
                          engineStrain > 0.4 ? P2D.weakRed : P2D.ceramicHi
                        }
                        strokeWidth={5}
                        transform={`rotate(${bi * 45})`}
                      />
                    ))}
                  </g>
                  <circle cx={0} cy={0} r={7} fill={P2D.explosive} />
                </g>
              </g>

              {/* Tháp pháo chính theo chuẩn MBT_SPEC.turretPts */}
              <g filter="url(#sh)">
                <polygon
                  points={toPoly(MBT_SPEC.turretPts)}
                  fill={P2D.steelMid}
                  stroke={P2D.paperInk}
                  strokeWidth={3.4}
                  strokeLinejoin="round"
                />
                <polygon
                  points={`${-0.55 * S},${-2.4 * S} ${0.95 * S},${-2.38 * S} ${1.84 * S},${-1.98 * S} ${0.85 * S},${-1.96 * S} ${-0.55 * S},${-2.08 * S}`}
                  fill={P2D.steelHi}
                  opacity={0.62}
                />
                <rect
                  x={0.1 * S}
                  y={-2.64 * S}
                  width={0.32 * S}
                  height={0.23 * S}
                  rx={4}
                  fill={P2D.steelHi}
                  stroke={P2D.paperInk}
                  strokeWidth={2.4}
                />
                <rect
                  x={-0.68 * S}
                  y={-2.55 * S}
                  width={0.48 * S}
                  height={0.13 * S}
                  rx={3}
                  fill={P2D.steelLo}
                  stroke={P2D.paperInk}
                  strokeWidth={2.2}
                />
                <rect
                  x={-2.22 * S}
                  y={-2.22 * S}
                  width={1.18 * S}
                  height={0.36 * S}
                  rx={3}
                  fill={P2D.steelLo}
                  stroke={P2D.paperInk}
                  strokeWidth={2}
                />
              </g>

              {/* ==================== 4. PHA 1: HỘP GIÁP THÉP DÀY 800MM BỌC KÍN MỌI PHÍA ==================== */}
              {heavyShellAlpha > 0.01 && shellThick > 1.5 && (
                <g opacity={heavyShellAlpha}>
                  {/* (1) Tấm giáp 800mm khổng lồ đè lên toàn bộ NÓC THÁP PHÁO & NẮP ĐỘNG CƠ */}
                  <g
                    transform={`translate(0 ${-(1 - pClampTop) * 105})`}
                    filter="url(#sh)"
                  >
                    <polygon
                      points={`
                        ${-3.96 * S},${-1.66 * S}
                        ${-3.96 * S},${-1.66 * S - shellThick}
                        ${-2.56 * S},${-2.38 * S - shellThick}
                        ${-0.55 * S},${-2.44 * S - shellThick}
                        ${1.06 * S},${-2.42 * S - shellThick}
                        ${1.95 * S},${-2.02 * S - shellThick * 0.7}
                        ${1.88 * S},${-1.99 * S}
                        ${0.95 * S},${-2.41 * S}
                        ${-0.55 * S},${-2.43 * S}
                        ${-2.43 * S},${-2.35 * S}
                        ${-2.36 * S},${-1.66 * S}
                      `}
                      fill={P2D.ceramicLo}
                      stroke={P2D.paperInk}
                      strokeWidth={3.2}
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={`
                        ${-3.96 * S},${-1.66 * S}
                        ${-3.96 * S},${-1.66 * S - shellThick}
                        ${-2.56 * S},${-2.38 * S - shellThick}
                        ${-0.55 * S},${-2.44 * S - shellThick}
                        ${1.06 * S},${-2.42 * S - shellThick}
                        ${1.95 * S},${-2.02 * S - shellThick * 0.7}
                        ${1.88 * S},${-1.99 * S}
                        ${0.95 * S},${-2.41 * S}
                        ${-0.55 * S},${-2.43 * S}
                        ${-2.43 * S},${-2.35 * S}
                        ${-2.36 * S},${-1.66 * S}
                      `}
                      fill="url(#armorHatch)"
                    />
                  </g>

                  {/* (2) Tấm giáp 800mm bọc kín ĐUÔI XE */}
                  <g
                    transform={`translate(${-(1 - pClampSides) * 95} 0)`}
                    filter="url(#sh)"
                  >
                    <polygon
                      points={`
                        ${-3.96 * S},${-1.66 * S - shellThick * 0.8}
                        ${-3.96 * S - shellThick},${-1.56 * S - shellThick * 0.5}
                        ${-3.96 * S - shellThick},${-0.46 * S}
                        ${-3.85 * S},${-0.46 * S}
                      `}
                      fill={P2D.steelMid}
                      stroke={P2D.paperInk}
                      strokeWidth={3.2}
                      strokeLinejoin="round"
                    />
                    <polygon
                      points={`
                        ${-3.96 * S},${-1.66 * S - shellThick * 0.8}
                        ${-3.96 * S - shellThick},${-1.56 * S - shellThick * 0.5}
                        ${-3.96 * S - shellThick},${-0.46 * S}
                        ${-3.85 * S},${-0.46 * S}
                      `}
                      fill="url(#armorHatch)"
                    />
                  </g>

                  {/* (3) Tấm giáp 800mm ốp nặng nề dưới GẦM XE */}
                  <g transform={`translate(0 ${(1 - pClampSides) * 55})`}>
                    <rect
                      x={-3.35 * S}
                      y={-0.48 * S}
                      width={6.55 * S}
                      height={shellThick * 0.72}
                      rx={4}
                      fill={P2D.steelLo}
                      stroke={P2D.paperInk}
                      strokeWidth={3}
                    />
                  </g>

                  {/* Mũi tên hai đầu đo trực tiếp bề dày khối thép 800mm trên nóc & nắp động cơ lúc đóng sập */}
                  <ThicknessCaliper
                    x={-0.12 * S}
                    yOuter={-2.44 * S - shellThick}
                    yInner={-2.43 * S}
                    color={P2D.paperBg}
                    inside
                    alpha={
                      prog(
                        t,
                        CUE.s04_all_800mm - 0.1,
                        CUE.s04_all_800mm + 0.25,
                      ) *
                      (1 - prog(t, 28.2, 28.65))
                    }
                  />
                  <ThicknessCaliper
                    x={-3.15 * S}
                    yOuter={-1.92 * S - shellThick}
                    yInner={-1.66 * S}
                    color={P2D.paperBg}
                    inside
                    alpha={
                      prog(
                        t,
                        CUE.s04_all_800mm - 0.05,
                        CUE.s04_all_800mm + 0.3,
                      ) *
                      (1 - prog(t, 28.2, 28.65))
                    }
                  />
                </g>
              )}

              {/* ==================== 5. KHỐI GIÁP MẶT TRƯỚC (PHA 1: THÉP NẶNG -> PHA 2: KHIÊN COMPOSITE XANH SÁNG) ==================== */}
              {(() => {
                const frontSolidAlpha = prog(
                  t,
                  CUE.s04_weight_law + 0.05,
                  CUE.s04_weight_law + 0.5,
                );
                if (frontSolidAlpha <= 0.01) return null;
                const frontClamp = prog(
                  t,
                  CUE.s04_weight_law + 0.15,
                  CUE.s04_all_800mm - 0.1,
                );
                const frontSlideX = (1 - frontClamp) * 95;
                const frontFill = mix(
                  P2D.ceramicLo,
                  P2D.armorSafe,
                  pShiftFront,
                );
                const frontHi = mix(
                  P2D.ceramicHi,
                  P2D.armorSafeHi,
                  pShiftFront,
                );
                const frontStroke = mix(
                  P2D.paperInk,
                  '#0a3966',
                  pShiftFront * 0.6,
                );
                const extraWedge = pShiftFront * 14;

                const glacisPts = `
                  ${2.12 * S},${-1.49 * S}
                  ${2.24 * S},${-1.78 * S - extraWedge * 0.4}
                  ${4.68 * S + extraWedge},${-1.02 * S}
                  ${3.76 * S + extraWedge * 0.7},${-0.36 * S}
                  ${3.12 * S},${-0.45 * S}
                  ${3.95 * S},${-0.96 * S}
                `;
                const cheekPts = `
                  ${0.96 * S},${-2.41 * S}
                  ${1.28 * S},${-2.66 * S - extraWedge * 0.35}
                  ${2.58 * S + extraWedge},${-2.02 * S}
                  ${1.92 * S + extraWedge * 0.5},${-1.56 * S}
                  ${1.42 * S},${-1.56 * S}
                  ${1.88 * S},${-1.98 * S}
                `;

                return (
                  <g
                    transform={`translate(${frontSlideX} 0)`}
                    opacity={frontSolidAlpha}
                    filter={pShiftFront > 0.6 ? 'url(#glow)' : 'url(#sh)'}
                  >
                    <polygon
                      points={glacisPts}
                      fill={frontFill}
                      stroke={frontStroke}
                      strokeWidth={3.4}
                      strokeLinejoin="round"
                    />
                    <polygon points={glacisPts} fill="url(#safeHatch)" />
                    <line
                      x1={2.28 * S}
                      y1={-1.72 * S}
                      x2={4.56 * S + extraWedge}
                      y2={-1.01 * S}
                      stroke={frontHi}
                      strokeWidth={5}
                      strokeLinecap="round"
                    />

                    <polygon
                      points={cheekPts}
                      fill={frontFill}
                      stroke={frontStroke}
                      strokeWidth={3.4}
                      strokeLinejoin="round"
                    />
                    <polygon points={cheekPts} fill="url(#safeHatch)" />
                    <line
                      x1={1.28 * S}
                      y1={-2.6 * S}
                      x2={2.48 * S + extraWedge}
                      y2={-2.01 * S}
                      stroke={frontHi}
                      strokeWidth={5}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })()}

              {/* Mũi tên dòng chảy phân bổ vật liệu giáp từ nóc & đuôi dồn ra mũi xe (28.3 -> 31.8s) */}
              {pFlowArrows > 0.01 && (
                <g opacity={pFlowArrows}>
                  {[
                    {
                      d: flowPath1,
                      tip: [255, -238] as Pt,
                      ang: 28,
                      delay: 0,
                    },
                    {
                      d: flowPath2,
                      tip: [325, -155] as Pt,
                      ang: 14,
                      delay: 0.14,
                    },
                    {
                      d: flowPath3,
                      tip: [380, -95] as Pt,
                      ang: -18,
                      delay: 0.26,
                    },
                  ].map((fl, fi) => {
                    const fp = prog(t, 28.35 + fl.delay, 30.1 + fl.delay);
                    return (
                      <g key={fi}>
                        <path
                          d={fl.d}
                          fill="none"
                          stroke="#ffffff"
                          strokeWidth={11}
                          strokeLinecap="round"
                          opacity={0.7}
                          {...drawOn(900, fp)}
                        />
                        <path
                          d={fl.d}
                          fill="none"
                          stroke={P2D.armorSafe}
                          strokeWidth={7.5}
                          strokeLinecap="round"
                          {...drawOn(900, fp)}
                        />
                        {fp > 0.65 && (
                          <g
                            transform={`translate(${fl.tip[0]} ${fl.tip[1]}) rotate(${fl.ang})`}
                            opacity={prog(fp, 0.65, 0.9)}
                          >
                            <polygon
                              points="4,0 -24,-13 -18,0 -24,13"
                              fill={P2D.armorSafe}
                              stroke="#ffffff"
                              strokeWidth={2}
                            />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}

              {/* ==================== 6. PHA 2B: TỬ HUYỆT GIÁP MỎNG ĐỎ RỰC Ở NÓC THÁP PHÁO & KHOANG ĐỘNG CƠ ==================== */}
              {/* Dải giáp mỏng dính trên NÓC THÁP PHÁO (bật sáng rõ ngay lúc CUE.s04_thin_roof = 32.60s) */}
              {pThinRoof > 0.01 && (
                <g opacity={pThinRoof}>
                  <path
                    d={`M ${-2.42 * S} ${-2.36 * S} L ${-0.55 * S} ${-2.44 * S} L ${0.96 * S} ${-2.42 * S}`}
                    fill="none"
                    stroke={P2D.weakGlow}
                    strokeWidth={22 * warnPulse}
                    strokeLinecap="round"
                    opacity={0.5}
                    filter="url(#glow)"
                  />
                  <path
                    d={`M ${-2.42 * S} ${-2.36 * S} L ${-0.55 * S} ${-2.44 * S} L ${0.96 * S} ${-2.42 * S}`}
                    fill="none"
                    stroke={P2D.weakRed}
                    strokeWidth={8.5}
                    strokeLinecap="round"
                  />
                  <ThicknessCaliper
                    x={-0.38 * S}
                    yOuter={-2.48 * S}
                    yInner={-2.38 * S}
                    color={P2D.weakRed}
                    alpha={pThinRoof}
                  />
                </g>
              )}

              {/* Dải giáp mỏng dính trên NẮP KHOANG ĐỘNG CƠ PHÍA SAU (bật sáng lúc CUE.s04_thin_engine = 33.46s) */}
              {pThinEngine > 0.01 && (
                <g opacity={pThinEngine}>
                  <path
                    d={`M ${-3.82 * S} ${-1.67 * S} L ${-1.52 * S} ${-1.68 * S}`}
                    fill="none"
                    stroke={P2D.weakGlow}
                    strokeWidth={22 * warnPulse}
                    strokeLinecap="round"
                    opacity={0.5}
                    filter="url(#glow)"
                  />
                  <path
                    d={`M ${-3.82 * S} ${-1.67 * S} L ${-1.52 * S} ${-1.68 * S}`}
                    fill="none"
                    stroke={P2D.weakRed}
                    strokeWidth={8.5}
                    strokeLinecap="round"
                  />
                  <ThicknessCaliper
                    x={-2.68 * S}
                    yOuter={-1.73 * S}
                    yInner={-1.63 * S}
                    color={P2D.weakRed}
                    alpha={pThinEngine}
                  />
                </g>
              )}
            </g>
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.3} />

      {/* Nhãn số liệu chính (tối đa 1 Label trên màn hình tại một thời điểm) */}
      <Label
        t={t}
        text="800 mm"
        x={960}
        y={175}
        from={CUE.s04_all_800mm}
        until={28.1}
        bg={P2D.paperInk}
        fg={P2D.paperBg}
      />
      <Label
        t={t}
        text="30–40 mm"
        x={860}
        y={195}
        from={CUE.s04_few_tens_mm}
        until={35.85}
        bg={P2D.weakRed}
        fg="#ffffff"
      />
    </AbsoluteFill>
  );
};

export default S04;
