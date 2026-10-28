import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { CUE } from '../cues';
import { DESERT_TERRAIN, P, STAGE_HIGH_DAWN } from '../local/palette';
import { GBU12Paveway, MQ9_GBU12_RIGHT, MQ9Reaper } from '../local/models';

// Địa hình cao nguyên đá đỏ & dãy núi tầng xa đón nắng bình minh phía dưới đường bay MQ-9 Reaper
const canyonFloor = heightField({
  seed: 71,
  amp: 18,
  scale: 150,
  oct: 5,
  add: (x, z) => {
    const valley = -14 * Math.exp(-(((z + 10) / 88) ** 2));
    const farNorthRange = 46 * Math.exp(-(((z + 255) / 92) ** 2)) * (0.72 + 0.28 * Math.sin(x * 0.015 + 0.8));
    const midNorthMesa = 24 * Math.exp(-(((z + 145) / 58) ** 2)) * (0.75 + 0.25 * Math.cos(x * 0.024));
    const southRidge = 22 * Math.exp(-(((z - 175) / 72) ** 2)) * (0.75 + 0.25 * Math.cos(x * 0.02));
    return valley + farNorthRange + midNorthMesa + southRidge;
  },
});

const easeInOut = (x: number) => x * x * (3 - 2 * x);

const S07: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Chuyển động hành trình ổn định của MQ-9 trên cao nguyên bình minh
  const flightDt = t - 61.22;
  const cruiseSpeed = 22; // m/s dọc +X
  const uavX = flightDt * cruiseSpeed;
  const uavY = 84 + Math.sin(t * 0.85) * 0.14;
  const uavZ = 0;

  // Nghiêng nhẹ mở bụng cánh phải (+Z) đón nắng sớm bình minh để toàn bộ 6 giá treo sáng rõ khối 3D
  const uavRoll = -0.068;
  const uavYaw = 0;
  const uavPitch = 0.032;

  // Nội suy 3 giai đoạn Dolly Camera dưới sải cánh (Low Frontal-Belly Dolly Across Underwing Pylons):
  // GĐ 1 (61.22 -> 65.50s): Quét từ phía mũi-dưới cánh vào chính diện giá phóng đôi M299 (z = +3.65m),
  //      đặt cặp AGM-114 Hellfire tiền cảnh ở vị trí vàng không bị cắt mép, đồng thời hậu cảnh cánh kia thấy rõ cặp Hellfire thứ 2 (tổng 4 quả).
  // GĐ 2 (65.50 -> 68.82s): Dolly mượt vào sát thân tại mấu treo trong (z = +2.08m) thấy cực rõ cặp bom laser GBU-12 Paveway II 227 kg.
  // GĐ 3 (68.82 -> 70.95s): Mở rộng & nghiêng máy dõi theo quả GBU-12 tách móc treo rơi gia tốc trọng trường xuống thung lũng,
  //      khung hình ôm trọn cả cánh MQ-9 (với giá treo rỗng vừa thả) phía trên lẫn quả bom 227 kg phía dưới.
  const pToHellfire = prog(t, 61.05, CUE.s07_hellfire_focus + 0.3, easeInOut);
  const pToGbu12 = prog(t, 65.4, CUE.s07_gbu12_focus + 0.62, easeInOut);
  const pDropCam = prog(t, CUE.s07_gbu12_drop, 70.6, easeInOut);

  // Dao động khí động tinh tế khi bay đồng tốc sát dưới cánh
  const aeroVibY = Math.sin(t * 3.3) * 0.022 + Math.cos(t * 5.5) * 0.01;
  const aeroVibZ = Math.cos(t * 2.7) * 0.02;

  // GĐ 1: Từ góc rộng trước mũi quét vào giá đôi Hellfire (z = 3.65m)
  let relCamX = lerp(6.35, 3.62, pToHellfire);
  let relCamY = lerp(-1.62, -1.36, pToHellfire);
  let relCamZ = lerp(6.45, 5.55, pToHellfire);

  let relLookX = lerp(1.15, 0.28, pToHellfire);
  let relLookY = lerp(-0.44, -0.56, pToHellfire);
  let relLookZ = lerp(2.35, 2.38, pToHellfire);

  // Trượt dolly chậm qua đầu dò kính xanh của cặp Hellfire trong lúc giữ cận cảnh (63.32 -> 65.4s)
  const pHellfireHold = prog(t, CUE.s07_hellfire_focus, 65.45, (x) => x);
  relCamX += lerp(0, -0.34, pHellfireHold) * (1 - pToGbu12);
  relCamZ += lerp(0, -0.32, pHellfireHold) * (1 - pToGbu12);
  relLookZ += lerp(0, -0.22, pHellfireHold) * (1 - pToGbu12);

  // GĐ 2: Dolly mượt vào sát thân tại mấu treo trong mang bom GBU-12 Paveway II (z = 2.08m)
  relCamX = lerp(relCamX, 3.68, pToGbu12);
  relCamY = lerp(relCamY, -1.08, pToGbu12);
  relCamZ = lerp(relCamZ, 3.35, pToGbu12);

  relLookX = lerp(relLookX, 0.62, pToGbu12);
  relLookY = lerp(relLookY, -0.5, pToGbu12);
  relLookZ = lerp(relLookZ, 0.96, pToGbu12);

  // GĐ 3: Khi chốt bom mở (68.82s), máy quay lùi nhẹ & chúi xuống theo quả GBU-12 rơi tự do, giữ trọn cả máy bay phía trên và bom phía dưới
  relCamX = lerp(relCamX, 8.35, pDropCam);
  relCamY = lerp(relCamY, -2.65, pDropCam);
  relCamZ = lerp(relCamZ, 6.35, pDropCam);

  relLookX = lerp(relLookX, 0.25, pDropCam);
  relLookY = lerp(relLookY, -2.35, pDropCam);
  relLookZ = lerp(relLookZ, 1.35, pDropCam);

  const camPos: V3 = [uavX + relCamX, uavY + relCamY + aeroVibY, uavZ + relCamZ + aeroVibZ];
  const camLook: V3 = [uavX + relLookX, uavY + relLookY, uavZ + relLookZ];
  const camFov = lerp(lerp(42, 43, pToGbu12), 46, pDropCam);
  const camRoll = lerp(lerp(-0.045, -0.03, pToGbu12), -0.075, pDropCam);

  // Vật lý tách giá treo & rơi gia tốc trọng trường 0.5 * g * dt^2 của quả GBU-12 bên phải tại CUE.s07_gbu12_drop (68.82s)
  const isDropped = t >= CUE.s07_gbu12_drop;
  const dtDrop = Math.max(0, t - CUE.s07_gbu12_drop);

  const pylonOffset = useMemo(() => {
    const v = new THREE.Vector3(MQ9_GBU12_RIGHT[0], MQ9_GBU12_RIGHT[1] - 0.01, MQ9_GBU12_RIGHT[2]);
    v.applyEuler(new THREE.Euler(uavRoll, uavYaw, uavPitch, 'XYZ'));
    return v;
  }, [uavRoll, uavYaw, uavPitch]);

  // Lực đẩy cơ khí chốt tách bom + rơi gia tốc trọng trường 0.5 * g * dt^2 kèm lực cản khí động tụt nhẹ về sau
  const gDrop = 3.15;
  const dropLagX = -0.36 * dtDrop * dtDrop;
  const dropFallY = -0.44 * dtDrop - 0.5 * gDrop * dtDrop * dtDrop;
  const dropDriftZ = 0.06 * dtDrop;

  const bombPos: V3 = [
    uavX + pylonOffset.x + dropLagX,
    uavY + pylonOffset.y + dropFallY,
    uavZ + pylonOffset.z + dropDriftZ,
  ];

  // Quả bom nặng 227 kg chúc dần mũi laser xuống hướng về thung lũng bên dưới
  const bombPitch = uavPitch - 0.34 * easeInOut(Math.min(1, dtDrop / 1.5));
  const bombRoll = uavRoll + 0.06 * Math.sin(dtDrop * 2.2);

  // Nắng bình minh góc thấp chiếu xiên từ mũi-phải giúp ánh sáng luồn sâu dưới cánh làm nổi rõ 4 quả Hellfire & 2 quả GBU-12
  const lowDawnSun: V3 = [64, 13, 44];

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_HIGH_DAWN}
        sun={lowDawnSun}
        sunIntensity={3.25}
        ambient={0.36}
        env={0.58}
        exposure={1.08}
        shadowArea={13}
        shadowCenter={[uavX, uavY - 1.2 * pDropCam, uavZ]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Ánh sáng phản xạ tự nhiên từ thung lũng cát vàng bình minh phía dưới (albedo bounce) chống ngược tối dưới bụng cánh */}
        <directionalLight position={[uavX + 22, uavY - 18, uavZ + 18]} intensity={1.08} color="#ffd7a8" />
        <directionalLight position={[uavX + 14, uavY - 8, uavZ - 24]} intensity={0.5} color="#9bc0e6" />

        {/* Địa hình dãy núi cao nguyên sa mạc phía dưới */}
        <Terrain h={canyonFloor} size={1350} seg={220} center={[120, -40]} colors={DESERT_TERRAIN} grainRepeat={48} />
        <Scatter
          kind="rock"
          count={150}
          area={[-360, -360, 620, 280]}
          h={canyonFloor}
          seed={73}
          scale={[1.8, 4.8]}
          tint="#9c7556"
        />

        {/* MQ-9 Reaper bay thu càng, chuyển cấu hình bỏ GBU-12 phải đúng khoảnh khắc thả bom */}
        <MQ9Reaper
          position={[uavX, uavY, uavZ]}
          rotation={[uavRoll, uavYaw, uavPitch]}
          gearDown={0}
          propSpin={t * 46}
          sensorYaw={0.16 * Math.sin(t * 0.7)}
          sensorPitch={0.44}
          loadout={isDropped ? 'noRightGBU12' : 'full'}
        />

        {/* Quả bom dẫn đường laser GBU-12 Paveway II (227 kg) vừa tách móc treo phải rơi xuống thung lũng */}
        {isDropped && <GBU12Paveway position={bombPos} rotation={[bombRoll, 0, bombPitch]} />}
      </Stage>

      {/* Tối đa 1 Label tại một thời điểm, đặt góc dưới-trái thoáng sạch không đè lên vũ khí */}
      <Label
        t={t}
        text="4× AGM-114 HELLFIRE"
        x={390}
        y={920}
        from={63.32}
        until={65.8}
        size={48}
        bg={P.paper}
        fg={P.ink}
      />
      <Label
        t={t}
        text="2× GBU-12 · 227 KG"
        x={380}
        y={920}
        from={66.06}
        until={70.3}
        size={48}
        bg={P.paper}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S07;
