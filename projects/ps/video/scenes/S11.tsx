import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Label, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL2D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';
import { Kinzhal, PatriotLauncher, PatriotRadar } from '../local/models';

const DIVE_DEG = 42;
const DIVE_RAD = (DIVE_DEG * Math.PI) / 180;
const DIVE_DIR: V3 = [Math.cos(DIVE_RAD), -Math.sin(DIVE_RAD), 0];

// Điểm chạm đất dự báo của quỹ đạo rơi thẳng tắp ("phi tiêu 1 tấn") ngay trong khu vực thung lũng Patriot
const IMPACT_POS: V3 = [128, 0.25, 2];

// Bố trí trận địa Patriot dưới lòng thung lũng ở cự ly gần rõ nét:
// Đài radar đặt lệch cánh (-Z = -20 m) để chùm sóng xanh dài 44 m chiếu xiên chéo nổi bật bắt dính vào Kinzhal
const RADAR_POS: V3 = [114, 0, -20];
const RADAR_YAW = Math.PI + 0.46;
const LAUNCHER_1_POS: V3 = [106, 0, -4];
const LAUNCHER_2_POS: V3 = [118, 0, 14];

// Địa hình thung lũng thảo nguyên Đông Âu: hai sườn đồi hai bên ôm lấy lòng thung lũng mở tầm nhìn ra chân trời bình minh
const VALLEY_H = heightField({
  seed: 113,
  amp: 6.2,
  scale: 140,
  oct: 5,
  flats: [
    [113, -3, 30, 0],
    [RADAR_POS[0], RADAR_POS[2], 12, 0],
    [LAUNCHER_1_POS[0], LAUNCHER_1_POS[2], 12, 0],
    [LAUNCHER_2_POS[0], LAUNCHER_2_POS[2], 12, 0],
  ],
  add: (x, z) => {
    const northHill = 22 * Math.exp(-(((z + 96) / 54) ** 2));
    const southHill = 20 * Math.exp(-(((z - 98) / 56) ** 2));
    const farRidge = 13 * Math.exp(-(((x - 265) / 80) ** 2));
    return northHill + southHill + farRidge;
  },
});

const avoidBattery = (x: number, z: number) =>
  Math.hypot(x - 114, z + 2) < 33 || (x > 85 && x < 142 && Math.abs(z) < 12);

/** Khoảng cách còn lại từ tâm Kinzhal tới điểm rơi: lao nhanh ở đầu cảnh rồi bị ma sát khí quyển ghìm chậm rõ rệt. */
function distToImpact(tau: number): number {
  const dt = Math.max(0, tau - 156.4);
  const vInitial = 14.8;
  const vTerminal = 3.6;
  const dragTau = 3.7;
  const traveled = vTerminal * dt + (vInitial - vTerminal) * dragTau * (1 - Math.exp(-dt / dragTau));
  return Math.max(38, 156 - traveled);
}

function kinzhalDivePos(tau: number): V3 {
  const d = distToImpact(tau);
  return [
    IMPACT_POS[0] - DIVE_DIR[0] * d,
    IMPACT_POS[1] - DIVE_DIR[1] * d,
    IMPACT_POS[2],
  ];
}

const S11: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const kPos = kinzhalDivePos(t);

  // Nửa đầu (156.7–163.2s): thân tên lửa rung lắc nhẹ vì ma sát khí động khổng lồ;
  // Nửa sau (từ 163.5s): mất khả năng cơ động -> cứng đờ trên một đường thẳng đuột dễ đoán
  const buffetAmp = 0.024 * (1 - prog(t, 160.2, 164.0));
  const pitchVib = buffetAmp * Math.sin(t * 39.0);
  const yawVib = buffetAmp * 0.75 * Math.cos(t * 33.0);
  const rollVib = buffetAmp * 1.4 * Math.sin(t * 27.0 + 1.1);

  // Vỏ plasma ma sát khí quyển đỏ rực ở mũi (~0.95), trong khi đuôi tắt ngấm hoàn toàn (plume = 0)
  const heatGlow = lerp(0.98, 0.9, prog(t, CUE.s11_slow_down, 171.0));

  // Góc máy POV bổ nhào từ trên-sau vai phải (+Z) của Kinzhal nhìn xuyên qua mũi xuống trận địa Patriot & chân trời bình minh
  const pRevealBattery = prog(t, CUE.s11_patriot_zone - 1.2, CUE.s11_patriot_zone + 2.8);

  const camBuffetY = 0.13 * (1 - pRevealBattery) * Math.sin(t * 24.0);
  const camBuffetZ = 0.1 * (1 - pRevealBattery) * Math.cos(t * 21.0);

  const camPos: V3 = [
    kPos[0] + lerp(-5.5, -8.0, pRevealBattery),
    kPos[1] + lerp(2.65, 4.35, pRevealBattery) + camBuffetY,
    kPos[2] + lerp(4.2, 5.9, pRevealBattery) + camBuffetZ,
  ];

  const closeLook: V3 = [kPos[0] + 8.6, kPos[1] - 5.8, kPos[2] - 1.2];
  const batteryFocus: V3 = [
    lerp(kPos[0] + 5.2, 114, 0.5),
    lerp(kPos[1] - 3.8, 3.8, 0.5),
    -3.2,
  ];
  const camLook: V3 = [
    lerp(closeLook[0], batteryFocus[0], pRevealBattery),
    lerp(closeLook[1], batteryFocus[1], pRevealBattery),
    lerp(closeLook[2], batteryFocus[2], pRevealBattery),
  ];

  // Tính góc lái tia điện tử chính xác trong hệ toạ độ của PatriotRadar (xoay Y = RADAR_YAW) để khoá cứng vào Kinzhal
  const cosR = Math.cos(RADAR_YAW);
  const sinR = Math.sin(RADAR_YAW);
  const beamOriginWorld: V3 = [
    RADAR_POS[0] + 3.28 * cosR,
    RADAR_POS[1] + 3.06,
    RADAR_POS[2] - 3.28 * sinR,
  ];
  const wx = kPos[0] - beamOriginWorld[0];
  const wy = kPos[1] - beamOriginWorld[1];
  const wz = kPos[2] - beamOriginWorld[2];
  const lx = Math.max(0.5, wx * cosR - wz * sinR);
  const lz = wx * sinR + wz * cosR;
  const beamYaw = Math.atan2(-lz, lx);
  const beamPitch = Math.atan2(wy, Math.hypot(lx, lz));

  const radarActive = t >= CUE.s11_patriot_zone - 0.9;
  const radarGlow = lerp(0.4, 1.25, prog(t, CUE.s11_patriot_zone - 0.7, CUE.s11_patriot_zone + 1.0));

  // Đường thẳng tắp dự báo điểm rơi từ mũi Kinzhal xuống thung lũng Patriot
  const nosePos: V3 = [
    kPos[0] + DIVE_DIR[0] * 3.65,
    kPos[1] + DIVE_DIR[1] * 3.65,
    kPos[2],
  ];
  const predictedPts: V3[] = [
    nosePos,
    [lerp(nosePos[0], IMPACT_POS[0], 0.33), lerp(nosePos[1], IMPACT_POS[1], 0.33), IMPACT_POS[2]],
    [lerp(nosePos[0], IMPACT_POS[0], 0.66), lerp(nosePos[1], IMPACT_POS[1], 0.66), IMPACT_POS[2]],
    IMPACT_POS,
  ];
  const predictUpto = prog(t, CUE.s11_patriot_zone + 0.15, CUE.s11_patriot_zone + 2.2);

  // Vùng bóng đổ sắc nét chuyển mượt từ thân Kinzhal xuống toàn bộ khẩu đội Patriot
  const pShadow = prog(t, CUE.s11_patriot_zone - 0.6, CUE.s11_patriot_zone + 2.2);
  const shadowCenter: V3 = [
    lerp(kPos[0], 113, pShadow),
    lerp(kPos[1], 2, pShadow),
    lerp(kPos[2], -3, pShadow),
  ];
  const shadowArea = lerp(16, 38, pShadow);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_DAWN} shadowCenter={shadowCenter} shadowArea={shadowArea} fog={[185, 820]}>
        <Cam pos={camPos} look={camLook} fov={lerp(42, 47, pRevealBattery)} roll={lerp(-0.04, -0.015, pRevealBattery)} />

        {/* Địa hình thung lũng thảo nguyên bình minh Đông Âu */}
        <Terrain
          h={VALLEY_H}
          size={720}
          seg={220}
          center={[130, 0]}
          colors={TERRAIN_STEPPE}
          grainRepeat={46}
        />

        {/* Rừng thông, bụi cây và đá thảo nguyên bao quanh sườn thung lũng */}
        <Scatter
          kind="pine"
          count={145}
          area={[-20, -165, 275, 165]}
          h={VALLEY_H}
          seed={17}
          scale={[0.85, 1.45]}
          avoid={avoidBattery}
          tint="#b8c7b4"
        />
        <Scatter
          kind="bush"
          count={105}
          area={[15, -130, 240, 130]}
          h={VALLEY_H}
          seed={29}
          scale={[0.75, 1.3]}
          avoid={avoidBattery}
          tint="#a9b89e"
        />
        <Scatter
          kind="rock"
          count={60}
          area={[10, -140, 245, 140]}
          h={VALLEY_H}
          seed={41}
          scale={[0.7, 1.45]}
          avoid={avoidBattery}
        />

        {/* Trận địa khẩu đội Patriot dưới thung lũng: 1 đài radar AN/MPQ-65 phát chùm sóng xanh + 2 bệ phóng M903 */}
        <PatriotRadar
          position={RADAR_POS}
          rotation={[0, RADAR_YAW, 0]}
          activeGlow={radarGlow}
          showBeam={radarActive}
          beamAngle={[beamYaw, beamPitch]}
        />
        <PatriotLauncher
          position={LAUNCHER_1_POS}
          rotation={[0, Math.PI - 0.1, 0]}
          elev={44}
          loadedCount={16}
        />
        <PatriotLauncher
          position={LAUNCHER_2_POS}
          rotation={[0, Math.PI + 0.24, 0]}
          elev={42}
          loadedCount={16}
        />

        {/* Quả Kinzhal tắt sạch động cơ (plume = 0), mũi nung đỏ rực plasma ma sát (heatGlow), bổ nhào 42° */}
        <Kinzhal
          plume={0}
          heatGlow={heatGlow}
          position={kPos}
          rotation={[rollVib, yawVib, -DIVE_RAD + pitchVib]}
        />

        {/* Đường dự báo điểm rơi thẳng tắp cực kỳ dễ đoán từ mũi Kinzhal xuống đất */}
        {predictUpto > 0.01 && (
          <Trail
            points={predictedPts}
            upto={predictUpto}
            color="#ff4d4d"
            width={0.09}
            opacity={0.58}
          />
        )}

        {/* Vòng chỉ thị điểm chạm đất dự báo dưới thung lũng */}
        {predictUpto > 0.85 && (
          <group position={[IMPACT_POS[0], 0.14, IMPACT_POS[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <mesh>
              <ringGeometry args={[1.45, 1.9, 36]} />
              <meshBasicMaterial
                color="#ff4d4d"
                transparent
                opacity={0.65 * prog(t, CUE.s11_patriot_zone + 1.8, CUE.s11_patriot_zone + 2.6)}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <circleGeometry args={[0.5, 24]} />
              <meshBasicMaterial
                color="#ff4d4d"
                transparent
                opacity={0.52 * prog(t, CUE.s11_patriot_zone + 1.8, CUE.s11_patriot_zone + 2.6)}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}
      </Stage>

      {/* Nhãn duy nhất */}
      <Label
        t={t}
        text="1 TẤN"
        x={960}
        y={150}
        from={CUE.s11_one_ton_dart}
        until={173.0}
        bg={PAL2D.red}
        fg="#ffffff"
      />
    </AbsoluteFill>
  );
};

export default S11;
