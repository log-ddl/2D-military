// C01S03 (38.68–48.98 s, 3D stormDawn):
// Góc cực thấp dưới đáy hõm sóng 30 ft ngước nhìn tàu tuần tiễu Nhật No. 23 Nitto Maru (70 tấn, dài 30 m)
// tròng trành dữ dội -> đẩy sát mạn mũi trái đặc tả số "23" sơn trắng tại CUE.c01_s03_num23 (41.90 s)
// kèm <Label text="NO. 23 NITTO MARU" /> -> trượt lùi dọc mạn trái ra sau lái từ 44.15 s phô bày 2 cột ăng-ten,
// cờ Hải quân Nhật và tại CUE.c01_s03_spot (47.66 s) bật wheelhouseGlow khi chân trời phía trước lộ rõ bóng
// sừng sững của hạm đội Mỹ (USSHornet + USSNashville).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS } from '../design/palette';
import { NittoMaru } from '../parts/NittoMaru';
import { USSHornet } from '../parts/USSHornet';
import { USSNashville } from '../parts/USSNashville';
import { OceanSurface, waveY, shipPose } from '../parts/OceanSurface';

const SWELL = 4.35;

/** Bụi bọt sóng mềm (soft sprite mist) vỗ quanh sống mũi & luồng chân vịt Nitto Maru — không dùng khối cầu cứng */
const TrawlerSeaSpray: React.FC<{ t: number; nittoY: number; nittoPitch: number }> = ({
  t,
  nittoY,
  nittoPitch,
}) => {
  const sprayMats = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => {
        const m = new THREE.SpriteMaterial({
          map: softDot(),
          color: i < 8 ? '#e6f2f8' : '#c6dae6',
          transparent: true,
          depthWrite: false,
        });
        return m;
      }),
    [],
  );

  // Các cụm sương bọt nước mềm sát mặt sóng dọc sống mũi (x=+14.6) và luồng đuôi (x=-15..-26), tránh hoàn toàn vùng số "23" (x=9.9, y=3.0)
  const anchors: { x: number; z: number; size: number; op: number; lift: number }[] = [
    { x: 14.8, z: -0.9, size: 3.1, op: 0.34, lift: 0.55 },
    { x: 14.4, z: 0.8, size: 2.8, op: 0.28, lift: 0.45 },
    { x: 13.4, z: -1.8, size: 2.5, op: 0.24, lift: 0.22 },
    { x: 5.5, z: -3.1, size: 3.2, op: 0.2, lift: 0.12 },
    { x: -1.5, z: -3.2, size: 3.6, op: 0.2, lift: 0.12 },
    { x: -8.5, z: -2.9, size: 3.8, op: 0.22, lift: 0.14 },
    { x: -15.4, z: -0.6, size: 4.4, op: 0.3, lift: 0.22 },
    { x: -18.8, z: 0.3, size: 5.2, op: 0.26, lift: 0.18 },
    { x: -23.0, z: 0.7, size: 6.0, op: 0.2, lift: 0.14 },
  ];

  // Bụi nước tung nhẹ ở đầu mũi khi mũi tàu bổ xuống hõm sóng
  const bowDip = Math.max(0, -nittoPitch * 3.2 + Math.sin(t * 1.9 + 0.5) * 0.45);

  return (
    <group>
      {anchors.map((a, idx) => {
        const mat = sprayMats[idx];
        const pulse = 0.85 + 0.25 * Math.sin(t * 2.7 + idx * 1.37);
        const isBow = idx < 3;
        const extra = isBow ? bowDip * 0.55 : 0;
        mat.opacity = Math.min(0.46, a.op * pulse + extra * 0.22);
        mat.rotation = idx * 0.9 + t * 0.22;
        const wy = Math.max(waveY(a.x, a.z, t, SWELL), isBow ? nittoY - 0.6 : -99) + a.lift + extra * 0.7;
        const s = a.size * (pulse + extra * 0.45);
        return <sprite key={idx} material={mat} position={[a.x, wy, a.z]} scale={[s, s * 0.58, s]} />;
      })}
    </group>
  );
};

const C01S03: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // Chuyển động tròng trành dữ dội ±17° của tàu tuần tiễu 70 tấn giữa sóng bão 30 ft
  const rawPose = shipPose(0, 0, 30.0, 5.8, t, SWELL);
  const close23Window = prog(t, 41.3, 42.15) * (1 - prog(t, 43.9, 44.8));
  const extraStormRoll = Math.sin(t * 1.56 + 0.52) * lerp(0.19, 0.09, close23Window);
  const nittoRoll = rawPose.roll + extraStormRoll;
  const nittoPitch = rawPose.pitch * lerp(1.16, 0.9, close23Window);
  const nittoY = rawPose.y;

  // Tọa độ thế giới chính xác của chữ số sơn trắng "23" bên mạn mũi trái (local: [9.88, 2.96, -1.92])
  const p23World = useMemo(() => new THREE.Vector3(), []);
  const shipEuler = useMemo(() => new THREE.Euler(), []);
  shipEuler.set(nittoRoll, 0, nittoPitch, 'XYZ');
  p23World.set(9.88, 2.96, -1.92).applyEuler(shipEuler);
  p23World.y += nittoY;

  // Bật đèn ấm buồng lái tại CUE.c01_s03_spot (47.66 s) khi phát hiện bóng hạm đội Mỹ
  const spotOn = t >= CUE.c01_s03_spot;
  const spotGlow = prog(t, CUE.c01_s03_spot - 0.06, CUE.c01_s03_spot + 0.45);

  // Hạm đội Mỹ sừng sững ở đường chân trời phía trước mũi Nitto Maru (~225–250 m trong sương muối stormDawn [95, 480])
  const hornetX = 228 + (t - 44.0) * 1.6;
  const hornetZ = 34;
  const hornetHeading = -2.28; // chéo mạn lộ rõ biên dạng sàn đáp phẳng & Đảo chỉ huy khổng lồ
  const hornetPose = shipPose(hornetX, hornetZ, 251.4, 35.0, t, SWELL, hornetHeading);

  const nashX = 196 + (t - 44.0) * 2.4;
  const nashZ = -14;
  const nashHeading = -2.22; // tuần dương hạm USS Nashville hộ tống phía trước đội hình
  const nashPose = shipPose(nashX, nashZ, 185.4, 18.8, t, SWELL, nashHeading);

  // ---------------- Quỹ đạo Camera 3 nhịp rõ rệt theo đúng từng cụm từ voice ----------------
  // Nhịp 1a (38.68 -> 40.85 s, "Bobbing 11 miles away"): Góc thấp dưới đáy hõm sóng nhìn toàn thân tàu nhỏ bé dập dềnh
  const pApproach = prog(t, 38.68, 40.85);
  // Nhịp 1b -> 2 (40.75 -> 42.05 s, "is the number... 23. Nito Maru"): Đẩy nhanh vào cận cảnh chữ số sơn trắng "23"
  const pZoom23 = prog(t, 40.75, CUE.c01_s03_num23 + 0.18);
  const pHold23 = prog(t, CUE.c01_s03_num23, 44.05);
  // Nhịp 3 (44.05 -> 48.98 s, "A 70-ton Japanese picket boat... spot American warships"):
  // Trượt lùi dọc mạn trái ra sau lái, mở trọn 2 cột ăng-ten, cờ IJN và bóng hạm đội Mỹ sừng sững ở chân trời
  const pPullAft = prog(t, 44.02, CUE.c01_s03_spot + 0.15);
  const pTailSettle = prog(t, CUE.c01_s03_spot - 0.1, 48.98);

  const troughCamX = lerp(26.5, 19.8, pApproach);
  const troughCamY = lerp(2.85, 3.35, pApproach);
  const troughCamZ = lerp(-16.8, -12.6, pApproach);

  const closeCamX = lerp(13.9, 12.7, pHold23);
  const closeCamY = p23World.y + lerp(0.3, 0.45, pHold23);
  const closeCamZ = lerp(-7.2, -7.9, pHold23);

  const fwdCamX = lerp(troughCamX, closeCamX, pZoom23);
  const fwdCamY = lerp(troughCamY, closeCamY, pZoom23);
  const fwdCamZ = lerp(troughCamZ, closeCamZ, pZoom23);

  const aftCamX = lerp(-22.8, -25.8, pTailSettle);
  const aftCamY = lerp(6.9, 7.5, pTailSettle);
  const aftCamZ = lerp(-14.2, -15.6, pTailSettle);

  const camX = lerp(fwdCamX, aftCamX, pPullAft);
  const desiredY = lerp(fwdCamY, aftCamY, pPullAft);
  const camZ = lerp(fwdCamZ, aftCamZ, pPullAft);

  const troughLookX = lerp(2.8, 5.8, pApproach);
  const troughLookY = nittoY + lerp(4.5, 3.9, pApproach);
  const troughLookZ = lerp(0.2, -0.8, pApproach);

  const lookCloseX = p23World.x - 0.12;
  const lookCloseY = p23World.y + 0.05;
  const lookCloseZ = p23World.z + 0.15;

  const lookFwdX = lerp(troughLookX, lookCloseX, pZoom23);
  const lookFwdY = lerp(troughLookY, lookCloseY, pZoom23);
  const lookFwdZ = lerp(troughLookZ, lookCloseZ, pZoom23);

  const lookAftX = lerp(4.8, 7.0, pTailSettle);
  const lookAftY = lerp(5.45, 5.2, pTailSettle);
  const lookAftZ = lerp(2.0, 1.35, pTailSettle);

  const lookX = lerp(lookFwdX, lookAftX, pPullAft);
  const lookY = lerp(lookFwdY, lookAftY, pPullAft);
  const lookZ = lerp(lookFwdZ, lookAftZ, pPullAft);

  // Luôn kẹp camY >= waveY(camX, camZ, t, swell) + 1.68 m và kiểm tra sóng ngay trước ống kính để không bao giờ bị sóng cắt che mù
  const dirX = lookX - camX;
  const dirZ = lookZ - camZ;
  const dirLen = Math.max(0.001, Math.hypot(dirX, dirZ));
  const nearWave = Math.max(
    waveY(camX, camZ, t, SWELL) + 1.68,
    waveY(camX + (dirX / dirLen) * 3.0, camZ + (dirZ / dirLen) * 3.0, t, SWELL) + 1.25,
  );
  const camY = Math.max(desiredY, nearWave);

  const camPos: V3 = [camX, camY, camZ];
  const camLook: V3 = [lookX, lookY, lookZ];
  const camFov = lerp(lerp(43.5, 37.5, pZoom23), 42, pPullAft);
  const camRoll = Math.sin(t * 1.35 + 0.4) * lerp(0.034, 0.015, close23Window);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
      <Stage
        {...STAGE_PRESETS.stormDawn}
        width={W}
        height={H}
        shadowArea={42}
        shadowCenter={[0, 4, 0]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Ánh sáng môi trường phản xạ nhẹ từ bọt sóng xám bạc lên mạn trái tàu để chữ số "23" nổi sắc nét */}
        <directionalLight position={[-18, 14, -36]} color="#adc2d4" intensity={0.55} />

        {/* Mặt biển bão Tây Thái Bình Dương sóng cao 30 ft (swell = 4.35 m) */}
        <OceanSurface t={t} swell={SWELL} size={1160} seg={176} center={[55, 10]} palette="stormPacific" />

        {/* Bụi bọt sóng mềm quanh sống mũi & luồng chân vịt */}
        <TrawlerSeaSpray t={t} nittoY={nittoY} nittoPitch={nittoPitch} />

        {/* Tàu tuần tiễu vũ trang Nhật No. 23 Nitto Maru (70 tấn, dài 30.0 m) */}
        <group position={[0, nittoY, 0]} rotation={[nittoRoll, 0, nittoPitch]}>
          <NittoMaru damage={0} wheelhouseGlow={spotOn} />
          {spotGlow > 0.01 && (
            <pointLight
              color="#ffaa38"
              intensity={28 * spotGlow}
              distance={11}
              decay={1.6}
              position={[-0.15, 6.05, -0.35]}
            />
          )}
        </group>

        {/* Bóng sừng sững của Hạm đội Đặc nhiệm 16 Mỹ ở đường chân trời (~225–250 m phía trước mũi Nitto Maru) */}
        <group
          position={[hornetX, hornetPose.y * 0.45, hornetZ]}
          rotation={[hornetPose.roll * 0.4, hornetHeading, hornetPose.pitch * 0.4]}
          scale={0.55}
        >
          <USSHornet hullNumber="8" showLaunchLines={false} flagWave={t * 4.8} />
        </group>

        <group
          position={[nashX, nashPose.y * 0.45, nashZ]}
          rotation={[nashPose.roll * 0.4, nashHeading, nashPose.pitch * 0.4]}
          scale={0.58}
        >
          <USSNashville turretYaw={-0.25} gunElev={0.1} />
        </group>
      </Stage>

      {/* Nhãn định danh duy nhất của cảnh: bật tại CUE.c01_s03_num23 (41.90 s), đóng dứt khoát lúc 48.25 s */}
      <Label
        t={t}
        text="NO. 23 NITTO MARU"
        x={380}
        y={885}
        from={CUE.c01_s03_num23}
        until={48.25}
      />
    </div>
  );
};

export default C01S03;
