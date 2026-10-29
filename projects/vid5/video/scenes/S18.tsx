import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog } from '@kit/theme';
import { handheld, Label, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn, smoothPath, type Pt } from '@lib/2d/path';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Side2D } from '../local/jets2d';

// Vị trí gốc F-15EX cắt dọc (scale = 3.1 -> dài 1445.5 px, mũi tại x = 1682.3, đuôi tại x = 237.7)
const JX = 960;
const JY = 590;
const JS = 3.1;

// Toạ độ thế giới khớp 1:1 với các khoang trên F15Side2D(x=960, y=590, scale=3.1)
const POS_AESA: Pt = [1524, 593];
const POS_ADCP: Pt = [1072, 585];
const POS_CHEEK_EW: Pt = [1468, 623];
const POS_NOSE_EW: Pt = [1448, 560];
const POS_BELLY_EW: Pt = [885, 642];
const POS_TAIL_BOOM_EW: Pt = [302, 565];
const POS_EPAWSS_NEAR: Pt = [410, 260];
const POS_EPAWSS_FAR: Pt = [375, 268];

// Đường cáp quang chính từ lưng đĩa AESA AN/APG-82(V)1 luồn dưới sàn buồng lái về siêu máy tính ADCP II
const FIBER_MAIN_PTS: Pt[] = [
  [1512, 595],
  [1455, 606],
  [1365, 616],
  [1245, 618],
  [1150, 608],
  POS_ADCP,
];

// Các nhánh cáp điều khiển từ ADCP II tỏa ra toàn bộ hệ ăng-ten thân và hai u đỉnh đuôi đứng EPAWSS
const EW_BRANCHES: { to: Pt; pts: Pt[]; len: number }[] = [
  {
    to: POS_EPAWSS_NEAR,
    pts: [POS_ADCP, [920, 568], [720, 562], [535, 556], [462, 430], POS_EPAWSS_NEAR],
    len: 860,
  },
  {
    to: POS_EPAWSS_FAR,
    pts: [POS_ADCP, [910, 562], [700, 555], [510, 548], [430, 425], POS_EPAWSS_FAR],
    len: 885,
  },
  {
    to: POS_TAIL_BOOM_EW,
    pts: [POS_ADCP, [880, 585], [620, 580], [420, 574], POS_TAIL_BOOM_EW],
    len: 790,
  },
  {
    to: POS_CHEEK_EW,
    pts: [POS_ADCP, [1190, 610], [1340, 622], POS_CHEEK_EW],
    len: 430,
  },
  {
    to: POS_NOSE_EW,
    pts: [POS_ADCP, [1205, 572], [1345, 563], POS_NOSE_EW],
    len: 400,
  },
  {
    to: POS_BELLY_EW,
    pts: [POS_ADCP, [995, 618], [935, 636], POS_BELLY_EW],
    len: 220,
  },
];

// Nội suy điểm dọc chuỗi đoạn thẳng để chạy hạt xung cáp quang mượt mà
function pointOnPolyline(pts: Pt[], u: number): Pt {
  const c = Math.max(0, Math.min(1, u));
  const segs: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const d = Math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]);
    segs.push(d);
    total += d;
  }
  let target = c * total;
  for (let i = 0; i < segs.length; i++) {
    if (target <= segs[i] || i === segs.length - 1) {
      const f = segs[i] > 0 ? target / segs[i] : 0;
      return [
        lerp(pts[i][0], pts[i + 1][0], f),
        lerp(pts[i][1], pts[i + 1][1], f),
      ];
    }
    target -= segs[i];
  }
  return pts[pts.length - 1];
}

const S18: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const hillsFar = useMemo(() => skyline('s18far', -500, 2900, 865, 95, 680, 1450), []);
  const hillsNear = useMemo(() => skyline('s18near', -500, 2900, 920, 68, 460, 1450), []);
  const fiberMainPath = useMemo(() => smoothPath(FIBER_MAIN_PTS), []);
  const ewBranchPaths = useMemo(() => EW_BRANCHES.map((b) => smoothPath(b.pts)), []);

  // Lộ trình Cam2D 4 nhịp mượt:
  // 0) Mở đầu toàn cảnh lóe xung "làm mù kẻ nhìn vào nó" (490.75–494.2s)
  // 1) Zoom cận mũi radome & chùm tia đa mục tiêu AN/APG-82(V)1 (494.2–511.8s)
  // 2) Trượt dọc cáp quang vào siêu máy tính vàng ADCP II sau buồng lái (511.8–523.8s)
  // 3) Kéo rộng toàn thân F-15EX dựng vòm lá chắn điện tử 360° EPAWSS (523.8–534.6s)
  const pToNose = prog(t, 493.8, 497.4);
  const pNoseBeams = prog(t, 502.8, 506.4);
  const pToAdcp = prog(t, 511.8, 515.4);
  const pToWide = prog(t, 523.8, 527.8);

  const x0 = 980, y0 = 560, z0 = 0.96;
  const x1a = 1525, y1a = 588, z1a = 2.08;
  const x1b = 1735, y1b = 588, z1b = 1.42;
  const x2 = 1095, y2 = 586, z2 = 2.32;
  const x3 = 965, y3 = 505, z3 = 0.86;

  let camX = lerp(x0, x1a, pToNose);
  let camY = lerp(y0, y1a, pToNose);
  let camZ = lerp(z0, z1a, pToNose);

  camX = lerp(camX, x1b, pNoseBeams);
  camY = lerp(camY, y1b, pNoseBeams);
  camZ = lerp(camZ, z1b, pNoseBeams);

  camX = lerp(camX, x2, pToAdcp);
  camY = lerp(camY, y2, pToAdcp);
  camZ = lerp(camZ, z2, pToAdcp);

  camX = lerp(camX, x3, pToWide);
  camY = lerp(camY, y3, pToWide);
  camZ = lerp(camZ, z3, pToWide);

  const shake = handheld(t, 1.6, 's18cam');

  // Tiến độ các hiệu ứng theo CUE
  const blindFlash = bump(t, CUE.s18_blindThem, 2.4);
  const xrayOpen = lerp(0.25, 0.95, prog(t, 491.4, 495.5));
  const aesaReveal = prog(t, 495.0, 498.2);
  const multiBeamP = prog(t, 498.2, 501.0);
  const rapidTrackP = prog(t, CUE.s18_multiBeam - 0.5, CUE.s18_multiBeam + 1.5);
  const fiberP = prog(t, CUE.s18_fiberOptic - 0.6, 515.4);
  const adcpPulseP = prog(t, CUE.s18_adcp87b - 0.8, 519.2);
  const ewBranchP = prog(t, 524.2, 528.2);
  const domeP = prog(t, CUE.s18_epawssDome - 1.2, CUE.s18_epawssDome + 1.8);

  // Mục tiêu bay trên cao & mục tiêu mặt đất bên dưới để chùm tia AESA khóa đồng thời
  const airTarget1: Pt = [2115, 385 + Math.sin(t * 1.4) * 8];
  const airTarget2: Pt = [2210, 488 + Math.cos(t * 1.7) * 7];
  const surfTarget1: Pt = [2065, 826];
  const surfTarget2: Pt = [2195, 846];

  // Danh sách chùm tia quạt hẹp quét điện tử trong micro-giây
  const scanAngles = useMemo(
    () => [-31, -25, -19, -13, -7, -2, 4, 10, 16, 22, 28],
    [],
  );

  return (
    <AbsoluteFill style={{ background: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZ} shake={shake} bg={P.bgDeep}>
        <svg width={2800} height={1400} viewBox="0 0 2800 1400" style={{ overflow: 'visible' }}>
          <Defs2D />

          {/* Nền bàn vẽ kỹ thuật hàng không + địa hình nhiều lớp tạo chiều sâu */}
          <BlueprintGrid x0={-500} y0={-350} w={3500} h={1850} step={110} id="s18bp" />

          {/* Vòng thước chia độ phương vị kỹ thuật mờ phía sau máy bay */}
          <g opacity={0.22}>
            {[320, 520, 740, 960].map((r) => (
              <circle
                key={r}
                cx={JX}
                cy={JY - 40}
                r={r}
                fill="none"
                stroke={P.gridBright}
                strokeWidth={1.1}
                strokeDasharray="8 10"
              />
            ))}
            <line x1={-300} y1={JY + 4} x2={2650} y2={JY + 4} stroke={P.gridBright} strokeWidth={1.2} strokeDasharray="14 8" />
          </g>

          {/* Dải địa hình chiến trường phía dưới để chùm tia không-đối-đất khóa mục tiêu mặt đất */}
          <path d={hillsFar} fill="#0b1b31" stroke={P.grid} strokeWidth={1.4} opacity={0.85} />
          <path d={hillsNear} fill="#081526" stroke={P.gridBright} strokeWidth={1.5} opacity={0.92} />

          {/* Xung chói lòa mở cảnh: "Instead of hiding in the dark, it blinds everyone looking at it" */}
          {blindFlash > 0.01 && (
            <g opacity={blindFlash}>
              {[1, 2, 3].map((k) => (
                <ellipse
                  key={k}
                  cx={JX + 40}
                  cy={JY - 25}
                  rx={360 + k * 190 * blindFlash}
                  ry={140 + k * 85 * blindFlash}
                  fill="none"
                  stroke={k === 1 ? '#ffffff' : P.cyan}
                  strokeWidth={5 - k}
                  opacity={0.75 / k}
                />
              ))}
            </g>
          )}

          {/* ==================== VÒM LÁ CHẮN ĐIỆN TỬ 360° BAE AN/ALQ-250 EPAWSS (527.6–534.6s) ==================== */}
          {domeP > 0.01 && (
            <g opacity={domeP}>
              {/* Vòm trường lực nhiều lớp elip đồng tâm bao trọn F-15EX */}
              {[0, 1, 2, 3].map((layer) => {
                const breathe = Math.sin(t * 2.8 - layer * 0.9) * 10;
                const rx = 685 + layer * 68 + breathe;
                const ry = 285 + layer * 42 + breathe * 0.5;
                const col = layer % 2 === 0 ? P.cyan : P.amber;
                return (
                  <g key={layer}>
                    <ellipse
                      cx={JX - 10}
                      cy={JY - 55}
                      rx={rx}
                      ry={ry}
                      fill={layer === 0 ? P.cyan : 'none'}
                      fillOpacity={layer === 0 ? 0.055 : 0}
                      stroke={col}
                      strokeWidth={layer === 0 ? 10 : 6}
                      opacity={0.14}
                    />
                    <ellipse
                      cx={JX - 10}
                      cy={JY - 55}
                      rx={rx}
                      ry={ry}
                      fill="none"
                      stroke={col}
                      strokeWidth={layer === 1 ? 2.8 : 2.1}
                      strokeDasharray={layer % 2 === 0 ? '26 12 8 12' : '48 16'}
                      strokeDashoffset={(layer % 2 === 0 ? 1 : -1) * t * 55}
                      opacity={0.82 - layer * 0.14}
                    />
                  </g>
                );
              })}

              {/* Sóng radar đỏ của đối phương lao tới bị vòm lá chắn EPAWSS bẻ gãy / làm mù ở rìa */}
              {[
                { ox: 1960, oy: 165, ix: 1685, iy: 325 },
                { ox: 2040, oy: 650, ix: 1815, iy: 605 },
                { ox: -50, oy: 210, ix: 195, iy: 345 },
              ].map((atk, idx) => {
                const wCycle = ((t * 0.95 + idx * 0.33) % 1);
                const wx = lerp(atk.ox, atk.ix, wCycle);
                const wy = lerp(atk.oy, atk.iy, wCycle);
                const ang = (Math.atan2(atk.iy - atk.oy, atk.ix - atk.ox) * 180) / Math.PI;
                const hit = wCycle > 0.82 ? (wCycle - 0.82) / 0.18 : 0;
                return (
                  <g key={idx}>
                    <line
                      x1={atk.ox}
                      y1={atk.oy}
                      x2={atk.ix}
                      y2={atk.iy}
                      stroke={P.red}
                      strokeWidth={1.8}
                      strokeDasharray="7 7"
                      opacity={0.45}
                    />
                    <g transform={`translate(${wx} ${wy}) rotate(${ang})`}>
                      <path
                        d="M-8,-28 Q14,0 -8,28"
                        fill="none"
                        stroke={P.red}
                        strokeWidth={3.2}
                        opacity={1 - hit * 0.8}
                      />
                    </g>
                    {hit > 0 && (
                      <circle
                        cx={atk.ix}
                        cy={atk.iy}
                        r={12 + hit * 28}
                        fill="none"
                        stroke={P.amberHot}
                        strokeWidth={2.6 * (1 - hit)}
                      />
                    )}
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== THÂN CHÍNH F-15EX EAGLE II CẮT DỌC X-RAY (SCALE 3.1) ==================== */}
          <g filter="url(#sh)">
            <F15Side2D x={JX} y={JY} scale={JS} xray={xrayOpen} backSeatEmpty afterburner={0.42} />
          </g>

          {/* ==================== 1. CẬN CẢNH RADOME MỞ TRONG SUỐT & RADAR AESA AN/APG-82(V)1 ==================== */}
          {aesaReveal > 0.01 && (
            <g opacity={aesaReveal}>
              {/* Vỏ chóp mũi Radome mở trong suốt thấy rõ kết cấu bên trong */}
              <path
                d="M1682.3,602.4 Q1601.7,573 1499.4,560.5 L1493.2,624.1 Q1592.4,619.5 1682.3,602.4 Z"
                fill="#071526"
                fillOpacity={0.86}
                stroke={P.cyan}
                strokeWidth={2.2}
              />
              {/* Gân khung composite dẫn sóng bên trong chóp radome */}
              {[1550, 1595, 1638].map((rx, idx) => {
                const halfH = 26 - idx * 7.5;
                return (
                  <ellipse
                    key={rx}
                    cx={rx}
                    cy={595 + idx * 2}
                    rx={5}
                    ry={halfH}
                    fill="none"
                    stroke={P.gridBright}
                    strokeWidth={1.1}
                    opacity={0.5}
                  />
                );
              })}

              {/* Bộ trao đổi nhiệt & đường ống làm mát bằng chất lỏng xanh lam (Liquid Cooling Loop) */}
              <rect
                x={1450}
                y={576}
                width={34}
                height={34}
                rx={4}
                fill="#0c2542"
                stroke="#29b6f6"
                strokeWidth={1.8}
              />
              {[-10, -4, 2, 8].map((fy) => (
                <line
                  key={fy}
                  x1={1455}
                  y1={593 + fy}
                  x2={1479}
                  y2={593 + fy}
                  stroke="#4fc3f7"
                  strokeWidth={1.5}
                />
              ))}
              {/* Ống dẫn chất lỏng làm mát xanh lam cấp & hồi nối vào mặt sau đĩa AESA */}
              <path
                d="M1484,583 C1498,583 1504,574 1517,575"
                fill="none"
                stroke="#0288d1"
                strokeWidth={5.2}
                strokeLinecap="round"
              />
              <path
                d="M1484,583 C1498,583 1504,574 1517,575"
                fill="none"
                stroke="#64e3ff"
                strokeWidth={2.2}
                strokeDasharray="6 6"
                strokeDashoffset={-t * 36}
              />
              <path
                d="M1521,611 C1506,612 1498,603 1484,603"
                fill="none"
                stroke="#0277bd"
                strokeWidth={5.2}
                strokeLinecap="round"
              />
              <path
                d="M1521,611 C1506,612 1498,603 1484,603"
                fill="none"
                stroke="#9beeff"
                strokeWidth={2.2}
                strokeDasharray="6 6"
                strokeDashoffset={t * 36}
              />

              {/* Vách gá nghiêng & Đĩa mảng pha chủ động Raytheon AN/APG-82(V)1 AESA */}
              <g transform={`translate(${POS_AESA[0]} ${POS_AESA[1]}) rotate(13)`}>
                <ellipse
                  cx={-4}
                  cy={0}
                  rx={12}
                  ry={29}
                  fill="#1a314d"
                  stroke={P.ink}
                  strokeWidth={2}
                />
                <ellipse
                  cx={2}
                  cy={0}
                  rx={11.5}
                  ry={28}
                  fill="#0d2642"
                  stroke={P.cyan}
                  strokeWidth={2.4}
                />
                {/* Hàng nghìn mô-đun thu phát bán dẫn T/R phát sáng lấp lánh theo micro-giây */}
                {[-20, -14, -8, -2, 4, 10, 16, 21].map((my, ri) =>
                  [-5, 0, 5].map((mx, ci) => {
                    if (Math.abs(my) > 19 && ci !== 1) return null;
                    const active = Math.sin(t * 22 + ri * 1.9 + ci * 3.1) > -0.15;
                    return (
                      <circle
                        key={`${ri}_${ci}`}
                        cx={2 + mx}
                        cy={my}
                        r={1.9}
                        fill={active ? P.cyanSoft : P.amber}
                        opacity={active ? 0.95 : 0.65}
                      />
                    );
                  }),
                )}
              </g>
            </g>
          )}

          {/* Chùm tia quạt hẹp AESA lái điện tử trong micro-giây (vẽ nét kép halo + lõi, không dùng filter glow trên tia dài) */}
          {multiBeamP > 0.01 && t < 526.0 && (
            <g opacity={multiBeamP * lerp(1, 0.28, prog(t, 512.5, 516.0))}>
              {scanAngles.map((degAng, idx) => {
                // Nháy đảo pha cực nhanh mô phỏng lái hàng nghìn chùm tia điện tử trong micro-giây
                const wave = Math.sin(t * 19 + idx * 2.35);
                const on = wave > -0.25 ? 0.35 + 0.65 * Math.max(0, wave) : 0.08;
                const rad = ((degAng + Math.sin(t * 14 + idx) * 1.6) * Math.PI) / 180;
                const len = 460 + (idx % 3) * 75;
                const spread = 0.018;
                const xA = POS_AESA[0] + 8;
                const yA = POS_AESA[1];
                const xB1 = xA + Math.cos(rad - spread) * len;
                const yB1 = yA + Math.sin(rad - spread) * len;
                const xB2 = xA + Math.cos(rad + spread) * len;
                const yB2 = yA + Math.sin(rad + spread) * len;
                const xMid = xA + Math.cos(rad) * len;
                const yMid = yA + Math.sin(rad) * len;
                return (
                  <g key={idx} opacity={on}>
                    <polygon
                      points={`${xA},${yA} ${xB1},${yB1} ${xB2},${yB2}`}
                      fill={P.cyan}
                      opacity={0.14}
                    />
                    <line
                      x1={xA}
                      y1={yA}
                      x2={xMid}
                      y2={yMid}
                      stroke={P.cyanSoft}
                      strokeWidth={1.6}
                      opacity={0.72}
                    />
                  </g>
                );
              })}

              {/* 4 Tia khóa cứng đồng thời: 2 mục tiêu bay trên cao + 2 mục tiêu mặt đất bên dưới */}
              {rapidTrackP > 0.01 && (
                <g opacity={rapidTrackP}>
                  {[
                    { pt: airTarget1, col: P.cyan, kind: 'air' as const },
                    { pt: airTarget2, col: P.cyanSoft, kind: 'air' as const },
                    { pt: surfTarget1, col: P.amber, kind: 'surf' as const },
                    { pt: surfTarget2, col: P.amberHot, kind: 'surf' as const },
                  ].map(( tgt, ti) => {
                    const [tx, ty] = tgt.pt;
                    const xA = POS_AESA[0] + 8;
                    const yA = POS_AESA[1];
                    return (
                      <g key={ti}>
                        {/* Halo mờ bản rộng + Lõi khóa sắc lẹm */}
                        <line x1={xA} y1={yA} x2={tx} y2={ty} stroke={tgt.col} strokeWidth={7} opacity={0.16} />
                        <line
                          x1={xA}
                          y1={yA}
                          x2={tx}
                          y2={ty}
                          stroke={tgt.col}
                          strokeWidth={2.2}
                          strokeDasharray="14 6"
                          strokeDashoffset={-t * 140}
                        />
                        {/* Hình chiếu mục tiêu địch & khung khóa AESA */}
                        {tgt.kind === 'air' ? (
                          <g transform={`translate(${tx} ${ty})`}>
                            <polygon
                              points="-26,0 -6,-8 22,-3 26,0 22,3 -6,8"
                              fill="#3b1d2a"
                              stroke={P.red}
                              strokeWidth={1.8}
                            />
                            <polygon points="4,-4 18,-18 24,-18 14,-3" fill="#3b1d2a" stroke={P.red} strokeWidth={1.4} />
                            <rect
                              x={-30}
                              y={-22}
                              width={60}
                              height={44}
                              fill="none"
                              stroke={P.cyan}
                              strokeWidth={2}
                              strokeDasharray="10 6"
                            />
                          </g>
                        ) : (
                          <g transform={`translate(${tx} ${ty})`}>
                            {/* Xe radar / khẩu đội SAM mặt đất */}
                            <rect x={-22} y={-8} width={44} height={14} rx={2} fill={P.samDark} stroke={P.red} strokeWidth={1.6} />
                            <line x1={-6} y1={-8} x2={-18} y2={-24} stroke={P.red} strokeWidth={3.2} />
                            <ellipse cx={8} cy={-16} rx={9} ry={5} fill="none" stroke={P.red} strokeWidth={1.8} />
                            <circle cx={0} cy={-6} r={30} fill="none" stroke={P.amber} strokeWidth={2.1} strokeDasharray="9 5" />
                            <line x1={-36} y1={-6} x2={-22} y2={-6} stroke={P.amber} strokeWidth={2} />
                            <line x1={22} y1={-6} x2={36} y2={-6} stroke={P.amber} strokeWidth={2} />
                          </g>
                        )}
                      </g>
                    );
                  })}
                </g>
              )}
            </g>
          )}

          {/* ==================== 2. ĐƯỜNG CÁP QUANG & SIÊU MÁY TÍNH HONEYWELL ADCP II (87B/S) ==================== */}
          {fiberP > 0.01 && (
            <g>
              {/* Tuyến cáp quang lõi kép phát sáng truyền dữ liệu từ mũi về khoang sau buồng lái */}
              <path
                d={fiberMainPath}
                fill="none"
                stroke={P.cyan}
                strokeWidth={9}
                opacity={0.2 * fiberP}
                strokeLinecap="round"
              />
              <path
                d={fiberMainPath}
                fill="none"
                stroke={P.cyanSoft}
                strokeWidth={3.2}
                strokeLinecap="round"
                {...drawOn(520, fiberP)}
              />
              {/* Các gói xung quang học (photons) chạy dọc sợi cáp quang */}
              {Array.from({ length: 9 }, (_, pi) => {
                const u = ((t * 1.35 + pi / 9) % 1);
                if (u > fiberP) return null;
                const [px, py] = pointOnPolyline(FIBER_MAIN_PTS, u);
                return (
                  <g key={pi}>
                    <circle cx={px} cy={py} r={6.5} fill={P.cyan} opacity={0.28} />
                    <circle cx={px} cy={py} r={2.8} fill="#ffffff" />
                  </g>
                );
              })}
            </g>
          )}

          {/* Khoang siêu máy tính Honeywell ADCP II vàng hổ phách chi tiết cao */}
          {t >= 511.2 && (
            <g transform={`translate(${POS_ADCP[0]} ${POS_ADCP[1]})`} opacity={prog(t, 511.2, 513.2)}>
              {/* Đường mạch đồng dẫn xung quanh bo mạch chủ */}
              {[-24, -12, 0, 12, 24].map((by, bi) => (
                <g key={bi}>
                  <line x1={-56} y1={by * 0.8} x2={56} y2={by * 0.8} stroke={P.amber} strokeWidth={1.3} opacity={0.45} />
                  <circle cx={-56} cy={by * 0.8} r={2.1} fill={P.cyan} />
                  <circle cx={56} cy={by * 0.8} r={2.1} fill={P.cyan} />
                </g>
              ))}

              {/* Khung vỏ hợp kim làm mát & Chip đa nhân mạ vàng ADCP II */}
              <rect
                x={-44}
                y={-27}
                width={88}
                height={54}
                rx={6}
                fill="#102138"
                stroke={P.amber}
                strokeWidth={2.5}
              />
              <rect
                x={-33}
                y={-19}
                width={66}
                height={38}
                rx={3}
                fill="#291f0c"
                stroke={P.amberHot}
                strokeWidth={1.8}
              />

              {/* Lưới 16 nhân xử lý tốc độ 87 tỷ lệnh/giây chớp sáng tất định */}
              {Array.from({ length: 16 }, (_, ci) => {
                const col = ci % 4;
                const row = Math.floor(ci / 4);
                const cx = -24 + col * 16 - 5.5;
                const cy = -13 + row * 9 - 3;
                const hot = Math.sin(t * 28 + ci * 1.7) > -0.2;
                return (
                  <rect
                    key={ci}
                    x={cx}
                    y={cy}
                    width={11}
                    height={6}
                    rx={1}
                    fill={hot ? P.amberHot : P.amber}
                    opacity={hot ? 0.98 : 0.55}
                  />
                );
              })}

              {/* Sóng xung nhịp tỏa tròn khi đạt đỉnh 87 BILLION / SEC (517.78s) */}
              {adcpPulseP > 0.01 &&
                [0, 1, 2].map((ri) => {
                  const cyc = ((t * 1.25 + ri * 0.33) % 1);
                  return (
                    <rect
                      key={ri}
                      x={-44 - cyc * 46}
                      y={-27 - cyc * 32}
                      width={88 + cyc * 92}
                      height={54 + cyc * 64}
                      rx={8 + cyc * 10}
                      fill="none"
                      stroke={ri % 2 === 0 ? P.amberHot : P.cyan}
                      strokeWidth={2.4 * (1 - cyc)}
                      opacity={adcpPulseP * (1 - cyc) * 0.9}
                    />
                  );
                })}
            </g>
          )}

          {/* ==================== 3. MẠNG CÁP TỎA RA ĂNG-TEN THÂN & HAI U ĐỈNH ĐUÔI EPAWSS ==================== */}
          {ewBranchP > 0.01 && (
            <g>
              {EW_BRANCHES.map((b, bi) => (
                <g key={bi}>
                  <path
                    d={ewBranchPaths[bi]}
                    fill="none"
                    stroke={P.amber}
                    strokeWidth={7}
                    opacity={0.18 * ewBranchP}
                  />
                  <path
                    d={ewBranchPaths[bi]}
                    fill="none"
                    stroke={bi < 2 ? P.amberHot : P.cyanSoft}
                    strokeWidth={2.6}
                    {...drawOn(b.len, ewBranchP)}
                  />
                  {/* Hạt xung điều khiển chạy tới từng u ăng-ten */}
                  {[0, 0.5].map((off, oi) => {
                    const u = ((t * 1.1 + off + bi * 0.13) % 1);
                    if (u > ewBranchP) return null;
                    const [px, py] = pointOnPolyline(b.pts, u);
                    return <circle key={oi} cx={px} cy={py} r={3.5} fill="#ffffff" />;
                  })}
                  {/* Đèn nút phát xạ tại mỗi ăng-ten thân và hai u đỉnh đuôi đứng */}
                  {ewBranchP > 0.72 && (
                    <g transform={`translate(${b.to[0]} ${b.to[1]})`}>
                      <circle r={16 + Math.sin(t * 9 + bi) * 4} fill={bi < 2 ? P.amber : P.cyan} opacity={0.28} />
                      <circle r={6.5} fill={bi < 2 ? P.amberHot : P.cyanSoft} stroke={P.ink} strokeWidth={1.5} />
                    </g>
                  )}
                </g>
              ))}
            </g>
          )}
        </svg>
      </Cam2D>

      <Grain opacity={0.38} />

      {/* Tối đa 1 Label trên màn hình tại mọi thời điểm */}
      <Label
        t={t}
        text="AN/APG-82(V)1"
        x={390}
        y={140}
        from={CUE.s18_apg82}
        until={501.8}
        bg={P.cyan}
        fg={P.ink}
      />
      <Label
        t={t}
        text="87 BILLION / SEC"
        x={960}
        y={145}
        from={CUE.s18_adcp87b}
        until={523.5}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S18;
