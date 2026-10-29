import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, lerp, prog } from '@kit/theme';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { arcAt, arcPath, drawOn } from '@lib/2d/path';
import { contours } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { F15Top2D } from '../local/jets2d';

// Đường đồng mức địa chiến lược tính 1 lần ở cấp module
const MAP_CONTOURS = contours('s07_geostrategy', 2300, 1400, 9, 22, 470);

// Ngôi sao không hiệu USAF nhỏ gọn đặt trong thẻ F-15EX
const UsafRoundel: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 14 }) => (
  <g transform={`translate(${x} ${y})`}>
    <rect x={-r * 1.65} y={-r * 0.42} width={r * 3.3} height={r * 0.84} fill="#ffffff" stroke={P.ink} strokeWidth={1.2} />
    <line x1={-r * 1.6} y1={0} x2={r * 1.6} y2={0} stroke={P.red} strokeWidth={r * 0.28} />
    <circle cx={0} cy={0} r={r} fill="#183b6b" stroke={P.ink} strokeWidth={1.4} />
    <polygon
      points={`0,${-r * 0.78} ${r * 0.22},${-r * 0.24} ${r * 0.8},${-r * 0.24} ${r * 0.33},${r * 0.12} ${r * 0.5},${r * 0.68} 0,${r * 0.34} ${-r * 0.5},${r * 0.68} ${-r * 0.33},${r * 0.12} ${-r * 0.8},${-r * 0.24} ${-r * 0.22},${-r * 0.24}`}
      fill="#ffffff"
    />
  </g>
);

const S07: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ các nhịp kể chuyện
  const taxScratch = prog(t, 150.6, 153.2);
  const arabiaGlow = prog(t, 155.3, 157.4);
  const flowSaudi = prog(t, 158.0, 160.9);
  const flowQatar = prog(t, 158.45, 161.35);
  const plantSpin = prog(t, 159.4, 162.5);
  const exportIn = prog(t, 163.2, 165.6);
  const usafIn = prog(t, 168.8, 171.6);
  const retireFade = prog(t, 169.4, 174.6);
  const paidSeal = prog(t, CUE.s07_paidFor, 175.4);

  // Điều khiển Cam2D: từ bản đồ Đại Tây Dương - Trung Đông trượt xuống cây phả hệ kết cấu F-15SA/QA -> F-15EX
  const panToArabia = prog(t, 154.6, 157.8);
  const panToTree = prog(t, 162.8, 169.8);

  const camX = lerp(lerp(920, 1020, panToArabia), 960, panToTree);
  const camY = lerp(lerp(405, 395, panToArabia), 595, panToTree);
  const camZoom = lerp(lerp(1.06, 1.05, panToArabia), 1.0, panToTree);
  const shake = handheld(t, 1.8, 's07');

  // Tọa độ các nút địa lý chính
  const stLouis: [number, number] = [520, 322];
  const pentagon: [number, number] = [678, 315];
  const saudi: [number, number] = [1545, 422];
  const qatar: [number, number] = [1648, 392];

  return (
    <AbsoluteFill style={{ backgroundColor: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <Layer>
          <Defs2D shadow="rgba(5, 12, 24, 0.52)" />

          {/* Nền đại dương địa chiến lược + lưới kinh vĩ tuyến */}
          <defs>
            <linearGradient id="s07_ocean" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#09182c" />
              <stop offset="48%" stopColor="#102846" />
              <stop offset="100%" stopColor="#081526" />
            </linearGradient>
          </defs>
          <rect x={-260} y={-220} width={2480} height={1620} fill="url(#s07_ocean)" />

          {/* Đường đồng mức địa hình & đáy đại dương */}
          <g transform="translate(-160 -110)">
            {MAP_CONTOURS.map((c) => (
              <path
                key={c.level}
                d={c.d}
                fill="none"
                stroke={c.level % 3 === 0 ? P.gridBright : P.grid}
                strokeWidth={c.level % 3 === 0 ? 1.25 : 0.85}
                opacity={0.14 + c.level * 0.022}
              />
            ))}
          </g>

          {/* Lưới kinh tuyến / vĩ tuyến mảnh */}
          {Array.from({ length: 15 }, (_, i) => {
            const gx = -120 + i * 160;
            return (
              <line
                key={`lon${i}`}
                x1={gx}
                y1={-180}
                x2={gx}
                y2={1320}
                stroke={P.gridBright}
                strokeWidth={0.8}
                strokeDasharray="6 10"
                opacity={0.2}
              />
            );
          })}
          {Array.from({ length: 10 }, (_, j) => {
            const gy = -60 + j * 145;
            return (
              <line
                key={`lat${j}`}
                x1={-220}
                y1={gy}
                x2={2160}
                y2={gy}
                stroke={P.gridBright}
                strokeWidth={0.8}
                strokeDasharray="6 10"
                opacity={0.2}
              />
            );
          })}

          {/* ==================== BẢN ĐỒ LỤC ĐỊA BẮC MỸ — ĐẠI TÂY DƯƠNG — BÁN ĐẢO Ả RẬP ==================== */}
          <g>
            {/* Lục địa Bắc Mỹ / Hoa Kỳ chi tiết (Bờ Tây, Vịnh Mexico, bán đảo Florida, Ngũ Đại Hồ, Bờ Đông) */}
            <path
              d="M 115,170 L 210,145 L 335,142 L 455,152 L 520,186 L 560,182 L 605,204 L 685,198 L 775,208 L 792,232 L 748,262 L 732,294 L 706,318 L 696,348 L 664,386 L 648,452 L 626,450 L 614,404 L 564,396 L 524,412 L 478,414 L 442,458 L 398,482 L 355,455 L 315,418 L 274,435 L 252,392 L 208,354 L 172,292 L 154,232 Z"
              fill="#153254"
              stroke={P.gridBright}
              strokeWidth={2.2}
              strokeLinejoin="round"
            />
            <path
              d="M 185,195 L 485,192 L 675,238 L 652,358 L 510,382 L 325,388 L 215,322 Z"
              fill="#1c406b"
              opacity={0.55}
            />
            {/* Dòng sông Mississippi & Missouri hội tụ qua St. Louis */}
            <path
              d="M 505,196 Q 530,262 520,322 Q 512,368 525,410 M 395,245 Q 462,282 520,322"
              fill="none"
              stroke={P.cyan}
              strokeWidth={1.8}
              opacity={0.45}
            />

            {/* Châu Âu (Tây Ban Nha, Pháp, Ý, Hy Lạp) & Bắc Phi (tạo Địa Trung Hải & Biển Đỏ) */}
            <path
              d="M 1055,212 L 1068,172 L 1125,154 L 1195,126 L 1315,128 L 1425,155 L 1468,198 L 1435,244 L 1388,268 L 1345,256 L 1308,278 L 1288,248 L 1236,274 L 1218,246 L 1152,258 L 1082,268 L 1052,248 Z"
              fill="#132c4a"
              stroke={P.grid}
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
            <path
              d="M 1058,298 L 1165,288 L 1255,308 L 1335,312 L 1398,325 L 1428,378 L 1466,464 L 1502,482 L 1475,562 L 1345,585 L 1165,558 L 1038,452 L 1028,358 Z"
              fill="#132c4a"
              stroke={P.grid}
              strokeWidth={1.7}
              strokeLinejoin="round"
            />
            {/* Tiểu Á & Cao nguyên Iran phía bắc Vịnh Ba Tư */}
            <path
              d="M 1395,268 L 1515,248 L 1665,236 L 1805,255 L 1835,342 L 1742,374 L 1682,362 L 1618,334 L 1565,305 L 1465,296 Z"
              fill="#132c4a"
              stroke={P.grid}
              strokeWidth={1.6}
              strokeLinejoin="round"
            />

            {/* BÁN ĐẢO Ả RẬP chi tiết (Biển Đỏ, Yemen/Oman, Eo biển Hormuz, Vịnh Ba Tư): Saudi Arabia & Qatar */}
            <path
              d="M 1424,328 L 1478,314 L 1554,316 L 1605,348 L 1636,378 L 1656,384 L 1678,396 L 1706,382 L 1746,428 L 1722,476 L 1648,512 L 1538,538 L 1506,502 L 1476,442 L 1442,382 Z"
              fill={arabiaGlow > 0.01 ? '#3b3728' : '#173558'}
              stroke={arabiaGlow > 0.01 ? P.amber : P.gridBright}
              strokeWidth={2.5}
              strokeLinejoin="round"
            />
            <path
              d="M 1424,328 L 1478,314 L 1554,316 L 1605,348 L 1636,378 L 1656,384 L 1678,396 L 1706,382 L 1746,428 L 1722,476 L 1648,512 L 1538,538 L 1506,502 L 1476,442 L 1442,382 Z"
              fill={P.amber}
              opacity={0.24 * arabiaGlow}
            />
            {/* Bán đảo Qatar nhô sắc nét vào Vịnh Ba Tư */}
            <ellipse
              cx={qatar[0]}
              cy={qatar[1]}
              rx={12}
              ry={17}
              fill={arabiaGlow > 0.01 ? P.amberHot : '#214a78'}
              stroke={P.ink}
              strokeWidth={1.6}
            />

            {/* La bàn địa chiến lược & thước tỷ lệ hải đồ Đại Tây Dương (hiện ở nửa đầu, nhường chỗ khi mở cây phả hệ) */}
            <g
              transform="translate(955 615)"
              opacity={0.46 * (1 - prog(t, 162.4, 164.2))}
            >
              <circle cx={0} cy={0} r={74} fill="none" stroke={P.gridBright} strokeWidth={1.4} strokeDasharray="8 6" />
              <circle cx={0} cy={0} r={52} fill="none" stroke={P.cyan} strokeWidth={1.1} opacity={0.6} />
              <line x1={-96} y1={0} x2={96} y2={0} stroke={P.gridBright} strokeWidth={1.2} />
              <line x1={0} y1={-96} x2={0} y2={96} stroke={P.gridBright} strokeWidth={1.2} />
              <polygon points="0,-66 9,-12 0,-22 -9,-12" fill={P.cyan} />
              <polygon points="0,66 8,12 0,22 -8,12" fill={P.gridBright} />
              <line x1={-280} y1={108} x2={280} y2={108} stroke={P.gridBright} strokeWidth={1.4} />
              {[-280, -140, 0, 140, 280].map((sx) => (
                <line key={sx} x1={sx} y1={100} x2={sx} y2={116} stroke={P.cyan} strokeWidth={1.6} />
              ))}
            </g>
          </g>

          {/* Nút Lầu Năm Góc (bờ Đông Mỹ): người nộp thuế Mỹ KHÔNG phải chi tiền thiết kế từ số 0 */}
          <g transform={`translate(${pentagon[0]} ${pentagon[1]})`} opacity={0.9 - 0.45 * panToTree}>
            <polygon
              points="0,-18 17,-6 11,15 -11,15 -17,-6"
              fill={P.bgCard}
              stroke={P.cyan}
              strokeWidth={2}
            />
            <polygon points="0,-9 8,-3 5,7 -5,7 -8,-3" fill="none" stroke={P.cyanSoft} strokeWidth={1.3} />
            {taxScratch > 0.02 && (
              <g opacity={taxScratch * (1 - prog(t, 155.2, 156.8) * 0.5)}>
                <circle cx={0} cy={-38} r={16} fill="#102540" stroke={P.green} strokeWidth={2} />
                <line x1={-10} y1={-28} x2={10} y2={-48} stroke={P.green} strokeWidth={2.6} />
              </g>
            )}
          </g>

          {/* Nút nguồn vốn: SAUDI ARABIA & QATAR */}
          {[
            { pt: saudi, tag: 'SA', color: P.green, delay: 0 },
            { pt: qatar, tag: 'QA', color: '#a6264c', delay: 0.4 },
          ].map((node, idx) => {
            const p = prog(t, 155.3 + node.delay, 157.0 + node.delay);
            return (
              <g key={idx} transform={`translate(${node.pt[0]} ${node.pt[1]})`} opacity={0.35 + 0.65 * p}>
                <circle
                  cx={0}
                  cy={0}
                  r={22 + 7 * Math.sin(t * 5 + idx)}
                  fill="none"
                  stroke={P.amber}
                  strokeWidth={2}
                  opacity={0.45 * p}
                />
                <circle cx={0} cy={0} r={13} fill={node.color} stroke={P.amberHot} strokeWidth={2.4} />
                <text
                  x={0}
                  y={4.5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={12}
                >
                  {node.tag}
                </text>
              </g>
            );
          })}

          {/* ==================== HAI CUNG DÒNG VỐN $5B VƯỢT ĐẠI TÂY DƯƠNG VỀ BOEING ST. LOUIS ==================== */}
          {flowSaudi > 0.005 && (
            <g>
              {/* Cung Saudi -> St. Louis (apex 135 nằm gọn 100% trong khung ở cả Pha 1 & Pha 2) */}
              <path
                d={arcPath(saudi[0], saudi[1], stLouis[0], stLouis[1], 135, flowSaudi)}
                fill="none"
                stroke={P.amber}
                strokeWidth={14}
                strokeLinecap="round"
                opacity={0.2}
              />
              <path
                d={arcPath(saudi[0], saudi[1], stLouis[0], stLouis[1], 135, flowSaudi)}
                fill="none"
                stroke={P.amber}
                strokeWidth={5.5}
                strokeLinecap="round"
                opacity={0.65}
              />
              <path
                d={arcPath(saudi[0], saudi[1], stLouis[0], stLouis[1], 135, flowSaudi)}
                fill="none"
                stroke={P.amberHot}
                strokeWidth={2.6}
                strokeLinecap="round"
              />
              {/* Các hạt xung dòng vốn chạy dọc cung Saudi */}
              {[0, 0.25, 0.5, 0.75].map((off, k) => {
                const s = ((t * 0.42 + off) % 1) * flowSaudi;
                const [px, py] = arcAt(saudi[0], saudi[1], stLouis[0], stLouis[1], 135, s);
                return (
                  <circle
                    key={k}
                    cx={px}
                    cy={py}
                    r={5.5}
                    fill={P.amberHot}
                    stroke={P.ink}
                    strokeWidth={1.2}
                  />
                );
              })}
            </g>
          )}

          {flowQatar > 0.005 && (
            <g>
              {/* Cung Qatar -> St. Louis (apex 182 giữ trọn đỉnh cung trong khung hình) */}
              <path
                d={arcPath(qatar[0], qatar[1], stLouis[0], stLouis[1], 182, flowQatar)}
                fill="none"
                stroke={P.amber}
                strokeWidth={14}
                strokeLinecap="round"
                opacity={0.18}
              />
              <path
                d={arcPath(qatar[0], qatar[1], stLouis[0], stLouis[1], 182, flowQatar)}
                fill="none"
                stroke={P.amber}
                strokeWidth={5}
                strokeLinecap="round"
                opacity={0.65}
              />
              <path
                d={arcPath(qatar[0], qatar[1], stLouis[0], stLouis[1], 182, flowQatar)}
                fill="none"
                stroke={P.amberHot}
                strokeWidth={2.5}
                strokeLinecap="round"
              />
              {[0.12, 0.37, 0.62, 0.87].map((off, k) => {
                const s = ((t * 0.42 + off) % 1) * flowQatar;
                const [px, py] = arcAt(qatar[0], qatar[1], stLouis[0], stLouis[1], 182, s);
                return (
                  <circle
                    key={k}
                    cx={px}
                    cy={py}
                    r={5}
                    fill={P.amberHot}
                    stroke={P.ink}
                    strokeWidth={1.2}
                  />
                );
              })}
            </g>
          )}

          {/* Nút trung tâm công nghiệp: NHÀ MÁY BOEING ST. LOUIS (MISSOURI) */}
          <g transform={`translate(${stLouis[0]} ${stLouis[1]})`} filter="url(#sh)">
            <circle
              cx={0}
              cy={0}
              r={46 + 5 * plantSpin}
              fill="none"
              stroke={P.amber}
              strokeWidth={10}
              opacity={0.22 * plantSpin}
            />
            <circle
              cx={0}
              cy={0}
              r={42}
              fill={P.bgCard}
              stroke={plantSpin > 0.1 ? P.amberHot : P.cyan}
              strokeWidth={3}
            />
            <circle
              cx={0}
              cy={0}
              r={34}
              fill="none"
              stroke={P.cyan}
              strokeWidth={1.8}
              strokeDasharray="10 6"
              transform={`rotate(${t * 28})`}
            />
            {/* Biểu tượng mái răng cưa nhà máy lắp ráp hàng không Boeing */}
            <polygon
              points="-20,12 -20,-4 -10,-14 -10,-4 0,-14 0,-4 10,-14 10,-4 20,-14 20,12"
              fill={P.f15Light}
              stroke={P.ink}
              strokeWidth={1.8}
              strokeLinejoin="round"
            />
            <rect x={-14} y={1} width={7} height={11} fill={P.amber} />
            <rect x={-3} y={1} width={7} height={11} fill={P.amber} />
            <rect x={8} y={1} width={7} height={11} fill={P.amber} />
            <rect
              x={-48}
              y={24}
              width={96}
              height={22}
              rx={5}
              fill="#0b1a2e"
              stroke={P.amber}
              strokeWidth={1.6}
            />
            <text
              x={0}
              y={39}
              textAnchor="middle"
              fill={P.ordWhite}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={13}
            >
              ST. LOUIS
            </text>
          </g>

          {/* ==================== SƠ ĐỒ PHẢ HỆ TIẾN HOÁ KẾT CẤU: F-15SA & F-15QA -> F-15EX ==================== */}
          {/* Đường dẫn truyền kỹ thuật từ nhà máy St. Louis chia nhánh sang F-15SA và F-15QA */}
          {exportIn > 0.01 && (
            <g>
              <path
                d="M 520,368 L 520,445 L 960,445"
                fill="none"
                stroke={P.amber}
                strokeWidth={9}
                opacity={0.22}
                {...drawOn(560, exportIn)}
              />
              <path
                d="M 520,368 L 520,445 L 960,445"
                fill="none"
                stroke={P.amberHot}
                strokeWidth={3.5}
                {...drawOn(560, exportIn)}
              />
              {/* Hai nhánh rẽ xuống F-15SA (x=640) và F-15QA (x=1280) */}
              <path
                d="M 960,445 L 640,445 L 640,506"
                fill="none"
                stroke={P.amberHot}
                strokeWidth={3.2}
                {...drawOn(400, exportIn)}
              />
              <path
                d="M 960,445 L 1280,445 L 1280,506"
                fill="none"
                stroke={P.amberHot}
                strokeWidth={3.2}
                {...drawOn(400, exportIn)}
              />
              <circle cx={960} cy={445} r={7} fill={P.amberHot} stroke={P.ink} strokeWidth={1.8} />
            </g>
          )}

          {/* THẺ NHÁNH XUẤT KHẨU HIỆN ĐẠI HOÁ: F-15SA (Trái) & F-15QA (Phải) */}
          {[
            {
              cx: 640,
              cy: 586,
              code: 'F-15SA',
              badgeColor: '#1f8a58',
              delay: 0,
            },
            {
              cx: 1280,
              cy: 586,
              code: 'F-15QA',
              badgeColor: '#8d2043',
              delay: 0.25,
            },
          ].map((card) => {
            const p = prog(t, 163.4 + card.delay, 165.4 + card.delay);
            if (p <= 0.01) return null;
            return (
              <g
                key={card.code}
                transform={`translate(${card.cx} ${card.cy + (1 - p) * 24}) scale(${0.92 + 0.08 * p})`}
                opacity={p}
                filter="url(#sh)"
              >
                <rect
                  x={-205}
                  y={-80}
                  width={410}
                  height={160}
                  rx={14}
                  fill={P.bgCard}
                  stroke={P.amber}
                  strokeWidth={2.6}
                />
                {/* Lưới blueprint nhỏ trong thẻ */}
                <line x1={-190} y1={0} x2={190} y2={0} stroke={P.gridBright} strokeWidth={1} opacity={0.3} />
                <line x1={30} y1={-68} x2={30} y2={68} stroke={P.gridBright} strokeWidth={1} opacity={0.3} />

                {/* Huy hiệu quốc gia & mã phiên bản xuất khẩu */}
                <rect
                  x={-188}
                  y={-64}
                  width={106}
                  height={32}
                  rx={7}
                  fill={card.badgeColor}
                  stroke={P.amberHot}
                  strokeWidth={1.6}
                />
                <text
                  x={-135}
                  y={-42}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={18}
                >
                  {card.code}
                </text>

                {/* Biểu tượng nâng cấp: FBW 4 kênh + Cánh mới gia cường */}
                <g transform="translate(-135 28)">
                  <rect x={-46} y={-18} width={92} height={36} rx={6} fill="#0e213a" stroke={P.cyan} strokeWidth={1.5} />
                  <line x1={-32} y1={-6} x2={32} y2={-6} stroke={P.cyan} strokeWidth={2.2} />
                  <line x1={-32} y1={6} x2={20} y2={6} stroke={P.amber} strokeWidth={2.2} />
                </g>

                {/* Hình chiếu bằng F15Top2D hiện đại hoá (mấu đầu cánh + CFT + vũ khí đầy đủ) */}
                <F15Top2D
                  x={64}
                  y={2}
                  scale={0.47}
                  wingTipMissiles
                  fullLoad
                  cft
                />
              </g>
            );
          })}

          {/* ==================== LUỒNG KẾT CẤU HỢP NHẤT CHẢY THẲNG XUỐNG F-15EX CỦA USAF ==================== */}
          {usafIn > 0.01 && (
            <g>
              {/* Hai nhánh F-15SA & F-15QA hội tụ tại (960, 722) rồi đổ thẳng xuống F-15EX (960, 782) */}
              <path
                d="M 640,666 L 640,722 L 960,722 L 960,782"
                fill="none"
                stroke={P.cyan}
                strokeWidth={11}
                opacity={0.22}
                {...drawOn(440, usafIn)}
              />
              <path
                d="M 1280,666 L 1280,722 L 960,722 L 960,782"
                fill="none"
                stroke={P.cyan}
                strokeWidth={11}
                opacity={0.22}
                {...drawOn(440, usafIn)}
              />
              <path
                d="M 640,666 L 640,722 L 960,722 L 960,782"
                fill="none"
                stroke={paidSeal > 0.1 ? P.green : P.cyan}
                strokeWidth={3.8}
                {...drawOn(440, usafIn)}
              />
              <path
                d="M 1280,666 L 1280,722 L 960,722 L 960,782"
                fill="none"
                stroke={paidSeal > 0.1 ? P.green : P.cyan}
                strokeWidth={3.8}
                {...drawOn(440, usafIn)}
              />
              <circle
                cx={960}
                cy={722}
                r={9}
                fill={paidSeal > 0.1 ? P.green : P.cyan}
                stroke={P.ink}
                strokeWidth={2}
              />
            </g>
          )}

          {/* HAI BÓNG MỜ F-15C & F-15E CŨ QUÁ TẢI MỜ DẦN HAI BÊN (169.4s – 177s) */}
          {usafIn > 0.05 &&
            [
              { cx: 330, code: 'F-15C', cft: false, dir: 1 },
              { cx: 1590, code: 'F-15E', cft: true, dir: -1 },
            ].map((oldJet) => {
              const ghostOp = lerp(0.82, 0.24, retireFade) * usafIn;
              return (
                <g key={oldJet.code} transform={`translate(${oldJet.cx} 878)`}>
                  <g opacity={ghostOp}>
                    <rect
                      x={-162}
                      y={-74}
                      width={324}
                      height={148}
                      rx={12}
                      fill="#0d1d33"
                      stroke={P.red}
                      strokeWidth={2}
                      strokeDasharray="8 6"
                    />
                    <text
                      x={-138}
                      y={-44}
                      fill={P.muted}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={17}
                    >
                      {oldJet.code}
                    </text>
                    <F15Top2D x={22} y={6} scale={0.43} legacy cft={oldJet.cft} />
                  </g>
                  {/* Mũi tên chuyển giao nhiệm vụ sang F-15EX ở trung tâm */}
                  <line
                    x1={oldJet.dir * 172}
                    y1={0}
                    x2={oldJet.dir * 355}
                    y2={0}
                    stroke={P.cyan}
                    strokeWidth={2.4}
                    strokeDasharray="7 5"
                    opacity={0.65 * usafIn}
                  />
                  <polygon
                    points={`${oldJet.dir * 362},0 ${oldJet.dir * 346},-8 ${oldJet.dir * 346},8`}
                    fill={P.cyan}
                    opacity={0.75 * usafIn}
                  />
                </g>
              );
            })}

          {/* THẺ CHỦ LỰC TRUNG TÂM: USAF F-15EX EAGLE II (KẾT CẤU ĐÃ ĐƯỢC TRẢ TIỀN SẴN) */}
          {usafIn > 0.01 && (
            <g
              transform={`translate(960 ${878 + (1 - usafIn) * 28}) scale(${0.92 + 0.08 * usafIn})`}
              opacity={usafIn}
              filter="url(#sh)"
            >
              {/* Vành sáng xanh ngọc khi kích hoạt dấu "Paid For" lúc 174.22s */}
              {paidSeal > 0.01 && (
                <rect
                  x={-258}
                  y={-104}
                  width={516}
                  height={208}
                  rx={20}
                  fill="none"
                  stroke={P.green}
                  strokeWidth={10}
                  opacity={0.26 * paidSeal}
                />
              )}
              <rect
                x={-248}
                y={-94}
                width={496}
                height={188}
                rx={16}
                fill="#153257"
                stroke={paidSeal > 0.1 ? P.green : P.cyan}
                strokeWidth={3.2}
              />

              {/* Không hiệu Mỹ & Mã định danh F-15EX */}
              <UsafRoundel x={-194} y={-58} r={14} />
              <rect
                x={-162}
                y={-75}
                width={118}
                height={34}
                rx={7}
                fill="#0b1c33"
                stroke={P.cyan}
                strokeWidth={1.8}
              />
              <text
                x={-103}
                y={-52}
                textAnchor="middle"
                fill={P.cyanSoft}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={20}
              >
                F-15EX
              </text>

              {/* Dấu xác nhận xanh lục (Structural R&D Already Paid) lúc 174.22s */}
              {paidSeal > 0.01 && (
                <g transform={`translate(-145 34) scale(${0.6 + 0.4 * paidSeal})`} opacity={paidSeal}>
                  <circle cx={0} cy={0} r={24} fill={P.green} stroke={P.ink} strokeWidth={2.2} />
                  <polyline
                    points="-11,1 -3,9 12,-8"
                    fill="none"
                    stroke={P.ink}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              )}

              {/* Hình chiếu bằng F-15EX Eagle II đầy đủ 12 tên lửa + mấu đầu cánh */}
              <F15Top2D
                x={68}
                y={4}
                scale={0.58}
                wingTipMissiles
                fullLoad
              />
            </g>
          )}
        </Layer>
      </Cam2D>

      <Grain opacity={0.4} />

      <Label
        t={t}
        text="$5 BILLION"
        x={1010}
        y={170}
        from={CUE.s07_fundFlow}
        until={163.2}
        bg={P.amber}
        fg={P.ink}
        size={56}
      />
    </AbsoluteFill>
  );
};

export default S07;
