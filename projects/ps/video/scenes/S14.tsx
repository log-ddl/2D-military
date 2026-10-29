import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { Label, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { Trail } from '@lib/3d/fx';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { CUE } from '../cues';
import { Oreshnik, OreshnikRV } from '../local/models';
import { PAL2D, STAGE_EXO } from '../local/palette';

const X_AXIS = new THREE.Vector3(1, 0, 0);

/** Quy đổi vector hướng bay sang góc Euler [x, y, z] cho mô hình có mũi hướng +X. */
function dirToEuler(dx: number, dy: number, dz: number): V3 {
  const dir = new THREE.Vector3(dx, dy, dz);
  if (dir.lengthSq() < 1e-8) return [0, 0, 0];
  dir.normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir);
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return [e.x, e.y, e.z];
}

// Quỹ đạo tên lửa / khoang MIRV bus của Oreshnik trong không gian cận vũ trụ (>80 km)
function busStateAt(t: number): { pos: V3; pitch: number } {
  const pClimb = prog(t, 225.4, 233.4, (x) => x);
  const pBoost = prog(t, 233.4, 236.2, Easing.out(Easing.cubic));
  const pDrift = prog(t, 236.2, 252.2, (x) => x);

  const x = lerp(-3, 2, pClimb) + lerp(0, 9, pBoost) + lerp(0, 18, pDrift);
  const y = lerp(-4, 13, pClimb) + lerp(0, 12, pBoost) + lerp(0, 3, pDrift);
  const z = 0;

  // Phóng gần thẳng đứng (~80°), vọt thoát khí quyển rồi chúc dần khoang bus hướng về mục tiêu mặt đất
  let pitch = lerp(1.42, 1.25, pClimb);
  pitch = lerp(pitch, 0.22, pBoost);
  pitch = lerp(pitch, -0.32, prog(t, 239.0, 244.0));

  return { pos: [x, y, z], pitch };
}

// Thứ tự tách 6 đầu đạn khớp tuyệt đối với `hasRV = i < rvCount` trong Oreshnik.tsx (i = 5 tách đầu tiên -> i = 0 tách cuối)
const RV_RELEASE_TIMES: readonly number[] = [244.05, 243.6, 243.15, 242.7, 242.25, 241.8];

// Đội hình phân kỳ 6 hướng rõ rệt (không chồng lấp nhau trên mặt phẳng chiếu camera 3/4)
const RV_FORMATION_OFFSETS: readonly [number, number][] = [
  [1.65, -0.55],
  [0.95, 1.65],
  [-0.55, 2.05],
  [-1.65, 0.45],
  [-1.15, -1.75],
  [0.45, -1.95],
];

/** Tính vị trí & góc quay thế giới của đầu đạn thứ `i` (0..5) trên mâm khoang bus và sau khi tách độc lập. */
function rvWorldPose(i: number, t: number): { pos: V3; rot: V3; detached: boolean; dt: number } {
  const tRel = RV_RELEASE_TIMES[i];
  const dt = Math.max(0, t - tRel);
  const refT = Math.min(t, tRel);
  const { pos: bPos, pitch } = busStateAt(refT);

  const ang = (i * Math.PI) / 3;
  const mBus = new THREE.Matrix4()
    .makeTranslation(bPos[0], bPos[1], bPos[2])
    .multiply(new THREE.Matrix4().makeRotationZ(pitch));

  const mWell = new THREE.Matrix4()
    .makeTranslation(4.82, Math.cos(ang) * 0.525, Math.sin(ang) * 0.525)
    .multiply(new THREE.Matrix4().makeRotationX(ang))
    .multiply(new THREE.Matrix4().makeRotationZ(-0.078))
    .multiply(new THREE.Matrix4().makeTranslation(1.05, 0, 0));

  const mInit = mBus.clone().multiply(mWell);
  const initPos = new THREE.Vector3().setFromMatrixPosition(mInit);
  const initQuat = new THREE.Quaternion().setFromRotationMatrix(mInit);

  if (t <= tRel) {
    const e0 = new THREE.Euler().setFromQuaternion(initQuat, 'XYZ');
    return { pos: [initPos.x, initPos.y, initPos.z], rot: [e0.x, e0.y, e0.z], detached: false, dt: 0 };
  }

  // Mỗi đầu đạn đẩy mượt ra phía trước khoang bus và mở rộng sang đội hình lục giác chúc về Trái Đất
  const fwd = new THREE.Vector3(Math.cos(pitch), Math.sin(pitch), 0);
  const [offY, offZ] = RV_FORMATION_OFFSETS[i];

  const calcPos = (d: number) => {
    const spread = 1 - Math.exp(-d * 0.85);
    const fwdDist = 2.15 * d + 0.14 * d * d;
    const dropY = 0.42 * d + 0.08 * d * d;
    return initPos
      .clone()
      .addScaledVector(fwd, fwdDist)
      .add(new THREE.Vector3(0.28 * d, offY * (1.85 * spread + 0.18 * d) - dropY, offZ * (2.15 * spread + 0.22 * d)));
  };

  const cur = calcPos(dt);
  const nxt = calcPos(dt + 0.05);
  const vel = nxt.sub(cur).normalize();

  const qVel = new THREE.Quaternion().setFromUnitVectors(X_AXIS, vel);
  const blend = prog(t, tRel, tRel + 0.85);
  const qFinal = initQuat.clone().slerp(qVel, blend);
  const e = new THREE.Euler().setFromQuaternion(qFinal, 'XYZ');

  return { pos: [cur.x, cur.y, cur.z], rot: [e.x, e.y, e.z], detached: true, dt };
}

// 5 viên đạn động năng phụ toả ra ngay phía trước mỗi đầu đạn MIRV lúc 247.6s (Mach 10)
const SUB_OFFSETS: readonly [number, number, number][] = [
  [0.32, 0.0, 1.05],
  [-0.24, 0.28, 0.82],
  [-0.24, -0.28, 0.94],
  [0.16, 0.36, 0.72],
  [0.16, -0.36, 0.88],
];

/** Mặt cầu cong lớn mô phỏng bầu khí quyển xanh Trái Đất bên dưới không gian cận vũ trụ. */
const ExoEarthHorizon: React.FC<{ centerX: number; dropY: number }> = ({ centerX, dropY }) => {
  const earthTex = useMemo(() => {
    const W = 1024;
    const H = 512;
    const cv = document.createElement('canvas');
    cv.width = W;
    cv.height = H;
    const ctx = cv.getContext('2d')!;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#2e74bc');
    g.addColorStop(0.32, '#1e4d82');
    g.addColorStop(0.72, '#113055');
    g.addColorStop(1, '#08182e');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    // Các dải mây xoáy khí quyển nhìn từ quỹ đạo cao
    for (let i = 0; i < 180; i++) {
      const s1 = Math.sin(i * 19.31 + 4.7) * 43758.54;
      const u = s1 - Math.floor(s1);
      const s2 = Math.sin(i * 73.17 + 9.2) * 24634.63;
      const v = s2 - Math.floor(s2);
      const cx = u * W;
      const cy = v * H * 0.65;
      const rx = 36 + (i % 7) * 28;
      const ry = 5 + (i % 4) * 4.8;
      ctx.fillStyle = i % 3 === 0 ? 'rgba(195, 228, 255, 0.18)' : 'rgba(128, 184, 238, 0.13)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, (u - 0.5) * 0.35, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    return tex;
  }, []);

  const earthMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: earthTex,
        emissive: new THREE.Color('#184375'),
        emissiveIntensity: 0.46,
        roughness: 0.7,
        metalness: 0.08,
      }),
    [earthTex],
  );

  return (
    <group position={[centerX + 12, -622 - dropY, -28]}>
      {/* Mặt cầu Trái Đất R = 605 m */}
      <mesh material={earthMat} rotation={[0.16, -0.42, 0]}>
        <sphereGeometry args={[605, 72, 48]} />
      </mesh>
      {/* Viền sáng xanh khí quyển chân trời (atmospheric limb glow) */}
      <mesh>
        <sphereGeometry args={[612.5, 72, 48]} />
        <meshBasicMaterial
          color="#52acfa"
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[620, 64, 40]} />
        <meshBasicMaterial
          color="#82ccff"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

/** Nền sao tĩnh cận vũ trụ tất định theo seed. */
const StarField: React.FC = () => {
  const geo = useMemo(() => {
    const N = 460;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const h1 = Math.sin(i * 127.1 + 11.7) * 43758.5453;
      const u = h1 - Math.floor(h1);
      const h2 = Math.sin(i * 311.7 + 53.3) * 43758.5453;
      const v = h2 - Math.floor(h2);
      const theta = u * Math.PI * 2;
      const phi = 0.05 + v * 1.22;
      const R = 920;
      pos[i * 3] = R * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = R * Math.cos(phi) + 35;
      pos[i * 3 + 2] = R * Math.sin(phi) * Math.sin(theta);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);

  return (
    <points geometry={geo}>
      <pointsMaterial color="#e8f3ff" size={2.2} sizeAttenuation={false} transparent opacity={0.8} fog={false} />
    </points>
  );
};

const S14: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const { pos: busPos, pitch: busPitch } = busStateAt(t);

  // Tách khoang MIRV Post-Boost Bus lúc 235.8s, mở bung 3 cánh chóp bảo vệ lúc 236.2s
  const separated = t >= 235.8;
  const shroudOpen = prog(t, CUE.s14_shroud_open, 239.2, Easing.bezier(0.32, 0, 0.18, 1));

  // Số đầu đạn còn trên mâm khoang bus (6 -> 0 khớp tuyệt đối với RV_RELEASE_TIMES)
  let rvPresent = 0;
  for (let i = 0; i < 6; i++) {
    if (t <= RV_RELEASE_TIMES[i]) rvPresent++;
  }

  const mainPlume = separated ? 0 : lerp(1.0, 1.28, prog(t, CUE.s14_vertical_launch, 235.5));
  const busVernierPlume = separated ? 0.85 * (1 - prog(t, 245.5, 247.0)) : 0;

  // Vệt lửa hành trình vượt tầng khí quyển ở pha phóng thẳng đứng
  const ascentTrailPts = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    for (let k = 0; k <= 52; k++) {
      const tk = 223.2 + (k / 52) * (235.8 - 223.2);
      const st = busStateAt(tk);
      pts.push([
        st.pos[0] - Math.cos(st.pitch) * 8.15,
        st.pos[1] - Math.sin(st.pitch) * 8.15,
        st.pos[2],
      ]);
    }
    return pts;
  }, []);
  const ascentUpto = prog(t, 223.8, 235.8, (x) => x);

  // Toạ độ 6 đầu đạn độc lập & vệt bay của từng đầu đạn sau khi tách
  const rvStates = Array.from({ length: 6 }, (_, i) => rvWorldPose(i, t));

  const rvTrails = useMemo(() => {
    if (t < 241.8) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const tRel = RV_RELEASE_TIMES[i];
      if (t <= tRel + 0.08) return null;
      const pts: V3[] = [];
      const steps = 22;
      for (let s = 0; s <= steps; s++) {
        const ts = tRel + (s / steps) * (t - tRel);
        pts.push(rvWorldPose(i, ts).pos);
      }
      return pts;
    });
  }, [Math.floor(t * 30)]);

  // Cường độ plasma Mach 10 & triển khai đạn động năng phụ lúc 247.6s
  const plasmaPower = prog(t, 247.1, 248.1) * 1.2;
  const subDt = Math.max(0, t - CUE.s14_submunitions_m10);
  // Khoảng vươn của chùm đạn con tăng nhanh lúc bung rồi giữ đội hình bay kèm ở Mach 10 để cả đàn 6 + 30 mũi xuyên luôn trọn khung hình
  const subLeadBase = subDt > 0 ? 5.2 * (1 - Math.exp(-subDt * 0.72)) : 0;

  // ---------------- Ngôn ngữ Camera 4 nhịp xuyên suốt (đón nắng trực diện + luôn giữ toàn bộ 6 đầu đạn & đạn con trọn khung!) ----------------
  const pBeat2 = prog(t, 235.35, 236.75, Easing.bezier(0.42, 0, 0.2, 1));
  const pBeat3 = prog(t, 241.2, 243.6, Easing.bezier(0.4, 0, 0.2, 1));
  const pBeat4 = prog(t, 247.1, 249.2, Easing.bezier(0.38, 0, 0.2, 1));

  // Nhịp 1 (225.7–235.8s): Thấy trọn thân Oreshnik 16 m + vây lưới + luồng lửa đuôi phóng vọt lên trên rìa xanh khí quyển Trái Đất
  const pAscentCam = prog(t, 225.7, 235.3);
  const cam1Pos: V3 = [
    busPos[0] + lerp(13.5, 14.5, pAscentCam),
    busPos[1] + lerp(-4.8, -2.2, pAscentCam),
    lerp(20.5, 17.5, pAscentCam),
  ];
  const cam1Look: V3 = [busPos[0] - 0.5, busPos[1] - 1.4, 0];

  // Nhịp 2 (236.0–241.5s): Cận cảnh chéo trước đón nắng chiếu thẳng vào mâm 6 đầu đạn MIRV khi 3 cánh chóp mũi mở bung
  const noseDirX = Math.cos(busPitch);
  const noseDirY = Math.sin(busPitch);
  const deckCenter: V3 = [busPos[0] + noseDirX * 5.5, busPos[1] + noseDirY * 5.5, 0];
  const cam2Pos: V3 = [deckCenter[0] + 5.7, deckCenter[1] + 2.0, 5.4];
  const cam2Look: V3 = [deckCenter[0] - 0.2, deckCenter[1] - 0.1, 0];

  // Tâm trung bình của cả 6 đầu đạn MIRV
  const avgRvPos: V3 = rvStates.reduce<V3>(
    (acc, st) => [acc[0] + st.pos[0] / 6, acc[1] + st.pos[1] / 6, acc[2] + st.pos[2] / 6],
    [0, 0, 0],
  );

  // Nhịp 3 (241.8–247.2s): Mở khung 3/4 thấy trọn vẹn cả 6 đầu đạn <OreshnikRV /> tách khỏi mâm khoang bus phía sau
  const cam3Pos: V3 = [avgRvPos[0] + 12.5, avgRvPos[1] + 4.8, 16.2];
  const cam3Look: V3 = [avgRvPos[0] - 1.2, avgRvPos[1] + 0.3, 0];

  // Nhịp 4 (247.6–252.0s): Khung máy bám sát ngay tâm đội hình 6 đầu đạn plasma + 30 mũi đạn động năng phụ Mach 10 rực lửa
  const swarmFocus: V3 = [
    avgRvPos[0] + subLeadBase * 0.55,
    avgRvPos[1] - subLeadBase * 0.24,
    avgRvPos[2],
  ];
  const cam4Pos: V3 = [swarmFocus[0] + 13.5, swarmFocus[1] + 4.2, 18.0];
  const cam4Look: V3 = [swarmFocus[0] + 0.4, swarmFocus[1] - 0.3, 0];

  const lerpV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
  let camPos = lerpV3(cam1Pos, cam2Pos, pBeat2);
  camPos = lerpV3(camPos, cam3Pos, pBeat3);
  camPos = lerpV3(camPos, cam4Pos, pBeat4);

  let camLook = lerpV3(cam1Look, cam2Look, pBeat2);
  camLook = lerpV3(camLook, cam3Look, pBeat3);
  camLook = lerpV3(camLook, cam4Look, pBeat4);

  const fov = lerp(lerp(45, 36, pBeat2), 44, pBeat3);
  const shadowFocus: V3 = pBeat4 > 0.5 ? swarmFocus : pBeat3 > 0.5 ? avgRvPos : busPos;
  const earthDrop = lerp(2, 18, prog(t, 225.7, 252.0, (x) => x));

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: '#050b18' }}>
      <Stage
        {...STAGE_EXO}
        shadowCenter={shadowFocus}
        shadowArea={26}
        env={0.66}
        ambient={0.38}
        exposure={1.2}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Ánh sáng phản xạ xanh từ khí quyển Trái Đất (Earth albedo) & đèn viền giữ sáng rõ chi tiết 6 đầu đạn carbon */}
        <directionalLight position={[8, -45, 22]} intensity={1.25} color="#74bcff" />
        <directionalLight position={[-20, 18, 36]} intensity={0.95} color="#e6f0ff" />

        <StarField />
        <ExoEarthHorizon centerX={shadowFocus[0]} dropY={earthDrop} />

        {/* Vệt lửa hành trình vượt tầng khí quyển */}
        <Trail
          points={ascentTrailPts}
          upto={ascentUpto}
          color="#ffb14a"
          width={0.38}
          opacity={lerp(0.9, 0.18, prog(t, 236.0, 242.5))}
          glow
        />

        {/* Tên lửa đạn đạo tầm trung Oreshnik (225.7–235.8s) -> Khoang phân phối MIRV Post-Boost Bus (từ 235.8s) */}
        <Oreshnik
          position={busPos}
          rotation={[0, 0, busPitch]}
          plume={separated ? busVernierPlume : mainPlume}
          shroudOpen={shroudOpen}
          busOnly={separated}
          rvPresent={rvPresent}
        />

        {/* 6 đầu đạn hồi quyển độc lập <OreshnikRV /> tách lần lượt khỏi mâm & triển khai đạn động năng phụ Mach 10 */}
        {rvStates.map((st, i) => {
          if (!st.detached) return null;
          const trailPts = rvTrails[i];

          const rvQuat = new THREE.Quaternion().setFromEuler(new THREE.Euler(st.rot[0], st.rot[1], st.rot[2], 'XYZ'));
          const fwd = new THREE.Vector3(1, 0, 0).applyQuaternion(rvQuat);
          const up = new THREE.Vector3(0, 1, 0).applyQuaternion(rvQuat);
          const side = new THREE.Vector3(0, 0, 1).applyQuaternion(rvQuat);

          return (
            <React.Fragment key={i}>
              {trailPts && (
                <Trail
                  points={trailPts}
                  upto={1}
                  color={plasmaPower > 0.2 ? '#ff9d3b' : '#9cc8ff'}
                  width={lerp(0.065, 0.135, Math.min(1, plasmaPower))}
                  opacity={lerp(0.62, 0.92, Math.min(1, plasmaPower))}
                  glow
                />
              )}

              <OreshnikRV
                position={st.pos}
                rotation={st.rot}
                scale={1.0}
                plasma={plasmaPower}
              />

              {/* Đúng CUE.s14_submunitions_m10 (247.6s): mỗi đầu đạn phóng tách chùm viên đạn động năng phụ Mach 10 */}
              {subDt > 0.01 &&
                SUB_OFFSETS.map(([oy, oz, leadScale], k) => {
                  const delay = k * 0.07 + (i % 2) * 0.05;
                  const sdt = Math.max(0, subDt - delay);
                  if (sdt <= 0.005) return null;

                  const lead = (1.1 + 4.8 * (1 - Math.exp(-sdt * 0.78))) * leadScale;
                  const spread = 0.22 + 1.35 * (1 - Math.exp(-sdt * 0.85));
                  const pSub = new THREE.Vector3(...st.pos)
                    .addScaledVector(fwd, lead)
                    .addScaledVector(up, oy * spread)
                    .addScaledVector(side, oz * spread);

                  const pOrigin = new THREE.Vector3(...st.pos).addScaledVector(fwd, 0.55);
                  const pMid = pOrigin.clone().lerp(pSub, 0.52);
                  const subDir = pSub.clone().sub(pOrigin);
                  const subRot = dirToEuler(subDir.x, subDir.y, subDir.z);

                  return (
                    <React.Fragment key={`sub_${i}_${k}`}>
                      <Trail
                        points={[
                          [pOrigin.x, pOrigin.y, pOrigin.z],
                          [pMid.x, pMid.y, pMid.z],
                          [pSub.x, pSub.y, pSub.z],
                        ]}
                        upto={1}
                        color="#ffd894"
                        width={0.052}
                        opacity={0.9}
                        glow
                      />
                      <OreshnikRV
                        position={[pSub.x, pSub.y, pSub.z]}
                        rotation={subRot}
                        scale={0.44}
                        plasma={1.25}
                      />
                    </React.Fragment>
                  );
                })}
            </React.Fragment>
          );
        })}
      </Stage>

      {/* Nhãn duy nhất của cảnh S14 (đặt ở khoảng trời thoáng phía trên bên phải, không chạm vào khoang MIRV bus) */}
      <Label
        t={t}
        text="6 ĐẦU ĐẠN MIRV"
        x={1360}
        y={116}
        from={245.8}
        until={250.8}
        size={52}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </div>
  );
};

export default S14;
