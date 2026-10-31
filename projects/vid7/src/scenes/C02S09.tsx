// Cảnh C02S09 (315.78–330.86 s) — Cao trào 3D chạy đà dọc vạch trắng, mút cánh phải cắt sượt cầu chỉ huy thép < 6 ft,
// mũi USS Hornet chồm lên đỉnh sóng bão 30 ft và chiếc B-25 #1 của Jimmy Doolittle nhấc bổng sớm khỏi mặt sàn;
// phía sau 15 chiếc B-25 quá tải nối hàng tiến vào màn bụi sóng.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { DustTrail, softDot, Trail } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';
import { HORNET_B25_Z, HORNET_BOW_X, HORNET_DECK_Y, USSHornet } from '../parts/USSHornet';

// ---------------- Hằng số vật lý & căn pha sóng chuẩn xác ----------------
const SWELL = 4.3;
const SHIP_LEN = 251.4;
const SHIP_BEAM = 35.0;

// Căn pha tWave = t + WAVE_PHASE_OFFSET để đúng vào mốc CUE.c02_s09_bow_heaves (322.16–323.28 s),
// shipPose(0, 0, 251.4, 35.0, tWave, 4.3).pitch đạt cực đại dương (+0.01972 rad = +1.13°, bowDeckY vọt lên 21.07 m)!
const WAVE_PHASE_OFFSET = -294.66;

const T_ROLL_START = CUE.c02_s09_start; // 315.78 s (nối mượt từ x = +4.0 m cuối C02S08)
const T_ROTATE_START = 323.05; // Kéo cần lái xoay mũi quanh trục bánh chính tại x ≈ 97.8 m
const T_LIFTOFF = 323.72; // Bánh chính nhấc bổng rời mặt sàn tại x = +110.0 m (dư 15.7 m = 51.5 ft trước HORNET_BOW_X = 125.7 m!)

const X0 = 4.0;
const V0 = 8.0; // m/s trên sàn tại 315.78 s
const ACC_DECK = 1.34764; // m/s^2 -> x(318.93) = 35.89 m (ngang cầu chỉ huy), x(323.72) = 110.00 m!
const V_LIFTOFF = V0 + ACC_DECK * (T_LIFTOFF - T_ROLL_START); // 18.70 m/s (+ 20.1 m/s gió ngược = 87 mph tốc độ khí động)

const CLIMB_PITCH_RAD = (11.0 * Math.PI) / 180; // +11° góc ngóc mũi bay vọt lên trời bão
const MAIN_GEAR_PIVOT_X = 1.24; // Trục tiếp đất bánh chính trong toạ độ cục bộ B25Mitchell
const V_CLIMB = 5.45; // m/s vận tốc leo cao (đạt y ≈ 34–37 m tại 326.88–327.5 s)
const CLIMB_TAU = 0.52; // hằng số làm mượt gia tốc rời sàn C^∞

type Plane1State = {
  pos: V3;
  rot: V3;
  quat: THREE.Quaternion;
  xDeck: number;
  distRolled: number;
  gear: number;
  airborne: boolean;
};

const POSE_AT_LIFTOFF = shipPose(0, 0, SHIP_LEN, SHIP_BEAM, T_LIFTOFF + WAVE_PHASE_OFFSET, SWELL);

/** Tính trạng thái thế giới C^1 mượt tuyệt đối của chiếc B-25 #1 từ chạy đà trên sàn (bám khít shipPose) sang bay vọt trên không. */
function evalPlane1State(t: number): Plane1State {
  const dt = t - T_ROLL_START;
  let xDeck: number;
  if (t <= T_LIFTOFF) {
    xDeck = X0 + V0 * dt + 0.5 * ACC_DECK * dt * dt;
  } else {
    const u = t - T_LIFTOFF;
    xDeck = 110.0 + V_LIFTOFF * u + 0.26 * u * u;
  }
  const distRolled = Math.max(0, xDeck - -16.6);

  // Góc ngóc mũi alpha: 0° khi chạy đà (3 bánh chạm khít mặt sàn), xoay trên trục bánh chính từ 323.05 s lên +11° khi bay vọt
  const alpha = CLIMB_PITCH_RAD * prog(t, T_ROTATE_START, 324.5);
  const pivotDx = MAIN_GEAR_PIVOT_X * (1 - Math.cos(alpha));
  const pivotDy = -MAIN_GEAR_PIVOT_X * Math.sin(alpha);

  // Khi x <= 110 m (t <= T_LIFTOFF), airBlend = 0 -> máy bay gắn chặt 100% vào mặt sàn theo shipPose hiện tại!
  // Khi rời sàn (t > T_LIFTOFF), chuyển mượt sang hệ quy chiếu bay trên không từ đỉnh sóng POSE_AT_LIFTOFF + climbY > 0.
  const poseLive = shipPose(0, 0, SHIP_LEN, SHIP_BEAM, t + WAVE_PHASE_OFFSET, SWELL);
  const airBlend = prog(t, T_LIFTOFF, T_LIFTOFF + 0.58);

  const refY = lerp(poseLive.y, POSE_AT_LIFTOFF.y, airBlend);
  const refPitch = lerp(poseLive.pitch, POSE_AT_LIFTOFF.pitch, airBlend);
  const bankInSky = -0.055 * prog(t, 324.5, 327.6);
  const refRoll = lerp(poseLive.roll, POSE_AT_LIFTOFF.roll * (1 - prog(t, T_LIFTOFF, T_LIFTOFF + 1.25)) + bankInSky, airBlend);

  const uAir = Math.max(0, t - T_LIFTOFF);
  const climbY = uAir > 0 ? V_CLIMB * (Math.hypot(uAir, CLIMB_TAU) - CLIMB_TAU) : 0;
  const driftZ = -0.85 * prog(t, 324.6, 328.4);

  const shipQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(refRoll, 0, refPitch, 'XYZ'));
  const localPos = new THREE.Vector3(xDeck + pivotDx, HORNET_DECK_Y + pivotDy, HORNET_B25_Z + driftZ);
  const worldVec = localPos.applyQuaternion(shipQuat);
  worldVec.y += refY + climbY;

  const localQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, alpha, 'XYZ'));
  const worldQuat = shipQuat.multiply(localQuat);
  const eul = new THREE.Euler().setFromQuaternion(worldQuat, 'XYZ');

  // Thu càng đáp 1.0 -> 0.45 trong nhịp leo cao (323.95..326.65 s), sau đó khép dần tới 0.22 khi bay vút đi
  const gear = 1 - 0.55 * prog(t, 323.95, 326.65) - 0.23 * prog(t, 326.75, 328.8);

  return {
    pos: [worldVec.x, worldVec.y, worldVec.z],
    rot: [eul.x, eul.y, eul.z],
    quat: worldQuat,
    xDeck,
    distRolled,
    gear,
    airborne: t > T_LIFTOFF,
  };
}

/** Tính toạ độ thế giới của đầu mút cánh (zSide = -1 cánh trái, +1 cánh phải) của chiếc B-25 #1 tại thời điểm t. */
function evalWingtipWorld(t: number, zSide: -1 | 1): V3 {
  const st = evalPlane1State(t);
  const tipLocal = new THREE.Vector3(1.15, 2.45, zSide * 10.28).applyQuaternion(st.quat);
  return [st.pos[0] + tipLocal.x, st.pos[1] + tipLocal.y, st.pos[2] + tipLocal.z];
}

// ---------------- Bụi sóng bão quật qua mũi clipper bow (tông sương muối xám-lam dưới ngưỡng bloom để giữ nét sóng & dầm chữ A) ----------------
const BowStormSpray: React.FC<{ t: number; tWave: number }> = ({ t, tWave }) => {
  const heaveBoost = 1 + 0.35 * bump(t, 321.8, 2.8) + 0.45 * prog(t, 327.4, 329.6);

  const puffs = useMemo(() => {
    const tex = softDot();
    return Array.from({ length: 20 }, (_, i) => ({
      seedA: rnd(i * 3.1 + 7),
      seedB: rnd(i * 5.7 + 13),
      seedC: rnd(i * 8.3 + 29),
      side: i % 2 === 0 ? -1 : 1,
      period: 1.5 + rnd(i * 2.9 + 5) * 0.9,
      mat: new THREE.SpriteMaterial({
        map: tex,
        color: new THREE.Color('#8ea5b6'),
        transparent: true,
        depthWrite: false,
      }),
    }));
  }, []);

  return (
    <group>
      {puffs.map((pf, i) => {
        const phase = ((t * 0.95 + pf.seedA * pf.period) % pf.period) / pf.period;
        // Sinh sát sống mũi clipper bow và bay tạt dọc hai bên mạn tàu (|z| <= 17.2 m, không chạm vùng camera z <= -21.8 m)
        const x0 = HORNET_BOW_X - 24.0 + pf.seedB * 21.0;
        const x = x0 - phase * (28 + pf.seedC * 22);
        const hullSpread = lerp(4.2, 16.2, Math.max(0, (HORNET_BOW_X - x) / 52));
        const z = pf.side * (hullSpread + (pf.seedC - 0.4) * 1.8);
        const seaY = waveY(x, z, tWave, SWELL);
        const y = seaY + 1.0 + Math.pow(phase, 0.78) * (9.5 + pf.seedB * 6.5);
        const scale = (4.2 + pf.seedA * 4.8) * (0.55 + phase * 0.95) * heaveBoost;
        const alpha = Math.sin(phase * Math.PI) * 0.13 * Math.min(1.35, heaveBoost);
        if (alpha <= 0.008) return null;

        pf.mat.opacity = alpha;
        pf.mat.rotation = i * 1.1 + phase * 1.3 * pf.side;
        return <sprite key={`spray-${i}`} material={pf.mat} position={[x, y, z]} scale={[scale, scale * 0.72, scale]} />;
      })}
    </group>
  );
};

// ---------------- Nhân vật Sĩ quan phóng tàu & Thủy thủ boong (đứng sát hành lang trái z = -14.4 m, an toàn ngoài sải cánh) ----------------
const DeckCrewFigures: React.FC<{ t: number }> = ({ t }) => {
  const yellowJacket = useMemo(() => plain('#d4a62a', 0.72, 0.08), []);
  const blueJersey = useMemo(() => plain('#263d57', 0.78, 0.08), []);
  const darkPants = useMemo(() => plain('#1d2430', 0.82, 0.08), []);
  const helmetMat = useMemo(() => plain('#3a434e', 0.6, 0.2), []);
  const flagPoleMat = useMemo(() => plain('#7a6242', 0.75, 0.1), []);
  const flagClothMat = useMemo(() => plain('#e9eef2', 0.75, 0.05), []);
  const torsoGeo = useMemo(() => rbox(0.36, 0.56, 0.26, 0.06), []);

  const waveArm = -0.75 + 0.48 * Math.sin(t * 7.8) * prog(t, 324.5, 326.5);

  return (
    <group>
      {/* Sĩ quan phóng tàu (Launch Officer áo vàng) cúi thấp giữ cờ caro sau khi quất cờ cho chiếc #1 */}
      <group position={[21.5, HORNET_DECK_Y, -14.4]} rotation={[0, 0.35, 0]}>
        <mesh position={[0, 0.42, -0.09]} material={darkPants} castShadow>
          <cylinderGeometry args={[0.075, 0.07, 0.84, 8]} />
        </mesh>
        <mesh position={[0, 0.42, 0.09]} material={darkPants} castShadow>
          <cylinderGeometry args={[0.075, 0.07, 0.84, 8]} />
        </mesh>
        <mesh position={[0.04, 1.08, 0]} rotation={[0, 0, -0.18]} geometry={torsoGeo} material={yellowJacket} castShadow />
        <mesh position={[0.1, 1.48, 0]} material={helmetMat} castShadow>
          <sphereGeometry args={[0.13, 12, 10]} />
        </mesh>
        <group position={[0.22, 1.05, 0.14]} rotation={[0, 0, -1.05]}>
          <mesh position={[0, 0.42, 0]} material={flagPoleMat}>
            <cylinderGeometry args={[0.018, 0.018, 0.95, 6]} />
          </mesh>
          <mesh position={[0.24, 0.72, 0]} material={flagClothMat}>
            <boxGeometry args={[0.48, 0.38, 0.02]} />
          </mesh>
        </group>
      </group>

      {/* Thủy thủ dẫn đường boong tàu (Plane Director áo vàng) tại x = -8.5, z = -14.1 vẫy chiếc #2 vào vạch trắng */}
      <group position={[-8.5, HORNET_DECK_Y, -14.1]} rotation={[0, 2.55, 0]}>
        <mesh position={[0, 0.44, -0.09]} material={darkPants} castShadow>
          <cylinderGeometry args={[0.075, 0.07, 0.88, 8]} />
        </mesh>
        <mesh position={[0, 0.44, 0.09]} material={darkPants} castShadow>
          <cylinderGeometry args={[0.075, 0.07, 0.88, 8]} />
        </mesh>
        <mesh position={[0, 1.12, 0]} geometry={torsoGeo} material={yellowJacket} castShadow />
        <mesh position={[0, 1.52, 0]} material={blueJersey} castShadow>
          <sphereGeometry args={[0.13, 12, 10]} />
        </mesh>
        <group position={[0.05, 1.32, 0.18]} rotation={[waveArm, 0, -0.35]}>
          <mesh position={[0, 0.26, 0]} material={yellowJacket}>
            <cylinderGeometry args={[0.048, 0.045, 0.52, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

// ---------------- Cấu hình đội hình 15 chiếc B-25B quá tải nối đuôi nhau (#2..#16) trên sàn tàu ----------------
type DeckBomberSpec = {
  num: number;
  x0: number;
  z0: number;
  yaw0: number;
  seed: number;
};

const FOLLOWING_BOMBERS: DeckBomberSpec[] = Array.from({ length: 15 }, (_, idx) => {
  const num = idx + 2; // #2 .. #16
  const isPort = idx % 2 === 0;
  const rowIdx = Math.floor(idx / 2);
  // Trải từ x = -22.5 m (chiếc #2 ngay sau vạch xuất phát) tới x = -114.9 m (chiếc #16 cuối đuôi sàn tàu),
  // so le ngang 1.8 m giữa 2 chiếc cùng mạn để mũi & cánh đuôi kép chữ H hoàn toàn không chạm nhau.
  const x0 = -22.5 - idx * 6.6;
  const z0 = isPort ? (rowIdx % 2 === 0 ? -4.8 : -6.6) : rowIdx % 2 === 0 ? 4.5 : 6.3;
  const yaw0 = isPort ? -0.05 : 0.05;
  return {
    num,
    x0,
    z0,
    yaw0,
    seed: 18 + (idx % 2),
  };
});

// ---------------- Hằng số xoáy hơi nước đầu cánh ngắn tự tan trong gió bão (<Trail>) ----------------
const TRAIL_T0 = 323.15;
const TRAIL_WINDOW_SEC = 1.15; // Vệt xoáy dài ~22 m bám theo đầu cánh và tự tan mượt phía sau
const TRAIL_WINDOW_PTS = 26;

// ---------------- Nội suy Camera điện ảnh xuyên suốt 4 nhịp của C02S09 ----------------
function evalCamera(t: number, p1: Plane1State): { pos: V3; look: V3; fov: number; roll: number } {
  // Nhịp 1 (315.78–317.1 s): Bám đuổi tốc độ cao bên mạn trái-sau dọc theo vạch sơn trắng (z = -3.80)
  const chasePos: V3 = [p1.pos[0] - 15.2, p1.pos[1] + 3.45, -6.5];
  const chaseLook: V3 = [p1.pos[0] + 12.5, p1.pos[1] + 2.15, 2.6];

  // Nhịp 2 (317.1–320.3 s): Vượt nhanh lên bên mạn trái và nâng độ cao (+8.6 m trên mặt sàn) nhìn chéo qua lưng cánh
  // để thấy trọn vẹn 100% đầu mút cánh phải (z = +9.45, đèn xanh lục) cắt sượt cầu chỉ huy thép (z = +11.25) < 6 ft!
  const pOvertake = prog(t, 316.5, 319.25);
  const wingSwingZ = -3.4 * Math.sin(pOvertake * Math.PI);
  const bridgePos: V3 = [p1.pos[0] + 16.5, p1.pos[1] + 8.6, -11.2];
  const bridgeLook: V3 = [p1.pos[0] + 1.2, p1.pos[1] + 2.4, 3.8];

  const pos12: V3 = [
    lerp(chasePos[0], bridgePos[0], pOvertake),
    lerp(chasePos[1], bridgePos[1], pOvertake),
    lerp(chasePos[2], bridgePos[2], pOvertake) + wingSwingZ,
  ];
  const look12: V3 = [
    lerp(chaseLook[0], bridgeLook[0], pOvertake),
    lerp(chaseLook[1], bridgeLook[1], pOvertake),
    lerp(chaseLook[2], bridgeLook[2], pOvertake),
  ];

  // Nhịp 3a (320.0–324.8 s): Trượt rộng ra ngoài mạn trái mũi tàu (z = -24.5..-25.8 m, lệch hẳn khỏi trục <Trail>),
  // bắt trọn mũi Hornet chồm lên đỉnh sóng (322.16–323.28 s) và cú nhấc bổng sớm tại x = +110 m (323.86 s) vọt qua số '8' mũi tàu!
  const pOutBow = prog(t, 319.8, 323.1);
  const pLiftHold = prog(t, 323.1, 325.1);
  const liftoffPos: V3 = [
    lerp(115.0, 134.0, pLiftHold),
    lerp(23.6, 23.4, pLiftHold),
    lerp(-24.2, -25.8, pLiftHold),
  ];
  const liftoffLook: V3 = [
    p1.pos[0] + lerp(3.2, -1.8, pLiftHold),
    p1.pos[1] + lerp(1.6, 0.9, pLiftHold),
    -0.9,
  ];

  const pos123a: V3 = [
    lerp(pos12[0], liftoffPos[0], pOutBow),
    lerp(pos12[1], liftoffPos[1], pOutBow),
    lerp(pos12[2], liftoffPos[2], pOutBow),
  ];
  const look123a: V3 = [
    lerp(look12[0], liftoffLook[0], pOutBow),
    lerp(look12[1], liftoffLook[1], pOutBow),
    lerp(look12[2], liftoffLook[2], pOutBow),
  ];

  // Nhịp 3b (325.0–327.6 s): Vòng lên cao phía trước-mạn trái chiếc #1 (y ≈ 40.8 m, z = -22.8 m) nhìn ngoái lại:
  // Tiền cảnh là chiếc B-25 #1 đang leo vọt ở y ≈ 36 m (thu càng 1 -> 0.45), hậu cảnh bên dưới là trọn tàu sân bay USS Hornet giữa biển bão!
  const pHeroClimb = prog(t, 324.95, 327.45);
  const heroPos: V3 = [211.0, 40.8, -22.8];
  const heroLook: V3 = [148.0, 29.4, 0.6];

  const pos123: V3 = [
    lerp(pos123a[0], heroPos[0], pHeroClimb),
    lerp(pos123a[1], heroPos[1], pHeroClimb),
    lerp(pos123a[2], heroPos[2], pHeroClimb),
  ];
  const look123: V3 = [
    lerp(look123a[0], heroLook[0], pHeroClimb),
    lerp(look123a[1], heroLook[1], pHeroClimb),
    lerp(look123a[2], heroLook[2], pHeroClimb),
  ];

  // Nhịp 4 (327.65–330.86 s, "Fifteen overloaded bombers follow him into the spray"):
  // Khi chiếc #1 bay vút qua đỉnh đầu, camera hạ xuống lơ lửng ngoài mũi mạn trái (x = 92 -> 85 m, z = -22 m) kèm tiêu cự tele 32.5°
  // đóng khung ấn tượng khối Đảo chỉ huy #8 bên trái, chiếc #2 đã tiến vào chính tâm vạch trắng xuất phát và 14 chiếc sau nối hàng tiến lên!
  const pLookback = prog(t, 327.62, 329.35);
  const lookbackDrift = prog(t, 329.35, 330.86);
  const finalPos: V3 = [
    lerp(92.0, 85.0, lookbackDrift),
    lerp(30.0, 29.6, lookbackDrift),
    lerp(-22.4, -21.6, lookbackDrift),
  ];
  const finalLook: V3 = [
    lerp(-23.0, -29.0, lookbackDrift),
    19.9,
    1.3,
  ];

  const deckShakeAmp = 0.05 * (1 - prog(t, 321.5, 324.2));
  const shakeY = deckShakeAmp * Math.sin(t * 29.0);
  const shakeZ = deckShakeAmp * 0.7 * Math.cos(t * 23.0);

  const pos: V3 = [
    lerp(pos123[0], finalPos[0], pLookback),
    lerp(pos123[1], finalPos[1], pLookback) + shakeY,
    lerp(pos123[2], finalPos[2], pLookback) + shakeZ,
  ];
  const look: V3 = [
    lerp(look123[0], finalLook[0], pLookback),
    lerp(look123[1], finalLook[1], pLookback),
    lerp(look123[2], finalLook[2], pLookback),
  ];

  const fov = lerp(lerp(42, 41, pHeroClimb), 32.5, pLookback);
  const roll = 0.02 * Math.sin(pOvertake * Math.PI) - 0.016 * Math.sin(pLookback * Math.PI);

  return { pos, look, fov, roll };
}

// ================ Component Cảnh C02S09 ================
const C02S09: React.FC = () => {
  const t = useT();
  const tWave = t + WAVE_PHASE_OFFSET;

  // Pose nhấp nhô thật của tàu sân bay USS Hornet (251.4 × 35.0 m) trên sóng bão 30 ft (swell = 4.3)
  const pose = shipPose(0, 0, SHIP_LEN, SHIP_BEAM, tWave, SWELL);

  // Trạng thái chiếc B-25 #1 của Jimmy Doolittle
  const p1 = evalPlane1State(t);
  const cam = evalCamera(t, p1);

  // Vệt bụi nước mịn mặt sàn bị luồng gió cánh quạt 2 × 1.700 mã lực quật lùi sát sàn tàu khi chạy đà
  const propWashPortPath = useMemo(
    () => (tb: number): V3 => {
      const st = evalPlane1State(tb);
      const p = new THREE.Vector3(-1.5, 0.25, -3.05).applyQuaternion(st.quat);
      return [st.pos[0] + p.x, st.pos[1] + p.y, st.pos[2] + p.z];
    },
    [],
  );
  const propWashStbdPath = useMemo(
    () => (tb: number): V3 => {
      const st = evalPlane1State(tb);
      const p = new THREE.Vector3(-1.5, 0.25, 3.05).applyQuaternion(st.quat);
      return [st.pos[0] + p.x, st.pos[1] + p.y, st.pos[2] + p.z];
    },
    [],
  );

  // Hai dải xoáy hơi nước đầu mút cánh dạng cửa sổ trượt (dài ~20 m lúc rời mũi tàu, rút gọn ~10 m tự tan trước tàu ở góc rộng)
  const trailOpacity =
    0.23 *
    prog(t, TRAIL_T0 + 0.15, TRAIL_T0 + 0.65) *
    lerp(1, 0.62, prog(t, 325.5, 327.5)) *
    (1 - prog(t, 327.6, 328.7));
  const trailWindow = lerp(TRAIL_WINDOW_SEC, 0.52, prog(t, 325.4, 327.4));
  const slidingTrails = useMemo(() => {
    if (t <= TRAIL_T0 + 0.18 || trailOpacity <= 0.008) return null;
    const tA = Math.max(TRAIL_T0, t - trailWindow);
    const tB = t;
    const left: V3[] = [];
    const right: V3[] = [];
    for (let i = 0; i < TRAIL_WINDOW_PTS; i++) {
      const ts = lerp(tA, tB, i / (TRAIL_WINDOW_PTS - 1));
      left.push(evalWingtipWorld(ts, -1));
      right.push(evalWingtipWorld(ts, 1));
    }
    return { left, right };
  }, [t, trailOpacity, trailWindow]);

  // Dịch tâm vùng bóng đổ 4096px theo vùng tiêu điểm (chạy đà -> mũi tàu -> đội hình 15 chiếc trên sàn)
  const lookbackShadow = prog(t, 327.6, 329.2);
  const shadowFocusX = lerp(Math.min(HORNET_BOW_X + 15, Math.max(-10, p1.pos[0])), -32, lookbackShadow);

  return (
    <Stage
      {...STAGE_PRESETS.stormDawn}
      shadowArea={96}
      shadowCenter={[shadowFocusX, 20, 0]}
    >
      <Cam pos={cam.pos} look={cam.look} fov={cam.fov} roll={cam.roll} />

      {/* Đại dương bão bình minh Tây Thái Bình Dương — cùng pha tWave với shipPose */}
      <OceanSurface
        t={tWave}
        swell={SWELL}
        size={1300}
        seg={184}
        center={[60, 0]}
        palette="stormPacific"
      />

      {/* Sương bụi sóng bão tạt qua mũi clipper bow & hai bên mạn tàu */}
      <BowStormSpray t={t} tWave={tWave} />

      {/* Khối USS Hornet (CV-8) + 15 oanh tạc cơ B-25B nối hàng bám khít mặt sàn theo shipPose */}
      <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
        <USSHornet
          hullNumber="8"
          showLaunchLines
          flagWave={t * 1.35}
          aaYaw={0.12}
          elevatorDown={0}
        />

        <DeckCrewFigures t={t} />

        {/* 15 chiếc B-25B quá tải (#2..#16): chiếc #2 tiến vào vạch trắng xuất phát, 14 chiếc sau nối hàng tiến lên */}
        {FOLLOWING_BOMBERS.map((spec, idx) => {
          if (spec.num === 2) {
            // Chiếc #2 lăn bánh mượt từ vị trí chờ bên trái vào đúng tâm vạch sơn trắng xuất phát (x = -11.8, z = -0.85)
            const pTaxiX = prog(t, 324.0, 329.8);
            const pTaxiZ = prog(t, 324.0, 328.5);
            const x2 = lerp(spec.x0, -11.8, pTaxiX);
            const z2 = lerp(spec.z0, HORNET_B25_Z, pTaxiZ);
            const yaw2 = spec.yaw0 * (1 - pTaxiZ) - 0.13 * bump(t, 324.1, 4.3);
            const revFast = t > 327.7;
            return (
              <group key="b25-2" position={[x2, HORNET_DECK_Y, z2]} rotation={[0, yaw2, 0]}>
                <B25Mitchell
                  gear={1}
                  chained={false}
                  broomsticks
                  lowerTurret={false}
                  navLights
                  propFast={revFast}
                  propSpin={t * 16 + idx}
                  seed={spec.seed}
                />
              </group>
            );
          }

          // 14 chiếc còn lại (#3..#16) mở xích lần lượt và nhích dần lên theo đội hình so le 2 hàng
          const delay = 324.6 + idx * 0.23;
          const pAdvance = prog(t, delay, 330.6);
          const advanceDist = lerp(5.8, 2.2, idx / 14) * pAdvance;
          const xCur = spec.x0 + advanceDist;
          const stillChained = idx >= 6 && t < delay + 0.35;

          return (
            <group key={`b25-${spec.num}`} position={[xCur, HORNET_DECK_Y, spec.z0]} rotation={[0, spec.yaw0, 0]}>
              <B25Mitchell
                gear={1}
                chained={stillChained}
                broomsticks
                lowerTurret={false}
                brokenNose={false}
                navLights={spec.num === 3}
                propFast={spec.num <= 4 && t > 328.6}
                propSpin={t * 13.5 + idx * 1.9}
                seed={spec.seed}
              />
            </group>
          );
        })}
      </group>

      {/* Chiếc B-25B #1 của Trung tá Jimmy Doolittle: bám khít mặt sàn khi chạy đà (x <= 110 m) -> nhấc bổng góc +11° lên bầu trời bão */}
      <group position={p1.pos} rotation={p1.rot}>
        <B25Mitchell
          gear={p1.gear}
          propFast
          propSpin={p1.distRolled / (0.59 * 0.18)}
          navLights
          chained={false}
          broomsticks
          lowerTurret={false}
          turretYaw={0}
          turretPitch={0.08}
          seed={18}
        />
        {!p1.airborne && (
          <pointLight
            position={[3.4, 1.9, -2.95]}
            color={PAINT.thermiteHot}
            intensity={4.2}
            distance={14}
            decay={1.8}
          />
        )}
      </group>

      {/* Sương bụi nước mịn bị luồng gió cánh quạt thổi lùi sát mặt sàn khi chạy đà */}
      <DustTrail
        t={t}
        from={315.58}
        to={T_LIFTOFF}
        path={propWashPortPath}
        rate={22}
        size={0.85}
        color="#b8cad6"
        life={0.62}
      />
      <DustTrail
        t={t}
        from={315.58}
        to={T_LIFTOFF}
        path={propWashStbdPath}
        rate={22}
        size={0.85}
        color="#b8cad6"
        life={0.62}
      />

      {/* Hai dải xoáy hơi nước mảnh ~22 m bám theo đầu mút cánh khi nhấc bổng lên bầu trời bão */}
      {slidingTrails && (
        <>
          <Trail
            points={slidingTrails.left}
            upto={1}
            color="#bfd1df"
            width={0.028}
            opacity={trailOpacity}
            glow={false}
          />
          <Trail
            points={slidingTrails.right}
            upto={1}
            color="#bfd1df"
            width={0.028}
            opacity={trailOpacity}
            glow={false}
          />
        </>
      )}
    </Stage>
  );
};

export default C02S09;
