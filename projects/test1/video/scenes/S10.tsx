import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { DustTrail, Explosion, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { DESERT_TERRAIN, P, STAGE_CANYON_STRIKE } from '../local/palette';
import { FortifiedBunker, GBU39SDB, MQ9Reaper, TacticalTruck } from '../local/models';

// Cao độ sàn thung lũng khu tổ hợp kho tàng & toạ độ chạm nổ chính xác
const DEPOT_Y = -2.0;
const IMPACT_POS: V3 = [132.5, DEPOT_Y + 0.15, 2.0];
const SECONDARY_BLAST_POS: V3 = [137.6, DEPOT_Y + 0.45, -3.6];

// Địa hình thung lũng cao nguyên sa mạc: vách mesa hai bên giới hạn cao nguyên ~28m để mở rộng chân trời bình minh
const canyonHeight = heightField({
  seed: 37,
  amp: 6.8,
  scale: 112,
  oct: 5,
  flats: [
    [130, 2, 30, DEPOT_Y],
    [92, 8.6, 22, DEPOT_Y],
    [168, 8.6, 22, DEPOT_Y],
    [56, 8.6, 18, DEPOT_Y],
  ],
  add: (x, z) => {
    const absZ = Math.abs(z - 2);
    const mesaPlateau = 27.0 * Math.tanh(Math.pow(Math.max(0, (absZ - 34) / 62), 1.55));
    const farRange = 28.0 * Math.tanh(Math.pow(Math.max(0, (x - 245) / 95), 1.5));
    const valleyFloor = -2.0 * Math.exp(-((z - 4) * (z - 4)) / 480);
    return mesaPlateau + farRange + valleyFloor;
  },
});

const avoidDepotAndRoad = (x: number, z: number) => {
  if (Math.abs(z - 8.6) < 7.2 && x > 30 && x < 215) return true;
  if (Math.hypot(x - 131, z + 1) < 26) return true;
  return false;
};

/** Chuyển toạ độ cục bộ trên thân GBU-39 (roll -> pitch -> yaw) sang thế giới 3D */
function bombLocalToWorld(pos: V3, yaw: number, pitch: number, roll: number, lx: number, ly: number, lz: number): V3 {
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);
  const x1 = lx;
  const y1 = ly * cr - lz * sr;
  const z1 = ly * sr + lz * cr;

  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const x2 = x1 * cp - y1 * sp;
  const y2 = x1 * sp + y1 * cp;
  const z2 = z1;

  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x3 = x2 * cy + z2 * sy;
  const y3 = y2;
  const z3 = -x2 * sy + z2 * cy;
  return [pos[0] + x3, pos[1] + y3, pos[2] + z3];
}

/** Quỹ đạo mượt C2 của GBU-39 SDB: lướt êm ở trần cao 98m rồi chúc mũi bổ nhào từ ~100.8s xuống kho tàng */
function getBombPos(time: number): V3 {
  const tc = Math.max(96.35, Math.min(CUE.s10_impact, time));
  const s = (tc - 96.35) / (CUE.s10_impact - 96.35);
  const x = 6.0 + (IMPACT_POS[0] - 6.0) * s;

  const diveRaw = Math.max(0, (tc - 100.72) / (CUE.s10_impact - 100.72));
  const diveCurve = Math.pow(diveRaw, 2.2);
  const glideDrop = 13.5 * s;
  const y = 98.0 - glideDrop - (98.0 - 13.5 - IMPACT_POS[1]) * diveCurve;

  const z = lerp(-3.6, IMPACT_POS[2], s) + Math.sin(s * Math.PI) * 2.2;
  return [x, y, z];
}

function getBombAttitude(time: number) {
  const dt = 0.025;
  const p0 = getBombPos(time - dt);
  const p1 = getBombPos(time + dt);
  const vx = p1[0] - p0[0];
  const vy = p1[1] - p0[1];
  const vz = p1[2] - p0[2];
  const horiz = Math.max(1e-4, Math.hypot(vx, vz));
  const yaw = Math.atan2(-vz, vx);
  const pitch = Math.atan2(vy, horiz);
  const roll = 0.25 * bump(time, 98.3, 2.75) - 0.08 * bump(time, 101.1, 1.7);
  return { yaw, pitch, roll };
}

/** Khu kho tàng hậu cần quân sự (bồn nhiên liệu, kiện đạn dược, nhà bạt khung thép & vệt bánh xe đường cát) */
const SupplyDepotCompound: React.FC = () => {
  const oliveCrateMat = useMemo(
    () =>
      paint({
        color: '#5d6649',
        camo: ['#4d553c', '#6e7858'],
        wear: 0.22,
        dirt: 0.26,
        roughness: 0.72,
        metalness: 0.2,
        seed: 301,
      }),
    [],
  );
  const tanCrateMat = useMemo(
    () =>
      paint({
        color: '#bfa176',
        camo: ['#a6885e', '#cfb48c'],
        wear: 0.2,
        dirt: 0.3,
        roughness: 0.8,
        metalness: 0.12,
        seed: 302,
      }),
    [],
  );
  const tankSteelMat = useMemo(
    () =>
      paint({
        color: '#73797e',
        camo: ['#60666b', '#868d92'],
        wear: 0.26,
        dirt: 0.25,
        roughness: 0.52,
        metalness: 0.56,
        seed: 303,
      }),
    [],
  );
  const canopyMat = useMemo(
    () =>
      paint({
        color: '#9b8662',
        camo: ['#826f4e', '#b09a75'],
        wear: 0.18,
        dirt: 0.28,
        roughness: 0.9,
        metalness: 0.05,
        seed: 304,
      }),
    [],
  );
  const darkFrameMat = useMemo(() => plain('#2a2d32', 0.6, 0.65), []);
  const hazardBandMat = useMemo(() => plain('#e5a92b', 0.45, 0.2), []);
  const rutTrackMat = useMemo(
    () =>
      paint({
        color: '#b5956d',
        camo: ['#a6865f', '#c4a57d'],
        wear: 0.14,
        dirt: 0.25,
        roughness: 0.99,
        metalness: 0.0,
        repeat: 8,
        seed: 306,
      }),
    [],
  );

  const crateLarge = useMemo(() => rbox(2.3, 1.25, 1.55, 0.06), []);
  const crateMed = useMemo(() => rbox(1.75, 1.0, 1.35, 0.05), []);
  const skidBase = useMemo(() => rbox(4.8, 0.28, 2.1, 0.04), []);
  const wheelRut = useMemo(() => rbox(156, 0.018, 1.35, 0.008), []);
  const shelterRoof = useMemo(() => rbox(6.4, 0.16, 4.6, 0.05), []);

  return (
    <group position={[0, DEPOT_Y, 0]}>
      {/* Hai vệt bánh xe mòn tự nhiên trên mặt đường cát dọc thung lũng (ẩn mép êm vào nền đất) */}
      <mesh position={[116, 0.005, 7.55]} geometry={wheelRut} material={rutTrackMat} receiveShadow />
      <mesh position={[116, 0.005, 9.65]} geometry={wheelRut} material={rutTrackMat} receiveShadow />

      {/* Cụm 2 bồn chứa nhiên liệu quân sự đặt trên bệ thép bên phải công sự */}
      {[-5.6, -2.9].map((zPos, i) => (
        <group key={i} position={[138.2, 0, zPos]}>
          <mesh position={[0, 0.14, 0]} geometry={skidBase} material={darkFrameMat} castShadow receiveShadow />
          <mesh position={[0, 1.22, 0]} rotation={[0, 0, Math.PI / 2]} material={tankSteelMat} castShadow receiveShadow>
            <cylinderGeometry args={[0.96, 0.96, 4.5, 22]} />
          </mesh>
          <mesh position={[0.9, 1.22, 0]} rotation={[0, 0, Math.PI / 2]} material={hazardBandMat}>
            <cylinderGeometry args={[0.975, 0.975, 0.28, 22]} />
          </mesh>
          <mesh position={[-0.9, 1.22, 0]} rotation={[0, 0, Math.PI / 2]} material={hazardBandMat}>
            <cylinderGeometry args={[0.975, 0.975, 0.28, 22]} />
          </mesh>
        </group>
      ))}

      {/* Dãy kiện hàng đạn dược & thùng tiếp vận xếp tầng ngay trung tâm sân kho */}
      <group position={[134.8, 0, 1.2]}>
        <mesh position={[0, 0.63, 0]} geometry={crateLarge} material={oliveCrateMat} castShadow receiveShadow />
        <mesh position={[0, 0.63, 1.75]} geometry={crateLarge} material={tanCrateMat} castShadow receiveShadow />
        <mesh position={[0.1, 1.75, 0.85]} geometry={crateMed} material={oliveCrateMat} castShadow receiveShadow />
        <mesh position={[2.55, 0.5, 0.7]} geometry={crateMed} material={tanCrateMat} castShadow receiveShadow />
      </group>

      {/* Nhà bạt khung thép & hàng phuy nhiên liệu bên trái công sự */}
      <group position={[119.5, 0, -3.2]}>
        {[
          [-2.8, -1.9],
          [2.8, -1.9],
          [-2.8, 1.9],
          [2.8, 1.9],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 1.65, pz]} material={darkFrameMat} castShadow>
            <cylinderGeometry args={[0.07, 0.08, 3.3, 8]} />
          </mesh>
        ))}
        <mesh position={[0, 3.32, 0]} rotation={[0.06, 0, 0]} geometry={shelterRoof} material={canopyMat} castShadow receiveShadow />
        <mesh position={[-1.1, 0.63, 0]} geometry={crateLarge} material={tanCrateMat} castShadow receiveShadow />
        <mesh position={[1.3, 0.63, 0.2]} geometry={crateLarge} material={oliveCrateMat} castShadow receiveShadow />
        {[-0.9, -0.2, 0.5, 1.2].map((dx, k) => (
          <mesh key={k} position={[dx, 0.58, 2.7]} material={k % 2 === 0 ? oliveCrateMat : tankSteelMat} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 1.15, 14]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

// Xe tải quân sự 6x6 cơ động chạy dọc tuyến đường qua trước kho tàng, khựng dừng khi trúng chấn động nổ
const TRUCK_SPEED = 7.5;
function getTruckX(time: number): number {
  if (time <= CUE.s10_impact) {
    return 133.0 + (time - CUE.s10_impact) * TRUCK_SPEED;
  }
  const dt = time - CUE.s10_impact;
  const skid = TRUCK_SPEED * 0.42 * (1 - Math.exp(-dt / 0.42));
  return 133.0 + skid;
}

const truckDustPath = (time: number): V3 => {
  const tx = getTruckX(time) - 3.1;
  const tz = 8.6;
  return [tx, canyonHeight(tx, tz), tz];
};

const S10: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ bung bộ cánh kép hình thoi Diamondback ngay trước ống kính (97.25s -> 98.35s)
  const deploy = prog(t, 97.25, 98.35);

  // Trạng thái bay của GBU-39 SDB
  const bPos = getBombPos(t);
  const { yaw: bYaw, pitch: bPitch, roll: bRoll } = getBombAttitude(t);
  const showBomb = t < CUE.s10_impact;

  // Vệt xoáy khí động mảnh động (rolling window 1.35s) bám sát trực tiếp 2 đầu mút cánh thoi Diamondback và tan hết khi nổ
  const frameKey = Math.round(t * 30);
  const { leftWake, rightWake } = useMemo(() => {
    const tEnd = Math.min(t, CUE.s10_impact);
    const tStart = Math.max(97.72, tEnd - 1.35);
    if (tEnd - tStart < 0.06) return { leftWake: [] as V3[], rightWake: [] as V3[] };
    const steps = 34;
    const left: V3[] = [];
    const right: V3[] = [];
    for (let i = 0; i < steps; i++) {
      const ts = lerp(tStart, tEnd, i / (steps - 1));
      const pos = getBombPos(ts);
      const att = getBombAttitude(ts);
      const dep = prog(ts, 97.25, 98.35);
      const span = lerp(0.16, 0.78, dep);
      right.push(bombLocalToWorld(pos, att.yaw, att.pitch, att.roll, -0.08, 0.12, span));
      left.push(bombLocalToWorld(pos, att.yaw, att.pitch, att.roll, -0.08, 0.12, -span));
    }
    return { leftWake: left, rightWake: right };
  }, [frameKey, t]);

  const trailOpacity =
    0.46 * prog(t, 97.75, 98.35) * (1 - prog(t, CUE.s10_impact - 0.04, CUE.s10_impact + 0.28));

  // Phi cơ mẹ MQ-9 Reaper sải cánh 20.12m lướt cao dần trọn vẹn ở bầu trời phía trên trong 2.5 giây đầu
  const dtRel = t - 97.0;
  const mq9Pos: V3 = [
    bPos[0] + 18.2 + dtRel * 11.5,
    bPos[1] + 2.55 + Math.max(-0.4, dtRel) * 2.35,
    bPos[2] - 8.2 - dtRel * 2.5,
  ];

  // Xe tải cơ động TacticalTruck chạy trên đường cát cạnh kho tàng
  const truckX = getTruckX(t);
  const truckZ = 8.6;
  const truckY = canyonHeight(truckX, truckZ);
  const truckTravel = Math.max(0, truckX - 72.0);
  const blastShockRoll = t >= CUE.s10_impact ? 0.15 * prog(t, CUE.s10_impact, CUE.s10_impact + 0.26) : 0;

  // --- ĐIỀU PHỐI CAMERA BÁM ĐUỔI TRÊN KHÔNG -> BỔ NHÀO SÁT LƯNG BOM -> GIỮ KHUNG KÍCH NỔ ---
  const pGlideOrbit = prog(t, 97.55, 100.55);
  const pDiveCam = prog(t, 100.75, 101.95);
  // Giữ camera bám sát sau lưng quả bom suốt cú bổ nhào (qua mốc 102.73s) rồi dừng giữ toàn cảnh ngay trước 103.10s
  const pHoldImpact = prog(t, 102.8, 103.07);
  const pAftermathDrift = prog(t, CUE.s10_impact, 104.85);

  // Hướng chuẩn hoá từ quả bom thẳng tới tâm kho tàng & xe cơ động bên dưới để giữ bom và mục tiêu đồng trục ngắm
  const toTargetX = IMPACT_POS[0] - bPos[0];
  const toTargetY = IMPACT_POS[1] + 1.0 - bPos[1];
  const toTargetZ = IMPACT_POS[2] + 1.2 - bPos[2];
  const distTarget = Math.max(0.1, Math.hypot(toTargetX, toTargetY, toTargetZ));
  const ux = toTargetX / distTarget;
  const uy = toTargetY / distTarget;
  const uz = toTargetZ / distTarget;

  const glideCamOffset: V3 = [
    lerp(-2.55, -2.85, pGlideOrbit),
    lerp(0.72, 0.92, pGlideOrbit),
    lerp(1.36, 1.08, pGlideOrbit),
  ];
  const diveCamOffset: V3 = [-ux * 2.95 - 0.34, -uy * 2.95 + 0.38, -uz * 2.95 + 0.54];
  const chaseCamPos: V3 = [
    bPos[0] + lerp(glideCamOffset[0], diveCamOffset[0], pDiveCam),
    bPos[1] + lerp(glideCamOffset[1], diveCamOffset[1], pDiveCam),
    bPos[2] + lerp(glideCamOffset[2], diveCamOffset[2], pDiveCam),
  ];

  const glideLookOffset: V3 = [
    lerp(1.45, 2.5, pGlideOrbit),
    lerp(0.32, -0.46, pGlideOrbit),
    lerp(-0.44, 0.04, pGlideOrbit),
  ];
  const diveLookOffset: V3 = [ux * 6.5, uy * 6.5 - 0.12, uz * 6.5 - 0.15];
  const activeChaseLook: V3 = [
    bPos[0] + lerp(glideLookOffset[0], diveLookOffset[0], pDiveCam),
    bPos[1] + lerp(glideLookOffset[1], diveLookOffset[1], pDiveCam),
    bPos[2] + lerp(glideLookOffset[2], diveLookOffset[2], pDiveCam),
  ];

  // Khung toàn cảnh 3/4 tầm trung bao quát kho tàng, xe tải cơ động, cầu lửa đôi & cột khói bốc cao trên hẻm núi
  const blastShake = bump(t, CUE.s10_impact, 0.55) + 0.6 * bump(t, CUE.s10_impact + 0.72, 0.45);
  const shakeY = Math.sin((t - CUE.s10_impact) * 46) * 0.38 * blastShake;
  const shakeZ = Math.cos((t - CUE.s10_impact) * 39) * 0.28 * blastShake;

  const impactHoldPos: V3 = [
    lerp(105.5, 101.5, pAftermathDrift),
    lerp(16.2, 18.0, pAftermathDrift) + shakeY,
    lerp(24.5, 27.5, pAftermathDrift) + shakeZ,
  ];
  const impactHoldLook: V3 = [132.4, DEPOT_Y + 3.2 + shakeY * 0.4, 1.4];

  const camPos: V3 = [
    lerp(chaseCamPos[0], impactHoldPos[0], pHoldImpact),
    lerp(chaseCamPos[1], impactHoldPos[1], pHoldImpact),
    lerp(chaseCamPos[2], impactHoldPos[2], pHoldImpact),
  ];
  const camLook: V3 = [
    lerp(activeChaseLook[0], impactHoldLook[0], pHoldImpact),
    lerp(activeChaseLook[1], impactHoldLook[1], pHoldImpact),
    lerp(activeChaseLook[2], impactHoldLook[2], pHoldImpact),
  ];
  const camRoll = lerp(0.08 * bump(t, 98.3, 2.75), 0, pDiveCam);
  const camFov = lerp(44, 46, pHoldImpact);

  // Vùng bóng đổ động bám sát quả bom trên không rồi mở rộng bao trọn khu kho tàng dưới mặt đất khi bổ nhào
  const pShadowGround = prog(t, 101.4, 102.7);
  const shadowCenter: V3 = [
    lerp(bPos[0], 131.5, pShadowGround),
    lerp(bPos[1], DEPOT_Y, pShadowGround),
    lerp(bPos[2], 2.0, pShadowGround),
  ];
  const shadowArea = lerp(22, 46, pShadowGround);

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a3552' }}>
      <Stage {...STAGE_CANYON_STRIKE} shadowCenter={shadowCenter} shadowArea={shadowArea}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Địa hình thung lũng cao nguyên sa mạc & đá/bụi cây tự nhiên */}
        <Terrain h={canyonHeight} size={680} seg={220} center={[120, 0]} colors={DESERT_TERRAIN} grainRepeat={56} />
        <Scatter
          kind="rock"
          count={150}
          area={[-80, -160, 300, 160]}
          h={canyonHeight}
          seed={61}
          scale={[0.85, 2.5]}
          tint="#b39273"
          avoid={avoidDepotAndRoad}
        />
        <Scatter
          kind="bush"
          count={90}
          area={[-60, -125, 270, 125]}
          h={canyonHeight}
          seed={62}
          scale={[0.65, 1.3]}
          tint="#9c8a5b"
          avoid={avoidDepotAndRoad}
        />

        {/* Tổ hợp Kho tàng Quân sự kiên cố */}
        <FortifiedBunker position={[127.8, DEPOT_Y, -5.6]} rotation={[0, 0.22, 0]} dishYaw={t * 0.75} />
        <SupplyDepotCompound />

        {/* Phương tiện cơ động TacticalTruck chạy thực trên đường cát kèm bụi cuốn DustTrail */}
        <TacticalTruck
          position={[truckX, truckY, truckZ]}
          rotation={[blastShockRoll, 0, 0]}
          travel={truckTravel}
        />
        <DustTrail
          t={t}
          from={94.5}
          to={CUE.s10_impact + 0.25}
          path={truckDustPath}
          rate={10}
          size={2.4}
          color="#cfb892"
          life={3.4}
        />

        {/* Phi cơ mẹ MQ-9 Reaper sải cánh lớn lướt cao dần ở hậu cảnh bầu trời phía trên */}
        {t < 100.2 && (
          <MQ9Reaper
            position={mq9Pos}
            rotation={[0.2, 0.16, 0.08]}
            propSpin={t * 36}
            gearDown={0}
            loadout="full"
            sensorYaw={0.25}
            sensorPitch={0.55}
          />
        )}

        {/* Chủ thể chính: Bom liệng GBU-39 SDB bung bộ cánh kép hình thoi Diamondback */}
        {showBomb && (
          <group position={bPos} rotation={[0, bYaw, 0]}>
            <group rotation={[0, 0, bPitch]}>
              <group rotation={[bRoll, 0, 0]}>
                <GBU39SDB deploy={deploy} />
              </group>
            </group>
          </group>
        )}

        {/* Đôi vệt xoáy khí động mảnh bám sát đầu mút cánh Diamondback và tan khi chạm đích */}
        {trailOpacity > 0.01 && rightWake.length >= 2 && (
          <>
            <Trail points={rightWake} upto={1} color="#c9f5ff" width={0.018} opacity={trailOpacity} glow />
            <Trail points={leftWake} upto={1} color="#c9f5ff" width={0.018} opacity={trailOpacity} glow />
          </>
        )}

        {/* Vụ nổ chính xuyên kích nổ kho tàng & xe cơ động lúc 103.10s + nổ dây chuyền bồn nhiên liệu */}
        <Explosion
          t={t}
          at={CUE.s10_impact}
          pos={IMPACT_POS}
          size={8.5}
          seed={10}
          smokeLife={6}
          smoke="#6d645a"
        />
        <Explosion
          t={t}
          at={CUE.s10_impact + 0.72}
          pos={SECONDARY_BLAST_POS}
          size={6.2}
          seed={24}
          smokeLife={5.5}
          smoke="#786e63"
        />
      </Stage>

      {/* Tối đa 1 Label đúng nhịp lời thoại Diamondback 110 km */}
      <Label
        t={t}
        text="DIAMONDBACK · 110 KM"
        x={960}
        y={965}
        from={97.72}
        until={101.15}
        size={48}
        bg={P.paper}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S10;
