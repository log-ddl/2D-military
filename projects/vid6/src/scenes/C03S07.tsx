import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { Explosion, MuzzleBlast, Trail, softDot } from '@skill/military/3d/fx';
import { lathe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { PAL, PAINT_PRESETS } from '../design/palette';
import { LOOK_DESERT_STORM } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';

const hash01 = (i: number, k: number, seed = 307) => {
  const v = Math.sin(i * 12.9898 + k * 78.233 + seed * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

// Địa hình sa mạc hoàng hôn 1991: bãi phẳng đặt M1A2 SEPv3 tại tâm + đồi cát nhiều tầng phía xa
const H_DESERT = heightField({
  seed: 307,
  amp: 4.4,
  scale: 108,
  flats: [[0, 0, 15.5, 0]],
  add: (x, z) => {
    const backRidge = 7.2 * Math.exp(-(((z + 62) / 26) ** 2)) * (0.72 + 0.28 * Math.sin(x * 0.04));
    const farDune = 8.6 * Math.exp(-(((x + 70) / 32) ** 2)) * (0.65 + 0.35 * Math.cos(z * 0.035));
    const rightDune = 5.2 * Math.exp(-(((z - 54) / 24) ** 2));
    return backRidge + farDune + rightDune;
  },
});

const avoidTankPad = (x: number, z: number) =>
  Math.hypot(x, z) < 13.8 || (z < -2 && z > -28 && Math.abs(x + 3) < 12);

// Toạ độ 4 tấm radar phẳng AESA Trophy APS ở 4 góc tháp pháo (đồng bộ 1:1 với M1A2Abrams.tsx)
const TROPHY_RADARS: { pos: V3; yaw: number }[] = [
  { pos: [0.46, 0.68, 1.72], yaw: -0.68 },
  { pos: [0.46, 0.68, -1.66], yaw: 0.68 },
  { pos: [-1.62, 0.70, 1.48], yaw: -2.38 },
  { pos: [-1.62, 0.70, -1.46], yaw: 2.38 },
];

// Điểm đánh chặn trên không cách sườn trái xe ~11.0 m (z = -1.75 -> -12.05, dx = -3.7 -> hypot = 10.95 m), cao 3.48 m giữa không trung
const P_INTERCEPT: V3 = [-3.9, 3.48, -12.05];
const P_RPG_START: V3 = [-10.2, 4.85, -28.4];
const P_LAUNCHER_BASE: V3 = [-0.28, 2.29, -1.83];

const RPG_POINTS: V3[] = Array.from({ length: 72 }, (_, i) => {
  const p = i / 71;
  const arc = 0.36 * 4 * p * (1 - p);
  return [
    lerp(P_RPG_START[0], P_INTERCEPT[0], p),
    lerp(P_RPG_START[1], P_INTERCEPT[1], p) + arc,
    lerp(P_RPG_START[2], P_INTERCEPT[2], p),
  ];
});

const rpgPosAt = (p: number): V3 => {
  const u = Math.max(0, Math.min(1, p));
  const arc = 0.36 * 4 * u * (1 - u);
  return [
    lerp(P_RPG_START[0], P_INTERCEPT[0], u),
    lerp(P_RPG_START[1], P_INTERCEPT[1], u) + arc,
    lerp(P_RPG_START[2], P_INTERCEPT[2], u),
  ];
};

// Biên dạng đầu đạn lõm chống tăng PG-7VL (RPG-7) dựng chi tiết bằng lathe (dọc +X)
const RPG_BODY_GEO = lathe(
  [
    [0.001, -0.54],
    [0.030, -0.54],
    [0.038, -0.45],
    [0.031, -0.22],
    [0.034, -0.08],
    [0.094, 0.08],
    [0.098, 0.18],
    [0.076, 0.29],
    [0.024, 0.40],
    [0.012, 0.43],
    [0.010, 0.56],
    [0.001, 0.57],
  ],
  24,
);

const RPG_NOZZLE_FLAME_GEO = lathe(
  [
    [0.001, -1.12],
    [0.058, -0.72],
    [0.030, -0.54],
    [0.001, -0.53],
  ],
  16,
);

/** Mô hình đạn RPG-7 PG-7VL chi tiết: ngòi áp điện mũi, bầu nổ lõm olive, ống động cơ tên lửa & 4 cánh đuôi chữ thập */
const RpgProjectile3D: React.FC<{ pos: V3; dir: V3; spin: number }> = ({ pos, dir, spin }) => {
  const warheadMat = useMemo(() => plain('#5d6945', 0.5, 0.28), []);
  const motorMat = useMemo(() => plain('#363b32', 0.48, 0.56), []);
  const probeMat = useMemo(() => plain('#d5dee6', 0.22, 0.88), []);
  const finMat = useMemo(() => plain('#252927', 0.54, 0.64), []);
  const copperRingMat = useMemo(() => plain('#c87d44', 0.34, 0.78), []);

  const quat = useMemo(() => {
    const d = new THREE.Vector3(...dir).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  }, [dir[0], dir[1], dir[2]]);

  return (
    <group position={pos} quaternion={quat} scale={1.62}>
      <group rotation={[spin, 0, 0]}>
        <mesh geometry={RPG_BODY_GEO} material={warheadMat} castShadow />
        <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={copperRingMat}>
          <cylinderGeometry args={[0.099, 0.099, 0.028, 20]} />
        </mesh>
        <mesh position={[0.40, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={probeMat}>
          <cylinderGeometry args={[0.025, 0.029, 0.052, 16]} />
        </mesh>
        <mesh position={[0.49, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={probeMat}>
          <cylinderGeometry args={[0.009, 0.012, 0.15, 12]} />
        </mesh>
        <mesh position={[-0.33, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={motorMat}>
          <cylinderGeometry args={[0.035, 0.035, 0.35, 16]} />
        </mesh>
        {[0, 1, 2, 3].map((fi) => (
          <mesh
            key={fi}
            position={[-0.47, 0, 0]}
            rotation={[(fi * Math.PI) / 2, 0, 0.14]}
            geometry={rbox(0.15, 0.26, 0.009, 0.002)}
            material={finMat}
          />
        ))}
      </group>
      <mesh geometry={RPG_NOZZLE_FLAME_GEO}>
        <meshBasicMaterial color="#ffe494" transparent opacity={0.95} toneMapped={false} />
      </mesh>
      <pointLight position={[-0.65, 0, 0]} color="#ff9d32" intensity={22} distance={10} decay={1.6} />
    </group>
  );
};

/** Cụm khói dầu cháy âm ỉ ở chân trời chiến dịch Bão táp Sa mạc 1991 */
const DistantOilPlumes: React.FC<{ t: number }> = ({ t }) => {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#3a322c',
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      }),
    [],
  );
  const columns: [number, number, number][] = [
    [-145, 128, 1.0],
    [-82, 158, 1.22],
    [72, 148, 0.88],
  ];
  return (
    <group>
      {columns.map(([cx, cz, sc], ci) =>
        Array.from({ length: 8 }, (_, k) => {
          const h = 4 + k * 5.2 * sc;
          const drift = k * 2.8 + Math.sin(t * 0.25 + ci + k) * 1.2;
          const sz = (10 + k * 4.5) * sc;
          return <sprite key={`${ci}-${k}`} material={mat} position={[cx + drift, h, cz]} scale={[sz, sz, sz]} />;
        }),
      )}
    </group>
  );
};

/** 4 tấm radar phẳng AESA ở 4 góc tháp phát vòng sóng quét cyan khép kín 360° */
const TrophyRadarField360: React.FC<{ t: number; turretYaw: number }> = ({ t, turretYaw }) => {
  const active = prog(t, CUE.c03_s07_trophy_radars - 0.08, CUE.c03_s07_trophy_radars + 0.42);
  const full360 = prog(t, CUE.c03_s07_trophy_radars + 0.22, CUE.c03_s07_guard_360 + 0.32);
  // Khi bước vào pha RPG lao tới (417.76+), hạ gọn độ sáng vòng nền để đường đạn & vụ nổ chặn trên không cực kỳ sắc nét
  const combatDim = lerp(1.0, 0.28, prog(t, CUE.c03_s07_rpg_streak - 0.1, CUE.c03_s07_rpg_streak + 0.7));
  const threatAlert = bump(t, CUE.c03_s07_rpg_streak, 3.2);

  if (active <= 0.001) return null;

  const dt = Math.max(0, t - CUE.c03_s07_trophy_radars);
  const sweepAngle = dt * 2.6;

  return (
    <group position={[0.08, 1.35, 0]} rotation={[0, turretYaw, 0]}>
      {/* 1. Cả 4 tấm radar phẳng AESA ở 4 góc tháp phát sáng lưới mảng pha & phóng quạt quét 92° */}
      {TROPHY_RADARS.map((rad, ri) => {
        const isThreatSide = ri === 1 || ri === 3;
        const panelCol = isThreatSide && threatAlert > 0.1 ? '#92fcff' : PAL.cyan;
        return (
          <group key={ri} position={rad.pos} rotation={[0, rad.yaw, 0]}>
            <mesh position={[0.052, 0.005, 0]} rotation={[0, 0, -0.14]}>
              <boxGeometry args={[0.012, 0.30, 0.42]} />
              <meshBasicMaterial color={panelCol} transparent opacity={0.82 * active} toneMapped={false} />
            </mesh>
            {[-0.13, 0, 0.13].map((dz, ci) => (
              <mesh key={ci} position={[0.06, 0.005, dz]} rotation={[0, 0, -0.14]}>
                <boxGeometry args={[0.006, 0.25, 0.016]} />
                <meshBasicMaterial color="#e2ffff" transparent opacity={0.9 * active} toneMapped={false} />
              </mesh>
            ))}

            {/* Cánh quạt tia sóng 92° phát trực tiếp từ mỗi góc radar để thấy rõ cả 4 góc cùng ghép thành 360° */}
            <mesh position={[0.08, 0.0, 0]} rotation={[-Math.PI / 2, 0, -Math.PI * 0.26]}>
              <ringGeometry args={[0.35, 3.8 * active, 24, 1, 0, Math.PI * 0.52]} />
              <meshBasicMaterial
                color={PAL.cyan}
                transparent
                opacity={0.18 * active * combatDim}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* 2. Vòng sóng radar khép kín 360° bao quanh tháp pháo */}
      {full360 > 0.01 && (
        <group position={[-0.45, 0.68, 0]}>
          {/* Vành biên giới vùng bảo vệ 360° ở bán kính đánh chặn ~11 m */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[10.88, 11.04, 96]} />
            <meshBasicMaterial
              color={PAL.cyan}
              transparent
              opacity={0.52 * full360 * combatDim}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[3.1, 3.2, 72]} />
            <meshBasicMaterial
              color={PAL.cyanSoft}
              transparent
              opacity={0.56 * full360 * combatDim}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          {/* 3 đợt sóng xung đồng tâm 360° lan toả liên tục từ tháp pháo ra tới vành gác 11 m */}
          {[0, 1, 2].map((k) => {
            const p = ((dt * 0.62 + k / 3) % 1);
            const r = lerp(2.6, 11.0, p);
            const fade = Math.sin(p * Math.PI);
            const op = fade * 0.72 * full360 * combatDim;
            if (op <= 0.008) return null;
            return (
              <mesh key={k} rotation={[-Math.PI / 2, 0, 0]} position={[0, -p * 0.18, 0]}>
                <ringGeometry args={[r, r + 0.14, 96]} />
                <meshBasicMaterial
                  color={k % 2 === 0 ? PAL.cyan : PAL.cyanSoft}
                  transparent
                  opacity={op}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            );
          })}

          {/* Quạt quét phương vị 360° quay tròn quanh tháp */}
          <group rotation={[0, sweepAngle, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[2.6, 10.95, 24, 1, 0, 0.36]} />
              <meshBasicMaterial
                color={PAL.cyan}
                transparent
                opacity={0.26 * full360 * combatDim}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>

          {/* Vòm lưới bán cầu bảo vệ 360° bao trùm tháp pháo */}
          <mesh scale={[1, 0.44, 1]}>
            <sphereGeometry args={[5.4, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.46]} />
            <meshBasicMaterial
              color={PAL.cyan}
              wireframe
              transparent
              opacity={0.16 * full360 * combatDim}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** Bệ phóng Trophy sườn xe quay ngoắt ("whip around") & phóng chùm mảnh kim loại hình nón xé xác đầu đạn trên không */
const TrophyCountermeasureAction: React.FC<{
  t: number;
  launcherPos: V3;
  rpgPos: V3;
  rpgAlive: boolean;
}> = ({ t, launcherPos, rpgPos, rpgAlive }) => {
  const carcHeadMat = useMemo(
    () =>
      paint({
        ...PAINT_PRESETS.abramsDesert,
        camo: [...PAINT_PRESETS.abramsDesert.camo],
        repeat: 1.0,
        seed: 19,
      }),
    [],
  );
  const chargeFaceMat = useMemo(() => plain('#30363d', 0.42, 0.72), []);

  const whipP = prog(t, CUE.c03_s07_launcher_whip, CUE.c03_s07_launcher_whip + 0.44);

  const aimDir = useMemo<V3>(() => {
    const rest = new THREE.Vector3(0, 0.18, -1).normalize();
    const target = new THREE.Vector3(
      P_INTERCEPT[0] - launcherPos[0],
      P_INTERCEPT[1] - launcherPos[1],
      P_INTERCEPT[2] - launcherPos[2],
    ).normalize();
    const cur = rest.clone().lerp(target, whipP).normalize();
    return [cur.x, cur.y, cur.z];
  }, [launcherPos[0], launcherPos[1], launcherPos[2], whipP]);

  const headQuat = useMemo(
    () => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...aimDir)),
    [aimDir[0], aimDir[1], aimDir[2]],
  );

  // Tia radar khoá mục tiêu từ bệ phóng Trophy tới đầu đạn RPG
  const lockActive = t >= CUE.c03_s07_rpg_streak + 0.8 && rpgAlive;
  const lockBeamGeo = useMemo(() => {
    if (!lockActive) return null;
    const curve = new THREE.LineCurve3(new THREE.Vector3(...launcherPos), new THREE.Vector3(...rpgPos));
    return new THREE.TubeGeometry(curve, 8, 0.022, 6, false);
  }, [lockActive, launcherPos[0], launcherPos[1], launcherPos[2], rpgPos[0], rpgPos[1], rpgPos[2]]);

  // Tiến độ chùm mảnh kim loại hình nón (421.18 -> 422.42)
  const pelletDt = t - CUE.c03_s07_blast_pellets;
  const showPellets = pelletDt >= 0 && pelletDt <= 1.72;
  const travelNorm = pelletDt / (CUE.c03_s07_shred_midair - CUE.c03_s07_blast_pellets);

  const basis = useMemo(() => {
    const fwd = new THREE.Vector3(
      P_INTERCEPT[0] - launcherPos[0],
      P_INTERCEPT[1] - launcherPos[1],
      P_INTERCEPT[2] - launcherPos[2],
    );
    const dist = fwd.length();
    fwd.normalize();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), fwd);
    return { fwd, right, up, dist, q };
  }, [launcherPos[0], launcherPos[1], launcherPos[2]]);

  // Tia mảnh nổ toả tròn trên không trung ngay sau khi đầu đạn RPG bị xé xác tại 422.42
  const airburstDt = t - CUE.c03_s07_shred_midair;

  return (
    <group>
      {/* Khối cassette phóng MEFP đồng bộ màu sơn CARC, quay ngoắt khoá hướng đánh chặn lúc 420.36 */}
      <group position={launcherPos} quaternion={headQuat}>
        <mesh geometry={rbox(0.14, 0.19, 0.24, 0.018)} material={carcHeadMat} castShadow />
        <mesh position={[0.075, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={chargeFaceMat}>
          <cylinderGeometry args={[0.088, 0.088, 0.024, 18]} />
        </mesh>
        {whipP > 0.05 && t < CUE.c03_s07_shred_midair + 0.35 && (
          <mesh position={[0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.076, 0.098, 20]} />
            <meshBasicMaterial color={PAL.cyan} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* Tia khoá mục tiêu & khung ngắm lục giác cyan bám chặt đầu đạn RPG */}
      {lockActive && lockBeamGeo && (
        <>
          <mesh geometry={lockBeamGeo}>
            <meshBasicMaterial color={PAL.cyan} transparent opacity={0.62} toneMapped={false} />
          </mesh>
          <group position={rpgPos} quaternion={basis.q}>
            <mesh rotation={[0, Math.PI / 2, t * 4.5]}>
              <ringGeometry args={[0.44, 0.52, 6]} />
              <meshBasicMaterial color={PAL.cyan} side={THREE.DoubleSide} transparent opacity={0.92} toneMapped={false} />
            </mesh>
          </group>
        </>
      )}

      {/* Chớp lửa khai hoả bệ phóng Trophy bên sườn lúc 421.18 */}
      <MuzzleBlast
        t={t}
        at={CUE.c03_s07_blast_pellets}
        pos={launcherPos}
        dir={[basis.fwd.x, basis.fwd.y, basis.fwd.z]}
        size={1.55}
        seed={23}
      />

      {/* Nón luồng đạn ghém MEFP định hình rõ góc mở hình nón từ bệ phóng tới đầu đạn */}
      {pelletDt >= 0 && pelletDt < 1.34 && (
        <group position={launcherPos} quaternion={basis.q}>
          <mesh
            position={[Math.min(1.06, travelNorm) * basis.dist * 0.5, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[
                0.08,
                0.16 + Math.min(1.06, travelNorm) * 1.48,
                Math.max(0.2, Math.min(1.06, travelNorm) * basis.dist),
                22,
                1,
                true,
              ]}
            />
            <meshBasicMaterial
              color="#ffd98e"
              transparent
              opacity={0.18 * Math.max(0, 1 - Math.max(0, travelNorm - 0.86) * 2.4)}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* Chùm 38 mảnh kim loại siêu tốc hình nón xé xác đầu đạn RPG */}
      {showPellets &&
        Array.from({ length: 38 }, (_, i) => {
          const speedVar = 0.89 + hash01(i, 1) * 0.22;
          const p = travelNorm * speedVar;
          if (p <= 0.01 || p > 1.32) return null;
          const d = p * basis.dist;
          const angle = hash01(i, 2) * Math.PI * 2;
          const coneRadius = d * (0.02 + hash01(i, 3) * 0.118);
          const pos = new THREE.Vector3(...launcherPos)
            .addScaledVector(basis.fwd, d)
            .addScaledVector(basis.right, Math.cos(angle) * coneRadius)
            .addScaledVector(basis.up, Math.sin(angle) * coneRadius);

          const fadeAfterHit = p > 1.0 ? Math.max(0, 1 - (p - 1.0) / 0.32) : 1;
          return (
            <group key={i} position={[pos.x, pos.y, pos.z]} quaternion={basis.q}>
              <mesh position={[-0.42, 0, 0]}>
                <boxGeometry args={[0.92, 0.042, 0.042]} />
                <meshBasicMaterial
                  color={i % 3 === 0 ? '#fff7d1' : '#ffb845'}
                  transparent
                  opacity={0.92 * fadeAfterHit}
                  toneMapped={false}
                />
              </mesh>
              <mesh>
                <octahedronGeometry args={[0.062, 0]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={fadeAfterHit} toneMapped={false} />
              </mesh>
            </group>
          );
        })}

      {/* Tia lửa & tàn tạ mảnh xác đầu đạn nổ tung toả tròn giữa không trung (422.42..423.85s) */}
      {airburstDt >= 0 && airburstDt < 1.55 && (
        <group position={P_INTERCEPT}>
          {Array.from({ length: 20 }, (_, i) => {
            const theta = hash01(i, 5) * Math.PI * 2;
            const phi = (hash01(i, 6) - 0.38) * Math.PI * 0.72;
            const spd = 4.2 + hash01(i, 7) * 5.6;
            const r = spd * Math.pow(airburstDt, 0.72);
            const sx = Math.cos(phi) * Math.cos(theta) * r;
            const sy = Math.sin(phi) * r - 1.4 * airburstDt * airburstDt;
            const sz = Math.cos(phi) * Math.sin(theta) * r;
            const fade = Math.max(0, 1 - airburstDt / 1.55);
            return (
              <mesh key={`ab-${i}`} position={[sx, sy, sz]} rotation={[airburstDt * 8 + i, airburstDt * 6, i]}>
                <octahedronGeometry args={[0.08 * (0.4 + 0.6 * fade), 0]} />
                <meshBasicMaterial
                  color={airburstDt < 0.45 ? '#ffe494' : '#ff7b29'}
                  transparent
                  opacity={0.95 * fade}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

const C03S07: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const turretYaw = lerp(0.06, 0.0, prog(t, 409.8, CUE.c03_s07_rpg_streak));
  const citvYaw = 0.25 + (t - 410.0) * 0.55;
  const crowsYaw = lerp(-0.22, -0.78, prog(t, CUE.c03_s07_rpg_streak, CUE.c03_s07_launcher_whip));

  // Đầu đạn RPG bay từ 417.76 -> 422.42 rồi biến mất hoàn toàn ngay khi nổ tung giữa không trung
  const rpgFlightP = prog(t, CUE.c03_s07_rpg_streak, CUE.c03_s07_shred_midair, (x) => x);
  const rpgAlive = t >= CUE.c03_s07_rpg_streak && t < CUE.c03_s07_shred_midair;
  const rpgPos = rpgPosAt(rpgFlightP);
  const rpgNext = rpgPosAt(Math.min(1, rpgFlightP + 0.02));
  const rpgDir: V3 = [
    rpgNext[0] - rpgPos[0] || P_INTERCEPT[0] - P_RPG_START[0],
    rpgNext[1] - rpgPos[1] || P_INTERCEPT[1] - P_RPG_START[1],
    rpgNext[2] - rpgPos[2] || P_INTERCEPT[2] - P_RPG_START[2],
  ];

  const trailFade =
    t < CUE.c03_s07_rpg_streak
      ? 0
      : t < CUE.c03_s07_shred_midair
        ? 1
        : Math.max(0, 1 - (t - CUE.c03_s07_shred_midair) / 1.45);

  const shockDt = t - CUE.c03_s07_shred_midair;

  // Quỹ đạo Camera 3 pha đã tinh chỉnh vòng 2:
  // Pha 1 (409.8..413.82): Ôm trọn cả cảm biến đầu nòng MRS lẫn cận cảnh 3/4 mũi-sườn tháp pháo SEPv3
  // Pha 2 (413.82..417.45): Nâng góc thấy rõ 4 tấm radar phẳng AESA & vòng sóng quét cyan 360°
  // Pha 3 (417.35..424.20): Góc ngang chiến thuật (lệch trục đạn RPG ~66°) thấy rõ bệ phóng sườn bắn nón mảnh chặn nổ RPG trên không cách sườn ~11 m
  const pOrbit = prog(t, 409.8, CUE.c03_s07_trophy_radars);
  const pRadar = prog(t, CUE.c03_s07_trophy_radars, 417.45);
  const pIntercept = prog(t, 417.35, 418.85);
  const pHoldDrift = prog(t, 418.85, 424.2);

  let camPos: V3 = [
    lerp(8.6, 5.8, pOrbit),
    lerp(2.14, 2.66, pOrbit),
    lerp(-6.8, -9.1, pOrbit),
  ];
  let camLook: V3 = [
    lerp(0.88, 0.18, pOrbit),
    lerp(1.76, 1.9, pOrbit),
    lerp(-0.1, -0.25, pOrbit),
  ];
  let fov = lerp(39, 41, pOrbit);

  if (pRadar > 0) {
    camPos = [
      lerp(camPos[0], 9.4, pRadar),
      lerp(camPos[1], 5.6, pRadar),
      lerp(camPos[2], -11.5, pRadar),
    ];
    camLook = [
      lerp(camLook[0], -0.35, pRadar),
      lerp(camLook[1], 1.85, pRadar),
      lerp(camLook[2], -0.75, pRadar),
    ];
    fov = lerp(fov, 43, pRadar);
  }

  if (pIntercept > 0) {
    const targetPos: V3 = [
      lerp(15.8, 15.0, pHoldDrift),
      lerp(4.05, 3.8, pHoldDrift),
      lerp(-5.2, -5.9, pHoldDrift),
    ];
    const targetLook: V3 = [
      lerp(-1.25, -1.65, pHoldDrift),
      lerp(2.45, 2.65, pHoldDrift),
      lerp(-6.3, -6.8, pHoldDrift),
    ];
    camPos = [
      lerp(camPos[0], targetPos[0], pIntercept),
      lerp(camPos[1], targetPos[1], pIntercept),
      lerp(camPos[2], targetPos[2], pIntercept),
    ];
    camLook = [
      lerp(camLook[0], targetLook[0], pIntercept),
      lerp(camLook[1], targetLook[1], pIntercept),
      lerp(camLook[2], targetLook[2], pIntercept),
    ];
    fov = lerp(fov, 45, pIntercept);
  }

  const launcherWorld = useMemo<V3>(() => {
    const lx = P_LAUNCHER_BASE[0] - 0.08;
    const lz = P_LAUNCHER_BASE[2];
    const c = Math.cos(turretYaw);
    const s = Math.sin(turretYaw);
    return [0.08 + lx * c + lz * s, P_LAUNCHER_BASE[1], -lx * s + lz * c];
  }, [turretYaw]);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
      <Stage
        {...LOOK_DESERT_STORM.stage}
        width={W}
        height={H}
        shadowArea={28}
        shadowCenter={[-1.0, 1.2, -3.5]}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        <Terrain h={H_DESERT} size={520} seg={220} colors={LOOK_DESERT_STORM.terrain} />
        <Scatter
          kind="rock"
          count={96}
          area={[-125, -125, 125, 125]}
          h={H_DESERT}
          seed={71}
          scale={[0.45, 1.35]}
          avoid={avoidTankPad}
          tint={LOOK_DESERT_STORM.scatterTint}
        />
        <Scatter
          kind="bush"
          count={52}
          area={[-115, -115, 115, 115]}
          h={H_DESERT}
          seed={77}
          scale={[0.38, 0.82]}
          avoid={avoidTankPad}
          tint="#9e8760"
        />
        <DistantOilPlumes t={t} />

        <M1A2Abrams
          variant="sepv3"
          camo="desert"
          position={[0, 0, 0]}
          turretYaw={turretYaw}
          gunPitch={0.036}
          citvYaw={citvYaw}
          crowsYaw={crowsYaw}
          exhaustHeat={0.34}
        />

        <TrophyRadarField360 t={t} turretYaw={turretYaw} />

        {trailFade > 0.005 && (
          <>
            <Trail
              points={RPG_POINTS}
              upto={rpgFlightP}
              color="#e6dac8"
              width={0.22}
              opacity={0.64 * trailFade}
              glow={false}
            />
            <Trail
              points={RPG_POINTS}
              upto={rpgFlightP}
              color="#ffb443"
              width={0.095}
              opacity={0.95 * (rpgAlive ? 1 : trailFade * 0.5)}
              glow={true}
            />
          </>
        )}
        {rpgAlive && <RpgProjectile3D pos={rpgPos} dir={rpgDir} spin={(t - CUE.c03_s07_rpg_streak) * 18} />}

        <TrophyCountermeasureAction
          t={t}
          launcherPos={launcherWorld}
          rpgPos={rpgPos}
          rpgAlive={rpgAlive}
        />

        {/* Vụ nổ đánh chặn trên không gọn sắc nét cách sườn xe ~11 m, lơ lửng rõ trên nền trời/đồi cát */}
        <Explosion
          t={t}
          at={CUE.c03_s07_shred_midair}
          pos={P_INTERCEPT}
          size={1.92}
          seed={39}
          smokeLife={3.4}
          smoke="#4d453d"
        />
        {shockDt >= 0 && shockDt < 0.65 && (
          <group position={P_INTERCEPT} rotation={[0.24, 0.82, 0]}>
            <mesh scale={1 + shockDt * 11.5}>
              <ringGeometry args={[0.34, 0.44, 40]} />
              <meshBasicMaterial
                color="#fff3c8"
                transparent
                opacity={0.88 * (1 - shockDt / 0.65)}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}
      </Stage>

      {t < CUE.c03_s07_trophy_radars && (
        <Label
          t={t}
          text="M1A2 SEPv3"
          x={W * 0.23}
          y={H * 0.15}
          from={CUE.c03_s07_sepv3}
          until={413.6}
          bg={PAL.cream}
          fg={PAL.ink}
        />
      )}
      <Label
        t={t}
        text="TROPHY APS"
        x={W * 0.23}
        y={H * 0.15}
        from={CUE.c03_s07_trophy_radars}
        until={417.5}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C03S07;
