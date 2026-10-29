import React from 'react';
import * as THREE from 'three';
import { prog, lerp } from '@kit/theme';
import { useT, Label } from '@kit/motion';
import { Stage, Cam, type V3 } from '@lib/3d/stage';
import { Terrain, Scatter, heightField } from '@lib/3d/terrain';
import { Trail, DustTrail } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { P, STAGE_HIGH_ALT, TERRAIN_OZARK } from '../local/palette';
import { F15EX } from '../local/models';

// ---------- Địa hình sân bay Boeing St. Louis (đường băng phẳng dài + đồi xanh Ozark xa) ----------
const ST_LOUIS_H = heightField({
  seed: 15,
  amp: 13,
  scale: 185,
  add: (x, z) => {
    const az = Math.abs(z);
    // Dải phẳng tuyệt đối cho đường băng, đường lăn và khu nhà xưởng sân bay
    if (az < 115) return 0;
    const blend = Math.min(1, (az - 115) / 95);
    const s = blend * blend * (3 - 2 * blend);
    const farHills = 16 * Math.exp(-(((az - 340) / 140) ** 2));
    return farHills * s;
  },
  flats: [
    [200, 0, 260, 0],
    [600, 0, 280, 0],
    [-120, 0, 220, 0],
  ],
});

const avoidRunwayAndApron = (x: number, z: number) => {
  if (Math.abs(z) < 62) return true;
  // Tránh bãi sân đỗ nhà máy Boeing ở phía bắc đường băng (z < 0)
  if (z < -55 && z > -165 && x > 40 && x < 760) return true;
  return false;
};

// ---------- Bảng tích phân quỹ đạo C1 mượt tuyệt đối cho cú cất cánh dựng đứng 90° Viking ----------
type TrajSample = {
  t: number;
  x: number;
  y: number;
  pitch: number;
  dist: number;
};

const T_MIN = 399.5;
const T_MAX = 441.0;
const DT = 0.025;

const smooth01 = (t: number, a: number, b: number) => {
  const u = Math.max(0, Math.min(1, (t - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

const TRAJ: TrajSample[] = (() => {
  const out: TrajSample[] = [];
  let x = -225;
  let y = 0;
  let dist = 0;
  const steps = Math.round((T_MAX - T_MIN) / DT);

  for (let i = 0; i <= steps; i++) {
    const t = T_MIN + i * DT;

    // Tốc độ chạy đà tăng mạnh sau khi đốt buồng đốt hậu lúc 413.50s; pha leo thẳng đứng giữ cao độ gọn trong tầm máy quay để thấy rõ mặt đất đường băng
    const pRoll = smooth01(t, 400.0, 413.5);
    const pAbAccel = smooth01(t, 413.5, 427.0);
    const pClimbSlow = smooth01(t, 429.2, 433.6);
    let v = lerp(14, 24, pRoll);
    v = lerp(v, 44, pAbAccel);
    v = lerp(v, 4.4, pClimbSlow);

    // Góc quỹ đạo bay gamma (0° trên đường băng -> nhấc bánh 12° -> kéo dựng đứng 88.8° Viking!)
    const pLift = smooth01(t, 426.9, 429.0);
    const pViking = smooth01(t, 430.6, 434.2);
    const gamma = lerp(0, 0.21, pLift) + lerp(0, 1.34, pViking); // đỉnh ~1.550 rad = 88.8°

    // Góc chúc ngẩng thân máy bay pitch (nhấc mũi sớm hơn gamma lúc 426.1s để tạo góc tấn AoA thật)
    const pRotate = smooth01(t, 426.0, 428.2);
    const pitch = Math.min(1.553, lerp(0, 0.255, pRotate) + lerp(0, 1.298, pViking)); // đỉnh 89.0° (~90°)

    // Bù tâm xoay bánh đáp chính (x = -1.55 m) khi nhấc mũi trên đường băng để lốp không lún xuống bê tông
    const groundPivotLift = t < 427.4 ? 1.55 * Math.sin(pitch) * (1 - smooth01(t, 427.1, 427.6)) : 0;

    out.push({ t, x, y: y + groundPivotLift, pitch, dist });

    x += v * Math.cos(gamma) * DT;
    y += v * Math.sin(gamma) * DT;
    if (y < 0.15) dist += v * DT;
  }
  return out;
})();

const sampleTraj = (t: number): TrajSample => {
  const clamped = Math.max(T_MIN, Math.min(T_MAX - 1e-4, t));
  const f = (clamped - T_MIN) / DT;
  const i = Math.min(TRAJ.length - 2, Math.max(0, Math.floor(f)));
  const u = f - i;
  const a = TRAJ[i];
  const b = TRAJ[i + 1];
  return {
    t: clamped,
    x: lerp(a.x, b.x, u),
    y: lerp(a.y, b.y, u),
    pitch: lerp(a.pitch, b.pitch, u),
    dist: lerp(a.dist, b.dist, u),
  };
};

// Tiền tính 2 dải vệt khói ngưng tụ đầu cánh (wingtip vortex trails) theo đúng vị trí đầu cánh F15EX
const TRAIL_T0 = 426.8;
const TRAIL_T1 = 440.5;
const TRAIL_N = 360;

const buildWingtipTrail = (zSide: number): V3[] =>
  Array.from({ length: TRAIL_N }, (_, i) => {
    const ts = lerp(TRAIL_T0, TRAIL_T1, i / (TRAIL_N - 1));
    const s = sampleTraj(ts);
    const lx = -2.98;
    const ly = 2.41;
    const c = Math.cos(s.pitch);
    const sn = Math.sin(s.pitch);
    return [s.x + lx * c - ly * sn, s.y + lx * sn + ly * c, zSide * 6.46];
  });

const WING_TRAIL_L = buildWingtipTrail(-1);
const WING_TRAIL_R = buildWingtipTrail(1);

// Vật liệu đường băng & nhà xưởng Boeing St. Louis
const matConcrete = () =>
  paint({
    color: '#6e737b',
    camo: ['#7b8088', '#5e636b'],
    camoScale: 1.4,
    wear: 0.18,
    dirt: 0.22,
    roughness: 0.86,
    metalness: 0.06,
    repeat: 24,
    seed: 31,
  });

const matShoulder = () =>
  paint({
    color: '#3c4149',
    camo: ['#474d56', '#31363d'],
    camoScale: 1.6,
    wear: 0.12,
    dirt: 0.25,
    roughness: 0.92,
    metalness: 0.04,
    repeat: 20,
    seed: 44,
  });

const RunwayComplex: React.FC = () => {
  const concreteM = matConcrete();
  const shoulderM = matShoulder();
  const stripeM = plain('#edf2f7', 0.55, 0.05);
  const yellowM = plain('#eab308', 0.55, 0.05);
  const hangarWallM = plain('#cfd8e3', 0.62, 0.25);
  const hangarRoofM = plain('#4a5d73', 0.55, 0.35);
  const hangarDoorM = plain('#263241', 0.5, 0.45);
  const glassM = plain('#6fb4d8', 0.2, 0.75);

  return (
    <group>
      {/* Lề nhựa đường đen & mặt đường băng bê tông chính dài 1.800 m */}
      <mesh position={[420, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shoulderM} receiveShadow>
        <planeGeometry args={[1860, 48]} />
      </mesh>
      <mesh position={[420, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]} material={concreteM} receiveShadow>
        <planeGeometry args={[1840, 34]} />
      </mesh>

      {/* Hai vạch biên trắng chạy suốt chiều dài đường băng */}
      <mesh position={[420, 0.042, -15.6]} rotation={[-Math.PI / 2, 0, 0]} material={stripeM}>
        <planeGeometry args={[1820, 0.75]} />
      </mesh>
      <mesh position={[420, 0.042, 15.6]} rotation={[-Math.PI / 2, 0, 0]} material={stripeM}>
        <planeGeometry args={[1820, 0.75]} />
      </mesh>

      {/* Vạch đứt tim đường băng tạo cảm giác tốc độ xé gió */}
      {Array.from({ length: 64 }, (_, i) => {
        const sx = -380 + i * 26;
        return (
          <mesh key={`cl_${i}`} position={[sx, 0.044, 0]} rotation={[-Math.PI / 2, 0, 0]} material={stripeM}>
            <planeGeometry args={[13.5, 0.72]} />
          </mesh>
        );
      })}

      {/* Vạch ngưỡng đường băng (piano keys) & ô chạm bánh */}
      {[-12, -9, -6, -3, 3, 6, 9, 12].map((zk, idx) => (
        <React.Fragment key={`pk_${idx}`}>
          <mesh position={[-180, 0.045, zk]} rotation={[-Math.PI / 2, 0, 0]} material={stripeM}>
            <planeGeometry args={[28, 1.4]} />
          </mesh>
          <mesh position={[640, 0.045, zk * 0.9]} rotation={[-Math.PI / 2, 0, 0]} material={stripeM}>
            <planeGeometry args={[22, 1.2]} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Đường lăn nối vào khu nhà máy thử nghiệm Boeing St. Louis phía hậu cảnh (z < 0) */}
      {[120, 420, 680].map((tx, idx) => (
        <group key={`tw_${idx}`} position={[tx, 0, -45]}>
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shoulderM} receiveShadow>
            <planeGeometry args={[22, 54]} />
          </mesh>
          <mesh position={[0, 0.038, 0]} rotation={[-Math.PI / 2, 0, 0]} material={yellowM}>
            <planeGeometry args={[0.45, 52]} />
          </mesh>
        </group>
      ))}

      {/* Đèn lề đường băng hai bên */}
      {Array.from({ length: 46 }, (_, i) => {
        const lx = -320 + i * 34;
        return (
          <React.Fragment key={`lt_${i}`}>
            <mesh position={[lx, 0.22, -17.6]} geometry={rbox(0.24, 0.38, 0.24, 0.04)} material={yellowM} />
            <mesh position={[lx, 0.22, 17.6]} geometry={rbox(0.24, 0.38, 0.24, 0.04)} material={yellowM} />
          </React.Fragment>
        );
      })}

      {/* Cụm nhà chứa máy bay Boeing St. Louis & đài chỉ huy không lưu ở hậu cảnh (z = -105 m) */}
      <mesh position={[400, 0.015, -105]} rotation={[-Math.PI / 2, 0, 0]} material={concreteM} receiveShadow>
        <planeGeometry args={[680, 76]} />
      </mesh>
      {[180, 360, 560].map((hx, idx) => (
        <group key={`hg_${idx}`} position={[hx, 0, -112]}>
          <mesh position={[0, 7.5, 0]} geometry={rbox(74, 15, 38, 0.4)} material={hangarWallM} castShadow receiveShadow />
          <mesh position={[0, 15.8, 0]} geometry={rbox(77, 2.2, 41, 0.3)} material={hangarRoofM} castShadow />
          <mesh position={[0, 5.8, 19.1]} geometry={rbox(54, 11.5, 0.5, 0.08)} material={hangarDoorM} />
          <mesh position={[0, 12.6, 19.2]} geometry={rbox(64, 1.4, 0.4, 0.05)} material={plain(P.f15Dark, 0.5, 0.3)} />
        </group>
      ))}
      {/* Đài kiểm soát không lưu St. Louis */}
      <group position={[468, 0, -106]}>
        <mesh position={[0, 14, 0]} geometry={rbox(7.5, 28, 7.5, 0.3)} material={hangarWallM} castShadow />
        <mesh position={[0, 30.2, 0]} geometry={rbox(11.5, 4.6, 11.5, 0.4)} material={glassM} castShadow />
        <mesh position={[0, 33.1, 0]} geometry={rbox(12.8, 1.2, 12.8, 0.2)} material={hangarRoofM} castShadow />
      </group>
    </group>
  );
};

const S15: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const s = sampleTraj(t);

  // Điều khiển buồng đốt hậu GE F110-GE-129: cháy mồi 0.24 -> bùng cực đại 1.0 lúc 413.50s (58,000+ lb thrust)
  const abSurge = prog(t, CUE.s15_abIgnite - 0.15, CUE.s15_abIgnite + 0.65);
  const abShimmer = 0.96 + 0.04 * Math.sin(t * 42);
  const afterburner = lerp(0.24, 1.0, abSurge) * abShimmer;

  // Thu càng đáp gọn sau khi rời đường băng (427.8s -> 431.0s)
  const gear = 1 - prog(t, 427.8, 431.0);

  // Cánh đuôi ngang all-moving stabilator kéo ngóc mũi lúc nhấc bánh & Viking pull
  const pullDeflect =
    prog(t, 426.0, 427.4) * (1 - prog(t, 429.0, 430.5)) * -0.22 +
    prog(t, 431.1, 432.5) * (1 - prog(t, 434.8, 436.5)) * -0.3;

  // ---------- Đạo diễn Camera 3D mượt mà qua 2 pha ----------
  // Pha 1A (400.25 - 405.4s): Cận chạy đà thấp sau-chéo trên đường băng
  // Pha 1B (405.4 - 413.2s): Trượt sát vào cận cảnh cặp loa phụt GE F110-GE-129 (s15_tailpipes = 406.20)
  // Pha 1C (413.2 - 425.2s): Mở lùi nhẹ ôm trọn 2 luồng lửa siêu âm & 6 vân kim cương 58.000+ lb (s15_abIgnite = 413.50)
  // Pha 2  (425.2 - 440.1s): Mở rộng sang bên hông đường băng, ngước vừa đủ để thấy RÕ CẢ MẶT ĐẤT ĐƯỜNG BĂNG LẪN GÓC DỰNG ĐỨNG 90°!
  const pToNozzles = prog(t, 405.2, 408.4);
  const pAbFrame = prog(t, 413.2, 415.3);
  const pVikingWide = prog(t, 425.2, 429.4);

  // Rung động cơ lực đẩy bạo lực khi camera đứng sát sau loa phụt
  const closeShakeAmt = (1 - pVikingWide) * (0.015 + 0.045 * abSurge);
  const shakeY = Math.sin(t * 53) * closeShakeAmt;
  const shakeZ = Math.cos(t * 47) * closeShakeAmt;

  // Vị trí camera Pha 1 (bám theo khung tọa độ tịnh tiến của máy bay trên đường băng)
  let p1CamX = s.x + lerp(-21.5, -15.3, pToNozzles);
  p1CamX = lerp(p1CamX, s.x - 19.8, pAbFrame);

  let p1CamY = lerp(3.45, 2.24, pToNozzles);
  p1CamY = lerp(p1CamY, 2.65, pAbFrame);

  let p1CamZ = lerp(9.2, 2.75, pToNozzles);
  p1CamZ = lerp(p1CamZ, 4.9, pAbFrame);

  let p1LookX = s.x + lerp(-1.5, -9.25, pToNozzles);
  p1LookX = lerp(p1LookX, s.x - 11.3, pAbFrame);

  let p1LookY = lerp(2.25, 1.96, pToNozzles);
  p1LookY = lerp(p1LookY, 1.98, pAbFrame);

  const p1LookZ = lerp(0, -0.06, pToNozzles) * (1 - pAbFrame);

  // Vị trí camera Pha 2 (góc 3/4 sau-hông thấp vừa phải: giữ nguyên dải đường băng & nhà xưởng Boeing rõ nét ở 1/4 đáy khung hình trong suốt cú dựng đứng 90°!)
  const climbH = Math.max(0, s.y);
  const p2CamX = s.x - 36 - climbH * 0.1;
  const p2CamY = 5.2 + climbH * 0.08;
  const p2CamZ = 38 + climbH * 0.36;

  const p2LookX = s.x - 1.5;
  const p2LookY = 3.2 + climbH * 0.45;
  const p2LookZ = 0;

  const camPos: V3 = [
    lerp(p1CamX, p2CamX, pVikingWide),
    lerp(p1CamY, p2CamY, pVikingWide) + shakeY,
    lerp(p1CamZ, p2CamZ, pVikingWide) + shakeZ,
  ];
  const camLook: V3 = [
    lerp(p1LookX, p2LookX, pVikingWide),
    lerp(p1LookY, p2LookY, pVikingWide) + shakeY * 0.4,
    lerp(p1LookZ, p2LookZ, pVikingWide),
  ];

  let fov = lerp(42, 37, pToNozzles);
  fov = lerp(fov, 42, pAbFrame);
  fov = lerp(fov, 51, pVikingWide);

  // Tiến độ vệt khói ngưng tụ đầu cánh khi kéo G lớn dựng đứng 90°
  const trailUpto = t <= TRAIL_T0 ? 0 : Math.min(1, (t - TRAIL_T0) / (TRAIL_T1 - TRAIL_T0));

  // Vệt bụi/khói lốp mỏng dưới đường băng khi chạy đà đốt hậu
  const wheelPathL = (ts: number): V3 => {
    const st = sampleTraj(ts);
    return [st.x - 2.2, 0.1, -1.35];
  };
  const wheelPathR = (ts: number): V3 => {
    const st = sampleTraj(ts);
    return [st.x - 2.2, 0.1, 1.35];
  };

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden' }}>
      <Stage
        {...STAGE_HIGH_ALT}
        shadowCenter={[s.x, Math.min(s.y, 35), 0]}
        shadowArea={pVikingWide > 0.5 ? 68 : 34}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Mặt đất đồi cỏ xanh Missouri, đường băng St. Louis & rải cây hai bên xa */}
        <Terrain h={ST_LOUIS_H} size={2600} seg={220} center={[420, 0]} colors={TERRAIN_OZARK} grainRepeat={64} />
        <RunwayComplex />

        <Scatter
          kind="broadleaf"
          count={260}
          area={[-340, -420, 1180, 420]}
          h={ST_LOUIS_H}
          seed={15}
          scale={[1.15, 2.2]}
          avoid={avoidRunwayAndApron}
        />
        <Scatter
          kind="pine"
          count={110}
          area={[-320, -400, 1140, 400]}
          h={ST_LOUIS_H}
          seed={29}
          scale={[1.05, 1.9]}
          avoid={avoidRunwayAndApron}
        />
        <Scatter
          kind="bush"
          count={130}
          area={[-280, -240, 1080, 240]}
          h={ST_LOUIS_H}
          seed={43}
          scale={[0.85, 1.45]}
          avoid={(x, z) => Math.abs(z) < 52 || avoidRunwayAndApron(x, z)}
        />

        {/* Khói ma sát lốp & luồng phản lực quét mặt đường băng lúc bùng buồng đốt */}
        <DustTrail
          t={t}
          from={CUE.s15_abIgnite}
          to={427.4}
          path={wheelPathL}
          rate={10}
          size={1.6}
          color="#d8dee6"
          life={1.8}
        />
        <DustTrail
          t={t}
          from={CUE.s15_abIgnite}
          to={427.4}
          path={wheelPathR}
          rate={10}
          size={1.6}
          color="#d8dee6"
          life={1.8}
        />

        {/* Hai dải khói ngưng tụ trắng ở đầu cánh vẽ rõ đường cong kéo dựng đứng 90° từ đường băng lên trời */}
        {trailUpto > 0.005 && (
          <>
            <Trail points={WING_TRAIL_L} upto={trailUpto} color="#f2f7ff" width={0.14} opacity={0.72} glow={false} />
            <Trail points={WING_TRAIL_R} upto={trailUpto} color="#f2f7ff" width={0.14} opacity={0.72} glow={false} />
          </>
        )}

        {/* CHIẾC F-15EX EAGLE II VỚI CẶP ĐỘNG CƠ GE F110-GE-129 & CÚ DỰNG ĐỨNG 90° VIKING */}
        <group position={[s.x, s.y, 0]} rotation={[0, 0, s.pitch]}>
          <F15EX
            gear={gear}
            wheelSpin={s.dist / 0.45}
            afterburner={afterburner}
            elevator={pullDeflect}
            wingTipMissiles
            fullLoad={false}
            backSeatOccupied={false}
          />
          {/* Ánh lửa cam rực từ hai buồng đốt hậu hắt sáng đuôi titan và mặt đường băng */}
          <pointLight
            position={[-11.2, 1.95, 0]}
            color={ new THREE.Color('#ff8c2b') }
            intensity={18 + 95 * abSurge}
            distance={36}
            decay={1.6}
          />
        </group>
      </Stage>

      {/* TỐI ĐA 1 <Label> HTML TRÊN CẢNH 3D, ĐẶT TUẦN TỰ */}
      <Label
        t={t}
        text="58,000+ LB THRUST"
        x={960}
        y={915}
        from={CUE.s15_thrust58k}
        until={421.8}
        size={56}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="90° VIKING CLIMB"
        x={1420}
        y={895}
        from={435.24}
        until={439.8}
        size={56}
        bg={P.paper}
        fg={P.ink}
      />
    </div>
  );
};

export default S15;
