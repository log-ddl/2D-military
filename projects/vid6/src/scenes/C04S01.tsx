import React from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { DustTrail } from '@skill/military/3d/fx';
import { lathe, mat4, merge, rbox } from '@skill/military/3d/geom';
import { fbm, paint, plain } from '@skill/military/3d/materials';
import { Track } from '@skill/military/3d/parts';
import { CUE } from '../cues';
import { PAINT_PRESETS, PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import { PowerpackChassis3D } from '../parts/PowerpackChassis3D';

// ---------- Địa hình bãi thử sa mạc nắng gắt (phẳng tuyệt đối y = 0.000 dọc toàn bộ hành lang chạy & bãi xoay pivot) ----------
const DESERT_H = heightField({
  seed: 401,
  amp: 0.0,
  scale: 95,
  oct: 4,
  add: (x: number, z: number) => {
    const absZ = Math.abs(z);
    // Hành lang bãi thử phẳng tuyệt đối y = 0.000 cho mọi vị trí chạy nước rút & xoay pivot (x: -60..240, |z| < 16)
    const zMask = absZ < 16 ? 0 : absZ > 32 ? 1 : ((absZ - 16) / 16) ** 2 * (3 - (2 * (absZ - 16)) / 16);
    const dune = (fbm(x / 52 + 12, z / 52 + 8, 19, 4) - 0.35) * 9.5 + Math.sin(x * 0.04 + z * 0.03) * 2.6;
    const ridgeFar = absZ > 50 ? Math.min(20, (absZ - 50) * 0.25) * (0.65 + 0.5 * fbm(x / 70, z / 70, 31, 3)) : 0;
    return zMask * Math.max(0.2, dune + 2.8) + ridgeFar;
  },
});

const avoidRunway = (x: number, z: number) => Math.abs(z) < 18.5 && x > -65 && x < 245;

// ---------- Bảng động học tất định cấp module (khớp chính xác quãng đường 2 dải xích với toạ độ & góc xoay) ----------
type KinSample = {
  x: number;
  z: number;
  yaw: number;
  leftTravel: number;
  rightTravel: number;
  v: number;
  omega: number;
};

const T_MIN = 472.5;
const T_MAX = 500.6;
const DT = 1 / 120;
const HALF_TRACK = 1.345;

const smoothStep = (a: number, b: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

const KIN_TABLE: KinSample[] = (() => {
  const n = Math.ceil((T_MAX - T_MIN) / DT) + 1;
  const arr: KinSample[] = new Array(n);
  let x = -8.0;
  let z = 0.0;
  let yaw = 0.0;
  let leftTravel = 0.0;
  let rightTravel = 0.0;

  for (let i = 0; i < n; i++) {
    const t = T_MIN + i * DT;

    // Tốc độ tiến v (m/s): phóng nhanh @476.62, ổn định khi soi khoang lái, vọt ga @488.80, hãm mượt về 0 để xoay tại chỗ @495.3
    let v = 8.4;
    v += 4.2 * smoothStep(475.4, 476.65, t) * (1 - smoothStep(478.2, 479.8, t));
    v -= 2.8 * smoothStep(479.0, 480.6, t); // 5.6 m/s khi camera sà sát buồng lái
    v += 3.9 * smoothStep(CUE.c04_s01_twist, 489.65, t); // vặn ga T-bar @488.80 -> 9.5 m/s
    v *= 1 - smoothStep(492.4, 495.15, t); // dừng hẳn tại bãi xoay pivot

    // Tốc độ góc yaw omega (rad/s): lắc lái trái/phải @491.02, điều tốc Allison @492.58, xoay tròn tại chỗ @495.3..500.1
    const steerLeft = Math.sin(smoothStep(491.02, 491.68, t) * Math.PI) * 0.42;
    const steerRight = -Math.sin(smoothStep(491.62, 492.42, t) * Math.PI) * 0.48;
    const diffTurn = -0.45 * smoothStep(492.58, 493.6, t) * (1 - smoothStep(494.8, 495.4, t));
    // Xoay tròn clockwise (omega < 0 => leftTravel tiến > 0, rightTravel lùi < 0!) đủ >360 độ tại chỗ
    const pivotSpin = -1.46 * smoothStep(495.1, 496.2, t);
    const omega = steerLeft + steerRight + diffTurn + pivotSpin;

    arr[i] = { x, z, yaw, leftTravel, rightTravel, v, omega };

    x += v * Math.cos(yaw) * DT;
    z += -v * Math.sin(yaw) * DT;
    yaw += omega * DT;
    leftTravel += (v - omega * HALF_TRACK) * DT;
    rightTravel += (v + omega * HALF_TRACK) * DT;
  }
  return arr;
})();

const sampleKin = (t: number): KinSample => {
  const f = Math.max(0, Math.min(KIN_TABLE.length - 1.001, (t - T_MIN) / DT));
  const i = Math.floor(f);
  const p = f - i;
  const a = KIN_TABLE[i];
  const b = KIN_TABLE[i + 1];
  return {
    x: lerp(a.x, b.x, p),
    z: lerp(a.z, b.z, p),
    yaw: lerp(a.yaw, b.yaw, p),
    leftTravel: lerp(a.leftTravel, b.leftTravel, p),
    rightTravel: lerp(a.rightTravel, b.rightTravel, p),
    v: lerp(a.v, b.v, p),
    omega: lerp(a.omega, b.omega, p),
  };
};

const PIVOT_CENTER = sampleKin(497.5);

const localToWorld = (k: KinSample, lx: number, ly: number, lz: number): V3 => {
  const c = Math.cos(k.yaw);
  const s = Math.sin(k.yaw);
  return [k.x + lx * c + lz * s, ly, k.z - lx * s + lz * c];
};

// ---------- Geometry khung cắt bổ cổ tháp pháo + giỏ tháp xoay + nòng pháo M256 120mm phía trên đầu người lái ----------
const CUTAWAY_BARREL_GEO = lathe(
  [
    [0.128, 0.0],
    [0.128, 1.15],
    [0.112, 1.2],
    [0.11, 1.85],
    [0.095, 1.9],
    [0.092, 3.2],
    [0.086, 4.75],
    [0.094, 4.77],
    [0.094, 4.9],
    [0.06, 4.91],
    [0.058, 4.68],
    [0.001, 4.68],
  ],
  32
);

const CUTAWAY_EVAC_GEO = lathe(
  [
    [0.068, 2.15],
    [0.132, 2.28],
    [0.136, 2.82],
    [0.068, 2.96],
  ],
  28
);

const BASKET_GUARD_GEO = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const floorRing = new THREE.TorusGeometry(0.96, 0.024, 10, 32);
  floorRing.rotateX(Math.PI / 2);
  floorRing.translate(0, 0.56, 0);
  parts.push(floorRing);

  const midRing = new THREE.TorusGeometry(1.06, 0.02, 10, 32);
  midRing.rotateX(Math.PI / 2);
  midRing.translate(0, 0.92, 0);
  parts.push(midRing);

  const strut = new THREE.BoxGeometry(0.036, 0.72, 0.036);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    parts.push(strut.clone().applyMatrix4(mat4([Math.cos(a) * 1.01, 0.9, Math.sin(a) * 1.01], [0, -a, 0])));
  }
  return merge(parts);
})();

const TURRET_RACE_RING_GEO = new THREE.CylinderGeometry(1.22, 1.24, 0.09, 36, 1, true, Math.PI * 0.42, Math.PI * 1.38);

const BOLLARD_XS = Array.from({ length: 18 }, (_, i) => -10 + i * 11);

const matCarc = () =>
  paint({
    ...PAINT_PRESETS.abramsDesert,
    camo: [...PAINT_PRESETS.abramsDesert.camo],
    repeat: 0.42,
    seed: 17,
  });
const matGunDark = () => plain('#303842', 0.44, 0.68);
const matCutRed = () => plain('#c43b29', 0.46, 0.35);
const matBasketSteel = () => plain('#6e7e8f', 0.38, 0.74);
const matBrassGear = () => plain('#d4a338', 0.3, 0.82);
const matMarkerPost = () => plain('#d8c7a4', 0.72, 0.12);
const matMarkerStripe = () => plain('#c94a29', 0.55, 0.15);

/** Cụm cổ tháp cắt bổ, giỏ tháp xoay cách ly phía sau và nòng M256 120mm vươn ngay trên đầu người lái nằm ngửa */
const CutawayOverheadGunAndBasket: React.FC<{ basketYaw: number }> = ({ basketYaw }) => {
  return (
    <group>
      {/* Vành cổ tháp pháo cắt mở mặt phải (+Z) — hoàn toàn không che động cơ AGT1500 & hộp số Allison phía đuôi */}
      <group position={[0.32, 1.26, 0]}>
        <mesh geometry={TURRET_RACE_RING_GEO} material={matGunDark()} castShadow />
        <mesh position={[0, -0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBrassGear()}>
          <torusGeometry args={[1.16, 0.018, 8, 36]} />
        </mesh>

        {/* Giỏ tháp pháo xoay (spinning turret basket) cách ly hoàn toàn phía sau vách ngăn mũi lái xe x = 1.74 */}
        <group position={[0, -1.26, 0]} rotation={[0, basketYaw, 0]}>
          <mesh geometry={BASKET_GUARD_GEO} material={matBasketSteel()} castShadow />
        </group>
      </group>

      {/* Khung giá đỡ pháo chính cắt bổ & nòng pháo M256 120mm nằm ngay phía trên người lái (y = 1.72 m) */}
      <group position={[0.78, 1.72, 0]}>
        {/* Trụ đỡ trunnion gắn xuống vành trước cổ tháp bên trái (-Z) để giữ thoáng hoàn toàn cửa sổ cắt bổ (+Z) */}
        <mesh position={[0.42, -0.24, -0.44]} rotation={[0, 0, 0.32]} geometry={rbox(0.56, 0.46, 0.16, 0.02)} material={matCarc()} castShadow />
        <mesh position={[0.42, -0.24, -0.355]} rotation={[0, 0, 0.32]} material={matCutRed()}>
          <boxGeometry args={[0.55, 0.45, 0.018]} />
        </mesh>

        {/* Khiên pháo cắt bổ nửa trái + viền mặt cắt đỏ kỹ thuật */}
        <mesh position={[0.54, 0, -0.14]} geometry={rbox(0.68, 0.36, 0.36, 0.024)} material={matCarc()} castShadow />
        <mesh position={[0.54, 0, 0.045]} material={matCutRed()}>
          <boxGeometry args={[0.66, 0.34, 0.018]} />
        </mesh>

        {/* Nòng pháo chính 120mm M256 L/44 + bầu hút khói + cảm biến đầu nòng MRS vươn dọc phía trên đầu lái xe */}
        <mesh geometry={CUTAWAY_BARREL_GEO} material={matCarc()} castShadow />
        <mesh position={[0, 0.03, 0]} geometry={CUTAWAY_EVAC_GEO} material={matCarc()} castShadow />
        {[1.88, 2.2, 2.92, 4.76].map((bx, idx) => (
          <mesh key={idx} position={[bx, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matGunDark()}>
            <cylinderGeometry args={[idx === 1 || idx === 2 ? 0.138 : 0.102, idx === 1 || idx === 2 ? 0.138 : 0.102, 0.04, 24]} />
          </mesh>
        ))}
        <group position={[4.83, 0.09, 0]}>
          <mesh position={[0, 0.045, 0]} geometry={rbox(0.05, 0.09, 0.034, 0.006)} material={matGunDark()} />
          <mesh position={[-0.01, 0.095, 0]} geometry={rbox(0.07, 0.05, 0.044, 0.008)} material={matCarc()} />
        </group>
      </group>
    </group>
  );
};

const C04S01: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();
  const tc = Math.max(472.7, Math.min(500.4, t));

  const kin = sampleKin(tc);

  // Tay ga vặn mô-tô (throttleTwist: 0 -> 1 đúng CUE.c04_s01_twist @ 488.80)
  const throttleBase = 0.12 + 0.12 * prog(tc, 475.8, 477.2);
  const twistRamp = prog(tc, CUE.c04_s01_twist, 489.62);
  const throttleTwist = Math.min(1, throttleBase + twistRamp * 0.88);

  // Ghi-đông T-bar bẻ trái rồi bẻ phải @ CUE.c04_s01_steer (491.02), sau đó giữ góc bẻ xoay pivot
  const steerLeft = bump(tc, CUE.c04_s01_steer, 0.68) * 0.45;
  const steerRight = -bump(tc, CUE.c04_s01_steer + 0.62, 0.78) * 0.5;
  const steerPivot = -0.46 * prog(tc, 495.0, 496.1);
  const steerMicro = 0.025 * Math.sin(tc * 2.4) * (1 - prog(tc, 488.5, 490.0));
  const steerAngle = steerMicro + steerLeft + steerRight + steerPivot;

  // Giỏ tháp pháo xoay nhẹ lúc giới thiệu "isolated from the spinning turret basket" (478.8..485.5)
  const basketYaw =
    0.85 * prog(tc, 478.6, 483.2) - 0.35 * prog(tc, 483.2, 486.4) + 0.25 * prog(tc, 493.0, 500.1);

  // Tốc độ cánh tuabin & ánh lửa buồng đốt khi vặn ga và xoay pivot
  const turbineSpin = (tc - 472.0) * 32 + twistRamp * 14;
  const exhaustGlow = 0.38 + 0.46 * twistRamp + 0.14 * prog(tc, 495.5, 497.5);

  // Vệt rãnh cát tròn khắc dần trên nền sa mạc khi 73.6 tấn xoay pivot tại chỗ
  const pivotSkidProg = prog(tc, 495.3, 499.6);

  // ---------- Ngôn ngữ Camera 4 nhịp mượt mà ----------
  // Nhịp 1 (472.9..479.3): Bám thấp góc 3/4 mũi xe phóng tốc độ cao trên bãi cát sa mạc
  // Nhịp 2 (479.3..486.3): Sà sát cửa cắt bổ khoang mũi lộ rõ người lái đội mũ CVC nằm ngửa dưới nòng pháo M256
  // Nhịp 3 (486.3..492.4): Đẩy cận cảnh qua vai người lái vào ghi-đông T-bar, tay ga vặn @488.80 & bẻ lái @491.02
  // Nhịp 4 (492.4..500.1): Kéo lùi & nâng cao ổn định ngoài không gian để lộ hộp số Allison ở đuôi & cú xoay tròn 360° tại chỗ
  const pToCockpit = prog(tc, 479.1, 482.2);
  const pCockpitDrift = prog(tc, 482.2, 486.2);
  const pToTbar = prog(tc, 486.2, 488.1);
  const pToAllison = prog(tc, CUE.c04_s01_allison - 0.15, 495.15);
  const pToWidePivot = prog(tc, 495.3, 497.6);

  // Toạ độ camera trong hệ quy chiếu xe cho Nhịp 1 -> 2 -> 3
  const locPos1: V3 = [
    lerp(5.5, 4.4, prog(tc, 473.1, 479.0)),
    lerp(1.12, 1.24, prog(tc, 473.1, 479.0)),
    lerp(3.75, 2.95, prog(tc, 473.1, 479.0)),
  ];
  const locLook1: V3 = [
    lerp(0.65, 1.45, prog(tc, 473.1, 479.0)),
    0.88,
    0.0,
  ];

  // Nhịp 2: Ngang-chéo 3/4 nhìn thẳng vào người lái nằm ngửa + nòng pháo 120mm ngay phía trên
  const locPos2: V3 = [
    lerp(2.15, 2.62, pCockpitDrift),
    lerp(1.44, 1.36, pCockpitDrift),
    lerp(2.34, 2.12, pCockpitDrift),
  ];
  const locLook2: V3 = [2.46, 0.98, 0.02];

  // Nhịp 3: Cận cảnh sắc nét người lái nắm T-bar, vặn cổ tay ga phải & bẻ lái trái/phải
  const locPos3: V3 = [1.74, 1.36, 1.12];
  const locLook3: V3 = [2.66, 0.96, 0.06];

  const mixV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

  const locPos12 = mixV3(locPos1, locPos2, pToCockpit);
  const locLook12 = mixV3(locLook1, locLook2, pToCockpit);
  const locPos123 = mixV3(locPos12, locPos3, pToTbar);
  const locLook123 = mixV3(locLook12, locLook3, pToTbar);

  const worldFollowPos = localToWorld(kin, locPos123[0], locPos123[1], locPos123[2]);
  const worldFollowLook = localToWorld(kin, locLook123[0], locLook123[1], locLook123[2]);

  // Nhịp 4: Camera toạ độ thế giới (không xoay cuốn theo thân xe!) nhìn rõ hộp số Allison X1100-3B & toàn khung gầm 73.6 tấn xoay tròn
  const orbitAng = lerp(2.42, 2.74, prog(tc, 492.5, 500.1));
  const allisonClosePos: V3 = [
    kin.x + Math.cos(orbitAng) * 5.35,
    2.95,
    kin.z + Math.sin(orbitAng) * 5.35,
  ];
  const allisonCloseLook: V3 = [kin.x - 1.65 * Math.cos(kin.yaw), 0.72, kin.z + 1.65 * Math.sin(kin.yaw)];

  const widePivotPos: V3 = [
    PIVOT_CENTER.x + Math.cos(orbitAng) * 8.2,
    4.75,
    PIVOT_CENTER.z + Math.sin(orbitAng) * 8.2,
  ];
  const widePivotLook: V3 = [PIVOT_CENTER.x, 0.72, PIVOT_CENTER.z];

  const worldOverheadPos = mixV3(allisonClosePos, widePivotPos, pToWidePivot);
  const worldOverheadLook = mixV3(allisonCloseLook, widePivotLook, pToWidePivot);

  const camPos = mixV3(worldFollowPos, worldOverheadPos, pToAllison);
  const camLook = mixV3(worldFollowLook, worldOverheadLook, pToAllison);
  const camFov = lerp(lerp(42, 41, pToCockpit), 35, pToTbar) * (1 - pToAllison) + 40 * pToAllison;

  // Nhấn sáng đèn chỉ thị cơ khí lên hộp số ngang Allison X1100-3B từ 492.58s
  const allisonHighlight = prog(tc, CUE.c04_s01_allison, 493.4);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#11161d' }}>
      <Stage
        {...LOOK_DESERT_GLARE.stage}
        width={W}
        height={H}
        shadowArea={22}
        shadowCenter={[kin.x, 0, kin.z]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình sa mạc bãi thử + đá tảng & bụi cây sa mạc hai bên hành lang */}
        <Terrain
          h={DESERT_H}
          size={420}
          seg={260}
          center={[95, 0]}
          colors={LOOK_DESERT_GLARE.terrain}
          grainRepeat={52}
        />
        <Scatter
          kind="rock"
          count={160}
          area={[-45, -95, 235, 95]}
          h={DESERT_H}
          seed={41}
          scale={[0.55, 1.65]}
          avoid={avoidRunway}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />
        <Scatter
          kind="bush"
          count={110}
          area={[-45, -85, 235, 85]}
          h={DESERT_H}
          seed={73}
          scale={[0.5, 1.15]}
          avoid={avoidRunway}
          tint="#b8a574"
        />

        {/* Hàng cọc tiêu đo tốc độ dọc lề bãi thử sa mạc giúp cảm nhận tốc độ phóng cực rõ */}
        {BOLLARD_XS.map((bx, i) => (
          <group key={i} position={[bx, 0, -7.8]}>
            <mesh position={[0, 0.45, 0]} material={matMarkerPost()} castShadow>
              <boxGeometry args={[0.14, 0.9, 0.14]} />
            </mesh>
            <mesh position={[0, 0.72, 0]} material={matMarkerStripe()}>
              <boxGeometry args={[0.15, 0.22, 0.15]} />
            </mesh>
          </group>
        ))}

        {/* Vòng rãnh xích tròn cày sâu trên cát sa mạc khi khung gầm 73.6 tấn xoay pivot 360° tại chỗ */}
        {pivotSkidProg > 0.01 && (
          <group position={[PIVOT_CENTER.x, 0.012, PIVOT_CENTER.z]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <ringGeometry args={[1.15, 3.65, 56, 1, 0, Math.PI * 2 * Math.min(1, pivotSkidProg * 1.15)]} />
              <meshStandardMaterial color="#8b7049" roughness={0.98} transparent opacity={0.62 * pivotSkidProg} />
            </mesh>
            <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <ringGeometry args={[2.95, 3.72, 56, 1, 0, Math.PI * 2 * Math.min(1, pivotSkidProg * 1.15)]} />
              <meshStandardMaterial color="#c9ae80" roughness={0.95} transparent opacity={0.75 * pivotSkidProg} />
            </mesh>
          </group>
        )}

        {/* ==================== CHỦ THỂ CHÍNH: KHUNG GẦM CẮT BỔ 1:1 + 2 DẢI XÍCH + PHÁO 120MM TRÊN ĐẦU LÁI XE ==================== */}
        <group position={[kin.x, 0.018, kin.z]} rotation={[0, kin.yaw, 0]}>
          <PowerpackChassis3D
            mode="full"
            steerAngle={steerAngle}
            throttleTwist={throttleTwist}
            leftTravel={kin.leftTravel}
            rightTravel={kin.rightTravel}
            turbineSpin={turbineSpin}
            exhaustGlow={exhaustGlow}
          />

          {/* Hai dải xích T-158 ôm bánh chịu nặng & bánh sao: chạy cùng chiều khi phóng, chạy NGƯỢC CHIỀU khi xoay pivot! */}
          <Track
            xFront={3.18}
            xRear={-3.08}
            rFront={0.455}
            rRear={0.475}
            width={0.56}
            link={0.165}
            travel={kin.leftTravel}
            color="#2d2f2c"
            position={[0, 0.0, -HALF_TRACK]}
          />
          <Track
            xFront={3.18}
            xRear={-3.08}
            rFront={0.455}
            rRear={0.475}
            width={0.56}
            link={0.165}
            travel={kin.rightTravel}
            color="#2d2f2c"
            position={[0, 0.0, HALF_TRACK]}
          />

          {/* Cổ tháp pháo cắt bổ + giỏ tháp xoay phía sau + nòng pháo M256 120mm ngay trên đầu người lái nằm ngửa */}
          <CutawayOverheadGunAndBasket basketYaw={basketYaw} />

          {/* Vòng nhấn truyền động hổ phách-cyan trên hai trục ra hộp số ngang Allison X1100-3B ở đuôi (x = -3.14) */}
          {allisonHighlight > 0.01 && (
            <group position={[-3.14, 0.66, 0]}>
              <pointLight color="#ffaa2b" intensity={3.5 * allisonHighlight} distance={3.2} position={[0.15, 0.55, 0]} />
              {([-1, 1] as const).map((s) => (
                <mesh key={s} position={[0, 0, s * 0.96]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.27, 0.018, 10, 28]} />
                  <meshBasicMaterial
                    color={s < 0 ? PAL.cyan : PAL.amber}
                    transparent
                    opacity={0.85 * allisonHighlight}
                    toneMapped={false}
                  />
                </mesh>
              ))}
            </group>
          )}
        </group>

        {/* Bụi cát cuồn cuộn phía sau hai dải xích khi phóng tốc độ cao trên sa mạc */}
        <DustTrail
          t={tc}
          from={472.5}
          to={495.2}
          rate={11}
          size={2.35}
          life={2.8}
          color="#d7c097"
          path={(tb) => localToWorld(sampleKin(tb), -3.45, 0.05, -1.42)}
        />
        <DustTrail
          t={tc}
          from={472.5}
          to={495.2}
          rate={11}
          size={2.35}
          life={2.8}
          color="#d7c097"
          path={(tb) => localToWorld(sampleKin(tb), -3.45, 0.05, 1.42)}
        />

        {/* Vòng bão bụi cát xoáy tròn 360° ôm vành ngoài 4 góc dải xích (giữ rõ nét chủ thể khung gầm & hộp số ở tâm!) */}
        <DustTrail
          t={tc}
          from={494.8}
          to={500.4}
          rate={7}
          size={1.42}
          life={1.75}
          color="#dec79e"
          path={(tb) => localToWorld(sampleKin(tb), 3.35, 0.03, -1.95)}
        />
        <DustTrail
          t={tc}
          from={494.8}
          to={500.4}
          rate={7}
          size={1.42}
          life={1.75}
          color="#dec79e"
          path={(tb) => localToWorld(sampleKin(tb), -3.35, 0.03, 1.95)}
        />
        <DustTrail
          t={tc}
          from={495.2}
          to={500.4}
          rate={6}
          size={1.28}
          life={1.65}
          color="#d2b88c"
          path={(tb) => localToWorld(sampleKin(tb), 3.15, 0.03, 1.95)}
        />
        <DustTrail
          t={tc}
          from={495.2}
          to={500.4}
          rate={6}
          size={1.28}
          life={1.65}
          color="#d2b88c"
          path={(tb) => localToWorld(sampleKin(tb), -3.15, 0.03, -1.95)}
        />
      </Stage>

      {/* Đúng 1 <Label> duy nhất ở đoạn xoay pivot: "73.6 TONS" (497.16..499.70) */}
      <Label
        t={t}
        text="73.6 TONS"
        x={W * 0.78}
        y={H * 0.17}
        from={CUE.c04_s01_pivot}
        until={499.7}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C04S01;
