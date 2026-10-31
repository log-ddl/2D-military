import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { DustTrail, Explosion, MuzzleBlast, Trail, ballisticPoints, softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { EnemyT72 } from '../parts/EnemyT72';

// Địa hình chiến thuật sa mạc: bãi cát sạch thoáng nâng rõ 2 mục tiêu T-72 ở 2 gò đồi cánh trái & cánh phải
const S07_TERRAIN = heightField({
  seed: 707,
  amp: 1.35,
  scale: 108,
  oct: 4,
  flats: [[1.5, 0, 11, 0.2]],
  add: (x, z) => {
    // Gò đồi cánh trái nâng Tank 1 (x ≈ 37.5, z ≈ -15.5) nổi cao rõ nét
    const leftRidge = 2.4 * Math.exp(-(((x - 37.5) / 13) ** 2)) * Math.exp(-(((z + 15.5) / 14) ** 2));
    // Gò đồi cánh phải nâng Tank 2 (x ≈ 39.5, z ≈ +18.5) đối xứng bên phải
    const rightKnoll = 2.6 * Math.exp(-(((x - 39.5) / 13) ** 2)) * Math.exp(-(((z - 18.5) / 14) ** 2));
    // Dãy đồi cát xa phía chân trời
    const farBackdrop = 6.8 * Math.exp(-(((x - 122) / 34) ** 2)) * (0.78 + 0.22 * Math.cos(z * 0.06));
    // Vùng trũng nhẹ ở thung lũng giữa để tôn chiều cao của cả Abrams và 2 chiếc T-72
    const valleyDip = -0.8 * Math.exp(-(((x - 20) / 11) ** 2)) * Math.exp(-((z / 24) ** 2));
    return leftRidge + rightKnoll + farBackdrop + valleyDip;
  },
});

// Dọn sạch bán kính rộng quanh Abrams, Tank 1 và Tank 2 (không rải bụi cây tối màu gây nhiễu phom xe tăng địch!)
const AVOID_S07 = (x: number, z: number) =>
  Math.hypot(x - 1.5, z) < 11.0 ||
  Math.hypot(x - 37.5, z + 15.5) < 16.5 ||
  Math.hypot(x - 39.5, z - 18.5) < 16.5;

const abramsXAt = (sec: number) => -1.8 + (sec - 107.6) * 0.28;

const tank1PosAt = (sec: number): V3 => {
  const activeDt = Math.min(sec, 125.14) - 107.6;
  const x = 36.8 + activeDt * 0.09;
  const z = -16.2 + activeDt * 0.07;
  return [x, S07_TERRAIN(x, z), z];
};

const tank2PosAt = (sec: number): V3 => {
  const dt = sec - 107.6;
  const x = 40.4 - dt * 0.09;
  const z = 19.6 - dt * 0.08;
  return [x, S07_TERRAIN(x, z), z];
};

/** Tia ngắm 3D 3 lớp tương phản cực cao để tách bạch tuyệt đối Hổ phách (Pháo thủ) vs Cyan (Trưởng xe CITV) */
const TacticalBeam3D: React.FC<{
  from: V3;
  to: V3;
  kind: 'amber' | 'cyan';
  strength: number;
}> = ({ from, to, kind, strength }) => {
  const { mid, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const l = Math.max(0.1, dir.length());
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const m = a.clone().add(b).multiplyScalar(0.5);
    return { mid: [m.x, m.y, m.z] as V3, quat: q, len: l };
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  const hdrCore = useMemo(
    () => (kind === 'amber' ? new THREE.Color(2.55, 1.52, 0.28) : new THREE.Color(0.18, 2.15, 2.08)),
    [kind],
  );
  if (strength <= 0.01) return null;

  const sheathCol = kind === 'amber' ? '#b83d00' : '#00687a';
  const midCol = kind === 'amber' ? '#ff9d14' : '#1ee3dc';

  return (
    <group position={mid} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[0.2, 0.11, len, 10, 1, true]} />
        <meshBasicMaterial color={sheathCol} transparent opacity={0.38 * strength} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.105, 0.06, len, 10, 1, true]} />
        <meshBasicMaterial color={midCol} transparent opacity={0.85 * strength} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.045, 0.026, len, 8, 1, true]} />
        <meshBasicMaterial color={hdrCore} transparent opacity={0.98 * strength} toneMapped={false} />
      </mesh>
    </group>
  );
};

/** Hình nón quét quang học 360° màu Cyan gắn theo đầu xoay độc lập của kính tiềm vọng nhiệt CITV */
const CitvScanCone3D: React.FC<{
  origin: V3;
  worldYaw: number;
  pitchAngle?: number;
  length: number;
  spreadAngle?: number;
  opacity?: number;
  showDegreeRing?: number;
}> = ({
  origin,
  worldYaw,
  pitchAngle = 0.0,
  length,
  spreadAngle = 0.2,
  opacity = 1,
  showDegreeRing = 0,
}) => {
  const hdrCyan = useMemo(() => new THREE.Color(0.22, 2.12, 2.02), []);
  const radius = Math.tan(spreadAngle) * length;

  const coneGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(1, 1, 24, 1, true);
    g.translate(0, -0.5, 0);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);

  if (opacity <= 0.01) return null;

  return (
    <group position={origin}>
      {/* Vòng chia độ 360° quanh chân trụ CITV ở pha cận cảnh đầu cảnh */}
      {showDegreeRing > 0.01 && (
        <group position={[0, -0.14, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.42, 0.51, 48]} />
            <meshBasicMaterial color="#005b69" transparent opacity={0.65 * showDegreeRing} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.445, 0.482, 48]} />
            <meshBasicMaterial color={hdrCyan} transparent opacity={0.96 * showDegreeRing} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.57, 0.005, Math.sin(a) * 0.57]}
                rotation={[0, -a, 0]}
                geometry={rbox(0.095, 0.014, 0.026, 0.003)}
              >
                <meshBasicMaterial color={hdrCyan} transparent opacity={0.9 * showDegreeRing} toneMapped={false} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Nón quét quang học xoay theo đúng worldYaw độc lập của CITV */}
      <group rotation={[0, worldYaw, pitchAngle]}>
        <mesh geometry={coneGeo} scale={[length, radius * 0.48, radius]}>
          <meshBasicMaterial
            color={PAL.cyan}
            transparent
            opacity={0.18 * opacity}
            side={THREE.DoubleSide}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        {([-1, 1] as const).map((s) => (
          <mesh
            key={s}
            position={[length * 0.5, 0, s * radius * 0.48]}
            rotation={[0, -s * spreadAngle * 0.96, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.028, 0.015, length, 8]} />
            <meshBasicMaterial color={hdrCyan} transparent opacity={0.82 * opacity} toneMapped={false} />
          </mesh>
        ))}
        {[0.36, 0.68, 0.96].map((f, ri) => (
          <mesh key={ri} position={[length * f, 0, 0]} rotation={[0, Math.PI / 2, 0]} scale={[1, 0.48, 1]}>
            <ringGeometry args={[radius * f * 0.93, radius * f * 1.0, 28]} />
            <meshBasicMaterial
              color={hdrCyan}
              transparent
              opacity={0.48 * opacity * (1 - f * 0.32)}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Khung đánh dấu mục tiêu 3D:
 *  - kind='amber' (Gunner / Killer): Khung vuông góc L-brackets màu Hổ phách FLIR
 *  - kind='cyan'  (Commander / Hunter): Khung thoi Diamond 45° màu Cyan CITV
 */
const BattlefieldTargetMarker: React.FC<{
  pos: V3;
  camPos: V3;
  kind: 'amber' | 'cyan';
  strength: number;
  pulse?: number;
}> = ({ pos, camPos, kind, strength, pulse = 0 }) => {
  const quat = useMemo(() => {
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(...camPos),
      new THREE.Vector3(...pos),
      new THREE.Vector3(0, 1, 0),
    );
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [pos[0], pos[1], pos[2], camPos[0], camPos[1], camPos[2]]);

  const hdrCol = useMemo(
    () => (kind === 'amber' ? new THREE.Color(2.5, 1.52, 0.3) : new THREE.Color(0.2, 2.15, 2.05)),
    [kind],
  );
  const darkCol = kind === 'amber' ? '#2c1000' : '#032930';
  const ringShade = kind === 'amber' ? '#b84300' : '#006e80';

  const darkMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: darkCol, transparent: true, opacity: 0.85 * strength }),
    [darkCol, strength],
  );
  const brightMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: hdrCol, transparent: true, opacity: 0.98 * strength, toneMapped: false }),
    [hdrCol, strength],
  );

  if (strength <= 0.01) return null;

  const s = (1 + pulse * 0.1) * lerp(1.18, 1.0, strength);
  const ringR = (kind === 'amber' ? 4.85 : 5.55) * s;

  return (
    <group position={pos}>
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringR - 0.36, ringR + 0.36, 48]} />
        <meshBasicMaterial color={ringShade} transparent opacity={0.52 * strength} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[ringR - 0.14, ringR + 0.14, 48]} />
        <meshBasicMaterial color={hdrCol} transparent opacity={0.95 * strength} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      <group quaternion={quat}>
        {kind === 'amber' ? (
          <>
            {(
              [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
              ] as const
            ).map(([sx, sy], idx) => {
              const hw = 4.45 * s;
              const hh = 2.48 * s;
              const arm = 1.32;
              const th = 0.21;
              return (
                <group key={idx} position={[sx * hw, sy * hh, 0]}>
                  <mesh position={[-sx * arm * 0.5, 0, -0.04]} geometry={rbox(arm + 0.16, th + 0.14, 0.04, 0.01)} material={darkMat} />
                  <mesh position={[0, -sy * arm * 0.5, -0.04]} geometry={rbox(th + 0.14, arm + 0.16, 0.04, 0.01)} material={darkMat} />
                  <mesh position={[-sx * arm * 0.5, 0, 0]} geometry={rbox(arm, th, 0.06, 0.01)} material={brightMat} />
                  <mesh position={[0, -sy * arm * 0.5, 0]} geometry={rbox(th, arm, 0.06, 0.01)} material={brightMat} />
                </group>
              );
            })}
          </>
        ) : (
          <group rotation={[0, 0, Math.PI / 4]}>
            {(
              [
                [-1, -1],
                [1, -1],
                [1, 1],
                [-1, 1],
              ] as const
            ).map(([sx, sy], idx) => {
              const hd = 3.3 * s;
              const arm = 1.4;
              const th = 0.21;
              return (
                <group key={idx} position={[sx * hd, sy * hd, 0.08]}>
                  <mesh position={[-sx * arm * 0.5, 0, -0.04]} geometry={rbox(arm + 0.16, th + 0.14, 0.04, 0.01)} material={darkMat} />
                  <mesh position={[0, -sy * arm * 0.5, -0.04]} geometry={rbox(th + 0.14, arm + 0.16, 0.04, 0.01)} material={darkMat} />
                  <mesh position={[-sx * arm * 0.5, 0, 0]} geometry={rbox(arm, th, 0.06, 0.01)} material={brightMat} />
                  <mesh position={[0, -sy * arm * 0.5, 0]} geometry={rbox(th, arm, 0.06, 0.01)} material={brightMat} />
                </group>
              );
            })}
          </group>
        )}
      </group>
    </group>
  );
};

/** Ngọn lửa âm ỉ & khói cháy trên xác chiếc Tank 1 sau cú bắn hạ lúc 125.15s */
const BurningWreckFire: React.FC<{ t: number; at: number; pos: V3 }> = ({ t, at, pos }) => {
  const tex = useMemo(() => softDot(), []);
  const dt = t - at;
  if (dt < 0.25) return null;
  const active = Math.min(1, (dt - 0.25) / 0.4);
  const flicker = 0.85 + 0.15 * Math.sin(t * 19.3);

  return (
    <group position={[pos[0], pos[1] + 1.35, pos[2]]}>
      <pointLight color="#ff7b24" intensity={32 * active * flicker} distance={14} decay={1.6} position={[0, 1.2, 0]} />
      {Array.from({ length: 6 }, (_, i) => {
        const cyc = (dt * 1.15 + i / 6) % 1;
        const sz = (1.35 + cyc * 1.8) * active;
        return (
          <sprite
            key={i}
            position={[Math.sin(i * 2.1 + t * 3) * 0.45, cyc * 2.4, Math.cos(i * 1.7 + t * 2.5) * 0.45]}
            scale={[sz, sz * 1.25, sz]}
          >
            <spriteMaterial
              map={tex}
              color={cyc < 0.45 ? '#ffcc52' : '#ff5e14'}
              transparent
              opacity={(1 - cyc) * 0.82 * active}
              depthWrite={false}
            />
          </sprite>
        );
      })}
    </group>
  );
};

const C01S07: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // ---------------- 1. VỊ TRÍ ABRAMS & 2 XE TĂNG ĐỊCH T-72 (TANK 1 TRÁI, TANK 2 PHẢI) ----------------
  const abramsX = abramsXAt(t);
  const abramsZ = 0;
  const abramsY = S07_TERRAIN(abramsX, abramsZ) - 0.03;

  const tank1Pos = tank1PosAt(t);
  const tank2Pos = tank2PosAt(t);
  const tank1Center: V3 = [tank1Pos[0], tank1Pos[1] + 1.25, tank1Pos[2]];
  const tank2Center: V3 = [tank2Pos[0], tank2Pos[1] + 1.25, tank2Pos[2]];

  const pivotX = abramsX + 0.08;
  const yawToTank1 = Math.atan2(-(tank1Pos[2] - abramsZ), tank1Pos[0] - pivotX);
  const yawToTank2 = Math.atan2(-(tank2Pos[2] - abramsZ), tank2Pos[0] - pivotX);

  // ---------------- 2. QUY TRÌNH HUNTER-KILLER: TURRET YAW (PHÁO THỦ) & CITV YAW ĐỘC LẬP (TRƯỞNG XE) ----------------
  const alignTank1P = prog(t, 115.8, CUE.c01_s07_line_tank1 + 0.45, Easing.inOut(Easing.cubic));
  const whipTank2P = prog(
    t,
    CUE.c01_s07_whip_tank2 - 0.08,
    CUE.c01_s07_whip_tank2 + 0.65,
    Easing.bezier(0.2, 1.04, 0.34, 1),
  );

  const preWhipTurretYaw = lerp(0.04, yawToTank1, alignTank1P);
  const turretYaw = lerp(preWhipTurretYaw, yawToTank2, whipTank2P);

  const pitchToTank1 = Math.atan2(tank1Center[1] - (abramsY + 1.85), Math.hypot(tank1Pos[0] - pivotX, tank1Pos[2] - abramsZ));
  const pitchToTank2 = Math.atan2(tank2Center[1] - (abramsY + 1.85), Math.hypot(tank2Pos[0] - pivotX, tank2Pos[2] - abramsZ));
  const gunPitch = lerp(0.015, lerp(pitchToTank1, pitchToTank2, whipTank2P), alignTank1P);

  // CITV 360° xoay độc lập hoàn toàn với tháp pháo:
  // Ở Pha 1 (107.6..114.8s), quay trọn một vòng 360°; Pha 2 khoá cứng Tank 2 bên phải; Pha 3 lia tiếp tìm mục tiêu 3!
  const spin360P = prog(t, 108.6, CUE.c01_s07_citv + 0.45, Easing.inOut(Easing.cubic));
  const huntTank2P = prog(t, 120.2, CUE.c01_s07_hunt_tank2 + 0.85, Easing.inOut(Easing.cubic));
  const huntThreat3P = prog(t, 127.4, 128.95, Easing.inOut(Easing.quad));

  let worldCitvYaw: number;
  if (t < 114.9) {
    worldCitvYaw = 0.25 + spin360P * Math.PI * 2;
  } else {
    const preHuntYaw = 0.25 + Math.PI * 2 - 0.15 * Math.sin((t - 114.9) * 1.3);
    const targetTank2 = yawToTank2 + Math.PI * 2;
    const targetThreat3 = targetTank2 - 0.42;
    worldCitvYaw = lerp(lerp(preHuntYaw, targetTank2, huntTank2P), targetThreat3, huntThreat3P);
  }
  const citvLocalYaw = worldCitvYaw - turretYaw;

  // ---------------- 3. KHAI HOẢ HẠ TANK 1 (@124.90) & HIỆU ỨNG ĐẠN ĐỘNG NĂNG ----------------
  const tFire = CUE.c01_s07_fire_tank1; // 124.90 s
  const tImpact = tFire + 0.24; // 125.14 s
  const recoil = bump(t, tFire, 0.38);

  const turretToWorld = (lx: number, ly: number, lz: number): V3 => {
    const c = Math.cos(turretYaw);
    const s = Math.sin(turretYaw);
    return [
      abramsX + 0.08 + lx * c + lz * s,
      abramsY + 1.35 + ly,
      abramsZ - lx * s + lz * c,
    ];
  };

  const gpsWorldPos = turretToWorld(1.13, 1.25, 0.74);
  const citvWorldPos = turretToWorld(0.58, 1.33, -0.66);

  const muzzleDist = 5.28 - recoil * 0.3;
  const muzzleLocalX = 0.36 + Math.cos(gunPitch) * muzzleDist;
  const muzzleLocalY = 0.5 + Math.sin(gunPitch) * muzzleDist;
  const muzzleWorldPos = turretToWorld(muzzleLocalX, muzzleLocalY, 0);
  const muzzleDir: V3 = [
    Math.cos(turretYaw) * Math.cos(gunPitch),
    Math.sin(gunPitch),
    -Math.sin(turretYaw) * Math.cos(gunPitch),
  ];

  const shotStartPos = useMemo((): V3 => {
    const xF = abramsXAt(tFire);
    const yF = S07_TERRAIN(xF, 0) - 0.03;
    const t1F = tank1PosAt(tFire);
    const yawF = Math.atan2(-t1F[2], t1F[0] - (xF + 0.08));
    const pitchF = Math.atan2(t1F[1] + 1.25 - (yF + 1.85), Math.hypot(t1F[0] - (xF + 0.08), t1F[2]));
    const lx = 0.36 + Math.cos(pitchF) * 5.28;
    const ly = 0.5 + Math.sin(pitchF) * 5.28;
    return [
      xF + 0.08 + lx * Math.cos(yawF),
      yF + 1.35 + ly,
      -lx * Math.sin(yawF),
    ];
  }, [tFire]);

  const tank1HitPos = useMemo((): V3 => {
    const p = tank1PosAt(tImpact);
    return [p[0], p[1] + 1.22, p[2]];
  }, [tImpact]);

  const shotPoints = useMemo(
    () => ballisticPoints(shotStartPos, tank1HitPos, 0.2, 40),
    [shotStartPos, tank1HitPos],
  );
  const shotUpto = prog(t, tFire, tImpact, Easing.linear);
  const shotFade = 1 - prog(t, tImpact + 0.15, tImpact + 1.25);

  const tank1Damaged = prog(t, tImpact, tImpact + 0.28);
  const tank1Pop =
    1.2 * bump(t, tImpact, 0.75) + 0.26 * prog(t, tImpact + 0.35, tImpact + 0.75);

  // ---------------- 4. CHUYỂN ĐỘNG CAMERA 2 PHA: CẬN CẢNH CITV KHÔNG BỊ CHE → ĐẠI CẢNH HUNTER-KILLER ----------------
  const pullBackP = prog(t, 114.25, 116.85, Easing.inOut(Easing.cubic));
  const closeOrbit = prog(t, 107.6, 114.4, Easing.inOut(Easing.quad));

  // Pha 1: Góc cận chéo trước-trái -> ngang-trái trên nóc tháp để thấy TRỰC DIỆN mặt kính CITV xoay 360° không bị súng M240 che,
  // đồng thời thấy rõ vòm Trưởng xe + CROWS phía sau-trên ("Behind and above the gunner sits the tank commander...")
  const closeCamPos: V3 = [
    abramsX + lerp(2.15, 0.35, closeOrbit),
    abramsY + lerp(3.52, 3.85, closeOrbit),
    lerp(-2.22, -2.55, closeOrbit),
  ];
  const closeCamLook: V3 = [
    abramsX + 0.42,
    abramsY + 2.58,
    -0.18,
  ];

  // Pha 2 & 3: Góc chiến thuật từ trên-sau vai trái Abrams với fov={38} ôm gọn Abrams + Tank 1 (trái) + Tank 2 (phải) rõ nét
  const tacDrift = prog(t, 116.85, 129.0, Easing.linear);
  const tacCamPos: V3 = [
    abramsX - 13.6 + tacDrift * 0.6,
    9.8 + tacDrift * 0.4,
    -6.8 - tacDrift * 0.4,
  ];
  const tacCamLook: V3 = [
    18.2 + whipTank2P * 1.4,
    1.5,
    lerp(0.2, 2.6, whipTank2P),
  ];

  const camPos: V3 = [
    lerp(closeCamPos[0], tacCamPos[0], pullBackP),
    lerp(closeCamPos[1], tacCamPos[1], pullBackP),
    lerp(closeCamPos[2], tacCamPos[2], pullBackP),
  ];
  const camLook: V3 = [
    lerp(closeCamLook[0], tacCamLook[0], pullBackP),
    lerp(closeCamLook[1], tacCamLook[1], pullBackP),
    lerp(closeCamLook[2], tacCamLook[2], pullBackP),
  ];
  const camFov = lerp(35, 38.5, pullBackP);

  // ---------------- 5. ĐIỀU KHIỂN TIA HỔ PHÁCH (PHÁO THỦ) VS TIA CYAN (TRƯỞNG XE CITV) ----------------
  const amberBeamOn = prog(t, CUE.c01_s07_line_tank1 - 0.6, CUE.c01_s07_line_tank1 + 0.3);
  const gunnerTargetPos: V3 = [
    lerp(tank1Center[0], tank2Center[0], whipTank2P),
    lerp(tank1Center[1], tank2Center[1], whipTank2P),
    lerp(tank1Center[2], tank2Center[2], whipTank2P),
  ];
  const amberTank1Lock = amberBeamOn * (1 - prog(t, CUE.c01_s07_whip_tank2 - 0.1, CUE.c01_s07_whip_tank2 + 0.18));
  const amberTank2Lock = prog(t, CUE.c01_s07_whip_tank2 + 0.35, CUE.c01_s07_whip_tank2 + 0.68);

  const cyanTank2BeamOn =
    prog(t, CUE.c01_s07_hunt_tank2 - 0.4, CUE.c01_s07_hunt_tank2 + 0.5) *
    (1 - 0.85 * huntThreat3P);
  const cyanTank2Marker =
    prog(t, CUE.c01_s07_hunt_tank2 - 0.2, CUE.c01_s07_hunt_tank2 + 0.6) *
    (1 - 0.35 * huntThreat3P);
  const buttonTapPulse = bump(t, CUE.c01_s07_button_tap, 0.52);

  const distCitvToTank2 = Math.hypot(tank2Pos[0] - citvWorldPos[0], tank2Pos[2] - citvWorldPos[2]);
  const pitchCitvToTank2 = Math.atan2(tank2Center[1] - citvWorldPos[1], distCitvToTank2);

  const citvConeLen = lerp(6.2, lerp(24.0, distCitvToTank2 * 0.92, huntTank2P * (1 - huntThreat3P)), pullBackP);
  const citvConePitch = lerp(-0.03, pitchCitvToTank2, pullBackP * huntTank2P);
  const citvConeOp = lerp(0.95, 0.58, pullBackP);
  const degreeRingOp = 1 - prog(t, 114.2, 115.8);

  const handoffRingScale = 0.6 + prog(t, CUE.c01_s07_button_tap, CUE.c01_s07_button_tap + 0.65) * 4.2;

  // Cung quét hổ phách trên mặt phẳng tháp pháo minh hoạ cú quất "one button tap whips the gunner's sight"
  const whipArcOp = prog(t, CUE.c01_s07_whip_tank2 - 0.05, CUE.c01_s07_whip_tank2 + 0.3) * (1 - prog(t, 128.1, 129.0));
  const arcSpan = Math.abs(yawToTank1 - yawToTank2) * whipTank2P;

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
      <Stage
        {...LOOK_DESERT_GLARE.stage}
        width={W}
        height={H}
        shadowCenter={[19, 0, 2]}
        shadowArea={42}
        fog={[145, 500]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình sa mạc 2 gò đồi mục tiêu thoáng sạch */}
        <Terrain
          h={S07_TERRAIN}
          size={500}
          seg={256}
          center={[40, 2]}
          colors={LOOK_DESERT_GLARE.terrain}
          grainRepeat={54}
        />
        <Scatter
          kind="rock"
          count={115}
          area={[-30, -75, 115, 80]}
          h={S07_TERRAIN}
          seed={71}
          scale={[0.45, 1.25]}
          avoid={AVOID_S07}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />

        {/* Chủ thể tiền cảnh: M1A2 Abrams */}
        <M1A2Abrams
          position={[abramsX, abramsY, abramsZ]}
          turretYaw={turretYaw}
          gunPitch={gunPitch}
          recoil={recoil}
          citvYaw={citvLocalYaw}
          crowsYaw={0.18}
          travel={(t - 107.0) * 0.28}
          hullPitch={0.007 * Math.sin(t * 2.4)}
          exhaustHeat={0.45}
          variant="m1a2"
          camo="desert"
        />
        <DustTrail
          t={t}
          from={107.0}
          to={129.4}
          rate={5}
          size={1.65}
          life={2.3}
          color="#d3bd95"
          path={(sec) => {
            const x = abramsXAt(sec) - 3.6;
            return [x, S07_TERRAIN(x, 0), 0];
          }}
        />

        {/* Cung quét góc phương vị hổ phách quanh tháp pháo Abrams khi quất nòng từ Tank 1 sang Tank 2 */}
        {whipArcOp > 0.01 && arcSpan > 0.02 && (
          <mesh
            position={[abramsX + 0.08, abramsY + 2.48, abramsZ]}
            rotation={[-Math.PI / 2, 0, yawToTank1 - arcSpan]}
          >
            <ringGeometry args={[5.4, 6.15, 36, 1, 0, arcSpan]} />
            <meshBasicMaterial
              color={PAL.amber}
              transparent
              opacity={0.48 * whipArcOp}
              side={THREE.DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}

        {/* Mục tiêu 1 (Cánh trái — Pháo thủ ngắm Hổ phách & bắn hạ lúc 124.90s) */}
        <EnemyT72
          position={tank1Pos}
          rotation={[0, 2.34, 0]}
          turretYaw={-0.36}
          gunPitch={-0.02}
          travel={Math.max(0, Math.min(t, tImpact) - 107.0) * 0.14}
          damaged={tank1Damaged}
          turretPopHeight={tank1Pop}
          turretPopRot={[0.15 * tank1Damaged, 0.24 * tank1Damaged, -0.19 * tank1Damaged]}
        />
        <BurningWreckFire t={t} at={tImpact} pos={tank1Pos} />

        {/* Mục tiêu 2 (Cánh phải — Trưởng xe dùng CITV Cyan săn sẵn & bàn giao cho Pháo thủ lúc 126.44s) */}
        <EnemyT72
          position={tank2Pos}
          rotation={[0, -2.3, 0]}
          turretYaw={0.34}
          gunPitch={-0.02}
          travel={(t - 107.0) * 0.15}
        />

        {/* Nón quét quang học 360° màu Cyan gắn trên trụ CITV của Trưởng xe */}
        <CitvScanCone3D
          origin={citvWorldPos}
          worldYaw={worldCitvYaw}
          pitchAngle={citvConePitch}
          length={citvConeLen}
          spreadAngle={lerp(0.22, 0.095, pullBackP)}
          opacity={citvConeOp}
          showDegreeRing={degreeRingOp}
        />

        {/* Tia ngắm Hổ phách (FLIR Amber) của Pháo thủ từ hộp GPS tới Tank 1 rồi quất sang Tank 2 */}
        <TacticalBeam3D
          from={gpsWorldPos}
          to={gunnerTargetPos}
          kind="amber"
          strength={amberBeamOn}
        />

        {/* Tia khoá mục tiêu Cyan của Trưởng xe (CITV) ghim sẵn vào Tank 2 bên phải */}
        <TacticalBeam3D
          from={citvWorldPos}
          to={tank2Center}
          kind="cyan"
          strength={cyanTank2BeamOn}
        />

        {/* Khung khoá mục tiêu tách bạch màu sắc & hình dáng trên 2 chiếc T-72 */}
        <BattlefieldTargetMarker
          pos={tank1Center}
          camPos={camPos}
          kind="amber"
          strength={amberTank1Lock}
          pulse={bump(t, CUE.c01_s07_line_tank1, 0.45)}
        />
        <BattlefieldTargetMarker
          pos={tank2Center}
          camPos={camPos}
          kind="cyan"
          strength={cyanTank2Marker}
          pulse={bump(t, CUE.c01_s07_hunt_tank2, 0.45) + buttonTapPulse}
        />
        <BattlefieldTargetMarker
          pos={tank2Center}
          camPos={camPos}
          kind="amber"
          strength={amberTank2Lock}
          pulse={bump(t, CUE.c01_s07_whip_tank2 + 0.55, 0.42)}
        />

        {/* Vòng xung lệnh "One Button Tap" (@125.86) phát ra từ trụ CITV khi bàn giao mục tiêu */}
        {buttonTapPulse > 0.01 && (
          <mesh position={[citvWorldPos[0], citvWorldPos[1] + 0.05, citvWorldPos[2]]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[handoffRingScale * 0.86, handoffRingScale, 40]} />
            <meshBasicMaterial
              color={PAL.amberHot}
              transparent
              opacity={0.88 * buttonTapPulse}
              side={THREE.DoubleSide}
              toneMapped={false}
            />
          </mesh>
        )}

        {/* Chớp lửa đầu nòng M256, vệt đạn động năng lệch trục >20° và vụ nổ huỷ diệt Tank 1 */}
        <MuzzleBlast
          t={t}
          at={tFire}
          pos={muzzleWorldPos}
          dir={muzzleDir}
          size={2.2}
          seed={7}
        />
        {t >= tFire && shotFade > 0.01 && (
          <>
            <Trail
              points={shotPoints}
              upto={shotUpto}
              color="#ff9f2e"
              width={0.3}
              opacity={0.5 * shotFade}
              glow
            />
            <Trail
              points={shotPoints}
              upto={shotUpto}
              color="#ffe787"
              width={0.14}
              opacity={0.96 * shotFade}
              glow
            />
          </>
        )}
        <Explosion
          t={t}
          at={tImpact}
          pos={[tank1Pos[0], tank1Pos[1] + 0.6, tank1Pos[2]]}
          size={5.4}
          seed={17}
          smokeLife={6.5}
          smoke="#433c36"
        />
      </Stage>

      {/* Tối đa 1 <Label> mỗi thời điểm: "CITV" (111.60–115.00s), sau đó "HUNTER-KILLER" (117.84–123.00s) */}
      <Label
        t={t}
        text="CITV"
        x={W * 0.2}
        y={H * 0.15}
        from={CUE.c01_s07_360_scan}
        until={115.0}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="HUNTER-KILLER"
        x={W * 0.22}
        y={H * 0.84}
        from={CUE.c01_s07_hunter_killer}
        until={123.0}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C01S07;
