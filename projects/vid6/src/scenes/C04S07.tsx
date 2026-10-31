import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { handheld } from '@core/frame';
import { bump, lerp, prog, rnd, useSpring, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { drawOn } from '@skill/military/2d/path';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { AbramsTop2D } from '../parts/Abrams2D';

// Hệ toạ độ thế giới 2D (tâm khung gốc 1920x1080; AbramsTop2D đặt tại TANK_X, TANK_Y, scale = TANK_S)
const TANK_X = 830;
const TANK_Y = 540;
const TANK_S = 1.26;

// Quy đổi từ toạ độ cục bộ của AbramsTop2D sang toạ độ thế giới 2D
const wx = (lx: number) => TANK_X + lx * TANK_S;
const wy = (ly: number) => TANK_Y + ly * TANK_S;

type RicochetSpec = {
  delay: number;
  startX: number;
  startY: number;
  hitX: number;
  hitY: number;
  bounceX: number;
  bounceY: number;
  normalDeg: number;
};

const FRONT_IMPACTS: RicochetSpec[] = [
  {
    delay: 0.0,
    startX: 1850,
    startY: 386,
    hitX: wx(152),
    hitY: wy(-108),
    bounceX: 1560,
    bounceY: 205,
    normalDeg: -54,
  },
  {
    delay: 0.13,
    startX: 1880,
    startY: 500,
    hitX: wx(392),
    hitY: wy(-32),
    bounceX: 1715,
    bounceY: 325,
    normalDeg: -38,
  },
  {
    delay: 0.25,
    startX: 1850,
    startY: 694,
    hitX: wx(152),
    hitY: wy(108),
    bounceX: 1560,
    bounceY: 875,
    normalDeg: 54,
  },
];

// Vạch chia độ hình học (5°, 15°, 30°) quanh tâm xe tăng — thuần hình học, tuyệt đối không dùng <text>
const PROTRACTOR_TICKS = Array.from({ length: 72 }, (_, i) => i * 5);

const C04S07: React.FC = () => {
  const t = useT();

  // ---------------- 1. TIẾN ĐỘ CÁC NHỊP SỰ KIỆN THEO CUE ----------------
  const introP = prog(t, 603.16, 604.65, Easing.out(Easing.cubic));
  const turretDeg = lerp(-4.5, 0, introP);

  // CUE.c04_s07_front (606.04s): Giáp má trước Chobham + DU sáng rực PAL.cyan & đánh bật đạn trực diện
  const frontOn = prog(t, CUE.c04_s07_front - 0.06, CUE.c04_s07_front + 0.32, Easing.out(Easing.cubic));
  const frontDim = 1 - prog(t, CUE.c04_s07_roof - 0.15, CUE.c04_s07_roof + 0.45) * 0.55;
  const frontAlpha = frontOn * frontDim;
  const frontPulse = 0.82 + 0.18 * Math.sin((t - CUE.c04_s07_front) * 8.5);

  // CUE.c04_s07_roof (608.58s): Zoom đẩy vào vùng nóc tháp + sàn động cơ mỏng đỏ PAL.crimson & khoá tâm ngắm FPV
  const roofOn = prog(t, CUE.c04_s07_roof - 0.08, CUE.c04_s07_roof + 0.38, Easing.out(Easing.cubic));
  const lockSpring = useSpring(t, CUE.c04_s07_roof + 0.06, 12, 175);
  const roofBlink = 0.68 + 0.32 * Math.sin((t - CUE.c04_s07_roof) * 14.0);

  // ---------------- 2. CHUYỂN ĐỘNG CAMERA 2D ----------------
  const toFrontCam = prog(t, CUE.c04_s07_front - 0.25, CUE.c04_s07_front + 0.55, Easing.inOut(Easing.cubic));
  const toRoofCam = prog(t, CUE.c04_s07_roof - 0.22, CUE.c04_s07_roof + 0.68, Easing.inOut(Easing.cubic));

  const camXMid = lerp(955, 1045, toFrontCam);
  const camZoomMid = lerp(0.96, 1.08, toFrontCam);

  const camX = lerp(camXMid, 625, toRoofCam);
  const camY = 540;
  const camZoom = lerp(camZoomMid, 1.54, toRoofCam);

  const hitJolt =
    bump(t, CUE.c04_s07_front + 0.18, 0.22) * 7 +
    bump(t, CUE.c04_s07_front + 0.31, 0.22) * 6 +
    bump(t, CUE.c04_s07_front + 0.43, 0.22) * 7;
  const baseShake = handheld(t, 2.2, 'c04s07');
  const shake: readonly [number, number] = [
    baseShake[0] + Math.sin(t * 54) * hitJolt,
    baseShake[1] + Math.cos(t * 47) * hitJolt * 0.65,
  ];

  // Đa giác giáp má trước tháp pháo & mũi thân trong toạ độ thế giới (khớp 1:1 với AbramsTop2D khi turretDeg = 0)
  const cheekPts = [
    [wx(78), wy(-142)],
    [wx(202), wy(-85)],
    [wx(202), wy(85)],
    [wx(78), wy(142)],
    [wx(42), wy(74)],
    [wx(42), wy(-74)],
  ]
    .map(([px, py]) => `${px.toFixed(1)},${py.toFixed(1)}`)
    .join(' ');

  const hullGlacisX = wx(250);
  const hullGlacisY = wy(-124);
  const hullGlacisW = (392 - 250) * TANK_S;
  const hullGlacisH = 248 * TANK_S;

  // Vùng nóc tháp pháo mỏng & sàn lưới động cơ mỏng
  const roofX = wx(-272);
  const roofY = wy(-112);
  const roofW = 304 * TANK_S;
  const roofH = 224 * TANK_S;

  const deckX = wx(-380);
  const deckY = wy(-114);
  const deckW = 185 * TANK_S;
  const deckH = 228 * TANK_S;

  // Tâm ngắm chữ thập đỏ FPV khoá chính giữa nóc mỏng tháp pháo (phía sau cặp má giáp trước dày)
  const reticleX = wx(-115);
  const reticleY = wy(0);

  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      {/* Đặt <Defs2D /> NGOÀI <Cam2D> theo đúng chuẩn kỹ thuật để không bị cắt ô filter khi zoom */}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <Defs2D shadow="rgba(6, 10, 16, 0.55)" />
        <defs>
          <radialGradient id="c04s07BgGrad" cx="50%" cy="50%" r="65%">
            <stop offset="0%" stopColor="#142233" />
            <stop offset="65%" stopColor={PAL.bg} />
            <stop offset="100%" stopColor={PAL.bgDeep} />
          </radialGradient>
          <pattern id="c04s07DuHatch" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
            <line x1="0" y1="0" x2="0" y2="16" stroke={PAL.cyanSoft} strokeWidth="2.4" strokeOpacity="0.48" />
            <line x1="8" y1="0" x2="8" y2="16" stroke={PAL.duPurple} strokeWidth="2.0" strokeOpacity="0.45" />
          </pattern>
          <pattern id="c04s07RoofHazard" width="22" height="22" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <rect width="10" height="22" fill={PAL.crimson} fillOpacity="0.22" />
            <line x1="10" y1="0" x2="10" y2="22" stroke={PAL.crimson} strokeWidth="1.8" strokeOpacity="0.45" />
          </pattern>
        </defs>
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL.bg}>
        <svg
          width={1920}
          height={1080}
          viewBox="0 0 1920 1080"
          style={{ overflow: 'visible' }}
        >
          {/* ==================== 1. NỀN BẢN VẼ KỸ THUẬT SLATE & LƯỚI TOẠ ĐỘ ==================== */}
          <rect x={-700} y={-520} width={3400} height={2120} fill="url(#c04s07BgGrad)" />

          {/* Lưới kỹ thuật bước nhỏ 60 px */}
          <g stroke={PAL.grid} strokeWidth={1} opacity={0.42}>
            {Array.from({ length: 56 }, (_, i) => {
              const gx = -660 + i * 60;
              return <line key={`vx_${i}`} x1={gx} y1={-520} x2={gx} y2={1600} />;
            })}
            {Array.from({ length: 36 }, (_, i) => {
              const gy = -480 + i * 60;
              return <line key={`hy_${i}`} x1={-700} y1={gy} x2={2700} y2={gy} />;
            })}
          </g>

          {/* Lưới kỹ thuật chính bước 240 px & trục tâm chuẩn */}
          <g stroke={PAL.gridBright} strokeWidth={1.6} opacity={0.52}>
            {Array.from({ length: 15 }, (_, i) => {
              const gx = -660 + i * 240;
              return <line key={`mvx_${i}`} x1={gx} y1={-520} x2={gx} y2={1600} />;
            })}
            {Array.from({ length: 10 }, (_, i) => {
              const gy = -420 + i * 240;
              return <line key={`mhy_${i}`} x1={-700} y1={gy} x2={2700} y2={gy} />;
            })}
          </g>
          <line
            x1={-500}
            y1={TANK_Y}
            x2={2500}
            y2={TANK_Y}
            stroke={PAL.gridBright}
            strokeWidth={2}
            strokeDasharray="16 10 4 10"
            opacity={0.7}
          />
          <line
            x1={TANK_X}
            y1={-450}
            x2={TANK_X}
            y2={1530}
            stroke={PAL.gridBright}
            strokeWidth={2}
            strokeDasharray="16 10 4 10"
            opacity={0.7}
          />

          {/* ==================== 2. VÒNG CUNG CHIA ĐỘ GÓC TẤN CÔNG HÌNH HỌC CHIẾN TRANH LẠNH ==================== */}
          <g transform={`translate(${TANK_X} ${TANK_Y})`}>
            {/* Nón góc tấn công trực diện Chiến tranh Lạnh (±30° phía trước mũi xe) */}
            <path
              d={`M 0 0 L ${(Math.cos(-Math.PI / 6) * 980).toFixed(1)} ${(Math.sin(-Math.PI / 6) * 980).toFixed(1)} A 980 980 0 0 1 ${(Math.cos(Math.PI / 6) * 980).toFixed(1)} ${(Math.sin(Math.PI / 6) * 980).toFixed(1)} Z`}
              fill={PAL.cyan}
              fillOpacity={0.045 + frontAlpha * 0.065}
            />
            <line
              x1={0}
              y1={0}
              x2={Math.cos(-Math.PI / 6) * 980 * introP}
              y2={Math.sin(-Math.PI / 6) * 980 * introP}
              stroke={PAL.cyan}
              strokeWidth={2.2}
              strokeDasharray="12 8"
              opacity={0.42 + frontAlpha * 0.4}
            />
            <line
              x1={0}
              y1={0}
              x2={Math.cos(Math.PI / 6) * 980 * introP}
              y2={Math.sin(Math.PI / 6) * 980 * introP}
              stroke={PAL.cyan}
              strokeWidth={2.2}
              strokeDasharray="12 8"
              opacity={0.42 + frontAlpha * 0.4}
            />

            {/* 3 vòng tròn đồng tâm đo phương vị chiến thuật */}
            <circle r={420} fill="none" stroke={PAL.gridBright} strokeWidth={1.8} strokeDasharray="8 8" opacity={0.65} />
            <circle r={575} fill="none" stroke={PAL.gridBright} strokeWidth={2.4} opacity={0.8} />
            <circle r={725} fill="none" stroke={PAL.grid} strokeWidth={1.6} opacity={0.6} />

            {/* Cung nhấn ±35° phía trước dày sắc nét */}
            <path
              d={`M ${(Math.cos(-0.61) * 575).toFixed(1)} ${(Math.sin(-0.61) * 575).toFixed(1)} A 575 575 0 0 1 ${(Math.cos(0.61) * 575).toFixed(1)} ${(Math.sin(0.61) * 575).toFixed(1)}`}
              fill="none"
              stroke={PAL.cyan}
              strokeWidth={5}
              opacity={0.35 + frontAlpha * 0.6}
            />

            {/* Vạch chia độ hình học (mỗi 5°, vạch chính 15° & 30°) */}
            {PROTRACTOR_TICKS.map((degVal) => {
              const rad = (degVal * Math.PI) / 180;
              const isMajor30 = degVal % 30 === 0;
              const isMid15 = degVal % 15 === 0;
              const rIn = isMajor30 ? 546 : isMid15 ? 556 : 564;
              const rOut = isMajor30 ? 604 : isMid15 ? 592 : 584;
              const inFrontCone = degVal <= 30 || degVal >= 330;
              return (
                <line
                  key={degVal}
                  x1={Math.cos(rad) * rIn}
                  y1={Math.sin(rad) * rIn}
                  x2={Math.cos(rad) * rOut}
                  y2={Math.sin(rad) * rOut}
                  stroke={inFrontCone ? PAL.cyan : isMajor30 ? PAL.muted : PAL.gridBright}
                  strokeWidth={isMajor30 ? 3.0 : isMid15 ? 2.0 : 1.3}
                  opacity={inFrontCone ? 0.65 + frontAlpha * 0.35 : 0.72}
                />
              );
            })}
          </g>

          {/* Thanh thước đo đối chiếu bề dày giáp hình học ở góc dưới (thuần khối thanh đo, không dùng <text>) */}
          <g transform="translate(260 955)" opacity={0.85 * introP}>
            <rect x={0} y={0} width={380} height={58} rx={8} fill={PAL.panel} stroke={PAL.gridBright} strokeWidth={2} />
            {/* Cột thanh đo giáp trước dày (6 ô cyan/DU) */}
            {[0, 1, 2, 3, 4, 5].map((bi) => (
              <rect
                key={`fb_${bi}`}
                x={18 + bi * 26}
                y={13}
                width={21}
                height={32}
                rx={3}
                fill={bi % 2 === 0 ? PAL.cyan : PAL.duPurple}
                opacity={0.45 + frontAlpha * 0.55}
              />
            ))}
            <line x1={194} y1={10} x2={194} y2={48} stroke={PAL.gridBright} strokeWidth={2} />
            {/* Cột thanh đo giáp nóc mỏng (chỉ 1 vạch đỏ mảnh cảnh báo) */}
            <rect
              x={216}
              y={13}
              width={14}
              height={32}
              rx={2}
              fill={PAL.crimson}
              opacity={0.45 + roofOn * 0.55}
            />
            {[0, 1, 2, 3, 4].map((ei) => (
              <rect
                key={`eb_${ei}`}
                x={238 + ei * 25}
                y={13}
                width={19}
                height={32}
                rx={3}
                fill="none"
                stroke={PAL.crimson}
                strokeWidth={1.6}
                strokeDasharray="4 4"
                opacity={0.3 + roofOn * 0.5}
              />
            ))}
          </g>

          {/* ==================== 3. HÌNH CHIẾU BẰNG M1A2 ABRAMS WOODLAND (showArmorZones=true) ==================== */}
          <g filter="url(#sh)">
            <AbramsTop2D
              x={TANK_X}
              y={TANK_Y}
              scale={TANK_S}
              turretDeg={turretDeg}
              camo="woodland"
              showArmorZones={true}
            />
          </g>

          {/* ==================== 4. CUE.c04_s07_front (606.04s): GIÁP TRƯỚC CHOBHAM + DU & ĐẠN BỊ ĐÁNH BẬT ==================== */}
          {frontAlpha > 0.01 && (
            <g opacity={frontAlpha}>
              {/* Halo nét kép (không dùng filter=#glow trên nét chéo dài) + lưới Uranium nghèo trên mũi thân & hai má tháp */}
              <rect
                x={hullGlacisX}
                y={hullGlacisY}
                width={hullGlacisW}
                height={hullGlacisH}
                rx={6}
                fill="url(#c04s07DuHatch)"
                stroke={PAL.cyan}
                strokeWidth={14}
                strokeOpacity={0.26 * frontPulse}
              />
              <rect
                x={hullGlacisX}
                y={hullGlacisY}
                width={hullGlacisW}
                height={hullGlacisH}
                rx={6}
                fill={PAL.cyan}
                fillOpacity={0.22 * frontPulse}
                stroke={PAL.cyanSoft}
                strokeWidth={4.5}
              />

              <polygon
                points={cheekPts}
                fill="url(#c04s07DuHatch)"
                stroke={PAL.cyan}
                strokeWidth={18}
                strokeLinejoin="round"
                strokeOpacity={0.28 * frontPulse}
              />
              <polygon
                points={cheekPts}
                fill={PAL.cyan}
                fillOpacity={0.28 * frontPulse}
                stroke={PAL.cyanSoft}
                strokeWidth={5}
                strokeLinejoin="round"
              />

              {/* Các tấm lõi Uranium nghèo xếp lớp dày cộp bên trong hai má trước tháp pháo */}
              {[-1, 1].map((s) => (
                <g key={s}>
                  {[0, 1, 2].map((layer) => {
                    const off = layer * 14;
                    const x0 = wx(82) - off * 0.45;
                    const y0 = wy(s * 130) - s * off * 0.72;
                    const x1 = wx(194) - off * 0.55;
                    const y1 = wy(s * 78) - s * off * 0.42;
                    return (
                      <line
                        key={layer}
                        x1={x0}
                        y1={y0}
                        x2={x1}
                        y2={y1}
                        stroke={layer === 1 ? PAL.duPurple : PAL.white}
                        strokeWidth={4.5}
                        strokeLinecap="round"
                        opacity={0.85}
                      />
                    );
                  })}
                </g>
              ))}

              {/* 3 mũi tên đạn bắn trực diện từ phía trước lao vào và bị đánh bật vỡ tung */}
              {FRONT_IMPACTS.map((imp, idx) => {
                const tStart = CUE.c04_s07_front + imp.delay;
                const inP = prog(t, tStart, tStart + 0.18, Easing.in(Easing.quad));
                const hitDt = t - (tStart + 0.18);
                const rebP = prog(t, tStart + 0.18, tStart + 0.52, Easing.out(Easing.cubic));
                if (inP <= 0.001) return null;

                const curInX = lerp(imp.startX, imp.hitX, inP);
                const curInY = lerp(imp.startY, imp.hitY, inP);
                const inLen = Math.hypot(imp.hitX - imp.startX, imp.hitY - imp.startY);

                const rebLen = Math.hypot(imp.bounceX - imp.hitX, imp.bounceY - imp.hitY);
                const curRebX = lerp(imp.hitX, imp.bounceX, rebP);
                const curRebY = lerp(imp.hitY, imp.bounceY, rebP);
                const rebAngle = (Math.atan2(imp.bounceY - imp.hitY, imp.bounceX - imp.hitX) * 180) / Math.PI;
                const inAngle = (Math.atan2(imp.hitY - imp.startY, imp.hitX - imp.startX) * 180) / Math.PI;

                return (
                  <g key={idx}>
                    {/* Đường bay tới trực diện (nét kép halo cam-hổ phách + lõi sáng) */}
                    <line
                      x1={imp.startX}
                      y1={imp.startY}
                      x2={imp.hitX}
                      y2={imp.hitY}
                      stroke={PAL.amber}
                      strokeWidth={13}
                      strokeOpacity={0.24}
                      strokeLinecap="round"
                      {...drawOn(inLen, inP)}
                    />
                    <line
                      x1={imp.startX}
                      y1={imp.startY}
                      x2={imp.hitX}
                      y2={imp.hitY}
                      stroke={PAL.amberHot}
                      strokeWidth={4.8}
                      strokeLinecap="round"
                      {...drawOn(inLen, inP)}
                    />

                    {/* Đầu mũi lao đạn lúc đang bay tới trước khi chạm giáp */}
                    {hitDt < 0.02 && (
                      <g transform={`translate(${curInX} ${curInY}) rotate(${inAngle})`}>
                        <polygon points="0,0 -34,-11 -26,0 -34,11" fill={PAL.amberHot} stroke={PAL.ink} strokeWidth={2} />
                      </g>
                    )}

                    {/* Khi chạm giáp má trước: sóng xung kích cyan, quỹ đạo dội bật ngược & mảnh đạn vỡ tung */}
                    {hitDt >= 0 && (
                      <g>
                        {/* Vòng cung chấn động chắn đạn ngay tại mặt giáp */}
                        <circle
                          cx={imp.hitX}
                          cy={imp.hitY}
                          r={14 + Math.min(1, hitDt * 2.8) * 34}
                          fill="none"
                          stroke={PAL.cyanSoft}
                          strokeWidth={4.2 * Math.max(0.25, 1 - hitDt * 0.45)}
                          opacity={Math.max(0.32, 1 - hitDt * 0.35)}
                        />
                        <circle cx={imp.hitX} cy={imp.hitY} r={10} fill={PAL.white} />
                        <circle cx={imp.hitX} cy={imp.hitY} r={18} fill={PAL.amberHot} opacity={0.48} />

                        {/* Vệt mũi tên dội bật ngược ra ngoài (ricochet vector) */}
                        <line
                          x1={imp.hitX}
                          y1={imp.hitY}
                          x2={imp.bounceX}
                          y2={imp.bounceY}
                          stroke={PAL.crimson}
                          strokeWidth={11}
                          strokeOpacity={0.22}
                          strokeLinecap="round"
                          {...drawOn(rebLen, rebP)}
                        />
                        <line
                          x1={imp.hitX}
                          y1={imp.hitY}
                          x2={curRebX}
                          y2={curRebY}
                          stroke={PAL.amber}
                          strokeWidth={4.2}
                          strokeDasharray="14 9"
                          strokeLinecap="round"
                        />

                        {/* Đầu mũi tên dội ngược bị gãy văng */}
                        <g transform={`translate(${curRebX} ${curRebY}) rotate(${rebAngle})`}>
                          <polygon
                            points="6,0 -24,-13 -16,0 -24,13"
                            fill={PAL.amber}
                            stroke={PAL.ink}
                            strokeWidth={2.2}
                          />
                        </g>

                        {/* Chùm mảnh thanh xuyên bị vỡ tung toé trước mặt giáp Chobham + DU */}
                        {Array.from({ length: 9 }, (_, fi) => {
                          const baseRad = (imp.normalDeg * Math.PI) / 180;
                          const spread = (rnd(idx * 31 + fi * 7) - 0.5) * 1.35;
                          const ang = baseRad + spread;
                          const dist = (26 + rnd(idx * 31 + fi * 11) * 105) * Math.min(1, hitDt * 2.4);
                          const fx = imp.hitX + Math.cos(ang) * dist;
                          const fy = imp.hitY + Math.sin(ang) * dist;
                          const rot = hitDt * 220 + fi * 47;
                          const sz = 6 + rnd(idx * 31 + fi * 13) * 8;
                          return (
                            <polygon
                              key={fi}
                              points={`${-sz},${-sz * 0.45} ${sz * 0.9},0 ${-sz * 0.6},${sz * 0.55}`}
                              fill={fi % 2 === 0 ? PAL.amberHot : PAL.crimson}
                              stroke={PAL.ink}
                              strokeWidth={1.4}
                              transform={`translate(${fx.toFixed(1)} ${fy.toFixed(1)}) rotate(${rot.toFixed(1)})`}
                            />
                          );
                        })}
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== 5. CUE.c04_s07_roof (608.58s): VÙNG NÓC THÁP & SÀN ĐỘNG CƠ MỎNG + TÂM NGẮM ĐỎ FPV ==================== */}
          {roofOn > 0.01 && (
            <g opacity={roofOn}>
              {/* Vùng cảnh báo đỏ nét đứt phủ sàn lưới động cơ tuabin mỏng manh */}
              <rect
                x={deckX}
                y={deckY}
                width={deckW}
                height={deckH}
                rx={10}
                fill="url(#c04s07RoofHazard)"
                stroke={PAL.crimson}
                strokeWidth={14}
                strokeOpacity={0.22 * roofBlink}
              />
              <rect
                x={deckX}
                y={deckY}
                width={deckW}
                height={deckH}
                rx={10}
                fill={PAL.crimson}
                fillOpacity={0.16 * roofBlink}
                stroke={PAL.crimson}
                strokeWidth={4.2}
                strokeDasharray="16 10"
              />

              {/* Vùng cảnh báo chữ nhật nét đứt màu đỏ PAL.crimson phủ khắp nóc tháp pháo mỏng */}
              <rect
                x={roofX}
                y={roofY}
                width={roofW}
                height={roofH}
                rx={12}
                fill="url(#c04s07RoofHazard)"
                stroke={PAL.crimson}
                strokeWidth={18}
                strokeOpacity={0.26 * roofBlink}
              />
              <rect
                x={roofX}
                y={roofY}
                width={roofW}
                height={roofH}
                rx={12}
                fill={PAL.crimson}
                fillOpacity={0.2 * roofBlink}
                stroke={PAL.crimson}
                strokeWidth={5}
                strokeDasharray="18 10"
              />

              {/* 4 ngoặc vuông góc cảnh báo tử huyệt bao quanh tổng vùng nóc tháp + sàn động cơ */}
              {[
                [deckX - 14, roofY - 14, 1, 1],
                [roofX + roofW + 14, roofY - 14, -1, 1],
                [deckX - 14, roofY + roofH + 14, 1, -1],
                [roofX + roofW + 14, roofY + roofH + 14, -1, -1],
              ].map(([bx, by, sx, sy], bi) => (
                <path
                  key={bi}
                  d={`M ${bx} ${by + sy * 34} L ${bx} ${by} L ${bx + sx * 34} ${by}`}
                  fill="none"
                  stroke={PAL.crimson}
                  strokeWidth={5}
                  strokeLinecap="round"
                />
              ))}

              {/* Tâm ngắm chữ thập đỏ của FPV Drone khoá chặt chính giữa nóc tháp pháo */}
              <g
                transform={`translate(${reticleX} ${reticleY}) scale(${lerp(2.05, 1.0, Math.min(1.12, lockSpring))}) rotate(${lerp(38, 0, Math.min(1, lockSpring))})`}
              >
                {/* Halo đỏ mờ của kính ngắm quang học FPV */}
                <circle r={96} fill="none" stroke={PAL.crimson} strokeWidth={14} strokeOpacity={0.2 * roofBlink} />
                <circle r={96} fill="none" stroke={PAL.crimson} strokeWidth={3.8} />
                <circle r={54} fill="none" stroke={PAL.crimson} strokeWidth={2.6} strokeDasharray="10 7" />

                {/* 4 đường chữ thập khoá mục tiêu */}
                <line x1={-132} y1={0} x2={-22} y2={0} stroke={PAL.crimson} strokeWidth={4.5} strokeLinecap="round" />
                <line x1={22} y1={0} x2={132} y2={0} stroke={PAL.crimson} strokeWidth={4.5} strokeLinecap="round" />
                <line x1={0} y1={-132} x2={0} y2={-22} stroke={PAL.crimson} strokeWidth={4.5} strokeLinecap="round" />
                <line x1={0} y1={22} x2={0} y2={132} stroke={PAL.crimson} strokeWidth={4.5} strokeLinecap="round" />

                {/* Các vạch chia cự ly trên trục kính ngắm FPV */}
                {[-74, -44, 44, 74].map((tk) => (
                  <React.Fragment key={tk}>
                    <line x1={tk} y1={-9} x2={tk} y2={9} stroke={PAL.crimson} strokeWidth={2.6} />
                    <line x1={-9} y1={tk} x2={9} y2={tk} stroke={PAL.crimson} strokeWidth={2.6} />
                  </React.Fragment>
                ))}

                {/* 4 khung ngoặc chữ L kẹp chặt tâm nóc tháp */}
                {[
                  [-1, -1],
                  [1, -1],
                  [-1, 1],
                  [1, 1],
                ].map(([qx, qy], qi) => (
                  <path
                    key={qi}
                    d={`M ${qx * 76} ${qy * 46} L ${qx * 76} ${qy * 76} L ${qx * 46} ${qy * 76}`}
                    fill="none"
                    stroke={PAL.amberHot}
                    strokeWidth={3.8}
                    strokeLinecap="round"
                  />
                ))}

                {/* Điểm chấm tâm chạm nổ đầu đạn lõm */}
                <circle r={9} fill={PAL.crimson} />
                <circle r={4.2} fill={PAL.amberHot} />
              </g>
            </g>
          )}
        </svg>
      </Cam2D>

      {/* Lớp hạt giấy bản vẽ kỹ thuật phủ cuối cảnh */}
      <Grain opacity={0.46} />

      {/* Nhãn thông số duy nhất trong cảnh (tuyệt đối không có <text> SVG) */}
      <Label
        t={t}
        text="CHOBHAM + DU"
        x={1485}
        y={165}
        from={CUE.c04_s07_front}
        until={608.1}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C04S07;
