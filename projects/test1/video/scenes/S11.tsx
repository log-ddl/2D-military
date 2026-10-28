// Cảnh S11 (104.60 – 114.69s): Hero Finale — Wing-Level Golden-Hour Orbit -> Epic Wide Reveal
// "Thời gian bám trụ dài, cảm biến tầm xa hiện đại cùng kho vũ khí chính xác biến MQ-9 Reaper
//  thành át chủ bài của Không quân Mỹ trong việc săn lùng và tiêu diệt các mục tiêu giá trị cao."
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Explosion, Trail } from '@lib/3d/fx';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { DESERT_TERRAIN, P, STAGE_HIGH_DAWN } from '../local/palette';
import { FortifiedBunker, MQ9_MTSB_POS, MQ9Reaper, TacticalTruck } from '../local/models';

const AXIS_X = new THREE.Vector3(1, 0, 0);
const AXIS_Y = new THREE.Vector3(0, 1, 0);
const AXIS_Z = new THREE.Vector3(0, 0, 1);

// Tọa độ khu phế tích mục tiêu dưới đáy thung lũng (nối tiếp cú đánh ở S10)
const TARGET_BUNKER: V3 = [16, -0.38, -104];
const TARGET_AIM: V3 = [16.4, 1.45, -103.8];
const TARGET_TRUCK: V3 = [29.5, -0.22, -97.5];

// Tâm và bán kính vòng lượn tuần tra tầng cao của MQ-9 Reaper (rẽ trái quanh thung lũng)
const ORBIT_CX = 6.0;
const ORBIT_CZ = -78.0;
const ORBIT_R = 104.0;
const ORBIT_ALT = 86.0;

// Hướng mặt trời bình minh thấp gần đường chân trời (góc 1/5 bên phải chân trời, qua cổng thung lũng)
const GOLDEN_SUN: V3 = [72, 16, -130];

// Địa hình thung lũng hẻm núi cao nguyên sa mạc rộng lớn + khe núi mở đón mặt trời bình minh
const valleyHeight = heightField({
  seed: 119,
  amp: 5.6,
  scale: 145,
  oct: 5,
  flats: [
    [16, -104, 22, 0],
    [31, -96, 15, -0.1],
    [4, -126, 18, -0.3],
  ],
  add: (x, z) => {
    // Trục lòng thung lũng dẫn mắt từ tiền cảnh qua bãi mục tiêu (16, -104) về phía mặt trời mọc
    const valleyAxisX = 16 + (-104 - z) * 0.42 + Math.sin(z * 0.012) * 16;
    const distFromFloor = Math.abs(x - valleyAxisX);

    // Hai vách cao nguyên đá đỏ (mesa walls) cao ~30 m ôm hai bên sườn thung lũng
    const canyonWall = Math.max(0, Math.min(1, (distFromFloor - 38) / 74));
    const mesaProfile = canyonWall * canyonWall * (3 - 2 * canyonWall) * 30;
    const terrace = canyonWall > 0.22 ? Math.sin(mesaProfile * 0.38) * 1.6 : 0;

    // Dãy núi tầng xa ôm đường chân trời, hạ thấp tạo cổng yên ngựa đúng hướng mặt trời [72, -130]
    const distFar = Math.max(0, -z - 220);
    const farRise = Math.min(1, distFar / 280);
    const sunPassDist = Math.abs(x - (-z) * 0.55);
    const passMask = Math.min(1, Math.pow(sunPassDist / 110, 2));
    const farMountains =
      farRise *
      farRise *
      (12 + 28 * passMask + 10 * Math.sin(x * 0.019 + 0.6) * Math.cos(z * 0.013));

    return mesaProfile + terrace + farMountains;
  },
});

const avoidValleyTargets = (x: number, z: number) =>
  Math.hypot(x - 20, z + 101) < 26 || Math.abs(x - (16 + (-104 - z) * 0.42)) < 10;

const easePullback = Easing.bezier(0.32, 0.0, 0.18, 1.0);
const easeOrbit = Easing.bezier(0.38, 0.0, 0.24, 1.0);

const S11: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Vật liệu mảnh vỡ bê tông, vệt khói tro mềm nhiều lớp & điểm loé thấu kính MTS-B
  const debrisMat = useMemo(() => plain('#4d443c', 0.88, 0.16), []);
  const scorchLayers = useMemo(
    () =>
      [0.34, 0.22, 0.13, 0.07].map(
        (op) =>
          new THREE.MeshBasicMaterial({
            color: '#211c18',
            transparent: true,
            opacity: op,
            depthWrite: false,
          }),
      ),
    [],
  );
  const glintMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: P.laser,
        transparent: true,
        opacity: 0.85,
        toneMapped: false,
      }),
    [],
  );

  // Quỹ đạo lượn vòng trái quanh thung lũng: bay từ Trái (-X) sang Phải (+X) hướng về phía bình minh
  const dtScene = Math.max(0, t - 104.2);
  const alpha = -0.34 + dtScene * 0.036;
  const sinA = Math.sin(alpha);
  const cosA = Math.cos(alpha);

  // Tọa độ & góc tư thế của MQ-9 Reaper nổi bật trên nền trời phía trên đường chân trời
  const uavX = ORBIT_CX + ORBIT_R * sinA;
  const uavZ = ORBIT_CZ + ORBIT_R * cosA;
  const uavY = ORBIT_ALT + Math.sin(t * 0.72) * 0.3;
  const uavPos: V3 = [uavX, uavY, uavZ];

  // Vector vận tốc tiếp tuyến: (+cosA, 0, -sinA) -> góc xoay quanh +Y trong Three.js
  const fwdX = cosA;
  const fwdZ = -sinA;
  const uavHeading = Math.atan2(-fwdZ, fwdX);

  // Nghiêng cánh trái ~17 độ (-0.297 rad quanh trục dọc thân +X) hướng bụng và MTS-B về thung lũng bên trái
  const uavBank = -0.297 + Math.sin(t * 0.55) * 0.014;
  const uavPitch = 0.025;

  // Tính tọa độ thế giới chính xác của cầu mắt thần MTS-B & góc khóa mục tiêu dưới thung lũng
  const mtsbOffset = new THREE.Vector3(...MQ9_MTSB_POS)
    .applyAxisAngle(AXIS_X, uavBank)
    .applyAxisAngle(AXIS_Z, uavPitch)
    .applyAxisAngle(AXIS_Y, uavHeading);
  const mtsbWorld = new THREE.Vector3(...uavPos).add(mtsbOffset);

  const aimVec = new THREE.Vector3(...TARGET_AIM);
  const toTargetWorld = aimVec.clone().sub(mtsbWorld);
  const toTargetDir = toTargetWorld.clone().normalize();

  // Đưa vector ngắm ngược về hệ trục cục bộ của thân máy bay để tính sensorYaw, sensorPitch
  const toTargetLocal = toTargetWorld
    .clone()
    .applyAxisAngle(AXIS_Y, -uavHeading)
    .applyAxisAngle(AXIS_Z, -uavPitch)
    .applyAxisAngle(AXIS_X, -uavBank);

  const sensorYaw = Math.atan2(-toTargetLocal.z, toTargetLocal.x);
  const sensorPitch = Math.atan2(
    -toTargetLocal.y,
    Math.hypot(toTargetLocal.x, toTargetLocal.z),
  );

  // Điểm phát tia laser ngay mặt kính trước của quả cầu MTS-B
  const laserOriginVec = mtsbWorld.clone().addScaledVector(toTargetDir, 0.25);
  const laserPoints: V3[] = [
    [laserOriginVec.x, laserOriginVec.y, laserOriginVec.z],
    TARGET_AIM,
  ];

  // --- CHUYỂN ĐỘNG CAMERA 2 GIAI ĐOẠN (NEO THEO REAPER ĐỂ KHÔNG BAO GIỜ TRÔI KHỎI KHUNG) ---
  // Trục cánh phải hướng ra ngoài vòng lượn về phía camera: right = (sinA, 0, cosA)
  const rightX = sinA;
  const rightZ = cosA;

  // Giai đoạn 1 (104.60 – 109.02s): Wingtip-level Orbit ngang tầm cánh lia chậm qua góc 3/4 mũi, nền trời vàng-chàm rộng mở
  const pOrbit = prog(t, 104.35, CUE.s11_hero_pullback, easeOrbit);
  const g1Fwd = lerp(5.6, 13.6, pOrbit);
  const g1Right = lerp(17.8, 15.6, pOrbit);
  const g1Up = lerp(-0.55, 0.25, pOrbit);

  const cam1Pos: V3 = [
    uavX + fwdX * g1Fwd + rightX * g1Right,
    uavY + g1Up,
    uavZ + fwdZ * g1Fwd + rightZ * g1Right,
  ];
  const cam1Look: V3 = [
    uavX + fwdX * lerp(0.8, 1.5, pOrbit),
    uavY - lerp(0.35, 1.05, pOrbit),
    uavZ + fwdZ * lerp(0.8, 1.5, pOrbit),
  ];

  // Giai đoạn 2 (109.02 – 114.69s): Epic Wide Reveal kéo lùi mượt giữ Reaper ở 1/3 trên-trái, cột khói ở giữa-dưới và mặt trời ở trên-phải
  const pPull = prog(t, CUE.s11_hero_pullback - 0.18, CUE.s11_finale + 1.35, easePullback);
  const pDrift = prog(t, CUE.s11_hero_pullback, 114.69, Easing.out(Easing.quad));

  const cam2Pos: V3 = [
    uavX + lerp(12.8, 14.4, pDrift),
    uavY - lerp(2.0, 2.8, pDrift),
    uavZ + lerp(30.5, 36.8, pDrift),
  ];
  const cam2Look: V3 = [
    cam2Pos[0] - lerp(5.4, 2.2, pDrift),
    cam2Pos[1] - lerp(26.0, 29.8, pDrift),
    cam2Pos[2] - 160.0,
  ];

  const camPos: V3 = [
    lerp(cam1Pos[0], cam2Pos[0], pPull),
    lerp(cam1Pos[1], cam2Pos[1], pPull),
    lerp(cam1Pos[2], cam2Pos[2], pPull),
  ];
  const camLook: V3 = [
    lerp(cam1Look[0], cam2Look[0], pPull),
    lerp(cam1Look[1], cam2Look[1], pPull),
    lerp(cam1Look[2], cam2Look[2], pPull),
  ];
  const camFov = lerp(42, 48, pPull);
  const camRoll = lerp(0.03, 0.008, pPull);

  // Vùng bóng đổ nét tập trung quanh Reaper ở cận cảnh và mở rộng khi kéo đại cảnh
  const shadowArea = lerp(24, 80, pPull);
  const shadowCenter: V3 = [
    lerp(uavX, 10, pPull * 0.35),
    lerp(uavY, 55, pPull * 0.35),
    lerp(uavZ, -25, pPull * 0.35),
  ];

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: '#0e264a' }}>
      <Stage
        {...STAGE_HIGH_DAWN}
        sky={['#0a234a', '#dda772', '#f7ca8e']}
        sun={GOLDEN_SUN}
        sunColor="#ffd392"
        sunIntensity={3.3}
        ambient={0.28}
        env={0.5}
        exposure={1.08}
        fog={[250, 1180]}
        fogColor="#d8a878"
        shadowArea={shadowArea}
        shadowCenter={shadowCenter}
        post={{ bloom: 0.72, bloomThreshold: 0.78, ao: 2.0, aoRadius: 2.4, vignette: 0.42 }}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Nắng xiên bình minh phụ (~58 độ so với trục camera) + phản xạ cát sa mạc giúp thân Ghost Gray & sải cánh lấp lánh */}
        <directionalLight position={[88, 50, 46]} color="#ffd69c" intensity={1.1} />
        <directionalLight position={[-55, -22, 78]} color="#e6b684" intensity={0.55} />
        <directionalLight position={[-80, 55, 60]} color="#8cb5dc" intensity={0.35} />

        {/* Thung lũng hẻm núi cao nguyên sa mạc rộng lớn */}
        <Terrain
          h={valleyHeight}
          size={1700}
          seg={240}
          center={[25, -210]}
          colors={DESERT_TERRAIN}
          grainRepeat={72}
        />
        <Scatter
          kind="rock"
          count={210}
          area={[-290, -440, 350, 110]}
          h={valleyHeight}
          seed={113}
          scale={[1.5, 4.4]}
          avoid={avoidValleyTargets}
          tint="#a88260"
        />
        <Scatter
          kind="bush"
          count={125}
          area={[-230, -360, 280, 90]}
          h={valleyHeight}
          seed={114}
          scale={[0.9, 2.1]}
          avoid={avoidValleyTargets}
          tint="#9c8659"
        />

        {/* Khu phế tích mục tiêu dưới đáy thung lũng + vệt ám khói mềm + cột khói hậu chiến trường bốc cao */}
        <group>
          {[4.0, 7.2, 10.8, 14.5].map((r, i) => (
            <mesh
              key={`sb-${i}`}
              position={[16.5, 0.05 + i * 0.008, -103.5]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={scorchLayers[i]}
            >
              <circleGeometry args={[r, 28]} />
            </mesh>
          ))}
          {[2.5, 4.6, 7.0, 9.4].map((r, i) => (
            <mesh
              key={`st-${i}`}
              position={[29.2, 0.04 + i * 0.008, -97.8]}
              rotation={[-Math.PI / 2, 0, 0]}
              material={scorchLayers[i]}
            >
              <circleGeometry args={[r, 24]} />
            </mesh>
          ))}

          <FortifiedBunker
            position={TARGET_BUNKER}
            rotation={[0.06, 0.52, -0.08]}
            dishYaw={1.15}
          />
          <TacticalTruck
            position={TARGET_TRUCK}
            rotation={[0.04, 2.34, 0.12]}
            travel={14}
          />

          {/* Mảnh vỡ công sự vương vãi dưới đáy thung lũng */}
          {[
            [10.2, 0.34, -100.4, 0.95],
            [21.8, 0.3, -106.8, 1.12],
            [19.4, 0.28, -98.8, 0.78],
            [13.1, 0.32, -108.5, 0.88],
          ].map(([dx, dy, dz, s], idx) => (
            <mesh
              key={idx}
              position={[dx, dy, dz]}
              rotation={[idx * 0.7, idx * 1.3, 0.4]}
              scale={[s, s * 0.65, s * 0.85]}
              material={debrisMat}
              castShadow
            >
              <dodecahedronGeometry args={[0.95, 0]} />
            </mesh>
          ))}

          {/* Cột khói hậu chiến trường âm ỉ (at=102.05 để dt > 2.2s ngay từ đầu cảnh: sạch mảnh bay, chỉ còn cột khói cao) */}
          <Explosion
            t={t}
            at={102.05}
            pos={[16.5, 0.2, -103.5]}
            size={11.5}
            smokeLife={16.8}
            smoke="#4b443e"
            seed={11}
          />
          <Explosion
            t={t}
            at={102.3}
            pos={[29.2, 0.15, -97.8]}
            size={7.0}
            smokeLife={16.2}
            smoke="#5b534b"
            seed={27}
          />
        </group>

        {/* Tia laser chỉ thị xanh ngọc mảnh tinh tế từ mắt thần MTS-B dõi khóa khu mục tiêu dưới đất */}
        <Trail
          points={laserPoints}
          width={0.045}
          opacity={0.36}
          color={P.laser}
          glow
        />
        <mesh position={[laserOriginVec.x, laserOriginVec.y, laserOriginVec.z]} material={glintMat}>
          <sphereGeometry args={[0.07, 12, 10]} />
        </mesh>

        {/* Chủ thể chính: UAV MQ-9 Reaper nghiêng cánh lượn vòng tuần tra thống trị bầu trời bình minh */}
        <group position={uavPos} rotation={[0, uavHeading, 0]}>
          <group rotation={[0, 0, uavPitch]}>
            <MQ9Reaper
              rotation={[uavBank, 0, 0]}
              gearDown={0}
              loadout="full"
              propSpin={t * 44}
              sensorYaw={sensorYaw}
              sensorPitch={sensorPitch}
            />
          </group>
        </group>
      </Stage>

      {/* Nhãn duy nhất ở cao trào kết phim */}
      <Label
        t={t}
        text="MQ-9 REAPER"
        x={330}
        y={895}
        from={CUE.s11_hero_pullback}
        until={113.9}
        size={56}
        bg={P.paper}
        fg={P.ink}
      />
    </div>
  );
};

export default S11;
