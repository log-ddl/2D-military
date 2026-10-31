import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mix } from '@core/time';
import { extrude, lathe, rbox, type P2 } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { turntable } from '@skill/military/3d/turntable';

export type Ammo120mm3DProps = {
  kind?: 'm829a4_cartridge' | 'm829a4_flight' | 'du_dart' | 'm1028_canister' | 'm1147_amp' | 'base_puck';
  burnProgress?: number;
  sabotSep?: number;
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

// Kích thước thật đạn pháo 120x570mm NATO (1:1 mét):
// - Tổng chiều dài viên đạn: 0.984 m (x = -0.492 .. +0.492, tâm tại x = 0)
// - Đế kim loại (stub base puck): đường kính vành 0.160 m (r = 0.080), cao 0.140 m (x = -0.492 .. -0.352), rỗng lòng như gạt tàn
// - Thân vỏ thuốc phóng cháy (combustible case): đường kính 0.120 m (r = 0.060), dài tới cổ x = +0.078 (tổng vỏ 0.570 m)
// - Thanh xuyên động năng Uranium nghèo (DU dart): dài 0.800 m, đường kính thân 0.022 m (r = 0.011), 6 cánh đuôi + mũi lưỡi đục

// 1. Biên dạng tiện đế thép hình gạt tàn (dọc trục +X từ 0 tới +0.140 m, rỗng bên trong)
const STUB_BASE_PROFILE: P2[] = [
  [0.001, 0.0],
  [0.08, 0.0],
  [0.08, 0.018],
  [0.075, 0.022],
  [0.067, 0.024],
  [0.067, 0.04],
  [0.073, 0.044],
  [0.072, 0.105],
  [0.068, 0.138],
  [0.063, 0.14],
  [0.059, 0.136],
  [0.058, 0.032],
  [0.024, 0.026],
  [0.022, 0.054],
  [0.015, 0.056],
  [0.001, 0.056],
];

// 2. Biên dạng thanh xuyên DU dài 0.80 m (x = -0.40 .. +0.40), r = 0.011 m, có ren răng cưa bám sabot ở giữa
const DU_DART_SHAFT_PROFILE: P2[] = (() => {
  const pts: P2[] = [
    [0.001, -0.4],
    [0.009, -0.4],
    [0.011, -0.385],
    [0.0112, -0.09],
  ];
  for (let x = -0.08; x <= 0.18; x += 0.02) {
    pts.push([0.0128, x], [0.0106, x + 0.012]);
  }
  pts.push(
    [0.0112, 0.195],
    [0.011, 0.27],
    [0.0085, 0.335],
    [0.0042, 0.375],
    [0.001, 0.4],
  );
  return pts;
})();

// 3. Biên dạng 1 trong 6 cánh đuôi ổn định khí động của mũi lao DU
const DU_FIN_PTS: P2[] = [
  [-0.397, 0.009],
  [-0.246, 0.009],
  [-0.328, 0.056],
  [-0.391, 0.056],
  [-0.399, 0.022],
];

// 4. Mặt cắt khép kín [r, x] của 1 cánh sabot composite (góc 115 độ) có hốc hứng gió mũi, 3 rãnh cản gió ngoài & răng cưa trong
const SABOT_PETAL_LOOP: P2[] = [
  [0.024, -0.098],
  [0.045, -0.072],
  [0.0595, -0.048],
  [0.0595, -0.014],
  // 3 rãnh cản gió cơ khí sâu trên lưng cánh sabot
  [0.043, -0.008],
  [0.043, 0.009],
  [0.0565, 0.015],
  [0.0565, 0.033],
  [0.042, 0.039],
  [0.042, 0.055],
  [0.054, 0.061],
  [0.052, 0.088],
  [0.038, 0.095],
  [0.038, 0.11],
  [0.05, 0.118],
  // Thân trước thuôn + vành phễu hứng gió siêu thanh
  [0.037, 0.138],
  [0.039, 0.178],
  [0.0565, 0.216],
  [0.0575, 0.23],
  // Hốc lõm hứng gió phía trước (aerodynamic air-pocket scoop)
  [0.049, 0.228],
  [0.025, 0.182],
  [0.0138, 0.172],
  // Lòng rãnh bán nguyệt bên trong có răng cưa bám thanh xuyên
  [0.012, 0.15],
  [0.015, 0.135],
  [0.012, 0.12],
  [0.015, 0.105],
  [0.012, 0.09],
  [0.015, 0.075],
  [0.012, 0.06],
  [0.015, 0.045],
  [0.012, 0.03],
  [0.015, 0.015],
  [0.012, 0.0],
  [0.015, -0.015],
  [0.012, -0.03],
  [0.015, -0.045],
  [0.012, -0.06],
  [0.0132, -0.098],
];

// Đai nhựa nylon bít kín khí (obturator band) ôm sát đúng mặt lưng cánh sabot (không bao giờ lệch trục)
const SABOT_SEAL_LOOP: P2[] = [
  [0.0585, -0.044],
  [0.0604, -0.044],
  [0.0604, -0.02],
  [0.0585, -0.02],
];

// Vành kim loại sáng ở mép hốc hứng gió đầu cánh sabot để nổi bật hình học phễu khí động
const SABOT_SCOOP_RIM_LOOP: P2[] = [
  [0.048, 0.214],
  [0.058, 0.218],
  [0.0582, 0.231],
  [0.0485, 0.228],
  [0.026, 0.184],
  [0.024, 0.18],
];

// Hàm dựng khối đặc hình quạt tròn quanh trục +X cho từng cánh sabot
const makeSabotPetalGeo = (loop: P2[], spanRad: number, segs = 18): THREE.BufferGeometry => {
  const pos: number[] = [];
  const norm: number[] = [];
  const half = spanRad / 2;
  const thetas = Array.from({ length: segs + 1 }, (_, i) => -half + (i / segs) * spanRad);
  const pt3 = (r: number, x: number, th: number): [number, number, number] => [
    x,
    r * Math.cos(th),
    r * Math.sin(th),
  ];

  const pushTri = (
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    na: [number, number, number],
    nb: [number, number, number],
    nc: [number, number, number],
  ) => {
    pos.push(...a, ...b, ...c);
    norm.push(...na, ...nb, ...nc);
  };

  for (let j = 0; j < loop.length; j++) {
    const [r0, x0] = loop[j];
    const [r1, x1] = loop[(j + 1) % loop.length];
    const dx = x1 - x0;
    const dr = r1 - r0;
    const len = Math.hypot(dx, dr) || 1;
    const nx = -dr / len;
    const nr = dx / len;

    for (let i = 0; i < segs; i++) {
      const th0 = thetas[i];
      const th1 = thetas[i + 1];
      const A = pt3(r0, x0, th0);
      const B = pt3(r0, x0, th1);
      const C = pt3(r1, x1, th1);
      const D = pt3(r1, x1, th0);
      const n0: [number, number, number] = [nx, nr * Math.cos(th0), nr * Math.sin(th0)];
      const n1: [number, number, number] = [nx, nr * Math.cos(th1), nr * Math.sin(th1)];
      pushTri(A, B, C, n0, n1, n1);
      pushTri(A, C, D, n0, n1, n0);
    }
  }

  const contour = loop.map(([r, x]) => new THREE.Vector2(x, r));
  const faces = THREE.ShapeUtils.triangulateShape(contour, []);
  const nMin: [number, number, number] = [0, Math.sin(-half), -Math.cos(-half)];
  const nMax: [number, number, number] = [0, -Math.sin(half), Math.cos(half)];

  for (const [ia, ib, ic] of faces) {
    const [ra, xa] = loop[ia];
    const [rb, xb] = loop[ib];
    const [rc, xc] = loop[ic];
    const cross2d = (xb - xa) * (rc - ra) - (rb - ra) * (xc - xa);

    const A1 = pt3(ra, xa, half);
    const B1 = pt3(rb, xb, half);
    const C1 = pt3(rc, xc, half);
    if (cross2d < 0) pushTri(A1, B1, C1, nMax, nMax, nMax);
    else pushTri(A1, C1, B1, nMax, nMax, nMax);

    const A0 = pt3(ra, xa, -half);
    const B0 = pt3(rb, xb, -half);
    const C0 = pt3(rc, xc, -half);
    if (cross2d < 0) pushTri(A0, C0, B0, nMin, nMin, nMin);
    else pushTri(A0, B0, C0, nMin, nMin, nMin);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(norm, 3));
  return g;
};

let cachedPetalGeos: {
  body: THREE.BufferGeometry;
  seal: THREE.BufferGeometry;
  scoopRim: THREE.BufferGeometry;
} | null = null;
const getSabotGeos = () => {
  if (!cachedPetalGeos) {
    const span = (114 * Math.PI) / 180;
    cachedPetalGeos = {
      body: makeSabotPetalGeo(SABOT_PETAL_LOOP, span, 18),
      seal: makeSabotPetalGeo(SABOT_SEAL_LOOP, span, 18),
      scoopRim: makeSabotPetalGeo(SABOT_SCOOP_RIM_LOOP, span, 18),
    };
  }
  return cachedPetalGeos;
};

// 5. Đầu đạn ghém M1028 Canister màu xanh lục quân sự, đầu tù phẳng có vạch chia cánh mở (x = +0.075 .. +0.465)
const M1028_WARHEAD_PROFILE: P2[] = [
  [0.056, 0.072],
  [0.06, 0.082],
  [0.06, 0.448],
  [0.057, 0.456],
  [0.001, 0.456],
];

// 6. Đầu đạn thông minh đa năng M1147 AMP (x = +0.072 .. +0.492) với chóp ngòi lập trình đa chế độ
const M1147_BODY_PROFILE: P2[] = [
  [0.055, 0.07],
  [0.0605, 0.088],
  [0.0605, 0.125],
  [0.0595, 0.23],
  [0.053, 0.31],
  [0.039, 0.385],
  [0.025, 0.43],
  [0.001, 0.43],
];

const M1147_FUZE_PROFILE: P2[] = [
  [0.0255, 0.428],
  [0.021, 0.452],
  [0.011, 0.484],
  [0.005, 0.492],
  [0.001, 0.492],
];

// Linh kiện Đế Thép ("Base Puck") dùng chung cho mọi viên đạn 120mm (đặt dọc +X từ x = -0.492 tới -0.352)
const StubBaseCase: React.FC<{
  smartDataRings?: boolean;
  scorched?: number;
}> = ({ smartDataRings = false, scorched = 0 }) => {
  const stubGeo = useMemo(() => lathe(STUB_BASE_PROFILE, 40), []);
  const steelCol = mix('#32373f', '#1c1b1a', scorched);
  const rimCol = mix('#b4beca', '#4d4c49', scorched);

  return (
    <group position={[-0.492, 0, 0]}>
      <mesh geometry={stubGeo} material={plain(steelCol, 0.36, 0.82)} castShadow receiveShadow />
      <mesh position={[0.009, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(rimCol, 0.24, 0.9)}>
        <cylinderGeometry args={[0.0803, 0.0803, 0.017, 36]} />
      </mesh>
      <mesh position={[-0.001, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#ddb85e', 0.26, 0.9)}>
        <cylinderGeometry args={[0.018, 0.018, 0.004, 24]} />
      </mesh>
      <mesh position={[-0.0015, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#c9cfd6', 0.25, 0.9)}>
        <cylinderGeometry args={[0.009, 0.009, 0.004, 18]} />
      </mesh>
      <mesh position={[0.128, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#232528', 0.85, 0.08)}>
        <cylinderGeometry args={[0.0705, 0.0715, 0.016, 36]} />
      </mesh>

      {/* Các vòng tiếp điểm đồng vàng truyền dữ liệu (Ammunition Data Link rings) đặc trưng trên M1147 AMP */}
      {smartDataRings ? (
        <>
          {[0.052, 0.073, 0.094].map((rx, idx) => (
            <mesh
              key={idx}
              position={[rx, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
              material={plain('#f6c342', 0.18, 0.94)}
            >
              <cylinderGeometry args={[0.0736, 0.0736, 0.012, 36]} />
            </mesh>
          ))}
          <mesh position={[-0.0012, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={plain('#f6c342', 0.18, 0.94)}>
            <torusGeometry args={[0.048, 0.005, 8, 36]} />
          </mesh>
        </>
      ) : (
        <mesh position={[0.062, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#b89548', 0.32, 0.82)}>
          <cylinderGeometry args={[0.0726, 0.0726, 0.006, 36]} />
        </mesh>
      )}
    </group>
  );
};

// Linh kiện Vỏ Thuốc Phóng Cứng Màu Kem Ngà (#e8d6b3) có hiệu ứng rực lửa cam & cháy tiêu biến theo burnProgress (0..1)
const CombustibleCase: React.FC<{
  burnProgress: number;
  neckEnd?: number;
  bandColor?: string;
}> = ({ burnProgress, neckEnd = 0.088, bandColor = '#22262b' }) => {
  const bp = Math.max(0, Math.min(1, burnProgress));
  if (bp >= 0.995) return null;

  const startX = -0.356;
  const fullLen = neckEnd - startX;
  const remainLen = fullLen * (1 - bp * 0.96);
  const curEnd = startX + remainLen;
  const radialShrink = 1 - bp * 0.22;

  const baseColor = bp < 0.08 ? '#e8d6b3' : mix('#e8d6b3', '#ff6d1c', Math.min(1, bp * 1.45));
  const glowIntensity = bp <= 0.01 ? 0 : Math.sin(Math.min(1, bp) * Math.PI) * 2.4 + bp * 0.6;

  return (
    <group>
      <mesh
        position={[(startX + curEnd) / 2, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.0585 * radialShrink, 0.0602 * radialShrink, remainLen, 36]} />
        <meshStandardMaterial
          color={baseColor}
          roughness={0.78}
          metalness={0.04}
          emissive={bp > 0.01 ? '#ff4d0a' : '#000000'}
          emissiveIntensity={glowIntensity}
          transparent={bp > 0.72}
          opacity={bp > 0.72 ? (1 - bp) / 0.28 : 1}
        />
      </mesh>

      {bp < 0.16 && (
        <mesh position={[neckEnd + 0.016, 0, 0]} rotation={[0, 0, -Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.049, 0.0585, 0.034, 36]} />
          <meshStandardMaterial
            color={baseColor}
            roughness={0.78}
            emissive={bp > 0.01 ? '#ff5912' : '#000000'}
            emissiveIntensity={glowIntensity * 1.15}
          />
        </mesh>
      )}

      {bp < 0.28 && (
        <>
          <mesh position={[-0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(bandColor, 0.65, 0.1)}>
            <cylinderGeometry args={[0.0606, 0.0606, 0.022, 36]} />
          </mesh>
          <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#3c4738', 0.7, 0.08)}>
            <cylinderGeometry args={[0.0605, 0.0605, 0.012, 36]} />
          </mesh>
        </>
      )}

      {bp > 0.02 && bp < 0.98 && (
        <mesh position={[curEnd, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.057 * radialShrink, 0.0085, 10, 32]} />
          <meshStandardMaterial
            color="#fff0a6"
            emissive="#ff7b14"
            emissiveIntensity={3.2}
            roughness={0.3}
          />
        </mesh>
      )}
    </group>
  );
};

// Linh kiện Mũi Lao Động Năng Uranium Nghèo (DU Penetrator Dart dài 0.80 m, đường kính 0.022 m, 6 cánh đuôi + mũi lưỡi đục)
const DepletedUraniumDart: React.FC<{ offsetX?: number; glowingTracer?: boolean }> = ({
  offsetX = 0,
  glowingTracer = false,
}) => {
  const { shaftGeo, finGeo } = useMemo(
    () => ({
      shaftGeo: lathe(DU_DART_SHAFT_PROFILE, 28),
      finGeo: extrude(DU_FIN_PTS, 0.0032, 0.0006),
    }),
    [],
  );

  // Hợp kim Uranium nghèo sẫm ánh tím-xám kim loại nặng (#5a5666 -> #6c6482 phản quang sắc nét)
  const duMat = plain('#635d73', 0.24, 0.9);
  const finMat = plain('#7d8394', 0.26, 0.88);
  const chiselMat = plain('#7c7394', 0.18, 0.94);

  return (
    <group position={[offsetX, 0, 0]}>
      <mesh geometry={shaftGeo} material={duMat} castShadow receiveShadow />

      {/* Mũi vát đa diện kiểu lưỡi đục tự mài sắc (self-sharpening chisel tip) */}
      <mesh
        position={[0.356, 0, 0]}
        rotation={[Math.PI / 4, 0, -Math.PI / 2]}
        scale={[0.72, 1, 1]}
        material={chiselMat}
        castShadow
      >
        <coneGeometry args={[0.0102, 0.088, 4]} />
      </mesh>

      {/* Cụm ống trụ gốc cánh đuôi + 6 cánh đuôi ổn định khí động sắc nét */}
      <mesh position={[-0.325, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={finMat}>
        <cylinderGeometry args={[0.013, 0.0125, 0.145, 20]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh
          key={i}
          rotation={[(i * Math.PI) / 3, 0, 0]}
          geometry={finGeo}
          material={finMat}
          castShadow
        />
      ))}

      {/* Hạt vạch đường (tracer) ở đuôi thanh xuyên */}
      <mesh position={[-0.398, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.0076, 16]} />
        <meshStandardMaterial
          color={glowingTracer ? '#ffd580' : '#8a3228'}
          emissive={glowingTracer ? '#ff6a14' : '#000000'}
          emissiveIntensity={glowingTracer ? 2.6 : 0}
          roughness={0.4}
        />
      </mesh>
    </group>
  );
};

// Linh kiện 3 Cánh Sabot Composite Có Rãnh Cản Gió (khép kín khi sabotSep = 0, bung mở điện ảnh khi sabotSep = 0..1)
const SabotPetalsGroup: React.FC<{
  offsetX?: number;
  sabotSep?: number;
}> = ({ offsetX = 0, sabotSep = 0 }) => {
  const sep = Math.max(0, Math.min(1, sabotSep));
  const geos = useMemo(() => getSabotGeos(), []);
  // Sợi carbon composite ánh xám-than satin để nổi rõ các rãnh cản gió cơ khí & răng cưa bên trong
  const compositeMat = plain('#2a303a', 0.34, 0.38);
  const sealBandMat = plain('#e6e2d3', 0.48, 0.06);
  const alloyScoopMat = plain('#6d7685', 0.28, 0.78);

  const radialOut = sep * 0.21;
  const axialBack = -sep * 0.14;
  const peelAngle = sep * 0.68;

  return (
    <group position={[offsetX, 0, 0]}>
      {Array.from({ length: 3 }, (_, i) => {
        const roll = (i * Math.PI * 2) / 3;
        return (
          <group key={i} rotation={[roll, 0, 0]}>
            <group position={[axialBack - 0.08, radialOut, 0]} rotation={[0, 0, peelAngle]}>
              <group position={[0.08, 0, 0]}>
                <mesh geometry={geos.body} material={compositeMat} castShadow receiveShadow />
                <mesh geometry={geos.seal} material={sealBandMat} castShadow />
                <mesh geometry={geos.scoopRim} material={alloyScoopMat} castShadow />
              </group>
            </group>
          </group>
        );
      })}
    </group>
  );
};

export const Ammo120mm3D: React.FC<Ammo120mm3DProps> = ({
  kind = 'm829a4_cartridge',
  burnProgress = 0,
  sabotSep = 0,
  scale = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const extraGeos = useMemo(
    () => ({
      m1028Warhead: lathe(M1028_WARHEAD_PROFILE, 36),
      m1147Body: lathe(M1147_BODY_PROFILE, 36),
      m1147Fuze: lathe(M1147_FUZE_PROFILE, 32),
      stubAshtray: lathe(STUB_BASE_PROFILE, 44),
    }),
    [],
  );

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. M829A4 CARTRIDGE: Đạn xuyên động năng nguyên viên */}
      {kind === 'm829a4_cartridge' && (
        <group>
          <StubBaseCase scorched={burnProgress * 0.45} />
          <DepletedUraniumDart offsetX={0.092} />
          {burnProgress > 0.06 && burnProgress < 0.92 && (
            <group position={[-0.16, 0, 0]}>
              {Array.from({ length: 8 }, (_, i) => {
                const a = (i / 8) * Math.PI * 2;
                const rem = 1 - burnProgress;
                return (
                  <mesh
                    key={i}
                    position={[-(1 - rem) * 0.14, Math.cos(a) * 0.032, Math.sin(a) * 0.032]}
                    rotation={[0, 0, Math.PI / 2]}
                  >
                    <cylinderGeometry args={[0.0055 * rem, 0.0055 * rem, 0.34 * rem, 8]} />
                    <meshStandardMaterial
                      color="#ff8c2b"
                      emissive="#ff4800"
                      emissiveIntensity={2.2}
                      roughness={0.5}
                    />
                  </mesh>
                );
              })}
            </group>
          )}
          <CombustibleCase burnProgress={burnProgress} neckEnd={0.075} />
          <SabotPetalsGroup offsetX={0.092} sabotSep={0} />
        </group>
      )}

      {/* 2. M829A4 FLIGHT: Mũi lao DU 0.80 m đang bay Mach 5 + 3 cánh sabot có rãnh cản gió bung tách theo sabotSep */}
      {kind === 'm829a4_flight' && (
        <group>
          <DepletedUraniumDart offsetX={0} glowingTracer />
          <SabotPetalsGroup offsetX={0} sabotSep={sabotSep} />
        </group>
      )}

      {/* 3. DU DART: Riêng mũi lao finned Uranium nghèo 0.80 m sắc nét */}
      {kind === 'du_dart' && <DepletedUraniumDart offsetX={0} glowingTracer />}

      {/* 4. M1028 CANISTER: Đạn ghém thân xanh lục quân sự đầu tù phẳng có vạch ký hiệu */}
      {kind === 'm1028_canister' && (
        <group>
          <StubBaseCase scorched={burnProgress * 0.4} />
          <CombustibleCase burnProgress={burnProgress} neckEnd={0.076} />
          <mesh
            geometry={extraGeos.m1028Warhead}
            material={plain('#394d33', 0.56, 0.24)}
            castShadow
            receiveShadow
          />
          <mesh position={[0.105, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#1e2124', 0.5, 0.3)}>
            <cylinderGeometry args={[0.0606, 0.0606, 0.022, 36]} />
          </mesh>
          <mesh position={[0.25, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#d8e2d0', 0.5, 0.1)}>
            <cylinderGeometry args={[0.0604, 0.0604, 0.026, 36]} />
          </mesh>
          <mesh position={[0.37, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#749e68', 0.5, 0.15)}>
            <cylinderGeometry args={[0.0603, 0.0603, 0.014, 36]} />
          </mesh>
          {[0, Math.PI / 2].map((ang, idx) => (
            <mesh
              key={idx}
              position={[0.456, 0, 0]}
              rotation={[ang, 0, 0]}
              geometry={rbox(0.004, 0.112, 0.004, 0.001)}
              material={plain('#1b2418', 0.7, 0.3)}
            />
          ))}
        </group>
      )}

      {/* 5. M1147 AMP: Đạn thông minh đa năng chóp nhọn hiện đại + các vòng tiếp điểm đồng vàng (data rings) quanh đế */}
      {kind === 'm1147_amp' && (
        <group>
          <StubBaseCase smartDataRings scorched={burnProgress * 0.4} />
          <CombustibleCase burnProgress={burnProgress} neckEnd={0.074} bandColor="#25282c" />
          <mesh
            geometry={extraGeos.m1147Body}
            material={plain('#2e3430', 0.44, 0.48)}
            castShadow
            receiveShadow
          />
          <mesh position={[0.106, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#d48b3b', 0.32, 0.8)}>
            <cylinderGeometry args={[0.061, 0.061, 0.024, 36]} />
          </mesh>
          <mesh position={[0.205, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#eab634', 0.45, 0.15)}>
            <cylinderGeometry args={[0.06, 0.06, 0.028, 36]} />
          </mesh>
          <mesh position={[0.255, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#d95326', 0.48, 0.15)}>
            <cylinderGeometry args={[0.0578, 0.0588, 0.014, 36]} />
          </mesh>
          <mesh
            geometry={extraGeos.m1147Fuze}
            material={plain('#c2ccd6', 0.24, 0.88)}
            castShadow
          />
          <mesh position={[0.43, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#e6b23c', 0.25, 0.9)}>
            <cylinderGeometry args={[0.0258, 0.0258, 0.008, 28]} />
          </mesh>
        </group>
      )}

      {/* 6. BASE PUCK: Đế thép hình gạt tàn (đường kính 0.16 m, cao 0.14 m, đặt ngửa rỗng lòng trên +Y) */}
      {kind === 'base_puck' && (
        <group rotation={[0, 0, Math.PI / 2]}>
          <mesh geometry={extraGeos.stubAshtray} material={plain('#2b2f36', 0.42, 0.8)} castShadow receiveShadow />
          <mesh position={[0.009, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#9aa3ae', 0.3, 0.86)}>
            <cylinderGeometry args={[0.0803, 0.0803, 0.017, 36]} />
          </mesh>
          <mesh position={[0.135, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={plain('#171615', 0.92, 0.15)}>
            <torusGeometry args={[0.061, 0.004, 8, 32]} />
          </mesh>
          <mesh position={[0.065, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#b38f42', 0.35, 0.8)}>
            <cylinderGeometry args={[0.0726, 0.0726, 0.008, 36]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

export default Ammo120mm3D;

// Giá đỡ trưng bày mảnh dành riêng cho bàn xoay kiểm định 4 góc
const CradleStand: React.FC<{ z: number; h: number }> = ({ z, h }) => (
  <group position={[0, 0, z]}>
    {([-0.24, 0.16] as const).map((sx, idx) => (
      <group key={idx} position={[sx, 0, 0]}>
        <mesh position={[0, h / 2, 0]} geometry={rbox(0.016, h, 0.02, 0.004)} material={plain('#444a52', 0.6, 0.4)} />
        <mesh position={[0, h, 0]} rotation={[0, Math.PI / 2, Math.PI]} material={plain('#2e3338', 0.5, 0.5)}>
          <torusGeometry args={[0.065, 0.007, 8, 20, Math.PI]} />
        </mesh>
      </group>
    ))}
    <mesh position={[-0.04, 0.007, 0]} geometry={rbox(0.52, 0.014, 0.11, 0.004)} material={plain('#383d44', 0.7, 0.3)} />
  </group>
);

const Ammo120mmPreview: React.FC = () => (
  <group>
    {/* Hàng sau (z = -0.45): Đạn xuyên M829A4 nguyên viên vỏ kem ngà */}
    <CradleStand z={-0.45} h={0.08} />
    <Ammo120mm3D kind="m829a4_cartridge" position={[0, 0.145, -0.45]} />

    {/* Bay lơ lửng phía trên chính giữa (z = 0, y = 0.50): Mũi lao DU 6 cánh + 3 cánh sabot bung tách thoáng hoàn toàn */}
    <Ammo120mm3D kind="m829a4_flight" sabotSep={0.45} position={[0, 0.5, 0]} />

    {/* Hàng trước (z = +0.45): Đạn thông minh M1147 AMP với các vòng tiếp điểm đồng vàng nổi bật quanh đế */}
    <CradleStand z={0.45} h={0.08} />
    <Ammo120mm3D kind="m1147_amp" position={[0, 0.145, 0.45]} />

    {/* Đế gạt tàn kim loại rỗng lòng trên rơi lại sau khi vỏ thuốc phóng tự cháy sạch */}
    <Ammo120mm3D kind="base_puck" position={[-0.36, 0, 0]} />
  </group>
);

export const preview = turntable(Ammo120mmPreview, { size: 1.6, center: [0, 0.25, 0] });
