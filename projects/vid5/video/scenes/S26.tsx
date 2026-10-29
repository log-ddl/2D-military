import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { DustTrail, Explosion, MuzzleBlast, softDot, Trail } from '@lib/3d/fx';
import { lathe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { P, STAGE_CONTESTED_DUSK } from '../local/palette';
import { F15EX, SamBattery } from '../local/models';

// ---------- Địa hình thung lũng núi đá hiểm trở nơi khẩu đội SAM phục kích ----------
const VALLEY_H = heightField({
  seed: 26,
  amp: 8.5,
  scale: 95,
  oct: 5,
  flats: [
    [0, 0, 20, 0],
    [-22, -12, 11, 0.5],
  ],
  add: (x, z) => {
    const northWall = 42 * Math.exp(-(((z + 68) / 34) ** 2));
    const southWall = 46 * Math.exp(-(((z - 76) / 38) ** 2));
    const westPeak = 28 * Math.exp(-(((x + 82) / 44) ** 2) - (((z - 22) / 52) ** 2));
    const eastPeak = 34 * Math.exp(-(((x - 108) / 48) ** 2) - (((z + 28) / 48) ** 2));
    return northWall + southWall + westPeak + eastPeak;
  },
});

const AVOID_SAM_PAD = (x: number, z: number) => Math.hypot(x, z) < 23 || (Math.abs(z) < 12 && x > -28 && x < 26);

// Góc nâng ống phóng SamBattery = 1.08 rad -> tính chính xác tọa độ miệng ống 0 và 1
const SAM_ELEV = 1.08;
const CE = Math.cos(SAM_ELEV);
const SE = Math.sin(SAM_ELEV);
const TUBE_MOUTH_X = -3.85 + (-2.2 + 6.65 * CE - 0.94 * SE);
const TUBE_MOUTH_Y = 1.28 + (0.56 + 6.65 * SE + 0.94 * CE);
const TUBE0_POS: V3 = [TUBE_MOUTH_X, TUBE_MOUTH_Y, 0.49];
const TUBE1_POS: V3 = [TUBE_MOUTH_X, TUBE_MOUTH_Y, -0.49];
const TUBE_BACK0_POS: V3 = [
  -3.85 + (-2.2 - 0.62 * CE - 0.94 * SE),
  1.28 + (0.56 - 0.62 * SE + 0.94 * CE),
  0.49,
];
const TUBE_BACK1_POS: V3 = [TUBE_BACK0_POS[0], TUBE_BACK0_POS[1], -0.49];
const TUBE_DIR: V3 = [CE, SE, 0];

// Tọa độ nổ cận đích sát sườn cánh phải F-15EX đúng lúc 755.00s
const BLAST_POS: V3 = [62.0, 71.7, 4.7];

// Nội suy đường cong Bézier bậc 3 cho tên lửa SAM bám ngược luồng nhiễu
const cubicBezier = (p: number, p0: V3, p1: V3, p2: V3, p3: V3): V3 => {
  const u = 1 - p;
  const b0 = u * u * u;
  const b1 = 3 * u * u * p;
  const b2 = 3 * u * p * p;
  const b3 = p * p * p;
  return [
    b0 * p0[0] + b1 * p1[0] + b2 * p2[0] + b3 * p3[0],
    b0 * p0[1] + b1 * p1[1] + b2 * p2[1] + b3 * p3[1],
    b0 * p0[2] + b1 * p1[2] + b2 * p2[2] + b3 * p3[2],
  ];
};

const SAM0_CTRL: [V3, V3, V3, V3] = [
  TUBE0_POS,
  [TUBE0_POS[0] + TUBE_DIR[0] * 25, TUBE0_POS[1] + TUBE_DIR[1] * 25, 2.1],
  [36, 52, 4.6],
  BLAST_POS,
];

const SAM1_CTRL: [V3, V3, V3, V3] = [
  TUBE1_POS,
  [TUBE1_POS[0] + TUBE_DIR[0] * 24, TUBE1_POS[1] + TUBE_DIR[1] * 24, -2.5],
  [33, 49, -4.4],
  [70.2, 77.6, -4.6],
];

// Vị trí & tư thế F-15EX theo thời gian t
const getF15Pose = (t: number) => {
  const u = t - 736.45;
  const postHit = Math.max(0, t - CUE.s26_ambushBlast);
  const x = -12 + u * 4.05;
  const z = -11 + u * 0.62 + postHit * 0.85;
  const y = 74.0 - postHit * 1.55 - bump(t, CUE.s26_ambushBlast, 1.2) * 1.6;

  // Trước khi nổ: nghiêng cánh cơ động tránh né nhẹ; đúng 755.00s bị sóng xung kích đánh lật chao đảo dữ dội
  const preEvade = prog(t, CUE.s26_ambushClose - 0.4, CUE.s26_ambushBlast - 0.1) * 0.28;
  const blastJolt =
    t >= CUE.s26_ambushBlast
      ? -0.82 * prog(t, CUE.s26_ambushBlast, CUE.s26_ambushBlast + 0.38) +
        0.34 * prog(t, CUE.s26_ambushBlast + 0.5, 758.2) +
        Math.sin((t - CUE.s26_ambushBlast) * 17) * Math.exp(-postHit * 1.4) * 0.24
      : 0;

  const roll = preEvade + blastJolt;
  const pitch = t >= CUE.s26_ambushBlast ? -0.13 * prog(t, CUE.s26_ambushBlast, 756.2) : 0.03;
  const yaw = -Math.atan2(0.62, 4.05);

  return { pos: [x, y, z] as V3, roll, pitch, yaw };
};

// ---------- Tên lửa phòng không tầm xa đa chế độ (AESA + IIR + Home-on-Jam, dài 5.6 m) ----------
const SamInterceptor: React.FC<{ pos: V3; dir: V3; hojGlow: number }> = ({ pos, dir, hojGlow }) => {
  const geos = useMemo(() => {
    const nosePts: P2[] = [[0.001, 1.55]];
    for (let i = 0; i <= 20; i++) {
      const u = i / 20;
      const x = 1.55 + u * 1.25;
      const r = 0.21 * Math.pow(1 - Math.pow(u, 1.55), 0.66);
      nosePts.push([Math.max(0.004, r), x]);
    }
    const radome = lathe(nosePts, 28);
    const body = lathe(
      [
        [0.001, -2.65],
        [0.18, -2.65],
        [0.21, -2.48],
        [0.21, 1.55],
        [0.001, 1.55],
      ],
      28,
    );
    return { radome, body };
  }, []);

  const bodyMat = paint({
    color: '#dce4ec',
    camo: ['#c4d0dc'],
    camoScale: 1.6,
    wear: 0.12,
    dirt: 0.1,
    roughness: 0.38,
    metalness: 0.35,
    seed: 265,
  });
  const oliveBand = plain(P.samGreen, 0.5, 0.3);
  const finMat = plain('#3a434e', 0.38, 0.68);
  const radomeMat = plain('#f3f7fb', 0.25, 0.12);

  const q = useMemo(() => {
    const d = new THREE.Vector3(...dir).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  }, [dir[0], dir[1], dir[2]]);

  return (
    <group position={pos} quaternion={q}>
      <mesh geometry={geos.radome} material={radomeMat} castShadow />
      <mesh geometry={geos.body} material={bodyMat} castShadow />
      <mesh position={[-0.6, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={oliveBand}>
        <cylinderGeometry args={[0.214, 0.214, 1.15, 28]} />
      </mesh>

      {/* Cửa sổ cảm biến ảnh nhiệt IIR vàng hổ phách + vòng thu sóng thụ động Home-on-Jam cyan ở đầu dò */}
      <mesh position={[1.95, 0.145, 0]} rotation={[0, 0, -0.32]}>
        <sphereGeometry args={[0.055, 14, 10]} />
        <meshBasicMaterial color={P.amberHot} toneMapped={false} />
      </mesh>
      <mesh position={[1.56, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.218, 0.022, 10, 28]} />
        <meshBasicMaterial color={hojGlow > 0.1 ? P.cyan : '#5be8ff'} toneMapped={false} />
      </mesh>

      {/* 4 cánh dẫn hướng giữa thân & 4 cánh lái đuôi */}
      {[0, 1, 2, 3].map((k) => (
        <group key={k} rotation={[Math.PI / 4 + (k * Math.PI) / 2, 0, 0]}>
          <mesh position={[0.15, 0.29, 0]} geometry={rbox(1.1, 0.22, 0.022, 0.005)} material={finMat} />
          <mesh position={[-2.25, 0.36, 0]} geometry={rbox(0.76, 0.36, 0.024, 0.005)} material={finMat} />
        </group>
      ))}

      {/* Luồng lửa tầng đẩy rocket SAM rực sáng */}
      <group position={[-2.68, 0, 0]}>
        <pointLight position={[-0.6, 0, 0]} color="#ff8e36" intensity={32} distance={16} decay={1.6} />
        <mesh position={[-1.1, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.22, 2.2, 18]} />
          <meshBasicMaterial color="#fff8db" transparent opacity={0.95} toneMapped={false} />
        </mesh>
        <mesh position={[-2.3, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.38, 4.6, 18]} />
          <meshBasicMaterial color={P.flame} transparent opacity={0.68} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

// ---------- Chùm nón sóng nhiễu Cyan từ F-15EX xuống trận địa SAM & xung Home-On-Jam bám ngược ----------
const JammingCone3D: React.FC<{ t: number; fromPos: V3; toPos: V3; activeOpacity: number }> = ({
  t,
  fromPos,
  toPos,
  activeOpacity,
}) => {
  if (activeOpacity <= 0.01) return null;

  const a = new THREE.Vector3(...fromPos);
  const b = new THREE.Vector3(...toPos);
  const diff = b.clone().sub(a);
  const len = diff.length();
  const mid = a.clone().addScaledVector(diff, 0.5);
  const dir = diff.clone().normalize();
  // CylinderGeometry dọc trục +Y (+Y ở fromPos là đỉnh nhỏ, -Y ở toPos là đáy rộng)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir);

  const hojActive = prog(t, CUE.s26_homeOnJam - 0.6, CUE.s26_homeOnJam + 0.6);

  return (
    <group>
      <group position={[mid.x, mid.y, mid.z]} quaternion={q}>
        <mesh>
          <cylinderGeometry args={[0.9, 10.6, len, 24, 1, true]} />
          <meshBasicMaterial
            color={P.cyan}
            transparent
            opacity={0.032 * activeOpacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.9, 10.6, len, 8, 1, true]} />
          <meshBasicMaterial
            color={P.cyan}
            wireframe
            transparent
            opacity={0.14 * activeOpacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Vòng sóng nhiễu Cyan phát từ bụng F-15EX trùm xuống đài radar dưới thung lũng */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const s = (t * 0.72 + i / 8) % 1;
        const p = a.clone().lerp(b, s);
        const r = lerp(0.95, 10.5, s);
        const ringQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        const fade = Math.pow(Math.sin(s * Math.PI), 1.35);
        return (
          <mesh key={`cw_${i}`} position={[p.x, p.y, p.z]} quaternion={ringQ}>
            <torusGeometry args={[r, 0.07, 8, 36]} />
            <meshBasicMaterial
              color={P.cyan}
              transparent
              opacity={0.48 * fade * activeOpacity}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Vòng khóa thụ động Home-On-Jam đỏ/cam bám ngược dọc theo chính chùm sóng nhiễu đi lên F-15EX */}
      {hojActive > 0.02 &&
        [0, 1, 2, 3, 4].map((k) => {
          const sUp = 1 - ((t * 1.15 + k / 5) % 1);
          const p = a.clone().lerp(b, sUp);
          const r = lerp(1.05, 10.2, sUp);
          const ringQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
          const fade = Math.pow(Math.sin(sUp * Math.PI), 1.25);
          return (
            <mesh key={`hoj_${k}`} position={[p.x, p.y, p.z]} quaternion={ringQ}>
              <torusGeometry args={[r, 0.115, 8, 32]} />
              <meshBasicMaterial
                color={P.red}
                transparent
                opacity={0.62 * fade * hojActive * activeOpacity}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          );
        })}
    </group>
  );
};

// ---------- Mây bão chạng vạng tầng cao & Công sự trận địa phòng không ----------
const StormCloudsAndRevetment: React.FC = () => {
  const bermMat = useMemo(
    () =>
      paint({
        color: '#4c4943',
        camo: ['#3b3833', '#5e584e'],
        camoScale: 1.4,
        wear: 0.25,
        dirt: 0.42,
        roughness: 0.9,
        metalness: 0.08,
        repeat: 0.45,
        seed: 268,
      }),
    [],
  );

  const cloudMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: new THREE.Color('#272238'),
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
      }),
    [],
  );

  const clouds = useMemo(() => {
    const arr: { pos: V3; size: number }[] = [];
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2;
      const rad = 65 + (i % 4) * 32;
      arr.push({
        pos: [28 + Math.cos(a) * rad, 86 + (i % 5) * 8, -10 + Math.sin(a) * (rad * 0.72)],
        size: 36 + (i % 4) * 14,
      });
    }
    return arr;
  }, []);

  return (
    <group>
      {/* Tường đất/bê tông chữ U che chắn quanh khẩu đội SamBattery tại đáy thung lũng */}
      <mesh position={[0, 0.85, 7.6]} geometry={rbox(16.5, 1.7, 1.6, 0.25)} material={bermMat} castShadow receiveShadow />
      <mesh position={[0, 0.85, -7.6]} geometry={rbox(16.5, 1.7, 1.6, 0.25)} material={bermMat} castShadow receiveShadow />
      <mesh position={[-9.2, 0.9, 0]} geometry={rbox(1.7, 1.8, 13.6, 0.25)} material={bermMat} castShadow receiveShadow />
      {/* Xe/container chỉ huy radar phụ cạnh công sự */}
      <mesh position={[-18.5, 1.75, -10.5]} rotation={[0, 0.35, 0]} geometry={rbox(6.4, 2.5, 2.6, 0.12)} material={bermMat} castShadow receiveShadow />

      {clouds.map((c, idx) => (
        <sprite key={idx} material={cloudMat} position={c.pos} scale={[c.size * 1.45, c.size * 0.62, 1]} />
      ))}
    </group>
  );
};

const S26: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Dãy điểm quỹ đạo 2 quả tên lửa SAM tính sẵn 1 lần ở useMemo
  const { sam0Pts, sam1Pts } = useMemo(() => {
    const N = 96;
    const p0: V3[] = [];
    const p1: V3[] = [];
    for (let i = 0; i < N; i++) {
      const s = i / (N - 1);
      p0.push(cubicBezier(s, ...SAM0_CTRL));
      p1.push(cubicBezier(s, ...SAM1_CTRL));
    }
    return { sam0Pts: p0, sam1Pts: p1 };
  }, []);

  // Tiến độ bay của 2 quả SAM (phóng lúc 741.50s và 741.88s; quả #1 nổ cận đích đúng 755.00s)
  const easeAccel = useMemo(() => Easing.bezier(0.32, 0.0, 0.68, 1.0), []);
  const sam0P = prog(t, CUE.s26_samLaunch, CUE.s26_ambushBlast, easeAccel);
  const sam1P = prog(t, CUE.s26_samLaunch + 0.38, CUE.s26_ambushBlast + 0.65, easeAccel);

  const sam0InFlight = t >= CUE.s26_samLaunch && t < CUE.s26_ambushBlast;
  const sam1InFlight = t >= CUE.s26_samLaunch + 0.38 && t < CUE.s26_ambushBlast + 1.4;

  const sam0Pos = cubicBezier(sam0P, ...SAM0_CTRL);
  const sam0Next = cubicBezier(Math.min(1, sam0P + 0.015), ...SAM0_CTRL);
  const sam0Dir: V3 = [
    sam0Next[0] - sam0Pos[0] + 1e-4,
    sam0Next[1] - sam0Pos[1] + 1e-4,
    sam0Next[2] - sam0Pos[2],
  ];

  const sam1Pos = cubicBezier(Math.min(1, sam1P), ...SAM1_CTRL);
  const sam1Next = cubicBezier(Math.min(1, sam1P + 0.015), ...SAM1_CTRL);
  const sam1Dir: V3 = [
    sam1Next[0] - sam1Pos[0] + 1e-4,
    sam1Next[1] - sam1Pos[1] + 1e-4,
    sam1Next[2] - sam1Pos[2],
  ];

  const f15 = getF15Pose(t);
  const hojGlow = prog(t, CUE.s26_homeOnJam - 0.5, CUE.s26_homeOnJam + 0.5);
  const jamBeamOpacity = 1 - prog(t, CUE.s26_ambushBlast, CUE.s26_ambushBlast + 0.5);

  // ---------- Đạo diễn Camera 3D 4 nhịp (luôn đặt ở sườn +Z để vệt <Trail> chéo rộng, KHÔNG trùng trục đạn) ----------
  // Nhịp 1 (736.25..744.2s): Giữ chặt khung hình khẩu đội SamBattery tới đúng 741.50s rồi mới ngẩng máy bám theo 2 quả đạn vọt lên
  const c1Dolly = prog(t, 736.45, 741.5);
  const c1Climb = prog(t, CUE.s26_samLaunch, 744.2);
  const pos1: V3 = [
    lerp(15.5, 19.5, c1Dolly) + c1Climb * 4.5,
    lerp(6.8, 7.6, c1Dolly) + c1Climb * 9.5,
    lerp(22.0, 25.0, c1Dolly) + c1Climb * 6.5,
  ];
  const look1: V3 = [
    lerp(0.5, -0.5, c1Dolly) + c1Climb * 6.5,
    lerp(3.4, 3.8, c1Dolly) + c1Climb * 16.5,
    0,
  ];

  // Nhịp 2 (744.0..750.8s): Bay bốc lên khỏi hẻm núi bám ngang sườn cặp tên lửa đang leo ngược theo chùm sóng nhiễu Cyan
  const pos2: V3 = [sam0Pos[0] + 11, sam0Pos[1] - 2.5, 34];
  const look2: V3 = [
    lerp(sam0Pos[0] + 3, (sam0Pos[0] + f15.pos[0]) * 0.5, prog(t, 746.0, 750.5)),
    lerp(sam0Pos[1] + 4, (sam0Pos[1] + f15.pos[1]) * 0.5, prog(t, 746.0, 750.5)),
    0,
  ];

  // Nhịp 3 & 4 (750.8..758.5s): Cận cảnh trên cao bên sườn phải F-15EX đón cặp tên lửa lao sát vào nổ cận đích 755.00s
  const c3 = prog(t, 751.0, 758.45);
  const pos3: V3 = [f15.pos[0] + lerp(17, 13, c3), f15.pos[1] + lerp(-4.5, 2.2, c3), f15.pos[2] + lerp(24, 21, c3)];
  const look3: V3 = [f15.pos[0] - 2.5, f15.pos[1] - 1.5, f15.pos[2] + 1.2];

  const b12 = prog(t, 743.4, 745.2);
  const b23 = prog(t, 750.2, 752.0);

  const mixV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
  const rawCamPos = mixV3(mixV3(pos1, pos2, b12), pos3, b23);
  const rawCamLook = mixV3(mixV3(look1, look2, b12), look3, b23);

  // Rung chấn máy quay lúc SAM phóng (741.50s) và lúc nổ cận đích (755.00s)
  const launchShake = bump(t, CUE.s26_samLaunch, 0.5) * 0.35;
  const blastShake = bump(t, CUE.s26_ambushBlast, 1.05) * 1.15;
  const shk = launchShake + blastShake;
  const camPos: V3 = [
    rawCamPos[0] + Math.sin(t * 43) * shk,
    rawCamPos[1] + Math.cos(t * 51) * shk,
    rawCamPos[2] + Math.sin(t * 37) * shk * 0.6,
  ];

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_CONTESTED_DUSK}
        sky={['#101b33', '#4e3a52', '#b85a44']}
        sun={[64, 17, -28]}
        sunColor="#ff9e6d"
        sunIntensity={2.55}
        ambient={0.28}
        env={0.42}
        exposure={1.06}
        shadowArea={85}
        shadowCenter={[16, 22, 0]}
        fog={[185, 920]}
      >
        <Cam pos={camPos} look={rawCamLook} fov={lerp(44, 41, b23)} roll={blastShake * -0.06} />

        {/* Thung lũng núi đá hiểm trở + rừng thông + đá tảng */}
        <Terrain
          h={VALLEY_H}
          size={640}
          seg={220}
          colors={{ low: '#2e3d2b', high: '#515c43', rock: '#4c4744', dry: '#7a624c' }}
        />
        <Scatter
          kind="pine"
          count={190}
          area={[-210, -190, 210, 190]}
          h={VALLEY_H}
          seed={261}
          scale={[0.9, 1.65]}
          avoid={AVOID_SAM_PAD}
          tint="#8fa396"
        />
        <Scatter
          kind="rock"
          count={115}
          area={[-190, -170, 190, 170]}
          h={VALLEY_H}
          seed={262}
          scale={[1.0, 2.7]}
          avoid={AVOID_SAM_PAD}
          tint="#7b746e"
        />
        <Scatter
          kind="bush"
          count={95}
          area={[-140, -130, 140, 130]}
          h={VALLEY_H}
          seed={263}
          scale={[0.8, 1.5]}
          avoid={AVOID_SAM_PAD}
          tint="#7c8e73"
        />

        <StormCloudsAndRevetment />

        {/* Khẩu đội tên lửa phòng không SamBattery xoay đài radar phục kích dưới thung lũng */}
        <group position={[0, 0, 0]}>
          <SamBattery
            elev={SAM_ELEV}
            radarSpin={t * 2.4}
            openTubes={t >= CUE.s26_samLaunch + 0.38 ? 2 : t >= CUE.s26_samLaunch ? 1 : 0}
          />
        </group>

        {/* Lửa & khói đầu ống + luồng phụt đáy ống khi khai hỏa liên tiếp 2 quả tên lửa SAM lúc 741.50s */}
        <MuzzleBlast t={t} at={CUE.s26_samLaunch} pos={TUBE0_POS} dir={TUBE_DIR} size={2.8} seed={261} />
        <MuzzleBlast
          t={t}
          at={CUE.s26_samLaunch}
          pos={TUBE_BACK0_POS}
          dir={[-TUBE_DIR[0], -TUBE_DIR[1], 0]}
          size={2.1}
          seed={262}
        />
        <MuzzleBlast t={t} at={CUE.s26_samLaunch + 0.38} pos={TUBE1_POS} dir={TUBE_DIR} size={2.7} seed={263} />
        <MuzzleBlast
          t={t}
          at={CUE.s26_samLaunch + 0.38}
          pos={TUBE_BACK1_POS}
          dir={[-TUBE_DIR[0], -TUBE_DIR[1], 0]}
          size={2.0}
          seed={264}
        />

        {/* Chùm nón sóng nhiễu Cyan từ bụng F-15EX phát xuống & xung Home-On-Jam bám ngược lên */}
        <JammingCone3D
          t={t}
          fromPos={[f15.pos[0] + 0.5, f15.pos[1] + 1.45, f15.pos[2]]}
          toPos={[1.16, 3.2, 0]}
          activeOpacity={jamBeamOpacity}
        />

        {/* Vệt khói lửa <Trail> cam đỏ dựng vọt từ đáy thung lũng lên bầu trời mây tối */}
        {t >= CUE.s26_samLaunch && (
          <>
            <Trail points={sam0Pts} upto={sam0P} color="#ff6e1f" width={0.28} opacity={0.88} glow />
            <Trail points={sam0Pts} upto={sam0P} color="#ffe39f" width={0.12} opacity={0.95} glow />
          </>
        )}
        {t >= CUE.s26_samLaunch + 0.38 && (
          <>
            <Trail points={sam1Pts} upto={sam1P} color="#ff6e1f" width={0.26} opacity={0.85} glow />
            <Trail points={sam1Pts} upto={sam1P} color="#ffe39f" width={0.11} opacity={0.92} glow />
          </>
        )}

        {/* Cặp đạn tên lửa SAM đa chế độ (AESA + IIR + Home-on-Jam) lao vọt lên áp sát F-15EX */}
        {sam0InFlight && <SamInterceptor pos={sam0Pos} dir={sam0Dir} hojGlow={hojGlow} />}
        {sam1InFlight && <SamInterceptor pos={sam1Pos} dir={sam1Dir} hojGlow={hojGlow} />}

        {/* Tiêm kích hạng nặng F-15EX Eagle II 200 sq ft trên bầu trời bão tố */}
        <group position={f15.pos} rotation={[0, f15.yaw, f15.pitch]}>
          <group rotation={[f15.roll, 0, 0]}>
            <F15EX gear={0} afterburner={0.92} wingTipMissiles fullLoad backSeatOccupied />
            {/* Lửa cháy & chớp mảnh đạn trên sườn cánh phải F-15EX sau cú nổ cận đích 755.00s */}
            {t >= CUE.s26_ambushBlast && (
              <group position={[-1.6, 1.9, 3.4]}>
                <pointLight
                  color="#ff6b21"
                  intensity={55 + 25 * Math.sin(t * 28)}
                  distance={22}
                  decay={1.5}
                />
                <mesh position={[-1.3, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <coneGeometry args={[0.52, 2.8, 12]} />
                  <meshBasicMaterial color="#ff5e1a" transparent opacity={0.78} toneMapped={false} />
                </mesh>
                <mesh position={[-0.75, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                  <coneGeometry args={[0.28, 1.5, 10]} />
                  <meshBasicMaterial color="#ffe49c" transparent opacity={0.92} toneMapped={false} />
                </mesh>
              </group>
            )}
          </group>
        </group>

        {/* Vụ nổ cận đích đầu đạn phân mảnh SAM ngay sát sườn cánh phải F-15EX lúc 755.00s + vệt khói đen hư hại */}
        <Explosion
          t={t}
          at={CUE.s26_ambushBlast}
          pos={BLAST_POS}
          size={6.5}
          seed={269}
          smokeLife={4.5}
          smoke="#3d3431"
        />
        {t >= CUE.s26_ambushBlast && t < CUE.s26_ambushBlast + 0.55 && (
          <pointLight
            position={[BLAST_POS[0], BLAST_POS[1] + 2, BLAST_POS[2]]}
            color="#ff5e24"
            intensity={950 * (1 - (t - CUE.s26_ambushBlast) / 0.55)}
            distance={65}
            decay={1.4}
          />
        )}
        {t >= CUE.s26_ambushBlast && (
          <DustTrail
            t={t}
            from={CUE.s26_ambushBlast}
            to={758.5}
            path={(tk) => {
              const p = getF15Pose(tk).pos;
              return [p[0] - 2.2, p[1] - 0.4, p[2] + 3.6];
            }}
            rate={14}
            size={2.8}
            color="#352f2d"
            life={2.6}
          />
        )}
      </Stage>

      <Label
        t={t}
        text="200 SQ FT TARGET"
        x={960}
        y={112}
        from={754.94}
        until={758.1}
        size={52}
        bg={P.red}
        fg="#ffffff"
      />
    </AbsoluteFill>
  );
};

export default S26;
