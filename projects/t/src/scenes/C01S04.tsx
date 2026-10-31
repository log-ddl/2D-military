// Cảnh C01S04 (16.36–21.28 s): Góc 4 — Dynamic Banked FPV Chase-Cam.
// Góc máy bám sát đuôi-sườn chiếc FPVDrone cảm tử (~1.42 m) có nghiêng cánh roll, bổ nhào chéo từ bầu trời (~17.5 m) xuống sát
// chiếc MBT 10 triệu USD đang khựng lại bốc khói lửa âm ỉ bên dưới; thấy rõ đường chân trời nghiêng roll, đầu đạn PG-7VL
// chĩa thẳng vào mục tiêu và bật HUDLabel ~$500 tại c01_cost_500 (18.38 s).
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { Explosion } from '@skill/military/3d/fx';
import { extrudeTop, lathe } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { HUDLabel, STAGE_BATTLE, TERRAIN_STEPPE, THEME } from '../design';
import { FPVDrone } from '../parts/FPVDrone';
import { MBT } from '../parts/MBT';

// -------------------- ĐỊA HÌNH CHIẾN TRƯỜNG THẢO NGUYÊN BỔ NHÀO (TẤT ĐỊNH CẤP MODULE) --------------------
const DIVE_TERRAIN = heightField({
  seed: 47,
  amp: 2.2,
  scale: 82,
  oct: 4,
  flats: [
    // Gò đất thảo nguyên phẳng nhẹ (y = 1.6 m) nơi chiếc MBT khựng lại để nhận màu đất khô sáng tự nhiên của Terrain
    [0, 0, 12.0, 1.6],
    [-3.5, 8.5, 8.5, 1.4],
  ],
  add: (x, z) => {
    // Dãy đồi thảo nguyên xa vừa phải ở chân trời (-Z) để mở rộng bầu trời hoàng hôn (~28% đỉnh khung) tôn góc nghiêng roll
    const horizonRidge =
      11.5 * Math.exp(-(((z + 145) / 36) ** 2)) +
      8.5 * Math.exp(-(((x - 52) / 30) ** 2) - (((z + 108) / 28) ** 2)) +
      9.5 * Math.exp(-(((x + 58) / 32) ** 2) - (((z + 112) / 30) ** 2));
    return horizonRidge;
  },
});

const avoidClearing = (x: number, z: number) => {
  if (Math.hypot(x, z) < 12.5) return true;
  if (x > -18 && x < 6 && z > -4 && z < 44) return true;
  return false;
};

const avoidTrees = (x: number, z: number) => Math.hypot(x, z) < 38 || (z > -16 && x > -26 && x < 20);

// -------------------- HÌNH HỌC VỆT XÍCH CÀY ĐẤT VÁT MƯỢT TỰ NHIÊN & NGỌN LỬA ĐỘNG CƠ --------------------
const MAT_RUT_MUD = plain('#2c261e', 0.96, 0.02);
const MAT_RUT_DUST = plain('#63563e', 0.95, 0.02);

// Vệt xích thuôn nhọn dần về phía đuôi (-X) nên hoàn toàn tự nhiên trên mặt thảo nguyên, không có mép chữ nhật giả
const GEO_TAPERED_RUT = extrudeTop(
  [
    [-12.5, -0.10],
    [-9.5, -0.26],
    [-3.0, -0.34],
    [1.8, -0.32],
    [2.4, 0.0],
    [1.8, 0.32],
    [-3.0, 0.34],
    [-9.5, 0.26],
    [-12.5, 0.10],
  ],
  0.035,
  0.012,
);

const GEO_TAPERED_DUST = extrudeTop(
  [
    [-13.2, -0.18],
    [-8.5, -0.52],
    [-2.5, -0.62],
    [2.2, -0.54],
    [3.0, 0.0],
    [2.2, 0.54],
    [-2.5, 0.62],
    [-8.5, 0.52],
    [-13.2, 0.18],
  ],
  0.018,
  0.008,
);

const GEO_FLAME_TONGUE = lathe(
  [
    [0.001, 0.0],
    [0.20, 0.14],
    [0.24, 0.32],
    [0.18, 0.56],
    [0.09, 0.82],
    [0.001, 1.05],
  ],
  20,
);

// Hướng đỗ của chiếc MBT cháy hỏng trên gò thảo nguyên y = 1.6 m
const TANK_Y = DIVE_TERRAIN(0, 0);
const TANK_YAW = 0.62;
const COS_Y = Math.cos(TANK_YAW);
const SIN_Y = Math.sin(TANK_YAW);
const tankLocalToWorld = (lx: number, ly: number, lz: number): V3 => [
  lx * COS_Y + lz * SIN_Y,
  TANK_Y + ly,
  -lx * SIN_Y + lz * COS_Y,
];

const ENGINE_FIRE_POS = tankLocalToWorld(-2.85, 1.48, 0.12);
const ENGINE_SMOKE_POS_1 = tankLocalToWorld(-3.35, 1.46, 0.25);
const ENGINE_SMOKE_POS_2 = tankLocalToWorld(-3.65, 1.40, -0.28);
const TURRET_AIM_POS = tankLocalToWorld(-0.1, 2.05, 0.0);

// -------------------- QUỸ ĐẠO BỔ NHÀO CONG CỦA FPV DRONE (CAO ~18.5 M -> SÁT NÓC ~6.0 M, CÁCH NÓC ~2.0 M) --------------------
const SCENE_DUR = CUE.c01_weight_law - CUE.c01_fpv_enter;

const dronePosAt = (sec: number): V3 => {
  const tau = Math.max(0, Math.min(1.0, (sec - CUE.c01_fpv_enter) / SCENE_DUR));
  const paradoxBoost = prog(sec, CUE.c01_paradox, CUE.c01_weight_law);
  const u = Math.min(0.995, 0.74 * tau + 0.255 * paradoxBoost);

  const arcX = 2.5 * Math.sin(u * Math.PI * 1.05);
  const x = lerp(-12.2, -1.75, u) + arcX * (1 - u * 0.55);
  const y = TANK_Y + lerp(16.8, 4.35, u) + 0.75 * Math.sin(u * Math.PI) - 0.35 * paradoxBoost;
  const z = lerp(35.0, 4.95, u);
  return [x, y, z];
};

const sub3 = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const addScaled3 = (a: V3, b: V3, s: number): V3 => [a[0] + b[0] * s, a[1] + b[1] * s, a[2] + b[2] * s];
const lerp3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];
const norm3 = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};
const cross3 = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

const C01S04: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  const dt = t - CUE.c01_fpv_enter;
  const pDive = prog(t, CUE.c01_fpv_dive, CUE.c01_weight_law);
  const pParadox = prog(t, CUE.c01_paradox, CUE.c01_weight_law);

  const dronePos = dronePosAt(t);
  const pPrev = dronePosAt(t - 0.04);
  const pNext = dronePosAt(t + 0.04);
  const tangent = norm3(sub3(pNext, pPrev));
  const toTank = norm3(sub3(TURRET_AIM_POS, dronePos));

  // Pha trộn tiếp tuyến bay với hướng ngắm mục tiêu để đầu đạn PG-7VL luôn chĩa sắc bén vào tháp pháo MBT
  const aimDir = norm3(lerp3(tangent, toTank, 0.75));
  const rightVec = norm3(cross3(aimDir, [0, 1, 0]));
  const upPerp = norm3(cross3(rightVec, aimDir));

  // Góc nghiêng cánh roll (~0.22 * sin) nghiêng đường chân trời sống động đúng chất camera hành trình bám đuôi FPV cảm tử
  const camRoll = 0.22 * Math.sin(dt * 1.35 + 0.45) + 0.06 * pParadox;

  const droneYaw = Math.atan2(-aimDir[2], aimDir[0]);
  const aimPitch = Math.atan2(aimDir[1], Math.hypot(aimDir[0], aimDir[2]));
  const dronePitch = aimPitch - 0.19 - 0.14 * pParadox;
  const droneBank = -camRoll * 1.32;

  // Đặt Chase-Cam cách drone ~1.43 m ở góc 3/4 sau-trái và hơi thấp hơn trục drone (upOffset = -0.18):
  // - upOffset âm giữ chiếc FPVDrone luôn nổi bật ở vùng trung tâm-phải phía trên (~60% W, ~40% H), KHÔNG bị trôi tụt xuống góc dưới!
  // - Góc sườn 25° + thấp nhẹ giúp thấy cực rõ cả 4 cánh quạt, pin LiPo xanh, ăng-ten đỏ bên trên lẫn toàn bộ bầu đạn PG-7VL dưới bụng!
  const backDist = lerp(1.30, 1.24, pParadox);
  const sideOffset = -0.52;
  const upOffset = -0.18;

  let camPos: V3 = addScaled3(dronePos, aimDir, -backDist);
  camPos = addScaled3(camPos, rightVec, sideOffset);
  camPos = addScaled3(camPos, upPerp, upOffset);

  const lookDist = lerp(16.0, 7.2, pParadox);
  let camLook: V3 = addScaled3(dronePos, toTank, lookDist);
  camLook = addScaled3(camLook, rightVec, lerp(-0.22, -0.58, pParadox));
  camLook = addScaled3(camLook, upPerp, lerp(1.15, 0.36, pParadox));

  const camFov = lerp(50, 53, pDive);

  const flkA = 0.82 + 0.18 * Math.sin(t * 18.5) * Math.cos(t * 11.3);
  const flkB = 0.78 + 0.22 * Math.cos(t * 15.1 + 1.1);

  return (
    <AbsoluteFill>
      <Stage width={W} height={H} {...STAGE_BATTLE} shadowCenter={[-2, 4, 8]} shadowArea={36}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Địa hình thảo nguyên chiến trường rộng có dãy đồi chân trời xa */}
        <Terrain h={DIVE_TERRAIN} size={440} seg={224} center={[0, -32]} colors={TERRAIN_STEPPE} grainRepeat={52} />
        <Scatter kind="rock" count={80} area={[-75, -110, 75, 40]} h={DIVE_TERRAIN} seed={53} scale={[0.5, 1.4]} avoid={avoidClearing} tint="#b5ada0" />
        <Scatter kind="bush" count={95} area={[-80, -115, 80, 42]} h={DIVE_TERRAIN} seed={67} scale={[0.6, 1.35]} avoid={avoidClearing} tint="#b7a274" />
        <Scatter kind="pine" count={58} area={[-110, -135, 110, 20]} h={DIVE_TERRAIN} seed={79} scale={[0.95, 1.55]} avoid={avoidTrees} tint="#8fa18c" />

        {/* ==================== MẶT ĐẤT: VỆT XÍCH CÀY ĐẤT VÁT TỰ NHIÊN & CHIẾC MBT $10M BỐC LỬA ÂM Ỉ ==================== */}
        <group position={[0, TANK_Y, 0]} rotation={[0, TANK_YAW, 0]}>
          {([-1.48, 1.48] as const).map((zt, idx) => (
            <group key={`rut-${idx}`} position={[0, 0.004, zt]}>
              <mesh geometry={GEO_TAPERED_DUST} material={MAT_RUT_DUST} receiveShadow />
              <mesh position={[0, 0.008, 0]} geometry={GEO_TAPERED_RUT} material={MAT_RUT_MUD} receiveShadow />
            </group>
          ))}
        </group>

        {/* Chiếc MBT 60 tấn cháy xém khựng lại dưới đường ngắm bổ nhào của FPV drone */}
        <MBT
          position={[0, TANK_Y, 0]}
          rotation={[0, TANK_YAW, 0]}
          charred={0.75}
          turretYaw={0.45}
          gunPitch={-0.07}
        />

        {/* Ngọn lửa cháy mượt từ vỉ thoát nhiệt khoang động cơ & cột khói âm ỉ bay sau đuôi */}
        <group position={ENGINE_FIRE_POS}>
          <pointLight color="#ff8030" intensity={26 * flkA} distance={15} decay={1.6} position={[0.4, 1.2, 0]} />
          {[
            { pos: [0, 0.02, 0] as V3, rot: [0.08, 0.2, Math.PI / 2 - 0.12] as V3, s: [0.95 * flkA, 1.05 * flkB, 0.95 * flkB] as V3 },
            { pos: [-0.22, 0.02, 0.18] as V3, rot: [-0.1, 0.9, Math.PI / 2 - 0.18] as V3, s: [0.72 * flkB, 0.82 * flkA, 0.72 * flkA] as V3 },
            { pos: [0.16, 0.02, -0.14] as V3, rot: [0.12, -0.5, Math.PI / 2 - 0.08] as V3, s: [0.64 * flkA, 0.74 * flkB, 0.64 * flkB] as V3 },
          ].map((fl, fi) => (
            <group key={`fl-${fi}`} position={fl.pos} rotation={fl.rot} scale={fl.s}>
              <mesh geometry={GEO_FLAME_TONGUE}>
                <meshBasicMaterial color="#ff5408" transparent opacity={0.78} toneMapped={false} depthWrite={false} />
              </mesh>
              <mesh geometry={GEO_FLAME_TONGUE} scale={[0.62, 0.56, 0.62]}>
                <meshBasicMaterial color="#ffd878" transparent opacity={0.92} toneMapped={false} depthWrite={false} />
              </mesh>
            </group>
          ))}
        </group>

        <Explosion
          t={t}
          at={CUE.c01_fpv_enter - 2.4}
          pos={ENGINE_SMOKE_POS_1}
          size={0.9}
          smokeLife={11}
          smoke="#34302c"
          seed={13}
        />
        <Explosion
          t={t}
          at={CUE.c01_fpv_enter - 1.1}
          pos={ENGINE_SMOKE_POS_2}
          size={0.76}
          smokeLife={10}
          smoke="#433d38"
          seed={29}
        />

        {/* ==================== TIỀN CẢNH: CHIẾC FPV DRONE MANG ĐẦU ĐẠN PG-7VL BỔ NHÀO ==================== */}
        <group position={dronePos} rotation={[0, droneYaw, 0]}>
          <group rotation={[0, 0, dronePitch]}>
            <group rotation={[droneBank, 0, 0]}>
              {/* Đèn fill ấm đặt từ dưới-sườn trái hắt thẳng vào bầu đạn xanh PG-7VL, đai vàng & ngòi bạc để tách nổi hoàn toàn khỏi nền cỏ */}
              <pointLight position={[0.12, -0.22, -0.58]} color="#ffdfa8" intensity={3.2} distance={2.5} decay={1.7} />
              <pointLight position={[-0.28, 0.24, -0.45]} color="#e8f0ff" intensity={1.4} distance={2.2} decay={1.8} />
              <FPVDrone spin={(t - CUE.c01_fpv_enter) * 65} armed />
            </group>
          </group>
        </group>
      </Stage>

      {/* Nhãn đối lập chi phí bật tại đúng CUE.c01_cost_500 (18.38 s) ở góc trái-dưới thoáng sạch */}
      <HUDLabel
        t={t}
        from={CUE.c01_cost_500}
        text="~$500 FPV DRONE"
        sub="ĐẦU ĐẠN CHỐNG TĂNG vs XE TĂNG $10M"
        accent={THEME.amberGold}
        x={W * 0.27}
        y={H - SAFE * 2.1}
      />
    </AbsoluteFill>
  );
};

export default C01S04;
