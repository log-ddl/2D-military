// Cảnh C01S02 (4.22–10.86 s, cut):
// Góc 2 — Side-Oblique Ballistic Intercept Profile (ngang chéo sườn ~72–75° ở tầm cao tháp pháo y ≈ 2.4–2.7 m):
// MBT đứng trọn vẹn ở 1/3 trái khung hình hướng +X, chừa 2/3 phải cho hành lang đạn đạo bắn thẳng ngược chiều (-X).
// Lúc 5.84 s bật highlightZone="front" + khối lăng trụ thép quy chiếu dày đúng 0.80 m (800 mm RHA) + HUDLabel.
// Lúc 8.30 -> 9.24 s thanh xuyên dưới cỡ APFSDS вольфрам nóng trắng-cam lao ngang từ x = +42 m kéo Trail rực lửa
// đập vào má trước tháp pháo [2.15, 1.95, 0.55] lúc 9.24 s -> Explosion + chùm mảnh thanh xuyên nảy tung tóe, MBT đứng vững như bàn thạch!
import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useSpring, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { Explosion, Trail } from '@skill/military/3d/fx';
import { lathe, rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { HUDLabel, STAGE_BATTLE, TERRAIN_STEPPE, THEME } from '../design';
import { MBT } from '../parts/MBT';

const SCENE_END = 10.86;

// Địa hình ụ bắn thảo nguyên rộng thoáng: bãi phẳng đặt MBT tại [0, 0], lòng thảo nguyên hạ nhẹ về phía +X,
// dải đồi xa ở z < -46 mở rộng bầu trời hoàng hôn phía trên tháp pháo và hành lang đường đạn.
const H_S02 = heightField({
  seed: 215,
  amp: 3.6,
  scale: 125,
  oct: 5,
  flats: [[0, 0, 8.8, 0]],
  add: (x, z) => {
    const firingCorridor = x > 7 ? -Math.min(1.1, (x - 7) * 0.028) * Math.exp(-((z / 30) ** 2)) : 0;
    const distantRidge =
      z < -46 ? Math.min(17, ((z + 46) / 38) ** 2 * 8.2) * (0.85 + 0.2 * Math.sin(x * 0.05)) : 0;
    return firingCorridor + distantRidge;
  },
});

const avoidFiringLine = (x: number, z: number) =>
  Math.hypot(x, z) < 9.5 || (Math.abs(z) < 5.0 && x > -6 && x < 55) || (z > 5 && z < 17 && x > -6 && x < 12);

const avoidDistantTreeline = (x: number, z: number) => z > -62;

// Quỹ đạo thanh xuyên dưới cỡ APFSDS: từ x = +42 m bay thẳng tốc độ siêu thanh về má phải trước tháp pháo [2.15, 1.95, 0.55]
const APFSDS_START: [number, number, number] = [42.0, 2.04, 0.55];
const APFSDS_HIT: [number, number, number] = [2.15, 1.95, 0.55];

const APFSDS_HALO_PTS: [number, number, number][] = Array.from({ length: 72 }, (_, i) => {
  const p = i / 71;
  return [
    lerp(APFSDS_START[0], APFSDS_HIT[0], p),
    lerp(APFSDS_START[1], APFSDS_HIT[1], p),
    lerp(APFSDS_START[2], APFSDS_HIT[2], p),
  ];
});

// Lõi trắng nóng đặt nhích nhẹ +0.10 m về phía ống kính (+Z) để không bị ống halo cam che khuất trong depth buffer!
const APFSDS_CORE_PTS: [number, number, number][] = APFSDS_HALO_PTS.map(([x, y, z]) => [x, y, z + 0.1]);

// Geometry thanh xuyên APFSDS вольфрам (dọc +X cục bộ, khi gắn xoay hướng -X về phía giáp trước MBT)
const DART_BODY_GEO = lathe(
  [
    [0.002, 0.78],
    [0.017, 0.55],
    [0.028, 0.35],
    [0.03, -0.62],
    [0.024, -0.7],
    [0.001, -0.72],
  ],
  20,
);
const DART_FIN_GEO = rbox(0.24, 0.14, 0.009, 0.002);

// Vật liệu khối lăng trụ thép quy chiếu 800 mm RHA & thanh xuyên APFSDS (khởi tạo một lần ở cấp module)
const RHA_SLAB_MAT = new THREE.MeshPhysicalMaterial({
  color: '#18649e',
  emissive: new THREE.Color(THEME.armorStrong),
  emissiveIntensity: 0.34,
  roughness: 0.22,
  metalness: 0.48,
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
  side: THREE.DoubleSide,
});

const RHA_CORE_MAT = new THREE.MeshStandardMaterial({
  color: '#4ea8e8',
  emissive: new THREE.Color(THEME.armorStrong),
  emissiveIntensity: 0.2,
  roughness: 0.32,
  metalness: 0.7,
  transparent: true,
  opacity: 0.2,
  depthWrite: false,
});

const RHA_EDGE_MAT = new THREE.MeshBasicMaterial({
  color: THEME.armorStrong,
  transparent: true,
  opacity: 0.95,
  toneMapped: false,
});

const RHA_TICK_MAT = new THREE.MeshBasicMaterial({
  color: '#c7ecff',
  transparent: true,
  opacity: 0.78,
  toneMapped: false,
});

const RHA_GUIDE_MAT = new THREE.MeshBasicMaterial({
  color: THEME.armorStrong,
  transparent: true,
  opacity: 0.55,
  toneMapped: false,
});

const TUNGSTEN_ROD_MAT = plain('#d4dde8', 0.22, 0.9, {
  emissive: '#ff9638',
  emissiveIntensity: 0.92,
});

const HOT_NOSE_MAT = new THREE.MeshBasicMaterial({
  color: '#fff8de',
  toneMapped: false,
});

const TRACER_GLOW_MAT = new THREE.MeshBasicMaterial({
  color: '#ff7b1c',
  transparent: true,
  opacity: 0.9,
  toneMapped: false,
});

// Dữ liệu tất định 26 mảnh thanh xuyên вольфрам vỡ vụn & tia lửa nảy bật chéo ngược ra phía trước (+X, +Y, ±Z)
const RICOCHET_SHARDS = Array.from({ length: 26 }, (_, i) => {
  const spreadYaw = (rnd(i * 7 + 1) - 0.35) * 1.3;
  const elev = 0.18 + rnd(i * 7 + 2) * 1.02;
  const speed = 8.5 + rnd(i * 7 + 3) * 15.5;
  return {
    vx: Math.cos(elev) * Math.cos(spreadYaw) * speed + 3.6,
    vy: Math.sin(elev) * speed + 2.4,
    vz: Math.cos(elev) * Math.sin(spreadYaw) * speed + 1.6,
    len: 0.14 + rnd(i * 7 + 4) * 0.28,
    thick: 0.02 + rnd(i * 7 + 5) * 0.025,
    spinX: (rnd(i * 7 + 6) - 0.5) * 28,
    spinY: (rnd(i * 7 + 7) - 0.5) * 28,
  };
});

// Khối lăng trụ thép quy chiếu dày đúng 0.80 m (800 mm RHA) kèm 8 khoang chia 100 mm, vòng khớp nòng & tia chiếu từ giáp trước
const RHAReferencePrism: React.FC<{ vis: number }> = ({ vis }) => {
  if (vis <= 0.004) return null;
  const W_X = 0.80; // đúng 0.80 m = 800 mm thép cán đồng nhất!
  const H_Y = 1.76; // phủ trọn chiều cao từ mũi glacis (0.72 m) lên đỉnh má tháp pháo (2.48 m)
  const D_Z = 2.68;
  const tEdge = 0.018;

  RHA_SLAB_MAT.opacity = 0.32 * vis;
  RHA_CORE_MAT.opacity = 0.19 * vis;
  RHA_EDGE_MAT.opacity = 0.96 * vis;
  RHA_TICK_MAT.opacity = 0.76 * vis;
  RHA_GUIDE_MAT.opacity = 0.48 * vis;

  const hx = W_X / 2;
  const hy = H_Y / 2;
  const hz = D_Z / 2;

  return (
    <group
      position={[4.36 - (1 - vis) * 0.16, 1.6, 0]}
      scale={[0.92 + 0.08 * vis, 0.96 + 0.04 * vis, 0.96 + 0.04 * vis]}
    >
      {/* Khối lăng trụ thép 0.80 m trong mờ sắc cạnh */}
      <mesh geometry={rbox(W_X, H_Y, D_Z, 0.012)} material={RHA_SLAB_MAT} />
      <mesh geometry={rbox(W_X * 0.94, H_Y * 0.94, D_Z * 0.96, 0.008)} material={RHA_CORE_MAT} />

      {/* Vòng khuyên kỹ thuật bao quanh trục nòng pháo 120mm đi xuyên qua khối quy chiếu */}
      {[-hx, hx].map((lx, bi) => (
        <mesh key={`collar_${bi}`} position={[lx, 2.01 - 1.6, 0]} rotation={[0, Math.PI / 2, 0]} material={RHA_EDGE_MAT}>
          <torusGeometry args={[0.19, 0.012, 10, 28]} />
        </mesh>
      ))}

      {/* 12 thanh viền khung phát sáng THEME.armorStrong */}
      {([-1, 1] as const).map((sy) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`ex_${sy}_${sz}`}
            position={[0, sy * hy, sz * hz]}
            geometry={rbox(W_X + tEdge, tEdge, tEdge, 0.003)}
            material={RHA_EDGE_MAT}
          />
        )),
      )}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <mesh
            key={`ey_${sx}_${sz}`}
            position={[sx * hx, 0, sz * hz]}
            geometry={rbox(tEdge, H_Y + tEdge, tEdge, 0.003)}
            material={RHA_EDGE_MAT}
          />
        )),
      )}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sy) => (
          <mesh
            key={`ez_${sx}_${sy}`}
            position={[sx * hx, sy * hy, 0]}
            geometry={rbox(tEdge, tEdge, D_Z + tEdge, 0.003)}
            material={RHA_EDGE_MAT}
          />
        )),
      )}

      {/* 7 vạch chia từng lớp 100 mm dọc bề dày 0.80 m ở mặt sườn +Z và mặt đỉnh +Y (8 khoang × 100 mm = 800 mm) */}
      {[1, 2, 3, 4, 5, 6, 7].map((step) => {
        const lx = -hx + (step / 8) * W_X;
        return (
          <React.Fragment key={`tick_${step}`}>
            <mesh position={[lx, 0, hz + 0.004]} geometry={rbox(0.008, H_Y * 0.94, 0.008, 0.002)} material={RHA_TICK_MAT} />
            <mesh position={[lx, hy + 0.004, 0]} geometry={rbox(0.008, 0.008, D_Z * 0.96, 0.002)} material={RHA_TICK_MAT} />
          </React.Fragment>
        );
      })}

      {/* Ngàm thước kẹp đo chuẩn bề dày 0.80 m phía trên đỉnh khối lăng trụ */}
      <group position={[0, hy + 0.15, hz * 0.78]}>
        <mesh geometry={rbox(W_X, 0.024, 0.024, 0.004)} material={RHA_EDGE_MAT} />
        <mesh position={[-hx, -0.055, 0]} geometry={rbox(0.024, 0.13, 0.024, 0.004)} material={RHA_EDGE_MAT} />
        <mesh position={[hx, -0.055, 0]} geometry={rbox(0.024, 0.13, 0.024, 0.004)} material={RHA_EDGE_MAT} />
      </group>

      {/* Tia gióng quy chiếu nối từ hai má giáp trước tháp pháo & mũi glacis ra mặt sau khối 800 mm RHA */}
      {[-0.95, 0.95].map((gz, gi) => (
        <React.Fragment key={`guide_${gi}`}>
          <mesh position={[-hx - 0.95, 0.42, gz]} geometry={rbox(1.9, 0.01, 0.01, 0.002)} material={RHA_GUIDE_MAT} />
          <mesh position={[-hx - 0.36, -0.58, gz]} geometry={rbox(0.72, 0.01, 0.01, 0.002)} material={RHA_GUIDE_MAT} />
        </React.Fragment>
      ))}
    </group>
  );
};

const C01S02: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  // Tô sáng vùng giáp trước từ mốc 5.84 s; khối lăng trụ thép quy chiếu 0.80 m thu mờ gọn lúc ~8.08 s trước khi đạn bay tới
  const armorActive = t >= CUE.c01_rha_800;
  const prismIn = useSpring(t, CUE.c01_rha_800, 14, 155);
  const prismOut = 1 - prog(t, CUE.c01_block_hold - 0.16, CUE.c01_apfsds_in - 0.22);
  const prismVis = t < CUE.c01_rha_800 ? 0 : Math.max(0, Math.min(1, prismIn * prismOut));

  // Tiến độ bay thẳng siêu thanh của thanh xuyên APFSDS (8.30 s -> 9.24 s)
  const inFlight = t >= CUE.c01_apfsds_in && t < CUE.c01_apfsds_hit;
  const flightP = prog(t, CUE.c01_apfsds_in, CUE.c01_apfsds_hit, (x) => x);
  const dartPos: [number, number, number] = [
    lerp(APFSDS_START[0], APFSDS_HIT[0], flightP),
    lerp(APFSDS_START[1], APFSDS_HIT[1], flightP),
    lerp(APFSDS_START[2], APFSDS_HIT[2], flightP),
  ];

  // Vệt lửa siêu thanh <Trail>: vươn ngang qua 2/3 phải khung hình và lưu ảnh nhiệt 0.65 s sau va chạm
  const afterHitDt = t - CUE.c01_apfsds_hit;
  const trailFade =
    t < CUE.c01_apfsds_in
      ? 0
      : t <= CUE.c01_apfsds_hit
        ? 1
        : Math.max(0, 1 - prog(t, CUE.c01_apfsds_hit, CUE.c01_apfsds_hit + 0.65));
  const trailUpto = t >= CUE.c01_apfsds_hit ? 1 : flightP;

  // Rung chấn xung kích đạn đạo sắc gọn lúc va chạm (9.24 s); chiếc MBT 60 tấn đứng vững như bàn thạch!
  const hitShock = bump(t, CUE.c01_apfsds_hit, 0.28);
  const shakeX = hitShock * Math.sin(afterHitDt * 60) * 0.065;
  const shakeY = hitShock * Math.cos(afterHitDt * 51) * 0.055;
  const tankElasticJolt = -bump(t, CUE.c01_apfsds_hit, 0.14) * 0.015;

  // Góc máy 2 — Side-Oblique Ballistic Intercept Profile (y ≈ 2.66 -> 2.38 m, z ≈ 13.8 -> 11.2 m):
  // Lấy trọn 100% thân MBT (cả giỏ tháp sau & bánh chủ động) ở 1/3 trái khung hình, mở 2/3 phải cho đường đạn APFSDS!
  const camMove = prog(t, CUE.c01_front_armor, SCENE_END, Easing.bezier(0.33, 0, 0.25, 1));
  const camFocusHit = prog(t, CUE.c01_apfsds_in - 0.1, CUE.c01_apfsds_hit + 0.4);

  const camPos: [number, number, number] = [
    lerp(2.1, 1.4, camMove) + shakeX,
    lerp(2.66, 2.38, camMove) + shakeY,
    lerp(13.9, 11.5, camMove),
  ];

  const camLook: [number, number, number] = [
    lerp(3.35, 2.35, camFocusHit) + shakeX * 0.5,
    lerp(1.78, 1.88, camFocusHit) + shakeY * 0.5,
    lerp(0.15, 0.28, camFocusHit),
  ];

  return (
    <AbsoluteFill>
      <Stage width={W} height={H} {...STAGE_BATTLE} shadowCenter={[1.5, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={41} roll={hitShock * Math.sin(afterHitDt * 44) * 0.01} />

        <Terrain h={H_S02} size={440} seg={224} center={[14, -18]} colors={TERRAIN_STEPPE} grainRepeat={46} />

        {/* Đá tảng & bụi cỏ khô thảo nguyên quanh ụ bắn, rừng cây mờ xa sát chân trời */}
        <Scatter
          kind="rock"
          count={75}
          area={[-45, -75, 80, 38]}
          h={H_S02}
          seed={33}
          scale={[0.38, 1.2]}
          avoid={avoidFiringLine}
          tint="#8c8376"
        />
        <Scatter
          kind="bush"
          count={100}
          area={[-45, -80, 80, 38]}
          h={H_S02}
          seed={49}
          scale={[0.55, 1.25]}
          avoid={avoidFiringLine}
          tint="#a29266"
        />
        <Scatter
          kind="pine"
          count={28}
          area={[-80, -135, 105, -64]}
          h={H_S02}
          seed={71}
          scale={[0.75, 1.25]}
          avoid={avoidDistantTreeline}
          tint="#606855"
        />

        {/* MBT đứng sừng sững như bàn thạch ở 1/3 trái khung hình; bật highlightZone="front" từ 5.84 s */}
        <MBT
          position={[tankElasticJolt, 0, 0]}
          turretYaw={0.02}
          gunPitch={0.028}
          highlightZone={armorActive ? 'front' : 'none'}
        />

        {/* Khối lăng trụ thép quy chiếu 0.80 m (800 mm RHA) lơ lửng trước mũi giáp (5.84 s -> ~8.08 s) */}
        <RHAReferencePrism vis={prismVis} />

        {/* Vệt lửa siêu thanh 2 lớp (halo cam + lõi trắng vàng đặt lệch +Z tránh che depth) căng ngang sắc lẹm */}
        {trailFade > 0.005 && trailUpto > 0.01 && (
          <>
            <Trail
              points={APFSDS_HALO_PTS}
              upto={trailUpto}
              color="#ff6214"
              width={0.135 * (0.55 + 0.45 * trailFade)}
              opacity={0.42 * trailFade}
              glow
            />
            <Trail
              points={APFSDS_CORE_PTS}
              upto={trailUpto}
              color="#fff6d4"
              width={0.052 * (0.65 + 0.35 * trailFade)}
              opacity={0.96 * trailFade}
              glow
            />
          </>
        )}

        {/* Thanh xuyên dưới cỡ APFSDS вольфрам nóng trắng-cam có 6 cánh đuôi lao thẳng theo hướng -X */}
        {inFlight && (
          <group position={dartPos} rotation={[0, Math.PI, 0]}>
            <pointLight color="#ffb85c" intensity={22} distance={10} decay={1.6} />
            <mesh geometry={DART_BODY_GEO} material={TUNGSTEN_ROD_MAT} />
            <mesh position={[0.6, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={HOT_NOSE_MAT}>
              <coneGeometry args={[0.04, 0.38, 16]} />
            </mesh>
            {[0, 1, 2, 3, 4, 5].map((fi) => (
              <mesh
                key={fi}
                position={[-0.58, 0, 0]}
                rotation={[(fi * Math.PI) / 3, 0, 0]}
                geometry={DART_FIN_GEO}
                material={TUNGSTEN_ROD_MAT}
              />
            ))}
            <mesh position={[-0.84, 0, 0]} scale={[2.6, 0.5, 0.5]} material={TRACER_GLOW_MAT}>
              <sphereGeometry args={[0.095, 12, 8]} />
            </mesh>
          </group>
        )}

        {/* Vụ nổ động năng chặn đứng viên đạn ngay trên má phải trước tháp pháo (bù tâm cầu lửa +0.65 m của Explosion) */}
        <Explosion
          t={t}
          at={CUE.c01_apfsds_hit}
          pos={[2.22, 1.42, 0.62]}
          size={1.25}
          seed={19}
          smokeLife={3.5}
        />

        {/* Vết nung đỏ không xuyên thủng trên má giáp + vòng xung kích & chùm 26 mảnh thanh xuyên nảy tung tóe ra trước */}
        {afterHitDt >= 0 && afterHitDt < 2.2 && (
          <group position={APFSDS_HIT}>
            {/* Đốm thép nóng đỏ trên má giáp trước chứng minh lớp giáp 800 mm RHA chặn đứng hoàn toàn */}
            <mesh rotation={[0, 0.48, -0.35]}>
              <cylinderGeometry args={[0.17, 0.24, 0.035, 18]} />
              <meshBasicMaterial
                color={afterHitDt < 0.25 ? '#fff6d6' : '#ff6d1f'}
                transparent
                opacity={Math.max(0, 1 - afterHitDt / 2.2) * 0.92}
                toneMapped={false}
              />
            </mesh>

            {/* Vòng sóng xung kích động năng loé nhanh dọc mặt nghiêng má giáp */}
            {afterHitDt < 0.28 && (
              <mesh rotation={[0.15, 0.55, 1.15]} scale={1 + (afterHitDt / 0.28) * 3.2}>
                <torusGeometry args={[0.38, 0.028, 10, 28]} />
                <meshBasicMaterial
                  color="#ffe4a3"
                  transparent
                  opacity={(1 - afterHitDt / 0.28) * 0.85}
                  toneMapped={false}
                />
              </mesh>
            )}

            {/* Chùm 26 mảnh thanh xuyên вольфрам vỡ vụn sáng rực văng chéo ngược ra phía trước (+X, +Y, ±Z) */}
            {afterHitDt < 1.6 &&
              RICOCHET_SHARDS.map((sh, i) => {
                const sx = sh.vx * afterHitDt;
                const sy = sh.vy * afterHitDt - 4.9 * afterHitDt * afterHitDt;
                const sz = sh.vz * afterHitDt;
                if (APFSDS_HIT[1] + sy < 0.05) return null;
                const heat = Math.max(0, 1 - afterHitDt / 1.5);
                return (
                  <mesh
                    key={i}
                    position={[sx, sy, sz]}
                    rotation={[afterHitDt * sh.spinX + i, afterHitDt * sh.spinY, i * 0.7]}
                  >
                    <boxGeometry args={[sh.len, sh.thick, sh.thick]} />
                    <meshBasicMaterial
                      color={afterHitDt < 0.24 ? '#fff8de' : afterHitDt < 0.75 ? '#ff9d3b' : '#d94e1f'}
                      transparent
                      opacity={Math.min(1, heat * 1.45)}
                      toneMapped={false}
                    />
                  </mesh>
                );
              })}
          </group>
        )}
      </Stage>

      <HUDLabel
        t={t}
        from={CUE.c01_rha_800}
        until={CUE.c01_apfsds_hit + 1.2}
        text="800 MM RHA"
        sub="GIÁP TRƯỚC ĐỒNG NHẤT TƯƠNG ĐƯƠNG"
        accent={THEME.armorStrong}
        x={W * 0.25}
        y={SAFE * 2.1}
      />
    </AbsoluteFill>
  );
};

export default C01S02;
