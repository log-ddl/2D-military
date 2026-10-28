import React from 'react';
import { bump, H, lerp, prog, W } from '@kit/theme';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { MQ9Top2D } from '../local/uav2d';

// Tọa độ chuẩn tỉ lệ 1:1 (40 px = 1.00 m) trên bàn vẽ kỹ thuật Hangar Top-Down
const CX = 876;
const CY = 446;
const HALF_SPAN = 402.4; // 10.06 m -> tổng sải cánh 804.8 px (20.12 m)
const HALF_LEN = 220;    // 5.50 m  -> tổng chiều dài 440.0 px (11.00 m)
const X_LEFT = CX - HALF_SPAN;   // 473.6
const X_RIGHT = CX + HALF_SPAN;  // 1278.4
const Y_NOSE = CY - HALF_LEN;    // 226
const Y_TAIL = CY + HALF_LEN;    // 666

// Lưới mét tính sẵn ở cấp module (1 m = 40 px, vạch chính 5 m = 200 px)
const MINOR_XS: number[] = [];
for (let x = CX - 800; x <= CX + 960; x += 40) {
  if (Math.round((x - CX) / 40) % 5 !== 0) MINOR_XS.push(x);
}
const MAJOR_XS: number[] = [];
for (let x = CX - 800; x <= CX + 960; x += 200) MAJOR_XS.push(x);

const MINOR_YS: number[] = [];
for (let y = CY - 360; y <= CY + 560; y += 40) {
  if (Math.round((y - CY) / 40) % 5 !== 0) MINOR_YS.push(y);
}
const MAJOR_YS: number[] = [];
for (let y = CY - 360; y <= CY + 560; y += 200) MAJOR_YS.push(y);

const RULER_TICKS_X: { x: number; major: boolean }[] = [];
for (let x = 116; x <= 1804; x += 40) {
  RULER_TICKS_X.push({ x, major: (x - 116) % 200 === 0 });
}
const RULER_TICKS_Y: { y: number; major: boolean }[] = [];
for (let y = 104; y <= 976; y += 40) {
  RULER_TICKS_Y.push({ y, major: (y - 104) % 200 === 0 });
}

/** Bóng người kỹ thuật viên mặt đất đứng cạnh mũi máy bay: cao đúng 1,75 m = 70 px (40 px/m). */
const TechnicianScale2D: React.FC<{ x: number; topY: number }> = ({ x, topY }) => {
  const footY = topY + 70; // đúng 70 px = 1.75 m
  return (
    <g>
      {/* Đế đứng kỹ thuật & Đường gióng tỉ lệ 1.75 m nối sang chóp mũi */}
      <ellipse cx={x} cy={footY} rx={22} ry={6.5} fill={P.boardCard} stroke={P.gridMajor} strokeWidth={1.3} opacity={0.8} />
      <line x1={x - 24} y1={topY} x2={x + 86} y2={topY} stroke={P.laserSoft} strokeWidth={1.4} strokeDasharray="4 4" />
      <line x1={x - 24} y1={footY} x2={x + 28} y2={footY} stroke={P.laserSoft} strokeWidth={1.6} />
      <line x1={x - 19} y1={topY} x2={x - 19} y2={footY} stroke={P.laser} strokeWidth={1.6} opacity={0.85} />
      <line x1={x - 24} y1={topY} x2={x - 14} y2={topY} stroke={P.laser} strokeWidth={2} />
      <line x1={x - 24} y1={footY} x2={x - 14} y2={footY} stroke={P.laser} strokeWidth={2} />

      <ellipse cx={x} cy={footY} rx={11} ry={3.2} fill={P.ink} opacity={0.5} />

      {/* Hình bóng kỹ thuật viên đội mũ bảo hộ tai nghe hàng không (cao chuẩn 70 px) */}
      <g fill={P.uavHighlight} stroke={P.ink} strokeWidth={1.5} strokeLinejoin="round">
        <circle cx={x} cy={topY + 6.5} r={5.6} />
        <rect x={x - 7} y={topY + 4.5} width={2.5} height={4.6} rx={1} fill={P.gold} />
        <rect x={x + 4.5} y={topY + 4.5} width={2.5} height={4.6} rx={1} fill={P.gold} />
        <path
          d={`M ${x - 8.5},${topY + 14}
              C ${x - 10.5},${topY + 14} ${x - 12},${topY + 18} ${x - 11.2},${topY + 28}
              L ${x - 8.5},${topY + 38}
              L ${x + 8.5},${topY + 38}
              L ${x + 12},${topY + 26}
              C ${x + 12},${topY + 17} ${x + 10},${topY + 14} ${x + 8.5},${topY + 14} Z`}
        />
        <rect x={x - 7.6} y={topY + 20.5} width={15.2} height={2.8} fill={P.laser} stroke="none" opacity={0.92} />
        <rect x={x - 7.2} y={topY + 26.8} width={14.4} height={2.5} fill={P.gold} stroke="none" opacity={0.92} />
        <rect x={x + 9.2} y={topY + 23.5} width={6.8} height={9} rx={1.2} fill={P.boardCard} stroke={P.laser} strokeWidth={1.3} />
        <path
          d={`M ${x - 7.4},${topY + 38}
              L ${x - 8.2},${footY - 3}
              L ${x - 2.2},${footY - 3}
              L ${x - 1.2},${topY + 45}
              L ${x + 1.2},${topY + 45}
              L ${x + 2.2},${footY - 3}
              L ${x + 8.2},${footY - 3}
              L ${x + 7.4},${topY + 38} Z`}
          fill={P.uavLight}
        />
        <rect x={x - 9.4} y={footY - 3.5} width={7.4} height={3.5} rx={1.2} fill={P.uavDark} />
        <rect x={x + 2} y={footY - 3.5} width={7.4} height={3.5} rx={1.2} fill={P.uavDark} />
      </g>
    </g>
  );
};

/**
 * Hình chiếu chính diện (Front Orthographic Elevation) tỉ lệ 1:1 theo chiều ngang (804.8 px = 20,12 m),
 * đặt thẳng hàng ngay dưới MQ9Top2D để phô diễn độ mỏng và độ vươn ngoạn mục của sải cánh.
 */
const MQ9FrontOrtho2D: React.FC<{ cx: number; groundY: number; spanGlow: number; loadGlow: number }> = ({
  cx,
  groundY,
  spanGlow,
  loadGlow,
}) => {
  const bodyY = groundY - 46;
  const wingRootY = bodyY + 3;
  const wingTipY = bodyY - 15;

  return (
    <g>
      <line x1={cx - 448} y1={groundY} x2={cx + 448} y2={groundY} stroke={P.gridMajor} strokeWidth={2} />
      {[-400, -200, 0, 200, 400].map((dx) => (
        <line key={dx} x1={cx + dx} y1={groundY} x2={cx + dx} y2={groundY + 8} stroke={P.gridMajor} strokeWidth={1.6} />
      ))}

      {/* Cánh đuôi chữ Y phía sau nhìn chính diện */}
      <polygon
        points={`${cx - 8},${bodyY - 6} ${cx - 78},${groundY - 134} ${cx - 71},${groundY - 136} ${cx - 3},${bodyY - 12}`}
        fill={P.uavDark}
        stroke={P.ink}
        strokeWidth={2}
      />
      <polygon
        points={`${cx + 8},${bodyY - 6} ${cx + 78},${groundY - 134} ${cx + 71},${groundY - 136} ${cx + 3},${bodyY - 12}`}
        fill={P.uavDark}
        stroke={P.ink}
        strokeWidth={2}
      />
      <line x1={cx} y1={bodyY + 14} x2={cx} y2={groundY - 10} stroke={P.uavShadow} strokeWidth={3.5} />

      <circle
        cx={cx}
        cy={bodyY}
        r={51}
        fill="none"
        stroke={P.gold}
        strokeWidth={1.3}
        strokeDasharray="6 6"
        opacity={0.35}
      />

      {/* Càng đáp 3 bánh nhìn chính diện */}
      {[-1, 1].map((s) => (
        <g key={`gear-${s}`}>
          <line x1={cx + s * 16} y1={bodyY + 11} x2={cx + s * 56} y2={groundY - 11} stroke={P.uavMid} strokeWidth={3} />
          <rect
            x={cx + s * 56 - 3.5}
            y={groundY - 21}
            width={7}
            height={21}
            rx={3}
            fill={P.missileBody}
            stroke={P.ink}
            strokeWidth={1.5}
          />
        </g>
      ))}
      <line x1={cx} y1={bodyY + 15} x2={cx} y2={groundY - 8} stroke={P.uavLight} strokeWidth={2.8} />
      <rect x={cx - 3} y={groundY - 16} width={6} height={16} rx={2.5} fill={P.missileBody} stroke={P.ink} strokeWidth={1.5} />

      {/* 6 Giá treo & Vũ khí dưới cánh nhìn chính diện */}
      {[-1, 1].map((s) => {
        const yIn = lerp(wingRootY, wingTipY, 88 / HALF_SPAN);
        const yMid = lerp(wingRootY, wingTipY, 148 / HALF_SPAN);
        const yOut = lerp(wingRootY, wingTipY, 206 / HALF_SPAN);
        return (
          <g key={`ord-${s}`}>
            <rect x={cx + s * 88 - 2} y={yIn + 2} width={4} height={9} fill={P.uavDark} />
            <circle cx={cx + s * 88} cy={yIn + 14} r={5.2} fill={P.oliveMid} stroke={P.ink} strokeWidth={1.6} />
            <circle cx={cx + s * 88} cy={yIn + 14} r={2} fill={P.laser} />

            <rect x={cx + s * 148 - 2} y={yMid + 2} width={4} height={7} fill={P.uavDark} />
            <rect x={cx + s * 148 - 9} y={yMid + 8} width={18} height={3} rx={1} fill={P.uavMid} stroke={P.ink} strokeWidth={1.1} />
            <circle cx={cx + s * 148 - 6} cy={yMid + 14} r={3.6} fill={P.missileBody} stroke={P.ink} strokeWidth={1.3} />
            <circle cx={cx + s * 148 + 6} cy={yMid + 14} r={3.6} fill={P.missileBody} stroke={P.ink} strokeWidth={1.3} />

            <rect x={cx + s * 206 - 1.5} y={yOut + 1.5} width={3} height={6.5} fill={P.uavDark} />

            {loadGlow > 0.01 && (
              <g opacity={loadGlow}>
                <circle cx={cx + s * 88} cy={yIn + 14} r={9.5} fill="none" stroke={P.gold} strokeWidth={2.2} />
                <circle cx={cx + s * 148} cy={yMid + 14} r={11.5} fill="none" stroke={P.flirHot} strokeWidth={2.2} />
                <circle cx={cx + s * 206} cy={yOut + 6} r={7} fill="none" stroke={P.gold} strokeWidth={1.8} />
                {[115, 240, 345].map((wx, idx) => {
                  const wy = lerp(wingRootY, wingTipY, wx / HALF_SPAN);
                  const hArr = (21 - idx * 3) * loadGlow;
                  return (
                    <g key={wx}>
                      <line
                        x1={cx + s * wx}
                        y1={wy + 24}
                        x2={cx + s * wx}
                        y2={wy + 24 - hArr}
                        stroke={P.gold}
                        strokeWidth={2.2}
                      />
                      <polygon
                        points={`${cx + s * wx},${wy + 18 - hArr} ${cx + s * wx - 4.2},${wy + 25 - hArr} ${cx + s * wx + 4.2},${wy + 25 - hArr}`}
                        fill={P.gold}
                      />
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        );
      })}

      {/* Sải cánh mỏng dài 20,12 m */}
      <polygon
        points={`
          ${cx - 19},${wingRootY - 3.6}
          ${cx - HALF_SPAN},${wingTipY - 1.3}
          ${cx - HALF_SPAN},${wingTipY + 1.3}
          ${cx - 19},${wingRootY + 3.6}
          ${cx + 19},${wingRootY + 3.6}
          ${cx + HALF_SPAN},${wingTipY + 1.3}
          ${cx + HALF_SPAN},${wingTipY - 1.3}
          ${cx + 19},${wingRootY - 3.6}
        `}
        fill={P.uavHighlight}
        stroke={P.ink}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      {spanGlow > 0.01 && (
        <>
          <line
            x1={cx - 20}
            y1={wingRootY - 3.5}
            x2={cx - HALF_SPAN}
            y2={wingTipY - 1.3}
            stroke={P.laser}
            strokeWidth={2.8}
            opacity={spanGlow}
          />
          <line
            x1={cx + 20}
            y1={wingRootY - 3.5}
            x2={cx + HALF_SPAN}
            y2={wingTipY - 1.3}
            stroke={P.laser}
            strokeWidth={2.8}
            opacity={spanGlow}
          />
          <circle cx={cx - HALF_SPAN} cy={wingTipY} r={5.2} fill={P.laser} opacity={spanGlow} />
          <circle cx={cx + HALF_SPAN} cy={wingTipY} r={5.2} fill={P.laser} opacity={spanGlow} />
        </>
      )}

      {/* Mặt cắt chính diện thân máy bay + bướu lưng SATCOM + cầu mắt MTS-B dưới cằm */}
      <path
        d={`M ${cx - 20},${bodyY + 3}
            C ${cx - 21},${bodyY - 16} ${cx - 14},${bodyY - 31} ${cx},${bodyY - 31}
            C ${cx + 14},${bodyY - 31} ${cx + 21},${bodyY - 16} ${cx + 20},${bodyY + 3}
            C ${cx + 18},${bodyY + 14} ${cx + 10},${bodyY + 17} ${cx},${bodyY + 17}
            C ${cx - 10},${bodyY + 17} ${cx - 18},${bodyY + 14} ${cx - 20},${bodyY + 3} Z`}
        fill={P.uavLight}
        stroke={P.ink}
        strokeWidth={2.4}
      />
      <ellipse cx={cx} cy={bodyY - 14} rx={12} ry={11} fill={P.uavHighlight} opacity={0.85} />
      <circle cx={cx} cy={bodyY + 23} r={9.2} fill={P.uavDark} stroke={P.ink} strokeWidth={2} />
      <circle cx={cx} cy={bodyY + 23} r={4.2} fill={P.opticGlass} stroke={P.ink} strokeWidth={1.2} />
      <circle cx={cx + 1.5} cy={bodyY + 21.8} r={1.6} fill={P.laser} />
    </g>
  );
};

const S03: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const scanP = prog(t, CUE.s03_blueprint_in - 0.1, CUE.s03_blueprint_in + 1.35);

  const spanExtP = prog(t, CUE.s03_span, CUE.s03_span + 0.28);
  const spanBarP = prog(t, CUE.s03_span + 0.08, CUE.s03_span + 0.54);
  const spanPulse = bump(t, CUE.s03_span, 0.75);

  const lenExtP = prog(t, CUE.s03_length, CUE.s03_length + 0.28);
  const lenBarP = prog(t, CUE.s03_length + 0.08, CUE.s03_length + 0.54);
  const lenPulse = bump(t, CUE.s03_length, 0.75);

  const mtowP = prog(t, CUE.s03_mtow, CUE.s03_mtow + 0.62);
  const mtowPulse = bump(t, CUE.s03_mtow, 0.85);

  const spanFocus = lerp(1, 0.52, prog(t, CUE.s03_length - 0.1, CUE.s03_length + 0.25));
  const lenFocus = lerp(1, 0.56, prog(t, CUE.s03_mtow - 0.1, CUE.s03_mtow + 0.25));

  // Camera 2D chuyển động mượt có chủ đích theo 3 bước đo
  const toLenCam = prog(t, CUE.s03_length - 0.2, CUE.s03_length + 0.65);
  const toMtowCam = prog(t, CUE.s03_mtow - 0.2, CUE.s03_mtow + 0.7);
  const camX = lerp(lerp(905, 954, toLenCam), 960, toMtowCam);
  const camY = lerp(lerp(504, 514, toLenCam), 540, toMtowCam);
  const zoom = lerp(lerp(1.03, 1.015, toLenCam), 1.0, toMtowCam);
  const shake = handheld(t, 1.5, 's03-hangar');

  const toScreen = (wx: number, wy: number): [number, number] => [
    960 + shake[0] + (wx - camX) * zoom,
    540 + shake[1] + (wy - camY) * zoom,
  ];

  const spanBarY = 166;
  const lenBarX = 1400;
  const frontGroundY = 936;

  const [lblSpanX, lblSpanY] = toScreen(CX, 108);
  const [lblLenX, lblLenY] = toScreen(1532, CY);
  const [lblMtowX, lblMtowY] = toScreen(1602, 728);

  return (
    <div style={{ position: 'relative', width: W, height: H, background: P.boardBg, overflow: 'hidden' }}>
      {/* Đặt Defs2D ở hệ tọa độ gốc 1:1 ngoài Cam2D để không xung đột ID filter với Grain khi Cam2D phóng/thu */}
      <Layer style={{ pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(6, 13, 24, 0.58)" />
      </Layer>

      <Cam2D x={camX} y={camY} zoom={zoom} shake={shake} bg={P.boardBg}>
        <Layer>
          <defs>
            <filter id="s03-drop" x="-20%" y="-20%" width="140%" height="160%">
              <feDropShadow dx="0" dy="11" stdDeviation="10" floodColor="rgba(5, 11, 22, 0.62)" />
            </filter>
            <radialGradient id="s03-floor" cx="48%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#1e3959" />
              <stop offset="58%" stopColor={P.boardPanel} />
              <stop offset="100%" stopColor={P.boardBg} />
            </radialGradient>
            <linearGradient id="s03-scan" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P.laser} stopOpacity="0" />
              <stop offset="85%" stopColor={P.laser} stopOpacity="0.14" />
              <stop offset="100%" stopColor={P.laser} stopOpacity="0.45" />
            </linearGradient>
          </defs>

          {/* Mặt sàn kỹ thuật Hangar Orthographic Blueprint */}
          <rect x={-120} y={-120} width={W + 240} height={H + 240} fill={P.boardBg} />
          <rect
            x={76}
            y={64}
            width={1768}
            height={952}
            rx={10}
            fill="url(#s03-floor)"
            stroke={P.gridMajor}
            strokeWidth={2.2}
          />

          {/* Lưới mét phụ (1.0 m = 40 px) và lưới chính (5.0 m = 200 px) */}
          <g opacity={0.55}>
            {MINOR_XS.map((x) => (
              <line key={`mx-${x}`} x1={x} y1={66} x2={x} y2={1014} stroke={P.gridMinor} strokeWidth={1} />
            ))}
            {MINOR_YS.map((y) => (
              <line key={`my-${y}`} x1={78} y1={y} x2={1842} y2={y} stroke={P.gridMinor} strokeWidth={1} />
            ))}
          </g>
          <g opacity={0.78}>
            {MAJOR_XS.map((x) => (
              <line key={`Mjx-${x}`} x1={x} y1={66} x2={x} y2={1014} stroke={P.gridMajor} strokeWidth={1.6} />
            ))}
            {MAJOR_YS.map((y) => (
              <line key={`Mjy-${y}`} x1={78} y1={y} x2={1842} y2={y} stroke={P.gridMajor} strokeWidth={1.6} />
            ))}
          </g>

          {/* Khung bát giác khoang đỗ Hangar, vòng bệ xoay & Trục tâm chuẩn */}
          <polygon
            points={`
              ${CX - 190},${CY - 380}
              ${CX + 190},${CY - 380}
              ${CX + 436},${CY - 168}
              ${CX + 436},${CY + 168}
              ${CX + 190},${CY + 340}
              ${CX - 190},${CY + 340}
              ${CX - 436},${CY + 168}
              ${CX - 436},${CY - 168}
            `}
            fill="none"
            stroke={P.gridMajor}
            strokeWidth={1.5}
            strokeDasharray="10 8"
            opacity={0.46}
          />
          <circle
            cx={CX}
            cy={CY}
            r={422}
            fill="none"
            stroke={P.gridMajor}
            strokeWidth={1.8}
            strokeDasharray="14 10"
            opacity={0.55}
          />
          <circle cx={CX} cy={CY} r={240} fill="none" stroke={P.gridMinor} strokeWidth={1.5} opacity={0.7} />
          {[-290, -264, 248, 274].map((dy) => (
            <path
              key={dy}
              d={`M ${CX - 18},${CY + dy + 8} L ${CX},${CY + dy} L ${CX + 18},${CY + dy + 8}`}
              fill="none"
              stroke={P.gold}
              strokeWidth={1.6}
              opacity={0.36}
            />
          ))}

          <line
            x1={CX}
            y1={84}
            x2={CX}
            y2={992}
            stroke={P.gridMajor}
            strokeWidth={1.5}
            strokeDasharray="20 8 4 8"
            opacity={0.75}
          />
          <line
            x1={108}
            y1={CY}
            x2={1812}
            y2={CY}
            stroke={P.gridMajor}
            strokeWidth={1.5}
            strokeDasharray="20 8 4 8"
            opacity={0.75}
          />

          {/* Đường gióng chiếu thẳng đứng từ Top-Down xuống Front Silhouette */}
          <line
            x1={X_LEFT}
            y1={CY + 12}
            x2={X_LEFT}
            y2={frontGroundY - 62}
            stroke={P.gridMajor}
            strokeWidth={1.4}
            strokeDasharray="6 8"
            opacity={0.52}
          />
          <line
            x1={X_RIGHT}
            y1={CY + 12}
            x2={X_RIGHT}
            y2={frontGroundY - 62}
            stroke={P.gridMajor}
            strokeWidth={1.4}
            strokeDasharray="6 8"
            opacity={0.52}
          />

          {/* Khung viền thước kỹ thuật 4 góc & Các ô ký hiệu bản vẽ */}
          <g>
            {RULER_TICKS_X.map(({ x, major }) => (
              <React.Fragment key={`rx-${x}`}>
                <line x1={x} y1={64} x2={x} y2={64 + (major ? 16 : 8)} stroke={P.gridMajor} strokeWidth={major ? 2 : 1.2} />
                <line
                  x1={x}
                  y1={1016}
                  x2={x}
                  y2={1016 - (major ? 16 : 8)}
                  stroke={P.gridMajor}
                  strokeWidth={major ? 2 : 1.2}
                />
              </React.Fragment>
            ))}
            {RULER_TICKS_Y.map(({ y, major }) => (
              <React.Fragment key={`ry-${y}`}>
                <line x1={76} y1={y} x2={76 + (major ? 16 : 8)} y2={y} stroke={P.gridMajor} strokeWidth={major ? 2 : 1.2} />
                <line
                  x1={1844}
                  y1={y}
                  x2={1844 - (major ? 16 : 8)}
                  y2={y}
                  stroke={P.gridMajor}
                  strokeWidth={major ? 2 : 1.2}
                />
              </React.Fragment>
            ))}
            {[
              [76, 64, 1, 1],
              [1844, 64, -1, 1],
              [76, 1016, 1, -1],
              [1844, 1016, -1, -1],
            ].map(([bx, by, sx, sy], idx) => (
              <path
                key={idx}
                d={`M ${bx},${by + sy * 44} L ${bx},${by} L ${bx + sx * 44},${by}`}
                fill="none"
                stroke={P.laser}
                strokeWidth={3.2}
                opacity={0.85}
              />
            ))}

            {/* Ký hiệu chuẩn chiếu góc thứ 3 góc trên trái */}
            <g transform="translate(148, 126)" opacity={0.86}>
              <rect x={-36} y={-26} width={118} height={52} rx={6} fill={P.boardCard} stroke={P.gridMajor} strokeWidth={1.6} />
              <circle cx={-8} cy={0} r={14} fill="none" stroke={P.laser} strokeWidth={1.8} />
              <circle cx={-8} cy={0} r={6} fill="none" stroke={P.uavLight} strokeWidth={1.6} />
              <line x1={-26} y1={0} x2={68} y2={0} stroke={P.gridMajor} strokeWidth={1.2} strokeDasharray="4 3" />
              <line x1={-8} y1={-18} x2={-8} y2={18} stroke={P.gridMajor} strokeWidth={1.2} strokeDasharray="4 3" />
              <polygon points="22,-7 56,-14 56,14 22,7" fill="none" stroke={P.uavLight} strokeWidth={1.8} />
            </g>

            {/* Ô la bàn trục tọa độ bản vẽ góc trên phải */}
            <g transform="translate(1752, 126)" opacity={0.84}>
              <rect x={-52} y={-26} width={96} height={52} rx={6} fill={P.boardCard} stroke={P.gridMajor} strokeWidth={1.6} />
              <circle cx={-4} cy={0} r={16} fill="none" stroke={P.gridMajor} strokeWidth={1.5} />
              <polygon points="-4,-15 -9,4 -4,0 1,4" fill={P.laser} />
              <line x1={-24} y1={0} x2={16} y2={0} stroke={P.gridMajor} strokeWidth={1.2} />
            </g>

            {/* Mặt cắt biên dạng cánh Laminar & Thước tỉ lệ đồ họa 5 mét (200 px) góc dưới trái */}
            <g transform="translate(122, 888)" opacity={0.88}>
              <rect x={0} y={0} width={224} height={82} rx={7} fill={P.boardCard} stroke={P.gridMajor} strokeWidth={1.6} />
              <path
                d="M 22,34 C 34,20 88,18 198,35 C 138,38 56,41 22,34 Z"
                fill={P.uavMid}
                stroke={P.laser}
                strokeWidth={1.8}
              />
              <line x1={14} y1={34} x2={208} y2={34} stroke={P.gridMajor} strokeWidth={1.1} strokeDasharray="4 3" />
              <g transform="translate(12, 56)">
                {[0, 1, 2, 3, 4].map((k) => (
                  <rect
                    key={k}
                    x={k * 40}
                    y={0}
                    width={40}
                    height={9}
                    fill={k % 2 === 0 ? P.uavLight : P.boardBg}
                    stroke={P.gridMajor}
                    strokeWidth={1.3}
                  />
                ))}
                <line x1={0} y1={-5} x2={0} y2={13} stroke={P.laser} strokeWidth={2} />
                <line x1={200} y1={-5} x2={200} y2={13} stroke={P.laser} strokeWidth={2} />
              </g>
            </g>
          </g>

          {/* Quét sáng mở bản vẽ lúc vào cảnh (22.42s) */}
          {scanP > 0 && scanP < 1 && (
            <rect
              x={80}
              y={lerp(70, 960, scanP) - 70}
              width={1760}
              height={70}
              fill="url(#s03-scan)"
              opacity={Math.sin(scanP * Math.PI)}
            />
          )}

          {/* Bóng người kỹ thuật viên tỉ lệ chuẩn 1,75 m = 70 px đứng cạnh mũi máy bay */}
          <TechnicianScale2D x={CX - 102} topY={Y_NOSE} />

          {/* Hình chiếu chính diện (Front Silhouette) nhỏ gọn thẳng hàng phía dưới */}
          <MQ9FrontOrtho2D cx={CX} groundY={frontGroundY} spanGlow={spanBarP * spanFocus} loadGlow={mtowP} />

          {/* Tâm điểm: MQ-9 Reaper Top-Down Orthographic chuẩn 20,12 m x 11,0 m */}
          <g filter="url(#s03-drop)">
            <MQ9Top2D x={CX} y={CY} scale={1} highlightSpan={spanBarP} highlightLoad={mtowP} />
          </g>

          {/* Đường nhấn mép trước sải cánh 20,12 m khi đo sải cánh (halo kép sắc nét) */}
          {spanBarP > 0.01 && (
            <g opacity={spanBarP * spanFocus}>
              <line x1={CX - 22} y1={CY - 36} x2={X_LEFT} y2={CY - 8} stroke={P.laser} strokeWidth={7} opacity={0.22} />
              <line x1={CX + 22} y1={CY - 36} x2={X_RIGHT} y2={CY - 8} stroke={P.laser} strokeWidth={7} opacity={0.22} />
              <line x1={CX - 22} y1={CY - 36} x2={X_LEFT} y2={CY - 8} stroke={P.laser} strokeWidth={2.4} opacity={0.9} />
              <line x1={CX + 22} y1={CY - 36} x2={X_RIGHT} y2={CY - 8} stroke={P.laser} strokeWidth={2.4} opacity={0.9} />
            </g>
          )}

          {/* LỚP HIỆU ỨNG CUE 3 (27.98s): Mặt cắt X-quang khoang nhiên liệu trong cánh & 6 mấu treo vũ khí 4.763 kg */}
          {mtowP > 0.005 && (
            <g opacity={mtowP}>
              {[-1, 1].map((s) => (
                <g key={`fuel-${s}`}>
                  <polygon
                    points={`
                      ${CX + s * 38},${CY - 22}
                      ${CX + s * 276},${CY - 8}
                      ${CX + s * 276},${CY + 4}
                      ${CX + s * 38},${CY + 12}
                    `}
                    fill={P.gold}
                    fillOpacity={0.36 + 0.16 * mtowPulse}
                    stroke={P.flirWarm}
                    strokeWidth={2}
                  />
                  {[76, 118, 160, 202, 244].map((rx) => {
                    const u = (rx - 38) / (276 - 38);
                    const yTop = lerp(CY - 22, CY - 8, u);
                    const yBot = lerp(CY + 12, CY + 4, u);
                    return (
                      <line
                        key={rx}
                        x1={CX + s * rx}
                        y1={yTop}
                        x2={CX + s * rx}
                        y2={yBot}
                        stroke={P.flirHot}
                        strokeWidth={1.4}
                        opacity={0.75}
                      />
                    );
                  })}
                </g>
              ))}
              <rect
                x={CX - 13}
                y={CY - 82}
                width={26}
                height={118}
                rx={9}
                fill={P.flirHot}
                fillOpacity={0.3 + 0.15 * mtowPulse}
                stroke={P.gold}
                strokeWidth={2}
              />

              {[-1, 1].map((s) => (
                <g key={`hp-${s}`}>
                  <circle cx={CX + s * 88} cy={CY - 6} r={9} fill={P.gold} opacity={0.22} />
                  <circle cx={CX + s * 88} cy={CY - 6} r={4.2} fill={P.gold} />
                  <line x1={CX + s * 88} y1={CY + 14} x2={CX + s * 88} y2={CY + 34} stroke={P.gold} strokeWidth={2.2} />

                  <circle cx={CX + s * 148} cy={CY + 4} r={10} fill={P.flirHot} opacity={0.24} />
                  <circle cx={CX + s * 148} cy={CY + 4} r={4.6} fill={P.flirHot} />
                  <line x1={CX + s * 148} y1={CY + 22} x2={CX + s * 148} y2={CY + 42} stroke={P.flirHot} strokeWidth={2.2} />

                  <circle cx={CX + s * 206} cy={CY + 4} r={15} fill="none" stroke={P.gold} strokeWidth={5} opacity={0.2} />
                  <circle cx={CX + s * 206} cy={CY + 4} r={12} fill="none" stroke={P.gold} strokeWidth={2.4} />
                  <circle cx={CX + s * 206} cy={CY + 4} r={3.6} fill={P.gold} />
                  <line x1={CX + s * 206} y1={CY + 16} x2={CX + s * 206} y2={CY + 36} stroke={P.gold} strokeWidth={2.2} />
                </g>
              ))}

              {mtowPulse > 0.01 && (
                <ellipse
                  cx={CX}
                  cy={CY - 4}
                  rx={lerp(40, 390, 1 - mtowPulse * 0.35)}
                  ry={lerp(24, 96, 1 - mtowPulse * 0.35)}
                  fill="none"
                  stroke={P.flirHot}
                  strokeWidth={2.4}
                  opacity={mtowPulse * 0.65}
                />
              )}
            </g>
          )}

          {/* CUE 1 (24.18s): Thước đo SẢI CÁNH 20,12 M màu P.laser */}
          {spanExtP > 0.005 && (
            <g opacity={spanFocus}>
              <line
                x1={X_LEFT}
                y1={CY - 8}
                x2={X_LEFT}
                y2={lerp(CY - 8, spanBarY - 18, spanExtP)}
                stroke={P.laser}
                strokeWidth={2.4}
                strokeDasharray="7 5"
              />
              <line
                x1={X_RIGHT}
                y1={CY - 8}
                x2={X_RIGHT}
                y2={lerp(CY - 8, spanBarY - 18, spanExtP)}
                stroke={P.laser}
                strokeWidth={2.4}
                strokeDasharray="7 5"
              />

              {[X_LEFT, X_RIGHT].map((wx) => (
                <g key={wx}>
                  <circle cx={wx} cy={CY + 1} r={12 + 5 * spanPulse} fill={P.laser} opacity={0.22} />
                  <circle cx={wx} cy={CY + 1} r={7 + 5 * spanPulse} fill="none" stroke={P.laser} strokeWidth={2.4} />
                  <circle cx={wx} cy={CY + 1} r={3.2} fill={P.laser} />
                </g>
              ))}

              {spanBarP > 0.01 && (
                <g>
                  {/* Quầng sáng halo mềm phía dưới thanh thước */}
                  <path
                    d={`M ${CX} ${spanBarY} L ${X_LEFT} ${spanBarY}`}
                    stroke={P.laser}
                    strokeWidth={11}
                    opacity={0.22}
                    fill="none"
                    {...drawOn(HALF_SPAN, spanBarP)}
                  />
                  <path
                    d={`M ${CX} ${spanBarY} L ${X_RIGHT} ${spanBarY}`}
                    stroke={P.laser}
                    strokeWidth={11}
                    opacity={0.22}
                    fill="none"
                    {...drawOn(HALF_SPAN, spanBarP)}
                  />
                  {/* Nét lõi sắc nét */}
                  <path
                    d={`M ${CX} ${spanBarY} L ${X_LEFT} ${spanBarY}`}
                    stroke={P.laser}
                    strokeWidth={3.6}
                    fill="none"
                    {...drawOn(HALF_SPAN, spanBarP)}
                  />
                  <path
                    d={`M ${CX} ${spanBarY} L ${X_RIGHT} ${spanBarY}`}
                    stroke={P.laser}
                    strokeWidth={3.6}
                    fill="none"
                    {...drawOn(HALF_SPAN, spanBarP)}
                  />
                  {Array.from({ length: 21 }, (_, i) => {
                    const tx = CX + (i - 10) * 40;
                    const active = Math.abs(tx - CX) <= HALF_SPAN * spanBarP;
                    if (!active) return null;
                    const hTick = i % 5 === 0 ? 11 : 6;
                    return (
                      <line
                        key={i}
                        x1={tx}
                        y1={spanBarY - hTick}
                        x2={tx}
                        y2={spanBarY + hTick}
                        stroke={P.laser}
                        strokeWidth={i % 5 === 0 ? 2.4 : 1.5}
                      />
                    );
                  })}
                  {spanBarP > 0.88 && (
                    <>
                      <polygon
                        points={`${X_LEFT},${spanBarY} ${X_LEFT + 16},${spanBarY - 8} ${X_LEFT + 16},${spanBarY + 8}`}
                        fill={P.laser}
                      />
                      <polygon
                        points={`${X_RIGHT},${spanBarY} ${X_RIGHT - 16},${spanBarY - 8} ${X_RIGHT - 16},${spanBarY + 8}`}
                        fill={P.laser}
                      />
                      <line x1={X_LEFT} y1={spanBarY - 16} x2={X_LEFT} y2={spanBarY + 16} stroke={P.laser} strokeWidth={3} />
                      <line x1={X_RIGHT} y1={spanBarY - 16} x2={X_RIGHT} y2={spanBarY + 16} stroke={P.laser} strokeWidth={3} />
                    </>
                  )}
                </g>
              )}
            </g>
          )}

          {/* CUE 2 (26.02s): Thước đo CHIỀU DÀI 11 M màu P.gold từ chóp mũi radome tới chóp cánh quạt đuôi */}
          {lenExtP > 0.005 && (
            <g opacity={lenFocus}>
              <line
                x1={CX}
                y1={Y_NOSE}
                x2={lerp(CX, lenBarX + 18, lenExtP)}
                y2={Y_NOSE}
                stroke={P.gold}
                strokeWidth={2.4}
                strokeDasharray="7 5"
              />
              <line
                x1={CX}
                y1={Y_TAIL}
                x2={lerp(CX, lenBarX + 18, lenExtP)}
                y2={Y_TAIL}
                stroke={P.gold}
                strokeWidth={2.4}
                strokeDasharray="7 5"
              />

              {[Y_NOSE, Y_TAIL].map((wy) => (
                <g key={wy}>
                  <circle cx={CX} cy={wy} r={12 + 5 * lenPulse} fill={P.gold} opacity={0.22} />
                  <circle cx={CX} cy={wy} r={7 + 5 * lenPulse} fill="none" stroke={P.gold} strokeWidth={2.4} />
                  <circle cx={CX} cy={wy} r={3.2} fill={P.gold} />
                </g>
              ))}

              {lenBarP > 0.01 && (
                <g>
                  <path
                    d={`M ${lenBarX} ${CY} L ${lenBarX} ${Y_NOSE}`}
                    stroke={P.gold}
                    strokeWidth={11}
                    opacity={0.22}
                    fill="none"
                    {...drawOn(HALF_LEN, lenBarP)}
                  />
                  <path
                    d={`M ${lenBarX} ${CY} L ${lenBarX} ${Y_TAIL}`}
                    stroke={P.gold}
                    strokeWidth={11}
                    opacity={0.22}
                    fill="none"
                    {...drawOn(HALF_LEN, lenBarP)}
                  />
                  <path
                    d={`M ${lenBarX} ${CY} L ${lenBarX} ${Y_NOSE}`}
                    stroke={P.gold}
                    strokeWidth={3.6}
                    fill="none"
                    {...drawOn(HALF_LEN, lenBarP)}
                  />
                  <path
                    d={`M ${lenBarX} ${CY} L ${lenBarX} ${Y_TAIL}`}
                    stroke={P.gold}
                    strokeWidth={3.6}
                    fill="none"
                    {...drawOn(HALF_LEN, lenBarP)}
                  />
                  {Array.from({ length: 12 }, (_, i) => {
                    const ty = Y_NOSE + i * 40;
                    const active = Math.abs(ty - CY) <= HALF_LEN * lenBarP;
                    if (!active) return null;
                    const wTick = i === 0 || i === 11 || i === 5 ? 11 : 6;
                    return (
                      <line
                        key={i}
                        x1={lenBarX - wTick}
                        y1={ty}
                        x2={lenBarX + wTick}
                        y2={ty}
                        stroke={P.gold}
                        strokeWidth={wTick > 6 ? 2.4 : 1.5}
                      />
                    );
                  })}
                  {lenBarP > 0.88 && (
                    <>
                      <polygon
                        points={`${lenBarX},${Y_NOSE} ${lenBarX - 8},${Y_NOSE + 16} ${lenBarX + 8},${Y_NOSE + 16}`}
                        fill={P.gold}
                      />
                      <polygon
                        points={`${lenBarX},${Y_TAIL} ${lenBarX - 8},${Y_TAIL - 16} ${lenBarX + 8},${Y_TAIL - 16}`}
                        fill={P.gold}
                      />
                      <line x1={lenBarX - 16} y1={Y_NOSE} x2={lenBarX + 16} y2={Y_NOSE} stroke={P.gold} strokeWidth={3} />
                      <line x1={lenBarX - 16} y1={Y_TAIL} x2={lenBarX + 16} y2={Y_TAIL} stroke={P.gold} strokeWidth={3} />
                    </>
                  )}
                </g>
              )}
            </g>
          )}

          {/* CUE 3 (27.98s): Đồng hồ / Biểu đồ lực nâng & tải trọng cất cánh tối đa (MTOW Gauge) góc dưới phải */}
          {mtowP > 0.005 && (
            <g transform="translate(1402, 784)" opacity={Math.min(1, mtowP * 1.6)} filter="url(#s03-drop)">
              <rect
                x={0}
                y={0}
                width={400}
                height={182}
                rx={12}
                fill={P.boardCard}
                stroke={P.flirHot}
                strokeWidth={2.4}
              />
              <g transform="translate(90, 112)">
                <path
                  d="M -56,12 A 58,58 0 1,1 56,12"
                  fill="none"
                  stroke={P.boardBg}
                  strokeWidth={14}
                  strokeLinecap="round"
                />
                <path
                  d="M -56,12 A 58,58 0 1,1 56,12"
                  fill="none"
                  stroke={P.gold}
                  strokeWidth={12}
                  strokeLinecap="round"
                  {...drawOn(210, mtowP * 0.72)}
                />
                <path
                  d="M 15,-55 A 58,58 0 0,1 56,12"
                  fill="none"
                  stroke={P.flirHot}
                  strokeWidth={17}
                  opacity={0.25}
                  strokeLinecap="round"
                  {...drawOn(80, prog(t, CUE.s03_mtow + 0.28, CUE.s03_mtow + 0.62))}
                />
                <path
                  d="M 15,-55 A 58,58 0 0,1 56,12"
                  fill="none"
                  stroke={P.flirHot}
                  strokeWidth={12}
                  strokeLinecap="round"
                  {...drawOn(80, prog(t, CUE.s03_mtow + 0.28, CUE.s03_mtow + 0.62))}
                />
                <g transform={`rotate(${lerp(-102, 72, mtowP)})`}>
                  <line x1={0} y1={8} x2={0} y2={-46} stroke={P.paper} strokeWidth={3.4} strokeLinecap="round" />
                  <circle cx={0} cy={0} r={6} fill={P.flirHot} stroke={P.ink} strokeWidth={1.8} />
                </g>
                <polygon points="0,-23 -8,-9 8,-9" fill={P.laser} opacity={0.88} />
              </g>

              <g transform="translate(180, 32)">
                {[
                  { y: 0, fill: P.uavHighlight, ratio: 0.47, delay: 0 },
                  { y: 44, fill: P.gold, ratio: 0.85, delay: 0.1 },
                  { y: 88, fill: P.flirHot, ratio: 1.0, delay: 0.2 },
                ].map((bar, idx) => {
                  const bp = prog(t, CUE.s03_mtow + bar.delay, CUE.s03_mtow + bar.delay + 0.48);
                  const maxW = 188;
                  return (
                    <g key={idx} transform={`translate(0, ${bar.y})`}>
                      <circle cx={-12} cy={12} r={5} fill={bar.fill} />
                      <rect x={0} y={2} width={maxW} height={20} rx={5} fill={P.boardBg} stroke={P.gridMajor} strokeWidth={1.4} />
                      <rect
                        x={2}
                        y={4}
                        width={Math.max(0, (maxW - 4) * bar.ratio * bp)}
                        height={16}
                        rx={4}
                        fill={bar.fill}
                      />
                    </g>
                  );
                })}
                <line x1={188} y1={-6} x2={188} y2={116} stroke={P.flirHot} strokeWidth={2.6} strokeDasharray="5 4" />
              </g>
            </g>
          )}
        </Layer>
      </Cam2D>

      <Grain opacity={0.38} />

      {/* Nhãn thông số bật tuần tự, tuyệt đối không chồng thời gian */}
      <Label
        t={t}
        text="20,12 M"
        x={lblSpanX}
        y={lblSpanY}
        from={CUE.s03_span}
        until={25.55}
        size={52}
        bg={P.paper}
        fg={P.ink}
      />
      <Label
        t={t}
        text="11 M"
        x={lblLenX}
        y={lblLenY}
        from={CUE.s03_length}
        until={27.45}
        size={52}
        bg={P.paper}
        fg={P.ink}
      />
      <Label
        t={t}
        text="4.763 KG"
        x={lblMtowX}
        y={lblMtowY}
        from={CUE.s03_mtow}
        until={29.65}
        size={52}
        bg={P.paper}
        fg={P.ink}
      />
    </div>
  );
};

export default S03;
