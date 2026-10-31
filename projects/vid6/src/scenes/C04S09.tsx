import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, ridgeX, Scatter, Terrain } from '@skill/military/3d/terrain';
import { DustTrail, softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DUSK_EVOLUTION } from '../design/stage';
import { M1E3Abrams } from '../parts/M1E3Abrams';
import { M1A2Abrams } from '../parts/M1A2Abrams';

// Địa hình bãi thử nghiệm công nghệ cao lúc chạng vạng: hành lang đường băng phẳng tuyệt đối y = 0 ở tâm, dãy đồi sa mạc xa ôm chân trời
const H_PROVING = heightField({
  seed: 409,
  amp: 5.2,
  scale: 135,
  flats: [
    [0, 0, 30, 0],
    [-24, 0, 22, 0],
    [24, 5, 22, 0],
  ],
  add: (x, z) => {
    const northMesa = ridgeX(92, 16, 35)(x, z) * (0.65 + 0.35 * Math.cos(z * 0.035));
    const sideRim = Math.max(0, (Math.abs(z) - 36) * 0.16) * Math.min(1, Math.abs(z) / 56);
    return northMesa + sideRim;
  },
});

const AVOID_RUNWAY = (x: number, z: number) => Math.abs(z) < 22 && x > -54 && x < 60;

// Đặt 4 cột đèn pha rộng ra biên bãi thử để giữ nền trời sau nhãn <Label> và nòng RWS 30mm hoàn toàn thoáng sạch
const PYLON_COORDS: [number, number, number][] = [
  [-17.5, -13.8, 0.65],
  [17.5, -13.8, 2.48],
  [-17.5, 13.8, -0.65],
  [17.5, 13.8, -2.48],
];

const RUNWAY_BEACON_X = [-30, -24, -18, -12, -6, 6, 12, 18, 24, 30];

/** Màn sương bụi chạng vạng dâng lên làm mờ rõ rệt bóng khối SEPv4 nặng nề phía xa ngay khi chương trình bị huỷ (CUE.c04_s09_cancel @ 623.28) */
const DuskHazeVeil: React.FC<{ cancelP: number }> = ({ cancelP }) => {
  const baseMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#c47c58',
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const puffs: { pos: V3; scale: number; op: number }[] = [
    { pos: [14.8, 1.45, 5.2], scale: 8.8, op: 0.08 + cancelP * 0.78 },
    { pos: [17.4, 1.85, 6.4], scale: 10.6, op: 0.1 + cancelP * 0.84 },
    { pos: [20.2, 2.15, 5.8], scale: 9.8, op: 0.12 + cancelP * 0.8 },
    { pos: [16.2, 1.35, 7.5], scale: 8.4, op: 0.08 + cancelP * 0.74 },
    { pos: [13.6, 1.6, 6.1], scale: 7.8, op: cancelP * 0.72 },
  ];

  return (
    <group>
      {puffs.map((p, idx) => {
        const m = baseMat.clone();
        m.opacity = Math.min(0.92, p.op);
        return <sprite key={idx} material={m} position={p.pos} scale={[p.scale, p.scale * 0.6, 1]} />;
      })}
    </group>
  );
};

/** Đường băng thử nghiệm phẳng, bệ cân tải trọng công nghệ cao 60 tấn & 4 cột đèn pha bãi thử */
const ProvingGroundPad: React.FC<{ padGlow: number; weightPulse: number; cancelP: number }> = ({
  padGlow,
  weightPulse,
  cancelP,
}) => {
  const matAsphalt = useMemo(() => plain('#262b31', 0.84, 0.14), []);
  const matPadConcrete = useMemo(() => plain('#323941', 0.72, 0.22), []);
  const matPadSteel = useMemo(() => plain('#515c68', 0.44, 0.68), []);
  const matCurb = useMemo(() => plain('#444c54', 0.75, 0.2), []);
  const matPylon = useMemo(() => plain('#232930', 0.52, 0.64), []);
  const matStripe = useMemo(() => plain('#c89246', 0.55, 0.15), []);

  const matPadCyan = useMemo(
    () =>
      plain('#29e3d4', 0.2, 0.4, {
        emissive: new THREE.Color(PAL.cyan),
        emissiveIntensity: 0.35 + padGlow * 1.35,
      }),
    [padGlow],
  );

  const matWeightAmber = useMemo(
    () =>
      plain('#ffaa2b', 0.2, 0.35, {
        emissive: new THREE.Color(PAL.amber),
        emissiveIntensity: 0.3 + weightPulse * 1.9,
      }),
    [weightPulse],
  );

  const matLampHead = useMemo(
    () =>
      plain('#fff2dc', 0.15, 0.2, {
        emissive: new THREE.Color('#ffdcb0'),
        emissiveIntensity: 2.2,
      }),
    [],
  );

  const matCancelRing = useMemo(
    () =>
      plain('#b83b2e', 0.4, 0.3, {
        emissive: new THREE.Color(PAL.crimson),
        emissiveIntensity: Math.max(0.03, (1 - cancelP * 0.92) * 0.85),
      }),
    [cancelP],
  );

  return (
    <group>
      {/* Mặt đường băng thử nghiệm chính */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matAsphalt} receiveShadow>
        <planeGeometry args={[108, 17.6]} />
      </mesh>
      {[-8.95, 8.95].map((zc, i) => (
        <mesh key={i} position={[0, 0.03, zc]} geometry={rbox(108, 0.06, 0.36, 0.01)} material={matCurb} receiveShadow />
      ))}

      {/* Vạch tim đường băng dẫn vào bệ thử */}
      {[-38, -32, -26, -20, -14, 14, 20, 26, 32, 38].map((xs, i) => (
        <mesh key={i} position={[xs, 0.009, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matStripe}>
          <planeGeometry args={[3.2, 0.22]} />
        </mesh>
      ))}

      {/* Đèn dẫn hướng dọc mép đường băng chạng vạng */}
      {RUNWAY_BEACON_X.map((bx, i) => (
        <React.Fragment key={i}>
          {[-8.2, 8.2].map((bz, sIdx) => (
            <group key={sIdx} position={[bx, 0.04, bz]}>
              <mesh geometry={rbox(0.32, 0.08, 0.24, 0.015)} material={matPylon} />
              <mesh position={[0, 0.045, 0]} geometry={rbox(0.2, 0.03, 0.12, 0.006)} material={i % 2 === 0 ? matPadCyan : matWeightAmber} />
            </group>
          ))}
        </React.Fragment>
      ))}

      {/* Bệ thử nghiệm trung tâm (Telemetry & 60-Ton Scale Turntable Pad) tại (0, 0, 0) */}
      <group position={[0, 0, 0]}>
        <mesh position={[0, 0.008, 0]} material={matPadConcrete} receiveShadow>
          <cylinderGeometry args={[6.5, 6.7, 0.016, 48]} />
        </mesh>
        <mesh position={[0, 0.017, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matPadSteel} receiveShadow>
          <ringGeometry args={[5.35, 5.75, 48]} />
        </mesh>
        <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matPadCyan}>
          <ringGeometry args={[5.78, 5.9, 48]} />
        </mesh>
        <mesh position={[0, 0.019, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matWeightAmber}>
          <ringGeometry args={[4.45, 4.56, 48]} />
        </mesh>
        {Array.from({ length: 8 }, (_, k) => {
          const ang = (k / 8) * Math.PI * 2;
          return (
            <mesh
              key={k}
              position={[Math.cos(ang) * 5.05, 0.016, Math.sin(ang) * 5.05]}
              rotation={[0, -ang, 0]}
              geometry={rbox(0.88, 0.012, 0.14, 0.003)}
              material={k % 2 === 0 ? matWeightAmber : matPadSteel}
            />
          );
        })}
      </group>

      {/* Bãi đỗ phụ phía xa nơi khối SEPv4 nặng nề bị huỷ */}
      <group position={[18.8, 0, 6.4]}>
        <mesh position={[0, 0.007, 0]} material={matPadConcrete} receiveShadow>
          <cylinderGeometry args={[5.4, 5.6, 0.014, 32]} />
        </mesh>
        <mesh position={[0, 0.016, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matCancelRing}>
          <ringGeometry args={[4.85, 5.02, 32]} />
        </mesh>
      </group>

      {/* 4 cột đèn pha cao áp bãi thử công nghệ cao */}
      {PYLON_COORDS.map(([px, pz, yaw], idx) => (
        <group key={idx} position={[px, 0, pz]} rotation={[0, yaw, 0]}>
          <mesh position={[0, 0.25, 0]} geometry={rbox(0.95, 0.5, 0.95, 0.04)} material={matCurb} castShadow receiveShadow />
          <mesh position={[0, 4.4, 0]} rotation={[0, 0, -0.08]} material={matPylon} castShadow>
            <cylinderGeometry args={[0.11, 0.19, 8.2, 10]} />
          </mesh>
          <group position={[0.38, 8.35, 0]} rotation={[0, 0, 0.42]}>
            <mesh geometry={rbox(0.28, 0.42, 1.15, 0.03)} material={matPylon} castShadow />
            <mesh position={[0.145, -0.02, -0.28]} geometry={rbox(0.03, 0.28, 0.42, 0.008)} material={matLampHead} />
            <mesh position={[0.145, -0.02, 0.28]} geometry={rbox(0.03, 0.28, 0.42, 0.008)} material={matLampHead} />
          </group>
        </group>
      ))}
    </group>
  );
};

const C04S09: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // 1. Nguyên mẫu M1E3Abrams lăn bánh tiến lên bệ thử chính diện đúng CUE.c04_s09_m1e3 (627.92s)
  const approachP = prog(t, 617.9, 628.1);
  const m1e3X = lerp(-10.6, 0, approachP);
  const m1e3Travel = m1e3X + 10.6;

  // 2. Bóng khối SEPv4 nặng nề phía xa lùi & mờ dần vào sương bụi chạng vạng ở CUE.c04_s09_cancel (623.28s)
  const cancelP = prog(t, 621.8, 625.8);

  // 3. Bệ cân tải trọng 60 tấn & khe truyền động Hybrid-Electric phát ánh xanh điện từ tinh tế (CUE.c04_s09_hybrid @ 637.42)
  const padGlow = prog(t, CUE.c04_s09_m1e3 - 0.5, CUE.c04_s09_m1e3 + 1.0);
  const weightPulse = bump(t, 634.8, 4.0);
  const hybridGlow =
    prog(t, CUE.c04_s09_hybrid - 1.1, CUE.c04_s09_hybrid + 0.35) *
    (1 - 0.65 * prog(t, CUE.c04_s09_capsule + 0.5, CUE.c04_s09_turret + 0.8));

  // 4. Khoang bọc thép kín 3 nắp tổ lái ở mũi thân phát sáng (CUE.c04_s09_capsule @ 640.60)
  const capsuleGlow = prog(t, 639.3, CUE.c04_s09_capsule + 0.35);

  // 5. Tháp pháo tự động không người lái & trạm vũ khí RWS 30mm + radar AESA 4 mặt săn drone (CUE.c04_s09_turret @ 642.10, CUE.c04_s09_rws @ 644.18)
  const turretSlew =
    lerp(0, 0.2, prog(t, CUE.c04_s09_turret - 0.3, CUE.c04_s09_turret + 1.2)) -
    0.06 * prog(t, CUE.c04_s09_rws, 645.7);
  const gunPitch = 0.03 + 0.045 * prog(t, CUE.c04_s09_turret, 644.2);

  const rwsPatrol = Math.sin((t - 618.0) * 0.9) * 0.2;
  const rwsEngageP1 = prog(t, CUE.c04_s09_turret + 0.3, CUE.c04_s09_rws - 0.1);
  const rwsEngageP2 = prog(t, CUE.c04_s09_rws - 0.1, 645.3);
  const rwsYaw = lerp(rwsPatrol, -0.82, rwsEngageP1) + lerp(0, 1.28, rwsEngageP2);
  const rwsPitch = lerp(0.14, 0.3, rwsEngageP1) + lerp(0, 0.38, rwsEngageP2); // ngẩng cao +0.68 rad (~39°) săn drone trên trời

  // Thanh dẫn điện từ xanh cyan tinh tế xen giữa các cánh tản nhiệt biến tần Hybrid-Electric (không bị loá trắng xoá chi tiết)
  const matHybridFinGlow = useMemo(
    () =>
      plain('#19b8ad', 0.22, 0.55, {
        emissive: new THREE.Color(PAL.cyan),
        emissiveIntensity: 1.05,
      }),
    [],
  );

  // 6. Quỹ đạo <Cam> 360° liền mạch bằng toạ độ trụ quanh chủ thể:
  // - Mở đầu (618.1..624.5): góc ngược sáng sau-trái lấy trọn cả M1E3 đang lăn bánh lẫn bóng khối SEPv4 phía xa mờ dần
  // - Hero Reveal (627.92): đón chính diện 3/4 trước-phải trên bệ thử (<Label "M1E3 ABRAMS">)
  // - 60 Tons (634..636.2): lia ngang sườn phải phô diễn trọn 6 cặp bánh gọn gàng (<Label "60 TONS">)
  // - Hybrid (637.42): vòng qua sàn truyền động hybrid-điện phía sau
  // - Capsule (640.60): vòng trọn sang mũi trước phô diễn rõ cả 3 nắp cửa sập & 15 kính tiềm vọng khoang tổ lái phát sáng
  // - Turret & RWS (642.10..645.90): nâng lên tháp pháo không người lái + trạm RWS 30mm & radar AESA 4 mặt ngẩng cao săn drone (giữ trọn cả khoang 3 người bên dưới!)
  const pReveal = prog(t, 623.8, 628.1);
  const pSide60 = prog(t, 631.4, 635.6);
  const pHybrid = prog(t, 635.6, 638.3);
  const pCapsule = prog(t, 638.3, 640.35);
  const pRws = prog(t, 641.6, 645.7);

  const theta =
    -2.46 +
    (0.56 - -2.46) * pReveal +
    (1.56 - 0.56) * pSide60 +
    (3.16 - 1.56) * pHybrid +
    (5.78 - 3.16) * pCapsule +
    (6.74 - 5.78) * pRws;

  const camRadius =
    8.1 +
    (8.35 - 8.1) * pReveal +
    (7.45 - 8.35) * pSide60 +
    (6.5 - 7.45) * pHybrid +
    (6.15 - 6.5) * pCapsule +
    (6.05 - 6.15) * pRws;

  const camY =
    1.62 +
    (2.14 - 1.62) * pReveal +
    (1.62 - 2.14) * pSide60 +
    (2.58 - 1.62) * pHybrid +
    (2.64 - 2.58) * pCapsule +
    (2.96 - 2.64) * pRws;

  const orbitCenterX = lerp(m1e3X + 0.35, 0.18, pReveal);
  const camPos: V3 = [
    orbitCenterX + Math.cos(theta) * camRadius,
    camY,
    Math.sin(theta) * camRadius,
  ];

  const lookX =
    2.8 +
    (0.25 - 2.8) * pReveal +
    (-0.08 - 0.25) * pSide60 +
    (-1.95 - -0.08) * pHybrid +
    (1.42 - -1.95) * pCapsule +
    (0.28 - 1.42) * pRws;

  const lookY =
    1.46 +
    (1.32 - 1.46) * pReveal +
    (1.16 - 1.32) * pSide60 +
    (1.36 - 1.16) * pHybrid +
    (1.45 - 1.36) * pCapsule +
    (1.98 - 1.45) * pRws;

  const lookZ = 1.45 * (1 - pReveal);
  const camFov = lerp(39, 37, pCapsule);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...LOOK_DUSK_EVOLUTION.stage} shadowArea={34} shadowCenter={[0, 0.8, 0]}>
        <Cam pos={camPos} look={[lookX, lookY, lookZ]} fov={camFov} />

        {/* Địa hình sa mạc chạng vạng & đá/bụi xa hai bên hành lang bãi thử */}
        <Terrain h={H_PROVING} size={420} seg={220} colors={LOOK_DUSK_EVOLUTION.terrain} />
        <Scatter
          kind="rock"
          count={85}
          area={[-130, -120, 140, 120]}
          h={H_PROVING}
          seed={409}
          scale={[0.75, 2.3]}
          avoid={AVOID_RUNWAY}
          tint={LOOK_DUSK_EVOLUTION.scatterTint}
        />
        <Scatter
          kind="bush"
          count={55}
          area={[-110, -100, 120, 100]}
          h={H_PROVING}
          seed={419}
          scale={[0.6, 1.25]}
          avoid={AVOID_RUNWAY}
          tint="#8f7558"
        />

        {/* Đường băng, bệ thử nghiệm công nghệ cao & 4 trụ đèn pha */}
        <ProvingGroundPad padGlow={padGlow} weightPulse={weightPulse} cancelP={cancelP} />

        {/* Ánh sáng đèn pha bãi thử tôn rõ mặt trên khoang tổ lái 3 nắp ở mũi & trạm RWS 30mm trên nền chạng vạng */}
        <pointLight position={[5.8, 7.0, 5.5]} color="#ffe6c2" intensity={19} distance={28} decay={1.4} />
        <pointLight position={[-5.8, 6.8, -5.8]} color="#b4dcff" intensity={16} distance={28} decay={1.4} />
        <pointLight position={[5.6, 6.2, -5.0]} color="#ffd9b0" intensity={16} distance={26} decay={1.4} />

        {/* Bóng khối SEPv4 nặng nề phía xa ngược sáng lùi và mờ dần sau CUE.c04_s09_cancel (ẩn hẳn sau 628.6s khi ở sau lưng camera) */}
        {t < 628.6 && (
          <group>
            <M1A2Abrams
              variant="sepv3"
              camo="desert"
              turretYaw={0.18}
              gunPitch={-0.02}
              travel={-cancelP * 4.5}
              position={[18.8 + cancelP * 5.2, 0.014, 6.4 + cancelP * 1.8]}
              rotation={[0, -2.55, 0]}
            />
            <DuskHazeVeil cancelP={cancelP} />
          </group>
        )}

        {/* Bụi mỏng sau xích khi nguyên mẫu M1E3 lăn bánh tiến vào bệ thử */}
        <DustTrail
          t={t}
          from={617.9}
          to={627.2}
          rate={6}
          size={1.2}
          life={2.0}
          color="#c99b72"
          path={(tb) => {
            const xb = lerp(-10.6, 0, prog(tb, 617.9, 628.1));
            return [xb - 3.3, 0.05, 0];
          }}
        />

        {/* CHỦ THỂ CHÍNH: NGUYÊN MẪU M1E3 ABRAMS (~60 TẤN, HYBRID-ELECTRIC, KHOANG 3 NGƯỜI Ở MŨI, THÁP TỰ ĐỘNG & RWS 30MM) */}
        <group position={[m1e3X, 0.016, 0]}>
          <M1E3Abrams
            travel={m1e3Travel}
            turretYaw={turretSlew}
            gunPitch={gunPitch}
            rwsYaw={rwsYaw}
            rwsPitch={rwsPitch}
            capsuleGlow={capsuleGlow}
          />

          {/* Ánh xanh điện từ tinh tế chạy dọc các rãnh biến tần truyền động Hybrid-Electric phía sau (CUE.c04_s09_hybrid @ 637.42) */}
          {hybridGlow > 0.01 && (
            <group>
              {[-0.88, 0.88].map((sz, idx) => (
                <group key={idx} position={[-2.52, 1.434, sz]}>
                  {[-0.42, -0.22, -0.02, 0.18, 0.38].map((fx, fi) => (
                    <mesh
                      key={fi}
                      position={[fx, 0, 0]}
                      geometry={rbox(0.036, 0.01, 0.52 * (0.35 + 0.65 * hybridGlow), 0.002)}
                      material={matHybridFinGlow}
                    />
                  ))}
                </group>
              ))}
              {[-0.58, -0.32, -0.06, 0.2, 0.46].map((gx, gi) => (
                <mesh
                  key={gi}
                  position={[-2.62 + gx, 1.402, 0]}
                  geometry={rbox(0.032, 0.008, 0.74 * (0.3 + 0.7 * hybridGlow), 0.002)}
                  material={matHybridFinGlow}
                />
              ))}
              <pointLight
                position={[-2.55, 1.85, 0]}
                color={PAL.cyan}
                intensity={hybridGlow * 5.5}
                distance={4.2}
                decay={1.7}
              />
            </group>
          )}

          {/* Đèn điểm nhấn khoang bọc thép 3 nắp tổ lái ở mũi thân khi capsuleGlow bật sáng */}
          {capsuleGlow > 0.01 && (
            <pointLight
              position={[2.2, 2.15, 0]}
              color="#9cfbf2"
              intensity={capsuleGlow * 8.0}
              distance={4.6}
              decay={1.5}
            />
          )}
        </group>
      </Stage>

      {/* Tối đa 1 <Label> xuất hiện trên màn hình tại một thời điểm */}
      <Label
        t={t}
        text="M1E3 ABRAMS"
        x={W * 0.5}
        y={H * 0.14}
        from={CUE.c04_s09_m1e3}
        until={632.8}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="60 TONS"
        x={W * 0.5}
        y={H * 0.14}
        from={635.44}
        until={638.3}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C04S09;
