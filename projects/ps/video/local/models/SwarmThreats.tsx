// Bộ đôi khí tài tập kích tầm thấp bão hòa lưới phòng không:
// 1. Shahed136 (UAV cảm tử cánh tam giác gãy khúc Geran-2 / Shahed-136: dài 3.50 m, sải cánh 2.50 m, chân vịt đẩy đuôi).
// 2. Kh101 (Tên lửa hành trình tàng hình tầm xa Kh-101: dài 7.45 m, rộng thân vát 0.74 m, sải cánh cụp 4.18 m, động cơ TRDD-50A dưới đuôi).
import React from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL2D, PAL3D } from '../palette';

export type Shahed136Props = {
  /** Góc quay chân vịt đẩy 2 lá phía đuôi (rad). */
  propSpin?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export type Kh101Props = {
  /** Độ sáng luồng phụt động cơ turbofan TRDD-50A dưới bụng đuôi (0..1, mặc định 0.5). */
  plume?: number;
  /** Độ mở đôi cánh cụp dưới bụng (0 = gập gọn dọc bụng, 1 = bung hết sải 4.18 m; mặc định 1). */
  wingDeploy?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

// ============================================================================
// PHẦN 1: SHAHED-136 (GERAN-2) — DÀI 3.50 M (-1.75..+1.75), SẢI CÁNH 2.50 M
// ============================================================================

// Thân tròn thuôn đầu đạn mũi bầu (26 điểm mượt, x: -1.46 .. +1.75)
const SHAHED_BODY_PROFILE: P2[] = (() => {
  const pts: P2[] = [
    [0.08, -1.46],
    [0.125, -1.36],
    [0.158, -1.15],
    [0.18, -0.8],
    [0.192, -0.35],
    [0.196, 0.15],
    [0.194, 0.58],
  ];
  for (let i = 1; i <= 18; i++) {
    const u = i / 18;
    const x = 0.58 + u * (1.75 - 0.58);
    const r = 0.194 * Math.pow(Math.max(0, 1 - Math.pow(u, 1.85)), 0.56);
    pts.push([Math.max(0.003, r), x]);
  }
  return pts;
})();
const GEO_SHAHED_FUSELAGE = lathe(SHAHED_BODY_PROFILE, 36);

// Bầu chuyển tiếp elip mượt hoà liền gốc thân tròn xuống mặt cánh delta (không tạo bậc phẳng cứng)
const GEO_SHAHED_BLEND = (() => {
  const stations: [number, number, number][] = [
    [-1.34, 0.06, 0.24],
    [-1.05, 0.085, 0.44],
    [-0.55, 0.095, 0.48],
    [0.0, 0.09, 0.4],
    [0.55, 0.075, 0.28],
    [1.08, 0.04, 0.15],
  ];
  const seg = 28;
  const rows = stations.length;
  const cols = seg + 1;
  const pos = new Float32Array(rows * cols * 3);
  const uvs = new Float32Array(rows * cols * 2);
  const idx: number[] = [];
  for (let i = 0; i < rows; i++) {
    const [x, ry, rz] = stations[i];
    for (let j = 0; j < cols; j++) {
      const th = (j / seg) * Math.PI * 2;
      const k = i * cols + j;
      pos[k * 3] = x;
      pos[k * 3 + 1] = -0.015 + Math.cos(th) * ry;
      pos[k * 3 + 2] = Math.sin(th) * rz;
      uvs[k * 2] = x * 0.45;
      uvs[k * 2 + 1] = (j / seg) * 1.2;
    }
  }
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < seg; j++) {
      const a = i * cols + j;
      const b = a + 1;
      const c = (i + 1) * cols + j;
      const d = c + 1;
      idx.push(a, b, c, b, d, c);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
})();

// Đôi cánh tam giác gãy khúc (Cranked-Delta Wing) liền khối bằng extrudeTop
const SHAHED_WING_PTS: P2[] = [
  [1.2, 0.13],
  [0.2, 0.44], // điểm gãy khúc cranked-delta phải
  [-0.96, 1.23], // đầu mút cánh trước phải
  [-1.4, 1.23], // đầu mút cánh sau phải
  [-1.35, 0.32],
  [-1.24, 0.18], // hốc khoét đuôi né chân vịt đẩy
  [-1.24, -0.18],
  [-1.35, -0.32],
  [-1.4, -1.23],
  [-0.96, -1.23],
  [0.2, -0.44], // điểm gãy khúc cranked-delta trái
  [1.2, -0.13],
];
const GEO_SHAHED_WING = extrudeTop(SHAHED_WING_PTS, 0.064, 0.02);

// Bản lái elevon tách khe dọc mép sau cánh
const GEO_SHAHED_ELEVON = rbox(0.14, 0.036, 0.42, 0.008);

// 2 cánh đứng nhỏ gắn ở hai đầu mút cánh (Wingtip Vertical Stabilizers — nhô cả trên lẫn dưới cánh)
const GEO_SHAHED_TIP_FIN = extrude(
  [
    [-1.47, -0.17],
    [-1.06, -0.17],
    [-0.84, 0.0],
    [-1.16, 0.35],
    [-1.49, 0.35],
    [-1.44, 0.02],
  ],
  0.032,
  0.006
);

// Chóp nón chụp chân vịt đẩy phía đuôi (x: -1.75 .. -1.61)
const GEO_SHAHED_SPINNER = lathe(
  [
    [0.005, -1.75],
    [0.038, -1.7],
    [0.068, -1.61],
  ],
  20
);

// Lá cánh chân vịt đẩy gỗ/composite xoắn khí động
const GEO_PROP_BLADE = extrude(
  [
    [-0.014, 0.02],
    [0.016, 0.02],
    [0.028, 0.16],
    [0.022, 0.31],
    [0.01, 0.39],
    [-0.01, 0.39],
    [-0.022, 0.24],
  ],
  0.014,
  0.003
);

const MAT_SHAHED_BODY = paint({
  color: '#c4cad2',
  wear: 0.06,
  dirt: 0.06,
  roughness: 0.66,
  metalness: 0.08,
  repeat: 0.42,
  seed: 61,
});

const MAT_SHAHED_WING = paint({
  color: '#aeb6c0',
  wear: 0.08,
  dirt: 0.08,
  roughness: 0.7,
  metalness: 0.1,
  repeat: 0.4,
  seed: 63,
});

const MAT_SHAHED_TIP = paint({
  color: '#7a838e',
  wear: 0.14,
  dirt: 0.12,
  roughness: 0.68,
  metalness: 0.16,
  repeat: 0.5,
  seed: 67,
});

const MAT_ENGINE_METAL = plain('#4a515a', 0.45, 0.65);
const MAT_PROP_DARK = plain('#23272c', 0.52, 0.2);
const MAT_PROP_TIP = plain(PAL2D.amberHot, 0.48, 0.1);

export const Shahed136: React.FC<Shahed136Props> = ({
  propSpin = 0.45,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: Shahed136Props = {}) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Thân bầu tròn thuôn dài + đai khớp mô-đun đầu đạn */}
      <mesh geometry={GEO_SHAHED_FUSELAGE} material={MAT_SHAHED_BODY} castShadow receiveShadow />
      <mesh position={[0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#7d8691', 0.55, 0.3)}>
        <cylinderGeometry args={[0.197, 0.197, 0.03, 32]} />
      </mesh>
      {/* Nắp khoang bảo dưỡng điện tử trên lưng thân */}
      <mesh position={[-0.22, 0.192, 0]} material={MAT_SHAHED_WING}>
        <boxGeometry args={[0.42, 0.014, 0.14]} />
      </mesh>

      {/* Bầu chuyển tiếp elip mượt & Đôi cánh tam giác gãy khúc Cranked-Delta */}
      <mesh geometry={GEO_SHAHED_BLEND} material={MAT_SHAHED_BODY} castShadow receiveShadow />
      <mesh geometry={GEO_SHAHED_WING} material={MAT_SHAHED_WING} position={[0, -0.052, 0]} castShadow receiveShadow />

      {/* 4 bản lái elevon ở mép sau cánh */}
      {([-1, 1] as const).map((side) => (
        <group key={`elev-${side}`}>
          <mesh
            geometry={GEO_SHAHED_ELEVON}
            material={MAT_SHAHED_BODY}
            position={[-1.39, -0.02, side * 0.54]}
            castShadow
          />
          <mesh
            geometry={GEO_SHAHED_ELEVON}
            material={MAT_SHAHED_BODY}
            position={[-1.41, -0.02, side * 0.99]}
            castShadow
          />
        </group>
      ))}

      {/* 2 cánh đứng nhỏ gắn ở hai đầu mút cánh (Wingtip Vertical Stabilizers) */}
      {([-1, 1] as const).map((side) => (
        <group key={`tip-${side}`} position={[0, -0.02, side * 1.234]}>
          <mesh geometry={GEO_SHAHED_TIP_FIN} material={MAT_SHAHED_TIP} castShadow receiveShadow />
          <mesh position={[-1.18, -0.01, -side * 0.018]} material={plain('#6e7782', 0.6, 0.28)}>
            <boxGeometry args={[0.56, 0.052, 0.034]} />
          </mesh>
        </group>
      ))}

      {/* Ống pitot nhỏ gắn ở mép trước cánh phải */}
      <mesh position={[-0.28, -0.02, 0.85]} rotation={[0, 0, Math.PI / 2]} material={MAT_ENGINE_METAL}>
        <cylinderGeometry args={[0.005, 0.008, 0.22, 8]} />
      </mesh>

      {/* Cụm 4 ăng-ten vệ tinh chống nhiễu CRPA trên lưng trước */}
      {[
        [0.42, 0.196, 0.055],
        [0.42, 0.196, -0.055],
        [0.3, 0.198, 0.055],
        [0.3, 0.198, -0.055],
      ].map(([ax, ay, az], idx) => (
        <mesh key={idx} position={[ax, ay, az]} material={plain('#dde2e8', 0.5, 0.15)}>
          <cylinderGeometry args={[0.025, 0.029, 0.018, 12]} />
        </mesh>
      ))}

      {/* Ngàm móc phóng RATO dưới bụng sau */}
      <mesh position={[-0.78, -0.2, 0]} rotation={[0, 0, 0.18]} material={MAT_ENGINE_METAL} castShadow>
        <boxGeometry args={[0.34, 0.09, 0.08]} />
      </mesh>

      {/* Cụm lốc máy piston 4 xi-lanh đối xứng MD-550 phía đuôi */}
      <group position={[-1.51, 0, 0]}>
        <mesh material={MAT_ENGINE_METAL} castShadow>
          <boxGeometry args={[0.22, 0.17, 0.18]} />
        </mesh>
        {([-1, 1] as const).map((side) =>
          [-0.05, 0.05].map((dx, k) => (
            <group key={`${side}-${k}`} position={[dx, 0.01, side * 0.14]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} material={plain('#8a939e', 0.4, 0.68)} castShadow>
                <cylinderGeometry args={[0.046, 0.042, 0.11, 12]} />
              </mesh>
              {[0.02, 0.045, 0.07].map((dz, fi) => (
                <mesh
                  key={fi}
                  position={[0, 0, side * (dz - 0.045)]}
                  rotation={[Math.PI / 2, 0, 0]}
                  material={MAT_ENGINE_METAL}
                >
                  <cylinderGeometry args={[0.058, 0.058, 0.008, 12]} />
                </mesh>
              ))}
            </group>
          ))
        )}
        {([-1, 1] as const).map((side) => (
          <mesh
            key={`ex-${side}`}
            geometry={pipe(
              [
                [0.0, -0.05, side * 0.12],
                [-0.06, -0.14, side * 0.15],
                [-0.14, -0.17, side * 0.14],
              ],
              0.018,
              12
            )}
            material={plain('#2e2824', 0.65, 0.55)}
          />
        ))}
      </group>

      {/* Chân vịt đẩy 2 lá ở đuôi quay theo propSpin */}
      <group position={[0, 0, 0]} rotation={[propSpin, 0, 0]}>
        <mesh geometry={GEO_SHAHED_SPINNER} material={MAT_PROP_DARK} castShadow />
        <mesh
          geometry={GEO_PROP_BLADE}
          material={MAT_PROP_DARK}
          position={[-1.63, 0, 0]}
          rotation={[0, 0.34, 0]}
          castShadow
        />
        <mesh position={[-1.63, 0.37, 0]} rotation={[0, 0.34, 0]} material={MAT_PROP_TIP}>
          <boxGeometry args={[0.024, 0.036, 0.018]} />
        </mesh>
        <mesh
          geometry={GEO_PROP_BLADE}
          material={MAT_PROP_DARK}
          position={[-1.63, 0, 0]}
          rotation={[Math.PI, -0.34, 0]}
          castShadow
        />
        <mesh position={[-1.63, -0.37, 0]} rotation={[0, 0.34, 0]} material={MAT_PROP_TIP}>
          <boxGeometry args={[0.024, 0.036, 0.018]} />
        </mesh>
      </group>
    </group>
  );
};

// ============================================================================
// PHẦN 2: KH-101 — DÀI 7.45 M (-3.72..+3.73), RỘNG THÂN VÁT 0.74 M, CÁNH 4.18 M
// ============================================================================

type KhStation = {
  x: number;
  yTop: number;
  zTop: number;
  yChine: number;
  zChine: number;
  yLow: number;
  zLow: number;
  yBot: number;
  zBot: number;
};

/**
 * Crease-Group Ribbon Lofting:
 * Mỗi mặt dọc j = 0..7 là một dải lưới mượt dọc trục X (indexed dọc X để đường cong mũi mượt như lụa),
 * nhưng tách độc lập đỉnh với dải lân cận để giữ toàn bộ 8 cạnh gờ chine tàng hình sắc như dao cạo!
 */
const buildChinedStealthParts = (stations: KhStation[]) => {
  const ringOf = (s: KhStation): [number, number][] => [
    [s.yTop, -s.zTop], // 0: mép trái lưng phẳng
    [s.yTop, s.zTop], // 1: mép phải lưng phẳng
    [s.yChine, s.zChine], // 2: gờ chine sắc bên phải (+0.37 m)
    [s.yLow, s.zLow], // 3: vách dưới phải
    [s.yBot, s.zBot], // 4: mép phải bụng phẳng
    [s.yBot, -s.zBot], // 5: mép trái bụng phẳng
    [s.yLow, -s.zLow], // 6: vách dưới trái
    [s.yChine, -s.zChine], // 7: gờ chine sắc bên trái (-0.37 m)
  ];

  const buildPanelGroup = (panelIndices: number[], includeTailCap: boolean) => {
    const pos: number[] = [];
    const uv: number[] = [];
    const idx: number[] = [];
    const nRows = stations.length;

    for (const j of panelIndices) {
      const jn = (j + 1) % 8;
      const base = pos.length / 3;
      for (let i = 0; i < nRows; i++) {
        const st = stations[i];
        const r = ringOf(st);
        const u = st.x * 0.4;
        pos.push(st.x, r[j][0], r[j][1]);
        uv.push(u, j * 0.22);
        pos.push(st.x, r[jn][0], r[jn][1]);
        uv.push(u, (j + 1) * 0.22);
      }
      for (let i = 0; i < nRows - 1; i++) {
        const a = base + i * 2;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        idx.push(a, b, c, b, d, c);
      }
    }

    if (includeTailCap) {
      const rTail = ringOf(stations[0]);
      const xTail = stations[0].x;
      const cIdx = pos.length / 3;
      pos.push(xTail, (stations[0].yTop + stations[0].yBot) * 0.5, 0);
      uv.push(0, 0);
      for (let j = 0; j < 8; j++) {
        const jn = (j + 1) % 8;
        const pIdx = pos.length / 3;
        pos.push(xTail, rTail[j][0], rTail[j][1]);
        uv.push(0.1, 0);
        pos.push(xTail, rTail[jn][0], rTail[jn][1]);
        uv.push(0, 0.1);
        idx.push(cIdx, pIdx + 1, pIdx);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  };

  return {
    // Lưng phẳng (0) + má sườn vát phải (1) + má sườn vát trái (7) nằm trên gờ chine
    upper: buildPanelGroup([0, 1, 7], false),
    // Toàn bộ các mặt bụng vát dưới gờ chine + nắp đuôi
    lower: buildPanelGroup([2, 3, 4, 5, 6], true),
  };
};

// Trạm thiết kế dọc thân Kh-101 từ đuôi x = -3.72 tới chóp mũi vát x = +3.73 (dài đúng 7.45 m, rộng 0.74 m)
const KH101_STATIONS: KhStation[] = (() => {
  const list: KhStation[] = [
    { x: -3.72, yTop: 0.12, zTop: 0.08, yChine: -0.01, zChine: 0.16, yLow: -0.09, zLow: 0.13, yBot: -0.13, zBot: 0.1 },
    { x: -3.35, yTop: 0.19, zTop: 0.12, yChine: -0.02, zChine: 0.25, yLow: -0.15, zLow: 0.21, yBot: -0.2, zBot: 0.16 },
    { x: -2.85, yTop: 0.25, zTop: 0.16, yChine: -0.025, zChine: 0.33, yLow: -0.21, zLow: 0.28, yBot: -0.25, zBot: 0.22 },
    { x: -2.2, yTop: 0.28, zTop: 0.185, yChine: -0.03, zChine: 0.37, yLow: -0.22, zLow: 0.32, yBot: -0.27, zBot: 0.25 },
    { x: 0.0, yTop: 0.285, zTop: 0.185, yChine: -0.03, zChine: 0.37, yLow: -0.22, zLow: 0.32, yBot: -0.27, zBot: 0.25 },
    { x: 1.75, yTop: 0.28, zTop: 0.18, yChine: -0.03, zChine: 0.37, yLow: -0.22, zLow: 0.315, yBot: -0.265, zBot: 0.245 },
  ];

  // Mũi vát dẹt hình mỏ cá mập đặc trưng Kh-101 (x: +1.75 .. +3.73, 22 trạm mượt)
  for (let i = 1; i <= 22; i++) {
    const u = i / 22;
    const x = 1.75 + u * (3.73 - 1.75);
    const wScale = Math.pow(Math.max(0.004, 1 - Math.pow(u, 1.55)), 0.68);
    const hScale = Math.pow(Math.max(0.004, 1 - Math.pow(u, 1.35)), 0.82);
    const ycDrop = -0.03 - 0.045 * u;
    list.push({
      x,
      yTop: ycDrop + 0.31 * hScale,
      zTop: 0.18 * wScale,
      yChine: ycDrop,
      zChine: 0.37 * wScale,
      yLow: ycDrop - 0.19 * hScale,
      zLow: 0.315 * wScale,
      yBot: ycDrop - 0.235 * hScale,
      zBot: 0.245 * wScale,
    });
  }
  return list;
})();

const { upper: GEO_KH101_UPPER, lower: GEO_KH101_LOWER } = buildChinedStealthParts(KH101_STATIONS);

// Đôi cánh cụp mỏng tỷ lệ khung lớn đặt dưới bụng (tổng sải khi bung = 4.18 m -> z = ±2.09 m)
const KH_WING_RIGHT_PTS: P2[] = [
  [0.28, 0.0],
  [-0.78, 1.93],
  [-1.08, 1.93],
  [-0.28, 0.0],
];
const GEO_KH_WING_RIGHT = extrudeTop(KH_WING_RIGHT_PTS, 0.054, 0.012);

const KH_WING_LEFT_PTS: P2[] = KH_WING_RIGHT_PTS.map(([x, z]): P2 => [x, -z]).reverse();
const GEO_KH_WING_LEFT = extrudeTop(KH_WING_LEFT_PTS, 0.054, 0.012);

// Cánh lái đuôi vát góc tàng hình
const GEO_KH_TAIL_FIN_TOP = extrude(
  [
    [-3.64, 0.16],
    [-3.05, 0.22],
    [-3.36, 0.8],
    [-3.68, 0.8],
  ],
  0.046,
  0.008
);

const GEO_KH_TAIL_FIN_SIDE = extrudeTop(
  [
    [-3.06, 0.18],
    [-3.4, 0.9],
    [-3.68, 0.9],
    [-3.62, 0.16],
  ],
  0.044,
  0.008
);

const GEO_KH_TAIL_FIN_SIDE_L = extrudeTop(
  [
    [-3.06, -0.18],
    [-3.4, -0.9],
    [-3.68, -0.9],
    [-3.62, -0.16],
  ].reverse() as P2[],
  0.044,
  0.008
);

// Cụm động cơ phản lực cánh quạt TRDD-50A treo hạ dưới bụng đuôi
const GEO_TRDD50_POD = lathe(
  [
    [0.125, -3.18],
    [0.155, -2.96],
    [0.168, -2.62],
    [0.165, -2.32],
    [0.145, -2.18],
  ],
  28
);

const GEO_TRDD50_PYLON = extrude(
  [
    [-2.98, -0.37],
    [-2.32, -0.37],
    [-2.18, -0.18],
    [-2.88, -0.18],
  ],
  0.09,
  0.015
);

const GEO_KH_PLUME = lathe(
  [
    [0.01, -1.1],
    [0.075, -0.55],
    [0.115, -0.12],
    [0.105, 0.0],
  ],
  18
);

// Vật liệu sáng rõ tông xám bạc mờ tàng hình Nga để bắt sáng nổi rõ 3 mặt vát & gờ chine
const MAT_KH_UPPER = paint({
  color: '#95a0ab',
  wear: 0.07,
  dirt: 0.05,
  roughness: 0.45,
  metalness: 0.16,
  repeat: 0.42,
  seed: 71,
});

const MAT_KH_BELLY = paint({
  color: PAL3D.kh101Belly,
  wear: 0.1,
  dirt: 0.08,
  roughness: 0.52,
  metalness: 0.18,
  repeat: 0.42,
  seed: 73,
});

const MAT_KH_WING = paint({
  color: '#88929e',
  wear: 0.14,
  dirt: 0.07,
  roughness: 0.48,
  metalness: 0.2,
  repeat: 0.45,
  seed: 77,
});

export const Kh101: React.FC<Kh101Props> = ({
  plume = 0.5,
  wingDeploy = 1,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: Kh101Props = {}) => {
  const wd = Math.max(0, Math.min(1, wingDeploy));
  const pl = Math.max(0, Math.min(1, plume));
  const foldAngle = (1 - wd) * 1.24;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* 1. Thân tàng hình vát cạnh chữ nhật dẹt có gờ chine sắc lẹm dọc hai bên sườn */}
      <mesh geometry={GEO_KH101_UPPER} material={MAT_KH_UPPER} castShadow receiveShadow />
      <mesh geometry={GEO_KH101_LOWER} material={MAT_KH_BELLY} castShadow receiveShadow />

      {/* Cửa sổ cảm biến quang-điện tử khớp địa hình Otblesk-U dưới mũi */}
      <mesh position={[2.25, -0.235, 0]} material={plain(PAL3D.darkSteel, 0.4, 0.65)}>
        <boxGeometry args={[0.36, 0.04, 0.22]} />
      </mesh>
      <mesh position={[2.26, -0.252, 0]} material={plain(PAL3D.glass, 0.12, 0.28)}>
        <boxGeometry args={[0.24, 0.015, 0.14]} />
      </mesh>

      {/* Vạch khoang kỹ thuật đỏ mảnh & các móc treo ổ quay máy bay Tu-95MS trên lưng phẳng */}
      <mesh position={[1.48, 0.283, 0]} material={plain(PAL2D.red, 0.5, 0.12)}>
        <boxGeometry args={[0.075, 0.01, 0.35]} />
      </mesh>
      {[-0.65, 0.45].map((lx, idx) => (
        <mesh key={idx} position={[lx, 0.295, 0]} material={plain(PAL3D.darkSteel, 0.38, 0.68)} castShadow>
          <boxGeometry args={[0.14, 0.032, 0.08]} />
        </mesh>
      ))}

      {/* 2. Đôi cánh cụp mỏng đặt dưới bụng mở theo wingDeploy */}
      <group position={[0.62, -0.295, 0.16]} rotation={[0, -foldAngle, -0.02]}>
        <mesh geometry={GEO_KH_WING_RIGHT} material={MAT_KH_WING} castShadow receiveShadow />
      </group>
      <group position={[0.62, -0.295, -0.16]} rotation={[0, foldAngle, 0.02]}>
        <mesh geometry={GEO_KH_WING_LEFT} material={MAT_KH_WING} castShadow receiveShadow />
      </group>
      {/* Cơ cấu khớp bản lề dưới bụng che gốc cánh */}
      <mesh position={[0.58, -0.265, 0]} material={MAT_KH_BELLY} castShadow>
        <boxGeometry args={[0.74, 0.048, 0.44]} />
      </mesh>

      {/* 3. Cánh lái đuôi vát tàng hình (1 cánh đứng lưng + 2 cánh ngang chúc nhẹ + vây gờ dưới) */}
      <mesh geometry={GEO_KH_TAIL_FIN_TOP} material={MAT_KH_UPPER} castShadow receiveShadow />
      <mesh
        geometry={GEO_KH_TAIL_FIN_SIDE}
        material={MAT_KH_WING}
        position={[0, -0.03, 0]}
        rotation={[-0.18, 0, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={GEO_KH_TAIL_FIN_SIDE_L}
        material={MAT_KH_WING}
        position={[0, -0.03, 0]}
        rotation={[0.18, 0, 0]}
        castShadow
        receiveShadow
      />
      <mesh position={[-3.48, -0.23, 0]} rotation={[0, 0, 0.28]} material={MAT_KH_BELLY} castShadow>
        <boxGeometry args={[0.34, 0.16, 0.03]} />
      </mesh>

      {/* 4. Cụm động cơ phản lực cánh quạt TRDD-50A hạ dưới bụng đuôi */}
      <group>
        <mesh position={[-2.62, -0.23, 0]} material={plain('#15191f', 0.92, 0.1)}>
          <boxGeometry args={[0.96, 0.05, 0.28]} />
        </mesh>
        <mesh geometry={GEO_TRDD50_PYLON} material={MAT_KH_BELLY} castShadow />
        <mesh geometry={GEO_TRDD50_POD} material={MAT_KH_UPPER} position={[0, -0.5, 0]} castShadow receiveShadow />

        {/* Vành miệng hút khí hợp kim & chóp spinner quạt nén TRDD-50A */}
        <mesh position={[-2.18, -0.5, 0]} rotation={[0, Math.PI / 2, 0]} material={plain(PAL3D.steel, 0.35, 0.72)}>
          <torusGeometry args={[0.142, 0.014, 10, 24]} />
        </mesh>
        <mesh position={[-2.19, -0.5, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#0e1217', 0.95, 0.1)}>
          <cylinderGeometry args={[0.132, 0.132, 0.03, 22]} />
        </mesh>
        <mesh position={[-2.17, -0.5, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain(PAL3D.steel, 0.35, 0.8)}>
          <coneGeometry args={[0.045, 0.09, 16]} />
        </mesh>

        {/* Ống xả kim loại đen & luồng lửa nhẹ turbofan */}
        <mesh position={[-3.18, -0.5, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.darkSteel, 0.38, 0.75)}>
          <cylinderGeometry args={[0.122, 0.115, 0.08, 22]} />
        </mesh>
        {pl > 0.01 && (
          <group position={[-3.21, -0.5, 0]} scale={[0.5 + pl * 0.65, 0.85 + pl * 0.2, 0.85 + pl * 0.2]}>
            <mesh
              geometry={GEO_KH_PLUME}
              material={plain(PAL3D.flame, 0.25, 0, {
                emissive: new THREE.Color(PAL3D.flame),
                emissiveIntensity: 1.7 * pl,
                transparent: true,
                opacity: 0.42 * pl,
                depthWrite: false,
              })}
            />
            <mesh
              geometry={GEO_KH_PLUME}
              scale={[0.62, 0.58, 0.58]}
              material={plain(PAL3D.flameCore, 0.1, 0, {
                emissive: new THREE.Color(PAL3D.flameCore),
                emissiveIntensity: 2.3 * pl,
                transparent: true,
                opacity: 0.78 * pl,
                depthWrite: false,
              })}
            />
          </group>
        )}
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  Shahed136: { C: () => <Shahed136 position={[0, 1.0, 0]} />, size: 3.8, center: [0, 1.0, 0] },
  Kh101: { C: () => <Kh101 position={[0, 1.2, 0]} />, size: 7.6, center: [0, 1.2, 0] },
};
