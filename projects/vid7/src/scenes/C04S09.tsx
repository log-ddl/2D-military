// C04S09 (777.84–796.80 s) — THUẦN 2D: Hải đồ chiến lược Thái Bình Dương & hiệu ứng Domino Tokyo -> Midway
// Nhịp 1 (777.84–783.00 s): Chấn động đỏ tại Tokyo; tiêm kích Nhật rút ngược từ tiền tuyến về bao vây bảo vệ chính quốc.
// Nhịp 2 (783.04–789.50 s): Mở rộng sang rạn san hô Midway; 4 tàu sân bay đỏ Kido Butai lao thẳng vào gọng kìm phục kích của 3 tàu sân bay Mỹ.
// Nhịp 3 (789.78–796.80 s): Khung bản vẽ đối chiếu sàn tàu 467 ft + B-25B (thước ngắm 20 xu & cán chổi sơn đen) truyền chuỗi domino vàng kích nổ tâm ngắm Midway.
// TUYỆT ĐỐI KHÔNG DÙNG THẺ <text> SVG — chỉ dùng ký hiệu trực quan và duy nhất 1 <Label text="MIDWAY · 7 WEEKS LATER" />.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld } from '@core/frame';
import { bump, lerp, prog, useSpring, useT } from '@core/time';
import { Blast2D } from '@skill/military/2d/fx';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { arcAngle, arcAt, arcPath, drawOn, smoothPath, type Pt } from '@skill/military/2d/path';
import { contours } from '@skill/military/2d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { P2D } from '../design/palette';
import { B25Cutaway2D, B25Top2D, CarrierTop2D, CompassRose2D, WarshipIcon2D } from '../parts/Silhouettes2D';

// ---------------- Toạ độ địa lý trên hải đồ thế giới (0..3000 × 0..1600) ----------------
const TOKYO: Pt = [612, 612];
const HONSHU_CENTER: Pt = [565, 600];
const HORNET_ORIGIN: Pt = [1015, 552];
const MIDWAY: Pt = [2145, 705];
const AMBUSH_ZONE: Pt = [1948, 675];

// Biên dạng địa lý Bắc Thái Bình Dương (đất liền đổ khối 3 tông + đường đồng mức)
const ASIAN_MAINLAND: Pt[] = [
  [-320, 90],
  [360, 95],
  [410, 175],
  [335, 250],
  [270, 315],
  [298, 395], // Bán đảo Triều Tiên Bắc
  [332, 488],
  [318, 560], // Mũi Nam Triều Tiên
  [278, 550],
  [255, 468],
  [198, 430], // Vịnh Hoàng Hải
  [162, 515],
  [208, 605], // Sơn Đông / Giang Tô
  [222, 695], // Thượng Hải / Chiết Giang
  [188, 795], // Phúc Kiến
  [120, 895],
  [35, 980],
  [-320, 1020],
];

const HOKKAIDO_PTS: Pt[] = [
  [618, 338],
  [648, 282],
  [698, 268],
  [738, 306],
  [724, 345],
  [672, 362],
  [642, 386],
  [615, 372],
];

const HONSHU_PTS: Pt[] = [
  [615, 408],
  [642, 422],
  [648, 486],
  [645, 552],
  [638, 604], // Boso / Vịnh Tokyo
  [612, 616], // Tokyo
  [594, 636], // Izu
  [558, 654], // Nagoya
  [522, 686], // Kii / Osaka
  [474, 706],
  [428, 726], // Chugoku / Shimonoseki
  [422, 696],
  [468, 662],
  [516, 632],
  [532, 586], // Bán đảo Noto
  [556, 574],
  [584, 526],
  [592, 456],
];

const HONSHU_HIGHLAND: Pt[] = [
  [608, 452],
  [624, 528],
  [606, 594],
  [554, 628],
  [485, 678],
  [462, 668],
  [538, 608],
  [582, 535],
];

const SHIKOKU_PTS: Pt[] = [
  [466, 732],
  [516, 720],
  [524, 750],
  [472, 764],
];

const KYUSHU_PTS: Pt[] = [
  [412, 742],
  [452, 754],
  [456, 818],
  [426, 862],
  [398, 842],
  [394, 782],
];

const SMALL_ISLANDS: { cx: number; cy: number; rx: number; ry: number; rot: number }[] = [
  // Quần đảo Kuril phía Đông Bắc Hokkaido
  { cx: 778, cy: 256, rx: 16, ry: 6, rot: -32 },
  { cx: 825, cy: 222, rx: 20, ry: 6, rot: -35 },
  { cx: 878, cy: 186, rx: 18, ry: 5, rot: -36 },
  // Chuỗi Ryukyu / Okinawa phía Tây Nam Kyushu
  { cx: 382, cy: 896, rx: 9, ry: 5, rot: -45 },
  { cx: 348, cy: 938, rx: 14, ry: 5, rot: -42 },
  { cx: 306, cy: 978, rx: 11, ry: 4.5, rot: -38 },
  // Đài Loan (Formosa)
  { cx: 235, cy: 985, rx: 36, ry: 16, rot: -72 },
  // Chuỗi Bonin / Iwo Jima phía Nam Tokyo
  { cx: 632, cy: 745, rx: 6, ry: 4, rot: 12 },
  { cx: 646, cy: 825, rx: 8, ry: 4.5, rot: 18 },
  { cx: 658, cy: 910, rx: 9, ry: 5, rot: 14 },
  // Dải Hawaii xa phía Đông Nam Midway
  { cx: 2585, cy: 965, rx: 14, ry: 8, rot: 25 },
  { cx: 2645, cy: 995, rx: 18, ry: 10, rot: 28 },
  { cx: 2720, cy: 1042, rx: 28, ry: 18, rot: 22 },
];

// Vùng thềm biển nông & trung bình (3 tầng chiều sâu P2D.seaDeep -> seaMid -> seaShallow)
const SEA_MID_WEST = smoothPath(
  [
    [-340, 50],
    [980, 75],
    [1080, 320],
    [940, 640],
    [880, 980],
    [620, 1280],
    [-340, 1340],
  ],
  true,
);

const SEA_SHALLOW_WEST = smoothPath(
  [
    [-320, 80],
    [795, 195],
    [785, 450],
    [710, 695],
    [540, 945],
    [320, 1085],
    [-320, 1120],
  ],
  true,
);

const SEA_MID_EAST = smoothPath(
  [
    [1760, 495],
    [2120, 465],
    [2480, 640],
    [2860, 960],
    [2820, 1185],
    [2380, 985],
    [1940, 865],
    [1720, 685],
  ],
  true,
);

const SEA_SHALLOW_MIDWAY = smoothPath(
  [
    [1995, 620],
    [2165, 585],
    [2310, 675],
    [2285, 815],
    [2095, 835],
    [1975, 735],
  ],
  true,
);

// 6 mũi tiêm kích tiền tuyến Nhật rút ngược về bảo vệ chính quốc (Nhịp 1: 780.06–783.00 s)
const FRONTLINE_SECTORS: { from: Pt; to: Pt; apex: number; orbitAng: number }[] = [
  { from: [945, 255], to: [652, 445], apex: -48, orbitAng: -55 }, // Mặt trận Bắc Thái Bình Dương / Kuril
  { from: [1205, 515], to: [725, 560], apex: -35, orbitAng: -8 }, // Vành đai tuần tra Đông Tokyo
  { from: [1105, 855], to: [688, 690], apex: 45, orbitAng: 38 }, // Tuyến đảo Mandates / Marianas
  { from: [745, 1085], to: [565, 772], apex: 38, orbitAng: 88 }, // Mặt trận Nam Thái Bình Dương
  { from: [285, 945], to: [432, 736], apex: -42, orbitAng: 145 }, // Mặt trận Nam Trung Hoa / Formosa
  { from: [215, 535], to: [452, 558], apex: 44, orbitAng: -152 }, // Mặt trận lục địa Trung Hoa
];

// 4 tàu sân bay Kido Butai Nhật lao vào Midway (Akagi, Kaga, Soryu, Hiryu)
const KIDO_FORMATION: { dx: number; dy: number; rot: number }[] = [
  { dx: 40, dy: 2, rot: 4 }, // Akagi (dẫn đầu)
  { dx: -14, dy: -40, rot: 5 }, // Kaga (cánh bắc)
  { dx: -18, dy: 42, rot: 3 }, // Soryu (cánh nam)
  { dx: -68, dy: -2, rot: 4 }, // Hiryu (hậu đội kim cương)
];

// 3 tàu sân bay Mỹ phục kích tại Point Luck phía Đông Bắc Midway (Enterprise, Hornet, Yorktown)
const US_AMBUSH_CARRIERS: {
  pos: Pt;
  rot: number;
  pincerTo: Pt;
  apex: number;
}[] = [
  { pos: [2175, 425], rot: 132, pincerTo: [1955, 618], apex: -48 }, // CV-6 Enterprise
  { pos: [2288, 468], rot: 146, pincerTo: [1998, 658], apex: -24 }, // CV-8 Hornet
  { pos: [2368, 548], rot: 162, pincerTo: [2005, 706], apex: 36 }, // CV-5 Yorktown
];

/** Hình chiếu bằng tiêm kích đánh chặn Nhật (A6M Zero) quy đổi đúng biên dạng, đổ khối 3 tông + phù hiệu Hinomaru */
const JPFighterTop2D: React.FC<{ x: number; y: number; rot: number; scale?: number; opacity?: number }> = ({
  x,
  y,
  rot,
  scale = 1,
  opacity = 1,
}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${scale})`} opacity={opacity}>
    <path
      d="M 4 -2.5 L 2.5 -22 Q 0.5 -25 -2.5 -22.5 L -5.5 -3 L -5.5 3 L -2.5 22.5 Q 0.5 25 2.5 22 L 4 2.5 Z"
      fill={P2D.jpMain}
      stroke={P2D.ink}
      strokeWidth={1.6}
    />
    <path d="M 3.6 -3 L 2.2 -21.2 L 0.2 -21.5 L 1.2 -3 Z M 3.6 3 L 2.2 21.2 L 0.2 21.5 L 1.2 3 Z" fill={P2D.jpLight} opacity={0.55} />
    <path d="M -13 -1.5 L -15 -9.5 L -18 -8.5 L -17 8.5 L -15 9.5 L -13 1.5 Z" fill={P2D.jpDark} stroke={P2D.ink} strokeWidth={1.4} />
    <path
      d="M 16 0 Q 15.5 -3.2 10 -3.4 L -16.5 -1.4 Q -19 0 -16.5 1.4 L 10 3.4 Q 15.5 3.2 16 0 Z"
      fill={P2D.jpDark}
      stroke={P2D.ink}
      strokeWidth={1.6}
    />
    <rect x={11.5} y={-3.1} width={3.6} height={6.2} rx={1.4} fill="#2b1818" stroke={P2D.ink} strokeWidth={1.2} />
    <ellipse cx={2.2} cy={0} rx={3.6} ry={1.7} fill="#9fd0eb" stroke={P2D.ink} strokeWidth={1.1} />
    <circle cx={0} cy={-14} r={3.1} fill={P2D.paper} />
    <circle cx={0} cy={-14} r={2.2} fill="#ff2a22" />
    <circle cx={0} cy={14} r={3.1} fill={P2D.paper} />
    <circle cx={0} cy={14} r={2.2} fill="#ff2a22" />
  </g>
);

/** Mũi tên tam giác đặt tại điểm cuối cung parabol */
const ArrowHead2D: React.FC<{ x: number; y: number; rot: number; size?: number; fill: string; stroke?: string }> = ({
  x,
  y,
  rot,
  size = 16,
  fill,
  stroke = P2D.ink,
}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
    <polygon
      points={`${size * 0.85},0 ${-size * 0.65},${-size * 0.56} ${-size * 0.36},0 ${-size * 0.65},${size * 0.56}`}
      fill={fill}
      stroke={stroke}
      strokeWidth={1.8}
      strokeLinejoin="round"
    />
  </g>
);

/** Con dấu hình học Bộ Tư lệnh Hải quân Nhật (Hoa cúc 16 cánh + Mỏ neo — hoàn toàn không chữ) */
const ImperialCommandSeal2D: React.FC<{ x: number; y: number; scale: number; opacity: number }> = ({ x, y, scale, opacity }) => {
  if (opacity <= 0.01) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
      <circle r={46} fill="rgba(143, 31, 27, 0.22)" stroke={P2D.jpMain} strokeWidth={4} />
      <circle r={39} fill="none" stroke={P2D.jpLight} strokeWidth={1.6} strokeDasharray="6 4" />
      {Array.from({ length: 16 }, (_, i) => (
        <ellipse
          key={i}
          cx={17}
          cy={0}
          rx={12}
          ry={3.4}
          fill={P2D.jpMain}
          stroke={P2D.paper}
          strokeWidth={1}
          transform={`rotate(${i * 22.5})`}
        />
      ))}
      <circle r={9.5} fill={P2D.fuelAmber} stroke={P2D.paper} strokeWidth={1.6} />
      <line x1={0} y1={-6} x2={0} y2={6} stroke={P2D.ink} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M -5 2 Q 0 8 5 2" fill="none" stroke={P2D.ink} strokeWidth={2.2} strokeLinecap="round" />
    </g>
  );
};

/** Chớp sao kích nổ chiến thuật trên từng tàu sân bay Nhật khi chuỗi Domino chạm bẫy Midway (không che lấp tàu bằng khói xám) */
const TacticalImpactStar2D: React.FC<{ x: number; y: number; p: number }> = ({ x, y, p }) => {
  if (p <= 0.01) return null;
  const s = 0.6 + 0.5 * Math.sin(p * Math.PI);
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${s.toFixed(2)})`} opacity={Math.min(1, p * 2)}>
      <circle r={16} fill="rgba(255, 174, 43, 0.32)" stroke={P2D.dangerRed} strokeWidth={2.4} />
      {[0, 45, 90, 135].map((a) => (
        <line
          key={a}
          x1={-15}
          y1={0}
          x2={15}
          y2={0}
          stroke={a % 90 === 0 ? P2D.fuelBright : P2D.dangerRed}
          strokeWidth={a % 90 === 0 ? 3 : 2}
          strokeLinecap="round"
          transform={`rotate(${a})`}
        />
      ))}
      <circle r={5.2} fill="#fff6cc" />
    </g>
  );
};

// Tính đường đồng mức một lần ở cấp module để render tức thời
const JAPAN_CONTOURS = contours('vid7-c04s09-jp', 840, 860, 7, 18, 220);

const C04S09: React.FC = () => {
  const t = useT();

  // ---------------- Chuyển động Camera 2D qua 3 nhịp chiến lược ----------------
  const pPanMidway = prog(t, 783.04, 787.35);
  const pShiftInset = prog(t, 789.65, 791.35);

  const camX = lerp(745, 1435, pPanMidway) + lerp(0, 35, pShiftInset);
  const camY = lerp(655, 705, pPanMidway) + lerp(0, 68, pShiftInset);
  const camZoom = lerp(1.22, 0.86, pPanMidway) - lerp(0, 0.025, pShiftInset);
  const shake = handheld(t, 2.2 + bump(t, CUE.c04_s09_in_tokyo, 0.65) * 6 + bump(t, 795.35, 0.7) * 5, 'c04s09');

  const landPaths = useMemo(
    () => ({
      asia: smoothPath(ASIAN_MAINLAND, true),
      hokkaido: smoothPath(HOKKAIDO_PTS, true),
      honshu: smoothPath(HONSHU_PTS, true),
      honshuHigh: smoothPath(HONSHU_HIGHLAND, true),
      shikoku: smoothPath(SHIKOKU_PTS, true),
      kyushu: smoothPath(KYUSHU_PTS, true),
    }),
    [],
  );

  // ---------------- Tiến độ các sự kiện theo đúng từ voice (CUE) ----------------
  // Nhịp 1: Sóng chấn động mở ngay từ đầu câu "In Tokyo" (777.84 -> 778.34) để khung mở cảnh sống động tức thì!
  const pTokyoShock = prog(t, 777.84, CUE.c04_s09_in_tokyo + 2.8);
  const pRetract = prog(t, CUE.c04_s09_pull_fighters_back, CUE.c04_s09_guard_homeland + 0.65);
  const pHomeGuard = prog(t, CUE.c04_s09_guard_homeland - 0.35, CUE.c04_s09_guard_homeland + 1.0);

  // Nhịp 2: Con dấu Yamamoto (784.82) -> 4 tàu sân bay Kido Butai tiến về Midway -> 3 tàu sân bay Mỹ khép gọng kìm (787.24)
  const sSeal = useSpring(t, CUE.c04_s09_yamamoto_gamble - 0.65, 11, 175);
  const pKidoAdvance = prog(t, CUE.c04_s09_yamamoto_gamble - 0.35, CUE.c04_s09_trap_midway + 0.35);
  const pUsTrap = prog(t, CUE.c04_s09_trap_midway - 0.15, CUE.c04_s09_trap_midway + 1.45);
  const sUsFleet = useSpring(t, CUE.c04_s09_trap_midway - 0.25, 12, 150);

  // Nhịp 3: Khung bản vẽ kỹ thuật 467 ft deck (789.78) + Thước ngắm 20 xu & cán chổi sơn đen (794.32) -> Sóng Domino vàng
  const sInset = useSpring(t, CUE.c04_s09_seven_weeks_467ft, 13, 145);
  const pDeckHighlight = prog(t, 791.0, 792.3);
  const sMarkTwain = useSpring(t, CUE.c04_s09_sights_broomsticks, 11, 165);
  const sBroomsticks = useSpring(t, 795.2, 11, 165);

  // Chuỗi 14 quân cờ Domino chiến lược màu hổ phách truyền từ Tokyo -> thẳng tới tâm ngắm Midway
  const DOMINO_PTS: Pt[] = useMemo(() => {
    const pts: Pt[] = [];
    const total = 14;
    for (let i = 0; i < total; i++) {
      const u = i / (total - 1);
      pts.push(arcAt(TOKYO[0] + 55, TOKYO[1] - 12, AMBUSH_ZONE[0] - 26, AMBUSH_ZONE[1] - 8, 182, u));
    }
    return pts;
  }, []);

  const pDominoWave = prog(t, 790.75, 795.2);
  const kidoHead = arcAt(695, 610, AMBUSH_ZONE[0], AMBUSH_ZONE[1], 112, pKidoAdvance);
  const kidoAng = arcAngle(695, 610, AMBUSH_ZONE[0], AMBUSH_ZONE[1], 112, Math.max(0.02, pKidoAdvance));
  const dominoTargetLock = prog(t, 795.0, 796.2);

  return (
    <AbsoluteFill style={{ background: P2D.seaDeep, overflow: 'hidden' }}>
      {/* Đặt <Defs2D /> BÊN NGOÀI <Cam2D> đúng quy tắc chống lỗi cắt ô filter của Chromium */}
      <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <Defs2D />
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P2D.seaDeep}>
        <svg width={3000} height={1600} viewBox="0 0 3000 1600" style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id="c04s09-land-clip">
              <path d={landPaths.asia} />
              <path d={landPaths.hokkaido} />
              <path d={landPaths.honshu} />
              <path d={landPaths.shikoku} />
              <path d={landPaths.kyushu} />
            </clipPath>
          </defs>

          {/* ================= 1. NỀN HẢI ĐỒ 3 LỚP ĐỘ SÂU + LƯỚI KINH VĨ ĐỘ + HOA GIÓ ================= */}
          <rect x={-700} y={-500} width={4400} height={2700} fill={P2D.seaDeep} />
          <path d={SEA_MID_WEST} fill={P2D.seaMid} opacity={0.88} />
          <path d={SEA_MID_EAST} fill={P2D.seaMid} opacity={0.82} />
          <path d={SEA_SHALLOW_WEST} fill={P2D.seaShallow} opacity={0.72} />
          <path d={SEA_SHALLOW_MIDWAY} fill={P2D.seaShallow} opacity={0.78} />

          {/* Lưới kinh tuyến & vĩ tuyến hải đồ Bắc Thái Bình Dương */}
          <g stroke={P2D.seaGrid} opacity={0.34}>
            {Array.from({ length: 21 }, (_, i) => -200 + i * 160).map((gx, idx) => (
              <line
                key={`vx-${gx}`}
                x1={gx}
                y1={-300}
                x2={gx}
                y2={1900}
                strokeWidth={idx % 3 === 0 ? 1.7 : 0.9}
                strokeDasharray={idx % 3 === 0 ? undefined : '8 8'}
              />
            ))}
            {Array.from({ length: 14 }, (_, j) => -120 + j * 140).map((gy, idx) => (
              <line
                key={`hy-${gy}`}
                x1={-500}
                y1={gy}
                x2={3300}
                y2={gy}
                strokeWidth={idx % 3 === 0 ? 1.7 : 0.9}
                strokeDasharray={idx % 3 === 0 ? undefined : '8 8'}
              />
            ))}
            {/* Đường Đổi Ngày Quốc Tế (International Date Line ~ 180°) cắt dọc phía Tây Midway */}
            <line x1={1820} y1={-250} x2={1820} y2={1850} stroke={P2D.paper} strokeWidth={1.8} strokeDasharray="16 10 4 10" opacity={0.45} />
          </g>

          {/* Đặt Hoa gió hải đồ ở vùng biển thoáng Đông Nam (x=1760, y=1145), hoàn toàn tách biệt khỏi <Label> ở góc trên phải! */}
          <CompassRose2D x={1760} y={1145} r={68} />

          {/* ================= 2. LỤC ĐỊA CHÂU Á, QUẦN ĐẢO NHẬT BẢN & RẠN SAN HÔ MIDWAY ================= */}
          <g transform="translate(6 8)" fill={P2D.landShadow} opacity={0.62}>
            <path d={landPaths.asia} />
            <path d={landPaths.hokkaido} />
            <path d={landPaths.honshu} />
            <path d={landPaths.shikoku} />
            <path d={landPaths.kyushu} />
            {SMALL_ISLANDS.map((isl, idx) => (
              <ellipse
                key={`sh-${idx}`}
                cx={isl.cx}
                cy={isl.cy}
                rx={isl.rx}
                ry={isl.ry}
                transform={`rotate(${isl.rot} ${isl.cx} ${isl.cy})`}
              />
            ))}
          </g>

          <g fill={P2D.land} stroke={P2D.ink} strokeWidth={2.4} strokeLinejoin="round">
            <path d={landPaths.asia} />
            <path d={landPaths.hokkaido} />
            <path d={landPaths.honshu} />
            <path d={landPaths.shikoku} />
            <path d={landPaths.kyushu} />
            {SMALL_ISLANDS.map((isl, idx) => (
              <ellipse
                key={`ld-${idx}`}
                cx={isl.cx}
                cy={isl.cy}
                rx={isl.rx}
                ry={isl.ry}
                transform={`rotate(${isl.rot} ${isl.cx} ${isl.cy})`}
              />
            ))}
          </g>

          <path d={landPaths.honshuHigh} fill={P2D.landHigh} opacity={0.75} />
          <g clipPath="url(#c04s09-land-clip)" opacity={0.44}>
            {JAPAN_CONTOURS.map((c) => (
              <path key={c.level} d={c.d} transform="translate(-40 120)" fill="none" stroke={P2D.contour} strokeWidth={1.15} />
            ))}
          </g>

          {/* RẠN SAN HÔ ĐẢO MIDWAY */}
          <g transform={`translate(${MIDWAY[0]} ${MIDWAY[1]})`}>
            <circle r={92} fill={P2D.seaShallow} fillOpacity={0.55} stroke={P2D.seaGrid} strokeWidth={1.8} strokeDasharray="8 5" />
            <path
              d="M -62 -14 Q -56 -56 -8 -62 Q 46 -64 64 -22 Q 70 28 36 56 Q -18 66 -52 38 Z"
              fill="#2c759e"
              stroke="#9fd4cf"
              strokeWidth={4.2}
              strokeDasharray="11 4 5 4"
            />
            <path
              d="M -52 -10 Q -46 -46 -6 -50 Q 36 -52 50 -16 Q 55 20 28 44 Q -14 52 -42 28 Z"
              fill="#3889b5"
              opacity={0.55}
            />
            <path d="M -42 18 L -12 10 L -6 26 L -28 38 L -45 30 Z" fill={P2D.land} stroke={P2D.ink} strokeWidth={2} />
            <path d="M -36 22 L -16 16 L -14 25 L -30 31 Z" fill={P2D.landHigh} opacity={0.8} />
            <path d="M 10 14 L 42 18 L 32 40 L 8 32 Z" fill={P2D.land} stroke={P2D.ink} strokeWidth={2} />
            <line x1={13} y1={20} x2={37} y2={21} stroke={P2D.paper} strokeWidth={2.2} />
            <line x1={14} y1={20} x2={29} y2={35} stroke={P2D.paper} strokeWidth={2.2} />
            <line x1={36} y1={21} x2={29} y2={35} stroke={P2D.paper} strokeWidth={2.2} />
            <g transform="translate(0 -20)">
              <circle r={11} fill="#1d4f8c" stroke={P2D.paper} strokeWidth={1.6} />
              <polygon
                points={[0, 1, 2, 3, 4]
                  .map((k) => {
                    const a1 = -Math.PI / 2 + (k * Math.PI * 2) / 5;
                    const a2 = a1 + Math.PI / 5;
                    return `${(Math.cos(a1) * 8.5).toFixed(1)},${(Math.sin(a1) * 8.5).toFixed(1)} ${(Math.cos(a2) * 3.6).toFixed(1)},${(Math.sin(a2) * 3.6).toFixed(1)}`;
                  })
                  .join(' ')}
                fill="#ffffff"
              />
            </g>
          </g>

          {/* Toạ độ cất cánh sớm 650 dặm của USS Hornet (18/04/1942) */}
          <g transform={`translate(${HORNET_ORIGIN[0]} ${HORNET_ORIGIN[1]})`} opacity={0.82}>
            <circle r={18} fill="none" stroke={P2D.fuelAmber} strokeWidth={2} strokeDasharray="5 4" />
            <line x1={-24} y1={0} x2={24} y2={0} stroke={P2D.fuelAmber} strokeWidth={1.6} />
            <line x1={0} y1={-24} x2={0} y2={24} stroke={P2D.fuelAmber} strokeWidth={1.6} />
            <circle r={5} fill={P2D.fuelBright} />
          </g>

          {/* ================= 3. NHỊP 1 (777.84–783.00 s): CHẤN ĐỘNG TOKYO & RÚT TIÊM KÍCH VỀ BẢO VỆ CHÍNH QUỐC ================= */}
          <g transform={`translate(${TOKYO[0]} ${TOKYO[1]})`}>
            {[777.84, 778.18, 778.52, 778.95].map((startAt, idx) => {
              const pRing = prog(t, startAt, startAt + 2.35);
              if (pRing <= 0 || pRing >= 1) return null;
              const r = lerp(20, 355, pRing);
              const op = (1 - pRing) * 0.92;
              return (
                <g key={`shock-${idx}`} opacity={op}>
                  <circle r={r} fill="none" stroke={P2D.dangerRed} strokeWidth={15 * (1 - pRing * 0.45)} opacity={0.3} />
                  <circle r={r} fill="none" stroke={idx % 2 === 0 ? P2D.fuelBright : P2D.jpLight} strokeWidth={3.8} />
                </g>
              );
            })}
            {/* Vòng cảnh báo đỏ thường trực tại Tokyo ngay từ giây mở cảnh 777.84 */}
            <circle r={42} fill="rgba(227,66,59,0.16)" stroke={P2D.dangerRed} strokeWidth={2.2} strokeDasharray="8 5" />
            <circle r={21} fill="rgba(227,66,59,0.32)" stroke={P2D.jpMain} strokeWidth={3} />
            <circle r={9.5} fill={P2D.jpMain} stroke={P2D.paper} strokeWidth={2.2} />
            {pTokyoShock > 0 && (
              <circle
                r={30 + Math.sin(t * 7) * 3}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={2.4}
                strokeDasharray="6 4"
                opacity={0.88}
              />
            )}
          </g>

          <Blast2D t={t} at={777.9} x={TOKYO[0]} y={TOKYO[1]} size={38} air={true} life={2.2} seed={19} />

          {/* Vành đai tiền tuyến bị bỏ trống + 6 mũi tên tiêm kích Nhật rút ngược về chính quốc */}
          {t >= CUE.c04_s09_pull_fighters_back - 0.3 && (
            <g>
              <path
                d={smoothPath(
                  FRONTLINE_SECTORS.map((s) => s.from),
                  false,
                )}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={2.4}
                strokeDasharray="12 10"
                opacity={lerp(0.55, 0.16, pRetract)}
              />

              {FRONTLINE_SECTORS.map((sec, idx) => {
                const pLocal = prog(
                  t,
                  CUE.c04_s09_pull_fighters_back + idx * 0.1,
                  CUE.c04_s09_guard_homeland + 0.35 + idx * 0.08,
                );
                if (pLocal <= 0) return null;
                const dFull = arcPath(sec.from[0], sec.from[1], sec.to[0], sec.to[1], sec.apex, 1);
                const posLead = arcAt(sec.from[0], sec.from[1], sec.to[0], sec.to[1], sec.apex, pLocal);
                const angLead = arcAngle(sec.from[0], sec.from[1], sec.to[0], sec.to[1], sec.apex, Math.max(0.02, pLocal));
                const fadeAfterLock = lerp(1, 0.34, prog(t, 783.4, 785.5));

                return (
                  <g key={`retract-${idx}`} opacity={fadeAfterLock}>
                    <circle cx={sec.from[0]} cy={sec.from[1]} r={9} fill="none" stroke={P2D.jpLight} strokeWidth={1.8} strokeDasharray="3 3" />
                    <path
                      d={dFull}
                      fill="none"
                      stroke={P2D.jpMain}
                      strokeWidth={11}
                      strokeLinecap="round"
                      opacity={0.22}
                      {...drawOn(900, pLocal)}
                    />
                    <path
                      d={dFull}
                      fill="none"
                      stroke={P2D.jpLight}
                      strokeWidth={3.6}
                      strokeLinecap="round"
                      strokeDasharray="10 6"
                      opacity={0.9}
                    />
                    <ArrowHead2D
                      x={sec.to[0]}
                      y={sec.to[1]}
                      rot={arcAngle(sec.from[0], sec.from[1], sec.to[0], sec.to[1], sec.apex, 0.98)}
                      size={14}
                      fill={P2D.jpMain}
                    />

                    {pLocal < 0.99 ? (
                      <>
                        <JPFighterTop2D x={posLead[0]} y={posLead[1]} rot={angLead} scale={0.98} />
                        <JPFighterTop2D
                          x={posLead[0] - Math.cos((angLead * Math.PI) / 180) * 26 + 10}
                          y={posLead[1] - Math.sin((angLead * Math.PI) / 180) * 26 - 12}
                          rot={angLead}
                          scale={0.8}
                        />
                      </>
                    ) : null}
                  </g>
                );
              })}

              {/* Vòng khiên phòng không kép khóa chặt quanh quần đảo chính quốc Nhật */}
              {pHomeGuard > 0.01 && (
                <g transform={`translate(${HONSHU_CENTER[0]} ${HONSHU_CENTER[1]})`} opacity={pHomeGuard}>
                  <circle r={175} fill="rgba(227, 66, 59, 0.08)" stroke={P2D.jpMain} strokeWidth={12} opacity={0.22} />
                  <circle r={175} fill="none" stroke={P2D.jpMain} strokeWidth={3.8} strokeDasharray="28 10" />
                  <circle r={212} fill="none" stroke={P2D.jpLight} strokeWidth={2.2} strokeDasharray="12 10" opacity={0.78} />
                  {FRONTLINE_SECTORS.map((sec, idx) => {
                    const orbitDeg = sec.orbitAng + (t - CUE.c04_s09_guard_homeland) * 14;
                    const rad = (orbitDeg * Math.PI) / 180;
                    const ox = Math.cos(rad) * 175;
                    const oy = Math.sin(rad) * 175;
                    return <JPFighterTop2D key={`guard-${idx}`} x={ox} y={oy} rot={orbitDeg + 90} scale={0.88} />;
                  })}
                </g>
              )}
            </g>
          )}

          {/* ================= 4. NHỊP 2 (783.04–789.50 s): CANH BẠC YAMAMOTO & GỌNG KÌM PHỤC KÍCH MIDWAY ================= */}
          <ImperialCommandSeal2D
            x={756}
            y={476}
            scale={Math.max(0.1, lerp(1.8, 1.0, Math.min(1, sSeal)))}
            opacity={Math.min(1, sSeal * 1.5)}
          />

          {/* Mũi tên đại hạm đội Kido Butai (4 tàu sân bay đỏ) tiến công sang Đông tới Midway */}
          {pKidoAdvance > 0.005 && (
            <g>
              <path
                d={arcPath(695, 610, AMBUSH_ZONE[0], AMBUSH_ZONE[1], 112, pKidoAdvance)}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={30}
                strokeLinecap="round"
                opacity={0.22}
              />
              <path
                d={arcPath(695, 610, AMBUSH_ZONE[0], AMBUSH_ZONE[1], 112, pKidoAdvance)}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={11}
                strokeLinecap="round"
              />
              <path
                d={arcPath(695, 610, AMBUSH_ZONE[0], AMBUSH_ZONE[1], 112, pKidoAdvance)}
                fill="none"
                stroke={P2D.jpLight}
                strokeWidth={2.8}
                strokeDasharray="14 8"
                strokeLinecap="round"
              />
              <ArrowHead2D x={kidoHead[0]} y={kidoHead[1]} rot={kidoAng} size={24} fill={P2D.jpMain} />

              {/* Đội hình kim cương 4 tàu sân bay Nhật (Akagi, Kaga, Soryu, Hiryu) — luôn hiển thị sắc nét không bị khói che! */}
              {KIDO_FORMATION.map((ship, idx) => {
                const spread = 0.45 + 0.55 * pKidoAdvance;
                const sx = kidoHead[0] + ship.dx * spread;
                const sy = kidoHead[1] + ship.dy * spread;
                const hitP = prog(t, 795.1 + idx * 0.14, 796.2 + idx * 0.14);
                return (
                  <g key={`ijn-cv-${idx}`}>
                    <WarshipIcon2D
                      x={sx}
                      y={sy}
                      rot={kidoAng + ship.rot}
                      scale={1.36}
                      side="jp"
                      carrier={true}
                    />
                    <TacticalImpactStar2D x={sx} y={sy} p={hitP} />
                  </g>
                );
              })}
            </g>
          )}

          {/* 3 tàu sân bay Mỹ ém sẵn ở sườn Đông Bắc (Point Luck) khép gọng kìm xanh phục kích Midway */}
          {sUsFleet > 0.01 && (
            <g>
              <circle
                cx={2275}
                cy={482}
                r={118 * Math.min(1.1, sUsFleet)}
                fill="rgba(56, 182, 255, 0.09)"
                stroke={P2D.usMain}
                strokeWidth={2.2}
                strokeDasharray="10 7"
              />

              {pUsTrap > 0.02 && (
                <>
                  <path
                    d={arcPath(2065, 575, 2035, 785, -155, pUsTrap)}
                    fill="none"
                    stroke={P2D.usMain}
                    strokeWidth={18}
                    strokeLinecap="round"
                    opacity={0.24}
                  />
                  <path
                    d={arcPath(2065, 575, 2035, 785, -155, pUsTrap)}
                    fill="none"
                    stroke={P2D.usLight}
                    strokeWidth={5.5}
                    strokeLinecap="round"
                    strokeDasharray="16 8"
                  />
                </>
              )}

              {US_AMBUSH_CARRIERS.map((cv, idx) => {
                const pClaw = prog(t, CUE.c04_s09_trap_midway + idx * 0.16, CUE.c04_s09_trap_midway + 1.15 + idx * 0.16);
                const clawTip = arcAt(cv.pos[0], cv.pos[1], cv.pincerTo[0], cv.pincerTo[1], cv.apex, Math.max(0.01, pClaw));
                const clawAng = arcAngle(cv.pos[0], cv.pos[1], cv.pincerTo[0], cv.pincerTo[1], cv.apex, Math.max(0.02, pClaw));
                return (
                  <g key={`us-cv-${idx}`}>
                    {pClaw > 0.01 && (
                      <>
                        <path
                          d={arcPath(cv.pos[0], cv.pos[1], cv.pincerTo[0], cv.pincerTo[1], cv.apex, pClaw)}
                          fill="none"
                          stroke={P2D.usMain}
                          strokeWidth={18}
                          strokeLinecap="round"
                          opacity={0.26}
                        />
                        <path
                          d={arcPath(cv.pos[0], cv.pos[1], cv.pincerTo[0], cv.pincerTo[1], cv.apex, pClaw)}
                          fill="none"
                          stroke={P2D.usMain}
                          strokeWidth={6.5}
                          strokeLinecap="round"
                        />
                        <ArrowHead2D x={clawTip[0]} y={clawTip[1]} rot={clawAng} size={19} fill={P2D.usLight} />
                      </>
                    )}
                    <WarshipIcon2D
                      x={cv.pos[0]}
                      y={cv.pos[1]}
                      rot={cv.rot}
                      scale={1.4 * Math.min(1.06, sUsFleet)}
                      side="us"
                      carrier={true}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* ================= 5. NHỊP 3 (789.78–796.80 s): INSET KỸ THUẬT 467 FT + B-25 & CHUỖI DOMINO VÀNG ================= */}
          {sInset > 0.01 && (
            <g>
              {/* Tia dẫn truyền màu vàng hổ phách nối từ mũi sàn tàu 467 ft trong khung bản vẽ lên Tokyo */}
              {(() => {
                const pLink = prog(t, 790.05, 791.1);
                if (pLink <= 0) return null;
                return (
                  <g opacity={0.95}>
                    <path
                      d={arcPath(978, 922, TOKYO[0] + 42, TOKYO[1] - 6, -85, pLink)}
                      fill="none"
                      stroke={P2D.fuelAmber}
                      strokeWidth={14}
                      strokeLinecap="round"
                      opacity={0.26}
                    />
                    <path
                      d={arcPath(978, 922, TOKYO[0] + 42, TOKYO[1] - 6, -85, pLink)}
                      fill="none"
                      stroke={P2D.fuelBright}
                      strokeWidth={4}
                      strokeDasharray="11 6"
                      strokeLinecap="round"
                    />
                  </g>
                );
              })()}

              {/* Luồng sóng năng lượng vàng hổ phách chạy dọc theo chân chuỗi quân cờ Domino từ Tokyo sang Midway */}
              {pDominoWave > 0.01 && (
                <g>
                  <path
                    d={arcPath(TOKYO[0] + 55, TOKYO[1] - 12, AMBUSH_ZONE[0] - 26, AMBUSH_ZONE[1] - 8, 182, pDominoWave)}
                    fill="none"
                    stroke={P2D.fuelAmber}
                    strokeWidth={18}
                    strokeLinecap="round"
                    opacity={0.25}
                  />
                  <path
                    d={arcPath(TOKYO[0] + 55, TOKYO[1] - 12, AMBUSH_ZONE[0] - 26, AMBUSH_ZONE[1] - 8, 182, pDominoWave)}
                    fill="none"
                    stroke={P2D.fuelBright}
                    strokeWidth={3.5}
                    strokeDasharray="10 6"
                    strokeLinecap="round"
                  />
                </g>
              )}

              {/* CHUỖI 14 QUÂN CỜ DOMINO CHIẾN LƯỢC VÀNG HỔ PHÁCH ĐỔ DÂY CHUYỀN TỪ TOKYO TỚI BẪY MIDWAY */}
              {DOMINO_PTS.map((pt, i) => {
                const tStart = 790.75 + i * 0.31;
                const pAppear = prog(t, tStart - 0.35, tStart);
                const pFall = prog(t, tStart, tStart + 0.42);
                if (pAppear <= 0) return null;
                const u = i / (DOMINO_PTS.length - 1);
                const pathRot = arcAngle(TOKYO[0] + 55, TOKYO[1] - 12, AMBUSH_ZONE[0] - 26, AMBUSH_ZONE[1] - 8, 182, u);
                const tiltDeg = lerp(0, 54, pFall);
                const flash = bump(t, tStart + 0.1, 0.48);

                return (
                  <g key={`domino-${i}`} transform={`translate(${pt[0].toFixed(1)} ${pt[1].toFixed(1)}) rotate(${pathRot.toFixed(1)})`}>
                    {pFall > 0.05 && (
                      <ellipse
                        cx={12}
                        cy={15}
                        rx={16 + pFall * 24}
                        ry={7 + pFall * 10}
                        fill="none"
                        stroke={P2D.fuelBright}
                        strokeWidth={2.5 * (1 - pFall * 0.55)}
                        opacity={0.78 * (1 - pFall * 0.38)}
                      />
                    )}
                    <g transform={`translate(8 17) rotate(${tiltDeg.toFixed(1)}) translate(-8 -17) scale(${pAppear})`}>
                      {/* Mặt bên dày tạo khối 3D rõ nét */}
                      <polygon
                        points="9,-26 17,-21 17,19 9,17"
                        fill="#b87314"
                        stroke={P2D.ink}
                        strokeWidth={1.8}
                        strokeLinejoin="round"
                      />
                      <rect
                        x={-9}
                        y={-26}
                        width={18}
                        height={43}
                        rx={3}
                        fill={flash > 0.2 ? P2D.fuelBright : P2D.fuelAmber}
                        stroke={P2D.ink}
                        strokeWidth={2}
                      />
                      <line x1={-6.5} y1={-4.5} x2={6.5} y2={-4.5} stroke={P2D.ink} strokeWidth={1.8} />
                      <circle cx={0} cy={-15} r={2.6} fill={P2D.ink} />
                      <circle cx={-3.2} cy={4.5} r={2.1} fill={P2D.ink} />
                      <circle cx={3.2} cy={9.5} r={2.1} fill={P2D.ink} />
                    </g>
                  </g>
                );
              })}

              {/* TÂM NGẮM ĐỎ - VÀNG KÍCH NỔ SẮC NÉT BAO QUANH 4 TÀU SÂN BAY NHẬT Ở MIDWAY (795.0–796.8 s, KHÔNG BỊ KHÓI CHE!) */}
              {dominoTargetLock > 0.01 && (
                <g transform={`translate(${AMBUSH_ZONE[0]} ${AMBUSH_ZONE[1]})`}>
                  <circle
                    r={lerp(145, 96, dominoTargetLock)}
                    fill="rgba(255, 69, 69, 0.14)"
                    stroke={P2D.dangerRed}
                    strokeWidth={16}
                    opacity={0.34 * dominoTargetLock}
                  />
                  <circle r={lerp(145, 96, dominoTargetLock)} fill="none" stroke={P2D.fuelBright} strokeWidth={4.5} />
                  <circle r={66} fill="none" stroke={P2D.dangerRed} strokeWidth={3.4} strokeDasharray="15 8" />
                  {[0, 90, 180, 270].map((ang) => (
                    <line
                      key={ang}
                      x1={52}
                      y1={0}
                      x2={116}
                      y2={0}
                      stroke={P2D.fuelBright}
                      strokeWidth={4.4}
                      strokeLinecap="round"
                      transform={`rotate(${ang + dominoTargetLock * 18})`}
                    />
                  ))}
                  {/* Chớp lửa kích nổ gọn gàng (life=1.05s) để ở khung kết 796.5s toàn bộ 4 tàu đỏ trong tâm ngắm hiện rõ 100% */}
                  <Blast2D t={t} at={795.12} x={0} y={4} size={34} air={true} life={1.05} seed={77} />
                </g>
              )}

              {/* KHUNG BẢN VẼ KỸ THUẬT USAAF 1942 ĐẶT GỌN Ở VÙNG BIỂN TRỐNG GÓC DƯỚI TRÁI (x: 455..1585, y: 920..1346) */}
              <g
                transform={`translate(1020 1133) scale(${Math.min(1.03, sInset)}) translate(-1020 -1133)`}
                opacity={Math.min(1, sInset * 1.4)}
              >
                <rect x={467} y={933} width={1130} height={426} rx={14} fill="rgba(7, 15, 26, 0.65)" />
                <rect x={455} y={920} width={1130} height={426} rx={14} fill={P2D.blueprintBg} stroke={P2D.usLight} strokeWidth={3.4} />
                <rect
                  x={469}
                  y={934}
                  width={1102}
                  height={398}
                  rx={9}
                  fill={P2D.blueprintPanel}
                  stroke={P2D.blueprintGrid}
                  strokeWidth={1.6}
                />

                <g stroke={P2D.blueprintGrid} strokeWidth={0.85} opacity={0.34}>
                  {Array.from({ length: 21 }, (_, k) => 505 + k * 52).map((bx) => (
                    <line key={`bgx-${bx}`} x1={bx} y1={936} x2={bx} y2={1330} />
                  ))}
                  {Array.from({ length: 7 }, (_, k) => 976 + k * 52).map((by) => (
                    <line key={`bgy-${by}`} x1={471} y1={by} x2={1569} y2={by} />
                  ))}
                </g>

                <line x1={1020} y1={946} x2={1020} y2={1320} stroke={P2D.usLight} strokeWidth={2} strokeDasharray="10 7" opacity={0.65} />

                {/* ---- Ô TRÁI: TÀU SÂN BAY USS HORNET & ĐƯỜNG BĂNG NGẮN 467 FT ---- */}
                <path
                  d="M 492 1280 Q 555 1252 618 1280 T 744 1280 T 870 1280 T 996 1280"
                  fill="none"
                  stroke={P2D.usMain}
                  strokeWidth={2.6}
                  opacity={0.6}
                />
                <CarrierTop2D x={734} y={1180} rot={-3} ppm={1.96} showLaunchStripe={true} parkedCount={8} />
                {/* Mảng sáng vàng hổ phách phủ nhấn mạnh đoạn sàn phóng ngắn 467 ft phía mũi */}
                <rect
                  x={702}
                  y={1144}
                  width={270}
                  height={28}
                  rx={4}
                  fill={P2D.fuelAmber}
                  opacity={0.18 + 0.16 * pDeckHighlight}
                  transform="rotate(-3 837 1158)"
                />
                <B25Top2D x={988} y={1160} rot={-4} ppm={2.35} tint="olive" propPhase={t * 18} />

                {/* Thước đo kích thước kỹ thuật 467 ft (không chữ) */}
                <g opacity={0.55 + 0.45 * pDeckHighlight}>
                  <line x1={698} y1={1048} x2={698} y2={1142} stroke={P2D.fuelBright} strokeWidth={2.2} strokeDasharray="5 4" />
                  <line x1={974} y1={1034} x2={974} y2={1130} stroke={P2D.fuelBright} strokeWidth={2.2} strokeDasharray="5 4" />
                  <line x1={704} y1={1062} x2={968} y2={1048} stroke={P2D.fuelAmber} strokeWidth={11} opacity={0.3} strokeLinecap="round" />
                  <line x1={704} y1={1062} x2={968} y2={1048} stroke={P2D.fuelBright} strokeWidth={3.6} />
                  <ArrowHead2D x={702} y={1062} rot={177} size={13} fill={P2D.fuelBright} />
                  <ArrowHead2D x={970} y={1048} rot={-3} size={13} fill={P2D.fuelBright} />
                  {[0.2, 0.4, 0.6, 0.8].map((u, k) => {
                    const tx = lerp(704, 968, u);
                    const ty = lerp(1062, 1048, u);
                    return <line key={k} x1={tx} y1={ty - 8} x2={tx} y2={ty + 8} stroke={P2D.fuelBright} strokeWidth={2.4} />;
                  })}
                </g>

                {/* ---- Ô PHẢI: B-25B MITCHELL VỚI KÍNH LÚP PHÓNG ĐẠI THƯỚC NGẮM 20 XU & 2 CÁN CHỔI SƠN ĐEN ---- */}
                <B25Cutaway2D
                  x={1298}
                  y={1284}
                  ppm={24.8}
                  cutaway={false}
                  showMarkTwain={true}
                  showBroomsticks={true}
                  gearDown={false}
                />

                {/* Kính lúp 1 (Đuôi): Phóng đại 2 CÁN CHỔI GỖ SƠN ĐEN */}
                {sBroomsticks > 0.01 && (
                  <g opacity={Math.min(1, sBroomsticks * 1.5)}>
                    <line x1={1096} y1={1226} x2={1132} y2={1078} stroke={P2D.fuelBright} strokeWidth={2.4} strokeDasharray="5 4" />
                    <circle cx={1096} cy={1226} r={15} fill="none" stroke={P2D.fuelBright} strokeWidth={2.6} />
                    <g transform={`translate(1138 1016) scale(${Math.min(1.06, sBroomsticks)})`}>
                      <circle r={58} fill="#122b40" stroke={P2D.fuelBright} strokeWidth={3.4} />
                      <circle r={50} fill="none" stroke={P2D.blueprintGrid} strokeWidth={1.3} strokeDasharray="4 4" />
                      <path d="M 48 -22 L 16 -16 L 16 16 L 48 22 Z" fill={P2D.oliveMid} stroke={P2D.ink} strokeWidth={2.2} />
                      <path d="M 16 -16 Q -4 0 16 16 Z" fill="#97d2ee" stroke={P2D.ink} strokeWidth={2} />
                      {/* Gốc gỗ vàng + thân cán chổi sơn đen bóng giả nòng .50 cal */}
                      <line x1={12} y1={-6} x2={-4} y2={-8} stroke="#d4a056" strokeWidth={5.6} strokeLinecap="round" />
                      <line x1={12} y1={6} x2={-4} y2={8} stroke="#d4a056" strokeWidth={5.6} strokeLinecap="round" />
                      <line x1={-4} y1={-8} x2={-42} y2={-12} stroke="#14171c" strokeWidth={5.8} strokeLinecap="round" />
                      <line x1={-4} y1={8} x2={-42} y2={11} stroke="#14171c" strokeWidth={5.8} strokeLinecap="round" />
                    </g>
                  </g>
                )}

                {/* Kính lúp 2 (Mũi): Phóng đại THƯỚC NGẮM NHÔM 20 XU "MARK TWAIN" */}
                {sMarkTwain > 0.01 && (
                  <g opacity={Math.min(1, sMarkTwain * 1.5)}>
                    <line x1={1482} y1={1226} x2={1458} y2={1078} stroke={P2D.fuelBright} strokeWidth={2.4} strokeDasharray="5 4" />
                    <circle cx={1482} cy={1226} r={15} fill="none" stroke={P2D.fuelBright} strokeWidth={2.6} />
                    <g transform={`translate(1452 1016) scale(${Math.min(1.06, sMarkTwain)})`}>
                      <circle r={58} fill="#122b40" stroke={P2D.fuelBright} strokeWidth={3.4} />
                      <circle r={50} fill="none" stroke={P2D.blueprintGrid} strokeWidth={1.3} strokeDasharray="4 4" />
                      <polygon
                        points="-28,24 26,24 -28,-26"
                        fill="rgba(205, 216, 224, 0.25)"
                        stroke="#e6eff5"
                        strokeWidth={3.8}
                        strokeLinejoin="round"
                      />
                      {[-18, -8, 2, 12].map((ny) => (
                        <line key={ny} x1={-28} y1={ny} x2={-20} y2={ny} stroke={P2D.fuelBright} strokeWidth={2.2} />
                      ))}
                      <circle cx={26} cy={24} r={6} fill="none" stroke={P2D.fuelAmber} strokeWidth={2.8} />
                      <line x1={-36} y1={-6} x2={38} y2={28} stroke={P2D.fuelBright} strokeWidth={2} strokeDasharray="5 3" />
                      {/* 2 đồng xu kim loại nhỏ cạnh thước ngắm biểu trưng giá 20 xu (không chữ) */}
                      <circle cx={12} cy={-20} r={9.5} fill="#d9e2ea" stroke={P2D.ink} strokeWidth={1.6} />
                      <circle cx={24} cy={-16} r={9.5} fill={P2D.fuelAmber} stroke={P2D.paper} strokeWidth={1.8} />
                    </g>
                  </g>
                )}
              </g>
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* DUY NHẤT 1 NHÃN <Label> TRONG VÙNG AN TOÀN GÓC TRÊN PHẢI (788.54–796.40 s) */}
      <Label
        t={t}
        text="MIDWAY · 7 WEEKS LATER"
        x={1420}
        y={132}
        from={788.54}
        until={796.4}
        size={48}
        bg={P2D.paper}
        fg={P2D.ink}
      />
    </AbsoluteFill>
  );
};

export default C04S09;
