import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets, Track, Wheel } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT_PRESETS, PAL } from '../design/palette';

export type M1E3AbramsProps = {
  turretYaw?: number;
  gunPitch?: number;
  rwsYaw?: number;
  rwsPitch?: number;
  travel?: number;
  capsuleGlow?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

type V3 = [number, number, number];

/**
 * Dựng khối đa diện tàng hình vát liên tục qua các tầng đa giác khép kín (thứ tự đỉnh ngược chiều kim đồng hồ nhìn từ +Y).
 * Tính UV theo đơn vị mét thật (1 m = 1 UV) đồng bộ với extrude/extrudeTop và tạo pháp tuyến phẳng sắc cạnh từng mặt giáp.
 */
function loftStealthLayers(rings: V3[][]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const n = rings[0].length;

  const pushTri = (a: V3, b: V3, c: V3, ua: P2, ub: P2, uc: P2) => {
    pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
    uv.push(ua[0], ua[1], ub[0], ub[1], uc[0], uc[1]);
  };

  for (let r = 0; r < rings.length - 1; r++) {
    const low = rings[r];
    const high = rings[r + 1];
    let sAcc = 0;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      const li = low[i];
      const lj = low[j];
      const hi = high[i];
      const hj = high[j];
      const segLen = Math.hypot(lj[0] - li[0], lj[2] - li[2]);
      const s0 = sAcc;
      const s1 = sAcc + segLen;
      sAcc = s1;
      pushTri(li, lj, hj, [s0, li[1]], [s1, lj[1]], [s1, hj[1]]);
      pushTri(li, hj, hi, [s0, li[1]], [s1, hj[1]], [s0, hi[1]]);
    }
  }

  // Nắp nóc (pháp tuyến hướng +Y)
  const top = rings[rings.length - 1];
  const ct: V3 = [0, 0, 0];
  for (const p of top) {
    ct[0] += p[0] / n;
    ct[1] += p[1] / n;
    ct[2] += p[2] / n;
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pushTri(ct, top[i], top[j], [ct[0], ct[2]], [top[i][0], top[i][2]], [top[j][0], top[j][2]]);
  }

  // Đáy dưới (pháp tuyến hướng -Y)
  const bot = rings[0];
  const cb: V3 = [0, 0, 0];
  for (const p of bot) {
    cb[0] += p[0] / n;
    cb[1] += p[1] / n;
    cb[2] += p[2] / n;
  }
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    pushTri(cb, bot[j], bot[i], [cb[0], cb[2]], [bot[j][0], bot[j][2]], [bot[i][0], bot[i][2]]);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}

// Biên dạng nhìn ngang thân giữa M1E3 (dài đúng 7.60 m: từ x = -3.82 tới +3.78)
const HULL_CORE_SIDE: P2[] = [
  [-3.82, 0.90],
  [-3.56, 0.56],
  [-2.85, 0.43],
  [2.64, 0.43],
  [3.38, 0.62],
  [3.78, 0.82],
  [3.50, 1.02],
  [2.78, 1.28],
  [2.52, 1.46],
  [1.46, 1.47],
  [-1.36, 1.47],
  [-1.68, 1.38],
  [-3.48, 1.36],
  [-3.82, 1.24],
];

// Mặt sàn sponson rộng che phía trên 2 dải xích
const HULL_SPONSON_SIDE: P2[] = [
  [-3.76, 0.92],
  [3.32, 0.92],
  [3.72, 0.82],
  [3.48, 1.01],
  [2.78, 1.27],
  [2.50, 1.44],
  [-1.38, 1.44],
  [-1.70, 1.36],
  [-3.50, 1.34],
  [-3.78, 1.22],
];

// Váy giáp chủ động góc cạnh hiện đại che sườn (cắt vát gọn hai đầu để lộ rõ đúng 6 cặp bánh chịu nặng)
const SIDE_SKIRT_PROFILE: P2[] = [
  [-3.62, 0.92],
  [-3.12, 0.72],
  [-2.58, 0.56],
  [2.56, 0.56],
  [3.10, 0.72],
  [3.60, 0.88],
  [3.44, 1.06],
  [2.76, 1.28],
  [2.44, 1.40],
  [-1.42, 1.40],
  [-1.74, 1.33],
  [-3.48, 1.30],
];

// Khoang bọc thép bảo vệ 3 thành viên tổ lái ngồi cạnh nhau ở mũi thân (mặt bằng X-Z)
const CAPSULE_CITADEL_TOP: P2[] = [
  [2.68, -1.04],
  [2.68, 1.04],
  [2.42, 1.28],
  [1.64, 1.28],
  [1.48, 1.02],
  [1.48, -1.02],
  [1.64, -1.28],
  [2.42, -1.28],
];

// Nắp cửa sập tổ lái hình bát giác dẹt
const CREW_HATCH_TOP: P2[] = [
  [0.24, -0.16],
  [0.24, 0.16],
  [0.12, 0.25],
  [-0.14, 0.25],
  [-0.24, 0.15],
  [-0.24, -0.15],
  [-0.14, -0.25],
  [0.12, -0.25],
];

// 3 tầng đa giác khép kín (CCW nhìn từ +Y) tạo tháp pháo không người lái tàng hình vát liền khối (đỉnh cao y_world = 2.28 m -> y_local = 0.82 m)
const TURRET_RING_BOT: V3[] = [
  [1.24, 0.03, 0.50],
  [1.24, 0.03, -0.50],
  [0.76, 0.03, -1.16],
  [-0.08, 0.03, -1.28],
  [-0.96, 0.03, -1.20],
  [-1.56, 0.16, -1.08],
  [-2.24, 0.28, -0.96],
  [-2.32, 0.30, 0.00],
  [-2.24, 0.28, 0.96],
  [-1.56, 0.16, 1.08],
  [-0.96, 0.03, 1.20],
  [-0.08, 0.03, 1.28],
  [0.76, 0.03, 1.16],
];

const TURRET_RING_CHINE: V3[] = [
  [1.66, 0.30, 0.48],
  [1.66, 0.30, -0.48],
  [0.98, 0.34, -1.42],
  [0.02, 0.36, -1.54],
  [-0.98, 0.38, -1.40],
  [-1.68, 0.42, -1.22],
  [-2.42, 0.46, -1.08],
  [-2.50, 0.48, 0.00],
  [-2.42, 0.46, 1.08],
  [-1.68, 0.42, 1.22],
  [-0.98, 0.38, 1.40],
  [0.02, 0.36, 1.54],
  [0.98, 0.34, 1.42],
];

const TURRET_RING_ROOF: V3[] = [
  [1.14, 0.75, 0.40],
  [1.14, 0.75, -0.40],
  [0.58, 0.81, -1.02],
  [-0.14, 0.82, -1.14],
  [-0.96, 0.82, -1.06],
  [-1.62, 0.81, -0.98],
  [-2.28, 0.79, -0.90],
  [-2.36, 0.79, 0.00],
  [-2.28, 0.79, 0.90],
  [-1.62, 0.81, 0.98],
  [-0.96, 0.82, 1.06],
  [-0.14, 0.82, 1.14],
  [0.58, 0.81, 1.02],
];

// Khiên bọc giáp khoá nòng đa giác
const MANTLET_SIDE: P2[] = [
  [-0.26, -0.20],
  [0.26, -0.17],
  [0.42, -0.04],
  [0.42, 0.14],
  [0.22, 0.25],
  [-0.26, 0.27],
];

// Vỏ tản nhiệt đa giác tàng hình 8 cạnh bọc nòng pháo 120mm XM360 + bầu hút khói đa giác
const GUN_STEALTH_SHROUD_PROFILE: P2[] = [
  [0.002, 0.00],
  [0.156, 0.00],
  [0.156, 0.38],
  [0.128, 0.54],
  [0.120, 1.56],
  [0.152, 1.68],
  [0.152, 2.32],
  [0.116, 2.46],
  [0.092, 2.56],
  [0.002, 2.56],
];

// Đoạn trước nòng pháo 120mm XM360 + loa giảm giật đục lỗ hiện đại (tổng dài từ trunnion = 4.53 m -> mũi xe +5.63 m, tổng xe 9.45 m)
const GUN_BARREL_FRONT_PROFILE: P2[] = [
  [0.085, 2.52],
  [0.082, 3.65],
  [0.080, 4.24],
  [0.105, 4.28],
  [0.105, 4.49],
  [0.092, 4.53],
  [0.062, 4.53],
  [0.062, 4.36],
  [0.002, 4.36],
];

// Nòng pháo liên thanh 30mm XM914 chống drone trên trạm RWS
const RWS_30MM_BARREL_PROFILE: P2[] = [
  [0.038, 0.00],
  [0.036, 0.30],
  [0.026, 0.34],
  [0.023, 0.94],
  [0.034, 0.96],
  [0.034, 1.05],
  [0.026, 1.07],
  [0.038, 1.16],
  [0.022, 1.17],
  [0.017, 1.08],
  [0.002, 1.08],
];

// Đúng 6 cặp bánh chịu nặng r = 0.32 m của khung gầm nhẹ ~60 tấn M1E3
const ROADWHEEL_X = [-2.22, -1.33, -0.44, 0.44, 1.33, 2.22];
const CREW_HATCH_Z = [-0.82, 0, 0.82];

export const M1E3Abrams: React.FC<M1E3AbramsProps> = ({
  turretYaw = 0,
  gunPitch = 0,
  rwsYaw = 0,
  rwsPitch = 0.14,
  travel = 0,
  capsuleGlow = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const glow = Math.max(0, Math.min(1, capsuleGlow));

  const geos = useMemo(() => {
    const hullCore = extrude(HULL_CORE_SIDE, 2.08, 0.04);
    const hullSponson = extrude(HULL_SPONSON_SIDE, 3.38, 0.035);
    const sideSkirt = extrude(SIDE_SKIRT_PROFILE, 0.12, 0.022);

    const capsuleCitadel = extrudeTop(CAPSULE_CITADEL_TOP, 0.095, 0.02);
    const crewHatch = extrudeTop(CREW_HATCH_TOP, 0.052, 0.012);

    // Đường viền quang học chạy quanh khoang bọc thép 3 người ở mũi thân
    const capsuleGlowOutline = pipe(
      [
        [2.69, 1.525, -1.04],
        [2.69, 1.525, 1.04],
        [2.42, 1.525, 1.29],
        [1.64, 1.525, 1.29],
        [1.47, 1.525, 1.02],
        [1.47, 1.525, -1.02],
        [1.64, 1.525, -1.29],
        [2.42, 1.525, -1.29],
        [2.69, 1.525, -1.04],
      ],
      0.016,
      56,
    );

    // Tháp pháo không người lái vát tàng hình liền khối (không bậc thang hộp)
    const stealthTurret = loftStealthLayers([TURRET_RING_BOT, TURRET_RING_CHINE, TURRET_RING_ROOF]);
    const mantlet = extrude(MANTLET_SIDE, 0.78, 0.03);

    // Vỏ tản nhiệt đa giác 8 mặt phẳng sắc cạnh cho pháo chính 120mm
    const stealthShroudRaw = lathe(GUN_STEALTH_SHROUD_PROFILE, 8).clone();
    const gunStealthShroud = stealthShroudRaw.index ? stealthShroudRaw.toNonIndexed() : stealthShroudRaw;
    gunStealthShroud.computeVertexNormals();

    const gunFront = lathe(GUN_BARREL_FRONT_PROFILE, 28);
    const rwsBarrel = lathe(RWS_30MM_BARREL_PROFILE, 20);

    const ammoChute = pipe(
      [
        [-0.04, 0.14, 0.28],
        [-0.02, 0.21, 0.19],
        [0.00, 0.18, 0.08],
      ],
      0.028,
      16,
    );

    const rivets: [number, number, number][] = [];
    for (const sz of [-1.775, 1.775]) {
      for (let x = -2.8; x <= 2.8; x += 0.56) {
        rivets.push([x, 1.28, sz], [x, 0.72, sz]);
      }
    }

    return {
      hullCore,
      hullSponson,
      sideSkirt,
      capsuleCitadel,
      crewHatch,
      capsuleGlowOutline,
      stealthTurret,
      mantlet,
      gunStealthShroud,
      gunFront,
      rwsBarrel,
      ammoChute,
      rivets,
    };
  }, []);

  // Sơn chủ đạo nguyên mẫu M1E3 theo đúng PAINT_PRESETS.m1e3Prototype (repeat: 0.42)
  const matArmorMain = paint({
    ...PAINT_PRESETS.m1e3Prototype,
    camo: [...PAINT_PRESETS.m1e3Prototype.camo],
    seed: 17,
  });

  // Sơn đồng bộ cho các chi tiết lathe / rbox (UV 0..1)
  const matArmorDetail = paint({
    ...PAINT_PRESETS.m1e3Prototype,
    camo: [...PAINT_PRESETS.m1e3Prototype.camo],
    repeat: 1.0,
    seed: 23,
  });

  // Mảng giáp composite xám-olive sáng hơn một nấc để nổi khối vát hiện đại & khoang 3 người
  const matCompositeLight = paint({
    color: '#7c8775',
    camo: ['#6b7565', '#8e9987'],
    camoScale: 1.35,
    wear: 0.12,
    dirt: 0.15,
    roughness: 0.5,
    metalness: 0.28,
    repeat: 0.42,
    seed: 29,
  });

  // Mảng giáp sẫm tạo chiều sâu cho hốc kỹ thuật & rãnh modul
  const matCompositeDark = paint({
    color: '#515a4d',
    camo: ['#454d42', '#616b5c'],
    camoScale: 1.3,
    wear: 0.15,
    dirt: 0.2,
    roughness: 0.56,
    metalness: 0.34,
    repeat: 0.45,
    seed: 37,
  });

  const matDarkMetal = plain('#242927', 0.46, 0.68);
  const matGunmetal = plain('#3a423e', 0.4, 0.72);
  const matSteelTrim = plain('#869182', 0.42, 0.45);
  const matGrille = plain('#181c1b', 0.62, 0.55);
  const matAesaRadar = plain('#2c3840', 0.32, 0.3);
  const matOpticCyan = plain('#187a8f', 0.1, 0.9, {
    emissive: new THREE.Color(PAL.cyan),
    emissiveIntensity: 0.24 + glow * 0.75,
  });
  const matOpticAmber = plain('#d98c24', 0.12, 0.86, {
    emissive: new THREE.Color(PAL.amber),
    emissiveIntensity: 0.28,
  });
  const matHvAccent = plain('#e08e26', 0.42, 0.2);
  const matHeadlight = plain('#e2f2fa', 0.16, 0.3, {
    emissive: new THREE.Color('#d4ecff'),
    emissiveIntensity: 0.4,
  });
  const matTaillight = plain('#c22828', 0.3, 0.2, {
    emissive: new THREE.Color('#ff3636'),
    emissiveIntensity: 0.28,
  });
  const matCapsuleTrim = plain(glow > 0.005 ? PAL.cyan : '#364645', 0.34, 0.42, {
    emissive: new THREE.Color(PAL.cyan),
    emissiveIntensity: glow * 1.85,
  });

  const wheelSpin = travel / 0.32;

  return (
    <group position={position} rotation={rotation}>
      {/* ==================== 1. HỆ GẦM GỌN NHẸ: 6 CẶP BÁNH CHỊU NẶNG & 2 DẢI XÍCH (y = 0) ==================== */}
      {[-1.35, 1.35].map((zTrack, sideIdx) => (
        <group key={sideIdx}>
          <Track
            xFront={2.54}
            xRear={-2.56}
            rFront={0.44}
            rRear={0.43}
            width={0.60}
            travel={travel}
            link={0.165}
            color="#313530"
            position={[0, 0, zTrack]}
          />
          {/* Đúng 6 bánh chịu nặng r = 0.32 m mỗi bên với vành xám-olive sáng rõ nét */}
          {ROADWHEEL_X.map((wx, wi) => (
            <Wheel
              key={wi}
              r={0.32}
              width={0.46}
              spin={wheelSpin}
              tire="#1f2221"
              rim="#7a8573"
              bolts={10}
              position={[wx, 0.355, zTrack]}
            />
          ))}
          {/* Bánh dẫn hướng trước & bánh chủ động sau đặt cao trong vòm chắn bùn (vành thép tối) */}
          <Wheel
            r={0.25}
            width={0.42}
            spin={travel / 0.25}
            tire="#272b29"
            rim="#3b423d"
            bolts={8}
            position={[2.66, 0.56, zTrack]}
          />
          <Wheel
            r={0.26}
            width={0.44}
            spin={travel / 0.26}
            tire="#272b29"
            rim="#3b423d"
            bolts={12}
            position={[-2.68, 0.55, zTrack]}
          />
        </group>
      ))}

      {/* ==================== 2. THÂN XE GỌN THẤP & VÁY GIÁP CHỦ ĐỘNG HIỆN ĐẠI ==================== */}
      <mesh geometry={geos.hullCore} material={matArmorMain} castShadow receiveShadow />
      <mesh geometry={geos.hullSponson} material={matArmorMain} castShadow receiveShadow />

      {/* Tấm giáp composite modul mũi thân + móc kéo đôi + cụm đèn pha LED bọc giáp */}
      <mesh position={[3.22, 1.12, 0]} rotation={[0, 0, -0.41]} geometry={rbox(0.94, 0.09, 2.24, 0.02)} material={matCompositeLight} castShadow receiveShadow />
      <mesh position={[3.42, 0.65, 0]} rotation={[0, 0, 0.44]} geometry={rbox(0.76, 0.08, 2.04, 0.018)} material={matCompositeDark} castShadow />
      {[-0.92, 0.92].map((sz, i) => (
        <mesh key={i} position={[3.73, 0.76, sz]} geometry={rbox(0.18, 0.11, 0.14, 0.025)} material={matGunmetal} castShadow />
      ))}
      {[-1.38, 1.38].map((sz, i) => (
        <group key={i} position={[3.44, 1.00, sz]}>
          <mesh geometry={rbox(0.22, 0.14, 0.30, 0.02)} material={matCompositeLight} castShadow />
          <mesh position={[0.10, 0, 0]} geometry={rbox(0.03, 0.06, 0.20, 0.008)} material={matHeadlight} />
        </group>
      ))}

      {/* Váy giáp chủ động hai bên sườn (rộng tổng đúng 3.55 m) có khe phân modul & khe cảm biến sườn */}
      {[-1, 1].map((side) => (
        <group key={side} position={[0, 0, side * 1.715]}>
          <mesh geometry={geos.sideSkirt} material={matArmorMain} castShadow receiveShadow />
          {/* Dải tấm giáp phản ứng ERA thế hệ mới ốp nổi nửa trên váy giáp */}
          {[-2.35, -1.41, -0.47, 0.47, 1.41, 2.35].map((tx, ti) => (
            <mesh
              key={ti}
              position={[tx, 1.02, side * 0.052]}
              geometry={rbox(0.86, 0.42, 0.03, 0.01)}
              material={ti % 2 === 0 ? matCompositeLight : matArmorMain}
              castShadow
            />
          ))}
          {/* Khe chia tấm giáp dọc sườn */}
          {[-2.82, -1.88, -0.94, 0, 0.94, 1.88, 2.82].map((gx, gi) => (
            <mesh key={gi} position={[gx, 0.96, side * 0.058]} geometry={rbox(0.026, 0.76, 0.024, 0.004)} material={matGrille} />
          ))}
          {/* 3 khe cảm biến cảnh báo sườn chủ động (sensor slits) dọc gờ trên váy giáp */}
          {[-1.88, 0, 1.88].map((sx, si) => (
            <group key={si} position={[sx, 1.28, side * 0.058]}>
              <mesh geometry={rbox(0.46, 0.082, 0.028, 0.008)} material={matDarkMetal} />
              <mesh position={[-0.09, 0, side * 0.01]} geometry={rbox(0.18, 0.036, 0.015, 0.004)} material={matOpticCyan} />
              <mesh position={[0.12, 0, side * 0.01]} geometry={rbox(0.12, 0.036, 0.015, 0.004)} material={matOpticAmber} />
            </group>
          ))}
        </group>
      ))}
      <Rivets points={geos.rivets} r={0.016} color="#444d41" />

      {/* ==================== 3. KHOANG BỌC THÉP 3 NGƯỜI Ở MŨI THÂN (3-MAN HULL CAPSULE) ==================== */}
      <mesh geometry={geos.capsuleCitadel} position={[0, 1.445, 0]} material={matCompositeLight} castShadow receiveShadow />
      {/* Đường viền quang học nhấn mạnh khoang tổ lái 3 người sáng cyan #29e3d4 theo capsuleGlow */}
      <mesh geometry={geos.capsuleGlowOutline} material={matCapsuleTrim} />

      {/* 3 nắp cửa sập bọc thép xếp thẳng hàng ngang (Pháo thủ - Lái xe - Trưởng xe) + kính tiềm vọng toàn cảnh */}
      {CREW_HATCH_Z.map((hz, hi) => (
        <group key={hi} position={[2.08, 1.54, hz]}>
          {/* Vành cổ cửa sập bọc thép nâng cao rõ khối */}
          <mesh position={[0, -0.008, 0]} material={matCompositeDark}>
            <cylinderGeometry args={[0.28, 0.30, 0.03, 16]} />
          </mesh>
          <mesh geometry={geos.crewHatch} material={matCompositeLight} castShadow />
          {/* Viền quang học quanh từng vị trí tổ lái phản hồi capsuleGlow */}
          <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matCapsuleTrim}>
            <ringGeometry args={[0.252, 0.282, 24]} />
          </mesh>
          {/* Bản lề thuỷ lực sau & tay khoá cửa sập */}
          <mesh position={[-0.22, 0.04, 0]} geometry={rbox(0.085, 0.045, 0.18, 0.008)} material={matGunmetal} castShadow />
          <mesh position={[0.04, 0.06, 0]} geometry={rbox(0.11, 0.02, 0.065, 0.005)} material={matDarkMetal} />

          {/* Vòng 5 kính tiềm vọng quang điện tử toàn cảnh phía trước mỗi cửa sập */}
          {[-0.60, -0.30, 0, 0.30, 0.60].map((ang, pi) => {
            const pr = 0.295;
            const px = Math.cos(ang) * pr;
            const pz = Math.sin(ang) * pr;
            return (
              <group key={pi} position={[px, 0.042, pz]} rotation={[0, -ang, 0]}>
                <mesh geometry={rbox(0.082, 0.082, 0.092, 0.008)} material={matGunmetal} castShadow />
                <mesh position={[0.038, 0.005, 0]} geometry={rbox(0.018, 0.046, 0.070, 0.003)} material={matOpticCyan} />
              </group>
            );
          })}
        </group>
      ))}

      {/* Cụm camera quan sát quang-nhiệt góc rộng ở 2 vai trước khoang tổ lái */}
      {[-1.18, 1.18].map((sz, i) => (
        <group key={i} position={[2.54, 1.53, sz]}>
          <mesh geometry={rbox(0.18, 0.095, 0.18, 0.015)} material={matGunmetal} castShadow />
          <mesh position={[0.085, 0, 0]} geometry={rbox(0.02, 0.048, 0.11, 0.004)} material={matOpticAmber} />
        </group>
      ))}

      {/* ==================== 4. KHOANG ĐỘNG CƠ HYBRID-ELECTRIC & TẢN NHIỆT TỔ ONG ==================== */}
      {[-0.88, 0.88].map((sz, i) => (
        <group key={i} position={[-2.52, 1.38, sz]}>
          <mesh geometry={rbox(1.56, 0.095, 0.72, 0.018)} material={matCompositeLight} castShadow receiveShadow />
          {/* Cánh tản nhiệt biến tần điện-lai */}
          {[-0.52, -0.32, -0.12, 0.08, 0.28, 0.48].map((fx, fi) => (
            <mesh key={fi} position={[fx, 0.055, 0]} geometry={rbox(0.052, 0.024, 0.56, 0.004)} material={matGunmetal} />
          ))}
          {/* Vạch bảo dưỡng hệ thống pin cao áp Hybrid-Electric */}
          <mesh position={[0.64, 0.05, 0]} geometry={rbox(0.075, 0.014, 0.50, 0.002)} material={matHvAccent} />
        </group>
      ))}

      {/* Lưới tản nhiệt tổ ong khuếch tán nhiệt giữa khoang động cơ & cửa thoát nhiệt thấp ở đuôi */}
      <group position={[-2.62, 1.37, 0]}>
        <mesh geometry={rbox(1.64, 0.06, 0.86, 0.01)} material={matGrille} />
        {Array.from({ length: 12 }, (_, i) => (
          <mesh
            key={i}
            position={[-0.72 + i * 0.13, 0.028, 0]}
            rotation={[0, 0, 0.26]}
            geometry={rbox(0.028, 0.034, 0.80, 0.003)}
            material={matSteelTrim}
          />
        ))}
      </group>
      <mesh position={[-3.79, 1.08, 0]} rotation={[0, 0, 0.28]} geometry={rbox(0.10, 0.34, 1.92, 0.015)} material={matGrille} />
      {[-0.66, 0, 0.66].map((lz, i) => (
        <mesh key={i} position={[-3.82, 1.09, lz]} rotation={[0, 0, 0.28]} geometry={rbox(0.04, 0.26, 0.50, 0.008)} material={matGunmetal} />
      ))}
      {[-1.44, 1.44].map((sz, i) => (
        <mesh key={i} position={[-3.74, 1.16, sz]} geometry={rbox(0.08, 0.09, 0.22, 0.01)} material={matTaillight} />
      ))}

      {/* ==================== 5. THÁP PHÁO TỰ ĐỘNG KHÔNG NGƯỜI LÁI VÁT TÀNG HÌNH (cao nóc 2.28 m) ==================== */}
      <group position={[-0.22, 1.46, 0]} rotation={[0, turretYaw, 0]}>
        {/* Vòng bi bệ tháp pháo */}
        <mesh position={[0, 0.03, 0]} material={matDarkMetal}>
          <cylinderGeometry args={[1.16, 1.20, 0.07, 36]} />
        </mesh>

        {/* Vỏ tháp pháo đa diện tàng hình vát liền khối (đỉnh cao y_local = 0.82 -> y_world = 2.28 m, không cửa người ngồi) */}
        <mesh geometry={geos.stealthTurret} material={matArmorMain} castShadow receiveShadow />

        {/* Các tấm giáp composite modul sáng ốp trên má vát trước & vai tháp pháo tạo đường chia giáp hiện đại */}
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh
              position={[0.88, 0.55, side * 0.86]}
              rotation={[side * 0.68, -side * 0.52, -0.22]}
              geometry={rbox(0.92, 0.06, 0.62, 0.015)}
              material={matCompositeLight}
              castShadow
            />
            {/* Cụm 4 ống phóng đạn khói ngụy trang gắn chìm gọn ở má tháp */}
            <group position={[0.68, 0.44, side * 1.30]} rotation={[0, -side * 0.28, -0.18]}>
              {[-0.105, -0.035, 0.035, 0.105].map((oz, oi) => (
                <mesh key={oi} position={[0, 0, oz]} rotation={[0, 0, -Math.PI / 2]} material={matGunmetal} castShadow>
                  <cylinderGeometry args={[0.035, 0.035, 0.18, 12]} />
                </mesh>
              ))}
            </group>
            {/* 4 tấm radar mảng pha phẳng Trophy-NG APS gắn chìm vào 4 góc vát tháp pháo */}
            <mesh
              position={[1.08, 0.46, side * 1.02]}
              rotation={[0, -side * 0.62, 0]}
              geometry={rbox(0.05, 0.22, 0.36, 0.01)}
              material={matAesaRadar}
            />
            <mesh
              position={[-1.92, 0.58, side * 0.99]}
              rotation={[0, side * 0.18, 0]}
              geometry={rbox(0.05, 0.22, 0.36, 0.01)}
              material={matAesaRadar}
            />
            {/* Bệ phóng đạn đánh chặn APS gọn sát sườn khoang bustle */}
            <mesh
              position={[-1.16, 0.66, side * 1.08]}
              geometry={rbox(0.48, 0.22, 0.22, 0.022)}
              material={matCompositeDark}
              castShadow
            />
          </group>
        ))}

        {/* Nóc tháp không người lái: nắp bảo dưỡng cơ cấu nạp tự động & 2 tấm xả nổ phẳng khoang bustle */}
        <mesh position={[0.24, 0.822, 0]} geometry={rbox(0.92, 0.028, 0.88, 0.008)} material={matCompositeDark} receiveShadow />
        {[-0.44, 0.44].map((bz, i) => (
          <mesh key={i} position={[-1.56, 0.808, bz]} geometry={rbox(1.18, 0.03, 0.72, 0.008)} material={matCompositeLight} castShadow receiveShadow />
        ))}
        {/* Cửa tiếp đạn tự động phía đuôi bustle */}
        <mesh position={[-2.42, 0.62, 0]} geometry={rbox(0.08, 0.28, 0.56, 0.012)} material={matGunmetal} />

        {/* Cụm kính ngắm quang-nhiệt chính của pháo thủ gắn thấp phía trước trái nóc tháp */}
        <group position={[0.64, 0.89, -0.58]}>
          <mesh geometry={rbox(0.46, 0.17, 0.34, 0.02)} material={matCompositeLight} castShadow />
          <mesh position={[0.22, 0, -0.075]} geometry={rbox(0.03, 0.095, 0.11, 0.005)} material={matOpticAmber} />
          <mesh position={[0.22, 0, 0.075]} geometry={rbox(0.03, 0.095, 0.11, 0.005)} material={matOpticCyan} />
        </group>

        {/* Cảm biến khí tượng & 2 ăng-ten liên kết dữ liệu ở đuôi tháp */}
        <mesh position={[-2.18, 1.04, -0.78]} material={matGunmetal}>
          <cylinderGeometry args={[0.022, 0.028, 0.46, 12]} />
        </mesh>
        <mesh position={[-2.18, 1.28, -0.78]} material={matDarkMetal}>
          <cylinderGeometry args={[0.046, 0.046, 0.05, 14]} />
        </mesh>
        {[-0.82, 0.82].map((az, i) => (
          <mesh key={i} position={[-2.24, 1.22, az]} material={matDarkMetal}>
            <cylinderGeometry args={[0.008, 0.014, 0.86, 8]} />
          </mesh>
        ))}

        {/* ==================== 6. PHÁO CHÍNH 120MM XM360 VỎ ĐA GIÁC TÀNG HÌNH + MRS ==================== */}
        <group position={[1.32, 0.44, 0]} rotation={[0, 0, gunPitch]}>
          <mesh geometry={geos.mantlet} material={matCompositeDark} castShadow receiveShadow />
          {/* Ống bọc súng máy đồng trục bên phải khiên pháo */}
          <mesh position={[0.42, 0.04, 0.28]} rotation={[0, 0, -Math.PI / 2]} material={matGunmetal} castShadow>
            <cylinderGeometry args={[0.034, 0.042, 0.58, 12]} />
          </mesh>

          {/* Vỏ tản nhiệt đa giác tàng hình 8 mặt phẳng sắc sảo bọc nòng & bầu hút khói */}
          <mesh geometry={geos.gunStealthShroud} material={matArmorDetail} castShadow receiveShadow />
          {/* Nòng trước composite + loa giảm giật đục lỗ XM360 (vươn tới x_world = +5.63 m -> xe dài đúng 9.45 m) */}
          <mesh geometry={geos.gunFront} material={matGunmetal} castShadow receiveShadow />

          {/* Rãnh thoát khí giảm giật ở đầu nòng & cảm biến MRS tích hợp gọn trên đầu nòng */}
          {[4.33, 4.39, 4.45].map((mx, i) => (
            <mesh key={i} position={[mx, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matGrille}>
              <cylinderGeometry args={[0.1065, 0.1065, 0.026, 20]} />
            </mesh>
          ))}
          <group position={[4.45, 0.12, 0]}>
            <mesh geometry={rbox(0.11, 0.068, 0.058, 0.008)} material={matCompositeLight} castShadow />
            <mesh position={[-0.052, 0.008, 0]} geometry={rbox(0.015, 0.034, 0.036, 0.003)} material={matOpticAmber} />
          </group>
        </group>

        {/* ==================== 7. TRẠM VŨ KHÍ CHỐNG DRONE COUNTER-UAS RWS (30MM XM914 + RADAR 4 MẶT) ==================== */}
        <group position={[-0.30, 0.82, 0]}>
          {/* Bệ trụ bát giác tích hợp 4 mặt radar mảng pha AESA nghiêng quét bầu trời 360 độ */}
          <mesh position={[0, 0.085, 0]} material={matCompositeDark} castShadow>
            <cylinderGeometry args={[0.36, 0.44, 0.17, 8]} />
          </mesh>
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((ra, i) => (
            <group key={i} rotation={[0, ra, 0]}>
              <mesh position={[0.365, 0.09, 0]} rotation={[0, 0, 0.40]} geometry={rbox(0.045, 0.15, 0.27, 0.01)} material={matSteelTrim} />
              <mesh position={[0.378, 0.092, 0]} rotation={[0, 0, 0.40]} geometry={rbox(0.03, 0.125, 0.235, 0.006)} material={matAesaRadar} />
            </group>
          ))}

          {/* Bệ xoay phương vị độc lập rwsYaw (tổng cao xe tới đỉnh RWS ~ 2.78 m) */}
          <group position={[0, 0.17, 0]} rotation={[0, rwsYaw, 0]}>
            <mesh position={[0, 0.02, 0]} material={matDarkMetal}>
              <cylinderGeometry args={[0.30, 0.33, 0.045, 24]} />
            </mesh>
            {/* Khung nạng bọc giáp đỡ pháo 30mm */}
            {[-0.145, 0.145].map((yz, i) => (
              <mesh key={i} position={[-0.02, 0.14, yz]} geometry={rbox(0.26, 0.24, 0.06, 0.012)} material={matCompositeLight} castShadow />
            ))}

            {/* Hộp đạn nổ mảnh lập trình chống drone 30x113mm bên phải + máng dẫn đạn */}
            <mesh position={[-0.04, 0.145, 0.29]} geometry={rbox(0.40, 0.23, 0.21, 0.02)} material={matCompositeLight} castShadow />
            <mesh geometry={geos.ammoChute} material={matDarkMetal} />

            {/* Cảm biến quang-nhiệt cầu tròn (Spherical EO/IR Hunter Ball) bên trái (đỉnh cao y_world ~ 2.78 m) */}
            <group position={[0.04, 0.22, -0.27]}>
              <mesh position={[0, -0.10, 0]} geometry={rbox(0.15, 0.14, 0.15, 0.015)} material={matGunmetal} />
              <group rotation={[0, 0, rwsPitch * 0.85]}>
                <mesh material={matCompositeLight} castShadow>
                  <sphereGeometry args={[0.125, 24, 18]} />
                </mesh>
                {/* Cửa sổ nhiệt FLIR hổ phách + laser đo xa cyan */}
                <mesh position={[0.106, 0.02, -0.032]} rotation={[0, 0, -Math.PI / 2]} material={matOpticAmber}>
                  <cylinderGeometry args={[0.040, 0.040, 0.03, 18]} />
                </mesh>
                <mesh position={[0.110, 0.02, 0.038]} rotation={[0, 0, -Math.PI / 2]} material={matOpticCyan}>
                  <cylinderGeometry args={[0.026, 0.026, 0.026, 16]} />
                </mesh>
                <mesh position={[0.112, -0.038, 0.005]} geometry={rbox(0.026, 0.03, 0.056, 0.004)} material={matDarkMetal} />
              </group>
            </group>

            {/* Cụm pháo liên thanh 30mm XM914 ngẩng cao săn drone theo rwsPitch */}
            <group position={[0.02, 0.18, 0]} rotation={[0, 0, rwsPitch]}>
              <mesh position={[-0.04, 0, 0]} geometry={rbox(0.58, 0.18, 0.19, 0.02)} material={matGunmetal} castShadow />
              <mesh position={[0.38, 0, 0]} geometry={rbox(0.34, 0.115, 0.115, 0.015)} material={matDarkMetal} castShadow />
              <mesh geometry={geos.rwsBarrel} position={[0.24, 0, 0]} material={matDarkMetal} castShadow />
              {/* Vòng cảm ứng lập trình ngòi nổ không trung (airburst programmer) đầu nòng 30mm */}
              <mesh position={[1.24, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matHvAccent}>
                <cylinderGeometry args={[0.0355, 0.0355, 0.06, 18]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

export default M1E3Abrams;

export const preview = turntable(M1E3Abrams, {
  size: 9.8,
  center: [0.3, 1.3, 0],
});
