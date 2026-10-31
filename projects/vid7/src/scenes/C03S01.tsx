import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain } from '@skill/military/3d/terrain';
import { fbm, grain, plain } from '@skill/military/3d/materials';
import { rbox } from '@skill/military/3d/geom';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, waveY } from '../parts/OceanSurface';
import { Type88Flak } from '../parts/Type88Flak';
import { TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';

const SWELL = 0.62;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = clamp01((x - e0) / Math.max(1e-5, e1 - e0));
  return u * u * (3 - 2 * u);
};

/** Smooth-minimum bo tròn mũi đất ven biển nối bãi cát phía Tây (x ≈ 0) với bờ vịnh phía Bắc/Trái (-Z). */
function smin(a: number, b: number, k: number): number {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/**
 * Khoảng cách có dấu tính từ mép nước biển vào đất liền (m):
 *  - dInland = 0: đường mép nước tự nhiên (y = 0)
 *  - dInland < 0: ngoài khơi & mặt vịnh xanh bên mạn trái (-Z)
 *  - dInland > 0: bãi cát vàng rộng -> thềm thị trấn ven vịnh -> đồi thông thoai thoải phía +Z
 */
function dInland(x: number, z: number): number {
  // Bờ biển chính phía Tây tại x ≈ 0 (biên đội B-25 vọt qua đúng mốc 384.94 s)
  const dWest = x - (4.6 * Math.sin(z * 0.032) + 2.2 * Math.cos(z * 0.076));
  // Đường bờ vịnh uốn lượn tự nhiên bên mạn -Z (z ≈ -26..-38) phơi bày rõ bãi cát vàng & bọt sóng trước ống kính
  const zShoreBay = -26.5 - 0.042 * x + 4.8 * Math.sin(x * 0.042) + 2.0 * Math.cos(x * 0.085);
  const dBay = z - zShoreBay;
  return smin(dWest, dBay, 30);
}

// 5 khẩu đội pháo phòng không Type 88 75mm (sandbags=true, elev=0.18, recoil=0) đặt tại các mũi cỏ & gò thoáng trước phố
const FLAK_SITES: { x: number; z: number; y: number; yaw: number }[] = [
  { x: 50, z: -1.5, y: 2.85, yaw: 2.35 },
  { x: 78, z: 17.2, y: 3.05, yaw: 2.15 },
  { x: 118, z: 17.0, y: 3.05, yaw: 2.2 },
  { x: 162, z: 1.5, y: 2.85, yaw: 2.28 },
  { x: 178, z: 16.8, y: 3.05, yaw: 2.12 },
];

/** Hàm độ cao địa hình bờ biển Nhật Bản — bãi cát rộng thoải tự nhiên lên thềm thị trấn và đồi thông xa. */
const hCoast = (x: number, z: number): number => {
  const d = dInland(x, z);
  if (d < 0) {
    return Math.max(-7.5, d * 0.16);
  }

  // Bãi cát rộng 20 m thoải nhẹ từ mép nước y = 0 lên thềm thị trấn y = 2.35 m
  const beachRise = 2.35 * smoothstep(0, 20.5, d);

  // Thềm phẳng thị trấn & gò pháo phòng không (x ∈ [28, 228], z ∈ [-10, +34])
  const townMask =
    smoothstep(24, 36, x) *
    (1 - smoothstep(218, 236, x)) *
    smoothstep(-12, -4, z) *
    (1 - smoothstep(30, 42, z));

  // Đồi thông ven biển dốc thoai thoải ở hậu cảnh xa (z > 50 hoặc x > 224)
  const hillDist = Math.max(0, z - 50) * 0.16 + Math.max(0, x - 224) * 0.15;
  const hillMask = smoothstep(28, 160, d);
  const hillWave = 0.75 + 0.5 * fbm(x / 78 + 12, z / 78 + 24, 17, 3);
  const hillCrest =
    Math.max(0, fbm(x / 62 + 5, z / 62 + 9, 29, 4) - 0.38) * 14 * smoothstep(4, 32, hillDist);
  const micro = (fbm(x / 28, z / 28, 41, 2) - 0.5) * 0.22 * (1 - townMask);

  let y = beachRise + hillMask * hillDist * hillWave + hillMask * hillCrest + micro;

  // Mặt gò phẳng nâng cao nhẹ cho các công sự pháo Type 88
  for (const site of FLAK_SITES) {
    const dist = Math.hypot(x - site.x, z - site.z);
    const w = 1 - smoothstep(4.4, 9.2, dist);
    if (w > 0) y = lerp(y, site.y, w);
  }
  return y;
};

/** Dải cát vàng rộng ven biển & cát ướt thủy triều ôm mượt theo đường bờ vịnh dInland ∈ [-4.5, 22.5]. */
const BEACH_SAND_GEO = (() => {
  const x0 = -18;
  const x1 = 265;
  const z0 = -64;
  const z1 = 155;
  const nx = 162;
  const nz = 128;

  const gridX = (i: number) => x0 + ((x1 - x0) * i) / nx;
  const gridZ = (j: number) => z0 + ((z1 - z0) * j) / nz;

  const V = (nx + 1) * (nz + 1);
  const dArr = new Float32Array(V);
  const yArr = new Float32Array(V);
  const colArr = new Float32Array(V * 3);

  const cSeabed = new THREE.Color('#646856');
  const cWetSand = new THREE.Color('#978563');
  const cDrySandA = new THREE.Color('#e1cea5');
  const cDrySandB = new THREE.Color('#ceb98d');
  const cGrassLow = new THREE.Color(TERRAIN_PALETTE.japanCoast.low);
  const tmp = new THREE.Color();

  for (let j = 0; j <= nz; j++) {
    const z = gridZ(j);
    for (let i = 0; i <= nx; i++) {
      const x = gridX(i);
      const idx = j * (nx + 1) + i;
      const d = dInland(x, z);
      dArr[idx] = d;

      const lift =
        d < -2.5
          ? lerp(-0.08, 0.05, smoothstep(-4.8, -2.5, d))
          : d < 16.5
            ? 0.055
            : lerp(0.055, -0.14, smoothstep(16.5, 22.4, d));
      yArr[idx] = hCoast(x, z) + lift;

      const dNoisy = d + (fbm(x / 7.5, z / 7.5, 53, 2) - 0.5) * 2.2;
      const sandPatch = fbm(x / 5.5, z / 5.5, 71, 2);

      if (dNoisy < -0.5) {
        tmp.copy(cSeabed).lerp(cWetSand, smoothstep(-3.8, -0.5, dNoisy));
      } else if (dNoisy < 1.6) {
        tmp.copy(cWetSand).lerp(cDrySandA, smoothstep(-0.5, 1.6, dNoisy));
      } else if (dNoisy < 15.5) {
        tmp.copy(cDrySandB).lerp(cDrySandA, sandPatch);
      } else {
        tmp.copy(cDrySandB).lerp(cDrySandA, sandPatch).lerp(cGrassLow, smoothstep(15.5, 21.8, dNoisy));
      }
      colArr[idx * 3] = tmp.r;
      colArr[idx * 3 + 1] = tmp.g;
      colArr[idx * 3 + 2] = tmp.b;
    }
  }

  const pos: number[] = [];
  const col: number[] = [];
  const uv: number[] = [];

  const pushV = (i: number, j: number) => {
    const idx = j * (nx + 1) + i;
    const x = gridX(i);
    const z = gridZ(j);
    pos.push(x, yArr[idx], z);
    col.push(colArr[idx * 3], colArr[idx * 3 + 1], colArr[idx * 3 + 2]);
    uv.push(x * 0.08, z * 0.08);
  };

  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      const i00 = j * (nx + 1) + i;
      const i10 = i00 + 1;
      const i01 = i00 + (nx + 1);
      const i11 = i01 + 1;
      const minD = Math.min(dArr[i00], dArr[i10], dArr[i01], dArr[i11]);
      const maxD = Math.max(dArr[i00], dArr[i10], dArr[i01], dArr[i11]);
      if (maxD < -4.6 || minD > 22.5) continue;

      pushV(i, j);
      pushV(i, j + 1);
      pushV(i + 1, j);

      pushV(i + 1, j);
      pushV(i, j + 1);
      pushV(i + 1, j + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
})();

/** Viền bọt sóng trắng tự nhiên dọc đúng giao tuyến mặt sóng waveY(x,z,t) và bãi cát thoải. */
const SurfWashRibbon: React.FC<{ t: number }> = ({ t }) => {
  const tk = Math.round(t * 30) / 30;

  const geo = useMemo(() => {
    const x0 = -12;
    const x1 = 255;
    const z0 = -56;
    const z1 = 145;
    const nx = 136;
    const nz = 108;
    const gx = (i: number) => x0 + ((x1 - x0) * i) / nx;
    const gz = (j: number) => z0 + ((z1 - z0) * j) / nz;

    const V = (nx + 1) * (nz + 1);
    const dArr = new Float32Array(V);
    const yArr = new Float32Array(V);
    const aArr = new Float32Array(V);

    for (let j = 0; j <= nz; j++) {
      const z = gz(j);
      for (let i = 0; i <= nx; i++) {
        const x = gx(i);
        const idx = j * (nx + 1) + i;
        const d = dInland(x, z);
        dArr[idx] = d;
        if (d < -4.8 || d > 4.6) continue;

        const wy = waveY(x, z, tk, SWELL);
        const hy = hCoast(x, z) + 0.055;
        const diff = hy - wy;
        yArr[idx] = Math.max(hy, wy) + 0.036;

        const band = Math.max(0, 1 - Math.abs(diff + 0.02) / 0.36);
        const ripple = 0.55 + 0.45 * Math.sin(d * 2.8 - tk * 2.3 + fbm(x * 0.14, z * 0.14, 19, 2) * 4.8);
        const lace = 0.5 + 0.5 * fbm(x * 0.22 + tk * 0.16, z * 0.22, 37, 2);
        aArr[idx] = clamp01(band * (0.54 + 0.46 * ripple) * lace * 0.96);
      }
    }

    const pos: number[] = [];
    const col: number[] = [];
    const emit = (i: number, j: number) => {
      const idx = j * (nx + 1) + i;
      pos.push(gx(i), yArr[idx], gz(j));
      col.push(0.94, 0.98, 1.0, aArr[idx]);
    };

    for (let j = 0; j < nz; j++) {
      for (let i = 0; i < nx; i++) {
        const i00 = j * (nx + 1) + i;
        const i10 = i00 + 1;
        const i01 = i00 + (nx + 1);
        const i11 = i01 + 1;
        const minD = Math.min(dArr[i00], dArr[i10], dArr[i01], dArr[i11]);
        const maxD = Math.max(dArr[i00], dArr[i10], dArr[i01], dArr[i11]);
        if (maxD < -3.9 || minD > 3.8) continue;
        if (aArr[i00] + aArr[i10] + aArr[i01] + aArr[i11] < 0.015) continue;

        emit(i, j);
        emit(i, j + 1);
        emit(i + 1, j);

        emit(i + 1, j);
        emit(i, j + 1);
        emit(i + 1, j + 1);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4));
    g.computeVertexNormals();
    return g;
  }, [tk]);

  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        roughness: 0.26,
        metalness: 0.04,
      }),
    [],
  );

  return <mesh geometry={geo} material={mat} />;
};

// Các cụm nhà phố gỗ Nhật Bản ven vịnh (chừa khoảng quảng trường mở nhìn thẳng ra bãi cát vàng & mặt nước,
// và KHÔNG đặt nhà ở z > 10 để tiền cảnh ụ pháo Type 88 tại z = 20.5 hoàn toàn thoáng đãng trước ống kính!)
const TOWN_BLOCKS: { x: number; z: number; rotY: number; variant: number }[] = [
  { x: 74, z: 2.5, rotY: 0, variant: 0 },
  { x: 132, z: 3.0, rotY: 0.02, variant: 1 },
  { x: 196, z: 3.5, rotY: -0.02, variant: 2 },
  { x: 242, z: 4.0, rotY: 0, variant: 0 },
];

const avoidTrees = (x: number, z: number): boolean => {
  if (dInland(x, z) < 17.5) return true;
  // Chừa thoáng hoàn toàn hành lang từ camera (z ≈ 40) nhìn qua các ụ pháo Type 88 xuống phố và bãi cát
  if (x > 34 && x < 218 && z > -16 && z < 44) return true;
  for (const s of FLAK_SITES) {
    if (Math.hypot(x - s.x, z - s.z) < 13.0) return true;
  }
  return false;
};

const avoidBushes = (x: number, z: number): boolean => {
  if (dInland(x, z) < 15.5) return true;
  for (const b of TOWN_BLOCKS) {
    if (Math.abs(x - b.x) < 18.8 && Math.abs(z - b.z) < 12.2) return true;
  }
  if (Math.abs(z + 10.6) < 4.0) return true;
  if ((Math.abs(x - 103) < 4.5 || Math.abs(x - 219) < 4.5) && z > -13 && z < 14) return true;
  if (z > 24 && z < 44 && x > 30 && x < 200) return true;
  for (const s of FLAK_SITES) {
    if (Math.hypot(x - s.x, z - s.z) < 8.8) return true;
  }
  return false;
};

const avoidBeachRocks = (x: number, z: number): boolean => {
  const d = dInland(x, z);
  if (d < 2.0 || d > 15.0) return true;
  for (const s of FLAK_SITES) {
    if (Math.hypot(x - s.x, z - s.z) < 10.0) return true;
  }
  return false;
};

const C03S01: React.FC = () => {
  const t = useT();

  const sandMat = useMemo(() => {
    const tex = grain(17, 7).clone();
    tex.needsUpdate = true;
    tex.repeat.set(1, 1);
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: tex,
      roughness: 0.93,
      metalness: 0.02,
    });
  }, []);

  const roadMat = useMemo(() => plain('#9e927d', 0.94, 0.02), []);
  const poleMat = useMemo(() => plain('#594533', 0.88, 0.05), []);

  // ==================== QUỸ ĐẠO BIÊN ĐỘI 3 CHIẾC B-25B MITCHELL ====================
  // Đúng CUE.c03_s01_blast_shoreline (384.94 s), chiếc dẫn đầu Doolittle vọt qua đường bờ biển x = 0 ở 200 mph!
  const speed = 19.5;
  const xLead = (t - CUE.c03_s01_blast_shoreline) * speed;

  // Hạ độ cao từ y = 28 m xuống đúng 50 feet (15.2 m) tại CUE.c03_s01_drop_50ft (372.52 s)
  const pDrop = prog(t, 368.7, CUE.c03_s01_drop_50ft + 0.35);
  const baseAlt = lerp(28.0, 15.2, pDrop);
  const pitchLead = -0.058 * bump(t, 368.7, 4.15) + 0.008 * Math.sin(t * 1.9);

  const formation: { pos: V3; roll: number; pitch: number; seed: number; spinOff: number }[] = [
    {
      pos: [xLead, baseAlt + 0.16 * Math.sin(t * 2.1), 0],
      roll: 0.015 * Math.sin(t * 1.45),
      pitch: pitchLead,
      seed: 18,
      spinOff: 0,
    },
    {
      pos: [xLead - 18.0, baseAlt + 1.35 + 0.18 * Math.sin(t * 2.0 + 1.2), 16.8],
      roll: 0.017 * Math.sin(t * 1.38 + 0.9),
      pitch: pitchLead * 0.95,
      seed: 18,
      spinOff: 1.7,
    },
    {
      pos: [xLead - 19.5, baseAlt + 1.65 + 0.18 * Math.sin(t * 2.15 + 2.4), -16.8],
      roll: 0.017 * Math.sin(t * 1.52 + 2.1),
      pitch: pitchLead * 0.95,
      seed: 18,
      spinOff: 3.1,
    },
  ];

  // ==================== CAMERA: SÁT SÓNG NHÌN NGƯỢC MŨI -> XOAY LIA VÀO THỊ TRẤN, Ụ PHÁO & BỜ VỊNH ====================
  const pApproach = prog(t, 368.08, 381.8);
  const pSwingZ = prog(t, 381.4, 386.3);
  const pPassX = prog(t, 382.0, 387.5);
  const pLiftY = prog(t, 384.1, 388.2);
  const pTownGlide = prog(t, 387.5, 394.32);

  const relCamX = lerp(lerp(56.0, 34.0, pApproach), -35.5, pPassX) - 2.5 * pTownGlide;
  const camX = xLead + relCamX;
  const camZ = lerp(lerp(3.2, 6.4, pApproach), 40.5, pSwingZ) - 1.0 * pTownGlide;
  const camYDesired = lerp(lerp(6.9, 4.6, pApproach), 20.6, pLiftY) + 1.2 * pTownGlide;

  // Kẹp an toàn camY >= waveY + 1.8 m trên biển và >= mặt đất + 2.2 m trên bờ
  const minWaveCamY = waveY(camX, camZ, t, SWELL) + 1.85;
  const minLandCamY = dInland(camX, camZ) > -2 ? hCoast(camX, camZ) + 2.2 : -99;
  const camY = Math.max(camYDesired, minWaveCamY, minLandCamY);

  const oceanLookY = lerp(16.4, 9.6, pDrop);
  const lookX = xLead + lerp(-6.0, 5.5, pPassX);
  const lookY = lerp(oceanLookY, 9.6, pLiftY) - 0.2 * pTownGlide;
  const lookZ = lerp(0.0, -13.0, pSwingZ);

  const camRoll = 0.025 * bump(t, 383.0, 4.2);

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.tokyoNoon}
        shadowArea={105}
        shadowCenter={[xLead - 4, 4, 2]}
      >
        <Cam pos={[camX, camY, camZ]} look={[lookX, lookY, lookZ]} fov={41} roll={camRoll} />

        {/* Mặt biển trưa nắng trong vắt trải dài từ ngoài khơi vào sát bãi cát bờ vịnh thị trấn */}
        <OceanSurface
          t={t}
          swell={SWELL}
          size={1250}
          seg={184}
          center={[-180, -80]}
          palette="japanShore"
        />

        {/* Địa hình bán đảo bờ biển Nhật + bãi cát vàng tiếp giáp mặt nước mượt mà + bọt sóng trắng */}
        <Terrain
          h={hCoast}
          size={780}
          seg={220}
          center={[170, 55]}
          colors={TERRAIN_PALETTE.japanCoast}
          grainRepeat={44}
        />
        <mesh geometry={BEACH_SAND_GEO} material={sandMat} receiveShadow />
        <SurfWashRibbon t={t} />

        {/* Đường sỏi ven bãi cát & đường phố nhánh giữa các cụm nhà gỗ (tránh hoàn toàn gò công sự pháo Type 88) */}
        <mesh position={[140, 2.39, -10.6]} geometry={rbox(196, 0.06, 4.6, 0.02)} material={roadMat} receiveShadow />
        <mesh position={[103, 2.39, 1.0]} geometry={rbox(5.0, 0.06, 23, 0.02)} material={roadMat} receiveShadow />
        <mesh position={[219, 2.39, 1.0]} geometry={rbox(5.0, 0.06, 23, 0.02)} material={roadMat} receiveShadow />

        {/* Hàng cột điện gỗ ven đại lộ bờ vịnh */}
        {[62, 96, 132, 174, 210].map((px) => (
          <group key={px} position={[px, 2.35, -7.8]}>
            <mesh position={[0, 3.2, 0]} material={poleMat} castShadow>
              <cylinderGeometry args={[0.11, 0.15, 6.4, 8]} />
            </mesh>
            <mesh position={[0, 5.8, 0]} geometry={rbox(0.14, 0.14, 1.4, 0.02)} material={poleMat} />
          </group>
        ))}

        {/* Thị trấn dãy nhà gỗ TokyoRowhouseBlock tắm dưới nắng trưa thanh bình */}
        {TOWN_BLOCKS.map((b, idx) => (
          <group key={idx} position={[b.x, 2.35, b.z]} rotation={[0, b.rotY, 0]}>
            <TokyoRowhouseBlock variant={b.variant} burning={false} />
          </group>
        ))}

        {/* Khẩu đội pháo phòng không Type 88 75mm có bao cát: nổi rõ tiền cảnh, nòng hạ elev=0.18 im lìm không bắn */}
        {FLAK_SITES.map((s, idx) => (
          <group key={idx} position={[s.x, s.y, s.z]}>
            <Type88Flak yaw={s.yaw} elev={0.18} recoil={0} sandbags />
          </group>
        ))}

        {/* Cây thông ven mũi đất & sườn đồi, bụi cây và đá ghềnh ven bãi cát */}
        <Scatter
          kind="pine"
          count={240}
          area={[14, -22, 320, 185]}
          h={hCoast}
          seed={31}
          scale={[0.85, 1.45]}
          avoid={avoidTrees}
        />
        <Scatter
          kind="bush"
          count={115}
          area={[14, -26, 235, 120]}
          h={hCoast}
          seed={47}
          scale={[0.7, 1.2]}
          avoid={avoidBushes}
        />
        <Scatter
          kind="rock"
          count={58}
          area={[-4, -42, 235, 130]}
          h={hCoast}
          seed={63}
          scale={[0.55, 1.35]}
          avoid={avoidBeachRocks}
        />

        {/* Biên đội 3 oanh tạc cơ B-25B Mitchell lướt thấp 50 ft ở tốc độ 200 mph */}
        {formation.map((ac, i) => (
          <group
            key={i}
            position={ac.pos}
            rotation={[ac.roll, 0, ac.pitch]}
          >
            <B25Mitchell
              gear={0}
              propFast
              propSpin={t * 44 + ac.spinOff}
              broomsticks
              seed={ac.seed}
            />
          </group>
        ))}
      </Stage>

      <Label
        t={t}
        text="50 FT · 200 MPH"
        x={380}
        y={155}
        from={CUE.c03_s01_200mph}
        until={390.8}
        size={50}
      />
    </AbsoluteFill>
  );
};

export default C03S01;
