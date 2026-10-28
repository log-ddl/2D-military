// Cảnh S02 (4.05–10.60 s, thuần 2D):
// Mặt cắt kỹ thuật giáp trước composite vát nghiêng quy đổi 800 mm thép đồng nhất (RHA), chặn đứng & bẻ gãy đạn xuyên động năng APFSDS bắn thẳng.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog, rnd } from '@kit/theme';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D, Muzzle2D } from '@lib/2d/fx';
import { CUE } from '../cues';
import { P2D } from '../local/palette';

// Tọa độ chuẩn của phép thử đạn đạo (không gian thế giới 1920x1080)
const SHOT_Y = 615;
const MUZZLE_X = 306;

// Mặt vát ngoài của khối giáp composite mũi xe (nghiêng ~31° so với phương ngang):
// Từ mũi dưới (1135, 705) lên đỉnh glacis (1435, 525) -> tại y = 615 cắt đúng ở x = 1285
const GLACIS_BOT_X = 1135;
const GLACIS_BOT_Y = 705;
const GLACIS_TOP_X = 1435;
const GLACIS_TOP_Y = 525;

const IMPACT_X = 1285; // Điểm va chạm mặt ngoài tại y = 615
const RHA_PX = 280; // Chiều dày hiệu dụng theo phương ngang L_eff = 280 px <=> 800 mm RHA (35 px / 100 mm)
const INNER_X = IMPACT_X + RHA_PX; // 1565 (mặt trong giáp / vách khoang lái)
const FLOOR_Y = 928;

// Hàm dựng tứ giác lớp giáp nghiêng song song theo khoảng dịch ngang [dx0, dx1]
const glacisLayerPath = (dx0: number, dx1: number) =>
  `M${GLACIS_BOT_X + dx0} ${GLACIS_BOT_Y} L${GLACIS_TOP_X + dx0} ${GLACIS_TOP_Y} L${GLACIS_TOP_X + dx1} ${GLACIS_TOP_Y} L${GLACIS_BOT_X + dx1} ${GLACIS_BOT_Y} Z`;

// Tứ giác lớp giáp má tháp pháo (arrowhead cheek cutaway phía trên-sau khối giáp mũi)
const cheekLayerPath = (dx0: number, dx1: number) =>
  `M${1600 + dx0} 442 L${1705 + dx0} 348 L${1705 + dx1} 348 L${1600 + dx1} 442 L${1685 + dx1} 522 L${1685 + dx0} 522 Z`;

// 4 mảnh gãy lớn của thanh xuyên tungsten APFSDS văng dội ngược (quay chậm đạn đạo sau va chạm 7.88 s)
type FragSpec = {
  ox: number;
  oy: number;
  vx: number;
  vy: number;
  spin: number;
  rot0: number;
  shape: string;
  fins?: boolean;
};

const FRAG_GRAV = 185;

const ROD_FRAGMENTS: FragSpec[] = [
  // 1. Đầu mũi tungsten tù biến dạng nhiệt bật văng chéo cao dọc mặt nghiêng tấm giáp
  {
    ox: -12,
    oy: -10,
    vx: -175,
    vy: -215,
    spin: -340,
    rot0: -24,
    shape: 'M-24 -7.5 L16 -9.5 L25 -2 L19 8.5 L-21 7.5 L-29 1 Z',
  },
  // 2. Đoạn thân trước thanh xuyên gãy gập văng bổng sang trái
  {
    ox: -34,
    oy: -14,
    vx: -275,
    vy: -135,
    spin: 420,
    rot0: 14,
    shape: 'M-34 -6.5 L30 -6.5 L36 2.5 L27 7.5 L-31 6.5 L-38 -1 Z',
  },
  // 3. Đoạn thân giữa văng ngang-thấp về phía trước mũi xe
  {
    ox: -58,
    oy: 10,
    vx: -230,
    vy: 38,
    spin: -390,
    rot0: -16,
    shape: 'M-32 -6.5 L28 -6.5 L34 5.5 L-29 6.5 L-36 0 Z',
  },
  // 4. Cụm đuôi 6 cánh ổn định gãy rời xoay tít ở tầm trung
  {
    ox: -92,
    oy: -4,
    vx: -148,
    vy: -62,
    spin: 295,
    rot0: 6,
    shape: 'M-36 -6 L24 -6 L29 6 L-36 6 Z',
    fins: true,
  },
];

const fragPosAt = (f: FragSpec, tau: number): [number, number, number] => {
  let fx = IMPACT_X + f.ox + f.vx * tau;
  let fy = SHOT_Y + f.oy + f.vy * tau + FRAG_GRAV * tau * tau;
  let rot = f.rot0 + f.spin * tau;
  if (fy > FLOOR_Y - 12) {
    const over = fy - (FLOOR_Y - 12);
    fy = FLOOR_Y - 12 - Math.min(36, over * 0.25);
    fx -= over * 0.14;
    rot = f.rot0 + f.spin * 1.15;
  }
  return [fx, fy, rot];
};

const S02: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ các pha diễn hoạt chính theo mốc CUE
  const pArmorLit = prog(t, CUE.s02_front_armor, CUE.s02_front_armor + 1.1);
  const pSlopeGeo = prog(t, CUE.s02_front_armor + 0.35, CUE.s02_front_armor + 1.25);
  const pRha = prog(t, CUE.s02_800mm, CUE.s02_800mm + 0.72);
  const pLaser = prog(t, 4.4, 5.2) * (t < CUE.s02_shot_block ? 1 : 0);
  const laserLock = prog(t, 6.9, 7.35);

  // Chuyển động viên đạn thanh xuyên động năng APFSDS (7.45 -> 7.88 s)
  const inFlight = t >= CUE.s02_shot_fire && t < CUE.s02_shot_block;
  const pShot = prog(t, CUE.s02_shot_fire, CUE.s02_shot_block, (x) => x);
  const dartTipX = lerp(MUZZLE_X + 26, IMPACT_X, pShot);
  const dtFire = Math.max(0, t - CUE.s02_shot_fire);
  const dtHit = t - CUE.s02_shot_block;
  const hasHit = dtHit >= 0;

  // Giật lùi nòng pháo thử nghiệm bên trái khi khai hỏa
  const testGunRecoil = t >= CUE.s02_shot_fire ? 24 * Math.exp(-dtFire * 8.0) : 0;

  // Xung chấn hấp thụ năng lượng trong lớp giáp ngoài (chỉ ăn nông ~15% bề dày rồi tắt hẳn, mặt trong bất khả xâm phạm)
  const impactFlash = hasHit ? Math.exp(-dtHit * 5.2) : 0;
  const safeAura = hasHit ? Math.min(1, dtHit / 0.22) : 0;

  // Điều khiển máy quay Cam2D: giữ bố cục đầy đặn cả bệ pháo trái lẫn mặt cắt xe tăng phải ngay từ khung đầu!
  const pToRha = prog(t, 5.45, 6.45);
  const pOpenFire = prog(t, 7.0, 7.42);
  const pAfterClose = prog(t, 8.4, 10.45);

  const camX =
    lerp(1035, 1010, pToRha) * (1 - pOpenFire) +
    lerp(965, 1030, pAfterClose) * pOpenFire;
  const camY =
    lerp(548, 515, pToRha) * (1 - pOpenFire) +
    lerp(536, 526, pAfterClose) * pOpenFire;
  const baseZoom =
    lerp(1.035, 1.025, pToRha) * (1 - pOpenFire) +
    lerp(1.0, 1.04, pAfterClose) * pOpenFire;
  const camZoom = baseZoom + 0.034 * bump(t, CUE.s02_shot_block, 0.34);

  const [hx, hy] = handheld(t, 1.8, 's02_cam');
  const hitShake = hasHit ? 25 * Math.exp(-dtHit * 7.5) : 0;
  const shake: readonly [number, number] = [
    hx + Math.sin(t * 92) * hitShake,
    hy + Math.cos(t * 79) * hitShake * 0.78,
  ];

  // Giữ nhãn "800 mm RHA" rõ nét trọn vẹn qua khung 10.17 s rồi thu gọn mượt ở 10.25..10.48 s
  const labelFadeOut = 1 - prog(t, 10.25, 10.48);

  return (
    <AbsoluteFill style={{ background: P2D.slateDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P2D.slateDeep}>
        <Layer>
          <Defs2D shadow="rgba(4, 8, 15, 0.62)" />
          <defs>
            {/* Nền xưởng thử đạn đạo có chiều sâu ánh sáng tâm điểm */}
            <radialGradient id="s02BgGlow" cx="62%" cy="52%" r="64%">
              <stop offset="0%" stopColor="#1c2f47" />
              <stop offset="54%" stopColor={P2D.slateBg} />
              <stop offset="100%" stopColor={P2D.slateDeep} />
            </radialGradient>

            {/* Gradient thép đồng nhất RHA 800 mm */}
            <linearGradient id="rhaBarFace" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P2D.armorSafeHi} />
              <stop offset="28%" stopColor={P2D.armorSafe} />
              <stop offset="100%" stopColor="#1d5f96" />
            </linearGradient>

            {/* Vệt lửa khí động thanh xuyên APFSDS */}
            <linearGradient id="apfsdsWake" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={P2D.jetOuter} stopOpacity="0" />
              <stop offset="45%" stopColor={P2D.jetOuter} stopOpacity="0.6" />
              <stop offset="80%" stopColor={P2D.jetMid} stopOpacity="0.95" />
              <stop offset="100%" stopColor={P2D.jetCore} stopOpacity="1" />
            </linearGradient>

            {/* Sọc gạch mặt cắt kỹ thuật thép đặc */}
            <pattern id="steelHatch" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1="0" y1="0" x2="0" y2="14" stroke="#85b8e8" strokeWidth="1.6" strokeOpacity="0.22" />
            </pattern>

            {/* Hoa văn sợi Kevlar chống mảnh mặt trong */}
            <pattern id="spallWeave" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M0 5 H10 M5 0 V10" stroke={P2D.radar} strokeWidth="1" strokeOpacity="0.28" />
            </pattern>

            <clipPath id="glacisClip">
              <path d={glacisLayerPath(0, RHA_PX)} />
            </clipPath>
          </defs>

          {/* ==================== 1. NỀN XƯỞNG THỬ ĐẠN ĐẠO & LƯỚI KỸ THUẬT ==================== */}
          <rect x={-320} y={-220} width={2560} height={1520} fill="url(#s02BgGlow)" />

          {/* Các khung sườn vách buồng thử đạn đạo xa & đèn rọi trần xưởng tạo chiều sâu kiến trúc */}
          {Array.from({ length: 8 }, (_, i) => {
            const bx = -60 + i * 305;
            return (
              <g key={`bay-${i}`} opacity={0.34}>
                <path
                  d={`M${bx} -120 L${bx + 48} -120 L${bx + 18} ${FLOOR_Y} L${bx - 22} ${FLOOR_Y} Z`}
                  fill="#0a111a"
                />
                <line x1={bx + 18} y1={-120} x2={bx - 12} y2={FLOOR_Y} stroke={P2D.slateGrid} strokeWidth={1.5} />
              </g>
            );
          })}

          {/* Lưới tọa độ kỹ thuật mảnh (bước 70 px = 200 mm) */}
          <g opacity={0.44}>
            {Array.from({ length: 34 }, (_, i) => {
              const gx = -140 + i * 70;
              return (
                <line
                  key={`vg-${i}`}
                  x1={gx}
                  y1={-120}
                  x2={gx}
                  y2={FLOOR_Y}
                  stroke={P2D.slateGrid}
                  strokeWidth={i % 4 === 0 ? 1.5 : 0.8}
                />
              );
            })}
            {Array.from({ length: 16 }, (_, j) => {
              const gy = -50 + j * 70;
              return (
                <line
                  key={`hg-${j}`}
                  x1={-180}
                  y1={gy}
                  x2={2180}
                  y2={gy}
                  stroke={P2D.slateGrid}
                  strokeWidth={j % 4 === 0 ? 1.5 : 0.8}
                />
              );
            })}
          </g>

          {/* Vạch thước chia độ chuẩn mm dọc thanh ray trên và trục đứng bên trái */}
          <g opacity={0.64}>
            <line x1={60} y1={86} x2={1880} y2={86} stroke={P2D.slateRule} strokeWidth={1.6} />
            {Array.from({ length: 52 }, (_, i) => {
              const tx = 75 + i * 35; // Mỗi vạch = 100 mm theo đúng tỉ lệ khối giáp
              const major = i % 5 === 0;
              return (
                <line
                  key={`rt-${i}`}
                  x1={tx}
                  y1={86}
                  x2={tx}
                  y2={major ? 104 : 95}
                  stroke={major ? P2D.slateMuted : P2D.slateRule}
                  strokeWidth={major ? 2 : 1.1}
                />
              );
            })}
            <line x1={58} y1={120} x2={58} y2={FLOOR_Y - 20} stroke={P2D.slateRule} strokeWidth={1.5} />
            {Array.from({ length: 23 }, (_, j) => {
              const ty = 140 + j * 35;
              const major = j % 4 === 0;
              return (
                <line
                  key={`lt-${j}`}
                  x1={58}
                  y1={ty}
                  x2={major ? 74 : 66}
                  y2={ty}
                  stroke={major ? P2D.slateMuted : P2D.slateRule}
                  strokeWidth={major ? 2 : 1.1}
                />
              );
            })}
          </g>

          {/* Sàn bệ thép trường bắn đạn đạo (y = 928..1160) */}
          <g>
            <rect x={-260} y={FLOOR_Y} width={2480} height={240} fill="#0a1018" />
            <rect x={-260} y={FLOOR_Y} width={2480} height={16} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={2.5} />
            <line x1={-260} y1={FLOOR_Y + 4} x2={2220} y2={FLOOR_Y + 4} stroke={P2D.steelHi} strokeWidth={2} opacity={0.65} />
            {Array.from({ length: 18 }, (_, i) => {
              const rx = -120 + i * 135;
              return (
                <g key={`rail-${i}`}>
                  <rect x={rx} y={FLOOR_Y + 24} width={76} height={36} rx={4} fill={P2D.slatePanel} stroke={P2D.slateGrid} strokeWidth={1.5} />
                  <circle cx={rx + 14} cy={FLOOR_Y + 42} r={4} fill={P2D.steelHi} />
                  <circle cx={rx + 62} cy={FLOOR_Y + 42} r={4} fill={P2D.steelHi} />
                </g>
              );
            })}
          </g>

          {/* ==================== 2. NỬA ĐẦU XE TĂNG MBT NHÌN NGANG & MẶT CẮT GIÁP TRƯỚC ==================== */}
          <g filter="url(#sh)">
            {/* --- Hệ thống bánh xích dưới gầm (quay mũi sang TRÁI) --- */}
            <g>
              <path
                d={`M1212 802 L1268 746 L2140 746 L2140 ${FLOOR_Y} L1390 ${FLOOR_Y} L1220 848 Z`}
                fill={P2D.steelDark}
                stroke={P2D.stroke}
                strokeWidth={4}
              />
              <path
                d={`M1226 806 L1274 758 L2125 758 L2125 ${FLOOR_Y - 12} L1396 ${FLOOR_Y - 12} L1234 842 Z`}
                fill="#18222e"
                stroke={P2D.steelLo}
                strokeWidth={2}
              />
              {Array.from({ length: 17 }, (_, i) => (
                <rect
                  key={`pad-${i}`}
                  x={1395 + i * 44}
                  y={FLOOR_Y - 10}
                  width={30}
                  height={9}
                  rx={2}
                  fill={P2D.steelMid}
                  stroke={P2D.stroke}
                  strokeWidth={1.5}
                />
              ))}
              {/* Bánh dẫn hướng trước */}
              <g transform="translate(1277 820)">
                <circle r={66} fill="#1b2430" stroke={P2D.stroke} strokeWidth={4} />
                <circle r={44} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3} />
                <circle r={16} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={2.5} />
              </g>
              {/* 4 bánh chịu nặng phía trước */}
              {[1482, 1682, 1882, 2082].map((wx, idx) => (
                <g key={`rw-${idx}`} transform={`translate(${wx} 834)`}>
                  <circle r={80} fill="#19212b" stroke={P2D.stroke} strokeWidth={4} />
                  <circle r={56} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3} />
                  <circle r={44} fill={P2D.steelLo} />
                  <circle r={18} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={2.5} />
                  {[0, 60, 120, 180, 240, 300].map((a) => (
                    <circle
                      key={a}
                      cx={Math.cos((a * Math.PI) / 180) * 31}
                      cy={Math.sin((a * Math.PI) / 180) * 31}
                      r={3.8}
                      fill={P2D.steelHi}
                    />
                  ))}
                </g>
              ))}
            </g>

            {/* --- Khung thân xe cắt dọc & Khoang lái an toàn phía sau lớp giáp (x > 1565) --- */}
            <path
              d={`M${GLACIS_BOT_X} ${GLACIS_BOT_Y} L1340 818 L2140 818 L2140 525 L${GLACIS_TOP_X} ${GLACIS_TOP_Y} Z`}
              fill={P2D.steelLo}
              stroke={P2D.stroke}
              strokeWidth={4.5}
            />
            <path
              d={`M${GLACIS_BOT_X} ${GLACIS_BOT_Y} L1340 818 L1428 818 L${GLACIS_BOT_X + RHA_PX} ${GLACIS_BOT_Y} Z`}
              fill={P2D.steelMid}
              stroke={P2D.stroke}
              strokeWidth={3.5}
            />
            <g>
              {[1445, 1615, 1785, 1955].map((sx, idx) => (
                <rect
                  key={`sk-${idx}`}
                  x={sx}
                  y={728}
                  width={162}
                  height={64}
                  rx={5}
                  fill={P2D.steelMid}
                  stroke={P2D.stroke}
                  strokeWidth={3}
                />
              ))}
            </g>

            {/* Khoang kíp lái bên trong thân xe (phía sau mặt giáp trong x = 1565) — nguyên vẹn tuyệt đối */}
            <path
              d={`M${GLACIS_TOP_X + RHA_PX + 10} ${GLACIS_TOP_Y + 14} L2090 ${GLACIS_TOP_Y + 14} L2090 718 L${GLACIS_BOT_X + RHA_PX + 14} 718 Z`}
              fill="#0c1724"
              stroke={mix(P2D.slateRule, P2D.radar, safeAura * 0.8)}
              strokeWidth={2.5}
            />
            <g opacity={0.76}>
              <path
                d="M1735 698 L1845 698 L1895 604 L1868 594 L1825 674 L1735 674 Z"
                fill={P2D.slatePanel}
                stroke={P2D.slateRule}
                strokeWidth={2}
              />
              <path d="M1618 698 L1665 628 L1695 636" fill="none" stroke={P2D.slateRule} strokeWidth={4} strokeLinecap="round" />
              <rect x={1595} y={566} width={58} height={38} rx={4} fill="#13293d" stroke={P2D.armorSafe} strokeWidth={1.8} />
              <path d="M1535 525 L1550 494 L1595 494 L1602 525 Z" fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={3} />
              <rect x={1540} y={499} width={22} height={14} fill={P2D.armorSafeHi} />
            </g>

            {/* --- Nòng pháo chính 120mm L/55 của chiếc MBT (ở cao độ y = 422, tách biệt hoàn toàn trên đường đạn y = 615) --- */}
            <g opacity={0.92}>
              <path
                d="M1265 412 L1608 418 L1608 446 L1265 438 Z"
                fill={P2D.steelMid}
                stroke={P2D.stroke}
                strokeWidth={3.5}
              />
              <path d="M1265 415 L1608 421 L1608 428 L1265 422 Z" fill={P2D.steelHi} />
              <rect x={1115} y={404} width={154} height={42} rx={7} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={3.5} />
              <rect x={1119} y={427} width={146} height={16} rx={4} fill={P2D.steelLo} />
              <path
                d="M685 408 L1115 412 L1115 434 L685 428 Z"
                fill={P2D.steelMid}
                stroke={P2D.stroke}
                strokeWidth={3.5}
              />
              <path d="M685 410 L1115 414 L1115 420 L685 416 Z" fill={P2D.steelHi} />
              <rect x={665} y={403} width={26} height={30} rx={3} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={3} />
              <rect x={672} y={391} width={14} height={14} rx={2} fill={P2D.armorSafe} stroke={P2D.stroke} strokeWidth={2} />
            </g>

            {/* --- Tháp pháo cắt dọc phía trên-sau (x = 1600..2130, y = 335..525) --- */}
            <g>
              <path
                d="M1600 442 L1705 348 L2130 340 L2130 524 L1685 524 Z"
                fill={P2D.steelLo}
                stroke={P2D.stroke}
                strokeWidth={4.5}
              />
              <path d="M1805 366 L2110 362 L2110 508 L1805 508 Z" fill="#0c1724" stroke={P2D.slateGrid} strokeWidth={2} />
              <rect x={1795} y={404} width={135} height={64} rx={6} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3} />
              <path d={cheekLayerPath(0, 32)} fill={mix(P2D.steelHi, P2D.armorSafeHi, 0.55 * pArmorLit)} stroke={P2D.stroke} strokeWidth={3} />
              <path d={cheekLayerPath(32, 96)} fill="#182b3f" stroke={P2D.stroke} strokeWidth={2.5} />
              <path d={cheekLayerPath(96, 158)} fill={P2D.ceramicHi} stroke={P2D.stroke} strokeWidth={2.5} />
              <path d={cheekLayerPath(158, 196)} fill={mix(P2D.steelMid, P2D.armorSafe, 0.45 * pArmorLit)} stroke={P2D.stroke} strokeWidth={3} />
              <rect x={1835} y={294} width={76} height={48} rx={6} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3.5} />
              <rect x={1830} y={304} width={22} height={26} rx={3} fill={P2D.armorSafeHi} stroke={P2D.stroke} strokeWidth={2} />
              <path d="M1965 342 L1980 316 L2065 316 L2078 342 Z" fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={3} />
            </g>

            {/* ==================== 3. KHỐI GIÁP TRƯỚC VÁT NGHIÊNG ĐA LỚP (TÂM ĐIỂM S02) ==================== */}
            <g>
              {/* Lớp 1 (dx = 0..36): Thép giáp độ cứng siêu cao mặt ngoài (Outer HHA Plate) */}
              <path
                d={glacisLayerPath(0, 36)}
                fill={mix(P2D.steelHi, P2D.armorSafeHi, 0.76 * prog(pArmorLit, 0, 0.35))}
                stroke={P2D.stroke}
                strokeWidth={3.2}
              />

              {/* Lớp 2 (dx = 36..102): Khoang giáp phản ứng phi nổ NERA */}
              <path d={glacisLayerPath(36, 102)} fill="#132436" stroke={P2D.stroke} strokeWidth={2.8} />
              <g clipPath="url(#glacisClip)">
                {Array.from({ length: 7 }, (_, i) => {
                  const ry = 532 + i * 27;
                  return (
                    <line
                      key={`nera-${i}`}
                      x1={1155}
                      y1={ry - 18}
                      x2={1560}
                      y2={ry + 28}
                      stroke={mix(P2D.ceramicLo, P2D.armorSafeHi, 0.85 * prog(pArmorLit, 0.15, 0.55))}
                      strokeWidth={5.5}
                    />
                  );
                })}
              </g>

              {/* Lớp 3 (dx = 102..192): Lõi gốm tổ ong Ceramic (Alumina / Silicon Carbide) */}
              <path
                d={glacisLayerPath(102, 192)}
                fill={mix(P2D.ceramicLo, P2D.armorSafe, 0.58 * prog(pArmorLit, 0.3, 0.75))}
                stroke={P2D.stroke}
                strokeWidth={2.8}
              />
              <g clipPath="url(#glacisClip)">
                {Array.from({ length: 8 }, (_, r) => {
                  const cy = 528 + r * 24;
                  const shift = (r % 2) * 22;
                  return (
                    <g key={`cer-${r}`}>
                      <line x1={1200} y1={cy} x2={1660} y2={cy} stroke={P2D.slateDeep} strokeWidth={2.2} opacity={0.75} />
                      {[0, 1, 2, 3, 4, 5].map((c) => (
                        <rect
                          key={c}
                          x={1245 + shift + c * 44}
                          y={cy + 3}
                          width={38}
                          height={18}
                          rx={2}
                          fill={mix(P2D.ceramicHi, P2D.armorSafeHi, 0.55 * prog(pArmorLit, 0.35, 0.8))}
                          opacity={0.74}
                        />
                      ))}
                    </g>
                  );
                })}
              </g>

              {/* Lớp 4 (dx = 192..254): Tấm thép hợp kim nặng chịu lực chính (RHA / Heavy Alloy Backing) */}
              <path
                d={glacisLayerPath(192, 254)}
                fill={mix(P2D.steelMid, '#2368a8', 0.8 * prog(pArmorLit, 0.5, 0.9))}
                stroke={P2D.stroke}
                strokeWidth={2.8}
              />
              <path d={glacisLayerPath(192, 254)} fill="url(#steelHatch)" />

              {/* Lớp 5 (dx = 254..280): Lớp lót sợi Kevlar/Aramid chống văng mảnh bảo vệ kíp lái */}
              <path
                d={glacisLayerPath(254, RHA_PX)}
                fill={mix('#1b3347', '#1c6d7a', 0.88 * prog(pArmorLit, 0.65, 1.0))}
                stroke={P2D.stroke}
                strokeWidth={3}
              />
              <path d={glacisLayerPath(254, RHA_PX)} fill="url(#spallWeave)" />

              {/* Xung sáng hấp thụ chấn động khi đạn đập vào lúc 7.88s (chỉ dừng ở lớp ngoài, không lọt qua gốm!) */}
              {impactFlash > 0.01 && (
                <g clipPath="url(#glacisClip)">
                  <circle
                    cx={IMPACT_X + 18}
                    cy={SHOT_Y}
                    r={24 + (1 - impactFlash) * 76}
                    fill="none"
                    stroke={P2D.armorSafeHi}
                    strokeWidth={8 * impactFlash}
                    opacity={impactFlash * 0.92}
                  />
                </g>
              )}

              {/* Viền phát sáng tổng thể khối giáp trước */}
              <path
                d={glacisLayerPath(0, RHA_PX)}
                fill="none"
                stroke={mix(P2D.steelHi, P2D.armorSafeHi, pArmorLit)}
                strokeWidth={4.4}
                filter={pArmorLit > 0.2 ? 'url(#glow)' : undefined}
                opacity={0.5 + 0.5 * pArmorLit}
              />

              {/* Vách trong nguyên vẹn tuyệt đối sáng xanh lục lam bất khả xâm phạm sau cú bắn */}
              {safeAura > 0.01 && (
                <line
                  x1={GLACIS_BOT_X + RHA_PX + 3}
                  y1={GLACIS_BOT_Y}
                  x2={GLACIS_TOP_X + RHA_PX + 3}
                  y2={GLACIS_TOP_Y}
                  stroke={P2D.radar}
                  strokeWidth={6}
                  strokeLinecap="round"
                  filter="url(#glow)"
                  opacity={safeAura}
                />
              )}

              {/* Vết lõm xước cực nông nóng đỏ trên bề mặt thép ngoài cùng sau cú chặn đạn lúc 7.88s */}
              {hasHit && (
                <g>
                  <ellipse
                    cx={IMPACT_X + 4}
                    cy={SHOT_Y}
                    rx={8}
                    ry={15}
                    transform={`rotate(-31 ${IMPACT_X + 4} ${SHOT_Y})`}
                    fill={mix('#43566b', P2D.jetMid, Math.max(0.25, Math.exp(-dtHit * 1.1)))}
                    stroke={mix(P2D.armorSafeHi, P2D.jetCore, Math.max(0.2, Math.exp(-dtHit * 1.6)))}
                    strokeWidth={2.4}
                  />
                  <circle
                    cx={IMPACT_X + 2}
                    cy={SHOT_Y}
                    r={4.5}
                    fill={P2D.jetCore}
                    opacity={Math.max(0.25, Math.exp(-dtHit * 1.0))}
                  />
                </g>
              )}
            </g>
          </g>

          {/* Cung đo góc nghiêng kỹ thuật của tấm giáp vát trước (31° glacis angle arc) */}
          {pSlopeGeo > 0.01 && (
            <g opacity={0.78 * pSlopeGeo}>
              <line
                x1={GLACIS_BOT_X - 115}
                y1={GLACIS_BOT_Y}
                x2={GLACIS_BOT_X + 105}
                y2={GLACIS_BOT_Y}
                stroke={P2D.slateRule}
                strokeWidth={2}
                strokeDasharray="6 5"
              />
              {/* Cung tròn góc nghiêng giáp ở mũi dưới (1135, 705) */}
              <path
                d={`M${GLACIS_BOT_X + 76} ${GLACIS_BOT_Y} A 76 76 0 0 0 ${GLACIS_BOT_X + 65} ${GLACIS_BOT_Y - 39}`}
                fill="none"
                stroke={P2D.armorSafeHi}
                strokeWidth={2.5}
              />
              {/* Vạch bề dày vuông góc mỏng (T_norm) so sánh trực quan với đường ngang dài L_eff */}
              <line
                x1={1210}
                y1={660}
                x2={1210 + 74}
                y2={660 + 123}
                stroke={P2D.slateMuted}
                strokeWidth={1.8}
                strokeDasharray="4 4"
                opacity={0.55}
              />
            </g>
          )}

          {/* ==================== 4. THƯỚC QUY ĐỔI BỀ DÀY NGANG 800 MM RHA (CUE.s02_800mm = 5.84 s) ==================== */}
          {pRha > 0.005 && (
            <g opacity={Math.min(1, pRha * 2.2)}>
              {/* Đường cắt ngang hiệu dụng L_eff đi xuyên qua giáp nghiêng tại đúng cao độ bắn y = 615 */}
              <line
                x1={IMPACT_X}
                y1={SHOT_Y}
                x2={lerp(IMPACT_X, INNER_X, pRha)}
                y2={SHOT_Y}
                stroke={P2D.armorSafeHi}
                strokeWidth={3.8}
                strokeDasharray="10 7"
              />
              <circle cx={IMPACT_X} cy={SHOT_Y} r={6} fill={P2D.armorSafeHi} stroke={P2D.slateDeep} strokeWidth={2} />
              {pRha > 0.85 && (
                <circle cx={INNER_X} cy={SHOT_Y} r={6.5} fill={P2D.radar} stroke={P2D.slateDeep} strokeWidth={2} />
              )}

              {/* Hai đường gióng kích thước thẳng đứng từ mặt ngoài (x=1285) và mặt trong (x=1565) lên khối RHA chuẩn */}
              <line
                x1={IMPACT_X}
                y1={SHOT_Y - 10}
                x2={IMPACT_X}
                y2={lerp(SHOT_Y - 10, 218, pRha)}
                stroke={P2D.armorSafeHi}
                strokeWidth={2.2}
                strokeDasharray="8 6"
                opacity={0.85}
              />
              <line
                x1={lerp(IMPACT_X, INNER_X, pRha)}
                y1={SHOT_Y - 10}
                x2={lerp(IMPACT_X, INNER_X, pRha)}
                y2={lerp(SHOT_Y - 10, 218, pRha)}
                stroke={P2D.armorSafeHi}
                strokeWidth={2.2}
                strokeDasharray="8 6"
                opacity={0.85}
              />

              {/* Khối thép chuẩn đồng nhất RHA 800 mm (8 mô-đun x 100 mm = 280 px) có cạnh vát 3D */}
              {(() => {
                const curW = RHA_PX * pRha;
                const barY = 248;
                const barH = 56;
                return (
                  <g filter="url(#sh)">
                    <path
                      d={`M${IMPACT_X} ${barY} L${IMPACT_X + 12} ${barY - 12} L${IMPACT_X + curW + 12} ${barY - 12} L${IMPACT_X + curW} ${barY} Z`}
                      fill={P2D.armorSafeHi}
                      stroke={P2D.stroke}
                      strokeWidth={2.2}
                    />
                    <path
                      d={`M${IMPACT_X + curW} ${barY} L${IMPACT_X + curW + 12} ${barY - 12} L${IMPACT_X + curW + 12} ${barY + barH - 12} L${IMPACT_X + curW} ${barY + barH} Z`}
                      fill="#174975"
                      stroke={P2D.stroke}
                      strokeWidth={2.2}
                    />
                    <rect
                      x={IMPACT_X}
                      y={barY}
                      width={curW}
                      height={barH}
                      fill="url(#rhaBarFace)"
                      stroke={P2D.stroke}
                      strokeWidth={3}
                    />
                    <rect x={IMPACT_X} y={barY} width={curW} height={barH} fill="url(#steelHatch)" />

                    {/* 8 vạch chia từng 100 mm trên khối thép 800 mm */}
                    {Array.from({ length: 7 }, (_, k) => {
                      const sx = IMPACT_X + (k + 1) * 35;
                      if (sx > IMPACT_X + curW - 3) return null;
                      return (
                        <g key={`seg-${k}`}>
                          <line
                            x1={sx}
                            y1={barY + 2}
                            x2={sx}
                            y2={barY + barH - 2}
                            stroke={P2D.slateDeep}
                            strokeWidth={2}
                            opacity={0.55}
                          />
                          <line
                            x1={sx}
                            y1={barY}
                            x2={sx + 12}
                            y2={barY - 12}
                            stroke={P2D.slateDeep}
                            strokeWidth={1.6}
                            opacity={0.45}
                          />
                        </g>
                      );
                    })}

                    {/* Vết xước đối chiếu trên thanh RHA chuẩn sau cú bắn (<5% bề dày 800 mm!) */}
                    {hasHit && curW > 200 && (
                      <rect
                        x={IMPACT_X + 1}
                        y={barY + 14}
                        width={11}
                        height={28}
                        rx={3}
                        fill={mix(P2D.jetOuter, P2D.jetMid, Math.max(0.3, Math.exp(-dtHit * 1.2)))}
                      />
                    )}

                    {/* Mũi tên gióng kích thước hai đầu phía trên khối thép */}
                    <line
                      x1={IMPACT_X + 6}
                      y1={222}
                      x2={Math.max(IMPACT_X + 12, IMPACT_X + curW - 6)}
                      y2={222}
                      stroke={P2D.armorSafeHi}
                      strokeWidth={3}
                    />
                    <path d={`M${IMPACT_X + 16} 215 L${IMPACT_X + 3} 222 L${IMPACT_X + 16} 229 Z`} fill={P2D.armorSafeHi} />
                    {curW > 40 && (
                      <path
                        d={`M${IMPACT_X + curW - 16} 215 L${IMPACT_X + curW - 3} 222 L${IMPACT_X + curW - 16} 229 Z`}
                        fill={P2D.armorSafeHi}
                      />
                    )}
                  </g>
                );
              })()}
            </g>
          )}

          {/* ==================== 5. BỆ PHÁO THỬ ĐẠN ĐẠO BÊN TRÁI & ĐẠN XUYÊN ĐỘNG NĂNG APFSDS ==================== */}
          {/* Đường trục chuẩn & tia laser khóa điểm bắn trực diện (y = 615) */}
          {pLaser > 0.01 && (
            <g>
              <line
                x1={MUZZLE_X}
                y1={SHOT_Y}
                x2={IMPACT_X}
                y2={SHOT_Y}
                stroke={mix(P2D.slateRule, P2D.weakRed, laserLock)}
                strokeWidth={lerp(1.6, 2.4, laserLock)}
                strokeDasharray="14 10"
                opacity={lerp(0.32, 0.72, laserLock) * pLaser}
              />
              {laserLock > 0.05 && (
                <g transform={`translate(${IMPACT_X} ${SHOT_Y})`} opacity={0.85 * laserLock}>
                  <circle r={16} fill="none" stroke={P2D.weakRed} strokeWidth={2.2} />
                  <line x1={-24} y1={0} x2={-9} y2={0} stroke={P2D.weakRed} strokeWidth={2.2} />
                  <line x1={0} y1={-24} x2={0} y2={-9} stroke={P2D.weakRed} strokeWidth={2.2} />
                  <line x1={0} y1={9} x2={0} y2={24} stroke={P2D.weakRed} strokeWidth={2.2} />
                </g>
              )}
            </g>
          )}

          {/* Bệ giá pháo thử nghiệm đạn đạo cố định xuống sàn thép bên trái (x = 45..306) */}
          <g filter="url(#sh)">
            {/* Chân đế chữ A bắt bu-lông xuống sàn trường bắn */}
            <path
              d={`M35 ${FLOOR_Y} L78 655 L178 655 L228 ${FLOOR_Y} Z`}
              fill={P2D.steelDark}
              stroke={P2D.stroke}
              strokeWidth={4}
            />
            <path
              d={`M58 ${FLOOR_Y} L94 672 L162 672 L204 ${FLOOR_Y} Z`}
              fill={P2D.slatePanel}
              stroke={P2D.steelLo}
              strokeWidth={2.5}
            />
            {/* Xi-lanh thủy lực hãm giật & bệ đỡ ngõng pháo */}
            <rect x={64} y={564} width={132} height={96} rx={8} fill={P2D.steelLo} stroke={P2D.stroke} strokeWidth={3.8} />
            <rect x={76} y={550} width={108} height={22} rx={4} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={2.8} />
            <circle cx={130} cy={615} r={24} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={3} />
            {/* Tấm khiên chắn sóng nổ trường bắn */}
            <path d="M214 532 L232 532 L232 708 L214 708 Z" fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3} />

            {/* Khối khóa nòng & ống nòng pháo 120mm giật lùi khi bắn */}
            <g transform={`translate(${-testGunRecoil} 0)`}>
              <rect x={-18} y={SHOT_Y - 30} width={165} height={60} rx={5} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3.5} />
              <rect x={142} y={SHOT_Y - 19} width={144} height={38} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3.5} />
              <rect x={142} y={SHOT_Y - 15} width={144} height={11} fill={P2D.steelHi} />
              <rect x={282} y={SHOT_Y - 26} width={24} height={52} rx={4} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={3.5} />
            </g>
          </g>

          {/* Chớp lửa đầu nòng gọn sắc nét lúc 7.45 s */}
          <Muzzle2D t={t} at={CUE.s02_shot_fire} x={MUZZLE_X + 4} y={SHOT_Y} angle={0} size={42} seed={5} />

          {/* Hai guốc đạn (discarding sabot petals) bung tách lên/xuống sau khi rời đầu nòng */}
          {t >= CUE.s02_shot_fire + 0.03 && t < CUE.s02_shot_fire + 0.52 && (() => {
            const ds = t - (CUE.s02_shot_fire + 0.03);
            const sx = MUZZLE_X + 95 + ds * 860;
            const sy = 16 + ds * 185;
            const op = Math.max(0, 1 - ds / 0.49);
            return (
              <g opacity={op}>
                <path
                  d="M-24 -7 L22 -11 L26 -3 L-20 4 Z"
                  fill={P2D.steelHi}
                  stroke={P2D.stroke}
                  strokeWidth={2}
                  transform={`translate(${sx} ${SHOT_Y - sy}) rotate(${-ds * 210})`}
                />
                <path
                  d="M-24 7 L22 11 L26 3 L-20 -4 Z"
                  fill={P2D.steelMid}
                  stroke={P2D.stroke}
                  strokeWidth={2}
                  transform={`translate(${sx} ${SHOT_Y + sy}) rotate(${ds * 210})`}
                />
              </g>
            );
          })()}

          {/* Thanh xuyên dưới cỡ APFSDS bay siêu tốc ở độ cao tâm giáp y = 615 (7.45 -> 7.88 s) */}
          {inFlight && (
            <g>
              <rect
                x={Math.max(MUZZLE_X + 16, dartTipX - 420)}
                y={SHOT_Y - 7}
                width={Math.max(10, dartTipX - 148 - Math.max(MUZZLE_X + 16, dartTipX - 420))}
                height={14}
                rx={7}
                fill="url(#apfsdsWake)"
                filter="url(#glow)"
              />
              <path
                d={`M${dartTipX - 165} ${SHOT_Y - 54} L${dartTipX + 4} ${SHOT_Y} L${dartTipX - 165} ${SHOT_Y + 54}`}
                fill="none"
                stroke={P2D.jetCore}
                strokeWidth={2.2}
                opacity={0.58}
              />
              <path
                d={`M${dartTipX - 115} ${SHOT_Y - 28} L${dartTipX + 2} ${SHOT_Y} L${dartTipX - 115} ${SHOT_Y + 28}`}
                fill="none"
                stroke={P2D.jetMid}
                strokeWidth={1.8}
                opacity={0.72}
              />

              <g transform={`translate(${dartTipX} ${SHOT_Y})`}>
                <path
                  d="M-168 -19 L-142 -6 L-136 -6 L-154 -19 Z M-168 19 L-142 6 L-136 6 L-154 19 Z"
                  fill={P2D.steelHi}
                  stroke={P2D.stroke}
                  strokeWidth={2}
                />
                <path
                  d="M-164 -5.5 L-28 -5.5 L0 0 L-28 5.5 L-164 5.5 Z"
                  fill="#d5e4f2"
                  stroke={P2D.stroke}
                  strokeWidth={2.2}
                />
                <path d="M-162 -2.5 L-26 -2.5 L-2 0 L-26 0.5 L-162 0.5 Z" fill="#ffffff" opacity={0.85} />
                <path d="M-32 -5 L4 0 L-32 5 Z" fill={P2D.jetCore} filter="url(#glow)" />
              </g>
            </g>
          )}

          {/* ==================== 6. VA CHẠM CHẶN ĐỨNG & GÃY VĂNG THANH XUYÊN (CUE.s02_shot_block = 7.88 s) ==================== */}
          {hasHit && (
            <g>
              {/* Vòng sóng xung kích kép tỏa tròn cực nhanh tại điểm chạm (1285, 615) */}
              {dtHit < 0.65 && (
                <>
                  <circle
                    cx={IMPACT_X}
                    cy={SHOT_Y}
                    r={22 + (1 - (1 - Math.min(1, dtHit / 0.62)) ** 3) * 275}
                    fill="none"
                    stroke={P2D.jetCore}
                    strokeWidth={7 * (1 - dtHit / 0.65)}
                    opacity={0.92 * (1 - dtHit / 0.65)}
                  />
                  <circle
                    cx={IMPACT_X}
                    cy={SHOT_Y}
                    r={14 + (1 - (1 - Math.min(1, dtHit / 0.48)) ** 3) * 175}
                    fill="none"
                    stroke={P2D.armorSafeHi}
                    strokeWidth={4.5 * Math.max(0, 1 - dtHit / 0.5)}
                    opacity={0.88 * Math.max(0, 1 - dtHit / 0.5)}
                  />
                </>
              )}

              {/* Quả cầu lửa va chạm gọn mạnh (tan nhanh để lộ rõ mặt giáp nguyên vẹn & mảnh đạn gãy) */}
              <Blast2D
                t={t}
                at={CUE.s02_shot_block}
                x={IMPACT_X}
                y={SHOT_Y}
                size={56}
                air={true}
                life={1.25}
                seed={9}
                smoke="#5b6f85"
              />

              {/* Vệt quỹ đạo tàn lửa cong của 4 mảnh thanh xuyên bị bẻ gãy bật dội ngược */}
              {dtHit < 2.8 &&
                ROD_FRAGMENTS.map((f, idx) => {
                  const steps = 10;
                  const pts: string[] = [];
                  for (let s = 0; s <= steps; s++) {
                    const tau = dtHit * (s / steps);
                    const [px, py] = fragPosAt(f, tau);
                    pts.push(`${s === 0 ? 'M' : 'L'}${px.toFixed(1)} ${py.toFixed(1)}`);
                  }
                  const trailOp = Math.max(0.18, 0.72 * Math.exp(-dtHit * 0.65));
                  return (
                    <path
                      key={`ftrail-${idx}`}
                      d={pts.join(' ')}
                      fill="none"
                      stroke={mix(P2D.copper, P2D.jetMid, Math.exp(-dtHit * 0.8))}
                      strokeWidth={2.4}
                      strokeDasharray="7 6"
                      opacity={trailOp}
                    />
                  );
                })}

              {/* Chùm tia lửa kim loại nóng trắng bắn dội ngược dọc theo mặt nghiêng tấm giáp */}
              {dtHit < 1.85 &&
                Array.from({ length: 20 }, (_, i) => {
                  const ang = ((105 + 138 * rnd(i * 7 + 3)) * Math.PI) / 180;
                  const spd = 210 + 340 * rnd(i * 11 + 5);
                  const sx = IMPACT_X + Math.cos(ang) * spd * dtHit;
                  const sy = SHOT_Y + Math.sin(ang) * spd * dtHit + 220 * dtHit * dtHit;
                  if (sy > FLOOR_Y - 4) return null;
                  const vx = Math.cos(ang) * spd;
                  const vy = Math.sin(ang) * spd + 440 * dtHit;
                  const tail = 0.055 * Math.max(0.3, 1 - dtHit / 1.85);
                  const hot = Math.max(0, 1 - dtHit / 1.8);
                  return (
                    <line
                      key={`spk-${i}`}
                      x1={sx}
                      y1={sy}
                      x2={sx - vx * tail}
                      y2={sy - vy * tail}
                      stroke={dtHit < 0.35 ? P2D.jetCore : mix(P2D.jetOuter, P2D.jetMid, hot)}
                      strokeWidth={2.6 + 2.2 * hot}
                      strokeLinecap="round"
                      opacity={hot}
                    />
                  );
                })}

              {/* 4 mảnh thanh xuyên tungsten gãy vụn, nóng đỏ xoay tít văng dội ngược ra ngoài */}
              {dtHit < 2.9 &&
                ROD_FRAGMENTS.map((f, idx) => {
                  const [fx, fy, rot] = fragPosAt(f, dtHit);
                  const heat = Math.max(0.28, Math.exp(-dtHit * 0.72));
                  const bodyCol = mix('#8fa8c2', P2D.jetMid, heat * 0.85);
                  const edgeGlow = mix(P2D.jetOuter, P2D.jetCore, heat);
                  return (
                    <g key={`frag-${idx}`} transform={`translate(${fx} ${fy}) rotate(${rot})`} filter="url(#sh)">
                      {f.fins && (
                        <path
                          d="M-36 -21 L-12 -6 L-4 -6 L-22 -21 Z M-36 21 L-12 6 L-4 6 L-22 21 Z"
                          fill={P2D.steelHi}
                          stroke={P2D.stroke}
                          strokeWidth={2.2}
                        />
                      )}
                      <path d={f.shape} fill={bodyCol} stroke={P2D.stroke} strokeWidth={2.6} />
                      <line x1={-18} y1={-2} x2={14} y2={-2} stroke="#fff8e7" strokeWidth={2} opacity={0.55 * heat} />
                      {/* Vết gãy kim loại nóng đỏ rực ở hai đầu mảnh vỡ */}
                      <circle cx={22} cy={0} r={6.5 * heat + 2.5} fill={edgeGlow} opacity={0.95 * heat} />
                      {idx > 0 && <circle cx={-28} cy={0} r={5.5 * heat + 2} fill={edgeGlow} opacity={0.9 * heat} />}
                    </g>
                  );
                })}
            </g>
          )}
        </Layer>
      </Cam2D>

      {/* Lớp hạt bề mặt phim kỹ thuật */}
      <Grain opacity={0.35} />

      {/* Nhãn duy nhất của cảnh: "800 mm RHA" giữ sắc nét trọn vẹn qua mốc 10.2s */}
      {t >= CUE.s02_800mm && t < 10.5 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: labelFadeOut }}>
          <Label
            t={t}
            text="800 mm RHA"
            x={940}
            y={170}
            from={CUE.s02_800mm}
            until={10.24}
            size={56}
            bg={P2D.armorSafe}
            fg={P2D.slateDeep}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

export default S02;
