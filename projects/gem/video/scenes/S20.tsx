import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, lerp, prog } from '@kit/theme';
import { handheld, useSpring, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D, Muzzle2D } from '@lib/2d/fx';
import { arcAngle, arcAt, arcPath, drawOn } from '@lib/2d/path';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  ChuSection2D,
  Coyote2D,
  Kurfs2D,
  Shahed2D,
  TacticalGrid2D,
  TWallSection2D,
} from '../local/draw2d';

/** Trạm phát chùm vi sóng công suất cao (HPM Phased-Array Emitter, 3 tông đồng bộ Kurfs2D). */
const HpmStation2D: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x={-56} y={-26} width={112} height={26} rx={4} fill={PAL2D.sandMid} stroke={PAL2D.ink} strokeWidth={2.6} />
    <rect x={-52} y={-24} width={104} height={8} rx={2} fill={PAL2D.sandHi} opacity={0.75} />
    <rect x={-44} y={-60} width={42} height={34} rx={3} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.4} />
    <rect x={-40} y={-56} width={34} height={10} fill={PAL2D.concreteHi} opacity={0.7} />
    <rect x={6} y={-68} width={18} height={42} fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={2.4} />
    <circle cx={15} cy={-68} r={9} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={2.2} />
    <g transform="translate(18 -76) rotate(-20)">
      <rect x={-14} y={-44} width={20} height={88} rx={4} fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2.6} />
      <rect x={4} y={-40} width={11} height={80} rx={2} fill={PAL2D.usMid} stroke={PAL2D.ink} strokeWidth={2.2} />
      <rect x={11} y={-35} width={6} height={70} rx={1.5} fill={PAL2D.ewTeal} stroke={PAL2D.ink} strokeWidth={1.8} />
      {[-24, -12, 0, 12, 24].map((gy) => (
        <line key={gy} x1={5} y1={gy} x2={16} y2={gy} stroke={PAL2D.ink} strokeWidth={1.5} />
      ))}
    </g>
  </g>
);

/** Tháp pháo Vũ khí Laser năng lượng cao (DE-M-SHORAD / HEL Director Turret, 3 tông đồng bộ). */
const LaserStation2D: React.FC<{ x: number; y: number; scale?: number; active?: boolean }> = ({
  x,
  y,
  scale = 1,
  active = true,
}) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    <rect x={-58} y={-28} width={116} height={28} rx={4} fill={PAL2D.sandMid} stroke={PAL2D.ink} strokeWidth={2.6} />
    <rect x={-54} y={-26} width={108} height={8} rx={2} fill={PAL2D.sandHi} opacity={0.75} />
    <rect x={-46} y={-64} width={48} height={36} rx={3} fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2.4} />
    {[-38, -28, -18, -8].map((lx) => (
      <line key={lx} x1={lx} y1={-58} x2={lx} y2={-34} stroke={PAL2D.ink} strokeWidth={2.2} />
    ))}
    <path d="M2 -28 L8 -62 L38 -62 L44 -28 Z" fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.5} />
    <g transform="translate(23 -76) rotate(-14)">
      <circle cx={0} cy={0} r={24} fill={PAL2D.usMid} stroke={PAL2D.ink} strokeWidth={2.6} />
      <path d="M-18 -14 A22 22 0 0 1 18 -12 L12 -4 A14 14 0 0 0 -12 -6 Z" fill={PAL2D.usHi} opacity={0.75} />
      <rect x={14} y={-11} width={18} height={22} rx={3} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={2.3} />
      <ellipse
        cx={32}
        cy={0}
        rx={4}
        ry={8.5}
        fill={active ? PAL2D.amberHi : PAL2D.amberLo}
        stroke={PAL2D.ink}
        strokeWidth={1.8}
      />
      <circle cx={4} cy={-9} r={5} fill={PAL2D.ewTeal} stroke={PAL2D.ink} strokeWidth={1.6} />
    </g>
  </g>
);

/** Container CHU nhìn từ mặt bằng đỉnh đầu (6.06 × 2.44 m -> 164 × 66 px) cho sơ đồ xếp lệch tường chữ T. */
const ChuPlanTop2D: React.FC<{ x: number; y: number; w?: number; h?: number }> = ({
  x,
  y,
  w = 164,
  h = 66,
}) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-w / 2} y={-h / 2} width={w} height={h} rx={4} fill="#1f3856" stroke={PAL2D.usHi} strokeWidth={2.4} />
    <rect x={-w / 2 + 5} y={-h / 2 + 5} width={w - 10} height={h - 10} rx={2} fill="#27476b" opacity={0.65} />
    {[-60, -40, -20, 0, 20, 40, 60].map((gx) => (
      <line key={gx} x1={gx} y1={-h / 2 + 4} x2={gx} y2={h / 2 - 4} stroke={PAL2D.usMid} strokeWidth={1.3} opacity={0.55} />
    ))}
    <line x1={-w / 2 + 4} y1={0} x2={w / 2 - 4} y2={0} stroke={PAL2D.amberHi} strokeWidth={2.2} opacity={0.85} />
    <rect x={w / 2} y={-11} width={10} height={22} rx={2} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={1.8} />
  </g>
);

/** Khối tường bê tông chữ T nhìn từ mặt bằng đỉnh đầu (đế rộng 1.50 m + sống tường dày 0.34 m + móc cẩu). */
const TWallPlanSegment2D: React.FC<{ x: number; y: number; len: number; vertical?: boolean }> = ({
  x,
  y,
  len,
  vertical = false,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${vertical ? 90 : 0})`}>
    <rect
      x={-len / 2}
      y={-13}
      width={len}
      height={26}
      rx={2.5}
      fill={PAL2D.concreteLo}
      stroke={PAL2D.ink}
      strokeWidth={2.2}
    />
    <rect
      x={-len / 2 + 2}
      y={-6}
      width={len - 4}
      height={12}
      rx={1.5}
      fill={PAL2D.concreteHi}
      stroke={PAL2D.ink}
      strokeWidth={2}
    />
    <circle cx={-len * 0.28} cy={0} r={2.3} fill={PAL2D.basaltDark} />
    <circle cx={len * 0.28} cy={0} r={2.3} fill={PAL2D.basaltDark} />
  </g>
);

const S20: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const desertHillsFar = useMemo(() => skyline('s20far', -300, 3350, 965, 58, 520, 1300), []);
  const desertHillsNear = useMemo(() => skyline('s20near', -300, 3350, 1005, 38, 380, 1300), []);

  // Cam2D:
  // - 391.46 -> 396.2s: Trình bày trọn khung Trái (3 hệ thống đánh chặn: Kinetic Coyote / HPM / Laser)
  // - 396.2 -> 397.4s: Trượt mượt sang khung Phải và GIỮ TRỌN VẸN cả 2 bảng A-A (Mặt cắt mái kích nổ sớm) & B-B (Mặt bằng T-Wall xếp lệch) không cắt mép!
  const panToRight = prog(t, 396.15, 397.35);
  const subtlePush = prog(t, 398.5, 401.8);

  const camX = lerp(675, 2270, panToRight);
  const camY = lerp(536, 536, panToRight);
  const camZoom = lerp(1.16, lerp(1.11, 1.135, subtlePush), panToRight);
  const shake = handheld(t, 1.8, 's20_blueprint');

  // --- Hoạt ảnh Nửa Trái (391.5 - 396.5s) ---
  // 1. Trạm Động năng: Khai hỏa sớm ở 391.50 để thấy rõ đạn Coyote2D rực lửa đang lao trên quỹ đạo!
  const coyoteFireAt = 391.50;
  const coyoteHitAt = 393.35;
  const coyoteP = prog(t, coyoteFireAt, coyoteHitAt);
  const coyotePos = arcAt(158, 290, 910, 212, 48, coyoteP);
  const coyoteAng = arcAngle(158, 290, 910, 212, 48, coyoteP);
  const coyoteAlive = t >= coyoteFireAt && t < coyoteHitAt;
  const uav1X = lerp(1095, 910, prog(t, 391.46, coyoteHitAt));
  const uav1Alive = t < coyoteHitAt;

  // 2. Trạm Vi sóng công suất cao (HPM cone xanh ngọc — CUE.s20_directed_energy = 392.50)
  const hpmP = prog(t, 391.95, 392.95);
  const hpmPulse = (t - 391.9) * 2.5;
  const hpmJammed = t >= 392.85;

  // 3. Trạm Laser hội tụ đỏ-vàng đốt cháy UAV #3 từ xa
  const laserOnP = prog(t, 392.65, 393.35);
  const laserBurnAt = 394.95;
  const laserActive = t >= 392.65 && t < laserBurnAt + 0.35;
  const laserHeat = prog(t, 393.1, laserBurnAt);
  const uav3X = lerp(1165, 985, prog(t, 391.5, laserBurnAt));
  const uav3Alive = t < laserBurnAt;

  // --- Hoạt ảnh Nửa Phải (396.6 - 402.0s) ---
  // 4. Mặt cắt A-A: ChuSection2D + giàn mái kích nổ sớm hasBlastRoof (CUE.s20_roof_twall = 396.80)
  const roofDropSpring = useSpring(t, CUE.s20_roof_twall - 0.15, 13, 150);
  const roofDiveStart = 397.05;
  const roofHitAt = 398.05;
  const roofDiveP = prog(t, roofDiveStart, roofHitAt);
  const roofVentP = prog(t, roofHitAt, 399.35);

  // 5. Mặt bằng B-B: Tường chữ T xếp so le chữ chi (CUE.s20_break_corridor = 400.10)
  const baffleHitAt = 399.35;
  const corridorBreakP = prog(t, baffleHitAt, CUE.s20_break_corridor + 0.75);
  const ventArrowsP = prog(t, CUE.s20_break_corridor - 0.35, 401.35);

  return (
    <AbsoluteFill style={{ background: PAL2D.bgNight }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgSlate}>
        <svg width={3200} height={1160} viewBox="0 0 3200 1160" style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(6, 14, 26, 0.48)" />
          <defs>
            <linearGradient id="s20BgGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0e1e34" />
              <stop offset="55%" stopColor={PAL2D.bgSlate} />
              <stop offset="100%" stopColor="#0b182a" />
            </linearGradient>
            <linearGradient id="hpmConeGrad" x1="0" y1="0.5" x2="1" y2="0.5">
              <stop offset="0%" stopColor={PAL2D.ewTeal} stopOpacity={0.48} />
              <stop offset="68%" stopColor={PAL2D.ewTeal} stopOpacity={0.18} />
              <stop offset="100%" stopColor={PAL2D.ewTeal} stopOpacity={0.0} />
            </linearGradient>
          </defs>

          {/* Nền bản vẽ kỹ thuật + lưới tọa độ + dải địa hình sa mạc phía chân */}
          <rect x={-350} y={-220} width={3800} height={1560} fill="url(#s20BgGrad)" />
          <TacticalGrid2D x={-300} y={-180} w={3700} h={1480} step={64} major={256} color={PAL2D.grid} opacity={0.32} />
          <path d={desertHillsFar} fill="#102238" opacity={0.85} />
          <path d={desertHillsNear} fill="#0c1a2c" opacity={0.95} />

          {/* Khung viền kỹ thuật Blueprint vùng Trái */}
          <rect
            x={-35}
            y={96}
            width={1425}
            height={880}
            rx={12}
            fill={PAL2D.panel}
            fillOpacity={0.56}
            stroke={PAL2D.grid}
            strokeWidth={2.2}
          />
          <line x1={1435} y1={84} x2={1435} y2={988} stroke={PAL2D.usMid} strokeWidth={2} strokeDasharray="10 8" opacity={0.55} />

          {/* Các cung cự ly phòng thủ tiền đồn trên nền bản vẽ vùng Trái (lấp đầy chiều sâu kỹ thuật) */}
          {[380, 620, 860, 1100].map((rx, idx) => (
            <g key={rx} opacity={0.28}>
              <line x1={rx} y1={122} x2={rx} y2={950} stroke={PAL2D.grid} strokeWidth={1.3} strokeDasharray="5 7" />
              <text x={rx + 8} y={142} fill={PAL2D.muted} fontFamily={FONT} fontSize={14} fontWeight={700}>
                {`${idx + 1} KM`}
              </text>
            </g>
          ))}

          {/* ===================================================================== */}
          {/* NỬA TRÁI (391.5 - 396.5s): 3 LỚP HỎA LỰC ĐÁNH CHẶN TIỀN ĐỒN THẾ HỆ MỚI */}
          {/* ===================================================================== */}

          {/* --- TẦNG 1: ĐỘNG NĂNG (KINETIC — KURFS + ĐẠN PHẢN LỰC COYOTE BLOCK II) --- */}
          <g>
            <rect
              x={-8}
              y={122}
              width={1368}
              height={258}
              rx={8}
              fill={PAL2D.bgConsole}
              fillOpacity={0.48}
              stroke={PAL2D.gridSoft}
              strokeWidth={1.6}
            />
            <rect x={14} y={142} width={54} height={32} rx={5} fill={PAL2D.usLo} stroke={PAL2D.usHi} strokeWidth={1.8} />
            <text x={41} y={164} textAnchor="middle" fill={PAL2D.chalk} fontFamily={FONT} fontSize={18} fontWeight={700}>
              01
            </text>

            <path d="M10 362 L52 336 L216 336 L262 362 Z" fill={PAL2D.sandLo} stroke={PAL2D.ink} strokeWidth={2.2} />
            <Kurfs2D x={132} y={336} scale={0.95} active />

            {/* Đường chuẩn ngắm dự kiến nét mảnh + Quạt sóng radar băng Ku */}
            <path
              d={arcPath(158, 290, 910, 212, 48, 1)}
              fill="none"
              stroke={PAL2D.usMid}
              strokeWidth={1.4}
              strokeDasharray="4 8"
              opacity={0.35}
            />
            {[95, 165, 235].map((r, idx) => (
              <path
                key={r}
                d={`M ${108 + r * 0.92} ${225 - r * 0.36} A ${r} ${r} 0 0 1 ${108 + r * 0.99} ${225 + r * 0.14}`}
                fill="none"
                stroke={PAL2D.usHi}
                strokeWidth={1.6}
                strokeDasharray="6 6"
                opacity={0.32 + 0.18 * Math.sin(t * 5 - idx)}
              />
            ))}

            {/* Quỹ đạo lửa đạn đánh chặn Coyote II */}
            {t >= coyoteFireAt && (
              <path
                d={arcPath(158, 290, 910, 212, 48, coyoteP)}
                fill="none"
                stroke={PAL2D.amberMid}
                strokeWidth={3.4}
                strokeDasharray="10 6"
                opacity={0.9}
              />
            )}
            <Muzzle2D t={t} at={coyoteFireAt} x={158} y={290} angle={-26} size={30} seed={21} />
            {coyoteAlive && (
              <Coyote2D x={coyotePos[0]} y={coyotePos[1]} rot={coyoteAng} scale={1.18} flame={1} />
            )}

            {uav1Alive ? (
              <g>
                <circle cx={uav1X} cy={212} r={34} fill="none" stroke={PAL2D.usHi} strokeWidth={1.8} strokeDasharray="6 4" />
                <line x1={uav1X - 44} y1={212} x2={uav1X - 24} y2={212} stroke={PAL2D.usHi} strokeWidth={1.6} />
                <line x1={uav1X + 24} y1={212} x2={uav1X + 44} y2={212} stroke={PAL2D.usHi} strokeWidth={1.6} />
                <Shahed2D x={uav1X} y={212} rot={180} view="side" scale={0.94} propAngle={t * 36} />
              </g>
            ) : (
              <Shahed2D x={910} y={224} rot={196} view="side" scale={0.88} ghost />
            )}
            <Blast2D t={t} at={coyoteHitAt} x={910} y={216} size={52} air life={3.4} seed={201} />
          </g>

          {/* --- TẦNG 2: VI SÓNG CÔNG SUẤT CAO (HPM CONE XANH NGỌC) --- */}
          <g>
            <rect
              x={-8}
              y={402}
              width={1368}
              height={264}
              rx={8}
              fill={PAL2D.bgConsole}
              fillOpacity={0.48}
              stroke={PAL2D.gridSoft}
              strokeWidth={1.6}
            />
            <rect x={14} y={422} width={54} height={32} rx={5} fill={PAL2D.ewTealLo} stroke={PAL2D.ewTeal} strokeWidth={1.8} />
            <text x={41} y={444} textAnchor="middle" fill={PAL2D.chalk} fontFamily={FONT} fontSize={18} fontWeight={700}>
              02
            </text>

            <path d="M10 646 L52 620 L216 620 L262 646 Z" fill={PAL2D.sandLo} stroke={PAL2D.ink} strokeWidth={2.2} />
            <HpmStation2D x={132} y={620} scale={0.98} />

            {/* Khung giới hạn búp sóng HPM trên bản vẽ */}
            <line x1={166} y1={542} x2={1120} y2={424} stroke={PAL2D.ewTeal} strokeWidth={1.2} strokeDasharray="4 8" opacity={0.3} />
            <line x1={166} y1={542} x2={1120} y2={636} stroke={PAL2D.ewTeal} strokeWidth={1.2} strokeDasharray="4 8" opacity={0.3} />

            {hpmP > 0.01 && (
              <g opacity={hpmP}>
                <polygon
                  points={`166,542 ${166 + 980 * hpmP},${542 - 122 * hpmP} ${166 + 980 * hpmP},${542 + 96 * hpmP}`}
                  fill="url(#hpmConeGrad)"
                />
                <line
                  x1={166}
                  y1={542}
                  x2={166 + 960 * hpmP}
                  y2={542 - 118 * hpmP}
                  stroke={PAL2D.ewTeal}
                  strokeWidth={2.2}
                  strokeDasharray="8 6"
                  opacity={0.75}
                />
                <line
                  x1={166}
                  y1={542}
                  x2={166 + 960 * hpmP}
                  y2={542 + 94 * hpmP}
                  stroke={PAL2D.ewTeal}
                  strokeWidth={2.2}
                  strokeDasharray="8 6"
                  opacity={0.75}
                />
                {[0, 1, 2, 3, 4, 5].map((k) => {
                  const u = ((hpmPulse + k / 6) % 1 + 1) % 1;
                  const dist = 110 + u * 830 * hpmP;
                  const halfH = 16 + dist * 0.11;
                  return (
                    <path
                      key={k}
                      d={`M ${166 + dist} ${532 - halfH} Q ${166 + dist + 34} 532 ${166 + dist} ${532 + halfH}`}
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={3.2 - u * 1.4}
                      opacity={(1 - u * 0.8) * 0.92}
                    />
                  );
                })}
              </g>
            )}

            {[
              { bx: 870, by: 486, delay: 0 },
              { bx: 1035, by: 548, delay: 0.22 },
            ].map((u, idx) => {
              const drop = prog(t, 392.95 + u.delay, 395.75 + u.delay);
              const ux = lerp(u.bx + 110, u.bx, prog(t, 391.46, 392.95)) - drop * 65;
              const uy = u.by + drop * drop * 92;
              const urot = 180 - drop * 42;
              return (
                <g key={idx}>
                  <Shahed2D
                    x={ux}
                    y={uy}
                    rot={urot}
                    view="side"
                    scale={0.88}
                    propAngle={hpmJammed ? 0.5 : t * 34}
                    ghost={drop > 0.55}
                  />
                  {hpmJammed && drop < 0.88 && (
                    <path
                      d={`M ${ux - 26} ${uy - 15} L ${ux - 9} ${uy + 11} L ${ux + 9} ${uy - 13} L ${ux + 26} ${uy + 13}`}
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={2.8}
                    />
                  )}
                </g>
              );
            })}
          </g>

          {/* --- TẦNG 3: LASER NĂNG LƯỢNG CAO (HEL BEAM ĐỎ - VÀNG HỘI TỤ) --- */}
          <g>
            <rect
              x={-8}
              y={686}
              width={1368}
              height={264}
              rx={8}
              fill={PAL2D.bgConsole}
              fillOpacity={0.48}
              stroke={PAL2D.gridSoft}
              strokeWidth={1.6}
            />
            <rect x={14} y={706} width={54} height={32} rx={5} fill={PAL2D.threatLo} stroke={PAL2D.amberHi} strokeWidth={1.8} />
            <text x={41} y={728} textAnchor="middle" fill={PAL2D.chalk} fontFamily={FONT} fontSize={18} fontWeight={700}>
              03
            </text>

            <path d="M10 930 L52 904 L216 904 L262 930 Z" fill={PAL2D.sandLo} stroke={PAL2D.ink} strokeWidth={2.2} />
            <LaserStation2D x={132} y={904} scale={0.98} active={laserOnP > 0.05} />

            {/* Đường ngắm quang học mảnh */}
            <line x1={186} y1={820} x2={uav3X} y2={760} stroke={PAL2D.amberMid} strokeWidth={1.2} strokeDasharray="4 8" opacity={0.35} />

            {laserActive && (
              <g opacity={laserOnP}>
                <line
                  x1={186}
                  y1={820}
                  x2={uav3X - 6}
                  y2={758}
                  stroke={PAL2D.threatMid}
                  strokeWidth={16}
                  strokeLinecap="round"
                  opacity={0.28}
                />
                <line
                  x1={186}
                  y1={820}
                  x2={uav3X - 6}
                  y2={758}
                  stroke={PAL2D.amberMid}
                  strokeWidth={6.5}
                  strokeLinecap="round"
                  opacity={0.82}
                />
                <line
                  x1={186}
                  y1={820}
                  x2={uav3X - 6}
                  y2={758}
                  stroke={PAL2D.amberHi}
                  strokeWidth={2.8}
                  strokeLinecap="round"
                />
                <circle cx={uav3X - 6} cy={758} r={11 + laserHeat * 17} fill={PAL2D.threatMid} opacity={0.44} />
                <circle cx={uav3X - 6} cy={758} r={5 + laserHeat * 8.5} fill={PAL2D.amberHi} />
              </g>
            )}

            {uav3Alive ? (
              <Shahed2D x={uav3X} y={760} rot={180} view="side" scale={0.94} propAngle={t * 34} />
            ) : (
              <Shahed2D x={985} y={774} rot={162} view="side" scale={0.88} ghost />
            )}
            <Blast2D t={t} at={laserBurnAt} x={980} y={762} size={54} air life={3.5} seed={203} />
          </g>

          {/* ===================================================================== */}
          {/* NỬA PHẢI (396.6 - 402.0s): CẢI TỔ CÔNG SỰ — MÁI KÍCH NỔ SỚM & XẾP LỆCH T-WALL */}
          {/* ===================================================================== */}

          {/* --- BẢNG PHẢI A (x: 1495..2235): MẶT CẮT ĐỨNG CHU CONTAINER LẮP GIÀN MÁI KÍCH NỔ SỚM --- */}
          <g filter="url(#sh)">
            <rect
              x={1495}
              y={104}
              width={740}
              height={864}
              rx={12}
              fill={PAL2D.panel}
              fillOpacity={0.9}
              stroke={PAL2D.usMid}
              strokeWidth={2.4}
            />
          </g>
          <g>
            <rect x={1520} y={128} width={64} height={34} rx={5} fill={PAL2D.usLo} stroke={PAL2D.amberHi} strokeWidth={1.8} />
            <text x={1552} y={151} textAnchor="middle" fill={PAL2D.amberHi} fontFamily={FONT} fontSize={18} fontWeight={700}>
              A-A
            </text>
            <line x1={1515} y1={180} x2={2215} y2={180} stroke={PAL2D.grid} strokeWidth={1.4} />

            {/* Nền đất đá sỏi mặt cắt công sự ở y = 786 */}
            <rect x={1515} y={786} width={700} height={56} rx={4} fill={PAL2D.sandMid} stroke={PAL2D.ink} strokeWidth={2.4} />
            <rect x={1517} y={788} width={696} height={14} fill={PAL2D.sandHi} opacity={0.75} />
            <rect x={1515} y={842} width={700} height={44} rx={3} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={2} />

            {/* Tường chữ T hai biên đặt lùi xa tạo khoảng thoát áp rộng */}
            <TWallSection2D x={1562} y={786} scale={1.5} />
            <TWallSection2D x={2168} y={786} scale={1.5} />

            {/* Hai buồng ngủ container ChuSection2D có lắp mái kích nổ sớm hasBlastRoof={true} */}
            <g transform={`translate(0 ${(1 - Math.min(1, roofDropSpring)) * -18})`}>
              <ChuSection2D x={1762} y={786} scale={1.56} hasBlastRoof={t >= 396.45} tag="CHU" />
              <ChuSection2D x={1972} y={786} scale={1.56} hasBlastRoof={t >= 396.45} tag="CHU" />
              {/* Giàn dầm liên kết ngang giữa 2 mái kích nổ sớm tạo mặt chắn thép liên hoàn */}
              {t >= 396.45 && (
                <line
                  x1={1670}
                  y1={562}
                  x2={2064}
                  y2={562}
                  stroke={PAL2D.amberHi}
                  strokeWidth={3.2}
                  strokeDasharray="10 6"
                  opacity={0.75}
                />
              )}
            </g>

            {/* Vòm bảo vệ xanh nguyên vẹn cho buồng ngủ lính bên dưới khoảng đệm không khí */}
            {t >= roofHitAt && (
              <g opacity={0.9}>
                <rect
                  x={1678}
                  y={618}
                  width={168}
                  height={166}
                  rx={6}
                  fill={PAL2D.usMid}
                  fillOpacity={0.16}
                  stroke={PAL2D.ewTeal}
                  strokeWidth={2.6}
                />
                <rect
                  x={1888}
                  y={618}
                  width={168}
                  height={166}
                  rx={6}
                  fill={PAL2D.usMid}
                  fillOpacity={0.16}
                  stroke={PAL2D.ewTeal}
                  strokeWidth={2.6}
                />
              </g>
            )}

            {/* Thước đo khoảng đệm kích nổ sớm +0.85m trên nóc container */}
            <g opacity={prog(t, 396.7, 397.4)}>
              <line x1={2082} y1={562} x2={2082} y2={622} stroke={PAL2D.amberHi} strokeWidth={2} />
              <line x1={2072} y1={562} x2={2092} y2={562} stroke={PAL2D.amberHi} strokeWidth={2} />
              <line x1={2072} y1={622} x2={2092} y2={622} stroke={PAL2D.amberHi} strokeWidth={2} />
              <text x={2096} y={598} fill={PAL2D.amberHi} fontFamily={FONT} fontSize={16} fontWeight={700}>
                +0.85m
              </text>
            </g>

            {/* Quỹ đạo UAV lao xuống chạm GIÀN MÁI KÍCH NỔ SỚM ở trên cao (y = 556) */}
            {t >= roofDiveStart && (
              <line
                x1={1642}
                y1={248}
                x2={lerp(1642, 1762, roofDiveP)}
                y2={lerp(248, 556, roofDiveP)}
                stroke={PAL2D.threatMid}
                strokeWidth={3}
                strokeDasharray="9 6"
              />
            )}
            {t >= roofDiveStart && t < roofHitAt && (
              <Shahed2D
                x={lerp(1642, 1762, roofDiveP)}
                y={lerp(248, 556, roofDiveP)}
                rot={68}
                view="side"
                scale={0.96}
                propAngle={t * 36}
              />
            )}

            <Blast2D t={t} at={roofHitAt} x={1762} y={556} size={56} air life={3.8} seed={204} />

            {/* Các mũi tên sóng xung kích tản ngược lên trời thoáng, không phá sập buồng ngủ bên dưới */}
            {roofVentP > 0.02 && (
              <g opacity={Math.min(1, roofVentP * 1.4)}>
                {[
                  { d: 'M 1736 548 C 1684 490 1634 416 1590 340', tip: [1590, 340, -126] as const },
                  { d: 'M 1762 534 C 1766 456 1772 380 1778 298', tip: [1778, 298, -86] as const },
                  { d: 'M 1790 548 C 1856 490 1928 420 1998 346', tip: [1998, 346, -44] as const },
                  { d: 'M 1716 562 C 1660 550 1616 512 1578 456', tip: [1578, 456, -138] as const },
                ].map((ar, idx) => (
                  <g key={idx}>
                    <path
                      d={ar.d}
                      fill="none"
                      stroke={PAL2D.amberMid}
                      strokeWidth={4.4}
                      strokeLinecap="round"
                      {...drawOn(280, roofVentP)}
                    />
                    {roofVentP > 0.7 && (
                      <polygon
                        points="0,0 -15,-7 -15,7"
                        fill={PAL2D.amberHi}
                        transform={`translate(${ar.tip[0]} ${ar.tip[1]}) rotate(${ar.tip[2]})`}
                      />
                    )}
                  </g>
                ))}
              </g>
            )}
          </g>

          {/* --- BẢNG PHẢI B (x: 2270..3045): MẶT BẰNG XẾP SO LE CHỮ CHI TƯỜNG CHỮ T CẮT ĐỨT HÀNH LANG SÓNG NỔ --- */}
          <g filter="url(#sh)">
            <rect
              x={2270}
              y={104}
              width={775}
              height={864}
              rx={12}
              fill={PAL2D.panel}
              fillOpacity={0.9}
              stroke={PAL2D.usMid}
              strokeWidth={2.4}
            />
          </g>
          <g>
            <rect x={2296} y={128} width={64} height={34} rx={5} fill={PAL2D.usLo} stroke={PAL2D.ewTeal} strokeWidth={1.8} />
            <text x={2328} y={151} textAnchor="middle" fill={PAL2D.ewTeal} fontFamily={FONT} fontSize={18} fontWeight={700}>
              B-B
            </text>
            <line x1={2290} y1={180} x2={3025} y2={180} stroke={PAL2D.grid} strokeWidth={1.4} />

            {/* Ô đối chiếu nhỏ phía trên (y: 202..336): Hành lang ống thẳng cũ bị gạch bỏ */}
            <g>
              <rect
                x={2304}
                y={202}
                width={706}
                height={132}
                rx={8}
                fill={PAL2D.bgConsole}
                fillOpacity={0.68}
                stroke={PAL2D.threatLo}
                strokeWidth={1.8}
              />
              <rect x={2354} y={224} width={554} height={11} fill={PAL2D.concreteLo} opacity={0.6} />
              <rect x={2354} y={302} width={554} height={11} fill={PAL2D.concreteLo} opacity={0.6} />
              <line
                x1={2375}
                y1={268}
                x2={2885}
                y2={268}
                stroke={PAL2D.threatMid}
                strokeWidth={7.5}
                strokeDasharray="15 8"
                opacity={0.62}
              />
              <polygon points="2896,268 2878,258 2878,278" fill={PAL2D.threatMid} opacity={0.65} />
              <g transform="translate(2960 268)">
                <circle cx={0} cy={0} r={26} fill={PAL2D.threatLo} stroke={PAL2D.threatHi} strokeWidth={2.4} />
                <line x1={-13} y1={-13} x2={13} y2={13} stroke={PAL2D.chalk} strokeWidth={4} strokeLinecap="round" />
                <line x1={13} y1={-13} x2={-13} y2={13} stroke={PAL2D.chalk} strokeWidth={4} strokeLinecap="round" />
              </g>
            </g>

            {/* Sơ đồ mặt bằng chính (y: 364..936): Tường chữ T xếp so le chữ chi (Staggered / Baffled T-Walls) */}
            <rect
              x={2304}
              y={364}
              width={706}
              height={572}
              rx={10}
              fill={PAL2D.bgConsole}
              fillOpacity={0.75}
              stroke={PAL2D.grid}
              strokeWidth={1.8}
            />

            {/* 4 Dãy nhà ngủ container CHU đặt trong các hộc bảo vệ lệch pha */}
            <ChuPlanTop2D x={2462} y={482} />
            <ChuPlanTop2D x={2852} y={482} />
            <ChuPlanTop2D x={2462} y={818} />
            <ChuPlanTop2D x={2852} y={818} />

            {/* Tường chữ T bao ngoài xếp so le tạo 2 cửa thoát áp rộng ở giữa (x = 2560..2750) */}
            <TWallPlanSegment2D x={2446} y={404} len={194} />
            <TWallPlanSegment2D x={2860} y={404} len={194} />
            <TWallPlanSegment2D x={2446} y={896} len={194} />
            <TWallPlanSegment2D x={2860} y={896} len={194} />

            {/* Hệ tường chữ T chữ chi (staggered chicane baffles) cắt ngang trục hành lang y = 650 */}
            <TWallPlanSegment2D x={2458} y={576} len={176} />
            <TWallPlanSegment2D x={2536} y={626} len={114} vertical />

            <TWallPlanSegment2D x={2672} y={724} len={176} />
            <TWallPlanSegment2D x={2602} y={674} len={114} vertical />
            <TWallPlanSegment2D x={2742} y={674} len={114} vertical />

            <TWallPlanSegment2D x={2868} y={576} len={176} />
            <TWallPlanSegment2D x={2798} y={626} len={114} vertical />

            {/* Tâm nổ ở đầu vào hành lang (x = 2380, y = 650) */}
            <Blast2D t={t} at={baffleHitAt} x={2380} y={654} size={46} air life={3.8} seed={205} />

            {/* Sóng xung kích đỏ đâm thẳng vào răng chắn chữ T #1 và #2, bị đập gãy khúc hoàn toàn */}
            {corridorBreakP > 0.02 && (
              <g>
                <line
                  x1={2390}
                  y1={650}
                  x2={lerp(2390, 2520, Math.min(1, corridorBreakP * 2.0))}
                  y2={650}
                  stroke={PAL2D.threatMid}
                  strokeWidth={9}
                  strokeLinecap="round"
                />
                {corridorBreakP > 0.4 && (
                  <g>
                    {/* Tia phản xạ vỡ vụn tại vách chắn chữ T #1 (x = 2522) */}
                    <circle cx={2520} cy={650} r={11} fill={PAL2D.amberHi} opacity={0.85} />
                    <path
                      d="M 2520 650 L 2498 622 M 2520 650 L 2500 678 M 2520 650 L 2488 650"
                      stroke={PAL2D.amberHi}
                      strokeWidth={3.6}
                      strokeLinecap="round"
                    />
                    {/* Hành lang thẳng phía sau đã bị cắt đứt hoàn toàn (nét mờ tắt) */}
                    <line
                      x1={2554}
                      y1={650}
                      x2={2968}
                      y2={650}
                      stroke={PAL2D.muted}
                      strokeWidth={2.4}
                      strokeDasharray="7 9"
                      opacity={0.3}
                    />
                  </g>
                )}
              </g>
            )}

            {/* Dòng sóng áp lực ngoặt chữ chi & thoát áp sạch qua các khe tường chữ T lên trên và xuống dưới! */}
            {ventArrowsP > 0.02 && (
              <g opacity={Math.min(1, ventArrowsP * 1.35)}>
                {[
                  {
                    d: 'M 2516 654 C 2556 708 2566 792 2648 906',
                    tip: [2648, 906, 62] as const,
                    col: PAL2D.amberMid,
                  },
                  {
                    d: 'M 2518 644 C 2568 600 2612 500 2642 388',
                    tip: [2642, 388, -80] as const,
                    col: PAL2D.ewTeal,
                  },
                  {
                    d: 'M 2570 650 C 2635 612 2692 505 2704 388',
                    tip: [2704, 388, -88] as const,
                    col: PAL2D.ewTeal,
                  },
                  {
                    d: 'M 2672 652 C 2706 742 2698 836 2712 908',
                    tip: [2712, 908, 82] as const,
                    col: PAL2D.ewTeal,
                  },
                ].map((va, idx) => (
                  <g key={idx}>
                    <path
                      d={va.d}
                      fill="none"
                      stroke={va.col}
                      strokeWidth={4.8}
                      strokeLinecap="round"
                      {...drawOn(380, ventArrowsP)}
                    />
                    {ventArrowsP > 0.68 && (
                      <polygon
                        points="0,0 -16,-7.5 -16,7.5"
                        fill={va.col}
                        transform={`translate(${va.tip[0]} ${va.tip[1]}) rotate(${va.tip[2]})`}
                      />
                    )}
                  </g>
                ))}

                {/* Dấu kiểm xanh an toàn trên cả 4 dãy nhà ngủ CHU */}
                {[
                  [2462, 482],
                  [2852, 482],
                  [2462, 818],
                  [2852, 818],
                ].map(([cx, cy], idx) => (
                  <g key={idx} transform={`translate(${cx} ${cy})`}>
                    <circle cx={0} cy={0} r={18} fill={PAL2D.bgNight} stroke={PAL2D.ewTeal} strokeWidth={2.6} />
                    <path d="M -7 0 L -2 6 L 8 -6" fill="none" stroke={PAL2D.ewTeal} strokeWidth={3.2} strokeLinecap="round" />
                  </g>
                ))}
              </g>
            )}
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />
    </AbsoluteFill>
  );
};

export default S20;
