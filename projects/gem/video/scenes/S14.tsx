// S14 (266.14 – 279.94s, thuần 2D): Bản đồ la bàn chiến thuật 360° quanh Tháp 22
// Hai quạt phòng thủ xanh hướng Bắc (Syria) và Đông (Iraq), trong khi UAV cảm tử Shahed
// vòng sâu xuống nội địa Jordan phía Nam rồi uốn ngược 180° bò chậm lên đánh lén sau lưng căn cứ.
import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { handheld, Label, Layer, useSpring, useT } from '@kit/motion';
import { FONT, lerp, prog } from '@kit/theme';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn, type Pt } from '@lib/2d/path';
import { contours } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { Shahed2D, TacticalGrid2D } from '../local/draw2d';
import { PAL2D } from '../local/palette';

// Tâm căn cứ Tháp 22 trên bản đồ thế giới 2D
const CX = 960;
const CY = 445;

// Đường đồng mức địa hình vùng ngã ba biên giới Rukban (tính 1 lần ở cấp module)
const MAP_CONTOURS = contours('rukban-compass-s14', 2560, 1920, 11, 20, 480);

// Điểm uốn quỹ đạo móc vòng hiểm độc từ hướng Đông–Bắc vòng sâu xuống nội địa Jordan phía Nam
// (vòng ngoặt dưới huy hiệu S tại y = 955 rồi uốn ngược 180° bò thẳng lên lưng phía Nam của Tháp 22)
const HOOK_KEYPOINTS: Pt[] = [
  [1450, 275],
  [1395, 505],
  [1300, 745],
  [1140, 918],
  [975, 962],
  [852, 898],
  [886, 765],
  [948, 645],
  [960, 518],
];

/** Nội suy Catmull-Rom lấy mẫu dày để `drawOn(totalLen, p)` khớp tuyệt đối 100% với vị trí & góc mũi `Shahed2D`. */
function buildSampledSpline(pts: Pt[], segPerSpan = 36) {
  const P: Pt[] = [pts[0], ...pts, pts[pts.length - 1]];
  const samples: Pt[] = [];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    const n = i === P.length - 3 ? segPerSpan : segPerSpan - 1;
    for (let s = 0; s <= n; s++) {
      const u = s / segPerSpan;
      const v = 1 - u;
      const x =
        v * v * v * p1[0] +
        3 * v * v * u * c1[0] +
        3 * v * u * u * c2[0] +
        u * u * u * p2[0];
      const y =
        v * v * v * p1[1] +
        3 * v * v * u * c1[1] +
        3 * v * u * u * c2[1] +
        u * u * u * p2[1];
      samples.push([x, y]);
    }
  }
  const cum: number[] = [0];
  for (let i = 1; i < samples.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(samples[i][0] - samples[i - 1][0], samples[i][1] - samples[i - 1][1]));
  }
  const d = 'M' + samples.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');
  return { samples, cum, totalLen: cum[cum.length - 1], d };
}

const HOOK_SPLINE = buildSampledSpline(HOOK_KEYPOINTS, 36);

function pointAtSpline(p: number): { x: number; y: number; rot: number } {
  const clamped = Math.max(0, Math.min(1, p));
  const target = clamped * HOOK_SPLINE.totalLen;
  const { samples, cum } = HOOK_SPLINE;
  let idx = 0;
  while (idx < cum.length - 2 && cum[idx + 1] < target) idx++;
  const segLen = Math.max(1e-4, cum[idx + 1] - cum[idx]);
  const f = (target - cum[idx]) / segLen;
  const x = lerp(samples[idx][0], samples[idx + 1][0], f);
  const y = lerp(samples[idx][1], samples[idx + 1][1], f);
  const i0 = Math.max(0, idx - 1);
  const i1 = Math.min(samples.length - 1, idx + 2);
  const rot = (Math.atan2(samples[i1][1] - samples[i0][1], samples[i1][0] - samples[i0][0]) * 180) / Math.PI;
  return { x, y, rot };
}

/** Tạo cung hình quạt theo góc phương vị la bàn (0° = Bắc/-Y, 90° = Đông/+X, 180° = Nam/+Y). */
function sectorPath(cx: number, cy: number, rIn: number, rOut: number, azStartDeg: number, azEndDeg: number): string {
  const toXY = (r: number, az: number): Pt => {
    const rad = ((az - 90) * Math.PI) / 180;
    return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r];
  };
  const [x0, y0] = toXY(rOut, azStartDeg);
  const [x1, y1] = toXY(rOut, azEndDeg);
  const [x2, y2] = toXY(rIn, azEndDeg);
  const [x3, y3] = toXY(rIn, azStartDeg);
  const large = Math.abs(azEndDeg - azStartDeg) > 180 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${rOut} ${rOut} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)} L${x2.toFixed(1)} ${y2.toFixed(1)} A${rIn} ${rIn} 0 ${large} 0 ${x3.toFixed(1)} ${y3.toFixed(1)} Z`;
}

/** Tạo cung tròn hở theo phương vị la bàn. */
function arcAzPath(cx: number, cy: number, r: number, azStartDeg: number, azEndDeg: number): string {
  const rad0 = ((azStartDeg - 90) * Math.PI) / 180;
  const rad1 = ((azEndDeg - 90) * Math.PI) / 180;
  const x0 = cx + Math.cos(rad0) * r;
  const y0 = cy + Math.sin(rad0) * r;
  const x1 = cx + Math.cos(rad1) * r;
  const y1 = cy + Math.sin(rad1) * r;
  const large = Math.abs(azEndDeg - azStartDeg) > 180 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
}

const S14: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Chuyển động Cam2D: dịch sớm và mượt xuống nửa Nam từ 272.4 -> 275.4s với zoom 0.97
  // để trọn vẹn cả 2 quạt phòng thủ Bắc-Đông lẫn đáy vòng móc phía Nam y = 962 luôn nằm gọn trong khung!
  const panSouth = prog(t, 272.4, 275.4);
  const camX = lerp(980, 995, panSouth);
  const camY = lerp(440, 565, panSouth);
  const camZoom = lerp(1.01, 0.97, panSouth);
  const shake = handheld(t, 2.0, 's14-compass');

  // Tiến độ bật 2 quạt phòng thủ hướng Bắc & hướng Đông khớp CUE.s14_north_east (270.30)
  const northAppear = useSpring(t, CUE.s14_north_east - 1.25, 13, 130);
  const eastAppear = useSpring(t, CUE.s14_north_east + 0.5, 13, 130);
  const compassAppear = prog(t, 266.14, CUE.s14_feint + 0.8);

  // Tiến độ đường bay móc vòng hướng Nam khớp CUE.s14_south_hook (273.80) & CUE.s14_jordan_rear (278.16):
  // 273.25 -> 275.70s: vòng sâu xuống đất Jordan (0 -> 0.65)
  // 275.70 -> 279.75s: bò chậm chạp từ hướng Nam 180° thẳng lên sau lưng Tháp 22 (0.65 -> 0.99)
  const tHookStart = CUE.s14_south_hook - 0.55;
  const pLoop = prog(t, tHookStart, 275.7, Easing.out(Easing.cubic));
  const pCreep = prog(t, 275.7, 279.75, Easing.inOut(Easing.quad));
  const hookProg = t < 275.7 ? pLoop * 0.65 : 0.65 + pCreep * 0.34;
  const showHook = t >= tHookStart;
  const tip = pointAtSpline(hookProg);

  // Góc tia quét cảnh giới chỉ quét qua lại trong vùng Bắc–Đông (-36° .. +116°), bỏ trống hoàn toàn hướng Nam!
  const radarScanAz = 40 + 72 * Math.sin(t * 1.45);
  const scanRad = ((radarScanAz - 90) * Math.PI) / 180;

  // Nhịp cảnh báo đỏ ở lưng phía Nam căn cứ khi Shahed áp sát (CUE.s14_jordan_rear = 278.16)
  const rearAlert = prog(t, CUE.s14_jordan_rear - 1.4, 279.5);

  return (
    <AbsoluteFill style={{ background: PAL2D.bgNight }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <Layer>
          <Defs2D shadow="rgba(6, 12, 22, 0.55)" />
          <defs>
            <radialGradient id="s14-bgGrad" cx="50%" cy="45%" r="65%">
              <stop offset="0%" stopColor="#183354" />
              <stop offset="65%" stopColor="#0f2036" />
              <stop offset="100%" stopColor="#081220" />
            </radialGradient>
            <radialGradient id="s14-sectorBlue" cx="50%" cy="50%" r="50%">
              <stop offset="10%" stopColor={PAL2D.usMid} stopOpacity="0.08" />
              <stop offset="70%" stopColor={PAL2D.usMid} stopOpacity="0.32" />
              <stop offset="100%" stopColor={PAL2D.usHi} stopOpacity="0.50" />
            </radialGradient>
            <radialGradient id="s14-rearRed" cx="50%" cy="50%" r="50%">
              <stop offset="15%" stopColor={PAL2D.threatMid} stopOpacity="0.06" />
              <stop offset="82%" stopColor={PAL2D.threatMid} stopOpacity="0.34" />
              <stop offset="100%" stopColor={PAL2D.threatHi} stopOpacity="0.52" />
            </radialGradient>
          </defs>

          {/* 1. Nền bản đồ đêm & 3 mảng lãnh thổ Ngã ba biên giới Syria (Bắc) - Iraq (Đông) - Jordan (Nam) */}
          <rect x={-320} y={-420} width={2560} height={1960} fill="url(#s14-bgGrad)" />

          {/* Mảng lãnh thổ SYRIA (Phía Bắc / Tây-Bắc biên giới) */}
          <polygon
            points="-320,-420 1440,-420 1105,345 760,412 -320,635"
            fill="#132946"
            opacity={0.78}
          />
          {/* Mảng lãnh thổ IRAQ (Phía Đông / Đông-Bắc biên giới) */}
          <polygon
            points="1440,-420 2240,-420 2240,960 1105,345"
            fill="#172d49"
            opacity={0.75}
          />
          {/* Mảng lãnh thổ nội địa JORDAN (Toàn bộ nửa Nam & Tây-Nam sau lưng Tháp 22) */}
          <polygon
            points="-320,635 760,412 1105,345 2240,960 2240,1540 -320,1540"
            fill="#1e2c3b"
            opacity={0.62}
          />

          {/* 2. Đường đồng mức địa hình sa mạc Rukban nổi khối rõ nét */}
          <g transform="translate(-320 -380)" pointerEvents="none">
            {MAP_CONTOURS.map(({ level, d }) => (
              <path
                key={level}
                d={d}
                fill="none"
                stroke={level % 3 === 0 ? PAL2D.sandHi : PAL2D.grid}
                strokeWidth={level % 3 === 0 ? 1.75 : 1.05}
                opacity={level % 3 === 0 ? 0.34 : 0.22}
              />
            ))}
          </g>

          {/* Lưới tọa độ quân sự */}
          <TacticalGrid2D x={-320} y={-380} w={2560} h={1920} step={80} major={320} opacity={0.24} />

          {/* 3. Đường biên giới quốc tế Ngã ba Jordan – Syria – Iraq (giao điểm Đông-Bắc Tháp 22 tại [1105, 345]) */}
          <g>
            <path
              d="M-260 622 L760 412 L1105 345 L2160 916 M1105 345 L1415 -360"
              fill="none"
              stroke={PAL2D.sandHi}
              strokeWidth={9}
              opacity={0.14}
            />
            <path
              d="M-260 622 L760 412 L1105 345 L2160 916"
              fill="none"
              stroke={PAL2D.sandHi}
              strokeWidth={2.8}
              strokeDasharray="16 8 4 8"
              opacity={0.7}
            />
            <path
              d="M1105 345 L1415 -360"
              fill="none"
              stroke={PAL2D.sandHi}
              strokeWidth={2.8}
              strokeDasharray="16 8 4 8"
              opacity={0.7}
            />
            <circle cx={1105} cy={345} r={6.5} fill={PAL2D.sandHi} stroke={PAL2D.ink} strokeWidth={2} opacity={0.9} />
          </g>

          {/* Ký hiệu chìm tên 3 vùng lãnh thổ quanh ngã ba biên giới */}
          <g fontFamily={FONT} fontWeight={700} letterSpacing={8} opacity={0.32} pointerEvents="none">
            <text x={690} y={165} textAnchor="middle" fill={PAL2D.chalk} fontSize={26}>
              SYRIA
            </text>
            <text x={1560} y={375} textAnchor="middle" fill={PAL2D.chalk} fontSize={26}>
              IRAQ
            </text>
            <text x={630} y={770} textAnchor="middle" fill={PAL2D.sandHi} fontSize={28}>
              JORDAN
            </text>
          </g>

          {/* 4. VÒNG LA BÀN CHIẾN THUẬT 360° LẤY THÁP 22 (CX, CY) LÀM TÂM */}
          <g opacity={compassAppear}>
            {[130, 255, 380, 515].map((r, idx) => (
              <circle
                key={r}
                cx={CX}
                cy={CY}
                r={r}
                fill="none"
                stroke={idx === 2 ? PAL2D.chalk : PAL2D.grid}
                strokeWidth={idx === 2 ? 2.5 : 1.35}
                strokeDasharray={idx === 1 || idx === 3 ? '7 7' : undefined}
                opacity={idx === 2 ? 0.56 : 0.36}
              />
            ))}

            <line x1={CX} y1={CY - 545} x2={CX} y2={CY + 585} stroke={PAL2D.grid} strokeWidth={1.4} opacity={0.46} />
            <line x1={CX - 565} y1={CY} x2={CX + 565} y2={CY} stroke={PAL2D.grid} strokeWidth={1.4} opacity={0.46} />

            {/* 72 vạch chia độ quanh vòng la bàn chính R = 380 px */}
            {Array.from({ length: 72 }, (_, i) => {
              const degVal = i * 5;
              const rad = ((degVal - 90) * Math.PI) / 180;
              const isCard = degVal % 90 === 0;
              const isMajor = degVal % 30 === 0;
              const r0 = 380;
              const r1 = isCard ? 405 : isMajor ? 397 : 389;
              return (
                <g key={degVal}>
                  <line
                    x1={CX + Math.cos(rad) * r0}
                    y1={CY + Math.sin(rad) * r0}
                    x2={CX + Math.cos(rad) * r1}
                    y2={CY + Math.sin(rad) * r1}
                    stroke={isCard ? PAL2D.chalk : PAL2D.muted}
                    strokeWidth={isCard ? 3 : isMajor ? 1.8 : 1}
                    opacity={isCard ? 0.94 : isMajor ? 0.68 : 0.38}
                  />
                  {isMajor && !isCard && (
                    <text
                      x={CX + Math.cos(rad) * 417}
                      y={CY + Math.sin(rad) * 417 + 5}
                      textAnchor="middle"
                      fill={PAL2D.muted}
                      fontSize={15}
                      fontFamily="monospace"
                      fontWeight={700}
                      opacity={0.68}
                    >
                      {String(degVal).padStart(3, '0')}°
                    </text>
                  )}
                </g>
              );
            })}

            {/* 4 Huy hiệu phương hướng chính N / E / S / W */}
            {(
              [
                { label: 'N', az: 0, col: PAL2D.usHi },
                { label: 'E', az: 90, col: PAL2D.usHi },
                { label: 'S', az: 180, col: rearAlert > 0.1 ? PAL2D.threatHi : PAL2D.amberHi },
                { label: 'W', az: 270, col: PAL2D.muted },
              ] as const
            ).map(({ label, az, col }) => {
              const rad = ((az - 90) * Math.PI) / 180;
              const bx = CX + Math.cos(rad) * 435;
              const by = CY + Math.sin(rad) * 435;
              return (
                <g key={label} transform={`translate(${bx} ${by})`} filter="url(#sh)">
                  <circle r={23} fill={PAL2D.bgConsole} stroke={col} strokeWidth={2.6} />
                  <text
                    x={0}
                    y={8}
                    textAnchor="middle"
                    fill={col}
                    fontSize={22}
                    fontWeight={700}
                    fontFamily={FONT}
                  >
                    {label}
                  </text>
                </g>
              );
            })}
          </g>

          {/* 5. HAI HÌNH QUẠT PHÒNG THỦ XANH ĐẬM HƯỚNG BẮC (SYRIA) & HƯỚNG ĐÔNG (IRAQ) */}
          {northAppear > 0.01 && (
            <g opacity={Math.min(1, northAppear)}>
              <path
                d={sectorPath(CX, CY, 52, 380 * Math.min(1.04, northAppear), -38, 34)}
                fill="url(#s14-sectorBlue)"
                stroke={PAL2D.usHi}
                strokeWidth={2.8}
              />
              <path
                d={arcAzPath(CX, CY, 255, -34, 30)}
                fill="none"
                stroke={PAL2D.usHi}
                strokeWidth={2}
                strokeDasharray="10 6"
                opacity={0.74}
              />
              {([-16, 14] as const).map((az) => {
                const rad = ((az - 90) * Math.PI) / 180;
                const xStart = CX + Math.cos(rad) * 342;
                const yStart = CY + Math.sin(rad) * 342;
                const xEnd = CX + Math.cos(rad) * 138;
                const yEnd = CY + Math.sin(rad) * 138;
                const degRot = (Math.atan2(yEnd - yStart, xEnd - xStart) * 180) / Math.PI;
                return (
                  <g key={az} opacity={0.88}>
                    <line
                      x1={xStart}
                      y1={yStart}
                      x2={xEnd}
                      y2={yEnd}
                      stroke={PAL2D.usHi}
                      strokeWidth={3.2}
                      strokeDasharray="11 8"
                    />
                    <polygon
                      points="0,0 -16,-7 -16,7"
                      fill={PAL2D.usHi}
                      transform={`translate(${xEnd} ${yEnd}) rotate(${degRot})`}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {eastAppear > 0.01 && (
            <g opacity={Math.min(1, eastAppear)}>
              <path
                d={sectorPath(CX, CY, 52, 380 * Math.min(1.04, eastAppear), 50, 118)}
                fill="url(#s14-sectorBlue)"
                stroke={PAL2D.usHi}
                strokeWidth={2.8}
              />
              <path
                d={arcAzPath(CX, CY, 255, 54, 114)}
                fill="none"
                stroke={PAL2D.usHi}
                strokeWidth={2}
                strokeDasharray="10 6"
                opacity={0.74}
              />
              {([70, 98] as const).map((az) => {
                const rad = ((az - 90) * Math.PI) / 180;
                const xStart = CX + Math.cos(rad) * 342;
                const yStart = CY + Math.sin(rad) * 342;
                const xEnd = CX + Math.cos(rad) * 138;
                const yEnd = CY + Math.sin(rad) * 138;
                const degRot = (Math.atan2(yEnd - yStart, xEnd - xStart) * 180) / Math.PI;
                return (
                  <g key={az} opacity={0.88}>
                    <line
                      x1={xStart}
                      y1={yStart}
                      x2={xEnd}
                      y2={yEnd}
                      stroke={PAL2D.usHi}
                      strokeWidth={3.2}
                      strokeDasharray="11 8"
                    />
                    <polygon
                      points="0,0 -16,-7 -16,7"
                      fill={PAL2D.usHi}
                      transform={`translate(${xEnd} ${yEnd}) rotate(${degRot})`}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Tia quét cảnh giới xanh chỉ quét quanh nửa Bắc–Đông */}
          {northAppear > 0.3 && (
            <line
              x1={CX}
              y1={CY}
              x2={CX + Math.cos(scanRad) * 377}
              y2={CY + Math.sin(scanRad) * 377}
              stroke={PAL2D.ewTeal}
              strokeWidth={2.5}
              opacity={0.58}
            />
          )}

          {/* 6. KHOẢNG TRỐNG HƯỚNG NAM KHÔNG PHÒNG BỊ & CUNG CẢNH BÁO ĐỎ SAU LƯNG CĂN CỨ */}
          <path
            d={arcAzPath(CX, CY, 380, 138, 222)}
            fill="none"
            stroke={rearAlert > 0.05 ? PAL2D.threatMid : PAL2D.muted}
            strokeWidth={rearAlert > 0.05 ? 4.2 : 2.2}
            strokeDasharray="8 10"
            opacity={rearAlert > 0.05 ? 0.9 : 0.38}
          />
          {rearAlert > 0.02 && (
            <g opacity={rearAlert * (0.7 + 0.3 * Math.sin(t * 8))}>
              <path d={sectorPath(CX, CY, 50, 228, 152, 208)} fill="url(#s14-rearRed)" />
              <path
                d={arcAzPath(CX, CY, 130, 148, 212)}
                fill="none"
                stroke={PAL2D.threatHi}
                strokeWidth={3.5}
                strokeDasharray="10 6"
              />
            </g>
          )}

          {/* 7. QUỸ ĐẠO MÓC VÒNG HƯỚNG NAM ĐỎ CAM (NÉT KÉP HALO + LÕI) */}
          {showHook && (
            <g>
              <circle
                cx={HOOK_KEYPOINTS[0][0]}
                cy={HOOK_KEYPOINTS[0][1]}
                r={10}
                fill={PAL2D.threatMid}
                opacity={0.38}
              />
              <circle
                cx={HOOK_KEYPOINTS[0][0]}
                cy={HOOK_KEYPOINTS[0][1]}
                r={4.8}
                fill={PAL2D.amberHi}
              />

              {/* Halo đỏ cam mờ bản rộng */}
              <path
                d={HOOK_SPLINE.d}
                fill="none"
                stroke={PAL2D.threatMid}
                strokeWidth={16}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.28}
                {...drawOn(HOOK_SPLINE.totalLen, hookProg)}
              />
              {/* Lõi quỹ đạo đỏ cam sáng sắc nét */}
              <path
                d={HOOK_SPLINE.d}
                fill="none"
                stroke={PAL2D.threatHi}
                strokeWidth={5}
                strokeLinecap="round"
                strokeLinejoin="round"
                {...drawOn(HOOK_SPLINE.totalLen, hookProg)}
              />
              {/* Lõi tim vàng sáng sắc nét dọc trục đường bay */}
              <path
                d={HOOK_SPLINE.d}
                fill="none"
                stroke={PAL2D.amberHi}
                strokeWidth={1.8}
                strokeLinecap="round"
                opacity={0.9}
                {...drawOn(HOOK_SPLINE.totalLen, hookProg)}
              />

              {/* Vòng định vị tại đáy điểm uốn 180° trong nội địa Jordan */}
              {hookProg > 0.54 && (
                <g transform="translate(975 962)" opacity={prog(t, 274.8, 275.8) * 0.78}>
                  <circle r={18 + 8 * Math.sin(t * 4)} fill="none" stroke={PAL2D.amberMid} strokeWidth={2} strokeDasharray="5 5" />
                  <circle r={5} fill={PAL2D.amberHi} />
                </g>
              )}

              {/* Chiếc Shahed2D (nhìn từ đỉnh đầu) bám chính xác 100% ở đầu mũi đường bay */}
              <g filter="url(#sh)">
                <Shahed2D
                  x={tip.x}
                  y={tip.y}
                  rot={tip.rot}
                  scale={0.65}
                  view="top"
                  propAngle={t * 34}
                  tint="threat"
                />
              </g>
            </g>
          )}

          {/* 8. BIỂU TƯỢNG CĂN CỨ THÁP 22 TẠI TÂM LA BÀN (CX, CY) */}
          <g transform={`translate(${CX} ${CY})`} filter="url(#sh)">
            <circle r={46} fill={PAL2D.bgConsole} stroke={PAL2D.usMid} strokeWidth={2.8} />
            <rect
              x={-24}
              y={-20}
              width={48}
              height={40}
              rx={5}
              fill={PAL2D.panel}
              stroke={PAL2D.sandHi}
              strokeWidth={2.2}
            />
            {[-12, 0, 12].map((ry) => (
              <g key={ry}>
                <rect x={-16} y={ry - 3.5} width={13} height={7} rx={1.5} fill={PAL2D.usHi} stroke={PAL2D.ink} strokeWidth={1.2} />
                <rect x={3} y={ry - 3.5} width={13} height={7} rx={1.5} fill={PAL2D.usHi} stroke={PAL2D.ink} strokeWidth={1.2} />
              </g>
            ))}
            <circle cx={0} cy={0} r={4.5} fill={PAL2D.amberHi} stroke={PAL2D.ink} strokeWidth={1.5} />
          </g>
        </Layer>
      </Cam2D>

      {/* Lớp hạt giấy/phim hồ sơ chiến thuật */}
      <Grain opacity={0.42} />

      {/* Nhãn <Label> đặt góc trái-dưới vùng đất Jordan thoáng sạch, tuyệt đối không đè lên đường vòng móc hay huy hiệu S */}
      <Label
        t={t}
        text="HƯỚNG NAM · JORDAN"
        x={380}
        y={920}
        from={275.4}
        until={279.5}
        size={46}
        bg={PAL2D.threatMid}
        fg={PAL2D.paper}
      />
    </AbsoluteFill>
  );
};

export default S14;
