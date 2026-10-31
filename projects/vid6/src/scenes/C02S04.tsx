import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog, rnd, useSpring, useT } from '@core/time';
import { handheld, useSize } from '@core/frame';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { Blast2D } from '@skill/military/2d/fx';
import { drawOn } from '@skill/military/2d/path';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';

// Tấm giáp thép cán đồng nhất dày 310 px; thanh xuyên mảnh dài 670 px (đúng tỉ lệ thực mũi lao DU 800mm xuyên tấm giáp thép ~340mm)
const ARMOR_X0 = 1090;
const ARMOR_X1 = 1400;
const ARMOR_W = ARMOR_X1 - ARMOR_X0;
const TOP_Y = 278;
const BOT_Y = 802;

/** Cánh đuôi 6 cánh & rãnh ren bám sabot đồng bộ tỉ lệ 1:1 với Ammo120mm3D (0.80 m x 0.022 m) */
const DartTailAndGrooves: React.FC<{
  tailX: number;
  grooveStartX: number;
  grooveEndX: number;
  cy: number;
  halfH: number;
  cLight: string;
  cMid: string;
  cDark: string;
  accent: string;
}> = ({ tailX, grooveStartX, grooveEndX, cy, halfH, cLight, cMid, cDark, accent }) => {
  const finLen = 108;
  const finSpan = 44;
  const grooveXs: number[] = [];
  for (let gx = grooveStartX; gx <= grooveEndX; gx += 17) {
    grooveXs.push(gx);
  }

  return (
    <g>
      <polygon
        points={`${tailX + 8},${cy - halfH} ${tailX + finLen},${cy - halfH} ${tailX + 52},${cy - finSpan} ${tailX + 10},${cy - finSpan}`}
        fill={cLight}
        stroke={PAL.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <polygon
        points={`${tailX + 8},${cy + halfH} ${tailX + finLen},${cy + halfH} ${tailX + 52},${cy + finSpan} ${tailX + 10},${cy + finSpan}`}
        fill={cDark}
        stroke={PAL.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <polygon
        points={`${tailX + 14},${cy - halfH} ${tailX + 94},${cy - halfH} ${tailX + 44},${cy - finSpan * 0.68} ${tailX + 14},${cy - finSpan * 0.68}`}
        fill={cMid}
        stroke={PAL.ink}
        strokeWidth={2}
        opacity={0.86}
      />
      <polygon
        points={`${tailX + 14},${cy + halfH} ${tailX + 94},${cy + halfH} ${tailX + 44},${cy + finSpan * 0.68} ${tailX + 14},${cy + finSpan * 0.68}`}
        fill={cDark}
        stroke={PAL.ink}
        strokeWidth={2}
        opacity={0.86}
      />
      <rect
        x={tailX + 6}
        y={cy - 3.2}
        width={finLen - 4}
        height={6.4}
        rx={2}
        fill={cLight}
        stroke={PAL.ink}
        strokeWidth={1.7}
      />
      <circle cx={tailX + 2} cy={cy} r={10} fill={PAL.amber} opacity={0.38} />
      <circle cx={tailX + 2} cy={cy} r={5.5} fill={PAL.amberHot} stroke={PAL.ink} strokeWidth={1.6} />

      {grooveXs.map((gx, i) => (
        <line
          key={i}
          x1={gx}
          y1={cy - halfH + 1}
          x2={gx}
          y2={cy + halfH - 1}
          stroke={i % 2 === 0 ? accent : PAL.ink}
          strokeWidth={2.1}
          opacity={0.78}
        />
      ))}
    </g>
  );
};

/** Khối vách giáp thép dày đổ khối 3 tông + đường gạch mặt cắt kỹ thuật 45° + ngàm kẹp bu-lông */
const SteelArmorSection: React.FC<{
  yTop: number;
  yBot: number;
  craterDepth: number;
  craterHalfH: number;
  isTunnel?: boolean;
  breached?: number;
}> = ({ yTop, yBot, craterDepth, craterHalfH, isTunnel = false, breached = 0 }) => {
  const cy = (yTop + yBot) / 2;
  const h = yBot - yTop;
  const hatchLines = Array.from({ length: 16 }, (_, i) => i);

  return (
    <g filter="url(#sh)">
      {/* Khối cạnh tối 3D phía sau/dưới tạo độ dày khối thép */}
      <polygon
        points={`${ARMOR_X1},${yTop} ${ARMOR_X1 + 22},${yTop + 14} ${ARMOR_X1 + 22},${yBot + 14} ${ARMOR_X0 + 18},${yBot + 14} ${ARMOR_X0},${yBot} ${ARMOR_X1},${yBot}`}
        fill={PAL.steelDark}
        stroke={PAL.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />

      {/* Thân mặt cắt giáp thép chính (tông trung) */}
      <rect
        x={ARMOR_X0}
        y={yTop}
        width={ARMOR_W}
        height={h}
        fill={PAL.steelMid}
        stroke={PAL.ink}
        strokeWidth={3.4}
      />

      {/* Dải vát sáng mặt trước và mép trên (tông sáng) */}
      <rect x={ARMOR_X0 + 2} y={yTop + 2} width={20} height={h - 4} fill={PAL.steelLight} opacity={0.78} />
      <rect x={ARMOR_X0 + 2} y={yTop + 2} width={ARMOR_W - 4} height={15} fill={PAL.steelLight} opacity={0.55} />
      {/* Dải bóng tối mặt lưng sau */}
      <rect x={ARMOR_X1 - 24} y={yTop + 2} width={22} height={h - 4} fill={PAL.steelDark} opacity={0.62} />

      {/* Đường gạch chéo mặt cắt cơ khí 45° */}
      <g opacity={0.26}>
        {hatchLines.map((i) => {
          const offset = -280 + i * 42;
          const xStart = Math.max(ARMOR_X0 + 6, ARMOR_X0 + offset);
          const yStart = yTop + 6 + Math.max(0, -offset);
          const len = Math.min(ARMOR_X1 - 6 - xStart, yBot - 6 - yStart);
          if (len <= 8) return null;
          return (
            <line
              key={i}
              x1={xStart}
              y1={yStart}
              x2={xStart + len}
              y2={yStart + len}
              stroke={PAL.ink}
              strokeWidth={2}
            />
          );
        })}
      </g>

      {/* Vân lớp thép cán ngang */}
      {[-126, -74, 74, 126].map((dy, idx) => (
        <line
          key={idx}
          x1={ARMOR_X0 + 10}
          y1={cy + dy}
          x2={ARMOR_X1 - 10}
          y2={cy + dy}
          stroke={PAL.steelLight}
          strokeWidth={1.4}
          strokeDasharray="14 10"
          opacity={0.36}
        />
      ))}

      {/* Ngàm kẹp giữ mẫu thử nghiệm & bu-lông lục giác trên/dưới */}
      {[yTop - 16, yBot - 4].map((by, bi) => (
        <g key={bi}>
          <rect
            x={ARMOR_X0 - 14}
            y={by}
            width={ARMOR_W + 28}
            height={20}
            rx={4}
            fill={PAL.steelDark}
            stroke={PAL.ink}
            strokeWidth={2.6}
          />
          {[ARMOR_X0 + 28, ARMOR_X0 + 112, ARMOR_X0 + 198, ARMOR_X1 - 28].map((bx, k) => (
            <circle
              key={k}
              cx={bx}
              cy={by + 10}
              r={5.5}
              fill={PAL.steelLight}
              stroke={PAL.ink}
              strokeWidth={1.8}
            />
          ))}
        </g>
      ))}

      {/* Hốc khoét / rãnh đục bên trong tấm giáp thép khi đạn xuyên vào */}
      {craterDepth > 2 && (
        <g>
          {!isTunnel ? (
            <>
              {/* Hố va chạm bè rộng ôm sát mũ nấm tù của Tungsten */}
              <path
                d={`M ${ARMOR_X0 - 3} ${cy - craterHalfH * 1.12}
                    Q ${ARMOR_X0 + craterDepth * 0.52} ${cy - craterHalfH * 1.04}, ${ARMOR_X0 + craterDepth * 0.9} ${cy - craterHalfH * 0.8}
                    Q ${ARMOR_X0 + craterDepth + 12} ${cy}, ${ARMOR_X0 + craterDepth * 0.9} ${cy + craterHalfH * 0.8}
                    Q ${ARMOR_X0 + craterDepth * 0.52} ${cy + craterHalfH * 1.04}, ${ARMOR_X0 - 3} ${cy + craterHalfH * 1.12} Z`}
                fill={PAL.bgDeep}
                stroke={PAL.ink}
                strokeWidth={2.8}
              />
              {/* Viền thép bị nung đỏ quanh đáy hố chùn tù */}
              <path
                d={`M ${ARMOR_X0 + craterDepth * 0.65} ${cy - craterHalfH * 0.92}
                    Q ${ARMOR_X0 + craterDepth + 13} ${cy}, ${ARMOR_X0 + craterDepth * 0.65} ${cy + craterHalfH * 0.92}`}
                fill="none"
                stroke={PAL.crimson}
                strokeWidth={4.2}
                opacity={0.72}
              />
              {/* Mép thép mặt trước bị lật cuốn ngược ra ngoài do xung lực tù */}
              <path
                d={`M ${ARMOR_X0 + 4} ${cy - craterHalfH * 1.04}
                    Q ${ARMOR_X0 - 24} ${cy - craterHalfH * 1.28}, ${ARMOR_X0 - 15} ${cy - craterHalfH * 1.48}
                    L ${ARMOR_X0 + 10} ${cy - craterHalfH * 1.2} Z`}
                fill={PAL.steelLight}
                stroke={PAL.ink}
                strokeWidth={2.2}
              />
              <path
                d={`M ${ARMOR_X0 + 4} ${cy + craterHalfH * 1.04}
                    Q ${ARMOR_X0 - 24} ${cy + craterHalfH * 1.28}, ${ARMOR_X0 - 15} ${cy + craterHalfH * 1.48}
                    L ${ARMOR_X0 + 10} ${cy + craterHalfH * 1.2} Z`}
                fill={PAL.steelDark}
                stroke={PAL.ink}
                strokeWidth={2.2}
              />
            </>
          ) : (
            <>
              {/* Rãnh đục hẹp sắc gọn như lưỡi đục của Uranium nghèo xuyên toạc vách thép */}
              <path
                d={
                  breached > 0.02
                    ? `M ${ARMOR_X0 - 3} ${cy - craterHalfH * 1.12}
                       L ${ARMOR_X1 + 6} ${cy - craterHalfH * 0.96}
                       L ${ARMOR_X1 + 6} ${cy + craterHalfH * 0.96}
                       L ${ARMOR_X0 - 3} ${cy + craterHalfH * 1.12} Z`
                    : `M ${ARMOR_X0 - 3} ${cy - craterHalfH * 1.12}
                       L ${ARMOR_X0 + Math.max(0, craterDepth - 30)} ${cy - craterHalfH * 0.95}
                       L ${ARMOR_X0 + craterDepth + 6} ${cy}
                       L ${ARMOR_X0 + Math.max(0, craterDepth - 30)} ${cy + craterHalfH * 0.95}
                       L ${ARMOR_X0 - 3} ${cy + craterHalfH * 1.12} Z`
                }
                fill={PAL.bgDeep}
                stroke={PAL.ink}
                strokeWidth={2.6}
              />
              {/* Viền thép nóng chảy hổ phách mảnh bám sát hai vách rãnh đục */}
              <line
                x1={ARMOR_X0 + 2}
                y1={cy - craterHalfH}
                x2={ARMOR_X0 + Math.min(ARMOR_W, craterDepth)}
                y2={cy - craterHalfH * 0.95}
                stroke={PAL.amber}
                strokeWidth={3}
                opacity={0.85}
              />
              <line
                x1={ARMOR_X0 + 2}
                y1={cy + craterHalfH}
                x2={ARMOR_X0 + Math.min(ARMOR_W, craterDepth)}
                y2={cy + craterHalfH * 0.95}
                stroke={PAL.amber}
                strokeWidth={3}
                opacity={0.85}
              />
              {/* Mép mặt sau vỏ giáp bị xé bung (spall petals) khi mũi DU đục thủng */}
              {breached > 0.02 && (
                <>
                  <polygon
                    points={`${ARMOR_X1 - 4},${cy - craterHalfH} ${ARMOR_X1 + 32 * breached},${cy - craterHalfH - 28 * breached} ${ARMOR_X1 + 10},${cy - craterHalfH - 36 * breached} ${ARMOR_X1 - 8},${cy - craterHalfH - 14}`}
                    fill={PAL.steelLight}
                    stroke={PAL.ink}
                    strokeWidth={2.2}
                  />
                  <polygon
                    points={`${ARMOR_X1 - 4},${cy + craterHalfH} ${ARMOR_X1 + 34 * breached},${cy + craterHalfH + 30 * breached} ${ARMOR_X1 + 10},${cy + craterHalfH + 38 * breached} ${ARMOR_X1 - 8},${cy + craterHalfH + 14}`}
                    fill={PAL.steelDark}
                    stroke={PAL.ink}
                    strokeWidth={2.2}
                  />
                </>
              )}
            </>
          )}
        </g>
      )}
    </g>
  );
};

const C02S04: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // ---------------- 1. NHỊP ĐỘNG HỌC TRÊN & DƯỚI THEO CUE ----------------
  const approachP = prog(t, 231.2, 233.55);

  // NỬA TRÊN: Mũi xuyên Tungsten chùn bè hình nấm (mushrooming) & kẹt cứng giữa tấm giáp thép (x = 1090 -> 1246, kẹt ở 50% độ dày)
  const wPenP = prog(t, 233.55, CUE.c02_s04_tungsten_impact + 0.25);
  const mushP = prog(t, CUE.c02_s04_tungsten_dart - 0.15, CUE.c02_s04_tungsten_impact + 0.15);
  const wTipX =
    t < 233.55
      ? lerp(695, ARMOR_X0, approachP)
      : lerp(ARMOR_X0, ARMOR_X0 + 156, 1 - Math.pow(1 - wPenP, 2.4));
  // Thanh xuyên dài 660 px co ngắn còn 515 px khi đầu chùn bè thành nấm (cánh đuôi luôn nằm ngoài tấm giáp)
  const wRodLen = lerp(660, 515, mushP);
  const wTailX = wTipX - wRodLen;
  const wCapR = lerp(13, 58, mushP);
  const wCraterDepth = Math.max(0, wTipX - ARMOR_X0 + mushP * 6);
  const wLoupeSpring = useSpring(t, CUE.c02_s04_tungsten_dart, 12, 150);

  // NỬA DƯỚI: Mũi xuyên Uranium nghèo trượt mặt phẳng tinh thể 45° tự mài sắc như lưỡi đục xuyên toạc vách thép
  // Khi mũi đục vượt ra sau tấm giáp tới x = 1580 (+180 px sau lưng giáp), đuôi cánh ở x = 1580 - 615 = 965 < ARMOR_X0 (1090) -> không bao giờ cấn cánh đuôi vào thép đặc!
  const duInitialBite = prog(t, 233.55, CUE.c02_s04_du_dart);
  const duCarveP = prog(t, CUE.c02_s04_du_dart, 242.95);
  const duTipX =
    t < 233.55
      ? lerp(695, ARMOR_X0, approachP)
      : t < CUE.c02_s04_du_dart
        ? lerp(ARMOR_X0, ARMOR_X0 + 95, duInitialBite)
        : lerp(ARMOR_X0 + 95, ARMOR_X1 + 185, duCarveP);

  const duShearP = prog(t, CUE.c02_s04_crystal_shears - 0.2, CUE.c02_s04_chisel_edge);
  const duSharpenP = prog(t, CUE.c02_s04_crystal_planes, CUE.c02_s04_chisel_edge);
  const duRodLen = lerp(660, 610, duCarveP);
  const duTailX = duTipX - duRodLen;
  const duCraterDepth = Math.max(0, duTipX - ARMOR_X0);
  const duBreachP = prog(t, 241.55, 242.35);
  const duLoupeSpring = useSpring(t, CUE.c02_s04_du_dart, 12, 150);

  // ---------------- 2. CHUYỂN ĐỘNG CAMERA 2D (<Cam2D> + handheld) ----------------
  // Khi zoom vào nửa trên (y=268, zoom=1.28) hoặc nửa dưới (y=812, zoom=1.28) khung hình đóng gọn đúng buồng đó, không lọt mảnh thừa của buồng kia
  const toTopP = prog(t, 233.8, 234.85);
  const toBotP = prog(t, 236.75, 237.9);
  const toWideEndP = prog(t, 241.8, 242.75);

  const camX1 = lerp(960, 1135, toTopP);
  const camY1 = lerp(540, 268, toTopP);
  const zoom1 = lerp(1.0, 1.28, toTopP);

  const camX2 = lerp(camX1, 1035, toBotP);
  const camY2 = lerp(camY1, 812, toBotP);
  const zoom2 = lerp(zoom1, 1.28, toBotP);

  const camX = lerp(camX2, 1020, toWideEndP);
  const camY = lerp(camY2, 540, toWideEndP);
  const camZoom = lerp(zoom2, 1.02, toWideEndP);

  const baseShake = handheld(t, 2.2, 'c02s04');
  const impactJolt =
    bump(t, CUE.c02_s04_mushroom_blunt, 0.28) * 7 + bump(t, 241.65, 0.32) * 9;
  const shake: readonly [number, number] = [
    baseShake[0] + Math.sin(t * 58) * impactJolt,
    baseShake[1] + Math.cos(t * 49) * impactJolt * 0.7,
  ];

  // Toạ độ tâm kính lúp mạng tinh thể DU ở nửa dưới & kính lúp hạt nén bẹt Tungsten ở nửa trên
  const duLoupeX = 635;
  const duLoupeY = 868;
  const duLoupeR = 130;

  const wLoupeX = 1665;
  const wLoupeY = 278;
  const wLoupeR = 112;

  return (
    <AbsoluteFill style={{ background: PAL.bgDeep }}>
      {/* Đặt <Defs2D /> bên ngoài <Cam2D> chuẩn kỹ thuật */}
      <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(5, 9, 15, 0.58)" />
        <defs>
          <clipPath id="wGrainClip">
            <circle cx={wLoupeX} cy={wLoupeY} r={wLoupeR - 5} />
          </clipPath>
          <clipPath id="duCrystalClip">
            <circle cx={duLoupeX} cy={duLoupeY} r={duLoupeR - 5} />
          </clipPath>
          <linearGradient id="bgBlueprintGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={PAL.bgDeep} />
            <stop offset="52%" stopColor={PAL.bg} />
            <stop offset="100%" stopColor="#0a131d" />
          </linearGradient>
        </defs>
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL.bgDeep}>
        <svg
          width={1920}
          height={1080}
          viewBox="0 0 1920 1080"
          style={{ overflow: 'visible' }}
        >
          {/* ==================== 0. NỀN BẢN VẼ KỸ THUẬT NHIỀU LỚP & LƯỚI ĐO ĐẠC ==================== */}
          <rect x={-160} y={-120} width={2240} height={1320} fill="url(#bgBlueprintGrad)" />

          {[
            { y: 40, h: 474, accent: PAL.steelLight },
            { y: 566, h: 474, accent: PAL.duPurple },
          ].map((bay, bi) => (
            <g key={bi}>
              <rect
                x={44}
                y={bay.y}
                width={1832}
                height={bay.h}
                rx={14}
                fill={PAL.panel}
                stroke={PAL.gridBright}
                strokeWidth={2}
                opacity={0.92}
              />
              <rect
                x={48}
                y={bay.y + 4}
                width={1824}
                height={26}
                rx={10}
                fill={PAL.panelHi}
                opacity={0.65}
              />
              {[
                [66, bay.y + 22, 1, 1],
                [1854, bay.y + 22, -1, 1],
                [66, bay.y + bay.h - 22, 1, -1],
                [1854, bay.y + bay.h - 22, -1, -1],
              ].map(([cx, cy, sx, sy], ci) => (
                <path
                  key={ci}
                  d={`M ${cx} ${cy + sy * 22} L ${cx} ${cy} L ${cx + sx * 26} ${cy}`}
                  fill="none"
                  stroke={bay.accent}
                  strokeWidth={2.4}
                  opacity={0.6}
                />
              ))}
            </g>
          ))}

          {/* Lưới toạ độ kỹ thuật mảnh */}
          <g stroke={PAL.grid} strokeWidth={1} opacity={0.48}>
            {Array.from({ length: 23 }, (_, i) => {
              const gx = 80 + i * 80;
              return <line key={`vx${i}`} x1={gx} y1={40} x2={gx} y2={1040} />;
            })}
            {Array.from({ length: 13 }, (_, i) => {
              const gy = 60 + i * 80;
              return <line key={`hy${i}`} x1={44} y1={gy} x2={1876} y2={gy} />;
            })}
          </g>

          {/* Đường tâm trục bắn chuẩn trực */}
          {[TOP_Y, BOT_Y].map((cy, idx) => (
            <line
              key={idx}
              x1={74}
              y1={cy}
              x2={1846}
              y2={cy}
              stroke={PAL.gridBright}
              strokeWidth={1.6}
              strokeDasharray="18 10 4 10"
              opacity={0.55}
            />
          ))}

          {/* Thanh dầm chia đôi trung tâm có vạch thước chia độ (caliper scale bar — không chữ) */}
          <g>
            <rect
              x={44}
              y={522}
              width={1832}
              height={36}
              rx={8}
              fill={PAL.bgDeep}
              stroke={PAL.gridBright}
              strokeWidth={2}
            />
            {Array.from({ length: 44 }, (_, i) => {
              const tx = 100 + i * 40;
              const major = i % 5 === 0;
              return (
                <line
                  key={i}
                  x1={tx}
                  y1={major ? 526 : 533}
                  x2={tx}
                  y2={major ? 554 : 547}
                  stroke={major ? PAL.cyanSoft : PAL.gridBright}
                  strokeWidth={major ? 2.2 : 1.3}
                  opacity={major ? 0.78 : 0.48}
                />
              );
            })}
            <line
              x1={ARMOR_X0}
              y1={540}
              x2={ARMOR_X1}
              y2={540}
              stroke={PAL.amber}
              strokeWidth={3.2}
              opacity={0.88}
            />
            <circle cx={ARMOR_X0} cy={540} r={5} fill={PAL.amberHot} />
            <circle cx={ARMOR_X1} cy={540} r={5} fill={PAL.amberHot} />
          </g>

          {/* ==================== 1. NỬA TRÊN: TUNGSTEN CHÙN ĐẦU HÌNH CÂY NẤM (MUSHROOMING) ==================== */}
          <SteelArmorSection
            yTop={86}
            yBot={470}
            craterDepth={wCraterDepth}
            craterHalfH={wCapR}
            isTunnel={false}
          />

          {/* Vòng cung sóng ứng suất nén toả ngang lãng phí động năng trong vách thép khi Tungsten bị tù đầu */}
          {mushP > 0.04 && (
            <g>
              {[1, 2, 3, 4].map((ring) => {
                const rr = wCapR + ring * (19 + mushP * 11);
                const op = (0.64 - ring * 0.12) * Math.sin(Math.min(1, mushP * 1.15) * Math.PI * 0.75);
                return (
                  <path
                    key={ring}
                    d={`M ${wTipX - 8} ${TOP_Y - rr} A ${rr * 0.88} ${rr} 0 0 1 ${wTipX - 8} ${TOP_Y + rr}`}
                    fill="none"
                    stroke={ring <= 2 ? PAL.crimson : PAL.amber}
                    strokeWidth={4.5 - ring * 0.7}
                    strokeDasharray={ring % 2 === 0 ? '14 8' : undefined}
                    opacity={Math.max(0, op)}
                  />
                );
              })}
              {[-1, 1].map((dir) => (
                <g key={dir} opacity={mushP * 0.94}>
                  <path
                    d={`M ${wTipX - 4} ${TOP_Y + dir * (wCapR * 0.55)} Q ${wTipX + 20} ${TOP_Y + dir * (wCapR + 26)}, ${wTipX - 22} ${TOP_Y + dir * (wCapR + 64)}`}
                    fill="none"
                    stroke={PAL.crimson}
                    strokeWidth={8}
                    strokeLinecap="round"
                    opacity={0.28}
                  />
                  <path
                    d={`M ${wTipX - 4} ${TOP_Y + dir * (wCapR * 0.55)} Q ${wTipX + 20} ${TOP_Y + dir * (wCapR + 26)}, ${wTipX - 22} ${TOP_Y + dir * (wCapR + 64)}`}
                    fill="none"
                    stroke={PAL.crimson}
                    strokeWidth={3.4}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${wTipX - 22},${TOP_Y + dir * (wCapR + 64)} ${wTipX - 6},${TOP_Y + dir * (wCapR + 54)} ${wTipX - 26},${TOP_Y + dir * (wCapR + 46)}`}
                    fill={PAL.crimson}
                  />
                </g>
              ))}
            </g>
          )}

          {/* Vệt động năng phía sau thanh xuyên Tungsten */}
          <g opacity={lerp(0.9, 0.25, mushP)}>
            {[-26, 0, 26].map((dy, i) => (
              <line
                key={i}
                x1={Math.max(76, wTailX - 115 - (i === 1 ? 30 : 0))}
                y1={TOP_Y + dy}
                x2={wTailX - 14}
                y2={TOP_Y + dy}
                stroke={PAL.cyan}
                strokeWidth={i === 1 ? 3.4 : 2.2}
                strokeDasharray="16 10"
              />
            ))}
          </g>

          {/* Thanh xuyên Tungsten mảnh 3 tông + đầu biến dạng bè tù hình cây nấm (mushroom cap) */}
          <g>
            {(() => {
              const halfH = 13;
              const neckX = wTipX - lerp(54, 34, mushP);
              const curlBackX = wTipX - mushP * 42;
              return (
                <>
                  <rect
                    x={wTailX + 8}
                    y={TOP_Y - halfH}
                    width={Math.max(24, neckX - (wTailX + 8))}
                    height={halfH * 2}
                    fill="#95a5b5"
                    stroke={PAL.ink}
                    strokeWidth={2.8}
                  />
                  <rect
                    x={wTailX + 10}
                    y={TOP_Y - halfH + 2}
                    width={Math.max(20, neckX - (wTailX + 10))}
                    height={7}
                    fill="#dce6f0"
                  />
                  <rect
                    x={wTailX + 10}
                    y={TOP_Y + halfH - 8}
                    width={Math.max(20, neckX - (wTailX + 10))}
                    height={6}
                    fill="#556575"
                  />

                  <DartTailAndGrooves
                    tailX={wTailX}
                    grooveStartX={wTailX + 185}
                    grooveEndX={wTailX + 365}
                    cy={TOP_Y}
                    halfH={halfH}
                    cLight="#dce6f0"
                    cMid="#95a5b5"
                    cDark="#556575"
                    accent={PAL.steelLight}
                  />

                  {mushP < 0.03 ? (
                    <polygon
                      points={`${neckX},${TOP_Y - halfH} ${wTipX},${TOP_Y} ${neckX},${TOP_Y + halfH}`}
                      fill="#c8d6e4"
                      stroke={PAL.ink}
                      strokeWidth={2.8}
                      strokeLinejoin="round"
                    />
                  ) : (
                    <g>
                      <ellipse
                        cx={wTipX - 4}
                        cy={TOP_Y}
                        rx={24 + mushP * 14}
                        ry={wCapR + 7}
                        fill={PAL.crimson}
                        opacity={0.3 * mushP}
                      />
                      {/* Khối mũ nấm kim loại chùn bè cuộn mép về phía sau cực rõ */}
                      <path
                        d={`M ${neckX} ${TOP_Y - halfH}
                            C ${neckX + 14} ${TOP_Y - halfH - mushP * 16}, ${curlBackX - 16} ${TOP_Y - wCapR}, ${curlBackX + 4} ${TOP_Y - wCapR}
                            C ${wTipX + 8} ${TOP_Y - wCapR * 0.92}, ${wTipX + 13} ${TOP_Y - wCapR * 0.42}, ${wTipX + 11} ${TOP_Y}
                            C ${wTipX + 13} ${TOP_Y + wCapR * 0.42}, ${wTipX + 8} ${TOP_Y + wCapR * 0.92}, ${curlBackX + 4} ${TOP_Y + wCapR}
                            C ${curlBackX - 16} ${TOP_Y + wCapR}, ${neckX + 14} ${TOP_Y + halfH + mushP * 16}, ${neckX} ${TOP_Y + halfH} Z`}
                        fill={mix('#a7b8c8', '#ff7c40', mushP * 0.46)}
                        stroke={PAL.ink}
                        strokeWidth={3.2}
                        strokeLinejoin="round"
                      />
                      {/* Vành mép nấm cuốn gập về sau (curled mushroom lip) */}
                      <path
                        d={`M ${curlBackX + 2} ${TOP_Y - wCapR + 3}
                            C ${curlBackX - 10} ${TOP_Y - wCapR + 10}, ${curlBackX - 8} ${TOP_Y - halfH - 8}, ${neckX + 6} ${TOP_Y - halfH - 2}`}
                        fill="none"
                        stroke={PAL.ink}
                        strokeWidth={2.2}
                        opacity={mushP * 0.75}
                      />
                      <path
                        d={`M ${curlBackX + 2} ${TOP_Y + wCapR - 3}
                            C ${curlBackX - 10} ${TOP_Y + wCapR - 10}, ${curlBackX - 8} ${TOP_Y + halfH + 8}, ${neckX + 6} ${TOP_Y + halfH + 2}`}
                        fill="none"
                        stroke={PAL.ink}
                        strokeWidth={2.2}
                        opacity={mushP * 0.75}
                      />
                      <path
                        d={`M ${neckX + 4} ${TOP_Y - halfH + 3}
                            C ${curlBackX - 4} ${TOP_Y - wCapR + 6}, ${wTipX + 4} ${TOP_Y - wCapR * 0.8}, ${wTipX + 7} ${TOP_Y - 3}
                            L ${neckX + 8} ${TOP_Y - 2} Z`}
                        fill={mix('#e4eef7', '#ffd6a3', mushP * 0.52)}
                        opacity={0.7}
                      />
                      {[-0.65, -0.25, 0.25, 0.65].map((f, ci) => (
                        <line
                          key={ci}
                          x1={wTipX + 8}
                          y1={TOP_Y + f * wCapR * 0.72}
                          x2={wTipX - 13 * mushP}
                          y2={TOP_Y + f * wCapR * 0.92}
                          stroke={PAL.ink}
                          strokeWidth={2.2}
                          opacity={mushP * 0.88}
                        />
                      ))}
                    </g>
                  )}
                </>
              );
            })()}
          </g>

          {/* Chớp va chạm ngắn gọn lúc 235.00s (tan nhanh trong 0.95s để lộ trọn mũ nấm sắc nét ở 236.17s) */}
          <Blast2D
            t={t}
            at={CUE.c02_s04_mushroom_blunt}
            x={ARMOR_X0 + 12}
            y={TOP_Y}
            size={30}
            seed={14}
            life={0.95}
            air
            smoke="#606d7a"
          />

          {/* Ô kính lúp vi cấu trúc bên phải nửa trên: các hạt tinh thể Tungsten bị ép bẹt ngang */}
          {wLoupeSpring > 0.01 && (
            <g
              transform={`translate(${wLoupeX} ${wLoupeY}) scale(${wLoupeSpring}) translate(${-wLoupeX} ${-wLoupeY})`}
            >
              <path
                d={`M ${wTipX + 10} ${TOP_Y - wCapR * 0.55} L ${1490} ${204} L ${wLoupeX - wLoupeR + 6} ${232}`}
                fill="none"
                stroke={PAL.crimson}
                strokeWidth={2.3}
                {...drawOn(440, Math.min(1, wLoupeSpring))}
              />
              <circle cx={wTipX + 10} cy={TOP_Y - wCapR * 0.55} r={5} fill={PAL.crimson} />

              <circle
                cx={wLoupeX}
                cy={wLoupeY}
                r={wLoupeR}
                fill={PAL.bgDeep}
                stroke={PAL.crimson}
                strokeWidth={4}
                filter="url(#sh)"
              />
              <g clipPath="url(#wGrainClip)">
                <rect
                  x={wLoupeX - wLoupeR}
                  y={wLoupeY - wLoupeR}
                  width={wLoupeR * 2}
                  height={wLoupeR * 2}
                  fill="#101b28"
                />
                {[-3, -2, -1, 0, 1, 2, 3].map((row) =>
                  [-2, -1, 0, 1, 2].map((col) => {
                    const squeeze = lerp(1, 0.44, mushP);
                    const stretchY = lerp(1, 1.58, mushP);
                    const gx = wLoupeX + col * 36 * squeeze + (row % 2) * 10;
                    const gy = wLoupeY + row * 24 * stretchY;
                    return (
                      <ellipse
                        key={`${row}_${col}`}
                        cx={gx}
                        cy={gy}
                        rx={17 * squeeze}
                        ry={11 * stretchY}
                        fill={(row + col) % 2 === 0 ? '#7c8ea0' : '#5e7082'}
                        stroke={PAL.ink}
                        strokeWidth={2}
                      />
                    );
                  }),
                )}
                <path
                  d={`M ${wLoupeX - 84} ${wLoupeY} L ${wLoupeX - 36} ${wLoupeY}`}
                  stroke={PAL.amberHot}
                  strokeWidth={4}
                />
                <polygon
                  points={`${wLoupeX - 30},${wLoupeY} ${wLoupeX - 46},${wLoupeY - 10} ${wLoupeX - 46},${wLoupeY + 10}`}
                  fill={PAL.amberHot}
                />
                <path
                  d={`M ${wLoupeX + 84} ${wLoupeY} L ${wLoupeX + 36} ${wLoupeY}`}
                  stroke={PAL.crimson}
                  strokeWidth={4}
                />
                <polygon
                  points={`${wLoupeX + 30},${wLoupeY} ${wLoupeX + 46},${wLoupeY - 10} ${wLoupeX + 46},${wLoupeY + 10}`}
                  fill={PAL.crimson}
                />
              </g>
              <circle
                cx={wLoupeX}
                cy={wLoupeY}
                r={wLoupeR - 5}
                fill="none"
                stroke={PAL.steelLight}
                strokeWidth={1.6}
                opacity={0.5}
              />
            </g>
          )}

          {/* ==================== 2. NỬA DƯỚI: URANIUM NGHÈO TRƯỢT TINH THỂ 45° TỰ MÀI SẮC NHƯ LƯỠI ĐỤC ==================== */}
          <SteelArmorSection
            yTop={610}
            yBot={994}
            craterDepth={duCraterDepth}
            craterHalfH={17}
            isTunnel
            breached={duBreachP}
          />

          {/* Mũi tên động năng tập trung thẳng tắp phía sau thanh xuyên Uranium nghèo */}
          <g opacity={0.9}>
            {[-24, 0, 24].map((dy, i) => (
              <line
                key={i}
                x1={Math.max(76, duTailX - 130 - (i === 1 ? 35 : 0))}
                y1={BOT_Y + dy}
                x2={duTailX - 14}
                y2={BOT_Y + dy}
                stroke={i === 1 ? PAL.amberHot : PAL.duPurple}
                strokeWidth={i === 1 ? 3.8 : 2.4}
                strokeDasharray="20 9"
              />
            ))}
          </g>

          {/* Thanh xuyên Uranium nghèo (DU Dart) 3 tông ánh tím-thép nặng + mũi lưỡi đục tự mài sắc (chisel edge) */}
          <g>
            {(() => {
              const halfH = 13;
              const chiselLen = lerp(54, 78, duSharpenP);
              const neckX = duTipX - chiselLen;
              return (
                <>
                  <rect
                    x={duTailX + 8}
                    y={BOT_Y - halfH}
                    width={Math.max(24, neckX - (duTailX + 8))}
                    height={halfH * 2}
                    fill="#645c7d"
                    stroke={PAL.ink}
                    strokeWidth={2.8}
                  />
                  <rect
                    x={duTailX + 10}
                    y={BOT_Y - halfH + 2}
                    width={Math.max(20, neckX - (duTailX + 10))}
                    height={7}
                    fill="#9e92c4"
                  />
                  <rect
                    x={duTailX + 10}
                    y={BOT_Y + halfH - 8}
                    width={Math.max(20, neckX - (duTailX + 10))}
                    height={6}
                    fill="#3a334a"
                  />

                  <DartTailAndGrooves
                    tailX={duTailX}
                    grooveStartX={duTailX + 190}
                    grooveEndX={duTailX + 385}
                    cy={BOT_Y}
                    halfH={halfH}
                    cLight="#9e92c4"
                    cMid="#645c7d"
                    cDark="#3a334a"
                    accent={PAL.duPurple}
                  />

                  {/* Mũi lưỡi đục tự mài sắc (Self-sharpening Chisel Tip) */}
                  <polygon
                    points={`${neckX},${BOT_Y - halfH} ${duTipX},${BOT_Y} ${neckX},${BOT_Y}`}
                    fill="#b4a6de"
                    stroke={PAL.ink}
                    strokeWidth={2.6}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points={`${neckX},${BOT_Y} ${duTipX},${BOT_Y} ${neckX},${BOT_Y + halfH}`}
                    fill="#4b4263"
                    stroke={PAL.ink}
                    strokeWidth={2.6}
                    strokeLinejoin="round"
                  />

                  {duShearP > 0.02 && (
                    <g opacity={Math.min(1, duShearP * 1.3)}>
                      {[0.22, 0.48, 0.74].map((u, si) => {
                        const sx = lerp(neckX + 8, duTipX - 8, u);
                        const hh = halfH * (1 - u);
                        return (
                          <React.Fragment key={si}>
                            <line
                              x1={sx}
                              y1={BOT_Y - hh}
                              x2={sx - hh}
                              y2={BOT_Y}
                              stroke={PAL.amberHot}
                              strokeWidth={2.2}
                            />
                            <line
                              x1={sx}
                              y1={BOT_Y + hh}
                              x2={sx - hh}
                              y2={BOT_Y}
                              stroke={PAL.duPurple}
                              strokeWidth={2.2}
                            />
                          </React.Fragment>
                        );
                      })}

                      {/* Lưỡi đục nóng trắng (double-stroke halo + lõi sáng) */}
                      <polyline
                        points={`${neckX + 16},${BOT_Y - halfH * 0.78} ${duTipX},${BOT_Y} ${neckX + 16},${BOT_Y + halfH * 0.78}`}
                        fill="none"
                        stroke={PAL.amber}
                        strokeWidth={9}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={0.35}
                      />
                      <polyline
                        points={`${neckX + 16},${BOT_Y - halfH * 0.78} ${duTipX},${BOT_Y} ${neckX + 16},${BOT_Y + halfH * 0.78}`}
                        fill="none"
                        stroke={PAL.amberHot}
                        strokeWidth={3.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* Các vảy mảnh Uranium siêu nhiệt tự bong trượt dọc rãnh đục */}
                  {duShearP > 0.05 &&
                    Array.from({ length: 12 }, (_, i) => {
                      const side = i % 2 === 0 ? -1 : 1;
                      const cycle = (t * 2.6 + i * 0.21) % 1;
                      const sx = duTipX - 14 - cycle * 95;
                      if (sx < ARMOR_X0 - 25) return null;
                      const sy = BOT_Y + side * (5 + cycle * 14);
                      return (
                        <polygon
                          key={i}
                          points={`${sx},${sy} ${sx - 12},${sy + side * 4} ${sx - 7},${sy + side * 8}`}
                          fill={i % 3 === 0 ? PAL.duPurple : PAL.amberHot}
                          opacity={1 - cycle * 0.85}
                        />
                      );
                    })}
                </>
              );
            })()}
          </g>

          {/* Đục thủng hoàn toàn mặt sau vách thép: chớp lửa đặt lùi ra sau mũi đục để mũi lưỡi đục lộ rõ 100% */}
          <Blast2D
            t={t}
            at={241.6}
            x={ARMOR_X1 + 10}
            y={BOT_Y}
            size={38}
            seed={29}
            life={1.15}
            air
            smoke="#5a4942"
          />
          {duBreachP > 0.01 && (
            <g>
              {Array.from({ length: 20 }, (_, i) => {
                const ang = (rnd(i + 71) - 0.5) * 1.18;
                const dist = (45 + rnd(i + 93) * 265) * prog(t, 241.56, 243.45);
                const px = ARMOR_X1 + 6 + Math.cos(ang) * dist;
                const py = BOT_Y + Math.sin(ang) * dist;
                const isSteelPlug = i < 5;
                return isSteelPlug ? (
                  <rect
                    key={i}
                    x={px - 7}
                    y={py - 5}
                    width={14}
                    height={9}
                    fill={PAL.steelLight}
                    stroke={PAL.ink}
                    strokeWidth={1.8}
                    transform={`rotate(${dist * 1.4 + i * 35} ${px} ${py})`}
                  />
                ) : (
                  <g key={i}>
                    <line
                      x1={px - Math.cos(ang) * 26}
                      y1={py - Math.sin(ang) * 26}
                      x2={px}
                      y2={py}
                      stroke={PAL.amber}
                      strokeWidth={6}
                      strokeLinecap="round"
                      opacity={0.34}
                    />
                    <line
                      x1={px - Math.cos(ang) * 22}
                      y1={py - Math.sin(ang) * 22}
                      x2={px}
                      y2={py}
                      stroke={i % 3 === 0 ? PAL.duPurple : PAL.amberHot}
                      strokeWidth={2.5}
                      strokeLinecap="round"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== 3. Ô KÍNH LÚP MẠNG TINH THỂ VI MÔ 45° CỦA URANIUM NGHÈO ==================== */}
          {duLoupeSpring > 0.01 && (
            <g
              transform={`translate(${duLoupeX} ${duLoupeY}) scale(${duLoupeSpring}) translate(${-duLoupeX} ${-duLoupeY})`}
            >
              <line
                x1={duLoupeX + duLoupeR * 0.72}
                y1={duLoupeY - duLoupeR * 0.68}
                x2={Math.min(ARMOR_X1 + 80, duTipX - 12)}
                y2={BOT_Y + 6}
                stroke={PAL.duPurple}
                strokeWidth={2.2}
                strokeDasharray="8 6"
              />
              <line
                x1={duLoupeX + duLoupeR * 0.96}
                y1={duLoupeY - 12}
                x2={Math.min(ARMOR_X1 + 80, duTipX - 12)}
                y2={BOT_Y + 6}
                stroke={PAL.duPurple}
                strokeWidth={1.5}
                opacity={0.55}
              />
              <circle
                cx={Math.min(ARMOR_X1 + 80, duTipX - 12)}
                cy={BOT_Y + 6}
                r={7}
                fill="none"
                stroke={PAL.amberHot}
                strokeWidth={2.4}
              />

              <circle
                cx={duLoupeX}
                cy={duLoupeY}
                r={duLoupeR}
                fill={PAL.bgDeep}
                stroke={PAL.duPurple}
                strokeWidth={4.5}
                filter="url(#sh)"
              />

              <g clipPath="url(#duCrystalClip)">
                <rect
                  x={duLoupeX - duLoupeR}
                  y={duLoupeY - duLoupeR}
                  width={duLoupeR * 2}
                  height={duLoupeR * 2}
                  fill="#0d1320"
                />

                <polygon
                  points={`${duLoupeX - 135},${duLoupeY - 58} ${duLoupeX + 86},${duLoupeY} ${duLoupeX - 135},${duLoupeY + 58}`}
                  fill="#595073"
                  stroke={PAL.ink}
                  strokeWidth={3}
                />
                <polygon
                  points={`${duLoupeX - 135},${duLoupeY - 58} ${duLoupeX + 86},${duLoupeY} ${duLoupeX - 135},${duLoupeY}`}
                  fill="#8377a8"
                />

                {/* Mạng mặt phẳng tinh thể vi mô song song nghiêng đúng 45° */}
                {[-5, -4, -3, -2, -1, 0, 1, 2, 3].map((k) => {
                  const bx = duLoupeX - 24 + k * 24;
                  const isActiveShear = k >= -1 && k <= 2;
                  return (
                    <g key={k}>
                      <line
                        x1={bx - 54}
                        y1={duLoupeY - 54}
                        x2={bx + 26}
                        y2={duLoupeY + 26}
                        stroke={isActiveShear && duShearP > 0.05 ? PAL.amberHot : PAL.duPurple}
                        strokeWidth={isActiveShear ? 2.6 : 1.5}
                        opacity={isActiveShear ? 0.92 : 0.45}
                      />
                      <line
                        x1={bx - 54}
                        y1={duLoupeY + 54}
                        x2={bx + 26}
                        y2={duLoupeY - 26}
                        stroke={isActiveShear && duShearP > 0.05 ? PAL.amber : PAL.duPurple}
                        strokeWidth={isActiveShear ? 2.2 : 1.3}
                        opacity={isActiveShear ? 0.78 : 0.35}
                      />
                    </g>
                  );
                })}

                {[-2, -1, 0, 1].map((r) =>
                  [-2, -1, 0, 1].map((c) => (
                    <circle
                      key={`n_${r}_${c}`}
                      cx={duLoupeX - 22 + c * 24}
                      cy={duLoupeY + r * 18}
                      r={3.2}
                      fill={PAL.duPurple}
                      opacity={0.85}
                    />
                  )),
                )}

                {duShearP > 0.06 &&
                  ([-1, 1] as const).map((side) => {
                    const slide = ((t * 1.35 + (side === 1 ? 0.45 : 0)) % 1) * duShearP;
                    const dx = -slide * 46;
                    const dy = side * slide * 36;
                    return (
                      <g key={side} transform={`translate(${dx} ${dy})`} opacity={1 - slide * 0.75}>
                        <polygon
                          points={`${duLoupeX + 48},${duLoupeY + side * 11} ${duLoupeX - 8},${duLoupeY + side * 26} ${duLoupeX - 24},${duLoupeY + side * 42} ${duLoupeX + 26},${duLoupeY + side * 24}`}
                          fill={PAL.amberHot}
                          stroke={PAL.ink}
                          strokeWidth={2}
                        />
                        <line
                          x1={duLoupeX + 28}
                          y1={duLoupeY + side * 34}
                          x2={duLoupeX - 18}
                          y2={duLoupeY + side * 66}
                          stroke={PAL.cyan}
                          strokeWidth={3}
                        />
                        <polygon
                          points={`${duLoupeX - 23},${duLoupeY + side * 70} ${duLoupeX - 7},${duLoupeY + side * 68} ${duLoupeX - 16},${duLoupeY + side * 56}`}
                          fill={PAL.cyan}
                        />
                      </g>
                    );
                  })}

                <polyline
                  points={`${duLoupeX + 22},${duLoupeY - 18} ${duLoupeX + 88},${duLoupeY} ${duLoupeX + 22},${duLoupeY + 18}`}
                  fill="none"
                  stroke={PAL.amber}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.35 * duSharpenP}
                />
                <polyline
                  points={`${duLoupeX + 22},${duLoupeY - 18} ${duLoupeX + 88},${duLoupeY} ${duLoupeX + 22},${duLoupeY + 18}`}
                  fill="none"
                  stroke={PAL.amberHot}
                  strokeWidth={3}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.4 + 0.6 * duSharpenP}
                />
              </g>

              <circle
                cx={duLoupeX}
                cy={duLoupeY}
                r={duLoupeR - 5}
                fill="none"
                stroke={PAL.white}
                strokeWidth={1.5}
                opacity={0.45}
              />
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.44} />

      {/* Nhãn <Label>: tắt dứt khoát DEPLETED URANIUM ở 241.68s trước khi Cam2D kéo rộng ra so sánh 2 nửa để nhãn không bao giờ nằm đè vào ô Tungsten */}
      <Label
        t={t}
        text="TUNGSTEN"
        x={W * 0.22}
        y={H * 0.14}
        from={CUE.c02_s04_tungsten_dart}
        until={236.7}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="DEPLETED URANIUM"
        x={W * 0.28}
        y={H * 0.14}
        from={CUE.c02_s04_du_dart}
        until={241.68}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C02S04;
