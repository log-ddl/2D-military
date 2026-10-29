import React from 'react';
import { Easing } from 'remotion';
import { handheld, useT } from '@kit/motion';
import { bump, deg, lerp, prog } from '@kit/theme';
import { Blast2D } from '@lib/2d/fx';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { CUE } from '../cues';
import { GlowLine2D, Kinzhal2D, PAC2_2D, PAC3_2D, TopoMapBg2D } from '../local/assets2d';
import { PAL2D } from '../local/palette';

/** Tạo chuỗi path SVG cho hình quạt mảnh văng (tâm cx, cy, bán kính trong r0 -> ngoài r1, từ góc a0Deg tới a1Deg). */
function sectorPath(cx: number, cy: number, r0: number, r1: number, a0Deg: number, a1Deg: number): string {
  const a0 = (a0Deg * Math.PI) / 180;
  const a1 = (a1Deg * Math.PI) / 180;
  const x0o = cx + Math.cos(a0) * r1;
  const y0o = cy + Math.sin(a0) * r1;
  const x1o = cx + Math.cos(a1) * r1;
  const y1o = cy + Math.sin(a1) * r1;
  const large = Math.abs(a1Deg - a0Deg) > 180 ? 1 : 0;

  if (r0 <= 1) {
    return `M${cx.toFixed(1)} ${cy.toFixed(1)} L${x0o.toFixed(1)} ${y0o.toFixed(1)} A${r1.toFixed(1)} ${r1.toFixed(1)} 0 ${large} 1 ${x1o.toFixed(1)} ${y1o.toFixed(1)} Z`;
  }
  const x1i = cx + Math.cos(a1) * r0;
  const y1i = cy + Math.sin(a1) * r0;
  const x0i = cx + Math.cos(a0) * r0;
  const y0i = cy + Math.sin(a0) * r0;
  return `M${x0i.toFixed(1)} ${y0i.toFixed(1)} L${x0o.toFixed(1)} ${y0o.toFixed(1)} A${r1.toFixed(1)} ${r1.toFixed(1)} 0 ${large} 1 ${x1o.toFixed(1)} ${y1o.toFixed(1)} L${x1i.toFixed(1)} ${y1i.toFixed(1)} A${r0.toFixed(1)} ${r0.toFixed(1)} 0 ${large} 0 ${x0i.toFixed(1)} ${y0i.toFixed(1)} Z`;
}

/** Cung tròn đơn cho sóng radar chủ động bước sóng milimet. */
function arcOnlyPath(cx: number, cy: number, r: number, a0Deg: number, a1Deg: number): string {
  const a0 = (a0Deg * Math.PI) / 180;
  const a1 = (a1Deg * Math.PI) / 180;
  const x0 = cx + Math.cos(a0) * r;
  const y0 = cy + Math.sin(a0) * r;
  const x1 = cx + Math.cos(a1) * r;
  const y1 = cy + Math.sin(a1) * r;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r.toFixed(1)} ${r.toFixed(1)} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

// ============================================================================
// KHU VỰC A (NỬA ĐẦU 278.1 – 285.5s): NGÒI NỔ TIẾP CẬN NỔ CHẬM SAU ĐUÔI KINZHAL
// ============================================================================
const ZA_X = 760;
const ZA_Y = 480;

// Kinzhal lao siêu vượt âm từ phải-trên xuống trái-dưới (góc ~163°)
const K1_START: readonly [number, number] = [1480, 260];
const K1_END: readonly [number, number] = [195, 653];
const K1_ANG = deg(Math.atan2(K1_END[1] - K1_START[1], K1_END[0] - K1_START[0])); // ~163°

// Đạn thế hệ cũ PAC-2 bay sượt gần tới điểm kích nổ ngòi tiếp cận (885, 558) lúc 281.5s
const P2_START: readonly [number, number] = [365, 815];
const P2_DET: readonly [number, number] = [885, 558];
const P2_ANG = deg(Math.atan2(P2_DET[1] - P2_START[1], P2_DET[0] - P2_START[0])); // ~-26.3°

// ============================================================================
// KHU VỰC B (NỬA SAU 285.5 – 295.65s): PAC-3 VA CHẠM TIÊU DIỆT & RADAR CHỦ ĐỘNG KHOÁ MŨI
// ============================================================================
const HIT_X = 1780;
const HIT_Y = 590;

const K2_START: readonly [number, number] = [2420, 355];
// Giữ khoảng cách 2 đầu mũi ~350 px ở cuối cảnh (295.65s) để chùm nón radar chủ động bước sóng milimet hiển thị rộng, sắc nét, nối sang cú đâm ở S17!
const K2_NEAR: readonly [number, number] = [2112, 468];
const K2_ANG = deg(Math.atan2(HIT_Y - K2_START[1], HIT_X - K2_START[0])); // ~159.8°

const P3_START: readonly [number, number] = [1150, 822];
const P3_NEAR: readonly [number, number] = [1468, 705];
const P3_ANG = deg(Math.atan2(HIT_Y - P3_START[1], HIT_X - P3_START[0])); // ~-20.2° (đối đầu trực diện 180°!)

const S16: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- Diễn biến Nửa đầu: Ngòi nổ tiếp cận trượt sau đuôi (278.1 – 285.5s) ----------------
  // Tại 281.5s Kinzhal đã vọt tới x ~ 750; khi chùm mảnh văng cam bung ra (281.6..285.2s), toàn bộ quạt mảnh văng quét vào khoảng không phía sau đuôi Kinzhal!
  const k1Prog = prog(t, 277.9, 285.5, (x) => Math.pow(x, 0.82));
  const k1X = lerp(K1_START[0], K1_END[0], k1Prog);
  const k1Y = lerp(K1_START[1], K1_END[1], k1Prog);

  const p2Prog = prog(t, 277.9, CUE.s16_old_prox_miss, (x) => x);
  const p2X = lerp(P2_START[0], P2_DET[0], p2Prog);
  const p2Y = lerp(P2_START[1], P2_DET[1], p2Prog);
  const detDt = t - CUE.s16_old_prox_miss;
  const hasDetonated = detDt >= 0;

  // Chùm mảnh văng hình quạt màu cam bung nhanh ra khoảng không sau đuôi Kinzhal và lưu lại dấu vết hình học rõ nét tới hết pha 1
  const fragExpand = prog(t, CUE.s16_old_prox_miss, CUE.s16_old_prox_miss + 0.95, Easing.out(Easing.cubic));
  const fragFade = 1 - prog(t, 285.25, 285.85);
  const fragOuterR = lerp(24, 295, fragExpand);
  const fragInnerR = lerp(0, 72, prog(t, CUE.s16_old_prox_miss + 0.15, CUE.s16_old_prox_miss + 1.4));

  // Điểm trung tâm chùm mảnh văng cắt qua trục đường bay Kinzhal (852, 452) — nằm hẳn phía sau đuôi Kinzhal!
  const wakeCrossX = 852;
  const wakeCrossY = 452;
  const k1TailX = k1X - Math.cos((K1_ANG * Math.PI) / 180) * 168;
  const k1TailY = k1Y - Math.sin((K1_ANG * Math.PI) / 180) * 168;
  const showMissGap = prog(t, 281.68, 282.05) * fragFade;

  // ---------------- Diễn biến Nửa sau: PAC-3 va chạm tiêu diệt & bật đầu dò radar chủ động (285.5 – 295.65s) ----------------
  const pPhase2 = prog(t, 285.2, 286.8, Easing.bezier(0.42, 0, 0.2, 1));
  const closeP = prog(t, 285.6, 295.65, (x) => x);

  const k2X = lerp(K2_START[0], K2_NEAR[0], closeP);
  const k2Y = lerp(K2_START[1], K2_NEAR[1], closeP);

  // Tạp nhiễu lệch nhẹ trước khi hiệu chỉnh khoá thẳng trục va chạm 0.0 m
  const lateralErr = (1 - prog(t, 288.4, 293.6)) * Math.sin(t * 2.6) * 26;
  const perpX = -Math.sin((P3_ANG * Math.PI) / 180);
  const perpY = Math.cos((P3_ANG * Math.PI) / 180);
  const p3X = lerp(P3_START[0], P3_NEAR[0], closeP) + perpX * lateralErr;
  const p3Y = lerp(P3_START[1], P3_NEAR[1], closeP) + perpY * lateralErr;

  // Nhịp phụt ngang ACM nhỏ chỉnh tâm đường ngắm của PAC-3
  const acmPulse =
    bump(t, 289.2, 0.28) * 0.9 -
    bump(t, 291.4, 0.26) * 0.85 +
    bump(t, 293.6, 0.24) * 0.75;

  // Đúng CUE.s16_active_radar (292.84s): từ chóp mũi PAC3_2D bật chùm sóng radar chủ động bước sóng milimet
  const radarOn = prog(t, CUE.s16_active_radar - 0.05, CUE.s16_active_radar + 0.45, Easing.out(Easing.cubic));
  const p3Scale = 0.52;
  const p3NoseX = p3X + Math.cos((P3_ANG * Math.PI) / 180) * (260 * p3Scale);
  const p3NoseY = p3Y + Math.sin((P3_ANG * Math.PI) / 180) * (260 * p3Scale);

  const k2Scale = 0.46;
  const k2NoseX = k2X + Math.cos((K2_ANG * Math.PI) / 180) * (360 * k2Scale);
  const k2NoseY = k2Y + Math.sin((K2_ANG * Math.PI) / 180) * (360 * k2Scale);

  const noseDist = Math.max(40, Math.hypot(k2NoseX - p3NoseX, k2NoseY - p3NoseY));
  const lockAngleDeg = deg(Math.atan2(k2NoseY - p3NoseY, k2NoseX - p3NoseX));

  // Vòng tròn sai số CEP thu hẹp từ 118 px về đúng điểm tâm 0.0 m (6 px) khi radar chủ động khoá cứng mũi mục tiêu!
  const lockTighten = prog(t, CUE.s16_active_radar, 295.25, Easing.bezier(0.3, 0, 0.2, 1));
  const cepRadius = lerp(118, 7, lockTighten);

  // ---------------- Camera <Cam2D>: Khung Khu vực A -> Lia & đẩy zoom sắc nét vào điểm khoá radar Khu vực B ----------------
  const pZoomRadar = prog(t, 292.2, 295.5, Easing.bezier(0.35, 0, 0.2, 1));
  let camX = lerp(ZA_X - 45, HIT_X - 20, pPhase2);
  camX = lerp(camX, (p3NoseX + k2NoseX) * 0.5, pZoomRadar * 0.85);

  let camY = lerp(ZA_Y + 25, HIT_Y + 8, pPhase2);
  camY = lerp(camY, (p3NoseY + k2NoseY) * 0.5, pZoomRadar * 0.85);

  let zoom = lerp(1.06, 1.15, pPhase2);
  zoom = lerp(zoom, 1.34, pZoomRadar);

  const shakeAmt = 1.6 + bump(t, CUE.s16_old_prox_miss, 0.55) * 8.5;
  const shake = handheld(t, shakeAmt, 's16_topo');

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: PAL2D.bgNight }}>
      <Cam2D x={camX} y={camY} zoom={zoom} shake={shake} bg={PAL2D.bgDeep}>
        <svg width={1920} height={1080} style={{ overflow: 'visible' }}>
          <Defs2D />

          {/* Sa bàn bản đồ đồng mức chiến thuật nhìn từ đỉnh (top-down) */}
          <TopoMapBg2D w={3800} h={2400} seed="s16_intercept_geo" cx={1270} cy={540} />

          {/* Lưới toạ độ phương vị sa bàn & thước vòng tròn chiến thuật */}
          <g opacity={0.32} stroke={PAL2D.grid} strokeWidth={1.2}>
            <line x1={-400} y1={ZA_Y} x2={3000} y2={ZA_Y} strokeDasharray="10 12" />
            <line x1={ZA_X} y1={-300} x2={ZA_X} y2={1500} strokeDasharray="10 12" />
            <line x1={HIT_X} y1={-300} x2={HIT_X} y2={1500} strokeDasharray="10 12" />
            <line x1={-400} y1={HIT_Y} x2={3000} y2={HIT_Y} strokeDasharray="10 12" />
          </g>

          {/* ==================== NỬA ĐẦU: NGÒI NỔ TIẾP CẬN TRƯỢT SAU ĐUÔI MỤC TIÊU ==================== */}
          <g opacity={1 - prog(t, 285.6, 286.6)}>
            {/* Vòng tròn la bàn khu vực A */}
            <circle cx={ZA_X} cy={ZA_Y} r={340} fill="none" stroke={PAL2D.grid} strokeWidth={1.6} opacity={0.38} />
            <circle cx={ZA_X} cy={ZA_Y} r={190} fill="none" stroke={PAL2D.grid} strokeWidth={1.2} strokeDasharray="6 8" opacity={0.35} />

            {/* Đường trục vận tốc siêu vượt âm của Kinzhal */}
            <line
              x1={K1_START[0]}
              y1={K1_START[1]}
              x2={K1_END[0]}
              y2={K1_END[1]}
              stroke={PAL2D.red}
              strokeWidth={2.4}
              strokeDasharray="14 10"
              opacity={0.45}
            />
            <GlowLine2D
              d={`M${K1_START[0]} ${K1_START[1]} L${k1X} ${k1Y}`}
              color={PAL2D.red}
              core={PAL2D.amberHot}
              width={4.2}
              opacity={0.85}
            />

            {/* Quỹ đạo tiếp cận xiên của đạn phòng không thế hệ cũ PAC-2 */}
            <line
              x1={P2_START[0]}
              y1={P2_START[1]}
              x2={P2_DET[0]}
              y2={P2_DET[1]}
              stroke={PAL2D.amber}
              strokeWidth={2.2}
              strokeDasharray="10 8"
              opacity={0.45}
            />
            <GlowLine2D
              d={`M${P2_START[0]} ${P2_START[1]} L${p2X} ${p2Y}`}
              color={PAL2D.amber}
              core="#fff4cc"
              width={3.4}
              opacity={hasDetonated ? 0.45 : 0.9}
            />

            {/* Vòng bán kính cảm biến ngòi nổ tiếp cận quanh đầu đạn PAC-2 trước khi kích nổ */}
            {!hasDetonated && (
              <g>
                <circle
                  cx={p2X + Math.cos((P2_ANG * Math.PI) / 180) * 38}
                  cy={p2Y + Math.sin((P2_ANG * Math.PI) / 180) * 38}
                  r={92}
                  fill={PAL2D.amber}
                  fillOpacity={0.07}
                  stroke={PAL2D.amber}
                  strokeWidth={2.2}
                  strokeDasharray="8 6"
                />
              </g>
            )}

            {/* Đạn phòng không thế hệ cũ PAC-2 (biến mất khi nổ mảnh tại 281.5s) */}
            {!hasDetonated && (
              <g filter="url(#sh)">
                <PAC2_2D x={p2X} y={p2Y} scale={0.44} rot={P2_ANG} flame={0.95} />
              </g>
            )}

            {/* Đúng 281.5s (CUE.s16_old_prox_miss): Nón mảnh văng hình quạt màu cam bung chậm vào khoảng không sau đuôi Kinzhal! */}
            {hasDetonated && fragFade > 0.01 && (
              <g opacity={fragFade}>
                {/* Vòng sóng kích nổ ngòi tiếp cận */}
                <circle
                  cx={P2_DET[0]}
                  cy={P2_DET[1]}
                  r={92 + fragExpand * 45}
                  fill="none"
                  stroke={PAL2D.amber}
                  strokeWidth={2}
                  strokeDasharray="6 8"
                  opacity={0.45 * (1 - fragExpand * 0.6)}
                />

                {/* Quạt mảnh văng cam hướng lên trục bay nhưng trễ hoàn toàn phía sau đuôi Kinzhal */}
                <path
                  d={sectorPath(P2_DET[0], P2_DET[1], fragInnerR, fragOuterR, -146, -48)}
                  fill={PAL2D.amber}
                  opacity={0.32}
                  stroke={PAL2D.amber}
                  strokeWidth={2.6}
                />
                <path
                  d={sectorPath(P2_DET[0], P2_DET[1], fragInnerR * 0.75, fragOuterR * 0.84, -136, -58)}
                  fill={PAL2D.red}
                  opacity={0.22}
                />

                {/* 18 vệt mảnh văng kim loại bay toả hình quạt quét qua khoảng không sau đuôi mục tiêu */}
                {Array.from({ length: 18 }, (_, i) => {
                  const u = i / 17;
                  const aDeg = lerp(-143, -51, u);
                  const aRad = (aDeg * Math.PI) / 180;
                  const speedVar = 0.84 + ((i * 7) % 5) * 0.06;
                  const rHead = Math.min(315, fragOuterR * speedVar);
                  const rTail = Math.max(12, fragInnerR * 0.65);
                  const hx = P2_DET[0] + Math.cos(aRad) * rHead;
                  const hy = P2_DET[1] + Math.sin(aRad) * rHead;
                  const tx = P2_DET[0] + Math.cos(aRad) * rTail;
                  const ty = P2_DET[1] + Math.sin(aRad) * rTail;
                  return (
                    <g key={i}>
                      <line x1={tx} y1={ty} x2={hx} y2={hy} stroke={PAL2D.amber} strokeWidth={2.0} strokeDasharray="6 6" opacity={0.62} />
                      <polygon
                        points={`${hx + 6},${hy} ${hx - 5},${hy - 4} ${hx - 5},${hy + 4}`}
                        fill={PAL2D.amberHot}
                        transform={`rotate(${aDeg} ${hx} ${hy})`}
                      />
                    </g>
                  );
                })}

                {/* Thước gióng khoảng hụt (miss gap) chứng minh Kinzhal đã vọt xa khỏi vùng mảnh văng */}
                {showMissGap > 0.01 && (
                  <g opacity={showMissGap}>
                    <circle cx={wakeCrossX} cy={wakeCrossY} r={14} fill="none" stroke={PAL2D.amber} strokeWidth={2.4} />
                    <line x1={wakeCrossX - 11} y1={wakeCrossY - 11} x2={wakeCrossX + 11} y2={wakeCrossY + 11} stroke={PAL2D.red} strokeWidth={3} />
                    <line x1={wakeCrossX + 11} y1={wakeCrossY - 11} x2={wakeCrossX - 11} y2={wakeCrossY + 11} stroke={PAL2D.red} strokeWidth={3} />
                    <GlowLine2D
                      d={`M${wakeCrossX} ${wakeCrossY} L${k1TailX} ${k1TailY}`}
                      color={PAL2D.red}
                      core="#ffd6d6"
                      width={2.8}
                      dash="10 8"
                    />
                  </g>
                )}
              </g>
            )}

            <Blast2D t={t} at={CUE.s16_old_prox_miss} x={P2_DET[0]} y={P2_DET[1]} size={48} air life={3.4} seed={16} />

            {/* Mục tiêu siêu vượt âm Kinzhal kèm mũi tên vector vận tốc lớn ở đầu mũi */}
            <g>
              {(() => {
                const rad = (K1_ANG * Math.PI) / 180;
                const vx0 = k1X + Math.cos(rad) * 172;
                const vy0 = k1Y + Math.sin(rad) * 172;
                const vx1 = k1X + Math.cos(rad) * 278;
                const vy1 = k1Y + Math.sin(rad) * 278;
                return (
                  <g>
                    <GlowLine2D d={`M${vx0} ${vy0} L${vx1} ${vy1}`} color={PAL2D.red} core="#ffffff" width={3.6} />
                    <polygon
                      points={`${vx1 + 14},${vy1} ${vx1 - 8},${vy1 - 9} ${vx1 - 8},${vy1 + 9}`}
                      fill={PAL2D.red}
                      transform={`rotate(${K1_ANG} ${vx1} ${vy1})`}
                    />
                  </g>
                );
              })()}
              <g filter="url(#sh)">
                <Kinzhal2D x={k1X} y={k1Y} scale={0.46} rot={K1_ANG} heatGlow={0.9} flame={0} />
              </g>
            </g>
          </g>

          {/* ==================== NỬA SAU: PAC-3 VA CHẠM TIÊU DIỆT & ĐẦU DÒ RADAR CHỦ ĐỘNG ==================== */}
          {t >= 285.0 && (
            <g opacity={prog(t, 285.1, 286.1)}>
              {/* Vòng chia độ la bàn chiến thuật quanh điểm chạm dự tính HIT (1780, 590) */}
              <circle cx={HIT_X} cy={HIT_Y} r={360} fill="none" stroke={PAL2D.grid} strokeWidth={1.6} opacity={0.42} />
              <circle cx={HIT_X} cy={HIT_Y} r={220} fill="none" stroke={PAL2D.grid} strokeWidth={1.3} strokeDasharray="8 8" opacity={0.38} />
              {Array.from({ length: 36 }, (_, i) => {
                const a = (i * 10 * Math.PI) / 180;
                const rIn = i % 3 === 0 ? 344 : 352;
                return (
                  <line
                    key={i}
                    x1={HIT_X + Math.cos(a) * rIn}
                    y1={HIT_Y + Math.sin(a) * rIn}
                    x2={HIT_X + Math.cos(a) * 360}
                    y2={HIT_Y + Math.sin(a) * 360}
                    stroke={PAL2D.cyanSoft}
                    strokeWidth={i % 3 === 0 ? 2 : 1.1}
                    opacity={0.45}
                  />
                );
              })}

              {/* Trục đối đầu trực diện thân-đối-thân (Hit-to-Kill collision vector) */}
              <line
                x1={P3_START[0]}
                y1={P3_START[1]}
                x2={K2_START[0]}
                y2={K2_START[1]}
                stroke={PAL2D.cyan}
                strokeWidth={2}
                strokeDasharray="10 9"
                opacity={0.42}
              />
              <GlowLine2D d={`M${K2_START[0]} ${K2_START[1]} L${k2X} ${k2Y}`} color={PAL2D.red} core={PAL2D.amberHot} width={4} />
              <GlowLine2D d={`M${P3_START[0]} ${P3_START[1]} L${p3X} ${p3Y}`} color={PAL2D.cyan} core="#ffffff" width={4} />

              {/* Vòng tròn sai số CEP thu hẹp dần về đúng điểm 0.0 m khi PAC-3 bật radar chủ động */}
              <g transform={`translate(${lerp(HIT_X, k2NoseX, radarOn)} ${lerp(HIT_Y, k2NoseY, radarOn)})`}>
                <circle
                  r={cepRadius}
                  fill={PAL2D.cyan}
                  fillOpacity={0.08 * (1 - lockTighten * 0.5)}
                  stroke={radarOn > 0.5 ? PAL2D.cyan : PAL2D.amber}
                  strokeWidth={2.6}
                  strokeDasharray={lockTighten > 0.75 ? undefined : '10 6'}
                />
                {/* 4 ngàm thước ngắm hội tụ khoá cứng mũi Kinzhal */}
                {[0, 90, 180, 270].map((rotDeg) => (
                  <g key={rotDeg} transform={`rotate(${rotDeg})`}>
                    <line x1={cepRadius + 4} y1={0} x2={cepRadius + 22} y2={0} stroke={PAL2D.cyan} strokeWidth={2.8} />
                  </g>
                ))}
                {/* Khung thoi khoá mục tiêu 0.0 m khi sai số ép sát về tâm */}
                {radarOn > 0.2 && (
                  <polygon
                    points="0,-16 16,0 0,16 -16,0"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2.4}
                    opacity={radarOn}
                  />
                )}
              </g>

              {/* Đúng CUE.s16_active_radar (292.84s): Chùm nón sóng radar chủ động bước sóng milimet phát trực tiếp từ mũi PAC3_2D! */}
              {radarOn > 0.01 && (
                <g opacity={radarOn}>
                  {/* Hình tam giác nón quét radar chủ động khóa cứng đầu mũi Kinzhal2D */}
                  {(() => {
                    const halfConeDeg = lerp(24, 15.5, lockTighten);
                    const coneLen = noseDist + 28;
                    const aL = ((lockAngleDeg - halfConeDeg) * Math.PI) / 180;
                    const aR = ((lockAngleDeg + halfConeDeg) * Math.PI) / 180;
                    const lx = p3NoseX + Math.cos(aL) * coneLen;
                    const ly = p3NoseY + Math.sin(aL) * coneLen;
                    const rx = p3NoseX + Math.cos(aR) * coneLen;
                    const ry = p3NoseY + Math.sin(aR) * coneLen;

                    // Tia quét con lắc tần số cao bên trong nón sóng milimet
                    const sweepDeg = lockAngleDeg + Math.sin((t - CUE.s16_active_radar) * 20) * (halfConeDeg * 0.72);
                    const sRad = (sweepDeg * Math.PI) / 180;
                    const sx = p3NoseX + Math.cos(sRad) * coneLen;
                    const sy = p3NoseY + Math.sin(sRad) * coneLen;

                    return (
                      <g>
                        <polygon
                          points={`${p3NoseX},${p3NoseY} ${lx},${ly} ${rx},${ry}`}
                          fill={PAL2D.cyan}
                          opacity={0.2}
                        />
                        <line x1={p3NoseX} y1={p3NoseY} x2={lx} y2={ly} stroke={PAL2D.cyan} strokeWidth={2.6} opacity={0.92} />
                        <line x1={p3NoseX} y1={p3NoseY} x2={rx} y2={ry} stroke={PAL2D.cyan} strokeWidth={2.6} opacity={0.92} />
                        <line x1={p3NoseX} y1={p3NoseY} x2={sx} y2={sy} stroke="#ffffff" strokeWidth={2.4} opacity={0.72} />

                        {/* Các cung sóng tròn đồng tâm bước sóng ngắn milimet lan truyền sắc nét tới mũi Kinzhal */}
                        {Array.from({ length: 9 }, (_, wIdx) => {
                          const phase = (((t - CUE.s16_active_radar) * 2.8 + wIdx / 9) % 1);
                          const rWave = 24 + phase * (coneLen - 18);
                          const fade = 0.25 + 0.75 * Math.sin(phase * Math.PI);
                          return (
                            <path
                              key={wIdx}
                              d={arcOnlyPath(p3NoseX, p3NoseY, rWave, lockAngleDeg - halfConeDeg * 0.94, lockAngleDeg + halfConeDeg * 0.94)}
                              fill="none"
                              stroke={wIdx % 3 === 0 ? '#ffffff' : PAL2D.cyan}
                              strokeWidth={wIdx % 3 === 0 ? 2.6 : 3.2}
                              opacity={0.92 * fade}
                            />
                          );
                        })}

                        {/* Sóng phản xạ (radar echo) dội ngược từ đầu mũi Kinzhal về đầu dò PAC-3 */}
                        {Array.from({ length: 3 }, (_, eIdx) => {
                          const ePhase = (((t - CUE.s16_active_radar) * 2.6 + eIdx / 3) % 1);
                          const rEcho = 10 + ePhase * Math.min(115, noseDist * 0.65);
                          return (
                            <path
                              key={`echo_${eIdx}`}
                              d={arcOnlyPath(k2NoseX, k2NoseY, rEcho, lockAngleDeg + 180 - 28, lockAngleDeg + 180 + 28)}
                              fill="none"
                              stroke={PAL2D.amberHot}
                              strokeWidth={2.0}
                              opacity={0.68 * (1 - ePhase)}
                            />
                          );
                        })}

                        {/* Đường khóa tâm laser thẳng tắp nối hai đầu mũi (sai số 0.0 m) */}
                        <GlowLine2D
                          d={`M${p3NoseX} ${p3NoseY} L${k2NoseX} ${k2NoseY}`}
                          color={PAL2D.cyan}
                          core="#ffffff"
                          width={3.0}
                          dash="8 6"
                        />
                        <circle cx={p3NoseX} cy={p3NoseY} r={6} fill="#ffffff" />
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* Hai quả tên lửa lao thẳng vào điểm va chạm trực diện */}
              <g filter="url(#sh)">
                <Kinzhal2D x={k2X} y={k2Y} scale={k2Scale} rot={K2_ANG} heatGlow={0.95} flame={0} />
              </g>
              <g filter="url(#sh)">
                <PAC3_2D x={p3X} y={p3Y} scale={p3Scale} rot={P3_ANG} flame={1} acmFire={acmPulse} />
              </g>
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.35} />
    </div>
  );
};

export default S16;
