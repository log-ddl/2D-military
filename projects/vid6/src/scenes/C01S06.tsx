import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { DustTrail, softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { EnemyT72 } from '../parts/EnemyT72';

// 9 rãnh hào sa mạc sâu + bờ cát đắp (wadi ditches) cắt chéo hành lang cơ động của Abrams (x = -56 .. +4)
const DITCHES = [
  { x0: -52.5, depth: 0.78, berm: 0.4, w: 2.35, skew: 0.16 },
  { x0: -45.6, depth: 0.88, berm: 0.44, w: 2.4, skew: -0.19 },
  // Cú sập hào sâu chủ đạo đúng mốc slams@98.52 (abramsX ≈ -39.4 -> mũi xe lao thẳng xuống rãnh -36.8)
  { x0: -36.8, depth: 1.18, berm: 0.54, w: 2.65, skew: 0.21 },
  { x0: -28.6, depth: 0.92, berm: 0.44, w: 2.35, skew: -0.18 },
  { x0: -20.4, depth: 1.0, berm: 0.48, w: 2.45, skew: 0.17 },
  { x0: -12.4, depth: 0.9, berm: 0.43, w: 2.35, skew: -0.2 },
  { x0: -4.4, depth: 1.02, berm: 0.48, w: 2.45, skew: 0.18 },
  { x0: 3.4, depth: 0.86, berm: 0.42, w: 2.35, skew: -0.16 },
] as const;

// Sống đồi ngang-chéo nơi chiếc EnemyT72 cơ động cắt ngang tầm ngắm (luôn nằm phía trước x ≈ 28..42, phô trọn biên dạng ngang T-72)
const ridgeLineX = (z: number) => 33.5 + (z + 1.0) * 0.62;

const S06_TERRAIN = heightField({
  seed: 606,
  amp: 1.25,
  scale: 96,
  oct: 4,
  add: (x, z) => {
    let h = 0;

    // Mặt bằng hành lang hào rãnh phía dưới Abrams
    const laneMask = Math.exp(-((z / 14) ** 2)) * (1 / (1 + Math.exp((x - 6) * 0.4)));
    h -= 0.35 * laneMask;

    // Chuỗi hào rãnh & bờ cát cắt ngang mũi xe Abrams
    if (x > -60 && x < 9) {
      const zFade = Math.exp(-((z / 22) ** 4));
      for (const d of DITCHES) {
        const u = (x + z * d.skew - d.x0) / d.w;
        if (Math.abs(u) < 4.0) {
          const trench = -d.depth * Math.exp(-u * u);
          const lipA = d.berm * Math.exp(-(((u - 1.3) / 0.8) ** 2));
          const lipB = d.berm * 0.88 * Math.exp(-(((u + 1.3) / 0.8) ** 2));
          h += (trench + lipA + lipB) * zFade;
        }
      }
    }

    // Sống đồi cát sạch thoáng nâng chiếc EnemyT72 nổi bật hoàn toàn trên đường chân trời
    const rx = ridgeLineX(z);
    const targetRidge = 2.45 * Math.exp(-(((x - rx) / 10.5) ** 2)) * Math.exp(-(((z + 1.0) / 26) ** 2));
    h += targetRidge;

    // Đồi cát hai bên sườn & hậu cảnh xa
    const sideDunes = 3.2 * (1 - Math.exp(-((Math.abs(z) / 38) ** 2))) * (0.65 + 0.35 * Math.sin(x * 0.05));
    const farEscarpment = 6.2 * Math.exp(-(((x - 135) / 38) ** 2));
    return h + sideDunes + farEscarpment;
  },
});

// Giữ sạch hoàn toàn hành lang chạy Abrams (x = -60..+24) và vùng sống đồi quanh T-72 để không có tảng đá nào chắn mũi xe hay nhiễu mục tiêu
const AVOID_S06 = (x: number, z: number) =>
  (x > -60 && x < 24 && Math.abs(z) < 8.5) ||
  (Math.abs(x - ridgeLineX(z)) < 15 && Math.abs(z + 1.0) < 20);

// Abrams cơ động từ x = -50 -> +2 (qua 8 rãnh hào), guồng xích chạy tốc độ 40 mph
const ABRAMS_X0 = -50.0;
const ABRAMS_V = 4.22;
const abramsXAt = (sec: number) => ABRAMS_X0 + (sec - 95.3) * ABRAMS_V;

// EnemyT72 cơ động cắt ngang sống đồi phía trước ở cự ly nén điện ảnh ~38..80 m, phô rõ biên dạng 3/4 ngang dài ~8m của T-72
const t72PosAt = (sec: number): V3 => {
  const dt = sec - 95.3;
  const tz = -8.5 + dt * 1.32;
  const tx = ridgeLineX(tz);
  return [tx, S06_TERRAIN(tx, tz), tz];
};

/** Tia khoá mục tiêu FLIR Amber 3 lớp độ tương phản cao trên nền cát nắng gắt */
const AmberSightBeam: React.FC<{ from: V3; to: V3; strength: number }> = ({ from, to, strength }) => {
  const { mid, quat, len } = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const dir = b.clone().sub(a);
    const l = Math.max(0.1, dir.length());
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    const m = a.clone().add(b).multiplyScalar(0.5);
    return { mid: [m.x, m.y, m.z] as V3, quat: q, len: l };
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  const coreColor = useMemo(() => new THREE.Color(2.45, 1.58, 0.36), []);
  if (strength <= 0.01) return null;

  return (
    <group position={mid} quaternion={quat}>
      <mesh>
        <cylinderGeometry args={[0.105, 0.055, len, 10, 1, true]} />
        <meshBasicMaterial color="#c44900" transparent opacity={0.3 * strength} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.052, 0.028, len, 10, 1, true]} />
        <meshBasicMaterial color={PAL.amber} transparent opacity={0.72 * strength} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh>
        <cylinderGeometry args={[0.022, 0.013, len, 8, 1, true]} />
        <meshBasicMaterial color={coreColor} transparent opacity={0.96 * strength} toneMapped={false} />
      </mesh>
    </group>
  );
};

/** Khung khoá mục tiêu nhiệt 3D FLIR Amber đứng yên tuyệt đối quanh EnemyT72 */
const ThermalLockReticle3D: React.FC<{
  pos: V3;
  camPos: V3;
  lockAmt: number;
  pulse: number;
}> = ({ pos, camPos, lockAmt, pulse }) => {
  const quat = useMemo(() => {
    const m = new THREE.Matrix4().lookAt(
      new THREE.Vector3(...camPos),
      new THREE.Vector3(...pos),
      new THREE.Vector3(0, 1, 0),
    );
    return new THREE.Quaternion().setFromRotationMatrix(m);
  }, [pos[0], pos[1], pos[2], camPos[0], camPos[1], camPos[2]]);

  const hdrAmber = useMemo(() => new THREE.Color(2.4, 1.52, 0.32), []);
  const darkBack = useMemo(() => new THREE.MeshBasicMaterial({ color: '#2b1000', transparent: true, opacity: 0.84 }), []);
  const brightMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: hdrAmber, toneMapped: false }),
    [hdrAmber],
  );

  const scale = lerp(1.18, 1.0, lockAmt) * (1 - pulse * 0.06);
  const hw = 4.75 * scale;
  const hh = 2.5 * scale;
  const arm = 1.35;
  const th = 0.2;

  const corners: [number, number][] = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ];

  return (
    <group position={pos}>
      {/* Vòng định vị nhiệt dưới mặt cát quanh T-72 */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.7, 5.22, 48]} />
        <meshBasicMaterial color="#b84300" transparent opacity={0.48 + 0.35 * lockAmt} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, -1.18, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[4.85, 5.06, 48]} />
        <meshBasicMaterial color={hdrAmber} transparent opacity={0.8 + 0.2 * lockAmt} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>

      {/* Khung chữ nhật 4 góc vuông góc với trục nhìn camera (đứng yên tuyệt đối!) */}
      <group quaternion={quat}>
        {corners.map(([sx, sy], idx) => (
          <group key={idx} position={[sx * hw, sy * hh, 0]}>
            <mesh position={[-sx * (arm * 0.5), 0, -0.04]} geometry={rbox(arm + 0.16, th + 0.14, 0.04, 0.01)} material={darkBack} />
            <mesh position={[0, -sy * (arm * 0.5), -0.04]} geometry={rbox(th + 0.14, arm + 0.16, 0.04, 0.01)} material={darkBack} />
            <mesh position={[-sx * (arm * 0.5), 0, 0]} geometry={rbox(arm, th, 0.05, 0.01)} material={brightMat} />
            <mesh position={[0, -sy * (arm * 0.5), 0]} geometry={rbox(th, arm, 0.05, 0.01)} material={brightMat} />
          </group>
        ))}

        {/* 4 vạch chia tâm ngắm thập tự */}
        {[
          [0, hh + 0.52, 0.15, 0.68],
          [0, -hh - 0.52, 0.15, 0.68],
          [hw + 0.58, 0, 0.78, 0.15],
          [-hw - 0.58, 0, 0.78, 0.15],
        ].map(([cx, cy, w, h], ti) => (
          <group key={ti} position={[cx, cy, 0]}>
            <mesh position={[0, 0, -0.04]} geometry={rbox(w + 0.12, h + 0.12, 0.03, 0.01)} material={darkBack} />
            <mesh geometry={rbox(w, h, 0.05, 0.01)} material={brightMat} />
          </group>
        ))}

        {/* Vòng khoá tâm nhỏ xuất hiện khi locked@103.32 */}
        {lockAmt > 0.02 && (
          <mesh scale={lerp(1.4, 1.0, lockAmt)}>
            <ringGeometry args={[0.64, 0.82, 32]} />
            <meshBasicMaterial color={hdrAmber} transparent opacity={0.88 * lockAmt} side={THREE.DoubleSide} toneMapped={false} />
          </mesh>
        )}
      </group>
    </group>
  );
};

/** Cột khói dầu cháy tạt gió bất đối xứng & màn bụi cát bay ngang chiến trường (@105.16 darkness, smoke, or blowing dust) */
const BattlefieldSmokeAndDust: React.FC<{ t: number }> = ({ t }) => {
  const tex = useMemo(() => softDot(), []);
  const dustBoost = prog(t, CUE.c01_s06_target_lock - 0.5, CUE.c01_s06_smoke_dust + 0.7);

  // Luồng khói đen cháy tạt xiên theo gió từ bên trái qua thung lũng (bất đối xứng tự nhiên, không che đặc thân T-72)
  const smokeSources: { base: V3; windZ: number; windX: number; scale: number }[] = [
    { base: [-10, S06_TERRAIN(-10, -10.5), -10.5], windZ: 7.5, windX: 3.5, scale: 1.05 },
    { base: [18, S06_TERRAIN(18, 12.5), 12.5], windZ: 5.2, windX: 2.8, scale: 0.85 },
  ];

  const blowingClouds = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        xBase: -38 + i * 2.1,
        z0: -15 + rnd(i * 3 + 1) * 30,
        yOff: 0.8 + rnd(i * 5 + 2) * 2.3,
        size: 3.6 + rnd(i * 7 + 3) * 4.5,
        speedZ: 3.6 + rnd(i * 11 + 4) * 3.8,
        isSmoke: i % 4 === 0,
      })),
    [],
  );

  return (
    <group>
      {smokeSources.map((src, ci) =>
        Array.from({ length: 14 }, (_, pi) => {
          const cycle = (t * 0.36 + pi / 14 + ci * 0.41) % 1;
          const rise = Math.pow(cycle, 0.82) * 10.5 * src.scale;
          const sz = (2.6 + cycle * 6.8) * src.scale;
          const op = Math.sin(cycle * Math.PI) * (0.34 + 0.16 * dustBoost);
          return (
            <sprite
              key={`sc-${ci}-${pi}`}
              position={[
                src.base[0] + cycle * src.windX,
                src.base[1] + 0.7 + rise,
                src.base[2] + cycle * src.windZ,
              ]}
              scale={[sz * 1.15, sz * 0.95, sz]}
            >
              <spriteMaterial
                map={tex}
                color={cycle < 0.3 ? '#282320' : '#474039'}
                transparent
                opacity={op}
                depthWrite={false}
              />
            </sprite>
          );
        }),
      )}

      {blowingClouds.map((cl, i) => {
        const dt = t - 95.0;
        const zWrap = ((((cl.z0 + dt * cl.speedZ) + 19) % 38) + 38) % 38 - 19;
        const groundY = S06_TERRAIN(cl.xBase, zWrap);
        const centerClear = 0.48 + 0.52 * Math.min(1, Math.abs(zWrap) / 6.0);
        const baseOp = cl.isSmoke ? 0.15 + 0.22 * dustBoost : 0.14 + 0.25 * dustBoost;
        return (
          <sprite
            key={`bd-${i}`}
            position={[cl.xBase, groundY + cl.yOff, zWrap]}
            scale={[cl.size * 1.4, cl.size * 0.9, cl.size]}
          >
            <spriteMaterial
              map={tex}
              color={cl.isSmoke ? '#39332e' : '#d5bf97'}
              transparent
              opacity={baseOp * centerClear}
              depthWrite={false}
            />
          </sprite>
        );
      })}
    </group>
  );
};

const C01S06: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // ---------------- 1. CHUYỂN ĐỘNG DẰN XÓC 147,000 LB CỦA ABRAMS QUA BÃI HÀO RÃNH ----------------
  const abramsX = abramsXAt(t);
  const abramsZ = 0;

  const hFR = S06_TERRAIN(abramsX + 2.75, 1.51);
  const hFL = S06_TERRAIN(abramsX + 2.75, -1.51);
  const hRR = S06_TERRAIN(abramsX - 2.75, 1.51);
  const hRL = S06_TERRAIN(abramsX - 2.75, -1.51);

  const frontH = 0.5 * (hFR + hFL);
  const rearH = 0.5 * (hRR + hRL);
  const rightH = 0.5 * (hFR + hRR);
  const leftH = 0.5 * (hFL + hRL);

  const slamImpact = bump(t, CUE.c01_s06_slam_ditch - 0.08, 0.72);
  const slamRebound = bump(t, CUE.c01_s06_slam_ditch + 0.52, 0.68);

  // Giữ biên độ sập độ cao thân vừa đủ mạnh (không lọt khỏi đáy khung hình!) kết hợp góc chúi/lắc lớn cực rõ
  const rawGroundY = 0.25 * (hFR + hFL + hRR + hRL);
  const abramsY = rawGroundY * 0.72 - 0.03 - 0.14 * slamImpact + 0.09 * slamRebound;

  const groundPitch = Math.atan2(frontH - rearH, 5.5);
  const groundRoll = Math.atan2(leftH - rightH, 3.02);

  const jitterPitch = 0.025 * Math.sin(t * 13.8) + 0.016 * Math.cos(t * 21.5);
  const jitterRoll = 0.028 * Math.sin(t * 11.4 + 1.1) + 0.016 * Math.cos(t * 18.9);

  const suspPitch = groundPitch * 0.72 - 0.115 * slamImpact + 0.09 * slamRebound + jitterPitch;
  const suspRoll = groundRoll * 0.85 + 0.075 * slamImpact - 0.055 * slamRebound + jitterRoll;

  const totalPitch = groundPitch + suspPitch;
  const totalRoll = groundRoll + suspRoll;

  // ---------------- 2. MỤC TIÊU ENEMY T-72 CƠ ĐỘNG TRÊN SỐNG ĐỒI XA ----------------
  const t72Pos = t72PosAt(t);
  const t72Next = t72PosAt(t + 0.05);
  const t72Heading = Math.atan2(-(t72Next[2] - t72Pos[2]), t72Next[0] - t72Pos[0]);
  const t72LockCenter: V3 = [t72Pos[0], t72Pos[1] + 1.28, t72Pos[2]];

  const turretYaw = Math.atan2(-(t72Pos[2] - abramsZ), t72Pos[0] - (abramsX + 0.08));
  const gunPitch = -totalPitch * 0.86 + 0.03 * slamImpact;
  const t72TurretWorldYaw = Math.atan2(-(abramsZ - t72Pos[2]), abramsX - t72Pos[0]);
  const t72TurretLocalYaw = t72TurretWorldYaw - t72Heading;

  // ---------------- 3. CAMERA POV ỔN ĐỊNH PHẲNG TUYỆT ĐỐI SÁT VAI PHẢI NÓC THÁP ----------------
  // Lùi nhẹ camera về vai phải tháp pháo (localCamX = -1.95, localCamZ = 1.44, camY = 3.16 phẳng tuyệt đối!)
  // để MỌI khung hình (kể cả lúc sập xuống đáy hào sâu nhất) đều thấy trọn hộp ngắm GPS, nòng pháo M256,
  // má giáp Chobham và mũi thân Abrams đang nhào lộn dữ dội bên dưới!
  const cosY = Math.cos(turretYaw);
  const sinY = Math.sin(turretYaw);
  const localCamX = -1.95;
  const localCamZ = 1.44;
  const camX = abramsX + 0.08 + localCamX * cosY + localCamZ * sinY;
  const camZ = abramsZ - localCamX * sinY + localCamZ * cosY;
  const camY = 3.16;
  const camPos: V3 = [camX, camY, camZ];

  const distToT72 = Math.hypot(t72LockCenter[0] - camX, t72LockCenter[2] - camZ);
  const camLook: V3 = [
    t72LockCenter[0],
    t72LockCenter[1] - distToT72 * 0.155,
    t72LockCenter[2],
  ];

  // Vị trí thực trong thế giới của cửa sổ quang học hộp GPS
  const gpsWorldPos = useMemo((): V3 => {
    const p = new THREE.Vector3(1.13, 1.25, 0.74);
    p.applyAxisAngle(new THREE.Vector3(0, 1, 0), turretYaw);
    p.add(new THREE.Vector3(0.08, 1.35 - 0.65, 0));
    p.applyEuler(new THREE.Euler(totalRoll, 0, totalPitch, 'XYZ'));
    p.add(new THREE.Vector3(abramsX, abramsY + 0.65, abramsZ));
    return [p.x, p.y, p.z];
  }, [abramsX, abramsY, abramsZ, turretYaw, totalRoll, totalPitch]);

  const thermalViewAmt =
    0.42 + 0.58 * prog(t, CUE.c01_s06_thermal_still - 0.5, CUE.c01_s06_thermal_still + 0.7, Easing.out(Easing.cubic));
  const lockAmt = prog(t, CUE.c01_s06_target_lock - 0.25, CUE.c01_s06_target_lock + 0.45, Easing.out(Easing.cubic));
  const lockPulse = bump(t, CUE.c01_s06_target_lock, 0.42);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
      <Stage
        {...LOOK_DESERT_GLARE.stage}
        width={W}
        height={H}
        shadowCenter={[abramsX + 24, 0, 0]}
        shadowArea={50}
        fog={[125, 420]}
      >
        <Cam pos={camPos} look={camLook} fov={33} roll={0} />

        {/* Địa hình sa mạc đầy rãnh hào ổ gà & sống đồi mục tiêu thoáng sạch */}
        <Terrain
          h={S06_TERRAIN}
          size={520}
          seg={280}
          center={[40, 0]}
          colors={LOOK_DESERT_GLARE.terrain}
          grainRepeat={58}
        />
        <Scatter
          kind="rock"
          count={140}
          area={[-68, -75, 95, 75]}
          h={S06_TERRAIN}
          seed={61}
          scale={[0.45, 1.2]}
          avoid={AVOID_S06}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />

        {/* Khối thép M1A2 Abrams 147,000 lb lao sập qua các rãnh hào ngay bên dưới camera */}
        <M1A2Abrams
          position={[abramsX, abramsY, abramsZ]}
          rotation={[groundRoll * 0.72, 0, groundPitch * 0.72]}
          hullPitch={suspPitch}
          hullRoll={suspRoll}
          turretYaw={turretYaw}
          gunPitch={gunPitch}
          citvYaw={0.14 * Math.sin(t * 0.9)}
          crowsYaw={0.38}
          travel={(t - 94.5) * 12.8}
          exhaustHeat={0.55}
          variant="m1a2"
          camo="desert"
        />

        {/* Bão bụi cát bung ngay mũi dải xích trước khi sập hào để thấy rõ trong khung hình POV */}
        <DustTrail
          t={t}
          from={94.5}
          to={108.2}
          rate={16}
          size={2.35}
          life={2.2}
          color="#dac49b"
          path={(sec) => {
            const x = abramsXAt(sec) + 3.25;
            return [x, S06_TERRAIN(x, 1.95), 2.05];
          }}
        />
        <DustTrail
          t={t}
          from={94.5}
          to={108.2}
          rate={16}
          size={2.35}
          life={2.2}
          color="#dac49b"
          path={(sec) => {
            const x = abramsXAt(sec) + 3.25;
            return [x, S06_TERRAIN(x, -1.95), -2.05];
          }}
        />

        {/* Mục tiêu xe tăng địch EnemyT72 rõ nét trên sống đồi + chữ ký nhiệt FLIR */}
        <group>
          <EnemyT72
            position={t72Pos}
            rotation={[0, t72Heading, 0]}
            turretYaw={t72TurretLocalYaw}
            gunPitch={-0.02}
            travel={(t - 94.5) * 3.8}
          />
          <DustTrail
            t={t}
            from={94.5}
            to={108.2}
            rate={8}
            size={2.1}
            life={2.6}
            color="#cbb388"
            path={(sec) => {
              const p = t72PosAt(sec);
              return [p[0] - 2.3, p[1], p[2] - 1.5];
            }}
          />
          {thermalViewAmt > 0.4 && (
            <group position={[t72Pos[0], t72Pos[1] + 1.15, t72Pos[2]]} rotation={[0, t72Heading, 0]}>
              <pointLight color={PAL.amber} intensity={18 * thermalViewAmt} distance={14} decay={1.6} position={[0, 1.2, 0]} />
              <mesh position={[-1.3, 0.22, 0]} geometry={rbox(3.1, 0.95, 2.8, 0.18)}>
                <meshBasicMaterial
                  color={PAL.amberHot}
                  transparent
                  opacity={0.24 * thermalViewAmt}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          )}
        </group>

        {/* Tia ngắm quang học ổn định từ hộp GPS & khung khoá mục tiêu FLIR Amber ghim chết trên T-72 */}
        <AmberSightBeam from={gpsWorldPos} to={t72LockCenter} strength={thermalViewAmt} />
        <ThermalLockReticle3D
          pos={t72LockCenter}
          camPos={camPos}
          lockAmt={lockAmt}
          pulse={lockPulse}
        />

        {/* Khói dầu đen tạt gió & bụi cát sa mạc thổi ngang chiến trường */}
        <BattlefieldSmokeAndDust t={t} />
      </Stage>

      <Label
        t={t}
        text="147,000 LBS"
        x={W * 0.2}
        y={H * 0.15}
        from={CUE.c01_s06_147k_lbs}
        until={100.2}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C01S06;
