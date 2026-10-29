import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Terrain } from '@lib/3d/terrain';
import { Explosion, softDot, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { P, STAGE_CONTESTED_DUSK } from '../local/palette';
import { AMRAAM, F15_FLARE_POS, F15EX } from '../local/models';

// Núi đồi sẫm dưới ráng chiều tím-cam làm nổi bật hiệu ứng bloom của 360 mồi bẫy nhiệt
const DUSK_TERRAIN = heightField({
  seed: 204,
  amp: 24,
  scale: 175,
  oct: 5,
  add: (x, z) =>
    20 * Math.exp(-(((z - 150) / 145) ** 2)) * (0.65 + 0.35 * Math.sin(x * 0.015)) +
    16 * Math.exp(-(((z + 175) / 155) ** 2)) * (0.6 + 0.4 * Math.cos(x * 0.013)),
});

const DUSK_COLORS = {
  low: '#1c1d30',
  high: '#3d334c',
  rock: '#2b263a',
  dry: '#694a58',
};

const smooth01 = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

type JetPose = {
  pos: V3;
  yaw: number;
  pitch: number;
  roll: number;
};

// Quỹ đạo lượn uyển chuyển của F-15EX (567.0s .. 584.2s)
function sampleJet(t: number): JetPose {
  const dt = t - 567.65;
  const speed = 15.0;
  const x = dt * speed;
  const craneSettle = smooth01((t - 578.2) / 2.8);
  const dynamicBank = (-0.2 * Math.sin(dt * 0.36 + 0.3)) * (1 - craneSettle) + 0.11 * craneSettle;
  const yaw = 0.06 * Math.cos(dt * 0.32) * (1 - craneSettle * 0.7);
  const pitch = 0.042 * (1 - craneSettle * 0.5) + 0.018;
  const y = 4.0 + Math.sin(dt * 0.42) * 0.8 * (1 - craneSettle * 0.6) + dt * 0.14;
  const z = Math.sin(dt * 0.28) * 2.0 * (1 - craneSettle * 0.5);

  return {
    pos: [x, y, z],
    yaw,
    pitch,
    roll: dynamicBank,
  };
}

function jetLocalToWorld(s: JetPose, local: V3): V3 {
  const e = new THREE.Euler(s.roll, s.yaw, s.pitch, 'YZX');
  const v = new THREE.Vector3(...local).applyEuler(e);
  return [s.pos[0] + v.x, s.pos[1] + v.y, s.pos[2] + v.z];
}

function jetVectorToWorld(s: JetPose, vec: V3): V3 {
  const e = new THREE.Euler(s.roll, s.yaw, s.pitch, 'YZX');
  const v = new THREE.Vector3(...vec).applyEuler(e);
  return [v.x, v.y, v.z];
}

type FlareSpec = {
  at: number;
  side: -1 | 1;
  tier: number; // 0..3 tạo 4 tầng lông vũ đối xứng của đôi "cánh thiên thần"
  housingZ: number;
  seed: number;
};

// Danh sách sự kiện phóng mồi bẫy nhiệt tất định từ 12 cụm hộp AN/ALE-47 quanh F15_FLARE_POS
const FLARE_EVENTS: FlareSpec[] = (() => {
  const list: FlareSpec[] = [];
  let s = 1;
  // Đợt 1 (569.80s – 572.30s): 4 hộp phóng đuôi bổ sung điểm hỏa đợt đầu
  for (let i = 0; i < 7; i++) {
    const at = CUE.s20_flareStart + i * 0.36;
    const tier = i % 3;
    const hz = i % 2 === 0 ? 1.44 : 0.46;
    list.push({ at, side: -1, tier, housingZ: -hz, seed: s++ });
    list.push({ at, side: 1, tier, housingZ: hz, seed: s++ });
  }
  // Đợt 2 (573.12s – 577.45s): Loạt salvo dồn dập đan thành đôi "cánh thiên thần" rực rỡ tại CUE.s20_flareSalvo (573.34s)
  for (let i = 0; i < 28; i++) {
    const at = 573.12 + i * 0.15;
    const tier = i % 4;
    const hz = tier % 2 === 0 ? 1.44 : 0.48;
    list.push({ at, side: -1, tier, housingZ: -hz, seed: s++ });
    list.push({ at, side: 1, tier, housingZ: hz, seed: s++ });
  }
  return list;
})();

function evalFlarePos(spec: FlareSpec, age: number): V3 {
  const launchJet = sampleJet(spec.at);
  const origin = jetLocalToWorld(launchJet, [F15_FLARE_POS[0], F15_FLARE_POS[1] + 0.04, spec.housingZ]);

  // 4 tầng góc bắn ngang + cao để điêu khắc rõ đôi cánh thiên thần uốn cong đối xứng hai bên thân
  const tierLat = [15.8, 13.0, 10.2, 7.4][spec.tier] ?? 11.5;
  const tierUp = [4.2, 1.8, -0.8, -3.1][spec.tier] ?? 0;
  const ejectWorld = jetVectorToWorld(launchJet, [-2.4, tierUp, spec.side * tierLat]);
  const fwdWorld = jetVectorToWorld(launchJet, [15.0, 0.14, 0]);

  const dragFwd = (1 - Math.exp(-1.1 * age)) / 1.1;
  const dragSide = (1 - Math.exp(-0.62 * age)) / 0.62;
  const gravityDrop = 2.05 * age * age;

  return [
    origin[0] + fwdWorld[0] * dragFwd + ejectWorld[0] * dragSide,
    origin[1] + fwdWorld[1] * dragFwd + ejectWorld[1] * dragSide - gravityDrop,
    origin[2] + fwdWorld[2] * dragFwd + ejectWorld[2] * dragSide,
  ];
}

// Quỹ đạo đạn tên lửa tầm nhiệt đối phương lao từ phía sau tới bị chùm pháo sáng hút lệch sang cánh phải lúc 573.4s!
const T_IR_DETONATE = 576.15;

function sampleHeatSeeker(t: number): { pos: V3; alive: boolean } {
  const tStart = 567.5;
  if (t < tStart || t > T_IR_DETONATE) {
    return { pos: [0, -999, 0], alive: false };
  }
  const jetNow = sampleJet(Math.min(t, 573.4));
  const approachP = prog(t, tStart, 573.55);
  const decoyP = smooth01((t - 573.35) / (T_IR_DETONATE - 573.35));

  const baseBehind = lerp(-54, -14.0, approachP) - decoyP * 13.5;
  const baseY = jetNow.pos[1] + lerp(-7.5, 0.5, approachP) - decoyP * 6.8;
  const baseZ = jetNow.pos[2] + lerp(-8.5, -0.6, approachP) + decoyP * 16.5;
  const baseX = jetNow.pos[0] + baseBehind + Math.max(0, t - 573.4) * 11.5;

  return {
    pos: [baseX, baseY, baseZ],
    alive: true,
  };
}

// Sprite khói mềm cho cánh khói flare
const FlareSmokePuff: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot: number }> = ({
  pos,
  size,
  color,
  opacity,
  rot,
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
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  if (opacity <= 0.004) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

// Quầng sáng mềm AdditiveBlending cho viên mồi bẫy nhiệt (triệt tiêu hoàn toàn viền tròn cứng kiểu bia bắn!)
const FlareGlowSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number }> = ({
  pos,
  size,
  color,
  opacity,
}) => {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    [],
  );
  mat.color.set(color);
  mat.opacity = opacity;
  if (opacity <= 0.005) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

const S20: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const jet = sampleJet(t);

  // Gom các viên flare đang cháy & dải khói cong dày tạo hình đôi "cánh thiên thần"
  const activeFlares = useMemo(() => {
    const out: {
      spec: FlareSpec;
      age: number;
      pos: V3;
      burn: number;
      smokePts: { pos: V3; u: number }[];
      emberRibbon: V3[];
    }[] = [];

    for (const spec of FLARE_EVENTS) {
      const age = t - spec.at;
      if (age < 0 || age > 4.2) continue;
      const pos = evalFlarePos(spec, age);
      const burn = age < 2.45 ? 1 - Math.pow(age / 2.45, 2.0) : 0;

      const smokeSamples = [0.12, 0.24, 0.36, 0.48, 0.6, 0.72, 0.84, 0.94];
      const smokePts = smokeSamples.map((u) => ({
        pos: evalFlarePos(spec, age * u),
        u,
      }));

      // Vệt lửa kéo đuôi ngắn ngay sau viên pháo sáng đang bốc cháy
      const emberRibbon: V3[] = [];
      if (burn > 0.12 && age > 0.06) {
        const tailSpan = Math.min(age, 0.55);
        for (let k = 0; k <= 6; k++) {
          emberRibbon.push(evalFlarePos(spec, age - tailSpan * (1 - k / 6)));
        }
      }

      out.push({ spec, age, pos, burn, smokePts, emberRibbon });
    }
    return out;
  }, [t]);

  const flareLightStrength = useMemo(() => {
    let sum = 0;
    for (const f of activeFlares) sum += f.burn;
    return Math.min(1, sum / 8);
  }, [activeFlares]);

  const flareLightL = jetLocalToWorld(jet, [-11.5, 0.8, -8.5]);
  const flareLightR = jetLocalToWorld(jet, [-11.5, 0.8, 8.5]);

  // Đạn tầm nhiệt đối phương bị hút lệch
  const irNow = sampleHeatSeeker(t);
  const irOrientation = useMemo(() => {
    if (!irNow.alive) return { yaw: 0, pitch: 0 };
    const dtEps = 0.04;
    const pA = sampleHeatSeeker(Math.max(567.5, t - dtEps)).pos;
    const pB = sampleHeatSeeker(Math.min(T_IR_DETONATE, t + dtEps)).pos;
    const vx = pB[0] - pA[0];
    const vy = pB[1] - pA[1];
    const vz = pB[2] - pA[2];
    return {
      pitch: Math.atan2(vy, Math.hypot(vx, vz)),
      yaw: Math.atan2(-vz, vx),
    };
  }, [irNow.alive, t]);

  const irTrailPts = useMemo(() => {
    if (t < 567.6 || t > T_IR_DETONATE + 1.8) return [];
    const pts: V3[] = [];
    const tEnd = Math.min(t, T_IR_DETONATE);
    const tBegin = Math.max(567.5, tEnd - 3.8);
    const N = 34;
    for (let i = 0; i <= N; i++) {
      pts.push(sampleHeatSeeker(lerp(tBegin, tEnd, i / N)).pos);
    }
    return pts;
  }, [t]);

  const irDetonatePos = useMemo(() => sampleHeatSeeker(T_IR_DETONATE).pos, []);

  // ==================== CHUYỂN ĐỘNG CAMERA 3D ====================
  // Nhịp 1 (567.65–578.4s): Góc rượt đuổi cao-sau cân đối (z chỉ lệch nhẹ +3.2m) để thấy TRỌN ĐÔI CÁNH THIÊN THẦN trải rộng đối xứng hai bên F-15EX mà không viên flare nào bay sượt sát ống kính!
  // Nhịp 2 & 3 (578.5–583.45s): Bay lướt mượt dọc qua sống lưng tiến sát lên nhìn xuyên qua vòm kính buồng lái đôi (ghế sau trống!)
  const pSalvoWide = prog(t, 572.4, 575.4);
  const pCraneMid = prog(t, 578.5, 580.6);
  const pCanopyClose = prog(t, 580.1, 582.7);

  const localCamRear: V3 = [
    lerp(-25.5, -35.5, pSalvoWide),
    lerp(4.6, 7.2, pSalvoWide),
    lerp(4.4, 3.2, pSalvoWide),
  ];
  const localLookRear: V3 = [
    lerp(-1.5, -6.5, pSalvoWide),
    lerp(2.1, 1.1, pSalvoWide),
    lerp(-0.2, 0.2, pSalvoWide),
  ];

  const localCamSpine: V3 = [-4.2, 5.45, 3.25];
  const localLookSpine: V3 = [2.8, 2.55, 0.0];

  const localCamCanopy: V3 = [1.38, 3.64, 1.88];
  const localLookCanopy: V3 = [3.16, 2.4, -0.06];

  const mix3 = (a: V3, b: V3, u: number): V3 => [
    lerp(a[0], b[0], u),
    lerp(a[1], b[1], u),
    lerp(a[2], b[2], u),
  ];

  const camLocal = mix3(mix3(localCamRear, localCamSpine, pCraneMid), localCamCanopy, pCanopyClose);
  const lookLocal = mix3(mix3(localLookRear, localLookSpine, pCraneMid), localLookCanopy, pCanopyClose);

  const camPos = jetLocalToWorld(jet, camLocal);
  const camLook = jetLocalToWorld(jet, lookLocal);
  const camFov = lerp(lerp(42, 46, pSalvoWide), 34, pCanopyClose);

  const canopyLightIntensity = prog(t, 578.8, 581.2);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_CONTESTED_DUSK} shadowCenter={jet.pos}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Núi đồi hoàng hôn chiến trường phía dưới */}
        <group position={[120, -88, 0]}>
          <Terrain h={DUSK_TERRAIN} size={1500} seg={140} center={[0, 0]} colors={DUSK_COLORS} />
        </group>

        {/* Đèn ấm chiếu rọi bụng & cánh đuôi F-15EX khi chùm pháo sáng bùng nổ */}
        {flareLightStrength > 0.02 && (
          <>
            <pointLight color="#ffaa42" intensity={72 * flareLightStrength} distance={45} decay={1.5} position={flareLightL} />
            <pointLight color="#ffaa42" intensity={72 * flareLightStrength} distance={45} decay={1.5} position={flareLightR} />
          </>
        )}

        {/* Boeing F-15EX Eagle II mang đầy đủ vũ khí, ghế sau bỏ trống (backSeatOccupied={false}) nối sang S21 */}
        <group position={jet.pos} rotation={new THREE.Euler(jet.roll, jet.yaw, jet.pitch, 'YZX')}>
          <F15EX
            gear={0}
            afterburner={0.68}
            wingTipMissiles
            fullLoad
            backSeatOccupied={false}
            aileron={-jet.roll * 0.35}
            elevator={-0.06}
          />

          {/* Ánh sáng màn hình buồng lái rọi rõ chiếc ghế sau ACES-5 trống không qua lớp vòm kính trong suốt cuối cảnh */}
          {canopyLightIntensity > 0.01 && (
            <>
              <pointLight
                position={[2.75, 2.88, 0.18]}
                color="#b8eeff"
                intensity={4.2 * canopyLightIntensity}
                distance={4.2}
                decay={1.4}
              />
              <pointLight
                position={[3.85, 2.82, 0.15]}
                color="#ffe5b4"
                intensity={2.4 * canopyLightIntensity}
                distance={3.4}
                decay={1.5}
              />
            </>
          )}
        </group>

        {/* Hệ thống 360 mồi bẫy nhiệt & vệt khói đôi "cánh thiên thần" tất định theo t */}
        {activeFlares.map(({ spec, age, pos, burn, smokePts, emberRibbon }) => (
          <React.Fragment key={spec.seed}>
            {/* Dải khói cong dày nối từ đuôi máy bay ra viên mồi bẫy */}
            {smokePts.map((sp, si) => {
              const fade = Math.max(0, 1 - age / 4.2);
              const warm = sp.u > 0.72 && burn > 0.25;
              return (
                <FlareSmokePuff
                  key={si}
                  pos={sp.pos}
                  size={(0.95 + (1 - sp.u) * 2.35) * (0.65 + age * 0.38)}
                  color={warm ? '#ffd19c' : '#cbb6c8'}
                  opacity={fade * (0.24 + sp.u * 0.26)}
                  rot={spec.seed * 1.3 + si}
                />
              );
            })}

            {/* Vệt đuôi lửa ngắn rực sáng ngay sau mỗi viên flare */}
            {emberRibbon.length >= 2 && (
              <Trail points={emberRibbon} color="#ffd480" width={0.09 * burn} opacity={0.85 * burn} glow />
            )}

            {/* Lõi cầu lửa magnesium trắng rực + quầng sáng mềm AdditiveBlending (không viền cứng!) */}
            {burn > 0.01 && (
              <>
                <mesh position={pos} scale={0.13 + 0.07 * burn}>
                  <sphereGeometry args={[1, 10, 8]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
                <FlareGlowSprite pos={pos} size={1.05 + 0.45 * burn} color="#fff4c8" opacity={0.92 * burn} />
                <FlareGlowSprite
                  pos={pos}
                  size={2.35 + 1.05 * burn}
                  color={spec.tier % 2 === 0 ? '#ff9829' : '#ff6a1a'}
                  opacity={0.62 * burn}
                />
              </>
            )}
          </React.Fragment>
        ))}

        {/* Tên lửa tầm nhiệt đối phương lao tới từ phía sau bị chùm pháo sáng hút lệch quỹ đạo & tự hủy */}
        {irNow.alive && (
          <group position={irNow.pos} rotation={new THREE.Euler(0, irOrientation.yaw, irOrientation.pitch, 'YZX')}>
            <AMRAAM flame={0.95} />
          </group>
        )}
        {irTrailPts.length >= 2 && (
          <>
            <Trail
              points={irTrailPts}
              color="#ff5e2b"
              width={0.18}
              opacity={lerp(0.88, 0, prog(t, T_IR_DETONATE, T_IR_DETONATE + 1.7))}
              glow
            />
            <Trail
              points={irTrailPts}
              color="#ffe6a3"
              width={0.08}
              opacity={lerp(0.92, 0, prog(t, T_IR_DETONATE, T_IR_DETONATE + 1.2))}
              glow
            />
          </>
        )}
        <Explosion t={t} at={T_IR_DETONATE} pos={irDetonatePos} size={3.2} seed={20} smokeLife={3.2} smoke="#8f788c" />
      </Stage>

      {/* Tối đa 1 Label trên màn hình */}
      <Label
        t={t}
        text="360 CHAFF & FLARES"
        x={960}
        y={935}
        from={CUE.s20_flareSalvo}
        until={578.6}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S20;
