import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mix } from '@core/time';
import { extrude, lathe, mat4, merge, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Wheel } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT_PRESETS, PAL } from '../design/palette';

const heatDotCache = new Map<string, THREE.DataTexture>();
const makeHeatDot = (hex: string): THREE.DataTexture => {
  const hit = heatDotCache.get(hex);
  if (hit) return hit;
  const col = new THREE.Color(hex);
  const sz = 48;
  const data = new Uint8Array(sz * sz * 4);
  for (let y = 0; y < sz; y++) {
    for (let x = 0; x < sz; x++) {
      const dx = (x + 0.5) / sz * 2 - 1;
      const dy = (y + 0.5) / sz * 2 - 1;
      const r2 = dx * dx + dy * dy;
      const a = r2 >= 1 ? 0 : Math.pow(1 - r2, 2.2);
      const i = (y * sz + x) * 4;
      data[i] = Math.round(col.r * 255);
      data[i + 1] = Math.round(col.g * 255);
      data[i + 2] = Math.round(col.b * 255);
      data[i + 3] = Math.round(a * 255);
    }
  }
  const tex = new THREE.DataTexture(data, sz, sz, THREE.RGBAFormat);
  tex.needsUpdate = true;
  heatDotCache.set(hex, tex);
  return tex;
};

export type PowerpackChassis3DProps = {
  mode?: 'full' | 'driverOnly' | 'turbineOnly' | 'suspensionOnly';
  steerAngle?: number;
  throttleTwist?: number;
  wheelDrop?: number;
  leftTravel?: number;
  rightTravel?: number;
  turbineSpin?: number;
  exhaustGlow?: number;
  airPulse?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// Khoảng cách thật 7 trạm bánh chịu nặng M1A2 (khoảng hở trạm 1–2 rộng đặc trưng của Abrams, bánh r = 0.315 m)
const WHEEL_R = 0.315;
const WHEEL_X = [2.32, 1.42, 0.78, 0.14, -0.5, -1.14, -1.78] as const;

// ---------- Vật liệu dùng chung ----------
const matHullDesert = () =>
  paint({
    ...PAINT_PRESETS.abramsDesert,
    camo: [...PAINT_PRESETS.abramsDesert.camo],
    seed: 17,
  });
const matCockpitLiner = () =>
  paint({
    color: '#b7c2bc',
    camo: ['#aab6b0', '#c5d0ca'],
    camoScale: 1.8,
    wear: 0.22,
    dirt: 0.26,
    roughness: 0.72,
    metalness: 0.2,
    repeat: 0.6,
    seed: 29,
  });
const matBellyDark = () =>
  paint({
    color: '#1e252e',
    camo: ['#181e26', '#27303b'],
    camoScale: 1.6,
    wear: 0.28,
    dirt: 0.32,
    roughness: 0.74,
    metalness: 0.45,
    repeat: 0.5,
    seed: 41,
  });
const matAllisonCase = () =>
  paint({
    color: '#5d6c7a',
    camo: ['#4e5b68', '#708090'],
    camoScale: 2.2,
    wear: 0.32,
    dirt: 0.2,
    roughness: 0.46,
    metalness: 0.72,
    repeat: 0.8,
    seed: 53,
  });
const matCutEdge = () => plain('#c43b29', 0.48, 0.35);
const matTorsionSteel = () => plain('#d0dde8', 0.2, 0.9);
const matBrushedSteel = () => plain('#b9c7d4', 0.26, 0.86);
const matTitanium = () => plain('#e0ebf5', 0.16, 0.94);
const matInconel = () => plain('#736050', 0.42, 0.74);
const matDarkSteel = () => plain('#262e37', 0.55, 0.65);
const matMidSteel = () => plain('#687786', 0.44, 0.68);
const matBrass = () => plain('#dba93d', 0.28, 0.84);
const matCopper = () => plain('#bf703e', 0.34, 0.8);
const matYellow = () => plain('#f2b61d', 0.38, 0.22);
const matRubber = () => plain('#1c2026', 0.88, 0.08);
const matFilterPleat = () => plain('#e9d6a6', 0.72, 0.05);
const matCyanOptic = () =>
  plain('#29e3d4', 0.12, 0.45, {
    emissive: new THREE.Color('#1bd1c2'),
    emissiveIntensity: 0.65,
  });
const matAmberScreen = () =>
  plain('#ffaa2b', 0.2, 0.08, {
    emissive: new THREE.Color('#ff9d1c'),
    emissiveIntensity: 1.05,
  });

// ---------- Geometry tĩnh cấp module ----------
// Phễu hút khí đầu vào động cơ tuabin AGT1500 (dọc +X)
const INTAKE_BELLMOUTH_GEO = lathe(
  [
    [0.195, 0],
    [0.205, 0.12],
    [0.255, 0.24],
    [0.295, 0.33],
    [0.275, 0.35],
    [0.22, 0.24],
    [0.178, 0.12],
    [0.172, 0],
  ],
  32
);

const BULLET_CONE_GEO = lathe(
  [
    [0.09, 0],
    [0.074, 0.11],
    [0.036, 0.21],
    [0.002, 0.27],
  ],
  24
);

const makeCompressorRotorGeo = (rOuter: number, bladeCount = 14) => {
  const parts: THREE.BufferGeometry[] = [];
  const hub = new THREE.CylinderGeometry(rOuter * 0.42, rOuter * 0.45, 0.048, 20);
  hub.rotateZ(Math.PI / 2);
  parts.push(hub);
  const blade = new THREE.BoxGeometry(0.038, rOuter * 0.56, 0.009);
  for (let i = 0; i < bladeCount; i++) {
    const a = (i / bladeCount) * Math.PI * 2;
    const rMid = rOuter * 0.7;
    parts.push(
      blade
        .clone()
        .applyMatrix4(mat4([0, Math.cos(a) * rMid, Math.sin(a) * rMid], [a, 0.48, 0]))
    );
  }
  return merge(parts);
};

const ROTOR_STAGE_1 = makeCompressorRotorGeo(0.21, 16);
const ROTOR_STAGE_2 = makeCompressorRotorGeo(0.188, 14);
const ROTOR_STAGE_3 = makeCompressorRotorGeo(0.168, 14);
const TURBINE_WHEEL_GEO = makeCompressorRotorGeo(0.225, 18);

const COMPRESSOR_CUT_CASE = new THREE.CylinderGeometry(0.228, 0.21, 0.42, 28, 1, true, Math.PI * 0.44, Math.PI * 1.28);
COMPRESSOR_CUT_CASE.rotateZ(Math.PI / 2);

const RECUPERATOR_OUTER_SHELL = new THREE.CylinderGeometry(0.38, 0.38, 0.64, 34, 1, true, Math.PI * 0.38, Math.PI * 1.36);
RECUPERATOR_OUTER_SHELL.rotateZ(Math.PI / 2);

const RECUPERATOR_PLATES_GEO = (() => {
  const plates: THREE.BufferGeometry[] = [];
  const fin = new THREE.BoxGeometry(0.58, 0.135, 0.009);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    plates.push(fin.clone().applyMatrix4(mat4([0, Math.cos(a) * 0.278, Math.sin(a) * 0.278], [a, 0, 0])));
  }
  return merge(plates);
})();

const FUEL_PIPES_GEO = merge([
  pipe(
    [
      [-0.22, -0.18, 0.34],
      [0.05, -0.14, 0.36],
      [0.28, 0.02, 0.34],
      [0.34, 0.23, 0.24],
    ],
    0.015,
    24
  ),
  pipe(
    [
      [0.34, 0.23, 0.24],
      [0.34, 0.32, 0],
      [0.34, 0.23, -0.24],
      [0.28, -0.04, -0.33],
    ],
    0.014,
    24
  ),
]);

const PULSE_BLEED_PIPES = [-1, 1].map((side) =>
  pipe(
    [
      [0.54, 0.2, side * 0.2],
      [0.56, 0.34, side * 0.42],
      [0.5, 0.36, side * 0.64],
    ],
    0.018,
    20
  )
);

// Bánh sao chủ động 11 răng ở đuôi xe (Drive Sprocket)
const SPROCKET_RING_GEO = (() => {
  const parts: THREE.BufferGeometry[] = [];
  const rim = new THREE.TorusGeometry(0.28, 0.032, 10, 24);
  parts.push(rim);
  const spoke = new THREE.BoxGeometry(0.52, 0.048, 0.028);
  for (let i = 0; i < 3; i++) {
    parts.push(spoke.clone().applyMatrix4(mat4([0, 0, 0], [0, 0, (i * Math.PI) / 3])));
  }
  const tooth = new THREE.ConeGeometry(0.034, 0.075, 6);
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2;
    parts.push(
      tooth
        .clone()
        .applyMatrix4(mat4([Math.cos(a) * 0.32, Math.sin(a) * 0.32, 0], [0, 0, a - Math.PI / 2]))
    );
  }
  return merge(parts);
})();

// Giáp nghiêng gầm mũi trước (Lower Glacis Wedge) gọn sắc đúng biên dạng mũi Abrams (không thừa tấm đáy!)
const LOWER_GLACIS_WEDGE_GEO = extrude(
  [
    [3.16, 0.44],
    [3.92, 0.92],
    [3.76, 0.98],
    [3.16, 0.56],
  ],
  2.08,
  0.015
);

// Vách mỏng bên trái khoang lái (dày 0.14 m, cắt bậc cửa sổ để thấy rõ tài xế từ bên trái!)
const LEFT_DRIVER_WALL_GEO = extrude(
  [
    [1.72, 0.45],
    [3.18, 0.45],
    [3.88, 0.92],
    [3.38, 1.09],
    [3.1, 1.09],
    [2.98, 0.78],
    [2.05, 0.78],
    [1.92, 1.22],
    [1.72, 1.24],
  ],
  0.14,
  0.012
);

// Tấm giáp trên mũi trái (Upper Glacis Deck) mỏng 0.08 m, che riêng góc mũi trái mà không chiếm lòng khoang lái!
const LEFT_UPPER_GLACIS_DECK = extrude(
  [
    [2.95, 1.1],
    [3.86, 0.91],
    [3.89, 0.97],
    [2.95, 1.18],
  ],
  0.74,
  0.01
);

// Gờ vách thấp bên phải mũi xe (y = 0.60) mở thoáng toàn bộ tầm nhìn vào ghế võng nằm ngửa & ghi-đông T-bar
const RIGHT_DRIVER_SILL_GEO = extrude(
  [
    [1.72, 0.45],
    [3.18, 0.45],
    [3.82, 0.87],
    [3.52, 0.89],
    [3.12, 0.6],
    [1.72, 0.6],
  ],
  0.14,
  0.01
);

// Khung ống treo ghế võng nằm ngửa của lái xe
const CRADLE_FRAME_PIPES = [-0.23, 0.23].map((zSide) =>
  pipe(
    [
      [1.88, 1.0, zSide],
      [2.16, 0.75, zSide],
      [2.56, 0.55, zSide],
      [2.96, 0.63, zSide],
      [3.36, 0.57, zSide],
    ],
    0.019,
    28
  )
);

// ---------- Cụm động cơ tuabin phản lực Honeywell AGT1500 + hộp số Allison X1100-3B ----------
const AGT1500Powerpack: React.FC<{
  position: [number, number, number];
  turbineSpin: number;
  exhaustGlow: number;
  airPulse: number;
  showStand?: boolean;
}> = ({ position, turbineSpin, exhaustGlow, airPulse, showStand = false }) => {
  const glow = clamp01(exhaustGlow);
  const pulse = clamp01(airPulse);

  const exhaustHotColor = mix('#4d3326', '#ff6e1a', glow);
  const exhaustCoreColor = mix('#663e29', '#ffe47e', glow);

  return (
    <group position={position}>
      {showStand && (
        <group position={[0, -0.38, 0]}>
          <mesh position={[0, -0.1, 0]} geometry={rbox(2.35, 0.06, 1.45, 0.015)} material={matDarkSteel()} receiveShadow />
          {[
            [-0.75, -0.52],
            [-0.75, 0.52],
            [0.65, -0.42],
            [0.65, 0.42],
          ].map(([sx, sz], i) => (
            <mesh key={i} position={[sx, 0.08, sz]} material={matMidSteel()} castShadow>
              <boxGeometry args={[0.1, 0.34, 0.1]} />
            </mesh>
          ))}
        </group>
      )}

      {/* 1. PHỄU HÚT KHÍ & TẦNG CÁNH QUẠT MÁY NÉN TITANIUM CẮT BỔ (xoay theo `turbineSpin`) */}
      <group position={[0.52, 0.09, 0]}>
        <mesh position={[0.25, 0, 0]} geometry={INTAKE_BELLMOUTH_GEO} material={matBrushedSteel()} castShadow />
        {[0, 1, 2, 3].map((k) => (
          <mesh
            key={k}
            position={[0.44, 0, 0]}
            rotation={[(k * Math.PI) / 2, 0, 0]}
            material={matMidSteel()}
          >
            <boxGeometry args={[0.06, 0.44, 0.012]} />
          </mesh>
        ))}

        <mesh position={[0.08, 0, 0]} geometry={COMPRESSOR_CUT_CASE} material={matAllisonCase()} castShadow />
        <mesh position={[0.08, 0.215, 0.05]} material={matCutEdge()}>
          <boxGeometry args={[0.41, 0.016, 0.018]} />
        </mesh>
        <mesh position={[0.08, 0.04, 0.215]} material={matCutEdge()}>
          <boxGeometry args={[0.41, 0.018, 0.016]} />
        </mesh>

        <group rotation={[turbineSpin, 0, 0]}>
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matTitanium()}>
            <cylinderGeometry args={[0.056, 0.056, 0.92, 18]} />
          </mesh>
          <mesh position={[0.3, 0, 0]} geometry={BULLET_CONE_GEO} material={matTitanium()} castShadow />
          <mesh position={[0.21, 0, 0]} geometry={ROTOR_STAGE_1} material={matTitanium()} castShadow />
          <mesh position={[0.085, 0, 0]} geometry={ROTOR_STAGE_2} material={matTitanium()} castShadow />
          <mesh position={[-0.04, 0, 0]} geometry={ROTOR_STAGE_3} material={matTitanium()} castShadow />
        </group>
      </group>

      {/* 2. BUỒNG ĐỐT VÒNG (ANNULAR COMBUSTOR) & HỆ ỐNG DẪN NHIÊN LIỆU (`pipe`) */}
      <group position={[0.28, 0.09, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={matInconel()} castShadow>
          <cylinderGeometry args={[0.305, 0.275, 0.28, 28]} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]} material={matCopper()} castShadow>
          <torusGeometry args={[0.312, 0.022, 12, 28]} />
        </mesh>
        <mesh position={[0, 0.16, 0.24]} rotation={[0.6, 0, 0]}>
          <boxGeometry args={[0.18, 0.12, 0.08]} />
          <meshStandardMaterial
            color={mix('#7a3b1e', '#ff9428', 0.4 + glow * 0.6)}
            emissive={new THREE.Color('#ff5e12')}
            emissiveIntensity={0.45 + glow * 1.5}
            roughness={0.35}
          />
        </mesh>
        <group position={[-0.11, 0, 0]} rotation={[-turbineSpin * 0.9, 0, 0]}>
          <mesh geometry={TURBINE_WHEEL_GEO} material={matBrass()} />
        </group>
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[0.04, Math.cos(a) * 0.32, Math.sin(a) * 0.32]}
              rotation={[a, 0, 0]}
              material={matBrass()}
            >
              <cylinderGeometry args={[0.016, 0.02, 0.055, 10]} />
            </mesh>
          );
        })}
      </group>

      <mesh geometry={FUEL_PIPES_GEO} material={matBrushedSteel()} castShadow />
      <mesh position={[0.32, -0.18, 0.23]} rotation={[0, 0, Math.PI / 2]} material={matDarkSteel()} castShadow>
        <cylinderGeometry args={[0.085, 0.085, 0.42, 18]} />
      </mesh>

      {/* 3. LỒNG TRAO ĐỔI NHIỆT HÌNH TRỤ LỚN (RECUPERATOR) MẠ THÉP XƯỚC CẮT BỔ */}
      <group position={[-0.2, 0.1, 0]}>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.195, 0.195, 0.62, 24]} />
          <meshStandardMaterial
            color={exhaustHotColor}
            emissive={new THREE.Color('#ff5510')}
            emissiveIntensity={0.18 + glow * 1.15}
            roughness={0.5}
            metalness={0.5}
          />
        </mesh>
        <mesh geometry={RECUPERATOR_PLATES_GEO} material={matTitanium()} castShadow />
        <mesh geometry={RECUPERATOR_OUTER_SHELL} material={matBrushedSteel()} castShadow />
        {[-0.31, 0, 0.31].map((xFlange, i) => (
          <mesh key={i} position={[xFlange, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={matMidSteel()} castShadow>
            <torusGeometry args={[0.386, 0.02, 10, 32]} />
          </mesh>
        ))}
        <mesh position={[0, 0.37, 0.09]} material={matCutEdge()}>
          <boxGeometry args={[0.62, 0.018, 0.018]} />
        </mesh>
      </group>

      {/* 4. HỘP SỐ TRUYỀN ĐỘNG NGANG ALLISON X1100-3B NỐI RA 2 BÁNH SAO HAI BÊN */}
      <group position={[-0.72, 0.02, 0]}>
        <mesh position={[0.04, 0, 0]} geometry={rbox(0.46, 0.56, 0.92, 0.04)} material={matAllisonCase()} castShadow />
        <mesh position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]} material={matAllisonCase()} castShadow>
          <cylinderGeometry args={[0.24, 0.24, 2.18, 26]} />
        </mesh>
        {[-1.16, 1.16].map((zOut, i) => (
          <mesh key={i} position={[0, -0.02, zOut]} rotation={[Math.PI / 2, 0, 0]} material={matDarkSteel()} castShadow>
            <cylinderGeometry args={[0.17, 0.21, 0.22, 22]} />
          </mesh>
        ))}
        {[-0.34, 0.34].map((zSteer, i) => (
          <group key={i} position={[0.06, 0.31, zSteer]}>
            <mesh material={matMidSteel()} castShadow>
              <cylinderGeometry args={[0.12, 0.13, 0.16, 18]} />
            </mesh>
            <mesh position={[0, 0.1, 0]} material={matBrass()}>
              <cylinderGeometry args={[0.045, 0.055, 0.05, 14]} />
            </mesh>
          </group>
        ))}
        {[-0.68, -0.56, 0.56, 0.68].map((zRib, i) => (
          <mesh key={i} position={[0, -0.02, zRib]} material={matMidSteel()}>
            <boxGeometry args={[0.52, 0.52, 0.025]} />
          </mesh>
        ))}
      </group>

      {/* 5. 2 HỘP LỌC KHÍ XUNG PHẢN LỰC (PULSE-JET AIR CLEANERS) & LUỒNG THỔI NGƯỢC BỤI CÁT (`airPulse`) */}
      {[-1, 1].map((side) => (
        <group key={side}>
          <group position={[0.48, 0.35, side * 0.78]}>
            <mesh
              position={[0, side > 0 ? -0.06 : 0, 0]}
              geometry={rbox(0.76, side > 0 ? 0.2 : 0.32, 0.34, 0.02)}
              material={matHullDesert()}
              castShadow
            />
            {side > 0 && (
              <>
                <mesh position={[0, 0.045, 0]} material={matCutEdge()}>
                  <boxGeometry args={[0.75, 0.015, 0.33]} />
                </mesh>
                {[-0.22, 0, 0.22].map((xFilt, k) => (
                  <group key={k} position={[xFilt, 0.07, 0]}>
                    <mesh material={matFilterPleat()} castShadow>
                      <cylinderGeometry args={[0.088, 0.088, 0.19, 18]} />
                    </mesh>
                    <mesh position={[0, 0.1, 0]} material={matDarkSteel()}>
                      <cylinderGeometry args={[0.092, 0.092, 0.02, 18]} />
                    </mesh>
                  </group>
                ))}
              </>
            )}

            {[-0.24, -0.08, 0.08, 0.24].map((xNoz, nIdx) => (
              <mesh
                key={nIdx}
                position={[xNoz, -0.03, side * 0.18]}
                rotation={[Math.PI / 2, 0, 0]}
                material={matDarkSteel()}
              >
                <cylinderGeometry args={[0.028, 0.034, 0.05, 12]} />
              </mesh>
            ))}

            <mesh
              position={[0.3, -0.14, -side * 0.26]}
              rotation={[side * 0.72, 0, -0.3]}
              material={matRubber()}
              castShadow
            >
              <cylinderGeometry args={[0.105, 0.115, 0.48, 18]} />
            </mesh>

            {pulse > 0.001 && (
              <group position={[0, -0.02, side * (0.24 + pulse * 0.45)]}>
                <mesh rotation={[Math.PI / 2, 0, 0]} scale={[1 + pulse * 0.9, 1 + pulse * 0.9, 1]}>
                  <torusGeometry args={[0.18, 0.022, 10, 26]} />
                  <meshStandardMaterial
                    color="#e6fbff"
                    emissive="#4ee8fa"
                    emissiveIntensity={0.85}
                    transparent
                    opacity={0.72 * (1 - pulse * 0.55)}
                    depthWrite={false}
                  />
                </mesh>
                <mesh
                  position={[0, 0, side * 0.16]}
                  rotation={[Math.PI / 2, 0, 0]}
                  scale={[0.7 + pulse * 1.1, 0.7 + pulse * 1.1, 1]}
                >
                  <torusGeometry args={[0.25, 0.018, 10, 26]} />
                  <meshStandardMaterial
                    color="#d8be92"
                    emissive="#c49b5e"
                    emissiveIntensity={0.35}
                    transparent
                    opacity={0.55 * (1 - pulse * 0.6)}
                    depthWrite={false}
                  />
                </mesh>
                {[-0.2, 0, 0.2].map((xp, dIdx) => (
                  <mesh key={dIdx} position={[xp, -0.02 * dIdx, side * (0.1 + pulse * 0.25)]}>
                    <sphereGeometry args={[0.09 + pulse * 0.14, 12, 10]} />
                    <meshStandardMaterial
                      color="#d2b483"
                      transparent
                      opacity={0.38 * (1 - pulse * 0.5)}
                      depthWrite={false}
                    />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        </group>
      ))}
      {PULSE_BLEED_PIPES.map((g, i) => (
        <mesh key={i} geometry={g} material={matCopper()} castShadow />
      ))}

      {/* 6. ỐNG GOM KHÍ XẢ & HỌNG XẢ ĐUÔI RỰC CAM ĐỎ 930°F THEO `exhaustGlow` (0..1) */}
      <group position={[-1.1, 0.2, 0]}>
        <mesh position={[0.26, 0.12, 0]} geometry={rbox(0.58, 0.28, 0.76, 0.03)} material={matInconel()} castShadow />
        <mesh position={[-0.18, -0.02, 0]} geometry={rbox(0.32, 0.42, 1.18, 0.025)} material={matDarkSteel()} castShadow />
        <mesh position={[-0.24, -0.02, 0]}>
          <boxGeometry args={[0.22, 0.34, 1.06]} />
          <meshStandardMaterial
            color={exhaustCoreColor}
            emissive={new THREE.Color(mix('#4a1f0e', '#ff6a14', glow))}
            emissiveIntensity={0.22 + glow * 2.4}
            roughness={0.3}
          />
        </mesh>
        {[-0.12, -0.04, 0.04, 0.12].map((yLouv, i) => (
          <mesh key={i} position={[-0.35, yLouv, 0]} rotation={[0, 0, 0.35]}>
            <boxGeometry args={[0.06, 0.022, 1.1]} />
            <meshStandardMaterial
              color={mix('#262d34', '#ff7b24', glow * 0.65)}
              emissive={new THREE.Color(mix('#120804', '#ff4d0a', glow))}
              emissiveIntensity={glow * 1.45}
              roughness={0.42}
              metalness={0.55}
            />
          </mesh>
        ))}
        {glow > 0.05 && (
          <group position={[-0.38, -0.03, 0]}>
            <pointLight color="#ff7a22" intensity={1.6 * glow} distance={2.4} decay={2} />
            {[
              [-0.14, 0.01, -0.28, 0.56],
              [-0.16, -0.02, 0.0, 0.64],
              [-0.14, 0.01, 0.28, 0.56],
              [-0.34, -0.06, -0.18, 0.76],
              [-0.36, -0.05, 0.18, 0.76],
              [-0.56, -0.1, 0.0, 0.92],
            ].map(([ox, oy, oz, sc], idx) => (
              <sprite
                key={idx}
                position={[ox * (0.8 + glow * 0.35), oy, oz]}
                scale={[sc * (0.75 + glow * 0.45), sc * (0.48 + glow * 0.28), 1]}
              >
                <spriteMaterial
                  map={makeHeatDot(idx < 3 ? '#ffb95e' : '#ff6b1a')}
                  transparent
                  opacity={(idx < 3 ? 0.28 : 0.18) * glow}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                />
              </sprite>
            ))}
          </group>
        )}
      </group>
    </group>
  );
};

// ---------- Khoang lái nằm ngửa ở mũi xe + Ghi-đông chữ T kiểu mô-tô (T-bar) + 3 Kính tiềm vọng ----------
const RecliningDriverBay: React.FC<{ steerAngle: number; throttleTwist: number }> = ({
  steerAngle,
  throttleTwist,
}) => {
  const matSuit = plain('#737b5c', 0.8, 0.05);
  const matVest = plain('#3e4739', 0.76, 0.1);
  const matSkin = plain('#dba982', 0.66, 0.04);
  const matHelmet = plain('#2d362d', 0.5, 0.18);

  return (
    <group>
      {/* Tấm lót sàn khoang lái màu sáng quân sự làm nổi rõ chiếc ghế võng nằm ngửa & người lái! */}
      <mesh position={[2.52, 0.48, 0]} geometry={rbox(1.52, 0.024, 1.66, 0.01)} material={matCockpitLiner()} receiveShadow />

      {/* Khung ống thép & đệm ghế võng nằm ngửa sát sàn (Reclining Cradle Hammock) */}
      {CRADLE_FRAME_PIPES.map((g, i) => (
        <mesh key={i} geometry={g} material={matBrushedSteel()} castShadow />
      ))}
      <mesh position={[2.22, 0.71, 0]} rotation={[0, 0, -0.4]} geometry={rbox(0.74, 0.075, 0.46, 0.02)} material={matRubber()} castShadow />
      <mesh position={[1.92, 0.92, 0]} rotation={[0, 0, -0.46]} geometry={rbox(0.2, 0.095, 0.3, 0.025)} material={matRubber()} castShadow />
      <mesh position={[2.74, 0.57, 0]} rotation={[0, 0, 0.16]} geometry={rbox(0.54, 0.075, 0.46, 0.02)} material={matRubber()} castShadow />
      <mesh position={[3.16, 0.58, 0]} rotation={[0, 0, -0.14]} geometry={rbox(0.42, 0.055, 0.4, 0.015)} material={matRubber()} castShadow />
      {[-0.13, 0.13].map((zPed, i) => (
        <mesh key={i} position={[3.42, 0.63, zPed]} rotation={[0, 0, -0.45]} material={matBrass()} castShadow>
          <boxGeometry args={[0.045, 0.17, 0.11]} />
        </mesh>
      ))}

      {/* NGƯỜI LÁI XE ĐỘI MŨ CVC NẰM NGỬA THOẢI MÁI */}
      <group>
        <mesh position={[2.28, 0.8, 0]} rotation={[0, 0, -0.4]} material={matVest} castShadow>
          <boxGeometry args={[0.5, 0.22, 0.34]} />
        </mesh>
        <group position={[2.01, 0.97, 0]} rotation={[0, 0, -0.22]}>
          <mesh material={matSkin} castShadow>
            <sphereGeometry args={[0.098, 16, 14]} />
          </mesh>
          <mesh position={[-0.015, 0.02, 0]} material={matHelmet} castShadow>
            <sphereGeometry args={[0.118, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
          </mesh>
          <mesh position={[0.088, 0.015, 0]} material={matCyanOptic()}>
            <boxGeometry args={[0.04, 0.048, 0.15]} />
          </mesh>
          {[-0.108, 0.108].map((zEar, i) => (
            <mesh key={i} position={[-0.01, -0.01, zEar]} material={matRubber()}>
              <cylinderGeometry args={[0.045, 0.045, 0.032, 12]} />
            </mesh>
          ))}
        </group>

        {[-0.105, 0.105].map((zLeg, i) => (
          <group key={i} position={[0, 0, zLeg]}>
            <mesh position={[2.74, 0.68, 0]} rotation={[0, 0, 0.2]} material={matSuit} castShadow>
              <boxGeometry args={[0.44, 0.125, 0.125]} />
            </mesh>
            <mesh position={[3.14, 0.67, 0]} rotation={[0, 0, -0.15]} material={matSuit} castShadow>
              <boxGeometry args={[0.42, 0.11, 0.11]} />
            </mesh>
            <mesh position={[3.36, 0.67, 0]} rotation={[0, 0, -0.35]} material={matRubber()} castShadow>
              <boxGeometry args={[0.095, 0.2, 0.11]} />
            </mesh>
          </group>
        ))}

        {/* Hai cánh tay vươn lên nắm ghi-đông chữ T */}
        {[-1, 1].map((side) => {
          const handShiftX = -side * Math.sin(steerAngle) * 0.13;
          return (
            <mesh
              key={side}
              position={[2.46 + handShiftX * 0.5, 0.91, side * 0.21]}
              rotation={[0, -side * 0.08, 0.26]}
              material={matSuit}
              castShadow
            >
              <boxGeometry args={[0.44, 0.092, 0.092]} />
            </mesh>
          );
        })}
      </group>

      {/* BẢNG ĐỒNG HỒ SỐ & GHI-ĐÔNG CHỮ T KIỂU MÔ-TÔ (T-BAR MOTORCYCLE HANDLEBARS) */}
      <group position={[2.68, 0.99, 0]}>
        <mesh position={[0.22, 0.08, 0]} rotation={[0, 0, -0.34]} material={matMidSteel()} castShadow>
          <cylinderGeometry args={[0.038, 0.048, 0.48, 16]} />
        </mesh>
        {/* Cụm màn hình hiển thị thông số lái (DID) phát sáng hổ phách */}
        <group position={[0.38, 0.15, -0.2]} rotation={[0, -0.35, 0.25]}>
          <mesh geometry={rbox(0.08, 0.21, 0.28, 0.012)} material={matMidSteel()} castShadow />
          <mesh position={[-0.043, 0, 0]} material={matAmberScreen()}>
            <boxGeometry args={[0.008, 0.16, 0.23]} />
          </mesh>
        </group>

        {/* ĐẦU GHI-ĐÔNG CHỮ T XOAY LÁI THEO `steerAngle` */}
        <group rotation={[steerAngle * 0.15, -steerAngle, 0]}>
          <mesh geometry={rbox(0.11, 0.095, 0.15, 0.016)} material={matYellow()} castShadow />
          <mesh rotation={[Math.PI / 2, 0, 0]} material={matTorsionSteel()} castShadow>
            <cylinderGeometry args={[0.024, 0.024, 0.62, 16]} />
          </mesh>

          {/* Tay nắm bên trái + tay phanh */}
          <group position={[0, 0, -0.25]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={matRubber()} castShadow>
              <cylinderGeometry args={[0.032, 0.032, 0.16, 14]} />
            </mesh>
            <mesh position={[0.062, -0.01, 0]} material={matTorsionSteel()}>
              <boxGeometry args={[0.02, 0.016, 0.14]} />
            </mesh>
            <mesh position={[-0.01, -0.005, 0]} material={matRubber()}>
              <sphereGeometry args={[0.048, 10, 10]} />
            </mesh>
          </group>

          {/* TAY GA VẶN BÊN PHẢI KIỂU MÔ-TÔ XOAY CỔ TAY THEO `throttleTwist` */}
          <group position={[0, 0, 0.25]}>
            <mesh position={[0.062, -0.01, 0]} material={matTorsionSteel()}>
              <boxGeometry args={[0.02, 0.016, 0.14]} />
            </mesh>
            <group rotation={[0, 0, -throttleTwist]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={matRubber()} castShadow>
                <cylinderGeometry args={[0.034, 0.034, 0.16, 16]} />
              </mesh>
              <mesh position={[0.035, 0, -0.04]} material={matAmberScreen()}>
                <boxGeometry args={[0.014, 0.018, 0.06]} />
              </mesh>
              <mesh position={[-0.01, -0.008, 0]} material={matRubber()}>
                <sphereGeometry args={[0.048, 10, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>

      {/* CẦU NẮP LÁI XE & 3 KÍNH TIỀM VỌNG GÓC RỘNG PHÍA TRÊN ĐẦU LÁI XE */}
      <group position={[2.46, 1.24, 0]}>
        <mesh position={[0, -0.02, -0.26]} geometry={rbox(0.56, 0.06, 0.96, 0.015)} material={matHullDesert()} castShadow />
        <mesh position={[0, -0.02, 0.225]} material={matCutEdge()}>
          <boxGeometry args={[0.55, 0.062, 0.018]} />
        </mesh>
        {[
          [-0.18, 0.38],
          [0, 0],
          [0.18, -0.38],
        ].map(([zOff, yaw], i) => (
          <group key={i} position={[0.14, 0.06, zOff]} rotation={[0, yaw, 0]}>
            <mesh geometry={rbox(0.13, 0.11, 0.11, 0.012)} material={matHullDesert()} castShadow />
            <mesh position={[0.066, 0.01, 0]} material={matCyanOptic()}>
              <boxGeometry args={[0.012, 0.065, 0.085]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* Dầm ngang vòm cổ tháp pháo ngay sau lưng ghế lái (gắn chắc vào hai vách sườn, không lơ lửng!) */}
      <mesh position={[1.74, 1.21, -0.36]} geometry={rbox(0.14, 0.07, 1.28, 0.015)} material={matMidSteel()} castShadow />
      <mesh position={[1.74, 1.21, 0.285]} material={matCutEdge()}>
        <boxGeometry args={[0.145, 0.072, 0.02]} />
      </mesh>
    </group>
  );
};

// ---------- Hệ thống treo 14 Thanh thép xoắn (Torsion Bars) + Tay đòn + 7 Cặp bánh đôi ----------
const TorsionSuspensionSystem: React.FC<{
  wheelDrop: number;
  leftTravel: number;
  rightTravel: number;
}> = ({ wheelDrop, leftTravel, rightTravel }) => {
  const drop = Math.max(-0.14, Math.min(0.16, wheelDrop * 0.1));
  const wheelY = WHEEL_R - drop;
  const leftSpin = leftTravel / WHEEL_R;
  const rightSpin = rightTravel / WHEEL_R;

  const anchorY = 0.515;
  const armDxLeft = 0.36;
  const armDxRight = 0.14; // Tách 0.22 m giữa cặp thanh xoắn trái & phải để ĐẾM RÕ TỪNG THANH TRONG ĐỦ 14 THANH!
  const armDy = wheelY - anchorY;

  const { barsGeo, leftAnchorsGeo, rightAnchorsGeo } = useMemo(() => {
    const bars: THREE.BufferGeometry[] = [];
    const lAnc: THREE.BufferGeometry[] = [];
    const rAnc: THREE.BufferGeometry[] = [];

    const barCyl = new THREE.CylinderGeometry(0.03, 0.03, 2.16, 16);
    barCyl.rotateX(Math.PI / 2);
    const splineHead = new THREE.CylinderGeometry(0.056, 0.056, 0.12, 14);
    splineHead.rotateX(Math.PI / 2);

    WHEEL_X.forEach((wx) => {
      // Thanh xoắn #1..#7 cho 7 bánh BÊN TRÁI (neo ở vách PHẢI z = +0.97)
      const xBarL = wx + armDxLeft;
      bars.push(barCyl.clone().applyMatrix4(mat4([xBarL, anchorY, -0.04])));
      rAnc.push(splineHead.clone().applyMatrix4(mat4([xBarL, anchorY, 0.97])));

      // Thanh xoắn #8..#14 cho 7 bánh BÊN PHẢI (cách 0.22 m, neo ở vách TRÁI z = -0.97)
      const xBarR = wx + armDxRight;
      bars.push(barCyl.clone().applyMatrix4(mat4([xBarR, anchorY, 0.04])));
      lAnc.push(splineHead.clone().applyMatrix4(mat4([xBarR, anchorY, -0.97])));
    });

    return {
      barsGeo: merge(bars),
      leftAnchorsGeo: merge(lAnc),
      rightAnchorsGeo: merge(rAnc),
    };
  }, []);

  return (
    <group>
      {/* Sàn đáy thép tối tạo tương phản rực nét cho 14 thanh thép xoắn chạy ngang! */}
      <mesh position={[0.19, 0.445, 0]} geometry={rbox(3.1, 0.045, 2.08, 0.015)} material={matBellyDark()} castShadow receiveShadow />

      {/* 14 THANH THÉP XOẮN (TORSION BARS) TÁCH RÕ TỪNG THANH + ĐẦU KHỚP THEN HOA MÀU ĐỒNG / ĐỎ */}
      <mesh geometry={barsGeo} material={matTorsionSteel()} castShadow />
      <mesh geometry={leftAnchorsGeo} material={matBrass()} castShadow />
      <mesh geometry={rightAnchorsGeo} material={matCutEdge()} castShadow />

      {/* 7 CẶP TAY ĐÒN (ROAD ARMS) & 7 CẶP BÁNH CHỊU NẶNG ĐÔI HAI BÊN */}
      {WHEEL_X.map((wx, idx) => {
        const hasDamper = idx === 0 || idx === 1 || idx === 6;
        return (
          <React.Fragment key={idx}>
            {[-1, 1].map((side) => {
              const xPivot = side < 0 ? wx + armDxLeft : wx + armDxRight;
              const dxActual = xPivot - wx;
              const lenActual = Math.hypot(dxActual, armDy);
              const angActual = Math.atan2(armDy, -dxActual);
              const spin = side < 0 ? leftSpin : rightSpin;

              return (
                <group key={side}>
                  <mesh position={[xPivot, anchorY, side * 1.1]} rotation={[Math.PI / 2, 0, 0]} material={matMidSteel()} castShadow>
                    <cylinderGeometry args={[0.068, 0.075, 0.14, 16]} />
                  </mesh>
                  {hasDamper && (
                    <mesh position={[xPivot + 0.07, anchorY + 0.1, side * 1.1]} geometry={rbox(0.17, 0.14, 0.11, 0.02)} material={matDarkSteel()} castShadow />
                  )}

                  <mesh
                    position={[(xPivot + wx) / 2, (anchorY + wheelY) / 2, side * 1.16]}
                    rotation={[0, 0, Math.PI - angActual]}
                    geometry={rbox(lenActual + 0.08, 0.095, 0.075, 0.02)}
                    material={matMidSteel()}
                    castShadow
                  />
                  <mesh position={[wx, wheelY, side * 1.32]} rotation={[Math.PI / 2, 0, 0]} material={matDarkSteel()}>
                    <cylinderGeometry args={[0.075, 0.075, 0.36, 16]} />
                  </mesh>

                  <Wheel
                    r={WHEEL_R}
                    width={0.165}
                    spin={spin}
                    tire="#22252a"
                    rim={PAL.hullMid}
                    bolts={10}
                    position={[wx, wheelY, side * 1.23]}
                  />
                  <Wheel
                    r={WHEEL_R}
                    width={0.165}
                    spin={spin}
                    tire="#22252a"
                    rim={PAL.hullMid}
                    bolts={10}
                    position={[wx, wheelY, side * 1.46]}
                  />
                </group>
              );
            })}
          </React.Fragment>
        );
      })}

      {/* BÁNH DẪN HƯỚNG PHÍA TRƯỚC (FRONT IDLERS), GIÁ ĐỠ CON LĂN TRÊN & BÁNH SAO CHỦ ĐỘNG */}
      {[-1, 1].map((side) => {
        const spin = side < 0 ? leftSpin : rightSpin;
        return (
          <group key={`aux${side}`}>
            <mesh position={[3.04, 0.58, side * 1.16]} rotation={[0, 0, 0.22]} geometry={rbox(0.44, 0.09, 0.08, 0.02)} material={matMidSteel()} castShadow />
            <Wheel r={0.285} width={0.15} spin={spin * 1.1} tire="#25282d" rim={PAL.hullMid} bolts={8} position={[3.24, 0.63, side * 1.24]} />
            <Wheel r={0.285} width={0.15} spin={spin * 1.1} tire="#25282d" rim={PAL.hullMid} bolts={8} position={[3.24, 0.63, side * 1.45]} />

            {/* 2 con lăn đỡ nhánh xích trên CÓ TRỤ GIÁ ĐỠ THÉP gắn chắc vào thành xe! */}
            {[0.96, -0.84].map((rx, k) => (
              <group key={k}>
                <mesh
                  position={[rx, 0.75, side * 1.16]}
                  rotation={[-side * 0.52, 0, 0]}
                  geometry={rbox(0.08, 0.36, 0.08, 0.015)}
                  material={matMidSteel()}
                  castShadow
                />
                <Wheel r={0.105} width={0.18} spin={spin * 2.8} tire="#22252a" rim="#5d6a75" bolts={6} position={[rx, 0.92, side * 1.32]} />
              </group>
            ))}

            {/* BÁNH SAO CHỦ ĐỘNG 11 RĂNG Ở ĐUÔI XE (x = -3.14, y = 0.64) */}
            <group position={[-3.14, 0.64, side * 1.34]} rotation={[0, 0, -spin * 0.96]}>
              <mesh position={[0, 0, -0.1]} geometry={SPROCKET_RING_GEO} material={matHullDesert()} castShadow />
              <mesh position={[0, 0, 0.1]} geometry={SPROCKET_RING_GEO} material={matHullDesert()} castShadow />
              <mesh rotation={[Math.PI / 2, 0, 0]} material={matMidSteel()} castShadow>
                <cylinderGeometry args={[0.15, 0.17, 0.3, 20]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};

export const PowerpackChassis3D: React.FC<PowerpackChassis3DProps> = ({
  mode = 'full',
  steerAngle = 0,
  throttleTwist = 0,
  wheelDrop = 0,
  leftTravel = 0,
  rightTravel = 0,
  turbineSpin = 0,
  exhaustGlow = 0,
  airPulse = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  // Chế độ cận cảnh riêng động cơ `turbineOnly`: đặt gọn cụm AGT1500 + hộp số Allison quanh [0, 0.55, 0]
  if (mode === 'turbineOnly') {
    return (
      <group position={position} rotation={rotation}>
        <AGT1500Powerpack
          position={[0.08, 0.55, 0]}
          turbineSpin={turbineSpin}
          exhaustGlow={exhaustGlow}
          airPulse={airPulse}
          showStand
        />
      </group>
    );
  }

  const showDriver = mode === 'full' || mode === 'driverOnly';
  const showSuspension = mode === 'full' || mode === 'suspensionOnly';
  const showTurbine = mode === 'full';

  return (
    <group position={position} rotation={rotation}>
      {/* ==================== MŨI THÂN DƯỚI CẮT BỔ & KHOANG LÁI NẰM NGỬA (`full` / `driverOnly`) ==================== */}
      {showDriver && (
        <group>
          {/* Sàn phẳng mũi xe kết thúc đúng tại x = +3.18 (không lòi ra dưới tấm giáp nghiêng mũi!) */}
          <mesh position={[2.46, 0.445, 0]} geometry={rbox(1.46, 0.045, 2.08, 0.012)} material={matBellyDark()} castShadow receiveShadow />
          {/* Tấm giáp nghiêng gầm mũi trước (Lower Glacis Wedge) vát sắc lẹm lên đỉnh mũi x = +3.92 */}
          <mesh geometry={LOWER_GLACIS_WEDGE_GEO} material={matHullDesert()} castShadow receiveShadow />

          {/* Vách sườn trái mỏng (dày 0.14 m ở z = -0.97) + nắp mũi trái cắt mở thoáng lòng khoang lái */}
          <mesh position={[0, 0, -0.97]} geometry={LEFT_DRIVER_WALL_GEO} material={matHullDesert()} castShadow receiveShadow />
          <mesh position={[0, 0, -0.66]} geometry={LEFT_UPPER_GLACIS_DECK} material={matHullDesert()} castShadow />
          <mesh position={[2.51, 0.785, -0.97]} material={matCutEdge()}>
            <boxGeometry args={[0.92, 0.016, 0.145]} />
          </mesh>

          {/* Gờ vách thấp bên phải mũi xe (z = +0.97) + hộp mặt cắt nhiều lớp giáp Chobham khối mũi trước */}
          <mesh position={[0, 0, 0.97]} geometry={RIGHT_DRIVER_SILL_GEO} material={matHullDesert()} castShadow receiveShadow />
          <mesh position={[2.42, 0.605, 0.97]} material={matCutEdge()}>
            <boxGeometry args={[1.38, 0.016, 0.145]} />
          </mesh>
          <group position={[3.52, 0.77, 0.64]} rotation={[0, 0, 0.56]}>
            <mesh position={[0, -0.02, 0]} material={matDarkSteel()}>
              <boxGeometry args={[0.3, 0.08, 0.68]} />
            </mesh>
            <mesh position={[0, 0.022, 0.34]} material={matCutEdge()}>
              <boxGeometry args={[0.31, 0.02, 0.02]} />
            </mesh>
            {[-0.09, -0.03, 0.03, 0.09].map((off, k) => (
              <mesh
                key={k}
                position={[off, 0.02, 0]}
                material={k % 2 === 0 ? plain('#e3dccb', 0.5, 0.1) : plain('#715da8', 0.38, 0.68)}
              >
                <boxGeometry args={[0.028, 0.06, 0.64]} />
              </mesh>
            ))}
          </group>

          {/* 2 tai móc kéo mũi xe */}
          {[-0.68, 0.68].map((zTow, i) => (
            <mesh key={i} position={[3.9, 0.9, zTow]} rotation={[0, Math.PI / 2, 0]} material={matMidSteel()} castShadow>
              <torusGeometry args={[0.065, 0.022, 10, 18]} />
            </mesh>
          ))}

          {/* Cụm ghế võng nằm ngửa + Người lái mũ CVC + Ghi-đông T-bar + 3 Kính tiềm vọng */}
          <RecliningDriverBay steerAngle={steerAngle} throttleTwist={throttleTwist} />
        </group>
      )}

      {/* ==================== KHUNG SƯỜN GIỮA & ĐUÔI CẮT BỔ (`full`) ==================== */}
      {mode === 'full' && (
        <group>
          {/* Vách thân dưới bên trái hạ thấp (y = 0.78) để lộ rõ toàn bộ 14 thanh xoắn & động cơ từ mọi góc */}
          <mesh position={[-0.98, 0.61, -1.03]} geometry={rbox(5.42, 0.34, 0.07, 0.012)} material={matHullDesert()} castShadow />
          <mesh position={[-0.98, 0.785, -1.03]} material={matCutEdge()}>
            <boxGeometry args={[5.4, 0.016, 0.075]} />
          </mesh>
          {/* Gờ sườn thấp bên phải (y = 0.58) */}
          <mesh position={[-0.98, 0.51, 1.03]} geometry={rbox(5.42, 0.15, 0.07, 0.01)} material={matHullDesert()} castShadow />
          <mesh position={[-0.98, 0.59, 1.03]} material={matCutEdge()}>
            <boxGeometry args={[5.4, 0.015, 0.075]} />
          </mesh>

          {/* Chắn bùn trên bánh xích bên trái ở mũi & đuôi giữ kích thước chuẩn rộng 3.4 m */}
          <mesh position={[3.05, 1.04, -1.36]} geometry={rbox(1.5, 0.055, 0.62, 0.015)} material={matHullDesert()} castShadow />
          <mesh position={[-3.08, 1.06, -1.36]} geometry={rbox(1.48, 0.055, 0.62, 0.015)} material={matHullDesert()} castShadow />

          {/* Vách ngăn lửa khoang động cơ cắt thấp bậc thang (x = -1.36) để KHÔNG CHE phễu hút khí & cánh máy nén AGT1500! */}
          <mesh position={[-1.36, 0.57, 0]} geometry={rbox(0.06, 0.2, 2.04, 0.01)} material={matMidSteel()} castShadow />
          <mesh position={[-1.36, 0.78, -0.82]} geometry={rbox(0.06, 0.36, 0.4, 0.01)} material={matMidSteel()} castShadow />
          <mesh position={[-1.36, 0.675, 0.18]} material={matCutEdge()}>
            <boxGeometry args={[0.065, 0.016, 1.62]} />
          </mesh>

          {/* Sàn & dầm đuôi khoang động cơ */}
          <mesh position={[-2.58, 0.45, 0]} geometry={rbox(2.48, 0.05, 2.08, 0.015)} material={matBellyDark()} castShadow receiveShadow />
          <mesh position={[-3.78, 0.56, 0]} geometry={rbox(0.14, 0.24, 2.14, 0.02)} material={matHullDesert()} castShadow />
          <mesh position={[-3.86, 0.56, 0]} rotation={[Math.PI / 2, 0, 0]} material={matDarkSteel()}>
            <torusGeometry args={[0.07, 0.024, 10, 18]} />
          </mesh>
        </group>
      )}

      {/* ==================== HỆ THỐNG TREO 14 THANH XOẮN & 7 CẶP BÁNH ĐÔI ==================== */}
      {showSuspension && (
        <TorsionSuspensionSystem
          wheelDrop={wheelDrop}
          leftTravel={leftTravel}
          rightTravel={rightTravel}
        />
      )}

      {/* ==================== CỤM TUABIN PHẢN LỰC AGT1500 + HỘP SỐ ALLISON X1100-3B ==================== */}
      {showTurbine && (
        <AGT1500Powerpack
          position={[-2.42, 0.66, 0]}
          turbineSpin={turbineSpin}
          exhaustGlow={exhaustGlow}
          airPulse={airPulse}
        />
      )}
    </group>
  );
};

export default PowerpackChassis3D;

export const preview = turntable(PowerpackChassis3D, { size: 8.0, center: [0, 0.85, 0] });
