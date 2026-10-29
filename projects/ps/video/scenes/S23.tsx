// S23 (419.10 – 436.98s, 2D):
// Sa bàn đối xứng chiến lược hai chiều trên nền bản đồ đồng mức TopoMapBg2D:
// - 419.1 – 429.7s: Bên trái là bóng PatriotLauncher2D mờ lùi lại, trục đối xứng giữa lật sáng sang bên phải là S400Launcher2D
//   với 4 ống phóng đứng 48N6 sẵn sàng (4 / 4 nắp xanh lúc 426.88s).
// - 430.36 – 436.98s: Cam2D lia mở không phận phía trái khi từng đợt UAV cánh cố định giá rẻ của Ukraine tràn sang theo lớp;
//   S400Launcher2D liên tiếp phụt Muzzle2D (angle=-90) ở 432.0s, 433.1s, 434.2s, 435.3s vẽ 4 đường cung arcPath hạ 4 chiếc đầu,
//   rút cạn loadedCount 4 -> 3 -> 2 -> 1 -> 0 giữa lúc cả bầy UAV và tên lửa nặng phía sau vẫn ùn ùn kéo tới.
import React from 'react';
import { Easing } from 'remotion';
import { FONT, lerp, prog } from '@kit/theme';
import { Label, handheld, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D, Muzzle2D, Puff2D } from '@lib/2d/fx';
import { arcAngle, arcAt, arcPath } from '@lib/2d/path';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  GlowLine2D,
  Kh101_2D,
  PatriotLauncher2D,
  PatriotQuadFace2D,
  S400Launcher2D,
  Shahed136_2D,
  TopoMapBg2D,
} from '../local/assets2d';

// Vị trí đặt xe S400Launcher2D (scale = 0.48, flip = true, mặt đất tại y = 815)
const S400_X = 1410;
const S400_Y = 815;
const S400_SCALE = 0.48;
const TUBE_TOP_Y = S400_Y - 842 * S400_SCALE; // 410.8 px

// Với flip = true, tube idx (0..3) có tâm X thế giới = S400_X + (504 - idx * 96) * S400_SCALE.
// Khi loadedCount giảm 4 -> 3 -> 2 -> 1 -> 0, lần lượt ống idx = 3, 2, 1, 0 chuyển từ xanh sang rỗng đỏ!
const tubeWorldX = (idx: number) => S400_X + (504 - idx * 96) * S400_SCALE;

type InterceptShot = {
  tubeIdx: number;
  fireAt: number;
  hitAt: number;
  apex: number;
  uavStartX: number;
  uavY: number;
  uavSpeed: number;
  kind: 'fixed' | 'delta';
};

const FOUR_INTERCEPTS: InterceptShot[] = [
  { tubeIdx: 3, fireAt: 432.0, hitAt: 432.84, apex: 195, uavStartX: 250, uavY: 315, uavSpeed: 195, kind: 'fixed' },
  { tubeIdx: 2, fireAt: 433.1, hitAt: 433.94, apex: 225, uavStartX: 115, uavY: 455, uavSpeed: 185, kind: 'delta' },
  { tubeIdx: 1, fireAt: 434.2, hitAt: 435.04, apex: 180, uavStartX: 55, uavY: 235, uavSpeed: 190, kind: 'fixed' },
  { tubeIdx: 0, fireAt: 435.3, hitAt: 436.14, apex: 235, uavStartX: -95, uavY: 575, uavSpeed: 182, kind: 'fixed' },
];

type SwarmFollower = {
  x0: number;
  y: number;
  speed: number;
  scale: number;
  kind: 'fixed' | 'delta' | 'heavy';
  appearAt: number;
};

// 15 chiếc UAV giá rẻ theo sau + 4 tên lửa chiến thuật hạng nặng ùn ùn tràn tới khi S-400 đã hết sạch 4 ống
const SWARM_WAVE: SwarmFollower[] = [
  { x0: -40, y: 275, speed: 175, scale: 0.86, kind: 'fixed', appearAt: 430.5 },
  { x0: -135, y: 390, speed: 172, scale: 0.84, kind: 'delta', appearAt: 430.6 },
  { x0: -195, y: 515, speed: 168, scale: 0.88, kind: 'fixed', appearAt: 430.8 },
  { x0: -250, y: 195, speed: 176, scale: 0.82, kind: 'fixed', appearAt: 430.9 },
  { x0: -310, y: 340, speed: 174, scale: 0.85, kind: 'delta', appearAt: 431.1 },
  { x0: -365, y: 635, speed: 170, scale: 0.84, kind: 'fixed', appearAt: 431.2 },
  { x0: -430, y: 255, speed: 175, scale: 0.86, kind: 'delta', appearAt: 431.4 },
  { x0: -485, y: 445, speed: 172, scale: 0.88, kind: 'fixed', appearAt: 431.6 },
  { x0: -545, y: 555, speed: 168, scale: 0.82, kind: 'fixed', appearAt: 431.8 },
  { x0: -610, y: 305, speed: 176, scale: 0.85, kind: 'fixed', appearAt: 432.0 },
  { x0: -670, y: 185, speed: 174, scale: 0.80, kind: 'delta', appearAt: 432.2 },
  { x0: -725, y: 495, speed: 172, scale: 0.86, kind: 'fixed', appearAt: 432.4 },
  { x0: -790, y: 385, speed: 175, scale: 0.84, kind: 'delta', appearAt: 432.6 },
  { x0: -855, y: 615, speed: 170, scale: 0.85, kind: 'fixed', appearAt: 432.8 },
  { x0: -910, y: 245, speed: 174, scale: 0.82, kind: 'fixed', appearAt: 433.0 },
  // Lớp tên lửa hạng nặng tốc độ cao lao theo ngay phía sau đàn UAV mồi nhử
  { x0: -860, y: 285, speed: 295, scale: 0.145, kind: 'heavy', appearAt: 433.4 },
  { x0: -980, y: 420, speed: 300, scale: 0.15, kind: 'heavy', appearAt: 433.7 },
  { x0: -1080, y: 205, speed: 292, scale: 0.14, kind: 'heavy', appearAt: 434.0 },
  { x0: -1150, y: 545, speed: 298, scale: 0.145, kind: 'heavy', appearAt: 434.2 },
];

/** Hình chiếu từ trên/chéo của UAV cánh bằng giá rẻ Ukraine (cánh thẳng sải rộng, đuôi kép twin-boom, vạch nhận diện xanh-vàng). */
const UkraineFixedWingUAV2D: React.FC<{ x: number; y: number; scale?: number; rot?: number }> = ({
  x,
  y,
  scale = 1,
  rot = 0,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    {/* Cánh chính thẳng sải rộng */}
    <rect x={-10} y={-56} width={22} height={112} rx={5} fill="#c8d4e0" stroke={PAL2D.stroke} strokeWidth={2.2} />
    <rect x={2} y={-54} width={8} height={108} rx={3} fill="#e6eef7" />
    {/* Vạch sơn nhận diện vàng - xanh dương trên hai đầu mút cánh */}
    <rect x={-9} y={-52} width={20} height={10} fill="#2e82e6" />
    <rect x={-9} y={-42} width={20} height={10} fill="#f5cb38" />
    <rect x={-9} y={32} width={20} height={10} fill="#f5cb38" />
    <rect x={-9} y={42} width={20} height={10} fill="#2e82e6" />
    {/* Hai dầm đuôi mảnh (twin-boom) + cánh ngang đuôi */}
    <rect x={-46} y={-19} width={38} height={4.5} fill="#8292a3" stroke={PAL2D.stroke} strokeWidth={1.4} />
    <rect x={-46} y={14.5} width={38} height={4.5} fill="#8292a3" stroke={PAL2D.stroke} strokeWidth={1.4} />
    <rect x={-50} y={-23} width={9} height={46} rx={2.5} fill="#aebbc9" stroke={PAL2D.stroke} strokeWidth={1.8} />
    {/* Thân chính mũi bầu + chân vịt đẩy phía sau */}
    <path
      d="M -26 -8 L 24 -8 C 36 -8, 44 -3, 46 0 C 44 3, 36 8, 24 8 L -26 8 Z"
      fill="#d7e1ec"
      stroke={PAL2D.stroke}
      strokeWidth={2.2}
    />
    <ellipse cx={28} cy={0} rx={7} ry={3.8} fill="#2a3f57" />
    <rect x={-31} y={-12} width={4} height={24} rx={1.5} fill={PAL2D.ink} opacity={0.8} />
  </g>
);

/** Đạn đánh chặn 48N6 của S-400 bay trên đường cung 2D. */
const Interceptor48N6_2D: React.FC<{ x: number; y: number; rot: number }> = ({ x, y, rot }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    <polygon points="-28,-5 -52,0 -28,5" fill={PAL2D.amber} opacity={0.85} />
    <polygon points="-28,-2.8 -42,0 -28,2.8" fill={PAL2D.amberHot} />
    <polygon points="-26,-7 -18,-7 -22,-13 -27,-12" fill={PAL2D.ruOliveDark} />
    <polygon points="-26,7 -18,7 -22,13 -27,12" fill={PAL2D.ruOliveDark} />
    <path
      d="M -27 -5.5 L 14 -5.5 L 28 0 L 14 5.5 L -27 5.5 Z"
      fill="#dce5ee"
      stroke={PAL2D.stroke}
      strokeWidth={1.8}
    />
  </g>
);

const S23: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Cơ số đạn S-400 trên bệ phóng: 4 -> 3 -> 2 -> 1 -> 0 theo 4 phát bắn 432.0s, 433.1s, 434.2s, 435.3s
  const shotsFired = FOUR_INTERCEPTS.filter((s) => t >= s.fireAt).length;
  const loadedCount = Math.max(0, 4 - shotsFired);

  // Nhịp lật sáng đối xứng từ Patriot (trái) sang S-300/S-400 (phải) lúc 421.7 – 422.8s
  const pFlipToRu = prog(t, 421.65, 422.85, Easing.bezier(0.4, 0, 0.2, 1));
  // Nhấn mạnh 4 ống phóng giới hạn trên bệ lúc 426.88s
  const pHighlight4 = prog(t, CUE.s23_limited_tubes - 0.15, CUE.s23_limited_tubes + 0.55);

  // Pha 2 (429.7 – 431.4s): Cam2D lia mở rộng không phận phía trái để đón bầy UAV giá rẻ của Ukraine
  const pPanAirspace = prog(t, 429.7, 431.35, Easing.bezier(0.38, 0, 0.2, 1));
  const patriotFadeOut = 1 - prog(t, 429.55, 430.75);

  const camX = lerp(960, 785, pPanAirspace);
  const camY = lerp(540, 515, pPanAirspace);
  const camZoom = lerp(
    lerp(1.0, 1.03, prog(t, 419.1, 428.5)),
    0.92,
    pPanAirspace,
  );

  // Rung nhẹ khi S-400 phụt ống phóng đứng
  const launchBump = FOUR_INTERCEPTS.reduce(
    (acc, s) => acc + Math.max(0, 1 - Math.abs(t - s.fireAt) / 0.25),
    0,
  );
  const shake = handheld(t, 1.6 + 2.8 * Math.min(1, launchBump), 's23_cam');

  const uavBaseT = 430.25;
  const redPulse = 0.55 + 0.45 * Math.sin(t * 9.0);

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: PAL2D.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgDeep}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ overflow: 'visible' }}>
          <Defs2D />

          {/* Nền bản đồ đồng mức chiến dịch rộng cho cả khung đối xứng và cú lia mở không phận phía trái */}
          <TopoMapBg2D w={3800} h={2100} seed="s23_topo_board" cx={820} cy={520} />

          {/* Vòm bán kính bảo vệ & đường chân đế sa bàn chiến thuật */}
          <g>
            {[460, 760, 1080].map((r, i) => (
              <path
                key={r}
                d={`M ${S400_X + 120 - r} ${S400_Y} A ${r} ${r} 0 0 1 ${S400_X + 120 + r * 0.35} ${S400_Y - r * 0.93}`}
                fill="none"
                stroke={loadedCount === 0 ? PAL2D.red : PAL2D.cyan}
                strokeWidth={i === 1 ? 2.2 : 1.3}
                strokeDasharray="10 10"
                opacity={0.14 + 0.16 * pPanAirspace}
              />
            ))}
            <line x1={-550} y1={S400_Y + 2} x2={1950} y2={S400_Y + 2} stroke={PAL2D.grid} strokeWidth={3} opacity={0.55} />
          </g>

          {/* ==================================================================================== */}
          {/* NỬA TRÁI PHA 1: THẺ KHẨU ĐỘI MỸ PATRIOT (0/16) MỜ LÙI LẠI ĐỂ ĐỐI XỨNG VỚI S-400      */}
          {/* ==================================================================================== */}
          {patriotFadeOut > 0.01 && (
            <g
              opacity={patriotFadeOut * lerp(0.92, 0.34, pFlipToRu)}
              transform={`translate(${lerp(0, -24, pFlipToRu)} ${lerp(0, 10, pFlipToRu)})`}
            >
              <rect
                x={145}
                y={265}
                width={735}
                height={595}
                rx={18}
                fill="#0b1b2e"
                stroke={PAL2D.grid}
                strokeWidth={2.4}
                filter="url(#sh)"
              />
              {/* Dải trạng thái cạn đạn 0 / 16 phía Patriot */}
              <rect x={635} y={300} width={210} height={54} rx={9} fill="#1b0d14" stroke={PAL2D.red} strokeWidth={2} />
              <text
                x={740}
                y={337}
                textAnchor="middle"
                fill={PAL2D.red}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={30}
              >
                0 / 16
              </text>

              <PatriotQuadFace2D x={740} y={465} size={154} loadedCount={0} showNumbers={false} />
              <PatriotLauncher2D x={435} y={S400_Y} scale={0.42} elev={36} />
              <line x1={185} y1={S400_Y + 2} x2={845} y2={S400_Y + 2} stroke={PAL2D.groundLine} strokeWidth={4} />
            </g>
          )}

          {/* TRỤC ĐỐI XỨNG CHIẾN LƯỢC Ở GIỮA (x = 960) — LẬT SÁNG SANG PHẢI LÚC 421.8s */}
          {patriotFadeOut > 0.01 && (
            <g opacity={patriotFadeOut}>
              <GlowLine2D
                d="M 960 235 L 960 885"
                color={pFlipToRu > 0.3 ? PAL2D.amber : PAL2D.cyan}
                width={3.8}
                dash="12 8"
              />
              {/* Huy hiệu thoi đối xứng hai chiều ở tâm (960, 555) */}
              <g transform="translate(960 555)">
                <polygon
                  points="0,-46 46,0 0,46 -46,0"
                  fill="#0e2238"
                  stroke={pFlipToRu > 0.3 ? PAL2D.amberHot : PAL2D.cyan}
                  strokeWidth={3}
                  filter="url(#sh)"
                />
                {/* Mũi tên kép đối xứng hai phía ⇄ */}
                <path
                  d="M -20 -8 L 18 -8 L 10 -16 M 20 8 L -18 8 L -10 16"
                  fill="none"
                  stroke={PAL2D.paper}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            </g>
          )}

          {/* ==================================================================================== */}
          {/* NỬA PHẢI (GIỮ XUYÊN SUỐT CẢNH): KHẨU ĐỘI S-300 / S-400 NGA VỚI 4 ỐNG PHÓNG ĐỨNG 48N6 */}
          {/* ==================================================================================== */}
          <g opacity={lerp(0.62, 1.0, pFlipToRu)}>
            {/* Đế thẻ sa bàn dưới chân xe S-400 */}
            <rect
              x={1040}
              y={265}
              width={745}
              height={595}
              rx={18}
              fill="#0c1f33"
              fillOpacity={lerp(0.88, 0.42, pPanAirspace)}
              stroke={loadedCount === 0 ? PAL2D.red : pFlipToRu > 0.4 ? PAL2D.green : PAL2D.grid}
              strokeWidth={2.8}
            />
            <line x1={1065} y1={S400_Y + 2} x2={1760} y2={S400_Y + 2} stroke={PAL2D.groundLine} strokeWidth={5} />

            {/* Xe bệ phóng S-400 Triumf 8×8 dựng thẳng 4 ống phóng (loadedCount: 4 -> 3 -> 2 -> 1 -> 0) */}
            <g filter="url(#sh)">
              <S400Launcher2D
                x={S400_X}
                y={S400_Y}
                scale={S400_SCALE}
                flip
                loadedCount={loadedCount}
              />
            </g>

            {/* Bảng chỉ thị cơ số 4 ống phóng đứng đặt thoáng phía trên đầu cabin S-400 (không bị khói phóng Muzzle2D che khuất) */}
            <g
              transform="translate(1228 334)"
              opacity={0.35 + 0.65 * Math.max(pFlipToRu, pHighlight4)}
            >
              <rect
                x={-139}
                y={-30}
                width={278}
                height={58}
                rx={10}
                fill={loadedCount === 0 ? '#210910' : '#0c2420'}
                stroke={loadedCount === 0 ? PAL2D.red : PAL2D.green}
                strokeWidth={2.6}
                opacity={loadedCount === 0 ? 0.76 + 0.24 * redPulse : 1}
              />
              {/* 4 đèn tròn tương ứng thứ tự 4 ống phóng đứng từ trái qua phải (idx: 3, 2, 1, 0) */}
              {[3, 2, 1, 0].map((tIdx, posIdx) => {
                const armed = tIdx < loadedCount;
                const lx = -104 + posIdx * 34;
                return (
                  <g key={tIdx}>
                    <circle
                      cx={lx}
                      cy={-1}
                      r={10.5}
                      fill={armed ? PAL2D.green : '#1a0c10'}
                      stroke={armed ? '#ffffff' : PAL2D.red}
                      strokeWidth={2}
                    />
                    {!armed && (
                      <path
                        d={`M ${lx - 5} ${-6} L ${lx + 5} ${4} M ${lx + 5} ${-6} L ${lx - 5} ${4}`}
                        stroke={PAL2D.red}
                        strokeWidth={1.8}
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              })}
              <line
                x1={24}
                y1={-17}
                x2={24}
                y2={16}
                stroke={loadedCount === 0 ? PAL2D.red : PAL2D.green}
                strokeWidth={1.6}
                opacity={0.55}
              />
              <text
                x={82}
                y={9}
                textAnchor="middle"
                fill={loadedCount === 0 ? PAL2D.red : PAL2D.paper}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={30}
              >
                {loadedCount} / 4
              </text>
            </g>

            {/* Vạch sáng báo ống rỗng đỏ ngay tại vành miệng từng ống S-400 vừa phóng hết đạn */}
            {[3, 2, 1, 0].map((tIdx) => {
              const armed = tIdx < loadedCount;
              const tx = tubeWorldX(tIdx);
              if (armed) return null;
              return (
                <g key={`empty_cap_${tIdx}`} opacity={0.7 + 0.3 * redPulse}>
                  <rect
                    x={tx - 16}
                    y={TUBE_TOP_Y - 7}
                    width={32}
                    height={6}
                    rx={2}
                    fill={PAL2D.red}
                  />
                </g>
              );
            })}

            {/* Khói xám mỏng bốc nhẹ từ miệng ống S-400 vừa bắn rỗng */}
            {FOUR_INTERCEPTS.map((s, i) => {
              const dt = t - s.fireAt;
              if (dt <= 0.18) return null;
              const tx = tubeWorldX(s.tubeIdx);
              const drift = (dt * 24) % 48;
              return (
                <Puff2D
                  key={`sm_${i}`}
                  x={tx + Math.sin(t * 2 + i) * 5}
                  y={TUBE_TOP_Y - 14 - drift}
                  r={8 + (drift / 48) * 11}
                  color="#9aa5b1"
                  opacity={0.3 * (1 - drift / 48)}
                  seed={2310 + i}
                />
              );
            })}
          </g>

          {/* ==================================================================================== */}
          {/* PHA 2 (430.25 – 436.98s): BẦY UAV GIÁ RẺ UKRAINE BÒN RÚT HẾT 4 ỐNG PHÓNG S-400       */}
          {/* ==================================================================================== */}

          {/* 1) 4 chiếc UAV đi đầu bị 4 đạn 48N6 của S-400 bắn hạ (tiêu tốn sạch cả 4 ống phóng!) */}
          {FOUR_INTERCEPTS.map((shot, idx) => {
            if (t < uavBaseT) return null;
            const uavAppear = prog(t, uavBaseT + idx * 0.12, uavBaseT + idx * 0.12 + 0.45);
            const curUavX = shot.uavStartX + (t - uavBaseT) * shot.uavSpeed;
            const hitX = shot.uavStartX + (shot.hitAt - uavBaseT) * shot.uavSpeed;
            const hitY = shot.uavY;
            const alive = t < shot.hitAt;

            const startX = tubeWorldX(shot.tubeIdx);
            const startY = TUBE_TOP_Y;
            const pFlight = (t - shot.fireAt) / (shot.hitAt - shot.fireAt);
            const dtAfterHit = t - shot.hitAt;

            return (
              <g key={`lead_${idx}`}>
                {/* Chiếc UAV mồi nhử đang bay vào (trước khi bị trúng đạn đánh chặn) */}
                {alive && uavAppear > 0.01 && (
                  <g opacity={uavAppear}>
                    <line
                      x1={curUavX - 130}
                      y1={shot.uavY}
                      x2={curUavX - 32}
                      y2={shot.uavY}
                      stroke={PAL2D.amber}
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      opacity={0.55}
                    />
                    {shot.kind === 'fixed' ? (
                      <UkraineFixedWingUAV2D x={curUavX} y={shot.uavY} scale={0.95} />
                    ) : (
                      <Shahed136_2D x={curUavX} y={shot.uavY} scale={0.21} view="top" />
                    )}
                    {/* Vòng khóa mục tiêu trên sa bàn khi S-400 chuẩn bị phóng đạn */}
                    {t >= shot.fireAt - 0.35 && (
                      <circle
                        cx={curUavX}
                        cy={shot.uavY}
                        r={28}
                        fill="none"
                        stroke={PAL2D.green}
                        strokeWidth={2}
                        strokeDasharray="5 4"
                      />
                    )}
                  </g>
                )}

                {/* Lửa đầu ống phóng đứng angle = -90 tại đúng miệng ống thứ tubeIdx */}
                <Muzzle2D
                  t={t}
                  at={shot.fireAt}
                  x={startX}
                  y={startY}
                  angle={-90}
                  size={34}
                  seed={2330 + idx}
                />

                {/* Đường cung đánh chặn arcPath từ đỉnh ống phóng S-400 tới chiếc UAV */}
                {pFlight > 0 && dtAfterHit < 1.8 && (
                  <>
                    <GlowLine2D
                      d={arcPath(startX, startY, hitX, hitY, shot.apex, Math.min(1, pFlight), 48)}
                      color={PAL2D.green}
                      core="#ffffff"
                      width={3.2}
                      opacity={dtAfterHit > 0 ? Math.max(0, 1 - dtAfterHit / 1.8) : 0.92}
                    />
                    {pFlight <= 1 && (
                      <Interceptor48N6_2D
                        x={arcAt(startX, startY, hitX, hitY, shot.apex, pFlight)[0]}
                        y={arcAt(startX, startY, hitX, hitY, shot.apex, pFlight)[1]}
                        rot={arcAngle(startX, startY, hitX, hitY, shot.apex, pFlight)}
                      />
                    )}
                  </>
                )}

                {/* Chớp nổ trên không tiêu diệt 4 chiếc UAV đầu tiên */}
                <Blast2D
                  t={t}
                  at={shot.hitAt}
                  x={hitX}
                  y={hitY}
                  size={44}
                  air
                  life={2.2}
                  seed={2360 + idx}
                />
              </g>
            );
          })}

          {/* 2) Cả bầy 15 UAV giá rẻ + 4 tên lửa nặng phía sau vẫn ùn ùn kéo tới áp sát khẩu đội đã 0 / 4! */}
          {SWARM_WAVE.map((sw, idx) => {
            if (t < sw.appearAt) return null;
            const op = prog(t, sw.appearAt, sw.appearAt + 0.5);
            const curX = sw.x0 + (t - uavBaseT) * sw.speed;
            const curY = sw.y + Math.sin(t * 2.2 + idx * 1.3) * 4;
            if (curX < -420 || curX > 1340) return null;

            return (
              <g key={`sw_${idx}`} opacity={op}>
                {sw.kind === 'heavy' ? (
                  <g>
                    <GlowLine2D
                      d={`M ${curX - 185} ${curY} L ${curX - 55} ${curY}`}
                      color={PAL2D.red}
                      core={PAL2D.amberHot}
                      width={3.6}
                      opacity={0.85}
                    />
                    <Kh101_2D x={curX} y={curY} scale={sw.scale} flame={0.95} />
                  </g>
                ) : (
                  <g>
                    <line
                      x1={curX - 95}
                      y1={curY}
                      x2={curX - 28}
                      y2={curY}
                      stroke={PAL2D.amber}
                      strokeWidth={1.6}
                      strokeDasharray="5 6"
                      opacity={0.48}
                    />
                    {sw.kind === 'fixed' ? (
                      <UkraineFixedWingUAV2D x={curX} y={curY} scale={sw.scale} />
                    ) : (
                      <Shahed136_2D x={curX} y={curY} scale={sw.scale * 0.22} view="top" />
                    )}
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* Nhãn duy nhất của cảnh S23 */}
      <Label
        t={t}
        text="S-300 / S-400"
        x={960}
        y={140}
        from={CUE.s23_s300_s400}
        until={426.8}
      />
    </div>
  );
};

export default S23;
