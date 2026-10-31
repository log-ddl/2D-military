import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lerp, prog, rnd, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_PROVING_NOON } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';

// ---------------- Địa hình trường bắn cận chiến 360° (tạo 1 lần cấp module) ----------------
const DECK_RANGE_H = heightField({
  seed: 207,
  amp: 4.0,
  scale: 130,
  flats: [
    [0, 0, 22, 0],
    [22, 0, 24, 0],
  ],
  add: (x, z) => {
    const ringBerm =
      Math.exp(-(((Math.hypot(x - 6, z) - 46) / 9.5) ** 2)) * (4.8 + 1.2 * Math.cos(z * 0.08));
    return ringBerm;
  },
});

const avoidPadArea = (x: number, z: number) => Math.hypot(x - 6, z) < 34;

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

const TANK_POS: V3 = [0, 0.04, 0];

/** Chuyển toạ độ cục bộ của tháp pháo M1A2Abrams (gốc tại [0.08, 1.35, 0]) ra toạ độ thế giới */
const turretLocalToWorld = (local: V3, turretYaw: number): V3 => {
  const c = Math.cos(turretYaw);
  const s = Math.sin(turretYaw);
  return [
    TANK_POS[0] + 0.08 + local[0] * c + local[2] * s,
    TANK_POS[1] + 1.35 + local[1],
    TANK_POS[2] - local[0] * s + local[2] * c,
  ];
};

const turretDirToWorld = (dir: V3, turretYaw: number): V3 => {
  const c = Math.cos(turretYaw);
  const s = Math.sin(turretYaw);
  return [dir[0] * c + dir[2] * s, dir[1], -dir[0] * s + dir[2] * c];
};

const PuffSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({
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
  if (opacity <= 0.004) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/**
 * Hiệu ứng súng máy liên thanh 3D hệ hạt nhiều lớp tỉ lệ thật 1:1:
 * - Luồng hạt chớp lửa đầu nòng nhiều lớp (lõi trắng-vàng -> cam -> tia trích khí loa bù giật -> khói thuốc súng mỏng)
 * - Gốc phát đặt sát ngoài đầu chụp bù giật, pointLight bán kính nhỏ đẩy về trước để không hắt loá lên thân xe / CITV
 * - Đạn vạch đường (tracers) thanh mảnh chuẩn M62/M17 & vỏ đạn đồng văng parabol trên mặt boong nóc tháp
 */
const MachineGunBurstFX: React.FC<{
  t: number;
  windows: [number, number][];
  muzzlePos: V3;
  ejectPos: V3;
  dir: V3;
  ejectSide: 1 | -1;
  caliber: '762' | '50cal';
  seed: number;
}> = ({ t, windows, muzzlePos, ejectPos, dir, ejectSide, caliber, seed }) => {
  const activeWin = windows.find(([a, b]) => t >= a && t <= b);
  const recentWin = windows.find(([a, b]) => t >= a && t <= b + 1.6);
  if (!recentWin) return null;

  const is50 = caliber === '50cal';
  const rate = is50 ? 8.8 : 13.5;
  const flashScale = is50 ? 0.46 : 0.28;
  const tracerSpeed = is50 ? 64 : 56;
  const tracerLen = is50 ? 1.65 : 1.22;
  const tracerCoreR = is50 ? 0.012 : 0.0085;

  const dVec = new THREE.Vector3(...dir).normalize();
  const upRef = new THREE.Vector3(0, 1, 0);
  const sideVec = new THREE.Vector3().crossVectors(upRef, dVec).normalize();
  const orthoUp = new THREE.Vector3().crossVectors(dVec, sideVec).normalize();
  const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dVec);

  const dtActive = activeWin ? t - activeWin[0] : -1;
  const cyc = activeWin ? Math.abs(Math.sin(dtActive * rate * Math.PI)) : 0;
  const flashAmp = activeWin ? 0.56 + 0.44 * cyc : 0;
  const petalRoll = (t * 27 + seed) % (Math.PI * 2);

  // Đặt gốc phát ngay phía trước đầu chụp bù giật để tách hẳn khỏi chi tiết súng & kính CITV
  const tipPos: V3 = [
    muzzlePos[0] + dVec.x * 0.035,
    muzzlePos[1] + dVec.y * 0.035,
    muzzlePos[2] + dVec.z * 0.035,
  ];

  // Chuỗi đạn vạch đường thanh mảnh bay căng dọc đường ngắm
  const tracers: { pos: V3; fade: number }[] = [];
  for (const [wStart, wEnd] of windows) {
    if (t < wStart || t > wEnd + 0.52) continue;
    const kMin = Math.max(0, Math.floor((t - 0.5 - wStart) * rate));
    const kMax = Math.floor((Math.min(t, wEnd) - wStart) * rate);
    for (let k = kMin; k <= kMax; k++) {
      if (k % 2 !== 0 && k !== kMax) continue;
      const shotT = wStart + k / rate;
      const age = t - shotT;
      if (age < 0.012 || age > 0.5) continue;
      const dist = 0.78 + age * tracerSpeed;
      const spreadY = (rnd(k * 19 + seed) - 0.5) * 0.011 * dist;
      const spreadZ = (rnd(k * 37 + seed) - 0.5) * 0.013 * dist;
      tracers.push({
        pos: [
          tipPos[0] + dVec.x * dist,
          tipPos[1] + dVec.y * dist + spreadY,
          tipPos[2] + dVec.z * dist + spreadZ,
        ],
        fade: 1 - age / 0.52,
      });
    }
  }

  // Vỏ đạn đồng văng parabol trên mặt giáp nóc tháp pháo
  const casings: { pos: V3; rot: V3 }[] = [];
  for (const [wStart, wEnd] of windows) {
    if (t < wStart || t > wEnd + 0.6) continue;
    const kMin = Math.max(0, Math.floor((t - 0.55 - wStart) * rate));
    const kMax = Math.floor((Math.min(t, wEnd) - wStart) * rate);
    for (let k = kMin; k <= kMax; k++) {
      const shotT = wStart + k / rate;
      const age = t - shotT;
      if (age < 0 || age > 0.55) continue;
      const vx = -0.32 + (rnd(k * 11 + seed) - 0.5) * 0.36;
      const vy = 1.38 + rnd(k * 23 + seed) * 0.48;
      const vz = ejectSide * (1.15 + rnd(k * 43 + seed) * 0.48);
      const cy = ejectPos[1] + vy * age - 4.9 * age * age;
      if (cy < 1.88) continue;
      casings.push({
        pos: [ejectPos[0] + vx * age, cy, ejectPos[2] + vz * age],
        rot: [age * 14 + k, age * 11, age * 17],
      });
    }
  }

  const brassMat = plain('#e6b64c', 0.25, 0.88);
  const tracerCoreMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#fffbe0', toneMapped: false }),
    [],
  );

  return (
    <group>
      {/* 1. Luồng hạt chớp lửa đầu nòng nhiều lớp (lõi trắng-vàng -> tia khí cam -> khói nóng), pointLight bán kính gọn đẩy ra trước */}
      {flashAmp > 0.01 && (
        <group position={tipPos}>
          <pointLight
            position={[dVec.x * 0.28, dVec.y * 0.28, dVec.z * 0.28]}
            color={is50 ? '#ffb952' : '#ffd27d'}
            intensity={(is50 ? 2.2 : 0.55) * flashAmp}
            distance={is50 ? 2.2 : 0.95}
            decay={2}
          />
          {/* Chuỗi hạt lửa dọc trục nòng súng (từ trắng nóng ở miệng loa tới vàng cam phía trước) */}
          {[0, 1, 2, 3, 4].map((fi) => {
            const u = fi / 4;
            const fwd = flashScale * (0.06 + u * 0.95 * flashAmp);
            const sz = flashScale * (0.42 + (1 - Math.abs(u - 0.32)) * 0.48) * flashAmp;
            const col = fi === 0 ? '#ffffff' : fi === 1 ? '#fff2b2' : fi < 4 ? '#ff9d2e' : '#ff5e14';
            return (
              <PuffSprite
                key={`ax${fi}`}
                pos={[dVec.x * fwd, dVec.y * fwd, dVec.z * fwd]}
                size={sz}
                color={col}
                opacity={(0.94 - u * 0.34) * flashAmp}
                rot={petalRoll + fi * 0.9}
              />
            );
          })}
          {/* 4 tia trích khí ngang qua khe chụp bù giật */}
          {[0, 1, 2, 3].map((pi) => {
            const ang = petalRoll + (pi * Math.PI) / 2;
            const rad = flashScale * (0.24 + 0.14 * cyc);
            const rx = Math.cos(ang);
            const ry = Math.sin(ang);
            const offX = dVec.x * flashScale * 0.12 + (sideVec.x * rx + orthoUp.x * ry) * rad;
            const offY = dVec.y * flashScale * 0.12 + (sideVec.y * rx + orthoUp.y * ry) * rad;
            const offZ = dVec.z * flashScale * 0.12 + (sideVec.z * rx + orthoUp.z * ry) * rad;
            return (
              <PuffSprite
                key={`pt${pi}`}
                pos={[offX, offY, offZ]}
                size={flashScale * (0.34 + 0.12 * cyc) * flashAmp}
                color={pi % 2 === 0 ? '#ffe082' : '#ff8620'}
                opacity={0.78 * flashAmp}
                rot={ang}
              />
            );
          })}
        </group>
      )}

      {/* 2. Khói thuốc súng mảnh tản nhẹ theo chiều gió */}
      {Array.from({ length: 6 }, (_, si) => {
        const smokeBase = recentWin[0];
        const loopAge = (t - smokeBase + si * 0.18) % 1.05;
        if (t < smokeBase || loopAge < 0) return null;
        const fade = t > recentWin[1] ? Math.max(0, 1 - (t - recentWin[1]) / 1.4) : 1;
        return (
          <PuffSprite
            key={si}
            pos={[
              tipPos[0] + dVec.x * (0.42 + loopAge * 1.85),
              tipPos[1] + 0.08 + loopAge * 0.68,
              tipPos[2] + dVec.z * (0.42 + loopAge * 1.85) + (si % 2 === 0 ? 0.11 : -0.11) * loopAge,
            ]}
            size={(is50 ? 0.46 : 0.31) + loopAge * 0.85}
            color="#d6cfc3"
            opacity={0.26 * (1 - loopAge / 1.05) * fade}
            rot={si * 1.3 + t * 0.4}
          />
        );
      })}

      {/* 3. Đạn vạch đường (Tracers) lõi đặc sắc lẹm + quầng sáng hạt mềm */}
      {tracers.map((tr, ti) => (
        <group key={ti} position={tr.pos}>
          <group quaternion={quat}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={tracerCoreMat}>
              <cylinderGeometry args={[tracerCoreR * 0.55, tracerCoreR, tracerLen, 6]} />
            </mesh>
          </group>
          <PuffSprite
            pos={[0, 0, 0]}
            size={is50 ? 0.24 : 0.17}
            color={is50 ? '#ff6a1f' : '#ffaa2b'}
            opacity={0.46 * tr.fade}
            rot={ti * 0.7}
          />
        </group>
      ))}

      {/* 4. Vỏ đạn đồng văng trên mặt boong nóc tháp */}
      {casings.map((cs, ci) => (
        <mesh key={ci} position={cs.pos} rotation={cs.rot} material={brassMat}>
          <cylinderGeometry args={[is50 ? 0.011 : 0.007, is50 ? 0.011 : 0.007, is50 ? 0.095 : 0.055, 8]} />
        </mesh>
      ))}
    </group>
  );
};

/** Cụm bia mục tiêu cự ly gần quanh thao trường bị đạn 7.62mm & .50 cal quét gục */
const PerimeterTargetsField: React.FC<{ t: number }> = ({ t }) => {
  const sandbagMat = plain('#b69e74', 0.92, 0.04);
  const steelBase = plain('#4b4741', 0.82, 0.25);
  const chipMat = plain('#3f3a34', 0.88, 0.12);

  const targets = useMemo(
    () => [
      { x: 18.5, z: -5.4, hitAt: 289.05, col: '#d96528', w: 0.78, h: 1.65 },
      { x: 21.0, z: -2.8, hitAt: 289.28, col: '#526145', w: 0.85, h: 1.68 },
      { x: 23.5, z: -7.6, hitAt: 289.55, col: '#d96528', w: 0.78, h: 1.62 },
      { x: 20.2, z: 0.6, hitAt: 289.72, col: '#526145', w: 1.05, h: 1.55 },
      { x: 17.8, z: 4.8, hitAt: 292.52, col: '#d96528', w: 1.15, h: 1.65 },
      { x: 21.5, z: 7.4, hitAt: 293.15, col: '#526145', w: 0.9, h: 1.7 },
      { x: 24.8, z: 10.2, hitAt: 294.1, col: '#d96528', w: 1.1, h: 1.62 },
      { x: 19.6, z: 2.6, hitAt: 295.05, col: '#526145', w: 0.85, h: 1.68 },
      { x: 25.5, z: -1.4, hitAt: 297.25, col: '#d96528', w: 1.15, h: 1.65 },
      { x: 26.8, z: 5.6, hitAt: 297.55, col: '#526145', w: 1.05, h: 1.62 },
    ],
    [],
  );

  return (
    <group>
      {targets.map((tg, idx) => {
        const fall = prog(t, tg.hitAt, tg.hitAt + 0.32, (x) => 1 - (1 - x) ** 2.3);
        const dt = t - tg.hitAt;
        const gy = DECK_RANGE_H(tg.x, tg.z);
        return (
          <group key={idx} position={[tg.x, gy, tg.z]} rotation={[0, -Math.atan2(tg.z, tg.x), 0]}>
            <mesh position={[-0.55, 0.28, 0]} geometry={rbox(0.55, 0.56, 1.55, 0.1)} material={sandbagMat} castShadow receiveShadow />
            <mesh position={[0, 0.08, 0]} geometry={rbox(0.5, 0.16, 0.7, 0.02)} material={steelBase} receiveShadow />
            <group position={[0, 0.14, 0]} rotation={[0, 0, -fall * 1.45]}>
              <mesh position={[0, tg.h * 0.5, 0]} geometry={rbox(0.08, tg.h, tg.w, 0.015)} material={plain(tg.col, 0.62, 0.2)} castShadow />
              <mesh position={[-0.045, tg.h * 0.64, 0]} geometry={rbox(0.02, tg.h * 0.34, tg.w * 0.46, 0.005)} material={plain('#f5ecda', 0.7, 0.05)} />
            </group>

            {/* Tia lửa & mảnh vỡ đạn đạo khi đạn găm trúng bia */}
            {dt > 0 && dt < 0.22 && (
              <>
                <PuffSprite
                  pos={[-0.14, 0.92, 0]}
                  size={0.34 + dt * 1.2}
                  color="#fff3bd"
                  opacity={0.92 * (1 - dt / 0.22)}
                  rot={idx}
                />
                <PuffSprite
                  pos={[-0.18, 0.95, 0.04]}
                  size={0.58 + dt * 1.8}
                  color="#ff8a24"
                  opacity={0.68 * (1 - dt / 0.22)}
                  rot={idx * 2.1}
                />
              </>
            )}
            {dt > 0 &&
              dt < 0.75 &&
              [0, 1, 2, 3, 4].map((ci) => {
                const vx = -1.2 + rnd(idx * 17 + ci) * 2.6;
                const vy = 1.6 + rnd(idx * 31 + ci) * 2.1;
                const vz = (rnd(idx * 47 + ci) - 0.5) * 2.2;
                const cy = 0.88 + vy * dt - 4.9 * dt * dt;
                if (cy < 0.04) return null;
                return (
                  <mesh
                    key={ci}
                    position={[-0.1 + vx * dt, cy, vz * dt]}
                    rotation={[dt * 12 + ci, dt * 9, dt * 15]}
                    material={chipMat}
                  >
                    <boxGeometry args={[0.055, 0.035, 0.028]} />
                  </mesh>
                );
              })}
            {dt > 0 && dt < 2.5 && (
              <PuffSprite
                pos={[0.25 + dt * 0.75, 0.6 + dt * 0.65, 0]}
                size={1.35 + dt * 1.5}
                color="#cbb389"
                opacity={0.66 * (1 - dt / 2.5)}
                rot={idx * 1.7}
              />
            )}
          </group>
        );
      })}
    </group>
  );
};

/**
 * Chi tiết cụm 2 khẩu trung liên 7.62mm M240 & hộp tiếp đạn NATO:
 * - Bổ sung ống bọc tản nhiệt + loa chụp bù giật chuẩn M240 đồng trục bên phải khiên pháo M256 (+Z)
 * - Kéo dài nòng & chụp bù giật M240 cửa nạp đạn vươn hẳn ra phía trước khối trụ CITV đúng tỉ lệ thực tế (1.23 m)
 * - Hộp tiếp đạn thép xanh ô-liu & dây đạn đồng dẫn vào cửa nạp
 */
const SecondaryWeaponsDetail: React.FC<{ turretYaw: number; gunPitch: number }> = ({
  turretYaw,
  gunPitch,
}) => {
  const gunSteel = plain('#2c3035', 0.34, 0.78);
  const darkCollar = plain('#1d2024', 0.42, 0.65);
  const oliveCan = plain('#465339', 0.62, 0.28);
  const brassBelt = plain('#dfb14b', 0.26, 0.88);

  const coaxRoot = turretLocalToWorld([1.74, 0.556, 0.19], turretYaw);
  const loaderPintle = turretLocalToWorld([0.02, 1.15, -0.80], turretYaw);
  const boxPos = turretLocalToWorld([-0.02, 1.135, -1.03], turretYaw);

  return (
    <group>
      {/* 1. Khẩu 7.62mm M240 đồng trục (Coaxial M240) bên phải (+Z) khiên pháo chính 120mm */}
      <group position={coaxRoot} rotation={[0, turretYaw, gunPitch]}>
        {/* Cổ bọc giáp xuyên khiên pháo */}
        <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkCollar} castShadow>
          <cylinderGeometry args={[0.036, 0.042, 0.12, 14]} />
        </mesh>
        {/* Ống tản nhiệt đục lỗ bao ngoài nòng M240 đồng trục */}
        <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel} castShadow>
          <cylinderGeometry args={[0.024, 0.026, 0.16, 12]} />
        </mesh>
        {/* Nòng thép & chụp bù giật rãnh dọc vươn ra x_local = 2.09 */}
        <mesh position={[0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel} castShadow>
          <cylinderGeometry args={[0.014, 0.016, 0.12, 12]} />
        </mesh>
        <mesh position={[0.335, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkCollar} castShadow>
          <cylinderGeometry args={[0.019, 0.016, 0.055, 12]} />
        </mesh>
      </group>

      {/* 2. Nòng nối dài, thước ngắm đầu nòng & loa chụp bù giật khẩu 7.62mm M240 cửa nạp đạn (vươn quá mặt trước CITV) */}
      <group position={loaderPintle} rotation={[0, turretYaw + 0.08, 0]}>
        <mesh position={[0.77, 0.19, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel} castShadow>
          <cylinderGeometry args={[0.0115, 0.0125, 0.16, 10]} />
        </mesh>
        {/* Bệ ngắm đầu nòng tam giác đặc trưng M240 */}
        <mesh position={[0.82, 0.218, 0]} geometry={rbox(0.028, 0.046, 0.014, 0.003)} material={gunSteel} castShadow />
        {/* Loa chụp bù giật / che lửa đầu nòng đặt tại lx = 0.885 (x_local = 0.903, vượt trước CITV x_max = 0.795) */}
        <mesh position={[0.885, 0.19, 0]} rotation={[0, 0, Math.PI / 2]} material={darkCollar} castShadow>
          <cylinderGeometry args={[0.017, 0.014, 0.07, 12]} />
        </mesh>
      </group>

      {/* 3. Hộp tiếp đạn 7.62mm NATO & dây đạn đồng đặt cạnh bệ súng nạp đạn trên nóc tháp */}
      <group position={boxPos} rotation={[0, turretYaw + 0.08, 0]}>
        <mesh position={[0, 0.04, 0]} geometry={rbox(0.26, 0.17, 0.12, 0.012)} material={oliveCan} castShadow />
        <mesh position={[-0.16, 0.035, -0.04]} geometry={rbox(0.24, 0.16, 0.12, 0.012)} material={oliveCan} castShadow />
        {Array.from({ length: 7 }, (_, bi) => (
          <mesh
            key={bi}
            position={[0.04 + bi * 0.014, 0.11 + bi * 0.016, 0.03 + bi * 0.018]}
            rotation={[0.45, 0, 0]}
            material={brassBelt}
          >
            <cylinderGeometry args={[0.0055, 0.0055, 0.056, 8]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

const C02S07: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const turretYaw =
    lerp(0.04, -0.05, prog(t, 289.8, 293.0)) +
    lerp(0, 0.03, prog(t, 296.4, 298.6));

  const crowsYaw =
    -0.06 +
    lerp(0, -0.34, prog(t, 290.8, 293.6)) +
    lerp(0, 0.16, prog(t, 293.8, 296.2)) +
    lerp(0, -0.18, prog(t, 296.4, 298.7));

  const gunPitch = 0.008;

  // ---------------- Toạ độ chính xác 3 đầu chụp bù giật súng máy trên M1A2Abrams ----------------
  // 1. Khẩu 7.62mm M240 đồng trục bên phải (+Z) gốc pháo M256
  const coaxMuzzle = turretLocalToWorld([2.11, 0.559, 0.19], turretYaw);
  const coaxEject = turretLocalToWorld([1.62, 0.56, 0.22], turretYaw);
  const coaxDir = turretDirToWorld([1, gunPitch - 0.015, 0.025], turretYaw);

  // 2. Khẩu 7.62mm M240 cửa nạp đạn: đầu chụp bù giật tại lx = 0.92 => [0.937, 1.34, -0.874], vượt hẳn trước khối trụ CITV [0.58, 1.27, -0.66]
  const loaderYaw = 0.08;
  const loaderMuzzle = turretLocalToWorld(
    [0.02 + 0.92 * Math.cos(loaderYaw), 1.34, -0.80 - 0.92 * Math.sin(loaderYaw)],
    turretYaw,
  );
  const loaderEject = turretLocalToWorld([0.1, 1.33, -0.87], turretYaw);
  const loaderDir = turretDirToWorld([Math.cos(loaderYaw), -0.04, -Math.sin(loaderYaw)], turretYaw);

  // 3. Trạm vũ khí điều khiển từ xa CROWS .50 cal M2HB trên nóc phải (+Z)
  const cYawCos = Math.cos(crowsYaw);
  const cYawSin = Math.sin(crowsYaw);
  const crowsMuzzle = turretLocalToWorld(
    [0.12 + 1.28 * cYawCos, 1.5, 0.78 - 1.28 * cYawSin],
    turretYaw,
  );
  const crowsEject = turretLocalToWorld(
    [0.12 + 0.08 * cYawCos + 0.11 * cYawSin, 1.49, 0.78 - 0.08 * cYawSin + 0.11 * cYawCos],
    turretYaw,
  );
  const crowsDir = turretDirToWorld([cYawCos, -0.055, -cYawSin], turretYaw);

  const m240Windows: [number, number][] = [
    [CUE.c02_s07_m240_fire, 290.52],
    [296.75, 298.85],
  ];
  const crowsWindows: [number, number][] = [
    [CUE.c02_s07_cal_50_fire, 296.65],
    [296.65, 298.85],
  ];

  // ---------------- Ngôn ngữ Camera 3 nhịp rõ rệt, phơi bày trọn vẹn từng vũ khí phụ ----------------
  // Nhịp 1 (283.76–290.45s): Góc chéo trước-trái trên cao (elevated front-left ahead) nhìn về mặt trước & nóc tháp pháo:
  //   - Khẩu M240 cửa nạp đạn trên nóc trái (-Z) nằm ngay tiền cảnh phía trước khối kính CITV, đầu chụp bù giật vươn hẳn ra trước CITV
  //   - Khẩu M240 đồng trục bên phải khiên pháo (+Z) tách hẳn phía trên đường viền nòng pháo M256 dưới nắng trưa, lộ 100% không bị che
  // Nhịp 2 (290.45–296.55s): Lượn vòng qua mũi tháp sang cận cảnh sườn phải trạm CROWS .50 cal M2HB xoay bắn tự động từ trong giáp kín
  // Nhịp 3 (296.55–298.80s): Kéo cao ra sau-phải bao quát cả 3 khẩu súng máy đồng loạt quét lưới lửa đạn vạch đường
  const pFrontDrift = prog(t, 283.76, 290.35);
  const pToCrows = prog(t, 290.45, 292.05);
  const pCrowsOrbit = prog(t, 292.05, 296.45);
  const pFinale = prog(t, 296.50, 298.68);

  const posM240 = lerpV3([5.65, 5.05, -2.05], [4.75, 4.90, -2.55], pFrontDrift);
  const lookM240 = lerpV3([1.05, 2.15, -0.18], [0.85, 2.22, -0.24], pFrontDrift);

  const posCrows = lerpV3([0.95, 3.66, 3.42], [-0.85, 3.74, 3.32], pCrowsOrbit);
  const lookCrows = lerpV3([0.68, 2.58, 0.72], [1.38, 2.52, 0.52], pCrowsOrbit);

  const posOverview: V3 = [-4.25, 6.25, 5.05];
  const lookOverview: V3 = [2.35, 2.08, -0.10];

  const camPos = lerpV3(lerpV3(posM240, posCrows, pToCrows), posOverview, pFinale);
  const camLook = lerpV3(lerpV3(lookM240, lookCrows, pToCrows), lookOverview, pFinale);
  const fov = lerp(36, 40, pFinale);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Stage
        {...LOOK_PROVING_NOON.stage}
        width={W}
        height={H}
        shadowCenter={[4, 0, 0]}
        shadowArea={28}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        <Terrain h={DECK_RANGE_H} size={420} seg={210} center={[12, 0]} colors={LOOK_PROVING_NOON.terrain} />
        <Scatter
          kind="rock"
          count={75}
          area={[-65, -80, 95, 80]}
          h={DECK_RANGE_H}
          seed={47}
          scale={[0.6, 1.5]}
          avoid={avoidPadArea}
          tint={LOOK_PROVING_NOON.scatterTint}
        />
        <Scatter
          kind="bush"
          count={65}
          area={[-65, -80, 95, 80]}
          h={DECK_RANGE_H}
          seed={83}
          scale={[0.7, 1.35]}
          avoid={avoidPadArea}
          tint={LOOK_PROVING_NOON.scatterTint}
        />

        <mesh position={[0.4, 0.02, 0]} geometry={rbox(12.2, 0.05, 6.8, 0.02)} material={plain('#8b8377', 0.9, 0.05)} receiveShadow />
        <mesh position={[6.15, 0.032, 0]} geometry={rbox(0.32, 0.04, 6.6, 0.008)} material={plain('#d69e2e', 0.75, 0.08)} receiveShadow />

        <M1A2Abrams
          variant="sepv3"
          camo="desert"
          position={TANK_POS}
          turretYaw={turretYaw}
          gunPitch={gunPitch}
          crowsYaw={crowsYaw}
          citvYaw={-0.24}
          blowoutOpen={0}
        />

        <SecondaryWeaponsDetail turretYaw={turretYaw} gunPitch={gunPitch} />

        <MachineGunBurstFX
          t={t}
          windows={m240Windows}
          muzzlePos={coaxMuzzle}
          ejectPos={coaxEject}
          dir={coaxDir}
          ejectSide={1}
          caliber="762"
          seed={101}
        />
        <MachineGunBurstFX
          t={t}
          windows={m240Windows}
          muzzlePos={loaderMuzzle}
          ejectPos={loaderEject}
          dir={loaderDir}
          ejectSide={-1}
          caliber="762"
          seed={202}
        />
        <MachineGunBurstFX
          t={t}
          windows={crowsWindows}
          muzzlePos={crowsMuzzle}
          ejectPos={crowsEject}
          dir={crowsDir}
          ejectSide={1}
          caliber="50cal"
          seed={303}
        />

        <PerimeterTargetsField t={t} />
      </Stage>

      <Label
        t={t}
        text="M240 · 11,400 RDS"
        x={W * 0.24}
        y={H * 0.14}
        from={CUE.c02_s07_rounds_11400}
        until={290.2}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="CROWS .50 CAL"
        x={W * 0.76}
        y={H * 0.14}
        from={CUE.c02_s07_cal_50_fire}
        until={296.45}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C02S07;
