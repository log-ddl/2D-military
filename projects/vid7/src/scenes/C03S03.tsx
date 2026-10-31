import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { JapaneseFighter } from '../parts/JapaneseFighter';
import { TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';

// Tích phân mượt C2 của smoothstep(t, a, b)
function smoothRamp(t: number, a: number, b: number): number {
  if (t <= a) return 0;
  const w = b - a;
  if (t >= b) return 0.5 * w + (t - b);
  const x = (t - a) / w;
  return w * (x * x * x - 0.5 * x * x * x * x);
}

// Địa hình ngoại ô Tokyo: hành lang phố phẳng y = 0 ở |z| < 110 m, đồi thông thoai thoải phía xa
const SUBURB_H = heightField({
  seed: 303,
  amp: 2.2,
  scale: 150,
  flats: [
    [-140, 0, 175, 0],
    [40, 0, 185, 0],
    [220, 0, 175, 0],
  ],
  add: (x, z) => {
    const az = Math.abs(z);
    const sideHill = az > 118 ? Math.min(22, Math.pow((az - 118) / 48, 1.45) * 9.5) : 0;
    const farHill = x > 285 ? Math.min(26, Math.pow((x - 285) / 70, 1.4) * 11) : 0;
    return sideHill + farHill;
  },
});

const AVOID_STREETS_AND_HOUSES = (x: number, z: number): boolean => {
  const az = Math.abs(z);
  if (az < 12.2) return true;
  const inRow1 = az > 13.5 && az < 34.5;
  const inRow2 = az > 47.5 && az < 69.5;
  if ((inRow1 || inRow2) && Math.abs(((x + 440) % 44) - 22) > 4.4) return true;
  return false;
};

// Danh sách các ô phố nhà gỗ ngoại ô Tokyo trải dọc hành lang bay
const SUBURB_BLOCKS: { x: number; z: number; variant: number }[] = (() => {
  const out: { x: number; z: number; variant: number }[] = [];
  const xs = [-220, -176, -132, -88, -44, 0, 44, 88, 132, 176, 220, 264];
  const zs = [-58, -24, 24, 58];
  xs.forEach((x, ix) => {
    zs.forEach((z, iz) => {
      out.push({ x, z, variant: (ix * 3 + iz) % 3 });
    });
  });
  return out;
})();

const POLE_XS = [-198, -154, -110, -66, -22, 22, 66, 110, 154, 198, 242];

// Dân thường & đội viên phòng không Tokyo đứng dọc đại lộ nắng trưa ngước nhìn và vẫy tay (x = -62..+26 m, z = 3.8..7.6 m)
type CivilianSpec = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  shirt: string;
  pants: string;
  hat?: string;
  phase: number;
  bothArms?: boolean;
};

const CIVILIANS: CivilianSpec[] = [
  { x: -58, y: 0.06, z: 5.4, yaw: -2.4, shirt: '#e6dfd0', pants: '#2c333f', hat: '#4d5440', phase: 0.3, bothArms: true },
  { x: -46, y: 0.06, z: 6.8, yaw: -2.3, shirt: '#5e6e82', pants: '#282d36', phase: 1.2 },
  { x: -34, y: 0.06, z: 4.9, yaw: -2.5, shirt: '#efe9dc', pants: '#3a312c', phase: 2.0, bothArms: true },
  { x: -22, y: 0.06, z: 6.2, yaw: -2.35, shirt: '#6e664e', pants: '#34382b', hat: '#4a513b', phase: 0.8, bothArms: true },
  { x: -12, y: 0.06, z: 5.1, yaw: -2.45, shirt: '#964c40', pants: '#2d313a', phase: 2.7, bothArms: true },
  { x: -2, y: 0.06, z: 6.4, yaw: -2.3, shirt: '#e5decb', pants: '#2a323e', phase: 1.5, bothArms: true },
  { x: 7, y: 0.06, z: 4.9, yaw: -2.5, shirt: '#576650', pants: '#2a2f28', hat: '#424938', phase: 3.1, bothArms: true },
  { x: 14.5, y: 0.06, z: 6.0, yaw: -2.4, shirt: '#efe8da', pants: '#323640', phase: 0.6, bothArms: true },
  { x: 17.2, y: 0.06, z: 4.7, yaw: -2.55, shirt: '#4d5f75', pants: '#262b33', phase: 2.2, bothArms: true },
  { x: 19.6, y: 0.06, z: 6.4, yaw: -2.3, shirt: '#d9ceb8', pants: '#34302c', hat: '#525842', phase: 1.8, bothArms: true },
  { x: 21.4, y: 0.06, z: 5.2, yaw: -2.45, shirt: '#9c483d', pants: '#2c3038', phase: 0.9, bothArms: true },
  { x: 27.5, y: 0.06, z: 5.8, yaw: -2.4, shirt: '#dfd7c5', pants: '#2f343e', phase: 1.4, bothArms: true },
];

// Đội hình 9 tiêm kích Nhật chia 3 biên đội chữ V (3 × 3 = 9 chiếc) rõ nét, không chồng lấp trên nền trời xanh
type FighterSlot = {
  dx: number;
  dy: number;
  dz: number;
  scheme: 'grey' | 'green';
  seed: number;
};

const NINE_FIGHTERS: FighterSlot[] = [
  // Tốp chữ V số 1 (dẫn đầu bên trái-dưới đội hình, A6M2 sơn xám sáng)
  { dx: 0, dy: 0, dz: -11.5, scheme: 'grey', seed: 11 },
  { dx: 9.2, dy: 0.9, dz: -19.5, scheme: 'grey', seed: 11 },
  { dx: 9.2, dy: 0.9, dz: -3.5, scheme: 'grey', seed: 11 },

  // Tốp chữ V số 2 (bên phải đội hình, Ki-43 sơn xanh lục quân)
  { dx: 22.0, dy: 3.8, dz: 11.5, scheme: 'green', seed: 21 },
  { dx: 31.2, dy: 4.7, dz: 3.5, scheme: 'green', seed: 21 },
  { dx: 31.2, dy: 4.7, dz: 19.5, scheme: 'green', seed: 21 },

  // Tốp chữ V số 3 (khóa đuôi tầm cao ở giữa đội hình, A6M2 sơn xám sáng)
  { dx: 44.0, dy: 7.6, dz: -0.5, scheme: 'grey', seed: 11 },
  { dx: 53.2, dy: 8.5, dz: -8.5, scheme: 'grey', seed: 11 },
  { dx: 53.2, dy: 8.5, dz: 7.5, scheme: 'grey', seed: 11 },
];

const WavingCivilian: React.FC<{ spec: CivilianSpec; t: number }> = ({ spec, t }) => {
  const wave = Math.sin(t * 7.4 + spec.phase) * 0.45;
  const wave2 = Math.sin(t * 6.9 + spec.phase + 1.1) * 0.42;
  return (
    <group position={[spec.x, spec.y, spec.z]} rotation={[0, spec.yaw, 0]} scale={1.08}>
      {/* Hai chân */}
      <mesh position={[0, 0.42, -0.09]} geometry={rbox(0.17, 0.84, 0.16, 0.03)} material={plain(spec.pants, 0.9)} castShadow />
      <mesh position={[0, 0.42, 0.09]} geometry={rbox(0.17, 0.84, 0.16, 0.03)} material={plain(spec.pants, 0.9)} castShadow />
      {/* Thân áo */}
      <mesh position={[0, 1.12, 0]} geometry={rbox(0.25, 0.62, 0.42, 0.05)} material={plain(spec.shirt, 0.85)} castShadow />
      {/* Đầu ngửa nhìn lên máy bay */}
      <group position={[0.03, 1.56, 0]} rotation={[0, 0, 0.38]}>
        <mesh material={plain('#dbb592', 0.78)} castShadow>
          <sphereGeometry args={[0.14, 12, 10]} />
        </mesh>
        {spec.hat ? (
          <mesh position={[-0.02, 0.08, 0]} material={plain(spec.hat, 0.82)}>
            <coneGeometry args={[0.19, 0.14, 12]} />
          </mesh>
        ) : (
          <mesh position={[-0.02, 0.05, 0]} material={plain('#1e1c1a', 0.88)}>
            <sphereGeometry args={[0.135, 10, 8]} />
          </mesh>
        )}
      </group>
      {/* Tay phải giơ cao vẫy khăn/tay */}
      <group position={[0.02, 1.36, 0.24]} rotation={[2.58 + wave, 0, 0.2]}>
        <mesh position={[0, 0.31, 0]} geometry={rbox(0.11, 0.64, 0.11, 0.03)} material={plain(spec.shirt, 0.85)} castShadow />
      </group>
      {/* Tay trái */}
      <group
        position={[0.02, 1.36, -0.24]}
        rotation={spec.bothArms ? [-2.54 - wave2, 0, 0.2] : [-0.45, 0, -0.15]}
      >
        <mesh position={[0, spec.bothArms ? 0.31 : -0.26, 0]} geometry={rbox(0.11, 0.6, 0.11, 0.03)} material={plain(spec.shirt, 0.85)} castShadow />
      </group>
    </group>
  );
};

const SuburbanStreets: React.FC = () => {
  const roadMat = useMemo(
    () =>
      paint({
        color: '#736e64',
        camo: ['#656057', '#827c71'],
        repeat: 0.35,
        wear: 0.22,
        dirt: 0.32,
        roughness: 0.94,
        metalness: 0.04,
        seed: 71,
      }),
    [],
  );
  const sidewalkMat = plain('#989082', 0.92, 0.03);
  const poleWoodMat = plain('#54402f', 0.88, 0.05);
  const wireMat = plain('#232629', 0.7, 0.35);

  const wireGeos = useMemo(() => {
    const out = [];
    for (const side of [-1, 1] as const) {
      const zPole = side * 10.6;
      for (let i = 0; i < POLE_XS.length - 1; i++) {
        const x0 = POLE_XS[i];
        const x1 = POLE_XS[i + 1];
        const xm = (x0 + x1) * 0.5;
        out.push(
          pipe(
            [
              [x0, 7.65, zPole - 0.32],
              [xm, 7.15, zPole - 0.32],
              [x1, 7.65, zPole - 0.32],
            ],
            0.022,
            14,
          ),
        );
        out.push(
          pipe(
            [
              [x0, 7.65, zPole + 0.32],
              [xm, 7.15, zPole + 0.32],
              [x1, 7.65, zPole + 0.32],
            ],
            0.022,
            14,
          ),
        );
      }
    }
    return out;
  }, []);

  return (
    <group>
      {/* Đại lộ chính dưới trục bay Doolittle */}
      <mesh position={[20, 0.03, 0]} geometry={rbox(560, 0.06, 18.0, 0.02)} material={roadMat} receiveShadow />
      {/* Vỉa hè hai bên đại lộ */}
      <mesh position={[20, 0.06, 11.0]} geometry={rbox(560, 0.12, 4.0, 0.02)} material={sidewalkMat} receiveShadow />
      <mesh position={[20, 0.06, -11.0]} geometry={rbox(560, 0.12, 4.0, 0.02)} material={sidewalkMat} receiveShadow />
      {/* Hai đường phố song song phía trong */}
      <mesh position={[20, 0.03, 41]} geometry={rbox(560, 0.06, 10.5, 0.02)} material={roadMat} receiveShadow />
      <mesh position={[20, 0.03, -41]} geometry={rbox(560, 0.06, 10.5, 0.02)} material={roadMat} receiveShadow />
      {/* Các ngõ ngang chia ô phố */}
      {POLE_XS.map((cx) => (
        <mesh key={`cross-${cx}`} position={[cx, 0.025, 0]} geometry={rbox(7.8, 0.05, 165, 0.02)} material={roadMat} receiveShadow />
      ))}

      {/* Hàng cột điện gỗ truyền thống dọc sát mép vỉa hè ngoài (z = ±10.6 m) */}
      {POLE_XS.map((px) =>
        ([-1, 1] as const).map((side) => (
          <group key={`pole-${px}-${side}`} position={[px, 0, side * 10.6]}>
            <mesh position={[0, 4.05, 0]} material={poleWoodMat} castShadow>
              <cylinderGeometry args={[0.11, 0.16, 8.1, 10]} />
            </mesh>
            <mesh position={[0, 7.55, 0]} geometry={rbox(0.14, 0.14, 1.1, 0.02)} material={poleWoodMat} castShadow />
            <mesh position={[0, 6.85, 0]} geometry={rbox(0.12, 0.12, 0.9, 0.02)} material={poleWoodMat} />
          </group>
        )),
      )}
      {wireGeos.map((g, idx) => (
        <mesh key={`wire-${idx}`} geometry={g} material={wireMat} />
      ))}
    </group>
  );
};

const C03S03: React.FC = () => {
  const t = useT();

  // Quỹ đạo chiếc B-25 #1 của Jimmy Doolittle dọc đại lộ ngoại ô Tokyo (+X)
  const dt = t - 421.34;
  const b25X = -165 + 15.0 * dt - 12.6 * smoothRamp(t, 434.0, 438.2);

  // Độ cao: bay tầm mái nhà y = 13.5 m, từ Suddenly (433.36 s) ghìm sát rạp xuống y = 10.8 m
  const dropP = prog(t, CUE.c03_s03_suddenly_cole, CUE.c03_s03_hugs_rooftops);
  const b25Y = lerp(13.5, 10.8, dropP) + Math.sin(t * 2.1) * 0.07;
  const b25Z = Math.sin(t * 0.65) * 0.25;

  // Chúi mũi nhẹ khi bắt đầu ép độ cao xuống sát mái ngói (433.36..437.4 s) rồi giữ bằng phẳng sát mái nhà
  const pushDown = Math.sin(prog(t, CUE.c03_s03_suddenly_cole, CUE.c03_s03_nine_fighters_shout - 0.15, Easing.inOut(Easing.quad)) * Math.PI);
  const b25Pitch = -0.055 * pushDown + 0.01;
  const b25Roll = Math.sin(t * 0.9) * 0.02 - 0.02 * pushDown;

  // Đội hình 9 tiêm kích Nhật ở độ cao y ≈ 55–64 m bay ngược chiều (-X, xiên nhẹ +Z) lướt thẳng qua trên đầu
  const fDt = t - CUE.c03_s03_nine_fighters_shout;
  const fighterLeadX = 183.0 - fDt * 3.85;
  const fighterLeadZ = -31.5 + fDt * 1.45;
  const fighterBaseY = 55.0;
  const fighterYaw = Math.atan2(-1.45, -3.85); // Hướng mũi ngược chiều (-X, hơi chéo +Z) khớp đúng vector bay

  // Chuyển đổi góc máy 3 nhịp:
  // Nhịp 1A (421.34–427.6 s): Lướt ngang tầm mái ngói ngoại ô nắng trưa (y = 9.4 m) nhìn B-25 gầm rú
  // Nhịp 1B (427.6–433.36 s): Hạ xuống lòng phố thông thoáng ngay sau nhóm dân thường đang ngước nhìn vẫy tay lên chiếc B-25 trọn sải cánh
  // Nhịp 2  (433.36–449.78 s): Gắn trên vai phải sau buồng lái/tháp lưng (cao & lệch ngoài dây ăng-ten để dây không bao giờ cắt bầu trời), ngước lên 9 tiêm kích Nhật
  const pStreet = prog(t, CUE.c03_s03_roar_suburbs_noon, CUE.c03_s03_civilians_wave + 0.9);
  const pCanopy = prog(t, CUE.c03_s03_suddenly_cole + 0.25, CUE.c03_s03_nine_fighters_shout + 0.2);
  const pTrackHigh = prog(t, CUE.c03_s03_nine_fighters_shout, 449.78, Easing.linear);

  // Camera giai đoạn 1: tầm mái ngói -> lòng đại lộ nắng trưa có dân vẫy tay rõ ở tiền cảnh dưới & trọn sải cánh B-25 phía trên
  const cam1Pos: V3 = [
    b25X + lerp(16.5, 20.4, pStreet),
    lerp(9.4, 2.15, pStreet),
    lerp(19.2, 7.6, pStreet),
  ];
  const cam1Look: V3 = [
    b25X + lerp(1.2, 2.2, pStreet),
    lerp(12.2, 8.2, pStreet),
    lerp(-1.2, 1.2, pStreet),
  ];
  const cam1Fov = lerp(47, 57, pStreet);

  // Camera giai đoạn 2: sát trên vai phải thân B-25 thu trọn tháp lưng + kính buồng lái + cánh phải ở tiền cảnh dưới VÀ 9 tiêm kích Nhật trên trời xanh
  const cam2Pos: V3 = [
    b25X - 3.05,
    b25Y + 4.98,
    b25Z + 2.78,
  ];
  const cam2Look: V3 = [
    b25X + 22.95,
    b25Y + lerp(9.5, 11.7, pTrackHigh),
    b25Z - 5.45,
  ];
  const cam2Fov = lerp(59, 61, pTrackHigh);

  const camPos: V3 = [
    lerp(cam1Pos[0], cam2Pos[0], pCanopy),
    lerp(cam1Pos[1], cam2Pos[1], pCanopy),
    lerp(cam1Pos[2], cam2Pos[2], pCanopy),
  ];
  const camLook: V3 = [
    lerp(cam1Look[0], cam2Look[0], pCanopy),
    lerp(cam1Look[1], cam2Look[1], pCanopy),
    lerp(cam1Look[2], cam2Look[2], pCanopy),
  ];
  const camFov = lerp(cam1Fov, cam2Fov, pCanopy);

  // Tháp pháo lưng Bendix xoay nhẹ cảnh giới nhưng giữ lặng không khai hỏa để tránh lộ
  const turretYaw = lerp(0.15, -0.35, pCanopy);
  const turretPitch = lerp(0.12, 0.36, pCanopy);

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.tokyoNoon}
        shadowArea={85}
        shadowCenter={[b25X + 10, 6, 0]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình ngoại ô Tokyo & cây xanh nắng trưa */}
        <Terrain h={SUBURB_H} size={960} seg={220} center={[40, 0]} colors={TERRAIN_PALETTE.tokyoUrban} grainRepeat={48} />
        <Scatter
          kind="broadleaf"
          count={160}
          area={[-240, -135, 310, 135]}
          h={SUBURB_H}
          seed={31}
          scale={[0.85, 1.35]}
          avoid={AVOID_STREETS_AND_HOUSES}
        />
        <Scatter
          kind="pine"
          count={140}
          area={[-240, -180, 340, 180]}
          h={SUBURB_H}
          seed={37}
          scale={[0.95, 1.5]}
          avoid={AVOID_STREETS_AND_HOUSES}
        />
        <Scatter
          kind="bush"
          count={150}
          area={[-220, -90, 280, 90]}
          h={SUBURB_H}
          seed={43}
          scale={[0.7, 1.2]}
          avoid={AVOID_STREETS_AND_HOUSES}
        />

        {/* Lưới đại lộ, vỉa hè, cột điện gỗ và các cụm nhà gỗ mái ngói ngoại ô Tokyo */}
        <SuburbanStreets />
        {SUBURB_BLOCKS.map((b, i) => (
          <group key={`blk-${i}`} position={[b.x, 0, b.z]}>
            <TokyoRowhouseBlock variant={b.variant} />
          </group>
        ))}

        {/* Dân thường và đội viên phòng không Tokyo đứng dưới phố ngước nhìn vẫy tay */}
        {CIVILIANS.map((c, idx) => (
          <WavingCivilian key={`civ-${idx}`} spec={c} t={t} />
        ))}

        {/* Chiếc B-25B Mitchell số 1 của Trung tá Jimmy Doolittle sơn Olive Drab lướt sát mái ngói */}
        <group position={[b25X, b25Y, b25Z]}>
          <group rotation={[0, 0, b25Pitch]}>
            <group rotation={[b25Roll, 0, 0]}>
              <B25Mitchell
                gear={0}
                propFast={true}
                propSpin={t * 44}
                bombBay={0}
                broomsticks={true}
                turretYaw={turretYaw}
                turretPitch={turretPitch}
                seed={1}
              />
            </group>
          </group>
        </group>

        {/* Biên đội 9 tiêm kích đánh chặn Nhật (3 tốp chữ V) bay ngược chiều trên đầu ở y ≈ 55–64 m */}
        {NINE_FIGHTERS.map((f, idx) => {
          const fx = fighterLeadX + f.dx;
          const fy = fighterBaseY + f.dy + Math.sin(t * 1.6 + idx * 0.9) * 0.2;
          const fz = fighterLeadZ + f.dz + Math.cos(t * 1.1 + idx) * 0.16;
          return (
            <group key={`jf-${idx}`} position={[fx, fy, fz]} rotation={[0, fighterYaw, 0]}>
              <group rotation={[Math.sin(t * 1.3 + idx) * 0.04, 0, -0.02]}>
                <JapaneseFighter
                  scheme={f.scheme}
                  gear={0}
                  propFast={true}
                  propSpin={t * 50 + idx}
                  damage={0}
                  seed={f.seed}
                />
              </group>
            </group>
          );
        })}
      </Stage>

      <Label
        t={t}
        text="9 FIGHTERS OVERHEAD"
        x={430}
        y={146}
        size={48}
        from={CUE.c03_s03_nine_fighters_shout}
        until={442.2}
      />
    </AbsoluteFill>
  );
};

export default C03S03;
