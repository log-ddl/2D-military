import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, lerp, prog, rnd } from '@kit/theme';
import { handheld, Label, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { contours } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Top2D } from '../local/jets2d';

// 18 bóng ma F-15 giả (phantom targets) phân bố khắp mọi phương vị và cự ly trên màn radar PPI của địch
const PHANTOM_TARGETS = Array.from({ length: 18 }, (_, i) => {
  const angle = (i / 18) * Math.PI * 2 + (rnd(i * 7 + 1) - 0.5) * 0.28;
  const dist = 52 + rnd(i * 11 + 3) * 182;
  const heading = -155 + (rnd(i * 13 + 5) - 0.5) * 44;
  return {
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist,
    rot: heading,
    phase: rnd(i * 17 + 9) * Math.PI * 2,
    speed: 6 + rnd(i * 19 + 2) * 8,
  };
});

// Tiểu hình F-15 bóng ma trên màn radar đối phương
const MiniGhostJet: React.FC<{ x: number; y: number; rot: number; opacity: number; color: string }> = ({
  x,
  y,
  rot,
  opacity,
  color,
}) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)})`} opacity={opacity}>
    <polygon points="15,0 5,-3 -6,-13 -11,-12 -7,-3 -14,-4 -14,4 -7,3 -11,12 -6,13 5,3" fill={color} />
    <rect x={-16} y={-14} width={32} height={28} fill="none" stroke={color} strokeWidth={1.1} opacity={0.75} />
  </g>
);

const S19: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Đường đồng mức địa hình chiến thuật tạo chiều sâu dưới nền bảng phân tích
  const mapContours = useMemo(() => contours('s19ew', 2950, 1250, 8, 28, 560), []);

  // Lộ trình Cam2D:
  // Nửa đầu (534.6–554.7s): Tập trung trọn khung vào Tiêm kích + Máy phân tích phổ tần số RF (x=760, y=545, zoom=1.02)
  // Nửa sau (554.8–567.65s): Trượt mượt mở rộng sang phải thấy toàn cảnh đối kháng điện tử đôi + màn hình PPI địch
  const panWide = prog(t, 554.5, 558.0);
  const lockFocus = prog(t, 563.4, 566.2);

  const camX = lerp(760, 1415, panWide) + lockFocus * 35;
  const camY = lerp(548, 545, panWide) - lockFocus * 12;
  const camZ = lerp(1.01, 0.685, panWide) + lockFocus * 0.015;
  const shake = handheld(t, 1.5, 's19cam');

  // Logic trạng thái vật lý: Bẫy tự làm mù (538.84s) -> Nhấp nháy tắt nhiễu (542.6–546.0s) -> Cắt cửa sổ RF F-15EX (547.0s+)
  const isExMode = t >= 546.3;
  const upgradeWipe = prog(t, 546.1, 547.4);

  // Ở chế độ tiêm kích cũ: bật nhiễu mạnh lúc 538.84s; từ 542.6s tới 546.0s phải nhấp nháy tắt nhiễu để radar mũi nhìn được
  const blinkPhase = t >= 542.6 && t < 546.1 ? Math.sin((t - 542.6) * 5.2) : 1;
  const legacyJamOn = t < CUE.s19_selfBlind - 0.35 ? 0 : t < 542.6 ? prog(t, CUE.s19_selfBlind - 0.35, CUE.s19_selfBlind + 0.4) : blinkPhase > -0.15 ? 1 : 0.06;

  // Công suất tường nhiễu tổng (đỏ-cam)
  const jamPower = isExMode ? lerp(0.85, 1.0, prog(t, 546.3, 548.0)) : legacyJamOn;

  // Khe cửa sổ tần số vi mô do bộ lọc RF khả chỉnh cắt ra theo thời gian thực (từ 547.0s)
  const sliceOpen = prog(t, 547.0, 549.2);
  // Vị trí tâm cửa sổ tần số dịch chuyển linh hoạt thời gian thực trên trục GHz
  const winCenterU = 0.5 + (t > 550.2 ? 0.075 * Math.sin((t - 550.2) * 1.15) : 0);
  const winHalfU = 0.064 * sliceOpen;

  // Tín hiệu radar mũi: bị nghẹt tắt ngấm khi jamPower cao mà chưa có cửa sổ tần số (self-blinded!)
  const noseRadarClear = isExMode ? lerp(0.35, 1.0, sliceOpen) : Math.max(0.08, 1 - legacyJamOn * 0.92);
  const isSelfBlinded = !isExMode && legacyJamOn > 0.6;

  // Nửa sau: EPAWSS bơm nhiễu số (555.52s) -> Ngập 18 mục tiêu ma trên màn PPI địch (559.22s) -> APG-82 khóa cứng SAM (564.26s)
  const epawssBlastP = prog(t, CUE.s19_epawssBlast - 0.4, CUE.s19_epawssBlast + 1.4);
  const phantomFloodP = prog(t, CUE.s19_phantomFlood - 1.0, CUE.s19_phantomFlood + 1.2);
  const unbrokenLockP = prog(t, CUE.s19_unbrokenLock - 1.1, CUE.s19_unbrokenLock + 0.6);

  // Toạ độ các thành phần chính
  const fighterX = 415;
  const fighterY = 262;
  const noseWorldX = fighterX + 233 * 0.96; // ~639

  // Bảng phổ tần số RF (trái-dưới)
  const spX0 = 155;
  const spW = 1210;
  const spYBase = 918;
  const spMaxH = 315;
  const winWorldX = spX0 + winCenterU * spW;
  const winHalfPx = winHalfU * spW;

  // Đài SAM đối phương (phải-trên) & Màn hình PPI phòng không đối phương (phải-dưới)
  const samX = 2435;
  const samY = 262;
  const ppiCx = 2115;
  const ppiCy = 720;
  const ppiR = 246;

  const NUM_BARS = 88;

  return (
    <AbsoluteFill style={{ background: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZ} shake={shake} bg={P.bgDeep}>
        <svg width={2900} height={1200} viewBox="0 0 2900 1200" style={{ overflow: 'visible' }}>
          <Defs2D />

          {/* Nền bản vẽ kỹ thuật kết hợp đường đồng mức địa hình nhiều lớp */}
          <BlueprintGrid x0={-250} y0={-220} w={3400} h={1650} step={110} id="s19bp" />
          <g opacity={0.22}>
            {mapContours.map((c) => (
              <path
                key={c.level}
                d={c.d}
                transform="translate(-120 -60)"
                fill="none"
                stroke={c.level % 2 === 0 ? P.gridBright : P.grid}
                strokeWidth={c.level % 3 === 0 ? 1.4 : 0.9}
              />
            ))}
          </g>

          {/* ==================== KHU TRÊN: HÀNH LANG TÁC CHIẾN ĐIỆN TỬ (TIÊM KÍCH <-> ĐÀI SAM ĐỊCH) ==================== */}
          <rect
            x={95}
            y={72}
            width={panWide > 0.02 ? lerp(1330, 2610, panWide) : 1330}
            height={365}
            rx={14}
            fill="#0a192e"
            fillOpacity={0.76}
            stroke={P.gridBright}
            strokeWidth={1.8}
          />

          {/* Vòng sóng nhiễu bản rộng: đỏ hỗn loạn (đời cũ tự làm nghẹt mũi) vs hướng luồng có khe lọc sạch (F-15EX) */}
          {jamPower > 0.05 && (
            <g>
              {!isExMode ? (
                // Chế độ cũ: sóng nhiễu đỏ tràn ngược ra trước mũi làm mù chính radar mũi
                [0, 1, 2, 3].map((ri) => {
                  const cyc = ((t * 1.45 + ri * 0.25) % 1);
                  const rad = 85 + cyc * 290;
                  return (
                    <circle
                      key={ri}
                      cx={fighterX + 45}
                      cy={fighterY}
                      r={rad}
                      fill="none"
                      stroke={ri % 2 === 0 ? P.red : P.flame}
                      strokeWidth={4.2 * (1 - cyc * 0.6)}
                      strokeDasharray="18 10"
                      opacity={jamPower * (1 - cyc) * 0.85}
                    />
                  );
                })
              ) : (
                // Chế độ F-15EX: EPAWSS phóng sóng nhiễu số mạnh về phía địch nhưng chừa sạch hành lang khe tần số ở tâm mũi!
                <g>
                  {[0, 1, 2, 3, 4].map((wi) => {
                    const cyc = ((t * 1.15 + wi * 0.2) % 1);
                    const wx = lerp(fighterX + 120, lerp(1360, samX - 60, epawssBlastP), cyc);
                    const spread = 55 + cyc * 135;
                    return (
                      <g key={wi} opacity={jamPower * Math.sin(cyc * Math.PI) * 0.85}>
                        {/* Cánh sóng nhiễu trên & dưới tách khỏi hành lang cửa sổ tần số trung tâm */}
                        <path
                          d={`M${wx - 24},${fighterY - 26} Q${wx + 24},${fighterY - spread * 0.55} ${wx - 16},${fighterY - spread}`}
                          fill="none"
                          stroke={wi % 2 === 0 ? P.amber : P.red}
                          strokeWidth={3.6}
                        />
                        <path
                          d={`M${wx - 24},${fighterY + 26} Q${wx + 24},${fighterY + spread * 0.55} ${wx - 16},${fighterY + spread}`}
                          fill="none"
                          stroke={wi % 2 === 0 ? P.amber : P.red}
                          strokeWidth={3.6}
                        />
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* Chùm quét & Tia khóa mục tiêu từ radar mũi (bị đứt/tắt khi BLINDED, xuyên thẳng sắc lẹm qua khe RF trên F-15EX) */}
          {noseRadarClear > 0.12 && (
            <g opacity={noseRadarClear}>
              {/* Nón quét radar mũi cyan */}
              <polygon
                points={`${noseWorldX},${fighterY} ${noseWorldX + 580},${fighterY - (isExMode ? 24 : 95)} ${noseWorldX + 580},${fighterY + (isExMode ? 24 : 95)}`}
                fill={P.cyan}
                opacity={isExMode ? 0.16 : 0.13}
              />
              {/* Tia khóa liền mạch xuyên thẳng từ mũi F-15EX qua cổng cửa sổ tần số tới tận đài SAM địch */}
              {isExMode && (
                <>
                  <line
                    x1={noseWorldX}
                    y1={fighterY}
                    x2={lerp(1365, samX, Math.max(epawssBlastP * 0.75, unbrokenLockP))}
                    y2={fighterY}
                    stroke={P.cyan}
                    strokeWidth={10}
                    opacity={0.18}
                  />
                  <line
                    x1={noseWorldX}
                    y1={fighterY}
                    x2={lerp(1365, samX, Math.max(epawssBlastP * 0.75, unbrokenLockP))}
                    y2={fighterY}
                    stroke="#ffffff"
                    strokeWidth={3.2}
                  />
                  <line
                    x1={noseWorldX}
                    y1={fighterY}
                    x2={lerp(1365, samX, Math.max(epawssBlastP * 0.75, unbrokenLockP))}
                    y2={fighterY}
                    stroke={P.cyan}
                    strokeWidth={2.2}
                    strokeDasharray="18 8"
                    strokeDashoffset={-t * 180}
                  />
                </>
              )}
            </g>
          )}

          {/* Dấu cảnh báo radar mũi bị mù (BLINDED) ở máy bay thế hệ cũ (538.84–545.8s, không có Label nào lúc này) */}
          {isSelfBlinded && (
            <g transform={`translate(${noseWorldX + 195} ${fighterY})`}>
              <line x1={-34} y1={-34} x2={34} y2={34} stroke={P.red} strokeWidth={5.5} strokeLinecap="round" />
              <line x1={34} y1={-34} x2={-34} y2={34} stroke={P.red} strokeWidth={5.5} strokeLinecap="round" />
              <rect
                x={62}
                y={-24}
                width={176}
                height={48}
                rx={8}
                fill="#290b13"
                stroke={P.red}
                strokeWidth={2.4}
              />
              <text
                x={150}
                y={8}
                textAnchor="middle"
                fill="#ff6b7a"
                fontFamily={FONT}
                fontWeight={700}
                fontSize={24}
                letterSpacing={2}
              >
                BLINDED
              </text>
            </g>
          )}

          {/* Cổng khe cửa sổ tần số RF trên hành lang bay gióng thẳng đứng xuống khe cắt của biểu đồ phổ tần bên dưới */}
          {sliceOpen > 0.05 && (
            <g opacity={sliceOpen}>
              {/* Hai đường gióng đồng bộ thời gian thực nối khe lọc phổ tần với hành lang tia APG-82 */}
              <line
                x1={winWorldX - winHalfPx}
                y1={fighterY + 34}
                x2={winWorldX - winHalfPx}
                y2={545}
                stroke={P.cyan}
                strokeWidth={1.8}
                strokeDasharray="7 6"
                opacity={0.72}
              />
              <line
                x1={winWorldX + winHalfPx}
                y1={fighterY + 34}
                x2={winWorldX + winHalfPx}
                y2={545}
                stroke={P.cyan}
                strokeWidth={1.8}
                strokeDasharray="7 6"
                opacity={0.72}
              />
              {/* Khung cổng lọc Co-Site RF */}
              <path
                d={`M${winWorldX - winHalfPx - 12},${fighterY - 38} L${winWorldX - winHalfPx},${fighterY - 38} L${winWorldX - winHalfPx},${fighterY - 14}`}
                fill="none"
                stroke={P.cyanSoft}
                strokeWidth={3.2}
              />
              <path
                d={`M${winWorldX + winHalfPx + 12},${fighterY - 38} L${winWorldX + winHalfPx},${fighterY - 38} L${winWorldX + winHalfPx},${fighterY - 14}`}
                fill="none"
                stroke={P.cyanSoft}
                strokeWidth={3.2}
              />
              <path
                d={`M${winWorldX - winHalfPx - 12},${fighterY + 38} L${winWorldX - winHalfPx},${fighterY + 38} L${winWorldX - winHalfPx},${fighterY + 14}`}
                fill="none"
                stroke={P.cyanSoft}
                strokeWidth={3.2}
              />
              <path
                d={`M${winWorldX + winHalfPx + 12},${fighterY + 38} L${winWorldX + winHalfPx},${fighterY + 38} L${winWorldX + winHalfPx},${fighterY + 14}`}
                fill="none"
                stroke={P.cyanSoft}
                strokeWidth={3.2}
              />
            </g>
          )}

          {/* Hình chiếu bằng Tiêm kích: nâng cấp mượt từ F-15 cũ sang F-15EX Eagle II đầy đủ vũ khí & EPAWSS lúc 546.5s */}
          <g filter="url(#sh)">
            {upgradeWipe < 0.99 && (
              <F15Top2D x={fighterX} y={fighterY} scale={0.95} legacy opacity={1 - upgradeWipe} />
            )}
            {upgradeWipe > 0.01 && (
              <F15Top2D
                x={fighterX}
                y={fighterY}
                scale={0.97}
                wingTipMissiles
                fullLoad
                opacity={upgradeWipe}
              />
            )}
          </g>
          {/* Vệt quét laser nâng cấp sang F-15EX */}
          {upgradeWipe > 0.02 && upgradeWipe < 0.98 && (
            <line
              x1={lerp(fighterX - 240, fighterX + 250, upgradeWipe)}
              y1={fighterY - 165}
              x2={lerp(fighterX - 240, fighterX + 250, upgradeWipe)}
              y2={fighterY + 165}
              stroke={P.cyanSoft}
              strokeWidth={4}
            />
          )}

          {/* Đài radar & Bệ phóng tên lửa phòng không SAM của địch ở cuối hành lang bên phải */}
          {panWide > 0.05 && (
            <g opacity={panWide}>
              {/* Đường cáp nối từ đài radar SAM trên đồi xuống màn hình điều khiển PPI của trắc thủ địch */}
              <path
                d={`M${samX},${samY + 54} L${samX},${720} L${ppiCx + ppiR + 18},${720}`}
                fill="none"
                stroke={P.red}
                strokeWidth={2.2}
                strokeDasharray="10 6"
                opacity={0.55}
              />

              {/* Luồng gói dữ liệu nhiễu số giả mạo (digital deception packets) từ EPAWSS đập vào ăng-ten SAM */}
              {epawssBlastP > 0.05 &&
                Array.from({ length: 8 }, (_, pi) => {
                  const u = ((t * 0.82 + pi / 8) % 1);
                  const px = lerp(fighterX + 180, samX - 55, u);
                  const py = fighterY + (pi % 2 === 0 ? -1 : 1) * (36 + Math.sin(u * Math.PI * 2 + pi) * 42);
                  return (
                    <g key={pi} transform={`translate(${px} ${py})`} opacity={epawssBlastP * 0.88}>
                      <rect x={-18} y={-8} width={36} height={16} rx={3} fill="#2e1908" stroke={P.amber} strokeWidth={1.6} />
                      <line x1={-11} y1={0} x2={11} y2={0} stroke={P.amberHot} strokeWidth={2.2} strokeDasharray="4 3" />
                    </g>
                  );
                })}

              {/* Tổ hợp đài radar + xe phóng SAM đối phương nhìn từ trên/nghiêng */}
              <g transform={`translate(${samX} ${samY}) scale(1.26)`}>
                <circle r={64} fill="#1f1018" stroke={P.red} strokeWidth={2.2} strokeDasharray="8 6" />
                {/* Vòng sóng quét radar đỏ phát từ đài SAM */}
                {[0, 1].map((w) => {
                  const cyc = ((t * 0.9 + w * 0.5) % 1);
                  return (
                    <path
                      key={w}
                      d={`M${-45 - cyc * 95},-52 Q${-85 - cyc * 95},0 ${-45 - cyc * 95},52`}
                      fill="none"
                      stroke={P.red}
                      strokeWidth={2.6}
                      opacity={(1 - cyc) * 0.7}
                    />
                  );
                })}
                {/* Xe TELAR 8x8 */}
                <rect x={-44} y={-18} width={88} height={36} rx={5} fill={P.samGreen} stroke={P.ink} strokeWidth={2.2} />
                <rect x={-34} y={-13} width={44} height={9} rx={2} fill={P.samDark} stroke={P.ink} strokeWidth={1.3} />
                <rect x={-34} y={4} width={44} height={9} rx={2} fill={P.samDark} stroke={P.ink} strokeWidth={1.3} />
                {/* Đĩa radar điều khiển hỏa lực đang quay */}
                <g transform={`translate(22 0) rotate(${(t * 115) % 360})`}>
                  <rect x={-5} y={-22} width={10} height={44} rx={3} fill={P.ordMid} stroke={P.ink} strokeWidth={1.5} />
                  <line x1={-8} y1={0} x2={-18} y2={0} stroke={P.red} strokeWidth={2.4} />
                </g>

                {/* Khung khóa mục tiêu kim cương cyan của APG-82 khóa cứng đài bắn lúc 564.26s */}
                {unbrokenLockP > 0.02 && (
                  <g opacity={unbrokenLockP}>
                    <g transform={`rotate(${45 + (1 - unbrokenLockP) * 55}) scale(${lerp(1.8, 1.0, unbrokenLockP)})`}>
                      <rect
                        x={-52}
                        y={-52}
                        width={104}
                        height={104}
                        fill="none"
                        stroke={P.cyan}
                        strokeWidth={3.8}
                      />
                    </g>
                    <circle r={14} fill="none" stroke="#ffffff" strokeWidth={2.6} />
                    <line x1={-78} y1={0} x2={-48} y2={0} stroke={P.cyanSoft} strokeWidth={3} />
                    <line x1={48} y1={0} x2={78} y2={0} stroke={P.cyanSoft} strokeWidth={3} />
                    <line x1={0} y1={-78} x2={0} y2={-48} stroke={P.cyanSoft} strokeWidth={3} />
                    <line x1={0} y1={48} x2={0} y2={78} stroke={P.cyanSoft} strokeWidth={3} />
                  </g>
                )}
              </g>
            </g>
          )}

          {/* ==================== KHU DƯỚI TRÁI: BIỂU ĐỒ PHỔ TẦN SỐ RF & KHE LỌC CO-SITE ==================== */}
          <g>
            <rect
              x={95}
              y={478}
              width={1330}
              height={520}
              rx={16}
              fill="#071324"
              stroke={P.gridBright}
              strokeWidth={2.2}
            />
            {/* Tiêu đề kỹ thuật gọn trên thanh viền máy đo phổ */}
            <text x={145} y={522} fill={P.muted} fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing={1.5}>
              RF SPECTRUM · X-BAND (8.0 – 12.0 GHz)
            </text>
            {sliceOpen > 0.25 && (
              <text
                x={1375}
                y={522}
                textAnchor="end"
                fill={P.cyan}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={20}
                letterSpacing={1.2}
                opacity={sliceOpen}
              >
                CO-SITE RF WINDOW ACTIVE
              </text>
            )}

            {/* Lưới chia dB & GHz bên trong màn hình phân tích phổ */}
            {[0.25, 0.5, 0.75, 1.0].map((lv, li) => {
              const gy = spYBase - lv * spMaxH;
              return (
                <line
                  key={li}
                  x1={spX0}
                  y1={gy}
                  x2={spX0 + spW}
                  y2={gy}
                  stroke={P.grid}
                  strokeWidth={1}
                  strokeDasharray="6 8"
                  opacity={0.45}
                />
              );
            })}
            {[0, 0.25, 0.5, 0.75, 1].map((fu, fi) => {
              const gx = spX0 + fu * spW;
              const ghz = (8 + fu * 4).toFixed(1);
              return (
                <g key={fi}>
                  <line x1={gx} y1={555} x2={gx} y2={spYBase} stroke={P.grid} strokeWidth={1} opacity={0.38} />
                  <text
                    x={gx}
                    y={spYBase + 34}
                    textAnchor="middle"
                    fill={P.muted}
                    fontFamily={FONT}
                    fontWeight={500}
                    fontSize={18}
                  >
                    {ghz} GHz
                  </text>
                </g>
              );
            })}

            {/* Vùng nền khe cửa sổ tần số vi mô sạch nhiễu (Co-Site Filtered Window) */}
            {sliceOpen > 0.02 && (
              <g opacity={sliceOpen}>
                <rect
                  x={winWorldX - winHalfPx}
                  y={555}
                  width={winHalfPx * 2}
                  height={spYBase - 555}
                  fill={P.cyan}
                  fillOpacity={0.11}
                />
                <line
                  x1={winWorldX - winHalfPx}
                  y1={550}
                  x2={winWorldX - winHalfPx}
                  y2={spYBase}
                  stroke={P.cyan}
                  strokeWidth={2.6}
                />
                <line
                  x1={winWorldX + winHalfPx}
                  y1={550}
                  x2={winWorldX + winHalfPx}
                  y2={spYBase}
                  stroke={P.cyan}
                  strokeWidth={2.6}
                />
              </g>
            )}

            {/* Bức tường nhiễu đỏ-cam gầm rú trên toàn dải tần (bị cắt sạch về 0 ngay trong khe cửa sổ RF!) */}
            {Array.from({ length: NUM_BARS }, (_, bi) => {
              const u = (bi + 0.5) / NUM_BARS;
              const bx = spX0 + u * spW;
              const bw = (spW / NUM_BARS) * 0.76;
              const distWin = Math.abs(u - winCenterU);

              // Độ triệt nhiễu của bộ lọc RF khả chỉnh bên trong cửa sổ tần số
              let notchSuppress = 1;
              if (sliceOpen > 0.01 && winHalfU > 0.001) {
                const edge = (distWin - winHalfU * 0.86) / (winHalfU * 0.22);
                notchSuppress = Math.max(0, Math.min(1, edge));
              }

              const waveNoise =
                0.68 +
                0.18 * Math.sin(t * 17 + bi * 1.35) +
                0.14 * Math.cos(t * 23 - bi * 2.1);
              const noiseH = Math.max(4, jamPower * notchSuppress * spMaxH * 0.86 * waveNoise);
              const col = bi % 3 === 0 ? P.amber : P.red;

              return (
                <rect
                  key={bi}
                  x={bx - bw * 0.5}
                  y={spYBase - noiseH}
                  width={bw}
                  height={noiseH}
                  rx={2}
                  fill={col}
                  opacity={notchSuppress < 0.15 ? 0.18 : 0.88}
                />
              );
            })}

            {/* Đỉnh sóng mang Radar mũi APG-82 sắc lẹm màu cyan nằm chính giữa khe cửa sổ tần số */}
            {(() => {
              const peakH = spMaxH * (0.2 + 0.78 * noseRadarClear);
              return (
                <g opacity={isSelfBlinded ? 0.28 : 1}>
                  <polygon
                    points={`${winWorldX - 24},${spYBase} ${winWorldX},${spYBase - peakH} ${winWorldX + 24},${spYBase}`}
                    fill={P.cyan}
                    opacity={0.26}
                  />
                  <polygon
                    points={`${winWorldX - 9},${spYBase} ${winWorldX},${spYBase - peakH} ${winWorldX + 9},${spYBase}`}
                    fill={P.cyanSoft}
                  />
                  <line
                    x1={winWorldX}
                    y1={spYBase}
                    x2={winWorldX}
                    y2={spYBase - peakH - 8}
                    stroke="#ffffff"
                    strokeWidth={3}
                  />
                  <circle cx={winWorldX} cy={spYBase - peakH - 8} r={5} fill="#ffffff" />
                </g>
              );
            })()}

            <line x1={spX0 - 10} y1={spYBase} x2={spX0 + spW + 10} y2={spYBase} stroke={P.gridBright} strokeWidth={2.4} />
          </g>

          {/* ==================== KHU DƯỚI PHẢI: MÀN HÌNH RADAR PHÒNG KHÔNG ĐỊCH NGẬP MỤC TIÊU MA ==================== */}
          {panWide > 0.02 && (
            <g opacity={panWide}>
              <rect
                x={1495}
                y={478}
                width={1210}
                height={520}
                rx={16}
                fill="#0b101a"
                stroke={P.red}
                strokeWidth={2.2}
              />
              <text x={1545} y={522} fill="#ff7d8a" fontFamily={FONT} fontWeight={700} fontSize={20} letterSpacing={1.5}>
                HOSTILE SAM RADAR SCOPE
              </text>
              {phantomFloodP > 0.3 && (
                <text
                  x={2655}
                  y={522}
                  textAnchor="end"
                  fill={P.amber}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={20}
                  letterSpacing={1.2}
                >
                  FALSE-TARGET OVERLOAD
                </text>
              )}

              {/* Mặt kính tròn PPI radar phòng không đối phương */}
              <circle cx={ppiCx} cy={ppiCy} r={ppiR} fill="#14080e" stroke={P.red} strokeWidth={2.8} />
              {[0.25, 0.5, 0.75].map((rf, ri) => (
                <circle
                  key={ri}
                  cx={ppiCx}
                  cy={ppiCy}
                  r={ppiR * rf}
                  fill="none"
                  stroke={P.red}
                  strokeWidth={1.1}
                  strokeDasharray="6 6"
                  opacity={0.42}
                />
              ))}
              <line x1={ppiCx - ppiR} y1={ppiCy} x2={ppiCx + ppiR} y2={ppiCy} stroke={P.red} strokeWidth={1} opacity={0.4} />
              <line x1={ppiCx} y1={ppiCy - ppiR} x2={ppiCx} y2={ppiCy + ppiR} stroke={P.red} strokeWidth={1} opacity={0.4} />

              {/* Kim quét tròn PPI của radar địch */}
              {(() => {
                const sweepDeg = (t * 135) % 360;
                const rad = (sweepDeg * Math.PI) / 180;
                const sx = ppiCx + Math.cos(rad) * ppiR;
                const sy = ppiCy + Math.sin(rad) * ppiR;
                const trailRad = ((sweepDeg - 34) * Math.PI) / 180;
                const tx = ppiCx + Math.cos(trailRad) * ppiR;
                const ty = ppiCy + Math.sin(trailRad) * ppiR;
                return (
                  <g>
                    <path
                      d={`M${ppiCx},${ppiCy} L${tx},${ty} A${ppiR},${ppiR} 0 0,1 ${sx},${sy} Z`}
                      fill={P.red}
                      opacity={0.18}
                    />
                    <line x1={ppiCx} y1={ppiCy} x2={sx} y2={sy} stroke="#ff6e7f" strokeWidth={2.5} />
                  </g>
                );
              })()}

              {/* Các tia nhiễu cự ly giả (false-range strobes) xuyên tâm màn hình địch */}
              {epawssBlastP > 0.1 &&
                [0, 1, 2, 3, 4, 5].map((si) => {
                  const ang = ((si * 58 + Math.sin(t * 7 + si) * 18) * Math.PI) / 180;
                  return (
                    <line
                      key={si}
                      x1={ppiCx}
                      y1={ppiCy}
                      x2={ppiCx + Math.cos(ang) * (ppiR - 6)}
                      y2={ppiCy + Math.sin(ang) * (ppiR - 6)}
                      stroke={P.amber}
                      strokeWidth={1.7}
                      strokeDasharray="5 9"
                      strokeDashoffset={-t * 95}
                      opacity={epawssBlastP * 0.55}
                    />
                  );
                })}

              {/* 18 Bóng ma F-15 giả (phantom targets) nhấp nháy loạn xạ phủ kín mọi cự ly trên màn hình địch */}
              {phantomFloodP > 0.02 &&
                PHANTOM_TARGETS.map((pt, idx) => {
                  const appear = prog(t, CUE.s19_phantomFlood - 0.8 + idx * 0.08, CUE.s19_phantomFlood + 0.15 + idx * 0.08);
                  if (appear <= 0.01) return null;
                  const jitterX = Math.sin(t * pt.speed + pt.phase) * 7;
                  const jitterY = Math.cos(t * (pt.speed * 0.9) + pt.phase) * 7;
                  const blink = 0.45 + 0.55 * Math.abs(Math.sin(t * (pt.speed * 0.85) + idx));
                  const col = idx % 3 === 0 ? P.amberHot : '#ff596b';
                  return (
                    <MiniGhostJet
                      key={idx}
                      x={ppiCx + pt.dx + jitterX}
                      y={ppiCy + pt.dy + jitterY}
                      rot={pt.rot}
                      opacity={appear * blink}
                      color={col}
                    />
                  );
                })}

              {/* Cột chỉ số cự ly giả nhảy loạn bên cạnh màn PPI địch */}
              <g transform="translate(2435 585)">
                {[0, 1, 2, 3, 4].map((ri) => {
                  const fakeNm = Math.floor(18 + ((Math.sin(t * 11 + ri * 2.3) + 1) * 0.5) * 142);
                  const barW = 45 + ((Math.cos(t * 13 + ri * 1.7) + 1) * 0.5) * 155;
                  return (
                    <g key={ri} transform={`translate(0 ${ri * 66})`} opacity={0.35 + 0.65 * phantomFloodP}>
                      <rect x={0} y={0} width={215} height={46} rx={6} fill="#1b0d14" stroke={P.redDark} strokeWidth={1.5} />
                      <rect x={12} y={26} width={barW * phantomFloodP} height={8} rx={3} fill={ri % 2 === 0 ? P.amber : P.red} />
                      <text x={14} y={19} fill="#ff9ca6" fontFamily={FONT} fontWeight={700} fontSize={15}>
                        {`TRK #0${ri + 1} · ${fakeNm} NM ?`}
                      </text>
                    </g>
                  );
                })}
              </g>
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.36} />

      {/* Tối đa 1 Label trên màn hình */}
      <Label
        t={t}
        text="EPAWSS + APG-82"
        x={960}
        y={104}
        from={CUE.s19_epawssBlast}
        until={560.5}
        bg={P.cyan}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S19;
