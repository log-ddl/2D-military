import React from 'react';
import { FONT, prog, lerp, bump } from '@kit/theme';
import { useT, useSpring, handheld, Layer, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { Muzzle2D } from '@lib/2d/fx';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Front2D, F35Top2D } from '../local/jets2d';

// 22 vị trí mấu đạn đối xứng nhìn chính diện trên F15Front2D (scale = 3.55, tâm x = 860)
const F15_X = 860;
const F15_Y = 480;
const F15_S = 3.55;

const MISSILE_SLOTS = [
  // 11 quả bên cánh phải máy bay (x < 0 từ ngoài vào trong)
  { id: 1, lx: -144, ly: 16, tier: 'amber' },
  { id: 2, lx: -126, ly: 16, tier: 'std' },
  { id: 3, lx: -102, ly: 20, tier: 'amber' },
  { id: 4, lx: -90, ly: 20, tier: 'std' },
  { id: 5, lx: -78, ly: 20, tier: 'std' },
  { id: 6, lx: -66, ly: 20, tier: 'amber' },
  { id: 7, lx: -44, ly: 24, tier: 'amber' },
  { id: 8, lx: -34, ly: 24, tier: 'std' },
  { id: 9, lx: -24, ly: 24, tier: 'std' },
  { id: 10, lx: -14, ly: 24, tier: 'amber' },
  { id: 11, lx: -8, ly: 27, tier: 'std' },
  // 11 quả bên cánh trái máy bay (x > 0 từ trong ra ngoài)
  { id: 12, lx: 8, ly: 27, tier: 'std' },
  { id: 13, lx: 14, ly: 24, tier: 'amber' },
  { id: 14, lx: 24, ly: 24, tier: 'std' },
  { id: 15, lx: 34, ly: 24, tier: 'std' },
  { id: 16, lx: 44, ly: 24, tier: 'amber' },
  { id: 17, lx: 66, ly: 20, tier: 'amber' },
  { id: 18, lx: 78, ly: 20, tier: 'std' },
  { id: 19, lx: 90, ly: 20, tier: 'std' },
  { id: 20, lx: 102, ly: 20, tier: 'amber' },
  { id: 21, lx: 126, ly: 16, tier: 'std' },
  { id: 22, lx: 144, ly: 16, tier: 'amber' },
] as const;

// 23 mấu treo dọc sải cánh & thân (11 trái + mấu bụng trung tâm Sta 5 + 11 phải)
const STATION_23_X = [
  -146, -128, -104, -91, -78, -65, -45, -34, -24, -14, -8,
  0,
  8, 14, 24, 34, 45, 65, 78, 91, 104, 128, 146,
];

// Vòng răng cưa phản xạ radar khi F-35 treo vũ khí ngoài cánh
const buildJaggedRing = (cx: number, cy: number, rx: number, ry: number, teeth: number, amp: number, phase: number) => {
  const pts: string[] = [];
  const total = teeth * 2;
  for (let i = 0; i < total; i++) {
    const a = (i / total) * Math.PI * 2 + phase;
    const k = i % 2 === 0 ? 1 + amp : 1 - amp * 0.55;
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    pts.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return pts.join(' ') + ' Z';
};

const S13: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Chuyển máy quay giữa Khu Trái (F-15EX 22 tên lửa + Vulcan) và Khu Phải (Nhà tù hình học 12 ft F-35A)
  const panToRight = prog(t, 349.15, 351.55);
  const vulcanFocus = prog(t, 338.3, 339.7) * (1 - prog(t, 344.8, 346.3));

  const leftCamX = lerp(F15_X, 775, vulcanFocus);
  const leftCamY = lerp(525, 470, vulcanFocus);
  const leftZoom = lerp(1.01, 1.07, vulcanFocus);

  const F35_X = 2460;
  const F35_Y = 505;
  const F35_S = 2.55;

  const stealthBreakShake = t >= 360.4 ? bump(t, 361.35, 1.4) * 8 : 0;
  const vulcanShake = t >= 341.0 && t <= 343.2 ? Math.sin(t * 75) * 2.4 : 0;

  const camX = lerp(leftCamX, F35_X, panToRight);
  const camY = lerp(leftCamY, 520, panToRight);
  const camZoom = lerp(leftZoom, 1.03, panToRight);
  const hk = handheld(t, 2.2 + stealthBreakShake * 0.4, 's13');

  // Tiến độ kích hoạt 23 mấu treo & 22 tên lửa AMBER
  const sta23Prog = prog(t, 328.2, 331.4);
  const beast22Mode = t >= 332.9;
  const amberFill = prog(t, 332.9, CUE.s13_amber22);

  // Đếm tổng số tên lửa hiển thị (12 chuẩn -> 22 AMBER)
  const activeMissileCount = beast22Mode ? Math.round(lerp(12, 22, amberFill)) : 12;

  // Ô phóng đại tròn M61A1 Vulcan 20mm (338.3 - 347.5s)
  const vulcanIn = useSpring(t, 338.35, 12, 150);
  const vulcanOut = 1 - prog(t, 346.6, 347.8);
  const vulcanScale = Math.max(0, vulcanIn * vulcanOut);
  const isFiring = t >= CUE.s13_vulcanBurst && t <= 343.35;
  const barrelSpinDeg = t >= 338.35 ? (t - 338.35) * (isFiring ? 1280 : 420) : 0;

  // Tọa độ thế giới của cửa nòng Vulcan gốc cánh phải F-15EX: local (-41, -5)
  const gunWorldX = F15_X - 41 * F15_S;
  const gunWorldY = F15_Y - 5 * F15_S;
  const insetCx = 295;
  const insetCy = 258;
  const insetR = 148;

  // Điểm nhấn mấu bụng trung tâm F-15EX lúc 349.0s trước khi lia máy
  const bellySpot = prog(t, 348.5, 349.3) * (1 - prog(t, 350.9, 351.6));

  // Khu Phải: Nhà tù hình học 12 ft của F-35A & vỡ tàng hình
  const bayOpen = t >= 351.8;
  const prisonAppear = prog(t, 351.7, 353.3);
  const dim12Appear = prog(t, 354.3, 356.2);
  const hasExternalStores = t >= 360.2;
  const extSlam = useSpring(t, 360.2, 11, 170);
  const breakWave = prog(t, 360.5, 363.8);
  const breakFlash = bump(t, CUE.s13_stealthBreak, 0.9);

  // Khung kích thước khoang đạn 12 ft bên trong F35Top2D (local x: -48..+42, y: -23..+23)
  const bayX0 = F35_X - 48 * F35_S;
  const bayX1 = F35_X + 42 * F35_S;
  const bayY0 = F35_Y - 25 * F35_S;
  const bayY1 = F35_Y + 25 * F35_S;

  const burstTimes = [341.0, 341.22, 341.44, 341.66, 341.88, 342.1, 342.32, 342.54, 342.76, 342.98];

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, background: P.bgDeep, overflow: 'hidden' }}>
      <Cam2D
        x={camX}
        y={camY}
        zoom={camZoom}
        shake={[hk[0] + vulcanShake, hk[1] + vulcanShake * 0.4]}
        bg={P.bgDeep}
      >
        <Layer style={{ width: 4200, height: 1800 }}>
          <Defs2D shadow="rgba(5, 11, 22, 0.55)" />
          <defs>
            <clipPath id="s13_vulcanClip">
              <circle cx={insetCx} cy={insetCy} r={insetR - 4} />
            </clipPath>
          </defs>

          {/* Nền bản vẽ kỹ thuật trải rộng qua cả 2 khu vực */}
          <BlueprintGrid x0={-500} y0={-360} w={4200} h={1840} step={120} id="s13_bp" />

          {/* Đường trục kỹ thuật nối Khu Trái (F-15EX) sang Khu Phải (F-35A) */}
          <line
            x1={100}
            y1={505}
            x2={3220}
            y2={505}
            stroke={P.gridBright}
            strokeWidth={1.3}
            strokeDasharray="12 8"
            opacity={0.35}
          />

          {/* ===================================================================== */}
          {/* KHU TRÁI: F-15EX 23 MẤU TREO / 22 TÊN LỬA AMBER + PHÁO XOAY VULCAN     */}
          {/* ===================================================================== */}
          <g>
            {/* Vòng thước chia độ kỹ thuật mờ sau lưng F-15EX */}
            <circle
              cx={F15_X}
              cy={F15_Y - 10}
              r={360}
              fill="none"
              stroke={P.gridBright}
              strokeWidth={1.4}
              strokeDasharray="6 10"
              opacity={0.28}
            />
            <circle
              cx={F15_X}
              cy={F15_Y - 10}
              r={470}
              fill="none"
              stroke={P.grid}
              strokeWidth={1.1}
              opacity={0.24}
            />

            {/* Tiêu đề kỹ thuật góc trên Khu Trái */}
            <g transform={`translate(${F15_X} 92)`}>
              <rect
                x={-310}
                y={-26}
                width={620}
                height={46}
                rx={8}
                fill={P.bgPanel}
                stroke={P.gridBright}
                strokeWidth={1.6}
                opacity={0.92}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill={P.text}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={21}
                letterSpacing={2}
              >
                F-15EX EAGLE II · ORDNANCE STATION MATRIX
              </text>
            </g>

            {/* Dây gióng từ 22 đầu đạn trên cánh xuống thanh ma trận AMBER */}
            {MISSILE_SLOTS.map((m) => {
              const distRatio = Math.abs(m.lx) / 144;
              const isAmber = m.tier === 'amber';
              const lit = !isAmber || amberFill >= distRatio * 0.92;
              if (!lit) return null;
              const wx = F15_X + m.lx * F15_S;
              const wy = F15_Y + m.ly * F15_S + 14;
              return (
                <line
                  key={`drop_${m.id}`}
                  x1={wx}
                  y1={wy}
                  x2={wx}
                  y2={638}
                  stroke={isAmber && beast22Mode ? P.amber : P.cyan}
                  strokeWidth={isAmber && beast22Mode ? 1.8 : 1.2}
                  strokeDasharray="4 4"
                  opacity={beast22Mode ? 0.62 : 0.35}
                />
              );
            })}

            {/* Hình chiếu trực diện lớn F-15EX */}
            <g filter="url(#sh)">
              <F15Front2D
                x={F15_X}
                y={F15_Y}
                scale={F15_S}
                loadout={beast22Mode ? 'beast22' : 'standard12'}
                cft
                highlightVulcan={t >= 338.2}
              />
            </g>

            {/* Hào quang nhấn thêm cho các quả tên lửa AMBER vừa lắp thêm (nét kép không dùng filter glow) */}
            {beast22Mode &&
              MISSILE_SLOTS.map((m) => {
                const distRatio = Math.abs(m.lx) / 144;
                const slotP = prog(amberFill, distRatio * 0.72, Math.min(1, distRatio * 0.72 + 0.26));
                if (slotP <= 0.01) return null;
                const wx = F15_X + m.lx * F15_S;
                const wy = F15_Y + m.ly * F15_S;
                const isNew = m.tier === 'amber';
                return (
                  <g key={`halo_${m.id}`} opacity={slotP}>
                    <circle
                      cx={wx}
                      cy={wy}
                      r={isNew ? 18 : 13}
                      fill={isNew ? P.amber : P.cyan}
                      opacity={isNew ? 0.24 : 0.14}
                    />
                    <circle
                      cx={wx}
                      cy={wy}
                      r={isNew ? 9.5 : 7.5}
                      fill="none"
                      stroke={isNew ? P.amberHot : P.cyanSoft}
                      strokeWidth={isNew ? 2.2 : 1.4}
                    />
                  </g>
                );
              })}

            {/* Chớp lửa đầu nòng Vulcan trực tiếp tại gốc cánh phải F-15EX */}
            {burstTimes.map((bt, idx) => (
              <Muzzle2D
                key={`gun_root_${idx}`}
                t={t}
                at={bt}
                x={gunWorldX}
                y={gunWorldY}
                angle={-155}
                size={26}
                seed={20 + idx}
              />
            ))}

            {/* Khung ngắm khóa mấu bụng trung tâm lúc 349.0s ("Look beneath the center belly pylon") */}
            {bellySpot > 0.01 && (
              <g transform={`translate(${F15_X} ${F15_Y + 62})`} opacity={bellySpot}>
                <circle cx={0} cy={0} r={54} fill={P.amber} opacity={0.18} />
                <circle cx={0} cy={0} r={40} fill="none" stroke={P.amberHot} strokeWidth={3} strokeDasharray="10 6" />
                <line x1={-60} y1={0} x2={-24} y2={0} stroke={P.amberHot} strokeWidth={3} />
                <line x1={24} y1={0} x2={60} y2={0} stroke={P.amberHot} strokeWidth={3} />
                <line x1={0} y1={-60} x2={0} y2={-24} stroke={P.amberHot} strokeWidth={3} />
                <line x1={0} y1={24} x2={0} y2={60} stroke={P.amberHot} strokeWidth={3} />
              </g>
            )}

            {/* Thanh thước 23 Mấu treo vũ khí (23 Weapon Stations) */}
            <g transform="translate(0 638)">
              <line
                x1={F15_X - 545}
                y1={0}
                x2={F15_X + 545}
                y2={0}
                stroke={P.gridBright}
                strokeWidth={2}
              />
              {STATION_23_X.map((lx, idx) => {
                const wx = F15_X + lx * F15_S;
                const dNorm = Math.abs(lx) / 146;
                const on = sta23Prog >= dNorm * 0.95;
                const isCenter = lx === 0;
                return (
                  <g key={`sta_${idx}`} transform={`translate(${wx} 0)`}>
                    <line
                      x1={0}
                      y1={-9}
                      x2={0}
                      y2={9}
                      stroke={on ? (isCenter ? P.amberHot : P.cyan) : P.grid}
                      strokeWidth={isCenter ? 3.2 : 2.2}
                    />
                    {on && (
                      <circle
                        cx={0}
                        cy={0}
                        r={isCenter ? 5.5 : 3.6}
                        fill={isCenter ? P.amber : P.cyan}
                      />
                    )}
                  </g>
                );
              })}
              <rect
                x={F15_X - 165}
                y={-15}
                width={330}
                height={30}
                rx={6}
                fill={P.bgDeep}
                stroke={sta23Prog > 0.2 ? P.cyan : P.grid}
                strokeWidth={1.6}
              />
              <text
                x={F15_X}
                y={6}
                textAnchor="middle"
                fill={P.cyanSoft}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={16}
                letterSpacing={1.6}
              >
                23 WEAPON STATIONS · AMBER RACKS
              </text>
            </g>

            {/* Bảng đếm đối xứng 22 quả tên lửa không đối không (y = 684..832, chừa khoảng trống dưới cho <Label>) */}
            <g transform={`translate(${F15_X} 758)`}>
              <rect
                x={-555}
                y={-68}
                width={1110}
                height={138}
                rx={14}
                fill={P.bgPanel}
                stroke={beast22Mode ? P.amber : P.gridBright}
                strokeWidth={2.4}
                opacity={0.95}
              />
              {/* Nhãn góc trái & góc phải trong bảng */}
              <text
                x={-525}
                y={-38}
                fill={P.muted}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={16}
                letterSpacing={1.4}
              >
                RIGHT WING &amp; CFT (11x AAM)
              </text>
              <text
                x={0}
                y={-36}
                textAnchor="middle"
                fill={beast22Mode ? P.amberHot : P.cyanSoft}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={22}
                letterSpacing={1.5}
              >
                {`AIR-TO-AIR LOADOUT: ${activeMissileCount} / 22`}
              </text>
              <text
                x={525}
                y={-38}
                textAnchor="end"
                fill={P.muted}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={16}
                letterSpacing={1.4}
              >
                LEFT WING &amp; CFT (11x AAM)
              </text>

              {/* Mấu trung tâm Station 5 (trống dành cho vũ khí ngoại cỡ) */}
              <rect
                x={-18}
                y={-18}
                width={36}
                height={70}
                rx={5}
                fill={P.bgDeep}
                stroke={bellySpot > 0.05 ? P.amberHot : P.grid}
                strokeWidth={1.8}
                strokeDasharray="4 3"
              />
              <text x={0} y={22} textAnchor="middle" fill={P.muted} fontFamily={FONT} fontWeight={700} fontSize={12}>
                STA 5
              </text>

              {/* 22 ô chấm tên lửa sáng đối xứng hai bên */}
              {MISSILE_SLOTS.map((m, idx) => {
                const isLeftGroup = idx < 11;
                const localIdx = isLeftGroup ? 10 - idx : idx - 11; // 0 gần tâm -> 10 ngoài đầu cánh
                const cellX = isLeftGroup ? -52 - localIdx * 45 : 52 + localIdx * 45;
                const normDist = localIdx / 10;
                const isAmberSlot = m.tier === 'amber';
                const active = !isAmberSlot || (beast22Mode && amberFill >= normDist * 0.9);
                const cellColor = !active ? '#152844' : isAmberSlot && beast22Mode ? P.amber : P.cyan;

                return (
                  <g key={`cell_${m.id}`} transform={`translate(${cellX} 16)`}>
                    <rect
                      x={-17}
                      y={-34}
                      width={34}
                      height={70}
                      rx={6}
                      fill={active ? 'rgba(20, 44, 76, 0.95)' : P.bgDeep}
                      stroke={active ? cellColor : P.grid}
                      strokeWidth={active ? 2.2 : 1.2}
                    />
                    {/* Hình dáng tên lửa thu nhỏ thẳng đứng trong ô */}
                    <path
                      d="M0,-24 L4,-14 L4,18 L8,24 L-8,24 L-4,18 L-4,-14 Z"
                      fill={active ? (isAmberSlot && beast22Mode ? P.amberHot : P.ordWhite) : '#243c5e'}
                    />
                    {active && (
                      <circle
                        cx={0}
                        cy={-24}
                        r={3}
                        fill={cellColor}
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* Ô PHÓNG ĐẠI TRÒN (INSET CUTAWAY): PHÁO XOAY 6 NÒNG 20MM M61A1 VULCAN (338.35 - 347.8s) */}
            {vulcanScale > 0.01 && (
              <g opacity={Math.min(1, vulcanScale * 1.3)}>
                {/* Hai đường gióng phóng đại nối từ gốc cánh phải F-15EX lên ô tròn */}
                <polygon
                  points={`${gunWorldX},${gunWorldY} ${insetCx + 95},${insetCy + 112} ${insetCx + 138},${insetCy + 42}`}
                  fill={P.amber}
                  opacity={0.12}
                />
                <line
                  x1={gunWorldX}
                  y1={gunWorldY}
                  x2={insetCx + 96}
                  y2={insetCy + 112}
                  stroke={P.amber}
                  strokeWidth={2.2}
                  strokeDasharray="7 5"
                />
                <line
                  x1={gunWorldX}
                  y1={gunWorldY}
                  x2={insetCx + 138}
                  y2={insetCy + 42}
                  stroke={P.amber}
                  strokeWidth={2.2}
                  strokeDasharray="7 5"
                />
                <circle cx={gunWorldX} cy={gunWorldY} r={18} fill="none" stroke={P.amberHot} strokeWidth={2.6} />

                <g
                  transform={`translate(${insetCx} ${insetCy}) scale(${vulcanScale}) translate(${-insetCx} ${-insetCy})`}
                >
                  {/* Nền tròn mặt cắt kỹ thuật */}
                  <circle cx={insetCx} cy={insetCy} r={insetR + 8} fill={P.ink} opacity={0.45} />
                  <circle
                    cx={insetCx}
                    cy={insetCy}
                    r={insetR}
                    fill="#0b192e"
                    stroke={isFiring ? P.amberHot : P.amber}
                    strokeWidth={4}
                  />

                  <g clipPath="url(#s13_vulcanClip)">
                    {/* Lưới tọa độ mịn trong ô phóng đại */}
                    {[-90, -45, 0, 45, 90].map((d) => (
                      <g key={d}>
                        <line
                          x1={insetCx - 150}
                          y1={insetCy + d}
                          x2={insetCx + 150}
                          y2={insetCy + d}
                          stroke={P.grid}
                          strokeWidth={0.9}
                          opacity={0.35}
                        />
                        <line
                          x1={insetCx + d}
                          y1={insetCy - 150}
                          x2={insetCx + d}
                          y2={insetCy + 150}
                          stroke={P.grid}
                          strokeWidth={0.9}
                          opacity={0.35}
                        />
                      </g>
                    ))}

                    {/* Băng tải nạp 500 viên đạn đồng 20mm dưới bầu pháo */}
                    <path
                      d={`M${insetCx - 125},${insetCy + 95} Q${insetCx - 65},${insetCy + 42} ${insetCx - 36},${insetCy + 20}`}
                      fill="none"
                      stroke="#2a3a50"
                      strokeWidth={30}
                    />
                    {Array.from({ length: 8 }, (_, k) => {
                      const shift = isFiring ? ((t * 18) % 1) : 0;
                      const u = (k + shift) / 8;
                      const rx = lerp(insetCx - 118, insetCx - 42, u);
                      const ry = lerp(insetCy + 88, insetCy + 24, u);
                      return (
                        <g key={k} transform={`translate(${rx} ${ry}) rotate(-38)`}>
                          <rect x={-4} y={-11} width={8} height={16} rx={1.5} fill={P.amber} stroke={P.ink} strokeWidth={1.1} />
                          <polygon points="-3.5,-11 3.5,-11 0,-18" fill={P.ordWhite} stroke={P.ink} strokeWidth={1} />
                        </g>
                      );
                    })}

                    {/* Bầu khóa nòng (breech housing) phóng lớn rõ nét */}
                    <rect
                      x={insetCx - 126}
                      y={insetCy - 44}
                      width={82}
                      height={88}
                      rx={10}
                      fill="#314359"
                      stroke={P.ink}
                      strokeWidth={2.4}
                    />
                    <rect
                      x={insetCx - 110}
                      y={insetCy - 30}
                      width={52}
                      height={60}
                      rx={6}
                      fill="#4c6480"
                      stroke={P.ink}
                      strokeWidth={1.6}
                    />

                    {/* Cụm 6 nòng xoay Gatling 20mm M61A1 (sắp theo độ sâu Z để quay 3D thật) */}
                    {Array.from({ length: 6 }, (_, bIdx) => {
                      const rad = ((barrelSpinDeg + bIdx * 60) * Math.PI) / 180;
                      return {
                        bIdx,
                        dy: Math.sin(rad) * 25,
                        dz: Math.cos(rad),
                      };
                    })
                      .sort((a, b) => a.dz - b.dz)
                      .map(({ bIdx, dy, dz }) => {
                        const shade = dz > 0.25 ? '#cad9ea' : dz > -0.25 ? '#859bb5' : '#46586e';
                        return (
                          <g key={bIdx}>
                            <rect
                              x={insetCx - 44}
                              y={insetCy + dy - 4.8}
                              width={136}
                              height={9.6}
                              rx={3.5}
                              fill={shade}
                              stroke={P.ink}
                              strokeWidth={1.6}
                            />
                            {/* Đầu chụp nòng */}
                            <rect
                              x={insetCx + 83}
                              y={insetCy + dy - 5.6}
                              width={11}
                              height={11.2}
                              rx={2}
                              fill="#26313f"
                              stroke={P.ink}
                              strokeWidth={1.3}
                            />
                          </g>
                        );
                      })}

                    {/* Hai vòng kẹp giữ cụm 6 nòng xoay */}
                    {[-6, 48].map((cxOff, ci) => (
                      <rect
                        key={ci}
                        x={insetCx + cxOff}
                        y={insetCy - 32}
                        width={14}
                        height={64}
                        rx={4}
                        fill={P.f15Mid}
                        stroke={P.ink}
                        strokeWidth={2}
                      />
                    ))}

                    {/* Chớp lửa liên thanh & vệt đạn vạch đường khi khai hỏa tại 341.00s */}
                    {burstTimes.map((bt, idx) => (
                      <Muzzle2D
                        key={`inset_muz_${idx}`}
                        t={t}
                        at={bt}
                        x={insetCx + 95}
                        y={insetCy - 14}
                        angle={0}
                        size={36}
                        seed={80 + idx}
                      />
                    ))}
                    {isFiring && (
                      <g>
                        <line
                          x1={insetCx + 96}
                          y1={insetCy - 14}
                          x2={insetCx + 150}
                          y2={insetCy - 14}
                          stroke={P.amberHot}
                          strokeWidth={5.5}
                        />
                        <line
                          x1={insetCx + 96}
                          y1={insetCy - 14}
                          x2={insetCx + 150}
                          y2={insetCy - 14}
                          stroke={P.flame}
                          strokeWidth={14}
                          opacity={0.38}
                        />
                      </g>
                    )}
                  </g>

                  {/* Viền vạch chia độ kỹ thuật quanh ô tròn */}
                  <circle
                    cx={insetCx}
                    cy={insetCy}
                    r={insetR - 6}
                    fill="none"
                    stroke={P.cyan}
                    strokeWidth={1.4}
                    strokeDasharray="10 8"
                    opacity={0.55}
                  />

                  {/* Bảng định danh gắn ngoài clipPath dưới đáy vòng tròn để chữ không bị cắt viền */}
                  <g transform={`translate(${insetCx} ${insetCy + insetR + 6})`}>
                    <rect
                      x={-138}
                      y={-22}
                      width={276}
                      height={50}
                      rx={10}
                      fill={P.bgDeep}
                      stroke={isFiring ? P.amberHot : P.amber}
                      strokeWidth={2.4}
                    />
                    <text
                      x={0}
                      y={-1}
                      textAnchor="middle"
                      fill={P.amberHot}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={16}
                      letterSpacing={1.2}
                    >
                      M61A1 VULCAN · 20MM
                    </text>
                    <text
                      x={0}
                      y={19}
                      textAnchor="middle"
                      fill={P.cyanSoft}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={13.5}
                      letterSpacing={0.8}
                    >
                      6-BARREL · 500 ROUNDS
                    </text>
                  </g>
                </g>
              </g>
            )}
          </g>

          {/* ===================================================================== */}
          {/* KHU PHẢI: F-35A NHÀ TÙ HÌNH HỌC KHOANG 12 FT & PHÁ VỠ TÀNG HÌNH        */}
          {/* ===================================================================== */}
          <g>
            {/* Tiêu đề kỹ thuật Khu Phải */}
            <g transform={`translate(${F35_X} 92)`}>
              <rect
                x={-330}
                y={-26}
                width={660}
                height={46}
                rx={8}
                fill={P.bgPanel}
                stroke={hasExternalStores ? P.red : P.gridBright}
                strokeWidth={1.8}
                opacity={0.94}
              />
              <text
                x={0}
                y={4}
                textAnchor="middle"
                fill={hasExternalStores ? P.red : P.text}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={21}
                letterSpacing={2}
              >
                {hasExternalStores
                  ? 'F-35A EXTERNAL PYLONS · STEALTH COMPROMISED'
                  : 'F-35A UNDERSIDE · INTERNAL WEAPON BAY'}
              </text>
            </g>

            {/* Lớp vỏ tàng hình hình thoi nguyên vẹn trước khi treo đạn ngoài cánh */}
            {!hasExternalStores && (
              <g opacity={0.75}>
                <polygon
                  points={`${F35_X + 540},${F35_Y} ${F35_X - 40},${F35_Y - 380} ${F35_X - 540},${F35_Y} ${F35_X - 40},${F35_Y + 380}`}
                  fill="rgba(44, 230, 255, 0.04)"
                  stroke={P.cyan}
                  strokeWidth={2.2}
                  strokeDasharray="14 10"
                />
                {/* Sóng radar trượt lệch êm khỏi biên dạng tàng hình */}
                {[-1, 1].map((s) => (
                  <path
                    key={s}
                    d={`M${F35_X + 680},${F35_Y + s * 95} L${F35_X + 410},${F35_Y + s * 95} L${F35_X + 80},${F35_Y + s * 335}`}
                    fill="none"
                    stroke={P.cyanSoft}
                    strokeWidth={2}
                    strokeDasharray="8 6"
                    opacity={0.55}
                  />
                ))}
              </g>
            )}

            {/* Mảnh vỡ lớp vỏ tàng hình cyan bắn tung ra khi treo đạn ngoại cỡ lúc 360.2s */}
            {hasExternalStores && breakWave < 0.98 && (
              <g opacity={1 - breakWave}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                  const a = (i / 8) * Math.PI * 2 + 0.35;
                  const dist = 340 + breakWave * 240;
                  const sx = F35_X + Math.cos(a) * dist;
                  const sy = F35_Y + Math.sin(a) * dist * 0.72;
                  return (
                    <polygon
                      key={i}
                      points="-24,-10 26,-4 8,16"
                      fill={P.cyan}
                      opacity={0.65}
                      transform={`translate(${sx} ${sy}) rotate(${i * 45 + breakWave * 110})`}
                    />
                  );
                })}
              </g>
            )}

            {/* CÁC VÒNG RĂNG CƯA PHẢN XẠ RADAR ĐỎ BÙNG NỔ QUANH F-35 (nét kép halo mờ + lõi sáng, KHÔNG dùng filter glow) */}
            {hasExternalStores && (
              <g>
                {[0, 1, 2].map((ringIdx) => {
                  const cycle = ((t - 360.2) * 0.95 + ringIdx * 0.33) % 1;
                  const rx = lerp(240, 620, cycle);
                  const ry = lerp(180, 445, cycle);
                  const alpha = (1 - cycle) * 0.92;
                  const dPath = buildJaggedRing(F35_X - 25, F35_Y, rx, ry, 24, 0.085, ringIdx * 0.4 + t * 0.7);
                  return (
                    <g key={`rcs_ring_${ringIdx}`} opacity={alpha}>
                      <path d={dPath} fill="none" stroke={P.red} strokeWidth={14} opacity={0.22} strokeLinejoin="round" />
                      <path d={dPath} fill="none" stroke={P.red} strokeWidth={3.2} strokeLinejoin="round" />
                    </g>
                  );
                })}
                {breakFlash > 0.01 && (
                  <circle cx={F35_X - 20} cy={F35_Y} r={460} fill={P.red} opacity={breakFlash * 0.16} />
                )}
              </g>
            )}

            {/* Hình chiếu bụng F-35A tỉ lệ lớn */}
            <g filter="url(#sh)">
              <F35Top2D
                x={F35_X}
                y={F35_Y}
                scale={F35_S}
                underside
                bayOpen={bayOpen}
                externalStores={hasExternalStores}
              />
            </g>

            {/* Điểm nhấn đỏ trên 4 mấu treo ngoài cánh F-35A khi externalStores bật */}
            {hasExternalStores && (
              <g opacity={Math.min(1, extSlam)}>
                {[-112, -68, 68, 112].map((ly, idx) => {
                  const lx = Math.abs(ly) > 90 ? -36 : -18;
                  const wx = F35_X + lx * F35_S;
                  const wy = F35_Y + ly * F35_S;
                  const rSpot = Math.abs(ly) < 90 ? 54 : 36;
                  return (
                    <g key={`ext_spot_${idx}`} transform={`translate(${wx} ${wy})`}>
                      <circle cx={0} cy={0} r={rSpot} fill={P.red} opacity={0.22} />
                      <circle cx={0} cy={0} r={rSpot * 0.78} fill="none" stroke={P.red} strokeWidth={2.8} strokeDasharray="8 5" />
                    </g>
                  );
                })}
              </g>
            )}

            {/* NHÀ TÙ HÌNH HỌC KHOANG 12 FT (GEOMETRIC PRISON BOX) QUANH KHOANG BỤNG F-35A */}
            {prisonAppear > 0.01 && (
              <g opacity={prisonAppear}>
                {/* Hào quang nét kép bao quanh khoang 12 ft */}
                <rect
                  x={bayX0 - 8}
                  y={bayY0 - 8}
                  width={bayX1 - bayX0 + 16}
                  height={bayY1 - bayY0 + 16}
                  rx={6}
                  fill="rgba(255, 59, 78, 0.10)"
                  stroke={P.red}
                  strokeWidth={10}
                  opacity={0.24}
                />
                <rect
                  x={bayX0 - 8}
                  y={bayY0 - 8}
                  width={bayX1 - bayX0 + 16}
                  height={bayY1 - bayY0 + 16}
                  rx={6}
                  fill="none"
                  stroke={P.red}
                  strokeWidth={3.2}
                />

                {/* Các thanh song sắt laser của "nhà tù hình học" */}
                {[0.2, 0.4, 0.6, 0.8].map((u, idx) => {
                  const bx = lerp(bayX0 - 4, bayX1 + 4, u);
                  return (
                    <line
                      key={idx}
                      x1={bx}
                      y1={bayY0 - 8}
                      x2={bx}
                      y2={bayY1 + 8}
                      stroke={P.red}
                      strokeWidth={1.8}
                      strokeDasharray="6 5"
                      opacity={0.65}
                    />
                  );
                })}

                {/* 4 ngoàm khóa góc cyan sắc lẹm */}
                {[
                  [bayX0 - 14, bayY0 - 14, 1, 1],
                  [bayX1 + 14, bayY0 - 14, -1, 1],
                  [bayX0 - 14, bayY1 + 14, 1, -1],
                  [bayX1 + 14, bayY1 + 14, -1, -1],
                ].map(([cx, cy, sx, sy], idx) => (
                  <path
                    key={idx}
                    d={`M${cx},${cy + sy * 22} L${cx},${cy} L${cx + sx * 22},${cy}`}
                    fill="none"
                    stroke={P.cyan}
                    strokeWidth={3.6}
                  />
                ))}

                {/* Thước đo kích thước khắt khe "12 FT" gióng từ khoang bụng xuống bảng số liệu */}
                {dim12Appear > 0.01 && (
                  <g opacity={dim12Appear}>
                    <line x1={bayX0 - 8} y1={bayY1 + 12} x2={bayX0 - 8} y2={785} stroke={P.cyan} strokeWidth={1.8} strokeDasharray="6 4" />
                    <line x1={bayX1 + 8} y1={bayY1 + 12} x2={bayX1 + 8} y2={785} stroke={P.cyan} strokeWidth={1.8} strokeDasharray="6 4" />

                    {/* Đường mũi tên hai đầu chuẩn bản vẽ cơ khí */}
                    <line x1={bayX0 - 4} y1={772} x2={bayX1 + 4} y2={772} stroke={P.amberHot} strokeWidth={3} />
                    <polygon points={`${bayX0 - 6},772 ${bayX0 + 10},765 ${bayX0 + 10},779`} fill={P.amberHot} />
                    <polygon points={`${bayX1 + 6},772 ${bayX1 - 10},765 ${bayX1 - 10},779`} fill={P.amberHot} />

                    <rect
                      x={(bayX0 + bayX1) / 2 - 145}
                      y={792}
                      width={290}
                      height={54}
                      rx={9}
                      fill={P.bgPanel}
                      stroke={hasExternalStores ? P.red : P.cyan}
                      strokeWidth={2.2}
                    />
                    <text
                      x={(bayX0 + bayX1) / 2}
                      y={816}
                      textAnchor="middle"
                      fill={P.amberHot}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={20}
                      letterSpacing={1.4}
                    >
                      12 FT (3.66 M) MAX
                    </text>
                    <text
                      x={(bayX0 + bayX1) / 2}
                      y={837}
                      textAnchor="middle"
                      fill={hasExternalStores ? P.red : P.cyanSoft}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={13}
                      letterSpacing={1.2}
                    >
                      {hasExternalStores ? 'RCS SPIKE: STEALTH LOST' : 'GEOMETRIC STEALTH PRISON'}
                    </text>
                  </g>
                )}
              </g>
            )}
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* TỐI ĐA 1 <Label> TRÊN MÀN HÌNH, ĐẶT TUẦN TỰ */}
      <Label
        t={t}
        text="22 MISSILES"
        x={960}
        y={962}
        from={335.8}
        until={338.0}
        size={54}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="12 FT BAY LIMIT"
        x={960}
        y={962}
        from={358.0}
        until={360.8}
        size={54}
        bg={P.red}
        fg="#ffffff"
      />
    </div>
  );
};

export default S13;
