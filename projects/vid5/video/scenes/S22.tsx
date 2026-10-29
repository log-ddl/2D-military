import React from 'react';
import { Easing } from 'remotion';
import { FONT, prog, lerp, bump } from '@kit/theme';
import { useT, handheld, useSpring, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { smoothPath, drawOn, type Pt } from '@lib/2d/path';
import { contours } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { F15Top2D, F35Top2D } from '../local/jets2d';

// Đường đồng mức độ sâu lòng chảo Tây Thái Bình Dương & thềm lục địa (tính 1 lần ở cấp module)
const PACIFIC_CONTOURS = contours('s22_westpac_bathy', 3300, 1480, 10, 22, 540);

// Quần đảo Okinawa & chuỗi đảo Ryukyu (phía Đông bản đồ, x ≈ 1840..2480)
const OKINAWA_MAIN: Pt[] = [
  [2265, 370],
  [2292, 392],
  [2258, 445],
  [2218, 495],
  [2204, 542],
  [2162, 588],
  [2130, 642],
  [2088, 672],
  [2064, 650],
  [2096, 598],
  [2122, 548],
  [2166, 505],
  [2196, 446],
  [2232, 392],
];

const OKINAWA_RIDGE: Pt[] = [
  [2252, 395],
  [2234, 448],
  [2188, 512],
  [2146, 568],
  [2112, 628],
  [2102, 608],
  [2140, 546],
  [2182, 488],
  [2226, 420],
];

const AMAMI_ISLAND: Pt[] = [
  [2410, 205],
  [2452, 222],
  [2420, 276],
  [2365, 304],
  [2346, 278],
  [2378, 232],
];

const MIYAKO_ISLAND: Pt[] = [
  [1890, 795],
  [1932, 812],
  [1912, 852],
  [1864, 844],
  [1858, 814],
];

const ISHIGAKI_ISLAND: Pt[] = [
  [1735, 875],
  [1776, 886],
  [1764, 926],
  [1718, 920],
];

// Bờ biển & đảo tiền tiêu đối phương ở phía Tây (x ≈ 220..880)
const ADVERSARY_COAST: Pt[] = [
  [180, 80],
  [655, 80],
  [715, 175],
  [680, 275],
  [735, 355],
  [688, 452],
  [632, 545],
  [665, 645],
  [615, 748],
  [668, 845],
  [592, 955],
  [540, 1080],
  [180, 1080],
];

const FORT_ISLAND_1: Pt[] = [
  [755, 802],
  [805, 815],
  [814, 856],
  [762, 872],
  [726, 842],
];

const FORT_ISLAND_2: Pt[] = [
  [828, 470],
  [866, 484],
  [858, 518],
  [816, 510],
];

// Tọa độ 3 khẩu đội radar/tên lửa phòng không SAM đối phương có vòm chồng lấn
const SAM_SITES = [
  { id: 'SAM-01', x: 685, y: 335, r: 405, speed: 1.05, phase: 0.4 },
  { id: 'SAM-02', x: 590, y: 605, r: 448, speed: -0.88, phase: 2.1 },
  { id: 'SAM-03', x: 770, y: 836, r: 372, speed: 1.22, phase: 4.0 },
] as const;

const OKINAWA_D = smoothPath(OKINAWA_MAIN, true);
const OKINAWA_RIDGE_D = smoothPath(OKINAWA_RIDGE, true);
const AMAMI_D = smoothPath(AMAMI_ISLAND, true);
const MIYAKO_D = smoothPath(MIYAKO_ISLAND, true);
const ISHIGAKI_D = smoothPath(ISHIGAKI_ISLAND, true);
const COAST_D = smoothPath(ADVERSARY_COAST, true);
const FORT1_D = smoothPath(FORT_ISLAND_1, true);
const FORT2_D = smoothPath(FORT_ISLAND_2, true);

const S22: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const shake = handheld(t, 1.5, 's22_map');

  // Pha 1 (628.88–640.0s): Tập trung đảo Okinawa & Kadena Air Base (36 F-15EX, mã đuôi Kadena 8/2026)
  // Pha 2 (640.2–649.10s): Lia sang phía Tây nơi 2 chiếc F-35A âm thầm xuyên vòng phòng không đỏ & định vị thụ động 3 SAM
  const panWest = prog(t, 640.15, 642.35, Easing.bezier(0.42, 0, 0.18, 1));
  const camX = lerp(2185, 1015, panWest) - prog(t, 642.4, 649.1) * 55;
  const camY = lerp(555, 585, panWest);
  const camZoom = lerp(1.06 + prog(t, 628.88, 639.8) * 0.07, 1.04 + prog(t, 642.5, 649.1) * 0.06, panWest);

  // Tiến độ ghim Kadena & 36 máy bay F-15EX
  const kadenaIn = prog(t, 629.8, 631.4);
  const rolloutCard = useSpring(t, CUE.s22_kadenaPin - 0.3, 12, 150);
  const fleetCountP = prog(t, 631.0, 633.8);

  // Quỹ đạo 2 chiếc F-35A tàng hình lướt êm qua ranh giới vòm radar đỏ mà không kích hoạt báo động
  const f35Visible = prog(t, 638.8, 639.9);
  const slipP = prog(t, 639.0, 648.9, Easing.out(Easing.quad));
  const f35A = {
    x: lerp(1760, 948, slipP),
    y: lerp(418, 468, slipP),
    rot: 174,
  };
  const f35B = {
    x: lerp(1805, 998, slipP),
    y: lerp(732, 690, slipP),
    rot: -175,
  };

  // Phóng các đường gióng thụ động đứt nét cyan giao hội khóa tọa độ 3 khẩu đội SAM lúc 645.80s
  const passiveP = prog(t, CUE.s22_passiveSpot - 0.15, CUE.s22_passiveSpot + 1.15);
  const backLinkP = prog(t, 647.1, 648.8);
  const samLockSprings = [
    useSpring(t, CUE.s22_passiveSpot + 0.35, 11, 170),
    useSpring(t, CUE.s22_passiveSpot + 0.60, 11, 170),
    useSpring(t, CUE.s22_passiveSpot + 0.85, 11, 170),
  ];

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <svg width={3400} height={1520} style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(5, 12, 24, 0.55)" />
          <defs>
            <radialGradient id="s22_ocean" cx="52%" cy="48%" r="65%">
              <stop offset="0%" stopColor="#13385e" />
              <stop offset="58%" stopColor="#0c2542" />
              <stop offset="100%" stopColor="#071528" />
            </radialGradient>
            <radialGradient id="s22_samDome" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={P.red} stopOpacity={0.22} />
              <stop offset="72%" stopColor={P.red} stopOpacity={0.09} />
              <stop offset="100%" stopColor={P.red} stopOpacity={0.26} />
            </radialGradient>
          </defs>

          {/* Nền đại dương Tây Thái Bình Dương */}
          <rect x={-100} y={-120} width={3500} height={1720} fill="url(#s22_ocean)" />

          {/* Đường đồng mức địa hình đáy biển Tây Thái Bình Dương & Rãnh Ryukyu */}
          <g opacity={0.46}>
            {PACIFIC_CONTOURS.map((c) => (
              <path
                key={c.level}
                d={c.d}
                fill="none"
                stroke={c.level > 6 ? P.seaLight : '#24588a'}
                strokeWidth={c.level % 3 === 0 ? 1.5 : 0.9}
                opacity={0.22 + c.level * 0.055}
              />
            ))}
          </g>

          {/* Lưới kinh tuyến / vĩ tuyến tác chiến hàng hải */}
          {Array.from({ length: 15 }, (_, i) => {
            const gx = 160 + i * 220;
            return (
              <g key={`lon${i}`}>
                <line x1={gx} y1={-40} x2={gx} y2={1380} stroke={P.gridBright} strokeWidth={0.9} opacity={0.22} strokeDasharray="8 8" />
                <text x={gx + 8} y={115} fontFamily={FONT} fontWeight={500} fontSize={13} fill={P.muted} opacity={0.45}>
                  {119 + i}°E
                </text>
              </g>
            );
          })}
          {Array.from({ length: 7 }, (_, j) => {
            const gy = 140 + j * 190;
            return (
              <g key={`lat${j}`}>
                <line x1={80} y1={gy} x2={3260} y2={gy} stroke={P.gridBright} strokeWidth={0.9} opacity={0.22} strokeDasharray="8 8" />
                <text x={1820} y={gy - 8} fontFamily={FONT} fontWeight={500} fontSize={13} fill={P.muted} opacity={0.4}>
                  {29 - j}°N
                </text>
              </g>
            );
          })}

          {/* =================================================================
              PHÍA ĐÔNG (x ≈ 1700..2800): CHUỖI ĐẢO OKINAWA & CĂN CỨ KADENA
             ================================================================= */}
          {/* Thềm san hô nước nông quanh chuỗi đảo Ryukyu */}
          <g opacity={0.26} stroke={P.seaLight} strokeWidth={24} strokeLinejoin="round" fill="none">
            <path d={OKINAWA_D} />
            <path d={AMAMI_D} />
            <path d={MIYAKO_D} />
            <path d={ISHIGAKI_D} />
          </g>

          {/* Đất liền chuỗi đảo Okinawa / Ryukyu */}
          <path d={AMAMI_D} fill="#1f443c" stroke={P.seaLight} strokeWidth={2} />
          <path d={MIYAKO_D} fill="#1f443c" stroke={P.seaLight} strokeWidth={2} />
          <path d={ISHIGAKI_D} fill="#1f443c" stroke={P.seaLight} strokeWidth={2} />
          <path d={OKINAWA_D} fill="#234d42" stroke={P.cyanSoft} strokeWidth={2.6} filter="url(#sh)" />
          <path d={OKINAWA_RIDGE_D} fill="#3a7357" opacity={0.85} />

          {/* Vòng bảo vệ & Ghim sáng KADENA AIR BASE (Okinawa, Japan) */}
          {kadenaIn > 0.01 && (
            <g opacity={kadenaIn}>
              {/* Vòng tuần tra không phận Kadena */}
              <circle
                cx={2148}
                cy={568}
                r={215}
                fill="rgba(255,174,43,0.06)"
                stroke={P.amber}
                strokeWidth={2}
                strokeDasharray="12 8"
              />
              <circle
                cx={2148}
                cy={568}
                r={42 + ((t * 28) % 52)}
                fill="none"
                stroke={P.amberHot}
                strokeWidth={2.2}
                opacity={1 - ((t * 28) % 52) / 52}
              />

              {/* Ký hiệu đường băng đôi Kadena Air Base */}
              <g transform="translate(2148 568) rotate(-36)">
                <rect x={-26} y={-8} width={52} height={5} rx={2} fill={P.amberHot} stroke={P.ink} strokeWidth={1.2} />
                <rect x={-26} y={3} width={52} height={5} rx={2} fill={P.amberHot} stroke={P.ink} strokeWidth={1.2} />
              </g>
              <circle cx={2148} cy={568} r={9} fill={P.amberHot} stroke={P.ink} strokeWidth={2} />

              {/* Nhãn địa danh bản đồ Okinawa / Kadena */}
              <text x={2130} y={718} fontFamily={FONT} fontWeight={700} fontSize={20} fill={P.cyanSoft} textAnchor="middle">
                OKINAWA · JAPAN
              </text>

              {/* Đội hình biểu tượng 4 chiếc F15Top2D tuần tra xuất phát từ Kadena hướng sang Tây */}
              {[
                [2020, 480],
                [2060, 535],
                [2012, 600],
                [2056, 655],
              ].map(([jx, jy], idx) => (
                <g key={idx} transform={`translate(${jx - (t - 628.88) * 1.8} ${jy})`}>
                  <line x1={38} y1={0} x2={98} y2={0} stroke={P.amber} strokeWidth={2.2} opacity={0.45} strokeDasharray="5 5" />
                  <F15Top2D scale={0.21} flip wingTipMissiles fullLoad />
                </g>
              ))}

              {/* Bảng thẻ thông tin Căn cứ Kadena + Phù hiệu cánh đuôi đứng ZZ (8/2026) + Lưới 36 JETS */}
              <g
                transform={`translate(2565 555) scale(${0.85 + 0.15 * Math.min(1, rolloutCard)})`}
                opacity={Math.min(1, kadenaIn * 1.4)}
              >
                <line x1={-255} y1={10} x2={-405} y2={12} stroke={P.amber} strokeWidth={2.4} />
                <circle cx={-405} cy={12} r={5} fill={P.amberHot} />

                <rect
                  x={-255}
                  y={-225}
                  width={510}
                  height={450}
                  rx={18}
                  fill="rgba(12, 28, 50, 0.93)"
                  stroke={P.amber}
                  strokeWidth={2.8}
                  filter="url(#sh)"
                />
                <rect x={-232} y={-202} width={464} height={54} rx={10} fill="#163459" />
                <text x={0} y={-168} fontFamily={FONT} fontWeight={700} fontSize={23} fill={P.amberHot} textAnchor="middle">
                  KADENA AIR BASE · 18TH WING
                </text>

                {/* Phù hiệu đuôi đứng F-15EX mang mã ZZ Kadena (xuất xưởng tháng 8/2026) */}
                <g transform="translate(-128 -35)">
                  <polygon
                    points="-64,88 68,88 46,-88 -32,-88"
                    fill={P.f15Light}
                    stroke={P.ink}
                    strokeWidth={2.8}
                    strokeLinejoin="round"
                  />
                  {/* U cảm biến EPAWSS đặc trưng trên đỉnh đuôi F-15EX */}
                  <rect x={-40} y={-97} width={96} height={11} rx={5} fill={P.ordWhite} stroke={P.ink} strokeWidth={2} />
                  {/* Dải băng đỉnh đuôi vàng-xanh Kadena Okinawa */}
                  <polygon points="-30,-74 48,-74 45,-52 -25,-52" fill="#17447a" />
                  <polygon points="-25,-52 45,-52 43,-42 -23,-42" fill={P.amber} />
                  {/* Mã đuôi ZZ huyền thoại của Kadena */}
                  <text x={8} y={18} fontFamily={FONT} fontWeight={700} fontSize={54} fill={P.ink} textAnchor="middle">
                    ZZ
                  </text>
                  <text x={8} y={50} fontFamily={FONT} fontWeight={700} fontSize={14} fill={P.f15Dark} textAnchor="middle">
                    AF 26-001
                  </text>
                  <text x={2} y={114} fontFamily={FONT} fontWeight={700} fontSize={14} fill={P.cyanSoft} textAnchor="middle">
                    AUG 2026 ROLLOUT
                  </text>
                </g>

                {/* Lưới biên chế 36 chiếc F-15EX (3 phi đoàn x 12 máy bay = 36 JETS) */}
                <g transform="translate(88 -95)">
                  <text x={0} y={-14} fontFamily={FONT} fontWeight={700} fontSize={26} fill={P.amberHot} textAnchor="middle">
                    36 JETS
                  </text>
                  <text x={0} y={8} fontFamily={FONT} fontWeight={500} fontSize={13} fill={P.muted} textAnchor="middle">
                    FULL F-15EX WING
                  </text>
                  {Array.from({ length: 36 }, (_, idx) => {
                    const col = idx % 6;
                    const row = Math.floor(idx / 6);
                    const lit = idx / 35 <= fleetCountP;
                    return (
                      <g key={idx} transform={`translate(${-88 + col * 35} ${28 + row * 28})`}>
                        <polygon
                          points="-10,0 2,-8 10,0 2,8"
                          fill={lit ? P.amber : '#1a3556'}
                          stroke={lit ? P.amberHot : P.grid}
                          strokeWidth={1.2}
                        />
                      </g>
                    );
                  })}
                </g>

                {/* Chân thẻ tóm tắt nhiệm vụ */}
                <rect x={-226} y={145} width={452} height={54} rx={10} fill="#0b1b32" stroke={P.gridBright} strokeWidth={1.5} />
                <text x={0} y={178} fontFamily={FONT} fontWeight={700} fontSize={17} fill={P.cyan} textAnchor="middle">
                  FIRST ISLAND CHAIN · AIR SUPERIORITY HUB
                </text>
              </g>
            </g>
          )}

          {/* =================================================================
              PHÍA TÂY (x ≈ 200..1500): LƯỚI VÒM RADAR SAM ĐỎ CHỒNG LẤN & F-35A ĐỘT NHẬP
             ================================================================= */}
          {/* Bờ biển & đảo tiền tiêu đối phương */}
          <path d={COAST_D} fill="#202a34" stroke="#536575" strokeWidth={2.5} />
          <path d={FORT1_D} fill="#26323d" stroke="#5c7082" strokeWidth={2.2} />
          <path d={FORT2_D} fill="#26323d" stroke="#5c7082" strokeWidth={2} />

          {/* 3 Vòm radar phòng không đỏ rực chồng lấn nhau (Overlapping Enemy IADS Rings) */}
          {SAM_SITES.map((s, idx) => {
            const sweepDeg = ((t * s.speed + s.phase) * 58) % 360;
            const lockedByF35 = t >= CUE.s22_passiveSpot + 0.35 + idx * 0.25;
            const lockS = samLockSprings[idx];
            return (
              <g key={s.id} transform={`translate(${s.x} ${s.y})`}>
                {/* Vòm phủ sóng đỏ bán trong suốt chồng lấn */}
                <circle cx={0} cy={0} r={s.r} fill="url(#s22_samDome)" stroke={P.red} strokeWidth={2.6} />
                <circle cx={0} cy={0} r={s.r * 0.68} fill="none" stroke={P.red} strokeWidth={1.4} strokeDasharray="10 8" opacity={0.55} />
                <circle cx={0} cy={0} r={s.r * 0.36} fill="none" stroke={P.red} strokeWidth={1.2} strokeDasharray="6 6" opacity={0.45} />

                {/* Quạt quét sóng radar tìm kiếm quay đều (KHÔNG phát hiện được F-35A!) */}
                <g transform={`rotate(${sweepDeg})`}>
                  <path
                    d={`M0,0 L${s.r},0 A${s.r},${s.r} 0 0,0 ${s.r * 0.94},${-s.r * 0.34} Z`}
                    fill={P.red}
                    opacity={0.14}
                  />
                  <line x1={0} y1={0} x2={s.r} y2={0} stroke={P.red} strokeWidth={2} opacity={0.65} />
                </g>

                {/* Biểu tượng khẩu đội tên lửa SAM + đài radar địch */}
                <rect x={-16} y={-16} width={32} height={32} rx={5} fill="#2b141a" stroke={P.red} strokeWidth={2.4} />
                <line x1={-9} y1={7} x2={9} y2={-9} stroke={P.amberHot} strokeWidth={3.2} strokeLinecap="round" />
                <line x1={-3} y1={10} x2={11} y2={-4} stroke={P.amberHot} strokeWidth={3.2} strokeLinecap="round" />

                {/* Khung khóa tọa độ thụ động Cyan khi F-35A giao hội lúc 645.8s */}
                {lockedByF35 && (
                  <g transform={`scale(${lockS})`}>
                    <polygon
                      points="0,-42 42,0 0,42 -42,0"
                      fill="rgba(44, 230, 255, 0.14)"
                      stroke={P.cyan}
                      strokeWidth={3}
                    />
                    <line x1={-54} y1={0} x2={-30} y2={0} stroke={P.cyan} strokeWidth={2.5} />
                    <line x1={30} y1={0} x2={54} y2={0} stroke={P.cyan} strokeWidth={2.5} />
                    <line x1={0} y1={-54} x2={0} y2={-30} stroke={P.cyan} strokeWidth={2.5} />
                    <line x1={0} y1={30} x2={0} y2={54} stroke={P.cyan} strokeWidth={2.5} />
                    <rect x={-46} y={48} width={92} height={24} rx={5} fill="#0a2238" stroke={P.cyan} strokeWidth={1.6} />
                    <text x={0} y={65} fontFamily={FONT} fontWeight={700} fontSize={13} fill={P.cyan} textAnchor="middle">
                      {s.id} FIX
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* ĐƯỜNG GIÓNG THỤ ĐỘNG ĐỨT NÉT CYAN GIAO HỘI TỪ 2 CHIẾC F-35A KHÓA 3 KHẨU ĐỘI SAM */}
          {passiveP > 0.01 && (
            <g>
              {SAM_SITES.map((s, idx) => {
                const pSite = prog(t, CUE.s22_passiveSpot - 0.05 + idx * 0.22, CUE.s22_passiveSpot + 0.65 + idx * 0.22);
                if (pSite <= 0.01) return null;
                const d1 = `M${f35A.x.toFixed(1)} ${f35A.y.toFixed(1)} L${s.x} ${s.y}`;
                const d2 = `M${f35B.x.toFixed(1)} ${f35B.y.toFixed(1)} L${s.x} ${s.y}`;
                const len1 = Math.hypot(s.x - f35A.x, s.y - f35A.y);
                const len2 = Math.hypot(s.x - f35B.x, s.y - f35B.y);
                return (
                  <g key={`tri_${s.id}`}>
                    {/* Vẽ nét kép (halo mờ bản rộng + lõi đứt nét sáng, tránh filter glow trên đường chéo dài trong Cam2D) */}
                    <path d={d1} fill="none" stroke={P.cyan} strokeWidth={7} opacity={0.16 * pSite} {...drawOn(len1, pSite)} />
                    <path d={d2} fill="none" stroke={P.cyan} strokeWidth={7} opacity={0.16 * pSite} {...drawOn(len2, pSite)} />
                    <line
                      x1={f35A.x}
                      y1={f35A.y}
                      x2={lerp(f35A.x, s.x, pSite)}
                      y2={lerp(f35A.y, s.y, pSite)}
                      stroke={P.cyan}
                      strokeWidth={2.4}
                      strokeDasharray="10 7"
                    />
                    <line
                      x1={f35B.x}
                      y1={f35B.y}
                      x2={lerp(f35B.x, s.x, pSite)}
                      y2={lerp(f35B.y, s.y, pSite)}
                      stroke={P.cyanSoft}
                      strokeWidth={2.4}
                      strokeDasharray="10 7"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Luồng truyền dữ liệu mã hóa ngược về phía Đông (nối sang S23: F-15EX ở 60 dặm phía sau) */}
          {backLinkP > 0.01 && (
            <g opacity={backLinkP}>
              <line x1={f35A.x + 35} y1={f35A.y + 8} x2={1660} y2={535} stroke={P.cyan} strokeWidth={7} opacity={0.18} />
              <line
                x1={f35A.x + 35}
                y1={f35A.y + 8}
                x2={lerp(f35A.x + 35, 1660, backLinkP)}
                y2={lerp(f35A.y + 8, 535, backLinkP)}
                stroke={P.cyan}
                strokeWidth={2.8}
                strokeDasharray="14 8"
              />
              <line
                x1={f35B.x + 35}
                y1={f35B.y - 8}
                x2={lerp(f35B.x + 35, 1660, backLinkP)}
                y2={lerp(f35B.y - 8, 555, backLinkP)}
                stroke={P.cyan}
                strokeWidth={2.8}
                strokeDasharray="14 8"
              />
            </g>
          )}

          {/* HAI CHIẾC F-35A TÀNG HÌNH LƯỚT ÊM XUYÊN QUA VÒNG RADAR ĐỎ (KHÔNG MỞ 4 KHOANG ĐẠN) */}
          {f35Visible > 0.01 &&
            [f35A, f35B].map((jet, idx) => {
              const pulse = bump(t, CUE.s22_f35SlipIn + idx * 0.4, 2.2);
              return (
                <g key={`f35_${idx}`} transform={`translate(${jet.x} ${jet.y})`} opacity={f35Visible}>
                {/* Vệt khí mờ cực mảnh không bộc lộ nhiệt */}
                <line x1={65} y1={0} x2={220} y2={idx === 0 ? -16 : 18} stroke={P.cyanSoft} strokeWidth={2} opacity={0.28} strokeDasharray="6 8" />

                {/* Vỏ bọc kim cương tàng hình (Low-Observable Stealth Envelope — không kích hoạt báo động) */}
                <polygon
                  points="-86,0 0,-62 88,0 0,62"
                  fill="rgba(13, 32, 54, 0.42)"
                  stroke={P.cyan}
                  strokeWidth={1.8 + pulse * 1.4}
                  strokeDasharray="8 6"
                  opacity={0.75}
                />

                <F35Top2D scale={0.38} rot={jet.rot} bayOpen={false} />

                {/* Nhãn trạng thái khoang đạn khép kín trên chiếc dẫn đầu */}
                {idx === 0 && t >= CUE.s22_f35SlipIn - 0.3 && (
                  <g transform="translate(18 -86)" opacity={prog(t, CUE.s22_f35SlipIn - 0.3, CUE.s22_f35SlipIn + 0.5)}>
                    <rect x={-108} y={-18} width={216} height={32} rx={8} fill="rgba(9, 22, 38, 0.9)" stroke={P.green} strokeWidth={1.8} />
                    <circle cx={-88} cy={-2} r={5} fill={P.green} />
                    <text x={10} y={3} fontFamily={FONT} fontWeight={700} fontSize={13.5} fill={P.text} textAnchor="middle">
                      4 BAYS SEALED · PASSIVE
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </Cam2D>

      <Grain opacity={0.36} />

      <Label
        t={t}
        text="36 F-15EX · KADENA"
        x={960}
        y={108}
        from={631.38}
        until={636.0}
        size={50}
        bg={P.amber}
        fg={P.ink}
      />
    </>
  );
};

export default S22;
