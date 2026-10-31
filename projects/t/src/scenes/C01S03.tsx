// Cảnh C01S03 (10.86–16.36 s): Góc 3 — Over-The-Shoulder Ridge Trench Ambush POV.
// Từ công sự sườn đồi cao (~9.5 m) nhìn qua vai tổ hợp ATGM vác vai xuống lòng thung lũng (~0 m) nơi chiếc MBT
// đang lăn bánh; khóa mục tiêu đỏ 3D tại c01_knockout (14.06 s) và khai hỏa tên lửa vọt lên tại c01_atgm_launch (15.06 s).
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, useSpring, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { DustTrail, MuzzleBlast, Trail } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { fbm, paint, plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { STAGE_BATTLE, TERRAIN_STEPPE, THEME } from '../design';
import { ATGM } from '../parts/ATGM';
import { MBT } from '../parts/MBT';

// -------------------- ĐỊA HÌNH CÔNG SỰ SƯỜN ĐỒI & LÒNG THUNG LŨNG (TẤT ĐỊNH CẤP MODULE) --------------------
const AMBUSH_TERRAIN = heightField({
  seed: 31,
  amp: 1.15,
  scale: 72,
  oct: 4,
  flats: [
    // Nền công sự phẳng y = 9.5 m sát sau bờ bao cát để vách đồi phía trước đổ dốc ngay xuống thung lũng
    [-2.2, -0.2, 2.35, 9.5],
    // Hành lang đáy thung lũng phẳng y = 0 m cho MBT lăn bánh êm không lún xích
    [42.0, 0.0, 7.5, 0.0],
    [40.6, 7.5, 7.5, 0.0],
    [39.2, 15.0, 7.5, 0.0],
    [37.8, 22.5, 7.5, 0.0],
  ],
  add: (x, z) => {
    const ridge = 9.5 / (1 + Math.exp((x - 3.5) / 1.45));
    const leftSpur = 5.0 * Math.exp(-(((x - 24) / 13) ** 2) - (((z + 19) / 15) ** 2));
    const rightSpur = 4.5 * Math.exp(-(((x - 27) / 14) ** 2) - (((z - 34) / 16) ** 2));
    const farLeftHill = 15.5 * Math.exp(-(((x - 134) / 30) ** 2) - (((z + 18) / 28) ** 2));
    const farRightHill = 17.0 * Math.exp(-(((x - 130) / 28) ** 2) - (((z - 42) / 28) ** 2));
    const farSaddle = 5.6 * Math.exp(-(((x - 142) / 32) ** 2));
    return ridge + leftSpur + rightSpur + farLeftHill + farRightHill + farSaddle;
  },
});

const avoidRocks = (x: number, z: number) => {
  if (Math.hypot(x + 0.2, z + 0.1) < 4.6) return true;
  if (x > 0 && x < 10 && z > -3.5 && z < 4.5) return true;
  const roadX = 41.6 - (z - 2.2) * 0.23;
  if (Math.abs(x - roadX) < 6.4 && z > -10 && z < 30) return true;
  return false;
};

const avoidBushes = (x: number, z: number) => {
  if (Math.hypot(x + 0.2, z + 0.1) < 4.3) return true;
  if (x > -0.5 && x < 14 && z > -4.0 && z < 5.5) return true;
  const roadX = 41.6 - (z - 2.2) * 0.23;
  if (Math.abs(x - roadX) < 7.2 && z > -10 && z < 30) return true;
  return false;
};

const avoidPines = (x: number, z: number) => x < 58 || (z > -5 && z < 25);

// -------------------- VẬT LIỆU & HÌNH HỌC CÔNG SỰ BAO CÁT / ĐÁ TỰ NHIÊN (CACHE MODULE) --------------------
const MAT_SANDBAG = paint({
  color: '#88795b',
  camo: ['#706348', '#9b8b6b'],
  camoScale: 3.4,
  wear: 0.22,
  dirt: 0.34,
  roughness: 0.9,
  metalness: 0.04,
  repeat: 1.2,
  seed: 61,
});

const MAT_BOULDER = paint({
  color: '#635c53',
  camo: ['#4d4740', '#787065'],
  camoScale: 2.4,
  wear: 0.3,
  dirt: 0.3,
  roughness: 0.9,
  metalness: 0.06,
  repeat: 0.85,
  seed: 73,
});

const MAT_TIMBER = paint({
  color: '#5a4b39',
  camo: ['#45392b', '#6e5c47'],
  camoScale: 4.0,
  wear: 0.25,
  dirt: 0.38,
  roughness: 0.86,
  metalness: 0.05,
  repeat: 1.4,
  seed: 83,
});

const MAT_AMMO_BOX = paint({
  color: '#4e5940',
  camo: ['#3f4934', '#5f6c4f'],
  camoScale: 2.5,
  wear: 0.28,
  dirt: 0.26,
  roughness: 0.55,
  metalness: 0.26,
  repeat: 1,
  seed: 91,
});

const MAT_DARK_STRAP = plain('#232622', 0.72, 0.35);

const GEO_SANDBAG = rbox(0.50, 0.16, 0.28, 0.066);
const GEO_PLANK = rbox(1.5, 0.045, 0.24, 0.008);

const makeNaturalBoulder = (seed: number, sx: number, sy: number, sz: number) => {
  const g = new THREE.DodecahedronGeometry(0.42, 1);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    const n = (fbm(x * 2.6 + seed, y * 2.6, z * 2.6 + seed, 3) - 0.5) * 0.42;
    p.setXYZ(i, x * sx * (1 + n), y * sy * (1 + n * 0.7), z * sz * (1 + n));
  }
  g.computeVertexNormals();
  return g;
};

const GEO_BOULDER_L = makeNaturalBoulder(13, 1.32, 0.84, 1.12);
const GEO_BOULDER_R = makeNaturalBoulder(29, 1.12, 0.72, 1.02);

// Tường bao cát hạ thấp phần sau để không che khuất cụm ngắm CLU; gối bao cát cao đặt ở phía mũi ống đỡ đầu ống phóng!
const SANDBAG_STACK: { pos: V3; rot: V3; scale?: V3 }[] = [
  // Tầng 1 sát mặt công sự (y = 9.57)
  { pos: [0.62, 9.57, -0.72], rot: [0.02, 0.36, -0.02] },
  { pos: [0.72, 9.57, -0.24], rot: [-0.02, 0.24, 0.01] },
  { pos: [0.78, 9.57, 0.24], rot: [0.01, 0.10, -0.02] },
  { pos: [0.70, 9.57, 0.72], rot: [0.03, -0.14, 0.02] },
  // Tầng 2 so le (y = 9.72)
  { pos: [0.66, 9.72, -0.54], rot: [-0.02, 0.32, 0.02] },
  { pos: [0.80, 9.72, -0.02], rot: [0.02, 0.18, -0.01] },
  { pos: [0.78, 9.72, 0.48], rot: [-0.01, 0.05, 0.02] },
  // Tầng 3 kê dưới nửa trước ống phóng (phía trước CLU) để toàn bộ khối CLU, tay cò, BCU và thị kính xanh lộ rõ 100%!
  { pos: [0.92, 9.86, 0.12], rot: [-0.02, 0.22, 0.02], scale: [0.96, 0.94, 0.96] },
  { pos: [0.96, 10.00, 0.18], rot: [0.03, 0.26, -0.04], scale: [0.86, 0.86, 0.86] },
];

// -------------------- QUỸ ĐẠO XE TĂNG DƯỚI THUNG LŨNG & TÊN LỬA JAVELIN --------------------
const ATGM_BASE_POS: V3 = [0.60, 10.20, -0.02];

const tankStateAt = (sec: number) => {
  const dt = sec - CUE.c01_but_modern;
  const x0 = 41.6;
  const z0 = 2.4;
  const vx = -0.62;
  const vz = 2.66;
  const x = x0 + vx * dt;
  const z = z0 + vz * dt;
  const y = AMBUSH_TERRAIN(x, z);
  const speed = Math.hypot(vx, vz);
  const yaw = Math.atan2(-vz, vx);
  return { x, y, z, yaw, travel: (dt + 4.0) * speed };
};

const AIM_TARGET = (() => {
  const st = tankStateAt(CUE.c01_atgm_launch);
  return [st.x, st.y + 1.35, st.z] as V3;
})();

const AIM_VEC = (() => {
  const dx = AIM_TARGET[0] - ATGM_BASE_POS[0];
  const dy = AIM_TARGET[1] - ATGM_BASE_POS[1];
  const dz = AIM_TARGET[2] - ATGM_BASE_POS[2];
  const len = Math.hypot(dx, dy, dz);
  const dh = Math.hypot(dx, dz);
  return {
    dir: [dx / len, dy / len, dz / len] as V3,
    yaw: Math.atan2(-dz, dx),
    pitch: Math.atan2(dy, dh),
  };
})();

const MUZZLE_POS: V3 = [
  ATGM_BASE_POS[0] + AIM_VEC.dir[0] * 0.63,
  ATGM_BASE_POS[1] + AIM_VEC.dir[1] * 0.63,
  ATGM_BASE_POS[2] + AIM_VEC.dir[2] * 0.63,
];

// Đặt tâm khói phản lực sau đuôi ống hơi thấp về phía trái hào để luồng khói backblast tản ngang mặt hào, không bốc lên chắn ống kính
const BREECH_BLAST_POS: V3 = [
  ATGM_BASE_POS[0] - AIM_VEC.dir[0] * 0.66,
  ATGM_BASE_POS[1] - AIM_VEC.dir[1] * 0.66 - 0.18,
  ATGM_BASE_POS[2] - AIM_VEC.dir[2] * 0.66 - 0.16,
];

const missileCurveAt = (s: number): V3 => {
  const dist = s * 28.5;
  const climb = Math.pow(Math.max(0, s - 0.14) / 0.86, 1.82) * 8.4;
  const softDrop = -0.24 * Math.sin(Math.min(1, s / 0.26) * Math.PI * 0.5);
  const leadZ = Math.pow(s, 1.45) * 2.8;
  return [
    MUZZLE_POS[0] + AIM_VEC.dir[0] * dist,
    MUZZLE_POS[1] + AIM_VEC.dir[1] * dist + softDrop + climb,
    MUZZLE_POS[2] + AIM_VEC.dir[2] * dist + leadZ,
  ];
};

const MISSILE_TRAIL_PTS: V3[] = Array.from({ length: 64 }, (_, i) => missileCurveAt(0.02 + (i / 63) * 0.98));

/**
 * Vòng khóa mục tiêu đỏ mảnh 3D (THEME.threatRed) hướng về phía ống kính khi c01_knockout kích hoạt.
 * Bật depthTest={false} chuẩn ký hiệu HUD ngắm quang-nhiệt để vòng khóa tròn trọn vẹn 360°, không bị mặt đất cắt cụt nửa dưới.
 */
const TargetLockReticle3D: React.FC<{
  pos: V3;
  camPos: V3;
  lockSpring: number;
  pulse: number;
}> = ({ pos, camPos, lockSpring, pulse }) => {
  if (lockSpring <= 0.005) return null;
  const dx = camPos[0] - pos[0];
  const dy = camPos[1] - pos[1];
  const dz = camPos[2] - pos[2];
  const yaw = Math.atan2(dx, dz);
  const pitch = -Math.atan2(dy, Math.hypot(dx, dz));

  const scale = lerp(1.36, 1.0, Math.min(1.06, lockSpring)) * (1 + 0.02 * Math.sin(pulse * 9));
  const opacity = Math.min(0.94, lockSpring * 1.25);
  const R = 3.55;

  return (
    <group position={pos} rotation={[0, yaw, 0]} renderOrder={12}>
      <group rotation={[pitch, 0, 0]} scale={scale}>
        <mesh renderOrder={12}>
          <ringGeometry args={[R - 0.085, R, 72]} />
          <meshBasicMaterial
            color={THEME.threatRed}
            transparent
            opacity={opacity * 0.88}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>

        {[0.25, 0.75, 1.25, 1.75].map((q, idx) => (
          <mesh key={`arc-${idx}`} renderOrder={12}>
            <ringGeometry args={[R + 0.16, R + 0.29, 24, 1, q * Math.PI - 0.28, 0.56]} />
            <meshBasicMaterial
              color={THEME.threatRed}
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        ))}

        {[0, Math.PI * 0.5, Math.PI, Math.PI * 1.5].map((ang, idx) => (
          <mesh
            key={`tick-${idx}`}
            position={[Math.cos(ang) * (R - 0.46), Math.sin(ang) * (R - 0.46), 0]}
            rotation={[0, 0, ang]}
            renderOrder={12}
          >
            <planeGeometry args={[0.62, 0.09]} />
            <meshBasicMaterial
              color={THEME.threatRed}
              transparent
              opacity={opacity * 0.92}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthTest={false}
              depthWrite={false}
            />
          </mesh>
        ))}

        <mesh position={[0, R + 0.64, 0]} rotation={[0, 0, Math.PI]} renderOrder={12}>
          <coneGeometry args={[0.32, 0.52, 3]} />
          <meshBasicMaterial
            color={THEME.threatRed}
            transparent
            opacity={opacity}
            toneMapped={false}
            depthTest={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </group>
  );
};

const C01S03: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const pDolly = prog(t, CUE.c01_but_modern, CUE.c01_fpv_enter);
  const pZoom = prog(t, CUE.c01_knockout, CUE.c01_knockout + 0.55);
  const pPostLaunch = prog(t, CUE.c01_atgm_launch, CUE.c01_fpv_enter);
  const lockSpring = useSpring(t, CUE.c01_knockout, 14, 185);

  const tank = tankStateAt(t);
  const tankDustPath = useMemo(
    () => (sec: number): V3 => {
      const st = tankStateAt(sec);
      return [st.x - Math.cos(st.yaw) * 3.4, st.y + 0.12, st.z + Math.sin(st.yaw) * 3.4];
    },
    [],
  );

  // Đặt Camera lệch rõ sang bên phải ống phóng (z: +0.08 -> +0.44, cách ATGM ~1.92 m) tạo góc 3/4 qua vai chuẩn mực:
  // vừa không nhìn xuyên dọc lòng ống rỗng từ chính đuôi, vừa thấy trọn gân sườn ống phóng + toàn bộ cụm ngắm CLU,
  // đồng thời mở đường đạn <Trail> bay chéo rộng đẹp mắt lên phía xe tăng!
  const launchShake = bump(t, CUE.c01_atgm_launch, 0.24) * 0.032;
  const camPos: V3 = [
    lerp(-1.26, -1.16, pDolly) - launchShake * 0.5,
    lerp(10.82, 10.76, pDolly) + launchShake,
    lerp(0.14, 0.38, pDolly),
  ];
  const camLook: V3 = [
    lerp(40.5, 38.8, pDolly),
    lerp(2.25, 1.9, pZoom) + pPostLaunch * 1.45,
    lerp(5.8, 8.8, pDolly) + pPostLaunch * 0.65,
  ];
  const camFov = lerp(42, 35, pZoom);

  // Khai hỏa tại CUE.c01_atgm_launch (15.06 s)
  const isLaunched = t >= CUE.c01_atgm_launch;
  const tubeRecoil = bump(t, CUE.c01_atgm_launch, 0.22) * 0.046;
  const launcherPos: V3 = [
    ATGM_BASE_POS[0] - AIM_VEC.dir[0] * tubeRecoil,
    ATGM_BASE_POS[1] - AIM_VEC.dir[1] * tubeRecoil,
    ATGM_BASE_POS[2] - AIM_VEC.dir[2] * tubeRecoil,
  ];

  const flightU = prog(t, CUE.c01_atgm_launch, CUE.c01_fpv_enter, (x) => x * (0.40 + 0.60 * x));
  const finsOpen = prog(t, CUE.c01_atgm_launch, CUE.c01_atgm_launch + 0.25);
  const missilePos = missileCurveAt(flightU);
  const missileAhead = missileCurveAt(Math.min(1, flightU + 0.025));
  const missileBehind = missileCurveAt(Math.max(0, flightU - 0.025));
  const mdx = missileAhead[0] - missileBehind[0];
  const mdy = missileAhead[1] - missileBehind[1];
  const mdz = missileAhead[2] - missileBehind[2];
  const missileYaw = Math.atan2(-mdz, mdx);
  const missilePitch = Math.atan2(mdy, Math.hypot(mdx, mdz));

  return (
    <AbsoluteFill>
      <Stage width={W} height={H} {...STAGE_BATTLE} shadowCenter={[18, 4, 8]} shadowArea={38}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình mỏm đồi công sự đổ dốc sâu xuống lòng thung lũng & đèo núi xa */}
        <Terrain h={AMBUSH_TERRAIN} size={420} seg={224} center={[52, 10]} colors={TERRAIN_STEPPE} grainRepeat={50} />
        <Scatter kind="rock" count={75} area={[-10, -28, 78, 46]} h={AMBUSH_TERRAIN} seed={19} scale={[0.45, 1.3]} avoid={avoidRocks} tint="#b8b0a4" />
        <Scatter kind="bush" count={85} area={[-12, -30, 80, 48]} h={AMBUSH_TERRAIN} seed={27} scale={[0.55, 1.2]} avoid={avoidBushes} tint="#b7a377" />
        <Scatter kind="pine" count={36} area={[58, -42, 118, 56]} h={AMBUSH_TERRAIN} seed={43} scale={[0.85, 1.4]} avoid={avoidPines} tint="#8fa08c" />

        {/* ==================== TIỀN CẢNH TRÁI-DƯỚI: CÔNG SỰ BAO CÁT, ĐÁ TỰ NHIÊN & TỔ HỢP ATGM ==================== */}
        <group>
          {/* Ánh sáng hắt dịu chiếu trực tiếp vào sườn cụm ngắm CLU, bình BCU vàng và thị kính quang-nhiệt */}
          <pointLight position={[-0.25, 10.22, 0.35]} color="#ffe2ba" intensity={2.8} distance={3.4} decay={1.8} />

          {/* Ván gỗ lát nền công sự & hòm đạn quân sự */}
          {[-0.86, -0.58, -0.30].map((pz, i) => (
            <mesh
              key={`plank-${i}`}
              position={[-0.44, 9.51, pz]}
              rotation={[0, 0.22, 0]}
              geometry={GEO_PLANK}
              material={MAT_TIMBER}
              receiveShadow
            />
          ))}
          <group position={[-0.42, 9.63, -1.04]} rotation={[0, 0.44, 0]}>
            <mesh geometry={rbox(0.52, 0.24, 0.32, 0.018)} material={MAT_AMMO_BOX} castShadow receiveShadow />
            <mesh position={[0, 0.125, 0]} geometry={rbox(0.54, 0.03, 0.34, 0.01)} material={MAT_AMMO_BOX} castShadow />
            <mesh position={[-0.15, 0.01, 0.162]} geometry={rbox(0.048, 0.13, 0.012, 0.003)} material={MAT_DARK_STRAP} />
            <mesh position={[0.15, 0.01, 0.162]} geometry={rbox(0.048, 0.13, 0.012, 0.003)} material={MAT_DARK_STRAP} />
          </group>

          {/* Chồng bao cát công sự */}
          {SANDBAG_STACK.map((b, idx) => (
            <mesh
              key={`sb-${idx}`}
              position={b.pos}
              rotation={b.rot}
              scale={b.scale ?? [1, 1, 1]}
              geometry={GEO_SANDBAG}
              material={MAT_SANDBAG}
              castShadow
              receiveShadow
            />
          ))}

          {/* Đá tảng tự nhiên hai bên bờ hào */}
          <mesh
            position={[0.72, 9.60, -1.06]}
            rotation={[0.14, 0.55, -0.08]}
            geometry={GEO_BOULDER_L}
            material={MAT_BOULDER}
            castShadow
            receiveShadow
          />
          <mesh
            position={[0.82, 9.52, 1.12]}
            rotation={[-0.1, -0.42, 0.08]}
            geometry={GEO_BOULDER_R}
            material={MAT_BOULDER}
            castShadow
            receiveShadow
          />

          {/* Tổ hợp ống phóng vác vai ATGM xoay nghiêng cant -0.76 rad để đưa toàn bộ cụm ngắm CLU & thị kính quang-nhiệt xoay hẳn ra phía ống kính */}
          <group position={launcherPos} rotation={[0, AIM_VEC.yaw, 0]}>
            <group rotation={[0, 0, AIM_VEC.pitch]}>
              <group rotation={[-0.76, 0, 0]}>
                <ATGM mode={isLaunched ? 'launcher' : 'loaded'} />
              </group>
            </group>
          </group>
        </group>

        {/* ==================== HẬU CẢNH PHẢI-TRÊN: XE TĂNG CHỦ LỰC DƯỚI LÒNG THUNG LŨNG ==================== */}
        <MBT
          position={[tank.x, tank.y, tank.z]}
          rotation={[0, tank.yaw, 0]}
          turretYaw={-0.18}
          gunPitch={0.04}
          travel={tank.travel}
        />
        <DustTrail
          t={t}
          from={CUE.c01_but_modern - 1.8}
          to={CUE.c01_fpv_enter + 0.5}
          path={tankDustPath}
          rate={9}
          size={1.65}
          color="#c4b08c"
          life={2.6}
        />

        {/* Vòng khóa mục tiêu đỏ mảnh 3D trọn vẹn 360° bao quanh MBT tại c01_knockout (14.06 s) */}
        <TargetLockReticle3D
          pos={[tank.x, tank.y + 1.25, tank.z]}
          camPos={camPos}
          lockSpring={lockSpring}
          pulse={t - CUE.c01_knockout}
        />

        {/* ==================== KHAI HỎA TÊN LỬA TẠI CUE.c01_atgm_launch (15.06 s) ==================== */}
        <MuzzleBlast
          t={t}
          at={CUE.c01_atgm_launch}
          pos={[MUZZLE_POS[0], MUZZLE_POS[1] - 0.14, MUZZLE_POS[2]]}
          dir={[AIM_VEC.dir[0], AIM_VEC.dir[1] - 0.36, AIM_VEC.dir[2]]}
          size={0.21}
          seed={11}
        />
        <MuzzleBlast
          t={t}
          at={CUE.c01_atgm_launch}
          pos={BREECH_BLAST_POS}
          dir={[-0.70, -0.56, -0.44]}
          size={0.14}
          seed={19}
        />

        {isLaunched && (
          <>
            {flightU > 0.03 && (
              <>
                <Trail
                  points={MISSILE_TRAIL_PTS}
                  upto={Math.min(1, (flightU - 0.02) / 0.98)}
                  color="#ff9e2c"
                  width={0.034}
                  opacity={0.78}
                  glow
                />
                <Trail
                  points={MISSILE_TRAIL_PTS}
                  upto={Math.min(1, (flightU - 0.02) / 0.98)}
                  color="#fff7dc"
                  width={0.015}
                  opacity={0.96}
                  glow
                />
              </>
            )}
            <group position={missilePos} rotation={[0, missileYaw, 0]}>
              <group rotation={[0, 0, missilePitch]}>
                <ATGM mode="missile" finsOpen={finsOpen} thrust={1} />
              </group>
            </group>
          </>
        )}
      </Stage>
    </AbsoluteFill>
  );
};

export default C01S03;
