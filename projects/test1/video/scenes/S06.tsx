import React, { useMemo } from 'react';
import { Easing } from 'remotion';
import { prog, lerp, bump } from '@kit/theme';
import { useT, Label } from '@kit/motion';
import { Stage, Cam, type V3 } from '@lib/3d/stage';
import { fbm } from '@lib/3d/materials';
import { heightField, Terrain, Scatter } from '@lib/3d/terrain';
import { Explosion, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { P, STAGE_CANYON_STRIKE, DESERT_TERRAIN } from '../local/palette';
import { MQ9Reaper, MQ9_MTSB_POS, FortifiedBunker, TacticalTruck, GBU12Paveway } from '../local/models';

// Tọa độ khu căn cứ công sự dưới đáy hẻm núi sa mạc
const BUNKER_POS: V3 = [58, 0, -1.5];
const TRUCK_POS: V3 = [50.2, 0, -9.2];
const TARGET_LOCK: V3 = [57.35, 2.82, -0.85];

// Quỹ đạo lao xiên của bom dẫn đường laser GBU-12 Paveway II (bám dọc điểm chiếu xạ laser)
const SKY_WAKE_ORIGIN: V3 = [31.5, 28.5, -11.2];
const BOMB_ENTER_POS: V3 = [44.8, 14.5, -5.8];

// Địa hình hẻm núi sa mạc đá đỏ tự nhiên bằng fBm đa tầng (tuyệt đối không có gợn sóng sin nhân tạo)
const H_CANYON = heightField({
  seed: 63,
  amp: 3.2,
  scale: 88,
  flats: [
    [55, -4.5, 18.5, 0],
    [28, 2.5, 15, 0],
    [84, 1, 14, 0],
  ],
  add: (x, z) => {
    const zCenter = -1.8 + (fbm(x / 110 + 12, 4.5, 15, 3) - 0.5) * 14;
    const edgeJitter = (fbm(x / 26 + 3, z / 26 + 7, 19, 3) - 0.5) * 11;
    const dz = z - zCenter + edgeJitter;
    const mesaDetail = 0.72 + 0.56 * fbm(x / 38 + 20, z / 38 + 20, 29, 4);
    const spur = (fbm(x / 16 + 9, z / 16 + 4, 41, 3) - 0.5) * 5.2;

    // Vách đá dựng đứng phía Bắc (+Z, phông nền hẻm núi sau công sự)
    let northWall = 0;
    if (dz > 17) {
      const u = Math.min(1, (dz - 17) / 30);
      const s = u * u * (3 - 2 * u);
      northWall = (42 * mesaDetail + spur) * s;
    }

    // Vách đá phía Nam (-Z, mở khe nắng tự nhiên phía +X/-Z để nắng bình minh rọi thẳng vào công sự)
    let southWall = 0;
    if (dz < -17) {
      const u = Math.min(1, (-dz - 17) / 32);
      const s = u * u * (3 - 2 * u);
      const sunPass = x > 50 && x < 118 ? 0.36 : 1.0;
      southWall = (35 * mesaDetail + spur) * sunPass * s;
    }

    return northWall + southWall;
  },
});

const avoidCompound = (x: number, z: number) => {
  if (Math.hypot(x - 55, z + 4.5) < 16.5) return true;
  if (Math.hypot(x - 33, z - 11) < 9) return true;
  return false;
};

const avoidShrubs = (x: number, z: number) => avoidCompound(x, z) || H_CANYON(x, z) > 9.5;

const S06: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // 1. Chuyển động tuần tra trên cao của MQ-9 Reaper & góc xoay khóa mục tiêu của cầu MTS-B
  const uavX = -13.0 + (t - 51.82) * 1.45;
  const uavY = 51.0;
  const uavZ = -5.2;
  const uavPos: V3 = [uavX, uavY, uavZ];

  const mtsbCenter: V3 = [
    uavX + MQ9_MTSB_POS[0],
    uavY + MQ9_MTSB_POS[1],
    uavZ + MQ9_MTSB_POS[2],
  ];

  const dx = TARGET_LOCK[0] - mtsbCenter[0];
  const dy = TARGET_LOCK[1] - mtsbCenter[1];
  const dz = TARGET_LOCK[2] - mtsbCenter[2];
  const dh = Math.hypot(dx, dz);
  const dist = Math.hypot(dh, dy);

  const lockYaw = Math.atan2(-dz, dx);
  const lockPitch = Math.atan2(-dy, dh);

  // Trước mốc 54.04s, quả cầu MTS-B xoay quét rồi khóa cứng vào nóc công sự
  const slewP = prog(t, 51.82, 53.9);
  const sensorYaw = lerp(lockYaw - 0.62, lockYaw, slewP);
  const sensorPitch = lerp(lockPitch - 0.28, lockPitch, slewP);

  // Điểm xuất phát tia laser ngay trên mặt thấu kính cầu MTS-B
  const ux = dx / dist;
  const uy = dy / dist;
  const uz = dz / dist;
  const laserOrigin: V3 = [
    mtsbCenter[0] + ux * 0.23,
    mtsbCenter[1] + uy * 0.23,
    mtsbCenter[2] + uz * 0.23,
  ];

  // Dãy điểm tia chỉ thị Laser nối thẳng từ cầu MTS-B xuống nóc FortifiedBunker
  const laserPts = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      pts.push([
        lerp(laserOrigin[0], TARGET_LOCK[0], s),
        lerp(laserOrigin[1], TARGET_LOCK[1], s),
        lerp(laserOrigin[2], TARGET_LOCK[2], s),
      ]);
    }
    return pts;
  }, [laserOrigin[0], laserOrigin[1], laserOrigin[2]]);

  const laserExtend = prog(t, CUE.s06_track_lock, CUE.s06_track_lock + 0.14, Easing.out(Easing.cubic));
  const postHitFade = 1 - prog(t, CUE.s06_laser_bomb_hit, CUE.s06_laser_bomb_hit + 0.35);
  const laserOpacity = (0.85 + 0.15 * Math.sin(t * 28)) * postHitFade;
  const laserSpotActive = t >= CUE.s06_track_lock + 0.12 && t < CUE.s06_laser_bomb_hit + 0.06;
  const spotPulse = 0.68 + 0.32 * Math.sin(t * 36);

  // 2. Điều khiển Camera:
  // Giai đoạn 1 (51.82 - 55.85s): Đặt sát dưới cằm / cánh phải trước để góc trên thấy trọn vẹn quả cầu MTS-B + mũi + GBU-12 & giá đôi Hellfire, 75% dưới nhìn dốc thẳng xuống công sự hẻm núi.
  // Giai đoạn 2 (55.85 - 61.22s): Trượt lao dọc tia laser xuống cận cảnh công sự bê tông, rọ Hesco, radar xoay & cú đánh bom laser GBU-12.
  const camPhase1: V3 = [uavX - 1.45, uavY - 0.78, uavZ + 2.55];
  const lookPhase1: V3 = [camPhase1[0] + 44.0, camPhase1[1] - 14.3, camPhase1[2] - 0.5];

  const diveP = prog(t, 55.85, 58.0);
  const drift2 = prog(t, 58.0, 61.3);
  const camPhase2: V3 = [
    lerp(32.5, 35.4, drift2),
    lerp(15.2, 13.6, drift2),
    lerp(13.6, 11.2, drift2),
  ];
  const lookPhase2: V3 = [57.2, 3.55, -1.5];

  const blastShake = bump(t, CUE.s06_laser_bomb_hit, 0.65);
  const camPos: V3 = [
    lerp(camPhase1[0], camPhase2[0], diveP) + Math.sin(t * 58) * 0.48 * blastShake,
    lerp(camPhase1[1], camPhase2[1], diveP) + Math.cos(t * 49) * 0.58 * blastShake,
    lerp(camPhase1[2], camPhase2[2], diveP),
  ];
  const camLook: V3 = [
    lerp(lookPhase1[0], lookPhase2[0], diveP),
    lerp(lookPhase1[1], lookPhase2[1], diveP),
    lerp(lookPhase1[2], lookPhase2[2], diveP),
  ];
  const camFov = lerp(55, 44, diveP);

  // Vùng bóng đổ thu hẹp mượt theo camera
  const shadowArea = lerp(52, 34, diveP);
  const shadowCenter: V3 = [
    lerp(30, BUNKER_POS[0], diveP),
    lerp(15, 2, diveP),
    lerp(-3, BUNKER_POS[2], diveP),
  ];

  // 3. Bom dẫn đường laser GBU-12 Paveway II lao xiên nhanh bám điểm laser (58.38s -> nổ tại 59.95s)
  const bombActive = t >= CUE.s06_laser_weapon - 0.08 && t < CUE.s06_laser_bomb_hit;
  const bombP = prog(
    t,
    CUE.s06_laser_weapon - 0.06,
    CUE.s06_laser_bomb_hit,
    Easing.bezier(0.32, 0.14, 0.68, 1),
  );
  const bombPos: V3 = [
    lerp(BOMB_ENTER_POS[0], TARGET_LOCK[0], bombP),
    lerp(BOMB_ENTER_POS[1], TARGET_LOCK[1], bombP),
    lerp(BOMB_ENTER_POS[2], TARGET_LOCK[2], bombP),
  ];

  const bvx = TARGET_LOCK[0] - BOMB_ENTER_POS[0];
  const bvy = TARGET_LOCK[1] - BOMB_ENTER_POS[1];
  const bvz = TARGET_LOCK[2] - BOMB_ENTER_POS[2];
  const bvh = Math.hypot(bvx, bvz);
  const bombRot: V3 = [0, Math.atan2(-bvz, bvx), Math.atan2(bvy, bvh)];

  const bombWakePts = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    const N = 24;
    for (let i = 0; i <= N; i++) {
      const s = i / N;
      pts.push([
        lerp(SKY_WAKE_ORIGIN[0], TARGET_LOCK[0], s),
        lerp(SKY_WAKE_ORIGIN[1], TARGET_LOCK[1], s),
        lerp(SKY_WAKE_ORIGIN[2], TARGET_LOCK[2], s),
      ]);
    }
    return pts;
  }, []);
  const wakeUpto = t < CUE.s06_laser_weapon - 0.08 ? 0 : Math.min(1, 0.52 + bombP * 0.48);
  const wakeOpacity = 0.55 * (1 - prog(t, CUE.s06_laser_bomb_hit, CUE.s06_laser_bomb_hit + 0.25));

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080 }}>
      <Stage {...STAGE_CANYON_STRIKE} shadowArea={shadowArea} shadowCenter={shadowCenter}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Ánh phản xạ cát sa mạc hắt nhẹ dưới bụng & cầu MTS-B của MQ-9 để nổi rõ khối chi tiết cơ khí */}
        <pointLight
          color="#ffe0b5"
          intensity={34 * (1 - diveP * 0.7)}
          distance={16}
          decay={1.3}
          position={[uavX + 2.4, uavY - 2.3, uavZ + 1.6]}
        />

        {/* Địa hình hẻm núi đá đỏ tự nhiên & Đá tảng, bụi cây khô sa mạc */}
        <Terrain h={H_CANYON} size={460} seg={220} center={[40, 0]} colors={DESERT_TERRAIN} grainRepeat={48} />
        <Scatter
          kind="rock"
          count={140}
          area={[-55, -115, 155, 115]}
          h={H_CANYON}
          seed={605}
          scale={[0.85, 2.35]}
          tint="#b8926e"
          avoid={avoidCompound}
        />
        <Scatter
          kind="bush"
          count={72}
          area={[-40, -90, 140, 90]}
          h={H_CANYON}
          seed={606}
          scale={[0.6, 1.15]}
          tint="#baa066"
          avoid={avoidShrubs}
        />

        {/* UAV MQ-9 Reaper tuần tra trên cao với cầu MTS-B khóa mục tiêu */}
        <MQ9Reaper
          position={uavPos}
          rotation={[0, 0, 0]}
          gearDown={0}
          loadout="full"
          propSpin={t * 45}
          sensorYaw={sensorYaw}
          sensorPitch={sensorPitch}
        />

        {/* Công sự bê tông cốt thép kiên cố + Xe tải quân sự 6x6 */}
        <FortifiedBunker position={BUNKER_POS} rotation={[0, -2.35, 0]} dishYaw={t * 1.4} />
        <TacticalTruck position={TRUCK_POS} rotation={[0, -0.45, 0]} travel={0} />

        {/* Chùm tia chỉ thị Laser xanh ngọc lục phát sáng từ cầu MTS-B xuống thẳng nóc công sự */}
        {laserExtend > 0.001 && laserOpacity > 0.01 && (
          <Trail
            points={laserPts}
            upto={laserExtend}
            color="#28f0b4"
            width={0.09}
            opacity={laserOpacity}
            glow={true}
          />
        )}

        {/* Đốm sáng khóa mục tiêu Laser xanh ngọc nhấp nháy trên nóc công sự */}
        {laserSpotActive && (
          <group position={TARGET_LOCK}>
            <pointLight color="#28f0b4" intensity={18 * spotPulse} distance={14} decay={1.6} position={[0, 0.35, 0]} />
            <mesh scale={0.22 + 0.08 * spotPulse}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color="#e8fff7" toneMapped={false} />
            </mesh>
            <mesh scale={0.44 + 0.16 * spotPulse}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial color="#28f0b4" transparent opacity={0.58 * spotPulse} toneMapped={false} />
            </mesh>
            <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, t * 2.5]} scale={0.75 + 0.22 * spotPulse}>
              <ringGeometry args={[0.72, 1.0, 28]} />
              <meshBasicMaterial color="#28f0b4" transparent opacity={0.75 * spotPulse} toneMapped={false} side={2} />
            </mesh>
          </group>
        )}

        {/* Quả bom dẫn đường laser GBU-12 Paveway II lao xiên xuống bám điểm laser + Vệt khói mảnh */}
        {wakeUpto > 0.02 && wakeOpacity > 0.01 && (
          <Trail
            points={bombWakePts}
            upto={wakeUpto}
            color="#e8dfd2"
            width={0.065}
            opacity={wakeOpacity}
            glow={false}
          />
        )}
        {bombActive && <GBU12Paveway position={bombPos} rotation={bombRot} />}

        {/* Vụ nổ chính của bom GBU-12 tại 59.95s + Kích nổ dây chuyền kho đạn trong hầm ngầm ngay sau đó */}
        <Explosion
          t={t}
          at={CUE.s06_laser_bomb_hit}
          pos={[TARGET_LOCK[0], 1.75, TARGET_LOCK[2]]}
          size={6.5}
          seed={66}
          smokeLife={6.5}
        />
        <Explosion
          t={t}
          at={CUE.s06_laser_bomb_hit + 0.46}
          pos={[BUNKER_POS[0] + 0.85, 1.45, BUNKER_POS[2] + 0.65]}
          size={4.6}
          seed={83}
          smokeLife={5.8}
        />
      </Stage>

      {/* Tối đa 1 Label duy nhất theo đúng quy định */}
      <Label
        t={t}
        text="24/7 LASER"
        x={315}
        y={875}
        from={CUE.s06_24_7}
        until={58.1}
        size={56}
        bg={P.paper}
        fg={P.ink}
      />
    </div>
  );
};

export default S06;
