import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { lerp, prog, useT } from '@core/time';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { extrude, extrudeTop, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { FactoryComplex, TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';

// Đường tâm sông Sumida uốn lượn cắt ngang nam khu đô thị Tokyo
function sumidaCenterX(z: number): number {
  return -24 + 0.16 * z + 14 * Math.sin(z / 82);
}

const RIVER_HALF_W = 31; // Bề rộng mặt sông ~62 m

// Khuôn viên vùng cấm Hoàng cung Tokyo (Kōkyo) nằm hẳn ở phía trái (-Z) hành lang bay
const PALACE_CX = 86;
const PALACE_CZ = -66;
const MOAT_HX = 64; // Nửa dài hào nước ngoài theo X (128 m)
const MOAT_HZ = 54; // Nửa rộng hào nước ngoài theo Z (108 m)
const WALL_HX = 46; // Nửa dài thành đá trong theo X (92 m)
const WALL_HZ = 37; // Nửa rộng thành đá trong theo Z (74 m)

function isInRiver(x: number, z: number, margin = 0): boolean {
  return Math.abs(x - sumidaCenterX(z)) < RIVER_HALF_W + margin;
}

function isInPalaceZone(x: number, z: number, margin = 0): boolean {
  return Math.abs(x - PALACE_CX) < MOAT_HX + margin && Math.abs(z - PALACE_CZ) < MOAT_HZ + margin;
}

// Địa hình lòng chảo đô thị Tokyo: khắc lòng sông Sumida, lòng hào nước Hoàng cung và dãy đồi xa phía Bắc
const TOKYO_BASIN_H = heightField({
  seed: 304,
  amp: 1.5,
  scale: 190,
  add: (x, z) => {
    const dRiver = Math.abs(x - sumidaCenterX(z));
    if (dRiver < RIVER_HALF_W + 7) {
      const u = Math.max(0, Math.min(1, (RIVER_HALF_W + 5 - dRiver) / 8));
      const s = u * u * (3 - 2 * u);
      return -3.2 * s;
    }
    const dxP = Math.abs(x - PALACE_CX);
    const dzP = Math.abs(z - PALACE_CZ);
    if (dxP < MOAT_HX + 4 && dzP < MOAT_HZ + 4) {
      if (dxP < WALL_HX - 2 && dzP < WALL_HZ - 2) {
        return 0.4;
      }
      return -2.8;
    }
    // Dãy đồi xa phía Bắc ngoài rìa khu công nghiệp để chân trời có chiều sâu tự nhiên
    if (x > 455) {
      return Math.min(34, Math.pow((x - 455) / 85, 1.45) * 14);
    }
    return 0;
  },
});

// Quỹ đạo 3D của chiếc B-25 #1 (Jimmy Doolittle):
// Bắt đầu ngay phía trên mặt nước xanh sông Sumida (x = -62 m, z = +6 m) -> nghiêng cánh gắt lượn vòng rộng sang phải (z -> +58 m) né hoàn toàn hào nước Hoàng cung bên trái
// -> từ 458.0 s ngóc mũi kéo cao vọt lên 1.200 ft (y = 84 -> 146 m) tiến thẳng vào khu công nghiệp bắc Tokyo
function evalDoolittlePos(t: number): V3 {
  const dt = t - 449.78;
  const x = -62 + dt * 23.8;

  // Vòng lượn tránh Hoàng cung rõ nét từ z = +6 m vọt sang phải z = +58 m rồi chỉnh hướng Bắc z = +28 m
  const skirtRight = prog(t, 450.0, 455.1);
  const alignNorth = prog(t, 455.5, 461.3);
  const z = 6 + 52 * skirtRight - 30 * alignNorth;

  // Độ cao nổi bật rõ dưới góc chim bay (y_cam = 160..182 m): bay ở y = 84 -> 96 m rồi leo vọt lên y = 146 m từ 458.0 s
  const preClimb = prog(t, 449.78, 458.0, Easing.linear);
  const climbP = prog(t, 457.9, 462.85, Easing.bezier(0.3, 0.0, 0.22, 1.0));
  const y = 84 + 12 * preClimb + 50 * climbP;

  return [x, y, z];
}

// Tạo dải mặt nước sông Sumida, bờ kè đá xám và 3 cầu vòm thép chạy xuyên đô thị
const SumidaRiverWater: React.FC = () => {
  const { riverGeo, bankWestGeo, bankEastGeo } = useMemo(() => {
    const zMin = -340;
    const zMax = 340;
    const steps = 64;
    const riverPts: P2[] = [];
    const westBankPts: P2[] = [];
    const eastBankPts: P2[] = [];

    for (let i = 0; i <= steps; i++) {
      const z = lerp(zMin, zMax, i / steps);
      const cx = sumidaCenterX(z);
      riverPts.push([cx - RIVER_HALF_W, z]);
      westBankPts.push([cx - RIVER_HALF_W - 4.2, z]);
      eastBankPts.push([cx + RIVER_HALF_W, z]);
    }
    for (let i = steps; i >= 0; i--) {
      const z = lerp(zMin, zMax, i / steps);
      const cx = sumidaCenterX(z);
      riverPts.push([cx + RIVER_HALF_W, z]);
      westBankPts.push([cx - RIVER_HALF_W, z]);
      eastBankPts.push([cx + RIVER_HALF_W + 4.2, z]);
    }

    return {
      riverGeo: extrudeTop(riverPts, 0.5, 0),
      bankWestGeo: extrudeTop(westBankPts, 1.6, 0.06),
      bankEastGeo: extrudeTop(eastBankPts, 1.6, 0.06),
    };
  }, []);

  const waterMat = useMemo(
    () =>
      paint({
        color: '#1e688f',
        camo: ['#165375', '#2c7ea8'],
        repeat: 0.12,
        wear: 0.08,
        dirt: 0.08,
        roughness: 0.2,
        metalness: 0.26,
        seed: 88,
      }),
    [],
  );
  const stoneEmbankMat = plain('#82858a', 0.85, 0.08);
  const steelBridgeMat = plain('#4d5b66', 0.52, 0.58);
  const deckMat = plain('#78736a', 0.9, 0.05);

  const archRibGeo = useMemo(() => {
    const pts: P2[] = [];
    const span = 62;
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const x = -span / 2 + u * span;
      const y = Math.sin(u * Math.PI) * 5.6;
      pts.push([x, y]);
    }
    for (let i = 20; i >= 0; i--) {
      const u = i / 20;
      const x = -span / 2 + u * span;
      const y = Math.sin(u * Math.PI) * 5.6 - 0.75;
      pts.push([x, y]);
    }
    return extrude(pts, 0.55, 0.03);
  }, []);

  const bridgeZs = [-52, 18, 88];

  return (
    <group>
      <mesh position={[0, -0.75, 0]} geometry={riverGeo} material={waterMat} receiveShadow />
      <mesh position={[0, -0.5, 0]} geometry={bankWestGeo} material={stoneEmbankMat} receiveShadow castShadow />
      <mesh position={[0, -0.5, 0]} geometry={bankEastGeo} material={stoneEmbankMat} receiveShadow castShadow />

      {/* 3 cây cầu vòm thép bắc qua sông Sumida */}
      {bridgeZs.map((bz, idx) => {
        const bx = sumidaCenterX(bz);
        const slope = (sumidaCenterX(bz + 2) - sumidaCenterX(bz - 2)) / 4;
        const rotY = -Math.atan(slope);
        return (
          <group key={`br-${idx}`} position={[bx, 2.2, bz]} rotation={[0, rotY, 0]}>
            <mesh geometry={rbox(68, 0.8, 9.2, 0.06)} material={deckMat} castShadow receiveShadow />
            <mesh position={[0, 0.2, -4.3]} geometry={archRibGeo} material={steelBridgeMat} castShadow />
            <mesh position={[0, 0.2, 4.3]} geometry={archRibGeo} material={steelBridgeMat} castShadow />
            {[-18, 0, 18].map((px) => (
              <mesh key={px} position={[px, -2.0, 0]} geometry={rbox(2.6, 3.8, 9.8, 0.08)} material={stoneEmbankMat} castShadow />
            ))}
          </group>
        );
      })}

      {/* Xà lan chở hàng trên sông */}
      {[
        [-12, -14],
        [42, 7],
      ].map(([bz, dx], i) => (
        <group key={`barge-${i}`} position={[sumidaCenterX(bz) + dx, -0.15, bz]} rotation={[0, 1.38, 0]}>
          <mesh geometry={rbox(14, 1.1, 3.6, 0.12)} material={plain('#3a3530', 0.85)} castShadow />
          <mesh position={[-3.2, 0.9, 0]} geometry={rbox(4.2, 1.0, 2.6, 0.08)} material={plain('#8c7355', 0.85)} />
        </group>
      ))}
    </group>
  );
};

// Khuôn viên Hoàng cung Tokyo (hào nước chữ nhật, tường thành đá xám ishigaki, cầu đôi Nijūbashi, tháp canh trắng & mái cung điện xanh đồng)
const ImperialPalaceCompound: React.FC = () => {
  const moatWaterMat = useMemo(
    () =>
      paint({
        color: '#1b646b',
        camo: ['#154f56', '#257980'],
        repeat: 0.18,
        wear: 0.05,
        dirt: 0.08,
        roughness: 0.2,
        metalness: 0.24,
        seed: 93,
      }),
    [],
  );

  const ishigakiStoneMat = useMemo(
    () =>
      paint({
        color: '#6e7278',
        camo: ['#5a5e63', '#848890'],
        repeat: 0.35,
        wear: 0.3,
        dirt: 0.35,
        roughness: 0.88,
        metalness: 0.06,
        seed: 97,
      }),
    [],
  );

  const copperGreenRoofMat = useMemo(
    () =>
      paint({
        color: '#2f9478',
        camo: ['#267a62', '#3fad8e'],
        repeat: 0.4,
        wear: 0.22,
        dirt: 0.16,
        roughness: 0.46,
        metalness: 0.28,
        seed: 103,
      }),
    [],
  );

  const whitePlasterMat = plain('#edeae0', 0.82, 0.04);
  const darkTimberMat = plain('#4a382b', 0.86, 0.05);
  const gravelCourtMat = plain('#c7c0b0', 0.95, 0.02);
  const lawnGroundMat = plain('#3a5e37', 0.95, 0.02);
  const goldRidgeMat = plain('#e3bc4d', 0.3, 0.74);

  const mainRoofGeo = useMemo(
    () =>
      extrude(
        [
          [-12.5, 0],
          [12.5, 0],
          [9.2, 2.2],
          [5.4, 4.5],
          [0, 6.4],
          [-5.4, 4.5],
          [-9.2, 2.2],
        ],
        34,
        0.08,
      ),
    [],
  );

  const wingRoofGeo = useMemo(
    () =>
      extrude(
        [
          [-8.5, 0],
          [8.5, 0],
          [5.6, 2.1],
          [0, 4.4],
          [-5.6, 2.1],
        ],
        22,
        0.06,
      ),
    [],
  );

  const yaguraRoofGeo = useMemo(
    () =>
      extrude(
        [
          [-4.8, 0],
          [4.8, 0],
          [2.8, 1.6],
          [0, 3.1],
          [-2.8, 1.6],
        ],
        9.2,
        0.05,
      ),
    [],
  );

  return (
    <group position={[PALACE_CX, 0, PALACE_CZ]}>
      <mesh position={[0, 0.25, -MOAT_HZ - 1.5]} geometry={rbox(MOAT_HX * 2 + 6, 1.2, 3, 0.08)} material={ishigakiStoneMat} receiveShadow />
      <mesh position={[0, 0.25, MOAT_HZ + 1.5]} geometry={rbox(MOAT_HX * 2 + 6, 1.2, 3, 0.08)} material={ishigakiStoneMat} receiveShadow />
      <mesh position={[-MOAT_HX - 1.5, 0.25, 0]} geometry={rbox(3, 1.2, MOAT_HZ * 2, 0.08)} material={ishigakiStoneMat} receiveShadow />
      <mesh position={[MOAT_HX + 1.5, 0.25, 0]} geometry={rbox(3, 1.2, MOAT_HZ * 2, 0.08)} material={ishigakiStoneMat} receiveShadow />

      <mesh position={[0, -0.35, 0]} geometry={rbox(MOAT_HX * 2, 0.45, MOAT_HZ * 2, 0.02)} material={moatWaterMat} receiveShadow />

      <mesh position={[0, 1.6, 0]} geometry={rbox(WALL_HX * 2 + 3.2, 3.6, WALL_HZ * 2 + 3.2, 0.2)} material={ishigakiStoneMat} castShadow receiveShadow />
      <mesh position={[0, 4.6, 0]} geometry={rbox(WALL_HX * 2, 3.2, WALL_HZ * 2, 0.16)} material={ishigakiStoneMat} castShadow receiveShadow />
      <mesh position={[0, 6.25, 0]} geometry={rbox(WALL_HX * 2 - 1.6, 0.2, WALL_HZ * 2 - 1.6, 0.04)} material={lawnGroundMat} receiveShadow />

      <mesh position={[0, 6.95, WALL_HZ - 0.8]} geometry={rbox(WALL_HX * 2 - 4, 1.3, 0.75, 0.03)} material={whitePlasterMat} castShadow />
      <mesh position={[0, 6.95, -WALL_HZ + 0.8]} geometry={rbox(WALL_HX * 2 - 4, 1.3, 0.75, 0.03)} material={whitePlasterMat} castShadow />
      <mesh position={[WALL_HX - 0.8, 6.95, 0]} geometry={rbox(0.75, 1.3, WALL_HZ * 2 - 4, 0.03)} material={whitePlasterMat} castShadow />
      <mesh position={[-WALL_HX + 0.8, 6.95, 0]} geometry={rbox(0.75, 1.3, WALL_HZ * 2 - 4, 0.03)} material={whitePlasterMat} castShadow />

      {[
        [-5, 45.5],
        [6, 45.5],
      ].map(([bx, bz], idx) => (
        <group key={`niju-${idx}`} position={[bx, 2.2, bz]}>
          <mesh geometry={rbox(6.4, 1.2, 18.5, 0.08)} material={ishigakiStoneMat} castShadow receiveShadow />
          <mesh position={[-2.9, 0.95, 0]} geometry={rbox(0.45, 0.8, 18.2, 0.03)} material={whitePlasterMat} />
          <mesh position={[2.9, 0.95, 0]} geometry={rbox(0.45, 0.8, 18.2, 0.03)} material={whitePlasterMat} />
        </group>
      ))}

      {[
        [-WALL_HX + 5.5, WALL_HZ - 5.5],
        [WALL_HX - 5.5, WALL_HZ - 5.5],
        [-WALL_HX + 5.5, -WALL_HZ + 5.5],
      ].map(([yx, yz], i) => (
        <group key={`yagura-${i}`} position={[yx, 6.3, yz]}>
          <mesh position={[0, 2.2, 0]} geometry={rbox(8.2, 4.4, 8.2, 0.06)} material={whitePlasterMat} castShadow receiveShadow />
          <mesh position={[0, 4.3, 0]} geometry={yaguraRoofGeo} material={copperGreenRoofMat} castShadow />
          <mesh position={[0, 6.3, 0]} geometry={rbox(5.6, 3.0, 5.6, 0.05)} material={whitePlasterMat} castShadow />
          <mesh position={[0, 7.6, 0]} scale={[0.72, 0.78, 0.72]} geometry={yaguraRoofGeo} material={copperGreenRoofMat} castShadow />
        </group>
      ))}

      <mesh position={[2, 6.36, 9]} geometry={rbox(44, 0.12, 26, 0.03)} material={gravelCourtMat} receiveShadow />

      <group position={[0, 6.4, -4]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 1.0, 0]} geometry={rbox(22, 2.0, 32, 0.08)} material={ishigakiStoneMat} receiveShadow />
        <mesh position={[0, 4.1, 0]} geometry={rbox(19.5, 4.4, 29.5, 0.06)} material={darkTimberMat} castShadow receiveShadow />
        <mesh position={[0, 4.1, 0]} geometry={rbox(18.2, 3.8, 30.2, 0.04)} material={whitePlasterMat} />
        <mesh position={[0, 6.2, 0]} geometry={mainRoofGeo} material={copperGreenRoofMat} castShadow receiveShadow />
        <mesh position={[0, 12.65, 0]} geometry={rbox(0.55, 0.55, 22.5, 0.05)} material={goldRidgeMat} />
      </group>

      {[-25, 25].map((wx, idx) => (
        <group key={`wing-${idx}`} position={[wx, 6.4, 2]}>
          <mesh position={[0, 2.7, 0]} geometry={rbox(14.5, 3.8, 19.5, 0.06)} material={darkTimberMat} castShadow receiveShadow />
          <mesh position={[0, 4.5, 0]} geometry={wingRoofGeo} material={copperGreenRoofMat} castShadow receiveShadow />
          <mesh position={[0, 8.95, 0]} geometry={rbox(0.42, 0.42, 14.5, 0.04)} material={goldRidgeMat} />
        </group>
      ))}
      <mesh position={[-13, 8.6, -1]} geometry={rbox(11, 2.8, 4.2, 0.04)} material={copperGreenRoofMat} castShadow />
      <mesh position={[13, 8.6, -1]} geometry={rbox(11, 2.8, 4.2, 0.04)} material={copperGreenRoofMat} castShadow />
      <group position={[1, 6.4, 23]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 2.2, 0]} geometry={rbox(7.5, 4.4, 15.5, 0.05)} material={darkTimberMat} castShadow />
        <mesh position={[0, 4.2, 0]} scale={[0.68, 0.72, 0.78]} geometry={wingRoofGeo} material={copperGreenRoofMat} castShadow />
      </group>
    </group>
  );
};

// Mạng lưới đại lộ đá sáng màu của đô thị Tokyo giúp kết nối các ô phố và làm nổi bật tương phản của thân B-25 Olive Drab
const TokyoAvenueGrid: React.FC = () => {
  const avenueMat = plain('#978f80', 0.93, 0.03);
  const northRoadMat = plain('#868075', 0.94, 0.03);
  return (
    <group>
      {/* Các đại lộ Bắc-Nam phía Đông Hoàng cung */}
      {[12, 50, 88, 126].map((az) => (
        <mesh key={`av-ns-${az}`} position={[215, 0.03, az]} geometry={rbox(390, 0.06, 8.5, 0.02)} material={avenueMat} receiveShadow />
      ))}
      {/* Các đại lộ Đông-Tây từ bờ Bắc sông Sumida tới khu công nghiệp Bắc Tokyo */}
      {[42, 86, 130, 174, 212].map((ax) => {
        const zStart = ax < 160 ? -2 : -150;
        const zEnd = 155;
        return (
          <mesh
            key={`av-ew-${ax}`}
            position={[ax, 0.035, (zStart + zEnd) * 0.5]}
            geometry={rbox(8.0, 0.06, zEnd - zStart, 0.02)}
            material={avenueMat}
            receiveShadow
          />
        );
      })}
      {/* Các tuyến đường trục công nghiệp Bắc Tokyo (không dùng tấm bê tông vuông cắt mép) */}
      {[-95, -30, 35, 100, 162].map((fz) => (
        <mesh key={`ind-ns-${fz}`} position={[325, 0.03, fz]} geometry={rbox(250, 0.06, 9.5, 0.02)} material={northRoadMat} receiveShadow />
      ))}
      {[264, 336, 408].map((fx) => (
        <mesh key={`ind-ew-${fx}`} position={[fx, 0.035, 15]} geometry={rbox(9.5, 0.06, 360, 0.02)} material={northRoadMat} receiveShadow />
      ))}
    </group>
  );
};

// Các ô phố Tokyo trải hai bờ sông Sumida, phía Đông Hoàng cung và ven khu công nghiệp Bắc
const CITY_BLOCKS: { x: number; z: number; variant: number; rotY: number }[] = (() => {
  const out: { x: number; z: number; variant: number; rotY: number }[] = [];
  for (let x = -115; x <= 195; x += 44) {
    for (let z = -155; z <= 165; z += 38) {
      if (isInRiver(x, z, 22)) continue;
      if (isInPalaceZone(x, z, 21)) continue;
      out.push({
        x,
        z,
        variant: Math.abs(Math.round(x * 3 + z * 7)) % 3,
        rotY: Math.abs(Math.round(x + z)) % 2 === 0 ? 0 : Math.PI / 2,
      });
    }
  }
  // Thêm các dãy phố công nhân bao quanh rìa Đông & Tây khu xưởng Bắc Tokyo để khung hình đầy đặn tới tận chân trời
  for (const [rx, rz] of [
    [232, 182],
    [282, 185],
    [338, 180],
    [392, 178],
    [235, -148],
    [292, -154],
    [354, -146],
    [422, -112],
    [428, -42],
    [426, 28],
    [424, 96],
    [422, 158],
  ] as const) {
    out.push({ x: rx, z: rz, variant: (rx + rz) % 3, rotY: rx % 2 === 0 ? 0 : Math.PI / 2 });
  }
  return out;
})();

// Khu công nghiệp Bắc Tokyo (Northern Factory District) với hàng loạt xưởng mái răng cưa và ống khói gạch cao 24.6 m
const NORTHERN_FACTORIES: { x: number; z: number; variant: number; rotY: number }[] = [
  { x: 230, z: -98, variant: 0, rotY: 0 },
  { x: 234, z: -32, variant: 1, rotY: Math.PI },
  { x: 230, z: 34, variant: 0, rotY: 0 },
  { x: 236, z: 102, variant: 1, rotY: 0 },
  { x: 298, z: -108, variant: 1, rotY: 0 },
  { x: 302, z: -38, variant: 0, rotY: 0 },
  { x: 306, z: 32, variant: 1, rotY: Math.PI },
  { x: 300, z: 100, variant: 0, rotY: 0 },
  { x: 372, z: -92, variant: 0, rotY: 0 },
  { x: 376, z: -22, variant: 1, rotY: 0 },
  { x: 374, z: 48, variant: 0, rotY: Math.PI },
  { x: 372, z: 118, variant: 1, rotY: 0 },
];

const AVOID_PALACE_BUILDINGS = (x: number, z: number): boolean => {
  const dx = x - PALACE_CX;
  const dz = z - PALACE_CZ;
  if (Math.abs(dx) > WALL_HX - 4 || Math.abs(dz) > WALL_HZ - 4) return true;
  if (dx > -34 && dx < 34 && dz > -22 && dz < 26) return true;
  return false;
};

const AVOID_WATER_AND_STRUCTURES = (x: number, z: number): boolean => {
  if (isInRiver(x, z, 10)) return true;
  if (isInPalaceZone(x, z, 5)) return true;
  return false;
};

const C03S04: React.FC = () => {
  const t = useT();

  // Vị trí, vận tốc & gia tốc ngang của chiếc B-25 Doolittle
  const dtStep = 0.05;
  const pPrev = evalDoolittlePos(t - dtStep);
  const pCur = evalDoolittlePos(t);
  const pNext = evalDoolittlePos(t + dtStep);

  const vx = (pNext[0] - pPrev[0]) / (2 * dtStep);
  const vy = (pNext[1] - pPrev[1]) / (2 * dtStep);
  const vz = (pNext[2] - pPrev[2]) / (2 * dtStep);
  const speedHoriz = Math.max(0.1, Math.hypot(vx, vz));

  const ax = (pNext[0] - 2 * pCur[0] + pPrev[0]) / (dtStep * dtStep);
  const az = (pNext[2] - 2 * pCur[2] + pPrev[2]) / (dtStep * dtStep);
  const latAccel = (-vx * az + vz * ax) / speedHoriz;

  const b25Yaw = Math.atan2(-vz, vx);
  const b25Pitch = Math.atan2(vy, speedHoriz);
  const b25Roll = Math.max(-0.5, Math.min(0.54, -latAccel * 0.068));

  // Đại cảnh chim bay trên cao (y = 158 -> 182 m, đúng chuẩn 155–185 m) bám cận vừa đủ để B-25 sắc nét trên nền sông Sumida, Hoàng cung và cụm nhà máy Bắc Tokyo
  const pPalace = prog(t, CUE.c03_s04_sumida_river, 455.4);
  const pFactory = prog(t, 456.8, 462.76);

  const camPos: V3 = [
    pCur[0] - lerp(48, 52, pFactory),
    lerp(160, 182, prog(t, 449.78, 462.76, Easing.inOut(Easing.quad))),
    lerp(24, 62, pPalace) + lerp(0, -8, pFactory),
  ];

  const camLook: V3 = [
    pCur[0] + lerp(46, 36, pPalace) + lerp(0, 20, pFactory),
    lerp(34, 40, pPalace) + lerp(0, 52, pFactory),
    lerp(-18, -18, pPalace) + lerp(0, 34, pFactory),
  ];

  const smokeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#dde2e6',
        transparent: true,
        opacity: 0.36,
        roughness: 0.95,
        depthWrite: false,
      }),
    [],
  );

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.tokyoNoon}
        fog={[280, 1020]}
        shadowArea={175}
        shadowCenter={[pCur[0] + 25, 24, -10]}
      >
        <Cam pos={camPos} look={camLook} fov={46} />

        {/* Nền địa hình lòng chảo đô thị Tokyo */}
        <Terrain h={TOKYO_BASIN_H} size={1350} seg={240} center={[160, 0]} colors={TERRAIN_PALETTE.tokyoUrban} grainRepeat={58} />

        {/* Mạng lưới đại lộ sáng màu làm nổi bật kết cấu đô thị và bóng dáng B-25 */}
        <TokyoAvenueGrid />

        {/* Sông Sumida xanh thẫm, kè đá và 3 cây cầu thép */}
        <SumidaRiverWater />

        {/* Khuôn viên vùng cấm Hoàng cung Tokyo bên trái (hào nước chữ nhật, tường đá, cầu Nijūbashi, mái đồng xanh & rừng tùng) */}
        <ImperialPalaceCompound />
        <Scatter
          kind="pine"
          count={120}
          area={[PALACE_CX - WALL_HX + 3, PALACE_CZ - WALL_HZ + 3, PALACE_CX + WALL_HX - 3, PALACE_CZ + WALL_HZ - 3]}
          h={() => 6.3}
          seed={404}
          scale={[1.05, 1.65]}
          tint="#84ad86"
          avoid={AVOID_PALACE_BUILDINGS}
        />

        {/* Cây xanh xen giữa các đại lộ Tokyo & đồi xa phía Bắc */}
        <Scatter
          kind="broadleaf"
          count={210}
          area={[-130, -180, 480, 210]}
          h={TOKYO_BASIN_H}
          seed={411}
          scale={[0.85, 1.4]}
          avoid={AVOID_WATER_AND_STRUCTURES}
        />

        {/* Các ô phố nhà gỗ Tokyo hai bên bờ sông Sumida & ven khu xưởng */}
        {CITY_BLOCKS.map((b, idx) => (
          <group key={`city-${idx}`} position={[b.x, 0, b.z]} rotation={[0, b.rotY, 0]}>
            <TokyoRowhouseBlock variant={b.variant} />
          </group>
        ))}

        {/* Khu công nghiệp bắc Tokyo với 12 tổ hợp nhà xưởng mái răng cưa & 24 ống khói gạch cao 24.6 m */}
        {NORTHERN_FACTORIES.map((f, idx) => (
          <group key={`fac-${idx}`} position={[f.x, 0, f.z]} rotation={[0, f.rotY, 0]}>
            <FactoryComplex variant={f.variant} damage={0} />
            {[0, 1, 2].map((k) => {
              const drift = ((t * 0.45 + k * 0.33 + idx * 0.17) % 1);
              return (
                <mesh
                  key={`smk-${k}`}
                  position={[20.5 + drift * 7.5, 25.4 + drift * 4.5, 17.0 - drift * 2.5]}
                  scale={1 + drift * 1.4}
                  material={smokeMat}
                >
                  <icosahedronGeometry args={[1.25, 1]} />
                </mesh>
              );
            })}
          </group>
        ))}

        {/* Chiếc B-25B Mitchell số 1 của Jimmy Doolittle nghiêng cánh lượn vòng tránh Hoàng cung và kéo cao lên 1.200 ft */}
        <group position={pCur} rotation={[0, b25Yaw, 0]}>
          <group rotation={[0, 0, b25Pitch]}>
            <group rotation={[b25Roll, 0, 0]}>
              <B25Mitchell
                gear={0}
                propFast={true}
                propSpin={t * 44}
                bombBay={0}
                broomsticks={true}
                turretYaw={0.08}
                turretPitch={0.14}
                seed={1}
              />
            </group>
          </group>
        </group>
      </Stage>

      <Label
        t={t}
        text="1,200 FT · NORTH TOKYO"
        x={450}
        y={148}
        size={48}
        from={CUE.c03_s04_climbs_1200ft}
        until={462.4}
      />
    </AbsoluteFill>
  );
};

export default C03S04;
