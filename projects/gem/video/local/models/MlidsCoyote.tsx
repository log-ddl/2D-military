// Tổ hợp phòng không tầm thấp LIDS cố định/pallet (Radar băng Ku 4 mặt AESA KuRFS + Bệ 4 ống phóng Coyote)
// và Đạn đánh chặn động cơ phản lực Raytheon Coyote Block II.
// Quy ước @lib/3d/geom: tỉ lệ 1:1 mét thật, mũi hướng +X, đỉnh hướng +Y, mặt đất y = 0.
import React from 'react';
import { extrude, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets } from '@lib/3d/parts';
import type { V3 } from '@lib/3d/stage';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

// ============================================================================
// HẰNG ĐỊNH VỊ & HÀM ĐỘNG HỌC BỆ PHÓNG COYOTE (KHỚP 100% VỚI CẢNH S18)
// ============================================================================

/** Tâm trục xoay hướng (yaw) và nâng tầm (elev) của bệ 4 ống Coyote trong hệ tọa độ cục bộ KurfsRadarUnit. */
export const COYOTE_LAUNCHER_PIVOT: V3 = [0.62, 1.38, 0];

/** Tọa độ miệng ống phóng số 1 (ống trên-phải có nắp mở) trong hệ quy chiếu cụm ống phóng (trước khi xoay elev/yaw). */
export const COYOTE_MUZZLE_LOCAL: V3 = [1.0, 0.155, 0.155];

/**
 * Tính vị trí chính xác của miệng ống phóng số 1 trong hệ tọa độ cục bộ của `KurfsRadarUnit`
 * theo góc xoay ngang `yaw` (rad) và góc nâng tầm `elev` (rad, mặc định 0.58).
 */
export const getCoyoteMuzzlePos = (yaw = 0, elev = 0.58): V3 => {
  const [lx, ly, lz] = COYOTE_MUZZLE_LOCAL;
  const ce = Math.cos(elev);
  const se = Math.sin(elev);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  // Xoay quanh trục Z (elev) rồi xoay quanh trục Y (yaw) — khớp tuyệt đối thứ tự group Three.js
  const x1 = lx * ce - ly * se;
  const y1 = lx * se + ly * ce;
  const z1 = lz;
  return [
    COYOTE_LAUNCHER_PIVOT[0] + x1 * cy + z1 * sy,
    COYOTE_LAUNCHER_PIVOT[1] + y1,
    COYOTE_LAUNCHER_PIVOT[2] - x1 * sy + z1 * cy,
  ];
};

/** Vector đơn vị hướng bắn của ống phóng Coyote theo `yaw` và `elev` (tiện truyền thẳng vào `MuzzleBlast.dir`). */
export const getCoyoteLaunchDir = (yaw = 0, elev = 0.58): V3 => {
  const ce = Math.cos(elev);
  return [ce * Math.cos(yaw), Math.sin(elev), -ce * Math.sin(yaw)];
};

// ============================================================================
// VẬT LIỆU DÙNG CHUNG (CACHE TẤT ĐỊNH)
// ============================================================================

const MAT = {
  // Sơn cát quân sự LIDS cho mảng extrude lớn (1 m = 1 UV -> repeat 0.42)
  lidsArmorEx: paint({
    color: PAL3D.lidsTan,
    camo: PAL3D.lidsCamo,
    camoScale: 1.15,
    wear: 0.2,
    dirt: 0.25,
    roughness: 0.64,
    metalness: 0.26,
    repeat: 0.42,
    seed: 41,
  }),
  // Sơn cát quân sự cho khối hộp/trụ cân đối (UV 0..1)
  lidsArmorBox: paint({
    color: PAL3D.lidsTan,
    camo: PAL3D.lidsCamo,
    camoScale: 1.4,
    wear: 0.18,
    dirt: 0.22,
    roughness: 0.62,
    metalness: 0.28,
    repeat: 1,
    seed: 43,
  }),
  // Sơn tĩnh điện cát mịn cho ống phóng đùn theo mét thật (1 m = 1 UV -> repeat 0.5, không bị kéo dãn vệt dọc)
  lidsCanister: paint({
    color: PAL3D.lidsTan,
    camo: ['#baa47f', '#d2c09e'],
    camoScale: 1.3,
    wear: 0.12,
    dirt: 0.14,
    roughness: 0.58,
    metalness: 0.28,
    repeat: 0.5,
    seed: 45,
  }),
  lidsDarkTan: paint({
    color: '#9c8767',
    camo: ['#8c7758', '#b09a78'],
    wear: 0.24,
    dirt: 0.28,
    roughness: 0.68,
    metalness: 0.32,
    repeat: 0.45,
    seed: 47,
  }),
  // Mặt mảng pha AESA băng Ku (xám lam radar chuẩn quân sự, độ nhám vừa phải để rõ sắc độ ở cả 4 góc nhìn)
  kurfsArray: paint({
    color: PAL3D.kurfsPanel,
    camo: ['#3b4958', '#4b5c6e'],
    camoScale: 2.5,
    wear: 0.08,
    dirt: 0.06,
    roughness: 0.5,
    metalness: 0.24,
    repeat: 2,
    seed: 53,
  }),
  coyoteFuselage: paint({
    color: PAL3D.coyoteBody,
    camo: ['#c1cbd6', '#dce3ea'],
    camoScale: 1.8,
    wear: 0.1,
    dirt: 0.06,
    roughness: 0.42,
    metalness: 0.38,
    repeat: 1,
    seed: 61,
  }),
  coyoteRadome: plain('#2d3540', 0.36, 0.16),
  coyoteAccent: plain(PAL3D.coyoteAccent, 0.4, 0.2),
  coyoteFin: plain('#47525f', 0.44, 0.54),
  steelDark: plain('#2b323a', 0.52, 0.64),
  steelMid: plain('#535f6b', 0.48, 0.58),
  steelBright: plain('#919ca8', 0.34, 0.74),
  nozzleMetal: plain('#20252b', 0.38, 0.8),
  rubberDark: plain('#181b1f', 0.88, 0.08),
  sensorDome: plain('#dcd4c6', 0.38, 0.1),
  opticGlass: plain('#12293e', 0.14, 0.85),
  hazardYellow: plain('#cfa03c', 0.52, 0.25),
  extinguisherRed: plain('#b53328', 0.42, 0.3),
};

// ============================================================================
// 1. MÔ HÌNH ĐẠN ĐÁNH CHẶN PHẢN LỰC COYOTE BLOCK II (DÀI 1.45 M, ĐK 0.15 M)
// ============================================================================

export type CoyoteBlock2Props = {
  /** Độ bung cánh nâng giữa thân chữ X: 0 = cụp sát thân trong ống phóng, 1 = bung xòe sải ~0.54 m. */
  finDeploy?: number;
  /** Cường độ luồng lửa động cơ phản lực ở đuôi -X (0..1). */
  flame?: number;
  /** Góc xoay quanh trục dọc +X (rad). */
  roll?: number;
};

// Biên dạng mũi radome ogive từ +0.435 tới +0.725 (24 điểm mượt sắc sảo)
const COYOTE_RADOME_PROFILE: P2[] = (() => {
  const pts: P2[] = [[0.075, 0.435]];
  const x0 = 0.435;
  const L = 0.29; // tới đúng +0.725
  const R = 0.075;
  const N = 24;
  for (let i = 1; i <= N; i++) {
    const u = i / N;
    const r = i === N ? 0.0022 : R * Math.pow(1 - u * u, 0.66);
    pts.push([Math.max(0.002, r), x0 + u * L]);
  }
  return pts;
})();

const COYOTE_BODY_GEO = lathe(
  [
    [0.058, -0.5],
    [0.072, -0.47],
    [0.075, -0.43],
    [0.075, 0.422],
    [0.073, 0.435],
  ],
  36,
);

const COYOTE_RADOME_GEO = lathe(COYOTE_RADOME_PROFILE, 36);

// Tầng đuôi & miệng phụt tuốc-bin / booster (-0.725 .. -0.48)
const COYOTE_BOOSTER_GEO = lathe(
  [
    [0.047, -0.725],
    [0.054, -0.72],
    [0.068, -0.66],
    [0.077, -0.61],
    [0.077, -0.495],
    [0.075, -0.48],
  ],
  32,
);

const COYOTE_NOZZLE_CORE_GEO = lathe(
  [
    [0.016, -0.66],
    [0.043, -0.723],
    [0.046, -0.725],
  ],
  24,
);

// Cửa hút khí động cơ tuốc-bin phản lực trên lưng (dorsal aerodynamic scoop air intake):
// vuốt thuôn mượt từ sống lưng sau (-0.44) lên miệng hút khí vát khí động học ở +0.115
const COYOTE_INTAKE_FAIRING_GEO = extrude(
  [
    [-0.44, 0.068],
    [-0.36, 0.088],
    [-0.22, 0.108],
    [-0.06, 0.118],
    [0.085, 0.118],
    [0.122, 0.082],
    [0.112, 0.068],
  ],
  0.066,
  0.012,
);

// Môi chụp miệng cửa hút khí vát xiên (scoop lip cowl)
const COYOTE_INTAKE_LIP_GEO = extrude(
  [
    [0.07, 0.072],
    [0.085, 0.121],
    [0.126, 0.116],
    [0.106, 0.072],
  ],
  0.07,
  0.005,
);

// 4 cánh nâng/lái giữa thân xếp chữ X thanh mảnh tỉ lệ diện tích cao (vươn tới r = 0.272 -> sải chéo 0.544 m)
const COYOTE_MID_FIN_GEO = extrude(
  [
    [0.042, 0.0],
    [-0.048, 0.198],
    [-0.096, 0.198],
    [-0.076, 0.0],
  ],
  0.006,
  0.0016,
);

// 4 cánh lái đuôi chữ X dạng delta cụt sắc sảo (-0.54 .. -0.70)
const COYOTE_TAIL_FIN_GEO = extrude(
  [
    [0.052, 0.0],
    [-0.028, 0.118],
    [-0.086, 0.118],
    [-0.092, 0.0],
  ],
  0.006,
  0.0015,
);

// Luồng lửa phản lực nhiều lớp
const FLAME_OUTER_GEO = lathe(
  [
    [0.002, -0.78],
    [0.034, -0.48],
    [0.06, -0.2],
    [0.05, -0.04],
    [0.042, 0.0],
  ],
  20,
);
const FLAME_MID_GEO = lathe(
  [
    [0.002, -0.58],
    [0.028, -0.32],
    [0.046, -0.12],
    [0.038, 0.0],
  ],
  18,
);
const FLAME_CORE_GEO = lathe(
  [
    [0.002, -0.36],
    [0.022, -0.18],
    [0.033, -0.05],
    [0.028, 0.0],
  ],
  18,
);

const X_ANGLES = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];

export const CoyoteBlock2: React.FC<CoyoteBlock2Props> = ({ finDeploy = 1, flame = 0, roll = 0 }) => {
  const dep = Math.max(0, Math.min(1, finDeploy));
  const fl = Math.max(0, Math.min(1, flame));
  // Khi dep = 0, cánh giữa thân cụp ngược ra sau áp sát thân trụ để chui gọn trong ống phóng
  const midFoldRot = -(1 - dep) * 1.46;
  const tailFoldScale = 0.42 + 0.58 * dep;

  return (
    <group rotation={[roll, 0, 0]}>
      {/* Thân trụ chính & Mũi radome dẫn đường RF ogive */}
      <mesh geometry={COYOTE_BODY_GEO} material={MAT.coyoteFuselage} castShadow receiveShadow />
      <mesh geometry={COYOTE_RADOME_GEO} material={MAT.coyoteRadome} castShadow receiveShadow />
      {/* Đầu chóp cảm biến kim loại mảnh ở mũi +0.725 */}
      <mesh position={[0.718, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.steelBright}>
        <coneGeometry args={[0.006, 0.016, 16]} />
      </mesh>

      {/* Đai kim loại khớp seeker & Đai cảnh báo đầu đạn đỏ cam */}
      <mesh position={[0.428, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.steelBright} castShadow>
        <cylinderGeometry args={[0.0756, 0.0756, 0.018, 32]} />
      </mesh>
      <mesh position={[0.315, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.coyoteAccent} castShadow>
        <cylinderGeometry args={[0.0759, 0.0759, 0.06, 32]} />
      </mesh>
      <mesh position={[0.175, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.steelDark}>
        <cylinderGeometry args={[0.0755, 0.0755, 0.013, 32]} />
      </mesh>
      <mesh position={[-0.36, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.coyoteAccent}>
        <cylinderGeometry args={[0.0756, 0.0756, 0.022, 32]} />
      </mesh>

      {/* 4 cửa sổ quang học ngòi nổ cận tiếp quanh khoang đầu đạn */}
      {[0, 1, 2, 3].map((i) => (
        <group key={`fz${i}`} rotation={[(i * Math.PI) / 2, 0, 0]}>
          <mesh position={[0.232, 0.0742, 0]} geometry={rbox(0.03, 0.007, 0.017, 0.002)} material={MAT.opticGlass} />
        </group>
      ))}

      {/* Cửa hút khí tuốc-bin phản lực khí động học trên lưng (+Y) */}
      <mesh geometry={COYOTE_INTAKE_FAIRING_GEO} material={MAT.coyoteFuselage} castShadow receiveShadow />
      <mesh geometry={COYOTE_INTAKE_LIP_GEO} material={MAT.steelMid} castShadow />
      {/* Họng hút khí tối sâu bên trong miệng scoop */}
      <mesh position={[0.114, 0.095, 0]} rotation={[0, 0, -0.25]} geometry={rbox(0.024, 0.034, 0.048, 0.005)} material={MAT.rubberDark} />
      <mesh position={[-0.08, 0.119, 0]} geometry={rbox(0.24, 0.004, 0.03, 0.0015)} material={MAT.steelMid} />

      {/* Gờ trượt ray phóng & đầu nối cáp rốn dưới bụng (-Y) */}
      <mesh position={[-0.08, -0.077, 0]} geometry={rbox(0.64, 0.013, 0.026, 0.004)} material={MAT.steelMid} castShadow />

      {/* Tầng đuôi booster / ống phụt tuốc-bin */}
      <mesh geometry={COYOTE_BOOSTER_GEO} material={MAT.steelDark} castShadow receiveShadow />
      <mesh geometry={COYOTE_NOZZLE_CORE_GEO} material={MAT.nozzleMetal} />
      <mesh position={[-0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.steelBright}>
        <cylinderGeometry args={[0.0776, 0.0776, 0.015, 32]} />
      </mesh>

      {/* 4 cánh nâng/lái giữa thân xếp chữ X (bung ra theo finDeploy) */}
      {X_ANGLES.map((ang, i) => (
        <group key={`mfin${i}`} position={[0.0, 0, 0]} rotation={[ang, 0, 0]}>
          {/* Khớp bản lề cơ khí thuôn gọn sát thân */}
          <mesh position={[-0.02, 0.074, 0]} geometry={rbox(0.13, 0.013, 0.018, 0.004)} material={MAT.steelDark} />
          <group position={[0.015, 0.074, 0]} rotation={[0, 0, midFoldRot]}>
            <mesh geometry={COYOTE_MID_FIN_GEO} material={MAT.coyoteFin} castShadow />
            {/* Đầu mút cánh sơn đỏ cam cảnh báo */}
            <mesh position={[-0.072, 0.193, 0]} geometry={rbox(0.046, 0.01, 0.007, 0.002)} material={MAT.coyoteAccent} />
          </group>
        </group>
      ))}

      {/* 4 cánh lái đuôi chữ X có trục servo kim loại */}
      {X_ANGLES.map((ang, i) => (
        <group key={`tfin${i}`} position={[-0.6, 0, 0]} rotation={[ang, 0, 0]}>
          <mesh position={[-0.02, 0.073, 0]} geometry={rbox(0.115, 0.011, 0.018, 0.003)} material={MAT.steelMid} />
          <mesh position={[-0.018, 0.079, 0]} material={MAT.steelBright}>
            <cylinderGeometry args={[0.007, 0.007, 0.014, 10]} />
          </mesh>
          <group position={[0, 0.076, 0]} scale={[1, tailFoldScale, 1]}>
            <mesh geometry={COYOTE_TAIL_FIN_GEO} material={MAT.steelDark} castShadow />
          </group>
        </group>
      ))}

      {/* Luồng lửa động cơ phản lực cam-trắng rực sáng khi flame > 0 */}
      {fl > 0.01 && (
        <group position={[-0.725, 0, 0]}>
          {/* Vành họng đốt rực nóng ngay cửa miệng phụt */}
          <mesh position={[0.004, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.014, 0.044, 24]} />
            <meshBasicMaterial color="#ffe8a3" side={2} toneMapped={false} />
          </mesh>
          <group scale={[0.45 + 0.65 * fl, 0.78 + 0.28 * fl, 0.78 + 0.28 * fl]}>
            <mesh geometry={FLAME_OUTER_GEO}>
              <meshBasicMaterial color="#ff4e12" transparent opacity={0.64 * fl} toneMapped={false} />
            </mesh>
            <mesh geometry={FLAME_MID_GEO}>
              <meshBasicMaterial color="#ffa62b" transparent opacity={0.88 * fl} toneMapped={false} />
            </mesh>
            <mesh geometry={FLAME_CORE_GEO}>
              <meshBasicMaterial color="#fffbe8" transparent opacity={0.98 * fl} toneMapped={false} />
            </mesh>
            {/* Vòng vân sốc siêu âm (Mach shock diamonds) */}
            {[0.12, 0.25, 0.39].map((dx, k) => (
              <mesh key={k} position={[-dx, 0, 0]} scale={[0.036, 0.024 * (1 - k * 0.2), 0.024 * (1 - k * 0.2)]}>
                <sphereGeometry args={[1, 12, 8]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={(0.92 - k * 0.24) * fl} toneMapped={false} />
              </mesh>
            ))}
          </group>
        </group>
      )}
    </group>
  );
};

// ============================================================================
// 2. TỔ HỢP PHÒNG KHÔNG LIDS: RADAR BĂNG Ku `KuRFS` & BỆ PHÓNG 4 ỐNG COYOTE
//    Kích thước bệ: 2.80 m (X) x 2.30 m (Z), đỉnh cột radar cao 3.50 m.
// ============================================================================

export type KurfsRadarUnitProps = {
  /** Góc xoay ngang bệ phóng 4 ống Coyote (rad). */
  launcherYaw?: number;
  /** Góc nâng tầm bệ phóng Coyote (rad, mặc định 0.58 rad ~ 33°). */
  launcherElev?: number;
  /** Trạng thái hoạt động của đài radar KuRFS (0..1, bật đèn báo trạng thái xanh). */
  radarActive?: number;
  /** Độ mở nắp ống phóng số 1 (0 = đóng kín, 1 = mở lật hoàn toàn). */
  tubeOpen?: number;
};

// Dầm khung pallet bọc giáp nhìn ngang: dài 2.80 m (-1.40 .. +1.40), dày y = 0.08 .. 0.32, rộng Z = 2.30 m
const PALLET_DECK_GEO = extrude(
  [
    [-1.4, 0.1],
    [-1.36, 0.08],
    [1.36, 0.08],
    [1.4, 0.1],
    [1.4, 0.3],
    [1.36, 0.32],
    [-1.36, 0.32],
    [-1.4, 0.3],
  ],
  2.3,
  0.018,
);

// Khối máy phát điện diesel bọc giáp (bên phải phía sau: x = -1.30 .. -0.34, y = 0.32 .. 1.12)
const GENSET_HOUSING_GEO = extrude(
  [
    [-0.48, 0],
    [0.48, 0],
    [0.48, 0.68],
    [0.36, 0.8],
    [-0.42, 0.8],
    [-0.48, 0.72],
  ],
  0.64,
  0.02,
);

// Khối tủ điều khiển hỏa lực C2 & nguồn RF (bên trái phía sau)
const C2_CABINET_GEO = extrude(
  [
    [-0.46, 0],
    [0.46, 0],
    [0.46, 0.74],
    [0.38, 0.82],
    [-0.46, 0.82],
  ],
  0.62,
  0.02,
);

// Bản gân tam giác gia cường chân cột tháp radar KuRFS
const MAST_GUSSET_GEO = extrude(
  [
    [0.12, 0],
    [0.34, 0],
    [0.13, 0.48],
    [0.12, 0.48],
  ],
  0.036,
  0.005,
);

// Bệ côn bọc giáp đỡ bàn xoay bệ phóng Coyote (x = +0.62, y = 0.32 .. 0.74)
const LAUNCHER_PEDESTAL_GEO = lathe(
  [
    [0.4, 0.0],
    [0.39, 0.06],
    [0.31, 0.36],
    [0.33, 0.42],
  ],
  24,
);

// Vỏ ống phóng Coyote đùn theo mét thật (dài 1.56 m cả vát mép, tiết diện 0.274 x 0.274 m -> UV tỉ lệ 1:1 chuẩn xác)
const CANISTER_TUBE_GEO = extrude(
  [
    [-0.758, -0.115],
    [0.758, -0.115],
    [0.758, 0.115],
    [-0.758, 0.115],
  ],
  0.274,
  0.022,
);

// Má càng chữ U (trunnion yoke arm) nâng cụm 4 ống phóng ở z = ±0.39
const YOKE_ARM_GEO = extrude(
  [
    [-0.22, 0.0],
    [0.22, 0.0],
    [0.18, 0.64],
    [0.09, 0.74],
    [-0.09, 0.74],
    [-0.18, 0.64],
  ],
  0.075,
  0.012,
);

// Lõi chóp cụt bát giác thuôn theo đúng góc nghiêng 13.5° của 4 mặt mảng pha KuRFS:
// bán kính đáy 0.43 m thuôn lên đỉnh 0.255 m (cao 0.78 m) -> 4 tấm AESA nằm nổi hoàn toàn, không bị cắt mép!
const KURFS_FRUSTUM_CORE_GEO = lathe(
  [
    [0.01, 0.0],
    [0.435, 0.0],
    [0.445, 0.04],
    [0.268, 0.75],
    [0.255, 0.78],
    [0.01, 0.78],
  ],
  8,
);

// Vòm cảm biến phụ trên đỉnh tháp KuRFS (>= 22 điểm lathe mượt)
const KURFS_TOP_DOME_GEO = lathe(
  Array.from({ length: 22 }, (_, i): P2 => {
    const u = i / 21;
    const ang = u * (Math.PI / 2);
    return [Math.max(0.002, 0.195 * Math.cos(ang)), 0.175 * Math.sin(ang)];
  }),
  32,
);

// Dây cáp nguồn & ống dẫn sóng RF bọc giáp trên mặt sàn pallet
const CABLE_MAST_TO_C2 = pipe(
  [
    [-0.82, 0.42, -0.18],
    [-0.82, 0.35, -0.36],
    [-0.82, 0.44, -0.5],
  ],
  0.024,
  20,
);
const CABLE_MAST_TO_GEN = pipe(
  [
    [-0.82, 0.42, 0.18],
    [-0.82, 0.35, 0.36],
    [-0.82, 0.44, 0.5],
  ],
  0.024,
  20,
);
const CABLE_TO_LAUNCHER = pipe(
  [
    [-0.38, 0.38, -0.58],
    [-0.05, 0.34, -0.32],
    [0.28, 0.35, -0.14],
    [0.44, 0.44, -0.06],
  ],
  0.026,
  28,
);

// Điểm đinh tán dọc diềm giáp pallet + viền 4 mặt radar KuRFS
const PALLET_RIVETS: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [];
  for (let i = -6; i <= 6; i++) {
    pts.push([i * 0.21, 0.26, 1.152]);
    pts.push([i * 0.21, 0.26, -1.152]);
  }
  for (let k = -4; k <= 4; k++) {
    pts.push([1.402, 0.26, k * 0.24]);
    pts.push([-1.402, 0.26, k * 0.24]);
  }
  return pts;
})();

const RADAR_FACE_RIVETS: [number, number, number][] = (() => {
  const pts: [number, number, number][] = [];
  for (let i = -3; i <= 3; i++) {
    pts.push([0.036, i * 0.092, 0.315]);
    pts.push([0.036, i * 0.092, -0.315]);
    pts.push([0.036, 0.315, i * 0.092]);
    pts.push([0.036, -0.315, i * 0.092]);
  }
  return pts;
})();

const TUBE_OFFSETS: { y: number; z: number; isTube1: boolean }[] = [
  { y: 0.155, z: 0.155, isTube1: true },
  { y: 0.155, z: -0.155, isTube1: false },
  { y: -0.155, z: 0.155, isTube1: false },
  { y: -0.155, z: -0.155, isTube1: false },
];

const OUTRIGGER_CORNERS: [number, number][] = [
  [1.3, 1.06],
  [1.3, -1.06],
  [-1.3, 1.06],
  [-1.3, -1.06],
];

export const KurfsRadarUnit: React.FC<KurfsRadarUnitProps> = ({
  launcherYaw = 0,
  launcherElev = 0.58,
  radarActive = 1,
  tubeOpen = 0,
}) => {
  const openAmt = Math.max(0, Math.min(1, tubeOpen));
  const activeAmt = Math.max(0, Math.min(1, radarActive));

  return (
    <group>
      {/* ==================== 1. BỆ CONTAINER / PALLET BỌC GIÁP 2.80 x 2.30 M ==================== */}
      <mesh geometry={PALLET_DECK_GEO} material={MAT.lidsArmorEx} castShadow receiveShadow />
      <Rivets points={PALLET_RIVETS} r={0.013} color="#6d614d" />

      {/* Tấm sàn gân chống trượt trên mặt y = 0.325 */}
      <mesh position={[0, 0.324, 0]} geometry={rbox(2.68, 0.016, 2.18, 0.004)} material={MAT.lidsDarkTan} receiveShadow />
      {[-1.0, -0.6, -0.2, 0.2, 0.6, 1.0].map((rx, i) => (
        <mesh key={`rib${i}`} position={[rx, 0.333, 0]} geometry={rbox(0.03, 0.008, 2.08, 0.002)} material={MAT.steelMid} />
      ))}

      {/* 4 hốc càng xe nâng ISO hai bên hông pallet */}
      {[-0.52, 0.52].map((fx, i) => (
        <React.Fragment key={`fp${i}`}>
          <mesh position={[fx, 0.17, 1.135]} geometry={rbox(0.28, 0.11, 0.06, 0.008)} material={MAT.rubberDark} />
          <mesh position={[fx, 0.17, -1.135]} geometry={rbox(0.28, 0.11, 0.06, 0.008)} material={MAT.rubberDark} />
          <mesh position={[fx, 0.17, 1.148]} geometry={rbox(0.32, 0.14, 0.015, 0.004)} material={MAT.steelMid} />
          <mesh position={[fx, 0.17, -1.148]} geometry={rbox(0.32, 0.14, 0.015, 0.004)} material={MAT.steelMid} />
        </React.Fragment>
      ))}

      {/* 4 chân đế cân bằng thủy lực/vít me ở 4 góc đặt chạm mặt đất y = 0 */}
      {OUTRIGGER_CORNERS.map(([cx, cz], i) => {
        const sx = Math.sign(cx);
        const sz = Math.sign(cz);
        return (
          <group key={`jack${i}`} position={[cx, 0, cz]}>
            <mesh position={[sx * 0.05, 0.022, sz * 0.05]} material={MAT.steelDark} castShadow receiveShadow>
              <cylinderGeometry args={[0.145, 0.16, 0.044, 20]} />
            </mesh>
            <mesh position={[sx * 0.05, 0.22, sz * 0.05]} material={MAT.steelMid} castShadow>
              <cylinderGeometry args={[0.052, 0.052, 0.38, 16]} />
            </mesh>
            <mesh position={[sx * 0.05, 0.12, sz * 0.05]} material={MAT.steelBright}>
              <cylinderGeometry args={[0.036, 0.036, 0.18, 14]} />
            </mesh>
            <mesh position={[sx * 0.05, 0.42, sz * 0.05]} geometry={rbox(0.12, 0.045, 0.12, 0.008)} material={MAT.hazardYellow} />
            <mesh position={[-sx * 0.02, 0.24, -sz * 0.02]} geometry={rbox(0.18, 0.16, 0.18, 0.014)} material={MAT.lidsArmorBox} castShadow />
          </group>
        );
      })}

      {/* Cụm máy phát điện chiến thuật + Lưới tản nhiệt lá sách + Ống xả đứng (bên phải z = +0.72) */}
      <group position={[-0.82, 0.32, 0.72]}>
        <mesh geometry={GENSET_HOUSING_GEO} material={MAT.lidsArmorEx} castShadow receiveShadow />
        <mesh position={[-0.04, 0.38, 0.316]} geometry={rbox(0.66, 0.48, 0.025, 0.006)} material={MAT.steelDark} />
        {Array.from({ length: 8 }, (_, k) => (
          <mesh
            key={`lvz${k}`}
            position={[-0.04, 0.19 + k * 0.054, 0.325]}
            rotation={[0.35, 0, 0]}
            geometry={rbox(0.6, 0.016, 0.024, 0.002)}
            material={MAT.steelMid}
          />
        ))}
        <mesh position={[-0.476, 0.38, 0]} geometry={rbox(0.025, 0.44, 0.44, 0.006)} material={MAT.steelDark} />
        {Array.from({ length: 7 }, (_, k) => (
          <mesh
            key={`lvx${k}`}
            position={[-0.485, 0.21 + k * 0.054, 0]}
            rotation={[0, 0, -0.35]}
            geometry={rbox(0.024, 0.016, 0.38, 0.002)}
            material={MAT.steelMid}
          />
        ))}
        <mesh position={[-0.32, 0.92, -0.18]} material={MAT.steelDark} castShadow>
          <cylinderGeometry args={[0.046, 0.048, 0.36, 16]} />
        </mesh>
        <mesh position={[-0.32, 1.14, -0.18]} material={MAT.steelBright}>
          <cylinderGeometry args={[0.028, 0.028, 0.16, 14]} />
        </mesh>
        <mesh position={[-0.32, 1.23, -0.18]} rotation={[0, 0, 0.18]} geometry={rbox(0.09, 0.012, 0.08, 0.003)} material={MAT.steelMid} />
      </group>

      {/* Cụm tủ điều khiển hỏa lực C2 & bộ cấp nguồn (bên trái z = -0.72) */}
      <group position={[-0.82, 0.32, -0.72]}>
        <mesh geometry={C2_CABINET_GEO} material={MAT.lidsArmorEx} castShadow receiveShadow />
        {[-0.2, 0.18].map((dx, i) => (
          <group key={`door${i}`} position={[dx, 0.4, -0.312]}>
            <mesh geometry={rbox(0.32, 0.62, 0.018, 0.005)} material={MAT.lidsDarkTan} />
            <mesh position={[0.11, 0, -0.012]} geometry={rbox(0.024, 0.09, 0.016, 0.003)} material={MAT.steelBright} />
            <mesh position={[0, 0.18, -0.011]} geometry={rbox(0.14, 0.06, 0.006, 0.002)} material={MAT.coyoteAccent} />
          </group>
        ))}
        <mesh position={[-0.38, 1.12, -0.22]} material={MAT.steelDark}>
          <cylinderGeometry args={[0.016, 0.024, 0.68, 10]} />
        </mesh>
      </group>

      {/* Lan can bảo vệ bằng ống thép thẳng cứng cáp phía sau bệ pallet */}
      <group position={[-1.34, 0.32, 0]}>
        {[-1.04, -0.36, 0.36, 1.04].map((rz, i) => (
          <mesh key={`rp${i}`} position={[0, 0.28, rz]} material={MAT.steelMid} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.56, 10]} />
          </mesh>
        ))}
        <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.steelMid} castShadow>
          <cylinderGeometry args={[0.018, 0.018, 2.1, 10]} />
        </mesh>
        <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.steelMid}>
          <cylinderGeometry args={[0.014, 0.014, 2.1, 10]} />
        </mesh>
      </group>

      {/* Hệ ống cáp bọc giáp & bình chữa cháy gắn gọn bên vách sau tủ C2 */}
      <mesh geometry={CABLE_MAST_TO_C2} material={MAT.rubberDark} />
      <mesh geometry={CABLE_MAST_TO_GEN} material={MAT.rubberDark} />
      <mesh geometry={CABLE_TO_LAUNCHER} material={MAT.rubberDark} />
      <mesh position={[0.05, 0.35, -0.22]} geometry={rbox(0.68, 0.05, 0.16, 0.01)} material={MAT.steelMid} />
      <group position={[-1.22, 0.58, -0.42]}>
        <mesh material={MAT.extinguisherRed} castShadow>
          <cylinderGeometry args={[0.052, 0.052, 0.32, 16]} />
        </mesh>
        <mesh position={[0, 0.18, 0]} material={MAT.steelDark}>
          <cylinderGeometry args={[0.018, 0.028, 0.055, 10]} />
        </mesh>
      </group>

      {/* ==================== 2. CỘT THÁP RADAR AESA BĂNG Ku `KuRFS` (CAO 3.50 M) ==================== */}
      <group position={[-0.82, 0, 0]}>
        {/* Mặt bích chân đế tháp y = 0.32..0.52 */}
        <mesh position={[0, 0.37, 0]} material={MAT.steelDark} castShadow receiveShadow>
          <cylinderGeometry args={[0.26, 0.34, 0.1, 16]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={`gus${i}`} position={[0, 0.38, 0]} rotation={[0, (i * Math.PI) / 2, 0]}>
            <mesh geometry={MAST_GUSSET_GEO} material={MAT.lidsArmorEx} castShadow />
          </group>
        ))}

        {/* Thân cột tháp ống lồng bát giác cứng vững (y = 0.42 .. 2.24) */}
        <mesh position={[0, 1.02, 0]} material={MAT.lidsArmorBox} castShadow receiveShadow>
          <cylinderGeometry args={[0.145, 0.165, 1.2, 8]} />
        </mesh>
        <mesh position={[0, 1.62, 0]} material={MAT.steelDark} castShadow>
          <cylinderGeometry args={[0.175, 0.175, 0.09, 12]} />
        </mesh>
        <mesh position={[0, 1.94, 0]} material={MAT.lidsArmorBox} castShadow receiveShadow>
          <cylinderGeometry args={[0.122, 0.132, 0.62, 8]} />
        </mesh>
        {[0.72, 0.98, 1.24, 1.5, 1.82, 2.06].map((ry, k) => (
          <mesh key={`rung${k}`} position={[-0.16, ry, 0]} geometry={rbox(0.06, 0.018, 0.18, 0.005)} material={MAT.steelMid} />
        ))}
        <mesh position={[0.14, 1.34, 0.06]} material={MAT.rubberDark}>
          <cylinderGeometry args={[0.022, 0.022, 1.72, 10]} />
        </mesh>

        {/* Đai tản nhiệt dưới đầu radar & 4 đèn trạng thái xanh khi radarActive > 0 (y = 2.22 .. 2.45) */}
        <mesh position={[0, 2.31, 0]} material={MAT.steelDark} castShadow>
          <cylinderGeometry args={[0.37, 0.21, 0.18, 8]} />
        </mesh>
        <mesh position={[0, 2.42, 0]} material={MAT.lidsArmorBox} castShadow>
          <cylinderGeometry args={[0.43, 0.4, 0.06, 8]} />
        </mesh>
        {Array.from({ length: 12 }, (_, k) => (
          <group key={`cf${k}`} position={[0, 2.31, 0]} rotation={[0, (k * Math.PI) / 6, 0]}>
            <mesh position={[0.31, 0, 0]} geometry={rbox(0.08, 0.14, 0.016, 0.003)} material={MAT.steelMid} />
          </group>
        ))}
        {/* 4 cụm đèn LED trạng thái xanh 360° */}
        {[0, 1, 2, 3].map((i) => (
          <group key={`led${i}`} position={[0, 2.42, 0]} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
            <mesh position={[0.415, 0, 0]} geometry={rbox(0.04, 0.045, 0.07, 0.008)} material={MAT.steelDark} />
            <mesh position={[0.435, 0, 0]}>
              <sphereGeometry args={[0.024, 10, 8]} />
              {activeAmt > 0.05 ? (
                <meshBasicMaterial color="#38ff7a" toneMapped={false} />
              ) : (
                <meshStandardMaterial color="#183623" roughness={0.6} />
              )}
            </mesh>
          </group>
        ))}

        {/* Khối đầu Radar KuRFS đa diện chóp cụt 4 mặt mảng pha AESA phẳng nghiêng 360° (y = 2.45 .. 3.23) */}
        <group position={[0, 2.45, 0]}>
          {/* Thân lõi chóp cụt bát giác nghiêng đồng bộ (lathe hướng +X nên xoay +90° quanh Z để hướng +Y, xoay 22.5° quanh Y để mặt phẳng đối diện 4 hướng chính) */}
          <mesh rotation={[0, Math.PI / 8, Math.PI / 2]} geometry={KURFS_FRUSTUM_CORE_GEO} material={MAT.lidsArmorBox} castShadow receiveShadow />

          {/* 4 sống góc vát 45° nghiêng theo cạnh chóp cụt gắn cánh tản nhiệt công suất cao */}
          {[0, 1, 2, 3].map((i) => (
            <group key={`sp${i}`} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
              <group position={[0.355, 0.39, 0]} rotation={[0, 0, 0.225]}>
                <mesh geometry={rbox(0.085, 0.75, 0.13, 0.014)} material={MAT.steelDark} castShadow />
                {Array.from({ length: 9 }, (_, f) => (
                  <mesh
                    key={f}
                    position={[0.042, -0.29 + f * 0.072, 0]}
                    geometry={rbox(0.036, 0.018, 0.11, 0.003)}
                    material={MAT.steelMid}
                  />
                ))}
              </group>
            </group>
          ))}

          {/* 4 mặt mảng pha phẳng AESA nghiêng 12.9° (0.225 rad) — nổi trọn vẹn 100% trên 4 mặt chóp cụt! */}
          {[0, 1, 2, 3].map((i) => (
            <group key={`face${i}`} rotation={[0, (i * Math.PI) / 2, 0]}>
              <group position={[0.352, 0.39, 0]} rotation={[0, 0, 0.225]}>
                {/* Khung viền bảo vệ & tản nhiệt bao quanh mặt mảng pha */}
                <mesh geometry={rbox(0.064, 0.69, 0.68, 0.02)} material={MAT.lidsArmorBox} castShadow receiveShadow />
                {/* Viền kim loại gia cường & gioăng kín nước */}
                <mesh position={[0.022, 0, 0]} geometry={rbox(0.03, 0.61, 0.6, 0.012)} material={MAT.steelDark} />
                {/* Tấm mặt mảng pha AESA băng Ku (`PAL3D.kurfsPanel`) */}
                <mesh position={[0.034, 0, 0]} geometry={rbox(0.018, 0.565, 0.555, 0.008)} material={MAT.kurfsArray} />
                {/* Khe chia mô-đun mảng con AESA sắc nét */}
                <mesh position={[0.043, 0, 0]} geometry={rbox(0.004, 0.55, 0.007, 0.001)} material={MAT.steelMid} />
                <mesh position={[0.043, 0, 0]} geometry={rbox(0.004, 0.007, 0.54, 0.001)} material={MAT.steelMid} />
                {/* Đinh tán cố định khung viền */}
                <Rivets points={RADAR_FACE_RIVETS} r={0.01} color="#9aa4ae" />
              </group>
            </group>
          ))}
        </group>

        {/* Nắp đỉnh tháp chóp cụt + Vòm cảm biến phụ & kim thu sét đạt đúng độ cao y = 3.50 m */}
        <mesh position={[0, 3.255, 0]} rotation={[0, Math.PI / 8, 0]} material={MAT.lidsArmorBox} castShadow>
          <cylinderGeometry args={[0.25, 0.285, 0.055, 8]} />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <group key={`lug${i}`} position={[0, 3.28, 0]} rotation={[0, (i * Math.PI) / 2 + Math.PI / 4, 0]}>
            <mesh position={[0.215, 0.015, 0]} geometry={rbox(0.042, 0.042, 0.016, 0.005)} material={MAT.steelMid} />
          </group>
        ))}
        {/* Vòm cảm biến phụ (y = 3.28 .. 3.455) */}
        <mesh position={[0, 3.28, 0]} rotation={[0, 0, Math.PI / 2]} geometry={KURFS_TOP_DOME_GEO} material={MAT.sensorDome} castShadow />
        {/* Đỉnh thu sét / cảm biến khí tượng chạm đúng y = 3.50 m */}
        <mesh position={[0, 3.475, 0]} material={MAT.steelBright}>
          <cylinderGeometry args={[0.006, 0.014, 0.05, 10]} />
        </mesh>
      </group>

      {/* ==================== 3. BÀN XOAY & BỆ PHÓNG 4 ỐNG ĐẠN COYOTE ==================== */}
      {/* Bệ trụ côn cố định trên sàn pallet tại x = +0.62, y = 0.32 .. 0.74 */}
      <group position={[COYOTE_LAUNCHER_PIVOT[0], 0.32, COYOTE_LAUNCHER_PIVOT[2]]}>
        <mesh rotation={[0, 0, Math.PI / 2]} geometry={LAUNCHER_PEDESTAL_GEO} material={MAT.lidsArmorBox} castShadow receiveShadow />
        <Rivets
          points={Array.from({ length: 12 }, (_, i): [number, number, number] => {
            const a = (i / 12) * Math.PI * 2;
            return [Math.cos(a) * 0.375, 0.05, Math.sin(a) * 0.375];
          })}
          r={0.012}
          color="#645b49"
        />
        <mesh position={[0, 0.445, 0]} material={MAT.steelDark} castShadow>
          <cylinderGeometry args={[0.31, 0.31, 0.055, 28]} />
        </mesh>
      </group>

      {/* Cụm xoay hướng ngang (`launcherYaw`) đặt gốc tại tâm trục nâng COYOTE_LAUNCHER_PIVOT [0.62, 1.38, 0] */}
      <group position={COYOTE_LAUNCHER_PIVOT} rotation={[0, launcherYaw, 0]}>
        <mesh position={[0, -0.56, 0]} material={MAT.lidsArmorBox} castShadow>
          <cylinderGeometry args={[0.33, 0.33, 0.07, 24]} />
        </mesh>
        <mesh position={[0, -0.52, 0]} geometry={rbox(0.42, 0.06, 0.86, 0.016)} material={MAT.lidsArmorBox} castShadow />

        {/* 2 má càng chữ U hai bên z = ±0.39 */}
        {[-0.39, 0.39].map((zz, i) => (
          <group key={`yk${i}`} position={[0, -0.54, zz]}>
            <mesh geometry={YOKE_ARM_GEO} material={MAT.lidsArmorEx} castShadow receiveShadow />
            <mesh position={[0, 0.54, zz > 0 ? 0.03 : -0.03]} rotation={[Math.PI / 2, 0, 0]} material={MAT.steelDark} castShadow>
              <cylinderGeometry args={[0.075, 0.075, 0.08, 20]} />
            </mesh>
            <mesh position={[0, 0.54, zz > 0 ? 0.065 : -0.065]} rotation={[Math.PI / 2, 0, 0]} material={MAT.steelBright}>
              <cylinderGeometry args={[0.038, 0.038, 0.03, 14]} />
            </mesh>
          </group>
        ))}

        {/* Hộp mô-tơ dẫn động phương vị & xi-lanh kích nâng phía trước mâm */}
        <mesh position={[-0.22, -0.45, -0.32]} geometry={rbox(0.18, 0.16, 0.16, 0.015)} material={MAT.steelDark} castShadow />
        <mesh position={[0.18, -0.34, 0]} rotation={[0, 0, 0.32]} material={MAT.steelDark}>
          <cylinderGeometry args={[0.036, 0.042, 0.36, 12]} />
        </mesh>

        {/* Cụm giá nâng tầm (`launcherElev`) chứa 4 ống phóng đạn Coyote (x từ -0.58 tới +1.00) */}
        <group rotation={[0, 0, launcherElev]}>
          {/* Khung lồng thép bọc giáp giữ chặt bó 2x2 ống phóng */}
          <mesh position={[0.18, 0, 0]} geometry={rbox(0.46, 0.64, 0.64, 0.02)} material={MAT.lidsDarkTan} castShadow receiveShadow />
          {/* 4 đai gân thép siết quanh bó 4 ống phóng */}
          {[-0.44, -0.14, 0.58, 0.91].map((bx, i) => (
            <mesh key={`band${i}`} position={[bx, 0, 0]} geometry={rbox(0.06, 0.632, 0.632, 0.016)} material={MAT.steelDark} castShadow />
          ))}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={MAT.steelMid}>
            <cylinderGeometry args={[0.055, 0.055, 0.78, 16]} />
          </mesh>
          <mesh position={[0.26, -0.33, 0]} rotation={[0, 0, -0.42]} material={MAT.steelBright}>
            <cylinderGeometry args={[0.022, 0.022, 0.28, 12]} />
          </mesh>

          {/* Hộp ăng-ten truyền lệnh datalink băng Ku & camera ngắm đồng trục trên lưng giá phóng */}
          <group position={[0.32, 0.39, -0.14]}>
            <mesh geometry={rbox(0.38, 0.13, 0.24, 0.016)} material={MAT.lidsArmorBox} castShadow />
            <mesh position={[0.192, 0.005, 0.04]} geometry={rbox(0.016, 0.09, 0.11, 0.006)} material={MAT.kurfsArray} />
            <mesh position={[0.192, 0, -0.065]} rotation={[0, 0, -Math.PI / 2]} material={MAT.steelDark}>
              <cylinderGeometry args={[0.032, 0.036, 0.028, 16]} />
            </mesh>
            <mesh position={[0.204, 0, -0.065]} rotation={[0, 0, -Math.PI / 2]} material={MAT.opticGlass}>
              <cylinderGeometry args={[0.024, 0.024, 0.008, 16]} />
            </mesh>
          </group>

          {/* 4 ống phóng hộp vuông bo góc (2x2 canister tubes, dài 1.58 m từ -0.58 tới +1.00) */}
          {TUBE_OFFSETS.map(({ y, z, isTube1 }, idx) => (
            <group key={`tube${idx}`} position={[0, y, z]}>
              {/* Vỏ ống phóng đùn UV 1:1 mét thật, sơn cát mịn chuẩn quân sự */}
              <mesh position={[0.21, 0, 0]} geometry={CANISTER_TUBE_GEO} material={MAT.lidsCanister} castShadow receiveShadow />
              {/* Vạch ký hiệu chiến thuật đỏ cam bên hông ống */}
              <mesh position={[0.74, 0, z > 0 ? 0.139 : -0.139]} geometry={rbox(0.09, 0.045, 0.004, 0.001)} material={MAT.coyoteAccent} />
              {/* Vành miệng ống phóng gia cường ở x = +0.985 */}
              <mesh position={[0.985, 0, 0]} geometry={rbox(0.032, 0.288, 0.288, 0.02)} material={MAT.steelDark} castShadow />
              {/* Cụm nắp thoát khí phụt phía đuôi ống (x = -0.58) */}
              <mesh position={[-0.58, 0, 0]} geometry={rbox(0.035, 0.285, 0.285, 0.02)} material={MAT.steelDark} castShadow />
              <mesh position={[-0.598, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.nozzleMetal}>
                <cylinderGeometry args={[0.1, 0.11, 0.016, 20]} />
              </mesh>

              {isTube1 ? (
                <>
                  {/* Lòng ống phóng số 1 rỗng tối sâu + 4 ray dẫn hướng kim loại sáng */}
                  <mesh position={[0.8, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.rubberDark}>
                    <cylinderGeometry args={[0.106, 0.106, 0.39, 24]} />
                  </mesh>
                  <mesh position={[0.994, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT.steelMid}>
                    <torusGeometry args={[0.108, 0.011, 10, 24]} />
                  </mesh>
                  {[0, 1, 2, 3].map((ri) => (
                    <group key={`rl${ri}`} rotation={[(ri * Math.PI) / 2, 0, 0]}>
                      <mesh position={[0.88, -0.098, 0]} geometry={rbox(0.22, 0.012, 0.02, 0.002)} material={MAT.steelBright} />
                    </group>
                  ))}

                  {/* Nắp đậy miệng ống số 1 mở lật gọn lên trên theo `tubeOpen` (0..1 -> 0..2.55 rad) */}
                  <group position={[1.0, 0.138, 0]} rotation={[0, 0, openAmt * 2.55]}>
                    <mesh position={[0.014, -0.138, 0]} geometry={rbox(0.026, 0.268, 0.268, 0.018)} material={MAT.lidsDarkTan} castShadow />
                    <mesh position={[0.001, -0.138, 0]} rotation={[0, Math.PI / 2, 0]} material={MAT.rubberDark}>
                      <torusGeometry args={[0.098, 0.01, 8, 20]} />
                    </mesh>
                    <mesh position={[0.028, -0.138, 0]} geometry={rbox(0.008, 0.22, 0.024, 0.002)} material={MAT.steelMid} />
                    <mesh position={[0.028, -0.138, 0]} geometry={rbox(0.008, 0.024, 0.22, 0.002)} material={MAT.steelMid} />
                    <mesh position={[0.03, -0.138, 0]} geometry={rbox(0.008, 0.05, 0.05, 0.004)} material={MAT.coyoteAccent} />
                    <mesh rotation={[Math.PI / 2, 0, 0]} material={MAT.steelDark}>
                      <cylinderGeometry args={[0.016, 0.016, 0.14, 10]} />
                    </mesh>
                  </group>
                </>
              ) : (
                /* Nắp niêm phong kín của các ống phóng 2, 3, 4 */
                <group position={[1.0, 0, 0]}>
                  <mesh position={[0.014, 0, 0]} geometry={rbox(0.026, 0.268, 0.268, 0.018)} material={MAT.lidsDarkTan} castShadow />
                  <mesh position={[0.028, 0, 0]} geometry={rbox(0.008, 0.22, 0.024, 0.002)} material={MAT.steelMid} />
                  <mesh position={[0.028, 0, 0]} geometry={rbox(0.008, 0.024, 0.22, 0.002)} material={MAT.steelMid} />
                  <mesh position={[0.03, 0, 0]} geometry={rbox(0.008, 0.05, 0.05, 0.004)} material={MAT.coyoteAccent} />
                  <mesh position={[0, 0.138, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT.steelDark}>
                    <cylinderGeometry args={[0.016, 0.016, 0.14, 10]} />
                  </mesh>
                </group>
              )}
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};

// ============================================================================
// BÀN XOAY KIỂM TRA 4 GÓC (`python3 tools/sheet.py gem --model KurfsRadarUnit,CoyoteBlock2`)
// ============================================================================

export const MODELS: ModelSet = {
  KurfsRadarUnit: {
    C: () => <KurfsRadarUnit launcherYaw={0.25} launcherElev={0.55} radarActive={1} tubeOpen={1} />,
    size: 4.2,
    center: [0, 1.75, 0],
  },
  CoyoteBlock2: {
    C: () => (
      <group position={[0, 0.6, 0]}>
        <CoyoteBlock2 finDeploy={1} flame={0.7} />
      </group>
    ),
    size: 1.8,
    center: [0, 0.6, 0],
  },
};
