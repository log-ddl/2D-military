import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, Trail } from '@lib/3d/fx';
import { extrude, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { P, STAGE_FINALE_SUNRISE } from '../local/palette';
import {
  AMRAAM,
  F15_CENTERLINE_POS,
  F15_STA1_POS,
  F15_STA9_POS,
  F15EX,
  F35A,
  HypersonicMissile,
  SamBattery,
} from '../local/models';

// ---------- Địa hình cao nguyên đồi núi & Căn cứ chỉ huy phòng không kiên cố tại [132, 6, 0] ----------
const BASE_X = 132;
const BASE_Y = 6.0;
const BASE_Z = 0;

const FINALE_H = heightField({
  seed: 28,
  amp: 9.0,
  scale: 115,
  oct: 5,
  flats: [[BASE_X, BASE_Z, 38, BASE_Y]],
  add: (x, z) => {
    const northRange = 36 * Math.exp(-(((z + 118) / 46) ** 2));
    const southRange = 42 * Math.exp(-(((z - 124) / 48) ** 2));
    const horizonRidge = 34 * Math.exp(-(((x - 275) / 56) ** 2)) * (0.45 + 0.55 * Math.sin(z * 0.025) ** 2);
    return northRange + southRange + horizonRidge;
  },
});

const AVOID_FORTRESS = (x: number, z: number) => Math.hypot(x - BASE_X, z - BASE_Z) < 42;

// Nội suy Bézier bậc 3 cho 3 quả tên lửa cắm chéo xuống căn cứ mục tiêu
const cubicBezier = (p: number, p0: V3, p1: V3, p2: V3, p3: V3): V3 => {
  const u = 1 - p;
  const b0 = u * u * u;
  const b1 = 3 * u * u * p;
  const b2 = 3 * u * p * p;
  const b3 = p * p * p;
  return [
    b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
    b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
    b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2],
  ];
};

// ---------- Quần thể Tòa nhà Chỉ huy Boong-ke Bê tông Cốt thép & Tháp Radar Kiên cố ----------
const FortifiedCommandBase: React.FC<{ t: number }> = ({ t }) => {
  // Mức độ sụp đổ công trình khi chuỗi đại chấn nổ giáng xuống từ 784.20s
  const mainCollapse = prog(t, CUE.s28_buildingDown, CUE.s28_buildingDown + 0.95);
  const towerCollapse = prog(t, CUE.s28_buildingDown + 0.16, CUE.s28_buildingDown + 1.25);
  const wingCollapse = prog(t, CUE.s28_buildingDown + 0.32, CUE.s28_buildingDown + 1.2);

  // Vật liệu bê tông quân sự cho khối extrude lớn (đặt repeat: 0.36 theo chuẩn UV mét thật 1m = 1UV)
  const concreteMat = useMemo(
    () =>
      paint({
        color: '#827e77',
        camo: ['#6d6962', '#969188'],
        camoScale: 1.2,
        wear: 0.28,
        dirt: 0.36,
        roughness: 0.85,
        metalness: 0.1,
        repeat: 0.36,
        seed: 281,
      }),
    [],
  );

  const darkConcrete = useMemo(
    () =>
      paint({
        color: '#57544f',
        camo: ['#45423e', '#69655f'],
        camoScale: 1.4,
        wear: 0.32,
        dirt: 0.44,
        roughness: 0.88,
        metalness: 0.14,
        repeat: 0.4,
        seed: 282,
      }),
    [],
  );

  const tarmacMat = useMemo(
    () =>
      paint({
        color: '#3f4145',
        camo: ['#34363a', '#4d4f54'],
        camoScale: 1.5,
        wear: 0.22,
        dirt: 0.35,
        roughness: 0.9,
        metalness: 0.08,
        repeat: 4,
        seed: 283,
      }),
    [],
  );

  const steelMat = useMemo(() => plain('#353c45', 0.45, 0.65), []);
  const blastGlass = useMemo(() => plain('#1b2d3b', 0.15, 0.8), []);
  const radomeWhite = useMemo(() => plain('#d8dfe6', 0.38, 0.15), []);
  const radarRed = useMemo(() => plain('#a82832', 0.4, 0.3), []);

  const geos = useMemo(() => {
    // Khối thân dưới vát nghiêng chống đạn của Tòa nhà chỉ huy chính (dài 24m x sâu 16.5m x cao 7.2m)
    const bunkerBase = extrude(
      [
        [-12.0, 0],
        [12.0, 0],
        [10.2, 7.2],
        [-10.2, 7.2],
      ],
      16.5,
      0.12,
    );
    // Tầng đài chỉ huy bọc thép nhô ra phía trên (cao từ 7.2m tới 11.4m)
    const commandDeck = extrude(
      [
        [-8.6, 0],
        [9.4, 0],
        [10.4, 2.2],
        [9.0, 4.2],
        [-8.2, 4.2],
      ],
      13.2,
      0.1,
    );
    // Thân tháp radar bê tông cốt thép cao 13.5m
    const radarTower = extrude(
      [
        [-3.4, 0],
        [3.4, 0],
        [2.2, 13.5],
        [-2.2, 13.5],
      ],
      6.4,
      0.08,
    );
    // Hầm vòm chứa đạn / chỉ huy phụ (dài 16m, rộng 12.5m, cao 6.2m)
    const archBunker = extrude(
      [
        [-6.4, 0],
        [6.4, 0],
        [5.6, 3.8],
        [3.2, 5.8],
        [0, 6.3],
        [-3.2, 5.8],
        [-5.6, 3.8],
      ],
      16.2,
      0.1,
    );
    return { bunkerBase, commandDeck, radarTower, archBunker };
  }, []);

  return (
    <group position={[BASE_X, BASE_Y, BASE_Z]}>
      {/* Sân bê tông căn cứ quân sự & tường chắn mảnh đạn bao quanh */}
      <mesh position={[0, 0.14, 0]} geometry={rbox(56, 0.28, 48, 0.08)} material={tarmacMat} receiveShadow />
      <mesh position={[0, 1.2, -23.2]} geometry={rbox(52, 2.4, 1.3, 0.12)} material={darkConcrete} castShadow receiveShadow />
      <mesh position={[0, 1.2, 23.2]} geometry={rbox(52, 2.4, 1.3, 0.12)} material={darkConcrete} castShadow receiveShadow />
      <mesh position={[-27.2, 1.2, -10]} geometry={rbox(1.3, 2.4, 22, 0.12)} material={darkConcrete} castShadow receiveShadow />
      <mesh position={[27.2, 1.2, 9]} geometry={rbox(1.3, 2.4, 24, 0.12)} material={darkConcrete} castShadow receiveShadow />

      {/* 1. TÒA NHÀ CHỈ HUY BOONG-KE TRUNG TÂM (bị đạn siêu vượt âm 22 ft đánh sập hoàn toàn lúc 784.20s) */}
      <group
        position={[0, -mainCollapse * 3.4, 0]}
        rotation={[mainCollapse * 0.14, mainCollapse * 0.06, -mainCollapse * 0.18]}
      >
        <mesh geometry={geos.bunkerBase} material={concreteMat} castShadow receiveShadow />
        {/* Các gân trụ chống bom dọc sườn boong-ke */}
        {[-8.5, -4.2, 0, 4.2, 8.5].map((bx, i) => (
          <group key={i}>
            <mesh position={[bx, 3.5, 8.35]} rotation={[-0.22, 0, 0]} geometry={rbox(1.25, 7.1, 0.9, 0.06)} material={darkConcrete} castShadow />
            <mesh position={[bx, 3.5, -8.35]} rotation={[0.22, 0, 0]} geometry={rbox(1.25, 7.1, 0.9, 0.06)} material={darkConcrete} castShadow />
          </group>
        ))}
        {/* Cửa thép hầm ngầm */}
        <mesh position={[-11.3, 2.2, 0]} geometry={rbox(0.6, 4.2, 5.6, 0.05)} material={steelMat} />

        {/* Tầng đài chỉ huy trên nóc + vòm thông tin vệ tinh (vỡ gãy sập xuống khi trúng đạn) */}
        <group
          position={[mainCollapse * 1.8, 7.15 - mainCollapse * 2.8, mainCollapse * 1.1]}
          rotation={[mainCollapse * 0.32, -mainCollapse * 0.15, mainCollapse * 0.38]}
        >
          <mesh geometry={geos.commandDeck} material={concreteMat} castShadow receiveShadow />
          <mesh position={[0.6, 2.3, 0]} geometry={rbox(19.2, 1.05, 13.5, 0.04)} material={blastGlass} />
          <mesh position={[-3.5, 5.4, 2.2]} material={radomeWhite} castShadow>
            <sphereGeometry args={[2.1, 20, 14]} />
          </mesh>
          <mesh position={[4.5, 6.2, -2.0]} material={steelMat} castShadow>
            <cylinderGeometry args={[0.14, 0.28, 4.4, 10]} />
          </mesh>
        </group>
      </group>

      {/* Lõi lửa cháy rực trong đống đổ nát tòa nhà chỉ huy sau cú nổ 784.20s */}
      {mainCollapse > 0.05 && (
        <mesh position={[0, 2.2, 0]} scale={[7.5, 2.6, 5.5]}>
          <icosahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color="#ff5917" transparent opacity={0.75 * mainCollapse} toneMapped={false} />
        </mesh>
      )}

      {/* 2. THÁP RADAR CẢNH GIỚI KIÊN CỐ (tại [11, 0, -13], gãy đổ nghiêng lúc 784.36s) */}
      <group
        position={[11, -towerCollapse * 2.2, -13]}
        rotation={[towerCollapse * 0.52, towerCollapse * 0.18, -towerCollapse * 0.64]}
      >
        <mesh geometry={geos.radarTower} material={concreteMat} castShadow receiveShadow />
        <mesh position={[0, 13.6, 0]} geometry={rbox(6.2, 0.65, 6.2, 0.06)} material={darkConcrete} castShadow />
        {/* Giàn ăng-ten radar mảng pha cỡ lớn xoay trên đỉnh tháp */}
        <group position={[0, 15.6, 0]} rotation={[0, t * 1.85 * (1 - towerCollapse * 0.8), 0]}>
          <mesh geometry={rbox(1.1, 3.2, 7.6, 0.06)} material={steelMat} castShadow />
          <mesh position={[0.58, 0, 0]} geometry={rbox(0.14, 2.7, 7.1, 0.03)} material={radarRed} />
          <mesh position={[0, 1.95, 0]} geometry={rbox(0.45, 0.42, 7.8, 0.03)} material={radomeWhite} />
        </group>
      </group>

      {/* 3. BOONG-KE KHO ĐẠN VÒM BÊ TÔNG (tại [-10, 0, 12.5], nổ tung lúc 784.52s) */}
      <group
        position={[-10, -wingCollapse * 2.6, 12.5]}
        rotation={[0, Math.PI / 2, wingCollapse * 0.28]}
      >
        <mesh geometry={geos.archBunker} material={darkConcrete} castShadow receiveShadow />
        <mesh position={[0, 2.4, 8.15]} geometry={rbox(7.6, 4.6, 0.4, 0.05)} material={steelMat} />
      </group>

      {/* 4. HAI KHẨU ĐỘI SAM BATTERY BẢO VỆ CĂN CỨ */}
      <group position={[-18.5, 0, -15.5]} rotation={[0, 0.38, 0]}>
        <SamBattery elev={0.86} radarSpin={t * 2.1} />
      </group>
      <group position={[16.5, 0, 15.2]} rotation={[0, -2.35, 0]}>
        <SamBattery elev={0.94} radarSpin={-t * 1.9} />
      </group>
    </group>
  );
};

// Định hướng mô hình tên lửa 3D dọc theo vector vận tốc bay
const OrientedOrdnance: React.FC<{ pos: V3; dir: V3; kind: 'hypersonic' | 'amraam' }> = ({ pos, dir, kind }) => {
  const q = useMemo(() => {
    const d = new THREE.Vector3(...dir).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  }, [dir[0], dir[1], dir[2]]);

  return (
    <group position={pos} quaternion={q}>
      {kind === 'hypersonic' ? <HypersonicMissile flame={1} /> : <AMRAAM flame={1} />}
    </group>
  );
};

const S28: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const u = t - 771.6;

  // ---------- 1. Quỹ đạo 2 chiếc F-35A mở đường tách sang 2 bên ----------
  const f35X = -31 + u * 8.4;
  const peel = prog(t, 771.75, 777.4);
  const f35Bank = bump(t, 771.75, 5.6);

  // ---------- 2. Quỹ đạo F-15EX Eagle II lao vọt lên ở Mach 2.5 rồi kéo cao vào mặt trời bình minh ----------
  const f15X = -52 + u * 12.8;
  const climbP = prog(t, 782.0, 788.3);
  const f15Y = 46.2 + Math.pow(climbP, 1.45) * 15.5;
  const f15Z = -2.2 * prog(t, 780.4, 784.0) + 6.6 * prog(t, 784.0, 788.1);
  const f15Pitch = 0.025 + 0.16 * prog(t, 781.8, 784.8);
  const f15Roll = 0.34 * prog(t, 783.6, 787.6);

  // Vị trí F-15EX đúng khoảnh khắc cắt phóng bão lửa lúc 781.20s
  const LAUNCH_U = CUE.s28_furyRelease - 771.6;
  const LX = -52 + LAUNCH_U * 12.8;
  const LY = 46.2;
  const LZ = -2.2 * prog(CUE.s28_furyRelease, 780.4, 784.0);

  // Tọa độ xuất phát & mục tiêu của 3 quả đạn (1 siêu vượt âm 22 ft từ bụng + 2 AMRAAM từ 2 đầu cánh đã mở khóa)
  const { hyperCtrl, am1Ctrl, am2Ctrl, hyperPts, am1Pts, am2Pts } = useMemo(() => {
    const h0: V3 = [LX + F15_CENTERLINE_POS[0], LY + F15_CENTERLINE_POS[1], LZ + F15_CENTERLINE_POS[2]];
    const h3: V3 = [BASE_X, BASE_Y + 3.2, BASE_Z];
    const hc: [V3, V3, V3, V3] = [
      h0,
      [h0[0] + 19, h0[1] - 3.5, h0[2]],
      [lerp(h0[0], h3[0], 0.66), lerp(h0[1], h3[1], 0.52), 0],
      h3,
    ];

    const a10: V3 = [LX + F15_STA1_POS[0] + 0.75, LY + F15_STA1_POS[1], LZ + F15_STA1_POS[2]];
    const a13: V3 = [BASE_X + 11, BASE_Y + 8.5, BASE_Z - 13];
    const ac1: [V3, V3, V3, V3] = [
      a10,
      [a10[0] + 21, a10[1] - 3.0, a10[2] - 1.5],
      [lerp(a10[0], a13[0], 0.68), lerp(a10[1], a13[1], 0.52), lerp(a10[2], a13[2], 0.6)],
      a13,
    ];

    const a20: V3 = [LX + F15_STA9_POS[0] + 1.5, LY + F15_STA9_POS[1], LZ + F15_STA9_POS[2]];
    const a23: V3 = [BASE_X - 10, BASE_Y + 3.2, BASE_Z + 12.5];
    const ac2: [V3, V3, V3, V3] = [
      a20,
      [a20[0] + 18, a20[1] - 3.2, a20[2] + 1.8],
      [lerp(a20[0], a23[0], 0.66), lerp(a20[1], a23[1], 0.52), lerp(a20[2], a23[2], 0.6)],
      a23,
    ];

    const N = 84;
    const hp: V3[] = [];
    const p1: V3[] = [];
    const p2: V3[] = [];
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      hp.push(cubicBezier(s, ...hc));
      p1.push(cubicBezier(s, ...ac1));
      p2.push(cubicBezier(s, ...ac2));
    }
    return { hyperCtrl: hc, am1Ctrl: ac1, am2Ctrl: ac2, hyperPts: hp, am1Pts: p1, am2Pts: p2 };
  }, [LX, LY, LZ]);

  const strikeEase = useMemo(() => Easing.bezier(0.32, 0.0, 0.78, 1.0), []);
  const hyperP = prog(t, CUE.s28_furyRelease, CUE.s28_buildingDown, strikeEase);
  const am1P = prog(t, CUE.s28_furyRelease + 0.06, CUE.s28_buildingDown + 0.16, strikeEase);
  const am2P = prog(t, CUE.s28_furyRelease + 0.12, CUE.s28_buildingDown + 0.32, strikeEase);

  const hyperFlying = t >= CUE.s28_furyRelease && t < CUE.s28_buildingDown;
  const am1Flying = t >= CUE.s28_furyRelease + 0.06 && t < CUE.s28_buildingDown + 0.16;
  const am2Flying = t >= CUE.s28_furyRelease + 0.12 && t < CUE.s28_buildingDown + 0.32;

  const sampleDir = (p: number, ctrl: [V3, V3, V3, V3]): { pos: V3; dir: V3 } => {
    const a = cubicBezier(p, ...ctrl);
    const b = cubicBezier(Math.min(1, p + 0.018), ...ctrl);
    return {
      pos: a,
      dir: [b[0] - a[0] + 1e-4, b[1] - a[1], b[2] - a[2]],
    };
  };

  const hState = sampleDir(hyperP, hyperCtrl);
  const a1State = sampleDir(am1P, am1Ctrl);
  const a2State = sampleDir(am2P, am2Ctrl);

  // ---------- 3. Đạo diễn Camera 3D 4 nhịp hùng tráng ----------
  // Hồi 1 (771.4..776.6s): Đặt máy phía trước cả biên đội đón 2 chiếc F-35A lượn tách sang hai bên, F-15EX đốt hậu cực đại lao vọt qua khe giữa
  const p1 = prog(t, 771.6, 776.6);
  const leadX = Math.max(f35X, f15X);
  const pos1: V3 = [leadX + lerp(28, 20, p1), lerp(44.2, 44.5, p1), lerp(11.5, 16.0, p1)];
  const look1: V3 = [lerp(f35X - 6.5, f15X + 0.5, p1), lerp(47.2, 47.0, p1), 0];

  // Hồi 2 (776.6..780.8s): Quét vòng anh hùng dưới mũi-bụng khoe trọn 12 tên lửa + đầu cánh mở khóa + đạn siêu vượt âm 22 ft (không cắt mũi)
  const p2 = prog(t, 776.6, 780.85);
  const orbitAng = lerp(0.74, -0.92, p2);
  const pos2: V3 = [f15X + Math.cos(orbitAng) * 19.2, lerp(43.0, 41.4, p2), Math.sin(orbitAng) * 20.2];
  const look2: V3 = [f15X + 1.4, 47.4, 0];

  // Hồi 3a (780.8..784.8s): Mở rộng sườn -Z thu trọn F-15EX phóng 3 quả đạn (góc trên) và đại chấn nổ san phẳng căn cứ (nửa dưới)
  const p3Dive = prog(t, 781.0, CUE.s28_buildingDown + 0.25);
  const pos3Strike: V3 = [lerp(46, 74, p3Dive), lerp(44, 34, p3Dive), lerp(-54, -54, p3Dive)];
  const look3Strike: V3 = [lerp(96, 124, p3Dive), lerp(29, 29.5, p3Dive), 0];

  // Hồi 3b (784.8..788.04s): Máy bay vút lên cao vượt khỏi đám khói, bám cận sau-sườn F-15EX lao thẳng vào vầng mặt trời bình minh rực lửa!
  const pos3Sunrise: V3 = [f15X - 24.5, f15Y - 2.0, f15Z - 16.0];
  const look3Sunrise: V3 = [f15X + 5.5, f15Y - 0.8, f15Z + 4.5];
  const bSunrise = prog(t, 784.85, 786.9);

  const b12 = prog(t, 776.2, 777.35);
  const b23 = prog(t, 780.35, 781.18);

  const mixV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
  const pos3 = mixV3(pos3Strike, pos3Sunrise, bSunrise);
  const look3 = mixV3(look3Strike, look3Sunrise, bSunrise);
  const rawPos = mixV3(mixV3(pos1, pos2, b12), pos3, b23);
  const rawLook = mixV3(mixV3(look1, look2, b12), look3, b23);

  // Chấn động không khí khi F-15EX xé gió (773.92s), phóng đạn (781.20s) và đại chấn nổ căn cứ (784.20s)
  const thunderShake = bump(t, CUE.s28_thunderIn, 0.8) * 0.22;
  const releaseShake = bump(t, CUE.s28_furyRelease, 0.45) * 0.28;
  const megaBlastShake = bump(t, CUE.s28_buildingDown, 1.35) * 1.05;
  const shk = thunderShake + releaseShake + megaBlastShake;

  const camPos: V3 = [
    rawPos[0] + Math.sin(t * 45) * shk,
    rawPos[1] + Math.cos(t * 53) * shk,
    rawPos[2] + Math.sin(t * 39) * shk * 0.65,
  ];
  const camFov = lerp(lerp(44, 42, b12), lerp(49, 45, bSunrise), b23);

  const trailFade = 1 - prog(t, CUE.s28_buildingDown + 1.2, 787.8);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_FINALE_SUNRISE} shadowArea={95} shadowCenter={[112, 22, 0]}>
        <Cam pos={camPos} look={rawLook} fov={camFov} roll={megaBlastShake * 0.04} />
        {/* Ánh nắng hắt ngược từ tầng mây bình minh tôn rõ chi tiết bụng vũ khí F-35A & F-15EX */}
        <directionalLight position={[-42, -14, 28]} color="#ffbe82" intensity={0.78} />

        {/* Đồi núi bình minh rực nắng & rừng cây */}
        <Terrain
          h={FINALE_H}
          size={760}
          seg={220}
          center={[95, 0]}
          colors={{ low: '#415437', high: '#75824f', rock: '#635c54', dry: '#ad895c' }}
        />
        <Scatter
          kind="pine"
          count={220}
          area={[-110, -220, 310, 220]}
          h={FINALE_H}
          seed={281}
          scale={[0.95, 1.75]}
          avoid={AVOID_FORTRESS}
          tint="#e3c4a1"
        />
        <Scatter
          kind="rock"
          count={130}
          area={[-90, -200, 290, 200]}
          h={FINALE_H}
          seed={282}
          scale={[1.1, 2.8]}
          avoid={AVOID_FORTRESS}
          tint="#a39182"
        />
        <Scatter
          kind="bush"
          count={110}
          area={[-50, -160, 260, 160]}
          h={FINALE_H}
          seed={283}
          scale={[0.85, 1.5]}
          avoid={AVOID_FORTRESS}
          tint="#bfa980"
        />

        {/* Quần thể tòa nhà chỉ huy boong-ke, đài radar & 2 xe SAM */}
        <FortifiedCommandBase t={t} />

        {/* Cặp F-35A Lightning II dẫn đầu tách đội hình sang hai bên mở rộng hành lang không kích */}
        <group position={[f35X, 47.8 + peel * 9.5, -8.4 - peel * 30]} rotation={[0, f35Bank * 0.26, 0.04]}>
          <group rotation={[-f35Bank * 0.62, 0, 0]}>
            <F35A gear={0} afterburner={0.75} />
          </group>
        </group>
        <group position={[f35X, 47.8 + peel * 9.5, 8.4 + peel * 30]} rotation={[0, -f35Bank * 0.26, 0.04]}>
          <group rotation={[f35Bank * 0.62, 0, 0]}>
            <F35A gear={0} afterburner={0.75} />
          </group>
        </group>

        {/* Búa tạ Mach 2.5 — F-15EX Eagle II mang đủ 15 tấn bão lửa & buồng đốt hậu cực đại */}
        <group position={[f15X, f15Y, f15Z]} rotation={[0, 0, f15Pitch]}>
          <group rotation={[f15Roll, 0, 0]}>
            <F15EX
              gear={0}
              afterburner={1}
              wingTipMissiles={t < CUE.s28_furyRelease + 0.09}
              fullLoad
              bellyOutsized={t < CUE.s28_furyRelease}
              backSeatOccupied
            />
            <pointLight position={[-11.5, 1.95, 0]} color="#ff9933" intensity={58} distance={28} decay={1.5} />
          </group>
        </group>

        {/* Lửa kích hoạt động cơ tên lửa <MuzzleBlast> dưới bụng & hai đầu cánh đúng 781.20s */}
        <MuzzleBlast t={t} at={CUE.s28_furyRelease} pos={hyperCtrl[0]} dir={[0.88, -0.42, 0]} size={3.2} seed={281} />
        <MuzzleBlast
          t={t}
          at={CUE.s28_furyRelease + 0.06}
          pos={am1Ctrl[0]}
          dir={[0.88, -0.42, -0.1]}
          size={2.2}
          seed={282}
        />
        <MuzzleBlast
          t={t}
          at={CUE.s28_furyRelease + 0.12}
          pos={am2Ctrl[0]}
          dir={[0.88, -0.42, 0.1]}
          size={2.2}
          seed={283}
        />

        {/* 3 Vệt lửa <Trail> cắm chéo từ bầu trời xuống khu căn cứ mục tiêu */}
        {t >= CUE.s28_furyRelease && trailFade > 0.02 && (
          <>
            <Trail points={hyperPts} upto={hyperP} color="#ff731d" width={0.34} opacity={0.9 * trailFade} glow />
            <Trail points={hyperPts} upto={hyperP} color="#fff0b3" width={0.15} opacity={0.96 * trailFade} glow />
          </>
        )}
        {t >= CUE.s28_furyRelease + 0.06 && trailFade > 0.02 && (
          <>
            <Trail points={am1Pts} upto={am1P} color="#ff8429" width={0.22} opacity={0.86 * trailFade} glow />
            <Trail points={am1Pts} upto={am1P} color="#ffe79e" width={0.09} opacity={0.94 * trailFade} glow />
          </>
        )}
        {t >= CUE.s28_furyRelease + 0.12 && trailFade > 0.02 && (
          <>
            <Trail points={am2Pts} upto={am2P} color="#ff8429" width={0.22} opacity={0.86 * trailFade} glow />
            <Trail points={am2Pts} upto={am2P} color="#ffe79e" width={0.09} opacity={0.94 * trailFade} glow />
          </>
        )}

        {/* Quả tên lửa siêu vượt âm 22 ft & 2 quả AMRAAM lao xuống hủy diệt công trình */}
        {hyperFlying && <OrientedOrdnance pos={hState.pos} dir={hState.dir} kind="hypersonic" />}
        {am1Flying && <OrientedOrdnance pos={a1State.pos} dir={a1State.dir} kind="amraam" />}
        {am2Flying && <OrientedOrdnance pos={a2State.pos} dir={a2State.dir} kind="amraam" />}

        {/* Chuỗi đại chấn nổ liên hoàn san phẳng toàn bộ khu tòa nhà chỉ huy & tháp radar lúc 784.20s */}
        <Explosion
          t={t}
          at={CUE.s28_buildingDown}
          pos={[BASE_X, BASE_Y + 0.5, BASE_Z]}
          size={8.6}
          seed={285}
          smokeLife={6.0}
          smoke="#4a3f39"
        />
        <Explosion
          t={t}
          at={CUE.s28_buildingDown + 0.16}
          pos={[BASE_X + 11, BASE_Y + 1.0, BASE_Z - 13]}
          size={6.4}
          seed={286}
          smokeLife={6.0}
          smoke="#544740"
        />
        <Explosion
          t={t}
          at={CUE.s28_buildingDown + 0.32}
          pos={[BASE_X - 10, BASE_Y + 0.5, BASE_Z + 12.5]}
          size={6.8}
          seed={287}
          smokeLife={6.0}
          smoke="#453c36"
        />
        <Explosion
          t={t}
          at={CUE.s28_buildingDown + 0.62}
          pos={[BASE_X + 16.5, BASE_Y + 0.4, BASE_Z + 15.2]}
          size={5.2}
          seed={288}
          smokeLife={5.5}
          smoke="#3a322e"
        />

        {/* Ánh chớp đại chấn từ mặt đất hắt sáng bụng F-15EX khi bay vút qua */}
        {t >= CUE.s28_buildingDown && t < CUE.s28_buildingDown + 1.6 && (
          <pointLight
            position={[BASE_X, BASE_Y + 14, BASE_Z]}
            color="#ff8c38"
            intensity={2400 * (1 - (t - CUE.s28_buildingDown) / 1.6)}
            distance={140}
            decay={1.35}
          />
        )}
      </Stage>

      {/* Hai nhãn chữ tuần tự ở cao trào cuối (đảm bảo tuyệt đối không bao giờ trùng nhau trên màn hình) */}
      {t < 783.85 && (
        <Label
          t={t}
          text="MACH 2.5 · 15 TONS"
          x={960}
          y={108}
          from={780.72}
          until={783.3}
          size={52}
          bg={P.amber}
          fg={P.ink}
        />
      )}
      <Label
        t={t}
        text="F-15EX EAGLE II"
        x={960}
        y={108}
        from={783.92}
        until={787.6}
        size={56}
        bg={P.paper}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S28;
