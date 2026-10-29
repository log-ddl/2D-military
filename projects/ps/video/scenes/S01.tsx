import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { lerp, prog, rnd } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, ridgeX, Scatter, Terrain } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL3D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';
import { Kinzhal, PAC2, PatriotLauncher, patriotMuzzlePos } from '../local/models';

// ---------------- Địa hình đồi thảo nguyên bình minh (cấp module) ----------------
const LAUNCH_ELEV = 38;
const LAUNCH_RAD = (LAUNCH_ELEV * Math.PI) / 180;
const LAUNCH_DIR: V3 = [Math.cos(LAUNCH_RAD), Math.sin(LAUNCH_RAD), 0];

const H_FIELD = heightField({
  seed: 101,
  amp: 7.5,
  scale: 135,
  flats: [
    [0, 0, 17, 4.2],
    [-20, -24, 12, 2.6],
  ],
  add: (x, z) =>
    ridgeX(-115, 16, 62)(x, z) +
    ridgeX(210, 11, 85)(x, z) -
    3.2 * Math.exp(-(((x - 65) / 70) ** 2)) +
    2.4 * Math.sin(z * 0.018),
});

const PAD_Y = H_FIELD(0, 0);
const PAD2_Y = H_FIELD(-20, -24);

const MUZZLE_LOCAL = patriotMuzzlePos(LAUNCH_ELEV, 0, 0);
const MUZZLE_WORLD: V3 = [
  MUZZLE_LOCAL[0],
  PAD_Y + MUZZLE_LOCAL[1],
  MUZZLE_LOCAL[2],
];

// Quỹ đạo PAC-2 từ miệng ống phóng (4.82s) lên điểm kích nổ tiếp cận (11.35s)
const PAC2_P0 = new THREE.Vector3(...MUZZLE_WORLD);
const PAC2_P1 = new THREE.Vector3(
  MUZZLE_WORLD[0] + LAUNCH_DIR[0] * 58,
  MUZZLE_WORLD[1] + LAUNCH_DIR[1] * 58,
  MUZZLE_WORLD[2],
);
const PAC2_P2 = new THREE.Vector3(114, 106, 1.9);
const PAC2_BLAST_VEC = new THREE.Vector3(174, 142, 3.1);
const PAC2_BLAST_POS: V3 = [PAC2_BLAST_VEC.x, PAC2_BLAST_VEC.y, PAC2_BLAST_VEC.z];

function evalPac2Pos(u: number): THREE.Vector3 {
  const c = Math.max(0, Math.min(1, u));
  const m = 1 - c;
  return new THREE.Vector3(
    m * m * m * PAC2_P0.x + 3 * m * m * c * PAC2_P1.x + 3 * m * c * c * PAC2_P2.x + c * c * c * PAC2_BLAST_VEC.x,
    m * m * m * PAC2_P0.y + 3 * m * m * c * PAC2_P1.y + 3 * m * c * c * PAC2_P2.y + c * c * c * PAC2_BLAST_VEC.y,
    m * m * m * PAC2_P0.z + 3 * m * m * c * PAC2_P1.z + 3 * m * c * c * PAC2_P2.z + c * c * c * PAC2_BLAST_VEC.z,
  );
}

const PAC2_CURVE_PTS: V3[] = Array.from({ length: 84 }, (_, i) => {
  const v = evalPac2Pos(i / 83);
  return [v.x, v.y, v.z];
});

// Quỹ đạo siêu vượt âm của Kinzhal: bổ nhào góc gắt xuống thảo nguyên, tại 11.35s bay cách điểm nổ PAC-2 đúng ~5.6 m ngang/trước
// rồi xuyên thẳng qua rìa khói mảnh văng tiếp tục bổ nhào xuống tầng thấp.
const KIN_AT_BLAST = new THREE.Vector3(175.3, 143.2, -2.2); // cách PAC2_BLAST_VEC (174, 142, 3.1) = 5.59 m
const KIN_DIR_VEC = new THREE.Vector3(-0.82, -0.55, 0.14).normalize();
const KIN_SPEED = 24;
const KIN_T_START = 7.0;
const KIN_T_END = 16.9;

function evalKinzhalPos(t: number): THREE.Vector3 {
  const dt = t - CUE.s01_prox_blast;
  return KIN_AT_BLAST.clone().addScaledVector(KIN_DIR_VEC, dt * KIN_SPEED);
}

const KIN_CURVE_PTS: V3[] = Array.from({ length: 80 }, (_, i) => {
  const tk = lerp(KIN_T_START, KIN_T_END, i / 79);
  const v = evalKinzhalPos(tk);
  return [v.x, v.y, v.z];
});

/** Xoay mô hình tên lửa (mũi gốc +X, lưng +Y) dọc theo đúng vector vận tốc `dir` mà không bị lật ngửa bụng. */
function missileQuat(dir: THREE.Vector3): THREE.Quaternion {
  const x = dir.clone().normalize();
  const up = Math.abs(x.y) > 0.96 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0);
  const z = new THREE.Vector3().crossVectors(x, up).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

const KIN_QUAT = missileQuat(KIN_DIR_VEC);

const avoidPads = (x: number, z: number) =>
  Math.hypot(x, z) < 21 || Math.hypot(x + 20, z + 24) < 15;

/** Chùm tia mảnh văng đầu đạn phân mảnh nổ gần trên không (trượt sau/ngang mục tiêu). */
const AirFragBurst: React.FC<{ t: number; at: number; pos: V3 }> = ({ t, at, pos }) => {
  const dt = t - at;
  const rays = useMemo(
    () =>
      Array.from({ length: 30 }, (_, i) => {
        const theta = rnd(i * 3 + 1) * Math.PI * 2;
        const phi = (rnd(i * 3 + 2) - 0.5) * Math.PI * 0.85;
        const dx = Math.cos(phi) * Math.cos(theta);
        const dy = Math.sin(phi);
        const dz = Math.cos(phi) * Math.sin(theta);
        const d = new THREE.Vector3(dx, dy, dz).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
        const spd = 22 + rnd(i * 3 + 3) * 20;
        return { d, q, spd };
      }),
    [],
  );

  if (dt < 0 || dt > 1.0) return null;
  const fade = Math.max(0, 1 - dt / 1.0);
  const shockScale = 1.2 + (1 - (1 - Math.min(1, dt / 0.6)) ** 3) * 10.0;

  return (
    <group position={pos}>
      {dt < 0.6 && (
        <mesh scale={shockScale}>
          <sphereGeometry args={[1, 22, 16]} />
          <meshBasicMaterial
            color="#ffd384"
            transparent
            opacity={0.36 * (1 - dt / 0.6)}
            wireframe
            toneMapped={false}
          />
        </mesh>
      )}
      {rays.map((r, idx) => {
        const dist = 0.8 + r.spd * dt;
        const p: V3 = [r.d.x * dist, r.d.y * dist, r.d.z * dist];
        return (
          <group key={idx} position={p} quaternion={r.q}>
            <mesh scale={[1.2 * fade + 0.25, 0.075, 0.075]}>
              <boxGeometry args={[1, 1, 1]} />
              <meshBasicMaterial color={dt < 0.28 ? '#fff3c4' : PAL3D.flame} transparent opacity={fade} toneMapped={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const S01: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ bay của PAC-2 (4.82s -> 11.35s)
  const rawPac2 = Math.max(0, Math.min(1, (t - CUE.s01_pac2_fire) / (CUE.s01_prox_blast - CUE.s01_pac2_fire)));
  const uPac2 = 0.42 * rawPac2 + 0.58 * rawPac2 * rawPac2;
  const pac2Fired = t >= CUE.s01_pac2_fire;
  const pac2Alive = pac2Fired && t < CUE.s01_prox_blast;

  const pac2Vec = evalPac2Pos(uPac2);
  const pac2Tan = evalPac2Pos(Math.min(1, uPac2 + 0.008))
    .sub(evalPac2Pos(Math.max(0, uPac2 - 0.008)))
    .normalize();
  const pac2Quat = missileQuat(pac2Tan);

  // Tiến độ Kinzhal lao xuống (7.0s -> 16.9s)
  const kinVisible = t >= KIN_T_START;
  const kinVec = evalKinzhalPos(t);
  const kinTrailUpto = Math.max(0, Math.min(1, (t - KIN_T_START) / (KIN_T_END - KIN_T_START)));

  // ---------------- Điều phối Camera 3 giai đoạn (luôn cận & lệch hẳn trục <Trail>) ----------------
  // Giai đoạn A (0.00..4.82s): Đẩy máy rõ rệt từ đại cảnh góc thấp vào cận giàn 4x4 của Patriot M903
  const pIntro = prog(t, 0, CUE.s01_pac2_fire, Easing.inOut(Easing.cubic));
  const camGroundPos = new THREE.Vector3(
    lerp(13.2, 8.6, pIntro),
    PAD_Y + lerp(1.45, 2.55, pIntro),
    lerp(11.4, 6.4, pIntro),
  );
  const camGroundLook = new THREE.Vector3(
    lerp(-1.2, 0.45, pIntro),
    PAD_Y + lerp(2.5, 3.45, pIntro),
    lerp(-0.4, 0.3, pIntro),
  );

  // Giai đoạn B (4.82..11.35s): Bám sát thân PAC-2 (6.0 m) rồi mở nhẹ đón Kinzhal từ 10.1s
  const pMeet = prog(t, 10.1, CUE.s01_prox_blast, Easing.inOut(Easing.quad));
  const camPacPos = new THREE.Vector3(
    pac2Vec.x + lerp(2.1, -1.8, pMeet),
    pac2Vec.y + lerp(1.05, 2.2, pMeet),
    pac2Vec.z + lerp(5.7, 11.4, pMeet),
  );
  const camPacLook = new THREE.Vector3(
    lerp(pac2Vec.x + 0.25, (pac2Vec.x + kinVec.x) * 0.5, pMeet),
    lerp(pac2Vec.y + 0.1, (pac2Vec.y + kinVec.y) * 0.5 + 1.2, pMeet),
    lerp(pac2Vec.z, (pac2Vec.z + kinVec.z) * 0.5, pMeet),
  );

  // Giai đoạn C (11.35..16.50s): Giữ trọn toàn thân Kinzhal (7.2 m) trong khung cùng đám khói nổ hụt phía sau rồi bổ nhào trên đồi thông
  const pBlastHold = 1 - prog(t, 12.2, 14.9, Easing.inOut(Easing.quad));
  const pDive = prog(t, CUE.s01_prox_blast, 16.5, Easing.inOut(Easing.quad));
  const camKinPos = new THREE.Vector3(
    kinVec.x + lerp(-7.4, -6.2, pDive),
    kinVec.y + lerp(0.4, 3.2, pDive),
    kinVec.z + lerp(11.6, 9.6, pDive),
  );
  const camKinLook = new THREE.Vector3(
    kinVec.x + lerp(1.5, -0.2, 1 - pBlastHold),
    kinVec.y + lerp(1.35, -0.35, 1 - pBlastHold),
    kinVec.z + lerp(0.5, 0.0, 1 - pBlastHold),
  );

  const wToPac = prog(t, CUE.s01_pac2_fire, 6.0, Easing.inOut(Easing.cubic));
  const wToKin = prog(t, 11.08, 12.05, Easing.inOut(Easing.cubic));

  const camPosVec = camGroundPos.clone().lerp(camPacPos, wToPac).lerp(camKinPos, wToKin);
  const camLookVec = camGroundLook.clone().lerp(camPacLook, wToPac).lerp(camKinLook, wToKin);

  const shakeAmt =
    0.18 * Math.max(0, 1 - Math.abs(t - CUE.s01_pac2_fire) / 0.35) +
    0.34 * Math.max(0, 1 - Math.abs(t - CUE.s01_prox_blast) / 0.45);
  const camPos: V3 = [
    camPosVec.x + Math.sin(t * 47) * shakeAmt,
    camPosVec.y + Math.cos(t * 53) * shakeAmt,
    camPosVec.z,
  ];
  const camLook: V3 = [camLookVec.x, camLookVec.y, camLookVec.z];

  return (
    <AbsoluteFill>
      <Stage {...STAGE_DAWN} shadowCenter={[0, PAD_Y, 0]}>
        <Cam pos={camPos} look={camLook} fov={39} />

        {/* Đồi thảo nguyên Đông Âu bình minh lạnh + thông, bụi, đá */}
        <Terrain h={H_FIELD} size={860} seg={220} center={[85, 0]} colors={TERRAIN_STEPPE} />
        <Scatter kind="pine" count={160} area={[-180, -190, 340, 190]} h={H_FIELD} seed={11} scale={[0.85, 1.45]} avoid={avoidPads} tint="#cfdcd0" />
        <Scatter kind="bush" count={220} area={[-140, -150, 280, 150]} h={H_FIELD} seed={23} scale={[0.7, 1.35]} avoid={avoidPads} tint="#c6d4c2" />
        <Scatter kind="rock" count={95} area={[-150, -150, 280, 150]} h={H_FIELD} seed={37} scale={[0.6, 1.4]} avoid={avoidPads} />

        {/* Bệ phóng Patriot M903 chính (16 -> 15 đạn lúc 4.82s) + bệ phóng phụ phía hậu cảnh */}
        <PatriotLauncher
          position={[0, PAD_Y, 0]}
          elev={LAUNCH_ELEV}
          azimuth={0}
          loadedCount={pac2Fired ? 15 : 16}
        />
        <PatriotLauncher
          position={[-20, PAD2_Y, -24]}
          rotation={[0, 0.14, 0]}
          elev={LAUNCH_ELEV}
          azimuth={0}
          loadedCount={16}
        />

        {/* Lửa + khói bung khỏi miệng ống số 0 đúng mốc 4.82s */}
        <MuzzleBlast
          t={t}
          at={CUE.s01_pac2_fire}
          pos={MUZZLE_WORLD}
          dir={LAUNCH_DIR}
          size={2.35}
          seed={5}
        />

        {/* Quả tên lửa PAC-2 đời cũ vọt lên kéo vệt sáng cam-trắng */}
        {pac2Fired && (
          <Trail
            points={PAC2_CURVE_PTS}
            upto={t >= CUE.s01_prox_blast ? 1 : uPac2}
            color="#ffd18a"
            width={0.22}
            opacity={t >= CUE.s01_prox_blast ? Math.max(0.18, 0.82 - (t - CUE.s01_prox_blast) * 0.14) : 0.88}
          />
        )}
        {pac2Alive && (
          <group position={[pac2Vec.x, pac2Vec.y, pac2Vec.z]} quaternion={pac2Quat}>
            <PAC2 plume={1} />
          </group>
        )}

        {/* Tên lửa siêu vượt âm Kinzhal bổ nhào với mũi nung nóng plasma đỏ cam */}
        {kinVisible && (
          <>
            <Trail
              points={KIN_CURVE_PTS}
              upto={kinTrailUpto}
              color="#ff6b2b"
              width={0.28}
              opacity={0.92}
            />
            <group position={[kinVec.x, kinVec.y, kinVec.z]} quaternion={KIN_QUAT}>
              <Kinzhal plume={0.78} heatGlow={0.6} />
            </group>
          </>
        )}

        {/* Ngòi nổ tiếp cận PAC-2 phát nổ bên cạnh (~5.6 m sau/ngang) Kinzhal lúc 11.35s nhưng không chặn nổi */}
        <Explosion
          t={t}
          at={CUE.s01_prox_blast}
          pos={[PAC2_BLAST_POS[0], PAC2_BLAST_POS[1] - 3.2, PAC2_BLAST_POS[2]]}
          size={4.6}
          seed={9}
          smokeLife={6.4}
          smoke="#56504a"
        />
        <AirFragBurst t={t} at={CUE.s01_prox_blast} pos={PAC2_BLAST_POS} />
      </Stage>

      <Label t={t} text="PAC-2" x={960} y={150} from={CUE.s01_pac2_label} until={9.6} />
    </AbsoluteFill>
  );
};

export default S01;
