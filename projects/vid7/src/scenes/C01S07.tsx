import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { handheld } from '@core/frame';
import { bump, lerp, prog, useT } from '@core/time';
import { Blast2D } from '@skill/military/2d/fx';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { arcAngle, arcAt, arcPath, drawOn, smoothPath, type Pt } from '@skill/military/2d/path';
import { contours } from '@skill/military/2d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { P2D } from '../design/palette';
import { B25Top2D, CarrierTop2D, CompassRose2D, WarshipIcon2D } from '../parts/Silhouettes2D';

// ==================== DỮ LIỆU ĐỊA LÝ HẢI ĐỒ TÂY THÁI BÌNH DƯƠNG 1942 ====================

// Đảo chính Honshu (biên dạng chi tiết: Shimonoseki -> Seto -> Kii -> vịnh Ise/Nagoya -> Izu -> vịnh Tokyo & Boso -> Tohoku -> Aomori -> bán đảo Noto -> San'in)
const HONSHU_PTS: Pt[] = [
  [196, 718],
  [226, 712],
  [262, 702],
  [302, 694],
  [338, 688],
  [358, 700], // Vịnh Osaka
  [368, 742],
  [392, 754], // Bán đảo Kii
  [412, 722],
  [422, 686], // Vịnh Ise (Nagoya)
  [444, 694],
  [474, 678],
  [488, 658], // Vịnh Suruga
  [506, 672], // Bán đảo Izu
  [518, 642],
  [534, 616], // Bán đảo Miura
  [538, 584],
  [548, 562], // Đáy vịnh Tokyo
  [566, 568],
  [564, 594],
  [578, 618], // Mũi nam bán đảo Boso
  [594, 592],
  [612, 548], // Mũi Inubo (Choshi)
  [602, 496],
  [608, 442],
  [614, 396], // Vịnh Sendai
  [634, 344], // Bờ biển Sanriku
  [632, 286],
  [618, 232],
  [612, 178], // Bán đảo Shimokita (Aomori)
  [590, 174],
  [584, 198],
  [566, 184], // Bán đảo Tsugaru
  [556, 218],
  [560, 268], // Akita
  [542, 326],
  [524, 386], // Niigata
  [486, 444],
  [468, 488], // Vịnh Toyama
  [456, 456], // Bán đảo Noto nhô lên biển Nhật Bản
  [438, 466],
  [436, 504],
  [414, 558],
  [386, 608], // Vịnh Wakasa
  [342, 624],
  [292, 638], // Bờ San'in
  [242, 666],
  [204, 696],
];

// Sống núi cao trung tâm Honshu (Japanese Alps & Tohoku) để tạo tầng màu giấy nổi khối
const HONSHU_HIGH_PTS: Pt[] = [
  [252, 678],
  [326, 656],
  [404, 654],
  [468, 618],
  [518, 556],
  [566, 472],
  [586, 368],
  [588, 256],
  [572, 248],
  [548, 356],
  [506, 468],
  [454, 552],
  [386, 626],
  [306, 650],
];

// Đảo Shikoku
const SHIKOKU_PTS: Pt[] = [
  [248, 744],
  [278, 728],
  [316, 724],
  [346, 734],
  [342, 764],
  [318, 774],
  [298, 796],
  [264, 788],
  [242, 768],
];

// Đảo Kyushu
const KYUSHU_PTS: Pt[] = [
  [174, 742],
  [202, 756],
  [212, 796],
  [204, 846],
  [194, 898],
  [174, 932], // Kagoshima
  [158, 906],
  [146, 872],
  [124, 838], // Nagasaki / Amakusa
  [118, 796],
  [142, 762],
];

// Nam đảo Hokkaido (phía bắc eo biển Tsugaru)
const HOKKAIDO_PTS: Pt[] = [
  [564, 134],
  [594, 142],
  [616, 122],
  [652, 108],
  [706, 126], // Mũi Erimo
  [748, 74],
  [764, -20],
  [582, -20],
  [566, 48],
  [548, 98],
];

// Bán đảo Triều Tiên & bờ đông Trung Hoa ở rìa cực tây để thấy rõ biển Hoa Đông và điểm cạn xăng trước khi chạm đất liền
const KOREA_PTS: Pt[] = [
  [36, 210],
  [98, 224],
  [122, 292],
  [128, 368],
  [142, 438],
  [136, 498], // Busan
  [104, 524],
  [74, 512],
  [64, 456],
  [48, 396],
  [26, 336],
  [12, 268],
];

const MAINLAND_PTS: Pt[] = [
  [-280, -160],
  [96, -160],
  [84, 65],
  [54, 185],
  [18, 275],
  [-18, 365],
  [-36, 468],
  [-14, 565],
  [24, 668], // Cửa sông Trường Giang / Thượng Hải
  [36, 748], // Chiết Giang (hướng Chuchow)
  [18, 836],
  [-12, 924],
  [-52, 1025],
  [-96, 1180],
  [-280, 1180],
];

// Vùng thềm lục địa nông (seaShallow) ôm quanh quần đảo Nhật Bản
const SHALLOW_JAPAN_PTS: Pt[] = [
  [145, 690],
  [235, 620],
  [365, 575],
  [408, 435],
  [512, 345],
  [526, 120],
  [556, -40],
  [795, -40],
  [775, 140],
  [688, 225],
  [684, 385],
  [664, 575],
  [622, 668],
  [518, 718],
  [424, 798],
  [326, 845],
  [236, 968],
  [122, 972],
  [82, 838],
  [104, 738],
];

// Vùng biển trung bình (seaMid) chuyển tiếp ra rãnh sâu Thái Bình Dương
const MID_SEA_JAPAN_PTS: Pt[] = [
  [-240, -140],
  [920, -140],
  [910, 110],
  [855, 290],
  [845, 495],
  [795, 685],
  [675, 815],
  [515, 925],
  [355, 1065],
  [165, 1180],
  [-240, 1180],
];

// Tọa độ chiến thuật cố định trên hải đồ
const TOKYO: Pt = [548, 564];
const HORNET_POS: Pt = [1488, 526];
const ENTERPRISE_POS: Pt = [1548, 632];
const PLANNED_450_POS: Pt = [1142, 556]; // Điểm phóng dự kiến (tiến gần thêm 200 dặm)
const FUEL_CUTOFF_POS: Pt = [96, 838]; // Điểm cạn sạch xăng trên biển Hoa Đông trước khi chạm bờ Trung Quốc

const starPoints = (cx: number, cy: number, rOut: number, rIn: number): string =>
  [0, 1, 2, 3, 4]
    .map((k) => {
      const a1 = -Math.PI / 2 + (k * Math.PI * 2) / 5;
      const a2 = a1 + Math.PI / 5;
      return `${(cx + Math.cos(a1) * rOut).toFixed(1)},${(cy + Math.sin(a1) * rOut).toFixed(1)} ${(
        cx +
        Math.cos(a2) * rIn
      ).toFixed(1)},${(cy + Math.sin(a2) * rIn).toFixed(1)}`;
    })
    .join(' ');

// Tính sẵn các đường cong bản đồ và đường đồng mức ở cấp module (nhanh, tất định 100%)
const HONSHU_PATH = smoothPath(HONSHU_PTS, true, 0.45);
const HONSHU_HIGH_PATH = smoothPath(HONSHU_HIGH_PTS, true, 0.45);
const SHIKOKU_PATH = smoothPath(SHIKOKU_PTS, true, 0.45);
const KYUSHU_PATH = smoothPath(KYUSHU_PTS, true, 0.45);
const HOKKAIDO_PATH = smoothPath(HOKKAIDO_PTS, true, 0.42);
const KOREA_PATH = smoothPath(KOREA_PTS, true, 0.42);
const MAINLAND_PATH = smoothPath(MAINLAND_PTS, true, 0.38);
const SHALLOW_JAPAN_PATH = smoothPath(SHALLOW_JAPAN_PTS, true, 0.48);
const MID_SEA_JAPAN_PATH = smoothPath(MID_SEA_JAPAN_PTS, true, 0.48);

const JAPAN_CONTOURS = contours('vid7-honshu-1942-chart', 820, 1060, 8, 16, 215);

const C01S07: React.FC = () => {
  const t = useT();

  // ==================== CHUYỂN ĐỘNG CAMERA 2D THEO 3 NHỊP KỊCH BẢN ====================
  // Nhịp 1 (92.48–96.36s): Mở toàn cảnh Tây Thái Bình Dương, nhấn cụm 2 tàu sân bay Mỹ ngoài khơi
  // Nhịp 2 (96.36–104.92s): Lia nhẹ theo mũi tên tiến thêm 200 dặm & ổ phục kích đỏ của Hải quân Nhật
  // Nhịp 3a (104.92–109.10s): Đẩy vào cụm USS Hornet (zoom ~1.22) khi mở phương án 1 vứt 16 B-25 xuống biển & rút lui
  // Nhịp 3b (109.10–115.38s): Quét mở mượt sang tây theo đường cung vàng hổ phách phóng sớm 200 dặm xuyên Tokyo tới vạch cạn xăng
  const pIntro = prog(t, 92.48, 96.2);
  const pAmbushCam = prog(t, 96.36, 104.4);
  const pChoicePush = prog(t, 104.75, 107.8);
  const pStrikeSweep = prog(t, 109.3, 113.6);

  let camX = lerp(985, 1035, pIntro);
  camX = lerp(camX, 1015, pAmbushCam);
  camX = lerp(camX, 1215, pChoicePush);
  camX = lerp(camX, 925, pStrikeSweep);

  let camY = lerp(542, 548, pIntro);
  camY = lerp(camY, 552, pAmbushCam);
  camY = lerp(camY, 572, pChoicePush);
  camY = lerp(camY, 555, pStrikeSweep);

  let camZoom = lerp(1.01, 1.1, pIntro);
  camZoom = lerp(camZoom, 1.13, pAmbushCam);
  camZoom = lerp(camZoom, 1.24, pChoicePush);
  camZoom = lerp(camZoom, 1.07, pStrikeSweep);

  const shake = handheld(t, 2.2, 'c01s07-chart');

  // ==================== TIẾN ĐỘ CÁC SỰ KIỆN TRÊN HẢI ĐỒ (KHỚP CHUẨN CUE) ====================
  // 1) Nhấn mạnh 2 tàu sân bay Mỹ quý giá còn lại (Hornet & Enterprise)
  const usPulse = prog(t, 92.72, 94.6);
  const enterpriseHighlight = bump(t, CUE.c01_s07_enterprise - 0.15, 2.6);

  // 2) Mũi tên nét đứt dự kiến tiến thêm 200 dặm (96.36s -> chặn đứng ở 104.28s)
  const pAdvance200 = prog(t, 96.36, 99.1);
  const advanceDim = lerp(1, 0.34, prog(t, CUE.c01_s07_launch_now, CUE.c01_s07_launch_now + 1.2));

  // 3) Vòng sóng báo động đỏ từ Tokyo (98.82s) & đội hình phục kích Hải quân Nhật
  const pAlert = prog(t, CUE.c01_s07_alerted_japan, 101.2);
  const pJpFleet = prog(t, CUE.c01_s07_alerted_japan + 0.35, 103.6);
  const pAmbushLock = prog(t, CUE.c01_s07_ambush - 0.12, CUE.c01_s07_ambush + 0.45, Easing.out(Easing.back(1.6)));
  const jpFleetDim = lerp(1, 0.42, prog(t, CUE.c01_s07_launch_now + 0.3, CUE.c01_s07_launch_now + 1.6));

  // 4) Lựa chọn 1 (105.68s): Đẩy 16 chiếc B-25 xuống biển (tint="ghost") & mũi tên xám rút lui sang đông
  const pOverboard = prog(t, 104.95, 107.65, Easing.out(Easing.cubic));
  const overboardFadeOut = lerp(1, 0.36, prog(t, CUE.c01_s07_launch_now - 0.15, CUE.c01_s07_launch_now + 1.2));

  // 5) Lựa chọn 2 (109.66s): Phóng ngay lập tức từ vị trí xa hơn 200 dặm — cung vàng hổ phách rực sáng tới Tokyo & cạn xăng bên kia Nhật
  const pLaunchArc = prog(t, CUE.c01_s07_launch_now, 112.15, Easing.out(Easing.cubic));
  const pBeyondFuel = prog(t, 112.05, CUE.c01_s07_fuel_math + 0.35, Easing.out(Easing.cubic));
  const pEarlyBracket = prog(t, CUE.c01_s07_early_10h, 112.6);

  // Đường cung tấn công chính từ USS Hornet (650 dặm) vọt qua đầu ổ phục kích tới thẳng Tokyo
  const strikeArcD = useMemo(
    () => arcPath(HORNET_POS[0] - 18, HORNET_POS[1] - 6, TOKYO[0], TOKYO[1], 178, 1, 72),
    [],
  );

  // Đội hình tàu chiến Nhật cơ động khép gọng kìm phục kích tại điểm 450 dặm
  const jpShips = [
    { x0: 845, y0: 365, x1: 1032, y1: 458, rot: 22, carrier: true, scale: 1.18 },
    { x0: 838, y0: 748, x1: 1028, y1: 656, rot: -22, carrier: true, scale: 1.18 },
    { x0: 912, y0: 452, x1: 1094, y1: 504, rot: 14, carrier: false, scale: 0.9 },
    { x0: 908, y0: 668, x1: 1096, y1: 612, rot: -15, carrier: false, scale: 0.9 },
    { x0: 955, y0: 558, x1: 1106, y1: 556, rot: 0, carrier: false, scale: 0.82 },
  ];

  // 8 bóng B-25 "ghost" đại diện cho 16 oanh tạc cơ bị đẩy xuống biển trôi chìm khỏi mạn tàu Hornet
  const ghostBombers = [
    { dx0: -18, dy0: 34, dx1: -76, dy1: 128, r0: 175, r1: 142, delay: 0.0 },
    { dx0: 14, dy0: 38, dx1: -22, dy1: 162, r0: 184, r1: 215, delay: 0.08 },
    { dx0: 46, dy0: 34, dx1: 38, dy1: 144, r0: 178, r1: 156, delay: 0.16 },
    { dx0: 76, dy0: 30, dx1: 96, dy1: 168, r0: 188, r1: 226, delay: 0.24 },
    { dx0: -34, dy0: -32, dx1: -92, dy1: -116, r0: 182, r1: 214, delay: 0.12 },
    { dx0: 4, dy0: -36, dx1: -34, dy1: -144, r0: 176, r1: 145, delay: 0.2 },
    { dx0: 42, dy0: -34, dx1: 28, dy1: -128, r0: 185, r1: 218, delay: 0.28 },
    { dx0: 78, dy0: -30, dx1: 88, dy1: -148, r0: 179, r1: 152, delay: 0.34 },
  ];

  // Nhịp nhấp nháy cảnh báo đỏ tại vạch cạn nhiên liệu phía tây Nhật Bản
  const fuelBlink = t >= 112.1 ? 0.52 + 0.48 * Math.sin((t - 112.1) * 11.5) : 0;

  return (
    <AbsoluteFill style={{ background: P2D.seaDeep }}>
      {/* Đặt Defs2D BÊN NGOÀI Cam2D đúng quy chuẩn kỹ thuật */}
      <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(7, 16, 28, 0.46)" />
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P2D.seaDeep}>
        <svg
          width={2600}
          height={1500}
          viewBox="-300 -200 2600 1500"
          style={{ position: 'absolute', left: -300, top: -200, overflow: 'visible' }}
        >
          <defs>
            {/* Mặt nạ cắt đường đồng mức gói gọn tuyệt đối bên trong quần đảo Nhật Bản */}
            <clipPath id="japanArchipelagoClip">
              <path d={HONSHU_PATH} />
              <path d={SHIKOKU_PATH} />
              <path d={KYUSHU_PATH} />
              <path d={HOKKAIDO_PATH} />
            </clipPath>
            <radialGradient id="oceanVignette2D" cx="52%" cy="50%" r="62%">
              <stop offset="0%" stopColor={P2D.seaMid} stopOpacity={0.22} />
              <stop offset="100%" stopColor="#061423" stopOpacity={0.55} />
            </radialGradient>
          </defs>

          {/* ==================== 1. NỀN BIỂN 3 TẦNG SÂU & LƯỚI KINH VĨ ĐỘ HẢI ĐỒ ==================== */}
          <rect x={-300} y={-200} width={2600} height={1500} fill={P2D.seaDeep} />
          {/* Tầng biển trung bình (Continental Slope) */}
          <path d={MID_SEA_JAPAN_PATH} fill={P2D.seaMid} opacity={0.88} />
          <path d={MID_SEA_JAPAN_PATH} fill="none" stroke={P2D.seaGrid} strokeWidth={1.2} strokeDasharray="8 8" opacity={0.32} />

          {/* Tầng thềm lục địa nông ôm sát bờ biển Nhật Bản (Coastal Shelf) */}
          <path d={SHALLOW_JAPAN_PATH} fill={P2D.seaShallow} opacity={0.82} />
          <path d={SHALLOW_JAPAN_PATH} fill="none" stroke={P2D.seaGrid} strokeWidth={1.1} opacity={0.35} />

          {/* Chiều sâu ánh sáng mặt bàn hải đồ */}
          <rect x={-300} y={-200} width={2600} height={1500} fill="url(#oceanVignette2D)" />

          {/* Lưới kinh tuyến & vĩ tuyến P2D.seaGrid */}
          <g opacity={0.32}>
            {Array.from({ length: 17 }, (_, i) => {
              const gx = -240 + i * 160;
              const major = i % 2 === 0;
              return (
                <line
                  key={`lon-${i}`}
                  x1={gx}
                  y1={-200}
                  x2={gx}
                  y2={1300}
                  stroke={P2D.seaGrid}
                  strokeWidth={major ? 1.5 : 0.9}
                  strokeDasharray={major ? undefined : '6 7'}
                  opacity={major ? 0.85 : 0.5}
                />
              );
            })}
            {Array.from({ length: 11 }, (_, j) => {
              const gy = -140 + j * 160;
              const major = j % 2 === 0;
              return (
                <line
                  key={`lat-${j}`}
                  x1={-300}
                  y1={gy}
                  x2={2300}
                  y2={gy}
                  stroke={P2D.seaGrid}
                  strokeWidth={major ? 1.5 : 0.9}
                  strokeDasharray={major ? undefined : '6 7'}
                  opacity={major ? 0.85 : 0.5}
                />
              );
            })}
          </g>

          {/* Vòng cung cự ly hải đồ đồng tâm quanh Tokyo (450 dặm & 650 dặm) */}
          <g fill="none" stroke={P2D.seaGrid}>
            <circle cx={TOKYO[0]} cy={TOKYO[1]} r={345} strokeWidth={1.1} strokeDasharray="5 9" opacity={0.26} />
            <circle cx={TOKYO[0]} cy={TOKYO[1]} r={594} strokeWidth={1.4} strokeDasharray="10 8" opacity={0.38} />
            <circle cx={TOKYO[0]} cy={TOKYO[1]} r={940} strokeWidth={1.4} strokeDasharray="12 9" opacity={0.34} />
          </g>

          {/* ==================== 2. ĐẤT LIỀN GIẤY DA THUỘC, BÓNG BỜ & ĐƯỜNG ĐỒNG MỨC ==================== */}
          {/* Bờ đông lục địa Á Châu & bán đảo Triều Tiên phía cực tây làm mốc bờ bên kia biển Hoa Đông */}
          <g opacity={0.82}>
            <path d={MAINLAND_PATH} transform="translate(6 8)" fill="#081829" opacity={0.5} />
            <path d={KOREA_PATH} transform="translate(6 8)" fill="#081829" opacity={0.5} />
            <path d={MAINLAND_PATH} fill="#bcae8c" stroke={P2D.ink} strokeWidth={2.2} />
            <path d={KOREA_PATH} fill="#c4b592" stroke={P2D.ink} strokeWidth={2.2} />
          </g>

          {/* Bóng đổ bậc thềm bờ biển quần đảo Nhật Bản (sắc nét, không dính lỗi cắt ô filter) */}
          <g transform="translate(8 10)" opacity={0.52}>
            <path d={HONSHU_PATH} fill="#071525" />
            <path d={SHIKOKU_PATH} fill="#071525" />
            <path d={KYUSHU_PATH} fill="#071525" />
            <path d={HOKKAIDO_PATH} fill="#071525" />
          </g>
          <g transform="translate(3.5 4.5)">
            <path d={HONSHU_PATH} fill={P2D.landShadow} />
            <path d={SHIKOKU_PATH} fill={P2D.landShadow} />
            <path d={KYUSHU_PATH} fill={P2D.landShadow} />
            <path d={HOKKAIDO_PATH} fill={P2D.landShadow} />
          </g>

          {/* Mảng đất giấy da thuộc P2D.land + vùng cao nguyên P2D.landHigh */}
          <path d={HOKKAIDO_PATH} fill={P2D.land} />
          <path d={KYUSHU_PATH} fill={P2D.land} />
          <path d={SHIKOKU_PATH} fill={P2D.land} />
          <path d={HONSHU_PATH} fill={P2D.land} />
          <path d={HONSHU_HIGH_PATH} fill={P2D.landHigh} opacity={0.78} />

          {/* Đường đồng mức địa hình contours() cắt gọn bên trong các đảo Nhật Bản */}
          <g clipPath="url(#japanArchipelagoClip)" opacity={0.55}>
            {JAPAN_CONTOURS.map((c) => (
              <path
                key={c.level}
                d={c.d}
                transform="translate(40 -40)"
                fill="none"
                stroke={P2D.contour}
                strokeWidth={c.level % 2 === 0 ? 1.35 : 0.9}
              />
            ))}
          </g>

          {/* Đường viền bờ biển sắc nét P2D.ink */}
          <g fill="none" stroke={P2D.ink} strokeWidth={2.6} strokeLinejoin="round">
            <path d={HOKKAIDO_PATH} />
            <path d={KYUSHU_PATH} />
            <path d={SHIKOKU_PATH} />
            <path d={HONSHU_PATH} />
          </g>

          {/* Hoa gió la bàn hải đồ cổ điển */}
          <CompassRose2D x={1745} y={205} r={62} />

          {/* Thước tỉ lệ hải đồ thuần hình học góc dưới trái (không dùng chữ) */}
          <g transform="translate(760 975)" opacity={0.58}>
            <rect x={0} y={0} width={86} height={8} fill={P2D.paper} stroke={P2D.ink} strokeWidth={1.4} />
            <rect x={86} y={0} width={86} height={8} fill={P2D.seaGrid} stroke={P2D.ink} strokeWidth={1.4} />
            <rect x={172} y={0} width={86} height={8} fill={P2D.paper} stroke={P2D.ink} strokeWidth={1.4} />
            {[0, 86, 172, 258].map((tx) => (
              <line key={tx} x1={tx} y1={-5} x2={tx} y2={13} stroke={P2D.paper} strokeWidth={1.6} />
            ))}
          </g>

          {/* ==================== 3. VÒNG SÓNG BÁO ĐỘNG ĐỎ TỪ VỊNH TOKYO (98.82 s) ==================== */}
          {t >= CUE.c01_s07_alerted_japan && (
            <g>
              {/* Vùng phòng thủ bờ biển Nhật đỏ rực cảnh báo */}
              <circle
                cx={TOKYO[0]}
                cy={TOKYO[1]}
                r={594}
                fill={P2D.jpMain}
                opacity={0.07 * pAlert * jpFleetDim}
              />
              {/* 4 đợt sóng vô tuyến đỏ lan toả ra Thái Bình Dương */}
              {[0, 1, 2, 3].map((idx) => {
                const waveCycle = ((t - CUE.c01_s07_alerted_japan) * 0.44 - idx * 0.25) % 1;
                if (waveCycle < 0) return null;
                const rad = 36 + waveCycle * 680;
                const op = (1 - waveCycle) * 0.68 * jpFleetDim;
                return (
                  <g key={`radio-wave-${idx}`}>
                    <circle cx={TOKYO[0]} cy={TOKYO[1]} r={rad} fill="none" stroke={P2D.jpMain} strokeWidth={7} opacity={op * 0.28} />
                    <circle
                      cx={TOKYO[0]}
                      cy={TOKYO[1]}
                      r={rad}
                      fill="none"
                      stroke={P2D.jpLight}
                      strokeWidth={2.4}
                      strokeDasharray="18 10"
                      opacity={op}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Dấu sao đỏ thẫm & tâm ngắm mục tiêu Vịnh Tokyo */}
          <g transform={`translate(${TOKYO[0]} ${TOKYO[1]})`}>
            <circle r={24 + Math.sin(t * 3.5) * 2} fill={P2D.jpMain} opacity={0.2} />
            <circle r={17} fill="none" stroke={P2D.jpMain} strokeWidth={2} opacity={0.88} />
            <line x1={-24} y1={0} x2={-11} y2={0} stroke={P2D.jpMain} strokeWidth={2} />
            <line x1={11} y1={0} x2={24} y2={0} stroke={P2D.jpMain} strokeWidth={2} />
            <line x1={0} y1={-24} x2={0} y2={-11} stroke={P2D.jpMain} strokeWidth={2} />
            <line x1={0} y1={11} x2={0} y2={24} stroke={P2D.jpMain} strokeWidth={2} />
            <polygon points={starPoints(0, 0, 13.5, 5.6)} fill={P2D.jpMain} stroke={P2D.ink} strokeWidth={2} />
            <circle r={2.8} fill={P2D.paper} />
          </g>

          {/* ==================== 4. MŨI TÊN NÉT ĐỨT TIẾN THÊM 200 DẶM & Ổ PHỤC KÍCH NHẬT ==================== */}
          {pAdvance200 > 0.005 && (
            <g opacity={advanceDim}>
              {/* Vạch kẹp khoảng cách 200 dặm cần tiến thêm (1488 -> 1142) */}
              <line x1={PLANNED_450_POS[0]} y1={448} x2={PLANNED_450_POS[0]} y2={652} stroke={P2D.usLight} strokeWidth={1.6} strokeDasharray="6 6" opacity={0.55 * pAdvance200} />
              {/* Mũi tên hành quân nét đứt xanh của TF-16 tiến về điểm 450 dặm */}
              <path
                d={`M ${HORNET_POS[0] - 88} ${HORNET_POS[1] + 22} L ${PLANNED_450_POS[0] + 18} ${PLANNED_450_POS[1]}`}
                fill="none"
                stroke={P2D.usMain}
                strokeWidth={12}
                opacity={0.18}
                strokeLinecap="round"
                {...drawOn(310, pAdvance200)}
              />
              <line
                x1={HORNET_POS[0] - 88}
                y1={HORNET_POS[1] + 22}
                x2={lerp(HORNET_POS[0] - 88, PLANNED_450_POS[0] + 20, pAdvance200)}
                y2={lerp(HORNET_POS[1] + 22, PLANNED_450_POS[1], pAdvance200)}
                stroke={P2D.usLight}
                strokeWidth={4.2}
                strokeDasharray="14 10"
                strokeLinecap="round"
              />
              {/* Đầu mũi tên tiến quân */}
              {pAdvance200 > 0.25 && (
                <polygon
                  points="0,0 20,-9 15,0 20,9"
                  fill={P2D.usLight}
                  stroke={P2D.ink}
                  strokeWidth={1.6}
                  transform={`translate(${lerp(HORNET_POS[0] - 88, PLANNED_450_POS[0] + 8, pAdvance200)} ${lerp(
                    HORNET_POS[1] + 22,
                    PLANNED_450_POS[1],
                    pAdvance200,
                  )}) rotate(-2)`}
                />
              )}
            </g>
          )}

          {/* Đội hình tàu sân bay & tuần dương Nhật khép gọng kìm phục kích tại điểm 450 dặm */}
          {pJpFleet > 0.01 && (
            <g opacity={Math.min(1, pJpFleet * 1.4) * jpFleetDim}>
              {/* 2 mũi tên gọng kìm đỏ từ vùng biển Nhật lao ra điểm chốt chặn */}
              <path
                d={arcPath(825, 360, 1110, 520, 48, 1, 36)}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={9}
                opacity={0.2}
                strokeLinecap="round"
                {...drawOn(360, pJpFleet)}
              />
              <path
                d={arcPath(825, 360, 1110, 520, 48, 1, 36)}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={3.4}
                strokeLinecap="round"
                {...drawOn(360, pJpFleet)}
              />
              <path
                d={arcPath(820, 755, 1110, 592, -48, 1, 36)}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={9}
                opacity={0.2}
                strokeLinecap="round"
                {...drawOn(360, pJpFleet)}
              />
              <path
                d={arcPath(820, 755, 1110, 592, -48, 1, 36)}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={3.4}
                strokeLinecap="round"
                {...drawOn(360, pJpFleet)}
              />

              {/* Vòng tròn vùng tử địa phục kích */}
              <circle
                cx={PLANNED_450_POS[0]}
                cy={PLANNED_450_POS[1]}
                r={82}
                fill={P2D.jpMain}
                opacity={0.14 * pJpFleet}
              />
              <circle
                cx={PLANNED_450_POS[0]}
                cy={PLANNED_450_POS[1]}
                r={82}
                fill="none"
                stroke={P2D.jpMain}
                strokeWidth={2.6}
                strokeDasharray="12 8"
              />

              {/* 5 chiến hạm Nhật giữ cự ly thoáng, không đè nhau */}
              {jpShips.map((sh, idx) => {
                const sx = lerp(sh.x0, sh.x1, pJpFleet);
                const sy = lerp(sh.y0, sh.y1, pJpFleet);
                return (
                  <WarshipIcon2D
                    key={`jp-ship-${idx}`}
                    x={sx}
                    y={sy}
                    rot={sh.rot}
                    scale={sh.scale}
                    side="jp"
                    carrier={sh.carrier}
                  />
                );
              })}

              {/* Dấu khoá chặn chữ X đỏ & vụ nổ tượng trưng tại điểm phục kích (104.28 s) */}
              {pAmbushLock > 0.01 && (
                <g transform={`translate(${PLANNED_450_POS[0]} ${PLANNED_450_POS[1]}) scale(${pAmbushLock})`}>
                  <circle r={34} fill="#2b0c0c" fillOpacity={0.62} stroke={P2D.dangerRed} strokeWidth={3.2} />
                  <line x1={-21} y1={-21} x2={21} y2={21} stroke={P2D.jpLight} strokeWidth={6.5} strokeLinecap="round" />
                  <line x1={21} y1={-21} x2={-21} y2={21} stroke={P2D.jpLight} strokeWidth={6.5} strokeLinecap="round" />
                  <line x1={-21} y1={-21} x2={21} y2={21} stroke={P2D.dangerRed} strokeWidth={3.4} strokeLinecap="round" />
                  <line x1={21} y1={-21} x2={-21} y2={21} stroke={P2D.dangerRed} strokeWidth={3.4} strokeLinecap="round" />
                </g>
              )}
            </g>
          )}

          {/* Hiệu ứng nổ Blast2D ngay tại điểm phục kích lúc voice đọc "ambush" (104.28 s) */}
          <Blast2D
            t={t}
            at={CUE.c01_s07_ambush}
            x={PLANNED_450_POS[0]}
            y={PLANNED_450_POS[1]}
            size={38}
            air={true}
            life={2.35}
            seed={17}
            smoke="#5a3330"
          />

          {/* ==================== 5. LỰA CHỌN 1 (105.68 s): VỨT 16 B-25 XUỐNG BIỂN & QUAY ĐẦU RÚT LUI ==================== */}
          {pOverboard > 0.005 && (
            <g opacity={overboardFadeOut}>
              {/* Mũi tên xám bạc rút lui sang hướng đông thoát khỏi vùng nguy hiểm */}
              <path
                d={arcPath(HORNET_POS[0] + 58, HORNET_POS[1] + 18, 1825, 498, -42, pOverboard, 40)}
                fill="none"
                stroke="#9eb6cc"
                strokeWidth={16}
                opacity={0.22}
                strokeLinecap="round"
              />
              <path
                d={arcPath(HORNET_POS[0] + 58, HORNET_POS[1] + 18, 1825, 498, -42, pOverboard, 40)}
                fill="none"
                stroke="#c2d6e8"
                strokeWidth={5.2}
                strokeDasharray="15 9"
                strokeLinecap="round"
              />
              {pOverboard > 0.25 && (
                <polygon
                  points="0,0 -24,-11 -18,0 -24,11"
                  fill="#c2d6e8"
                  stroke={P2D.ink}
                  strokeWidth={1.8}
                  transform={`translate(${
                    arcAt(HORNET_POS[0] + 58, HORNET_POS[1] + 18, 1825, 498, -42, pOverboard)[0]
                  } ${
                    arcAt(HORNET_POS[0] + 58, HORNET_POS[1] + 18, 1825, 498, -42, pOverboard)[1]
                  }) rotate(${arcAngle(HORNET_POS[0] + 58, HORNET_POS[1] + 18, 1825, 498, -42, pOverboard)})`}
                />
              )}

              {/* Dãy bóng B25Top2D tint="ghost" trôi dạt khỏi hai mạn tàu Hornet rồi chìm mờ dần */}
              {ghostBombers.map((gb, idx) => {
                const localP = Math.max(0, Math.min(1, (pOverboard - gb.delay * 0.55) / (1 - gb.delay * 0.55)));
                if (localP <= 0.01) return null;
                const bx = HORNET_POS[0] + lerp(gb.dx0, gb.dx1 * 1.08, localP);
                const by = HORNET_POS[1] + lerp(gb.dy0, gb.dy1 * 1.08, localP);
                const brot = lerp(gb.r0, gb.r1, localP);
                // Sóng bọt nước trắng xanh loang quanh máy bay bị đẩy xuống biển để nổi rõ trên nền biển sâu
                const sinkFade = localP < 0.2 ? localP / 0.2 : lerp(0.96, 0.52, (localP - 0.2) / 0.8);
                const scaleDown = lerp(2.25, 1.72, localP);
                return (
                  <g key={`ghost-b25-${idx}`} opacity={sinkFade}>
                    <circle
                      cx={bx}
                      cy={by}
                      r={16 + localP * 20}
                      fill={P2D.seaShallow}
                      fillOpacity={0.35 * (1 - localP * 0.5)}
                      stroke="#8ab8d9"
                      strokeWidth={1.6}
                      strokeDasharray="6 5"
                      opacity={0.75 * (1 - localP * 0.45)}
                    />
                    <B25Top2D x={bx} y={by} rot={brot} ppm={scaleDown} tint="ghost" />
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== 6. CỤM HẠM ĐỘI MỸ TF-16: USS HORNET, USS ENTERPRISE & TÀU HỘ TỐNG ==================== */}
          <g>
            {/* Vòng bảo vệ chiến thuật xanh lam quanh Lực lượng Đặc nhiệm 16 */}
            <circle
              cx={1498}
              cy={574}
              r={154}
              fill={P2D.usMain}
              opacity={0.07 * usPulse}
            />
            <circle
              cx={1498}
              cy={574}
              r={154}
              fill="none"
              stroke={P2D.usMain}
              strokeWidth={2}
              strokeDasharray="12 10"
              opacity={0.48 * usPulse}
            />

            {/* Vòng sáng định danh USS Hornet (93.98 s) & USS Enterprise (102.26 s) */}
            <circle
              cx={HORNET_POS[0]}
              cy={HORNET_POS[1]}
              r={54 + Math.sin(t * 2.8) * 3}
              fill="none"
              stroke={P2D.usLight}
              strokeWidth={2.2}
              opacity={0.62 * usPulse}
            />
            <circle
              cx={ENTERPRISE_POS[0]}
              cy={ENTERPRISE_POS[1]}
              r={48 + enterpriseHighlight * 14}
              fill={P2D.usMain}
              fillOpacity={0.14 * enterpriseHighlight}
              stroke={enterpriseHighlight > 0.1 ? P2D.paper : P2D.usLight}
              strokeWidth={1.8 + enterpriseHighlight * 2.2}
              opacity={0.55 * usPulse + 0.45 * enterpriseHighlight}
            />

            {/* 3 tuần dương hạm / khu trục hạm hộ tống (cự ly rộng, không chạm tàu sân bay) */}
            <WarshipIcon2D x={1382} y={468} rot={183} scale={0.82} side="us" carrier={false} />
            <WarshipIcon2D x={1388} y={642} rot={183} scale={0.82} side="us" carrier={false} />
            <WarshipIcon2D x={1622} y={568} rot={183} scale={0.8} side="us" carrier={false} />

            {/* Tàu sân bay hộ tống USS Enterprise (CV-6) */}
            <CarrierTop2D x={ENTERPRISE_POS[0]} y={ENTERPRISE_POS[1]} rot={183} ppm={0.46} showLaunchStripe={false} />

            {/* Soái hạm USS Hornet (CV-8) với vạch sơn cất cánh trắng mạn trái */}
            <CarrierTop2D x={HORNET_POS[0]} y={HORNET_POS[1]} rot={183} ppm={0.58} showLaunchStripe={true} />
          </g>

          {/* ==================== 7. LỰA CHỌN 2 (109.66 s): CUNG TẤN CÔNG VÀNG HỔ PHÁCH PHÓNG SỚM 200 DẶM ==================== */}
          {pLaunchArc > 0.005 && (
            <g>
              {/* Thước kẹp khoảng cách 200 dặm xa hơn dự kiến (từ 1142 tới 1488) sáng rực màu hổ phách */}
              {pEarlyBracket > 0.01 && (
                <g opacity={pEarlyBracket}>
                  <line x1={PLANNED_450_POS[0]} y1={696} x2={HORNET_POS[0]} y2={696} stroke={P2D.fuelAmber} strokeWidth={9} opacity={0.2} />
                  <line x1={PLANNED_450_POS[0]} y1={696} x2={HORNET_POS[0]} y2={696} stroke={P2D.fuelBright} strokeWidth={3} />
                  <line x1={PLANNED_450_POS[0]} y1={680} x2={PLANNED_450_POS[0]} y2={712} stroke={P2D.fuelBright} strokeWidth={3} />
                  <line x1={HORNET_POS[0]} y1={680} x2={HORNET_POS[0]} y2={712} stroke={P2D.fuelBright} strokeWidth={3} />
                  {/* Vạch chia từng nấc 50 dặm */}
                  {[0.25, 0.5, 0.75].map((f, i) => {
                    const tx = lerp(PLANNED_450_POS[0], HORNET_POS[0], f);
                    return <line key={i} x1={tx} y1={688} x2={tx} y2={704} stroke={P2D.fuelAmber} strokeWidth={2} />;
                  })}
                </g>
              )}

              {/* Đường cung tấn công 650 dặm vẽ NÉT KÉP 3 LỚP (halo rộng + quầng cam + lõi vàng sáng, KHÔNG dùng filter glow!) */}
              <path
                d={strikeArcD}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={22}
                opacity={0.18}
                strokeLinecap="round"
                {...drawOn(1120, pLaunchArc)}
              />
              <path
                d={strikeArcD}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={10}
                opacity={0.48}
                strokeLinecap="round"
                {...drawOn(1120, pLaunchArc)}
              />
              <path
                d={strikeArcD}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={4.2}
                opacity={0.98}
                strokeLinecap="round"
                {...drawOn(1120, pLaunchArc)}
              />

              {/* Biên đội 5 chiếc B-25B Mitchell (tint="olive") sải cánh bay dọc theo đường cung vàng tới Tokyo */}
              {[0, 1, 2, 3, 4].map((idx) => {
                // Giãn đều cự ly dọc cung để 5 máy bay hoàn toàn tách bạch, không chạm cánh nhau
                const sPos = pLaunchArc * 0.94 - idx * 0.135;
                if (sPos <= 0.04 || sPos >= 0.99) return null;
                const [ax, ay] = arcAt(HORNET_POS[0] - 18, HORNET_POS[1] - 6, TOKYO[0], TOKYO[1], 178, sPos);
                const ang = arcAngle(HORNET_POS[0] - 18, HORNET_POS[1] - 6, TOKYO[0], TOKYO[1], 178, sPos);
                const rad = ((ang + 90) * Math.PI) / 180;
                const latOffset = idx === 0 ? 0 : (idx % 2 === 1 ? 1 : -1) * (16 + Math.floor((idx - 1) / 2) * 10);
                const px = ax + Math.cos(rad) * latOffset;
                const py = ay + Math.sin(rad) * latOffset;

                return (
                  <g key={`strike-b25-${idx}`}>
                    {/* Vệt khói trắng mỏng sau 2 động cơ */}
                    <g transform={`translate(${px} ${py}) rotate(${ang})`} opacity={0.45}>
                      <line x1={-18} y1={-7} x2={-44} y2={-7} stroke={P2D.paper} strokeWidth={1.6} strokeLinecap="round" />
                      <line x1={-18} y1={7} x2={-44} y2={7} stroke={P2D.paper} strokeWidth={1.6} strokeLinecap="round" />
                    </g>
                    <B25Top2D x={px} y={py} rot={ang} ppm={2.35} tint="olive" propPhase={t * 28 + idx} />
                  </g>
                );
              })}

              {/* Chớp nổ mục tiêu rực sáng tại Tokyo khi đầu mũi cung vàng chạm vịnh Tokyo */}
              <Blast2D
                t={t}
                at={111.85}
                x={TOKYO[0]}
                y={TOKYO[1]}
                size={34}
                air={true}
                life={3.6}
                seed={29}
                smoke="#613a26"
              />
            </g>
          )}

          {/* ==================== 8. ĐƯỜNG BAY HỤT NHIÊN LIỆU & VẠCH ĐỎ NHẤP NHÁY BÊN KIA NHẬT BẢN ==================== */}
          {pBeyondFuel > 0.01 && (
            <g>
              {/* Quỹ đạo đỏ đứt quãng sau khi đánh Tokyo bay dọc xuống biển Hoa Đông hướng về Trung Hoa nhưng hụt cự ly */}
              <path
                d={arcPath(TOKYO[0], TOKYO[1], FUEL_CUTOFF_POS[0], FUEL_CUTOFF_POS[1], -58, pBeyondFuel, 40)}
                fill="none"
                stroke={P2D.dangerRed}
                strokeWidth={14}
                opacity={0.22}
                strokeLinecap="round"
              />
              <path
                d={arcPath(TOKYO[0], TOKYO[1], FUEL_CUTOFF_POS[0], FUEL_CUTOFF_POS[1], -58, pBeyondFuel, 40)}
                fill="none"
                stroke={P2D.dangerRed}
                strokeWidth={4.2}
                strokeDasharray="12 8"
                strokeLinecap="round"
              />

              {/* Vạch chắn nhấp nháy đỏ + ký hiệu đồng hồ xăng cạn (thuần hình học, không viết chữ!) giữa biển */}
              {pBeyondFuel > 0.65 && (
                <g transform={`translate(${FUEL_CUTOFF_POS[0]} ${FUEL_CUTOFF_POS[1]})`} opacity={Math.min(1, (pBeyondFuel - 0.65) * 3)}>
                  {/* Vòng cảnh báo cạn xăng nhấp nháy giữa biển khơi trước khi tới bờ lục địa */}
                  <circle r={42} fill={P2D.dangerRed} opacity={0.16 * fuelBlink} />
                  <circle r={32} fill="none" stroke={P2D.dangerRed} strokeWidth={3} strokeDasharray="8 6" opacity={0.45 + 0.55 * fuelBlink} />

                  {/* Thanh chắn ngang báo điểm giới hạn toán học nhiên liệu */}
                  <line x1={-6} y1={-46} x2={6} y2={46} stroke={P2D.dangerRed} strokeWidth={11} opacity={0.24 * fuelBlink} strokeLinecap="round" />
                  <line x1={-6} y1={-46} x2={6} y2={46} stroke={P2D.jpLight} strokeWidth={4.2} opacity={0.55 + 0.45 * fuelBlink} strokeLinecap="round" />

                  {/* Biểu tượng giọt nhiên liệu rỗng bị gạch chéo phía trên điểm cạn xăng */}
                  <g transform="translate(0 -66)">
                    <circle r={20} fill="#1f0d12" stroke={P2D.dangerRed} strokeWidth={2.6} />
                    {/* Hình giọt xăng rỗng */}
                    <path
                      d="M 0 -11 C 5 -3 8 2 8 6 A 8 8 0 1 1 -8 6 C -8 2 -5 -3 0 -11 Z"
                      fill="none"
                      stroke={P2D.fuelAmber}
                      strokeWidth={2.2}
                    />
                    {/* Gạch chéo đỏ báo cạn sạch */}
                    <line x1={-11} y1={11} x2={11} y2={-11} stroke={P2D.dangerRed} strokeWidth={3} strokeLinecap="round" />
                  </g>
                </g>
              )}
            </g>
          )}
        </svg>
      </Cam2D>

      {/* Duy nhất 1 Label chuẩn toàn cảnh: "200 MILES EARLY" (111.22–115.00 s) */}
      <Label
        t={t}
        text="200 MILES EARLY"
        x={1490}
        y={885}
        from={CUE.c01_s07_early_10h}
        until={115.0}
      />

      {/* Lớp hạt giấy bản đồ cổ phủ cuối cảnh */}
      <Grain opacity={0.42} />
    </AbsoluteFill>
  );
};

export default C01S07;
