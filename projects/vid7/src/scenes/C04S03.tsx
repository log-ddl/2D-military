import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { bump, lerp, mix, prog, rnd, useT } from '@core/time';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { fbm, plain } from '@skill/military/3d/materials';
import { softDot } from '@skill/military/3d/fx';
import { Scatter, Terrain } from '@skill/military/3d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, waveY } from '../parts/OceanSurface';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};

/**
 * Đường bờ biển vách đá Trung Quốc uốn lượn tự nhiên quanh x ≈ 612 m:
 * - Đầu cảnh (645–653 s): đội hình bay trên đại dương mênh mông Biển Hoa Đông hoàng hôn (x = 40..330 m).
 * - Đúng mốc "reach the Chinese coast" (657.90 s): đội hình chạm bờ sóng bạc & vách đá tại x ≈ 612 m!
 * - Từ 659.32–664.38 s: tiến sâu vào dãy sống núi đá lởm chởm (jagged mountains) x = 680..940 m trong đêm bão.
 */
function coastLineX(z: number): number {
  const n = fbm(z * 0.012 + 19.4, 4.7, 31, 3) - 0.5;
  return 612 + n * 74 + Math.sin(z * 0.022 + 0.6) * 22;
}

/**
 * Bản đồ độ cao bờ biển vách đá & dãy núi đá nhọn lởm chởm miền đông Trung Quốc (jagged mountains):
 * Không cắt bẹt đỉnh núi; dùng khe thung lũng uốn lượn tự nhiên với các sống núi yên ngựa nhấp nhô sắc cạnh
 * dưới bụng đội hình (cao 34..76 m, đội hình leo lên 108 m) và các đỉnh tháp đá dựng đứng 95..175 m hai bên.
 */
const COAST_MOUNTAINS_H = (x: number, z: number): number => {
  const cx = coastLineX(z);
  const dx = x - cx;
  if (dx < -28) return -28;

  const cliffRise = smoothstep(-28, 20, dx);
  const inland = Math.max(0, dx);
  const inlandRamp = smoothstep(0, 150, inland);

  // Sống núi đá nhọn đa tầng (ridged multifractal) tạo vách đá sắc cạnh, không phẳng đáy
  const r1 = 1 - Math.abs(fbm(x * 0.011 + 8.2, z * 0.011 - 5.4, 43, 4) * 2 - 1);
  const r2 = 1 - Math.abs(fbm(x * 0.024 - 3.1, z * 0.022 + 6.7, 67, 3) * 2 - 1);
  const r3 = 1 - Math.abs(fbm(x * 0.048 + 1.9, z * 0.048 - 2.3, 91, 2) * 2 - 1);

  const ridgeSharp = Math.pow(r1, 1.45) * 68 + Math.pow(r2, 1.7) * 34 + Math.pow(r3, 1.95) * 14;

  // Khe thung lũng uốn lượn tự nhiên để dưới bụng máy bay vẫn là các sống yên ngựa nhọn 34..76 m (không bị bẹt!)
  const valleyCenterZ = Math.sin(x * 0.013 - 1.2) * 22;
  const distFromPass = Math.abs(z - valleyCenterZ);
  const flankFactor = smoothstep(14, 118, distFromPass);

  // Các đỉnh tháp đá vút cao hai bên sườn núi
  const spireWave = Math.pow(1 - Math.abs(Math.sin(x * 0.021 + z * 0.016)), 1.75);
  const flankPeaks = flankFactor * (38 + spireWave * 64) * smoothstep(8, 125, inland);

  const centerEnvelope = lerp(0.56, 1.0, flankFactor);
  const landH = 16 + ridgeSharp * (0.42 + 0.58 * inlandRamp) * centerEnvelope + flankPeaks;

  return lerp(-28, landH, cliffRise);
};

function terrainSlope(x: number, z: number): number {
  const gx = COAST_MOUNTAINS_H(x + 2.5, z) - COAST_MOUNTAINS_H(x - 2.5, z);
  const gz = COAST_MOUNTAINS_H(x, z + 2.5) - COAST_MOUNTAINS_H(x, z - 2.5);
  return Math.hypot(gx, gz) / 5.0;
}

// Chỉ rải cây/đá trên đất liền có độ dốc vừa phải (tránh bám lơ lửng trên vách đá dựng đứng)
const AVOID_OCEAN_OR_CLIFF_ROCK = (x: number, z: number) =>
  x < coastLineX(z) + 14 || terrainSlope(x, z) > 0.82;
const AVOID_OCEAN_OR_CLIFF_PINE = (x: number, z: number) =>
  x < coastLineX(z) + 18 || terrainSlope(x, z) > 0.68 || COAST_MOUNTAINS_H(x, z) > 108;

/** Quỹ đạo tiến dọc +X của chiếc B-25 #1: tăng tốc mạnh khi đón gió xuôi +25 mph tại 648.68 s để chạm bờ đúng 657.90 s */
function evalLeadPos(t: number): { x: number; y: number; z: number; pitch: number; roll: number } {
  const dt = t - 644.5;
  const boostDt = Math.max(0, t - CUE.c04_s03_wind_shifted);
  const boostRamp = (boostDt * boostDt) / (boostDt + 1.45);
  // t=645.27 -> x=49m; t=652.82 -> x=306m (giữa biển); t=656.47 -> x=512m (sát bờ); t=657.90 -> x=594m (chạm bờ vách đá 612m!)
  const x = 30 + dt * 25.0 + boostRamp * 28.5;

  // Bay thấp 38 m trên biển Hoa Đông, nâng độ cao lên 108 m khi vượt vách đá bờ biển & rặng núi nhọn
  const climb = prog(t, 655.2, 663.4);
  const gustBump = bump(t, CUE.c04_s03_wind_shifted, 2.4) * 1.5;
  const turbAmp = 0.4 + 0.72 * prog(t, 659.2, 663.2);
  const y = lerp(38, 108, climb) + gustBump + Math.sin(t * 1.85) * turbAmp;
  const z = Math.sin(t * 0.72) * 1.1;

  const pitch = bump(t, 654.8, 9.2) * 0.105 + bump(t, CUE.c04_s03_wind_shifted, 2.2) * 0.032;
  const roll =
    Math.sin(t * 1.95) * (0.024 + 0.046 * prog(t, 659.0, 663.2)) +
    bump(t, CUE.c04_s03_wind_shifted, 2.1) * 0.072;

  return { x, y, z, pitch, roll };
}

/** Dải sóng bạc viền mờ tự nhiên (dùng radial gradient softDot) đập trắng xóa dọc chân vách đá bờ biển Trung Quốc */
const CoastalBreakerFoam: React.FC<{ t: number; stormDim: number }> = ({ t, stormDim }) => {
  const patches = useMemo(() => {
    return Array.from({ length: 56 }, (_, i) => {
      const z = -260 + i * 9.5 + (rnd(i * 7 + 3) - 0.5) * 4;
      const x = coastLineX(z) - 4.0 + (rnd(i * 11 + 5) - 0.5) * 5.0;
      const w = 18 + rnd(i * 13 + 9) * 14;
      const d = 11 + rnd(i * 17 + 2) * 9;
      const yaw = Math.atan2(coastLineX(z + 6) - coastLineX(z - 6), 12);
      return { x, z, w, d, yaw, phase: rnd(i * 19 + 1) * Math.PI * 2 };
    });
  }, []);

  const tex = useMemo(() => softDot(), []);
  const foamColor = mix('#f4e2d1', '#b6cfe9', stormDim);

  return (
    <group>
      {patches.map((s, idx) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 2.2 + s.phase);
        const wy = waveY(s.x, s.z, t, 2.8) + 0.55;
        return (
          <mesh
            key={`surf-${idx}`}
            position={[s.x - pulse * 2.4, wy, s.z]}
            rotation={[-Math.PI / 2, 0, s.yaw]}
            scale={[1 + pulse * 0.35, 1 + pulse * 0.2, 1]}
          >
            <planeGeometry args={[s.d, s.w]} />
            <meshBasicMaterial
              map={tex}
              color={foamColor}
              transparent
              opacity={(0.32 + 0.28 * pulse) * (1 - stormDim * 0.15)}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/** Các dải luồng gió xuôi +25 mph uốn lượn mềm mại thổi vọt từ phía sau đuôi lướt qua sải cánh đội hình */
const TailwindRibbons: React.FC<{
  t: number;
  leadPos: V3;
  strength: number;
  nightMix: number;
}> = ({ t, leadPos, strength, nightMix }) => {
  // Tạo sẵn 3 mẫu đường cong khí động uốn lượn mượt, vuốt mảnh hai đầu
  const ribbonGeos = useMemo(() => {
    return [0, 1, 2].map((variant) => {
      const pts: THREE.Vector3[] = [];
      const L = 14 + variant * 3.5;
      const steps = 14;
      for (let k = 0; k <= steps; k++) {
        const u = k / steps;
        const x = (u - 0.5) * L;
        const y = Math.sin(u * Math.PI * 2 + variant * 1.4) * 0.26;
        const z = Math.cos(u * Math.PI * 1.5 + variant * 0.9) * 0.34;
        pts.push(new THREE.Vector3(x, y, z));
      }
      const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 20, 0.036, 5, false);
      // Vuốt nhọn hai đầu dải gió để mềm mại như luồng hơi sương
      const pos = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < pos.count; i++) {
        const px = pos.getX(i);
        const u = clamp01(px / L + 0.5);
        const taper = Math.sin(u * Math.PI);
        const cy = Math.sin(u * Math.PI * 2 + variant * 1.4) * 0.26;
        const cz = Math.cos(u * Math.PI * 1.5 + variant * 0.9) * 0.34;
        pos.setY(i, cy + (pos.getY(i) - cy) * taper);
        pos.setZ(i, cz + (pos.getZ(i) - cz) * taper);
      }
      g.computeVertexNormals();
      return g;
    });
  }, []);

  const specs = useMemo(() => {
    return Array.from({ length: 26 }, (_, i) => {
      const lane = i % 4;
      const zBase =
        lane === 0
          ? lerp(-24, -12.5, rnd(i * 3 + 1))
          : lane === 1
            ? lerp(-4.5, 4.5, rnd(i * 3 + 1))
            : lane === 2
              ? lerp(6.5, 16.0, rnd(i * 3 + 1))
              : lerp(16.5, 28.0, rnd(i * 3 + 1));
      const yOff = lerp(-12.0, 6.8, rnd(i * 5 + 2));
      const safeY = zBase < -5 && yOff > 1.5 ? yOff - 7.0 : yOff;
      return {
        zOff: zBase,
        yOff: safeY,
        geoIdx: i % 3,
        scaleX: 0.85 + rnd(i * 7 + 3) * 0.65,
        speed: 48 + rnd(i * 13 + 5) * 20,
        phase: rnd(i * 17 + 6) * 120,
      };
    });
  }, []);

  if (strength <= 0.01) return null;
  const streakColor = mix('#ffe8cc', '#c2dcfa', nightMix * 0.85);

  return (
    <group position={leadPos}>
      {specs.map((s, idx) => {
        const span = 120;
        const travel = ((t - 644.0) * s.speed + s.phase) % span;
        const relX = -30 + travel;
        const fadeEdge = Math.sin(clamp01(travel / span) * Math.PI);
        const op = strength * fadeEdge * 0.3;
        if (op <= 0.01) return null;

        return (
          <mesh
            key={`tw-${idx}`}
            geometry={ribbonGeos[s.geoIdx]}
            position={[
              relX,
              s.yOff + Math.sin(t * 2.8 + idx) * 0.22,
              s.zOff + Math.cos(t * 2.4 + idx) * 0.2,
            ]}
            scale={[s.scaleX, 1, 1]}
          >
            <meshBasicMaterial
              color={streakColor}
              transparent
              opacity={op}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};

/** Bức tường mây bão cumulonimbus khổng lồ trên đất liền Trung Quốc + màn mưa chéo an toàn */
const MonsoonStormWall: React.FC<{
  t: number;
  leadPos: V3;
  camPos: V3;
  stormMix: number;
  flash: number;
}> = ({ t, leadPos, camPos, stormMix, flash }) => {
  const clouds = useMemo(() => {
    const arr: { x: number; y: number; z: number; sx: number; sy: number; sz: number; shade: number }[] = [];
    for (let i = 0; i < 40; i++) {
      const x = 655 + rnd(i * 5 + 1) * 440;
      const side = i % 3 === 0 ? 0 : i % 2 === 0 ? 1 : -1;
      const z =
        side === 0
          ? (rnd(i * 7 + 2) - 0.5) * 280
          : side * (86 + rnd(i * 7 + 2) * 170);
      const y = side === 0 ? 156 + rnd(i * 11 + 3) * 72 : 118 + rnd(i * 11 + 3) * 88;
      const baseR = 28 + rnd(i * 13 + 4) * 36;
      arr.push({
        x,
        y,
        z,
        sx: baseR * (1.35 + rnd(i * 17 + 5) * 0.6),
        sy: baseR * (0.58 + rnd(i * 19 + 6) * 0.35),
        sz: baseR * (1.15 + rnd(i * 23 + 7) * 0.55),
        shade: rnd(i * 29 + 8),
      });
    }
    return arr;
  }, []);

  const rainDrops = useMemo(() => {
    return Array.from({ length: 125 }, (_, i) => ({
      rx: (rnd(i * 3 + 11) - 0.35) * 78,
      ry: (rnd(i * 5 + 13) - 0.45) * 38,
      rz: (rnd(i * 7 + 17) - 0.5) * 68,
      len: 2.5 + rnd(i * 11 + 19) * 2.0,
      spd: 38 + rnd(i * 13 + 23) * 14,
      ph: rnd(i * 17 + 29) * 40,
    }));
  }, []);

  const cloudDark = mix('#23354f', '#51719c', flash * 0.75);
  const cloudLight = mix('#354e70', '#83a8d6', flash * 0.85);
  const cloudAppear = prog(t, CUE.c04_s03_storm_front, 659.5);
  const rainAlpha = smoothstep(0.16, 0.85, stormMix);

  return (
    <group>
      {cloudAppear > 0.01 &&
        clouds.map((c, idx) => {
          const col = mix(cloudDark, cloudLight, c.shade);
          return (
            <mesh key={`cld-${idx}`} position={[c.x, c.y, c.z]} scale={[c.sx, c.sy, c.sz]}>
              <icosahedronGeometry args={[1, 2]} />
              <meshStandardMaterial
                color={col}
                roughness={0.95}
                metalness={0.02}
                transparent
                opacity={cloudAppear * (0.35 + 0.5 * stormMix)}
              />
            </mesh>
          );
        })}

      {rainAlpha > 0.01 &&
        rainDrops.map((d, idx) => {
          const cycle = ((t * d.spd + d.ph) % 38) - 19;
          const wx = leadPos[0] + d.rx + cycle * 0.32;
          const wy = leadPos[1] + d.ry - cycle;
          const wz = leadPos[2] + d.rz;
          if (Math.hypot(wx - camPos[0], wy - camPos[1], wz - camPos[2]) < 11.5) return null;
          return (
            <mesh key={`rn-${idx}`} position={[wx, wy, wz]} rotation={[0.06, 0, -0.34]}>
              <cylinderGeometry args={[0.011, 0.011, d.len, 4]} />
              <meshBasicMaterial
                color="#b8d4f2"
                transparent
                opacity={rainAlpha * 0.25}
                depthWrite={false}
              />
            </mesh>
          );
        })}
    </group>
  );
};

// Sắp xếp 3 chiếc đồng đội nằm trọn vẹn 100% sải cánh trong khung hình và tách bạch silhouette khỏi chiếc #1
const WINGMEN_OFFSETS: { off: V3; phase: number }[] = [
  { off: [28.0, -6.5, -16.2], phase: 1.1 }, // Sải cánh bên trái tiền cảnh (không bị cắt mép trái)
  { off: [54.0, -10.6, -4.5], phase: 2.4 }, // Dẫn trước ở khe thoáng dưới đầu cánh trái chiếc #1
  { off: [44.0, -14.2, 16.5], phase: 3.8 }, // Hạ thấp thoáng hẳn dưới cánh phải & đuôi phải chiếc #1
];

const C04S03: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // Chuyển tiếp bầu trời mượt từ hoàng hôn chinaDusk sang đêm bão monsoonNight đủ ánh trăng lạnh đọc rõ hình khối
  const pStorm = prog(t, 658.4, 663.7);
  const flash =
    bump(t, CUE.c04_s03_storm_swallows, 0.6) * 0.85 +
    bump(t, CUE.c04_s03_jagged_mountains, 0.65) * 0.95;

  const dusk = STAGE_PRESETS.chinaDusk;
  const sky: [string, string, string] = [
    mix(dusk.sky![0], mix('#0d1b30', '#1e3457', flash * 0.6), pStorm),
    mix(dusk.sky![1], mix('#243c5e', '#597ca8', flash * 0.75), pStorm),
    mix(dusk.sky![2], mix('#15253d', '#2b4468', flash * 0.55), pStorm),
  ];

  const sunDir: V3 = [
    lerp(dusk.sun![0], -36, pStorm),
    lerp(dusk.sun![1], 54, pStorm),
    lerp(dusk.sun![2], -30, pStorm),
  ];
  const sunColor = mix(dusk.sunColor!, mix('#9dc4f2', '#dcebff', flash * 0.7), pStorm);
  const sunIntensity = lerp(dusk.sunIntensity!, 1.75, pStorm) + flash * 2.1;
  const ambient = lerp(dusk.ambient!, 0.36, pStorm) + flash * 0.25;
  const env = lerp(dusk.env!, 0.4, pStorm);
  const exposure = lerp(dusk.exposure!, 1.14, pStorm);
  const fogNear = lerp(110, 110, pStorm);
  const fogFar = lerp(455, 460, pStorm);
  const fogColor = mix(dusk.fogColor!, mix('#1d314f', '#46658f', flash * 0.65), pStorm);

  const lead = evalLeadPos(t);
  const leadPos: V3 = [lead.x, lead.y, lead.z];
  const propSpin = (t - 644.0) * 38;

  const tailwindStrength =
    prog(t, CUE.c04_s03_wind_shifted - 0.3, CUE.c04_s03_wind_shifted + 1.0) *
    (1 - prog(t, 660.4, 663.8) * 0.45);

  // Camera đuổi chếch sau đuôi mạn trái (~22° lệch trục cánh)
  const pSurge = prog(t, CUE.c04_s03_wind_shifted, 654.5);
  const pMountain = prog(t, 658.0, 663.8);

  const camRelX = lerp(lerp(-20.6, -22.6, pSurge), -19.8, pMountain);
  const camRelY = lerp(lerp(5.6, 6.4, pSurge), 7.8, pMountain);
  const camRelZ = lerp(lerp(-8.8, -9.8, pSurge), -8.3, pMountain);

  const camPos: V3 = [
    lead.x + camRelX,
    lead.y + camRelY + Math.sin(t * 1.4) * 0.26,
    lead.z + camRelZ + Math.cos(t * 1.1) * 0.22,
  ];
  const camLook: V3 = [
    lead.x + lerp(18.0, 22.5, pMountain),
    lead.y + lerp(0.4, -2.5, pMountain),
    lead.z + lerp(3.2, 2.4, pMountain),
  ];

  const navGlowScale = lerp(0.55, 1.38, pStorm);
  const redGlowMat = useMemo(
    () =>
      plain('#ff3b28', 0.2, 0.0, {
        emissive: new THREE.Color('#ff2a18'),
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.88,
      }),
    [],
  );
  const greenGlowMat = useMemo(
    () =>
      plain('#2dff6e', 0.2, 0.0, {
        emissive: new THREE.Color('#1cf05c'),
        emissiveIntensity: 3.5,
        transparent: true,
        opacity: 0.88,
      }),
    [],
  );

  return (
    <AbsoluteFill>
      <Stage
        width={W}
        height={H}
        sky={sky}
        sun={sunDir}
        sunColor={sunColor}
        sunIntensity={sunIntensity}
        fog={[fogNear, fogFar]}
        fogColor={fogColor}
        env={env}
        ambient={ambient}
        exposure={exposure}
        shadowArea={95}
        shadowCenter={[lead.x + 16, lead.y * 0.45, 0]}
        post={{
          ...dusk.post,
          bloom: lerp(0.62, 0.78, pStorm),
          vignette: lerp(0.46, 0.5, pStorm),
        }}
      >
        <Cam pos={camPos} look={camLook} fov={42} roll={lead.roll * 0.28} />

        {pStorm > 0.02 && (
          <>
            <directionalLight
              position={[45, 44, 38]}
              color="#90b8ea"
              intensity={pStorm * (1.0 + flash * 1.4)}
            />
            <pointLight
              position={[lead.x - 9, lead.y + 4, lead.z - 6]}
              color="#9ec6f7"
              intensity={pStorm * 16}
              distance={42}
              decay={1.7}
            />
          </>
        )}

        {/* Mặt biển Hoa Đông sóng cồn swell=2.8 trải rộng từ ngoài khơi tới chân vách đá Trung Quốc */}
        <OceanSurface
          t={t}
          swell={2.8}
          size={1120}
          seg={152}
          center={[300, 0]}
          palette="eastChinaDusk"
        />
        <CoastalBreakerFoam t={t} stormDim={pStorm} />

        {/* Bờ biển vách đá & dãy sống núi đá lởm chởm miền đông Trung Quốc */}
        <Terrain
          h={COAST_MOUNTAINS_H}
          size={920}
          seg={240}
          center={[980, 0]}
          colors={TERRAIN_PALETTE.chinaMountains}
          grainRepeat={50}
        />
        <Scatter
          kind="rock"
          count={160}
          area={[625, -260, 1220, 260]}
          h={COAST_MOUNTAINS_H}
          seed={41}
          scale={[1.2, 2.8]}
          avoid={AVOID_OCEAN_OR_CLIFF_ROCK}
          tint="#6d7885"
        />
        <Scatter
          kind="pine"
          count={190}
          area={[635, -250, 1200, 250]}
          h={COAST_MOUNTAINS_H}
          seed={53}
          scale={[0.85, 1.55]}
          avoid={AVOID_OCEAN_OR_CLIFF_PINE}
          tint="#768e82"
        />

        {/* Chiếc B-25B Mitchell #1 dẫn đầu (Doolittle) */}
        <group position={leadPos} rotation={[lead.roll, 0, lead.pitch]}>
          <B25Mitchell
            seed={18}
            propSpin={propSpin}
            propFast={true}
            gear={0}
            bombBay={0}
            broomsticks={true}
            lowerTurret={false}
            navLights={true}
            turretYaw={Math.PI * 0.94}
            turretPitch={0.14}
          />
          {pStorm > 0.08 && (
            <group>
              <mesh position={[1.34, 2.46, -10.31]} scale={navGlowScale} material={redGlowMat}>
                <sphereGeometry args={[0.11, 10, 8]} />
              </mesh>
              <mesh position={[1.34, 2.46, 10.31]} scale={navGlowScale} material={greenGlowMat}>
                <sphereGeometry args={[0.11, 10, 8]} />
              </mesh>
              <pointLight position={[1.34, 2.5, -10.4]} color="#ff2a1a" intensity={4.0 * pStorm} distance={6.5} decay={2} />
              <pointLight position={[1.34, 2.5, 10.4]} color="#22ff66" intensity={4.0 * pStorm} distance={6.5} decay={2} />
            </group>
          )}
        </group>

        {/* 3 chiếc B-25 đồng đội sải cánh bên dưới cùng seed={18} */}
        {WINGMEN_OFFSETS.map((w, idx) => {
          const wy = lead.y + w.off[1] + Math.sin(t * 1.65 + w.phase) * 0.65;
          const wz = lead.z + w.off[2] + Math.cos(t * 1.15 + w.phase) * 0.5;
          const wRoll = Math.sin(t * 1.8 + w.phase) * (0.03 + 0.04 * pStorm);
          return (
            <group
              key={`wingman-${idx}`}
              position={[lead.x + w.off[0], wy, wz]}
              rotation={[wRoll, 0, lead.pitch * 0.92]}
            >
              <B25Mitchell
                seed={18}
                propSpin={propSpin + idx * 1.7}
                propFast={true}
                gear={0}
                bombBay={0}
                broomsticks={true}
                lowerTurret={false}
                navLights={true}
                turretYaw={Math.PI}
              />
              {pStorm > 0.12 && (
                <group>
                  <mesh position={[1.34, 2.46, -10.31]} scale={navGlowScale * 1.15} material={redGlowMat}>
                    <sphereGeometry args={[0.12, 8, 8]} />
                  </mesh>
                  <mesh position={[1.34, 2.46, 10.31]} scale={navGlowScale * 1.15} material={greenGlowMat}>
                    <sphereGeometry args={[0.12, 8, 8]} />
                  </mesh>
                </group>
              )}
            </group>
          );
        })}

        <TailwindRibbons
          t={t}
          leadPos={leadPos}
          strength={tailwindStrength}
          nightMix={pStorm}
        />

        <MonsoonStormWall
          t={t}
          leadPos={leadPos}
          camPos={camPos}
          stormMix={pStorm}
          flash={flash}
        />
      </Stage>

      <Label
        t={t}
        text="+25 MPH TAILWIND"
        x={345}
        y={155}
        from={CUE.c04_s03_tailwind_25mph}
        until={657.8}
      />
    </AbsoluteFill>
  );
};

export default C04S03;
