import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { CUE } from '../cues';
import { DESERT_TERRAIN, P, STAGE_HIGH_DAWN } from '../local/palette';
import { MQ1Predator, MQ9Reaper } from '../local/models';

// Địa hình hẻm núi sa mạc cao nguyên bình minh hùng vĩ: hẻm vực sâu thẳm uốn lượn bên dưới, hai dải cao nguyên đá đỏ trải rộng tới chân trời
const CANYON_H = heightField({
  seed: 23,
  amp: 15,
  scale: 155,
  oct: 5,
  add: (x, z) => {
    const meander = Math.sin(x / 135) * 38 + Math.cos(x / 78) * 14;
    const dz = z - meander;
    // Hẻm núi sâu hun hút dưới đường bay (-32 m)
    const gorge = -32 * Math.exp(-((dz / 52) ** 2));
    // Bậc thềm đá đỏ hai bên sườn thung lũng (đỉnh ~34-44 m, thấp hơn trần bay 118 m để tạo cảm giác độ cao lớn & lộ dải chân trời vàng)
    const leftPlateau =
      32 / (1 + Math.exp((dz + 92) / 22)) +
      14 * Math.exp(-(((dz + 185) / 56) ** 2)) +
      9 * Math.sin(x / 64) * Math.exp(-(((dz + 125) / 42) ** 2));
    const rightPlateau =
      30 / (1 + Math.exp(-(dz - 96) / 24)) +
      16 * Math.exp(-(((dz - 195) / 60) ** 2)) +
      8 * Math.cos(x / 70) * Math.exp(-(((dz - 130) / 42) ** 2));
    return gorge + leftPlateau + rightPlateau;
  },
});

const avoidExtremeSlopes = (x: number, z: number) => {
  const y = CANYON_H(x, z);
  return y > 26 || y < -28;
};

const S01: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ các giai đoạn bám chuẩn mốc CUE
  const openSettle = prog(t, -0.35, 2.5);
  const toFormation = prog(t, 4.9, CUE.s01_predator_compare + 0.08);
  const predGlideIn = prog(t, 4.85, CUE.s01_predator_compare);
  const overtake = prog(t, CUE.s01_overtake, 10.88);
  const bankImpulse = bump(t, CUE.s01_overtake, 2.05);

  // Độ cao tuần tra lớn trên hẻm núi (118 m so với đáy vực -32 m -> chênh cao 150 m hùng vĩ)
  const baseX = -32 + t * 15.0;
  const cruiseAlt = 118.0;

  // MQ-9 Reaper (sải cánh 20.12 m, dài 11.0 m, đuôi chữ Y hướng lên) — làn phải z = +10.2 m (bên phải khung hình khi bay đội hình hướng +X)
  const reaperX = baseX + overtake * 17.5;
  const reaperY = cruiseAlt + Math.sin(t * 1.05) * 0.28 + overtake * 2.9;
  const reaperZ = 10.2 - overtake * 1.8;
  // Giai đoạn 1 nghiêng nhẹ mở bụng & sải cánh đón nắng bình minh; tới 8.18s nghiêng cánh vọt tốc vượt lên
  const reaperRoll = lerp(-0.14, -0.05, openSettle) * (1 - toFormation) - bankImpulse * 0.22;
  const reaperPitch = 0.032 * (1 - toFormation * 0.4) + overtake * 0.042;

  // MQ-1 Predator (sải cánh 14.80 m, dài 8.22 m, đuôi chữ V chúc xuống) — làn trái z = -9.6 m (bên trái khung hình, cách tâm 19.8 m -> khe hở mút cánh 2.34 m)
  const predX = baseX - (1 - predGlideIn) * 18.0 - overtake * 1.0;
  const predY = cruiseAlt - 0.3 + Math.sin(t * 1.3 + 1.2) * 0.22;
  const predZ = -9.6 - (1 - predGlideIn) * 4.5 + overtake * 0.8;
  const predRoll = (1 - predGlideIn) * 0.1 + Math.sin(t * 0.95) * 0.02;

  // GIAI ĐOẠN 1 (0.0 - 5.2s): Góc 3/4 thấp ngước lên từ phía mũi-cánh phải đón nắng bình minh (sun = [58,22,28])
  // Đặt máy thấp hơn thân 4.1 m để tách rõ toàn bộ sải cánh 20 m, 4x Hellfire + 2x GBU-12, cầu mắt MTS-B trên nền dải chân trời hổ phách, đồng thời lộ bướu mũi SATCOM
  const p1Drift = prog(t, 0, 4.85);
  const cam1: V3 = [
    reaperX + lerp(14.2, 11.4, p1Drift),
    reaperY + lerp(-4.25, -3.35, p1Drift),
    reaperZ + lerp(13.2, 15.2, p1Drift),
  ];
  const look1: V3 = [
    reaperX + lerp(0.35, -0.15, p1Drift),
    reaperY + lerp(-0.45, -0.35, p1Drift),
    reaperZ + lerp(-0.8, -0.4, p1Drift),
  ];

  // GIAI ĐOẠN 2 (5.8 - 10.88s): Camera vòng mượt ra ngoài mút cánh phải sang góc Đội hình 3/4 trên-sau hướng thẳng về mặt trời bình minh (+X)
  // Giữ khoảng cách đủ rộng phía sau MQ-1 Predator kể cả khi MQ-9 Reaper vọt lên để không bao giờ cắt mút cánh trái của MQ-1
  const orbitOut = Math.sin(toFormation * Math.PI) * 14.5;
  const cam2: V3 = [
    baseX - 29.8 + overtake * 1.6,
    cruiseAlt + 7.5 + overtake * 1.4,
    0.3 - overtake * 0.3,
  ];
  const look2: V3 = [
    baseX + 7.5 + overtake * 8.5,
    cruiseAlt - 1.9 + overtake * 1.3,
    0.3 + overtake * 0.6,
  ];

  const camPos: V3 = [
    lerp(cam1[0], cam2[0], toFormation),
    lerp(cam1[1], cam2[1], toFormation),
    lerp(cam1[2], cam2[2], toFormation) + orbitOut,
  ];
  const camLook: V3 = [
    lerp(look1[0], look2[0], toFormation),
    lerp(look1[1], look2[1], toFormation),
    lerp(look1[2], look2[2], toFormation),
  ];
  const fov = lerp(42, 46, toFormation);

  // Pha cánh quạt liên tục, tăng tốc khi Reaper vọt vượt lên ở 8.18s
  const reaperProp = t * 42 + overtake * overtake * 20;

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_HIGH_DAWN}
        shadowArea={30}
        shadowCenter={[baseX + overtake * 8, cruiseAlt, 0.3]}
      >
        <Cam pos={camPos} look={camLook} fov={fov} roll={lerp(0.03, 0, toFormation)} />

        {/* Địa hình hẻm núi cao nguyên sa mạc trải rộng 1600 m tới sương chân trời + đá & bụi cây khô tỉ lệ thực */}
        <Terrain h={CANYON_H} size={1600} seg={256} center={[110, 0]} colors={DESERT_TERRAIN} grainRepeat={72} />
        <Scatter
          kind="rock"
          count={320}
          area={[-380, -380, 620, 380]}
          h={CANYON_H}
          seed={31}
          scale={[0.9, 2.6]}
          tint="#b48a64"
        />
        <Scatter
          kind="bush"
          count={220}
          area={[-340, -320, 560, 320]}
          h={CANYON_H}
          seed={47}
          scale={[0.8, 1.8]}
          avoid={avoidExtremeSlopes}
          tint="#8f784d"
        />

        {/* Chủ thể chính: MQ-9 Reaper full tải vũ khí (4x AGM-114 Hellfire + 2x GBU-12 Paveway II) */}
        <MQ9Reaper
          position={[reaperX, reaperY, reaperZ]}
          rotation={[reaperRoll, 0, reaperPitch]}
          gearDown={0}
          loadout="full"
          propSpin={reaperProp}
          sensorYaw={Math.sin(t * 0.8) * 0.35}
          sensorPitch={0.3}
        />

        {/* Thế hệ tiền nhiệm: MQ-1 Predator (nhỏ hơn rõ rệt, sải cánh 14.8m, đuôi chữ V chúc xuống) bay song song bên trái */}
        {t > 4.85 && (
          <MQ1Predator
            position={[predX, predY, predZ]}
            rotation={[predRoll, 0, 0.015]}
            gearDown={0}
            armed={true}
            propSpin={t * 48}
          />
        )}
      </Stage>

      {/* Tối đa 1 nhãn HTML tại một thời điểm, đặt thoáng không đè lên phi cơ */}
      <Label
        t={t}
        text="MQ-9 REAPER"
        x={320}
        y={905}
        from={0.4}
        until={3.7}
        size={52}
        bg={P.paper}
        fg={P.ink}
      />
      <Label
        t={t}
        text="MQ-1 PREDATOR"
        x={410}
        y={890}
        from={6.3}
        until={8.5}
        size={48}
        bg={P.paper}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S01;
