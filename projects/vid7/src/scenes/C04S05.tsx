// C04S05 (685.60–705.98 s) — 3D monsoonNight + ánh đuốc cam ấm:
// Cú hạ máy cần cẩu từ bầu trời đêm đầy 8 vòm dù trắng ParachuteRaider xuống ruộng lúa bậc thang ngập nước
// và đoàn dân làng đội nón lá + du kích Trung Hoa cầm đuốc tre cứu trợ 64 phi công Mỹ.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { extrudeTop, mat4, merge, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { Explosion } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { ParachuteRaider } from '../parts/Ordnance3D';

// ---------- Địa hình thung lũng núi đá miền Đông Trung Quốc & 5 bậc ruộng lúa ngập nước ----------

const TERRACE_TIERS = [
  { zFront: 6.4, zBack: -4.8, waterY: 0.48, dikeY: 0.82 }, // Bậc 0 (ruộng tiền cảnh nơi Doolittle đáp xuống)
  { zFront: -4.8, zBack: -15.0, waterY: 1.22, dikeY: 1.56 }, // Bậc 1 (bờ đê chính đoàn dân làng cầm đuốc đi tới)
  { zFront: -15.0, zBack: -25.8, waterY: 1.98, dikeY: 2.32 }, // Bậc 2 (trung cảnh)
  { zFront: -25.8, zBack: -37.2, waterY: 2.82, dikeY: 3.16 }, // Bậc 3
  { zFront: -37.2, zBack: -49.0, waterY: 3.74, dikeY: 4.08 }, // Bậc 4 (sát chân núi)
] as const;

function contourZ(tierIdx: number, x: number): number {
  const zBase =
    tierIdx < TERRACE_TIERS.length ? TERRACE_TIERS[tierIdx].zFront : TERRACE_TIERS[TERRACE_TIERS.length - 1].zBack;
  return (
    zBase +
    Math.sin(x * 0.082 + tierIdx * 0.85) * 2.05 +
    Math.cos(x * 0.044 - tierIdx * 0.52) * 1.35
  );
}

function dikeHeading(tierIdx: number, x: number): number {
  const dz = contourZ(tierIdx, x + 0.25) - contourZ(tierIdx, x - 0.25);
  return Math.atan2(-dz, 0.5);
}

// Dãy núi đá đêm kiểu karst Trung Hoa có yên ngựa & đỉnh nhọn vừa phải (cao 28–48 m ở z = -60..-170)
// để luôn lộ rõ đường chân trời bầu trời đêm xanh thẫm phía trên đỉnh núi!
const VALLEY_H = heightField({
  seed: 405,
  amp: 5.2,
  scale: 86,
  flats: [[0, -18, 45, -0.35]],
  add: (x, z) => {
    const backDist = Math.max(0, -54 - z);
    const env = 1 - Math.exp(-Math.pow(backDist / 58, 1.55));
    const karstPeaks =
      (Math.sin(x * 0.058 + 0.4) * 0.5 + 0.5) * 18 +
      (Math.cos(x * 0.125 - z * 0.035) * 0.5 + 0.5) * 9;
    const backWall = env * (22 + karstPeaks);

    const sideDist = Math.max(0, Math.abs(x) - 42);
    const sideEnv = 1 - Math.exp(-Math.pow(sideDist / 55, 1.4));
    const sideWall = sideEnv * (24 + Math.sin(z * 0.06 + x * 0.05) * 6);

    const frontRise = z > 24 ? Math.pow((z - 24) / 60, 1.3) * 12 : 0;
    return backWall + sideWall + frontRise;
  },
});

const avoidPaddyBasin = (x: number, z: number) => Math.abs(x) < 43 && z > -52 && z < 15;

// ---------- Danh sách 8 phi công nhảy dù (ParachuteRaider) bố cục dày chiều sâu trong khung 16:9 ----------

type ChuteSpec = {
  xLand: number;
  zLand: number;
  waterY: number;
  tLand: number;
  speed: number;
  driftX: number;
  phase: number;
};

const CHUTES: ChuteSpec[] = [
  // #0: Trung tá Jimmy Doolittle đáp xuống thửa ruộng tiền cảnh lúc 691.15 s
  { xLand: 1.5, zLand: -1.2, waterY: 0.48, tLand: 691.15, speed: 4.1, driftX: 0.48, phase: 0.2 },
  // #1: Đồng đội đáp xuống thửa ruộng bên trái
  { xLand: -7.6, zLand: -0.6, waterY: 0.48, tLand: 692.45, speed: 4.0, driftX: 0.44, phase: 1.4 },
  // #2: Bậc 1 bên phải
  { xLand: 10.8, zLand: -9.8, waterY: 1.22, tLand: 693.45, speed: 3.9, driftX: 0.46, phase: 2.5 },
  // #3: Bậc 1 bên trái
  { xLand: -13.8, zLand: -10.5, waterY: 1.22, tLand: 694.8, speed: 3.85, driftX: 0.4, phase: 3.7 },
  // #4: Bậc 2 giữa-phải
  { xLand: 5.2, zLand: -20.2, waterY: 1.98, tLand: 696.2, speed: 3.75, driftX: 0.45, phase: 0.9 },
  // #5: Bậc 2 bên trái
  { xLand: -9.8, zLand: -21.4, waterY: 1.98, tLand: 697.6, speed: 3.65, driftX: 0.38, phase: 2.1 },
  // #6: Bậc 3 phải xa
  { xLand: 16.4, zLand: -31.0, waterY: 2.82, tLand: 698.9, speed: 3.6, driftX: 0.42, phase: 4.2 },
  // #7: Bậc 3 giữa-trái xa
  { xLand: -3.2, zLand: -32.5, waterY: 2.82, tLand: 700.1, speed: 3.55, driftX: 0.4, phase: 5.3 },
];

// Texture quầng sáng mềm dịu (không đốm đen) cho ánh lửa phản chiếu mặt nước
let warmGlowTex: THREE.CanvasTexture | null = null;
function getWarmGlowTex(): THREE.CanvasTexture {
  if (warmGlowTex) return warmGlowTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,230,170,1)');
  g.addColorStop(0.4, 'rgba(255,154,60,0.45)');
  g.addColorStop(1, 'rgba(255,120,30,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  warmGlowTex = new THREE.CanvasTexture(cv);
  warmGlowTex.colorSpace = THREE.SRGBColorSpace;
  return warmGlowTex;
}

// ---------- Thành phần bối cảnh: Ruộng lúa bậc thang, Bờ đê đất & Khóm mạ lúa nhiều lá mảnh ----------

const RicePaddyTerraces: React.FC = () => {
  const { waterGeos, dikeGeos, crossBundGeos, shootMatrices, shootGeo, mats } = useMemo(() => {
    const xSamples = 42;
    const xMin = -42;
    const xMax = 42;

    const wGeos: { geo: THREE.BufferGeometry; y: number }[] = [];
    const dGeos: { geo: THREE.BufferGeometry; h: number }[] = [];

    for (let k = 0; k < TERRACE_TIERS.length; k++) {
      const tier = TERRACE_TIERS[k];
      const poly: P2[] = [];
      for (let i = 0; i <= xSamples; i++) {
        const x = lerp(xMin, xMax, i / xSamples);
        poly.push([x, contourZ(k, x)]);
      }
      for (let i = xSamples; i >= 0; i--) {
        const x = lerp(xMin, xMax, i / xSamples);
        poly.push([x, contourZ(k + 1, x)]);
      }
      wGeos.push({ geo: extrudeTop(poly, 0.08, 0.01), y: tier.waterY - 0.08 });

      const dikeHalfW = k === 1 ? 0.8 : 0.66;
      const dikePoly: P2[] = [];
      for (let i = 0; i <= xSamples; i++) {
        const x = lerp(xMin, xMax, i / xSamples);
        dikePoly.push([x, contourZ(k, x) + dikeHalfW]);
      }
      for (let i = xSamples; i >= 0; i--) {
        const x = lerp(xMin, xMax, i / xSamples);
        dikePoly.push([x, contourZ(k, x) - dikeHalfW]);
      }
      const baseFloor = k === 0 ? -0.35 : TERRACE_TIERS[k - 1].waterY - 0.15;
      const h = tier.dikeY - baseFloor;
      const dg = extrudeTop(dikePoly, h, 0.15).clone();
      dg.translate(0, baseFloor, 0);
      dGeos.push({ geo: dg, h });
    }

    const crossSpecs = [
      { tier: 0, x: -4.4 },
      { tier: 0, x: 9.2 },
      { tier: 1, x: -9.5 },
      { tier: 1, x: 7.4 },
      { tier: 2, x: -2.5 },
      { tier: 2, x: 14.0 },
    ];
    const cbGeos = crossSpecs.map(({ tier, x }) => {
      const tInfo = TERRACE_TIERS[tier];
      const zA = contourZ(tier, x);
      const zB = contourZ(tier + 1, x);
      const pts: P2[] = [
        [x - 0.48, zA],
        [x + 0.48, zA],
        [x + 0.44, zB],
        [x - 0.44, zB],
      ];
      const h = tInfo.dikeY - (tInfo.waterY - 0.18);
      const g = extrudeTop(pts, h, 0.1).clone();
      g.translate(0, tInfo.waterY - 0.18, 0);
      return g;
    });

    // Khóm mạ lúa non gồm 4 lá lúa mảnh xoè tự nhiên (không dùng hình nón đơn thô)
    const blades = [
      new THREE.ConeGeometry(0.018, 0.25, 4).applyMatrix4(mat4([0.02, 0.11, 0], [0.08, 0, -0.24])),
      new THREE.ConeGeometry(0.017, 0.27, 4).applyMatrix4(mat4([-0.02, 0.12, 0.01], [-0.1, 0.4, 0.22])),
      new THREE.ConeGeometry(0.016, 0.23, 4).applyMatrix4(mat4([0, 0.1, -0.02], [-0.24, -0.3, 0.06])),
      new THREE.ConeGeometry(0.016, 0.24, 4).applyMatrix4(mat4([0.01, 0.1, 0.02], [0.25, 0.5, -0.08])),
    ];
    const tuftGeo = merge(blades);

    const shoots: THREE.Matrix4[] = [];
    for (let k = 0; k < 4; k++) {
      const tier = TERRACE_TIERS[k];
      const rows = k === 0 ? 7 : 5;
      const cols = 38;
      for (let r = 1; r <= rows; r++) {
        const v = r / (rows + 1);
        for (let c = 0; c < cols; c++) {
          const x = lerp(-28, 28, c / (cols - 1)) + (rnd(k * 900 + r * 41 + c) - 0.5) * 0.35;
          const z = lerp(contourZ(k, x) - 0.9, contourZ(k + 1, x) + 0.9, v);
          if (k === 0 && Math.hypot(x - 1.5, z + 1.2) < 2.9) continue;
          if (Math.abs(x + 4.4) < 0.72 || Math.abs(x - 9.2) < 0.72) continue;
          const sc = 0.8 + rnd(k * 311 + r * 17 + c * 3) * 0.4;
          shoots.push(
            mat4([x, tier.waterY - 0.02, z], [0, rnd(c * 13 + r) * Math.PI * 2, 0], [sc, sc, sc]),
          );
        }
      }
    }

    return {
      waterGeos: wGeos,
      dikeGeos: dGeos,
      crossBundGeos: cbGeos,
      shootMatrices: shoots,
      shootGeo: tuftGeo,
      mats: {
        paddyWater: new THREE.MeshStandardMaterial({
          color: '#1b314a',
          roughness: 0.085,
          metalness: 0.84,
        }),
        dikeMud: paint({
          color: '#3e4633',
          camo: ['#2e3527', '#4e553e'],
          wear: 0.25,
          dirt: 0.35,
          roughness: 0.86,
          metalness: 0.05,
          repeat: 0.45,
          seed: 51,
        }),
        riceShoot: plain('#3b5e36', 0.8, 0.04),
      },
    };
  }, []);

  const shootRef = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    if (!shootRef.current) return;
    shootMatrices.forEach((m, i) => shootRef.current!.setMatrixAt(i, m));
    shootRef.current.instanceMatrix.needsUpdate = true;
  }, [shootMatrices]);

  return (
    <group>
      {waterGeos.map((w, idx) => (
        <mesh key={`w-${idx}`} position={[0, w.y, 0]} geometry={w.geo} material={mats.paddyWater} receiveShadow />
      ))}
      {dikeGeos.map((d, idx) => (
        <mesh key={`d-${idx}`} geometry={d.geo} material={mats.dikeMud} castShadow receiveShadow />
      ))}
      {crossBundGeos.map((cg, idx) => (
        <mesh key={`cb-${idx}`} geometry={cg} material={mats.dikeMud} castShadow receiveShadow />
      ))}
      <instancedMesh
        ref={shootRef}
        args={[shootGeo, mats.riceShoot, shootMatrices.length]}
        castShadow
        receiveShadow
      />
    </group>
  );
};

/** Vòm dù lụa trắng ngà có nếp gấp múi dù, lỗ thoát khí đỉnh & dây dù trải trên bờ ruộng sau khi chạm đất */
const CollapsedSilkCanopy: React.FC<{ pos: V3; appear: number; rotY?: number }> = ({ pos, appear, rotY = 0 }) => {
  const { silkMat, ribMat, lineMat, canopyGeo, ribsGeo, linesGeo } = useMemo(() => {
    const segU = 36;
    const segV = 10;
    const g = new THREE.SphereGeometry(2.45, segU, segV, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i);
      const y = p.getY(i);
      const z = p.getZ(i);
      const ang = Math.atan2(z, x);
      const rad = Math.hypot(x, z);
      // 12 múi nếp gấp lụa xẹp tự nhiên trên bờ đê
      const pleat = Math.abs(Math.sin(ang * 6)) * 0.14 * (rad / 2.45);
      const edgeScallop = 1 + 0.08 * Math.cos(ang * 12) + 0.09 * Math.sin(x * 1.8 - z * 1.4);
      p.setXYZ(
        i,
        x * 1.16 * edgeScallop,
        y * 0.16 + pleat + 0.03 * Math.sin(rad * 3.5),
        z * 0.82 * edgeScallop,
      );
    }
    g.computeVertexNormals();

    // 8 đường gân khâu múi dù sẫm màu tạo chi tiết nhận diện rõ là vòm dù lụa
    const ribs = Array.from({ length: 8 }, (_, k) => {
      const a = (k / 8) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);
      return pipe(
        [
          [ca * 0.25, 0.39, sa * 0.18],
          [ca * 1.35, 0.25, sa * 0.98],
          [ca * 2.65, 0.06, sa * 1.92],
        ],
        0.014,
        10,
      );
    });

    const cords = [-0.65, -0.25, 0.2, 0.6].map((ang, idx) =>
      pipe(
        [
          [-2.5, 0.05, ang * 0.8],
          [-3.4, 0.09, ang * 0.55 + (idx % 2 === 0 ? 0.1 : -0.08)],
          [-4.2, 0.28, ang * 0.25],
        ],
        0.013,
        10,
      ),
    );

    return {
      silkMat: new THREE.MeshStandardMaterial({
        color: '#f2ece0',
        roughness: 0.72,
        metalness: 0.04,
        side: THREE.DoubleSide,
      }),
      ribMat: plain('#b8af9a', 0.82, 0.04),
      lineMat: plain('#dfd8c4', 0.8, 0.05),
      canopyGeo: g,
      ribsGeo: ribs,
      linesGeo: cords,
    };
  }, []);

  if (appear <= 0.01) return null;
  const settleY = (1 - appear) * 1.4;
  const scaleXZ = 0.7 + 0.3 * appear;
  const scaleY = 2.1 - 1.1 * appear;

  return (
    <group position={[pos[0], pos[1] + settleY, pos[2]]} rotation={[0, rotY, 0]}>
      <group scale={[scaleXZ, scaleY, scaleXZ]}>
        <mesh geometry={canopyGeo} material={silkMat} castShadow receiveShadow />
        {ribsGeo.map((rg, idx) => (
          <mesh key={`r-${idx}`} geometry={rg} material={ribMat} />
        ))}
      </group>
      {appear > 0.35 &&
        linesGeo.map((lg, idx) => <mesh key={`l-${idx}`} geometry={lg} material={lineMat} />)}
    </group>
  );
};

/** Vòng gợn sóng bạc & tia nước bắn lên khi phi công đáp xuống ruộng lúa ngập nước */
const PaddyLandingRipples: React.FC<{ t: number; at: number; pos: V3 }> = ({ t, at, pos }) => {
  const dt = t - at;
  if (dt < 0 || dt > 5.5) return null;

  return (
    <group position={pos}>
      {[0, 0.35, 0.75, 1.2].map((delay, idx) => {
        const age = dt - delay;
        if (age <= 0 || age > 4.2) return null;
        const p = age / 4.2;
        const r = 0.45 + Math.pow(p, 0.68) * 4.6;
        const op = (1 - p) * (1 - p) * 0.75;
        return (
          <mesh key={idx} position={[0, 0.03 + idx * 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r, r + 0.12 * (1 - p * 0.5), 40]} />
            <meshBasicMaterial color="#cde2fa" transparent opacity={op} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}
      {dt < 1.15 &&
        Array.from({ length: 14 }, (_, i) => {
          const a = (i / 14) * Math.PI * 2 + 0.3;
          const v = 2.4 + rnd(i * 19 + 7) * 2.2;
          const rx = Math.cos(a) * v * dt * 0.75;
          const rz = Math.sin(a) * v * dt * 0.75;
          const ry = v * 1.15 * dt - 4.9 * dt * dt;
          if (ry < 0) return null;
          return (
            <mesh key={`sp-${i}`} position={[rx, ry, rz]}>
              <sphereGeometry args={[0.075 * (1 - dt * 0.5), 8, 6]} />
              <meshBasicMaterial color="#d8e9fc" transparent opacity={0.85 * (1 - dt / 1.15)} toneMapped={false} />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- Nhân vật 3D: Phi công Mỹ (áo da A-2 + áo phao vàng Mae West) & Dân làng / Du kích Trung Hoa ----------

const LandedAirman: React.FC<{
  pos: V3;
  rotY: number;
  limp?: number;
  waveArm?: number;
  visible?: boolean;
}> = ({ pos, rotY, limp = 0, waveArm = 0, visible = true }) => {
  const mats = useMemo(
    () => ({
      leatherA2: plain('#583624', 0.5, 0.1),
      maeWest: plain('#f2c029', 0.52, 0.08),
      khaki: plain('#786e4e', 0.8, 0.04),
      helmet: plain('#3b2417', 0.55, 0.1),
      skin: plain('#dda985', 0.72, 0.02),
      boots: plain('#291a12', 0.6, 0.12),
      fur: plain('#bfa07a', 0.86, 0.02),
    }),
    [],
  );

  if (!visible) return null;

  return (
    <group position={pos} rotation={[0, rotY, limp * 0.12]}>
      <mesh position={[0, 0.42, -0.11]} rotation={[0, 0, limp * 0.18]} geometry={rbox(0.15, 0.78, 0.15, 0.05)} material={mats.khaki} castShadow />
      <mesh position={[0.04, 0.4, 0.12]} rotation={[0, 0, -limp * 0.25]} geometry={rbox(0.15, 0.76, 0.15, 0.05)} material={mats.khaki} castShadow />
      <mesh position={[0.03, 0.07, -0.11]} geometry={rbox(0.22, 0.13, 0.13, 0.03)} material={mats.boots} />
      <mesh position={[0.06, 0.07, 0.12]} geometry={rbox(0.22, 0.13, 0.13, 0.03)} material={mats.boots} />

      <mesh position={[0, 1.08, 0]} geometry={rbox(0.28, 0.58, 0.43, 0.07)} material={mats.leatherA2} castShadow />
      <mesh position={[0.08, 1.12, -0.1]} geometry={rbox(0.21, 0.4, 0.17, 0.06)} material={mats.maeWest} castShadow />
      <mesh position={[0.08, 1.12, 0.1]} geometry={rbox(0.21, 0.4, 0.17, 0.06)} material={mats.maeWest} castShadow />
      <mesh position={[-0.01, 1.37, 0]} geometry={rbox(0.26, 0.08, 0.3, 0.03)} material={mats.fur} />

      <mesh
        position={[0.04, 1.15, -0.26]}
        rotation={[-0.25 - limp * 0.4, 0, 0.18]}
        geometry={rbox(0.12, 0.52, 0.12, 0.04)}
        material={mats.leatherA2}
        castShadow
      />
      <mesh
        position={[0.06, 1.2 + waveArm * 0.22, 0.26]}
        rotation={[waveArm * 0.85, 0, -0.22 - waveArm * 0.5]}
        geometry={rbox(0.12, 0.52, 0.12, 0.04)}
        material={mats.leatherA2}
        castShadow
      />

      <group position={[0.02, 1.54, 0]}>
        <mesh material={mats.skin} castShadow>
          <sphereGeometry args={[0.115, 14, 12]} />
        </mesh>
        <mesh position={[-0.015, 0.02, 0]} material={mats.helmet} castShadow>
          <sphereGeometry args={[0.124, 14, 12]} />
        </mesh>
      </group>
    </group>
  );
};

/** Ngọn đuốc tre rực lửa hoặc đèn lồng giấy cam ấm (#ff9a3c) */
const BambooTorch: React.FC<{ t: number; seed: number; lantern?: boolean }> = ({ t, seed, lantern = false }) => {
  const flicker = 0.88 + 0.16 * Math.sin(t * 17.3 + seed * 4.1) + 0.09 * Math.cos(t * 26.7 + seed);
  const mats = useMemo(
    () => ({
      bamboo: plain('#7d6840', 0.82, 0.04),
      wrap: plain('#3b2b1e', 0.9, 0.04),
      core: new THREE.MeshBasicMaterial({ color: '#fff6d1', toneMapped: false }),
      mid: new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, opacity: 0.92, toneMapped: false }),
      outer: new THREE.MeshBasicMaterial({ color: '#ff5514', transparent: true, opacity: 0.65, toneMapped: false }),
      lanternRed: new THREE.MeshBasicMaterial({ color: '#ff8528', toneMapped: false }),
    }),
    [],
  );

  if (lantern) {
    return (
      <group>
        <mesh position={[0.16, 0.36, 0]} rotation={[0, 0, -0.55]} material={mats.bamboo}>
          <cylinderGeometry args={[0.016, 0.02, 0.82, 8]} />
        </mesh>
        <group position={[0.38, 0.46, 0]}>
          <mesh material={mats.lanternRed}>
            <cylinderGeometry args={[0.115, 0.115, 0.25, 14]} />
          </mesh>
          <mesh scale={[0.72, 0.75, 0.72]} material={mats.core}>
            <sphereGeometry args={[0.11, 10, 8]} />
          </mesh>
          <mesh position={[0, 0.135, 0]} material={mats.wrap}>
            <cylinderGeometry args={[0.08, 0.118, 0.03, 12]} />
          </mesh>
          <mesh position={[0, -0.135, 0]} material={mats.wrap}>
            <cylinderGeometry args={[0.118, 0.08, 0.03, 12]} />
          </mesh>
        </group>
      </group>
    );
  }

  return (
    <group>
      <mesh position={[0, 0.38, 0]} material={mats.bamboo} castShadow>
        <cylinderGeometry args={[0.022, 0.018, 0.86, 8]} />
      </mesh>
      <mesh position={[0, 0.8, 0]} material={mats.wrap}>
        <cylinderGeometry args={[0.052, 0.032, 0.16, 10]} />
      </mesh>
      <group position={[0, 0.94, 0]} scale={[flicker, 0.92 + flicker * 0.22, flicker]}>
        <mesh scale={[0.9, 1.75, 0.9]} material={mats.outer}>
          <dodecahedronGeometry args={[0.135, 1]} />
        </mesh>
        <mesh position={[0, 0.02, 0]} scale={[0.72, 1.48, 0.72]} material={mats.mid}>
          <dodecahedronGeometry args={[0.115, 1]} />
        </mesh>
        <mesh position={[0, -0.01, 0]} scale={[0.5, 1.1, 0.5]} material={mats.core}>
          <dodecahedronGeometry args={[0.095, 1]} />
        </mesh>
      </group>
      {[0, 1, 2].map((k) => {
        const loop = ((t * 1.4 + seed * 0.37 + k * 0.33) % 1);
        const sx = Math.sin(t * 5 + k * 2.1 + seed) * 0.11 * loop;
        const sz = Math.cos(t * 4.3 + k * 1.7 + seed) * 0.11 * loop;
        return (
          <mesh key={k} position={[sx, 1.05 + loop * 0.55, sz]} material={mats.mid}>
            <octahedronGeometry args={[0.022 * (1 - loop * 0.7), 0]} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Dân làng đội nón lá tre (conical bamboo hat) hoặc Du kích Trung Hoa đeo súng trường cầm đuốc */
const ChineseRescuer: React.FC<{
  pos: V3;
  rotY: number;
  t: number;
  stride: number;
  guerrilla?: boolean;
  carry?: 'torch' | 'lantern' | 'support';
  seed: number;
}> = ({ pos, rotY, t, stride, guerrilla = false, carry = 'torch', seed }) => {
  const mats = useMemo(
    () => ({
      bambooHat: plain('#d8b880', 0.74, 0.04),
      hatRim: plain('#9e7e4c', 0.82, 0.04),
      villagerTunic: plain(seed % 2 === 0 ? '#2b3d54' : '#463b31', 0.85, 0.04),
      guerrillaJacket: plain('#48543f', 0.84, 0.05),
      bandolier: plain('#bda06e', 0.78, 0.06),
      trousers: plain('#242b35', 0.88, 0.03),
      skin: plain('#d8a67e', 0.74, 0.02),
      rifleWood: plain('#5c3a22', 0.68, 0.08),
      rifleSteel: plain('#32383e', 0.42, 0.72),
    }),
    [seed],
  );

  const legSwing = Math.sin(stride) * 0.42;

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.4, -0.1]} rotation={[0, 0, legSwing]} geometry={rbox(0.14, 0.74, 0.14, 0.04)} material={mats.trousers} castShadow />
      <mesh position={[0, 0.4, 0.1]} rotation={[0, 0, -legSwing]} geometry={rbox(0.14, 0.74, 0.14, 0.04)} material={mats.trousers} castShadow />

      <mesh
        position={[0, 1.04, 0]}
        geometry={rbox(0.26, 0.58, 0.4, 0.06)}
        material={guerrilla ? mats.guerrillaJacket : mats.villagerTunic}
        castShadow
      />
      {guerrilla && (
        <>
          <mesh position={[0.02, 1.06, 0]} rotation={[0.58, 0, 0]} geometry={rbox(0.28, 0.07, 0.44, 0.01)} material={mats.bandolier} />
          <group position={[-0.16, 1.12, 0]} rotation={[0.52, 0, -0.15]}>
            <mesh geometry={rbox(0.05, 0.78, 0.08, 0.015)} material={mats.rifleWood} castShadow />
            <mesh position={[0, 0.52, 0]} material={mats.rifleSteel}>
              <cylinderGeometry args={[0.014, 0.016, 0.46, 8]} />
            </mesh>
          </group>
        </>
      )}

      <mesh
        position={[0.08, 1.1, -0.24]}
        rotation={[0, 0, carry === 'support' ? -0.65 : -legSwing * 0.5]}
        geometry={rbox(0.11, 0.48, 0.11, 0.04)}
        material={guerrilla ? mats.guerrillaJacket : mats.villagerTunic}
      />

      <group
        position={[0.14, 1.24, 0.22]}
        rotation={[0, 0, carry === 'support' ? -0.45 : -0.58]}
      >
        <mesh
          position={[0, -0.12, 0]}
          geometry={rbox(0.11, 0.46, 0.11, 0.04)}
          material={guerrilla ? mats.guerrillaJacket : mats.villagerTunic}
          castShadow
        />
        {carry !== 'support' && (
          <group position={[0.04, 0.08, 0]} rotation={[0, 0, 0.52]}>
            <BambooTorch t={t} seed={seed} lantern={carry === 'lantern'} />
          </group>
        )}
      </group>

      <group position={[0.02, 1.48, 0]}>
        <mesh material={mats.skin} castShadow>
          <sphereGeometry args={[0.11, 14, 12]} />
        </mesh>
        {!guerrilla ? (
          <group position={[0, 0.08, 0]} rotation={[0, 0, -0.06]}>
            <mesh material={mats.bambooHat} castShadow>
              <coneGeometry args={[0.32, 0.16, 20]} />
            </mesh>
            <mesh position={[0, -0.075, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.hatRim}>
              <torusGeometry args={[0.315, 0.012, 8, 24]} />
            </mesh>
          </group>
        ) : (
          <group position={[0.01, 0.06, 0]}>
            <mesh material={mats.guerrillaJacket} castShadow>
              <cylinderGeometry args={[0.115, 0.12, 0.1, 14]} />
            </mesh>
            <mesh position={[0.1, -0.03, 0]} geometry={rbox(0.1, 0.018, 0.16, 0.006)} material={mats.guerrillaJacket} />
          </group>
        )}
      </group>
    </group>
  );
};

/** Vệt ánh lửa cam ấm phản chiếu mềm mại (radial gradient, không có viền đĩa cứng) trên mặt nước ruộng */
const SoftWaterTorchGlow: React.FC<{ pos: V3; intensity: number; t: number; seed: number }> = ({
  pos,
  intensity,
  t,
  seed,
}) => {
  const tex = useMemo(() => getWarmGlowTex(), []);
  if (intensity <= 0.02) return null;
  const pulse = 0.88 + 0.12 * Math.sin(t * 14 + seed * 2.7);
  return (
    <mesh
      position={[pos[0] + Math.sin(t * 4.2 + seed) * 0.08, pos[1] + 0.02, pos[2] + 1.4]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[1.4 * pulse, 2.8 * pulse, 1]}
    >
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={0.34 * intensity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

/** Mưa đêm gió mùa xiên nhẹ bắt sáng ánh trăng bạc quanh ống kính */
const MonsoonRainStreaks: React.FC<{ t: number; center: V3 }> = ({ t, center }) => {
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.011, 0.011, 1.3, 4);
    g.rotateZ(0.22);
    return g;
  }, []);
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#a9c9eb',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    [],
  );

  const count = 85;
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    if (!ref.current) return;
    for (let i = 0; i < count; i++) {
      const rx = (rnd(i * 17 + 1) - 0.5) * 32;
      const rz = (rnd(i * 23 + 2) - 0.5) * 26 - 4;
      const fall = ((t * 19 + rnd(i * 31 + 3) * 18) % 18);
      const ry = 12 - fall;
      ref.current.setMatrixAt(i, mat4([center[0] + rx + fall * 0.22, center[1] + ry, center[2] + rz]));
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [t, center[0], center[1], center[2]]);

  return <instancedMesh ref={ref} args={[geo, mat, count]} frustumCulled={false} />;
};

// ---------- Component chính C04S05 ----------

const C04S05: React.FC = () => {
  const t = useT();

  // Cú hạ máy cần cẩu 3 nhịp mượt mà:
  // 1) Mở cảnh trên cao (685.4–689.2 s): Thấy trọn bầu trời đêm xanh thẫm trên đỉnh núi đá karst, 8 vòm dù trắng bung nở & bóng B-25 bay xa
  // 2) Hạ cần cẩu (688.5–694.4 s): Bám theo Doolittle chạm mặt ruộng bậc thang ngập nước tung vòng gợn sóng bạc
  // 3) Cận-trung ấm áp trên bờ đê (698.4–706.2 s): Tiến gần bờ đê ruộng lúa đón đoàn dân làng đội nón lá & du kích cầm đuốc cứu trợ
  const pCrane = prog(t, 688.3, 694.3);
  const pRescueCam = prog(t, 698.4, 703.8);

  const camPos: V3 = [
    lerp(lerp(3.2, 8.2, pCrane), 7.4, pRescueCam),
    lerp(lerp(33.5, 3.65, pCrane), 3.45, pRescueCam),
    lerp(lerp(29.5, 10.6, pCrane), 9.0, pRescueCam),
  ];
  const camLook: V3 = [
    lerp(lerp(-1.2, -0.4, pCrane), -1.2, pRescueCam),
    lerp(lerp(24.0, 1.65, pCrane), 1.95, pRescueCam),
    lerp(lerp(-19.5, -5.8, pCrane), -5.2, pRescueCam),
  ];

  // Chiếc B-25 bỏ không lướt qua yên ngựa núi phía xa rồi loé chớp lửa cam nhỏ trên sườn núi tại "court-martial" (697.5–698.8 s)
  const crashAt = 697.55; // Khớp câu "convinced losing every plane will earn him a court-martial" (695.78–698.90 s)
  const pPlaneAway = prog(t, 685.2, crashAt);
  const crashX = -22;
  const crashZ = -118;
  const crashGroundY = VALLEY_H(crashX, crashZ);
  const b25Pos: V3 = [
    lerp(14, crashX, pPlaneAway),
    lerp(42, crashGroundY + 2.2, pPlaneAway),
    lerp(-54, crashZ, pPlaneAway),
  ];
  const crashFlash = bump(t, crashAt, 1.65);

  // Hành trình Doolittle sau khi đáp ruộng (691.15 s): lội từ vũng ruộng lên bờ đê chính (x = 1.0, tier 1)
  const pWadeToDike = prog(t, 693.1, 697.4);
  const heroDikeZ = contourZ(1, 1.0);
  const doolittlePos: V3 = [
    lerp(1.5, 1.0, pWadeToDike),
    lerp(0.26, TERRACE_TIERS[1].dikeY, pWadeToDike),
    lerp(-1.2, heroDikeZ, pWadeToDike),
  ];

  // Đoàn dân làng đội nón lá & du kích Trung Hoa cầm đuốc tre tiến dọc bờ đê tới cứu trợ (698.0 -> 702.4 s)
  const pVillagers = prog(t, 697.9, 702.35);
  const torchGlow = prog(t, 697.5, 700.2);

  const mainDikeGroup = [
    { xStart: -14.5, xEnd: -0.1, guerrilla: false, carry: 'torch' as const, seed: 11 },
    { xStart: -16.0, xEnd: 0.55, guerrilla: true, carry: 'support' as const, seed: 12 },
    { xStart: -17.6, xEnd: -1.45, guerrilla: false, carry: 'lantern' as const, seed: 13 },
    { xStart: -19.2, xEnd: -2.85, guerrilla: true, carry: 'torch' as const, seed: 14 },
    { xStart: -20.9, xEnd: -4.4, guerrilla: false, carry: 'torch' as const, seed: 15 },
    { xStart: -22.6, xEnd: -6.1, guerrilla: false, carry: 'lantern' as const, seed: 16 },
    { xStart: 13.5, xEnd: 2.15, guerrilla: true, carry: 'torch' as const, seed: 17 },
  ];

  const frontDikeGroup = [
    { xStart: -15.5, xEnd: -5.4, guerrilla: false, carry: 'torch' as const, seed: 21 },
    { xStart: -17.2, xEnd: -6.9, guerrilla: true, carry: 'lantern' as const, seed: 22 },
  ];

  const upperDikeGroup = [
    { xStart: -17.0, xEnd: -3.8, guerrilla: true, carry: 'torch' as const, seed: 31 },
    { xStart: -20.0, xEnd: -6.8, guerrilla: false, carry: 'torch' as const, seed: 32 },
    { xStart: 16.0, xEnd: 7.4, guerrilla: false, carry: 'lantern' as const, seed: 33 },
  ];

  const leadTorchX = lerp(-14.5, -0.1, pVillagers);
  const midTorchX = lerp(-19.2, -2.85, pVillagers);
  const rightTorchX = lerp(13.5, 2.15, pVillagers);
  const frontTorchX = lerp(-15.5, -5.4, pVillagers);

  const preset = STAGE_PRESETS.monsoonNight;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        sky={preset.sky}
        sun={[-26, 48, -38]}
        sunColor="#8eb4e3"
        sunIntensity={1.56 + crashFlash * 0.28}
        ambient={0.33}
        exposure={1.12}
        env={0.32}
        fog={[82, 370]}
        fogColor="#16263d"
        shadowArea={60}
        shadowCenter={[0, 2, -10]}
        post={preset.post}
      >
        <Cam pos={camPos} look={camLook} fov={46} />

        {/* Đèn bù ánh trăng dịu từ hướng trước-trên để vòm dù trắng, áo phao vàng, nón lá và bờ đê luôn rõ khối 100% */}
        <directionalLight position={[18, 38, 42]} color="#9fc2eb" intensity={0.64} />

        {/* Địa hình núi đá đêm Trung Hoa + cây rừng trên các sườn dốc */}
        <Terrain h={VALLEY_H} size={620} seg={210} center={[0, -55]} colors={TERRAIN_PALETTE.chinaMountains} />
        <Scatter
          kind="pine"
          count={210}
          area={[-160, -180, 160, 25]}
          h={VALLEY_H}
          seed={41}
          scale={[0.9, 1.6]}
          avoid={avoidPaddyBasin}
          tint="#7d96a6"
        />
        <Scatter
          kind="broadleaf"
          count={90}
          area={[-130, -145, 130, 20]}
          h={VALLEY_H}
          seed={57}
          scale={[0.8, 1.35]}
          avoid={avoidPaddyBasin}
          tint="#6d8694"
        />
        <Scatter
          kind="rock"
          count={80}
          area={[-140, -160, 140, 25]}
          h={VALLEY_H}
          seed={63}
          scale={[0.9, 2.1]}
          avoid={avoidPaddyBasin}
          tint="#6e7b8a"
        />

        {/* 5 bậc ruộng lúa ngập nước bóng gương có bờ đê đất & khóm mạ lúa non */}
        <RicePaddyTerraces />

        {/* Bóng chiếc B-25 bỏ không trôi khuất vào sương núi & chớp lửa cam nhỏ xa trên sườn núi (court-martial) */}
        {t < crashAt + 0.1 && (
          <group position={b25Pos} rotation={[0.16, -2.42, -0.14]}>
            <B25Mitchell propFast={false} propSpin={t * 3.5} gear={0} navLights />
          </group>
        )}
        <Explosion
          t={t}
          at={crashAt}
          pos={[crashX, crashGroundY + 1.2, crashZ]}
          size={3.6}
          smokeLife={7.5}
          seed={9}
        />
        {crashFlash > 0.01 && (
          <pointLight
            position={[crashX, crashGroundY + 10, crashZ + 8]}
            color="#ff8a2b"
            intensity={110 * crashFlash}
            distance={130}
            decay={1.35}
          />
        )}

        {/* 8 vòm dù lụa trắng ngà ParachuteRaider bung nở trên bầu trời đêm & hạ cánh xuống các bậc ruộng */}
        {CHUTES.map((c, idx) => {
          const dtToLand = c.tLand - t;
          const airborne = dtToLand > 0;
          const yGroup = c.waterY + 5.8 + Math.max(0, dtToLand) * c.speed;
          const xGroup = c.xLand - Math.max(0, dtToLand) * c.driftX;
          const collapseProg = prog(t, c.tLand - 0.1, c.tLand + 1.85);
          const sway = Math.sin(t * 1.65 + c.phase) * 0.16 * Math.min(1, Math.max(0, dtToLand * 0.5));

          return (
            <React.Fragment key={idx}>
              {t < c.tLand + 0.35 && (
                <group
                  position={[xGroup, yGroup, c.zLand]}
                  scale={airborne ? 1 : Math.max(0.01, 1 - (t - c.tLand) * 2.2)}
                >
                  <ParachuteRaider sway={sway} />
                </group>
              )}
              <PaddyLandingRipples t={t} at={c.tLand} pos={[c.xLand, c.waterY, c.zLand]} />
              {idx < 5 && (
                <CollapsedSilkCanopy
                  pos={[
                    c.xLand + (idx === 0 ? 3.4 : 2.3),
                    c.waterY + 0.05,
                    c.zLand - (idx === 0 ? 0.15 : 0.85),
                  ]}
                  appear={collapseProg}
                  rotY={idx === 0 ? 0.25 : c.phase}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* Trung tá Doolittle & các phi công Mỹ dưới mặt đất sau khi thu dù */}
        <LandedAirman
          pos={doolittlePos}
          rotY={pVillagers > 0.2 ? -0.45 : 0.25}
          limp={1 - prog(t, 701.8, 704.5) * 0.45}
          waveArm={bump(t, 700.2, 2.6)}
          visible={t >= CHUTES[0].tLand + 0.15}
        />
        <LandedAirman
          pos={[-4.6, TERRACE_TIERS[0].dikeY, contourZ(0, -4.6) - 0.15]}
          rotY={-0.35}
          limp={0.25}
          waveArm={bump(t, 700.8, 2.8)}
          visible={t >= CHUTES[1].tLand + 0.2}
        />
        <LandedAirman
          pos={[8.8, TERRACE_TIERS[1].dikeY, contourZ(1, 8.8)]}
          rotY={2.6}
          waveArm={bump(t, 701.2, 2.5)}
          visible={t >= CHUTES[2].tLand + 0.2}
        />
        <LandedAirman
          pos={[-2.8, TERRACE_TIERS[2].dikeY, contourZ(2, -2.8)]}
          rotY={-0.3}
          visible={t >= CHUTES[4].tLand + 0.2}
        />

        {/* Đoàn dân làng đội nón lá & du kích Trung Hoa cầm đuốc tre rực lửa và đèn lồng cam ấm (#ff9a3c) */}
        {torchGlow > 0.01 && (
          <group>
            {mainDikeGroup.map((v, i) => {
              const x = lerp(v.xStart, v.xEnd, pVillagers);
              const z = contourZ(1, x) + (i % 2 === 0 ? 0.14 : -0.14);
              const moving = pVillagers > 0.01 && pVillagers < 0.99;
              const dirSign = v.xEnd >= v.xStart ? 0 : Math.PI;
              return (
                <ChineseRescuer
                  key={`m-${i}`}
                  pos={[x, TERRACE_TIERS[1].dikeY, z]}
                  rotY={dikeHeading(1, x) + dirSign}
                  t={t}
                  stride={moving ? t * 7.2 + i * 1.3 : i * 0.4}
                  guerrilla={v.guerrilla}
                  carry={v.carry}
                  seed={v.seed}
                />
              );
            })}

            {frontDikeGroup.map((v, i) => {
              const x = lerp(v.xStart, v.xEnd, pVillagers);
              const z = contourZ(0, x) - 0.1;
              const moving = pVillagers > 0.01 && pVillagers < 0.99;
              return (
                <ChineseRescuer
                  key={`f-${i}`}
                  pos={[x, TERRACE_TIERS[0].dikeY, z]}
                  rotY={dikeHeading(0, x)}
                  t={t}
                  stride={moving ? t * 7.0 + i * 1.7 : 0.2}
                  guerrilla={v.guerrilla}
                  carry={v.carry}
                  seed={v.seed}
                />
              );
            })}

            {upperDikeGroup.map((v, i) => {
              const x = lerp(v.xStart, v.xEnd, pVillagers);
              const z = contourZ(2, x);
              const moving = pVillagers > 0.01 && pVillagers < 0.99;
              const dirSign = v.xEnd >= v.xStart ? 0 : Math.PI;
              return (
                <ChineseRescuer
                  key={`u-${i}`}
                  pos={[x, TERRACE_TIERS[2].dikeY, z]}
                  rotY={dikeHeading(2, x) + dirSign}
                  t={t}
                  stride={moving ? t * 6.8 + i * 1.5 : 0.3}
                  guerrilla={v.guerrilla}
                  carry={v.carry}
                  seed={v.seed}
                />
              );
            })}

            {/* Nguồn sáng ấm #ff9a3c từ đoàn đuốc hắt lên nón lá, áo phao phi công, vòm dù trắng và phản chiếu thật xuống mặt nước ruộng */}
            <pointLight
              position={[leadTorchX + 0.2, TERRACE_TIERS[1].dikeY + 2.25, contourZ(1, leadTorchX) + 0.45]}
              color="#ff9a3c"
              intensity={30 * torchGlow}
              distance={20}
              decay={1.65}
            />
            <pointLight
              position={[midTorchX, TERRACE_TIERS[1].dikeY + 2.25, contourZ(1, midTorchX) + 0.45]}
              color="#ff9a3c"
              intensity={26 * torchGlow}
              distance={18}
              decay={1.65}
            />
            <pointLight
              position={[rightTorchX, TERRACE_TIERS[1].dikeY + 2.25, contourZ(1, rightTorchX) + 0.45]}
              color="#ff9a3c"
              intensity={22 * torchGlow}
              distance={17}
              decay={1.7}
            />
            <pointLight
              position={[frontTorchX, TERRACE_TIERS[0].dikeY + 2.1, contourZ(0, frontTorchX) - 0.4]}
              color="#ff9a3c"
              intensity={20 * torchGlow}
              distance={16}
              decay={1.7}
            />

            {/* Quầng sáng phản chiếu mềm dịu (radial gradient, không có viền đĩa) bổ trợ cho phản xạ specular của nước */}
            <SoftWaterTorchGlow
              pos={[leadTorchX, TERRACE_TIERS[0].waterY, contourZ(1, leadTorchX)]}
              intensity={torchGlow}
              t={t}
              seed={1}
            />
            <SoftWaterTorchGlow
              pos={[midTorchX, TERRACE_TIERS[0].waterY, contourZ(1, midTorchX)]}
              intensity={torchGlow * 0.9}
              t={t}
              seed={2}
            />
            <SoftWaterTorchGlow
              pos={[rightTorchX, TERRACE_TIERS[0].waterY, contourZ(1, rightTorchX)]}
              intensity={torchGlow * 0.85}
              t={t}
              seed={3}
            />
          </group>
        )}

        <MonsoonRainStreaks t={t} center={camLook} />
      </Stage>

      <Label
        t={t}
        text="64 RAIDERS RESCUED"
        x={960}
        y={160}
        from={CUE.c04_s05_rescue_64}
        until={705.6}
      />
    </div>
  );
};

export default C04S05;
