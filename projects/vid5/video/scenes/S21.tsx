import React, { useMemo } from 'react';
import { Easing } from 'remotion';
import { FONT, prog, lerp, bump } from '@kit/theme';
import { useT, handheld, useSpring, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { skyline, contours } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, Weapon2D, DroneTop2D, F22Side2D } from '../local/jets2d';

// Đường đồng mức nhỏ cho ô bản đồ chiến thuật trên màn hình cảm ứng 10x19"
const LAD_MAP_CONTOURS = contours('s21_lad_map', 310, 290, 6, 16, 150);

// Vẽ ghế phóng thông minh ACES-5 nhìn ngang (mũi máy bay hướng sang phải +X)
const Aces5Seat: React.FC<{ x: number; y: number; highlight?: boolean }> = ({ x, y, highlight = false }) => (
  <g transform={`translate(${x} ${y})`}>
    {/* Ray trượt phóng nghiêng 16 độ */}
    <g transform="rotate(-15)">
      <rect x={-52} y={-155} width={18} height={265} rx={3} fill="#1f2936" stroke={P.ink} strokeWidth={2.2} />
      <line x1={-43} y1={-145} x2={-43} y2={98} stroke={P.gridBright} strokeWidth={1.6} strokeDasharray="6 5" opacity={0.65} />
      {/* Khung lưng ghế bọc giáp composite */}
      <path
        d="M-36,-132 L-10,-132 L-4,54 L66,58 L72,88 L-36,88 Z"
        fill="#2b3645"
        stroke={highlight ? P.amber : P.ink}
        strokeWidth={highlight ? 2.8 : 2.2}
        strokeLinejoin="round"
      />
      {/* Đệm lưng & đệm ngồi */}
      <rect x={-10} y={-92} width={18} height={138} rx={6} fill="#3c4a5c" stroke={P.ink} strokeWidth={1.8} />
      <rect x={0} y={44} width={68} height={20} rx={6} fill="#3c4a5c" stroke={P.ink} strokeWidth={1.8} />
      {/* Hộp dù ổn định đỉnh ghế ACES-5 & cảm biến pitot */}
      <path d="M-38,-162 L10,-162 L16,-126 L-38,-126 Z" fill="#374557" stroke={P.ink} strokeWidth={2} />
      <rect x={-32} y={-154} width={28} height={10} rx={2} fill={P.amber} opacity={0.88} />
      <line x1={12} y1={-156} x2={28} y2={-160} stroke={P.ordWhite} strokeWidth={2.4} />
      {/* Tay giật phóng ghế vàng-đen đặc trưng */}
      <path d="M62,42 Q78,36 74,52" fill="none" stroke={P.amberHot} strokeWidth={4} strokeLinecap="round" />
      <path d="M62,42 Q78,36 74,52" fill="none" stroke={P.ink} strokeWidth={4} strokeDasharray="4 4" strokeLinecap="round" />
      {/* Hộp rocket dưới đáy ghế */}
      <rect x={-26} y={88} width={78} height={22} rx={4} fill="#1d2530" stroke={P.ink} strokeWidth={1.8} />
      <circle cx={-8} cy={99} r={5} fill={P.flame} opacity={0.75} />
      <circle cx={16} cy={99} r={5} fill={P.flame} opacity={0.75} />
    </g>
  </g>
);

const S21: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const shake = handheld(t, 1.8, 's21_cockpit');

  // Dải mây/núi xa ngoài bầu trời cho nhịp 1 (POV buồng lái)
  const skyLayers = useMemo(
    () => ({
      far: skyline('s21_hor_far', -300, 2300, 392, 68, 560, 760),
      near: skyline('s21_hor_near', -300, 2300, 428, 54, 420, 760),
    }),
    [],
  );

  // Chuyển mượt giữa 3 trạm thế giới trong <Cam2D>:
  // Nhịp 1 (583.45–598.2s): Trạm (960, 540) — POV buồng lái & màn hình 10x19" + JHMCS II
  // Nhịp 2 (598.3–620.8s): Trạm (3240, 540) — Mặt cắt dọc buồng lái đôi F-15EX & ghế sau bỏ trống
  // Nhịp 3 (621.0–628.88s): Trạm (5520, 540) — Giao diện kiến trúc mở OMS cắm thẻ vũ khí/ứng dụng
  const toAct2 = prog(t, 598.1, 599.35, Easing.bezier(0.42, 0, 0.18, 1));
  const focusEmpty = prog(t, 617.8, 619.2);
  const toAct3 = prog(t, 620.65, 621.75, Easing.bezier(0.42, 0, 0.18, 1));

  const camX12 = lerp(960, 3240 - focusEmpty * 65, toAct2);
  const camY12 = lerp(540, 540 - focusEmpty * 18, toAct2);
  const zoom12 = lerp(1.0 + prog(t, 583.45, 598.0) * 0.04, 1.0 + focusEmpty * 0.11, toAct2);

  const camX = lerp(camX12, 5520, toAct3);
  const camY = lerp(camY12, 540, toAct3);
  const camZoom = lerp(zoom12, 1.02 + prog(t, 621.8, 628.88) * 0.04, toAct3);

  // Nhịp 1: Tiến độ đồng hồ cơ nhường chỗ cho màn hình HD 10x19" & khóa mục tiêu JHMCS II
  const ladBoot = prog(t, 584.1, 585.6);
  const hudPulse = bump(t, CUE.s21_hudSeat - 0.2, 2.4);
  const jhmcsAppear = prog(t, 591.8, 592.4);
  const jhmcsSweep = prog(t, 592.0, CUE.s21_jhmcsLock, Easing.bezier(0.25, 0.1, 0.2, 1));
  const jhmcsLocked = t >= CUE.s21_jhmcsLock ? 1 : 0;
  const lockSpring = useSpring(t, CUE.s21_jhmcsLock, 11, 180);

  // Tọa độ mục tiêu bay lệch trục trên bầu trời góc trên-phải (ngoài khung HUD)
  const bogeyX = 1520 - (t - 583.45) * 8.5;
  const bogeyY = 232 - Math.sin((t - 583.45) * 0.5) * 12;
  const reticleX = lerp(995, bogeyX, jhmcsSweep);
  const reticleY = lerp(285, bogeyY, jhmcsSweep);

  // Nhịp 2: Mặt cắt dọc buồng lái đôi & chiếc ghế sau trống không
  const emptyReveal = prog(t, CUE.s21_emptyBackseat - 0.3, CUE.s21_emptyBackseat + 1.1);
  const wing142In = prog(t, CUE.s21_portland142 - 0.5, CUE.s21_portland142 + 0.7);
  const whySpring = useSpring(t, CUE.s21_whyEmpty, 10, 170);

  // Nhịp 3: 3 khối thẻ ứng dụng OMS trượt cắm vào khe bus dữ liệu
  const card1Dock = prog(t, 621.9, 622.75, Easing.out(Easing.cubic));
  const card2Dock = prog(t, 623.05, 623.9, Easing.out(Easing.cubic));
  const card3Dock = prog(t, 624.2, 625.05, Easing.out(Easing.cubic));
  const busFlow = (t * 160) % 48;

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <svg width={7600} height={1600} style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(6, 12, 22, 0.55)" />

          {/* =====================================================================
              NHỊP 1 (x: 0..1920): GÓC NHÌN POV BUỒNG LÁI, MÀN HÌNH 10x19" & JHMCS II
             ===================================================================== */}
          <g transform="translate(0 0)">
            <defs>
              <linearGradient id="s21_sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#07152e" />
                <stop offset="48%" stopColor="#1b4d87" />
                <stop offset="86%" stopColor="#6ea8d6" />
                <stop offset="100%" stopColor="#9ec8e8" />
              </linearGradient>
              <linearGradient id="s21_hudGlass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2ce6ff" stopOpacity={0.14} />
                <stop offset="100%" stopColor="#35e09c" stopOpacity={0.05} />
              </linearGradient>
              <clipPath id="s21_ladClip">
                <rect x={306} y={504} width={1308} height={476} rx={14} />
              </clipPath>
            </defs>

            {/* Bầu trời tầng cao nhìn từ buồng lái */}
            <rect x={-160} y={-120} width={2240} height={1320} fill="url(#s21_sky)" />

            {/* Tầng mây/chân trời nghiêng nhẹ theo góc lượn của tiêm kích */}
            <g transform={`translate(${-(t - 583.45) * 9} 0) rotate(${Math.sin(t * 0.45) * 1.4} 960 380)`}>
              <path d={skyLayers.far} fill="#3f74a8" opacity={0.55} />
              <path d={skyLayers.near} fill="#25517d" opacity={0.78} />
              {/* Thảm mây trắng tầng bình lưu */}
              <rect x={-300} y={422} width={2600} height={220} fill="#dcecf9" opacity={0.18} />
            </g>

            {/* Mục tiêu địch bay lệch trục (off-boresight) ở góc trên-phải bầu trời */}
            <g transform={`translate(${bogeyX} ${bogeyY}) rotate(-7)`}>
              <line x1={55} y1={2} x2={260} y2={16} stroke="#e9f6ff" strokeWidth={4} opacity={0.28} strokeLinecap="round" />
              <line x1={55} y1={2} x2={260} y2={16} stroke="#ffffff" strokeWidth={1.6} opacity={0.55} strokeLinecap="round" />
              <F22Side2D scale={0.25} flip afterburner={0.65} />
            </g>

            {/* Gọng khung vòm kính F-15EX nhìn từ ghế lái trước + gương chiếu hậu */}
            <path
              d="M-120,-90 L2040,-90 L2040,120 Q1680,15 1545,515 L1495,515 Q1615,28 960,12 Q305,28 425,515 L375,515 Q240,15 -120,120 Z"
              fill="#172230"
              stroke={P.ink}
              strokeWidth={3}
            />
            <path
              d="M398,505 Q275,26 960,8 Q1645,26 1522,505"
              fill="none"
              stroke={P.f15Mid}
              strokeWidth={5}
              opacity={0.55}
            />
            {/* Gương chiếu hậu lắp trên khung vòm */}
            <rect x={630} y={24} width={128} height={38} rx={10} fill="#0e1824" stroke={P.f15Mid} strokeWidth={2.5} />
            <rect x={1162} y={24} width={128} height={38} rx={10} fill="#0e1824" stroke={P.f15Mid} strokeWidth={2.5} />

            {/* HUD SỐ CẤU HÌNH THẤP (Low-profile Digital HUD) ở chính diện */}
            <g transform="translate(960 282)">
              {/* Chân đế quang học cấu hình thấp */}
              <path d="M-185,172 L185,172 L156,200 L-156,200 Z" fill="#1b2736" stroke={P.ink} strokeWidth={2.5} />
              {/* Tấm kính tổ hợp mảnh sắc nét */}
              <path
                d="M-196,-146 Q0,-164 196,-146 L176,170 L-176,170 Z"
                fill="url(#s21_hudGlass)"
                stroke={hudPulse > 0.05 ? P.cyan : '#35e09c'}
                strokeWidth={2.4 + hudPulse * 2}
              />
              {hudPulse > 0.05 && (
                <path
                  d="M-196,-146 Q0,-164 196,-146 L176,170 L-176,170 Z"
                  fill="none"
                  stroke={P.cyan}
                  strokeWidth={8}
                  opacity={hudPulse * 0.35}
                />
              )}

              {/* Đồ họa HUD số màu lục-cyan */}
              <g stroke="#35e09c" fill="none" strokeWidth={1.8} opacity={0.92}>
                {/* Thang góc chúc ngóc (Pitch Ladder) */}
                {[-90, -45, 45, 90].map((py, idx) => (
                  <g key={idx} transform={`translate(0 ${py + Math.sin(t * 0.7) * 5})`}>
                    <path d="M-64,0 L-24,0 L-24,10" />
                    <path d="M64,0 L24,0 L24,10" />
                  </g>
                ))}
                {/* Đường chân trời nhân tạo & ký hiệu vector vận tốc */}
                <line x1={-128} y1={6} x2={-28} y2={6} strokeWidth={2.2} />
                <line x1={28} y1={6} x2={128} y2={6} strokeWidth={2.2} />
                <circle cx={0} cy={6} r={11} strokeWidth={2.2} />
                <line x1={-22} y1={6} x2={-11} y2={6} strokeWidth={2.2} />
                <line x1={11} y1={6} x2={22} y2={6} strokeWidth={2.2} />
                <line x1={0} y1={-5} x2={0} y2={-16} strokeWidth={2.2} />

                {/* Cột tốc độ bên trái & cột độ cao bên phải */}
                <rect x={-166} y={-24} width={58} height={32} rx={3} fill="rgba(9,25,38,0.45)" />
                <rect x={108} y={-24} width={62} height={32} rx={3} fill="rgba(9,25,38,0.45)" />
                {/* Thước hướng bay phía trên */}
                <line x1={-105} y1={-124} x2={105} y2={-124} />
                <polygon points="0,-114 -7,-124 7,-124" fill="#35e09c" />
              </g>
              <g fontFamily={FONT} fontWeight={700} fontSize={16} fill="#35e09c" textAnchor="middle">
                <text x={-137} y={-2}>540</text>
                <text x={-137} y={32} fontSize={13} opacity={0.85}>M 1.48</text>
                <text x={139} y={-2}>38,500</text>
                <text x={0} y={-134} fontSize={14}>HDG 274°</text>
              </g>
            </g>

            {/* VÒNG NGẮM MŨ BAY JHMCS II LƯỚT CHÉO GÓC KHÓA CỨNG MỤC TIÊU LỆCH TRỤC */}
            {jhmcsAppear > 0.01 && (
              <g opacity={jhmcsAppear}>
                {/* Viền cong kính mũ bay JHMCS II phủ nhẹ phía trên */}
                <path
                  d="M210,120 Q960,40 1710,120"
                  fill="none"
                  stroke={jhmcsLocked ? P.amber : P.cyan}
                  strokeWidth={2}
                  strokeDasharray="14 10"
                  opacity={0.45}
                />
                {/* Đường vector chỉ hướng mắt nhìn từ tâm HUD tới mục tiêu lệch trục (vẽ nét kép, không dùng filter glow) */}
                <line
                  x1={960}
                  y1={274}
                  x2={reticleX}
                  y2={reticleY}
                  stroke={jhmcsLocked ? P.amber : P.cyan}
                  strokeWidth={6}
                  opacity={0.2}
                />
                <line
                  x1={960}
                  y1={274}
                  x2={reticleX}
                  y2={reticleY}
                  stroke={jhmcsLocked ? P.amberHot : P.cyan}
                  strokeWidth={2.2}
                  strokeDasharray="10 7"
                />

                {/* Cụm chữ thập & vòng ngắm mũ bay JHMCS II */}
                <g transform={`translate(${reticleX} ${reticleY}) scale(${jhmcsLocked ? 0.85 + 0.15 * lockSpring : 1.15})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={62}
                    fill="none"
                    stroke={jhmcsLocked ? P.amber : P.cyan}
                    strokeWidth={6}
                    opacity={0.2}
                  />
                  <circle
                    cx={0}
                    cy={0}
                    r={62}
                    fill="none"
                    stroke={jhmcsLocked ? P.amberHot : P.cyan}
                    strokeWidth={2.4}
                    strokeDasharray={jhmcsLocked ? 'none' : '16 10'}
                  />
                  {/* 4 ngạnh chữ thập ngắm mũ bay */}
                  {[0, 90, 180, 270].map((ang) => (
                    <line
                      key={ang}
                      x1={0}
                      y1={-76}
                      x2={0}
                      y2={-46}
                      stroke={jhmcsLocked ? P.amberHot : P.cyan}
                      strokeWidth={2.8}
                      transform={`rotate(${ang})`}
                    />
                  ))}
                  {/* Ô thoi khóa cứng đầu dò AIM-9X/AIM-120 khi JHMCS II bắt dính */}
                  {jhmcsLocked === 1 && (
                    <g>
                      <polygon
                        points="0,-36 36,0 0,36 -36,0"
                        fill="rgba(255,59,78,0.16)"
                        stroke={P.red}
                        strokeWidth={3.2}
                      />
                      <rect x={-52} y={74} width={104} height={26} rx={5} fill={P.red} />
                      <text
                        x={0}
                        y={92}
                        fontFamily={FONT}
                        fontWeight={700}
                        fontSize={14}
                        fill="#ffffff"
                        textAnchor="middle"
                      >
                        JHMCS II LOCK
                      </text>
                    </g>
                  )}
                </g>
              </g>
            )}

            {/* BẢNG TÁP-LÔ & MÀN HÌNH CẢM ỨNG HD RỘNG 10×19 INCH (LAD) */}
            <g>
              {/* Khối vỏ táp-lô chống lóa & hai bảng điều khiển hông */}
              <path
                d="M-80,1090 L130,545 L258,472 L1662,472 L1790,545 L2000,1090 Z"
                fill="#121b27"
                stroke={P.ink}
                strokeWidth={3}
              />
              {/* Hai tai ghế phóng thông minh ACES-5 nhô ở rìa phải/trái cận POV */}
              <g opacity={0.92}>
                <path
                  d="M-60,690 L118,650 L145,1080 L-60,1080 Z"
                  fill="#1d2836"
                  stroke={hudPulse > 0.05 ? P.amber : P.ink}
                  strokeWidth={hudPulse > 0.05 ? 3.2 : 2.2}
                />
                <path
                  d="M1980,690 L1802,650 L1775,1080 L1980,1080 Z"
                  fill="#1d2836"
                  stroke={hudPulse > 0.05 ? P.amber : P.ink}
                  strokeWidth={hudPulse > 0.05 ? 3.2 : 2.2}
                />
                {hudPulse > 0.05 && (
                  <g fontFamily={FONT} fontWeight={700} fontSize={15} fill={P.amberHot}>
                    <text x={1815} y={692}>ACES-5</text>
                    <text x={1815} y={712} fontSize={12} fill={P.muted}>SMART SEAT</text>
                  </g>
                )}
              </g>

              {/* Viền khung nhôm phay màn hình cảm ứng 10×19" */}
              <rect
                x={284}
                y={484}
                width={1352}
                height={516}
                rx={22}
                fill="#1e2d40"
                stroke={P.f15Mid}
                strokeWidth={3}
                filter="url(#sh)"
              />
              {/* Dãy phím viền mềm quanh màn hình LAD */}
              {Array.from({ length: 14 }, (_, i) => (
                <rect
                  key={`bk${i}`}
                  x={350 + i * 88}
                  y={490}
                  width={34}
                  height={7}
                  rx={2}
                  fill={P.gridBright}
                  opacity={0.55}
                />
              ))}

              {/* Mặt kính màn hình cảm ứng 10×19" HD */}
              <rect x={306} y={504} width={1308} height={476} rx={14} fill="#081322" stroke={P.cyan} strokeWidth={1.8} />

              {/* Bóng mờ đồng hồ cơ tròn đời cũ tan biến nhường chỗ cho màn hình 10×19" (583.45–585.6s) */}
              {ladBoot < 0.99 && (
                <g opacity={(1 - ladBoot) * 0.82}>
                  {[470, 715, 960, 1205, 1450].map((dx, idx) => (
                    <g key={dx} transform={`translate(${dx} ${idx % 2 === 0 ? 690 : 760})`}>
                      <circle cx={0} cy={0} r={88} fill="#0f1c2e" stroke={P.legMid} strokeWidth={3} />
                      <circle cx={0} cy={0} r={74} fill="none" stroke={P.gridBright} strokeWidth={1.6} strokeDasharray="5 7" />
                      <line
                        x1={0}
                        y1={0}
                        x2={Math.cos(idx * 1.3 + t) * 62}
                        y2={Math.sin(idx * 1.3 + t) * 62}
                        stroke={P.amber}
                        strokeWidth={3}
                      />
                    </g>
                  ))}
                </g>
              )}

              {/* GIAO DIỆN ĐA Ô CHIẾN THUẬT SẮC NÉT TRÊN MÀN HÌNH HD 10×19" */}
              <g clipPath="url(#s21_ladClip)" opacity={0.18 + 0.82 * ladBoot}>
                {/* Lưới nền tinh tế của màn hình */}
                {Array.from({ length: 16 }, (_, i) => (
                  <line key={`lgv${i}`} x1={306 + i * 84} y1={504} x2={306 + i * 84} y2={980} stroke={P.grid} strokeWidth={0.8} opacity={0.28} />
                ))}
                {Array.from({ length: 8 }, (_, j) => (
                  <line key={`lgh${j}`} x1={306} y1={504 + j * 64} x2={1614} y2={504 + j * 64} stroke={P.grid} strokeWidth={0.8} opacity={0.28} />
                ))}

                {/* Ô 1 (Trái, x: 322..642): Bản đồ chiến thuật số có đường đồng mức & vòng đe dọa */}
                <g transform="translate(322 522)">
                  <rect width={316} height={440} rx={10} fill="#0b1b30" stroke={P.gridBright} strokeWidth={1.5} />
                  <g transform="translate(4 48)" opacity={0.52}>
                    {LAD_MAP_CONTOURS.map((c) => (
                      <path key={c.level} d={c.d} fill="none" stroke={P.cyan} strokeWidth={1} opacity={0.35 + c.level * 0.08} />
                    ))}
                  </g>
                  {/* Vòng radar địch & đường bay chiến thuật */}
                  <circle cx={215} cy={165} r={74} fill="rgba(255,59,78,0.12)" stroke={P.red} strokeWidth={1.6} strokeDasharray="7 5" />
                  <path d="M88,365 L136,265 L215,165" fill="none" stroke={P.cyan} strokeWidth={2} strokeDasharray="6 4" />
                  <polygon points="136,250 126,274 136,268 146,274" fill={P.green} />
                  <rect x={12} y={10} width={140} height={24} rx={4} fill="#132b4a" />
                  <text x={22} y={27} fontFamily={FONT} fontWeight={700} fontSize={13} fill={P.cyan}>TSD · TACTICAL MAP</text>
                </g>

                {/* Ô 2 (Giữa-trái, x: 652..972): Màn quét Radar AESA APG-82 B-Scope */}
                <g transform="translate(654 522)">
                  <rect width={300} height={440} rx={10} fill="#0b1b30" stroke={P.gridBright} strokeWidth={1.5} />
                  <rect x={12} y={10} width={155} height={24} rx={4} fill="#132b4a" />
                  <text x={22} y={27} fontFamily={FONT} fontWeight={700} fontSize={13} fill={P.cyan}>APG-82(V)1 AESA</text>
                  {/* Quạt quét điện tử */}
                  <polygon
                    points={`150,410 ${45 + Math.sin(t * 2.2) * 32},68 ${255 + Math.sin(t * 2.2) * 32},68`}
                    fill={P.cyan}
                    opacity={0.11}
                  />
                  <line x1={150} y1={410} x2={150 + Math.sin(t * 3.1) * 105} y2={70} stroke={P.cyan} strokeWidth={2} opacity={0.75} />
                  {/* Các mục tiêu trên màn B-Scope (mục tiêu góc phải đồng bộ với JHMCS II) */}
                  {[
                    [92, 190, P.amber],
                    [146, 145, P.amber],
                    [224, 120, jhmcsLocked ? P.red : P.amberHot],
                  ].map(([tx, ty, col], idx) => (
                    <g key={idx} transform={`translate(${tx} ${ty})`}>
                      <rect x={-9} y={-9} width={18} height={18} fill="none" stroke={col as string} strokeWidth={2.2} />
                      <line x1={0} y1={9} x2={-4} y2={24} stroke={col as string} strokeWidth={1.8} />
                    </g>
                  ))}
                </g>

                {/* Ô 3 (Giữa-phải, x: 968..1280): Quản lý 12 mấu vũ khí & lá chắn EPAWSS */}
                <g transform="translate(970 522)">
                  <rect width={296} height={440} rx={10} fill="#0b1b30" stroke={P.gridBright} strokeWidth={1.5} />
                  <rect x={12} y={10} width={160} height={24} rx={4} fill="#132b4a" />
                  <text x={22} y={27} fontFamily={FONT} fontWeight={700} fontSize={13} fill={P.amber}>STORES · 12 AAM</text>
                  {/* Vòng vòm lá chắn EPAWSS 360 */}
                  <circle cx={148} cy={230} r={106} fill="none" stroke={P.green} strokeWidth={1.8} strokeDasharray="10 6" opacity={0.7} />
                  {/* Sơ đồ thân cánh F-15EX thu nhỏ */}
                  <polygon
                    points="148,132 162,184 236,252 236,272 166,258 166,304 188,332 108,332 130,304 130,258 60,272 60,252 134,184"
                    fill="#163254"
                    stroke={P.cyan}
                    strokeWidth={2}
                  />
                  {/* 12 chấm tên lửa sẵn sàng */}
                  {[-84, -62, -40, -18, 18, 40, 62, 84].map((ox, k) => (
                    <rect
                      key={k}
                      x={145 + ox}
                      y={254 + Math.abs(ox) * 0.22}
                      width={6}
                      height={22}
                      rx={2}
                      fill={k === 7 && jhmcsLocked ? P.red : P.green}
                    />
                  ))}
                </g>

                {/* Ô 4 (Phải, x: 1280..1598): Thông số động cơ kép F110 & nhiên liệu cảm ứng */}
                <g transform="translate(1282 522)">
                  <rect width={314} height={440} rx={10} fill="#0b1b30" stroke={P.gridBright} strokeWidth={1.5} />
                  <rect x={12} y={10} width={168} height={24} rx={4} fill="#132b4a" />
                  <text x={22} y={27} fontFamily={FONT} fontWeight={700} fontSize={13} fill={P.green}>F110-GE-129 · ENG</text>
                  {[86, 178].map((ex, i) => (
                    <g key={ex} transform={`translate(${ex} 75)`}>
                      <rect x={-22} y={0} width={44} height={210} rx={6} fill="#11243d" stroke={P.gridBright} strokeWidth={1.4} />
                      <rect x={-16} y={34} width={32} height={170} rx={4} fill={P.amber} opacity={0.9} />
                      <text x={0} y={236} fontFamily={FONT} fontWeight={700} fontSize={14} fill={P.text} textAnchor="middle">
                        {i === 0 ? 'L 96%' : 'R 96%'}
                      </text>
                    </g>
                  ))}
                  {/* Thanh tổng nhiên liệu */}
                  <rect x={28} y={340} width={258} height={24} rx={6} fill="#11243d" stroke={P.gridBright} strokeWidth={1.4} />
                  <rect x={32} y={344} width={212} height={16} rx={4} fill={P.cyan} />
                  <text x={157} y={392} fontFamily={FONT} fontWeight={700} fontSize={15} fill={P.cyanSoft} textAnchor="middle">
                    FUEL 13,500 LB · OMS OK
                  </text>
                </g>

                {/* Hiệu ứng vòng chạm cảm ứng trên màn hình */}
                {bump(t, 586.0, 1.4) > 0.02 && (
                  <circle
                    cx={810}
                    cy={710}
                    r={18 + (1 - bump(t, 586.0, 1.4)) * 46}
                    fill="none"
                    stroke={P.cyan}
                    strokeWidth={2.5}
                    opacity={bump(t, 586.0, 1.4)}
                  />
                )}
              </g>
            </g>

            {/* Đầu cần lái HOTAS nhô nhẹ ở trung tâm mép dưới */}
            <g transform={`translate(${960 + Math.sin(t * 0.8) * 6} 1045)`}>
              <rect x={-26} y={-52} width={52} height={95} rx={14} fill="#1b2430" stroke={P.ink} strokeWidth={2.5} />
              <circle cx={-8} cy={-32} r={7} fill={P.red} />
              <rect x={6} y={-40} width={12} height={12} rx={3} fill={P.gridBright} />
            </g>
          </g>

          {/* =====================================================================
              NHỊP 2 (x: 2280..4200, tâm 3240): MẶT CẮT DỌC CẬN CẢNH BUỒNG LÁI ĐÔI F-15EX
             ===================================================================== */}
          <g transform="translate(3240 565)">
            <BlueprintGrid x0={-1100} y0={-660} w={2200} h={1320} step={110} id="s21_bp2" />

            {/* Khung bản vẽ mặt cắt buồng lái đôi */}
            <g filter="url(#sh)">
              {/* Vỏ ngoài thân trước F-15EX nhìn ngang (mũi hướng sang phải +X) */}
              <path
                d="M-840,-85 L-435,-96 L-360,-88 L370,-68 L585,-42 Q765,-16 895,48 Q750,152 545,186 L-840,196 Z"
                fill={P.f15Mid}
                stroke={P.ink}
                strokeWidth={3.2}
                strokeLinejoin="round"
              />
              {/* Dải tôn sáng dọc mép lưng và mũi */}
              <path
                d="M-840,-85 L-435,-96 L-360,-52 L560,-22 L875,44 Q785,-2 585,-42 L370,-68 L-360,-88 Z"
                fill={P.f15Light}
                opacity={0.76}
              />
              {/* Mảng bụng tối & vách cửa hút khí bên dưới */}
              <path
                d="M-840,115 L555,115 L845,76 Q735,152 545,186 L-840,196 Z"
                fill={P.f15Dark}
                opacity={0.82}
              />
              {/* Chóp vách mũi Radome chứa radar APG-82 bên phải */}
              <path
                d="M615,-38 Q772,-12 895,48 Q766,144 596,176 Z"
                fill={P.f15Radome}
                stroke={P.ink}
                strokeWidth={2.6}
              />
              <line x1={624} y1={-32} x2={606} y2={168} stroke={P.cyan} strokeWidth={5} opacity={0.85} />

              {/* Khoang cắt mở bên trong buồng lái đôi (Tandem Cockpit Cavity) */}
              <path
                d="M-415,-88 L465,-58 L510,122 L-455,122 Z"
                fill="#0b1728"
                stroke={P.gridBright}
                strokeWidth={2.4}
              />
              {/* Sàn buồng lái & các vách ngăn chịu lực dưới sàn */}
              <rect x={-455} y={96} width={965} height={28} fill="#182a42" stroke={P.ink} strokeWidth={2} />
              {Array.from({ length: 11 }, (_, i) => (
                <line
                  key={`rib${i}`}
                  x1={-410 + i * 86}
                  y1={96}
                  x2={-410 + i * 86}
                  y2={124}
                  stroke={P.gridBright}
                  strokeWidth={2}
                />
              ))}

              {/* Khoang siêu máy tính ADCP II & OMS ngay sau ghế sau (bên trái) */}
              <rect x={-755} y={-35} width={255} height={135} rx={8} fill="#0e1e34" stroke={P.gridBright} strokeWidth={2} />
              <rect x={-725} y={-8} width={92} height={82} rx={6} fill={P.amber} stroke={P.ink} strokeWidth={2} />
              <rect x={-612} y={-8} width={88} height={82} rx={6} fill="#18385c" stroke={P.cyan} strokeWidth={2} />
              <text x={-679} y={39} fontFamily={FONT} fontWeight={700} fontSize={15} fill={P.ink} textAnchor="middle">
                ADCP II
              </text>
              <text x={-568} y={39} fontFamily={FONT} fontWeight={700} fontSize={15} fill={P.cyan} textAnchor="middle">
                OMS
              </text>

              {/* VÒM KÍNH BỌT NƯỚC ĐÔI KHỔNG LỒ (Twin-seat Bubble Canopy) */}
              <path
                d="M-418,-88 Q-245,-342 95,-324 Q355,-308 505,-58"
                fill={P.f15Canopy}
                fillOpacity={0.22}
                stroke={P.f15Light}
                strokeWidth={5}
              />
              <path
                d="M-418,-88 Q-245,-342 95,-324 Q355,-308 505,-58"
                fill="none"
                stroke={P.ink}
                strokeWidth={2.2}
              />
              {/* Khung vòm giữa ngăn cách buồng trước & buồng sau */}
              <path d="M22,-324 L8,-72" stroke="#243345" strokeWidth={12} />
              <path d="M22,-324 L8,-72" stroke={P.f15Light} strokeWidth={3} />
              {/* Gọng kính chắn gió trước */}
              <path d="M352,-216 L310,-62" stroke="#243345" strokeWidth={10} />

              {/* --- BUỒNG LÁI TRƯỚC (BÊN PHẢI, x ≈ +185): CÓ PHI CÔNG ĐỘI MŨ JHMCS II + MÀN HÌNH 10×19" #1 --- */}
              <Aces5Seat x={155} y={8} />

              {/* Bảng táp-lô trước + Màn hình cảm ứng 10×19" số 1 + HUD cấu hình thấp */}
              <path d="M325,96 L355,-82 L442,-58 L465,96 Z" fill="#1b2838" stroke={P.ink} strokeWidth={2.2} />
              {/* Mặt kính màn hình 10×19" trước phát sáng hướng về mặt phi công */}
              <line x1={336} y1={-68} x2={316} y2={8} stroke={P.cyan} strokeWidth={8} strokeLinecap="round" />
              <line x1={333} y1={-68} x2={313} y2={8} stroke="#ffffff" strokeWidth={2.2} strokeLinecap="round" />
              {/* Kính HUD số cấu hình thấp */}
              <line x1={366} y1={-84} x2={392} y2={-138} stroke="#35e09c" strokeWidth={3.5} strokeLinecap="round" />

              {/* Phi công Không đoàn 142 ngồi ghế trước nắm cần lái HOTAS */}
              <g transform="translate(175 -10)">
                {/* Chân & ủng bay */}
                <path d="M36,54 L112,58 L138,100" fill="none" stroke="#45584c" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round" />
                <rect x={126} y={92} width={34} height={15} rx={5} fill="#1a2028" stroke={P.ink} strokeWidth={1.8} />
                {/* Thân áo bay chống G */}
                <path d="M-12,-46 L26,-42 L44,52 L-6,54 Z" fill="#4f6456" stroke={P.ink} strokeWidth={2.2} />
                {/* Phù hiệu vai Oregon 142nd Wing */}
                <rect x={6} y={-24} width={16} height={12} rx={2} fill={P.red} stroke={P.amberHot} strokeWidth={1.2} />
                {/* Tay phải nắm cần lái trung tâm */}
                <path d="M16,-16 L66,14 L106,4" fill="none" stroke="#5b7263" strokeWidth={16} strokeLinecap="round" strokeLinejoin="round" />
                {/* Cần lái trước */}
                <line x1={110} y1={98} x2={106} y2={-6} stroke="#232d3b" strokeWidth={7} strokeLinecap="round" />
                {/* Đầu & Mũ bay thông minh JHMCS II có kính visor sẫm viền cyan */}
                <circle cx={14} cy={-82} r={30} fill={P.ordWhite} stroke={P.ink} strokeWidth={2.4} />
                {/* Cụm gồ cảm biến quang-từ trên trán mũ JHMCS II */}
                <path d="M6,-112 Q36,-112 45,-86 L20,-74 Q6,-86 6,-112 Z" fill="#222d3a" stroke={P.cyan} strokeWidth={2} />
                {/* Mặt nạ dưỡng khí & ống thở */}
                <path d="M36,-76 L48,-64 L26,-56 Z" fill="#252e3a" stroke={P.ink} strokeWidth={1.6} />
              </g>

              {/* --- BUỒNG LÁI SAU (BÊN TRÁI, x ≈ -230): GHẾ ACES-5 + MÀN HÌNH 10×19" #2 + TRỐNG KHÔNG! --- */}
              <Aces5Seat x={-245} y={8} highlight={emptyReveal > 0.2} />

              {/* Bảng táp-lô sau + Màn hình cảm ứng 10×19" thứ hai + cần lái sau */}
              <path d="M-75,96 L-48,-82 L18,-72 L30,96 Z" fill="#1b2838" stroke={P.ink} strokeWidth={2.2} />
              <line
                x1={-62}
                y1={-68}
                x2={-82}
                y2={10}
                stroke={emptyReveal > 0.1 ? P.amber : P.cyan}
                strokeWidth={9}
                strokeLinecap="round"
              />
              <line x1={-65} y1={-68} x2={-85} y2={10} stroke="#fff3c4" strokeWidth={2.5} strokeLinecap="round" />
              {/* Cần lái ghế sau đứng một mình không ai nắm */}
              <line x1={-112} y1={96} x2={-116} y2={4} stroke="#232d3b" strokeWidth={7} strokeLinecap="round" />
              <circle cx={-116} cy={2} r={6} fill={P.red} />

              {/* VIỀN VÀNG HỔ PHÁCH ĐỨT NÉT CHIẾU SÁNG KHOẢNG TRỐNG GHẾ SAU */}
              {emptyReveal > 0.02 && (
                <g opacity={emptyReveal}>
                  {/* Hào quang hổ phách mềm quanh vùng ghế sau bỏ trống */}
                  <ellipse cx={-205} cy={-42} rx={108} ry={132} fill={P.amber} opacity={0.11} />
                  {/* Đường viền đứt nét bóng ma vị trí phi công số 2 bỏ trống */}
                  <g transform="translate(-222 -10)">
                    <circle
                      cx={14}
                      cy={-82}
                      r={30}
                      fill="rgba(255,174,43,0.08)"
                      stroke={P.amberHot}
                      strokeWidth={3}
                      strokeDasharray="9 7"
                    />
                    <path
                      d="M-12,-44 L28,-40 L46,48 L112,56 L128,92 L-8,54 Z"
                      fill="rgba(255,174,43,0.06)"
                      stroke={P.amber}
                      strokeWidth={3}
                      strokeDasharray="11 8"
                      strokeLinejoin="round"
                    />
                  </g>
                  {/* Khung góc quét kỹ thuật khoanh vùng buồng lái sau + màn hình 10×19" thứ hai */}
                  <rect
                    x={-335}
                    y={-188}
                    width={286}
                    height={272}
                    rx={14}
                    fill="none"
                    stroke={P.amber}
                    strokeWidth={2.6}
                    strokeDasharray="16 10"
                  />
                  {/* Nhãn kỹ thuật chỉ màn hình 10×19" #2 */}
                  <g transform="translate(18 -164)">
                    <line x1={-66} y1={90} x2={-24} y2={16} stroke={P.amberHot} strokeWidth={2} />
                    <rect x={-56} y={-16} width={156} height={30} rx={6} fill={P.bgPanel} stroke={P.amber} strokeWidth={1.8} />
                    <text x={22} y={4} fontFamily={FONT} fontWeight={700} fontSize={14} fill={P.amberHot} textAnchor="middle">
                      2ND 10×19&quot; HD
                    </text>
                  </g>
                </g>
              )}

              {/* DẤU HỎI LỚN TINH TẾ TẠI 618.78s ("Why haul an empty cockpit?") */}
              {t >= CUE.s21_whyEmpty && (
                <g transform={`translate(-206 -56) scale(${whySpring})`}>
                  <polygon
                    points="0,-74 74,0 0,74 -74,0"
                    fill="rgba(15, 33, 58, 0.9)"
                    stroke={P.amberHot}
                    strokeWidth={3.6}
                  />
                  <polygon
                    points="0,-60 60,0 0,60 -60,0"
                    fill="none"
                    stroke={P.amber}
                    strokeWidth={1.6}
                    strokeDasharray="8 6"
                  />
                  <text
                    x={0}
                    y={26}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={78}
                    fill={P.amberHot}
                    textAnchor="middle"
                  >
                    ?
                  </text>
                </g>
              )}

              {/* Phù hiệu Không đoàn 142 Portland, Oregon (IOC tháng 7/2024 — Bay đơn Solo) */}
              {wing142In > 0.02 && (
                <g transform={`translate(215 245)`} opacity={wing142In}>
                  <rect x={-265} y={-34} width={530} height={68} rx={12} fill={P.bgPanel} stroke={P.cyan} strokeWidth={2.2} />
                  {/* Huy hiệu chim ưng đỏ Redhawks của 142nd Wing */}
                  <polygon points="-236,0 -212,-18 -192,0 -212,18" fill={P.red} stroke={P.amberHot} strokeWidth={1.8} />
                  <text x={24} y={-4} fontFamily={FONT} fontWeight={700} fontSize={20} fill={P.text} textAnchor="middle">
                    PORTLAND, OREGON · IOC JULY 2024
                  </text>
                  <text x={24} y={20} fontFamily={FONT} fontWeight={500} fontSize={15} fill={P.cyanSoft} textAnchor="middle">
                    FRONT SEAT: SOLO PILOT   |   REAR SEAT: UNOCCUPIED
                  </text>
                </g>
              )}
            </g>
          </g>

          {/* =====================================================================
              NHỊP 3 (x: 4560..6480, tâm 5520): MÀN HÌNH 10×19" PHÓNG TO -> KIẾN TRÚC MỞ OMS
             ===================================================================== */}
          <g transform="translate(5520 540)">
            <BlueprintGrid x0={-1100} y0={-660} w={2200} h={1320} step={110} id="s21_bp3" />

            {/* Khung màn hình cảm ứng 10×19" phía sau phóng đại toàn cảnh */}
            <rect
              x={-770}
              y={-425}
              width={1540}
              height={850}
              rx={28}
              fill="#19283a"
              stroke={P.f15Light}
              strokeWidth={3.5}
              filter="url(#sh)"
            />
            <rect x={-738} y={-392} width={1476} height={784} rx={18} fill="#081424" stroke={P.cyan} strokeWidth={2.4} />

            {/* Thanh tiêu đề giao diện hệ thống nhiệm vụ mở OMS */}
            <rect x={-708} y={-364} width={1416} height={62} rx={10} fill="#102744" stroke={P.gridBright} strokeWidth={1.6} />
            <circle cx={-672} cy={-333} r={10} fill={P.green} />
            <text x={-646} y={-326} fontFamily={FONT} fontWeight={700} fontSize={24} fill={P.text}>
              OPEN MISSION SYSTEMS (OMS) · PLUG &amp; PLAY ARCHITECTURE
            </text>
            <text x={680} y={-326} fontFamily={FONT} fontWeight={700} fontSize={18} fill={P.cyan} textAnchor="end">
              ADCP II BUS · READY
            </text>

            {/* Thanh Bus dữ liệu tốc độ cao trung tâm & 3 khe cắm module (Slots 01, 02, 03) */}
            <g transform="translate(0 132)">
              {/* Xương sống Bus dữ liệu số */}
              <rect x={-650} y={0} width={1300} height={54} rx={12} fill="#0e2440" stroke={P.cyan} strokeWidth={2.6} />
              <line
                x1={-620}
                y1={27}
                x2={620}
                y2={27}
                stroke={P.cyanSoft}
                strokeWidth={4}
                strokeDasharray="22 26"
                strokeDashoffset={-busFlow}
              />

              {/* 3 khe chân cắm chuẩn hóa OMS */}
              {[-430, 0, 430].map((sx, idx) => {
                const docked = [card1Dock, card2Dock, card3Dock][idx] > 0.96;
                const col = [P.amber, P.cyan, P.green][idx];
                return (
                  <g key={sx} transform={`translate(${sx} 0)`}>
                    <rect
                      x={-136}
                      y={-20}
                      width={272}
                      height={26}
                      rx={6}
                      fill="#163052"
                      stroke={docked ? col : P.gridBright}
                      strokeWidth={2.4}
                    />
                    {/* Hàng chân pin mạ vàng */}
                    {Array.from({ length: 11 }, (_, p) => (
                      <rect key={p} x={-104 + p * 19} y={-15} width={8} height={14} rx={1.5} fill={docked ? col : P.amber} opacity={0.85} />
                    ))}
                    {/* Đường mạch dẫn xuống lõi F-15EX Digital Airframe phía dưới */}
                    <path
                      d={`M0,54 L0,104 L${-sx * 0.55},144`}
                      fill="none"
                      stroke={docked ? col : P.grid}
                      strokeWidth={docked ? 3.5 : 1.8}
                    />
                  </g>
                );
              })}

              {/* Nút trung tâm F-15EX Digital Backbone ở đáy màn hình */}
              <g transform="translate(0 172)">
                <rect x={-270} y={-34} width={540} height={68} rx={14} fill="#132d4f" stroke={P.amber} strokeWidth={2.6} />
                <text x={0} y={-3} fontFamily={FONT} fontWeight={700} fontSize={21} fill={P.amberHot} textAnchor="middle">
                  F-15EX CORE FLIGHT &amp; WEAPONS BUS
                </text>
                <text x={0} y={21} fontFamily={FONT} fontWeight={500} fontSize={14} fill={P.cyanSoft} textAnchor="middle">
                  NO HARDWARE REWIRE · INSTANT SOFTWARE INTEGRATION
                </text>
              </g>
            </g>

            {/* BA KHỐI THẺ MODULE VŨ KHÍ & PHẦN MỀM TRƯỢT CẮM KHỚP VÀO KHE BUS NHƯ CÀI APP */}
            {[
              {
                sx: -430,
                dock: card1Dock,
                accent: P.amber,
                title: 'HYPERSONIC APP',
                sub: '22-FT BOOST-GLIDE · PLUG & FIRE',
                tag: 'SLOT 01',
                kind: 'hypersonic' as const,
              },
              {
                sx: 0,
                dock: card2Dock,
                accent: P.cyan,
                title: 'CCA DRONE CONTROL',
                sub: 'LOYAL WINGMAN QUARTERBACK',
                tag: 'SLOT 02',
                kind: 'drone' as const,
              },
              {
                sx: 430,
                dock: card3Dock,
                accent: P.green,
                title: 'EW UPDATE',
                sub: 'EPAWSS RF THREAT LIBRARY v4.8',
                tag: 'SLOT 03',
                kind: 'ew' as const,
              },
            ].map((m, idx) => {
              const cy = lerp(-235, -72, m.dock);
              const locked = m.dock > 0.96;
              return (
                <g key={idx} transform={`translate(${m.sx} ${cy})`} opacity={0.15 + 0.85 * Math.min(1, m.dock * 2.2)}>
                  {/* Hào quang chớp nhẹ lúc thẻ cắm sập vào khe bus */}
                  {locked && (
                    <rect
                      x={-174}
                      y={-166}
                      width={348}
                      height={338}
                      rx={22}
                      fill="none"
                      stroke={m.accent}
                      strokeWidth={6}
                      opacity={0.22}
                    />
                  )}
                  <rect
                    x={-168}
                    y={-160}
                    width={336}
                    height={326}
                    rx={20}
                    fill="#102542"
                    stroke={m.accent}
                    strokeWidth={locked ? 3.2 : 2}
                  />
                  {/* Đầu chân cắm dưới đáy thẻ */}
                  <rect x={-112} y={166} width={224} height={18} rx={4} fill={m.accent} />

                  {/* Nhãn khe & đèn trạng thái */}
                  <rect x={-144} y={-138} width={92} height={26} rx={6} fill="#0a182c" />
                  <text x={-98} y={-120} fontFamily={FONT} fontWeight={700} fontSize={13} fill={m.accent} textAnchor="middle">
                    {m.tag}
                  </text>
                  <rect
                    x={44}
                    y={-138}
                    width={100}
                    height={26}
                    rx={13}
                    fill={locked ? m.accent : '#1b3556'}
                  />
                  <text
                    x={94}
                    y={-120}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={13}
                    fill={locked ? P.ink : P.muted}
                    textAnchor="middle"
                  >
                    {locked ? 'INSTALLED' : 'LOADING'}
                  </text>

                  {/* Ô biểu tượng ứng dụng kiểu App Icon */}
                  <rect x={-126} y={-94} width={252} height={146} rx={18} fill="#091628" stroke={P.gridBright} strokeWidth={1.6} />
                  {m.kind === 'hypersonic' && <Weapon2D kind="hypersonic" x={0} y={-20} scale={1.25} accent={P.amber} />}
                  {m.kind === 'drone' && <DroneTop2D x={0} y={-20} scale={0.62} rot={-90} accent={P.cyan} />}
                  {m.kind === 'ew' && (
                    <g transform="translate(0 -20)">
                      <circle cx={0} cy={0} r={48} fill="none" stroke={P.green} strokeWidth={2.2} strokeDasharray="8 6" />
                      <path
                        d="M-88,6 L-54,6 L-40,-34 L-22,36 L-4,-42 L14,30 L30,-22 L46,6 L88,6"
                        fill="none"
                        stroke={P.green}
                        strokeWidth={3.4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  )}

                  {/* Tên module ứng dụng */}
                  <text x={0} y={92} fontFamily={FONT} fontWeight={700} fontSize={23} fill={P.text} textAnchor="middle">
                    {m.title}
                  </text>
                  <text x={0} y={118} fontFamily={FONT} fontWeight={500} fontSize={13.5} fill={P.muted} textAnchor="middle">
                    {m.sub}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.38} />

      {/* Tối đa 1 <Label> trên màn hình theo tuần tự */}
      <Label
        t={t}
        text='10×19" HD DISPLAY'
        x={960}
        y={74}
        from={CUE.s21_ladScreen}
        until={588.8}
        size={50}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="142ND WING · SOLO"
        x={960}
        y={88}
        from={CUE.s21_portland142}
        until={615.5}
        size={50}
        bg={P.cyan}
        fg={P.ink}
      />
    </>
  );
};

export default S21;
