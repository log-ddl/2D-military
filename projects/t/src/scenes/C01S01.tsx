// Cảnh C01S01 (0.00–4.22 s, mở màn fade):
// Góc 1 — Hero Low-Angle Ground-Level Dolly-Arc (cao ~0.70–0.76 m sát mặt đất ngước lên):
// Xe tăng chủ lực MBT 60 tấn nghiền xích dọc đường đất thảo nguyên hoàng hôn, dằn nặng qua mô đất đúng mốc 60 tấn (1.72 s)
// và bật HUDLabel "60 TẤN · $10M" đúng mốc 10 triệu đô la (3.12 s).
import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage } from '@skill/military/3d/stage';
import { heightField, ridgeX, Scatter, Terrain } from '@skill/military/3d/terrain';
import { DustTrail } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { HUDLabel, STAGE_BATTLE, TERRAIN_STEPPE } from '../design';
import { MBT } from '../parts/MBT';

// Tốc độ hành tiến ~5.5 m/s dọc trục +X; tại t = CUE.c01_weight_60t (1.72 s) tâm xe vừa cán qua đỉnh mô đất x ≈ -0.15 m.
const TANK_SPEED = 5.5;
const TANK_X0 = -9.6;
const BERM_X = -0.15;
const SCENE_SPAN = 4.22;

const tankXAt = (sec: number) => TANK_X0 + (sec - CUE.c01_open) * TANK_SPEED;

// Mô đất ngang đường để xe 60 tấn nghiền qua đúng mốc 1.72 s
const bermProfile = ridgeX(BERM_X, 0.25, 1.75);

// Địa hình thảo nguyên Đông Âu liền mạch (không bậc thềm gắt): lòng đường đất có vệt xích lún, mô đất dằn xe, và đồi thảo nguyên xa.
const H_RAW = heightField({
  seed: 101,
  amp: 3.1,
  scale: 105,
  oct: 5,
  add: (x, z) => {
    const farHills =
      (z < -38 ? Math.min(16, ((z + 38) / 36) ** 2 * 7.2) : 0) +
      (x < -44 ? Math.min(10, ((x + 44) / 38) ** 2 * 4.5) : 0);
    return farHills;
  },
});

const H_S01 = (x: number, z: number): number => {
  const raw = H_RAW(x, z);
  const absZ = Math.abs(z);
  // Làm phẳng mượt lòng đường bằng hàm Gauss rộng (sigma ~ 9.5 m) để hoàn toàn không có vách cắt hai bên
  const roadBlend = Math.exp(-((absZ / 9.5) ** 2)) * 0.9;
  const trackRut = -0.055 * Math.exp(-(((absZ - 1.48) / 0.45) ** 2));
  const roadUndulation = 0.045 * Math.sin(x * 0.24) + trackRut;
  const mound = bermProfile(x, z) * Math.exp(-((absZ / 5.2) ** 2));
  return lerp(raw, roadUndulation, roadBlend) + mound;
};

// Chừa hành lang xe chạy |z| < 4.6 m và vùng ống kính camera sát đất phía sườn phải (+Z)
const avoidCorridor = (x: number, z: number) =>
  Math.abs(z) < 4.6 || (z > 1.2 && z < 6.8 && x > -6 && x < 30);

const avoidFarTrees = (x: number, z: number) => z > -46;

const C01S01: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  const tx = tankXAt(t);
  const travel = (t - CUE.c01_open + 2.0) * TANK_SPEED;

  // Bám độ cao và độ dốc thực của mặt đất dưới vệt xích trước / sau
  const hRear = (H_S01(tx - 2.55, -1.48) + H_S01(tx - 2.55, 1.48)) * 0.5;
  const hFront = (H_S01(tx + 2.55, -1.48) + H_S01(tx + 2.55, 1.48)) * 0.5;
  const hMid = (H_S01(tx, -1.48) + H_S01(tx, 1.48)) * 0.5;
  const terrainY = Math.max(hMid * 0.5 + (hRear + hFront) * 0.25, (hRear + hFront) * 0.5 - 0.025) - 0.02;
  const terrainPitch = Math.atan2(hFront - hRear, 5.1);

  // Cú nhún giảm xóc nặng nề 60 tấn đúng mốc CUE.c01_weight_60t (1.72 s) + nhịp hồi thanh xoắn
  const weightBump = bump(t, CUE.c01_weight_60t, 0.55);
  const rebound = bump(t, CUE.c01_weight_60t + 0.5, 0.42);
  const suspY = -weightBump * 0.14 + rebound * 0.036;
  const suspPitch = -weightBump * 0.056 + rebound * 0.018;

  const hullY = terrainY + suspY;
  const hullPitch = terrainPitch + suspPitch;

  // Pháo chính 120mm ổn định con quay 2 trục: thân xe dằn mạnh qua mô đất nhưng nòng pháo vẫn ghìm vững mục tiêu
  const stabilizedGunPitch = 0.036 - hullPitch * 0.82;

  // Quỹ đạo Dolly-Arc sát đất: máy cao ~0.76 -> 0.70 m, lệch sườn phải z = 3.42 -> 2.76 m phía trước mũi xe,
  // giữ trọn đầu nòng 120mm trong khung và chừa sạch góc dưới-trái mặt đường cho HUDLabel.
  const camP = prog(t, CUE.c01_open, CUE.c01_open + SCENE_SPAN, Easing.bezier(0.32, 0.0, 0.25, 1));
  const camRelX = lerp(11.3, 8.95, camP);
  const camZ = lerp(3.42, 2.76, camP);
  const camX = tx + camRelX;
  const camGround = H_S01(camX, camZ);

  // Rung chấn mặt đất khi khối thép 60 tấn dằn xuống mô đất + rung động cơ trầm khi xe tiến sát
  const engineTremor = (0.004 + 0.006 * camP) * Math.sin(t * 42.0);
  const impactShakeY = weightBump * Math.sin((t - CUE.c01_weight_60t) * 35.0) * 0.058;
  const impactShakeZ = weightBump * Math.cos((t - CUE.c01_weight_60t) * 28.0) * 0.034;

  const camPos: [number, number, number] = [
    camX,
    camGround + lerp(0.76, 0.70, camP) + engineTremor + impactShakeY,
    camZ + impactShakeZ,
  ];

  // Ngước nhìn lên khối giáp mũi và nòng pháo 120mm; hướng nhẹ sang -Z để thân xe nằm cân đối phải-trên,
  // chừa khoảng đường đất trống hoàn toàn ở góc dưới-trái cho HUDLabel.
  const camLook: [number, number, number] = [
    tx + lerp(0.85, 1.25, camP),
    hullY + lerp(1.50, 1.56, camP) + impactShakeY * 0.4,
    lerp(-0.08, -0.22, camP),
  ];

  return (
    <AbsoluteFill>
      <Stage width={W} height={H} {...STAGE_BATTLE} shadowCenter={[tx + 2, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={38} roll={-0.016 * (1 - camP * 0.4) + impactShakeZ * 0.25} />

        {/* Ánh sáng hắt ấm nhẹ từ mặt đất thảo nguyên hoàng hôn giúp nổi rõ chi tiết xích dự phòng & móc kéo trước mũi */}
        <directionalLight position={[22, 7, 14]} intensity={0.52} color="#ffd6a6" />

        <Terrain h={H_S01} size={400} seg={224} center={[10, -14]} colors={TERRAIN_STEPPE} grainRepeat={46} />

        {/* Đá tảng & bụi cỏ khô thảo nguyên hai bên hành lang đường đất */}
        <Scatter
          kind="rock"
          count={80}
          area={[-55, -65, 60, 42]}
          h={H_S01}
          seed={14}
          scale={[0.35, 1.15]}
          avoid={avoidCorridor}
          tint="#8e8477"
        />
        <Scatter
          kind="bush"
          count={105}
          area={[-60, -70, 65, 42]}
          h={H_S01}
          seed={27}
          scale={[0.5, 1.2]}
          avoid={avoidCorridor}
          tint="#a69568"
        />
        <Scatter
          kind="pine"
          count={26}
          area={[-95, -125, 85, -48]}
          h={H_S01}
          seed={53}
          scale={[0.75, 1.3]}
          avoid={avoidFarTrees}
          tint="#636b58"
        />

        {/* Xe tăng chủ lực MBT 60 tấn lăn xích nghiền qua mô đất */}
        <MBT
          position={[tx, hullY, 0]}
          rotation={[0, 0, hullPitch]}
          travel={travel}
          turretYaw={0.04}
          gunPitch={stabilizedGunPitch}
        />

        {/* Hai luồng bụi xích cuộn đặc sau đuôi xe (sinh trước từ -1.8 s để khung đầu tiên đã dày bụi chiến trường) */}
        <DustTrail
          t={t}
          from={CUE.c01_open - 1.8}
          to={CUE.c01_open + SCENE_SPAN + 0.5}
          path={(sec) => {
            const bx = tankXAt(sec) - 3.35;
            return [bx, H_S01(bx, -1.5), -1.5];
          }}
          rate={11}
          size={2.35}
          color="#bfa985"
          life={2.8}
        />
        <DustTrail
          t={t}
          from={CUE.c01_open - 1.8}
          to={CUE.c01_open + SCENE_SPAN + 0.5}
          path={(sec) => {
            const bx = tankXAt(sec) - 3.35;
            return [bx, H_S01(bx, 1.5), 1.5];
          }}
          rate={11}
          size={2.45}
          color="#c7b28e"
          life={2.8}
        />

        {/* Bụi đất phụt dưới bánh dẫn hướng trước khi khối thép 60 tấn dằn qua mô đất lúc 1.72 s */}
        <DustTrail
          t={t}
          from={CUE.c01_weight_60t - 0.06}
          to={CUE.c01_weight_60t + 0.48}
          path={(sec) => {
            const fx = tankXAt(sec) + 2.75;
            return [fx, H_S01(fx, 1.52), 1.55];
          }}
          rate={20}
          size={1.75}
          color="#d1bc96"
          life={1.5}
        />
      </Stage>

      <HUDLabel
        t={t}
        from={CUE.c01_cost_10m}
        text="60 TẤN · $10M"
        sub="XE TĂNG CHỦ LỰC HIỆN ĐẠI"
        x={W * 0.21}
        y={H - SAFE * 2.0}
      />
    </AbsoluteFill>
  );
};

export default C01S01;
