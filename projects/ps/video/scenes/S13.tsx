import React from 'react';
import { Easing } from 'remotion';
import { Label, handheld, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { CUE } from '../cues';
import {
  BlueprintBg2D,
  GlowLine2D,
  HumanOperator2D,
  PAC3_2D,
  PATRIOT_CUTAWAY_X,
  PatriotCutaway2D,
  type CutawaySection,
} from '../local/assets2d';
import { PAL2D } from '../local/palette';

const CUT_X = 960;
const CUT_Y = 480;
const CUT_SCALE = 1.15;

// Pha 2: tỉ lệ chuẩn 1:1 (1 m = 100 px) -> tên lửa cao 510 px (5,10 m), đường kính 25,4 px (254 mm), người cao 175 px (1,75 m)
const FLOOR_Y = 840;
const MISSILE_X = 960;
const MISSILE_H = 510;
const MISSILE_D = 25.4;
const HUMAN_H = 175;

const S13: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- Xác định phân khoang đang sáng ở Pha 1 (200.8 – 214.5s) ----------------
  let activeSection: CutawaySection = 'igniter';
  if (t >= 214.45) activeSection = 'none';
  else if (t >= 211.2) activeSection = 'fins';
  else if (t >= 207.62) activeSection = 'actuators';
  else if (t >= CUE.s13_propellant_40 - 0.35) activeSection = 'propellant';
  else activeSection = 'igniter';

  // Đóng vỏ mặt cắt trước khi dựng đứng sang Pha 2
  const peel = 1 - prog(t, 214.1, 215.1);

  // Cánh lái đuôi gật góc điều khiển hướng bay ở mốc 211.36s
  const finEnv = prog(t, 211.15, 211.55) * (1 - prog(t, 213.95, 214.45));
  const finDeflectDeg = Math.sin((t - CUE.s13_tail_fins) * 7) * 14 * finEnv;

  // ---------------- Tiến độ chuyển sang Pha 2: xoay dựng đứng -90° lên sàn hangar ----------------
  const pStand = prog(t, 214.35, 215.85, Easing.bezier(0.4, 0, 0.2, 1));
  const cutOpacity = 1 - prog(t, 214.95, 215.75);
  const standOpacity = prog(t, 214.8, 215.65);
  const standHudP = prog(t, 215.4, 216.3);

  // Toạ độ tâm tên lửa nội suy mượt từ bàn vẽ ngang sang bệ đứng 1:1
  const morphX = lerp(CUT_X, MISSILE_X, pStand);
  const morphY = lerp(CUT_Y, FLOOR_Y - MISSILE_H / 2, pStand);
  const morphRot = lerp(0, -90, pStand);
  const cutMorphScale = lerp(CUT_SCALE, MISSILE_H / 1400, pStand);
  const pacMorphScale = lerp((CUT_SCALE * 1400) / 520, MISSILE_H / 520, pStand);
  const pacThickness = lerp(2.1, 520 / MISSILE_H, pStand);

  // Người trưởng thành 1,75 m (175 px) bước vào đứng sát cạnh tên lửa lúc 221.02s
  const pHumanIn = prog(t, CUE.s13_human_scale, 222.25, Easing.out(Easing.cubic));
  const humanOpacity = prog(t, CUE.s13_human_scale - 0.05, CUE.s13_human_scale + 0.45);
  const humanX = lerp(1245, MISSILE_X + 94, pHumanIn);
  const walkBob = pHumanIn > 0.01 && pHumanIn < 0.99 ? Math.abs(Math.sin((t - CUE.s13_human_scale) * 15)) * 5 * (1 - pHumanIn) : 0;
  const pHumanCompare = prog(t, 222.0, 222.8);

  // ---------------- Quỹ đạo máy quay <Cam2D> qua 4 khoang đuôi rồi mở sàn hangar ----------------
  const wxIgniter = CUT_X + PATRIOT_CUTAWAY_X.igniter * CUT_SCALE; // ~925.5
  const wxAct = CUT_X + PATRIOT_CUTAWAY_X.actuators * CUT_SCALE; // ~209.1

  const pToProp = prog(t, 203.25, 204.25);
  const pToAct = prog(t, 207.35, 208.35);
  const pToFins = prog(t, 211.0, 211.75);
  const pToHangar = prog(t, 214.25, 215.95);
  const pToHuman = prog(t, 220.85, 222.2);

  let camX = lerp(wxIgniter + 18, CUT_X - 55, pToProp);
  camX = lerp(camX, wxAct + 250, pToAct);
  camX = lerp(camX, wxAct + 215, pToFins);
  camX = lerp(camX, MISSILE_X - 10, pToHangar);
  camX = lerp(camX, MISSILE_X + 26, pToHuman);

  let camY = lerp(CUT_Y, CUT_Y + 26, pToProp);
  camY = lerp(camY, CUT_Y, pToAct);
  camY = lerp(camY, 578, pToHangar);
  camY = lerp(camY, 592, pToHuman);

  let zoom = lerp(1.56, 1.04, pToProp);
  zoom = lerp(zoom, 1.72, pToAct);
  zoom = lerp(zoom, 1.58, pToFins);
  zoom = lerp(zoom, 1.23, pToHangar);
  zoom = lerp(zoom, 1.3, pToHuman);

  const shake = handheld(t, lerp(1.8, 1.1, pToHangar), 's13_cam');

  // Toạ độ thế giới của thước ngoặc 40% khoang thuốc phóng ở Pha 1
  const propX0 = CUT_X + PATRIOT_CUTAWAY_X.propellantSpan[0] * CUT_SCALE;
  const propX1 = CUT_X + PATRIOT_CUTAWAY_X.propellantSpan[1] * CUT_SCALE;
  const fullX0 = CUT_X - 700 * CUT_SCALE;
  const fullX1 = CUT_X + 700 * CUT_SCALE;
  const pPropHud = prog(t, 203.55, 204.35) * (1 - prog(t, 207.25, 207.65));
  const pIgnHud = (1 - prog(t, 203.15, 203.55)) * (1 - pStand);
  const pActHud = prog(t, 207.65, 208.15) * (1 - prog(t, 211.0, 211.35));
  const pFinHud = prog(t, 211.25, 211.7) * (1 - prog(t, 214.0, 214.4));

  const noseY = FLOOR_Y - MISSILE_H; // 330
  const rulerX = MISSILE_X - 170;

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: PAL2D.bgNight }}>
      <Cam2D x={camX} y={camY} zoom={zoom} shake={shake} bg={PAL2D.bgDeep}>
        <svg width={1920} height={1080} style={{ overflow: 'visible' }}>
          <Defs2D />
          <BlueprintBg2D x={-1000} y={-700} w={4000} h={2400} step={100} id="s13_bp" />

          {/* ==================== SÀN HANGAR & THANG ĐO TỈ LỆ 1:1 (PHA 2) ==================== */}
          {pStand > 0.02 && (
            <g opacity={prog(t, 214.55, 215.5)}>
              {/* Bóng nền mặt sàn hangar kỹ thuật */}
              <rect x={-400} y={FLOOR_Y} width={2800} height={420} fill="#081423" opacity={0.82} />
              {/* Vạch chéo cảnh báo mép sàn thử nghiệm */}
              <g opacity={0.28}>
                {Array.from({ length: 34 }, (_, i) => {
                  const hx = 220 + i * 44;
                  return (
                    <polygon
                      key={i}
                      points={`${hx},${FLOOR_Y + 2} ${hx + 20},${FLOOR_Y + 2} ${hx + 6},${FLOOR_Y + 20} ${hx - 14},${FLOOR_Y + 20}`}
                      fill={i % 2 === 0 ? PAL2D.amber : PAL2D.gridFine}
                    />
                  );
                })}
              </g>
              <line x1={-300} y1={FLOOR_Y} x2={2300} y2={FLOOR_Y} stroke={PAL2D.cyanSoft} strokeWidth={3.2} opacity={0.85} />
              <line x1={-300} y1={FLOOR_Y + 22} x2={2300} y2={FLOOR_Y + 22} stroke={PAL2D.grid} strokeWidth={1.6} opacity={0.5} />

              {/* Bệ kẹp giữ đuôi tên lửa trên sàn đo (đặt dưới y = FLOOR_Y để đuôi tên lửa đứng chuẩn y = FLOOR_Y) */}
              <polygon
                points={`${MISSILE_X - 58},${FLOOR_Y} ${MISSILE_X + 58},${FLOOR_Y} ${MISSILE_X + 76},${FLOOR_Y + 22} ${MISSILE_X - 76},${FLOOR_Y + 22}`}
                fill={PAL2D.usDark}
                stroke={PAL2D.stroke}
                strokeWidth={2.5}
              />
              <rect x={MISSILE_X - 32} y={FLOOR_Y - 12} width={16} height={12} rx={2} fill={PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={1.8} />
              <rect x={MISSILE_X + 16} y={FLOOR_Y - 12} width={16} height={12} rx={2} fill={PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={1.8} />

              {/* Cột thước đo chiều cao chuẩn mét thật (100 px = 1.00 m, từ 0 m tới 5.5 m) */}
              <g opacity={standHudP}>
                <line x1={rulerX} y1={FLOOR_Y} x2={rulerX} y2={FLOOR_Y - 550} stroke={PAL2D.cyanSoft} strokeWidth={2.4} />
                <line x1={rulerX - 10} y1={FLOOR_Y} x2={rulerX - 10} y2={FLOOR_Y - 550} stroke={PAL2D.grid} strokeWidth={1.2} opacity={0.6} />

                {/* Vạch chia mỗi 0.1 m (10 px), nhấn vạch 0.5 m (50 px) và vạch chẵn 1.0 m (100 px) */}
                {Array.from({ length: 56 }, (_, k) => {
                  const wy = FLOOR_Y - k * 10;
                  const isMeter = k % 10 === 0;
                  const isHalf = k % 5 === 0 && !isMeter;
                  const tickW = isMeter ? 26 : isHalf ? 16 : 8;
                  return (
                    <g key={k}>
                      <line
                        x1={rulerX}
                        y1={wy}
                        x2={rulerX + tickW}
                        y2={wy}
                        stroke={isMeter ? PAL2D.cyan : PAL2D.cyanSoft}
                        strokeWidth={isMeter ? 2.4 : isHalf ? 1.6 : 1}
                        opacity={isMeter ? 0.95 : isHalf ? 0.7 : 0.38}
                      />
                      {isMeter && k > 0 && (
                        <line
                          x1={rulerX + 28}
                          y1={wy}
                          x2={MISSILE_X + 190}
                          y2={wy}
                          stroke={PAL2D.grid}
                          strokeWidth={1.1}
                          strokeDasharray="5 9"
                          opacity={0.32}
                        />
                      )}
                    </g>
                  );
                })}

                {/* Đường gióng chuẩn đỉnh chóp tên lửa 5,10 m (510 px) & mặt sàn 0,00 m */}
                <GlowLine2D
                  d={`M${rulerX - 16} ${noseY} L${MISSILE_X + 46} ${noseY}`}
                  color={PAL2D.amber}
                  core={PAL2D.amberHot}
                  width={2.6}
                  dash="9 7"
                />
                {/* Mũi tên đôi đo tổng chiều cao 510 px */}
                <g opacity={prog(t, CUE.s13_spec_5m1 - 0.4, CUE.s13_spec_5m1 + 0.35)}>
                  <line x1={MISSILE_X - 78} y1={FLOOR_Y - 4} x2={MISSILE_X - 78} y2={noseY + 4} stroke={PAL2D.amber} strokeWidth={2.4} />
                  <polygon points={`${MISSILE_X - 78},${noseY} ${MISSILE_X - 84},${noseY + 14} ${MISSILE_X - 72},${noseY + 14}`} fill={PAL2D.amberHot} />
                  <polygon points={`${MISSILE_X - 78},${FLOOR_Y} ${MISSILE_X - 84},${FLOOR_Y - 14} ${MISSILE_X - 72},${FLOOR_Y - 14}`} fill={PAL2D.amberHot} />
                </g>

                {/* Thước kẹp ngang đo đường kính thân đạn 254 mm (25,4 px) lúc 219.44s (thu gọn trước khi người bước vào) */}
                <g opacity={prog(t, CUE.s13_spec_254mm - 0.35, CUE.s13_spec_254mm + 0.35) * (1 - prog(t, 220.9, 221.45))}>
                  {(() => {
                    const calY = FLOOR_Y - 285;
                    const lx = MISSILE_X - MISSILE_D / 2;
                    const rx = MISSILE_X + MISSILE_D / 2;
                    return (
                      <g>
                        <line x1={lx} y1={calY - 26} x2={lx} y2={calY + 26} stroke={PAL2D.cyan} strokeWidth={2.2} />
                        <line x1={rx} y1={calY - 26} x2={rx} y2={calY + 26} stroke={PAL2D.cyan} strokeWidth={2.2} />
                        <line x1={lx - 48} y1={calY} x2={lx - 4} y2={calY} stroke={PAL2D.cyan} strokeWidth={2.4} />
                        <polygon points={`${lx},${calY} ${lx - 12},${calY - 6} ${lx - 12},${calY + 6}`} fill={PAL2D.cyan} />
                        <line x1={rx + 48} y1={calY} x2={rx + 4} y2={calY} stroke={PAL2D.cyan} strokeWidth={2.4} />
                        <polygon points={`${rx},${calY} ${rx + 12},${calY - 6} ${rx + 12},${calY + 6}`} fill={PAL2D.cyan} />
                      </g>
                    );
                  })()}
                </g>
              </g>
            </g>
          )}

          {/* ==================== QUẢ TÊN LỬA: MẶT CẮT PHA 1 -> DỰNG ĐỨNG 1:1 PHA 2 ==================== */}
          {cutOpacity > 0.01 && (
            <g opacity={cutOpacity} filter="url(#sh)">
              <PatriotCutaway2D
                x={morphX}
                y={morphY}
                scale={cutMorphScale}
                rot={morphRot}
                peel={peel}
                active={activeSection}
                finDeflectDeg={finDeflectDeg}
              />
            </g>
          )}

          {standOpacity > 0.01 && (
            <g opacity={standOpacity} filter="url(#sh)">
              <PAC3_2D
                x={morphX}
                y={morphY}
                scale={pacMorphScale}
                thicknessScale={pacThickness}
                rot={morphRot}
              />
            </g>
          )}

          {/* ==================== ĐƯỜNG GIÓNG & THƯỚC ĐO KỸ THUẬT PHA 1 ==================== */}
          {/* 1. Khung chỉ điểm bộ kích nổ & khai hỏa (200.92s) */}
          {pIgnHud > 0.01 && (
            <g opacity={pIgnHud}>
              <rect
                x={CUT_X - 60 * CUT_SCALE}
                y={CUT_Y - 74}
                width={60 * CUT_SCALE}
                height={148}
                rx={10}
                fill="none"
                stroke={PAL2D.amberHot}
                strokeWidth={2.6}
                strokeDasharray="10 6"
              />
              <circle cx={wxIgniter} cy={CUT_Y - 110} r={7} fill={PAL2D.amberHot} />
              <line x1={wxIgniter} y1={CUT_Y - 103} x2={wxIgniter} y2={CUT_Y - 74} stroke={PAL2D.amberHot} strokeWidth={2.4} />
            </g>
          )}

          {/* 2. Thước ngoặc đo khoang thuốc phóng rắn chiếm đúng ~40% chiều dài tên lửa (203.9s) */}
          {pPropHud > 0.01 && (
            <g opacity={pPropHud}>
              {/* Vạch gióng hai đầu khoang nhiên liệu rắn */}
              <line x1={propX0} y1={CUT_Y + 68} x2={propX0} y2={CUT_Y + 138} stroke={PAL2D.amberHot} strokeWidth={2.4} strokeDasharray="6 5" />
              <line x1={propX1} y1={CUT_Y + 68} x2={propX1} y2={CUT_Y + 138} stroke={PAL2D.amberHot} strokeWidth={2.4} strokeDasharray="6 5" />

              {/* Thước ngoặc sáng cam kéo đúng qua PATRIOT_CUTAWAY_X.propellantSpan */}
              <GlowLine2D
                d={`M${propX0} ${CUT_Y + 112} L${propX0} ${CUT_Y + 132} L${lerp(propX0, propX1, prog(t, 203.65, 204.35))} ${CUT_Y + 132} L${lerp(propX0, propX1, prog(t, 203.65, 204.35))} ${CUT_Y + 112}`}
                color={PAL2D.amber}
                core={PAL2D.amberHot}
                width={3.6}
              />

              {/* Thanh tỉ lệ đối chiếu trực quan với 100% toàn thân tên lửa ngay bên dưới */}
              <line x1={fullX0} y1={CUT_Y + 174} x2={fullX1} y2={CUT_Y + 174} stroke={PAL2D.grid} strokeWidth={6} strokeLinecap="round" opacity={0.55} />
              <line x1={fullX0} y1={CUT_Y + 163} x2={fullX0} y2={CUT_Y + 185} stroke={PAL2D.cyanSoft} strokeWidth={2.2} />
              <line x1={fullX1} y1={CUT_Y + 163} x2={fullX1} y2={CUT_Y + 185} stroke={PAL2D.cyanSoft} strokeWidth={2.2} />
              <line
                x1={propX0}
                y1={CUT_Y + 174}
                x2={lerp(propX0, propX1, prog(t, 203.7, 204.45))}
                y2={CUT_Y + 174}
                stroke={PAL2D.amberHot}
                strokeWidth={9}
                strokeLinecap="round"
              />
            </g>
          )}

          {/* 3. Chỉ điểm cụm bơm & cơ cấu chấp hành đuôi (207.68s) */}
          {pActHud > 0.01 && (
            <g opacity={pActHud}>
              <rect
                x={CUT_X - 692 * CUT_SCALE}
                y={CUT_Y - 74}
                width={80 * CUT_SCALE}
                height={148}
                rx={10}
                fill="none"
                stroke={PAL2D.cyan}
                strokeWidth={2.6}
                strokeDasharray="9 6"
              />
              {[-43, 43].map((dy, idx) => (
                <g key={idx}>
                  <circle cx={wxAct} cy={CUT_Y + dy} r={8} fill="none" stroke={PAL2D.cyan} strokeWidth={2.2} />
                  <circle cx={wxAct} cy={CUT_Y + dy} r={3} fill={PAL2D.amberHot} />
                </g>
              ))}
            </g>
          )}

          {/* 4. Cung chia độ biểu diễn góc lệch cánh lái đuôi (211.36s) */}
          {pFinHud > 0.01 && (
            <g opacity={pFinHud}>
              {[-1, 1].map((sgn) => {
                const pivotX = CUT_X - 652 * CUT_SCALE;
                const pivotY = CUT_Y + sgn * 64.4;
                const arcR = 128;
                return (
                  <g key={sgn}>
                    <path
                      d={`M${pivotX - arcR * 0.45} ${pivotY + sgn * arcR * 0.89} A${arcR} ${arcR} 0 0 ${sgn > 0 ? 0 : 1} ${pivotX + arcR * 0.35} ${pivotY + sgn * arcR * 0.93}`}
                      fill="none"
                      stroke={PAL2D.cyan}
                      strokeWidth={2.4}
                      strokeDasharray="6 5"
                    />
                    <circle cx={pivotX} cy={pivotY} r={6} fill={PAL2D.amberHot} stroke={PAL2D.stroke} strokeWidth={1.8} />
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== NGƯỜI TRƯỞNG THÀNH 1,75 M ĐỐI CHIẾU TỈ LỆ 1:1 (221.02s) ==================== */}
          {humanOpacity > 0.01 && (
            <g opacity={humanOpacity}>
              {/* Bóng đổ dưới chân người trên sàn hangar */}
              <ellipse cx={humanX} cy={FLOOR_Y + 3} rx={26} ry={5} fill="#040b14" opacity={0.65} />
              <g filter="url(#sh)">
                <HumanOperator2D x={humanX} y={FLOOR_Y - walkBob} scale={1} color={PAL2D.cyanSoft} />
              </g>

              {/* Đường gióng đỉnh đầu người (1,75 m = 175 px) sang thân tên lửa (5,10 m = 510 px ~ gấp 2.91 lần!) */}
              {pHumanCompare > 0.01 && (
                <g opacity={pHumanCompare}>
                  <GlowLine2D
                    d={`M${rulerX} ${FLOOR_Y - HUMAN_H} L${humanX + 38} ${FLOOR_Y - HUMAN_H}`}
                    color={PAL2D.cyan}
                    core="#ffffff"
                    width={2.4}
                    dash="7 6"
                  />
                  {/* Thước đối chiếu 3 bậc chiều cao người dọc bên phải tên lửa (1x = 175px, 2x = 350px, ~3x = 510px) */}
                  {[1, 2].map((mult) => {
                    const markY = FLOOR_Y - HUMAN_H * mult;
                    return (
                      <g key={mult}>
                        <line
                          x1={MISSILE_X + 26}
                          y1={markY}
                          x2={MISSILE_X + 56}
                          y2={markY}
                          stroke={PAL2D.cyan}
                          strokeWidth={2.2}
                        />
                        <circle cx={MISSILE_X + 41} cy={markY} r={3.5} fill={PAL2D.cyan} />
                      </g>
                    );
                  })}
                  {/* Mũi tên dọc bên phải người trưởng thành */}
                  <line x1={humanX + 44} y1={FLOOR_Y - 3} x2={humanX + 44} y2={FLOOR_Y - HUMAN_H + 3} stroke={PAL2D.cyan} strokeWidth={2.2} />
                  <polygon points={`${humanX + 44},${FLOOR_Y - HUMAN_H} ${humanX + 39},${FLOOR_Y - HUMAN_H + 11} ${humanX + 49},${FLOOR_Y - HUMAN_H + 11}`} fill={PAL2D.cyan} />
                  <polygon points={`${humanX + 44},${FLOOR_Y} ${humanX + 39},${FLOOR_Y - 11} ${humanX + 49},${FLOOR_Y - 11}`} fill={PAL2D.cyan} />
                </g>
              )}
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.35} />

      {/* Tối đa 1 nhãn <Label> mỗi thời điểm, đặt cao thoáng tuyệt đối không đè lên hình */}
      <Label
        t={t}
        text="40%"
        x={960}
        y={215}
        from={CUE.s13_propellant_40}
        until={207.2}
        size={58}
        bg={PAL2D.amber}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="317 KG · 5,1 M · 254 MM"
        x={960}
        y={114}
        from={CUE.s13_spec_317kg}
        until={220.8}
        size={46}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </div>
  );
};

export default S13;
