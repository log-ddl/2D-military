import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { bump, H, lerp, mix, prog, W } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { fbm } from '@lib/3d/materials';
import { Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { DESERT_TERRAIN, P, STAGE_HIGH_DAWN } from '../local/palette';
import { MQ9Reaper } from '../local/models';

// Địa hình dãy núi cao nguyên sa mạc hữu cơ đa tầng (organic fBm ridged massifs) sâu hùng vĩ dưới tầng bình lưu 15.000 m
const HIGH_CORDILLERA_H = heightField({
  seed: 421,
  amp: 28,
  scale: 190,
  oct: 5,
  add: (x, z) => {
    // Khối núi kiến tạo tự nhiên không lặp chu kỳ: kết hợp sườn khối lớn + sống núi bào mòn fBm + hẻm núi sâu
    const macro = fbm(x / 460 + 13.4, z / 460 - 8.7, 31, 4);
    const ridgeRaw = 1 - Math.abs(fbm(x / 210 + 4.2, z / 210 + 7.9, 67, 4) * 2 - 1);
    const spurRaw = 1 - Math.abs(fbm(x / 95 - 6.1, z / 95 + 3.3, 89, 3) * 2 - 1);

    const massifs = Math.pow(macro, 1.35) * 95;
    const crests = ridgeRaw * ridgeRaw * (28 + 68 * macro);
    const spurs = spurRaw * spurRaw * 18;
    const canyon = -42 * Math.exp(-(((z + 210 + Math.sin(x * 0.0036) * 155) / 130) ** 2));

    // Hạ dần độ cao ở rìa cực xa để dãy núi tan mượt vào sương chân trời
    const dist = Math.hypot(x - 620, z + 280);
    const farDrop = Math.max(0, (dist - 880) / 520) ** 1.6 * 55;

    return -132 + massifs + crests + spurs + canyon - farDrop;
  },
});

const EASE_SURGE = Easing.bezier(0.28, 0.0, 0.18, 1);
const EASE_PULL = Easing.bezier(0.35, 0.0, 0.2, 1);

/** Quỹ đạo & tư thế bay tất định của MQ-9 Reaper theo giây tuyệt đối tau */
function uavPose(tau: number): { pos: V3; rot: V3 } {
  const dt = tau - 29.85;
  const surgeP = prog(tau, 34.55, 37.65, EASE_SURGE);
  const climbP = prog(tau, 37.15, 43.1, EASE_PULL);

  const x = -150 + dt * 22 + surgeP * 56;
  const y = 228 + Math.sin(tau * 0.72) * 0.16 + prog(tau, 34.7, 37.3) * 4.5 + climbP * 32;
  const z = Math.sin(tau * 0.45) * 0.28 - prog(tau, 38.2, 43.1, EASE_PULL) * 8.0;

  // Hệ trục MQ9Reaper (+X mũi, +Y lưng, +Z cánh phải): rot[0]=Roll, rot[1]=Yaw, rot[2]=Pitch
  const roll =
    Math.sin(tau * 0.8) * 0.016 +
    bump(tau, 34.65, 2.8) * 0.14 -
    prog(tau, 38.0, 42.6, EASE_PULL) * 0.15;
  const yaw = prog(tau, 38.2, 43.1, EASE_PULL) * 0.068;
  const pitch = 0.024 + bump(tau, 34.7, 2.9) * 0.038 + climbP * 0.026;

  return { pos: [x, y, z], rot: [roll, yaw, pitch] };
}

function localToWorld(local: V3, pos: V3, rot: V3): V3 {
  const v = new THREE.Vector3(local[0], local[1], local[2]);
  v.applyEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ'));
  return [v.x + pos[0], v.y + pos[1], v.z + pos[2]];
}

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

const S04: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const { pos: uavPos, rot: uavRot } = uavPose(t);
  const propSpin = t * 55;

  // 3 Giai đoạn camera liền mạch:
  // 1) 29.85-34.6s: Cận cảnh 3/4 phía sau đuôi chữ Y bám sát cụm động cơ Honeywell TPE331
  //    (hốc hút gió lưng, cặp ống xả thép sẫm hai bên, chóp spinner và 3 lá cánh quạt đầu sơn vàng)
  // 2) 34.6-37.3s: Bứt tốc 482 km/h lao vọt qua ống kính, camera lia mở góc ngang-trên bám thân
  // 3) 37.3-43.1s: Kéo lùi cao & xa ngoạn mục (Stratospheric Pull-back 15.000 m / 3.000 km / 27 giờ)
  const pEngine = prog(t, 29.85, 33.9);
  const pSurge = prog(t, 34.55, 37.25, EASE_SURGE);
  const pPull = prog(t, 37.25, 43.05, EASE_PULL);

  const camRel1 = lerpV3([-9.85, 2.48, 3.05], [-8.95, 2.22, 2.52], pEngine);
  const lookRel1 = lerpV3([-3.95, 0.1, -0.08], [-4.32, 0.08, -0.02], pEngine);

  const camRel2 = lerpV3(camRel1, [-17.2, 4.85, 13.6], pSurge);
  const lookRel2 = lerpV3(lookRel1, [0.85, -0.32, 0.45], pSurge);

  const camRel = lerpV3(camRel2, [-43.5, 11.4, 29.5], pPull);
  const lookRel = lerpV3(lookRel2, [12.5, -3.8, -4.5], pPull);

  const camPos: V3 = [uavPos[0] + camRel[0], uavPos[1] + camRel[1], uavPos[2] + camRel[2]];
  const camLook: V3 = [uavPos[0] + lookRel[0], uavPos[1] + lookRel[1], uavPos[2] + lookRel[2]];
  const fov = lerp(lerp(lerp(39.0, 38.0, pEngine), 42.5, pSurge), 45.0, pPull);
  const camRoll = bump(t, 34.7, 2.7) * -0.032 + pPull * 0.022;

  // Hướng nắng xoay nhẹ dần từ bình minh sớm xiên ngang cụm cánh quạt sang nắng cao tầng bình lưu gợi 27 giờ bay
  const pSun = prog(t, 33.8, 43.1);
  const sunDir: V3 = lerpV3([-16, 20, 56], [42, 50, 36], pSun);
  const skyColors: [string, string, string] = [
    mix(STAGE_HIGH_DAWN.sky![0], '#081832', 0.28 + pPull * 0.65),
    mix(STAGE_HIGH_DAWN.sky![1], '#7f9cb6', pPull * 0.35),
    mix(STAGE_HIGH_DAWN.sky![2], '#f2c892', pSun * 0.45),
  ];
  // Hòa màu sương chân trời khớp đúng dải tiếp giáp SkyDome để dãy núi xa tan mượt tự nhiên vào sương sớm
  const horizonFogColor = mix(skyColors[1], skyColors[2], 0.32);

  const shadowArea = lerp(lerp(15, 26, pSurge), 90, pPull);

  // Vệt khí động mảnh ngắn (0.30s ~ 7m ngay sau mút cánh) khi bứt tốc 482 km/h, luôn nằm phía trước ống kính
  const trailStrength = prog(t, CUE.s04_speed_surge - 0.3, CUE.s04_speed_surge + 0.45);
  const { rightTipPts, leftTipPts } = useMemo(() => {
    const N = 16;
    const spanSec = 0.3;
    const rPts: V3[] = [];
    const lPts: V3[] = [];
    for (let i = 0; i < N; i++) {
      const tau = t - spanSec * (1 - i / (N - 1));
      const st = uavPose(tau);
      rPts.push(localToWorld([-0.26, 0.35, 10.06], st.pos, st.rot));
      lPts.push(localToWorld([-0.26, 0.35, -10.06], st.pos, st.rot));
    }
    return { rightTipPts: rPts, leftTipPts: lPts };
  }, [t]);

  const tipOpacity = trailStrength * lerp(0.38, 0.2, pPull);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#0b1b33' }}>
      <Stage
        {...STAGE_HIGH_DAWN}
        sky={skyColors}
        sun={sunDir}
        fog={[260, 1240]}
        fogColor={horizonFogColor}
        shadowCenter={uavPos}
        shadowArea={shadowArea}
      >
        <Cam pos={camPos} look={camLook} fov={fov} roll={camRoll} />

        {/* Dãy núi cao nguyên sa mạc trùng điệp sâu thẳm mờ sương sớm bên dưới trần bay 15.000 m */}
        <Terrain
          h={HIGH_CORDILLERA_H}
          size={2800}
          seg={320}
          center={[640, -300]}
          colors={DESERT_TERRAIN}
          grainRepeat={92}
        />
        <Scatter
          kind="rock"
          count={85}
          area={[-80, -920, 1420, 280]}
          h={HIGH_CORDILLERA_H}
          seed={47}
          scale={[3.0, 6.8]}
          tint="#8d6a4e"
        />

        {/* Chủ thể MQ-9 Reaper thu càng, full vũ khí, cánh quạt đẩy Honeywell TPE331 quay tít */}
        <group position={uavPos} rotation={uavRot}>
          <MQ9Reaper
            gearDown={0}
            loadout="full"
            propSpin={propSpin}
            sensorYaw={Math.sin(t * 0.5) * 0.16}
            sensorPitch={0.32}
          />
          {/* 3 quạt mờ chuyển động (shutter motion-blur) bám sát sau mỗi lá cánh quạt để thấy rõ tốc độ cao mà không che ống xả */}
          <group position={[-5.24, 0, 0]} rotation={[propSpin, 0, 0]}>
            {[0, 1, 2].map((i) => (
              <group key={i} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
                <mesh rotation={[0, -Math.PI / 2, 0]}>
                  <ringGeometry args={[0.32, 1.23, 14, 1, 0.02, 0.28]} />
                  <meshBasicMaterial
                    color="#cfd8e4"
                    transparent
                    opacity={0.13}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
                <mesh rotation={[0, -Math.PI / 2, 0]}>
                  <ringGeometry args={[1.19, 1.28, 14, 1, 0.0, 0.34]} />
                  <meshBasicMaterial
                    color="#f5be3b"
                    transparent
                    opacity={0.32}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        {/* Vệt khí động tinh tế đầu mút cánh 20,12 m khi tăng tốc 482 km/h */}
        {tipOpacity > 0.005 && (
          <>
            <Trail points={rightTipPts} upto={1} color="#e8f2ff" width={0.026} opacity={tipOpacity} glow={false} />
            <Trail points={leftTipPts} upto={1} color="#e8f2ff" width={0.026} opacity={tipOpacity} glow={false} />
          </>
        )}
      </Stage>

      {/* Tối đa 1 <Label> tại một thời điểm */}
      <Label
        t={t}
        text="TPE331 · 482 KM/H"
        x={375}
        y={932}
        from={32.42}
        until={36.7}
        size={48}
        bg={P.paper}
        fg={P.ink}
      />
      <Label
        t={t}
        text="15.000 M · 27 GIỜ"
        x={365}
        y={932}
        from={CUE.s04_ceiling_pullback}
        until={42.85}
        size={48}
        bg={P.paper}
        fg={P.ink}
      />
    </div>
  );
};

export default S04;
