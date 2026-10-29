import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { handheld, Label, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { arcAngle, arcAt, arcPath } from '@lib/2d/path';
import { Puff2D } from '@lib/2d/fx';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { Coyote2D, Kurfs2D, Shahed2D, TacticalGrid2D } from '../local/draw2d';

/** Vệ tinh cảnh giới & truyền tin quỹ đạo cao (đổ khối 3 tông lam thép + tấm pin quang điện vàng hổ phách). */
const DefenseSatellite2D: React.FC<{ x: number; y: number; rot?: number; scale?: number }> = ({
  x,
  y,
  rot = -14,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`} filter="url(#sh)">
    {([-1, 1] as const).map((side) => (
      <g key={side} transform={`translate(${side * 34} 0)`}>
        <line x1={0} y1={0} x2={side * 16} y2={0} stroke={PAL2D.concreteHi} strokeWidth={3} />
        <rect
          x={side > 0 ? 16 : -122}
          y={-20}
          width={106}
          height={40}
          rx={3}
          fill={PAL2D.usLo}
          stroke={PAL2D.ink}
          strokeWidth={2.5}
        />
        <rect
          x={side > 0 ? 20 : -118}
          y={-16}
          width={98}
          height={15}
          fill={PAL2D.usMid}
          opacity={0.75}
        />
        {[1, 2, 3].map((k) => {
          const lx = (side > 0 ? 16 : -122) + k * 26.5;
          return <line key={k} x1={lx} y1={-19} x2={lx} y2={19} stroke={PAL2D.usHi} strokeWidth={1.3} opacity={0.65} />;
        })}
        <line
          x1={side > 0 ? 17 : -121}
          y1={0}
          x2={side > 0 ? 121 : -17}
          y2={0}
          stroke={PAL2D.usHi}
          strokeWidth={1.3}
          opacity={0.65}
        />
      </g>
    ))}

    <rect x={-32} y={-24} width={64} height={48} rx={6} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.8} />
    <rect x={-28} y={-20} width={56} height={18} rx={3} fill={PAL2D.concreteHi} opacity={0.85} />
    <rect x={-16} y={-14} width={32} height={28} rx={3} fill={PAL2D.amberMid} stroke={PAL2D.ink} strokeWidth={2.2} />
    <rect x={-13} y={-11} width={26} height={10} fill={PAL2D.amberHi} opacity={0.8} />

    <path d="M-24 24 C-18 42 18 42 24 24 Z" fill={PAL2D.usHi} stroke={PAL2D.ink} strokeWidth={2.4} />
    <line x1={0} y1={34} x2={0} y2={50} stroke={PAL2D.chalk} strokeWidth={2.4} />
    <circle cx={0} cy={52} r={4.5} fill={PAL2D.ewTeal} stroke={PAL2D.ink} strokeWidth={1.8} />
  </g>
);

/** Vòm radar cảnh giới chiến lược & tháp C2 đặt trên bệ công sự (đổ khối 3 tông). */
const StrategicRadome2D: React.FC<{ x: number; y: number; sweepDeg: number }> = ({ x, y, sweepDeg }) => (
  <g transform={`translate(${x} ${y})`} filter="url(#sh)">
    <rect x={-116} y={-36} width={232} height={36} rx={4} fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={2.8} />
    <rect x={-112} y={-33} width={224} height={10} rx={2} fill={PAL2D.concreteMid} opacity={0.75} />
    <rect x={-82} y={-80} width={164} height={44} rx={3} fill={PAL2D.panelHi} stroke={PAL2D.ink} strokeWidth={2.8} />
    <rect x={-74} y={-74} width={68} height={32} fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2} />
    <rect x={8} y={-74} width={66} height={32} fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2} />

    <path d="M-78 -80 C-90 -188 90 -188 78 -80 Z" fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={3} />
    <path d="M-72 -82 C-78 -174 18 -180 24 -82 Z" fill={PAL2D.concreteHi} opacity={0.78} />
    <path
      d="M-68 -112 L68 -112 M-52 -142 L52 -142 M0 -164 L-40 -80 M0 -164 L40 -80 M-48 -142 L0 -80 L48 -142"
      fill="none"
      stroke={PAL2D.concreteLo}
      strokeWidth={1.6}
      opacity={0.7}
    />

    <rect x={96} y={-154} width={8} height={118} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.2} />
    <g transform={`translate(100 -158) rotate(${sweepDeg})`}>
      <path d="M-24 -15 C-9 6 9 6 24 -15" fill="none" stroke={PAL2D.usHi} strokeWidth={3.2} strokeLinecap="round" />
      <line x1={0} y1={-3} x2={0} y2={-20} stroke={PAL2D.ewTeal} strokeWidth={2.4} />
    </g>
  </g>
);

/** Đài radar mảng pha cảnh giới tầm xa AESA đặt trên tháp cao tạo chiều cao đồ sộ cho khối siêu cường. */
const PhasedArrayTower2D: React.FC<{ x: number; y: number }> = ({ x, y }) => (
  <g transform={`translate(${x} ${y})`} filter="url(#sh)">
    <rect x={-52} y={-28} width={104} height={28} rx={3} fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={2.6} />
    <polygon
      points="-32,-28 -22,-132 22,-132 32,-28"
      fill={PAL2D.panelHi}
      stroke={PAL2D.ink}
      strokeWidth={2.6}
    />
    <line x1={-26} y1={-62} x2={26} y2={-62} stroke={PAL2D.usMid} strokeWidth={2} />
    <line x1={-24} y1={-96} x2={24} y2={-96} stroke={PAL2D.usMid} strokeWidth={2} />
    <g transform="translate(0 -148) rotate(-18)">
      <rect x={-46} y={-52} width={92} height={64} rx={5} fill={PAL2D.usMid} stroke={PAL2D.ink} strokeWidth={2.8} />
      <rect x={-38} y={-44} width={76} height={48} rx={2} fill={PAL2D.usLo} stroke={PAL2D.usHi} strokeWidth={1.8} />
      <line x1={-38} y1={-20} x2={38} y2={-20} stroke={PAL2D.ewTeal} strokeWidth={1.4} opacity={0.7} />
      <line x1={0} y1={-44} x2={0} y2={4} stroke={PAL2D.ewTeal} strokeWidth={1.4} opacity={0.7} />
    </g>
  </g>
);

/** Giàn bệ phóng tên lửa phòng không đa tầng nghiêng góc chiến đấu. */
const InterceptorBattery2D: React.FC<{ x: number; y: number; elev?: number }> = ({ x, y, elev = -42 }) => (
  <g transform={`translate(${x} ${y})`} filter="url(#sh)">
    <rect x={-92} y={-24} width={184} height={24} rx={4} fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2.8} />
    <rect x={-88} y={-21} width={176} height={8} fill={PAL2D.usMid} opacity={0.75} />
    <path d="M-92 -12 L-112 0 L-84 0 Z" fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.4} />
    <path d="M92 -12 L112 0 L84 0 Z" fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.4} />
    <circle cx={-48} cy={-4} r={14} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={2.6} />
    <circle cx={-48} cy={-4} r={6} fill={PAL2D.concreteMid} />
    <circle cx={48} cy={-4} r={14} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={2.6} />
    <circle cx={48} cy={-4} r={6} fill={PAL2D.concreteMid} />

    <rect x={-36} y={-50} width={72} height={26} rx={3} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.6} />
    <g transform={`translate(-8 -52) rotate(${elev})`}>
      <rect x={-52} y={-44} width={144} height={40} rx={4} fill={PAL2D.usMid} stroke={PAL2D.ink} strokeWidth={2.8} />
      <rect x={-48} y={-40} width={136} height={13} rx={2} fill={PAL2D.usHi} opacity={0.82} />
      <line x1={-48} y1={-24} x2={88} y2={-24} stroke={PAL2D.ink} strokeWidth={2.2} />
      <rect x={86} y={-46} width={10} height={44} rx={2} fill={PAL2D.concreteHi} stroke={PAL2D.ink} strokeWidth={2.4} />
    </g>
    <circle cx={-8} cy={-46} r={11} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={2.4} />
  </g>
);

/** Ô tô du lịch chạy trên cao tốc (nhìn ngang tỉ lệ ~4.6 m, bánh quay, chùm đèn pha) để đối chiếu tốc độ với Shahed. */
const HighwayCar2D: React.FC<{ x: number; y: number; wheelSpin: number; scale?: number }> = ({
  x,
  y,
  wheelSpin,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} filter="url(#sh)">
    <polygon points="88,-24 195,-44 195,-4 88,-16" fill={PAL2D.amberHi} opacity={0.15} />
    <polygon points="88,-22 155,-34 155,-10 88,-18" fill={PAL2D.chalk} opacity={0.26} />

    <path
      d="M-86 -14 L-86 -34 L-56 -38 L-26 -62 L32 -62 L64 -38 L88 -32 L92 -14 Z"
      fill={PAL2D.concreteMid}
      stroke={PAL2D.ink}
      strokeWidth={2.8}
      strokeLinejoin="round"
    />
    <path d="M-24 -60 L30 -60 L60 -38 L85 -32 L85 -25 L-82 -25 L-82 -33 L-54 -37 Z" fill={PAL2D.concreteHi} opacity={0.84} />
    <rect x={-84} y={-22} width={172} height={8} fill={PAL2D.concreteLo} />

    <path d="M-21 -56 L2 -56 L2 -38 L-46 -38 Z" fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2} />
    <path d="M8 -56 L29 -56 L55 -38 L8 -38 Z" fill={PAL2D.usMid} stroke={PAL2D.ink} strokeWidth={2} />
    <rect x={84} y={-29} width={7} height={8} rx={2} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={1.6} />
    <rect x={-88} y={-31} width={6} height={9} rx={2} fill={PAL2D.threatMid} stroke={PAL2D.ink} strokeWidth={1.6} />

    {([-52, 54] as const).map((wx) => (
      <g key={wx} transform={`translate(${wx} -13)`}>
        <circle cx={0} cy={0} r={16} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={2.6} />
        <circle cx={0} cy={0} r={9} fill={PAL2D.concreteHi} stroke={PAL2D.ink} strokeWidth={1.6} />
        <g transform={`rotate(${wheelSpin})`}>
          <line x1={-8} y1={0} x2={8} y2={0} stroke={PAL2D.ink} strokeWidth={2} />
          <line x1={0} y1={-8} x2={0} y2={8} stroke={PAL2D.ink} strokeWidth={2} />
        </g>
      </g>
    ))}
  </g>
);

/** Đường tia liên kết chiến thuật vẽ nét kép (halo rộng mờ + lõi sáng, tránh lỗi cắt filter glow trong Cam2D). */
const DualBeam2D: React.FC<{
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  coreColor?: string;
  p?: number;
  pulse?: number;
}> = ({ x1, y1, x2, y2, color, coreColor = PAL2D.chalk, p = 1, pulse = 0 }) => {
  if (p <= 0.01) return null;
  const ex = lerp(x1, x2, p);
  const ey = lerp(y1, y2, p);
  const px = lerp(x1, ex, pulse);
  const py = lerp(y1, ey, pulse);
  return (
    <g>
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={15} strokeLinecap="round" opacity={0.14} />
      <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={5.5} strokeLinecap="round" opacity={0.34} />
      <line
        x1={x1}
        y1={y1}
        x2={ex}
        y2={ey}
        stroke={coreColor}
        strokeWidth={2.2}
        strokeDasharray="10 8"
        strokeLinecap="round"
        opacity={0.88}
      />
      <circle cx={px} cy={py} r={7} fill={color} opacity={0.35} />
      <circle cx={px} cy={py} r={3.5} fill={coreColor} opacity={0.95} />
    </g>
  );
};

const S02: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // 3 lớp đồi sa mạc nhìn ngang tạo chiều sâu mặt cắt
  const hills = useMemo(
    () => ({
      far: skyline('s02-far', -500, 3100, 805, 120, 740, 1450),
      mid: skyline('s02-mid', -500, 3100, 855, 76, 510, 1450),
      near: skyline('s02-near', -500, 3100, 892, 35, 370, 1450),
    }),
    []
  );

  // Tiến độ dựng và kích hoạt hệ thống siêu cường bên trái
  const superReveal = prog(t, 24.8, 30.6, Easing.out(Easing.cubic));
  const beamReveal = prog(t, CUE.s02_superpower - 0.6, CUE.s02_superpower + 1.8, Easing.out(Easing.cubic));
  const missileArc1 = prog(t, CUE.s02_superpower + 0.5, 34.8, Easing.out(Easing.quad));
  const missileArc2 = prog(t, CUE.s02_superpower + 1.3, 35.6, Easing.out(Easing.quad));

  // Tiến độ lia máy quay từ nửa trái (siêu cường 800 tỷ USD) sang nửa phải (Shahed rẻ tiền & ô tô cao tốc)
  const pFocusLeft = prog(t, CUE.s02_superpower - 0.3, CUE.s02_superpower + 1.8, Easing.inOut(Easing.cubic));
  const pPanRight = prog(t, CUE.s02_drone_pan, CUE.s02_drone_pan + 2.2, Easing.inOut(Easing.cubic));

  const camX = lerp(lerp(1130, 675, pFocusLeft), 1925, pPanRight);
  const camY = lerp(lerp(515, 495, pFocusLeft), 715, pPanRight);
  const camZoom = lerp(lerp(0.84, 1.03, pFocusLeft), 1.5, pPanRight);
  const shake = handheld(t, 2.1, 's02-cam');

  // Quỹ đạo đạn đánh chặn Coyote2D giữ gọn hoàn toàn trong nửa trái (x <= 1165) để không lọt góc khi máy phóng cận nửa phải
  const m1Pos = arcAt(725, 838, 1085, 330, 135, Math.max(0.08, missileArc1));
  const m1Rot = arcAngle(725, 838, 1085, 330, 135, Math.max(0.08, missileArc1));
  const m2Pos = arcAt(1015, 820, 1175, 430, 95, Math.max(0.08, missileArc2));
  const m2Rot = arcAngle(1015, 820, 1175, 430, 95, Math.max(0.08, missileArc2));

  // Dao động quạt đẩy 2 thì ồn như máy cắt cỏ của chiếc Shahed2D bên phải
  const droneBaseX = 1865 + (t - 24.8) * 3.0;
  const droneVibY = Math.sin(t * 48) * 2.4 + Math.cos(t * 19) * 1.4;
  const droneY = 636 + droneVibY;
  const propTailX = droneBaseX - 73 * 1.36;

  // Ô tô trên cao tốc bên dưới tăng tốc vượt qua chiếc Shahed từ mốc CUE.s02_slower_car (40.40s)
  const carPassP = prog(t, CUE.s02_slower_car - 1.15, 43.3, Easing.bezier(0.28, 0.05, 0.35, 1));
  const carX = lerp(1590, 2175, carPassP);
  const carAhead = carX > droneBaseX + 18;
  const laneScroll = (t * 285) % 96;

  const pulse1 = (t * 0.85) % 1;
  const pulse2 = (t * 0.85 + 0.45) % 1;
  const radarFanDeg = -50 + Math.sin(t * 1.35) * 22;

  return (
    <AbsoluteFill>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <svg width={3200} height={1500} viewBox="0 0 3200 1500" style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(6, 12, 22, 0.46)" />
          <defs>
            <linearGradient id="s02Sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#07111f" />
              <stop offset="48%" stopColor="#0e2038" />
              <stop offset="86%" stopColor="#183354" />
              <stop offset="100%" stopColor="#213c5c" />
            </linearGradient>
            <linearGradient id="s02RadarCone" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor={PAL2D.usHi} stopOpacity={0.34} />
              <stop offset="65%" stopColor={PAL2D.usMid} stopOpacity={0.11} />
              <stop offset="100%" stopColor={PAL2D.usMid} stopOpacity={0} />
            </linearGradient>
          </defs>

          {/* Nền trời chia tầng khí quyển - quỹ đạo + lưới tọa độ chiến thuật */}
          <rect x={-500} y={-350} width={3700} height={1800} fill="url(#s02Sky)" />
          <TacticalGrid2D x={-480} y={-320} w={3600} h={1720} step={80} major={320} opacity={0.28} />

          {/* Các đường chia tầng độ cao (Quỹ đạo cao / Tầng phòng không / Mặt đất) */}
          {([285, 550] as const).map((ly) => (
            <line
              key={ly}
              x1={-320}
              y1={ly}
              x2={2750}
              y2={ly}
              stroke={PAL2D.grid}
              strokeWidth={1.5}
              strokeDasharray="14 10"
              opacity={0.45}
            />
          ))}

          {/* Vòng cung quỹ đạo vệ tinh tầng cao (hạ vừa tầm để nhường đỉnh trời thoáng cho Label 800 TỶ USD) */}
          <path
            d="M -120 345 Q 690 105 1560 325"
            fill="none"
            stroke={PAL2D.usMid}
            strokeWidth={2}
            strokeDasharray="8 8"
            opacity={0.5}
          />

          {/* 3 lớp đồi sa mạc Rukban dưới chân mặt cắt */}
          <path d={hills.far} fill="#11233a" opacity={0.92} />
          <path d={hills.mid} fill="#192e47" opacity={0.95} />
          <path d={hills.near} fill={PAL2D.basaltDark} />

          {/* Mặt cắt lớp đất đá sỏi bazan dưới chân công sự & mặt đường */}
          <rect x={-480} y={890} width={3600} height={520} fill="#1b2430" />
          <line x1={-480} y1={890} x2={3120} y2={890} stroke={PAL2D.sandMid} strokeWidth={3.5} opacity={0.75} />

          {/* Vách phân đôi quy mô phi đối xứng giữa hai nửa Trái (Siêu cường) & Phải (UAV rẻ tiền) */}
          <line
            x1={1340}
            y1={85}
            x2={1340}
            y2={940}
            stroke={PAL2D.chalk}
            strokeWidth={2}
            strokeDasharray="12 10"
            opacity={0.32}
          />

          {/* ==================== NỬA TRÁI: HỆ THỐNG PHÒNG THỦ ĐA TẦNG 800 TỶ USD ==================== */}
          <g opacity={0.38 + 0.62 * superReveal}>
            {/* Vòm bảo vệ radar đồng tâm khổng lồ bao trùm nửa trái */}
            {[250, 410, 570, 730].map((rad, idx) => (
              <path
                key={rad}
                d={`M ${660 - rad} 890 A ${rad} ${rad} 0 0 1 ${660 + rad} 890`}
                fill="none"
                stroke={idx % 2 === 0 ? PAL2D.usHi : PAL2D.ewTeal}
                strokeWidth={idx === 3 ? 2.6 : 1.8}
                strokeDasharray={idx % 2 === 0 ? '14 9' : undefined}
                opacity={0.19 + 0.16 * beamReveal}
              />
            ))}

            {/* Quạt sóng quét radar mảng pha hướng lên tầng cao */}
            <g transform={`translate(705 760) rotate(${radarFanDeg})`}>
              <path d="M 0 0 L 540 -195 A 580 580 0 0 1 575 -22 Z" fill="url(#s02RadarCone)" />
              <line x1={0} y1={0} x2={560} y2={-110} stroke={PAL2D.usHi} strokeWidth={2} opacity={0.55} />
            </g>

            {/* Chùm tia liên kết dữ liệu từ 2 vệ tinh quỹ đạo cao xuống vòm radar & đài KuRFS (vẽ nét kép) */}
            <DualBeam2D x1={355} y1={270} x2={290} y2={725} color={PAL2D.ewTeal} p={beamReveal} pulse={pulse1} />
            <DualBeam2D x1={355} y1={270} x2={515} y2={710} color={PAL2D.usMid} p={beamReveal} pulse={pulse2} />
            <DualBeam2D x1={885} y1={242} x2={705} y2={758} color={PAL2D.ewTeal} p={beamReveal} pulse={pulse1} />
            <DualBeam2D x1={885} y1={242} x2={1000} y2={812} color={PAL2D.usHi} p={beamReveal} pulse={pulse2} />
            <DualBeam2D x1={365} y1={840} x2={935} y2={840} color={PAL2D.ewTeal} p={beamReveal} pulse={pulse1} />

            {/* 2 Vệ tinh cảnh giới quỹ đạo cao */}
            <DefenseSatellite2D x={355} y={220} rot={-11} scale={1.08} />
            <DefenseSatellite2D x={885} y={194} rot={9} scale={0.98} />

            {/* Đài vòm radar chiến lược, Tháp radar mảng pha AESA, Đài KuRFS2D & Giàn tên lửa */}
            <StrategicRadome2D x={290} y={890} sweepDeg={Math.sin(t * 1.8) * 18} />
            <PhasedArrayTower2D x={515} y={890} />
            <g filter="url(#sh)">
              <Kurfs2D x={730} y={890} scale={1.48} active />
            </g>
            <InterceptorBattery2D x={1005} y={890} elev={-40} />

            {/* Quỹ đạo đánh chặn nét kép + 2 đạn phản lực Coyote2D vọt lên tầng không */}
            {missileArc1 > 0.02 && (
              <g>
                <path
                  d={arcPath(725, 838, 1085, 330, 135, missileArc1)}
                  fill="none"
                  stroke={PAL2D.usMid}
                  strokeWidth={11}
                  strokeLinecap="round"
                  opacity={0.18}
                />
                <path
                  d={arcPath(725, 838, 1085, 330, 135, missileArc1)}
                  fill="none"
                  stroke={PAL2D.usHi}
                  strokeWidth={2.8}
                  strokeDasharray="10 6"
                  strokeLinecap="round"
                />
                <Coyote2D x={m1Pos[0]} y={m1Pos[1]} rot={m1Rot} scale={1.45} flame={0.95} />
              </g>
            )}
            {missileArc2 > 0.02 && (
              <g>
                <path
                  d={arcPath(1015, 820, 1175, 430, 95, missileArc2)}
                  fill="none"
                  stroke={PAL2D.ewTeal}
                  strokeWidth={10}
                  strokeLinecap="round"
                  opacity={0.18}
                />
                <path
                  d={arcPath(1015, 820, 1175, 430, 95, missileArc2)}
                  fill="none"
                  stroke={PAL2D.chalk}
                  strokeWidth={2.5}
                  strokeDasharray="9 6"
                  strokeLinecap="round"
                />
                <Coyote2D x={m2Pos[0]} y={m2Pos[1]} rot={m2Rot} scale={1.55} flame={1.0} />
              </g>
            )}
          </g>

          {/* ==================== NỬA PHẢI: SHAHED CÁNH QUẠT RẺ TIỀN & THƯỚC CAO TỐC Ô TÔ ==================== */}
          <g>
            {/* Hàng cọc tiêu phản quang ven cao tốc tạo chiều sâu mặt đất */}
            {Array.from({ length: 11 }, (_, i) => {
              const px = 1525 + i * 82;
              return (
                <g key={i} transform={`translate(${px} 848)`}>
                  <rect x={-3} y={-22} width={6} height={22} rx={1} fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={1.4} />
                  <rect x={-2} y={-18} width={4} height={5} fill={PAL2D.amberHi} />
                </g>
              );
            })}

            {/* Dải mặt đường nhựa cao tốc & vạch thước đo tốc độ dưới chân chiếc UAV */}
            <rect
              x={1495}
              y={848}
              width={890}
              height={46}
              rx={4}
              fill="#222b38"
              stroke={PAL2D.ink}
              strokeWidth={2.8}
            />
            <line x1={1500} y1={853} x2={2380} y2={853} stroke={PAL2D.amberMid} strokeWidth={2.2} opacity={0.85} />
            <line x1={1500} y1={889} x2={2380} y2={889} stroke={PAL2D.chalk} strokeWidth={2} opacity={0.55} />

            {/* Vạch kẻ phân làn cao tốc trôi ngược tạo cảm giác lăn bánh */}
            <g>
              {Array.from({ length: 10 }, (_, i) => {
                const lx = 1520 + i * 96 - laneScroll;
                if (lx < 1502 || lx > 2335) return null;
                return (
                  <rect
                    key={i}
                    x={lx}
                    y={869}
                    width={46}
                    height={5}
                    rx={2}
                    fill={PAL2D.chalk}
                    opacity={0.78}
                  />
                );
              })}
            </g>

            {/* Thước chia vạch tốc độ dọc lề đường cao tốc */}
            <g transform="translate(1515 912)">
              <line x1={0} y1={0} x2={850} y2={0} stroke={PAL2D.muted} strokeWidth={2} />
              {Array.from({ length: 18 }, (_, i) => {
                const tx = i * 50;
                const major = i % 4 === 0;
                return (
                  <line
                    key={i}
                    x1={tx}
                    y1={0}
                    x2={tx}
                    y2={major ? 16 : 9}
                    stroke={major ? PAL2D.chalk : PAL2D.muted}
                    strokeWidth={major ? 2.4 : 1.4}
                  />
                );
              })}
            </g>

            {/* Khói nhạt động cơ 2 thì phía sau Shahed */}
            {[0, 1, 2, 3].map((k) => {
              const cycle = (t * 1.9 + k * 0.25) % 1;
              return (
                <Puff2D
                  key={k}
                  seed={20 + k}
                  x={propTailX - 14 - cycle * 115}
                  y={droneY + Math.sin(cycle * 9 + k) * 5}
                  r={7 + cycle * 14}
                  color="#9aa7b8"
                  opacity={0.34 * (1 - cycle)}
                />
              );
            })}

            {/* Vòng sóng âm rung lạch bạch ("ồn như máy cắt cỏ") phát ra từ cánh quạt đẩy đuôi */}
            {[0, 1, 2, 3].map((w) => {
              const pWave = (t * 2.4 + w * 0.25) % 1;
              const rad = 20 + pWave * 102;
              return (
                <path
                  key={w}
                  d={`M ${propTailX - rad * 0.55} ${droneY - rad * 0.84} A ${rad} ${rad} 0 0 0 ${propTailX - rad * 0.55} ${droneY + rad * 0.84}`}
                  fill="none"
                  stroke={w % 2 === 0 ? PAL2D.amberHi : PAL2D.threatHi}
                  strokeWidth={3.6 - pWave * 1.9}
                  strokeDasharray="8 5"
                  strokeLinecap="round"
                  opacity={0.9 * (1 - pWave)}
                />
              );
            })}

            {/* Chiếc UAV cảm tử Shahed2D (nhìn ngang, tỉ lệ nhỏ bé đặt ngay trên thước cao tốc) */}
            <g filter="url(#sh)">
              <Shahed2D
                x={droneBaseX}
                y={droneY}
                view="side"
                scale={1.36}
                propAngle={t * 36}
                tint="threat"
              />
            </g>

            {/* Vạch gióng thẳng đứng đối chiếu mũi Shahed vs mũi ô tô vượt lên phía trước */}
            {t >= CUE.s02_drone_pan + 1.0 && (
              <g opacity={prog(t, CUE.s02_drone_pan + 1.0, CUE.s02_drone_pan + 2.0)}>
                <line
                  x1={droneBaseX + 96}
                  y1={droneY}
                  x2={droneBaseX + 96}
                  y2={846}
                  stroke={PAL2D.threatMid}
                  strokeWidth={2.2}
                  strokeDasharray="6 6"
                  opacity={0.8}
                />
                <line
                  x1={droneBaseX + 106}
                  y1={droneY}
                  x2={droneBaseX + 162}
                  y2={droneY}
                  stroke={PAL2D.threatHi}
                  strokeWidth={3.4}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${droneBaseX + 174},${droneY} ${droneBaseX + 156},${droneY - 8} ${droneBaseX + 156},${droneY + 8}`}
                  fill={PAL2D.threatHi}
                />
              </g>
            )}

            {/* Vệt gió tốc độ cao & Chiếc ô tô vượt nhanh hơn chiếc UAV trên cao tốc */}
            {carPassP > 0.04 && (
              <g>
                {[-18, -36, -54].map((vy, idx) => (
                  <line
                    key={vy}
                    x1={carX - 102 - idx * 24}
                    y1={848 + vy}
                    x2={carX - 180 - idx * 40}
                    y2={848 + vy}
                    stroke={PAL2D.usHi}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    opacity={0.48 * Math.sin(carPassP * Math.PI)}
                  />
                ))}
              </g>
            )}

            <HighwayCar2D x={carX} y={848} wheelSpin={t * 780} scale={0.96} />

            {/* Vạch gióng & mũi tên tốc độ dài màu lam sáng khi ô tô vượt mặt UAV */}
            {carAhead && (
              <g opacity={prog(t, CUE.s02_slower_car + 0.1, CUE.s02_slower_car + 0.65)}>
                <line
                  x1={carX + 88}
                  y1={614}
                  x2={carX + 88}
                  y2={826}
                  stroke={PAL2D.ewTeal}
                  strokeWidth={2.4}
                  strokeDasharray="6 5"
                />
                <line
                  x1={carX + 98}
                  y1={810}
                  x2={carX + 214}
                  y2={810}
                  stroke={PAL2D.ewTeal}
                  strokeWidth={4.2}
                  strokeLinecap="round"
                />
                <polygon
                  points={`${carX + 228},810 ${carX + 208},800 ${carX + 208},820`}
                  fill={PAL2D.ewTeal}
                />
              </g>
            )}
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* Nhãn chữ duy nhất của cảnh S02 đặt ở khoảng trời cao thoáng đãng không đè cánh vệ tinh */}
      <Label
        t={t}
        text="800 TỶ USD"
        x={960}
        y={104}
        from={CUE.s02_budget}
        until={35.6}
        size={56}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S02;
