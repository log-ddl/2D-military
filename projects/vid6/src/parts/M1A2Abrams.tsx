import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets, Track, Wheel } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { mix } from '@core/time';
import { PAINT_PRESETS } from '../design/palette';

export type M1A2AbramsProps = {
  turretYaw?: number;
  gunPitch?: number;
  recoil?: number;
  citvYaw?: number;
  crowsYaw?: number;
  travel?: number;
  hullPitch?: number;
  hullRoll?: number;
  variant?: 'm1a2' | 'sepv3' | 'm1a1_mud';
  camo?: 'desert' | 'woodland';
  blowoutOpen?: number;
  exhaustHeat?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

type V3 = [number, number, number];

/**
 * Nối các vòng tiết diện 3D khép kín thành khối đa diện giáp phẳng sắc cạnh (welded armor facets),
 * tự đóng nắp đáy/đỉnh và chiếu UV tri-planar theo đơn vị mét thật (1 m = 1 UV) đồng bộ với extrude().
 */
function buildLoftedArmor(rings: V3[][]): THREE.BufferGeometry {
  const pos: number[] = [];
  const uvs: number[] = [];
  const nPts = rings[0].length;

  const pushTri = (a: V3, b: V3, c: V3) => {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    const nx = Math.abs(uy * vz - uz * vy);
    const ny = Math.abs(uz * vx - ux * vz);
    const nz = Math.abs(ux * vy - uy * vx);
    for (const p of [a, b, c]) {
      pos.push(p[0], p[1], p[2]);
      if (ny >= nx && ny >= nz) {
        uvs.push(p[0], p[2]);
      } else if (nz >= nx) {
        uvs.push(p[0], p[1]);
      } else {
        uvs.push(p[2], p[1]);
      }
    }
  };

  for (let r = 0; r < rings.length - 1; r++) {
    const cur = rings[r];
    const nxt = rings[r + 1];
    for (let i = 0; i < nPts; i++) {
      const j = (i + 1) % nPts;
      pushTri(cur[i], nxt[j], cur[j]);
      pushTri(cur[i], nxt[i], nxt[j]);
    }
  }

  const centroid = (ring: V3[]): V3 => {
    let sx = 0, sy = 0, sz = 0;
    for (const p of ring) {
      sx += p[0];
      sy += p[1];
      sz += p[2];
    }
    return [sx / ring.length, sy / ring.length, sz / ring.length];
  };

  const bot = rings[0];
  const botC = centroid(bot);
  for (let i = 0; i < nPts; i++) {
    const j = (i + 1) % nPts;
    pushTri(botC, bot[i], bot[j]);
  }

  const top = rings[rings.length - 1];
  const topC = centroid(top);
  for (let i = 0; i < nPts; i++) {
    const j = (i + 1) % nPts;
    pushTri(topC, top[j], top[i]);
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.computeVertexNormals();
  return g;
}

// ---------------- Kích thước & biên dạng kỹ thuật 1:1 (mét) ----------------
// Mũi xe +X, trên +Y, phải +Z. Mặt dưới dải xích chạm đúng y = 0.000.
// Thân xe dài 7.93 m (x = -4.05 .. +3.88), rộng phủ bì ~3.66 m.
// Pháo chính M256 dài 5.28 m từ trunnion (x = +0.44) tới miệng nòng (x = +5.72) -> tổng dài xe 9.77 m.
// Thân xe mỏng dẹt chuẩn Abrams (cổ tháp y = 1.35 m, sàn động cơ sau y = 1.42 m);
// Nóc tháp pháo phẳng đúng y = 2.44 m; đỉnh trạm CROWS đúng y = 2.89 m.

const TRACK_Z = 1.51;
const TRACK_W = 0.635;
const X_FRONT = 3.31;
const X_REAR = -3.37;
const R_FRONT = 0.365;
const R_REAR = 0.435;
const ROAD_WHEEL_R = 0.315;
const ROAD_WHEEL_X = [-2.52, -1.68, -0.84, 0.0, 0.84, 1.68, 2.52] as const;
const RETURN_ROLLER_X = [-1.86, 0.0, 1.86] as const;

// Khối bụng thân dưới (lọt giữa hai dải xích, rộng 2.26 m, khoảng sáng gầm 0.46 m)
const LOWER_HULL_PTS: P2[] = [
  [-3.36, 0.46],
  [2.48, 0.46],
  [3.32, 0.69],
  [3.78, 0.99],
  [3.78, 1.10],
  [-3.98, 1.10],
  [-4.03, 0.95],
  [-3.74, 0.66],
];

// Vè chắn bùn & gờ sponson sườn (rộng 3.56 m, từ y = 0.98..1.13 m)
const SPONSON_PTS: P2[] = [
  [-4.05, 0.98],
  [3.58, 0.98],
  [3.88, 1.01],
  [3.88, 1.06],
  [3.46, 1.13],
  [-3.86, 1.13],
  [-4.05, 1.09],
];

// Khối thân trên mỏng sắc cạnh: tấm Glacis mũi nghiêng siêu thoải ~83° trải rộng + bậc sàn động cơ sau y = 1.42 m
const UPPER_HULL_RINGS: V3[][] = [
  [
    [3.84, 1.06, 0.0],
    [3.82, 1.06, 1.68],
    [1.76, 1.12, 1.77],
    [-1.34, 1.12, 1.77],
    [-1.60, 1.12, 1.77],
    [-4.04, 1.09, 1.74],
    [-4.04, 1.09, -1.74],
    [-1.60, 1.12, -1.77],
    [-1.34, 1.12, -1.77],
    [1.76, 1.12, -1.77],
    [3.82, 1.06, -1.68],
  ],
  [
    [1.70, 1.35, 0.0],
    [1.74, 1.34, 1.58],
    [0.80, 1.35, 1.66],
    [-1.30, 1.35, 1.66],
    [-1.58, 1.42, 1.66],
    [-3.98, 1.38, 1.63],
    [-3.98, 1.38, -1.63],
    [-1.58, 1.42, -1.66],
    [-1.30, 1.35, -1.66],
    [0.80, 1.35, -1.66],
    [1.74, 1.34, -1.58],
  ],
];

// Vỏ tháp pháo đa diện Chobham liền khối (hệ cục bộ tháp đặt tại y_world = 1.35 m -> nóc phẳng y_local = 1.09 => đúng y_world = 2.44 m!)
// Ngồi đầm chắc sát lên cổ thân xe, hai má giáp Chobham nghiêng kép dày dặn, bất đối xứng nhẹ phải (+Z) / trái (-Z).
const TURRET_SHELL_RINGS: V3[][] = [
  // Vòng 0: Gầm đáy tháp (ngồi sát cổ tháp 1.35 m ở trước/giữa, nâng lên y_local = 0.14 => 1.49 m ở gầm khoang đạn bustle để lướt trên sàn động cơ 1.42 m)
  [
    [1.08, 0.05, 0.0],
    [1.08, 0.05, 0.31],
    [1.50, 0.08, 0.34],
    [1.14, 0.08, 1.42],
    [0.20, 0.04, 1.56],
    [-0.94, 0.05, 1.50],
    [-1.36, 0.13, 1.33],
    [-2.62, 0.15, 1.25],
    [-2.62, 0.15, -1.23],
    [-1.36, 0.13, -1.30],
    [-0.94, 0.05, -1.46],
    [0.18, 0.04, -1.51],
    [1.12, 0.08, -1.38],
    [1.47, 0.08, -0.34],
    [1.08, 0.05, -0.31],
  ],
  // Vòng 1: Sống mũi sắc cạnh của hai má giáp Chobham trước & mép dưới vách sườn
  [
    [1.16, 0.22, 0.0],
    [1.16, 0.22, 0.31],
    [1.98, 0.24, 0.34],
    [1.50, 0.24, 1.50],
    [0.22, 0.20, 1.63],
    [-0.92, 0.20, 1.56],
    [-1.34, 0.22, 1.36],
    [-2.86, 0.30, 1.29],
    [-2.86, 0.30, -1.27],
    [-1.34, 0.22, -1.34],
    [-0.92, 0.20, -1.51],
    [0.20, 0.20, -1.57],
    [1.47, 0.24, -1.46],
    [1.94, 0.24, -0.34],
    [1.16, 0.22, -0.31],
  ],
  // Vòng 2: Vai trên trước mép vát bevel (y_local = 1.055)
  [
    [1.02, 1.055, 0.0],
    [1.02, 1.055, 0.31],
    [1.34, 1.055, 0.34],
    [0.95, 1.055, 1.41],
    [0.18, 1.055, 1.53],
    [-0.92, 1.055, 1.47],
    [-1.32, 1.055, 1.31],
    [-2.73, 1.045, 1.24],
    [-2.73, 1.045, -1.22],
    [-1.32, 1.055, -1.29],
    [-0.92, 1.055, -1.43],
    [0.16, 1.055, -1.48],
    [0.93, 1.055, -1.37],
    [1.31, 1.055, -0.34],
    [1.02, 1.055, -0.31],
  ],
  // Vòng 3: Mặt nóc tháp pháo phẳng tại đúng y_local = 1.090 (y_world = 1.35 + 1.09 = 2.44 m!)
  [
    [0.99, 1.09, 0.0],
    [0.99, 1.09, 0.30],
    [1.30, 1.09, 0.33],
    [0.92, 1.09, 1.37],
    [0.18, 1.09, 1.49],
    [-0.92, 1.09, 1.43],
    [-1.32, 1.09, 1.27],
    [-2.69, 1.08, 1.20],
    [-2.69, 1.08, -1.18],
    [-1.32, 1.09, -1.25],
    [-0.92, 1.09, -1.39],
    [0.16, 1.09, -1.44],
    [0.90, 1.09, -1.33],
    [1.27, 1.09, -0.33],
    [0.99, 1.09, -0.30],
  ],
];

// 7 tấm váy chắn đạn bên hông (side skirts) cao lên y = 1.10 m nối liền gờ chắn bùn
const rectPts = (x0: number, x1: number, y0: number, y1: number, chamfer = 0.03): P2[] => [
  [x0 + chamfer, y0],
  [x1 - chamfer, y0],
  [x1, y0 + chamfer],
  [x1, y1],
  [x0, y1],
  [x0, y0 + chamfer],
];

const SKIRT_SPECS: { pts: P2[]; thick: number }[] = [
  {
    pts: [
      [2.82, 0.44],
      [3.36, 0.56],
      [3.74, 0.84],
      [3.85, 0.98],
      [3.85, 1.09],
      [2.82, 1.09],
    ],
    thick: 0.058,
  },
  { pts: rectPts(1.96, 2.80, 0.44, 1.09), thick: 0.058 },
  { pts: rectPts(1.10, 1.94, 0.44, 1.09), thick: 0.058 },
  { pts: rectPts(0.24, 1.08, 0.44, 1.09), thick: 0.052 },
  { pts: rectPts(-0.70, 0.22, 0.46, 1.09), thick: 0.034 },
  { pts: rectPts(-1.65, -0.72, 0.46, 1.09), thick: 0.034 },
  {
    pts: [
      [-1.67, 0.46],
      [-1.67, 1.09],
      [-4.01, 1.09],
      [-4.01, 0.95],
      [-3.84, 0.90],
      [-3.62, 0.96],
      [-3.37, 0.99],
      [-3.12, 0.93],
      [-2.92, 0.79],
      [-2.74, 0.58],
      [-2.54, 0.46],
    ],
    thick: 0.034,
  },
];

// Biên dạng khiên pháo (Gun Mantlet) nghiêng khớp góc hai má giáp Chobham
const MANTLET_PTS: P2[] = [
  [0.45, -0.26],
  [1.16, -0.24],
  [1.38, -0.10],
  [0.98, 0.38],
  [0.45, 0.38],
];

// Pháo chính 120mm M256 L/44 (dài 5.28 m từ trunnion tới miệng nòng, lòng pháo rỗng r = 0.060 m)
const M256_BARREL_PROFILE: P2[] = [
  [0.132, 0.0],
  [0.132, 1.32],
  [0.116, 1.36],
  [0.113, 1.92],
  [0.121, 1.93],
  [0.121, 1.98],
  [0.098, 1.99],
  [0.096, 2.48],
  [0.092, 3.35],
  [0.089, 4.14],
  [0.096, 4.15],
  [0.096, 4.20],
  [0.086, 4.21],
  [0.083, 5.14],
  [0.095, 5.15],
  [0.095, 5.275],
  [0.062, 5.28],
  [0.060, 5.02],
  [0.001, 5.02],
];

// Bầu hút khói (bore evacuator) lệch tâm phía trên giữa nòng M256
const BORE_EVAC_PROFILE: P2[] = [
  [0.068, 2.45],
  [0.088, 2.49],
  [0.134, 2.60],
  [0.139, 2.66],
  [0.139, 3.16],
  [0.131, 3.23],
  [0.084, 3.33],
  [0.066, 3.37],
];

// Khung lan can ống thép giỏ đồ sườn tháp pháo & giỏ đồ đuôi + cần ăng-ten mảnh
const SIDE_RAIL_R_TOP: V3[] = [
  [0.34, 0.90, 1.56],
  [0.24, 0.90, 1.70],
  [-1.12, 0.90, 1.62],
  [-1.24, 0.90, 1.40],
];
const SIDE_RAIL_R_BOT: V3[] = [
  [0.34, 0.44, 1.60],
  [0.24, 0.44, 1.72],
  [-1.12, 0.44, 1.64],
  [-1.24, 0.44, 1.42],
];
const SIDE_RAIL_L_TOP: V3[] = [
  [0.32, 0.90, -1.50],
  [0.22, 0.90, -1.64],
  [-1.12, 0.90, -1.57],
  [-1.24, 0.90, -1.36],
];
const SIDE_RAIL_L_BOT: V3[] = [
  [0.32, 0.44, -1.54],
  [0.22, 0.44, -1.66],
  [-1.12, 0.44, -1.59],
  [-1.24, 0.44, -1.38],
];

const BUSTLE_RACK_TOP: V3[] = [
  [-2.74, 0.95, 1.22],
  [-3.36, 0.95, 1.12],
  [-3.36, 0.95, -1.10],
  [-2.74, 0.95, -1.20],
];
const BUSTLE_RACK_BOT: V3[] = [
  [-2.82, 0.46, 1.24],
  [-3.32, 0.46, 1.10],
  [-3.32, 0.46, -1.08],
  [-2.82, 0.46, -1.22],
];

const ANTENNA_R_PTS: V3[] = [
  [-2.65, 1.07, 1.16],
  [-2.69, 1.46, 1.18],
  [-2.75, 1.88, 1.20],
  [-2.82, 2.26, 1.22],
];
const ANTENNA_L_PTS: V3[] = [
  [-2.65, 1.07, -1.14],
  [-2.69, 1.46, -1.16],
  [-2.75, 1.88, -1.18],
  [-2.82, 2.26, -1.20],
];

const APU_EXHAUST_PTS: V3[] = [
  [-3.94, 1.54, -1.42],
  [-4.06, 1.52, -1.46],
  [-4.10, 1.42, -1.48],
];

// Đinh tán & bu lông dọc hai bên váy chắn xích
const SKIRT_RIVET_POINTS: V3[] = (() => {
  const pts: V3[] = [];
  const xs = [-3.82, -3.35, -2.88, -2.35, -1.85, -1.46, -0.92, -0.50, 0.02, 0.42, 0.88, 1.28, 1.76, 2.14, 2.62, 3.00, 3.46];
  for (const side of [-1, 1] as const) {
    for (const x of xs) {
      const thick = x > 1.09 ? 0.058 : x > 0.23 ? 0.052 : 0.034;
      const zOut = side * (1.832 + thick + 0.004);
      pts.push([x, 1.04, zOut]);
      if (x > -2.45 && x < 3.35) {
        pts.push([x, 0.52, zOut]);
      }
    }
  }
  return pts;
})();

const SPROCKET_TEETH = Array.from({ length: 11 }, (_, i) => (i / 11) * Math.PI * 2);
const HUB_BOLTS = Array.from({ length: 10 }, (_, i) => (i / 10) * Math.PI * 2);
const CUPOLA_BLOCKS = Array.from({ length: 8 }, (_, i) => (i / 8) * Math.PI * 2);
const SMOKE_ANGLES = [
  { y: 0.22, p: 0.30, dy: 0.05, dz: -0.08 },
  { y: 0.36, p: 0.26, dy: 0.05, dz: 0.0 },
  { y: 0.52, p: 0.22, dy: 0.05, dz: 0.08 },
  { y: 0.16, p: 0.16, dy: -0.04, dz: -0.06 },
  { y: 0.32, p: 0.14, dy: -0.04, dz: 0.02 },
  { y: 0.48, p: 0.12, dy: -0.04, dz: 0.10 },
] as const;

/** Bánh chủ động răng cưa phía sau + nắp moay-ơ truyền động hành tinh đặc trưng của Abrams */
const DriveSprocket: React.FC<{
  side: 1 | -1;
  spin: number;
  rimColor: string;
  hubMat: ReturnType<typeof paint>;
}> = ({ side, spin, rimColor, hubMat }) => {
  const metalTeeth = plain('#4a4e52', 0.42, 0.68);
  const darkSteel = plain('#2a2d30', 0.55, 0.52);
  const rimMat = plain(rimColor, 0.58, 0.32);

  return (
    <group position={[X_REAR, 0.035 + R_REAR, side * TRACK_Z]} rotation={[0, 0, -spin]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={darkSteel} castShadow>
        <cylinderGeometry args={[0.24, 0.24, 0.48, 24]} />
      </mesh>
      {[-0.21, 0.21].map((dz, idx) => (
        <group key={idx} position={[0, 0, dz]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={rimMat} castShadow>
            <cylinderGeometry args={[0.375, 0.375, 0.045, 28]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={darkSteel}>
            <cylinderGeometry args={[0.31, 0.31, 0.052, 24]} />
          </mesh>
          {SPROCKET_TEETH.map((a, ti) => (
            <mesh
              key={ti}
              position={[Math.cos(a) * 0.405, Math.sin(a) * 0.405, 0]}
              rotation={[0, 0, a]}
              geometry={rbox(0.085, 0.052, 0.038, 0.008)}
              material={metalTeeth}
            />
          ))}
        </group>
      ))}
      <group position={[0, 0, side * 0.22]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={hubMat} castShadow>
          <cylinderGeometry args={[0.21, 0.25, 0.11, 24]} />
        </mesh>
        <mesh position={[0, 0, side * 0.065]} rotation={[Math.PI / 2, 0, 0]} material={hubMat} castShadow>
          <cylinderGeometry args={[0.135, 0.165, 0.05, 20]} />
        </mesh>
        {HUB_BOLTS.map((a, bi) => (
          <mesh
            key={bi}
            position={[Math.cos(a) * 0.18, Math.sin(a) * 0.18, side * 0.058]}
            rotation={[Math.PI / 2, 0, 0]}
            material={darkSteel}
          >
            <cylinderGeometry args={[0.014, 0.014, 0.025, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Bánh dẫn hướng phía trước (Front Idler) */
const FrontIdler: React.FC<{ side: 1 | -1; spin: number; rimColor: string }> = ({ side, spin, rimColor }) => {
  const rimMat = plain(rimColor, 0.55, 0.32);
  const darkRim = plain('#2c2d2e', 0.72, 0.35);
  return (
    <group position={[X_FRONT, 0.035 + R_FRONT, side * TRACK_Z]} rotation={[0, 0, -spin]}>
      {[-0.14, 0.14].map((dz, i) => (
        <group key={i} position={[0, 0, dz]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={darkRim} castShadow>
            <cylinderGeometry args={[0.332, 0.332, 0.14, 28]} />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={rimMat}>
            <cylinderGeometry args={[0.255, 0.255, 0.15, 24]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0, side * 0.18]} rotation={[Math.PI / 2, 0, 0]} material={rimMat}>
        <cylinderGeometry args={[0.105, 0.135, 0.08, 18]} />
      </mesh>
    </group>
  );
};

export const M1A2Abrams: React.FC<M1A2AbramsProps> = ({
  turretYaw = 0,
  gunPitch = 0,
  recoil = 0,
  citvYaw = 0,
  crowsYaw = 0,
  travel = 0,
  hullPitch = 0,
  hullRoll = 0,
  variant = 'm1a2',
  camo = 'desert',
  blowoutOpen = 0,
  exhaustHeat = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const isWoodland = camo === 'woodland';
  const isSepV3 = variant === 'sepv3';
  const isMud = variant === 'm1a1_mud';

  const clampedRecoil = Math.max(0, Math.min(1, recoil));
  const clampedBlowout = Math.max(0, Math.min(1, blowoutOpen));
  const clampedHeat = Math.max(0, Math.min(1, exhaustHeat));

  // ---------------- Vật liệu sơn CARC & cơ khí ----------------
  const preset = isWoodland ? PAINT_PRESETS.abramsWoodland : PAINT_PRESETS.abramsDesert;
  const hullCamo = isWoodland ? [...preset.camo] : [mix(preset.color, preset.camo[0], 0.42), mix(preset.color, preset.camo[1], 0.42)];

  const hullMat = useMemo(
    () =>
      paint({
        ...preset,
        camo: hullCamo,
        dirt: isMud ? Math.min(0.92, preset.dirt + 0.42) : preset.dirt,
        wear: isMud ? preset.wear + 0.1 : preset.wear,
        repeat: 0.42,
        seed: isWoodland ? 17 : 7,
      }),
    [preset, hullCamo, isMud, isWoodland],
  );

  const turretMat = useMemo(
    () =>
      paint({
        ...preset,
        camo: hullCamo,
        dirt: isMud ? Math.min(0.7, preset.dirt + 0.2) : preset.dirt * 0.72,
        repeat: 0.42,
        seed: isWoodland ? 23 : 11,
      }),
    [preset, hullCamo, isMud, isWoodland],
  );

  const componentCarcMat = useMemo(
    () =>
      paint({
        color: preset.color,
        camo: isWoodland ? [preset.camo[0]] : [],
        camoScale: 1.1,
        wear: preset.wear * 0.85,
        dirt: isMud ? 0.58 : preset.dirt * 0.55,
        roughness: preset.roughness,
        metalness: preset.metalness,
        repeat: 1.0,
        seed: isWoodland ? 31 : 19,
      }),
    [preset, isMud, isWoodland],
  );

  const lowerMudMat = useMemo(
    () =>
      paint({
        color: isMud ? '#6e5a3e' : mix(preset.color, '#7a684b', 0.26),
        camo: isMud ? ['#56452e', '#846e4e'] : hullCamo,
        camoScale: 1.4,
        wear: 0.34,
        dirt: isMud ? 0.92 : 0.55,
        roughness: 0.82,
        metalness: 0.18,
        repeat: 0.42,
        seed: 43,
      }),
    [isMud, preset, hullCamo],
  );

  const rimColor = isWoodland ? '#48563a' : '#bba378';
  const rivetColor = isWoodland ? '#313a28' : '#8b7550';
  const opticGlass = plain('#1a2a38', 0.15, 0.8);
  const thermalLens = plain('#2a2216', 0.14, 0.86);
  const gunSteel = plain('#282c30', 0.44, 0.68);
  const darkMetal = plain('#22262b', 0.62, 0.48);
  const louverSteel = plain('#30353b', 0.58, 0.42);
  const brassAmmo = plain('#b59044', 0.36, 0.72);
  const rubberMat = plain('#232321', 0.9, 0.05);
  const grilleDark = plain('#181b1f', 0.8, 0.32);
  const boreBlack = plain('#090a0c', 0.95, 0.1);
  const radomeMat = plain(isWoodland ? '#7c826d' : '#d8c5a0', 0.48, 0.16);
  const canvasStowMat = plain(isWoodland ? '#4f5841' : '#a9936d', 0.88, 0.04);

  // Vật liệu nan xả đuôi tuabin AGT1500 (ửng đỏ cam #ff6a24 khi exhaustHeat -> 1 ở 930°F)
  const exhaustLouverCol = mix('#25282c', '#ff6a24', clampedHeat * 0.85);
  const exhaustLouverMat = plain(exhaustLouverCol, 0.55 - clampedHeat * 0.2, 0.45, {
    emissive: '#ff6a24',
    emissiveIntensity: clampedHeat * 2.4,
  });
  const exhaustCoreMat = plain(mix('#121316', '#ffb14a', clampedHeat), 0.7, 0.2, {
    emissive: '#ff6a24',
    emissiveIntensity: clampedHeat * 3.4,
  });

  // Vật liệu miệng khoang đạn 36 viên rực sáng khi 2 tấm blowout bật mở
  const blowoutGlowMat = plain('#ff7e24', 0.35, 0.1, {
    emissive: '#ff6a18',
    emissiveIntensity: 1.2 + clampedBlowout * 3.2,
  });
  const blowoutCoreHot = plain('#ffe382', 0.25, 0.05, {
    emissive: '#ffae2b',
    emissiveIntensity: 1.6 + clampedBlowout * 4.0,
  });

  // ---------------- Geometries ----------------
  const lowerHullGeo = useMemo(() => extrude(LOWER_HULL_PTS, 2.26, 0.03), []);
  const sponsonGeo = useMemo(() => extrude(SPONSON_PTS, 3.56, 0.025), []);
  const upperHullGeo = useMemo(() => buildLoftedArmor(UPPER_HULL_RINGS), []);
  const skirtGeos = useMemo(() => SKIRT_SPECS.map((s) => extrude(s.pts, s.thick, 0.01)), []);

  const turretShellGeo = useMemo(() => buildLoftedArmor(TURRET_SHELL_RINGS), []);
  const mantletGeo = useMemo(() => extrude(MANTLET_PTS, 0.58, 0.025), []);
  const barrelGeo = useMemo(() => lathe(M256_BARREL_PROFILE, 36), []);
  const boreEvacGeo = useMemo(() => lathe(BORE_EVAC_PROFILE, 32), []);

  const sideRailRTopGeo = useMemo(() => pipe(SIDE_RAIL_R_TOP, 0.016, 20), []);
  const sideRailRBotGeo = useMemo(() => pipe(SIDE_RAIL_R_BOT, 0.016, 20), []);
  const sideRailLTopGeo = useMemo(() => pipe(SIDE_RAIL_L_TOP, 0.016, 20), []);
  const sideRailLBotGeo = useMemo(() => pipe(SIDE_RAIL_L_BOT, 0.016, 20), []);
  const rackTopGeo = useMemo(() => pipe(BUSTLE_RACK_TOP, 0.02, 28), []);
  const rackBotGeo = useMemo(() => pipe(BUSTLE_RACK_BOT, 0.02, 28), []);
  const antennaRGeo = useMemo(() => pipe(ANTENNA_R_PTS, 0.011, 24), []);
  const antennaLGeo = useMemo(() => pipe(ANTENNA_L_PTS, 0.011, 24), []);
  const apuPipeGeo = useMemo(() => pipe(APU_EXHAUST_PTS, 0.022, 16), []);

  const roadSpin = travel / ROAD_WHEEL_R;
  const sprocketSpin = travel / 0.405;
  const idlerSpin = travel / 0.332;
  const rollerSpin = travel / 0.082;

  return (
    <group position={position} rotation={rotation}>
      {/* ==================== 1. HỆ THỐNG GẦM, BÁNH & XÍCH T-158 ==================== */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          {/* Dải xích T-158 rộng 0.635 m, đáy mắt xích chạm đúng y = 0.000 */}
          <Track
            xFront={X_FRONT}
            xRear={X_REAR}
            rFront={R_FRONT}
            rRear={R_REAR}
            width={TRACK_W}
            link={0.165}
            travel={travel}
            color={isMud ? '#3d352a' : '#2f302d'}
            position={[0, 0.035, side * TRACK_Z]}
          />

          {/* 7 cặp bánh chịu nặng đôi (r = 0.315) + tay đòn thanh xoắn */}
          {ROAD_WHEEL_X.map((wx, wi) => (
            <group key={wi}>
              <group
                position={[wx, 0.372, side * 1.62]}
                rotation={side === -1 ? [0, Math.PI, 0] : [0, 0, 0]}
              >
                <Wheel
                  r={ROAD_WHEEL_R}
                  width={0.19}
                  spin={side === -1 ? -roadSpin : roadSpin}
                  tire="#242423"
                  rim={rimColor}
                  bolts={10}
                />
              </group>
              <group
                position={[wx, 0.372, side * 1.39]}
                rotation={side === 1 ? [0, Math.PI, 0] : [0, 0, 0]}
              >
                <Wheel
                  r={ROAD_WHEEL_R}
                  width={0.18}
                  spin={side === 1 ? -roadSpin : roadSpin}
                  tire="#242423"
                  rim={rimColor}
                  bolts={8}
                />
              </group>
              <mesh
                position={[wx + 0.14, 0.42, side * 1.24]}
                rotation={[0, 0, -0.36]}
                geometry={rbox(0.36, 0.09, 0.11, 0.02)}
                material={darkMetal}
              />
            </group>
          ))}

          <FrontIdler side={side} spin={idlerSpin} rimColor={rimColor} />
          <DriveSprocket side={side} spin={sprocketSpin} rimColor={rimColor} hubMat={componentCarcMat} />

          {/* 3 con lăn đỡ xích trên */}
          {RETURN_ROLLER_X.map((rx, ri) => (
            <mesh
              key={ri}
              position={[rx, 0.74, side * TRACK_Z]}
              rotation={[Math.PI / 2, -rollerSpin, 0]}
              material={darkMetal}
            >
              <cylinderGeometry args={[0.082, 0.082, 0.38, 16]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* ==================== 2. THÂN XE & THÁP PHÁO (nhún theo hullPitch / hullRoll) ==================== */}
      <group position={[0, 0.65, 0]} rotation={[hullRoll, 0, hullPitch]}>
        <group position={[0, -0.65, 0]}>
          {/* Khối bụng thân dưới, chắn bùn sườn & khối thân trên Glacis mỏng dẹt chuẩn Abrams */}
          <mesh geometry={lowerHullGeo} material={lowerMudMat} castShadow receiveShadow />
          <mesh geometry={sponsonGeo} material={hullMat} castShadow receiveShadow />
          <mesh geometry={upperHullGeo} material={hullMat} castShadow receiveShadow />

          {/* Dải bùn đắp dày thêm ở mũi dưới & gầm khi variant === 'm1a1_mud' */}
          {isMud && (
            <>
              <mesh
                position={[3.42, 0.86, 0]}
                rotation={[0, 0, 0.56]}
                geometry={rbox(0.95, 0.07, 2.28, 0.03)}
                material={lowerMudMat}
              />
              {([-1, 1] as const).map((s) => (
                <mesh
                  key={s}
                  position={[0.55, 0.47, s * 1.855]}
                  geometry={rbox(4.6, 0.11, 0.075, 0.025)}
                  material={lowerMudMat}
                />
              ))}
            </>
          )}

          {/* 7 tấm váy chắn đạn bên hông (side skirts) mỗi bên: mặt trong |z| = 1.832 > mép ngoài xích 1.8275 */}
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              {SKIRT_SPECS.map((sk, idx) => (
                <mesh
                  key={idx}
                  position={[0, 0, side * (1.832 + sk.thick / 2)]}
                  geometry={skirtGeos[idx]}
                  material={isMud && idx <= 5 ? lowerMudMat : hullMat}
                  castShadow
                  receiveShadow
                />
              ))}
              {/* Thanh ray bản lề chạy dọc mép trên váy chắn đạn */}
              <mesh
                position={[-0.08, 1.095, side * 1.815]}
                geometry={rbox(7.88, 0.045, 0.095, 0.01)}
                material={hullMat}
              />
              {[-2.15, -1.18, -0.24, 0.66, 1.52, 2.38, 3.24].map((hx, hi) => (
                <mesh
                  key={hi}
                  position={[hx, 1.095, side * (1.832 + (hx > 0.2 ? 0.056 : 0.036))]}
                  geometry={rbox(0.42, 0.034, 0.034, 0.006)}
                  material={darkMetal}
                />
              ))}
              {/* Bậc bước chân lên xe ở tấm số 5 */}
              <mesh
                position={[-0.24, 0.62, side * 1.853]}
                geometry={rbox(0.18, 0.085, 0.04, 0.008)}
                material={grilleDark}
              />
              {/* Vè cao su chắn bùn mũi trước */}
              <mesh
                position={[3.86, 0.90, side * 1.51]}
                rotation={[0, 0, -0.18]}
                geometry={rbox(0.03, 0.22, 0.62, 0.006)}
                material={rubberMat}
              />
            </group>
          ))}

          {/* Hàng đinh tán & chốt khoá trên váy chắn đạn */}
          <Rivets points={SKIRT_RIVET_POINTS} r={0.015} color={rivetColor} />

          {/* Nắp người lái chính giữa mũi glacis + 3 khối kính tiềm vọng góc rộng */}
          <group position={[2.06, 1.32, 0]}>
            <mesh rotation={[0, 0, -0.12]} geometry={rbox(0.64, 0.05, 0.72, 0.02)} material={componentCarcMat} castShadow />
            {[
              { x: 0.23, z: 0, yaw: 0 },
              { x: 0.16, z: 0.24, yaw: -0.44 },
              { x: 0.16, z: -0.24, yaw: 0.44 },
            ].map((p, pi) => (
              <group key={pi} position={[p.x, 0.046, p.z]} rotation={[0, p.yaw, 0]}>
                <mesh geometry={rbox(0.13, 0.08, 0.15, 0.01)} material={componentCarcMat} castShadow />
                <mesh position={[0.058, -0.004, 0]} geometry={rbox(0.024, 0.048, 0.118, 0.004)} material={opticGlass} />
              </group>
            ))}
          </group>

          {/* Nắp nhiên liệu mũi, cụm đèn pha lồng thép & móc kéo chữ U trước/sau */}
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <mesh position={[2.92, 1.19, side * 1.30]} rotation={[0, 0, -0.14]} material={darkMetal}>
                <cylinderGeometry args={[0.105, 0.105, 0.035, 16]} />
              </mesh>
              <group position={[3.62, 1.17, side * 1.54]}>
                <mesh geometry={rbox(0.18, 0.14, 0.22, 0.015)} material={darkMetal} castShadow />
                <mesh position={[0.075, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={opticGlass}>
                  <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
                </mesh>
              </group>
              <mesh
                position={[3.80, 0.96, side * 0.84]}
                rotation={[0, 0, -0.32]}
                geometry={rbox(0.22, 0.08, 0.11, 0.02)}
                material={gunSteel}
                castShadow
              />
              <mesh
                position={[-4.06, 1.00, side * 0.94]}
                geometry={rbox(0.18, 0.09, 0.11, 0.02)}
                material={gunSteel}
                castShadow
              />
              <mesh
                position={[-4.04, 1.24, side * 1.50]}
                geometry={rbox(0.06, 0.085, 0.16, 0.012)}
                material={darkMetal}
              />
            </group>
          ))}

          {/* Sàn động cơ tuabin AGT1500 phía sau: cửa hút gió & cụm lưới tản nhiệt chìm khung CARC */}
          {([-1, 1] as const).map((side) => (
            <group key={side}>
              <group position={[-2.06, 1.41, side * 0.86]} rotation={[0, 0, 0.016]}>
                <mesh geometry={rbox(0.76, 0.024, 0.92, 0.008)} material={componentCarcMat} />
                <mesh position={[0, 0.004, 0]} geometry={rbox(0.68, 0.024, 0.84, 0.006)} material={grilleDark} receiveShadow />
                {Array.from({ length: 7 }, (_, li) => (
                  <mesh
                    key={li}
                    position={[-0.255 + li * 0.085, 0.016, 0]}
                    geometry={rbox(0.03, 0.01, 0.80, 0.002)}
                    material={louverSteel}
                  />
                ))}
              </group>
              <group position={[-3.22, 1.39, side * 0.88]} rotation={[0, 0, 0.018]}>
                <mesh geometry={rbox(1.10, 0.024, 0.94, 0.008)} material={componentCarcMat} />
                <mesh position={[0, 0.004, 0]} geometry={rbox(1.02, 0.024, 0.86, 0.006)} material={grilleDark} receiveShadow />
                {Array.from({ length: 10 }, (_, li) => (
                  <mesh
                    key={li}
                    position={[-0.43 + li * 0.096, 0.016, 0]}
                    geometry={rbox(0.034, 0.01, 0.82, 0.002)}
                    material={louverSteel}
                  />
                ))}
              </group>
            </group>
          ))}
          <mesh
            position={[-2.68, 1.405, 0]}
            rotation={[0, 0, 0.017]}
            geometry={rbox(1.94, 0.028, 0.64, 0.01)}
            material={componentCarcMat}
          />

          {/* Vỉ xả đuôi tuabin AGT1500 (exhaustHeat 0..1 ửng đỏ cam #ff6a24 ở 930°F) */}
          <group position={[-4.04, 1.21, 0]}>
            <mesh position={[0.02, 0, 0]} geometry={rbox(0.06, 0.27, 1.22, 0.01)} material={exhaustCoreMat} />
            <mesh position={[-0.01, 0.145, 0]} geometry={rbox(0.07, 0.03, 1.28, 0.008)} material={darkMetal} />
            <mesh position={[-0.01, -0.145, 0]} geometry={rbox(0.07, 0.03, 1.28, 0.008)} material={darkMetal} />
            <mesh position={[-0.01, 0, 0]} geometry={rbox(0.075, 0.30, 0.04, 0.006)} material={darkMetal} />
            {Array.from({ length: 8 }, (_, i) => (
              <mesh
                key={i}
                position={[-0.015, -0.112 + i * 0.032, 0]}
                rotation={[0, 0, 0.28]}
                geometry={rbox(0.055, 0.012, 1.20, 0.003)}
                material={exhaustLouverMat}
              />
            ))}
            {([-1, 1] as const).map((s) => (
              <group key={s} position={[0, 0.0, s * 1.02]}>
                <mesh position={[0.02, 0, 0]} geometry={rbox(0.05, 0.22, 0.46, 0.01)} material={grilleDark} />
                {Array.from({ length: 6 }, (_, gi) => (
                  <mesh
                    key={gi}
                    position={[-0.012, -0.08 + gi * 0.032, 0]}
                    rotation={[0, 0, 0.24]}
                    geometry={rbox(0.045, 0.011, 0.42, 0.003)}
                    material={clampedHeat > 0.05 ? exhaustLouverMat : louverSteel}
                  />
                ))}
              </group>
            ))}
          </group>

          {/* Hộp máy phát phụ APU nhỏ bên đuôi trái khi variant === 'sepv3' */}
          {isSepV3 && (
            <group>
              <mesh
                position={[-3.68, 1.52, -1.34]}
                geometry={rbox(0.62, 0.28, 0.52, 0.024)}
                material={componentCarcMat}
                castShadow
              />
              <mesh
                position={[-3.68, 1.54, -1.605]}
                geometry={rbox(0.40, 0.15, 0.02, 0.005)}
                material={grilleDark}
              />
              <mesh geometry={apuPipeGeo} material={gunSteel} castShadow />
            </group>
          )}

          {/* ==================== 3. THÁP PHÁO ĐA DIỆN CHOBHAM LIỀN KHỐI (y_local = 0 tại y_world = 1.35 m, nóc y_local = 1.09 => 2.44 m) ==================== */}
          <group position={[0.08, 1.35, 0]} rotation={[0, turretYaw, 0]}>
            {/* Cổ xoay tháp pháo */}
            <mesh position={[-0.04, 0.05, 0]} material={darkMetal} castShadow>
              <cylinderGeometry args={[1.24, 1.26, 0.12, 36]} />
            </mesh>

            {/* Vỏ tháp pháo đa diện Chobham liền khối (nóc phẳng đúng y_world = 2.44 m) */}
            <mesh geometry={turretShellGeo} material={turretMat} castShadow receiveShadow />

            {/* ==================== 4. PHÁO CHÍNH 120MM M256, BẦU HÚT KHÓI & CẢM BIẾN MRS ==================== */}
            {/* Trunnion tại x_local = 0.36 -> x_world = +0.44 m; đầu nòng +5.28 -> x_world = +5.72 m (tổng dài xe 9.77 m) */}
            <group position={[0.36, 0.50, 0]} rotation={[0, 0, gunPitch]}>
              <mesh geometry={mantletGeo} material={componentCarcMat} castShadow receiveShadow />
              <mesh position={[1.24, 0.0, 0]} rotation={[0, 0, Math.PI / 2]} material={rubberMat} castShadow>
                <cylinderGeometry args={[0.16, 0.188, 0.18, 24]} />
              </mesh>
              <mesh position={[1.38, 0.05, 0.19]} rotation={[0, 0, Math.PI / 2]} material={gunSteel}>
                <cylinderGeometry args={[0.018, 0.02, 0.28, 12]} />
              </mesh>

              {/* Cụm nòng pháo M256 giật lùi 0.30 m theo recoil (0..1) */}
              <group position={[-clampedRecoil * 0.30, 0, 0]}>
                <mesh geometry={barrelGeo} material={componentCarcMat} castShadow receiveShadow />
                <mesh position={[5.15, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={boreBlack}>
                  <cylinderGeometry args={[0.059, 0.059, 0.25, 24]} />
                </mesh>
                {[1.955, 2.52, 3.29, 4.175, 5.145].map((bx, bi) => (
                  <mesh key={bi} position={[bx, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel}>
                    <cylinderGeometry
                      args={[
                        bi === 1 || bi === 2 ? 0.141 : bi === 0 ? 0.123 : 0.098,
                        bi === 1 || bi === 2 ? 0.141 : bi === 0 ? 0.123 : 0.098,
                        0.045,
                        28,
                      ]}
                    />
                  </mesh>
                ))}

                {/* Bầu hút khói (Bore Evacuator) lệch tâm lên trên */}
                <mesh
                  position={[0, 0.032, 0]}
                  geometry={boreEvacGeo}
                  material={componentCarcMat}
                  castShadow
                  receiveShadow
                />

                {/* Cảm biến gương đầu nòng MRS (Muzzle Reference Sensor) ở sát miệng nòng */}
                <group position={[5.20, 0.09, 0]}>
                  <mesh position={[0, 0.048, 0]} geometry={rbox(0.052, 0.096, 0.034, 0.006)} material={gunSteel} castShadow />
                  <mesh position={[-0.008, 0.105, 0]} geometry={rbox(0.072, 0.054, 0.046, 0.008)} material={componentCarcMat} castShadow />
                  <mesh position={[-0.045, 0.105, 0]} geometry={rbox(0.008, 0.036, 0.032, 0.002)} material={opticGlass} />
                </group>
              </group>
            </group>

            {/* ==================== 5. QUANG HỌC, VŨ KHÍ NÓC THÁP & TẤM XẢ NỔ BLOWOUT (y_local = 1.09 => y_world = 2.44 m) ==================== */}
            {/* 5A. Hộp quang học GPS ("doghouse") phía trước bên phải (+Z) */}
            <group position={[0.84, 1.09, 0.72]}>
              <mesh position={[0, 0.15, 0]} geometry={rbox(0.58, 0.30, 0.45, 0.025)} material={componentCarcMat} castShadow />
              <mesh
                position={[0.04, 0.295, 0]}
                rotation={[0, 0, -0.10]}
                geometry={rbox(0.60, 0.04, 0.47, 0.01)}
                material={componentCarcMat}
              />
              {([-1, 1] as const).map((s) => (
                <mesh
                  key={s}
                  position={[0.32, 0.15, s * 0.205]}
                  rotation={[0, s * 0.22, 0]}
                  geometry={rbox(0.15, 0.26, 0.028, 0.005)}
                  material={componentCarcMat}
                />
              ))}
              <mesh position={[0.265, 0.15, 0]} geometry={rbox(0.05, 0.22, 0.35, 0.008)} material={darkMetal} />
              <mesh position={[0.288, 0.155, -0.05]} geometry={rbox(0.018, 0.17, 0.19, 0.003)} material={opticGlass} />
              <mesh position={[0.288, 0.155, 0.105]} geometry={rbox(0.018, 0.15, 0.095, 0.003)} material={thermalLens} />
            </group>

            {/* 5B. Kính tiềm vọng nhiệt 360° CITV phía trước bên trái (-Z, ẩn khi m1a1_mud) */}
            {!isMud && (
              <group position={[0.58, 1.09, -0.66]}>
                <mesh position={[0, 0.055, 0]} material={componentCarcMat} castShadow>
                  <cylinderGeometry args={[0.21, 0.24, 0.11, 24]} />
                </mesh>
                <group position={[0, 0.11, 0]} rotation={[0, citvYaw, 0]}>
                  <mesh position={[0, 0.12, 0]} material={componentCarcMat} castShadow>
                    <cylinderGeometry args={[0.185, 0.195, 0.24, 24]} />
                  </mesh>
                  <mesh position={[0, 0.255, 0]} material={componentCarcMat} castShadow>
                    <cylinderGeometry args={[0.16, 0.215, 0.05, 24]} />
                  </mesh>
                  <mesh position={[0.145, 0.125, 0]} geometry={rbox(0.11, 0.165, 0.215, 0.012)} material={darkMetal} />
                  <mesh position={[0.196, 0.125, 0]} geometry={rbox(0.018, 0.13, 0.17, 0.004)} material={opticGlass} />
                </group>
              </group>
            )}

            {/* 5C. Vòm trưởng xe bên phải (+Z) kèm trạm vũ khí điều khiển từ xa CROWS .50 cal M2HB (đỉnh 2.89 m) */}
            <group position={[-0.16, 1.09, 0.70]}>
              <mesh position={[0, 0.06, 0]} material={componentCarcMat} castShadow>
                <cylinderGeometry args={[0.37, 0.40, 0.12, 24]} />
              </mesh>
              <mesh position={[0, 0.13, 0]} material={componentCarcMat} castShadow>
                <cylinderGeometry args={[0.33, 0.35, 0.04, 24]} />
              </mesh>
              {CUPOLA_BLOCKS.map((a, ci) => (
                <mesh
                  key={ci}
                  position={[Math.cos(a) * 0.355, 0.085, Math.sin(a) * 0.355]}
                  rotation={[0, -a, 0]}
                  geometry={rbox(0.04, 0.045, 0.10, 0.004)}
                  material={opticGlass}
                />
              ))}

              <group position={[0.28, 0.06, 0.08]} rotation={[0, crowsYaw, 0]}>
                <mesh position={[0, 0.08, 0]} material={darkMetal} castShadow>
                  <cylinderGeometry args={[0.11, 0.14, 0.16, 18]} />
                </mesh>
                <mesh position={[0, 0.19, 0]} geometry={rbox(0.18, 0.07, 0.28, 0.012)} material={darkMetal} castShadow />
                {([-1, 1] as const).map((s) => (
                  <mesh
                    key={s}
                    position={[0, 0.29, s * 0.12]}
                    geometry={rbox(0.11, 0.18, 0.036, 0.008)}
                    material={darkMetal}
                    castShadow
                  />
                ))}
                <mesh position={[0.10, 0.22, -0.02]} geometry={rbox(0.20, 0.12, 0.16, 0.015)} material={componentCarcMat} castShadow />
                <mesh position={[0.202, 0.22, -0.05]} geometry={rbox(0.015, 0.075, 0.065, 0.003)} material={opticGlass} />
                <mesh position={[0.202, 0.22, 0.03]} geometry={rbox(0.015, 0.065, 0.055, 0.003)} material={thermalLens} />

                <group position={[0.04, 0.34, 0]}>
                  <mesh position={[-0.04, 0, 0]} geometry={rbox(0.56, 0.11, 0.095, 0.01)} material={gunSteel} castShadow />
                  <mesh position={[-0.34, 0.01, 0]} geometry={rbox(0.05, 0.10, 0.14, 0.008)} material={darkMetal} />
                  <mesh position={[0.36, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel} castShadow>
                    <cylinderGeometry args={[0.032, 0.034, 0.28, 14]} />
                  </mesh>
                  <mesh position={[0.84, 0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel} castShadow>
                    <cylinderGeometry args={[0.017, 0.021, 0.76, 12]} />
                  </mesh>
                  <mesh position={[-0.02, 0.01, -0.095]} rotation={[0.35, 0, 0]} geometry={rbox(0.11, 0.035, 0.11, 0.005)} material={brassAmmo} />
                  <mesh position={[-0.02, -0.02, -0.19]} geometry={rbox(0.26, 0.18, 0.14, 0.012)} material={componentCarcMat} castShadow />
                </group>
              </group>
            </group>

            {/* 5D. Cửa nạp đạn bên trái (-Z) kèm trung liên 7.62mm M240 & khiên súng */}
            <group position={[-0.24, 1.09, -0.62]}>
              <mesh position={[0, 0.03, 0]} material={componentCarcMat} castShadow>
                <cylinderGeometry args={[0.34, 0.36, 0.06, 24]} />
              </mesh>
              <mesh position={[-0.02, 0.065, 0]} material={componentCarcMat} castShadow>
                <cylinderGeometry args={[0.30, 0.30, 0.03, 24]} />
              </mesh>
              <mesh position={[0.24, 0.09, 0.04]} geometry={rbox(0.09, 0.07, 0.11, 0.008)} material={componentCarcMat} />
              <mesh position={[0.284, 0.09, 0.04]} geometry={rbox(0.012, 0.04, 0.085, 0.002)} material={opticGlass} />

              <group position={[0.26, 0.06, -0.18]} rotation={[0, 0.08, 0]}>
                <mesh position={[0, 0.08, 0]} material={darkMetal}>
                  <cylinderGeometry args={[0.03, 0.04, 0.16, 12]} />
                </mesh>
                <mesh position={[0.06, 0.18, 0]} geometry={rbox(0.44, 0.075, 0.06, 0.008)} material={gunSteel} castShadow />
                <mesh position={[-0.22, 0.16, 0]} geometry={rbox(0.18, 0.08, 0.04, 0.01)} material={rubberMat} />
                <mesh position={[0.48, 0.19, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel} castShadow>
                  <cylinderGeometry args={[0.012, 0.015, 0.44, 10]} />
                </mesh>
                <mesh position={[0.42, 0.165, 0]} rotation={[0, 0, Math.PI / 2]} material={gunSteel}>
                  <cylinderGeometry args={[0.01, 0.01, 0.30, 8]} />
                </mesh>
                <mesh position={[0.08, 0.14, -0.09]} geometry={rbox(0.14, 0.13, 0.09, 0.01)} material={canvasStowMat} />
                {([-1, 1] as const).map((s) => (
                  <mesh
                    key={s}
                    position={[0.20, 0.21, s * 0.11]}
                    rotation={[0, -s * 0.24, 0]}
                    geometry={rbox(0.02, 0.19, 0.15, 0.004)}
                    material={componentCarcMat}
                  />
                ))}
              </group>
            </group>

            {/* 5E. Đuôi nóc bustle: 2 tấm xả nổ (Blowout Panels) có rãnh chia rõ & mở bản lề khi blowoutOpen > 0 */}
            <group position={[-1.92, 1.086, 0]}>
              <mesh position={[0, -0.004, 0]} geometry={rbox(1.40, 0.024, 2.10, 0.006)} material={grilleDark} />

              {clampedBlowout > 0.005 && (
                <group position={[0, -0.04, 0]}>
                  <mesh geometry={rbox(1.30, 0.08, 1.94, 0.01)} material={blowoutGlowMat} />
                  {([-1, 1] as const).map((s) => (
                    <mesh
                      key={s}
                      position={[0, 0.03, s * 0.50]}
                      geometry={rbox(1.14, 0.05, 0.80, 0.01)}
                      material={blowoutCoreHot}
                    />
                  ))}
                  <mesh position={[0, 0.035, 0]} geometry={rbox(1.32, 0.07, 0.06, 0.005)} material={darkMetal} />
                </group>
              )}

              <group position={[0, 0.012, 1.02]} rotation={[clampedBlowout * 1.32, 0, 0]}>
                <mesh
                  position={[0, 0, -0.49]}
                  geometry={rbox(1.32, 0.032, 0.96, 0.01)}
                  material={componentCarcMat}
                  castShadow
                  receiveShadow
                />
                {[-0.42, 0.42].map((hx, hi) => (
                  <mesh
                    key={hi}
                    position={[hx, 0.015, -0.02]}
                    geometry={rbox(0.14, 0.024, 0.07, 0.006)}
                    material={darkMetal}
                  />
                ))}
              </group>

              <group position={[0, 0.012, -1.02]} rotation={[-clampedBlowout * 1.32, 0, 0]}>
                <mesh
                  position={[0, 0, 0.49]}
                  geometry={rbox(1.32, 0.032, 0.96, 0.01)}
                  material={componentCarcMat}
                  castShadow
                  receiveShadow
                />
                {[-0.42, 0.42].map((hx, hi) => (
                  <mesh
                    key={hi}
                    position={[hx, 0.015, 0.02]}
                    geometry={rbox(0.14, 0.024, 0.07, 0.006)}
                    material={darkMetal}
                  />
                ))}
              </group>
            </group>

            {/* Cột cảm biến gió ngang (Crosswind Sensor) chính giữa đuôi nóc tháp */}
            <group position={[-2.66, 1.08, 0]}>
              <mesh position={[0, 0.16, 0]} material={darkMetal}>
                <cylinderGeometry args={[0.018, 0.024, 0.32, 10]} />
              </mesh>
              <mesh position={[0, 0.33, 0]} geometry={rbox(0.06, 0.05, 0.18, 0.01)} material={darkMetal} />
            </group>

            {/* 5F. Cụm ống phóng đạn khói 6 nòng M250 + Khung giỏ lan can ống thép rỗng & Tấm CIP */}
            <mesh geometry={sideRailRTopGeo} material={darkMetal} castShadow />
            <mesh geometry={sideRailRBotGeo} material={darkMetal} castShadow />
            <mesh geometry={sideRailLTopGeo} material={darkMetal} castShadow />
            <mesh geometry={sideRailLBotGeo} material={darkMetal} castShadow />

            {([-1, 1] as const).map((side) => {
              const zRail = side === 1 ? 1.66 : -1.60;
              const zBustle = side === 1 ? 1.33 : -1.31;
              return (
                <group key={side}>
                  <group position={[0.76, 0.60, side === 1 ? 1.54 : -1.49]}>
                    <mesh geometry={rbox(0.22, 0.15, 0.09, 0.012)} material={darkMetal} castShadow />
                    {SMOKE_ANGLES.map((sa, si) => (
                      <group
                        key={si}
                        position={[0.06 + sa.dz * 0.4, sa.dy, side * 0.045]}
                        rotation={[0, -side * sa.y, sa.p]}
                      >
                        <mesh position={[0.11, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={componentCarcMat} castShadow>
                          <cylinderGeometry args={[0.036, 0.038, 0.22, 12]} />
                        </mesh>
                        <mesh position={[0.222, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={rubberMat}>
                          <cylinderGeometry args={[0.038, 0.038, 0.018, 12]} />
                        </mesh>
                      </group>
                    ))}
                  </group>

                  {[0.22, -0.45, -1.10].map((px, pi) => (
                    <mesh
                      key={pi}
                      position={[px, 0.67, zRail - side * (pi * 0.03)]}
                      geometry={rbox(0.028, 0.47, 0.028, 0.005)}
                      material={darkMetal}
                    />
                  ))}
                  <group position={[-0.32, 0.67, zRail]} rotation={[0, -side * 0.055, 0]}>
                    <mesh geometry={rbox(0.68, 0.42, 0.026, 0.006)} material={componentCarcMat} castShadow />
                    {Array.from({ length: 7 }, (_, li) => (
                      <mesh
                        key={li}
                        position={[-0.27 + li * 0.09, 0, side * 0.014]}
                        geometry={rbox(0.024, 0.36, 0.012, 0.002)}
                        material={componentCarcMat}
                      />
                    ))}
                  </group>
                  <mesh
                    position={[-0.88, 0.65, zRail - side * 0.08]}
                    geometry={rbox(0.28, 0.40, 0.15, 0.016)}
                    material={canvasStowMat}
                    castShadow
                  />

                  <mesh
                    position={[-2.02, 0.68, zBustle]}
                    geometry={rbox(1.06, 0.44, 0.11, 0.015)}
                    material={componentCarcMat}
                    castShadow
                  />
                </group>
              );
            })}

            {/* 5G. Giỏ đồ đuôi (Rear Bustle Rack) & 2 cần ăng-ten mảnh bằng pipe */}
            <group>
              <mesh geometry={rackTopGeo} material={darkMetal} castShadow />
              <mesh geometry={rackBotGeo} material={darkMetal} castShadow />
              {[-1.08, -0.36, 0.36, 1.08].map((rz, ri) => (
                <mesh
                  key={ri}
                  position={[-3.34, 0.70, rz]}
                  geometry={rbox(0.03, 0.50, 0.03, 0.005)}
                  material={darkMetal}
                />
              ))}
              <mesh position={[-3.06, 0.63, 0.52]} geometry={rbox(0.36, 0.28, 0.74, 0.03)} material={canvasStowMat} castShadow />
              <mesh
                position={[-3.08, 0.61, -0.54]}
                rotation={[Math.PI / 2, 0, 0]}
                material={canvasStowMat}
                castShadow
              >
                <cylinderGeometry args={[0.14, 0.14, 0.74, 16]} />
              </mesh>

              <mesh position={[-2.65, 1.05, 1.16]} material={rubberMat}>
                <cylinderGeometry args={[0.03, 0.04, 0.09, 10]} />
              </mesh>
              <mesh position={[-2.65, 1.05, -1.14]} material={rubberMat}>
                <cylinderGeometry args={[0.03, 0.04, 0.09, 10]} />
              </mesh>
              <mesh geometry={antennaRGeo} material={gunSteel} />
              <mesh geometry={antennaLGeo} material={gunSteel} />
            </group>

            {/* 5H. Biến thể SEPv3: 4 tấm radar phẳng Trophy APS ở 4 góc sườn + 2 bệ phóng đánh chặn xoay */}
            {isSepV3 && (
              <group>
                {[
                  { pos: [0.46, 0.68, 1.72] as V3, yaw: -0.68 },
                  { pos: [0.46, 0.68, -1.66] as V3, yaw: 0.68 },
                  { pos: [-1.62, 0.70, 1.48] as V3, yaw: -2.38 },
                  { pos: [-1.62, 0.70, -1.46] as V3, yaw: 2.38 },
                ].map((rad, ri) => (
                  <group key={ri} position={rad.pos} rotation={[0, rad.yaw, 0]}>
                    <mesh position={[-0.08, -0.04, 0]} geometry={rbox(0.18, 0.12, 0.18, 0.012)} material={darkMetal} />
                    <mesh
                      rotation={[0, 0, -0.14]}
                      geometry={rbox(0.08, 0.36, 0.48, 0.018)}
                      material={componentCarcMat}
                      castShadow
                    />
                    <mesh
                      position={[0.038, 0.005, 0]}
                      rotation={[0, 0, -0.14]}
                      geometry={rbox(0.02, 0.30, 0.42, 0.01)}
                      material={radomeMat}
                    />
                  </group>
                ))}

                {([-1, 1] as const).map((side) => (
                  <group key={side} position={[-0.42, 0.76, side === 1 ? 1.78 : -1.72]}>
                    <mesh position={[0, -0.08, -side * 0.08]} geometry={rbox(0.76, 0.10, 0.22, 0.015)} material={darkMetal} />
                    <group position={[0.14, 0.06, 0]}>
                      <mesh material={darkMetal} castShadow>
                        <cylinderGeometry args={[0.11, 0.13, 0.14, 16]} />
                      </mesh>
                      <mesh
                        position={[0, 0.12, side * 0.03]}
                        rotation={[side * 0.22, 0, 0]}
                        geometry={rbox(0.24, 0.18, 0.14, 0.02)}
                        material={componentCarcMat}
                        castShadow
                      />
                      <mesh
                        position={[0, 0.12, side * 0.105]}
                        rotation={[Math.PI / 2 + side * 0.22, 0, 0]}
                        material={gunSteel}
                      >
                        <cylinderGeometry args={[0.085, 0.085, 0.03, 16]} />
                      </mesh>
                    </group>
                    <mesh
                      position={[-0.24, 0.06, -side * 0.03]}
                      geometry={rbox(0.36, 0.26, 0.20, 0.018)}
                      material={componentCarcMat}
                      castShadow
                    />
                  </group>
                ))}
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};

export default M1A2Abrams;

export const preview = turntable(M1A2Abrams, { size: 10.2, center: [0.3, 1.35, 0] });
