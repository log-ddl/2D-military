// Cảnh S05 (35.95 - 45.20s, Thuần 3D):
// Đại cảnh thung lũng nhìn ngang-chéo mở toàn bộ quỹ đạo tên lửa đột kích nóc vọt lên đỉnh cao 150m
// rồi uốn gập bổ nhào thẳng đứng 90° xuống sát nóc tháp pháo MBT.
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField, ridgeX } from '@lib/3d/terrain';
import { DustTrail, MuzzleBlast, Trail } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { STAGE_DUSK, STEPPE_COLORS } from '../local/palette';
import { MBT } from '../local/models/MBT';
import { TopAttackMissile } from '../local/models/TopAttackMissile';

// Địa hình thảo nguyên thung lũng tạo ở cấp module:
// - Bên trái (x ≈ -34): gờ đồi công sự thấp cao ~7.2m nơi đặt tổ hợp tên lửa chống tăng
// - Bên phải (x ≈ 6..34): bãi đường đất phẳng (y = 0) nơi MBT hành tiến quay mặt giáp dày về bên trái
// - Phía xa (z < -65): dãy đồi thảo nguyên tạo chiều sâu chân trời hoàng hôn
const H_RANGE = heightField({
  seed: 53,
  amp: 3.2,
  scale: 118,
  flats: [
    [24, 0, 15, 0],
    [10, 0, 12, 0],
    [-34, 0, 4.2, 7.2],
  ],
  add: (x, z) =>
    ridgeX(-37, 7.4, 13)(x, z) +
    ridgeX(-86, 17.5, 26)(x, z) +
    ridgeX(88, 10.5, 28)(x, z) +
    15.5 * Math.exp(-(((z + 102) / 36) ** 2)),
});

const AVOID_ROAD_AND_CAM = (x: number, z: number) => {
  if (Math.abs(z) < 9.5 && x > -8 && x < 42) return true;
  if (Math.hypot(x + 34, z) < 3.8) return true;
  if (z > 3.2 && x > -18 && x < 40) return true;
  return false;
};

// Quỹ đạo Bezier 2 chặng nối trơn C1 cho tên lửa đột kích nóc:
// Chặng 1 (u: 0 -> 0.5): Phóng xiên gấp ~45° từ gờ đồi trái [-33.3, 8.65, 0] vọt lên đỉnh cao 42m (biểu diễn 150m).
// Chặng 2 (u: 0.5 -> 1.0): Uốn gập qua đỉnh [20.6, 42, 0] rồi bổ nhào thẳng đứng 90° (-Y) xuống sát nóc tháp pháo [20.6, 3.02, 0].
const P0: V3 = [-33.3, 8.65, 0];
const P1: V3 = [-18.5, 26.8, 0];
const P2: V3 = [6.2, 42.0, 0];
const P3: V3 = [13.4, 42.0, 0];

const Q0: V3 = P3;
const Q1: V3 = [20.6, 42.0, 0];
const Q2: V3 = [20.6, 26.0, 0];
const Q3: V3 = [20.6, 3.02, 0];

const cubicBezier = (a: V3, b: V3, c: V3, d: V3, s: number): V3 => {
  const m = 1 - s;
  const m2 = m * m;
  const s2 = s * s;
  const w0 = m2 * m;
  const w1 = 3 * m2 * s;
  const w2 = 3 * m * s2;
  const w3 = s2 * s;
  return [
    w0 * a[0] + w1 * b[0] + w2 * c[0] + w3 * d[0],
    w0 * a[1] + w1 * b[1] + w2 * c[1] + w3 * d[1],
    w0 * a[2] + w1 * b[2] + w2 * c[2] + w3 * d[2],
  ];
};

const evalTrajectory = (u: number): V3 => {
  const c = Math.max(0, Math.min(1, u));
  if (c <= 0.5) return cubicBezier(P0, P1, P2, P3, c * 2);
  return cubicBezier(Q0, Q1, Q2, Q3, (c - 0.5) * 2);
};

const CURVE_SAMPLE_N = 360;
const CURVE_PTS: V3[] = Array.from({ length: CURVE_SAMPLE_N }, (_, i) =>
  evalTrajectory(i / (CURVE_SAMPLE_N - 1)),
);

const tankXAt = (time: number) => {
  const p = prog(time, 35.75, 45.25, (x) => x);
  return lerp(24.6, 20.8, p);
};

/** Ụ công sự thấp + ống phóng ATGM trên gờ đồi bên trái. */
const LaunchEmplacement: React.FC = () => {
  const matSandbag = useMemo(
    () => paint({ color: '#8f8162', camo: ['#6e634b', '#ab9b78'], wear: 0.35, dirt: 0.45, roughness: 0.9, metalness: 0.05, seed: 31 }),
    [],
  );
  const matTube = useMemo(
    () => paint({ color: '#414a3b', camo: ['#2d3429', '#5d6652'], wear: 0.25, dirt: 0.3, roughness: 0.62, metalness: 0.3, seed: 37 }),
    [],
  );
  const matTripod = plain('#232724', 0.6, 0.5);

  return (
    <group position={[-34.0, 7.2, 0]}>
      {[-0.9, -0.3, 0.3, 0.9].map((z, i) => (
        <React.Fragment key={i}>
          <mesh geometry={rbox(0.55, 0.32, 0.56, 0.08)} material={matSandbag} position={[0.65, 0.16, z]} rotation={[0, (i - 1.5) * 0.12, 0]} castShadow receiveShadow />
          <mesh geometry={rbox(0.5, 0.28, 0.52, 0.08)} material={matSandbag} position={[0.6, 0.44, z * 0.85]} rotation={[0, (1.5 - i) * 0.1, 0]} castShadow receiveShadow />
        </React.Fragment>
      ))}
      <group position={[0.05, 0.72, 0]}>
        {[
          [0.32, -0.36, 0.28, -0.35],
          [-0.32, -0.36, -0.25, -0.35],
          [0.12, -0.36, 0.36, 0.35],
        ].map(([px, py, pz, rz], idx) => (
          <mesh key={idx} position={[px, py, pz]} rotation={[pz * 0.7, 0, rz]} material={matTripod} castShadow>
            <cylinderGeometry args={[0.025, 0.03, 0.88, 8]} />
          </mesh>
        ))}
        <group position={[0, 0.22, 0]} rotation={[0, 0, 0.76]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={matTube} castShadow>
            <cylinderGeometry args={[0.13, 0.13, 1.35, 18]} />
          </mesh>
          <mesh position={[0.66, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matTripod}>
            <cylinderGeometry args={[0.155, 0.155, 0.12, 18]} />
          </mesh>
          <mesh position={[-0.66, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matTripod}>
            <cylinderGeometry args={[0.15, 0.15, 0.12, 18]} />
          </mesh>
          <mesh geometry={rbox(0.32, 0.24, 0.26, 0.03)} material={matTripod} position={[0.08, -0.18, 0.14]} />
        </group>
      </group>
    </group>
  );
};

const S05: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // 1. Chuyển động MBT chậm rãi hướng mặt giáp trước sang trái (-X, rotation Y = Math.PI)
  const tankX = tankXAt(t);
  const tankTravel = 24.6 - tankX;
  const roofTargetX = tankX - 0.23;
  const frontArmorX = tankX - 3.68;

  // 2. Tiến độ bay u(t) của tên lửa đột kích nóc
  const launched = t >= CUE.s05_missile_launch;
  const climbP = prog(t, CUE.s05_missile_launch, CUE.s05_apex_150m, Easing.out(Easing.quad));
  const diveP = prog(t, CUE.s05_apex_150m, 45.16, Easing.inOut(Easing.quad));
  const missileU = !launched ? 0 : t <= CUE.s05_apex_150m ? climbP * 0.5 : 0.5 + diveP * 0.5;

  // Vị trí và góc chúc mũi pitch (quanh trục Z) tất định 100% theo t cho TopAttackMissile (mũi mô hình hướng +X)
  const mPos = evalTrajectory(missileU);
  const eps = 0.003;
  const pPrev = evalTrajectory(Math.max(0, missileU - eps));
  const pNext = evalTrajectory(Math.min(1, missileU + eps));
  let tdx = pNext[0] - pPrev[0];
  let tdy = pNext[1] - pPrev[1];
  const tLen = Math.hypot(tdx, tdy);
  if (tLen < 1e-6) {
    tdx = 0.72;
    tdy = 0.69;
  } else {
    tdx /= tLen;
    tdy /= tLen;
  }
  const missilePitch = Math.atan2(tdy, tdx);

  const finDeploy = prog(t, CUE.s05_missile_launch + 0.06, CUE.s05_missile_launch + 0.42);
  const missileSpin = Math.max(0, t - CUE.s05_missile_launch) * 3.2;
  const closeDiveP = prog(t, 43.35, 44.85);
  const missileScale = lerp(1.62, 1.22, closeDiveP);

  // Dải điểm Trail lọc đơn điệu phía sau vòi phụt rồi nối khít 100% vào đúng tâm vòi phụt đuôi tên lửa
  const nozzleOffset = 0.55 * missileScale;
  const nozzlePos: V3 = [
    mPos[0] - tdx * nozzleOffset,
    mPos[1] - tdy * nozzleOffset,
    0,
  ];
  const sampleEndIdx = Math.max(1, Math.floor((CURVE_SAMPLE_N - 1) * missileU));
  const activeTrailPts = useMemo(() => {
    if (!launched || missileU <= 0.008) return null;
    const pts: V3[] = [CURVE_PTS[0]];
    for (let i = 1; i <= sampleEndIdx && i < CURVE_SAMPLE_N; i++) {
      const p = CURVE_PTS[i];
      if (i > sampleEndIdx - 20) {
        const d = Math.hypot(p[0] - mPos[0], p[1] - mPos[1]);
        if (d <= nozzleOffset + 0.15) continue;
      }
      pts.push(p);
    }
    pts.push(nozzlePos);
    return pts.length >= 2 ? pts : null;
  }, [launched, missileU, sampleEndIdx, mPos[0], mPos[1], nozzleOffset, nozzlePos[0], nozzlePos[1]]);

  // Bề rộng Trail thu thanh mảnh dần khi camera zoom cận cảnh lúc bổ nhào để cân đối với đường kính tên lửa
  const trailOuterW = lerp(0.25, 0.095, closeDiveP);
  const trailCoreW = lerp(0.1, 0.042, closeDiveP);

  // 3. Hiệu ứng vòng đánh dấu tử huyệt nóc tháp pháo (CUE.s05_weak_spot = 37.54)
  const weakIn = prog(t, CUE.s05_weak_spot, CUE.s05_weak_spot + 0.45);
  const weakPulse = 0.5 + 0.5 * Math.sin(Math.max(0, t - CUE.s05_weak_spot) * 6.5);
  const weakOpacity = weakIn * (0.66 + 0.32 * weakPulse);

  // 4. Đường bắn thẳng nằm ngang bị từ bỏ (CUE.s05_skip_front = 39.04)
  const skipDrawP = prog(t, CUE.s05_skip_front - 0.06, CUE.s05_skip_front + 0.46);
  const skipFade = 1 - prog(t, 40.12, CUE.s05_missile_launch + 0.04);
  const skipAlpha = (t >= CUE.s05_skip_front - 0.06 ? 1 : 0) * skipFade;
  const shieldFlash = bump(t, CUE.s05_skip_front + 0.38, 1.05);

  const directStart: V3 = [-32.8, 8.45, 0];
  const directEnd: V3 = [frontArmorX - 0.25, 1.38, 0];
  const directDashes = useMemo(() => Array.from({ length: 16 }, (_, i) => i), []);

  // 5. Biên đạo Camera 4 pha mượt mà:
  // Pha A (35.75 -> 38.1s): Cận trung 3/4 nhìn rõ khối giáp trước & vòng tử huyệt trên nóc MBT
  // Pha B (38.1 -> 40.68s): Kéo rộng toàn cảnh thung lũng thấy rõ đường bắn ngang bị chặn ở khiên giáp trước
  // Pha C (40.68 -> 43.0s): Kéo rộng & ngước lên ôm trọn vòng cung tên lửa đạt đỉnh 150m và xe tăng dưới đất
  // Pha D (43.15 -> 45.2s): Đẩy nhanh & chúc xuống bám theo quả tên lửa bổ nhào thẳng đứng 90° xuống nóc tháp pháo
  const pWideValley = prog(t, 38.05, 39.15, Easing.inOut(Easing.cubic));
  const pApexFrame = prog(t, CUE.s05_missile_launch - 0.05, CUE.s05_apex_150m + 0.22, Easing.out(Easing.cubic));
  const pDiveTrack = prog(t, 43.18, 45.16, Easing.inOut(Easing.cubic));

  const posA: V3 = [13.5, 5.4, 16.2];
  const lookA: V3 = [21.8, 1.9, 0];

  const posB: V3 = [-3.8, 9.4, 48.5];
  const lookB: V3 = [-4.2, 4.3, 0];

  const posC: V3 = [-4.8, 19.2, 77.5];
  const lookC: V3 = [-2.2, 21.5, 0];

  const posD: V3 = [13.2, 7.6, 15.8];
  const lookD: V3 = [20.45, 3.15, 0];

  const lerpV3 = (a: V3, b: V3, p: number): V3 => [
    lerp(a[0], b[0], p),
    lerp(a[1], b[1], p),
    lerp(a[2], b[2], p),
  ];

  const posAB = lerpV3(posA, posB, pWideValley);
  const lookAB = lerpV3(lookA, lookB, pWideValley);

  const posABC = lerpV3(posAB, posC, pApexFrame);
  const lookABC = lerpV3(lookAB, lookC, pApexFrame);

  const camPos = lerpV3(posABC, posD, pDiveTrack);
  const rawLook = lerpV3(lookABC, lookD, pDiveTrack);
  const diveMidY = Math.max(3.15, Math.min(21.5, mPos[1] * 0.45 + 1.7));
  const camLook: V3 = [
    rawLook[0],
    lerp(rawLook[1], diveMidY, pDiveTrack * (1 - pDiveTrack) * 2.2),
    rawLook[2],
  ];
  const camFov = lerp(lerp(39, 43, pWideValley), 45, pApexFrame) * (1 - pDiveTrack) + 39 * pDiveTrack;

  const apexMarkerAlpha =
    (t >= CUE.s05_apex_150m ? 1 : 0) * (1 - prog(t, 43.85, 44.3));

  return (
    <AbsoluteFill>
      <Stage {...STAGE_DUSK} shadowArea={65} shadowCenter={[8, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình thung lũng thảo nguyên & thảm thực vật */}
        <Terrain h={H_RANGE} colors={STEPPE_COLORS} size={520} seg={256} />
        <Scatter kind="bush" count={145} area={[-120, -110, 120, 85]} h={H_RANGE} seed={11} scale={[0.75, 1.45]} avoid={AVOID_ROAD_AND_CAM} tint="#b7aa78" />
        <Scatter kind="rock" count={85} area={[-130, -110, 130, 85]} h={H_RANGE} seed={23} scale={[0.6, 1.5]} avoid={AVOID_ROAD_AND_CAM} tint="#9c9386" />
        <Scatter kind="pine" count={70} area={[-155, -145, 155, -24]} h={H_RANGE} seed={37} scale={[0.85, 1.55]} tint="#9a9b78" />

        {/* Bụi cây ngụy trang sát gờ công sự tên lửa bên trái */}
        <Scatter kind="bush" count={10} area={[-39, -5.5, -29.5, 5.5]} h={H_RANGE} seed={61} scale={[0.85, 1.3]} avoid={(x, z) => Math.hypot(x + 34, z) < 2.2 || z > 1.6} tint="#afa272" />

        {/* Ụ phóng tên lửa chống tăng bên sườn đồi trái */}
        <LaunchEmplacement />

        {/* Xe tăng chủ lực MBT bên phải quay mặt giáp trước dày sang trái (-X) */}
        <group position={[tankX, 0, 0]} rotation={[0, Math.PI, 0]}>
          <MBT travel={tankTravel} turretYaw={0.04} gunElev={0.03} citvYaw={-0.3} aps={false} />
        </group>

        {/* Bụi xích nhẹ cuốn phía sau đuôi xe tăng */}
        <DustTrail
          t={t}
          from={34.5}
          to={45.5}
          rate={6}
          size={1.65}
          life={2.6}
          path={(tb) => {
            const bx = tankXAt(tb) + 3.55;
            return [bx, H_RANGE(bx, 0), 0];
          }}
        />

        {/* Vòng khóa mục tiêu phát sáng đỏ cam trên tử huyệt nóc tháp pháo (CUE.s05_weak_spot = 37.54) */}
        {weakOpacity > 0.01 && (
          <group position={[roofTargetX, 2.48, 0]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={1 + 0.08 * weakPulse}>
              <ringGeometry args={[1.05, 1.3, 48]} />
              <meshBasicMaterial color="#ff493b" transparent opacity={weakOpacity} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]} scale={0.94 + 0.1 * (1 - weakPulse)}>
              <ringGeometry args={[0.38, 0.54, 36]} />
              <meshBasicMaterial color="#ff9d2e" transparent opacity={weakOpacity * 0.96} side={THREE.DoubleSide} toneMapped={false} />
            </mesh>
            {[0, 1, 2, 3].map((k) => {
              const ang = (k * Math.PI) / 2;
              return (
                <mesh
                  key={k}
                  position={[Math.cos(ang) * 1.48, 0.02, Math.sin(ang) * 1.48]}
                  rotation={[-Math.PI / 2, 0, -ang]}
                >
                  <planeGeometry args={[0.46, 0.14]} />
                  <meshBasicMaterial color="#ff6a4d" transparent opacity={weakOpacity} side={THREE.DoubleSide} toneMapped={false} />
                </mesh>
              );
            })}
            <mesh position={[0, 1.4, 0]}>
              <cylinderGeometry args={[0.032, 0.032, 2.7, 10]} />
              <meshBasicMaterial color="#ff493b" transparent opacity={weakOpacity * 0.34} toneMapped={false} />
            </mesh>
          </group>
        )}

        {/* Đường quỹ đạo bắn thẳng nằm ngang bị chặn bởi khiên giáp trước dày và từ bỏ (CUE.s05_skip_front = 39.04) */}
        {skipAlpha > 0.01 && (
          <group>
            {directDashes.map((idx) => {
              const segStart = idx / directDashes.length;
              const segMid = (idx + 0.5) / directDashes.length;
              if (segStart > skipDrawP) return null;
              const segVis = Math.min(1, (skipDrawP - segStart) * directDashes.length);
              const px = lerp(directStart[0], directEnd[0], segMid);
              const py = lerp(directStart[1], directEnd[1], segMid);
              const pz = lerp(directStart[2], directEnd[2], segMid);
              const dx = directEnd[0] - directStart[0];
              const dy = directEnd[1] - directStart[1];
              const pitch = Math.atan2(dy, dx);
              const dashLen = (Math.hypot(dx, dy) / directDashes.length) * 0.6 * segVis;
              return (
                <mesh key={idx} position={[px, py, pz]} rotation={[0, 0, pitch]}>
                  <boxGeometry args={[dashLen, 0.22, 0.22]} />
                  <meshBasicMaterial color="#7cd0ff" transparent opacity={0.75 * skipAlpha} toneMapped={false} />
                </mesh>
              );
            })}

            {/* Tấm khiên giáp trước xanh sáng cỡ lớn bật lên cùng dấu X đỏ từ chối đường bắn ngang */}
            {(skipDrawP > 0.88 || shieldFlash > 0.01) && (
              <group position={[frontArmorX - 0.15, 1.45, 0]}>
                <mesh rotation={[0, 0, 0.36]}>
                  <boxGeometry args={[0.18, 2.35, 3.25]} />
                  <meshBasicMaterial
                    color="#38a8ff"
                    transparent
                    opacity={Math.max(shieldFlash * 0.78, skipAlpha * 0.48)}
                    toneMapped={false}
                  />
                </mesh>
                {[-1, 1].map((sgn) => (
                  <mesh key={sgn} position={[-0.45, 0.2, 0]} rotation={[0, 0, sgn * 0.78]}>
                    <boxGeometry args={[2.35, 0.26, 0.26]} />
                    <meshBasicMaterial color="#ff523d" transparent opacity={0.92 * skipAlpha} toneMapped={false} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        )}

        {/* Chớp lửa & khói phóng mềm hai đầu ống phóng lúc CUE.s05_missile_launch (40.68s) */}
        <MuzzleBlast t={t} at={CUE.s05_missile_launch} pos={[-33.3, 8.65, 0]} dir={[0.72, 0.69, 0]} size={2.2} seed={17} />
        <MuzzleBlast t={t} at={CUE.s05_missile_launch} pos={[-34.75, 7.45, 0]} dir={[-0.72, -0.35, 0]} size={1.6} seed={29} />

        {/* Vệt sáng quỹ đạo đột kích nóc hai lớp nối khít vòi phụt động cơ tên lửa */}
        {activeTrailPts && activeTrailPts.length >= 2 && (
          <>
            <Trail points={activeTrailPts} upto={1} color="#ff9d2e" width={trailOuterW} opacity={0.86} glow />
            <Trail points={activeTrailPts} upto={1} color="#fff4c8" width={trailCoreW} opacity={0.96} glow />
          </>
        )}

        {/* Vòng mốc đỉnh quỹ đạo 150m + đường gióng độ cao thẳng đứng xuống mặt đất */}
        {apexMarkerAlpha > 0.01 && (
          <group position={P3}>
            <mesh>
              <torusGeometry args={[1.25, 0.08, 10, 36]} />
              <meshBasicMaterial color="#ffb347" transparent opacity={0.8 * apexMarkerAlpha} toneMapped={false} />
            </mesh>
            {Array.from({ length: 9 }, (_, gi) => (
              <mesh key={gi} position={[0, -2.8 - gi * 4.2, 0]}>
                <boxGeometry args={[0.12, 1.8, 0.12]} />
                <meshBasicMaterial color="#ffb347" transparent opacity={0.32 * apexMarkerAlpha} toneMapped={false} />
              </mesh>
            ))}
          </group>
        )}

        {/* Tên lửa đột kích nóc TopAttackMissile bám chuẩn tiếp tuyến quỹ đạo */}
        {launched && (
          <group position={mPos} rotation={[0, 0, missilePitch]} scale={missileScale}>
            <pointLight color="#ffa033" intensity={18} distance={14} decay={1.6} position={[-0.7, 0, 0]} />
            <group rotation={[missileSpin, 0, 0]}>
              <TopAttackMissile finDeploy={finDeploy} thrust={1} />
            </group>
          </group>
        )}
      </Stage>

      {/* Nhãn độ cao đỉnh quỹ đạo 150m (tối đa 1 Label trên màn hình) */}
      <Label
        t={t}
        text="150 m"
        x={960}
        y={180}
        from={CUE.s05_apex_150m}
        until={44.2}
        bg="#ff9d2e"
        fg="#0e1621"
      />
    </AbsoluteFill>
  );
};

export default S05;
