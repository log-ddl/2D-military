// C01S05 (57.44–68.56 s) — Cận cảnh nghẹt thở nhìn xuyên qua dãy cửa kính vuông sáng ấm & cửa trượt mở của buồng lái
// Nitto Maru đang lắc bão dữ dội (±20°): hiệu thính viên Nhật lao tới bàn điện đài phát tín hiệu Morse khẩn cấp về Tokyo,
// tia hồ quang điện xanh-trắng chạy dọc dây dẫn lên đỉnh cột ăng-ten vô tuyến giữa 2 cột nước đạn pháo 6-inch cao 28 m.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { lathe, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Trail, ballisticPoints, softDot } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { NittoMaru } from '../parts/NittoMaru';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';

const SWELL = 4.35;
const SHIP_HEADING = 0.28;
const SPLASH_1_AT = 58.8;
const SPLASH_2_AT = 64.2;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Biến đổi tọa độ local của tàu sang world space khớp tuyệt đối với <group position={[sx, pose.y, sz]} rotation={[pose.roll, heading, pose.pitch]}> */
function shipToWorld(
  local: V3,
  pose: { y: number; pitch: number; roll: number },
  shipX = 0,
  shipZ = 0,
  heading = 0,
): V3 {
  const v = new THREE.Vector3(local[0], local[1], local[2]);
  v.applyEuler(new THREE.Euler(pose.roll, heading, pose.pitch, 'XYZ'));
  return [v.x + shipX, v.y + pose.y, v.z + shipZ];
}

/** Chuỗi xung mã Morse tất định (tích-tè gấp gáp ~12 Hz) khi hiệu thính viên ấn ma-níp từ 63.32 s */
function morseSignal(t: number): number {
  if (t < CUE.c01_s05_radio) return 0;
  const dt = t - CUE.c01_s05_radio;
  const PATTERN = [
    1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 0, 1,
    1, 1, 0, 1, 0, 1, 1,
  ];
  const rate = t >= CUE.c01_s05_send_alert ? 12.2 : 8.5;
  const idx = Math.floor(dt * rate);
  const frac = dt * rate - idx;
  const bit = PATTERN[idx % PATTERN.length];
  if (!bit) return 0.14;
  return 0.22 + 0.78 * Math.sin(clamp(frac * 1.12, 0, 1) * Math.PI * 0.88);
}

/** Sprite bọt nước / sương mù cột nước đạn pháo hải quân */
const FoamSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({
  pos,
  size,
  color,
  opacity,
  rot = 0,
}) => {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  if (opacity <= 0.004 || size <= 0.02) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/** Cột nước trắng khổng lồ cao ~28 m dựng từ nhiều tầng bọt sương hữu cơ cuộn trào (không lộ khối trụ cứng) */
const ShellWaterspout: React.FC<{
  t: number;
  at: number;
  x: number;
  z: number;
  maxHeight?: number;
  seed?: number;
}> = ({ t, at, x, z, maxHeight = 28, seed = 7 }) => {
  const shellPts = useMemo(
    () => ballisticPoints([x + 36, 48, z - 34], [x, 0.5, z], 7, 28),
    [x, z],
  );
  const shellP = clamp((t - (at - 0.32)) / 0.32, 0, 1);

  const dt = t - at;
  const life = 3.9;
  const baseWaveY = waveY(x, z, t, SWELL);

  const uprightCoreGeo = useMemo(() => {
    const g = lathe(
      [
        [1.9, 0.0],
        [1.25, 0.2],
        [0.85, 0.55],
        [0.65, 0.85],
        [0.18, 1.0],
      ],
      12,
    );
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);

  if (t < at - 0.34 || dt > life) return null;

  const rise = dt > 0 ? clamp(1 - Math.pow(1 - Math.min(1, dt / 0.62), 3), 0, 1) : 0;
  const fall = dt > 1.4 ? Math.pow((dt - 1.4) / (life - 1.4), 1.6) : 0;
  const curH = Math.max(0.6, maxHeight * rise * (1 - fall * 0.52));
  const fade = dt > 0 ? clamp(1 - Math.pow(dt / life, 2.0), 0, 1) : 0;
  const flash = dt > 0 ? clamp(1 - dt / 0.25, 0, 1) : 0;

  return (
    <group>
      {shellP > 0 && dt < 0.08 && (
        <Trail
          points={shellPts}
          upto={shellP}
          color="#ffd688"
          width={0.14}
          opacity={0.94 * (1 - clamp(dt / 0.08, 0, 1))}
        />
      )}
      {dt >= 0 && (
        <group position={[x, baseWaveY - 0.5, z]}>
          {flash > 0 && (
            <>
              <pointLight color="#ffd180" intensity={380 * flash} distance={48} decay={1.5} position={[0, 3.5, 0]} />
              <mesh position={[0, 1.8, 0]} scale={[3.2 * (0.6 + (1 - flash)), 2.4, 3.2 * (0.6 + (1 - flash))]}>
                <sphereGeometry args={[1, 12, 10]} />
                <meshBasicMaterial color="#fff3cf" transparent opacity={flash * 0.88} toneMapped={false} />
              </mesh>
            </>
          )}

          {/* Lõi sương mờ bên trong để giữ khối đặc tự nhiên mà không lộ cạnh hình học */}
          <mesh scale={[0.9 + dt * 0.16, curH * 0.92, 0.9 + dt * 0.16]} geometry={uprightCoreGeo}>
            <meshStandardMaterial
              color="#e6f3fa"
              emissive="#98bdd4"
              emissiveIntensity={0.25 * fade}
              roughness={0.7}
              transparent
              opacity={0.28 * fade}
              depthWrite={false}
            />
          </mesh>

          {/* Vòng bọt sóng nổ bung rộng dưới chân cột nước */}
          {Array.from({ length: 14 }, (_, i) => {
            const ang = (i / 14) * Math.PI * 2 + rnd(seed + i) * 0.45;
            const rad = 1.6 + Math.min(1, dt / 1.7) * 7.8 + rnd(seed * 3 + i) * 1.6;
            return (
              <FoamSprite
                key={`b${i}`}
                pos={[Math.cos(ang) * rad, 1.2 + rnd(i + seed) * 1.4, Math.sin(ang) * rad]}
                size={(4.6 + dt * 1.9) * (0.78 + rnd(i * 5 + seed) * 0.45)}
                color="#e4f2f9"
                opacity={0.82 * fade}
                rot={i * 0.9 + dt * 0.25}
              />
            );
          })}

          {/* Thân cột nước 32 cụm bọt nước cuộn xoáy tung tóe lên độ cao 28 m */}
          {Array.from({ length: 32 }, (_, i) => {
            const frac = i / 31;
            const jetSpread = (0.35 + Math.pow(frac, 1.7) * 3.4) * (0.65 + dt * 0.34);
            const ang = i * 2.39996 + seed;
            const py = curH * (0.06 + frac * 0.96) - Math.max(0, dt - 1.1) * frac * 1.8;
            const sz = (3.6 + (1 - Math.abs(frac - 0.55)) * 3.8 + frac * 2.6 + dt * 1.1) * (0.78 + rnd(seed * 11 + i) * 0.42);
            return (
              <FoamSprite
                key={`p${i}`}
                pos={[Math.cos(ang) * jetSpread, Math.max(0.5, py), Math.sin(ang) * jetSpread]}
                size={sz}
                color={frac > 0.55 ? '#f5fcff' : '#cfe3ef'}
                opacity={(0.88 - frac * 0.22) * fade}
                rot={i * 1.3 + dt * 0.35}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

/** Mưa bão tạt chéo qua vùng ánh sáng ấm trước cửa buồng lái */
const StormRainStreaks: React.FC<{ t: number; center: V3 }> = ({ t, center }) => {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c8dfef',
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    [],
  );
  const dropGeo = useMemo(() => rbox(0.011, 0.68, 0.011, 0.002), []);

  const drops = useMemo(
    () =>
      Array.from({ length: 64 }, (_, i) => ({
        ox: (rnd(i * 3 + 1) - 0.5) * 13,
        oy: (rnd(i * 3 + 2) - 0.5) * 8.5,
        oz: (rnd(i * 3 + 3) - 0.5) * 13,
        spd: 13 + rnd(i * 7 + 5) * 7,
        phase: rnd(i * 11 + 9),
      })),
    [],
  );

  return (
    <group position={center}>
      {drops.map((d, idx) => {
        const cyc = (d.phase + (t * d.spd) / 9) % 1;
        const y = 4.2 - cyc * 8.5;
        const x = d.ox - cyc * 2.5;
        const z = d.oz + cyc * 1.3;
        return (
          <mesh
            key={idx}
            position={[x, y, z]}
            rotation={[-0.14, 0, -0.28]}
            geometry={dropGeo}
            material={mat}
          />
        );
      })}
    </group>
  );
};

/**
 * Buồng lái cận cảnh mở kính trong suốt & cửa trượt mạn trái (Port-Forward Hero Wheelhouse):
 * - Đặt Cam ở góc trước-mạn trái (x = +3.3..+4.5, z = -2.9..-4.0) hoàn toàn KHÔNG vướng cần cẩu cột trước!
 * - Hiệu thính viên & bàn điện đài Type 92 nằm ngay tiền cảnh bên cửa trượt mở mạn trái (z = -0.82 m), thấy rõ từng nhịp
 *   tay dập ma-níp điện báo và tia hồ quang xanh-trắng phóng từ ma-níp qua sứ xuyên mái chạy thẳng lên đỉnh cột ăng-ten!
 * - Thủy thủ lái tàu đứng cạnh bên (z = +0.58 m) ghì chặt bánh lái gỗ 8 nan chống sóng bão.
 */
const HeroWheelhouseAndSignal: React.FC<{ t: number; roll: number }> = ({ t, roll }) => {
  const mats = useMemo(
    () => ({
      cabinSteel: paint({
        color: '#5b656b',
        camo: ['#4c555a', '#6d777d'],
        camoScale: 1.8,
        wear: 0.38,
        dirt: 0.38,
        roughness: 0.72,
        metalness: 0.18,
        repeat: 0.42,
        seed: 26,
      }),
      teakWood: paint({
        color: '#6b4f36',
        wear: 0.28,
        dirt: 0.34,
        roughness: 0.78,
        metalness: 0.06,
        repeat: 0.55,
        seed: 27,
      }),
      // Giữ độ sáng ấm bão hòa vừa dưới ngưỡng cháy trắng của Bloom để bóng thủy thủ & điện đài sắc nét 100%!
      warmWall: plain('#e3a24c', 0.62, 0.04, {
        emissive: new THREE.Color('#b8590e'),
        emissiveIntensity: 0.52,
      }),
      warmPanel: plain('#b57434', 0.7, 0.06, {
        emissive: new THREE.Color('#7a3808'),
        emissiveIntensity: 0.32,
      }),
      chartPaper: plain('#f5dfb3', 0.72, 0.02, {
        emissive: new THREE.Color('#c47d2b'),
        emissiveIntensity: 0.38,
      }),
      lampBulb: plain('#ffe8b0', 0.2, 0.0, {
        emissive: new THREE.Color('#ff9d2e'),
        emissiveIntensity: 1.8,
      }),
      brass: plain('#cfa044', 0.3, 0.82),
      darkSteel: plain('#222930', 0.48, 0.55),
      radioBox: plain('#273230', 0.56, 0.44),
      dialWarm: plain('#f2ead0', 0.35, 0.05, {
        emissive: new THREE.Color('#e6a845'),
        emissiveIntensity: 0.55,
      }),
      tubeGlow: plain('#ffb448', 0.2, 0.0, {
        emissive: new THREE.Color('#ff7312'),
        emissiveIntensity: 1.65,
      }),
      ijnNavyUniform: plain('#131e2b', 0.78, 0.08),
      collarWhite: plain('#dce6f0', 0.72, 0.04),
      skinWarm: plain('#cf9872', 0.65, 0.04),
      porcelain: plain('#e8eef2', 0.26, 0.08),
      copperWire: plain('#bf743c', 0.34, 0.78),
      navGreen: plain('#28a862', 0.3, 0.1, {
        emissive: new THREE.Color('#198c4c'),
        emissiveIntensity: 1.2,
      }),
      navRed: plain('#cf302a', 0.3, 0.1, {
        emissive: new THREE.Color('#b5201a'),
        emissiveIntensity: 1.35,
      }),
      lifebuoyWhite: plain('#edf2f5', 0.72, 0.04),
      lifebuoyRed: plain(PAINT.hinomaruRed, 0.72, 0.04),
    }),
    [],
  );

  // Dây dẫn đồng nối từ sứ nóc máy phát Type 92 (sát vách hậu x = 1.62) -> sứ xuyên mái cabin -> dây feeder cột ăng-ten
  const leadWireGeo = useMemo(
    () =>
      pipe(
        [
          [1.64, 6.24, -1.16],
          [1.6, 6.52, -1.06],
          [1.56, 6.78, -0.96],
          [-0.22, 6.86, -0.74],
          [-1.95, 6.74, -0.52],
        ],
        0.026,
        18,
      ),
    [],
  );

  // Đường truyền tia hồ quang điện xanh-trắng từ khóa ma-níp -> máy phát -> sứ xuyên mái -> chạy thẳng lên đỉnh cột ăng-ten 13.0 m
  const signalPathFore = useMemo<V3[]>(
    () => [
      [1.92, 5.79, -1.02],
      [1.64, 6.18, -1.16],
      [1.56, 6.78, -0.96],
      [-0.22, 6.86, -0.74],
      [-1.95, 6.74, -0.52],
      [-2.05, 9.4, -0.78],
      [-2.1, 12.43, -1.33],
      [1.75, 12.74, -1.35],
      [5.6, 13.02, -1.36],
    ],
    [],
  );

  const signalPathAft = useMemo<V3[]>(
    () => [
      [-1.95, 6.74, -0.52],
      [-2.05, 9.4, -0.78],
      [-2.1, 12.43, -1.33],
      [-6.2, 12.58, -1.31],
      [-10.4, 12.72, -1.3],
    ],
    [],
  );

  const signalCurveFore = useMemo(
    () => new THREE.CatmullRomCurve3(signalPathFore.map((p) => new THREE.Vector3(...p))),
    [signalPathFore],
  );

  // Hai nhánh tia hồ quang điện zíc-zắc (jagged high-voltage plasma arcs) xoắn quanh dây dẫn lên đỉnh cột ăng-ten
  const jaggedArcPointsA = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    const N = 38;
    const phase = Math.floor(t * 20);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = signalCurveFore.getPointAt(u);
      const amp = i === 0 || i === N ? 0 : 0.11;
      const jx = (rnd(phase * 41 + i * 3 + 1) - 0.5) * 2 * amp;
      const jy = (rnd(phase * 41 + i * 3 + 2) - 0.5) * 2 * amp;
      const jz = (rnd(phase * 41 + i * 3 + 3) - 0.5) * 2 * amp;
      pts.push([p.x + jx, p.y + jy, p.z + jz]);
    }
    return pts;
  }, [signalCurveFore, Math.floor(t * 20)]);

  const jaggedArcPointsB = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    const N = 34;
    const phase = Math.floor(t * 20) + 17;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const p = signalCurveFore.getPointAt(u);
      const amp = i === 0 || i === N ? 0 : 0.085;
      const jx = (rnd(phase * 53 + i * 5 + 1) - 0.5) * 2 * amp;
      const jy = (rnd(phase * 53 + i * 5 + 2) - 0.5) * 2 * amp;
      const jz = (rnd(phase * 53 + i * 5 + 3) - 0.5) * 2 * amp;
      pts.push([p.x + jx, p.y + jy, p.z + jz]);
    }
    return pts;
  }, [signalCurveFore, Math.floor(t * 20)]);

  // Hiệu thính viên lao từ giữa buồng lái (z = +0.08) sang bàn điện đài mạn trái (z = -0.66) tại CUE.c01_s05_lunges (62.58 s),
  // xoay nghiêng 3/4 hướng ra ống kính & bàn ma-níp (không bị thùng máy che khuất!)
  const lungeP = prog(t, 62.08, CUE.c01_s05_radio + 0.15);
  const opX = lerp(1.78, 1.88, lungeP);
  const opZ = lerp(0.08, -0.66, lungeP);
  const opYaw = lerp(-0.18, 0.88, lungeP);
  const opLeanFwd = lerp(0.06, 0.28, lungeP) + (lungeP > 0.08 && lungeP < 0.92 ? Math.sin(lungeP * Math.PI) * 0.24 : 0);
  const opSideTilt = -(lungeP > 0.05 && lungeP < 0.95 ? Math.sin(lungeP * Math.PI) * 0.26 : 0) - roll * 0.18;

  const pulse = morseSignal(t);
  const alertActive = t >= CUE.c01_s05_send_alert;
  const wheelAngle = -roll * 2.5 + Math.sin(t * 3.1) * 0.24;

  return (
    <group>
      {/* ==================== 1. KẾT CẤU CABIN MỞ CỬA MẠN TRÁI & CỬA SỔ TRONG SUỐT ==================== */}
      {/* Bệ thép mặt trước & mạn phải; mạn trái (z = -2.02 m) chừa hẳn ô cửa trượt mở toang ở x = +1.02..+1.98 m! */}
      <mesh position={[0.16, 5.0, 0.12]} geometry={rbox(4.36, 1.08, 3.84, 0.05)} material={mats.cabinSteel} castShadow receiveShadow />
      <mesh position={[-0.5, 5.0, -2.02]} geometry={rbox(3.04, 1.08, 0.16, 0.03)} material={mats.cabinSteel} castShadow />
      <mesh position={[2.16, 5.0, -2.02]} geometry={rbox(0.38, 1.08, 0.16, 0.03)} material={mats.cabinSteel} castShadow />
      {([-1.25, 0, 1.25] as const).map((kz) => (
        <mesh
          key={`kn${kz}`}
          position={[1.55, 4.18, kz]}
          rotation={[0, 0, 0.52]}
          geometry={rbox(1.15, 0.14, 0.16, 0.02)}
          material={mats.cabinSteel}
        />
      ))}

      {/* Gờ bệ cửa sổ bằng gỗ tếch */}
      <mesh position={[2.32, 5.56, 0.0]} geometry={rbox(0.16, 0.09, 4.14, 0.015)} material={mats.teakWood} />
      <mesh position={[-0.5, 5.56, -2.05]} geometry={rbox(3.08, 0.09, 0.14, 0.015)} material={mats.teakWood} />
      <mesh position={[0.16, 5.56, 2.04]} geometry={rbox(4.36, 0.09, 0.14, 0.015)} material={mats.teakWood} />

      {/* Hộp đèn hành trình Đỏ (mạn trái -Z, ngay tiền cảnh!) & Xanh lục (mạn phải +Z) + Phao cứu sinh trắng-đỏ */}
      <group position={[2.16, 5.16, -2.14]}>
        <mesh geometry={rbox(0.34, 0.26, 0.16, 0.02)} material={mats.teakWood} />
        <mesh position={[0.04, 0, -0.06]} geometry={rbox(0.22, 0.16, 0.08, 0.02)} material={mats.navRed} />
      </group>
      <group position={[2.16, 5.16, 2.12]}>
        <mesh geometry={rbox(0.34, 0.26, 0.16, 0.02)} material={mats.teakWood} />
        <mesh position={[0.04, 0, 0.06]} geometry={rbox(0.22, 0.16, 0.08, 0.02)} material={mats.navGreen} />
      </group>
      <group position={[-0.35, 5.02, -2.13]}>
        <mesh material={mats.lifebuoyWhite}>
          <torusGeometry args={[0.31, 0.085, 10, 20]} />
        </mesh>
        {[0, 1, 2, 3].map((q) => (
          <mesh
            key={q}
            rotation={[0, 0, (q * Math.PI) / 2]}
            position={[Math.cos((q * Math.PI) / 2) * 0.31, Math.sin((q * Math.PI) / 2) * 0.31, 0]}
            geometry={rbox(0.14, 0.18, 0.18, 0.02)}
            material={mats.lifebuoyRed}
          />
        ))}
      </group>

      {/* Vách hậu nội thất buồng lái (x = +1.42 m), vách phải (z = +1.96 m), sàn (y = 5.48 m) & trần (y = 6.47 m) */}
      <mesh position={[1.42, 5.98, 0.0]} geometry={rbox(0.05, 0.96, 3.98, 0.01)} material={mats.warmWall} />
      <mesh position={[1.43, 5.64, 0.0]} geometry={rbox(0.06, 0.32, 3.98, 0.01)} material={mats.warmPanel} />
      <mesh position={[1.88, 5.98, 1.96]} geometry={rbox(0.92, 0.96, 0.05, 0.01)} material={mats.warmPanel} />
      <mesh position={[1.88, 5.48, 0.0]} geometry={rbox(0.94, 0.06, 4.02, 0.01)} material={mats.teakWood} />
      <mesh position={[1.88, 6.47, 0.0]} geometry={rbox(0.96, 0.05, 4.04, 0.01)} material={mats.warmPanel} />

      {/* Hải đồ tuần tiễu Thái Bình Dương & Đồng hồ nghiêng bão (Clinometer) lắc mạnh trên vách hậu */}
      <group position={[1.455, 6.06, 0.05]}>
        <mesh geometry={rbox(0.02, 0.44, 0.64, 0.005)} material={mats.teakWood} />
        <mesh position={[0.008, 0, 0]} geometry={rbox(0.015, 0.38, 0.58, 0.003)} material={mats.chartPaper} />
        <mesh position={[0.018, 0.04, -0.12]} rotation={[0.35, 0, 0]} geometry={rbox(0.01, 0.2, 0.07, 0.002)} material={mats.teakWood} />
        <mesh position={[0.018, -0.03, 0.12]} geometry={rbox(0.012, 0.05, 0.05, 0.01)} material={mats.lifebuoyRed} />
      </group>
      <group position={[1.455, 6.24, -0.52]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
          <cylinderGeometry args={[0.11, 0.11, 0.025, 16]} />
        </mesh>
        <mesh position={[0.014, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.dialWarm}>
          <cylinderGeometry args={[0.09, 0.09, 0.015, 16]} />
        </mesh>
        <mesh position={[0.024, -0.02, 0]} rotation={[-roll * 1.4, 0, 0]} geometry={rbox(0.01, 0.075, 0.014, 0.002)} material={mats.darkSteel} />
      </group>

      {/* Đèn lồng trần buồng lái & nguồn sáng ấm cân bằng (không gây cháy trắng Bloom, tôn rõ khối nhân vật!) */}
      <group position={[1.88, 6.41, -0.15]}>
        <mesh material={mats.brass}>
          <cylinderGeometry args={[0.12, 0.15, 0.07, 12]} />
        </mesh>
        <mesh position={[0, -0.05, 0]} material={mats.lampBulb}>
          <sphereGeometry args={[0.072, 10, 8]} />
        </mesh>
      </group>
      <pointLight position={[1.95, 6.32, -0.65]} color="#ffab3d" intensity={7.5} distance={6.5} decay={1.45} />
      <pointLight position={[1.95, 6.32, 0.55]} color="#ffa230" intensity={6.0} distance={6.5} decay={1.45} />

      {/* ==================== 2. BÁNH LÁI GỖ 8 NAN & THỦY THỦ LÁI TÀU NHẬT (z = +0.62 m) ==================== */}
      <mesh position={[2.06, 5.66, 0.62]} geometry={rbox(0.24, 0.42, 0.22, 0.03)} material={mats.teakWood} />
      <group position={[2.14, 5.7, 0.22]}>
        <mesh material={mats.teakWood}>
          <cylinderGeometry args={[0.085, 0.105, 0.42, 12]} />
        </mesh>
        <mesh position={[0, 0.24, 0]} material={mats.brass}>
          <sphereGeometry args={[0.1, 12, 10]} />
        </mesh>
        <mesh position={[-0.04, 0.25, 0]} material={mats.tubeGlow}>
          <sphereGeometry args={[0.05, 8, 8]} />
        </mesh>
      </group>
      <group position={[1.95, 5.85, 0.62]} rotation={[wheelAngle, 0, 0]}>
        <mesh rotation={[0, Math.PI / 2, 0]} material={mats.teakWood}>
          <torusGeometry args={[0.27, 0.028, 10, 20]} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
          <cylinderGeometry args={[0.055, 0.055, 0.06, 12]} />
        </mesh>
        {Array.from({ length: 8 }, (_, s) => (
          <mesh
            key={s}
            rotation={[(s * Math.PI) / 4, 0, 0]}
            geometry={rbox(0.024, 0.72, 0.024, 0.005)}
            material={mats.teakWood}
          />
        ))}
      </group>

      {/* Thủy thủ lái tàu Nhật đội mũ thủy thủ ghì chặt vành bánh lái */}
      <group position={[1.68, 5.48, 0.62]} rotation={[-roll * 0.18, -0.1, -0.08]}>
        <mesh position={[0, 0.32, 0]} geometry={rbox(0.24, 0.48, 0.38, 0.07)} material={mats.ijnNavyUniform} castShadow />
        <mesh position={[0.05, 0.52, 0]} rotation={[0, 0, -0.25]} geometry={rbox(0.18, 0.08, 0.3, 0.02)} material={mats.collarWhite} />
        <group position={[0.04, 0.66, 0]} rotation={[0, -0.18, -0.06]}>
          <mesh material={mats.skinWarm}>
            <sphereGeometry args={[0.105, 14, 12]} />
          </mesh>
          <mesh position={[-0.01, 0.06, 0]} material={mats.ijnNavyUniform}>
            <cylinderGeometry args={[0.125, 0.11, 0.075, 14]} />
          </mesh>
          <mesh position={[-0.01, 0.03, 0]} material={mats.collarWhite}>
            <cylinderGeometry args={[0.114, 0.114, 0.02, 14]} />
          </mesh>
        </group>
        <mesh
          position={[0.14, 0.44, 0.2]}
          rotation={[0.22 + wheelAngle * 0.18, -0.18, -0.28]}
          geometry={rbox(0.32, 0.085, 0.085, 0.03)}
          material={mats.ijnNavyUniform}
        />
        <mesh
          position={[0.14, 0.44, -0.2]}
          rotation={[-0.22 + wheelAngle * 0.18, 0.18, -0.28]}
          geometry={rbox(0.32, 0.085, 0.085, 0.03)}
          material={mats.ijnNavyUniform}
        />
      </group>

      {/* ==================== 3. BÀN ĐIỆN ĐÀI TYPE 92 ĐẶT SÁT VÁCH HẬU HƯỚNG RA PHÍA TRƯỚC (+X) & HIỆU THÍNH VIÊN ==================== */}
      <group position={[1.6, 5.48, -1.16]}>
        {/* Mặt bàn gỗ tếch chữ L vươn ra phía trước đố cửa mở để đặt ma-níp đồng ngay tiền cảnh */}
        <mesh position={[0.18, 0.24, 0.14]} geometry={rbox(0.62, 0.055, 0.96, 0.01)} material={mats.teakWood} />
        {/* Máy phát vô tuyến Hải quân Nhật Type 92 đặt sát vách hậu (x = 1.60), MẶT ĐỒNG HỒ & ĐÈN CHÂN KHÔNG HƯỚNG RA ỐNG KÍNH (+X)! */}
        <mesh position={[0.02, 0.5, -0.06]} geometry={rbox(0.28, 0.48, 0.56, 0.02)} material={mats.radioBox} castShadow />
        <mesh position={[0.165, 0.58, -0.18]} rotation={[0, 0, Math.PI / 2]} material={mats.dialWarm}>
          <cylinderGeometry args={[0.064, 0.064, 0.016, 14]} />
        </mesh>
        <mesh position={[0.165, 0.58, 0.06]} rotation={[0, 0, Math.PI / 2]} material={mats.dialWarm}>
          <cylinderGeometry args={[0.064, 0.064, 0.016, 14]} />
        </mesh>
        <mesh position={[0.162, 0.42, -0.06]} geometry={rbox(0.02, 0.095, 0.28, 0.01)} material={mats.tubeGlow} />
        {([-0.2, -0.06, 0.08] as const).map((kz) => (
          <mesh key={kz} position={[0.174, 0.33, kz]} rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
            <cylinderGeometry args={[0.028, 0.028, 0.032, 10]} />
          </mesh>
        ))}

        {/* Khóa ma-níp điện báo bằng đồng (x_ship = 1.92, z_ship = -1.02 — hoàn toàn lộ thiên trước mặt hiệu thính viên!) */}
        <group position={[0.32, 0.28, 0.14]}>
          <mesh geometry={rbox(0.16, 0.028, 0.11, 0.005)} material={mats.brass} />
          <mesh
            position={[0.02, 0.038 - pulse * 0.018, 0]}
            rotation={[0, 0, -pulse * 0.16]}
            geometry={rbox(0.15, 0.02, 0.032, 0.004)}
            material={mats.brass}
          />
          <mesh position={[0.08, 0.052 - pulse * 0.024, 0]} material={mats.darkSteel}>
            <cylinderGeometry args={[0.028, 0.022, 0.022, 10]} />
          </mesh>
        </group>

        <mesh position={[0.04, 0.78, 0.0]} material={mats.porcelain}>
          <cylinderGeometry args={[0.035, 0.048, 0.15, 10]} />
        </mesh>
      </group>

      {/* Hiệu thính viên Nhật lao bổ nhào sang bàn điện đài lúc 62.58 s, góc nghiêng 3/4 rõ trọn mặt, tai nghe & tay phải dập ma-níp */}
      <group position={[opX, 5.48, opZ]} rotation={[opSideTilt, opYaw, -opLeanFwd]}>
        <mesh position={[0, 0.31, 0]} geometry={rbox(0.24, 0.48, 0.37, 0.07)} material={mats.ijnNavyUniform} castShadow />
        <mesh position={[0.05, 0.51, 0]} geometry={rbox(0.17, 0.07, 0.29, 0.015)} material={mats.collarWhite} />
        <group position={[0.05, 0.65, 0]} rotation={[0, -0.18 * lungeP, -0.12 * lungeP]}>
          <mesh material={mats.skinWarm}>
            <sphereGeometry args={[0.104, 14, 12]} />
          </mesh>
          <mesh position={[-0.01, 0.045, 0]} material={mats.darkSteel}>
            <sphereGeometry args={[0.108, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
          </mesh>
          {lungeP > 0.35 && (
            <>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.brass}>
                <torusGeometry args={[0.114, 0.013, 6, 14, Math.PI]} />
              </mesh>
              <mesh position={[0, -0.01, 0.11]} rotation={[Math.PI / 2, 0, 0]} material={mats.darkSteel}>
                <cylinderGeometry args={[0.038, 0.038, 0.032, 10]} />
              </mesh>
              <mesh position={[0, -0.01, -0.11]} rotation={[Math.PI / 2, 0, 0]} material={mats.darkSteel}>
                <cylinderGeometry args={[0.038, 0.038, 0.032, 10]} />
              </mesh>
            </>
          )}
        </group>

        {/* Tay phải vươn tới dập liên hồi lên khóa ma-níp đồng */}
        <mesh
          position={[lerp(0.08, 0.17, lungeP), lerp(0.56, 0.35 - pulse * 0.03, lungeP), lerp(0.14, -0.16, lungeP)]}
          rotation={[0.14, 0.28, lerp(0.75, -0.45 - pulse * 0.2, lungeP)]}
          geometry={rbox(0.35, 0.082, 0.082, 0.03)}
          material={mats.ijnNavyUniform}
        />
        {/* Tay trái giữ chụp tai nghe bên tai */}
        <mesh
          position={[lerp(0.14, 0.09, lungeP), lerp(0.44, 0.55, lungeP), lerp(-0.16, 0.16, lungeP)]}
          rotation={[0.25, -0.18, lerp(-0.3, 0.44, lungeP)]}
          geometry={rbox(0.31, 0.08, 0.08, 0.03)}
          material={mats.ijnNavyUniform}
        />
      </group>

      {/* ==================== 4. KHUNG CỬA SỔ MẶT TRƯỚC (KHOẢNG MỞ RỘNG TRƯỚC BÀN ĐIỆN ĐÀI) & CỬA TRƯỢT MỞ MẠN TRÁI ==================== */}
      {([-2.05, -1.56, -0.22, 0.44, 1.24, 2.04] as const).map((mz) => (
        <mesh key={`fm${mz}`} position={[2.32, 5.99, mz]} geometry={rbox(0.08, 0.86, 0.065, 0.01)} material={mats.teakWood} />
      ))}
      <mesh position={[2.32, 6.4, 0.0]} geometry={rbox(0.11, 0.08, 4.16, 0.01)} material={mats.teakWood} />

      {/* Cánh cửa sổ chắn bão mặt trước hé mở bản lề trên */}
      {(
        [
          { zc: -1.8, w: 0.42, tilt: 0.22 },
          { zc: -0.89, w: 1.24, tilt: 0.34 },
          { zc: 0.11, w: 0.58, tilt: 0.24 },
          { zc: 0.84, w: 0.72, tilt: 0.18 },
          { zc: 1.64, w: 0.72, tilt: 0.08 },
        ] as const
      ).map((pw, idx) => (
        <group key={`fpw${idx}`} position={[2.34, 6.34, pw.zc]} rotation={[0, 0, pw.tilt]}>
          <mesh position={[0, -0.68, 0]} geometry={rbox(0.03, 0.032, pw.w, 0.004)} material={mats.teakWood} />
          <mesh position={[0, -0.34, -pw.w * 0.49]} geometry={rbox(0.028, 0.68, 0.026, 0.004)} material={mats.teakWood} />
          <mesh position={[0, -0.34, pw.w * 0.49]} geometry={rbox(0.028, 0.68, 0.026, 0.004)} material={mats.teakWood} />
        </group>
      ))}

      {/* Dãy đố cửa mạn trái (z = -2.05 m) chừa trọn khung cửa trượt mở toang x = +1.00..+2.28 m không vướng cột chắn! */}
      {([-1.98, -1.32, -0.66, 0.0, 1.0, 2.32] as const).map((mx) => (
        <mesh key={`pm${mx}`} position={[mx, 5.99, -2.05]} geometry={rbox(0.07, 0.86, 0.085, 0.01)} material={mats.teakWood} />
      ))}
      <mesh position={[0.16, 6.4, -2.05]} geometry={rbox(4.36, 0.08, 0.11, 0.01)} material={mats.teakWood} />
      <group position={[0.48, 5.46, -2.11]}>
        <mesh geometry={rbox(0.9, 1.72, 0.055, 0.01)} material={mats.teakWood} castShadow />
        <mesh position={[0, 0.36, -0.01]} geometry={rbox(0.58, 0.52, 0.03, 0.005)} material={mats.warmWall} />
        <mesh position={[0.35, -0.1, -0.04]} geometry={rbox(0.04, 0.16, 0.04, 0.01)} material={mats.brass} />
      </group>

      {/* Mái gỗ buồng lái nhô mí chắn bão, cặp sứ cách điện cao áp & dây đồng dẫn thẳng lên cột ăng-ten */}
      <mesh position={[0.16, 6.53, 0.0]} geometry={rbox(4.66, 0.13, 4.38, 0.03)} material={mats.teakWood} castShadow />
      <mesh position={[0.14, 6.62, 0.0]} geometry={rbox(4.44, 0.07, 4.16, 0.02)} material={mats.cabinSteel} />
      {([-0.96, 0.62] as const).map((iz) => (
        <mesh key={`ins${iz}`} position={[1.56, 6.75, iz]} material={mats.porcelain}>
          <cylinderGeometry args={[0.07, 0.1, 0.28, 12]} />
        </mesh>
      ))}
      <mesh geometry={leadWireGeo} material={mats.copperWire} />

      {/* ==================== 5. TIA HỒ QUANG ĐIỆN XANH-TRẮNG PHÓNG DỌC DÂY DẪN LÊN ĐỈNH CỘT VÔ TUYẾN (t >= 63.90 s) ==================== */}
      {pulse > 0.2 && (
        <group position={[1.92, 5.8, -1.02]}>
          <pointLight color="#7ef2ff" intensity={9 * pulse} distance={3.0} decay={1.6} />
          <FoamSprite pos={[0, 0, 0]} size={0.22 + pulse * 0.14} color="#7cf0ff" opacity={0.8 * pulse} />
          <FoamSprite pos={[0, 0, 0]} size={0.11 + pulse * 0.08} color="#ffffff" opacity={0.95 * pulse} />
        </group>
      )}

      {alertActive && (
        <group>
          {/* Lõi dây dẫn phát sáng xanh băng + 2 nhánh tia hồ quang điện zíc-zắc cao áp quấn dọc dây lên đỉnh cột 13 m! */}
          <Trail
            points={signalPathFore}
            upto={clamp((t - CUE.c01_s05_send_alert) / 0.32, 0, 1)}
            color="#2ad4ff"
            width={0.036 + pulse * 0.024}
            opacity={0.78 + pulse * 0.22}
            glow
          />
          <Trail
            points={jaggedArcPointsA}
            upto={clamp((t - CUE.c01_s05_send_alert) / 0.32, 0, 1)}
            color="#ebffff"
            width={0.024 + pulse * 0.016}
            opacity={0.94}
            glow
          />
          <Trail
            points={jaggedArcPointsB}
            upto={clamp((t - CUE.c01_s05_send_alert) / 0.32, 0, 1)}
            color="#6ce8ff"
            width={0.018 + pulse * 0.014}
            opacity={0.82}
            glow
          />
          <Trail
            points={signalPathAft}
            upto={clamp((t - CUE.c01_s05_send_alert - 0.1) / 0.35, 0, 1)}
            color="#4ee0ff"
            width={0.028 + pulse * 0.018}
            opacity={0.66 + pulse * 0.26}
            glow
          />

          {/* Tia lửa điện sắc gọn tại đầu sứ cao áp xuyên mái */}
          <group position={[1.56, 6.88, -0.96]}>
            <pointLight color="#78eeff" intensity={12 * (0.45 + 0.55 * pulse)} distance={4.8} decay={1.5} />
            <FoamSprite pos={[0, 0, 0]} size={0.26 + pulse * 0.14} color="#58e6ff" opacity={0.75} />
            <FoamSprite pos={[0, 0, 0]} size={0.13 + pulse * 0.08} color="#ffffff" opacity={0.95} />
          </group>

          {/* 7 xung năng lượng vô tuyến xanh-trắng nối đuôi nhau bắn vọt dọc dây feeder lên đỉnh cột ăng-ten */}
          {Array.from({ length: 7 }, (_, k) => {
            const u = ((t - CUE.c01_s05_send_alert) * 1.6 + k / 7) % 1;
            if (t - CUE.c01_s05_send_alert < k * 0.09) return null;
            const p = signalCurveFore.getPointAt(u);
            return (
              <group key={`pkt${k}`} position={[p.x, p.y, p.z]}>
                <FoamSprite pos={[0, 0, 0]} size={0.28 + pulse * 0.14} color="#3cd8ff" opacity={0.82} />
                <FoamSprite pos={[0, 0, 0]} size={0.13 + pulse * 0.07} color="#ffffff" opacity={0.98} />
              </group>
            );
          })}

          {/* Tia chớp phát sóng cao tần lóe sáng ở đỉnh cột ăng-ten (y = 12.43 m) */}
          {t >= CUE.c01_s05_send_alert + 0.2 && (
            <group position={[-2.1, 12.43, -1.33]}>
              <FoamSprite pos={[0, 0, 0]} size={0.65 + pulse * 0.35} color="#4ce0ff" opacity={0.78} />
              <FoamSprite pos={[0, 0, 0]} size={0.25 + pulse * 0.15} color="#ffffff" opacity={0.96} />
            </group>
          )}
        </group>
      )}
    </group>
  );
};

const C01S05: React.FC = () => {
  const t = useT();

  const basePose = shipPose(0, 0, 30.0, 5.8, t, SWELL, SHIP_HEADING);
  const dt1 = t - SPLASH_1_AT;
  const dt2 = t - SPLASH_2_AT;
  const jolt1 = dt1 > 0 && dt1 < 2.8 ? Math.exp(-dt1 * 1.85) * Math.sin(dt1 * 14.5) : 0;
  const jolt2 = dt2 > 0 && dt2 < 2.8 ? Math.exp(-dt2 * 1.85) * Math.sin(dt2 * 15.5) : 0;

  const fullPose = {
    y: basePose.y + (jolt1 + jolt2) * 0.22,
    pitch: basePose.pitch * 1.25 + Math.cos(t * 1.72 + 1.1) * 0.065 + (jolt1 + jolt2) * 0.065,
    roll: basePose.roll * 1.45 + Math.sin(t * 2.15 + 0.6) * 0.21 + (jolt1 * 0.16 - jolt2 * 0.18),
  };

  const lagBase = shipPose(0, 0, 30.0, 5.8, t - 0.14, SWELL, SHIP_HEADING);
  const camTrackPose = {
    y: lerp(lagBase.y, fullPose.y, 0.75),
    pitch: fullPose.pitch * 0.68,
    roll: fullPose.roll * 0.56,
  };

  // Góc cận trước-mạn trái vừa đủ ôm trọn cả nội thất buồng lái (Hiệu thính viên + Ma-níp + Bánh lái) lẫn cột ăng-ten vô tuyến!
  const pPush = prog(t, 57.44, 68.1);
  const pMast = prog(t, CUE.c01_s05_send_alert - 0.15, CUE.c01_s05_send_alert + 1.1);
  const localCamPos: V3 = [
    lerp(4.95, 4.05, pPush),
    lerp(6.75, 6.48, pPush),
    lerp(-4.45, -3.65, pPush),
  ];
  const localLook: V3 = [
    lerp(0.35, 0.55, pPush),
    lerp(6.62, 6.52, pPush) + pMast * 0.65,
    lerp(0.18, -0.28, pPush),
  ];

  const rawWorldCam = shipToWorld(localCamPos, camTrackPose, 0, 0, SHIP_HEADING);
  const shakeX = (jolt1 - jolt2) * 0.24;
  const shakeY = (Math.abs(jolt1) + Math.abs(jolt2)) * 0.18;
  const safeCamY = Math.max(rawWorldCam[1] + shakeY, waveY(rawWorldCam[0], rawWorldCam[2], t, SWELL) + 1.65);
  const camPos: V3 = [rawWorldCam[0] + shakeX, safeCamY, rawWorldCam[2] + shakeX * 0.5];

  const camLook = shipToWorld(localLook, fullPose, 0, 0, SHIP_HEADING);
  const camRoll = -fullPose.roll * 0.24 + (jolt1 - jolt2) * 0.045;

  return (
    <Stage
      {...STAGE_PRESETS.stormDawn}
      shadowArea={26}
      shadowCenter={[1, 6, 0]}
      fog={[78, 390]}
    >
      <Cam pos={camPos} look={camLook} fov={50} roll={camRoll} />

      <OceanSurface t={t} swell={SWELL} size={960} seg={168} palette="stormPacific" />

      <group position={[0, fullPose.y, 0]} rotation={[fullPose.roll, SHIP_HEADING, fullPose.pitch]}>
        <NittoMaru damage={0.12} wheelhouseGlow />
        <HeroWheelhouseAndSignal t={t} roll={fullPose.roll} />
      </group>

      {/* Hai cột nước trắng khổng lồ cao 28 m dựng hai bên hậu cảnh sau buồng lái lúc 58.8 s (bên phải) & 64.2 s (bên trái) */}
      <ShellWaterspout t={t} at={SPLASH_1_AT} x={-4.2} z={26.5} maxHeight={28.5} seed={19} />
      <ShellWaterspout t={t} at={SPLASH_2_AT} x={-23.5} z={17.5} maxHeight={29.5} seed={43} />

      <StormRainStreaks t={t} center={[camLook[0] + 0.8, camLook[1], camLook[2] - 1.2]} />
    </Stage>
  );
};

export default C01S05;
