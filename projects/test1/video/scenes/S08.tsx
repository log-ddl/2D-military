import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, FONT, lerp, prog } from '@kit/theme';
import { handheld, Label, useSpring, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { arcAngle, arcAt, arcPath, drawOn } from '@lib/2d/path';
import { Blast2D, Muzzle2D, Puff2D } from '@lib/2d/fx';
import { contours, skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { MQ9Side2D, Munition2D } from '../local/uav2d';

// Tạo sẵn địa hình đồi cát sa mạc nhiều lớp (Phần A) và đường đồng mức bản đồ đô thị (Phần B) ở cấp module
const SKY_FAR = skyline('s08_far', -220, 2120, 670, 148, 680, 1250);
const SKY_MID = skyline('s08_mid', -220, 2120, 736, 120, 540, 1250);
const SKY_NEAR = skyline('s08_near', -220, 2120, 804, 80, 440, 1250);
const SKY_GROUND = skyline('s08_gnd', -220, 2120, 868, 22, 520, 1250);
const MAP_CONTOURS = contours('s08_urban', 840, 840, 7, 20, 420);

const easeInOut = (x: number) => x * x * (3 - 2 * x);

/** Xe tăng chiến đấu chủ lực (MBT) vẽ 2D chi tiết 3 tông: xích, 6 bánh chịu nặng, giáp hộp ERA, tháp pháo & pháo chính 125mm */
const MainBattleTank2D: React.FC<{ x: number; y: number; scale?: number; hitDt: number }> = ({
  x,
  y,
  scale = 1.24,
  hitDt,
}) => {
  const damaged = hitDt >= 0;
  const turretPopY = damaged ? -Math.min(22, hitDt * 62) + Math.min(10, Math.max(0, hitDt - 0.35) * 26) : 0;
  const turretTilt = damaged ? Math.min(17, hitDt * 48) : 0;
  const hullBase = damaged ? '#484039' : '#7d6c50';
  const hullLight = damaged ? '#61564c' : '#a18e6c';
  const hullDark = damaged ? '#2a2520' : '#534733';

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} filter="url(#sh)">
      {/* Bóng đổ mặt đất dưới xích xe */}
      <ellipse cx={0} cy={6} rx={126} ry={13} fill="rgba(18,15,12,0.48)" />

      {/* Cụm dải xích & 6 bánh xe chịu nặng + bánh dẫn hướng / chủ động */}
      <g transform="translate(0, -14)">
        <rect
          x={-108}
          y={-14}
          width={216}
          height={28}
          rx={14}
          fill="#23272e"
          stroke={P.ink}
          strokeWidth={2.6}
        />
        <rect x={-100} y={-9} width={200} height={18} rx={9} fill="#363c46" />
        <circle cx={-92} cy={0} r={10} fill="#505866" stroke={P.ink} strokeWidth={2.2} />
        <circle cx={92} cy={0} r={10} fill="#505866" stroke={P.ink} strokeWidth={2.2} />
        {[-68, -41, -14, 13, 40, 67].map((wx, idx) => (
          <g key={idx} transform={`translate(${wx} 2)`}>
            <circle cx={0} cy={0} r={11.5} fill={hullDark} stroke={P.ink} strokeWidth={2.2} />
            <circle cx={0} cy={0} r={5.5} fill={hullLight} stroke={P.ink} strokeWidth={1.5} />
          </g>
        ))}
      </g>

      {/* Thân xe bọc thép vát nghiêng + váy chắn xích + gạch giáp phản ứng nổ ERA */}
      <path
        d="M -116,-24 L -94,-42 L 76,-42 L 114,-31 L 110,-18 L -112,-18 Z"
        fill={hullBase}
        stroke={P.ink}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />
      <path d="M -92,-41 L 74,-41 L 106,-32 L -102,-32 Z" fill={hullLight} opacity={0.84} />
      <rect x={-96} y={-28} width={186} height={11} rx={2} fill={hullDark} stroke={P.ink} strokeWidth={2} />
      {[-78, -50, -22, 6, 34, 62].map((bx, i) => (
        <rect
          key={i}
          x={bx}
          y={-27}
          width={24}
          height={9}
          fill={i % 2 === 0 ? hullBase : hullLight}
          stroke={P.ink}
          strokeWidth={1.4}
        />
      ))}
      <rect x={92} y={-47} width={22} height={15} rx={4} fill={hullDark} stroke={P.ink} strokeWidth={2.2} />

      {/* Tháp pháo & Nòng pháo chính 125mm hướng sang trái (-X) — bật tung và nghiêng lệch khi trúng Hellfire */}
      <g transform={`translate(-6 ${-42 + turretPopY}) rotate(${turretTilt})`}>
        <rect x={-150} y={-14} width={98} height={6.8} rx={2} fill={hullBase} stroke={P.ink} strokeWidth={2.2} />
        <rect x={-148} y={-13} width={94} height={2.3} fill={hullLight} />
        <rect x={-105} y={-16.8} width={23} height={12} rx={3} fill={hullDark} stroke={P.ink} strokeWidth={2.2} />

        <path
          d="M -56,-2 L -44,-22 L -12,-28 L 36,-26 L 54,-12 L 48,-2 Z"
          fill={hullBase}
          stroke={P.ink}
          strokeWidth={2.6}
          strokeLinejoin="round"
        />
        <path d="M -42,-21 L -12,-26 L 34,-25 L 44,-16 L -46,-14 Z" fill={hullLight} opacity={0.85} />
        <polygon points="-54,-5 -42,-21 -28,-19 -38,-4" fill={hullDark} stroke={P.ink} strokeWidth={1.8} />
        <rect x={4} y={-34} width={22} height={7} rx={2} fill={hullDark} stroke={P.ink} strokeWidth={2} />
        <rect x={-22} y={-32} width={12} height={5} rx={1.5} fill={P.opticGlass} stroke={P.ink} strokeWidth={1.8} />
        <line x1={18} y1={-34} x2={18} y2={-44} stroke={P.ink} strokeWidth={2.4} />
        <line x1={-6} y1={-34} x2={26} y2={-43} stroke={P.ink} strokeWidth={2.6} />
      </g>

      {/* Lửa âm ỉ và vết phá huỷ xuyên nóc tháp pháo sau cú đánh nổ */}
      {damaged && (
        <g>
          <ellipse cx={-6} cy={-40} rx={38} ry={11} fill="#141210" opacity={0.88} />
          <ellipse
            cx={-6}
            cy={-43}
            rx={22}
            ry={8}
            fill={P.flirHot}
            opacity={0.45 + 0.3 * Math.sin(hitDt * 11)}
            filter="url(#glow)"
          />
          <circle cx={-8} cy={-44} r={8} fill="#fff2bd" opacity={0.55 + 0.25 * Math.cos(hitDt * 14)} />
        </g>
      )}
    </g>
  );
};

/** Lưỡi kiếm thép titan trong mặt cắt trục chính diện (Axial Rosette View đối xứng 60 độ) */
const RosetteBlade2D: React.FC<{ angleDeg: number; deploy: number; glint: number }> = ({
  angleDeg,
  deploy,
  glint,
}) => {
  const ext = lerp(14, 162, deploy);
  const bladeOpacity = lerp(0.25, 1, Math.min(1, deploy * 2.5));
  const glintPos = lerp(44, 184, glint);

  return (
    <g transform={`rotate(${angleDeg})`} opacity={bladeOpacity}>
      <g transform={`translate(${36 + ext} 0)`}>
        {/* Thân kiếm thép 3 tông rộng sắc nét */}
        <polygon
          points="-162,-10.5 -24,-12.5 12,0 -20,10.5 -162,8.5"
          fill="#697b91"
          stroke={P.ink}
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
        {/* Mép mài sắc sáng trắng kim loại titan */}
        <polygon points="-158,-9.8 -24,-11.8 10,0 -26,-2.5 -158,-2.5" fill="#f1f6fc" />
        {/* Rãnh động năng đỏ thẫm đặc trưng */}
        <rect x={-144} y={1.5} width={108} height={3.4} rx={1.7} fill={P.danger} opacity={0.92} />
        {/* Chốt khớp bản lề cơ khí */}
        <circle cx={-150} cy={-1} r={4.8} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />

        {/* Vệt loé kim loại (specular glint) quét dọc lưỡi dao */}
        {deploy > 0.35 && glint > 0 && glint < 1 && (
          <polygon
            points={`${glintPos - 175},-11 ${glintPos - 153},-11 ${glintPos - 140},9 ${glintPos - 162},9`}
            fill="#ffffff"
            opacity={0.9 * Math.sin(glint * Math.PI)}
          />
        )}
      </g>
    </g>
  );
};

const S08: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Chuyển máy quay ngang từ Phần A (tâm 960, 540) sang Phần B (tâm 2960, 540) đúng mốc CUE.s08_r9x_reveal (74.94s)
  const panP = prog(t, 74.75, 75.28, easeInOut);
  const camX = lerp(960, 2960, panP);
  const camY = 540;
  const camZoom = 1 + 0.03 * Math.sin(panP * Math.PI);

  // Rung máy quay cầm tay + chấn động mạnh khi nổ xe tăng (72.40s) + chấn động cơ khí sắc gọn khi R-9X chạm đích (78.76s)
  const [hx, hy] = handheld(t, 2.5, 's08_cam');
  const tankBlastShake = bump(t, CUE.s08_tank_hit, 0.58) * 18;
  const kineticHitShake = bump(t, CUE.s08_kinetic_strike, 0.24) * 11;
  const shakeX = hx + Math.sin(t * 58) * (tankBlastShake + kineticHitShake);
  const shakeY = hy + Math.cos(t * 49) * (tankBlastShake * 0.85 + kineticHitShake);

  // ---------------- PHẦN A: HELLFIRE TIÊU CHUẨN DIỆT TĂNG TẦM 8 KM (70.70 - 74.75s) ----------------
  const uavX = 245 + (t - 70.7) * 24;
  const uavY = 186;
  const launchX = 298;
  const launchY = 226;
  const tankX = 1485;
  const tankY = 868;
  const hitX = tankX - 10;
  const hitY = tankY - 56;
  const arcApex = 160;

  const flyRaw = prog(t, 70.45, CUE.s08_tank_hit, (x) => x * x * (2.2 - 1.2 * x));
  const missileInFlight = t < CUE.s08_tank_hit;
  const [mx, my] = arcAt(launchX, launchY, hitX, hitY, arcApex, flyRaw);
  const mAngle = arcAngle(launchX, launchY, hitX, hitY, arcApex, flyRaw);
  const hitDt = t - CUE.s08_tank_hit;

  // Thước cung đo tầm bắn chuẩn xác 8 km
  const pRange8km = prog(t, CUE.s08_tank_hit + 0.12, CUE.s08_range_8km + 0.15, easeInOut);

  // ---------------- PHẦN B: BIẾN THỂ KIẾM ĐỘNG NĂNG AGM-114R9X NINJA BOMB (74.75 - 80.68s) ----------------
  // Bật xoè 6 lưỡi kiếm thép titan đối xứng 60 độ đúng mốc CUE.s08_blades_open (76.56s)
  const bladeSpring = useSpring(t, CUE.s08_blades_open - 0.18, 11, 210);
  const bladeDeploy = Math.max(0, Math.min(1.05, bladeSpring));
  const bladeGlint = prog(t, CUE.s08_blades_open - 0.05, CUE.s08_blades_open + 1.0, (x) => x);

  // Pha lao xuống & chém động năng chính xác vào xe mục tiêu ở tâm lúc CUE.s08_kinetic_strike (78.76s)
  const strikeApproach = prog(t, CUE.s08_kinetic_strike - 0.42, CUE.s08_kinetic_strike, (x) => x * x);
  const strikeDt = t - CUE.s08_kinetic_strike;
  const isStruck = strikeDt >= 0;

  return (
    <AbsoluteFill>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={[shakeX, shakeY]} bg={P.boardBg}>
        <svg width={4000} height={1080} style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(8, 14, 24, 0.46)" />

          <defs>
            <linearGradient id="s08_skyA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P.stratTop} />
              <stop offset="42%" stopColor={P.stratMid} />
              <stop offset="68%" stopColor={P.stratLow} />
              <stop offset="86%" stopColor={P.dawnHorizon} />
              <stop offset="100%" stopColor={P.dawnGlow} />
            </linearGradient>

            <linearGradient id="s08_boardB" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0c1827" />
              <stop offset="55%" stopColor={P.boardBg} />
              <stop offset="100%" stopColor="#13253b" />
            </linearGradient>

            <clipPath id="s08_zoneAClip">
              <rect x={-220} y={-120} width={2180} height={1320} />
            </clipPath>
            <clipPath id="s08_urbanClip">
              <rect x={3005} y={108} width={840} height={868} rx={16} />
            </clipPath>
          </defs>

          {/* ===================================================================================== */}
          {/* PHẦN A (x: 0..1960): AGM-114 HELLFIRE TIÊU CHUẨN DIỆT TĂNG TẦM BẮN 8 KM               */}
          {/* ===================================================================================== */}
          <g clipPath="url(#s08_zoneAClip)">
            <rect x={-220} y={-120} width={2180} height={1020} fill="url(#s08_skyA)" />

            {/* Lưới toạ độ chiến thuật trên tầng bình lưu */}
            {Array.from({ length: 11 }, (_, i) => (
              <line
                key={`gx${i}`}
                x1={i * 200}
                y1={0}
                x2={i * 200}
                y2={680}
                stroke={P.gridMinor}
                strokeWidth={1}
                opacity={0.28}
              />
            ))}
            {[140, 280, 420, 560].map((gy) => (
              <line
                key={`gy${gy}`}
                x1={-100}
                y1={gy}
                x2={1960}
                y2={gy}
                stroke={P.gridMinor}
                strokeWidth={1}
                opacity={0.25}
              />
            ))}

            {/* Đĩa sáng bình minh thấp trên đường chân trời */}
            <circle cx={1040} cy={685} r={195} fill={P.dawnGlow} opacity={0.22} />

            {/* 4 lớp địa hình núi đá đỏ & đồi cát sa mạc (skyline nhiều lớp) */}
            <path d={SKY_FAR} fill={P.mesaOchre} opacity={0.55} />
            <path d={SKY_MID} fill={P.mesaOchre} opacity={0.88} />
            <path d={SKY_NEAR} fill={P.canyonDark} />
            <path d={SKY_GROUND} fill={P.sandMid} />
            <rect x={-220} y={856} width={2180} height={260} fill={P.sandMid} />
            <path d="M -220,858 L 1960,858" stroke={P.sandLight} strokeWidth={4} opacity={0.78} />
            <ellipse cx={1485} cy={878} rx={380} ry={24} fill={P.mesaOchre} opacity={0.36} />

            {/* Tia chỉ thị mục tiêu laser xanh ngọc từ cầu mắt MTS-B khoá thẳng nóc xe tăng */}
            <line
              x1={uavX + 90}
              y1={uavY + 20}
              x2={hitX}
              y2={hitY}
              stroke={P.laser}
              strokeWidth={2.4}
              strokeDasharray="12 8"
              opacity={t < CUE.s08_tank_hit + 0.35 ? 0.76 : 0.24}
              filter="url(#glow)"
            />

            {/* MQ-9 Reaper bay tuần tra điểm hoả ở góc cao bên trái */}
            <g filter="url(#sh)">
              <MQ9Side2D x={uavX} y={uavY} scale={0.66} rot={2} propPhase={t * 42} showWeapons />
            </g>

            {/* Khói phụt rời giá phóng tên lửa lúc 70.94s */}
            <Muzzle2D t={t} at={CUE.s08_hellfire_launch} x={launchX + 20} y={launchY + 6} angle={18} size={32} seed={81} />

            {/* Quỹ đạo bổ nhào từ trên cao của AGM-114 Hellfire */}
            <path
              d={arcPath(launchX, launchY, hitX, hitY, arcApex, 1)}
              fill="none"
              stroke={P.paper}
              strokeWidth={2}
              strokeDasharray="8 10"
              opacity={0.32}
            />
            <path
              d={arcPath(launchX, launchY, hitX, hitY, arcApex, missileInFlight ? flyRaw : 1)}
              fill="none"
              stroke={P.flirHot}
              strokeWidth={4.8}
              strokeLinecap="round"
              filter="url(#glow)"
            />

            {/* Thước cung đo tầm bắn 8 KM (arcPath + drawOn) */}
            {pRange8km > 0.01 && (
              <g opacity={Math.min(1, pRange8km * 1.6)}>
                <line
                  x1={launchX}
                  y1={launchY + 26}
                  x2={launchX}
                  y2={952}
                  stroke={P.gold}
                  strokeWidth={2.2}
                  strokeDasharray="6 6"
                  opacity={0.85}
                />
                <line
                  x1={hitX}
                  y1={hitY + 62}
                  x2={hitX}
                  y2={952}
                  stroke={P.gold}
                  strokeWidth={2.2}
                  strokeDasharray="6 6"
                  opacity={0.85}
                />
                <path
                  d={`M ${launchX} 938 L ${hitX} 938`}
                  fill="none"
                  stroke={P.gold}
                  strokeWidth={4.5}
                  {...drawOn(hitX - launchX, pRange8km)}
                />
                <polygon points={`${launchX},938 ${launchX + 18},929 ${launchX + 18},947`} fill={P.gold} />
                <polygon
                  points={`${lerp(launchX, hitX, pRange8km)},938 ${lerp(launchX, hitX, pRange8km) - 18},929 ${lerp(launchX, hitX, pRange8km) - 18},947`}
                  fill={P.gold}
                />
                <path
                  d={arcPath(launchX, launchY - 36, hitX, hitY - 48, arcApex + 18, 1)}
                  fill="none"
                  stroke={P.gold}
                  strokeWidth={3.2}
                  {...drawOn(1560, pRange8km)}
                />
              </g>
            )}

            {/* Xe tăng chiến đấu chủ lực (MBT) 3 tông chi tiết */}
            <MainBattleTank2D x={tankX} y={tankY} scale={1.24} hitDt={hitDt} />

            {/* Khung ngắm khoá nóc tháp pháo xe tăng trước khi đạn chạm */}
            {missileInFlight && (
              <g transform={`translate(${hitX} ${hitY - 4})`} opacity={0.92}>
                <circle cx={0} cy={0} r={38} fill="none" stroke={P.danger} strokeWidth={2.6} strokeDasharray="10 6" />
                <line x1={-52} y1={0} x2={-24} y2={0} stroke={P.danger} strokeWidth={2.6} />
                <line x1={24} y1={0} x2={52} y2={0} stroke={P.danger} strokeWidth={2.6} />
                <line x1={0} y1={-52} x2={0} y2={-24} stroke={P.danger} strokeWidth={2.6} />
                <line x1={0} y1={24} x2={0} y2={52} stroke={P.danger} strokeWidth={2.6} />
              </g>
            )}

            {/* Quả đạn AGM-114 Hellfire lao dốc cắm thẳng vào nóc xe tăng */}
            {missileInFlight && (
              <g transform={`translate(${mx} ${my}) rotate(${mAngle})`}>
                <ellipse cx={-72} cy={0} rx={28} ry={7.5} fill={P.flirHot} opacity={0.88} filter="url(#glow)" />
                <ellipse cx={-60} cy={0} rx={16} ry={4.2} fill="#fff3c4" />
                <Munition2D kind="hellfire" scale={1.42} />
              </g>
            )}

            {/* Vòng sóng xung kích đỏ P.danger lan rộng + vụ nổ kép xuyên giáp diệt tăng tại 72.40s */}
            {hitDt >= 0 && hitDt < 3.2 && (
              <g>
                <circle
                  cx={hitX}
                  cy={hitY}
                  r={36 + Math.pow(Math.min(1, hitDt / 1.35), 0.55) * 320}
                  fill="none"
                  stroke={P.danger}
                  strokeWidth={6.5 * Math.max(0, 1 - hitDt / 1.5)}
                  opacity={Math.max(0, 0.95 - hitDt * 0.52)}
                />
                <ellipse
                  cx={hitX}
                  cy={tankY - 6}
                  rx={50 + Math.pow(Math.min(1, hitDt / 1.45), 0.6) * 305}
                  ry={15 + Math.pow(Math.min(1, hitDt / 1.45), 0.6) * 54}
                  fill="none"
                  stroke={P.danger}
                  strokeWidth={3.8}
                  strokeDasharray="14 8"
                  opacity={Math.max(0, 0.88 - hitDt * 0.34)}
                />
              </g>
            )}
            {/* Cú nổ chính + kích nổ thứ cấp khoang đạn xe tăng giúp cầu lửa sáng rực và khói tan thoáng lộ xác xe */}
            <Blast2D t={t} at={CUE.s08_tank_hit} x={hitX} y={tankY - 14} size={98} seed={18} life={2.6} />
            <Blast2D t={t} at={CUE.s08_tank_hit + 0.26} x={hitX + 12} y={tankY - 28} size={76} seed={29} life={2.3} />
            {hitDt > 0.4 && (
              <Puff2D
                x={hitX + 26 + hitDt * 22}
                y={tankY - 105 - hitDt * 42}
                r={30 + hitDt * 9}
                color="#3a332d"
                opacity={Math.max(0, 0.58 - hitDt * 0.14)}
                seed={99}
              />
            )}
          </g>

          {/* Thanh phân cách kỹ thuật giữa Chiến trường Phần A và Bảng giải phẫu cơ khí Phần B */}
          <rect x={1952} y={-80} width={56} height={1240} fill="#0a1320" stroke={P.gridMajor} strokeWidth={2} />

          {/* ===================================================================================== */}
          {/* PHẦN B (x: 2000..3920, tâm 2960): GIẢI PHẪU CƠ KHÍ R-9X & SƠ ĐỒ 0 THIỆT HẠI PHỤ CẬN */}
          {/* ===================================================================================== */}
          <g>
            <rect x={2000} y={-80} width={1980} height={1240} fill="url(#s08_boardB)" />

            {/* Lưới blueprint kỹ thuật mảnh & chính */}
            {Array.from({ length: 40 }, (_, i) => {
              const gx = 2000 + i * 48;
              const major = i % 5 === 0;
              return (
                <line
                  key={`bgx${i}`}
                  x1={gx}
                  y1={0}
                  x2={gx}
                  y2={1080}
                  stroke={major ? P.gridMajor : P.gridMinor}
                  strokeWidth={major ? 1.4 : 0.9}
                  opacity={major ? 0.38 : 0.24}
                />
              );
            })}
            {Array.from({ length: 23 }, (_, j) => {
              const gy = j * 48;
              const major = j % 5 === 0;
              return (
                <line
                  key={`bgy${j}`}
                  x1={2000}
                  y1={gy}
                  x2={3960}
                  y2={gy}
                  stroke={major ? P.gridMajor : P.gridMinor}
                  strokeWidth={major ? 1.4 : 0.9}
                  opacity={major ? 0.38 : 0.24}
                />
              );
            })}

            {/* --------------------------------------------------------------------------------- */}
            {/* KHUNG TRÁI KHU B (x: 2048..2948): THÂN R-9X CẮT DỌC & MẶT CẮT TRỤC HOA THỊ 60°    */}
            {/* --------------------------------------------------------------------------------- */}
            <g filter="url(#sh)">
              <rect
                x={2048}
                y={66}
                width={900}
                height={948}
                rx={20}
                fill={P.boardPanel}
                stroke={P.gridMajor}
                strokeWidth={2.5}
              />
            </g>
            <path d="M 2068 98 L 2068 82 L 2088 82" fill="none" stroke={P.laser} strokeWidth={3} />
            <path d="M 2928 98 L 2928 82 L 2908 82" fill="none" stroke={P.laser} strokeWidth={3} />
            <path d="M 2068 982 L 2068 998 L 2088 998" fill="none" stroke={P.laser} strokeWidth={3} />
            <path d="M 2928 982 L 2928 998 L 2908 998" fill="none" stroke={P.laser} strokeWidth={3} />

            {/* 1A. Quả tên lửa AGM-114R9X phóng lớn nhìn dọc (hạ xuống y = 338 để thoáng hoàn toàn phía dưới Label ở y = 114) */}
            <g transform="translate(2495, 338)">
              <line x1={-390} y1={0} x2={400} y2={0} stroke={P.gridMajor} strokeWidth={1.6} strokeDasharray="12 8" />

              {/* 6 lưỡi kiếm thép titan bật xoè ra khỏi khe dọc trên thân tên lửa (cấu hình thật xoay mở từ khớp trước về phía sau-ngoài) */}
              {[-1, 1].map((side) => {
                const openDeg = side * lerp(3, 38, bladeDeploy);
                const innerDeg = side * lerp(1.5, 20, bladeDeploy);
                return (
                  <g key={side}>
                    {/* Cặp kiếm sườn xa */}
                    <g
                      transform={`translate(112, ${side * 16}) rotate(${180 - innerDeg})`}
                      opacity={lerp(0.15, 0.86, bladeDeploy)}
                    >
                      <polygon
                        points="0,0 162,-4 188,0 156,5 0,4"
                        fill="#8c9cb2"
                        stroke={P.ink}
                        strokeWidth={2}
                      />
                    </g>
                    {/* Cặp kiếm chính bung rộng sắc lẹm */}
                    <g
                      transform={`translate(124, ${side * 22}) rotate(${180 - openDeg})`}
                      opacity={lerp(0.2, 1, bladeDeploy)}
                    >
                      <polygon
                        points={`0,0 178,${side * -8} 212,0 174,${side * 6} 0,${side * 4}`}
                        fill="#edf3fb"
                        stroke={P.ink}
                        strokeWidth={2.4}
                        strokeLinejoin="round"
                      />
                      <line x1={14} y1={0} x2={176} y2={0} stroke={P.danger} strokeWidth={2.8} />
                      <circle cx={6} cy={0} r={4.2} fill={P.gold} stroke={P.ink} strokeWidth={1.5} />
                    </g>
                  </g>
                );
              })}

              {/* Cánh đuôi ổn định của R-9X */}
              <polygon points="-328,-28 -305,-82 -218,-30" fill={P.missileLight} stroke={P.ink} strokeWidth={2.6} />
              <polygon points="-328,28 -305,82 -218,30" fill="#1d222a" stroke={P.ink} strokeWidth={2.6} />

              {/* Thân chính tên lửa AGM-114R9X phóng lớn (3 tông khối) */}
              <path
                d="M -335,-29 L 245,-29 C 308,-29 350,-14 358,0 C 350,14 308,29 245,29 L -335,29 Z"
                fill={P.missileBody}
                stroke={P.ink}
                strokeWidth={3.2}
              />
              <rect x={-328} y={-24} width={565} height={12} rx={4} fill={P.missileLight} opacity={0.78} />
              <rect x={-328} y={14} width={560} height={10} rx={3} fill="#181c23" opacity={0.82} />

              {/* Khoang cắt giải phẫu cơ khí (Cutaway Bay): KHÔNG thuốc nổ, lộ cơ cấu cơ khí & 6 rãnh dọc mở kiếm */}
              <rect
                x={-88}
                y={-22}
                width={236}
                height={44}
                rx={6}
                fill="#111720"
                stroke={P.gold}
                strokeWidth={2.2}
              />
              <rect x={-76} y={-7} width={212} height={14} rx={3} fill="#505d70" stroke={P.ink} strokeWidth={1.8} />
              <rect x={-66} y={-15.5} width={190} height={4} rx={1.5} fill={P.danger} opacity={0.88} />
              <rect x={-66} y={11.5} width={190} height={4} rx={1.5} fill={P.danger} opacity={0.88} />
              {[-52, -14, 24, 62, 100].map((rx, i) => (
                <line key={i} x1={rx} y1={-21} x2={rx} y2={21} stroke={P.gridMajor} strokeWidth={1.5} opacity={0.6} />
              ))}

              {/* Cánh lái nhỏ phía trước & Vòm kính đầu dò bán chủ động laser xanh lục */}
              <polygon points="168,-29 184,-46 242,-29" fill={P.missileLight} stroke={P.ink} strokeWidth={2.2} />
              <polygon points="168,29 184,46 242,29" fill="#1d222a" stroke={P.ink} strokeWidth={2.2} />
              <rect x={182} y={-29} width={12} height={58} fill={P.danger} />
              <path
                d="M 286,-25 C 332,-23 358,-11 358,0 C 358,11 332,23 286,25 Z"
                fill={P.opticGlass}
                stroke={P.ink}
                strokeWidth={2.6}
              />
              <ellipse cx={322} cy={-7} rx={18} ry={7} fill={P.laser} opacity={0.85} />
            </g>

            {/* Đường gióng mặt cắt trục nối từ khoang kiếm xuống Mặt cắt hoa thị 60° */}
            <line
              x1={2498}
              y1={386}
              x2={2498}
              y2={502}
              stroke={P.gold}
              strokeWidth={2.2}
              strokeDasharray="7 6"
              opacity={0.78}
            />

            {/* 1B. Mặt cắt trục chính diện (Axial Rosette View): 6 lưỡi kiếm xoè đối xứng 60° đều tăm tắp */}
            <g transform="translate(2498, 738)">
              <circle cx={0} cy={0} r={216} fill="#102033" stroke={P.gridMajor} strokeWidth={2.4} />
              <circle
                cx={0}
                cy={0}
                r={184}
                fill="none"
                stroke={P.gridMajor}
                strokeWidth={1.6}
                strokeDasharray="8 8"
                opacity={0.72}
              />
              <circle cx={0} cy={0} r={112} fill="none" stroke={P.gridMinor} strokeWidth={1.4} />

              {/* 6 trục chia độ 60° */}
              {[0, 60, 120, 180, 240, 300].map((degA) => {
                const rad = ((degA - 90) * Math.PI) / 180;
                return (
                  <g key={degA}>
                    <line
                      x1={0}
                      y1={0}
                      x2={Math.cos(rad) * 216}
                      y2={Math.sin(rad) * 216}
                      stroke={P.gridMajor}
                      strokeWidth={1.5}
                      strokeDasharray="5 6"
                      opacity={0.65}
                    />
                    <circle
                      cx={Math.cos(rad) * 216}
                      cy={Math.sin(rad) * 216}
                      r={4.5}
                      fill={bladeDeploy > 0.5 ? P.danger : P.gridMajor}
                    />
                  </g>
                );
              })}

              {/* Cung chỉ thị góc đối xứng 60° */}
              {bladeDeploy > 0.45 && (
                <g opacity={Math.min(1, (bladeDeploy - 0.45) * 2.5)}>
                  <path d="M 0,-132 A 132,132 0 0,1 114.3,-66" fill="none" stroke={P.gold} strokeWidth={3.2} />
                  <text
                    x={72}
                    y={-116}
                    fill={P.gold}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={24}
                    textAnchor="middle"
                  >
                    60°
                  </text>
                </g>
              )}

              {/* 6 lưỡi kiếm thép titan bật xoè hoa thị tử thần */}
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <RosetteBlade2D key={k} angleDeg={k * 60 - 90} deploy={bladeDeploy} glint={bladeGlint} />
              ))}

              {/* Mặt cắt ngang thân trụ tên lửa R-9X ở chính tâm + 6 khe mở vỏ + thấu kính đầu dò */}
              <circle cx={0} cy={0} r={52} fill={P.missileBody} stroke={P.ink} strokeWidth={3.5} />
              <circle cx={0} cy={0} r={42} fill="#1b212b" stroke={P.missileLight} strokeWidth={2} />
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <g key={k} transform={`rotate(${k * 60 - 90})`}>
                  <rect x={36} y={-6} width={19} height={12} rx={2} fill="#0d1117" stroke={P.gold} strokeWidth={1.6} />
                </g>
              ))}
              <circle cx={0} cy={0} r={23} fill={P.opticGlass} stroke={P.ink} strokeWidth={2.5} />
              <circle cx={0} cy={0} r={11.5} fill={P.laser} opacity={0.92} filter="url(#glow)" />
              <circle cx={-5} cy={-5} r={4.2} fill="#ffffff" opacity={0.85} />
            </g>

            {/* --------------------------------------------------------------------------------- */}
            {/* KHUNG PHẢI KHU B (x: 2988..3872): BẢN ĐỒ MẶT BẰNG TOP-DOWN 0 THIỆT HẠI PHỤ CẬN    */}
            {/* --------------------------------------------------------------------------------- */}
            <g filter="url(#sh)">
              <rect
                x={2988}
                y={66}
                width={884}
                height={948}
                rx={20}
                fill={P.boardPanel}
                stroke={P.gridMajor}
                strokeWidth={2.5}
              />
            </g>
            <path d="M 3008 98 L 3008 82 L 3028 82" fill="none" stroke={P.laser} strokeWidth={3} />
            <path d="M 3852 98 L 3852 82 L 3832 82" fill="none" stroke={P.laser} strokeWidth={3} />
            <path d="M 3008 982 L 3008 998 L 3028 998" fill="none" stroke={P.laser} strokeWidth={3} />
            <path d="M 3852 982 L 3852 998 L 3832 998" fill="none" stroke={P.laser} strokeWidth={3} />

            <g clipPath="url(#s08_urbanClip)">
              {/* Nền khu phố đô thị nhìn từ trên xuống */}
              <rect x={3005} y={108} width={840} height={868} fill="#172a40" />

              {/* Đường đồng mức mảnh dưới nền bản đồ */}
              <g transform="translate(3005, 118)" opacity={0.22}>
                {MAP_CONTOURS.map((c) => (
                  <path key={c.level} d={c.d} fill="none" stroke={P.gridMajor} strokeWidth={1.2} />
                ))}
              </g>

              {/* Giao lộ đường nhựa & vỉa hè khu dân cư sát mục tiêu */}
              <rect x={3325} y={108} width={200} height={868} fill="#1e334c" />
              <rect x={3005} y={442} width={840} height={200} fill="#1e334c" />
              <line
                x1={3425}
                y1={108}
                x2={3425}
                y2={976}
                stroke={P.paper}
                strokeWidth={2.2}
                strokeDasharray="18 16"
                opacity={0.38}
              />
              <line
                x1={3005}
                y1={542}
                x2={3845}
                y2={542}
                stroke={P.paper}
                strokeWidth={2.2}
                strokeDasharray="18 16"
                opacity={0.38}
              />

              {/* Bốn lô vỉa hè khu dân cư sát giao lộ */}
              <rect x={3020} y={124} width={288} height={300} rx={12} fill="#243d59" stroke={P.gridMajor} strokeWidth={2} />
              <rect x={3542} y={124} width={288} height={300} rx={12} fill="#243d59" stroke={P.gridMajor} strokeWidth={2} />
              <rect x={3020} y={660} width={288} height={300} rx={12} fill="#243d59" stroke={P.gridMajor} strokeWidth={2} />
              <rect x={3542} y={660} width={288} height={300} rx={12} fill="#243d59" stroke={P.gridMajor} strokeWidth={2} />

              {/* Vòng bán kính sát thương thuốc nổ thông thường (nét đứt đỏ đối chiếu — trùm lên toàn bộ nhà dân & xe dân sự) */}
              <circle
                cx={3425}
                cy={542}
                r={308}
                fill="none"
                stroke={P.danger}
                strokeWidth={2.4}
                strokeDasharray="10 10"
                opacity={0.46}
              />

              {/* 4 TOÀ NHÀ & 2 XE DÂN SỰ PHỤ CẬN NẰM SÁT NGAY CẠNH MỤC TIÊU — SÁNG NGUYÊN VẸN 100%! */}
              {/* 1. Toà nhà dân cư góc trên-trái */}
              <g transform="translate(3172, 282)" filter="url(#sh)">
                <rect x={-108} y={-96} width={206} height={180} rx={8} fill="#cbb494" stroke={P.ink} strokeWidth={2.6} />
                <rect x={-94} y={-82} width={178} height={152} rx={4} fill="#dfc9aa" stroke="#9e8565" strokeWidth={1.8} />
                {[-68, -12, 44].map((wx, i) => (
                  <rect key={i} x={wx} y={-56} width={34} height={26} rx={3} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />
                ))}
                <rect x={-68} y={8} width={88} height={40} rx={4} fill="#b59b78" stroke={P.ink} strokeWidth={1.6} />
                <circle cx={52} cy={26} r={16} fill="#9aa8b8" stroke={P.ink} strokeWidth={1.8} />
                {isStruck && (
                  <rect
                    x={-117}
                    y={-105}
                    width={224}
                    height={198}
                    rx={12}
                    fill="none"
                    stroke={P.laser}
                    strokeWidth={3.2}
                    filter="url(#glow)"
                  />
                )}
              </g>

              {/* 2. Toà nhà thương mại góc trên-phải */}
              <g transform="translate(3678, 282)" filter="url(#sh)">
                <rect x={-105} y={-96} width={206} height={180} rx={8} fill="#9eb0c4" stroke={P.ink} strokeWidth={2.6} />
                <rect x={-90} y={-82} width={176} height={152} rx={4} fill="#c5d2e0" stroke="#7d90a6" strokeWidth={1.8} />
                {[-66, 10].map((wx, i) => (
                  <rect key={i} x={wx} y={-58} width={58} height={42} rx={3} fill="#365c82" stroke={P.ink} strokeWidth={1.6} />
                ))}
                {[-62, -16, 30].map((wx, i) => (
                  <rect key={i} x={wx} y={14} width={32} height={24} rx={3} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />
                ))}
                {isStruck && (
                  <rect
                    x={-114}
                    y={-105}
                    width={224}
                    height={198}
                    rx={12}
                    fill="none"
                    stroke={P.laser}
                    strokeWidth={3.2}
                    filter="url(#glow)"
                  />
                )}
              </g>

              {/* 3. Khu nhà ở sân vườn góc dưới-phải */}
              <g transform="translate(3678, 804)" filter="url(#sh)">
                <rect x={-105} y={-92} width={204} height={176} rx={8} fill="#bfa482" stroke={P.ink} strokeWidth={2.6} />
                <rect x={-88} y={-76} width={118} height={144} rx={4} fill="#d9c1a0" stroke={P.ink} strokeWidth={1.8} />
                <rect x={-66} y={-50} width={36} height={32} rx={3} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />
                <rect x={-66} y={8} width={36} height={32} rx={3} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />
                <circle cx={58} cy={-32} r={26} fill="#4d8f68" stroke={P.ink} strokeWidth={2} />
                <circle cx={54} cy={30} r={22} fill="#5da67b" stroke={P.ink} strokeWidth={2} />
                {isStruck && (
                  <rect
                    x={-114}
                    y={-101}
                    width={222}
                    height={194}
                    rx={12}
                    fill="none"
                    stroke={P.laser}
                    strokeWidth={3.2}
                    filter="url(#glow)"
                  />
                )}
              </g>

              {/* 4. Toà nhà dân sự góc dưới-trái */}
              <g transform="translate(3172, 804)" filter="url(#sh)">
                <rect x={-105} y={-92} width={202} height={176} rx={8} fill="#aebbc9" stroke={P.ink} strokeWidth={2.6} />
                <rect x={-88} y={-76} width={168} height={144} rx={4} fill="#cdd7e3" stroke="#8393a6" strokeWidth={1.8} />
                <rect x={-64} y={-48} width={44} height={30} rx={3} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />
                <rect x={10} y={-48} width={44} height={30} rx={3} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />
                <circle cx={-35} cy={26} r={22} fill="#4f946c" stroke={P.ink} strokeWidth={2} />
                {isStruck && (
                  <rect
                    x={-114}
                    y={-101}
                    width={220}
                    height={194}
                    rx={12}
                    fill="none"
                    stroke={P.laser}
                    strokeWidth={3.2}
                    filter="url(#glow)"
                  />
                )}
              </g>

              {/* 5. Hai xe dân sự chạy ở làn đường sát ngay bên ngoài vòng an toàn (cách tâm ~192 px) — nguyên vẹn 100%! */}
              <g transform="translate(3218, 592)" filter="url(#sh)">
                <rect x={-46} y={-22} width={92} height={44} rx={10} fill="#e8eff7" stroke={P.ink} strokeWidth={2.4} />
                <rect x={-23} y={-16} width={48} height={32} rx={5} fill="#ffffff" stroke="#b5c4d6" strokeWidth={1.5} />
                <polygon points="19,-15 34,-12 34,12 19,15" fill="#2c4b6b" />
                <circle cx={44} cy={-13} r={3.5} fill={P.gold} />
                <circle cx={44} cy={13} r={3.5} fill={P.gold} />
                {isStruck && (
                  <rect
                    x={-55}
                    y={-31}
                    width={110}
                    height={62}
                    rx={14}
                    fill="none"
                    stroke={P.laser}
                    strokeWidth={3}
                    filter="url(#glow)"
                  />
                )}
              </g>
              <g transform="translate(3476, 748) rotate(-90)" filter="url(#sh)">
                <rect x={-44} y={-21} width={88} height={42} rx={10} fill="#93c5fd" stroke={P.ink} strokeWidth={2.4} />
                <rect x={-21} y={-15} width={44} height={30} rx={5} fill="#dbeafe" />
                <polygon points="17,-14 32,-11 32,11 17,14" fill="#1e3a5f" />
                {isStruck && (
                  <rect
                    x={-53}
                    y={-30}
                    width={106}
                    height={60}
                    rx={14}
                    fill="none"
                    stroke={P.laser}
                    strokeWidth={3}
                    filter="url(#glow)"
                  />
                )}
              </g>

              {/* VÒNG BÁN KÍNH AN TOÀN XANH NGỌC P.laser BAO SÁT XE MỤC TIÊU Ở TÂM (3425, 542) */}
              <circle
                cx={3425}
                cy={542}
                r={108}
                fill={isStruck ? 'rgba(40, 240, 180, 0.12)' : 'rgba(40, 240, 180, 0.05)'}
                stroke={P.laser}
                strokeWidth={isStruck ? 4.8 : 3.2}
                filter="url(#glow)"
              />

              {/* XE MỤC TIÊU Ở TÂM GIAO LỘ (3425, 542) */}
              <g transform="translate(3425, 542)" filter="url(#sh)">
                <rect
                  x={-68}
                  y={-32}
                  width={136}
                  height={64}
                  rx={12}
                  fill={isStruck ? '#22262e' : '#3c4452'}
                  stroke={P.ink}
                  strokeWidth={3}
                />
                <rect
                  x={-36}
                  y={-25}
                  width={70}
                  height={50}
                  rx={6}
                  fill={isStruck ? '#15181e' : '#576273'}
                  stroke={P.ink}
                  strokeWidth={2}
                />
                <polygon points="28,-22 50,-17 50,17 28,22" fill="#16282a" stroke={P.ink} strokeWidth={1.8} />
                <polygon points="-34,-21 -52,-16 -52,16 -34,21" fill="#16282a" stroke={P.ink} strokeWidth={1.8} />

                {/* Tâm ngắm khoá xe mục tiêu trước khi đạn chạm */}
                {!isStruck && (
                  <g opacity={0.92}>
                    <circle cx={0} cy={0} r={40} fill="none" stroke={P.danger} strokeWidth={2.6} strokeDasharray="8 6" />
                    <line x1={-54} y1={0} x2={-22} y2={0} stroke={P.danger} strokeWidth={2.6} />
                    <line x1={22} y1={0} x2={54} y2={0} stroke={P.danger} strokeWidth={2.6} />
                    <line x1={0} y1={-54} x2={0} y2={-22} stroke={P.danger} strokeWidth={2.6} />
                    <line x1={0} y1={22} x2={0} y2={54} stroke={P.danger} strokeWidth={2.6} />
                  </g>
                )}

                {/* Quả đạn R-9X 6 cánh kiếm xoè rộng bổ thẳng xuống tâm xe ngay trước 78.76s (nằm gọn trong vòng an toàn) */}
                {strikeApproach > 0.02 && !isStruck && (
                  <g transform={`scale(${lerp(1.38, 0.96, strikeApproach)}) rotate(${strikeApproach * 22})`}>
                    {[0, 60, 120, 180, 240, 300].map((a) => (
                      <g key={a} transform={`rotate(${a - 15})`}>
                        <polygon
                          points="10,-5 68,-4 82,0 68,4 10,5"
                          fill="#f1f5f9"
                          stroke={P.ink}
                          strokeWidth={1.8}
                        />
                        <line x1={14} y1={0} x2={72} y2={0} stroke={P.danger} strokeWidth={2.2} />
                      </g>
                    ))}
                    <circle cx={0} cy={0} r={14} fill={P.danger} stroke={P.ink} strokeWidth={2.6} />
                  </g>
                )}

                {/* ĐÚNG CUE.s08_kinetic_strike (78.76s): Vệt chém động năng 6 cánh sao sắc gọn xuyên mục tiêu — 0 CẦU LỬA! */}
                {isStruck && (
                  <g>
                    {[0, 60, 120, 180, 240, 300].map((a) => {
                      const slashScale = lerp(0.65, 1, Math.min(1, strikeDt * 9));
                      return (
                        <g key={a} transform={`rotate(${a - 15}) scale(${slashScale})`}>
                          {/* Rãnh cắt cơ khí đen xuyên thép nóc xe */}
                          <line x1={0} y1={0} x2={58} y2={0} stroke="#080a0d" strokeWidth={8} strokeLinecap="round" />
                          {/* Cánh sao chém động năng đỏ-trắng sắc lẹm nằm gọn trong vòng an toàn xanh r=108 */}
                          <polygon
                            points="8,-6 66,-4.5 92,0 66,4.5 8,6"
                            fill={P.danger}
                            stroke={P.ink}
                            strokeWidth={1.8}
                          />
                          <polygon points="10,-2.6 68,-1.8 88,0 68,1.8 10,2.6" fill="#ffffff" />
                        </g>
                      );
                    })}
                    {/* Lõi đạn động năng găm chính tâm mục tiêu */}
                    <circle cx={0} cy={0} r={15} fill={P.missileBody} stroke={P.ink} strokeWidth={2.8} />
                    <circle cx={0} cy={0} r={7.5} fill={P.danger} />
                    {strikeDt < 0.5 && (
                      <circle
                        cx={0}
                        cy={0}
                        r={20 + strikeDt * 155}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={4 * (1 - strikeDt / 0.5)}
                        opacity={1 - strikeDt / 0.5}
                      />
                    )}
                  </g>
                )}
              </g>
            </g>
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* Tối đa 1 Label tại một thời điểm — đặt thoáng sạch không chạm bất kỳ chi tiết cơ khí nào */}
      <Label
        t={t}
        text="8 KM"
        x={880}
        y={400}
        from={73.0}
        until={74.5}
        size={56}
        bg={P.paper}
        fg={P.ink}
      />
      <Label
        t={t}
        text="R-9X · 6 LƯỠI KIẾM"
        x={498}
        y={114}
        from={75.2}
        until={79.6}
        size={46}
        bg={P.paper}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S08;
