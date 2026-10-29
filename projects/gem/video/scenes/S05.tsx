// Cảnh S05 (89.68 – 105.90s, thuần 2D):
// Bản đồ chiến lược tam giác biên giới Iraq–Syria–Jordan: >160 vụ tập kích dồn dập vào tiền đồn Mỹ ở Syria & Iraq,
// đối lập với vòm lá chắn xanh êm đềm ôm lấy Tháp 22 trong lãnh thổ Jordan trước khi vết nứt răng cưa đỏ rực toạc mở.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { prog, lerp, bump } from '@kit/theme';
import { useT, handheld, Label } from '@kit/motion';
import { Cam2D, Grain } from '@lib/2d/look';
import { contours } from '@lib/2d/terrain';
import { arcPath, arcAt, arcAngle, smoothPath, drawOn, type Pt } from '@lib/2d/path';
import { Blast2D } from '@lib/2d/fx';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { TacticalGrid2D, Shahed2D } from '../local/draw2d';

// Không gian bản đồ thế giới khép kín hoàn toàn trong hộp SVG 3200x2200 (tránh tuyệt đối lỗi tràn tile của Chromium)
const WORLD_X = -500;
const WORLD_Y = -400;
const WORLD_W = 3200;
const WORLD_H = 2200;

// Tọa độ tâm Ngã ba biên giới & căn cứ Tháp 22 (lùi vào trong lãnh thổ Jordan phía Nam biên giới)
const TRI: Pt = [1030, 612];
const TOWER22: Pt = [936, 676];
const ALTANF: Pt = [888, 542];

// Ba nhánh biên giới địa chính hội tụ tại ngã ba Rukban (1030, 612)
const BORDER_SYRIA_JORDAN: Pt[] = [
  [-480, 910],
  [80, 815],
  [380, 742],
  [650, 652],
  [875, 594],
  TRI,
];

const BORDER_JORDAN_IRAQ: Pt[] = [
  TRI,
  [1240, 690],
  [1510, 782],
  [1830, 892],
  [2660, 1140],
];

const BORDER_SYRIA_IRAQ: Pt[] = [
  TRI,
  [1096, 468],
  [1175, 318],
  [1252, 138],
  [1410, -380],
];

// Dòng sông Euphrates cách điệu chảy qua Đông Syria sang Tây Iraq tạo chiều sâu địa lý thật
const EUPHRATES_RIVER: Pt[] = [
  [610, -340],
  [740, -110],
  [890, 65],
  [1090, 185],
  [1202, 256],
  [1390, 342],
  [1650, 468],
  [1960, 620],
  [2420, 810],
];

type OutpostStrike = {
  id: number;
  x: number;
  y: number;
  sx: number;
  sy: number;
  apex: number;
  tHit1: number;
  tHit2: number;
  size: number;
  hasDrone?: boolean;
};

// 14 tiền đồn Mỹ tại Syria (Tây-Bắc) & Iraq (Đông-Đông Bắc) hứng chịu >160 đòn tập kích suốt hơn 3 tháng
const OUTPOST_STRIKES: OutpostStrike[] = [
  // Cụm tiền đồn tại Syria (6 điểm)
  { id: 1, x: 888, y: 542, sx: 1035, sy: 375, apex: 48, tHit1: 90.25, tHit2: 93.75, size: 28, hasDrone: true },
  { id: 2, x: 742, y: 428, sx: 555, sy: 265, apex: 55, tHit1: 90.65, tHit2: 94.20, size: 30 },
  { id: 3, x: 912, y: 312, sx: 1125, sy: 190, apex: 52, tHit1: 91.10, tHit2: 94.65, size: 32 },
  { id: 4, x: 618, y: 318, sx: 412, sy: 185, apex: 45, tHit1: 91.55, tHit2: 95.00, size: 26 },
  { id: 5, x: 1018, y: 204, sx: 828, sy: 88, apex: 50, tHit1: 92.00, tHit2: 95.30, size: 29, hasDrone: true },
  { id: 6, x: 472, y: 492, sx: 285, sy: 356, apex: 46, tHit1: 92.45, tHit2: 93.95, size: 25 },
  // Cụm tiền đồn tại Iraq (8 điểm)
  { id: 7, x: 1256, y: 552, sx: 1472, sy: 415, apex: 56, tHit1: 90.40, tHit2: 93.85, size: 31, hasDrone: true },
  { id: 8, x: 1418, y: 446, sx: 1658, sy: 318, apex: 60, tHit1: 90.85, tHit2: 94.35, size: 33 },
  { id: 9, x: 1345, y: 302, sx: 1560, sy: 165, apex: 52, tHit1: 91.30, tHit2: 94.80, size: 29 },
  { id: 10, x: 1558, y: 586, sx: 1785, sy: 462, apex: 54, tHit1: 91.75, tHit2: 95.15, size: 30 },
  { id: 11, x: 1495, y: 224, sx: 1720, sy: 108, apex: 48, tHit1: 92.15, tHit2: 93.60, size: 27 },
  { id: 12, x: 1682, y: 392, sx: 1882, sy: 268, apex: 50, tHit1: 92.60, tHit2: 95.45, size: 28, hasDrone: true },
  { id: 13, x: 1625, y: 736, sx: 1848, sy: 632, apex: 46, tHit1: 92.95, tHit2: 94.50, size: 27 },
  { id: 14, x: 1192, y: 412, sx: 1385, sy: 256, apex: 44, tHit1: 93.25, tHit2: 95.55, size: 26 },
];

// Đường nứt răng cưa chính toạc mở xuyên vòm lá chắn xanh từ vành Bắc-Đông xuống sát Tháp 22
const CRACK_MAIN_PTS: Pt[] = [
  [1026, 518],
  [1004, 552],
  [1018, 576],
  [986, 608],
  [998, 630],
  [966, 652],
  [976, 668],
  [948, 686],
  [922, 714],
  [898, 746],
];

const CRACK_BRANCH_L: Pt[] = [
  [986, 608],
  [950, 596],
  [924, 612],
  [888, 604],
  [860, 622],
];

const CRACK_BRANCH_R: Pt[] = [
  [966, 652],
  [1004, 666],
  [1028, 658],
  [1064, 684],
];

// Các đường rạn băng xanh lan trên bề mặt vòm lá chắn khi bị phá vỡ
const SHIELD_FROST_CRACKS: Pt[][] = [
  [
    [1004, 552],
    [968, 534],
    [932, 540],
  ],
  [
    [1018, 576],
    [1058, 566],
    [1088, 582],
  ],
  [
    [948, 686],
    [964, 728],
    [952, 764],
  ],
  [
    [922, 714],
    [878, 712],
    [846, 732],
  ],
];

const polyD = (pts: Pt[]) => 'M' + pts.map(([x, y]) => `${x} ${y}`).join(' L');

/** Biểu tượng tiền đồn quân sự Mỹ 3 tông lam thép + bóng đổ vector sạch (không dùng SVG filter tránh lỗi tile). */
const UsOutpostNode: React.FC<{ x: number; y: number; r?: number; hero?: boolean }> = ({
  x,
  y,
  r = 12,
  hero = false,
}) => (
  <g transform={`translate(${x} ${y})`}>
    {/* Bóng đổ vector sắc gọn bên dưới */}
    <polygon
      points={`0,${-r * 1.35 + 6} ${r * 1.2},${-r * 0.68 + 6} ${r * 1.2},${r * 0.68 + 6} 0,${r * 1.35 + 6} ${-r * 1.2},${r * 0.68 + 6} ${-r * 1.2},${-r * 0.68 + 6}`}
      fill={PAL2D.ink}
      opacity={0.46}
    />
    {hero && (
      <polygon
        points={`0,${-r * 1.65} ${r * 1.45},${-r * 0.82} ${r * 1.45},${r * 0.82} 0,${r * 1.65} ${-r * 1.45},${r * 0.82} ${-r * 1.45},${-r * 0.82}`}
        fill={PAL2D.usLo}
        stroke={PAL2D.ink}
        strokeWidth={2.8}
      />
    )}
    <polygon
      points={`0,${-r * 1.2} ${r * 1.06},${-r * 0.6} ${r * 1.06},${r * 0.6} 0,${r * 1.2} ${-r * 1.06},${r * 0.6} ${-r * 1.06},${-r * 0.6}`}
      fill={PAL2D.usMid}
      stroke={PAL2D.ink}
      strokeWidth={2.4}
    />
    <polygon
      points={`0,${-r * 0.95} ${r * 0.82},${-r * 0.46} 0,0 ${-r * 0.82},${-r * 0.46}`}
      fill={PAL2D.usHi}
      opacity={0.88}
    />
    <circle cx={0} cy={0} r={r * 0.34} fill={PAL2D.paper} stroke={PAL2D.ink} strokeWidth={1.6} />
  </g>
);

const S05: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const mapData = useMemo(() => {
    const topo = contours('rukban-triborder-s05', 3000, 2000, 11, 24, 500);

    const syriaPoly =
      `M -480 -380 L 1410 -380 ` +
      BORDER_SYRIA_IRAQ.slice()
        .reverse()
        .slice(1)
        .map(([x, y]) => `L ${x} ${y}`)
        .join(' ') +
      ' ' +
      BORDER_SYRIA_JORDAN.slice()
        .reverse()
        .slice(1)
        .map(([x, y]) => `L ${x} ${y}`)
        .join(' ') +
      ' Z';

    const iraqPoly =
      `M 1410 -380 L 2660 -380 L 2660 1140 ` +
      BORDER_JORDAN_IRAQ.slice()
        .reverse()
        .slice(1)
        .map(([x, y]) => `L ${x} ${y}`)
        .join(' ') +
      ' ' +
      BORDER_SYRIA_IRAQ.slice(1)
        .map(([x, y]) => `L ${x} ${y}`)
        .join(' ') +
      ' Z';

    const jordanPoly =
      `M -480 910 ` +
      BORDER_SYRIA_JORDAN.slice(1)
        .map(([x, y]) => `L ${x} ${y}`)
        .join(' ') +
      ' ' +
      BORDER_JORDAN_IRAQ.slice(1)
        .map(([x, y]) => `L ${x} ${y}`)
        .join(' ') +
      ' L 2660 1760 L -480 1760 Z';

    const jordanShieldRim = smoothPath(
      [
        [240, 792],
        [520, 712],
        [740, 646],
        [882, 612],
        [1024, 630],
        [1235, 708],
        [1520, 806],
        [1760, 888],
      ],
      false,
      0.32,
    );

    return {
      topo,
      syriaPoly,
      iraqPoly,
      jordanPoly,
      jordanShieldRim,
      riverD: smoothPath(EUPHRATES_RIVER, false, 0.45),
      bSJ: smoothPath(BORDER_SYRIA_JORDAN, false, 0.25),
      bJI: smoothPath(BORDER_JORDAN_IRAQ, false, 0.25),
      bSI: smoothPath(BORDER_SYRIA_IRAQ, false, 0.25),
      crackMain: polyD(CRACK_MAIN_PTS),
      crackLeft: polyD(CRACK_BRANCH_L),
      crackRight: polyD(CRACK_BRANCH_R),
      frostCracks: SHIELD_FROST_CRACKS.map((pts) => polyD(pts)),
    };
  }, []);

  // Tiến độ các giai đoạn kể chuyện
  const warZoneTint = prog(t, 89.9, 93.4) * (1 - 0.32 * prog(t, 96.4, 98.5));
  const shieldIn = prog(t, 96.32, 98.1);
  const zoomCrack = prog(t, 100.85, 103.5);
  const crackProg = prog(t, CUE.s05_crack, CUE.s05_crack + 1.15);
  const crackPulse = 0.76 + 0.24 * Math.sin((t - CUE.s05_crack) * 9.5);
  const crackJolt = bump(t, CUE.s05_crack, 0.48);

  // Camera 2D: mở rộng tam giác biên giới Syria-Iraq-Jordan, sau đó đẩy zoom cận Tháp 22 & vết nứt
  const camX = lerp(1070, 962, zoomCrack);
  const camY = lerp(522, 642, zoomCrack);
  const camZoom = lerp(0.96, 2.15, zoomCrack);
  const baseShake = handheld(t, 2.2, 's05-map');
  const shake: readonly [number, number] = [
    baseShake[0] + Math.sin(t * 44) * 9 * crackJolt,
    baseShake[1] + Math.cos(t * 39) * 7 * crackJolt,
  ];

  // Độ nhấp nháy suy yếu của vòm lá chắn xanh khi bị xé toạc
  const shieldFlicker = crackProg > 0 ? 0.82 + 0.14 * Math.sin(t * 22) * (1 - crackProg * 0.5) : 1;

  return (
    <AbsoluteFill style={{ background: PAL2D.bgNight }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <svg
          width={WORLD_W}
          height={WORLD_H}
          viewBox={`${WORLD_X} ${WORLD_Y} ${WORLD_W} ${WORLD_H}`}
          style={{ position: 'absolute', left: WORLD_X, top: WORLD_Y }}
        >
          <defs>
            <radialGradient id="s05WarHeat" cx="54%" cy="34%" r="52%">
              <stop offset="0%" stopColor={PAL2D.threatMid} stopOpacity="0.34" />
              <stop offset="65%" stopColor={PAL2D.threatLo} stopOpacity="0.14" />
              <stop offset="100%" stopColor={PAL2D.bgNight} stopOpacity="0" />
            </radialGradient>
            <radialGradient id="s05JordanDome" cx="46%" cy="50%" r="48%">
              <stop offset="0%" stopColor={PAL2D.usHi} stopOpacity="0.40" />
              <stop offset="55%" stopColor={PAL2D.usMid} stopOpacity="0.22" />
              <stop offset="100%" stopColor={PAL2D.usLo} stopOpacity="0.02" />
            </radialGradient>
            <radialGradient id="s05TowerDome" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PAL2D.ewTeal} stopOpacity="0.08" />
              <stop offset="70%" stopColor={PAL2D.usMid} stopOpacity="0.24" />
              <stop offset="100%" stopColor={PAL2D.usHi} stopOpacity="0.48" />
            </radialGradient>
            <radialGradient id="s05BreachGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PAL2D.amberHi} stopOpacity="0.55" />
              <stop offset="45%" stopColor={PAL2D.threatMid} stopOpacity="0.28" />
              <stop offset="100%" stopColor={PAL2D.threatLo} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* ==================== 1. NỀN 3 MẢNG LÃNH THỔ TAM GIÁC BIÊN GIỚI ==================== */}
          <rect x={WORLD_X} y={WORLD_Y} width={WORLD_W} height={WORLD_H} fill={PAL2D.bgNight} />

          {/* Lãnh thổ SYRIA (Bắc - Tây Bắc): nền chàm ấm pha cát sa mạc */}
          <path d={mapData.syriaPoly} fill="#16253a" />
          <path d={mapData.syriaPoly} fill={PAL2D.sandLo} opacity={0.11} />
          <path d={mapData.syriaPoly} fill={PAL2D.threatLo} opacity={0.24 * warZoneTint} />

          {/* Lãnh thổ IRAQ (Đông - Đông Bắc): nền đá phiến sẫm chiến trường */}
          <path d={mapData.iraqPoly} fill="#1b2b42" />
          <path d={mapData.iraqPoly} fill={PAL2D.threatLo} opacity={0.30 * warZoneTint} />

          {/* Dòng sông Euphrates chảy xuyên thung lũng Syria - Iraq */}
          <path d={mapData.riverD} fill="none" stroke="#0a1626" strokeWidth={22} strokeLinecap="round" opacity={0.75} />
          <path d={mapData.riverD} fill="none" stroke="#1f446b" strokeWidth={9} strokeLinecap="round" opacity={0.45} />

          {/* Vầng nhiệt chiến sự bao trùm Syria & Iraq */}
          <ellipse cx={1210} cy={350} rx={840} ry={480} fill="url(#s05WarHeat)" opacity={warZoneTint} />

          {/* Lãnh thổ JORDAN (Nam - Tây Nam, mỏm Rukban nhô lên ngã ba) */}
          <path d={mapData.jordanPoly} fill="#0d2036" />
          {shieldIn > 0.005 && (
            <path
              d={mapData.jordanPoly}
              fill={PAL2D.usLo}
              opacity={0.44 * shieldIn * (1 - 0.22 * crackProg)}
            />
          )}

          {/* Đường đồng mức địa hình sa mạc Rukban (contours) phủ khắp 3 quốc gia */}
          <g transform={`translate(${WORLD_X + 100} ${WORLD_Y + 100})`}>
            {mapData.topo.map((c) => (
              <path
                key={c.level}
                d={c.d}
                fill="none"
                stroke={c.level % 3 === 0 ? PAL2D.sandMid : PAL2D.grid}
                strokeWidth={c.level % 3 === 0 ? 1.55 : 1.0}
                opacity={c.level % 3 === 0 ? 0.28 : 0.16}
              />
            ))}
          </g>

          {/* Lưới tọa độ chiến thuật */}
          <TacticalGrid2D x={-460} y={-360} w={3080} h={2080} step={80} major={320} opacity={0.27} />

          {/* Vòng phương vị radar chiến lược lấy tâm tại Ngã ba biên giới */}
          {[180, 360, 560, 780].map((rad, idx) => (
            <circle
              key={rad}
              cx={TRI[0]}
              cy={TRI[1]}
              r={rad}
              fill="none"
              stroke={PAL2D.grid}
              strokeWidth={idx === 1 ? 1.6 : 1.1}
              strokeDasharray={idx % 2 === 0 ? '8 8' : undefined}
              opacity={0.25}
            />
          ))}

          {/* ==================== 2. ĐƯỜNG BIÊN GIỚI BA QUỐC GIA ==================== */}
          {[mapData.bSJ, mapData.bJI, mapData.bSI].map((dPath, i) => (
            <g key={i}>
              <path d={dPath} fill="none" stroke={PAL2D.ink} strokeWidth={11.5} strokeLinecap="round" opacity={0.68} />
              <path d={dPath} fill="none" stroke={PAL2D.sandHi} strokeWidth={4.4} strokeLinecap="round" opacity={0.88} />
              <path
                d={dPath}
                fill="none"
                stroke={PAL2D.paper}
                strokeWidth={1.8}
                strokeDasharray="12 8"
                strokeLinecap="round"
                opacity={0.8}
              />
            </g>
          ))}

          {/* Nút mốc tam giác Ngã ba biên giới */}
          <circle cx={TRI[0]} cy={TRI[1]} r={11.5} fill={PAL2D.ink} stroke={PAL2D.sandHi} strokeWidth={2.8} />
          <circle cx={TRI[0]} cy={TRI[1]} r={4.2} fill={PAL2D.amberHi} />

          {/* Tuyến tiếp vận mờ nối Tháp 22 sang Al-Tanf (liền mạch từ cảnh S04) */}
          <line
            x1={TOWER22[0]}
            y1={TOWER22[1]}
            x2={ALTANF[0]}
            y2={ALTANF[1]}
            stroke={PAL2D.usHi}
            strokeWidth={2.4}
            strokeDasharray="6 6"
            opacity={0.5}
          />

          {/* ==================== 3. VÒM LÁ CHẮN XANH HẬU PHƯƠNG JORDAN (TỪ 96.4S) ==================== */}
          {shieldIn > 0.005 && (
            <g opacity={shieldIn * shieldFlicker}>
              {/* Vầng sáng êm đềm ôm dọc bên trong đường biên giới Jordan */}
              <ellipse cx={TOWER22[0] + 40} cy={TOWER22[1] + 150} rx={680} ry={300} fill="url(#s05JordanDome)" />
              <path
                d={mapData.jordanShieldRim}
                fill="none"
                stroke={PAL2D.usMid}
                strokeWidth={24}
                strokeLinecap="round"
                opacity={0.25 * (1 - 0.3 * crackProg)}
              />
              <path
                d={mapData.jordanShieldRim}
                fill="none"
                stroke={PAL2D.usHi}
                strokeWidth={5.2}
                strokeLinecap="round"
                opacity={0.85 * (1 - 0.25 * crackProg)}
              />

              {/* Vòm lá chắn tròn liền mạch ôm trọn lấy Tháp 22 */}
              <circle
                cx={TOWER22[0]}
                cy={TOWER22[1]}
                r={184 * shieldIn}
                fill="url(#s05TowerDome)"
                opacity={1 - 0.32 * crackProg}
              />
              <circle
                cx={TOWER22[0]}
                cy={TOWER22[1]}
                r={184 * shieldIn}
                fill="none"
                stroke={PAL2D.usMid}
                strokeWidth={14}
                opacity={0.26}
              />
              <circle
                cx={TOWER22[0]}
                cy={TOWER22[1]}
                r={184 * shieldIn}
                fill="none"
                stroke={crackProg > 0.15 ? PAL2D.ewTeal : PAL2D.usHi}
                strokeWidth={3.6}
                opacity={0.94}
              />
              <circle
                cx={TOWER22[0]}
                cy={TOWER22[1]}
                r={126 * shieldIn}
                fill="none"
                stroke={PAL2D.usHi}
                strokeWidth={1.8}
                strokeDasharray="10 7"
                opacity={0.58}
              />
              <circle
                cx={TOWER22[0]}
                cy={TOWER22[1]}
                r={72 * shieldIn}
                fill="none"
                stroke={PAL2D.ewTeal}
                strokeWidth={1.4}
                opacity={0.42}
              />
            </g>
          )}

          {/* ==================== 4. >160 CUỘC TẬP KÍCH TẠI SYRIA & IRAQ (90.0 – 96.1S) ==================== */}
          {OUTPOST_STRIKES.map((op) => {
            const flight1 = prog(t, op.tHit1 - 0.55, op.tHit1);
            const flight2 = prog(t, op.tHit2 - 0.5, op.tHit2);
            const hitAge1 = t - op.tHit1;
            const hitAge2 = t - op.tHit2;
            const wasHit = t >= op.tHit1;

            return (
              <g key={op.id}>
                {/* Vòng sóng xung kích đỏ cam lan rộng mỗi đợt tập kích */}
                {[hitAge1, hitAge2].map((age, waveIdx) => {
                  if (age < 0 || age > 1.55) return null;
                  const p = age / 1.55;
                  const rad = 14 + p * 84;
                  return (
                    <g key={waveIdx}>
                      <circle
                        cx={op.x}
                        cy={op.y}
                        r={rad}
                        fill="none"
                        stroke={PAL2D.threatMid}
                        strokeWidth={5.5 * (1 - p)}
                        opacity={0.84 * (1 - p)}
                      />
                      <circle
                        cx={op.x}
                        cy={op.y}
                        r={rad * 0.65}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={2.6 * (1 - p)}
                        opacity={0.76 * (1 - p)}
                      />
                    </g>
                  );
                })}

                {/* Chấm tiền đồn Mỹ tại Iraq & Syria (vẫn giữ lõi xanh = "chưa ai thiệt mạng", bao ngoài cảnh báo đỏ) */}
                {wasHit && (
                  <circle
                    cx={op.x}
                    cy={op.y}
                    r={22}
                    fill={PAL2D.threatMid}
                    opacity={0.20 + 0.1 * Math.sin(t * 6 + op.id)}
                  />
                )}
                <UsOutpostNode x={op.x} y={op.y} r={10.5} />
                {wasHit && (
                  <circle
                    cx={op.x}
                    cy={op.y}
                    r={18}
                    fill="none"
                    stroke={PAL2D.threatHi}
                    strokeWidth={1.8}
                    strokeDasharray="5 4"
                    opacity={0.78}
                  />
                )}

                {/* Quỹ đạo đạn rocket / UAV cảm tử bay tới tiền đồn */}
                {[
                  { fl: flight1, hitT: op.tHit1, ox: 0, oy: 0 },
                  { fl: flight2, hitT: op.tHit2, ox: 26, oy: -18 },
                ].map(({ fl, hitT, ox, oy }, k) => {
                  if (fl <= 0.01 || t > hitT + 0.45) return null;
                  const fade = t > hitT ? Math.max(0, 1 - (t - hitT) / 0.45) : 1;
                  const sx = op.sx + ox;
                  const sy = op.sy + oy;
                  const tip = arcAt(sx, sy, op.x, op.y, op.apex, fl);
                  const ang = arcAngle(sx, sy, op.x, op.y, op.apex, fl);
                  return (
                    <g key={k} opacity={fade}>
                      <path
                        d={arcPath(sx, sy, op.x, op.y, op.apex, fl, 28)}
                        fill="none"
                        stroke={PAL2D.threatMid}
                        strokeWidth={5.5}
                        opacity={0.28}
                        strokeLinecap="round"
                      />
                      <path
                        d={arcPath(sx, sy, op.x, op.y, op.apex, fl, 28)}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      />
                      {op.hasDrone && fl < 0.99 && (
                        <Shahed2D x={tip[0]} y={tip[1]} rot={ang} scale={0.26} propAngle={t * 42} />
                      )}
                    </g>
                  );
                })}

                {/* Hai đợt nổ Blast2D liên hoàn tại mỗi tiền đồn */}
                <Blast2D t={t} at={op.tHit1} x={op.x} y={op.y + 4} size={op.size} seed={op.id * 7} life={2.6} air />
                <Blast2D t={t} at={op.tHit2} x={op.x + 5} y={op.y + 2} size={op.size * 0.92} seed={op.id * 13 + 3} life={2.8} />
              </g>
            );
          })}

          {/* ==================== 5. CHẤM CĂN CỨ THÁP 22 & VẾT NỨT TỬ THẦN (101.40S) ==================== */}
          <UsOutpostNode x={TOWER22[0]} y={TOWER22[1]} r={16} hero />

          {/* Vòng tâm khóa cảnh báo đỏ nhấp nháy trên Tháp 22 ngay khi vòm lá chắn nứt toạc */}
          {crackProg > 0.02 && (
            <g opacity={crackProg}>
              <circle cx={982} cy={628} r={96 * crackProg} fill="url(#s05BreachGlow)" />
              <circle
                cx={TOWER22[0]}
                cy={TOWER22[1]}
                r={32 + (1 - crackProg) * 20}
                fill="none"
                stroke={PAL2D.threatMid}
                strokeWidth={3.2}
              />
              <circle
                cx={TOWER22[0]}
                cy={TOWER22[1]}
                r={47}
                fill="none"
                stroke={PAL2D.amberHi}
                strokeWidth={1.8}
                strokeDasharray="8 6"
                opacity={0.88}
              />
            </g>
          )}

          {/* Đường nứt răng cưa đỏ rực toạc mở xuyên vòm chắn xanh ("mở toan khe cửa tử thần đầu tiên") */}
          {crackProg > 0.005 && (
            <g>
              {/* Các đường rạn nứt băng xanh tỏa ra trên mặt kính vòm lá chắn */}
              {mapData.frostCracks.map((fd, fi) => {
                const fp = prog(t, CUE.s05_crack + 0.15 + fi * 0.08, CUE.s05_crack + 0.9);
                return (
                  <path
                    key={fi}
                    d={fd}
                    fill="none"
                    stroke={PAL2D.usHi}
                    strokeWidth={2.0}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={0.72}
                    {...drawOn(140, fp)}
                  />
                );
              })}

              {/* Hào quang đỏ rộng + khe vực tối răng cưa + lõi sét đỏ cam/vàng trắng */}
              <path
                d={mapData.crackMain}
                fill="none"
                stroke={PAL2D.threatMid}
                strokeWidth={26 * crackPulse}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.30}
                {...drawOn(380, crackProg)}
              />
              <path
                d={mapData.crackMain}
                fill="none"
                stroke={PAL2D.ink}
                strokeWidth={14}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
                {...drawOn(380, crackProg)}
              />
              <path
                d={mapData.crackMain}
                fill="none"
                stroke={PAL2D.threatMid}
                strokeWidth={9.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.96}
                {...drawOn(380, crackProg)}
              />
              <path
                d={mapData.crackMain}
                fill="none"
                stroke={PAL2D.amberHi}
                strokeWidth={3.6}
                strokeLinecap="round"
                strokeLinejoin="round"
                {...drawOn(380, crackProg)}
              />

              {/* Hai nhánh nứt xương cá lan ngang trên mặt vòm chắn xanh */}
              {[mapData.crackLeft, mapData.crackRight].map((br, bi) => {
                const subP = prog(t, CUE.s05_crack + 0.25 + bi * 0.12, CUE.s05_crack + 1.05);
                return (
                  <g key={bi}>
                    <path
                      d={br}
                      fill="none"
                      stroke={PAL2D.threatMid}
                      strokeWidth={12}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      opacity={0.28}
                      {...drawOn(220, subP)}
                    />
                    <path
                      d={br}
                      fill="none"
                      stroke={PAL2D.threatHi}
                      strokeWidth={5.0}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      {...drawOn(220, subP)}
                    />
                    <path
                      d={br}
                      fill="none"
                      stroke={PAL2D.amberHi}
                      strokeWidth={2.0}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      {...drawOn(220, subP)}
                    />
                  </g>
                );
              })}

              {/* Các mảnh vỡ vòm chắn màu lam bắn văng ra từ vết nứt */}
              {crackProg > 0.25 &&
                [
                  { x: 1002, y: 562, dx: -18, dy: -8, r: -28, s: 1.0 },
                  { x: 1008, y: 594, dx: 20, dy: 6, r: 34, s: 0.85 },
                  { x: 972, y: 624, dx: -22, dy: 10, r: -42, s: 1.1 },
                  { x: 984, y: 644, dx: 22, dy: 8, r: 26, s: 0.9 },
                  { x: 954, y: 666, dx: -16, dy: 14, r: -19, s: 0.78 },
                ].map((sh, si) => {
                  const sp = prog(t, CUE.s05_crack + 0.2 + si * 0.05, CUE.s05_crack + 1.4);
                  return (
                    <polygon
                      key={si}
                      points="0,-9 8,5 -7,7"
                      fill={PAL2D.usHi}
                      stroke={PAL2D.ink}
                      strokeWidth={1.4}
                      opacity={0.86 * (1 - sp * 0.45)}
                      transform={`translate(${sh.x + sh.dx * sp} ${sh.y + sh.dy * sp}) rotate(${sh.r * sp}) scale(${sh.s})`}
                    />
                  );
                })}

              {/* Mũi cánh tam giác Shahed2D đỏ thẫm trượt lặng lẽ qua khe cửa tử thần vừa mở */}
              {t >= CUE.s05_crack + 0.5 && (
                <g opacity={prog(t, CUE.s05_crack + 0.5, CUE.s05_crack + 1.3)}>
                  <Shahed2D
                    x={lerp(1038, 976, prog(t, CUE.s05_crack + 0.5, 105.8))}
                    y={lerp(514, 622, prog(t, CUE.s05_crack + 0.5, 105.8))}
                    rot={121}
                    scale={0.35}
                    propAngle={t * 45}
                  />
                </g>
              )}
            </g>
          )}
        </svg>
      </Cam2D>

      {/* Lớp hạt giấy hồ sơ giải mật phủ cuối cảnh đúng chuẩn SHOT_PLAN */}
      <Grain opacity={0.42} />

      {/* Nhãn chữ duy nhất: ">160 VỤ TẬP KÍCH" (93.66 – 96.1s) */}
      <Label
        t={t}
        text=">160 VỤ TẬP KÍCH"
        x={960}
        y={136}
        from={CUE.s05_attacks160}
        until={96.1}
        bg={PAL2D.threatMid}
        fg={PAL2D.paper}
      />
    </AbsoluteFill>
  );
};

export default S05;
