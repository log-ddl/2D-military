// C01S09 (51.54–56.32 s): Góc 9 — Interior Fighting-Compartment X-Ray Cutaway & 120mm Ammo Carousel
// → High-Speed Pull-Back Exterior Catastrophic Ammo Cook-Off on Dusk Steppe.
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { handheld, useSize } from '@core/frame';
import { bump, lerp, mix, prog, rnd, useT } from '@core/time';
import { Explosion, softDot } from '@skill/military/3d/fx';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Track, Wheel } from '@skill/military/3d/parts';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { CUE } from '../cues';
import { HUDLabel, STAGE_BATTLE, TERRAIN_STEPPE, THEME } from '../design';
import { MBT } from '../parts/MBT';
import { ShapedChargeCutaway } from '../parts/ShapedChargeCutaway';

// -------------------- ĐỊA HÌNH CHIẾN TRƯỜNG THẢO NGUYÊN (CẤP MODULE) --------------------
const STEPPE_H = heightField({
  seed: 91,
  amp: 5.5,
  scale: 115,
  flats: [[0, 0, 18, 0]],
  add: (x, z) => {
    const ridgeBack = 11.5 * Math.exp(-(((z + 68) / 36) ** 2)) * (0.7 + 0.3 * Math.sin(x * 0.04));
    const flankMound = 4.2 * Math.exp(-(((x - 36) / 24) ** 2 + ((z + 22) / 26) ** 2));
    return ridgeBack + flankMound;
  },
});

const AVOID_TANK_PAD = (x: number, z: number) => Math.hypot(x, z) < 13.5;

// -------------------- HÌNH HỌC ĐẠN PHÁO 120MM & BIÊN DẠNG MẶT CẮT THÂN TĂNG --------------------
const SHELL_CASING_GEO = (() => {
  const g = lathe(
    [
      [0.001, 0.0],
      [0.078, 0.0],
      [0.078, 0.026],
      [0.072, 0.032],
      [0.074, 0.42],
      [0.06, 0.47],
      [0.001, 0.475],
    ] as P2[],
    22,
  ).clone();
  g.rotateZ(Math.PI / 2);
  return g;
})();

const SHELL_BASE_STUB_GEO = (() => {
  const g = lathe(
    [
      [0.001, -0.002],
      [0.081, -0.002],
      [0.081, 0.052],
      [0.075, 0.058],
      [0.001, 0.058],
    ] as P2[],
    22,
  ).clone();
  g.rotateZ(Math.PI / 2);
  return g;
})();

const SHELL_WARHEAD_GEO = (() => {
  const g = lathe(
    [
      [0.001, 0.465],
      [0.058, 0.47],
      [0.054, 0.61],
      [0.034, 0.72],
      [0.011, 0.81],
      [0.003, 0.855],
    ] as P2[],
    20,
  ).clone();
  g.rotateZ(Math.PI / 2);
  return g;
})();

// Mặt cắt khối giáp mũi composite dày ~800mm RHA ở bên phải (+X) và khoang đuôi ở bên trái (-X) để nhận diện rõ biên dạng xe tăng
const FRONT_HULL_CUT_GEO = extrude(
  [
    [1.48, 0.36],
    [2.62, 0.46],
    [3.58, 0.78],
    [3.68, 0.92],
    [2.92, 1.18],
    [1.76, 1.43],
    [1.48, 1.43],
  ],
  1.38,
  0.016,
);

const REAR_HULL_CUT_GEO = extrude(
  [
    [-3.45, 0.48],
    [-1.52, 0.36],
    [-1.52, 1.45],
    [-3.52, 1.45],
    [-3.68, 1.28],
    [-3.68, 0.72],
  ],
  1.38,
  0.016,
);

const TURRET_CHEEK_CUT_GEO = extrude(
  [
    [1.16, 1.46],
    [2.18, 1.82],
    [2.24, 1.98],
    [1.36, 2.38],
    [0.98, 2.38],
    [1.16, 2.28],
  ],
  1.24,
  0.014,
);

const TURRET_BUSTLE_CUT_GEO = extrude(
  [
    [-2.56, 1.62],
    [-1.38, 1.46],
    [-1.38, 2.38],
    [-2.52, 2.36],
    [-2.62, 2.15],
  ],
  1.24,
  0.014,
);

// 18 quả đạn pháo 120mm xếp tròn trong Mâm Hầm Đạn (Ammo Carousel) dưới sàn giỏ tháp pháo
const CAROUSEL_SLOTS = Array.from({ length: 18 }, (_, i) => {
  const frac = i / 17;
  const angle = lerp(-Math.PI * 0.32, Math.PI * 1.32, frac);
  const radius = 0.88;
  return {
    idx: i,
    angle,
    x: Math.cos(angle) * radius,
    z: -Math.sin(angle) * radius - 0.08,
  };
});

// 4 ống liều phóng trung tâm ngay dưới đường đâm thẳng đứng của luồng xuyên 8 km/s
const CENTER_READY_CHARGES: [number, number, number][] = [
  [-0.14, 0.05, -0.08],
  [0.14, 0.05, -0.08],
  [0.0, 0.05, -0.25],
  [0.0, 0.05, 0.09],
];

const WALL_RACK_X = [-1.02, -0.82, -0.62, 0.62, 0.82, 1.02];
const CUTAWAY_WHEEL_X = [-2.43, -1.63, -0.83, -0.03, 0.77, 1.57, 2.37] as const;

// Cơn mưa mảnh thép spall & tia xỉ đồng nóng đỏ bắn xối xả từ trần thép mỏng xuống mâm đạn
const INTERIOR_SPALL_PARTICLES = Array.from({ length: 52 }, (_, i) => ({
  angle: rnd(i * 13 + 5) * Math.PI * 1.16 + Math.PI * 0.92,
  spread: 0.07 + 0.56 * Math.pow(rnd(i * 19 + 7), 1.2),
  speed: 0.68 + 0.78 * rnd(i * 29 + 11),
  delay: 0.25 * rnd(i * 37 + 3),
  size: 0.014 + 0.022 * rnd(i * 41 + 17),
  streak: i % 2 === 0,
  hot: rnd(i * 53 + 23),
}));

// Tia lửa hồ quang bắn ngang giữa các quả đạn 120mm khi liều phóng bắt đầu bắt lửa dây chuyền
const AMMO_IGNITION_SPARKS = Array.from({ length: 28 }, (_, i) => ({
  az: rnd(i * 17 + 9) * Math.PI * 2,
  r0: 0.08 + 0.72 * rnd(i * 23 + 3),
  up: 0.35 + 0.85 * rnd(i * 31 + 11),
  phase: rnd(i * 43 + 7),
  len: 0.07 + 0.13 * rnd(i * 59 + 13),
}));

// Hạt pháo hoa liều phóng bắn vọt lên trời khi hầm đạn cook-off ở nửa sau
const COOKOFF_SPARKS = Array.from({ length: 48 }, (_, i) => ({
  az: rnd(i * 17 + 3) * Math.PI * 2,
  radialV: 1.6 + 6.2 * rnd(i * 23 + 9),
  upV: 9.0 + 12.5 * rnd(i * 31 + 15),
  delay: 0.42 * rnd(i * 43 + 7),
  size: 0.075 + 0.125 * rnd(i * 59 + 19),
  hot: rnd(i * 67 + 29),
}));

const HYDRAULIC_PIPE_L = pipe(
  [
    [-1.16, 0.54, -0.42],
    [-1.24, 1.15, -0.5],
    [-1.16, 1.88, -0.46],
    [-0.78, 2.26, -0.4],
  ],
  0.017,
  28,
);
const HYDRAULIC_PIPE_R = pipe(
  [
    [1.16, 0.54, -0.42],
    [1.24, 1.15, -0.5],
    [1.16, 1.88, -0.46],
    [0.78, 2.26, -0.4],
  ],
  0.017,
  28,
);

// -------------------- KHOANG CHIẾN ĐẤU X-QUANG CẮT MỞ +Z & MÂM HẦM ĐẠN 120MM --------------------
const FightingCompartmentCutaway: React.FC<{ t: number }> = ({ t }) => {
  const puffTex = useMemo(() => softDot(), []);
  const mats = useMemo(
    () => ({
      hullArmor: paint({
        color: '#4c5642',
        camo: ['#353d30', '#6e6850'],
        repeat: 0.42,
        wear: 0.28,
        dirt: 0.22,
        roughness: 0.58,
        metalness: 0.34,
        seed: 17,
      }),
      interiorWall: plain('#202832', 0.74, 0.28),
      interiorFloor: plain('#151b22', 0.82, 0.32),
      steelCut: plain('#8c99a6', 0.32, 0.72),
      neraLayer: plain('#3c4a58', 0.4, 0.65),
      basketFrame: plain('#3b4654', 0.48, 0.58),
      ivoryBreech: plain('#bcc4ba', 0.46, 0.22),
      breechSteel: plain('#3e4752', 0.36, 0.78),
      brassBase: plain('#e0aa3c', 0.24, 0.85),
      propellantGold: plain('#d49235', 0.42, 0.32),
      warheadDark: plain('#2a332b', 0.45, 0.52),
      warningBand: plain(THEME.amberGold, 0.36, 0.2),
      hydraulicYellow: plain('#d49624', 0.38, 0.45),
    }),
    [],
  );

  const roofPierce = prog(t, CUE.c01_jet_interior, CUE.c01_pierce_roof + 0.22);
  const jetReach = prog(t, CUE.c01_jet_interior + 0.06, CUE.c01_pierce_roof + 0.04, Easing.out(Easing.cubic));
  const spallBurst = prog(t, CUE.c01_pierce_roof - 0.12, CUE.c01_ammo_cookoff - 0.08, (x) => x);
  const ammoHeat = prog(t, CUE.c01_pierce_roof, CUE.c01_ammo_cookoff - 0.1, Easing.inOut(Easing.quad));

  const yJetTop = 2.36;
  const yJetTip = lerp(2.22, 0.48, jetReach);
  const jetLen = Math.max(0.06, yJetTop - yJetTip);

  return (
    <group>
      {/* Ánh sáng khoang trong vừa phải để giữ trọn khối cơ khí của khóa nòng 120mm và mâm đạn đồng */}
      <pointLight position={[0.1, 1.92, 1.45]} color="#cfe4ff" intensity={2.35} distance={6.5} decay={1.5} />
      <pointLight position={[-0.95, 1.12, 1.1]} color="#9ec2f0" intensity={1.85} distance={5.2} decay={1.5} />
      <pointLight
        position={[0.0, 0.82, 0.45]}
        color="#ff741c"
        intensity={2.2 + ammoHeat * 14}
        distance={5.2}
        decay={1.45}
      />
      <pointLight position={[0.0, lerp(2.1, 0.75, jetReach), 0.22]} color="#ffb84d" intensity={4.8} distance={4.2} decay={1.5} />

      {/* ==================== 1. BỐI CẢNH THÂN TĂNG CẮT BỔ X-QUANG (DẢI XÍCH + GIÁP TRƯỚC DÀY + ĐUÔI XE) ==================== */}
      {/* Dải xích và 7 bánh chịu nặng phía nền sau (-Z) giúp nhận diện tức thì đây là lòng xe tăng chủ lực */}
      <Track
        xFront={3.15}
        xRear={-3.25}
        rFront={0.36}
        rRear={0.38}
        width={0.58}
        travel={0}
        color="#2d302c"
        position={[0, 0.035, -1.48]}
      />
      {CUTAWAY_WHEEL_X.map((wx, idx) => (
        <group key={idx} position={[wx, 0.385, -1.48]} scale={[1, 1, -1]}>
          <Wheel r={0.34} width={0.48} spin={0} tire="#1d1f21" rim="#535d47" />
        </group>
      ))}

      {/* Đáy gầm thép thân xe (y = 0.34..0.42 m) + vách cắt thép phay sáng ở z = 0 */}
      <mesh position={[0, 0.38, -0.68]} geometry={rbox(3.04, 0.08, 1.38, 0.01)} material={mats.hullArmor} receiveShadow />
      <mesh position={[0, 0.38, 0.008]} geometry={rbox(3.04, 0.076, 0.014, 0.002)} material={mats.steelCut} />

      {/* Khối mũi xe giáp trước composite dày ~800mm ở bên phải (+X) và khoang động cơ sau ở bên trái (-X) */}
      <group position={[0, 0, -0.68]}>
        <mesh geometry={FRONT_HULL_CUT_GEO} material={mats.hullArmor} castShadow receiveShadow />
        <mesh geometry={REAR_HULL_CUT_GEO} material={mats.hullArmor} castShadow receiveShadow />
        <mesh geometry={TURRET_CHEEK_CUT_GEO} material={mats.hullArmor} castShadow receiveShadow />
        <mesh geometry={TURRET_BUSTLE_CUT_GEO} material={mats.hullArmor} castShadow receiveShadow />
      </group>
      {/* Các tấm lõi gốm-thép NERA lộ gọn bên trong mặt cắt mũi xe (+X) để tương phản với nóc thép mỏng 40mm */}
      {[0, 1, 2].map((li) => (
        <mesh
          key={li}
          position={[2.16 + li * 0.16, 1.02 - li * 0.04, 0.014]}
          rotation={[0, 0, -0.42]}
          geometry={rbox(0.05, 0.54, 0.014, 0.002)}
          material={li % 2 === 0 ? mats.steelCut : mats.neraLayer}
        />
      ))}
      {/* Dàn đạn pháo 120mm xếp ngang trong hốc bustle sau tháp pháo (-X) */}
      {Array.from({ length: 4 }, (_, ri) => (
        <mesh
          key={`bustle_ammo_${ri}`}
          position={[-1.68 - ri * 0.21, 1.98, -0.45]}
          rotation={[Math.PI / 2, 0, 0]}
          material={mats.brassBase}
        >
          <cylinderGeometry args={[0.055, 0.055, 0.72, 14]} />
        </mesh>
      ))}

      {/* Vách lưng khoang chiến đấu (z = -1.34 m) + gân dập chịu lực & hai vách ngăn đứng */}
      <mesh position={[0, 1.38, -1.34]} geometry={rbox(3.02, 1.98, 0.08, 0.012)} material={mats.interiorWall} receiveShadow />
      {[-1.15, -0.58, 0, 0.58, 1.15].map((rx) => (
        <mesh key={rx} position={[rx, 1.38, -1.29]} geometry={rbox(0.048, 1.88, 0.04, 0.006)} material={mats.basketFrame} />
      ))}
      <mesh position={[-1.48, 1.38, -0.68]} geometry={rbox(0.09, 1.96, 1.36, 0.01)} material={mats.interiorWall} />
      <mesh position={[-1.48, 1.38, 0.006]} geometry={rbox(0.088, 1.96, 0.014, 0.002)} material={mats.steelCut} />
      <mesh position={[1.48, 1.38, -0.68]} geometry={rbox(0.09, 1.96, 1.36, 0.01)} material={mats.interiorWall} />
      <mesh position={[1.48, 1.38, 0.006]} geometry={rbox(0.088, 1.96, 0.014, 0.002)} material={mats.steelCut} />

      {/* Vành cổ xoay tháp pháo NẰM NGANG chuẩn xác tại y = 1.44 m (xoay X +π/2 để ôm ngang cổ tháp!) */}
      <mesh position={[0, 1.44, -0.06]} rotation={[Math.PI / 2, 0, Math.PI * 0.92]} material={mats.breechSteel}>
        <torusGeometry args={[1.34, 0.046, 12, 42, Math.PI * 1.16]} />
      </mesh>
      {[-1.34, 1.34].map((xr) => (
        <mesh key={xr} position={[xr, 1.44, 0.01]} geometry={rbox(0.14, 0.1, 0.06, 0.008)} material={mats.steelCut} />
      ))}

      {/* Khung cột lồng giỏ tháp pháo (Turret Basket Struts) & Tuyến ống thủy lực vàng */}
      {[-1.22, 1.22].map((xs) => (
        <group key={xs}>
          <mesh position={[xs, 1.38, -0.22]} geometry={rbox(0.052, 1.9, 0.052, 0.008)} material={mats.basketFrame} />
          <mesh position={[xs * 0.84, 1.38, -0.92]} geometry={rbox(0.046, 1.9, 0.046, 0.008)} material={mats.basketFrame} />
        </group>
      ))}
      <mesh geometry={HYDRAULIC_PIPE_L} material={mats.hydraulicYellow} />
      <mesh geometry={HYDRAULIC_PIPE_R} material={mats.hydraulicYellow} />

      {/* ==================== 2. TẤM TRẦN GIÁP THÉP MỎNG (~40 MM Ở Y ≈ 2.40 M) & ĐẦU ĐẠN NỔ LÕM ==================== */}
      {([-1, 1] as const).map((sgn) => (
        <group key={`roof_${sgn}`} position={[sgn * 0.98, 2.366, -0.62]}>
          <mesh geometry={rbox(1.12, 0.068, 1.24, 0.008)} material={mats.hullArmor} castShadow receiveShadow />
          <mesh position={[0, 0, 0.622]} geometry={rbox(1.12, 0.066, 0.014, 0.002)} material={mats.steelCut} />
        </group>
      ))}
      {/* Vòm nắp trưởng xe phía sau trên nóc tháp pháo */}
      <mesh position={[-0.78, 2.45, -0.58]} material={mats.hullArmor}>
        <cylinderGeometry args={[0.28, 0.31, 0.1, 20]} />
      </mesh>

      {/* Đầu đạn nổ lõm cắt bổ 180° đặt trọn trong khung trên tấm trần thép mỏng y = 2.40 m */}
      <ShapedChargeCutaway
        position={[0, 2.40, 0]}
        scale={0.64}
        detonate={1}
        collapse={0.95}
        jet={1}
        pierce={roofPierce}
        showArmor
      />

      {/* ==================== 3. KHỐI KHÓA NÒNG PHÁO 120MM SƠN TRẮNG NGÀ KỸ THUẬT (CÓ CHI TIẾT CƠ KHÍ RÕ KHỐI) ==================== */}
      <group position={[0.32, 1.78, -0.62]}>
        {/* Khối thân khóa nòng pháo 120mm (Gun Breech Block) sơn trắng ngà kỹ thuật */}
        <mesh geometry={rbox(0.84, 0.42, 0.44, 0.028)} material={mats.ivoryBreech} castShadow receiveShadow />
        {/* Khung sườn gia cường thép xám đậm & cửa nêm khóa nòng để tách khối cơ khí sắc nét */}
        <mesh position={[0.02, 0.0, 0.215]} geometry={rbox(0.68, 0.28, 0.024, 0.006)} material={mats.breechSteel} />
        <mesh position={[-0.18, -0.02, 0.228]} geometry={rbox(0.24, 0.22, 0.022, 0.005)} material={mats.steelCut} />
        {/* Tay gạt mở khóa nòng & vòng đệm đáy buồng đạn */}
        <mesh position={[-0.45, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.breechSteel}>
          <cylinderGeometry args={[0.12, 0.135, 0.09, 22]} />
        </mesh>
        <mesh position={[0.26, -0.14, 0.23]} rotation={[0, 0, -0.45]} geometry={rbox(0.05, 0.34, 0.035, 0.008)} material={mats.breechSteel} />
        {/* Hai xi-lanh thuỷ-khí hãm giật trên đỉnh khóa nòng có đai kẹp thép */}
        {[-0.14, 0.14].map((zc) => (
          <React.Fragment key={zc}>
            <mesh position={[0.26, 0.255, zc]} rotation={[0, 0, Math.PI / 2]} material={mats.ivoryBreech} castShadow>
              <cylinderGeometry args={[0.066, 0.066, 0.92, 20]} />
            </mesh>
            <mesh position={[0.05, 0.255, zc]} rotation={[0, 0, Math.PI / 2]} material={mats.breechSteel}>
              <cylinderGeometry args={[0.074, 0.074, 0.06, 20]} />
            </mesh>
            <mesh position={[0.48, 0.255, zc]} rotation={[0, 0, Math.PI / 2]} material={mats.breechSteel}>
              <cylinderGeometry args={[0.074, 0.074, 0.06, 20]} />
            </mesh>
          </React.Fragment>
        ))}
        {/* Ống bọc gốc nòng pháo nối xuyên ra khiên pháo trước (+X) + cung răng nâng hạ tầm */}
        <mesh position={[0.92, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.breechSteel}>
          <cylinderGeometry args={[0.15, 0.17, 1.12, 24]} />
        </mesh>
        {/* Tấm chắn giật an toàn của pháo thủ & máng nạp đạn */}
        <mesh position={[-0.64, -0.15, 0]} geometry={rbox(0.54, 0.045, 0.26, 0.008)} material={mats.steelCut} />
        <mesh position={[-0.44, -0.12, 0.24]} geometry={rbox(0.04, 0.56, 0.05, 0.008)} material={mats.basketFrame} />
      </group>

      {/* ==================== 4. MÂM HẦM ĐẠN PHÁO 120MM DƯỚI SÀN (18 QUẢ XẾP TRÒN + LIỀU PHÓNG TÂM + GIÁ VÁCH) ==================== */}
      <group position={[0, 0.43, 0]}>
        <mesh position={[0, 0.02, -0.08]} material={mats.interiorFloor} receiveShadow>
          <cylinderGeometry args={[1.1, 1.14, 0.055, 44]} />
        </mesh>
        <mesh position={[0, 0.06, -0.08]} rotation={[Math.PI / 2, 0, 0]} material={mats.basketFrame}>
          <torusGeometry args={[0.88, 0.03, 10, 44]} />
        </mesh>
        <mesh position={[0, 0.35, -0.08]} rotation={[Math.PI / 2, 0, 0]} material={mats.basketFrame}>
          <torusGeometry args={[0.88, 0.022, 10, 44]} />
        </mesh>
        <mesh position={[0, 0.06, -0.08]} material={mats.breechSteel}>
          <cylinderGeometry args={[0.32, 0.35, 0.07, 28]} />
        </mesh>

        {/* 18 quả đạn pháo 120mm xếp tròn sắc nét quanh mâm hầm đạn: rực đỏ-cam khi kích nổ dây chuyền */}
        {CAROUSEL_SLOTS.map((slot) => {
          const wave = Math.max(0, Math.min(1, ammoHeat * 1.48 - (slot.idx % 5) * 0.08));
          const casingMat =
            wave > 0.03
              ? plain(mix('#d49235', '#ff5912', wave), 0.32, 0.28, {
                  emissive: mix('#7a1c00', '#ff6f14', wave),
                  emissiveIntensity: wave * 2.1,
                })
              : mats.propellantGold;
          return (
            <group key={slot.idx} position={[slot.x, 0.05, slot.z]}>
              <mesh geometry={SHELL_BASE_STUB_GEO} material={mats.brassBase} castShadow />
              <mesh geometry={SHELL_CASING_GEO} material={casingMat} castShadow />
              <mesh geometry={SHELL_WARHEAD_GEO} material={mats.warheadDark} castShadow />
              <mesh position={[0, 0.535, 0]} material={mats.warningBand}>
                <cylinderGeometry args={[0.0565, 0.0565, 0.026, 18]} />
              </mesh>
            </group>
          );
        })}

        {/* 4 quả đạn liều phóng trung tâm trúng trực diện luồng xuyên 8 km/s */}
        {CENTER_READY_CHARGES.map(([cx, cy, cz], idx) => {
          const hot = Math.min(1, ammoHeat * 1.75);
          const hotMat =
            hot > 0.02
              ? plain(mix('#e0aa3c', '#ffe89e', hot), 0.25, 0.25, {
                  emissive: '#ff5500',
                  emissiveIntensity: 0.7 + hot * 2.8,
                })
              : mats.propellantGold;
          return (
            <group key={`ready_${idx}`} position={[cx, cy, cz]}>
              <mesh geometry={SHELL_BASE_STUB_GEO} material={mats.brassBase} />
              <mesh geometry={SHELL_CASING_GEO} material={hotMat} />
              <mesh geometry={SHELL_WARHEAD_GEO} material={mats.warheadDark} />
            </group>
          );
        })}

        {/* Cụm chớp lửa liều phóng & tia xỉ cháy lan hữu cơ giữa các quả đạn (KHÔNG dùng quả cầu trong suốt!) */}
        {ammoHeat > 0.04 && (
          <group position={[0, 0.28, -0.04]}>
            {Array.from({ length: 10 }, (_, i) => {
              const a = (i / 10) * Math.PI * 2 + ammoHeat * 2.5;
              const rr = (0.12 + (i % 3) * 0.24) * Math.min(1, 0.4 + ammoHeat * 0.85);
              const sz = (0.34 + (i % 2) * 0.24) * ammoHeat;
              return (
                <sprite key={`ig_${i}`} position={[Math.cos(a) * rr, (i % 3) * 0.12, Math.sin(a) * rr]} scale={[sz, sz, sz]}>
                  <spriteMaterial
                    map={puffTex}
                    color={i % 2 === 0 ? '#ffe6a3' : '#ff6214'}
                    transparent
                    opacity={0.72 * ammoHeat}
                    toneMapped={false}
                    depthWrite={false}
                  />
                </sprite>
              );
            })}
            {AMMO_IGNITION_SPARKS.map((sp, i) => {
              const p = ((ammoHeat * 2.4 + sp.phase) % 1);
              const r = sp.r0 * (0.4 + p * 0.85);
              const x = Math.cos(sp.az) * r;
              const z = Math.sin(sp.az) * r;
              const y = sp.up * p * ammoHeat;
              return (
                <mesh
                  key={`spk_${i}`}
                  position={[x, y, z]}
                  rotation={[0, -sp.az, 0.45]}
                  scale={[0.01, sp.len * (0.5 + ammoHeat), 0.01]}
                >
                  <octahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color={i % 2 === 0 ? '#fff4bd' : '#ff771c'} toneMapped={false} />
                </mesh>
              );
            })}
          </group>
        )}

        {/* Giá đạn vách sau (6 quả 120mm dự trữ dựng dọc sát vách lưng khoang chiến đấu) */}
        <mesh position={[0, 0.4, -1.2]} geometry={rbox(2.38, 0.055, 0.2, 0.01)} material={mats.basketFrame} />
        {WALL_RACK_X.map((wx, idx) => {
          const rackHot = Math.max(0, ammoHeat * 1.2 - 0.18);
          const rackMat =
            rackHot > 0.03
              ? plain(mix('#d49235', '#ff4d00', rackHot), 0.35, 0.3, {
                  emissive: '#ff3b00',
                  emissiveIntensity: rackHot * 1.6,
                })
              : mats.propellantGold;
          return (
            <group key={`wall_${idx}`} position={[wx, 0.06, -1.18]}>
              <mesh geometry={SHELL_BASE_STUB_GEO} material={mats.brassBase} />
              <mesh geometry={SHELL_CASING_GEO} material={rackMat} />
              <mesh geometry={SHELL_WARHEAD_GEO} material={mats.warheadDark} />
            </group>
          );
        })}
      </group>

      {/* ==================== 5. LUỒNG KIM LOẠI ĐỒNG TRẮNG-VÀNG 8 KM/S XUYÊN TRẦN ĐÂM TRÚNG HẦM ĐẠN ==================== */}
      <group>
        <mesh position={[0, yJetTop - jetLen * 0.5, 0]}>
          <cylinderGeometry args={[0.012, 0.007, jetLen, 18]} />
          <meshBasicMaterial color="#fffce8" toneMapped={false} />
        </mesh>
        <mesh position={[0, yJetTop - jetLen * 0.5, 0]}>
          <cylinderGeometry args={[0.026, 0.016, jetLen, 18]} />
          <meshBasicMaterial color={THEME.copperJet} transparent opacity={0.9} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[0, yJetTop - jetLen * 0.5, 0]}>
          <cylinderGeometry args={[0.058, 0.038, jetLen, 18]} />
          <meshBasicMaterial color="#ff4d00" transparent opacity={0.36} toneMapped={false} depthWrite={false} />
        </mesh>

        {/* Mũi xung kích kim loại nóng chảy ở đầu luồng 8 km/s */}
        <mesh position={[0, yJetTip, 0]} scale={[0.055, 0.13, 0.055]}>
          <octahedronGeometry args={[1, 0]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
      </group>

      {/* ==================== 6. MƯA MẢNH VĂNG SPALL NÓNG ĐỎ XỐI XẢ TỪ TRẦN THÉP XUỐNG HẦM ĐẠN ==================== */}
      {spallBurst > 0.01 &&
        INTERIOR_SPALL_PARTICLES.map((p, idx) => {
          const localP = Math.max(0, (spallBurst - p.delay) / (1 - p.delay));
          if (localP <= 0) return null;
          const fall = Math.min(1.82, localP * p.speed * 2.05);
          const radial = 0.04 + fall * p.spread;
          const x = Math.cos(p.angle) * radial;
          const z = Math.sin(p.angle) * radial * 0.75;
          const y = 2.28 - fall;
          const tiltZ = Math.atan2(x, fall + 0.08);
          const tiltX = -Math.atan2(z, fall + 0.08);

          return p.streak ? (
            <mesh key={idx} position={[x, y, z]} rotation={[tiltX, 0, tiltZ]} scale={[0.008, p.size * 5.4, 0.008]}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color={p.hot > 0.45 ? '#fff0ad' : '#ff6214'} toneMapped={false} />
            </mesh>
          ) : (
            <mesh
              key={idx}
              position={[x, y, z]}
              rotation={[localP * 7 + idx, localP * 5, idx]}
              scale={[p.size * 1.5, p.size * 0.6, p.size]}
            >
              <dodecahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color={p.hot > 0.5 ? '#ffc966' : '#ff4500'} toneMapped={false} />
            </mesh>
          );
        })}
    </group>
  );
};

// -------------------- CỘT LỬA PHÁO HOA NẤU CHẢY HẦM ĐẠN HỮU CƠ (VOLUMETRIC COOK-OFF BLOWTORCH) --------------------
const AmmoCookOffGeyser: React.FC<{ t: number }> = ({ t }) => {
  const puffTex = useMemo(() => softDot(), []);
  const dt = t - CUE.c01_ammo_cookoff;
  if (dt < 0) return null;

  const erupt = prog(t, CUE.c01_ammo_cookoff, CUE.c01_ammo_cookoff + 0.28, Easing.out(Easing.cubic));
  const sustain = 0.88 + 0.12 * Math.sin(dt * 24);
  const plumeHeight = (5.5 + 6.8 * erupt) * sustain;

  return (
    <group position={[-0.08, 2.38, 0]}>
      {/* Ánh sáng lửa cook-off hắt sáng rực mặt nóc tháp pháo & bụi đất xung quanh */}
      <pointLight position={[0, 2.6, 0]} color="#ff9836" intensity={65 * erupt * sustain} distance={32} decay={1.45} />

      {/* 34 cụm cầu lửa & khói đen cuồn cuộn hữu cơ phụt dựng đứng từ các cửa nắp tháp pháo (tuyệt đối KHÔNG dùng ống trụ cứng) */}
      {Array.from({ length: 34 }, (_, i) => {
        const stream = i % 2 === 0 ? 0 : 1; // 2 luồng lửa phụt từ cửa nắp trưởng xe (+Z) và cửa nạp đạn (-Z) hòa vào nhau
        const baseZ = stream === 0 ? 0.42 : -0.46;
        const baseX = stream === 0 ? -0.18 : -0.38;
        const cycle = (dt * (1.55 + (i % 5) * 0.14) + i / 34) % 1;
        const y = cycle * plumeHeight;
        const turbX = Math.sin(i * 9.1 + dt * 8.5) * (0.14 + cycle * 0.95);
        const turbZ = Math.cos(i * 13.7 + dt * 7.8) * (0.14 + cycle * 0.95);
        const sz = (1.35 + cycle * 3.4) * erupt;
        const col =
          cycle < 0.28
            ? '#fff9db'
            : cycle < 0.58
              ? '#ffb636'
              : cycle < 0.82
                ? '#ff520d'
                : '#2b2522';
        const op = (cycle < 0.82 ? (1 - cycle * 0.45) * 0.92 : (1 - cycle) * 2.8) * erupt;
        return (
          <sprite
            key={`jet_${i}`}
            position={[baseX * (1 - cycle * 0.5) + turbX, y, baseZ * (1 - cycle * 0.65) + turbZ]}
            scale={[sz, sz * 1.32, sz]}
          >
            <spriteMaterial
              map={puffTex}
              color={col}
              transparent
              opacity={op}
              toneMapped={cycle >= 0.82}
              depthWrite={false}
            />
          </sprite>
        );
      })}

      {/* Lưỡi lửa áp suất cao xì phụt ngang qua khe cổ tháp pháo (y ≈ 1.46 m -> local -0.92 m) bằng cụm khói lửa hữu cơ */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + dt * 1.2;
        const cycle = (dt * 2.1 + i / 14) % 1;
        const r = 1.25 + cycle * 1.95;
        const sz = (0.75 + cycle * 1.35) * erupt;
        const op = (1 - cycle) * 0.68 * Math.max(0.3, 1 - dt * 0.25);
        return (
          <sprite
            key={`ring_${i}`}
            position={[Math.cos(a) * r, -0.9 + cycle * 0.35, Math.sin(a) * r]}
            scale={[sz, sz * 0.75, sz]}
          >
            <spriteMaterial
              map={puffTex}
              color={cycle < 0.4 ? '#ffd075' : '#ff5912'}
              transparent
              opacity={op}
              toneMapped={false}
              depthWrite={false}
            />
          </sprite>
        );
      })}

      {/* 48 tia pháo hoa thuốc phóng nóng chảy văng parabol rực sáng lên bầu trời hoàng hôn */}
      {COOKOFF_SPARKS.map((sp, i) => {
        const age = dt - sp.delay;
        if (age <= 0 || age > 1.9) return null;
        const r = sp.radialV * age;
        const x = Math.cos(sp.az) * r;
        const z = Math.sin(sp.az) * r;
        const y = sp.upV * age - 4.9 * age * age;
        if (y < -2.1) return null;
        return (
          <mesh
            key={`sp_${i}`}
            position={[x, y, z]}
            rotation={[age * 8, sp.az, 0]}
            scale={[sp.size * 0.52, sp.size * 2.8, sp.size * 0.52]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshBasicMaterial color={sp.hot > 0.45 ? '#fff4bd' : '#ff6e1a'} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

// -------------------- COMPONENT CHÍNH C01S09 --------------------
const C01S09: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  const pullStart = CUE.c01_ammo_cookoff - 0.25;
  const pullEnd = CUE.c01_ammo_cookoff + 0.34;
  const pullP = prog(t, pullStart, pullEnd, Easing.bezier(0.22, 0.9, 0.24, 1));
  const isExterior = t >= CUE.c01_ammo_cookoff - 0.12;

  // Nửa đầu: Góc cận X-quang ôm trọn từ đầu đạn nổ lõm trên trần (y=3.05 m) xuống hết mâm hầm đạn 120mm (y=0.4 m)
  const interiorTrack = prog(t, CUE.c01_jet_interior, pullStart);
  const intPos: V3 = [
    lerp(0.28, 0.16, interiorTrack),
    lerp(1.62, 1.48, interiorTrack),
    lerp(3.38, 3.16, interiorTrack),
  ];
  const intLook: V3 = [0, lerp(1.62, 1.42, interiorTrack), -0.08];

  // Nửa sau: Cú Pull-Back tốc độ cao ra cự ly ~20 m chếch cao thấy rõ toàn bộ chiếc MBT & cột pháo hoa lửa cook-off cao vút
  const extDrift = prog(t, CUE.c01_ammo_cookoff, CUE.c01_survive_aps, (x) => x);
  const extPos: V3 = [
    lerp(-8.2, -9.4, extDrift),
    lerp(5.8, 6.6, extDrift),
    lerp(17.6, 19.4, extDrift),
  ];
  const extLook: V3 = [0, lerp(3.1, 3.8, extDrift), 0];

  const pierceShake = bump(t, CUE.c01_pierce_roof, 0.42) * 0.04;
  const cookoffDecay = t >= CUE.c01_ammo_cookoff ? Math.exp(-(t - CUE.c01_ammo_cookoff) * 2.1) : 0;
  const shakeAmp = pierceShake + cookoffDecay * 0.44;
  const [sx, sy] = handheld(t * 16, shakeAmp, 'c01s09_blast');

  const camPos: V3 = [
    lerp(intPos[0], extPos[0], pullP) + sx,
    lerp(intPos[1], extPos[1], pullP) + sy,
    lerp(intPos[2], extPos[2], pullP),
  ];
  const camLook: V3 = [
    lerp(intLook[0], extLook[0], pullP) + sx * 0.35,
    lerp(intLook[1], extLook[1], pullP) + sy * 0.35,
    lerp(intLook[2], extLook[2], pullP),
  ];
  const camFov = lerp(54, 42, pullP);
  const camRoll = sx * 0.042;

  const charredAmt = prog(t, CUE.c01_ammo_cookoff, CUE.c01_ammo_cookoff + 0.9);
  const blownYaw = 0.26 * prog(t, CUE.c01_ammo_cookoff, CUE.c01_ammo_cookoff + 0.8, Easing.out(Easing.cubic));
  const blownPitch = 0.03 - 0.14 * prog(t, CUE.c01_ammo_cookoff, CUE.c01_ammo_cookoff + 0.75);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_BATTLE} width={W} height={H} shadowArea={26} shadowCenter={[0, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        <Terrain h={STEPPE_H} size={420} seg={220} colors={TERRAIN_STEPPE} />
        <Scatter kind="pine" count={55} area={[-160, -170, 160, -24]} h={STEPPE_H} seed={19} scale={[0.85, 1.45]} tint="#9e967e" />
        <Scatter kind="bush" count={85} area={[-110, -110, 110, 85]} h={STEPPE_H} seed={37} scale={[0.65, 1.25]} avoid={AVOID_TANK_PAD} tint="#8f8665" />
        <Scatter kind="rock" count={48} area={[-95, -95, 95, 75]} h={STEPPE_H} seed={53} scale={[0.5, 1.2]} avoid={AVOID_TANK_PAD} tint="#7c756c" />

        {!isExterior ? (
          <FightingCompartmentCutaway t={t} />
        ) : (
          <MBT
            position={[0, 0, 0]}
            charred={charredAmt}
            turretYaw={blownYaw}
            gunPitch={blownPitch}
            recoil={0.28 * charredAmt}
          />
        )}

        {/* Vụ nổ hầm đạn dây chuyền dữ dội đúng CUE.c01_ammo_cookoff (54.70 s) cỡ vừa khít cự ly máy để không nuốt trọn ống kính */}
        <Explosion
          t={t}
          at={CUE.c01_ammo_cookoff}
          pos={[0, 2.35, 0]}
          size={4.3}
          seed={9}
          smokeLife={6}
          smoke="#3a3430"
        />
        <AmmoCookOffGeyser t={t} />
      </Stage>

      <HUDLabel
        t={t}
        from={CUE.c01_speed_8kms}
        until={CUE.c01_ammo_cookoff}
        text="8 KM/S"
        sub="XUYÊN THỦNG NÓC · ĐÂM TRÚNG HẦM ĐẠN"
        accent={THEME.copperJet}
        x={W * 0.74}
        y={SAFE * 2.2}
      />
    </AbsoluteFill>
  );
};

export default C01S09;
