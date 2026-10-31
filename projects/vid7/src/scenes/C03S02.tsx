import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog, useSpring, useT } from '@core/time';
import { handheld } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { arcAngle, arcAt, arcPath, drawOn, smoothPath, type Pt } from '@skill/military/2d/path';
import { contours } from '@skill/military/2d/terrain';
import { CUE } from '../cues';
import { P2D } from '../design/palette';
import { B25Top2D, CarrierTop2D, CompassRose2D, WarshipIcon2D } from '../parts/Silhouettes2D';

// ==================== DỮ LIỆU ĐỊA LÝ HẢI ĐỒ THÁI BÌNH DƯƠNG - NHẬT BẢN (CẤP MODULE) ====================

const TOKYO: Pt = [530, 520];
const NITTO_POS: Pt = [1455, 488];
const HORNET_POS: Pt = [2025, 448];
const LAUNCH_START: Pt = [1948, 438];
const SHORT_RANGE_R = 450; // ~250–300 dặm tầm máy bay hải quân ngắn quanh bờ biển Nhật

// Biên dạng chuẩn xác, sắc nét của quần đảo Nhật Bản (Honshu, Hokkaido, Shikoku, Kyushu) & rìa bán đảo Triều Tiên xa góc trái
const HONSHU_PTS: Pt[] = [
  [606, 178],
  [648, 192],
  [664, 268],
  [638, 355],
  [618, 435],
  [610, 498],
  [602, 544], // Bán đảo Boso (Chiba)
  [570, 548],
  [554, 518], // Lõm vịnh Tokyo
  [534, 538],
  [514, 576], // Bán đảo Izu
  [470, 578],
  [436, 598], // Vịnh Ise / Nagoya
  [386, 656], // Bán đảo Kii
  [342, 624],
  [276, 620],
  [196, 640],
  [136, 644], // Shimonoseki
  [154, 598],
  [238, 560],
  [328, 524],
  [376, 468],
  [398, 408], // Bán đảo Noto
  [428, 434],
  [478, 384],
  [518, 304],
  [554, 226],
];

const HOKKAIDO_PTS: Pt[] = [
  [630, 140],
  [688, 114],
  [764, 126],
  [804, 76],
  [766, 14],
  [692, -14],
  [648, 38],
  [612, 96],
];

const SHIKOKU_PTS: Pt[] = [
  [234, 654],
  [296, 642],
  [338, 660],
  [324, 698],
  [272, 692],
  [224, 686],
];

const KYUSHU_PTS: Pt[] = [
  [124, 666],
  [182, 676],
  [198, 734],
  [178, 812],
  [138, 826],
  [104, 772],
  [94, 710],
];

// Rìa bán đảo Triều Tiên & lục địa đẩy gọn sát mép Tây Bắc để tôn trọn quần đảo Nhật Bản
const MAINLAND_PTS: Pt[] = [
  [-320, -180],
  [48, -180],
  [16, -20],
  [-32, 115],
  [-8, 245],
  [14, 375],
  [-18, 438],
  [-74, 412],
  [-135, 290],
  [-210, 265],
  [-320, 310],
];

// Ba tầng thềm lục địa biển sâu -> trung -> nông ôm theo rãnh Nhật Bản
const SEA_MID_SHELF_PTS: Pt[] = [
  [-320, -260],
  [1045, -260],
  [1090, 35],
  [985, 260],
  [950, 488],
  [895, 705],
  [765, 910],
  [525, 1100],
  [-320, 1100],
];

const SEA_SHALLOW_SHELF_PTS: Pt[] = [
  [55, 645],
  [135, 555],
  [345, 405],
  [515, 155],
  [670, -45],
  [845, 15],
  [805, 210],
  [735, 415],
  [718, 565],
  [605, 680],
  [435, 760],
  [245, 865],
  [65, 855],
];

const STATIC_PATHS = {
  honshu: smoothPath(HONSHU_PTS, true),
  hokkaido: smoothPath(HOKKAIDO_PTS, true),
  shikoku: smoothPath(SHIKOKU_PTS, true),
  kyushu: smoothPath(KYUSHU_PTS, true),
  mainland: smoothPath(MAINLAND_PTS, true),
  seaMid: smoothPath(SEA_MID_SHELF_PTS, true),
  seaShallow: smoothPath(SEA_SHALLOW_SHELF_PTS, true),
  honshuSpine: smoothPath(
    [
      [610, 215],
      [584, 326],
      [546, 442],
      [480, 518],
      [388, 574],
      [252, 608],
    ],
    false,
  ),
};

const LAND_CONTOURS = contours('c03s02-japan-topo-v2', 1180, 1060, 8, 18, 290);

/** Biểu tượng máy bay hải quân tầm ngắn thu gọn (hình học thuần túy, không thẻ <text>). */
const ShortRangePlaneIcon: React.FC<{ x: number; y: number; rot: number; color: string; opacity?: number }> = ({
  x,
  y,
  rot,
  color,
  opacity = 0.88,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={opacity}>
    <path
      d="M 15 0 L 5.5 -2.8 L 2.2 -15 L -3.2 -15 L -2.2 -2.8 L -11.5 -2.2 L -14.5 -7 L -17.2 -7 L -15.5 0 L -17.2 7 L -14.5 7 L -11.5 2.2 L -2.2 2.8 L -3.2 15 L 2.2 15 L 5.5 2.8 Z"
      fill={color}
      stroke={P2D.ink}
      strokeWidth={1.35}
    />
  </g>
);

const C03S02: React.FC = () => {
  const t = useT();

  // ==================== CHUYỂN ĐỘNG CAMERA HẢI ĐỒ (<Cam2D>) ====================
  // Đầu cảnh (394.32..416.8s): khung cận-trung quần đảo Nhật Bản & vùng biển 300 dặm + tàu gác Nitto Maru.
  // Đúng 416.9..418.9s ("army land bombers launching 750 miles out"): kéo rộng sang phải lộ hạm đội Mỹ ở 750 dặm!
  const pRadioPan = prog(t, 398.5, 401.8);
  const pWide750 = prog(t, 416.9, CUE.c03_s02_750_miles + 0.25);

  const camX = lerp(lerp(620, 895, pRadioPan), 1255, pWide750);
  const camY = lerp(lerp(505, 518, pRadioPan), 506, pWide750);
  const zoom = lerp(lerp(1.24, 1.07, pRadioPan), 0.81, pWide750);
  const shake = handheld(t, 2.0, 'c03s02-chart');

  // ==================== TIẾN ĐỘ TỪNG NHỊP LẬP LUẬN TRÊN HẢI ĐỒ ====================
  // 1) "two blind spots" (396.16 s): 2 vòng tiêu điểm điểm mù khóa trên Tokyo
  const sBlind1 = useSpring(t, CUE.c03_s02_two_blind_spots, 12, 150);
  const sBlind2 = useSpring(t, CUE.c03_s02_two_blind_spots + 0.32, 12, 150);

  // 2) "Imperial Naval Headquarters received the dawn warning" (399.82 s): sóng điện báo đỏ từ Nitto Maru về Tokyo
  const pRadio = prog(t, CUE.c03_s02_first_hq_warning - 0.15, CUE.c03_s02_first_hq_warning + 1.85);
  const hqAlertPulse = bump(t, CUE.c03_s02_first_hq_warning + 1.35, 1.8);

  // 3) "math trap" (403.68 s) & "short-range navy planes" (406.98 s): vòng cung nét đứt đỏ ~250–300 dặm
  const pMathRing = prog(t, CUE.c03_s02_math_trap - 0.1, CUE.c03_s02_math_trap + 1.9);
  const pShortPlanes = prog(t, CUE.c03_s02_short_range_planes - 0.1, CUE.c03_s02_short_range_planes + 2.4);

  // 4) "steam closer all day" (411.62 s) & "April 19th" (414.98 s): mũi tên giả định chạy tàu cả ngày + dấu hẹn 19/4
  const pSteam = prog(t, CUE.c03_s02_steam_all_day - 0.4, CUE.c03_s02_steam_all_day + 2.5);
  const sApril19 = useSpring(t, CUE.c03_s02_april_19, 11, 165);

  // 5) "army land bombers launching 750 miles out" (417.36..418.90 s): phóng cung đường bay đôi vàng-xanh 750 dặm
  const pLaunchArc = prog(t, CUE.c03_s02_army_bombers_launch + 0.15, CUE.c03_s02_750_miles + 1.25);
  const pBomberFly = prog(t, CUE.c03_s02_army_bombers_launch + 0.15, 421.34);
  const pBreachRing = prog(t, CUE.c03_s02_750_miles - 0.1, CUE.c03_s02_750_miles + 1.2);
  const pRuler750 = prog(t, CUE.c03_s02_750_miles - 0.25, CUE.c03_s02_750_miles + 0.9);

  // Cung vòng bán kính ngắn ~250–300 dặm quanh Tokyo hướng ra Thái Bình Dương (-78° .. +78°), mở quạt theo pMathRing
  const sweepDeg = 156 * pMathRing;
  const mathTrapArcD = (() => {
    const pts: string[] = [];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const a = ((-78 + (sweepDeg * i) / steps) * Math.PI) / 180;
      const px = TOKYO[0] + Math.cos(a) * SHORT_RANGE_R;
      const py = TOKYO[1] + Math.sin(a) * SHORT_RANGE_R;
      pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    return pts.join(' ');
  })();

  const mathTrapSectorD = (() => {
    const pts: string[] = [`M ${TOKYO[0]} ${TOKYO[1]}`];
    const steps = 48;
    for (let i = 0; i <= steps; i++) {
      const a = ((-78 + (sweepDeg * i) / steps) * Math.PI) / 180;
      pts.push(
        `L ${(TOKYO[0] + Math.cos(a) * SHORT_RANGE_R).toFixed(1)} ${(TOKYO[1] + Math.sin(a) * SHORT_RANGE_R).toFixed(1)}`,
      );
    }
    pts.push('Z');
    return pts.join(' ');
  })();

  // Đường bay 750 dặm từ USS Hornet (1948, 438) thẳng vào Tokyo (530, 520)
  const strikeArcFull = useMemo(
    () => arcPath(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, 1, 84),
    [],
  );

  // Toạ độ điểm đường bay B-25 xuyên thủng vòng tính toán 300 dặm của Nhật (s ≈ 0.69)
  const breachPt = arcAt(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, 0.69);

  // Biên đội 3 chiếc B-25Top2D (olive) xuyên qua vành đỏ 300 dặm tiến sát bờ biển Tokyo trên nền biển xanh thẩm dễ đọc rõ nhất
  const sLeadB25 = Math.min(0.84, pBomberFly * 0.83);
  const b25LeadPt = arcAt(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, sLeadB25);
  const b25LeadAng = arcAngle(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, sLeadB25);

  const sWing1 = Math.max(0.02, sLeadB25 - 0.068);
  const w1Base = arcAt(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, sWing1);
  const w1Ang = arcAngle(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, sWing1);

  const sWing2 = Math.max(0.02, sLeadB25 - 0.075);
  const w2Base = arcAt(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, sWing2);
  const w2Ang = arcAngle(LAUNCH_START[0], LAUNCH_START[1], TOKYO[0], TOKYO[1], 195, sWing2);

  // Toạ độ tàu sân bay Mỹ giả định phải chạy cả ngày từ cự ly xa vào rìa 300 dặm
  const steamStart: Pt = [1405, 566];
  const steamEnd: Pt = [TOKYO[0] + SHORT_RANGE_R - 4, 548];
  const ghostShipX = lerp(steamStart[0], steamEnd[0], pSteam);
  const ghostShipY = lerp(steamStart[1], steamEnd[1], pSteam);

  return (
    <AbsoluteFill style={{ background: P2D.seaDeep }}>
      {/* <Defs2D> đặt NGOÀI <Cam2D> theo đúng chuẩn kỹ thuật */}
      <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(10, 18, 28, 0.44)" />
      </svg>

      <Cam2D x={camX} y={camY} zoom={zoom} shake={shake} bg={P2D.seaDeep}>
        <svg
          width={3200}
          height={1800}
          viewBox="-300 -300 3200 1800"
          style={{ position: 'absolute', left: -300, top: -300, overflow: 'visible', display: 'block' }}
        >
          <defs>
            <clipPath id="c03s02-land-clip">
              <path d={STATIC_PATHS.honshu} />
              <path d={STATIC_PATHS.hokkaido} />
              <path d={STATIC_PATHS.shikoku} />
              <path d={STATIC_PATHS.kyushu} />
              <path d={STATIC_PATHS.mainland} />
            </clipPath>
          </defs>

          {/* ==================== 1. NỀN BIỂN HẢI ĐỒ 3 LỚP + LƯỚI KINH VĨ ĐỘ + HOA GIÓ ==================== */}
          <rect x={-500} y={-400} width={3500} height={2000} fill={P2D.seaDeep} />
          <path d={STATIC_PATHS.seaMid} fill={P2D.seaMid} opacity={0.92} />
          <path d={STATIC_PATHS.seaShallow} fill={P2D.seaShallow} opacity={0.86} />

          {/* Lưới kinh tuyến & vĩ tuyến hải đồ Thái Bình Dương */}
          <g stroke={P2D.seaGrid} strokeOpacity={0.28}>
            {Array.from({ length: 18 }, (_, i) => {
              const gx = -120 + i * 160;
              return (
                <g key={`mer-${gx}`}>
                  <line x1={gx} y1={-260} x2={gx} y2={1260} strokeWidth={i % 3 === 0 ? 1.5 : 0.9} />
                  <line x1={gx} y1={96} x2={gx} y2={112} strokeWidth={2} strokeOpacity={0.55} />
                  <line x1={gx} y1={918} x2={gx} y2={934} strokeWidth={2} strokeOpacity={0.55} />
                </g>
              );
            })}
            {Array.from({ length: 10 }, (_, j) => {
              const gy = -80 + j * 140;
              return (
                <line
                  key={`par-${gy}`}
                  x1={-260}
                  y1={gy}
                  x2={2660}
                  y2={gy}
                  strokeWidth={j % 2 === 0 ? 1.4 : 0.85}
                />
              );
            })}
            <line x1={-160} y1={104} x2={2520} y2={104} strokeWidth={1.6} strokeOpacity={0.45} />
            <line x1={-160} y1={926} x2={2520} y2={926} strokeWidth={1.6} strokeOpacity={0.45} />
          </g>

          <CompassRose2D x={205} y={235} r={58} />
          <CompassRose2D x={2130} y={845} r={62} />

          {/* ==================== 2. QUẦN ĐẢO NHẬT BẢN GIẤY DA THUỘC 3 TÔNG + ĐƯỜNG ĐỒNG MỨC ==================== */}
          {/* Rìa bán đảo Triều Tiên gọn ở góc xa Tây Bắc */}
          <path d={STATIC_PATHS.mainland} fill={P2D.landShadow} opacity={0.48} transform="translate(5 7)" />
          <path d={STATIC_PATHS.mainland} fill={P2D.land} stroke={P2D.ink} strokeWidth={2.0} opacity={0.75} />

          {/* Bóng nổi thềm bờ biển quần đảo Nhật Bản */}
          <g transform="translate(7 9)" fill={P2D.landShadow} opacity={0.74}>
            <path d={STATIC_PATHS.honshu} />
            <path d={STATIC_PATHS.hokkaido} />
            <path d={STATIC_PATHS.shikoku} />
            <path d={STATIC_PATHS.kyushu} />
          </g>

          {/* Thân đất liền giấy da thuộc P2D.land */}
          <g fill={P2D.land} stroke={P2D.ink} strokeWidth={2.7} filter="url(#sh)">
            <path d={STATIC_PATHS.honshu} />
            <path d={STATIC_PATHS.hokkaido} />
            <path d={STATIC_PATHS.shikoku} />
            <path d={STATIC_PATHS.kyushu} />
          </g>

          {/* Sống núi sáng P2D.landHigh & đường đồng mức contours() phủ trọn mọi phần đất liền */}
          <g clipPath="url(#c03s02-land-clip)">
            <path
              d={STATIC_PATHS.honshuSpine}
              fill="none"
              stroke={P2D.landHigh}
              strokeWidth={46}
              strokeLinecap="round"
              opacity={0.74}
            />
            <g transform="translate(-260 -160)">
              {LAND_CONTOURS.map((c) => (
                <path
                  key={c.level}
                  d={c.d}
                  fill="none"
                  stroke={P2D.contour}
                  strokeWidth={c.level % 2 === 0 ? 1.35 : 0.9}
                  opacity={0.5}
                />
              ))}
            </g>
          </g>

          {/* Ký hiệu Bộ Tư lệnh Hải quân Đế quốc tại Tokyo (530, 520) */}
          <g transform={`translate(${TOKYO[0]} ${TOKYO[1]})`}>
            <circle r={24 + hqAlertPulse * 18} fill={P2D.jpMain} opacity={0.18 + hqAlertPulse * 0.25} />
            <circle r={11.5} fill={P2D.paper} stroke={P2D.ink} strokeWidth={2.5} />
            <circle r={6.5} fill={P2D.jpMain} />
          </g>

          {/* ==================== 3. HAI ĐIỂM MÙ PHÒNG THỦ ("TWO BLIND SPOTS" @ 396.16 s) ==================== */}
          {sBlind1 > 0.01 && (
            <g transform={`translate(${TOKYO[0]} ${TOKYO[1]})`}>
              <g transform={`scale(${sBlind1})`} opacity={Math.min(1, sBlind1 * 1.4)}>
                <circle
                  r={68}
                  fill="none"
                  stroke={P2D.fuelAmber}
                  strokeWidth={3.2}
                  strokeDasharray="74 34 74 34"
                  transform={`rotate(${-18 + (t - 396) * 4})`}
                />
                {/* Tiêu điểm Điểm mù #1 */}
                <g transform="translate(68 -12)">
                  <circle r={16} fill={P2D.jpMain} fillOpacity={0.22} stroke={P2D.fuelBright} strokeWidth={2.6} />
                  <line x1={-22} y1={0} x2={-9} y2={0} stroke={P2D.fuelBright} strokeWidth={2.4} />
                  <line x1={9} y1={0} x2={22} y2={0} stroke={P2D.fuelBright} strokeWidth={2.4} />
                  <line x1={0} y1={-22} x2={0} y2={-9} stroke={P2D.fuelBright} strokeWidth={2.4} />
                  <line x1={0} y1={9} x2={0} y2={22} stroke={P2D.fuelBright} strokeWidth={2.4} />
                  <circle r={4.5} fill={P2D.fuelBright} />
                </g>
              </g>

              {sBlind2 > 0.01 && (
                <g transform={`scale(${sBlind2})`} opacity={Math.min(1, sBlind2 * 1.4)}>
                  <circle
                    r={106}
                    fill="none"
                    stroke={P2D.jpLight}
                    strokeWidth={2.6}
                    strokeDasharray="118 46 118 46"
                    transform={`rotate(${24 - (t - 396) * 3})`}
                  />
                  {/* Tiêu điểm Điểm mù #2 */}
                  <g transform="translate(18 -104)">
                    <circle r={16} fill={P2D.jpMain} fillOpacity={0.22} stroke={P2D.fuelBright} strokeWidth={2.6} />
                    <line x1={-22} y1={0} x2={-9} y2={0} stroke={P2D.fuelBright} strokeWidth={2.4} />
                    <line x1={9} y1={0} x2={22} y2={0} stroke={P2D.fuelBright} strokeWidth={2.4} />
                    <line x1={0} y1={-22} x2={0} y2={-9} stroke={P2D.fuelBright} strokeWidth={2.4} />
                    <line x1={0} y1={9} x2={0} y2={22} stroke={P2D.fuelBright} strokeWidth={2.4} />
                    <circle r={4.5} fill={P2D.fuelBright} />
                  </g>
                </g>
              )}
            </g>
          )}

          {/* ==================== 4. TÀU GÁC NITTO MARU & SÓNG ĐIỆN BÁO ĐỎ VỀ TOKYO (399.82 s) ==================== */}
          {t >= 398.4 && (
            <g opacity={prog(t, 398.4, 399.4)}>
              <line
                x1={NITTO_POS[0]}
                y1={230}
                x2={NITTO_POS[0]}
                y2={820}
                stroke={P2D.jpMain}
                strokeWidth={1.8}
                strokeDasharray="8 10"
                opacity={0.45}
              />

              {pRadio > 0.01 &&
                [0, 1, 2, 3].map((k) => {
                  const cyc = ((t - CUE.c03_s02_first_hq_warning) * 0.72 + k * 0.25) % 1;
                  if (t < CUE.c03_s02_first_hq_warning) return null;
                  const rr = 26 + cyc * 145;
                  return (
                    <path
                      key={k}
                      d={`M ${NITTO_POS[0] - rr * 0.72} ${NITTO_POS[1] - rr * 0.68} A ${rr} ${rr} 0 0 0 ${NITTO_POS[0] - rr * 0.72} ${NITTO_POS[1] + rr * 0.68}`}
                      fill="none"
                      stroke={P2D.jpLight}
                      strokeWidth={3.0 - cyc * 1.6}
                      opacity={(1 - cyc) * 0.78}
                    />
                  );
                })}

              {pRadio > 0.01 && (
                <g>
                  <line
                    x1={NITTO_POS[0] - 24}
                    y1={NITTO_POS[1]}
                    x2={lerp(NITTO_POS[0] - 24, TOKYO[0] + 18, pRadio)}
                    y2={lerp(NITTO_POS[1], TOKYO[1], pRadio)}
                    stroke={P2D.jpMain}
                    strokeWidth={9}
                    opacity={0.22}
                    strokeLinecap="round"
                  />
                  <line
                    x1={NITTO_POS[0] - 24}
                    y1={NITTO_POS[1]}
                    x2={lerp(NITTO_POS[0] - 24, TOKYO[0] + 18, pRadio)}
                    y2={lerp(NITTO_POS[1], TOKYO[1], pRadio)}
                    stroke={P2D.jpLight}
                    strokeWidth={3.2}
                    strokeDasharray="14 9 5 9"
                    strokeLinecap="round"
                  />
                </g>
              )}

              <WarshipIcon2D x={NITTO_POS[0]} y={NITTO_POS[1]} rot={-180} scale={0.9} side="jp" carrier={false} />
              {pRadio > 0.01 && (
                <circle
                  cx={NITTO_POS[0]}
                  cy={NITTO_POS[1] - 19}
                  r={5 + 3 * Math.sin(t * 14)}
                  fill={P2D.jpLight}
                />
              )}
            </g>
          )}

          {/* ==================== 5. "BẪY TOÁN HỌC" — VÒNG TẦM NGẮN ~250–300 DẶM (403.68 s) ==================== */}
          {pMathRing > 0.005 && (
            <g>
              <path
                d={mathTrapSectorD}
                fill={P2D.jpMain}
                fillOpacity={0.11 * pMathRing}
              />

              {/* Vành cung nét đứt đỏ bán kính ngắn ~250–300 dặm (nét kép halo + lõi nét đứt, không filter glow) */}
              <path
                d={mathTrapArcD}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={14}
                opacity={0.22 * pMathRing}
                strokeLinecap="round"
              />
              <path
                d={mathTrapArcD}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={4.8}
                strokeDasharray="20 12"
                strokeLinecap="round"
                opacity={0.96}
              />

              <g opacity={pMathRing * 0.84}>
                <line
                  x1={TOKYO[0] + 18}
                  y1={TOKYO[1] - 10}
                  x2={TOKYO[0] + Math.cos(-0.42) * SHORT_RANGE_R}
                  y2={TOKYO[1] + Math.sin(-0.42) * SHORT_RANGE_R}
                  stroke={P2D.jpLight}
                  strokeWidth={2}
                  strokeDasharray="6 6"
                />
                {[-0.55, -0.18, 0.22, 0.55].map((ang, idx) => {
                  const rx = TOKYO[0] + Math.cos(ang) * SHORT_RANGE_R;
                  const ry = TOKYO[1] + Math.sin(ang) * SHORT_RANGE_R;
                  const degAng = (ang * 180) / Math.PI;
                  return (
                    <g key={idx} transform={`translate(${rx} ${ry}) rotate(${degAng})`}>
                      <line x1={-12} y1={0} x2={12} y2={0} stroke={P2D.jpLight} strokeWidth={2.6} />
                      <line x1={0} y1={-11} x2={0} y2={11} stroke={P2D.jpLight} strokeWidth={3} />
                    </g>
                  );
                })}
              </g>

              {pShortPlanes > 0.01 && (
                <g opacity={Math.min(1, pShortPlanes * 1.3)}>
                  {[
                    { yOff: -132, dir: -1 },
                    { yOff: 146, dir: 1 },
                  ].map((item, idx) => {
                    const loopX = TOKYO[0] + SHORT_RANGE_R - 74;
                    const loopY = TOKYO[1] + item.yOff;
                    return (
                      <g key={idx}>
                        <path
                          d={`M ${loopX + 42} ${loopY - item.dir * 26} C ${loopX - 48} ${loopY - item.dir * 26} ${loopX - 48} ${loopY + item.dir * 26} ${loopX + 42} ${loopY + item.dir * 26}`}
                          fill="none"
                          stroke={P2D.jpLight}
                          strokeWidth={2.2}
                          strokeDasharray="6 5"
                          opacity={0.78}
                        />
                        <ShortRangePlaneIcon
                          x={loopX - 24}
                          y={loopY}
                          rot={item.dir * 90}
                          color={P2D.jpLight}
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* ==================== 6. GIẢ ĐỊNH CHẠY TÀU CẢ NGÀY (411.62 s) & HẸN ĐÁNH 19/4 (414.98 s) ==================== */}
          {t >= 409.4 && (
            <g opacity={prog(t, 409.4, 410.4)}>
              <line
                x1={steamStart[0]}
                y1={steamStart[1]}
                x2={ghostShipX}
                y2={ghostShipY}
                stroke={P2D.jpMain}
                strokeWidth={11}
                opacity={0.18}
                strokeLinecap="round"
              />
              <line
                x1={steamStart[0]}
                y1={steamStart[1]}
                x2={ghostShipX}
                y2={ghostShipY}
                stroke={P2D.usLight}
                strokeWidth={3.8}
                strokeDasharray="14 9"
                strokeLinecap="round"
                opacity={0.85}
              />
              {pSteam > 0.08 && (
                <polygon
                  points={`${ghostShipX - 18},${ghostShipY} ${ghostShipX + 4},${ghostShipY - 11} ${ghostShipX + 4},${ghostShipY + 11}`}
                  fill={P2D.usLight}
                  stroke={P2D.ink}
                  strokeWidth={1.6}
                />
              )}

              {/* Tàu sân bay Mỹ giả định (ước tính của Nhật) */}
              <g opacity={0.88}>
                <circle
                  cx={ghostShipX}
                  cy={ghostShipY}
                  r={36}
                  fill={P2D.blueprintPanel}
                  fillOpacity={0.55}
                  stroke={P2D.usLight}
                  strokeWidth={2.2}
                  strokeDasharray="7 5"
                />
                <WarshipIcon2D x={ghostShipX} y={ghostShipY} rot={180} scale={0.98} side="us" carrier />
              </g>

              {/* Đồng hồ hải trình 24 giờ dọc theo mũi tên chạy tàu cả ngày */}
              {pSteam > 0.05 && (
                <g transform={`translate(${(steamStart[0] + steamEnd[0]) * 0.5 + 35} ${steamStart[1] + 58})`}>
                  <circle r={26} fill={P2D.blueprintBg} stroke={P2D.fuelAmber} strokeWidth={2.4} filter="url(#sh)" />
                  {Array.from({ length: 12 }, (_, h) => {
                    const a = (h * Math.PI) / 6;
                    return (
                      <line
                        key={h}
                        x1={Math.cos(a) * 19}
                        y1={Math.sin(a) * 19}
                        x2={Math.cos(a) * 23}
                        y2={Math.sin(a) * 23}
                        stroke={P2D.paper}
                        strokeWidth={h % 3 === 0 ? 2.2 : 1.2}
                      />
                    );
                  })}
                  <circle
                    r={13}
                    fill="none"
                    stroke={P2D.fuelAmber}
                    strokeWidth={8}
                    strokeDasharray={`${(pSteam * 81.6).toFixed(1)} 100`}
                    transform="rotate(-90)"
                    opacity={0.55}
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={Math.cos(-Math.PI / 2 + pSteam * Math.PI * 2) * 18}
                    y2={Math.sin(-Math.PI / 2 + pSteam * Math.PI * 2) * 18}
                    stroke={P2D.fuelBright}
                    strokeWidth={2.8}
                    strokeLinecap="round"
                  />
                  <circle r={3.5} fill={P2D.fuelBright} />
                </g>
              )}

              {/* Tâm ngắm dự kiến đánh sáng ngày hôm sau ("April 19th" @ 414.98 s) ngay trên vành 300 dặm */}
              {sApril19 > 0.01 && (
                <g>
                  <line
                    x1={steamEnd[0] - 28}
                    y1={steamEnd[1] - 4}
                    x2={lerp(steamEnd[0] - 28, TOKYO[0] + 46, Math.min(1, sApril19))}
                    y2={lerp(steamEnd[1] - 4, TOKYO[1] + 10, Math.min(1, sApril19))}
                    stroke={P2D.jpMain}
                    strokeWidth={3.2}
                    strokeDasharray="9 7"
                    opacity={0.78}
                  />

                  <g transform={`translate(${steamEnd[0]} ${steamEnd[1]}) scale(${sApril19})`}>
                    <circle r={30} fill={P2D.jpMain} fillOpacity={0.22} stroke={P2D.jpMain} strokeWidth={3.4} />
                    <circle r={19} fill="none" stroke={P2D.paper} strokeWidth={1.8} strokeDasharray="6 4" />
                    <path d="M -11 5 A 11 11 0 0 1 11 5 Z" fill={P2D.fuelAmber} />
                    <line x1={-15} y1={5} x2={15} y2={5} stroke={P2D.paper} strokeWidth={2} />
                    {[-60, -30, 0, 30, 60].map((degA) => {
                      const rad = ((degA - 90) * Math.PI) / 180;
                      return (
                        <line
                          key={degA}
                          x1={Math.cos(rad) * 13}
                          y1={5 + Math.sin(rad) * 13}
                          x2={Math.cos(rad) * 17}
                          y2={5 + Math.sin(rad) * 17}
                          stroke={P2D.fuelBright}
                          strokeWidth={2}
                        />
                      );
                    })}
                  </g>
                </g>
              )}
            </g>
          )}

          {/* ==================== 7. CÚ LẬT 750 DẶM: HẠM ĐỘI HORNET & ĐƯỜNG BAY B-25 XUYÊN THỦNG PHÉP TÍNH NHẬT ==================== */}
          {t >= 416.8 && (
            <g opacity={prog(t, 416.8, 417.5)}>
              {/* Lực lượng Đặc nhiệm 16 ngoài khơi xa 750 dặm: USS Hornet (CarrierTop2D) + USS Enterprise & tuần dương hạm */}
              <g filter="url(#sh)">
                <CarrierTop2D
                  x={HORNET_POS[0]}
                  y={HORNET_POS[1]}
                  rot={-168}
                  ppm={0.85}
                  showLaunchStripe
                  parkedCount={10}
                />
                <WarshipIcon2D x={HORNET_POS[0] + 82} y={HORNET_POS[1] + 105} rot={-168} scale={1.24} side="us" carrier />
                <WarshipIcon2D x={HORNET_POS[0] - 66} y={HORNET_POS[1] + 116} rot={-168} scale={0.96} side="us" carrier={false} />
                <WarshipIcon2D x={HORNET_POS[0] + 68} y={HORNET_POS[1] - 102} rot={-168} scale={0.96} side="us" carrier={false} />
                <WarshipIcon2D x={HORNET_POS[0] + 162} y={HORNET_POS[1] + 8} rot={-168} scale={0.92} side="us" carrier={false} />
              </g>

              <circle
                cx={HORNET_POS[0]}
                cy={HORNET_POS[1]}
                r={142}
                fill="none"
                stroke={P2D.usMain}
                strokeWidth={2.6}
                strokeDasharray="12 8"
                opacity={0.7}
              />

              {/* Thước đo cự ly hình học 750 dặm nối từ Tokyo (530) tới USS Hornet (2025) */}
              {pRuler750 > 0.01 && (
                <g opacity={pRuler750}>
                  <line x1={TOKYO[0]} y1={548} x2={TOKYO[0]} y2={766} stroke={P2D.fuelBright} strokeWidth={2} strokeDasharray="5 5" opacity={0.68} />
                  <line x1={HORNET_POS[0]} y1={592} x2={HORNET_POS[0]} y2={766} stroke={P2D.fuelBright} strokeWidth={2} strokeDasharray="5 5" opacity={0.68} />

                  <line
                    x1={HORNET_POS[0]}
                    y1={752}
                    x2={lerp(HORNET_POS[0], TOKYO[0], pRuler750)}
                    y2={752}
                    stroke={P2D.usMain}
                    strokeWidth={8}
                    opacity={0.25}
                  />
                  <line
                    x1={HORNET_POS[0]}
                    y1={752}
                    x2={lerp(HORNET_POS[0], TOKYO[0], pRuler750)}
                    y2={752}
                    stroke={P2D.fuelBright}
                    strokeWidth={3.2}
                  />
                  {[0, 0.2, 0.4, 0.6, 0.8, 1].map((f, idx) => {
                    if (f > pRuler750 + 0.01) return null;
                    const tx = lerp(HORNET_POS[0], TOKYO[0], f);
                    const hTick = idx === 0 || idx === 5 ? 16 : 9;
                    return (
                      <line
                        key={idx}
                        x1={tx}
                        y1={752 - hTick}
                        x2={tx}
                        y2={752 + hTick}
                        stroke={P2D.fuelBright}
                        strokeWidth={idx === 0 || idx === 5 ? 3.4 : 2.2}
                      />
                    );
                  })}
                </g>
              )}

              {/* ĐƯỜNG BAY NÉT KÉP VÀNG-XANH (arcPath + drawOn, KHÔNG filter glow) */}
              {pLaunchArc > 0.005 && (
                <g>
                  <path
                    d={strikeArcFull}
                    fill="none"
                    stroke={P2D.usMain}
                    strokeWidth={20}
                    opacity={0.3}
                    strokeLinecap="round"
                    {...drawOn(1680, pLaunchArc)}
                  />
                  <path
                    d={strikeArcFull}
                    fill="none"
                    stroke={P2D.fuelAmber}
                    strokeWidth={9}
                    opacity={0.96}
                    strokeLinecap="round"
                    {...drawOn(1680, pLaunchArc)}
                  />
                  <path
                    d={strikeArcFull}
                    fill="none"
                    stroke={P2D.fuelBright}
                    strokeWidth={3.6}
                    strokeLinecap="round"
                    {...drawOn(1680, pLaunchArc)}
                  />
                </g>
              )}

              {/* Xung chấn phá vỡ vòng tính toán 300 dặm của Nhật + gạch chéo X vô hiệu hóa dấu hẹn 19/4 */}
              {pBreachRing > 0.01 && (
                <g>
                  <circle
                    cx={breachPt[0]}
                    cy={breachPt[1]}
                    r={16 + pBreachRing * 48}
                    fill="none"
                    stroke={P2D.fuelBright}
                    strokeWidth={3.6 * (1 - pBreachRing * 0.65)}
                    opacity={1 - pBreachRing * 0.7}
                  />
                  <circle cx={breachPt[0]} cy={breachPt[1]} r={9.5} fill={P2D.fuelBright} stroke={P2D.ink} strokeWidth={2.2} />

                  <g transform={`translate(${steamEnd[0]} ${steamEnd[1]})`} opacity={Math.min(1, pBreachRing * 1.6)}>
                    <line x1={-27} y1={-27} x2={27} y2={27} stroke={P2D.fuelBright} strokeWidth={4.8} strokeLinecap="round" />
                    <line x1={27} y1={-27} x2={-27} y2={27} stroke={P2D.fuelBright} strokeWidth={4.8} strokeLinecap="round" />
                  </g>
                </g>
              )}

              {/* Biên đội 3 oanh tạc cơ lục quân B25Top2D (tint="olive") nổi bật sắc nét trên nền biển sâu lao thẳng vào Tokyo */}
              {pLaunchArc > 0.02 && (
                <g filter="url(#sh)">
                  {[
                    { x: w1Base[0] + 18, y: w1Base[1] - 52, rot: w1Ang, ppm: 3.3, ph: 1.1 },
                    { x: w2Base[0] + 22, y: w2Base[1] + 52, rot: w2Ang, ppm: 3.3, ph: 2.3 },
                    { x: b25LeadPt[0], y: b25LeadPt[1], rot: b25LeadAng, ppm: 3.8, ph: 0 },
                  ].map((ac, idx) => (
                    <g key={idx}>
                      {/* Vòng quầng định vị chiến thuật mảnh giúp thân máy bay Olive nổi rõ tuyệt đối trên nền biển sâu */}
                      <circle
                        cx={ac.x}
                        cy={ac.y}
                        r={ac.ppm * 9.5}
                        fill={P2D.usMain}
                        fillOpacity={0.14}
                        stroke={P2D.fuelBright}
                        strokeWidth={1.6}
                        strokeOpacity={0.55}
                      />
                      <B25Top2D
                        x={ac.x}
                        y={ac.y}
                        rot={ac.rot}
                        ppm={ac.ppm}
                        tint="olive"
                        propPhase={t * 32 + ac.ph}
                      />
                    </g>
                  ))}
                </g>
              )}
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      <Label
        t={t}
        text="750 MILES OUT"
        x={980}
        y={835}
        from={CUE.c03_s02_750_miles}
        until={421.1}
        size={54}
      />
    </AbsoluteFill>
  );
};

export default C03S02;
