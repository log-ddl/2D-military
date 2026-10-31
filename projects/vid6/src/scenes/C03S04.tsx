import React, { useMemo } from 'react';
import { Easing } from 'remotion';
import { useSize } from '@core/frame';
import { bump, lerp, prog, useT } from '@core/time';
import { paint, plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';
import { TurretInterior3D } from '../parts/TurretInterior3D';

const TURRET_Y = 0.24;

const lerp3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

// Sàn bệ thử nghiệm cơ khí tối cho giỏ tháp pháo trong C03S04
const TurretTestStandFloor: React.FC = () => {
  const matFloor = useMemo(
    () =>
      paint({
        color: '#161f2a',
        camo: ['#121922', '#1d2937'],
        camoScale: 1.7,
        wear: 0.16,
        dirt: 0.2,
        roughness: 0.76,
        metalness: 0.34,
        repeat: 3,
        seed: 83,
      }),
    [],
  );
  const matRingPlatform = useMemo(
    () =>
      paint({
        color: '#232f3d',
        camo: ['#1d2733', '#2c3b4c'],
        camoScale: 2.1,
        wear: 0.24,
        dirt: 0.16,
        roughness: 0.52,
        metalness: 0.56,
        repeat: 2,
        seed: 89,
      }),
    [],
  );
  const matDarkSteel = useMemo(() => plain('#1c222a', 0.52, 0.72), []);
  const matYellow = useMemo(() => plain('#f2b61d', 0.38, 0.22), []);

  return (
    <group>
      <mesh position={[0, -0.04, 0]} receiveShadow material={matFloor}>
        <cylinderGeometry args={[15, 15, 0.08, 64]} />
      </mesh>
      <mesh position={[-0.1, 0.015, 0]} receiveShadow material={matRingPlatform}>
        <cylinderGeometry args={[3.9, 4.08, 0.03, 56]} />
      </mesh>
      <mesh position={[-0.1, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matYellow}>
        <ringGeometry args={[3.76, 3.83, 56]} />
      </mesh>
      {/* Đế vành đỡ giỏ tháp pháo */}
      <mesh position={[0.06, 0.16, 0]} material={matDarkSteel} castShadow receiveShadow>
        <cylinderGeometry args={[1.18, 1.28, 0.28, 44, 1, true]} />
      </mesh>
      <mesh position={[0.06, 0.035, 0]} material={matDarkSteel} receiveShadow>
        <cylinderGeometry args={[1.28, 1.34, 0.04, 44]} />
      </mesh>
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[-0.1 + Math.cos(a) * 2.55, 0.022, Math.sin(a) * 2.55]}
            rotation={[0, -a, 0]}
            material={matDarkSteel}
            receiveShadow
          >
            <boxGeometry args={[2.3, 0.018, 0.1]} />
          </mesh>
        );
      })}
    </group>
  );
};

// Khung viền phát sáng nhấn rõ tấm công tắc đầu gối vàng-đen sọc chéo khi đầu gối trái thúc vào (giữ nguyên độ nét sọc đen)
const KneeSwitchHighlightPad: React.FC<{ active: number }> = ({ active }) => {
  if (active <= 0.01) return null;
  return (
    <group position={[-0.34, 0.62 + TURRET_Y, -0.94]} rotation={[-0.18, 0.15, 0]}>
      {/* Viền phát sáng hổ phách mảnh ôm quanh tấm đệm vàng-đen của TurretInterior3D */}
      {[
        [0, 0.112, 0.02, 0.342, 0.014],
        [0, -0.112, 0.02, 0.342, 0.014],
        [-0.167, 0, 0.02, 0.014, 0.238],
        [0.167, 0, 0.02, 0.014, 0.238],
      ].map(([px, py, pz, w, h], idx) => (
        <mesh key={idx} position={[px, py, pz]}>
          <boxGeometry args={[w, h, 0.014]} />
          <meshStandardMaterial
            color={PAL.amberHot}
            emissive={PAL.amber}
            emissiveIntensity={1.05 * active}
            roughness={0.25}
          />
        </mesh>
      ))}
      {/* Đèn báo kích hoạt van thuỷ lực trên đỉnh công tắc đầu gối */}
      <mesh position={[0, 0.142, 0.014]}>
        <boxGeometry args={[0.13, 0.022, 0.022]} />
        <meshStandardMaterial
          color={PAL.amberHot}
          emissive={PAL.amber}
          emissiveIntensity={1.55 * active}
          roughness={0.2}
        />
      </mesh>
      <pointLight position={[0, 0.02, 0.24]} color={PAL.amber} intensity={0.95 * active} distance={1.25} decay={1.8} />
    </group>
  );
};

const C03S04: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();
  const fastOut = Easing.bezier(0.16, 1, 0.3, 1);
  const slamIn = Easing.bezier(0.55, 0.05, 0.85, 0.95);

  // ==================== CHU TRÌNH 1: CẬN CẢNH TỪNG THAO TÁC (344.10–362.60 s) ====================
  // Và CHU TRÌNH 2: KÉO RỘNG XEM TRỌN 1 LƯỢT NẠP 4.0 GIÂY LIÊN HOÀN (363.20–367.20 s)
  const inSprint = t >= 362.8;

  let blastDoorOpen = 0;
  let loaderPhase = 0.06;
  let breechOpen = 1;
  let kneeActive = 0;
  let readyLight = 0;

  // Cấu hình viên đạn Ammo120mm3D phụ trợ rõ nét (rút khỏi giá đạn & tống ngập vào khoá nòng M256)
  let showAmmo = false;
  let ammoPos: V3 = [-1.45, 1.35 + TURRET_Y, -0.52];
  let ammoRot: V3 = [0, Math.PI, 0];

  if (!inSprint) {
    // 1. Công tắc đầu gối: thúc gối lúc 347.10 (bumps), nhấn rõ lúc 349.10 (knee switch), nhả gối lúc 354.44 (drops)
    const pBump = prog(t, CUE.c03_s04_bump_pad - 0.08, CUE.c03_s04_bump_pad + 0.38, fastOut);
    const pReleaseKnee = prog(t, CUE.c03_s04_drop_knee, CUE.c03_s04_drop_knee + 0.35);
    const kneePulse = bump(t, CUE.c03_s04_knee_switch, 1.15) * 0.35;
    kneeActive = Math.max(0, Math.min(1.25, pBump * (1 - pReleaseKnee) + kneePulse));

    // 2. Cửa chống nổ thuỷ lực: mở toang lúc 350.12 (0 -> 1), đóng sập dưới 2 giây lúc 354.55 -> 356.24 (1 -> 0)
    const pDoorOpen = prog(t, CUE.c03_s04_door_open - 0.04, CUE.c03_s04_door_open + 0.48, fastOut);
    const pDoorSlam = prog(t, CUE.c03_s04_drop_knee + 0.15, CUE.c03_s04_door_slam + 0.04, slamIn);
    blastDoorOpen = Math.max(0, pDoorOpen - pDoorSlam);

    // 3. Tư thế lính nạp đạn:
    // loaderPhase = 0.22 là đỉnh khuỵu gối trái trong TurretInterior3D; từ 352.64..355.40 rút đạn & xoay người sang pháo (0.08 -> 0.78)
    const pKneeFlex = prog(t, CUE.c03_s04_bump_pad - 0.06, CUE.c03_s04_bump_pad + 0.42, fastOut);
    const pRipSpin = prog(t, CUE.c03_s04_rip_shell - 0.1, CUE.c03_s04_drop_knee + 0.85);
    loaderPhase = lerp(0.06, 0.22, pKneeFlex);
    loaderPhase = lerp(loaderPhase, 0.78, pRipSpin);

    // 4. Khoá nòng M256: đang mở chờ đạn (breechOpen = 1), trượt đóng khoá chặt ngay sau khi tống đạn ngập buồng (359.42 -> 360.02)
    const pBreechClose = prog(t, CUE.c03_s04_ram_home + 0.96, CUE.c03_s04_up - 0.18, fastOut);
    breechOpen = 1 - pBreechClose;
    readyLight = prog(t, CUE.c03_s04_up - 0.1, CUE.c03_s04_up + 0.15);

    // 5. Viên đạn Ammo120mm3D phụ trợ:
    // - Giai đoạn mở cửa & rút đạn khỏi giá (349.80..353.35): nằm ở cửa giá đạn bên trái và trượt ra theo tay lính nạp đạn
    if (t >= 349.8 && t < 353.35) {
      showAmmo = true;
      const pPull = prog(t, CUE.c03_s04_rip_shell - 0.15, CUE.c03_s04_rip_shell + 0.65, fastOut);
      ammoPos = [lerp(-1.46, -0.86, pPull), lerp(1.35, 1.18, pPull) + TURRET_Y, lerp(-0.52, -0.56, pPull)];
      ammoRot = [0, Math.PI - pPull * 0.28, -0.08 * pPull];
    }
    // - Giai đoạn tống đạn ngập vào buồng đạn M256 (356.90..359.44): căn thẳng trục nòng (y = 1.22 + TURRET_Y, z = 0) và lao ngập vào trong
    if (t >= 356.9 && t < CUE.c03_s04_ram_home + 0.98) {
      showAmmo = true;
      const pAlign = prog(t, 356.9, CUE.c03_s04_ram_home - 0.12);
      const pRam = prog(t, CUE.c03_s04_ram_home - 0.04, CUE.c03_s04_ram_home + 0.94);
      const xStart = lerp(-0.62, -0.52, pAlign);
      ammoPos = [lerp(xStart, 0.92, pRam), lerp(1.16, 1.22, pAlign) + TURRET_Y, lerp(-0.14, 0, pAlign)];
      ammoRot = [0, lerp(-0.16, 0, pAlign), lerp(0.05, 0, pAlign)];
    }
  } else {
    // ==================== CHU TRÌNH 2: MỘT LƯỢT NẠP ĐẠN 4.0 GIÂY LIÊN HOÀN (363.20–367.20 s) ====================
    // tSprint chạy đúng 4.00 giây (363.20 -> 367.20)
    const pReopenBreech = prog(t, 362.8, 363.18);
    const pCloseBreech2 = prog(t, 366.82, 367.2, fastOut);
    breechOpen = pReopenBreech * (1 - pCloseBreech2);

    const pKnee2 = prog(t, 363.2, 363.48, fastOut) * (1 - prog(t, 364.85, 365.12));
    kneeActive = pKnee2;

    const pOpen2 = prog(t, 363.42, 363.82, fastOut);
    const pSlam2 = prog(t, 364.95, 365.95, slamIn);
    blastDoorOpen = Math.max(0, pOpen2 - pSlam2);

    const pFlex2 = prog(t, 363.2, 363.52, fastOut);
    const pSpin2 = prog(t, 363.95, 365.65);
    loaderPhase = lerp(lerp(0.78, 0.08, prog(t, 362.8, 363.15)), 0.22, pFlex2);
    loaderPhase = lerp(loaderPhase, 0.8, pSpin2);

    readyLight = prog(t, 367.15, 367.35);

    if (t >= 363.55 && t < 364.45) {
      showAmmo = true;
      const pPull2 = prog(t, 363.82, 364.4, fastOut);
      ammoPos = [lerp(-1.46, -0.88, pPull2), lerp(1.35, 1.18, pPull2) + TURRET_Y, -0.54];
      ammoRot = [0, Math.PI - pPull2 * 0.25, 0];
    } else if (t >= 365.85 && t < 366.85) {
      showAmmo = true;
      const pRam2 = prog(t, 366.08, 366.8, fastOut);
      ammoPos = [lerp(-0.4, 0.92, pRam2), 1.22 + TURRET_Y, 0];
      ammoRot = [0, 0, 0];
    }
  }

  // ==================== QUỸ ĐẠO <Cam> KHÔNG BỊ VÁCH THÉP CHE KHUẤT ====================
  // Nhịp 1 (343.90..349.85): Cận cảnh sườn trái giỏ tháp pháo nhìn thẳng vào đầu gối trái + tấm công tắc đầu gối vàng-đen & cửa chống nổ
  // Nhịp 2 (349.85..353.40): Nâng qua khoảng mở nóc trái nhìn rõ cửa chống nổ mở toang & lính nạp đạn rút đạn khỏi giá
  // Nhịp 3 (353.40..357.10): Lia theo cú xoay người (spin) và thấy trọn cửa chống nổ đóng sập dưới 2 giây (356.24)
  // Nhịp 4 (357.10..362.40): Hạ sang góc 3/4 mặt cắt phải nhìn thẳng vào miệng buồng đạn M256 khi Ammo120mm3D tống ngập & khoá nòng đóng ("UP!")
  // Nhịp 5 (362.40..368.60): Kéo rộng vừa ra mặt cắt 3/4 để xem trọn chu trình nạp 4.0 giây liên hoàn
  const pCamKnee = prog(t, 344.1, CUE.c03_s04_knee_switch + 0.3);
  const pCamOpen = prog(t, CUE.c03_s04_door_open - 0.25, CUE.c03_s04_rip_shell + 0.3);
  const pCamSpin = prog(t, CUE.c03_s04_spin - 0.3, CUE.c03_s04_door_slam + 0.1);
  const pCamBridge = prog(t, CUE.c03_s04_door_slam + 0.12, CUE.c03_s04_two_sec - 0.05);
  const pCamRam = prog(t, CUE.c03_s04_two_sec - 0.05, CUE.c03_s04_ram_home - 0.15);
  const pCamWide = prog(t, CUE.c03_s04_four_sec - 0.55, CUE.c03_s04_four_sec + 0.85);
  const pCamEndDrift = prog(t, CUE.c03_s04_four_sec + 0.85, 368.6);

  const pos0: V3 = [0.68, 1.24 + TURRET_Y, -0.78];
  const pos1: V3 = [0.56, 1.12 + TURRET_Y, -0.78];
  const pos2: V3 = [0.66, 1.68 + TURRET_Y, -0.72];
  const pos3: V3 = [0.54, 1.62 + TURRET_Y, -0.66];
  const posBridge: V3 = [0.56, 1.88 + TURRET_Y, 0.46];
  const pos4: V3 = [-0.74, 1.52 + TURRET_Y, 0.46];
  const pos5: V3 = [-1.14, 2.34 + TURRET_Y, 3.74];
  const pos6: V3 = [-0.94, 2.4 + TURRET_Y, 3.86];

  const look0: V3 = [-0.62, 0.88 + TURRET_Y, -0.84];
  const look1: V3 = [-0.52, 0.72 + TURRET_Y, -0.9];
  const look2: V3 = [-0.82, 1.14 + TURRET_Y, -0.64];
  const look3: V3 = [-0.68, 1.08 + TURRET_Y, -0.56];
  const lookBridge: V3 = [-0.12, 1.18 + TURRET_Y, -0.2];
  const look4: V3 = [0.22, 1.2 + TURRET_Y, -0.03];
  const look5: V3 = [-0.32, 1.02 + TURRET_Y, -0.16];
  const look6: V3 = [-0.26, 1.04 + TURRET_Y, -0.12];

  let camPos = lerp3(pos0, pos1, pCamKnee);
  camPos = lerp3(camPos, pos2, pCamOpen);
  camPos = lerp3(camPos, pos3, pCamSpin);
  camPos = lerp3(camPos, posBridge, pCamBridge);
  camPos = lerp3(camPos, pos4, pCamRam);
  camPos = lerp3(camPos, pos5, pCamWide);
  camPos = lerp3(camPos, pos6, pCamEndDrift);

  let camLook = lerp3(look0, look1, pCamKnee);
  camLook = lerp3(camLook, look2, pCamOpen);
  camLook = lerp3(camLook, look3, pCamSpin);
  camLook = lerp3(camLook, lookBridge, pCamBridge);
  camLook = lerp3(camLook, look4, pCamRam);
  camLook = lerp3(camLook, look5, pCamWide);
  camLook = lerp3(camLook, look6, pCamEndDrift);

  let fov = lerp(46, 45, pCamOpen);
  fov = lerp(fov, 43, pCamRam);
  fov = lerp(fov, 40, pCamWide);

  return (
    <div style={{ position: 'relative', width: W, height: H, background: '#111923', overflow: 'hidden' }}>
      <Stage {...LOOK_INTERIOR_BAY.stage} shadowCenter={[-0.2, 1.2, 0]} width={W} height={H}>
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Đèn chiếu sáng cục bộ khoang nạp đạn, công tắc đầu gối, cửa chống nổ và buồng đạn crôm M256 */}
        <pointLight position={[0.25, 1.95, -0.55]} color="#fff3de" intensity={1.95} distance={4.4} decay={1.6} />
        <pointLight position={[-1.35, 1.85, -0.35]} color="#ffe9c8" intensity={1.85} distance={3.8} decay={1.6} />
        <pointLight position={[-0.25, 1.72, 1.25]} color="#eef7ff" intensity={1.45} distance={4.6} decay={1.6} />

        <TurretTestStandFloor />

        <TurretInterior3D
          position={[0, TURRET_Y, 0]}
          showCrew
          blastDoorOpen={blastDoorOpen}
          breechOpen={breechOpen}
          blowoutOpen={0}
          loaderPhase={loaderPhase}
          cadillacTurn={0.1}
        />

        <KneeSwitchHighlightPad active={kneeActive} />

        {/* Đèn tín hiệu khoá nòng sẵn sàng khai hoả khi lính nạp đạn hô "UP!" */}
        {readyLight > 0.01 && (
          <group position={[0.36, 1.49 + TURRET_Y, 0.25]}>
            <mesh>
              <boxGeometry args={[0.09, 0.036, 0.036]} />
              <meshStandardMaterial
                color={PAL.amberHot}
                emissive={PAL.amber}
                emissiveIntensity={3.2 * readyLight}
                roughness={0.18}
              />
            </mesh>
            <pointLight position={[0, 0.06, 0.08]} color={PAL.amber} intensity={1.5 * readyLight} distance={1.1} decay={1.8} />
          </group>
        )}

        {/* Viên đạn 120mm phụ trợ chi tiết cao rút khỏi giá đạn & tống ngập vào khoá nòng M256 */}
        {showAmmo && <Ammo120mm3D kind="m829a4_cartridge" position={ammoPos} rotation={ammoRot} />}
      </Stage>

      {t < CUE.c03_s04_four_sec ? (
        <Label
          t={t}
          text="UP!"
          x={Math.round(W * 0.76)}
          y={Math.round(H * 0.16)}
          from={CUE.c03_s04_up}
          until={362.6}
          bg={PAL.amber}
          fg={PAL.ink}
        />
      ) : (
        <Label
          t={t}
          text="4.0 SEC"
          x={Math.round(W * 0.24)}
          y={Math.round(H * 0.15)}
          from={CUE.c03_s04_four_sec}
          until={366.2}
          bg={PAL.cream}
          fg={PAL.ink}
        />
      )}
    </div>
  );
};

export default C03S04;
