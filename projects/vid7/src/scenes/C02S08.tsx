// C02S08 (291.28–315.78 s) — 3D Góc mũi tàu nhìn ngược trong cuồng phong (stormDawn, swell=4.3):
// 1) Mũi USS Hornet bổ sóng tung bọt trắng xoá, dải bọt gió 45 mph quật dọc qua đôi cánh B-25 #1 đang ghìm phanh rung bần bật.
// 2) Tiền cảnh mép sàn mạn trái (x=+22, z=-7.6): Sĩ quan phóng tàu áo vàng Hải quân quay vòng cờ caro đen-trắng 4×4 canh mũi tàu ngóc lên rồi đúng từ "whips" (307.72 s) quất mạnh cờ sát xuống sàn.
// 3) Đẩy tới trước mũi chiếc #1: nhả phanh nhún càng mũi (309.46 s), bật propFast + lửa xanh-cam & khói xả MuzzleBlast từ 2 động cơ Wright Cyclone 1,700 HP (310.76 s), chồm vọt từ x=-16.6 lên +4.0 m.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { MuzzleBlast, softDot } from '@skill/military/3d/fx';
import { pipe, rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { CUE } from '../cues';
import { STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose } from '../parts/OceanSurface';
import { HORNET_B25_Z, HORNET_DECK_Y, USSHornet } from '../parts/USSHornet';

type ShipPose = ReturnType<typeof shipPose>;

/** Đổi toạ độ cục bộ trên sàn tàu sang world space khớp tuyệt đối với <group position={[0,pose.y,0]} rotation={[pose.roll,0,pose.pitch]}> */
const shipToWorld = (local: V3, pose: ShipPose): V3 => {
  const v = new THREE.Vector3(local[0], local[1], local[2])
    .applyEuler(new THREE.Euler(pose.roll, 0, pose.pitch, 'XYZ'))
    .add(new THREE.Vector3(0, pose.y, 0));
  return [v.x, v.y, v.z];
};

// Lệch pha sóng tất định +2.02 s để mũi Hornet chúi xuống ở ~305.5 s rồi ngóc mạnh lên đỉnh sóng đúng nhịp 306.0..307.8 s ("times the rise of the hull... and whips it down")
const WAVE_PHASE_OFFSET = 2.02;

const WAITING_BOMBERS: { x: number; z: number; yaw: number }[] = Array.from({ length: 15 }, (_, i) => {
  const isPort = i % 2 === 0;
  return {
    x: -33.2 - i * 6.1,
    z: isPort ? -5.35 : 4.55,
    yaw: isPort ? 0.065 : -0.055,
  };
});

/** Tổ bay Doolittle & Cole ngồi trong buồng lái chiếc #1 */
const SimpleCockpitPilots: React.FC = () => {
  const leatherMat = plain('#382317', 0.68, 0.06);
  const maeWestMat = plain('#d9a822', 0.66, 0.04);
  const helmetMat = plain('#281911', 0.74, 0.05);
  const skinMat = plain('#c7926c', 0.72, 0.02);

  return (
    <group>
      <pointLight position={[4.86, 2.78, -0.15]} color="#ff9936" intensity={4.0} distance={2.7} decay={2} />
      {([-0.34, 0.34] as const).map((zp, idx) => (
        <group key={`p8-${idx}`} position={[4.28, 2.56, zp]}>
          <mesh position={[0.02, 0.26, 0]} geometry={rbox(0.25, 0.44, 0.35, 0.05)} material={leatherMat} />
          <mesh position={[0.09, 0.29, 0]} geometry={rbox(0.15, 0.32, 0.3, 0.04)} material={maeWestMat} />
          <mesh position={[0.05, 0.6, 0]} material={skinMat}>
            <sphereGeometry args={[0.11, 14, 12]} />
          </mesh>
          <mesh position={[0.036, 0.62, 0]} material={helmetMat}>
            <sphereGeometry args={[0.119, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

/** Bọt sóng trắng xoá tung lên dưới chân mũi clipper bow của USS Hornet & các dải gió bão 45 mph lướt cong qua đôi cánh B-25 #1 */
const BowSprayAndHeadwindStreaks: React.FC<{ t: number; planeX: number }> = ({ t, planeX }) => {
  const foamMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#eef6fb',
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
    [],
  );

  // Giảm dần dải gió mảnh khi vào cận cảnh firewall động cơ để không cắt ngang kính buồng lái
  const windOpacity = 0.22 * (1 - prog(t, 308.6, 309.5));
  const streakMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#e8f3fa',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    [],
  );
  streakMat.opacity = windOpacity;

  // Dải gió uốn cong mềm theo biên dạng khí động cánh
  const ribbonGeo = useMemo(
    () =>
      pipe(
        [
          [2.4, -0.05, 0],
          [0.8, 0.08, 0],
          [-0.9, 0.06, 0],
          [-2.6, -0.04, 0],
        ],
        0.018,
        14,
      ),
    [],
  );

  return (
    <group>
      {/* 1. Bọt sóng trắng xoá vỡ dọc hai bên má dưới mũi clipper bow (y = 0.5..11.8 m bên ngoài thân tàu, giữ mặt sàn số 8 hoàn toàn sạch nét!) */}
      {Array.from({ length: 38 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        const cycle = ((t * 0.94 + rnd(i * 11 + 5)) % 1 + 1) % 1;
        const bx = lerp(126.0, 84.0, cycle);
        const hullBeam = lerp(2.4, 14.5, cycle);
        const bz = side * (hullBeam + 1.8 + rnd(i * 17) * 5.2);
        const arcY = Math.sin(cycle * Math.PI) * (5.6 + rnd(i * 23) * 4.8);
        const by = lerp(0.4, 3.6, cycle * 0.5) + arcY;
        const sc = lerp(3.5, 8.8, cycle) * (0.78 + 0.45 * rnd(i * 29));
        return <sprite key={`bow-foam-${i}`} material={foamMat} position={[bx, by, bz]} scale={[sc * 1.5, sc * 0.85, sc]} />;
      })}

      {/* 2. Các dải dòng khí cuồng phong 45 mph (~20.1 m/s) quật từ mũi về đuôi, ôm vồng qua đôi cánh hải âu chiếc B-25 #1 (x = +4..-30 m quanh máy bay, không chạm ống kính) */}
      {windOpacity > 0.005 &&
        Array.from({ length: 26 }, (_, i) => {
          const speed = 22.5 + rnd(i * 19) * 5.0;
          const span = 34.0;
          const rawX = 4.0 - (((t * speed + rnd(i * 7) * span) % span + span) % span);
          const wingSide = i % 2 === 0 ? -1 : 1;
          const zLocalWing = lerp(1.8, 10.1, rnd(i * 31 + 9));
          const z = HORNET_B25_Z + wingSide * zLocalWing;
          const baseH = HORNET_DECK_Y + 2.15 + rnd(i * 53) * 1.45;

          const dxWing = rawX - (planeX + 1.5);
          const overWing = Math.exp(-(dxWing * dxWing) / 11.5);
          const y = baseH + overWing * 0.62;
          const pitchAir = overWing * (dxWing > 0 ? -0.16 : 0.16);
          const lenScale = 0.8 + rnd(i * 61) * 0.6;

          return (
            <mesh
              key={`wind-streak-${i}`}
              geometry={ribbonGeo}
              material={streakMat}
              position={[rawX, y, z]}
              rotation={[0, 0, pitchAir]}
              scale={[lenScale, 1, 1]}
            />
          );
        })}
    </group>
  );
};

/**
 * Sĩ quan phóng tàu Hải quân Mỹ (Launch Officer — "Fly 1") mặc áo gió vàng Hải quân tại mép sàn mạn trái (x = +22, z = -7.6).
 * Tỉ lệ giải phẫu người thật 1.78 m liền lạc (hông-chậu nối liền đùi/gối/bắp chân/ủng, áo gió bo gấu & cầu vai tròn, bắp tay - khuỷu tay - găng da).
 * Cầm cán cờ caro đen-trắng 4×4 ô vuông sắc nét:
 * - Trước 307.52 s: quay vòng lá cờ caro trên cao canh nhịp mũi tàu ngóc lên theo sóng.
 * - Đúng từ "whips" (CUE.c02_s08_whips_down = 307.72 s): khuỵu gối gập người quất mạnh lá cờ caro sát xuống mặt sàn (~0.30 m trên mặt sàn, không bao giờ xuyên sàn!).
 */
const LaunchOfficerCheckered: React.FC<{ t: number }> = ({ t }) => {
  const yellowJacketMat = plain('#eab726', 0.64, 0.05);
  const yellowDarkMat = plain('#c49315', 0.7, 0.05);
  const beltMat = plain('#382e22', 0.75, 0.12);
  const navyPantsMat = plain('#1b2738', 0.8, 0.05);
  const bootMat = plain('#15171a', 0.72, 0.12);
  const gloveMat = plain('#2b211a', 0.76, 0.06);
  const skinMat = plain('#d4a07a', 0.7, 0.03);
  const helmetMat = plain('#243040', 0.72, 0.06);
  const goggleMat = plain('#191d22', 0.26, 0.45);
  const poleMat = plain('#6e5032', 0.75, 0.08);
  const checkWhiteMat = plain('#f4f7fa', 0.55, 0.04, { side: THREE.DoubleSide });
  const checkBlackMat = plain('#121417', 0.65, 0.05, { side: THREE.DoubleSide });

  // Tiến độ quất cờ: bắt đầu vung tại 307.52 s, qua chính tâm từ "whips" 307.72 s, gập sát sàn tại 307.90 s
  const whipP = prog(t, 307.52, 307.9);
  const whipOvershoot = bump(t, 307.86, 0.26) * 0.04;
  const w = Math.min(1.03, whipP + whipOvershoot);

  // Nhịp quay vòng tròn trên đầu trước khi quất (tốc độ 8.6 rad/s)
  const twirlAngle = t * 8.6;
  const twirlWeight = 1 - prog(t, 307.48, 307.68);

  // Khuỵu gối & gập thân người về phía trước khi quất cờ
  const crouchDrop = lerp(0, 0.18, whipP);
  const torsoLeanFwd = lerp(0.1, 0.48, w);

  // Cánh tay phải hạ từ +1.00 rad xuống -0.14 rad kết hợp xoay trục cán cờ 0.90 rad để lá cờ caro nằm trọn trong khung hình lúc quay & quét sát sàn (~0.32 m trên sàn) lúc quất!
  const worldArmPitch = lerp(1.0 + 0.16 * Math.sin(twirlAngle) * twirlWeight, -0.14, w);
  const armPitchInTorso = torsoLeanFwd + worldArmPitch;
  const armYawCone = 0.28 * Math.cos(twirlAngle) * twirlWeight + lerp(0.08, -0.22, whipP);
  const poleAxialRoll = lerp(0.1, 0.9, whipP);

  // Kích thước lá cờ caro 4×4: 0.78 × 0.78 m (mỗi ô 0.195 × 0.195 m sắc nét)
  const tileSize = 0.195;

  return (
    <group position={[22.0, HORNET_DECK_Y, -7.6]} rotation={[0, -2.18, 0]}>
      {/* Khung hông-chậu liền lạc với hai đùi, gối, bắp chân & ủng boong tàu */}
      <group>
        {/* Khối hông quần Hải quân nối liền 2 đùi lên thắt lưng */}
        <mesh position={[0, 0.8 - crouchDrop * 0.9, 0]} geometry={rbox(0.23, 0.22, 0.34, 0.07)} material={navyPantsMat} castShadow />

        {/* Chân trái bước tấn lên trước */}
        <mesh position={[0.11, 0.58 - crouchDrop * 0.55, -0.13]} rotation={[0.06, 0, -0.22 - crouchDrop * 0.4]} geometry={rbox(0.165, 0.46, 0.165, 0.055)} material={navyPantsMat} castShadow />
        <mesh position={[0.2, 0.27 - crouchDrop * 0.2, -0.15]} rotation={[0.04, 0, 0.05 + crouchDrop * 0.22]} geometry={rbox(0.145, 0.43, 0.145, 0.045)} material={navyPantsMat} castShadow />
        <mesh position={[0.24, 0.065, -0.16]} geometry={rbox(0.25, 0.13, 0.15, 0.035)} material={bootMat} castShadow />

        {/* Chân phải trụ vững phía sau */}
        <mesh position={[-0.1, 0.58 - crouchDrop * 0.55, 0.13]} rotation={[-0.06, 0, 0.2 + crouchDrop * 0.3]} geometry={rbox(0.165, 0.46, 0.165, 0.055)} material={navyPantsMat} castShadow />
        <mesh position={[-0.18, 0.27 - crouchDrop * 0.2, 0.15]} rotation={[-0.04, 0, 0.1]} geometry={rbox(0.145, 0.43, 0.145, 0.045)} material={navyPantsMat} castShadow />
        <mesh position={[-0.19, 0.065, 0.16]} geometry={rbox(0.25, 0.13, 0.15, 0.035)} material={bootMat} castShadow />
      </group>

      {/* Thân trên mặc áo gió vàng Hải quân chuẩn giải phẫu (dày trước-sau 0.26 m, rộng ngang vai 0.40 m) */}
      <group position={[0, 0.86 - crouchDrop, 0]} rotation={[0, 0, -torsoLeanFwd]}>
        {/* Vạt gấu áo gió ôm quanh hông */}
        <mesh position={[0, 0.03, 0]} geometry={rbox(0.25, 0.18, 0.36, 0.065)} material={yellowDarkMat} castShadow />
        {/* Đai thắt lưng vải quanh eo */}
        <mesh position={[0, 0.13, 0]} geometry={rbox(0.26, 0.055, 0.368, 0.02)} material={beltMat} />
        {/* Lưng & ngực áo gió vàng Hải quân */}
        <mesh position={[0.01, 0.35, 0]} geometry={rbox(0.27, 0.42, 0.4, 0.08)} material={yellowJacketMat} castShadow />
        {/* Phao cứu sinh Mae West trước ngực & cổ áo gió bẻ cao */}
        <mesh position={[0.04, 0.37, 0]} geometry={rbox(0.29, 0.26, 0.35, 0.05)} material={yellowDarkMat} />
        <mesh position={[0.01, 0.58, 0]} material={yellowDarkMat}>
          <cylinderGeometry args={[0.118, 0.14, 0.09, 14]} />
        </mesh>

        {/* Cầu vai tròn nối mượt thân áo với 2 cánh tay */}
        {([-0.2, 0.2] as const).map((zs, si) => (
          <mesh key={`sh-${si}`} position={[0.02, 0.49, zs]} material={yellowJacketMat} castShadow>
            <sphereGeometry args={[0.076, 12, 10]} />
          </mesh>
        ))}

        {/* Đầu + mũ vải phi hành đoàn boong tàu có tai che & kính chắn gió */}
        <group position={[0.03, 0.72, 0]} rotation={[0, 0.14, torsoLeanFwd * 0.45]}>
          <mesh material={skinMat} castShadow>
            <sphereGeometry args={[0.112, 16, 14]} />
          </mesh>
          <mesh position={[-0.012, 0.018, 0]} material={helmetMat} castShadow>
            <sphereGeometry args={[0.122, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.75]} />
          </mesh>
          <mesh position={[-0.01, -0.03, 0]} geometry={rbox(0.11, 0.1, 0.23, 0.03)} material={helmetMat} />
          <mesh position={[0.098, 0.035, 0]} geometry={rbox(0.045, 0.052, 0.165, 0.015)} material={goggleMat} />
        </group>

        {/* Tay trái chia 2 khớp (bắp tay + cẳng tay đeo găng da) chỉ thẳng hướng xuất kích */}
        <group position={[0.02, 0.49, -0.2]} rotation={[0.22, 0.32, lerp(-0.28, -0.68, whipP)]}>
          <mesh position={[0.14, 0, 0]} geometry={rbox(0.28, 0.12, 0.12, 0.045)} material={yellowJacketMat} castShadow />
          <group position={[0.27, 0, 0]} rotation={[0, 0.22, 0.18]}>
            <mesh position={[0.13, 0, 0]} geometry={rbox(0.26, 0.105, 0.105, 0.04)} material={yellowJacketMat} castShadow />
            <mesh position={[0.27, 0, 0]} geometry={rbox(0.09, 0.075, 0.08, 0.025)} material={gloveMat} />
          </group>
        </group>

        {/* Tay phải 2 khớp cầm cán cờ caro quay trên cao rồi QUẤT MẠNH xuống sát mặt sàn tại 307.72 s! */}
        <group position={[0.03, 0.5, 0.2]} rotation={[0, armYawCone, armPitchInTorso]}>
          <mesh position={[0.15, 0, 0]} geometry={rbox(0.3, 0.125, 0.125, 0.045)} material={yellowJacketMat} castShadow />
          <group position={[0.29, 0, 0]} rotation={[0, -0.08, lerp(0.22, 0.04, whipP)]}>
            <mesh position={[0.14, 0, 0]} geometry={rbox(0.28, 0.11, 0.11, 0.04)} material={yellowJacketMat} castShadow />
            <mesh position={[0.29, 0, 0]} geometry={rbox(0.1, 0.08, 0.085, 0.025)} material={gloveMat} />

            {/* Cán cờ gỗ 1.32 m & Lá cờ caro đen-trắng 4×4 ô vuông sắc nét */}
            <group position={[0.31, 0, 0]} rotation={[poleAxialRoll, 0, lerp(0.12, -0.04, whipP)]}>
              <mesh geometry={pipe([[-0.18, 0, 0], [1.16, 0, 0]], 0.019, 8)} material={poleMat} castShadow />

              {/* Lưới 4×4 = 16 ô vuông đen-trắng ghép khít, uốn lượn sóng vải tất định theo gió 45 mph */}
              <group position={[0.34, 0, 0]}>
                {Array.from({ length: 4 }, (_, row) =>
                  Array.from({ length: 4 }, (_, col) => {
                    const isBlack = (row + col) % 2 === 0;
                    const distFromPole = (col + 0.5) * tileSize;
                    const wavePhase = t * 18.0 - col * 1.15 - row * 0.35;
                    const flutterZ = Math.sin(wavePhase) * (0.022 + col * 0.024);
                    const flutterRotY = Math.cos(wavePhase) * (0.09 + col * 0.045);
                    return (
                      <mesh
                        key={`chk-${row}-${col}`}
                        position={[(row + 0.5) * tileSize, -distFromPole, flutterZ]}
                        rotation={[0.07 * Math.sin(wavePhase), flutterRotY, 0]}
                        material={isBlack ? checkBlackMat : checkWhiteMat}
                        castShadow
                      >
                        <boxGeometry args={[tileSize + 0.004, tileSize + 0.004, 0.01]} />
                      </mesh>
                    );
                  }),
                )}
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

/** Chớp lửa xanh-cam ở 28 họng xả động cơ Radial Wright R-2600 Twin Cyclone khi Doolittle đẩy kịch tay ga (310.76 s+) */
const CycloneFirewallFlames: React.FC<{ t: number }> = ({ t }) => {
  const blueCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#6cd4ff',
        transparent: true,
        opacity: 0.88,
        toneMapped: false,
      }),
    [],
  );
  const orangeTongueMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff8a24',
        transparent: true,
        opacity: 0.78,
        toneMapped: false,
      }),
    [],
  );

  if (t < CUE.c02_s08_firewalls_1700) return null;
  const ramp = prog(t, CUE.c02_s08_firewalls_1700, CUE.c02_s08_firewalls_1700 + 0.35);

  return (
    <group>
      {([-1, 1] as const).map((side) => {
        const zC = side * 3.05;
        return (
          <group key={`cyc-flame-${side}`} position={[0, 2.62, zC]}>
            <pointLight position={[3.35, -0.1, side * 0.85]} color="#ff9638" intensity={7.5 * ramp} distance={5.5} decay={2} />
            {Array.from({ length: 14 }, (_, i) => {
              const a = ((i + 0.5) / 14) * Math.PI * 2;
              const flicker = 0.7 + 0.55 * Math.sin(t * 64 + i * 2.3 + side);
              const len = (0.34 + 0.22 * flicker) * ramp;
              return (
                <group key={`fl-${i}`} position={[3.44, Math.cos(a) * 0.74, Math.sin(a) * 0.74]} rotation={[-a, 0, 0]}>
                  {/* Lưỡi lửa phun chéo ra sau dọc sườn cowling */}
                  <group rotation={[0, 0, -1.32]}>
                    <mesh position={[0, len * 0.5, 0]} material={orangeTongueMat}>
                      <coneGeometry args={[0.052, len, 8]} />
                    </mesh>
                    <mesh position={[0, len * 0.34, 0]} material={blueCoreMat}>
                      <coneGeometry args={[0.032, len * 0.65, 8]} />
                    </mesh>
                  </group>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

/** Vệt bụi nước mù mịt bị luồng gió cánh quạt 3,400 HP thổi bung ra sau 2 bánh chính khi chiếc #1 chồm tới */
const TakeoffPropWashSpray: React.FC<{ t: number; planeX: number }> = ({ t, planeX }) => {
  const sprayMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#dce7ef',
        transparent: true,
        opacity: 0.34,
        depthWrite: false,
      }),
    [],
  );

  if (t < CUE.c02_s08_firewalls_1700) return null;
  const p = prog(t, CUE.c02_s08_firewalls_1700, 315.78);

  return (
    <group>
      {([-3.8, 2.1] as const).map((zw, sIdx) =>
        Array.from({ length: 9 }, (_, k) => {
          const cycle = ((t * 3.4 + k * 0.11 + sIdx * 0.3) % 1 + 1) % 1;
          const sx = planeX + 1.1 - cycle * (9.5 + p * 8.0);
          const sy = HORNET_DECK_Y + 0.35 + cycle * 1.65;
          const sz = zw + (rnd(k * 13 + sIdx) - 0.5) * (0.8 + cycle * 2.2);
          const sc = (0.9 + cycle * 3.2) * Math.min(1, p * 3.2);
          return <sprite key={`pwash-${sIdx}-${k}`} material={sprayMat} position={[sx, sy, sz]} scale={[sc * 1.4, sc * 0.85, sc]} />;
        }),
      )}
    </group>
  );
};

const C02S08: React.FC = () => {
  const t = useT();
  const swell = 4.3;
  const tWave = t + WAVE_PHASE_OFFSET;
  const pose = shipPose(0, 0, 251.4, 35.0, tWave, swell);

  // ---------------- Động lực học chiếc B-25 #1: Ghìm phanh -> Nhả phanh nhún mũi (309.46 s) -> Hết ga chồm vọt (310.76..315.78 s) ----------------
  const isFirewall = t >= CUE.c02_s08_firewalls_1700;
  // Gia tốc vật lý t^2 mượt từ x = -16.6 m lên đúng +4.0 m tại 315.78 s (khớp hard-cut sang C02S09!)
  const accelRaw = prog(t, CUE.c02_s08_firewalls_1700, 315.78, (x) => x * x);
  const planeX = lerp(-16.6, 4.0, accelRaw);

  // Nhún giảm chấn càng mũi khi nhả phanh ở 309.46 s & gồng lực kéo cánh quạt
  const brakeSquat =
    bump(t, CUE.c02_s08_releases_brakes, 1.35) * -0.019 +
    prog(t, CUE.c02_s08_firewalls_1700, 312.0) * (1 - prog(t, 313.5, 315.78)) * -0.011;

  // Rung bần bật khi ghìm phanh trước gió bão 45 mph & gầm động cơ tối đa
  const buffetPower = isFirewall ? 1.45 : 1.0;
  const airframeRoll = 0.0032 * buffetPower * Math.sin(t * 39);
  const airframeY = 0.0055 * buffetPower * Math.sin(t * 47);
  const propAngle = t * 15 + accelRaw * 68;

  // ---------------- Ngôn ngữ Camera 3 nhịp trong hệ toạ độ sàn tàu -> World space ----------------
  let localPos: V3;
  let localLook: V3;
  let fov = 38;

  // Shot 1 (291.28–302.82 s): Từ ngoài mũi clipper bow bổ sóng tung bọt trắng xoá, lướt dọc sàn tàu theo gió 45 mph tới sát đôi cánh B-25 #1
  const p1 = prog(t, 291.28, 302.4);
  const s1Pos: V3 = [lerp(138.0, 6.2, p1), lerp(24.4, 21.05, p1), lerp(-17.8, -6.2, p1)];
  const s1Look: V3 = [lerp(46.0, -15.2, p1), lerp(18.5, 20.42, p1), lerp(-0.5, -0.65, p1)];

  // Shot 2 (302.82–308.85 s): Cắt đúng nhịp "At the bow, the launch officer..." sang tiền cảnh Sĩ quan phóng tàu áo vàng (x=+22, z=-7.6) quay & quất cờ caro 4×4
  const p2 = prog(t, 302.82, 308.85);
  const s2Pos: V3 = [lerp(27.55, 26.55, p2), lerp(19.92, 19.74, p2), lerp(-7.08, -6.92, p2)];
  const s2Look: V3 = [-12.0, lerp(20.36, 20.02, p2), -1.36];

  // Shot 3 (308.85–315.78 s): Đẩy nhanh tới trước mũi chiếc #1 bắt trọn cú nhún càng mũi nhả phanh, lửa xả xanh-cam 2 máy Wright Cyclone & cú chồm vọt lên +4.0 m
  const p3In = prog(t, 308.85, 309.4);
  const shakeX = isFirewall ? 0.022 * Math.sin(t * 53) : 0;
  const shakeY = isFirewall ? 0.018 * Math.cos(t * 61) : 0;
  const s3Pos: V3 = [
    2.4 + (planeX + 16.6) * 0.88 + shakeX,
    19.74 + accelRaw * 0.24 + shakeY,
    -3.55 - accelRaw * 0.52,
  ];
  const s3Look: V3 = [planeX + 3.85, 20.42 + accelRaw * 0.12, -0.95];

  if (t < 302.82) {
    localPos = s1Pos;
    localLook = s1Look;
    fov = lerp(41, 36, p1);
  } else if (t < 308.85) {
    localPos = s2Pos;
    localLook = s2Look;
    fov = 36;
  } else {
    localPos = [
      lerp(s2Pos[0], s3Pos[0], p3In),
      lerp(s2Pos[1], s3Pos[1], p3In),
      lerp(s2Pos[2], s3Pos[2], p3In),
    ];
    localLook = [
      lerp(s2Look[0], s3Look[0], p3In),
      lerp(s2Look[1], s3Look[1], p3In),
      lerp(s2Look[2], s3Look[2], p3In),
    ];
    fov = lerp(36, 39, accelRaw);
  }

  const worldPos = shipToWorld(localPos, pose);
  const worldLook = shipToWorld(localLook, pose);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...STAGE_PRESETS.stormDawn} shadowCenter={[18, 20, -2]} shadowArea={86}>
        <Cam pos={worldPos} look={worldLook} fov={fov} />

        {/* Mặt biển cuồng phong Tây Thái Bình Dương (swell = 4.3, đồng bộ pha sóng tWave) */}
        <OceanSurface t={tWave} swell={swell} size={1050} seg={128} palette="stormPacific" />

        {/* Toàn bộ USS Hornet + Bọt sóng mũi + Gió 45 mph + Sĩ quan cờ caro + 16 B-25B */}
        <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
          <USSHornet hullNumber="8" showLaunchLines={true} flagWave={t * 1.4} />
          <BowSprayAndHeadwindStreaks t={t} planeX={planeX} />

          {/* Sĩ quan phóng tàu mặc áo gió vàng Hải quân quay & quất cờ caro đen-trắng 4×4 tại [22, 18.3, -7.6] */}
          <LaunchOfficerCheckered t={t} />

          {/* Chiếc B-25B #1 của Doolittle: xoay nhún mũi quanh trục bánh chính x_local = +1.24 để bánh chính luôn bám khít sàn tàu */}
          <group position={[planeX + 1.24, HORNET_DECK_Y + airframeY, HORNET_B25_Z]} rotation={[airframeRoll, 0, brakeSquat]}>
            <group position={[-1.24, 0, 0]}>
              <B25Mitchell
                gear={1}
                chained={false}
                lowerTurret={false}
                broomsticks={true}
                navLights={true}
                propSpin={propAngle}
                propFast={isFirewall}
                seed={18}
              />
              <SimpleCockpitPilots />
              <CycloneFirewallFlames t={t} />

              {/* Chớp khói-lửa cổ xả MuzzleBlast nhỏ phụt ra từ 2 động cơ Wright R-2600 đúng khoảnh khắc firewall 310.76 s */}
              <MuzzleBlast t={t} at={CUE.c02_s08_firewalls_1700} pos={[3.42, 2.52, -3.82]} dir={[-1, -0.08, -0.26]} size={0.48} seed={11} />
              <MuzzleBlast t={t} at={CUE.c02_s08_firewalls_1700} pos={[3.42, 2.52, 3.82]} dir={[-1, -0.08, 0.26]} size={0.48} seed={12} />
              <MuzzleBlast t={t} at={CUE.c02_s08_firewalls_1700 + 0.45} pos={[3.42, 2.48, -2.28]} dir={[-1, -0.1, 0.18]} size={0.42} seed={13} />
              <MuzzleBlast t={t} at={CUE.c02_s08_firewalls_1700 + 0.45} pos={[3.42, 2.48, 2.28]} dir={[-1, -0.1, -0.18]} size={0.42} seed={14} />
            </group>
          </group>

          <TakeoffPropWashSpray t={t} planeX={planeX} />

          {/* 15 chiếc B-25B xếp hàng chờ phía sau (dùng chung seed=18 & tắt pointLight thừa để render tức thì) */}
          {WAITING_BOMBERS.map((b, idx) => (
            <group key={`wait8-b25-${idx}`} position={[b.x, HORNET_DECK_Y, b.z]} rotation={[0, b.yaw, 0]}>
              <B25Mitchell
                gear={1}
                chained={idx < 4}
                lowerTurret={false}
                broomsticks={true}
                navLights={false}
                propSpin={t * (11.0 + (idx % 4) * 1.2) + idx * 1.5}
                seed={18}
              />
            </group>
          ))}
        </group>
      </Stage>

      {/* Tối đa 1 <Label> hiển thị tại một thời điểm */}
      <Label
        t={t}
        text="45 MPH HEADWIND"
        x={460}
        y={195}
        from={CUE.c02_s08_wind_45mph}
        until={302.4}
      />
      <Label
        t={t}
        text="2 × 1,700 HP CYCLONE"
        x={1390}
        y={835}
        from={CUE.c02_s08_firewalls_1700}
        until={315.55}
      />
    </div>
  );
};

export default C02S08;
