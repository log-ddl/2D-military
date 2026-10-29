import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { DustTrail } from '@lib/3d/fx';
import { fbm, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_PREDAWN, TERRAIN_PREDAWN } from '../local/palette';
import {
  ChuContainer,
  HescoWall,
  NightHawkMast,
  ScanEagle,
  SHAHED_CENTER_Y,
  Shahed136,
  SkyHookCrane,
  TWall,
} from '../local/models';

// Địa hình đá sỏi bazan Rukban: giữ dải gờ tự nhiên có gợn sóng sỏi cát tinh tế,
// chừa đúng mặt phẳng 6 m dưới chân máy quay (y ≈ 0) để góc máy cực thấp y = 0.85 m luôn sạch và sắc nét.
const RUKBAN_GROUND_H = heightField({
  seed: 2109,
  amp: 1.75,
  scale: 74,
  oct: 5,
  flats: [
    [2.5, 1.3, 8.5, 0],
    [106, 4, 38, 0],
  ],
  add: (x, z) => {
    // Đèo yên ngựa thấp tự nhiên phía sau Tháp 22 (z ≈ -28..+18) để bóng Shahed-136 nổi bật trên nền trời đêm xanh thẫm
    const valleySaddle = 1 - 0.78 * Math.exp(-(((z + 4) / 42) ** 2));
    return (
      (fbm(x / 16 + 12, z / 16 + 9, 33, 3) - 0.5) * 0.4 +
      11.5 * Math.exp(-(((x - 224) / 56) ** 2)) * valleySaddle +
      6.8 * Math.exp(-(((z + 115) / 44) ** 2)) +
      6.2 * Math.exp(-(((z - 118) / 46) ** 2))
    );
  },
});

const avoidLensImmediate = (x: number, z: number) => {
  // Chừa rãnh trung tâm ngay trước thấu kính (x < 11.5 m) để đá sỏi ôm hai sườn trái/phải tự nhiên, không nằm đè sau Label
  if (x > -4 && x < 11.5 && Math.abs(z - 1.1) < 1.85) return true;
  if (x > 90 && x < 130 && z > -24 && z < 34) return true;
  return false;
};

const avoidFarScatter = (x: number, z: number) => {
  if (x > -6 && x < 24 && Math.abs(z - 0.5) < 8) return true;
  if (x > 88 && x < 132 && z > -26 && z < 36) return true;
  return false;
};

/** Cột đèn pha natri vàng ấm nhỏ nhoi tại tiền đồn Tháp 22 ở hậu cảnh (~106 m) kèm quầng sáng trên cát. */
const PerimeterLampPost: React.FC<{ pos: V3; intensity?: number }> = ({ pos, intensity = 9.5 }) => {
  const poleMat = useMemo(() => plain('#4a535e', 0.6, 0.4), []);
  return (
    <group position={pos}>
      <mesh position={[0, 2.7, 0]} material={poleMat}>
        <cylinderGeometry args={[0.06, 0.08, 5.4, 8]} />
      </mesh>
      <mesh position={[0.25, 5.35, 0]}>
        <sphereGeometry args={[0.28, 10, 8]} />
        <meshBasicMaterial color="#ffd28a" toneMapped={false} />
      </mesh>
      {/* Quầng đèn natri hắt ấm trên mặt cát chân cột */}
      <mesh position={[0.2, 0.06, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[5.5, 18]} />
        <meshBasicMaterial
          color={PAL3D.sodiumLamp}
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight position={[0.3, 5.1, 0]} color={PAL3D.sodiumLamp} intensity={intensity} distance={30} decay={1.3} />
    </group>
  );
};

/** Khu căn cứ Tháp 22 ở hậu cảnh xa (~106 m): khu nhà ngủ CHU nửa tối bên trái, cần cẩu SkyHook sáng rực hút hết sự chú ý ở góc lệch phải. */
const DistantTower22Compound: React.FC<{ t: number }> = ({ t }) => {
  const gy = RUKBAN_GROUND_H(106, 0);
  const eagleAngle = t * 0.55;

  return (
    <group position={[106, gy, 0]}>
      {/* Khu nhà ngủ container CHU (hướng Nam/trái bỏ ngỏ trong bóng tối nửa sáng nửa mờ) */}
      <group position={[0, 0, -11.2]} rotation={[0, Math.PI, 0]}>
        <ChuContainer warmLight seed={101} />
      </group>
      <group position={[0, 0, -4.4]} rotation={[0, Math.PI, 0]}>
        <ChuContainer warmLight seed={103} />
      </group>
      <group position={[7.4, 0, -11.2]} rotation={[0, Math.PI, 0]}>
        <ChuContainer warmLight seed={107} />
      </group>
      <group position={[7.4, 0, -4.4]} rotation={[0, Math.PI, 0]}>
        <ChuContainer warmLight seed={109} />
      </group>

      {/* Dãy tường bê tông chữ T & rọ HESCO chừa khoảng tối không ai canh giữ */}
      <group position={[-4.8, 0, -16.5]}>
        <TWall count={6} seed={201} />
      </group>
      <group position={[-4.8, 0, 2.2]}>
        <TWall count={5} seed={205} />
      </group>
      <group position={[-5.4, 0, 9.0]} rotation={[0, Math.PI / 2, 0]}>
        <HescoWall cells={5} seed={209} />
      </group>

      {/* Tháp camera nhiệt NightHawkMast quay mặt đi hướng khác (Đông-Bắc, strobe=0 câm lặng) */}
      <group position={[-7.2, 0, -1.5]}>
        <NightHawkMast yaw={-0.95} pitch={0.08} strobe={0} />
      </group>

      {/* Ánh đèn vàng nhỏ nhoi của doanh trại giữa sa mạc mênh mông */}
      <PerimeterLampPost pos={[-3.2, 0, -13.2]} intensity={8.5} />
      <PerimeterLampPost pos={[5.5, 0, 3.6]} intensity={9.5} />

      {/* Góc lệch bên phải (+Z = +21.5 m): Cần cẩu SkyHookCrane cao 15 m bật spotlight chiếu sáng sợi cáp đang hút trọn sự chú ý */}
      <group position={[-2.0, 0, 21.5]} rotation={[0, -0.42, 0]}>
        <SkyHookCrane cableSway={Math.sin(t * 1.05) * 0.08} boomYaw={-0.18} spotlight />
      </group>
      <mesh position={[0.6, 0.07, 20.8]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[8.5, 22]} />
        <meshBasicMaterial
          color={PAL3D.sodiumLamp}
          transparent
          opacity={0.22}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <pointLight position={[1.0, 9.5, 20.5]} color={PAL3D.sodiumLamp} intensity={18} distance={38} decay={1.25} />

      {/* Chiếc ScanEagle đang bay thu hồi quanh cáp đèn SkyHook ở góc lệch phải */}
      <group
        position={[
          1.2 + Math.cos(eagleAngle) * 3.0,
          9.8 + Math.sin(t * 1.4) * 0.25,
          19.2 + Math.sin(eagleAngle) * 2.2,
        ]}
        rotation={[0, -eagleAngle + Math.PI / 2, 0]}
      >
        <ScanEagle propSpin={t * 42} bank={0.18} />
      </group>
    </group>
  );
};

/**
 * Quỹ đạo bay là là sát mặt cát ~2.2 m của chiếc Shahed-136:
 * - Xuất hiện từ 406.5s từ mạn trái tiền cảnh,
 * - Lướt chầm chậm vượt ngang sát phía trên ống kính (409.0 - 413.0s) ở khoảng cách 8.5 -> 20 m để trọn vẹn 100% sải cánh delta trong khung hình,
 * - Thu nhỏ dần một cách chậm rãi như bóng một cánh chim đêm tiến thẳng về phía khoảng tối không ai canh giữ của căn cứ (414.0 - 420.19s).
 */
function getShahedPathPos(t: number): V3 {
  const uEnter = prog(t, 406.2, 409.3);
  const uPass = prog(t, 409.3, 413.2);
  const uGlide = prog(t, 413.2, 420.19);

  let x: number;
  let z: number;
  if (t <= 409.3) {
    x = lerp(-4.5, 8.6, uEnter);
    z = lerp(-4.8, -0.8, uEnter);
  } else if (t <= 413.2) {
    x = lerp(8.6, 22.5, uPass);
    z = lerp(-0.8, -2.2, uPass);
  } else {
    x = lerp(22.5, 49.0, uGlide);
    z = lerp(-2.2, -5.6, uGlide);
  }

  const bob = Math.sin(t * 2.0) * 0.05;
  const agl = lerp(2.18, 2.42, uGlide);
  const y = RUKBAN_GROUND_H(x, z) + agl + bob;
  return [x, y, z];
}

const S21: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Góc máy CỰC THẤP sát mặt sỏi đá sa mạc: y = ground + 0.85 m!
  const pCam = prog(t, 402.0, 420.19);
  const camX = lerp(-1.8, 2.2, pCam);
  const camZ = lerp(1.65, 1.15, pCam);
  const camY = RUKBAN_GROUND_H(camX, camZ) + 0.85;
  const camPos: V3 = [camX, camY, camZ];

  // Camera lia rất tinh tế:
  // - Đầu cảnh (402 - 406s): nhìn sát qua thảm đá sỏi tiền cảnh về cụm đèn vàng Tháp 22 & cần cẩu SkyHook sáng đèn bên phải
  // - Khi Shahed vào khung (406.5 - 410s): mở nhẹ hướng nhìn sang trái đón trọn chiếc Shahed ở độ cao 2.2 m
  // - Cuối cảnh (413 - 420.19s): khóa tĩnh lặng theo bóng cánh chim đêm bay chậm về khoảng tối dãy nhà CHU
  const catchPan = prog(t, 406.1, 407.8) * (1 - prog(t, 409.2, 412.2));
  const focusDarkGap = prog(t, 411.5, 418.0);

  const farLookX = 106;
  const farLookY = lerp(3.3, 2.8, focusDarkGap);
  const farLookZ = lerp(4.8, -4.2, focusDarkGap);

  const camLook: V3 = [
    lerp(farLookX, 32, catchPan * 0.45),
    lerp(farLookY, 2.5, catchPan * 0.35),
    lerp(farLookZ, -6.5, catchPan * 0.55),
  ];

  // Tư thế bay của Shahed-136
  const sPos = getShahedPathPos(t);
  const sNext = getShahedPathPos(t + 0.06);
  const vx = sNext[0] - sPos[0];
  const vy = sNext[1] - sPos[1];
  const vz = sNext[2] - sPos[2];
  const shahedYaw = Math.atan2(-vz, vx);
  const shahedPitch = Math.atan2(vy, Math.max(0.01, Math.hypot(vx, vz)));
  const shahedBank = Math.sin(t * 1.4) * 0.04 - 0.035 * (1 - prog(t, 409.3, 413.2));
  const shahedVisible = t >= 406.35;

  return (
    <AbsoluteFill>
      <Stage {...STAGE_PREDAWN} shadowArea={38} shadowCenter={[20, 0, -2]}>
        <Cam pos={camPos} look={camLook} fov={40} />

        {/* Địa hình sa mạc đá sỏi bazan Rukban lúc rạng sáng xanh lạnh */}
        <Terrain
          h={RUKBAN_GROUND_H}
          size={620}
          seg={224}
          center={[85, 0]}
          colors={TERRAIN_PREDAWN}
          grainRepeat={62}
        />

        {/* Lớp đá sỏi góc cạnh (Scatter rock) dày đặc ngay sát tiền cảnh ống kính (2.5 - 35 m) & trải dài ra xa */}
        <Scatter
          kind="rock"
          count={110}
          area={[-2, -16, 36, 18]}
          h={RUKBAN_GROUND_H}
          seed={213}
          scale={[0.16, 0.52]}
          tint="#76808d"
          avoid={avoidLensImmediate}
        />
        <Scatter
          kind="rock"
          count={260}
          area={[-20, -90, 170, 90]}
          h={RUKBAN_GROUND_H}
          seed={211}
          scale={[0.26, 0.82]}
          tint="#6f7884"
          avoid={avoidFarScatter}
        />
        {/* Bụi gai sa mạc khô màu nâu đất lạnh (nhân tint ấm khô để khử hẳn sắc xanh lá gốc của bush) */}
        <Scatter
          kind="bush"
          count={85}
          area={[-8, -72, 152, 72]}
          h={RUKBAN_GROUND_H}
          seed={219}
          scale={[0.22, 0.48]}
          tint="#b5764e"
          avoid={avoidLensImmediate}
        />

        {/* Hậu cảnh xa (~106 m): Cụm đèn vàng nhỏ nhoi của Tháp 22 & cần cẩu SkyHook sáng đèn ở góc lệch */}
        <DistantTower22Compound t={t} />

        {/* Chiếc Shahed-136 bay là là cách mặt cát ~2.2 m kéo theo vệt bụi cát mỏng cuộn nhẹ dưới bụng cánh */}
        {shahedVisible && (
          <>
            <group
              position={[sPos[0], sPos[1] - SHAHED_CENTER_Y, sPos[2]]}
              rotation={[0, shahedYaw, 0]}
            >
              <Shahed136 propSpin={t * 36} pitch={shahedPitch} bank={shahedBank} />
            </group>

            <DustTrail
              t={t}
              from={406.4}
              to={420.19}
              path={(bt) => {
                const bp = getShahedPathPos(bt);
                return [bp[0] - 1.4, RUKBAN_GROUND_H(bp[0], bp[2]) - 0.26, bp[2]];
              }}
              rate={12}
              size={0.44}
              color="#878177"
              life={1.7}
            />
          </>
        )}
      </Stage>

      {/* Tối đa 1 Label: "45 GIÂY" đúng mốc CUE.s21_45sec */}
      <Label
        t={t}
        text="45 GIÂY"
        x={960}
        y={900}
        from={CUE.s21_45sec}
        until={419.4}
        size={56}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S21;
