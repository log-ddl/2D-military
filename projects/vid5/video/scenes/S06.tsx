import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog } from '@kit/theme';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { Blast2D } from '@lib/2d/fx';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Side2D } from '../local/jets2d';

// Nền hang-ga nhiều lớp cho nửa dưới (phi đội F-15C nằm đất)
const HANGAR_SKY_FAR = skyline('s06_far', -300, 2300, 1230, 85, 520, 2100);
const HANGAR_SKY_MID = skyline('s06_mid', -300, 2300, 1300, 62, 380, 2100);

// Chốt khóa bánh xe nằm đất (wheel chocks) tại vị trí bánh mũi & bánh chính của F15Side2D
const WheelChocks: React.FC<{ x: number; y: number; scale: number }> = ({ x, y, scale }) => {
  const wheels = [
    { wx: x + 120 * scale, wy: y + 37.5 * scale, r: 7 * scale },
    { wx: x - 26 * scale, wy: y + 38.5 * scale, r: 10 * scale },
  ];
  return (
    <g>
      {wheels.map((w, idx) => (
        <g key={idx}>
          <polygon
            points={`${w.wx - w.r * 2.3},${w.wy} ${w.wx - w.r * 0.8},${w.wy} ${w.wx - w.r * 1.1},${w.wy - w.r * 1.25}`}
            fill={P.amber}
            stroke={P.ink}
            strokeWidth={1.6}
          />
          <polygon
            points={`${w.wx + w.r * 0.8},${w.wy} ${w.wx + w.r * 2.3},${w.wy} ${w.wx + w.r * 1.1},${w.wy - w.r * 1.25}`}
            fill={P.amber}
            stroke={P.ink}
            strokeWidth={1.6}
          />
          <line
            x1={w.wx - w.r * 1.8}
            y1={w.wy - 2}
            x2={w.wx + w.r * 1.8}
            y2={w.wy - 2}
            stroke={P.red}
            strokeWidth={2.2}
          />
        </g>
      ))}
    </g>
  );
};

// Hàm vẽ cung tròn cho đồng hồ đo giờ bay khung thân
const polarPt = (cx: number, cy: number, r: number, degAng: number): [number, number] => {
  const rad = (degAng * Math.PI) / 180;
  return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
};

const sectorArc = (cx: number, cy: number, r: number, a0: number, a1: number) => {
  const [x0, y0] = polarPt(cx, cy, r, a0);
  const [x1, y1] = polarPt(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  return `M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

const S06: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ các pha diễn hoạt
  const zoomIn = prog(t, 128.4, 131.2);
  const creepZoom = prog(t, 131.2, 138.1);
  const caliperIn = prog(t, 132.1, 134.2);
  const thinPulse = 0.55 + 0.45 * Math.sin(t * 7.5);
  const crackGrow = prog(t, 133.6, 138.15);
  const snapP = prog(t, CUE.s06_snap, 138.58);
  const pullToFleet = prog(t, 139.6, 141.7);

  // Điều khiển Cam2D: Mở từ F-15C khoanh đỏ sau buồng lái -> zoom vi mô vào dầm chữ I -> kéo ra phi đội nằm đất & đồng hồ giờ bay
  const camX = lerp(lerp(880, 1165, zoomIn), 960, pullToFleet);
  const camY = lerp(lerp(425, 560, zoomIn), 1420, pullToFleet);
  const camZoom = lerp(lerp(1.06, 1.46 + 0.1 * creepZoom, zoomIn), 1.0, pullToFleet);

  const hh = handheld(t, 2.2, 's06');
  const snapJolt = bump(t, CUE.s06_snap, 0.52) * 19;
  const shake: readonly [number, number] = [
    hh[0] + Math.sin(t * 58) * snapJolt,
    hh[1] + Math.cos(t * 51) * snapJolt * 0.85,
  ];

  // Vị trí khoanh đỏ dầm upper-right longeron ngay sau buồng lái chiếc F15Side2D(legacy, singleSeat) ở (560, 245, scale=1.2)
  const spotX = 560 + 50 * 1.2;
  const spotY = 245 - 16 * 1.2;

  // Đồng hồ giờ bay ở Pha 2
  const gaugeCx = 1485;
  const gaugeCy = 1355;
  const gaugeR = 212;
  const needleProg = prog(t, 141.0, 147.2);
  const needleJitter =
    t >= 146.5 ? Math.sin(t * 36) * 1.8 * prog(t, 146.5, 147.4) : 0;
  // Góc thang đo từ -210° (0 hrs) tới +30° (8,000+ hrs)
  const needleDeg = lerp(-112, 27, needleProg) + needleJitter;
  const redAlert = t >= CUE.s06_hoursRedline - 0.6 ? 0.55 + 0.45 * Math.sin(t * 11) : 0.25;

  return (
    <AbsoluteFill style={{ backgroundColor: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <Layer>
          <Defs2D shadow="rgba(6, 12, 22, 0.52)" />

          {/* Nền bản vẽ kỹ thuật trải rộng cho cả 2 pha */}
          <BlueprintGrid x0={-500} y0={-300} w={3000} h={2450} step={110} id="bp06" />

          {/* Các đường gióng trạm khung thân kỹ thuật mờ (Fuselage Stations) */}
          {[-100, 260, 620, 980, 1340, 1700, 2060].map((gx, i) => (
            <line
              key={i}
              x1={gx}
              y1={-200}
              x2={gx}
              y2={980}
              stroke={P.gridBright}
              strokeWidth={1}
              strokeDasharray="8 10"
              opacity={0.22}
            />
          ))}

          {/* ==================== PHA 1: GIẢI PHẪU VI MÔ DẦM UPPER-RIGHT LONGERON ==================== */}
          <g>
            {/* Khung bóng F-15C nhìn ngang với tia X hé mở cấu trúc lưng sau buồng lái */}
            <g filter="url(#sh)">
              <F15Side2D
                x={560}
                y={245}
                scale={1.2}
                legacy
                singleSeat
                xray={0.38 * prog(t, 127.15, 129.4)}
              />
            </g>

            {/* Ô biểu đồ chu kỳ tải mỏi không chiến (Cyclic G-Load Stress Waveform) cân bằng góc dưới-trái Pha 1 */}
            <g transform="translate(215 415)" filter="url(#sh)">
              <rect
                x={0}
                y={0}
                width={420}
                height={340}
                rx={12}
                fill="#0b182b"
                stroke={P.gridBright}
                strokeWidth={2}
              />
              {[68, 136, 204, 272].map((gy) => (
                <line
                  key={gy}
                  x1={18}
                  y1={gy}
                  x2={402}
                  y2={gy}
                  stroke={P.grid}
                  strokeWidth={0.9}
                  strokeDasharray="5 5"
                  opacity={0.4}
                />
              ))}
              <line x1={22} y1={170} x2={398} y2={170} stroke={P.cyan} strokeWidth={1.4} opacity={0.5} />
              {/* Sóng ứng suất kéo-nén lặp lại qua hàng nghìn trận không chiến */}
              <path
                d={
                  'M 24 170 ' +
                  Array.from({ length: 46 }, (_, i) => {
                    const wx = 24 + (i / 45) * 372;
                    const env = 0.45 + 0.55 * (i / 45);
                    const wy =
                      170 -
                      Math.sin(i * 1.15 + t * 4.5) * 95 * env -
                      Math.cos(i * 2.4) * 22 * env;
                    return `L ${wx.toFixed(1)} ${wy.toFixed(1)}`;
                  }).join(' ')
                }
                fill="none"
                stroke={crackGrow > 0.1 ? P.red : P.amber}
                strokeWidth={2.6}
                strokeLinejoin="round"
              />
              {/* Thanh chỉ báo tích luỹ mỏi kim loại */}
              <rect x={28} y={294} width={364} height={18} rx={5} fill="#081221" stroke={P.grid} strokeWidth={1.2} />
              <rect
                x={30}
                y={296}
                width={360 * prog(t, 127.4, 138.1)}
                height={14}
                rx={4}
                fill={crackGrow > 0.35 ? P.red : P.amber}
              />
            </g>

            {/* Vòng ngắm khoanh đỏ đúng vị trí dầm thân trên-phải ngay sau vòm kính đơn */}
            <g>
              <circle
                cx={spotX}
                cy={spotY}
                r={34 + 5 * Math.sin(t * 6)}
                fill="none"
                stroke={P.red}
                strokeWidth={5}
                opacity={0.25}
              />
              <circle
                cx={spotX}
                cy={spotY}
                r={24}
                fill="none"
                stroke={P.red}
                strokeWidth={2.6}
                strokeDasharray="9 5"
              />
              <circle cx={spotX} cy={spotY} r={5} fill={P.amberHot} stroke={P.red} strokeWidth={2} />
              <line x1={spotX - 34} y1={spotY} x2={spotX - 14} y2={spotY} stroke={P.red} strokeWidth={2} />
              <line x1={spotX + 14} y1={spotY} x2={spotX + 34} y2={spotY} stroke={P.red} strokeWidth={2} />
              <line x1={spotX} y1={spotY - 34} x2={spotX} y2={spotY - 14} stroke={P.red} strokeWidth={2} />
              <line x1={spotX} y1={spotY + 14} x2={spotX} y2={spotY + 34} stroke={P.red} strokeWidth={2} />
            </g>

            {/* Chùm nón phóng đại nối từ vị trí sau buồng lái xuống khung hiển vi kỹ thuật */}
            <polygon
              points={`${spotX},${spotY + 22} 690,335 1620,335`}
              fill={P.cyan}
              opacity={0.06 * prog(t, 127.6, 129.5)}
            />
            <line
              x1={spotX - 12}
              y1={spotY + 20}
              x2={690}
              y2={335}
              stroke={P.cyan}
              strokeWidth={1.8}
              strokeDasharray="7 5"
              opacity={0.55 * prog(t, 127.6, 129.5)}
            />
            <line
              x1={spotX + 16}
              y1={spotY + 18}
              x2={1620}
              y2={335}
              stroke={P.red}
              strokeWidth={1.8}
              strokeDasharray="7 5"
              opacity={0.55 * prog(t, 127.6, 129.5)}
            />

            {/* Khung kính hiển vi kết cấu (Forensic Metallurgical Viewport) */}
            <g filter="url(#sh)">
              <rect
                x={685}
                y={332}
                width={940}
                height={456}
                rx={14}
                fill="#0b182b"
                stroke={P.gridBright}
                strokeWidth={2.6}
              />
              {/* Lưới vi mô bên trong ô giải phẫu */}
              {Array.from({ length: 18 }, (_, i) => (
                <line
                  key={`vx${i}`}
                  x1={735 + i * 50}
                  y1={342}
                  x2={735 + i * 50}
                  y2={778}
                  stroke={P.grid}
                  strokeWidth={0.8}
                  opacity={0.28}
                />
              ))}
              {Array.from({ length: 8 }, (_, j) => (
                <line
                  key={`vy${j}`}
                  x1={695}
                  y1={382 + j * 52}
                  x2={1615}
                  y2={382 + j * 52}
                  stroke={P.grid}
                  strokeWidth={0.8}
                  opacity={0.28}
                />
              ))}
              {/* Bốn góc khung ngắm kỹ thuật */}
              {[
                [702, 349, 1, 1],
                [1608, 349, -1, 1],
                [702, 771, 1, -1],
                [1608, 771, -1, -1],
              ].map(([bx, by, sx, sy], idx) => (
                <path
                  key={idx}
                  d={`M ${bx} ${by + sy * 22} L ${bx} ${by} L ${bx + sx * 22} ${by}`}
                  fill="none"
                  stroke={P.cyan}
                  strokeWidth={2.6}
                />
              ))}
            </g>

            {/* Ô mặt cắt ngang chữ I (Cross-Section Profile Inset) bên trái khung hiển vi */}
            <g transform="translate(805 562)">
              <rect
                x={-92}
                y={-172}
                width={184}
                height={344}
                rx={10}
                fill="#0e223c"
                stroke={P.gridBright}
                strokeWidth={1.8}
              />
              {/* Biên dạng chuẩn thiết kế chữ I (nét đứt cyan dày đủ chuẩn) */}
              <polygon
                points="-62,-112 62,-112 62,-78 20,-78 20,78 62,78 62,112 -62,112 -62,78 -20,78 -20,-78 -62,-78"
                fill="none"
                stroke={P.cyan}
                strokeWidth={2.2}
                strokeDasharray="6 4"
                opacity={0.45 + 0.55 * caliperIn}
              />
              {/* Phần hợp kim bị phay hụt từ thập niên 1980 (tô đỏ cảnh báo) */}
              {caliperIn > 0.02 && (
                <>
                  <rect
                    x={-20}
                    y={-78}
                    width={12}
                    height={156}
                    fill={P.red}
                    opacity={0.42 * caliperIn * thinPulse}
                  />
                  <rect
                    x={8}
                    y={-78}
                    width={12}
                    height={156}
                    fill={P.red}
                    opacity={0.42 * caliperIn * thinPulse}
                  />
                  <rect
                    x={-62}
                    y={-90}
                    width={124}
                    height={12}
                    fill={P.amber}
                    opacity={0.36 * caliperIn * thinPulse}
                  />
                </>
              )}
              {/* Mặt cắt chữ I thực tế bị tiện mỏng vách bụng và gờ trên */}
              <polygon
                points="-62,-112 62,-112 62,-90 8,-90 8,78 62,78 62,112 -62,112 -62,78 -8,78 -8,-90 -62,-90"
                fill={P.legMid}
                stroke={P.ink}
                strokeWidth={2.4}
                strokeLinejoin="round"
              />
              <polygon
                points="-60,-110 60,-110 60,-99 -60,-99"
                fill={P.legLight}
                opacity={0.8}
              />
              <rect x={-4} y={-88} width={8} height={166} fill={P.legDark} opacity={0.55} />
              {/* Vết nứt đỏ cắt ngang vách chữ I */}
              {crackGrow > 0.02 && (
                <path
                  d="M 8,-46 L 1,-38 L -5,-43 L -8,-34"
                  fill="none"
                  stroke={P.red}
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  {...drawOn(34, crackGrow)}
                />
              )}
              {/* Mũi kẹp thước đo vi mô ép vào vách chữ I bị mỏng */}
              {caliperIn > 0.02 && (
                <g opacity={caliperIn}>
                  <polygon
                    points={`${-54 + 14 * caliperIn},-12 ${-8},-12 ${-22},-24 ${-54 + 14 * caliperIn},-24`}
                    fill={P.amber}
                    stroke={P.ink}
                    strokeWidth={1.5}
                  />
                  <polygon
                    points={`${54 - 14 * caliperIn},-12 ${8},-12 ${22},-24 ${54 - 14 * caliperIn},-24`}
                    fill={P.amber}
                    stroke={P.ink}
                    strokeWidth={1.5}
                  />
                </g>
              )}
            </g>

            {/* ==================== THANH DẦM DỌC UPPER-RIGHT LONGERON (LIỀN KHỐI TRƯỚC 138.20s, GÃY ĐÔI TẠI 138.20s) ==================== */}
            {snapP <= 0.005 ? (
              <g>
                {/* Tấm vỏ lưng hợp kim liền khối */}
                <rect
                  x={930}
                  y={434}
                  width={655}
                  height={20}
                  fill={P.f15Dark}
                  stroke={P.ink}
                  strokeWidth={2}
                />
                {[955, 1000, 1045, 1090, 1135, 1180, 1225, 1285, 1330, 1375, 1420, 1465, 1510, 1555].map(
                  (rx) => (
                    <circle
                      key={rx}
                      cx={rx}
                      cy={444}
                      r={3.5}
                      fill={P.legLight}
                      stroke={P.ink}
                      strokeWidth={1.1}
                    />
                  ),
                )}
                {/* Gờ cánh trên chữ I liền mạch (có vùng lõm bị tiện mỏng ở x = 1118..1396) */}
                <path
                  d="M 930,454 L 1585,454 L 1585,490 L 1396,490 L 1368,474 L 1145,474 L 1118,490 L 930,490 Z"
                  fill={P.legLight}
                  stroke={P.ink}
                  strokeWidth={2.2}
                />
                {/* Bản bụng giữa chữ I liền khối không vết nối trước khi nứt */}
                <path
                  d="M 930,490 L 1118,490 L 1145,474 L 1368,474 L 1396,490 L 1585,490 L 1585,634 L 930,634 Z"
                  fill={P.legMid}
                  stroke={P.ink}
                  strokeWidth={2.2}
                  strokeLinejoin="round"
                />
                <rect x={932} y={564} width={651} height={69} fill={P.legDark} opacity={0.48} />
                {/* Gờ cánh dưới chữ I liền khối */}
                <rect
                  x={930}
                  y={634}
                  width={655}
                  height={36}
                  fill={P.legDark}
                  stroke={P.ink}
                  strokeWidth={2.2}
                />
              </g>
            ) : (
              <>
                {/* Nửa TRÁI của thanh dầm dọc khi giật gãy đôi (x = 930 .. 1255) */}
                <g
                  transform={`translate(${-30 * snapP} ${15 * snapP}) rotate(${-5.8 * snapP} 1060 562)`}
                >
                  <rect
                    x={930}
                    y={434}
                    width={325}
                    height={20}
                    fill={P.f15Dark}
                    stroke={P.ink}
                    strokeWidth={2}
                  />
                  {[955, 1000, 1045, 1090, 1135, 1180, 1225].map((rx) => (
                    <circle
                      key={rx}
                      cx={rx}
                      cy={444}
                      r={3.5}
                      fill={P.legLight}
                      stroke={P.ink}
                      strokeWidth={1.1}
                    />
                  ))}
                  <path
                    d="M 930,454 L 1255,454 L 1255,474 L 1145,474 L 1118,490 L 930,490 Z"
                    fill={P.legLight}
                    stroke={P.ink}
                    strokeWidth={2.2}
                  />
                  <polygon
                    points="930,490 1118,490 1145,474 1255,474 1244,508 1261,536 1241,568 1259,598 1247,634 930,634"
                    fill={P.legMid}
                    stroke={P.ink}
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="930,564 1242,564 1259,598 1247,634 930,634"
                    fill={P.legDark}
                    opacity={0.48}
                  />
                  <polygon
                    points="930,634 1247,634 1255,670 930,670"
                    fill={P.legDark}
                    stroke={P.ink}
                    strokeWidth={2.2}
                  />
                  <polyline
                    points="1255,454 1255,474 1244,508 1261,536 1241,568 1259,598 1247,634 1255,670"
                    fill="none"
                    stroke={P.amberHot}
                    strokeWidth={3.2}
                    opacity={1 - prog(t, 138.6, 139.8) * 0.55}
                  />
                </g>

                {/* Nửa PHẢI của thanh dầm dọc khi giật gãy đôi (x = 1255 .. 1585) */}
                <g
                  transform={`translate(${34 * snapP} ${20 * snapP}) rotate(${6.8 * snapP} 1450 562)`}
                >
                  <rect
                    x={1255}
                    y={434}
                    width={330}
                    height={20}
                    fill={P.f15Dark}
                    stroke={P.ink}
                    strokeWidth={2}
                  />
                  {[1285, 1330, 1375, 1420, 1465, 1510, 1555].map((rx) => (
                    <circle
                      key={rx}
                      cx={rx}
                      cy={444}
                      r={3.5}
                      fill={P.legLight}
                      stroke={P.ink}
                      strokeWidth={1.1}
                    />
                  ))}
                  <path
                    d="M 1255,454 L 1585,454 L 1585,490 L 1396,490 L 1368,474 L 1255,474 Z"
                    fill={P.legLight}
                    stroke={P.ink}
                    strokeWidth={2.2}
                  />
                  <polygon
                    points="1255,474 1368,474 1396,490 1585,490 1585,634 1247,634 1259,598 1241,568 1261,536 1244,508"
                    fill={P.legMid}
                    stroke={P.ink}
                    strokeWidth={2.2}
                    strokeLinejoin="round"
                  />
                  <polygon
                    points="1241,568 1585,568 1585,634 1247,634 1259,598"
                    fill={P.legDark}
                    opacity={0.48}
                  />
                  <polygon
                    points="1247,634 1585,634 1585,670 1255,670"
                    fill={P.legDark}
                    stroke={P.ink}
                    strokeWidth={2.2}
                  />
                  <polyline
                    points="1255,454 1255,474 1244,508 1261,536 1241,568 1259,598 1247,634 1255,670"
                    fill="none"
                    stroke={P.red}
                    strokeWidth={3.2}
                  />
                </g>
              </>
            )}

            {/* Vùng đối chiếu vách chuẩn Cyan vs vách bị phay hụt + Thước kẹp kỹ thuật (trước khi gãy toác) */}
            {snapP < 0.35 && (
              <g opacity={(1 - snapP * 2.8) * Math.max(0.25, caliperIn)}>
                {/* Vùng kim loại bị phay hụt (1118..1396, y = 474..490) */}
                <polygon
                  points="1118,490 1145,474 1368,474 1396,490"
                  fill={P.red}
                  opacity={0.36 * thinPulse}
                />
                {/* Đường chuẩn thiết kế (nét đứt Cyan) */}
                <line
                  x1={1105}
                  y1={490}
                  x2={1410}
                  y2={490}
                  stroke={P.cyan}
                  strokeWidth={2.6}
                  strokeDasharray="9 6"
                />

                {/* Thước kẹp Vernier Caliper trượt kẹp đo bề dày gờ trên bị tiện mỏng tại x = 1255 */}
                <g transform={`translate(1255 ${382 + 28 * caliperIn})`} opacity={caliperIn}>
                  {/* Thân thước đứng */}
                  <rect
                    x={-11}
                    y={-52}
                    width={22}
                    height={118}
                    rx={2}
                    fill="#aebfd1"
                    stroke={P.ink}
                    strokeWidth={1.8}
                  />
                  {[-38, -26, -14, -2, 10, 22, 34, 46].map((ty) => (
                    <line
                      key={ty}
                      x1={-10}
                      y1={ty}
                      x2={ty % 24 === 10 ? 4 : -2}
                      y2={ty}
                      stroke={P.ink}
                      strokeWidth={1.3}
                    />
                  ))}
                  {/* Mỏ kẹp trên chạm mặt trên gờ dầm (y = 454 -> local y = 44) */}
                  <polygon
                    points="-11,32 54,32 42,44 -11,44"
                    fill={P.amber}
                    stroke={P.ink}
                    strokeWidth={1.8}
                  />
                  {/* Mỏ kẹp dưới chạm hốc bị tiện mỏng (y = 474 -> local y = 64) */}
                  <polygon
                    points="-11,64 42,64 54,78 -11,78"
                    fill={P.amber}
                    stroke={P.ink}
                    strokeWidth={1.8}
                  />
                  {/* Mũi tên đỏ chỉ độ hụt bề dày so với vạch chuẩn Cyan */}
                  <line x1={68} y1={44} x2={68} y2={80} stroke={P.cyan} strokeWidth={2.2} />
                  <line x1={60} y1={64} x2={76} y2={64} stroke={P.red} strokeWidth={2.6} />
                  <line x1={60} y1={80} x2={76} y2={80} stroke={P.cyan} strokeWidth={2.4} />
                </g>
              </g>
            )}

            {/* Đường nứt mỏi kim loại đỏ phân nhánh lan sâu qua thớ hợp kim (nét kép halo + lõi sáng, không dùng filter glow) */}
            {crackGrow > 0.01 && snapP < 0.15 && (
              <g opacity={1 - snapP * 6}>
                {/* Vết nứt mỏi trục chính */}
                <path
                  d="M 1255,474 L 1244,508 L 1261,536 L 1241,568 L 1259,598 L 1247,634 L 1255,668"
                  fill="none"
                  stroke={P.red}
                  strokeWidth={11}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  opacity={0.26}
                  {...drawOn(220, crackGrow)}
                />
                <path
                  d="M 1255,474 L 1244,508 L 1261,536 L 1241,568 L 1259,598 L 1247,634 L 1255,668"
                  fill="none"
                  stroke={P.red}
                  strokeWidth={4.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  {...drawOn(220, crackGrow)}
                />
                <path
                  d="M 1255,474 L 1244,508 L 1261,536 L 1241,568 L 1259,598 L 1247,634 L 1255,668"
                  fill="none"
                  stroke={P.amberHot}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  {...drawOn(220, crackGrow)}
                />
                {/* Các nhánh vi nứt mỏi phụ toả sang hai bên thớ kim loại */}
                {crackGrow > 0.25 && (
                  <path
                    d="M 1244,508 L 1214,524 L 1196,521"
                    fill="none"
                    stroke={P.red}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    {...drawOn(60, (crackGrow - 0.25) / 0.5)}
                  />
                )}
                {crackGrow > 0.45 && (
                  <path
                    d="M 1261,536 L 1294,552 L 1312,566"
                    fill="none"
                    stroke={P.red}
                    strokeWidth={2.4}
                    strokeLinecap="round"
                    {...drawOn(65, (crackGrow - 0.45) / 0.45)}
                  />
                )}
                {crackGrow > 0.62 && (
                  <path
                    d="M 1241,568 L 1206,588 L 1188,602"
                    fill="none"
                    stroke={P.red}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    {...drawOn(62, (crackGrow - 0.62) / 0.38)}
                  />
                )}
              </g>
            )}

            {/* Tia lửa & mảnh vỡ kim loại bắn tung khi dầm longeron đứt gãy lúc 138.20s */}
            <Blast2D
              t={t}
              at={CUE.s06_snap}
              x={1255}
              y={565}
              size={44}
              air
              life={2.4}
              seed={19}
              smoke="#6e8094"
            />
          </g>

          {/* ==================== PHA 2: PHI ĐỘI F-15C NẰM ĐẤT TOÀN CẦU & ĐỒNG HỒ GIỜ BAY KỊCH ĐỎ ==================== */}
          <g>
            {/* Dãy mái hang-ga & đồi xa tạo chiều sâu không gian */}
            <path d={HANGAR_SKY_FAR} fill="#0a1628" opacity={0.85} />
            <path d={HANGAR_SKY_MID} fill="#0e2038" opacity={0.92} />

            {/* Dàn vì kèo thép mái hang-ga & đèn bảo dưỡng phía trên cao tạo chiều sâu khung hình */}
            <g opacity={0.42}>
              <rect x={-200} y={910} width={2320} height={38} fill="#0a182c" stroke={P.gridBright} strokeWidth={1.5} />
              <rect x={-200} y={1025} width={2320} height={18} fill="#0c1e36" stroke={P.grid} strokeWidth={1.2} />
              {Array.from({ length: 16 }, (_, i) => {
                const tx = -120 + i * 145;
                return (
                  <g key={i}>
                    <line x1={tx} y1={948} x2={tx + 72} y2={1025} stroke={P.gridBright} strokeWidth={2} />
                    <line x1={tx + 145} y1={948} x2={tx + 72} y2={1025} stroke={P.gridBright} strokeWidth={2} />
                    {i % 3 === 1 && (
                      <>
                        <rect x={tx + 46} y={1043} width={52} height={12} rx={3} fill={P.f15Dark} stroke={P.ink} strokeWidth={1.2} />
                        <polygon
                          points={`${tx + 50},1055 ${tx + 94},1055 ${tx + 148},1215 ${tx - 4},1215`}
                          fill={P.cyan}
                          opacity={0.05}
                        />
                      </>
                    )}
                  </g>
                );
              })}
            </g>

            {/* Khung vòm hang-ga quân sự phía sau sân đỗ */}
            {[160, 560, 960].map((hx, idx) => (
              <g key={idx} opacity={0.45}>
                <path
                  d={`M ${hx} 1340 L ${hx + 40} 1185 L ${hx + 290} 1185 L ${hx + 330} 1340 Z`}
                  fill="#122744"
                  stroke={P.gridBright}
                  strokeWidth={1.6}
                />
                <rect x={hx + 55} y={1225} width={220} height={115} fill="#091526" />
              </g>
            ))}

            {/* Mặt đường bê tông sân đỗ (Tarmac Apron) */}
            <rect x={-300} y={1340} width={2520} height={700} fill="#102138" />
            <line x1={-300} y1={1340} x2={2220} y2={1340} stroke={P.gridBright} strokeWidth={2.2} />
            {[1430, 1545, 1690].map((ty, idx) => (
              <line
                key={idx}
                x1={-200}
                y1={ty}
                x2={1250}
                y2={ty}
                stroke={P.amber}
                strokeWidth={2}
                strokeDasharray="24 18"
                opacity={0.35 + idx * 0.14}
              />
            ))}

            {/* Dãy 3 tiêm kích F-15C Chiến tranh Lạnh xếp bậc thang bị khoá bánh nằm đất */}
            {[
              { x: 470, y: 1365, s: 0.72, op: 0.65 },
              { x: 555, y: 1480, s: 0.88, op: 0.84 },
              { x: 645, y: 1625, s: 1.08, op: 1.0 },
            ].map((jet, idx) => {
              const tagX = jet.x + 50 * jet.s;
              const tagY = jet.y - 16 * jet.s;
              return (
                <g key={idx} opacity={jet.op} filter="url(#sh)">
                  <F15Side2D x={jet.x} y={jet.y} scale={jet.s} legacy singleSeat gear />
                  <WheelChocks x={jet.x} y={jet.y} scale={jet.s} />
                  {/* Vòng cảnh báo đỏ kiểm tra vết nứt dầm sau buồng lái trên mọi chiếc nằm đất */}
                  <circle
                    cx={tagX}
                    cy={tagY}
                    r={14 * jet.s}
                    fill="none"
                    stroke={P.red}
                    strokeWidth={2.4}
                    opacity={0.55 + 0.4 * Math.sin(t * 6 + idx)}
                  />
                  <circle cx={tagX} cy={tagY} r={4 * jet.s} fill={P.red} />
                </g>
              );
            })}

            {/* Thanh rào chắn sọc đỏ-vàng khoá đường lăn trước mũi phi đội nằm đất */}
            <g transform="translate(935 1685)" filter="url(#shHard)">
              <line x1={-88} y1={-22} x2={-104} y2={24} stroke={P.legMid} strokeWidth={5} strokeLinecap="round" />
              <line x1={-76} y1={-22} x2={-62} y2={24} stroke={P.legMid} strokeWidth={5} strokeLinecap="round" />
              <line x1={88} y1={-22} x2={104} y2={24} stroke={P.legMid} strokeWidth={5} strokeLinecap="round" />
              <line x1={76} y1={-22} x2={62} y2={24} stroke={P.legMid} strokeWidth={5} strokeLinecap="round" />
              <rect x={-110} y={-34} width={220} height={24} rx={4} fill={P.red} stroke={P.ink} strokeWidth={2.2} />
              {[-80, -40, 0, 40, 80].map((sx) => (
                <polygon
                  key={sx}
                  points={`${sx - 12},-34 ${sx + 4},-34 ${sx - 6},-10 ${sx - 22},-10`}
                  fill={P.amberHot}
                />
              ))}
              {/* Đèn chớp cảnh báo đình chỉ bay */}
              <circle
                cx={0}
                cy={-44}
                r={9}
                fill={P.red}
                stroke={P.ink}
                strokeWidth={1.8}
                opacity={0.5 + 0.5 * Math.sin(t * 10)}
              />
            </g>

            {/* ==================== ĐỒNG HỒ ĐO TUỔI THỌ GIỜ BAY KHUNG THÂN (AIRFRAME HOURS REDLINE CLOCK) ==================== */}
            <g filter="url(#sh)">
              {/* Vành hào quang cảnh báo đỏ khi chạm mốc 4,000-8,000 giờ */}
              <circle
                cx={gaugeCx}
                cy={gaugeCy}
                r={gaugeR + 24}
                fill="none"
                stroke={P.red}
                strokeWidth={14}
                opacity={0.22 * redAlert}
              />
              {/* Vỏ đồng hồ hợp kim 3 tông + 12 đinh tán */}
              <circle
                cx={gaugeCx}
                cy={gaugeCy}
                r={gaugeR + 16}
                fill={P.f15Dark}
                stroke={P.ink}
                strokeWidth={3.5}
              />
              <circle
                cx={gaugeCx}
                cy={gaugeCy}
                r={gaugeR + 4}
                fill={P.f15Mid}
                stroke={P.ink}
                strokeWidth={2}
              />
              {Array.from({ length: 12 }, (_, i) => {
                const [bx, by] = polarPt(gaugeCx, gaugeCy, gaugeR + 10, i * 30);
                return (
                  <circle
                    key={i}
                    cx={bx}
                    cy={by}
                    r={3.6}
                    fill={P.legLight}
                    stroke={P.ink}
                    strokeWidth={1.1}
                  />
                );
              })}

              {/* Mặt số tối sâu */}
              <circle
                cx={gaugeCx}
                cy={gaugeCy}
                r={gaugeR - 6}
                fill="#091525"
                stroke={P.ink}
                strokeWidth={2.5}
              />

              {/* 3 cung tuổi thọ: An toàn (0-4,000h) -> Lão hoá (4,000-6,000h) -> Vạch đỏ nguy hiểm (6,000-8,000h) */}
              <path
                d={sectorArc(gaugeCx, gaugeCy, gaugeR - 36, -210, -90)}
                fill="none"
                stroke={P.green}
                strokeWidth={22}
                opacity={0.82}
              />
              <path
                d={sectorArc(gaugeCx, gaugeCy, gaugeR - 36, -88, -32)}
                fill="none"
                stroke={P.amber}
                strokeWidth={22}
                opacity={0.9}
              />
              {/* Cung vạch đỏ 4,000–8,000h có lớp halo sáng rực */}
              <path
                d={sectorArc(gaugeCx, gaugeCy, gaugeR - 36, -30, 32)}
                fill="none"
                stroke={P.red}
                strokeWidth={34}
                opacity={0.28 + 0.25 * redAlert}
              />
              <path
                d={sectorArc(gaugeCx, gaugeCy, gaugeR - 36, -30, 32)}
                fill="none"
                stroke={P.red}
                strokeWidth={24}
              />

              {/* 25 vạch chia độ cơ khí quanh mặt đồng hồ */}
              {Array.from({ length: 25 }, (_, k) => {
                const ang = -210 + k * 10;
                const major = k % 3 === 0;
                const [p0x, p0y] = polarPt(gaugeCx, gaugeCy, gaugeR - (major ? 62 : 52), ang);
                const [p1x, p1y] = polarPt(gaugeCx, gaugeCy, gaugeR - 18, ang);
                const inRed = ang >= -30;
                return (
                  <line
                    key={k}
                    x1={p0x}
                    y1={p0y}
                    x2={p1x}
                    y2={p1y}
                    stroke={inRed ? P.amberHot : major ? P.ordWhite : P.muted}
                    strokeWidth={major ? 3.2 : 1.6}
                  />
                );
              })}

              {/* Chốt chặn kim ở cuối vạch đỏ (+30°) + tam giác cảnh báo mỏi khung thân */}
              {(() => {
                const [px, py] = polarPt(gaugeCx, gaugeCy, gaugeR - 36, 33);
                return (
                  <circle cx={px} cy={py} r={6.5} fill={P.amberHot} stroke={P.ink} strokeWidth={2} />
                );
              })()}
              <g transform={`translate(${gaugeCx} ${gaugeCy - 78})`}>
                <polygon
                  points="0,-24 22,14 -22,14"
                  fill={P.red}
                  stroke={P.amberHot}
                  strokeWidth={2.2}
                  opacity={0.45 + 0.55 * redAlert}
                />
                <rect x={-2.5} y={-11} width={5} height={13} rx={2} fill="#ffffff" />
                <circle cx={0} cy={7.5} r={2.8} fill="#ffffff" />
              </g>

              {/* Ô cửa sổ trống đếm cơ học (mechanical drum counter) dưới trục kim */}
              <rect
                x={gaugeCx - 72}
                y={gaugeCy + 58}
                width={144}
                height={40}
                rx={6}
                fill="#112238"
                stroke={P.red}
                strokeWidth={2}
              />
              {[-48, -24, 0, 24, 48].map((dx, i) => (
                <rect
                  key={i}
                  x={gaugeCx + dx - 10}
                  y={gaugeCy + 64}
                  width={20}
                  height={28}
                  rx={2}
                  fill={i >= 1 ? '#3a1420' : '#182e4a'}
                  stroke={P.ink}
                  strokeWidth={1.2}
                />
              ))}
              {/* Vạch mức đầy đỏ bên trong hộp số giờ bay */}
              <rect
                x={gaugeCx - 64}
                y={gaugeCy + 88}
                width={128 * needleProg}
                height={5}
                rx={2}
                fill={P.red}
              />

              {/* Kim đồng hồ cơ khí quay kịch vạch đỏ */}
              <g transform={`translate(${gaugeCx} ${gaugeCy}) rotate(${needleDeg})`}>
                <polygon
                  points="-38,-7 156,-2.5 166,0 156,2.5 -38,7"
                  fill={P.amberHot}
                  stroke={P.ink}
                  strokeWidth={2}
                />
                <polygon points="80,-2.5 166,0 80,2.5" fill={P.red} />
                <circle cx={-28} cy={0} r={11} fill={P.legMid} stroke={P.ink} strokeWidth={1.8} />
              </g>
              <circle cx={gaugeCx} cy={gaugeCy} r={18} fill={P.f15Light} stroke={P.ink} strokeWidth={2.4} />
              <circle cx={gaugeCx} cy={gaugeCy} r={7} fill={P.red} />
            </g>
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.42} />

      <Label
        t={t}
        text="4,000–8,000 HRS"
        x={1485}
        y={830}
        from={CUE.s06_hoursRedline}
        until={150.0}
        bg={P.red}
        fg="#ffffff"
        size={52}
      />
    </AbsoluteFill>
  );
};

export default S06;
