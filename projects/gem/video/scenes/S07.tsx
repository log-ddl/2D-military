// S07 (128.30 – 147.55s, thuần 2D): Mặt cắt ngang vật lý Radar Doppler, cổng lọc nhiễu chim/bụi cát & Shahed bay ẩn dưới chân trời radar.
import React from 'react';
import { Easing } from 'remotion';
import { prog, lerp } from '@kit/theme';
import { useT, handheld } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { skyline } from '@lib/2d/terrain';
import { smoothPath, type Pt } from '@lib/2d/path';
import { Puff2D } from '@lib/2d/fx';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { TacticalGrid2D, Shahed2D } from '../local/draw2d';

// Tâm phát sóng của đài radar cảnh giới truyền thống đặt trên đồi bên trái
const RADAR_X = 250;
const RADAR_Y = 664;

// Đỉnh gờ đồi đá bazan che khuất sóng radar (Terrain Masking Ridge)
const RIDGE_X = 900;
const RIDGE_Y = 621;

// Hệ số góc đường chân trời radar (tiếp tuyến từ tâm radar qua đỉnh gờ đồi, hướng chéo lên khi sang phải)
const HORIZON_SLOPE = (RIDGE_Y - RADAR_Y) / (RIDGE_X - RADAR_X); // -43 / 650 ≈ -0.06615
const horizonY = (x: number) => RADAR_Y + HORIZON_SLOPE * (x - RADAR_X);

/** Hàm độ cao mặt cắt địa hình chính sa mạc Rukban (y càng lớn càng thấp trong SVG). */
const desertGroundY = (x: number): number => {
  // Đồi đặt đài radar bên trái quanh x = 230
  const radarHill = -36 * Math.exp(-(((x - 220) / 145) ** 2));
  // Thung lũng nông trước gờ đồi (x = 450..740) nơi có chim trời & bụi cát
  const foreValley = 18 * Math.exp(-(((x - 580) / 170) ** 2));
  // Gờ đồi chắn sóng nhô cao tại x = 900 -> mặt đất chạm đúng y ≈ 622
  const maskingRidge = -194 * Math.exp(-(((x - 900) / 155) ** 2));
  // Triền sa mạc Rukban thấp thoải bên phải gờ đồi (x > 1050) với đụn cát gợn nhẹ
  const eastBasin = x > 900 ? 22 * (1 - Math.exp(-(((x - 900) / 280) ** 2))) : 0;
  const dunes =
    Math.sin(x * 0.0085 + 0.6) * 7.5 +
    Math.cos(x * 0.019 - 1.1) * 4.2;
  return 808 + radarHill + foreValley + maskingRidge + eastBasin + dunes;
};

// Dữ liệu địa hình tính sẵn một lần ở cấp module
const BG_SKYLINE_FAR = skyline('gem-s07-far', -500, 3100, 690, 145, 760, 1500);
const BG_SKYLINE_MID = skyline('gem-s07-mid', -500, 3100, 745, 110, 540, 1500);

const FORE_SURFACE_PTS: Pt[] = (() => {
  const pts: Pt[] = [];
  for (let x = -480; x <= 3000; x += 24) {
    pts.push([x, desertGroundY(x)]);
  }
  return pts;
})();

const FORE_SUBSOIL_PTS: Pt[] = FORE_SURFACE_PTS.map(([x, y]) => [
  x,
  y + 26 + 6 * Math.sin(x * 0.012),
]);

const FORE_BEDROCK_PTS: Pt[] = FORE_SURFACE_PTS.map(([x, y]) => [
  x,
  y + 74 + 10 * Math.cos(x * 0.009 + 1.2),
]);

const FORE_GROUND_FILL = `${smoothPath(FORE_SURFACE_PTS)} L3000 1500 L-480 1500 Z`;
const FORE_SUBSOIL_FILL = `${smoothPath(FORE_SUBSOIL_PTS)} L3000 1500 L-480 1500 Z`;
const FORE_BEDROCK_FILL = `${smoothPath(FORE_BEDROCK_PTS)} L3000 1500 L-480 1500 Z`;
const FORE_CREST_LINE = smoothPath(FORE_SURFACE_PTS);

// Vùng bóng khuất sóng bên dưới đường chân trời radar (từ đỉnh gờ đồi sang hết bên phải)
const SHADOW_ZONE_FILL = (() => {
  const rightX = 3000;
  const subPts = FORE_SURFACE_PTS.filter(([x]) => x >= RIDGE_X);
  const groundSeg = subPts.map(([x, y]) => `L${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  return `M${RIDGE_X} ${RIDGE_Y.toFixed(1)} L${rightX} ${horizonY(rightX).toFixed(1)} L${rightX} ${desertGroundY(rightX).toFixed(1)} ${groundSeg} Z`;
})();

// Quạt sóng chính của đài radar: từ tia cao (-36 độ) xuống đúng tia tiếp tuyến đỉnh đồi
const BEAM_FAR_X = 2960;
const BEAM_UPPER_SLOPE = -0.54;
const beamUpperY = (x: number) => RADAR_Y + BEAM_UPPER_SLOPE * (x - RADAR_X);
const MAIN_BEAM_POLY = `M${RADAR_X} ${RADAR_Y} L${BEAM_FAR_X} ${beamUpperY(BEAM_FAR_X).toFixed(1)} L${BEAM_FAR_X} ${horizonY(BEAM_FAR_X).toFixed(1)} L${RIDGE_X} ${RIDGE_Y} Z`;

// Ngôi sao nền trời đêm rạng sáng (tất định)
const STARS = Array.from({ length: 48 }, (_, i) => {
  const sx = -240 + ((i * 173 + 61) % 2960);
  const sy = -40 + ((i * 97 + 29) % 520);
  const sr = 1.1 + (i % 3) * 0.55;
  const op = 0.24 + (i % 5) * 0.11;
  return { sx, sy, sr, op };
});

// Vỉa sỏi đá bazan trong mặt cắt đất
const STRATA_ROCKS = Array.from({ length: 40 }, (_, i) => {
  const rx = -200 + i * 74 + ((i * 23) % 31);
  const gy = desertGroundY(rx);
  const ry = gy + 38 + ((i * 41) % 95);
  const rw = 18 + (i % 4) * 9;
  const rh = 6.5 + (i % 3) * 3.5;
  const rot = ((i * 19) % 26) - 13;
  return { rx, ry, rw, rh, rot };
});

/** Vẽ tiêm kích phản lực tốc độ cao nhìn ngang (3 tông lam-xám + luồng đốt sau). */
const HighJet2D: React.FC<{ x: number; y: number; rot?: number; scale?: number }> = ({
  x,
  y,
  rot = -2,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    {/* Luồng lửa phản lực tốc độ cao */}
    <path d="M-66 1 L-114 -5.5 L-142 1 L-114 7.5 Z" fill={PAL2D.amberMid} opacity={0.82} />
    <path d="M-66 1 L-98 -2.8 L-116 1 L-98 4.8 Z" fill={PAL2D.amberHi} opacity={0.96} />
    {/* Vệt khí động siêu tốc */}
    <line x1={-205} y1={-12} x2={-78} y2={-12} stroke={PAL2D.chalk} strokeWidth={1.6} opacity={0.4} strokeDasharray="18 10" />
    <line x1={-240} y1={14} x2={-82} y2={14} stroke={PAL2D.chalk} strokeWidth={1.6} opacity={0.34} strokeDasharray="24 12" />
    {/* Đuôi đứng kép & cánh ngang */}
    <path d="M-60 -4 L-40 -4 L-52 -28 L-65 -26 Z" fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={2.2} />
    <path d="M-36 3 L2 2 L-14 13 L-44 11 Z" fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={2} />
    {/* Thân khí động mũi nhọn */}
    <path
      d="M-65 -5 L-26 -9 L24 -7 C46 -6 62 -2 74 1 C60 5 44 8 22 8 L-58 7 L-65 3 Z"
      fill={PAL2D.concreteMid}
      stroke={PAL2D.ink}
      strokeWidth={2.4}
    />
    <path d="M-56 -4 L-24 -8 L24 -6 L66 0 L-56 0 Z" fill={PAL2D.concreteHi} opacity={0.82} />
    {/* Buồng lái kính sẫm */}
    <path d="M8 -7 C16 -14 32 -13 40 -5 L10 -5 Z" fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={1.8} />
    <path d="M13 -7 C19 -11 29 -11 35 -6 Z" fill={PAL2D.usHi} opacity={0.65} />
    {/* Họng xả động cơ */}
    <rect x={-69} y={-3.5} width={6} height={9} rx={1.5} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={1.6} />
  </g>
);

/** Vẽ tên lửa hành trình / đạn đạo tốc độ cao trên tầng cao. */
const FastMissile2D: React.FC<{ x: number; y: number; rot?: number; scale?: number }> = ({
  x,
  y,
  rot = 4,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    <path d="M-46 0 L-90 -5.5 L-118 0 L-90 5.5 Z" fill={PAL2D.threatMid} opacity={0.84} />
    <path d="M-46 0 L-74 -2.8 L-92 0 L-74 2.8 Z" fill={PAL2D.amberHi} />
    <line x1={-185} y1={0} x2={-120} y2={0} stroke={PAL2D.amberHi} strokeWidth={1.8} opacity={0.48} strokeDasharray="14 8" />
    {/* Cánh lái đuôi & vây giữa */}
    <path d="M-44 -5 L-34 -5 L-41 -16 L-47 -15 Z" fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={1.8} />
    <path d="M-44 5 L-34 5 L-41 16 L-47 15 Z" fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={1.8} />
    <path d="M-8 -5 L4 -5 L-3 -13 L-11 -12 Z" fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={1.6} />
    {/* Thân tên lửa trụ dài + đầu nhọn */}
    <path
      d="M-45 -5.5 L26 -5.5 C38 -5.5 48 -2.5 55 0 C48 2.5 38 5.5 26 5.5 L-45 5.5 Z"
      fill={PAL2D.concreteHi}
      stroke={PAL2D.ink}
      strokeWidth={2.2}
    />
    <path d="M26 -5.5 C38 -5.5 48 -2.5 55 0 C48 2.5 38 5.5 26 5.5 Z" fill={PAL2D.threatMid} stroke={PAL2D.ink} strokeWidth={1.6} />
    <rect x={-42} y={1} width={66} height={3.5} fill={PAL2D.concreteLo} opacity={0.55} />
  </g>
);

/** Khung khóa mục tiêu sáng trên radar (4 góc vuông chiến thuật + vòng sóng dội + vector vận tốc). */
const RadarTargetLock2D: React.FC<{
  x: number;
  y: number;
  r: number;
  lockP: number;
  pulse: number;
  vx?: number;
  vy?: number;
}> = ({ x, y, r, lockP, pulse, vx = 68, vy = 0 }) => {
  if (lockP <= 0.01) return null;
  const s = lerp(1.55, 1.0, lockP);
  const box = r * s;
  const c = Math.max(10, box * 0.34);
  return (
    <g transform={`translate(${x} ${y})`} opacity={lockP}>
      <circle cx={0} cy={0} r={box * (1.06 + 0.1 * pulse)} fill="none" stroke={PAL2D.ewTeal} strokeWidth={6} opacity={0.2} />
      <circle cx={0} cy={0} r={box * 0.82} fill="none" stroke={PAL2D.ewTeal} strokeWidth={1.8} strokeDasharray="6 5" opacity={0.78} />
      <path
        d={`M${-box} ${-box + c} L${-box} ${-box} L${-box + c} ${-box}
            M${box - c} ${-box} L${box} ${-box} L${box} ${-box + c}
            M${box} ${box - c} L${box} ${box} L${box - c} ${box}
            M${-box + c} ${box} L${-box} ${box} L${-box} ${box - c}`}
        fill="none"
        stroke={PAL2D.amberHi}
        strokeWidth={3.4}
        strokeLinecap="round"
      />
      <circle cx={0} cy={0} r={4.5} fill={PAL2D.amberHi} />
      <line x1={0} y1={0} x2={vx} y2={vy} stroke={PAL2D.ewTeal} strokeWidth={2.8} />
      <polygon
        points={`${vx + 10},${vy} ${vx - 3},${vy - 5.5} ${vx - 3},${vy + 5.5}`}
        fill={PAL2D.ewTeal}
      />
    </g>
  );
};

/** Đài radar cảnh giới phòng không truyền thống (bệ nhà trạm + tháp giàn thép + gương parabol mạng pha hướng lên cao). */
const TraditionalRadarSite2D: React.FC<{ x: number; groundY: number; t: number }> = ({ x, groundY, t }) => {
  const dishY = RADAR_Y;
  const beaconOp = 0.45 + 0.55 * Math.max(0, Math.sin(t * 5.2));
  return (
    <g>
      {/* Móng bê tông đồi radar */}
      <rect
        x={x - 78}
        y={groundY - 16}
        width={156}
        height={22}
        rx={3}
        fill={PAL2D.concreteMid}
        stroke={PAL2D.ink}
        strokeWidth={2.6}
      />
      <rect x={x - 75} y={groundY - 14} width={150} height={6} fill={PAL2D.concreteHi} opacity={0.7} />

      {/* Xe / Shelter điều khiển radar bên trái chân tháp */}
      <rect
        x={x - 68}
        y={groundY - 54}
        width={62}
        height={38}
        rx={3}
        fill={PAL2D.usLo}
        stroke={PAL2D.ink}
        strokeWidth={2.4}
      />
      <rect x={x - 65} y={groundY - 51} width={56} height={9} fill={PAL2D.usMid} opacity={0.75} />
      <rect x={x - 56} y={groundY - 38} width={14} height={11} rx={1.5} fill={PAL2D.ewTeal} opacity={0.75} stroke={PAL2D.ink} strokeWidth={1.6} />
      <rect x={x - 36} y={groundY - 38} width={18} height={16} rx={1.5} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={1.6} />

      {/* Tháp giàn thép chữ X đỡ bệ xoay radar */}
      <polygon
        points={`${x - 6},${groundY - 16} ${x + 42},${groundY - 16} ${x + 30},${dishY + 26} ${x + 6},${dishY + 26}`}
        fill={PAL2D.basaltDark}
        fillOpacity={0.45}
        stroke={PAL2D.ink}
        strokeWidth={2.6}
      />
      {[0, 1, 2].map((lvl) => {
        const y0 = groundY - 18 - lvl * 24;
        const y1 = y0 - 24;
        return (
          <g key={lvl} stroke={PAL2D.concreteMid} strokeWidth={2.1}>
            <line x1={x - 2 + lvl * 3} y1={y0} x2={x + 36 - lvl * 3} y2={y1} />
            <line x1={x + 38 - lvl * 3} y1={y0} x2={x + 2 + lvl * 3} y2={y1} />
            <line x1={x - 2 + lvl * 3} y1={y1} x2={x + 38 - lvl * 3} y2={y1} />
          </g>
        );
      })}

      {/* Bệ cổ xoay phương vị */}
      <rect
        x={x - 2}
        y={dishY + 14}
        width={40}
        height={16}
        rx={3}
        fill={PAL2D.concreteMid}
        stroke={PAL2D.ink}
        strokeWidth={2.4}
      />
      <circle cx={RADAR_X} cy={dishY + 8} r={10} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={2.4} />

      {/* Gương ăng-ten cảnh giới lớn nghiêng ngửa lên tầng cao (-17 độ) */}
      <g transform={`translate(${RADAR_X} ${dishY}) rotate(-17)`}>
        <path
          d="M-16 -42 L-4 -48 L4 -48 L4 46 L-4 46 L-16 38 Z"
          fill={PAL2D.usLo}
          stroke={PAL2D.ink}
          strokeWidth={2.4}
        />
        <path
          d="M2 -54 C14 -32 14 30 2 52 L-5 48 C5 28 5 -28 -5 -50 Z"
          fill={PAL2D.usHi}
          stroke={PAL2D.ink}
          strokeWidth={2.5}
        />
        <line x1={4} y1={-24} x2={34} y2={-4} stroke={PAL2D.concreteHi} strokeWidth={2.6} />
        <line x1={4} y1={22} x2={34} y2={4} stroke={PAL2D.concreteHi} strokeWidth={2.6} />
        <rect x={31} y={-7} width={11} height={14} rx={2} fill={PAL2D.amberMid} stroke={PAL2D.ink} strokeWidth={2} />
        <circle cx={0} cy={-59} r={4} fill={PAL2D.threatMid} opacity={beaconOp} />
      </g>
    </g>
  );
};

/** Chim trời vỗ cánh bay chậm ở tầng thấp sát đất (biên dạng thân-cánh rõ nét ngay cả sau khi bị gạch mờ lọc bỏ). */
const LowBird2D: React.FC<{
  x: number;
  y: number;
  flap: number;
  scale?: number;
  filtered: number;
}> = ({ x, y, flap, scale = 1, filtered }) => {
  const wingY = Math.sin(flap) * 10;
  const bodyOp = lerp(0.96, 0.58, filtered);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale * 1.2})`}>
      <circle
        cx={0}
        cy={0}
        r={20}
        fill={filtered > 0.5 ? PAL2D.bgConsole : 'none'}
        fillOpacity={0.28}
        stroke={filtered > 0.5 ? PAL2D.muted : PAL2D.amberMid}
        strokeWidth={1.8}
        strokeDasharray={filtered > 0.5 ? '4 4' : undefined}
        opacity={lerp(0.82, 0.45, filtered)}
      />
      {/* Cánh chim vỗ + thân chim có mỏ/đuôi rõ ràng */}
      <g opacity={bodyOp}>
        <path
          d="M-8 1 L6 0 L11 1.5 L6 3 L-9 3.5 L-13 5 Z"
          fill={PAL2D.concreteHi}
          stroke={PAL2D.ink}
          strokeWidth={1.2}
        />
        <path
          d={`M-15 ${wingY} Q-6 ${-9 + wingY * 0.45} 0 0 Q6 ${-9 + wingY * 0.45} 15 ${wingY}`}
          fill="none"
          stroke={PAL2D.chalk}
          strokeWidth={3.1}
          strokeLinecap="round"
        />
      </g>
      {/* Dấu gạch chéo nhỏ gọn ở góc trên vòng tín hiệu khi bị thuật toán Doppler lọc bỏ */}
      {filtered > 0.05 && (
        <g transform="translate(13 -13)" opacity={filtered * 0.92}>
          <circle cx={0} cy={0} r={7.5} fill={PAL2D.bgConsole} stroke={PAL2D.threatMid} strokeWidth={1.8} />
          <line x1={-3.8} y1={-3.8} x2={3.8} y2={3.8} stroke={PAL2D.threatMid} strokeWidth={2.1} strokeLinecap="round" />
          <line x1={3.8} y1={-3.8} x2={-3.8} y2={3.8} stroke={PAL2D.threatMid} strokeWidth={2.1} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

const S07: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ 3 mốc sự kiện chính theo CUE
  const highLockP = prog(t, CUE.s07_high_lock, CUE.s07_high_lock + 0.75);
  const clutterGateP = prog(t, CUE.s07_clutter_gate - 0.25, CUE.s07_clutter_gate + 0.95);
  const filterSweepP = prog(t, CUE.s07_clutter_gate + 0.1, CUE.s07_clutter_gate + 1.85);

  // Chuyển động Camera 2D chuẩn xác 1:1 với viewBox="0 0 1920 1080":
  // 1) Đại cảnh quét tầng cao săn tiêm kích & tên lửa (128.3 -> 133.2s)
  // 2) Đẩy cận xuống thung lũng thấp lọc nhiễu Doppler chim trời & bụi cát (133.2 -> 139.6s)
  // 3) Vượt qua gờ đồi lia thấp sát mặt cát theo Shahed ẩn dưới đường chân trời radar (139.6 -> 147.55s)
  const pToClutter = prog(t, 133.0, 134.5, Easing.inOut(Easing.cubic));
  const pToHorizon = prog(t, 139.4, 141.3, Easing.inOut(Easing.cubic));

  // Vị trí Shahed2D (view='side', tint='putty') bay là là sát mặt cát bên phải gờ đồi
  const shahedX = lerp(990, 2120, prog(t, 138.8, 147.55, Easing.linear));
  const groundAtShahed = desertGroundY(shahedX);
  const groundAhead = desertGroundY(shahedX + 36);
  const shahedY = groundAtShahed - 54 + Math.sin(t * 2.6) * 2.5;
  const shahedRot = (Math.atan2(groundAhead - groundAtShahed, 36) * 180) / Math.PI;

  const camX1 = lerp(880, 960, prog(t, 128.3, 133.0));
  const camX2 = lerp(camX1, 565, pToClutter);
  const camX = lerp(camX2, shahedX - 45, pToHorizon);

  const camY1 = lerp(495, 480, prog(t, 128.3, 133.0));
  const camY2 = lerp(camY1, 668, pToClutter);
  const camY = lerp(camY2, 682, pToHorizon);

  const zoom1 = lerp(0.98, 1.03, prog(t, 128.3, 133.0));
  const zoom2 = lerp(zoom1, 1.44, pToClutter);
  const camZoom = lerp(zoom2, 1.32, pToHorizon);

  const shake = handheld(t, 2.2, 's07-cam');

  // Tiêm kích & tên lửa bay cực nhanh ở tầng cao (sau 138s đã bay vọt xa sang phải, nhường trọn khung Nhịp 3 cho Shahed)
  const jetX = 940 + (t - 128.3) * 102;
  const jetY = 238 - (t - 128.3) * 4.5;
  const missileX = 1120 + (t - 128.3) * 124;
  const missileY = 368 - (t - 128.3) * 3.6;

  const lockPulse = 0.5 + 0.5 * Math.sin((t - CUE.s07_high_lock) * 8);

  // Đàn chim trời bay chậm ở tầng thấp trước gờ đồi
  const birds = [
    { bx: 448, by: 682, spd: 11, ph: 0.2, sc: 0.96 },
    { bx: 512, by: 656, spd: 13, ph: 1.4, sc: 1.08 },
    { bx: 584, by: 698, spd: 10, ph: 2.5, sc: 0.92 },
    { bx: 658, by: 668, spd: 12, ph: 3.7, sc: 1.04 },
    { bx: 732, by: 704, spd: 9, ph: 4.9, sc: 0.9 },
  ];

  // Các cụm bụi cát sa mạc cuốn là là sát mặt đất
  const dustClusters = [
    { dx: 432, r: 25, spd: 15, seed: 11 },
    { dx: 538, r: 31, spd: 18, seed: 23 },
    { dx: 655, r: 27, spd: 14, seed: 37 },
    { dx: 758, r: 23, spd: 17, seed: 51 },
  ];

  const gateScanX = lerp(375, 860, filterSweepP);

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgConsole}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ overflow: 'visible' }}>
          <Defs2D />
          <defs>
            <linearGradient id="s07-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#07111e" />
              <stop offset="52%" stopColor={PAL2D.bgNight} />
              <stop offset="100%" stopColor="#1b3556" />
            </linearGradient>
            <linearGradient id="s07-beam-grad" x1="0" y1="0.7" x2="1" y2="0.15">
              <stop offset="0%" stopColor={PAL2D.usHi} stopOpacity={0.34} />
              <stop offset="45%" stopColor={PAL2D.usMid} stopOpacity={0.18} />
              <stop offset="100%" stopColor={PAL2D.usMid} stopOpacity={0.03} />
            </linearGradient>
            <linearGradient id="s07-shadow-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#050c16" stopOpacity={0.82} />
              <stop offset="100%" stopColor="#081322" stopOpacity={0.55} />
            </linearGradient>
            <clipPath id="s07-beam-clip">
              <path d={MAIN_BEAM_POLY} />
            </clipPath>
          </defs>

          {/* 1. Bầu trời đêm rạng sáng + lưới tọa độ mặt cắt độ cao */}
          <rect x={-500} y={-350} width={3600} height={1850} fill="url(#s07-sky)" />
          <TacticalGrid2D x={-480} y={-320} w={3520} h={1440} step={80} major={320} opacity={0.22} />

          {/* Các ngôi sao nhỏ tầng cao */}
          <g>
            {STARS.map((s, idx) => (
              <circle key={idx} cx={s.sx} cy={s.sy} r={s.sr} fill={PAL2D.chalk} opacity={s.op} />
            ))}
          </g>

          {/* Các vạch chia tầng độ cao kỹ thuật (không chữ) */}
          {[140, 300, 460, 620].map((ly, idx) => (
            <g key={ly} opacity={0.32}>
              <line
                x1={-420}
                y1={ly}
                x2={2980}
                y2={ly}
                stroke={PAL2D.grid}
                strokeWidth={1.1}
                strokeDasharray="10 14"
              />
              <rect x={60} y={ly - 4} width={18 - idx * 2} height={3} fill={PAL2D.usMid} />
            </g>
          ))}

          {/* 2. Dãy núi sa mạc nhiều lớp tạo chiều sâu phía chân trời */}
          <path d={BG_SKYLINE_FAR} fill="#102136" opacity={0.85} />
          <path d={BG_SKYLINE_MID} fill="#182f4a" opacity={0.75} />

          {/* 3. Chùm quạt sóng xanh của đài radar cảnh giới phóng lên tầng cao */}
          <path d={MAIN_BEAM_POLY} fill="url(#s07-beam-grad)" />
          <line
            x1={RADAR_X}
            y1={RADAR_Y}
            x2={BEAM_FAR_X}
            y2={beamUpperY(BEAM_FAR_X)}
            stroke={PAL2D.usMid}
            strokeWidth={6}
            opacity={0.14}
          />
          <line
            x1={RADAR_X}
            y1={RADAR_Y}
            x2={BEAM_FAR_X}
            y2={beamUpperY(BEAM_FAR_X)}
            stroke={PAL2D.usHi}
            strokeWidth={1.8}
            strokeDasharray="14 10"
            opacity={0.55}
          />

          {/* Các mặt sóng cầu lan tỏa liên tục trong quạt sóng */}
          <g clipPath="url(#s07-beam-clip)">
            {Array.from({ length: 9 }, (_, k) => {
              const phase = (((t - 128.0) * 0.52 + k / 9) % 1 + 1) % 1;
              const rad = 110 + phase * 2600;
              const op = Math.sin(phase * Math.PI) * 0.46;
              return (
                <circle
                  key={k}
                  cx={RADAR_X}
                  cy={RADAR_Y}
                  r={rad}
                  fill="none"
                  stroke={PAL2D.usHi}
                  strokeWidth={2.4}
                  opacity={op}
                />
              );
            })}

            {(() => {
              const scanMix = 0.5 + 0.5 * Math.sin(t * 1.9);
              const endY = lerp(beamUpperY(BEAM_FAR_X) + 40, horizonY(BEAM_FAR_X) - 30, scanMix);
              return (
                <g>
                  <line
                    x1={RADAR_X}
                    y1={RADAR_Y}
                    x2={BEAM_FAR_X}
                    y2={endY}
                    stroke={PAL2D.ewTeal}
                    strokeWidth={10}
                    opacity={0.12}
                  />
                  <line
                    x1={RADAR_X}
                    y1={RADAR_Y}
                    x2={BEAM_FAR_X}
                    y2={endY}
                    stroke={PAL2D.usHi}
                    strokeWidth={2.0}
                    opacity={0.48}
                  />
                </g>
              );
            })()}
          </g>

          {/* 4. Vùng bóng tối khuất sóng bên dưới đường chân trời radar (từ gờ đồi sang phải) */}
          <path d={SHADOW_ZONE_FILL} fill="url(#s07-shadow-grad)" />
          <g opacity={0.16 + 0.16 * pToHorizon}>
            {Array.from({ length: 22 }, (_, i) => {
              const hx0 = 955 + i * 88;
              const hy0 = horizonY(hx0) + 8;
              const hx1 = hx0 - 56;
              const hy1 = Math.min(desertGroundY(hx1) - 10, hy0 + 185);
              if (hy1 <= hy0 + 16) return null;
              return (
                <line
                  key={i}
                  x1={hx0}
                  y1={hy0}
                  x2={hx1}
                  y2={hy1}
                  stroke={PAL2D.usLo}
                  strokeWidth={1.6}
                  strokeDasharray="6 6"
                />
              );
            })}
          </g>

          {/* 5. Đường ranh giới CHÂN TRỜI RADAR nghiêng chéo (vẽ nét kép halo mờ + lõi sáng, KHÔNG dùng filter=#glow) */}
          <g>
            <line
              x1={RADAR_X}
              y1={RADAR_Y}
              x2={BEAM_FAR_X}
              y2={horizonY(BEAM_FAR_X)}
              stroke={PAL2D.ewTeal}
              strokeWidth={16}
              opacity={0.15 + 0.08 * pToHorizon}
              strokeLinecap="round"
            />
            <line
              x1={RADAR_X}
              y1={RADAR_Y}
              x2={BEAM_FAR_X}
              y2={horizonY(BEAM_FAR_X)}
              stroke={PAL2D.usMid}
              strokeWidth={6}
              opacity={0.36 + 0.12 * pToHorizon}
              strokeLinecap="round"
            />
            <line
              x1={RADAR_X}
              y1={RADAR_Y}
              x2={BEAM_FAR_X}
              y2={horizonY(BEAM_FAR_X)}
              stroke={PAL2D.chalk}
              strokeWidth={2.5}
              strokeDasharray="18 9"
              opacity={0.94}
            />
            {/* Điểm tiếp tuyến hình học ngay trên đỉnh gờ đồi chắn sóng */}
            <circle cx={RIDGE_X} cy={RIDGE_Y} r={14} fill={PAL2D.amberMid} opacity={0.2 + 0.12 * Math.sin(t * 5)} />
            <circle cx={RIDGE_X} cy={RIDGE_Y} r={5.5} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={2} />
          </g>

          {/* 6. Nhịp 1 (129.5s): Tiêm kích & Tên lửa bay cao-nhanh bị sóng radar bắt giữ + khung khóa mục tiêu sáng */}
          {t < 139.2 && (
            <>
              <g filter="url(#sh)">
                <HighJet2D x={jetX} y={jetY} rot={-2.5} scale={1.15} />
                <FastMissile2D x={missileX} y={missileY} rot={-1.8} scale={1.08} />
              </g>
              {highLockP > 0.02 && (
                <g opacity={highLockP * 0.72}>
                  <line
                    x1={jetX - 20}
                    y1={jetY + 12}
                    x2={RADAR_X + 26}
                    y2={RADAR_Y - 12}
                    stroke={PAL2D.ewTeal}
                    strokeWidth={2.0}
                    strokeDasharray="8 10"
                    strokeDashoffset={-t * 140}
                  />
                  <line
                    x1={missileX - 18}
                    y1={missileY + 10}
                    x2={RADAR_X + 28}
                    y2={RADAR_Y - 6}
                    stroke={PAL2D.ewTeal}
                    strokeWidth={1.8}
                    strokeDasharray="8 10"
                    strokeDashoffset={-t * 150}
                  />
                </g>
              )}
              <RadarTargetLock2D x={jetX + 4} y={jetY - 2} r={54} lockP={highLockP} pulse={lockPulse} vx={84} vy={-4} />
              <RadarTargetLock2D x={missileX + 4} y={missileY} r={42} lockP={highLockP} pulse={lockPulse} vx={98} vy={-3} />
            </>
          )}

          {/* 7. Nhịp 2 (134.2s): Tầng thấp sát đất — Chim trời + Bụi cát sa mạc + Cổng lọc thuật toán Doppler */}
          <g>
            <polygon
              points={`${RADAR_X},${RADAR_Y} ${RIDGE_X - 25},${RIDGE_Y + 6} ${RIDGE_X - 40},${desertGroundY(RIDGE_X - 40) - 8} ${RADAR_X + 70},${desertGroundY(RADAR_X + 70) - 6}`}
              fill={PAL2D.usMid}
              opacity={0.09}
            />

            {/* Các cụm bụi cát sa mạc (Puff2D) bay là là sát mặt cát */}
            {dustClusters.map((dc, idx) => {
              const curX = dc.dx + ((t - 128.3) * dc.spd) % 95;
              const curY = desertGroundY(curX) - dc.r * 0.86 - Math.sin(t * 1.8 + idx) * 5;
              const isFiltered = Math.max(0, Math.min(1, (gateScanX - curX) / 55)) * clutterGateP;
              return (
                <g key={dc.seed}>
                  <Puff2D
                    x={curX}
                    y={curY}
                    r={dc.r}
                    color={isFiltered > 0.5 ? '#968b7c' : PAL2D.sandHi}
                    opacity={lerp(0.75, 0.42, isFiltered)}
                    seed={dc.seed}
                  />
                  <circle
                    cx={curX}
                    cy={curY - 2}
                    r={dc.r * 0.8}
                    fill="none"
                    stroke={isFiltered > 0.5 ? PAL2D.muted : PAL2D.amberMid}
                    strokeWidth={1.6}
                    strokeDasharray="4 4"
                    opacity={lerp(0.68, 0.36, isFiltered)}
                  />
                  {isFiltered > 0.08 && (
                    <g transform={`translate(${curX + dc.r * 0.58} ${curY - dc.r * 0.58})`} opacity={isFiltered * 0.9}>
                      <circle cx={0} cy={0} r={7} fill={PAL2D.bgConsole} stroke={PAL2D.threatMid} strokeWidth={1.7} />
                      <line x1={-3.5} y1={-3.5} x2={3.5} y2={3.5} stroke={PAL2D.threatMid} strokeWidth={2} strokeLinecap="round" />
                      <line x1={3.5} y1={-3.5} x2={-3.5} y2={3.5} stroke={PAL2D.threatMid} strokeWidth={2} strokeLinecap="round" />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Đàn chim trời bay chậm sát sườn đồi */}
            {birds.map((b, idx) => {
              const curX = b.bx + Math.sin(t * 0.55 + idx) * 16 + (t - 128.3) * (b.spd * 0.32);
              const curY = b.by + Math.cos(t * 0.9 + b.ph) * 7;
              const isFiltered = Math.max(0, Math.min(1, (gateScanX - curX) / 50)) * clutterGateP;
              return (
                <LowBird2D
                  key={idx}
                  x={curX}
                  y={curY}
                  flap={t * 8.2 + b.ph}
                  scale={b.sc}
                  filtered={isFiltered}
                />
              );
            })}

            {/* Khung Dải Cổng Lọc Doppler hiện lên lúc 134.20s */}
            {clutterGateP > 0.01 && (
              <g opacity={clutterGateP}>
                <rect
                  x={388}
                  y={624}
                  width={456}
                  height={186}
                  rx={8}
                  fill={PAL2D.bgNight}
                  fillOpacity={0.28}
                  stroke={PAL2D.ewTeal}
                  strokeWidth={2.2}
                  strokeDasharray="10 7"
                />
                {filterSweepP > 0 && filterSweepP < 0.99 && (
                  <g>
                    <line
                      x1={gateScanX}
                      y1={626}
                      x2={gateScanX}
                      y2={808}
                      stroke={PAL2D.ewTeal}
                      strokeWidth={10}
                      opacity={0.24}
                    />
                    <line
                      x1={gateScanX}
                      y1={626}
                      x2={gateScanX}
                      y2={808}
                      stroke={PAL2D.chalk}
                      strokeWidth={2.4}
                    />
                  </g>
                )}

                {/* Đồ thị phổ vận tốc Doppler mini trực quan (không chữ) */}
                <g transform="translate(410 526)" filter="url(#sh)">
                  <rect
                    x={0}
                    y={0}
                    width={202}
                    height={82}
                    rx={6}
                    fill={PAL2D.bgConsole}
                    stroke={PAL2D.grid}
                    strokeWidth={2.2}
                  />
                  <rect x={10} y={10} width={108} height={62} rx={3} fill={PAL2D.threatLo} opacity={0.34} />
                  <line x1={118} y1={8} x2={118} y2={74} stroke={PAL2D.amberHi} strokeWidth={2.2} strokeDasharray="4 3" />
                  {[22, 44, 66, 86, 102].map((bx, bi) => {
                    const bh = [34, 46, 28, 40, 22][bi];
                    return (
                      <rect
                        key={bx}
                        x={bx}
                        y={70 - bh}
                        width={10}
                        height={bh}
                        rx={1.5}
                        fill={PAL2D.muted}
                        opacity={0.42}
                      />
                    );
                  })}
                  <line x1={50} y1={26} x2={78} y2={54} stroke={PAL2D.threatMid} strokeWidth={3.2} strokeLinecap="round" />
                  <line x1={78} y1={26} x2={50} y2={54} stroke={PAL2D.threatMid} strokeWidth={3.2} strokeLinecap="round" />
                  {[132, 152, 172].map((bx, bi) => {
                    const bh = [42, 56, 36][bi];
                    return (
                      <rect
                        key={bx}
                        x={bx}
                        y={70 - bh}
                        width={11}
                        height={bh}
                        rx={1.5}
                        fill={PAL2D.ewTeal}
                      />
                    );
                  })}
                </g>
              </g>
            )}
          </g>

          {/* 8. Nhịp 3 (140.4s): Shahed2D (view='side', tint='putty') vỏ composite bay là là sát mặt cát, ẩn dưới chân trời radar */}
          {t >= 138.6 && (
            <g>
              {/* Bụi cát cuốn mỏng sát mặt đất phía dưới cánh quạt đẩy của Shahed */}
              {[0, 1, 2, 3, 4].map((di) => {
                const trailX = shahedX - 82 - di * 36;
                const trailY = desertGroundY(trailX) - 11 - di * 2;
                return (
                  <Puff2D
                    key={di}
                    x={trailX}
                    y={trailY}
                    r={14 + di * 4}
                    color={PAL2D.sandHi}
                    opacity={0.38 - di * 0.06}
                    seed={80 + di}
                  />
                );
              })}

              {/* Đường vết bay thấp bám sát biên dạng địa hình */}
              <path
                d={smoothPath(
                  Array.from({ length: 14 }, (_, k) => {
                    const px = Math.max(915, shahedX - (13 - k) * 38);
                    return [px, desertGroundY(px) - 54] as Pt;
                  }),
                )}
                fill="none"
                stroke={PAL2D.threatMid}
                strokeWidth={2.4}
                strokeDasharray="10 7"
                opacity={0.78}
              />

              {/* Vỏ composite ít phản xạ sóng vô tuyến (tia nhiễu xạ yếu chạm vỏ bị tán xạ tản mát, không dội ngược về radar) */}
              {t >= CUE.s07_under_horizon && (
                <g opacity={0.75 * prog(t, CUE.s07_under_horizon, CUE.s07_under_horizon + 0.85)}>
                  {[-24, 6, 36].map((ox, oi) => {
                    const pulse = (((t * 1.65 + oi * 0.33) % 1) + 1) % 1;
                    const sx = shahedX + ox;
                    const sy = shahedY - 12;
                    return (
                      <g key={ox}>
                        <line
                          x1={sx - 34}
                          y1={sy - 44}
                          x2={sx}
                          y2={sy}
                          stroke={PAL2D.usMid}
                          strokeWidth={1.6}
                          strokeDasharray="5 5"
                          opacity={0.52}
                        />
                        <line
                          x1={sx}
                          y1={sy}
                          x2={sx + 28 + pulse * 22}
                          y2={sy - 18 - pulse * 14}
                          stroke={PAL2D.ewTeal}
                          strokeWidth={1.6}
                          strokeDasharray="3 5"
                          opacity={0.68 * (1 - pulse)}
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Thước gióng trực quan chỉ độ cao cực thấp sát mặt cát & khoảng hở lớn dưới đường chân trời radar */}
              <g opacity={0.82 * prog(t, CUE.s07_under_horizon, CUE.s07_under_horizon + 0.8)}>
                <line
                  x1={shahedX + 12}
                  y1={shahedY + 14}
                  x2={shahedX + 12}
                  y2={groundAtShahed - 4}
                  stroke={PAL2D.amberHi}
                  strokeWidth={2}
                />
                <line x1={shahedX + 4} y1={groundAtShahed - 4} x2={shahedX + 20} y2={groundAtShahed - 4} stroke={PAL2D.amberHi} strokeWidth={2} />
                <line
                  x1={shahedX + 12}
                  y1={shahedY - 26}
                  x2={shahedX + 12}
                  y2={horizonY(shahedX + 12) + 6}
                  stroke={PAL2D.usMid}
                  strokeWidth={1.7}
                  strokeDasharray="5 6"
                  opacity={0.62}
                />
                <circle cx={shahedX + 12} cy={horizonY(shahedX + 12)} r={4.5} fill={PAL2D.usHi} />
              </g>

              {/* Chủ thể chính: Shahed2D nhìn ngang, màu vỏ composite putty */}
              <g filter="url(#sh)">
                <Shahed2D
                  x={shahedX}
                  y={shahedY}
                  rot={shahedRot}
                  scale={1.24}
                  view="side"
                  tint="putty"
                  propAngle={t * 34}
                />
              </g>
            </g>
          )}

          {/* 9. Mặt cắt địa chất nhiều lớp của sa mạc đá sỏi bazan Rukban + Đài radar bên trái */}
          <g>
            <path d={FORE_GROUND_FILL} fill={PAL2D.sandMid} />
            <path d={FORE_SUBSOIL_FILL} fill={PAL2D.sandLo} />
            <path d={FORE_BEDROCK_FILL} fill={PAL2D.basaltDark} />

            {STRATA_ROCKS.map((r, idx) => (
              <rect
                key={idx}
                x={r.rx - r.rw / 2}
                y={r.ry - r.rh / 2}
                width={r.rw}
                height={r.rh}
                rx={2.5}
                fill={idx % 2 === 0 ? PAL2D.basalt : '#384250'}
                opacity={0.62}
                transform={`rotate(${r.rot} ${r.rx} ${r.ry})`}
              />
            ))}

            <path d={FORE_CREST_LINE} fill="none" stroke={PAL2D.sandHi} strokeWidth={6.5} strokeLinecap="round" />
            <path d={FORE_CREST_LINE} fill="none" stroke={PAL2D.ink} strokeWidth={2.6} />
          </g>

          <g filter="url(#sh)">
            <TraditionalRadarSite2D x={224} groundY={desertGroundY(224) + 2} t={t} />
          </g>
        </svg>
      </Cam2D>
      <Grain opacity={0.42} />
    </>
  );
};

export default S07;
