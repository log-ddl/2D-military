import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { useT, prog, lerp, bump, useSpring } from '@core/time';
import { useSize, Layer, handheld } from '@core/frame';
import { Defs2D, Cam2D, Grain } from '@skill/military/2d/look';
import { drawOn } from '@skill/military/2d/path';
import { skyline } from '@skill/military/2d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { AbramsSide2D, Shell120Icon2D } from '../parts/Abrams2D';

// Lưới toạ độ bản vẽ kỹ thuật 2D tính một lần ở cấp module
const GRID_MAJOR_X = Array.from({ length: 21 }, (_, i) => i * 120);
const GRID_MAJOR_Y = Array.from({ length: 13 }, (_, i) => i * 120);
const GRID_MINOR_X = Array.from({ length: 81 }, (_, i) => i * 30);
const GRID_MINOR_Y = Array.from({ length: 46 }, (_, i) => i * 30);
const PROTRACTOR_TICKS = Array.from({ length: 36 }, (_, i) => (i * 10 * Math.PI) / 180);
const BAROMETER_TICKS = Array.from({ length: 11 }, (_, i) => -135 + i * 27);
const SUN_RAYS_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);
const SOLAR_HEAT_SHAFTS = [1195, 1258, 1321, 1384, 1447, 1510, 1573] as const;

/** Đường nét kép phát sáng kỹ thuật (halo mờ bản rộng + lõi sáng sắc nét — không dùng SVG filter trong Cam2D). */
const GlowPath: React.FC<{
  d: string;
  color: string;
  coreColor?: string;
  width?: number;
  haloWidth?: number;
  len?: number;
  p?: number;
  opacity?: number;
  dash?: string;
}> = ({ d, color, coreColor, width = 3, haloWidth = 10, len, p = 1, opacity = 1, dash }) => {
  if (p <= 0.002 || opacity <= 0.002) return null;
  const drawProps = len !== undefined ? drawOn(len, p) : dash ? { strokeDasharray: dash } : {};
  return (
    <g opacity={opacity}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={haloWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.24}
        {...drawProps}
      />
      <path
        d={d}
        fill="none"
        stroke={coreColor ?? color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        {...drawProps}
      />
    </g>
  );
};

const C01S09: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // Lớp chân trời địa hình kỹ thuật nhiều lớp ở đáy sơ đồ (tạo chiều sâu không gian, không để nền phẳng trống)
  const bgHills = useMemo(
    () => ({
      far: skyline('mrs-far', -200, 2600, 742, 82, 680, 1400),
      mid: skyline('mrs-mid', -200, 2600, 770, 46, 520, 1400),
    }),
    [],
  );

  // Độ võng nhiệt đầu nòng pháo M256 khi nắng sa mạc nung giãn nở lưng trên ống thép (0 -> 15.8 px)
  const pHeat = prog(t, CUE.c01_s09_hot_sun - 0.15, CUE.c01_s09_top_expand + 0.45);
  const pExpand = prog(t, CUE.c01_s09_top_expand - 0.2, CUE.c01_s09_barrel_droop + 0.15);
  const pDroop = prog(t, CUE.c01_s09_top_expand + 0.3, 155.02);
  const droopPx = 15.8 * pDroop;

  // Chuyển động <Cam2D>:
  // Nửa đầu (139.00–145.75 s): Giữ trọn sơ đồ cân đối với cả 4 biểu tượng cảm biến & cung đạn đạo đầu ra.
  // Nửa sau (145.75–155.60 s): Đẩy zoom cận dọc suốt chiều dài nòng pháo M256 & gương đầu nòng MRS.
  const zToBarrel = prog(t, 145.75, 147.85);
  const camX = lerp(1025, 1388, zToBarrel);
  const camY = lerp(486, 488, zToBarrel);
  const camZoom = lerp(1.13, 2.16, zToBarrel);
  const shake = handheld(t, lerp(2.0, 1.0, zToBarrel), 'c01s09');

  // Tiến độ bật sáng khối máy tính hoả lực & 4 biểu tượng cảm biến hình học (không dùng <text> SVG!)
  const sComp = useSpring(t, CUE.c01_s09_computer - 0.1, 12, 150);
  const sWind = useSpring(t, CUE.c01_s09_crosswind - 0.08, 12, 160);
  const sPres = useSpring(t, CUE.c01_s09_pressure - 0.08, 12, 160);
  const sTemp = useSpring(t, CUE.c01_s09_ammo_temp - 0.08, 12, 160);
  const sTilt = useSpring(t, CUE.c01_s09_track_tilt - 0.08, 12, 160);

  const pWindLine = prog(t, CUE.c01_s09_crosswind, CUE.c01_s09_crosswind + 0.68);
  const pPresLine = prog(t, CUE.c01_s09_pressure, CUE.c01_s09_pressure + 0.68);
  const pTempLine = prog(t, CUE.c01_s09_ammo_temp, CUE.c01_s09_ammo_temp + 0.68);
  const pTiltLine = prog(t, CUE.c01_s09_track_tilt, CUE.c01_s09_track_tilt + 0.68);

  // Thu gọn hoàn toàn 4 huy hiệu cảm biến Nửa đầu khi máy quay đã zoom sâu vào đầu nòng MRS để mép trên không dính bóng mờ
  const sensorsAlpha = 1 - prog(t, 146.0, 147.35);
  const halfOneHudAlpha = (1 - prog(t, 145.8, 147.2)) * prog(t, CUE.c01_s09_computer, CUE.c01_s09_computer + 0.8);

  // Toạ độ chính xác trên <AbramsSide2D x={920} y={770} scale={1.22} />
  const tankX = 920;
  const tankY = 770;
  const sc = 1.22;
  const compX = tankX + 40 * sc; // 968.8 (Tâm máy tính hoả lực trong tháp pháo)
  const compY = tankY - 205 * sc; // 519.9
  const gpsX = tankX + 136 * sc; // 1085.9 (Cửa kính ngắm chính GPS)
  const gpsY = tankY - 255 * sc; // 458.9
  const mantletX = tankX + 195 * sc; // 1157.9 (Gốc nòng pháo M256)
  const boreZeroY = tankY - 196 * sc; // 530.9 (Trục nòng chuẩn 0 độ khi chưa võng nhiệt)
  const muzzleX = tankX + 581 * sc; // 1628.8 (Miệng nòng pháo M256)
  const droopWorld = droopPx * sc; // Độ võng đầu nòng theo toạ độ thế giới (~0 -> 19.3 px)
  const mrsX = tankX + 575 * sc; // 1621.5 (Gương đầu nòng MRS)
  const mrsY = tankY + (-213 + droopPx) * sc; // ~510.1 + droopWorld

  // Nửa sau: Tia laser cyan kiểm chuẩn từ GPS tới gương đầu nòng MRS
  const pMrsCallout = prog(t, CUE.c01_s09_barrel_tip - 0.1, CUE.c01_s09_barrel_tip + 0.6);
  const pMrsLaserOut = prog(t, CUE.c01_s09_barrel_tip + 0.2, CUE.c01_s09_mrs - 0.25);
  const pMrsLaserRet = prog(t, CUE.c01_s09_mrs - 0.35, CUE.c01_s09_mrs + 0.45);
  const mrsPulse = bump(t, CUE.c01_s09_mrs, 1.3);

  // Điểm phản xạ tia laser MRS quay về hộp GPS bị lệch góc 2*theta rõ rệt khi đầu nòng cong xuống
  const gpsReturnY = gpsY + 6 + droopWorld * 2.55;

  return (
    <AbsoluteFill style={{ background: PAL.bgDeep }}>
      {/* Đặt <Defs2D /> NGOÀI <Cam2D> đúng chuẩn kỹ thuật */}
      <Layer style={{ pointerEvents: 'none' }}>
        <Defs2D shadow="rgba(6, 10, 18, 0.52)" />
      </Layer>

      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL.bg}>
        <svg width={2400} height={1350} viewBox="0 0 2400 1350" style={{ overflow: 'visible' }}>
          {/* ==================== 1. NỀN BẢN VẼ KỸ THUẬT ĐA LỚP & ĐƯỜNG CHÂN TRỜI ==================== */}
          <rect x={-300} y={-200} width={3000} height={1750} fill={PAL.bg} />
          <ellipse cx={1060} cy={495} rx={880} ry={480} fill={PAL.panel} opacity={0.76} />

          {/* Lưới tiểu phân 30 px & lưới chính 120 px */}
          <g opacity={0.28}>
            {GRID_MINOR_X.map((gx) => (
              <line key={`mx${gx}`} x1={gx} y1={-120} x2={gx} y2={1260} stroke={PAL.grid} strokeWidth={1} />
            ))}
            {GRID_MINOR_Y.map((gy) => (
              <line key={`my${gy}`} x1={-120} y1={gy} x2={2520} y2={gy} stroke={PAL.grid} strokeWidth={1} />
            ))}
          </g>
          <g opacity={0.45}>
            {GRID_MAJOR_X.map((gx) => (
              <line key={`Gx${gx}`} x1={gx} y1={-120} x2={gx} y2={1260} stroke={PAL.gridBright} strokeWidth={1.4} />
            ))}
            {GRID_MAJOR_Y.map((gy) => (
              <line key={`Gy${gy}`} x1={-120} y1={gy} x2={2520} y2={gy} stroke={PAL.gridBright} strokeWidth={1.4} />
            ))}
          </g>

          {/* Vòng chia độ radar / máy tính đường đạn đồng tâm quanh tháp pháo */}
          <g transform={`translate(${compX} ${compY})`} opacity={0.34}>
            {[230, 395, 560].map((r, ri) => (
              <circle
                key={r}
                r={r}
                fill="none"
                stroke={ri === 1 ? PAL.gridBright : PAL.grid}
                strokeWidth={ri === 1 ? 1.9 : 1.3}
                strokeDasharray={ri === 2 ? '10 8' : undefined}
              />
            ))}
            {PROTRACTOR_TICKS.map((a, idx) => (
              <line
                key={idx}
                x1={Math.cos(a) * 383}
                y1={Math.sin(a) * 383}
                x2={Math.cos(a) * 407}
                y2={Math.sin(a) * 407}
                stroke={PAL.gridBright}
                strokeWidth={idx % 3 === 0 ? 2.2 : 1.2}
              />
            ))}
          </g>

          {/* Dải địa hình cắt dọc nhiều lớp ở chân bản vẽ */}
          <path d={bgHills.far} fill="#101c2b" stroke={PAL.grid} strokeWidth={1.5} opacity={0.85} />
          <path d={bgHills.mid} fill="#0a131e" stroke={PAL.gridBright} strokeWidth={2} opacity={0.95} />
          <line x1={120} y1={tankY + 2} x2={2080} y2={tankY + 2} stroke={PAL.gridBright} strokeWidth={2.4} strokeDasharray="16 8" />

          {/* Đường gióng kích thước chuẩn kỹ thuật bên dưới thân xe giúp cân bố cục Nửa đầu */}
          {halfOneHudAlpha > 0.02 && (
            <g opacity={halfOneHudAlpha * 0.72}>
              <line x1={437} y1={832} x2={1629} y2={832} stroke={PAL.gridBright} strokeWidth={2} />
              <line x1={437} y1={816} x2={437} y2={848} stroke={PAL.cyan} strokeWidth={2.5} />
              <line x1={1404} y1={816} x2={1404} y2={848} stroke={PAL.gridBright} strokeWidth={2} />
              <line x1={1629} y1={816} x2={1629} y2={848} stroke={PAL.amber} strokeWidth={2.5} />

              {/* Cung giải bài toán góc bắn đầu ra phía trước miệng pháo cân đối cánh phải của sơ đồ */}
              <GlowPath
                d={`M ${muzzleX + 10} ${boreZeroY} Q 1735 ${boreZeroY - 16} 1835 ${boreZeroY - 46}`}
                color={PAL.amber}
                coreColor={PAL.amberHot}
                width={2.8}
                haloWidth={9}
                dash="12 7"
                opacity={pTiltLine > 0.1 ? 0.95 : 0.45}
              />
              <line
                x1={muzzleX + 10}
                y1={boreZeroY}
                x2={1835}
                y2={boreZeroY}
                stroke={PAL.gridBright}
                strokeWidth={1.8}
                strokeDasharray="6 6"
              />
              <path
                d={`M 1765 ${boreZeroY} A 145 145 0 0 0 1760 ${boreZeroY - 26}`}
                fill="none"
                stroke={PAL.cyan}
                strokeWidth={2.8}
              />
              <g transform={`translate(1835 ${boreZeroY - 46})`}>
                <circle r={18} fill="none" stroke={PAL.amberHot} strokeWidth={2.4} />
                <line x1={-25} y1={0} x2={25} y2={0} stroke={PAL.amberHot} strokeWidth={1.8} />
                <line x1={0} y1={-25} x2={0} y2={25} stroke={PAL.amberHot} strokeWidth={1.8} />
              </g>
            </g>
          )}

          {/* ==================== 2. HÌNH CHIẾU KỸ THUẬT M1A2 ABRAMS 1:1 ==================== */}
          <g filter="url(#sh)">
            <AbramsSide2D x={tankX} y={tankY} scale={sc} camo="desert" barrelDroopPx={droopPx} />
          </g>

          {/* ==================== 3. KHỐI MÁY TÍNH HOẢ LỰC TRUNG TÂM TRONG THÁP PHÁO ==================== */}
          {t >= CUE.c01_s09_computer - 0.15 && (
            <g transform={`translate(${compX} ${compY}) scale(${Math.max(0.01, sComp)})`}>
              <circle r={46} fill={PAL.amber} opacity={0.18 + 0.08 * Math.sin(t * 7)} />
              <polygon
                points="-30,-17 -17,-30 17,-30 30,-17 30,17 17,30 -17,30 -30,17"
                fill={PAL.panelHi}
                stroke={PAL.amberHot}
                strokeWidth={3.4}
              />
              <rect x={-16} y={-16} width={32} height={32} rx={4} fill={PAL.bgDeep} stroke={PAL.cyan} strokeWidth={2.4} />
              {[-8, 0, 8].map((off) => (
                <g key={off} stroke={PAL.amberHot} strokeWidth={2.2}>
                  <line x1={off} y1={-24} x2={off} y2={-16} />
                  <line x1={off} y1={16} x2={off} y2={24} />
                  <line x1={-24} y1={off} x2={-16} y2={off} />
                  <line x1={16} y1={off} x2={24} y2={off} />
                </g>
              ))}
              <circle r={7} fill={PAL.amberHot} />
              <circle
                r={38}
                fill="none"
                stroke={PAL.cyan}
                strokeWidth={2.2}
                strokeDasharray="14 10"
                transform={`rotate(${(t - 140) * 42})`}
              />
            </g>
          )}

          {/* ==================== 4. NỬA ĐẦU: 4 BIỂU TƯỢNG VECTOR CẢM BIẾN CÂN ĐỐI & XUNG DỮ LIỆU ==================== */}
          <g opacity={sensorsAlpha}>
            {/* 4A. Gió ngang lượn sóng (Crosswind — PAL.cyan) */}
            {t >= CUE.c01_s09_crosswind - 0.08 && (
              <g>
                <path
                  d={`M ${tankX - 270 * sc} ${tankY - 255 * sc} L 475 380 L 475 362`}
                  fill="none"
                  stroke={PAL.cyan}
                  strokeWidth={1.8}
                  strokeDasharray="6 6"
                  opacity={0.55 * pWindLine}
                />
                <GlowPath
                  d={`M 547 290 L 690 290 L 825 425 L ${compX - 28} ${compY - 12}`}
                  color={PAL.cyan}
                  coreColor={PAL.cyanSoft}
                  width={3.4}
                  haloWidth={12}
                  len={530}
                  p={pWindLine}
                />
                {pWindLine > 0.05 && (
                  <circle
                    cx={lerp(547, compX - 28, (t * 1.35) % 1)}
                    cy={((t * 1.35) % 1) < 0.34 ? 290 : lerp(290, compY - 12, (((t * 1.35) % 1) - 0.34) / 0.66)}
                    r={6}
                    fill="#ffffff"
                  />
                )}
                <g transform={`translate(475 290) scale(${Math.max(0.01, sWind)})`} filter="url(#sh)">
                  <circle r={72} fill={PAL.panelHi} stroke={PAL.ink} strokeWidth={4.2} />
                  <circle r={66} fill={PAL.bgDeep} stroke={PAL.cyan} strokeWidth={3.4} />
                  <line x1={-38} y1={-36} x2={-38} y2={36} stroke={PAL.steelMid} strokeWidth={3.8} strokeLinecap="round" />
                  <circle cx={-38} cy={-36} r={5.5} fill={PAL.cyan} />
                  {[-22, 0, 22].map((wy, wi) => {
                    const shift = Math.sin(t * 5 + wi * 1.2) * 3.5;
                    return (
                      <g key={wy} transform={`translate(2 ${wy})`}>
                        <path
                          d={`M -28 0 Q -9 ${-11 + shift} 9 0 T 36 0`}
                          fill="none"
                          stroke={wi === 1 ? PAL.cyanSoft : PAL.cyan}
                          strokeWidth={4}
                          strokeLinecap="round"
                        />
                        <polyline
                          points="29,-6.5 39,0 29,6.5"
                          fill="none"
                          stroke={wi === 1 ? PAL.cyanSoft : PAL.cyan}
                          strokeWidth={3.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })}
                </g>
              </g>
            )}

            {/* 4B. Đồng hồ áp suất khí quyển (Air Pressure — PAL.steelLight) */}
            {t >= CUE.c01_s09_pressure - 0.08 && (
              <g>
                <GlowPath
                  d={`M 815 282 L 815 366 L 912 478 L ${compX - 16} ${compY - 24}`}
                  color={PAL.steelLight}
                  coreColor={PAL.white}
                  width={3.4}
                  haloWidth={12}
                  len={350}
                  p={pPresLine}
                />
                {pPresLine > 0.05 && (
                  <circle
                    cx={lerp(815, compX - 16, ((t * 1.25 + 0.3) % 1))}
                    cy={lerp(282, compY - 24, ((t * 1.25 + 0.3) % 1))}
                    r={5.5}
                    fill={PAL.white}
                  />
                )}
                <g transform={`translate(815 210) scale(${Math.max(0.01, sPres)})`} filter="url(#sh)">
                  <circle r={72} fill={PAL.panelHi} stroke={PAL.ink} strokeWidth={4.2} />
                  <circle r={66} fill={PAL.bgDeep} stroke={PAL.steelLight} strokeWidth={3.4} />
                  <path d="M -41 24 A 47 47 0 1 1 41 24" fill="none" stroke={PAL.gridBright} strokeWidth={5.5} strokeLinecap="round" />
                  <path d="M 4 -47 A 47 47 0 0 1 41 24" fill="none" stroke={PAL.cyan} strokeWidth={5.5} strokeLinecap="round" />
                  {BAROMETER_TICKS.map((degAng) => {
                    const rad = ((degAng - 90) * Math.PI) / 180;
                    return (
                      <line
                        key={degAng}
                        x1={Math.cos(rad) * 36}
                        y1={Math.sin(rad) * 36 + 4}
                        x2={Math.cos(rad) * 47}
                        y2={Math.sin(rad) * 47 + 4}
                        stroke={PAL.white}
                        strokeWidth={2.4}
                      />
                    );
                  })}
                  {[-16, 16].map((ax) => (
                    <g key={ax} transform={`translate(${ax} 34)`} stroke={PAL.cyanSoft} strokeWidth={2.8} strokeLinecap="round">
                      <line x1={0} y1={-9} x2={0} y2={7} />
                      <polyline points="-5,2 0,8 5,2" fill="none" />
                    </g>
                  ))}
                  <g transform={`translate(0 4) rotate(${lerp(-65, 38, prog(t, CUE.c01_s09_pressure, CUE.c01_s09_pressure + 0.9)) + Math.sin(t * 4) * 2.5})`}>
                    <line x1={0} y1={8} x2={0} y2={-37} stroke={PAL.amberHot} strokeWidth={4.2} strokeLinecap="round" />
                    <circle r={7} fill={PAL.steelLight} stroke={PAL.ink} strokeWidth={2} />
                  </g>
                </g>
              </g>
            )}

            {/* 4C. Nhiệt kế buồng đạn (Ammo Temperature — PAL.amber) */}
            {t >= CUE.c01_s09_ammo_temp - 0.08 && (
              <g>
                <GlowPath
                  d={`M 1175 282 L 1175 366 L 1038 475 L ${compX + 20} ${compY - 22}`}
                  color={PAL.amber}
                  coreColor={PAL.amberHot}
                  width={3.4}
                  haloWidth={12}
                  len={355}
                  p={pTempLine}
                />
                {pTempLine > 0.05 && (
                  <circle
                    cx={lerp(1175, compX + 20, ((t * 1.3 + 0.6) % 1))}
                    cy={lerp(282, compY - 22, ((t * 1.3 + 0.6) % 1))}
                    r={5.5}
                    fill={PAL.amberHot}
                  />
                )}
                <path
                  d={`M 1103 210 L 725 210 L 725 ${tankY - 220 * sc}`}
                  fill="none"
                  stroke={PAL.amber}
                  strokeWidth={1.8}
                  strokeDasharray="6 6"
                  opacity={0.5 * pTempLine}
                />
                <g transform={`translate(1175 210) scale(${Math.max(0.01, sTemp)})`} filter="url(#sh)">
                  <circle r={72} fill={PAL.panelHi} stroke={PAL.ink} strokeWidth={4.2} />
                  <circle r={66} fill={PAL.bgDeep} stroke={PAL.amber} strokeWidth={3.4} />
                  <Shell120Icon2D x={-21} y={6} scale={0.25} rotDeg={-90} kind="m829a4" />
                  <g transform="translate(17 0)">
                    <rect x={-8.5} y={-41} width={17} height={60} rx={8.5} fill={PAL.panel} stroke={PAL.steelLight} strokeWidth={2.8} />
                    <circle cx={0} cy={26} r={15} fill={PAL.panel} stroke={PAL.steelLight} strokeWidth={2.8} />
                    <rect
                      x={-4.2}
                      y={lerp(10, -30, prog(t, CUE.c01_s09_ammo_temp, CUE.c01_s09_ammo_temp + 0.85))}
                      width={8.4}
                      height={lerp(16, 56, prog(t, CUE.c01_s09_ammo_temp, CUE.c01_s09_ammo_temp + 0.85))}
                      rx={4.2}
                      fill={PAL.amber}
                    />
                    <circle cx={0} cy={26} r={9.5} fill={PAL.crimson} />
                    {[-30, -19, -8, 3].map((ty) => (
                      <line key={ty} x1={12} y1={ty} x2={21} y2={ty} stroke={PAL.amberHot} strokeWidth={2.4} strokeLinecap="round" />
                    ))}
                  </g>
                </g>
              </g>
            )}

            {/* 4D. Thước đo góc nghiêng ngang dải xích (Track Tilt — PAL.amberHot) */}
            {t >= CUE.c01_s09_track_tilt - 0.08 && (
              <g>
                <GlowPath
                  d={`M 507 586 L 665 586 L 765 520 L ${compX - 28} ${compY}`}
                  color={PAL.amberHot}
                  coreColor="#ffffff"
                  width={3.4}
                  haloWidth={12}
                  len={495}
                  p={pTiltLine}
                />
                {pTiltLine > 0.05 && (
                  <circle
                    cx={lerp(507, compX - 28, ((t * 1.4 + 0.15) % 1))}
                    cy={((t * 1.4 + 0.15) % 1) < 0.36 ? 586 : lerp(586, compY, (((t * 1.4 + 0.15) % 1) - 0.36) / 0.64)}
                    r={6}
                    fill={PAL.amberHot}
                  />
                )}
                <g transform={`translate(435 586) scale(${Math.max(0.01, sTilt)})`} filter="url(#sh)">
                  <circle r={72} fill={PAL.panelHi} stroke={PAL.ink} strokeWidth={4.2} />
                  <circle r={66} fill={PAL.bgDeep} stroke={PAL.amberHot} strokeWidth={3.4} />
                  <line x1={-49} y1={22} x2={49} y2={22} stroke={PAL.gridBright} strokeWidth={2.6} strokeDasharray="6 4" />
                  <path d="M 18 22 A 36 36 0 0 0 12 2" fill="none" stroke={PAL.cyan} strokeWidth={4.2} />
                  <g transform={`translate(0 20) rotate(${-15 + Math.sin(t * 3.6) * 2})`}>
                    <line x1={-47} y1={0} x2={47} y2={0} stroke={PAL.amberHot} strokeWidth={3.6} strokeLinecap="round" />
                    <rect x={-38} y={-15} width={17} height={15} rx={3} fill={PAL.steelDark} stroke={PAL.amberHot} strokeWidth={2.5} />
                    <rect x={21} y={-15} width={17} height={15} rx={3} fill={PAL.steelDark} stroke={PAL.amberHot} strokeWidth={2.5} />
                    <path d="M -30 -15 L -23 -30 L 23 -30 L 30 -15 Z" fill={PAL.hullMid} stroke={PAL.ink} strokeWidth={2.5} />
                    <path d="M -17 -30 L -12 -43 L 12 -43 L 17 -30 Z" fill={PAL.hullLight} stroke={PAL.ink} strokeWidth={2.3} />
                    <line x1={0} y1={-36} x2={10} y2={0} stroke={PAL.cyan} strokeWidth={2.6} />
                    <circle cx={10} cy={0} r={4.2} fill={PAL.cyan} />
                  </g>
                </g>
              </g>
            )}
          </g>

          {/* ==================== 5. NỬA SAU: NẮNG SA MẠC NUNG ĐỎ LƯNG NÒNG, CONG ĐẦU NÒNG & LASER MRS ==================== */}
          {zToBarrel > 0.04 && (
            <g opacity={prog(t, 145.9, 147.0)}>
              {/* Đường chuẩn trục nòng thẳng 0 độ nằm ngang (nét đứt kỹ thuật đối chiếu) */}
              <line
                x1={mantletX}
                y1={boreZeroY}
                x2={1748}
                y2={boreZeroY}
                stroke={PAL.white}
                strokeWidth={2}
                strokeDasharray="10 7"
                opacity={0.78}
              />
              <g transform={`translate(1748 ${boreZeroY})`} opacity={0.82}>
                <line x1={-8} y1={0} x2={8} y2={0} stroke={PAL.white} strokeWidth={2.2} />
                <line x1={0} y1={-8} x2={0} y2={8} stroke={PAL.white} strokeWidth={2.2} />
              </g>

              {/* Nắng sa mạc chiếu các tia nhiệt song song nung đỏ mặt lưng trên ống thép M256 */}
              {pHeat > 0.01 && (
                <g opacity={pHeat}>
                  <g transform={`translate(1392 292) scale(${0.85 + 0.15 * pHeat})`}>
                    <circle r={46} fill={PAL.amber} opacity={0.18} />
                    <circle r={32} fill={PAL.crimson} opacity={0.25} />
                    <circle r={22} fill={PAL.amberHot} stroke={PAL.amber} strokeWidth={3} />
                    {SUN_RAYS_ANGLES.map((ang) => (
                      <line
                        key={ang}
                        x1={0}
                        y1={-28}
                        x2={0}
                        y2={ang % 60 === 0 ? -42 : -36}
                        stroke={ang % 60 === 0 ? PAL.amberHot : PAL.amber}
                        strokeWidth={ang % 60 === 0 ? 3.2 : 2.2}
                        strokeLinecap="round"
                        transform={`rotate(${ang + t * 8})`}
                      />
                    ))}
                  </g>

                  {SOLAR_HEAT_SHAFTS.map((sx, idx) => {
                    const localX = (sx - mantletX) / (muzzleX - mantletX);
                    const barrelTopY = boreZeroY - 13 + droopWorld * localX * localX;
                    const wave = Math.sin(t * 7 + idx * 0.9) * 4;
                    return (
                      <g key={sx}>
                        <path
                          d={`M ${sx - 24} 348 Q ${sx - 12 + wave} 428 ${sx} ${barrelTopY - 6}`}
                          fill="none"
                          stroke={idx % 2 === 0 ? PAL.amber : PAL.crimson}
                          strokeWidth={3}
                          strokeLinecap="round"
                          opacity={0.85}
                        />
                        <polyline
                          points={`${sx - 6},${barrelTopY - 14} ${sx},${barrelTopY - 5} ${sx + 5},${barrelTopY - 15}`}
                          fill="none"
                          stroke={PAL.amberHot}
                          strokeWidth={2.8}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Dải kim loại lưng trên bị nung đỏ giãn nở (<--->) đối lập bụng dưới mát */}
              {pExpand > 0.01 && (
                <g opacity={pExpand}>
                  <GlowPath
                    d={`M ${mantletX + 6} ${boreZeroY - 13} Q ${(mantletX + muzzleX) * 0.53} ${boreZeroY - 13 + droopWorld * 0.25} ${muzzleX - 10} ${boreZeroY - 11 + droopWorld}`}
                    color={PAL.crimson}
                    coreColor={PAL.amberHot}
                    width={5.5}
                    haloWidth={15}
                  />
                  <path
                    d={`M ${mantletX + 6} ${boreZeroY + 13} Q ${(mantletX + muzzleX) * 0.53} ${boreZeroY + 13 + droopWorld * 0.25} ${muzzleX - 10} ${boreZeroY + 11 + droopWorld}`}
                    fill="none"
                    stroke={PAL.cyanSoft}
                    strokeWidth={2.4}
                    opacity={0.65}
                  />
                  {[1260, 1500].map((ex) => {
                    const lx = (ex - mantletX) / (muzzleX - mantletX);
                    const ey = boreZeroY - 29 + droopWorld * lx * lx;
                    const stretch = 24 + 8 * pExpand;
                    return (
                      <g key={ex} transform={`translate(${ex} ${ey})`} stroke={PAL.amberHot} strokeWidth={2.8} strokeLinecap="round">
                        <line x1={-stretch} y1={0} x2={stretch} y2={0} />
                        <polyline points={`${-stretch + 7},-5 ${-stretch},0 ${-stretch + 7},5`} fill="none" />
                        <polyline points={`${stretch - 7},-5 ${stretch},0 ${stretch - 7},5`} fill="none" />
                      </g>
                    );
                  })}
                </g>
              )}

              {/* Đường tâm nòng thực tế bị uốn cong xuống & thước kẹp đo độ võng ở đầu nòng */}
              {droopPx > 0.4 && (
                <g opacity={prog(t, 152.2, 153.2)}>
                  <GlowPath
                    d={`M ${mantletX} ${boreZeroY} Q ${(mantletX + muzzleX) * 0.55} ${boreZeroY + droopWorld * 0.25} ${muzzleX} ${boreZeroY + droopWorld} L 1748 ${boreZeroY + droopWorld * 1.48}`}
                    color={PAL.amber}
                    coreColor={PAL.amberHot}
                    width={2.8}
                    haloWidth={9}
                  />
                  <g transform="translate(1716 0)">
                    <line
                      x1={0}
                      y1={boreZeroY + 2}
                      x2={0}
                      y2={boreZeroY + droopWorld * 1.34 - 2}
                      stroke={PAL.crimson}
                      strokeWidth={3.2}
                    />
                    <polyline
                      points={`-6,${boreZeroY + droopWorld * 1.34 - 9} 0,${boreZeroY + droopWorld * 1.34} 6,${boreZeroY + droopWorld * 1.34 - 9}`}
                      fill="none"
                      stroke={PAL.crimson}
                      strokeWidth={2.8}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                </g>
              )}

              {/* Vòng ngắm soi gương đầu nòng MRS + Tia laser cyan kiểm chuẩn từ GPS -> gương MRS -> phản xạ lệch góc */}
              {pMrsCallout > 0.01 && (
                <g>
                  {/* Tia laser cyan phóng từ cửa kính GPS tới gương MRS đầu nòng */}
                  <GlowPath
                    d={`M ${gpsX} ${gpsY} L ${mrsX} ${mrsY}`}
                    color={PAL.cyan}
                    coreColor="#e8ffff"
                    width={2.6}
                    haloWidth={9}
                    len={542}
                    p={pMrsLaserOut}
                  />

                  {/* Tia laser cyan phản xạ từ gương MRS ngược về hộp GPS (tạo góc lệch rõ rệt khi nòng cong xuống!) */}
                  {pMrsLaserRet > 0.01 && (
                    <g>
                      {droopPx > 2 && (
                        <polygon
                          points={`${mrsX},${mrsY} ${gpsX},${gpsY + 6} ${gpsX},${gpsReturnY}`}
                          fill={PAL.cyan}
                          opacity={0.14}
                        />
                      )}
                      <GlowPath
                        d={`M ${mrsX} ${mrsY} L ${gpsX} ${gpsReturnY}`}
                        color={droopPx > 2 ? PAL.amber : PAL.cyan}
                        coreColor={droopPx > 2 ? PAL.amberHot : PAL.cyanSoft}
                        width={2.5}
                        haloWidth={8}
                        len={545}
                        p={pMrsLaserRet}
                        dash="10 6"
                      />
                      <GlowPath
                        d={`M ${gpsX - 18} ${gpsReturnY} L ${compX + 18} ${compY - 18}`}
                        color={PAL.cyan}
                        coreColor={PAL.cyanSoft}
                        width={2.4}
                        haloWidth={8}
                        len={140}
                        p={pMrsLaserRet}
                      />
                    </g>
                  )}

                  {/* Vòng khoá tâm quanh cụm gương nhỏ MRS trên đầu nòng */}
                  <g transform={`translate(${mrsX} ${mrsY}) scale(${pMrsCallout})`}>
                    <circle r={24 + mrsPulse * 8} fill="none" stroke={PAL.cyan} strokeWidth={2.4} />
                    <circle
                      r={32}
                      fill="none"
                      stroke={PAL.amberHot}
                      strokeWidth={1.6}
                      strokeDasharray="8 6"
                      transform={`rotate(${t * 35})`}
                    />
                  </g>

                  {/* Kính lúp phóng đại chi tiết cơ khí cụm gương MRS ở góc phải dưới của vùng zoom */}
                  <g opacity={pMrsCallout} filter="url(#sh)">
                    <line
                      x1={mrsX + 14}
                      y1={mrsY + 18}
                      x2={1642}
                      y2={602}
                      stroke={PAL.cyan}
                      strokeWidth={2}
                      strokeDasharray="5 4"
                    />
                    <g transform="translate(1676 644)">
                      <circle r={54} fill={PAL.panelHi} stroke={PAL.ink} strokeWidth={3.5} />
                      <circle r={49} fill={PAL.bgDeep} stroke={PAL.cyan} strokeWidth={2.8} />
                      <g transform={`rotate(${droopPx * 0.78})`}>
                        <rect x={-42} y={8} width={66} height={22} rx={3} fill={PAL.hullMid} stroke={PAL.ink} strokeWidth={2.5} />
                        <rect x={12} y={5} width={14} height={28} rx={2} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.2} />
                        <path d="M 8 5 L 8 -26 L 26 -26 L 26 5 Z" fill={PAL.amber} stroke={PAL.ink} strokeWidth={2.4} />
                        <line x1={8} y1={-23} x2={8} y2={-3} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
                      </g>
                      <line x1={-46} y1={-18} x2={7} y2={-13 + droopPx * 0.25} stroke={PAL.cyan} strokeWidth={2.6} />
                      <line
                        x1={7}
                        y1={-13 + droopPx * 0.25}
                        x2={-46}
                        y2={-6 + droopPx * 1.3}
                        stroke={droopPx > 2 ? PAL.amberHot : PAL.cyanSoft}
                        strokeWidth={2.5}
                        strokeDasharray="6 4"
                      />
                    </g>
                  </g>
                </g>
              )}
            </g>
          )}
        </svg>
      </Cam2D>

      {/* Phủ lớp hạt phim <Grain> cuối cảnh 2D */}
      <Grain opacity={0.08} />

      <Label
        t={t}
        text="MRS"
        x={W * 0.16}
        y={H * 0.84}
        from={CUE.c01_s09_mrs}
        until={154.8}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C01S09;
