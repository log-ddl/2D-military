import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Explosion, MuzzleBlast, Trail, ballistic, ballisticPoints, softDot } from '@skill/military/3d/fx';
import { extrude, lathe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_PROVING_NOON } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';

// ---------------- Địa hình trường bắn thử nghiệm đạn đạo (tạo 1 lần cấp module) ----------------
const PROVING_H = heightField({
  seed: 206,
  amp: 4.5,
  scale: 135,
  flats: [
    [0, 0, 18, 0],
    [36, 2, 26, 0],
    [64, 1, 28, 0],
  ],
  add: (x, z) => {
    const sideBerm =
      Math.exp(-(((Math.abs(z) - 31) / 7.5) ** 2)) * (5.2 + 1.4 * Math.sin(x * 0.045));
    const backStop = x > 92 ? Math.min(16, ((x - 92) / 18) ** 1.45 * 8.5) : 0;
    return sideBerm + backStop;
  },
});

const avoidRangeLane = (x: number, z: number) => x > -18 && x < 94 && Math.abs(z) < 23;

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

// Biên dạng tiện 1:1 (mét) của đầu đạn đa năng M1147 AMP sau khi rời nòng (dài 0.66 m, đường kính 0.120 m)
const M1147_PROJECTILE_BODY: P2[] = [
  [0.001, -0.24],
  [0.036, -0.24],
  [0.044, -0.15],
  [0.058, -0.08],
  [0.06, 0.14],
  [0.053, 0.23],
  [0.038, 0.31],
  [0.025, 0.36],
  [0.001, 0.36],
];

const M1147_PROJECTILE_FUZE: P2[] = [
  [0.0255, 0.358],
  [0.02, 0.388],
  [0.01, 0.414],
  [0.004, 0.422],
  [0.001, 0.422],
];

const M1147_TAIL_FIN: P2[] = [
  [-0.238, 0.034],
  [-0.135, 0.038],
  [-0.185, 0.078],
  [-0.236, 0.078],
];

type RangeTargetSpec = {
  x: number;
  z: number;
  w: number;
  h: number;
  color: string;
  seed: number;
};

const CANISTER_TARGETS: RangeTargetSpec[] = (() => {
  const rows = [
    { x: 18, count: 4, spread: 4.0 },
    { x: 26, count: 5, spread: 6.2 },
    { x: 35, count: 6, spread: 8.4 },
    { x: 46, count: 6, spread: 10.6 },
    { x: 58, count: 7, spread: 12.8 },
  ];
  const list: RangeTargetSpec[] = [];
  let idx = 1;
  for (const r of rows) {
    for (let i = 0; i < r.count; i++) {
      const frac = r.count === 1 ? 0 : i / (r.count - 1) - 0.5;
      const jitterX = (rnd(idx * 13) - 0.5) * 2.2;
      const jitterZ = (rnd(idx * 29) - 0.5) * 1.0;
      const isHeavyPlate = i % 3 === 1;
      list.push({
        x: r.x + jitterX,
        z: frac * 2 * r.spread + jitterZ,
        w: isHeavyPlate ? 1.18 : 0.76,
        h: isHeavyPlate ? 1.6 : 1.76,
        color: idx % 2 === 0 ? '#d96b27' : '#4f5f43',
        seed: idx,
      });
      idx++;
    }
  }
  return list;
})();

const TUNGSTEN_PELLETS = Array.from({ length: 340 }, (_, i) => {
  const rad = Math.sqrt(rnd(i * 17 + 3));
  const ang = rnd(i * 31 + 7) * Math.PI * 2;
  const lag = rnd(i * 47 + 11);
  return {
    yFactor: Math.sin(ang) * rad * 0.135,
    zFactor: Math.cos(ang) * rad * 0.24,
    lag,
    streak: 0.95 + rnd(i * 59 + 5) * 1.35,
    hot: rnd(i * 71 + 19) > 0.26,
  };
});

const AIRBURST_SHARDS = Array.from({ length: 112 }, (_, i) => {
  const rad = Math.sqrt(rnd(i * 23 + 9));
  const ang = rnd(i * 41 + 13) * Math.PI * 2;
  return {
    dx: Math.cos(ang) * rad * 0.95,
    dz: Math.sin(ang) * rad * 0.95,
    dy: -(0.84 + rnd(i * 61 + 3) * 0.44),
    speed: 0.74 + rnd(i * 83 + 17) * 0.46,
  };
});

const PuffSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({
  pos,
  size,
  color,
  opacity,
  rot = 0,
}) => {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  if (opacity <= 0.004) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/** Đầu đạn thật M1147 AMP 120mm có cánh đuôi ổn định đang bay dọc quỹ đạo đạn đạo (tỉ lệ mét thật ~0.66 m) */
const FlyingM1147Projectile: React.FC<{ pos: V3; nextPos: V3 }> = ({ pos, nextPos }) => {
  const geos = useMemo(
    () => ({
      body: lathe(M1147_PROJECTILE_BODY, 28),
      fuze: lathe(M1147_PROJECTILE_FUZE, 24),
      fin: extrude(M1147_TAIL_FIN, 0.006, 0.001),
    }),
    [],
  );

  const dir = new THREE.Vector3(
    nextPos[0] - pos[0],
    nextPos[1] - pos[1],
    nextPos[2] - pos[2],
  );
  if (dir.lengthSq() < 1e-6) dir.set(1, 0, 0);
  else dir.normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

  const bodyMat = plain('#2e3430', 0.42, 0.5);
  const fuzeMat = plain('#cad4de', 0.22, 0.88);
  const finMat = plain('#545d68', 0.35, 0.78);

  return (
    <group position={pos} quaternion={quat}>
      <mesh geometry={geos.body} material={bodyMat} castShadow />
      <mesh geometry={geos.fuze} material={fuzeMat} castShadow />
      {/* Đai đồng, vạch vàng & cam chuẩn nhận diện đạn M1147 AMP */}
      <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#d48b3b', 0.3, 0.82)}>
        <cylinderGeometry args={[0.0605, 0.0605, 0.024, 24]} />
      </mesh>
      <mesh position={[0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#eab634', 0.42, 0.16)}>
        <cylinderGeometry args={[0.0604, 0.0604, 0.03, 24]} />
      </mesh>
      <mesh position={[0.135, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#d95326', 0.45, 0.16)}>
        <cylinderGeometry args={[0.059, 0.06, 0.016, 24]} />
      </mesh>
      {/* 6 cánh đuôi ổn định */}
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} rotation={[(i * Math.PI) / 3, 0, 0]} geometry={geos.fin} material={finMat} />
      ))}
      {/* Đốm lửa vạch đường nhỏ ở đáy đạn (bằng sprite hữu cơ softDot, không dùng cầu trong suốt) */}
      <PuffSprite pos={[-0.26, 0, 0]} size={0.34} color="#ffe48f" opacity={0.85} />
    </group>
  );
};

/** Giá trưng bày 4 loại đạn chuyên dụng 120mm đặt chếch ngang trước đầu xe Abrams */
const OrdnanceDisplayRack: React.FC<{ t: number }> = ({ t }) => {
  const heroLift = prog(t, CUE.c02_s06_m1028_canister - 0.35, CUE.c02_s06_m1028_canister + 0.55);
  const heroSpin = (t - 254.2) * 0.6;
  const steelFrame = plain('#2a313a', 0.52, 0.58);
  const brassTrim = plain('#c99e46', 0.3, 0.82);
  const trayMat = plain('#1c222a', 0.65, 0.4);
  const tungstenBallMat = plain('#b6c2d1', 0.16, 0.95);

  return (
    <group position={[4.85, 0, 2.55]} rotation={[0, 0.78, 0]}>
      <mesh position={[0, 0.03, 0]} geometry={rbox(1.62, 0.06, 1.08, 0.015)} material={steelFrame} receiveShadow />
      {[
        [-0.72, -0.46],
        [0.72, -0.46],
        [-0.72, 0.46],
        [0.72, 0.46],
      ].map(([lx, lz], idx) => (
        <mesh
          key={idx}
          position={[lx, 0.44, lz]}
          geometry={rbox(0.06, 0.84, 0.06, 0.01)}
          material={steelFrame}
          castShadow
        />
      ))}
      <mesh position={[0, 0.86, 0]} geometry={rbox(1.6, 0.055, 1.06, 0.015)} material={trayMat} castShadow receiveShadow />

      <Ammo120mm3D kind="m829a4_cartridge" scale={0.96} position={[-0.08, 0.97, -0.35]} />
      <Ammo120mm3D kind="m1147_amp" scale={0.96} position={[-0.08, 0.97, -0.14]} />
      <Ammo120mm3D kind="m829a4_cartridge" scale={0.96} position={[-0.08, 0.97, 0.07]} rotation={[1.4, 0, 0]} />

      <group position={[-0.06, 0.91 + heroLift * 0.14, 0.31]}>
        {[-0.26, 0.18].map((cx, ci) => (
          <group key={ci} position={[cx, 0, 0]}>
            <mesh position={[0, 0.06, 0]} geometry={rbox(0.035, 0.12, 0.05, 0.008)} material={brassTrim} />
            <mesh position={[0, 0.13, 0]} rotation={[0, Math.PI / 2, Math.PI]} material={brassTrim}>
              <torusGeometry args={[0.078, 0.01, 8, 20, Math.PI]} />
            </mesh>
          </group>
        ))}
        <Ammo120mm3D
          kind="m1028_canister"
          scale={1.18}
          position={[0, 0.14, 0]}
          rotation={[heroSpin, 0, 0]}
        />
      </group>

      <group position={[0.6, 0.905, 0.31]}>
        <mesh geometry={rbox(0.25, 0.026, 0.25, 0.008)} material={brassTrim} castShadow />
        <mesh position={[0, 0.012, 0]} geometry={rbox(0.21, 0.016, 0.21, 0.004)} material={trayMat} />
        {Array.from({ length: 25 }, (_, bi) => {
          const r = Math.floor(bi / 5) - 2;
          const c = (bi % 5) - 2;
          return (
            <mesh key={bi} position={[r * 0.036, 0.033, c * 0.036]} material={tungstenBallMat} castShadow>
              <sphereGeometry args={[0.0155, 12, 10]} />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

/** Chùm nón 1,100 viên bi Tungsten đặc phun từ đầu nòng M256 quét rạp dãy bia 500 thước */
const CanisterShotgunField: React.FC<{ t: number }> = ({ t }) => {
  const dt = t - CUE.c02_s06_canister_blast;
  const sweepP = prog(t, CUE.c02_s06_canister_blast, CUE.c02_s06_canister_blast + 3.65, (x) => 1 - (1 - x) ** 1.65);
  const frontX = lerp(6.0, 74.0, sweepP);
  const swarmActive = dt > 0 && dt < 4.15;

  const postMat = plain('#3a352f', 0.82, 0.22);
  const baseMat = plain('#57524a', 0.86, 0.15);
  const canisterGreen = plain('#394d33', 0.52, 0.26);
  const tungstenHotMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe8a3',
        toneMapped: false,
      }),
    [],
  );
  const tungstenSteelMat = plain('#d4deeb', 0.16, 0.94, {
    emissive: '#ffb347',
    emissiveIntensity: 0.65,
  });

  return (
    <group>
      {[18, 34, 50, 68].map((mx, mi) => (
        <group key={mi} position={[mx, PROVING_H(mx, 14.2), 14.2]}>
          <mesh position={[0, 0.75, 0]} geometry={rbox(0.12, 1.5, 0.12, 0.01)} material={postMat} castShadow />
          <mesh position={[0, 1.32, 0]} geometry={rbox(0.14, 0.54, 1.2, 0.02)} material={plain('#efe3cc', 0.7, 0.05)} castShadow />
          <mesh position={[-0.02, 1.32, 0]} geometry={rbox(0.15, 0.15, 0.96, 0.01)} material={plain('#c94a29', 0.6, 0.1)} />
        </group>
      ))}

      {CANISTER_TARGETS.map((tg, idx) => {
        const hitTime = CUE.c02_s06_canister_blast + ((tg.x - 6.0) / 68.0) * 3.05;
        const fallP = prog(t, hitTime, hitTime + 0.34, (x) => 1 - (1 - x) ** 2.4);
        const hitDt = t - hitTime;
        const groundY = PROVING_H(tg.x, tg.z);
        return (
          <group key={idx} position={[tg.x, groundY, tg.z]}>
            <mesh position={[0, 0.08, 0]} geometry={rbox(0.55, 0.16, 0.65, 0.02)} material={baseMat} receiveShadow />
            <group position={[0, 0.14, 0]} rotation={[0, 0, -fallP * 1.44]}>
              <mesh position={[0, tg.h * 0.5, 0]} geometry={rbox(0.09, tg.h, tg.w, 0.015)} material={plain(tg.color, 0.62, 0.2)} castShadow receiveShadow />
              <mesh position={[-0.05, tg.h * 0.64, 0]} geometry={rbox(0.02, tg.h * 0.36, tg.w * 0.48, 0.005)} material={plain('#f5ecda', 0.7, 0.05)} />
            </group>

            {hitDt > 0 && hitDt < 0.48 && (
              <PuffSprite
                pos={[-0.1, 0.95 * (1 - fallP * 0.5), 0]}
                size={0.75 + (1 - hitDt / 0.48) * 0.85}
                color="#ffe799"
                opacity={0.9 * (1 - hitDt / 0.48)}
                rot={tg.seed}
              />
            )}
            {hitDt > 0 && hitDt < 2.3 && (
              <PuffSprite
                pos={[0.4 + hitDt * 0.9, 0.55 + hitDt * 0.55, 0]}
                size={1.35 + hitDt * 1.45}
                color="#cbb58d"
                opacity={0.64 * (1 - hitDt / 2.3)}
                rot={tg.seed}
              />
            )}
          </group>
        );
      })}

      {/* 4 mảnh vỏ xanh đạn ghém M1028 tách bung ngay ngoài đầu nòng */}
      {dt > 0 && dt < 1.45 && (
        <group position={[6.2 + dt * 5.8, 1.93, 0]}>
          {[0, 1, 2, 3].map((pi) => {
            const a = (pi * Math.PI) / 2 + Math.PI / 4;
            const spread = 0.18 + dt * 1.4;
            return (
              <mesh
                key={pi}
                position={[0, Math.sin(a) * spread, Math.cos(a) * spread]}
                rotation={[dt * 3.5, -Math.cos(a) * dt * 2.2, Math.sin(a) * dt * 2.2]}
                geometry={rbox(0.42, 0.045, 0.1, 0.008)}
                material={canisterGreen}
              />
            );
          })}
        </group>
      )}

      {/* Đám mây 340 viên bi Tungsten kim loại đặc kèm tia vạch đường tạo thành hình nón tự nhiên */}
      {swarmActive && (
        <group>
          {TUNGSTEN_PELLETS.map((p, i) => {
            const cloudDepth = Math.min(28, Math.max(4.0, (frontX - 5.8) * 0.72));
            const px = frontX - p.lag * cloudDepth;
            if (px < 5.85) return null;
            const distFromMuzzle = px - 5.72;
            const py = 1.93 + distFromMuzzle * 0.012 + distFromMuzzle * p.yFactor - 0.00024 * distFromMuzzle * distFromMuzzle;
            const pz = distFromMuzzle * p.zFactor;
            if (py < 0.12) return null;
            return (
              <group key={i} position={[px, py, pz]}>
                <mesh material={tungstenSteelMat}>
                  <sphereGeometry args={[0.075, 7, 6]} />
                </mesh>
                {p.hot && (
                  <mesh position={[-0.7 * p.streak, 0, 0]} scale={[1.4 * p.streak, 0.04, 0.04]} material={tungstenHotMat}>
                    <boxGeometry args={[1, 1, 1]} />
                  </mesh>
                )}
              </group>
            );
          })}
        </group>
      )}
    </group>
  );
};

/** Nhịp 2 (268.85–276.60 s): Khoang cắt bổ cận cảnh buồng đạn M256, vòng đồng đế đạn M1147 AMP & kim khoá nòng */
const CutawayAmpBreechRig: React.FC<{ t: number }> = ({ t }) => {
  const pinContact = prog(t, CUE.c02_s06_talk_breech_pins - 0.18, CUE.c02_s06_talk_breech_pins + 0.22);
  const talkActive = t >= CUE.c02_s06_talk_breech_pins && t < CUE.c02_s06_amp_launch + 0.15;
  const talkWave = talkActive ? 0.55 + 0.45 * Math.sin((t - CUE.c02_s06_talk_breech_pins) * 18) : 0;
  const signalTravel = prog(t, CUE.c02_s06_talk_breech_pins + 0.08, CUE.c02_s06_talk_breech_pins + 1.15);
  const launchP = prog(t, CUE.c02_s06_amp_launch, CUE.c02_s06_amp_launch + 0.52);
  const shellSlideX = prog(t, CUE.c02_s06_amp_launch + 0.12, CUE.c02_s06_amp_launch + 0.58) * 0.72;
  const ringShimmer = bump(t, CUE.c02_s06_base_rings - 0.2, 1.8);

  const darkArmor = paint({
    color: '#1b222c',
    camo: ['#151b23', '#252f3c'],
    camoScale: 1.5,
    wear: 0.22,
    dirt: 0.15,
    roughness: 0.56,
    metalness: 0.52,
    repeat: 0.8,
    seed: 61,
  });
  const chromeBore = plain('#aeb9c7', 0.22, 0.9);
  const breechSteel = plain('#39434f', 0.34, 0.82);
  const copperPinMat = plain('#f6c342', 0.16, 0.95, {
    emissive: '#ffaa2b',
    emissiveIntensity: 0.28 + talkWave * 1.45,
  });
  const insulatorMat = plain('#19303d', 0.45, 0.25);

  const ringXs = [-0.44, -0.419, -0.398] as const;

  return (
    <group position={[0, 28, 0]}>
      <pointLight position={[-0.5, 0.48, 0.75]} color="#fff3dc" intensity={3.5} distance={5.2} decay={1.35} />
      <pointLight position={[0.45, -0.22, 0.65]} color="#9ad8ff" intensity={1.6} distance={4.2} decay={1.45} />
      {talkActive && (
        <pointLight
          position={[-0.42, 0.12, 0.16]}
          color="#29e3d4"
          intensity={2.6 * talkWave}
          distance={2.0}
          decay={1.7}
        />
      )}

      <mesh position={[0.15, 0.02, -0.38]} geometry={rbox(3.2, 1.35, 0.14, 0.02)} material={darkArmor} receiveShadow />
      <mesh position={[0.15, -0.42, -0.02]} geometry={rbox(3.2, 0.12, 0.92, 0.02)} material={darkArmor} receiveShadow />
      <mesh position={[0.15, 0.46, -0.06]} geometry={rbox(3.2, 0.1, 0.84, 0.02)} material={darkArmor} />
      <mesh position={[0.92, 0.02, -0.05]} geometry={rbox(0.18, 0.96, 0.76, 0.02)} material={breechSteel} receiveShadow />

      <mesh
        position={[0.12, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        material={chromeBore}
        receiveShadow
      >
        <cylinderGeometry args={[0.084, 0.09, 1.48, 36, 1, true, Math.PI * 0.55, Math.PI * 1.05]} />
      </mesh>
      <mesh
        position={[0.12, 0, 0]}
        rotation={[0, 0, -Math.PI / 2]}
        material={breechSteel}
      >
        <cylinderGeometry args={[0.118, 0.126, 1.46, 36, 1, true, Math.PI * 0.58, Math.PI * 0.99]} />
      </mesh>

      <group position={[-0.585, 0, 0]}>
        <mesh position={[-0.08, 0, -0.06]} geometry={rbox(0.3, 0.62, 0.34, 0.018)} material={breechSteel} castShadow receiveShadow />
        <mesh
          position={[0.065 + prog(t, CUE.c02_s06_amp_launch - 0.04, CUE.c02_s06_amp_launch + 0.05) * 0.028, 0, 0]}
          rotation={[0, 0, Math.PI / 2]}
          material={plain('#dce4ee', 0.2, 0.92)}
        >
          <cylinderGeometry args={[0.007, 0.009, 0.06, 16]} />
        </mesh>
        {[0.048, -0.048].map((ry, ri) => (
          <mesh
            key={ri}
            position={[0.068 + pinContact * 0.022, ry, 0.005]}
            rotation={[0, 0, Math.PI / 2]}
            material={copperPinMat}
          >
            <cylinderGeometry args={[0.0055, 0.0065, 0.055, 14]} />
          </mesh>
        ))}
      </group>

      <group position={[-0.419, 0.132, 0.028]} rotation={[0.22, 0, 0]}>
        <mesh position={[0, 0.022, 0]} geometry={rbox(0.125, 0.05, 0.066, 0.008)} material={breechSteel} castShadow />
        <mesh position={[0, 0.002, 0]} geometry={rbox(0.098, 0.022, 0.048, 0.005)} material={insulatorMat} />
        <mesh position={[-0.08, 0.042, -0.01]} rotation={[0, 0, 0.45]} material={plain('#232a32', 0.7, 0.3)}>
          <cylinderGeometry args={[0.009, 0.009, 0.16, 12]} />
        </mesh>

        {[-0.021, 0, 0.021].map((dx, pi) => {
          const pinDrop = pinContact * 0.026;
          return (
            <group key={pi} position={[dx, -0.018 - pinDrop, 0]}>
              <mesh material={copperPinMat} castShadow>
                <cylinderGeometry args={[0.005, 0.004, 0.045, 14]} />
              </mesh>
              {talkActive && (
                <PuffSprite
                  pos={[0, -0.022, 0]}
                  size={0.042 + talkWave * 0.018}
                  color="#7cf2e8"
                  opacity={0.92}
                />
              )}
            </group>
          );
        })}
      </group>

      <group position={[shellSlideX, 0, 0]}>
        <Ammo120mm3D kind="m1147_amp" burnProgress={launchP * 0.88} />

        {(ringShimmer > 0.01 || talkActive) && (
          <group>
            {ringXs.map((rx, idx) => {
              const phasePulse = talkActive
                ? 0.48 + 0.52 * Math.sin((t - CUE.c02_s06_talk_breech_pins) * 20 - idx * 1.1)
                : ringShimmer * 0.65;
              const col = talkActive ? (idx === 1 ? PAL.amberHot : PAL.cyan) : PAL.amberHot;
              return (
                <mesh key={idx} position={[rx, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                  <torusGeometry args={[0.0754, 0.0038 + phasePulse * 0.0022, 10, 40]} />
                  <meshBasicMaterial color={col} transparent opacity={0.4 + phasePulse * 0.6} toneMapped={false} />
                </mesh>
              );
            })}
            <mesh position={[-0.4935, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.0485, 0.004, 10, 36]} />
              <meshBasicMaterial
                color={talkActive ? PAL.cyan : PAL.amberHot}
                transparent
                opacity={talkActive ? 0.88 : ringShimmer * 0.65}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}

        {signalTravel > 0.01 && launchP < 0.25 && (
          <group>
            <mesh
              position={[-0.42 + signalTravel * 0.435, 0.063, 0.016]}
              geometry={rbox(Math.max(0.02, signalTravel * 0.87), 0.006, 0.007, 0.001)}
            >
              <meshBasicMaterial color={PAL.cyan} transparent opacity={0.9} toneMapped={false} />
            </mesh>
            {signalTravel > 0.78 && (
              <mesh position={[0.432, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.029, 0.0055, 10, 32]} />
                <meshBasicMaterial color={PAL.amberHot} transparent opacity={0.7 + talkWave * 0.3} toneMapped={false} />
              </mesh>
            )}
          </group>
        )}
      </group>
    </group>
  );
};

/**
 * Nhịp 3 (276.60–283.76 s): Hành lang 3 mục tiêu bố trí lệch trục Z rõ rệt để KHÔNG bao giờ che khuất nhau:
 * - Mục tiêu 1 (Tường chắn chạm nổ): [37, 0, +6.5] (làn trước-trái)
 * - Mục tiêu 2 (Lô cốt bê tông xuyên trễ): [51, 0, -4.2] (làn giữa-sau bên trái màn hình)
 * - Mục tiêu 3 (Công sự tổ tên lửa ATGM Airburst): [64, 0, +4.5] (làn phải tiền cảnh thoáng 100%, không bị lô cốt che!)
 * Toàn bộ hiệu ứng nổ/lửa dùng <Explosion>, <MuzzleBlast> và hạt sprite softDot hữu cơ — không dùng khối cầu trong suốt.
 */
const ThreeModeTargetCorridor: React.FC<{ t: number }> = ({ t }) => {
  const concreteLight = paint({
    color: '#d8d0c1',
    camo: [],
    wear: 0.06,
    dirt: 0.14,
    roughness: 0.84,
    metalness: 0.04,
    repeat: 0.5,
    seed: 91,
  });
  const bunkerConcrete = paint({
    color: '#c4bcad',
    camo: [],
    wear: 0.08,
    dirt: 0.18,
    roughness: 0.86,
    metalness: 0.05,
    repeat: 0.45,
    seed: 103,
  });
  const bunkerInnerDark = plain('#1c1917', 0.92, 0.05);
  const sandbagMat = plain('#c2a97e', 0.9, 0.04);
  const orangeMark = plain('#e05a24', 0.6, 0.08);
  const rebarSteel = plain('#3f3b37', 0.6, 0.62);

  const shot1Fly = prog(t, 276.85, CUE.c02_s06_mode_contact, (x) => x);
  const shot2Fly = prog(t, 278.42, CUE.c02_s06_mode_delay, (x) => x);
  const shot3Fly = prog(t, 280.58, CUE.c02_s06_mode_airburst, (x) => x);

  const wallBroken = t >= CUE.c02_s06_mode_contact;
  const wallPostDt = t - CUE.c02_s06_mode_contact;

  const bunkerPierced = t >= CUE.c02_s06_mode_delay;
  const bunkerDelayP =
    t >= CUE.c02_s06_mode_delay && t < CUE.c02_s06_bunker_burst
      ? prog(t, CUE.c02_s06_mode_delay, CUE.c02_s06_bunker_burst)
      : 0;
  const bunkerBurstDt = t - CUE.c02_s06_bunker_burst;
  const bunkerHeave =
    bump(t, CUE.c02_s06_bunker_burst, 0.8) * 0.82 + (bunkerBurstDt >= 0.32 ? 0.38 : 0);

  const airburstDt = t - CUE.c02_s06_mode_airburst;
  const missileTeamDown = prog(t, CUE.c02_s06_mode_airburst + 0.14, CUE.c02_s06_mode_airburst + 0.65);

  const start1: V3 = [22, 2.35, 3.8];
  const end1: V3 = [36.3, 1.9, 6.5];
  const start2: V3 = [22, 2.35, -0.8];
  const end2: V3 = [47.8, 1.8, -4.2];
  const start3: V3 = [24, 2.6, 1.8];
  const end3: V3 = [64.0, 4.65, 4.5];

  const trail1Pts = useMemo(() => ballisticPoints(start1, end1, 0.45, 36), []);
  const trail2Pts = useMemo(() => ballisticPoints(start2, end2, 0.65, 40), []);
  const trail3Pts = useMemo(() => ballisticPoints(start3, end3, 1.35, 44), []);

  const head1 = ballistic(shot1Fly, start1, end1, 0.45);
  const next1 = ballistic(Math.min(1, shot1Fly + 0.03), start1, end1, 0.45);
  const head2 = ballistic(shot2Fly, start2, end2, 0.65);
  const next2 = ballistic(Math.min(1, shot2Fly + 0.03), start2, end2, 0.65);
  const head3 = ballistic(shot3Fly, start3, end3, 1.35);
  const next3 = ballistic(Math.min(1, shot3Fly + 0.03), start3, end3, 1.35);

  return (
    <group>
      {/* ==================== MỤC TIÊU 1: TƯỜNG CHẮN BÊ TÔNG (CHẠM NỔ — CONTACT @ 278.04) ==================== */}
      <group position={[37, 0, 6.5]}>
        <mesh position={[-0.65, 0.32, 0]} geometry={rbox(0.7, 0.64, 7.6, 0.12)} material={sandbagMat} castShadow receiveShadow />
        {[-3.0, 0, 3.0].map((bz, bi) => (
          <mesh key={bi} position={[0.6, 1.65, bz]} geometry={rbox(1.2, 3.3, 0.6, 0.03)} material={concreteLight} castShadow receiveShadow />
        ))}
        {!wallBroken ? (
          <mesh position={[0, 1.9, 0]} geometry={rbox(0.92, 3.8, 7.8, 0.04)} material={concreteLight} castShadow receiveShadow />
        ) : (
          <>
            <mesh position={[0, 1.9, -2.55]} geometry={rbox(0.92, 3.8, 2.7, 0.04)} material={concreteLight} castShadow receiveShadow />
            <mesh position={[0, 1.9, 2.55]} geometry={rbox(0.92, 3.8, 2.7, 0.04)} material={concreteLight} castShadow receiveShadow />
            <mesh position={[0, 0.52, 0]} geometry={rbox(0.92, 1.04, 2.5, 0.04)} material={concreteLight} castShadow receiveShadow />
            {[-0.8, -0.3, 0.3, 0.8].map((rz, ri) => (
              <mesh
                key={ri}
                position={[0.05, 1.5, rz]}
                rotation={[0.32 * (ri - 1.5), 0, 0.42]}
                material={rebarSteel}
              >
                <cylinderGeometry args={[0.03, 0.03, 1.25, 8]} />
              </mesh>
            ))}
            {[-1.1, -0.4, 0.35, 1.05].map((dz, di) => (
              <mesh
                key={di}
                position={[-0.9 + (di % 2) * 1.6, 0.24, dz]}
                rotation={[di * 0.5, di * 0.8, 0.2]}
                geometry={rbox(0.65, 0.42, 0.55, 0.05)}
                material={concreteLight}
                castShadow
              />
            ))}
            {/* Khói & tàn lửa hữu cơ bằng sprite softDot bốc lên từ miệng lỗ phá tường */}
            {wallPostDt > 0 && wallPostDt < 6.0 && (
              <>
                {Array.from({ length: 6 }, (_, pi) => {
                  const age = (wallPostDt + pi * 0.35) % 1.9;
                  return (
                    <PuffSprite
                      key={pi}
                      pos={[(pi % 2 - 0.5) * 0.45, 1.15 + age * 0.95, (pi - 2.5) * 0.35]}
                      size={0.9 + age * 1.15}
                      color={age < 0.38 ? '#ff9d3b' : '#6e665c'}
                      opacity={(age < 0.38 ? 0.65 : 0.45) * (1 - age / 1.9)}
                      rot={pi * 1.4}
                    />
                  );
                })}
              </>
            )}
          </>
        )}
        {!wallBroken && (
          <mesh position={[-0.48, 2.0, 0]} geometry={rbox(0.04, 1.35, 1.35, 0.01)} material={orangeMark} />
        )}
      </group>

      {t >= 276.82 && t <= CUE.c02_s06_mode_contact + 0.45 && (
        <>
          <Trail
            points={trail1Pts}
            upto={shot1Fly}
            color="#ffd166"
            width={0.095}
            opacity={0.92 * (1 - prog(t, CUE.c02_s06_mode_contact, CUE.c02_s06_mode_contact + 0.42))}
          />
          {t < CUE.c02_s06_mode_contact && <FlyingM1147Projectile pos={head1} nextPos={next1} />}
        </>
      )}
      <Explosion t={t} at={CUE.c02_s06_mode_contact} pos={[36.25, 1.85, 6.5]} size={3.8} seed={11} smokeLife={6.5} />

      {/* ==================== MỤC TIÊU 2: LÔ CỐT BÊ TÔNG RỖNG RUỘT (XUYÊN TRỄ — DELAY @ 279.24 -> 280.28) ==================== */}
      <group position={[51, 0, -4.2]}>
        {/* Dựng 4 vách bê tông thật có khoang rỗng tối bên trong & khe bắn xuyên suốt (không dùng hộp đặc + cầu giả!) */}
        {/* Vách sau (+X) & vách trái (-Z) */}
        <mesh position={[2.8, 1.85, 0]} geometry={rbox(0.65, 3.7, 6.8, 0.06)} material={bunkerConcrete} castShadow receiveShadow />
        <mesh position={[0, 1.85, -3.1]} geometry={rbox(6.2, 3.7, 0.65, 0.06)} material={bunkerConcrete} castShadow receiveShadow />
        <mesh position={[0, 0.15, 0]} geometry={rbox(5.6, 0.3, 6.2, 0.02)} material={bunkerInnerDark} receiveShadow />

        {/* Vách trước (-X) có khe bắn mở thật ở y = 1.82..2.36 */}
        <mesh position={[-2.8, 0.92, 0]} geometry={rbox(0.65, 1.84, 6.8, 0.05)} material={bunkerConcrete} castShadow receiveShadow />
        <mesh position={[-2.8, 3.04, 0]} geometry={rbox(0.65, 1.32, 6.8, 0.05)} material={bunkerConcrete} castShadow receiveShadow />
        <mesh position={[-2.8, 2.1, -2.35]} geometry={rbox(0.65, 0.56, 2.1, 0.04)} material={bunkerConcrete} castShadow />
        <mesh position={[-2.8, 2.1, 2.35]} geometry={rbox(0.65, 0.56, 2.1, 0.04)} material={bunkerConcrete} castShadow />

        {/* Vách hông phải (+Z, hướng về camera) có khe bắn mở thật ở y = 1.82..2.36 */}
        <mesh position={[0, 0.92, 3.1]} geometry={rbox(6.2, 1.84, 0.65, 0.05)} material={bunkerConcrete} castShadow receiveShadow />
        <mesh position={[0, 3.04, 3.1]} geometry={rbox(6.2, 1.32, 0.65, 0.05)} material={bunkerConcrete} castShadow receiveShadow />
        <mesh position={[-2.15, 2.1, 3.1]} geometry={rbox(1.9, 0.56, 0.65, 0.04)} material={bunkerConcrete} castShadow />
        <mesh position={[2.15, 2.1, 3.1]} geometry={rbox(1.9, 0.56, 0.65, 0.04)} material={bunkerConcrete} castShadow />

        {/* Trụ gia cường góc & tường cánh cửa lô cốt */}
        {[-3.0, 3.0].map((cz, ci) => (
          <mesh key={ci} position={[-3.02, 1.85, cz]} geometry={rbox(0.42, 3.7, 0.72, 0.04)} material={concreteLight} castShadow />
        ))}
        <mesh position={[-2.6, 1.25, 3.82]} rotation={[0, 0.35, 0]} geometry={rbox(2.3, 2.5, 0.68, 0.04)} material={concreteLight} castShadow />
        {!bunkerPierced && (
          <mesh position={[-3.15, 1.2, -0.35]} geometry={rbox(0.04, 0.95, 0.95, 0.01)} material={orangeMark} />
        )}

        {/* Mái bê tông nặng bị áp suất nổ từ bên trong hất bung nghiêng lệch */}
        <group position={[0, 3.84 + bunkerHeave, 0]} rotation={[bunkerHeave * 0.25, 0.08 * bunkerHeave, -bunkerHeave * 0.28]}>
          <mesh geometry={rbox(6.7, 0.54, 7.2, 0.08)} material={concreteLight} castShadow receiveShadow />
        </group>

        {/* Lỗ đục xuyên trên tường trước tại delay@279.24 */}
        {bunkerPierced && (
          <mesh position={[-3.14, 1.38, -0.35]} rotation={[0, 0, Math.PI / 2]} material={bunkerInnerDark}>
            <cylinderGeometry args={[0.24, 0.24, 0.08, 16]} />
          </mesh>
        )}

        {/* Ánh sáng lửa thật (pointLight) + hạt lửa/khói hữu cơ softDot cuộn ra từ lòng lô cốt qua 2 khe bắn */}
        {(bunkerDelayP > 0.05 || (bunkerBurstDt >= 0 && bunkerBurstDt < 4.5)) && (
          <group>
            <pointLight
              position={[0, 2.05, 0]}
              color="#ff7b1c"
              intensity={bunkerBurstDt >= 0 ? Math.max(8, 55 * Math.exp(-bunkerBurstDt * 1.1)) : 14 * bunkerDelayP}
              distance={14}
              decay={1.4}
            />
            {bunkerBurstDt >= 0 &&
              Array.from({ length: 10 }, (_, fi) => {
                const isFront = fi % 2 === 0;
                const cyc = (bunkerBurstDt + fi * 0.21) % 1.35;
                const jet = 0.4 + cyc * 2.4;
                const fade = (1 - cyc / 1.35) * Math.max(0.25, 1 - bunkerBurstDt / 4.8);
                const col = cyc < 0.32 ? '#ffe596' : cyc < 0.72 ? '#ff7d1e' : '#52473e';
                const pos: V3 = isFront
                  ? [-3.1 - jet, 2.08 + cyc * 0.45, ((fi % 5) - 2) * 0.35]
                  : [((fi % 5) - 2) * 0.35, 2.08 + cyc * 0.45, 3.35 + jet];
                return (
                  <PuffSprite
                    key={fi}
                    pos={pos}
                    size={1.05 + cyc * 1.55}
                    color={col}
                    opacity={0.78 * fade}
                    rot={fi * 1.9 + cyc}
                  />
                );
              })}
          </group>
        )}
      </group>

      {t >= 278.4 && t <= CUE.c02_s06_mode_delay + 0.45 && (
        <>
          <Trail
            points={trail2Pts}
            upto={shot2Fly}
            color="#ffba42"
            width={0.095}
            opacity={0.92 * (1 - prog(t, CUE.c02_s06_mode_delay, CUE.c02_s06_mode_delay + 0.42))}
          />
          {t < CUE.c02_s06_mode_delay && <FlyingM1147Projectile pos={head2} nextPos={next2} />}
        </>
      )}
      {/* Bụi bê tông phụt ngược ra ngoài lúc đầu đạn đục xuyên tường lô cốt tại delay@279.24 */}
      <MuzzleBlast
        t={t}
        at={CUE.c02_s06_mode_delay}
        pos={[47.8, 1.45, -4.55]}
        dir={[-1, 0.18, 0.1]}
        size={0.95}
        seed={19}
      />
      {/* Vụ nổ chính cộng hưởng cùng 2 luồng MuzzleBlast phụt thẳng qua 2 khe bắn lô cốt tại bunker@280.28 */}
      <Explosion t={t} at={CUE.c02_s06_bunker_burst} pos={[51.0, 2.35, -4.2]} size={4.5} seed={23} smokeLife={6.2} />
      <MuzzleBlast
        t={t}
        at={CUE.c02_s06_bunker_burst}
        pos={[47.85, 2.08, -4.2]}
        dir={[-1, 0.08, 0]}
        size={1.75}
        seed={27}
      />
      <MuzzleBlast
        t={t}
        at={CUE.c02_s06_bunker_burst}
        pos={[51.0, 2.08, -1.05]}
        dir={[0, 0.08, 1]}
        size={1.75}
        seed={31}
      />

      {/* ==================== MỤC TIÊU 3: CÔNG SỰ TỔ TÊN LỬA ATGM (AIRBURST @ 281.46 — BÊN PHẢI TIỀN CẢNH THOÁNG 100%) ==================== */}
      <group position={[64, 0, 4.5]}>
        {Array.from({ length: 12 }, (_, si) => {
          const a = -Math.PI * 0.65 + (si / 11) * Math.PI * 1.3;
          const rx = -Math.cos(a) * 4.3;
          const rz = Math.sin(a) * 4.9;
          return (
            <group key={si} position={[rx, 0, rz]} rotation={[0, a, 0]}>
              <mesh position={[0, 0.52, 0]} geometry={rbox(1.2, 1.04, 1.45, 0.16)} material={sandbagMat} castShadow receiveShadow />
              <mesh position={[0.12, 1.2, 0]} geometry={rbox(0.96, 0.62, 1.32, 0.14)} material={sandbagMat} castShadow receiveShadow />
            </group>
          );
        })}
        <mesh position={[0.4, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={plain('#685239', 0.95, 0.02)} receiveShadow>
          <circleGeometry args={[4.2, 24]} />
        </mesh>

        {/* Bệ phóng tên lửa chống tăng ATGM & 3 bia tổ tên lửa */}
        <group position={[-0.2, 0.08, 0.2]} rotation={[missileTeamDown * 0.55, 0, -missileTeamDown * 0.95]}>
          <mesh position={[0, 0.62, 0]} material={plain('#384332', 0.6, 0.4)} castShadow>
            <cylinderGeometry args={[0.07, 0.42, 1.24, 8]} />
          </mesh>
          <mesh position={[0.1, 1.34, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]} material={plain('#4c5c3b', 0.55, 0.3)} castShadow>
            <cylinderGeometry args={[0.19, 0.19, 1.85, 16]} />
          </mesh>
          <mesh position={[-0.28, 1.52, 0.25]} geometry={rbox(0.42, 0.3, 0.28, 0.02)} material={plain('#2b3029', 0.5, 0.4)} />
        </group>

        {[
          [1.0, -1.85],
          [1.45, 0.35],
          [0.85, 2.1],
        ].map(([cx, cz], ci) => (
          <group key={ci} position={[cx, 0.08, cz]} rotation={[0, 0, -missileTeamDown * 1.42]}>
            <mesh position={[0, 0.78, 0]} geometry={rbox(0.14, 1.56, 0.72, 0.02)} material={orangeMark} castShadow />
            <mesh position={[0, 1.72, 0]} geometry={rbox(0.16, 0.36, 0.36, 0.04)} material={orangeMark} castShadow />
          </group>
        ))}
      </group>

      {t >= 280.55 && t <= CUE.c02_s06_mode_airburst + 0.45 && (
        <>
          <Trail
            points={trail3Pts}
            upto={shot3Fly}
            color="#ffe787"
            width={0.095}
            opacity={0.92 * (1 - prog(t, CUE.c02_s06_mode_airburst, CUE.c02_s06_mode_airburst + 0.42))}
          />
          {t < CUE.c02_s06_mode_airburst && <FlyingM1147Projectile pos={head3} nextPos={next3} />}
        </>
      )}

      {/* Vụ nổ Airburst trên không (y = 4.65 m) bằng <Explosion> + <MuzzleBlast> hướng thẳng xuống lòng công sự */}
      <Explosion t={t} at={CUE.c02_s06_mode_airburst} pos={[64.0, 4.75, 4.5]} size={2.8} seed={37} smokeLife={3.8} />
      <MuzzleBlast
        t={t}
        at={CUE.c02_s06_mode_airburst}
        pos={[64.0, 4.55, 4.5]}
        dir={[0, -1, 0]}
        size={2.05}
        seed={41}
      />

      {/* Mưa 112 mảnh văng Tungsten đặc & đám khói/tia lửa hữu cơ softDot chụp xuống tổ tên lửa (không dùng cầu hay nón trong suốt!) */}
      {airburstDt > 0 && airburstDt < 2.45 && (
        <group position={[64.0, 4.65, 4.5]}>
          <PuffSprite
            pos={[0, 0, 0]}
            size={2.3 + 0.4 * Math.sin(airburstDt * 10)}
            color="#ffd878"
            opacity={0.62 * Math.max(0.25, 1 - airburstDt / 2.45)}
            rot={airburstDt}
          />

          {AIRBURST_SHARDS.map((sh, si) => {
            const cycDt = (airburstDt + (si % 5) * 0.21) % 1.05;
            const travel = Math.min(1.06, cycDt * 1.18 * sh.speed);
            const sx = sh.dx * travel * 4.5;
            const sy = sh.dy * travel * 4.2;
            const sz = sh.dz * travel * 4.5;
            if (4.65 + sy < 0.14) return null;
            return (
              <mesh
                key={si}
                position={[sx, sy, sz]}
                rotation={[Math.atan2(sh.dz, -sh.dy), 0, -Math.atan2(sh.dx, -sh.dy)]}
                scale={[0.068, 0.88, 0.068]}
              >
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                  color={si % 2 === 0 ? '#fff9d2' : '#ffbe42'}
                  transparent
                  opacity={0.92 * (1 - cycDt / 1.1)}
                  toneMapped={false}
                />
              </mesh>
            );
          })}

          {Array.from({ length: 12 }, (_, di) => {
            const da = (di / 12) * Math.PI * 2;
            const dr = 1.0 + (di % 3) * 1.25;
            const dustAge = (airburstDt + di * 0.14) % 1.25;
            return (
              <PuffSprite
                key={di}
                pos={[Math.cos(da) * dr, -4.25 + dustAge * 0.55, Math.sin(da) * dr]}
                size={1.05 + dustAge * 1.25}
                color={dustAge < 0.24 ? '#ffe28a' : '#cbb289'}
                opacity={(dustAge < 0.24 ? 0.8 : 0.6) * (1 - dustAge / 1.25)}
                rot={di * 1.7}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

const C02S06: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const isBeat2 = t >= 268.85 && t < 276.6;
  const isBeat3 = t >= 276.6;

  const dtCanister = t - CUE.c02_s06_canister_blast;
  const recoil =
    dtCanister > 0 && dtCanister < 0.95
      ? dtCanister < 0.07
        ? dtCanister / 0.07
        : Math.exp(-(dtCanister - 0.07) * 4.4)
      : 0;

  let camPos: V3;
  let camLook: V3;
  let fov = 38;
  let shadowCenter: V3 = [22, 0, 0];
  let shadowArea = 48;

  if (!isBeat2 && !isBeat3) {
    const pPush = prog(t, 254.2, 261.2);
    const pToShotgun = prog(t, 262.35, 264.25);
    const pFollowBlast = prog(t, CUE.c02_s06_canister_blast, 268.65);

    const posIntro = lerpV3([8.55, 1.65, 5.25], [7.55, 1.52, 4.38], pPush);
    const lookIntro = lerpV3([3.4, 1.52, 0.95], [4.35, 1.26, 1.65], pPush);

    const posRange = lerpV3([-2.6, 3.3, 6.8], [-0.8, 3.7, 7.9], pFollowBlast);
    const lookRange = lerpV3([17.5, 1.65, -0.2], [28.0, 1.5, -0.5], pFollowBlast);

    camPos = lerpV3(posIntro, posRange, pToShotgun);
    camLook = lerpV3(lookIntro, lookRange, pToShotgun);
    fov = lerp(37, 42, pToShotgun);
    shadowCenter = lerpV3([4, 0, 1], [24, 0, 0], pToShotgun);
    shadowArea = lerp(18, 46, pToShotgun);
  } else if (isBeat2) {
    const pZoomRings = prog(t, 268.85, 271.4);
    const pWidenLaunch = prog(t, 274.1, 276.4);

    const posStart: V3 = [-0.82, 28.26, 0.78];
    const posRings: V3 = [-0.74, 28.21, 0.64];
    const posLaunch: V3 = [-0.78, 28.24, 0.74];

    const lookStart: V3 = [-0.08, 28.01, 0.0];
    const lookRings: V3 = [-0.14, 28.01, 0.0];
    const lookLaunch: V3 = [0.0, 28.01, 0.0];

    camPos = lerpV3(lerpV3(posStart, posRings, pZoomRings), posLaunch, pWidenLaunch);
    camLook = lerpV3(lerpV3(lookStart, lookRings, pZoomRings), lookLaunch, pWidenLaunch);
    fov = 35;
    shadowCenter = [0, 28, 0];
    shadowArea = 3.5;
  } else {
    // Nhịp 3: Overwatch nâng cao từ mạn +Z nhìn chéo sang: Lô cốt ở trái-sau (-Z), Công sự ATGM ở phải-trước (+Z) hoàn toàn tách biệt!
    const pCorridor = prog(t, 276.6, 283.6);
    camPos = lerpV3([23.5, 11.4, 21.5], [39.5, 12.6, 21.8], pCorridor);
    camLook = lerpV3([46.5, 1.9, 1.2], [57.5, 2.2, 0.4], pCorridor);
    fov = 36;
    shadowCenter = [52, 0, 1];
    shadowArea = 36;
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Stage
        {...LOOK_PROVING_NOON.stage}
        width={W}
        height={H}
        shadowCenter={shadowCenter}
        shadowArea={shadowArea}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        {!isBeat2 && (
          <group>
            <Terrain h={PROVING_H} size={460} seg={220} center={[40, 0]} colors={LOOK_PROVING_NOON.terrain} />
            <Scatter
              kind="rock"
              count={85}
              area={[-40, -90, 140, 90]}
              h={PROVING_H}
              seed={21}
              scale={[0.6, 1.6]}
              avoid={avoidRangeLane}
              tint={LOOK_PROVING_NOON.scatterTint}
            />
            <Scatter
              kind="bush"
              count={70}
              area={[-40, -90, 140, 90]}
              h={PROVING_H}
              seed={39}
              scale={[0.7, 1.35]}
              avoid={avoidRangeLane}
              tint={LOOK_PROVING_NOON.scatterTint}
            />

            <mesh position={[0.4, 0.02, 0]} geometry={rbox(12.2, 0.05, 6.8, 0.02)} material={plain('#8b8377', 0.9, 0.05)} receiveShadow />
            <mesh position={[6.15, 0.032, 0]} geometry={rbox(0.32, 0.04, 6.6, 0.008)} material={plain('#d69e2e', 0.75, 0.08)} receiveShadow />

            <M1A2Abrams
              variant="sepv3"
              camo="desert"
              position={[0, 0.04, 0]}
              gunPitch={0.012}
              recoil={recoil}
              turretYaw={0}
              crowsYaw={0.12}
            />

            {!isBeat3 && (
              <>
                <OrdnanceDisplayRack t={t} />
                <CanisterShotgunField t={t} />
                <MuzzleBlast
                  t={t}
                  at={CUE.c02_s06_canister_blast}
                  pos={[5.72, 1.95, 0]}
                  dir={[1, 0.012, 0]}
                  size={2.35}
                  seed={6}
                />
              </>
            )}

            {isBeat3 && <ThreeModeTargetCorridor t={t} />}
          </group>
        )}

        {isBeat2 && <CutawayAmpBreechRig t={t} />}
      </Stage>

      <Label
        t={t}
        text="M1028"
        x={W * 0.17}
        y={H * 0.16}
        from={CUE.c02_s06_m1028_canister}
        until={268.3}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="M1147 AMP"
        x={W * 0.78}
        y={H * 0.16}
        from={CUE.c02_s06_m1147_amp}
        until={276.4}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C02S06;
