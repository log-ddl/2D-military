import React from 'react';
import { Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { handheld, Label, Layer, useSpring, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn, smoothPath, type Pt } from '@lib/2d/path';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { BlueprintBg2D, GlowLine2D, Kinzhal2D, X51_2D } from '../local/assets2d';

// ---------------- Khung góc ngắm kỹ thuật dùng chung cho các ô bản vẽ ----------------
const BlueprintPanelFrame: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  accent?: string;
  opacity?: number;
}> = ({ x, y, w, h, accent = PAL2D.grid, opacity = 1 }) => {
  const c = 26;
  return (
    <g opacity={opacity}>
      <rect x={x} y={y} width={w} height={h} rx={10} fill="#0a1a2c" fillOpacity={0.72} stroke={accent} strokeWidth={2.2} />
      {/* 4 góc chữ L chuẩn bản vẽ kỹ thuật */}
      <path
        d={`M${x} ${y + c} L${x} ${y} L${x + c} ${y}
            M${x + w - c} ${y} L${x + w} ${y} L${x + w} ${y + c}
            M${x + w} ${y + h - c} L${x + w} ${y + h} L${x + w - c} ${y + h}
            M${x + c} ${y + h} L${x} ${y + h} L${x} ${y + h - c}`}
        fill="none"
        stroke={accent}
        strokeWidth={4.5}
        strokeLinecap="round"
      />
    </g>
  );
};

// ---------------- Đường bay lượn cơ động chữ S đổi hướng liên tục trong tầng khí quyển của X-51 ----------------
const SCURVE_PTS: Pt[] = [
  [1315, 955],
  [1455, 835],
  [1600, 995],
  [1750, 815],
  [1895, 965],
  [2025, 845],
];

const SCURVE_PATH = smoothPath(SCURVE_PTS, false, 0.45);

// Đường đạn đạo quán tính đơn điệu (nét đứt xám mờ để đối chiếu trực quan với quỹ đạo chữ S của X-51)
const BALLISTIC_REF_PTS: Pt[] = [
  [1315, 1020],
  [1505, 750],
  [1685, 695],
  [1865, 780],
  [2035, 1030],
];
const BALLISTIC_REF_PATH = smoothPath(BALLISTIC_REF_PTS, false, 0.45);

const samplePointList = (pts: Pt[], p: number): { x: number; y: number; rot: number } => {
  const N = 80;
  // Nội suy mượt trên polyline mịn dọc theo danh sách điểm điều khiển
  const u = Math.max(0, Math.min(1, p)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(u));
  const f = u - i;
  // Cubic Hermite / Catmull-Rom xấp xỉ mượt cho vị trí & góc tiếp tuyến
  const p0 = pts[Math.max(0, i - 1)];
  const p1 = pts[i];
  const p2 = pts[i + 1];
  const p3 = pts[Math.min(pts.length - 1, i + 2)];

  const evalCR = (s: number): Pt => {
    const s2 = s * s;
    const s3 = s2 * s;
    const x =
      0.5 *
      (2 * p1[0] +
        (-p0[0] + p2[0]) * s +
        (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * s2 +
        (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * s3);
    const y =
      0.5 *
      (2 * p1[1] +
        (-p0[1] + p2[1]) * s +
        (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * s2 +
        (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * s3);
    return [x, y];
  };

  const [x, y] = evalCR(f);
  const df = 1 / N;
  const [xa, ya] = evalCR(Math.max(0, f - df));
  const [xb, yb] = evalCR(Math.min(1, f + df));
  const rot = (Math.atan2(yb - ya, xb - xa) * 180) / Math.PI;
  return { x, y, rot };
};

// ---------------- Các đường dòng khí siêu âm đi vào mũi nêm nén sóng xung kích qua buồng đốt Scramjet ----------------
// Lưu ý: X51_2D đặt tại (660, 935) scale = 1.15 có mũi nêm hướng +X tại ~(1097, 940),
// họng nạp Scramjet dưới bụng tại ~(804, 968), buồng đốt tại ~(365..625, 968), loa phụt đuôi tại ~(235, 945).
// Do phương tiện bay hướng +X nên dòng khí siêu âm chảy từ PHẢI (+X) sang TRÁI (-X) đâm vào mũi nêm!
const AIRFLOW_STREAMS = [
  // Dòng khí nén thẳng vào mặt dưới mũi nêm -> khúc xạ qua sóng xung kích xiên -> chui qua họng & buồng đốt Scramjet
  'M 1215 956 L 1055 956 L 815 966 L 620 968 L 365 968 L 125 962',
  'M 1215 978 L 965 978 L 795 972 L 620 972 L 365 972 L 125 975',
  'M 1215 1000 L 875 1000 L 775 977 L 620 976 L 365 976 L 125 988',
  // Dòng khí trượt mượt qua lưng khí động Waverider phía trên
  'M 1215 916 L 1085 916 L 910 898 L 705 888 L 220 890 L 125 892',
  'M 1215 890 L 1030 890 L 875 876 L 680 868 L 220 870 L 125 872',
] as const;

const S08: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Rung chấn dứt khoát lúc đóng dấu gạch chéo đỏ ✕ lên Kinzhal tại CUE.s08_not_kinzhal (125.78s)
  const rejectImpact = Math.max(0, 1 - Math.abs(t - (CUE.s08_not_kinzhal + 0.08)) / 0.28);
  const baseShake = handheld(t, 1.8 + rejectImpact * 10, 's08_bp');

  // ---------------- 3 giai đoạn Camera 2D ----------------
  // GĐ 1 (109.25–115.4s): Cận khung chiếu bóng Kinzhal2D + vòng ngắm dấu hỏi ?
  // GĐ 2 (115.5–121.2s): Trượt mượt xuống bản vẽ giải phẫu khí động Scramjet của X-51 Waverider (tách hẳn khỏi Ô 1)
  // GĐ 3 (121.28–127.3s): Mở rộng sang phải lộ đồ thị đường bay lượn chữ S & đóng dấu ✕ bác bỏ Kinzhal
  const pToX51 = prog(t, 115.25, 117.35);
  const pToFull = prog(t, 121.05, 122.85);

  const camX = lerp(lerp(960, 660, pToX51), 1095, pToFull);
  const camY = lerp(lerp(255, 935, pToX51), 638, pToFull);
  const zoom = lerp(lerp(1.16, 1.15, pToX51), 0.74, pToFull);

  // Giai đoạn 1: Vòng ngắm dấu hỏi ? lớn rung nhẹ trên bóng Kinzhal2D
  const qSpring = useSpring(t, CUE.s08_kinzhal_myth, 9, 170);
  const qFadeWhenRejected = 1 - prog(t, CUE.s08_not_kinzhal - 0.1, CUE.s08_not_kinzhal + 0.15);
  const qWobble = Math.sin(t * 11.5) * 6 * (0.45 + 0.55 * Math.max(0, 1 - (t - CUE.s08_kinzhal_myth) / 4.5));

  // Giai đoạn 2: Luồng khí siêu âm & ngọn lửa buồng đốt Scramjet
  const x51PanelOp = prog(t, 115.1, 116.5);
  const airflowOp = prog(t, 116.2, 117.8);
  const scramjetPower = 0.18 + 0.82 * prog(t, 118.6, CUE.s08_scramjet + 0.6);
  const flowDashOffset = t * 290; // Chảy nhanh từ phải (+X) sang trái (-X) xuyên qua họng Scramjet

  // Giai đoạn 3: Đồ thị đường bay lượn cơ động chữ S & dấu ✕ gạch chéo đỏ lên Kinzhal
  const graphOp = prog(t, CUE.s08_maneuver - 0.2, CUE.s08_maneuver + 0.9);
  const maneuverProg = prog(t, CUE.s08_maneuver + 0.25, 125.2, Easing.inOut(Easing.sin));
  const gliderSample = samplePointList(SCURVE_PTS, maneuverProg);

  const crossSlash1 = prog(t, CUE.s08_not_kinzhal, CUE.s08_not_kinzhal + 0.16, Easing.out(Easing.cubic));
  const crossSlash2 = prog(t, CUE.s08_not_kinzhal + 0.13, CUE.s08_not_kinzhal + 0.3, Easing.out(Easing.cubic));
  const isRejected = t >= CUE.s08_not_kinzhal;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Cam2D x={camX} y={camY} zoom={zoom} shake={baseShake} bg={PAL2D.bgDeep}>
        <Layer>
          <Defs2D />

          {/* Nền bàn vẽ kỹ thuật xanh đá (bố cục kỹ thuật khác biệt hoàn toàn với mặt cắt địa hình của S07) */}
          <BlueprintBg2D x={-550} y={-450} w={3300} h={2200} step={120} id="s08_bp" />

          {/* ==================== Ô 1 (PHÍA TRÊN): KHUNG PHÂN TÍCH CHIẾU BÓNG KINZHAL ==================== */}
          <g>
            <BlueprintPanelFrame
              x={340}
              y={58}
              w={1240}
              h={392}
              accent={isRejected ? PAL2D.red : PAL2D.grid}
            />

            {/* Đường trục chuẩn & đường gióng kích thước biên dạng côn-trụ cổ điển */}
            <line x1={390} y1={255} x2={1530} y2={255} stroke={PAL2D.grid} strokeWidth={1.5} strokeDasharray="16 8 4 8" opacity={0.55} />
            <line x1={600} y1={145} x2={600} y2={365} stroke={PAL2D.gridFine} strokeWidth={1.4} opacity={0.6} />
            <line x1={1300} y1={145} x2={1300} y2={365} stroke={PAL2D.gridFine} strokeWidth={1.4} opacity={0.6} />
            <line x1={600} y1={352} x2={1300} y2={352} stroke={PAL2D.muted} strokeWidth={1.6} opacity={0.5} />

            {/* Hình chiếu bóng phân tích của Kinzhal2D */}
            <g opacity={isRejected ? 0.42 : 0.92} filter="url(#sh)">
              <Kinzhal2D x={950} y={255} scale={0.95} flame={0} heatGlow={0} />
            </g>

            {/* Vòng ngắm phân tích + Dấu hỏi ? lớn rung nhẹ (Giai đoạn 1) */}
            {qSpring > 0.01 && qFadeWhenRejected > 0.01 && (
              <g
                transform={`translate(960 252) scale(${qSpring}) rotate(${qWobble})`}
                opacity={Math.min(1, qSpring * 1.6) * qFadeWhenRejected}
              >
                <circle r={126} fill="#0c1d30" fillOpacity={0.55} stroke={PAL2D.amber} strokeWidth={3.5} />
                <circle
                  r={144}
                  fill="none"
                  stroke={PAL2D.amberHot}
                  strokeWidth={2.2}
                  strokeDasharray="22 14"
                  transform={`rotate(${t * 24})`}
                />
                {/* 4 vạch thước ngắm chữ thập */}
                {[0, 90, 180, 270].map((deg) => (
                  <line
                    key={deg}
                    x1={112}
                    y1={0}
                    x2={156}
                    y2={0}
                    stroke={PAL2D.amberHot}
                    strokeWidth={3.2}
                    transform={`rotate(${deg})`}
                  />
                ))}
                {/* Vector dấu hỏi ? lớn sắc nét (không phụ thuộc font hệ thống) */}
                <g filter="url(#shHard)">
                  <path
                    d="M -32 -38 C -32 -68, -6 -82, 18 -78 C 42 -74, 54 -52, 46 -30 C 39 -12, 14 -6, 6 12 L 4 24"
                    fill="none"
                    stroke={PAL2D.amberHot}
                    strokeWidth={16}
                    strokeLinecap="round"
                  />
                  <circle cx={3} cy={56} r={10.5} fill={PAL2D.amberHot} />
                </g>
              </g>
            )}

            {/* Đóng dấu gạch chéo đỏ ✕ dứt khoát lên ô Kinzhal2D tại CUE.s08_not_kinzhal (125.78s) */}
            {crossSlash1 > 0.01 && (
              <g>
                <rect
                  x={344}
                  y={62}
                  width={1232}
                  height={384}
                  rx={8}
                  fill={PAL2D.red}
                  opacity={0.11 * crossSlash1}
                />
                <GlowLine2D
                  d={`M 455 102 L ${lerp(455, 1465, crossSlash1).toFixed(1)} ${lerp(102, 406, crossSlash1).toFixed(1)}`}
                  color={PAL2D.red}
                  core="#ffd6d6"
                  width={13}
                />
                {crossSlash2 > 0.01 && (
                  <GlowLine2D
                    d={`M 1465 102 L ${lerp(1465, 455, crossSlash2).toFixed(1)} ${lerp(102, 406, crossSlash2).toFixed(1)}`}
                    color={PAL2D.red}
                    core="#ffd6d6"
                    width={13}
                  />
                )}
              </g>
            )}
          </g>

          {/* ==================== Ô 2 (DƯỚI TRÁI): GIẢI PHẪU KHÍ ĐỘNG HỌC & SCRAMJET X-51 WAVERIDER ==================== */}
          {x51PanelOp > 0.01 && (
            <g opacity={x51PanelOp}>
              <BlueprintPanelFrame x={90} y={635} w={1135} h={575} accent={PAL2D.cyan} />

              {/* Các đường sóng xung kích nén khí ở mũi nêm (Oblique Shock Wave Fan) */}
              {airflowOp > 0.01 && (
                <g opacity={airflowOp}>
                  <polygon
                    points="1097,940 810,968 755,1075 1125,1075"
                    fill={PAL2D.cyan}
                    opacity={0.1}
                  />
                  <line x1={1097} y1={940} x2={745} y2={1075} stroke={PAL2D.cyan} strokeWidth={3.2} strokeDasharray="10 7" opacity={0.9} />
                  <line x1={1097} y1={940} x2={785} y2={1032} stroke={PAL2D.cyanSoft} strokeWidth={2.2} strokeDasharray="6 6" opacity={0.7} />
                  {/* Vân sóng phản xạ nén khí siêu âm ngay cửa nạp Scramjet */}
                  <polyline
                    points="965,946 925,976 885,948 845,976 808,952"
                    fill="none"
                    stroke={PAL2D.cyan}
                    strokeWidth={2.2}
                    opacity={0.75}
                  />

                  {/* Các đường dòng khí siêu âm màu cyan đi vào mũi nêm qua họng nén Scramjet dưới bụng */}
                  {AIRFLOW_STREAMS.map((d, idx) => (
                    <g key={`af_${idx}`}>
                      <path d={d} fill="none" stroke={PAL2D.cyanSoft} strokeWidth={2.2} opacity={0.3} />
                      <path
                        d={d}
                        fill="none"
                        stroke={idx < 3 ? PAL2D.cyan : PAL2D.cyanSoft}
                        strokeWidth={idx < 3 ? 3.8 : 2.6}
                        strokeLinecap="round"
                        strokeDasharray="34 22"
                        strokeDashoffset={flowDashOffset + idx * 14}
                        opacity={0.95}
                      />
                    </g>
                  ))}

                  {/* Mũi tên chỉ chiều luồng khí siêu âm đầu vào (+X -> -X) */}
                  {[916, 956, 1000].map((ay) => (
                    <polygon
                      key={ay}
                      points={`1165,${ay} 1188,${ay - 8} 1188,${ay + 8}`}
                      fill={PAL2D.cyan}
                      opacity={0.92}
                    />
                  ))}
                </g>
              )}

              {/* Chủ thể chính: Boeing X-51A Waverider với mặt cắt luồng khí & lửa buồng đốt Scramjet */}
              <g filter="url(#sh)">
                <X51_2D
                  x={660}
                  y={935}
                  scale={1.15}
                  showAirflow={t >= 116.2}
                  scramjetFlame={scramjetPower}
                />
              </g>

              {/* Vòng soi phóng đại kỹ thuật nhấn mạnh buồng đốt phản lực tĩnh siêu âm Scramjet dưới bụng */}
              {t >= CUE.s08_scramjet - 0.5 && (
                <g opacity={prog(t, CUE.s08_scramjet - 0.5, CUE.s08_scramjet + 0.3)}>
                  <rect
                    x={355}
                    y={942}
                    width={460}
                    height={56}
                    rx={12}
                    fill="none"
                    stroke={PAL2D.amberHot}
                    strokeWidth={2.8}
                    strokeDasharray="12 8"
                  />
                  {/* Sóng áp suất đốt cháy siêu âm bên trong buồng đốt không có tuabin */}
                  {[395, 445, 495, 545, 595].map((cx, i) => (
                    <polygon
                      key={cx}
                      points={`${cx + 12},959 ${cx - 6},970 ${cx + 12},981`}
                      fill={PAL2D.amberHot}
                      opacity={0.55 + 0.4 * Math.sin(t * 14 + i)}
                    />
                  ))}
                </g>
              )}
            </g>
          )}

          {/* ==================== Ô 3 (BÊN PHẢI): ĐỒ THỊ ĐƯỜNG BAY LƯỢN CƠ ĐỘNG CHỮ S TRONG KHÍ QUYỂN ==================== */}
          {graphOp > 0.01 && (
            <g opacity={graphOp}>
              <BlueprintPanelFrame x={1265} y={635} w={875} h={575} accent={PAL2D.cyanSoft} />

              {/* Các dải tầng khí quyển ngang trong khung đồ thị */}
              <rect x={1285} y={660} width={835} height={155} fill="#102944" opacity={0.45} />
              <rect x={1285} y={815} width={835} height={195} fill="#173a5e" opacity={0.45} />
              <rect x={1285} y={1010} width={835} height={175} fill="#1f4c78" opacity={0.38} />
              {[815, 1010].map((ly) => (
                <line
                  key={ly}
                  x1={1285}
                  y1={ly}
                  x2={2120}
                  y2={ly}
                  stroke={PAL2D.grid}
                  strokeWidth={1.6}
                  strokeDasharray="10 8"
                  opacity={0.55}
                />
              ))}

              {/* Đường parabol đạn đạo truyền thống (mờ, dễ đoán) để đối chiếu */}
              <path
                d={BALLISTIC_REF_PATH}
                fill="none"
                stroke={PAL2D.muted}
                strokeWidth={2.6}
                strokeDasharray="10 10"
                opacity={0.42}
              />

              {/* Quỹ đạo lượn cơ động chữ S đổi hướng liên tục của X-51 (GlowLine2D xanh ngọc) */}
              <GlowLine2D
                d={SCURVE_PATH}
                color={PAL2D.cyan}
                core="#e8ffff"
                width={5.5}
                {...drawOn(1250, maneuverProg)}
              />

              {/* Các điểm nút bẻ lái cơ động khí động học dọc đường chữ S */}
              {SCURVE_PTS.slice(1, -1).map(([px, py], idx) => {
                const nodeP = (idx + 1) / (SCURVE_PTS.length - 1);
                if (maneuverProg < nodeP) return null;
                return (
                  <g key={`node_${idx}`}>
                    <circle cx={px} cy={py} r={14} fill="none" stroke={PAL2D.cyan} strokeWidth={2} opacity={0.7} />
                    <circle cx={px} cy={py} r={5} fill="#ffffff" />
                  </g>
                );
              })}

              {/* Mô hình X-51 thu nhỏ đang lượn dọc theo đầu mũi quỹ đạo chữ S */}
              {maneuverProg > 0.02 && (
                <X51_2D
                  x={gliderSample.x}
                  y={gliderSample.y}
                  scale={0.23}
                  rot={gliderSample.rot}
                  scramjetFlame={0.95}
                />
              )}
            </g>
          )}
        </Layer>
      </Cam2D>

      <Grain opacity={0.38} />

      <Label t={t} text="X-51 WAVERIDER" x={960} y={140} from={CUE.s08_x51_reveal} until={122.5} />
    </div>
  );
};

export default S08;
