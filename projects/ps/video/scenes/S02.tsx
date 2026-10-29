import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { bump, lerp, prog, rnd } from '@kit/theme';
import { handheld, Label, Layer, useSpring, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D } from '@lib/2d/fx';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { BlueprintBg2D, GlowLine2D, Kinzhal2D, PAC2_2D, PAC3_2D } from '../local/assets2d';

const IMPACT_X = 1010;
const IMPACT_Y = 752;

// Dữ liệu tất định các mảnh vỡ lớn nhỏ của thân, chóp mũi & cánh đuôi Kinzhal2D văng tản mác sau cú đâm thân-đối-thân
const DEBRIS_PIECES = Array.from({ length: 18 }, (_, i) => {
  const ang = -Math.PI * 0.88 + (i / 17) * Math.PI * 1.76 + (rnd(i * 5 + 1) - 0.5) * 0.18;
  const spd = 95 + rnd(i * 5 + 2) * 185;
  const spin = (rnd(i * 5 + 3) > 0.5 ? 1 : -1) * (110 + rnd(i * 5 + 4) * 190);
  const w = 34 + rnd(i * 5 + 5) * 48;
  const h = 15 + rnd(i * 5 + 6) * 24;
  const tone = i % 3 === 0 ? PAL2D.ruGreyLight : i % 3 === 1 ? PAL2D.ruGreyMid : PAL2D.ruGreyDark;
  const kind: 'nose' | 'fin' | 'hull' = i === 4 ? 'nose' : i === 2 || i === 12 || i === 15 ? 'fin' : 'hull';
  return {
    vx: Math.cos(ang) * spd,
    vy: Math.sin(ang) * spd - 24,
    spin,
    w,
    h,
    tone,
    kind,
  };
});

// Các tia mảnh văng màu vàng ở sơ đồ cũ tầng trên (trượt phía sau đuôi Kinzhal)
const UPPER_FRAG_RAYS = Array.from({ length: 11 }, (_, i) => {
  const deg = -68 + (i / 10) * 108;
  const rad = (deg * Math.PI) / 180;
  const len = 115 + (i % 3) * 28;
  return {
    x2: Math.cos(rad) * len,
    y2: Math.sin(rad) * len,
  };
});

const S02: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Camera đẩy zoom mạnh 1.0 -> 1.38 vào điểm giao cắt từ 22.5s -> 25.0s
  const pZoom = prog(t, 22.5, 25.0, Easing.inOut(Easing.cubic));
  const zoom = lerp(1.0, 1.38, pZoom);
  const camX = lerp(960, IMPACT_X, pZoom);
  // Đưa tâm Y xuống 768 khi zoom cận để khung cận hoàn toàn sạch, không dính rìa đáy sơ đồ tầng trên
  const camY = lerp(540, IMPACT_Y + 16, pZoom);

  // Tầng trên mờ dần khi chuyển trọng tâm sang cơ chế Hit-to-Kill của PAC-3 ở tầng dưới
  const upperDim =
    lerp(0.95, 0.28, prog(t, CUE.s02_hit_to_kill, 22.2, Easing.inOut(Easing.quad))) *
    lerp(1, 0.15, prog(t, 23.6, 24.8));
  const xMarkScale = useSpring(t, 16.65, 11, 170);

  // Chuyển động đối đầu ở tầng dưới: PAC-3 (từ trái sang phải) vs Kinzhal (từ phải sang trái)
  const pEnter = prog(t, 16.5, CUE.s02_hit_to_kill, Easing.out(Easing.cubic));
  const pClose = prog(t, CUE.s02_hit_to_kill, CUE.s02_body_impact, Easing.in(Easing.quad));

  const pac3Scale = 0.86;
  const kinScale = 0.78;
  const pac3X = lerp(lerp(250, 455, pEnter), IMPACT_X - 216, pClose);
  const kinzhalX = lerp(lerp(1685, 1510, pEnter), IMPACT_X + 272, pClose);

  // Vi hiệu chỉnh động cơ đẩy ngang ACM nhỏ giữ mũi PAC-3 khóa chết trên đường ngắm
  const acmPulse =
    0.9 * bump(t, 21.35, 0.32) -
    0.85 * bump(t, 22.95, 0.3) +
    0.95 * bump(t, 24.05, 0.28);
  const pac3Y = IMPACT_Y + 8 * Math.sin((t - 16.5) * 1.6) * (1 - pClose);

  const pac3NoseX = pac3X + 260 * pac3Scale;
  const kinNoseX = kinzhalX - 360 * kinScale;

  const lockOn = prog(t, 19.3, 20.3, Easing.out(Easing.cubic));
  const hitHappened = t >= CUE.s02_body_impact;
  const dtHit = t - CUE.s02_body_impact;

  const hh = handheld(t, 2.2, 's02_cam');
  const hitJolt = bump(t, CUE.s02_body_impact, 0.45) * 16;
  const shake: readonly [number, number] = [
    hh[0] + Math.sin(t * 62) * hitJolt,
    hh[1] + Math.cos(t * 54) * hitJolt,
  ];

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <Cam2D x={camX} y={camY} zoom={zoom} shake={shake} bg={PAL2D.bgNight}>
        <Layer>
          <Defs2D />
          <BlueprintBg2D x={-400} y={-300} w={2800} h={1750} step={120} id="s02_bp" />

          {/* Khung viền bàn vẽ kỹ thuật & vạch chia thước hai tầng */}
          <rect
            x={96}
            y={86}
            width={1728}
            height={912}
            rx={12}
            fill="none"
            stroke={PAL2D.grid}
            strokeWidth={2.2}
            opacity={0.48}
          />
          <line
            x1={120}
            y1={468}
            x2={1800}
            y2={468}
            stroke={PAL2D.grid}
            strokeWidth={2}
            strokeDasharray="14 10"
            opacity={0.55 * (1 - pZoom * 0.7)}
          />
          {Array.from({ length: 29 }, (_, i) => {
            const tx = 120 + i * 60;
            return (
              <line
                key={i}
                x1={tx}
                y1={462}
                x2={tx}
                y2={474}
                stroke={PAL2D.cyanSoft}
                strokeWidth={i % 4 === 0 ? 2.4 : 1.2}
                opacity={0.45 * (1 - pZoom * 0.7)}
              />
            );
          })}

          {/* ==================== TẦNG TRÊN: SƠ ĐỒ CŨ — PAC-2 NỔ MẢNH TIẾP CẬN HỤT SAU ĐUÔI ==================== */}
          <g opacity={upperDim}>
            <rect
              x={136}
              y={188}
              width={1648}
              height={248}
              rx={10}
              fill={PAL2D.bgNight}
              opacity={0.34}
              stroke={PAL2D.gridFine}
              strokeWidth={1.6}
            />

            <line
              x1={1680}
              y1={278}
              x2={310}
              y2={278}
              stroke={PAL2D.red}
              strokeWidth={3}
              strokeDasharray="16 10"
              opacity={0.68}
            />
            <line
              x1={250}
              y1={410}
              x2={1065}
              y2={338}
              stroke={PAL2D.amber}
              strokeWidth={2.6}
              strokeDasharray="10 8"
              opacity={0.58}
            />

            {/* Nón mảnh văng màu vàng bung trễ phía sau đuôi Kinzhal */}
            <g transform="translate(1082 334) rotate(-22)">
              <polygon points="0,0 168,-92 188,0 168,92" fill={PAL2D.amber} opacity={0.22} />
              <polygon points="0,0 124,-64 140,0 124,64" fill={PAL2D.amberHot} opacity={0.26} />
              {UPPER_FRAG_RAYS.map((r, idx) => (
                <line
                  key={idx}
                  x1={0}
                  y1={0}
                  x2={r.x2}
                  y2={r.y2}
                  stroke={idx % 2 === 0 ? PAL2D.amberHot : PAL2D.amber}
                  strokeWidth={2.6}
                  strokeDasharray="12 7"
                  strokeLinecap="round"
                />
              ))}
              <circle cx={0} cy={0} r={22} fill={PAL2D.amber} opacity={0.75} />
              <circle cx={0} cy={0} r={11} fill={PAL2D.amberHot} />
            </g>

            <g filter="url(#sh)">
              <PAC2_2D x={928} y={351} scale={0.54} rot={-5.2} flame={0.55} />
            </g>

            <g filter="url(#sh)">
              <Kinzhal2D x={595} y={278} scale={0.54} flip flame={0.5} heatGlow={0.55} />
            </g>
            <path
              d="M375 278 L305 278 M325 262 L302 278 L325 294"
              fill="none"
              stroke={PAL2D.red}
              strokeWidth={5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {xMarkScale > 0.01 && (
              <g transform={`translate(905 280) scale(${xMarkScale})`}>
                <circle r={36} fill={PAL2D.bgNight} stroke={PAL2D.red} strokeWidth={4.5} opacity={0.92} />
                <path
                  d="M-16 -16 L16 16 M16 -16 L-16 16"
                  stroke={PAL2D.red}
                  strokeWidth={8.5}
                  strokeLinecap="round"
                />
              </g>
            )}
          </g>

          {/* ==================== TẦNG DƯỚI: PAC-3 VA CHẠM TIÊU DIỆT TRỰC DIỆN THÂN-ĐỐI-THÂN ==================== */}
          <g>
            <line
              x1={140}
              y1={IMPACT_Y}
              x2={1780}
              y2={IMPACT_Y}
              stroke={PAL2D.cyanSoft}
              strokeWidth={1.8}
              strokeDasharray="8 10"
              opacity={0.38}
            />

            <g transform={`translate(${IMPACT_X} ${IMPACT_Y})`} opacity={hitHappened ? Math.max(0, 1 - dtHit * 1.5) : 0.85}>
              <circle r={74} fill="none" stroke={PAL2D.cyan} strokeWidth={1.8} strokeDasharray="10 8" opacity={0.55} />
              <circle r={42} fill="none" stroke={PAL2D.cyan} strokeWidth={2.4} opacity={0.8} />
              <line x1={-96} y1={0} x2={-52} y2={0} stroke={PAL2D.cyan} strokeWidth={2.4} />
              <line x1={52} y1={0} x2={96} y2={0} stroke={PAL2D.cyan} strokeWidth={2.4} />
              <line x1={0} y1={-96} x2={0} y2={-52} stroke={PAL2D.cyan} strokeWidth={2.4} />
              <line x1={0} y1={52} x2={0} y2={96} stroke={PAL2D.cyan} strokeWidth={2.4} />
            </g>

            {!hitHappened && lockOn > 0.01 && (
              <g opacity={lockOn}>
                <polygon
                  points={`${pac3NoseX},${pac3Y} ${Math.min(kinNoseX + 40, pac3NoseX + 420)},${IMPACT_Y - 72} ${Math.min(kinNoseX + 40, pac3NoseX + 420)},${IMPACT_Y + 72}`}
                  fill={PAL2D.cyan}
                  opacity={0.11}
                />
                <GlowLine2D
                  d={`M${pac3NoseX.toFixed(1)} ${pac3Y.toFixed(1)} L${kinNoseX.toFixed(1)} ${IMPACT_Y.toFixed(1)}`}
                  color={PAL2D.cyan}
                  core="#eaffff"
                  width={4.6}
                  {...drawOn(1200, lockOn)}
                />
                <g transform={`translate(${kinNoseX} ${IMPACT_Y}) rotate(45)`}>
                  <rect x={-18} y={-18} width={36} height={36} fill="none" stroke={PAL2D.cyan} strokeWidth={3} />
                </g>
              </g>
            )}

            {!hitHappened && (
              <>
                <GlowLine2D
                  d={`M145 ${IMPACT_Y} L${(pac3X - 235 * pac3Scale).toFixed(1)} ${pac3Y.toFixed(1)}`}
                  color={PAL2D.cyanSoft}
                  core="#ffffff"
                  width={4}
                  opacity={0.75}
                />
                <GlowLine2D
                  d={`M1785 ${IMPACT_Y} L${(kinzhalX + 340 * kinScale).toFixed(1)} ${IMPACT_Y}`}
                  color={PAL2D.red}
                  core={PAL2D.amberHot}
                  width={4.5}
                  opacity={0.78}
                />
              </>
            )}

            {!hitHappened && (
              <>
                <g filter="url(#sh)">
                  <PAC3_2D
                    x={pac3X}
                    y={pac3Y}
                    scale={pac3Scale}
                    flame={0.9}
                    acmFire={acmPulse}
                    thicknessScale={1.45}
                  />
                </g>
                <g filter="url(#sh)">
                  <Kinzhal2D
                    x={kinzhalX}
                    y={IMPACT_Y}
                    scale={kinScale}
                    flip
                    flame={0.75}
                    heatGlow={0.72}
                  />
                </g>
              </>
            )}

            {/* ==================== CÚ ĐÂM ĐỘNG NĂNG THÂN-ĐỐI-THÂN (24.85s) & MẢNH VỠ KINZHAL ==================== */}
            {hitHappened && (
              <g>
                {/* Quầng plasma động năng dư âm ở tâm va chạm + vòng sóng xung kích nở rộng */}
                {dtHit < 2.2 && (
                  <g>
                    <circle
                      cx={IMPACT_X}
                      cy={IMPACT_Y}
                      r={65 + dtHit * 32}
                      fill={PAL2D.amber}
                      opacity={0.38 * Math.max(0, 1 - dtHit / 2.2)}
                    />
                    <circle
                      cx={IMPACT_X}
                      cy={IMPACT_Y}
                      r={32 + dtHit * 18}
                      fill={PAL2D.amberHot}
                      opacity={0.55 * Math.max(0, 1 - dtHit / 1.8)}
                    />
                  </g>
                )}

                {dtHit < 3.4 && (
                  <>
                    <circle
                      cx={IMPACT_X}
                      cy={IMPACT_Y}
                      r={32 + (1 - (1 - Math.min(1, dtHit / 2.6)) ** 3) * 360}
                      fill="none"
                      stroke={PAL2D.cyan}
                      strokeWidth={Math.max(1.8, 8.5 * (1 - dtHit / 3.4))}
                      opacity={Math.max(0, 0.85 * (1 - dtHit / 3.4))}
                    />
                    <circle
                      cx={IMPACT_X}
                      cy={IMPACT_Y}
                      r={20 + (1 - (1 - Math.min(1, dtHit / 2.1)) ** 3) * 245}
                      fill="none"
                      stroke={PAL2D.amberHot}
                      strokeWidth={Math.max(1.5, 6.5 * (1 - dtHit / 2.8))}
                      opacity={Math.max(0, 0.88 * (1 - dtHit / 2.8))}
                    />
                  </>
                )}

                {/* Mảnh vỡ thân trụ, chóp mũi nhọn & cánh đuôi Kinzhal2D văng tản mác kèm tia lửa nóng */}
                {DEBRIS_PIECES.map((d, idx) => {
                  const px = IMPACT_X + d.vx * dtHit;
                  const py = IMPACT_Y + d.vy * dtHit + 32 * dtHit * dtHit;
                  const rot = idx * 24 + d.spin * dtHit;
                  const fade = Math.max(0.32, 1 - dtHit / 5.2);
                  const prevDt = Math.max(0, dtHit - 0.35);
                  return (
                    <g key={idx} opacity={fade}>
                      <line
                        x1={IMPACT_X + d.vx * prevDt}
                        y1={IMPACT_Y + d.vy * prevDt + 32 * prevDt * prevDt}
                        x2={px}
                        y2={py}
                        stroke={idx % 2 === 0 ? PAL2D.amber : PAL2D.red}
                        strokeWidth={2.8}
                        strokeLinecap="round"
                        opacity={0.68 * fade}
                      />
                      <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${rot.toFixed(1)})`}>
                        {d.kind === 'nose' ? (
                          <polygon
                            points="-52,-18 28,-10 58,0 28,10 -52,18 -38,0"
                            fill={PAL2D.ruGreyLight}
                            stroke={PAL2D.stroke}
                            strokeWidth={2.5}
                          />
                        ) : d.kind === 'fin' ? (
                          <polygon
                            points="-32,16 26,16 -6,-32 -34,-26"
                            fill={d.tone}
                            stroke={PAL2D.stroke}
                            strokeWidth={2.4}
                          />
                        ) : (
                          <g>
                            <polygon
                              points={`${-d.w * 0.5},${-d.h * 0.48} ${d.w * 0.5},${-d.h * 0.34} ${d.w * 0.4},${d.h * 0.5} ${-d.w * 0.44},${d.h * 0.42}`}
                              fill={d.tone}
                              stroke={PAL2D.stroke}
                              strokeWidth={2.3}
                            />
                            {idx % 4 === 0 && (
                              <line
                                x1={-d.w * 0.15}
                                y1={-d.h * 0.38}
                                x2={-d.w * 0.15}
                                y2={d.h * 0.38}
                                stroke={PAL2D.red}
                                strokeWidth={3}
                              />
                            )}
                          </g>
                        )}
                        <circle
                          cx={-d.w * 0.35}
                          cy={0}
                          r={4.5}
                          fill={PAL2D.amberHot}
                          opacity={Math.max(0.2, 1 - dtHit / 3.5)}
                        />
                      </g>
                    </g>
                  );
                })}
              </g>
            )}

            <Blast2D
              t={t}
              at={CUE.s02_body_impact}
              x={IMPACT_X}
              y={IMPACT_Y + 56}
              size={112}
              air
              life={4.5}
              smoke="#5f7285"
              seed={14}
            />
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.42} />
      <Label t={t} text="PAC-3" x={960} y={140} from={CUE.s02_pac3_label} until={23.2} />
    </AbsoluteFill>
  );
};

export default S02;
