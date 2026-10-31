import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { Explosion, Trail } from '@skill/military/3d/fx';
import { pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE, PAINT } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { JapaneseFighter } from '../parts/JapaneseFighter';
import { FactoryComplex, OilRefineryCluster, TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';

// ---------- Địa hình vùng ven công nghiệp Yokohama: hành lang cây xanh dưới thấp + đồi thấp xa ----------
const yokohamaTerrain = heightField({
  seed: 309,
  amp: 4.8,
  scale: 140,
  flats: [
    [160, 0, 190, 0.4],
    [480, 0, 230, 0.4],
    [800, 0, 190, 0.4],
  ],
  add: (_x, z) => {
    const az = Math.abs(z);
    return az < 78 ? 0 : Math.min(20, ((az - 78) / 165) ** 1.6 * 18);
  },
});

const avoidIndustrialCorridor = (x: number, z: number) => {
  const blocks: [number, number, number, number][] = [
    [95, -74, 42, 32],
    [245, 78, 44, 34],
    [395, 86, 42, 32],
    [575, 80, 38, 30],
    [735, -78, 44, 34],
    [175, 58, 26, 20],
    [315, -66, 26, 20],
    [655, 62, 26, 20],
  ];
  for (const [bx, bz, rx, rz] of blocks) {
    if (Math.abs(x - bx) < rx && Math.abs(z - bz) < rz) return true;
  }
  return false;
};

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

// ---------- Khung buồng lái, nắp capo Nakajima, 2 báng súng máy Type 97 (ở mép dưới) & kính ngắm quang học Type 98 ----------
const FighterCockpitPovRig: React.FC<{
  camPos: V3;
  noseAim: V3;
  roll: number;
  propSpin: number;
}> = ({ camPos, noseAim, roll, propSpin }) => {
  const mats = useMemo(() => {
    const canopyFrame = paint({
      color: PAINT.ijaGreen,
      camo: ['#314231', '#485d46'],
      repeat: 1.1,
      wear: 0.3,
      dirt: 0.2,
      roughness: 0.48,
      metalness: 0.28,
      seed: 91,
    });
    const cowlingDark = paint({
      color: '#19212c',
      camo: ['#121821', '#253242'],
      repeat: 1.2,
      wear: 0.32,
      dirt: 0.18,
      roughness: 0.34,
      metalness: 0.52,
      seed: 95,
    });
    const leatherPad = plain('#241b15', 0.88, 0.06);
    const gunMetal = plain('#202428', 0.35, 0.78);
    const steelBright = plain('#9aa3ab', 0.28, 0.84);
    const sightGlass = plain('#c2e2ee', 0.1, 0.1, {
      transparent: true,
      opacity: 0.05,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const reticleGlow = new THREE.MeshBasicMaterial({
      color: '#ffaa33',
      toneMapped: false,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });
    const reticleOuter = new THREE.MeshBasicMaterial({
      color: '#ff5d26',
      toneMapped: false,
      transparent: true,
      opacity: 0.72,
      side: THREE.DoubleSide,
    });
    const propDisc = new THREE.MeshBasicMaterial({
      color: '#2e3338',
      transparent: true,
      opacity: 0.09,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    return {
      canopyFrame,
      cowlingDark,
      leatherPad,
      gunMetal,
      steelBright,
      sightGlass,
      reticleGlow,
      reticleOuter,
      propDisc,
    };
  }, []);

  const geos = useMemo(() => {
    // Khung vòm kính chắn gió buồng lái Nhật ôm gọn rìa khung hình (vừa khít cả ở fov 24.5° lẫn 43°)
    const topArch = pipe(
      Array.from({ length: 17 }, (_, i) => {
        const u = -1 + (i / 16) * 2;
        return [0.52 - u * u * 0.035, 0.145 + (1 - u * u) * 0.038, u * 0.22] as V3;
      }),
      0.0095,
      20,
    );
    const leftPillar = pipe(
      [
        [0.44, -0.175, -0.205],
        [0.50, -0.01, -0.205],
        [0.49, 0.148, -0.215],
      ],
      0.01,
      12,
    );
    const rightPillar = pipe(
      [
        [0.44, -0.175, 0.205],
        [0.50, -0.01, 0.205],
        [0.49, 0.148, 0.215],
      ],
      0.01,
      12,
    );
    const leftSideRail = pipe(
      [
        [0.16, -0.16, -0.25],
        [0.44, -0.172, -0.205],
        [0.72, -0.188, -0.185],
      ],
      0.0105,
      10,
    );
    const rightSideRail = pipe(
      [
        [0.16, -0.16, 0.25],
        [0.44, -0.172, 0.205],
        [0.72, -0.188, 0.185],
      ],
      0.0105,
      10,
    );
    return { topArch, leftPillar, rightPillar, leftSideRail, rightSideRail };
  }, []);

  const rigMatrix = useMemo(() => {
    const p = new THREE.Vector3(...camPos);
    const target = new THREE.Vector3(...noseAim);
    const fwd = target.sub(p).normalize();
    const upHint = new THREE.Vector3(Math.sin(roll), Math.cos(roll), 0).normalize();
    const right = new THREE.Vector3().crossVectors(fwd, upHint).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const m = new THREE.Matrix4();
    m.makeBasis(fwd, up, right);
    m.setPosition(p);
    return m;
  }, [camPos[0], camPos[1], camPos[2], noseAim[0], noseAim[1], noseAim[2], roll]);

    return (
    <group matrixAutoUpdate={false} matrix={rigMatrix}>
      {/* Đệm da viền bảng đồng hồ đối xứng hai bên ở sát mép dưới khung hình */}
      <mesh position={[0.45, -0.34, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.leatherPad}>
        <cylinderGeometry args={[0.205, 0.215, 0.11, 28, 1, false, Math.PI * 0.06, Math.PI * 0.88]} />
      </mesh>

      {/* Nắp capo động cơ Nakajima Sakae đen ánh thép đối xứng trái-phải ôm trọn bên dưới 2 khẩu Type 97 */}
      <mesh position={[1.38, -0.405, 0]} rotation={[0, 0, Math.PI / 2 - 0.045]} material={mats.cowlingDark}>
        <cylinderGeometry args={[0.262, 0.232, 1.84, 32, 1, false, Math.PI * 0.04, Math.PI * 0.92]} />
      </mesh>
      {/* Hốc hút gió bộ chế hoà khí giữa sống lưng nắp capo */}
      <mesh position={[1.52, -0.172, 0]} rotation={[0, 0, -0.045]} geometry={rbox(0.52, 0.036, 0.072, 0.012)} material={mats.cowlingDark} />

      {/* 2 Báng & rãnh súng máy đồng bộ Type 97 7.7mm gắn âm trên lưng nắp capo buồng lái */}
      {([-1, 1] as const).map((side) => (
        <group key={`mg-breech-${side}`} position={[0.58, -0.156, side * 0.095]} rotation={[0, 0, -0.042]}>
          <mesh geometry={rbox(0.28, 0.036, 0.038, 0.005)} material={mats.gunMetal} />
          <mesh position={[-0.07, 0.021, 0]} geometry={rbox(0.12, 0.01, 0.024, 0.002)} material={mats.gunMetal} />
          <mesh position={[-0.13, 0.008, -side * 0.024]} rotation={[Math.PI / 2, 0, 0]} material={mats.steelBright}>
            <cylinderGeometry args={[0.0045, 0.0045, 0.026, 8]} />
          </mesh>
          <mesh position={[-0.13, 0.008, -side * 0.038]} material={mats.steelBright}>
            <sphereGeometry args={[0.007, 8, 8]} />
          </mesh>
          <mesh position={[0.34, -0.005, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.gunMetal}>
            <cylinderGeometry args={[0.0105, 0.0115, 0.42, 10]} />
          </mesh>
        </group>
      ))}

      {/* Đĩa mờ cánh quạt mỏng nhẹ phía mũi */}
      <group position={[2.42, -0.44, 0]} rotation={[propSpin, Math.PI / 2, 0]}>
        <mesh material={mats.propDisc}>
          <ringGeometry args={[0.18, 0.96, 36]} />
        </mesh>
      </group>

      {/* Khung vòm kính chắn gió buồng lái tiêm kích Nhật */}
      <mesh geometry={geos.topArch} material={mats.canopyFrame} />
      <mesh geometry={geos.leftPillar} material={mats.canopyFrame} />
      <mesh geometry={geos.rightPillar} material={mats.canopyFrame} />
      <mesh geometry={geos.leftSideRail} material={mats.canopyFrame} />
      <mesh geometry={geos.rightSideRail} material={mats.canopyFrame} />

      {/* Kính ngắm quang học phản xạ Type 98 không khung viền trên (frameless reflector glass), tâm chữ thập đúng trục nhìn [0.50, 0, 0] */}
      <group position={[0.50, -0.132, 0]}>
        <mesh position={[0, -0.018, 0]} geometry={rbox(0.076, 0.032, 0.06, 0.004)} material={mats.gunMetal} />
        <mesh position={[0, 0.004, 0]} material={mats.gunMetal}>
          <cylinderGeometry args={[0.022, 0.025, 0.018, 20]} />
        </mesh>
        <mesh position={[-0.018, -0.012, 0.035]} rotation={[Math.PI / 2, 0, 0]} material={mats.steelBright}>
          <cylinderGeometry args={[0.011, 0.011, 0.015, 14]} />
        </mesh>

        {/* Ngàm kẹp chân kính phản xạ thấp gọn ở đế (không có thanh ngang đen che phía trên tâm ngắm) */}
        {([-1, 1] as const).map((s) => (
          <mesh
            key={`sight-clip-${s}`}
            position={[-0.008, 0.034, s * 0.056]}
            rotation={[0, 0, 0.38]}
            geometry={rbox(0.01, 0.054, 0.006, 0.0015)}
            material={mats.gunMetal}
          />
        ))}

        <mesh position={[0.004, 0.118, 0]} rotation={[0, Math.PI / 2, 0.42]} material={mats.sightGlass}>
          <planeGeometry args={[0.112, 0.122]} />
        </mesh>

        {/* Tâm ngắm chữ thập quang học phát sáng đóng khung rõ 2 cán chổi đen ở đuôi B-25 */}
        <group position={[0.002, 0.132, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <mesh material={mats.reticleGlow}>
            <ringGeometry args={[0.041, 0.0428, 48]} />
          </mesh>
          <mesh material={mats.reticleOuter}>
            <ringGeometry args={[0.056, 0.0572, 48]} />
          </mesh>
          {[0, 1, 2, 3].map((k) => {
            const ang = (k * Math.PI) / 2;
            const rMid = 0.042;
            return (
              <mesh
                key={`ret-tick-${k}`}
                position={[Math.cos(ang) * rMid, Math.sin(ang) * rMid, 0]}
                rotation={[0, 0, ang]}
                material={mats.reticleGlow}
              >
                <planeGeometry args={[0.032, 0.0018]} />
              </mesh>
            );
          })}
        </group>
      </group>
    </group>
  );
};

const C03S09: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // ---------- 1. Quỹ đạo chiếc B-25 #11 "Hari Kari-er" của Đại uý Ross Greening bay sát ngọn cây Yokohama ----------
  const speed = 26;
  const dtScene = t - 547.86;
  const b25X = 40 + dtScene * speed;
  const hugTrees = prog(t, 554.2, 558.5);
  const weavePhase = (t - 547.86) * 0.82;
  const b25Y = lerp(17.4, 15.6, hugTrees) + Math.sin(weavePhase * 1.25) * 0.28;
  const b25Z = Math.sin(weavePhase) * (0.55 + 0.45 * hugTrees);
  const b25Roll = -Math.cos(weavePhase) * (0.04 + 0.035 * hugTrees);
  const b25Pitch = -0.02 * bump(t, 554.6, 3.2) + 0.01 * Math.sin(weavePhase * 1.1);
  const b25Pos: V3 = [b25X, b25Y, b25Z];

  const turretAlert = prog(t, CUE.c03_s09_four_fighters_jump, CUE.c03_s09_swoop_tail);
  const turretTrackClimb = prog(t, CUE.c03_s09_hesitate_twin50, CUE.c03_s09_arc_higher + 1.8);
  const b25TurretYaw = lerp(0.18, Math.PI - 0.16, turretAlert);
  const b25TurretPitch = lerp(0.12, 0.42, turretAlert * 0.6 + turretTrackClimb * 0.4);

  // Tâm 2 nòng cán chổi sơn đen ở chóp kính đuôi B-25 (local [-8.16, 2.95, 0])
  const tailBroomWorld: V3 = [
    b25Pos[0] - 8.16,
    b25Pos[1] + 2.95 - 8.16 * Math.sin(b25Pitch),
    b25Pos[2],
  ];

  // ---------- 2. Chuyển động 4 tiêm kích đánh chặn Nhật Bản ----------
  const isPov = t >= CUE.c03_s09_swoop_tail;

  const diveP = prog(t, 552.8, CUE.c03_s09_swoop_tail);
  const closeInP = prog(t, CUE.c03_s09_swoop_tail, CUE.c03_s09_painted_broomsticks + 0.2);
  const hesitateEnv = bump(t, CUE.c03_s09_hesitate_twin50 - 0.3, 4.3);
  const hesitateWeave = hesitateEnv * Math.sin((t - CUE.c03_s09_hesitate_twin50) * 3.2);
  const climbP = prog(t, CUE.c03_s09_arc_higher - 0.65, 578.1);

  // Tiêm kích dẫn đầu #1 (chuyển sang POV từ 561.74 s):
  // Áp sát vào 4.25 m sau đầu cán chổi, đặt thấp hơn chóp đuôi -0.34 m và lệch +1.48 m sang phải (~19°) để nhìn HẤT LÊN nền trời sáng,
  // tách rõ chiều dài 2 thanh cán chổi đen (0.82 m) thò ra khỏi vòm kính đuôi H-tail!
  // Tới 575.58 s (arc higher): kéo lùi nhẹ và vọt lên cao bên trên đuôi B-25.
  const leadBackDist = lerp(15.8, 4.25, closeInP) + climbP * 10.2;
  const leadOffsetZ = lerp(3.1, 1.48, closeInP) + hesitateWeave * 0.46 + climbP * 2.1;
  const leadOffsetY = lerp(1.4, -0.34, closeInP) + hesitateEnv * 0.14 + climbP * climbP * 7.5;

  const f1PosBeat1: V3 = [
    b25Pos[0] + lerp(-68, -21.5, diveP),
    b25Pos[1] + lerp(28, 4.6, diveP),
    b25Pos[2] + lerp(-16, 2.8, diveP),
  ];
  const f1PosPov: V3 = [
    tailBroomWorld[0] - leadBackDist,
    tailBroomWorld[1] + leadOffsetY,
    tailBroomWorld[2] + leadOffsetZ,
  ];
  const f1Pos: V3 = isPov ? f1PosPov : f1PosBeat1;
  const f1Pitch = isPov ? lerp(0.05, 0.34, climbP) : lerp(-0.34, -0.12, diveP);
  const f1Yaw = isPov ? lerp(0.18, 0.28, closeInP) - hesitateWeave * 0.04 : lerp(-0.22, 0.08, diveP);
  const f1Roll = isPov
    ? lerp(-0.14, 0.04, closeInP) + hesitateWeave * 0.2 + climbP * 0.3
    : lerp(0.32, -0.16, diveP);

  // 3 Tiêm kích đồng đội (#2, #3, #4): tách rõ đội hình 4 chiếc ở Nhịp 1, và ở pha arc higher (575.58 s) nghiêng cánh vọt gọn bên dưới vòm kính chắn gió POV!
  const wingmen = useMemo(
    () => [
      {
        id: 2,
        scheme: 'grey' as const,
        seed: 32,
        b1Start: [-78, 31, -20] as V3,
        b1End: [-25.5, 7.2, -3.8] as V3,
        povBase: [-16.5, 2.0, -5.8] as V3,
        climbTarget: [-4.6, 8.1, -3.8] as V3,
        climbDelay: 0.0,
        bankSign: -1,
      },
      {
        id: 3,
        scheme: 'green' as const,
        seed: 33,
        b1Start: [-88, 35, 11] as V3,
        b1End: [-29.5, 9.2, 6.8] as V3,
        povBase: [-17.2, 2.5, 6.8] as V3,
        climbTarget: [-3.2, 8.6, 4.1] as V3,
        climbDelay: 0.14,
        bankSign: 1,
      },
      {
        id: 4,
        scheme: 'grey' as const,
        seed: 34,
        b1Start: [-95, 38, -7] as V3,
        b1End: [-32.5, 11.0, -7.4] as V3,
        povBase: [-20.2, 3.8, -8.6] as V3,
        climbTarget: [-6.4, 9.2, -0.2] as V3,
        climbDelay: 0.26,
        bankSign: -1,
      },
    ],
    [],
  );

  const wingmenStates = wingmen.map((w, idx) => {
    const wDive = prog(t, 552.8 + idx * 0.35, CUE.c03_s09_swoop_tail);
    const wClimb = prog(t, CUE.c03_s09_arc_higher - 0.85 + w.climbDelay, 577.9);
    const posBeat1: V3 = [
      b25Pos[0] + lerp(w.b1Start[0], w.b1End[0], wDive),
      b25Pos[1] + lerp(w.b1Start[1], w.b1End[1], wDive),
      b25Pos[2] + lerp(w.b1Start[2], w.b1End[2], wDive),
    ];
    const relPov = lerpV3(w.povBase, w.climbTarget, wClimb);
    const posPov: V3 = [
      b25Pos[0] + relPov[0],
      b25Pos[1] + relPov[1] + Math.sin(t * 2.1 + idx) * 0.2,
      b25Pos[2] + relPov[2] + hesitateWeave * 0.45 * w.bankSign,
    ];
    const pos = isPov ? posPov : posBeat1;
    const pitch = isPov ? lerp(0.02, 0.38, wClimb) : lerp(-0.36, -0.14, wDive);
    const yaw = isPov ? w.bankSign * (-0.05 + wClimb * 0.1) : w.bankSign * -0.14 * (1 - wDive);
    const roll = isPov
      ? w.bankSign * (0.1 + wClimb * 0.44) + hesitateWeave * 0.16
      : w.bankSign * lerp(0.38, 0.14, wDive);
    return { ...w, pos, pitch, yaw, roll };
  });

  const ambushTracers = useMemo(
    () => [
      { at: 555.65, fromOff: [-38, 15.5, -8] as V3, toOff: [12, 1.2, -4.4] as V3 },
      { at: 556.35, fromOff: [-34, 13.0, 9] as V3, toOff: [14, 4.8, 4.8] as V3 },
      { at: 557.15, fromOff: [-30, 10.5, -6] as V3, toOff: [10, 0.6, -3.9] as V3 },
    ],
    [],
  );

  // ---------- 3. Điều khiển Camera ----------
  let camPos: V3;
  let camLook: V3;
  let camFov: number;
  let camRoll = 0;
  let povNoseAim: V3 = tailBroomWorld;

  if (!isPov) {
    const ambushSwing = prog(t, 552.6, 557.2);
    const preClose = prog(t, 557.2, CUE.c03_s09_swoop_tail);

    const openCam: V3 = [b25Pos[0] + 15.5, b25Pos[1] + 4.2, b25Pos[2] + 14.5];
    const ambushCam: V3 = [b25Pos[0] + 13.0, b25Pos[1] - 2.2, b25Pos[2] + 16.5];
    const tailSweepCam: V3 = [b25Pos[0] + 5.5, b25Pos[1] - 1.6, b25Pos[2] + 14.2];

    const openLook: V3 = [b25Pos[0] - 2.0, b25Pos[1] + 1.4, b25Pos[2] - 1.0];
    const ambushLook: V3 = [b25Pos[0] - 24.0, b25Pos[1] + 10.5, b25Pos[2] + 1.0];
    const tailSweepLook: V3 = [b25Pos[0] - 18.0, b25Pos[1] + 5.5, b25Pos[2] + 0.5];

    camPos = lerpV3(lerpV3(openCam, ambushCam, ambushSwing), tailSweepCam, preClose);
    camLook = lerpV3(lerpV3(openLook, ambushLook, ambushSwing), tailSweepLook, preClose);
    camFov = lerp(42, 46, ambushSwing);
    camRoll = -0.04 * ambushSwing;
  } else {
    const zoomBroomsticks = prog(t, CUE.c03_s09_spot_black_barrels - 0.7, CUE.c03_s09_painted_broomsticks + 0.2);
    const zoomOutClimb = prog(t, CUE.c03_s09_arc_higher - 0.6, 577.7);

    camPos = f1PosPov;
    // Khoá chính xác tâm chữ thập kính ngắm vào đoạn 2 thanh cán chổi sơn đen thò ra khỏi vòm kính đuôi [-8.18, 2.95, 0]
    const aimOnBrooms: V3 = [
      tailBroomWorld[0] - 0.04,
      tailBroomWorld[1] + 0.01 + hesitateWeave * 0.04,
      tailBroomWorld[2] - 0.02 + hesitateWeave * 0.09,
    ];
    // Khi kéo vọt ngược lên cao (575.58 s): hướng mũi lên khoảng không phía trên lưng B-25,
    // vừa thấy trọn đuôi H-tail & vòm tháp pháo lưng Bendix phía dưới, vừa thấy 3 đồng đội nghiêng cánh vọt gọn trong khung kính!
    const aimArcHigh: V3 = [
      b25Pos[0] - 2.5,
      b25Pos[1] + 6.5,
      b25Pos[2] - 0.4,
    ];
    camLook = lerpV3(aimOnBrooms, aimArcHigh, climbP);
    povNoseAim = camLook;
    camFov = lerp(lerp(35, 24.5, zoomBroomsticks), 44, zoomOutClimb);
    camRoll = f1Roll * 0.75;
  }

  // Đặt các nhà máy bên mạn +Z ở đoạn giữa để phía sau chóp đuôi B-25 (-Z) luôn là chân trời sáng rõ tương phản 2 cán chổi đen!
  const factories = useMemo(
    () => [
      { pos: [95, 0.4, -74] as V3, rot: 0.2, variant: 0, dmg: 0.25 },
      { pos: [245, 0.4, 78] as V3, rot: -0.4, variant: 1, dmg: 0.5 },
      { pos: [395, 0.4, 86] as V3, rot: 0.15, variant: 0, dmg: 0.35 },
      { pos: [735, 0.4, -78] as V3, rot: -0.25, variant: 1, dmg: 0.45 },
    ],
    [],
  );

  const rowhouses = useMemo(
    () => [
      { pos: [175, 0.4, 58] as V3, rot: 0.05, variant: 0 },
      { pos: [315, 0.4, -66] as V3, rot: Math.PI * 0.5, variant: 1 },
      { pos: [655, 0.4, 62] as V3, rot: -0.1, variant: 0 },
    ],
    [],
  );

  return (
    <>
      <Stage
        {...STAGE_PRESETS.tokyoFire}
        width={W}
        height={H}
        shadowArea={58}
        shadowCenter={[b25Pos[0], 10, b25Pos[2]]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        <Terrain
          h={yokohamaTerrain}
          size={1380}
          seg={230}
          center={[430, 0]}
          colors={TERRAIN_PALETTE.japanCoast}
          grainRepeat={48}
        />
        <Scatter
          kind="pine"
          count={380}
          area={[-120, -220, 960, 220]}
          h={yokohamaTerrain}
          seed={39}
          scale={[1.15, 1.85]}
          avoid={avoidIndustrialCorridor}
        />
        <Scatter
          kind="broadleaf"
          count={240}
          area={[-120, -200, 960, 200]}
          h={yokohamaTerrain}
          seed={43}
          scale={[1.1, 1.75]}
          avoid={avoidIndustrialCorridor}
        />
        <Scatter
          kind="bush"
          count={190}
          area={[-100, -160, 940, 160]}
          h={yokohamaTerrain}
          seed={47}
          scale={[0.9, 1.5]}
          avoid={avoidIndustrialCorridor}
        />

        {factories.map((f, i) => (
          <group key={`fac-${i}`} position={f.pos} rotation={[0, f.rot, 0]}>
            <FactoryComplex variant={f.variant} damage={f.dmg} />
          </group>
        ))}
        <group position={[575, 0.4, 80]} rotation={[0, 0.35, 0]}>
          <OilRefineryCluster damage={0.2} />
        </group>
        {rowhouses.map((rh, i) => (
          <group key={`rh-${i}`} position={rh.pos} rotation={[0, rh.rot, 0]}>
            <TokyoRowhouseBlock variant={rh.variant} />
          </group>
        ))}

        <Explosion t={t} at={544.5} pos={[252, 8, 84]} size={11} seed={5} smokeLife={38} smoke="#3c3733" />
        <Explosion t={t} at={546.0} pos={[742, 9, -80]} size={13} seed={9} smokeLife={38} smoke="#383430" />

        {/* Chiếc B-25B #11 "Hari Kari-er" với cặp cán chổi gỗ sơn đen giả súng máy đôi .50 cal ở đuôi */}
        <group position={b25Pos} rotation={[b25Roll, 0, b25Pitch]}>
          <B25Mitchell
            gear={0}
            propFast={true}
            propSpin={t * 44}
            bombBay={0}
            broomsticks={true}
            turretYaw={b25TurretYaw}
            turretPitch={b25TurretPitch}
            seed={11}
          />
        </group>

        {/* Tiêm kích dẫn đầu #1: mô hình ngoài ở Nhịp 1, chuyển sang Buồng lái & Kính ngắm quang học POV ở Nhịp 2 */}
        {!isPov ? (
          <group position={f1Pos} rotation={[f1Roll, f1Yaw, f1Pitch]}>
            <JapaneseFighter scheme="green" gear={0} propFast={true} propSpin={t * 50} seed={31} />
          </group>
        ) : (
          <FighterCockpitPovRig
            camPos={camPos}
            noseAim={povNoseAim}
            roll={camRoll}
            propSpin={t * 50}
          />
        )}

        {/* 3 Tiêm kích Nhật đồng đội (#2, #3, #4) */}
        {wingmenStates.map((w) => (
          <group key={`jf-${w.id}`} position={w.pos} rotation={[w.roll, w.yaw, w.pitch]}>
            <JapaneseFighter
              scheme={w.scheme}
              gear={0}
              propFast={true}
              propSpin={t * 49 + w.id}
              seed={w.seed}
            />
          </group>
        ))}

        {/* Loạt đạn lửa cảnh cáo tầm xa lúc 4 tiêm kích mới bổ xuống (555.6 -> 558.2 s) */}
        {ambushTracers.map((tr, i) => {
          const dt = t - tr.at;
          if (dt < 0 || dt > 0.55) return null;
          const p0 = Math.max(0, (dt - 0.14) / 0.41);
          const p1 = Math.min(1, dt / 0.41);
          const worldA: V3 = [
            b25Pos[0] + tr.fromOff[0],
            b25Pos[1] + tr.fromOff[1],
            b25Pos[2] + tr.fromOff[2],
          ];
          const worldB: V3 = [
            b25Pos[0] + tr.toOff[0],
            b25Pos[1] + tr.toOff[1],
            b25Pos[2] + tr.toOff[2],
          ];
          const segStart = lerpV3(worldA, worldB, p0);
          const segEnd = lerpV3(worldA, worldB, p1);
          const segMid = lerpV3(segStart, segEnd, 0.5);
          return (
            <Trail
              key={`amb-tr-${i}`}
              points={[segStart, segMid, segEnd]}
              upto={1}
              color="#ffd269"
              width={0.075}
              opacity={0.88}
              glow={true}
            />
          );
        })}
      </Stage>

      <Label
        t={t}
        text="PLANE #11 · HARI KARI-ER"
        x={1450}
        y={145}
        from={550.9}
        until={554.5}
      />
    </>
  );
};

export default C03S09;
