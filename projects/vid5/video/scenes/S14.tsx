import React from 'react';
import { FONT, prog, lerp, bump } from '@kit/theme';
import { useT, useSpring, handheld, Layer, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Side2D, F22Side2D, F35Side2D, Weapon2D } from '../local/jets2d';

// Tọa độ chuẩn 1:1 (scale = 2.5 -> 1 m = 60 px)
const JET_X = 695;
const JET_Y = 315;
const S = 2.5;

// Quả tên lửa siêu vượt âm 22 ft (6.71 m -> 160.5 * 2.5 = 401.25 px) đặt tại tâm mấu bụng x = 710
const WEP_CX = 710;
const WEP_X0 = WEP_CX - 80 * S; // 510
const WEP_X1 = WEP_CX + 80.5 * S; // 911.25
const BAY_12FT_W = 87.8 * S; // 219.5 px (chuẩn 12 ft = 3.66 m)
const BAY_12FT_X1 = WEP_X0 + BAY_12FT_W; // 729.5

const S14: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Điều phối máy quay Cam2D qua 4 nhịp kỹ thuật — luôn giữ trọn cả đuôi F-15EX lẫn cột cân MTOW bên phải
  const pHoistFocus = prog(t, 370.8, 372.8);
  const pCompareFocus = prog(t, 380.4, 382.4);
  const pFuelMtowFocus = prog(t, 389.4, 391.8);

  let camX = lerp(955, 935, pHoistFocus);
  camX = lerp(camX, 945, pCompareFocus);
  camX = lerp(camX, 965, pFuelMtowFocus);

  let camY = lerp(520, 498, pHoistFocus);
  camY = lerp(camY, 540, pCompareFocus);
  camY = lerp(camY, 520, pFuelMtowFocus);

  let camZoom = lerp(1.0, 1.02, pHoistFocus);
  camZoom = lerp(camZoom, 1.01, pCompareFocus);
  camZoom = lerp(camZoom, 1.0, pFuelMtowFocus);

  const lockThud = bump(t, CUE.s14_centerlineMount, 0.45);
  const mtowPeakBump = bump(t, CUE.s14_mtow81k, 0.7);
  const hk = handheld(t, 2.0 + lockThud * 3.5, 's14');

  // Nhịp 1: Kỷ lục tải trọng vũ khí 29.500 lb (~15 tấn)
  const payloadProg = prog(t, 365.4, 369.8);

  // Nhịp 2: Xe nâng thủy lực đưa quả đạn siêu vượt âm 22 ft / 7.000 lb lên khóa vào mấu bụng trung tâm lúc 373.00s
  const hoistAppear = prog(t, 370.2, 371.2);
  const hoistLift = prog(t, 370.6, CUE.s14_centerlineMount);
  const wepY = lerp(458, 386, hoistLift);
  const isLocked = t >= CUE.s14_centerlineMount;
  const cradleRetract = prog(t, 373.6, 375.2);
  const dim22Prog = prog(t, 375.2, CUE.s14_centerline22ft);

  // Nhịp 3: Đối chiếu 1:1 với khoang đạn 12 ft của F-22A và F-35A (bị gạch chéo đỏ lúc 384.86s)
  const stealthBaysIn = prog(t, 380.4, 382.2);
  const noFitSlam = useSpring(t, CUE.s14_noFitStealth, 12, 180);
  const showNoFit = t >= CUE.s14_noFitStealth;

  // Nhịp 4: Bơm 13.500 lb (2.000 gal) nhiên liệu trong thân/cánh -> Trọng lượng cất cánh tối đa 81.000 lb
  const fuelTankShow = prog(t, 389.8, 391.2);
  const fuelFillProg = prog(t, 391.0, 397.8);
  const mtowLocked = t >= CUE.s14_mtow81k;

  // Tính toán cột cân tải trọng công nghiệp MTOW (0 .. 81,000 lb)
  const dryLb = 38000;
  const ordLb = Math.round(29500 * payloadProg);
  const fuelLb = Math.round(13500 * fuelFillProg);
  const totalLb = dryLb + ordLb + fuelLb;

  const gaugeX = 1425;
  const gaugeW = 275;
  const gaugeBot = 835;
  const gaugeTop = 165;
  const gaugeH = gaugeBot - gaugeTop; // 670 px cho 81,000 lb
  const lbToH = (lb: number) => (lb / 81000) * gaugeH;

  const hDry = lbToH(dryLb);
  const hOrd = lbToH(ordLb);
  const hFuel = lbToH(fuelLb);
  const topY = gaugeBot - (hDry + hOrd + hFuel);

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, background: P.bgDeep, overflow: 'hidden' }}>
      <Cam2D
        x={camX}
        y={camY}
        zoom={camZoom}
        shake={[hk[0], hk[1] + lockThud * -3]}
        bg={P.bgDeep}
      >
        <Layer style={{ width: 2400, height: 1400 }}>
          <Defs2D shadow="rgba(6, 12, 24, 0.55)" />
          <defs>
            {/* Mặt nạ mực chất lỏng nhiên liệu dâng lên từ đáy bồn trong thân F-15EX */}
            <clipPath id="s14_fuelClip">
              <rect
                x={JET_X - 480}
                y={lerp(JET_Y + 42, JET_Y - 58, fuelFillProg)}
                width={920}
                height={120}
              />
            </clipPath>
          </defs>

          <BlueprintGrid x0={-300} y0={-220} w={2560} h={1540} step={100} id="s14_bp" />

          {/* Các đường gióng kích thước thẳng đứng xuyên suốt từ F-15EX xuống 2 khoang tàng hình 12 ft */}
          {dim22Prog > 0.02 && (
            <g opacity={dim22Prog * 0.55}>
              <line
                x1={WEP_X0}
                y1={386}
                x2={WEP_X0}
                y2={stealthBaysIn > 0.05 ? 825 : 495}
                stroke={P.cyan}
                strokeWidth={1.6}
                strokeDasharray="7 5"
              />
              <line
                x1={WEP_X1}
                y1={386}
                x2={WEP_X1}
                y2={stealthBaysIn > 0.05 ? 825 : 495}
                stroke={P.amber}
                strokeWidth={1.8}
                strokeDasharray="7 5"
              />
            </g>
          )}
          {stealthBaysIn > 0.02 && (
            <line
              x1={BAY_12FT_X1}
              y1={515}
              x2={BAY_12FT_X1}
              y2={835}
              stroke={P.red}
              strokeWidth={2.2}
              strokeDasharray="8 5"
              opacity={stealthBaysIn * 0.8}
            />
          )}

          {/* ===================================================================== */}
          {/* 1. MẶT NGANG KỸ THUẬT 1:1 F-15EX EAGLE II + MẤU BỤNG GIA CƯỜNG        */}
          {/* ===================================================================== */}
          <g>
            {/* Thanh tiêu đề kỹ thuật đặt thoáng bên phải cánh đuôi đứng, hoàn toàn không bị che */}
            <g transform="translate(415 58)">
              <rect
                x={0}
                y={0}
                width={735}
                height={48}
                rx={8}
                fill={P.bgPanel}
                stroke={P.gridBright}
                strokeWidth={1.6}
              />
              <text
                x={367.5}
                y={31}
                textAnchor="middle"
                fill={P.text}
                fontFamily={FONT}
                fontWeight={700}
                fontSize={20}
                letterSpacing={1.8}
              >
                1:1 ORDNANCE CLEARANCE · USAF RECORD 29,500 LB (~15 TONS)
              </text>
            </g>

            {/* Thân máy bay F-15EX tỉ lệ 1:1 (scale = 2.5) */}
            <g filter="url(#sh)">
              <F15Side2D x={JET_X} y={JET_Y} scale={S} hypersonic={false} />
            </g>

            {/* CÁC KHOANG NHIÊN LIỆU BÊN TRONG THÂN & CÁNH (13,500 LB / 2,000 GAL) SÁNG LÊN TỪ 390.0s */}
            {fuelTankShow > 0.01 && (
              <g opacity={fuelTankShow}>
                {/* Viền phác thảo 4 bồn nhiên liệu giải phẫu trong thân & cánh */}
                {[
                  // Bồn số 1 sau buồng lái
                  `M${JET_X - 35},${JET_Y - 38} L${JET_X + 35},${JET_Y - 40} L${JET_X + 30},${JET_Y + 18} L${JET_X - 35},${JET_Y + 20} Z`,
                  // Bồn thân giữa trên cửa hút khí
                  `M${JET_X - 185},${JET_Y - 35} L${JET_X - 48},${JET_Y - 37} L${JET_X - 48},${JET_Y + 20} L${JET_X - 185},${JET_Y + 20} Z`,
                  // Bồn thân sau cạnh ống dẫn động cơ
                  `M${JET_X - 345},${JET_Y - 30} L${JET_X - 198},${JET_Y - 34} L${JET_X - 198},${JET_Y + 18} L${JET_X - 345},${JET_Y + 16} Z`,
                  // Bồn ướt trong cánh chính (wet wing tank)
                  `M${JET_X + 55},${JET_Y + 2} L${JET_X - 285},${JET_Y + 12} L${JET_X - 310},${JET_Y + 24} L${JET_X + 25},${JET_Y + 19} Z`,
                ].map((d, idx) => (
                  <g key={`tank_${idx}`}>
                    <path
                      d={d}
                      fill="rgba(10, 22, 40, 0.72)"
                      stroke={P.amber}
                      strokeWidth={2}
                      strokeDasharray="5 3"
                    />
                    <g clipPath="url(#s14_fuelClip)">
                      <path d={d} fill={P.amber} opacity={0.82} />
                      <path d={d} fill={P.amberHot} opacity={0.28} />
                    </g>
                  </g>
                ))}

                {/* Mực sóng xăng sáng ở mặt thoáng */}
                {fuelFillProg > 0.03 && fuelFillProg < 0.99 && (
                  <line
                    x1={JET_X - 345}
                    y1={lerp(JET_Y + 38, JET_Y - 42, fuelFillProg)}
                    x2={JET_X + 42}
                    y2={lerp(JET_Y + 38, JET_Y - 42, fuelFillProg)}
                    stroke={P.amberHot}
                    strokeWidth={3}
                  />
                )}

                {/* Thẻ ghi chú nhiên liệu đặt thoáng bên phải cánh đuôi đứng */}
                <g transform={`translate(${JET_X - 45} ${JET_Y - 102})`}>
                  <line x1={-40} y1={24} x2={-58} y2={66} stroke={P.amberHot} strokeWidth={2} />
                  <circle cx={-58} cy={66} r={4.5} fill={P.amberHot} />
                  <rect
                    x={-172}
                    y={-18}
                    width={344}
                    height={42}
                    rx={8}
                    fill={P.bgPanel}
                    stroke={P.amber}
                    strokeWidth={2}
                  />
                  <text
                    x={0}
                    y={9}
                    textAnchor="middle"
                    fill={P.amberHot}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={17}
                    letterSpacing={1.2}
                  >
                    INTERNAL FUEL: 13,500 LB (~2,000 GAL)
                  </text>
                </g>
              </g>
            )}

            {/* GIÁ TREO BỤNG TRUNG TÂM GIA CƯỜNG (REINFORCED CENTERLINE PYLON - STA 5) */}
            <g>
              <polygon
                points={`${WEP_CX - 110},${JET_Y + 33} ${WEP_CX + 108},${JET_Y + 33} ${WEP_CX + 82},${JET_Y + 55} ${WEP_CX - 84},${JET_Y + 55}`}
                fill={isLocked ? '#4b6c8e' : P.f15Dark}
                stroke={isLocked ? P.amberHot : P.ink}
                strokeWidth={2.2}
              />
              {/* Dàn gân chịu lực chữ X bên trong giá treo gia cường */}
              {[-64, -22, 20, 62].map((dx, i) => (
                <line
                  key={i}
                  x1={WEP_CX + dx - 14}
                  y1={JET_Y + 35}
                  x2={WEP_CX + dx + 14}
                  y2={JET_Y + 53}
                  stroke={isLocked ? P.amberHot : P.cyanSoft}
                  strokeWidth={1.6}
                  opacity={0.75}
                />
              ))}
              {/* Hai móc ngoàm khóa cơ khí (sway braces) */}
              {[-46, 46].map((dx, idx) => (
                <g key={idx} transform={`translate(${WEP_CX + dx} ${JET_Y + 55})`}>
                  <rect
                    x={-7}
                    y={-2}
                    width={14}
                    height={isLocked ? 15 : 9}
                    rx={2}
                    fill={isLocked ? P.amber : P.ordMid}
                    stroke={P.ink}
                    strokeWidth={1.5}
                  />
                  {lockThud > 0.02 && (
                    <circle cx={0} cy={12} r={16 + (1 - lockThud) * 20} fill="none" stroke={P.amberHot} strokeWidth={2.8} opacity={lockThud} />
                  )}
                </g>
              ))}
            </g>

            {/* QUẢ TÊN LỬA SIÊU VƯỢT ÂM NGOẠI CỠ 22 FT / 7.000 LB NÂNG LÊN & KHÓA KHÍT LÚC 373.00s */}
            {hoistAppear > 0.01 && (
              <g opacity={hoistAppear}>
                {/* Bệ kích thủy lực nạp đạn (hạ xuống sau khi khóa đạn lúc 373.6s) */}
                {cradleRetract < 0.99 && (
                  <g
                    opacity={1 - cradleRetract}
                    transform={`translate(${WEP_CX} ${wepY + 24 + cradleRetract * 55})`}
                  >
                    <rect x={-125} y={0} width={250} height={10} rx={3} fill="#364a63" stroke={P.ink} strokeWidth={1.8} />
                    <line x1={-75} y1={10} x2={-95} y2={48} stroke={P.amber} strokeWidth={5} />
                    <line x1={75} y1={10} x2={95} y2={48} stroke={P.amber} strokeWidth={5} />
                    <rect x={-130} y={46} width={260} height={8} rx={3} fill="#253549" />
                  </g>
                )}

                <g filter="url(#sh)">
                  <Weapon2D kind="hypersonic" x={WEP_CX} y={wepY} scale={S} />
                </g>

                {/* Nhãn xanh xác nhận khớp khóa dưới bụng F-15EX */}
                {isLocked && (
                  <g transform={`translate(${WEP_X1 + 22} ${wepY})`}>
                    <rect
                      x={0}
                      y={-18}
                      width={215}
                      height={36}
                      rx={7}
                      fill="rgba(16, 48, 44, 0.92)"
                      stroke={P.green}
                      strokeWidth={2}
                    />
                    <text
                      x={107}
                      y={6}
                      textAnchor="middle"
                      fill={P.green}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={15}
                      letterSpacing={1.2}
                    >
                      ✓ STA 5 LOCKED · 7,000 LB
                    </text>
                  </g>
                )}
              </g>
            )}

            {/* ĐƯỜNG GIÓNG KÍCH THƯỚC "22 FT (6.71 M)" NGAY DƯỚI QUẢ ĐẠN */}
            {dim22Prog > 0.01 && (
              <g opacity={dim22Prog}>
                <line
                  x1={WEP_X0}
                  y1={462}
                  x2={lerp(WEP_X0, WEP_X1, dim22Prog)}
                  y2={462}
                  stroke={P.amberHot}
                  strokeWidth={3.4}
                />
                <polygon points={`${WEP_X0},462 ${WEP_X0 + 14},454 ${WEP_X0 + 14},470`} fill={P.amberHot} />
                {dim22Prog > 0.92 && (
                  <polygon points={`${WEP_X1},462 ${WEP_X1 - 14},454 ${WEP_X1 - 14},470`} fill={P.amberHot} />
                )}
                <rect
                  x={(WEP_X0 + WEP_X1) / 2 - 145}
                  y={442}
                  width={290}
                  height={40}
                  rx={8}
                  fill={P.bgDeep}
                  stroke={P.amber}
                  strokeWidth={2.2}
                />
                <text
                  x={(WEP_X0 + WEP_X1) / 2}
                  y={468}
                  textAnchor="middle"
                  fill={P.amberHot}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={19}
                  letterSpacing={1.5}
                >
                  22 FT (6.71 M) · 7,000 LB
                </text>
              </g>
            )}
          </g>

          {/* ===================================================================== */}
          {/* 2. ĐỐI CHIẾU TRỰC TIẾP 1:1 VỚI HAI Ô KHOANG ĐẠN 12 FT F-22 & F-35     */}
          {/* ===================================================================== */}
          {stealthBaysIn > 0.01 && (
            <g opacity={stealthBaysIn}>
              {/* Hàng trên: Khoang bụng 12 ft của F-22A Raptor vs Tên lửa siêu vượt âm 22 ft */}
              <g transform="translate(0 582)">
                {/* Hình thu nhỏ nhận diện F-22A bên trái */}
                <F22Side2D x={295} y={12} scale={0.62} />
                <text
                  x={295}
                  y={58}
                  textAnchor="middle"
                  fill={P.muted}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={16}
                  letterSpacing={1.2}
                >
                  F-22A RAPTOR BAY
                </text>

                {/* Hộp khoang đạn 12 ft (rộng đúng 219.5 px = 12 ft ở scale 2.5!) */}
                <rect
                  x={WEP_X0}
                  y={-36}
                  width={BAY_12FT_W}
                  height={84}
                  rx={6}
                  fill="rgba(16, 32, 56, 0.92)"
                  stroke={showNoFit ? P.red : P.cyan}
                  strokeWidth={3}
                />
                {/* Vách chắn đầu khoang bị đạn 22 ft đâm xuyên qua */}
                <line
                  x1={BAY_12FT_X1}
                  y1={-44}
                  x2={BAY_12FT_X1}
                  y2={56}
                  stroke={P.red}
                  strokeWidth={4.5}
                />

                {/* Bóng mờ tỉ lệ 1:1 của tên lửa siêu vượt âm 22 ft tràn ra ngoài 10 ft */}
                <Weapon2D kind="hypersonic" x={WEP_CX} y={8} scale={S} opacity={0.48} />

                {/* Vùng đâm lố khỏi khoang tô cảnh báo đỏ */}
                {showNoFit && (
                  <rect
                    x={BAY_12FT_X1}
                    y={-28}
                    width={WEP_X1 - BAY_12FT_X1 + 10}
                    height={68}
                    rx={4}
                    fill={P.red}
                    opacity={0.18}
                    stroke={P.red}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                )}

                <text
                  x={WEP_X0 + BAY_12FT_W / 2}
                  y={-44}
                  textAnchor="middle"
                  fill={P.cyanSoft}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={15}
                >
                  12 FT INTERNAL BAY
                </text>

                {/* Gạch chéo đỏ khổng lồ đóng xuống lúc 384.86s */}
                {showNoFit && (
                  <g
                    transform={`translate(${WEP_X0 + BAY_12FT_W / 2} 6) scale(${Math.min(1.08, noFitSlam)})`}
                  >
                    <line x1={-105} y1={-36} x2={105} y2={36} stroke={P.red} strokeWidth={6} strokeLinecap="round" />
                    <line x1={-105} y1={36} x2={105} y2={-36} stroke={P.red} strokeWidth={6} strokeLinecap="round" />
                    <rect x={145} y={-20} width={225} height={40} rx={7} fill={P.redDark} stroke={P.red} strokeWidth={2.2} />
                    <text
                      x={257}
                      y={6}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={16}
                      letterSpacing={1.2}
                    >
                      ✕ +10 FT OVERFLOW
                    </text>
                  </g>
                )}
              </g>

              {/* Hàng dưới: Khoang bụng 12 ft của F-35A Lightning II vs Bom xuyên boong-ke GBU-28 */}
              <g transform="translate(0 742)">
                <F35Side2D x={295} y={10} scale={0.68} />
                <text
                  x={295}
                  y={58}
                  textAnchor="middle"
                  fill={P.muted}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={16}
                  letterSpacing={1.2}
                >
                  F-35A LIGHTNING II BAY
                </text>

                <rect
                  x={WEP_X0}
                  y={-36}
                  width={BAY_12FT_W}
                  height={84}
                  rx={6}
                  fill="rgba(16, 32, 56, 0.92)"
                  stroke={showNoFit ? P.red : P.cyan}
                  strokeWidth={3}
                />
                <line
                  x1={BAY_12FT_X1}
                  y1={-44}
                  x2={BAY_12FT_X1}
                  y2={56}
                  stroke={P.red}
                  strokeWidth={4.5}
                />

                {/* Bom xuyên boong-ke 5.000 lb dài 19 ft (139 * 2.5 = 347.5 px) cũng tràn xa khỏi khoang 12 ft */}
                <Weapon2D kind="bunkerbuster" x={WEP_X0 + 69 * S} y={8} scale={S} opacity={0.55} />

                {showNoFit && (
                  <rect
                    x={BAY_12FT_X1}
                    y={-28}
                    width={139 * S - BAY_12FT_W + 12}
                    height={68}
                    rx={4}
                    fill={P.red}
                    opacity={0.18}
                    stroke={P.red}
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                )}

                <text
                  x={WEP_X0 + BAY_12FT_W / 2}
                  y={-44}
                  textAnchor="middle"
                  fill={P.cyanSoft}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={15}
                >
                  12 FT INTERNAL BAY
                </text>

                {showNoFit && (
                  <g
                    transform={`translate(${WEP_X0 + BAY_12FT_W / 2} 6) scale(${Math.min(1.08, noFitSlam)})`}
                  >
                    <line x1={-105} y1={-36} x2={105} y2={36} stroke={P.red} strokeWidth={6} strokeLinecap="round" />
                    <line x1={-105} y1={36} x2={105} y2={-36} stroke={P.red} strokeWidth={6} strokeLinecap="round" />
                    <rect x={145} y={-20} width={225} height={40} rx={7} fill={P.redDark} stroke={P.red} strokeWidth={2.2} />
                    <text
                      x={257}
                      y={6}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={16}
                      letterSpacing={1.2}
                    >
                      ✕ BUNKER BUSTER NO FIT
                    </text>
                  </g>
                )}
              </g>
            </g>
          )}

          {/* ===================================================================== */}
          {/* 3. THANH CÂN TẢI TRỌNG CÔNG NGHIỆP KHỔNG LỒ BÊN PHẢI (81,000 LB MTOW) */}
          {/* ===================================================================== */}
          <g filter="url(#sh)">
            {/* Khung thép bảng cân công nghiệp */}
            <rect
              x={gaugeX - 48}
              y={62}
              width={gaugeW + 135}
              height={815}
              rx={16}
              fill={P.bgPanel}
              stroke={mtowLocked ? P.amberHot : P.gridBright}
              strokeWidth={mtowLocked ? 3.2 : 2}
              opacity={0.96}
            />

            {/* Đầu hiển thị số tổng cộng dồn MTOW */}
            <rect
              x={gaugeX - 24}
              y={80}
              width={gaugeW + 86}
              height={66}
              rx={10}
              fill={P.bgDeep}
              stroke={mtowLocked ? P.amber : P.grid}
              strokeWidth={2}
            />
            <text
              x={gaugeX + (gaugeW + 38) / 2}
              y={104}
              textAnchor="middle"
              fill={P.muted}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={13}
              letterSpacing={1.6}
            >
              MAXIMUM TAKEOFF WEIGHT (MTOW)
            </text>
            <text
              x={gaugeX + (gaugeW + 38) / 2}
              y={136}
              textAnchor="middle"
              fill={mtowLocked ? P.amberHot : P.text}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={30}
              letterSpacing={1.2}
            >
              {`${totalLb.toLocaleString('en-US')} LB`}
            </text>

            {/* Giếng thanh trụ cân */}
            <rect
              x={gaugeX}
              y={gaugeTop}
              width={gaugeW}
              height={gaugeH}
              rx={8}
              fill="#0a1526"
              stroke={P.grid}
              strokeWidth={2}
            />

            {/* Khối 1 (Đáy): Khung thân rỗng F-15EX (38,000 lb) */}
            <rect
              x={gaugeX + 4}
              y={gaugeBot - hDry}
              width={gaugeW - 8}
              height={hDry - 2}
              rx={5}
              fill={P.f15Dark}
              stroke={P.f15Mid}
              strokeWidth={1.6}
            />
            <text
              x={gaugeX + gaugeW / 2}
              y={gaugeBot - hDry / 2 - 6}
              textAnchor="middle"
              fill={P.text}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={17}
            >
              DRY AIRFRAME
            </text>
            <text
              x={gaugeX + gaugeW / 2}
              y={gaugeBot - hDry / 2 + 18}
              textAnchor="middle"
              fill={P.f15Light}
              fontFamily={FONT}
              fontWeight={700}
              fontSize={19}
            >
              38,000 LB
            </text>

            {/* Khối 2 (Giữa): Vũ khí kỷ lục 29,500 lb (~15 tấn) */}
            {hOrd > 3 && (
              <g>
                <rect
                  x={gaugeX + 4}
                  y={gaugeBot - hDry - hOrd}
                  width={gaugeW - 8}
                  height={hOrd - 2}
                  rx={5}
                  fill="#c94b24"
                  stroke={P.flame}
                  strokeWidth={1.8}
                />
                {hOrd > 75 && (
                  <>
                    <text
                      x={gaugeX + gaugeW / 2}
                      y={gaugeBot - hDry - hOrd / 2 - 8}
                      textAnchor="middle"
                      fill="#ffffff"
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={17}
                    >
                      ORDNANCE (~15 TONS)
                    </text>
                    <text
                      x={gaugeX + gaugeW / 2}
                      y={gaugeBot - hDry - hOrd / 2 + 17}
                      textAnchor="middle"
                      fill={P.amberHot}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={21}
                    >
                      {`+${ordLb.toLocaleString('en-US')} LB`}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Khối 3 (Đỉnh): Nhiên liệu trong thân 13,500 lb (2,000 gal) */}
            {hFuel > 2 && (
              <g>
                <rect
                  x={gaugeX + 4}
                  y={topY}
                  width={gaugeW - 8}
                  height={hFuel - 2}
                  rx={5}
                  fill={P.amber}
                  stroke={P.amberHot}
                  strokeWidth={2.2}
                />
                {hFuel > 52 && (
                  <>
                    <text
                      x={gaugeX + gaugeW / 2}
                      y={topY + hFuel / 2 - 6}
                      textAnchor="middle"
                      fill={P.ink}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={16}
                    >
                      INTERNAL FUEL
                    </text>
                    <text
                      x={gaugeX + gaugeW / 2}
                      y={topY + hFuel / 2 + 16}
                      textAnchor="middle"
                      fill={P.ink}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={19}
                    >
                      {`+${fuelLb.toLocaleString('en-US')} LB`}
                    </text>
                  </>
                )}
              </g>
            )}

            {/* Vạch chia tải trọng bên mép phải cột cân */}
            {[0, 20000, 40000, 60000, 81000].map((mark) => {
              const my = gaugeBot - lbToH(mark);
              const isMax = mark === 81000;
              return (
                <g key={mark}>
                  <line
                    x1={gaugeX + gaugeW}
                    y1={my}
                    x2={gaugeX + gaugeW + 16}
                    y2={my}
                    stroke={isMax ? P.amberHot : P.gridBright}
                    strokeWidth={isMax ? 3 : 1.8}
                  />
                  <text
                    x={gaugeX + gaugeW + 22}
                    y={my + 5}
                    fill={isMax ? P.amberHot : P.muted}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={isMax ? 16 : 14}
                  >
                    {mark === 0 ? '0' : `${Math.round(mark / 1000)}K`}
                  </text>
                </g>
              );
            })}

            {/* Con trỏ kim chỉ thị mức cân hiện tại */}
            <g transform={`translate(${gaugeX - 6} ${topY})`}>
              <polygon points="0,0 -18,-10 -18,10" fill={mtowLocked ? P.amberHot : P.cyan} />
              <line x1={6} y1={0} x2={gaugeW + 6} y2={0} stroke={P.amberHot} strokeWidth={3} />
            </g>

            {/* Chớp sáng viền đỉnh khi chạm mốc 81,000 LB */}
            {mtowPeakBump > 0.01 && (
              <rect
                x={gaugeX - 8}
                y={gaugeTop - 8}
                width={gaugeW + 16}
                height={34}
                rx={8}
                fill={P.amberHot}
                opacity={mtowPeakBump * 0.45}
              />
            )}
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* TỐI ĐA 1 <Label> TRÊN MÀN HÌNH, ĐẶT TUẦN TỰ */}
      <Label
        t={t}
        text="22 FT · 7,000 LB"
        x={710}
        y={964}
        from={CUE.s14_centerline22ft}
        until={380.2}
        size={54}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="81,000 LB MTOW"
        x={960}
        y={964}
        from={CUE.s14_mtow81k}
        until={400.1}
        size={56}
        bg={P.amber}
        fg={P.ink}
      />
    </div>
  );
};

export default S14;
