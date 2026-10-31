import React from 'react';
import { Easing } from 'remotion';
import { useT, prog, lerp } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { DustTrail } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { LOOK_DUSK_EVOLUTION } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { M1E3Abrams } from '../parts/M1E3Abrams';

// ---------------- Hệ trục đội hình sóng đôi hướng ngược nắng xiên chạng vạng ----------------
// Xoay trục tiến của 2 xe lệch 0.24 rad (~13.8°) để:
// 1) Nắng chạng vạng [72, 16, 26] tạt rực rỡ dọc sườn, bánh xích, tháp pháo và 2 dải bụi vàng cam;
// 2) Quầng mặt trời trắng nằm hẳn ngoài biên phải khung hình, giữ bầu trời cam-tím sâu thẳm sạch tuyệt đối.
const TANK_YAW = Math.PI + 0.24;
const FX = Math.cos(TANK_YAW);  // -0.9713 (hướng mũi xe)
const FZ = -Math.sin(TANK_YAW); // +0.2377
const RX = Math.sin(TANK_YAW);  // -0.2377 (bên phải thân xe = bên trái màn hình)
const RZ = Math.cos(TANK_YAW);  // -0.9713
const LX = -RX;                 // +0.2377 (bên trái thân xe = bên phải màn hình, hướng đón nắng)
const LZ = -RZ;                 // +0.9713

/** Đổi toạ độ đội hình (fwd: mét tiến về phía trước qua đỉnh đồi, lat: mét ngang trái/phải màn hình) sang (x, z). */
const toWorldXZ = (fwd: number, lat: number): [number, number] => [
  fwd * FX + lat * LX,
  fwd * FZ + lat * LZ,
];

// ---------------- Địa hình sống đồi chạng vạng (cấp module, tất định 100%) ----------------
const H = heightField({
  seed: 411,
  amp: 1.05,
  scale: 115,
  oct: 4,
  add: (x, z) => {
    // Sống đồi chính chạy vuông góc với hướng tiến đội hình (fwd = 0 là đỉnh sống đồi)
    const fwd = x * FX + z * FZ;
    const lat = x * LX + z * LZ;
    const mainCrest = 5.35 * Math.exp(-((fwd / 34) ** 2));

    // Vai đồi uốn lượn tự nhiên hai bên cánh (ngoài hành lang đội hình |lat| > 6.8)
    const flankMask = Math.min(1, Math.max(0, (Math.abs(lat) - 6.8) / 13));
    const flankShoulder = flankMask * 1.65 * Math.sin(lat * 0.06 + 0.5) * Math.exp(-(((fwd + 4) / 40) ** 2));

    // Dãy đồi xa mờ trong sương chạng vạng phía chân trời sau lưng xe (fwd ~ -145 m)
    const distantRidge = 18.5 * Math.exp(-(((fwd + 148) / 46) ** 2)) * (0.76 + 0.26 * Math.cos(lat * 0.025));
    return mainCrest + flankShoulder + distantRidge;
  },
});

// Làn chạy song song rộng thoáng (cách tâm 8.1 m -> vừa có góc 3/4 lộ rõ hàng bánh xích cả 2 xe vừa tách bạch tuyệt đối tới 668.71s):
// M1A2 SEPv3 bên trái màn hình (lat < 0), M1E3 Abrams bên phải màn hình (lat > 0)
const LAT_M1A2 = -4.25;
const LAT_M1E3 = 3.85;

// Chừa sạch 2 vệt bánh xích và vùng sát trước ống kính để có đá/bụi cỏ nhỏ tự nhiên ở trung cảnh mà không chắn mép khung
const avoidTracksAndLens = (x: number, z: number) => {
  const fwd = x * FX + z * FZ;
  const lat = x * LX + z * LZ;
  if (fwd > -22 && fwd < 19) {
    if (Math.abs(lat - LAT_M1A2) < 2.35) return true;
    if (Math.abs(lat - LAT_M1E3) < 2.30) return true;
  }
  // Chỉ dọn vùng ngay sát trước ống kính camera (fwd ~ 14.5..26)
  if (fwd > 14.2 && fwd < 26.5 && lat > -1.0 && lat < 9.8) return true;
  return false;
};

const T_BASE = 661.8;
const FWD_START = -2.1; // Ngay từ 661.80s cả 2 xe đã sừng sững sát đỉnh sống đồi, lộ trọn 100% bánh xích
const BASE_SPEED = 1.12; // m/s tiến đầm chắc vượt qua đỉnh đồi

/** Quãng tiến fwd(tau) của M1A2 SEPv3 (hỗ trợ ngoại suy mượt trước 661.8s cho DustTrail). */
function m1a2Fwd(tau: number): number {
  return FWD_START + (tau - T_BASE) * BASE_SPEED;
}

/** Quãng tiến fwd(tau) của M1E3 Abrams: sóng đôi cùng M1A2, rồi bứt tốc vươn lên nửa thân xe (~3.4 m) ở CUE.c04_s11_evolve. */
function m1e3Fwd(tau: number): number {
  const base = FWD_START + (tau - T_BASE) * BASE_SPEED;
  const surge = 3.4 * prog(tau, CUE.c04_s11_evolve - 0.25, 668.55, Easing.bezier(0.32, 0.0, 0.18, 1.0));
  return base + surge;
}

/**
 * Tính toạ độ thế giới (x, y, z) và góc nghiêng cục bộ (pitch, roll) theo đúng mặt phẳng tiếp tuyến sống đồi
 * dưới 4 góc dải xích để toàn bộ bánh chịu nặng bám khít mặt đất (không hở sáng, không lún sâu).
 */
function sampleTankTerrainPose(fwd: number, lat: number, halfWheelbase: number, halfTrack: number, sinkBias: number) {
  const [xc, zc] = toWorldXZ(fwd, lat);
  const [xf, zf] = toWorldXZ(fwd + halfWheelbase, lat);
  const [xr, zr] = toWorldXZ(fwd - halfWheelbase, lat);
  // Trong hệ cục bộ xe: +Z_local là bên phải thân xe (RX, RZ -> giảm lat), -Z_local là bên trái thân xe (LX, LZ -> tăng lat)
  const [xRight, zRight] = toWorldXZ(fwd, lat - halfTrack);
  const [xLeft, zLeft] = toWorldXZ(fwd, lat + halfTrack);

  const yFront = H(xf, zf);
  const yRear = H(xr, zr);
  const yRight = H(xRight, zRight);
  const yLeft = H(xLeft, zLeft);

  const pitch = Math.atan2(yFront - yRear, 2 * halfWheelbase);
  const roll = Math.atan2(yLeft - yRight, 2 * halfTrack);
  const yChord = 0.5 * (yFront + yRear);
  const yc = yChord - sinkBias;

  return { xc, yc, zc, pitch, roll };
}

// Điểm phát sinh bụi vàng cam sau bánh chủ động đuôi xe
const m1a2DustMain = (tau: number): V3 => {
  const [x, z] = toWorldXZ(m1a2Fwd(tau) - 3.4, LAT_M1A2);
  return [x, H(x, z) + 0.08, z];
};
const m1a2DustSun = (tau: number): V3 => {
  const [x, z] = toWorldXZ(m1a2Fwd(tau) - 2.85, LAT_M1A2 + 1.48);
  return [x, H(x, z) + 0.06, z];
};

const m1e3DustMain = (tau: number): V3 => {
  const [x, z] = toWorldXZ(m1e3Fwd(tau) - 3.2, LAT_M1E3);
  return [x, H(x, z) + 0.08, z];
};
const m1e3DustSun = (tau: number): V3 => {
  const [x, z] = toWorldXZ(m1e3Fwd(tau) - 2.65, LAT_M1E3 + 1.34);
  return [x, H(x, z) + 0.06, z];
};

const C04S11: React.FC = () => {
  const t = useT();

  // ---------------- 1. Vị trí & góc bám mặt dốc sống đồi của 2 thế hệ Abrams ----------------
  const fwdA2 = m1a2Fwd(t);
  const fwdE3 = m1e3Fwd(t);

  // sinkBias = 0.024 m cho M1A2 và 0.006 m cho M1E3 để guốc xích cao su ép đầm xuống cát đồi, triệt tiêu khe hở ngược sáng
  const poseA2 = sampleTankTerrainPose(fwdA2, LAT_M1A2, 2.55, 1.51, 0.024);
  const poseE3 = sampleTankTerrainPose(fwdE3, LAT_M1E3, 2.25, 1.35, 0.006);

  const travelA2 = (fwdA2 - FWD_START + 4.0) / 0.996;
  const travelE3 = (fwdE3 - FWD_START + 4.0) / 0.996;

  // Nhún giảm xóc thanh xoắn nhẹ của M1A2 khi cán qua đỉnh đồi
  const suspensionSettle = 0.01 * Math.sin((t - 661.8) * 2.3);

  // ---------------- 2. Biến chuyển tiến hoá của M1E3 (CUE.c04_s11_evolve -> c04_s11_above) ----------------
  const evolveP = prog(t, CUE.c04_s11_evolve - 0.15, CUE.c04_s11_above - 0.2, Easing.bezier(0.24, 0.1, 0.2, 1));
  const patrolScan = 0.16 * Math.sin((t - 661.8) * 1.15);

  // Đúng CUE.c04_s11_evolve (665.88), trạm RWS 30mm + radar AESA xoay tách khỏi trục pháo chính và ngẩng cao ~46° (0.81 rad) quét bầu trời
  const rwsYaw = lerp(patrolScan, 0.64 + 0.09 * Math.sin((t - CUE.c04_s11_evolve) * 2.1), evolveP);
  const rwsPitch = lerp(0.14, 0.81, evolveP);

  // Pháo chính 120mm của hai thế hệ giữ ổn định con quay hướng về tiền phương
  const gunPitchA2 = Math.max(-0.04, 0.055 - poseA2.pitch * 0.65);
  const gunPitchE3 = Math.max(-0.04, 0.06 - poseE3.pitch * 0.65);

  // ---------------- 3. Camera góc thấp sát sườn đồi -> ngước lên bầu trời chạng vạng cam-tím ----------------
  const driftP = prog(t, 661.8, 668.71, Easing.bezier(0.35, 0.0, 0.25, 1.0));
  const skyTiltP = prog(t, CUE.c04_s11_evolve - 0.08, CUE.c04_s11_above + 0.48, Easing.bezier(0.38, 0.0, 0.18, 1.0));

  const camFwd = lerp(16.0, 23.4, driftP);
  const camLat = lerp(5.1, 4.75, driftP);
  const [camX, camZ] = toWorldXZ(camFwd, camLat);
  const camY = H(camX, camZ) + lerp(0.96, 0.9, skyTiltP);

  // Điểm nhìn ban đầu ôm sát 2 xe vượt sống đồi ở cự ly gần hùng vĩ;
  // từ c04_s11_evolve tới c04_s11_above nâng dần điểm nhìn vượt qua bóng 2 xe lên bầu trời cam-tím mênh mông,
  // vẫn giữ trọn vẹn biểu tượng hai thế hệ Abrams tách bạch ở phần dưới khung hình tới tận 668.71s.
  const lookFwd = lerp(0.0, 6.2, driftP);
  const lookLat = lerp(-0.45, -0.35, driftP);
  const [lookX, lookZ] = toWorldXZ(lookFwd, lookLat);
  const lookY = lerp(6.35, 10.75, skyTiltP);

  const [shadowCx, shadowCz] = toWorldXZ(3.2, -0.2);

  return (
    <Stage
      {...LOOK_DUSK_EVOLUTION.stage}
      shadowArea={26}
      shadowCenter={[shadowCx, 5.0, shadowCz]}
    >
      <Cam pos={[camX, camY, camZ]} look={[lookX, lookY, lookZ]} fov={43} />

      {/* Ánh phản xạ bầu trời chạng vạng tím-lam nhẹ tách khối giáp trước mà vẫn tôn biên dạng ngược sáng */}
      <directionalLight position={[-34, 24, 12]} color="#7c90c4" intensity={0.46} />

      {/* Địa hình sườn đồi chạng vạng lưới mịn & đá / bụi cỏ khô rải tự nhiên trên hai vai đồi */}
      <Terrain
        h={H}
        size={440}
        seg={320}
        center={[20, 0]}
        colors={LOOK_DUSK_EVOLUTION.terrain}
        grainRepeat={54}
      />
      <Scatter
        kind="rock"
        count={175}
        area={[-80, -85, 95, 85]}
        h={H}
        seed={23}
        scale={[0.22, 0.68]}
        avoid={avoidTracksAndLens}
        tint={LOOK_DUSK_EVOLUTION.scatterTint}
      />
      <Scatter
        kind="bush"
        count={135}
        area={[-75, -80, 90, 80]}
        h={H}
        seed={41}
        scale={[0.35, 0.78]}
        avoid={avoidTracksAndLens}
        tint="#c98e5b"
      />

      {/* Huyền thoại M1A2 SEPv3 Desert (bên trái) */}
      <group position={[poseA2.xc, poseA2.yc, poseA2.zc]} rotation={[0, TANK_YAW, 0]}>
        <group rotation={[poseA2.roll, 0, poseA2.pitch]}>
          <M1A2Abrams
            variant="sepv3"
            camo="desert"
            hullPitch={suspensionSettle}
            travel={travelA2}
            turretYaw={0.08}
            gunPitch={gunPitchA2}
            citvYaw={0.28 * Math.sin((t - 661.8) * 1.1)}
            crowsYaw={0.16 + 0.2 * Math.sin((t - 661.8) * 0.9 + 0.7)}
            exhaustHeat={0.42}
          />
        </group>
      </group>

      {/* Người kế nhiệm M1E3 Abrams ~60 tấn (bên phải) — bứt tốc nửa thân xe & ngẩng RWS 30mm +45° quét bầu trời */}
      <group position={[poseE3.xc, poseE3.yc, poseE3.zc]} rotation={[0, TANK_YAW, 0]}>
        <group rotation={[poseE3.roll, 0, poseE3.pitch]}>
          <M1E3Abrams
            travel={travelE3}
            capsuleGlow={0.85}
            turretYaw={-0.11}
            gunPitch={gunPitchE3}
            rwsYaw={rwsYaw}
            rwsPitch={rwsPitch}
          />
        </group>
      </group>

      {/* Hai dải bụi cát vàng cam rực rỡ trong nắng chạng vạng (khởi sinh từ 658.2s để khung 661.8s đã dày đầy đủ) */}
      <DustTrail
        t={t}
        from={658.2}
        to={669.2}
        path={m1a2DustMain}
        rate={10}
        size={2.3}
        color="#e5954f"
        life={3.6}
      />
      <DustTrail
        t={t}
        from={658.6}
        to={669.2}
        path={m1a2DustSun}
        rate={7}
        size={1.65}
        color="#ffbc6e"
        life={2.6}
      />
      <DustTrail
        t={t}
        from={658.2}
        to={669.2}
        path={m1e3DustMain}
        rate={11}
        size={2.4}
        color="#e89a52"
        life={3.6}
      />
      <DustTrail
        t={t}
        from={658.6}
        to={669.2}
        path={m1e3DustSun}
        rate={8}
        size={1.75}
        color="#ffc478"
        life={2.7}
      />
    </Stage>
  );
};

export default C04S11;
