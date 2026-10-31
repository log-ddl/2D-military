import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog, rnd, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { Explosion, Trail, softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_PROVING_NOON } from '../design/stage';
import { EnemyT72 } from '../parts/EnemyT72';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';

const BERM_Y = 0.54;
const TURRET_YAW = 0.22;
const GUN_PITCH = -0.02;

// Quỹ đạo mũi lao DU nằm gọn trong nửa phải khung hình (lệch trục camera ~48° > 35°) lao thẳng vào sườn phải vòm tháp đúc T-72
const DART_START: V3 = [11.2, 3.22, 3.6];
const IMPACT_POS: V3 = [0.28, 2.38, 1.21];

const DART_VEC = [
  IMPACT_POS[0] - DART_START[0],
  IMPACT_POS[1] - DART_START[1],
  IMPACT_POS[2] - DART_START[2],
] as const;
const DART_DIST = Math.hypot(DART_VEC[0], DART_VEC[1], DART_VEC[2]);
const DART_DIR: V3 = [
  DART_VEC[0] / DART_DIST,
  DART_VEC[1] / DART_DIST,
  DART_VEC[2] / DART_DIST,
];
const DART_ROT_Z = Math.asin(DART_DIR[1]);
const DART_ROT_Y = Math.atan2(-DART_DIR[2], DART_DIR[0]);

const H_TARGET_RANGE = heightField({
  seed: 205,
  amp: 2.2,
  scale: 95,
  flats: [[0, 0, 7.2, BERM_Y]],
  add: (x, z) => {
    const padMound = 0.65 * Math.exp(-(x * x + z * z) / 140);
    const r = Math.hypot(x + 4, z + 3);
    const angleMask = x < 8 && z < 6 ? 1 : 0.2;
    const backstopBerm = 4.8 * angleMask * Math.exp(-Math.pow((r - 22) / 5.2, 2));
    const farHills = 16.0 * Math.exp(-Math.pow((z + 88) / 26, 2)) * (0.75 + 0.25 * Math.cos(x * 0.04));
    return padMound + backstopBerm + farHills;
  },
});

const avoidTargetPad = (x: number, z: number) => Math.hypot(x, z) < 12.5;

/** Công sự bao cát & cọc mốc bia mục tiêu quanh ụ cát đặt T-72 trên trường bắn */
const ProvingTargetEmplacement: React.FC = () => {
  const sandbagMat = plain('#b99d73', 0.92, 0.02);
  const sandbagDark = plain('#9e835c', 0.94, 0.02);
  const orangeMat = plain('#dc5822', 0.52, 0.14);
  const whiteMat = plain('#ebe4d4', 0.55, 0.1);
  const steelMat = plain('#394048', 0.5, 0.6);

  const bagAngles = Array.from({ length: 14 }, (_, i) => -2.55 + i * 0.22);

  return (
    <group>
      {bagAngles.map((a, idx) => {
        const rad = 5.4;
        const bx = Math.cos(a) * rad;
        const bz = Math.sin(a) * rad;
        const by = H_TARGET_RANGE(bx, bz);
        return (
          <group key={idx} position={[bx, by, bz]} rotation={[0, -a + Math.PI / 2, 0]}>
            <mesh position={[0, 0.13, 0]} geometry={rbox(0.82, 0.24, 0.44, 0.08)} material={sandbagMat} castShadow receiveShadow />
            <mesh position={[0.22, 0.34, 0.02]} geometry={rbox(0.76, 0.22, 0.42, 0.08)} material={sandbagDark} castShadow receiveShadow />
            {idx % 2 === 0 && (
              <mesh position={[-0.12, 0.53, -0.01]} geometry={rbox(0.72, 0.21, 0.4, 0.08)} material={sandbagMat} castShadow />
            )}
          </group>
        );
      })}

      {[
        [6.4, 4.6],
        [-6.6, -4.4],
        [6.2, -5.2],
        [-5.8, 5.4],
      ].map(([px, pz], i) => {
        const py = H_TARGET_RANGE(px, pz);
        return (
          <group key={i} position={[px, py, pz]}>
            <mesh position={[0, 0.15, 0]} geometry={rbox(0.42, 0.3, 0.42, 0.03)} material={steelMat} castShadow />
            <mesh position={[0, 0.85, 0]} geometry={rbox(0.12, 1.1, 0.12, 0.015)} material={whiteMat} castShadow />
            <mesh position={[0, 1.65, 0]} geometry={rbox(0.125, 0.55, 0.125, 0.015)} material={orangeMat} castShadow />
            <mesh position={[0, 2.15, 0]} geometry={rbox(0.52, 0.38, 0.05, 0.01)} material={orangeMat} castShadow />
          </group>
        );
      })}
    </group>
  );
};

/** Một cụm hạt cầu lửa / khói mềm tự nhiên (tuyệt đối không dùng hình nón tam giác cứng) */
const FireSprite: React.FC<{
  pos: V3;
  size: number;
  color: string;
  opacity: number;
  rot?: number;
  additive?: boolean;
}> = ({ pos, size, color, opacity, rot = 0, additive = false }) => {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
        toneMapped: !additive,
        blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      }),
    [additive],
  );
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  if (opacity <= 0.004 || size <= 0.01) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/** Lỗ xuyên thép nóng chảy đỏ rực trên sườn phải vòm tháp pháo đúc T-72 */
const MoltenBreachHole: React.FC<{ t: number; pierceAt: number }> = ({ t, pierceAt }) => {
  const dt = t - pierceAt;
  if (dt < -0.01) return null;
  const appear = Math.min(1, Math.max(0, (dt + 0.02) / 0.08));
  const pulse = 0.88 + 0.12 * Math.sin(dt * 18);

  return (
    <group
      position={[IMPACT_POS[0], IMPACT_POS[1], IMPACT_POS[2] + 0.03]}
      rotation={[-0.28, 0.12, 0]}
      scale={appear}
    >
      <mesh>
        <ringGeometry args={[0.11, 0.32, 28]} />
        <meshStandardMaterial color="#151210" roughness={0.95} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 0, 0.015]}>
        <torusGeometry args={[0.098, 0.035, 12, 28]} />
        <meshStandardMaterial
          color="#ff6a18"
          emissive="#ff4d00"
          emissiveIntensity={4.2 * pulse}
          roughness={0.3}
        />
      </mesh>
      <mesh position={[0, 0, 0.022]}>
        <circleGeometry args={[0.075, 24]} />
        <meshBasicMaterial color="#fff6c4" toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      <FireSprite
        pos={[0, 0, 0.08]}
        size={0.52 * pulse}
        color="#ff9428"
        opacity={0.75}
        additive
      />
    </group>
  );
};

/** Bụi vảy Uranium pyrophoric siêu nhiệt & cơn bão lửa cuồn cuộn 3,000°F phụt trào qua khe cửa nóc & cổ tháp T-72 */
const PyrophoricFirestormFX: React.FC<{ t: number }> = ({ t }) => {
  const pierceAt = CUE.c02_s05_pierce_cabin;
  const igniteAt = CUE.c02_s05_firestorm_ignite;
  const dtPierce = t - pierceAt;
  const dtIgnite = t - igniteAt;

  // Quầng sáng tiền kích nổ âm ỉ trong khoang xe khi vảy DU siêu nhiệt (superheated shavings@248.88) bắt không khí
  const preGlow = prog(t, pierceAt + 0.1, igniteAt);
  const fireLevel =
    dtIgnite < 0
      ? 0
      : Math.min(1, dtIgnite / 0.2) * (0.9 + 0.1 * Math.sin(dtIgnite * 16));

  const cmdHatchPos: V3 = [-0.01, BERM_Y + 2.24, 0.42];
  const gnrHatchPos: V3 = [-0.23, BERM_Y + 2.24, -0.51];
  const muzzlePos: V3 = [
    0.18 + 5.39 * Math.cos(TURRET_YAW),
    BERM_Y + 1.76,
    -5.39 * Math.sin(TURRET_YAW),
  ];
  const muzzleDir: V3 = [Math.cos(TURRET_YAW), GUN_PITCH, -Math.sin(TURRET_YAW)];

  return (
    <group>
      {/* Ánh lửa bên trong khoang tháp hắt qua các khe cửa ngay từ lúc vảy DU bắn vào khoang */}
      {preGlow > 0.02 && dtIgnite < 0 && (
        <>
          <pointLight
            color="#ff8c2e"
            intensity={85 * preGlow}
            distance={8}
            decay={1.6}
            position={[0.18, BERM_Y + 2.45, 0.3]}
          />
          <FireSprite
            pos={[cmdHatchPos[0], cmdHatchPos[1] + 0.12, cmdHatchPos[2]]}
            size={0.55 * preGlow}
            color="#ff9c38"
            opacity={0.55 * preGlow}
            additive
          />
        </>
      )}

      {/* 1. Chùm vảy mảnh Uranium siêu nhiệt (superheated shavings) bắn tung từ lỗ xuyên & khe nắp */}
      {dtPierce >= 0 &&
        dtPierce < 6.8 &&
        Array.from({ length: 42 }, (_, i) => {
          const cycleDur = 0.75 + rnd(i + 11) * 0.6;
          const localAge = (dtPierce + rnd(i + 23) * 0.5) % cycleDur;
          if (dtPierce < rnd(i + 23) * 0.2) return null;

          const fromHatch = dtIgnite > -0.15 && i % 2 === 0;
          const origin: V3 = fromHatch
            ? i % 4 === 0
              ? cmdHatchPos
              : gnrHatchPos
            : [IMPACT_POS[0], IMPACT_POS[1], IMPACT_POS[2] + 0.06];

          const az = rnd(i + 41) * Math.PI * 2;
          const spd = fromHatch ? 3.5 + rnd(i + 53) * 4.5 : 2.6 + rnd(i + 53) * 3.8;
          const vx = fromHatch
            ? Math.cos(az) * spd * 0.44
            : (0.2 + (rnd(i + 61) - 0.5) * 0.85) * spd;
          const vy = fromHatch
            ? (1.0 + rnd(i + 71) * 0.9) * spd
            : (0.35 + rnd(i + 71) * 0.75) * spd;
          const vz = fromHatch
            ? Math.sin(az) * spd * 0.44
            : (0.7 + rnd(i + 83) * 0.65) * spd;

          const px = origin[0] + vx * localAge;
          const py = origin[1] + vy * localAge - 4.2 * localAge * localAge;
          const pz = origin[2] + vz * localAge;
          if (py < BERM_Y + 0.1) return null;

          const isVioletShaving = dtIgnite < 0 && i % 3 === 0;
          const fade = 1 - localAge / cycleDur;

          return (
            <mesh
              key={i}
              position={[px, py, pz]}
              rotation={[localAge * 14 + i, localAge * 10, i]}
            >
              <boxGeometry args={[0.085, 0.03, 0.036]} />
              <meshBasicMaterial
                color={isVioletShaving ? '#e2cfff' : '#fff3b0'}
                transparent
                opacity={fade}
                toneMapped={false}
              />
            </mesh>
          );
        })}

      {/* 2. Cơn bão lửa cuồn cuộn hữu cơ 3,000°F (sprite cầu lửa + cột khói đen dầu cháy, không dùng hình nón cứng!) */}
      {fireLevel > 0.01 && (
        <group>
          <pointLight
            color="#ff8a1e"
            intensity={340 * fireLevel}
            distance={18}
            decay={1.5}
            position={[0.18, BERM_Y + 2.9, 0.35]}
          />

          {/* Vòng lửa rực sáng rò qua khe cổ tháp pháo 360° (tháp pháo vẫn giữ nguyên trên thân!) */}
          <mesh position={[0.18, BERM_Y + 1.53, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.11, 0.055 * fireLevel, 10, 44]} />
            <meshBasicMaterial
              color="#ffb444"
              transparent
              opacity={0.9 * fireLevel}
              toneMapped={false}
            />
          </mesh>
          {Array.from({ length: 10 }, (_, ri) => {
            const ang = (ri / 10) * Math.PI * 2 + t * 0.6;
            const pulse = 0.7 + 0.3 * Math.sin(t * 14 + ri * 2.1);
            return (
              <FireSprite
                key={`ring_${ri}`}
                pos={[
                  0.18 + Math.cos(ang) * 1.18,
                  BERM_Y + 1.58 + pulse * 0.08,
                  Math.sin(ang) * 1.18,
                ]}
                size={0.52 * fireLevel * pulse}
                color={ri % 2 === 0 ? '#ff7c1c' : '#ffd26e'}
                opacity={0.62 * fireLevel}
                rot={t * 2 + ri}
                additive
              />
            );
          })}

          {/* Hai cột lửa bão nhiệt cuồn cuộn phụt thẳng từ cửa trưởng xe & cửa pháo thủ + cột khói đen bốc cao */}
          {[
            { origin: cmdHatchPos, height: 3.1, spread: 0.32, scale: 1.0, seed: 10 },
            { origin: gnrHatchPos, height: 2.5, spread: 0.28, scale: 0.85, seed: 40 },
          ].map((plume, pi) => (
            <React.Fragment key={pi}>
              {/* Luồng cầu lửa lõi trắng-vàng -> cam hổ phách */}
              {Array.from({ length: 14 }, (_, k) => {
                const cycle = (dtIgnite * 1.65 + k / 14) % 1;
                if (dtIgnite < (k / 14) * 0.22) return null;
                const yUp = cycle * plume.height * fireLevel;
                const wobbleX = Math.sin(cycle * 7 + k + plume.seed) * plume.spread * cycle;
                const wobbleZ = Math.cos(cycle * 6 + k * 1.7 + plume.seed) * plume.spread * cycle;
                const col =
                  cycle < 0.28
                    ? mix('#fff8d4', '#ffd166', cycle / 0.28)
                    : cycle < 0.68
                      ? mix('#ffd166', '#ff6414', (cycle - 0.28) / 0.4)
                      : mix('#ff6414', '#b82908', (cycle - 0.68) / 0.32);
                const sz =
                  plume.scale *
                  (0.62 + Math.sin(cycle * Math.PI) * 0.78) *
                  fireLevel;
                const op = (1 - Math.pow(cycle, 1.5)) * 0.88 * fireLevel;
                return (
                  <FireSprite
                    key={`f_${k}`}
                    pos={[
                      plume.origin[0] + wobbleX,
                      plume.origin[1] + 0.08 + yUp,
                      plume.origin[2] + wobbleZ,
                    ]}
                    size={sz}
                    color={col}
                    opacity={op}
                    rot={t * 2.4 + k}
                    additive={cycle < 0.72}
                  />
                );
              })}

              {/* Cột khói đen đặc bốc nối tiếp phía trên ngọn lửa mà không che mất thân xe bên dưới */}
              {Array.from({ length: 9 }, (_, sk) => {
                const sCycle = (dtIgnite * 0.55 + sk / 9) % 1;
                if (dtIgnite < 0.25 + sk * 0.08) return null;
                const ySmoke = plume.height * 0.68 + sCycle * 3.8;
                const driftX = -sCycle * 0.85 + (rnd(sk + plume.seed) - 0.5) * 0.7;
                const driftZ = (rnd(sk + plume.seed + 9) - 0.5) * 0.75;
                return (
                  <FireSprite
                    key={`s_${sk}`}
                    pos={[
                      plume.origin[0] + driftX,
                      plume.origin[1] + ySmoke,
                      plume.origin[2] + driftZ,
                    ]}
                    size={(1.15 + sCycle * 1.65) * plume.scale}
                    color={mix('#26201d', '#4f463f', sCycle)}
                    opacity={(1 - sCycle) * 0.68 * fireLevel}
                    rot={sk * 1.3 + t * 0.5}
                  />
                );
              })}
            </React.Fragment>
          ))}

          {/* Luồng lửa phụt ngang từ lỗ xuyên sườn phải vòm tháp pháo */}
          {Array.from({ length: 7 }, (_, bk) => {
            const c = (dtIgnite * 2.2 + bk / 7) % 1;
            const dist = c * 1.45 * fireLevel;
            return (
              <FireSprite
                key={`br_${bk}`}
                pos={[
                  IMPACT_POS[0] + dist * 0.22,
                  IMPACT_POS[1] + dist * 0.28 + c * c * 0.25,
                  IMPACT_POS[2] + 0.05 + dist * 0.94,
                ]}
                size={(0.36 + Math.sin(c * Math.PI) * 0.34) * fireLevel}
                color={c < 0.38 ? '#fff2b0' : '#ff6a14'}
                opacity={(1 - c) * 0.85 * fireLevel}
                rot={t * 3 + bk}
                additive
              />
            );
          })}

          {/* Tia lửa áp suất phụt ra từ đầu miệng nòng pháo 125mm 2A46 */}
          {Array.from({ length: 6 }, (_, mk) => {
            const c = (dtIgnite * 2.4 + mk / 6) % 1;
            const dist = c * 1.6 * fireLevel;
            return (
              <FireSprite
                key={`mz_${mk}`}
                pos={[
                  muzzlePos[0] + muzzleDir[0] * dist,
                  muzzlePos[1] + muzzleDir[1] * dist + c * 0.12,
                  muzzlePos[2] + muzzleDir[2] * dist,
                ]}
                size={(0.28 + c * 0.35) * fireLevel}
                color={c < 0.35 ? '#ffeaa0' : '#ff7318'}
                opacity={(1 - c) * 0.78 * fireLevel}
                rot={t * 2.5 + mk}
                additive
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

const C02S05: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const pierceAt = CUE.c02_s05_pierce_cabin; // 247.18s
  const igniteAt = CUE.c02_s05_firestorm_ignite; // 249.84s

  // 1. Mũi lao DU kéo vệt <Trail> xuất hiện rõ ngay từ đầu cảnh ở góc phải trên, đâm xuyên sườn phải vòm tháp pháo T-72 tại 247.18s
  const flightP = prog(t, 243.4, pierceAt, (x) => x);
  const dartPos: V3 = [
    lerp(DART_START[0], IMPACT_POS[0], flightP),
    lerp(DART_START[1], IMPACT_POS[1], flightP),
    lerp(DART_START[2], IMPACT_POS[2], flightP),
  ];
  const dartVisible = t < pierceAt + 0.03;

  // Vệt sáng <Trail> nổi bật (góc lệch với camera ~48° > 35°), luôn có đuôi kéo dài từ xa phía sau đạn để thấy rõ ngay khung đầu
  const trailKey = Math.round(flightP * 120);
  const trailPts = useMemo<V3[]>(() => {
    const steps = 24;
    const headX = dartPos[0];
    const headY = dartPos[1];
    const headZ = dartPos[2];
    const tailLen = 8.5;
    const tailStart: V3 = [
      headX - DART_DIR[0] * tailLen,
      headY - DART_DIR[1] * tailLen,
      headZ - DART_DIR[2] * tailLen,
    ];
    return Array.from({ length: steps }, (_, i) => {
      const u = i / (steps - 1);
      return [
        lerp(tailStart[0], headX, u),
        lerp(tailStart[1], headY, u),
        lerp(tailStart[2], headZ, u),
      ];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailKey]);
  const trailFade = 1 - prog(t, pierceAt, pierceAt + 0.85);

  // 2. Độ hư hại cháy xém sơn của T-72 tăng mượt 0 -> 1 khi bão lửa pyrophoric 3,000°F bùng phát (giữ turretPopHeight=0!)
  const damaged = prog(t, igniteAt - 0.05, 252.5);

  // 3. Camera góc trung cận 3/4 sườn-đuôi mục tiêu EnemyT72:
  // Đầu cảnh hướng tiêu cự hơi mở sang phải (+X,+Z) để bắt trọn mũi lao DU và vệt <Trail>, sau đó khóa sát vào tháp pháo T-72 rực lửa
  const orbitP = prog(t, 243.6, 254.2);
  const hitPushP = prog(t, pierceAt - 0.25, igniteAt + 1.0);
  const jolt =
    bump(t, pierceAt, 0.25) * 0.09 + bump(t, igniteAt, 0.45) * 0.16;

  const camPos: V3 = [
    lerp(-6.35, -4.95, orbitP) + Math.sin(t * 42) * jolt,
    lerp(3.48, 3.88, orbitP) + Math.cos(t * 37) * jolt * 0.7,
    lerp(6.2, 6.85, orbitP) - hitPushP * 0.35,
  ];
  const camLook: V3 = [
    lerp(1.15, 0.12, hitPushP),
    lerp(2.3, 2.52, prog(t, igniteAt - 0.2, 252.5)),
    lerp(0.95, 0.12, hitPushP),
  ];
  const fov = lerp(39, 35.5, hitPushP);

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_PROVING_NOON.stage}
        shadowCenter={[0.2, 1.6, 0.2]}
        shadowArea={18}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        <Terrain
          h={H_TARGET_RANGE}
          size={420}
          seg={220}
          center={[0, -12]}
          colors={LOOK_PROVING_NOON.terrain}
          grainRepeat={42}
        />
        <Scatter
          kind="rock"
          count={110}
          area={[-80, -85, 85, 60]}
          h={H_TARGET_RANGE}
          seed={53}
          scale={[0.55, 1.4]}
          avoid={avoidTargetPad}
          tint={LOOK_PROVING_NOON.scatterTint}
        />
        <Scatter
          kind="bush"
          count={75}
          area={[-75, -75, 80, 55]}
          h={H_TARGET_RANGE}
          seed={67}
          scale={[0.55, 1.15]}
          avoid={avoidTargetPad}
          tint="#baa476"
        />
        <ProvingTargetEmplacement />

        {/* Xe tăng mục tiêu T-72 đặt trên ụ cát (turretPopHeight=0 để dành cảnh bay tháp pháo 100 ft cho C03) */}
        <EnemyT72
          position={[0, BERM_Y, 0]}
          turretYaw={TURRET_YAW}
          gunPitch={GUN_PITCH}
          damaged={damaged}
          turretPopHeight={0}
          travel={0}
        />

        {/* Mũi lao Uranium nghèo kéo vệt <Trail> sáng rực đâm xuyên sườn phải vòm tháp pháo T-72 */}
        {trailFade > 0.01 && (
          <>
            <Trail
              points={trailPts}
              upto={1}
              color={PAL.amberHot}
              width={0.055}
              opacity={0.95 * trailFade}
              glow
            />
            <Trail
              points={trailPts}
              upto={1}
              color={PAL.amber}
              width={0.16}
              opacity={0.42 * trailFade}
              glow
            />
          </>
        )}

        {dartVisible && (
          <Ammo120mm3D
            kind="du_dart"
            scale={1.65}
            position={dartPos}
            rotation={[t * 4.5, DART_ROT_Y, DART_ROT_Z]}
          />
        )}

        {/* Lỗ xuyên nóng chảy đỏ rực trên sườn tháp pháo đúc & chớp xuyên vỏ tại pierces@247.18 */}
        <MoltenBreachHole t={t} pierceAt={pierceAt} />
        <Explosion
          t={t}
          at={pierceAt - 0.01}
          pos={[IMPACT_POS[0] + 0.1, IMPACT_POS[1], IMPACT_POS[2] + 0.14]}
          size={1.05}
          seed={19}
          smokeLife={2.8}
          smoke="#5c534a"
        />

        {/* Vụ nổ kích hoạt bão lửa pyrophoric ngay tâm nóc khoang tháp tại ignite@249.84 (đặt cao ở y=BERM_Y+2.25 để vòng bụi không làm mờ đục thân xe!) */}
        <Explosion
          t={t}
          at={igniteAt - 0.01}
          pos={[0.1, BERM_Y + 2.25, 0.08]}
          size={1.95}
          seed={27}
          smokeLife={5.0}
          smoke="#332c27"
        />
        <PyrophoricFirestormFX t={t} />
      </Stage>

      {/* Nhãn nhiệt độ đỉnh điểm 3,000°F đúng mốc 251.96..253.95s */}
      <Label
        t={t}
        text="3,000°F"
        x={W * 0.22}
        y={H * 0.17}
        from={CUE.c02_s05_temp_3000f}
        until={253.95}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C02S05;
