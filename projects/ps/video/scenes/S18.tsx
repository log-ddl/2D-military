import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { bump, deg, lerp, prog, rnd } from '@kit/theme';
import { Label, Layer, handheld, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D, Muzzle2D } from '@lib/2d/fx';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { GlowLine2D, PAC3_2D, PatriotLauncher2D, PatriotRadar2D } from '../local/assets2d';

type PenetratorSpec = {
  id: number;
  cluster: number;
  sub: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  delay: number;
  isIntercepted: boolean;
};

const T_INTERCEPT = 334.8;

// Đúng 36 mũi xuyên động năng siêu vượt âm (6 cụm MIRV × 6 đầu đạn con) toả xuống phủ kín 1920 px.
// Duy nhất mũi #18 trên trục giữa X = 960 bị quả PAC-3 đơn độc chặn nổ lúc 334.8s; 35 mũi còn lại lao vút qua hai bên!
const PENETRATORS: PenetratorSpec[] = (() => {
  const list: PenetratorSpec[] = [];
  for (let c = 0; c < 6; c++) {
    const clusterOriginX = 330 + c * 252; // 330..1590
    const clusterOriginY = -95 - Math.abs(c - 2.5) * 22;
    for (let s = 0; s < 6; s++) {
      const id = c * 6 + s;
      const isIntercepted = id === 18;
      if (isIntercepted) {
        list.push({
          id,
          cluster: c,
          sub: s,
          x0: 960,
          y0: -85,
          x1: 960,
          y1: 1120,
          delay: 0,
          isIntercepted: true,
        });
      } else {
        // Rẽ khoảng trống rõ quanh tâm nổ x = 960 (±108 px) để thấy rõ 1 mũi bị chặn ở giữa vs 35 mũi đỏ tràn qua hai cánh
        const isLeft = id < 18;
        const sideIdx = isLeft ? id : id - 19; // trái: 0..17 (18 mũi), phải: 0..16 (17 mũi) -> tổng 35 mũi
        const targetX = isLeft
          ? lerp(68, 848, sideIdx / 17)
          : lerp(1072, 1852, sideIdx / 16);
        const jitterX = (rnd(id * 13 + 7) - 0.5) * 16;
        const staggerY = (rnd(id * 29 + 3) - 0.5) * 125;
        list.push({
          id,
          cluster: c,
          sub: s,
          x0: clusterOriginX + (s - 2.5) * 18,
          y0: clusterOriginY + staggerY * 0.35,
          x1: targetX + jitterX,
          y1: 1170 + staggerY,
          delay: (Math.abs(c - 2.5) * 0.14 + rnd(id * 17) * 0.26) * 0.52,
          isIntercepted: false,
        });
      }
    }
  }
  return list;
})();

/** Mũi nón xuyên động năng siêu vượt âm Oreshnik RV bọc màng plasma đỏ cam rực lửa. */
const KineticCone2D: React.FC<{
  x: number;
  y: number;
  rotDeg: number;
  scale?: number;
  pulse?: number;
}> = ({ x, y, rotDeg, scale = 1, pulse = 1 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotDeg}) scale(${scale})`}>
    <path
      d="M-34 -24 Q8 -17 34 0 Q8 17 -34 24 Q0 10 20 0 Q0 -10 -34 -24 Z"
      fill={PAL2D.red}
      opacity={0.5 * pulse}
    />
    <path
      d="M-18 -15 Q12 -10 28 0 Q12 10 -18 15 Q4 6 18 0 Q4 -6 -18 -15 Z"
      fill={PAL2D.amber}
      opacity={0.86}
    />
    <polygon
      points="-22,-10 21,0 -22,10 -18,0"
      fill="#2b333e"
      stroke={PAL2D.stroke}
      strokeWidth={1.8}
    />
    <polygon points="-21,-9 20,0 -18,0" fill="#596575" />
    <polygon points="-21,9 20,0 -18,0" fill="#171c23" />
    <line x1={-10} y1={-6.5} x2={-10} y2={6.5} stroke={PAL2D.amber} strokeWidth={2} />
    <circle cx={20} cy={0} r={4.2} fill={PAL2D.amberHot} />
  </g>
);

const S18: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const pInterceptPhase = prog(t, 325.65, T_INTERCEPT, (x) => x);
  const pBreakthrough = prog(t, T_INTERCEPT, 340.35, Easing.in(Easing.quad));
  const sAtIntercept = (465 - -85) / (1120 - -85);
  const globalS =
    t <= T_INTERCEPT
      ? lerp(0.18, sAtIntercept, pInterceptPhase)
      : lerp(sAtIntercept, 1.04, pBreakthrough);

  const pacAlive = t < T_INTERCEPT;
  const pacY = lerp(930, 465, prog(t, 325.65, T_INTERCEPT, Easing.out(Easing.quad)));
  const pacTrailFade = 1 - prog(t, T_INTERCEPT, 338.8);

  const camZoom = lerp(1.09, 0.98, prog(t, 325.85, 336.0, Easing.inOut(Easing.cubic)));
  const camY = lerp(522, 540, prog(t, 325.85, 335.5));
  const [hx, hy] = handheld(t, 3.0, 's18_cam');
  const blastShake = bump(t, T_INTERCEPT, 0.55) * 14;
  const sx = hx + Math.sin(t * 52) * blastShake;
  const sy = hy + Math.cos(t * 47) * blastShake;

  const part4Dim = prog(t, CUE.s18_part4_title - 0.22, CUE.s18_part4_title + 0.28, Easing.out(Easing.cubic));

  return (
    <AbsoluteFill style={{ background: PAL2D.bgNight }}>
      <Defs2D />
      <Cam2D x={960} y={camY} zoom={camZoom} shake={[sx, sy]} bg={PAL2D.bgNight}>
        <Layer>
          <defs>
            <radialGradient id="s18_zenith_dome" cx="50%" cy="12%" r="92%">
              <stop offset="0%" stopColor="#040a14" />
              <stop offset="38%" stopColor={PAL2D.bgNight} />
              <stop offset="72%" stopColor={PAL2D.bgDeep} />
              <stop offset="100%" stopColor="#1c4168" />
            </radialGradient>
            <radialGradient id="s18_threat_glow" cx="50%" cy="6%" r="62%">
              <stop offset="0%" stopColor={PAL2D.red} stopOpacity={0.28} />
              <stop offset="55%" stopColor={PAL2D.redDeep} stopOpacity={0.09} />
              <stop offset="100%" stopColor={PAL2D.bgNight} stopOpacity={0} />
            </radialGradient>
          </defs>

          <rect x={-320} y={-260} width={2560} height={1620} fill="url(#s18_zenith_dome)" />
          <rect x={-320} y={-260} width={2560} height={1200} fill="url(#s18_threat_glow)" />

          {/* Lưới phễu không phận nhìn ngược thẳng đứng lên đỉnh trời */}
          <g opacity={0.34}>
            {[180, 340, 510, 690, 880, 1080, 1300].map((r, idx) => (
              <circle
                key={r}
                cx={960}
                cy={80}
                r={r}
                fill="none"
                stroke={idx % 2 === 0 ? PAL2D.grid : PAL2D.gridFine}
                strokeWidth={idx % 2 === 0 ? 1.6 : 1.1}
                strokeDasharray={idx % 2 === 0 ? '10 10' : undefined}
              />
            ))}
            {Array.from({ length: 13 }, (_, i) => {
              const ang = ((15 + i * 12.5) * Math.PI) / 180;
              return (
                <line
                  key={i}
                  x1={960}
                  y1={80}
                  x2={960 + Math.cos(ang) * 1500}
                  y2={80 + Math.sin(ang) * 1500}
                  stroke={PAL2D.gridFine}
                  strokeWidth={1.1}
                />
              );
            })}
            <polygon points="960,1060 855,220 1065,220" fill={PAL2D.cyan} opacity={0.08} />
            <line x1={960} y1={1060} x2={855} y2={220} stroke={PAL2D.cyan} strokeWidth={1.5} strokeDasharray="8 8" opacity={0.45} />
            <line x1={960} y1={1060} x2={1065} y2={220} stroke={PAL2D.cyan} strokeWidth={1.5} strokeDasharray="8 8" opacity={0.45} />
          </g>

          {/* 36 mũi xuyên động năng siêu vượt âm + 36 vệt lửa đỏ rực trùm kín toàn bộ bầu trời 1920 px */}
          {PENETRATORS.map((p) => {
            const sLocal = Math.max(0.08, globalS - p.delay * 0.14);
            const sClamped = p.isIntercepted ? Math.min(sAtIntercept, sLocal) : sLocal;
            const curX = lerp(p.x0, p.x1, sClamped);
            const curY = lerp(p.y0, p.y1, sClamped);

            const sTail = Math.max(0, sClamped - 0.46);
            const tailX = lerp(p.x0, p.x1, sTail);
            const tailY = lerp(p.y0, p.y1, sTail);
            const rotDeg = deg(Math.atan2(p.y1 - p.y0, p.x1 - p.x0));

            const alive = !p.isIntercepted || t < T_INTERCEPT;
            const lineOp = p.isIntercepted ? pacTrailFade : 0.95;

            return (
              <g key={p.id}>
                {lineOp > 0.02 && (
                  <GlowLine2D
                    d={`M ${tailX.toFixed(1)} ${tailY.toFixed(1)} L ${curX.toFixed(1)} ${curY.toFixed(1)}`}
                    color={PAL2D.red}
                    core={PAL2D.amberHot}
                    width={3.3}
                    opacity={lineOp}
                  />
                )}
                {alive && (
                  <g>
                    {!p.isIntercepted && t >= 332.8 && curY > 80 && curY < 1030 && (
                      <rect
                        x={curX - 18}
                        y={curY - 18}
                        width={36}
                        height={36}
                        rx={3}
                        fill="none"
                        stroke={PAL2D.red}
                        strokeWidth={1.4}
                        strokeDasharray="6 5"
                        opacity={0.5 * prog(t, 332.8, 334.2)}
                      />
                    )}
                    <KineticCone2D
                      x={curX}
                      y={curY}
                      rotDeg={rotDeg}
                      scale={0.96}
                      pulse={0.88 + 0.12 * Math.sin(t * 22 + p.id)}
                    />
                  </g>
                )}
              </g>
            );
          })}

          {/* Vệt xanh cyan thẳng đứng & quả tên lửa PAC-3 đơn độc bay lên từ đáy giữa khung hình */}
          {pacTrailFade > 0.02 && (
            <GlowLine2D
              d={`M 960 1052 L 960 ${pacAlive ? pacY.toFixed(1) : '465'}`}
              color={PAL2D.cyan}
              core="#ebffff"
              width={5.2}
              opacity={pacTrailFade}
            />
          )}
          <Muzzle2D t={t} at={325.7} x={960} y={1042} angle={-90} size={36} seed={18} />

          {pacAlive && (
            <g>
              <circle
                cx={960}
                cy={pacY}
                r={36}
                fill="none"
                stroke={PAL2D.cyan}
                strokeWidth={2}
                strokeDasharray="8 6"
                opacity={0.78}
              />
              <PAC3_2D x={960} y={pacY} scale={0.25} rot={-90} flame={1} thicknessScale={1.6} />
            </g>
          )}

          {/* Chạm nổ trên không lúc 334.8s: chỉ tiêu diệt đúng 1 mũi xuyên ở giữa */}
          <Blast2D t={t} at={T_INTERCEPT} x={960} y={465} size={74} air seed={18} life={4.2} smoke="#738ba3" />
          {t >= T_INTERCEPT && t < T_INTERCEPT + 1.5 && (
            <circle
              cx={960}
              cy={465}
              r={20 + prog(t, T_INTERCEPT, T_INTERCEPT + 1.3, Easing.out(Easing.cubic)) * 165}
              fill="none"
              stroke={PAL2D.cyan}
              strokeWidth={3.2}
              opacity={1 - prog(t, T_INTERCEPT, T_INTERCEPT + 1.3)}
            />
          )}

          {/* Bóng sườn đồi & trận địa Patriot nhỏ bé dưới đáy phễu không phận */}
          <path
            d="M-320 1160 L-320 975 Q110 1020 480 1055 L1440 1055 Q1810 1020 2240 975 L2240 1160 Z"
            fill="#07111d"
            stroke={PAL2D.gridFine}
            strokeWidth={2}
          />
          <g opacity={0.72}>
            <PatriotRadar2D x={745} y={1056} scale={0.13} />
            <PatriotLauncher2D x={1175} y={1056} scale={0.13} flip elev={42} />
          </g>
          <g transform="translate(960 1065)">
            <rect x={-72} y={-20} width={144} height={52} rx={8} fill={PAL2D.usDark} stroke={PAL2D.stroke} strokeWidth={3} />
            <rect x={-56} y={-12} width={112} height={13} rx={3} fill={PAL2D.usMid} />
            <circle cx={0} cy={-12} r={10.5} fill="#101720" stroke={PAL2D.cyan} strokeWidth={2.2} />
          </g>
        </Layer>
      </Cam2D>

      {/* Lớp phủ chiến thuật tối sẫm nhẹ + khung chương sắc gọn mở Phần 4 lúc 340.08s */}
      {part4Dim > 0.005 && (
        <Layer style={{ pointerEvents: 'none' }}>
          <g opacity={part4Dim}>
            <rect x={0} y={0} width={1920} height={1080} fill="#06101c" opacity={0.82} />
            <line x1={310} y1={438} x2={1610} y2={438} stroke={PAL2D.cyan} strokeWidth={2} opacity={0.65} />
            <line x1={310} y1={642} x2={1610} y2={642} stroke={PAL2D.red} strokeWidth={2} opacity={0.65} />
            <path d="M350 475 L350 448 L385 448" fill="none" stroke={PAL2D.cyan} strokeWidth={3.5} />
            <path d="M1570 475 L1570 448 L1535 448" fill="none" stroke={PAL2D.cyan} strokeWidth={3.5} />
            <path d="M350 605 L350 632 L385 632" fill="none" stroke={PAL2D.red} strokeWidth={3.5} />
            <path d="M1570 605 L1570 632 L1535 632" fill="none" stroke={PAL2D.red} strokeWidth={3.5} />
          </g>
        </Layer>
      )}

      <Grain opacity={0.42} />

      <Label t={t} text="1 vs 36" x={960} y={145} from={333.5} until={338.5} />
      <Label
        t={t}
        text="PHẦN 4 · CHIẾN LƯỢC BÃO HÒA"
        x={960}
        y={540}
        size={58}
        from={CUE.s18_part4_title}
        until={341.6}
      />
    </AbsoluteFill>
  );
};

export default S18;
