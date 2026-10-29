import React from 'react';
import { Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { handheld, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { arcAngle, arcAt, arcPath, smoothPath, type Pt } from '@lib/2d/path';
import { Puff2D } from '@lib/2d/fx';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  DawnAirspaceBg2D,
  GlowLine2D,
  Kh101_2D,
  Kinzhal2D,
  PatriotLauncher2D,
  PatriotRadar2D,
  Shahed136_2D,
} from '../local/assets2d';

// ---------------- Mặt cắt địa hình tiền cảnh: Gò cao Patriot bên trái + Gờ đồi chắn sóng + Thung lũng bên phải ----------------
const TERRAIN_PROFILE_PTS: Pt[] = [
  [-500, 775],
  [40, 775],
  [565, 775],   // Bãi đặt khẩu đội Patriot rộng rãi cho Bệ phóng & Đài Radar đứng tách bạch (y = 775)
  [622, 708],
  [675, 648],   // Đỉnh gờ đồi tiền duyên tạo góc khuất chân trời sóng radar
  [742, 725],
  [830, 852],
  [995, 884],   // Đáy thung lũng thấp (nơi Kh-101 lướt ẩn dưới chân sóng radar)
  [1265, 874],
  [1535, 888],
  [1820, 864],
  [2130, 878],
  [2550, 875],
];

const TERRAIN_TOP_LINE = smoothPath(TERRAIN_PROFILE_PTS, false, 0.35);
const TERRAIN_FILL_PATH = `${TERRAIN_TOP_LINE} L2550 1550 L-500 1550 Z`;

const SUB_STRATA_PTS: Pt[] = TERRAIN_PROFILE_PTS.map(([x, y]) => [x, y + 46]);
const SUB_STRATA_PATH = `${smoothPath(SUB_STRATA_PTS, false, 0.35)} L2550 1550 L-500 1550 Z`;

// Tâm ăng-ten đài PatriotRadar2D đặt tại (422, 773) với scale = 0.30 -> đỉnh mặt mảng pha quanh (450, 690)
// Tia giới hạn chân trời sóng radar đi sượt qua đỉnh gờ đồi (675, 646) hướng xiên lên về cánh phải (2420, 305)
const RADAR_ORIGIN: Pt = [450, 690];
const RADAR_HORIZON_END: Pt = [2420, 425];

// ---------------- Hành lang Tầng 1 (~150 m): UAV Shahed-136 bay chậm lượn theo sườn đồi ----------------
const uavCorridorY = (x: number) => 565 + Math.sin(x * 0.0052) * 22 + (x - 1400) * -0.045;
const uavSlopeDeg = (x: number) => {
  const dy = 22 * 0.0052 * Math.cos(x * 0.0052) - 0.045;
  // Vì Shahed136_2D dùng flip=true (mũi hướng -X), khi đi sang trái: dy > 0 (hạ xuống) ứng với góc xoay âm
  return (Math.atan2(-dy, 1) * 180) / Math.PI;
};

const UAV_PATH_D = (() => {
  const pts: Pt[] = [];
  for (let x = 2380; x >= 760; x -= 40) {
    pts.push([x, uavCorridorY(x)]);
  }
  return smoothPath(pts, false, 0.4);
})();

// ---------------- Hành lang Tầng 2 (~40 m, ẩn dưới đường chân trời radar!): Tên lửa hành trình Kh-101 ----------------
const cruiseCorridorY = (x: number) => 806 + Math.sin(x * 0.0065 + 1.2) * 13;
const cruiseSlopeDeg = (x: number) => {
  const dy = 13 * 0.0065 * Math.cos(x * 0.0065 + 1.2);
  return (Math.atan2(-dy, 1) * 180) / Math.PI;
};

const buildCruiseTrailPath = (xStart: number, xHead: number) => {
  const pts: Pt[] = [];
  const steps = 32;
  for (let i = 0; i <= steps; i++) {
    const x = lerp(xStart, xHead, i / steps);
    pts.push([x, cruiseCorridorY(x)]);
  }
  return smoothPath(pts, false, 0.35);
};

// ---------------- Hành lang Tầng 3 (Thượng tầng): 2 tên lửa Kinzhal bổ dốc đứng từ rìa trên ----------------
const HYPER_STRIKES = [
  { tStart: CUE.s07_tier3_hyper, tEnd: 109.45, x0: 1610, y0: -250, x1: 660, y1: 435, apex: 95 },
  { tStart: CUE.s07_tier3_hyper + 0.34, tEnd: 109.75, x0: 1890, y0: -290, x1: 935, y1: 390, apex: 105 },
] as const;

const S07: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const shake = handheld(t, 2.2, 's07_cam');

  // Chuyển động Camera 2D: theo dõi mặt cắt đồi & thung lũng, tới Tầng 3 thu nhẹ zoom mở rộng đỉnh trời
  const pPan = prog(t, 95.85, 105.6);
  const pTier3 = prog(t, 105.9, 107.6);

  const camX = lerp(lerp(940, 1060, pPan), 995, pTier3);
  const camY = lerp(lerp(560, 585, pPan), 445, pTier3);
  const zoom = lerp(1.03, 0.85, pTier3);

  const radarSweepDeg = -20 + Math.sin(t * 2.1) * 4.5;
  const horizonDraw = prog(t, 95.65, 97.4);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Cam2D x={camX} y={camY} zoom={zoom} shake={shake} bg={PAL2D.bgNight}>
        <Layer>
          <Defs2D />

          {/* Nền bầu trời bình minh lạnh 3 lớp núi có chiều sâu */}
          <DawnAirspaceBg2D x0={-500} x1={2550} groundY={895} seed="ps_s07" id="s07_dawn" />

          {/* Vùng quạt sóng radar bao phủ phía TRÊN đường chân trời sóng radar */}
          <polygon
            points={`${RADAR_ORIGIN[0]},${RADAR_ORIGIN[1]} 2420,-340 ${RADAR_HORIZON_END[0]},${RADAR_HORIZON_END[1]}`}
            fill={PAL2D.cyan}
            opacity={0.055 * horizonDraw}
          />

          {/* Vùng khuất sóng radar (Terrain Shadow / Blind Zone) sát đáy thung lũng */}
          <polygon
            points={`675,648 ${RADAR_HORIZON_END[0]},${RADAR_HORIZON_END[1]} 2420,900 675,900`}
            fill="#06101c"
            opacity={0.34 * horizonDraw}
          />

          {/* ---------------- Mặt cắt ngang địa hình tiền cảnh nhiều lớp địa chất ---------------- */}
          <path d={TERRAIN_FILL_PATH} fill={PAL2D.ground} />
          <path d={SUB_STRATA_PATH} fill="#1b291e" opacity={0.85} />
          <path d={TERRAIN_TOP_LINE} fill="none" stroke={PAL2D.groundLine} strokeWidth={5} />

          {/* Bãi bê tông công sự trên gò cao bên trái cho khẩu đội Patriot (2 xe đặt tách rời sắc nét) */}
          <rect x={0} y={771} width={562} height={10} rx={3} fill="#3f4c45" stroke={PAL2D.stroke} strokeWidth={2} />

          {/* Khẩu đội Patriot bên trái: Bệ phóng M903 phía sau + Đài radar AN/MPQ-65 tiền duyên phát sóng */}
          <g filter="url(#sh)">
            <PatriotLauncher2D x={140} y={773} scale={0.3} elev={38} />
            <PatriotRadar2D x={422} y={773} scale={0.3} beamOn beamAngleDeg={radarSweepDeg} />
          </g>

          {/* Đường chân trời sóng radar nét đứt hướng xiên lên từ mặt đài AN/MPQ-65 sượt qua đỉnh gờ đồi */}
          <line
            x1={RADAR_ORIGIN[0]}
            y1={RADAR_ORIGIN[1]}
            x2={lerp(RADAR_ORIGIN[0], RADAR_HORIZON_END[0], horizonDraw)}
            y2={lerp(RADAR_ORIGIN[1], RADAR_HORIZON_END[1], horizonDraw)}
            stroke={PAL2D.cyan}
            strokeWidth={3.2}
            strokeDasharray="18 12"
            opacity={0.88}
          />
          {/* Các vòng cung sóng xung điện tử lan từ đài radar ở tầng trên đường chân trời */}
          {[0, 1, 2].map((wIdx) => {
            const wp = ((t * 0.45 + wIdx / 3) % 1);
            const r = 180 + wp * 1250;
            const a0 = (-32 * Math.PI) / 180;
            const a1 = (-5.5 * Math.PI) / 180;
            const xA = RADAR_ORIGIN[0] + Math.cos(a0) * r;
            const yA = RADAR_ORIGIN[1] + Math.sin(a0) * r;
            const xB = RADAR_ORIGIN[0] + Math.cos(a1) * r;
            const yB = RADAR_ORIGIN[1] + Math.sin(a1) * r;
            return (
              <path
                key={`wave_${wIdx}`}
                d={`M${xA.toFixed(1)} ${yA.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${xB.toFixed(1)} ${yB.toFixed(1)}`}
                fill="none"
                stroke={PAL2D.cyanSoft}
                strokeWidth={2.2}
                opacity={(1 - wp) * 0.36}
              />
            );
          })}

          {/* Thước cột chia vạch độ cao kỹ thuật mảnh ở rìa phải (thuần hình học, không chữ thừa) */}
          <g opacity={0.42} stroke={PAL2D.grid}>
            <line x1={1840} y1={-220} x2={1840} y2={862} strokeWidth={1.6} strokeDasharray="6 8" />
            {[120, 320, 560, 805].map((ty, idx) => (
              <line
                key={ty}
                x1={1826}
                y1={ty}
                x2={1854}
                y2={ty}
                stroke={idx === 0 ? PAL2D.red : idx === 2 ? PAL2D.amber : PAL2D.cyan}
                strokeWidth={2.6}
              />
            ))}
          </g>

          {/* ==================== TẦNG 1 (97.92s+): Chuỗi 4 UAV Shahed-136 bay chậm (~150 m) ==================== */}
          {t >= CUE.s07_tier1_uav - 0.3 && (
            <g>
              {/* Đường dẫn hành lang Tầng 1 cam nhạt */}
              <path
                d={UAV_PATH_D}
                fill="none"
                stroke={PAL2D.amber}
                strokeWidth={2.6}
                strokeDasharray="12 10"
                opacity={0.55 * prog(t, CUE.s07_tier1_uav - 0.2, CUE.s07_tier1_uav + 1.2)}
              />
              {[0, 1, 2, 3].map((i) => {
                const dt = t - (CUE.s07_tier1_uav + i * 0.65);
                if (dt < -0.4) return null;
                // Tốc độ bay chậm ~118 px/s từ cánh phải (x = 1980) lượn dần sang trái
                const ux = 1980 - Math.max(0, dt) * 116;
                const uy = uavCorridorY(ux);
                const rot = uavSlopeDeg(ux);
                const enterOp = prog(t, CUE.s07_tier1_uav + i * 0.55 - 0.2, CUE.s07_tier1_uav + i * 0.55 + 0.45);
                return (
                  <g key={`uav_${i}`} opacity={enterOp}>
                    {/* Vệt khói động cơ cánh quạt mờ phía sau */}
                    <Puff2D x={ux + 88} y={uy + 2} r={12} color="#b7c2ce" opacity={0.28} seed={70 + i} />
                    <Puff2D x={ux + 125} y={uy + 4} r={16} color="#9aa7b5" opacity={0.16} seed={80 + i} />
                    {/* Vòng khoá mục tiêu radar khi UAV nhô trên đường chân trời sóng radar */}
                    <circle
                      cx={ux}
                      cy={uy}
                      r={44 + Math.sin(t * 5 + i) * 3}
                      fill="none"
                      stroke={PAL2D.amber}
                      strokeWidth={1.8}
                      strokeDasharray="8 6"
                      opacity={0.65}
                    />
                    <Shahed136_2D x={ux} y={uy} scale={0.38} rot={rot} flip view="side" />
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== TẦNG 2 (102.62s+): 2 tên lửa hành trình Kh-101 bay nhanh & cực thấp (~40 m) ==================== */}
          {[0, 1].map((i) => {
            const tLaunch = CUE.s07_tier2_cruise + i * 0.85;
            if (t < tLaunch) return null;
            const dt = t - tLaunch;
            // Bay nhanh gấp ~1.9 lần UAV (~205 px/s), lướt sát mặt thung lũng (x >= 875) ẩn dưới đường chân trời radar!
            const cx = Math.max(875 + i * 240, 2140 - dt * 204);
            const cy = cruiseCorridorY(cx);
            const rot = cruiseSlopeDeg(cx);
            const trailStart = Math.min(2240, cx + 480);
            const trailD = buildCruiseTrailPath(trailStart, cx + 125);

            return (
              <g key={`cruise_${i}`}>
                <GlowLine2D
                  d={trailD}
                  color={PAL2D.amber}
                  core={PAL2D.amberHot}
                  width={4.2}
                  opacity={0.9}
                />
                <Kh101_2D x={cx} y={cy} scale={0.36} rot={rot} flip flame={0.92} />
              </g>
            );
          })}

          {/* ==================== TẦNG 3 (106.36s+): 2 tên lửa Kinzhal bổ dốc đứng từ thượng tầng ==================== */}
          {HYPER_STRIKES.map((hs, idx) => {
            if (t < hs.tStart) return null;
            const p = prog(t, hs.tStart, hs.tEnd, Easing.out(Easing.quad));
            const [kx, ky] = arcAt(hs.x0, hs.y0, hs.x1, hs.y1, hs.apex, p);
            const kRot = arcAngle(hs.x0, hs.y0, hs.x1, hs.y1, hs.apex, p);
            const trailD = arcPath(hs.x0, hs.y0, hs.x1, hs.y1, hs.apex, p, 48);

            // Đường dự báo quỹ đạo chấm gạch mảnh dẫn xuống trận địa Patriot
            const guideP = prog(t, hs.tStart, hs.tStart + 0.9);
            const fullGuideD = arcPath(hs.x0, hs.y0, 355 + idx * 35, 760, hs.apex * 1.15, guideP, 48);

            return (
              <g key={`hyper_${idx}`}>
                <path
                  d={fullGuideD}
                  fill="none"
                  stroke={PAL2D.red}
                  strokeWidth={2.2}
                  strokeDasharray="10 12"
                  opacity={0.38}
                />
                <GlowLine2D
                  d={trailD}
                  color={PAL2D.red}
                  core={PAL2D.amberHot}
                  width={6.5}
                  opacity={0.95}
                />
                <Kinzhal2D
                  x={kx}
                  y={ky}
                  scale={0.42}
                  rot={kRot}
                  flame={0.75}
                  heatGlow={0.95}
                />
              </g>
            );
          })}
        </Layer>
      </Cam2D>

      <Grain opacity={0.38} />
    </div>
  );
};

export default S07;
