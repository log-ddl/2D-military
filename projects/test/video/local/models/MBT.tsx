// Mô hình 3D riêng của dự án `test`: Xe tăng chủ lực hiện đại (MBT, tỉ lệ thật tính bằng mét).
// Thân dài 7.90 m (cả pháo 9.65 m), rộng 3.68 m, cao nóc tháp pháo 2.42 m. Mũi hướng +X, trên +Y, mặt đất y = 0.
import React, { useMemo } from 'react';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Track, Wheel } from '@lib/3d/parts';

export type MBTProps = {
  /** Quãng đường xe đi (m) -> chạy dải xích và quay bánh xe. */
  travel?: number;
  /** Góc xoay tháp pháo quanh trục Y (rad). */
  turretYaw?: number;
  /** Góc nâng nòng pháo 120mm (rad, dương = ngẩng lên). */
  gunElev?: number;
  /** Độ giật lùi nòng pháo (m). */
  recoil?: number;
  /** Góc xoay kính ngắm độc lập trưởng xe CITV (rad). */
  citvYaw?: number;
  /** Bật tổ hợp phòng vệ chủ động APS (4 mặt radar AESA + 2 bệ phóng đánh chặn). */
  aps?: boolean;
  /** Góc xoay ngang bệ phóng đạn đánh chặn APS (rad). */
  apsYaw?: number;
};

const HULL_PROFILE: P2[] = [
  [-3.05, 0.44],
  [3.12, 0.45],
  [3.95, 0.96],
  [2.15, 1.48],
  [-1.42, 1.54],
  [-1.55, 1.66],
  [-3.78, 1.64],
  [-3.95, 1.46],
  [-3.84, 0.56],
];

const SPONSON_PROFILE: P2[] = [
  [-3.75, 1.02],
  [3.52, 1.02],
  [3.88, 1.12],
  [3.62, 1.38],
  [2.12, 1.46],
  [-1.45, 1.50],
  [-1.58, 1.60],
  [-3.82, 1.58],
];

// Biên dạng nhìn ngang của lõi tháp pháo (gốc tại tâm vòng tháp [0.25, 1.54, 0])
const TURRET_CORE_SIDE: P2[] = [
  [-2.58, 0.10],
  [1.10, 0.0],
  [1.62, 0.36],
  [0.82, 0.86],
  [-0.85, 0.88],
  [-2.62, 0.80],
  [-2.70, 0.34],
];

// Biên dạng nhìn ngang của má giáp mũi tên vát nhọn (arrowhead composite cheek armor kiểu Leopard 2A7 / M1A2)
const CHEEK_WEDGE_SIDE: P2[] = [
  [-0.52, 0.06],
  [1.15, 0.06],
  [1.96, 0.44],
  [1.12, 0.84],
  [-0.52, 0.84],
];

// Biên dạng nhìn từ trên (X-Z) cho phần mở rộng sườn má tháp pháo
const CHEEK_RIGHT_TOP: P2[] = [
  [0.05, 0.36],
  [1.32, 0.36],
  [1.72, 0.66],
  [1.24, 1.38],
  [-0.52, 1.42],
  [-0.58, 0.86],
];

const CHEEK_LEFT_TOP: P2[] = CHEEK_RIGHT_TOP.map(([x, z]): P2 => [x, -z]).reverse();

// Nòng pháo trơn 120mm L/55 có ốp cách nhiệt, bầu hút khói (bore evacuator) và cảm biến đầu nòng
const BARREL_PROFILE: P2[] = [
  [0.145, 0.0],
  [0.145, 0.45],
  [0.118, 0.52],
  [0.112, 1.45],
  [0.168, 1.55],
  [0.172, 2.22],
  [0.105, 2.34],
  [0.098, 3.55],
  [0.094, 4.22],
  [0.112, 4.26],
  [0.112, 4.38],
  [0.072, 4.38],
  [0.068, 4.25],
];

const WHEEL_XS = [-2.55, -1.72, -0.89, -0.06, 0.77, 1.60, 2.43];
const SKIRT_PANELS: [number, number, number][] = [
  [3.12, 0.82, 0.62],
  [2.24, 0.88, 0.64],
  [1.32, 0.88, 0.64],
  [0.40, 0.88, 0.62],
  [-0.52, 0.88, 0.56],
  [-1.44, 0.88, 0.50],
  [-2.34, 0.84, 0.44],
];

export const MBT: React.FC<MBTProps> = ({
  travel = 0,
  turretYaw = 0,
  gunElev = 0.03,
  recoil = 0,
  citvYaw = 0.35,
  aps = false,
  apsYaw = 0.4,
}) => {
  const matArmor = useMemo(
    () => paint({ color: '#6e795c', camo: ['#48533e', '#ab986e'], camoScale: 0.75, wear: 0.28, dirt: 0.38, roughness: 0.62, metalness: 0.32, seed: 7 }),
    [],
  );
  const matSkirt = useMemo(
    () => paint({ color: '#636e53', camo: ['#424c39', '#9e8c65'], camoScale: 0.85, wear: 0.34, dirt: 0.45, roughness: 0.65, metalness: 0.3, seed: 19 }),
    [],
  );
  const matTurret = useMemo(
    () => paint({ color: '#737e60', camo: ['#4b5641', '#b09d73'], camoScale: 0.72, wear: 0.25, dirt: 0.22, roughness: 0.58, metalness: 0.35, seed: 13 }),
    [],
  );
  const matGun = plain('#3a3f37', 0.46, 0.58);
  const matDark = plain('#1f211e', 0.86, 0.22);
  const matRubber = plain('#232422', 0.92, 0.05);
  const matOptic = plain('#185566', 0.14, 0.88);
  const matRadar = plain('#24384a', 0.28, 0.68);
  const matRadarTrim = plain('#2be8d8', 0.22, 0.3);

  const hullGeo = useMemo(() => extrude(HULL_PROFILE, 2.28, 0.05), []);
  const sponsonGeo = useMemo(() => extrude(SPONSON_PROFILE, 0.72, 0.03), []);
  const turretCoreGeo = useMemo(() => extrude(TURRET_CORE_SIDE, 2.24, 0.06), []);
  const cheekWedgeGeo = useMemo(() => extrude(CHEEK_WEDGE_SIDE, 0.96, 0.045), []);
  const cheekRGeo = useMemo(() => extrudeTop(CHEEK_RIGHT_TOP, 0.68, 0.045), []);
  const cheekLGeo = useMemo(() => extrudeTop(CHEEK_LEFT_TOP, 0.68, 0.045), []);
  const barrelGeo = useMemo(() => lathe(BARREL_PROFILE, 32), []);
  const smokeTubeGeo = useMemo(() => lathe([[0.042, 0], [0.045, 0.28], [0.048, 0.32], [0.032, 0.32]], 14), []);

  const basketRailR = useMemo(
    () => pipe([[-0.75, 0.72, 1.14], [-0.95, 0.72, 1.38], [-2.48, 0.72, 1.34], [-2.55, 0.72, 1.08]], 0.022, 24),
    [],
  );
  const basketRailL = useMemo(
    () => pipe([[-0.75, 0.72, -1.14], [-0.95, 0.72, -1.38], [-2.48, 0.72, -1.34], [-2.55, 0.72, -1.08]], 0.022, 24),
    [],
  );
  const rearRackTop = useMemo(
    () => pipe([[-2.58, 0.74, -1.08], [-2.98, 0.74, -0.96], [-2.98, 0.74, 0.96], [-2.58, 0.74, 1.08]], 0.022, 24),
    [],
  );
  const rearRackBot = useMemo(
    () => pipe([[-2.58, 0.34, -1.08], [-2.94, 0.34, -0.94], [-2.94, 0.34, 0.94], [-2.58, 0.34, 1.08]], 0.022, 24),
    [],
  );
  const antR = useMemo(() => pipe([[-2.42, 0.84, 0.98], [-2.48, 1.65, 1.01], [-2.58, 2.45, 1.04]], 0.012, 16), []);
  const antL = useMemo(() => pipe([[-2.42, 0.84, -0.98], [-2.47, 1.55, -1.0], [-2.56, 2.25, -1.03]], 0.012, 16), []);
  const towCable = useMemo(
    () => pipe([[2.95, 1.44, 1.02], [1.4, 1.53, 1.32], [-1.2, 1.56, 1.34], [-3.1, 1.66, 1.05]], 0.026, 28),
    [],
  );

  const skirtRivets = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (const side of [-1, 1]) {
      for (const [cx] of SKIRT_PANELS) {
        pts.push([cx - 0.32, 1.24, side * 1.845], [cx + 0.32, 1.24, side * 1.845]);
      }
      for (let i = 0; i < 6; i++) {
        pts.push([2.35 + i * 0.24, 1.48 - i * 0.085, side * 0.98]);
      }
    }
    return pts;
  }, []);

  const roadSpin = travel / 0.33;
  const idlerSpin = travel / 0.3;
  const sprocketSpin = travel / 0.33;

  return (
    <group>
      {/* ==================== THÂN XE CHÍNH & GIÁP MŨI ==================== */}
      <mesh geometry={hullGeo} material={matArmor} castShadow receiveShadow />

      {/* Tấm giáp composite tăng cường trên mặt vát trước (upper glacis) */}
      <mesh geometry={rbox(1.86, 0.11, 2.12, 0.025)} material={matSkirt} position={[3.02, 1.25, 0]} rotation={[0, 0, -0.28]} castShadow receiveShadow />

      {/* Nắp lái xe & 3 kính tiềm vọng trước tháp pháo */}
      <group position={[2.28, 1.51, 0]}>
        <mesh geometry={rbox(0.46, 0.11, 0.64, 0.03)} material={matArmor} castShadow />
        {[-0.18, 0, 0.18].map((z, i) => (
          <mesh key={i} geometry={rbox(0.12, 0.07, 0.13, 0.01)} material={matOptic} position={[0.19, 0.04, z]} rotation={[0, z * -0.45, 0]} />
        ))}
      </group>

      {/* Hai móc kéo thép đúc mũi xe & cụm đèn pha bọc khung bảo vệ */}
      {[-1, 1].map((side) => (
        <React.Fragment key={`front-${side}`}>
          <mesh geometry={rbox(0.24, 0.14, 0.1, 0.03)} material={matGun} position={[3.93, 0.88, side * 0.82]} castShadow />
          <mesh geometry={rbox(0.22, 0.18, 0.24, 0.03)} material={matArmor} position={[3.68, 1.28, side * 1.42]} castShadow />
          <mesh position={[3.79, 1.28, side * 1.42]} rotation={[0, 0, Math.PI / 2]} material={plain('#f5e7c4', 0.2, 0.1)}>
            <cylinderGeometry args={[0.06, 0.06, 0.03, 16]} />
          </mesh>
        </React.Fragment>
      ))}

      {/* Cáp kéo dự phòng chạy dọc sườn phải */}
      <mesh geometry={towCable} material={matGun} castShadow />

      {/* Lưới tản nhiệt động cơ tuốc-bin/diesel phía sau & cửa xả khói đuôi */}
      {[-0.62, 0.62].map((z, idx) => (
        <group key={`grille-${idx}`} position={[-2.62, 1.66, z]}>
          <mesh geometry={rbox(1.72, 0.04, 0.86, 0.01)} material={matDark} receiveShadow />
          {Array.from({ length: 9 }, (_, k) => (
            <mesh key={k} geometry={rbox(0.06, 0.055, 0.8, 0.008)} material={matGun} position={[-0.72 + k * 0.18, 0.015, 0]} />
          ))}
        </group>
      ))}
      <mesh geometry={rbox(0.12, 0.42, 1.48, 0.02)} material={matDark} position={[-3.92, 1.18, 0]} />
      {[-1, 1].map((side) => (
        <mesh key={`tail-${side}`} geometry={rbox(0.08, 0.1, 0.18, 0.02)} material={plain('#a8241d', 0.35, 0.2)} position={[-3.94, 1.36, side * 1.38]} />
      ))}

      {/* ==================== HỆ THỐNG HÀNH TIẾN & VÁY CHẮN XÍCH HAI BÊN ==================== */}
      {([-1, 1] as const).map((side) => (
        <React.Fragment key={`side-${side}`}>
          {/* Hốc chắn bùn trên xích */}
          <mesh geometry={sponsonGeo} material={matArmor} position={[0, 0, side * 1.47]} castShadow receiveShadow />
          {/* Chắn bùn cao su trước/sau */}
          <mesh geometry={rbox(0.28, 0.34, 0.68, 0.02)} material={matRubber} position={[3.82, 0.94, side * 1.48]} rotation={[0, 0, -0.45]} />
          <mesh geometry={rbox(0.18, 0.36, 0.68, 0.02)} material={matRubber} position={[-3.84, 0.92, side * 1.48]} rotation={[0, 0, 0.3]} />

          {/* 7 tấm váy giáp phản ứng nổ (ERA Side Skirts) dọc hai bên sườn */}
          {SKIRT_PANELS.map(([cx, w, h], idx) => (
            <mesh
              key={idx}
              geometry={rbox(w, h, 0.11, 0.02)}
              material={matSkirt}
              position={[cx, 1.32 - h / 2, side * 1.79]}
              castShadow
              receiveShadow
            />
          ))}

          {/* Dải xích (đáy ở y = 0) */}
          <Track xFront={3.32} xRear={-3.34} rFront={0.35} rRear={0.38} width={0.62} travel={travel} color="#2f2f2c" position={[0, 0, side * 1.48]} />

          {/* Bánh chịu nặng (7 bánh), bánh dẫn hướng trước & bánh sao chủ động sau — xoay mặt hub hướng ra ngoài */}
          <group position={[0, 0, side * 1.48]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
            {WHEEL_XS.map((wx, i) => (
              <Wheel key={i} r={0.33} width={0.48} spin={side * roadSpin} tire="#242523" rim="#5b654f" bolts={8} position={[side * wx, 0.39, 0]} />
            ))}
            {/* Bánh dẫn hướng trước */}
            <Wheel r={0.29} width={0.44} spin={side * idlerSpin} tire="#2b2c29" rim="#545e49" bolts={6} position={[side * 3.32, 0.43, 0]} />
            {/* Bánh sao chủ động sau + vành răng kéo xích */}
            <Wheel r={0.32} width={0.46} spin={side * sprocketSpin} tire="#383b35" rim="#4e5744" bolts={10} position={[side * -3.34, 0.45, 0]} />
            {Array.from({ length: 12 }, (_, tIdx) => {
              const ang = (tIdx / 12) * Math.PI * 2 - side * sprocketSpin;
              return (
                <mesh
                  key={tIdx}
                  geometry={rbox(0.07, 0.09, 0.44, 0.01)}
                  material={matGun}
                  position={[side * -3.34 + Math.cos(ang) * 0.34, 0.45 + Math.sin(ang) * 0.34, 0]}
                  rotation={[0, 0, ang]}
                />
              );
            })}
            {/* Con lăn đỡ xích trên */}
            {[-1.85, -0.05, 1.75].map((rx, ri) => (
              <mesh key={ri} position={[side * rx, 0.84, 0]} rotation={[Math.PI / 2, 0, 0]} material={matGun}>
                <cylinderGeometry args={[0.1, 0.1, 0.38, 14]} />
              </mesh>
            ))}
          </group>
        </React.Fragment>
      ))}

      <Rivets points={skirtRivets} r={0.02} color="#404838" />

      {/* ==================== THÁP PHÁO XOAY & PHÁO CHÍNH 120MM ==================== */}
      <group position={[0.25, 1.54, 0]} rotation={[0, turretYaw, 0]}>
        {/* Thân tháp pháo chính & khoang đạn sau (bustle) */}
        <mesh geometry={turretCoreGeo} material={matTurret} castShadow receiveShadow />

        {/* Hai khối giáp composite má tháp pháo vát mũi tên nhọn (arrowhead wedge cheeks) */}
        <mesh geometry={cheekRGeo} material={matArmor} position={[0, 0.08, 0]} castShadow receiveShadow />
        <mesh geometry={cheekLGeo} material={matArmor} position={[0, 0.08, 0]} castShadow receiveShadow />
        <mesh geometry={cheekWedgeGeo} material={matTurret} position={[0.06, 0.02, 0.86]} rotation={[0, -0.14, 0]} castShadow receiveShadow />
        <mesh geometry={cheekWedgeGeo} material={matTurret} position={[0.06, 0.02, -0.86]} rotation={[0, 0.14, 0]} castShadow receiveShadow />

        {/* 3 tấm xả áp hầm đạn (blowout panels) trên nóc khoang đạn sau tháp pháo */}
        {[-0.62, 0, 0.62].map((z, bi) => (
          <mesh key={bi} geometry={rbox(0.92, 0.04, 0.52, 0.01)} material={matSkirt} position={[-1.72, 0.85, z]} castShadow />
        ))}

        {/* Giỏ chứa đồ khung ống thép hai bên sườn & sau tháp pháo */}
        <mesh geometry={basketRailR} material={matGun} castShadow />
        <mesh geometry={basketRailL} material={matGun} castShadow />
        <mesh geometry={rearRackTop} material={matGun} castShadow />
        <mesh geometry={rearRackBot} material={matGun} castShadow />
        {[-1, 1].map((side) => (
          <React.Fragment key={`stow-${side}`}>
            <mesh geometry={rbox(1.36, 0.34, 0.22, 0.03)} material={matSkirt} position={[-1.68, 0.52, side * 1.24]} castShadow />
            {/* Cụm 4 ống phóng lựu đạn khói ngụy trang mỗi bên má tháp pháo */}
            <group position={[0.42, 0.48, side * 1.42]} rotation={[0, side * -0.35, 0.38]}>
              {[0, 1, 2, 3].map((si) => (
                <mesh
                  key={si}
                  geometry={smokeTubeGeo}
                  material={matGun}
                  position={[(si % 2) * 0.09, Math.floor(si / 2) * 0.1, side * (si - 1.5) * 0.06]}
                  rotation={[0, side * (si - 1.5) * 0.12, 0.15]}
                  castShadow
                />
              ))}
            </group>
          </React.Fragment>
        ))}

        {/* Kính ngắm chính pháo thủ (GPS doghouse bên phải mặt trước nóc tháp pháo) */}
        <group position={[0.58, 0.94, 0.58]}>
          <mesh geometry={rbox(0.46, 0.24, 0.34, 0.03)} material={matArmor} castShadow />
          <mesh geometry={rbox(0.08, 0.14, 0.22, 0.01)} material={matOptic} position={[0.21, 0, 0]} />
        </group>

        {/* Kính ngắm toàn cảnh độc lập của trưởng xe (CITV bên trái) */}
        <group position={[0.18, 0.94, -0.58]} rotation={[0, citvYaw, 0]}>
          <mesh material={matArmor} castShadow>
            <cylinderGeometry args={[0.18, 0.21, 0.22, 20]} />
          </mesh>
          <mesh geometry={rbox(0.32, 0.22, 0.28, 0.04)} material={matSkirt} position={[0.02, 0.18, 0]} castShadow />
          <mesh position={[0.17, 0.19, 0.06]} rotation={[0, 0, Math.PI / 2]} material={matOptic}>
            <cylinderGeometry args={[0.055, 0.055, 0.03, 16]} />
          </mesh>
          <mesh position={[0.17, 0.19, -0.07]} rotation={[0, 0, Math.PI / 2]} material={matOptic}>
            <cylinderGeometry args={[0.04, 0.04, 0.03, 16]} />
          </mesh>
        </group>

        {/* Tháp chỉ huy trưởng xe + vòng kính tiềm vọng + đại liên 12.7mm trên nóc */}
        <group position={[-0.42, 0.9, 0.56]}>
          <mesh material={matArmor} castShadow>
            <cylinderGeometry args={[0.38, 0.42, 0.14, 20]} />
          </mesh>
          <mesh geometry={rbox(0.52, 0.05, 0.52, 0.02)} material={matSkirt} position={[-0.08, 0.09, 0]} />
          {/* Giá súng máy 12.7mm phòng không */}
          <group position={[0.22, 0.24, 0]}>
            <mesh geometry={rbox(0.46, 0.14, 0.11, 0.02)} material={matGun} castShadow />
            <mesh geometry={rbox(0.18, 0.18, 0.12, 0.02)} material={matArmor} position={[-0.04, -0.02, 0.12]} />
            <mesh position={[0.58, 0.02, 0]} rotation={[0, 0, -Math.PI / 2]} material={matGun} castShadow>
              <cylinderGeometry args={[0.022, 0.026, 0.78, 12]} />
            </mesh>
          </group>
        </group>

        {/* Nắp pháo thủ bên trái */}
        <mesh position={[-0.52, 0.89, -0.54]} material={matSkirt} castShadow>
          <cylinderGeometry args={[0.32, 0.34, 0.08, 18]} />
        </mesh>

        {/* Hai cần ăng-ten liên lạc mảnh phía đuôi tháp pháo */}
        <mesh geometry={antR} material={matDark} />
        <mesh geometry={antL} material={matDark} />

        {/* ==================== PHÁO CHÍNH 120MM L/55 & KHIÊN PHÁO ==================== */}
        <group position={[1.28, 0.42, 0]} rotation={[0, 0, gunElev]}>
          <group position={[-recoil, 0, 0]}>
            {/* Khiên pháo (gun mantlet) + lỗ súng máy đồng trục */}
            <mesh geometry={rbox(0.56, 0.48, 0.62, 0.05)} material={matArmor} position={[0.05, 0, 0]} castShadow receiveShadow />
            <mesh position={[0.36, 0.06, -0.22]} rotation={[0, 0, -Math.PI / 2]} material={matDark}>
              <cylinderGeometry args={[0.024, 0.024, 0.18, 10]} />
            </mesh>
            {/* Nòng trơn 120mm */}
            <mesh geometry={barrelGeo} material={matGun} position={[0.22, 0, 0]} castShadow receiveShadow />
            {/* Cảm biến hiệu chuẩn đầu nòng (MRS) */}
            <mesh geometry={rbox(0.09, 0.11, 0.05, 0.01)} material={matGun} position={[4.54, 0.14, 0]} />
          </group>
        </group>

        {/* ==================== TỔ HỢP PHÒNG VỆ CHỦ ĐỘNG APS (S07) ==================== */}
        {aps && (
          <group>
            {/* 4 tấm ăng-ten radar mảng pha AESA đặt lộ rõ ở 4 góc tháp pháo (quét đủ 360 độ) */}
            {(
              [
                [1.18, 0.68, 1.44, -0.68],
                [1.18, 0.68, -1.44, 0.68],
                [-2.42, 0.68, 1.28, -2.42],
                [-2.42, 0.68, -1.28, 2.42],
              ] as [number, number, number, number][]
            ).map(([rx, ry, rz, yaw], idx) => (
              <group key={`radar-${idx}`} position={[rx, ry, rz]} rotation={[0, yaw, 0.14]}>
                <mesh geometry={rbox(0.16, 0.38, 0.5, 0.025)} material={matSkirt} castShadow />
                <mesh geometry={rbox(0.04, 0.3, 0.42, 0.01)} material={matRadar} position={[0.075, 0, 0]} />
                <mesh geometry={rbox(0.048, 0.036, 0.4, 0.005)} material={matRadarTrim} position={[0.078, 0.14, 0]} />
              </group>
            ))}

            {/* 2 bệ phóng đạn đánh chặn xoay nhanh đặt hai bên sườn trên tháp pháo */}
            {([-1, 1] as const).map((side) => (
              <group key={`aps-launcher-${side}`} position={[-0.95, 0.96, side * 0.96]} rotation={[0, apsYaw, 0]}>
                <mesh material={matGun} castShadow>
                  <cylinderGeometry args={[0.18, 0.22, 0.14, 16]} />
                </mesh>
                <group position={[0, 0.18, 0]} rotation={[0, 0, 0.28]}>
                  <mesh geometry={rbox(0.46, 0.22, 0.34, 0.03)} material={matArmor} castShadow />
                  {[-0.085, 0.085].map((oz, ti) => (
                    <mesh key={ti} position={[0.24, 0.01, oz]} rotation={[0, 0, -Math.PI / 2]} material={matDark}>
                      <cylinderGeometry args={[0.062, 0.062, 0.08, 14]} />
                    </mesh>
                  ))}
                  <mesh geometry={rbox(0.08, 0.04, 0.28, 0.008)} material={matRadarTrim} position={[0.18, 0.115, 0]} />
                </group>
              </group>
            ))}
          </group>
        )}
      </group>
    </group>
  );
};
