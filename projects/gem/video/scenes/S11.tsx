import React, { useMemo } from 'react';
import * as THREE from 'three';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_PREDAWN, TERRAIN_PREDAWN } from '../local/palette';
import {
  ChuContainer,
  ConcreteBunker,
  HescoWall,
  NightHawkMast,
  TWall,
} from '../local/models';
import { useT, Label } from '@kit/motion';
import { prog, lerp } from '@kit/theme';
import { Stage, Cam, type V3 } from '@lib/3d/stage';
import { rbox, pipe } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { heightField, Terrain, Scatter } from '@lib/3d/terrain';

// Địa hình sa mạc đá sỏi Rukban: nền doanh trại phẳng, bao quanh bởi đồi đá bazan xa lúc 04:00 sáng
const H_S11 = heightField({
  seed: 114,
  amp: 3.6,
  scale: 95,
  flats: [[3, 0, 34, 0]],
  add: (x, z) => {
    const dist = Math.hypot(x - 3, z);
    const rim = Math.max(0, (dist - 42) / 38);
    return Math.min(9, rim * rim * 4.5);
  },
});

const avoidCompound = (x: number, z: number) => Math.abs(x - 3) < 28 && Math.abs(z) < 16;

/** Trụ đèn đường nội khu ánh vàng natri thấp dọc lối đi sỏi. */
const WalkwayBollardLamp: React.FC<{ pos: V3 }> = ({ pos }) => {
  const poleMat = useMemo(() => plain('#45505c', 0.55, 0.35), []);
  const bulbMat = useMemo(
    () =>
      plain('#ffd99e', 0.2, 0.05, {
        emissive: new THREE.Color(PAL3D.sodiumLamp),
        emissiveIntensity: 2.2,
      }),
    []
  );
  return (
    <group position={pos}>
      <mesh geometry={rbox(0.28, 0.12, 0.28, 0.02)} position={[0, 0.06, 0]} material={poleMat} castShadow />
      <mesh position={[0, 1.55, 0]} material={poleMat} castShadow>
        <cylinderGeometry args={[0.042, 0.052, 2.95, 12]} />
      </mesh>
      <mesh geometry={rbox(0.42, 0.06, 0.16, 0.015)} position={[-0.12, 3.02, 0]} material={poleMat} castShadow />
      <mesh geometry={rbox(0.22, 0.08, 0.13, 0.02)} position={[-0.20, 2.96, 0]} material={bulbMat} />
      <pointLight position={[-0.20, 2.82, 0]} color={PAL3D.sodiumLamp} intensity={3.2} distance={13} decay={2} />
    </group>
  );
};

/**
 * Nhà trực chỉ huy / Phòng điều hành phòng thủ căn cứ (BDOC Command Post):
 * Cửa sổ quan sát rộng nhìn ra lối đi sỏi, lộ rõ 3 màn hình chiến thuật chi tiết bên trong (không bị cháy sáng bloom)
 * và hắt ánh sáng màn hình xanh lam ra bệ cửa, bao cát & lối đi sỏi khi bản tin cảnh báo tình báo -90 phút truyền tới.
 */
const CommandOpsPost: React.FC<{ pos: V3; alertLevel: number; pulse: number }> = ({ pos, alertLevel, pulse }) => {
  const wallMat = useMemo(
    () =>
      paint({
        color: '#8f98a0',
        camo: ['#7f8890', '#9da6ae'],
        camoScale: 4,
        repeat: 0.45,
        dirt: 0.3,
        wear: 0.15,
        roughness: 0.78,
        metalness: 0.16,
        seed: 71,
      }),
    []
  );
  const frameMat = useMemo(
    () =>
      paint({
        color: '#515c68',
        camo: ['#454f5a', '#606d7a'],
        camoScale: 4,
        repeat: 0.6,
        dirt: 0.25,
        wear: 0.18,
        roughness: 0.58,
        metalness: 0.26,
        seed: 73,
      }),
    []
  );
  const sandbagMat = useMemo(
    () =>
      paint({
        color: PAL3D.hescoSand,
        camo: ['#a38c65', '#c2aa82'],
        camoScale: 4,
        repeat: 0.9,
        dirt: 0.32,
        wear: 0.1,
        roughness: 0.94,
        metalness: 0.02,
        seed: 79,
      }),
    []
  );
  const darkRoomMat = useMemo(() => plain('#050d17', 0.94, 0.06), []);
  const deskMat = useMemo(() => plain('#182433', 0.72, 0.2), []);
  const operatorMat = useMemo(() => plain('#0d141d', 0.88, 0.08), []);

  // Giữ cường độ phát sáng màn hình vừa dưới ngưỡng cháy trắng của Bloom để thấy rõ viền và đồ họa radar bên trong
  const screenBackingMat = useMemo(
    () =>
      plain('#0f375e', 0.25, 0.08, {
        emissive: new THREE.Color('#196fb8'),
        emissiveIntensity: 0.95 + alertLevel * 0.35,
      }),
    [alertLevel]
  );

  const screenGraphicCyanMat = useMemo(
    () =>
      plain('#7be8ff', 0.18, 0.05, {
        emissive: new THREE.Color('#2bd9ff'),
        emissiveIntensity: 1.45 + alertLevel * 0.45,
      }),
    [alertLevel]
  );

  const alertBannerMat = useMemo(
    () =>
      plain('#ffd67a', 0.16, 0.04, {
        emissive: new THREE.Color('#ff8c1a'),
        emissiveIntensity: 1.7 + pulse * 0.9,
      }),
    [pulse]
  );

  const glassPaneMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#56b6ff',
        transparent: true,
        opacity: 0.15 + alertLevel * 0.06,
        roughness: 0.1,
        metalness: 0.25,
        emissive: new THREE.Color('#1a75c2'),
        emissiveIntensity: 0.22 + alertLevel * 0.28,
      }),
    [alertLevel]
  );

  const cableGeo = useMemo(
    () =>
      pipe(
        [
          [2.3, 2.55, 1.38],
          [2.55, 2.1, 1.42],
          [2.55, 0.45, 1.42],
          [2.8, 0.08, 1.48],
        ],
        0.025,
        20
      ),
    []
  );

  const spillIntensity = 4.2 + alertLevel * 7.8 + pulse * 3.2;

  return (
    <group position={pos}>
      {/* Sàn, trần, tường hậu (-Z) và hai tường bên (±X) */}
      <mesh geometry={rbox(5.6, 0.18, 2.9, 0.02)} position={[0, 0.09, 0]} material={frameMat} receiveShadow />
      <mesh geometry={rbox(5.68, 0.16, 2.98, 0.02)} position={[0, 2.66, 0]} material={frameMat} castShadow receiveShadow />
      <mesh geometry={rbox(5.52, 2.42, 0.18, 0.02)} position={[0, 1.38, -1.36]} material={wallMat} castShadow receiveShadow />
      <mesh geometry={rbox(0.22, 2.42, 2.84, 0.02)} position={[-2.67, 1.38, 0]} material={wallMat} castShadow receiveShadow />
      <mesh geometry={rbox(0.22, 2.42, 2.84, 0.02)} position={[2.67, 1.38, 0]} material={wallMat} castShadow receiveShadow />

      {/* Mặt tiền (+Z = +1.36) khoét cửa sổ chỉ huy rộng 2.24 × 1.04 m ở đúng tầm mắt người lính */}
      <mesh geometry={rbox(5.52, 0.98, 0.18, 0.02)} position={[0, 0.67, 1.36]} material={wallMat} castShadow receiveShadow />
      <mesh geometry={rbox(5.52, 0.40, 0.18, 0.02)} position={[0, 2.40, 1.36]} material={wallMat} castShadow receiveShadow />
      <mesh geometry={rbox(1.92, 1.06, 0.18, 0.02)} position={[-1.80, 1.68, 1.36]} material={wallMat} castShadow receiveShadow />
      <mesh geometry={rbox(1.36, 1.06, 0.18, 0.02)} position={[2.08, 1.68, 1.36]} material={wallMat} castShadow receiveShadow />

      {/* Cửa thép bên trái mặt tiền */}
      <mesh geometry={rbox(0.96, 2.06, 0.08, 0.01)} position={[-1.85, 1.20, 1.46]} material={frameMat} castShadow />
      <mesh geometry={rbox(0.30, 0.24, 0.02, 0.005)} position={[-1.85, 1.72, 1.505]} material={screenBackingMat} />

      {/* Bao cát gia cố trên nóc nhà trực & công sự bao cát thấp dưới bệ cửa sổ (không che tầm mắt) */}
      {[-2.1, -1.4, -0.7, 0, 0.7, 1.4, 2.1].map((sx, idx) => (
        <mesh
          key={idx}
          geometry={rbox(0.64, 0.16, 1.15, 0.05)}
          position={[sx, 2.81, 0.65]}
          material={sandbagMat}
          castShadow
        />
      ))}
      {[0, 1, 2].map((row) =>
        [-0.55, 0.12, 0.79, 1.42].map((sx, idx) => (
          <mesh
            key={`sb_${row}_${idx}`}
            geometry={rbox(0.62, 0.19, 0.38, 0.05)}
            position={[sx + (row % 2) * 0.12, 0.19 + row * 0.18, 1.64]}
            material={sandbagMat}
            castShadow
            receiveShadow
          />
        ))
      )}

      {/* Khung thép cửa sổ quan sát */}
      <group position={[0.28, 1.68, 1.44]}>
        <mesh geometry={rbox(2.34, 0.07, 0.18, 0.01)} position={[0, 0.54, 0]} material={frameMat} castShadow />
        <mesh geometry={rbox(2.38, 0.08, 0.24, 0.01)} position={[0, -0.54, 0.03]} material={frameMat} castShadow receiveShadow />
        <mesh geometry={rbox(0.07, 1.04, 0.18, 0.01)} position={[-1.13, 0, 0]} material={frameMat} castShadow />
        <mesh geometry={rbox(0.07, 1.04, 0.18, 0.01)} position={[1.13, 0, 0]} material={frameMat} castShadow />
        <mesh geometry={rbox(0.042, 1.04, 0.11, 0.008)} position={[0, 0, 0.01]} material={frameMat} castShadow />
        <mesh
          geometry={rbox(2.44, 0.035, 0.28, 0.006)}
          position={[0, 0.60, 0.06]}
          rotation={[0.16, 0, 0]}
          material={frameMat}
          castShadow
        />
        <mesh geometry={rbox(2.18, 1.00, 0.016, 0.002)} position={[0, 0, -0.01]} material={glassPaneMat} />
      </group>

      {/* NỘI THẤT PHÒNG TRỰC BÊN TRONG: 3 MÀN HÌNH CHIẾN THUẬT RÕ NÉT & KÍP TRỰC */}
      <group position={[0.28, 0, 0.15]}>
        <mesh geometry={rbox(3.6, 2.34, 0.08, 0.01)} position={[0, 1.34, -1.25]} material={darkRoomMat} />
        <mesh geometry={rbox(0.08, 2.34, 2.4, 0.01)} position={[-1.75, 1.34, -0.1]} material={darkRoomMat} />
        <mesh geometry={rbox(0.08, 2.34, 2.4, 0.01)} position={[1.75, 1.34, -0.1]} material={darkRoomMat} />
        <mesh geometry={rbox(2.65, 0.08, 0.85, 0.01)} position={[0, 1.08, -0.35]} material={deskMat} />

        {/* Màn hình trái: Vòng radar cảnh giới xanh ngọc rõ nét */}
        <group position={[-0.76, 1.56, -0.52]} rotation={[0, 0.24, 0]}>
          <mesh geometry={rbox(0.72, 0.50, 0.05, 0.01)} material={frameMat} />
          <mesh geometry={rbox(0.65, 0.43, 0.02, 0.004)} position={[0, 0, 0.026]} material={screenBackingMat} />
          <mesh position={[0, 0, 0.04]} material={screenGraphicCyanMat}>
            <torusGeometry args={[0.15, 0.012, 6, 24]} />
          </mesh>
          <mesh position={[0, 0, 0.04]} material={screenGraphicCyanMat}>
            <torusGeometry args={[0.08, 0.009, 6, 20]} />
          </mesh>
        </group>

        {/* Màn hình trung tâm: Điện báo tình báo Mỹ cảnh báo nguy cơ tập kích -90 PHÚT */}
        <group position={[0.04, 1.60, -0.58]}>
          <mesh geometry={rbox(0.86, 0.56, 0.05, 0.01)} material={frameMat} />
          <mesh geometry={rbox(0.78, 0.48, 0.02, 0.004)} position={[0, 0, 0.026]} material={screenBackingMat} />
          {/* Các thanh dữ liệu xanh lam trên màn hình */}
          <mesh geometry={rbox(0.66, 0.035, 0.01, 0.002)} position={[0, -0.06, 0.04]} material={screenGraphicCyanMat} />
          <mesh geometry={rbox(0.50, 0.035, 0.01, 0.002)} position={[-0.08, -0.14, 0.04]} material={screenGraphicCyanMat} />
          {alertLevel > 0.05 && (
            <>
              <mesh geometry={rbox(0.70, 0.11, 0.015, 0.003)} position={[0, 0.13, 0.042]} material={alertBannerMat} />
              <mesh geometry={rbox(0.46, 0.045, 0.015, 0.003)} position={[-0.10, 0.02, 0.042]} material={alertBannerMat} />
            </>
          )}
        </group>

        {/* Màn hình phải: Sơ đồ khu vực biên giới */}
        <group position={[0.82, 1.56, -0.50]} rotation={[0, -0.24, 0]}>
          <mesh geometry={rbox(0.70, 0.48, 0.05, 0.01)} material={frameMat} />
          <mesh geometry={rbox(0.63, 0.41, 0.02, 0.004)} position={[0, 0, 0.026]} material={screenBackingMat} />
          <mesh geometry={rbox(0.50, 0.03, 0.01, 0.002)} position={[0, 0.09, 0.04]} material={screenGraphicCyanMat} />
          <mesh geometry={rbox(0.38, 0.03, 0.01, 0.002)} position={[-0.05, -0.02, 0.04]} material={screenGraphicCyanMat} />
        </group>

        {/* Bóng người lính trực ngồi lệch bên trái bàn trực nhận cảnh báo */}
        <group position={[-0.54, 0, 0.25]}>
          <mesh geometry={rbox(0.45, 0.52, 0.24, 0.08)} position={[0, 1.24, 0]} material={operatorMat} />
          <mesh position={[0, 1.63, 0]} material={operatorMat}>
            <sphereGeometry args={[0.135, 16, 14]} />
          </mesh>
        </group>

        {/* Ánh sáng xanh lam đặt ngay ngoài mặt kính để hắt mạnh ra bệ cửa sổ, bao cát & lối đi sỏi mà không gây lóa màn hình */}
        <pointLight position={[0.05, 1.55, 1.95]} color="#26a9ff" intensity={spillIntensity} distance={12} decay={1.8} />
        <pointLight position={[0.05, 1.65, 0.35]} color="#26a9ff" intensity={2.2 + alertLevel * 1.8} distance={4.5} decay={2} />
      </group>

      {/* Cột ăng-ten liên lạc tình báo & chảo thu vệ tinh trên nóc nhà trực */}
      <group position={[2.15, 2.74, -0.55]}>
        <mesh position={[0, 1.45, 0]} material={frameMat} castShadow>
          <cylinderGeometry args={[0.022, 0.038, 2.9, 10]} />
        </mesh>
        <mesh geometry={rbox(0.75, 0.04, 0.04, 0.005)} position={[0, 2.35, 0]} material={frameMat} />
        <mesh position={[-0.34, 2.75, 0]} material={frameMat}>
          <cylinderGeometry args={[0.008, 0.015, 0.85, 8]} />
        </mesh>
        <mesh position={[0.34, 2.75, 0]} material={frameMat}>
          <cylinderGeometry args={[0.008, 0.015, 0.85, 8]} />
        </mesh>
        <mesh position={[-0.95, 0.36, 0.2]} rotation={[0.55, 0.4, 0]} material={wallMat} castShadow>
          <cylinderGeometry args={[0.42, 0.12, 0.16, 20]} />
        </mesh>
      </group>
      <mesh geometry={cableGeo} material={plain('#262d35', 0.7, 0.2)} />
    </group>
  );
};

const S11: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const gravelPathMat = useMemo(
    () =>
      paint({
        color: '#626972',
        camo: ['#515861', '#757b82', '#5c5852'],
        camoScale: 5,
        repeat: 4.5,
        dirt: 0.4,
        wear: 0.15,
        roughness: 0.96,
        metalness: 0.03,
        seed: 118,
      }),
    []
  );
  const curbMat = useMemo(() => plain('#7d848c', 0.9, 0.05), []);

  // Bản tin cảnh báo tình báo -90 phút tới nhà trực lúc 212.50s
  const alertLevel = prog(t, CUE.s11_warn90 - 0.15, CUE.s11_warn90 + 0.55);
  const alertPulse =
    t >= CUE.s11_warn90 && t <= 218.5
      ? 0.5 + 0.5 * Math.sin((t - CUE.s11_warn90) * 8.5)
      : 0;

  // Chuyển động DOLLY NGANG TẦM MẮT NGƯỜI LÍNH (y ≈ 1.85 m) liền mạch không khoảng trống:
  // - 206.6 -> 211.8s: Trượt ngang qua cửa hầm bê tông ConcreteBunker (strobe=0) cạnh dãy nhà ngủ ChuContainer (warmLight)
  // - 211.8 -> 217.2s: Lướt góc 3/4 qua cửa sổ nhà trực chỉ huy nhận cảnh báo -90 phút (ánh màn hình xanh hắt ra sân sỏi)
  // - 217.2 -> 222.68s: Lia mắt khóa thẳng vào thân tháp NightHawkMast trước rồi mới ngước dần lên dừng cận cụm 4 loa còi & đèn chớp tắt ngúm (strobe=0)
  const pWalk1 = prog(t, 206.62, 212.2);
  const pWalk2 = prog(t, 211.9, 217.4);
  const pWalk3 = prog(t, 217.1, 221.2);

  // Tách nhịp lia ngang sang cột tháp sớm hơn nhịp ngước lên cụm loa còi để không bao giờ quét vào khoảng trời trống
  const pPanMast = prog(t, 216.3, 219.1);
  const pTiltSiren = prog(t, 218.2, 221.1);

  const walkAmp = 1 - pWalk3;
  const eyeBob = Math.sin(t * 4.4) * 0.014 * walkAmp;

  let camX = lerp(-9.2, 0.8, pWalk1);
  camX = lerp(camX, 6.4, pWalk2);
  camX = lerp(camX, 11.35, pWalk3);

  const camY = 1.85 + eyeBob;

  let camZ = lerp(2.45, 2.42, pWalk1);
  camZ = lerp(camZ, 2.32, pWalk2);
  camZ = lerp(camZ, 1.42, pWalk3);

  let lookX = lerp(-3.4, 4.8, pWalk1);
  lookX = lerp(lookX, 8.2, pWalk2);
  lookX = lerp(lookX, 15.2, pPanMast);

  let lookY = lerp(1.46, 1.66, pWalk1);
  lookY = lerp(lookY, 1.78, pWalk2);
  lookY = lerp(lookY, 2.65, pPanMast * (1 - pTiltSiren));
  lookY = lerp(lookY, 4.58, pTiltSiren);

  let lookZ = lerp(-1.75, -2.15, pWalk1);
  lookZ = lerp(lookZ, -1.95, pWalk2);
  lookZ = lerp(lookZ, -0.95, pPanMast);

  const fov = lerp(42, 34, pTiltSiren);

  // Đầu kính nhiệt NightHawk quay cứng về hướng Bắc (-Z/+X), bỏ mặc hướng Nam
  const mastNorthYaw = 1.18 + Math.sin(t * 0.25) * 0.04;

  return (
    <>
      <Stage {...STAGE_PREDAWN} shadowArea={32} shadowCenter={[4, 0, -1]}>
        <Cam pos={[camX, camY, camZ]} look={[lookX, lookY, lookZ]} fov={fov} />

        {/* 1. ĐỊA HÌNH ĐÁ SỎI RUKBAN & LỐI ĐI SỎI NỘI KHU */}
        <Terrain h={H_S11} size={340} seg={180} center={[4, 0]} colors={TERRAIN_PREDAWN} grainRepeat={46} />
        <Scatter
          kind="rock"
          count={120}
          area={[-110, -110, 120, 110]}
          h={H_S11}
          seed={41}
          scale={[0.35, 1.15]}
          avoid={avoidCompound}
          tint="#69717d"
        />

        {/* Dải đường đi bộ rải sỏi đá dăm nội khu & hàng đá vỉa */}
        <mesh geometry={rbox(36, 0.035, 2.85, 0.01)} position={[4, 0.015, 2.0]} material={gravelPathMat} receiveShadow />
        {Array.from({ length: 18 }, (_, i) => {
          const bx = -12 + i * 1.9;
          return (
            <React.Fragment key={i}>
              <mesh geometry={rbox(1.55, 0.09, 0.14, 0.02)} position={[bx, 0.045, 0.54]} material={curbMat} receiveShadow />
              <mesh geometry={rbox(1.55, 0.09, 0.14, 0.02)} position={[bx, 0.045, 3.46]} material={curbMat} receiveShadow />
            </React.Fragment>
          );
        })}

        {/* 2. DÃY NHÀ NGỦ CONTAINER CHU (WARMLIGHT) & HẦM BÊ TÔNG CHỮ U (STROBE = 0) */}
        <group position={[-9.5, 0, -4.65]}>
          <ChuContainer warmLight={true} seed={12} />
        </group>
        <group position={[-2.2, 0, -5.85]}>
          <ChuContainer warmLight={true} seed={18} />
        </group>
        <pointLight position={[-6.8, 2.35, -3.1]} color="#ffb963" intensity={3.2} distance={10} decay={2} />

        {/* Hầm bê tông trú ẩn đặt sát lối đi cạnh nhà ngủ, cửa hướng ra lối đi, đèn chớp tắt ngúm */}
        <group position={[-4.2, 0, -1.75]} rotation={[0, -1.96, 0]}>
          <ConcreteBunker strobe={0} seed={61} />
        </group>

        <group position={[11.4, 0, -5.8]} rotation={[0, -1.57, 0]}>
          <ConcreteBunker strobe={0} seed={67} />
        </group>

        {/* 3. NHÀ TRỰC CHỈ HUY (COMMAND POST) — RỌ ĐẤT HESCO LÙI BẰNG MẶT HÔNG ĐỂ KHÔNG CHẮN GÓC MÁY */}
        <group position={[1.45, 0, -3.35]}>
          <HescoWall cells={2} seed={33} />
        </group>

        <CommandOpsPost pos={[5.6, 0, -2.75]} alertLevel={alertLevel} pulse={alertPulse} />

        <group position={[9.85, 0, -3.15]}>
          <HescoWall cells={2} seed={37} />
        </group>

        {/* 4. THÁP CAMERA TẦM NHIỆT NIGHTHAWK (QUAY ĐẦU VỀ HƯỚNG BẮC) & CỤM 4 LOA CÒI BÁO ĐỘNG CÂM LẶNG */}
        <group position={[15.2, 0, -0.95]}>
          <NightHawkMast yaw={mastNorthYaw} pitch={0.04} strobe={0} />
        </group>
        <pointLight position={[12.4, 4.4, 2.3]} color="#b8d4ff" intensity={2.6} distance={10.5} decay={2} />

        {/* 5. TƯỜNG BÊ TÔNG CHỮ T, RỌ HESCO VÀNH ĐAI & ĐÈN ĐƯỜNG NỘI KHU */}
        <group position={[18.8, 0, -2.8]} rotation={[0, -0.45, 0]}>
          <HescoWall cells={4} seed={43} />
        </group>
        <group position={[3.0, 0, -9.6]}>
          <TWall count={14} seed={23} />
        </group>
        <group position={[-4.5, 0, 5.6]}>
          <TWall count={7} seed={29} />
        </group>
        <group position={[7.5, 0, 6.0]}>
          <ChuContainer warmLight={false} seed={25} />
        </group>
        <group position={[15.4, 0, 5.6]}>
          <TWall count={6} seed={31} />
        </group>

        <WalkwayBollardLamp pos={[-8.8, 0, 3.85]} />
        <WalkwayBollardLamp pos={[13.6, 0, 3.75]} />
      </Stage>

      {/* Nhãn duy nhất đúng quy định: "-90 PHÚT" (212.50 - 217.50s) */}
      <Label
        t={t}
        text="-90 PHÚT"
        x={960}
        y={925}
        from={CUE.s11_warn90}
        until={217.5}
        size={54}
        bg={PAL2D.amberMid}
        fg={PAL2D.ink}
      />
    </>
  );
};

export default S11;
