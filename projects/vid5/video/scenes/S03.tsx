import React from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { bump, lerp, mix, prog } from '@kit/theme';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { CUE } from '../cues';
import { BlueprintGrid, F15Top2D, F35Top2D } from '../local/jets2d';
import { P } from '../local/palette';

/** Khối động cơ turbofan GE F110-GE-129 vẽ rời nhìn từ trên xuống (tỉ lệ đồng bộ F15Top2D). */
const DetachedTurbofan2D: React.FC<{ x: number; y: number; highlight: number }> = ({ x, y, highlight }) => (
  <g transform={`translate(${x} ${y})`}>
    {/* Vỏ buồng quạt & máy nén titan */}
    <rect x={-13} y={-44} width={26} height={86} rx={5} fill="#2c3e54" stroke={P.ink} strokeWidth={1.8} />
    <rect x={-9} y={-40} width={18} height={76} rx={3} fill="#4d6887" opacity={0.75} />
    {/* Miệng hút cánh quạt trước */}
    <rect x={-12} y={-46} width={24} height={9} rx={2} fill={P.f15Light} stroke={P.ink} strokeWidth={1.5} />
    {/* Gân sườn máy nén cao áp & đường ống dẫn nhiên liệu */}
    {[-28, -16, -4, 8, 20].map((ry) => (
      <line key={ry} x1={-12} y1={ry} x2={12} y2={ry} stroke={P.ink} strokeWidth={1.3} opacity={0.65} />
    ))}
    <line x1={0} y1={-36} x2={0} y2={28} stroke={P.amber} strokeWidth={1.6} opacity={0.8} />
    {/* Loa phụt cánh hoa kim loại phía sau */}
    <polygon points="-12,42 12,42 10,56 -10,56" fill="#212a36" stroke={P.ink} strokeWidth={1.7} />
    {[-6, -2, 2, 6].map((nx) => (
      <line key={nx} x1={nx * 1.3} y1={42} x2={nx} y2={55} stroke="#788ba1" strokeWidth={1.1} />
    ))}
    {/* Viền cảnh báo vàng hổ phách khi nhấn mạnh chưa tính tiền động cơ */}
    {highlight > 0.02 && (
      <rect
        x={-16}
        y={-49}
        width={32}
        height={108}
        rx={7}
        fill="none"
        stroke={P.amberHot}
        strokeWidth={2}
        strokeDasharray="6 4"
        opacity={highlight}
      />
    )}
  </g>
);

/** Ký hiệu dấu "+ ?" vẽ bằng vector hình học thuần (không phụ thuộc text font) cho phần chi phí động cơ tách rời. */
const PlusQuestionBadge: React.FC<{ x: number; y: number; p: number }> = ({ x, y, p }) => {
  if (p <= 0.01) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${0.8 + 0.2 * p})`} opacity={p}>
      <rect x={-44} y={-24} width={88} height={48} rx={24} fill="#1b1408" stroke={P.amberHot} strokeWidth={2.5} />
      {/* Dấu + */}
      <line x1={-26} y1={0} x2={-8} y2={0} stroke={P.amberHot} strokeWidth={4} strokeLinecap="round" />
      <line x1={-17} y1={-9} x2={-17} y2={9} stroke={P.amberHot} strokeWidth={4} strokeLinecap="round" />
      {/* Dấu ? hình học */}
      <path
        d="M6,-8 C6,-15 22,-15 22,-7 C22,-1 14,0 14,6"
        fill="none"
        stroke={P.amberHot}
        strokeWidth={3.8}
        strokeLinecap="round"
      />
      <circle cx={14} cy={14} r={2.6} fill={P.amberHot} />
    </g>
  );
};

/** Silhouette F-15EX thu nhỏ nhìn từ trên xuống (mũi hướng lên -Y) dùng cho lưới sân đỗ 267 chiếc. */
const MiniEagleIcon: React.FC<{
  x: number;
  y: number;
  fill: string;
  accent: string;
  opacity: number;
  scale?: number;
}> = ({ x, y, fill, accent, opacity, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`} opacity={opacity}>
    {/* Cánh quét 45° + thân nâng + hai cánh đuôi ngang đặc trưng của F-15 */}
    <path
      d="M0,-21 L3,-12 L4,-5 L18,5 L18,9 L5,8 L5,13 L11,18 L11,20 L4,18 L3,21 L1,21 L1,16 L-1,16 L-1,21 L-3,21 L-4,18 L-11,20 L-11,18 L-5,13 L-5,8 L-18,9 L-18,5 L-4,-5 L-3,-12 Z"
      fill={fill}
      stroke={P.ink}
      strokeWidth={1.1}
      strokeLinejoin="round"
    />
    {/* Vòm kính buồng lái sáng */}
    <ellipse cx={0} cy={-9} rx={1.7} ry={4.2} fill={accent} />
  </g>
);

// Danh sách 267 vị trí đỗ trên lưới chiến lược: 20 cột x 14 hàng (13 hàng đầu x 20 = 260 + 7 chiếc căn giữa ở hàng 14 = 267)
const FLEET_SLOTS = Array.from({ length: 267 }, (_, idx) => {
  const row = Math.floor(idx / 20);
  const col = row < 13 ? idx % 20 : 6 + (idx - 260) + 0.5;
  return {
    idx,
    row,
    x: 238 + col * 76,
    y: 1365 + row * 53,
  };
});

const S03: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== TIẾN ĐỘ PHA 1: BÀN CÂN GIÁ XUẤT XƯỞNG LẦU NĂM GÓC (42.15 – 64.5s) ====================
  const pF35Bar = prog(t, 45.4, 49.1);
  const pLot7Seal = prog(t, CUE.s03_lot7 - 0.15, CUE.s03_lot7 + 0.55);
  const pF15Bar = prog(t, 56.2, 59.7);
  const pEngineExclude = prog(t, 60.5, 62.4);

  // Thước quy đổi chiều cao cột giá: đáy y = 800, 1 triệu USD = 4.0 px (tối đa $130M = 520 px)
  const barBaseY = 800;
  const f35AvgPx = 87 * 4.0 * pF35Bar; // $87M trung bình ($82M–$92M) -> 348 px
  const f15AvgPx = 102.5 * 4.0 * pF15Bar; // $102.5M trung bình ($97M–$108M) -> 410 px

  // Độ nghiêng đòn cân trung tâm (nghiêng về F-35 lúc đầu rồi đảo mạnh nghiêng nặng sang F-15EX khi vượt $100M)
  const tiltDeg = -5.5 * pF35Bar + 13.5 * pF15Bar;

  // ==================== TIẾN ĐỘ PHA 2: LƯỚI SÂN ĐỖ CHIẾN LƯỢC 120 -> 267 CHIẾC (64.5 – 75.76s) ====================
  const panToApron = prog(t, 64.3, 66.1);
  const pDoublingWave = prog(t, 70.1, 73.95);

  // Điều khiển Cam2D mượt qua hai tầng không gian
  const focusF35 = prog(t, 45.5, 48.8) * (1 - prog(t, 52.0, 54.5));
  const focusF15 = prog(t, 54.5, 58.5) * (1 - panToApron);
  const camX = lerp(960 - 75 * focusF35 + 95 * focusF15, 960, panToApron);
  const camY = lerp(540, 1742, panToApron);
  const zoomP1 = 1.0 + 0.04 * Math.max(focusF35, focusF15);
  const zoomP2 = lerp(0.98, 0.94, prog(t, 70.0, 74.2));
  const camZoom = lerp(zoomP1, zoomP2, panToApron);

  const hh = handheld(t, 2.8, 's03_cam');
  const thud = (bump(t, CUE.s03_f15Price, 0.3) + bump(t, CUE.s03_fleet267, 0.35)) * 6;
  const shake: readonly [number, number] = [hh[0], hh[1] + thud * Math.sin(t * 42)];

  return (
    <AbsoluteFill style={{ background: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <Layer>
          <Defs2D />
          {/* Mặt bàn kế hoạch Lầu Năm Góc trải dài xuyên suốt cả 2 tầng (Zone A & Zone B) */}
          <BlueprintGrid x0={-600} y0={-420} w={3120} h={3100} step={120} id="s03_bp" tint="#0b1a2f" />

          {/* ==================================================================================== */}
          {/* PHA 1 (ZONE A, y ≈ 540): BÀN CÂN GIÁ XUẤT XƯỞNG F-35A ($82–92M) VS F-15EX ($97–108M) */}
          {/* ==================================================================================== */}

          {/* Huy hiệu hình học Ngũ Giác Đài (Pentagon) chìm dưới tâm bàn kế hoạch */}
          <g transform="translate(960 540)" opacity={0.18}>
            {[380, 295, 190, 85].map((r, k) => (
              <polygon
                key={k}
                points={Array.from({ length: 5 }, (_, i) => {
                  const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
                  return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`;
                }).join(' ')}
                fill="none"
                stroke={k === 0 ? P.gridBright : P.grid}
                strokeWidth={k === 0 ? 3 : 1.8}
              />
            ))}
            {Array.from({ length: 5 }, (_, i) => {
              const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
              return (
                <line
                  key={i}
                  x1={0}
                  y1={0}
                  x2={Math.cos(a) * 380}
                  y2={Math.sin(a) * 380}
                  stroke={P.grid}
                  strokeWidth={1.4}
                />
              );
            })}
          </g>

          {/* ---------- Ô TRÁI: F-35A LIGHTNING II + THƯỚC GIÁ $82M–$92M (ĐÃ GỒM ĐỘNG CƠ) ---------- */}
          <g filter="url(#sh)">
            <rect
              x={136}
              y={185}
              width={694}
              height={715}
              rx={18}
              fill="#0d1e36"
              fillOpacity={0.88}
              stroke={pF35Bar > 0.1 ? P.cyan : P.gridBright}
              strokeWidth={2.2}
            />
          </g>
          {/* Vòng sân đỗ kiểm định F-35A */}
          <circle cx={380} cy={545} r={195} fill="none" stroke={P.grid} strokeWidth={1.3} strokeDasharray="8 6" opacity={0.5} />
          <line x1={380} y1={285} x2={380} y2={825} stroke={P.grid} strokeWidth={1} opacity={0.4} />
          <line x1={175} y1={545} x2={585} y2={545} stroke={P.grid} strokeWidth={1} opacity={0.4} />

          {/* F-35A chiếu bằng hướng mũi lên trên (-90°) */}
          <F35Top2D x={380} y={545} rot={-90} scale={1.18} />

          {/* Chỉ báo động cơ đơn F135 nằm sẵn bên trong thân F-35A (đã tính trong giá xuất xưởng) */}
          {pF35Bar > 0.25 && (
            <g opacity={prog(t, 47.2, 48.5)}>
              <rect
                x={362}
                y={625}
                width={36}
                height={108}
                rx={6}
                fill={P.green}
                fillOpacity={0.18}
                stroke={P.green}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
              <circle cx={380} cy={768} r={16} fill="#0c2622" stroke={P.green} strokeWidth={2.2} />
              <path d="M372,768 L378,774 L389,762" fill="none" stroke={P.green} strokeWidth={2.8} strokeLinecap="round" />
            </g>
          )}

          {/* Thước cột giá bên phải ô F-35A (x = 640..754, đáy y = 800) */}
          <g>
            <rect x={636} y={272} width={124} height={532} rx={10} fill="#081324" stroke={P.grid} strokeWidth={1.6} />
            {/* Vạch chia mỗi $10M (40 px) từ $10M tới $120M */}
            {Array.from({ length: 12 }, (_, i) => {
              const ty = barBaseY - (i + 1) * 40;
              const major = (i + 1) % 5 === 0;
              return (
                <line
                  key={i}
                  x1={636}
                  y1={ty}
                  x2={major ? 760 : 656}
                  y2={ty}
                  stroke={major ? P.gridBright : P.grid}
                  strokeWidth={major ? 1.5 : 1}
                  opacity={major ? 0.5 : 0.3}
                />
              );
            })}
            {/* Thân cột giá Cyan mọc lên mức $82M–$92M */}
            {f35AvgPx > 2 && (
              <g>
                <rect
                  x={646}
                  y={barBaseY - f35AvgPx}
                  width={104}
                  height={f35AvgPx}
                  rx={6}
                  fill={P.cyan}
                  fillOpacity={0.82}
                  stroke={P.cyanSoft}
                  strokeWidth={2}
                />
                {/* Khấc gạch chia từng khối $10M */}
                {Array.from({ length: Math.floor(f35AvgPx / 40) }, (_, k) => (
                  <line
                    key={k}
                    x1={648}
                    y1={barBaseY - (k + 1) * 40}
                    x2={748}
                    y2={barBaseY - (k + 1) * 40}
                    stroke="#092238"
                    strokeWidth={2}
                    opacity={0.55}
                  />
                ))}
                {/* Khung biên độ dao động $82M..$92M */}
                {pF35Bar > 0.85 && (
                  <rect
                    x={640}
                    y={barBaseY - 92 * 4}
                    width={116}
                    height={(92 - 82) * 4}
                    rx={4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.4}
                  />
                )}
              </g>
            )}
          </g>

          {/* ---------- TRỤC CÂN SO SÁNH Ở GIỮA BÀN KẾ HOẠCH (x = 960) ---------- */}
          {/* Đường chuẩn ngang gióng từ đỉnh giá F-35A ($87M) sang cột F-15EX để thấy rõ F-15EX vượt lên */}
          {pF35Bar > 0.6 && (
            <line
              x1={760}
              y1={barBaseY - f35AvgPx}
              x2={1160}
              y2={barBaseY - f35AvgPx}
              stroke={P.cyanSoft}
              strokeWidth={2}
              strokeDasharray="8 6"
              opacity={0.75}
            />
          )}
          {/* Đòn cân cơ khí Lầu Năm Góc tại trung tâm */}
          <g transform="translate(960 560)">
            <polygon points="-22,120 22,120 7,0 -7,0" fill={P.bgCard} stroke={P.gridBright} strokeWidth={2} />
            <g transform={`rotate(${tiltDeg})`}>
              <line x1={-96} y1={0} x2={96} y2={0} stroke={pF15Bar > 0.3 ? P.amber : P.cyanSoft} strokeWidth={6} strokeLinecap="round" />
              <circle cx={-96} cy={0} r={9} fill={P.cyan} stroke={P.ink} strokeWidth={2} />
              <circle cx={96} cy={0} r={9} fill={pF15Bar > 0.1 ? P.amber : P.gridBright} stroke={P.ink} strokeWidth={2} />
            </g>
            <circle cx={0} cy={0} r={13} fill={P.paper} stroke={P.ink} strokeWidth={2.5} />
          </g>

          {/* ---------- Ô PHẢI: F-15EX LOT 7 ($97M–$108M) + TÁCH RỜI 2 ĐỘNG CƠ "+ ?" ---------- */}
          <g filter="url(#sh)">
            <rect
              x={1090}
              y={185}
              width={694}
              height={715}
              rx={18}
              fill="#0d1e36"
              fillOpacity={0.88}
              stroke={pF15Bar > 0.1 ? P.amber : P.gridBright}
              strokeWidth={pF15Bar > 0.1 ? 3 : 2.2}
            />
          </g>

          {/* Thước cột giá bên trái ô F-15EX (x = 1160..1284, đáy y = 800) */}
          <g>
            <rect x={1160} y={272} width={124} height={532} rx={10} fill="#081324" stroke={P.grid} strokeWidth={1.6} />
            {Array.from({ length: 12 }, (_, i) => {
              const ty = barBaseY - (i + 1) * 40;
              const major = (i + 1) % 5 === 0;
              return (
                <line
                  key={i}
                  x1={major ? 1160 : 1264}
                  y1={ty}
                  x2={1284}
                  y2={ty}
                  stroke={major ? P.gridBright : P.grid}
                  strokeWidth={major ? 1.5 : 1}
                  opacity={major ? 0.5 : 0.3}
                />
              );
            })}
            {/* Thân cột giá Strike Amber vọt cao vượt F-35A lên $97M–$108M */}
            {f15AvgPx > 2 && (
              <g>
                <rect
                  x={1170}
                  y={barBaseY - f15AvgPx}
                  width={104}
                  height={f15AvgPx}
                  rx={6}
                  fill={P.amber}
                  fillOpacity={0.9}
                  stroke={P.amberHot}
                  strokeWidth={2.2}
                />
                {Array.from({ length: Math.floor(f15AvgPx / 40) }, (_, k) => (
                  <line
                    key={k}
                    x1={1172}
                    y1={barBaseY - (k + 1) * 40}
                    x2={1272}
                    y2={barBaseY - (k + 1) * 40}
                    stroke="#3b2205"
                    strokeWidth={2}
                    opacity={0.5}
                  />
                ))}
                {pF15Bar > 0.85 && (
                  <rect
                    x={1164}
                    y={barBaseY - 108 * 4}
                    width={116}
                    height={(108 - 97) * 4}
                    rx={4}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.4}
                  />
                )}
              </g>
            )}
            {/* Khối cộng thêm chi phí 2 động cơ đứt nét ở đỉnh cột giá */}
            {pEngineExclude > 0.02 && (
              <g opacity={pEngineExclude}>
                <rect
                  x={1170}
                  y={barBaseY - 108 * 4 - 66}
                  width={104}
                  height={62}
                  rx={6}
                  fill={P.red}
                  fillOpacity={0.22}
                  stroke={P.amberHot}
                  strokeWidth={2.4}
                  strokeDasharray="7 5"
                />
                <line x1={1212} y1={barBaseY - 108 * 4 - 35} x2={1232} y2={barBaseY - 108 * 4 - 35} stroke={P.amberHot} strokeWidth={3.5} />
                <line x1={1222} y1={barBaseY - 108 * 4 - 45} x2={1222} y2={barBaseY - 108 * 4 - 25} stroke={P.amberHot} strokeWidth={3.5} />
              </g>
            )}
          </g>

          {/* Vòng sân đỗ F-15EX & dấu niêm ấn hợp đồng Lot 7 (9/2026) */}
          <circle cx={1524} cy={455} r={195} fill="none" stroke={P.grid} strokeWidth={1.3} strokeDasharray="8 6" opacity={0.5} />
          {pLot7Seal > 0.02 && (
            <g transform={`translate(1720 242) scale(${0.7 + 0.3 * pLot7Seal})`} opacity={pLot7Seal}>
              <circle cx={0} cy={0} r={30} fill="#1f180b" stroke={P.amber} strokeWidth={2.4} />
              <polygon
                points={Array.from({ length: 5 }, (_, i) => {
                  const a = -Math.PI / 2 + (i * Math.PI * 2) / 5;
                  return `${(Math.cos(a) * 18).toFixed(1)},${(Math.sin(a) * 18).toFixed(1)}`;
                }).join(' ')}
                fill="none"
                stroke={P.amberHot}
                strokeWidth={2}
              />
              <circle cx={0} cy={0} r={5} fill={P.amberHot} />
            </g>
          )}

          {/* Khung thân F-15EX chiếu bằng hướng mũi lên trên (-90°) */}
          <F15Top2D x={1524} y={448} rot={-90} scale={0.96} wingTipMissiles fullLoad />

          {/* Hai khoang động cơ trống rỗng đứt nét trên đuôi F-15EX + đường rút tách 2 động cơ ra sau */}
          {pEngineExclude > 0.01 && (
            <g opacity={pEngineExclude}>
              <rect x={1496} y={558} width={20} height={95} rx={3} fill="#091322" stroke={P.amber} strokeWidth={1.8} strokeDasharray="5 4" />
              <rect x={1532} y={558} width={20} height={95} rx={3} fill="#091322" stroke={P.amber} strokeWidth={1.8} strokeDasharray="5 4" />
              <line x1={1506} y1={660} x2={1482} y2={730} stroke={P.amberHot} strokeWidth={2} strokeDasharray="5 5" />
              <line x1={1542} y1={660} x2={1566} y2={730} stroke={P.amberHot} strokeWidth={2} strokeDasharray="5 5" />
            </g>
          )}

          {/* Hai khối động cơ turbofan GE F110 rút tách từ khoang đuôi F-15EX ra sau kèm dấu "+ ?" khi tới mốc 60.5s */}
          {pEngineExclude > 0.01 && (
            <g
              transform={`translate(0 ${lerp(-145, 24, pEngineExclude)})`}
              opacity={pEngineExclude}
            >
              <rect
                x={1436}
                y={708}
                width={268}
                height={136}
                rx={12}
                fill="#121c2e"
                stroke={P.amber}
                strokeWidth={2.2}
                strokeDasharray="8 5"
              />
              <DetachedTurbofan2D x={1482} y={774} highlight={pEngineExclude} />
              <DetachedTurbofan2D x={1554} y={774} highlight={pEngineExclude} />
              <PlusQuestionBadge x={1642} y={776} p={pEngineExclude} />
            </g>
          )}

          {/* Đường trục dẫn hướng máy quay kéo từ Bàn cân (Zone A) xuống Lưới sân đỗ (Zone B) */}
          <line x1={960} y1={915} x2={960} y2={1255} stroke={P.gridBright} strokeWidth={2.5} strokeDasharray="10 8" opacity={0.5} />

          {/* ==================================================================================== */}
          {/* PHA 2 (ZONE B, y ≈ 1742): LƯỚI SÂN ĐỖ CHIẾN LƯỢC NHÂN ĐÔI PHI ĐỘI 120 -> 267 CHIẾC   */}
          {/* ==================================================================================== */}
          <g filter="url(#sh)">
            <rect
              x={136}
              y={1272}
              width={1648}
              height={936}
              rx={20}
              fill="#0a172a"
              fillOpacity={0.93}
              stroke={pDoublingWave > 0.1 ? P.amber : P.gridBright}
              strokeWidth={2.8}
            />
          </g>

          {/* Vạch kẻ đường lăn sân đỗ quân sự quanh rìa */}
          <line x1={182} y1={1315} x2={182} y2={2165} stroke={P.amber} strokeWidth={2} opacity={0.35} />
          <line x1={1738} y1={1315} x2={1738} y2={2165} stroke={P.amber} strokeWidth={2} opacity={0.35} />
          <line x1={182} y1={1660} x2={1738} y2={1660} stroke={P.cyan} strokeWidth={1.6} strokeDasharray="10 8" opacity={0.4} />

          {/* 267 silhouette F-15EX xếp đội hình chiến lược (6 hàng đầu = 120 chiếc Cyan -> mở rộng 267 chiếc Vàng hổ phách) */}
          {FLEET_SLOTS.map((slot) => {
            const isBase120 = slot.idx < 120;
            const pAppear120 = prog(
              t,
              65.1 + (slot.idx / 120) * 1.25,
              65.5 + (slot.idx / 120) * 1.25,
            );
            const pExpandGold = prog(
              t,
              70.1 + (slot.idx / 267) * 3.35,
              70.6 + (slot.idx / 267) * 3.35,
            );

            if (isBase120) {
              const col = mix(P.cyan, P.amber, pExpandGold);
              const acc = mix('#ffffff', P.amberHot, pExpandGold);
              const op = 0.16 + 0.84 * pAppear120;
              const sc = 0.82 + 0.18 * pAppear120 + 0.06 * bump(t, 70.1 + (slot.idx / 267) * 3.35, 0.35);
              return (
                <MiniEagleIcon
                  key={slot.idx}
                  x={slot.x}
                  y={slot.y}
                  fill={col}
                  accent={acc}
                  opacity={op}
                  scale={sc}
                />
              );
            }

            // 147 chiếc mở rộng mới (từ chiếc 121 đến 267)
            const op = 0.12 + 0.88 * pExpandGold;
            const sc = 0.78 + 0.22 * pExpandGold + 0.08 * bump(t, 70.1 + (slot.idx / 267) * 3.35, 0.35);
            return (
              <MiniEagleIcon
                key={slot.idx}
                x={slot.x}
                y={slot.y}
                fill={pExpandGold > 0.05 ? P.amber : P.grid}
                accent={pExpandGold > 0.05 ? P.amberHot : P.grid}
                opacity={op}
                scale={sc}
              />
            );
          })}

          {/* Khung viền bao quanh đội hình: mở từ khung 120 chiếc (6 hàng) giãn rộng xuống ôm trọn 267 chiếc (14 hàng) */}
          {t >= 65.3 && (
            <rect
              x={204}
              y={1326}
              width={1512}
              height={lerp(330, 774, pDoublingWave)}
              rx={12}
              fill="none"
              stroke={mix(P.cyan, P.amberHot, pDoublingWave)}
              strokeWidth={3}
              opacity={prog(t, 65.3, 66.2)}
            />
          )}

          {/* Thanh thước tỷ lệ tổng quy mô phi đội ở đáy sân đỗ (120 / 267 -> 267 / 267) */}
          <g>
            <rect x={204} y={2134} width={1512} height={26} rx={8} fill="#07111f" stroke={P.grid} strokeWidth={1.6} />
            {/* Mốc 120 chiếc (44.94% chiều dài) */}
            <rect
              x={208}
              y={2138}
              width={676 * prog(t, 65.3, 66.8)}
              height={18}
              rx={5}
              fill={mix(P.cyan, P.amber, pDoublingWave)}
            />
            {/* Phần nhân đôi cộng thêm lên 267 chiếc */}
            {pDoublingWave > 0.01 && (
              <rect
                x={208 + 676}
                y={2138}
                width={828 * pDoublingWave}
                height={18}
                rx={5}
                fill={P.amberHot}
              />
            )}
            <line x1={208 + 676} y1={2126} x2={208 + 676} y2={2168} stroke="#ffffff" strokeWidth={2.4} />
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.4} />

      {/* Tối đa 1 Label trên màn hình tại mọi thời điểm (tuần tự không chồng lấp, thoáng cách viền thẻ) */}
      <Label
        t={t}
        text="$82M–$92M"
        x={480}
        y={104}
        from={CUE.s03_f35Price}
        until={51.0}
        bg={P.cyan}
        fg={P.ink}
      />
      <Label
        t={t}
        text="$97M–$108M"
        x={1410}
        y={104}
        from={CUE.s03_f15Price}
        until={63.8}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="267 AIRCRAFT"
        x={960}
        y={96}
        from={CUE.s03_fleet267}
        until={75.5}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S03;
