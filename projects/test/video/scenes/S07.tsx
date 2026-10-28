// Cảnh S07 (56.14–70.10 s, hiển thị từ 55.94 s) — Thuần 3D:
// Góc chim bay xoay quỹ đạo trên đỉnh tháp pháo trong ánh chạng vạng xanh thép (Tactical Twilight),
// kích hoạt tổ hợp phòng vệ chủ động APS, bung vòm radar 360°, khóa mục tiêu tên lửa đột kích nóc
// trong mili-giây và phóng đạn đánh chặn nổ tung mối đe dọa trên không cách vỏ giáp ~9 m.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { Label, useT } from '@kit/motion';
import { bump, lerp, prog } from '@kit/theme';
import { DustTrail, Explosion, MuzzleBlast, Trail } from '@lib/3d/fx';
import { lathe, rbox } from '@lib/3d/geom';
import { plain } from '@lib/3d/materials';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { CUE } from '../cues';
import { MBT } from '../local/models/MBT';
import { TopAttackMissile } from '../local/models/TopAttackMissile';
import { P2D, STAGE_TWILIGHT, STEPPE_COLORS } from '../local/palette';

// ==================== ĐỊA HÌNH THẢO NGUYÊN MỞ RỘNG CHÂN TRỜI CHẠNG VẠNG (CẤP MODULE) ====================
const ROAD_FLATS: [number, number, number, number][] = Array.from({ length: 23 }, (_, i) => [
  -96 + i * 9,
  0,
  11.5,
  0,
]);

const H_FINALE = heightField({
  seed: 707,
  amp: 3.8,
  scale: 130,
  oct: 5,
  flats: ROAD_FLATS,
  add: (x, z) => {
    // Thung lũng thảo nguyên mở thoáng ra chân trời để lộ nền trời chạng vạng xanh thép phía trên,
    // hai dải đồi thoải dần ở xa hai bên hành lang tiến quân (z = 0).
    const northSteppe =
      z < -26 ? 7.5 * Math.exp(-(((z + 88) / 46) ** 2)) * (0.78 + 0.22 * Math.sin(x * 0.03 + 1.1)) : 0;
    const southSteppe =
      z > 24 ? 6.4 * Math.exp(-(((z - 76) / 42) ** 2)) * (0.8 + 0.2 * Math.cos(x * 0.028 - 0.5)) : 0;
    const distantRidge = 9.5 * Math.exp(-(((z + 158) / 55) ** 2)) + 5.2 * Math.exp(-(((x - 150) / 68) ** 2));
    return northSteppe + southSteppe + distantRidge;
  },
});

const avoidCorridor = (x: number, z: number) => Math.abs(z) < 12.5 || (Math.abs(x) < 42 && Math.abs(z) < 14.5);
const avoidTrees = (_x: number, z: number) => Math.abs(z) < 36;

// ==================== THAM SỐ VẬT LÝ & QUỸ ĐẠO TẤT ĐỊNH ====================
const TANK_SPEED = 3.5; // m/s dọc +X
const TURRET_YAW = 0.12;
const GUN_ELEV = 0.05;
const DOME_RADIUS = 12.2; // Vừa trọn khung hình 16:9 từ chân đế tới đỉnh vòm bán cầu

const tankXAt = (t: number) => -24 + (t - 56.0) * TANK_SPEED;

/** Chuyển tọa độ cục bộ trên tháp pháo (gốc [0.25, 1.54, 0] của MBT) ra tọa độ thế giới. */
const turretToWorld = (tx: number, yaw: number, lx: number, ly: number, lz: number): V3 => {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return [tx + 0.25 + lx * c + lz * s, 1.54 + ly, -lx * s + lz * c];
};

// 4 mặt ăng-ten radar mảng pha AESA trên tháp pháo (khớp chính xác với MBT.tsx)
const AESA_PANELS: [number, number, number, number][] = [
  [1.18, 0.68, 1.44, -0.68],
  [1.18, 0.68, -1.44, 0.68],
  [-2.42, 0.68, 1.28, -2.42],
  [-2.42, 0.68, -1.28, 2.42],
];

// Quỹ đạo thẳng thế giới của tên lửa đột kích nóc:
// Nhắm thẳng vào tâm nóc tháp pháo lúc t = 67.57 s ([16.75, 2.42, 0]),
// bị đánh chặn nổ tung trên không lúc t = 67.18 s tại INTERCEPT_POS cách tháp pháo ~9.1 m (cao y = 7.45 m).
const MISSILE_T_SPAWN = 63.28;
const MISSILE_AIM_WORLD: V3 = [16.75, 2.42, 0.0];
const INTERCEPT_POS: V3 = [14.55, 7.45, -7.45];
const RAY_STEP: V3 = [
  INTERCEPT_POS[0] - MISSILE_AIM_WORLD[0],
  INTERCEPT_POS[1] - MISSILE_AIM_WORLD[1],
  INTERCEPT_POS[2] - MISSILE_AIM_WORLD[2],
]; // [-2.20, +5.03, -7.45], độ dài ~9.25 m
const MISSILE_START_WORLD: V3 = [
  MISSILE_AIM_WORLD[0] + RAY_STEP[0] * 2.95,
  MISSILE_AIM_WORLD[1] + RAY_STEP[1] * 2.95,
  MISSILE_AIM_WORLD[2] + RAY_STEP[2] * 2.95,
]; // [10.26, 17.26, -21.98] — nằm nổi bật trên nền trời chạng vạng góc cao bên phải ngay lúc 63.68 s

/** Tiến độ tên lửa mượt C-vô-cùng: lao vào nhanh ở biên, duy trì vận tốc cao tới điểm nổ đánh chặn. */
const missileProgress = (t: number) => {
  const u = prog(t, MISSILE_T_SPAWN, CUE.s07_midair_blast, (x) => x);
  return 0.48 * u + 0.52 * (1 - (1 - u) ** 2.35);
};

const missilePosAtProgress = (s: number): V3 => [
  lerp(MISSILE_START_WORLD[0], INTERCEPT_POS[0], s),
  lerp(MISSILE_START_WORLD[1], INTERCEPT_POS[1], s),
  lerp(MISSILE_START_WORLD[2], INTERCEPT_POS[2], s),
];

const MISSILE_TRAIL_PTS: V3[] = Array.from({ length: 72 }, (_, i) => missilePosAtProgress(i / 71));

const MISSILE_DIR_UNIT: V3 = (() => {
  const dx = INTERCEPT_POS[0] - MISSILE_START_WORLD[0];
  const dy = INTERCEPT_POS[1] - MISSILE_START_WORLD[1];
  const dz = INTERCEPT_POS[2] - MISSILE_START_WORLD[2];
  const len = Math.hypot(dx, dy, dz);
  return [dx / len, dy / len, dz / len];
})();

/** Góc Euler (0, yaw, pitch) đưa trục +X cục bộ hướng đúng theo vector 3D [dx, dy, dz] không bị nghiêng cánh. */
const orientPlusX = (dir: V3): [number, number, number] => {
  const yaw = Math.atan2(-dir[2], dir[0]);
  const pitch = Math.atan2(dir[1], Math.hypot(dir[0], dir[2]));
  return [0, yaw, pitch];
};

// Vị trí đầu ống phóng APS sườn trái tháp pháo (side = -1) tại đúng thời điểm khai hỏa 66.30 s
const APS_FIRE_ORIGIN: V3 = (() => {
  const txFire = tankXAt(CUE.s07_intercept_fire);
  const base = turretToWorld(txFire, TURRET_YAW, -0.95, 1.18, -0.96);
  const dx = INTERCEPT_POS[0] - base[0];
  const dz = INTERCEPT_POS[2] - base[2];
  const worldAim = Math.atan2(-dz, dx);
  return [base[0] + Math.cos(worldAim) * 0.34, base[1] + 0.08, base[2] - Math.sin(worldAim) * 0.34];
})();

const INTERCEPT_FIRE_DIR: V3 = (() => {
  const dx = INTERCEPT_POS[0] - APS_FIRE_ORIGIN[0];
  const dy = INTERCEPT_POS[1] - APS_FIRE_ORIGIN[1];
  const dz = INTERCEPT_POS[2] - APS_FIRE_ORIGIN[2];
  const len = Math.hypot(dx, dy, dz);
  return [dx / len, dy / len, dz / len];
})();

const INTERCEPTOR_PTS: V3[] = Array.from({ length: 48 }, (_, i) => {
  const p = i / 47;
  return [
    lerp(APS_FIRE_ORIGIN[0], INTERCEPT_POS[0], p),
    lerp(APS_FIRE_ORIGIN[1], INTERCEPT_POS[1], p) + 0.28 * 4 * p * (1 - p),
    lerp(APS_FIRE_ORIGIN[2], INTERCEPT_POS[2], p),
  ];
});

// ==================== ĐẠN ĐÁNH CHẶN APS (3D) ====================
const InterceptorDart: React.FC<{ pos: V3; dir: V3 }> = ({ pos, dir }) => {
  const bodyGeo = useMemo(
    () =>
      lathe(
        [
          [0.055, -0.28],
          [0.072, -0.2],
          [0.072, 0.16],
          [0.052, 0.28],
          [0.014, 0.36],
        ],
        20,
      ),
    [],
  );
  const finGeo = useMemo(() => rbox(0.13, 0.095, 0.012, 0.003), []);
  const matMetal = plain('#d7e3ee', 0.24, 0.84);
  const matBand = plain('#2be8d8', 0.18, 0.35);
  const rot = orientPlusX(dir);

  return (
    <group position={pos} rotation={rot}>
      <mesh geometry={bodyGeo} material={matMetal} />
      <mesh position={[0.05, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matBand}>
        <cylinderGeometry args={[0.074, 0.074, 0.06, 18]} />
      </mesh>
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[-0.2, 0, 0]} rotation={[(i * Math.PI) / 2 + Math.PI / 4, 0, 0]}>
          <mesh geometry={finGeo} material={matMetal} position={[0, 0.09, 0]} />
        </group>
      ))}
      {/* Lõi lửa đẩy lục lam trắng rực ở đuôi đạn đánh chặn */}
      <mesh position={[-0.38, 0, 0]} scale={[0.28, 0.085, 0.085]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color="#effffd" transparent opacity={0.96} toneMapped={false} />
      </mesh>
      <mesh position={[-0.56, 0, 0]} scale={[0.48, 0.13, 0.13]}>
        <sphereGeometry args={[1, 12, 10]} />
        <meshBasicMaterial color={P2D.radar} transparent opacity={0.76} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ==================== VÒM RADAR BÁN CẦU 360° TRONG TRẺO ====================
const RadarDome360: React.FC<{
  t: number;
  open: number;
  alertPulse: number;
  shieldHit: number;
  breachDir: V3;
}> = ({ t, open, alertPulse, shieldHit, breachDir }) => {
  if (open <= 0.005) return null;

  const rNow = DOME_RADIUS * (0.28 + 0.72 * open);
  const sweepAngle = (t - CUE.s07_radar_360) * 3.4;

  // 4 vòng vĩ tuyến trên mặt bán cầu bán kính rNow: y = rNow * sin(lat), bán kính vòng = rNow * cos(lat)
  const latitudes = [0.05, 0.35, 0.68, 1.02];
  // 6 cung kinh tuyến bán nguyệt cách nhau 30° tạo khung vòm 3D thoáng đãng, không che mờ xe tăng bên trong
  const meridians = [0, 1, 2, 3, 4, 5];

  // Tọa độ điểm giao cắt trên bề mặt vòm cầu nơi tia tên lửa xuyên vào (tiếp tuyến chuẩn với mặt cầu)
  const breachPos: V3 = [breachDir[0] * rNow, 0.15 + breachDir[1] * rNow, breachDir[2] * rNow];
  const breachRot = orientPlusX(breachDir);

  return (
    <group>
      {/* Màng bán cầu siêu mỏng (opacity rất thấp dưới ngưỡng bloom để xe tăng bên trong sắc nét 100%) */}
      <mesh position={[0, 0.15, 0]}>
        <sphereGeometry args={[rNow, 40, 22, 0, Math.PI * 2, 0, Math.PI * 0.49]} />
        <meshBasicMaterial
          color="#13847c"
          transparent
          opacity={0.04 * open}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Các vòng vĩ tuyến phát sáng tinh tế ôm quanh vòm bán cầu */}
      {latitudes.map((lat, idx) => {
        const ringR = rNow * Math.cos(lat);
        const ringY = 0.15 + rNow * Math.sin(lat);
        const op = (idx === 0 ? 0.54 : 0.25) * open;
        return (
          <mesh key={`lat-${idx}`} position={[0, ringY, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ringR, idx === 0 ? 0.045 : 0.025, 8, 96]} />
            <meshBasicMaterial
              color={P2D.radar}
              transparent
              opacity={op}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* 6 cung kinh tuyến vòm bán cầu */}
      {meridians.map((m) => (
        <mesh key={`mer-${m}`} position={[0, 0.15, 0]} rotation={[0, (m * Math.PI) / 6, 0]}>
          <torusGeometry args={[rNow, 0.022, 8, 64, Math.PI]} />
          <meshBasicMaterial
            color={P2D.radar}
            transparent
            opacity={0.19 * open}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      ))}

      {/* 36 vạch chia độ phương vị 360° ở vành ngoài sát mặt đất */}
      {Array.from({ length: 36 }, (_, i) => {
        const ang = (i / 36) * Math.PI * 2;
        const major = i % 3 === 0;
        const len = major ? 0.78 : 0.38;
        const rr = rNow + len * 0.5 + 0.12;
        return (
          <mesh
            key={`tick-${i}`}
            position={[Math.cos(ang) * rr, 0.18, -Math.sin(ang) * rr]}
            rotation={[-Math.PI / 2, 0, ang]}
          >
            <planeGeometry args={[len, major ? 0.085 : 0.042]} />
            <meshBasicMaterial
              color={P2D.radar}
              transparent
              opacity={(major ? 0.58 : 0.3) * open}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* 3 vòng sóng xung radar đồng tâm lan tỏa liên tục từ tháp pháo ra biên ~14 m */}
      {[0, 1, 2].map((wIdx) => {
        const cycle = ((t - CUE.s07_radar_360) * 0.62 + wIdx / 3) % 1;
        if (cycle < 0) return null;
        const waveR = lerp(2.3, rNow * 1.14, cycle);
        const waveOp = Math.sin(cycle * Math.PI) * 0.48 * open;
        return (
          <mesh key={`wave-${wIdx}`} position={[0, 0.22 + (1 - cycle) * 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(0.1, waveR - 0.15), waveR, 84]} />
            <meshBasicMaterial
              color={P2D.radar}
              transparent
              opacity={waveOp}
              side={THREE.DoubleSide}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </mesh>
        );
      })}

      {/* Mặt quạt radar quét xoay tròn 360° quanh trục Y */}
      <group position={[0, 0.24, 0]} rotation={[0, sweepAngle, 0]}>
        {[0, 1, 2, 3].map((sIdx) => {
          const span = 0.14;
          return (
            <mesh key={`fan-${sIdx}`} rotation={[-Math.PI / 2, 0, -sIdx * span * 0.85]}>
              <ringGeometry args={[2.0, rNow, 36, 1, 0, span]} />
              <meshBasicMaterial
                color={P2D.radar}
                transparent
                opacity={(0.22 - sIdx * 0.048) * open}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          );
        })}
        {/* Tia biên dẫn đầu cánh quạt quét */}
        <mesh position={[rNow * 0.5 + 0.95, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[Math.max(0.2, rNow - 1.9), 0.1]} />
          <meshBasicMaterial
            color="#b8fff8"
            transparent
            opacity={0.76 * open}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/* Vòng xung cảnh báo tiếp tuyến ngay tại điểm tên lửa chạm/xuyên qua mặt vòm radar */}
      {alertPulse > 0.01 && (
        <group position={breachPos} rotation={breachRot}>
          <group rotation={[0, Math.PI / 2, 0]}>
            <mesh>
              <ringGeometry args={[1.25, 1.42, 40]} />
              <meshBasicMaterial
                color={P2D.weakRed}
                transparent
                opacity={0.78 * alertPulse}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[2.05, 2.18, 44]} />
              <meshBasicMaterial
                color={P2D.weakRed}
                transparent
                opacity={0.42 * alertPulse}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          </group>
        </group>
      )}

      {/* Gợn sóng khiên năng lượng lục lam trên mặt vòm khi đỡ trọn xung chấn vụ nổ trên không */}
      {shieldHit > 0.005 && (
        <group position={breachPos} rotation={breachRot}>
          {[0, 1].map((ri) => {
            const p = Math.min(1, Math.max(0, (1 - shieldHit) * 1.25 - ri * 0.22));
            const rr = 0.8 + p * 4.6;
            return (
              <mesh key={ri} rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[Math.max(0.1, rr - 0.24), rr, 48]} />
                <meshBasicMaterial
                  color={ri === 0 ? '#d4fffb' : P2D.radar}
                  transparent
                  opacity={shieldHit * (ri === 0 ? 0.88 : 0.56)}
                  side={THREE.DoubleSide}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// ==================== TIA KHÓA ĐỊNH VỊ AESA & VÒNG KHÓA MỤC TIÊU 3D ====================
const RadarBeam: React.FC<{ from: V3; to: V3; color: string; radius: number; opacity: number }> = ({
  from,
  to,
  color,
  radius,
  opacity,
}) => {
  if (opacity <= 0.005) return null;
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 0.05) return null;
  const mid: V3 = [(from[0] + to[0]) * 0.5, (from[1] + to[1]) * 0.5, (from[2] + to[2]) * 0.5];
  const rot = orientPlusX([dx / len, dy / len, dz / len]);

  return (
    <group position={mid} rotation={rot}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[radius, radius * 0.45, len, 10, 1, true]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
};

const TargetLockReticle3D: React.FC<{ pos: V3; camPos: V3; lockP: number; t: number }> = ({
  pos,
  camPos,
  lockP,
  t,
}) => {
  if (lockP <= 0.01) return null;
  const toCam: V3 = [camPos[0] - pos[0], camPos[1] - pos[1], camPos[2] - pos[2]];
  const len = Math.hypot(toCam[0], toCam[1], toCam[2]) || 1;
  const rot = orientPlusX([toCam[0] / len, toCam[1] / len, toCam[2] / len]);
  const tighten = lerp(2.15, 1.0, lockP);
  const pulse = 0.82 + 0.18 * Math.sin(t * 26);

  return (
    <group position={pos} rotation={rot}>
      {/* Mặt phẳng reticle vuông góc với trục nhìn camera (xoay quanh trục +X hướng về camera) */}
      <group rotation={[t * 1.9, Math.PI / 2, 0]} scale={[tighten, tighten, 1]}>
        <mesh>
          <ringGeometry args={[1.05, 1.18, 40]} />
          <meshBasicMaterial
            color={P2D.radar}
            transparent
            opacity={0.86 * lockP}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        <mesh rotation={[0, 0, -t * 3.4]}>
          <ringGeometry args={[0.66, 0.78, 4]} />
          <meshBasicMaterial
            color={P2D.weakRed}
            transparent
            opacity={0.94 * lockP * pulse}
            side={THREE.DoubleSide}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            toneMapped={false}
          />
        </mesh>
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return (
            <mesh key={i} position={[Math.cos(a) * 1.32, Math.sin(a) * 1.32, 0]} rotation={[0, 0, a]}>
              <planeGeometry args={[0.45, 0.1]} />
              <meshBasicMaterial
                color={P2D.weakRed}
                transparent
                opacity={0.92 * lockP}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          );
        })}
      </group>
    </group>
  );
};

// ==================== COMPONENT CẢNH CHÍNH S07 ====================
const S07: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // 1. Hành tiến của xe tăng MBT dọc hành lang +X
  const tankX = tankXAt(t);
  const travel = (t - 55.4) * TANK_SPEED;

  // 2. Tiến độ tên lửa đột kích nóc & khóa mục tiêu APS
  const missileActive = t >= MISSILE_T_SPAWN && t < CUE.s07_midair_blast;
  const mProg = missileProgress(t);
  const missilePos = missilePosAtProgress(mProg);
  const missileTrailFade = t < CUE.s07_midair_blast ? 0.94 : Math.max(0, 0.94 * (1 - (t - CUE.s07_midair_blast) / 0.55));

  // Tia khóa định vị kích hoạt ngay khi tên lửa chạm biên vòm radar (~63.98 s, chỉ vài mili-giây sau phát hiện)
  const T_LOCK = 63.96;
  const lockP = t < CUE.s07_midair_blast ? prog(t, T_LOCK, T_LOCK + 0.24) : 0;
  const alertPulse =
    t >= T_LOCK && t < CUE.s07_midair_blast
      ? 0.65 + 0.35 * Math.sin((t - T_LOCK) * 18)
      : bump(t, CUE.s07_midair_blast, 0.55) * 0.45;

  // Vector hướng từ tâm vòm radar [tankX + 0.25, 0.15, 0] tới mối đe dọa (để đặt vòng cảnh báo đúng điểm xuyên vòm)
  const turretCenter = turretToWorld(tankX, TURRET_YAW, 0, 0.88, 0);
  const targetRef: V3 = t < CUE.s07_intercept_fire ? missilePos : INTERCEPT_POS;
  const breachVec: V3 = [targetRef[0] - (tankX + 0.25), Math.max(1.2, targetRef[1] - 0.15), targetRef[2]];
  const breachLen = Math.hypot(breachVec[0], breachVec[1], breachVec[2]) || 1;
  const breachDir: V3 = [breachVec[0] / breachLen, breachVec[1] / breachLen, breachVec[2] / breachLen];

  const threatAzimuth = Math.atan2(-(targetRef[2] - turretCenter[2]), targetRef[0] - turretCenter[0]);
  const threatLocalYaw = threatAzimuth - TURRET_YAW;

  // Góc xoay bệ phóng APS: đứng yên -> tự kiểm góc lúc 60.34 s -> quét nhẹ -> xoay ngoắt khóa mục tiêu lúc 63.96 s
  const apsSelfTest =
    Math.sin(prog(t, CUE.s07_aps_equip, 61.85, (x) => x) * Math.PI * 2) * 0.62 * bump(t, CUE.s07_aps_equip, 1.55);
  const apsIdleScan = t >= 61.85 ? Math.sin((t - 61.85) * 2.1) * 0.18 : 0;
  const apsPreLockYaw = 0.22 + apsSelfTest + apsIdleScan;
  const snapToThreat = prog(t, T_LOCK - 0.08, T_LOCK + 0.26, Easing.out(Easing.cubic));
  const apsYaw = lerp(apsPreLockYaw, threatLocalYaw, snapToThreat);

  const citvYaw = lerp((t - 55.8) * 1.15, threatLocalYaw, snapToThreat);

  // 3. Kích hoạt đèn/xung khởi động 4 tấm radar AESA lúc 60.34 s & bung vòm radar 360° lúc 62.22 s
  const apsPower = prog(t, CUE.s07_aps_equip, CUE.s07_aps_equip + 0.55);
  const domeOpen = prog(t, CUE.s07_radar_360, CUE.s07_radar_360 + 1.05, Easing.out(Easing.cubic));

  // 4. Đạn đánh chặn APS (66.30 -> 67.18 s) & nổ tung trên không (67.18 s)
  const interceptorActive = t >= CUE.s07_intercept_fire && t < CUE.s07_midair_blast;
  const intProg = prog(t, CUE.s07_intercept_fire, CUE.s07_midair_blast, (x) => x);
  const interceptorPos: V3 = [
    lerp(APS_FIRE_ORIGIN[0], INTERCEPT_POS[0], intProg),
    lerp(APS_FIRE_ORIGIN[1], INTERCEPT_POS[1], intProg) + 0.28 * 4 * intProg * (1 - intProg),
    lerp(APS_FIRE_ORIGIN[2], INTERCEPT_POS[2], intProg),
  ];
  const interceptorTrailOp =
    t < CUE.s07_intercept_fire
      ? 0
      : t < CUE.s07_midair_blast
        ? 0.96
        : Math.max(0, 0.96 * (1 - (t - CUE.s07_midair_blast) / 0.65));

  const blastDt = t - CUE.s07_midair_blast;
  const shieldHit = blastDt > 0 && blastDt < 1.3 ? Math.max(0, 1 - blastDt / 1.3) : 0;

  // 5. Góc máy liên tục mượt 3 pha (tối ưu mở nền trời chạng vạng xanh thép & ôm trọn đỉnh vòm radar):
  // Pha 1 (55.94–61.50 s): Cận-trung cảnh trên cao xoay quỹ đạo mượt quanh tháp pháo & 4 góc radar AESA.
  // Pha 2 (61.50–67.40 s): Kéo lùi nâng cao lên góc chim bay 3/4 (High Bird's-Eye Front-3/4 Overlook, cách xe ~28 m)
  //                        ôm trọn vòm radar 360°, thấy rõ nền trời chạng vạng, quả tên lửa đỏ và cầu lửa đánh chặn.
  // Pha 3 (67.40–70.10 s): Trượt hùng tráng theo chiếc MBT nguyên vẹn băng qua màn khói đánh chặn dưới ánh chạng vạng.
  const pOrbit = prog(t, 55.94, 61.55);
  const pWide = prog(t, 61.35, 63.35);
  const pFinale = prog(t, 67.55, 70.1);

  const orbAngle = lerp(2.08, 0.96, pOrbit);
  const orbR = lerp(10.5, 12.2, pOrbit);
  const orbY = lerp(5.1, 6.2, pOrbit);

  const phase1Off: V3 = [Math.cos(orbAngle) * orbR + 0.25, orbY, Math.sin(orbAngle) * orbR];
  const phase2Off: V3 = [15.4, 11.2, 22.0];
  const phase3Off: V3 = [13.6, 9.8, 19.2];

  const camOffX = lerp(lerp(phase1Off[0], phase2Off[0], pWide), phase3Off[0], pFinale);
  const camOffY = lerp(lerp(phase1Off[1], phase2Off[1], pWide), phase3Off[1], pFinale);
  const camOffZ = lerp(lerp(phase1Off[2], phase2Off[2], pWide), phase3Off[2], pFinale);

  // Rung chấn vật lý nhẹ trên máy quay đúng khoảnh khắc nổ đánh chặn trên không (67.18 s)
  const blastShake = blastDt > 0 && blastDt < 0.5 ? Math.exp(-blastDt * 7.5) * 0.24 : 0;
  const shakeX = Math.sin(t * 58) * blastShake;
  const shakeY = Math.cos(t * 71) * blastShake;

  const camPos: V3 = [tankX + camOffX + shakeX, camOffY + shakeY, camOffZ];

  const look1Off: V3 = [0.3, 2.2, -0.35];
  const look2Off: V3 = [-0.5, 4.55, -2.85];
  const look3Off: V3 = [0.75, 3.35, -1.15];
  const camLook: V3 = [
    tankX + lerp(lerp(look1Off[0], look2Off[0], pWide), look3Off[0], pFinale) + shakeX * 0.4,
    lerp(lerp(look1Off[1], look2Off[1], pWide), look3Off[1], pFinale) + shakeY * 0.4,
    lerp(lerp(look1Off[2], look2Off[2], pWide), look3Off[2], pFinale),
  ];
  const fov = lerp(lerp(41, 45, pWide), 43, pFinale);

  // Tọa độ thế giới của 2 tấm radar AESA sườn trái (mặt 1: trước-trái, mặt 3: sau-trái) để nối tia khóa mục tiêu
  const aesaFrontLeft = turretToWorld(tankX, TURRET_YAW, AESA_PANELS[1][0], AESA_PANELS[1][1], AESA_PANELS[1][2]);
  const aesaRearLeft = turretToWorld(tankX, TURRET_YAW, AESA_PANELS[3][0], AESA_PANELS[3][1], AESA_PANELS[3][2]);

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080 }}>
      <Stage {...STAGE_TWILIGHT} shadowArea={38} shadowCenter={[tankX, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Đèn phụ trợ ánh lam thép dịu làm rõ chi tiết giáp phức hợp và tháp pháo MBT trong bóng chạng vạng */}
        <directionalLight position={[38, 30, 22]} intensity={0.82} color="#9ec5ee" />
        <directionalLight position={[12, 24, -36]} intensity={0.48} color="#76a8d6" />

        {/* Địa hình thảo nguyên & thảm thực vật hai bên hành lang tiến quân */}
        <Terrain h={H_FINALE} colors={STEPPE_COLORS} size={420} seg={240} />
        <Scatter kind="rock" count={88} area={[-155, -145, 165, 145]} h={H_FINALE} seed={71} scale={[0.6, 1.65]} avoid={avoidCorridor} tint="#9a9388" />
        <Scatter kind="bush" count={115} area={[-155, -145, 165, 145]} h={H_FINALE} seed={72} scale={[0.7, 1.4]} avoid={avoidCorridor} tint="#899268" />
        <Scatter kind="pine" count={62} area={[-175, -165, 185, 165]} h={H_FINALE} seed={73} scale={[0.85, 1.45]} avoid={avoidTrees} tint="#6e8269" />

        {/* Vệt bụi đất cuộn nhẹ sau hai dải xích MBT */}
        <DustTrail
          t={t}
          from={54.5}
          to={70.5}
          path={(tb) => [tankXAt(tb) - 3.65, 0.05, 1.48]}
          rate={6}
          size={1.6}
          color="#968b78"
          life={2.4}
        />
        <DustTrail
          t={t}
          from={54.5}
          to={70.5}
          path={(tb) => [tankXAt(tb) - 3.65, 0.05, -1.48]}
          rate={6}
          size={1.6}
          color="#968b78"
          life={2.4}
        />

        {/* ==================== XE TĂNG CHỦ LỰC MBT + TỔ HỢP APS & VÒM RADAR 360° ==================== */}
        <group position={[tankX, 0, 0]}>
          <MBT
            travel={travel}
            aps={true}
            apsYaw={apsYaw}
            turretYaw={TURRET_YAW}
            gunElev={GUN_ELEV}
            citvYaw={citvYaw}
          />

          {/* Ánh sáng lục lam kích hoạt trên 4 tấm ăng-ten radar AESA & 2 bệ phóng APS từ 60.34 s */}
          {apsPower > 0.01 && (
            <group position={[0.25, 1.54, 0]} rotation={[0, TURRET_YAW, 0]}>
              <pointLight
                position={[-0.5, 1.45, 0]}
                color={P2D.radar}
                intensity={2.5 * apsPower + 1.8 * domeOpen}
                distance={11}
                decay={1.8}
              />

              {/* 4 mặt phát sáng & vòng xung khởi động quanh 4 tấm radar AESA ở 4 góc tháp pháo */}
              {AESA_PANELS.map(([rx, ry, rz, ryaw], idx) => {
                const bootPulse = bump(t, CUE.s07_aps_equip + idx * 0.09, 0.85);
                return (
                  <group key={`aesa-glow-${idx}`} position={[rx, ry, rz]} rotation={[0, ryaw, 0.14]}>
                    <mesh position={[0.098, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                      <planeGeometry args={[0.42, 0.28]} />
                      <meshBasicMaterial
                        color={P2D.radar}
                        transparent
                        opacity={apsPower * (0.45 + 0.45 * bootPulse)}
                        side={THREE.DoubleSide}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                        toneMapped={false}
                      />
                    </mesh>
                    {bootPulse > 0.01 && (
                      <mesh
                        position={[0.12 + (1 - bootPulse) * 0.65, 0, 0]}
                        rotation={[0, Math.PI / 2, 0]}
                        scale={[1 + (1 - bootPulse) * 1.7, 1 + (1 - bootPulse) * 1.7, 1]}
                      >
                        <ringGeometry args={[0.24, 0.3, 24]} />
                        <meshBasicMaterial
                          color="#b8fff8"
                          transparent
                          opacity={bootPulse * 0.85}
                          side={THREE.DoubleSide}
                          depthWrite={false}
                          blending={THREE.AdditiveBlending}
                          toneMapped={false}
                        />
                      </mesh>
                    )}
                  </group>
                );
              })}

              {/* Dải đèn trạng thái sẵn sàng chiến đấu trên 2 bệ phóng đạn đánh chặn APS */}
              {([-1, 1] as const).map((side) => (
                <group key={`aps-ready-${side}`} position={[-0.95, 0.96, side * 0.96]} rotation={[0, apsYaw, 0]}>
                  <mesh position={[0.18, 0.31, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.16, 0.22, 24]} />
                    <meshBasicMaterial
                      color={lockP > 0.2 && side === -1 ? P2D.weakRed : P2D.radar}
                      transparent
                      opacity={0.78 * apsPower}
                      side={THREE.DoubleSide}
                      depthWrite={false}
                      blending={THREE.AdditiveBlending}
                      toneMapped={false}
                    />
                  </mesh>
                </group>
              ))}
            </group>
          )}

          {/* Vòm bán cầu bảo vệ & sóng radar đồng tâm 360° */}
          <group position={[0.25, 0, 0]}>
            <RadarDome360
              t={t}
              open={domeOpen}
              alertPulse={alertPulse}
              shieldHit={shieldHit}
              breachDir={breachDir}
            />
          </group>
        </group>

        {/* ==================== TÊN LỬA ĐỘT KÍCH NÓC LAO TỚI & KHÓA MỤC TIÊU ==================== */}
        {t >= MISSILE_T_SPAWN && missileTrailFade > 0.01 && (
          <Trail
            points={MISSILE_TRAIL_PTS}
            upto={t < CUE.s07_midair_blast ? mProg : 1}
            color={P2D.weakRed}
            width={0.22}
            opacity={missileTrailFade}
            glow
          />
        )}

        {missileActive && (
          <group position={missilePos} rotation={orientPlusX(MISSILE_DIR_UNIT)} scale={1.32}>
            <group rotation={[(t - MISSILE_T_SPAWN) * 5.2, 0, 0]}>
              <TopAttackMissile finDeploy={1} thrust={1} />
            </group>
            <pointLight color="#ff5d38" intensity={6} distance={8} decay={1.8} />
          </group>
        )}

        {/* Tia khóa định vị kép từ ăng-ten AESA trên tháp pháo & vòng khóa mục tiêu 3D bắt dính quả đạn */}
        {lockP > 0.01 && (
          <>
            <RadarBeam from={aesaFrontLeft} to={missilePos} color={P2D.radar} radius={0.045} opacity={0.7 * lockP} />
            <RadarBeam from={aesaFrontLeft} to={missilePos} color={P2D.weakRed} radius={0.018} opacity={0.85 * lockP} />
            <RadarBeam from={aesaRearLeft} to={missilePos} color={P2D.radar} radius={0.028} opacity={0.36 * lockP} />
            <TargetLockReticle3D pos={missilePos} camPos={camPos} lockP={lockP} t={t} />
          </>
        )}

        {/* ==================== PHÓNG ĐẠN ĐÁNH CHẶN (66.30 s) & NỔ TUNG TRÊN KHÔNG (67.18 s) ==================== */}
        <MuzzleBlast
          t={t}
          at={CUE.s07_intercept_fire}
          pos={APS_FIRE_ORIGIN}
          dir={INTERCEPT_FIRE_DIR}
          size={0.78}
          seed={19}
        />

        {interceptorTrailOp > 0.01 && (
          <>
            <Trail
              points={INTERCEPTOR_PTS}
              upto={t < CUE.s07_midair_blast ? intProg : 1}
              color={P2D.radar}
              width={0.18}
              opacity={interceptorTrailOp}
              glow
            />
            {interceptorActive && (
              <Trail
                points={INTERCEPTOR_PTS}
                upto={intProg}
                color="#eafffd"
                width={0.068}
                opacity={0.96}
                glow
              />
            )}
          </>
        )}

        {interceptorActive && <InterceptorDart pos={interceptorPos} dir={INTERCEPT_FIRE_DIR} />}

        {/* Vụ nổ đánh chặn giữa không trung cách vỏ giáp ~9.1 m + vòng sóng xung kích trên không */}
        <Explosion
          t={t}
          at={CUE.s07_midair_blast}
          pos={INTERCEPT_POS}
          size={3.8}
          smokeLife={4}
          seed={27}
          smoke="#56616e"
        />

        {blastDt >= 0 && blastDt < 0.95 && (
          <group
            position={[INTERCEPT_POS[0], INTERCEPT_POS[1] + 1.4, INTERCEPT_POS[2]]}
            rotation={[0.35, 0.42, -0.18]}
          >
            <mesh>
              <ringGeometry
                args={[
                  Math.max(0.2, 0.9 + (1 - (1 - blastDt / 0.95) ** 3) * 7.6 - 0.34),
                  0.9 + (1 - (1 - blastDt / 0.95) ** 3) * 7.6,
                  64,
                ]}
              />
              <meshBasicMaterial
                color={blastDt < 0.24 ? '#fff2c6' : P2D.radar}
                transparent
                opacity={0.88 * (1 - blastDt / 0.95)}
                side={THREE.DoubleSide}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </mesh>
          </group>
        )}
      </Stage>

      {/* Nhãn con số duy nhất của cảnh: 360° khi vòm radar quét toàn hướng */}
      <Label
        t={t}
        text="360°"
        x={340}
        y={200}
        from={CUE.s07_radar_360_num}
        until={65.2}
        bg={P2D.radar}
        fg="#09131c"
      />
    </div>
  );
};

export default S07;
