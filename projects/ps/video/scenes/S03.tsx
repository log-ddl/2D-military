import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog } from '@kit/theme';
import { useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, ridgeX, Terrain } from '@lib/3d/terrain';
import { Explosion, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { STAGE_STRATO, TERRAIN_STEPPE } from '../local/palette';
import { Kinzhal, PAC3 } from '../local/models';

// ---------------- Dải núi đồi mờ sương nhìn từ tầng bình lưu (~18-25 km) ----------------
const STRATO_TERRAIN = heightField({
  seed: 303,
  amp: 26,
  scale: 210,
  add: (x, z) =>
    ridgeX(180, 32, 140)(x, z) +
    ridgeX(580, 38, 170)(x, z) +
    14 * Math.sin(z * 0.011 + x * 0.004),
});

// Đặt độ cao ALT_Y = 350 m để dải núi ở y = 0..45 nằm đúng trong vùng sương mù [260, 1100] của STAGE_STRATO,
// vừa tạo cảm giác độ cao 20 km chân thực vừa giúp nền trời cô-ban thẫm làm nổi bật ngọn lửa ngang ACM!
const ALT_Y = 350;
const CLIMB_SLOPE = 0.07; // góc ngóc nhẹ +4° lên tầng bình lưu
const PAC_SPEED = 42;
const T_BASE = CUE.s03_start;
const HIT_X = (CUE.s03_hit - T_BASE) * PAC_SPEED; // 514.5 m
const HIT_Y = ALT_Y + (CUE.s03_hit - T_BASE) * PAC_SPEED * CLIMB_SLOPE;
const HIT_POS: V3 = [HIT_X, HIT_Y, 0];

/** Độ lệch ngang/đứng (y, z) của PAC-3 trước và sau 3 cú giật động cơ đẩy ngang ACM để khóa chết tâm Kinzhal. */
function pac3LateralOffset(t: number): [number, number] {
  const s1 = prog(t, CUE.s03_acm_1, CUE.s03_acm_1 + 0.36, Easing.out(Easing.cubic));
  const s2 = prog(t, CUE.s03_acm_2, CUE.s03_acm_2 + 0.36, Easing.out(Easing.cubic));
  const s3 = prog(t, CUE.s03_acm_3, CUE.s03_acm_3 + 0.36, Easing.out(Easing.cubic));

  let dy = 0.92;
  let dz = -1.12;
  dy = lerp(dy, -0.54, s1);
  dz = lerp(dz, 0.68, s1);
  dy = lerp(dy, 0.38, s2);
  dz = lerp(dz, -0.44, s2);
  dy = lerp(dy, 0.0, s3);
  dz = lerp(dz, 0.0, s3);
  return [dy, dz];
}

function evalPac3Strato(t: number): THREE.Vector3 {
  const tc = Math.min(t, CUE.s03_hit);
  const x = (tc - T_BASE) * PAC_SPEED;
  const yBase = ALT_Y + x * CLIMB_SLOPE;
  const [dy, dz] = pac3LateralOffset(tc);
  return new THREE.Vector3(x, yBase + dy, dz);
}

const PAC3_TRAIL_PTS: V3[] = Array.from({ length: 110 }, (_, i) => {
  const tk = lerp(T_BASE - 1.4, CUE.s03_hit, i / 109);
  const v = evalPac3Strato(tk);
  return [v.x, v.y, v.z];
});

// Kinzhal lao ngược chiều (-X) thẳng vào điểm hội tụ HIT_POS lúc 41.25s
const KIN_SPEED = 56;
function evalKinzhalStrato(t: number): THREE.Vector3 {
  const dt = CUE.s03_hit - t;
  return new THREE.Vector3(HIT_X + dt * KIN_SPEED, HIT_Y + dt * 3.2, 0);
}

const KIN_TRAIL_PTS: V3[] = Array.from({ length: 72 }, (_, i) => {
  const tk = lerp(34.5, CUE.s03_hit, i / 71);
  const v = evalKinzhalStrato(tk);
  return [v.x, v.y, v.z];
});

function missileQuat(dir: THREE.Vector3): THREE.Quaternion {
  const x = dir.clone().normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const z = new THREE.Vector3().crossVectors(x, up).normalize();
  const y = new THREE.Vector3().crossVectors(z, x).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

const KIN_DIR = new THREE.Vector3(-KIN_SPEED, -3.2, 0).normalize();
const KIN_QUAT = missileQuat(KIN_DIR);

const S03: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const alive = t < CUE.s03_hit;
  const pacPos = evalPac3Strato(t);

  const pAhead = evalPac3Strato(Math.min(CUE.s03_hit, t + 0.05));
  const pBehind = evalPac3Strato(t - 0.05);
  const pacDir = pAhead.sub(pBehind).normalize();

  // Kích hoạt 3 đợt phụt động cơ đẩy ngang ACM tại 3 mốc CUE (bump(t, cue, 0.35))
  const b1 = bump(t, CUE.s03_acm_1, 0.35);
  const b2 = bump(t, CUE.s03_acm_2, 0.35);
  const b3 = bump(t, CUE.s03_acm_3, 0.35);

  let acmFire = 0;
  let acmAngle = 0;
  if (b1 >= b2 && b1 >= b3 && b1 > 0.001) {
    acmFire = b1 * 1.25;
    acmAngle = -0.38;
  } else if (b2 >= b1 && b2 >= b3 && b2 > 0.001) {
    acmFire = b2 * 1.25;
    acmAngle = 2.52;
  } else if (b3 > 0.001) {
    acmFire = b3 * 1.3;
    acmAngle = 0.22;
  }

  const noseSnapDir = pacDir
    .clone()
    .add(
      new THREE.Vector3(
        0,
        -0.08 * b1 + 0.07 * b2 - 0.065 * b3,
        0.09 * b1 - 0.08 * b2 - 0.048 * b3,
      ),
    )
    .normalize();
  const pacQuat = missileQuat(noseSnapDir);

  const pacTrailUpto = Math.max(0.02, Math.min(1, (t - (T_BASE - 1.4)) / (CUE.s03_hit - (T_BASE - 1.4))));

  const kinPos = evalKinzhalStrato(t);
  const kinVisible = t >= 34.5 && alive;
  const kinTrailUpto = Math.max(0, Math.min(1, (t - 34.5) / (CUE.s03_hit - 34.5)));

  // ---------------- Điều phối Camera cận cảnh 3/4 mũi PAC-3 (cách thân 3.7..4.6 m) ----------------
  // Giai đoạn 1 (29.0..39.3s): Lướt dọc từ ngang hông-trước tiến sát vào 3/4 mũi PAC-3 để thấy rõ 180 lỗ đồng ACM
  // đồng thời hạ nhẹ cao độ máy để nền trời xanh cô-ban thẫm làm nổi tia phụt ACM và dải đồi núi mờ sương trôi ở 1/3 dưới khung!
  const pGlide = prog(t, T_BASE, 34.0, Easing.inOut(Easing.cubic));
  const lagPos = evalPac3Strato(Math.max(T_BASE, t - 0.14));
  const baseTrack = new THREE.Vector3(pacPos.x, lerp(pacPos.y, lagPos.y, 0.65), lerp(pacPos.z, lagPos.z, 0.65));

  const closeCamPos = new THREE.Vector3(
    baseTrack.x + lerp(1.6, 3.35, pGlide),
    baseTrack.y + lerp(0.55, 0.28, pGlide),
    baseTrack.z + lerp(4.15, 2.95, pGlide),
  );
  const closeCamLook = new THREE.Vector3(
    pacPos.x + lerp(0.45, 1.25, pGlide),
    pacPos.y + lerp(-0.18, -0.04, pGlide),
    pacPos.z - 0.12,
  );

  // Giai đoạn 2 (39.3..42.05s): Mở rộng mượt ra cự ly ~34 m ngang-sau để đón Kinzhal lao vút tới và đóng khung trọn cầu lửa Explosion size=6.5!
  const pInterceptView = prog(t, 39.3, 40.85, Easing.inOut(Easing.cubic));
  const pBlastPull = prog(t, 40.85, 42.05, Easing.out(Easing.quad));
  const interceptRefX = Math.min(pacPos.x, HIT_X - 2.5);
  const duelCamPos = new THREE.Vector3(
    interceptRefX - lerp(6.0, 8.5, pBlastPull),
    HIT_Y + lerp(1.8, 3.2, pBlastPull),
    lerp(18.0, 35.0, pBlastPull),
  );
  const duelCamLook = new THREE.Vector3(
    lerp(pacPos.x + 12, HIT_X, prog(t, 39.8, CUE.s03_hit)),
    HIT_Y + 0.8,
    0,
  );

  const camPosVec = closeCamPos.clone().lerp(duelCamPos, pInterceptView);
  const camLookVec = closeCamLook.clone().lerp(duelCamLook, pInterceptView);

  const hitShake = 0.55 * Math.max(0, 1 - Math.abs(t - CUE.s03_hit) / 0.45);
  const camPos: V3 = [
    camPosVec.x + Math.sin(t * 59) * hitShake,
    camPosVec.y + Math.cos(t * 51) * hitShake,
    camPosVec.z,
  ];
  const camLook: V3 = [camLookVec.x, camLookVec.y, camLookVec.z];

  return (
    <AbsoluteFill>
      <Stage {...STAGE_STRATO} shadowCenter={[pacPos.x, pacPos.y, 0]}>
        <Cam pos={camPos} look={camLook} fov={37} />

        {/* Dải đồi núi mờ sương trôi nhanh phía dưới xa (~350 m dưới cánh, nằm đúng dải fog tầng bình lưu) */}
        <Terrain h={STRATO_TERRAIN} size={2200} seg={170} center={[360, -120]} colors={TERRAIN_STEPPE} />

        <Trail
          points={PAC3_TRAIL_PTS}
          upto={alive ? pacTrailUpto : 1}
          color="#ffd494"
          width={0.15}
          opacity={alive ? 0.88 : Math.max(0.22, 0.86 - (t - CUE.s03_hit) * 0.42)}
        />

        {alive && (
          <group position={[pacPos.x, pacPos.y, pacPos.z]} quaternion={pacQuat}>
            <PAC3 plume={0.95} acmFire={acmFire} acmAngle={acmAngle} />
          </group>
        )}

        {kinVisible && (
          <>
            <Trail
              points={KIN_TRAIL_PTS}
              upto={kinTrailUpto}
              color="#ff5e24"
              width={0.28}
              opacity={0.92}
            />
            <group position={[kinPos.x, kinPos.y, kinPos.z]} quaternion={KIN_QUAT}>
              <Kinzhal plume={0.85} heatGlow={0.85} />
            </group>
          </>
        )}

        {/* Vụ nổ động năng trực diện lúc 41.25s nhìn rõ trọn cầu lửa, mảnh văng và hai vệt đạn giao nhau */}
        <Explosion
          t={t}
          at={CUE.s03_hit}
          pos={[HIT_POS[0], HIT_POS[1] - 3.6, HIT_POS[2]]}
          size={6.5}
          seed={17}
          smokeLife={4.5}
          smoke="#5c6674"
        />
      </Stage>
    </AbsoluteFill>
  );
};

export default S03;
