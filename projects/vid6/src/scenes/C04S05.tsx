import React from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, Layer } from '@core/frame';
import { lerp, mix, prog, useSpring, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { drawOn } from '@skill/military/2d/path';
import { contours, skyline } from '@skill/military/2d/terrain';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { AbramsSide2D } from '../parts/Abrams2D';

// Tính sẵn đường đồng mức địa hình hậu cần & đường chân trời sa mạc ở cấp module (tất định 100%, không tính lại mỗi frame)
const TOPO_LINES = contours('c04s05_fuel_map', 2500, 1440, 7, 28, 560);
const RIDGE_FAR = skyline('c04s05_ridge_far', -360, 2280, 868, 72, 620, 1340);
const RIDGE_NEAR = skyline('c04s05_ridge_near', -360, 2280, 904, 42, 440, 1340);

const GRID_XS = Array.from({ length: 56 }, (_, i) => -360 + i * 48);
const GRID_YS = Array.from({ length: 32 }, (_, i) => -216 + i * 48);

/** Thùng phuy nhiên liệu quân sự 3 tông sáng/trung/tối + gân dập nổi (tuyệt đối không dùng <text> SVG). */
const FuelDrum2D: React.FC<{
  x: number;
  y: number;
  scale?: number;
  lit: number;
  tone?: 'amber' | 'crimson';
  fillLevel?: number;
}> = ({ x, y, scale = 1, lit, tone = 'amber', fillLevel = 1 }) => {
  const activeLight = tone === 'crimson' ? '#ff8b8b' : PAL.amberHot;
  const activeMid = tone === 'crimson' ? PAL.crimson : PAL.amber;
  const activeDark = tone === 'crimson' ? PAL.crimsonDeep : '#b36610';

  const cLight = mix(PAL.steelLight, activeLight, lit);
  const cMid = mix(PAL.steelMid, activeMid, lit);
  const cDark = mix(PAL.steelDark, activeDark, lit);

  const w = 52;
  const h = 72;
  const lvlH = Math.max(0, Math.min(1, fillLevel)) * (h - 10);

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-w / 2 + 5} y={-h / 2 + 6} width={w} height={h} rx={8} fill="rgba(6,11,18,0.55)" />

      {lit > 0.05 && (
        <rect
          x={-w / 2 - 4}
          y={-h / 2 - 4}
          width={w + 8}
          height={h + 8}
          rx={11}
          fill="none"
          stroke={activeMid}
          strokeWidth={4}
          opacity={0.38 * lit}
        />
      )}

      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={8}
        fill={PAL.bgDeep}
        stroke={PAL.ink}
        strokeWidth={3}
      />

      {lvlH > 1 && (
        <g>
          <rect x={-w / 2 + 2} y={h / 2 - 5 - lvlH} width={w - 4} height={lvlH} rx={5} fill={cMid} />
          <rect x={-w / 2 + 4} y={h / 2 - 5 - lvlH} width={13} height={lvlH} rx={3} fill={cLight} opacity={0.88} />
          <rect x={w / 2 - 15} y={h / 2 - 5 - lvlH} width={12} height={lvlH} rx={3} fill={cDark} opacity={0.88} />
        </g>
      )}

      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={8}
        fill="none"
        stroke={PAL.ink}
        strokeWidth={3.2}
      />
      {[-12, 12].map((ry) => (
        <g key={ry}>
          <rect
            x={-w / 2 - 2}
            y={ry - 3.5}
            width={w + 4}
            height={7}
            rx={3}
            fill={cLight}
            stroke={PAL.ink}
            strokeWidth={2.2}
          />
          <line x1={-w / 2 + 2} y1={ry + 1.5} x2={w / 2 - 2} y2={ry + 1.5} stroke={cDark} strokeWidth={2} />
        </g>
      ))}

      <ellipse cx={0} cy={-h / 2 + 4} rx={w / 2 - 3} ry={5} fill={cLight} stroke={PAL.ink} strokeWidth={2.2} />
      <circle cx={-11} cy={-h / 2 + 4} r={3.2} fill={PAL.ink} />
      <circle cx={12} cy={-h / 2 + 4} r={2.2} fill={cDark} />
    </g>
  );
};

/** Khung bảng module kỹ thuật 3 tông có đinh tán góc kiểu bản vẽ quân sự. */
const BlueprintPanelCard: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  accentColor: string;
  active: number;
  children: React.ReactNode;
}> = ({ x, y, w, h, accentColor, active, children }) => (
  <g>
    <rect x={x + 10} y={y + 12} width={w} height={h} rx={14} fill="rgba(5,9,15,0.62)" />

    {active > 0.03 && (
      <rect
        x={x - 4}
        y={y - 4}
        width={w + 8}
        height={h + 8}
        rx={17}
        fill="none"
        stroke={accentColor}
        strokeWidth={5}
        opacity={0.36 * active}
      />
    )}

    <rect
      x={x}
      y={y}
      width={w}
      height={h}
      rx={14}
      fill={PAL.panel}
      stroke={mix(PAL.gridBright, accentColor, active * 0.85)}
      strokeWidth={3.2}
    />
    <path
      d={`M ${x + 3} ${y + 36} L ${x + 3} ${y + 14} Q ${x + 3} ${y + 3} ${x + 14} ${y + 3} L ${x + w - 14} ${y + 3} Q ${x + w - 3} ${y + 3} ${x + w - 3} ${y + 14} L ${x + w - 3} ${y + 36} Z`}
      fill={PAL.panelHi}
    />
    <line
      x1={x + 2}
      y1={y + 36}
      x2={x + w - 2}
      y2={y + 36}
      stroke={mix(PAL.gridBright, accentColor, active * 0.7)}
      strokeWidth={2.2}
    />

    <circle
      cx={x + 24}
      cy={y + 19}
      r={7}
      fill={mix(PAL.steelDark, accentColor, 0.25 + active * 0.75)}
      stroke={PAL.ink}
      strokeWidth={2}
    />
    {[0, 1, 2, 3].map((k) => (
      <rect
        key={k}
        x={x + 44 + k * 24}
        y={y + 15}
        width={16}
        height={8}
        rx={2}
        fill={k <= Math.round(active * 3) ? accentColor : PAL.grid}
        opacity={0.85}
      />
    ))}
    {[
      [x + 14, y + h - 14],
      [x + w - 14, y + h - 14],
      [x + w - 18, y + 19],
    ].map(([bx, by], idx) => (
      <circle key={idx} cx={bx} cy={by} r={4} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={1.6} />
    ))}

    {children}
  </g>
);

const C04S05: React.FC = () => {
  const t = useT();

  // ---------------- TIẾN ĐỘ THEO CÁC MỐC CUE ----------------
  // 1. Dẫn ống nhiên liệu từ 4 khoang bồn chứa lên 3 cụm đồng hồ (c04_s05_burn @ 570.52s)
  const pipeDraw = prog(t, 569.65, CUE.c04_s05_burn + 0.95);

  // 2. Băng đồng 60 gal/hr (c04_s05_60gal @ 573.60s)
  const spring60 = useSpring(t, CUE.c04_s05_60gal, 11, 145);
  const focus60 =
    prog(t, CUE.c04_s05_60gal - 0.2, CUE.c04_s05_60gal + 0.35) *
    (1 - prog(t, CUE.c04_s05_2gpm - 0.25, CUE.c04_s05_2gpm + 0.3) * 0.55);

  // 3. Rút sụt bồn 505 gal theo từng dặm đường 2 gal/mile (c04_s05_2gpm @ 576.14s & c04_s05_505gal @ 577.54s)
  const mileSweep = prog(t, CUE.c04_s05_2gpm - 0.1, CUE.c04_s05_505gal + 1.35);
  const focus505 =
    prog(t, CUE.c04_s05_2gpm - 0.2, CUE.c04_s05_2gpm + 0.35) *
    (1 - prog(t, CUE.c04_s05_idle - 0.25, CUE.c04_s05_idle + 0.3) * 0.55);

  // 4. Nổ cầm chừng đứng yên 10 gal/hr vẫn rút đỏ liên tục (c04_s05_idle @ 579.62s)
  const idleActive = prog(t, CUE.c04_s05_idle - 0.12, CUE.c04_s05_idle + 0.3);
  const idleStrobe =
    idleActive > 0.01 ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((t - CUE.c04_s05_idle) * 17)) : 0;

  // Mức chất lỏng hổ phách trong bồn 505 gal & 4 khoang bồn trong thân xe
  const drain60 = prog(t, CUE.c04_s05_60gal, CUE.c04_s05_2gpm) * 0.18;
  const drain505 = prog(t, CUE.c04_s05_2gpm, CUE.c04_s05_idle - 0.2) * 0.52;
  const drainIdle = prog(t, CUE.c04_s05_idle, 581.5) * 0.11;
  const fuelLevel = Math.max(0.14, 0.95 - drain60 - drain505 - drainIdle);

  // Góc kim đồng hồ lưu lượng băng đồng (từ -148° vọt lên -18° vùng đỉnh đỏ-cam ở 573.60s)
  const needleBase = lerp(-148, -124, prog(t, 569.5, CUE.c04_s05_60gal));
  const needleJitter = t >= CUE.c04_s05_60gal ? Math.sin(t * 26) * 2.5 : Math.sin(t * 8) * 0.8;
  const needleDeg =
    idleActive > 0.5
      ? lerp(needleBase + spring60 * 106, -120, prog(t, CUE.c04_s05_idle, CUE.c04_s05_idle + 0.6)) +
        needleJitter * 0.4
      : needleBase + spring60 * 106 + needleJitter;

  // ---------------- CHUYỂN ĐỘNG <Cam2D> + HANDHELD CÂN ĐỐI KHÔNG CẮT BẢNG ----------------
  const shake = handheld(t, 2.0, 'c04s05');
  const pCam1 = prog(t, CUE.c04_s05_60gal - 0.35, CUE.c04_s05_60gal + 0.65);
  const pCam2 = prog(t, CUE.c04_s05_2gpm - 0.25, CUE.c04_s05_2gpm + 0.85);
  const pCam3 = prog(t, CUE.c04_s05_idle - 0.25, CUE.c04_s05_idle + 0.7);

  let camX = lerp(960, 912, pCam1);
  let camY = lerp(558, 536, pCam1);
  let camZoom = lerp(1.0, 1.045, pCam1);

  camX = lerp(camX, 955, pCam2);
  camY = lerp(camY, 572, pCam2);
  camZoom = lerp(camZoom, 1.06, pCam2);

  camX = lerp(camX, 1008, pCam3);
  camY = lerp(camY, 544, pCam3);
  camZoom = lerp(camZoom, 1.045, pCam3);

  // 4 khoang bồn chứa nhiên liệu bên trong thân AbramsSide2D (đặt tại x=865, y=878, scale=1.24)
  // Với toạ độ này: đuôi tháp pháo x=508, đỉnh CROWS y=528, nòng pháo M256 y=635 (x=1107..1585).
  const hullTanks = [
    { x: 548, y: 702, w: 142, h: 84 }, // Khoang bồn sau sát buồng tuabin
    { x: 712, y: 706, w: 132, h: 80 }, // Khoang bồn sườn sau
    { x: 866, y: 706, w: 132, h: 80 }, // Khoang bồn sườn trước
    { x: 1020, y: 714, w: 144, h: 72 }, // Khoang bồn yên ngựa mũi xe
  ];

  // Hệ đường ống gom nhiên liệu chạy dọc khoang thân (y=684), vươn thẳng lên phía sau đuôi tháp pháo (x=472)
  // lên ống phân phối ngang trên cao (y=518) -> rẽ vào đúng tâm đáy 3 cụm đồng hồ (x=385, 960, 1535 tại y=496)
  // => Hoàn toàn KHÔNG cắt đè qua tháp pháo hay nòng pháo 120mm!
  const hullCollectorRail = 'M 1092 714 L 1092 686 L 472 686';
  const tankTap1 = 'M 619 702 L 619 686';
  const tankTap2 = 'M 778 706 L 778 686';
  const tankTap3 = 'M 932 706 L 932 686';
  const turbineFeedPipe = 'M 548 744 L 492 744';

  const riserToLeft = 'M 472 686 L 472 518 L 385 518 L 385 496';
  const branchToMid = 'M 472 518 L 960 518 L 960 496';
  const branchToRight = 'M 960 518 L 1535 518 L 1535 496';

  const allPipes = [
    hullCollectorRail,
    tankTap1,
    tankTap2,
    tankTap3,
    turbineFeedPipe,
    riserToLeft,
    branchToMid,
    branchToRight,
  ];

  const waveShift = Math.sin(t * 6.5) * 3.5;

  return (
    <AbsoluteFill style={{ background: PAL.bg }}>
      {/* <Defs2D /> đặt NGOÀI <Cam2D> đúng quy tắc để tránh lỗi cắt ô filter của Chromium khi zoom */}
      <Layer style={{ pointerEvents: 'none' }}>
        <Defs2D />
      </Layer>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL.bg}>
        <svg
          width={1920}
          height={1080}
          viewBox="0 0 1920 1080"
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
        >
          <defs>
            <radialGradient id="c04s05BgGlow" cx="50%" cy="52%" r="62%">
              <stop offset="0%" stopColor="#182b42" />
              <stop offset="62%" stopColor={PAL.bg} />
              <stop offset="100%" stopColor={PAL.bgDeep} />
            </radialGradient>
            <linearGradient id="c04s05AmberLiquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PAL.amberHot} />
              <stop offset="35%" stopColor={PAL.amber} />
              <stop offset="100%" stopColor="#b3620e" />
            </linearGradient>
            <linearGradient id="c04s05CrimsonLiquid" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff9494" />
              <stop offset="40%" stopColor={PAL.crimson} />
              <stop offset="100%" stopColor={PAL.crimsonDeep} />
            </linearGradient>
          </defs>

          {/* ==================== 1. NỀN BẢN VẼ KỸ THUẬT CÓ CHIỀU SÂU + ĐƯỜNG ĐỒNG MỨC + LƯỚI ==================== */}
          <rect x={-380} y={-240} width={2680} height={1560} fill="url(#c04s05BgGlow)" />

          <g transform="translate(-290 -180)" opacity={0.34}>
            {TOPO_LINES.map((c) => (
              <path
                key={c.level}
                d={c.d}
                fill="none"
                stroke={c.level % 2 === 0 ? PAL.gridBright : PAL.grid}
                strokeWidth={c.level % 3 === 0 ? 1.8 : 1.1}
              />
            ))}
          </g>

          <path d={RIDGE_FAR} fill="#101c2a" opacity={0.85} />
          <path d={RIDGE_NEAR} fill="#0a121c" opacity={0.92} />

          <g>
            {GRID_XS.map((gx, i) => (
              <line
                key={`gx${gx}`}
                x1={gx}
                y1={-240}
                x2={gx}
                y2={1320}
                stroke={i % 5 === 0 ? PAL.gridBright : PAL.grid}
                strokeWidth={i % 5 === 0 ? 1.5 : 0.9}
                opacity={i % 5 === 0 ? 0.44 : 0.26}
              />
            ))}
            {GRID_YS.map((gy, j) => (
              <line
                key={`gy${gy}`}
                x1={-380}
                y1={gy}
                x2={2300}
                y2={gy}
                stroke={j % 5 === 0 ? PAL.gridBright : PAL.grid}
                strokeWidth={j % 5 === 0 ? 1.5 : 0.9}
                opacity={j % 5 === 0 ? 0.44 : 0.26}
              />
            ))}
          </g>

          {/* Khung góc bản vẽ kỹ thuật */}
          {[
            [68, 152, 1, 1],
            [1852, 152, -1, 1],
            [68, 1020, 1, -1],
            [1852, 1020, -1, -1],
          ].map(([cx, cy, sx, sy], idx) => (
            <path
              key={idx}
              d={`M ${cx} ${cy + sy * 34} L ${cx} ${cy} L ${cx + sx * 34} ${cy}`}
              fill="none"
              stroke={PAL.gridBright}
              strokeWidth={3}
            />
          ))}

          {/* ==================== 2. ĐƯỜNG ỐNG DẪN NHIÊN LIỆU SẠCH SẼ (drawOn + nét kép halo, KHÔNG gắn #glow) ==================== */}
          <g strokeLinecap="round" strokeLinejoin="round">
            {allPipes.map((d, i) => (
              <path key={`case${i}`} d={d} fill="none" stroke={PAL.steelDark} strokeWidth={13} />
            ))}
            {allPipes.map((d, i) => (
              <path key={`in${i}`} d={d} fill="none" stroke={PAL.bgDeep} strokeWidth={8} />
            ))}

            {/* Halo mờ bản rộng của dòng nhiên liệu */}
            <path
              d={hullCollectorRail}
              fill="none"
              stroke={idleActive > 0.2 ? PAL.crimson : PAL.amber}
              strokeWidth={16}
              opacity={0.24}
              {...drawOn(660, pipeDraw)}
            />
            <path
              d={riserToLeft}
              fill="none"
              stroke={PAL.amber}
              strokeWidth={16}
              opacity={0.22 + focus60 * 0.22}
              {...drawOn(310, pipeDraw)}
            />
            <path
              d={branchToMid}
              fill="none"
              stroke={PAL.amber}
              strokeWidth={16}
              opacity={0.22 + focus505 * 0.22}
              {...drawOn(530, pipeDraw)}
            />
            <path
              d={branchToRight}
              fill="none"
              stroke={idleActive > 0.1 ? PAL.crimson : PAL.amber}
              strokeWidth={16}
              opacity={0.22 + idleActive * 0.28}
              {...drawOn(620, pipeDraw)}
            />

            {/* Lõi sáng dòng chảy nhiên liệu vẽ dần bằng drawOn */}
            <path
              d={hullCollectorRail}
              fill="none"
              stroke={idleActive > 0.2 ? '#ff7c7c' : PAL.amberHot}
              strokeWidth={6}
              {...drawOn(660, pipeDraw)}
            />
            {[tankTap1, tankTap2, tankTap3].map((d, idx) => (
              <path
                key={`tap${idx}`}
                d={d}
                fill="none"
                stroke={idleActive > 0.2 ? '#ff7c7c' : PAL.amberHot}
                strokeWidth={6}
                {...drawOn(40, pipeDraw)}
              />
            ))}
            <path
              d={turbineFeedPipe}
              fill="none"
              stroke={idleActive > 0.1 ? PAL.crimson : PAL.amberHot}
              strokeWidth={6}
              {...drawOn(80, pipeDraw)}
            />
            <path d={riserToLeft} fill="none" stroke={PAL.amberHot} strokeWidth={6} {...drawOn(310, pipeDraw)} />
            <path d={branchToMid} fill="none" stroke={PAL.amberHot} strokeWidth={6} {...drawOn(530, pipeDraw)} />
            <path
              d={branchToRight}
              fill="none"
              stroke={idleActive > 0.1 ? '#ff7c7c' : PAL.amberHot}
              strokeWidth={6}
              {...drawOn(620, pipeDraw)}
            />

            {/* Xung hạt dòng chảy chạy dọc trong ống */}
            {pipeDraw > 0.5 && (
              <>
                <path
                  d={hullCollectorRail}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={3.5}
                  strokeDasharray="12 34"
                  strokeDashoffset={-t * 140}
                  opacity={0.78}
                />
                <path
                  d={riserToLeft}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={3.5}
                  strokeDasharray="12 34"
                  strokeDashoffset={-t * (t >= CUE.c04_s05_60gal ? 195 : 80)}
                  opacity={0.78}
                />
                <path
                  d={branchToMid}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={3.5}
                  strokeDasharray="12 34"
                  strokeDashoffset={-t * 130}
                  opacity={0.78}
                />
                <path
                  d={branchToRight}
                  fill="none"
                  stroke={idleActive > 0.1 ? '#ffd0d0' : '#ffffff'}
                  strokeWidth={3.5}
                  strokeDasharray="10 32"
                  strokeDashoffset={-t * (idleActive > 0.1 ? 110 : 70)}
                  opacity={0.82}
                />
              </>
            )}

            {/* Khớp nối mặt bích van ống */}
            {[
              [472, 686],
              [472, 518],
              [385, 518],
              [960, 518],
              [1535, 518],
            ].map(([vx, vy], idx) => (
              <circle
                key={idx}
                cx={vx}
                cy={vy}
                r={8}
                fill={PAL.steelMid}
                stroke={PAL.ink}
                strokeWidth={2.5}
              />
            ))}
          </g>

          {/* ==================== 3. NỬA TRÊN: 3 CỤM ĐỒNG HỒ LƯU LƯỢNG & THÙNG PHUY TRỰC QUAN ==================== */}

          {/* --- MODULE TRÁI: LƯU LƯỢNG BĂNG ĐỒNG 60 GAL / HR (CUE.c04_s05_60gal @ 573.60s) --- */}
          <BlueprintPanelCard
            x={115}
            y={180}
            w={540}
            h={316}
            accentColor={PAL.amber}
            active={focus60}
          >
            <g transform="translate(272 386)">
              <path
                d="M -126 14 A 126 126 0 0 1 126 14 L 106 14 A 106 106 0 0 0 -106 14 Z"
                fill={PAL.steelMid}
                stroke={PAL.ink}
                strokeWidth={3}
              />
              <path
                d="M -116 14 A 116 116 0 0 1 116 14 Z"
                fill={PAL.bgDeep}
                stroke={PAL.ink}
                strokeWidth={3.2}
              />

              {/* 3 dải vòng cung đo tải đốt nhiên liệu */}
              <path
                d="M -96 0 A 96 96 0 0 1 -48 -83"
                fill="none"
                stroke={PAL.cyan}
                strokeWidth={14}
                opacity={0.75}
              />
              <path
                d="M -44 -85 A 96 96 0 0 1 54 -79"
                fill="none"
                stroke={PAL.amber}
                strokeWidth={14}
                opacity={0.92}
              />
              <path
                d="M 58 -76 A 96 96 0 0 1 96 0"
                fill="none"
                stroke={PAL.crimson}
                strokeWidth={17}
              />
              {/* Vạch cảnh báo sáng rực ở vùng đỉnh 60 gal/hr khi kim vọt lên */}
              {spring60 > 0.6 && (
                <path
                  d="M 58 -76 A 96 96 0 0 1 96 0"
                  fill="none"
                  stroke={PAL.amberHot}
                  strokeWidth={6}
                  opacity={0.65 * Math.min(1, spring60)}
                />
              )}

              {Array.from({ length: 13 }, (_, i) => {
                const degAng = -168 + i * 13;
                const rad = (degAng * Math.PI) / 180;
                const rIn = i % 3 === 0 ? 68 : 77;
                const rOut = 92;
                return (
                  <line
                    key={i}
                    x1={Math.cos(rad) * rIn}
                    y1={Math.sin(rad) * rIn}
                    x2={Math.cos(rad) * rOut}
                    y2={Math.sin(rad) * rOut}
                    stroke={i >= 9 ? PAL.amberHot : PAL.cream}
                    strokeWidth={i % 3 === 0 ? 3.2 : 1.8}
                  />
                );
              })}

              {/* Kim đồng hồ bản lớn rõ nét vọt lên đỉnh lúc 573.60s */}
              <g transform={`rotate(${needleDeg})`}>
                <polygon
                  points="-18,-7 98,0 -18,7"
                  fill={PAL.amberHot}
                  stroke={PAL.ink}
                  strokeWidth={2.4}
                />
                <polygon points="-14,-3 90,0 -14,0" fill="#ffffff" opacity={0.85} />
              </g>
              <circle cx={0} cy={0} r={18} fill={PAL.steelLight} stroke={PAL.ink} strokeWidth={3} />
              <circle cx={0} cy={0} r={8} fill={PAL.amber} />
            </g>

            {/* Dãy 6 thùng phuy nhiên liệu 3 tông sáng rực màu PAL.amber tại CUE.c04_s05_60gal */}
            {[0, 1, 2, 3, 4, 5].map((idx) => {
              const col = idx % 3;
              const row = Math.floor(idx / 3);
              const drumLit = prog(
                t,
                CUE.c04_s05_60gal - 0.06 + idx * 0.07,
                CUE.c04_s05_60gal + 0.22 + idx * 0.07
              );
              return (
                <FuelDrum2D
                  key={idx}
                  x={448 + col * 68}
                  y={288 + row * 98}
                  scale={0.94}
                  lit={drumLit}
                  tone="amber"
                  fillLevel={1}
                />
              );
            })}
          </BlueprintPanelCard>

          {/* --- MODULE GIỮA: BỒN CHÍNH 505 GAL & TIÊU HAO 2 GAL/MILE (576.14s & 577.54s) --- */}
          <BlueprintPanelCard
            x={690}
            y={180}
            w={540}
            h={316}
            accentColor={PAL.amberHot}
            active={focus505}
          >
            <g transform="translate(832 358)">
              <rect
                x={-92}
                y={-114}
                width={184}
                height={224}
                rx={22}
                fill={PAL.steelDark}
                stroke={PAL.ink}
                strokeWidth={3.4}
              />
              <rect x={-84} y={-108} width={32} height={212} rx={12} fill={PAL.steelMid} opacity={0.55} />

              <rect
                x={-70}
                y={-96}
                width={140}
                height={188}
                rx={12}
                fill={PAL.bgDeep}
                stroke={PAL.ink}
                strokeWidth={3}
              />

              {(() => {
                const maxH = 180;
                const curH = maxH * fuelLevel;
                const topY = 88 - curH;
                return (
                  <g>
                    <rect
                      x={-66}
                      y={topY}
                      width={132}
                      height={curH}
                      rx={8}
                      fill="url(#c04s05AmberLiquid)"
                    />
                    <path
                      d={`M -66 ${topY + 3} Q -33 ${topY - 5 + waveShift} 0 ${topY + 3} T 66 ${topY + 3} L 66 ${topY + 11} L -66 ${topY + 11} Z`}
                      fill={PAL.amberHot}
                    />
                    <rect
                      x={-58}
                      y={topY + 6}
                      width={18}
                      height={Math.max(0, curH - 12)}
                      rx={4}
                      fill="#ffffff"
                      opacity={0.24}
                    />
                  </g>
                );
              })()}

              {Array.from({ length: 10 }, (_, k) => {
                const ty = -80 + k * 18;
                const major = k % 2 === 0;
                return (
                  <line
                    key={k}
                    x1={major ? 32 : 44}
                    y1={ty}
                    x2={66}
                    y2={ty}
                    stroke={PAL.cream}
                    strokeWidth={major ? 2.8 : 1.6}
                    opacity={0.82}
                  />
                );
              })}

              {focus505 > 0.1 && (
                <g opacity={0.88 * focus505}>
                  <path
                    d="M 0 -72 L 0 -16 M -13 -30 L 0 -13 L 13 -30"
                    fill="none"
                    stroke={PAL.crimson}
                    strokeWidth={5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              <rect x={-54} y={-124} width={108} height={13} rx={4} fill={PAL.steelLight} stroke={PAL.ink} strokeWidth={2.6} />
              <rect x={-54} y={108} width={108} height={12} rx={4} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={2.6} />
            </g>

            {/* 3 hàng cọc mốc quãng đường x 2 phuy rút cạn dần (2 gal/mile) */}
            {[0, 1, 2].map((row) => {
              const rowTrig = CUE.c04_s05_2gpm + row * 0.72;
              const rowLit = prog(t, rowTrig - 0.1, rowTrig + 0.25);
              const rowDrain = prog(t, rowTrig + 0.15, rowTrig + 1.05);
              const ry = 274 + row * 76;
              return (
                <g key={row}>
                  <polygon
                    points={`984,${ry - 17} 1001,${ry} 984,${ry + 17} 967,${ry}`}
                    fill={rowLit > 0.2 ? PAL.amberHot : PAL.steelDark}
                    stroke={PAL.ink}
                    strokeWidth={2.6}
                  />
                  <path
                    d={`M 1012 ${ry} L 1054 ${ry} M 1044 ${ry - 8} L 1056 ${ry} L 1044 ${ry + 8}`}
                    fill="none"
                    stroke={rowLit > 0.2 ? PAL.amber : PAL.gridBright}
                    strokeWidth={3.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    {...drawOn(68, rowLit)}
                  />
                  <FuelDrum2D
                    x={1098}
                    y={ry}
                    scale={0.76}
                    lit={rowLit}
                    tone="amber"
                    fillLevel={1 - rowDrain * 0.82}
                  />
                  <FuelDrum2D
                    x={1162}
                    y={ry}
                    scale={0.76}
                    lit={rowLit}
                    tone="amber"
                    fillLevel={1 - rowDrain * 0.82}
                  />
                </g>
              );
            })}
          </BlueprintPanelCard>

          {/* --- MODULE PHẢI: CHẾ ĐỘ ĐỨNG YÊN NỔ CẦM CHỪNG 10 GAL / HR (CUE.c04_s05_idle @ 579.62s) --- */}
          <BlueprintPanelCard
            x={1265}
            y={180}
            w={540}
            h={316}
            accentColor={PAL.crimson}
            active={idleActive}
          >
            <g transform="translate(1410 356)">
              {idleActive > 0.05 && (
                <circle
                  cx={0}
                  cy={0}
                  r={94 + idleStrobe * 8}
                  fill="none"
                  stroke={PAL.crimson}
                  strokeWidth={5}
                  opacity={0.35 * idleStrobe}
                />
              )}
              <circle
                cx={0}
                cy={0}
                r={84}
                fill={PAL.bgDeep}
                stroke={idleActive > 0.1 ? PAL.crimson : PAL.steelMid}
                strokeWidth={4}
              />

              <g transform={`rotate(${t * 55})`}>
                {Array.from({ length: 10 }, (_, b) => (
                  <rect
                    key={b}
                    x={-5}
                    y={-70}
                    width={10}
                    height={44}
                    rx={3}
                    fill={idleActive > 0.1 ? mix(PAL.steelMid, PAL.crimson, idleStrobe * 0.75) : PAL.steelMid}
                    stroke={PAL.ink}
                    strokeWidth={1.8}
                    transform={`rotate(${b * 36})`}
                  />
                ))}
              </g>

              <circle
                cx={0}
                cy={0}
                r={33}
                fill={PAL.panel}
                stroke={idleActive > 0.1 ? PAL.crimson : PAL.gridBright}
                strokeWidth={3.2}
              />
              <rect
                x={-13}
                y={-15}
                width={9}
                height={30}
                rx={2.5}
                fill={idleActive > 0.1 ? '#ff9494' : PAL.cream}
              />
              <rect
                x={4}
                y={-15}
                width={9}
                height={30}
                rx={2.5}
                fill={idleActive > 0.1 ? '#ff9494' : PAL.cream}
              />
            </g>

            {/* Cột đo nổ cầm chừng nhấp nháy đỏ PAL.crimson rút nhiên liệu liên tục */}
            <g transform="translate(1608 356)">
              <rect
                x={-48}
                y={-110}
                width={96}
                height={218}
                rx={12}
                fill={PAL.bgDeep}
                stroke={idleActive > 0.1 ? PAL.crimson : PAL.ink}
                strokeWidth={3.4}
              />
              {Array.from({ length: 10 }, (_, seg) => {
                const sy = 80 - seg * 19.5;
                const litIdle =
                  idleActive > 0.1
                    ? seg <= 6
                      ? 0.45 + 0.55 * idleStrobe
                      : seg === 7
                        ? idleStrobe * 0.65
                        : 0.08
                    : seg <= 2
                      ? 0.45
                      : 0.1;
                return (
                  <rect
                    key={seg}
                    x={-34}
                    y={sy}
                    width={68}
                    height={13}
                    rx={3}
                    fill={idleActive > 0.1 ? PAL.crimson : PAL.amber}
                    opacity={litIdle}
                  />
                );
              })}
            </g>

            <FuelDrum2D
              x={1728}
              y={394}
              scale={0.92}
              lit={idleActive * (0.55 + 0.45 * idleStrobe)}
              tone="crimson"
              fillLevel={Math.max(0.25, 0.85 - prog(t, CUE.c04_s05_idle, 581.5) * 0.45)}
            />
            {idleActive > 0.05 && (
              <g opacity={0.5 + 0.5 * idleStrobe}>
                <path
                  d="M 1728 256 L 1728 330 M 1714 314 L 1728 332 L 1742 314"
                  fill="none"
                  stroke={PAL.crimson}
                  strokeWidth={6}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            )}
          </BlueprintPanelCard>

          {/* ==================== 4. NỬA DƯỚI: ABRAMSSIDE2D + 4 KHOANG BỒN NHIÊN LIỆU HỔ PHÁCH & CỌC MỐC ==================== */}
          <g>
            <AbramsSide2D x={865} y={878} scale={1.24} camo="desert" />

            {/* Khung cửa sổ X-ray thân xe để lộ buồng tuabin AGT1500 & 4 khoang bồn chứa nhiên liệu */}
            <rect
              x={402}
              y={694}
              width={774}
              height={100}
              rx={12}
              fill="rgba(8, 14, 22, 0.8)"
              stroke={PAL.gridBright}
              strokeWidth={2.8}
            />

            {/* Khối tuabin AGT1500 ở đuôi xe */}
            <g transform="translate(454 744)">
              <rect
                x={-38}
                y={-34}
                width={76}
                height={68}
                rx={10}
                fill={PAL.steelDark}
                stroke={idleActive > 0.1 ? PAL.crimson : PAL.amber}
                strokeWidth={3}
              />
              <circle
                cx={0}
                cy={0}
                r={22}
                fill={PAL.bgDeep}
                stroke={idleActive > 0.1 ? '#ff8585' : PAL.amberHot}
                strokeWidth={2.5}
              />
              <g transform={`rotate(${t * (idleActive > 0.1 ? 80 : 240)})`}>
                {[0, 45, 90, 135].map((ang) => (
                  <line
                    key={ang}
                    x1={-16}
                    y1={0}
                    x2={16}
                    y2={0}
                    stroke={idleActive > 0.1 ? PAL.crimson : PAL.amberHot}
                    strokeWidth={3}
                    transform={`rotate(${ang})`}
                  />
                ))}
              </g>
              <polygon
                points="-42,-15 -78,-22 -68,0 -78,22 -42,15"
                fill={idleActive > 0.1 ? PAL.crimson : PAL.amber}
                opacity={0.8}
              />
            </g>

            {/* 4 KHOANG BỒN CHỨA NHIÊN LIỆU BÊN TRONG THÂN XE SÁNG MÀU PAL.AMBER */}
            {hullTanks.map((tk, idx) => {
              const innerH = tk.h - 10;
              const fillH = innerH * fuelLevel;
              const fillY = tk.y + tk.h - 5 - fillH;
              const isCrimson = idleActive > 0.25;

              return (
                <g key={idx}>
                  <rect
                    x={tk.x - 2}
                    y={tk.y - 2}
                    width={tk.w + 4}
                    height={tk.h + 4}
                    rx={9}
                    fill="none"
                    stroke={isCrimson ? PAL.crimson : PAL.amber}
                    strokeWidth={4}
                    opacity={0.32}
                  />
                  <rect
                    x={tk.x}
                    y={tk.y}
                    width={tk.w}
                    height={tk.h}
                    rx={7}
                    fill={PAL.bgDeep}
                    stroke={isCrimson ? PAL.crimson : PAL.amberHot}
                    strokeWidth={2.8}
                  />
                  <rect
                    x={tk.x + 4}
                    y={fillY}
                    width={tk.w - 8}
                    height={fillH}
                    rx={4}
                    fill={isCrimson ? 'url(#c04s05CrimsonLiquid)' : 'url(#c04s05AmberLiquid)'}
                  />
                  <rect
                    x={tk.x + 5}
                    y={fillY}
                    width={tk.w - 10}
                    height={5}
                    rx={2}
                    fill={isCrimson ? '#ffb3b3' : PAL.amberHot}
                  />
                  <line
                    x1={tk.x + tk.w * 0.5}
                    y1={tk.y + 8}
                    x2={tk.x + tk.w * 0.5}
                    y2={tk.y + tk.h - 8}
                    stroke={PAL.ink}
                    strokeWidth={2.2}
                    strokeDasharray="6 5"
                    opacity={0.65}
                  />
                </g>
              );
            })}

            {/* THƯỚC CỌC MỐC QUÃNG ĐƯỜNG BĂNG ĐỒNG DƯỚI DẢI XÍCH */}
            <g transform="translate(-15 944)">
              <line x1={390} y1={0} x2={1390} y2={0} stroke={PAL.gridBright} strokeWidth={4} />
              <path
                d="M 390 0 L 1390 0"
                fill="none"
                stroke={PAL.amber}
                strokeWidth={12}
                opacity={0.26}
                {...drawOn(1000, mileSweep)}
              />
              <path
                d="M 390 0 L 1390 0"
                fill="none"
                stroke={PAL.amberHot}
                strokeWidth={5}
                {...drawOn(1000, mileSweep)}
              />

              {[430, 610, 790, 970, 1150, 1330].map((mx, mIdx) => {
                const reached = mileSweep >= mIdx / 5.2 && t >= CUE.c04_s05_2gpm - 0.05;
                return (
                  <g key={mx} transform={`translate(${mx} 0)`}>
                    <line
                      x1={0}
                      y1={-17}
                      x2={0}
                      y2={17}
                      stroke={reached ? PAL.amberHot : PAL.gridBright}
                      strokeWidth={3}
                    />
                    <polygon
                      points="0,-12 12,0 0,12 -12,0"
                      fill={reached ? PAL.amber : PAL.panel}
                      stroke={PAL.ink}
                      strokeWidth={2.6}
                    />
                    {mIdx > 0 && (
                      <g transform="translate(-90 27)" opacity={reached ? 0.95 : 0.28}>
                        <rect
                          x={-16}
                          y={-8}
                          width={13}
                          height={18}
                          rx={3}
                          fill={reached ? PAL.amber : PAL.steelDark}
                          stroke={PAL.ink}
                          strokeWidth={1.8}
                        />
                        <rect
                          x={3}
                          y={-8}
                          width={13}
                          height={18}
                          rx={3}
                          fill={reached ? PAL.amber : PAL.steelDark}
                          stroke={PAL.ink}
                          strokeWidth={1.8}
                        />
                      </g>
                    )}
                  </g>
                );
              })}
            </g>
          </g>
        </svg>
      </Cam2D>

      {/* CHỈ DÙNG <Label> (tối đa 1 nhãn xuất hiện tại một thời điểm, tuyệt đối không có <text> SVG) */}
      <Label
        t={t}
        text="60 GAL / HR"
        x={960}
        y={104}
        from={CUE.c04_s05_60gal}
        until={575.70}
        bg={PAL.amber}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="505 GAL · 2 GAL/MI"
        x={960}
        y={104}
        from={CUE.c04_s05_2gpm}
        until={579.10}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="10 GAL / HR"
        x={960}
        y={104}
        from={CUE.c04_s05_idle}
        until={581.30}
        bg={PAL.crimson}
        fg={PAL.white}
      />

      <Grain opacity={0.45} />
    </AbsoluteFill>
  );
};

export default C04S05;
