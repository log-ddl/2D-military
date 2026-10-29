import React, { useMemo } from 'react';
import { Easing } from 'remotion';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  Shahed2D,
  TacticalGrid2D,
  ChuSection2D,
  TWallSection2D,
} from '../local/draw2d';
import { useT, useSpring, handheld, Layer } from '@kit/motion';
import { prog, lerp, bump } from '@kit/theme';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { skyline } from '@lib/2d/terrain';

// Trục bay khóa cứng: Shahed ở (680, 500) chúc mũi 9.5 độ nối thẳng 0.0 độ lệch tới khu nhà cố định (1666, 665)
const DRONE_X = 680;
const DRONE_Y = 500;
const DRONE_ROT = 9.5;
const DRONE_SCALE = 5.2;
const RAD = (DRONE_ROT * Math.PI) / 180;
const COS_R = Math.cos(RAD);
const SIN_R = Math.sin(RAD);

const droneWorld = (lx: number, ly: number): [number, number] => {
  const sx = lx * DRONE_SCALE;
  const sy = ly * DRONE_SCALE;
  return [
    DRONE_X + sx * COS_R - sy * SIN_R,
    DRONE_Y + sx * SIN_R + sy * COS_R,
  ];
};

const [NOSE_X, NOSE_Y] = droneWorld(70, 0);
const [MEM_X, MEM_Y] = droneWorld(11, 0);
const [CRPA_X, CRPA_Y] = droneWorld(-4, -13);
const [INS_X, INS_Y] = droneWorld(-24, 0);

const TARGET_X = 1666;
const TARGET_Y = 665;
const GROUND_RIGHT_Y = 712;

const S10: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const hillsFar = useMemo(() => skyline('s10_far', -500, 2600, 835, 95, 680, 1300), []);
  const hillsMid = useMemo(() => skyline('s10_mid', -500, 2600, 895, 78, 520, 1300), []);
  const hillsNear = useMemo(() => skyline('s10_near', -500, 2600, 965, 58, 380, 1300), []);

  // Tiến độ theo mốc CUE.*
  const pMem = prog(t, CUE.s10_mem_lock, CUE.s10_mem_lock + 0.95);
  const spMem = useSpring(t, CUE.s10_mem_lock, 12, 170);
  const memFlash = bump(t, CUE.s10_mem_lock, 0.9);

  const pJam = prog(t, CUE.s10_gps_jam, CUE.s10_gps_jam + 0.7);
  const jamFlicker = t >= CUE.s10_gps_jam ? 0.65 + 0.35 * Math.sin(t * 28) : 0;

  const pIns = prog(t, CUE.s10_ins_gyro, CUE.s10_ins_gyro + 0.9);
  const spIns = useSpring(t, CUE.s10_ins_gyro, 13, 150);
  const pOdo = prog(t, CUE.s10_ins_gyro, 206.4, Easing.linear);

  const pMetaphor = prog(t, CUE.s10_bullet_metaphor, CUE.s10_bullet_metaphor + 0.85);
  const spMetaphor = useSpring(t, CUE.s10_bullet_metaphor, 13, 155);

  // Điều phối Cam2D giữ đầy khung hình ở cả 4 nhịp (không bị khoảng trống rìa trái khi zoom INS)
  const c1 = prog(t, 192.0, 193.2);
  const c2 = prog(t, 194.8, 196.2);
  const c3 = prog(t, 201.6, 202.9);

  let camX = lerp(1015, 835, c1);
  camX = lerp(camX, 705, c2);
  camX = lerp(camX, 995, c3);

  let camY = lerp(510, 445, c1);
  camY = lerp(camY, 425, c2);
  camY = lerp(camY, 548, c3);

  let camZoom = lerp(0.99, 1.08, c1);
  camZoom = lerp(camZoom, 1.15, c2);
  camZoom = lerp(camZoom, 0.98, c3);

  const shake = handheld(t, 2.0, 's10_xray');
  const flightDrift = (t - 187.5) * 26;

  // Cửa sổ kính phóng đại Bo mạch bộ nhớ (phải-trên) & Cụm INS (trái-trên)
  const memLoupeX = 1015;
  const memLoupeY = 204;
  const memLoupeR = 104;

  const insLoupeX = 335;
  const insLoupeY = 212;
  const insLoupeR = 144;

  // Độ mở elip 3D của 2 khung gimbal con quay luôn giữ góc nhìn không gian 3 trục rõ rệt (không suy biến thành vòng tròn phẳng)
  const g1Ratio = 0.36 + 0.22 * Math.sin(t * 1.9);
  const g2Ratio = 0.34 + 0.22 * Math.cos(t * 2.35 + 0.6);
  const rotorSpin = (t * 440) % 360;

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <Layer>
          <Defs2D shadow="rgba(5, 10, 20, 0.58)" />
          <defs>
            <radialGradient id="s10BgGrad" cx="48%" cy="44%" r="68%">
              <stop offset="0%" stopColor={PAL2D.panel} />
              <stop offset="58%" stopColor={PAL2D.bgSlate} />
              <stop offset="100%" stopColor={PAL2D.bgNight} />
            </radialGradient>
            <radialGradient id="s10XrayGlow" cx="50%" cy="50%" r="52%">
              <stop offset="0%" stopColor="#1e4670" stopOpacity={0.55} />
              <stop offset="70%" stopColor="#102742" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#0c192b" stopOpacity={0} />
            </radialGradient>
            <clipPath id="s10MemClip">
              <circle cx={memLoupeX} cy={memLoupeY} r={memLoupeR - 4} />
            </clipPath>
            <clipPath id="s10InsClip">
              <circle cx={insLoupeX} cy={insLoupeY} r={insLoupeR - 5} />
            </clipPath>
          </defs>

          {/* 1. NỀN BẢN VẼ KỸ THUẬT & ĐỊA HÌNH SA MẠC ĐÊM */}
          <rect x={-350} y={-260} width={2680} height={1620} fill="url(#s10BgGrad)" />
          <TacticalGrid2D x={-350} y={-260} w={2680} h={1620} step={70} major={280} opacity={0.28} />

          {/* Thước chia toạ độ kỹ thuật dọc viền trên */}
          <g opacity={0.36} stroke={PAL2D.grid} strokeWidth={1.4} fill="none">
            <line x1={60} y1={48} x2={1900} y2={48} />
            {Array.from({ length: 20 }, (_, i) => {
              const tx = 60 + i * 96;
              return <line key={i} x1={tx} y1={48} x2={tx} y2={i % 2 === 0 ? 64 : 57} />;
            })}
          </g>

          {/* Ba lớp đồi sa mạc trôi ngược chiều bay */}
          <g transform={`translate(${-flightDrift * 0.25} 0)`}>
            <path d={hillsFar} fill={PAL2D.basaltDark} opacity={0.64} />
          </g>
          <g transform={`translate(${-flightDrift * 0.55} 0)`}>
            <path d={hillsMid} fill="#1b2738" opacity={0.84} />
          </g>
          <g transform={`translate(${-flightDrift * 0.9} 0)`}>
            <path d={hillsNear} fill="#111a27" />
          </g>

          {/* Bệ cao nguyên khu nhà mục tiêu cố định bên phải (nổi rõ ngay từ khung đầu 187.5s) */}
          <g>
            <path
              d={`M1430 1090 L1495 ${GROUND_RIGHT_Y} L1895 ${GROUND_RIGHT_Y} L1970 1090 Z`}
              fill="#223042"
              stroke={PAL2D.sandMid}
              strokeWidth={2.8}
            />
            {/* Nét gạch mặt cắt địa chất cao nguyên */}
            <g stroke={PAL2D.sandLo} strokeWidth={1.5} opacity={0.42}>
              {Array.from({ length: 12 }, (_, i) => {
                const gx = 1515 + i * 32;
                return <line key={i} x1={gx} y1={GROUND_RIGHT_Y + 3} x2={gx - 16} y2={GROUND_RIGHT_Y + 24} />;
              })}
            </g>
            <line x1={1495} y1={GROUND_RIGHT_Y} x2={1895} y2={GROUND_RIGHT_Y} stroke={PAL2D.sandHi} strokeWidth={3.2} />

            {/* Khu nhà cố định Tháp 22 (tường T-Wall + 2 dãy nhà ngủ CHU) */}
            <TWallSection2D x={1546} y={GROUND_RIGHT_Y} scale={0.76} />
            <ChuSection2D x={1622} y={GROUND_RIGHT_Y} scale={0.76} />
            <ChuSection2D x={1712} y={GROUND_RIGHT_Y} scale={0.76} />
            <TWallSection2D x={1788} y={GROUND_RIGHT_Y} scale={0.76} />

            {/* Cọc gióng toạ độ địa lý cố định trên nóc khu nhà ngay từ đầu cảnh */}
            <line
              x1={TARGET_X}
              y1={565}
              x2={TARGET_X}
              y2={TARGET_Y - 34}
              stroke={pMem > 0.1 ? PAL2D.amberHi : PAL2D.usMid}
              strokeWidth={1.8}
              strokeDasharray="5 5"
              opacity={0.75}
            />
            <circle
              cx={TARGET_X}
              cy={TARGET_Y}
              r={26}
              fill="none"
              stroke={pMem > 0.1 ? (pIns > 0.2 ? PAL2D.amberHi : PAL2D.threatHi) : PAL2D.usMid}
              strokeWidth={2.2}
              strokeDasharray="8 6"
              opacity={pMem > 0.1 ? 1 : 0.55}
            />

            {/* Khung khóa cứng tọa độ đích tại 188.50s */}
            {pMem > 0.02 && (
              <g transform={`translate(${TARGET_X} ${TARGET_Y}) scale(${lerp(1.45, 1, pMem)})`} opacity={pMem}>
                <circle r={40} fill={PAL2D.threatMid} opacity={0.16 + 0.1 * Math.sin(t * 6)} />
                <circle r={6} fill={PAL2D.amberHi} />
                {[-1, 1].map((sx) =>
                  [-1, 1].map((sy) => (
                    <path
                      key={`${sx}_${sy}`}
                      d={`M${sx * 16} ${sy * 35} L${sx * 35} ${sy * 35} L${sx * 35} ${sy * 16}`}
                      fill="none"
                      stroke={pIns > 0.2 ? PAL2D.amberHi : PAL2D.threatHi}
                      strokeWidth={3}
                    />
                  ))
                )}
              </g>
            )}
          </g>

          {/* 2. ĐƯỜNG VECTOR QUỸ ĐẠO KHOÁ CỨNG (NÉT KÉP HALO + LÕI, THẲNG TẮP TỚI KHU NHÀ) */}
          {/* Đường dự kiến mảnh trước khi khóa (187.5 - 188.5s) */}
          <line
            x1={NOSE_X}
            y1={NOSE_Y}
            x2={TARGET_X}
            y2={TARGET_Y}
            stroke={PAL2D.grid}
            strokeWidth={1.8}
            strokeDasharray="6 8"
            opacity={0.45 * (1 - pMem)}
          />
          {pMem > 0.01 && (
            <g>
              <line
                x1={MEM_X}
                y1={MEM_Y}
                x2={lerp(MEM_X, TARGET_X, pMem)}
                y2={lerp(MEM_Y, TARGET_Y, pMem)}
                stroke={pIns > 0.1 ? PAL2D.amberMid : PAL2D.threatMid}
                strokeWidth={pIns > 0.1 ? 14 : 9}
                strokeLinecap="round"
                opacity={pIns > 0.1 ? 0.28 : 0.2}
              />
              <line
                x1={MEM_X}
                y1={MEM_Y}
                x2={lerp(MEM_X, TARGET_X, pMem)}
                y2={lerp(MEM_Y, TARGET_Y, pMem)}
                stroke={pIns > 0.1 ? PAL2D.amberHi : PAL2D.threatHi}
                strokeWidth={pIns > 0.1 ? 4.2 : 3.4}
                strokeDasharray="18 8 5 8"
                strokeDashoffset={-t * 115}
                strokeLinecap="round"
              />
              {pMem > 0.8 && (
                <>
                  <g
                    transform={`translate(${lerp(NOSE_X + 60, TARGET_X - 50, 0.35)} ${lerp(NOSE_Y + 10, TARGET_Y - 8, 0.35)}) rotate(${DRONE_ROT})`}
                  >
                    <polygon points="18,0 -10,-10 -5,0 -10,10" fill={pIns > 0.1 ? PAL2D.amberHi : PAL2D.threatHi} />
                  </g>
                  <g
                    transform={`translate(${lerp(NOSE_X + 60, TARGET_X - 50, 0.72)} ${lerp(NOSE_Y + 10, TARGET_Y - 8, 0.72)}) rotate(${DRONE_ROT})`}
                  >
                    <polygon points="18,0 -10,-10 -5,0 -10,10" fill={pIns > 0.1 ? PAL2D.amberHi : PAL2D.threatHi} />
                  </g>
                </>
              )}
              {/* Thước cung khóa cứng góc nghiêng 0.0° sai lệch khi INS cầm lái */}
              {pIns > 0.2 && (
                <g transform={`translate(${NOSE_X + 26} ${NOSE_Y + 4})`} opacity={pIns}>
                  <line x1={0} y1={0} x2={135} y2={0} stroke={PAL2D.chalk} strokeWidth={1.6} strokeDasharray="4 4" opacity={0.6} />
                  <path d="M108 0 A108 108 0 0 1 106.5 18.0" fill="none" stroke={PAL2D.amberHi} strokeWidth={3} />
                  <circle cx={107} cy={9} r={4} fill={PAL2D.amberHi} />
                </g>
              )}
            </g>
          )}

          {/* 3. MẶT CẮT X-QUANG PHÓNG LỚN SHAHED2D (VIEW="SIDE", XRAY=TRUE, SCALE=5.2) */}
          <ellipse cx={DRONE_X} cy={DRONE_Y} rx={445} ry={180} fill="url(#s10XrayGlow)" />

          {/* Vệt khí động lao nhanh ở pha cuối */}
          {pMetaphor > 0.05 && (
            <g opacity={0.5 * pMetaphor} stroke={PAL2D.chalk} strokeLinecap="round">
              {[-108, -64, 62, 102].map((oy, idx) => {
                const len = 135 + (idx % 3) * 70;
                const sx = 240 + (((idx * 210 - t * 640) % 920) + 920) % 920;
                const sy = DRONE_Y + oy + (sx - DRONE_X) * Math.tan(RAD);
                return (
                  <line
                    key={idx}
                    x1={sx}
                    y1={sy}
                    x2={sx - len * COS_R}
                    y2={sy - len * SIN_R}
                    strokeWidth={idx % 2 === 0 ? 2.2 : 1.5}
                  />
                );
              })}
            </g>
          )}

          <Shahed2D
            x={DRONE_X}
            y={DRONE_Y}
            rot={DRONE_ROT}
            scale={DRONE_SCALE}
            view="side"
            xray={true}
            tint="putty"
            propAngle={t * 36}
          />

          {/* Giải phẫu chi tiết khoang nội thất bên trong thân X-quang */}
          <g transform={`translate(${DRONE_X} ${DRONE_Y}) rotate(${DRONE_ROT}) scale(${DRONE_SCALE})`}>
            {[-50, -35, -11, 25].map((bx) => (
              <line key={bx} x1={bx} y1={-8.4} x2={bx} y2={8.4} stroke={PAL2D.chalk} strokeWidth={0.55} opacity={0.48} />
            ))}
            <rect
              x={-49}
              y={-6.4}
              width={13}
              height={12.8}
              rx={1.5}
              fill={PAL2D.amberLo}
              fillOpacity={0.35}
              stroke={PAL2D.amberMid}
              strokeWidth={0.45}
            />
            <path
              d="M-4 -11.5 L-4 -4 L3 -2"
              fill="none"
              stroke={pJam > 0.4 ? PAL2D.threatMid : PAL2D.usHi}
              strokeWidth={0.75}
              strokeDasharray={pJam > 0.4 ? '1.4 1.2' : undefined}
            />
            <path
              d="M-17 0 L2 0 M-31 0 L-56 3.5"
              fill="none"
              stroke={pIns > 0.1 ? PAL2D.amberHi : PAL2D.muted}
              strokeWidth={pIns > 0.1 ? 1.1 : 0.6}
            />
            {pIns > 0.05 && (
              <g opacity={pIns}>
                <circle cx={-24} cy={0} r={8.6} fill={PAL2D.amberMid} opacity={0.3 + 0.12 * Math.sin(t * 9)} />
                <circle cx={-24} cy={0} r={5.4} fill="none" stroke={PAL2D.amberHi} strokeWidth={0.95} />
                <line x1={-31} y1={0} x2={-15} y2={0} stroke={PAL2D.amberHi} strokeWidth={0.95} />
              </g>
            )}
            {pMem > 0.05 && (
              <g opacity={pMem}>
                <rect
                  x={1.5}
                  y={-6.5}
                  width={19}
                  height={13}
                  rx={2}
                  fill={PAL2D.amberHi}
                  opacity={0.22 + 0.45 * memFlash}
                />
                <circle cx={11} cy={0} r={2.4} fill={PAL2D.amberHi} />
              </g>
            )}
            {Array.from({ length: 5 }, (_, k) => (
              <line
                key={k}
                x1={31 + k * 5.2}
                y1={-5.5 + k * 0.35}
                x2={31 + k * 5.2}
                y2={5.5 - k * 0.35}
                stroke={PAL2D.amberHi}
                strokeWidth={0.4}
                opacity={0.55}
              />
            ))}
          </g>

          {/* 4. PHA 2 (192.6s): SÓNG VỆ TINH GNSS TỪ TRÊN XUỐNG BỊ SÓNG NHIỄU XANH NGỌC CẮT ĐỨT GÃY KHÚC */}
          <g>
            {/* Vệ tinh GNSS */}
            <g transform="translate(652 86) rotate(11)">
              <rect x={-96} y={-11} width={64} height={22} rx={2} fill={PAL2D.usLo} stroke={PAL2D.usHi} strokeWidth={2} />
              <line x1={-75} y1={-11} x2={-75} y2={11} stroke={PAL2D.usHi} strokeWidth={1} opacity={0.6} />
              <line x1={-53} y1={-11} x2={-53} y2={11} stroke={PAL2D.usHi} strokeWidth={1} opacity={0.6} />
              <rect x={32} y={-11} width={64} height={22} rx={2} fill={PAL2D.usLo} stroke={PAL2D.usHi} strokeWidth={2} />
              <line x1={53} y1={-11} x2={53} y2={11} stroke={PAL2D.usHi} strokeWidth={1} opacity={0.6} />
              <line x1={75} y1={-11} x2={75} y2={11} stroke={PAL2D.usHi} strokeWidth={1} opacity={0.6} />
              <rect x={-24} y={-16} width={48} height={32} rx={4} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.4} />
              <rect x={-18} y={-11} width={20} height={22} fill={PAL2D.concreteHi} opacity={0.7} />
              <path d="M-14 16 C-10 27 10 27 14 16" fill={PAL2D.usMid} stroke={PAL2D.ink} strokeWidth={2} />
              <line x1={0} y1={24} x2={0} y2={34} stroke={PAL2D.usHi} strokeWidth={2.5} />
            </g>

            {pJam < 0.35 ? (
              <g opacity={0.86}>
                <line
                  x1={655}
                  y1={124}
                  x2={CRPA_X}
                  y2={CRPA_Y}
                  stroke={PAL2D.usHi}
                  strokeWidth={3}
                  strokeDasharray="10 8"
                  strokeDashoffset={-t * 55}
                />
                {[0, 1, 2, 3].map((w) => {
                  const progW = (t * 0.9 + w * 0.25) % 1;
                  const wy = lerp(140, CRPA_Y - 16, progW);
                  const wx = lerp(655, CRPA_X, progW);
                  const radW = 16 + progW * 26;
                  return (
                    <path
                      key={w}
                      d={`M${wx - radW} ${wy - 6} Q${wx} ${wy + 12} ${wx + radW} ${wy - 6}`}
                      fill="none"
                      stroke={PAL2D.usHi}
                      strokeWidth={2.4}
                      opacity={1 - progW * 0.75}
                    />
                  );
                })}
              </g>
            ) : (
              <g>
                <line
                  x1={655}
                  y1={124}
                  x2={662}
                  y2={252}
                  stroke={PAL2D.usHi}
                  strokeWidth={2.6}
                  strokeDasharray="9 7"
                  opacity={0.65}
                />
                <path
                  d="M662 256 L638 282 L688 304 L646 330 L692 348"
                  fill="none"
                  stroke={PAL2D.threatHi}
                  strokeWidth={3.4}
                  strokeDasharray="8 6"
                  opacity={jamFlicker}
                />
                <g transform={`translate(${CRPA_X + 2} ${CRPA_Y - 46})`}>
                  <circle r={21} fill={PAL2D.bgConsole} stroke={PAL2D.threatMid} strokeWidth={3} />
                  <path d="M-9 -9 L9 9 M9 -9 L-9 9" stroke={PAL2D.threatHi} strokeWidth={4} strokeLinecap="round" />
                </g>
              </g>
            )}

            {/* Trạm phát sóng nhiễu EW mặt đất */}
            {pJam > 0.01 && (
              <g opacity={pJam}>
                <g transform="translate(565 868)">
                  <rect x={-28} y={0} width={56} height={18} rx={3} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={2.2} />
                  <line x1={0} y1={0} x2={0} y2={-34} stroke={PAL2D.concreteMid} strokeWidth={5} />
                  <path d="M-26 -45 Q0 -18 26 -45" fill="none" stroke={PAL2D.ewTeal} strokeWidth={4.2} />
                  <line x1={0} y1={-32} x2={12} y2={-56} stroke={PAL2D.ewTeal} strokeWidth={2.8} />
                </g>

                {/* Tia nhiễu cắt đứt sóng vệ tinh trên lưng (tắt dần ở pha cuối để nhường chỗ cho sóng nhiễu dội bật khỏi bụng thân) */}
                {pMetaphor < 0.95 && (
                  <g opacity={1 - pMetaphor}>
                    <path
                      d="M577 812 L598 672 L582 650 L622 508 L606 488 L648 332 L632 312 L674 254"
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={10}
                      opacity={0.22}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      {...drawOn(680, pJam)}
                    />
                    <path
                      d="M577 812 L598 672 L582 650 L622 508 L606 488 L648 332 L632 312 L674 254"
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={3.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      {...drawOn(680, pJam)}
                    />
                    {[0, 1, 2].map((k) => {
                      const ph = (t * 1.6 + k * 0.33) % 1;
                      const r = 18 + ph * 64;
                      return (
                        <ellipse
                          key={k}
                          cx={664}
                          cy={282}
                          rx={r * 1.35}
                          ry={r * 0.52}
                          fill="none"
                          stroke={PAL2D.ewTeal}
                          strokeWidth={2.6}
                          opacity={(1 - ph) * 0.85}
                        />
                      );
                    })}
                  </g>
                )}
              </g>
            )}
          </g>

          {/* 5. PHA 1 (188.5s): CỬA SỔ PHÓNG ĐẠI BO MẠCH BỘ NHỚ NẠP CỨNG TỌA ĐỘ MỤC TIÊU */}
          <g opacity={lerp(0.6, 1, pMem)}>
            <polygon
              points={`${MEM_X},${MEM_Y} ${memLoupeX - 72},${memLoupeY + 72} ${memLoupeX + 46},${memLoupeY + 90}`}
              fill={PAL2D.amberMid}
              opacity={0.09 + 0.08 * pMem}
            />
            <line
              x1={MEM_X}
              y1={MEM_Y}
              x2={memLoupeX - 68}
              y2={memLoupeY + 74}
              stroke={pMem > 0.1 ? PAL2D.amberHi : PAL2D.grid}
              strokeWidth={2}
              strokeDasharray="6 4"
            />
            <line
              x1={MEM_X}
              y1={MEM_Y}
              x2={memLoupeX + 44}
              y2={memLoupeY + 91}
              stroke={pMem > 0.1 ? PAL2D.amberHi : PAL2D.grid}
              strokeWidth={2}
              strokeDasharray="6 4"
            />

            <g filter="url(#sh)">
              <circle cx={memLoupeX} cy={memLoupeY} r={memLoupeR} fill={PAL2D.bgConsole} />
            </g>

            <g clipPath="url(#s10MemClip)">
              <rect
                x={memLoupeX - 80}
                y={memLoupeY - 60}
                width={160}
                height={120}
                rx={8}
                fill="#0d293e"
                stroke={PAL2D.ewTealLo}
                strokeWidth={2.4}
              />
              {[-36, -18, 0, 18, 36].map((ry, i) => (
                <g key={i}>
                  <line
                    x1={memLoupeX - 76}
                    y1={memLoupeY + ry}
                    x2={memLoupeX - 38}
                    y2={memLoupeY + ry}
                    stroke={pMem > 0.2 ? PAL2D.amberMid : PAL2D.ewTealLo}
                    strokeWidth={2.2}
                  />
                  <line
                    x1={memLoupeX + 38}
                    y1={memLoupeY + ry}
                    x2={memLoupeX + 76}
                    y2={memLoupeY + ry}
                    stroke={pMem > 0.2 ? PAL2D.amberMid : PAL2D.ewTealLo}
                    strokeWidth={2.2}
                  />
                </g>
              ))}
              {[-28, -14, 0, 14, 28].map((px, i) => (
                <g key={i} fill={PAL2D.concreteHi}>
                  <rect x={memLoupeX + px - 3} y={memLoupeY - 48} width={6} height={11} rx={1} />
                  <rect x={memLoupeX + px - 3} y={memLoupeY + 37} width={6} height={11} rx={1} />
                </g>
              ))}
              <rect
                x={memLoupeX - 42}
                y={memLoupeY - 37}
                width={84}
                height={74}
                rx={5}
                fill="#131f30"
                stroke={pMem > 0.2 ? PAL2D.amberHi : PAL2D.usMid}
                strokeWidth={2.8}
              />
              {[-20, -6, 8].map((by, r) =>
                [-24, -8, 8, 24].map((bx, c) => {
                  const on = pMem > (r * 4 + c) / 14;
                  return (
                    <rect
                      key={`${r}_${c}`}
                      x={memLoupeX + bx - 5}
                      y={memLoupeY + by - 12}
                      width={10}
                      height={7.5}
                      rx={1.5}
                      fill={on ? ((r + c) % 2 === 0 ? PAL2D.amberHi : PAL2D.ewTeal) : '#1e334d'}
                    />
                  );
                })
              )}
              {pMem > 0.35 && (
                <g transform={`translate(${memLoupeX} ${memLoupeY + 19}) scale(${Math.min(1.15, spMem)})`}>
                  <path d="M-6 -2 L-6 -7 A6 6 0 0 1 6 -7 L6 -2" fill="none" stroke={PAL2D.amberHi} strokeWidth={2.8} />
                  <rect x={-9.5} y={-2} width={19} height={13.5} rx={2.5} fill={PAL2D.amberMid} stroke={PAL2D.ink} strokeWidth={1.6} />
                  <circle cx={0} cy={4.8} r={2.2} fill={PAL2D.ink} />
                </g>
              )}
              {pMem > 0.05 &&
                [-1, 1].map((sx) =>
                  [-1, 1].map((sy) => {
                    const d = lerp(22, 0, Math.min(1, spMem));
                    return (
                      <path
                        key={`cl_${sx}_${sy}`}
                        d={`M${memLoupeX + sx * (48 + d)} ${memLoupeY + sy * (29 + d)} L${memLoupeX + sx * (48 + d)} ${memLoupeY + sy * (43 + d)} L${memLoupeX + sx * (31 + d)} ${memLoupeY + sy * (43 + d)}`}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={3.5}
                        strokeLinecap="round"
                      />
                    );
                  })
                )}
            </g>

            <circle
              cx={memLoupeX}
              cy={memLoupeY}
              r={memLoupeR}
              fill="none"
              stroke={pMem > 0.1 ? PAL2D.amberMid : PAL2D.usMid}
              strokeWidth={4.2}
            />
            <circle cx={memLoupeX} cy={memLoupeY} r={memLoupeR - 6} fill="none" stroke={PAL2D.chalk} strokeWidth={1} opacity={0.35} />
          </g>

          {/* 6. PHA 3 (195.2–201.7s): CỬA SỔ PHÓNG ĐẠI CỤM DẪN ĐƯỜNG QUÁN TÍNH INS (CON QUAY 3 TRỤC + HỘP GIA TỐC KẾ & ĐẾM QUÃNG ĐƯỜNG RỜI KHÔNG BỊ CẮT VIỀN) */}
          <g
            transform={`translate(${insLoupeX} ${insLoupeY + 60}) scale(${lerp(0.88, 1, Math.min(1, spIns > 0 ? spIns : 0.25))}) translate(${-insLoupeX} ${-(insLoupeY + 60)})`}
            opacity={lerp(0.36, 1, pIns)}
          >
            {/* Chùm gióng nối từ lõi INS giữa thân lên cụm cửa sổ phóng đại */}
            <polygon
              points={`${INS_X},${INS_Y} ${insLoupeX + 55},${insLoupeY + 128} ${insLoupeX + 138},${insLoupeY + 38}`}
              fill={PAL2D.amberHi}
              opacity={0.07 + 0.13 * pIns}
            />
            <line
              x1={INS_X}
              y1={INS_Y}
              x2={insLoupeX + 55}
              y2={insLoupeY + 128}
              stroke={pIns > 0.1 ? PAL2D.amberHi : PAL2D.grid}
              strokeWidth={2.4}
              strokeDasharray="7 5"
            />
            <line
              x1={INS_X}
              y1={INS_Y}
              x2={insLoupeX + 138}
              y2={insLoupeY + 38}
              stroke={pIns > 0.1 ? PAL2D.amberHi : PAL2D.grid}
              strokeWidth={2.4}
              strokeDasharray="7 5"
            />

            {/* Kính tròn lớn: 3 VÒNG GIMBAL CON QUAY HỒI CHUYỂN 3 TRỤC (3-AXIS GYROSCOPE) */}
            <g filter="url(#sh)">
              <circle cx={insLoupeX} cy={insLoupeY} r={insLoupeR} fill={PAL2D.bgConsole} />
            </g>

            <g clipPath="url(#s10InsClip)">
              <circle cx={insLoupeX} cy={insLoupeY} r={128} fill="#0e1f36" stroke={PAL2D.gridSoft} strokeWidth={1.6} />
              {Array.from({ length: 36 }, (_, i) => {
                const a = (i * 10 * Math.PI) / 180;
                const r0 = i % 3 === 0 ? 115 : 121;
                const r1 = 128;
                return (
                  <line
                    key={i}
                    x1={insLoupeX + Math.cos(a) * r0}
                    y1={insLoupeY + Math.sin(a) * r0}
                    x2={insLoupeX + Math.cos(a) * r1}
                    y2={insLoupeY + Math.sin(a) * r1}
                    stroke={i % 9 === 0 ? PAL2D.amberHi : PAL2D.grid}
                    strokeWidth={i % 3 === 0 ? 2.2 : 1.2}
                    opacity={0.8}
                  />
                );
              })}

              <g transform={`translate(${insLoupeX} ${insLoupeY})`}>
                <circle r={90} fill={PAL2D.amberMid} opacity={0.15 * pIns} />

                {/* Vòng vỏ ổ đỡ cố định ngoài cùng */}
                <circle r={112} fill="none" stroke={PAL2D.concreteMid} strokeWidth={5.5} />
                <rect x={-8} y={-119} width={16} height={12} rx={2} fill={PAL2D.concreteHi} stroke={PAL2D.ink} strokeWidth={1.6} />
                <rect x={-8} y={107} width={16} height={12} rx={2} fill={PAL2D.concreteHi} stroke={PAL2D.ink} strokeWidth={1.6} />

                {/* Vòng Gimbal Trục 1 (Roll - nghiêng chéo 3D rõ nét) */}
                <g transform={`rotate(${26 + 11 * Math.sin(t * 1.15)})`}>
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={98}
                    ry={98 * g1Ratio}
                    fill="none"
                    stroke={PAL2D.amberLo}
                    strokeWidth={7.5}
                  />
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={98}
                    ry={98 * g1Ratio}
                    fill="none"
                    stroke={PAL2D.amberMid}
                    strokeWidth={4}
                  />
                  <line x1={-110} y1={0} x2={-98} y2={0} stroke={PAL2D.concreteHi} strokeWidth={4} />
                  <line x1={98} y1={0} x2={110} y2={0} stroke={PAL2D.concreteHi} strokeWidth={4} />
                  <circle cx={-98} cy={0} r={5.2} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={1.5} />
                  <circle cx={98} cy={0} r={5.2} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={1.5} />
                </g>

                {/* Vòng Gimbal Trục 2 (Pitch - trực giao chéo góc với Trục 1) */}
                <g transform={`rotate(${-44 + 13 * Math.cos(t * 1.4)})`}>
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={76 * g2Ratio}
                    ry={76}
                    fill="none"
                    stroke={PAL2D.amberMid}
                    strokeWidth={6.5}
                  />
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={76 * g2Ratio}
                    ry={76}
                    fill="none"
                    stroke={PAL2D.amberHi}
                    strokeWidth={3.2}
                  />
                  <circle cx={0} cy={-76} r={4.8} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={1.5} />
                  <circle cx={0} cy={76} r={4.8} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={1.5} />
                </g>

                {/* Vòng Gimbal Trục 3 & Đĩa bánh đà con quay tốc độ cao khóa cứng trục +9.5 độ */}
                <g transform={`rotate(${DRONE_ROT})`}>
                  <line x1={-104} y1={0} x2={106} y2={0} stroke={PAL2D.amberHi} strokeWidth={8} opacity={0.25} strokeLinecap="round" />
                  <line x1={-102} y1={0} x2={104} y2={0} stroke={PAL2D.amberHi} strokeWidth={3.4} strokeLinecap="round" />
                  <polygon points="110,0 92,-8 96,0 92,8" fill={PAL2D.amberHi} />

                  {/* Đĩa bánh đà vàng kim quay tốc độ cao */}
                  <ellipse
                    cx={0}
                    cy={0}
                    rx={18}
                    ry={50}
                    fill={PAL2D.amberMid}
                    fillOpacity={0.38}
                    stroke={PAL2D.amberHi}
                    strokeWidth={4}
                  />
                  {[0, 60, 120].map((ang) => {
                    const radS = ((rotorSpin + ang) * Math.PI) / 180;
                    return (
                      <line
                        key={ang}
                        x1={Math.cos(radS) * 15}
                        y1={Math.sin(radS) * 46}
                        x2={-Math.cos(radS) * 15}
                        y2={-Math.sin(radS) * 46}
                        stroke={PAL2D.paper}
                        strokeWidth={2.4}
                        opacity={0.88}
                      />
                    );
                  })}
                  <circle cx={0} cy={0} r={11.5} fill={PAL2D.amberMid} stroke={PAL2D.ink} strokeWidth={2.4} />
                  <circle cx={0} cy={0} r={4.5} fill={PAL2D.paper} />
                </g>
              </g>
            </g>

            {/* Vành đồng hồ vàng kim cửa sổ con quay */}
            <circle
              cx={insLoupeX}
              cy={insLoupeY}
              r={insLoupeR}
              fill="none"
              stroke={pIns > 0.1 ? PAL2D.amberHi : PAL2D.grid}
              strokeWidth={5}
            />
            <circle
              cx={insLoupeX}
              cy={insLoupeY}
              r={insLoupeR + 7}
              fill="none"
              stroke={PAL2D.amberMid}
              strokeWidth={1.6}
              strokeDasharray="16 10"
              opacity={0.7 * pIns}
            />

            {/* HỘP GIẢI PHẪU GẮN LIỀN DƯỚI ĐÁY CỬA SỔ INS (KHÔNG BỊ CLIP): TRỤC CẢM BIẾN GIA TỐC + VẠCH ĐẾM QUÃNG ĐƯỜNG */}
            <g transform={`translate(${insLoupeX} ${insLoupeY + 196})`} filter="url(#sh)">
              {/* Khớp nối cơ khí từ vòng con quay xuống hộp gia tốc kế */}
              <rect x={-34} y={-55} width={68} height={16} fill={PAL2D.bgConsole} stroke={PAL2D.amberMid} strokeWidth={2.2} />
              <rect
                x={-166}
                y={-44}
                width={332}
                height={92}
                rx={10}
                fill={PAL2D.bgConsole}
                stroke={pIns > 0.1 ? PAL2D.amberHi : PAL2D.grid}
                strokeWidth={3.4}
              />

              {/* Tầng trên: Trục cảm biến gia tốc (khối chuẩn quán tính + lò xo đôi + bản tụ vi cơ) */}
              <g transform="translate(0 -18)">
                <line x1={-136} y1={0} x2={136} y2={0} stroke={PAL2D.concreteLo} strokeWidth={2.8} />
                <rect x={-144} y={-13} width={9} height={26} rx={2} fill={PAL2D.concreteMid} />
                <rect x={135} y={-13} width={9} height={26} rx={2} fill={PAL2D.concreteMid} />
                {/* Răng lược cảm biến điện dung cố định */}
                {[-32, -16, 0, 16, 32].map((cx) => (
                  <g key={cx} stroke={PAL2D.ewTeal} strokeWidth={1.8} opacity={0.7}>
                    <line x1={cx} y1={-18} x2={cx} y2={-12} />
                    <line x1={cx} y1={12} x2={cx} y2={18} />
                  </g>
                ))}
                {(() => {
                  const massShift = pIns > 0.1 ? 14 + 6 * Math.sin(t * 6.2) : 0;
                  return (
                    <>
                      <path
                        d={`M-135 0 L-112 -8 L-94 8 L-76 -8 L-58 8 L${-28 + massShift} 0`}
                        fill="none"
                        stroke={PAL2D.usHi}
                        strokeWidth={2.4}
                      />
                      <path
                        d={`M${28 + massShift} 0 L52 -8 L72 8 L92 -8 L112 8 L135 0`}
                        fill="none"
                        stroke={PAL2D.usHi}
                        strokeWidth={2.4}
                      />
                      <rect
                        x={-28 + massShift}
                        y={-12}
                        width={56}
                        height={24}
                        rx={4}
                        fill={PAL2D.amberMid}
                        stroke={PAL2D.amberHi}
                        strokeWidth={2.4}
                      />
                      <polygon
                        points={`${14 + massShift},0 ${-4 + massShift},-6 ${-4 + massShift},6`}
                        fill={PAL2D.ink}
                      />
                    </>
                  );
                })()}
              </g>

              {/* Tầng dưới: Thanh 16 vạch tự đếm quãng đường tích phân (Odometer) */}
              <g transform="translate(0 21)">
                {Array.from({ length: 16 }, (_, k) => {
                  const bx = -142 + k * 18;
                  const lit = pOdo >= (k + 0.35) / 16;
                  return (
                    <rect
                      key={k}
                      x={bx}
                      y={-9}
                      width={13.5}
                      height={16}
                      rx={2}
                      fill={lit ? PAL2D.amberHi : '#162b46'}
                      stroke={lit ? PAL2D.amberMid : PAL2D.gridSoft}
                      strokeWidth={1.3}
                    />
                  );
                })}
                <line x1={-144} y1={13} x2={144} y2={13} stroke={PAL2D.amberMid} strokeWidth={1.6} opacity={0.8} />
                {/* Con trỏ tiến độ đếm quãng đường trượt dọc thước */}
                <polygon
                  points={`${lerp(-140, 140, pOdo)},10 ${lerp(-140, 140, pOdo) - 6},20 ${lerp(-140, 140, pOdo) + 6},20`}
                  fill={PAL2D.amberHi}
                />
              </g>
            </g>
          </g>

          {/* 7. PHA 4 (202.2–206.8s): SÓNG NHIỄU DỘI BẬT RA NGOÀI VỎ THÂN & KHUNG ẨN DỤ LOA HÉT VÀO VIÊN ĐẠN */}
          {pMetaphor > 0.01 && (
            <g opacity={pMetaphor}>
              {/* Vòng sóng nhiễu xanh ngọc bắn từ trạm EW dưới đất lên chỉ dội bật vô hại khỏi vỏ bụng Shahed */}
              {[0, 1, 2, 3].map((w) => {
                const ph = (t * 1.45 + w * 0.25) % 1;
                if (ph <= 0.54) {
                  const pUp = ph / 0.54;
                  const cx = lerp(575, 695, pUp);
                  const cy = lerp(808, 558, pUp);
                  const rw = 34 + pUp * 68;
                  return (
                    <path
                      key={`up_${w}`}
                      d={`M${cx - rw} ${cy + 16} Q${cx} ${cy - 24} ${cx + rw} ${cy + 16}`}
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={3.8}
                      opacity={0.9}
                    />
                  );
                }
                const pBounce = (ph - 0.54) / 0.46;
                return (
                  <g key={`bn_${w}`} opacity={1 - pBounce}>
                    <path
                      d={`M${645 - pBounce * 95} ${560 + pBounce * 68} Q${618 - pBounce * 110} ${592 + pBounce * 85} ${582 - pBounce * 125} ${580 + pBounce * 102}`}
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={3.2}
                      strokeDasharray="12 6"
                    />
                    <path
                      d={`M${735 + pBounce * 100} ${574 + pBounce * 62} Q${770 + pBounce * 115} ${602 + pBounce * 82} ${804 + pBounce * 130} ${588 + pBounce * 98}`}
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={3.2}
                      strokeDasharray="12 6"
                    />
                  </g>
                );
              })}

              {/* Vành phản xạ vàng kim dưới bụng thân nơi sóng nhiễu dội bật ra */}
              <g transform={`translate(${DRONE_X} ${DRONE_Y}) rotate(${DRONE_ROT})`}>
                <path
                  d="M-250 56 Q20 66 300 54"
                  fill="none"
                  stroke={PAL2D.amberHi}
                  strokeWidth={3.6}
                  opacity={0.6 + 0.25 * Math.sin(t * 14)}
                />
              </g>

              {/* KHUNG ẨN DỤ PHÓNG LỚN RÕ NÉT: DÙNG LOA HÉT VÀO VIÊN ĐẠN ĐÃ BAY KHỎI NÒNG */}
              <g transform={`translate(1150 858) scale(${Math.min(1, spMetaphor)}) translate(-1150 -858)`} filter="url(#sh)">
                <rect
                  x={820}
                  y={728}
                  width={650}
                  height={258}
                  rx={14}
                  fill={PAL2D.bgConsole}
                  fillOpacity={0.92}
                  stroke={PAL2D.amberMid}
                  strokeWidth={2.8}
                  strokeDasharray="16 8"
                />

                {/* Đầu nòng súng trường khạc khói bên trái */}
                <g transform="translate(848 796)">
                  <rect x={-26} y={-17} width={50} height={34} rx={2} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={2.4} />
                  <rect x={24} y={-12} width={20} height={24} rx={2} fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={2.2} />
                  <circle cx={58} cy={-8} r={14} fill={PAL2D.paperDim} opacity={0.24} />
                  <circle cx={74} cy={6} r={10} fill={PAL2D.paperDim} opacity={0.18} />
                </g>

                {/* Trục đường đạn căng thẳng tắp */}
                <line
                  x1={892}
                  y1={796}
                  x2={1445}
                  y2={796}
                  stroke={PAL2D.amberHi}
                  strokeWidth={3.2}
                  strokeDasharray="16 8"
                />

                {/* Viên đạn đồng cỡ lớn lao xuyên nón xung kích siêu thanh Mach */}
                {(() => {
                  const bx = 1235 + Math.sin(t * 10) * 7;
                  const by = 796;
                  return (
                    <g transform={`translate(${bx} ${by})`}>
                      <path
                        d="M-280 -6 Q-210 11 -140 -6 T0 0"
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={2.4}
                        opacity={0.55}
                      />
                      <path
                        d="M-255 7 Q-185 -10 -115 7 T0 0"
                        fill="none"
                        stroke={PAL2D.chalk}
                        strokeWidth={1.8}
                        opacity={0.4}
                      />
                      {/* Nón sóng xung kích Mach sắc nét */}
                      <path
                        d="M74 0 L-125 -64 M74 0 L-125 64"
                        fill="none"
                        stroke={PAL2D.chalk}
                        strokeWidth={2.6}
                        opacity={0.55}
                        strokeDasharray="12 6"
                      />
                      {/* Thân viên đạn đồng 3 tông sáng/trung/tối phóng lớn */}
                      <path
                        d="M-58 -17 L10 -17 C38 -17 61 -8 74 0 C61 8 38 17 10 17 L-58 17 Z"
                        fill={PAL2D.amberMid}
                        stroke={PAL2D.ink}
                        strokeWidth={3}
                      />
                      <path d="M-55 -14 L10 -14 C35 -14 54 -8 67 -1.5 L10 -4 L-55 -4 Z" fill={PAL2D.amberHi} opacity={0.88} />
                      <path d="M-55 5 L10 5 L65 2.5 C53 9 35 14 10 14 L-55 14 Z" fill={PAL2D.amberLo} opacity={0.78} />
                      <line x1={-40} y1={-16} x2={-40} y2={16} stroke={PAL2D.ink} strokeWidth={2.4} />
                    </g>
                  );
                })()}

                {/* Chiếc loa phóng thanh cỡ lớn (Megaphone) hét sóng âm từ dưới lên */}
                <g transform="translate(1055 944) rotate(-33)">
                  <rect x={-20} y={8} width={13} height={30} rx={3} transform="rotate(20)" fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={2.2} />
                  <rect x={-34} y={-14} width={23} height={28} rx={3.5} fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2.4} />
                  <polygon
                    points="-11,-14 56,-39 56,39 -11,14"
                    fill={PAL2D.concreteHi}
                    stroke={PAL2D.ink}
                    strokeWidth={2.8}
                    strokeLinejoin="round"
                  />
                  <polygon points="-8,-5 53,-18 53,18 -8,5" fill={PAL2D.concreteMid} opacity={0.68} />
                  <ellipse cx={56} cy={0} rx={6.5} ry={39} fill={PAL2D.ewTealLo} stroke={PAL2D.ink} strokeWidth={2.4} />
                </g>

                {/* Sóng âm từ loa phóng lên đập vào viên đạn rồi vỡ dội ngược sang hai bên */}
                {[0, 1, 2].map((s) => {
                  const ph = (t * 1.8 + s * 0.33) % 1;
                  if (ph < 0.55) {
                    const p = ph / 0.55;
                    const sx = lerp(1105, 1196, p);
                    const sy = lerp(902, 822, p);
                    const radS = 22 + p * 40;
                    return (
                      <path
                        key={`ms_${s}`}
                        d={`M${sx - radS * 0.8} ${sy - radS * 0.45} Q${sx + radS * 0.35} ${sy - radS * 0.35} ${sx + radS * 0.65} ${sy + radS * 0.65}`}
                        fill="none"
                        stroke={PAL2D.ewTeal}
                        strokeWidth={3.8}
                        opacity={0.92}
                      />
                    );
                  }
                  const pb = (ph - 0.55) / 0.45;
                  return (
                    <g key={`mb_${s}`} opacity={1 - pb}>
                      <path
                        d={`M${1184 - pb * 58} ${820 + pb * 36} Q${1160 - pb * 70} ${842 + pb * 50} ${1134 - pb * 84} ${834 + pb * 64}`}
                        fill="none"
                        stroke={PAL2D.ewTeal}
                        strokeWidth={3}
                        strokeDasharray="8 5"
                      />
                      <path
                        d={`M${1234 + pb * 64} ${819 + pb * 34} Q${1262 + pb * 78} ${838 + pb * 48} ${1288 + pb * 92} ${828 + pb * 60}`}
                        fill="none"
                        stroke={PAL2D.ewTeal}
                        strokeWidth={3}
                        strokeDasharray="8 5"
                      />
                    </g>
                  );
                })}
              </g>
            </g>
          )}
        </Layer>
      </Cam2D>
      <Grain opacity={0.42} />
    </>
  );
};

export default S10;
