import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT, lerp, prog } from '@kit/theme';
import { handheld, Label, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, Weapon2D } from '../local/jets2d';

const CH_Y = [248, 368, 488, 608] as const;

const S11: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ chuyển đổi từ cáp cơ khí sang 4 kênh Fly-By-Wire kỹ thuật số
  const fbwIn = prog(t, 285.3, 287.4);
  const oldCablesOut = 1 - prog(t, 285.3, 287.0);
  const voteIn = prog(t, CUE.s11_quadVote - 0.5, CUE.s11_quadVote + 0.9);
  const killIn = prog(t, CUE.s11_flutterKill - 0.35, CUE.s11_flutterKill + 1.15);

  // Camera 2D dẫn mắt mượt theo luồng tín hiệu từ trái sang phải rồi mở toàn cảnh mạch + dao động kế
  const pFollow = prog(t, 290.8, 294.5);
  const pSettle = prog(t, 297.8, 299.6);
  const camX = lerp(lerp(935, 985, pFollow), 960, pSettle);
  const camY = lerp(530, 545, pSettle);
  const camZoom = lerp(1.03, 1.0, prog(t, 285.2, 289.5));
  const [hx, hy] = handheld(t, 1.6 * (1 - killIn * 0.6), 's11_cam');

  // Chuyển động cần lái điện tử & nhiễu tải gió tần số cao
  const stickDeg = t >= 290.5 ? Math.sin((t - 290.5) * 3.4) * 6.5 * prog(t, 290.5, 292.0) : Math.sin(t * 1.8) * 1.8;
  const airLoadOsc = Math.sin(t * 28.0);

  // Trước khi FBW kích hoạt đầy đủ cánh còn rung nhẹ; khi voteIn & killIn lên 1, flaperon nhích ngược pha giữ cánh phẳng tuyệt đối!
  const residualWingTwist = airLoadOsc * 4.2 * (1 - voteIn * 0.65) * (1 - killIn);
  const flaperonAntiPhaseDeg = -airLoadOsc * lerp(2.5, 11.5, Math.max(voteIn * 0.7, killIn)) * fbwIn;

  // ---------------- Tính đường sóng cho màn hình dao động kế kép (x: 155..1765, yMid = 868) ----------------
  const redTremorPts: string[] = [];
  const cyanCounterPts: string[] = [];
  const flatResultPts: string[] = [];
  const N_PTS = 150;

  for (let i = 0; i <= N_PTS; i++) {
    const u = i / N_PTS;
    const sx = 155 + u * 1610;
    const phase = u * 38 - t * 18;
    const rawSpike = (Math.sin(phase) * 0.72 + Math.sin(phase * 2.1 + 0.8) * 0.28) * 74;

    // Khi killIn -> 1 (từ 298.80s): nhiễu đỏ vừa nhú lên ở đầu trái (u < 0.30) đã bị sóng ngược pha cyan dập phẳng lì ở phần phải!
    const dampZone = smoothStep(0.14, 0.36, u);
    const suppress = 1 - killIn * dampZone;

    const yRed = 868 - rawSpike * suppress * lerp(0.55, 1.0, Math.min(1, u * 2.2));
    redTremorPts.push(`${i === 0 ? 'M' : 'L'}${sx.toFixed(1)} ${yRed.toFixed(1)}`);

    // Sóng điều khiển ngược pha Cyan (+rawSpike thay vì -rawSpike!)
    const counterAmp = voteIn * (1 - killIn * smoothStep(0.32, 0.52, u) * 0.86);
    const yCyan = 868 + rawSpike * counterAmp * lerp(0.55, 1.0, Math.min(1, u * 2.2));
    cyanCounterPts.push(`${i === 0 ? 'M' : 'L'}${sx.toFixed(1)} ${yCyan.toFixed(1)}`);

    // Đường tổng hợp ổn định cánh máy bay (phẳng lì tuyệt đối từ 298.8s)
    const yRes = 868 - rawSpike * (1 - voteIn * 0.55) * (1 - killIn * 0.985);
    flatResultPts.push(`${i === 0 ? 'M' : 'L'}${sx.toFixed(1)} ${yRes.toFixed(1)}`);
  }

  return (
    <AbsoluteFill style={{ background: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={[hx, hy]} bg={P.bgDeep}>
        <svg
          width={1920}
          height={1080}
          viewBox="0 0 1920 1080"
          style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}
        >
          <Defs2D shadow="rgba(5, 10, 20, 0.5)" />
          <BlueprintGrid x0={-220} y0={-160} w={2360} h={1400} step={96} id="s11_bp" />

          {/* ==================== 1. CỤM CẦN LÁI ĐIỆN TỬ BÊN TRÁI (x: 85..395, y: 195..655) ==================== */}
          <g filter="url(#sh)">
            <rect
              x={88}
              y={196}
              width={302}
              height={460}
              rx={16}
              fill={P.bgPanel}
              stroke={P.gridBright}
              strokeWidth={2.2}
            />
            <rect x={106} y={214} width={266} height={38} rx={7} fill={P.bgDeep} />
            <text
              x={239}
              y={240}
              textAnchor="middle"
              fontFamily={FONT}
              fontWeight={700}
              fontSize={20}
              fill={P.cyanSoft}
              letterSpacing={1.8}
            >
              DIGITAL STICK
            </text>

            {/* Bóng dây cáp thép & ròng rọc cơ khí cũ mờ biến mất đầu cảnh (285.15 - 287.0s) */}
            {oldCablesOut > 0.02 && (
              <g opacity={oldCablesOut * 0.55}>
                <line x1={238} y1={520} x2={480} y2={480} stroke={P.legMid} strokeWidth={4} strokeDasharray="10 6" />
                <line x1={238} y1={555} x2={480} y2={585} stroke={P.legMid} strokeWidth={4} strokeDasharray="10 6" />
                <circle cx={340} cy={535} r={18} fill="none" stroke={P.red} strokeWidth={2.5} />
              </g>
            )}

            {/* Đế cảm biến điện tử 4 kênh LVDT */}
            <rect
              x={136}
              y={516}
              width={206}
              height={108}
              rx={10}
              fill="#0c1b2e"
              stroke={P.cyan}
              strokeWidth={2.2}
            />
            {[0, 1, 2, 3].map((k) => {
              const cx = 166 + k * 49;
              const active = fbwIn > 0.2;
              return (
                <g key={`lvdt-${k}`} transform={`translate(${cx} 572)`}>
                  <rect x={-16} y={-32} width={32} height={64} rx={5} fill={P.bgCard} stroke={P.gridBright} strokeWidth={1.5} />
                  <circle
                    cy={-12}
                    r={6}
                    fill={active ? (k % 2 === 0 ? P.cyan : P.amberHot) : P.f15Dark}
                  />
                  <text y={20} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={14} fill={P.text}>
                    {`C${k + 1}`}
                  </text>
                </g>
              );
            })}

            {/* Cần lái tiêm kích F-15EX nghiêng vi mô phát tín hiệu điện tử */}
            <g transform={`translate(239 516) rotate(${stickDeg})`}>
              {/* Chụp cao su khớp cầu */}
              <ellipse cx={0} cy={0} rx={44} ry={14} fill="#1b2634" stroke={P.ink} strokeWidth={2} />
              <ellipse cx={0} cy={-10} rx={36} ry={11} fill="#253345" stroke={P.ink} strokeWidth={1.8} />
              {/* Trục cần lái */}
              <path d="M-11,-12 L-8,-105 L10,-105 L13,-12 Z" fill={P.f15Mid} stroke={P.ink} strokeWidth={2.2} />
              {/* Tay nắm công thái học HOTAS 3 tông */}
              <path
                d="M-22,-102 Q-30,-152 -18,-204 Q-10,-226 22,-224 L38,-208 L32,-182 L16,-174 L18,-102 Z"
                fill="#2b394a"
                stroke={P.ink}
                strokeWidth={2.5}
              />
              <path
                d="M-14,-106 Q-20,-152 -10,-198 Q-4,-214 18,-214 L18,-182 L4,-174 L6,-106 Z"
                fill="#465b73"
                opacity={0.75}
              />
              {/* Nút phóng đạn đỏ & nấm điều khiển trim */}
              <rect x={16} y={-216} width={14} height={11} rx={3} fill={P.red} stroke={P.ink} strokeWidth={1.4} />
              <circle cx={-4} cy={-198} r={7.5} fill={P.cyan} stroke={P.ink} strokeWidth={1.5} />
              {/* Cò súng phía trước */}
              <path d="M18,-168 Q36,-162 32,-142 L18,-148" fill="none" stroke={P.amber} strokeWidth={4} strokeLinecap="round" />
            </g>
          </g>

          {/* ==================== 2. BỐN ĐƯỜNG CÁP SỐ DỰ PHÒNG SONG SONG (x: 390..625) ==================== */}
          {CH_Y.map((cy, idx) => {
            const isCyan = idx % 2 === 0;
            const col = isCyan ? P.cyan : P.amberHot;
            const pathD = `M390,${460 + (idx - 1.5) * 34} C465,${460 + (idx - 1.5) * 34} 495,${cy} 622,${cy}`;
            const pulseU = ((t * 2.1 + idx * 0.23) % 1);
            const px = lerp(405, 610, pulseU);
            const py = lerp(460 + (idx - 1.5) * 34, cy, smoothStep(0.15, 0.85, pulseU));
            return (
              <g key={`bus-${idx}`} opacity={fbwIn}>
                <path d={pathD} fill="none" stroke={col} strokeWidth={9} opacity={0.18} {...drawOn(320, fbwIn)} />
                <path d={pathD} fill="none" stroke={col} strokeWidth={3} {...drawOn(320, fbwIn)} />
                {fbwIn > 0.65 && (
                  <g transform={`translate(${px} ${py})`}>
                    <circle r={9} fill={col} opacity={0.28} />
                    <circle r={4.5} fill="#ffffff" />
                  </g>
                )}
              </g>
            );
          })}

          {/* ==================== 3. BỐN MÁY TÍNH BAY FCC 1..4 & MA TRẬN BIỂU QUYẾT (x: 622..1085) ==================== */}
          <g filter="url(#sh)">
            {CH_Y.map((cy, idx) => {
              const col = idx % 2 === 0 ? P.cyan : P.amberHot;
              return (
                <g key={`fcc-${idx}`} transform={`translate(622 ${cy - 45})`} opacity={0.25 + 0.75 * fbwIn}>
                  <rect
                    x={0}
                    y={0}
                    width={334}
                    height={90}
                    rx={12}
                    fill={P.bgCard}
                    stroke={voteIn > 0.1 ? col : P.gridBright}
                    strokeWidth={2.4}
                  />
                  {/* Lá tản nhiệt kim loại bên trái */}
                  {[14, 28, 42, 56, 70].map((fy) => (
                    <rect key={fy} x={8} y={fy} width={12} height={6} rx={2} fill={P.f15Dark} />
                  ))}
                  {/* Chip xử lý số */}
                  <rect x={32} y={18} width={54} height={54} rx={7} fill={P.bgDeep} stroke={col} strokeWidth={1.8} />
                  <rect x={44} y={30} width={30} height={30} rx={3} fill={col} opacity={0.82} />

                  <text x={98} y={40} fontFamily={FONT} fontWeight={700} fontSize={23} fill="#ffffff" letterSpacing={1.1}>
                    {`FCC ${idx + 1}`}
                  </text>
                  <text x={98} y={64} fontFamily={FONT} fontWeight={500} fontSize={13.5} fill={P.muted} letterSpacing={0.6}>
                    QUAD CHANNEL
                  </text>

                  {/* Ma trận đèn biểu quyết nhấp nháy siêu tốc hàng trăm lần/giây từ 292.0s */}
                  <g transform="translate(226 20)">
                    {Array.from({ length: 12 }, (_, m) => {
                      const colIdx = m % 4;
                      const rowIdx = Math.floor(m / 4);
                      const blink =
                        voteIn > 0.05
                          ? Math.sin(t * 44 + idx * 2.1 + m * 1.37) > -0.25
                          : m % 3 === 0;
                      const ledCol = killIn > 0.6 ? P.green : colIdx % 2 === 0 ? P.cyan : P.amberHot;
                      return (
                        <rect
                          key={m}
                          x={colIdx * 23}
                          y={rowIdx * 18}
                          width={16}
                          height={11}
                          rx={2.5}
                          fill={blink ? ledCol : '#0b1728'}
                          stroke={P.ink}
                          strokeWidth={1}
                        />
                      );
                    })}
                  </g>
                </g>
              );
            })}
          </g>

          {/* Mạng chéo biểu quyết đồng thuận (Quad Voter Node) tại x = 956..1095 */}
          <g opacity={fbwIn}>
            {CH_Y.map((cy, idx) => (
              <g key={`vlink-${idx}`}>
                <line
                  x1={956}
                  y1={cy}
                  x2={1056}
                  y2={428}
                  stroke={killIn > 0.5 ? P.green : P.cyan}
                  strokeWidth={7}
                  opacity={0.18}
                />
                <line
                  x1={956}
                  y1={cy}
                  x2={1056}
                  y2={428}
                  stroke={killIn > 0.5 ? P.green : P.cyan}
                  strokeWidth={2.6}
                />
              </g>
            ))}
            {/* Dây liên kết chéo kiểm tra chéo giữa 4 FCC */}
            {[0, 1, 2].map((k) => (
              <line
                key={`xstrap-${k}`}
                x1={978}
                y1={CH_Y[k]}
                x2={978}
                y2={CH_Y[k + 1]}
                stroke={P.amberHot}
                strokeWidth={2}
                strokeDasharray="5 4"
                opacity={0.75}
              />
            ))}
            <g transform="translate(1056 428)" filter="url(#sh)">
              <circle r={42} fill={P.bgDeep} stroke={killIn > 0.5 ? P.green : P.cyan} strokeWidth={3.5} />
              <circle r={31} fill="none" stroke={P.amberHot} strokeWidth={1.8} strokeDasharray="8 5" />
              <text y={-4} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={17} fill="#ffffff">
                VOTE
              </text>
              <text
                y={16}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={700}
                fontSize={16}
                fill={killIn > 0.5 ? P.green : P.cyan}
              >
                4 / 4
              </text>
            </g>
          </g>

          {/* Vòng hồi tiếp cảm biến tải gió & độ uốn cánh (Air Loads & Wing Flex Sampling) từ cánh về 4 FCC (bật từ 291.7s, sau khi Label tắt lúc 290.8s!) */}
          {voteIn > 0.02 && (
            <g opacity={voteIn}>
              <path
                d="M1485,278 L1485,152 L788,152 L788,198"
                fill="none"
                stroke={P.amber}
                strokeWidth={7}
                opacity={0.18}
              />
              <path
                d="M1485,278 L1485,152 L788,152 L788,198"
                fill="none"
                stroke={P.amberHot}
                strokeWidth={2.5}
                strokeDasharray="10 6"
                strokeDashoffset={t * 240}
              />
              <rect x={1010} y={128} width={285} height={44} rx={8} fill={P.bgDeep} stroke={P.amberHot} strokeWidth={2} />
              <text
                x={1152}
                y={156}
                textAnchor="middle"
                fontFamily={FONT}
                fontWeight={700}
                fontSize={18}
                fill={P.amberHot}
                letterSpacing={1.4}
              >
                WING FLEX · 400 HZ
              </text>
            </g>
          )}

          {/* Đường lệnh số tốc độ ánh sáng từ nút VOTE sang bộ chấp hành cánh F-15EX */}
          <g opacity={fbwIn}>
            <line x1={1098} y1={428} x2={1470} y2={394} stroke={P.cyan} strokeWidth={10} opacity={0.2} />
            <line x1={1098} y1={428} x2={1470} y2={394} stroke={P.cyan} strokeWidth={3.4} />
          </g>

          {/* ==================== 4. MẶT CẮT CÁNH F-15EX & FLAPERON NHÍCH VI MÔ NGƯỢC PHA (x: 1145..1835) ==================== */}
          <g filter="url(#sh)">
            <rect
              x={1148}
              y={196}
              width={684}
              height={460}
              rx={16}
              fill="rgba(16, 36, 62, 0.78)"
              stroke={P.gridBright}
              strokeWidth={2.2}
            />

            {/* Mặt cắt khí động cánh F-15EX + tên lửa đầu cánh Station 1/9 giữ thăng bằng vững chắc */}
            <g transform={`translate(1520 392) rotate(${residualWingTwist}) translate(-1520 -392)`}>
              {/* Vách ngàm thân cánh */}
              <rect x={1175} y={265} width={28} height={240} rx={4} fill={P.f15Dark} stroke={P.ink} strokeWidth={2.4} />

              {/* Biên dạng cánh siêu thanh F-15EX Titanium 3 tông */}
              <path
                d="M1202,315 Q1380,295 1645,358 L1645,424 Q1410,455 1202,458 Z"
                fill={P.f15Mid}
                stroke={P.ink}
                strokeWidth={3}
              />
              <path
                d="M1202,315 Q1380,295 1645,358 L1645,376 Q1385,326 1202,344 Z"
                fill={P.f15Light}
                opacity={0.86}
              />
              <path
                d="M1202,436 Q1410,435 1645,408 L1645,424 Q1410,455 1202,458 Z"
                fill={P.f15Dark}
                opacity={0.86}
              />

              {/* Hộp sườn CNC nguyên khối & Cảm biến đo độ uốn quang-điện */}
              {[1285, 1385, 1485].map((rx, idx) => (
                <g key={idx}>
                  <line x1={rx} y1={324} x2={rx} y2={446} stroke={P.bgDeep} strokeWidth={4} opacity={0.65} />
                  <circle
                    cx={rx}
                    cy={332}
                    r={6.5}
                    fill={voteIn > 0.1 ? P.amberHot : P.f15Dark}
                    stroke={P.ink}
                    strokeWidth={1.4}
                  />
                </g>
              ))}

              {/* Bộ truyền động điện-thủy lực số trực tiếp (Digital EHSA) sát mép sau cánh */}
              <rect
                x={1470}
                y={368}
                width={118}
                height={48}
                rx={7}
                fill={P.bgDeep}
                stroke={P.cyan}
                strokeWidth={2.5}
              />
              <rect
                x={1502 + Math.sin(t * 28) * 8 * voteIn}
                y={378}
                width={46}
                height={28}
                rx={4}
                fill={P.cyan}
              />
              <line x1={1588} y1={392} x2={1665} y2={392} stroke={P.ordWhite} strokeWidth={6} />

              {/* CÁNH LIỆNG / FLAPERON NHÍCH VI MÔ SIÊU TỐC NGƯỢC PHA VỚI TẢI GIÓ! */}
              {/* Hai bóng biên vi mô chứng tỏ nhích từng phần nhỏ của inch */}
              {voteIn > 0.2 && (
                <>
                  <g transform="translate(1648 391) rotate(-11)">
                    <polygon points="0,-28 148,-4 152,4 0,28" fill="none" stroke={P.cyan} strokeWidth={1.8} strokeDasharray="6 4" opacity={0.45} />
                  </g>
                  <g transform="translate(1648 391) rotate(11)">
                    <polygon points="0,-28 148,-4 152,4 0,28" fill="none" stroke={P.cyan} strokeWidth={1.8} strokeDasharray="6 4" opacity={0.45} />
                  </g>
                </>
              )}
              <g transform={`translate(1648 391) rotate(${flaperonAntiPhaseDeg})`}>
                <polygon
                  points="0,-29 150,-5 154,5 0,29"
                  fill={P.f15Light}
                  stroke={P.cyan}
                  strokeWidth={2.8}
                />
                <circle cx={6} cy={0} r={6} fill={P.cyan} stroke={P.ink} strokeWidth={1.5} />
              </g>

              {/* Mấu đầu cánh F-15EX & quả đạn AIM-120 đứng vững không còn rung xoắn */}
              <polygon points="1395,446 1555,432 1536,488 1418,488" fill={P.f15Dark} stroke={P.ink} strokeWidth={2.4} />
              <rect x={1358} y={486} width={224} height={11} rx={3} fill={P.f15Light} stroke={P.ink} strokeWidth={2} />
              <Weapon2D kind="amraam" x={1476} y={518} scale={3.1} accent={P.cyan} />
            </g>

            {/* Mũi tên tải gió đỏ/vàng đối đầu trực tiếp với vector lực dập ngược pha Cyan ở Flaperon */}
            <g>
              {/* Mũi tên tải gió biến thiên tác động vào cánh */}
              <g transform={`translate(1485 ${252 + airLoadOsc * 14})`}>
                <line x1={0} y1={-34} x2={0} y2={22} stroke={P.red} strokeWidth={5} />
                <polygon
                  points={airLoadOsc >= 0 ? '0,34 -12,12 12,12' : '0,-46 -12,-24 12,-24'}
                  fill={P.red}
                />
              </g>

              {/* Mũi tên lực điều khiển ngược pha Cyan ở Flaperon triệt tiêu tức khắc */}
              {voteIn > 0.15 && (
                <g transform={`translate(1745 ${392 - airLoadOsc * 16})`} opacity={voteIn}>
                  <line x1={0} y1={-44} x2={0} y2={44} stroke={P.cyan} strokeWidth={5} />
                  <polygon
                    points={airLoadOsc >= 0 ? '0,-56 -12,-34 12,-34' : '0,56 -12,34 12,34'}
                    fill={P.cyan}
                  />
                </g>
              )}

              {/* Huy hiệu trạng thái cánh ổn định tuyệt đối từ 298.8s */}
              {killIn > 0.1 && (
                <g opacity={killIn} transform="translate(1505 606)">
                  <rect x={-155} y={-24} width={310} height={44} rx={8} fill="#08241d" stroke={P.green} strokeWidth={2.2} />
                  <circle cx={-126} cy={-2} r={7} fill={P.green} />
                  <text
                    x={14}
                    y={6}
                    textAnchor="middle"
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={19}
                    fill={P.green}
                    letterSpacing={1.5}
                  >
                    FLUTTER KILLED · 0.00&quot;
                  </text>
                </g>
              )}
            </g>
          </g>

          {/* ==================== 5. MÀN HÌNH DAO ĐỘNG KẾ KÉP PHÍA DƯỚI (x: 88..1832, y: 708..1005) ==================== */}
          <g filter="url(#sh)">
            <rect
              x={88}
              y={708}
              width={1744}
              height={294}
              rx={16}
              fill="#06101d"
              stroke={killIn > 0.6 ? P.green : P.gridBright}
              strokeWidth={2.5}
            />

            {/* Lưới chia độ dao động kế */}
            {[778, 868, 958].map((gy, idx) => (
              <line
                key={`sg-${idx}`}
                x1={145}
                y1={gy}
                x2={1775}
                y2={gy}
                stroke={idx === 1 ? P.gridBright : P.grid}
                strokeWidth={idx === 1 ? 1.8 : 1}
                opacity={idx === 1 ? 0.55 : 0.28}
              />
            ))}
            {Array.from({ length: 13 }, (_, i) => (
              <line
                key={`svg-${i}`}
                x1={155 + i * 134}
                y1={736}
                x2={155 + i * 134}
                y2={982}
                stroke={P.grid}
                strokeWidth={1}
                opacity={0.25}
              />
            ))}

            {/* Sóng đỏ Flutter vừa nhú lên */}
            <path
              d={redTremorPts.join(' ')}
              fill="none"
              stroke={P.red}
              strokeWidth={9}
              opacity={0.2}
            />
            <path
              d={redTremorPts.join(' ')}
              fill="none"
              stroke={P.red}
              strokeWidth={3.2}
              opacity={0.9}
            />

            {/* Sóng điều khiển ngược pha Cyan từ 4 FCC */}
            {voteIn > 0.02 && (
              <>
                <path
                  d={cyanCounterPts.join(' ')}
                  fill="none"
                  stroke={P.cyan}
                  strokeWidth={9}
                  opacity={0.18 * voteIn}
                />
                <path
                  d={cyanCounterPts.join(' ')}
                  fill="none"
                  stroke={P.cyan}
                  strokeWidth={2.8}
                  strokeDasharray="10 6"
                  opacity={0.92 * voteIn}
                />
              </>
            )}

            {/* Đường đáp ứng cánh tổng hợp: bị triệt tiêu PHẲNG LÌ từ 298.80s! */}
            {killIn > 0.05 && (
              <>
                <path
                  d={flatResultPts.join(' ')}
                  fill="none"
                  stroke={P.green}
                  strokeWidth={12}
                  opacity={0.24 * killIn}
                />
                <path
                  d={flatResultPts.join(' ')}
                  fill="none"
                  stroke={P.green}
                  strokeWidth={4}
                  opacity={killIn}
                />
              </>
            )}

            {/* Chú giải ngắn gọn không đè sóng */}
            <circle cx={182} cy={746} r={6.5} fill={P.red} />
            <text x={198} y={753} fontFamily={FONT} fontWeight={700} fontSize={18} fill={P.red} letterSpacing={1.4}>
              FLUTTER TREMOR
            </text>

            <circle cx={468} cy={746} r={6.5} fill={P.cyan} />
            <text x={484} y={753} fontFamily={FONT} fontWeight={700} fontSize={18} fill={P.cyan} letterSpacing={1.4}>
              ANTI-PHASE FBW
            </text>

            {killIn > 0.2 && (
              <g opacity={killIn}>
                <circle cx={782} cy={746} r={6.5} fill={P.green} />
                <text x={798} y={753} fontFamily={FONT} fontWeight={700} fontSize={18} fill={P.green} letterSpacing={1.4}>
                  NET WING MOTION (FLAT)
                </text>
              </g>
            )}
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.4} />

      <Label
        t={t}
        text="4x FLY-BY-WIRE"
        x={960}
        y={102}
        from={CUE.s11_fbwSwitch}
        until={290.8}
        bg={P.cyan}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

function smoothStep(e0: number, e1: number, x: number) {
  const u = Math.max(0, Math.min(1, (x - e0) / Math.max(1e-5, e1 - e0)));
  return u * u * (3 - 2 * u);
}

export default S11;
