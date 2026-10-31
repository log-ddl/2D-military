import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog, useT } from '@core/time';
import { handheld } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { Blast2D, Puff2D } from '@skill/military/2d/fx';
import { drawOn } from '@skill/military/2d/path';
import { skyline } from '@skill/military/2d/terrain';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { AbramsSide2D, Shell120Icon2D } from '../parts/Abrams2D';

const GRID_MINOR = Array.from({ length: 71 }, (_, i) => -1400 + i * 40);
const GRID_MAJOR_X = Array.from({ length: 23 }, (_, i) => -1760 + i * 160);
const GRID_MAJOR_Y = Array.from({ length: 15 }, (_, i) => -1120 + i * 160);
const RULER_TICKS = Array.from({ length: 65 }, (_, i) => -1200 + i * 40);

const AMMO_CELLS_X = [-260, -236, -212, -188, -164, -140];
const AMMO_CELLS_Y = [-224, -207, -190];
const ROAD_WHEELS_X = [-265, -178, -91, -4, 83, 170, 257];

const TANK_SCALE = 1.18;
const GROUND_Y = 135;

const C01S03: React.FC = () => {
  const t = useT();

  const ridgeFar = useMemo(() => skyline('s03_far', -2100, 2100, GROUND_Y, 240, 760, 950), []);
  const ridgeMid = useMemo(() => skyline('s03_mid', -2100, 2100, GROUND_Y, 130, 480, 950), []);

  // Pha cuối: xe tăng vẫn nổ máy lăn bánh sống sót tiến về trước (56.20 -> 58.10 s)
  const driveP = prog(t, CUE.c01_s03_drive_alive - 0.65, 58.1);
  const driveX = driveP * 335;

  // ==================== ĐIỀU PHỐI CAMERA 2D QUA 4 NGHỊCH LÝ ====================
  // Trạm 1 (39.60–43.04 s): Mũi xe — Lái xe nằm ngửa & ghi-đông mô-tô T-bar
  // Trạm 2 (43.05–46.45 s): Hộp GPS — Pháo thủ ngắm gương thay vì ngắm nòng (chuyển máy mượt ngay nhịp nghỉ 43.04–43.60s)
  // Trạm 3 (46.45–49.05 s): Khoá nòng M256 — Vỏ đạn tự cháy thành không khí
  // Trạm 4A (49.05–54.25 s): Khoang đuôi bustle — 36 viên đạn nổ sát sau đầu tổ lái
  // Trạm 4B (54.25–58.10 s): Toàn cảnh — Nổ hết cùng lúc xả lửa thẳng đứng & xe vẫn chạy sống sót
  const pEnter1 = prog(t, CUE.c01_s03_start, 39.95);
  const pTo2 = prog(t, 42.95, 43.42);
  const pTo3 = prog(t, 46.28, 46.72);
  const pTo4A = prog(t, 48.92, 49.45);
  const pTo4B = prog(t, 54.05, 54.55);

  let focusLX = lerp(75, 236, pEnter1);
  let focusLY = lerp(-158, -166, pEnter1);
  let camZoom = lerp(1.38, 1.96, pEnter1);

  focusLX = lerp(focusLX, 255, pTo2);
  focusLY = lerp(focusLY, -218, pTo2);
  camZoom = lerp(camZoom, 1.82, pTo2);

  focusLX = lerp(focusLX, 118, pTo3);
  focusLY = lerp(focusLY, -262, pTo3);
  camZoom = lerp(camZoom, 1.9, pTo3);

  focusLX = lerp(focusLX, -128, pTo4A);
  focusLY = lerp(focusLY, -198, pTo4A);
  camZoom = lerp(camZoom, 1.95, pTo4A);

  focusLX = lerp(focusLX, 22, pTo4B);
  focusLY = lerp(focusLY, -225, pTo4B);
  camZoom = lerp(camZoom, 1.15, pTo4B);

  const camWorldX = driveX * (0.65 * pTo4B) + focusLX * TANK_SCALE;
  const camWorldY = GROUND_Y + focusLY * TANK_SCALE;

  const blastImpact = bump(t, CUE.c01_s03_blow_up, 0.55);
  const baseShake = handheld(t, 2.2 + blastImpact * 16, 'c01s03');

  // ==================== TIẾN ĐỘ TỪNG HIỆU ỨNG KỸ THUẬT ====================
  // 1) Lái xe nằm ngửa & ghi-đông T-bar
  const driverShow = prog(t, 39.6, 39.85) * (1 - pTo2);
  const handlebarShow = prog(t, 39.65, 39.88) * (1 - pTo2);
  const barTwistActive = prog(t, CUE.c01_s03_handlebars - 0.5, CUE.c01_s03_handlebars + 0.25);
  const barSteerDeg = Math.sin(t * 5.2) * lerp(6, 15, barTwistActive);

  // 2) Pháo thủ ngắm gương GPS vs trục nòng
  const mirrorShow = prog(t, 43.05, 43.35) * (1 - pTo3);
  const beamDraw = prog(t, 43.1, 43.75);
  const mirrorTiltDeg = Math.sin(t * 3.8) * 5;

  // 3) Vỏ đạn thuốc phóng cháy thành không khí (đốt trực tiếp dọc thân thuốc phóng từ x=+58 về đế x=-126)
  const casingPanelShow = prog(t, 46.38, 46.68) * (1 - pTo4A);
  const casingBurnP = prog(t, 46.58, CUE.c01_s03_thin_air + 0.15);

  // 4) 36 viên đạn nổ mạnh, cửa chống nổ & xả lửa thẳng đứng qua nắp blowout
  const ammoHighlight = prog(t, CUE.c01_s03_36_rounds - 0.25, CUE.c01_s03_36_rounds + 0.45);
  const headsGapShow =
    prog(t, CUE.c01_s03_behind_heads - 0.25, CUE.c01_s03_behind_heads + 0.3) *
    (1 - prog(t, CUE.c01_s03_blow_up - 0.08, CUE.c01_s03_blow_up + 0.1));
  const preBlastCharge = bump(t, 53.75, 0.75);
  const hasBlown = t >= CUE.c01_s03_blow_up;
  const blowDt = Math.max(0, t - CUE.c01_s03_blow_up);
  const panelFlapP = prog(t, CUE.c01_s03_blow_up, CUE.c01_s03_blow_up + 0.22);
  const jetFireFade = hasBlown ? Math.max(0.18, 1 - blowDt / 3.4) : 0;
  const crewSafeGlow = prog(t, CUE.c01_s03_blow_up + 0.05, CUE.c01_s03_blow_up + 0.45);

  return (
    <AbsoluteFill>
      {/* Đặt Defs2D NGOÀI Cam2D theo đúng chuẩn chống lỗi cắt viền filter của Chromium */}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <Defs2D />
      </svg>

      <Cam2D x={camWorldX} y={camWorldY} zoom={camZoom} shake={baseShake} bg={PAL.bgDeep}>
        <svg
          width={4400}
          height={2600}
          viewBox="-2200 -1500 4400 2600"
          style={{ position: 'absolute', left: -2200, top: -1500, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="s03SlateGlow" cx="50%" cy="48%" r="55%">
              <stop offset="0%" stopColor={PAL.panel} stopOpacity={0.95} />
              <stop offset="62%" stopColor={PAL.bg} stopOpacity={0.98} />
              <stop offset="100%" stopColor={PAL.bgDeep} stopOpacity={1} />
            </radialGradient>
            <linearGradient id="s03BlowoutJet" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor={PAL.amberHot} stopOpacity={0.98} />
              <stop offset="45%" stopColor={PAL.amber} stopOpacity={0.86} />
              <stop offset="85%" stopColor={PAL.crimson} stopOpacity={0.44} />
              <stop offset="100%" stopColor={PAL.crimson} stopOpacity={0} />
            </linearGradient>
            <clipPath id="s03CasingBurnClip">
              <rect
                x={-180}
                y={-60}
                width={lerp(238, 54, casingBurnP)}
                height={120}
              />
            </clipPath>
          </defs>

          {/* ==================== 1. NỀN BẢN VẼ KỸ THUẬT TACTICAL SLATE CÓ CHIỀU SÂU ==================== */}
          <rect x={-2200} y={-1500} width={4400} height={2600} fill="url(#s03SlateGlow)" />

          <path d={ridgeFar} fill="#0b131d" stroke={PAL.grid} strokeWidth={1.5} opacity={0.65} />
          <path d={ridgeMid} fill="#101c2a" stroke={PAL.grid} strokeWidth={1.5} opacity={0.75} />

          <g opacity={0.25}>
            {GRID_MINOR.map((v) => (
              <React.Fragment key={v}>
                <line x1={v} y1={-1100} x2={v} y2={700} stroke={PAL.grid} strokeWidth={1} />
                <line x1={-1760} y1={v * 0.65} x2={1760} y2={v * 0.65} stroke={PAL.grid} strokeWidth={1} />
              </React.Fragment>
            ))}
          </g>
          <g opacity={0.52}>
            {GRID_MAJOR_X.map((gx) => (
              <line key={gx} x1={gx} y1={-1120} x2={gx} y2={760} stroke={PAL.grid} strokeWidth={1.6} />
            ))}
            {GRID_MAJOR_Y.map((gy) => (
              <line key={gy} x1={-1760} y1={gy} x2={1760} y2={gy} stroke={PAL.grid} strokeWidth={1.6} />
            ))}
          </g>

          <g stroke={PAL.gridBright} strokeWidth={1.8} opacity={0.55}>
            {[-960, -480, 0, 480, 960].map((cx) =>
              [-640, -320, 0, 320].map((cy) => (
                <g key={`${cx}_${cy}`} transform={`translate(${cx} ${cy})`}>
                  <line x1={-9} y1={0} x2={9} y2={0} />
                  <line x1={0} y1={-9} x2={0} y2={9} />
                </g>
              )),
            )}
          </g>

          <rect x={-1800} y={GROUND_Y} width={3800} height={580} fill="rgba(8,14,22,0.58)" />
          <line x1={-1800} y1={GROUND_Y} x2={2000} y2={GROUND_Y} stroke={PAL.gridBright} strokeWidth={3} />
          {RULER_TICKS.map((rx, idx) => {
            const isMajor = idx % 3 === 0;
            return (
              <line
                key={rx}
                x1={rx}
                y1={GROUND_Y}
                x2={rx}
                y2={GROUND_Y + (isMajor ? 18 : 9)}
                stroke={isMajor ? PAL.gridBright : PAL.grid}
                strokeWidth={isMajor ? 2.2 : 1.4}
              />
            );
          })}

          {/* ==================== 2. XE TĂNG M1A2 X-RAY & 4 TRẠM NGHỊCH LÝ CƠ KHÍ ==================== */}
          <g transform={`translate(${driveX} ${GROUND_Y}) scale(${TANK_SCALE})`}>
            {/* Vệt gió động năng & bụi xích khi xe tăng lăn bánh sống sót ở cuối cảnh */}
            {driveP > 0.01 && (
              <g opacity={Math.min(1, driveP * 2.5)}>
                {[-65, -125, -185].map((ly, i) => (
                  <line
                    key={i}
                    x1={-430 - i * 55 - driveP * 110}
                    y1={ly}
                    x2={-395}
                    y2={ly}
                    stroke={PAL.cyan}
                    strokeWidth={3.2}
                    strokeLinecap="round"
                    opacity={0.5}
                  />
                ))}
                {[0, 1, 2, 3, 4, 5].map((pi) => (
                  <Puff2D
                    key={pi}
                    x={-355 - pi * 44}
                    y={-14 - pi * 5}
                    r={20 + pi * 7}
                    color="#7f93a8"
                    opacity={0.48 * (1 - pi * 0.14)}
                    seed={30 + pi}
                  />
                ))}
              </g>
            )}

            <AbramsSide2D x={0} y={0} scale={1} camo="desert" xray />

            {/* Nan quay bánh xe khi xe tăng phóng đi sống sót ở cuối cảnh */}
            {driveP > 0.01 &&
              ROAD_WHEELS_X.map((wx, idx) => (
                <g
                  key={idx}
                  transform={`translate(${wx} -35.5) rotate(${driveX * 1.6 + idx * 25})`}
                  opacity={Math.min(1, driveP * 3)}
                >
                  <line x1={-15} y1={0} x2={15} y2={0} stroke={PAL.ink} strokeWidth={2.2} />
                  <line x1={0} y1={-15} x2={0} y2={15} stroke={PAL.ink} strokeWidth={2.2} />
                </g>
              ))}

            {/* ---------- TRẠM 1: LÁI XE NẰM NGỬA + GHI-ĐÔNG MÔ-TÔ CHỮ T ---------- */}
            {driverShow > 0.01 && (
              <g opacity={driverShow}>
                <ellipse
                  cx={212}
                  cy={-105}
                  rx={76}
                  ry={38}
                  fill="rgba(41,227,212,0.09)"
                  stroke={PAL.cyan}
                  strokeWidth={7}
                  opacity={0.26}
                />
                <ellipse
                  cx={212}
                  cy={-105}
                  rx={76}
                  ry={38}
                  fill="none"
                  stroke={PAL.cyan}
                  strokeWidth={2.5}
                  strokeDasharray="10 6"
                />
                <line x1={142} y1={-76} x2={278} y2={-76} stroke={PAL.gridBright} strokeWidth={1.8} strokeDasharray="5 4" />
                <path
                  d="M 152 -88 Q 210 -86 254 -119"
                  fill="none"
                  stroke={PAL.amberHot}
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  {...drawOn(130, driverShow)}
                />

                {handlebarShow > 0.01 && (
                  <g opacity={handlebarShow}>
                    <line
                      x1={224}
                      y1={-122}
                      x2={272}
                      y2={-205}
                      stroke={PAL.amberHot}
                      strokeWidth={2.2}
                      strokeDasharray="5 4"
                    />
                    <circle cx={224} cy={-122} r={6} fill={PAL.amberHot} />

                    <g transform="translate(282 -268)">
                      <circle r={66} fill={PAL.panel} stroke={PAL.ink} strokeWidth={4} />
                      <circle r={63} fill="none" stroke={barTwistActive > 0.2 ? PAL.amberHot : PAL.amber} strokeWidth={2.8} />
                      <circle r={54} fill="none" stroke={PAL.grid} strokeWidth={1.2} strokeDasharray="6 6" />

                      <rect x={-7} y={4} width={14} height={42} rx={4} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.5} />
                      <g transform={`rotate(${barSteerDeg})`}>
                        <path
                          d="M -38 -6 L -14 -12 L 14 -12 L 38 -6 L 36 3 L 12 -2 L -12 -2 L -36 3 Z"
                          fill={PAL.steelLight}
                          stroke={PAL.ink}
                          strokeWidth={2.6}
                          strokeLinejoin="round"
                        />
                        <rect x={-52} y={-10} width={20} height={12} rx={4} fill={PAL.amberHot} stroke={PAL.ink} strokeWidth={2.4} />
                        <rect x={32} y={-10} width={20} height={12} rx={4} fill={PAL.amberHot} stroke={PAL.ink} strokeWidth={2.4} />
                        <line x1={-48} y1={-14} x2={-33} y2={-16} stroke={PAL.cyan} strokeWidth={2.4} strokeLinecap="round" />
                        <line x1={33} y1={-16} x2={48} y2={-14} stroke={PAL.cyan} strokeWidth={2.4} strokeLinecap="round" />
                        <circle cx={0} cy={-7} r={7} fill={PAL.amber} stroke={PAL.ink} strokeWidth={2.2} />
                      </g>

                      <path d="M -28 -36 A 38 38 0 0 1 28 -36" fill="none" stroke={PAL.cyan} strokeWidth={2.2} />
                      <polygon points="-32,-33 -24,-41 -23,-31" fill={PAL.cyan} />
                      <polygon points="32,-33 24,-41 23,-31" fill={PAL.cyan} />
                    </g>
                  </g>
                )}
              </g>
            )}

            {/* ---------- TRẠM 2: PHÁO THỦ NGẮM GƯƠNG THAY VÌ NGẮM NÒNG ---------- */}
            {mirrorShow > 0.01 && (
              <g opacity={mirrorShow}>
                <line
                  x1={195}
                  y1={-196}
                  x2={608}
                  y2={-196}
                  stroke={PAL.muted}
                  strokeWidth={2.4}
                  strokeDasharray="9 7"
                  opacity={0.78}
                />
                <g transform="translate(538 -196)" stroke={PAL.crimson} strokeWidth={3} opacity={0.85}>
                  <line x1={-11} y1={-11} x2={11} y2={11} />
                  <line x1={-11} y1={11} x2={11} y2={-11} />
                </g>

                <g transform="translate(112 -255)">
                  <circle r={26} fill="rgba(14,23,34,0.82)" stroke={PAL.amber} strokeWidth={2.8} />
                  <circle r={19} fill="none" stroke={PAL.cyan} strokeWidth={1.8} strokeDasharray="5 4" />
                  <g transform={`rotate(${mirrorTiltDeg})`}>
                    <line x1={-14} y1={10} x2={14} y2={-10} stroke={PAL.white} strokeWidth={5.5} strokeLinecap="round" />
                    <line x1={-14} y1={10} x2={14} y2={-10} stroke={PAL.cyan} strokeWidth={2.8} strokeLinecap="round" />
                  </g>
                </g>

                {/* Tia quang học nét kép phản xạ từ mắt pháo thủ qua gương ra mục tiêu xa */}
                <path
                  d="M 66 -152 L 112 -255 L 596 -286"
                  fill="none"
                  stroke={PAL.cyan}
                  strokeWidth={9.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.24}
                  {...drawOn(610, beamDraw)}
                />
                <path
                  d="M 66 -152 L 112 -255 L 596 -286"
                  fill="none"
                  stroke={PAL.cyanSoft}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...drawOn(610, beamDraw)}
                />

                {beamDraw > 0.35 && (
                  <g transform="translate(596 -286)" opacity={Math.min(1, (beamDraw - 0.35) / 0.35)}>
                    <circle r={19} fill="rgba(41,227,212,0.16)" stroke={PAL.cyan} strokeWidth={2.6} />
                    <line x1={-26} y1={0} x2={-9} y2={0} stroke={PAL.cyan} strokeWidth={2.6} />
                    <line x1={9} y1={0} x2={26} y2={0} stroke={PAL.cyan} strokeWidth={2.6} />
                    <line x1={0} y1={-26} x2={0} y2={-9} stroke={PAL.cyan} strokeWidth={2.6} />
                    <line x1={0} y1={9} x2={0} y2={26} stroke={PAL.cyan} strokeWidth={2.6} />
                    <circle r={4} fill={PAL.amberHot} />
                  </g>
                )}
              </g>
            )}

            {/* ---------- TRẠM 3: VỎ ĐẠN THUỐC PHÓNG CHÁY BỐC HƠI THÀNH KHÔNG KHÍ ---------- */}
            {casingPanelShow > 0.01 && (
              <g opacity={casingPanelShow}>
                <rect
                  x={55}
                  y={-215}
                  width={131}
                  height={40}
                  rx={5}
                  fill="rgba(255,170,43,0.18)"
                  stroke={PAL.amber}
                  strokeWidth={3}
                />
                <line x1={120} y1={-215} x2={92} y2={-288} stroke={PAL.amber} strokeWidth={2.2} strokeDasharray="5 4" />
                <line x1={154} y1={-215} x2={158} y2={-288} stroke={PAL.amber} strokeWidth={2.2} strokeDasharray="5 4" />

                <g transform="translate(118 -352)">
                  <rect
                    x={-162}
                    y={-64}
                    width={324}
                    height={128}
                    rx={12}
                    fill={PAL.panel}
                    stroke={PAL.ink}
                    strokeWidth={4}
                  />
                  <rect
                    x={-159}
                    y={-61}
                    width={318}
                    height={122}
                    rx={10}
                    fill="none"
                    stroke={PAL.amber}
                    strokeWidth={2.4}
                  />

                  <Shell120Icon2D x={-8} y={6} scale={0.78} kind="puck" />

                  {casingBurnP < 0.14 && (
                    <g
                      transform={`translate(${-8 + casingBurnP * 260} 6) scale(0.78)`}
                      opacity={1 - casingBurnP / 0.14}
                    >
                      <path d="M 58 -21 L 122 -14 L 122 14 L 58 21 Z" fill="#2c333d" stroke={PAL.ink} strokeWidth={2.8} />
                      <path d="M 58 -5 L 185 0 L 58 5 Z" fill={PAL.duPurple} stroke={PAL.ink} strokeWidth={2.2} />
                    </g>
                  )}

                  {casingBurnP < 0.98 && (
                    <g clipPath="url(#s03CasingBurnClip)" transform="translate(-8 6) scale(0.78)">
                      <Shell120Icon2D x={0} y={0} scale={1} kind="m829a4" />
                    </g>
                  )}

                  {casingBurnP > 0.02 && casingBurnP < 0.98 && (
                    <g transform={`translate(${-8 + lerp(58, -126, casingBurnP) * 0.78} 6)`}>
                      <ellipse cx={0} cy={0} rx={16} ry={30} fill={PAL.amber} opacity={0.65} />
                      <ellipse cx={-2} cy={0} rx={8} ry={24} fill={PAL.amberHot} />
                    </g>
                  )}

                  {casingBurnP > 0.04 &&
                    [0, 1, 2, 3, 4, 5, 6].map((ki) => {
                      const localAge = Math.max(0, casingBurnP - ki * 0.09);
                      if (localAge <= 0) return null;
                      const px = lerp(38, -98, ki / 6) + Math.sin(ki * 2.3 + t * 3) * 8;
                      const py = 0 - localAge * 62;
                      return (
                        <Puff2D
                          key={ki}
                          x={px}
                          y={py}
                          r={11 + localAge * 19}
                          color="#d7e6f5"
                          opacity={Math.max(0, 0.56 * (1 - localAge * 1.1))}
                          seed={50 + ki}
                        />
                      );
                    })}
                </g>
              </g>
            )}

            {/* ---------- TRẠM 4: 36 VIÊN ĐẠN SAU ĐẦU TỔ LÁI -> XẢ NỔ BLOWOUT THẲNG ĐỨNG ---------- */}
            {ammoHighlight > 0.01 && (
              <g opacity={ammoHighlight}>
                <rect
                  x={-280}
                  y={-238}
                  width={158}
                  height={62}
                  rx={5}
                  fill={
                    hasBlown
                      ? 'rgba(255,170,43,0.42)'
                      : preBlastCharge > 0.1
                        ? 'rgba(255,100,40,0.42)'
                        : 'rgba(255,66,66,0.28)'
                  }
                  stroke={preBlastCharge > 0.2 ? PAL.amberHot : PAL.crimson}
                  strokeWidth={3.2 + preBlastCharge * 2}
                />
                {AMMO_CELLS_X.map((ax, xi) =>
                  AMMO_CELLS_Y.map((ay, yi) => {
                    const cellPulse = 0.72 + 0.28 * Math.sin(t * 7 + xi * 0.8 + yi);
                    return (
                      <circle
                        key={`${ax}_${ay}`}
                        cx={ax}
                        cy={ay}
                        r={6.8 + preBlastCharge * 1.2}
                        fill={hasBlown || preBlastCharge > 0.35 ? PAL.amberHot : PAL.crimson}
                        stroke={PAL.amberHot}
                        strokeWidth={1.8}
                        opacity={cellPulse}
                      />
                    );
                  }),
                )}

                {headsGapShow > 0.01 && (
                  <g opacity={headsGapShow}>
                    <line x1={-116} y1={-264} x2={-116} y2={-165} stroke={PAL.crimson} strokeWidth={2.5} strokeDasharray="5 3" />
                    <line x1={-45} y1={-264} x2={-45} y2={-177} stroke={PAL.cyan} strokeWidth={2.5} strokeDasharray="5 3" />
                    <line x1={-111} y1={-258} x2={-50} y2={-258} stroke={PAL.amberHot} strokeWidth={3.4} />
                    <polygon points="-115,-258 -104,-264 -104,-252" fill={PAL.amberHot} />
                    <polygon points="-46,-258 -57,-264 -57,-252" fill={PAL.amberHot} />
                    <circle cx={-45} cy={-165} r={17} fill="rgba(41,227,212,0.12)" stroke={PAL.cyan} strokeWidth={2.5} />
                    <circle cx={-6} cy={-188} r={17} fill="rgba(41,227,212,0.12)" stroke={PAL.cyan} strokeWidth={2.5} />
                  </g>
                )}

                {hasBlown && (
                  <g>
                    <g transform={`translate(-268 -248) rotate(${-panelFlapP * 76})`}>
                      <rect x={0} y={-6} width={62} height={7} rx={2} fill={PAL.steelLight} stroke={PAL.ink} strokeWidth={2.2} />
                    </g>
                    <g transform={`translate(-140 -248) rotate(${panelFlapP * 76})`}>
                      <rect x={-62} y={-6} width={62} height={7} rx={2} fill={PAL.steelLight} stroke={PAL.ink} strokeWidth={2.2} />
                    </g>

                    {jetFireFade > 0.01 && (
                      <g opacity={jetFireFade}>
                        <path
                          d={`M -258 -246 L -286 ${-246 - 305 * panelFlapP} L -122 ${-246 - 305 * panelFlapP} L -150 -246 Z`}
                          fill="url(#s03BlowoutJet)"
                        />
                        <path
                          d={`M -236 -246 L -248 ${-246 - 250 * panelFlapP} L -160 ${-246 - 250 * panelFlapP} L -172 -246 Z`}
                          fill={PAL.amberHot}
                          opacity={0.78}
                        />
                        {[0, 1, 2].map((ci) => {
                          const cy = -290 - ci * 68 - ((blowDt * 150) % 68);
                          return (
                            <path
                              key={ci}
                              d={`M -232 ${cy + 18} L -204 ${cy} L -176 ${cy + 18}`}
                              fill="none"
                              stroke={PAL.white}
                              strokeWidth={4}
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              opacity={0.85}
                            />
                          );
                        })}
                      </g>
                    )}

                    <Blast2D
                      t={t}
                      at={CUE.c01_s03_blow_up}
                      x={-204}
                      y={-250}
                      size={80}
                      life={4.1}
                      smoke="#7c8a99"
                      seed={15}
                    />

                    <line x1={-116} y1={-243} x2={-116} y2={-168} stroke={PAL.cyan} strokeWidth={14} opacity={0.35 * crewSafeGlow} strokeLinecap="round" />
                    <line x1={-116} y1={-243} x2={-116} y2={-168} stroke={PAL.amberHot} strokeWidth={6.5} strokeLinecap="round" />
                    {jetFireFade > 0.1 && (
                      <path
                        d="M -124 -230 Q -142 -206 -124 -182"
                        fill="none"
                        stroke={PAL.crimson}
                        strokeWidth={3}
                        opacity={jetFireFade}
                      />
                    )}

                    <path
                      d="M -106 -240 L 94 -240 L 292 -136 L 292 -72 L -106 -72 Z"
                      fill="rgba(41,227,212,0.12)"
                      stroke={PAL.cyan}
                      strokeWidth={2.8}
                      strokeLinejoin="round"
                      opacity={crewSafeGlow * 0.92}
                    />
                  </g>
                )}
              </g>
            )}
          </g>
        </svg>
      </Cam2D>

      <Label
        t={t}
        text="36 ROUNDS"
        x={330}
        y={920}
        from={CUE.c01_s03_36_rounds}
        until={54.1}
        size={52}
        bg={PAL.cream}
        fg={PAL.ink}
      />

      <Grain opacity={0.05} />
    </AbsoluteFill>
  );
};

export default C01S03;
