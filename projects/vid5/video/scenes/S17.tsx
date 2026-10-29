import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog, rnd } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Terrain } from '@lib/3d/terrain';
import { MuzzleBlast, softDot, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { P, STAGE_STRATOSPHERE } from '../local/palette';
import { AMRAAM, F15_CENTERLINE_POS, F15EX, HypersonicMissile } from '../local/models';

// Địa hình núi cao tầng bình lưu phủ sương lam nhìn từ độ cao 50.000 ft
const STRATO_TERRAIN = heightField({
  seed: 171,
  amp: 26,
  scale: 210,
  oct: 5,
  add: (x, z) =>
    18 * Math.exp(-(((z + 160) / 190) ** 2)) * (0.6 + 0.4 * Math.sin(x * 0.012)) +
    14 * Math.exp(-(((z - 220) / 220) ** 2)) * (0.6 + 0.4 * Math.cos(x * 0.009)),
});

const STRATO_COLORS = {
  low: '#18345e',
  high: '#4d77ab',
  rock: '#2c4c78',
  dry: '#9ec0e2',
};

type JetState = {
  t: number;
  pos: V3;
  yaw: number;
  pitch: number;
  roll: number;
  turnRate: number;
  rollRate: number;
};

// Tiền tính quỹ đạo tất định cho F-15EX (457.5s .. 492.0s) để vận tốc luôn tiếp tuyến hoàn hảo với mũi máy bay
const T_MIN = 457.5;
const T_MAX = 492.0;
const DT = 0.05;

const smooth01 = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

const JET_TRAJ: JetState[] = (() => {
  const steps = Math.round((T_MAX - T_MIN) / DT);
  const arr: JetState[] = [];
  let x = (T_MIN - 458.5) * 15;
  let y = 2.0;
  let z = 0;

  for (let i = 0; i <= steps; i++) {
    const ti = T_MIN + i * DT;
    // Góc ngoặt gấp 120 độ ("whip around") từ 474.25s tới 480.6s (xoay mũi sang -Z)
    const turnU = smooth01((ti - 474.25) / 6.35);
    const yaw = turnU * 2.1;

    const prevTurnU = smooth01((ti - DT - 474.25) / 6.35);
    const turnRate = ((turnU - prevTurnU) * 2.1) / DT;

    // Lật nghiêng cánh gắt ~112 độ khi vào cua gấp rồi trả phẳng mượt trước 481.5s
    const rollIn = smooth01((ti - 474.0) / 1.4);
    const rollOut = smooth01((ti - 479.0) / 2.0);
    const baseOsc = 0.03 * Math.sin((ti - 458.5) * 0.65);
    const roll = baseOsc + (rollIn - rollOut) * 1.96;

    const prevRollIn = smooth01((ti - DT - 474.0) / 1.4);
    const prevRollOut = smooth01((ti - DT - 479.0) / 2.0);
    const rollRate = ((rollIn - rollOut - (prevRollIn - prevRollOut)) * 1.96) / DT;

    const whipPitch = 0.065 * Math.sin(smooth01((ti - 474.3) / 6.0) * Math.PI);
    const pitch = 0.032 + whipPitch;

    const speed = lerp(15.0, 13.8, smooth01((ti - 474.5) / 4.5));
    const cp = Math.cos(pitch);
    const vx = Math.cos(yaw) * cp * speed;
    const vy = Math.sin(pitch) * speed * 0.3;
    const vz = -Math.sin(yaw) * cp * speed;

    arr.push({
      t: ti,
      pos: [x, y, z],
      yaw,
      pitch,
      roll,
      turnRate,
      rollRate,
    });

    x += vx * DT;
    y += vy * DT;
    z += vz * DT;
  }
  return arr;
})();

function sampleJet(t: number): JetState {
  const clamped = Math.max(T_MIN, Math.min(T_MAX - 0.001, t));
  const f = (clamped - T_MIN) / DT;
  const i0 = Math.max(0, Math.min(JET_TRAJ.length - 2, Math.floor(f)));
  const a = f - i0;
  const s0 = JET_TRAJ[i0];
  const s1 = JET_TRAJ[i0 + 1];
  return {
    t: clamped,
    pos: [
      lerp(s0.pos[0], s1.pos[0], a),
      lerp(s0.pos[1], s1.pos[1], a),
      lerp(s0.pos[2], s1.pos[2], a),
    ],
    yaw: lerp(s0.yaw, s1.yaw, a),
    pitch: lerp(s0.pitch, s1.pitch, a),
    roll: lerp(s0.roll, s1.roll, a),
    turnRate: lerp(s0.turnRate, s1.turnRate, a),
    rollRate: lerp(s0.rollRate, s1.rollRate, a),
  };
}

function jetLocalToWorld(s: JetState, local: V3): V3 {
  const e = new THREE.Euler(s.roll, s.yaw, s.pitch, 'YZX');
  const v = new THREE.Vector3(...local).applyEuler(e);
  return [s.pos[0] + v.x, s.pos[1] + v.y, s.pos[2] + v.z];
}

// Quỹ đạo tên lửa siêu vượt âm 7.000 lb tách khỏi bụng tại CUE.s17_boosterDrop (461.50s),
// rơi tách 2.75 m dưới bụng rồi điểm hỏa rocket lúc 462.18s vọt cao lên phía trước (luôn nằm trọn trong khung hình cùng F-15EX tới 473s!)
const T_IGNITE = 462.18;

function sampleHypersonic(t: number): { pos: V3; pitch: number; yaw: number; flame: number } {
  const sDrop = sampleJet(CUE.s17_boosterDrop);
  const releaseWorld = jetLocalToWorld(sDrop, F15_CENTERLINE_POS);
  const dt = Math.max(0, t - CUE.s17_boosterDrop);

  // Pha rơi tách 2.75 m rõ ràng dưới bụng F-15EX trước khi kích hoạt tầng đẩy
  const dropU = smooth01(dt / 0.72);
  const dropY = -2.75 * dropU;

  // Vận tốc thừa hưởng từ tiêm kích (15 m/s) + gia tốc vọt lên quỹ đạo cao của tầng đẩy rocket
  const dtIgn = Math.max(0, t - T_IGNITE);
  const boostFwd = -0.9 * dropU + 1.9 * dtIgn + 0.34 * dtIgn * dtIgn;
  const climbY = 0.55 * dtIgn + 0.19 * Math.pow(dtIgn, 1.62);
  const crossZ = -0.22 * Math.pow(dtIgn, 1.25);

  const x = releaseWorld[0] + 15.0 * dt + boostFwd;
  const y = releaseWorld[1] + dropY + climbY;
  const z = releaseWorld[2] + crossZ;

  const vx = 15.0 + (t > T_IGNITE ? 1.9 + 0.68 * dtIgn : -1.2);
  const vy =
    (dt < 0.72 ? (-2.75 / 0.72) * 6 * (dt / 0.72) * (1 - dt / 0.72) : 0) +
    (t > T_IGNITE ? 0.55 + 0.308 * Math.pow(Math.max(0.01, dtIgn), 0.62) : 0);
  const vz = t > T_IGNITE ? -0.275 * Math.pow(Math.max(0.01, dtIgn), 0.25) : 0;

  const pitch = Math.atan2(vy, Math.hypot(vx, vz));
  const yaw = Math.atan2(-vz, vx);
  const flame = t < T_IGNITE ? 0 : Math.min(1, (t - T_IGNITE) / 0.16);

  return { pos: [x, y, z], pitch, yaw, flame };
}

// Quỹ đạo tên lửa đối phương bám đuổi phía sau nhưng hụt hơi cạn nhiên liệu tắt lửa lúc 477.2s ngay trong hậu cảnh bên phải khi F-15EX lật cánh ngoặt gấp!
function sampleEnemyMissile(t: number): { pos: V3; pitch: number; yaw: number; flame: number; alive: boolean } {
  const tStart = 473.2;
  const tBurnout = 477.35;
  const tEnd = 481.0;
  if (t < tStart || t > tEnd) {
    return { pos: [0, -999, 0], pitch: 0, yaw: 0, flame: 0, alive: false };
  }
  // Bám theo hành lang phía ngoài vòng cua của F-15EX rồi bị bỏ rơi khi nhiên liệu cháy cạn, chúi mũi rơi xuống ở nửa phải khung hình
  const u = (t - tStart) / (tEnd - tStart);
  const postBurn = Math.max(0, t - tBurnout);
  const jRef = sampleJet(Math.min(t, 476.6));

  const x = jRef.pos[0] + 6.0 + postBurn * 5.5;
  const y = jRef.pos[1] + 2.8 + Math.sin(u * Math.PI) * 2.2 - 1.35 * postBurn * postBurn;
  const z = jRef.pos[2] - 11.5 - (t - tStart) * 2.4;

  const dtEps = 0.05;
  const u2 = (t + dtEps - tStart) / (tEnd - tStart);
  const pb2 = Math.max(0, t + dtEps - tBurnout);
  const jRef2 = sampleJet(Math.min(t + dtEps, 476.6));
  const vx = (jRef2.pos[0] + 6.0 + pb2 * 5.5 - x) / dtEps;
  const vy = (jRef2.pos[1] + 2.8 + Math.sin(u2 * Math.PI) * 2.2 - 1.35 * pb2 * pb2 - y) / dtEps;
  const vz = (jRef2.pos[2] - 11.5 - (t + dtEps - tStart) * 2.4 - z) / dtEps;

  const pitch = Math.atan2(vy, Math.hypot(vx, vz));
  const yaw = Math.atan2(-vz, vx);
  const flicker = 0.45 + 0.55 * Math.sin(t * 56);
  const flame = t < tBurnout ? Math.max(0, Math.min(1, (tBurnout - t) / 1.2)) * flicker : 0;

  return { pos: [x, y, z], pitch, yaw, flame, alive: true };
}

// Thảm mây ti tầng cao + khói rocket mềm dùng chung texture
const CirrusLayer: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#b8d7f4',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    [],
  );
  const patches = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        pos: [
          -120 + rnd(i * 3 + 1) * 760,
          -62 - rnd(i * 3 + 2) * 24,
          -340 + rnd(i * 3 + 3) * 640,
        ] as V3,
        sx: 55 + rnd(i * 5 + 4) * 85,
        sy: 14 + rnd(i * 5 + 5) * 20,
      })),
    [],
  );

  return (
    <group>
      {patches.map((c, idx) => (
        <sprite key={idx} material={mat} position={c.pos} scale={[c.sx, c.sy, 1]} />
      ))}
    </group>
  );
};

const SmokeSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot: number }> = ({
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

const S17: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const jet = sampleJet(t);

  // Vệt ngưng tụ đầu cánh (wingtip contrails)
  const wingTrailL = useMemo(() => {
    const pts: V3[] = [];
    const span = 2.6;
    const N = 32;
    for (let i = 0; i <= N; i++) {
      const ts = t - span * (1 - i / N);
      pts.push(jetLocalToWorld(sampleJet(ts), [-3.6, 2.34, -6.48]));
    }
    return pts;
  }, [t]);

  const wingTrailR = useMemo(() => {
    const pts: V3[] = [];
    const span = 2.6;
    const N = 32;
    for (let i = 0; i <= N; i++) {
      const ts = t - span * (1 - i / N);
      pts.push(jetLocalToWorld(sampleJet(ts), [-3.6, 2.34, 6.48]));
    }
    return pts;
  }, [t]);

  // Trạng thái & vệt lửa + khói rocket của tên lửa siêu vượt âm 7.000 lb
  const released = t >= CUE.s17_boosterDrop;
  const hyp = sampleHypersonic(t);
  const ignitePos = useMemo(() => {
    const h0 = sampleHypersonic(T_IGNITE);
    const e = new THREE.Euler(0, h0.yaw, h0.pitch, 'YZX');
    const tail = new THREE.Vector3(-3.35, 0, 0).applyEuler(e);
    return [h0.pos[0] + tail.x, h0.pos[1] + tail.y, h0.pos[2] + tail.z] as V3;
  }, []);

  const hypTrailPts = useMemo(() => {
    if (t <= T_IGNITE + 0.04) return [];
    const pts: V3[] = [];
    const tEnd = Math.min(t, 475.5);
    const tBegin = Math.max(T_IGNITE, tEnd - 9.5);
    const N = 50;
    for (let i = 0; i <= N; i++) {
      const ts = lerp(tBegin, tEnd, i / N);
      const hs = sampleHypersonic(ts);
      const e = new THREE.Euler(0, hs.yaw, hs.pitch, 'YZX');
      const nozzleOffset = new THREE.Vector3(-3.35, 0, 0).applyEuler(e);
      pts.push([hs.pos[0] + nozzleOffset.x, hs.pos[1] + nozzleOffset.y, hs.pos[2] + nozzleOffset.z]);
    }
    return pts;
  }, [t]);

  // Cụm khói trắng-vàng mềm dọc đoạn đầu điểm hỏa tầng đẩy cho cảm giác khí động chân thực
  const hypSmokePuffs = useMemo(() => {
    if (t <= T_IGNITE + 0.05 || t > 475.5) return [];
    const list: { pos: V3; size: number; op: number; col: string; rot: number }[] = [];
    const count = 24;
    for (let i = 0; i < count; i++) {
      const born = T_IGNITE + i * 0.28;
      const age = t - born;
      if (age < 0 || age > 7.5) continue;
      const hs = sampleHypersonic(born);
      const e = new THREE.Euler(0, hs.yaw, hs.pitch, 'YZX');
      const noz = new THREE.Vector3(-3.5, 0, 0).applyEuler(e);
      list.push({
        pos: [hs.pos[0] + noz.x, hs.pos[1] + noz.y - age * 0.12, hs.pos[2] + noz.z],
        size: 1.2 + age * 0.65,
        op: Math.max(0, (1 - age / 7.5) * 0.34),
        col: age < 0.7 ? '#ffd996' : '#dce9f7',
        rot: i * 1.1,
      });
    }
    return list;
  }, [t]);

  // Tên lửa đối phương cháy cạn nhiên liệu phía sau
  const enemy = sampleEnemyMissile(t);
  const enemyTrailPts = useMemo(() => {
    if (t < 473.1 || t > 481.8) return [];
    const pts: V3[] = [];
    const tEnd = Math.min(t, 481.3);
    const tBegin = Math.max(473.0, tEnd - 4.8);
    const N = 36;
    for (let i = 0; i <= N; i++) {
      pts.push(sampleEnemyMissile(lerp(tBegin, tEnd, i / N)).pos);
    }
    return pts;
  }, [t]);

  // Sóng radar đối phương phát hiện mục tiêu 200 sq ft từ 150 dặm (từ 482.38s)
  const radarP = prog(t, CUE.s17_radarSpot150 - 0.3, 484.4);

  // ==================== QUỸ ĐẠO CAMERA TỌA ĐỘ TRỤ QUANH MÁY BAY (KHÔNG BAO GIỜ XUYÊN CÁNH!) ====================
  // Hệ góc phương vị az tương đối với hướng bay jet.yaw (az = 0 là trước mũi, az = +PI/2 là sườn phải +Z, az = +PI là sau đuôi):
  // - Pha 1 (458.5–473.5s): Góc bên-chéo sườn phải ~52° -> ~115° (r = 22 -> 31 m), giữ trọn cả F-15EX ở bên trái khung hình và toàn bộ đường bay vọt của tên lửa siêu vượt âm ở nửa phải khung hình!
  // - Pha 2 (473.6–480.8s): Quay mượt ra sau đuôi-phải (az ~ 142°, r = 27 m, cao +7.5 m) thấy trọn F-15EX lật cánh 112° ngoặt trái VÀ tên lửa địch tắt lửa rơi hụt bên phải!
  // - Pha 3 (480.8–490.75s): Vòng mượt theo cung tròn bên ngoài sườn phải lên góc 3/4 trước-trên (az: 142° -> 38°, r = 25.5 m, KHÔNG cắt ngang qua tâm máy bay!) đón chùm sóng radar đỏ 150 dặm ập vào!
  const pSlingshot = prog(t, 461.3, 472.2);
  const pWhip = prog(t, 473.5, 477.2);
  const pRadar = prog(t, 480.6, 485.2);

  let azRel = lerp(0.95, 1.88, pSlingshot); // 54° -> 108° (bên sườn phải nhìn chéo lên trước)
  let camDist = lerp(22.0, 34.5, pSlingshot);
  let camHeight = lerp(1.6, 4.0, pSlingshot);

  azRel = lerp(azRel, 2.52, pWhip); // -> 144° (sau-phải bên ngoài vòng ngoặt)
  camDist = lerp(camDist, 28.0, pWhip);
  camHeight = lerp(camHeight, 7.8, pWhip);

  azRel = lerp(azRel, 0.58, pRadar); // 144° -> 33° (vòng mượt qua sườn phải lên 3/4 mũi-trên, luôn giữ r >= 25m!)
  camDist = lerp(camDist, 25.0, pRadar);
  camHeight = lerp(camHeight, 6.2, pRadar);

  // Hệ trục chuẩn hướng bay: mũi máy bay là [cos(yaw), 0, -sin(yaw)], sườn phải (+Z khi yaw=0) là [sin(yaw), 0, cos(yaw)]
  const fwdX = Math.cos(jet.yaw);
  const fwdZ = -Math.sin(jet.yaw);
  const rightX = Math.sin(jet.yaw);
  const rightZ = Math.cos(jet.yaw);

  const orbitCamPos: V3 = [
    jet.pos[0] + (fwdX * Math.cos(azRel) + rightX * Math.sin(azRel)) * camDist,
    jet.pos[1] + camHeight,
    jet.pos[2] + (fwdZ * Math.cos(azRel) + rightZ * Math.sin(azRel)) * camDist,
  ];

  // Điểm nhìn (lookAt): giữ trọn cả đuôi đứng F-15EX ở bên trái và toàn bộ tên lửa siêu vượt âm ở bên phải!
  const lookLeadFwd = lerp(lerp(1.2, 13.0, pSlingshot), 4.0, pWhip) * (1 - pRadar) + 0.5 * pRadar;
  const lookLeadRight = lerp(0, 5.5, pWhip) * (1 - pRadar);
  const lookLeadUp = lerp(lerp(1.8, 5.8, pSlingshot), 1.4, pWhip) * (1 - pRadar) + 1.9 * pRadar;

  const camLook: V3 = [
    jet.pos[0] + fwdX * lookLeadFwd + rightX * lookLeadRight,
    jet.pos[1] + lookLeadUp,
    jet.pos[2] + fwdZ * lookLeadFwd + rightZ * lookLeadRight,
  ];
  const camFov = lerp(lerp(42, 46, pSlingshot), 41, pRadar);

  // Nguồn phát sóng radar địch cách 150 dặm ở đường chân trời xa phía bên trái khung hình
  const radarOrigin: V3 = [
    jet.pos[0] + fwdX * 15 - rightX * 72,
    jet.pos[1] - 12,
    jet.pos[2] + fwdZ * 15 - rightZ * 72,
  ];

  const aileronDefl = Math.max(-0.42, Math.min(0.42, jet.rollRate * 0.28));
  const elevatorDefl = -0.05 - Math.min(0.28, Math.abs(jet.turnRate) * 0.55);
  const rudderDefl = Math.max(-0.3, Math.min(0.3, jet.turnRate * 0.45));

  return (
    <AbsoluteFill>
      <Stage {...STAGE_STRATOSPHERE} shadowCenter={jet.pos}>
        <Cam pos={orbitCamPos} look={camLook} fov={camFov} />

        {/* Mặt đất núi non & thảm mây ti xa tít bên dưới 50.000 ft */}
        <group position={[180, -138, -80]}>
          <Terrain h={STRATO_TERRAIN} size={2200} seg={140} center={[0, 0]} colors={STRATO_COLORS} />
        </group>
        <CirrusLayer />

        {/* Boeing F-15EX Eagle II ở Mach 2+ và độ cao 50.000 ft */}
        <group position={jet.pos} rotation={new THREE.Euler(jet.roll, jet.yaw, jet.pitch, 'YZX')}>
          <F15EX
            gear={0}
            afterburner={t >= 474.2 && t <= 480.8 ? 1.0 : 0.95}
            bellyOutsized={!released}
            wingTipMissiles
            fullLoad
            backSeatOccupied={false}
            aileron={aileronDefl}
            elevator={elevatorDefl}
            rudder={rudderDefl}
          />

          {/* Vòng cung sóng khóa mục tiêu radar đỏ phát sáng bao vây tiết diện 200 sq ft từ 482.38s */}
          {radarP > 0.01 && (
            <group position={[0, 2.15, 0]}>
              <pointLight
                color={P.red}
                intensity={24 * radarP * (0.65 + 0.35 * Math.sin(t * 9))}
                distance={26}
                decay={1.5}
              />
              {[0, 1, 2].map((ri) => {
                const pulse = ((t * 1.1 + ri * 0.33) % 1);
                const rad = 7.6 + pulse * 6.8;
                const op = radarP * Math.sin(pulse * Math.PI) * 0.85;
                return (
                  <mesh key={ri} rotation={[Math.PI / 2, 0, t * 0.45 + ri * 1.1]}>
                    <torusGeometry args={[rad, 0.085, 10, 64, Math.PI * 1.55]} />
                    <meshBasicMaterial color={P.red} transparent opacity={op} toneMapped={false} />
                  </mesh>
                );
              })}
              {/* 4 cung ngoặc khóa mục tiêu radar 3D xoay quanh thân máy bay */}
              {[0, 1, 2, 3].map((ci) => (
                <mesh
                  key={`lock-${ci}`}
                  rotation={[Math.PI / 2, 0, t * 0.55 + (ci * Math.PI) / 2]}
                >
                  <torusGeometry args={[10.4, 0.12, 10, 24, Math.PI * 0.28]} />
                  <meshBasicMaterial
                    color="#ff6678"
                    transparent
                    opacity={radarP * (0.65 + 0.3 * Math.sin(t * 12))}
                    toneMapped={false}
                  />
                </mesh>
              ))}
            </group>
          )}
        </group>

        {/* Vệt khói ngưng tụ đầu cánh */}
        <Trail points={wingTrailL} color="#d8ecff" width={0.07} opacity={0.36} glow={false} />
        <Trail points={wingTrailR} color="#d8ecff" width={0.07} opacity={0.36} glow={false} />

        {/* Tên lửa siêu vượt âm 7.000 lb tách bụng, rơi 2.75m rồi đốt rocket vọt lên quỹ đạo cao */}
        {released && t < 476.5 && (
          <>
            <group position={hyp.pos} rotation={new THREE.Euler(0, hyp.yaw, hyp.pitch, 'YZX')}>
              <HypersonicMissile flame={hyp.flame} />
            </group>
            <MuzzleBlast t={t} at={T_IGNITE} pos={ignitePos} dir={[-1, -0.18, 0]} size={2.2} seed={17} />
            {hypSmokePuffs.map((p, idx) => (
              <SmokeSprite key={idx} pos={p.pos} size={p.size} color={p.col} opacity={p.op} rot={p.rot} />
            ))}
            {hypTrailPts.length >= 2 && (
              <>
                <Trail points={hypTrailPts} color="#fff9db" width={0.13} opacity={0.96} glow />
                <Trail points={hypTrailPts} color="#ffaa33" width={0.26} opacity={0.48} glow />
              </>
            )}
          </>
        )}

        {/* Tên lửa đối phương cháy cạn nhiên liệu tắt lửa rơi hụt phía sau bên phải khi Eagle II ngoặt gấp */}
        {enemy.alive && (
          <group position={enemy.pos} rotation={new THREE.Euler(0, enemy.yaw, enemy.pitch, 'YZX')}>
            <AMRAAM flame={enemy.flame} />
          </group>
        )}
        {enemyTrailPts.length >= 2 && (
          <>
            <Trail
              points={enemyTrailPts}
              color={t < 477.3 ? '#ff6a2e' : '#a8b8cc'}
              width={0.16}
              opacity={lerp(0.82, 0.0, prog(t, 479.5, 481.6))}
              glow={t < 477.5}
            />
            {t >= 475.5 && t <= 481.2 && (
              <SmokeSprite
                pos={enemy.pos}
                size={2.2}
                color={t < 477.4 ? '#ffb169' : '#c6d2e0'}
                opacity={0.45}
                rot={t * 2}
              />
            )}
          </>
        )}

        {/* Các vòng cung mặt sóng radar đỏ từ cự ly 150 dặm lan rộng trên mặt phẳng chiến trường quét thẳng vào F-15EX */}
        {t >= CUE.s17_radarSpot150 - 0.5 &&
          [0, 1, 2, 3, 4].map((wi) => {
            const cycle = ((t - (CUE.s17_radarSpot150 - 0.5)) * 0.52 + wi / 5) % 1;
            const dx = jet.pos[0] - radarOrigin[0];
            const dz = jet.pos[2] - radarOrigin[2];
            const fullDist = Math.hypot(dx, dz);
            const aimYaw = Math.atan2(-dz, dx);
            const radius = 14 + cycle * (fullDist + 16);
            const yWave = lerp(radarOrigin[1], jet.pos[1] + 2.0, cycle);
            const arcSpan = Math.PI * 0.42;
            const op = smooth01((t - 481.9) / 0.7) * Math.sin(cycle * Math.PI) * 0.85;
            return (
              <group key={wi} position={[radarOrigin[0], yWave, radarOrigin[2]]} rotation={[0, aimYaw, 0]}>
                <mesh rotation={[Math.PI / 2, 0, -arcSpan * 0.5]}>
                  <torusGeometry args={[radius, 0.14, 10, 56, arcSpan]} />
                  <meshBasicMaterial color={P.red} transparent opacity={op} toneMapped={false} />
                </mesh>
              </group>
            );
          })}
      </Stage>

      {/* Tối đa 1 Label trên màn hình tại mọi thời điểm */}
      <Label
        t={t}
        text="50,000 FT · MACH 2+"
        x={380}
        y={138}
        from={463.84}
        until={466.5}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="150 MILES"
        x={300}
        y={138}
        from={484.14}
        until={486.8}
        bg={P.red}
        fg="#ffffff"
      />
    </AbsoluteFill>
  );
};

export default S17;
