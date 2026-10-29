// S22 (397.00 – 419.10s, 2D):
// Pha 1 (397.0 – 407.4s): Biểu đồ năng lực sản xuất công nghiệp Mỹ 650 đạn PAC-3 MSE/năm trên BlueprintBg2D,
// tách làm 2 nhánh đối xứng @402.02s: 50% (325 quả) giữ khối đặc cho Quân đội Mỹ vs 50% (325 quả) chia lẻ cho 8 điểm đồng minh trên bán cầu.
// Pha 2 (407.5 – 419.1s): Cam2D đẩy sâu vào trong xe điều khiển hỏa lực phòng không, qua vai 2 bóng trắc thủ đứng bất động
// trước màn hình radar tròn lớn và thanh báo đạn nhấp nháy đỏ 00 / 16 khi >20 đầu đạn đỏ rực hội tụ nổ tung ở tâm bảo vệ.
import React from 'react';
import { Easing } from 'remotion';
import { FONT, lerp, prog } from '@kit/theme';
import { Label, handheld, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D } from '@lib/2d/fx';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { BlueprintBg2D, GlowLine2D, HumanOperator2D, PAC3_2D } from '../local/assets2d';

// 8 điểm đồng minh phân bố thoáng đãng trên bán cầu cách điệu (tâm bán cầu tại cx = 1485, cy = 762, R = 156; tổng = 325 quả)
const ALLY_NODES: readonly { x: number; y: number; quota: number; ctrlX: number; ctrlY: number }[] = [
  { x: 1358, y: 638, quota: 45, ctrlX: 1218, ctrlY: 642 },
  { x: 1486, y: 626, quota: 40, ctrlX: 1275, ctrlY: 604 },
  { x: 1612, y: 650, quota: 45, ctrlX: 1345, ctrlY: 616 },
  { x: 1336, y: 736, quota: 35, ctrlX: 1235, ctrlY: 734 },
  { x: 1478, y: 738, quota: 40, ctrlX: 1300, ctrlY: 726 },
  { x: 1622, y: 758, quota: 45, ctrlX: 1380, ctrlY: 748 },
  { x: 1382, y: 852, quota: 35, ctrlX: 1235, ctrlY: 850 },
  { x: 1548, y: 870, quota: 40, ctrlX: 1315, ctrlY: 892 },
];

// 35 mục tiêu đạn đạo đỏ hội tụ liên hoàn từ vành ngoài màn hình radar (cx = 960, cy = 1735, R = 282) suốt 408.5s -> 419.1s
type RadarThreat = {
  angDeg: number;
  hitTime: number;
  dur: number;
  endDx: number;
  endDy: number;
  blastSize: number;
};

const RADAR_THREATS: RadarThreat[] = Array.from({ length: 35 }, (_, i) => {
  // Trải góc tới bao vây dày đặc quanh khu vực bảo vệ trung tâm
  const angDeg = -165 + ((i * 43) % 250) + (i % 4) * 5;
  const hitTime = CUE.s22_breach_impacts + i * 0.31;
  const dur = 2.3 + (i % 4) * 0.18;
  const rHit = 8 + ((i * 19) % 56);
  const aHit = ((i * 83) % 360) * (Math.PI / 180);
  return {
    angDeg,
    hitTime,
    dur,
    endDx: Math.cos(aHit) * rHit,
    endDy: Math.sin(aHit) * rHit * 0.82,
    blastSize: 32 + (i % 3) * 9,
  };
});

/** Ngôi sao 5 cánh quân sự gọn sắc cho khối dự trữ Quân đội Mỹ (không dùng chữ dài). */
function starPoints(cx: number, cy: number, rOut: number, rIn: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
}

/** Bóng tối silhouette trắc thủ phòng không nhìn từ sau vai/lưng (dựa trên HumanOperator2D + tai nghe chiến thuật & viền ánh màn hình). */
const OperatorBackSilhouette: React.FC<{
  x: number;
  y: number;
  scale: number;
  side: 'left' | 'right';
  alertGlow: number;
}> = ({ x, y, scale, side, alertGlow }) => {
  const rimDir = side === 'left' ? 1 : -1;
  const rimColor = alertGlow > 0.35 ? PAL2D.red : PAL2D.cyan;
  return (
    <g>
      {/* Thân gốc HumanOperator2D phóng lớn nhìn từ sau lưng/vai */}
      <HumanOperator2D x={x} y={y} scale={scale} color="#060d17" />

      {/* Đắp bờ vai áo khoác quân phục & tai nghe chỉ huy tối thẫm để tạo khối tiền cảnh chân thực */}
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        {/* Cầu vai & lưng áo chiến thuật */}
        <path
          d="M-36 -75 C-36 -118, -28 -139, -15 -143 L15 -143 C28 -139, 36 -118, 36 -75 L38 0 L-38 0 Z"
          fill="#070f1b"
          stroke="#03070d"
          strokeWidth={1.5}
        />
        {/* Cổ áo & mũ/tóc sau gáy */}
        <rect x={-10} y={-149} width={20} height={10} rx={3} fill="#0a1524" />
        <circle cx={0} cy={-162} r={14.2} fill="#070f1b" />
        {/* Vòm chụp tai nghe phòng không (headset band + 2 earcups) */}
        <path
          d="M-15.5 -163 C-15.5 -179, 15.5 -179, 15.5 -163"
          fill="none"
          stroke="#15263b"
          strokeWidth={2.4}
        />
        <rect x={-18} y={-167} width={4.2} height={10.5} rx={2} fill="#162940" />
        <rect x={13.8} y={-167} width={4.2} height={10.5} rx={2} fill="#162940" />
        {/* Cần micro mảnh vươn nhẹ về phía màn hình */}
        <path
          d={`M${rimDir * 16} -160 Q${rimDir * 21} -156 ${rimDir * 17} -152`}
          fill="none"
          stroke="#264363"
          strokeWidth={1.3}
          strokeLinecap="round"
        />
        {/* Ánh sáng màn hình radar & chớp báo động đỏ hắt lên gờ vai trong và vành tai nghe */}
        <path
          d={
            side === 'left'
              ? 'M11 -174 C16 -170, 17 -158, 13 -151 M15 -143 C28 -139, 35 -118, 36 -76'
              : 'M-11 -174 C-16 -170, -17 -158, -13 -151 M-15 -143 C-28 -139, -35 -118, -36 -76'
          }
          fill="none"
          stroke={rimColor}
          strokeWidth={1.6}
          strokeLinecap="round"
          opacity={0.42 + 0.35 * alertGlow}
        />
      </g>
    </g>
  );
};

const S22: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- Tiến độ thời gian Pha 1 & Pha 2 ----------------
  // Pha 1 (397.0 – 407.4s): Thanh tổng 650 đã hiện sẵn 30% ở khung đầu 397.0s và đầy 100% lúc 399.5s
  const pProdFill = 0.28 + 0.72 * prog(t, 396.9, 399.45, Easing.out(Easing.cubic));
  const prodCount = Math.round(650 * pProdFill);

  // Tách 2 nhánh đối xứng 50% / 50% tại CUE.s22_split_allies (402.02s)
  const pSplit = prog(t, CUE.s22_split_allies, 403.55, Easing.out(Easing.cubic));
  const pAlliesFan = prog(t, CUE.s22_split_allies + 0.65, 405.1, Easing.out(Easing.cubic));

  // Pha 2 (406.85 – 419.1s): Cam2D đẩy mượt từ bàn vẽ công nghiệp (960, 540) vào cabin xe điều khiển hỏa lực (960, 1805)
  const pToConsole = prog(t, 406.85, 408.1, Easing.bezier(0.42, 0.0, 0.18, 1.0));
  const pConsoleCreep = prog(t, 408.1, 419.1, Easing.out(Easing.quad));

  const camX = 960;
  const camY = lerp(540, lerp(1805, 1775, pConsoleCreep), pToConsole);
  const camZoom = lerp(
    lerp(1.0, 1.03, prog(t, 397.0, 406.5)),
    lerp(1.02, 1.13, pConsoleCreep),
    pToConsole,
  );

  // Rung nhẹ màn hình & duy trì báo động đỏ xuyên suốt khi mưa đầu đạn đạn đạo dội trúng mục tiêu trên radar (408.5 – 419.1s)
  const impactWindow = prog(t, 408.35, 409.0);
  const baseShake = handheld(t, 1.8 + 3.0 * impactWindow, 's22_cam');

  // Nhịp nhấp nháy cảnh báo đỏ 00 / 16 trên console
  const redBlink = 0.55 + 0.45 * Math.sin(t * 9.5);
  const radarCX = 960;
  const radarCY = 1735;
  const radarR = 282;
  const sweepDeg = ((t - 397.0) * 108) % 360;

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: PAL2D.bgNight }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={baseShake} bg={PAL2D.bgNight}>
        <svg width={1920} height={2600} viewBox="0 0 1920 2600" style={{ overflow: 'visible' }}>
          <Defs2D />

          {/* Nền bản vẽ kỹ thuật trải liền mạch qua cả 2 pha để cú đẩy máy mượt tuyệt đối */}
          <BlueprintBg2D x={-700} y={-450} w={3320} h={3500} step={120} id="s22_bp" />

          {/* ==================================================================================== */}
          {/* PHA 1 (y = 0..1080): BIỂU ĐỒ SẢN LƯỢNG 650 ĐẠN PAC-3 / NĂM & PHÂN CHIA MỸ / ĐỒNG MINH */}
          {/* ==================================================================================== */}
          <g>
            {/* Khung giá dây chuyền sản xuất tổng năm (x = 270..1650, y = 215..420 — đặt thấp hơn y=190 để không đè Label y=140) */}
            <rect
              x={270}
              y={218}
              width={1380}
              height={202}
              rx={16}
              fill="#0c1f35"
              stroke={PAL2D.grid}
              strokeWidth={2.6}
              filter="url(#sh)"
            />
            <rect
              x={284}
              y={230}
              width={1352}
              height={178}
              rx={11}
              fill="none"
              stroke={PAL2D.gridFine}
              strokeWidth={1.4}
              strokeDasharray="10 8"
            />

            {/* Dãy 14 giá đạn PAC-3 MSE dựng đứng trong khung xuất xưởng */}
            {Array.from({ length: 14 }, (_, i) => {
              const mx = 345 + i * 82;
              const lit = (i + 1) / 14 <= pProdFill + 0.04;
              return (
                <g key={i} opacity={lit ? 1 : 0.25}>
                  <rect
                    x={mx - 22}
                    y={242}
                    width={44}
                    height={108}
                    rx={6}
                    fill={lit ? '#13314d' : '#0b1a2b'}
                    stroke={lit ? PAL2D.cyan : PAL2D.gridFine}
                    strokeWidth={1.6}
                  />
                  <PAC3_2D x={mx} y={296} scale={0.185} rot={-90} thicknessScale={1.45} />
                </g>
              );
            })}

            {/* Thanh công suất tổng 650 quả/năm + bộ đếm số gọn sắc bên phải */}
            <rect x={324} y={366} width={1145} height={28} rx={7} fill="#081524" stroke={PAL2D.grid} strokeWidth={1.8} />
            <rect
              x={328}
              y={370}
              width={Math.max(12, 1137 * pProdFill)}
              height={20}
              rx={5}
              fill={PAL2D.cyan}
              opacity={0.88}
            />
            <rect
              x={328}
              y={370}
              width={Math.max(12, 1137 * pProdFill)}
              height={8}
              rx={4}
              fill="#ffffff"
              opacity={0.35}
            />
            {/* Vạch chia giữa 50% trên thanh tổng khi bắt đầu tách nhánh */}
            {pSplit > 0.02 && (
              <line
                x1={328 + 1137 * 0.5}
                y1={358}
                x2={328 + 1137 * 0.5}
                y2={402}
                stroke={PAL2D.amberHot}
                strokeWidth={3.5}
                opacity={pSplit}
              />
            )}
            <text
              x={1555}
              y={390}
              textAnchor="middle"
              fill={PAL2D.paper}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={34}
            >
              {prodCount}
            </text>

            {/* Cổng chia lưu lượng trung tâm tại (960, 420) */}
            <circle cx={960} cy={424} r={14} fill={PAL2D.bgDeep} stroke={PAL2D.cyan} strokeWidth={3} />
            <circle cx={960} cy={424} r={6} fill={PAL2D.amberHot} />

            {/* Đường ống tách nhánh đối xứng Trái (50% = 325 giữ cho Quân đội Mỹ) & Phải (50% = 325 chia toàn cầu) */}
            <GlowLine2D
              d="M 960 424 L 960 458 L 525 458 L 525 505"
              color={PAL2D.green}
              width={7}
              opacity={0.2 + 0.8 * pSplit}
              {...drawOn(530, Math.max(0.08, pSplit))}
            />
            <GlowLine2D
              d="M 960 424 L 960 458 L 1395 458 L 1395 505"
              color={PAL2D.amber}
              width={7}
              opacity={0.2 + 0.8 * pSplit}
              {...drawOn(530, Math.max(0.08, pSplit))}
            />

            {/* ---------------- NHÁNH TRÁI: 50% (325 QUẢ) — KHỐI XANH ĐẶC GIỮ LẠI CHO QUÂN ĐỘI MỸ ---------------- */}
            <g opacity={0.22 + 0.78 * pSplit} transform={`translate(0 ${(1 - pSplit) * 18})`}>
              <rect
                x={185}
                y={505}
                width={680}
                height={435}
                rx={18}
                fill="#0d2629"
                stroke={PAL2D.green}
                strokeWidth={3.2}
                filter="url(#sh)"
              />
              {/* Dải đầu thẻ: Huy hiệu sao quân đội Mỹ + Con số đối xứng 50% · 325 */}
              <rect x={205} y={525} width={640} height={74} rx={10} fill="#133b35" stroke={PAL2D.green} strokeWidth={1.8} />
              <circle cx={255} cy={562} r={24} fill="#195244" stroke={PAL2D.green} strokeWidth={2.2} />
              <polygon points={starPoints(255, 562, 16, 6.8)} fill={PAL2D.paper} />

              {/* Thanh khối đặc 50% nguyên vẹn */}
              <rect x={300} y={544} width={355} height={36} rx={8} fill="#0a201d" stroke={PAL2D.green} strokeWidth={1.8} />
              <rect x={304} y={548} width={347 * pSplit} height={28} rx={6} fill={PAL2D.green} />
              <text
                x={752}
                y={574}
                textAnchor="middle"
                fill={PAL2D.paper}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={34}
              >
                50% · 325
              </text>

              {/* Khối kho đạn xanh đặc 2 tầng × 8 quả PAC-3 xếp kín vững chắc */}
              <rect x={215} y={620} width={620} height={295} rx={12} fill="#10302b" stroke="#286e59" strokeWidth={2} />
              {[0, 1].map((row) =>
                Array.from({ length: 8 }, (_, col) => {
                  const px = 266 + col * 74;
                  const py = 696 + row * 138;
                  return (
                    <g key={`us_${row}_${col}`}>
                      <rect
                        x={px - 26}
                        y={py - 56}
                        width={52}
                        height={112}
                        rx={7}
                        fill="#17473c"
                        stroke={PAL2D.green}
                        strokeWidth={1.8}
                      />
                      <PAC3_2D x={px} y={py} scale={0.185} rot={-90} thicknessScale={1.45} />
                    </g>
                  );
                }),
              )}
            </g>

            {/* ---------------- NHÁNH PHẢI: 50% (325 QUẢ) — CHIA LẺ TỎA ĐI 8 ĐỒNG MINH TRÊN BÁN CẦU ---------------- */}
            <g opacity={0.22 + 0.78 * pSplit} transform={`translate(0 ${(1 - pSplit) * 18})`}>
              <rect
                x={1055}
                y={505}
                width={680}
                height={435}
                rx={18}
                fill="#0e2036"
                stroke={PAL2D.amber}
                strokeWidth={3}
                filter="url(#sh)"
              />
              {/* Đầu thẻ nhánh phải: 50% · 325 bị cắt vụn thành 8 ô nhỏ */}
              <rect x={1075} y={525} width={640} height={64} rx={10} fill="#162a42" stroke={PAL2D.amber} strokeWidth={1.6} />
              {Array.from({ length: 8 }, (_, k) => (
                <rect
                  key={k}
                  x={1095 + k * 52}
                  y={543}
                  width={42}
                  height={28}
                  rx={5}
                  fill={PAL2D.amber}
                  opacity={0.35 + 0.55 * pAlliesFan}
                />
              ))}
              <text
                x={1612}
                y={569}
                textAnchor="middle"
                fill={PAL2D.amberHot}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={32}
              >
                50% · 325
              </text>

              {/* Bản đồ bán cầu cách điệu (vòng vĩ tuyến/kinh tuyến + mảng lục địa Âu - Á - Trung Đông cách điệu) */}
              <g>
                <circle
                  cx={1485}
                  cy={762}
                  r={156}
                  fill="#0a192b"
                  stroke={PAL2D.grid}
                  strokeWidth={2.2}
                />
                {/* Lưới kinh tuyến & vĩ tuyến bán cầu */}
                {[-90, -34, 34, 90].map((rx, idx) => (
                  <ellipse
                    key={`mer_${idx}`}
                    cx={1485}
                    cy={762}
                    rx={Math.abs(rx)}
                    ry={156}
                    fill="none"
                    stroke={PAL2D.gridFine}
                    strokeWidth={1.2}
                    strokeDasharray="5 5"
                  />
                ))}
                {[-78, 0, 78].map((dy, idx) => {
                  const chord = Math.sqrt(Math.max(0, 156 * 156 - dy * dy));
                  return (
                    <line
                      key={`lat_${idx}`}
                      x1={1485 - chord}
                      y1={762 + dy}
                      x2={1485 + chord}
                      y2={762 + dy}
                      stroke={PAL2D.gridFine}
                      strokeWidth={1.2}
                      strokeDasharray="5 5"
                    />
                  );
                })}
                {/* Bóng lục địa Á-Âu & vành đai đồng minh cách điệu */}
                <path
                  d="M1356 696 L1400 660 L1466 656 L1524 676 L1594 668 L1620 710 L1582 750 L1528 745 L1488 780 L1430 768 L1378 736 Z"
                  fill="#193856"
                  stroke={PAL2D.grid}
                  strokeWidth={1.4}
                  opacity={0.8}
                />
                <path
                  d="M1392 792 L1446 789 L1470 838 L1424 878 L1382 842 Z"
                  fill="#17324d"
                  stroke={PAL2D.grid}
                  strokeWidth={1.2}
                  opacity={0.72}
                />
                <path
                  d="M1554 784 L1608 778 L1624 826 L1582 862 L1548 828 Z"
                  fill="#17324d"
                  stroke={PAL2D.grid}
                  strokeWidth={1.2}
                  opacity={0.72}
                />
              </g>

              {/* Cổng phân phối phụ bên trái bán cầu (1145, 762) tách lẻ thành 8 tia mảnh tới 8 điểm đồng minh */}
              <GlowLine2D
                d="M 1145 589 L 1145 762"
                color={PAL2D.amber}
                width={3.5}
                opacity={0.25 + 0.75 * pAlliesFan}
                {...drawOn(180, pAlliesFan)}
              />
              <circle cx={1145} cy={762} r={11} fill={PAL2D.amber} stroke={PAL2D.stroke} strokeWidth={2} />
              {ALLY_NODES.map((nd, idx) => {
                const pRay = prog(
                  t,
                  CUE.s22_split_allies + 0.45 + idx * 0.12,
                  CUE.s22_split_allies + 1.55 + idx * 0.12,
                  Easing.out(Easing.cubic),
                );
                const dPath = `M 1145 762 Q ${nd.ctrlX} ${nd.ctrlY} ${nd.x} ${nd.y}`;
                return (
                  <g key={idx}>
                    <GlowLine2D
                      d={dPath}
                      color={PAL2D.amber}
                      core={PAL2D.amberHot}
                      width={2.2}
                      opacity={0.18 + 0.82 * pRay}
                      {...drawOn(520, pRay)}
                    />
                    {/* Điểm đồng minh: mỗi điểm chỉ nhận được một vạch nhỏ (35–45 quả) */}
                    <g transform={`translate(${nd.x} ${nd.y})`} opacity={0.25 + 0.75 * pRay}>
                      <rect
                        x={-33}
                        y={-21}
                        width={66}
                        height={42}
                        rx={7}
                        fill="#0b1828"
                        stroke={PAL2D.amber}
                        strokeWidth={1.8}
                      />
                      <PAC3_2D x={-16} y={0} scale={0.068} rot={-90} thicknessScale={1.7} />
                      {/* Thanh quota mỏng manh chỉ đầy ~12% */}
                      <rect x={-2} y={-11} width={27} height={6.5} rx={2} fill="#1b2b3d" />
                      <rect x={-2} y={-11} width={9} height={6.5} rx={2} fill={PAL2D.red} />
                      <text
                        x={12}
                        y={12}
                        textAnchor="middle"
                        fill={PAL2D.amberHot}
                        fontFamily={FONT}
                        fontWeight={700}
                        fontSize={15.5}
                      >
                        {nd.quota}
                      </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* Đường cáp dữ liệu dẫn thẳng xuống Cabin điều khiển hỏa lực cho cú đẩy máy sang Pha 2 */}
            <GlowLine2D
              d="M 960 945 L 960 1350"
              color={PAL2D.cyan}
              width={4}
              dash="12 10"
              opacity={0.45}
            />
          </g>

          {/* ==================================================================================== */}
          {/* PHA 2 (y = 1220..2420): BÊN TRONG XE ĐIỀU KHIỂN HỎA LỰC — TRẮC THỦ BẤT LỰC TRƯỚC 00/16 */}
          {/* ==================================================================================== */}
          <g>
            {/* Khung vỏ tối bên trong xe chỉ huy phòng không (ECS Shelter Bulkhead) */}
            <rect x={-240} y={1190} width={2400} height={1350} fill="#050b14" opacity={0.94} />
            {/* Sườn vòm trần xe chỉ huy & đèn cảnh báo đỏ hắt nhẹ trên trần */}
            <path
              d="M -120 1240 L 240 1320 L 1680 1320 L 2040 1240"
              fill="none"
              stroke="#14263b"
              strokeWidth={10}
            />
            <path
              d="M 60 1275 L 340 1345 L 1580 1345 L 1860 1275"
              fill="none"
              stroke="#0f1e30"
              strokeWidth={6}
            />
            {/* Hai cụm đèn báo động đỏ trên vách trần cabin */}
            {[460, 1460].map((lx) => (
              <g key={lx}>
                <ellipse cx={lx} cy={1330} rx={165} ry={46} fill={PAL2D.red} opacity={0.1 + 0.12 * redBlink * impactWindow} />
                <rect x={lx - 48} y={1316} width={96} height={16} rx={6} fill={PAL2D.redDeep} stroke={PAL2D.red} strokeWidth={2} />
                <rect x={lx - 38} y={1320} width={76} height={8} rx={4} fill={PAL2D.red} opacity={0.6 + 0.4 * redBlink} />
              </g>
            ))}

            {/* Tủ bảng điều khiển trung tâm (Engagement Control Console Housing) */}
            <rect
              x={345}
              y={1380}
              width={1230}
              height={735}
              rx={24}
              fill="#0e1c2d"
              stroke="#2a4868"
              strokeWidth={4}
              filter="url(#sh)"
            />
            <rect
              x={365}
              y={1400}
              width={1190}
              height={695}
              rx={16}
              fill="#091422"
              stroke="#1b334d"
              strokeWidth={2}
            />

            {/* ---------------- BẢNG PHỤ BÊN TRÁI: MA TRẬN GIÀN 4×4 RỖNG & BÁO ĐẠN ĐỎ 00 / 16 ---------------- */}
            <g transform="translate(392 1455)">
              <rect width={235} height={495} rx={12} fill="#07101c" stroke={PAL2D.red} strokeWidth={2.4} />
              {/* Khung số báo đạn nhấp nháy đỏ 00 / 16 */}
              <rect
                x={16}
                y={18}
                width={203}
                height={84}
                rx={8}
                fill="#1d0910"
                stroke={PAL2D.red}
                strokeWidth={2.4}
                opacity={0.75 + 0.25 * redBlink}
              />
              <text
                x={117}
                y={74}
                textAnchor="middle"
                fill={PAL2D.red}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={44}
                opacity={0.65 + 0.35 * redBlink}
              >
                00 / 16
              </text>

              {/* 16 ô ống phóng trên màn hình trạng thái đều tối đen viền đỏ rỗng không */}
              <g transform="translate(25 126)">
                {Array.from({ length: 16 }, (_, idx) => {
                  const r = Math.floor(idx / 4);
                  const c = idx % 4;
                  const cx = c * 48;
                  const cy = r * 48;
                  return (
                    <g key={idx}>
                      <rect
                        x={cx}
                        y={cy}
                        width={39}
                        height={39}
                        rx={6}
                        fill="#14090e"
                        stroke={PAL2D.red}
                        strokeWidth={2}
                        opacity={0.55 + 0.35 * redBlink}
                      />
                      <line x1={cx + 9} y1={cy + 9} x2={cx + 30} y2={cy + 30} stroke={PAL2D.red} strokeWidth={1.8} opacity={0.65} />
                      <line x1={cx + 30} y1={cy + 9} x2={cx + 9} y2={cy + 30} stroke={PAL2D.red} strokeWidth={1.8} opacity={0.65} />
                    </g>
                  );
                })}
              </g>

              {/* 4 cột thanh cơ số đạn cạn đáy 0% nhấp nháy đỏ */}
              <g transform="translate(24 345)">
                {[0, 1, 2, 3].map((k) => (
                  <g key={k} transform={`translate(${k * 48} 0)`}>
                    <rect width={36} height={118} rx={5} fill="#111924" stroke="#2c3e52" strokeWidth={1.6} />
                    <rect
                      x={4}
                      y={104}
                      width={28}
                      height={10}
                      rx={2}
                      fill={PAL2D.red}
                      opacity={0.45 + 0.55 * redBlink}
                    />
                  </g>
                ))}
              </g>
            </g>

            {/* ---------------- BẢNG PHỤ BÊN PHẢI: 4 BỆ PHÓNG KHẨU ĐỘI ĐỀU CẠN SẠCH 00 / 16 ---------------- */}
            <g transform="translate(1293 1455)">
              <rect width={235} height={495} rx={12} fill="#07101c" stroke={PAL2D.red} strokeWidth={2.4} />
              {[0, 1, 2, 3].map((bIdx) => (
                <g key={bIdx} transform={`translate(16 ${20 + bIdx * 116})`}>
                  <rect
                    width={203}
                    height={98}
                    rx={8}
                    fill="#140a10"
                    stroke={PAL2D.redDeep}
                    strokeWidth={2}
                  />
                  {/* Ký hiệu bệ phóng nhỏ + số 00 / 16 đỏ */}
                  <circle
                    cx={26}
                    cy={32}
                    r={9}
                    fill={PAL2D.red}
                    opacity={0.45 + 0.55 * redBlink}
                  />
                  <text
                    x={122}
                    y={42}
                    textAnchor="middle"
                    fill={PAL2D.red}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={30}
                    opacity={0.65 + 0.35 * redBlink}
                  >
                    00 / 16
                  </text>
                  {/* Thanh báo đạn ngang rỗng không */}
                  <rect x={16} y={62} width={171} height={18} rx={4} fill="#0b121c" stroke={PAL2D.red} strokeWidth={1.5} />
                  <rect x={19} y={65} width={10} height={12} rx={2} fill={PAL2D.red} opacity={0.5 + 0.5 * redBlink} />
                </g>
              ))}
            </g>

            {/* ---------------- CHÍNH GIỮA: MÀN HÌNH RADAR TRÒN LỚN PHÁT SÁNG XANH LỤC / XANH ĐÁ ---------------- */}
            <g>
              <defs>
                <radialGradient id="s22_radar_bg" cx="50%" cy="50%" r="52%">
                  <stop offset="0%" stopColor="#0f3334" />
                  <stop offset="68%" stopColor="#082024" />
                  <stop offset="100%" stopColor="#041216" />
                </radialGradient>
                <clipPath id="s22_radar_clip">
                  <circle cx={radarCX} cy={radarCY} r={radarR - 3} />
                </clipPath>
              </defs>

              {/* Vành bezel thép quanh màn hình radar tròn */}
              <circle cx={radarCX} cy={radarCY} r={radarR + 18} fill="#14263a" stroke="#355a7d" strokeWidth={4} />
              <circle cx={radarCX} cy={radarCY} r={radarR} fill="url(#s22_radar_bg)" stroke={PAL2D.cyan} strokeWidth={3.2} />

              <g clipPath="url(#s22_radar_clip)">
                {/* Vòng cự ly đồng tâm & trục chữ thập */}
                {[70, 140, 210, 276].map((rr) => (
                  <circle
                    key={rr}
                    cx={radarCX}
                    cy={radarCY}
                    r={rr}
                    fill="none"
                    stroke="#247a73"
                    strokeWidth={rr === 140 ? 1.8 : 1.2}
                    strokeDasharray={rr === 210 ? '7 7' : undefined}
                    opacity={0.65}
                  />
                ))}
                <line x1={radarCX - radarR} y1={radarCY} x2={radarCX + radarR} y2={radarCY} stroke="#247a73" strokeWidth={1.3} opacity={0.6} />
                <line x1={radarCX} y1={radarCY - radarR} x2={radarCX} y2={radarCY + radarR} stroke="#247a73" strokeWidth={1.3} opacity={0.6} />
                {[30, 60, 120, 150].map((ang) => {
                  const rad = (ang * Math.PI) / 180;
                  return (
                    <line
                      key={ang}
                      x1={radarCX - Math.cos(rad) * radarR}
                      y1={radarCY - Math.sin(rad) * radarR}
                      x2={radarCX + Math.cos(rad) * radarR}
                      y2={radarCY + Math.sin(rad) * radarR}
                      stroke="#1d615c"
                      strokeWidth={1}
                      opacity={0.38}
                    />
                  );
                })}

                {/* Khu vực mục tiêu bảo vệ ở tâm màn hình radar (đa giác khu phòng thủ) */}
                <polygon
                  points={`${radarCX},${radarCY - 58} ${radarCX + 54},${radarCY - 24} ${radarCX + 46},${radarCY + 44} ${radarCX - 46},${radarCY + 44} ${radarCX - 54},${radarCY - 24}`}
                  fill={impactWindow > 0.1 ? 'rgba(255, 77, 77, 0.18)' : 'rgba(44, 230, 208, 0.10)'}
                  stroke={impactWindow > 0.1 ? PAL2D.red : PAL2D.cyan}
                  strokeWidth={2.2}
                  strokeDasharray="6 4"
                />
                <circle cx={radarCX} cy={radarCY} r={8} fill="none" stroke={PAL2D.cyan} strokeWidth={2} />

                {/* Quạt quét phosphor xanh lục xoay tròn trên mặt radar */}
                <g transform={`translate(${radarCX} ${radarCY}) rotate(${sweepDeg})`}>
                  <path
                    d={`M 0 0 L ${radarR} 0 A ${radarR} ${radarR} 0 0 0 ${radarR * 0.84} ${-radarR * 0.54} Z`}
                    fill="#2ce6b8"
                    opacity={0.14}
                  />
                  <line x1={0} y1={0} x2={radarR} y2={0} stroke="#5affd5" strokeWidth={2.4} opacity={0.85} />
                </g>

                {/* HƠN 20 VỆT MỤC TIÊU ĐẠN ĐẠO ĐỎ RỰC HỘI TỤ VÀO TÂM & LIÊN TIẾP CHỚP NỔ ĐỎ (408.5s -> 416.8s) */}
                {RADAR_THREATS.map((th, idx) => {
                  const rad = (th.angDeg * Math.PI) / 180;
                  const sx = radarCX + Math.cos(rad) * (radarR - 6);
                  const sy = radarCY + Math.sin(rad) * (radarR - 6);
                  const ex = radarCX + th.endDx;
                  const ey = radarCY + th.endDy;

                  const tAppear = th.hitTime - th.dur;
                  const u = (t - tAppear) / th.dur;
                  const dtHit = t - th.hitTime;

                  return (
                    <g key={idx}>
                      {/* Vệt đường bay đỏ rực hội tụ vào tâm */}
                      {u > 0 && dtHit < 1.6 && (
                        <>
                          <line
                            x1={sx}
                            y1={sy}
                            x2={lerp(sx, ex, Math.min(1, u))}
                            y2={lerp(sy, ey, Math.min(1, u))}
                            stroke={PAL2D.red}
                            strokeWidth={2.2}
                            strokeDasharray="6 5"
                            opacity={dtHit > 0 ? Math.max(0, 0.75 * (1 - dtHit / 1.6)) : 0.78}
                          />
                          {u <= 1 && (
                            <g
                              transform={`translate(${lerp(sx, ex, u)} ${lerp(sy, ey, u)}) rotate(${
                                (Math.atan2(ey - sy, ex - sx) * 180) / Math.PI
                              })`}
                            >
                              {/* Ký hiệu thoi/mũi tên mục tiêu đạn đạo tốc độ cao trên màn radar */}
                              <circle r={11} fill={PAL2D.red} opacity={0.26} />
                              <polygon points="10,0 -7,-6 -4,0 -7,6" fill="#ff6b6b" stroke="#fff0f0" strokeWidth={1.2} />
                            </g>
                          )}
                        </>
                      )}

                      {/* Vòng sóng xung kích đỏ, vụ chớp nổ va chạm & sẹo điểm nổ đỏ lưu lại tại tâm khu vực bảo vệ */}
                      {dtHit >= 0 && (
                        <g>
                          {dtHit < 1.4 && (
                            <circle
                              cx={ex}
                              cy={ey}
                              r={8 + (dtHit / 1.4) * 52}
                              fill="none"
                              stroke={PAL2D.red}
                              strokeWidth={2.6 * (1 - dtHit / 1.4)}
                              opacity={1 - dtHit / 1.4}
                            />
                          )}
                          <circle
                            cx={ex}
                            cy={ey}
                            r={5.5}
                            fill={PAL2D.red}
                            opacity={Math.max(0.38, 1 - dtHit * 0.14)}
                          />
                          {dtHit < 3.4 && (
                            <Blast2D
                              t={t}
                              at={th.hitTime}
                              x={ex}
                              y={ey}
                              size={th.blastSize}
                              air
                              life={1.7}
                              seed={2200 + idx}
                              smoke="#7a242c"
                            />
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Bàn phím cơ khí & dải nút điều khiển bên dưới màn hình radar (tất cả nút phóng đều tắt đỏ) */}
              <rect x={655} y={2042} width={610} height={44} rx={8} fill="#0c1826" stroke="#243d59" strokeWidth={2} />
              {Array.from({ length: 10 }, (_, k) => (
                <rect
                  key={k}
                  x={678 + k * 58}
                  y={2053}
                  width={40}
                  height={22}
                  rx={4}
                  fill={k >= 4 && k <= 5 ? PAL2D.redDeep : '#16283d'}
                  stroke={k >= 4 && k <= 5 ? PAL2D.red : '#2d4b6b'}
                  strokeWidth={1.5}
                />
              ))}
            </g>

            {/* ---------------- TIỀN CẢNH HAI BÊN: BÓNG SILHOUETTE 2 TRẮC THỦ ĐỨNG BẤT ĐỘNG ---------------- */}
            <OperatorBackSilhouette
              x={215}
              y={2465}
              scale={4.25}
              side="left"
              alertGlow={impactWindow * redBlink}
            />
            <OperatorBackSilhouette
              x={1705}
              y={2480}
              scale={4.35}
              side="right"
              alertGlow={impactWindow * redBlink}
            />
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* Nhãn duy nhất của cảnh S22 */}
      <Label
        t={t}
        text="650 QUẢ / NĂM"
        x={960}
        y={140}
        from={CUE.s22_prod_650}
        until={403.5}
      />
    </div>
  );
};

export default S22;
