import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, Trail } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL3D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';
import { Kinzhal, PAC3, PatriotLauncher, PatriotRadar, patriotMuzzlePos } from '../local/models';

const X_AXIS = new THREE.Vector3(1, 0, 0);

const quatFromDir = (dx: number, dy: number, dz: number): THREE.Quaternion => {
  const dir = new THREE.Vector3(dx, dy, dz);
  if (dir.lengthSq() < 1e-8) return new THREE.Quaternion();
  dir.normalize();
  return new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir);
};

// ---------------- Địa hình bãi phẳng khẩu đội Patriot trên gò thảo nguyên bình minh ----------------
const H_BATTERY = heightField({
  seed: 606,
  amp: 4.6,
  scale: 115,
  flats: [
    [1, 0, 24, 0], // Bãi phẳng chuẩn y = 0 cho Đài Radar và 2 Bệ phóng Patriot
  ],
  add: (x, z) => {
    const dist = Math.hypot(x - 1, z);
    // Hạ nhẹ ra thung lũng xa xung quanh và nhô dãy đồi chân trời
    const valleyDrop = dist > 30 ? -2.4 * Math.min(1, (dist - 30) / 55) : 0;
    const farHills = 22 * Math.exp(-(((Math.hypot(x - 15, z + 15) - 165) / 48) ** 2));
    return valleyDrop + farHills;
  },
});

const avoidBatteryPad = (x: number, z: number) => {
  if (Math.hypot(x - 1, z) < 25.5) return true;
  // Chừa đường cấp phối dẫn vào trận địa từ phía -X
  if (x < 2 && x > -95 && Math.abs(z + 1.5) < 5.0) return true;
  return false;
};

const PAD_MAT = plain('#585a52', 0.94, 0.04);
const BERM_MAT = plain('#545943', 0.95, 0.02);
const CRATE_MAT = paint({
  color: PAL3D.usBase,
  camo: [PAL3D.usCamo1, PAL3D.usCamo2],
  camoScale: 1.2,
  wear: 0.2,
  dirt: 0.16,
  roughness: 0.68,
  metalness: 0.2,
  repeat: 1,
  seed: 66,
});

// ---------------- Cấu hình vị trí chuẩn của khẩu đội & quỹ đạo đánh chặn 1-1 ----------------
const RADAR_POS: V3 = [-5.2, 0, -1.0];
const RADAR_AZ = 0.08;

const LAUNCHER1_POS: V3 = [6.2, 0, 6.8];
const LAUNCHER1_AZ = 0.14;
const LAUNCHER1_ELEV = 39;

const LAUNCHER2_POS: V3 = [5.4, 0, -8.4];
const LAUNCHER2_AZ = -0.1;
const LAUNCHER2_ELEV = 37;

// Tọa độ miệng ống phóng số 0 của Bệ phóng 1 trong không gian thế giới
const MUZZLE_LOCAL = patriotMuzzlePos(LAUNCHER1_ELEV, LAUNCHER1_AZ, 0);
const MUZZLE_WORLD: V3 = [
  LAUNCHER1_POS[0] + MUZZLE_LOCAL[0],
  LAUNCHER1_POS[1] + MUZZLE_LOCAL[1],
  LAUNCHER1_POS[2] + MUZZLE_LOCAL[2],
];

const LAUNCH_DIR: V3 = [
  Math.cos((LAUNCHER1_ELEV * Math.PI) / 180) * Math.cos(LAUNCHER1_AZ),
  Math.sin((LAUNCHER1_ELEV * Math.PI) / 180),
  -Math.cos((LAUNCHER1_ELEV * Math.PI) / 180) * Math.sin(LAUNCHER1_AZ),
];

// Điểm tiêu diệt trực diện 1-1 trên bầu trời phía trước trận địa (+X, +Y)
// Đặt đường bay mục tiêu xiên ngang từ góc trên-phải (+X, +Y, +Z) vào KILL_POS để tách góc rõ rệt với camera
const KILL_POS: V3 = [42, 22.0, -2.5];
const THREAT_START: V3 = [76, 47.5, 48];
const THREAT_APPEAR = 87.6;

const PAC3_POINTS: V3[] = (() => {
  const n = 44;
  // Bézier bậc hai từ miệng ống phóng phóng theo đúng góc nâng ban đầu rồi bẻ lái khóa tâm KILL_POS
  const ctrl: V3 = [
    MUZZLE_WORLD[0] + LAUNCH_DIR[0] * 15,
    MUZZLE_WORLD[1] + LAUNCH_DIR[1] * 15,
    MUZZLE_WORLD[2] + LAUNCH_DIR[2] * 15,
  ];
  return Array.from({ length: n }, (_, i) => {
    const s = i / (n - 1);
    const u = 1 - s;
    return [
      u * u * MUZZLE_WORLD[0] + 2 * u * s * ctrl[0] + s * s * KILL_POS[0],
      u * u * MUZZLE_WORLD[1] + 2 * u * s * ctrl[1] + s * s * KILL_POS[1],
      u * u * MUZZLE_WORLD[2] + 2 * u * s * ctrl[2] + s * s * KILL_POS[2],
    ];
  });
})();

const THREAT_POINTS: V3[] = (() => {
  const n = 36;
  return Array.from({ length: n }, (_, i) => {
    const s = i / (n - 1);
    return [
      lerp(THREAT_START[0], KILL_POS[0], s),
      lerp(THREAT_START[1], KILL_POS[1], s),
      lerp(THREAT_START[2], KILL_POS[2], s),
    ];
  });
})();

const sampleCurve = (pts: V3[], p: number): { pos: V3; quat: THREE.Quaternion } => {
  const u = Math.max(0, Math.min(1, p)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(u));
  const f = u - i;
  const a = pts[i];
  const b = pts[i + 1];
  return {
    pos: [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)],
    quat: quatFromDir(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
  };
};

/** Lưới không gian 3 chiều Blender / chiến thuật mờ dần mượt sau 4.5s đầu. */
const TacticalConstructGrid: React.FC<{ opacity: number }> = ({ opacity }) => {
  const grid = useMemo(() => {
    const gh = new THREE.GridHelper(130, 52, '#38e2ff', '#256085');
    const mats = Array.isArray(gh.material) ? gh.material : [gh.material];
    for (const m of mats) {
      m.transparent = true;
      m.depthWrite = false;
      m.toneMapped = false;
    }
    return gh;
  }, []);

  if (opacity <= 0.004) return null;
  const mats = Array.isArray(grid.material) ? grid.material : [grid.material];
  for (const m of mats) {
    m.opacity = opacity;
  }

  return (
    <group position={[1, 0.09, 0]}>
      <primitive object={grid} />
      {/* Vòng chia độ phương vị 3D quanh tâm khẩu đội */}
      {[12, 22].map((r) => (
        <mesh key={r} position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[r - 0.08, r + 0.08, 72]} />
          <meshBasicMaterial
            color="#38e2ff"
            transparent
            opacity={opacity * 0.85}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
      {/* Trục chuẩn X / Z mảnh của không gian dựng hình 3 chiều */}
      <mesh position={[0, 0.03, 0]} geometry={rbox(130, 0.03, 0.09, 0.005)}>
        <meshBasicMaterial color="#ff5c6c" transparent opacity={opacity * 0.75} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.03, 0]} geometry={rbox(0.09, 0.03, 130, 0.005)}>
        <meshBasicMaterial color="#4be07b" transparent opacity={opacity * 0.75} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
};

const S06: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- Quỹ đạo Camera xoay trọn 360° quanh trận địa Patriot ----------------
  // Tính pha góc sao cho ở giai đoạn 90.2..93.5s camera ở góc sau-hông bệ phóng 1 (theta ~ +2.18 rad),
  // thấy đồng thời cả khẩu đội Patriot bên dưới và cú đánh chặn 1-1 trên bầu trời +X!
  const orbitP = prog(t, 77.25, 95.85, Easing.linear);
  const thetaStart = -2.64; // Đi trọn 2*PI rad (360°) về +3.64 rad
  const theta = thetaStart + orbitP * Math.PI * 2;

  const duelFocus = prog(t, 88.6, 91.2);
  const radius = lerp(25.5, 29.5, duelFocus);
  const camHeight = lerp(10.8, 7.6, duelFocus) + Math.sin(orbitP * Math.PI * 2) * 1.4;

  const camPos: V3 = [
    1.0 + Math.cos(theta) * radius,
    camHeight,
    Math.sin(theta) * radius,
  ];

  // Khi bước vào pha đối đầu 1-1 (88.6s+), nâng tâm nhìn từ khẩu đội lên khoảng giữa khẩu đội & bầu trời đánh chặn
  const camLook: V3 = [
    lerp(1.4, 22.5, duelFocus),
    lerp(2.5, 11.8, duelFocus),
    lerp(-0.4, 0.2, duelFocus),
  ];
  const fov = lerp(42, 48, duelFocus);

  // Hiệu ứng 4.5s đầu (77.25–82.0s): lưới dựng hình 3D mờ dần khi rừng thông và nắng bình minh hiện trọn vẹn
  const gridOpacity = 0.65 * (1 - prog(t, 80.1, 82.15));
  const envReveal = prog(t, 79.0, 81.85);
  const treeScaleY = lerp(0.01, 1.0, envReveal);
  const sunIntensity = lerp(2.15, STAGE_DAWN.sunIntensity ?? 2.85, envReveal);

  // Tiến độ đạn đánh chặn PAC-3 và mục tiêu đối phương
  const pacProg = prog(t, CUE.s06_duel_fire, CUE.s06_duel_kill, Easing.out(Easing.cubic));
  const pacSample = sampleCurve(PAC3_POINTS, pacProg);
  const pacTrailFade = t > CUE.s06_duel_kill ? Math.max(0, 1 - (t - CUE.s06_duel_kill) / 2.2) : 1;

  const threatProg = prog(t, THREAT_APPEAR, CUE.s06_duel_kill, Easing.linear);
  const threatSample = sampleCurve(THREAT_POINTS, threatProg);
  const threatTrailFade = t > CUE.s06_duel_kill ? Math.max(0, 1 - (t - CUE.s06_duel_kill) / 1.8) : 1;

  return (
    <Stage {...STAGE_DAWN} sunIntensity={sunIntensity} shadowArea={48} shadowCenter={[2, 0, 0]}>
      <Cam pos={camPos} look={camLook} fov={fov} />

      {/* Mặt đất thảo nguyên & lớp lưới không gian 3 chiều trong 4.5s đầu */}
      <Terrain h={H_BATTERY} size={460} seg={200} center={[0, 0]} colors={TERRAIN_STEPPE} grainRepeat={42} />
      <TacticalConstructGrid opacity={gridOpacity} />

      {/* Bãi đỗ cấp phối chiến thuật & công sự thấp quanh trận địa */}
      <mesh position={[1.5, 0.03, -0.5]} rotation={[-Math.PI / 2, 0, 0]} material={PAD_MAT} receiveShadow>
        <circleGeometry args={[18.5, 48]} />
      </mesh>
      <mesh position={[-38, 0.04, -1.5]} geometry={rbox(48, 0.06, 5.2, 0.02)} material={PAD_MAT} receiveShadow />

      {/* Bờ công sự bảo vệ & thùng tiếp đạn (hiện dần cùng bối cảnh thực địa) */}
      {envReveal > 0.02 && (
        <group scale={[1, envReveal, 1]}>
          <mesh position={[16.5, 0.55, 7.2]} rotation={[0, -0.18, 0]} geometry={rbox(1.6, 1.1, 10.5, 0.3)} material={BERM_MAT} castShadow receiveShadow />
          <mesh position={[15.5, 0.55, -8.6]} rotation={[0, 0.18, 0]} geometry={rbox(1.6, 1.1, 10.5, 0.3)} material={BERM_MAT} castShadow receiveShadow />
          <mesh position={[-2.2, 0.48, 8.8]} geometry={rbox(3.4, 0.96, 1.8, 0.08)} material={CRATE_MAT} castShadow receiveShadow />
          <mesh position={[-3.0, 0.48, -10.2]} geometry={rbox(3.4, 0.96, 1.8, 0.08)} material={CRATE_MAT} castShadow receiveShadow />
        </group>
      )}

      {/* Rừng thông & đá tự nhiên mọc lên khi hoàn tất dựng cảnh 3D (79.0–81.85s) */}
      {treeScaleY > 0.02 && (
        <group scale={[1, treeScaleY, 1]}>
          <Scatter
            kind="pine"
            count={230}
            area={[-175, -175, 175, 175]}
            h={H_BATTERY}
            seed={61}
            scale={[0.85, 1.4]}
            avoid={avoidBatteryPad}
            tint="#b5c6ae"
          />
          <Scatter
            kind="bush"
            count={130}
            area={[-130, -130, 130, 130]}
            h={H_BATTERY}
            seed={62}
            scale={[0.8, 1.35]}
            avoid={avoidBatteryPad}
          />
          <Scatter
            kind="rock"
            count={85}
            area={[-155, -155, 155, 155]}
            h={H_BATTERY}
            seed={63}
            scale={[0.65, 1.4]}
            avoid={avoidBatteryPad}
          />
        </group>
      )}

      {/* ---------------- Khẩu đội Patriot trung tâm (1 Đài Radar AN/MPQ-65 + 2 Bệ phóng M903) ---------------- */}
      <PatriotRadar
        position={RADAR_POS}
        azimuth={RADAR_AZ}
        showBeam={t > 84}
        beamAngle={[Math.sin(t * 2) * 0.35, 0.38]}
        activeGlow={0.75}
      />
      <PatriotLauncher
        position={LAUNCHER1_POS}
        azimuth={LAUNCHER1_AZ}
        elev={LAUNCHER1_ELEV}
        loadedCount={t >= CUE.s06_duel_fire ? 15 : 16}
      />
      <PatriotLauncher
        position={LAUNCHER2_POS}
        azimuth={LAUNCHER2_AZ}
        elev={LAUNCHER2_ELEV}
        loadedCount={16}
      />

      {/* ---------------- Cuộc đối đầu trực diện 1 chọi 1 (90.2s khai hỏa -> 93.1s tiêu diệt gọn) ---------------- */}
      {/* Mục tiêu đơn lẻ bay tới từ bầu trời phía trước */}
      {t >= THREAT_APPEAR && (
        <>
          {threatTrailFade > 0.02 && (
            <>
              <Trail
                points={THREAT_POINTS}
                upto={threatProg}
                color="#ff5526"
                width={0.28}
                opacity={0.88 * threatTrailFade}
              />
              <Trail
                points={THREAT_POINTS}
                upto={threatProg}
                color="#ffd2a6"
                width={0.1}
                opacity={0.9 * threatTrailFade}
              />
            </>
          )}
          {t < CUE.s06_duel_kill && (
            <group position={threatSample.pos} quaternion={threatSample.quat} scale={1.55}>
              <Kinzhal heatGlow={0.92} plume={0.55} />
            </group>
          )}
        </>
      )}

      {/* Khai hỏa PAC-3 từ bệ phóng số 1 (cỡ khói đầu ống gọn gàng không che bầu trời) */}
      <MuzzleBlast t={t} at={CUE.s06_duel_fire} pos={MUZZLE_WORLD} dir={LAUNCH_DIR} size={1.08} seed={6} />

      {t >= CUE.s06_duel_fire && (
        <>
          {pacTrailFade > 0.02 && (
            <>
              <Trail
                points={PAC3_POINTS}
                upto={pacProg}
                color="#ffb347"
                width={0.25}
                opacity={0.92 * pacTrailFade}
              />
              <Trail
                points={PAC3_POINTS}
                upto={pacProg}
                color="#fff6d6"
                width={0.1}
                opacity={0.96 * pacTrailFade}
              />
            </>
          )}
          {t < CUE.s06_duel_kill && (
            <group position={pacSample.pos} quaternion={pacSample.quat} scale={1.55}>
              <PAC3 plume={1} />
            </group>
          )}
        </>
      )}

      {/* Vụ nổ tiêu diệt gọn mục tiêu trên không tại CUE.s06_duel_kill (93.1s) */}
      <Explosion
        t={t}
        at={CUE.s06_duel_kill}
        pos={KILL_POS}
        size={7.8}
        seed={66}
        smokeLife={4.5}
        smoke="#87827a"
      />
    </Stage>
  );
};

export default S06;
