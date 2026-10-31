import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { bump, lerp, prog, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';
import { TurretInterior3D } from '../parts/TurretInterior3D';

// ---------- Vật liệu sàn bệ studio cơ khí tối (cache cấp module) ----------
const matBayFloor = () =>
  paint({
    color: '#141d27',
    camo: ['#101720', '#1c2836'],
    camoScale: 2.6,
    wear: 0.22,
    dirt: 0.18,
    roughness: 0.74,
    metalness: 0.36,
    repeat: 0.16,
    seed: 41,
  });

const matDeckSteel = () =>
  paint({
    color: '#212d3b',
    camo: ['#1a2430', '#2b3a4b'],
    camoScale: 1.9,
    wear: 0.26,
    dirt: 0.16,
    roughness: 0.56,
    metalness: 0.62,
    repeat: 0.45,
    seed: 52,
  });

const matDarkBeam = () => plain('#151c24', 0.62, 0.7);
const matTickSteel = () => plain('#647d96', 0.36, 0.8);
const matHazardYellow = () => plain('#eab320', 0.44, 0.22);
const matCyanLine = () =>
  plain('#29e3d4', 0.2, 0.4, {
    emissive: new THREE.Color('#19bfb2'),
    emissiveIntensity: 0.7,
  });
const matAmberLine = () =>
  plain('#ffaa2b', 0.22, 0.35, {
    emissive: new THREE.Color('#ff9419'),
    emissiveIntensity: 0.8,
  });

const DEGREE_TICKS = Array.from({ length: 36 }, (_, i) => {
  const ang = (i / 36) * Math.PI * 2;
  const isMajor = i % 3 === 0;
  return { ang, isMajor };
});

const FLOOR_GRID_OFFSETS = [-12, -8, -4, 0, 4, 8, 12];

/** Sàn bệ xoay kỹ thuật cơ khí tối quanh giỏ tháp pháo tạo chiều sâu parallax. */
const MechanicalBayDeck: React.FC<{ computerPulse: number }> = ({ computerPulse }) => (
  <group>
    {/* Nền xưởng thép tối rộng tạo chiều sâu không gian */}
    <mesh position={[0, -0.075, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matBayFloor()} receiveShadow>
      <planeGeometry args={[96, 96]} />
    </mesh>

    {/* Dầm thép rãnh kỹ thuật dưới sàn tạo đường dẫn thị giác */}
    {FLOOR_GRID_OFFSETS.map((off, idx) => (
      <React.Fragment key={idx}>
        <mesh position={[off, -0.068, 0]} material={matDarkBeam()} receiveShadow>
          <boxGeometry args={[0.075, 0.014, 44]} />
        </mesh>
        <mesh position={[0, -0.068, off]} material={matDarkBeam()} receiveShadow>
          <boxGeometry args={[44, 0.014, 0.075]} />
        </mesh>
      </React.Fragment>
    ))}

    {/* Bệ đĩa kiểm định cơ khí nhiều bậc dưới đáy giỏ tháp pháo */}
    <mesh position={[0.06, -0.045, 0]} material={matDeckSteel()} receiveShadow>
      <cylinderGeometry args={[3.65, 3.82, 0.055, 64]} />
    </mesh>
    <mesh position={[0.06, -0.012, 0]} material={matDarkBeam()} receiveShadow>
      <cylinderGeometry args={[2.15, 2.24, 0.032, 56]} />
    </mesh>
    <mesh position={[0.06, 0.008, 0]} material={matDeckSteel()} receiveShadow>
      <cylinderGeometry args={[1.42, 1.48, 0.022, 48]} />
    </mesh>

    {/* Vòng chỉ thị kỹ thuật cyan & hổ phách mảnh trên mặt bệ */}
    <mesh position={[0.06, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matCyanLine()}>
      <ringGeometry args={[1.55, 1.585, 64]} />
    </mesh>
    <mesh position={[0.06, -0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matAmberLine()}>
      <ringGeometry args={[2.85, 2.89, 72]} />
    </mesh>

    {/* 36 vạch chia độ phương vị quanh bệ giỏ tháp */}
    {DEGREE_TICKS.map(({ ang, isMajor }, i) => {
      const rMid = isMajor ? 2.52 : 2.58;
      const len = isMajor ? 0.36 : 0.2;
      return (
        <mesh
          key={i}
          position={[0.06 + Math.cos(ang) * rMid, -0.011, Math.sin(ang) * rMid]}
          rotation={[0, -ang, 0]}
          material={isMajor ? matTickSteel() : matDarkBeam()}
          receiveShadow
        >
          <boxGeometry args={[len, 0.02, isMajor ? 0.045 : 0.024]} />
        </mesh>
      );
    })}

    {/* 4 cụm gờ cảnh báo an toàn vàng-đen ở 4 góc bệ studio */}
    {[0.68, 2.35, 3.85, 5.45].map((ang, idx) => (
      <group
        key={idx}
        position={[0.06 + Math.cos(ang) * 3.38, -0.005, Math.sin(ang) * 3.38]}
        rotation={[0, -ang + Math.PI / 2, 0]}
      >
        <mesh geometry={rbox(0.58, 0.045, 0.14, 0.008)} material={matHazardYellow()} castShadow />
        {[-0.18, 0, 0.18].map((sx, k) => (
          <mesh key={k} position={[sx, 0.002, 0]} rotation={[0, 0.35, 0]} material={matDarkBeam()}>
            <boxGeometry args={[0.075, 0.048, 0.145]} />
          </mesh>
        ))}
      </group>
    ))}

    {/* Cột khung giàn đèn kỹ thuật mờ phía xa tạo chiều sâu hậu cảnh */}
    {[
      [-5.6, -4.8],
      [5.8, -4.8],
      [-6.2, 3.8],
    ].map(([px, pz], idx) => (
      <group key={idx} position={[px, 0, pz]}>
        <mesh position={[0, 2.2, 0]} geometry={rbox(0.22, 4.5, 0.22, 0.02)} material={matDarkBeam()} />
        <mesh position={[0, 1.45, 0.12]} material={computerPulse > 0.05 ? matAmberLine() : matCyanLine()}>
          <boxGeometry args={[0.05, 0.42, 0.02]} />
        </mesh>
      </group>
    ))}

    {/* Giá đỡ kiểm định đạn thông minh M1147 AMP (vòng tiếp điểm dữ liệu đồng vàng) ngay tiền cảnh sườn cắt bổ */}
    <group position={[0.46, 0.01, 1.56]} rotation={[0, 0.22, 0]}>
      <mesh position={[0, 0.22, 0]} geometry={rbox(0.74, 0.44, 0.26, 0.02)} material={matDeckSteel()} castShadow receiveShadow />
      <mesh position={[0, 0.45, 0]} geometry={rbox(0.82, 0.028, 0.32, 0.008)} material={matDarkBeam()} />
      {[-0.24, 0.18].map((sx, idx) => (
        <mesh key={idx} position={[sx, 0.5, 0]} material={matTickSteel()} castShadow>
          <boxGeometry args={[0.032, 0.085, 0.16]} />
        </mesh>
      ))}
      <Ammo120mm3D kind="m1147_amp" position={[0.02, 0.57, 0]} />
    </group>
  </group>
);

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

const C03S01: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // Nhịp sáng màn hình máy tính hoả lực & đạn thông minh
  const compPulse = bump(t, CUE.c03_s01_computers - 0.15, 2.1);
  const shellPulse = bump(t, CUE.c03_s01_smart_shells - 0.1, 1.8);

  // Lính nạp đạn 19 tuổi gồng hai tay nâng và xoay viên đạn 56 lb từ 0.15 -> 0.58
  const liftProg = prog(t, CUE.c03_s01_soldier - 0.65, CUE.c03_s01_by_hand + 0.85, Easing.bezier(0.35, 0, 0.2, 1));
  const heavyStrain = bump(t, CUE.c03_s01_56lb, 1.1) * 0.02 * Math.sin((t - CUE.c03_s01_56lb) * 18);
  const loaderPhase = lerp(0.15, 0.58, liftProg) + heavyStrain;

  // Cửa chống nổ hé mở vừa đủ thấy khoang đạn đuôi rồi khép nhẹ khi xoay người nạp
  const blastDoorOpen = lerp(0.42, 0.16, prog(t, CUE.c03_s01_soldier, CUE.c03_s01_by_hand));

  // ---------- Quỹ đạo <Cam> ngang tầm vai bên trong giỏ tháp pháo ----------
  // Nhịp 1 (298.60 -> 303.30): Góc 3/4 sau-phải nhìn trọn màn hình máy tính FLIR hổ phách, hộp gương GPS, đạn thông minh M1147 AMP & bệ kỹ thuật
  // Nhịp 2 (303.30 -> 306.40): Lướt ngang qua giỏ tháp sang bên trái nơi người lính nạp đạn 19 tuổi đang bê đạn
  // Nhịp 3 (306.40 -> 310.40): Ngang tầm vai soi rõ lính nạp đạn gồng hai tay nâng viên đạn 120mm 56 lb hướng vào khoá nòng M256
  // Nhịp 4 (310.40 -> 312.32): Đẩy nhẹ đặt câu hỏi khi nhắc máy nạp tự động Nga từ 50 năm trước (giữ thoáng đỉnh mũ CVC)
  const pFocusComp = prog(t, 298.8, CUE.c03_s01_smart_shells + 0.25);
  const pGlideArc1 = prog(t, CUE.c03_s01_smart_shells + 0.25, CUE.c03_s01_soldier - 0.85, Easing.inOut(Easing.cubic));
  const pGlideArc2 = prog(t, CUE.c03_s01_soldier - 0.85, CUE.c03_s01_soldier + 0.55, Easing.out(Easing.cubic));
  const pHoldLoad = prog(t, CUE.c03_s01_soldier + 0.55, CUE.c03_s01_autoloaders - 0.25);
  const pQuestionPush = prog(t, CUE.c03_s01_autoloaders - 0.25, 312.32, Easing.inOut(Easing.quad));

  const pos0: V3 = [-0.08, 1.66, 3.18];
  const pos1: V3 = [0.24, 1.52, 2.52]; // thấy rõ trực diện màn hình FLIR hổ phách + hộp GPS + đạn M1147 AMP + sàn bệ vạch chia độ
  const pos2: V3 = [-0.84, 1.5, 1.58]; // lướt ngang qua giỏ tháp
  const pos3: V3 = [-0.84, 1.38, 0.44]; // ngang tầm vai nhìn sang trái giỏ
  const pos4: V3 = [-0.8, 1.36, 0.36]; // giữ khung thoáng mũ CVC & trọn viên đạn 120mm 56 lb
  const pos5: V3 = [-0.71, 1.33, 0.26]; // đẩy nhẹ đặt câu hỏi ở câu kết "autoloaders 50 years ago"

  const look0: V3 = [0.52, 1.14, 0.28];
  const look1: V3 = [0.84, 1.24, 0.58];
  const look2: V3 = [-0.14, 1.04, -0.2];
  const look3: V3 = [-0.22, 0.94, -0.52];
  const look4: V3 = [-0.17, 0.95, -0.46];
  const look5: V3 = [-0.13, 0.97, -0.44];

  let camPos = lerpV3(pos0, pos1, pFocusComp);
  let camLook = lerpV3(look0, look1, pFocusComp);
  if (pGlideArc1 > 0) {
    camPos = lerpV3(camPos, pos2, pGlideArc1);
    camLook = lerpV3(camLook, look2, pGlideArc1);
  }
  if (pGlideArc2 > 0) {
    camPos = lerpV3(camPos, pos3, pGlideArc2);
    camLook = lerpV3(camLook, look3, pGlideArc2);
  }
  if (pHoldLoad > 0) {
    camPos = lerpV3(camPos, pos4, pHoldLoad);
    camLook = lerpV3(camLook, look4, pHoldLoad);
  }
  if (pQuestionPush > 0) {
    camPos = lerpV3(camPos, pos5, pQuestionPush);
    camLook = lerpV3(camLook, look5, pQuestionPush);
  }

  const fov = lerp(43, 47, pGlideArc2) - pQuestionPush * 2;

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_INTERIOR_BAY.stage}
        width={W}
        height={H}
        shadowArea={8}
        shadowCenter={[0, 0.9, 0]}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Đèn điểm nhấn nội thất khoang chiến đấu vừa phải, tôn rõ chi tiết màn hình, hộp GPS và người lính bê đạn */}
        <pointLight
          position={[0.82, 1.16, 0.86]}
          color={PAL.amber}
          intensity={1.35 + compPulse * 1.6}
          distance={2.6}
          decay={1.8}
        />
        <pointLight
          position={[1.05, 1.76, 0.82]}
          color={PAL.cyan}
          intensity={1.5 + compPulse * 1.4}
          distance={2.4}
          decay={1.8}
        />
        <pointLight
          position={[0.52, 0.98, 1.65]}
          color="#ffe3a3"
          intensity={1.5 + shellPulse * 2.4}
          distance={2.4}
          decay={1.8}
        />
        <pointLight
          position={[-0.44, 1.62, -0.16]}
          color="#fff3df"
          intensity={4.8}
          distance={4.2}
          decay={1.5}
        />
        <pointLight
          position={[-0.86, 1.25, -0.82]}
          color="#7fc8ff"
          intensity={2.2}
          distance={3.2}
          decay={1.7}
        />

        <MechanicalBayDeck computerPulse={compPulse} />

        {/* gunPitch={-0.11} đưa khoá nòng vào góc chốt nạp đạn chuẩn của Abrams; puckDrop={1} đặt đế đạn cũ nằm gọn dưới khay hứng */}
        <TurretInterior3D
          showCrew={true}
          gunPitch={-0.11}
          puckDrop={1}
          loaderPhase={loaderPhase}
          breechOpen={0.9}
          blastDoorOpen={blastDoorOpen}
          mirrorTilt={[Math.sin(t * 1.9) * 0.055, Math.cos(t * 1.4) * 0.04]}
          cadillacTurn={Math.sin(t * 1.15) * 0.15}
        />
      </Stage>

      <Label
        t={t}
        text="56 LB"
        from={CUE.c03_s01_56lb}
        until={311.1}
        x={W * 0.8}
        y={H * 0.18}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C03S01;
