import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { Explosion, softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { FactoryComplex, OilRefineryCluster, TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';

// Địa hình khu công nghiệp Nagoya trải dài từ đầu cảnh tới cuối cảnh để hậu cảnh luôn là đô thị/nhà máy đang cháy
const NAGOYA_H = heightField({
  seed: 311,
  amp: 3.4,
  scale: 135,
  flats: [
    [-25, 72, 34, 0],
    [32, 64, 34, 0],
    [78, 52, 30, 0],
    [122, 34, 34, 0],
    [174, 48, 44, 0],
    [154, 96, 36, 0],
    [226, 38, 30, 0],
  ],
  add: (_x, z) => (z > 128 ? Math.min(26, (z - 128) * 0.3) : z < -85 ? Math.min(18, (-85 - z) * 0.22) : 0),
});

const avoidIndustrial = (x: number, z: number) => x > -65 && x < 265 && z > -6 && z < 126;

/**
 * Luồng gió xoáy & tàn khói flak đen hun hút lùa qua lỗ vỡ mũi kính Ø 0.35 m tại local [7.96, 2.38, -0.13]
 * trên chiếc B-25 #16 "Bat Out of Hell" của Trung úy Billy Farrow (dùng hạt khói/sương mềm tự nhiên, không dùng que cứng).
 */
const BrokenNoseHowlFx: React.FC<{ t: number; pull: number }> = ({ t, pull }) => {
  const smokeMat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  const windMat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );

  // Cường độ gió & khói tăng mạnh đúng đoạn "wind and flak smoke howling through its broken nose" (602.98–605.6 s),
  // dịu gọn khi camera kéo ra xa ở nửa sau cảnh để giữ biên dạng máy bay sắc nét
  const howlBoost = (0.72 + 0.48 * prog(t, 602.4, 604.0)) * (1 - 0.65 * pull);

  return (
    <group>
      {/* Viền ám khói flak đen & bóng tối hốc vỡ ngay mép trong lỗ thủng [7.96, 2.38, -0.13] giúp lỗ vỡ nổi khối sắc nét */}
      <group position={[7.94, 2.375, -0.128]} rotation={[0.22, 0.42, -0.58]}>
        <mesh material={plain('#151413', 0.95, 0.05, { transparent: true, opacity: 0.76, side: THREE.DoubleSide })}>
          <ringGeometry args={[0.088, 0.198, 14]} />
        </mesh>
        <mesh
          position={[0, -0.015, 0]}
          material={plain('#0c0d0e', 0.95, 0.05, { transparent: true, opacity: 0.56, side: THREE.DoubleSide })}
        >
          <circleGeometry args={[0.12, 12]} />
        </mesh>
      </group>

      {/* 28 cụm khói flak đen & sương gió tốc độ cao cuộn hút xuyên qua lỗ vỡ [7.96, 2.38, -0.13] vào khoang Bombardier */}
      {howlBoost > 0.05 &&
        Array.from({ length: 28 }, (_, i) => {
          const isSmoke = i % 2 === 0;
          const speed = isSmoke ? 2.9 : 4.2;
          const u = ((t * speed + i / 28 + rnd(i * 7 + 3) * 0.22) % 1 + 1) % 1;
          // Đi từ ngay trước mũi x = 9.05 -> xuyên đúng tâm lỗ vỡ x = 7.96 (u ≈ 0.49) -> xoáy tán loạn trong vòm kính tới x = 6.84
          const x = lerp(9.05, 6.84, u);
          const distHole = Math.abs(x - 7.96);
          const funnel = 0.22 + Math.min(1.15, distHole * 0.95);
          const swirlA = t * 9.2 + i * 2.35 + u * 5.6;
          const rad = (0.04 + 0.058 * rnd(i * 11 + 5)) * funnel;
          const baseY = x >= 7.96 ? lerp(2.38, 2.48, (x - 7.96) / 1.09) : lerp(2.38, 2.15, (7.96 - x) / 1.12);
          const baseZ = x >= 7.96 ? lerp(-0.13, -0.26, (x - 7.96) / 1.09) : lerp(-0.13, 0.04, (7.96 - x) / 1.12);
          const py = baseY + Math.cos(swirlA) * rad * 0.72;
          const pz = baseZ + Math.sin(swirlA) * rad;

          const env = Math.sin(u * Math.PI);
          const op = env * (isSmoke ? 0.62 : 0.38) * howlBoost;
          const sz = (isSmoke ? 0.22 + u * 0.2 : 0.14 + u * 0.12) * (0.75 + 0.35 * funnel);
          if (op <= 0.01) return null;

          const m = (isSmoke ? smokeMat : windMat).clone();
          m.color.set(isSmoke ? (i % 4 === 0 ? '#1f1c1a' : '#35302c') : '#dceaf4');
          m.opacity = Math.min(0.84, op);
          m.rotation = swirlA * 0.35;
          return (
            <sprite
              key={`howl-p-${i}`}
              material={m}
              position={[x, py, pz]}
              scale={[sz * (isSmoke ? 1.35 : 1.85), sz * (isSmoke ? 0.9 : 0.55), sz]}
            />
          );
        })}
    </group>
  );
};

/** Cột lửa cam-vàng rực rỡ + khói công nghiệp Nagoya bốc cao không che khuất mái xưởng */
const PersistentFireColumn: React.FC<{
  t: number;
  pos: V3;
  height?: number;
  radius?: number;
  seed?: number;
  intensity?: number;
}> = ({ t, pos, height = 54, radius = 6.5, seed = 1, intensity = 1 }) => {
  const baseMat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  const count = 18;
  return (
    <group position={pos}>
      <pointLight
        position={[0, 6.0, 0]}
        color="#ff8426"
        intensity={(135 + 40 * Math.sin(t * 7.3 + seed)) * intensity}
        distance={64}
        decay={1.55}
      />
      {/* Quầng lửa nóng rực ở chân công trình */}
      {[0, 1, 2].map((k) => {
        const flicker = 0.85 + 0.24 * Math.sin(t * (8.5 + k * 2.1) + seed * 3 + k);
        const s = radius * (0.56 - k * 0.11) * flicker * Math.min(1.35, intensity);
        return (
          <mesh key={`fcore-${k}`} position={[(k - 1) * radius * 0.24, 2.6 + k * 1.65, ((k % 2) - 0.5) * radius * 0.22]}>
            <icosahedronGeometry args={[Math.max(0.7, s), 1]} />
            <meshBasicMaterial
              color={k === 2 ? '#fff0b3' : k === 1 ? '#ff9b30' : '#ff5914'}
              transparent
              opacity={0.86 - k * 0.12}
              toneMapped={false}
            />
          </mesh>
        );
      })}
      {/* Cột khói bốc cao và tạt nhẹ ra phía sau (+Z) để phơi bày rõ kết cấu bồn dầu & mái răng cưa Mitsubishi */}
      {Array.from({ length: count }, (_, i) => {
        const u = ((t * 0.22 + i / count + rnd(seed * 19 + i) * 0.08) % 1 + 1) % 1;
        const y = 5.5 + u * height;
        const driftX = u * u * 14 + Math.sin(u * 5 + seed + i) * radius * 0.34;
        const driftZ = u * 11 + Math.cos(u * 4.3 + seed * 2 + i) * radius * 0.3;
        const sz = radius * (0.85 + u * 2.05) * (0.85 + 0.28 * rnd(seed * 7 + i));
        const op = Math.sin(Math.pow(u, 0.68) * Math.PI) * 0.62 * Math.min(1, intensity * 0.85 + 0.2);
        if (op <= 0.01) return null;
        const m = baseMat.clone();
        m.color.set(u < 0.16 ? '#6b3b1e' : u < 0.5 ? '#2d2825' : '#3d3733');
        m.opacity = op;
        m.rotation = i * 1.1 + t * 0.22 * (i % 2 === 0 ? 1 : -1);
        return <sprite key={`psmoke-${i}`} material={m} position={[driftX, y, driftZ]} scale={[sz, sz, sz]} />;
      })}
    </group>
  );
};

const C03S11: React.FC = () => {
  const t = useT();

  // Chuyển động bay ổn định của chiếc B-25 #16 Bat Out of Hell trên bầu trời Nagoya (hỗ trợ mở sớm -0.2s & chồng +0.4s)
  const dt = t - 598.98;
  const bx = 18.0 * dt;
  const pull = prog(t, 605.35, 606.75);
  const pan = prog(t, 606.4, 610.1);

  // Rung động nhẹ do gió lùa mũi vỡ & sóng xung kích từ kho dầu + nhà máy Mitsubishi nổ bên dưới
  const blastBuffet =
    bump(t, CUE.c03_s11_oil_depot_ablaze + 0.12, 1.15) * 0.52 +
    bump(t, CUE.c03_s11_mitsubishi_ablaze + 0.14, 1.35) * 0.68;
  const by = 49.0 + Math.sin(t * 2.15) * 0.26 + blastBuffet;
  const bz = Math.cos(t * 1.55) * 0.2;

  // Nửa sau máy bay nghiêng nhẹ cánh phải xuống (+0.14 rad quanh trục +X) để mở rộng tầm nhìn dưới cánh trái xuống mục tiêu
  const planeBank = 0.022 * Math.sin(t * 1.9) + 0.14 * pull;
  const planePitch = 0.012 * Math.cos(t * 2.3) - 0.02 * pull;

  // Góc máy nửa đầu (598.98–605.35s): chéo trước-trái [bx + 10.5, by + 2.7, bz - 3.2] nhìn về mũi [bx + 7.4, by + 2.3, bz]
  const howlClose = prog(t, 602.7, 604.3) * (1 - pull);
  const closePos: V3 = [
    bx + lerp(10.5, 9.95, howlClose),
    by + lerp(2.7, 2.62, howlClose),
    bz + lerp(-3.2, -2.78, howlClose),
  ];
  const closeLook: V3 = [
    bx + lerp(7.4, 7.66, howlClose),
    by + lerp(2.3, 2.34, howlClose),
    bz + lerp(0, -0.08, howlClose),
  ];

  // Góc máy nửa sau (605.5–609.90s): kéo lùi mở rộng góc nhìn giữ TRỌN VẸN thân/đuôi chiếc #16 ở 1/3 trên
  // đồng thời thu trọn cả Kho dầu Nagoya + Nhà máy máy bay Mitsubishi bùng nổ bên dưới cánh ở 2/3 dưới khung hình!
  const widePos: V3 = [bx + 15.8, by + 9.4, bz - 21.8];
  const wideLook: V3 = [bx - lerp(14.5, 25.5, pan), by - 25.2, bz + 25.5];

  const shakeY =
    Math.sin(t * 27) *
    (0.03 * howlClose +
      0.15 * bump(t, CUE.c03_s11_oil_depot_ablaze, 0.75) +
      0.2 * bump(t, CUE.c03_s11_mitsubishi_ablaze, 0.85));

  const camPos: V3 = [
    lerp(closePos[0], widePos[0], pull),
    lerp(closePos[1], widePos[1], pull) + shakeY,
    lerp(closePos[2], widePos[2], pull),
  ];
  const camLook: V3 = [
    lerp(closeLook[0], wideLook[0], pull),
    lerp(closeLook[1], wideLook[1], pull),
    lerp(closeLook[2], wideLook[2], pull),
  ];
  const camFov = lerp(41, 52, pull);

  // Các cụm nổ flak đen trên bầu trời Nagoya quanh hành lang bay của chiếc #16
  const flakBursts: { at: number; pos: V3; size: number; seed: number }[] = [
    { at: 597.4, pos: [-8, 55, 11], size: 3.3, seed: 41 },
    { at: 598.6, pos: [22, 47, -12], size: 3.1, seed: 42 },
    { at: 599.8, pos: [44, 54, 9], size: 3.5, seed: 43 },
    { at: 601.1, pos: [68, 48, 13], size: 3.4, seed: 44 },
    { at: 602.4, pos: [89, 53, -9], size: 3.2, seed: 45 },
    { at: 603.5, pos: [108, 52, 8], size: 3.6, seed: 46 },
    { at: 605.1, pos: [138, 45, 15], size: 3.4, seed: 47 },
  ];

  const roadMat = useMemo(() => plain('#45433f', 0.94, 0.05), []);
  const yardMat = useMemo(() => plain('#524f49', 0.92, 0.08), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        {...STAGE_PRESETS.tokyoFire}
        shadowArea={130}
        shadowCenter={[Math.round(bx / 12) * 12 + 10, 18, 24]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={lerp(-0.02, -0.045, pull)} />

        {/* Địa hình khu công nghiệp Nagoya */}
        <Terrain h={NAGOYA_H} size={820} seg={184} center={[115, 40]} colors={TERRAIN_PALETTE.tokyoUrban} />
        <Scatter
          kind="pine"
          count={135}
          area={[-120, -140, 380, 220]}
          h={NAGOYA_H}
          seed={31}
          scale={[0.85, 1.4]}
          avoid={avoidIndustrial}
        />
        <Scatter
          kind="broadleaf"
          count={80}
          area={[-100, -120, 360, 200]}
          h={NAGOYA_H}
          seed={37}
          scale={[0.8, 1.25]}
          avoid={avoidIndustrial}
        />

        {/* Mạng lưới sân bê tông & đường trục khu công nghiệp Nagoya trải suốt từ đầu cảnh tới cuối cảnh */}
        <mesh position={[98, 0.08, 52]} geometry={rbox(310, 0.16, 108, 0.04)} material={yardMat} receiveShadow />
        <mesh position={[98, 0.14, 14]} geometry={rbox(340, 0.14, 7.5, 0.03)} material={roadMat} receiveShadow />
        <mesh position={[98, 0.14, 76]} geometry={rbox(340, 0.14, 6.8, 0.03)} material={roadMat} receiveShadow />

        {/* Các dãy nhà phố & phân xưởng Nagoya ở đoạn đầu (x = -35..+80) để hậu cảnh nửa đầu luôn đậm chất đô thị cháy */}
        <group position={[-26, 0, 74]} rotation={[0, 0.08, 0]}>
          <FactoryComplex damage={0.65} variant={1} />
        </group>
        <group position={[28, 0, 62]} rotation={[0, -0.05, 0]}>
          <TokyoRowhouseBlock variant={0} burning={true} />
        </group>
        <group position={[34, 0, 96]} rotation={[0, 0.12, 0]}>
          <TokyoRowhouseBlock variant={2} burning={true} />
        </group>
        <group position={[78, 0, 54]} rotation={[0, 0.04, 0]}>
          <TokyoRowhouseBlock variant={1} burning={true} />
        </group>
        <PersistentFireColumn t={t} pos={[-22, 2.0, 72]} height={52} radius={6.5} seed={5} intensity={0.8} />
        <PersistentFireColumn t={t} pos={[32, 1.5, 64]} height={44} radius={5.5} seed={8} intensity={0.75} />

        {/* Mục tiêu chính 1: Cụm kho dầu Nagoya (OilRefineryCluster damage=0.85) */}
        <group position={[122, 0, 34]} rotation={[0, 0.18, 0]}>
          <OilRefineryCluster damage={0.85} />
        </group>

        {/* Mục tiêu chính 2: Nhà máy lắp ráp máy bay Mitsubishi Nagoya (FactoryComplex damage=0.85) */}
        <group position={[174, 0, 48]} rotation={[0, -0.08, 0]}>
          <FactoryComplex damage={0.85} variant={0} />
        </group>

        {/* Phân xưởng phụ Mitsubishi & dãy nhà xưởng lân cận */}
        <group position={[154, 0, 96]} rotation={[0, Math.PI * 0.5, 0]}>
          <FactoryComplex damage={0.75} variant={1} />
        </group>
        <group position={[226, 0, 38]} rotation={[0, -0.12, 0]}>
          <TokyoRowhouseBlock variant={2} burning={true} />
        </group>

        {/* Cột lửa rực sáng & khói dầu đen trên kho dầu + nhà máy Mitsubishi */}
        <PersistentFireColumn
          t={t}
          pos={[116, 1.5, 32]}
          height={56}
          radius={6.2}
          seed={11}
          intensity={0.8 + 0.65 * prog(t, CUE.c03_s11_oil_depot_ablaze, CUE.c03_s11_oil_depot_ablaze + 1.2)}
        />
        <PersistentFireColumn
          t={t}
          pos={[131, 1.5, 40]}
          height={48}
          radius={5.6}
          seed={17}
          intensity={0.65 + 0.75 * prog(t, CUE.c03_s11_oil_depot_ablaze, CUE.c03_s11_oil_depot_ablaze + 1.5)}
        />
        <PersistentFireColumn
          t={t}
          pos={[169, 2.0, 50]}
          height={58}
          radius={6.8}
          seed={23}
          intensity={0.75 + 0.85 * prog(t, CUE.c03_s11_mitsubishi_ablaze, CUE.c03_s11_mitsubishi_ablaze + 1.2)}
        />
        <PersistentFireColumn
          t={t}
          pos={[189, 2.0, 55]}
          height={50}
          radius={6.0}
          seed={29}
          intensity={0.6 + 0.8 * prog(t, CUE.c03_s11_mitsubishi_ablaze + 0.3, CUE.c03_s11_mitsubishi_ablaze + 1.8)}
        />
        <PersistentFireColumn t={t} pos={[154, 2.0, 96]} height={48} radius={5.8} seed={33} intensity={0.75} />

        {/* Các vụ nổ cầu lửa lớn khớp chính xác từ "oil depot" (606.64s) và "Mitsubishi aircraft plant ablaze" (607.62s) + nổ dây chuyền giữ lửa rực tới cuối cảnh */}
        <Explosion
          t={t}
          at={CUE.c03_s11_oil_depot_ablaze}
          pos={[120, 4.5, 33]}
          size={14.5}
          seed={101}
          smokeLife={7.5}
          smoke="#3a332e"
        />
        <Explosion
          t={t}
          at={CUE.c03_s11_oil_depot_ablaze + 0.45}
          pos={[133, 3.8, 39]}
          size={11.0}
          seed={102}
          smokeLife={7.5}
          smoke="#3f3832"
        />
        <Explosion
          t={t}
          at={CUE.c03_s11_mitsubishi_ablaze}
          pos={[172, 5.2, 47]}
          size={16.5}
          seed={103}
          smokeLife={7.5}
          smoke="#38312c"
        />
        <Explosion
          t={t}
          at={CUE.c03_s11_mitsubishi_ablaze + 0.55}
          pos={[187, 4.6, 52]}
          size={12.5}
          seed={104}
          smokeLife={7.5}
          smoke="#3d3630"
        />
        <Explosion
          t={t}
          at={609.05}
          pos={[164, 4.8, 44]}
          size={12.0}
          seed={105}
          smokeLife={6.5}
          smoke="#3b342f"
        />
        <Explosion
          t={t}
          at={609.18}
          pos={[126, 4.2, 35]}
          size={10.5}
          seed={106}
          smokeLife={6.5}
          smoke="#3b342f"
        />

        {/* Mây đạn cao xạ flak đen nổ lơ lửng trên bầu trời Nagoya */}
        {flakBursts.map((fb, idx) => (
          <Explosion
            key={`flak-${idx}`}
            t={t}
            at={fb.at}
            pos={fb.pos}
            size={fb.size}
            seed={fb.seed}
            smokeLife={8.5}
            smoke="#282523"
          />
        ))}

        {/* Chiếc B-25B #16 "Bat Out of Hell" của Trung úy Billy Farrow với lỗ vỡ mũi kính brokenNose={true} */}
        <group position={[bx, by, bz]} rotation={[planeBank, 0, planePitch]}>
          <B25Mitchell
            brokenNose={true}
            gear={0}
            propFast={true}
            propSpin={t * 44}
            broomsticks={true}
            turretYaw={Math.PI * 0.85}
            turretPitch={0.22}
            seed={16}
          />
          <BrokenNoseHowlFx t={t} pull={pull} />
        </group>
      </Stage>

      <Label
        t={t}
        text="NAGOYA · #16 BAT OUT OF HELL"
        x={530}
        y={885}
        from={CUE.c03_s11_nagoya_farrow}
        until={605.0}
        size={46}
      />
    </div>
  );
};

export default C03S11;
