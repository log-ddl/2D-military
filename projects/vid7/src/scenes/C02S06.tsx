import React from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld } from '@core/frame';
import { lerp, prog, useT } from '@core/time';
import { Cam2D, Defs2D, Grain } from '@skill/military/2d/look';
import { drawOn } from '@skill/military/2d/path';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { P2D } from '../design/palette';
import { B25Cutaway2D } from '../parts/Silhouettes2D';

// Toạ độ đặt B25Cutaway2D trên bàn vẽ kỹ thuật 1920×1080 (1 m = 86 px)
const B25_X = 975;
const B25_Y = 622;
const PPM = 86;

const C02S06: React.FC = () => {
  const t = useT();

  // 1) Tháo giáp / tháp pháo bụng / Norden mờ tắt dần (1 -> 0) khi trọng lượng tiết kiệm đổi thành xăng
  const stripFade = 1 - prog(t, 241.6, 245.8);

  // 2) Mức nhiên liệu dâng gấp đôi: từ 646 gal lên 1.141 gal
  const doubleFuelProg = prog(t, 246.4, 251.2);

  // 3) Mặt cắt khoang nhiên liệu phụ dâng dần cùng lúc tăng gấp đôi dung tích rồi chốt rõ khi điểm danh từng khoang
  const showFuelBase = Math.max(0.55 * doubleFuelProg, prog(t, 251.2, 253.4));
  const pBladder = prog(t, 252.8, 254.2); // 253.42: bàng quang cao su 160-gal trên khoang bom
  const pCrawlway = prog(t, 256.85, 258.0); // 257.32: túi xăng mềm trong hẻm bò crawlway
  const pGasCans = prog(t, 259.35, 261.2); // 259.78: 10 can xăng 5-gal xếp khoang thân sau

  // 4) Cuối cảnh (264.6–269.6 s): xuất kích sớm 200 dặm kéo thanh dự trữ nhiên liệu tụt qua vạch 0 vào vùng âm nhấp nháy đỏ
  const zoomIn = prog(t, 252.0, 254.0);
  const zoomOut = prog(t, 264.2, 265.8);
  const focusWeight = zoomIn * (1 - zoomOut);

  const camZoom = lerp(1.0, 1.15, focusWeight);
  const camX = lerp(960, 985, focusWeight);
  const camY = lerp(540, 466, focusWeight);
  const shake = handheld(t, 1.4, 'c02s06');

  const deficitProg = prog(t, 265.5, 268.9);
  const dangerPulse = t >= 266.2 ? 0.55 + 0.45 * Math.sin((t - 266.2) * 11.5) : 0.35;

  // Toạ độ thế giới của 3 khoang xăng phụ trên B25Cutaway2D (khớp chính xác Silhouettes2D.tsx)
  const bladderRect = {
    x: B25_X - 0.35 * PPM,
    y: B25_Y - 2.98 * PPM,
    w: 2.15 * PPM,
    h: 0.74 * PPM,
  };
  const crawlwayRect = {
    x: B25_X + 2.05 * PPM,
    y: B25_Y - 2.45 * PPM,
    w: 1.85 * PPM,
    h: 0.62 * PPM,
  };
  const cansBox = {
    x: B25_X - 4.02 * PPM,
    y: B25_Y - 2.68 * PPM,
    w: 2.28 * PPM,
    h: 1.04 * PPM,
  };

  // Thước đo tổng nhiên liệu & vùng dự trữ âm (y = 746..784, hoàn toàn bằng hình khối/vạch chia SVG — KHÔNG dùng <text>)
  const BAR_Y = 746;
  const BAR_H = 38;
  const X_NEG_MIN = 310; // Đáy vùng âm (-200 mi)
  const X_ZERO = 580; // Vạch chuẩn 0 (Zero Reserve Datum)
  const X_646 = 1090; // Mức chuẩn 646 gallons (+510 px)
  const X_1141 = 1485; // Mức cải hoán gấp đôi 1,141 gallons (+905 px)

  const posFuelWidth = lerp(X_646 - X_ZERO, X_1141 - X_ZERO, doubleFuelProg);
  const negDeficitWidth = lerp(0, X_ZERO - (X_NEG_MIN + 26), deficitProg);

  return (
    <AbsoluteFill style={{ background: P2D.blueprintBg }}>
      {/* Đặt <Defs2D> ngoài <Cam2D> theo đúng quy chuẩn kỹ thuật */}
      <svg width={0} height={0} style={{ position: 'absolute', pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(6, 14, 24, 0.52)" />
      </svg>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P2D.blueprintBg}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ overflow: 'visible' }}>
          <defs>
            <radialGradient id="bpVignette" cx="50%" cy="48%" r="65%">
              <stop offset="0%" stopColor="#1b3c59" stopOpacity={0.55} />
              <stop offset="70%" stopColor={P2D.blueprintBg} stopOpacity={0.85} />
              <stop offset="100%" stopColor="#091724" stopOpacity={1} />
            </radialGradient>
            <pattern id="negHazard" width={24} height={24} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={12} height={24} fill="#5c1518" />
              <rect x={12} width={12} height={24} fill="#2a0d12" />
            </pattern>
          </defs>

          {/* Nền xanh Blueprint kỹ thuật USAAF 1942 có chiều sâu gradient */}
          <rect x={-240} y={-180} width={2400} height={1440} fill={P2D.blueprintBg} />
          <rect x={-240} y={-180} width={2400} height={1440} fill="url(#bpVignette)" />

          {/* Lưới toạ độ kỹ thuật (ô nhỏ 40 px + ô chính 160 px) */}
          <g opacity={0.16}>
            {Array.from({ length: 49 }, (_, i) => (
              <line key={`gx-${i}`} x1={i * 40} y1={40} x2={i * 40} y2={1040} stroke={P2D.blueprintGrid} strokeWidth={1} />
            ))}
            {Array.from({ length: 26 }, (_, j) => (
              <line key={`gy-${j}`} x1={40} y1={40 + j * 40} x2={1880} y2={40 + j * 40} stroke={P2D.blueprintGrid} strokeWidth={1} />
            ))}
          </g>
          <g opacity={0.34}>
            {Array.from({ length: 12 }, (_, i) => (
              <line key={`mgx-${i}`} x1={80 + i * 160} y1={52} x2={80 + i * 160} y2={1028} stroke={P2D.blueprintGrid} strokeWidth={1.6} />
            ))}
            {Array.from({ length: 7 }, (_, j) => (
              <line key={`mgy-${j}`} x1={52} y1={80 + j * 160} x2={1868} y2={80 + j * 160} stroke={P2D.blueprintGrid} strokeWidth={1.6} />
            ))}
          </g>

          {/* Khung viền bản vẽ kỹ thuật USAAF (Double Border + ke góc + huy hiệu sao kỹ thuật) */}
          <rect x={44} y={44} width={1832} height={992} fill="none" stroke={P2D.blueprintGrid} strokeWidth={3} opacity={0.85} />
          <rect x={56} y={56} width={1808} height={968} fill="none" stroke={P2D.blueprintGrid} strokeWidth={1.3} opacity={0.6} />
          {[
            [56, 56, 1, 1],
            [1864, 56, -1, 1],
            [56, 1024, 1, -1],
            [1864, 1024, -1, -1],
          ].map(([cx, cy, sx, sy], idx) => (
            <path
              key={`corner-${idx}`}
              d={`M ${cx} ${cy + sy * 36} L ${cx} ${cy} L ${cx + sx * 36} ${cy}`}
              fill="none"
              stroke={P2D.usLight}
              strokeWidth={3.5}
            />
          ))}

          {/* Khung Title Block góc trên trái (thuần biểu tượng ngôi sao USAAF & vạch kỹ thuật, không dùng <text>) */}
          <g transform="translate(76 76)" opacity={0.88}>
            <rect width={210} height={64} fill={P2D.blueprintPanel} stroke={P2D.blueprintGrid} strokeWidth={1.8} />
            <circle cx={34} cy={32} r={19} fill="#1b497d" stroke={P2D.usLight} strokeWidth={1.5} />
            <polygon
              points={[0, 1, 2, 3, 4]
                .map((k) => {
                  const a1 = -Math.PI / 2 + (k * Math.PI * 2) / 5;
                  const a2 = a1 + Math.PI / 5;
                  return `${(34 + Math.cos(a1) * 16).toFixed(1)},${(32 + Math.sin(a1) * 16).toFixed(1)} ${(34 + Math.cos(a2) * 6.5).toFixed(1)},${(32 + Math.sin(a2) * 6.5).toFixed(1)}`;
                })
                .join(' ')}
              fill="#f4f8fc"
            />
            <circle cx={34} cy={32} r={4.2} fill={P2D.jpMain} />
            <line x1={68} y1={18} x2={190} y2={18} stroke={P2D.usLight} strokeWidth={3} />
            <line x1={68} y1={32} x2={164} y2={32} stroke={P2D.blueprintGrid} strokeWidth={2} />
            <line x1={68} y1={45} x2={180} y2={45} stroke={P2D.fuelAmber} strokeWidth={2.5} />
          </g>

          {/* Đường mặt đất chuẩn & đường kích thước chiều dài thân B-25B (16.13 m) */}
          <line x1={170} y1={B25_Y} x2={1750} y2={B25_Y} stroke={P2D.blueprintGrid} strokeWidth={2} strokeDasharray="10 6" opacity={0.75} />
          <g opacity={0.62}>
            <line x1={B25_X - 7.93 * PPM} y1={B25_Y + 36} x2={B25_X + 8.2 * PPM} y2={B25_Y + 36} stroke={P2D.usLight} strokeWidth={1.6} />
            <line x1={B25_X - 7.93 * PPM} y1={B25_Y + 24} x2={B25_X - 7.93 * PPM} y2={B25_Y + 48} stroke={P2D.usLight} strokeWidth={2} />
            <line x1={B25_X + 8.2 * PPM} y1={B25_Y + 24} x2={B25_X + 8.2 * PPM} y2={B25_Y + 48} stroke={P2D.usLight} strokeWidth={2} />
          </g>

          {/* ==================== CHỦ THỂ CHÍNH: MẶT CẮT KỸ THUẬT B-25B MITCHELL ==================== */}
          <g filter="url(#sh)">
            <B25Cutaway2D
              x={B25_X}
              y={B25_Y}
              ppm={PPM}
              cutaway={true}
              showStripped={stripFade}
              showFuel={showFuelBase}
              showMarkTwain={true}
              showBroomsticks={true}
              gearDown={true}
            />
          </g>

          {/* Ký hiệu gạch chéo đỏ tại 3 vị trí tháo bỏ hạng nặng lúc đầu cảnh (mờ dần cùng stripFade) */}
          {stripFade > 0.04 && (
            <g opacity={stripFade * 0.9}>
              {[
                [B25_X - 1.9 * PPM, B25_Y - 1.05 * PPM + (1 - stripFade) * 40],
                [B25_X + 3.32 * PPM, B25_Y - 2.3 * PPM + (1 - stripFade) * 40],
                [B25_X + 7.15 * PPM, B25_Y - 2.1 * PPM + (1 - stripFade) * 40],
              ].map(([sx, sy], idx) => (
                <g key={`strip-x-${idx}`} transform={`translate(${sx} ${sy})`}>
                  <circle r={20} fill="none" stroke={P2D.dangerRed} strokeWidth={2.5} />
                  <line x1={-12} y1={-12} x2={12} y2={12} stroke={P2D.dangerRed} strokeWidth={2.5} />
                  <line x1={12} y1={-12} x2={-12} y2={12} stroke={P2D.dangerRed} strokeWidth={2.5} />
                </g>
              ))}
            </g>
          )}

          {/* Bình xăng cánh tiêu chuẩn 646-gal hiển thị nền xanh-hổ phách tại gốc cánh để đối chiếu */}
          <g opacity={0.45 + 0.35 * prog(t, 244.2, 248.0)}>
            <rect
              x={B25_X + 0.1 * PPM}
              y={B25_Y - 2.52 * PPM}
              width={1.55 * PPM}
              height={0.32 * PPM}
              rx={8}
              fill="none"
              stroke={P2D.usLight}
              strokeWidth={2.2}
              strokeDasharray="6 4"
            />
          </g>

          {/* ==================== 3 ĐIỂM NHẤN KHOANG XĂNG SÁNG LẦN LƯỢT + ĐƯỜNG GIÓNG (NÉT KÉP HALO + LÕI) ==================== */}

          {/* (1) 253.42 s: Bàng quang cao su mềm 160-gallon buộc phía trên khoang bom */}
          {pBladder > 0.01 && (
            <g opacity={pBladder}>
              {/* Nét kép halo mờ + lõi sáng quanh bàng quang 160-gal */}
              <rect
                x={bladderRect.x - 6}
                y={bladderRect.y - 6}
                width={bladderRect.w + 12}
                height={bladderRect.h + 12}
                rx={26}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={11}
                opacity={0.32}
              />
              <rect
                x={bladderRect.x - 3}
                y={bladderRect.y - 3}
                width={bladderRect.w + 6}
                height={bladderRect.h + 6}
                rx={24}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={3.2}
              />
              {/* Đai chằng cao su trên bàng quang */}
              {[0.25, 0.5, 0.75].map((u, idx) => (
                <line
                  key={`strap-${idx}`}
                  x1={bladderRect.x + bladderRect.w * u}
                  y1={bladderRect.y + 3}
                  x2={bladderRect.x + bladderRect.w * u}
                  y2={bladderRect.y + bladderRect.h - 3}
                  stroke="#9c5d0c"
                  strokeWidth={2.6}
                />
              ))}
              {/* Đường gióng chỉ điểm sáng lên nút tiêu đề trên */}
              <path
                d={`M ${bladderRect.x + bladderRect.w * 0.5} ${bladderRect.y - 6} L ${bladderRect.x + bladderRect.w * 0.5} 238 L 960 238`}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={6}
                opacity={0.28}
                {...drawOn(260, pBladder)}
              />
              <path
                d={`M ${bladderRect.x + bladderRect.w * 0.5} ${bladderRect.y - 6} L ${bladderRect.x + bladderRect.w * 0.5} 238 L 960 238`}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={2.4}
                {...drawOn(260, pBladder)}
              />
              <circle cx={bladderRect.x + bladderRect.w * 0.5} cy={bladderRect.y - 6} r={6} fill={P2D.fuelBright} />
              <circle cx={960} cy={238} r={5} fill={P2D.fuelAmber} />
            </g>
          )}

          {/* (2) 257.32 s: Túi xăng mềm nhồi trong hẻm bò (Crawlway flexible tank) */}
          {pCrawlway > 0.01 && (
            <g opacity={pCrawlway}>
              <rect
                x={crawlwayRect.x - 6}
                y={crawlwayRect.y - 6}
                width={crawlwayRect.w + 12}
                height={crawlwayRect.h + 12}
                rx={22}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={11}
                opacity={0.34}
              />
              <rect
                x={crawlwayRect.x - 3}
                y={crawlwayRect.y - 3}
                width={crawlwayRect.w + 6}
                height={crawlwayRect.h + 6}
                rx={19}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={3.2}
              />
              {/* Ống dẫn xăng nối từ túi hẻm bò sang bàng quang chính */}
              <path
                d={`M ${crawlwayRect.x} ${crawlwayRect.y + 22} L ${bladderRect.x + bladderRect.w} ${bladderRect.y + 42}`}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={3}
                strokeDasharray="6 4"
              />
              {/* Đường gióng kỹ thuật chỉ điểm hẻm bò kèm vòng tâm điểm sáng */}
              <path
                d={`M ${crawlwayRect.x + crawlwayRect.w * 0.55} ${crawlwayRect.y - 6} L ${crawlwayRect.x + crawlwayRect.w * 0.55 + 48} 276 L 1415 276`}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={6}
                opacity={0.28}
                {...drawOn(310, pCrawlway)}
              />
              <path
                d={`M ${crawlwayRect.x + crawlwayRect.w * 0.55} ${crawlwayRect.y - 6} L ${crawlwayRect.x + crawlwayRect.w * 0.55 + 48} 276 L 1415 276`}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={2.4}
                {...drawOn(310, pCrawlway)}
              />
              <circle cx={crawlwayRect.x + crawlwayRect.w * 0.55} cy={crawlwayRect.y - 6} r={6} fill={P2D.fuelBright} />
              <circle cx={1415} cy={276} r={11} fill="none" stroke={P2D.fuelBright} strokeWidth={2.4} />
              <circle cx={1415} cy={276} r={4.5} fill={P2D.fuelAmber} />
            </g>
          )}

          {/* (3) 259.78 s: 10 can xăng 5-gallon xếp 2 tầng trong khoang thân sau */}
          {pGasCans > 0.01 && (
            <g opacity={pGasCans}>
              <rect
                x={cansBox.x - 6}
                y={cansBox.y - 6}
                width={cansBox.w + 12}
                height={cansBox.h + 12}
                rx={14}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={11}
                opacity={0.34}
              />
              <rect
                x={cansBox.x - 2}
                y={cansBox.y - 2}
                width={cansBox.w + 4}
                height={cansBox.h + 4}
                rx={11}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={3}
              />
              {/* Gân chữ X nhận diện trên từng can xăng 5-gal bật sáng lần lượt */}
              {Array.from({ length: 10 }, (_, k) => {
                const col = k % 5;
                const row = Math.floor(k / 5);
                const cx = B25_X + (-3.95 + col * 0.44) * PPM;
                const cy = B25_Y + (-2.12 - row * 0.48) * PPM;
                const cw = 0.36 * PPM;
                const ch = 0.42 * PPM;
                const canPop = prog(t, 259.45 + k * 0.14, 259.85 + k * 0.14);
                return (
                  <g key={`xcan-${k}`} opacity={canPop}>
                    <line x1={cx + 5} y1={cy + 6} x2={cx + cw - 5} y2={cy + ch - 6} stroke="#9c5d0c" strokeWidth={1.8} />
                    <line x1={cx + cw - 5} y1={cy + 6} x2={cx + 5} y2={cy + ch - 6} stroke="#9c5d0c" strokeWidth={1.8} />
                  </g>
                );
              })}
              {/* Đường gióng chỉ điểm 10 can xăng lên nút trái trên */}
              <path
                d={`M ${cansBox.x + cansBox.w * 0.45} ${cansBox.y - 6} L ${cansBox.x + cansBox.w * 0.45 - 42} 238 L 620 238`}
                fill="none"
                stroke={P2D.fuelAmber}
                strokeWidth={6}
                opacity={0.28}
                {...drawOn(280, pGasCans)}
              />
              <path
                d={`M ${cansBox.x + cansBox.w * 0.45} ${cansBox.y - 6} L ${cansBox.x + cansBox.w * 0.45 - 42} 238 L 620 238`}
                fill="none"
                stroke={P2D.fuelBright}
                strokeWidth={2.4}
                {...drawOn(280, pGasCans)}
              />
              <circle cx={cansBox.x + cansBox.w * 0.45} cy={cansBox.y - 6} r={6} fill={P2D.fuelBright} />
              <circle cx={620} cy={238} r={5} fill={P2D.fuelAmber} />
            </g>
          )}

          {/* ==================== THANH THƯỚC ĐO DỰ TRỮ NHIÊN LIỆU TRỰC QUAN BÊN DƯỚI (KHÔNG DÙNG <text>) ==================== */}
          <g transform="translate(0 0)">
            {/* Hộp nền bảng thước đo */}
            <rect
              x={X_NEG_MIN - 28}
              y={BAR_Y - 26}
              width={X_1141 - X_NEG_MIN + 76}
              height={BAR_H + 52}
              rx={12}
              fill={P2D.blueprintPanel}
              stroke={P2D.blueprintGrid}
              strokeWidth={2.2}
            />

            {/* Ô vùng âm bên trái vạch 0 (Negative Reserve Zone) */}
            <rect
              x={X_NEG_MIN}
              y={BAR_Y}
              width={X_ZERO - X_NEG_MIN}
              height={BAR_H}
              fill="url(#negHazard)"
              stroke={deficitProg > 0.02 ? P2D.dangerRed : '#6e2d30'}
              strokeWidth={2}
            />
            {deficitProg > 0.01 && (
              <rect
                x={X_ZERO - negDeficitWidth}
                y={BAR_Y + 2}
                width={negDeficitWidth}
                height={BAR_H - 4}
                fill={P2D.dangerRed}
                opacity={dangerPulse}
              />
            )}

            {/* Rãnh tổng nhiên liệu dương bên phải vạch 0 (0 .. 1,141 gal) */}
            <rect
              x={X_ZERO}
              y={BAR_Y}
              width={X_1141 - X_ZERO}
              height={BAR_H}
              fill="#0d1d2c"
              stroke={P2D.blueprintGrid}
              strokeWidth={2}
            />

            {/* Bóng mờ dung tích 1,141 gal đã đốt cạn để đối chiếu trực quan khi dự trữ tụt âm ở cuối cảnh */}
            {deficitProg > 0.02 && (
              <rect
                x={X_ZERO + 2}
                y={BAR_Y + 5}
                width={posFuelWidth - 4}
                height={BAR_H - 10}
                rx={3}
                fill={P2D.fuelAmber}
                opacity={0.18}
              />
            )}

            {/* Thanh mức xăng vàng hổ phách dâng từ 646 gal lên gấp đôi 1,141 gal (rồi bị rút cạn khi tụt âm ở cuối cảnh) */}
            <rect
              x={X_ZERO + deficitProg * posFuelWidth}
              y={BAR_Y + 3}
              width={Math.max(0, posFuelWidth * (1 - deficitProg))}
              height={BAR_H - 6}
              rx={4}
              fill={P2D.fuelAmber}
            />
            {/* Dải highlight mặt thoáng chất lỏng */}
            {1 - deficitProg > 0.03 && (
              <rect
                x={X_ZERO + deficitProg * posFuelWidth}
                y={BAR_Y + 4}
                width={Math.max(0, posFuelWidth * (1 - deficitProg))}
                height={8}
                rx={3}
                fill={P2D.fuelBright}
                opacity={0.75}
              />
            )}

            {/* Các vạch chia độ kỹ thuật dọc thước đo */}
            {Array.from({ length: 19 }, (_, i) => {
              const tx = X_NEG_MIN + i * 65;
              const isMajor = i % 3 === 0;
              return (
                <line
                  key={`gtick-${i}`}
                  x1={tx}
                  y1={BAR_Y + BAR_H}
                  x2={tx}
                  y2={BAR_Y + BAR_H + (isMajor ? 13 : 7)}
                  stroke={tx < X_ZERO ? P2D.dangerRed : P2D.usLight}
                  strokeWidth={isMajor ? 2.2 : 1.3}
                  opacity={0.8}
                />
              );
            })}

            {/* Mốc chuẩn 646 GAL (vạch xanh dương sáng + hình thoi) */}
            <line x1={X_646} y1={BAR_Y - 12} x2={X_646} y2={BAR_Y + BAR_H + 12} stroke={P2D.usMain} strokeWidth={2.6} strokeDasharray="5 3" />
            <polygon points={`${X_646},${BAR_Y - 20} ${X_646 + 8},${BAR_Y - 12} ${X_646},${BAR_Y - 4} ${X_646 - 8},${BAR_Y - 12}`} fill={P2D.usMain} />

            {/* Mốc cực đại 1,141 GAL (vạch vàng sáng + biểu tượng giọt/can nhiên liệu đôi) */}
            <line x1={X_1141} y1={BAR_Y - 14} x2={X_1141} y2={BAR_Y + BAR_H + 14} stroke={P2D.fuelBright} strokeWidth={3} />
            <g transform={`translate(${X_1141 + 22} ${BAR_Y + BAR_H * 0.5})`} opacity={0.45 + 0.55 * doubleFuelProg}>
              <rect x={-11} y={-14} width={22} height={28} rx={3} fill={P2D.fuelAmber} stroke={P2D.fuelBright} strokeWidth={2} />
              <line x1={-6} y1={-8} x2={6} y2={8} stroke={P2D.ink} strokeWidth={2} />
              <line x1={6} y1={-8} x2={-6} y2={8} stroke={P2D.ink} strokeWidth={2} />
            </g>

            {/* Vạch chuẩn ZERO (0) nổi bật ngăn cách dự trữ dương & vùng thâm hụt âm */}
            <line x1={X_ZERO} y1={BAR_Y - 18} x2={X_ZERO} y2={BAR_Y + BAR_H + 18} stroke="#ffffff" strokeWidth={3.6} />
            {/* Ký hiệu vòng số 0 hình học (elip rỗng kỹ thuật — không phải thẻ <text>) */}
            <ellipse cx={X_ZERO} cy={BAR_Y - 30} rx={8} ry={11} fill={P2D.blueprintBg} stroke="#ffffff" strokeWidth={2.8} />

            {/* Mũi tên đỏ quét ngược qua vạch 0 vào vùng âm + Tam giác cảnh báo nhấp nháy ở cuối cảnh */}
            {deficitProg > 0.02 && (
              <g>
                {/* Mũi tên đỏ kéo ngược sang trái */}
                <line
                  x1={X_ZERO + 55 * (1 - deficitProg)}
                  y1={BAR_Y + BAR_H * 0.5}
                  x2={X_ZERO - negDeficitWidth + 14}
                  y2={BAR_Y + BAR_H * 0.5}
                  stroke="#ffe6e6"
                  strokeWidth={4.5}
                />
                <polygon
                  points={`${X_ZERO - negDeficitWidth - 4},${BAR_Y + BAR_H * 0.5} ${X_ZERO - negDeficitWidth + 18},${BAR_Y + BAR_H * 0.5 - 12} ${X_ZERO - negDeficitWidth + 18},${BAR_Y + BAR_H * 0.5 + 12}`}
                  fill="#fff0f0"
                />
                {/* Biểu tượng tam giác chấm than cảnh báo nguy hiểm vẽ thuần hình học */}
                <g transform={`translate(${X_NEG_MIN - 2} ${BAR_Y - 28})`} opacity={0.45 + 0.55 * dangerPulse}>
                  <polygon points="0,-18 19,15 -19,15" fill={P2D.dangerRed} stroke="#fff2f2" strokeWidth={2.2} />
                  <rect x={-2.2} y={-8} width={4.4} height={11} rx={1.5} fill="#ffffff" />
                  <circle cx={0} cy={8.5} r={2.4} fill="#ffffff" />
                </g>
              </g>
            )}
          </g>
        </svg>
      </Cam2D>

      {/* Lớp hạt giấy bản vẽ phủ cuối cảnh */}
      <Grain opacity={0.42} />

      {/* Các <Label> nối tiếp (tối đa 1 nhãn trên màn hình, khoảng nghỉ giữa các nhãn >= 1.6 s) */}
      <Label
        t={t}
        text="646 → 1,141 GALLONS"
        x={960}
        y={155}
        from={CUE.c02_s06_fuel_646}
        until={251.8}
      />
      <Label
        t={t}
        text="160-GAL RUBBER BLADDER"
        x={960}
        y={155}
        from={CUE.c02_s06_bladder_160}
        until={256.3}
      />
      <Label
        t={t}
        text="10 × 5-GAL GAS CANS"
        x={620}
        y={155}
        from={CUE.c02_s06_ten_cans}
        until={263.8}
      />
      <Label
        t={t}
        text="RESERVE: BELOW ZERO (-200 MI)"
        x={960}
        y={922}
        bg="#b82525"
        fg="#fff6e8"
        from={CUE.c02_s06_early_200}
        until={269.3}
      />
    </AbsoluteFill>
  );
};

export default C02S06;
