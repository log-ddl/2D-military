import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { lerp, mix, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { pipe } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, ridgeX, Scatter, Terrain } from '@skill/military/3d/terrain';
import { softDot } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import M1A2Abrams from '../parts/M1A2Abrams';

// Địa hình cát sa mạc: bãi phẳng chỗ xe đậu & vùng cấm sau đuôi, đồi cát nhấp nhô tự nhiên phía chân trời
const farDunes = ridgeX(52, 7.2, 24);
const midDuneLeft = (x: number, z: number) =>
  4.2 * Math.exp(-(((x - 22) / 18) ** 2) - (((z + 28) / 14) ** 2));
const midDuneRight = (x: number, z: number) =>
  4.8 * Math.exp(-(((x - 18) / 20) ** 2) - (((z - 30) / 15) ** 2));

const DESERT_H = heightField({
  seed: 404,
  amp: 2.5,
  scale: 88,
  flats: [
    [-2.5, 0, 12.5, 0],
    [-8.5, 0, 7.8, 0],
  ],
  add: (x, z) => farDunes(x, z) + midDuneLeft(x, z) + midDuneRight(x, z),
});

const avoidPad = (x: number, z: number) => x > -15.5 && x < 12 && Math.abs(z) < 11.5;

/**
 * Luồng khí xả phản lực 930°F phả cuồn cuộn từ tấm vỉ nướng đuôi xe (x = -4.05, y = 1.21, z = 0) về phía sau (-X).
 * Dựng hoàn toàn bằng nhiều lớp hạt mềm bất định hướng (softDot + AdditiveBlending) — không có cạnh đa giác cứng.
 * Tới CUE.c04_s04_thermal (567.98s), luồng nhiệt bùng sáng trắng-hổ phách tương phản gắt như một ngọn đuốc.
 */
const SuperheatedExhaustPlume: React.FC<{ t: number; jetPower: number; thermalTorch: number }> = ({
  t,
  jetPower,
  thermalTorch,
}) => {
  const puffTex = useMemo(() => softDot(), []);

  if (jetPower <= 0.01) return null;

  const torchBoost = 1 + thermalTorch * 0.95;

  return (
    <group>
      {/* Đèn nhiệt chỉ bùng lên từ đúng mốc 930°F (562.50s), tạo tương phản mạnh với màu sơn CARC sa mạc lúc đầu */}
      <pointLight
        position={[-4.38, 1.18, 0]}
        color={mix('#ff6d1a', '#ffd980', thermalTorch)}
        intensity={jetPower * 26 * torchBoost}
        distance={8.8}
        decay={1.5}
      />
      <pointLight
        position={[-6.3, 0.55, 0]}
        color={mix('#ff731c', '#ffb642', thermalTorch)}
        intensity={jetPower * 16 * torchBoost}
        distance={8.0}
        decay={1.6}
      />

      {/* Lõi hoả quang sát mặt ngoài tấm vỉ nướng đuôi chính & hai vỉ phụ */}
      {[-0.42, -0.14, 0.14, 0.42].map((zo, idx) => {
        const flicker = 0.88 + 0.12 * Math.sin(t * 24 + idx * 1.7);
        const sc = (0.58 + thermalTorch * 0.25) * flicker;
        return (
          <sprite key={`mouth${idx}`} position={[-4.12, 1.21, zo]} scale={[sc * 1.25, sc * 0.72, sc]}>
            <spriteMaterial
              map={puffTex}
              color={mix('#ff8c29', '#fff8d4', 0.35 + thermalTorch * 0.65)}
              transparent
              opacity={(0.36 + thermalTorch * 0.42) * jetPower}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        );
      })}
      {[-1.02, 1.02].map((zs, idx) => (
        <sprite key={`sideMouth${idx}`} position={[-4.1, 1.21, zs]} scale={[0.52, 0.38, 0.52]}>
          <spriteMaterial
            map={puffTex}
            color={mix('#ff741c', '#ffe79e', thermalTorch)}
            transparent
            opacity={(0.26 + thermalTorch * 0.34) * jetPower}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      ))}

      {/* Ngọn đuốc nhiệt lõi sáng (Additive Volumetric Plume) trải từ vỉ đuôi x=-4.15 tới x=-8.2, mềm mượt mọi góc nhìn */}
      {Array.from({ length: 28 }, (_, i) => {
        const u = (((t * 1.25 + i / 28) % 1) + 1) % 1;
        const dist = u * (3.2 + thermalTorch * 1.15);
        const waveZ = Math.sin(t * 7.5 + i * 1.9) * (0.18 + u * 0.34) + ((i % 3) - 1) * 0.26 * (1 - u * 0.4);
        const waveY = Math.cos(t * 8.5 + i * 2.3) * 0.05;
        const px = -4.14 - dist;
        const py = Math.max(0.22, 1.2 - dist * 0.16 + waveY);
        const pz = waveZ;

        const sc = (0.48 + u * 0.92) * (1 + thermalTorch * 0.28);
        const bell = Math.sin(Math.min(1, u * 1.15) * Math.PI);
        const op = bell * (0.16 + thermalTorch * 0.34) * jetPower;
        if (op <= 0.005) return null;

        const col =
          u < 0.3
            ? mix('#ffb340', '#fff7cc', 0.3 + thermalTorch * 0.7)
            : mix('#ff6a18', '#ffbe3d', thermalTorch * 0.75);

        return (
          <sprite key={`torch${i}`} position={[px, py, pz]} scale={[sc * 1.35, sc * 0.85, sc]}>
            <spriteMaterial
              map={puffTex}
              color={col}
              transparent
              opacity={op}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        );
      })}

      {/* Đám mây khí nóng hổ phách & bụi cát cuồn cuộn phả về phía sau (-X) */}
      {Array.from({ length: 52 }, (_, i) => {
        const speed = 0.76 + (i % 5) * 0.12;
        const life = (((t * speed + i / 52) % 1) + 1) % 1;
        const dist = life * 5.6;
        const spreadZ = (rnd(i * 3 + 1) - 0.5) * (1.1 + dist * 0.45);
        const dropY = -dist * 0.16 + Math.sin(life * Math.PI * 2 + i) * 0.08 + life * life * 0.28;

        const px = -4.14 - dist;
        const py = Math.max(0.18, 1.21 + dropY);
        const pz = spreadZ;

        const scale = (0.38 + dist * 0.34) * (1 + thermalTorch * 0.18);
        const fadeIn = Math.min(1, life * 7);
        const fadeOut = (1 - life) ** 1.4;
        const op = fadeIn * fadeOut * (0.34 * jetPower + thermalTorch * 0.16);
        if (op <= 0.006) return null;

        const col =
          life < 0.28
            ? mix('#ffa938', '#ffe999', thermalTorch * 0.75)
            : life < 0.65
              ? mix('#f07822', '#ffb238', thermalTorch * 0.6)
              : mix('#cfa06e', '#ff8c2e', 0.45 + thermalTorch * 0.45);

        return (
          <sprite key={`cloud${i}`} position={[px, py, pz]} scale={[scale * 1.3, scale * 0.9, scale]}>
            <spriteMaterial
              map={puffTex}
              color={col}
              transparent
              opacity={op}
              depthWrite={false}
            />
          </sprite>
        );
      })}

      {/* Hạt tàn nhiệt tròn mịn (không dùng thanh hộp cứng) bay cuốn theo dòng xoáy */}
      {Array.from({ length: 34 }, (_, k) => {
        const u = (((t * 1.45 + rnd(k * 7 + 3)) % 1) + 1) % 1;
        const dist = u * 4.4;
        const px = -4.12 - dist;
        const py = Math.max(0.12, 1.2 + (rnd(k * 5 + 1) - 0.5) * 0.26 - dist * 0.16 + Math.sin(t * 10 + k) * 0.05);
        const pz = (rnd(k * 5 + 2) - 0.5) * (1.15 + dist * 0.36);
        const sc = 0.075 + rnd(k * 11) * 0.065;
        const fade = Math.sin(u * Math.PI);
        return (
          <sprite key={`sp${k}`} position={[px, py, pz]} scale={[sc, sc, sc]}>
            <spriteMaterial
              map={puffTex}
              color={k % 2 === 0 ? '#fff0a8' : '#ff9829'}
              transparent
              opacity={fade * (0.65 * jetPower + thermalTorch * 0.35)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        );
      })}
    </group>
  );
};

/**
 * Cọc tiêu & vòng cung cảnh báo bán nguyệt bỏng rát sau đuôi xe (CUE.c04_s04_scorch @ 565.82s)
 * ngăn bộ binh tiến vào vùng luồng xả 930°F (bán kính 3.85 m tính từ vỉ đuôi x = -4.05).
 */
const ScorchHazardZone: React.FC<{ t: number; reveal: number; thermalTorch: number }> = ({
  t,
  reveal,
  thermalTorch,
}) => {
  const R = 3.85;
  const centerX = -4.05;

  const stakePosts = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const a = Math.PI * 0.54 + (i / 6) * Math.PI * 0.92;
        return {
          x: centerX + Math.cos(a) * R,
          z: Math.sin(a) * R,
          rotY: -a,
        };
      }),
    []
  );

  const upperCableGeo = useMemo(() => {
    const pts: V3[] = Array.from({ length: 25 }, (_, i) => {
      const a = Math.PI * 0.54 + (i / 24) * Math.PI * 0.92;
      return [centerX + Math.cos(a) * R, 0.72, Math.sin(a) * R];
    });
    return pipe(pts, 0.016, 36);
  }, []);

  const lowerCableGeo = useMemo(() => {
    const pts: V3[] = Array.from({ length: 25 }, (_, i) => {
      const a = Math.PI * 0.54 + (i / 24) * Math.PI * 0.92;
      return [centerX + Math.cos(a) * R, 0.42, Math.sin(a) * R];
    });
    return pipe(pts, 0.013, 36);
  }, []);

  const scorchGroundMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#2e1b11',
        emissive: new THREE.Color('#ff5514'),
        emissiveIntensity: 0.38,
        roughness: 0.92,
        transparent: true,
        opacity: 0.76,
        depthWrite: false,
      }),
    []
  );

  const darkStakeMat = useMemo(() => plain('#1f2328', 0.6, 0.55), []);
  const crimsonBandMat = useMemo(
    () =>
      plain('#ff4242', 0.35, 0.15, {
        emissive: new THREE.Color('#ff2e2e'),
        emissiveIntensity: 0.85,
      }),
    []
  );
  const amberBandMat = useMemo(
    () =>
      plain('#ffaa2b', 0.32, 0.15, {
        emissive: new THREE.Color('#ff961a'),
        emissiveIntensity: 0.95,
      }),
    []
  );

  if (reveal <= 0.005) return null;

  const pulse = 0.74 + 0.26 * Math.sin((t - CUE.c04_s04_scorch) * 7.5);
  const glowBoost = 1 + thermalTorch * 0.65;

  return (
    <group>
      {/* Vệt cát cháy sém đen-đỏ do luồng khí xả 930°F thổi quét xuống mặt đất */}
      <mesh
        position={[centerX - 0.08, 0.014, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        material={scorchGroundMat}
      >
        <circleGeometry args={[R * 0.95, 48, 0, Math.PI]} />
      </mesh>

      {/* Vòng cung bán nguyệt cảnh báo chính (đỏ crimson & hổ phách) trên mặt cát */}
      <mesh position={[centerX, 0.022, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <ringGeometry args={[R - 0.16, R + 0.04, 56, 1, 0, Math.PI * reveal]} />
        <meshBasicMaterial
          color="#ff4242"
          transparent
          opacity={0.88 * reveal * pulse}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[centerX, 0.024, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 2]}>
        <ringGeometry args={[R * 0.6 - 0.1, R * 0.6, 48, 1, 0, Math.PI * reveal]} />
        <meshBasicMaterial
          color="#ffaa2b"
          transparent
          opacity={0.78 * reveal * glowBoost}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      {/* Các vạch chevron cảnh báo vùng cấm bộ binh bên trong bán nguyệt */}
      {Array.from({ length: 9 }, (_, i) => {
        const a = Math.PI * 0.6 + (i / 8) * Math.PI * 0.8;
        const rMid = R * 0.79;
        if (i / 8 > reveal) return null;
        return (
          <mesh
            key={`chev${i}`}
            position={[centerX + Math.cos(a) * rMid, 0.026, Math.sin(a) * rMid]}
            rotation={[-Math.PI / 2, 0, -a + Math.PI / 4]}
          >
            <planeGeometry args={[0.46, 0.14]} />
            <meshBasicMaterial
              color={i % 2 === 0 ? '#ffaa2b' : '#ff4242'}
              transparent
              opacity={0.85 * reveal}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Hai vạch biên ngang khoá kín mép bán nguyệt ngay sát đuôi xe */}
      {[-1, 1].map((s) => (
        <mesh
          key={`edge${s}`}
          position={[centerX - 0.12, 0.023, s * (R * 0.5)]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <planeGeometry args={[0.12, R * 0.96 * reveal]} />
          <meshBasicMaterial color="#ff4242" transparent opacity={0.82 * reveal} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}

      {/* 7 cọc tiêu cảnh báo thép kẻ sọc đỏ-vàng cắm dọc chu vi bán nguyệt */}
      <group scale={[1, reveal, 1]}>
        {stakePosts.map((st, idx) => (
          <group key={idx} position={[st.x, 0, st.z]} rotation={[0, st.rotY, 0]}>
            <mesh position={[0, 0.03, 0]} material={darkStakeMat} castShadow>
              <cylinderGeometry args={[0.1, 0.12, 0.06, 12]} />
            </mesh>
            <mesh position={[0, 0.43, 0]} material={darkStakeMat} castShadow>
              <cylinderGeometry args={[0.032, 0.038, 0.84, 12]} />
            </mesh>
            <mesh position={[0, 0.69, 0]} material={crimsonBandMat}>
              <cylinderGeometry args={[0.036, 0.036, 0.13, 12]} />
            </mesh>
            <mesh position={[0, 0.54, 0]} material={amberBandMat}>
              <cylinderGeometry args={[0.036, 0.036, 0.13, 12]} />
            </mesh>
            <mesh position={[0, 0.39, 0]} material={crimsonBandMat}>
              <cylinderGeometry args={[0.036, 0.036, 0.13, 12]} />
            </mesh>
            <mesh position={[0, 0.88, 0]}>
              <sphereGeometry args={[0.048, 12, 10]} />
              <meshBasicMaterial
                color={idx % 2 === 0 ? '#ff4242' : '#ffe787'}
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* Dây cáp cảnh báo căng nối vòng qua 7 cọc tiêu */}
        {reveal > 0.65 && (
          <>
            <mesh geometry={upperCableGeo}>
              <meshBasicMaterial color="#ff4242" transparent opacity={(reveal - 0.65) / 0.35} toneMapped={false} />
            </mesh>
            <mesh geometry={lowerCableGeo}>
              <meshBasicMaterial color="#ffaa2b" transparent opacity={((reveal - 0.65) / 0.35) * 0.88} toneMapped={false} />
            </mesh>
          </>
        )}
      </group>
    </group>
  );
};

const C04S04: React.FC = () => {
  const t = useT();

  // Trước 562.50s giữ vỉ đuôi nguội (0.03) để tôn màu sơn CARC sa mạc; đúng CUE.c04_s04_exhaust (562.50s) bùng rực lên 1.0 (930°F)!
  const exhaustSurge = prog(t, CUE.c04_s04_exhaust - 0.12, CUE.c04_s04_exhaust + 0.55);
  const exhaustHeat = lerp(0.03, 1.0, exhaustSurge);

  // Đúng CUE.c04_s04_scorch (565.82s), cọc tiêu & vòng cung bán nguyệt cảnh báo bộ binh bật rõ trên mặt cát
  const scorchReveal = prog(t, CUE.c04_s04_scorch - 0.12, CUE.c04_s04_scorch + 0.65);

  // Đúng CUE.c04_s04_thermal (567.98s), luồng nhiệt đuôi xe rực sáng tương phản gắt như ngọn đuốc trên trường nhìn nhiệt
  const thermalTorch = prog(t, CUE.c04_s04_thermal - 0.2, CUE.c04_s04_thermal + 0.55);

  const hullVibPitch = Math.sin(t * 28) * (0.0008 + exhaustSurge * 0.0024);

  // ---------------- CAMERA GÓC THẤP (y ≈ 0.95 m) PHÍA SAU ĐUÔI XE NHÌN THẲNG VÀO TAIL GRILL ----------------
  // Nhịp 1 (556.04 -> 562.40s): Góc máy thấp y = 0.95 m phía sau đuôi xe lia ngang vào chính diện tấm vỉ nướng thoát khí
  const pPanToGrill = prog(t, 556.04, CUE.c04_s04_exhaust - 0.08);
  let camPos: V3 = [
    lerp(-7.35, -6.4, pPanToGrill),
    0.95,
    lerp(2.1, 0.42, pPanToGrill),
  ];
  let camLook: V3 = [
    lerp(-3.55, -4.02, pPanToGrill),
    lerp(1.24, 1.18, pPanToGrill),
    lerp(0.1, 0.0, pPanToGrill),
  ];

  // Nhịp 2 (562.40 -> 565.55s): Giữ góc thấp y = 0.96 m lùi nhẹ chếch trái để đón luồng khí nóng 930°F phả cuồn cuộn
  const pBlastTrack = prog(t, CUE.c04_s04_exhaust - 0.08, CUE.c04_s04_scorch - 0.25);
  if (pBlastTrack > 0) {
    const bPos: V3 = [-7.7, 0.98, -1.15];
    const bLook: V3 = [-4.35, 1.1, 0.02];
    camPos = [
      lerp(camPos[0], bPos[0], pBlastTrack),
      lerp(camPos[1], bPos[1], pBlastTrack),
      lerp(camPos[2], bPos[2], pBlastTrack),
    ];
    camLook = [
      lerp(camLook[0], bLook[0], pBlastTrack),
      lerp(camLook[1], bLook[1], pBlastTrack),
      lerp(camLook[2], bLook[2], pBlastTrack),
    ];
  }

  // Nhịp 3 (565.55 -> 569.50s): Kéo lùi mở rộng khung sau đuôi để trọn vẹn 7 cọc tiêu & cả vòng bán nguyệt cảnh báo bộ binh nằm gọn trong khung
  const pScorchPull = prog(t, CUE.c04_s04_scorch - 0.25, CUE.c04_s04_thermal + 0.65);
  if (pScorchPull > 0) {
    const sPos: V3 = [-10.9, 1.72, -3.55];
    const sLook: V3 = [-5.45, 0.84, 0.06];
    camPos = [
      lerp(camPos[0], sPos[0], pScorchPull),
      lerp(camPos[1], sPos[1], pScorchPull),
      lerp(camPos[2], sPos[2], pScorchPull),
    ];
    camLook = [
      lerp(camLook[0], sLook[0], pScorchPull),
      lerp(camLook[1], sLook[1], pScorchPull),
      lerp(camLook[2], sLook[2], pScorchPull),
    ];
  }

  // Pha tương phản gắt ở CUE.c04_s04_thermal (567.98s) để luồng nhiệt đuôi rực sáng như ngọn đuốc
  const baseStage = LOOK_DESERT_GLARE.stage;
  const skyColors: [string, string, string] = [
    mix(baseStage.sky![0], '#0f223a', thermalTorch * 0.62),
    mix(baseStage.sky![1], '#324c66', thermalTorch * 0.62),
    mix(baseStage.sky![2], '#5e4f3e', thermalTorch * 0.62),
  ];
  const sunIntensity = lerp(baseStage.sunIntensity ?? 2.8, 1.35, thermalTorch);
  const ambientIntensity = lerp(baseStage.ambient ?? 0.2, 0.1, thermalTorch);
  const fogColor = mix(baseStage.fogColor ?? '#decbb0', '#4c4339', thermalTorch * 0.62);

  return (
    <AbsoluteFill>
      <Stage
        {...baseStage}
        sky={skyColors}
        sunIntensity={sunIntensity}
        ambient={ambientIntensity}
        fogColor={fogColor}
        shadowArea={20}
        shadowCenter={[-3.2, 0.8, 0]}
        post={{
          ...(typeof baseStage.post === 'object' ? baseStage.post : {}),
          bloom: lerp(0.55, 1.15, thermalTorch),
          bloomThreshold: lerp(0.82, 0.64, thermalTorch),
        }}
      >
        <Cam pos={camPos} look={camLook} fov={40} />

        {/* Địa hình cát sa mạc có đồi cát hậu cảnh & đá bụi tự nhiên */}
        <Terrain h={DESERT_H} size={380} seg={220} colors={LOOK_DESERT_GLARE.terrain} />
        <Scatter
          kind="rock"
          count={85}
          area={[-75, -75, 85, 75]}
          h={DESERT_H}
          seed={44}
          scale={[0.45, 1.25]}
          avoid={avoidPad}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />
        <Scatter
          kind="bush"
          count={55}
          area={[-65, -70, 80, 70]}
          h={DESERT_H}
          seed={79}
          scale={[0.55, 1.15]}
          avoid={avoidPad}
          tint="#b9a374"
        />

        {/* Chủ thể M1A2 Abrams đứng trên bãi cát, tấm vỉ nướng đuôi rực đỏ-cam chói lọi ở 930°F */}
        <M1A2Abrams
          variant="m1a2"
          camo="desert"
          turretYaw={0.05}
          gunPitch={0.02}
          hullPitch={hullVibPitch}
          exhaustHeat={exhaustHeat}
          position={[0, 0, 0]}
        />

        {/* Luồng hạt khí nóng hổ phách 930°F & ngọn đuốc nhiệt */}
        <SuperheatedExhaustPlume t={t} jetPower={exhaustSurge} thermalTorch={thermalTorch} />

        {/* Cọc tiêu & vòng cung bán nguyệt cảnh báo bỏng rát không cho bộ binh tiến sát */}
        <ScorchHazardZone t={t} reveal={scorchReveal} thermalTorch={thermalTorch} />
      </Stage>

      {/* Đúng 1 <Label> duy nhất trên màn hình (bg={PAL.amber} từ 562.50..568.90) */}
      <Label
        t={t}
        text="930°F"
        x={960}
        y={136}
        from={CUE.c04_s04_exhaust}
        until={568.90}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C04S04;
