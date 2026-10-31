// C04S06 (705.98–717.04 s) — 3D monsoonNight / chinaSurfNight:
// Góc thấp sát mặt sóng bãi biển đêm lia ngang cú đáp bụng (belly-ditch) trượt rạch qua ngọn sóng bạc
// của chiếc B-25 #6 (Trung úy Dean Hallmark), tung hai bức tường bọt nước trắng xoá, chúi mũi nửa chìm,
// trong khi từ gò cát cao trên bờ hai luồng đèn pha tuần tra Nhật quét thẳng xuống 3 phi công sống sót.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { CUE } from '../cues';
import { STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, waveY } from '../parts/OceanSurface';

const SWELL = 2.4;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (a: number, b: number, x: number) => {
  const u = clamp01((x - a) / (b - a));
  return u * u * (3 - 2 * u);
};

// ---------- Textures tự sinh tất định: Bọt sương sóng biển mềm mượt (gradient đa tâm, không đốm tròn cứng) ----------

let seaSprayTex: THREE.CanvasTexture | null = null;
function getSeaSprayTex(): THREE.CanvasTexture {
  if (seaSprayTex) return seaSprayTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const ctx = cv.getContext('2d')!;
  const gMain = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
  gMain.addColorStop(0, 'rgba(246,252,255,0.88)');
  gMain.addColorStop(0.42, 'rgba(210,234,255,0.48)');
  gMain.addColorStop(0.78, 'rgba(170,210,245,0.14)');
  gMain.addColorStop(1, 'rgba(160,205,245,0)');
  ctx.fillStyle = gMain;
  ctx.fillRect(0, 0, 128, 128);

  // Cộng các đám bọt sương mờ (radial gradient biên mềm) để tạo kết cấu bọt nước tự nhiên
  for (let i = 0; i < 24; i++) {
    const a = rnd(i * 7 + 1) * Math.PI * 2;
    const rad = 8 + rnd(i * 11 + 2) * 28;
    const rPuff = 10 + rnd(i * 13 + 3) * 16;
    const cx = 64 + Math.cos(a) * rad;
    const cy = 64 + Math.sin(a) * rad;
    const gp = ctx.createRadialGradient(cx, cy, 0, cx, cy, rPuff);
    gp.addColorStop(0, `rgba(255,255,255,${0.18 + rnd(i * 17 + 4) * 0.22})`);
    gp.addColorStop(1, 'rgba(220,240,255,0)');
    ctx.fillStyle = gp;
    ctx.beginPath();
    ctx.arc(cx, cy, rPuff, 0, Math.PI * 2);
    ctx.fill();
  }
  seaSprayTex = new THREE.CanvasTexture(cv);
  seaSprayTex.colorSpace = THREE.SRGBColorSpace;
  return seaSprayTex;
}

let poolLightTex: THREE.CanvasTexture | null = null;
function getPoolLightTex(): THREE.CanvasTexture {
  if (poolLightTex) return poolLightTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 31);
  g.addColorStop(0, 'rgba(225,243,255,0.85)');
  g.addColorStop(0.5, 'rgba(175,218,255,0.35)');
  g.addColorStop(1, 'rgba(145,200,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  poolLightTex = new THREE.CanvasTexture(cv);
  poolLightTex.colorSpace = THREE.SRGBColorSpace;
  return poolLightTex;
}

// ---------- Địa hình bãi biển cát ướt, ghềnh đá tối & gò cát cao trên bờ ----------

const BEACH_H = heightField({
  seed: 406,
  amp: 0.95,
  scale: 72,
  add: (x, z) => {
    if (z < 5) {
      return -7.2 + smoothstep(-18, 5, z) * 5.4;
    }
    // Bãi cát ướt rộng thoai thoải (z = 5..21 -> y = -1.8..+2.3 m) để thấy rõ 3 phi công lảo đảo trên cát
    const shoreSlope = lerp(-1.8, 2.3, smoothstep(5, 21, z));
    // Gò cát cao ven biển lùi về z = 21..34 (cao 8.5..10.6 m) tạo 2 đỉnh đụn cát rõ rệt cho 2 đài đèn pha Nhật
    const duneBase = smoothstep(20.5, 32.5, z) * 6.0;
    const patrolPeakNear = Math.exp(-Math.pow((x - 13.5) / 6.5, 2) - Math.pow((z - 27.5) / 5.5, 2)) * 2.5;
    const patrolPeakFar = Math.exp(-Math.pow((x - 28.5) / 7.5, 2) - Math.pow((z - 23.0) / 5.5, 2)) * 3.1;
    const inlandHills =
      z > 40
        ? Math.pow((z - 40) / 72, 1.32) * 22 + Math.sin(x * 0.055) * Math.min(5, (z - 40) * 0.14)
        : 0;
    return shoreSlope + duneBase + patrolPeakNear + patrolPeakFar + inlandHills;
  },
});

const NIGHT_BEACH_COLORS = {
  low: '#182433',
  high: '#2b3644',
  rock: '#1e252f',
  dry: '#384350',
};

const avoidSurfAndPatrol = (x: number, z: number) =>
  z < 20 || (x > 11 && x < 37 && z < 34);

// ---------- Ghềnh đá tối ven biển (Sea-stack Boulders) ----------

const CoastalRockCluster: React.FC<{ pos: V3; scale?: number; seed?: number }> = ({
  pos,
  scale = 1,
  seed = 1,
}) => {
  const mat = useMemo(
    () =>
      paint({
        color: '#232c37',
        camo: ['#171e27', '#323e4c'],
        wear: 0.3,
        dirt: 0.25,
        roughness: 0.4,
        metalness: 0.15,
        repeat: 0.5,
        seed,
      }),
    [seed],
  );

  const blocks = useMemo(
    () => [
      { p: [0, 0.65, 0] as V3, s: [2.7, 1.4, 2.1] as V3, r: [0.1, 0.4, -0.08] as V3 },
      { p: [1.5, 0.4, -0.7] as V3, s: [1.8, 0.95, 1.5] as V3, r: [-0.12, 1.1, 0.15] as V3 },
      { p: [-1.3, 0.48, 0.6] as V3, s: [2.0, 1.1, 1.6] as V3, r: [0.08, -0.7, 0.1] as V3 },
      { p: [0.35, 1.25, 0.25] as V3, s: [1.4, 1.0, 1.2] as V3, r: [0.2, 0.8, -0.18] as V3 },
    ],
    [],
  );

  return (
    <group position={pos} scale={scale}>
      {blocks.map((b, i) => (
        <mesh key={i} position={b.p} rotation={b.r} scale={b.s} material={mat} castShadow receiveShadow>
          <dodecahedronGeometry args={[0.85, 1]} />
        </mesh>
      ))}
    </group>
  );
};

// ---------- Hai Bức Tường Bọt Nước Bạc Trắng Xoá Tách Đôi Chữ V (Không che thân B-25!) ----------

const SurfBellyDitchSpray: React.FC<{
  t: number;
  skimAt: number;
  ditchAt: number;
  stopAt: number;
  planePos: V3;
  planeYaw: number;
}> = ({ t, skimAt, ditchAt, stopAt, planePos, planeYaw }) => {
  const sprayTex = useMemo(() => getSeaSprayTex(), []);

  if (t < skimAt) return null;

  const skimP = clamp01((t - skimAt) / (ditchAt - skimAt));
  const fullDitch = t >= ditchAt ? Math.max(0, 1 - Math.max(0, t - stopAt) / 1.05) : 0;
  const wallPower = Math.max(skimP * 0.45, fullDitch);

  const ca = Math.cos(planeYaw);
  const sa = -Math.sin(planeYaw);
  const toWorld = (lx: number, ly: number, lz: number): V3 => [
    planePos[0] + lx * ca - lz * sa,
    ly,
    planePos[2] + lx * sa + lz * ca,
  ];

  const surfBaseY = waveY(planePos[0], planePos[2], t, SWELL) * 0.4;

  return (
    <group>
      {/* 1. Rãnh bọt sóng trắng xoá sôi sục kéo dài trên mặt biển phía sau đuôi chiếc #6 */}
      {t > skimAt + 0.08 &&
        Array.from({ length: 20 }, (_, i) => {
          const frac = i / 19;
          const wx = lerp(-11.5, planePos[0] + 2.2, frac);
          const wz = lerp(-5.0, planePos[2] + 0.2, frac) + Math.sin(i * 1.9 + t * 2.2) * 0.45;
          const wy = waveY(wx, wz, t, SWELL) * 0.42 + 0.22;
          const wSize = (2.1 + (1 - frac) * 2.5) * clamp01((t - skimAt) * 1.5);
          const fade = clamp01(1.15 - Math.max(0, t - stopAt) * 0.16);
          return (
            <sprite key={`wake-${i}`} position={[wx, wy, wz]} scale={[wSize * 1.6, wSize * 0.5, wSize]}>
              <spriteMaterial
                map={sprayTex}
                color="#e3f1fd"
                transparent
                opacity={0.56 * fade * Math.sin(frac * Math.PI * 0.85 + 0.2)}
                depthWrite={false}
              />
            </sprite>
          );
        })}

      {/* 2. HAI BỨC TƯỜNG BỌT NƯỚC BẠC TRẮNG XOÁ:
          - Tường mạn trái (-Z, phía sau thân máy bay): dựng cao 7.5 m làm phông nền bọt bạc rực sáng tôn nổi bật biên dạng tối của thân & đuôi B-25!
          - Tường mạn phải (+Z, phía ống kính): văng xoè rộng sát mặt sóng (cao 2.4–3.2 m) để KHÔNG che khuất buồng lái, phù hiệu sao trắng & cánh hải âu! */}
      {wallPower > 0.02 &&
        ([-1, 1] as const).map((side) =>
          Array.from({ length: 22 }, (_, k) => {
            const u = k / 21;
            const lx = lerp(5.4, -4.0, u);
            const cycle = ((t * 4.2 + k * 0.17 + (side > 0 ? 0.45 : 0)) % 1);
            const outZ = side * (2.1 + cycle * (side > 0 ? 5.6 : 4.8));
            const peakScale = side < 0 ? 7.8 : 2.9;
            const arcY =
              surfBaseY +
              0.25 +
              (peakScale * cycle - peakScale * 0.62 * cycle * cycle) *
                (0.7 + 0.45 * (1 - Math.abs(u - 0.32))) *
                wallPower;
            const wp = toWorld(lx - cycle * 3.2, arcY, outZ);
            const sz = (1.35 + cycle * (side < 0 ? 2.3 : 1.7)) * (0.72 + 0.32 * wallPower);
            const op = Math.sin(cycle * Math.PI) * (side < 0 ? 0.88 : 0.76) * wallPower;

            return (
              <sprite key={`spray-${side}-${k}`} position={wp} scale={[sz * 1.2, sz * (side < 0 ? 1.4 : 0.85), sz]}>
                <spriteMaterial
                  map={sprayTex}
                  color={k % 2 === 0 ? '#ffffff' : '#d6eafd'}
                  transparent
                  opacity={op}
                  depthWrite={false}
                  toneMapped={false}
                />
              </sprite>
            );
          }),
        )}

      {/* 3. Giọt/tia bọt nước 3D trắng bạc văng đạn đạo hai bên động cơ & mũi máy bay */}
      {wallPower > 0.04 &&
        ([-1, 1] as const).map((side) =>
          Array.from({ length: 18 }, (_, j) => {
            const ph = ((t * 4.8 + j * 0.21 + (side < 0 ? 0.33 : 0)) % 1);
            const lx = lerp(5.6, -2.5, (j % 9) / 8) - ph * 3.8;
            const vOut = 3.8 + rnd(j * 13 + (side > 0 ? 5 : 9)) * 4.0;
            const vUp = (side < 0 ? 6.2 : 3.6) + rnd(j * 19 + 3) * 2.6;
            const lz = side * (1.8 + vOut * ph);
            const ly = surfBaseY + 0.2 + (vUp * ph - 5.2 * ph * ph) * wallPower;
            if (ly < surfBaseY - 0.3) return null;
            const wp = toWorld(lx, ly, lz);
            const dropR = (0.1 + rnd(j * 7) * 0.13) * (1 - ph * 0.45);
            return (
              <mesh key={`drop-${side}-${j}`} position={wp} scale={[1.45, 0.88, 0.88]}>
                <icosahedronGeometry args={[dropR, 0]} />
                <meshBasicMaterial
                  color="#f4faff"
                  transparent
                  opacity={0.9 * (1 - ph * 0.8) * wallPower}
                  toneMapped={false}
                />
              </mesh>
            );
          }),
        )}

      {/* 4. Sóng biển trắng bạc tiếp tục vỗ tung bọt quanh mũi & cánh chiếc B-25 #6 chúi mũi nửa chìm (712.5–717.4 s) */}
      {t > stopAt - 0.4 &&
        Array.from({ length: 12 }, (_, m) => {
          const pulse = ((t * 1.55 + m * 0.21) % 1);
          const ang = (m / 12) * Math.PI * 2;
          const sx = planePos[0] + 1.2 + Math.cos(ang) * (2.5 + (m % 3) * 1.3);
          const sz = planePos[2] + Math.sin(ang) * (1.8 + (m % 2) * 1.1);
          const sy = surfBaseY + 0.3 + Math.sin(pulse * Math.PI) * 1.15;
          const pScale = 1.35 + pulse * 1.35;
          return (
            <sprite key={`wash-${m}`} position={[sx, sy, sz]} scale={[pScale * 1.45, pScale * 0.7, pScale]}>
              <spriteMaterial
                map={sprayTex}
                color="#e4f2ff"
                transparent
                opacity={Math.sin(pulse * Math.PI) * 0.52}
                depthWrite={false}
              />
            </sprite>
          );
        })}

      {wallPower > 0.02 && (
        <pointLight
          position={[planePos[0] + 1.0, surfBaseY + 3.4, planePos[2] + 3.2]}
          color="#d8ecff"
          intensity={28 * wallPower}
          distance={26}
          decay={1.5}
        />
      )}
    </group>
  );
};

// ---------- Quầng sáng đèn pha ôm sát mặt cong bãi cát BEACH_H ----------

const ConformalLightPool: React.FC<{ centerX: number; centerZ: number; radius: number; power: number }> = ({
  centerX,
  centerZ,
  radius,
  power,
}) => {
  const tex = useMemo(() => getPoolLightTex(), []);

  const geo = useMemo(() => {
    const seg = 14;
    const g = new THREE.PlaneGeometry(radius * 2, radius * 2, seg, seg);
    g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) {
      const wx = centerX + p.getX(i);
      const wz = centerZ + p.getZ(i);
      p.setXYZ(i, wx, BEACH_H(wx, wz) + 0.045, wz);
    }
    g.computeVertexNormals();
    return g;
  }, [centerX, centerZ, radius]);

  if (power <= 0.02) return null;

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={0.32 * power}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
};

// ---------- 3 Phi công Mỹ sống sót lảo đảo dạt vào bãi cát ướt (áo da A-2 + áo phao vàng Mae West) ----------

const StumblingSurvivor: React.FC<{
  pos: V3;
  rotY: number;
  t: number;
  pose: 'shieldEyes' | 'stagger' | 'kneel';
  phase: number;
}> = ({ pos, rotY, t, pose, phase }) => {
  const mats = useMemo(
    () => ({
      wetLeather: plain('#42291b', 0.34, 0.14),
      maeWest: plain('#f5c42c', 0.4, 0.08),
      wetKhaki: plain('#5d553c', 0.52, 0.08),
      skin: plain('#dca884', 0.65, 0.04),
      hairDark: plain('#2b1e16', 0.7, 0.05),
      boots: plain('#1f1510', 0.45, 0.15),
    }),
    [],
  );

  const step = Math.sin(t * 4.4 + phase) * 0.32;
  const swayZ = Math.sin(t * 2.8 + phase) * 0.09;
  const isKneel = pose === 'kneel';
  const yDrop = isKneel ? -0.34 : 0;

  return (
    <group position={[pos[0], pos[1] + yDrop, pos[2]]} rotation={[isKneel ? 0.26 : 0.12, rotY, swayZ]}>
      <mesh
        position={[0, 0.42, -0.11]}
        rotation={[0, 0, isKneel ? 0.65 : step]}
        geometry={rbox(0.15, 0.76, 0.15, 0.05)}
        material={mats.wetKhaki}
        castShadow
      />
      <mesh
        position={[0.04, 0.42, 0.11]}
        rotation={[0, 0, isKneel ? -0.45 : -step]}
        geometry={rbox(0.15, 0.76, 0.15, 0.05)}
        material={mats.wetKhaki}
        castShadow
      />
      <mesh position={[0.02, 0.07, -0.11]} geometry={rbox(0.22, 0.12, 0.13, 0.03)} material={mats.boots} />
      <mesh position={[0.06, 0.07, 0.11]} geometry={rbox(0.22, 0.12, 0.13, 0.03)} material={mats.boots} />

      <mesh position={[0, 1.06, 0]} geometry={rbox(0.28, 0.58, 0.42, 0.07)} material={mats.wetLeather} castShadow />
      <mesh position={[0.08, 1.1, -0.1]} geometry={rbox(0.21, 0.4, 0.165, 0.06)} material={mats.maeWest} castShadow />
      <mesh position={[0.08, 1.1, 0.1]} geometry={rbox(0.21, 0.4, 0.165, 0.06)} material={mats.maeWest} castShadow />

      <mesh
        position={[0.14, pose === 'shieldEyes' ? 1.38 : 1.08, -0.25]}
        rotation={[0, 0, pose === 'shieldEyes' ? -1.15 : 0.35]}
        geometry={rbox(0.12, 0.5, 0.12, 0.04)}
        material={mats.wetLeather}
        castShadow
      />
      <mesh
        position={[0.1, 1.1, 0.25]}
        rotation={[0.2, 0, -0.42]}
        geometry={rbox(0.12, 0.5, 0.12, 0.04)}
        material={mats.wetLeather}
        castShadow
      />

      <group position={[0.04, 1.52, 0]}>
        <mesh material={mats.skin} castShadow>
          <sphereGeometry args={[0.115, 14, 12]} />
        </mesh>
        <mesh position={[-0.02, 0.03, 0]} material={mats.hairDark}>
          <sphereGeometry args={[0.118, 12, 10]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Đèn pha tuần tra Nhật tách rõ 2 chùm sáng lạnh độc lập quét chéo từ gò cát cao xuống bãi biển ----------

const VolumetricSearchlight: React.FC<{
  origin: V3;
  target: V3;
  power: number;
}> = ({ origin, target, power }) => {
  const { midPos, quat, headQuat, len, housingMat, lensMat } = useMemo(() => {
    const o = new THREE.Vector3(...origin);
    const tg = new THREE.Vector3(...target);
    const diff = tg.clone().sub(o);
    const L = diff.length();
    const dir = diff.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().negate());
    const hq = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    const mid = o.clone().add(tg).multiplyScalar(0.5);

    return {
      midPos: [mid.x, mid.y, mid.z] as V3,
      quat: q,
      headQuat: hq,
      len: L,
      housingMat: plain('#2b3238', 0.48, 0.65),
      lensMat: new THREE.MeshBasicMaterial({ color: '#f5fbff', toneMapped: false }),
    };
  }, [origin[0], origin[1], origin[2], target[0], target[1], target[2]]);

  return (
    <group>
      <group position={[origin[0], origin[1] - 1.25, origin[2]]}>
        {[0, 1, 2].map((k) => {
          const a = (k / 3) * Math.PI * 2 + 0.4;
          return (
            <mesh
              key={k}
              position={[Math.cos(a) * 0.28, 0.62, Math.sin(a) * 0.28]}
              rotation={[Math.sin(a) * 0.32, 0, -Math.cos(a) * 0.32]}
              material={housingMat}
              castShadow
            >
              <cylinderGeometry args={[0.028, 0.032, 1.35, 8]} />
            </mesh>
          );
        })}
        <group position={[0, 1.25, 0]} quaternion={headQuat}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={housingMat} castShadow>
            <cylinderGeometry args={[0.34, 0.3, 0.58, 18]} />
          </mesh>
          {power > 0.02 && (
            <mesh position={[0, 0, 0.3]} material={lensMat}>
              <circleGeometry args={[0.31, 18]} />
            </mesh>
          )}
        </group>
      </group>

      {/* Luồng chùm sáng hẹp sắc lạnh vừa đủ (không lóa trắng xóa) để 3 bóng phi công bên trong cực kỳ rõ nét */}
      {power > 0.02 && (
        <>
          <group position={midPos} quaternion={quat}>
            <mesh>
              <cylinderGeometry args={[0.22, 1.85, len, 24, 1, true]} />
              <meshBasicMaterial
                color="#a8d3ff"
                transparent
                opacity={0.1 * power}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.14, 0.88, len, 20, 1, true]} />
              <meshBasicMaterial
                color="#e5f4ff"
                transparent
                opacity={0.2 * power}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
          </group>

          <ConformalLightPool centerX={target[0]} centerZ={target[2]} radius={2.9} power={power} />
        </>
      )}
    </group>
  );
};

/** Toán lính tuần tra Nhật đội mũ sắt Type 90, cầm súng trường Arisaka lắp lưỡi lê trên gò cát */
const JapanesePatrolSoldier: React.FC<{ pos: V3; rotY: number }> = ({ pos, rotY }) => {
  const mats = useMemo(
    () => ({
      coat: plain('#47422f', 0.85, 0.05),
      helmet: plain('#333829', 0.55, 0.25),
      wood: plain('#54341e', 0.7, 0.08),
      steel: plain('#cfd9e2', 0.25, 0.88),
      skin: plain('#cfa07a', 0.75, 0.03),
    }),
    [],
  );

  return (
    <group position={pos} rotation={[0, rotY, 0]}>
      <mesh position={[0, 0.42, -0.1]} geometry={rbox(0.15, 0.78, 0.15, 0.04)} material={mats.coat} castShadow />
      <mesh position={[0, 0.42, 0.1]} geometry={rbox(0.15, 0.78, 0.15, 0.04)} material={mats.coat} castShadow />
      <mesh position={[0, 1.04, 0]} geometry={rbox(0.28, 0.64, 0.42, 0.06)} material={mats.coat} castShadow />
      <group position={[0.24, 1.08, 0.16]} rotation={[0, 0, -0.38]}>
        <mesh geometry={rbox(0.95, 0.06, 0.05, 0.012)} material={mats.wood} castShadow />
        <mesh position={[0.62, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.steel}>
          <cylinderGeometry args={[0.012, 0.014, 0.42, 8]} />
        </mesh>
        <mesh position={[0.96, 0.025, 0]} geometry={rbox(0.34, 0.022, 0.008, 0.002)} material={mats.steel} />
      </group>
      <group position={[0.02, 1.5, 0]}>
        <mesh material={mats.skin}>
          <sphereGeometry args={[0.11, 12, 10]} />
        </mesh>
        <mesh position={[0, 0.04, 0]} material={mats.helmet} castShadow>
          <sphereGeometry args={[0.135, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.58]} />
        </mesh>
        <mesh position={[0, 0.015, 0]} material={mats.helmet}>
          <cylinderGeometry args={[0.132, 0.162, 0.045, 16]} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Component chính C04S06 ----------

const C04S06: React.FC = () => {
  const t = useT();

  const skimAt = 710.22;
  const ditchAt = CUE.c04_s06_ditches_surf - 0.08; // 710.84 s
  const stopAt = CUE.c04_s06_drowning_two + 0.35; // 712.85 s

  // ---------- 1. Quỹ đạo & tư thế chiếc B-25 #6 (Trung úy Dean Hallmark) ----------
  let px: number;
  let py: number;
  let pz: number;
  let pitch: number;
  let roll: number;
  let yaw: number;

  if (t < ditchAt) {
    const u = (t - 705.8) / (ditchAt - 705.8);
    px = lerp(-46.0, -5.0, u);
    pz = lerp(-14.0, -3.5, u);
    const touchY = waveY(-5.0, -3.5, ditchAt, SWELL) * 0.55 - 1.05;
    py = lerp(10.8, touchY, Math.pow(clamp01(u), 0.85));
    pitch = lerp(-0.03, 0.075, clamp01(u));
    roll = Math.sin(t * 2.3) * 0.06 - 0.03;
    yaw = -0.2;
  } else if (t < stopAt) {
    const pSkid = prog(t, ditchAt, stopAt);
    const decel = 1 - Math.pow(1 - pSkid, 2.2);
    px = lerp(-5.0, 11.2, decel);
    pz = lerp(-3.5, 1.4, decel);
    const localWave = waveY(px, pz, t, SWELL) * 0.38;
    const noseDig = smoothstep(0.42, 1.0, pSkid);
    py = localWave - lerp(1.08, 1.88, noseDig);
    pitch = lerp(0.06, -0.23, noseDig) + Math.sin(pSkid * Math.PI * 3) * 0.03 * (1 - pSkid);
    roll = lerp(-0.02, 0.13, noseDig);
    yaw = lerp(-0.2, -0.3, decel);
  } else {
    px = 11.2;
    pz = 1.4;
    const localWave = waveY(px, pz, t, SWELL) * 0.25;
    py = localWave - 1.88;
    pitch = -0.23 + Math.sin(t * 1.85) * 0.018;
    roll = 0.13 + Math.cos(t * 1.55) * 0.022;
    yaw = -0.3;
  }

  const propSpin = useMemo(() => {
    const tStop = ditchAt + 0.38;
    const tc = Math.min(t, tStop);
    const span = tStop - 705.5;
    const norm = clamp01((tc - 705.5) / span);
    return (norm - 0.5 * norm * norm) * span * 11.0;
  }, [t, ditchAt]);

  // ---------- 2. Máy quay đặt thấp sát mặt sóng/bờ cát (y ≈ 3.75–4.45 m, bao trọn cả B-25 #6 lẫn gò cát đèn pha ở nửa sau) ----------
  const pPanPatrol = prog(t, 712.95, 715.0);
  const ditchShake = bump(t, ditchAt + 0.05, 1.15);
  const shakeX = Math.sin(t * 37) * 0.2 * ditchShake;
  const shakeY = Math.cos(t * 43) * 0.16 * ditchShake;

  const pCamSlide = prog(t, 705.98, stopAt);
  const rawCamX = lerp(lerp(-14.5, -7.8, pCamSlide), -11.8, pPanPatrol) + shakeX;
  const rawCamZ = lerp(lerp(15.0, 13.5, pCamSlide), 7.8, pPanPatrol);
  const safeFloorY = Math.max(BEACH_H(rawCamX, rawCamZ), waveY(rawCamX, rawCamZ, t, SWELL)) + 1.95;
  const camY = Math.max(safeFloorY, lerp(3.75, 4.65, pPanPatrol)) + shakeY;

  const planeFocus: V3 = [px + 1.2, Math.max(1.9, py + 2.25), pz + 0.4];
  // Pha cuối nhìn chếch vào bờ biển: bên trái là trọn vẹn thân B-25 #6 nửa chìm giữa sóng, chính giữa là bãi cát ướt với 3 phi công, bên phải là 2 mỏm đụn cát cao với 2 chùm đèn pha Nhật đan chéo chữ X!
  const patrolOverview: V3 = [15.5, 3.6, 13.8];

  const camLook: V3 = [
    lerp(planeFocus[0], patrolOverview[0], pPanPatrol),
    lerp(planeFocus[1], patrolOverview[1], pPanPatrol),
    lerp(planeFocus[2], patrolOverview[2], pPanPatrol),
  ];

  // ---------- 3. Ba phi công sống sót dạt vào bờ cát & 2 Luồng đèn pha tuần tra Nhật đan chéo chữ X từ 2 đỉnh đụn cát ----------
  const pAshore = prog(t, 712.7, 716.8);
  const showSurvivors = t >= 712.55;

  const surv1X = lerp(14.0, 16.2, pAshore);
  const surv1Z = lerp(11.8, 14.6, pAshore);
  const surv2X = lerp(15.8, 18.4, pAshore);
  const surv2Z = lerp(12.6, 16.8, pAshore);
  const surv3X = lerp(13.2, 15.0, pAshore);
  const surv3Z = lerp(11.2, 13.6, pAshore);

  const beamPower = prog(t, 713.25, 713.85);
  const pSweepLock = prog(t, 713.3, 714.85);

  // Đèn pha 1 ở đỉnh đụn cát xa-giữa (x=28.5, z=22.6 -> rọi dốc thẳng xuống) & Đèn pha 2 ở đỉnh đụn cát gần-phải (x=13.5, z=27.2 -> quét chéo sang trái)
  // tạo 2 luồng đèn pha giao nhau chữ X tách biệt tuyệt đối trên hình chiếu 2D!
  const searchOrigin1: V3 = [28.5, BEACH_H(28.5, 22.6) + 1.32, 22.6];
  const searchOrigin2: V3 = [13.5, BEACH_H(13.5, 27.2) + 1.32, 27.2];

  const t1X = lerp(21.5, surv2X, pSweepLock);
  const t1Z = lerp(14.0, surv2Z, pSweepLock);
  const searchTarget1: V3 = [t1X, BEACH_H(t1X, t1Z) + 0.25, t1Z];

  const t2X = lerp(11.5, surv1X, pSweepLock);
  const t2Z = lerp(16.5, surv1Z, pSweepLock);
  const searchTarget2: V3 = [t2X, BEACH_H(t2X, t2Z) + 0.25, t2Z];

  const impactFlash = bump(t, ditchAt + 0.08, 0.75);
  const preset = STAGE_PRESETS.monsoonNight;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        sky={preset.sky}
        sun={[-34, 44, -52]}
        sunColor="#8eb4e3"
        sunIntensity={1.58 + impactFlash * 0.42}
        ambient={0.33}
        exposure={1.12}
        env={0.34}
        fog={[84, 365]}
        fogColor="#15253b"
        shadowArea={64}
        shadowCenter={[8, 2, 8]}
        post={preset.post}
      >
        <Cam pos={[rawCamX, camY, rawCamZ]} look={camLook} fov={lerp(46, 50, pPanPatrol)} />

        <directionalLight position={[14, 28, 40]} color="#9bc2ec" intensity={0.65} />

        {/* Mặt biển đêm sóng bạc cuộn mật độ lưới cao chinaSurfNight (swell = 2.4) */}
        <OceanSurface t={t} swell={SWELL} size={380} seg={230} center={[4, -172]} palette="chinaSurfNight" />

        {/* Địa hình bãi cát ướt & gò cát cao ven biển */}
        <Terrain h={BEACH_H} size={520} seg={210} center={[12, 78]} colors={NIGHT_BEACH_COLORS} />

        {/* Ghềnh đá tối đóng khung bờ biển & cây bụi ven đụn cát */}
        <CoastalRockCluster pos={[-19.5, BEACH_H(-19.5, 11.8) - 0.3, 11.8]} scale={1.15} seed={11} />
        <CoastalRockCluster pos={[38.5, BEACH_H(38.5, 13.0) - 0.3, 13.0]} scale={1.3} seed={23} />
        <Scatter
          kind="rock"
          count={65}
          area={[-75, 19, 100, 85]}
          h={BEACH_H}
          seed={71}
          scale={[0.8, 1.85]}
          avoid={avoidSurfAndPatrol}
          tint="#697786"
        />
        <Scatter
          kind="bush"
          count={75}
          area={[-70, 25, 100, 95]}
          h={BEACH_H}
          seed={83}
          scale={[0.75, 1.35]}
          avoid={avoidSurfAndPatrol}
          tint="#5a6e75"
        />

        {/* Chiếc B-25 #6 của Trung úy Dean Hallmark */}
        <group position={[px, py, pz]} rotation={[0, yaw, 0]}>
          <group rotation={[roll, 0, pitch]}>
            <B25Mitchell
              gear={0}
              propFast={false}
              propSpin={propSpin}
              navLights
              broomsticks
              lowerTurret={false}
              seed={6}
            />
          </group>
        </group>

        {/* Hai bức tường bọt nước bạc trắng xoá & vệt rãnh sóng cày khi đáp bụng */}
        <SurfBellyDitchSpray
          t={t}
          skimAt={skimAt}
          ditchAt={ditchAt}
          stopAt={stopAt}
          planePos={[px, py, pz]}
          planeYaw={yaw}
        />

        {/* 3 phi công sống sót lảo đảo dạt vào bãi cát ướt dưới 2 luồng đèn pha Nhật */}
        {showSurvivors && (
          <group>
            <StumblingSurvivor
              pos={[surv1X, BEACH_H(surv1X, surv1Z), surv1Z]}
              rotY={-1.25}
              t={t}
              pose="shieldEyes"
              phase={0.2}
            />
            <StumblingSurvivor
              pos={[surv2X, BEACH_H(surv2X, surv2Z), surv2Z]}
              rotY={-1.35}
              t={t}
              pose="stagger"
              phase={1.6}
            />
            <StumblingSurvivor
              pos={[surv3X, BEACH_H(surv3X, surv3Z), surv3Z]}
              rotY={-1.15}
              t={t}
              pose="kneel"
              phase={2.9}
            />
          </group>
        )}

        {/* Toán lính tuần tra Nhật & 2 luồng đèn pha lạnh lẽo tách rõ 2 cụm trên đỉnh gò cát cao quét chéo xuống 3 phi công */}
        <VolumetricSearchlight origin={searchOrigin1} target={searchTarget1} power={beamPower} />
        <VolumetricSearchlight origin={searchOrigin2} target={searchTarget2} power={beamPower} />

        {[
          { x: 12.2, z: 26.8, ry: 1.45 },
          { x: 15.0, z: 27.0, ry: 1.65 },
          { x: 27.0, z: 22.4, ry: 2.35 },
          { x: 30.2, z: 22.8, ry: 2.5 },
        ].map((s, idx) => (
          <JapanesePatrolSoldier
            key={`jp-${idx}`}
            pos={[s.x, BEACH_H(s.x, s.z), s.z]}
            rotY={s.ry}
          />
        ))}

        {beamPower > 0.02 && (
          <>
            <pointLight
              position={[13.6, BEACH_H(13.6, 27.2) + 2.6, 25.8]}
              color="#c8e3ff"
              intensity={14 * beamPower}
              distance={14}
              decay={1.7}
            />
            <pointLight
              position={[28.5, BEACH_H(28.5, 22.6) + 2.6, 21.2]}
              color="#c8e3ff"
              intensity={14 * beamPower}
              distance={14}
              decay={1.7}
            />
            <pointLight
              position={[
                (searchTarget1[0] + searchTarget2[0]) * 0.5 - 1.2,
                BEACH_H(16.8, 15.2) + 3.0,
                (searchTarget1[2] + searchTarget2[2]) * 0.5 - 1.0,
              ]}
              color="#dff0ff"
              intensity={28 * beamPower}
              distance={18}
              decay={1.6}
            />
          </>
        )}
      </Stage>

      <Label
        t={t}
        text="PLANE #6 · DEAN HALLMARK"
        x={490}
        y={160}
        from={CUE.c04_s06_hallmark_plane6}
        until={713.5}
      />
    </div>
  );
};

export default C04S06;
