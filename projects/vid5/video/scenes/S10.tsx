import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, FONT, lerp, prog } from '@kit/theme';
import { handheld, Label, useSpring, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Top2D, Weapon2D } from '../local/jets2d';

// Con dấu kỹ thuật khóa đỏ niêm phong mấu đầu cánh Station 1 & Station 9 suốt 50 năm
const TechnicalLockStamp: React.FC<{
  x: number;
  y: number;
  station: string;
  scale: number;
}> = ({ x, y, station, scale }) => {
  if (scale <= 0.01) return null;
  const op = Math.min(1, scale * 1.6);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale}) rotate(-7)`} opacity={op}>
      {/* Bóng cứng kỹ thuật */}
      <rect x={-166} y={-96} width={332} height={192} rx={16} fill="rgba(8,14,24,0.58)" transform="translate(8 10)" />
      {/* Khung niêm phong đỏ sẫm viền kép */}
      <rect
        x={-166}
        y={-96}
        width={332}
        height={192}
        rx={16}
        fill="#240b14"
        stroke={P.red}
        strokeWidth={5}
      />
      <rect
        x={-154}
        y={-84}
        width={308}
        height={168}
        rx={10}
        fill="none"
        stroke={P.red}
        strokeWidth={2}
        strokeDasharray="10 6"
        opacity={0.85}
      />
      {/* Dải sọc cảnh báo kỹ thuật hai góc */}
      {[-130, -96, -62, 62, 96, 130].map((sx, idx) => (
        <line
          key={idx}
          x1={sx - 12}
          y1={-82}
          x2={sx + 12}
          y2={-64}
          stroke={P.red}
          strokeWidth={4}
          opacity={0.45}
        />
      ))}

      {/* Biểu tượng ổ khóa cơ khí hạng nặng bên trái */}
      <g transform="translate(-96 4)">
        <path
          d="M-20,-8 L-20,-26 A20,20 0 0,1 20,-26 L20,-8"
          fill="none"
          stroke={P.red}
          strokeWidth={7}
          strokeLinecap="round"
        />
        <rect x={-28} y={-8} width={56} height={44} rx={7} fill={P.red} stroke={P.ink} strokeWidth={2.5} />
        <circle cx={0} cy={10} r={6} fill="#240b14" />
        <rect x={-2.5} y={12} width={5} height={12} rx={1.5} fill="#240b14" />
      </g>

      {/* Mã hiệu mấu vũ khí & thời hạn niêm phong 50 năm */}
      <text
        x={34}
        y={-18}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={38}
        fill="#ffffff"
        letterSpacing={2}
      >
        {station}
      </text>
      <rect x={-38} y={0} width={146} height={36} rx={6} fill={P.red} />
      <text
        x={35}
        y={25}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={22}
        fill="#19070d"
        letterSpacing={2.5}
      >
        SEALED
      </text>
      <text
        x={35}
        y={64}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={20}
        fill={P.amberHot}
        letterSpacing={3}
      >
        50 YEARS
      </text>
    </g>
  );
};

// Vòng ngắm tiêu điểm kỹ thuật nét kép (halo + lõi) không dùng filter glow để tránh cắt viền khi Cam2D zoom
const ReticleFocus: React.FC<{
  x: number;
  y: number;
  label: string;
  side: 'left' | 'right';
  p: number;
  pulse: number;
}> = ({ x, y, label, side, p, pulse }) => {
  if (p <= 0.01) return null;
  const r = lerp(74, 46, p) + pulse * 3.5;
  const dir = side === 'left' ? -1 : 1;
  const bx = x + dir * 188;
  return (
    <g opacity={p}>
      {/* Quầng sáng kép */}
      <circle cx={x} cy={y} r={r + 8} fill="none" stroke={P.amber} strokeWidth={10} opacity={0.18} />
      <circle cx={x} cy={y} r={r} fill="none" stroke={P.amberHot} strokeWidth={3} />
      <circle
        cx={x}
        cy={y}
        r={r - 12}
        fill="none"
        stroke={P.cyan}
        strokeWidth={1.8}
        strokeDasharray="12 8"
      />
      {/* 4 vạch thước ngắm chữ thập */}
      {[0, 90, 180, 270].map((ang) => (
        <line
          key={ang}
          x1={x}
          y1={y - r - 10}
          x2={x}
          y2={y - r + 7}
          stroke={P.amberHot}
          strokeWidth={3}
          transform={`rotate(${ang} ${x} ${y})`}
        />
      ))}

      {/* Đường dẫn & thẻ mã hiệu mấu */}
      <polyline
        points={`${x + dir * (r + 4)},${y} ${x + dir * 108},${y} ${bx - dir * 56},${y}`}
        fill="none"
        stroke={P.amberHot}
        strokeWidth={2.5}
      />
      <rect
        x={bx - 64}
        y={y - 26}
        width={128}
        height={52}
        rx={8}
        fill={P.bgCard}
        stroke={P.amberHot}
        strokeWidth={2.5}
      />
      <text
        x={bx}
        y={y + 9}
        textAnchor="middle"
        fontFamily={FONT}
        fontWeight={700}
        fontSize={27}
        fill={P.amberHot}
        letterSpacing={1.5}
      >
        {label}
      </text>
    </g>
  );
};

// Một lớp mặt cắt cánh ngoài + mấu đạn nặng (ngàm cố định tại vách gốc x=2174, uốn & xoắn khí đàn hồi ở đầu cánh x=3350!)
const OuterWingStoreLayer: React.FC<{
  twistDeg: number;
  plungeY: number;
  aileronDeg: number;
  ghostColor?: string;
  opacity?: number;
}> = ({ twistDeg, plungeY, aileronDeg, ghostColor, opacity = 1 }) => {
  const isGhost = Boolean(ghostColor);
  const strokeCol = ghostColor ?? P.ink;
  const wingFill = ghostColor ? 'none' : '#183354';
  // Góc uốn dầm công-xôn quanh ngàm gốc cánh (2174, 350) sao cho gốc luôn khít chặt vào vách thân còn đầu cánh nhún ±plungeY
  const cantileverBendDeg = (plungeY / 1220) * (180 / Math.PI);
  return (
    <g
      transform={`translate(2174 350) rotate(${cantileverBendDeg}) translate(-2174 -350)`}
      opacity={opacity}
    >
      {/* Khung bao cánh quét cắt dọc từ gốc cố định (x=2170) ra mấu đầu cánh (x=3510) */}
      <path
        d="M2170,210 L3485,326 Q3545,334 3552,368 Q3546,400 3476,410 L2170,490 Z"
        fill={wingFill}
        stroke={strokeCol}
        strokeWidth={isGhost ? 2.6 : 3.5}
        strokeDasharray={isGhost ? '12 7' : undefined}
      />
      {!isGhost && (
        <>
          {/* Tôn mép trước & gờ dầm chịu lực trên/dưới */}
          <path
            d="M2170,210 L3485,326 Q3530,332 3542,354 L2170,242 Z"
            fill={P.legLight}
            opacity={0.85}
          />
          <path
            d="M2170,466 L3476,392 L3476,410 L2170,490 Z"
            fill={P.legDark}
            opacity={0.88}
          />
          {/* Các vách sườn cánh (wing ribs) lộ khoang cơ khí bên trong */}
          {[2310, 2500, 2690, 2880, 3070, 3250].map((rx, idx) => {
            const u = (rx - 2170) / 1310;
            const topY = lerp(236, 336, u);
            const botY = lerp(468, 396, u);
            return (
              <g key={idx}>
                <line x1={rx} y1={topY} x2={rx} y2={botY} stroke="#365f8f" strokeWidth={5} />
                <circle cx={rx} cy={(topY + botY) * 0.5} r={9} fill={P.bgDeep} stroke="#4b7db5" strokeWidth={1.6} />
              </g>
            );
          })}
        </>
      )}

      {/* Cụm đầu cánh + cánh liệng + giá treo mấu 1/9 + quả đạn nặng bị VẶN XOẮN (Torsional Flutter) quanh tâm đàn hồi (3350, 385) */}
      <g transform={`translate(3350 385) rotate(${twistDeg * 0.85}) translate(-3350 -385)`}>
        {/* Cánh liệng (Aileron) ở mép sau đầu cánh di chuyển trễ pha */}
        <g transform={`translate(3455 372) rotate(${aileronDeg})`}>
          <polygon
            points="0,-24 128,-8 134,8 0,24"
            fill={ghostColor ? 'none' : P.legMid}
            stroke={strokeCol}
            strokeWidth={isGhost ? 2.2 : 2.8}
          />
        </g>

        {/* Giá treo mấu đầu cánh Station 1/9 + Quả đạn tên lửa nặng gây mô-men xoắn */}
        <polygon
          points="3245,402 3440,396 3418,452 3272,452"
          fill={ghostColor ? 'none' : P.legDark}
          stroke={strokeCol}
          strokeWidth={isGhost ? 2.2 : 2.8}
        />
        <rect
          x={3195}
          y={448}
          width={280}
          height={13}
          rx={3}
          fill={ghostColor ? 'none' : P.legLight}
          stroke={strokeCol}
          strokeWidth={isGhost ? 2 : 2.4}
        />
        {isGhost ? (
          <ellipse
            cx={3345}
            cy={484}
            rx={172}
            ry={14}
            fill="none"
            stroke={strokeCol}
            strokeWidth={2.4}
            strokeDasharray="10 6"
          />
        ) : (
          <Weapon2D kind="amraam" x={3348} y={484} scale={3.45} accent={P.red} />
        )}
      </g>
    </g>
  );
};

const S10: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- Chuyển động Camera 2D qua 2 khu vực bàn vẽ kỹ thuật ----------------
  const pZoomSta = prog(t, 251.2, 255.2);
  const pPanCutaway = prog(t, 262.7, 264.5);

  const camX1 = 960;
  const camY1 = lerp(525, 558, pZoomSta);
  const camZ1 = lerp(1.0, 1.1, pZoomSta);

  const camX = lerp(camX1, 2960, pPanCutaway);
  const camY = lerp(camY1, 540, pPanCutaway);
  const camZoom = lerp(camZ1, 1.0, pPanCutaway);

  // Biên độ rung xoắn khí đàn hồi Flutter (bùng lên từ 264.60s, bị kẹp cứng khi đóng dấu khóa đỏ tại 281.44s)
  const flutterRamp = prog(t, CUE.s10_flutterStart, 268.2);
  const sealClamp = prog(t, CUE.s10_sealed50yr, CUE.s10_sealed50yr + 0.35);
  const activeFlutter = flutterRamp * (1 - sealClamp * 0.92);

  const omega = (t - CUE.s10_flutterStart) * 19.5;
  const twistDeg = t >= CUE.s10_flutterStart ? Math.sin(omega) * 10.5 * activeFlutter : 0;
  const plungeY = t >= CUE.s10_flutterStart ? Math.cos(omega) * 58 * activeFlutter : 0;
  const cantileverBendDeg = (plungeY / 1220) * (180 / Math.PI);

  // Hệ cơ khí (dây cáp, ròng rọc, thanh đẩy, van thủy lực) phản ứng TRỄ PHA ~125° và biên độ yếu không dập kịp
  const lagWave = t >= CUE.s10_flutterStart ? Math.sin(omega - 2.2) * activeFlutter : 0;
  const pulleyRot = lagWave * 46;
  const cableShift = lagWave * 22;
  const aileronLagDeg = lagWave * 8.5;

  const cablesHighlight = prog(t, CUE.s10_cablesLag - 0.6, CUE.s10_cablesLag + 1.0);
  const mechTreeFade = prog(t, 240.2, 242.5) * (1 - prog(t, 250.5, 252.5));

  const spotSta1 = prog(t, 253.8, 255.1);
  const spotSta9 = prog(t, 255.1, 256.2);
  const pulse = 0.5 + 0.5 * Math.sin(t * 6.5);

  const stamp1 = useSpring(t, CUE.s10_sealed50yr, 12, 210);
  const stamp9 = useSpring(t, CUE.s10_sealed50yr + 0.16, 12, 210);
  const slamShake = bump(t, CUE.s10_sealed50yr, 0.42) * 10;

  const [hx, hy] = handheld(t, 2.2 + activeFlutter * 3.4, 's10_cam');

  // Đường sóng cộng hưởng đỏ tăng vọt biên độ trong khung dao động kế (x: 2210..3710, yMid = 865)
  const flutterWavePts: string[] = [];
  const lagCablePts: string[] = [];
  const N_WAVE = 130;
  for (let i = 0; i <= N_WAVE; i++) {
    const u = i / N_WAVE;
    const wx = 2210 + u * 1500;
    const env = (0.14 + 0.86 * Math.pow(u, 1.55)) * Math.max(0.06, flutterRamp);
    const wy = 865 - Math.sin(u * 34 - t * 14) * 86 * env * (1 - sealClamp * 0.55);
    flutterWavePts.push(`${i === 0 ? 'M' : 'L'}${wx.toFixed(1)} ${wy.toFixed(1)}`);

    const wyLag = 865 - Math.sin(u * 34 - t * 14 - 2.2) * 32 * env * cablesHighlight;
    lagCablePts.push(`${i === 0 ? 'M' : 'L'}${wx.toFixed(1)} ${wyLag.toFixed(1)}`);
  }

  return (
    <AbsoluteFill style={{ background: P.bgDeep }}>
      <Cam2D
        x={camX}
        y={camY}
        zoom={camZoom}
        shake={[hx, hy + slamShake]}
        bg={P.bgDeep}
      >
        <svg
          width={4200}
          height={1400}
          viewBox="0 0 4200 1400"
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
        >
          <Defs2D shadow="rgba(6, 12, 24, 0.52)" />

          {/* Nền bàn vẽ kỹ thuật hàng không thống nhất trải dài cả 2 pha */}
          <BlueprintGrid x0={-300} y0={-250} w={4600} h={1900} step={100} id="s10_bp" />

          {/* ==================== PHA 1 (x: 0..1920): HÌNH CHIẾU DƯỚI BỤNG F-15 LEGACY ==================== */}
          <g>
            {/* Vòng thước chia độ la bàn kỹ thuật quanh máy bay */}
            <circle cx={960} cy={535} r={455} fill="none" stroke={P.gridBright} strokeWidth={1.5} opacity={0.28} />
            <circle
              cx={960}
              cy={535}
              r={415}
              fill="none"
              stroke={P.gridBright}
              strokeWidth={1.2}
              strokeDasharray="8 10"
              opacity={0.24}
            />
            <line x1={960} y1={35} x2={960} y2={1035} stroke={P.gridBright} strokeWidth={1.2} opacity={0.24} />
            <line x1={380} y1={625} x2={1540} y2={625} stroke={P.gridBright} strokeWidth={1.2} opacity={0.24} />

            {/* Hình chiếu dưới bụng F-15 cũ (mũi hướng thẳng lên trên rot=-90 => Station 1 bên TRÁI, Station 9 bên PHẢI khớp 100% lời đọc!) */}
            <g filter="url(#sh)">
              <F15Top2D
                legacy
                underside
                highlightSta19={t >= 252.0}
                x={960}
                y={525}
                scale={2.05}
                rot={-90}
              />
            </g>

            {/* Bóng mờ vũ khí ở các mấu trong thân & cánh trong (để đối lập rõ với 2 mấu đầu cánh 1 & 9 bỏ trống!) */}
            <g opacity={0.58}>
              {/* Mấu cánh trong Station 2 (trái) & Station 8 (phải) */}
              <Weapon2D kind="amraam" x={814} y={548} scale={1.75} rot={-90} />
              <Weapon2D kind="amraam" x={1106} y={548} scale={1.75} rot={-90} />
              {/* 4 đạn bán ngầm góc hông thân */}
              <Weapon2D kind="amraam" x={904} y={488} scale={1.6} rot={-90} />
              <Weapon2D kind="amraam" x={1016} y={488} scale={1.6} rot={-90} />
              <Weapon2D kind="amraam" x={904} y={678} scale={1.6} rot={-90} />
              <Weapon2D kind="amraam" x={1016} y={678} scale={1.6} rot={-90} />
            </g>

            {/* Sơ đồ X-quang mạng dây cáp & ròng rọc cơ khí cũ chạy từ buồng lái ra hai cánh (240s - 252s) */}
            {mechTreeFade > 0.01 && (
              <g opacity={mechTreeFade * 0.92}>
                <path
                  d="M960,315 L960,555 L681,625 M960,555 L1239,625 M960,555 L960,885 L810,935 M960,885 L1110,935"
                  fill="none"
                  stroke={P.amber}
                  strokeWidth={7}
                  opacity={0.22}
                  {...drawOn(1250, prog(t, 240.4, 243.5))}
                />
                <path
                  d="M960,315 L960,555 L681,625 M960,555 L1239,625 M960,555 L960,885 L810,935 M960,885 L1110,935"
                  fill="none"
                  stroke={P.amberHot}
                  strokeWidth={2.6}
                  {...drawOn(1250, prog(t, 240.4, 243.5))}
                />
                {[
                  [960, 315],
                  [960, 555],
                  [815, 590],
                  [1105, 590],
                  [681, 625.5],
                  [1239, 625.5],
                ].map(([px, py], idx) => (
                  <g key={idx} transform={`translate(${px} ${py})`}>
                    <circle r={9} fill={P.bgDeep} stroke={P.amberHot} strokeWidth={2.4} />
                    <circle r={3.5} fill={P.amber} />
                  </g>
                ))}
              </g>
            )}

            {/* Hai vòng tiêu điểm sáng khóa vào Station 1 (cánh trái, x=681) và Station 9 (cánh phải, x=1239) */}
            <ReticleFocus x={681.2} y={625.5} label="STA 1" side="left" p={spotSta1} pulse={pulse} />
            <ReticleFocus x={1238.8} y={625.5} label="STA 9" side="right" p={spotSta9} pulse={pulse} />
          </g>

          {/* ==================== PHA 2 (x: 2040..3880): MẶT CẮT CÁNH RUNG XOẮN FLUTTER & CÁP TRỄ PHA ==================== */}
          <g>
            {/* Khung bản vẽ kỹ thuật khu vực thử nghiệm khí đàn hồi */}
            <rect
              x={2100}
              y={70}
              width={1720}
              height={625}
              rx={16}
              fill="rgba(12, 26, 46, 0.72)"
              stroke={P.gridBright}
              strokeWidth={2}
            />

            {/* Các đường dòng khí siêu âm thổi qua mấu đạn đầu cánh */}
            {[165, 235, 310, 445, 535, 605].map((sy, idx) => {
              const drift = ((t * 420 + idx * 190) % 1580);
              return (
                <g key={`wind-${idx}`} opacity={0.48}>
                  <line
                    x1={3760}
                    y1={sy}
                    x2={2210}
                    y2={sy + (idx > 2 ? 18 : -12)}
                    stroke={P.cyan}
                    strokeWidth={1.3}
                    strokeDasharray="24 18"
                  />
                  <line
                    x1={3760 - drift}
                    y1={sy}
                    x2={Math.max(2210, 3650 - drift)}
                    y2={sy}
                    stroke={P.cyanSoft}
                    strokeWidth={3}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* Vách dầm gốc cánh cố định bên trái (x = 2130..2175) */}
            <rect
              x={2128}
              y={160}
              width={46}
              height={380}
              rx={5}
              fill={P.f15Dark}
              stroke={P.ink}
              strokeWidth={3}
            />
            {Array.from({ length: 8 }, (_, i) => (
              <circle key={`rv-${i}`} cx={2151} cy={188 + i * 46} r={5} fill={P.legLight} stroke={P.ink} strokeWidth={1.2} />
            ))}

            {/* 3 LỚP BÓNG CÁNH XOẮN KHÍ ĐÀN HỒI (2 lớp biên uốn-xoắn cực đại + 1 lớp cánh cắt chính đang rung dữ dội) */}
            {activeFlutter > 0.02 && (
              <>
                <OuterWingStoreLayer
                  twistDeg={-11.5 * activeFlutter}
                  plungeY={-62 * activeFlutter}
                  aileronDeg={0}
                  ghostColor={P.red}
                  opacity={0.38 * activeFlutter}
                />
                <OuterWingStoreLayer
                  twistDeg={11.5 * activeFlutter}
                  plungeY={62 * activeFlutter}
                  aileronDeg={0}
                  ghostColor={P.amber}
                  opacity={0.34 * activeFlutter}
                />
              </>
            )}

            <OuterWingStoreLayer
              twistDeg={twistDeg}
              plungeY={plungeY}
              aileronDeg={aileronLagDeg}
            />

            {/* HỆ THỐNG DÂY CÁP THÉP, RÒNG RỌC, THANH ĐẨY & VAN THỦY LỰC CƠ KHÍ BÊN TRONG SƯỜN CÁNH (DI CHUYỂN TRỄ PHA) */}
            <g transform={`translate(2174 350) rotate(${cantileverBendDeg}) translate(-2174 -350)`}>
              {/* Dây cáp thép trên & dưới chạy vòng qua 3 ròng rọc */}
              <line
                x1={2175}
                y1={328}
                x2={2960}
                y2={352}
                stroke={cablesHighlight > 0.1 ? P.amberHot : '#c7d8ea'}
                strokeWidth={3.2}
                strokeDasharray="16 6"
                strokeDashoffset={-cableShift}
              />
              <line
                x1={2175}
                y1={374}
                x2={2960}
                y2={382}
                stroke={cablesHighlight > 0.1 ? P.amber : '#9ab4ce'}
                strokeWidth={3.2}
                strokeDasharray="16 6"
                strokeDashoffset={cableShift}
              />

              {/* 3 cụm ròng rọc cơ khí xoay trễ pha */}
              {[
                [2395, 353, 24],
                [2685, 361, 22],
                [2960, 367, 20],
              ].map(([px, py, pr], idx) => (
                <g key={`pul-${idx}`} transform={`translate(${px} ${py}) rotate(${pulleyRot})`}>
                  <circle
                    r={pr}
                    fill="#1f3550"
                    stroke={cablesHighlight > 0.1 ? P.amberHot : P.legLight}
                    strokeWidth={3}
                  />
                  <line x1={-pr + 4} y1={0} x2={pr - 4} y2={0} stroke={P.amberHot} strokeWidth={2.4} />
                  <line x1={0} y1={-pr + 4} x2={0} y2={pr - 4} stroke={P.amberHot} strokeWidth={2.4} />
                  <circle r={5.5} fill={P.amber} stroke={P.ink} strokeWidth={1.5} />
                </g>
              ))}

              {/* Thanh đẩy (Pushrod) & Cụm van trượt thủy lực cơ khí (Hydraulic Spool Valve) tại x = 3130 */}
              <line
                x1={2960 + cableShift * 0.45}
                y1={367}
                x2={3105 + cableShift * 0.45}
                y2={369}
                stroke={P.ordWhite}
                strokeWidth={6}
                strokeLinecap="round"
              />
              <g transform="translate(3175 370)">
                <rect
                  x={-72}
                  y={-22}
                  width={144}
                  height={44}
                  rx={6}
                  fill="#102033"
                  stroke={cablesHighlight > 0.1 ? P.amberHot : P.legMid}
                  strokeWidth={2.8}
                />
                {/* Con trượt van thủy lực di chuyển trễ pha */}
                <rect
                  x={-28 + cableShift * 0.85}
                  y={-15}
                  width={56}
                  height={30}
                  rx={3}
                  fill={cablesHighlight > 0.1 ? P.amber : P.f15Mid}
                  stroke={P.ink}
                  strokeWidth={1.8}
                />
                {/* Cần xi-lanh đẩy ra cánh liệng */}
                <line
                  x1={72}
                  y1={0}
                  x2={275 + cableShift * 0.6}
                  y2={2}
                  stroke={P.amberHot}
                  strokeWidth={5}
                />
              </g>
            </g>

            {/* Mũi tên xoắn vặn đỏ quanh đầu cánh & điểm nóng ứng suất khi Flutter bùng phát */}
            {activeFlutter > 0.08 && (
              <g opacity={activeFlutter}>
                <path
                  d="M3595,290 A105,105 0 0,1 3595,485"
                  fill="none"
                  stroke={P.red}
                  strokeWidth={9}
                  opacity={0.22}
                />
                <path
                  d="M3595,290 A105,105 0 0,1 3595,485"
                  fill="none"
                  stroke={P.red}
                  strokeWidth={4}
                />
                <polygon points="3595,278 3580,302 3610,300" fill={P.red} />
                <polygon points="3595,497 3580,473 3610,475" fill={P.red} />

                {/* Tia chớp đỏ mỏi xoắn ở gốc mấu đầu cánh */}
                <polyline
                  points="3225,295 3242,328 3228,352 3246,396"
                  fill="none"
                  stroke={P.red}
                  strokeWidth={3.8}
                />
              </g>
            )}

            {/* Chỉ báo độ trễ cơ khí (Cables Lag) bật sáng lúc 274.0s */}
            {cablesHighlight > 0.05 && (
              <g opacity={cablesHighlight * (1 - sealClamp * 0.7)}>
                <rect
                  x={2560}
                  y={112}
                  width={460}
                  height={54}
                  rx={9}
                  fill="#26170b"
                  stroke={P.amber}
                  strokeWidth={2.5}
                />
                <circle cx={2592} cy={139} r={9} fill={P.amber} />
                <text
                  x={2805}
                  y={148}
                  textAnchor="middle"
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={24}
                  fill={P.amberHot}
                  letterSpacing={1.5}
                >
                  CABLE &amp; VALVE PHASE LAG
                </text>
              </g>
            )}

            {/* ==================== BIỂU ĐỒ DAO ĐỘNG KẾ CỘNG HƯỞNG FLUTTER ĐỎ (y: 725..995) ==================== */}
            <g>
              <rect
                x={2100}
                y={725}
                width={1720}
                height={275}
                rx={16}
                fill="#07111f"
                stroke={P.gridBright}
                strokeWidth={2.2}
              />
              {/* Lưới chia dao động kế */}
              {[780, 865, 950].map((gy, idx) => (
                <line
                  key={`hg-${idx}`}
                  x1={2190}
                  y1={gy}
                  x2={3730}
                  y2={gy}
                  stroke={idx === 1 ? P.gridBright : P.grid}
                  strokeWidth={idx === 1 ? 1.8 : 1}
                  opacity={idx === 1 ? 0.55 : 0.3}
                />
              ))}
              {Array.from({ length: 11 }, (_, i) => (
                <line
                  key={`vg-${i}`}
                  x1={2210 + i * 150}
                  y1={748}
                  x2={2210 + i * 150}
                  y2={978}
                  stroke={P.grid}
                  strokeWidth={1}
                  opacity={0.28}
                />
              ))}

              {/* Đường sóng cộng hưởng Flutter đỏ tăng vọt biên độ (vẽ nét kép halo + lõi) */}
              <path
                d={flutterWavePts.join(' ')}
                fill="none"
                stroke={P.red}
                strokeWidth={11}
                opacity={0.22}
              />
              <path
                d={flutterWavePts.join(' ')}
                fill="none"
                stroke={P.red}
                strokeWidth={3.8}
              />

              {/* Đường đáp ứng cáp cơ khí vàng đứt nét bị trễ pha & hụt biên độ (274s+) */}
              {cablesHighlight > 0.02 && (
                <path
                  d={lagCablePts.join(' ')}
                  fill="none"
                  stroke={P.amberHot}
                  strokeWidth={3}
                  strokeDasharray="12 8"
                  opacity={cablesHighlight}
                />
              )}

              {/* Chú giải góc trái màn dao động kế */}
              <circle cx={2242} cy={762} r={7} fill={P.red} />
              <text x={2260} y={769} fontFamily={FONT} fontWeight={700} fontSize={20} fill={P.red} letterSpacing={1.5}>
                FLUTTER RESONANCE
              </text>
              {cablesHighlight > 0.05 && (
                <g opacity={cablesHighlight}>
                  <circle cx={2590} cy={762} r={7} fill={P.amberHot} />
                  <text
                    x={2608}
                    y={769}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={20}
                    fill={P.amberHot}
                    letterSpacing={1.5}
                  >
                    MECHANICAL RESPONSE (LAGGING)
                  </text>
                </g>
              )}
            </g>

            {/* HAI CON DẤU KỸ THUẬT KHÓA ĐỎ ĐÓNG SẬP LÊN STATION 1 & STATION 9 TẠI 281.44s */}
            <TechnicalLockStamp x={2655} y={390} station="STATION 1" scale={stamp1} />
            <TechnicalLockStamp x={3265} y={390} station="STATION 9" scale={stamp9} />
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      <Label
        t={t}
        text="STATIONS 1 & 9"
        x={960}
        y={915}
        from={CUE.s10_sta19Spot}
        until={258.5}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S10;
