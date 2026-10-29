import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, FONT, lerp, prog } from '@kit/theme';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Side2D, F35Side2D } from '../local/jets2d';

// Phép chiếu trục đo Isometric CAD 3D -> 2D chuẩn kỹ thuật hàng không
// x: trục dọc thân (+9.3m mũi -> -8.6m đuôi), y: trục cao (+Y hướng lên), z: sải cánh (-6.5m trái -> +6.5m phải)
const COS_A = Math.cos((27 * Math.PI) / 180);
const SIN_A = Math.sin((27 * Math.PI) / 180);
const ISO_OX = 955;
const ISO_OY = 395;
const ISO_S = 36;

type Pt2 = [number, number];

const iso = (x: number, y: number, z: number): Pt2 => [
  ISO_OX + (-x * COS_A + z * COS_A) * ISO_S,
  ISO_OY + (x * SIN_A * 0.72 + z * SIN_A * 0.72 - y * 0.94) * ISO_S,
];

const polyPts = (pts3: [number, number, number][]) =>
  pts3
    .map(([x, y, z]) => {
      const [px, py] = iso(x, y, z);
      return `${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(' ');

// Danh sách trạm vách ngăn thân hợp kim (từ đuôi lên mũi để vẽ chuẩn thứ tự xa -> gần)
const BULKHEAD_STATIONS = [
  { x: -6.8, rx: 1.05, ry: 0.62 },
  { x: -4.9, rx: 1.22, ry: 0.72 },
  { x: -3.0, rx: 1.28, ry: 0.78 },
  { x: -1.1, rx: 1.24, ry: 0.8 },
  { x: 0.8, rx: 1.12, ry: 0.78 },
  { x: 2.7, rx: 0.92, ry: 0.76 },
  { x: 4.5, rx: 0.74, ry: 0.68 },
  { x: 6.2, rx: 0.56, ry: 0.54 },
];

// Danh sách sườn cánh nguyên khối phay CNC (Monolithic CNC Wing Ribs)
const WING_RIBS = [
  { u: 0.0, zAbs: 1.42, xLE: 2.15, xTE: -4.35, h: 0.28 },
  { u: 0.18, zAbs: 2.28, xLE: 1.22, xTE: -4.38, h: 0.24 },
  { u: 0.36, zAbs: 3.18, xLE: 0.25, xTE: -4.41, h: 0.21 },
  { u: 0.54, zAbs: 4.12, xLE: -0.76, xTE: -4.44, h: 0.17 },
  { u: 0.72, zAbs: 5.06, xLE: -1.78, xTE: -4.47, h: 0.14 },
  { u: 0.88, zAbs: 5.92, xLE: -2.72, xTE: -4.49, h: 0.11 },
  { u: 1.0, zAbs: 6.52, xLE: -3.42, xTE: -4.48, h: 0.09 },
];

// Vẽ 1 vách ngăn thân hợp kim có lỗ khoan định vị laser sẵn (Determinant Assembly Bulkhead)
const IsoBulkhead: React.FC<{
  x: number;
  rz: number;
  ry: number;
  dy: number;
  lockGlow: number;
}> = ({ x, rz, ry, dy, lockGlow }) => {
  const seg = 20;
  const frontRing: [number, number, number][] = [];
  const backRing: [number, number, number][] = [];
  const dx = 0.22;
  for (let i = 0; i < seg; i++) {
    const a = (i / seg) * Math.PI * 2;
    const py = 0.45 + dy + Math.cos(a) * ry;
    const pz = Math.sin(a) * rz;
    frontRing.push([x, py, pz]);
    backRing.push([x - dx, py, pz]);
  }

  // 6 tâm lỗ khoan định vị sẵn quanh vành vách ngăn
  const holeAngles = [-0.68, 0.68, -1.55, 1.55, -2.45, 2.45];

  return (
    <g>
      {/* Độ dày thành sau vách ngăn */}
      <polygon
        points={polyPts(backRing)}
        fill={P.f15Dark}
        stroke={P.ink}
        strokeWidth={1.6}
      />
      {/* Thành mặt trước hợp kim nhôm-titan */}
      <polygon
        points={polyPts(frontRing)}
        fill={P.f15Mid}
        fillOpacity={0.86}
        stroke={P.ink}
        strokeWidth={1.9}
      />
      {/* Khoang rỗng bên trong + thanh giằng chữ thập chịu G cao */}
      <polygon
        points={polyPts(
          frontRing.map(([fx, fy, fz]) => [
            fx,
            0.45 + dy + (fy - (0.45 + dy)) * 0.64,
            fz * 0.64,
          ]),
        )}
        fill="#0b1a2f"
        stroke={P.f15Light}
        strokeWidth={1.3}
      />
      <line
        x1={iso(x, 0.45 + dy - ry * 0.64, 0)[0]}
        y1={iso(x, 0.45 + dy - ry * 0.64, 0)[1]}
        x2={iso(x, 0.45 + dy + ry * 0.64, 0)[0]}
        y2={iso(x, 0.45 + dy + ry * 0.64, 0)[1]}
        stroke={P.f15Light}
        strokeWidth={2.2}
      />
      <line
        x1={iso(x, 0.45 + dy, -rz * 0.64)[0]}
        y1={iso(x, 0.45 + dy, -rz * 0.64)[1]}
        x2={iso(x, 0.45 + dy, rz * 0.64)[0]}
        y2={iso(x, 0.45 + dy, rz * 0.64)[1]}
        stroke={P.f15Light}
        strokeWidth={2.2}
      />

      {/* Lỗ khoan laser vi mô khớp định vị */}
      {holeAngles.map((ha, k) => {
        const hy = 0.45 + dy + Math.cos(ha) * ry * 0.83;
        const hz = Math.sin(ha) * rz * 0.83;
        const [hx, hy2] = iso(x, hy, hz);
        return (
          <g key={k}>
            {lockGlow > 0.02 && (
              <circle
                cx={hx}
                cy={hy2}
                r={7 + 4 * lockGlow}
                fill="none"
                stroke={P.green}
                strokeWidth={1.8}
                opacity={0.75 * lockGlow}
              />
            )}
            <circle
              cx={hx}
              cy={hy2}
              r={3.3}
              fill={lockGlow > 0.1 ? P.green : P.cyan}
              stroke={P.ink}
              strokeWidth={1}
            />
          </g>
        );
      })}
    </g>
  );
};

// Vẽ bộ khung xương cánh nguyên khối CNC (sườn dọc + sườn ngang có hốc giảm trọng lượng)
const IsoWingSkeleton: React.FC<{
  side: -1 | 1;
  exp: number;
  highlightCnc: number;
  lockGlow: number;
}> = ({ side, exp, highlightCnc, lockGlow }) => {
  const dz = side * 3.1 * exp;
  const dy = 0.55 * exp;
  const yBase = 0.58 + dy;

  // 3 xà dọc chính của cánh (Main Wing Spars)
  const sparFracs = [0.18, 0.52, 0.84];

  return (
    <g>
      {/* Tia gióng laser Cyan từ chân cánh vào vách ngăn thân khi đang tách rời */}
      {exp > 0.015 &&
        [1.1, -0.9, -2.9].map((lx, idx) => {
          const p0 = iso(lx, 0.58, side * 1.32);
          const p1 = iso(lx, yBase, side * 1.42 + dz);
          return (
            <g key={idx}>
              <line
                x1={p0[0]}
                y1={p0[1]}
                x2={p1[0]}
                y2={p1[1]}
                stroke={P.cyan}
                strokeWidth={5}
                opacity={0.18}
              />
              <line
                x1={p0[0]}
                y1={p0[1]}
                x2={p1[0]}
                y2={p1[1]}
                stroke={P.cyan}
                strokeWidth={1.9}
                strokeDasharray="6 4"
              />
            </g>
          );
        })}

      {/* 3 thanh xà cánh hợp kim chạy từ gốc cánh ra mấu đầu cánh Station 1 & 9 */}
      {sparFracs.map((sf, sIdx) => {
        const root = WING_RIBS[0];
        const tip = WING_RIBS[WING_RIBS.length - 1];
        const rx = lerp(root.xLE, root.xTE, sf);
        const tx = lerp(tip.xLE, tip.xTE, sf);
        const topFace: [number, number, number][] = [
          [rx + 0.09, yBase + root.h * 0.5, side * root.zAbs + dz],
          [tx + 0.07, yBase + tip.h * 0.5, side * tip.zAbs + dz],
          [tx - 0.07, yBase + tip.h * 0.5, side * tip.zAbs + dz],
          [rx - 0.09, yBase + root.h * 0.5, side * root.zAbs + dz],
        ];
        const sideFace: [number, number, number][] = [
          [rx + 0.09, yBase + root.h * 0.5, side * root.zAbs + dz],
          [tx + 0.07, yBase + tip.h * 0.5, side * tip.zAbs + dz],
          [tx + 0.07, yBase - tip.h * 0.5, side * tip.zAbs + dz],
          [rx + 0.09, yBase - root.h * 0.5, side * root.zAbs + dz],
        ];
        return (
          <g key={sIdx}>
            <polygon
              points={polyPts(sideFace)}
              fill={P.f15Dark}
              stroke={P.ink}
              strokeWidth={1.4}
            />
            <polygon
              points={polyPts(topFace)}
              fill={highlightCnc > 0.1 ? P.cyanSoft : P.f15Light}
              stroke={P.ink}
              strokeWidth={1.5}
            />
          </g>
        );
      })}

      {/* 7 sườn cánh nguyên khối phay CNC (Monolithic Wing Ribs) + lỗ khoan định vị */}
      {WING_RIBS.map((rib, rIdx) => {
        const z = side * rib.zAbs + dz;
        const ribWall: [number, number, number][] = [
          [rib.xLE, yBase + rib.h * 0.42, z],
          [lerp(rib.xLE, rib.xTE, 0.35), yBase + rib.h * 0.65, z],
          [rib.xTE, yBase + rib.h * 0.32, z],
          [rib.xTE, yBase - rib.h * 0.32, z],
          [lerp(rib.xLE, rib.xTE, 0.35), yBase - rib.h * 0.55, z],
          [rib.xLE, yBase - rib.h * 0.35, z],
        ];
        const ribTop: [number, number, number][] = [
          [rib.xLE, yBase + rib.h * 0.42, z],
          [rib.xTE, yBase + rib.h * 0.32, z],
          [rib.xTE, yBase + rib.h * 0.32, z + side * 0.11],
          [rib.xLE, yBase + rib.h * 0.42, z + side * 0.11],
        ];
        const isTip = rIdx === WING_RIBS.length - 1;

        return (
          <g key={rIdx}>
            <polygon
              points={polyPts(ribWall)}
              fill={isTip ? P.amber : P.f15Mid}
              stroke={P.ink}
              strokeWidth={1.6}
            />
            <polygon
              points={polyPts(ribTop)}
              fill={isTip ? P.amberHot : P.f15Light}
              stroke={P.ink}
              strokeWidth={1.3}
            />
            {/* Các ô khoét rỗng giảm trọng lượng phay CNC dọc sườn cánh */}
            {[0.25, 0.5, 0.74].map((pf, k) => {
              const px3 = lerp(rib.xLE, rib.xTE, pf);
              const [cx, cy] = iso(px3, yBase, z);
              return (
                <circle
                  key={k}
                  cx={cx}
                  cy={cy}
                  r={Math.max(2, (1 - rib.u * 0.55) * 3.8)}
                  fill={lockGlow > 0.1 ? P.green : '#0a192e'}
                  stroke={P.cyan}
                  strokeWidth={1}
                />
              );
            })}
          </g>
        );
      })}

      {/* Viền mép trước & mép sau cánh nối liền khối */}
      <polyline
        points={polyPts(
          WING_RIBS.map((r) => [r.xLE, yBase + r.h * 0.35, side * r.zAbs + dz]),
        )}
        fill="none"
        stroke={P.cyanSoft}
        strokeWidth={2.2}
      />
      <polyline
        points={polyPts(
          WING_RIBS.map((r) => [r.xTE, yBase + r.h * 0.25, side * r.zAbs + dz]),
        )}
        fill="none"
        stroke={P.f15Light}
        strokeWidth={1.8}
      />
    </g>
  );
};

// Vẽ dầm thân gia cường dày gấp đôi (Reinforced Double-Thick Longeron) màu vàng hổ phách
const IsoReinforcedLongeron: React.FC<{
  zSide: -1 | 1;
  exp: number;
  lockGlow: number;
}> = ({ zSide, exp, lockGlow }) => {
  const z = zSide * 0.58;
  const y = 1.18 + 2.3 * exp;
  const h = 0.22; // Dày gấp đôi longeron cũ
  const w = 0.16;
  const x0 = -6.8;
  const x1 = 6.2;

  const topFlange: [number, number, number][] = [
    [x1, y + h, z - w],
    [x0, y + h, z - w],
    [x0, y + h, z + w],
    [x1, y + h, z + w],
  ];
  const outerWeb: [number, number, number][] = [
    [x1, y + h, z + w],
    [x0, y + h, z + w],
    [x0, y, z + w],
    [x1, y, z + w],
  ];
  const endCap: [number, number, number][] = [
    [x1, y + h, z - w],
    [x1, y + h, z + w],
    [x1, y, z + w],
    [x1, y, z - w],
  ];

  return (
    <g>
      {/* Tia laser Cyan gióng thẳng từ lỗ khoan trên dầm longeron xuống đúng tai vách ngăn */}
      {exp > 0.015 &&
        BULKHEAD_STATIONS.map((bh, idx) => {
          const pTop = iso(bh.x, y, z);
          const pBot = iso(bh.x, 0.45 + bh.ry * 0.78, z);
          return (
            <line
              key={idx}
              x1={pTop[0]}
              y1={pTop[1]}
              x2={pBot[0]}
              y2={pBot[1]}
              stroke={P.cyan}
              strokeWidth={1.7}
              strokeDasharray="5 4"
              opacity={0.75}
            />
          );
        })}

      <polygon points={polyPts(outerWeb)} fill="#c47916" stroke={P.ink} strokeWidth={1.8} />
      <polygon points={polyPts(topFlange)} fill={P.amberHot} stroke={P.ink} strokeWidth={1.8} />
      <polygon points={polyPts(endCap)} fill={P.amber} stroke={P.ink} strokeWidth={1.6} />

      {/* Chuỗi lỗ chốt định vị vi mô chạy dọc dầm longeron gia cường */}
      {BULKHEAD_STATIONS.map((bh, idx) => {
        const [hx, hy] = iso(bh.x, y + h, z);
        return (
          <circle
            key={idx}
            cx={hx}
            cy={hy}
            r={3.5}
            fill={lockGlow > 0.1 ? P.green : P.cyan}
            stroke={P.ink}
            strokeWidth={1.1}
          />
        );
      })}
    </g>
  );
};

const S08: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ bóc lớp vỏ nhôm-titan -> bung lắp ghép trục đo -> khoá khít vi mô tại 191.50s -> bảng 20.000 giờ bay
  const skinPeel = prog(t, 178.0, 181.8);
  const expOpen = prog(t, 180.8, 184.0);
  const lockClose = prog(t, 189.4, CUE.s08_lockJoin);
  const exp = expOpen * (1 - lockClose);
  const cncGlow = bump(t, CUE.s08_cncRibs, 4.2);
  const lockFlash = bump(t, CUE.s08_lockJoin, 1.5);

  const chartOpen = prog(t, 195.2, 197.2);
  const f35Bar = prog(t, 196.6, 198.9);
  const f15Bar = prog(t, 200.1, 203.2);
  const tag2060 = prog(t, 204.8, 206.1);

  // Điều khiển Cam2D: phóng sát khung xương CAD 3D khi bung/khóa rồi mở xuống bảng đối chiếu tuổi thọ
  const camX = lerp(975, 960, chartOpen);
  const camY = lerp(388, 565, chartOpen);
  const camZoom = lerp(1.36, 0.98, chartOpen);

  const hh = handheld(t, 1.6, 's08');
  const lockImpulse = bump(t, CUE.s08_lockJoin, 0.36) * 8;
  const shake: readonly [number, number] = [
    hh[0] + Math.sin(t * 48) * lockImpulse,
    hh[1] + Math.cos(t * 44) * lockImpulse,
  ];

  // Vỏ nhôm-titan nâng lên và mờ thành lưới mảnh khi bóc lộ khung xương
  const skinLiftY = 2.85 * skinPeel;
  const skinOpacity = 0.88 * (1 - skinPeel * 0.9);

  return (
    <AbsoluteFill style={{ backgroundColor: P.bgDeep }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <Layer>
          <Defs2D shadow="rgba(5, 11, 22, 0.5)" />

          <BlueprintGrid x0={-420} y0={-280} w={2760} h={1860} step={100} id="bp08" />

          {/* ==================== SÀN TỌA ĐỘ TRỤC ĐO CAD 3D (ISOMETRIC DATUM PLANE) ==================== */}
          <g opacity={0.42}>
            {[-8, -4, 0, 4, 8].map((gx) => {
              const p0 = iso(gx, -1.15, -7.2);
              const p1 = iso(gx, -1.15, 7.2);
              return (
                <line
                  key={`ix${gx}`}
                  x1={p0[0]}
                  y1={p0[1]}
                  x2={p1[0]}
                  y2={p1[1]}
                  stroke={gx === 0 ? P.cyan : P.gridBright}
                  strokeWidth={gx === 0 ? 1.8 : 1}
                  strokeDasharray={gx === 0 ? undefined : '6 6'}
                />
              );
            })}
            {[-6, -3, 0, 3, 6].map((gz) => {
              const p0 = iso(-9.2, -1.15, gz);
              const p1 = iso(9.6, -1.15, gz);
              return (
                <line
                  key={`iz${gz}`}
                  x1={p0[0]}
                  y1={p0[1]}
                  x2={p1[0]}
                  y2={p1[1]}
                  stroke={gz === 0 ? P.cyan : P.gridBright}
                  strokeWidth={gz === 0 ? 1.8 : 1}
                  strokeDasharray={gz === 0 ? undefined : '6 6'}
                />
              );
            })}
          </g>

          {/* ==================== KHUNG XƯƠNG CAD 3D NGUYÊN KHỐI CỦA F-15EX EAGLE II ==================== */}
          <g>
            {/* 1. Cánh trái CNC phía xa (z < 0) */}
            <IsoWingSkeleton
              side={-1}
              exp={exp}
              highlightCnc={cncGlow}
              lockGlow={lockFlash}
            />

            {/* 2. Khung xương hai cánh đuôi đứng + u EPAWSS đỉnh đuôi */}
            {([-1.62, 1.62] as const).map((tz, idx) => {
              const tailLift = 0.7 * exp;
              const finPts: [number, number, number][] = [
                [-5.0, 1.05 + tailLift, tz],
                [-7.5, 3.45 + tailLift, tz],
                [-8.8, 3.45 + tailLift, tz],
                [-8.5, 1.05 + tailLift, tz],
              ];
              return (
                <g key={idx}>
                  <polygon
                    points={polyPts(finPts)}
                    fill={P.f15Mid}
                    fillOpacity={0.78}
                    stroke={P.ink}
                    strokeWidth={1.8}
                  />
                  {/* Thanh sườn đứng trong cánh đuôi */}
                  {[-6.2, -7.2, -8.1].map((sx, k) => {
                    const p0 = iso(sx, 1.08 + tailLift, tz);
                    const p1 = iso(sx - 0.85, 3.35 + tailLift, tz);
                    return (
                      <line
                        key={k}
                        x1={p0[0]}
                        y1={p0[1]}
                        x2={p1[0]}
                        y2={p1[1]}
                        stroke={P.cyanSoft}
                        strokeWidth={1.5}
                      />
                    );
                  })}
                  {/* Hộp EPAWSS đỉnh đuôi F-15EX */}
                  <polyline
                    points={polyPts([
                      [-7.35, 3.52 + tailLift, tz],
                      [-9.0, 3.52 + tailLift, tz],
                    ])}
                    fill="none"
                    stroke={P.ordWhite}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {/* 3. Hai dầm keel dưới đáy thân & trục laser định vị dọc tâm thân */}
            {([-0.55, 0.55] as const).map((kz, k) => {
              const p0 = iso(-7.2, -0.15, kz);
              const p1 = iso(6.2, -0.05, kz);
              return (
                <line
                  key={k}
                  x1={p0[0]}
                  y1={p0[1]}
                  x2={p1[0]}
                  y2={p1[1]}
                  stroke={P.f15Light}
                  strokeWidth={4}
                />
              );
            })}

            {/* Chùm tia laser Cyan xuyên suốt tâm các lỗ khoan định vị từ đuôi lên mũi */}
            {([-0.72, 0.72] as const).map((lz, k) => {
              const p0 = iso(-7.4, 0.55, lz);
              const p1 = iso(8.4, 0.55, lz);
              return (
                <line
                  key={k}
                  x1={p0[0]}
                  y1={p0[1]}
                  x2={p1[0]}
                  y2={p1[1]}
                  stroke={lockFlash > 0.1 ? P.green : P.cyan}
                  strokeWidth={lockFlash > 0.1 ? 3.2 : 1.9}
                  strokeDasharray={exp > 0.02 ? '8 5' : undefined}
                  opacity={0.85}
                />
              );
            })}

            {/* 4. Chuỗi 8 vách ngăn thân hợp kim (vẽ từ đuôi -6.8m lên mũi +6.2m) */}
            {BULKHEAD_STATIONS.map((bh, idx) => {
              const staggerY = (idx % 2 === 0 ? 0.62 : -0.32) * exp;
              return (
                <IsoBulkhead
                  key={idx}
                  x={bh.x}
                  rz={bh.rx}
                  ry={bh.ry}
                  dy={staggerY}
                  lockGlow={lockFlash}
                />
              );
            })}

            {/* 5. Cặp dầm LONGERON VÀNG GIA CƯỜNG DÀY GẤP ĐÔI hạ xuống khoá chặt vào đỉnh vách ngăn */}
            <IsoReinforcedLongeron zSide={-1} exp={exp} lockGlow={lockFlash} />
            <IsoReinforcedLongeron zSide={1} exp={exp} lockGlow={lockFlash} />

            {/* 6. Khung chóp mũi Radome & mảng ăng-ten radar AESA nghiêng ở mũi */}
            {(() => {
              const noseShift = 1.15 * exp;
              const radomeTip = iso(9.25 + noseShift, 0.35, 0);
              const ringPts: [number, number, number][] = Array.from({ length: 12 }, (_, i) => {
                const a = (i / 12) * Math.PI * 2;
                return [
                  6.65 + noseShift,
                  0.45 + Math.cos(a) * 0.48,
                  Math.sin(a) * 0.5,
                ];
              });
              return (
                <g>
                  <polygon
                    points={polyPts(ringPts)}
                    fill="#102947"
                    stroke={P.cyan}
                    strokeWidth={2.4}
                  />
                  {[0, 3, 6, 9].map((ri) => {
                    const rp = iso(...ringPts[ri]);
                    return (
                      <line
                        key={ri}
                        x1={rp[0]}
                        y1={rp[1]}
                        x2={radomeTip[0]}
                        y2={radomeTip[1]}
                        stroke={P.cyanSoft}
                        strokeWidth={1.7}
                      />
                    );
                  })}
                  <circle
                    cx={radomeTip[0]}
                    cy={radomeTip[1]}
                    r={4}
                    fill={P.amberHot}
                    stroke={P.ink}
                    strokeWidth={1.2}
                  />
                </g>
              );
            })()}

            {/* 7. Cánh phải CNC phía gần (z > 0) */}
            <IsoWingSkeleton
              side={1}
              exp={exp}
              highlightCnc={cncGlow}
              lockGlow={lockFlash}
            />

            {/* Vòng sóng xung kích xanh ngọc xác nhận khoá khít vi mô tại 191.50s */}
            {lockFlash > 0.02 && (
              <ellipse
                cx={iso(0.2, 0.7, 0)[0]}
                cy={iso(0.2, 0.7, 0)[1]}
                rx={310 * (1.2 - 0.5 * lockFlash)}
                ry={145 * (1.2 - 0.5 * lockFlash)}
                fill="none"
                stroke={P.green}
                strokeWidth={4}
                opacity={0.65 * lockFlash}
              />
            )}

            {/* 8. LỚP VỎ NHÔM-TITAN BÊN NGOÀI ĐƯỢC BÓC TÁCH LÊN CAO (177.14s – 182.8s) */}
            {skinOpacity > 0.02 && (
              <g opacity={skinOpacity}>
                {/* Tấm vỏ cánh trái tách lên */}
                <polygon
                  points={polyPts([
                    [2.15, 0.85 + skinLiftY, -1.35 - skinPeel * 1.1],
                    [-3.42, 0.75 + skinLiftY, -6.52 - skinPeel * 1.1],
                    [-4.48, 0.72 + skinLiftY, -6.52 - skinPeel * 1.1],
                    [-4.35, 0.82 + skinLiftY, -1.35 - skinPeel * 1.1],
                  ])}
                  fill={P.f15Light}
                  stroke={P.cyanSoft}
                  strokeWidth={2}
                />
                {/* Tấm vỏ lưng trung tâm nhôm-titan */}
                <polygon
                  points={polyPts([
                    [6.3, 1.25 + skinLiftY * 1.15, -0.75],
                    [-7.2, 1.22 + skinLiftY * 1.15, -1.18],
                    [-7.2, 1.22 + skinLiftY * 1.15, 1.18],
                    [6.3, 1.25 + skinLiftY * 1.15, 0.75],
                  ])}
                  fill={P.f15Mid}
                  stroke={P.cyan}
                  strokeWidth={2.2}
                />
                {/* Vòm kính & vỏ buồng lái tách lên */}
                <polygon
                  points={polyPts([
                    [6.2, 1.32 + skinLiftY * 1.22, -0.46],
                    [1.8, 1.72 + skinLiftY * 1.22, -0.5],
                    [1.8, 1.72 + skinLiftY * 1.22, 0.5],
                    [6.2, 1.32 + skinLiftY * 1.22, 0.46],
                  ])}
                  fill={P.f15Canopy}
                  stroke={P.ink}
                  strokeWidth={1.8}
                />
                {/* Tấm vỏ cánh phải tách lên */}
                <polygon
                  points={polyPts([
                    [2.15, 0.85 + skinLiftY, 1.35 + skinPeel * 1.1],
                    [-3.42, 0.75 + skinLiftY, 6.52 + skinPeel * 1.1],
                    [-4.48, 0.72 + skinLiftY, 6.52 + skinPeel * 1.1],
                    [-4.35, 0.82 + skinLiftY, 1.35 + skinPeel * 1.1],
                  ])}
                  fill={P.f15Light}
                  stroke={P.cyanSoft}
                  strokeWidth={2}
                />
              </g>
            )}
          </g>

          {/* ==================== BẢNG ĐỐI CHIẾU TUỔI THỌ KHUNG THÂN: 8,000 HRS VS 20,000 HRS (2060s) ==================== */}
          {chartOpen > 0.01 && (
            <g
              transform={`translate(0 ${(1 - chartOpen) * 90})`}
              opacity={chartOpen}
              filter="url(#sh)"
            >
              {/* Khung bảng kỹ thuật bên dưới */}
              <rect
                x={145}
                y={640}
                width={1630}
                height={345}
                rx={16}
                fill="#0c1d34"
                stroke={P.gridBright}
                strokeWidth={2.6}
              />

              {/* Vạch chia thang giờ bay (0 -> 4k -> 8k -> 12k -> 16k -> 20,000 HRS; 1,000h = 52 px) */}
              {[0, 4, 8, 12, 16, 20].map((kh) => {
                const tx = 510 + kh * 52;
                const isMajor = kh === 8 || kh === 20;
                return (
                  <g key={kh}>
                    <line
                      x1={tx}
                      y1={666}
                      x2={tx}
                      y2={955}
                      stroke={kh === 20 ? P.amber : kh === 8 ? P.f35Tape : P.grid}
                      strokeWidth={isMajor ? 2.2 : 1.1}
                      strokeDasharray={isMajor ? undefined : '6 6'}
                      opacity={isMajor ? 0.75 : 0.38}
                    />
                    <text
                      x={tx}
                      y={974}
                      textAnchor="middle"
                      fill={kh === 20 ? P.amberHot : P.muted}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={14}
                    >
                      {kh === 0 ? '0' : `${kh}K`}
                    </text>
                  </g>
                );
              })}

              {/* HÀNG 1: F-35A LIGHTNING II — DỪNG Ở 8,000 GIỜ BAY (416 px) */}
              <g transform="translate(0 742)">
                <F35Side2D x={295} y={4} scale={0.48} />
                <text
                  x={435}
                  y={8}
                  textAnchor="middle"
                  fill={P.ordMid}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={19}
                >
                  F-35A
                </text>

                {/* Máng nền thanh đo */}
                <rect
                  x={510}
                  y={-22}
                  width={1040}
                  height={44}
                  rx={8}
                  fill="#081426"
                  stroke={P.grid}
                  strokeWidth={1.3}
                />
                {/* Thanh xám F-35A dừng cứng tại mốc 8,000 giờ (width = 416 px) */}
                <rect
                  x={510}
                  y={-20}
                  width={416 * f35Bar}
                  height={40}
                  rx={7}
                  fill={P.f35Light}
                  stroke={P.ink}
                  strokeWidth={2}
                />
                <rect
                  x={512}
                  y={-18}
                  width={Math.max(0, 412 * f35Bar)}
                  height={14}
                  rx={4}
                  fill={P.f35Tape}
                  opacity={0.45}
                />
                {f35Bar > 0.85 && (
                  <g opacity={(f35Bar - 0.85) / 0.15}>
                    <line
                      x1={926}
                      y1={-30}
                      x2={926}
                      y2={30}
                      stroke={P.ordWhite}
                      strokeWidth={3.5}
                    />
                    <text
                      x={944}
                      y={7}
                      fill={P.ordWhite}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={21}
                    >
                      8,000 HRS
                    </text>
                  </g>
                )}
              </g>

              {/* HÀNG 2: F-15EX EAGLE II — VƯƠN DÀI GẤP 2.5 LẦN TỚI 20,000 GIỜ BAY (1,040 px · 2060s) */}
              <g transform="translate(0 886)">
                <defs>
                  <linearGradient id="s08_exbar" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={P.amber} />
                    <stop offset="62%" stopColor={P.amberHot} />
                    <stop offset="100%" stopColor={P.cyan} />
                  </linearGradient>
                </defs>

                <F15Side2D
                  x={295}
                  y={6}
                  scale={0.45}
                  afterburner={0.65 * prog(t, 200.6, 202.8)}
                />
                <text
                  x={435}
                  y={8}
                  textAnchor="middle"
                  fill={P.cyanSoft}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={19}
                >
                  F-15EX
                </text>

                <rect
                  x={510}
                  y={-26}
                  width={1040}
                  height={52}
                  rx={9}
                  fill="#081426"
                  stroke={P.grid}
                  strokeWidth={1.4}
                />

                {/* Hào quang viền ngoài thanh 20.000 giờ (vẽ bằng rect kép, không dùng filter glow) */}
                {f15Bar > 0.02 && (
                  <rect
                    x={506}
                    y={-30}
                    width={1040 * f15Bar + 8}
                    height={60}
                    rx={12}
                    fill="none"
                    stroke={P.amber}
                    strokeWidth={6}
                    opacity={0.25}
                  />
                )}

                {/* Thanh chính 20,000 giờ dài đúng 2.5 lần thanh F-35A (1040 px = 2.5 * 416 px) */}
                <rect
                  x={510}
                  y={-24}
                  width={1040 * f15Bar}
                  height={48}
                  rx={8}
                  fill="url(#s08_exbar)"
                  stroke={P.ink}
                  strokeWidth={2.2}
                />

                {/* Vân giằng khung xương CNC bên trong thanh tuổi thọ F-15EX */}
                {Array.from({ length: 16 }, (_, k) => {
                  const rx = 545 + k * 64;
                  if (rx > 510 + 1040 * f15Bar - 18) return null;
                  return (
                    <line
                      key={k}
                      x1={rx}
                      y1={-20}
                      x2={rx + 18}
                      y2={20}
                      stroke={P.ink}
                      strokeWidth={2}
                      opacity={0.22}
                    />
                  );
                })}

                {/* Huy hiệu cột mốc thập niên 2060s ở cuối thanh 20.000 giờ */}
                {tag2060 > 0.02 && (
                  <g
                    transform={`translate(1648 0) scale(${0.75 + 0.25 * tag2060})`}
                    opacity={tag2060}
                  >
                    <rect
                      x={-76}
                      y={-26}
                      width={152}
                      height={52}
                      rx={10}
                      fill={P.green}
                      stroke={P.ink}
                      strokeWidth={2.4}
                    />
                    <text
                      x={0}
                      y={8}
                      textAnchor="middle"
                      fill={P.ink}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={25}
                    >
                      2060s
                    </text>
                  </g>
                )}
              </g>
            </g>
          )}
        </Layer>
      </Cam2D>

      <Grain opacity={0.4} />

      <Label
        t={t}
        text="20,000 HOURS"
        x={1595}
        y={165}
        from={CUE.s08_f15Hours}
        until={206.7}
        bg={P.amber}
        fg={P.ink}
        size={54}
      />
    </AbsoluteFill>
  );
};

export default S08;
