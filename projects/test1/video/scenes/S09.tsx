import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, lerp, prog } from '@kit/theme';
import { Label, Layer, handheld, useSpring, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { arcAngle, arcAt, arcPath, drawOn } from '@lib/2d/path';
import { Blast2D, Muzzle2D } from '@lib/2d/fx';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { MQ9Side2D, Munition2D } from '../local/uav2d';

// Hệ quy chiếu Đồ thị Mặt cắt Quỹ đạo Tầm bắn Chiến thuật (Side-Elevation Range Envelope: 0 -> 35+ km)
const X0 = 335; // Điểm phóng gốc 0 km ngay dưới MQ-9 (đảm bảo đuôi cánh quạt luôn nằm trọn trong khung)
const PX_PER_KM = 53; // 1 km = 53 px -> 28 km = 1819 px, 30 km = 1925 px
const Y_GROUND = 852;
const Y_AXIS = 894;
const kmX = (km: number) => X0 + km * PX_PER_KM;

const X_GRIFFIN = kmX(6.5); // ~6.5 km mục tiêu cự ly gần liều nổ nhẹ
const X_GBU38 = kmX(28); // Đúng cột mốc 28 km

/** Biểu tượng Vệ tinh định vị GPS ở quỹ đạo cao phát sóng dẫn đường vàng hổ phách */
const GPSSatellite2D: React.FC<{
  x: number;
  y: number;
  reveal: number;
  waveActive: number;
  pulseT: number;
  targetX: number;
  targetY: number;
}> = ({ x, y, reveal, waveActive, pulseT, targetX, targetY }) => {
  if (reveal <= 0.01) return null;
  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.hypot(dx, dy);
  const ang = (Math.atan2(dy, dx) * 180) / Math.PI;

  return (
    <g opacity={reveal}>
      {/* Cung quỹ đạo vệ tinh nét đứt phía trên */}
      <path
        d={`M ${x - 190} ${y - 24} Q ${x} ${y - 50} ${x + 190} ${y - 16}`}
        fill="none"
        stroke={P.gridMajor}
        strokeWidth={1.6}
        strokeDasharray="7 7"
        opacity={0.75}
      />

      {/* Chùm tia khoá tín hiệu & các vòng sóng định vị GPS vàng hổ phách nối thẳng xuống cánh đuôi GBU-38 */}
      {waveActive > 0.02 && (
        <g>
          <line
            x1={x}
            y1={y + 18}
            x2={targetX}
            y2={targetY}
            stroke={P.gold}
            strokeWidth={6}
            strokeDasharray="9 7"
            opacity={0.22 * waveActive}
          />
          <line
            x1={x}
            y1={y + 18}
            x2={targetX}
            y2={targetY}
            stroke={P.gold}
            strokeWidth={2.6}
            strokeDasharray="9 7"
            opacity={0.9 * waveActive}
          />
          {[0, 1, 2, 3].map((k) => {
            const phase = ((pulseT * 1.2 + k * 0.25) % 1 + 1) % 1;
            const r = 32 + phase * Math.min(360, dist * 0.92);
            const fade = Math.pow(1 - phase, 0.75) * waveActive;
            return (
              <g key={k} transform={`translate(${x} ${y}) rotate(${ang})`} opacity={fade}>
                <path
                  d={`M ${r * 0.94} ${-r * 0.34} A ${r} ${r} 0 0 1 ${r * 0.94} ${r * 0.34}`}
                  fill="none"
                  stroke={P.gold}
                  strokeWidth={7.5}
                  strokeLinecap="round"
                  opacity={0.26}
                />
                <path
                  d={`M ${r * 0.94} ${-r * 0.34} A ${r} ${r} 0 0 1 ${r * 0.94} ${r * 0.34}`}
                  fill="none"
                  stroke={P.gold}
                  strokeWidth={3.4}
                  strokeLinecap="round"
                />
              </g>
            );
          })}
          {/* Vòng khoá tín hiệu GPS tại bộ ốp đuôi JDAM */}
          <circle
            cx={targetX}
            cy={targetY}
            r={13 + 4 * Math.sin(pulseT * 8)}
            fill="none"
            stroke={P.gold}
            strokeWidth={2.6}
            opacity={0.92 * waveActive}
          />
        </g>
      )}

      {/* Thân vệ tinh & 2 cánh pin mặt trời */}
      <g transform={`translate(${x} ${y}) rotate(-14)`} filter="url(#sh)">
        {[-1, 1].map((s) => (
          <g key={s} transform={`translate(${s * 54} 0)`}>
            <line x1={-s * 34} y1={0} x2={-s * 18} y2={0} stroke={P.uavLight} strokeWidth={3} />
            <rect
              x={-34}
              y={-13}
              width={68}
              height={26}
              rx={3}
              fill="#1d4d7a"
              stroke={P.ink}
              strokeWidth={2.2}
            />
            <line x1={-11} y1={-13} x2={-11} y2={13} stroke={P.gridMajor} strokeWidth={1.3} />
            <line x1={11} y1={-13} x2={11} y2={13} stroke={P.gridMajor} strokeWidth={1.3} />
            <line x1={-34} y1={0} x2={34} y2={0} stroke={P.gridMajor} strokeWidth={1.3} />
          </g>
        ))}

        <rect x={-18} y={-16} width={36} height={32} rx={5} fill={P.gold} stroke={P.ink} strokeWidth={2.4} />
        <rect x={-13} y={-11} width={26} height={9} rx={2} fill="#ffe094" opacity={0.8} />
        <path d="M -13,16 Q 0,27 13,16" fill={P.uavLight} stroke={P.ink} strokeWidth={2} />
        <line x1={0} y1={18} x2={0} y2={28} stroke={P.gold} strokeWidth={2.4} />
        <circle cx={0} cy={29} r={4} fill={P.gold} stroke={P.ink} strokeWidth={1.4} />
      </g>
    </g>
  );
};

/** Thẻ hồ sơ khí tài phóng lớn thuần đồ hoạ kỹ thuật (không chứa chữ thừa) */
const WeaponDossierCard: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  kind: 'griffin' | 'gbu38' | 'gbu39';
  munitionScale: number;
  accent: string;
  reveal: number;
  active: number;
  tier: 1 | 2 | 3;
}> = ({ cx, cy, w, h, kind, munitionScale, accent, reveal, active, tier }) => {
  if (reveal <= 0.01) return null;
  const x0 = cx - w / 2;
  const y0 = cy - h / 2;
  const cardScale = 0.86 + 0.14 * reveal + 0.03 * active;
  const borderCol = active > 0.25 ? accent : P.gridMajor;

  return (
    <g
      transform={`translate(${cx} ${cy}) scale(${cardScale}) translate(${-cx} ${-cy})`}
      opacity={Math.min(1, reveal * 1.15) * (0.76 + 0.24 * active)}
    >
      {/* Khung nền hồ sơ kỹ thuật */}
      <rect
        x={x0}
        y={y0}
        width={w}
        height={h}
        rx={12}
        fill={P.boardCard}
        fillOpacity={0.94}
        stroke={borderCol}
        strokeWidth={active > 0.25 ? 3.4 : 2}
        filter="url(#sh)"
      />
      {active > 0.25 && (
        <rect
          x={x0 - 2}
          y={y0 - 2}
          width={w + 4}
          height={h + 4}
          rx={14}
          fill="none"
          stroke={accent}
          strokeWidth={2.2}
          opacity={0.5 * active}
          filter="url(#glow)"
        />
      )}

      {/* Lưới tâm ngắm blueprint bên trong thẻ */}
      <line x1={x0 + 18} y1={cy + 8} x2={x0 + w - 18} y2={cy + 8} stroke={P.gridMinor} strokeWidth={1.3} strokeDasharray="5 5" />
      <line x1={cx} y1={y0 + 28} x2={cx} y2={y0 + h - 14} stroke={P.gridMinor} strokeWidth={1.3} strokeDasharray="5 5" />

      {/* Vạch bậc cự ly đồ hoạ góc trên trái (1 vạch = tầm gần, 2 vạch = tầm trung GPS, 3 vạch = tầm siêu xa) */}
      {[1, 2, 3].map((step) => (
        <rect
          key={step}
          x={x0 + 16 + (step - 1) * 22}
          y={y0 + 13}
          width={17}
          height={6}
          rx={3}
          fill={step <= tier ? accent : P.gridMinor}
          opacity={step <= tier ? 0.95 : 0.45}
        />
      ))}

      {/* Ký hiệu nhận diện công nghệ góc trên phải (tâm ngắm bán chủ động / sóng GPS / cánh thoi Diamondback) */}
      <g transform={`translate(${x0 + w - 28} ${y0 + 16})`}>
        {tier === 1 && (
          <>
            <circle cx={0} cy={0} r={6.5} fill="none" stroke={accent} strokeWidth={1.8} />
            <circle cx={0} cy={0} r={2} fill={accent} />
          </>
        )}
        {tier === 2 && (
          <>
            <circle cx={-4} cy={3} r={2.2} fill={accent} />
            <path d="M -4,-3 A 6,6 0 0 1 2,3" fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
            <path d="M -4,-7 A 10,10 0 0 1 6,3" fill="none" stroke={accent} strokeWidth={1.8} strokeLinecap="round" />
          </>
        )}
        {tier === 3 && (
          <polygon points="0,-7 11,0 0,7 -11,0" fill="none" stroke={accent} strokeWidth={2} />
        )}
      </g>

      {/* Ngoặc gióng kích thước kỹ thuật hai đầu quả đạn */}
      <path
        d={`M ${x0 + 26} ${cy - 22} L ${x0 + 18} ${cy - 22} L ${x0 + 18} ${cy + 36} L ${x0 + 26} ${cy + 36}`}
        fill="none"
        stroke={accent}
        strokeWidth={1.8}
        opacity={0.7}
      />
      <path
        d={`M ${x0 + w - 26} ${cy - 22} L ${x0 + w - 18} ${cy - 22} L ${x0 + w - 18} ${cy + 36} L ${x0 + w - 26} ${cy + 36}`}
        fill="none"
        stroke={accent}
        strokeWidth={1.8}
        opacity={0.7}
      />

      {/* Hình phóng lớn chi tiết vũ khí */}
      <Munition2D kind={kind} x={cx} y={cy + 8} scale={munitionScale} />
    </g>
  );
};

const S09: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Địa hình cao nguyên sa mạc phân tầng chạy suốt đáy đồ thị
  const hills = useMemo(
    () => ({
      far: skyline('s09-mesa-far', -350, 2750, 808, 128, 660, 1380),
      mid: skyline('s09-mesa-mid', -350, 2750, 836, 78, 440, 1380),
      near: skyline('s09-mesa-near', -350, 2750, 853, 28, 300, 1380),
    }),
    [],
  );

  // Camera 2D mở rộng & lia ngang mượt từ tầm gần sang tầm xa, luôn giữ trọn cả MQ-9 bên trái và mốc 30+ km bên phải
  const panToMid = prog(t, 86.2, 88.8);
  const panToFar = prog(t, 93.1, 95.1);
  const camX = lerp(lerp(945, 1085, panToMid), 1135, panToFar);
  const camY = lerp(535, 530, panToFar);
  const camZoom = lerp(lerp(1.01, 0.94, panToMid), 0.92, panToFar);
  const shake = handheld(t, 2.2, 's09-cam');

  // MQ-9 Reaper bay tuần tra ở góc cao bên trái (gốc toạ độ phóng 0 km)
  const mq9X = X0 + Math.sin((t - 80) * 0.55) * 9;
  const mq9Y = 256 + Math.cos((t - 80) * 0.7) * 4;
  const releaseX = mq9X + 14;
  const releaseY = mq9Y + 22;
  const mtsbX = mq9X + 98;
  const mtsbY = mq9Y + 19;

  // --- NHỊP 1: AGM-176 Griffin (80.68 -> 86.5s) ---
  const griffinActive = 1 - prog(t, 86.4, 87.1);
  const laserDesignateOp = (1 - prog(t, CUE.s09_griffin_hit, CUE.s09_griffin_hit + 0.4)) * 0.65;
  const pGriffin = prog(t, CUE.s09_griffin, CUE.s09_griffin_hit, (u) => u * (1.15 - 0.15 * u));
  const griffinPos = arcAt(releaseX, releaseY, X_GRIFFIN, Y_GROUND, 24, pGriffin);
  const griffinAng = arcAngle(releaseX, releaseY, X_GRIFFIN, Y_GROUND, 24, pGriffin);
  const griffinFlying = t >= CUE.s09_griffin && t < CUE.s09_griffin_hit;

  // --- NHỊP 2: GBU-38 JDAM GPS 28 km (86.6 -> 93.2s) ---
  const gbu38Spring = Math.min(1, useSpring(t, CUE.s09_gbu38 - 0.18, 12, 155));
  const gbu38Active = prog(t, 86.7, 87.2) * (1 - prog(t, 93.2, 93.9));
  const gpsSatReveal = prog(t, 86.75, 87.55);
  const pGbu38 = prog(t, CUE.s09_gbu38 + 0.32, CUE.s09_range_28km, (u) => u);
  const gbu38Pos = arcAt(releaseX + 6, releaseY - 2, X_GBU38, Y_GROUND, 98, pGbu38);
  const gbu38Ang = arcAngle(releaseX + 6, releaseY - 2, X_GBU38, Y_GROUND, 98, pGbu38);
  const gbu38Flying = t >= CUE.s09_gbu38 + 0.32 && t < CUE.s09_range_28km;
  const gpsWaveActive = prog(t, CUE.s09_gps_wave - 0.2, CUE.s09_gps_wave + 0.25) * (1 - prog(t, 92.1, 93.0));
  const hit28Glow = prog(t, CUE.s09_range_28km - 0.05, CUE.s09_range_28km + 0.3);

  // --- NHỊP 3: GBU-39 SDB mở màn tầm siêu xa (93.3 -> 96.70s) ---
  const gbu39Spring = Math.min(1, useSpring(t, 93.55, 12, 155));
  const gbu39Active = prog(t, 93.5, 94.2);
  const pGbu39Line = prog(t, 93.75, 95.75);
  const pGbu39Bomb = prog(t, 93.9, 96.65, (u) => u);
  const sdbStartX = releaseX + 10;
  const sdbStartY = releaseY - 4;
  const sdbEndX = 2240;
  const sdbEndY = 392;
  const gbu39BombX = lerp(sdbStartX, sdbEndX - 155, pGbu39Bomb);
  const gbu39BombY = lerp(sdbStartY, sdbEndY - 12, pGbu39Bomb) - Math.sin(pGbu39Bomb * Math.PI) * 16;

  const kmTicks = Array.from({ length: 35 }, (_, i) => i);

  return (
    <AbsoluteFill style={{ backgroundColor: P.stratTop }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.stratTop}>
        <Layer>
          <Defs2D shadow="rgba(8, 14, 24, 0.52)" />
          <defs>
            <linearGradient id="s09-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P.stratTop} />
              <stop offset="46%" stopColor={P.stratMid} />
              <stop offset="76%" stopColor={P.stratLow} />
              <stop offset="93%" stopColor={P.dawnHorizon} />
              <stop offset="100%" stopColor={P.dawnGlow} />
            </linearGradient>
            <linearGradient id="s09-earth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P.canyonDark} />
              <stop offset="35%" stopColor={P.canyonDeep} />
              <stop offset="100%" stopColor="#19110d" />
            </linearGradient>
          </defs>

          {/* Bầu trời tầng bình lưu chuyển sắc bình minh cao nguyên */}
          <rect x={-350} y={-220} width={3100} height={1100} fill="url(#s09-sky)" />

          {/* Lưới toạ độ mặt cắt chiến thuật */}
          <g opacity={0.34}>
            {[160, 280, 400, 520, 640, 760].map((gy) => (
              <line key={gy} x1={160} y1={gy} x2={2280} y2={gy} stroke={P.gridMinor} strokeWidth={1.2} />
            ))}
            {[0, 5, 10, 15, 20, 25, 30, 35].map((km) => (
              <line
                key={km}
                x1={kmX(km)}
                y1={230}
                x2={kmX(km)}
                y2={Y_GROUND}
                stroke={km % 10 === 0 ? P.gridMajor : P.gridMinor}
                strokeWidth={km % 10 === 0 ? 1.5 : 1.1}
                strokeDasharray={km === 0 ? undefined : '6 8'}
              />
            ))}
          </g>

          {/* Đường trần bay tuần tra ngang của MQ-9 */}
          <line
            x1={150}
            y1={256}
            x2={2240}
            y2={256}
            stroke={P.uavLight}
            strokeWidth={1.3}
            strokeDasharray="10 10"
            opacity={0.26}
          />

          {/* 3 lớp đồi núi sa mạc phân tầng chạy dọc đáy biểu đồ */}
          <path d={hills.far} fill={P.sandMid} opacity={0.3} />
          <path d={hills.mid} fill={P.mesaOchre} opacity={0.55} />
          <path d={hills.near} fill={P.canyonDark} />

          {/* Mặt cắt nền đất sa mạc dưới chân biểu đồ */}
          <rect x={-350} y={Y_GROUND} width={3100} height={520} fill="url(#s09-earth)" />
          <line x1={-350} y1={Y_GROUND} x2={2750} y2={Y_GROUND} stroke={P.sandLight} strokeWidth={2.4} opacity={0.78} />

          {/* Đường gióng chuẩn 0 km thẳng dưới bụng MQ-9 */}
          <line
            x1={X0}
            y1={mq9Y + 34}
            x2={X0}
            y2={Y_AXIS}
            stroke={P.uavLight}
            strokeWidth={1.8}
            strokeDasharray="6 6"
            opacity={0.58}
          />
          {[380, 500, 620, 740].map((ay) => (
            <line key={ay} x1={X0 - 7} y1={ay} x2={X0 + 7} y2={ay} stroke={P.uavLight} strokeWidth={1.6} opacity={0.55} />
          ))}

          {/* Trục thước chia cự ly ngang (km) rõ nét */}
          <line x1={215} y1={Y_AXIS} x2={2250} y2={Y_AXIS} stroke={P.paper} strokeWidth={2.4} opacity={0.86} />
          {kmTicks.map((km) => {
            const tx = kmX(km);
            const isMajor = km % 5 === 0;
            return (
              <g key={km}>
                <line
                  x1={tx}
                  y1={Y_AXIS}
                  x2={tx}
                  y2={Y_AXIS + (isMajor ? 15 : 7)}
                  stroke={isMajor ? P.paper : P.mutedText}
                  strokeWidth={isMajor ? 2.4 : 1.3}
                  opacity={isMajor ? 0.92 : 0.5}
                />
                {isMajor && km <= 30 && (
                  <text
                    x={tx}
                    y={Y_AXIS + 38}
                    textAnchor="middle"
                    fill={P.paper}
                    fontFamily={FONT}
                    fontSize={20}
                    fontWeight={700}
                    opacity={0.85}
                  >
                    {km === 30 ? '30 KM' : `${km}`}
                  </text>
                )}
              </g>
            );
          })}

          {/* Cột mốc vàng 28 km bật sáng khi thả & chạm nổ GBU-38 JDAM */}
          {t >= CUE.s09_gbu38 && (
            <g opacity={0.48 + 0.52 * hit28Glow}>
              <line
                x1={X_GBU38}
                y1={Y_GROUND}
                x2={X_GBU38}
                y2={Y_AXIS + 18}
                stroke={P.gold}
                strokeWidth={7}
                opacity={0.28}
              />
              <line
                x1={X_GBU38}
                y1={Y_GROUND}
                x2={X_GBU38}
                y2={Y_AXIS + 18}
                stroke={P.gold}
                strokeWidth={3.2}
              />
              <polygon
                points={`${X_GBU38},${Y_AXIS - 2} ${X_GBU38 - 9},${Y_AXIS - 15} ${X_GBU38 + 9},${Y_AXIS - 15}`}
                fill={P.gold}
              />
              <rect
                x={X_GBU38 - 26}
                y={Y_AXIS + 18}
                width={52}
                height={26}
                rx={6}
                fill={P.gold}
                stroke={P.ink}
                strokeWidth={1.8}
              />
              <text
                x={X_GBU38}
                y={Y_AXIS + 37}
                textAnchor="middle"
                fill={P.ink}
                fontFamily={FONT}
                fontSize={19}
                fontWeight={700}
              >
                28
              </text>
            </g>
          )}

          {/* Tia chỉ thị laser mảnh từ cằm MTS-B khoá mục tiêu tầm gần ở nhịp mở cảnh */}
          {laserDesignateOp > 0.02 && (
            <g>
              <line
                x1={mtsbX}
                y1={mtsbY}
                x2={X_GRIFFIN}
                y2={Y_GROUND - 12}
                stroke={P.laser}
                strokeWidth={5}
                strokeDasharray="7 6"
                opacity={laserDesignateOp * 0.28}
              />
              <line
                x1={mtsbX}
                y1={mtsbY}
                x2={X_GRIFFIN}
                y2={Y_GROUND - 12}
                stroke={P.laser}
                strokeWidth={1.8}
                strokeDasharray="7 6"
                opacity={laserDesignateOp}
              />
            </g>
          )}

          {/* Mục tiêu 1 (6.5 km - Xe cơ động hạng nhẹ cho tên lửa AGM-176 Griffin) */}
          <g transform={`translate(${X_GRIFFIN} ${Y_GROUND})`} opacity={t >= CUE.s09_griffin_hit + 0.15 ? 0.45 : 0.95}>
            <rect x={-22} y={-11} width={44} height={11} rx={2} fill={P.ink} />
            <polygon points="-14,-11 -6,-20 10,-20 16,-11" fill={P.uavShadow} stroke={P.ink} strokeWidth={1.6} />
            <circle cx={-13} cy={-2} r={5} fill={P.missileBody} stroke={P.ink} strokeWidth={1.5} />
            <circle cx={13} cy={-2} r={5} fill={P.missileBody} stroke={P.ink} strokeWidth={1.5} />
            <polygon points="0,-36 9,-27 0,-18 -9,-27" fill="none" stroke={P.flirHot} strokeWidth={2.2} opacity={0.9} />
          </g>

          {/* Mục tiêu 2 (28 km - Cụm công sự & trạm radar kiên cố cho bom GPS GBU-38 JDAM) */}
          <g transform={`translate(${X_GBU38} ${Y_GROUND})`} opacity={t >= CUE.s09_range_28km + 0.2 ? 0.5 : 0.96}>
            <polygon points="-34,0 -27,-22 27,-22 34,0" fill={P.uavShadow} stroke={P.ink} strokeWidth={2} />
            <rect x={-18} y={-30} width={36} height={8} rx={2} fill={P.uavDark} stroke={P.ink} strokeWidth={1.8} />
            <line x1={6} y1={-30} x2={6} y2={-42} stroke={P.uavLight} strokeWidth={2.2} />
            <path d="M -3,-45 Q 6,-37 15,-45" fill="none" stroke={P.gold} strokeWidth={2.4} />
            {t >= CUE.s09_gbu38 && (
              <circle
                cx={0}
                cy={-18}
                r={26}
                fill="none"
                stroke={P.gold}
                strokeWidth={2}
                strokeDasharray="6 5"
                opacity={0.82}
              />
            )}
          </g>

          {/* --- QUỸ ĐẠO 1: AGM-176 GRIFFIN (Lao dốc nhanh cự ly gần, màu cam nhiệt P.flirHot) --- */}
          {pGriffin > 0.005 && (
            <g>
              <path
                d={arcPath(releaseX, releaseY, X_GRIFFIN, Y_GROUND, 24, pGriffin)}
                fill="none"
                stroke={P.flirHot}
                strokeWidth={10}
                strokeLinecap="round"
                opacity={t >= 86.8 ? 0.16 : 0.26}
              />
              <path
                d={arcPath(releaseX, releaseY, X_GRIFFIN, Y_GROUND, 24, pGriffin)}
                fill="none"
                stroke={P.flirHot}
                strokeWidth={4.2}
                strokeLinecap="round"
                strokeDasharray={t >= CUE.s09_griffin_hit ? '10 7' : undefined}
                opacity={t >= 86.8 ? 0.72 : 0.98}
              />
              {griffinFlying && (
                <g transform={`translate(${griffinPos[0]} ${griffinPos[1]}) rotate(${griffinAng})`}>
                  <ellipse cx={-42} cy={0} rx={16} ry={4.5} fill={P.flirWarm} opacity={0.88} filter="url(#glow)" />
                  <Munition2D kind="griffin" scale={1.0} />
                </g>
              )}
            </g>
          )}

          {/* --- QUỸ ĐẠO 2: GBU-38 JDAM GPS (Vươn parabol tới chuẩn mốc 28 km, màu vàng P.gold) --- */}
          {pGbu38 > 0.005 && (
            <g>
              <path
                d={arcPath(releaseX + 6, releaseY - 2, X_GBU38, Y_GROUND, 98, 1)}
                fill="none"
                stroke={P.gold}
                strokeWidth={1.8}
                strokeDasharray="6 9"
                opacity={0.34}
              />
              <path
                d={arcPath(releaseX + 6, releaseY - 2, X_GBU38, Y_GROUND, 98, pGbu38)}
                fill="none"
                stroke={P.gold}
                strokeWidth={11}
                strokeLinecap="round"
                opacity={t >= 93.4 ? 0.18 : 0.28}
              />
              <path
                d={arcPath(releaseX + 6, releaseY - 2, X_GBU38, Y_GROUND, 98, pGbu38)}
                fill="none"
                stroke={P.gold}
                strokeWidth={4.6}
                strokeLinecap="round"
                opacity={t >= 93.4 ? 0.76 : 0.98}
              />
              {gbu38Flying && (
                <g transform={`translate(${gbu38Pos[0]} ${gbu38Pos[1]}) rotate(${gbu38Ang})`}>
                  <Munition2D kind="gbu38" scale={0.92} />
                </g>
              )}
            </g>
          )}

          {/* Vệ tinh GPS góc cao bầu trời phát vòng sóng dẫn đường thẳng xuống cánh đuôi GBU-38 */}
          <GPSSatellite2D
            x={1470}
            y={158}
            reveal={gpsSatReveal}
            waveActive={gpsWaveActive}
            pulseT={Math.max(0, t - CUE.s09_gps_wave)}
            targetX={gbu38Flying ? gbu38Pos[0] - 26 : kmX(21)}
            targetY={gbu38Flying ? gbu38Pos[1] - 8 : 515}
          />

          {/* --- QUỸ ĐẠO 3: GBU-39 SDB (Lướt ngang trần cao xanh ngọc P.laser vượt thẳng mép phải biểu đồ >>>) --- */}
          {pGbu39Line > 0.005 && (
            <g>
              <path
                d={`M ${sdbStartX} ${sdbStartY} Q 1220 314 ${sdbEndX} ${sdbEndY}`}
                fill="none"
                stroke={P.laser}
                strokeWidth={12}
                strokeLinecap="round"
                opacity={0.26}
                {...drawOn(1980, pGbu39Line)}
              />
              <path
                d={`M ${sdbStartX} ${sdbStartY} Q 1220 314 ${sdbEndX} ${sdbEndY}`}
                fill="none"
                stroke={P.laser}
                strokeWidth={5.2}
                strokeLinecap="round"
                {...drawOn(1980, pGbu39Line)}
              />
              {/* Cụm mũi tên hướng xa >>> báo hiệu tầm lướt vượt ngưỡng 30 km sang cảnh 3D S10 */}
              {pGbu39Line > 0.5 && (
                <g opacity={prog(t, 94.45, 95.15)}>
                  {[0, 1, 2].map((i) => {
                    const pulse = 0.45 + 0.55 * Math.sin((t - 94.4) * 6 - i * 0.9);
                    const cx = 1995 + i * 38;
                    const cy = 378 + i * 2.3;
                    return (
                      <polyline
                        key={i}
                        points={`${cx - 14},${cy - 14} ${cx + 4},${cy} ${cx - 14},${cy + 14}`}
                        fill="none"
                        stroke={P.laser}
                        strokeWidth={4.6}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        opacity={pulse}
                      />
                    );
                  })}
                </g>
              )}
              {t >= 93.9 && (
                <g transform={`translate(${gbu39BombX} ${gbu39BombY}) rotate(3.6)`}>
                  <Munition2D kind="gbu39" scale={1.0} />
                </g>
              )}
            </g>
          )}

          {/* Hiệu ứng lửa phóng nhỏ Muzzle2D & chạm nổ gọn (size=36) vs uy lực 28 km (size=72) */}
          <Muzzle2D t={t} at={CUE.s09_griffin} x={releaseX + 10} y={releaseY + 4} angle={44} size={24} seed={91} />
          <Blast2D t={t} at={CUE.s09_griffin_hit} x={X_GRIFFIN} y={Y_GROUND} size={36} seed={92} life={4.5} />
          <Blast2D t={t} at={CUE.s09_range_28km} x={X_GBU38} y={Y_GROUND} size={72} seed={93} life={5.2} />

          {/* MQ-9 Reaper tuần tra ở góc cao bên trái làm gốc toạ độ phóng */}
          <g filter="url(#sh)">
            <MQ9Side2D x={mq9X} y={mq9Y} scale={0.72} propPhase={t * 26} showWeapons />
          </g>

          {/* 3 Khung Hồ sơ Khí tài Phóng lớn bật sáng tuần tự không đè nhau */}
          <WeaponDossierCard
            cx={730}
            cy={142}
            w={346}
            h={146}
            kind="griffin"
            munitionScale={3.35}
            accent={P.flirHot}
            reveal={1}
            active={griffinActive}
            tier={1}
          />
          <WeaponDossierCard
            cx={1125}
            cy={142}
            w={386}
            h={146}
            kind="gbu38"
            munitionScale={2.18}
            accent={P.gold}
            reveal={gbu38Spring}
            active={gbu38Active}
            tier={2}
          />
          <WeaponDossierCard
            cx={1820}
            cy={142}
            w={380}
            h={146}
            kind="gbu39"
            munitionScale={2.58}
            accent={P.laser}
            reveal={gbu39Spring}
            active={gbu39Active}
            tier={3}
          />
        </Layer>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* Tối đa 1 Label tại một thời điểm */}
      <Label
        t={t}
        text="AGM-176 GRIFFIN"
        x={960}
        y={996}
        from={CUE.s09_griffin}
        until={86.2}
        size={46}
        bg={P.paper}
        fg={P.ink}
      />
      <Label
        t={t}
        text="GBU-38 · 28 KM"
        x={960}
        y={996}
        from={CUE.s09_gbu38}
        until={92.5}
        size={46}
        bg={P.gold}
        fg={P.ink}
      />
      <Label
        t={t}
        text="GBU-39 SDB"
        x={960}
        y={996}
        from={CUE.s09_gbu39_intro}
        until={96.5}
        size={46}
        bg={P.laser}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S09;
