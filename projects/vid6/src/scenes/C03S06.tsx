import React from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld } from '@core/frame';
import { bump, lerp, mix, prog, rnd, useSpring, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Blast2D, Puff2D } from '@skill/military/2d/fx';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { drawOn } from '@skill/military/2d/path';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { AbramsSide2D } from '../parts/Abrams2D';

// ---------------- Hằng số bố cục không gian thế giới bản vẽ kỹ thuật 2D ----------------
const FINE_GRID_X = Array.from({ length: 98 }, (_, i) => i * 40);
const FINE_GRID_Y = Array.from({ length: 34 }, (_, i) => i * 40 - 80);
const MAJOR_GRID_X = Array.from({ length: 25 }, (_, i) => i * 160);
const MAJOR_GRID_Y = Array.from({ length: 9 }, (_, i) => i * 160 - 80);

// Mảng tổ ong gốm lục giác phủ KÍN 100% mặt cắt Lớp 1 (Ceramics: xTop=2200..2368, y=280..816, slopeDx=-116)
const HEX_TILES: { cx: number; cy: number; row: number; col: number }[] = (() => {
  const out: { cx: number; cy: number; row: number; col: number }[] = [];
  const r = 24;
  const dx = r * 1.52;
  const dy = r * 1.732;
  for (let row = -1; row < 14; row++) {
    for (let col = -2; col < 6; col++) {
      const cy = 278 + row * dy + ((col & 1) !== 0 ? dy * 0.5 : 0);
      if (cy < 252 || cy > 838) continue;
      const slopeShift = ((cy - 280) / 536) * -116;
      const cx = 2212 + col * dx + slopeShift;
      if (cx < 2055 || cx > 2395) continue;
      out.push({ cx, cy, row, col });
    }
  }
  return out;
})();

const hexPoints = (cx: number, cy: number, r: number) =>
  Array.from({ length: 6 }, (_, i) => {
    const a = (i * Math.PI) / 3;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

/** Khối tấm giáp nghiêng 3 tông (mặt chính + mặt đỉnh sáng + cạnh hông chiều sâu tối) */
const SlopedSlab3Tone: React.FC<{
  xTop: number;
  yTop: number;
  w: number;
  h: number;
  slopeDx?: number;
  depthX?: number;
  depthY?: number;
  cLight: string;
  cMid: string;
  cDark: string;
  opacity?: number;
}> = ({
  xTop,
  yTop,
  w,
  h,
  slopeDx = -116,
  depthX = 22,
  depthY = -16,
  cLight,
  cMid,
  cDark,
  opacity = 1,
}) => {
  const tl: [number, number] = [xTop, yTop];
  const tr: [number, number] = [xTop + w, yTop];
  const br: [number, number] = [xTop + w + slopeDx, yTop + h];
  const bl: [number, number] = [xTop + slopeDx, yTop + h];

  const tlB: [number, number] = [tl[0] + depthX, tl[1] + depthY];
  const trB: [number, number] = [tr[0] + depthX, tr[1] + depthY];
  const brB: [number, number] = [br[0] + depthX, br[1] + depthY];

  return (
    <g opacity={opacity}>
      <polygon
        points={`${tl[0]},${tl[1]} ${tlB[0]},${tlB[1]} ${trB[0]},${trB[1]} ${tr[0]},${tr[1]}`}
        fill={cLight}
        stroke={PAL.ink}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <polygon
        points={`${tr[0]},${tr[1]} ${trB[0]},${trB[1]} ${brB[0]},${brB[1]} ${br[0]},${br[1]}`}
        fill={cDark}
        stroke={PAL.ink}
        strokeWidth={3.2}
        strokeLinejoin="round"
      />
      <polygon
        points={`${tl[0]},${tl[1]} ${tr[0]},${tr[1]} ${br[0]},${br[1]} ${bl[0]},${bl[1]}`}
        fill={cMid}
        stroke={PAL.ink}
        strokeWidth={3.6}
        strokeLinejoin="round"
      />
    </g>
  );
};

/** Lò xo trụ chịu tải dưới cầu cân cơ khí */
const CoilSpring2D: React.FC<{ x: number; yTop: number; yBot: number; stress: number }> = ({
  x,
  yTop,
  yBot,
  stress,
}) => {
  const coils = 5;
  const h = Math.max(24, yBot - yTop);
  const step = h / (coils * 2);
  let d = `M ${x} ${yTop}`;
  for (let i = 0; i < coils * 2; i++) {
    const dir = i % 2 === 0 ? -1 : 1;
    const w = 26 + stress * 7;
    d += ` L ${x + dir * w} ${(yTop + (i + 0.5) * step).toFixed(1)}`;
  }
  d += ` L ${x} ${yBot}`;
  const col = mix(PAL.steelMid, PAL.crimson, Math.max(0, (stress - 0.55) / 0.45));

  return (
    <g>
      <rect x={x - 34} y={yBot - 6} width={68} height={14} rx={3} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.8} />
      <path d={d} fill="none" stroke={PAL.ink} strokeWidth={11} strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={col} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" />
      <rect x={x - 32} y={yTop - 6} width={64} height={12} rx={3} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={2.6} />
    </g>
  );
};

/** Nét kép phát sáng (halo mờ rộng + lõi sáng sắc nét — tuyệt đối không dùng filter url(#glow) trong Cam2D) */
const GlowStrokePath: React.FC<{
  d: string;
  outerColor: string;
  midColor: string;
  coreColor: string;
  wOuter?: number;
  wMid?: number;
  wCore?: number;
  opacity?: number;
  dashProps?: { strokeDasharray: string; strokeDashoffset: number };
}> = ({
  d,
  outerColor,
  midColor,
  coreColor,
  wOuter = 24,
  wMid = 11,
  wCore = 4.5,
  opacity = 1,
  dashProps,
}) => (
  <g opacity={opacity}>
    <path d={d} fill="none" stroke={outerColor} strokeWidth={wOuter} strokeLinecap="round" strokeLinejoin="round" opacity={0.24} {...dashProps} />
    <path d={d} fill="none" stroke={midColor} strokeWidth={wMid} strokeLinecap="round" strokeLinejoin="round" opacity={0.68} {...dashProps} />
    <path d={d} fill="none" stroke={coreColor} strokeWidth={wCore} strokeLinecap="round" strokeLinejoin="round" {...dashProps} />
  </g>
);

const C03S06: React.FC = () => {
  const t = useT();

  // ---------------- Tiến độ các sự kiện theo đúng từng từ trong voice ----------------
  // Hồi 1 (385.60 - 395.80s): Phát đạn thử nảy bật khỏi má trước & bài toán thép đặc >120 tấn
  const testShot1P = prog(t, 385.6, 385.86);
  const testRicochet1P = prog(t, 385.84, 386.45);
  const testShot2P = prog(t, 386.55, 387.05);
  const testRicochet2P = prog(t, 387.03, 387.75);

  const steelDropIn = useSpring(t, CUE.c03_s06_solid_steel, 13, 120);
  const steelCrushFull = prog(t, CUE.c03_s06_solid_steel + 0.15, CUE.c03_s06_120_tons);
  const steelRelease = prog(t, 395.45, 396.35);
  const steelActive = Math.max(0, Math.min(1.12, steelDropIn)) * (1 - steelRelease);
  const loadStress = steelCrushFull * (1 - steelRelease);
  const overloadSlam = bump(t, CUE.c03_s06_120_tons, 0.5);

  // Khoanh vùng má giáp nghiêng (396.34) & chuyển máy sang Khoang B (396.25 -> 398.10)
  const cheekCalloutP = prog(t, CUE.c03_s06_angled_cheeks - 0.55, CUE.c03_s06_angled_cheeks + 0.25);
  const panToMacroP = prog(t, CUE.c03_s06_angled_cheeks - 0.1, CUE.c03_s06_chobham + 0.18);

  // Hồi 2 (397.98 - 404.40s): Tách mở 5 lớp sandwich Chobham + lưới Uranium nghèo
  const chobhamFrameP = useSpring(t, CUE.c03_s06_chobham - 0.18, 13, 140);
  const layer1CeramicsP = useSpring(t, CUE.c03_s06_ceramics - 0.12, 12, 155);
  const layer2ElasticP = useSpring(t, CUE.c03_s06_elastic - 0.1, 12, 155);
  const layer3AlloysP = useSpring(t, CUE.c03_s06_heavy_alloys - 0.1, 12, 155);
  const layer4AirGapP = useSpring(t, CUE.c03_s06_air_gaps - 0.1, 12, 155);
  const layer5DuMeshP = useSpring(t, CUE.c03_s06_du_mesh - 0.1, 12, 155);

  const pulseCeramics = bump(t, CUE.c03_s06_ceramics, 0.65);
  const pulseElastic = bump(t, CUE.c03_s06_elastic, 0.65);
  const pulseAlloys = bump(t, CUE.c03_s06_heavy_alloys, 0.65);
  const pulseAirGap = bump(t, CUE.c03_s06_air_gaps, 0.65);
  const pulseDuMesh = bump(t, CUE.c03_s06_du_mesh, 0.85);

  // Hồi 3 (404.66 - 410.00s): Đầu đạn nổ lõm bắn luồng đồng 25,000 ft/s bị làm cùn, cắt khúc & nghiền vụn trước khoang lái
  const warheadApproachP = prog(t, 403.85, CUE.c03_s06_shatter_jet, (x) => x);
  const warheadDetonated = t >= CUE.c03_s06_shatter_jet;
  const detonateProgress = prog(t, CUE.c03_s06_shatter_jet, CUE.c03_s06_shatter_jet + 0.45);
  const jetBlastShake = bump(t, CUE.c03_s06_shatter_jet, 0.48);

  const jetS1 = prog(t, CUE.c03_s06_shatter_jet, CUE.c03_s06_shatter_jet + 0.34);
  const jetS2 = prog(t, CUE.c03_s06_shatter_jet + 0.32, CUE.c03_s06_shatter_jet + 0.76);
  const jetS3 = prog(t, CUE.c03_s06_shatter_jet + 0.72, CUE.c03_s06_shatter_jet + 1.24);
  const jetS4 = prog(t, CUE.c03_s06_shatter_jet + 1.16, CUE.c03_s06_shatter_jet + 1.76);
  const cabinSafePulse = prog(t, CUE.c03_s06_cabin_safe - 0.55, CUE.c03_s06_cabin_safe + 0.25);

  const neraKick = prog(t, CUE.c03_s06_shatter_jet + 0.34, CUE.c03_s06_shatter_jet + 0.66) * (1 - 0.22 * prog(t, 407.4, 409.6));

  // ---------------- Ngôn ngữ Camera 2D ----------------
  const pushJetDetail = prog(t, CUE.c03_s06_shatter_jet - 0.2, CUE.c03_s06_cabin_safe);
  const camX = lerp(960, lerp(2660, 2720, pushJetDetail), panToMacroP);
  const camY = lerp(555, 548, panToMacroP);
  const camZoom = lerp(1.0, lerp(1.01, 1.05, pushJetDetail), panToMacroP);

  const baseDrift = handheld(t, 2.2, 'c03s06');
  const joltY = overloadSlam * 11 + jetBlastShake * 13 * Math.sin(t * 58);
  const joltX = jetBlastShake * 14 * Math.cos(t * 64);
  const camShake: readonly [number, number] = [baseDrift[0] + joltX, baseDrift[1] + joltY];

  const beamSag = loadStress * 54 + overloadSlam * 8;
  const tankBaseY = 612 + beamSag;
  const needleDeg = lerp(-22, 126, Math.min(1, loadStress * 1.05)) + overloadSlam * 7 * Math.sin(t * 45);

  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      {/* Đặt <Defs2D /> NGOÀI <Cam2D> */}
      <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(6, 10, 16, 0.55)" />
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={camShake} bg={PAL.bg}>
        <svg
          width={4000}
          height={1400}
          viewBox="0 0 4000 1400"
          style={{ position: 'absolute', left: 0, top: -160, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="bpGradA" cx="25%" cy="50%" r="36%">
              <stop offset="0%" stopColor={PAL.panelHi} stopOpacity={0.62} />
              <stop offset="65%" stopColor={PAL.bg} stopOpacity={0.95} />
              <stop offset="100%" stopColor={PAL.bgDeep} stopOpacity={1} />
            </radialGradient>
            <radialGradient id="bpGradB" cx="68%" cy="50%" r="36%">
              <stop offset="0%" stopColor={PAL.panelHi} stopOpacity={0.72} />
              <stop offset="70%" stopColor={PAL.bg} stopOpacity={0} />
            </radialGradient>
            <pattern id="steelHatch" width="22" height="22" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="22" stroke={PAL.steelDark} strokeWidth="5" opacity="0.55" />
            </pattern>
            <clipPath id="ceramicsClip">
              <polygon points="2200,280 2368,280 2252,816 2084,816" />
            </clipPath>
            <clipPath id="duMeshClip">
              <polygon points="2996,280 3176,280 3060,816 2880,816" />
            </clipPath>
          </defs>

          {/* ==================== 0. NỀN BẢN VẼ KỸ THUẬT ĐA LỚP CÓ CHIỀU SÂU ==================== */}
          <g transform="translate(0 160)">
            <rect x={-300} y={-260} width={4500} height={1700} fill={PAL.bgDeep} />
            <rect x={-300} y={-260} width={4500} height={1700} fill="url(#bpGradA)" />
            <rect x={-300} y={-260} width={4500} height={1700} fill="url(#bpGradB)" />

            {/* Lưới toạ độ phụ 40 px */}
            <g stroke={PAL.grid} strokeWidth={1} opacity={0.34}>
              {FINE_GRID_X.map((gx) => (
                <line key={`fx${gx}`} x1={gx} y1={-160} x2={gx} y2={1260} />
              ))}
              {FINE_GRID_Y.map((gy) => (
                <line key={`fy${gy}`} x1={-120} y1={gy} x2={3920} y2={gy} />
              ))}
            </g>

            {/* Lưới toạ độ chính 160 px + dấu cộng tâm ngắm kỹ thuật */}
            <g stroke={PAL.gridBright} strokeWidth={1.5} opacity={0.46}>
              {MAJOR_GRID_X.map((gx) => (
                <line key={`mx${gx}`} x1={gx} y1={-160} x2={gx} y2={1260} />
              ))}
              {MAJOR_GRID_Y.map((gy) => (
                <line key={`my${gy}`} x1={-120} y1={gy} x2={3920} y2={gy} />
              ))}
            </g>
            <g stroke={PAL.gridBright} strokeWidth={2} opacity={0.62}>
              {MAJOR_GRID_X.filter((_, i) => i % 2 === 0).map((gx) =>
                MAJOR_GRID_Y.filter((_, j) => j % 2 === 0).map((gy) => (
                  <path key={`cr_${gx}_${gy}`} d={`M ${gx - 7} ${gy} L ${gx + 7} ${gy} M ${gx} ${gy - 7} L ${gx} ${gy + 7}`} />
                )),
              )}
            </g>

            {/* Vòng thước đo góc kỹ thuật chìm tạo chiều sâu cho Khoang A & Khoang B */}
            <g fill="none" stroke={PAL.gridBright} opacity={0.26}>
              <circle cx={960} cy={520} r={470} strokeWidth={2} strokeDasharray="14 10" />
              <circle cx={960} cy={520} r={530} strokeWidth={1.4} />
              <circle cx={2700} cy={548} r={505} strokeWidth={2.2} strokeDasharray="18 10" />
              <circle cx={2700} cy={548} r={578} strokeWidth={1.4} />
              {Array.from({ length: 36 }, (_, ai) => {
                const a = (ai * 10 * Math.PI) / 180;
                const r0 = ai % 3 === 0 ? 552 : 564;
                return (
                  <line
                    key={`tk${ai}`}
                    x1={2700 + Math.cos(a) * r0}
                    y1={548 + Math.sin(a) * r0}
                    x2={2700 + Math.cos(a) * 578}
                    y2={548 + Math.sin(a) * 578}
                    strokeWidth={ai % 3 === 0 ? 2.4 : 1.3}
                  />
                );
              })}
            </g>

            {/* Thước vạch chia kỹ thuật viền trên & viền dưới (thuần vạch hình học, 0 <text>) */}
            <g stroke={PAL.gridBright} opacity={0.55}>
              <line x1={120} y1={48} x2={3720} y2={48} strokeWidth={2} />
              <line x1={120} y1={1038} x2={3720} y2={1038} strokeWidth={2} />
              {Array.from({ length: 90 }, (_, ti) => {
                const tx = 140 + ti * 40;
                const hTick = ti % 4 === 0 ? 16 : 8;
                return (
                  <g key={`rt${ti}`}>
                    <line x1={tx} y1={48} x2={tx} y2={48 + hTick} strokeWidth={ti % 4 === 0 ? 2.2 : 1.2} />
                    <line x1={tx} y1={1038} x2={tx} y2={1038 - hTick} strokeWidth={ti % 4 === 0 ? 2.2 : 1.2} />
                  </g>
                );
              })}
            </g>

            {/* ==================== 1. KHOANG A: ABRAMS SIDE 2D & BÀI TOÁN THÉP ĐẶC > 120 TẤN ==================== */}
            <g>
              <rect
                x={270}
                y={738}
                width={1340}
                height={34}
                rx={5}
                fill={PAL.panel}
                stroke={PAL.gridBright}
                strokeWidth={2.5}
              />
              <path
                d="M 270 738 L 295 772 M 410 738 L 435 772 M 550 738 L 575 772 M 690 738 L 715 772 M 830 738 L 855 772 M 970 738 L 995 772 M 1110 738 L 1135 772 M 1250 738 L 1275 772 M 1390 738 L 1415 772 M 1530 738 L 1555 772"
                stroke={PAL.gridBright}
                strokeWidth={2}
                opacity={0.55}
              />

              {[430, 745, 1060, 1375].map((sx, idx) => {
                const localSag = beamSag * (0.72 + idx * 0.14);
                return (
                  <CoilSpring2D
                    key={sx}
                    x={sx}
                    yTop={634 + localSag}
                    yBot={738}
                    stress={Math.min(1, loadStress * (0.8 + idx * 0.1))}
                  />
                );
              })}

              {/* Dầm chữ I cầu cân cơ khí */}
              <g filter="url(#sh)">
                <path
                  d={`M 300 ${610 + beamSag * 0.72} Q 980 ${610 + beamSag * 1.16} 1560 ${610 + beamSag * 1.08} L 1560 ${644 + beamSag * 1.08} Q 980 ${644 + beamSag * 1.16} 300 ${644 + beamSag * 0.72} Z`}
                  fill={mix(PAL.steelMid, '#7a3438', loadStress * 0.42)}
                  stroke={PAL.ink}
                  strokeWidth={3.8}
                />
                <path
                  d={`M 306 ${614 + beamSag * 0.72} Q 980 ${614 + beamSag * 1.16} 1554 ${614 + beamSag * 1.08}`}
                  fill="none"
                  stroke={PAL.steelLight}
                  strokeWidth={5}
                />
                {loadStress > 0.72 && (
                  <g opacity={(loadStress - 0.72) / 0.28}>
                    {[1060, 1375].map((cx) => (
                      <g key={cx} transform={`translate(${cx} ${646 + beamSag})`}>
                        <path d="M -28 8 L -10 -4 L 4 10 L 22 -3" fill="none" stroke={PAL.crimson} strokeWidth={4} strokeLinecap="round" />
                        <circle cx={0} cy={2} r={22 + overloadSlam * 14} fill="none" stroke={PAL.crimson} strokeWidth={3} opacity={0.7} />
                      </g>
                    ))}
                  </g>
                )}
              </g>

              {/* Đồng hồ cơ khí đo tải trọng tròn */}
              <g transform="translate(560 882)" filter="url(#sh)">
                <circle r={96} fill={PAL.ink} />
                <circle r={90} fill={PAL.panel} stroke={PAL.steelMid} strokeWidth={6} />
                <circle r={80} fill={PAL.bgDeep} stroke={PAL.gridBright} strokeWidth={2} />
                <path
                  d="M -51.4 -61.3 A 80 80 0 0 1 77.3 -20.7"
                  fill="none"
                  stroke={PAL.cyan}
                  strokeWidth={13}
                  opacity={0.85}
                />
                <path
                  d="M 77.3 -20.7 A 80 80 0 0 1 56.6 56.6"
                  fill="none"
                  stroke={PAL.amber}
                  strokeWidth={13}
                />
                <path
                  d="M 56.6 56.6 A 80 80 0 0 1 -53.5 59.5"
                  fill="none"
                  stroke={PAL.crimson}
                  strokeWidth={16}
                />
                {Array.from({ length: 19 }, (_, di) => {
                  const degA = -130 + di * 14.5;
                  const rad = ((degA - 90) * Math.PI) / 180;
                  const rIn = di % 3 === 0 ? 55 : 62;
                  const isRed = degA >= 45;
                  return (
                    <line
                      key={di}
                      x1={Math.cos(rad) * rIn}
                      y1={Math.sin(rad) * rIn}
                      x2={Math.cos(rad) * 70}
                      y2={Math.sin(rad) * 70}
                      stroke={isRed ? PAL.crimson : PAL.cream}
                      strokeWidth={di % 3 === 0 ? 3.2 : 1.8}
                    />
                  );
                })}
                {loadStress > 0.85 && (
                  <circle
                    r={98 + Math.sin(t * 16) * 6}
                    fill="none"
                    stroke={PAL.crimson}
                    strokeWidth={4}
                    opacity={0.8 * ((loadStress - 0.85) / 0.15)}
                  />
                )}
                <g transform={`rotate(${needleDeg})`}>
                  <polygon points="-6,18 6,18 2.5,-72 -2.5,-72" fill={loadStress > 0.75 ? PAL.crimson : PAL.amberHot} stroke={PAL.ink} strokeWidth={2} />
                  <circle cx={0} cy={14} r={8} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={2} />
                </g>
                <circle r={12} fill={PAL.steelLight} stroke={PAL.ink} strokeWidth={3} />
              </g>

              {/* Thanh thước tải trọng 12 ô + Tam giác cảnh báo */}
              <g transform="translate(690 822)" filter="url(#sh)">
                <rect x={0} y={0} width={810} height={54} rx={8} fill={PAL.panel} stroke={PAL.steelDark} strokeWidth={3.5} />
                {Array.from({ length: 12 }, (_, bi) => {
                  const threshold = (bi + 1) / 12;
                  const currentLevel = lerp(7 / 12, 1.0, loadStress);
                  const active = currentLevel >= threshold - 0.03;
                  const segColor = bi < 7 ? PAL.cyan : bi < 9 ? PAL.amber : PAL.crimson;
                  return (
                    <rect
                      key={bi}
                      x={14 + bi * 65}
                      y={10}
                      width={55}
                      height={34}
                      rx={4}
                      fill={active ? segColor : PAL.bgDeep}
                      stroke={PAL.ink}
                      strokeWidth={2.2}
                      opacity={active ? 0.95 : 0.45}
                    />
                  );
                })}
                <line x1={14 + 7 * 65 - 5} y1={-10} x2={14 + 7 * 65 - 5} y2={64} stroke={PAL.cream} strokeWidth={3.5} strokeDasharray="6 4" />
                <g transform="translate(862 27)" opacity={0.3 + 0.7 * loadStress}>
                  <polygon
                    points="0,-34 36,28 -36,28"
                    fill={loadStress > 0.8 ? PAL.crimson : PAL.panelHi}
                    stroke={PAL.ink}
                    strokeWidth={3.8}
                    strokeLinejoin="round"
                  />
                  <rect x={-4} y={-14} width={8} height={22} rx={3} fill={PAL.cream} />
                  <circle cx={0} cy={17} r={4.5} fill={PAL.cream} />
                </g>
              </g>

              {/* Chủ thể M1A2 Abrams nhìn ngang */}
              <g transform={`translate(835 ${tankBaseY}) rotate(${loadStress * 2.6})`}>
                <AbramsSide2D x={0} y={0} scale={1.22} camo="desert" />

                {t < CUE.c03_s06_solid_steel + 0.3 && (
                  <GlowStrokePath
                    d="M 118 -298 L 258 -248 L 242 -196 M 242 -186 L 486 -144 L 486 -122"
                    outerColor={PAL.cyan}
                    midColor={PAL.cyan}
                    coreColor={PAL.white}
                    wOuter={20}
                    wMid={8}
                    wCore={3.2}
                    opacity={1 - prog(t, CUE.c03_s06_solid_steel - 0.1, CUE.c03_s06_solid_steel + 0.3)}
                  />
                )}

                {/* Khối giáp THÉP ĐẶC khổng lồ >120 Tấn */}
                {steelActive > 0.01 && (
                  <g
                    transform={`translate(0 ${(1 - Math.min(1, steelDropIn)) * -360 - steelRelease * 280})`}
                    opacity={Math.min(1, steelActive * 1.3)}
                    filter="url(#sh)"
                  >
                    <polygon
                      points="116,-316 154,-338 518,-192 482,-168"
                      fill={PAL.steelLight}
                      stroke={PAL.ink}
                      strokeWidth={3.8}
                      strokeLinejoin="round"
                    />
                    <polygon
                      points="482,-168 518,-192 518,-88 482,-64"
                      fill={PAL.steelDark}
                      stroke={PAL.ink}
                      strokeWidth={3.8}
                      strokeLinejoin="round"
                    />
                    <polygon
                      points="116,-316 482,-168 482,-64 388,-64 236,-192 108,-202"
                      fill={PAL.steelMid}
                      stroke={PAL.ink}
                      strokeWidth={4.2}
                      strokeLinejoin="round"
                    />
                    <polygon
                      points="124,-306 472,-164 472,-72 392,-72 240,-198 116,-208"
                      fill="url(#steelHatch)"
                    />
                    {[
                      [155, -280],
                      [235, -248],
                      [315, -216],
                      [395, -184],
                      [452, -154],
                      [452, -96],
                    ].map(([rx, ry], ri) => (
                      <circle key={ri} cx={rx} cy={ry} r={6.5} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2} />
                    ))}
                    {[210, 325, 440].map((ax, ai) => {
                      const bounce = Math.sin(t * 8 + ai) * 6 * loadStress;
                      return (
                        <g key={ax} transform={`translate(${ax} ${-355 + bounce})`}>
                          <rect x={-10} y={-68} width={20} height={54} rx={3} fill={PAL.crimson} stroke={PAL.ink} strokeWidth={3} />
                          <polygon points="-24,-16 24,-16 0,18" fill={PAL.crimson} stroke={PAL.ink} strokeWidth={3} strokeLinejoin="round" />
                        </g>
                      );
                    })}
                  </g>
                )}

                {cheekCalloutP > 0.01 && (
                  <g opacity={cheekCalloutP}>
                    <rect
                      x={96}
                      y={-308}
                      width={178}
                      height={126}
                      rx={8}
                      fill="rgba(41, 227, 212, 0.14)"
                      stroke={PAL.cyan}
                      strokeWidth={4}
                      strokeDasharray="14 8"
                    />
                    <circle cx={185} cy={-245} r={14} fill="none" stroke={PAL.amberHot} strokeWidth={3.2} />
                  </g>
                )}
              </g>

              {/* 2 phát đạn thử nghiệm bật nảy ngay từ giây 385.60s (hiện rõ ở khung kiểm hình 1 @ 385.90s!) */}
              {testShot1P > 0 && t < 388.7 && (
                <g opacity={1 - prog(t, 387.8, 388.65)}>
                  <GlowStrokePath
                    d="M 1680 365 L 1078 365"
                    outerColor={PAL.amber}
                    midColor={PAL.amber}
                    coreColor={PAL.amberHot}
                    wOuter={18}
                    wMid={8}
                    wCore={3.4}
                    dashProps={drawOn(602, testShot1P)}
                  />
                  {testRicochet1P > 0 && (
                    <>
                      <GlowStrokePath
                        d="M 1078 365 L 855 150"
                        outerColor={PAL.cyan}
                        midColor={PAL.cyan}
                        coreColor={PAL.white}
                        wOuter={16}
                        wMid={7}
                        wCore={3}
                        dashProps={drawOn(312, testRicochet1P)}
                      />
                      <circle cx={1078} cy={365} r={14} fill={PAL.amberHot} opacity={1 - testRicochet1P * 0.5} />
                    </>
                  )}
                </g>
              )}
              {testShot2P > 0 && t < 388.9 && (
                <g opacity={1 - prog(t, 388.1, 388.85)}>
                  <GlowStrokePath
                    d="M 1710 468 L 1265 468"
                    outerColor={PAL.amber}
                    midColor={PAL.amber}
                    coreColor={PAL.amberHot}
                    wOuter={18}
                    wMid={8}
                    wCore={3.4}
                    dashProps={drawOn(445, testShot2P)}
                  />
                  {testRicochet2P > 0 && (
                    <GlowStrokePath
                      d="M 1265 468 L 1025 205"
                      outerColor={PAL.cyan}
                      midColor={PAL.cyan}
                      coreColor={PAL.white}
                      wOuter={16}
                      wMid={7}
                      wCore={3}
                      dashProps={drawOn(355, testRicochet2P)}
                    />
                  )}
                </g>
              )}

              {/* Đường gióng phóng đại nối từ má giáp Khoang A sang mặt cắt đại cảnh Khoang B */}
              {cheekCalloutP > 0.02 && (
                <g opacity={cheekCalloutP * 0.72}>
                  <line
                    x1={1110}
                    y1={305}
                    x2={lerp(1110, 2120, cheekCalloutP)}
                    y2={lerp(305, 226, cheekCalloutP)}
                    stroke={PAL.cyan}
                    strokeWidth={2.5}
                    strokeDasharray="16 10"
                  />
                  <line
                    x1={1110}
                    y1={430}
                    x2={lerp(1110, 2005, cheekCalloutP)}
                    y2={lerp(430, 868, cheekCalloutP)}
                    stroke={PAL.cyan}
                    strokeWidth={2.5}
                    strokeDasharray="16 10"
                  />
                </g>
              )}
            </g>

            {/* ==================== 2. KHOANG B: MẶT CẮT ĐẠI CẢNH 5 LỚP CHOBHAM + LƯỚI DU & LUỒNG ĐỒNG 25,000 FT/S ==================== */}
            {/* Hạ mặt cắt nằm gọn y = 224..872 để khoảng trên trái y = 60..195 hoàn toàn thoáng sạch cho <Label>! */}
            <g opacity={Math.min(1, cheekCalloutP * 1.2 + 0.15)}>
              {/* Khung phác thảo wireframe 5 khoang thiết kế bên trong vỏ Chobham (không để hốc đen trống khi tách từng lớp!) */}
              {chobhamFrameP > 0.05 && (
                <g opacity={Math.min(0.38, chobhamFrameP * 0.42)}>
                  {[
                    [2200, 168],
                    [2402, 162],
                    [2600, 172],
                    [2804, 160],
                    [2996, 180],
                  ].map(([sx, sw], gi) => (
                    <polygon
                      key={gi}
                      points={`${sx},280 ${sx + sw},280 ${sx + sw - 116},816 ${sx - 116},816`}
                      fill="rgba(21, 35, 52, 0.45)"
                      stroke={PAL.gridBright}
                      strokeWidth={2}
                      strokeDasharray="10 8"
                    />
                  ))}
                  {/* Đường trục tâm xuyên giáp */}
                  <line x1={1820} y1={548} x2={3260} y2={548} stroke={PAL.gridBright} strokeWidth={1.8} strokeDasharray="18 8 4 8" />
                </g>
              )}

              {/* Khung vỏ thép hộp má tháp pháo trên & dưới (Outer Chobham Armor Housing @ 397.98s) */}
              <g
                transform={`translate(0 ${(1 - Math.min(1, chobhamFrameP)) * -36})`}
                opacity={Math.min(1, chobhamFrameP * 1.4)}
                filter="url(#sh)"
              >
                <SlopedSlab3Tone
                  xTop={2125}
                  yTop={220}
                  w={1175}
                  h={46}
                  slopeDx={-10}
                  depthX={26}
                  depthY={-18}
                  cLight={PAL.hullLight}
                  cMid={PAL.hullMid}
                  cDark={PAL.hullDark}
                />
                <SlopedSlab3Tone
                  xTop={1998}
                  yTop={830}
                  w={1282}
                  h={48}
                  slopeDx={-10}
                  depthX={26}
                  depthY={-18}
                  cLight={PAL.hullLight}
                  cMid={PAL.hullMid}
                  cDark={PAL.hullDark}
                />
                {/* Tấm thép mặt trước ngoài cùng (Outer Strike Plate nghiêng 60°) */}
                <SlopedSlab3Tone
                  xTop={2136}
                  yTop={266}
                  w={40}
                  h={564}
                  slopeDx={-122}
                  depthX={18}
                  depthY={-14}
                  cLight={PAL.hullLight}
                  cMid={PAL.hullMid}
                  cDark={PAL.hullDark}
                />
              </g>

              {/* ---------- LỚP 1: TẤM GỐM LỤC GIÁC PHỦ KÍN 100% MẶT CẮT (Ceramics @ 399.42s) ---------- */}
              {layer1CeramicsP > 0.01 && (
                <g
                  transform={`translate(${(1 - layer1CeramicsP) * -70} ${(1 - layer1CeramicsP) * -45})`}
                  opacity={Math.min(1, layer1CeramicsP * 1.5)}
                  filter="url(#sh)"
                >
                  <SlopedSlab3Tone
                    xTop={2200}
                    yTop={280}
                    w={168}
                    h={536}
                    slopeDx={-116}
                    cLight="#f4f9ff"
                    cMid="#c5d6e8"
                    cDark="#7389a1"
                  />
                  <g clipPath="url(#ceramicsClip)">
                    {HEX_TILES.map((ht, hi) => {
                      const hitDist = Math.hypot(ht.cx - 2224, ht.cy - 548);
                      const cracked = jetS1 > 0.5 && hitDist < 68;
                      return (
                        <g key={hi}>
                          <polygon
                            points={hexPoints(ht.cx, ht.cy, 22.5)}
                            fill={cracked ? '#ffbe6b' : (ht.row + ht.col) % 3 === 0 ? '#eef5fc' : (ht.row + ht.col) % 3 === 1 ? '#d2e2f2' : '#b7cce0'}
                            stroke={PAL.ink}
                            strokeWidth={2.3}
                          />
                          <polygon
                            points={hexPoints(ht.cx - 1.5, ht.cy - 1.5, 14)}
                            fill="none"
                            stroke="#ffffff"
                            strokeWidth={1.3}
                            opacity={0.55}
                          />
                          {cracked && (
                            <path
                              d={`M ${ht.cx - 15} ${ht.cy - 11} L ${ht.cx + 14} ${ht.cy + 13} M ${ht.cx + 11} ${ht.cy - 15} L ${ht.cx - 9} ${ht.cy + 14}`}
                              stroke={PAL.crimsonDeep}
                              strokeWidth={2.8}
                            />
                          )}
                        </g>
                      );
                    })}
                  </g>
                  {/* Huy hiệu ký hiệu hình học lục giác ở thanh đế dưới (y = 936) */}
                  <g transform="translate(2168 936)">
                    <circle r={26} fill={PAL.panelHi} stroke={pulseCeramics > 0.05 ? PAL.amberHot : PAL.steelLight} strokeWidth={3.2} />
                    <polygon points={hexPoints(0, 0, 15)} fill="#dce9f7" stroke={PAL.ink} strokeWidth={2.4} />
                  </g>
                  {pulseCeramics > 0.02 && (
                    <polygon
                      points="2200,280 2368,280 2252,816 2084,816"
                      fill="none"
                      stroke={PAL.cyan}
                      strokeWidth={6}
                      opacity={pulseCeramics}
                    />
                  )}
                </g>
              )}

              {/* ---------- LỚP 2: LỚP ĐÀN HỒI PHẢN ỨNG NERA (Elastic Layers @ 400.04s) ---------- */}
              {layer2ElasticP > 0.01 && (
                <g
                  transform={`translate(${(1 - layer2ElasticP) * -60} ${(1 - layer2ElasticP) * 50})`}
                  opacity={Math.min(1, layer2ElasticP * 1.5)}
                  filter="url(#sh)"
                >
                  {[0, 1].map((ci) => {
                    const bx = 2402 + ci * 84;
                    const kickDx = neraKick * (ci === 0 ? -15 : 17);
                    const kickDy = neraKick * (ci === 0 ? -26 : 24);
                    return (
                      <g key={ci} transform={`translate(${kickDx} ${kickDy})`}>
                        <SlopedSlab3Tone
                          xTop={bx}
                          yTop={284}
                          w={18}
                          h={528}
                          slopeDx={-114}
                          depthX={15}
                          depthY={-11}
                          cLight={PAL.steelLight}
                          cMid={PAL.steelMid}
                          cDark={PAL.steelDark}
                        />
                        <SlopedSlab3Tone
                          xTop={bx + 18}
                          yTop={284}
                          w={36}
                          h={528}
                          slopeDx={-114}
                          depthX={15}
                          depthY={-11}
                          cLight="#f0a843"
                          cMid="#c7771e"
                          cDark="#78420c"
                        />
                        {Array.from({ length: 13 }, (_, zi) => {
                          const zy = 306 + zi * 39;
                          const shift = ((zy - 284) / 528) * -114;
                          const zx = bx + 22 + shift;
                          return (
                            <path
                              key={zi}
                              d={`M ${zx} ${zy} L ${zx + 28} ${zy + 13} L ${zx - 2} ${zy + 26}`}
                              fill="none"
                              stroke={PAL.amberHot}
                              strokeWidth={2.6}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          );
                        })}
                        <SlopedSlab3Tone
                          xTop={bx + 54}
                          yTop={284}
                          w={18}
                          h={528}
                          slopeDx={-114}
                          depthX={15}
                          depthY={-11}
                          cLight={PAL.steelLight}
                          cMid={PAL.steelMid}
                          cDark={PAL.steelDark}
                        />
                      </g>
                    );
                  })}
                  {/* Mũi tên chỉ hướng bật cắt ngang của 2 tấm NERA khi luồng đồng đi qua */}
                  {neraKick > 0.15 && (
                    <g opacity={Math.min(1, neraKick * 1.4)}>
                      <path d="M 2392 435 L 2408 382 M 2395 394 L 2408 382 L 2416 398" fill="none" stroke={PAL.cyan} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M 2448 660 L 2432 714 M 2424 698 L 2432 714 L 2445 702" fill="none" stroke={PAL.cyan} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                  )}
                  <g transform="translate(2368 936)">
                    <circle r={26} fill={PAL.panelHi} stroke={pulseElastic > 0.05 ? PAL.amberHot : PAL.amber} strokeWidth={3.2} />
                    <path d="M -15 4 Q -7 -14 0 0 T 15 -4" fill="none" stroke={PAL.amberHot} strokeWidth={3.6} strokeLinecap="round" />
                  </g>
                  {pulseElastic > 0.02 && (
                    <polygon
                      points="2402,284 2558,284 2444,812 2288,812"
                      fill="none"
                      stroke={PAL.amberHot}
                      strokeWidth={6}
                      opacity={pulseElastic}
                    />
                  )}
                </g>
              )}

              {/* ---------- LỚP 3: TẤM HỢP KIM NẶNG (Heavy Alloys @ 401.30s) ---------- */}
              {layer3AlloysP > 0.01 && (
                <g
                  transform={`translate(${(1 - layer3AlloysP) * -55} ${(1 - layer3AlloysP) * -45})`}
                  opacity={Math.min(1, layer3AlloysP * 1.5)}
                  filter="url(#sh)"
                >
                  <SlopedSlab3Tone
                    xTop={2600}
                    yTop={280}
                    w={172}
                    h={536}
                    slopeDx={-116}
                    cLight={PAL.steelLight}
                    cMid="#6c7f94"
                    cDark="#364454"
                  />
                  {Array.from({ length: 8 }, (_, ai) => {
                    const ay = 312 + ai * 61;
                    const shift = ((ay - 280) / 536) * -116;
                    const ax = 2624 + shift;
                    return (
                      <g key={ai}>
                        <polygon
                          points={`${ax},${ay} ${ax + 124},${ay} ${ax + 116},${ay + 26} ${ax - 8},${ay + 26}`}
                          fill="#8699ad"
                          stroke={PAL.ink}
                          strokeWidth={2.2}
                        />
                        <circle cx={ax + 16} cy={ay + 13} r={5} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={1.8} />
                        <circle cx={ax + 102} cy={ay + 13} r={5} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={1.8} />
                      </g>
                    );
                  })}
                  <g transform="translate(2568 936)">
                    <circle r={26} fill={PAL.panelHi} stroke={pulseAlloys > 0.05 ? PAL.amberHot : PAL.steelLight} strokeWidth={3.2} />
                    <polygon points="0,-15 14,-7 11,10 0,16 -11,10 -14,-7" fill={PAL.steelMid} stroke={PAL.cream} strokeWidth={2.4} />
                  </g>
                  {pulseAlloys > 0.02 && (
                    <polygon
                      points="2600,280 2772,280 2656,816 2484,816"
                      fill="none"
                      stroke={PAL.white}
                      strokeWidth={6}
                      opacity={pulseAlloys}
                    />
                  )}
                </g>
              )}

              {/* ---------- LỚP 4: KHE KHÔNG KHÍ GIÃN NỞ (Air Gaps @ 402.34s) ---------- */}
              {layer4AirGapP > 0.01 && (
                <g
                  transform={`translate(0 ${(1 - layer4AirGapP) * 42})`}
                  opacity={Math.min(1, layer4AirGapP * 1.5)}
                >
                  <polygon
                    points="2804,284 2964,284 2848,812 2688,812"
                    fill="rgba(8, 14, 22, 0.9)"
                    stroke={PAL.cyan}
                    strokeWidth={3}
                    strokeDasharray="12 8"
                  />
                  {[360, 482, 604, 726].map((gy, gi) => {
                    const shift = ((gy - 284) / 528) * -116;
                    const gx = 2818 + shift;
                    return (
                      <g key={gi}>
                        <line x1={gx + 8} y1={gy} x2={gx + 128} y2={gy} stroke={PAL.cyan} strokeWidth={2.6} />
                        <polygon points={`${gx + 4},${gy} ${gx + 18},${gy - 7} ${gx + 18},${gy + 7}`} fill={PAL.cyan} />
                        <polygon points={`${gx + 132},${gy} ${gx + 118},${gy - 7} ${gx + 118},${gy + 7}`} fill={PAL.cyan} />
                        <path
                          d={`M ${gx + 42} ${gy - 22} C ${gx + 75} ${gy - 40}, ${gx + 95} ${gy - 10}, ${gx + 68} ${gy - 8}`}
                          fill="none"
                          stroke={PAL.cyanSoft}
                          strokeWidth={2}
                          opacity={0.55}
                        />
                      </g>
                    );
                  })}
                  <g transform="translate(2770 936)">
                    <circle r={26} fill={PAL.panelHi} stroke={PAL.cyan} strokeWidth={3.2} />
                    <path d="M -14 0 L 14 0 M -8 -7 L -15 0 L -8 7 M 8 -7 L 15 0 L 8 7" fill="none" stroke={PAL.cyan} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
                  </g>
                  {pulseAirGap > 0.02 && (
                    <polygon
                      points="2804,284 2964,284 2848,812 2688,812"
                      fill="rgba(41, 227, 212, 0.16)"
                      stroke={PAL.cyanSoft}
                      strokeWidth={5}
                      opacity={pulseAirGap}
                    />
                  )}
                </g>
              )}

              {/* ---------- LỚP 5: MẠNG TINH THỂ LƯỚI URANIUM NGHÈO TÍM (Depleted Uranium Mesh @ 403.16s) ---------- */}
              {layer5DuMeshP > 0.01 && (
                <g
                  transform={`translate(${(1 - layer5DuMeshP) * 65} ${(1 - layer5DuMeshP) * -42})`}
                  opacity={Math.min(1, layer5DuMeshP * 1.5)}
                  filter="url(#sh)"
                >
                  <SlopedSlab3Tone
                    xTop={2996}
                    yTop={280}
                    w={180}
                    h={536}
                    slopeDx={-116}
                    cLight="#cbb3ff"
                    cMid="#4b2f80"
                    cDark="#271647"
                  />
                  <g clipPath="url(#duMeshClip)">
                    {Array.from({ length: 18 }, (_, di) => {
                      const y0 = 210 + di * 40;
                      return (
                        <g key={di}>
                          <line x1={2845} y1={y0} x2={3210} y2={y0 + 180} stroke={PAL.duPurple} strokeWidth={4.4} />
                          <line x1={2845} y1={y0 + 180} x2={3210} y2={y0} stroke={PAL.duPurple} strokeWidth={4.4} />
                          <line x1={2845} y1={y0} x2={3210} y2={y0 + 180} stroke="#efe6ff" strokeWidth={1.5} opacity={0.8} />
                        </g>
                      );
                    })}
                    {Array.from({ length: 11 }, (_, r) =>
                      Array.from({ length: 4 }, (_, c) => {
                        const ny = 304 + r * 46;
                        const shift = ((ny - 280) / 536) * -116;
                        const nx = 3022 + c * 42 + shift + (r % 2) * 21;
                        return (
                          <polygon
                            key={`nd_${r}_${c}`}
                            points={`${nx},${ny - 6.5} ${nx + 6.5},${ny} ${nx},${ny + 6.5} ${nx - 6.5},${ny}`}
                            fill="#efe6ff"
                            stroke="#2b174f"
                            strokeWidth={1.6}
                          />
                        );
                      }),
                    )}
                  </g>
                  <g transform="translate(2975 936)">
                    <circle r={26} fill={PAL.panelHi} stroke={PAL.duPurple} strokeWidth={3.5} />
                    <polygon points="0,-16 16,0 0,16 -16,0" fill="#5e3b9e" stroke="#efe6ff" strokeWidth={2.4} />
                    <circle r={5} fill="#efe6ff" />
                  </g>
                  {pulseDuMesh > 0.02 && (
                    <GlowStrokePath
                      d="M 2996 280 L 3176 280 L 3060 816 L 2880 816 Z"
                      outerColor={PAL.duPurple}
                      midColor={PAL.duPurple}
                      coreColor="#efe6ff"
                      wOuter={22}
                      wMid={9}
                      wCore={3.5}
                      opacity={pulseDuMesh}
                    />
                  )}
                </g>
              )}

              {/* ---------- VÁCH KHOANG LÁI TRONG CÙNG & PHÁO THỦ AN TOÀN 3 TÔNG (Cabin Safe @ 409.42s) ---------- */}
              <g filter="url(#sh)">
                <SlopedSlab3Tone
                  xTop={3222}
                  yTop={266}
                  w={46}
                  h={564}
                  slopeDx={-116}
                  depthX={20}
                  depthY={-15}
                  cLight={PAL.steelLight}
                  cMid={PAL.steelMid}
                  cDark={PAL.steelDark}
                />
                <polygon
                  points="3268,266 3284,266 3168,830 3152,830"
                  fill="#2d8f85"
                  stroke={PAL.ink}
                  strokeWidth={2.6}
                />

                {/* Khoang chiến đấu tổ lái vẽ khối 3 tông sắc nét */}
                <g transform="translate(3405 562)">
                  <rect
                    x={-118}
                    y={-222}
                    width={256}
                    height={426}
                    rx={18}
                    fill="rgba(16, 33, 50, 0.88)"
                    stroke={mix(PAL.gridBright, PAL.cyan, cabinSafePulse)}
                    strokeWidth={3.8}
                  />
                  {/* Ghế bọc giáp giảm chấn 3 tông của pháo thủ */}
                  <path
                    d="M 54 -48 L 76 -48 L 76 142 L -22 142 L -22 118 L 54 118 Z"
                    fill={PAL.steelDark}
                    stroke={PAL.ink}
                    strokeWidth={3}
                    strokeLinejoin="round"
                  />
                  {/* Hộp ngắm quang học GPS & tay cầm đôi Cadillac */}
                  <rect x={-102} y={-118} width={72} height={54} rx={6} fill={PAL.panelHi} stroke={PAL.ink} strokeWidth={3} />
                  <rect x={-92} y={-108} width={52} height={34} rx={3} fill={PAL.cyan} opacity={0.75} />
                  <path d="M -52 -64 L -52 -24 L -32 -24" fill="none" stroke={PAL.steelMid} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
                  <rect x={-38} y={-40} width={14} height={32} rx={4} fill={PAL.amber} stroke={PAL.ink} strokeWidth={2.4} />

                  {/* Hình chiếu pháo thủ 3 tông mặc giáp Nomex & mũ CVC */}
                  {/* Chân & ủng */}
                  <path
                    d="M 28 96 L -26 98 L -42 166 L -18 168 L -4 118 L 46 116 Z"
                    fill="#3a4552"
                    stroke={PAL.ink}
                    strokeWidth={3}
                    strokeLinejoin="round"
                  />
                  <rect x={-56} y={160} width={38} height={18} rx={5} fill="#232830" stroke={PAL.ink} strokeWidth={2.6} />
                  {/* Thân áo chống cháy & giáp ngực */}
                  <path
                    d="M 4 -68 L 48 -62 L 52 98 L 4 98 Z"
                    fill={PAL.hullMid}
                    stroke={PAL.ink}
                    strokeWidth={3.2}
                    strokeLinejoin="round"
                  />
                  <path d="M 8 -58 L 42 -54 L 44 26 L 6 26 Z" fill={PAL.woodMid} stroke={PAL.ink} strokeWidth={2.8} />
                  {/* Cánh tay nắm tay cầm ngắm Cadillac */}
                  <path
                    d="M 26 -48 L -8 -12 L -32 -24 L -28 -38 L -4 -28 L 16 -56 Z"
                    fill={PAL.hullLight}
                    stroke={PAL.ink}
                    strokeWidth={2.8}
                    strokeLinejoin="round"
                  />
                  {/* Đầu & mũ tăng thiết giáp CVC + kính bảo hộ Cyan */}
                  <circle cx={18} cy={-106} r={24} fill={PAL.cream} stroke={PAL.ink} strokeWidth={3} />
                  <path
                    d="M -4 -116 C -2 -142, 44 -144, 46 -104 C 46 -88, 32 -82, 22 -84 L 18 -106 Z"
                    fill={PAL.woodDark}
                    stroke={PAL.ink}
                    strokeWidth={3.2}
                  />
                  <rect x={-10} y={-116} width={22} height={14} rx={4} fill={PAL.cyan} stroke={PAL.ink} strokeWidth={2.2} />

                  {/* Huy hiệu khiên xanh kiểm chứng khoang lái an toàn tuyệt đối (409.42s) */}
                  {cabinSafePulse > 0.02 && (
                    <g transform="translate(88 -166)" opacity={cabinSafePulse}>
                      <circle r={34} fill="#103b39" stroke={PAL.cyan} strokeWidth={4.2} />
                      <path
                        d="M -15 1 L -3 13 L 17 -11"
                        fill="none"
                        stroke={PAL.cyanSoft}
                        strokeWidth={6.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}
                </g>
              </g>

              {/* ==================== 3. ĐẦU ĐẠN NỔ LÕM HEAT & LUỒNG ĐỒNG NÓNG CHẢY 25,000 FT/S BỊ NGHIỀN VỤN ==================== */}
              {/* Đầu đạn nổ lõm (HEAT Warhead) cắt bổ thấy rõ phễu đồng chữ V ngược — vẫn hiện vỏ nổ toác sau 404.66s để rõ nguồn gốc luồng đồng! */}
              {warheadApproachP > 0.01 && (
                <g
                  transform={`translate(${lerp(1540, 1935, warheadApproachP)} 548)`}
                  filter="url(#sh)"
                >
                  {!warheadDetonated ? (
                    <>
                      <GlowStrokePath
                        d="M -250 0 L -115 0"
                        outerColor={PAL.crimson}
                        midColor={PAL.amber}
                        coreColor={PAL.amberHot}
                        wOuter={28}
                        wMid={14}
                        wCore={6}
                      />
                      <polygon points="-118,-28 -90,-18 -90,18 -118,28" fill={PAL.enemyDark} stroke={PAL.ink} strokeWidth={3} />
                      <path
                        d="M -95 -38 L 36 -38 L 96 -12 L 96 12 L 36 38 L -95 38 Z"
                        fill={PAL.enemyMid}
                        stroke={PAL.ink}
                        strokeWidth={3.8}
                        strokeLinejoin="round"
                      />
                      <rect x={-88} y={-29} width={88} height={58} rx={4} fill={PAL.crimsonDeep} opacity={0.85} />
                      {/* Phễu đồng lót hình chữ V ngược (Shaped-Charge Copper Liner) */}
                      <polygon
                        points="35,-31 -34,0 35,31 21,31 -48,0 21,-31"
                        fill="#ef8747"
                        stroke={PAL.ink}
                        strokeWidth={2.5}
                      />
                    </>
                  ) : (
                    /* Vỏ đầu đạn nổ toác cánh hoa & phễu đồng sập hội tụ phóng ra luồng kim loại đồng nóng chảy */
                    <g opacity={0.92}>
                      <polygon points="-118,-26 -88,-16 -88,16 -118,26" fill={PAL.enemyDark} stroke={PAL.ink} strokeWidth={2.8} />
                      {/* Mảnh vỏ thép bị xé toác lên trên & xuống dưới */}
                      <path
                        d={`M -92 -34 L 22 ${-44 - detonateProgress * 22} L 46 ${-26 - detonateProgress * 18} L -85 -14 Z`}
                        fill={PAL.enemyDark}
                        stroke={PAL.ink}
                        strokeWidth={3}
                      />
                      <path
                        d={`M -92 34 L 22 ${44 + detonateProgress * 22} L 46 ${26 + detonateProgress * 18} L -85 14 Z`}
                        fill={PAL.enemyDark}
                        stroke={PAL.ink}
                        strokeWidth={3}
                      />
                      {/* Lõi phễu đồng sập dọc trục tạo gốc luồng đồng nóng chảy */}
                      <polygon
                        points="-42,-16 58,-9 58,9 -42,16 -24,0"
                        fill="#ff8f3d"
                        stroke={PAL.amberHot}
                        strokeWidth={2.4}
                      />
                    </g>
                  )}
                </g>
              )}

              {/* Chớp nổ đầu đạn lõm tại điểm kích nổ (x = 1985, y = 548) lúc 404.66s */}
              <Blast2D
                t={t}
                at={CUE.c03_s06_shatter_jet}
                x={1985}
                y={575}
                size={88}
                air
                life={5.2}
                seed={306}
                smoke="#4f4842"
              />

              {/* Luồng kim loại đồng nóng chảy 25,000 ft/s bị làm cùn -> cắt đứt khúc -> nghiền vụn thành bụi tia lửa */}
              {warheadDetonated && (
                <g>
                  {/* Chặng 1 (x = 1985 -> 2236): Luồng đồng hội tụ cực mạnh đâm thủng vỏ ngoài rồi bị GỐM LỤC GIÁC LÀM CÙN ĐẦU */}
                  <GlowStrokePath
                    d="M 1985 548 L 2236 548"
                    outerColor={PAL.crimson}
                    midColor="#ff8c24"
                    coreColor={PAL.amberHot}
                    wOuter={38}
                    wMid={18}
                    wCore={7.5}
                    dashProps={drawOn(255, jetS1)}
                  />
                  {jetS1 > 0.65 && (
                    <g transform="translate(2234 548)" opacity={Math.min(1, (jetS1 - 0.65) * 3.5)}>
                      {/* Đầu luồng đồng bị gốm làm toè cùn như đầu nấm + mảnh gốm trắng vỡ văng ngược */}
                      <ellipse cx={0} cy={0} rx={18} ry={30} fill={PAL.crimson} opacity={0.35} />
                      <ellipse cx={-2} cy={0} rx={12} ry={21} fill={PAL.amber} opacity={0.85} />
                      <ellipse cx={-4} cy={0} rx={7} ry={13} fill={PAL.amberHot} />
                      {[-44, -26, -12, 14, 28, 44].map((ang, si) => (
                        <polygon
                          key={si}
                          points="-8,-5 7,0 -5,6"
                          fill="#eef5fc"
                          stroke={PAL.ink}
                          strokeWidth={1.8}
                          transform={`translate(${-18 - Math.abs(ang) * 0.45} ${ang * 1.15}) rotate(${ang})`}
                        />
                      ))}
                    </g>
                  )}

                  {/* Chặng 2 (x = 2255 -> 2520): Tấm đàn hồi NERA bật nảy chéo CẮT ĐỨT KHÚC luồng đồng thành 3 đoạn gãy lệch trục */}
                  {jetS2 > 0.02 && (
                    <g opacity={Math.min(1, jetS2 * 2)}>
                      {[
                        { d: 'M 2258 544 L 2334 524', show: jetS2 > 0.06 },
                        { d: 'M 2356 564 L 2426 538', show: jetS2 > 0.36 },
                        { d: 'M 2448 518 L 2518 534', show: jetS2 > 0.66 },
                      ].map((seg, idx) =>
                        seg.show ? (
                          <GlowStrokePath
                            key={idx}
                            d={seg.d}
                            outerColor={PAL.crimson}
                            midColor="#ff8c24"
                            coreColor={PAL.amberHot}
                            wOuter={28}
                            wMid={13}
                            wCore={5.5}
                          />
                        ) : null,
                      )}
                    </g>
                  )}

                  {/* Chặng 3 (x = 2536 -> 2926): Đập vào Hợp kim nặng & văng tán loạn mất hội tụ qua Khe không khí */}
                  {jetS3 > 0.02 && (
                    <g opacity={Math.min(1, jetS3 * 1.8)}>
                      {/* Hố lõm nông trên mặt tấm Hợp kim nặng */}
                      <ellipse cx={2546} cy={538} rx={10} ry={22} fill={PAL.amber} opacity={0.65} />
                      {[
                        { x0: 2548, y0: 526, x1: 2682, y1: 500, p: prog(jetS3, 0, 0.52) },
                        { x0: 2554, y0: 548, x1: 2704, y1: 572, p: prog(jetS3, 0.08, 0.6) },
                        { x0: 2732, y0: 496, x1: 2922, y1: 462, p: prog(jetS3, 0.4, 1.0) },
                        { x0: 2740, y0: 544, x1: 2934, y1: 542, p: prog(jetS3, 0.44, 1.0) },
                        { x0: 2728, y0: 576, x1: 2916, y1: 622, p: prog(jetS3, 0.48, 1.0) },
                      ].map((dr, di) =>
                        dr.p > 0.02 ? (
                          <GlowStrokePath
                            key={di}
                            d={`M ${dr.x0} ${dr.y0} L ${lerp(dr.x0, dr.x1, dr.p).toFixed(1)} ${lerp(dr.y0, dr.y1, dr.p).toFixed(1)}`}
                            outerColor={PAL.crimson}
                            midColor={PAL.amber}
                            coreColor={PAL.amberHot}
                            wOuter={20}
                            wMid={9}
                            wCore={3.8}
                          />
                        ) : null,
                      )}
                    </g>
                  )}

                  {/* Chặng 4 (x = 2942 -> 3048): Chạm mạng tinh thể LƯỚI URANIUM NGHÈO tím -> NGHIỀN VỤN thành 26 tia bụi mảnh tản mạn! */}
                  {jetS4 > 0.02 && (
                    <g>
                      <circle cx={2962} cy={544} r={46 * jetS4} fill={PAL.duPurple} opacity={0.34} />
                      <circle cx={2962} cy={544} r={22 * jetS4} fill={PAL.amberHot} opacity={0.85} />
                      <Puff2D x={2942} y={544} r={30 * jetS4} color="#6b5678" opacity={0.45} seed={91} />

                      {Array.from({ length: 26 }, (_, si) => {
                        const spreadA = -1.32 + (si / 25) * 2.64;
                        const len = (42 + rnd(si * 7 + 3) * 68) * jetS4;
                        const sx0 = 2948 + (rnd(si * 3 + 1) - 0.5) * 20;
                        const sy0 = 462 + (si / 25) * 168;
                        // Mọi mảnh vụn đều tắt lịm trước x = 3045 (cách xa vách khoang lái ở x = 3180..3268!)
                        const dirX = si % 3 === 0 ? -Math.abs(Math.cos(spreadA)) * 0.85 : Math.cos(spreadA) * 0.68;
                        const sx1 = Math.min(3045, sx0 + dirX * len);
                        const sy1 = sy0 + Math.sin(spreadA) * len * 1.18;
                        return (
                          <g key={si}>
                            <line
                              x1={sx0}
                              y1={sy0}
                              x2={sx1}
                              y2={sy1}
                              stroke={si % 2 === 0 ? '#d8c2ff' : PAL.amber}
                              strokeWidth={3.6}
                              strokeLinecap="round"
                              opacity={0.86}
                            />
                            <circle cx={sx1} cy={sy1} r={3.6} fill={PAL.amberHot} />
                          </g>
                        );
                      })}
                    </g>
                  )}
                </g>
              )}
            </g>
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.46} />

      {/* Tối đa 1 <Label> xuất hiện tại một thời điểm, đặt ở khoảng thoáng hoàn toàn không đè lên hình chính */}
      <Label
        t={t}
        text="> 120 TONS"
        x={1095}
        y={935}
        from={CUE.c03_s06_120_tons}
        until={394.8}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="CHOBHAM"
        x={280}
        y={112}
        from={CUE.c03_s06_chobham}
        until={404.4}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="25,000 FT/S"
        x={310}
        y={112}
        from={CUE.c03_s06_25000_fps}
        until={409.6}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C03S06;
