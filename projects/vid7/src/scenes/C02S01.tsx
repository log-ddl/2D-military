// Cảnh C02S01 (124.26–156.98 s) — THUẦN 2D Hải đồ tác chiến Thái Bình Dương:
// Giải phẫu "Bẫy vật lý" sau Trân Châu Cảng (tầm đánh tàu sân bay Mỹ 250 dặm vs vành đai oanh tạc cơ bờ biển Nhật 600 dặm)
// và phương án duy nhất: phóng oanh tạc cơ lục quân tầm xa B-25B từ ngoài tầm với của Nhật, bay một chiều sang Trung Quốc.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog, useT } from '@core/time';
import { handheld } from '@core/frame';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { arcAngle, arcAt, arcPath, drawOn, smoothPath, type Pt } from '@skill/military/2d/path';
import { contours } from '@skill/military/2d/terrain';
import { Blast2D } from '@skill/military/2d/fx';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { P2D } from '../design/palette';
import { B25Top2D, CompassRose2D, WarshipIcon2D } from '../parts/Silhouettes2D';

// ---------------- Dữ liệu địa lý Hải đồ Đông Á – Tây Thái Bình Dương (toạ độ thế giới 2400 × 1350) ----------------
// Lục địa Châu Á liền khối từ vùng Viễn Đông / Mãn Châu nối liền bán đảo Triều Tiên, vịnh Bột Hải, Sơn Đông, Thượng Hải, Chiết Giang, Phúc Kiến
const ASIAN_MAINLAND: Pt[] = [
  [-240, -140],
  [650, -140],
  [615, 25],
  [558, 125], // Bờ biển Viễn Đông / Primorye
  [485, 215],
  [476, 268], // Đông Bắc Triều Tiên
  [504, 338],
  [524, 418],
  [514, 476], // Busan / Eo biển Triều Tiên
  [474, 484], // Mokpo / Tây Nam Triều Tiên
  [456, 428],
  [444, 368], // Vịnh Giang Hoa / Seoul
  [418, 326],
  [398, 275], // Cửa sông Áp Lục
  [355, 298],
  [338, 332], // Bán đảo Liêu Đông (Đại Liên)
  [318, 286],
  [266, 258], // Vịnh Bột Hải
  [236, 312],
  [272, 366],
  [348, 388], // Bán đảo Sơn Đông (Thanh Đảo)
  [308, 438],
  [294, 512], // Giang Tô
  [342, 594], // Cửa sông Dương Tử / Thượng Hải
  [356, 638],
  [322, 672], // Vịnh Hàng Châu
  [338, 728], // Bờ biển Chiết Giang (Châu Sơn / Ninh Ba — cửa ngõ về sân bay Chuchow)
  [312, 804],
  [262, 886], // Phúc Kiến
  [188, 976],
  [98, 1068], // Quảng Đông
  [-15, 1165],
  [-240, 1185],
];

// Đảo Sakhalin phía Bắc Hokkaido
const SAKHALIN: Pt[] = [
  [948, -45],
  [966, 15],
  [962, 82],
  [974, 116],
  [952, 122],
  [936, 86],
  [932, 18],
];

// Quần đảo Nhật Bản: Hokkaido, Honshu (vịnh Tokyo khắc rõ tại 870, 525), Shikoku, Kyushu + chuỗi đảo Ryukyu & Đài Loan
const HOKKAIDO: Pt[] = [
  [934, 276],
  [922, 232],
  [946, 182],
  [978, 146],
  [1018, 178],
  [1054, 206],
  [1028, 244],
  [988, 258],
  [958, 284],
];

const HONSHU: Pt[] = [
  [924, 314], // Aomori / Tsugaru
  [946, 344],
  [948, 406], // Bờ Đông Tohoku (Sanriku)
  [926, 468], // Sendai
  [912, 516], // Mũi Inubosaki (Choshi)
  [896, 548], // Bán đảo Boso
  [880, 528], // Đáy Vịnh Tokyo (TOKYO = 870, 525)
  [868, 552], // Yokohama / Miura
  [852, 566], // Bán đảo Izu
  [824, 568], // Shizuoka / Suruga
  [798, 582], // Vịnh Ise / Nagoya
  [776, 610], // Bán đảo Kii
  [752, 590], // Vịnh Osaka / Kobe
  [706, 592], // Biển nội địa Seto
  [652, 604], // Hiroshima
  [622, 596], // Shimonoseki
  [642, 564], // Bờ biển San'in
  [712, 546],
  [766, 532], // Wakasa
  [794, 486], // Bán đảo Noto
  [814, 504], // Toyama
  [856, 466], // Niigata
  [888, 404], // Akita
  [902, 342],
];

const SHIKOKU: Pt[] = [
  [664, 622],
  [704, 610],
  [736, 618],
  [728, 646],
  [694, 644],
  [662, 652],
];

const KYUSHU: Pt[] = [
  [596, 616],
  [632, 614],
  [644, 652],
  [634, 704],
  [608, 728], // Kagoshima
  [586, 698],
  [572, 654], // Nagasaki
];

const OKINAWA_ISLAND: Pt[] = [
  [506, 838],
  [522, 844],
  [508, 874],
  [494, 868],
];

const TAIWAN: Pt[] = [
  [310, 942],
  [330, 974],
  [320, 1034],
  [298, 1056],
  [284, 1012],
  [294, 966],
];

// Vùng thềm lục địa nông & biển trung tầng tạo 3 lớp chiều sâu hải đồ
const SEA_MID_SHELF: Pt[] = [
  [-260, -160],
  [1220, -160],
  [1190, 195],
  [1125, 420],
  [1060, 615],
  [885, 765],
  [690, 920],
  [490, 1140],
  [-260, 1200],
];

const SEA_SHALLOW_CHINA: Pt[] = [
  [-240, -140],
  [565, -140],
  [575, 295],
  [558, 525],
  [455, 695],
  [405, 885],
  [358, 1085],
  [-240, 1185],
];

const SEA_SHALLOW_JAPAN: Pt[] = [
  [985, 112],
  [1090, 195],
  [1025, 315],
  [985, 455],
  [945, 578],
  [825, 648],
  [672, 748],
  [552, 738],
  [548, 595],
  [665, 518],
  [795, 448],
  [888, 255],
];

// Toạ độ chiến lược then chốt trên hải đồ
const TOKYO: Pt = [872, 526];
const CHUCHOW_AIRFIELD: Pt = [232, 736];
const ALT_AIRFIELDS: Pt[] = [
  [176, 668],
  [196, 814],
];

// Bán kính chuẩn tỷ lệ 2.40× (600 mi / 250 mi = 2.40) và nằm trọn hoàn hảo trong khung hình 1080p không chạm mép!
const R_US_250 = 195; // Vòng cung tầm đánh tàu sân bay Mỹ: 250 dặm
const R_JP_600 = 468; // Vành đai oanh tạc cơ bờ biển Nhật: 600 dặm (195 × 2.4 = 468 px!)

/** Hình chiếu bằng oanh tạc cơ bờ biển hai động cơ Nhật Bản (G4M Betty / G3M Nell) */
const JpLandBomber2D: React.FC<{ x: number; y: number; rot: number; scale?: number }> = ({
  x,
  y,
  rot,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    <path
      d="M 5 -3 L 1 -36 L -6 -37 L -7 -3 L -7 3 L -6 37 L 1 36 L 5 3 Z"
      fill={P2D.jpMain}
      stroke={P2D.ink}
      strokeWidth={1.8}
    />
    <path d="M 4.2 -4 L 0.6 -34.5 L -1.8 -34.8 L 1.2 -4 Z M 4.2 4 L 0.6 34.5 L -1.8 34.8 L 1.2 4 Z" fill={P2D.jpLight} opacity={0.55} />
    <path d="M -21 -12 L -25 -11 L -26 11 L -21 12 Z" fill={P2D.jpDark} stroke={P2D.ink} strokeWidth={1.5} />
    {[-11.5, 11.5].map((zy, i) => (
      <rect key={i} x={-4} y={zy - 2.6} width={14} height={5.2} rx={2.2} fill={P2D.jpDark} stroke={P2D.ink} strokeWidth={1.4} />
    ))}
    <path
      d="M 24 0 Q 21 -3.8 8 -4.2 L -14 -3.4 L -28 -1.1 L -28 1.1 L -14 3.4 L 8 4.2 Q 21 3.8 24 0 Z"
      fill={P2D.jpMain}
      stroke={P2D.ink}
      strokeWidth={1.8}
    />
    {[-22, 22].map((zy, i) => (
      <circle key={i} cx={-2.2} cy={zy} r={3.4} fill="#b81612" stroke="#fff3e6" strokeWidth={1.1} />
    ))}
  </g>
);

/** Hình chiếu thu gọn máy bay ném bom bổ nhào Hải quân Mỹ (SBD Dauntless) tuần kích ngắn 250 mi */
const UsCarrierPlane2D: React.FC<{ x: number; y: number; rot: number; scale?: number }> = ({
  x,
  y,
  rot,
  scale = 1,
}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    <path
      d="M 4 -2.5 L 1 -20 L -4 -19 L -5 -2.5 L -5 2.5 L -4 19 L 1 20 L 4 2.5 Z"
      fill={P2D.usMain}
      stroke={P2D.ink}
      strokeWidth={1.5}
    />
    <path d="M 14 0 Q 11 -2.8 3 -3 L -14 -1.4 L -14 1.4 L 3 3 Q 11 2.8 14 0 Z" fill={P2D.usLight} stroke={P2D.ink} strokeWidth={1.5} />
    <path d="M -11 -7 L -14 -6.5 L -14 6.5 L -11 7 Z" fill={P2D.usDark} stroke={P2D.ink} strokeWidth={1.2} />
  </g>
);

/** Ký hiệu sân bay đồng minh tại Trung Quốc (2 đường băng cắt chéo + vòng đèn hiệu an toàn, không dùng <text>) */
const AlliedAirfieldIcon2D: React.FC<{ x: number; y: number; primary?: boolean; pulse?: number }> = ({
  x,
  y,
  primary = false,
  pulse = 0,
}) => {
  const r = primary ? 24 : 16;
  return (
    <g transform={`translate(${x} ${y})`}>
      {primary && (
        <>
          <circle r={r + 12 + pulse * 14} fill="none" stroke={P2D.safeTeal} strokeWidth={3} opacity={0.42 * (1 - pulse * 0.5)} />
          <circle r={r + 5} fill={P2D.safeTeal} opacity={0.2} />
        </>
      )}
      <circle r={r} fill={P2D.blueprintPanel} stroke={primary ? P2D.safeTeal : P2D.usLight} strokeWidth={primary ? 3 : 2} />
      <g transform="rotate(-24)">
        <rect x={-r * 0.72} y={-2.8} width={r * 1.44} height={5.6} rx={1.5} fill={P2D.paper} stroke={P2D.ink} strokeWidth={1.2} />
        <line x1={-r * 0.56} y1={0} x2={r * 0.56} y2={0} stroke={P2D.ink} strokeWidth={1} strokeDasharray="3 2.5" />
      </g>
      <g transform="rotate(46)">
        <rect x={-r * 0.58} y={-2.2} width={r * 1.16} height={4.4} rx={1.2} fill="#dfd4bc" stroke={P2D.ink} strokeWidth={1.1} />
      </g>
      <circle r={primary ? 4.2 : 3} fill={P2D.safeTeal} stroke={P2D.ink} strokeWidth={1} />
    </g>
  );
};

const C02S01: React.FC = () => {
  const t = useT();

  const geo = useMemo(() => {
    const landPaths = [
      ASIAN_MAINLAND,
      SAKHALIN,
      HOKKAIDO,
      HONSHU,
      SHIKOKU,
      KYUSHU,
      OKINAWA_ISLAND,
      TAIWAN,
    ].map((pts) => smoothPath(pts, true, 0.42));

    const midShelfD = smoothPath(SEA_MID_SHELF, true, 0.45);
    const shallowChinaD = smoothPath(SEA_SHALLOW_CHINA, true, 0.45);
    const shallowJapanD = smoothPath(SEA_SHALLOW_JAPAN, true, 0.45);
    const topo = contours('pacific-chart-1942-v2', 1240, 1280, 8, 20, 255);

    return {
      allLandD: landPaths.join(' '),
      midShelfD,
      shallowChinaD,
      shallowJapanD,
      topo,
    };
  }, []);

  // ---------------- Nhịp camera <Cam2D> bám sát lời thoại & giữ trọn vành đai 600 mi trong khung ----------------
  const pIntro = prog(t, CUE.c02_s01_start, 134.0);
  const pHoldEast = prog(t, 137.0, 148.0);
  const pPanChina = prog(t, 150.2, 155.6);

  const camX =
    lerp(1165, 1055, pIntro) +
    lerp(0, 55, pHoldEast) +
    lerp(0, -245, pPanChina);
  const camY =
    lerp(536, 528, pIntro) +
    lerp(0, 6, pHoldEast) +
    lerp(0, 26, pPanChina);
  const camZoom =
    lerp(0.98, 1.06, pIntro) +
    lerp(0, -0.07, pHoldEast) +
    lerp(0, -0.01, pPanChina);

  // ---------------- Diễn biến chiến thuật theo CUE ----------------
  // Ngay từ đầu cảnh (124.26 s), biên đội đặc nhiệm tàu sân bay Mỹ đã xuất hiện từ hướng Đông (Trân Châu Cảng) tiến vào Tây Thái Bình Dương
  const pFleetWest = prog(t, CUE.c02_s01_start, 140.2);
  const pTokyoLock = prog(t, 132.8, 134.5);
  const tokyoPulse = 0.5 + 0.5 * Math.sin((t - CUE.c02_s01_tokyo) * 5.2);

  // Vòng cung tầm đánh ngắn 250 dặm bung ra khi voice đọc "U.S. Navy carrier bombers could only strike targets 250 miles away"
  const pUs250Ring = prog(t, 138.2, 141.1);

  // Vành đai đỏ khổng lồ 600 dặm của oanh tạc cơ bờ biển Nhật quét ra biển, ép tàu sân bay Mỹ lùi ra ngoài rìa 600 mi (872 + 468 = 1340)
  const pJp600Ring = prog(t, CUE.c02_s01_jp_coast, 146.7);
  const pUsPushBack = prog(t, 143.9, 148.0);

  // Vị trí tàu sân bay Mỹ: hành quân từ x=1790 -> x=1195 (vòng 250 mi dừng ở x=1000, hụt xa Tokyo x=872), rồi bị ép lùi ra x=1475 (ngoài rìa đỏ 1340!)
  const usCarrierX = lerp(1790, 1195, pFleetWest) + lerp(0, 280, pUsPushBack);
  const usCarrierY = lerp(572, 542, pFleetWest);

  // Phóng đội hình B-25 một chiều từ điểm đứng ngoài vành đai đỏ (1475, 542) xuyên qua Tokyo (872, 526) sang sân bay Chuchow Trung Quốc (232, 736)
  const pLeg1 = prog(t, CUE.c02_s01_launch_outside, 153.65);
  const pLeg2 = prog(t, 153.55, 156.15);
  const pChinaAirfields = prog(t, 151.3, 154.4);
  const chinaBeaconPulse = ((t * 1.15) % 1 + 1) % 1;

  const leg1FullD = useMemo(() => arcPath(1475, 542, TOKYO[0], TOKYO[1], 76, 1, 72), []);
  const leg2FullD = useMemo(() => arcPath(TOKYO[0], TOKYO[1], CHUCHOW_AIRFIELD[0], CHUCHOW_AIRFIELD[1], 66, 1, 72), []);

  const raidTotalP = prog(t, CUE.c02_s01_launch_outside, 156.25);

  const evalRaidPose = (u: number): { pos: Pt; angle: number } => {
    const cu = Math.max(0, Math.min(1, u));
    if (cu <= 0.48) {
      const s = cu / 0.48;
      return {
        pos: arcAt(1475, 542, TOKYO[0], TOKYO[1], 76, s),
        angle: arcAngle(1475, 542, TOKYO[0], TOKYO[1], 76, s),
      };
    }
    const s = (cu - 0.48) / 0.52;
    return {
      pos: arcAt(TOKYO[0], TOKYO[1], CHUCHOW_AIRFIELD[0], CHUCHOW_AIRFIELD[1], 66, s),
      angle: arcAngle(TOKYO[0], TOKYO[1], CHUCHOW_AIRFIELD[0], CHUCHOW_AIRFIELD[1], 66, s),
    };
  };

  const usRingAlpha = pUs250Ring * lerp(1, 0.36, prog(t, 150.5, 152.0));

  return (
    <AbsoluteFill style={{ background: P2D.seaDeep }}>
      {/* Đặt <Defs2D /> NGOÀI <Cam2D> đúng quy chuẩn */}
      <svg width={0} height={0} style={{ position: 'absolute' }}>
        <Defs2D shadow="rgba(8, 16, 28, 0.48)" />
      </svg>

      <Cam2D
        x={camX}
        y={camY}
        zoom={camZoom}
        shake={handheld(t, 1.9, 'c02s01-chart')}
        bg={P2D.seaDeep}
      >
        <svg width={2400} height={1350} viewBox="0 0 2400 1350" style={{ overflow: 'visible' }}>
          <defs>
            <clipPath id="c02s01-land-clip">
              <path d={geo.allLandD} />
            </clipPath>
          </defs>

          {/* ==================== 1. NỀN BIỂN HẢI ĐỒ 3 LỚP + LƯỚI KINH VĨ ĐỘ & THƯỚC HẢI LÝ ==================== */}
          <rect x={-520} y={-360} width={3440} height={2060} fill={P2D.seaDeep} />
          <path d={geo.midShelfD} fill={P2D.seaMid} opacity={0.92} />
          <path d={geo.shallowChinaD} fill={P2D.seaShallow} opacity={0.78} />
          <path d={geo.shallowJapanD} fill={P2D.seaShallow} opacity={0.86} />

          {/* Các tia phương vị la bàn mờ trên mặt đại dương */}
          <g opacity={0.15}>
            {Array.from({ length: 16 }, (_, i) => {
              const a = (i * Math.PI) / 8;
              return (
                <line
                  key={`rhumb-${i}`}
                  x1={1690}
                  y1={850}
                  x2={1690 + Math.cos(a) * 1800}
                  y2={850 + Math.sin(a) * 1800}
                  stroke={P2D.seaGrid}
                  strokeWidth={1.1}
                />
              );
            })}
          </g>

          {/* Lưới kinh tuyến & vĩ tuyến hải đồ kèm thước khắc độ */}
          <g opacity={0.36}>
            {Array.from({ length: 16 }, (_, i) => {
              const gx = -120 + i * 160;
              return (
                <g key={`lon-${i}`}>
                  <line
                    x1={gx}
                    y1={-260}
                    x2={gx}
                    y2={1520}
                    stroke={P2D.seaGrid}
                    strokeWidth={i % 2 === 0 ? 1.55 : 1.0}
                    strokeDasharray={i % 2 === 0 ? undefined : '7 7'}
                  />
                  <line x1={gx} y1={52} x2={gx} y2={68} stroke={P2D.seaGrid} strokeWidth={2.2} />
                  <line x1={gx} y1={1012} x2={gx} y2={1028} stroke={P2D.seaGrid} strokeWidth={2.2} />
                </g>
              );
            })}
            {Array.from({ length: 11 }, (_, j) => {
              const gy = -100 + j * 145;
              return (
                <line
                  key={`lat-${j}`}
                  x1={-400}
                  y1={gy}
                  x2={2700}
                  y2={gy}
                  stroke={P2D.seaGrid}
                  strokeWidth={j % 2 === 0 ? 1.55 : 1.0}
                  strokeDasharray={j % 2 === 0 ? undefined : '7 7'}
                />
              );
            })}
          </g>

          {/* Thanh thước chia hải lý kiểu hải đồ quân sự 1942 ở góc Đông Bắc đại dương (không dùng <text>) */}
          <g transform="translate(1480 120)" opacity={0.55}>
            <rect x={0} y={0} width={312} height={10} fill={P2D.seaDeep} stroke={P2D.seaGrid} strokeWidth={1.6} />
            {[0, 2, 4].map((k) => (
              <rect key={k} x={k * 52} y={0} width={52} height={10} fill={P2D.seaGrid} opacity={0.65} />
            ))}
            {[0, 1, 2, 3, 4, 5, 6].map((k) => (
              <line key={`tk-${k}`} x1={k * 52} y1={-5} x2={k * 52} y2={15} stroke={P2D.paper} strokeWidth={1.6} opacity={0.7} />
            ))}
          </g>

          {/* Chuỗi đảo nhỏ Izu – Bonin (Ogasawara) kéo xuống phía Nam vịnh Tokyo tăng độ chân thực hải đồ */}
          {[
            [892, 608, 4.2],
            [904, 652, 3.6],
            [918, 706, 3.2],
            [938, 778, 4.5],
            [952, 836, 3.4],
            [562, 774, 3.8],
            [536, 806, 3.2],
            [454, 902, 3.4],
          ].map(([ix, iy, ir], idx) => (
            <circle key={`isl-${idx}`} cx={ix} cy={iy} r={ir} fill={P2D.land} stroke={P2D.ink} strokeWidth={1.3} />
          ))}

          {/* Hoa gió la bàn cổ điển đặt ngoài khơi Tây Thái Bình Dương */}
          <CompassRose2D x={1690} y={850} r={68} />

          {/* ==================== 2. LỤC ĐỊA TRUNG QUỐC – TRIỀU TIÊN & QUẦN ĐẢO NHẬT BẢN ==================== */}
          <path
            d={geo.allLandD}
            fill="none"
            stroke="#3679a8"
            strokeWidth={14}
            strokeLinejoin="round"
            opacity={0.36}
          />
          <g transform="translate(7 9)" opacity={0.48}>
            <path d={geo.allLandD} fill="#081726" />
          </g>
          <path d={geo.allLandD} fill={P2D.land} />
          <g clipPath="url(#c02s01-land-clip)">
            <g transform="translate(-8 -6)">
              <path d={geo.allLandD} fill={P2D.landHigh} opacity={0.44} />
            </g>
            {geo.topo.map((c) => (
              <path
                key={`cnt-${c.level}`}
                d={c.d}
                transform="translate(-80 -40)"
                fill="none"
                stroke={c.level >= 6 ? P2D.landShadow : P2D.contour}
                strokeWidth={c.level % 2 === 0 ? 1.55 : 1.05}
                opacity={0.36 + c.level * 0.042}
              />
            ))}
          </g>
          <path d={geo.allLandD} fill="none" stroke={P2D.ink} strokeWidth={2.5} strokeLinejoin="round" />

          {/* Căn cứ không quân bờ biển Nhật Bản */}
          {[
            [920, 466],
            [896, 538],
            [808, 578],
            [634, 658],
          ].map(([bx, by], idx) => (
            <g key={`jp-base-${idx}`} transform={`translate(${bx} ${by})`} opacity={0.7 + 0.3 * pJp600Ring}>
              <circle r={6.5} fill={P2D.paper} stroke={P2D.ink} strokeWidth={1.6} />
              <circle r={3.6} fill={P2D.jpMain} />
            </g>
          ))}

          {/* ==================== 3. VÀNH ĐAI ĐỎ KHỔNG LỒ 600 DẶM CỦA OANH TẠC CƠ BỜ BIỂN NHẬT ==================== */}
          {pJp600Ring > 0.005 && (
            <g opacity={Math.min(1, pJp600Ring * 1.3)}>
              <circle
                cx={TOKYO[0]}
                cy={TOKYO[1]}
                r={R_JP_600 * pJp600Ring}
                fill={P2D.jpMain}
                fillOpacity={0.21}
              />
              {[0.34, 0.67].map((f, idx) => (
                <circle
                  key={`jp-sub-${idx}`}
                  cx={TOKYO[0]}
                  cy={TOKYO[1]}
                  r={R_JP_600 * pJp600Ring * f}
                  fill="none"
                  stroke={P2D.jpMain}
                  strokeWidth={1.6}
                  strokeDasharray="8 8"
                  opacity={0.42}
                />
              ))}
              {/* Vành biên đỏ 600 mi nét kép rực rỡ, nằm trọn trong khung hình */}
              <circle
                cx={TOKYO[0]}
                cy={TOKYO[1]}
                r={R_JP_600 * pJp600Ring}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={18}
                opacity={0.28}
              />
              <circle
                cx={TOKYO[0]}
                cy={TOKYO[1]}
                r={R_JP_600 * pJp600Ring}
                fill="none"
                stroke={P2D.jpLight}
                strokeWidth={4.5}
                strokeDasharray="18 9"
              />

              {/* Thước đo bán kính 600 dặm */}
              <g opacity={prog(t, 144.6, 146.3)}>
                <line
                  x1={TOKYO[0]}
                  y1={TOKYO[1]}
                  x2={TOKYO[0] + Math.cos(-0.46) * R_JP_600 * pJp600Ring}
                  y2={TOKYO[1] + Math.sin(-0.46) * R_JP_600 * pJp600Ring}
                  stroke={P2D.jpLight}
                  strokeWidth={2.8}
                />
                <circle
                  cx={TOKYO[0] + Math.cos(-0.46) * R_JP_600 * pJp600Ring}
                  cy={TOKYO[1] + Math.sin(-0.46) * R_JP_600 * pJp600Ring}
                  r={5.8}
                  fill={P2D.jpLight}
                />
              </g>

              {/* 3 oanh tạc cơ bờ biển Nhật (G4M Betty) tuần kích trên vành đai 600 dặm */}
              {[-28, 3, 32].map((degAng, idx) => {
                const rad = (degAng * Math.PI) / 180;
                const patrolDist = lerp(100, R_JP_600 * 0.83, pJp600Ring) + Math.sin(t * 1.4 + idx) * 12;
                const bx = TOKYO[0] + Math.cos(rad) * patrolDist;
                const by = TOKYO[1] + Math.sin(rad) * patrolDist;
                return (
                  <g key={`jp-bomber-${idx}`}>
                    <line
                      x1={TOKYO[0] + Math.cos(rad) * 52}
                      y1={TOKYO[1] + Math.sin(rad) * 52}
                      x2={bx - Math.cos(rad) * 26}
                      y2={by - Math.sin(rad) * 26}
                      stroke={P2D.jpLight}
                      strokeWidth={2.0}
                      strokeDasharray="6 6"
                      opacity={0.55}
                    />
                    <JpLandBomber2D x={bx} y={by} rot={degAng} scale={1.08} />
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== 4. BIÊN ĐỘI TÀU SÂN BAY MỸ TỪ HƯỚNG TRÂN CHÂU CẢNG & VÒNG TẦM ĐÁNH 250 MI ==================== */}
          <g>
            {/* Vệt hải trình nét đứt của Lực lượng Đặc nhiệm 16 tiến từ phía Đông (Trân Châu Cảng) sang Tây */}
            <line
              x1={2020}
              y1={588}
              x2={usCarrierX + 46}
              y2={usCarrierY + 2}
              stroke={P2D.usMain}
              strokeWidth={2.6}
              strokeDasharray="10 8"
              opacity={0.52}
            />
            <line
              x1={usCarrierX + 32}
              y1={usCarrierY}
              x2={usCarrierX + 150}
              y2={usCarrierY + 8}
              stroke={P2D.usLight}
              strokeWidth={6}
              strokeLinecap="round"
              opacity={0.22}
            />

            {/* Vòng cung tầm đánh ngắn 250 dặm màu xanh Mỹ (nhỏ bằng 1/2.4 bán kính vành đai đỏ Nhật!) */}
            {usRingAlpha > 0.01 && (
              <g opacity={usRingAlpha}>
                <circle
                  cx={usCarrierX}
                  cy={usCarrierY}
                  r={R_US_250 * pUs250Ring}
                  fill={P2D.usMain}
                  fillOpacity={0.18}
                />
                <circle
                  cx={usCarrierX}
                  cy={usCarrierY}
                  r={R_US_250 * pUs250Ring}
                  fill="none"
                  stroke={P2D.usMain}
                  strokeWidth={14}
                  opacity={0.28}
                />
                <circle
                  cx={usCarrierX}
                  cy={usCarrierY}
                  r={R_US_250 * pUs250Ring}
                  fill="none"
                  stroke={P2D.usLight}
                  strokeWidth={3.8}
                  strokeDasharray="12 7"
                />

                {/* Thước bán kính 250 mi & khoảng hụt bất lực tới Tokyo */}
                {t < 150.7 && pUs250Ring > 0.7 && (
                  <g opacity={lerp(1, 0, prog(t, 149.8, 150.7))}>
                    <line
                      x1={usCarrierX}
                      y1={usCarrierY}
                      x2={usCarrierX - R_US_250}
                      y2={usCarrierY}
                      stroke={P2D.usLight}
                      strokeWidth={2.6}
                    />
                    <line
                      x1={usCarrierX - R_US_250 - 10}
                      y1={usCarrierY}
                      x2={TOKYO[0] + 34}
                      y2={TOKYO[1] + 4}
                      stroke={P2D.dangerRed}
                      strokeWidth={2.6}
                      strokeDasharray="6 7"
                      opacity={0.82}
                    />
                    <g transform={`translate(${usCarrierX - R_US_250} ${usCarrierY})`}>
                      <line x1={-8} y1={-8} x2={8} y2={8} stroke={P2D.usLight} strokeWidth={3} />
                      <line x1={-8} y1={8} x2={8} y2={-8} stroke={P2D.usLight} strokeWidth={3} />
                    </g>
                  </g>
                )}

                {/* 2 máy bay hải quân tầm ngắn bị giới hạn trong vòng 250 mi */}
                {t < 150.9 &&
                  [-0.48, 0.45].map((angOff, i) => {
                    const a = Math.PI + angOff + Math.sin(t * 1.1 + i * 2) * 0.14;
                    const rr = R_US_250 * pUs250Ring * 0.8;
                    return (
                      <UsCarrierPlane2D
                        key={`sbd-${i}`}
                        x={usCarrierX + Math.cos(a) * rr}
                        y={usCarrierY + Math.sin(a) * rr}
                        rot={(a * 180) / Math.PI - 55}
                        scale={0.95}
                      />
                    );
                  })}
              </g>
            )}

            {/* Biên đội Task Force 16: USS Hornet + USS Enterprise + tuần dương hạm hộ tống */}
            <WarshipIcon2D x={usCarrierX + 44} y={usCarrierY - 38} rot={180} scale={0.98} side="us" carrier={false} />
            <WarshipIcon2D x={usCarrierX + 50} y={usCarrierY + 42} rot={180} scale={0.98} side="us" carrier={false} />
            <WarshipIcon2D x={usCarrierX} y={usCarrierY} rot={180} scale={1.48} side="us" carrier />
          </g>

          {/* ==================== 5. TÂM NGẮM MỤC TIÊU TOKYO & SÂN BAY ĐỒNG MINH TRUNG QUỐC ==================== */}
          {pTokyoLock > 0.01 && (
            <g transform={`translate(${TOKYO[0]} ${TOKYO[1]}) scale(${lerp(1.6, 1.0, pTokyoLock)})`} opacity={pTokyoLock}>
              <circle r={28 + tokyoPulse * 6} fill={P2D.jpMain} opacity={0.2} />
              <circle r={22} fill="none" stroke={P2D.dangerRed} strokeWidth={2.8} />
              <circle r={11} fill="none" stroke={P2D.fuelBright} strokeWidth={2} />
              <circle r={4.2} fill={P2D.dangerRed} />
              {[0, 90, 180, 270].map((d) => (
                <line
                  key={`tk-ch-${d}`}
                  x1={15}
                  y1={0}
                  x2={29}
                  y2={0}
                  stroke={P2D.dangerRed}
                  strokeWidth={2.6}
                  transform={`rotate(${d})`}
                />
              ))}
            </g>
          )}

          {pChinaAirfields > 0.01 && (
            <g opacity={pChinaAirfields}>
              {ALT_AIRFIELDS.map(([ax, ay], idx) => (
                <AlliedAirfieldIcon2D key={`alt-af-${idx}`} x={ax} y={ay} />
              ))}
              <AlliedAirfieldIcon2D x={CHUCHOW_AIRFIELD[0]} y={CHUCHOW_AIRFIELD[1]} primary pulse={chinaBeaconPulse} />
            </g>
          )}

          {/* ==================== 6. ĐƯỜNG BAY MỘT CHIỀU VÀNG HỔ PHÁCH (B-25B XUYÊN TOKYO SANG TRUNG QUỐC) ==================== */}
          {pLeg1 > 0.005 && (
            <g>
              <path
                d={leg1FullD}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={16}
                strokeLinecap="round"
                opacity={0.3}
                {...drawOn(900, pLeg1)}
              />
              <path
                d={leg1FullD}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={5.4}
                strokeLinecap="round"
                {...drawOn(900, pLeg1)}
              />
            </g>
          )}

          {pLeg2 > 0.005 && (
            <g>
              <path
                d={leg2FullD}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={16}
                strokeLinecap="round"
                opacity={0.3}
                {...drawOn(900, pLeg2)}
              />
              <path
                d={leg2FullD}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={5.4}
                strokeLinecap="round"
                {...drawOn(900, pLeg2)}
              />

              {pLeg2 > 0.92 && (
                <g
                  transform={`translate(${CHUCHOW_AIRFIELD[0]} ${CHUCHOW_AIRFIELD[1]}) rotate(${arcAngle(
                    TOKYO[0],
                    TOKYO[1],
                    CHUCHOW_AIRFIELD[0],
                    CHUCHOW_AIRFIELD[1],
                    66,
                    0.99,
                  )})`}
                  opacity={prog(t, 155.6, 156.1)}
                >
                  <polygon points="4,0 -18,-11 -13,0 -18,11" fill={P2D.fuelBright} stroke={P2D.ink} strokeWidth={1.8} />
                </g>
              )}
            </g>
          )}

          <Blast2D t={t} at={153.55} x={TOKYO[0]} y={TOKYO[1]} size={58} air life={1.35} />

          {/* Đội hình 3 chiếc B25Top2D phóng từ ngoài vành đai đỏ 600 mi bay xuyên Tokyo sang sân bay Trung Quốc */}
          {raidTotalP > 0.01 &&
            [
              { lag: 0.0, sideOff: 0, scalePpm: 4.6 },
              { lag: 0.055, sideOff: -28, scalePpm: 4.15 },
              { lag: 0.065, sideOff: 28, scalePpm: 4.15 },
            ].map((b, idx) => {
              const u = raidTotalP - b.lag;
              if (u <= 0.002) return null;
              const pose = evalRaidPose(u);
              const nx = -Math.sin((pose.angle * Math.PI) / 180) * b.sideOff;
              const ny = Math.cos((pose.angle * Math.PI) / 180) * b.sideOff;
              const enterScale = Math.min(1, u * 10);
              const landScale = u > 0.96 ? lerp(1, 0.85, (u - 0.96) / 0.04) : 1;
              return (
                <g key={`raid-b25-${idx}`} opacity={Math.min(1, u * 12)}>
                  <g transform="translate(8 12)" opacity={0.32}>
                    <B25Top2D
                      x={pose.pos[0] + nx}
                      y={pose.pos[1] + ny}
                      rot={pose.angle}
                      ppm={b.scalePpm * enterScale * landScale}
                      tint="ghost"
                      propPhase={t * 24 + idx}
                    />
                  </g>
                  <B25Top2D
                    x={pose.pos[0] + nx}
                    y={pose.pos[1] + ny}
                    rot={pose.angle}
                    ppm={b.scalePpm * enterScale * landScale}
                    tint="olive"
                    propPhase={t * 24 + idx}
                  />
                </g>
              );
            })}

          {bump(t, CUE.c02_s01_launch_outside, 0.9) > 0.01 && (
            <circle
              cx={1475}
              cy={542}
              r={lerp(18, 95, prog(t, CUE.c02_s01_launch_outside, CUE.c02_s01_launch_outside + 0.9))}
              fill="none"
              stroke={P2D.fuelBright}
              strokeWidth={3.5}
              opacity={bump(t, CUE.c02_s01_launch_outside, 0.9) * 0.85}
            />
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      <Label
        t={t}
        text="250 MILES"
        x={1290}
        y={325}
        from={CUE.c02_s01_us_250}
        until={142.3}
        bg={P2D.usMain}
        fg={P2D.ink}
      />
      <Label
        t={t}
        text="600 MILES"
        x={1110}
        y={210}
        from={CUE.c02_s01_jp_600}
        until={150.2}
        bg={P2D.jpMain}
        fg="#fff6ee"
      />
      <Label
        t={t}
        text="ONE-WAY TO CHINA"
        x={530}
        y={855}
        from={151.2}
        until={156.6}
        bg={P2D.fuelAmber}
        fg={P2D.ink}
      />
    </AbsoluteFill>
  );
};

export default C02S01;
