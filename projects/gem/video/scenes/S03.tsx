import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { handheld, Label, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn, smoothPath, type Pt } from '@lib/2d/path';
import { contours } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { Shahed2D, TacticalGrid2D } from '../local/draw2d';

// Tọa độ tâm căn cứ vô hình (mỏm đông bắc Jordan sát ngã ba biên giới Syria - Iraq)
const GHOST_X = 1185;
const GHOST_Y = 355;

// Biên giới lãnh thổ mỏm đông bắc Jordan (panhandle Ruwaished / Rukban giáp Syria phía Bắc & Iraq phía Đông)
const JORDAN_PANHANDLE_D =
  'M -80 545 L 430 515 L 860 325 L 1285 215 L 1475 510 L 1215 845 L 1245 1180 L -80 1180 Z';

const BORDER_SYRIA_JORDAN_D = 'M -80 545 L 430 515 L 860 325 L 1285 215';
const BORDER_IRAQ_JORDAN_D = 'M 1285 215 L 1475 510 L 1215 845 L 1245 1180';
const BORDER_SYRIA_IRAQ_D = 'M 1285 215 L 1485 -60';

// Các ký hiệu sân bay công khai phía tây/trung Jordan (đặt ngoài bán kính vòng đồng hồ 90 phút để không chèn hình khi zoom)
const PUBLIC_AIRBASES: { x: number; y: number; rot: number; delay: number }[] = [
  { x: 420, y: 660, rot: -18, delay: 0.0 },
  { x: 645, y: 530, rot: 22, delay: 0.35 },
  { x: 825, y: 710, rot: -8, delay: 0.7 },
  { x: 885, y: 470, rot: 14, delay: 1.05 },
];

/** Tạo đường cung tròn theo góc đồng hồ (0° ở hướng 12 giờ, quay thuận chiều kim đồng hồ). */
function clockArcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string {
  const span = Math.max(0, endDeg - startDeg);
  if (span <= 0.4) return '';
  const steps = Math.max(8, Math.ceil(span / 4));
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const deg = startDeg + (span * i) / steps;
    const rad = ((deg - 90) * Math.PI) / 180;
    const px = cx + Math.cos(rad) * r;
    const py = cy + Math.sin(rad) * r;
    pts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Biểu tượng sân bay quân sự công khai (đường băng + máy bay rõ nét kể cả sau khi bị gạch dấu X). */
const PublicAirfieldMarker2D: React.FC<{
  x: number;
  y: number;
  rot: number;
  crossProgress: number;
  fadeOut: number;
}> = ({ x, y, rot, crossProgress, fadeOut }) => {
  const dim = lerp(1, 0.46, crossProgress);
  return (
    <g transform={`translate(${x} ${y}) scale(1.12)`} opacity={1 - fadeOut * 0.75}>
      <g opacity={dim} filter="url(#sh)">
        <circle cx={0} cy={0} r={44} fill={PAL2D.panel} stroke={PAL2D.usHi} strokeWidth={2.8} />
        <circle cx={0} cy={0} r={35} fill="none" stroke={PAL2D.grid} strokeWidth={1.4} strokeDasharray="5 4" />
        <g transform={`rotate(${rot})`}>
          <rect x={-27} y={-5.5} width={54} height={11} rx={2} fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={1.8} />
          <line x1={-22} y1={0} x2={22} y2={0} stroke={PAL2D.chalk} strokeWidth={1.6} strokeDasharray="5 4" />
          <path
            d="M 15 0 L 4 -3.2 L -5 -17 L -10.5 -17 L -5.5 -3.2 L -15.5 -3.2 L -19.5 -8.5 L -22.5 -8.5 L -19.5 0 L -22.5 8.5 L -19.5 8.5 L -15.5 3.2 L -5.5 3.2 L -10.5 17 L -5 17 L 4 3.2 Z"
            fill={PAL2D.usHi}
            stroke={PAL2D.ink}
            strokeWidth={1.4}
          />
        </g>
      </g>

      {/* Dấu gạch X đỏ cam phủ nhận sự tồn tại của căn cứ không quân công khai */}
      {crossProgress > 0.01 && (
        <g>
          <path
            d="M -39 -39 L 39 39"
            fill="none"
            stroke={PAL2D.threatMid}
            strokeWidth={9}
            strokeLinecap="round"
            opacity={0.22 * crossProgress}
            {...drawOn(111, crossProgress)}
          />
          <path
            d="M -39 -39 L 39 39"
            fill="none"
            stroke={PAL2D.threatHi}
            strokeWidth={4.6}
            strokeLinecap="round"
            {...drawOn(111, crossProgress)}
          />
          <path
            d="M 39 -39 L -39 39"
            fill="none"
            stroke={PAL2D.threatMid}
            strokeWidth={9}
            strokeLinecap="round"
            opacity={0.22 * crossProgress}
            {...drawOn(111, Math.max(0, (crossProgress - 0.25) / 0.75))}
          />
          <path
            d="M 39 -39 L -39 39"
            fill="none"
            stroke={PAL2D.threatHi}
            strokeWidth={4.6}
            strokeLinecap="round"
            {...drawOn(111, Math.max(0, (crossProgress - 0.25) / 0.75))}
          />
        </g>
      )}
    </g>
  );
};

/** Biểu tượng chiếc loa / còi báo động tắt lịm đặt giữa tâm căn cứ vô hình. */
const SilentSirenIcon2D: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} filter="url(#sh)">
    <circle cx={0} cy={0} r={27} fill={PAL2D.bgConsole} stroke={PAL2D.concreteMid} strokeWidth={2.3} />
    <path
      d="M -14 -6 L -5 -6 L 7 -15 L 7 15 L -5 6 L -14 6 Z"
      fill={PAL2D.concreteMid}
      stroke={PAL2D.ink}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <rect x={-12} y={-4} width={6} height={5} fill={PAL2D.concreteHi} opacity={0.75} />
    <path d="M -5 -13 C -5 -20 3 -20 3 -13 Z" fill="#3a171a" stroke={PAL2D.ink} strokeWidth={1.6} />
    <path d="M 12 -8 A 11 11 0 0 1 12 8" fill="none" stroke={PAL2D.muted} strokeWidth={1.8} opacity={0.35} />
    <path d="M 16 -13 A 17 17 0 0 1 16 13" fill="none" stroke={PAL2D.muted} strokeWidth={1.8} opacity={0.24} />
    <line x1={9} y1={-13} x2={20} y2={13} stroke={PAL2D.threatMid} strokeWidth={2.8} strokeLinecap="round" />
  </g>
);

/** La bàn chỉ hướng Bắc & thước tỉ lệ bản đồ quân sự giúp khung đầu tiên đầy đặn ngay từ giây 43.6. */
const MapCartographyHud2D: React.FC = () => (
  <g opacity={0.85}>
    <g transform="translate(160 150)">
      <circle cx={0} cy={0} r={38} fill={PAL2D.bgConsole} fillOpacity={0.75} stroke={PAL2D.grid} strokeWidth={2} />
      <circle cx={0} cy={0} r={29} fill="none" stroke={PAL2D.grid} strokeWidth={1.1} strokeDasharray="4 4" />
      <polygon points="0,-31 8,-4 0,-10 -8,-4" fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={1.3} />
      <polygon points="0,31 7,4 0,10 -7,4" fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={1.3} />
      <line x1={-26} y1={0} x2={26} y2={0} stroke={PAL2D.muted} strokeWidth={1.4} />
    </g>
    {/* Thước tỉ lệ địa hình góc dưới trái bản đồ */}
    <g transform="translate(135 945)">
      <rect x={0} y={0} width={90} height={8} fill={PAL2D.chalk} stroke={PAL2D.ink} strokeWidth={1.6} opacity={0.75} />
      <rect x={90} y={0} width={90} height={8} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={1.6} opacity={0.75} />
      <rect x={180} y={0} width={90} height={8} fill={PAL2D.chalk} stroke={PAL2D.ink} strokeWidth={1.6} opacity={0.75} />
      <line x1={0} y1={-6} x2={0} y2={14} stroke={PAL2D.chalk} strokeWidth={2} />
      <line x1={135} y1={-4} x2={135} y2={12} stroke={PAL2D.chalk} strokeWidth={1.6} />
      <line x1={270} y1={-6} x2={270} y2={14} stroke={PAL2D.chalk} strokeWidth={2} />
    </g>
  </g>
);

const S03: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Đường đồng mức địa hình sa mạc đá sỏi bazan vùng đông bắc Jordan (tính 1 lần bằng useMemo)
  const topoLines = useMemo(() => contours('rukban-panhandle-s03', 2240, 1360, 11, 18, 470), []);

  const wadiPaths = useMemo(
    () => [
      smoothPath([
        [620, 410],
        [740, 480],
        [890, 520],
        [1045, 595],
        [1180, 710],
      ]),
      smoothPath([
        [980, 290],
        [1060, 355],
        [1120, 430],
        [1235, 505],
      ]),
      smoothPath([
        [190, 775],
        [525, 695],
        [875, 575],
        [1190, 430],
        [1405, 360],
      ]),
    ],
    []
  );

  // Chuyển động Cam2D đỉnh đầu:
  // 43.6 -> 56.7s: Toàn cảnh bản đồ đông bắc Jordan giáp Syria - Iraq
  // 56.7 -> 64.4s: Zoom sâu vào tâm ô tọa độ nét đứt trống rỗng & vòng đồng hồ 90 phút
  const pPanDrift = prog(t, 43.6, 56.7, Easing.inOut(Easing.sin));
  const pZoomClock = prog(t, 56.7, 60.3, Easing.inOut(Easing.cubic));
  const pFinalCreep = prog(t, 60.3, 64.4, Easing.out(Easing.quad));

  const camX = lerp(lerp(885, 965, pPanDrift), GHOST_X, pZoomClock);
  const camY = lerp(lerp(545, 485, pPanDrift), GHOST_Y, pZoomClock);
  const camZoom = lerp(0.98, 2.16, pZoomClock) + pFinalCreep * 0.14;
  const shake = handheld(t, lerp(1.8, 0.9, pZoomClock), 's03-map');

  // Tiến độ hiện ô tọa độ căn cứ vô hình nét đứt nhấp nháy (54.54s)
  const ghostReveal = prog(t, CUE.s03_ghost_base - 0.5, CUE.s03_ghost_base + 0.7, Easing.out(Easing.cubic));
  const ghostBlink = 0.5 + 0.5 * Math.abs(Math.sin(t * 5.4));

  // Tiến độ mở vòng đồng hồ 90 phút & 3 vòng cảm biến xanh quanh tâm căn cứ vô hình (từ 56.7s)
  const clockAppear = prog(t, 56.7, 58.0, Easing.out(Easing.cubic));
  const clockSweepP = prog(t, 57.0, 64.0, Easing.bezier(0.32, 0.04, 0.68, 0.98));
  const clockSweepDeg = clockSweepP * 270;

  // Đường bay lặng lẽ của chiếc Shahed2D đỏ (view="top") xuyên qua cả 3 vòng cảm biến xanh về phía còi tắt lịm
  const droneInfiltrateP = prog(t, 57.2, 64.1, Easing.bezier(0.25, 0.1, 0.65, 1));
  const approachPts: Pt[] = useMemo(
    () => [
      [GHOST_X + 108, GHOST_Y + 216],
      [GHOST_X + 60, GHOST_Y + 150],
      [GHOST_X + 26, GHOST_Y + 98],
      [GHOST_X + 7, GHOST_Y + 46],
    ],
    []
  );

  const segFloat = droneInfiltrateP * (approachPts.length - 1);
  const segIdx = Math.min(approachPts.length - 2, Math.floor(segFloat));
  const segFrac = segFloat - segIdx;
  const pA = approachPts[segIdx];
  const pB = approachPts[segIdx + 1];
  const shahedX = lerp(pA[0], pB[0], segFrac);
  const shahedY = lerp(pA[1], pB[1], segFrac);
  const shahedRot = (Math.atan2(pB[1] - pA[1], pB[0] - pA[0]) * 180) / Math.PI;
  const shahedDist = Math.hypot(shahedX - GHOST_X, shahedY - GHOST_Y);

  const sensorRadii = [176, 126, 78] as const;
  const clockArcD = clockArcPath(GHOST_X, GHOST_Y, 206, 0, clockSweepDeg);
  const handRad = ((clockSweepDeg - 90) * Math.PI) / 180;

  return (
    <AbsoluteFill>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <svg width={2240} height={1360} viewBox="0 0 2240 1360" style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(5, 10, 20, 0.48)" />
          <defs>
            <radialGradient id="s03MapVignette" cx="52%" cy="42%" r="65%">
              <stop offset="0%" stopColor="#172f4c" />
              <stop offset="65%" stopColor="#0e1e33" />
              <stop offset="100%" stopColor="#081220" />
            </radialGradient>
          </defs>

          <rect x={-160} y={-140} width={2560} height={1640} fill="url(#s03MapVignette)" />

          {/* Mảng địa hình mỏm đông bắc Jordan nổi khối rõ rệt */}
          <path d={JORDAN_PANHANDLE_D} fill="#1d334e" opacity={0.88} />
          <path
            d="M 640 480 C 820 385 1085 280 1265 245 C 1365 370 1350 530 1205 645 C 980 650 760 595 640 480 Z"
            fill={PAL2D.sandLo}
            opacity={0.18}
          />

          {/* Đường đồng mức địa hình cao nguyên đá sỏi Rukban */}
          <g transform="translate(-120 -100)">
            {topoLines.map(({ level, d }) => (
              <path
                key={level}
                d={d}
                fill="none"
                stroke={level >= 7 ? PAL2D.sandMid : level >= 4 ? PAL2D.sandLo : PAL2D.grid}
                strokeWidth={level % 3 === 0 ? 1.65 : 1.0}
                opacity={level >= 7 ? 0.4 : 0.27}
              />
            ))}
          </g>

          {/* Lòng suối cạn wadi & tuyến cao tốc sa mạc */}
          <path d={wadiPaths[0]} fill="none" stroke={PAL2D.grid} strokeWidth={1.6} opacity={0.44} />
          <path d={wadiPaths[1]} fill="none" stroke={PAL2D.grid} strokeWidth={1.4} opacity={0.4} />
          <path
            d={wadiPaths[2]}
            fill="none"
            stroke={PAL2D.sandHi}
            strokeWidth={2.2}
            strokeDasharray="12 8"
            opacity={0.38}
          />

          {/* Lưới kinh vĩ độ quân sự & dấu thập graticule */}
          <TacticalGrid2D x={-120} y={-100} w={2440} h={1520} step={90} major={360} opacity={0.26} />
          {[360, 720, 1080, 1440].map((gx) =>
            [260, 620, 980].map((gy) => (
              <g key={`${gx}_${gy}`} stroke={PAL2D.chalk} strokeWidth={1.4} opacity={0.36}>
                <line x1={gx - 8} y1={gy} x2={gx + 8} y2={gy} />
                <line x1={gx} y1={gy - 8} x2={gx} y2={gy + 8} />
              </g>
            ))
          )}

          {/* Đường biên giới quốc tế Jordan–Syria–Iraq vẽ nét kép */}
          <g>
            <path d={BORDER_SYRIA_JORDAN_D} fill="none" stroke={PAL2D.ink} strokeWidth={8} opacity={0.55} />
            <path
              d={BORDER_SYRIA_JORDAN_D}
              fill="none"
              stroke={PAL2D.amberMid}
              strokeWidth={3.4}
              strokeDasharray="16 8 4 8"
              strokeLinecap="round"
              opacity={0.88}
            />

            <path d={BORDER_IRAQ_JORDAN_D} fill="none" stroke={PAL2D.ink} strokeWidth={8} opacity={0.55} />
            <path
              d={BORDER_IRAQ_JORDAN_D}
              fill="none"
              stroke={PAL2D.amberMid}
              strokeWidth={3.4}
              strokeDasharray="16 8 4 8"
              strokeLinecap="round"
              opacity={0.88}
            />

            <path
              d={BORDER_SYRIA_IRAQ_D}
              fill="none"
              stroke={PAL2D.muted}
              strokeWidth={2.4}
              strokeDasharray="10 8"
              opacity={0.58}
            />
            <circle cx={1285} cy={215} r={7} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={2} />
          </g>

          <MapCartographyHud2D />

          {/* Các biểu tượng sân bay công khai hiện diện ngay từ đầu cảnh và bị gạch dấu X từ 48.88s */}
          {PUBLIC_AIRBASES.map((ab, idx) => {
            const crossP = prog(
              t,
              CUE.s03_blank_map + ab.delay,
              CUE.s03_blank_map + ab.delay + 0.65,
              Easing.out(Easing.cubic)
            );
            return (
              <PublicAirfieldMarker2D
                key={idx}
                x={ab.x}
                y={ab.y}
                rot={ab.rot}
                crossProgress={crossP}
                fadeOut={clockAppear}
              />
            );
          })}

          {/* Vòng quét nghi vấn ban đầu ở mỏm cực đông bắc Jordan để khung 1-3 luôn có điểm nhấn dẫn mắt */}
          {ghostReveal < 0.99 && (
            <g opacity={(1 - ghostReveal) * 0.65}>
              <circle
                cx={GHOST_X}
                cy={GHOST_Y}
                r={58 + 6 * Math.sin(t * 2.4)}
                fill="none"
                stroke={PAL2D.sandHi}
                strokeWidth={1.8}
                strokeDasharray="7 6"
              />
              <circle cx={GHOST_X} cy={GHOST_Y} r={4} fill={PAL2D.sandHi} />
            </g>
          )}

          {/* ==================== Ô TỌA ĐỘ CĂN CỨ VÔ HÌNH & ĐỒNG HỒ 90 PHÚT CÂM LẶNG ==================== */}
          {ghostReveal > 0.01 && (
            <g opacity={ghostReveal}>
              {/* Vùng sa mạc trống rỗng chỉ có khung nét đứt nhấp nháy nổi bật & 4 ngoặc góc khóa tọa độ */}
              <g opacity={lerp(ghostBlink, 0.95, clockAppear)}>
                <rect
                  x={GHOST_X - 54}
                  y={GHOST_Y - 54}
                  width={108}
                  height={108}
                  rx={5}
                  fill={PAL2D.amberMid}
                  fillOpacity={0.1}
                  stroke={PAL2D.amberHi}
                  strokeWidth={2.6}
                  strokeDasharray="9 6"
                />
                {([-1, 1] as const).map((sx) =>
                  ([-1, 1] as const).map((sy) => (
                    <path
                      key={`${sx}_${sy}`}
                      d={`M ${GHOST_X + sx * 64} ${GHOST_Y + sy * 42} L ${GHOST_X + sx * 64} ${GHOST_Y + sy * 64} L ${GHOST_X + sx * 42} ${GHOST_Y + sy * 64}`}
                      fill="none"
                      stroke={PAL2D.chalk}
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  ))
                )}
              </g>

              {/* Tâm ngắm rỗng đặt câu hỏi căn cứ vô hình trước khi mở đồng hồ 90 phút */}
              {clockAppear < 0.99 && (
                <g opacity={1 - clockAppear}>
                  <circle
                    cx={GHOST_X}
                    cy={GHOST_Y}
                    r={88}
                    fill="none"
                    stroke={PAL2D.amberMid}
                    strokeWidth={1.8}
                    strokeDasharray="10 8"
                    opacity={0.7}
                  />
                  <line x1={GHOST_X - 30} y1={GHOST_Y} x2={GHOST_X + 30} y2={GHOST_Y} stroke={PAL2D.amberHi} strokeWidth={2} />
                  <line x1={GHOST_X} y1={GHOST_Y - 30} x2={GHOST_X} y2={GHOST_Y + 30} stroke={PAL2D.amberHi} strokeWidth={2} />
                  <circle cx={GHOST_X} cy={GHOST_Y} r={16} fill="none" stroke={PAL2D.amberHi} strokeWidth={2.2} strokeDasharray="4 4" />
                </g>
              )}

              {/* VÒNG ĐỒNG HỒ 90 PHÚT & 3 VÒNG CẢM BIẾN XANH CÂM LẶNG (từ 56.7s) */}
              {clockAppear > 0.01 && (
                <g opacity={clockAppear}>
                  {sensorRadii.map((sr, idx) => {
                    const breached = shahedDist <= sr + 4;
                    return (
                      <g key={sr}>
                        <circle
                          cx={GHOST_X}
                          cy={GHOST_Y}
                          r={sr}
                          fill={idx === 0 ? PAL2D.usLo : 'none'}
                          fillOpacity={idx === 0 ? 0.12 : 0}
                          stroke={PAL2D.usMid}
                          strokeWidth={2.1}
                          strokeDasharray={idx === 1 ? '8 6' : undefined}
                          opacity={breached ? 0.38 : 0.72}
                        />
                        {Math.abs(shahedDist - sr) < 18 && (
                          <circle
                            cx={shahedX}
                            cy={shahedY}
                            r={12 + (18 - Math.abs(shahedDist - sr)) * 0.85}
                            fill="none"
                            stroke={PAL2D.usHi}
                            strokeWidth={1.8}
                            opacity={0.62}
                          />
                        )}
                      </g>
                    );
                  })}

                  {/* Tia quét radar xanh quay chậm hướng về phía Bắc-Đông, bỏ lọt bóng đỏ ở hướng Nam */}
                  <g transform={`translate(${GHOST_X} ${GHOST_Y}) rotate(${-42 + Math.sin(t * 1.1) * 30})`}>
                    <line x1={0} y1={0} x2={0} y2={-176} stroke={PAL2D.ewTeal} strokeWidth={2} opacity={0.58} />
                    <path d="M 0 0 L -40 -171 A 176 176 0 0 1 0 -176 Z" fill={PAL2D.ewTeal} opacity={0.12} />
                  </g>

                  {/* Vành mặt đồng hồ đếm ngược 90 phút bên ngoài (r = 206 px) */}
                  <circle
                    cx={GHOST_X}
                    cy={GHOST_Y}
                    r={206}
                    fill="none"
                    stroke={PAL2D.grid}
                    strokeWidth={6.5}
                    opacity={0.48}
                  />
                  {Array.from({ length: 60 }, (_, k) => {
                    const a = ((k * 6 - 90) * Math.PI) / 180;
                    const major = k % 5 === 0;
                    const rIn = major ? 190 : 197;
                    const rOut = 206;
                    return (
                      <line
                        key={k}
                        x1={GHOST_X + Math.cos(a) * rIn}
                        y1={GHOST_Y + Math.sin(a) * rIn}
                        x2={GHOST_X + Math.cos(a) * rOut}
                        y2={GHOST_Y + Math.sin(a) * rOut}
                        stroke={major ? PAL2D.chalk : PAL2D.muted}
                        strokeWidth={major ? 2.3 : 1.1}
                        opacity={major ? 0.88 : 0.45}
                      />
                    );
                  })}

                  {/* Cung đồng hồ 90 phút quét tiến độ (nét kép halo + lõi sáng) */}
                  {clockArcD && (
                    <g>
                      <path
                        d={clockArcD}
                        fill="none"
                        stroke={PAL2D.amberMid}
                        strokeWidth={14}
                        strokeLinecap="round"
                        opacity={0.22}
                      />
                      <path
                        d={clockArcD}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={4.8}
                        strokeLinecap="round"
                      />
                    </g>
                  )}

                  {/* Kim đồng hồ quét theo đầu mút cung 90 phút */}
                  <line
                    x1={GHOST_X + Math.cos(handRad) * 34}
                    y1={GHOST_Y + Math.sin(handRad) * 34}
                    x2={GHOST_X + Math.cos(handRad) * 204}
                    y2={GHOST_Y + Math.sin(handRad) * 204}
                    stroke={PAL2D.amberHi}
                    strokeWidth={2.2}
                    strokeDasharray="6 4"
                    opacity={0.88}
                  />
                  <circle
                    cx={GHOST_X + Math.cos(handRad) * 206}
                    cy={GHOST_Y + Math.sin(handRad) * 206}
                    r={6}
                    fill={PAL2D.amberHi}
                    stroke={PAL2D.ink}
                    strokeWidth={1.8}
                  />

                  {/* Biểu tượng còi báo động tắt lịm đặt ngay chính tâm ô nét đứt */}
                  <SilentSirenIcon2D x={GHOST_X} y={GHOST_Y} scale={1.18} />

                  {/* Vệt đường bay đỏ & Bóng chiếc Shahed2D (view="top", nhỏ đỏ) xuyên qua 3 vòng cảm biến */}
                  {droneInfiltrateP > 0.01 && (
                    <g>
                      <path
                        d={`M ${approachPts[0][0]} ${approachPts[0][1]} L ${shahedX.toFixed(1)} ${shahedY.toFixed(1)}`}
                        fill="none"
                        stroke={PAL2D.threatMid}
                        strokeWidth={6.5}
                        strokeLinecap="round"
                        opacity={0.2}
                      />
                      <path
                        d={`M ${approachPts[0][0]} ${approachPts[0][1]} L ${shahedX.toFixed(1)} ${shahedY.toFixed(1)}`}
                        fill="none"
                        stroke={PAL2D.threatHi}
                        strokeWidth={2.2}
                        strokeDasharray="5 4"
                        strokeLinecap="round"
                        opacity={0.9}
                      />
                      <circle
                        cx={shahedX}
                        cy={shahedY}
                        r={26}
                        fill="none"
                        stroke={PAL2D.threatMid}
                        strokeWidth={1.5}
                        strokeDasharray="4 4"
                        opacity={0.55}
                      />
                      <g filter="url(#sh)">
                        <Shahed2D
                          x={shahedX}
                          y={shahedY}
                          rot={shahedRot}
                          scale={0.42}
                          view="top"
                          propAngle={t * 38}
                          tint="threat"
                        />
                      </g>
                    </g>
                  )}
                </g>
              )}
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* Nhãn chữ duy nhất của cảnh S03 đặt ở góc trên trái thoáng đãng, không chèn lên vành đồng hồ */}
      <Label
        t={t}
        text="90 PHÚT"
        x={310}
        y={136}
        from={CUE.s03_clock90}
        until={64.2}
        size={56}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S03;
