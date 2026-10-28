// Cảnh S06 (45.20 - 56.14s, Thuần 2D):
// Mặt cắt dọc X-quang thẳng đứng từ đầu đạn nổ lõm HEAT trên nóc tháp pháo trượt thẳng xuống hầm đạn đáy xe:
// Chạm nóc (45.86s) -> Kích hoạt thuốc nổ (47.18s) -> Sóng nổ ép phễu đồng chữ V ngược (48.76s)
// -> Phóng luồng đồng siêu tốc (50.30s) 8 km/s (52.10s) -> Xuyên thủng thép nóc mỏng & văng mảnh spall (53.48s)
// -> Kích nổ dây chuyền hầm đạn pháo 120mm bên dưới (54.86s).
import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { bump, lerp, mix, prog, rnd } from '@kit/theme';
import { Label, handheld, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D, Puff2D } from '@lib/2d/fx';
import { CUE } from '../cues';
import { P2D } from '../local/palette';

const CX = 960;
const ROOF_TOP = 790;
const ROOF_THICK = 28;
const ROOF_BOT = ROOF_TOP + ROOF_THICK;

// Danh sách mảnh văng thép nóng đỏ (spall fragments) toả hình nón khi luồng đồng đục thủng giáp nóc mỏng
const SPALL_ITEMS = Array.from({ length: 30 }, (_, i) => {
  const spread = (rnd(i * 3.1 + 7) - 0.5) * 1.46;
  const speed = 360 + rnd(i * 5.7 + 13) * 500;
  const size = 5.5 + rnd(i * 7.3 + 19) * 10.5;
  const delay = rnd(i * 2.3 + 31) * 0.12;
  const spin = (rnd(i * 9.1 + 41) - 0.5) * 520;
  return { spread, speed, size, delay, spin };
});

// 9 quả đạn pháo 120mm xếp thẳng đứng trong khay/vòng nạp đạn trung tâm dưới sàn giỏ tháp pháo
const SHELL_XS = [-256, -192, -128, -64, 0, 64, 128, 192, 256];

// Mảnh vỏ đầu đạn vỡ văng sang hai bên khi khối thuốc nổ kích hoạt
const CASING_SHARDS = Array.from({ length: 14 }, (_, i) => {
  const side = i % 2 === 0 ? -1 : 1;
  const y0 = 335 + Math.floor(i / 2) * 36;
  const vx = side * (125 + rnd(i * 4.7 + 5) * 175);
  const vy = -50 + rnd(i * 6.1 + 11) * 130;
  const rot = side * (140 + rnd(i * 8.3 + 23) * 240);
  return { side, y0, vx, vy, rot };
});

const S06: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== 1. TIẾN ĐỘ VẬT LÝ THEO CUE ====================
  // Pha tiếp xúc mũi ngòi nổ khoảng cách vào mặt giáp nóc (45.20 -> 45.86s)
  const approachP = prog(t, 45.0, CUE.s06_roof_contact, Easing.out(Easing.cubic));
  const warheadDy = -96 * (1 - approachP);
  const contactSpark = bump(t, CUE.s06_roof_contact, 0.38);
  const wirePulseP = prog(t, CUE.s06_roof_contact, CUE.s06_shaped_detonate - 0.04, (x) => x);

  // Pha kích nổ khối thuốc nổ mạnh từ kíp nổ đáy trên (47.18s)
  const detActive = t >= CUE.s06_shaped_detonate;
  const detWaveP = prog(t, CUE.s06_shaped_detonate, 49.35, Easing.out(Easing.quad));
  const detFlash = bump(t, CUE.s06_shaped_detonate, 0.48);
  const caseBurstT = Math.max(0, t - (CUE.s06_shaped_detonate + 0.12));
  const caseExpand = prog(t, CUE.s06_shaped_detonate + 0.08, 49.5, Easing.out(Easing.cubic));

  // Pha sóng nổ ép sập hai cánh phễu đồng chữ V ngược (48.76s)
  const collapseP = prog(t, CUE.s06_copper_collapse - 0.14, 50.65, Easing.inOut(Easing.cubic));
  const squeezeGlow = bump(t, CUE.s06_copper_collapse, 2.15);

  // Điểm hội tụ áp suất trục giữa phễu đồng (stagnation point) trượt dọc trục khi phễu khép lại
  const yApexOrig = 396;
  const yRimOrig = 584;
  const yStag = lerp(yApexOrig + 6, 556, collapseP);
  const rimHalfW = lerp(118, 22, Math.pow(collapseP, 0.86));
  const rimY = lerp(yRimOrig, 598, collapseP);

  // Pha hình thành & phóng luồng kim loại đồng siêu tốc 8 km/s (50.30s -> 54.86s)
  const jetActive = t >= CUE.s06_jet_form;
  const jetToRoofP = prog(t, CUE.s06_jet_form, 52.88, Easing.inOut(Easing.quad));
  const jetThroughRoofP = prog(t, 52.88, CUE.s06_pierce_roof, (x) => x);
  const jetToAmmoP = prog(t, CUE.s06_pierce_roof, CUE.s06_ammo_cookoff, Easing.in(Easing.quad));

  let jetTipY = yStag;
  if (jetActive) {
    if (t < 52.88) {
      jetTipY = lerp(yStag + 4, ROOF_TOP + 2, jetToRoofP);
    } else if (t < CUE.s06_pierce_roof) {
      jetTipY = lerp(ROOF_TOP + 2, ROOF_BOT + 18, jetThroughRoofP);
    } else {
      jetTipY = lerp(ROOF_BOT + 18, 1295, jetToAmmoP);
    }
  }
  const jetTailY = lerp(yStag, 745, prog(t, 52.3, 55.1));
  const jetFadeAfterCookoff = 1 - prog(t, CUE.s06_ammo_cookoff + 0.15, CUE.s06_ammo_cookoff + 0.75);

  // Pha đục thủng tấm thép nóc mỏng (53.48s)
  const breachP = prog(t, 52.9, CUE.s06_pierce_roof + 0.06, Easing.out(Easing.quad));
  const spallDt = Math.max(0, t - (CUE.s06_pierce_roof - 0.06));
  const roofImpactFlash = bump(t, CUE.s06_pierce_roof - 0.1, 0.58);

  // Pha kích nổ dây chuyền hầm đạn pháo 120mm (54.86s)
  const cookoffActive = t >= CUE.s06_ammo_cookoff;
  const cookDt = Math.max(0, t - CUE.s06_ammo_cookoff);
  const cookSurgeP = prog(t, CUE.s06_ammo_cookoff, 55.85, Easing.out(Easing.cubic));

  // ==================== 2. BIÊN ĐẠO CAMERA 2D & RUNG LẮC ====================
  // 45.2 -> 51.25s: Cận cảnh mặt cắt đầu đạn HEAT & tấm thép nóc mỏng
  // 51.25 -> 53.65s: Trượt xuống theo luồng đồng 8 km/s xuyên giáp nóc đồng thời hé lộ trọn khay đạn pháo 120mm bên dưới!
  // 53.65 -> 54.80s: Đóng khung toàn cảnh khoang chiến đấu & hầm đạn pháo 120mm trước cú nổ dây chuyền
  const panToRoof = prog(t, 51.25, 53.65, Easing.inOut(Easing.cubic));
  const panToAmmo = prog(t, 53.65, 54.8, Easing.inOut(Easing.cubic));

  const camY1 = lerp(545, 965, panToRoof);
  const camY = lerp(camY1, 1115, panToAmmo);

  const zoom1 = lerp(1.22, 0.96, panToRoof);
  const camZoom = lerp(zoom1, 0.93, panToAmmo);

  const shakeAmp =
    1.2 +
    5.5 * bump(t, CUE.s06_roof_contact, 0.28) +
    8.5 * bump(t, CUE.s06_shaped_detonate, 0.48) +
    11.0 * bump(t, CUE.s06_pierce_roof, 0.45) +
    (cookoffActive ? 26 * Math.exp(-cookDt * 1.15) + 6.5 : 0);
  const shake = handheld(t * (cookoffActive ? 3.4 : 1.5), shakeAmp, 's06-xray');

  // Mặt sóng nổ cầu lan từ kíp nổ (y = 318) xuống hết khối thuốc nổ (y = 592)
  const waveY = lerp(318, 592, detWaveP);

  return (
    <AbsoluteFill style={{ background: P2D.slateDeep }}>
      <Cam2D x={CX} y={camY} zoom={camZoom} shake={shake} bg={P2D.slateDeep}>
        <svg width={2400} height={2100} style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(4, 8, 15, 0.65)" />
          <defs>
            {/* Nền xưởng X-quang tối sâu tôn độ chói luồng kim loại nóng chảy */}
            <radialGradient id="s06BgGrad" cx="50%" cy="45%" r="60%">
              <stop offset="0%" stopColor="#162436" />
              <stop offset="58%" stopColor={P2D.slateBg} />
              <stop offset="100%" stopColor={P2D.slateDeep} />
            </radialGradient>

            {/* Vật liệu đồng kim loại 3 tông cho 2 cánh phễu nổ lõm */}
            <linearGradient id="s06CopperL" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor={P2D.copperDark} />
              <stop offset="48%" stopColor={P2D.copper} />
              <stop offset="100%" stopColor={P2D.copperHi} />
            </linearGradient>
            <linearGradient id="s06CopperR" x1="100%" y1="0%" x2="0%" y2="80%">
              <stop offset="0%" stopColor={P2D.copperDark} />
              <stop offset="48%" stopColor={P2D.copper} />
              <stop offset="100%" stopColor={P2D.copperHi} />
            </linearGradient>

            {/* Khối thuốc nổ mạnh Octol/PBX */}
            <linearGradient id="s06Explosive" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={P2D.explosiveDark} />
              <stop offset="25%" stopColor={P2D.explosive} />
              <stop offset="50%" stopColor="#f5d56e" />
              <stop offset="75%" stopColor={P2D.explosive} />
              <stop offset="100%" stopColor={P2D.explosiveDark} />
            </linearGradient>

            {/* Khí nổ áp suất cao sau mặt sóng kích nổ */}
            <radialGradient id="s06DetGas" cx="50%" cy="25%" r="75%">
              <stop offset="0%" stopColor="#fff7cf" stopOpacity={0.95} />
              <stop offset="38%" stopColor="#ff9d26" stopOpacity={0.88} />
              <stop offset="78%" stopColor="#e04312" stopOpacity={0.72} />
              <stop offset="100%" stopColor="#6e1808" stopOpacity={0.25} />
            </radialGradient>

            {/* Mặt cắt thép chéo (diagonal section hatch) cho vỏ giáp xe tăng */}
            <pattern id="s06SteelHatch" width={18} height={18} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width={18} height={18} fill="none" />
              <line x1={0} y1={0} x2={0} y2={18} stroke="#6987a6" strokeWidth={2} strokeOpacity={0.26} />
            </pattern>

            {/* Vỏ đồng đạn pháo 120mm trong hầm đạn */}
            <linearGradient id="s06BrassCase" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#8f6717" />
              <stop offset="32%" stopColor="#e6be4c" />
              <stop offset="56%" stopColor="#fff0ad" />
              <stop offset="82%" stopColor="#cfa132" />
              <stop offset="100%" stopColor="#785410" />
            </linearGradient>

            {/* Quầng lửa bùng nổ hầm đạn trào ngược lên tháp pháo */}
            <radialGradient id="s06CookGlow" cx="50%" cy="62%" r="55%">
              <stop offset="0%" stopColor="#fffbe0" stopOpacity={0.98} />
              <stop offset="32%" stopColor="#ffb02e" stopOpacity={0.88} />
              <stop offset="68%" stopColor="#ff4514" stopOpacity={0.58} />
              <stop offset="100%" stopColor="#ff2a00" stopOpacity={0} />
            </radialGradient>

            {/* Vùng cắt đúng phần khối thuốc nổ nằm PHÍA TRÊN phễu đồng chữ V ngược */}
            <clipPath id="s06ChargeClip">
              <path
                d={`M ${CX - 118} 324 L ${CX + 118} 324 L ${CX + 118} 584 L ${CX} 396 L ${CX - 118} 584 Z`}
              />
            </clipPath>
          </defs>

          {/* ==================== NỀN ĐÁ PHIẾN X-QUANG & LƯỚI KỸ THUẬT CHIỀU SÂU ==================== */}
          <rect x={-300} y={-200} width={2520} height={2300} fill="url(#s06BgGrad)" />

          {/* Lưới kỹ thuật chia ô tinh tế */}
          <g opacity={0.42}>
            {Array.from({ length: 46 }, (_, i) => {
              const gx = 40 + i * 40;
              const major = i % 4 === 0;
              return (
                <line
                  key={`vx-${i}`}
                  x1={gx}
                  y1={0}
                  x2={gx}
                  y2={1920}
                  stroke={major ? P2D.slateGrid : '#19293b'}
                  strokeWidth={major ? 1.4 : 0.8}
                />
              );
            })}
            {Array.from({ length: 48 }, (_, j) => {
              const gy = 40 + j * 40;
              const major = j % 4 === 0;
              return (
                <line
                  key={`hz-${j}`}
                  x1={0}
                  y1={gy}
                  x2={1920}
                  y2={gy}
                  stroke={major ? P2D.slateGrid : '#19293b'}
                  strokeWidth={major ? 1.4 : 0.8}
                />
              );
            })}
          </g>

          {/* Trục tâm chuẩn đạn đạo thẳng đứng & thước đo vạch chia hai bên */}
          <line
            x1={CX}
            y1={80}
            x2={CX}
            y2={1700}
            stroke={P2D.slateRule}
            strokeWidth={1.5}
            strokeDasharray="10 10"
            opacity={0.35}
          />
          {[-680, 680].map((dx) => (
            <g key={`ruler-${dx}`} transform={`translate(${CX + dx}, 0)`} opacity={0.48}>
              <line x1={0} y1={140} x2={0} y2={1600} stroke={P2D.slateRule} strokeWidth={1.6} />
              {Array.from({ length: 30 }, (_, k) => {
                const ry = 140 + k * 50;
                const big = k % 4 === 0;
                const sgn = dx < 0 ? 1 : -1;
                return (
                  <line
                    key={k}
                    x1={0}
                    y1={ry}
                    x2={sgn * (big ? 24 : 11)}
                    y2={ry}
                    stroke={big ? P2D.slateMuted : P2D.slateRule}
                    strokeWidth={big ? 2 : 1.1}
                  />
                );
              })}
            </g>
          ))}

          {/* ==================== TẦNG DƯỚI: MẶT CẮT DỌC THÁP PHÁO, KHOANG CHIẾN ĐẤU & HẦM ĐẠN ==================== */}
          <g filter="url(#sh)">
            {/* Bóng mờ biên dạng ngoài thân xe tăng (nòng pháo & cụm xích hai bên đáy xe) */}
            <g opacity={0.44}>
              <rect x={1580} y={908} width={440} height={42} rx={4} fill={P2D.steelLo} stroke={P2D.stroke} strokeWidth={3} />
              <rect x={1730} y={898} width={115} height={62} rx={6} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3} />
              {[-1, 1].map((side) => {
                const sx = CX + side * 685;
                return (
                  <g key={`track-cut-${side}`} transform={`translate(${sx}, 1195)`}>
                    <rect x={-72} y={0} width={144} height={285} rx={22} fill="#141c24" stroke={P2D.stroke} strokeWidth={4} />
                    {[-50, -16, 18, 50].map((tx, ti) => (
                      <React.Fragment key={ti}>
                        <rect x={tx - 12} y={-8} width={24} height={14} rx={3} fill={P2D.steelMid} />
                        <rect x={tx - 12} y={279} width={24} height={14} rx={3} fill={P2D.steelMid} />
                      </React.Fragment>
                    ))}
                    <circle cx={0} cy={158} r={54} fill="#1d2733" stroke={P2D.steelMid} strokeWidth={6} />
                    <circle cx={0} cy={158} r={20} fill={P2D.steelHi} />
                  </g>
                );
              })}
            </g>

            {/* Lòng khoang chiến đấu bên trong tháp pháo & thân xe */}
            <path
              d={`M ${CX - 545} ${ROOF_BOT} L ${CX + 545} ${ROOF_BOT} L ${CX + 610} 1095 L ${CX + 595} 1435 L ${CX - 595} 1435 L ${CX - 610} 1095 Z`}
              fill="#0a121b"
              stroke={P2D.stroke}
              strokeWidth={3}
            />

            {/* Chi tiết cơ khí chìm trong khoang tháp pháo */}
            <g opacity={0.55}>
              {[-390, -230, 230, 390].map((rx, idx) => (
                <rect key={idx} x={CX + rx - 10} y={ROOF_BOT + 4} width={20} height={270} fill="#132131" stroke="#1f334a" strokeWidth={1.5} />
              ))}
              <g transform={`translate(${CX + 265}, 900)`}>
                <rect x={-110} y={-38} width={245} height={92} rx={10} fill="#162638" stroke="#2a435e" strokeWidth={2.5} />
                <rect x={-135} y={-22} width={32} height={60} rx={5} fill="#1f344d" stroke="#2f4d6b" strokeWidth={2} />
                <circle cx={40} cy={10} r={22} fill="#101c29" stroke="#2c4561" strokeWidth={2} />
              </g>
              {[-1, 1].map((side) => (
                <path
                  key={`seat-${side}`}
                  d={`M ${CX + side * 435} 940 L ${CX + side * 415} 1052 L ${CX + side * 325} 1052`}
                  fill="none"
                  stroke="#29415a"
                  strokeWidth={14}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}
              {/* Vành bi xoay tháp pháo (Turret Ring) ở y = 1092 */}
              <rect x={CX - 595} y={1084} width={1190} height={24} fill="#172738" stroke="#2d4661" strokeWidth={2} />
              {Array.from({ length: 24 }, (_, bi) => (
                <circle key={bi} cx={CX - 552 + bi * 48} cy={1096} r={5.5} fill="#3d5a78" />
              ))}
              <line x1={CX - 365} y1={1108} x2={CX - 335} y2={1208} stroke="#263d54" strokeWidth={8} />
              <line x1={CX + 365} y1={1108} x2={CX + 335} y2={1208} stroke="#263d54" strokeWidth={8} />
            </g>

            {/* HAI MÁ GIÁP THÁP PHÁO COMPOSITE CỰC DÀY HAI BÊN — đối lập trực tiếp với giáp nóc mỏng 28px */}
            {[-1, 1].map((side) => {
              const dir = side;
              const innerTop = CX + dir * 535;
              const outerTop = CX + dir * 645;
              const outerMid = CX + dir * 725;
              const innerBot = CX + dir * 585;
              return (
                <g key={`cheek-${side}`}>
                  <polygon
                    points={`${innerTop},${ROOF_TOP} ${outerTop},${ROOF_TOP + 18} ${outerMid},1092 ${innerBot},1092`}
                    fill={P2D.steelMid}
                    stroke={P2D.stroke}
                    strokeWidth={4}
                  />
                  <polygon
                    points={`${innerTop},${ROOF_TOP} ${outerTop},${ROOF_TOP + 18} ${outerMid},1092 ${innerBot},1092`}
                    fill="url(#s06SteelHatch)"
                  />
                  <polygon
                    points={`${CX + dir * 566},${ROOF_TOP + 40} ${CX + dir * 626},${ROOF_TOP + 52} ${CX + dir * 676},1058 ${CX + dir * 608},1058`}
                    fill={P2D.ceramicLo}
                    stroke={P2D.armorSafe}
                    strokeWidth={1.8}
                    opacity={0.75}
                  />
                </g>
              );
            })}

            {/* VÁCH THÉP HÔNG & SÀN ĐÁY THÂN XE BỌC QUANH HẦM ĐẠN */}
            <path
              d={`M ${CX - 610} 1092 L ${CX - 575} 1092 L ${CX - 555} 1428 L ${CX + 555} 1428 L ${CX + 575} 1092 L ${CX + 610} 1092 L ${CX + 595} 1474 L ${CX - 595} 1474 Z`}
              fill={P2D.steelLo}
              stroke={P2D.stroke}
              strokeWidth={4}
            />
            <rect x={CX - 592} y={1428} width={1184} height={44} fill="url(#s06SteelHatch)" />

            {/* ==================== TẤM GIÁP NÓC THÁP PHÁO MỎNG (CHỈ DÀY 28px Ở Y = 790..818) ==================== */}
            <rect
              x={CX - 540}
              y={ROOF_TOP}
              width={525}
              height={ROOF_THICK}
              fill={P2D.steelMid}
              stroke={P2D.stroke}
              strokeWidth={3.5}
            />
            <rect x={CX - 540} y={ROOF_TOP} width={525} height={ROOF_THICK} fill="url(#s06SteelHatch)" />

            <rect
              x={CX + 15}
              y={ROOF_TOP}
              width={525}
              height={ROOF_THICK}
              fill={P2D.steelMid}
              stroke={P2D.stroke}
              strokeWidth={3.5}
            />
            <rect x={CX + 15} y={ROOF_TOP} width={525} height={ROOF_THICK} fill="url(#s06SteelHatch)" />

            {/* Viền cảnh báo đỏ tử huyệt dọc mặt trên tấm giáp nóc mỏng + dấu ngàm kẹp đo độ dày */}
            <line x1={CX - 535} y1={ROOF_TOP + 2} x2={CX - 18} y2={ROOF_TOP + 2} stroke={P2D.weakRed} strokeWidth={3.5} opacity={0.88} />
            <line x1={CX + 18} y1={ROOF_TOP + 2} x2={CX + 535} y2={ROOF_TOP + 2} stroke={P2D.weakRed} strokeWidth={3.5} opacity={0.88} />
            {[-380, 380].map((cxOff) => (
              <g key={`caliper-${cxOff}`} transform={`translate(${CX + cxOff}, 0)`} opacity={0.88}>
                <path d={`M 0 ${ROOF_TOP - 34} L 0 ${ROOF_TOP - 6} M -8 ${ROOF_TOP - 15} L 0 ${ROOF_TOP - 5} L 8 ${ROOF_TOP - 15}`} fill="none" stroke={P2D.weakRed} strokeWidth={2.5} />
                <path d={`M 0 ${ROOF_BOT + 34} L 0 ${ROOF_BOT + 6} M -8 ${ROOF_BOT + 15} L 0 ${ROOF_BOT + 5} L 8 ${ROOF_BOT + 15}`} fill="none" stroke={P2D.weakRed} strokeWidth={2.5} />
              </g>
            ))}

            {/* Ngàm tâm ngắm đỏ khóa điểm chạm trên giáp nóc ở giây đầu cảnh (45.2 -> 46.2s) */}
            {t < 46.4 && (
              <g transform={`translate(${CX}, ${ROOF_TOP})`} opacity={1 - prog(t, 45.95, 46.4)}>
                <path d="M -38 -14 L -24 -14 L -24 0 M 38 -14 L 24 -14 L 24 0" fill="none" stroke={P2D.weakRed} strokeWidth={3} />
                <circle cx={0} cy={0} r={8} fill="none" stroke={P2D.weakRed} strokeWidth={2.5} />
              </g>
            )}

            {/* Lõi thép tại tâm va chạm: chảy đỏ và đứt toạc khi luồng đồng đục xuyên lúc 53.48s */}
            {breachP < 0.98 && (
              <rect
                x={CX - 16}
                y={ROOF_TOP + breachP * 10}
                width={32}
                height={Math.max(2, ROOF_THICK * (1 - breachP))}
                fill={mix(P2D.steelMid, P2D.jetMid, Math.min(1, breachP * 1.4))}
              />
            )}
            {breachP > 0.04 && (
              <g filter="url(#glow)">
                <path
                  d={`M ${CX - 23} ${ROOF_TOP - 6 * breachP} Q ${CX - 13} ${ROOF_TOP + 14} ${CX - 19} ${ROOF_BOT + 10 * breachP} L ${CX - 9} ${ROOF_BOT + 4 * breachP} L ${CX - 9} ${ROOF_TOP} Z`}
                  fill={P2D.jetMid}
                />
                <path
                  d={`M ${CX + 23} ${ROOF_TOP - 6 * breachP} Q ${CX + 13} ${ROOF_TOP + 14} ${CX + 19} ${ROOF_BOT + 10 * breachP} L ${CX + 9} ${ROOF_BOT + 4 * breachP} L ${CX + 9} ${ROOF_TOP} Z`}
                  fill={P2D.jetMid}
                />
                {roofImpactFlash > 0.01 && (
                  <ellipse cx={CX} cy={ROOF_TOP + 14} rx={64 * roofImpactFlash} ry={24 * roofImpactFlash} fill={P2D.jetCore} opacity={roofImpactFlash * 0.92} />
                )}
              </g>
            )}

            {/* ==================== HẦM ĐẠN / KHAY ĐẠN PHÁO 120MM DƯỚI ĐÁY THÂN XE (Y = 1208..1416) ==================== */}
            <g>
              <rect
                x={CX - 510}
                y={1208}
                width={1020}
                height={210}
                rx={12}
                fill="#111c29"
                stroke={cookoffActive ? P2D.weakRed : '#35506e'}
                strokeWidth={3.5}
              />
              {/* Thanh sọc cảnh báo vàng-đen dọc gờ trên hầm đạn */}
              <g opacity={0.82}>
                {Array.from({ length: 24 }, (_, hi) => (
                  <rect
                    key={hi}
                    x={CX - 492 + hi * 42}
                    y={1212}
                    width={22}
                    height={8}
                    rx={2}
                    fill={hi % 2 === 0 ? P2D.explosive : '#1a2430'}
                  />
                ))}
              </g>

              {/* Quầng sáng nhiệt & chuỗi nổ Blast2D đặt lớp nền của hầm đạn để thấy rõ các viên đạn pháo 120mm bị hất tung */}
              {cookoffActive && (
                <g>
                  <ellipse
                    cx={CX}
                    cy={1305 - 205 * cookSurgeP}
                    rx={490 + 110 * cookSurgeP}
                    ry={250 + 320 * cookSurgeP}
                    fill="url(#s06CookGlow)"
                  />
                  <Blast2D t={t} at={CUE.s06_ammo_cookoff} x={CX} y={1360} size={135} seed={11} air smoke="#692d17" />
                  <Blast2D t={t} at={CUE.s06_ammo_cookoff + 0.12} x={CX - 175} y={1370} size={118} seed={23} air smoke="#5e2915" />
                  <Blast2D t={t} at={CUE.s06_ammo_cookoff + 0.22} x={CX + 180} y={1365} size={122} seed={37} air smoke="#5e2915" />
                  <Blast2D t={t} at={CUE.s06_ammo_cookoff + 0.34} x={CX - 330} y={1345} size={105} seed={51} air smoke="#542412" />
                  <Blast2D t={t} at={CUE.s06_ammo_cookoff + 0.42} x={CX + 335} y={1345} size={108} seed={67} air smoke="#542412" />
                </g>
              )}

              {/* Hai giá đạn pháo 120mm xếp ngang hai bên hông hầm đạn (nhìn rõ đáy catút đồng & hạt lửa) */}
              {[-1, 1].map((side) => (
                <g key={`side-rack-${side}`} transform={`translate(${CX + side * 395}, 1320)`}>
                  <rect x={-92} y={-82} width={184} height={164} rx={8} fill="#0c1520" stroke="#2c435c" strokeWidth={2.5} opacity={cookoffActive ? 0.65 : 1} />
                  {[-48, 0, 48].map((colX, ci) =>
                    [-40, 40].map((rowY, ri) => {
                      const ignite = prog(t, CUE.s06_ammo_cookoff + 0.16 + ci * 0.08, CUE.s06_ammo_cookoff + 0.44 + ci * 0.08);
                      return (
                        <g key={`${ci}-${ri}`} transform={`translate(${colX + side * ignite * 18}, ${rowY - ignite * 16})`}>
                          <circle r={21} fill={ignite > 0.1 ? mix('#d6ad42', '#ff591c', ignite) : '#c99e34'} stroke={P2D.stroke} strokeWidth={2.5} />
                          <circle r={14} fill="none" stroke="#856114" strokeWidth={1.6} />
                          <circle r={5.5} fill={ignite > 0.2 ? '#fff8d6' : '#574114'} />
                        </g>
                      );
                    }),
                  )}
                </g>
              ))}

              {/* Khay chính giữa: 9 quả đạn pháo 120mm (APFSDS & HEAT-MP) dựng thẳng đứng — khi nổ bị hất tung & nứt toác lửa */}
              <g transform={`translate(${CX}, 1406)`}>
                <rect x={-292} y={-174} width={584} height={178} rx={8} fill="#0d1723" stroke="#314b66" strokeWidth={2.5} opacity={cookoffActive ? 0.45 : 1} />
                {SHELL_XS.map((sx, idx) => {
                  const distFromCenter = Math.abs(idx - 4);
                  const shellBlastT = CUE.s06_ammo_cookoff + distFromCenter * 0.07;
                  const shellHitP = prog(t, shellBlastT, shellBlastT + 0.55, Easing.out(Easing.cubic));
                  const dirSign = idx === 4 ? 0.35 : Math.sign(idx - 4);
                  const tossX = (idx - 4) * 34 * shellHitP + dirSign * 18 * shellHitP;
                  const tossY = -(85 + (4 - distFromCenter) * 28) * shellHitP;
                  const tossRot = ((idx - 4) * 16 + dirSign * 14) * shellHitP;
                  const isSabot = idx % 2 === 0;

                  return (
                    <g
                      key={idx}
                      transform={`translate(${sx + tossX}, ${tossY}) rotate(${tossRot})`}
                    >
                      {/* Đế thép catút */}
                      <rect x={-21} y={-14} width={42} height={12} rx={2} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={2} />
                      {/* Thân liều phóng vàng đồng chứa thuốc phóng năng lượng cao */}
                      <rect
                        x={-19}
                        y={-106}
                        width={38}
                        height={93}
                        rx={3}
                        fill={shellHitP > 0.05 ? mix('#e6be4c', '#ff6219', Math.min(1, shellHitP * 1.15)) : 'url(#s06BrassCase)'}
                        stroke={P2D.stroke}
                        strokeWidth={2.4}
                      />
                      {/* Đai đồng dẫn hướng */}
                      <rect x={-20} y={-114} width={40} height={9} rx={1.5} fill={P2D.copper} stroke={P2D.stroke} strokeWidth={1.8} />
                      {/* Đầu đạn tách văng lên trên khi thuốc phóng trong vỏ nổ tung */}
                      <g transform={`translate(0, ${-34 * shellHitP}) rotate(${dirSign * 18 * shellHitP})`}>
                        {isSabot ? (
                          <>
                            <polygon points="-17,-114 17,-114 9,-146 -9,-146" fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={2} />
                            <polygon points="-4,-146 4,-146 1.5,-174 -1.5,-174" fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={1.6} />
                          </>
                        ) : (
                          <>
                            <path d="M -17 -114 L -13 -154 L -5 -168 L 5 -168 L 13 -154 L 17 -114 Z" fill="#3a4c3f" stroke={P2D.stroke} strokeWidth={2} />
                            <rect x={-14} y={-136} width={28} height={7} fill={P2D.explosive} />
                          </>
                        )}
                      </g>
                      {/* Lõi lửa rực sáng nổ toạc từ bên trong vỏ liều phóng */}
                      {shellHitP > 0.02 && (
                        <g filter="url(#glow)" opacity={Math.min(1, shellHitP * 1.9)}>
                          <ellipse cx={0} cy={-66} rx={14 + 14 * shellHitP} ry={34 + 22 * shellHitP} fill={P2D.jetCore} />
                        </g>
                      )}
                    </g>
                  );
                })}
              </g>
            </g>
          </g>

          {/* ==================== TẦNG TRÊN: MẶT CẮT DỌC X-QUANG ĐẦU ĐẠN NỔ LÕM HEAT ==================== */}
          <g transform={`translate(0, ${warheadDy})`} filter="url(#sh)">
            {/* Vạch động năng lao thẳng đứng xuống ở đầu cảnh (45.2 -> 45.86s) nối match-cut với S05 */}
            {approachP < 0.99 && (
              <g opacity={(1 - approachP) * 0.85}>
                {[-165, -95, 95, 165].map((vx, vi) => (
                  <line
                    key={vi}
                    x1={CX + vx}
                    y1={170 + (vi % 2) * 35}
                    x2={CX + vx}
                    y2={275 + (vi % 2) * 35}
                    stroke={P2D.copperHi}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                  />
                ))}
              </g>
            )}

            {/* Luồng khí nổ áp suất cao tỏa ra hai bên ngoài vỏ khi thuốc nổ kích hoạt */}
            {detActive && (
              <g opacity={0.82 * (1 - prog(t, 51.2, 53.5))}>
                <ellipse
                  cx={CX}
                  cy={445}
                  rx={142 + caseExpand * 1.85}
                  ry={142 + caseExpand * 1.25}
                  fill="url(#s06DetGas)"
                  filter="url(#glow)"
                />
              </g>
            )}

            {/* KHOANG RỖNG HỘI TỤ (STANDOFF CAVITY) NẰM TRỌN BÊN DƯỚI LÒNG PHỄU ĐỒNG CHỮ V NGƯỢC */}
            {/* Che kín phần rỗng hình nón dưới phễu đồng để khí nổ ở trên không lọt giả vào khoang rỗng trước khi luồng đồng phóng ra */}
            <path
              d={`M ${CX - 122} 584 L ${CX - rimHalfW} ${rimY} L ${CX} ${yStag + 9} L ${CX + rimHalfW} ${rimY} L ${CX + 122} 584 L ${CX + 54} 695 L ${CX + 14} 695 L ${CX + 11} ${ROOF_TOP} L ${CX - 11} ${ROOF_TOP} L ${CX - 14} 695 L ${CX - 54} 695 Z`}
              fill="#070c13"
              stroke={P2D.stroke}
              strokeWidth={3}
              opacity={1 - prog(t, 52.8, 54.0) * 0.55}
            />

            {/* KHỐI THUỐC NỔ MẠNH OCTOL (Y = 324..584) BAO QUANH MẶT TRÊN PHỄU ĐỒNG CHỮ V NGƯỢC */}
            <g clipPath="url(#s06ChargeClip)">
              <rect x={CX - 125} y={320} width={250} height={270} fill="url(#s06Explosive)" />
              {Array.from({ length: 22 }, (_, ei) => {
                const ex = CX - 98 + (ei % 6) * 39 + (ei % 2) * 9;
                const ey = 342 + Math.floor(ei / 6) * 44;
                return <circle key={ei} cx={ex} cy={ey} r={2.4} fill="#fff3b8" opacity={0.32} />;
              })}

              {/* Khí lửa áp suất cực cao phía sau mặt sóng nổ quét từ kíp nổ (y=318) xuống */}
              {detActive && (
                <>
                  <circle cx={CX} cy={318} r={(waveY - 318) * 1.28} fill="url(#s06DetGas)" />
                  {detWaveP < 0.99 && (
                    <circle
                      cx={CX}
                      cy={318}
                      r={Math.max(8, (waveY - 318) * 1.26)}
                      fill="none"
                      stroke={P2D.jetCore}
                      strokeWidth={11}
                      filter="url(#glow)"
                    />
                  )}
                </>
              )}
            </g>

            {/* Viền khung khoang thuốc nổ */}
            <path
              d={`M ${CX - 118} 324 L ${CX + 118} 324 L ${CX + 118} 584 L ${CX} 396 L ${CX - 118} 584 Z`}
              fill="none"
              stroke={P2D.stroke}
              strokeWidth={2.5}
              opacity={1 - caseExpand * 0.65}
            />

            {/* Mũi tên vector sóng áp suất nổ ép vuông góc vào hai cánh phễu đồng (48.4 -> 50.8s) */}
            {squeezeGlow > 0.02 && (
              <g opacity={squeezeGlow * 0.95} filter="url(#glow)">
                {[0, 1, 2].map((ai) => {
                  const ay = 432 + ai * 44;
                  const axOff = lerp(62 + ai * 26, 26 + ai * 8, collapseP);
                  return (
                    <React.Fragment key={ai}>
                      <path
                        d={`M ${CX - axOff - 42} ${ay - 18} L ${CX - axOff - 6} ${ay} M ${CX - axOff - 19} ${ay - 11} L ${CX - axOff - 5} ${ay} L ${CX - axOff - 21} ${ay + 5}`}
                        fill="none"
                        stroke={P2D.jetCore}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={`M ${CX + axOff + 42} ${ay - 18} L ${CX + axOff + 6} ${ay} M ${CX + axOff + 19} ${ay - 11} L ${CX + axOff + 5} ${ay} L ${CX + axOff + 21} ${ay + 5}`}
                        fill="none"
                        stroke={P2D.jetCore}
                        strokeWidth={4}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </React.Fragment>
                  );
                })}
              </g>
            )}

            {/* ==================== PHỄU ĐỒNG ĐỎ HÌNH NÓN CHỮ V NGƯỢC (INVERTED-V COPPER LINER) ==================== */}
            {/* Đỉnh nón ở trên (y = 396), miệng mở xuống dưới (y = 584) — chuẩn vật lý hiệu ứng Monroe đạn HEAT */}
            <g>
              {collapseP > 0.04 && (
                <path
                  d={`M ${CX - 7} ${yApexOrig + 2} L ${CX + 7} ${yApexOrig + 2} L ${CX + 15} ${yStag} L ${CX - 15} ${yStag} Z`}
                  fill={P2D.copperDark}
                  stroke={P2D.stroke}
                  strokeWidth={2.5}
                />
              )}

              <polygon
                points={`${CX},${yStag - 12} ${CX - rimHalfW - 14},${rimY - 6} ${CX - rimHalfW + 3},${rimY + 7} ${CX},${yStag + 11}`}
                fill="url(#s06CopperL)"
                stroke={P2D.stroke}
                strokeWidth={3}
              />
              <polygon
                points={`${CX},${yStag - 12} ${CX + rimHalfW + 14},${rimY - 6} ${CX + rimHalfW - 3},${rimY + 7} ${CX},${yStag + 11}`}
                fill="url(#s06CopperR)"
                stroke={P2D.stroke}
                strokeWidth={3}
              />
              <polyline
                points={`${CX - rimHalfW + 2},${rimY + 4} ${CX},${yStag + 9} ${CX + rimHalfW - 2},${rimY + 4}`}
                fill="none"
                stroke={P2D.copperHi}
                strokeWidth={2.4}
              />

              {collapseP > 0.12 && (
                <circle
                  cx={CX}
                  cy={yStag + 4}
                  r={10 + 14 * Math.sin(Math.min(1, collapseP) * Math.PI * 0.85)}
                  fill={P2D.jetCore}
                  filter="url(#glow)"
                />
              )}
            </g>

            {/* Khối đầu hậu & kíp nổ điện tử ở đáy trên (y = 248..326) */}
            <g transform={`translate(0, ${-caseExpand * 0.35})`}>
              <path
                d={`M ${CX - 126} 252 L ${CX + 126} 252 L ${CX + 138} 324 L ${CX - 138} 324 Z`}
                fill={P2D.steelLo}
                stroke={P2D.stroke}
                strokeWidth={3.5}
              />
              <polygon points={`${CX - 126},258 ${CX - 196},224 ${CX - 196},286 ${CX - 134},306`} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3} />
              <polygon points={`${CX + 126},258 ${CX + 196},224 ${CX + 196},286 ${CX + 134},306`} fill={P2D.steelMid} stroke={P2D.stroke} strokeWidth={3} />

              <rect x={CX - 34} y={292} width={68} height={36} rx={6} fill="#1f3145" stroke={P2D.copperHi} strokeWidth={2.5} />
              <circle
                cx={CX}
                cy={314}
                r={10}
                fill={detActive ? P2D.jetCore : wirePulseP > 0.92 ? P2D.jetMid : P2D.weakRed}
                filter={detActive ? 'url(#glow)' : undefined}
              />
              {detFlash > 0.01 && (
                <circle cx={CX} cy={316} r={56 * detFlash} fill={P2D.jetCore} opacity={detFlash} filter="url(#glow)" />
              )}
            </g>

            {/* Hai thành vỏ đầu đạn mặt cắt dọc */}
            {[-1, 1].map((side) => {
              const shiftX = side * caseExpand * 36;
              const rot = side * caseExpand * 5.5;
              return (
                <g
                  key={`wall-${side}`}
                  transform={`translate(${shiftX}, 0) rotate(${rot} ${CX + side * 128} 460)`}
                  opacity={1 - caseExpand * 0.35}
                >
                  <rect
                    x={side < 0 ? CX - 142 : CX + 118}
                    y={322}
                    width={24}
                    height={264}
                    fill={P2D.steelMid}
                    stroke={P2D.stroke}
                    strokeWidth={3}
                  />
                  <rect
                    x={side < 0 ? CX - 143 : CX + 119}
                    y={412}
                    width={24}
                    height={24}
                    fill={P2D.explosive}
                    stroke={P2D.stroke}
                    strokeWidth={2}
                  />
                  <polygon
                    points={
                      side < 0
                        ? `${CX - 142},586 ${CX - 118},586 ${CX - 48},696 ${CX - 68},696`
                        : `${CX + 118},586 ${CX + 142},586 ${CX + 68},696 ${CX + 48},696`
                    }
                    fill={P2D.steelHi}
                    stroke={P2D.stroke}
                    strokeWidth={3}
                  />
                </g>
              );
            })}

            {/* Mảnh vỏ đầu đạn văng sang hai bên */}
            {caseBurstT > 0.01 &&
              caseBurstT < 2.4 &&
              CASING_SHARDS.map((sh, si) => {
                const sx = CX + sh.side * 136 + sh.vx * caseBurstT;
                const sy = sh.y0 + sh.vy * caseBurstT + 140 * caseBurstT * caseBurstT;
                return (
                  <rect
                    key={si}
                    x={sx - 9}
                    y={sy - 5}
                    width={18}
                    height={10}
                    rx={2}
                    fill={P2D.steelHi}
                    stroke={P2D.stroke}
                    strokeWidth={1.8}
                    opacity={Math.max(0, 1 - caseBurstT / 2.4)}
                    transform={`rotate(${sh.rot * caseBurstT} ${sx} ${sy})`}
                  />
                );
              })}

            {/* Mũi thanh ngòi nổ khoảng cách (Standoff Piezo Probe) chạm mặt giáp nóc ở y = 790 */}
            <g opacity={1 - prog(t, 50.8, 51.6)}>
              <polygon
                points={`${CX - 56},694 ${CX + 56},694 ${CX + 18},718 ${CX - 18},718`}
                fill={P2D.steelMid}
                stroke={P2D.stroke}
                strokeWidth={2.8}
              />
              <rect x={CX - 11} y={718} width={22} height={62} fill={P2D.steelHi} stroke={P2D.stroke} strokeWidth={2.5} />
              <polygon
                points={`${CX - 13},778 ${CX + 13},778 ${CX + 7},${ROOF_TOP} ${CX - 7},${ROOF_TOP}`}
                fill={P2D.copperHi}
                stroke={P2D.stroke}
                strokeWidth={2.2}
              />
            </g>

            {/* Xung điện kích nổ chạy từ mũi chạm nóc ngược lên kíp nổ đỉnh */}
            {t >= CUE.s06_roof_contact && t < CUE.s06_shaped_detonate + 0.2 && (
              <g filter="url(#glow)">
                {[-1, 1].map((side) => {
                  const py = lerp(ROOF_TOP - 4, 316, wirePulseP);
                  const px = py > 696 ? CX + side * 10 : py > 586 ? lerp(CX + side * 126, CX + side * 56, (py - 586) / 110) : CX + side * 126;
                  return <circle key={side} cx={px} cy={py} r={6.5} fill="#6be6ff" />;
                })}
              </g>
            )}
          </g>

          {/* Chớp tia lửa điện kích nổ ngay khoảnh khắc mũi đầu đạn chạm giáp nóc (CUE.s06_roof_contact = 45.86s) */}
          {contactSpark > 0.01 && (
            <g transform={`translate(${CX}, ${ROOF_TOP})`} filter="url(#glow)" opacity={contactSpark}>
              <circle cx={0} cy={0} r={36 * contactSpark} fill="#9cf2ff" opacity={0.85} />
              <circle cx={0} cy={0} r={17 * contactSpark} fill="#ffffff" />
              {[-135, -105, -75, -45].map((ang, idx) => {
                const rad = (ang * Math.PI) / 180;
                const rLen = 38 + (idx % 2) * 22;
                return (
                  <React.Fragment key={idx}>
                    <line x1={0} y1={0} x2={Math.cos(rad) * rLen} y2={Math.sin(rad) * rLen} stroke="#fff6c7" strokeWidth={3} strokeLinecap="round" />
                    <line x1={0} y1={0} x2={-Math.cos(rad) * rLen} y2={Math.sin(rad) * rLen} stroke="#7ce8ff" strokeWidth={3} strokeLinecap="round" />
                  </React.Fragment>
                );
              })}
            </g>
          )}

          {/* ==================== LUỒNG KIM LOẠI ĐỒNG SIÊU TỐC 3 LỚP (8 KM/S) ==================== */}
          {jetActive && jetFadeAfterCookoff > 0.01 && jetTipY > jetTailY + 6 && (
            <g opacity={jetFadeAfterCookoff}>
              <polygon
                points={`${CX - 14.5},${jetTailY} ${CX + 14.5},${jetTailY} ${CX + 5.8},${jetTipY - 12} ${CX},${jetTipY + 6} ${CX - 5.8},${jetTipY - 12}`}
                fill={P2D.jetOuter}
                opacity={0.9}
                filter="url(#glow)"
              />
              <polygon
                points={`${CX - 8.8},${jetTailY} ${CX + 8.8},${jetTailY} ${CX + 3.4},${jetTipY - 6} ${CX},${jetTipY + 4} ${CX - 3.4},${jetTipY - 6}`}
                fill={P2D.jetMid}
                filter="url(#glow)"
              />
              <polygon
                points={`${CX - 4.0},${jetTailY} ${CX + 4.0},${jetTailY} ${CX + 1.5},${jetTipY - 2} ${CX},${jetTipY + 3} ${CX - 1.5},${jetTipY - 2}`}
                fill={P2D.jetCore}
              />

              <g transform={`translate(${CX}, ${jetTipY})`} filter="url(#glow)">
                <ellipse cx={0} cy={-4} rx={12} ry={19} fill={P2D.jetCore} />
                {t >= 50.8 && t <= 54.85 && (
                  <>
                    <path d="M -46 -74 L 0 4 L 46 -74" fill="none" stroke={P2D.jetMid} strokeWidth={2.6} opacity={0.74} />
                    <path d="M -78 -135 L 0 0 L 78 -135" fill="none" stroke={P2D.jetOuter} strokeWidth={1.8} strokeDasharray="10 8" opacity={0.52} />
                  </>
                )}
              </g>

              {t >= 51.3 && t <= 54.7 && (
                <g opacity={0.68}>
                  {[-64, -38, 38, 64].map((sx, si) => {
                    const streakY = jetTipY - 45 - ((si * 47 + Math.floor(t * 28) * 19) % 160);
                    return (
                      <line
                        key={si}
                        x1={CX + sx}
                        y1={streakY - 75}
                        x2={CX + sx}
                        y2={streakY}
                        stroke={Math.abs(sx) < 45 ? P2D.jetCore : P2D.jetMid}
                        strokeWidth={2.2}
                        strokeLinecap="round"
                      />
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* ==================== CHÙM MẢNH VĂNG THÉP NÓNG ĐỎ (SPALL CONE) KHI ĐỤC THỦNG GIÁP NÓC (53.48s) ==================== */}
          {spallDt > 0.005 && (
            <g>
              {SPALL_ITEMS.map((sp, i) => {
                const age = spallDt - sp.delay;
                if (age <= 0 || age > 2.2) return null;
                const ang = Math.PI / 2 + sp.spread;
                const dist = sp.speed * age * (1 - 0.18 * age);
                const fx = CX + Math.cos(ang) * dist;
                const fy = ROOF_BOT + 4 + Math.sin(ang) * dist + 95 * age * age;
                if (fy > 1425 || fx < CX - 565 || fx > CX + 565) return null;
                const alpha = Math.max(0, 1 - age / 2.1);
                const tx = fx - Math.cos(ang) * Math.min(44, dist * 0.25);
                const ty = fy - Math.sin(ang) * Math.min(44, dist * 0.25);
                return (
                  <g key={i} opacity={alpha}>
                    <line x1={tx} y1={ty} x2={fx} y2={fy} stroke={P2D.jetOuter} strokeWidth={2.2} opacity={0.75} />
                    <polygon
                      points={`${fx - sp.size},${fy - sp.size * 0.5} ${fx + sp.size},${fy} ${fx - sp.size * 0.3},${fy + sp.size * 0.7}`}
                      fill={i % 3 === 0 ? P2D.jetCore : P2D.jetMid}
                      transform={`rotate(${age * sp.spin} ${fx} ${fy})`}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== CỘT LỬA PHỤT TRÀO NGƯỢC LÊN KHOANG THÁP PHÁO & QUA LỖ THỦNG GIÁP NÓC (54.86s) ==================== */}
          {cookoffActive && (
            <g>
              {/* Vòng sóng xung kích nổ hầm đạn lan rộng */}
              {cookDt < 0.9 && (
                <circle
                  cx={CX}
                  cy={1315}
                  r={80 + cookDt * 680}
                  fill="none"
                  stroke={P2D.jetCore}
                  strokeWidth={Math.max(1.5, 10 * (1 - cookDt / 0.9))}
                  opacity={Math.max(0, 1 - cookDt / 0.9)}
                  filter="url(#glow)"
                />
              )}

              {/* Cột cầu lửa cuộn trào ngược từ hầm đạn lên khoang tháp pháo và phụt vọt qua lỗ xuyên trên giáp nóc */}
              {Array.from({ length: 12 }, (_, fi) => {
                const fProgress = Math.max(0, cookSurgeP * 1.28 - fi * 0.062);
                if (fProgress <= 0) return null;
                const fy = lerp(1265, ROOF_TOP - 155, Math.min(1, fProgress));
                const narrowAtRoof = fy < ROOF_BOT + 45 ? 0.38 : 1;
                const fx = CX + Math.sin(fi * 2.1 + t * 7) * 78 * narrowAtRoof;
                const fr = (62 + (11 - fi) * 6.5) * (fy < ROOF_TOP ? 0.85 : narrowAtRoof + 0.22);
                const col = fi > 8 ? P2D.jetCore : fi > 4 ? P2D.jetMid : P2D.jetOuter;
                return (
                  <Puff2D
                    key={fi}
                    seed={90 + fi}
                    x={fx}
                    y={fy}
                    r={fr}
                    color={col}
                    opacity={Math.min(0.9, fProgress * 2.1)}
                  />
                );
              })}
            </g>
          )}
        </svg>
      </Cam2D>

      {/* Lớp hạt film/bản vẽ phủ toàn khung */}
      <Grain opacity={0.34} />

      {/* Nhãn vận tốc luồng đồng siêu tốc 8 km/s (tối đa 1 Label trên màn hình) */}
      <Label
        t={t}
        text="8 km/s"
        x={1360}
        y={360}
        from={CUE.s06_speed_8kms}
        until={54.4}
        bg={P2D.jetMid}
        fg={P2D.slateDeep}
      />
    </AbsoluteFill>
  );
};

export default S06;
