import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld } from '@core/frame';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { Blast2D, Muzzle2D, Puff2D } from '@skill/military/2d/fx';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { arcAngle, arcAt, arcPath, drawOn, smoothPath, type Pt } from '@skill/military/2d/path';
import { contours } from '@skill/military/2d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { AbramsTop2D, NatoUnitBadge2D } from '../parts/Abrams2D';

const MAP_W = 2800;
const MAP_H = 1800;

// Đường bờ biển Vịnh Ba Tư (phía đông bản đồ)
const GULF_COAST_PTS: Pt[] = [
  [2130, 0],
  [2080, 180],
  [2050, 390],
  [2025, 580],
  [2045, 675], // Umm Qasr / bán đảo Faw
  [1995, 745],
  [1935, 808], // Vịnh Kuwait (Kuwait Bay)
  [2018, 848],
  [2040, 960],
  [2095, 1118], // Khafji
  [2168, 1285],
  [2250, 1480],
  [2345, 1800],
];

const GULF_WATER_PATH =
  smoothPath(GULF_COAST_PTS) + ` L ${MAP_W} ${MAP_H} L ${MAP_W} 0 Z`;

const GULF_SHOAL_1_PTS: Pt[] = GULF_COAST_PTS.map(([x, y]) => [x + 52, y]);
const GULF_SHOAL_1_PATH =
  smoothPath(GULF_SHOAL_1_PTS) + ` L ${MAP_W} ${MAP_H} L ${MAP_W} 0 Z`;

const GULF_SHOAL_2_PTS: Pt[] = GULF_COAST_PTS.map(([x, y]) => [x + 125, y]);
const GULF_SHOAL_2_PATH =
  smoothPath(GULF_SHOAL_2_PTS) + ` L ${MAP_W} ${MAP_H} L ${MAP_W} 0 Z`;

// Sông Euphrates & Shatt al-Arab phía bắc chiến trường
const EUPHRATES_PATH = smoothPath([
  [420, 210],
  [740, 255],
  [1060, 315],
  [1365, 390],
  [1650, 470],
  [1890, 548],
  [2042, 665],
]);

const TIGRIS_BRANCH_PATH = smoothPath([
  [1180, 120],
  [1430, 235],
  [1685, 365],
  [1890, 548],
]);

// Thung lũng cạn Wadi al-Batin dọc sườn tây Kuwait
const WADI_BATIN_PATH = smoothPath([
  [1160, 1450],
  [1315, 1270],
  [1490, 1080],
  [1585, 890],
  [1672, 695],
]);

// Biên giới chiến thuật nét đứt: Kuwait – Iraq – Ả Rập Xê Út
const BORDER_IRAQ_SAUDI = 'M 240 695 L 740 895 L 1210 1090 L 1345 1002 L 1490 1080';
const BORDER_NEUTRAL_ZONE = 'M 1210 1090 L 1345 1172 L 1490 1080';
const BORDER_KUWAIT_SAUDI = 'M 1490 1080 L 1695 1128 L 2095 1118';
const BORDER_KUWAIT_IRAQ = smoothPath([
  [1490, 1080],
  [1585, 890],
  [1672, 695],
  [1845, 652],
  [2035, 676],
]);

// Tuyến phòng thủ Iraq cố thủ dọc nam Kuwait ("Saddam Line")
const SADDAM_LINE_PTS: Pt[] = [
  [1520, 1052],
  [1640, 1076],
  [1770, 1088],
  [1905, 1086],
  [2045, 1082],
];

// 4 mũi tiến công thiết giáp ("Left Hook" VII Corps & XVIII Airborne Corps + mũi ghim sườn nam Kuwait)
type AttackAxis = {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  apex: number;
  len: number;
  width: number;
  delay: number;
};

const ATTACK_AXES: AttackAxis[] = [
  // Cánh ngoài cùng vòng sâu qua sa mạc phía tây (XVIII Airborne / 24th Mech)
  { x0: 590, y0: 960, x1: 1455, y1: 505, apex: 325, len: 1280, width: 11, delay: 0.0 },
  // Mũi chủ công VII Corps ("Left Hook" 1st & 3rd Armored, 1st Cav, 1st Inf — >1,800 Abrams)
  { x0: 875, y0: 1095, x1: 1615, y1: 650, apex: 265, len: 1120, width: 15, delay: 0.14 },
  // Mũi gọng kìm thiết giáp sườn trong thọc thẳng vào Vệ binh Cộng hoà Iraq
  { x0: 1140, y0: 1185, x1: 1695, y1: 810, apex: 175, len: 860, width: 12, delay: 0.28 },
  // Mũi đột phá trực diện giải phóng Kuwait ở phía nam
  { x0: 1790, y0: 1215, x1: 1875, y1: 875, apex: -55, len: 520, width: 9, delay: 0.42 },
];

// Đội hình AbramsTop2D + NatoUnitBadge2D tiến dọc các mũi gọng kìm
type TankUnit = {
  axisIdx: number;
  sStart: number;
  sEnd: number;
  perpOffset: number;
  scale: number;
  turretBias: number;
};

const ABRAMS_SPEARHEAD: TankUnit[] = [
  // Cụm mũi nhọn trung tâm VII Corps
  { axisIdx: 1, sStart: 0.08, sEnd: 0.94, perpOffset: 0, scale: 0.155, turretBias: 8 },
  { axisIdx: 1, sStart: 0.04, sEnd: 0.84, perpOffset: -64, scale: 0.138, turretBias: 14 },
  { axisIdx: 1, sStart: 0.04, sEnd: 0.84, perpOffset: 64, scale: 0.138, turretBias: 4 },
  { axisIdx: 1, sStart: 0.0, sEnd: 0.72, perpOffset: -118, scale: 0.125, turretBias: 16 },
  { axisIdx: 1, sStart: 0.0, sEnd: 0.72, perpOffset: 118, scale: 0.125, turretBias: 0 },
  // Cánh vòng sâu phía bắc (Axis 0)
  { axisIdx: 0, sStart: 0.10, sEnd: 0.93, perpOffset: 0, scale: 0.146, turretBias: 20 },
  { axisIdx: 0, sStart: 0.04, sEnd: 0.81, perpOffset: 58, scale: 0.128, turretBias: 18 },
  { axisIdx: 0, sStart: 0.02, sEnd: 0.75, perpOffset: -52, scale: 0.125, turretBias: 24 },
  // Cánh kẹp sườn trong (Axis 2)
  { axisIdx: 2, sStart: 0.08, sEnd: 0.93, perpOffset: 0, scale: 0.146, turretBias: 6 },
  { axisIdx: 2, sStart: 0.03, sEnd: 0.80, perpOffset: 58, scale: 0.128, turretBias: -4 },
  // Mũi phía nam Kuwait (Axis 3)
  { axisIdx: 3, sStart: 0.08, sEnd: 0.90, perpOffset: -36, scale: 0.13, turretBias: -8 },
  { axisIdx: 3, sStart: 0.06, sEnd: 0.86, perpOffset: 38, scale: 0.13, turretBias: 6 },
];

const FRIENDLY_BADGES = [
  { axisIdx: 0, sStart: 0.02, sEnd: 0.44, perpOffset: -8, scale: 0.92 },
  { axisIdx: 1, sStart: 0.02, sEnd: 0.56, perpOffset: 0, scale: 1.04 },
  { axisIdx: 1, sStart: 0.0, sEnd: 0.42, perpOffset: 88, scale: 0.88 },
  { axisIdx: 2, sStart: 0.02, sEnd: 0.58, perpOffset: -6, scale: 0.94 },
  { axisIdx: 3, sStart: 0.02, sEnd: 0.55, perpOffset: 0, scale: 0.88 },
];

// Các cụm phòng ngự thiết giáp đối phương (Iraq) ở nam Iraq & Kuwait
type HostilePocket = {
  x: number;
  y: number;
  scale: number;
  shieldTarget: Pt;
  fireAt: number;
  killAt: number;
  fromTankIdx: number;
};

const HOSTILE_POCKETS: HostilePocket[] = [
  { x: 1645, y: 515, scale: 0.98, shieldTarget: [1525, 518], fireAt: 448.95, killAt: 450.85, fromTankIdx: 5 },
  { x: 1775, y: 595, scale: 1.06, shieldTarget: [1632, 600], fireAt: 449.15, killAt: 451.25, fromTankIdx: 0 },
  { x: 1755, y: 715, scale: 1.08, shieldTarget: [1675, 704], fireAt: 449.35, killAt: 451.62, fromTankIdx: 0 },
  { x: 1885, y: 745, scale: 0.96, shieldTarget: [1718, 762], fireAt: 449.55, killAt: 451.98, fromTankIdx: 8 },
  { x: 1825, y: 845, scale: 1.02, shieldTarget: [1748, 838], fireAt: 449.75, killAt: 452.32, fromTankIdx: 8 },
  { x: 1945, y: 920, scale: 0.94, shieldTarget: [1822, 882], fireAt: 449.95, killAt: 452.68, fromTankIdx: 11 },
  { x: 1715, y: 965, scale: 0.90, shieldTarget: [1695, 868], fireAt: 449.45, killAt: 451.80, fromTankIdx: 9 },
];

// Vòng cung khiên chắn bảo vệ phía trước mũi nhọn đội hình Abrams
const SHIELD_ARC_PTS: Pt[] = [
  [1445, 445],
  [1560, 525],
  [1655, 628],
  [1725, 748],
  [1775, 865],
  [1915, 905],
];
const SHIELD_ARC_PATH = smoothPath(SHIELD_ARC_PTS);

// Tính sẵn đường đồng mức 1 lần ở cấp module
const MAP_CONTOURS = contours('desert-storm-1991-kuwait', MAP_W, MAP_H, 11, 22, 540);

// Mảng cao điểm đồi cát sa mạc phía tây & vùng trũng tạo chiều sâu địa hình
const HIGHLAND_PATCHES = [
  smoothPath([[140, 820], [480, 760], [780, 920], [690, 1210], [310, 1260], [110, 1050]], true),
  smoothPath([[420, 390], [820, 350], [1040, 520], [890, 710], [520, 660]], true),
  smoothPath([[940, 1280], [1310, 1220], [1480, 1430], [1220, 1620], [880, 1520]], true),
];

const DEPRESSION_PATCHES = [
  smoothPath([[1240, 310], [1690, 380], [1980, 560], [1890, 670], [1540, 580], [1210, 440]], true),
  smoothPath([[1520, 1180], [1880, 1150], [2060, 1340], [1870, 1510], [1540, 1420]], true),
];

/** Kim la bàn hình học thuần vector (tuyệt đối không có <text>) */
const GeometricCompassRose: React.FC<{ x: number; y: number; scale?: number; rotDeg?: number }> = ({
  x,
  y,
  scale = 1,
  rotDeg = 0,
}) => {
  const ticks = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <circle r={118} fill="rgba(16,30,43,0.58)" stroke={PAL.cream} strokeWidth={2.2} opacity={0.85} />
      <circle r={98} fill="none" stroke={PAL.amber} strokeWidth={1.8} strokeDasharray="8 6" opacity={0.75} />
      <circle r={66} fill="none" stroke={PAL.cream} strokeWidth={1.5} opacity={0.5} />
      {ticks.map((degVal) => {
        const major = degVal % 90 === 0;
        const mid = degVal % 30 === 0;
        const rIn = major ? 84 : mid ? 92 : 102;
        return (
          <line
            key={degVal}
            x1={0}
            y1={-rIn}
            x2={0}
            y2={-114}
            stroke={major ? PAL.amberHot : PAL.cream}
            strokeWidth={major ? 2.8 : 1.3}
            opacity={major ? 0.95 : 0.55}
            transform={`rotate(${degVal})`}
          />
        );
      })}
      <g transform={`rotate(${rotDeg})`}>
        {[45, 135, 225, 315].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <polygon points="0,-68 11,0 0,-12" fill={PAL.cream} opacity={0.78} />
            <polygon points="0,-68 -11,0 0,-12" fill={PAL.mapSandDark} opacity={0.88} />
          </g>
        ))}
        {[90, 180, 270].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <polygon points="0,-92 15,0 0,-16" fill={PAL.cream} />
            <polygon points="0,-92 -15,0 0,-16" fill={PAL.hullDark} />
          </g>
        ))}
        {/* Mũi kim chỉ Bắc nhấn màu Hổ Phách */}
        <polygon points="0,-108 17,0 0,-18" fill={PAL.amberHot} stroke={PAL.ink} strokeWidth={1.5} />
        <polygon points="0,-108 -17,0 0,-18" fill={PAL.amber} stroke={PAL.ink} strokeWidth={1.5} />
        <circle r={11} fill={PAL.ink} stroke={PAL.amberHot} strokeWidth={3} />
        <circle r={4} fill={PAL.cyan} />
      </g>
    </g>
  );
};

/** Huy hiệu Pentagon hình học 5 cạnh & vòng radar kiểm chứng chiến trường (436.50..444.5s, không chữ) */
const PentagonAuditSeal: React.FC<{ x: number; y: number; pIn: number; pFade: number; pulse: number }> = ({
  x,
  y,
  pIn,
  pFade,
  pulse,
}) => {
  const op = pIn * (1 - pFade * 0.85);
  if (op <= 0.01) return null;
  const outerPts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    return `${(Math.cos(a) * 84).toFixed(1)},${(Math.sin(a) * 84).toFixed(1)}`;
  }).join(' ');
  const innerPts = Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
    return `${(Math.cos(a) * 44).toFixed(1)},${(Math.sin(a) * 44).toFixed(1)}`;
  }).join(' ');

  return (
    <g transform={`translate(${x} ${y}) scale(${0.86 + 0.14 * pIn})`} opacity={op}>
      <circle r={120 + pulse * 260} fill="none" stroke={PAL.amberHot} strokeWidth={3} opacity={(1 - pulse) * 0.65} />
      <circle r={118} fill="rgba(18,22,31,0.18)" stroke={PAL.ink} strokeWidth={2.4} strokeDasharray="12 8" />
      <polygon points={outerPts} fill="rgba(27,94,158,0.28)" stroke={PAL.ink} strokeWidth={5} />
      <polygon points={outerPts} fill="none" stroke={PAL.amberHot} strokeWidth={2.5} />
      <polygon points={innerPts} fill="rgba(255,170,43,0.36)" stroke={PAL.cream} strokeWidth={3.2} />
      {Array.from({ length: 5 }, (_, i) => {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
        return (
          <line
            key={i}
            x1={Math.cos(a) * 44}
            y1={Math.sin(a) * 44}
            x2={Math.cos(a) * 84}
            y2={Math.sin(a) * 84}
            stroke={PAL.cream}
            strokeWidth={2.4}
          />
        );
      })}
      <circle r={7} fill={PAL.cyan} />
    </g>
  );
};

/** Khung ngàm khoá mục tiêu kiểm toán chiến dịch GAO (không chữ) */
const TacticalBracket: React.FC<{ x: number; y: number; r: number; color: string; opacity: number }> = ({
  x,
  y,
  r,
  color,
  opacity,
}) => {
  if (opacity <= 0.01) return null;
  const c = r * 0.38;
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity} stroke={color} strokeWidth={3.4} fill="none">
      <path d={`M ${-r} ${-r + c} L ${-r} ${-r} L ${-r + c} ${-r}`} />
      <path d={`M ${r - c} ${-r} L ${r} ${-r} L ${r} ${-r + c}`} />
      <path d={`M ${-r} ${r - c} L ${-r} ${r} L ${-r + c} ${r}`} />
      <path d={`M ${r - c} ${r} L ${r} ${r} L ${r} ${r - c}`} />
    </g>
  );
};

const C03S09: React.FC = () => {
  const t = useT();

  // ---------------- Chuyển động Camera 2D theo 4 nhịp voice ----------------
  // Khi lia sang Tây ở 442.48s (Left Hook), camX tới 1075 để la bàn bên phải thoát hẳn khỏi mép khung (không bị cắt đôi);
  // Khi thu về trận quyết chiến ở 449.06s, la bàn nằm trọn bên trong vùng biển Vịnh Ba Tư.
  const pPanWest = prog(t, CUE.c03_s09_desert_storm - 0.2, 444.85);
  const pSweepHook = prog(t, CUE.c03_s09_1800_abrams, 448.85);
  const pBattleFocus = prog(t, CUE.c03_s09_zero_destroyed - 0.15, 452.4);

  const camX1 = lerp(1530, 1070, pPanWest);
  const camY1 = lerp(885, 860, pPanWest);
  const camZ1 = lerp(0.84, 1.05, pPanWest);
  const camR1 = lerp(0, -1.6, pPanWest);

  const camX2 = lerp(camX1, 1365, pSweepHook);
  const camY2 = lerp(camY1, 755, pSweepHook);
  const camZ2 = lerp(camZ1, 1.09, pSweepHook);
  const camR2 = lerp(camR1, 0.6, pSweepHook);

  const camX = lerp(camX2, 1610, pBattleFocus);
  const camY = lerp(camY2, 740, pBattleFocus);
  const camZoom = lerp(camZ2, 1.12, pBattleFocus);
  const camRot = lerp(camR2, 0.15, pBattleFocus);

  const shakeAmp = 2.5 + 3.0 * bump(t, CUE.c03_s09_1800_abrams, 1.4) + 2.8 * bump(t, 450.2, 2.2);
  const shake = handheld(t, shakeAmp, 'c03s09-cam');

  // Tiến độ các sự kiện chiến thuật (mở cảnh đã đầy đủ ngay từ giây đầu)
  const pPentagon = prog(t, 436.4, CUE.c03_s09_pentagon + 0.35);
  const pScanLinks = prog(t, 438.4, CUE.c03_s09_gao_report + 0.4);
  const pLeftHookPreview = prog(t, CUE.c03_s09_desert_storm - 0.1, 444.7);
  const pShield = prog(t, CUE.c03_s09_zero_destroyed - 0.35, CUE.c03_s09_zero_destroyed + 0.45);
  const pCrewSafeGlow = prog(t, CUE.c03_s09_zero_crew_died - 0.2, CUE.c03_s09_zero_crew_died + 0.85);
  const auditPulse = Math.max(0, ((t - 436.5) * 0.6) % 1);

  const fullAxisPaths = useMemo(
    () => ATTACK_AXES.map((ax) => arcPath(ax.x0, ax.y0, ax.x1, ax.y1, ax.apex, 1, 72)),
    [],
  );

  // Tính vị trí tức thời của từng chiếc AbramsTop2D theo tiến độ hành quân
  const tankStates = ABRAMS_SPEARHEAD.map((unit, idx) => {
    const ax = ATTACK_AXES[unit.axisIdx];
    const pMove = prog(t, CUE.c03_s09_1800_abrams + ax.delay * 0.7, 448.8 + ax.delay * 0.35);
    const s = lerp(unit.sStart, unit.sEnd, pMove);
    const [bx, by] = arcAt(ax.x0, ax.y0, ax.x1, ax.y1, ax.apex, s);
    const heading = arcAngle(ax.x0, ax.y0, ax.x1, ax.y1, ax.apex, s);
    const normalRad = ((heading + 90) * Math.PI) / 180;
    const x = bx + Math.cos(normalRad) * unit.perpOffset;
    const y = by + Math.sin(normalRad) * unit.perpOffset;
    return { x, y, heading, scale: unit.scale, turretBias: unit.turretBias, pMove, idx };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: PAL.mapSandDark }}>
      {/* Đặt <Defs2D /> NGOÀI <Cam2D> */}
      <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(18,22,31,0.36)" />
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} rot={camRot} shake={shake} bg={PAL.mapSand}>
        <svg
          width={MAP_W}
          height={MAP_H}
          viewBox={`0 0 ${MAP_W} ${MAP_H}`}
          style={{ overflow: 'visible', display: 'block' }}
        >
          {/* ==================== 1. NỀN ĐỊA HÌNH CÁT SA MẠC & ĐƯỜNG ĐỒNG MỨC ==================== */}
          <rect x={-300} y={-300} width={MAP_W + 600} height={MAP_H + 600} fill={PAL.mapSand} />

          {/* Các mảng đồi cát cao & lòng chảo sa mạc tạo chiều sâu 3 tông */}
          {HIGHLAND_PATCHES.map((d, i) => (
            <path key={`hi_${i}`} d={d} fill={PAL.mapSandLight} opacity={0.52} />
          ))}
          {DEPRESSION_PATCHES.map((d, i) => (
            <path key={`lo_${i}`} d={d} fill={PAL.mapSandDark} opacity={0.46} />
          ))}

          {/* Các lớp đường đồng mức marching-squares */}
          <g>
            {MAP_CONTOURS.map((c) => {
              const isIndex = c.level % 3 === 0;
              return (
                <path
                  key={c.level}
                  d={c.d}
                  fill="none"
                  stroke={PAL.mapContour}
                  strokeWidth={isIndex ? 2.6 : 1.35}
                  opacity={isIndex ? 0.56 : 0.31}
                />
              );
            })}
          </g>

          {/* Vách đá cạn (escarpment ticks) & thung lũng khô Wadi al-Batin + mạng sông Euphrates - Tigris */}
          <path
            d={WADI_BATIN_PATH}
            fill="none"
            stroke={PAL.mapSandDark}
            strokeWidth={24}
            strokeLinecap="round"
            opacity={0.58}
          />
          <path
            d={WADI_BATIN_PATH}
            fill="none"
            stroke={PAL.mapContour}
            strokeWidth={2.4}
            strokeDasharray="10 8"
            opacity={0.56}
          />
          <path d={EUPHRATES_PATH} fill="none" stroke="#304c61" strokeWidth={14} strokeLinecap="round" opacity={0.45} />
          <path d={EUPHRATES_PATH} fill="none" stroke="#1b3448" strokeWidth={6} strokeLinecap="round" opacity={0.78} />
          <path d={TIGRIS_BRANCH_PATH} fill="none" stroke="#1b3448" strokeWidth={4.5} strokeLinecap="round" opacity={0.7} />

          {/* ==================== 2. VÙNG BIỂN VỊNH BA TƯ SẪM MÀU PHÍA ĐÔNG ==================== */}
          <path d={GULF_WATER_PATH} fill="#253f54" />
          <path d={GULF_SHOAL_1_PATH} fill="#1b3042" />
          <path d={GULF_SHOAL_2_PATH} fill="#122230" />
          {/* Đảo Bubiyan & Failaka ở cửa vịnh Kuwait */}
          <path
            d={smoothPath([[1988, 706], [2036, 704], [2044, 756], [1996, 762]], true)}
            fill={PAL.mapSandDark}
            stroke={PAL.mapContour}
            strokeWidth={2}
          />
          <ellipse cx={2048} cy={818} rx={16} ry={8} fill={PAL.mapSandDark} stroke={PAL.mapContour} strokeWidth={1.6} />
          <path d={smoothPath(GULF_COAST_PTS)} fill="none" stroke={PAL.ink} strokeWidth={3.2} opacity={0.84} />
          <path
            d={smoothPath(GULF_SHOAL_1_PTS)}
            fill="none"
            stroke={PAL.cyanSoft}
            strokeWidth={1.3}
            strokeDasharray="12 10"
            opacity={0.26}
          />

          {/* ==================== 3. LƯỚI KINH VĨ ĐỘ MỜ & RANH GIỚI CHIẾN THUẬT ==================== */}
          <g>
            {Array.from({ length: 13 }, (_, i) => {
              const gx = 160 + i * 220;
              return (
                <line
                  key={`gx_${gx}`}
                  x1={gx}
                  y1={0}
                  x2={gx}
                  y2={MAP_H}
                  stroke={gx > 2040 ? PAL.cyanSoft : PAL.mapContour}
                  strokeWidth={1.2}
                  opacity={gx > 2040 ? 0.15 : 0.24}
                />
              );
            })}
            {Array.from({ length: 9 }, (_, j) => {
              const gy = 120 + j * 220;
              return (
                <line
                  key={`gy_${gy}`}
                  x1={0}
                  y1={gy}
                  x2={MAP_W}
                  y2={gy}
                  stroke={PAL.mapContour}
                  strokeWidth={1.2}
                  opacity={0.24}
                />
              );
            })}
            {Array.from({ length: 6 }, (_, i) =>
              Array.from({ length: 4 }, (_, j) => {
                const cx = 380 + i * 440;
                const cy = 340 + j * 440;
                return (
                  <g key={`cr_${i}_${j}`} stroke={PAL.ink} strokeWidth={1.8} opacity={0.36}>
                    <line x1={cx - 9} y1={cy} x2={cx + 9} y2={cy} />
                    <line x1={cx} y1={cy - 9} x2={cx} y2={cy + 9} />
                  </g>
                );
              }),
            )}
          </g>

          {/* Ranh giới quốc gia nét đứt chiến thuật (Kuwait – Iraq – Ả Rập Xê Út) */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d={BORDER_IRAQ_SAUDI} stroke={PAL.mapContour} strokeWidth={9} opacity={0.28} />
            <path d={BORDER_KUWAIT_SAUDI} stroke={PAL.mapContour} strokeWidth={9} opacity={0.28} />
            <path d={BORDER_KUWAIT_IRAQ} stroke={PAL.mapContour} strokeWidth={9} opacity={0.28} />

            <path d={BORDER_IRAQ_SAUDI} stroke={PAL.ink} strokeWidth={3.5} strokeDasharray="18 10 5 10" opacity={0.88} />
            <path d={BORDER_NEUTRAL_ZONE} stroke={PAL.ink} strokeWidth={2.5} strokeDasharray="10 8" opacity={0.65} />
            <path d={BORDER_KUWAIT_SAUDI} stroke={PAL.ink} strokeWidth={3.5} strokeDasharray="18 10 5 10" opacity={0.88} />
            <path d={BORDER_KUWAIT_IRAQ} stroke={PAL.ink} strokeWidth={3.5} strokeDasharray="18 10 5 10" opacity={0.88} />
          </g>

          {/* Kim la bàn hình học đặt gọn trên Vịnh Ba Tư (x=2355: nằm trọn trong khung rộng & thoát hẳn khi lia Tây) */}
          <GeometricCompassRose x={2355} y={445} scale={0.9} rotDeg={0} />
          <g transform="translate(2195 1145)" opacity={0.78}>
            <rect x={0} y={0} width={100} height={9} fill={PAL.ink} stroke={PAL.cream} strokeWidth={1.5} />
            <rect x={100} y={0} width={100} height={9} fill={PAL.cream} stroke={PAL.ink} strokeWidth={1.5} />
            <line x1={0} y1={-7} x2={0} y2={16} stroke={PAL.cream} strokeWidth={2.2} />
            <line x1={100} y1={-5} x2={100} y2={14} stroke={PAL.cream} strokeWidth={2} />
            <line x1={200} y1={-7} x2={200} y2={16} stroke={PAL.cream} strokeWidth={2.2} />
          </g>

          {/* ==================== 4. MỞ CẢNH: BỐ CỤC TỔNG THỂ PENTAGON & BÁO CÁO GAO ==================== */}
          {/* Tuyến công sự & bãi mìn phòng ngự cố định của Iraq dọc biên giới phía nam Kuwait */}
          <g opacity={0.88 - 0.45 * prog(t, 450.6, 453.2)}>
            <path
              d={smoothPath(SADDAM_LINE_PTS)}
              fill="none"
              stroke={PAL.crimsonDeep}
              strokeWidth={10}
              opacity={0.28}
            />
            <path
              d={smoothPath(SADDAM_LINE_PTS)}
              fill="none"
              stroke={PAL.crimson}
              strokeWidth={3.5}
              strokeDasharray="14 9"
            />
            {SADDAM_LINE_PTS.map(([sx, sy], i) => (
              <polygon
                key={i}
                points={`${sx},${sy + 14} ${sx - 10},${sy - 6} ${sx + 10},${sy - 6}`}
                fill={PAL.crimsonDeep}
                stroke={PAL.ink}
                strokeWidth={1.8}
              />
            ))}
          </g>

          {/* Huy hiệu Pentagon & đường gióng kiểm toán chiến dịch GAO (436.50..444.8s) */}
          {t < 445.2 && (
            <g>
              <PentagonAuditSeal
                x={1245}
                y={640}
                pIn={pPentagon}
                pFade={prog(t, CUE.c03_s09_desert_storm, 444.6)}
                pulse={auditPulse}
              />
              {pScanLinks > 0.01 && (
                <g opacity={pScanLinks * (1 - prog(t, 444.2, 445.1))}>
                  {[
                    [875, 1095],
                    [1140, 1185],
                    [1790, 1215],
                    [1755, 715],
                    [1645, 515],
                  ].map(([tx, ty], bi) => (
                    <g key={bi}>
                      <line
                        x1={1245}
                        y1={640}
                        x2={tx}
                        y2={ty}
                        stroke={bi >= 3 ? PAL.crimson : PAL.amberHot}
                        strokeWidth={2.4}
                        strokeDasharray="9 7"
                        opacity={0.62}
                      />
                      <TacticalBracket
                        x={tx}
                        y={ty}
                        r={64}
                        color={bi >= 3 ? PAL.crimson : PAL.amberHot}
                        opacity={0.9}
                      />
                    </g>
                  ))}
                </g>
              )}
            </g>
          )}

          {/* Đường dự kiến hành lang vu hồi "Left Hook" hiện lên lúc 442.48s (Operation Desert Storm) */}
          {pLeftHookPreview > 0.01 && (
            <g opacity={0.68 * pLeftHookPreview * (1 - 0.35 * pBattleFocus)}>
              {fullAxisPaths.map((d, idx) => (
                <path
                  key={`prev_${idx}`}
                  d={d}
                  fill="none"
                  stroke={PAL.ink}
                  strokeWidth={2.8}
                  strokeDasharray="14 10"
                />
              ))}
              {[
                [[680, 740], [1080, 960], [1340, 1080]],
                [[960, 540], [1320, 790], [1540, 960]],
                [[1290, 430], [1545, 680], [1695, 890]],
              ].map((pts, pi) => (
                <path
                  key={`pl_${pi}`}
                  d={smoothPath(pts as Pt[])}
                  fill="none"
                  stroke="#1b5e9e"
                  strokeWidth={2.5}
                  strokeDasharray="16 10"
                  opacity={0.58}
                />
              ))}
            </g>
          )}

          {/* ==================== 5. MŨI TÊN TIẾN CÔNG GỌNG KÌM ABRAMS (445.00s+) ==================== */}
          {/* Nét kép: Halo mờ bản rộng + vỏ mực đậm + lõi sáng (không dùng filter="url(#glow)") */}
          {ATTACK_AXES.map((ax, idx) => {
            const pArrow = prog(t, CUE.c03_s09_1800_abrams + ax.delay * 0.65, 448.45 + ax.delay * 0.3);
            if (pArrow <= 0.005) return null;
            const tip = arcAt(ax.x0, ax.y0, ax.x1, ax.y1, ax.apex, pArrow);
            const tipAng = arcAngle(ax.x0, ax.y0, ax.x1, ax.y1, ax.apex, pArrow);
            const hw = ax.width * 2.15;
            return (
              <g key={`axis_${idx}`}>
                <path
                  d={fullAxisPaths[idx]}
                  fill="none"
                  stroke={PAL.amber}
                  strokeWidth={ax.width * 2.7}
                  strokeLinecap="round"
                  opacity={0.3}
                  {...drawOn(ax.len, pArrow)}
                />
                <path
                  d={fullAxisPaths[idx]}
                  fill="none"
                  stroke="#164678"
                  strokeWidth={ax.width + 5}
                  strokeLinecap="round"
                  opacity={0.94}
                  {...drawOn(ax.len, pArrow)}
                />
                <path
                  d={fullAxisPaths[idx]}
                  fill="none"
                  stroke={PAL.amberHot}
                  strokeWidth={ax.width * 0.62}
                  strokeLinecap="round"
                  {...drawOn(ax.len, pArrow)}
                />
                <g transform={`translate(${tip[0]} ${tip[1]}) rotate(${tipAng})`}>
                  <polygon
                    points={`${hw * 1.35},0 ${-hw * 0.75},${-hw * 0.95} ${-hw * 0.3},0 ${-hw * 0.75},${hw * 0.95}`}
                    fill={PAL.amber}
                    opacity={0.34}
                    transform="scale(1.32)"
                  />
                  <polygon
                    points={`${hw * 1.2},0 ${-hw * 0.65},${-hw * 0.85} ${-hw * 0.22},0 ${-hw * 0.65},${hw * 0.85}`}
                    fill={PAL.amberHot}
                    stroke="#164678"
                    strokeWidth={3.5}
                    strokeLinejoin="round"
                  />
                </g>
              </g>
            );
          })}

          {/* ==================== 6. CỤM PHÒNG THỦ ĐỐI PHƯƠNG (IRAQ) & NỔ TIÊU DIỆT ==================== */}
          {HOSTILE_POCKETS.map((hp, hi) => {
            const pDead = prog(t, hp.killAt, hp.killAt + 0.5);
            const aliveOp = lerp(1, 0.22, pDead);
            return (
              <g key={`hostile_${hi}`}>
                <g opacity={aliveOp}>
                  <path
                    d={`M ${hp.x - 46} ${hp.y - 42} Q ${hp.x - 74} ${hp.y} ${hp.x - 46} ${hp.y + 42}`}
                    fill="none"
                    stroke={PAL.crimsonDeep}
                    strokeWidth={4.5}
                    strokeDasharray="10 6"
                  />
                  {[-32, 28].map((dy, di) => (
                    <g
                      key={di}
                      transform={`translate(${hp.x + (di === 0 ? 44 : 48)} ${hp.y + dy}) rotate(185) scale(0.75)`}
                    >
                      <rect
                        x={-26}
                        y={-14}
                        width={52}
                        height={28}
                        rx={4}
                        fill={PAL.enemyMid}
                        stroke={PAL.ink}
                        strokeWidth={3}
                      />
                      <circle cx={2} cy={0} r={11} fill={PAL.enemyLight} stroke={PAL.ink} strokeWidth={2.5} />
                      <line x1={12} y1={0} x2={42} y2={0} stroke={PAL.ink} strokeWidth={4} strokeLinecap="round" />
                    </g>
                  ))}
                  <g filter="url(#sh)">
                    <NatoUnitBadge2D x={hp.x} y={hp.y} side="hostile" scale={hp.scale} />
                  </g>
                </g>

                {pDead > 0.05 && (
                  <g opacity={pDead * 0.78} stroke={PAL.ink} strokeWidth={5.2} strokeLinecap="round">
                    <line x1={hp.x - 32} y1={hp.y - 32} x2={hp.x + 32} y2={hp.y + 32} />
                    <line x1={hp.x + 32} y1={hp.y - 32} x2={hp.x - 32} y2={hp.y + 32} />
                  </g>
                )}

                {/* <Blast2D> gọn mạnh để không tạo đám mây xám quá lớn che khuất bờ biển cuối cảnh */}
                <Blast2D t={t} at={hp.killAt} x={hp.x} y={hp.y + 10} size={44} seed={30 + hi * 7} life={2.6} />
              </g>
            );
          })}

          {/* ==================== 7. VÒNG KHIÊN BẢO VỆ & HOẢ LỰC ĐỎ BẬT NẢY VỠ VỤN (449.06s+) ==================== */}
          {pShield > 0.01 && (
            <g opacity={pShield}>
              <path
                d={SHIELD_ARC_PATH}
                fill="none"
                stroke={PAL.cyan}
                strokeWidth={32}
                strokeLinecap="round"
                opacity={0.26 + 0.14 * Math.sin((t - 449) * 5)}
              />
              <path
                d={SHIELD_ARC_PATH}
                fill="none"
                stroke={PAL.amber}
                strokeWidth={15}
                strokeLinecap="round"
                opacity={0.5}
              />
              <path
                d={SHIELD_ARC_PATH}
                fill="none"
                stroke={PAL.amberHot}
                strokeWidth={6.2}
                strokeLinecap="round"
              />
              <path
                d={SHIELD_ARC_PATH}
                fill="none"
                stroke={PAL.cyanSoft}
                strokeWidth={2.8}
                strokeDasharray="16 10"
                strokeLinecap="round"
              />
            </g>
          )}

          {/* Các loạt tia hoả lực đỏ từ cụm NatoUnitBadge2D side="hostile" bật nảy vỡ vụn khỏi mặt khiên */}
          {HOSTILE_POCKETS.map((hp, hi) => {
            const waves = [0, 0.62, 1.24];
            return waves.map((wDelay, wi) => {
              const shotStart = hp.fireAt + wDelay;
              if (shotStart + 0.1 > hp.killAt) return null;
              const flightDur = 0.36;
              const dt = t - shotStart;
              if (dt < 0 || dt > 1.35) return null;

              const sx = hp.x - 34;
              const sy = hp.y;
              const [ix, iy] = hp.shieldTarget;

              if (dt <= flightDur) {
                const p = dt / flightDur;
                const headX = lerp(sx, ix, p);
                const headY = lerp(sy, iy, p);
                const tailP = Math.max(0, p - 0.52);
                const tailX = lerp(sx, ix, tailP);
                const tailY = lerp(sy, iy, tailP);
                return (
                  <g key={`red_${hi}_${wi}`}>
                    <line
                      x1={tailX}
                      y1={tailY}
                      x2={headX}
                      y2={headY}
                      stroke={PAL.crimson}
                      strokeWidth={15}
                      strokeLinecap="round"
                      opacity={0.42}
                    />
                    <line
                      x1={tailX}
                      y1={tailY}
                      x2={headX}
                      y2={headY}
                      stroke={PAL.crimson}
                      strokeWidth={7}
                      strokeLinecap="round"
                    />
                    <line
                      x1={tailX}
                      y1={tailY}
                      x2={headX}
                      y2={headY}
                      stroke="#ffe0e0"
                      strokeWidth={3.2}
                      strokeLinecap="round"
                    />
                  </g>
                );
              }

              // Chạm khiên: loé vòng chắn cyan-vàng & bật nảy vỡ vụn thành 8 mảnh tia lửa đỏ bay ngược lại
              const rdt = dt - flightDur;
              const fade = Math.max(0, 1 - rdt / 0.95);
              return (
                <g key={`rico_${hi}_${wi}`} opacity={fade}>
                  <circle
                    cx={ix}
                    cy={iy}
                    r={14 + rdt * 74}
                    fill="none"
                    stroke={PAL.cyanSoft}
                    strokeWidth={4 * fade}
                  />
                  <circle cx={ix} cy={iy} r={13 * fade} fill={PAL.amberHot} />
                  {Array.from({ length: 8 }, (_, si) => {
                    const seed = hi * 31 + wi * 13 + si;
                    const bounceAng = ((rnd(seed) - 0.5) * 145 * Math.PI) / 180;
                    const speed = 140 + rnd(seed + 5) * 210;
                    const fx = ix + Math.cos(bounceAng) * speed * rdt;
                    const fy = iy + Math.sin(bounceAng) * speed * rdt;
                    const fxTail = ix + Math.cos(bounceAng) * speed * Math.max(0, rdt - 0.16);
                    const fyTail = iy + Math.sin(bounceAng) * speed * Math.max(0, rdt - 0.16);
                    return (
                      <g key={si}>
                        <line
                          x1={fxTail}
                          y1={fyTail}
                          x2={fx}
                          y2={fy}
                          stroke={PAL.crimson}
                          strokeWidth={4.2}
                          strokeLinecap="round"
                        />
                        <rect
                          x={fx - 4}
                          y={fy - 4}
                          width={8}
                          height={8}
                          fill="#ffbaba"
                          stroke={PAL.crimson}
                          strokeWidth={1.5}
                          transform={`rotate(${rdt * 520 + si * 45} ${fx} ${fy})`}
                        />
                      </g>
                    );
                  })}
                </g>
              );
            });
          })}

          {/* Tia phản kích động năng vàng-trắng từ mũi Abrams tiêu diệt các ổ đề kháng đối phương */}
          {HOSTILE_POCKETS.map((hp, hi) => {
            const fireStart = hp.killAt - 0.24;
            const dt = t - fireStart;
            const shooter = tankStates[hp.fromTankIdx] ?? tankStates[0];
            const ang = (Math.atan2(hp.y - shooter.y, hp.x - shooter.x) * 180) / Math.PI;
            return (
              <g key={`counter_${hi}`}>
                <Muzzle2D
                  t={t}
                  at={fireStart}
                  x={shooter.x + Math.cos((ang * Math.PI) / 180) * 52}
                  y={shooter.y + Math.sin((ang * Math.PI) / 180) * 52}
                  angle={ang}
                  size={25}
                  seed={70 + hi}
                />
                {dt >= 0 && dt <= 0.34 && (
                  <g opacity={dt < 0.24 ? 1 : 1 - (dt - 0.24) / 0.1}>
                    <line
                      x1={shooter.x}
                      y1={shooter.y}
                      x2={lerp(shooter.x, hp.x, Math.min(1, dt / 0.22))}
                      y2={lerp(shooter.y, hp.y, Math.min(1, dt / 0.22))}
                      stroke={PAL.amber}
                      strokeWidth={10}
                      strokeLinecap="round"
                      opacity={0.36}
                    />
                    <line
                      x1={shooter.x}
                      y1={shooter.y}
                      x2={lerp(shooter.x, hp.x, Math.min(1, dt / 0.22))}
                      y2={lerp(shooter.y, hp.y, Math.min(1, dt / 0.22))}
                      stroke={PAL.amberHot}
                      strokeWidth={3.8}
                      strokeLinecap="round"
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* ==================== 8. ĐỘI HÌNH 1,800+ ABRAMS & KÝ HIỆU ĐƠN VỊ NATO (100% SÁNG RỰC) ==================== */}
          {tankStates.map((st) => {
            if (st.pMove <= 0.02 || st.pMove >= 0.99) return null;
            const backRad = ((st.heading + 180) * Math.PI) / 180;
            return (
              <Puff2D
                key={`dust_${st.idx}`}
                x={st.x + Math.cos(backRad) * 62}
                y={st.y + Math.sin(backRad) * 62}
                r={22}
                color={PAL.mapSandLight}
                opacity={0.46}
                seed={100 + st.idx}
              />
            );
          })}

          {tankStates.map((st) => (
            <g key={`tank_${st.idx}`} transform={`translate(${st.x} ${st.y}) rotate(${st.heading})`}>
              {pShield > 0.05 && (
                <>
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={76 * (st.scale / 0.14)}
                    ry={42 * (st.scale / 0.14)}
                    fill={PAL.amberHot}
                    opacity={0.2 + 0.16 * pCrewSafeGlow}
                  />
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={82 * (st.scale / 0.14)}
                    ry={47 * (st.scale / 0.14)}
                    fill="none"
                    stroke={pCrewSafeGlow > 0.1 ? PAL.cyanSoft : PAL.amberHot}
                    strokeWidth={2.8}
                    opacity={0.6 + 0.35 * pCrewSafeGlow}
                  />
                </>
              )}
              <g filter="url(#sh)">
                <AbramsTop2D x={0} y={0} scale={st.scale} turretDeg={st.turretBias} camo="desert" />
              </g>
            </g>
          ))}

          {FRIENDLY_BADGES.map((fb, fi) => {
            const ax = ATTACK_AXES[fb.axisIdx];
            const pMove = prog(t, CUE.c03_s09_1800_abrams + ax.delay * 0.7, 448.8 + ax.delay * 0.35);
            const s = lerp(fb.sStart, fb.sEnd, pMove);
            const [bx, by] = arcAt(ax.x0, ax.y0, ax.x1, ax.y1, ax.apex, s);
            const heading = arcAngle(ax.x0, ax.y0, ax.x1, ax.y1, ax.apex, s);
            const normalRad = ((heading + 90) * Math.PI) / 180;
            const x = bx + Math.cos(normalRad) * fb.perpOffset;
            const y = by + Math.sin(normalRad) * fb.perpOffset;
            return (
              <g key={`fbadge_${fi}`}>
                {pCrewSafeGlow > 0.05 && (
                  <rect
                    x={x - 56 * fb.scale}
                    y={y - 40 * fb.scale}
                    width={112 * fb.scale}
                    height={80 * fb.scale}
                    rx={12}
                    fill="none"
                    stroke={PAL.amberHot}
                    strokeWidth={3.2}
                    opacity={0.78 * pCrewSafeGlow}
                  />
                )}
                <g filter="url(#sh)">
                  <NatoUnitBadge2D x={x} y={y} side="friendly" scale={fb.scale} />
                </g>
              </g>
            );
          })}
        </svg>
      </Cam2D>

      {/* Khung ngàm góc bản đồ cố định trên màn hình (thuần hình học, không chữ) */}
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      >
        <g stroke={PAL.ink} strokeWidth={3} fill="none" opacity={0.45}>
          <path d="M 48 96 L 48 48 L 96 48" />
          <path d="M 1824 48 L 1872 48 L 1872 96" />
          <path d="M 48 984 L 48 1032 L 96 1032" />
          <path d="M 1824 1032 L 1872 1032 L 1872 984" />
        </g>
      </svg>

      {/* Lớp hạt giấy phủ cuối cảnh */}
      <Grain opacity={0.48} />

      {/* Nhãn <Label> đặt tại góc trên bên trái thoáng sạch 100%, không đè lên xe tăng hay ký hiệu đơn vị */}
      <Label
        t={t}
        text="DESERT STORM 1991"
        x={385}
        y={116}
        from={CUE.c03_s09_desert_storm}
        until={444.8}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="1,800+ ABRAMS"
        x={345}
        y={116}
        from={CUE.c03_s09_1800_abrams}
        until={448.7}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="0 DESTROYED"
        x={345}
        y={116}
        from={CUE.c03_s09_zero_destroyed}
        until={454.0}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C03S09;
