import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, FONT, lerp, prog } from '@kit/theme';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Puff2D } from '@lib/2d/fx';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Side2D } from '../local/jets2d';

// 6 vị trí tâm vít chuẩn CAD (cyan) dọc vành cung kính chắn gió trước trong kính lúp (cx=1495, cy=336)
const ARCH_FASTENERS: {
  cx: number;
  cy: number;
  dx: number;
  dy: number;
}[] = [
  { cx: -124, cy: 84, dx: 15, dy: -12 },
  { cx: -84, cy: 40, dx: 17, dy: -11 },
  { cx: -38, cy: 0, dx: 18, dy: -13 },
  { cx: 14, cy: -34, dx: 16, dy: -14 },
  { cx: 70, cy: -62, dx: 19, dy: -11 },
  { cx: 128, cy: -82, dx: 15, dy: -13 },
];

const LOT_BAYS = [
  { id: '1B-01', x: 88, y: 122 },
  { id: '1B-02', x: 610, y: 122 },
  { id: '1B-03', x: 88, y: 348 },
  { id: '1B-04', x: 610, y: 348 },
] as const;

const S25: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Chuyển động Cam2D: nửa đầu tập trung cụm 4 mũi Lot 1B + kính lúp khoan lệch (không cắt mép trái), nửa sau mở toàn cảnh dây chuyền & đình công 2025
  const panDown = prog(t, 729.0, 731.1);
  const camX = 960;
  const camY = lerp(472, 540, panDown);
  const camZoom = lerp(1.045, 1.0, panDown);

  const hh = handheld(t, 2.0, 's25_cam');
  const drillBuzz = bump(t, CUE.s25_misdrill - 0.5, 1.8) * Math.sin(t * 58) * 2.4;
  const strikeSlam = bump(t, CUE.s25_strikeDelay, 0.45);
  const shake: [number, number] = [
    hh[0] + drillBuzz + Math.sin(t * 46) * strikeSlam * 11,
    hh[1] + Math.cos(t * 52) * strikeSlam * 14,
  ];

  // Tiến độ các sự kiện chính (khung đầu đã hiện rõ đầy đủ 4 mũi Lot 1B & kính lúp chuẩn CAD)
  const introIn = 1;
  const loupeIn = lerp(0.92, 1, prog(t, 722.45, 723.0));
  const jigClamp = prog(t, 723.5, 724.9);
  const lowerActive = prog(t, 729.2, 730.5);
  const bottleneckPinch = prog(t, 730.1, 731.3);
  const strikeDrop = prog(t, CUE.s25_strikeDelay - 0.55, CUE.s25_strikeDelay);

  // Thanh lịch giao hàng trượt lùi 2 nhịp: nghẽn linh kiện -> đình công cuối 2025
  const slip1 = prog(t, 730.6, 732.1);
  const slip2 = prog(t, CUE.s25_strikeDelay + 0.08, 735.3);
  const deliveryX = 1248 + slip1 * 156 + slip2 * 294;

  // Đầu mũi khoan di chuyển dọc 6 lỗ trên dưỡng khoan lỗi
  const drillSweep = prog(t, 724.8, 727.1);
  const drillIdx = Math.min(5, Math.floor(drillSweep * 6));
  const curHole = ARCH_FASTENERS[drillIdx];
  const drillPosX = curHole.cx + curHole.dx;
  const drillPosY = curHole.cy + curHole.dy;

  const LOUPE_X = 1495;
  const LOUPE_Y = 338;
  const LOUPE_R = 208;

  return (
    <AbsoluteFill style={{ background: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <Layer>
          <Defs2D shadow="rgba(4, 10, 22, 0.55)" />

          {/* Nền bản vẽ kiểm toán kỹ thuật GAO */}
          <BlueprintGrid x0={-320} y0={-220} w={2560} h={1520} step={80} id="s25_bp" />

          {/* Khung viền bản vẽ kỹ thuật & vạch chia thước kỹ thuật */}
          <g opacity={0.55}>
            <rect
              x={52}
              y={46}
              width={1816}
              height={988}
              rx={10}
              fill="none"
              stroke={P.gridBright}
              strokeWidth={1.8}
            />
            <rect
              x={62}
              y={56}
              width={1796}
              height={968}
              rx={7}
              fill="none"
              stroke={P.grid}
              strokeWidth={1}
              strokeDasharray="10 6"
            />
            {Array.from({ length: 35 }, (_, i) => {
              const tx = 100 + i * 50;
              const major = i % 5 === 0;
              return (
                <line
                  key={`tk_${i}`}
                  x1={tx}
                  y1={46}
                  x2={tx}
                  y2={major ? 62 : 55}
                  stroke={P.gridBright}
                  strokeWidth={major ? 1.6 : 1}
                />
              );
            })}
            {/* Đường phân tách tầng trên (Lot 1B Windscreen Audit) và tầng dưới (Dây chuyền & Đình công 2025) */}
            <line x1={74} y1={590} x2={1846} y2={590} stroke={P.gridBright} strokeWidth={1.8} opacity={0.75} />
            <line
              x1={74}
              y1={596}
              x2={1846}
              y2={596}
              stroke={P.grid}
              strokeWidth={1}
              strokeDasharray="6 6"
              opacity={0.55}
            />
          </g>

          {/* ==================== NỬA TRÊN: 4 KHUNG MŨI LOT 1B & KÍNH LÚP KHOAN LỆCH KÍNH CHẮN GIÓ ==================== */}
          <g opacity={introIn}>
            {LOT_BAYS.map((bay, idx) => {
              const flagAt = CUE.s25_misdrill - 0.45 + idx * 0.36;
              const flagP = prog(t, flagAt, flagAt + 0.35);
              const flagged = flagP > 0.05;
              const pulse = 0.5 + 0.5 * Math.sin(t * 7 + idx * 1.4);

              // Trong bay (w=502, h=208), đặt F15Side2D tại (bay.x + 205, bay.y + 138) scale=1.18
              // Gọng kính chắn gió trước của F15Side2D nằm ở local (128..146, -22..-10) -> world:
              const archWx = bay.x + 205 + 136 * 1.18;
              const archWy = bay.y + 138 - 17 * 1.18;
              const clipId = `s25_bay_${idx}`;

              return (
                <g key={bay.id}>
                  <defs>
                    <clipPath id={clipId}>
                      <rect x={bay.x + 4} y={bay.y + 4} width={494} height={200} rx={8} />
                    </clipPath>
                  </defs>

                  {/* Hộp khung kiểm toán từng chiếc Lot 1B */}
                  <rect
                    x={bay.x}
                    y={bay.y}
                    width={502}
                    height={208}
                    rx={10}
                    fill="#0b1a30"
                    fillOpacity={0.92}
                    stroke={flagged ? P.red : P.gridBright}
                    strokeWidth={flagged ? 2.6 : 1.8}
                    filter="url(#sh)"
                  />

                  {/* Lưới vi mô bên trong ô */}
                  <g clipPath={`url(#${clipId})`}>
                    {Array.from({ length: 11 }, (_, gx) => (
                      <line
                        key={gx}
                        x1={bay.x + gx * 48}
                        y1={bay.y}
                        x2={bay.x + gx * 48}
                        y2={bay.y + 208}
                        stroke={P.grid}
                        strokeWidth={0.7}
                        opacity={0.28}
                      />
                    ))}
                    <line
                      x1={bay.x}
                      y1={bay.y + 138}
                      x2={bay.x + 502}
                      y2={bay.y + 138}
                      stroke={P.gridBright}
                      strokeWidth={0.9}
                      strokeDasharray="5 5"
                      opacity={0.4}
                    />

                    {/* Khung mũi & buồng lái F-15EX Lot 1B tỉ lệ lớn */}
                    <F15Side2D x={bay.x + 205} y={bay.y + 138} scale={1.18} backSeatEmpty />

                    {/* Vệt quét kiểm toán GAO dọc mũi máy bay */}
                    {t >= 723.0 + idx * 0.25 && t <= flagAt + 0.6 && (
                      <line
                        x1={lerp(bay.x + 470, bay.x + 120, prog(t, 723.0 + idx * 0.25, flagAt + 0.4))}
                        y1={bay.y + 10}
                        x2={lerp(bay.x + 470, bay.x + 120, prog(t, 723.0 + idx * 0.25, flagAt + 0.4))}
                        y2={bay.y + 198}
                        stroke={P.cyan}
                        strokeWidth={2}
                        opacity={0.65}
                      />
                    )}

                    {/* Điểm soi vành cung bắt vít kính chắn gió trước */}
                    <circle
                      cx={archWx}
                      cy={archWy}
                      r={19 + pulse * 3}
                      fill={flagged ? P.red : P.cyan}
                      fillOpacity={0.14}
                      stroke={flagged ? P.red : P.cyan}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                    />
                    <line x1={archWx - 11} y1={archWy} x2={archWx + 11} y2={archWy} stroke={P.cyan} strokeWidth={1.3} />
                    <line x1={archWx} y1={archWy - 11} x2={archWx} y2={archWy + 11} stroke={P.cyan} strokeWidth={1.3} />

                    {/* 3 chấm lỗ khoan lệch đỏ trên gọng kính chắn gió khi bị phát hiện */}
                    {flagged && (
                      <g opacity={flagP}>
                        <circle cx={archWx - 5} cy={archWy + 3} r={3.2} fill={P.red} stroke="#ffffff" strokeWidth={0.9} />
                        <circle cx={archWx + 2} cy={archWy - 3} r={3.2} fill={P.red} stroke="#ffffff" strokeWidth={0.9} />
                        <circle cx={archWx + 9} cy={archWy - 8} r={3.2} fill={P.red} stroke="#ffffff" strokeWidth={0.9} />
                      </g>
                    )}
                  </g>

                  {/* Thẻ mã số khung thân Lot 1B ở góc trên-trái */}
                  <rect
                    x={bay.x + 12}
                    y={bay.y + 12}
                    width={72}
                    height={26}
                    rx={5}
                    fill={flagged ? P.redDark : P.bgCard}
                    stroke={flagged ? P.red : P.gridBright}
                    strokeWidth={1.4}
                  />
                  <text
                    x={bay.x + 48}
                    y={bay.y + 30}
                    textAnchor="middle"
                    fill={P.text}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={15}
                  >
                    {bay.id}
                  </text>

                  {/* Huy hiệu tam giác cảnh báo lỗi khoan GAO */}
                  {flagged && (
                    <g
                      transform={`translate(${bay.x + 466} ${bay.y + 30}) scale(${0.7 + 0.3 * flagP})`}
                      opacity={flagP}
                    >
                      <polygon
                        points="0,-16 16,13 -16,13"
                        fill={P.red}
                        stroke="#ffffff"
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                      />
                      <rect x={-1.8} y={-7} width={3.6} height={10} rx={1.5} fill="#ffffff" />
                      <circle cx={0} cy={7.5} r={2.1} fill="#ffffff" />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Đường gióng phóng đại nối từ vành kính chắn gió Lot 1B sang Kính lúp kiểm toán (vẽ nét kép, không dùng filter glow) */}
            {loupeIn > 0.02 && (
              <g opacity={loupeIn}>
                <path
                  d={`M ${610 + 205 + 136 * 1.18 + 18} ${122 + 138 - 17 * 1.18 - 6} L ${LOUPE_X - 150} ${LOUPE_Y - 146}`}
                  stroke={P.cyan}
                  strokeWidth={6}
                  opacity={0.16}
                  fill="none"
                />
                <path
                  d={`M ${610 + 205 + 136 * 1.18 + 18} ${122 + 138 - 17 * 1.18 - 6} L ${LOUPE_X - 150} ${LOUPE_Y - 146}`}
                  stroke={P.cyan}
                  strokeWidth={1.9}
                  fill="none"
                  {...drawOn(430, loupeIn)}
                />
                <path
                  d={`M ${610 + 205 + 136 * 1.18 + 18} ${348 + 138 - 17 * 1.18 + 6} L ${LOUPE_X - 150} ${LOUPE_Y + 146}`}
                  stroke={P.cyan}
                  strokeWidth={6}
                  opacity={0.16}
                  fill="none"
                />
                <path
                  d={`M ${610 + 205 + 136 * 1.18 + 18} ${348 + 138 - 17 * 1.18 + 6} L ${LOUPE_X - 150} ${LOUPE_Y + 146}`}
                  stroke={P.cyan}
                  strokeWidth={1.9}
                  fill="none"
                  {...drawOn(430, loupeIn)}
                />
              </g>
            )}

            {/* ==================== KÍNH LÚP PHÓNG ĐẠI VÀNH CUNG BẮT VÍT KÍNH CHẮN GIÓ ==================== */}
            <g
              transform={`translate(${LOUPE_X} ${LOUPE_Y}) scale(${0.86 + 0.14 * loupeIn})`}
              opacity={loupeIn}
              filter="url(#sh)"
            >
              <defs>
                <clipPath id="s25_loupe_clip">
                  <circle cx={0} cy={0} r={LOUPE_R} />
                </clipPath>
              </defs>

              {/* Tay cầm kính lúp kỹ thuật */}
              <g transform="rotate(42)">
                <rect x={LOUPE_R - 4} y={-16} width={118} height={32} rx={8} fill="#253549" stroke={P.ink} strokeWidth={2.4} />
                <rect x={LOUPE_R + 12} y={-9} width={86} height={8} rx={3} fill="#506c8a" />
                <line x1={LOUPE_R + 22} y1={-15} x2={LOUPE_R + 22} y2={15} stroke={P.amber} strokeWidth={3} />
              </g>

              {/* Lòng kính lúp phóng đại */}
              <g clipPath="url(#s25_loupe_clip)">
                <circle cx={0} cy={0} r={LOUPE_R} fill="#061222" />

                {/* Lưới milimet kính hiển vi đo kiểm */}
                {Array.from({ length: 19 }, (_, k) => {
                  const off = -198 + k * 22;
                  const major = k % 3 === 0;
                  return (
                    <g key={k}>
                      <line
                        x1={off}
                        y1={-LOUPE_R}
                        x2={off}
                        y2={LOUPE_R}
                        stroke={P.gridBright}
                        strokeWidth={major ? 1.1 : 0.6}
                        opacity={major ? 0.34 : 0.16}
                      />
                      <line
                        x1={-LOUPE_R}
                        y1={off}
                        x2={LOUPE_R}
                        y2={off}
                        stroke={P.gridBright}
                        strokeWidth={major ? 1.1 : 0.6}
                        opacity={major ? 0.34 : 0.16}
                      />
                    </g>
                  );
                })}

                {/* Mảng kính chắn gió polycarbonate phía trên vành cung */}
                <path
                  d="M -185,115 Q -35,-42 195,-112 L 210,-215 L -215,-215 Z"
                  fill={P.f15Canopy}
                  fillOpacity={0.26}
                />
                <path
                  d="M -140,20 Q -15,-78 155,-135"
                  stroke="#ffffff"
                  strokeWidth={6}
                  strokeLinecap="round"
                  opacity={0.18}
                  fill="none"
                />

                {/* Tấm tôn mũi buồng lái phía dưới vành cung */}
                <path
                  d="M -185,155 Q -25,-2 205,-72 L 215,215 L -215,215 Z"
                  fill="#1f3550"
                  stroke={P.ink}
                  strokeWidth={2}
                />

                {/* Vành cung khung hợp kim Titan bắt vít kính chắn gió trước (3 tông khối kim loại) */}
                <path
                  d="M -178,128 Q -28,-28 188,-102"
                  stroke={P.ink}
                  strokeWidth={66}
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M -178,128 Q -28,-28 188,-102"
                  stroke={P.f15Dark}
                  strokeWidth={60}
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M -178,128 Q -28,-28 188,-102"
                  stroke={P.f15Mid}
                  strokeWidth={46}
                  strokeLinecap="round"
                  fill="none"
                />
                <path
                  d="M -180,120 Q -30,-36 186,-110"
                  stroke={P.f15Light}
                  strokeWidth={11}
                  strokeLinecap="round"
                  opacity={0.78}
                  fill="none"
                />

                {/* 6 Tâm thước ngắm chuẩn CAD màu Cyan */}
                {ARCH_FASTENERS.map((h, i) => (
                  <g key={`cad_${i}`} transform={`translate(${h.cx} ${h.cy})`}>
                    <circle cx={0} cy={0} r={14} fill="none" stroke={P.cyan} strokeWidth={1.3} strokeDasharray="4 3" opacity={0.85} />
                    <circle cx={0} cy={0} r={6.5} fill="#081b2e" stroke={P.cyan} strokeWidth={2} />
                    <line x1={-18} y1={0} x2={18} y2={0} stroke={P.cyan} strokeWidth={1.3} />
                    <line x1={0} y1={-18} x2={0} y2={18} stroke={P.cyan} strokeWidth={1.3} />
                  </g>
                ))}

                {/* Đồ gá dưỡng khoan lỗi (Faulty Tooling Jig) bị kẹp vênh góc 6.5° */}
                {jigClamp > 0.01 && (
                  <g
                    transform={`translate(${lerp(-24, 16, jigClamp)} ${lerp(-38, -12, jigClamp)}) rotate(5.8)`}
                    opacity={0.92 * jigClamp}
                  >
                    <path
                      d="M -162,118 Q -22,-24 174,-92"
                      stroke="#2a333f"
                      strokeWidth={30}
                      strokeLinecap="round"
                      fill="none"
                      opacity={0.78}
                    />
                    <path
                      d="M -162,118 Q -22,-24 174,-92"
                      stroke={P.amber}
                      strokeWidth={2.2}
                      strokeDasharray="10 8"
                      fill="none"
                    />
                    {/* Chốt định vị dưỡng khoan bị cong/lệch (nguyên nhân lệch toàn bộ dãy lỗ) */}
                    <g transform="translate(-148 106)">
                      <rect x={-12} y={-22} width={24} height={22} rx={3} fill="#3d4959" stroke={P.amber} strokeWidth={2} />
                      <line x1={0} y1={0} x2={9} y2={16} stroke={P.red} strokeWidth={4.5} strokeLinecap="round" />
                      <circle cx={6} cy={9} r={15} fill="none" stroke={P.amber} strokeWidth={1.8} strokeDasharray="3 3" />
                    </g>
                  </g>
                )}

                {/* 6 Lỗ khoan thực tế màu ĐỎ bị đóng lệch hẳn khỏi tâm thước ngắm Cyan */}
                {ARCH_FASTENERS.map((h, i) => {
                  const holeAt = 725.05 + i * 0.31;
                  const hp = prog(t, holeAt, holeAt + 0.22);
                  if (hp <= 0.01) return null;
                  const rx = h.cx + h.dx;
                  const ry = h.cy + h.dy;
                  return (
                    <g key={`mis_${i}`} opacity={hp}>
                      {/* Mũi tên vector báo độ lệch tâm (Cyan -> Red) */}
                      <line x1={h.cx} y1={h.cy} x2={rx} y2={ry} stroke={P.amberHot} strokeWidth={2.2} />
                      {/* Vết nứt ứng suất do khoan sát mép gờ khung kính */}
                      <path
                        d={`M ${rx + 5} ${ry - 5} L ${rx + 12} ${ry - 13} M ${rx - 6} ${ry - 4} L ${rx - 13} ${ry - 10}`}
                        stroke={P.red}
                        strokeWidth={1.8}
                      />
                      {/* Lỗ khoan lỗi đỏ rực */}
                      <circle cx={rx} cy={ry} r={11 * hp} fill={P.red} fillOpacity={0.28} />
                      <circle cx={rx} cy={ry} r={7} fill="#190509" stroke={P.red} strokeWidth={3} />
                      <circle cx={rx} cy={ry} r={2.2} fill={P.amberHot} />
                    </g>
                  );
                })}

                {/* Đầu mũi khoan CNC đang dập lỗ trên dưỡng lỗi */}
                {t >= 724.6 && t <= 727.4 && (
                  <g transform={`translate(${drillPosX} ${drillPosY}) rotate(-28)`}>
                    <rect x={-11} y={-74} width={22} height={42} rx={3} fill="#394758" stroke={P.ink} strokeWidth={2} />
                    <polygon points="-6,-32 6,-32 3,0 -3,0" fill="#cfdbe8" stroke={P.ink} strokeWidth={1.5} />
                    <line x1={-5} y1={-24} x2={5} y2={-18} stroke={P.ink} strokeWidth={1.6} />
                    <line x1={-4} y1={-14} x2={4} y2={-8} stroke={P.ink} strokeWidth={1.6} />
                    <circle cx={0} cy={0} r={9} fill={P.amberHot} opacity={0.65} />
                  </g>
                )}

                {/* Thước kẹp điện tử chỉ sai số lệch tâm ở góc dưới kính lúp */}
                {t >= CUE.s25_misdrill && (
                  <g transform="translate(0 148)" opacity={prog(t, CUE.s25_misdrill, CUE.s25_misdrill + 0.45)}>
                    <rect x={-118} y={-20} width={236} height={38} rx={7} fill="#140912" fillOpacity={0.9} stroke={P.red} strokeWidth={2} />
                    <line x1={-88} y1={0} x2={-42} y2={0} stroke={P.cyan} strokeWidth={3} />
                    <circle cx={-65} cy={0} r={5} fill="#081b2e" stroke={P.cyan} strokeWidth={2} />
                    <line x1={-42} y1={0} x2={14} y2={0} stroke={P.amberHot} strokeWidth={2.2} strokeDasharray="4 3" />
                    <circle cx={14} cy={0} r={6} fill="#190509" stroke={P.red} strokeWidth={2.6} />
                    <path d="M 48,-8 L 64,8 M 64,-8 L 48,8" stroke={P.red} strokeWidth={3.4} strokeLinecap="round" />
                    <line x1={76} y1={-9} x2={76} y2={9} stroke={P.red} strokeWidth={2.2} />
                    <line x1={96} y1={-9} x2={96} y2={9} stroke={P.red} strokeWidth={2.2} />
                    <line x1={76} y1={0} x2={96} y2={0} stroke={P.red} strokeWidth={2} />
                  </g>
                )}
              </g>

              {/* Vành bezel kim loại kính lúp + vạch chia độ */}
              <circle cx={0} cy={0} r={LOUPE_R + 10} fill="none" stroke={P.ink} strokeWidth={16} />
              <circle cx={0} cy={0} r={LOUPE_R + 10} fill="none" stroke="#4c6b8c" strokeWidth={11} />
              <circle cx={0} cy={0} r={LOUPE_R + 2} fill="none" stroke={t >= CUE.s25_misdrill ? P.red : P.cyan} strokeWidth={3} />
              {Array.from({ length: 24 }, (_, d) => {
                const a = (d * Math.PI) / 12;
                const r0 = LOUPE_R + 5;
                const r1 = LOUPE_R + (d % 3 === 0 ? 15 : 11);
                return (
                  <line
                    key={d}
                    x1={Math.cos(a) * r0}
                    y1={Math.sin(a) * r0}
                    x2={Math.cos(a) * r1}
                    y2={Math.sin(a) * r1}
                    stroke={P.ordWhite}
                    strokeWidth={d % 3 === 0 ? 2 : 1.1}
                    opacity={0.75}
                  />
                );
              })}
            </g>
          </g>

          {/* ==================== NỬA DƯỚI: DÂY CHUYỀN NGHẼN LINH KIỆN & RÀO CHẮN ĐÌNH CÔNG CUỐI 2025 ==================== */}
          <g opacity={0.32 + 0.68 * lowerActive}>
            {/* Khung nền khu vực dây chuyền lắp ráp & tiến độ bàn giao */}
            <rect
              x={88}
              y={618}
              width={1744}
              height={382}
              rx={12}
              fill="#0a182c"
              fillOpacity={0.9}
              stroke={P.gridBright}
              strokeWidth={1.8}
              filter="url(#sh)"
            />

            {/* 1. Cụm trái (x: 112..545): 3 đường cấp linh kiện nhà cung cấp dồn vào cổ chai */}
            {[705, 810, 915].map((fy, idx) => {
              const crateShift = lerp(0, 58, prog(t, 729.4, 730.8));
              return (
                <g key={`feed_${idx}`}>
                  <path
                    d={`M 124 ${fy} L 430 ${fy} L 526 810`}
                    fill="none"
                    stroke={P.gridBright}
                    strokeWidth={6}
                    opacity={0.45}
                  />
                  <path
                    d={`M 124 ${fy} L 430 ${fy} L 526 810`}
                    fill="none"
                    stroke={bottleneckPinch > 0.2 ? P.amber : P.cyan}
                    strokeWidth={2}
                    strokeDasharray="8 6"
                  />
                  {/* Kiện linh kiện hàng không xếp hàng bị ùn ứ trước nút cổ chai */}
                  {[0, 1].map((c) => {
                    const cx = 175 + c * 112 + crateShift * (c === 1 ? 0.65 : 1);
                    return (
                      <g key={c} transform={`translate(${cx} ${fy})`}>
                        <rect
                          x={-36}
                          y={-22}
                          width={72}
                          height={44}
                          rx={5}
                          fill={P.bgCard}
                          stroke={bottleneckPinch > 0.4 ? P.amber : P.gridBright}
                          strokeWidth={1.8}
                        />
                        {idx === 0 && (
                          <path d="M -20,6 Q 0,-12 22,6" fill="none" stroke={P.f15Canopy} strokeWidth={4} strokeLinecap="round" />
                        )}
                        {idx === 1 && (
                          <g>
                            <line x1={-22} y1={-8} x2={22} y2={-8} stroke={P.f15Light} strokeWidth={3} />
                            <line x1={-22} y1={8} x2={22} y2={8} stroke={P.f15Light} strokeWidth={3} />
                            <line x1={-12} y1={-8} x2={-4} y2={8} stroke={P.amber} strokeWidth={2} />
                            <line x1={6} y1={-8} x2={14} y2={8} stroke={P.amber} strokeWidth={2} />
                          </g>
                        )}
                        {idx === 2 && (
                          <polygon points="-18,-10 20,0 -18,10" fill={P.f15Radome} stroke={P.cyan} strokeWidth={1.5} />
                        )}
                      </g>
                    );
                  })}
                </g>
              );
            })}

            {/* Cổng kẹp nút cổ chai nhà cung cấp (Supplier Bottleneck Gate @ x=538) */}
            <g transform="translate(538 810)">
              <rect x={-26} y={-152} width={52} height={304} rx={6} fill="#13253e" stroke={P.amber} strokeWidth={2} />
              {/* Hai hàm kẹp thủy lực ép chặt luồng linh kiện */}
              <polygon
                points={`-22,-136 22,-136 16,${-82 + bottleneckPinch * 56} -16,${-82 + bottleneckPinch * 56}`}
                fill={P.amber}
                stroke={P.ink}
                strokeWidth={2}
              />
              <polygon
                points={`-22,136 22,136 16,${82 - bottleneckPinch * 56} -16,${82 - bottleneckPinch * 56}`}
                fill={P.amber}
                stroke={P.ink}
                strokeWidth={2}
              />
              {/* Đèn cảnh báo nghẽn cổ chai */}
              <circle
                cx={0}
                cy={-166}
                r={12}
                fill={bottleneckPinch > 0.2 ? P.amber : '#2c3d52'}
                stroke={P.ink}
                strokeWidth={2}
              />
              {bottleneckPinch > 0.2 && (
                <circle cx={0} cy={-166} r={22} fill={P.amber} opacity={0.25 + 0.2 * Math.sin(t * 10)} />
              )}
            </g>

            {/* 2. Cụm giữa (x: 575..1125): Dây chuyền lắp ráp St. Louis với 2 khung F-15EX trên xe lăn */}
            <g>
              {/* Dầm cầu trục nhà máy phía trên */}
              <rect x={582} y={646} width={532} height={16} rx={3} fill="#1d3554" stroke={P.ink} strokeWidth={1.6} />
              {Array.from({ length: 10 }, (_, k) => (
                <line
                  key={k}
                  x1={598 + k * 52}
                  y1={646}
                  x2={624 + k * 52}
                  y2={662}
                  stroke={P.amber}
                  strokeWidth={1.6}
                  opacity={0.65}
                />
              ))}

              {/* Đường ray băng chuyền sàn lắp ráp */}
              <rect x={578} y={856} width={546} height={14} rx={4} fill="#223b5c" stroke={P.ink} strokeWidth={1.8} />
              {Array.from({ length: 15 }, (_, r) => (
                <circle key={r} cx={596 + r * 36} cy={863} r={4.2} fill={P.ordMid} stroke={P.ink} strokeWidth={1} />
              ))}

              {/* 2 chiếc F-15EX trên giá lắp ráp tiến tới rồi bị chặn cứng trước rào đình công */}
              {[0, 1].map((j) => {
                const rollForward = lerp(0, 46, prog(t, 729.5, 732.7));
                const bounceBack = strikeDrop > 0.9 ? bump(t, CUE.s25_strikeDelay, 0.35) * -8 : 0;
                const jx = 688 + j * 246 + rollForward + bounceBack;
                return (
                  <g key={j} transform={`translate(${jx} 834)`}>
                    {/* Cáp cầu trục treo khung thân */}
                    <line x1={-20} y1={-172} x2={-20} y2={-18} stroke={P.ordMid} strokeWidth={1.8} strokeDasharray="4 3" />
                    <line x1={38} y1={-172} x2={38} y2={-18} stroke={P.ordMid} strokeWidth={1.8} strokeDasharray="4 3" />
                    <F15Side2D x={0} y={0} scale={0.44} gear backSeatEmpty />
                    {/* Khung giá đỡ màu vàng nhà máy dưới bánh đáp */}
                    <rect x={-34} y={13} width={96} height={9} rx={2} fill={P.amber} stroke={P.ink} strokeWidth={1.5} />
                  </g>
                );
              })}
            </g>

            {/* 3. Rào chắn đình công vàng-đen (2025 STRIKE Barrier @ x=1142) sập xuống lúc 733.16s */}
            <g transform="translate(1142 0)">
              {/* Trụ thép cổng xuất xưởng */}
              <rect x={-16} y={644} width={32} height={318} rx={5} fill="#1b293b" stroke={P.ink} strokeWidth={2.2} />
              <circle
                cx={0}
                cy={632}
                r={13}
                fill={strikeDrop > 0.1 ? P.red : '#314357'}
                stroke={P.ink}
                strokeWidth={2}
              />
              {strikeDrop > 0.1 && (
                <circle cx={0} cy={632} r={26} fill={P.red} opacity={0.28 + 0.22 * Math.sin(t * 14)} />
              )}

              {/* Thanh chắn sọc vàng-đen sập thẳng xuống chặn ngang đường lăn */}
              <g transform={`translate(0 ${lerp(560, 796, strikeDrop)})`} opacity={strikeDrop > 0.01 ? 1 : 0}>
                <defs>
                  <clipPath id="s25_strike_bar">
                    <rect x={-22} y={-86} width={44} height={184} rx={7} />
                  </clipPath>
                </defs>
                <g clipPath="url(#s25_strike_bar)">
                  <rect x={-22} y={-86} width={44} height={184} fill={P.amber} />
                  {Array.from({ length: 10 }, (_, s) => (
                    <polygon
                      key={s}
                      points={`-30,${-95 + s * 26} 30,${-115 + s * 26} 30,${-102 + s * 26} -30,${-82 + s * 26}`}
                      fill={P.ink}
                    />
                  ))}
                </g>
                <rect x={-22} y={-86} width={44} height={184} rx={7} fill="none" stroke={P.ink} strokeWidth={2.6} />

                {/* Biển chắn đỏ 2025 STRIKE + ổ khóa đình công ngay tâm rào */}
                <rect x={-74} y={-38} width={148} height={78} rx={9} fill={P.redDark} stroke={P.amberHot} strokeWidth={2.8} />
                <text
                  x={0}
                  y={-12}
                  textAnchor="middle"
                  fill={P.amberHot}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={18}
                >
                  2025 STRIKE
                </text>
                {/* Biểu tượng ổ khóa đóng chặt */}
                <path d="M -8,14 L -8,7 A 8,8 0 0 1 8,7 L 8,14" fill="none" stroke="#ffffff" strokeWidth={2.6} />
                <rect x={-11} y={13} width={22} height={16} rx={3} fill="#ffffff" />
              </g>

              {/* Bụi chấn động khi thanh chắn đình công sập chạm đường ray lúc 733.16s */}
              {t >= CUE.s25_strikeDelay && t <= CUE.s25_strikeDelay + 1.8 && (
                <g>
                  <Puff2D
                    x={-18 - (t - CUE.s25_strikeDelay) * 32}
                    y={868}
                    r={16 + (t - CUE.s25_strikeDelay) * 20}
                    color="#9eb4cc"
                    opacity={Math.max(0, 0.65 * (1 - (t - CUE.s25_strikeDelay) / 1.8))}
                    seed={251}
                  />
                  <Puff2D
                    x={18 + (t - CUE.s25_strikeDelay) * 34}
                    y={868}
                    r={16 + (t - CUE.s25_strikeDelay) * 20}
                    color="#9eb4cc"
                    opacity={Math.max(0, 0.65 * (1 - (t - CUE.s25_strikeDelay) / 1.8))}
                    seed={252}
                  />
                </g>
              )}
            </g>

            {/* 4. Cụm phải (x: 1196..1804): Thanh lịch bàn giao bị đẩy trượt lùi hàng tháng trời */}
            <g>
              {/* Khung thước lịch các tháng bàn giao */}
              <rect
                x={1204}
                y={776}
                width={588}
                height={68}
                rx={10}
                fill="#0e223d"
                stroke={P.gridBright}
                strokeWidth={1.8}
              />
              {Array.from({ length: 7 }, (_, m) => {
                const mx = 1204 + m * 84;
                return (
                  <g key={`mo_${m}`}>
                    {m > 0 && (
                      <line x1={mx} y1={776} x2={mx} y2={844} stroke={P.gridBright} strokeWidth={1.3} opacity={0.5} />
                    )}
                    <rect
                      x={mx + 12}
                      y={754}
                      width={60}
                      height={14}
                      rx={3}
                      fill={m === 0 ? P.cyan : m >= 4 && slip2 > 0.2 ? P.red : P.grid}
                      opacity={m === 0 ? 0.85 : 0.45}
                    />
                  </g>
                );
              })}

              {/* Vùng trễ hạn gạch chéo đỏ kéo giãn giữa mốc kế hoạch gốc (1248) và mốc thực tế bị đẩy lùi (deliveryX) */}
              {deliveryX > 1254 && (
                <g>
                  <rect
                    x={1248}
                    y={782}
                    width={deliveryX - 1248}
                    height={56}
                    fill={P.red}
                    fillOpacity={0.22}
                  />
                  {/* Mũi tên đẩy lùi tiến độ sang phải */}
                  <line
                    x1={1262}
                    y1={810}
                    x2={deliveryX - 24}
                    y2={810}
                    stroke={P.red}
                    strokeWidth={6}
                    strokeLinecap="round"
                  />
                  <polygon
                    points={`${deliveryX - 10},810 ${deliveryX - 32},795 ${deliveryX - 32},825`}
                    fill={P.red}
                  />
                </g>
              )}

              {/* Cột mốc bàn giao kế hoạch ban đầu (bóng ma nét đứt Cyan tại x=1248) */}
              <g transform="translate(1248 810)">
                <line x1={0} y1={-95} x2={0} y2={62} stroke={P.cyan} strokeWidth={2.2} strokeDasharray="6 4" />
                <circle cx={0} cy={0} r={11} fill="#081b2e" stroke={P.cyan} strokeWidth={2.4} />
                <g transform="translate(0 -112)" opacity={0.55}>
                  <F15Side2D x={0} y={0} scale={0.18} />
                </g>
              </g>

              {/* Mốc bàn giao thực tế bị đẩy trượt sang phải + đồng hồ trễ hạn */}
              <g transform={`translate(${deliveryX} 810)`}>
                <line x1={0} y1={-98} x2={0} y2={78} stroke={P.amberHot} strokeWidth={2.8} />
                <circle cx={0} cy={0} r={14} fill={P.red} stroke={P.amberHot} strokeWidth={2.8} />
                {/* Thẻ máy bay bàn giao bị đẩy lùi */}
                <g transform="translate(0 -116)">
                  <rect x={-56} y={-28} width={112} height={48} rx={8} fill={P.bgCard} stroke={P.amber} strokeWidth={2.2} />
                  <F15Side2D x={-2} y={4} scale={0.19} />
                </g>
                {/* Đồng hồ quay kim báo trễ hàng tháng */}
                <g transform="translate(0 106)">
                  <circle cx={0} cy={0} r={24} fill="#160a12" stroke={P.red} strokeWidth={2.6} />
                  {Array.from({ length: 12 }, (_, h) => {
                    const a = (h * Math.PI) / 6;
                    return (
                      <line
                        key={h}
                        x1={Math.cos(a) * 17}
                        y1={Math.sin(a) * 17}
                        x2={Math.cos(a) * 21}
                        y2={Math.sin(a) * 21}
                        stroke={P.ordWhite}
                        strokeWidth={1.4}
                      />
                    );
                  })}
                  <line
                    x1={0}
                    y1={0}
                    x2={Math.cos((deliveryX - 1248) * 0.04) * 14}
                    y2={Math.sin((deliveryX - 1248) * 0.04) * 14}
                    stroke={P.amberHot}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                  />
                  <line
                    x1={0}
                    y1={0}
                    x2={Math.cos((deliveryX - 1248) * 0.008 - 1.57) * 10}
                    y2={Math.sin((deliveryX - 1248) * 0.008 - 1.57) * 10}
                    stroke={P.red}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                  />
                </g>
              </g>
            </g>
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.34} />

      <Label
        t={t}
        text="LOT 1B · GAO AUDIT"
        x={960}
        y={86}
        from={728.0}
        until={732.5}
        size={48}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S25;
