import React, { useMemo } from 'react';
import { FONT, prog, lerp, bump, rnd } from '@kit/theme';
import { useT, handheld, Layer, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { F15Side2D, F22Side2D, F35Side2D } from '../local/jets2d';

// Hằng số vật lý góc nón sóng xung kích siêu âm: sin(mu) = 1 / M
const machTan = (m: number) => Math.tan(Math.asin(1 / m));
const machDeg = (m: number) => ((Math.asin(1 / m) * 180) / Math.PI).toFixed(1);

// Các vệt gió lướt nhanh trên tầng bình lưu 45.000 ft (tất định theo seed)
const WIND_STREAKS = Array.from({ length: 34 }, (_, i) => ({
  y: 70 + rnd(i * 7 + 1) * 870,
  phase: rnd(i * 11 + 3) * 2600,
  len: 90 + rnd(i * 13 + 5) * 210,
  speed: 620 + rnd(i * 17 + 9) * 580,
  alpha: 0.08 + rnd(i * 19 + 2) * 0.16,
}));

type MachConeProps = {
  id: string;
  tipX: number;
  tipY: number;
  mach: number;
  len: number;
  color: string;
  coreColor: string;
  dir?: 1 | -1; // 1 = bay sang phải (+X), -1 = tên lửa địch bay ngược sang trái (-X)
  intensity?: number;
};

/**
 * Nón sóng xung kích chuẩn vật lý arcsin(1/M), vẽ bằng nét kép (halo mờ bản rộng + lõi sáng)
 * kết hợp gradient tắt dần về phía sau — TUYỆT ĐỐI KHÔNG gắn filter="url(#glow)" lên đường chéo.
 */
const MachCone: React.FC<MachConeProps> = ({
  id,
  tipX,
  tipY,
  mach,
  len,
  color,
  coreColor,
  dir = 1,
  intensity = 1,
}) => {
  const slope = machTan(mach);
  const backX = tipX - dir * len;
  const dy = len * slope;

  // Sóng giãn nở thứ cấp Prandtl-Meyer ở vòm kính / gốc cánh
  const secTipX = tipX - dir * (len * 0.34);
  const secLen = len * 0.62;
  const secBackX = secTipX - dir * secLen;
  const secDy = secLen * slope;

  const arcR = 64;
  const muRad = Math.asin(1 / mach);
  const ax = tipX - dir * Math.cos(muRad) * arcR;
  const ayTop = tipY - Math.sin(muRad) * arcR;

  return (
    <g opacity={intensity}>
      <defs>
        <linearGradient
          id={`${id}_fill`}
          x1={dir === 1 ? '100%' : '0%'}
          y1="0%"
          x2={dir === 1 ? '0%' : '100%'}
          y2="0%"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.22} />
          <stop offset="45%" stopColor={color} stopOpacity={0.07} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <linearGradient
          id={`${id}_line`}
          x1={tipX}
          y1={tipY}
          x2={backX}
          y2={tipY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={coreColor} stopOpacity={0.98} />
          <stop offset="65%" stopColor={color} stopOpacity={0.55} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
        <linearGradient
          id={`${id}_halo`}
          x1={tipX}
          y1={tipY}
          x2={backX}
          y2={tipY}
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={color} stopOpacity={0.34} />
          <stop offset="60%" stopColor={color} stopOpacity={0.14} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Vùng nén khí hình nón mờ bên trong */}
      <polygon
        points={`${tipX},${tipY} ${backX},${tipY - dy} ${backX},${tipY + dy}`}
        fill={`url(#${id}_fill)`}
      />

      {/* Sóng xung kích thứ cấp mờ ở giữa thân */}
      <path
        d={`M${secBackX},${tipY - secDy} L${secTipX},${tipY} L${secBackX},${tipY + secDy}`}
        fill="none"
        stroke={`url(#${id}_halo)`}
        strokeWidth={3.2}
        strokeDasharray="10 7"
      />

      {/* Nét kép sóng xung kích mũi: lớp 1 halo rộng, lớp 2 halo vừa, lớp 3 lõi sắc lẹm */}
      <path
        d={`M${backX},${tipY - dy} L${tipX},${tipY} L${backX},${tipY + dy}`}
        fill="none"
        stroke={`url(#${id}_halo)`}
        strokeWidth={14}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={`M${backX},${tipY - dy} L${tipX},${tipY} L${backX},${tipY + dy}`}
        fill="none"
        stroke={`url(#${id}_halo)`}
        strokeWidth={6.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <path
        d={`M${backX},${tipY - dy} L${tipX},${tipY} L${backX},${tipY + dy}`}
        fill="none"
        stroke={`url(#${id}_line)`}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Cung đo góc nón Mach vật lý ngay sau mũi — nhãn đặt trên tia nón phía trên để không đè vòm kính */}
      <path
        d={`M${tipX - dir * arcR},${tipY} A${arcR},${arcR} 0 0 ${dir === 1 ? 1 : 0} ${ax},${ayTop}`}
        fill="none"
        stroke={coreColor}
        strokeWidth={1.6}
        strokeDasharray="3 3"
        opacity={0.78}
      />
      <text
        x={tipX - dir * 138}
        y={tipY - 138 * slope - 12}
        textAnchor="middle"
        fill={coreColor}
        fontFamily={FONT}
        fontWeight={700}
        fontSize={14}
        opacity={0.94}
      >
        {`μ = ${machDeg(mach)}°`}
      </text>

      {/* Điểm chớp nén khí cực đại ngay đỉnh chóp mũi */}
      <circle cx={tipX} cy={tipY} r={10} fill={color} opacity={0.32} />
      <circle cx={tipX} cy={tipY} r={3.8} fill="#ffffff" />
    </g>
  );
};

const S16: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const dt = Math.max(0, t - 440.1);

  // Dải núi mờ tít phía dưới chân trời 45.000 ft (3 lớp chiều sâu)
  const skyFar = useMemo(() => skyline('s16_far', -300, 2500, 995, 58, 520, 1220), []);
  const skyMid = useMemo(() => skyline('s16_mid', -300, 2500, 1022, 46, 380, 1220), []);
  const skyNear = useMemo(() => skyline('s16_near', -300, 2500, 1046, 34, 260, 1220), []);

  // Nhịp bứt tốc F-15EX lên Mach 2.5 tại 443.76s bỏ xa F-22 (Mach 2.25) và F-35A (Mach 1.6)
  const f15Surge = prog(t, 442.4, 446.2);
  const f15Burst = bump(t, CUE.s16_mach25, 1.1);
  const f35Spot = prog(t, CUE.s16_f35Mach16 - 0.3, CUE.s16_f35Mach16 + 0.5);
  const f22Spot = prog(t, CUE.s16_f22Mach225 - 0.3, CUE.s16_f22Mach225 + 0.5);

  // Tên lửa phòng không đối phương Mach 4 lao ngược từ mép phải từ 455.8s
  const samEnter = prog(t, 455.7, 458.35);
  const showSam = t >= 455.65;

  // Camera bám tốc độ cao và mở sang phải đón đầu tên lửa Mach 4 cuối cảnh
  const camPanRight = prog(t, 455.4, 457.5);
  const camX = lerp(960, 1075, camPanRight);
  const camY = 540;
  const camZoom = lerp(1.0, 0.97, camPanRight);
  const hk = handheld(t, 2.4 + f15Burst * 3.0, 's16_mach');

  // Tọa độ 3 tiêm kích (scale = 0.90) trên 3 làn bay tầng bình lưu 45,000 ft (cách hẳn thẻ thông số bên trái)
  const JET_S = 0.9;
  const f15X = lerp(785, 1215, f15Surge) + dt * 4.2 - camPanRight * 65;
  const f15Y = 272;
  const f15NoseX = f15X + 233 * JET_S; // +209.7 px

  const f22X = 795 + dt * 6.0 - f15Surge * 30;
  const f22Y = 552;
  const f22NoseX = f22X + 227 * JET_S; // +204.3 px

  const f35X = 645 + dt * 2.4 - f15Surge * 45;
  const f35Y = 824;
  const f35NoseX = f35X + 188 * JET_S; // +169.2 px

  // Tọa độ tên lửa phòng không đối phương Mach 4 lao sang trái (-X)
  const samNoseX = lerp(2200, 1615, samEnter);
  const samY = 305;

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, background: '#061126', overflow: 'hidden' }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={hk} bg="#061126">
        <Layer style={{ width: 2500, height: 1200 }}>
          <Defs2D shadow="rgba(4, 10, 22, 0.5)" />
          <defs>
            <linearGradient id="s16_stratSky" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#050e22" />
              <stop offset="32%" stopColor="#0d2652" />
              <stop offset="68%" stopColor="#1f5796" />
              <stop offset="90%" stopColor="#5897cc" />
              <stop offset="100%" stopColor="#8ec2e6" />
            </linearGradient>
          </defs>

          {/* Bầu trời tầng bình lưu 45.000 ft chuyển sắc chàm sâu xuống lam sáng */}
          <rect x={-320} y={-120} width={2750} height={1320} fill="url(#s16_stratSky)" />

          {/* Các vệt hạt khí quyển lướt ngược cực nhanh tạo cảm giác vượt tường âm thanh */}
          {WIND_STREAKS.map((ws, idx) => {
            const sx = 2250 - (((t * ws.speed + ws.phase) % 2550) + 2550) % 2550;
            return (
              <line
                key={idx}
                x1={sx}
                y1={ws.y}
                x2={sx + ws.len}
                y2={ws.y}
                stroke="#cce8ff"
                strokeWidth={1.4}
                opacity={ws.alpha}
              />
            );
          })}

          {/* Thước cao độ tầng bình lưu 45,000 FT & vạch phân 3 làn đua */}
          <g opacity={0.45}>
            <line x1={-150} y1={142} x2={2320} y2={142} stroke={P.cyanSoft} strokeWidth={1.2} strokeDasharray="12 8" />
            <line x1={-150} y1={414} x2={2320} y2={414} stroke={P.gridBright} strokeWidth={1.2} strokeDasharray="8 10" />
            <line x1={-150} y1={690} x2={2320} y2={690} stroke={P.gridBright} strokeWidth={1.2} strokeDasharray="8 10" />
          </g>
          <text
            x={95}
            y={130}
            fill={P.cyanSoft}
            fontFamily={FONT}
            fontWeight={700}
            fontSize={16}
            letterSpacing={2.2}
            opacity={0.82}
          >
            ALTITUDE: 45,000+ FT STRATOSPHERE · SUPERSONIC MACH CONE PROFILE
          </text>

          {/* 3 lớp dải núi skyline mờ thấp sát đáy chứng tỏ độ cao 45.000 ft */}
          <path d={skyFar} fill="#4d82b5" opacity={0.48} />
          <path d={skyMid} fill="#2f5d8f" opacity={0.62} />
          <path d={skyNear} fill="#18385e" opacity={0.82} />

          {/* ===================================================================== */}
          {/* LÀN DƯỚI (LANE 3): F-35A LIGHTNING II — MACH 1.6                      */}
          {/* ===================================================================== */}
          <g>
            {/* Vệt khói trắng động cơ đơn F135 */}
            <line
              x1={-220}
              y1={f35Y + 2}
              x2={f35X - 175}
              y2={f35Y + 2}
              stroke="#d9ecff"
              strokeWidth={9}
              opacity={0.22}
            />
            <MachCone
              id="s16_m16"
              tipX={f35NoseX}
              tipY={f35Y + 3}
              mach={1.6}
              len={195}
              color={P.cyan}
              coreColor={P.cyanSoft}
              intensity={0.78 + 0.22 * f35Spot}
            />
            <g filter="url(#sh)">
              <F35Side2D x={f35X} y={f35Y} scale={JET_S} afterburner={0.7} />
            </g>

            {/* Thẻ thông số làn F-35A */}
            <g transform={`translate(95 ${f35Y - 26})`}>
              <rect
                x={0}
                y={0}
                width={255}
                height={54}
                rx={9}
                fill="rgba(12, 28, 52, 0.88)"
                stroke={f35Spot > 0.2 ? P.cyan : P.gridBright}
                strokeWidth={f35Spot > 0.2 ? 2.4 : 1.5}
              />
              <text x={18} y={23} fill={P.muted} fontFamily={FONT} fontWeight={700} fontSize={14} letterSpacing={1.2}>
                F-35A LIGHTNING II
              </text>
              <text x={18} y={44} fill={P.cyanSoft} fontFamily={FONT} fontWeight={700} fontSize={20}>
                MACH 1.6
              </text>
            </g>
          </g>

          {/* ===================================================================== */}
          {/* LÀN GIỮA (LANE 2): F-22A RAPTOR — MACH 2.25                           */}
          {/* ===================================================================== */}
          <g>
            <line
              x1={-220}
              y1={f22Y + 2}
              x2={f22X - 210}
              y2={f22Y + 2}
              stroke="#e3f1ff"
              strokeWidth={11}
              opacity={0.26}
            />
            <MachCone
              id="s16_m225"
              tipX={f22NoseX}
              tipY={f22Y + 3}
              mach={2.25}
              len={295}
              color="#7cc4ff"
              coreColor="#c4e6ff"
              intensity={0.82 + 0.18 * f22Spot}
            />
            <g filter="url(#sh)">
              <F22Side2D x={f22X} y={f22Y} scale={JET_S} afterburner={0.85} />
            </g>

            {/* Thẻ thông số làn F-22A */}
            <g transform={`translate(95 ${f22Y - 26})`}>
              <rect
                x={0}
                y={0}
                width={255}
                height={54}
                rx={9}
                fill="rgba(12, 28, 52, 0.88)"
                stroke={f22Spot > 0.2 ? '#9cd5ff' : P.gridBright}
                strokeWidth={f22Spot > 0.2 ? 2.4 : 1.5}
              />
              <text x={18} y={23} fill={P.muted} fontFamily={FONT} fontWeight={700} fontSize={14} letterSpacing={1.2}>
                F-22A RAPTOR
              </text>
              <text x={18} y={44} fill="#c4e6ff" fontFamily={FONT} fontWeight={700} fontSize={20}>
                MACH 2.25
              </text>
            </g>
          </g>

          {/* ===================================================================== */}
          {/* LÀN TRÊN (LANE 1): F-15EX EAGLE II BỨT TỐC DẪN ĐẦU — MACH 2.5         */}
          {/* ===================================================================== */}
          <g>
            {/* Vệt luồng phản lực đôi rực lửa kéo dài phía sau F-15EX */}
            <line
              x1={-220}
              y1={f15Y + 3}
              x2={f15X - 230}
              y2={f15Y + 3}
              stroke={P.amberHot}
              strokeWidth={14}
              opacity={0.22 + 0.14 * f15Surge}
            />
            <line
              x1={-220}
              y1={f15Y + 3}
              x2={f15X - 230}
              y2={f15Y + 3}
              stroke="#ffffff"
              strokeWidth={4}
              opacity={0.35}
            />

            <MachCone
              id="s16_m25"
              tipX={f15NoseX}
              tipY={f15Y + 4}
              mach={2.5}
              len={360}
              color={P.amber}
              coreColor={P.amberHot}
              intensity={0.88 + 0.12 * f15Surge}
            />

            <g filter="url(#sh)">
              <F15Side2D x={f15X} y={f15Y} scale={JET_S} afterburner={1} />
            </g>

            {/* Thẻ thông số làn dẫn đầu F-15EX */}
            <g transform={`translate(95 ${f15Y - 30})`}>
              <rect
                x={0}
                y={0}
                width={315}
                height={60}
                rx={10}
                fill="rgba(16, 32, 56, 0.94)"
                stroke={P.amber}
                strokeWidth={2.6}
              />
              <text x={18} y={24} fill={P.amberHot} fontFamily={FONT} fontWeight={700} fontSize={14} letterSpacing={1.3}>
                F-15EX EAGLE II · LEADER
              </text>
              <text x={18} y={48} fill="#ffffff" fontFamily={FONT} fontWeight={700} fontSize={21}>
                MACH 2.5 · 1,650+ MPH
              </text>
            </g>
          </g>

          {/* ===================================================================== */}
          {/* MỐI ĐE DỌA CUỐI CẢNH (455.65s+): TÊN LỬA PHÒNG KHÔNG ĐỐI PHƯƠNG MACH 4 */}
          {/* ===================================================================== */}
          {showSam && (
            <g opacity={Math.min(1, samEnter * 1.5)}>
              {/* Đường vector đối đầu trực diện giữa mũi F-15EX (Mach 2.5) và tên lửa địch (Mach 4) */}
              <line
                x1={f15NoseX + 18}
                y1={f15Y + 4}
                x2={samNoseX - 18}
                y2={samY}
                stroke={P.red}
                strokeWidth={2.4}
                strokeDasharray="10 7"
              />

              {/* Nón sóng xung kích cực nhọn Mach 4 (mu = 14.5°) màu đỏ rực */}
              <MachCone
                id="s16_m40"
                tipX={samNoseX}
                tipY={samY}
                mach={4.0}
                len={410}
                color={P.red}
                coreColor="#ff9aa4"
                dir={-1}
                intensity={1}
              />

              {/* Thân tên lửa đánh chặn phòng không đối phương cỡ lớn lao sang trái */}
              <g transform={`translate(${samNoseX} ${samY})`}>
                {/* Luồng lửa động cơ tên lửa rắn phía đuôi (+X) */}
                <polygon points="145,0 245,-14 310,0 245,14" fill={P.red} opacity={0.48} />
                <polygon points="145,0 205,-7 250,0 205,7" fill={P.amberHot} />

                {/* Cánh lái đuôi & cánh giữa */}
                <polygon points="124,-7 142,-7 144,-22 132,-22" fill="#5e1922" stroke={P.ink} strokeWidth={1.4} />
                <polygon points="124,7 142,7 144,22 132,22" fill="#5e1922" stroke={P.ink} strokeWidth={1.4} />
                <polygon points="68,-7 86,-7 82,-17 72,-17" fill="#7d222e" stroke={P.ink} strokeWidth={1.3} />
                <polygon points="68,7 86,7 82,17 72,17" fill="#7d222e" stroke={P.ink} strokeWidth={1.3} />

                {/* Thân đạn & đầu dò đỏ sẫm */}
                <path
                  d="M0,0 L34,-7 L145,-7 L145,7 L34,7 Z"
                  fill="#d8dee8"
                  stroke={P.ink}
                  strokeWidth={1.8}
                />
                <path d="M0,0 L34,-7 L34,7 Z" fill={P.red} stroke={P.ink} strokeWidth={1.6} />
                <rect x={48} y={-6.8} width={10} height={13.6} fill={P.red} />
              </g>

              {/* Nhãn cảnh báo đỏ bám trên tên lửa đối phương (cao thoáng trên nón Mach 4) */}
              <g transform={`translate(${samNoseX + 125} ${samY - 106})`}>
                <rect
                  x={-115}
                  y={-24}
                  width={230}
                  height={46}
                  rx={8}
                  fill="rgba(78, 12, 24, 0.94)"
                  stroke={P.red}
                  strokeWidth={2.4}
                />
                <text
                  x={0}
                  y={5}
                  textAnchor="middle"
                  fill="#ffffff"
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={18}
                  letterSpacing={1.4}
                >
                  HOSTILE SAM · MACH 4
                </text>
              </g>
            </g>
          )}
        </Layer>
      </Cam2D>

      <Grain opacity={0.38} />

      {/* TỐI ĐA 1 <Label> TRÊN MÀN HÌNH */}
      <Label
        t={t}
        text="MACH 2.5"
        x={960}
        y={96}
        from={CUE.s16_mach25}
        until={448.0}
        size={56}
        bg={P.amber}
        fg={P.ink}
      />
    </div>
  );
};

export default S16;
