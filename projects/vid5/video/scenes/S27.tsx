import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { bump, lerp, prog, rnd } from '@kit/theme';
import { handheld, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D, Puff2D } from '@lib/2d/fx';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { F15Top2D, F35Top2D } from '../local/jets2d';

// Mảnh vỡ bê tông cốt thép văng tất định khi búa tạ giáng xuống lúc 766.20s
const CONCRETE_SHARDS = Array.from({ length: 18 }, (_, i) => {
  const ang = -Math.PI * (0.08 + 0.88 * rnd(i * 7 + 1));
  const spd = 240 + 360 * rnd(i * 7 + 2);
  const w = 14 + 24 * rnd(i * 7 + 3);
  const h = 10 + 18 * rnd(i * 7 + 4);
  const spin = (rnd(i * 7 + 5) - 0.5) * 760;
  const tone = i % 3 === 0 ? '#968c82' : i % 3 === 1 ? '#6e655d' : '#4a433d';
  return { ang, spd, w, h, spin, tone, hasRebar: i % 4 === 0 };
});

const S27: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Chuyển cảnh nội bộ từ Khung chia đôi Dao mổ/Búa tạ (y=540) đẩy thẳng vào Cánh cổng pháo đài phòng không (y=2200)
  const toGate = prog(t, 768.05, 768.68);
  const camX = 960;
  const camY = lerp(540, 2200, toGate);
  const zoomPush =
    toGate < 0.5
      ? lerp(1.0 + prog(t, 758.45, 768.0) * 0.05, 1.24, toGate * 2)
      : lerp(1.24, 1.0 + prog(t, 769.2, 771.6) * 0.08, (toGate - 0.5) * 2);

  // Rung chấn máy quay mạnh khi Búa tạ đập vỡ tường bê tông (766.20s) và rung nhẹ khi cổng pháo đài mở (769.3s)
  const hh = handheld(t, 2.0, 's27_cam');
  const hammerImpact = bump(t, CUE.s27_sledgehammer, 0.55);
  const gateRumble = bump(t, CUE.s27_unlockDoor + 0.35, 1.5) * 0.35;
  const shk = hammerImpact * 18 + gateRumble * 7;
  const shake: [number, number] = [
    hh[0] + Math.sin(t * 54) * shk,
    hh[1] + Math.cos(t * 61) * shk,
  ];

  // ---------- Nhịp 1: Tiến độ Dao mổ (763.60s) & Búa tạ (766.20s) ----------
  const f35Glide = prog(t, 758.45, 768.2);
  const scalpelCut = prog(t, CUE.s27_scalpel - 0.45, CUE.s27_scalpel + 0.65);

  const swingEase = Easing.bezier(0.55, 0.0, 0.95, 0.45);
  const hammerSwing = prog(t, CUE.s27_sledgehammer - 0.68, CUE.s27_sledgehammer, swingEase);
  const hammerRebound = bump(t, CUE.s27_sledgehammer, 0.36) * -7;
  const hammerAngle = lerp(-64, 12, hammerSwing) + hammerRebound;
  const wallShattered = t >= CUE.s27_sledgehammer;
  const dtHammer = Math.max(0, t - CUE.s27_sledgehammer);

  // ---------- Nhịp 2: Tiến độ F-35 luồn qua bóng tối mở khóa cổng phòng không (769.00s) ----------
  const unlockP = prog(t, CUE.s27_unlockDoor - 0.12, CUE.s27_unlockDoor + 0.42);
  const doorOpenP = prog(t, CUE.s27_unlockDoor + 0.28, 771.48, Easing.bezier(0.28, 0.0, 0.2, 1));
  const doorShift = doorOpenP * 635;

  // F-35 lướt lên dọc khe tối rồi lượn tách sang cánh trái khi cổng bình minh mở toang
  const f35GateAdvance = prog(t, 768.3, 771.55);
  const f35PeelLeft = prog(t, 769.65, 771.55);
  const f35GateX = 960 - f35PeelLeft * 255;
  const f35GateY = lerp(2620, 1790, f35GateAdvance);
  const f35GateRot = -90 - f35PeelLeft * 22;

  return (
    <AbsoluteFill style={{ background: '#050b16' }}>
      <Cam2D x={camX} y={camY} zoom={zoomPush} shake={shake} bg="#050b16">
        <Layer>
          <Defs2D shadow="rgba(3, 7, 16, 0.62)" />

          <defs>
            {/* Khung cắt chia đôi chéo sắc lẹm cho Nhịp 1 */}
            <clipPath id="s27_left_pane">
              <polygon points="-240,-180 1085,-180 835,1260 -240,1260" />
            </clipPath>
            <clipPath id="s27_right_pane">
              <polygon points="1085,-180 2160,-180 2160,1260 835,1260" />
            </clipPath>
            {/* Khung cắt cô lập tuyệt đối Nhịp 2 để tia nắng bình minh không tràn lên Nhịp 1 */}
            <clipPath id="s27_act2_clip">
              <rect x={-320} y={-220} width={2560} height={1520} />
            </clipPath>

            <linearGradient id="s27_indigo_bg" x1="0%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#050d1c" />
              <stop offset="55%" stopColor="#0b1d38" />
              <stop offset="100%" stopColor="#102b4e" />
            </linearGradient>

            <linearGradient id="s27_amber_bg" x1="10%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#180d06" />
              <stop offset="55%" stopColor="#2e180a" />
              <stop offset="100%" stopColor="#4a260e" />
            </linearGradient>

            {/* Bình minh vàng rực phía sau cánh cổng pháo đài ở Nhịp 2 */}
            <radialGradient id="s27_dawn_core" cx="50%" cy="54%" r="62%">
              <stop offset="0%" stopColor="#fff7cc" />
              <stop offset="24%" stopColor="#ffc45c" />
              <stop offset="55%" stopColor="#d96b38" />
              <stop offset="85%" stopColor="#4f3354" />
              <stop offset="100%" stopColor="#111f3d" />
            </radialGradient>
          </defs>

          {/* ==================================================================================== */}
          {/* NHỊP 1 (y: 0..1080): KHUNG TRANH CHIA ĐÔI CHÉO — DAO MỔ PHẪU THUẬT VS BÚA TẠ TITAN   */}
          {/* ==================================================================================== */}
          <g>
            {/* -------------------- NỬA TRÁI: F-35A STEALTH & DAO MỔ PHẪU THUẬT -------------------- */}
            <g clipPath="url(#s27_left_pane)">
              <rect x={-220} y={-160} width={1400} height={1400} fill="url(#s27_indigo_bg)" />

              {/* Lưới hình thoi tàng hình & vòng đo vi phẫu sắc lạnh */}
              <g opacity={0.22}>
                {Array.from({ length: 16 }, (_, i) => (
                  <line
                    key={`lg1_${i}`}
                    x1={-200 + i * 95}
                    y1={-120}
                    x2={-520 + i * 95}
                    y2={1200}
                    stroke={P.cyan}
                    strokeWidth={0.9}
                  />
                ))}
                {Array.from({ length: 14 }, (_, j) => (
                  <line
                    key={`lg2_${j}`}
                    x1={-150}
                    y1={-60 + j * 90}
                    x2={1100}
                    y2={-60 + j * 90}
                    stroke={P.gridBright}
                    strokeWidth={0.8}
                  />
                ))}
                <circle cx={470} cy={695} r={210} fill="none" stroke={P.cyan} strokeWidth={1.2} strokeDasharray="6 6" />
                <circle cx={470} cy={695} r={145} fill="none" stroke={P.cyan} strokeWidth={0.9} />
              </g>

              {/* Biên dạng F-35A Lightning II sắc lạnh lướt chéo lên trên */}
              <g
                transform={`translate(${lerp(415, 515, f35Glide)} ${lerp(365, 290, f35Glide)})`}
                filter="url(#sh)"
              >
                {/* Vệt sóng khí động mảnh chính xác sau cánh tàng hình */}
                <line x1={-210} y1={142} x2={-45} y2={28} stroke={P.cyan} strokeWidth={5} opacity={0.16} />
                <line x1={-210} y1={142} x2={-45} y2={28} stroke={P.cyanSoft} strokeWidth={1.6} opacity={0.65} />
                <F35Top2D x={0} y={0} rot={-35} scale={1.02} />
              </g>

              {/* Cấu trúc mô mạch sợi mục tiêu & Đường rạch phẫu thuật ánh Cyan tại 763.60s */}
              <g>
                {/* Mạng lưới mạch khóa mục tiêu tinh vi chưa bị chạm vào các vòng lân cận */}
                {[-36, -18, 18, 36].map((off, idx) => (
                  <line
                    key={idx}
                    x1={195 - off * 0.55}
                    y1={865 + off * 0.82}
                    x2={775 - off * 0.55}
                    y2={458 + off * 0.82}
                    stroke={P.gridBright}
                    strokeWidth={1.3}
                    strokeDasharray="10 6"
                    opacity={0.45}
                  />
                ))}

                {/* Nút khóa mục tiêu trung tâm bị lưỡi dao mổ cắt tách đôi chính xác tuyệt đối */}
                {(() => {
                  const split = prog(t, CUE.s27_scalpel, CUE.s27_scalpel + 0.55) * 14;
                  return (
                    <g transform="translate(495 655) rotate(-35)">
                      <path
                        d={`M -34,${-6 - split} L 34,${-6 - split} L 24,${-26 - split} L -24,${-26 - split} Z`}
                        fill="#1a2f4d"
                        stroke={scalpelCut > 0.45 ? P.cyan : P.red}
                        strokeWidth={2.2}
                      />
                      <path
                        d={`M -34,${6 + split} L 34,${6 + split} L 24,${26 + split} L -24,${26 + split} Z`}
                        fill="#1a2f4d"
                        stroke={scalpelCut > 0.45 ? P.cyan : P.red}
                        strokeWidth={2.2}
                      />
                    </g>
                  );
                })()}

                {/* Đường cắt laser phẫu thuật ánh Cyan (vẽ nét kép: hào quang mờ + lõi trắng-cyan, KHÔNG dùng filter glow) */}
                {scalpelCut > 0.01 && (
                  <g>
                    <path
                      d="M 185 872 L 790 448"
                      stroke={P.cyan}
                      strokeWidth={16}
                      strokeLinecap="round"
                      opacity={0.18}
                      fill="none"
                      {...drawOn(745, scalpelCut)}
                    />
                    <path
                      d="M 185 872 L 790 448"
                      stroke={P.cyan}
                      strokeWidth={5.5}
                      strokeLinecap="round"
                      opacity={0.48}
                      fill="none"
                      {...drawOn(745, scalpelCut)}
                    />
                    <path
                      d="M 185 872 L 790 448"
                      stroke="#e8fdff"
                      strokeWidth={2.3}
                      strokeLinecap="round"
                      fill="none"
                      {...drawOn(745, scalpelCut)}
                    />
                  </g>
                )}

                {/* Dao mổ phẫu thuật hợp kim Titan (Surgical Scalpel #11) song hành cùng F-35A */}
                {(() => {
                  const sx = lerp(225, 765, scalpelCut);
                  const sy = lerp(844, 465, scalpelCut);
                  return (
                    <g transform={`translate(${sx} ${sy}) rotate(-35)`} filter="url(#sh)">
                      {/* Cán dao mổ inox y tế đổ khối 3 tông + khía vân kim cương */}
                      <path
                        d="M -255,-11 L -68,-9 L -40,-5 L -40,5 L -68,9 L -255,11 Q -268,0 -255,-11 Z"
                        fill="#5d7794"
                        stroke={P.ink}
                        strokeWidth={2.2}
                      />
                      <path d="M -252,-9 L -68,-7 L -42,-4 L -42,0 L -252,0 Z" fill="#b7d2eb" opacity={0.82} />
                      <path d="M -252,3 L -68,3 L -42,2 L -42,5 L -68,9 L -252,10 Z" fill="#2d4259" opacity={0.82} />
                      {Array.from({ length: 11 }, (_, k) => (
                        <line
                          key={k}
                          x1={-224 + k * 12}
                          y1={-8}
                          x2={-218 + k * 12}
                          y2={8}
                          stroke={P.ink}
                          strokeWidth={1.5}
                          opacity={0.55}
                        />
                      ))}

                      {/* Lưỡi dao mổ phẫu thuật số 11 vát tam giác sắc lẹm lấp lánh ánh Cyan */}
                      <polygon
                        points="-42,-5 -4,-6 54,6 -16,9 -42,4"
                        fill="#e4f3ff"
                        stroke={P.ink}
                        strokeWidth={2}
                        strokeLinejoin="round"
                      />
                      <polygon points="-40,-4 -4,-5 48,5 -40,0" fill="#ffffff" opacity={0.85} />
                      <line x1={-16} y1={8.5} x2={53} y2={6} stroke={P.cyan} strokeWidth={2.6} />

                      {/* Điểm chớp sáng vi phẫu tại mũi dao */}
                      {scalpelCut > 0.02 && scalpelCut < 0.99 && (
                        <g transform="translate(53 6)">
                          <circle cx={0} cy={0} r={18} fill={P.cyan} opacity={0.28} />
                          <circle cx={0} cy={0} r={5.5} fill="#ffffff" />
                          <line x1={-22} y1={0} x2={22} y2={0} stroke="#ffffff" strokeWidth={1.8} />
                          <line x1={0} y1={-16} x2={0} y2={16} stroke={P.cyan} strokeWidth={1.8} />
                        </g>
                      )}
                    </g>
                  );
                })()}
              </g>
            </g>

            {/* -------------------- NỬA PHẢI: F-15EX EAGLE II & BÚA TẠ ĐẬP TƯỜNG BÊ TÔNG -------------------- */}
            <g clipPath="url(#s27_right_pane)">
              <rect x={780} y={-160} width={1400} height={1400} fill="url(#s27_amber_bg)" />

              {/* Họa tiết gân thép chịu lực nặng nền hổ phách */}
              <g opacity={0.2}>
                {Array.from({ length: 14 }, (_, i) => (
                  <line
                    key={`rg_${i}`}
                    x1={820 + i * 95}
                    y1={-120}
                    x2={1140 + i * 95}
                    y2={1200}
                    stroke={P.amber}
                    strokeWidth={1.2}
                  />
                ))}
              </g>

              {/* Tiêm kích hạng nặng F-15EX mang đầy đủ 12 tên lửa + đầu cánh, gầm rú lướt lên */}
              <g
                transform={`translate(${lerp(1395, 1485, f35Glide)} ${lerp(355, 275, f35Glide)})`}
                filter="url(#sh)"
              >
                <g transform="rotate(-35)">
                  {/* Luồng lửa buồng đốt hậu đôi rực cháy phía sau 2 loa phụt F110 */}
                  <polygon points="-233,-21 -375,-14 -233,-7" fill={P.flame} opacity={0.82} />
                  <polygon points="-233,-18 -315,-14 -233,-10" fill={P.amberHot} />
                  <polygon points="-233,8 -375,15 -233,22" fill={P.flame} opacity={0.82} />
                  <polygon points="-233,11 -315,15 -233,19" fill={P.amberHot} />
                </g>
                <F15Top2D x={0} y={0} rot={-35} scale={0.95} fullLoad wingTipMissiles />
              </g>

              {/* Bức tường bê tông cốt thép kiên cố (bị búa tạ đập nứt toác lúc 766.20s) */}
              <g transform="translate(1455 835)">
                {!wallShattered ? (
                  /* Khối tường bê tông cốt thép nguyên vẹn trước cú giáng */
                  <g filter="url(#sh)">
                    <rect
                      x={-290}
                      y={-110}
                      width={580}
                      height={196}
                      rx={6}
                      fill="#5f5852"
                      stroke={P.ink}
                      strokeWidth={3}
                    />
                    <rect x={-286} y={-106} width={572} height={24} fill="#8a8178" />
                    <rect x={-286} y={56} width={572} height={26} fill="#3d3834" />
                    {/* Đường mạch ghép tấm bê tông đúc sẵn & lỗ ty giằng cốp-pha */}
                    {[-145, 0, 145].map((wx, k) => (
                      <line key={k} x1={wx} y1={-108} x2={wx} y2={84} stroke="#36312d" strokeWidth={2.4} />
                    ))}
                    <line x1={-288} y1={-12} x2={288} y2={-12} stroke="#36312d" strokeWidth={2.2} />
                    {[-215, -72, 72, 215].map((bx, b) => (
                      <g key={b}>
                        <circle cx={bx} cy={-60} r={5} fill="#332e2a" stroke={P.ink} strokeWidth={1.2} />
                        <circle cx={bx} cy={36} r={5} fill="#332e2a" stroke={P.ink} strokeWidth={1.2} />
                      </g>
                    ))}
                  </g>
                ) : (
                  /* Bức tường bê tông bị giáng nứt toác chữ V lộ thanh sắt cốt thép uốn cong + khe nứt rực lửa */
                  <g filter="url(#sh)">
                    {/* Nửa tường trái trượt nghiêng tức khắc ngay khoảnh khắc búa chạm */}
                    <g transform={`translate(${-Math.min(34, 12 + dtHammer * 65)} ${Math.min(14, 4 + dtHammer * 24)}) rotate(${-Math.min(8, 2.8 + dtHammer * 16)})`}>
                      <polygon
                        points="-295,-110 -42,-110 -12,-52 -54,4 -18,86 -295,86"
                        fill="#5c554f"
                        stroke={P.ink}
                        strokeWidth={3}
                      />
                      <polygon points="-291,-106 -44,-106 -34,-84 -291,-84" fill="#877e75" />
                      <path
                        d="M -42,-78 L -128,-46 L -195,-62 M -48,12 L -146,38 L -220,26"
                        fill="none"
                        stroke={P.amberHot}
                        strokeWidth={2.8}
                      />
                      <path
                        d="M -42,-78 L -128,-46 L -195,-62 M -48,12 L -146,38 L -220,26"
                        fill="none"
                        stroke={P.ink}
                        strokeWidth={1.4}
                      />
                    </g>

                    {/* Nửa tường phải toác rộng */}
                    <g transform={`translate(${Math.min(36, 13 + dtHammer * 68)} ${Math.min(15, 5 + dtHammer * 26)}) rotate(${Math.min(8.5, 3 + dtHammer * 17)})`}>
                      <polygon
                        points="38,-110 295,-110 295,86 24,86 48,14 14,-48"
                        fill="#544d48"
                        stroke={P.ink}
                        strokeWidth={3}
                      />
                      <polygon points="40,-106 291,-106 291,-84 28,-84" fill="#827970" />
                      <path
                        d="M 22,-64 L 118,-34 L 204,-52 M 44,18 L 152,44 L 232,32"
                        fill="none"
                        stroke={P.amberHot}
                        strokeWidth={2.8}
                      />
                    </g>

                    {/* Vòng sóng xung kích hổ phách lan nhanh từ mặt va chạm */}
                    {dtHammer < 0.45 && (
                      <circle
                        cx={0}
                        cy={-96}
                        r={48 + dtHammer * 420}
                        fill="none"
                        stroke={P.amberHot}
                        strokeWidth={6 * (1 - dtHammer / 0.45)}
                        opacity={0.85 * (1 - dtHammer / 0.45)}
                      />
                    )}

                    {/* Thanh sắt cốt thép (rebar) lộ ra bị bẻ cong giữa hố vỡ */}
                    <path d="M -68,-72 Q 0,-34 62,-68" fill="none" stroke="#2a2623" strokeWidth={6} strokeLinecap="round" />
                    <path d="M -56,18 Q 4,48 66,20" fill="none" stroke="#2a2623" strokeWidth={6} strokeLinecap="round" />
                    <path d="M -68,-72 Q 0,-34 62,-68" fill="none" stroke={P.amber} strokeWidth={2} strokeDasharray="5 5" />

                    {/* Mảnh bê tông & sắt vụn văng tung tóe theo quỹ đạo đạn đạo */}
                    {dtHammer < 2.4 &&
                      CONCRETE_SHARDS.map((sh, i) => {
                        const sx = Math.cos(sh.ang) * sh.spd * dtHammer;
                        const sy = -95 + Math.sin(sh.ang) * sh.spd * dtHammer + 520 * dtHammer * dtHammer;
                        const rot = sh.spin * dtHammer + i * 28;
                        return (
                          <g key={i} transform={`translate(${sx} ${sy}) rotate(${rot})`}>
                            {sh.hasRebar && (
                              <line x1={-sh.w} y1={0} x2={sh.w * 1.1} y2={4} stroke="#2c2825" strokeWidth={3.5} />
                            )}
                            <polygon
                              points={`${-sh.w * 0.5},${-sh.h * 0.5} ${sh.w * 0.55},${-sh.h * 0.35} ${sh.w * 0.4},${sh.h * 0.55} ${-sh.w * 0.48},${sh.h * 0.42}`}
                              fill={sh.tone}
                              stroke={P.ink}
                              strokeWidth={1.8}
                            />
                          </g>
                        );
                      })}
                  </g>
                )}
              </g>

              {/* Đầu Búa Tạ Titan Khổng Lồ (Titanium Sledgehammer) vung giáng xuống tường bê tông */}
              <g transform={`translate(1795 660) rotate(${hammerAngle})`} filter="url(#sh)">
                {/* Cán búa sợi carbon-titan bọc đai chịu lực */}
                <rect x={-340} y={-15} width={355} height={30} rx={8} fill="#2c333d" stroke={P.ink} strokeWidth={2.6} />
                <rect x={-336} y={-11} width={346} height={9} rx={4} fill="#596678" />
                {[-120, -65, -10].map((gx, k) => (
                  <rect key={k} x={gx} y={-16} width={16} height={32} rx={3} fill={P.amber} stroke={P.ink} strokeWidth={1.8} />
                ))}

                {/* Đầu búa tạ bát giác Titan hạng nặng (3 tông khối kim loại rèn) */}
                <g transform="translate(-335 0)">
                  <polygon
                    points="-74,-96 58,-96 76,-76 76,76 58,96 -74,96 -92,76 -92,-76"
                    fill="#6e86a0"
                    stroke={P.ink}
                    strokeWidth={3.2}
                    strokeLinejoin="round"
                  />
                  {/* Mặt trên sáng kim loại */}
                  <polygon points="-72,-92 56,-92 72,-74 72,-28 -88,-28 -88,-74" fill="#bfd5ea" opacity={0.82} />
                  {/* Mặt dưới tối đầm */}
                  <polygon points="-88,28 72,28 72,74 56,92 -72,92 -88,74" fill="#35485e" opacity={0.85} />
                  {/* Mặt búa giáng va chạm dưới đáy (striking face) */}
                  <rect x={-64} y={94} width={116} height={18} rx={4} fill={P.amber} stroke={P.ink} strokeWidth={2.4} />
                  {/* Gân chữ X gia cường trên má búa tạ */}
                  <rect x={-52} y={-44} width={92} height={88} rx={8} fill="#465d78" stroke={P.ink} strokeWidth={2.2} />
                  <line x1={-36} y1={-28} x2={24} y2={28} stroke={P.amberHot} strokeWidth={3} opacity={0.75} />
                  <line x1={24} y1={-28} x2={-36} y2={28} stroke={P.amberHot} strokeWidth={3} opacity={0.75} />
                </g>
              </g>

              {/* Chớp nổ xung kích & khói bụi khi búa tạ đập nát tường bê tông đúng 766.20s */}
              <Blast2D
                t={t}
                at={CUE.s27_sledgehammer}
                x={1455}
                y={735}
                size={84}
                seed={271}
                life={2.8}
                air
                smoke="#7a6855"
              />
            </g>

            {/* Thanh gờ kim loại phân giới chéo sắc lẹm giữa thế giới Dao Mổ (trái) và Búa Tạ (phải) */}
            <line x1={1085} y1={-180} x2={835} y2={1260} stroke={P.ink} strokeWidth={14} />
            <line x1={1082} y1={-180} x2={832} y2={1260} stroke={P.cyan} strokeWidth={3} opacity={0.85} />
            <line x1={1088} y1={-180} x2={838} y2={1260} stroke={P.amber} strokeWidth={3} opacity={0.85} />
          </g>

          {/* ==================================================================================== */}
          {/* NHỊP 2 (tâm y=2200): F-35A LUỒN QUA BÓNG TỐI MỞ KHÓA CÁNH CỔNG PHÁO ĐÀI BÌNH MINH   */}
          {/* ==================================================================================== */}
          <g transform="translate(0 1660)" clipPath="url(#s27_act2_clip)">
            {/* Lớp nền sâu phía sau cánh cổng: Vầng mặt trời bình minh vàng cam rực rỡ */}
            <rect x={-260} y={-240} width={2440} height={1560} fill="url(#s27_dawn_core)" />

            {/* Các luồng hào quang mặt trời bình minh bung tỏa khi hai cánh cổng mở toang */}
            <g transform="translate(960 580)" opacity={0.28 + 0.65 * doorOpenP}>
              {Array.from({ length: 18 }, (_, r) => {
                const a0 = (r / 18) * Math.PI * 2 + t * 0.04;
                const a1 = a0 + 0.095;
                const R = 1350;
                return (
                  <polygon
                    key={r}
                    points={`0,0 ${Math.cos(a0) * R},${Math.sin(a0) * R} ${Math.cos(a1) * R},${Math.sin(a1) * R}`}
                    fill="#fff3b8"
                    opacity={r % 2 === 0 ? 0.24 : 0.11}
                  />
                );
              })}
              <circle cx={0} cy={40} r={145 + doorOpenP * 55} fill="#fff7d1" opacity={0.88} />
              <circle cx={0} cy={40} r={240 + doorOpenP * 90} fill={P.amber} opacity={0.34} />
            </g>

            {/* Dãy núi chân trời sẫm phía dưới hành lang bình minh */}
            <polygon
              points="-200,1180 -200,910 140,830 420,885 710,815 960,865 1230,805 1540,875 1820,820 2140,900 2140,1180"
              fill="#1b1829"
              opacity={0.75}
            />

            {/* -------------------- CÁNH CỔNG PHÁO ĐÀI PHÒNG KHÔNG BÊN TRÁI -------------------- */}
            <g transform={`translate(${-doorShift} 0)`} filter="url(#sh)">
              <polygon
                points="-280,-240 962,-240 962,180 912,230 962,280 962,430 894,540 962,650 962,810 912,860 962,910 962,1320 -280,1320"
                fill="#0a1322"
                stroke={P.ink}
                strokeWidth={4}
              />
              {/* Các tấm sườn thép pháo đài & đinh tán bọc giáp */}
              {[60, 290, 520, 750, 980].map((ry, k) => (
                <rect
                  key={k}
                  x={-180}
                  y={ry}
                  width={1060}
                  height={46}
                  rx={4}
                  fill="#122138"
                  stroke="#1f3759"
                  strokeWidth={2}
                />
              ))}
              <rect x={760} y={-200} width={132} height={1480} fill="#14243d" stroke={P.ink} strokeWidth={2.5} />

              {/* Các vòng cung sóng radar phòng không đỏ canh gác trong bóng tối */}
              {[190, 310, 440, 580].map((rad, k) => (
                <path
                  key={k}
                  d={`M 950 ${540 - rad} A ${rad} ${rad} 0 0 0 950 ${540 + rad}`}
                  fill="none"
                  stroke={unlockP > 0.6 ? P.cyan : P.red}
                  strokeWidth={2.2}
                  strokeDasharray="16 12"
                  opacity={lerp(0.62, 0.18, doorOpenP)}
                />
              ))}
            </g>

            {/* -------------------- CÁNH CỔNG PHÁO ĐÀI PHÒNG KHÔNG BÊN PHẢI -------------------- */}
            <g transform={`translate(${doorShift} 0)`} filter="url(#sh)">
              <polygon
                points="2200,-240 958,-240 958,180 908,230 958,280 958,430 890,540 958,650 958,810 908,860 958,910 958,1320 2200,1320"
                fill="#0a1322"
                stroke={P.ink}
                strokeWidth={4}
              />
              {[60, 290, 520, 750, 980].map((ry, k) => (
                <rect
                  key={k}
                  x={1040}
                  y={ry}
                  width={1060}
                  height={46}
                  rx={4}
                  fill="#122138"
                  stroke="#1f3759"
                  strokeWidth={2}
                />
              ))}
              <rect x={1028} y={-200} width={132} height={1480} fill="#14243d" stroke={P.ink} strokeWidth={2.5} />

              {[190, 310, 440, 580].map((rad, k) => (
                <path
                  key={k}
                  d={`M 970 ${540 - rad} A ${rad} ${rad} 0 0 1 970 ${540 + rad}`}
                  fill="none"
                  stroke={unlockP > 0.6 ? P.cyan : P.red}
                  strokeWidth={2.2}
                  strokeDasharray="16 12"
                  opacity={lerp(0.62, 0.18, doorOpenP)}
                />
              ))}
            </g>

            {/* -------------------- Ổ CHỐT KHÓA TRUNG TÂM XOAY MỞ TẠI 769.00s -------------------- */}
            {doorOpenP < 0.85 && (
              <g
                transform={`translate(${960 - doorShift} 540)`}
                opacity={1 - prog(t, CUE.s27_unlockDoor + 0.55, CUE.s27_unlockDoor + 1.25)}
              >
                {/* Vành khóa ngoài xoay ngược chiều 68 độ khi nhận tia Cyan từ F-35A */}
                <g transform={`rotate(${-unlockP * 68})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={118}
                    fill="#0d1a2e"
                    stroke={unlockP > 0.5 ? P.cyan : P.red}
                    strokeWidth={5}
                  />
                  {Array.from({ length: 12 }, (_, k) => (
                    <rect
                      key={k}
                      x={-9}
                      y={-116}
                      width={18}
                      height={22}
                      rx={3}
                      fill={unlockP > 0.5 ? P.cyan : P.red}
                      transform={`rotate(${k * 30})`}
                    />
                  ))}
                </g>

                {/* Vành khóa giữa xoay xuôi chiều 54 độ */}
                <g transform={`rotate(${unlockP * 54})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={78}
                    fill="#091322"
                    stroke={unlockP > 0.5 ? P.green : P.red}
                    strokeWidth={3.5}
                    strokeDasharray="24 12"
                  />
                </g>

                {/* Chốt lõi trung tâm tách mở */}
                <g transform={`rotate(${-unlockP * 90})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={42}
                    fill={unlockP > 0.5 ? '#0b2e36' : '#2b0b12'}
                    stroke={unlockP > 0.5 ? P.cyanSoft : P.red}
                    strokeWidth={3.5}
                  />
                  <rect
                    x={-26}
                    y={-7}
                    width={52}
                    height={14}
                    rx={4}
                    fill={unlockP > 0.5 ? P.cyan : P.red}
                  />
                </g>

                {/* Vòng sóng xung kích Cyan bung ra khi chốt khóa bật mở */}
                {unlockP > 0.05 && unlockP < 0.99 && (
                  <circle
                    cx={0}
                    cy={0}
                    r={45 + unlockP * 195}
                    fill="none"
                    stroke={P.cyan}
                    strokeWidth={6 * (1 - unlockP)}
                    opacity={1 - unlockP}
                  />
                )}
              </g>
            )}

            {/* Hơi sương áp suất bật ra dọc khe cửa khi pháo đài mở toang */}
            {doorOpenP > 0.02 && doorOpenP < 0.75 && (
              <g>
                <Puff2D x={960 - doorShift} y={360} r={44 + doorOpenP * 50} color="#ffe3a8" opacity={0.45 * (1 - doorOpenP)} seed={273} />
                <Puff2D x={960 + doorShift} y={720} r={44 + doorOpenP * 50} color="#ffe3a8" opacity={0.45 * (1 - doorOpenP)} seed={274} />
              </g>
            )}
          </g>

          {/* Mũi kim cương tàng hình F-35A lướt xuyên qua bóng tối bắn tia Cyan xoay mở khóa cổng */}
          {toGate > 0.15 && (
            <g opacity={prog(t, 768.2, 768.55)}>
              {/* Chùm tia Cyan bắn từ mũi F-35A khóa và xoay mở chốt trung tâm lúc 769.00s */}
              {t >= 768.62 && t <= CUE.s27_unlockDoor + 0.56 && (
                <g opacity={prog(t, 768.62, 768.72)}>
                  <line
                    x1={f35GateX}
                    y1={f35GateY - 135}
                    x2={960}
                    y2={2200}
                    stroke={P.cyan}
                    strokeWidth={18}
                    strokeLinecap="round"
                    opacity={0.26}
                  />
                  <line
                    x1={f35GateX}
                    y1={f35GateY - 135}
                    x2={960}
                    y2={2200}
                    stroke="#ffffff"
                    strokeWidth={3.2}
                    strokeLinecap="round"
                  />
                  <circle cx={960} cy={2200} r={11} fill={P.cyan} opacity={0.75} />
                </g>
              )}

              <g transform={`translate(${f35GateX} ${f35GateY})`} filter="url(#sh)">
                <F35Top2D x={0} y={0} rot={f35GateRot} scale={0.82} />
              </g>
            </g>
          )}
        </Layer>
      </Cam2D>

      <Grain opacity={0.34} />
    </AbsoluteFill>
  );
};

export default S27;
