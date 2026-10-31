import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump, mix, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { rbox, pipe, extrude, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { softDot } from '@skill/military/3d/fx';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { ParachuteRaider } from '../parts/Ordnance3D';

const SPLIT_T = 726.1;

// ---------- Texture luồng sáng volumetric biên mờ Gaussian (không viền cứng, không đáy tròn cắt đất) ----------
let cachedBeamTex: THREE.CanvasTexture | null = null;
function getSoftBeamTexture(): THREE.CanvasTexture {
  if (cachedBeamTex) return cachedBeamTex;
  const W = 128;
  const H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const fadeTop = Math.pow(Math.min(1, v / 0.3), 1.7);
    const fadeBot = Math.pow(Math.min(1, (1 - v) / 0.36), 1.9);
    const av = fadeTop * fadeBot;
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const au = Math.pow(Math.sin(Math.PI * u), 2.6);
      const a = Math.round(255 * Math.max(0, Math.min(1, au * av)));
      const idx = (y * W + x) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 255;
      img.data[idx + 2] = 255;
      img.data[idx + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  cachedBeamTex = new THREE.CanvasTexture(cv);
  cachedBeamTex.colorSpace = THREE.SRGBColorSpace;
  return cachedBeamTex;
}

/** Tạo lưới dải sáng 1 mặt phẳng hướng về phía camera (tránh hoàn toàn vệt vạch sáng do mặt vuông góc nhìn nghiêng!) */
function buildSingleBeamGeo(wTop: number, wBot: number, height: number, yCenterOffset = 0, faceYaw = 0): THREE.BufferGeometry {
  const y0 = -height * 0.5 + yCenterOffset;
  const y1 = height * 0.5 + yCenterOffset;
  const c = Math.cos(faceYaw);
  const s = Math.sin(faceYaw);
  const pos = [
    -wTop * 0.5 * c, y1, -wTop * 0.5 * s,
    wTop * 0.5 * c, y1, wTop * 0.5 * s,
    -wBot * 0.5 * c, y0, -wBot * 0.5 * s,
    wBot * 0.5 * c, y0, wBot * 0.5 * s,
  ];
  const uvs = [0, 1, 1, 1, 0, 0, 1, 0];
  const idx = [0, 2, 1, 1, 2, 3];

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- Địa hình Nhịp 1: Lòng chảo đồn trú Nam Xương bao quanh bởi núi đá Trung Hoa ----------
const nanchangHeight = heightField({
  seed: 407,
  amp: 6.5,
  scale: 105,
  flats: [[92, 4, 62, 0.4]],
  add: (x, z) => {
    const r = Math.hypot((x - 92) * 0.7, z - 4);
    const rim = Math.max(0, (r - 62) / 50);
    return Math.min(46, rim * rim * 24);
  },
});

// ---------- Địa hình Nhịp 2: Bãi cỏ sương sớm pháp trường ngoại ô Thượng Hải (15/10/1942) ----------
const shanghaiHeight = heightField({
  seed: 1510,
  amp: 0.7,
  scale: 66,
  flats: [
    [0, 0, 14, 0],
    [10, 0, 12, -0.04],
  ],
  add: (x, z) => {
    const berm = 2.05 * Math.exp(-(((x + 15.5) / 4.4) ** 2)) * Math.exp(-((z / 28) ** 4));
    const farRise = x < -26 ? Math.min(7.5, ((-26 - x) / 34) ** 1.4 * 5.0) : 0;
    return berm + farRise;
  },
});

const SHANGHAI_MEADOW_COLORS = {
  low: '#323f34',
  high: '#4c5b4a',
  rock: '#4d5359',
  dry: '#616859',
};

const avoidShanghaiClearing = (x: number, z: number) =>
  (x > -19.5 && x < 26 && Math.abs(z) < 13.5) || (x > -4 && Math.abs(z) < 19);

// ---------- Sprite sương mù / mây mềm ----------
const MistSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({
  pos,
  size,
  color,
  opacity,
  rot = 0,
}) => {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  if (opacity <= 0.003) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size * 1.48, size * 0.78, size]} />;
};

// ---------- Nhịp 1: Khu đồn trú Nhật tại Nam Xương (đèn đỏ sẫm & đèn pha quét mềm) ----------
type GarrisonBlock = { x: number; z: number; w: number; d: number; h: number; ry: number; redLit: boolean };

const GARRISON_BLOCKS: GarrisonBlock[] = Array.from({ length: 32 }, (_, i) => {
  const row = Math.floor(i / 6) - 2;
  const col = (i % 6) - 2.5;
  const x = 92 + col * 12.5 + (rnd(i * 3 + 1) - 0.5) * 4.0;
  const z = 4 + row * 11.5 + (rnd(i * 3 + 2) - 0.5) * 4.0;
  return {
    x,
    z,
    w: 5.8 + rnd(i * 5 + 3) * 4.8,
    d: 4.6 + rnd(i * 5 + 4) * 3.8,
    h: 2.8 + rnd(i * 5 + 5) * 3.2,
    ry: (rnd(i * 7 + 6) - 0.5) * 0.2,
    redLit: i % 2 === 0 || i % 3 === 0,
  };
});

const SEARCHLIGHTS: { x: number; z: number; phase: number; speed: number; tiltZ: number }[] = [
  { x: 70, z: -16, phase: 0.4, speed: 0.52, tiltZ: 0.22 },
  { x: 86, z: 24, phase: 1.8, speed: 0.48, tiltZ: -0.26 },
  { x: 102, z: -12, phase: 3.1, speed: 0.58, tiltZ: 0.18 },
  { x: 116, z: 18, phase: 4.5, speed: 0.45, tiltZ: -0.2 },
  { x: 82, z: 3, phase: 2.4, speed: 0.55, tiltZ: 0.12 },
];

const NanchangGarrison: React.FC<{ t: number }> = ({ t }) => {
  const mats = useMemo(
    () => ({
      wall: plain('#1e242e', 0.88, 0.08),
      roof: plain('#141821', 0.82, 0.14),
      towerSteel: plain('#27303a', 0.62, 0.45),
      redLamp: new THREE.MeshBasicMaterial({ color: '#ff3b2b', toneMapped: false }),
      crimsonWin: new THREE.MeshBasicMaterial({ color: '#e62c20', toneMapped: false }),
      amberWin: new THREE.MeshBasicMaterial({ color: '#ff8a3d', toneMapped: false }),
      beamSoft: new THREE.MeshBasicMaterial({
        map: getSoftBeamTexture(),
        color: '#c4deff',
        transparent: true,
        opacity: 0.24,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
      lensFlare: new THREE.MeshBasicMaterial({ color: '#f2f8ff', toneMapped: false }),
    }),
    [],
  );

  // Chùm đèn pha 1 mặt phẳng hướng về góc nhìn camera ở (-X, -Z), mờ mềm Gaussian không có vạch cắt
  const searchBeamGeo = useMemo(() => buildSingleBeamGeo(14.5, 1.1, 74, 37, -0.72), []);
  const roofPitchGeo = useMemo(() => {
    const pts: P2[] = [
      [-0.55, 0],
      [-0.58, 0.08],
      [0, 0.42],
      [0.58, 0.08],
      [0.55, 0],
    ];
    return extrude(pts, 1.0, 0.01);
  }, []);

  return (
    <group>
      {GARRISON_BLOCKS.map((b, i) => {
        const y0 = nanchangHeight(b.x, b.z);
        return (
          <group key={i} position={[b.x, y0, b.z]} rotation={[0, b.ry, 0]}>
            <mesh position={[0, b.h * 0.5, 0]} geometry={rbox(b.w, b.h, b.d, 0.08)} material={mats.wall} receiveShadow />
            <group position={[0, b.h, 0]} scale={[b.d + 0.5, 1.5, b.w + 0.5]} rotation={[0, Math.PI / 2, 0]}>
              <mesh geometry={roofPitchGeo} material={mats.roof} />
            </group>
            <mesh
              position={[0, b.h * 0.58, -b.d * 0.5 - 0.04]}
              geometry={rbox(b.w * 0.56, 0.58, 0.08, 0.02)}
              material={b.redLit ? mats.crimsonWin : mats.amberWin}
            />
            <mesh
              position={[-b.w * 0.5 - 0.04, b.h * 0.58, 0]}
              geometry={rbox(0.08, 0.56, b.d * 0.5, 0.02)}
              material={b.redLit ? mats.crimsonWin : mats.amberWin}
            />
            {b.redLit && (
              <mesh position={[-b.w * 0.42, b.h + 0.95, -b.d * 0.4]} material={mats.redLamp}>
                <sphereGeometry args={[0.34, 10, 8]} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Dãy đèn tuần tra đỏ sẫm dọc phố & cổng thành đồn trú Nam Xương */}
      {Array.from({ length: 28 }, (_, k) => {
        const a = (k / 28) * Math.PI * 2;
        const rx = 92 + Math.cos(a) * 38;
        const rz = 4 + Math.sin(a) * 32;
        const ry = nanchangHeight(rx, rz);
        return (
          <mesh key={`perim-${k}`} position={[rx, ry + 1.5, rz]} material={k % 4 === 0 ? mats.amberWin : mats.redLamp}>
            <sphereGeometry args={[0.36, 8, 8]} />
          </mesh>
        );
      })}

      <pointLight position={[84, 10, -4]} color="#ff3824" intensity={65} distance={75} decay={1.5} />
      <pointLight position={[102, 10, 14]} color="#eb2f20" intensity={58} distance={75} decay={1.5} />

      {/* 5 chùm đèn pha phòng không quân Nhật quét mềm mượt lên bầu trời đêm */}
      {SEARCHLIGHTS.map((sl, idx) => {
        const y0 = nanchangHeight(sl.x, sl.z);
        const sweepX = Math.sin(t * sl.speed + sl.phase) * 0.28 - 0.06;
        const sweepZ = sl.tiltZ + Math.cos(t * sl.speed * 0.82 + sl.phase) * 0.24;
        return (
          <group key={`sl-${idx}`} position={[sl.x, y0, sl.z]}>
            <mesh position={[0, 2.1, 0]} geometry={rbox(1.6, 4.2, 1.6, 0.08)} material={mats.towerSteel} />
            <mesh position={[0, 4.4, 0]} material={mats.redLamp}>
              <sphereGeometry args={[0.24, 8, 8]} />
            </mesh>
            <group position={[0, 4.3, 0]} rotation={[sweepZ, 0, sweepX]}>
              <mesh position={[0, 0.25, 0]} material={mats.lensFlare}>
                <sphereGeometry args={[0.52, 10, 8]} />
              </mesh>
              <mesh geometry={searchBeamGeo} material={mats.beamSoft} />
            </group>
          </group>
        );
      })}
    </group>
  );
};

// ---------- Nhịp 2: Dải vải trắng bay nhẹ trong gió trên cây thập giá gỗ ----------
const WhiteClothRibbon: React.FC<{ t: number; seed: number; gust: number }> = ({ t, seed, gust }) => {
  const clothMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f1f5fa',
        roughness: 0.76,
        metalness: 0.03,
        side: THREE.DoubleSide,
      }),
    [],
  );

  const makeTail = (len: number, width: number, dirZ: number, phaseOff: number) => {
    const segs = 10;
    const pos: number[] = [];
    const uvs: number[] = [];
    const idx: number[] = [];
    for (let i = 0; i <= segs; i++) {
      const u = i / segs;
      const wave1 = Math.sin(t * 2.15 - u * 3.4 + seed * 1.9 + phaseOff) * (0.048 + gust * 0.08) * u * u;
      const wave2 = Math.cos(t * 3.1 - u * 5.2 + seed) * (0.02 + gust * 0.035) * u;
      const cx = 0.03 + u * (0.11 + gust * 0.08) + wave1 * 0.65;
      const cy = -u * len * (1 - 0.08 * gust) + wave2 * 0.25;
      const cz = dirZ * (0.04 + u * (0.2 + gust * 0.16)) + wave1;
      const halfW = width * 0.5 * (1 - u * 0.2);
      const twist = wave2 * 0.6;
      pos.push(cx - twist * halfW, cy, cz - halfW);
      pos.push(cx + twist * halfW, cy, cz + halfW);
      uvs.push(0, u, 1, u);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  const tailLong = makeTail(0.7, 0.098, 1, 0);
  const tailShort = makeTail(0.5, 0.084, 0.55, 1.4);

  return (
    <group>
      <mesh position={[0.01, 0, 0]} geometry={rbox(0.18, 0.135, 0.22, 0.03)} material={clothMat} castShadow />
      <mesh position={[0.085, -0.02, 0.03]} geometry={rbox(0.08, 0.09, 0.11, 0.025)} material={clothMat} castShadow />
      <mesh geometry={tailLong} material={clothMat} castShadow />
      <mesh position={[0.01, -0.02, -0.05]} geometry={tailShort} material={clothMat} castShadow />
    </group>
  );
};

// ---------- Nhịp 2: Một cây thập giá gỗ đơn độc tại pháp trường Thượng Hải ----------
const MemorialCross: React.FC<{ pos: V3; rotY?: number; seed: number; t: number; gust: number }> = ({
  pos,
  rotY = 0,
  seed,
  t,
  gust,
}) => {
  const mats = useMemo(
    () => ({
      timber: paint({
        color: '#5a4637',
        camo: ['#463529', '#6e5745'],
        wear: 0.26,
        dirt: 0.32,
        roughness: 0.84,
        metalness: 0.05,
        repeat: 0.8,
        seed,
      }),
      rope: plain('#aea086', 0.88, 0.02),
      iron: plain('#2f343a', 0.58, 0.58),
      earth: plain('#352f27', 0.96, 0.02),
      grass: plain('#4e5e49', 0.9, 0.02),
      flower: plain('#e9eef2', 0.75, 0.02),
    }),
    [seed],
  );

  const ropeGeo = useMemo(() => {
    const pts: V3[] = [
      [-0.08, 1.48, -0.09],
      [0.14, 1.63, 0.09],
      [0.14, 1.48, -0.09],
      [-0.08, 1.63, 0.09],
      [-0.08, 1.48, -0.09],
    ];
    return pipe(pts, 0.014, 24);
  }, []);

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.04, 0]} scale={[1.2, 0.22, 1.2]} material={mats.earth} receiveShadow>
        <sphereGeometry args={[0.48, 16, 10]} />
      </mesh>
      {Array.from({ length: 8 }, (_, k) => {
        const a = (k / 8) * Math.PI * 2 + seed;
        const r = 0.24 + (k % 3) * 0.1;
        return (
          <group key={k} position={[Math.cos(a) * r, 0.14, Math.sin(a) * r]}>
            <mesh
              rotation={[Math.sin(a) * 0.25, a, Math.cos(a) * 0.22]}
              geometry={rbox(0.022, 0.28, 0.04, 0.005)}
              material={mats.grass}
            />
            {k % 3 === 0 && (
              <mesh position={[0, 0.15, 0]} material={mats.flower}>
                <sphereGeometry args={[0.022, 6, 6]} />
              </mesh>
            )}
          </group>
        );
      })}

      {/* Trụ gỗ đứng chính (cao 2.38 m) & xà ngang rõ thớ gỗ */}
      <mesh position={[0, 1.19, 0]} geometry={rbox(0.155, 2.38, 0.155, 0.018)} material={mats.timber} castShadow receiveShadow />
      <mesh position={[0.078, 1.56, 0]} geometry={rbox(0.115, 0.14, 1.44, 0.015)} material={mats.timber} castShadow receiveShadow />
      <mesh position={[0.072, 0.42, 0]} geometry={rbox(0.098, 0.115, 0.68, 0.012)} material={mats.timber} castShadow receiveShadow />

      <mesh position={[0.138, 1.56, 0]} geometry={rbox(0.025, 0.055, 0.055, 0.006)} material={mats.iron} />
      <mesh position={[0.128, 0.42, 0]} geometry={rbox(0.022, 0.045, 0.045, 0.005)} material={mats.iron} />
      <mesh geometry={ropeGeo} material={mats.rope} castShadow />

      {([-0.54, 0.54] as const).map((za, idx) => (
        <mesh key={idx} position={[0.08, 1.56, za]} rotation={[Math.PI / 2, 0, 0]} material={mats.rope} castShadow>
          <torusGeometry args={[0.084, 0.014, 8, 18]} />
        </mesh>
      ))}

      <group position={[0.064, 1.55, 0.02]}>
        <WhiteClothRibbon t={t} seed={seed} gust={gust} />
      </group>
    </group>
  );
};

// ---------- Nhịp 2: Đàn chim đen giật mình vỗ cánh bay vút lên bầu trời Thượng Hải từ 739.34 s ----------
type BirdSpec = {
  x0: number;
  y0: number;
  z0: number;
  vx: number;
  vy: number;
  vz: number;
  delay: number;
  flapFreq: number;
  phase: number;
  scale: number;
};

const FLOCK_SPECS: BirdSpec[] = Array.from({ length: 28 }, (_, i) => {
  const spreadZ = (i / 27 - 0.5) * 14.5 + (rnd(i * 11 + 1) - 0.5) * 1.8;
  return {
    x0: -6.5 - rnd(i * 11 + 2) * 7.0,
    y0: 1.45 + rnd(i * 11 + 3) * 1.2,
    z0: spreadZ,
    vx: 0.25 + rnd(i * 11 + 4) * 0.9,
    vy: 0.95 + rnd(i * 11 + 5) * 0.78, // Giữ đàn chim bay rõ giữa khung trời (y ~ 3.8..7.2 m) suốt 740..745 s!
    vz: (rnd(i * 11 + 6) - 0.45) * 1.5,
    delay: rnd(i * 11 + 7) * 0.55,
    flapFreq: 16 + rnd(i * 11 + 8) * 5,
    phase: rnd(i * 11 + 9) * Math.PI * 2,
    scale: 1.08 + rnd(i * 11 + 10) * 0.48,
  };
});

const StartledBirdFlock: React.FC<{ t: number }> = ({ t }) => {
  const birdMat = useMemo(() => plain('#151a22', 0.76, 0.08, { side: THREE.DoubleSide }), []);
  const geos = useMemo(() => {
    const bodyPts: P2[] = [
      [-0.22, 0],
      [-0.09, 0.044],
      [0.11, 0.05],
      [0.24, 0.01],
      [0.09, -0.038],
      [-0.12, -0.028],
    ];
    const body = extrude(bodyPts, 0.056, 0.008);
    const wingShape = new THREE.Shape([
      new THREE.Vector2(0.11, 0),
      new THREE.Vector2(0.04, 0.28),
      new THREE.Vector2(-0.09, 0.52),
      new THREE.Vector2(-0.17, 0.42),
      new THREE.Vector2(-0.08, 0.19),
      new THREE.Vector2(-0.09, 0),
    ]);
    const wingR = new THREE.ExtrudeGeometry(wingShape, { depth: 0.014, bevelEnabled: false });
    wingR.rotateX(Math.PI / 2);
    return { body, wingR };
  }, []);

  if (t < CUE.c04_s07_firing_squad - 0.02) return null;

  return (
    <group>
      {FLOCK_SPECS.map((b, i) => {
        const dt = t - CUE.c04_s07_firing_squad - b.delay;
        if (dt <= 0 || dt > 9.5) return null;
        const accel = Math.min(1, dt / 0.55);
        const x = b.x0 + b.vx * dt * accel;
        const y = b.y0 + b.vy * dt * (0.7 + 0.3 * accel);
        const z = b.z0 + b.vz * dt * accel + Math.sin(dt * 1.7 + b.phase) * 0.35;
        const yaw = Math.atan2(-b.vz, b.vx);
        const pitch = 0.36;
        const flap = Math.sin(dt * b.flapFreq + b.phase) * 0.78;
        return (
          <group key={i} position={[x, y, z]} rotation={[0, yaw, pitch]} scale={b.scale}>
            <mesh geometry={geos.body} material={birdMat} castShadow />
            <group rotation={[flap, 0, 0]}>
              <mesh geometry={geos.wingR} material={birdMat} castShadow />
            </group>
            <group scale={[1, 1, -1]} rotation={[flap, 0, 0]}>
              <mesh geometry={geos.wingR} material={birdMat} castShadow />
            </group>
          </group>
        );
      })}
    </group>
  );
};

// ---------- Nhịp 2: Tường gạch xám & hàng rào chấn song sắt trại giam mờ xa ngoại ô Thượng Hải ----------
const ShanghaiPerimeterWall: React.FC = () => {
  const brickMat = useMemo(
    () =>
      paint({
        color: '#464d55',
        camo: ['#393f46', '#555d66'],
        wear: 0.25,
        dirt: 0.45,
        roughness: 0.92,
        metalness: 0.05,
        repeat: 0.5,
        seed: 730,
      }),
    [],
  );
  const capMat = useMemo(() => plain('#343a40', 0.88, 0.08), []);
  const ironMat = useMemo(() => plain('#22272d', 0.58, 0.65), []);

  return (
    <group>
      <group position={[-25.5, 0, 0]}>
        <mesh position={[0, 2.1, 0]} geometry={rbox(0.55, 4.2, 68, 0.04)} material={brickMat} receiveShadow />
        <mesh position={[0, 4.3, 0]} geometry={rbox(0.75, 0.25, 68.4, 0.04)} material={capMat} />
        {Array.from({ length: 11 }, (_, i) => {
          const zp = (i - 5) * 6.4;
          return (
            <mesh key={i} position={[0.16, 2.25, zp]} geometry={rbox(0.78, 4.5, 0.85, 0.04)} material={brickMat} />
          );
        })}
      </group>

      {/* Hàng rào chấn song sắt khu trại giam phía rìa trái hậu cảnh (+Z là bên trái màn hình) */}
      <group position={[-9.5, shanghaiHeight(-9.5, 9.2), 9.2]} rotation={[0, -0.24, 0]}>
        <mesh position={[0, 1.4, -0.15]} geometry={rbox(0.42, 2.8, 0.42, 0.03)} material={brickMat} />
        {[0.45, 1.45, 2.35].map((yh, idx) => (
          <mesh key={idx} position={[0, yh, 2.1]} geometry={rbox(0.06, 0.06, 4.2, 0.01)} material={ironMat} />
        ))}
        {Array.from({ length: 16 }, (_, k) => (
          <mesh key={k} position={[0, 1.32, 0.2 + k * 0.25]} material={ironMat}>
            <cylinderGeometry args={[0.02, 0.02, 2.65, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// ---------- Cảnh chính C04S07 (717.04–748.90 s) ----------
const C04S07: React.FC = () => {
  const t = useT();
  const isPart2 = t >= SPLIT_T;

  // Geometry tia nắng bạc 1 mặt phẳng hướng thẳng về camera dọc +X (mặt pháp tuyến +X -> faceYaw = Math.PI / 2)
  const silverBeamGeo = useMemo(() => buildSingleBeamGeo(8.5, 18.0, 34, 0, Math.PI / 2), []);
  const silverCoreGeo = useMemo(() => buildSingleBeamGeo(3.6, 8.4, 34, 0, Math.PI / 2), []);

  if (!isPart2) {
    // ==================== NHỊP 1 (t < 726.10 s): B-25 #16 BAT OUT OF HELL CẠN XĂNG TRÊN BẦU TRỜI NAM XƯƠNG ====================
    const uProp = Math.max(0, Math.min(6.25, t - 716.75));
    const D = 6.25; // Cánh quạt khựng hẳn ở 723.00 s ("dry tanks" @ 723.06 s)
    const w0 = 24;
    const propAngle = w0 * (uProp - (uProp * uProp) / D + (uProp * uProp * uProp) / (3 * D * D));

    const planeX = (t - 717.0) * 13.8;
    const loseAlt = prog(t, 721.2, 726.1);
    const planeY = 51.0 - loseAlt * 5.8;
    const planeRoll = Math.sin(t * 1.85) * 0.045 - loseAlt * 0.18;
    const planePitch = 0.035 - loseAlt * 0.085;

    // 717.0..720.6 s: Ngước từ dưới lên sát mũi kính vỡ chiếc #16 Bat Out of Hell
    // 720.6..722.9 s: Kéo rộng & nghiêng nhìn xuống thấy trọn chiếc #16 dừng cánh quạt + 5 vòm dù trắng + thành phố Nam Xương đèn đỏ & đèn pha bên dưới!
    const pullP = prog(t, 720.6, 722.9);
    const camPos: V3 = [
      planeX + lerp(11.2, -26.5, pullP),
      planeY + lerp(-2.8, -8.2, pullP),
      lerp(-5.6, -24.5, pullP),
    ];
    const camLook: V3 = [
      planeX + lerp(3.8, -1.5, pullP),
      planeY + lerp(2.15, -28.5, pullP),
      lerp(-0.15, 2.5, pullP),
    ];

    const lightning = 0.75 * bump(t, 718.5, 0.55) + 0.6 * bump(t, 722.35, 0.5);
    const wipeClose = prog(t, 725.45, 726.08);
    const fogNear = lerp(95, 1.5, wipeClose);
    const fogFar = lerp(380, 11.0, wipeClose);
    const fogCol = mix('#142238', '#4d5966', wipeClose);
    const skyTop = mix(STAGE_PRESETS.monsoonNight.sky![0], '#232c38', wipeClose);
    const skyHor = mix(STAGE_PRESETS.monsoonNight.sky![1], '#566270', wipeClose);
    const skyBot = mix(STAGE_PRESETS.monsoonNight.sky![2], '#3f4954', wipeClose);

    // 5 phi công tổ bay #16 bung dù trắng nằm gọn 100% trong khung hình trên nền đồn trú Nam Xương
    const bailSpecs: { at: number; dx: number; dy: number; z: number }[] = [
      { at: 721.35, dx: -13.5, dy: -16.8, z: -8.5 },
      { at: 721.62, dx: -8.5, dy: -14.2, z: 3.5 },
      { at: 721.88, dx: -4.0, dy: -18.5, z: -1.5 },
      { at: 722.12, dx: -1.2, dy: -13.5, z: 10.2 },
      { at: 722.36, dx: -10.5, dy: -14.0, z: -13.5 },
    ];

    const fx = camLook[0] - camPos[0];
    const fy = camLook[1] - camPos[1];
    const fz = camLook[2] - camPos[2];
    const fLen = Math.max(0.001, Math.hypot(fx, fy, fz));

    return (
      <Stage
        sky={[skyTop, skyHor, skyBot]}
        sun={[34, 48, -36]}
        sunColor="#8eb4e3"
        sunIntensity={1.6 + lightning * 1.5}
        shadowArea={34}
        shadowCenter={[planeX, planeY - 8, 0]}
        fog={[fogNear, fogFar]}
        fogColor={fogCol}
        env={0.35}
        ambient={0.34 + lightning * 0.2}
        exposure={1.12}
        post={STAGE_PRESETS.monsoonNight.post}
      >
        <Cam pos={camPos} look={camLook} fov={42} roll={Math.sin(t * 1.2) * 0.022} />

        {/* Đèn trăng phụ chiếu rõ bụng máy bay, mũi vỡ & 5 vòm dù trắng */}
        <directionalLight position={[planeX + 22, planeY + 8, -36]} color="#9dc3f0" intensity={1.05 + lightning * 0.85} />

        {/* Chiếc B-25B #16 "Bat Out of Hell" (mũi kính vỡ, cánh quạt chậm dần rồi khựng hẳn) */}
        <group position={[planeX, planeY, 3.5 * pullP]} rotation={[planeRoll, 0, planePitch]}>
          <B25Mitchell
            seed={18}
            brokenNose={true}
            propFast={false}
            propSpin={propAngle}
            navLights={true}
            gear={0}
            bombBay={0}
            lowerTurret={false}
            broomsticks={true}
          />
          {bump(t, 722.05, 0.35) > 0.02 && (
            <pointLight
              position={[3.4, 2.5, -3.05]}
              color="#ff8c3a"
              intensity={14 * bump(t, 722.05, 0.35)}
              distance={8}
            />
          )}
        </group>

        {/* 5 vòm dù ParachuteRaider bung mở rơi xuống vùng đèn đỏ đồn trú & đèn pha Nam Xương */}
        {bailSpecs.map((sp, idx) => {
          const dt = t - sp.at;
          if (dt <= 0) return null;
          const openS = prog(t, sp.at, sp.at + 0.5);
          const px = planeX + sp.dx - dt * 0.9;
          const py = planeY + sp.dy * openS - Math.max(0, dt - 0.5) * 3.2;
          const pz = sp.z + Math.sin(dt * 1.3 + idx) * 0.7;
          return (
            <group key={`chute-${idx}`} position={[px, py, pz]} scale={0.22 + 0.78 * openS}>
              <ParachuteRaider sway={Math.sin(t * 1.65 + idx * 1.35) * 0.15} />
            </group>
          );
        })}

        {/* Lòng chảo đồn trú Nam Xương bên dưới: núi đêm, đèn đỏ quân quản & 5 chùm đèn pha quét mềm */}
        <Terrain h={nanchangHeight} size={640} seg={144} center={[92, 4]} colors={TERRAIN_PALETTE.chinaMountains} />
        <NanchangGarrison t={t} />

        {/* Mây bão ánh trăng lạnh phía trên cao tạo chiều sâu bầu trời đêm */}
        {Array.from({ length: 16 }, (_, k) => {
          const cx = planeX - 30 + ((k * 19) % 95);
          const cy = 66 + (k % 4) * 7;
          const cz = -28 + ((k * 23) % 72);
          return <MistSprite key={`st-${k}`} pos={[cx, cy, cz]} size={26 + (k % 3) * 8} color="#2f4666" opacity={0.22} rot={k} />;
        })}

        {/* Màn mây sương tràn qua ống kính lúc 725.45..726.10 s nối mượt sang bình minh Thượng Hải */}
        {wipeClose > 0.01 &&
          [-1.2, 0, 1.2].map((off, k) => (
            <MistSprite
              key={`wipe1-${k}`}
              pos={[
                camPos[0] + (fx / fLen) * 2.4 + off * 0.9,
                camPos[1] + (fy / fLen) * 2.4 + (k - 1) * 0.4,
                camPos[2] + (fz / fLen) * 2.4 + off * 0.6,
              ]}
              size={6.5}
              color="#636f7d"
              opacity={0.94 * wipeClose}
              rot={k * 1.2}
            />
          ))}
      </Stage>
    );
  }

  // ==================== NHỊP 2 (t >= 726.10 s): BÌNH MINH XÁM PHÁP TRƯỜNG THƯỢNG HẢI (15/10/1942) ====================
  const wipeOpen = 1 - prog(t, SPLIT_T, SPLIT_T + 1.05);
  const beamP = prog(t, 743.8, 747.4);

  const volleyFlash =
    bump(t, CUE.c04_s07_firing_squad, 0.24) + 0.48 * bump(t, CUE.c04_s07_firing_squad + 0.08, 0.34);
  const clothGust = bump(t, CUE.c04_s07_firing_squad, 0.95);

  // <Cam> lùi chậm ngang tầm mắt đầy trang nghiêm trước 3 cây thập giá gỗ đơn độc
  const dollyP = prog(t, SPLIT_T, 748.9);
  const hopeLift = prog(t, 743.5, 748.9);

  const camPos2: V3 = [
    lerp(7.0, 14.6, dollyP),
    lerp(1.48, 1.72, dollyP) + hopeLift * 0.22,
    lerp(-0.25, 0.85, dollyP),
  ];
  const camLook2: V3 = [0, lerp(1.38, 1.62, dollyP) + hopeLift * 0.16, lerp(0, 0.2, dollyP)];

  const skyTop2 = mix('#232c38', '#344457', beamP * 0.55);
  const skyHor2 = mix('#566270', '#7e8e9f', beamP * 0.6);
  const skyBot2 = mix('#8d98a3', '#bcc7d1', beamP * 0.65);
  const sunCol2 = mix('#cfdbe8', '#f7f1e3', beamP);
  const sunInt2 = lerp(1.6, 2.6, beamP);
  const fogNear2 = lerp(35, 3.0, wipeOpen);
  const fogFar2 = lerp(195, 18.0, wipeOpen);

  return (
    <>
      <Stage
        sky={[skyTop2, skyHor2, skyBot2]}
        sun={[18, 28, 14]}
        sunColor={sunCol2}
        sunIntensity={sunInt2}
        shadowArea={22}
        shadowCenter={[1.5, 1.0, 0]}
        fog={[fogNear2, fogFar2]}
        fogColor={mix('#737f8c', '#8d99a5', beamP * 0.5)}
        env={lerp(0.34, 0.45, beamP)}
        ambient={lerp(0.34, 0.39, beamP)}
        exposure={lerp(1.07, 1.13, beamP)}
        post={{ bloom: 0.62, bloomThreshold: 0.78, ao: 2.0, aoRadius: 2.2, vignette: 0.46 }}
      >
        <Cam pos={camPos2} look={camLook2} fov={38} />

        <directionalLight position={[22, 11, -10]} color="#cddae8" intensity={0.56} />

        {/* Ánh chớp đầu nòng gián tiếp từ ngoài khung hình lúc 739.34 s ("executed by firing squad") */}
        {volleyFlash > 0.005 && (
          <pointLight position={[8.5, 2.2, -9.5]} color="#ffe3b3" intensity={volleyFlash * 145} distance={48} decay={1.5} />
        )}

        {/* Quầng nắng bạc ấm chiếu lên 3 cây thập giá & thảm cỏ sương sớm cuối cảnh (743.8–748.9 s) */}
        {beamP > 0.01 && (
          <pointLight position={[2.2, 6.2, 1.2]} color="#fff3dc" intensity={beamP * 28} distance={26} decay={1.5} />
        )}

        <Terrain h={shanghaiHeight} size={380} seg={160} center={[0, 0]} colors={SHANGHAI_MEADOW_COLORS} grainRepeat={52} />
        <ShanghaiPerimeterWall />
        <Scatter
          kind="pine"
          count={46}
          area={[-85, -75, 18, 75]}
          h={shanghaiHeight}
          seed={1942}
          scale={[0.7, 1.55]}
          avoid={avoidShanghaiClearing}
          tint="#76848c"
        />
        <Scatter
          kind="broadleaf"
          count={24}
          area={[-75, -65, -27, 65]}
          h={shanghaiHeight}
          seed={1943}
          scale={[0.8, 1.35]}
          avoid={avoidShanghaiClearing}
          tint="#6d7a78"
        />
        <Scatter
          kind="bush"
          count={52}
          area={[-35, -45, 24, 45]}
          h={shanghaiHeight}
          seed={1945}
          scale={[0.5, 0.95]}
          avoid={avoidShanghaiClearing}
          tint="#6e7d75"
        />

        {/* Ba cây thập giá gỗ đơn độc buộc vải trắng bay nhẹ trong gió */}
        <MemorialCross pos={[-0.12, shanghaiHeight(-0.12, -3.45), -3.45]} rotY={0.04} seed={16} t={t} gust={clothGust} />
        <MemorialCross pos={[0.08, shanghaiHeight(0.08, 0), 0]} rotY={-0.02} seed={26} t={t} gust={clothGust} />
        <MemorialCross pos={[-0.1, shanghaiHeight(-0.1, 3.45), 3.45]} rotY={-0.05} seed={36} t={t} gust={clothGust} />

        {/* Đàn chim đen vỗ cánh bay vút lên bầu trời từ 739.34 s */}
        <StartledBirdFlock t={t} />

        {/* Sương mù là là mặt cỏ sương sớm */}
        {Array.from({ length: 14 }, (_, k) => {
          const mx = -12 + ((k * 7) % 24) + Math.sin(t * 0.18 + k) * 1.4;
          const mz = -16 + k * 2.5 + Math.cos(t * 0.15 + k) * 1.2;
          return (
            <MistSprite
              key={`mist-${k}`}
              pos={[mx, 0.85 + (k % 3) * 0.42, mz]}
              size={8.5 + (k % 4) * 2.2}
              color={mix('#9aa8b6', '#eadec9', Math.min(1, volleyFlash * 0.7 + beamP * 0.35))}
              opacity={0.1 + volleyFlash * 0.08}
              rot={k * 0.8}
            />
          );
        })}

        {/* Khói súng nhạt trôi nhẹ từ rìa phải màn hình (-Z) vào sương sớm sau tiếng súng 739.34 s */}
        {t > CUE.c04_s07_firing_squad &&
          t < 745.0 &&
          Array.from({ length: 6 }, (_, k) => {
            const dt = t - CUE.c04_s07_firing_squad;
            const fade = Math.max(0, 1 - dt / 5.4);
            return (
              <MistSprite
                key={`gunsmoke-${k}`}
                pos={[3.0 + k * 0.65 - dt * 0.5, 1.4 + k * 0.22 + dt * 0.25, -7.2 + dt * (0.55 + k * 0.1)]}
                size={2.8 + dt * 0.85}
                color="#d2d9e0"
                opacity={0.2 * fade}
                rot={k + dt * 0.3}
              />
            );
          })}

        {/* Luồng tia nắng bạc biên mờ Gaussian rọi xuyên mây mù chiếu ấm bãi cỏ & 3 thập giá (743.8–748.9 s) */}
        {beamP > 0.01 && (
          <group>
            {(
              [
                [1.4, 13.5, 2.2, 1.0],
                [-0.4, 14.2, -0.6, 0.88],
                [2.4, 13.0, -3.0, 0.72],
              ] as [number, number, number, number][]
            ).map(([bx, by, bz, w], idx) => (
              <group key={`ray-${idx}`} position={[bx, by, bz]} rotation={[-0.36, 0, -0.38]}>
                <mesh geometry={silverBeamGeo}>
                  <meshBasicMaterial
                    map={getSoftBeamTexture()}
                    color="#e3edf8"
                    transparent
                    opacity={0.18 * beamP * w}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
                <mesh geometry={silverCoreGeo}>
                  <meshBasicMaterial
                    map={getSoftBeamTexture()}
                    color="#fff6e3"
                    transparent
                    opacity={0.22 * beamP * w}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              </group>
            ))}
          </group>
        )}

        {wipeOpen > 0.01 && (
          <MistSprite
            pos={[camPos2[0] - 2.1, camPos2[1], camPos2[2]]}
            size={6.8}
            color="#727e8b"
            opacity={0.9 * wipeOpen}
            rot={0.4}
          />
        )}
      </Stage>

      <Label
        t={t}
        text="OCT 15, 1942 · SHANGHAI"
        x={960}
        y={905}
        from={CUE.c04_s07_oct15_1942}
        until={737.0}
        size={48}
      />
    </>
  );
};

export default C04S07;
