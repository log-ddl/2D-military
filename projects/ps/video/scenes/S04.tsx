import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { lerp, prog, rnd } from '@kit/theme';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D } from '@lib/2d/fx';
import { arcAngle, arcAt, arcPath } from '@lib/2d/path';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  GlowLine2D,
  Kh101_2D,
  PAC3_2D,
  PatriotLauncher2D,
  PatriotQuadFace2D,
  PatriotRadar2D,
  Shahed136_2D,
  TopoMapBg2D,
} from '../local/assets2d';

// ---------------- Dữ liệu làn sóng tên lửa hành trình Kh-101 & bầy lớn UAV Shahed-136 ----------------
type CruiseThreat = {
  id: number;
  tEnter: number;
  y0: number;
  y1: number;
  speed: number;
  scale: number;
  hitAt?: number;
};

type SwarmDrone = {
  id: number;
  tEnter: number;
  xStart: number;
  y: number;
  speed: number;
  scale: number;
  hitAt?: number;
};

// 12 tên lửa hành trình Kh-101 tràn vào từ rìa phải khớp mốc 51.94s kéo vệt đỏ dài
const CRUISE_WAVE: CruiseThreat[] = Array.from({ length: 12 }, (_, i) => {
  const row = i % 6;
  const wave = Math.floor(i / 6);
  const tEnter = 50.15 + wave * 0.95 + row * 0.14;
  const y0 = 195 + row * 124 + (wave === 1 ? 48 : -10);
  const y1 = y0 + (rnd(i * 7 + 1) - 0.5) * 48;
  return {
    id: i,
    tEnter,
    y0,
    y1,
    speed: 205 + (i % 3) * 18,
    scale: 0.25,
  };
});

// Đội hình bầy lớn 20 chiếc UAV cánh tam giác Shahed-136 bay kín nửa phải bầu trời quanh mốc 55.34s
const SHAHED_SWARM: SwarmDrone[] = Array.from({ length: 20 }, (_, i) => {
  const col = Math.floor(i / 5); // 4 lớp đội hình bầy
  const row = i % 5;
  const yBase = 165 + row * 176 + (col % 2 === 1 ? 76 : 0) + (rnd(i * 11 + 2) - 0.5) * 32;
  return {
    id: i,
    tEnter: 53.35 + col * 0.36 + row * 0.07,
    xStart: 2060 + col * 72 + (row % 2) * 34,
    y: Math.max(135, Math.min(950, yBase)),
    speed: 158 + (i % 4) * 11,
    scale: 0.34,
  };
});

// 13 quả đạn đánh chặn PAC-3 lần lượt khai hỏa từ trận địa Patriot bên trái, rút cạn cơ số 16 -> 3 ô!
type InterceptShot = {
  fireAt: number;
  hitAt: number;
  targetKind: 'cruise' | 'shahed';
  targetIdx: number;
  apex: number;
};

const INTERCEPT_SHOTS: InterceptShot[] = [
  { fireAt: 52.35, hitAt: 53.30, targetKind: 'cruise', targetIdx: 0, apex: 65 },
  { fireAt: 52.78, hitAt: 53.75, targetKind: 'cruise', targetIdx: 2, apex: 45 },
  { fireAt: 53.22, hitAt: 54.20, targetKind: 'cruise', targetIdx: 4, apex: -35 },
  { fireAt: 53.68, hitAt: 54.68, targetKind: 'cruise', targetIdx: 1, apex: 55 },
  { fireAt: 54.14, hitAt: 55.14, targetKind: 'cruise', targetIdx: 3, apex: 30 },
  { fireAt: 54.62, hitAt: 55.62, targetKind: 'cruise', targetIdx: 6, apex: 50 },
  { fireAt: 55.10, hitAt: 56.10, targetKind: 'shahed', targetIdx: 1, apex: 60 },
  { fireAt: 55.55, hitAt: 56.55, targetKind: 'shahed', targetIdx: 3, apex: -30 },
  { fireAt: 55.98, hitAt: 56.98, targetKind: 'cruise', targetIdx: 8, apex: 40 },
  { fireAt: 56.42, hitAt: 57.42, targetKind: 'shahed', targetIdx: 6, apex: 55 },
  { fireAt: 56.86, hitAt: 57.86, targetKind: 'shahed', targetIdx: 8, apex: -25 },
  { fireAt: 57.32, hitAt: 58.30, targetKind: 'shahed', targetIdx: 11, apex: 48 },
  { fireAt: 57.78, hitAt: 58.75, targetKind: 'shahed', targetIdx: 13, apex: -20 },
];

for (const s of INTERCEPT_SHOTS) {
  if (s.targetKind === 'cruise') {
    CRUISE_WAVE[s.targetIdx].hitAt = s.hitAt;
  } else {
    SHAHED_SWARM[s.targetIdx].hitAt = s.hitAt;
  }
}

const LAUNCH_ORIGIN: [number, number] = [775, 625];

function cruisePosAt(c: CruiseThreat, t: number): [number, number] {
  const dt = Math.max(0, t - c.tEnter);
  const x = 2070 - dt * c.speed;
  const p = Math.min(1, dt / 8);
  const y = lerp(c.y0, c.y1, p);
  return [x, y];
}

function shahedPosAt(d: SwarmDrone, t: number): [number, number] {
  const dt = Math.max(0, t - d.tEnter);
  const x = d.xStart - dt * d.speed;
  const y = d.y + Math.sin(t * 2.2 + d.id) * 6;
  return [x, y];
}

const S04: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- Đếm sáng 1 -> 16 ô đạn PAC-3 khớp 46.34s rồi tụt nhanh 16 -> 3 khi bắn chặn ----------------
  const countUp = Math.min(
    16,
    Math.max(1, Math.round(1 + 15 * prog(t, 43.85, CUE.s04_launcher_16, Easing.out(Easing.quad)))),
  );
  const shotsFired = INTERCEPT_SHOTS.filter((s) => t >= s.fireAt).length;
  const loadedCount = t < CUE.s04_launcher_16 ? countUp : Math.max(3, 16 - shotsFired);

  // ---------------- Camera: mở đầu zoom cận 1.25 vào giàn 4x4 bên trái, từ 48.2s kéo lùi 0.92 mở radar ----------------
  const pPull = prog(t, 48.2, 51.0, Easing.inOut(Easing.cubic));
  const zoom = lerp(1.25, 0.92, pPull);
  const camX = lerp(545, 1035, pPull);
  const camY = lerp(520, 540, pPull);
  const shake = handheld(t, 2.0 + pPull * 1.4, 's04_cam');

  const radarFade = prog(t, 48.3, 50.6, Easing.out(Easing.cubic));
  const sweepDeg = ((t - 48.0) * 52) % 360;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Cam2D x={camX} y={camY} zoom={zoom} shake={shake} bg={PAL2D.bgDeep}>
        <Layer>
          <Defs2D />
          <defs>
            <clipPath id="s04_world_clip">
              <rect x={-160} y={-120} width={2360} height={1320} />
            </clipPath>
          </defs>

          <g clipPath="url(#s04_world_clip)">
            {/* Nền bản đồ đồng mức chiến thuật cố định kích thước gọn trong world_clip */}
            <TopoMapBg2D w={2400} h={1360} cx={1020} cy={540} seed="ps_s04_map" />

            {/* Vòng quét radar chiến thuật xoay quanh trận địa Patriot bên trái */}
            <g opacity={0.32 + 0.68 * radarFade}>
              {[280, 540, 800, 1060].map((r) => (
                <circle
                  key={r}
                  cx={760}
                  cy={560}
                  r={r}
                  fill="none"
                  stroke={PAL2D.cyanSoft}
                  strokeWidth={1.5}
                  strokeDasharray="10 12"
                  opacity={0.28}
                />
              ))}
              {[-38, -18, 0, 18, 38].map((ang) => {
                const rad = (ang * Math.PI) / 180;
                return (
                  <line
                    key={ang}
                    x1={760}
                    y1={560}
                    x2={760 + Math.cos(rad) * 1080}
                    y2={560 + Math.sin(rad) * 1080}
                    stroke={PAL2D.grid}
                    strokeWidth={1.2}
                    opacity={0.28}
                  />
                );
              })}
              {radarFade > 0.02 && (
                <g transform={`translate(760 560) rotate(${sweepDeg})`}>
                  <path d="M0 0 L960 -125 A968 968 0 0 1 960 0 Z" fill={PAL2D.cyan} opacity={0.09 * radarFade} />
                  <line x1={0} y1={0} x2={960} y2={0} stroke={PAL2D.cyan} strokeWidth={2.2} opacity={0.42 * radarFade} />
                </g>
              )}
            </g>

            {/* ==================== CỤM TRẬN ĐỊA PATRIOT & MẶT GIÀN 4x4 = 16 ỐNG BÊN TRÁI ==================== */}
            <g>
              {/* Bảng khung HUD bao quanh mặt cắt giàn phóng 4x4 (tách thoáng hoàn toàn khỏi bánh xe PatriotLauncher2D) */}
              <rect
                x={62}
                y={246}
                width={444}
                height={536}
                rx={16}
                fill={PAL2D.bgNight}
                opacity={0.82}
                stroke={loadedCount <= 5 && t > 55 ? PAL2D.red : PAL2D.grid}
                strokeWidth={3}
              />

              {/* Mặt trước giàn 4x4 = 16 ống phóng PAC-3 */}
              <PatriotQuadFace2D x={284} y={470} size={374} loadedCount={loadedCount} showNumbers />

              {/* Thanh đo cơ số đạn 16 vạch trực quan ngay dưới mặt giàn 4x4 */}
              <g transform="translate(96 694)">
                <rect x={-6} y={-8} width={388} height={54} rx={8} fill="#0b1522" stroke={PAL2D.gridFine} strokeWidth={2} />
                {Array.from({ length: 16 }, (_, idx) => {
                  const armed = idx < loadedCount;
                  const low = loadedCount <= 5 && t > 55;
                  return (
                    <rect
                      key={idx}
                      x={idx * 23.8}
                      y={0}
                      width={19}
                      height={38}
                      rx={3}
                      fill={armed ? (low ? PAL2D.amber : PAL2D.green) : '#1d2430'}
                      stroke={armed ? (low ? PAL2D.amberHot : '#95f7b4') : '#394352'}
                      strokeWidth={1.5}
                    />
                  );
                })}
              </g>

              {/* Đường gióng kỹ thuật nối từ mặt giàn 4x4 sang xe bệ phóng Patriot đơn lẻ bên cạnh */}
              <path
                d="M474 375 L645 470 L735 585"
                fill="none"
                stroke={PAL2D.green}
                strokeWidth={2.4}
                strokeDasharray="8 6"
                opacity={0.72}
              />
              <path
                d="M474 565 L630 635 L710 680"
                fill="none"
                stroke={PAL2D.green}
                strokeWidth={2.4}
                strokeDasharray="8 6"
                opacity={0.55}
              />

              {/* Khẩu đội 1 bệ phóng Patriot M903 (x=780, chân sau ở 780 - 231 = 549 > 506, không đè bảng HUD!) + đài radar AN/MPQ-65 */}
              <PatriotLauncher2D x={780} y={768} scale={0.48} elev={38} />
              <PatriotRadar2D
                x={955}
                y={898}
                scale={0.38}
                beamOn={t >= 48.6}
                beamAngleDeg={-18 + Math.sin(t * 2.1) * 12}
              />
            </g>

            {/* ==================== LÀN SÓNG TÊN LỬA HÀNH TRÌNH KH-101 KÉO VỆT ĐỎ (51.94s) ==================== */}
            <g>
              {CRUISE_WAVE.map((c) => {
                if (t < c.tEnter) return null;
                if (c.hitAt !== undefined && t >= c.hitAt) return null;
                const [cx, cy] = cruisePosAt(c, t);
                if (cx > 2140) return null;
                const tailX = Math.min(2140, cx + 320);
                return (
                  <g key={`kh_${c.id}`}>
                    <GlowLine2D
                      d={`M${tailX.toFixed(1)} ${lerp(cy, c.y0, 0.35).toFixed(1)} L${(cx + 82).toFixed(1)} ${cy.toFixed(1)}`}
                      color={PAL2D.red}
                      core={PAL2D.amberHot}
                      width={3.3}
                      opacity={0.85}
                    />
                    <circle
                      cx={cx}
                      cy={cy}
                      r={28}
                      fill="none"
                      stroke={PAL2D.red}
                      strokeWidth={1.6}
                      strokeDasharray="6 5"
                      opacity={0.68}
                    />
                    <Kh101_2D x={cx} y={cy} scale={c.scale} flip flame={0.85} />
                  </g>
                );
              })}
            </g>

            {/* ==================== ĐỘI HÌNH BẦY LỚN 20 UAV CÁNH TAM GIÁC SHAHED-136 (55.34s) ==================== */}
            <g>
              {SHAHED_SWARM.map((d) => {
                if (t < d.tEnter) return null;
                if (d.hitAt !== undefined && t >= d.hitAt) return null;
                const [dx, dy] = shahedPosAt(d, t);
                if (dx > 2150) return null;
                const trailEnd = Math.min(2150, dx + 195);
                return (
                  <g key={`sh_${d.id}`}>
                    <line
                      x1={trailEnd}
                      y1={dy}
                      x2={dx + 58}
                      y2={dy}
                      stroke={PAL2D.red}
                      strokeWidth={2.4}
                      strokeDasharray="10 7"
                      opacity={0.7}
                    />
                    <circle cx={dx} cy={dy} r={42} fill={PAL2D.red} opacity={0.09} />
                    <circle cx={dx} cy={dy} r={24} fill="none" stroke={PAL2D.amber} strokeWidth={1.5} opacity={0.58} />
                    <Shahed136_2D x={dx} y={dy} scale={d.scale} view="top" flip />
                  </g>
                );
              })}
            </g>

            {/* ==================== CÁC TIA ĐÁNH CHẶN XANH BẮN RA RÚT CẠN ĐẠN PATRIOT ==================== */}
            <g>
              {INTERCEPT_SHOTS.map((s, idx) => {
                if (t < s.fireAt) return null;
                const targetPos =
                  s.targetKind === 'cruise'
                    ? cruisePosAt(CRUISE_WAVE[s.targetIdx], Math.min(t, s.hitAt))
                    : shahedPosAt(SHAHED_SWARM[s.targetIdx], Math.min(t, s.hitAt));

                const pFlight = Math.max(0, Math.min(1, (t - s.fireAt) / (s.hitAt - s.fireAt)));
                const flying = t < s.hitAt;
                const fadeAfter = flying ? 1 : Math.max(0, 1 - (t - s.hitAt) / 1.3);

                const [mx, my] = arcAt(
                  LAUNCH_ORIGIN[0],
                  LAUNCH_ORIGIN[1],
                  targetPos[0],
                  targetPos[1],
                  s.apex,
                  pFlight,
                );
                const ang = arcAngle(
                  LAUNCH_ORIGIN[0],
                  LAUNCH_ORIGIN[1],
                  targetPos[0],
                  targetPos[1],
                  s.apex,
                  pFlight,
                );

                return (
                  <g key={`int_${idx}`}>
                    {fadeAfter > 0.02 && (
                      <GlowLine2D
                        d={arcPath(
                          LAUNCH_ORIGIN[0],
                          LAUNCH_ORIGIN[1],
                          targetPos[0],
                          targetPos[1],
                          s.apex,
                          pFlight,
                          36,
                        )}
                        color={PAL2D.green}
                        core="#eafff0"
                        width={3.4}
                        opacity={0.85 * fadeAfter}
                      />
                    )}
                    {flying && (
                      <PAC3_2D x={mx} y={my} scale={0.18} rot={ang} flame={0.95} thicknessScale={1.7} />
                    )}
                    <Blast2D
                      t={t}
                      at={s.hitAt}
                      x={targetPos[0]}
                      y={targetPos[1] + 24}
                      size={48}
                      air
                      life={2.2}
                      smoke="#5d6f80"
                      seed={30 + idx}
                    />
                  </g>
                );
              })}
            </g>
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.4} />

      {/* Tối đa 1 nhãn tại mỗi thời điểm: 16 PAC-3 (46.34..49.8) -> SHAHED-136 (55.34..58.6) */}
      <Label t={t} text="16 PAC-3" x={635} y={138} from={CUE.s04_launcher_16} until={49.8} />
      <Label t={t} text="SHAHED-136" x={1360} y={138} from={CUE.s04_shahed_swarm} until={58.6} />
    </AbsoluteFill>
  );
};

export default S04;
