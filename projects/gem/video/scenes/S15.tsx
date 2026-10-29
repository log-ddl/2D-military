// S15 (279.94 – 299.90s, thuần 2D): POV bàn điều khiển phòng không FAAD trong phòng trực BDOC
// & màn hình phụ ảnh nhiệt hồng ngoại NightHawk khóa cứng về hướng Đông–Bắc.
// Kíp trực rán mắt vào tín hiệu ScanEagle phía Bắc, lờ đi 2 vệt chấm bò chậm từ hướng Nam (180°)
// vì chủ quan ngỡ là chim trời, bóng bay hoặc rác bay trong gió.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, Label, Layer, useSpring, useT } from '@kit/motion';
import { FONT, lerp, prog } from '@kit/theme';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { ScanEagle2D, Shahed2D } from '../local/draw2d';
import { PAL2D } from '../local/palette';

// Tọa độ tâm màn hình radar chiến thuật FAAD (bên trái bàn console: bezel x = 142..1038)
const FX = 590;
const FY = 505;
const FR = 320;

// Tọa độ khung kính ngắm camera nhiệt NightHawk (bên phải bàn console: bezel x = 1132..1828)
const NX = 1480;
const IR_CY = 370;

// Dải địa hình sa mạc trống nhìn qua ống kính ảnh nhiệt hồng ngoại đơn sắc NightHawk (khóa cứng hướng Đông-Bắc)
const IR_RIDGE_FAR = skyline('nh-ir-far', 1150, 1820, 368, 46, 330, 620);
const IR_RIDGE_MID = skyline('nh-ir-mid', 1150, 1820, 418, 30, 230, 620);
const IR_FOREGROUND = skyline('nh-ir-near', 1150, 1820, 480, 18, 165, 620);

/** Cung tròn đơn giản cho la bàn góc quay ống kính NightHawk (0° = Bắc/-Y, 90° = Đông/+X, 180° = Nam/+Y). */
function wedgePath(cx: number, cy: number, rIn: number, rOut: number, az0: number, az1: number): string {
  const pt = (r: number, az: number) => {
    const rad = ((az - 90) * Math.PI) / 180;
    return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r] as const;
  };
  const [x0, y0] = pt(rOut, az0);
  const [x1, y1] = pt(rOut, az1);
  const [x2, y2] = pt(rIn, az1);
  const [x3, y3] = pt(rIn, az0);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${rOut} ${rOut} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${rIn} ${rIn} 0 0 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
}

function rimArcPath(cx: number, cy: number, r: number, az0: number, az1: number): string {
  const rad0 = ((az0 - 90) * Math.PI) / 180;
  const rad1 = ((az1 - 90) * Math.PI) / 180;
  return `M${(cx + Math.cos(rad0) * r).toFixed(1)} ${(cy + Math.sin(rad0) * r).toFixed(1)} A${r} ${r} 0 0 1 ${(cx + Math.cos(rad1) * r).toFixed(1)} ${(cy + Math.sin(rad1) * r).toFixed(1)}`;
}

const S15: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== 1. CHUYỂN ĐỘNG MÁY QUAY POV NGƯỜI TRỰC TRƯỚC BÀN CONSOLE ====================
  // - 279.94 -> 285.0s: Cận trực diện màn hình FAAD thấy rõ 2 chấm vàng-đỏ lạ ở rìa Nam (180°)
  // - 285.0 -> 289.1s: Khung con trỏ chú ý khóa chặt vào ScanEagle ở trên, đối lập với 2 chấm bò quá chậm phía dưới
  // - 289.1 -> 293.2s: Hạ nhẹ xuống vùng Nam màn hình FAAD phóng rõ bóng suy đoán cánh chim / bóng bay / rác gió
  // - 293.2 -> 299.9s: Mở sang tâm đôi màn hình (x = 985, zoom = 0.99) thấy trọn vẹn cả FAAD bên trái & NightHawk bên phải!
  const pFocusLock = prog(t, CUE.s15_slow_blips - 0.7, CUE.s15_slow_blips + 0.8);
  const pBirdTilt = prog(t, 289.0, 290.3);
  const pOpenNightHawk = prog(t, 293.2, 295.2);

  const faadCamX = lerp(595, 608, pFocusLock);
  const faadCamY = lerp(518, 492, pFocusLock) + pBirdTilt * 82;
  const faadZoom = lerp(1.16, 1.2, pFocusLock) + pBirdTilt * 0.04;

  const camX = lerp(faadCamX, 985, pOpenNightHawk);
  const camY = lerp(faadCamY, 512, pOpenNightHawk);
  const camZoom = lerp(faadZoom, 0.99, pOpenNightHawk);
  const shake = handheld(t, 1.7, 's15-bdoc');

  // ==================== 2. DIỄN BIẾN TRÊN MÀN HÌNH PHÒNG KHÔNG FAAD ====================
  const sweepDeg = ((t - 279.5) * 85) % 360;
  const sweepRad = ((sweepDeg - 90) * Math.PI) / 180;

  // Tín hiệu ScanEagle xanh sáng ở phía Bắc căn cứ
  const seX = FX - 34 + Math.sin(t * 0.9) * 2.5;
  const seY = FY - 108 + Math.cos(t * 0.8) * 1.8;
  const lockSpring = useSpring(t, 285.0, 12, 150);

  // 2 vệt tín hiệu lạ vàng–đỏ ở rìa dưới (cung hướng Nam 180°) đã hiện ngay từ đầu cảnh 279.94s và bò cực chậm
  const blipAppear = prog(t, 279.9, 280.35);
  const slowCrawl = prog(t, 279.94, 299.9, (x) => x);
  const b1X = FX + 16 - slowCrawl * 6;
  const b1Y = FY + 274 - slowCrawl * 44; // Vệt chính
  const b2X = FX - 26 - slowCrawl * 4;
  const b2Y = FY + 292 - slowCrawl * 40; // Vệt phụ song hành

  // Khung suy đoán chủ quan "chim trời / bóng bay / rác gió" xuất hiện lúc 289.50s rồi mờ xám bị bỏ qua từ 292.6s
  const guessIn = useSpring(t, CUE.s15_bird_guess, 12, 150);
  const guessDismiss = prog(t, 292.5, 293.8);
  const blipMuted = lerp(1, 0.5, guessDismiss);

  // Nhịp cảnh báo đỏ ở cung Nam dưới la bàn NightHawk (ngoài tầm ống kính!) từ 294.0s
  const nhSouthBlink = t >= 294.0 ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin((t - 294.0) * 9.5)) : 0;

  return (
    <AbsoluteFill style={{ background: '#060d17' }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg="#060d17">
        <Layer>
          <Defs2D shadow="rgba(2, 6, 14, 0.72)" />
          <defs>
            <linearGradient id="s15-roomWall" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#08111e" />
              <stop offset="65%" stopColor="#0d1b2e" />
              <stop offset="100%" stopColor="#060c15" />
            </linearGradient>
            <linearGradient id="s15-bezel" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#263c57" />
              <stop offset="50%" stopColor="#19293d" />
              <stop offset="100%" stopColor="#101b29" />
            </linearGradient>
            <linearGradient id="s15-irSky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0b151e" />
              <stop offset="62%" stopColor="#1d3342" />
              <stop offset="100%" stopColor="#3c5c6e" />
            </linearGradient>
            <linearGradient id="s15-irScale" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#0b151e" />
              <stop offset="50%" stopColor="#4c7084" />
              <stop offset="100%" stopColor="#e4f7ff" />
            </linearGradient>
            <clipPath id="s15-faadClip">
              <rect x={175} y={138} width={830} height={736} rx={16} />
            </clipPath>
            <clipPath id="s15-irViewClip">
              <rect x={1162} y={168} width={636} height={406} rx={10} />
            </clipPath>
          </defs>

          {/* ==================== 1. BỐI CẢNH PHÒNG TRỰC TỐI BDOC & MẶT BÀN CONSOLE ==================== */}
          <rect x={-160} y={-120} width={2280} height={1320} fill="url(#s15-roomWall)" />

          {Array.from({ length: 22 }, (_, i) => {
            const rx = -120 + i * 105;
            return (
              <rect
                key={i}
                x={rx}
                y={-80}
                width={42}
                height={980}
                fill="#0a1524"
                opacity={0.48}
              />
            );
          })}

          {/* Mặt bàn console thép xám tối phía dưới hai màn hình */}
          <polygon
            points="-160,918 2120,918 2160,1160 -200,1160"
            fill="#111d2c"
            stroke="#27415f"
            strokeWidth={3}
          />
          <rect x={230} y={946} width={540} height={68} rx={8} fill="#172638" stroke="#2c4869" strokeWidth={2} />
          {Array.from({ length: 14 }, (_, k) => (
            <rect
              key={k}
              x={252 + k * 35}
              y={964}
              width={25}
              height={16}
              rx={3}
              fill="#243a54"
              stroke={PAL2D.ink}
              strokeWidth={1.4}
            />
          ))}
          <circle cx={855} cy={980} r={30} fill="#192a3e" stroke="#315175" strokeWidth={2.5} />
          <circle cx={855} cy={980} r={17} fill="#2e547d" stroke={PAL2D.ink} strokeWidth={2} />

          {/* Cụm cần gạt PTZ điều khiển xoay camera bên phải bàn console — nằm im không một bàn tay chạm vào! */}
          <g transform="translate(1480 976)">
            <rect x={-150} y={-28} width={300} height={58} rx={8} fill="#162436" stroke="#2c4869" strokeWidth={2} />
            <circle cx={0} cy={0} r={21} fill="#0e1824" stroke="#375980" strokeWidth={2} />
            <circle cx={0} cy={-4} r={10} fill="#2a4361" stroke={PAL2D.ink} strokeWidth={1.8} />
            <circle cx={-95} cy={0} r={6} fill="#243a54" />
            <circle cx={95} cy={0} r={6} fill="#3d1c1c" stroke={PAL2D.threatLo} strokeWidth={1.5} />
          </g>

          {/* ==================== 2. KHUNG MÀN HÌNH CHÍNH PHÒNG KHÔNG FAAD (TRÁI: x = 142..1038) ==================== */}
          <g filter="url(#sh)">
            <rect
              x={142}
              y={102}
              width={896}
              height={810}
              rx={24}
              fill="url(#s15-bezel)"
              stroke="#36577d"
              strokeWidth={3.5}
            />
            {(
              [
                [164, 124],
                [1016, 124],
                [164, 890],
                [1016, 890],
              ] as const
            ).map(([bx, by], idx) => (
              <circle key={idx} cx={bx} cy={by} r={7} fill="#0e1724" stroke="#476c96" strokeWidth={2} />
            ))}
            {Array.from({ length: 8 }, (_, b) => (
              <rect
                key={b}
                x={275 + b * 82}
                y={885}
                width={48}
                height={14}
                rx={3}
                fill={b === 2 ? PAL2D.usMid : '#22364d'}
                stroke={PAL2D.ink}
                strokeWidth={1.5}
              />
            ))}
            <circle cx={980} cy={892} r={5.5} fill={PAL2D.ewTeal} />
          </g>

          {/* Lòng màn hình radar FAAD màu xanh đen PAL2D.bgConsole */}
          <g clipPath="url(#s15-faadClip)">
            <rect x={175} y={138} width={830} height={736} fill={PAL2D.bgConsole} />

            {Array.from({ length: 11 }, (_, i) => (
              <line
                key={`fv${i}`}
                x1={175 + i * 83}
                y1={138}
                x2={175 + i * 83}
                y2={874}
                stroke={PAL2D.gridSoft}
                strokeWidth={1}
                opacity={0.42}
              />
            ))}
            {Array.from({ length: 9 }, (_, i) => (
              <line
                key={`fh${i}`}
                x1={175}
                y1={138 + i * 92}
                x2={1005}
                y2={138 + i * 92}
                stroke={PAL2D.gridSoft}
                strokeWidth={1}
                opacity={0.42}
              />
            ))}

            {/* 4 vòng cự ly radar đồng tâm + trục chữ thập */}
            {[80, 160, 240, FR].map((r, idx) => (
              <circle
                key={r}
                cx={FX}
                cy={FY}
                r={r}
                fill="none"
                stroke={idx === 3 ? PAL2D.usMid : PAL2D.grid}
                strokeWidth={idx === 3 ? 2.5 : 1.4}
                strokeDasharray={idx === 1 ? '6 6' : undefined}
                opacity={idx === 3 ? 0.76 : 0.46}
              />
            ))}
            <line x1={FX - FR - 16} y1={FY} x2={FX + FR + 16} y2={FY} stroke={PAL2D.grid} strokeWidth={1.3} opacity={0.5} />
            <line x1={FX} y1={FY - FR - 16} x2={FX} y2={FY + FR + 16} stroke={PAL2D.grid} strokeWidth={1.3} opacity={0.5} />

            {/* Vạch chia độ quanh vành ngoài scope FAAD */}
            {Array.from({ length: 36 }, (_, i) => {
              const az = i * 10;
              const rad = ((az - 90) * Math.PI) / 180;
              const major = az % 30 === 0;
              return (
                <line
                  key={az}
                  x1={FX + Math.cos(rad) * (FR - (major ? 12 : 6))}
                  y1={FY + Math.sin(rad) * (FR - (major ? 12 : 6))}
                  x2={FX + Math.cos(rad) * FR}
                  y2={FY + Math.sin(rad) * FR}
                  stroke={PAL2D.usHi}
                  strokeWidth={major ? 2 : 1.1}
                  opacity={major ? 0.75 : 0.38}
                />
              );
            })}
            <g fontFamily="monospace" fontWeight={700} fontSize={18} fill={PAL2D.muted} opacity={0.88}>
              <text x={FX} y={FY - FR - 11} textAnchor="middle" fill={PAL2D.usHi}>
                000° N
              </text>
              <text x={FX + FR + 24} y={FY + 6} textAnchor="start">
                E
              </text>
              <text x={FX - FR - 24} y={FY + 6} textAnchor="end">
                W
              </text>
              <text x={FX} y={FY + FR + 24} textAnchor="middle" fill={PAL2D.amberHi}>
                180° S
              </text>
            </g>

            {/* Cánh quạt tia quét radar xoay */}
            <path d={wedgePath(FX, FY, 8, FR, sweepDeg - 26, sweepDeg)} fill={PAL2D.ewTeal} opacity={0.09} />
            <line
              x1={FX}
              y1={FY}
              x2={FX + Math.cos(sweepRad) * FR}
              y2={FY + Math.sin(sweepRad) * FR}
              stroke={PAL2D.ewTeal}
              strokeWidth={2}
              opacity={0.58}
            />

            {/* Tâm căn cứ Tháp 22 trên scope FAAD */}
            <g transform={`translate(${FX} ${FY})`}>
              <polygon points="0,-11 10,8 -10,8" fill="none" stroke={PAL2D.usHi} strokeWidth={2.2} />
              <circle r={3} fill={PAL2D.chalk} />
            </g>

            {/* ==================== CHỦ THỂ 1 TRÊN FAAD: TÍN HIỆU XANH SCANEAGLE & CON TRỎ CHÚ Ý KHÓA CHẶT ==================== */}
            <g transform={`translate(${seX} ${seY})`}>
              <path
                d="M-88 -26 L-52 -16 L-22 -6 L0 0"
                fill="none"
                stroke={PAL2D.usMid}
                strokeWidth={2.2}
                strokeDasharray="5 5"
                opacity={0.7}
              />
              <circle r={21} fill={PAL2D.usLo} fillOpacity={0.48} stroke={PAL2D.ewTeal} strokeWidth={2.5} />
              <ScanEagle2D scale={0.3} rot={16} view="top" propAngle={0.4} />

              {/* Khung con trỏ chú ý của kíp trực khóa cứng vào ScanEagle (bật mạnh từ 285.0s) */}
              {lockSpring > 0.01 && (
                <g transform={`scale(${lerp(1.45, 1, Math.min(1, lockSpring))})`} opacity={Math.min(1, lockSpring * 1.4)}>
                  <circle
                    r={38 + 3 * Math.sin(t * 6)}
                    fill="none"
                    stroke={PAL2D.ewTeal}
                    strokeWidth={2}
                    strokeDasharray="8 6"
                  />
                  <path
                    d="M-32 -19 L-32 -32 L-19 -32 M19 -32 L32 -32 L32 -19 M32 19 L32 32 L19 32 M-19 32 L-32 32 L-32 19"
                    fill="none"
                    stroke={PAL2D.usHi}
                    strokeWidth={3.6}
                    strokeLinecap="round"
                  />
                  <g transform="translate(40 -36)">
                    <rect x={0} y={-17} width={82} height={34} rx={6} fill={PAL2D.panelHi} stroke={PAL2D.ewTeal} strokeWidth={2} />
                    <path
                      d="M14 0 C23 -9.5 38 -9.5 47 0 C38 9.5 23 9.5 14 0 Z"
                      fill="none"
                      stroke={PAL2D.ewTeal}
                      strokeWidth={2.3}
                    />
                    <circle cx={30.5} cy={0} r={4.4} fill={PAL2D.usHi} />
                    <rect x={55} y={-6} width={17} height={4.2} rx={1} fill={PAL2D.ewTeal} />
                    <rect x={55} y={2} width={13} height={4.2} rx={1} fill={PAL2D.usHi} />
                  </g>
                  <polygon
                    points="23,21 28,44 34,36 44,45 48,41 38,31 46,26"
                    fill={PAL2D.chalk}
                    stroke={PAL2D.ink}
                    strokeWidth={1.8}
                  />
                </g>
              )}
            </g>

            {/* ==================== CHỦ THỂ 2 TRÊN FAAD: 2 VỆT TÍN HIỆU LẠ BÒ CHẬM TỪ HƯỚNG NAM (180°) ==================== */}
            {blipAppear > 0.01 && (
              <g opacity={blipAppear}>
                {/* Vòng gợn sóng phát hiện ở rìa Nam (280.1 – 285.2s) */}
                {t < 285.3 && (
                  <>
                    <circle
                      cx={b1X}
                      cy={b1Y}
                      r={14 + ((t - 279.9) % 1.35) * 30}
                      fill="none"
                      stroke={PAL2D.amberHi}
                      strokeWidth={2.4}
                      opacity={Math.max(0, 1 - ((t - 279.9) % 1.35) / 1.35) * 0.9}
                    />
                    <circle
                      cx={b2X}
                      cy={b2Y}
                      r={10 + ((t - 279.5) % 1.35) * 24}
                      fill="none"
                      stroke={PAL2D.threatHi}
                      strokeWidth={2}
                      opacity={Math.max(0, 1 - ((t - 279.5) % 1.35) / 1.35) * 0.72}
                    />
                  </>
                )}

                {/* Vệt đuôi chấm lửng cực ngắn thể hiện tốc độ trôi rất chậm */}
                {[0.84, 0.63, 0.42, 0.21].map((lag, idx) => (
                  <g key={idx} opacity={(1 - lag) * 0.72 * blipMuted}>
                    <circle cx={b1X + lag * 4} cy={b1Y + lag * 28} r={3.6} fill={PAL2D.amberMid} />
                    <circle cx={b2X + lag * 3} cy={b2Y + lag * 25} r={3.2} fill={PAL2D.amberMid} />
                  </g>
                ))}

                {/* Chấm tín hiệu lạ #1 (vàng–đỏ sắc nét) */}
                <g transform={`translate(${b1X} ${b1Y})`}>
                  <circle r={15} fill={PAL2D.threatMid} opacity={0.3 * blipMuted} />
                  <polygon
                    points="0,-11 11,0 0,11 -11,0"
                    fill={guessDismiss > 0.5 ? PAL2D.muted : PAL2D.amberMid}
                    stroke={PAL2D.threatHi}
                    strokeWidth={2.4}
                    opacity={blipMuted}
                  />
                  <circle r={4} fill={PAL2D.threatMid} />
                </g>

                {/* Chấm tín hiệu lạ #2 đi kèm sát bên */}
                <g transform={`translate(${b2X} ${b2Y})`}>
                  <circle r={12.5} fill={PAL2D.amberMid} opacity={0.26 * blipMuted} />
                  <polygon
                    points="0,-9.5 9.5,0 0,9.5 -9.5,0"
                    fill={guessDismiss > 0.5 ? PAL2D.muted : PAL2D.amberHi}
                    stroke={PAL2D.threatMid}
                    strokeWidth={2.2}
                    opacity={blipMuted}
                  />
                  <circle r={3.4} fill={PAL2D.threatMid} />
                </g>

                {/* Thước đo vận tốc cực thấp cạnh 2 vệt chấm (chỉ 1/6 vạch sáng — trực quan "trôi quá chậm") */}
                {t >= 285.2 && (
                  <g transform={`translate(${b2X - 102} ${b1Y - 13})`} opacity={prog(t, 285.2, 286.0) * blipMuted}>
                    <rect x={0} y={0} width={78} height={26} rx={5} fill="#0e1e32" stroke={PAL2D.amberLo} strokeWidth={1.8} />
                    {Array.from({ length: 6 }, (_, sIdx) => (
                      <rect
                        key={sIdx}
                        x={7 + sIdx * 11}
                        y={6.5}
                        width={7.5}
                        height={13}
                        rx={1.5}
                        fill={sIdx === 0 ? PAL2D.amberHi : '#1c324d'}
                      />
                    ))}
                  </g>
                )}

                {/* Biểu tượng suy đoán chủ quan lúc 289.50s: Cánh chim trời + Bóng bay + Rác gió (rồi bị gạch mờ lờ đi) */}
                {guessIn > 0.01 && (
                  <g
                    transform={`translate(${b1X + 36} ${b1Y - 22}) scale(${Math.min(1.06, guessIn) * 1.15})`}
                    opacity={Math.min(1, guessIn * 1.4) * lerp(1, 0.3, guessDismiss)}
                  >
                    <line x1={-22} y1={18} x2={4} y2={2} stroke={PAL2D.amberMid} strokeWidth={2.2} strokeDasharray="4 4" />
                    <rect
                      x={4}
                      y={-36}
                      width={182}
                      height={68}
                      rx={12}
                      fill="#12243a"
                      stroke={guessDismiss > 0.4 ? PAL2D.muted : PAL2D.amberHi}
                      strokeWidth={2.4}
                    />
                    {/* Icon 1: Cánh chim trời */}
                    <g transform="translate(39 -2)">
                      <path
                        d={`M-21 ${-4 + Math.sin(t * 7) * 3} Q-10 -17 0 -3 Q10 -17 21 ${-4 + Math.sin(t * 7) * 3}`}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={3.2}
                        strokeLinecap="round"
                      />
                      <path d="M-5 -2 L0 4 L5 -2" fill="none" stroke={PAL2D.amberHi} strokeWidth={2.2} />
                    </g>
                    <line x1={70} y1={-23} x2={70} y2={19} stroke={PAL2D.grid} strokeWidth={1.5} />
                    {/* Icon 2: Bóng bay trôi gió */}
                    <g transform="translate(99 -6)">
                      <ellipse cx={0} cy={-5} rx={11.5} ry={14} fill="none" stroke={PAL2D.chalk} strokeWidth={2.5} />
                      <polygon points="-3,9.5 3,9.5 0,6.5" fill={PAL2D.chalk} />
                      <path d="M0 9.5 Q5 17 -2 23" fill="none" stroke={PAL2D.muted} strokeWidth={1.9} />
                    </g>
                    <line x1={128} y1={-23} x2={128} y2={19} stroke={PAL2D.grid} strokeWidth={1.5} />
                    {/* Icon 3: Rác cuốn trong gió */}
                    <g transform="translate(157 -2)">
                      <path
                        d="M-17 -8 H6 C12 -8 12 -16 6 -16 M-19 2 H12 C18 2 18 10 11 10 M-13 10 H2"
                        fill="none"
                        stroke={PAL2D.muted}
                        strokeWidth={2.3}
                        strokeLinecap="round"
                      />
                    </g>
                    {/* Gạch chéo xám thể hiện sự bỏ qua / đánh giá vô hại từ 292.3s */}
                    {guessDismiss > 0.1 && (
                      <line
                        x1={14}
                        y1={22}
                        x2={176}
                        y2={-26}
                        stroke={PAL2D.muted}
                        strokeWidth={3}
                        opacity={guessDismiss * 0.85}
                      />
                    )}
                  </g>
                )}
              </g>
            )}

            {/* Lớp vạch quét màn hình CRT/LCD rất nhẹ */}
            {Array.from({ length: 36 }, (_, s) => (
              <rect key={s} x={175} y={140 + s * 20.5} width={830} height={1.5} fill="#000" opacity={0.14} />
            ))}
          </g>

          {/* ==================== 3. KHUNG MÀN HÌNH PHỤ CAMERA NHIỆT NIGHTHAWK (BÊN PHẢI: x = 1132..1828) ==================== */}
          <g filter="url(#sh)">
            <rect
              x={1132}
              y={128}
              width={696}
              height={784}
              rx={22}
              fill="url(#s15-bezel)"
              stroke="#36577d"
              strokeWidth={3.2}
            />
            {(
              [
                [1154, 150],
                [1806, 150],
                [1154, 890],
                [1806, 890],
              ] as const
            ).map(([bx, by], idx) => (
              <circle key={idx} cx={bx} cy={by} r={6.5} fill="#0e1724" stroke="#476c96" strokeWidth={2} />
            ))}
          </g>

          {/* Nửa trên màn hình phụ: Feed ảnh nhiệt hồng ngoại đơn sắc FLIR của NightHawk (sa mạc Đông–Bắc trống trơn!) */}
          <g clipPath="url(#s15-irViewClip)">
            <rect x={1162} y={168} width={636} height={406} fill="url(#s15-irSky)" />

            {/* Các lớp đồi cát & đá sỏi hồng ngoại đơn sắc tĩnh lặng */}
            <path d={IR_RIDGE_FAR} fill="#253b4a" />
            <path d={IR_RIDGE_MID} fill="#335063" />
            <path d={IR_FOREGROUND} fill="#4a6e82" />

            {/* Đá bazan tản nhiệt rải rác trên sa mạc trống hướng Đông–Bắc */}
            {(
              [
                [1265, 495, 16, 7],
                [1385, 518, 22, 9],
                [1575, 502, 18, 8],
                [1690, 526, 25, 10],
                [1465, 486, 12, 5],
              ] as const
            ).map(([rx, ry, rw, rh], rIdx) => (
              <ellipse key={rIdx} cx={rx} cy={ry} rx={rw} ry={rh} fill="#668ea3" opacity={0.55} />
            ))}

            {/* Gờ rọ công sự HESCO mờ ở tiền cảnh hướng Đông–Bắc */}
            <g opacity={0.58}>
              {Array.from({ length: 7 }, (_, hIdx) => (
                <rect
                  key={hIdx}
                  x={1185 + hIdx * 42}
                  y={512}
                  width={38}
                  height={46}
                  rx={2}
                  fill="#5f8599"
                  stroke="#1c2f3b"
                  strokeWidth={2}
                />
              ))}
            </g>

            {/* Thang chuẩn độ sáng nhiệt White-Hot FLIR bên mép phải màn hình hồng ngoại */}
            <g transform="translate(1772 232)">
              <rect x={0} y={0} width={11} height={180} rx={2} fill="url(#s15-irScale)" stroke="#8ec2d9" strokeWidth={1.2} />
            </g>

            {/* Thước ngắm chữ thập hồng ngoại FLIR + ký hiệu khóa cứng góc quay 058° NE */}
            <g stroke="#c6ecfc" opacity={0.82}>
              <line x1={NX - 96} y1={IR_CY} x2={NX - 22} y2={IR_CY} strokeWidth={2} />
              <line x1={NX + 22} y1={IR_CY} x2={NX + 96} y2={IR_CY} strokeWidth={2} />
              <line x1={NX} y1={IR_CY - 76} x2={NX} y2={IR_CY - 22} strokeWidth={2} />
              <line x1={NX} y1={IR_CY + 22} x2={NX} y2={IR_CY + 76} strokeWidth={2} />
              <path
                d={`M${NX - 145} 240 L${NX - 145} 216 L${NX - 116} 216 M${NX + 116} 216 L${NX + 145} 216 L${NX + 145} 240 M${NX + 145} 500 L${NX + 145} 524 L${NX + 116} 524 M${NX - 116} 524 L${NX - 145} 524 L${NX - 145} 500`}
                fill="none"
                strokeWidth={2.4}
              />
            </g>

            {/* Thước phương vị ngang đứng im ở 058° NE kèm ổ khóa vàng */}
            <g transform={`translate(${NX} 195)`}>
              <rect x={-108} y={-14} width={216} height={28} rx={5} fill="#09141d" opacity={0.82} stroke="#4e798f" strokeWidth={1.6} />
              <text x={-16} y={6} textAnchor="middle" fill="#d8f3ff" fontSize={18} fontFamily="monospace" fontWeight={700}>
                058° NE
              </text>
              <g transform="translate(56 0)">
                <rect x={-9} y={-2} width={18} height={13} rx={2.5} fill={PAL2D.amberMid} />
                <path d="M-5 -2 V-7 A5 5 0 0 1 5 -7 V-2" fill="none" stroke={PAL2D.amberHi} strokeWidth={2.4} />
              </g>
            </g>

            {Array.from({ length: 20 }, (_, s) => (
              <rect key={s} x={1162} y={172 + s * 20.5} width={636} height={1.4} fill="#061017" opacity={0.18} />
            ))}
          </g>
          <rect x={1162} y={168} width={636} height={406} rx={10} fill="none" stroke="#3c627a" strokeWidth={2.4} />

          {/* Nửa dưới màn hình phụ: LA BÀN GÓC QUAY ỐNG KÍNH NIGHTHAWK (chĩa cứng 058° Đông–Bắc, bỏ mặc hướng Nam 180° báo đỏ!) */}
          <g transform={`translate(${NX} 736)`}>
            <rect
              x={-318}
              y={-140}
              width={636}
              height={276}
              rx={12}
              fill={PAL2D.bgConsole}
              stroke="#2a486b"
              strokeWidth={2.2}
            />

            {/* Hình chiếu cạnh thu nhỏ trụ tháp NightHawk bên trái ô la bàn (đầu kính chĩa cố định không xoay) */}
            <g transform="translate(-205 72)">
              <rect x={-38} y={0} width={76} height={10} rx={2} fill={PAL2D.concreteMid} />
              <polygon points="-16,0 -11,-118 11,-118 16,0" fill="none" stroke={PAL2D.concreteMid} strokeWidth={2.4} />
              {[-96, -72, -48, -24].map((ry) => (
                <line key={ry} x1={-13} y1={ry} x2={13} y2={ry + 18} stroke={PAL2D.concreteLo} strokeWidth={1.8} />
              ))}
              <rect x={-22} y={-125} width={44} height={7} rx={2} fill={PAL2D.concreteHi} />
              <rect x={-16} y={-151} width={34} height={24} rx={5} fill="#4e5f73" stroke={PAL2D.chalk} strokeWidth={2} />
              <circle cx={20} cy={-139} r={7} fill="#0b2840" stroke={PAL2D.ewTeal} strokeWidth={2} />
              <polygon points="27,-141 82,-162 82,-116" fill={PAL2D.ewTeal} opacity={0.24} />
            </g>

            {/* Vòng la bàn góc mở ống kính NightHawk */}
            <g transform="translate(56 0)">
              <circle r={106} fill="#0c1b2e" stroke={PAL2D.grid} strokeWidth={2.2} />
              <circle r={70} fill="none" stroke={PAL2D.gridSoft} strokeWidth={1.3} strokeDasharray="5 5" />
              <line x1={-114} y1={0} x2={114} y2={0} stroke={PAL2D.gridSoft} strokeWidth={1.2} />
              <line x1={0} y1={-114} x2={0} y2={114} stroke={PAL2D.gridSoft} strokeWidth={1.2} />

              <g fontFamily={FONT} fontWeight={700} fontSize={16}>
                <text x={0} y={-114} textAnchor="middle" fill={PAL2D.usHi}>
                  N
                </text>
                <text x={120} y={6} textAnchor="start" fill={PAL2D.usHi}>
                  E
                </text>
                <text x={-120} y={6} textAnchor="end" fill={PAL2D.muted}>
                  W
                </text>
                <text x={0} y={128} textAnchor="middle" fill={PAL2D.threatHi}>
                  S
                </text>
              </g>

              {/* Nón góc nhìn ống kính nhiệt NightHawk (FOV 36°..80°) KHÓA CỨNG VỀ HƯỚNG ĐÔNG–BẮC */}
              <path
                d={wedgePath(0, 0, 12, 104, 36, 80)}
                fill={PAL2D.ewTeal}
                fillOpacity={0.3}
                stroke={PAL2D.ewTeal}
                strokeWidth={2.8}
              />
              <line
                x1={0}
                y1={0}
                x2={Math.cos(((58 - 90) * Math.PI) / 180) * 104}
                y2={Math.sin(((58 - 90) * Math.PI) / 180) * 104}
                stroke="#d8f6ff"
                strokeWidth={2.2}
                strokeDasharray="6 4"
              />

              {/* Vùng mù tối đen phía Nam (146°..214°) NHẤP NHÁY CẢNH BÁO ĐỎ NGAY NGOÀI TẦM ỐNG KÍNH! */}
              <path
                d={wedgePath(0, 0, 18, 104, 148, 212)}
                fill={PAL2D.threatMid}
                fillOpacity={0.1 + 0.3 * nhSouthBlink}
              />
              <path
                d={rimArcPath(0, 0, 106, 146, 214)}
                fill="none"
                stroke={PAL2D.threatHi}
                strokeWidth={6}
                strokeLinecap="round"
                opacity={0.38 + 0.62 * nhSouthBlink}
              />
              {t >= 294.0 && (
                <g
                  transform={`translate(0 ${92 - prog(t, 294.0, 299.8) * 24})`}
                  opacity={0.48 + 0.52 * nhSouthBlink}
                >
                  <Shahed2D rot={-90} scale={0.32} view="top" propAngle={t * 32} tint="threat" />
                </g>
              )}

              <circle r={12} fill={PAL2D.panelHi} stroke={PAL2D.chalk} strokeWidth={2.2} />
              <circle r={4.5} fill={PAL2D.ewTeal} />
            </g>
          </g>
        </Layer>
      </Cam2D>

      {/* Lớp hạt phủ đồng bộ toàn dự án */}
      <Grain opacity={0.42} />

      {/* Tối đa 1 nhãn <Label> tại mọi thời điểm, đặt thoáng sạch không chạm các chi tiết màn hình */}
      <Label
        t={t}
        text="FAAD"
        x={270}
        y={108}
        from={CUE.s15_faad}
        until={284.6}
        size={48}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="NIGHTHAWK"
        x={1485}
        y={96}
        from={CUE.s15_nighthawk}
        until={298.8}
        size={48}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S15;
