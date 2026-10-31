import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { bump, lerp, mix, prog, rnd, useT } from '@core/time';
import { rbox } from '@skill/military/3d/geom';
import { fbm, plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain } from '@skill/military/3d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (e0: number, e1: number, x: number) => {
  const u = clamp01((x - e0) / (e1 - e0));
  return u * u * (3 - 2 * u);
};

/**
 * Địa hình đêm mưa bão trên rặng núi đá nhọn miền đông Trung Quốc (chinaMountains):
 * - Thiết kế đường chân trời răng cưa có các khe yên ngựa xen giữa các tháp núi đá nhọn 105..170 m
 *   để lộ bầu trời đêm bão & mây chớp ở hậu cảnh, tạo chiều sâu hùng vĩ nhiều lớp núi xa-gần.
 * - Ngay dưới bụng máy bay tại mốc "unseen peaks" (t ≈ 680.20–681.5 s -> x ≈ 420..455 m) có sống núi đá đen
 *   sắc cạnh cao 84.5 m lướt sượt ngay sát dưới bụng máy bay (bụng máy bay ở y ≈ 91.5 m).
 */
const NIGHT_PEAKS_H = (x: number, z: number): number => {
  const rA = 1 - Math.abs(fbm(x * 0.0092 + 11.4, z * 0.0092 - 7.2, 53, 4) * 2 - 1);
  const rB = 1 - Math.abs(fbm(x * 0.021 - 4.3, z * 0.021 + 8.9, 89, 3) * 2 - 1);
  const rC = 1 - Math.abs(fbm(x * 0.045 + 2.1, z * 0.045 - 3.5, 113, 2) * 2 - 1);

  const ridgeSharp = Math.pow(rA, 1.48) * 68 + Math.pow(rB, 1.72) * 32 + Math.pow(rC, 2.0) * 11;

  // Dãy đỉnh núi nhọn hậu cảnh bên trái/sau lưng máy bay (z < -42 m): khắc thành từng tháp đá nhọn xen kẽ khe yên ngựa lộ bầu trời đêm!
  const portNear = smoothstep(-36, -98, z);
  const portFar = smoothstep(-95, -210, z);
  const spireMod = Math.pow(0.5 + 0.5 * Math.sin(x * 0.036 + z * 0.015), 1.65);
  const farSpireMod = Math.pow(0.5 + 0.5 * Math.cos(x * 0.024 - z * 0.018), 1.5);
  const portPeaks = portNear * (14 + spireMod * 64) + portFar * (24 + farSpireMod * 56);

  // Dãy núi nhọn mạn phải xa (z > 40 m)
  const stbdGate = smoothstep(38, 115, z);
  const stbdSpire = Math.pow(0.5 + 0.5 * Math.cos(x * 0.028 + z * 0.014), 1.7);
  const stbdPeaks = stbdGate * (18 + stbdSpire * 54);

  // Không dùng Math.min làm bẹt đỉnh; dùng hàm bao mềm cho hành lang trung tâm
  const flankEnv = lerp(0.58, 1.0, Math.max(portNear, stbdGate));
  let h = 14 + ridgeSharp * flankEnv + portPeaks + stbdPeaks;

  // Các sống đỉnh đá đen sắc nhọn lướt sượt ngay sát dưới bụng máy bay ở giai đoạn "unseen peaks" -> "Bail out!"
  const closePeaks: [number, number, number, number, number][] = [
    [270, -14.0, 32, 24, 76.0],
    [358, -11.0, 30, 22, 80.5],
    [434, -4.5, 34, 24, 85.2], // Sống đỉnh đá đen chính lướt sượt ngay sát dưới bụng lúc unseen peaks & empty tanks (680.2–681.5 s)
    [495, -9.0, 30, 22, 82.0],
    [552, -6.5, 32, 23, 81.5], // Đỉnh núi dưới bụng lúc cửa thoát hiểm bật mở Bail out! (684.60 s)
  ];
  for (const [px, pz, rx, rz, ph] of closePeaks) {
    const d = Math.hypot((x - px) / rx, (z - pz) / rz);
    if (d < 1.35) {
      const ridge = Math.pow(Math.max(0, 1 - d / 1.35), 1.18);
      const crag = 0.86 + 0.24 * (1 - Math.abs(fbm(x * 0.09, z * 0.09, 131, 3) * 2 - 1));
      h = Math.max(h, ph * ridge * crag);
    }
  }

  return h;
};

function nightSlope(x: number, z: number): number {
  const gx = NIGHT_PEAKS_H(x + 2.5, z) - NIGHT_PEAKS_H(x - 2.5, z);
  const gz = NIGHT_PEAKS_H(x, z + 2.5) - NIGHT_PEAKS_H(x, z - 2.5);
  return Math.hypot(gx, gz) / 5.0;
}

// Chỉ rải cây/đá trên sườn thoải & sống yên ngựa để không có viên đá nào nhô ngang khỏi vách dựng đứng
const AVOID_STEEP_ROCK = (x: number, z: number) => nightSlope(x, z) > 0.78;
const AVOID_STEEP_PINE = (x: number, z: number) =>
  Math.abs(z) < 10 || nightSlope(x, z) > 0.65 || NIGHT_PEAKS_H(x, z) > 102;

/** Tích phân góc quay cánh quạt mượt: quay tít tới 680.15 s rồi khựng chậm dần vì cạn sạch bình xăng (empty tanks) */
function evalPropSpin(t: number): number {
  const t0 = 664.0;
  const tCut = 680.15;
  const wFast = 36.0;
  const wSlow = 2.5;
  if (t <= tCut) return (t - t0) * wFast;
  const base = (tCut - t0) * wFast;
  const dt = t - tCut;
  const tau = 2.0;
  return base + wSlow * dt + (wFast - wSlow) * tau * (1 - Math.exp(-dt / tau));
}

/** Vị trí & tư thế chiếc B-25B số 1 của Doolittle giữa đêm mưa bão núi đá */
function evalDoolittlePlane(t: number) {
  const x = (t - 664.0) * 26.5;
  const sag = prog(t, 679.3, 684.2);
  const turb = Math.sin(t * 2.15) * 0.52 + Math.cos(t * 3.4) * 0.2;
  const y = lerp(95.5, 89.8, sag) + turb;
  const z = Math.sin(t * 0.85) * 0.9;

  const sputterShake =
    (bump(t, 680.25, 0.35) - bump(t, 680.95, 0.38) + bump(t, 681.45, 0.38)) * 0.045;
  const roll = Math.sin(t * 1.75) * 0.032 + sag * 0.075 + sputterShake;
  const pitch = -sag * 0.028 + Math.cos(t * 1.5) * 0.015;

  return { x, y, z, roll, pitch };
}

/**
 * Hai phi công (Trung tá Jimmy Doolittle ghế trái & Cơ phó Richard Cole ghế phải),
 * bảng đồng hồ phát sáng xanh-hổ phách ấm, đèn báo nhảy dù ĐỎ RỰC và Cửa nắp thoát hiểm dưới bụng bật mở sắc nét!
 */
const CockpitCrewAndEscapeHatch: React.FC<{
  t: number;
  radioActive: number;
  bailRed: number;
  hatchOpen: number;
}> = ({ t, radioActive, bailRed, hatchOpen }) => {
  const leatherMat = useMemo(() => plain('#5c3922', 0.68, 0.08), []);
  const maeWestMat = useMemo(() => plain('#e3b429', 0.58, 0.06), []);
  const skinMat = useMemo(() => plain('#dfb18b', 0.65, 0.04), []);
  const headsetMat = useMemo(() => plain('#1d2024', 0.45, 0.4), []);
  const goggleMat = useMemo(() => plain('#b9c6d0', 0.25, 0.75), []);
  const bellyHatchOuterMat = useMemo(() => plain(PAINT.usaafBelly, 0.6, 0.28), []);
  const chromateInnerMat = useMemo(() => plain('#586e38', 0.72, 0.2), []);
  const hazardStripeMat = useMemo(() => plain('#d9a326', 0.55, 0.15), []);
  const redHandleMat = useMemo(() => plain('#c92218', 0.48, 0.2), []);

  const dialAmberMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffc46b', toneMapped: false }),
    [],
  );
  const dialGreenMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#6ff7c8', toneMapped: false }),
    [],
  );

  const doolittleHandLift = Math.max(radioActive, bailRed);

  return (
    <group>
      {/* --- 1. Hai phi công Doolittle (z=-0.34) & Cole (z=+0.34) rõ nét dưới kính buồng lái --- */}
      {([-0.34, 0.34] as const).map((zp, idx) => {
        const isDoolittle = idx === 0;
        const headNod = Math.sin(t * 2.4 + idx * 1.5) * 0.04;
        const headTurn = isDoolittle ? 0.14 * radioActive - 0.18 * bailRed : -0.1;
        return (
          <group key={`pilot-${idx}`} position={[4.3, 2.42, zp]}>
            <mesh position={[0.02, 0.28, 0]} rotation={[0, 0, -0.08]} geometry={rbox(0.26, 0.46, 0.34, 0.06)} material={leatherMat} />
            <mesh position={[0.11, 0.31, 0.08]} rotation={[0.12, 0, -0.18]} geometry={rbox(0.11, 0.34, 0.11, 0.03)} material={maeWestMat} />
            <mesh position={[0.11, 0.31, -0.08]} rotation={[-0.12, 0, -0.18]} geometry={rbox(0.11, 0.34, 0.11, 0.03)} material={maeWestMat} />
            <mesh position={[0.05, 0.46, 0]} geometry={rbox(0.14, 0.08, 0.24, 0.03)} material={maeWestMat} />

            <group position={[0.03, 0.62, 0]} rotation={[0, headTurn, headNod]}>
              <mesh material={skinMat}>
                <sphereGeometry args={[0.115, 16, 14]} />
              </mesh>
              <mesh position={[-0.015, 0.02, 0]} rotation={[0, 0, 0.15]} material={leatherMat}>
                <sphereGeometry args={[0.122, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
              </mesh>
              <mesh position={[-0.01, -0.01, 0.115]} rotation={[Math.PI / 2, 0, 0]} material={headsetMat}>
                <cylinderGeometry args={[0.042, 0.042, 0.03, 12]} />
              </mesh>
              <mesh position={[-0.01, -0.01, -0.115]} rotation={[Math.PI / 2, 0, 0]} material={headsetMat}>
                <cylinderGeometry args={[0.042, 0.042, 0.03, 12]} />
              </mesh>
              <mesh position={[0.095, 0.055, 0.042]} rotation={[0, Math.PI / 2, 0]} material={goggleMat}>
                <torusGeometry args={[0.032, 0.008, 6, 12]} />
              </mesh>
              <mesh position={[0.095, 0.055, -0.042]} rotation={[0, Math.PI / 2, 0]} material={goggleMat}>
                <torusGeometry args={[0.032, 0.008, 6, 12]} />
              </mesh>
              {isDoolittle && (
                <mesh position={[0.118, -0.045, 0.02]} material={headsetMat}>
                  <sphereGeometry args={[0.024, 8, 8]} />
                </mesh>
              )}
            </group>

            <mesh position={[0.21, 0.39, -0.14]} rotation={[0.15, 0.1, -1.25]} material={leatherMat}>
              <cylinderGeometry args={[0.042, 0.048, 0.34, 8]} />
            </mesh>
            <mesh
              position={[
                0.22,
                0.39 + (isDoolittle ? doolittleHandLift * 0.16 : 0),
                0.14 + (isDoolittle ? doolittleHandLift * 0.06 : 0),
              ]}
              rotation={[-0.15, -0.1, -1.25 + (isDoolittle ? doolittleHandLift * 0.45 : 0)]}
              material={leatherMat}
            >
              <cylinderGeometry args={[0.042, 0.048, 0.34, 8]} />
            </mesh>
          </group>
        );
      })}

      {/* --- 2. Cụm đồng hồ phát sáng xanh-hổ phách ấm trong buồng lái --- */}
      {([-0.44, -0.28, -0.12, 0.12, 0.28, 0.44] as const).map((zd, i) => (
        <mesh
          key={`dial-top-${i}`}
          position={[4.89, 2.82, zd]}
          rotation={[0, -Math.PI / 2, 0]}
          material={i % 2 === 0 ? dialAmberMat : dialGreenMat}
        >
          <circleGeometry args={[0.042, 12]} />
        </mesh>
      ))}
      {([-0.38, -0.2, 0.2, 0.38] as const).map((zd, i) => (
        <mesh
          key={`dial-bot-${i}`}
          position={[4.89, 2.68, zd]}
          rotation={[0, -Math.PI / 2, 0]}
          material={i % 2 === 1 ? dialAmberMat : dialGreenMat}
        >
          <circleGeometry args={[0.036, 12]} />
        </mesh>
      ))}

      <pointLight
        position={[4.76, 2.96, 0.04]}
        color={mix('#ffbe66', '#ff281e', bailRed * 0.76)}
        intensity={5.6 + bailRed * 4.2}
        distance={3.6}
        decay={1.7}
      />
      <pointLight
        position={[4.8, 2.74, -0.22]}
        color="#6ef2c0"
        intensity={2.4 * (1 - bailRed * 0.55)}
        distance={2.2}
        decay={1.8}
      />
      <pointLight
        position={[7.25, 2.28, 0]}
        color={mix('#ffd084', '#ff2218', bailRed * 0.9)}
        intensity={3.4 + bailRed * 5.8}
        distance={3.2}
        decay={1.7}
      />

      {/* --- 3. Đèn báo nhảy dù ĐỎ RỰC bật sáng lúc "Bail out!" (684.60 s) --- */}
      {bailRed > 0.01 && (
        <group>
          <mesh position={[4.58, 3.36, 0]}>
            <sphereGeometry args={[0.06, 12, 10]} />
            <meshBasicMaterial color="#ff241c" toneMapped={false} />
          </mesh>
          <mesh position={[6.95, 2.68, 0]}>
            <sphereGeometry args={[0.055, 12, 10]} />
            <meshBasicMaterial color="#ff241c" toneMapped={false} />
          </mesh>
          <pointLight
            position={[4.52, 3.25, 0]}
            color="#ff1e14"
            intensity={8.5 * bailRed}
            distance={4.5}
            decay={1.6}
          />
        </group>
      )}

      {/* --- 4. Cửa nắp thoát hiểm dưới bụng trước (Forward Belly Escape Hatch tại x=3.98, y=1.29, z=0) --- */}
      <group position={[3.98, 1.295, 0]}>
        {/* Khung viền thép hốc thoát hiểm */}
        <mesh position={[0, 0.03, 0]} material={plain('#262b21', 0.82, 0.25)}>
          <boxGeometry args={[1.04, 0.07, 0.8]} />
        </mesh>

        {/* Lòng giếng cửa thoát hiểm sâu vào bụng máy bay + bóng đèn báo nhảy dù đỏ bên trong (rõ kết cấu cơ khí, không lóa cháy) */}
        {hatchOpen > 0.02 && (
          <group>
            <mesh position={[0, 0.16, 0]} material={plain('#1b1212', 0.92, 0.1)}>
              <boxGeometry args={[0.92, 0.28, 0.68]} />
            </mesh>
            {/* Bóng đèn báo đỏ gắn trong vòm giếng thoát hiểm */}
            <mesh position={[0.22, 0.12, 0.2]}>
              <sphereGeometry args={[0.055, 10, 8]} />
              <meshBasicMaterial color="#ff281e" toneMapped={false} />
            </mesh>
            <pointLight
              position={[0.1, 0.2, 0.05]}
              color="#ff2418"
              intensity={4.2 * hatchOpen}
              distance={4.5}
              decay={1.8}
            />
          </group>
        )}

        {/* Cánh cửa nắp thoát hiểm xoay mở xuống dưới rõ từng thanh giằng kim loại, sọc cảnh báo vàng & tay khóa đỏ */}
        <group position={[0, -0.01, -0.36]} rotation={[hatchOpen * 1.26, 0, 0]}>
          <mesh position={[0, -0.022, 0.36]} geometry={rbox(0.96, 0.045, 0.72, 0.015)} material={bellyHatchOuterMat} castShadow />
          <mesh position={[0, 0.006, 0.36]} material={chromateInnerMat}>
            <boxGeometry args={[0.88, 0.018, 0.64]} />
          </mesh>
          {/* Hai thanh nẹp gia cường ngang bên trong nắp cửa */}
          <mesh position={[-0.24, 0.018, 0.36]} material={plain('#45572c', 0.7, 0.3)}>
            <boxGeometry args={[0.06, 0.022, 0.6]} />
          </mesh>
          <mesh position={[0.24, 0.018, 0.36]} material={plain('#45572c', 0.7, 0.3)}>
            <boxGeometry args={[0.06, 0.022, 0.6]} />
          </mesh>
          {/* Sọc cảnh báo vàng & tay gạt khẩn cấp màu đỏ */}
          <mesh position={[0, 0.016, 0.63]} material={hazardStripeMat}>
            <boxGeometry args={[0.86, 0.016, 0.055]} />
          </mesh>
          <mesh position={[0, 0.016, 0.09]} material={hazardStripeMat}>
            <boxGeometry args={[0.86, 0.016, 0.055]} />
          </mesh>
          <mesh position={[0.0, 0.028, 0.42]} material={redHandleMat}>
            <boxGeometry args={[0.3, 0.028, 0.065]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

/**
 * Các vòng sóng vô tuyến mảnh thanh thoát phát ra từ đỉnh cột ăng-ten lưng B-25 [3.10, 4.04, 0]
 * khi Doolittle gọi đài dẫn đường Chuqiao (665.52–673.9 s), rồi nhiễu đứt đoạn tan biến tại Dead static (674.08 s).
 */
const RadioBeaconRings: React.FC<{ t: number }> = ({ t }) => {
  const pulses = [665.55, 666.75, 667.95, 669.15, 670.4, 671.55, 672.4, 673.1];
  const staticAt = CUE.c04_s04_dead_static;

  return (
    <group position={[3.1, 4.04, 0]}>
      {pulses.map((pAt, idx) => {
        const age = t - pAt;
        const life = 2.1;
        if (age < 0 || age > life) return null;
        const u = age / life;
        // Giữ bán kính lan tỏa tinh tế 0.22..6.2 m quanh cột ăng-ten để không cắt thô qua tiền cảnh cánh quạt
        const radius = 0.22 + u * 6.0;

        const staticFade = 1 - prog(t, staticAt, staticAt + 0.85);
        if (staticFade <= 0.01) return null;

        const isStatic = t >= staticAt - 0.05;
        const flicker = isStatic ? 0.3 + 0.7 * Math.abs(Math.sin(t * 38 + idx * 3)) : 1;
        const col = isStatic ? '#ff6a4d' : '#73eaff';
        const op =
          Math.sin(Math.min(1, u * 4.5) * (Math.PI / 2)) *
          Math.pow(1 - u, 1.45) *
          0.62 *
          staticFade *
          flicker;
        if (op <= 0.01) return null;

        return (
          <mesh
            key={`rad-${idx}`}
            position={[0, u * 0.85, 0]}
            rotation={[Math.PI * 0.46, 0.14, -0.16]}
            scale={[
              1 + (isStatic ? Math.sin(t * 45 + idx) * 0.05 : 0),
              1 + (isStatic ? Math.cos(t * 41 + idx) * 0.05 : 0),
              1,
            ]}
          >
            <torusGeometry args={[radius, 0.018 + u * 0.01, 8, 52]} />
            <meshBasicMaterial color={col} transparent opacity={op} depthWrite={false} toneMapped={false} />
          </mesh>
        );
      })}

      {t >= staticAt - 0.1 && t <= staticAt + 0.95 && (
        <mesh scale={0.12 + 0.1 * Math.abs(Math.sin(t * 42))}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial
            color="#ff7a52"
            transparent
            opacity={(1 - prog(t, staticAt, staticAt + 0.95)) * 0.9}
            toneMapped={false}
          />
        </mesh>
      )}
    </group>
  );
};

/** Lửa xả khựng yếu ớt & khói xám mỏng từ vòng ống xả động cơ phải Wright R-2600 (z = +3.05 m) khi cạn sạch xăng */
const StarboardEngineSputter: React.FC<{ t: number }> = ({ t }) => {
  // Chuỗi các đợt khạc lửa xả liên tiếp phủ suốt giai đoạn unseen peaks & empty tanks (680.15–683.6 s)
  const b1 = bump(t, 680.18, 0.36);
  const b2 = bump(t, 680.65, 0.38);
  const b3 = bump(t, 680.92, 0.44);
  const b4 = bump(t, CUE.c04_s04_empty_tanks, 0.48);
  const b5 = bump(t, 681.95, 0.35);
  const b6 = bump(t, 682.72, 0.3);
  const b7 = bump(t, 683.45, 0.25);
  const flame = Math.max(b1, b2 * 0.9, b3 * 0.96, b4 * 1.05, b5 * 0.78, b6 * 0.58, b7 * 0.42);

  const smokeActive = prog(t, 680.05, 680.45) * (1 - prog(t, 684.8, 685.6) * 0.35);

  return (
    <group position={[3.52, 2.62, 3.05]}>
      {flame > 0.02 && (
        <group>
          <pointLight
            position={[0.15, -0.1, 0.9]}
            color="#ff8a2b"
            intensity={16 * flame}
            distance={7.0}
            decay={1.7}
          />
          {(
            [
              [0.02, 0.44, 0.64],
              [0.02, 0.14, 0.76],
              [0.02, -0.34, 0.68],
              [0.02, -0.68, 0.3],
            ] as V3[]
          ).map(([ox, oy, oz], idx) => {
            const localF = flame * (0.78 + 0.22 * Math.sin(t * 34 + idx * 2.1));
            return (
              <group key={`sp-fl-${idx}`} position={[ox - 0.32 * localF, oy, oz]} rotation={[0, 0, Math.PI / 2]}>
                <mesh scale={[0.17 * localF, 0.68 * localF, 0.17 * localF]}>
                  <coneGeometry args={[1, 2.3, 8]} />
                  <meshBasicMaterial color="#ff7f1f" transparent opacity={0.92 * flame} toneMapped={false} />
                </mesh>
                <mesh position={[0, 0.24 * localF, 0]} scale={[0.1 * localF, 0.38 * localF, 0.1 * localF]}>
                  <coneGeometry args={[1, 1.9, 8]} />
                  <meshBasicMaterial color="#bfeaff" transparent opacity={0.95 * flame} toneMapped={false} />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {smokeActive > 0.02 &&
        Array.from({ length: 10 }, (_, i) => {
          const cycle = ((t - 680.0) * 9.5 + i * 0.9) % 9.0;
          const u = cycle / 9.0;
          const sx = -0.35 - u * 8.5;
          const sy = -0.18 + u * 0.65 + Math.sin(i * 2.3 + t * 3) * 0.18;
          const sz = 0.58 + u * 0.45 + Math.cos(i * 1.7 + t * 2.5) * 0.16;
          const op = Math.sin(u * Math.PI) * 0.24 * smokeActive;
          if (op <= 0.01) return null;
          return (
            <mesh key={`sp-smk-${i}`} position={[sx, sy, sz]} scale={0.22 + u * 0.68}>
              <icosahedronGeometry args={[1, 1]} />
              <meshStandardMaterial color="#8d9eb3" roughness={0.95} transparent opacity={op} depthWrite={false} />
            </mesh>
          );
        })}
    </group>
  );
};

/** Mưa đêm mảnh giữ khoảng cách an toàn > 12 m khỏi ống kính Cam */
const SafeNightRain: React.FC<{ t: number; planePos: V3; camPos: V3 }> = ({ t, planePos, camPos }) => {
  const drops = useMemo(() => {
    return Array.from({ length: 105 }, (_, i) => ({
      rx: (rnd(i * 3 + 7) - 0.55) * 72,
      ry: (rnd(i * 5 + 11) - 0.45) * 34,
      rz: (rnd(i * 7 + 13) - 0.55) * 66,
      len: 2.2 + rnd(i * 11 + 17) * 1.8,
      spd: 36 + rnd(i * 13 + 19) * 12,
      ph: rnd(i * 17 + 23) * 36,
    }));
  }, []);

  return (
    <group>
      {drops.map((d, idx) => {
        const cycle = ((t * d.spd + d.ph) % 34) - 17;
        const wx = planePos[0] + d.rx - cycle * 0.28;
        const wy = planePos[1] + d.ry - cycle;
        const wz = planePos[2] + d.rz;
        if (Math.hypot(wx - camPos[0], wy - camPos[1], wz - camPos[2]) < 12.0) return null;
        return (
          <mesh key={`nr-${idx}`} position={[wx, wy, wz]} rotation={[0.04, 0, 0.28]}>
            <cylinderGeometry args={[0.01, 0.01, d.len, 4]} />
            <meshBasicMaterial color="#a9c8eb" transparent opacity={0.22} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
};

const C04S04: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // 3 đợt chớp mây bắt buộc theo thiết kế đạo diễn
  const lightning = Math.max(
    bump(t, 670.74, 0.45),
    bump(t, 679.92, 0.55),
    bump(t, 684.6, 0.5),
  );

  const night = STAGE_PRESETS.monsoonNight;
  const sky: [string, string, string] = [
    mix('#0b1628', '#223a60', lightning * 0.65),
    mix('#1e3352', '#6489b8', lightning * 0.78),
    mix('#101d30', '#2b4569', lightning * 0.55),
  ];

  // Quy tắc ánh sáng đêm BẮT BUỘC: sunColor #8eb4e3, sunIntensity >= 1.5, ambient >= 0.32, exposure >= 1.12
  const sunColor = mix('#8eb4e3', '#e3f0ff', lightning * 0.75);
  const sunIntensity = 1.58 + lightning * 3.1;
  const ambient = 0.34 + lightning * 0.34;
  const exposure = 1.14;
  const fogColor = mix('#182a44', '#4d6d96', lightning * 0.68);

  const pl = evalDoolittlePlane(t);
  const planePos: V3 = [pl.x, pl.y, pl.z];
  const propFast = t < 680.35;
  const propSpin = evalPropSpin(t);

  const radioActive =
    prog(t, CUE.c04_s04_calls_chuqiao - 0.2, CUE.c04_s04_calls_chuqiao + 0.6) *
    (1 - prog(t, CUE.c04_s04_dead_static, CUE.c04_s04_dead_static + 0.6));
  const bailRed = prog(t, CUE.c04_s04_bail_out - 0.08, CUE.c04_s04_bail_out + 0.16);
  const hatchOpen = prog(t, CUE.c04_s04_bail_out - 0.04, CUE.c04_s04_bail_out + 0.38);

  // Camera phía trước mũi phải B-25 nhìn ngược qua kính buồng lái & dãy đỉnh núi đá nhọn sau lưng/dưới bụng
  const pPeak = prog(t, 675.2, 680.0);
  const pBail = prog(t, 682.4, 684.5);

  const camOffX = lerp(lerp(13.8, 15.4, pPeak), 13.5, pBail);
  const camOffY = lerp(lerp(4.05, 1.95, pPeak), 1.45, pBail);
  const camOffZ = lerp(lerp(5.8, 7.2, pPeak), 6.25, pBail);

  const lookOffX = lerp(lerp(2.7, 2.0, pPeak), 3.35, pBail);
  const lookOffY = lerp(lerp(2.6, 1.35, pPeak), 1.92, pBail);
  const lookOffZ = lerp(lerp(-0.25, 0.22, pPeak), -0.1, pBail);

  const camPos: V3 = [
    pl.x + camOffX,
    pl.y + camOffY + Math.sin(t * 1.5) * 0.18,
    pl.z + camOffZ + Math.cos(t * 1.2) * 0.16,
  ];
  const camLook: V3 = [pl.x + lookOffX, pl.y + lookOffY, pl.z + lookOffZ];

  return (
    <AbsoluteFill>
      <Stage
        width={W}
        height={H}
        sky={sky}
        sun={[44, 52, 36]}
        sunColor={sunColor}
        sunIntensity={sunIntensity}
        fog={[115, 460]}
        fogColor={fogColor}
        env={0.38 + lightning * 0.24}
        ambient={ambient}
        exposure={exposure}
        shadowArea={85}
        shadowCenter={[pl.x - 10, pl.y * 0.55, -8]}
        post={{
          ...night.post,
          bloom: 0.68,
          vignette: 0.44,
        }}
      >
        <Cam pos={camPos} look={camLook} fov={39} roll={-pl.roll * 0.22} />

        <directionalLight
          position={[-48, 38, -42]}
          color="#82ace0"
          intensity={0.85 + lightning * 1.5}
        />
        <pointLight
          position={[pl.x + 5.5, pl.y - 4.5, pl.z + 6.5]}
          color={mix('#7ea8de', '#dcecff', lightning)}
          intensity={22 + lightning * 52}
          distance={45}
          decay={1.6}
        />

        <Terrain
          h={NIGHT_PEAKS_H}
          size={1360}
          seg={256}
          center={[150, -65]}
          colors={TERRAIN_PALETTE.chinaMountains}
          grainRepeat={58}
        />
        <Scatter
          kind="rock"
          count={190}
          area={[-180, -300, 620, 200]}
          h={NIGHT_PEAKS_H}
          seed={61}
          scale={[1.2, 2.7]}
          avoid={AVOID_STEEP_ROCK}
          tint="#768494"
        />
        <Scatter
          kind="pine"
          count={210}
          area={[-160, -280, 600, 190]}
          h={NIGHT_PEAKS_H}
          seed={73}
          scale={[0.85, 1.55]}
          avoid={AVOID_STEEP_PINE}
          tint="#7c938a"
        />

        <group position={planePos} rotation={[pl.roll, 0, pl.pitch]}>
          <B25Mitchell
            seed={18}
            propSpin={propSpin}
            propFast={propFast}
            gear={0}
            bombBay={0}
            broomsticks={true}
            lowerTurret={false}
            navLights={true}
            turretYaw={0.18}
            turretPitch={0.08}
          />

          <CockpitCrewAndEscapeHatch
            t={t}
            radioActive={radioActive}
            bailRed={bailRed}
            hatchOpen={hatchOpen}
          />

          <RadioBeaconRings t={t} />

          <StarboardEngineSputter t={t} />
        </group>

        <SafeNightRain t={t} planePos={planePos} camPos={camPos} />
      </Stage>

      <Label
        t={t}
        text="CHUQIAO BEACON · OFF"
        x={365}
        y={128}
        from={CUE.c04_s04_dead_static}
        until={679.1}
      />
      <Label
        t={t}
        text="BAIL OUT!"
        x={305}
        y={135}
        from={CUE.c04_s04_bail_out}
        until={685.55}
        bg="#cc2929"
        fg="#fff8f0"
      />
    </AbsoluteFill>
  );
};

export default C04S04;
