// C02S11 (354.86–368.08 s) — Cảnh cuối Chương C02 (3D bow-side climb, STAGE_PRESETS.stormDawn):
// Ngoài mạn trái mũi tàu USS Hornet trên sóng bão 30 ft (swell = 4.4), chiếc B-25 #16 "Bat Out of Hell"
// với mũi kính vỡ (brokenNose = true) vẫn được Billy Farrow đẩy hết ga lao khỏi mép sàn HORNET_BOW_X = 125.7,
// hụt lực nâng tụt thốc xuống thấp hơn hẳn mặt sàn mũi tàu Hornet sát ngọn sóng cồn trắng xóa,
// rồi đúng từ "claws" (366.88 s) ngóc mũi +13° gồng mình vọt chéo lên bầu trời bão xám.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { MuzzleBlast, softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { STAGE_PRESETS } from '../design/palette';
import { USSHornet, HORNET_DECK_Y, HORNET_B25_Z, HORNET_BOW_X } from '../parts/USSHornet';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';

const SWELL = 4.4;
const T_THROTTLE = 362.62;
const T_BOW_EXIT = 364.58;
const X_START_DECK = 55.5; // Đỗ ngay trước đảo chỉ huy trên vạch trắng để tách khối sắc nét khỏi tháp thép tối màu

/** Nội suy Hermite bậc 3 liên tục C1 qua chuỗi keyframe thời gian thực (không bị khựng vận tốc giữa chừng). */
function evalHermiteV3(t: number, keys: ReadonlyArray<{ t: number; v: V3 }>): V3 {
  if (t <= keys[0].t) return keys[0].v;
  const last = keys.length - 1;
  if (t >= keys[last].t) return keys[last].v;

  let i = 0;
  while (i < last - 1 && t > keys[i + 1].t) i++;

  const t0 = keys[i].t;
  const t1 = keys[i + 1].t;
  const dt = t1 - t0;
  const u = (t - t0) / dt;
  const u2 = u * u;
  const u3 = u2 * u;

  const h00 = 2 * u3 - 3 * u2 + 1;
  const h10 = u3 - 2 * u2 + u;
  const h01 = -2 * u3 + 3 * u2;
  const h11 = u3 - u2;

  const out: V3 = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    const p0 = keys[i].v[c];
    const p1 = keys[i + 1].v[c];
    const slopeSeg = (p1 - p0) / dt;
    const m0 =
      i === 0
        ? slopeSeg * 0.65
        : 0.5 * (slopeSeg + (p0 - keys[i - 1].v[c]) / (t0 - keys[i - 1].t));
    const m1 =
      i + 1 === last
        ? slopeSeg * 0.45
        : 0.5 * ((keys[i + 2].v[c] - p1) / (keys[i + 2].t - t1) + slopeSeg);
    out[c] = h00 * p0 + h10 * (m0 * dt) + h01 * p1 + h11 * (m1 * dt);
  }
  return out;
}

/** Biến đổi tọa độ từ hệ quy chiếu tàu Hornet sang world space theo shipPose. */
function shipToWorld(shipPt: V3, pose: { y: number; pitch: number; roll: number }): V3 {
  const v = new THREE.Vector3(shipPt[0], shipPt[1], shipPt[2]).applyEuler(
    new THREE.Euler(pose.roll, 0, pose.pitch, 'XYZ'),
  );
  return [v.x, v.y + pose.y, v.z];
}

/** Tính vị trí & góc bay liên tục C1 của chiếc B-25 #16 tại mọi thời điểm tau. */
function evalPlane16State(tau: number): {
  pos: V3;
  rot: V3;
  gear: number;
  onThrottle: boolean;
  airborne: boolean;
} {
  const poseNow = shipPose(0, 0, 251.4, 35.0, tau, SWELL);

  if (tau <= T_BOW_EXIT) {
    // Giai đoạn trên sàn tàu Hornet: nhích nhẹ trên phanh rồi đẩy hết ga lao vút tới HORNET_BOW_X = 125.7
    const creep = prog(tau, 354.86, T_THROTTLE) * 1.4;
    let deckX = X_START_DECK - 1.4 + creep;
    if (tau > T_THROTTLE) {
      const u = Math.min(1, Math.max(0, (tau - T_THROTTLE) / (T_BOW_EXIT - T_THROTTLE)));
      const accelCurve = u * u * (1.28 - 0.28 * u);
      deckX = X_START_DECK + (HORNET_BOW_X - X_START_DECK) * accelCurve;
    }
    const worldPos = shipToWorld([deckX, HORNET_DECK_Y, HORNET_B25_Z], poseNow);
    const engineVib = tau >= T_THROTTLE ? Math.sin(tau * 42) * 0.005 : Math.sin(tau * 18) * 0.002;
    return {
      pos: worldPos,
      rot: [poseNow.roll + engineVib, 0, poseNow.pitch],
      gear: 1,
      onThrottle: tau >= T_THROTTLE,
      airborne: false,
    };
  }

  // Giai đoạn rời mép mũi HORNET_BOW_X = 125.7: tụt thốc dưới mặt sàn mũi tàu rồi gồng mình ngóc +13° vọt lên trời
  const poseExit = shipPose(0, 0, 251.4, 35.0, T_BOW_EXIT, SWELL);
  const exitWorld = shipToWorld([HORNET_BOW_X, HORNET_DECK_Y, HORNET_B25_Z], poseExit);
  const bowNow = shipToWorld([HORNET_BOW_X, HORNET_DECK_Y, HORNET_B25_Z], poseNow);

  const dt = tau - T_BOW_EXIT; // 0 .. 3.50 s
  // Vận tốc tương đối so với tàu Hornet đang chạy ngược gió bão 45 mph: đủ gần mũi tàu để khung hình đối chiếu trực quan độ cao!
  const worldX = exitWorld[0] + 17.6 * dt - 1.15 * dt * dt;
  const worldZ = lerp(exitWorld[2], HORNET_B25_Z - 0.35, prog(tau, T_BOW_EXIT, 368.08));

  // Quỹ đạo độ cao Y: tụt thốc rõ rệt xuống y ≈ 13.0 m (thấp hơn mặt sàn 18.3 m của mũi Hornet > 5.3 m suốt 365.15–366.58 s),
  // rồi từ 366.58–368.08 s gồng mình ngóc mũi +13° vọt chéo lên y ≈ 27.6 m!
  const dipP = prog(tau, T_BOW_EXIT, 365.16);
  const climbP = prog(tau, 366.58, 368.08);
  const yDipTarget = Math.min(13.15, bowNow[1] - 5.35);
  const yAfterDip = lerp(exitWorld[1], yDipTarget, dipP);
  const yRaw = lerp(yAfterDip, 27.6, Math.pow(climbP, 1.12));
  const seaFloor = waveY(worldX, worldZ, tau, SWELL) + 1.55;
  const worldY = Math.max(yRaw, seaFloor);

  // Góc chúc/ngóc mũi: chúi -5.0° khi hụt lực nâng ở 365.1–366.4 s, rồi ngóc mạnh +13° (0.227 rad) đúng nhịp "claws" (366.88 s)
  const noseDropP = prog(tau, T_BOW_EXIT, 365.15);
  const clawPitchP = prog(tau, 366.45, 367.12);
  const pitchDip = lerp(poseExit.pitch, -0.088, noseDropP);
  const worldPitch = lerp(pitchDip, 0.227, clawPitchP); // +0.227 rad = +13.0°

  // Góc nghiêng cánh nhẹ khi chống chọi gió bão đầu mũi tàu rồi lấy lại thăng bằng
  const gustRoll = Math.sin((tau - T_BOW_EXIT) * 3.4) * 0.052 * (1 - climbP * 0.55);
  const worldRoll = lerp(poseExit.roll, 0.03, prog(tau, T_BOW_EXIT, 367.6)) + gustRoll;

  // Thu dần càng đáp 1 → 0.35 khi vọt lên bầu trời bão
  const gear = lerp(1, 0.35, prog(tau, 366.82, 368.06));

  return {
    pos: [worldX, worldY, worldZ],
    rot: [worldRoll, 0.015 * dipP, worldPitch],
    gear,
    onThrottle: true,
    airborne: true,
  };
}

/** Sprite bọt sóng / bụi nước mù ngoài mũi tàu Hornet. */
const SprayPuff: React.FC<{ pos: V3; size: number; opacity: number; color?: string; rot?: number }> = ({
  pos,
  size,
  opacity,
  color = '#dfeaf2',
  rot = 0,
}) => {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  if (opacity <= 0.004 || size <= 0.02) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size, size * 0.74, size]} />;
};

/** Tổ bay + vách ngăn khoang mũi + chớp lửa ống xả đôi Wright R-2600 Cyclone khi đẩy hết ga. */
const Plane16InteriorAndExhaust: React.FC<{ t: number; fullPower: boolean }> = ({ t, fullPower }) => {
  const bulkheadMat = useMemo(() => plain('#12180f', 0.92, 0.12, { side: THREE.DoubleSide }), []);
  const leatherMat = useMemo(() => plain('#3b281c', 0.72, 0.08), []);
  const maeWestMat = useMemo(() => plain('#c99a26', 0.68, 0.06), []);

  const flamePulse = 0.78 + 0.22 * Math.sin(t * 64);

  return (
    <group>
      {/* Vách ngăn khoang mũi tạo độ sâu tối cho lỗ kính vỡ 1 foot của B25Mitchell */}
      <mesh position={[6.55, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} material={bulkheadMat}>
        <cylinderGeometry args={[0.59, 0.59, 0.05, 20]} />
      </mesh>

      {/* Bóng Billy Farrow, cơ phó & xạ thủ cắt bom DeShazer trong khoang kính */}
      {([-0.34, 0.34] as const).map((zp, idx) => (
        <group key={`p16-pilot-${idx}`} position={[4.3, 2.52, zp]}>
          <mesh position={[0, 0.22, 0]} geometry={rbox(0.28, 0.42, 0.34, 0.05)} material={leatherMat} />
          <mesh position={[0.04, 0.24, 0]} geometry={rbox(0.24, 0.34, 0.3, 0.04)} material={maeWestMat} />
        </group>
      ))}
      <group position={[7.14, 1.81, 0.04]}>
        <mesh position={[0, 0.25, 0]} geometry={rbox(0.25, 0.41, 0.31, 0.05)} material={leatherMat} />
        <mesh position={[0.05, 0.26, 0]} geometry={rbox(0.2, 0.31, 0.27, 0.04)} material={maeWestMat} />
      </group>

      {/* Chớp lửa xanh-cam từ vòng 14 ống xả ngắn của 2 động cơ Wright R-2600 khi Farrow đẩy hết ga (t >= 363.12 s) */}
      {fullPower &&
        ([-3.05, 3.05] as const).map((zc, ei) => (
          <group key={`exh-ring-${ei}`} position={[3.42, 2.62, zc]}>
            <pointLight color="#ff9d42" intensity={4.8 * flamePulse} distance={5.2} decay={2} />
            {[0.35, 0.95, 2.2, 2.8, 3.55, 5.4].map((ang, fi) => {
              const flick = 0.72 + 0.44 * Math.sin(t * 73 + fi * 2.1 + ei * 1.7);
              return (
                <mesh
                  key={`fl-${fi}`}
                  position={[-0.2 * flick, Math.cos(ang) * 0.74, Math.sin(ang) * 0.74]}
                  rotation={[0, 0, Math.PI / 2]}
                  scale={[1, 1.85 * flick, 1]}
                >
                  <coneGeometry args={[0.08, 0.44, 8]} />
                  <meshBasicMaterial
                    color={fi % 2 === 0 ? '#ffb347' : '#7cc4ff'}
                    transparent
                    opacity={0.88}
                    toneMapped={false}
                  />
                </mesh>
              );
            })}
          </group>
        ))}
    </group>
  );
};

const CAM_POS_KEYS: ReadonlyArray<{ t: number; v: V3 }> = [
  { t: 354.86, v: [66.5, 22.6, -15.2] },
  { t: 358.5, v: [92.5, 23.6, -28.2] },
  { t: 362.62, v: [120.5, 21.1, -40.8] },
  { t: 364.58, v: [126.8, 20.5, -45.2] },
  { t: 366.15, v: [131.5, 20.4, -54.0] },
  { t: 368.08, v: [138.0, 21.3, -66.5] },
];

const CAM_LOOK_KEYS: ReadonlyArray<{ t: number; v: V3 }> = [
  { t: 354.86, v: [54.2, 20.1, -0.9] },
  { t: 358.5, v: [70.5, 18.6, -0.8] },
  { t: 362.62, v: [98.5, 18.2, -0.9] },
  { t: 364.58, v: [119.5, 17.5, -1.0] },
  { t: 366.15, v: [126.5, 15.6, -1.0] },
  { t: 368.08, v: [135.8, 20.4, -1.0] },
];

const C02S11: React.FC = () => {
  const t = useT();
  const pose = shipPose(0, 0, 251.4, 35.0, t, SWELL);
  const p16 = evalPlane16State(t);

  // Vị trí chớp khói xả ngắn ngay khoảnh khắc nhả phanh đẩy ga (362.72 s — tan hết trước khi ra khỏi mũi tàu)
  const throttleState = useMemo(() => evalPlane16State(362.72), []);

  // --- Đạo diễn Camera C1 mượt liên tục ngoài mạn trái mũi tàu (3D bow-side climb) ---
  // - 354.86–362.62 s: Lượn vòng giàu động lượng từ góc trung-cận 3/4 mũi kính vỡ chiếc #16 kéo mở rộng dọc mạn trái ra mũi tàu Hornet.
  // - 364.58–368.08 s: Giữ máy cao vừa tầm (y ≈ 20.4–21.3 m) và lùi mượt ra z ≈ -48 → -66.5 m để MŨI TÀU USS HORNET (x = 92..125.7 m, y ≈ 18.3 m)
  //   luôn hiện diện vững chãi ở 1/3 phải khung hình trong CẢ pha tụt dưới mũi tàu (y ≈ 13.0 m) lẫn pha ngóc +13° vọt lên trời (y ≈ 24.6–27.6 m)!
  const rawCamPos = evalHermiteV3(t, CAM_POS_KEYS);
  const camLook = evalHermiteV3(t, CAM_LOOK_KEYS);
  const camFov = lerp(38.5, 45.0, prog(t, 354.86, CUE.c02_end));

  // BẮT BUỘC kẹp camY >= waveY(camX, camZ, t, 4.4) + 1.8 để cồn sóng bão không bao giờ cắt ống kính
  const minSafeCamY = waveY(rawCamPos[0], rawCamPos[2], t, SWELL) + 2.15;
  const camPos: V3 = [rawCamPos[0], Math.max(rawCamPos[1], minSafeCamY), rawCamPos[2]];
  const camRoll = Math.sin(t * 1.65) * 0.018;

  // Bọt sóng đập dữ dội quanh mũi clipper của USS Hornet
  const bowSpraySeeds = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => ({
        a: rnd(i * 19 + 3),
        b: rnd(i * 37 + 7),
        c: rnd(i * 53 + 13),
      })),
    [],
  );

  const preset = STAGE_PRESETS.stormDawn;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...preset} shadowArea={88} shadowCenter={[120, 18, -4]}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Mặt biển bão Thái Bình Dương sóng cao 30 ft (swell = 4.4) */}
        <OceanSurface t={t} swell={SWELL} size={1150} seg={172} center={[115, 0]} palette="stormPacific" />

        {/* Tàu sân bay USS Hornet (CV-8) bổ sóng dữ dội theo shipPose */}
        <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
          <USSHornet hullNumber="8" showLaunchLines flagWave={t * 5.6} aaYaw={0.12} />
        </group>

        {/* Đèn môi trường nhẹ hắt sáng từ mặt bọt sóng lên vách mạn trái mũi Hornet để đọc rõ kết cấu giàn chữ A thép */}
        <pointLight position={[112, 12, -26]} color="#9cb6cc" intensity={85} distance={68} decay={1.6} />

        {/* Bọt sóng trắng xóa tung lên quanh sống mũi thép cao 60 ft của USS Hornet */}
        {bowSpraySeeds.map((sp, idx) => {
          const cyc = ((t * 0.62 + sp.a) % 1 + 1) % 1;
          const sx = lerp(124.0, 92.0, cyc) + (sp.b - 0.5) * 8.0;
          const sideSign = idx % 3 === 0 ? 1 : -1;
          const sz = sideSign * (4.2 + cyc * 12.5 + sp.c * 4.0);
          const baseWave = waveY(sx, sz, t, SWELL);
          const sy = baseWave + 0.7 + Math.sin(cyc * Math.PI) * (4.2 + sp.b * 3.4);
          return (
            <SprayPuff
              key={`bow-foam-${idx}`}
              pos={[sx, sy, sz]}
              size={4.2 + cyc * 6.8 + sp.c * 2.6}
              opacity={0.25 * Math.sin(cyc * Math.PI)}
              color="#e3eef6"
              rot={sp.a * 6.28 + t * 0.5}
            />
          );
        })}

        {/* Chiếc B-25B #16 "Bat Out of Hell" vỡ mũi kính của Billy Farrow */}
        <group position={p16.pos} rotation={p16.rot}>
          <B25Mitchell
            gear={p16.gear}
            propFast={p16.onThrottle}
            propSpin={t * (p16.onThrottle ? 38 : 22)}
            brokenNose
            navLights
            broomsticks
            lowerTurret={false}
            chained={false}
            seed={16}
          />
          <Plane16InteriorAndExhaust t={t} fullPower={p16.onThrottle} />
        </group>

        {/* Cú phụt khói & lửa ống xả ngắn khi Farrow nhả phanh đẩy mạnh tay ga */}
        <MuzzleBlast
          t={t}
          at={362.72}
          pos={[throttleState.pos[0] + 2.2, throttleState.pos[1] + 2.5, throttleState.pos[2] - 3.1]}
          dir={[-1, 0.08, -0.18]}
          size={0.58}
          seed={161}
        />
        <MuzzleBlast
          t={t}
          at={362.76}
          pos={[throttleState.pos[0] + 2.2, throttleState.pos[1] + 2.5, throttleState.pos[2] + 3.1]}
          dir={[-1, 0.08, 0.18]}
          size={0.58}
          seed={162}
        />

        {/* Bụi bọt sóng mềm bị luồng gió cánh quạt thổi tung khỏi ngọn sóng và cuốn ngược theo gió bão 45 mph khi #16 lướt sát biển (364.95–366.85 s) */}
        {t >= 364.95 &&
          Array.from({ length: 16 }, (_, k) => {
            const born = 365.0 + k * 0.105;
            const age = t - born;
            if (age < 0 || age > 1.45) return null;
            const st = evalPlane16State(born);
            const wx = st.pos[0] - 1.5 - age * 11.5 + (rnd(k * 17 + 1) - 0.5) * 3.8;
            const wz = st.pos[2] + (k % 2 === 0 ? -3.1 : 3.1) + (rnd(k * 29 + 4) - 0.5) * 3.0;
            const wy = waveY(wx, wz, t, SWELL) + 0.72 + age * 1.55;
            const fade = Math.sin((age / 1.45) * Math.PI) * (1 - age / 1.65);
            return (
              <SprayPuff
                key={`dip-skim-${k}`}
                pos={[wx, wy, wz]}
                size={2.8 + age * 4.2}
                opacity={0.32 * Math.max(0, fade)}
                color="#eaf4fb"
                rot={k * 0.9 + age * 1.4}
              />
            );
          })}
      </Stage>
    </div>
  );
};

export default C02S11;
