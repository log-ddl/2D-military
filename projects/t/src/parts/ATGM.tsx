// Vũ khí chống tăng đột kích nóc cỡ FGM-148 Javelin (tỉ lệ thật 1:1 mét, mũi hướng +X, đỉnh +Y, phải +Z).
// Hỗ trợ 3 chế độ: 'missile' (đạn bay bung 8 cánh & luồng lửa phản lực), 'launcher' (ống phóng LTA + cụm ngắm quang-nhiệt CLU),
// và 'loaded' (ống phóng nạp sẵn đạn với vòm đầu dò hồng ngoại ló nhẹ trong lòng ống trước).
import React from 'react';
import * as THREE from 'three';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { turntable } from '@skill/military/3d/turntable';

export type ATGMProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  mode?: 'missile' | 'launcher' | 'loaded'; // mặc định 'missile'
  finsOpen?: number; // 0..1 độ bung cánh nâng giữa thân & cánh lái đuôi (mặc định 1)
  thrust?: number;   // 0..1 cường độ luồng lửa động cơ ở đuôi (mặc định 0)
};

const SWITCH_RED = '#ff3b30';
const SWITCH_GOLD = '#ffb703';

// ---------------- VẬT LIỆU DÙNG CHUNG (CACHE) ----------------
const MAT_MISSILE_BODY = paint({
  color: '#48543c',
  camo: ['#3b4531', '#576449'],
  camoScale: 1.9,
  wear: 0.22,
  dirt: 0.18,
  roughness: 0.5,
  metalness: 0.28,
  repeat: 1,
  seed: 17,
});

const MAT_MISSILE_WING = paint({
  color: '#2d332a',
  camo: ['#242922', '#3a4236'],
  camoScale: 1.4,
  wear: 0.28,
  dirt: 0.14,
  roughness: 0.44,
  metalness: 0.48,
  repeat: 0.5,
  seed: 23,
});

const MAT_TUBE_COMPOSITE = paint({
  color: '#5a6a47',
  camo: ['#4b593b', '#697a54'],
  camoScale: 2.2,
  wear: 0.22,
  dirt: 0.22,
  roughness: 0.58,
  metalness: 0.18,
  repeat: 1,
  seed: 31,
});

const MAT_CLU_HOUSING = paint({
  color: '#47533c',
  camo: ['#394430', '#566449'],
  camoScale: 1.6,
  wear: 0.24,
  dirt: 0.18,
  roughness: 0.54,
  metalness: 0.24,
  repeat: 0.48,
  seed: 37,
});

const MAT_DARK_METAL = plain('#222724', 0.36, 0.74);
const MAT_GUNMETAL = plain('#434b50', 0.3, 0.82);
const MAT_RUBBER = plain('#1e2120', 0.88, 0.06);
const MAT_RUBBER_SOFT = plain('#151718', 0.93, 0.04);
const MAT_BAND_YELLOW = plain('#efb019', 0.38, 0.16);
const MAT_BAND_COPPER = plain('#d47e35', 0.3, 0.72);
const MAT_BAND_PROPELLANT = plain('#8a522b', 0.44, 0.22);
const MAT_NOZZLE_INNER = plain('#141416', 0.86, 0.22);
const MAT_BORE_DARK = plain('#0e1110', 0.95, 0.05);

// Kính vòm đầu dò hồng ngoại IIR tối bóng ánh hổ phách & thấu kính quang-nhiệt CLU
const MAT_SEEKER_DOME = new THREE.MeshStandardMaterial({
  color: '#33200c',
  emissive: '#663a08',
  emissiveIntensity: 0.26,
  roughness: 0.06,
  metalness: 0.3,
  transparent: true,
  opacity: 0.68,
});

const MAT_SEEKER_MIRROR = plain('#eba023', 0.09, 0.9);
const MAT_SEEKER_PUPIL = plain('#09161f', 0.08, 0.4);
const MAT_LENS_AMBER = new THREE.MeshStandardMaterial({
  color: '#eb981e',
  emissive: '#784104',
  emissiveIntensity: 0.36,
  roughness: 0.07,
  metalness: 0.76,
});
const MAT_LENS_EMERALD = new THREE.MeshStandardMaterial({
  color: '#20b076',
  emissive: '#0c5437',
  emissiveIntensity: 0.38,
  roughness: 0.07,
  metalness: 0.64,
});
const MAT_EYECUP_PHOSPHOR = new THREE.MeshStandardMaterial({
  color: '#24d46a',
  emissive: '#1ab556',
  emissiveIntensity: 0.6,
  roughness: 0.2,
  metalness: 0.1,
});

// ---------------- HÌNH HỌC ĐẠN TÊN LỬA (DÀI 1.12 M, Ø 0.127 M, X: -0.56 .. +0.56) ----------------
const R_MISSILE = 0.0635;

// Vòm đầu dò hồng ngoại bán cầu mượt 28 điểm (x: +0.496 .. +0.560)
const GEO_SEEKER_DOME = (() => {
  const pts: P2[] = [];
  const N = 28;
  const x0 = 0.4965;
  const rDome = 0.0635;
  for (let i = 0; i <= N; i++) {
    const a = (i / N) * (Math.PI / 2);
    const r = Math.max(0.0002, Math.cos(a) * 0.0616);
    const x = x0 + Math.sin(a) * rDome;
    pts.push([r, x]);
  }
  return lathe(pts, 48);
})();

// Cụm gương phản xạ & cảm biến FPA bên trong vòm kính
const GEO_SEEKER_GIMBAL = lathe(
  [
    [0.0002, 0.486],
    [0.047, 0.486],
    [0.047, 0.507],
    [0.042, 0.522],
    [0.036, 0.522],
    [0.031, 0.508],
    [0.0002, 0.508],
  ],
  36,
);

const GEO_SEEKER_LENS = (() => {
  const pts: P2[] = [[0.0002, 0.510]];
  for (let i = 0; i <= 14; i++) {
    const a = ((14 - i) / 14) * 0.94;
    pts.push([Math.max(0.0002, Math.sin(a) * 0.040), 0.513 + Math.cos(a) * 0.025]);
  }
  return lathe(pts, 36);
})();

// Vành cổ kim loại giữ vòm đầu dò
const GEO_SEEKER_COLLAR = lathe(
  [
    [0.059, 0.480],
    [0.0638, 0.482],
    [0.0638, 0.495],
    [0.0617, 0.4975],
    [0.056, 0.4975],
  ],
  44,
);

// Thân chính tên lửa có rãnh khớp cơ khí giữa các khoang tandem HEAT & động cơ
const GEO_MISSILE_BODY = lathe(
  [
    [0.049, -0.556],
    [0.0545, -0.548],
    [0.0615, -0.505],
    [R_MISSILE, -0.455],
    [R_MISSILE, -0.362],
    [0.0614, -0.359],
    [0.0614, -0.354],
    [R_MISSILE, -0.351],
    [R_MISSILE, -0.176],
    [0.0614, -0.173],
    [0.0614, -0.168],
    [R_MISSILE, -0.165],
    [R_MISSILE, 0.025],
    [0.0614, 0.028],
    [0.0614, 0.033],
    [R_MISSILE, 0.036],
    [R_MISSILE, 0.258],
    [0.0614, 0.261],
    [0.0614, 0.266],
    [R_MISSILE, 0.269],
    [R_MISSILE, 0.480],
    [0.058, 0.482],
    [0.0002, 0.482],
  ],
  44,
);

// Loa phụt đuôi khoét sâu vào họng động cơ
const GEO_MISSILE_NOZZLE = lathe(
  [
    [0.049, -0.556],
    [0.046, -0.560],
    [0.0415, -0.560],
    [0.026, -0.514],
    [0.0002, -0.512],
  ],
  36,
);

// Các vòng vạch sơn chuẩn đạn chống tăng tandem HEAT (nhô nhẹ 0.7 mm để sắc cạnh tuyệt đối)
const makeBand = (x0: number, x1: number, r = R_MISSILE + 0.0007) =>
  lathe(
    [
      [r - 0.001, x0],
      [r, x0 + 0.001],
      [r, x1 - 0.001],
      [r - 0.001, x1],
    ],
    44,
  );

const GEO_BAND_PRECURSOR_Y = makeBand(0.350, 0.376);
const GEO_BAND_PRECURSOR_CU = makeBand(0.326, 0.339);
const GEO_BAND_MAIN_Y1 = makeBand(0.104, 0.136);
const GEO_BAND_MAIN_Y2 = makeBand(0.072, 0.090);
const GEO_BAND_MAIN_CU = makeBand(0.046, 0.059);
const GEO_BAND_MOTOR_BR = makeBand(-0.292, -0.268);
const GEO_BAND_CLAMP_1 = makeBand(0.260, 0.268, R_MISSILE + 0.0009);
const GEO_BAND_CLAMP_2 = makeBand(-0.174, -0.166, R_MISSILE + 0.0009);
const GEO_BAND_CLAMP_3 = makeBand(-0.360, -0.352, R_MISSILE + 0.0009);

// Cánh nâng giữa thân (swept cropped-trapezoid mid-body wing, mép trước +X vát xuôi về sau)
const GEO_MID_WING = extrude(
  [
    [-0.028, 0.0],
    [0.118, 0.0],
    [0.036, 0.166],
    [-0.046, 0.166],
  ],
  0.0054,
  0.0011,
);

// Cánh lái đuôi (tail control fin, cả mép trước +X và mép sau đều vát xuôi khí động về đuôi -X)
const GEO_TAIL_FIN = extrude(
  [
    [-0.078, 0.0],
    [0.032, 0.0],
    [-0.022, 0.114],
    [-0.088, 0.114],
  ],
  0.0048,
  0.001,
);

// Đế bản lề dọc thân cho cánh giữa và cánh đuôi
const GEO_WING_FAIRING = rbox(0.185, 0.012, 0.016, 0.003);
const GEO_TAIL_FAIRING = rbox(0.128, 0.013, 0.015, 0.003);

// Luồng lửa động cơ phản lực đa lớp ở đuôi (-X)
const GEO_PLUME_CORE = lathe(
  [
    [0.0002, -0.84],
    [0.014, -0.70],
    [0.026, -0.59],
    [0.022, -0.552],
    [0.0002, -0.550],
  ],
  24,
);
const GEO_PLUME_MID = lathe(
  [
    [0.0002, -1.08],
    [0.024, -0.86],
    [0.042, -0.66],
    [0.032, -0.555],
    [0.0002, -0.552],
  ],
  24,
);
const GEO_PLUME_OUTER = lathe(
  [
    [0.0002, -1.32],
    [0.036, -1.02],
    [0.058, -0.73],
    [0.039, -0.558],
    [0.0002, -0.554],
  ],
  24,
);

// ---------------- HÌNH HỌC ỐNG PHÓNG LTA & CỤM NGẮM CLU (DÀI 1.24 M, Ø ỐNG 0.145 M) ----------------
const R_TUBE = 0.0725;

// Vỏ ống phóng composite có gân sọc gia cường quanh chu vi
const GEO_LAUNCH_TUBE = (() => {
  const pts: P2[] = [
    [0.066, -0.612],
    [R_TUBE, -0.612],
    [R_TUBE, -0.48],
  ];
  for (let x = -0.44; x <= 0.44; x += 0.11) {
    pts.push([R_TUBE, x - 0.016]);
    pts.push([R_TUBE + 0.0038, x - 0.011]);
    pts.push([R_TUBE + 0.0038, x + 0.011]);
    pts.push([R_TUBE, x + 0.016]);
  }
  pts.push([R_TUBE, 0.612]);
  pts.push([0.066, 0.612]);
  return lathe(pts, 48);
})();

// Lòng ống rỗng tối bên trong (dùng cho mode 'launcher' & phần đầu 'loaded')
const GEO_TUBE_BORE_EMPTY = lathe(
  [
    [0.0002, -0.612],
    [0.0658, -0.612],
    [0.0658, -0.59],
    [0.0002, -0.25],
    [0.0002, 0.25],
    [0.0658, 0.25],
    [0.0658, 0.612],
  ].reverse() as P2[],
  40,
);

const GEO_TUBE_BORE_LOADED = lathe(
  [
    [0.0658, 0.612],
    [0.0658, 0.36],
    [0.0002, 0.36],
  ],
  40,
);

// Hai đầu bọc đệm cao su chống va đập to bản (trước & loa đuôi)
const GEO_ENDCAP_FRONT = lathe(
  [
    [0.0725, 0.492],
    [0.095, 0.506],
    [0.103, 0.530],
    [0.103, 0.602],
    [0.094, 0.618],
    [0.0665, 0.618],
    [0.0665, 0.606],
  ],
  44,
);

const GEO_ENDCAP_REAR = lathe(
  [
    [0.0665, -0.618],
    [0.098, -0.618],
    [0.109, -0.598],
    [0.107, -0.522],
    [0.092, -0.496],
    [0.0725, -0.486],
  ],
  44,
);

const GEO_BUMPER_LUG_F = rbox(0.104, 0.023, 0.028, 0.006);
const GEO_BUMPER_LUG_R = rbox(0.110, 0.025, 0.030, 0.006);

// Đai kẹp ống phóng nối xuống CLU
const GEO_SADDLE_RING = lathe(
  [
    [R_TUBE - 0.001, -0.024],
    [R_TUBE + 0.007, -0.020],
    [R_TUBE + 0.007, 0.020],
    [R_TUBE - 0.001, 0.024],
  ],
  44,
);

// Thân chính cụm ngắm CLU (extrude biên dạng nhìn ngang X-Y, dày 0.152 m)
const GEO_CLU_BODY = extrude(
  [
    [-0.148, -0.074],
    [0.145, -0.074],
    [0.172, -0.044],
    [0.172, 0.068],
    [0.135, 0.094],
    [-0.088, 0.094],
    [-0.154, 0.052],
    [-0.164, -0.022],
  ],
  0.152,
  0.012,
);

// Vành che & thấu kính quang-nhiệt lớn (Thermal LWIR Ø 108 mm + Day WFOV Ø 68 mm)
const makeObjectiveHood = (rIn: number, rOut: number, len: number) =>
  lathe(
    [
      [rIn, 0.0],
      [rOut, 0.004],
      [rOut + 0.003, len],
      [rIn + 0.002, len],
      [rIn, len - 0.014],
    ],
    40,
  );

const makeConvexLens = (rMax: number, bulge: number) => {
  const pts: P2[] = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const u = i / N; // 0 (rìa) -> 1 (đỉnh lồi +X)
    const r = Math.max(0.0002, rMax * (1 - u));
    const x = (1 - (1 - u) * (1 - u)) * bulge;
    pts.push([r, x]);
  }
  return lathe(pts, 40);
};

const GEO_THERMAL_HOOD = makeObjectiveHood(0.050, 0.058, 0.044);
const GEO_THERMAL_LENS = makeConvexLens(0.0505, 0.012);

const GEO_DAY_HOOD = makeObjectiveHood(0.032, 0.038, 0.034);
const GEO_DAY_LENS = makeConvexLens(0.0325, 0.008);

// Thị kính cao su xếp nếp phía sau CLU (-X)
const GEO_EYECUP = lathe(
  [
    [0.022, -0.086],
    [0.035, -0.078],
    [0.027, -0.062],
    [0.034, -0.050],
    [0.026, -0.036],
    [0.033, -0.022],
    [0.027, -0.010],
    [0.032, 0.0],
  ],
  36,
);

// Tay nắm cò hai bên CLU
const GEO_CLU_GRIP = extrude(
  [
    [-0.026, -0.098],
    [0.024, -0.098],
    [0.036, -0.015],
    [0.028, 0.048],
    [-0.022, 0.048],
    [-0.036, -0.025],
  ],
  0.036,
  0.008,
);

// BCU (Battery Coolant Unit) gắn cạnh dưới trước CLU
const GEO_BCU = lathe(
  [
    [0.0002, -0.062],
    [0.034, -0.060],
    [0.035, 0.052],
    [0.029, 0.062],
    [0.0002, 0.062],
  ],
  32,
);

// Quai xách trên lưng ống phóng
const GEO_CARRY_STRAP = pipe(
  [
    [-0.15, R_TUBE + 0.006, 0],
    [-0.08, R_TUBE + 0.038, 0],
    [0.05, R_TUBE + 0.040, 0],
    [0.12, R_TUBE + 0.006, 0],
  ],
  0.0075,
  28,
);

const WING_ANGLES = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];

/** Cụm đạn tên lửa FGM-148 độc lập (dài 1.12 m, tâm x = 0). */
const MissileAssembly: React.FC<{
  finsOpen: number;
  thrust: number;
  position?: [number, number, number];
}> = ({ finsOpen, thrust, position }) => {
  const open = Math.max(0, Math.min(1, finsOpen));
  const power = Math.max(0, Math.min(1, thrust));
  const fold = (1 - open) * (Math.PI / 2);

  return (
    <group position={position}>
      {/* Thân đạn chính & các đai vạch sơn chuẩn tandem HEAT */}
      <mesh geometry={GEO_MISSILE_BODY} material={MAT_MISSILE_BODY} castShadow receiveShadow />
      <mesh geometry={GEO_BAND_PRECURSOR_Y} material={MAT_BAND_YELLOW} castShadow />
      <mesh geometry={GEO_BAND_PRECURSOR_CU} material={MAT_BAND_COPPER} castShadow />
      <mesh geometry={GEO_BAND_MAIN_Y1} material={MAT_BAND_YELLOW} castShadow />
      <mesh geometry={GEO_BAND_MAIN_Y2} material={MAT_BAND_YELLOW} castShadow />
      <mesh geometry={GEO_BAND_MAIN_CU} material={MAT_BAND_COPPER} castShadow />
      <mesh geometry={GEO_BAND_MOTOR_BR} material={MAT_BAND_PROPELLANT} castShadow />
      <mesh geometry={GEO_BAND_CLAMP_1} material={MAT_DARK_METAL} />
      <mesh geometry={GEO_BAND_CLAMP_2} material={MAT_DARK_METAL} />
      <mesh geometry={GEO_BAND_CLAMP_3} material={MAT_DARK_METAL} />

      {/* Cổng cáp rốn điều khiển bên sườn */}
      <mesh position={[-0.21, 0, R_MISSILE + 0.002]} geometry={rbox(0.036, 0.018, 0.010, 0.002)} material={MAT_GUNMETAL} />

      {/* Vành kim loại + cảm biến quang học bên trong + vòm kính IIR bán cầu */}
      <mesh geometry={GEO_SEEKER_COLLAR} material={MAT_DARK_METAL} castShadow />
      <mesh geometry={GEO_SEEKER_GIMBAL} material={MAT_GUNMETAL} />
      <mesh geometry={GEO_SEEKER_LENS} material={MAT_SEEKER_MIRROR} />
      <mesh position={[0.536, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT_SEEKER_PUPIL}>
        <cylinderGeometry args={[0.011, 0.013, 0.006, 24]} />
      </mesh>
      <mesh geometry={GEO_SEEKER_DOME} material={MAT_SEEKER_DOME} />

      {/* 4 cánh nâng giữa thân (xếp chéo 45°, bung mượt theo finsOpen) */}
      {WING_ANGLES.map((ang, i) => (
        <group key={`mw-${i}`} rotation={[ang, 0, 0]}>
          <mesh position={[-0.072, R_MISSILE - 0.002, 0]} geometry={GEO_WING_FAIRING} material={MAT_DARK_METAL} castShadow />
          <group position={[-0.088, R_MISSILE + 0.001, 0]} rotation={[fold, 0, fold]}>
            <mesh geometry={GEO_MID_WING} material={MAT_MISSILE_WING} castShadow receiveShadow />
          </group>
        </group>
      ))}

      {/* 4 cánh lái đuôi xếp chéo 45° (mép trước vát xuôi, gập gọn về phía trước khi ở trong ống) */}
      {WING_ANGLES.map((ang, i) => (
        <group key={`tf-${i}`} rotation={[ang, 0, 0]}>
          <mesh position={[-0.476, R_MISSILE - 0.004, 0]} geometry={GEO_TAIL_FAIRING} material={MAT_DARK_METAL} castShadow />
          <group position={[-0.452, R_MISSILE - 0.002, 0]} rotation={[fold, 0, -fold]}>
            <mesh geometry={GEO_TAIL_FIN} material={MAT_MISSILE_WING} castShadow receiveShadow />
          </group>
        </group>
      ))}

      {/* Loa phụt đuôi sâu & 4 cánh hướng dòng khí */}
      <mesh geometry={GEO_MISSILE_NOZZLE} material={MAT_NOZZLE_INNER} />
      {WING_ANGLES.map((ang, i) => (
        <group key={`jv-${i}`} rotation={[ang, 0, 0]}>
          <mesh position={[-0.550, 0.036, 0]} geometry={rbox(0.018, 0.010, 0.003, 0.0006)} material={MAT_GUNMETAL} />
        </group>
      ))}

      {/* Luồng lửa động cơ phản lực phát sáng cam-trắng ở đuôi khi thrust > 0 */}
      {power > 0.005 && (
        <group position={[-0.552, 0, 0]} scale={[0.45 + 0.78 * power, 0.65 + 0.45 * power, 0.65 + 0.45 * power]}>
          <group position={[0.552, 0, 0]}>
            <mesh geometry={GEO_PLUME_OUTER}>
              <meshBasicMaterial
                color="#ff4d00"
                transparent
                opacity={Math.min(0.62, 0.56 * power)}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <mesh geometry={GEO_PLUME_MID}>
              <meshBasicMaterial
                color="#ffb703"
                transparent
                opacity={Math.min(0.9, 0.85 * power)}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <mesh geometry={GEO_PLUME_CORE}>
              <meshBasicMaterial color="#fffbe8" toneMapped={false} />
            </mesh>
          </group>
          <mesh position={[0, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.025, 0.025, 0.008, 24]} />
            <meshBasicMaterial color="#fff3c4" toneMapped={false} />
          </mesh>
          <pointLight position={[-0.14, 0, 0]} color="#ff8c2b" intensity={2.6 * power} distance={2.8} decay={2} />
        </group>
      )}
    </group>
  );
};

/** Cụm ống phóng vác vai LTA + bộ điều khiển ngắm quang-nhiệt CLU. */
const LauncherAssembly: React.FC<{ loaded: boolean }> = ({ loaded }) => {
  return (
    <group>
      {/* Thân ống phóng composite gân sọc & lòng ống */}
      <mesh geometry={GEO_LAUNCH_TUBE} material={MAT_TUBE_COMPOSITE} castShadow receiveShadow />
      <mesh geometry={loaded ? GEO_TUBE_BORE_LOADED : GEO_TUBE_BORE_EMPTY} material={MAT_BORE_DARK} />

      {/* Hai đầu bọc đệm cao su chống va đập đa giác to bản */}
      <mesh geometry={GEO_ENDCAP_FRONT} material={MAT_RUBBER} castShadow receiveShadow />
      <mesh geometry={GEO_ENDCAP_REAR} material={MAT_RUBBER} castShadow receiveShadow />
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <group key={`lug-${i}`} rotation={[a, 0, 0]}>
            <mesh position={[0.558, 0.104, 0]} geometry={GEO_BUMPER_LUG_F} material={MAT_RUBBER_SOFT} castShadow />
            <mesh position={[-0.562, 0.108, 0]} geometry={GEO_BUMPER_LUG_R} material={MAT_RUBBER_SOFT} castShadow />
          </group>
        );
      })}

      {/* Đai khoá cơ khí ôm ống + đệm tì vai + quai xách trên */}
      <mesh position={[0.06, 0, 0]} geometry={GEO_SADDLE_RING} material={MAT_DARK_METAL} castShadow />
      <mesh position={[0.29, 0, 0]} geometry={GEO_SADDLE_RING} material={MAT_DARK_METAL} castShadow />
      <mesh
        position={[-0.08, -R_TUBE - 0.012, 0.022]}
        rotation={[0.28, 0, 0]}
        geometry={rbox(0.22, 0.028, 0.095, 0.009)}
        material={MAT_RUBBER_SOFT}
        castShadow
      />
      <mesh geometry={GEO_CARRY_STRAP} material={MAT_RUBBER} castShadow />
      <mesh position={[-0.15, R_TUBE + 0.006, 0]} geometry={rbox(0.028, 0.016, 0.032, 0.003)} material={MAT_GUNMETAL} />
      <mesh position={[0.12, R_TUBE + 0.006, 0]} geometry={rbox(0.028, 0.016, 0.032, 0.003)} material={MAT_GUNMETAL} />

      {/* Cụm ngắm điều khiển CLU gắn bên sườn dưới trái (-Z, -Y) chuẩn tư thế vác vai phải */}
      <group position={[0.18, -0.14, -0.074]}>
        {/* Giá treo nối CLU lên 2 vòng đai ống phóng */}
        <mesh
          position={[0.0, 0.092, 0.042]}
          rotation={[-0.46, 0, 0]}
          geometry={rbox(0.255, 0.070, 0.046, 0.006)}
          material={MAT_DARK_METAL}
          castShadow
        />

        {/* Khối vỏ chính CLU */}
        <mesh geometry={GEO_CLU_BODY} material={MAT_CLU_HOUSING} castShadow receiveShadow />

        {/* Dàn 9 lá gân tản nhiệt dọc sườn ngoài & đỉnh bộ ảnh nhiệt */}
        {Array.from({ length: 9 }, (_, i) => {
          const xFin = -0.075 + i * 0.022;
          return (
            <React.Fragment key={`fin-${i}`}>
              <mesh
                position={[xFin, 0.096, -0.01]}
                geometry={rbox(0.008, 0.016, 0.112, 0.0015)}
                material={MAT_DARK_METAL}
                castShadow
              />
              <mesh
                position={[xFin, 0.018, -0.078]}
                geometry={rbox(0.008, 0.100, 0.014, 0.0015)}
                material={MAT_DARK_METAL}
                castShadow
              />
            </React.Fragment>
          );
        })}

        {/* Ống kính ảnh nhiệt lớn LWIR (tráng phủ vàng đồng germanium nổi rõ ở mặt trước) */}
        <group position={[0.166, 0.024, -0.018]}>
          <mesh geometry={GEO_THERMAL_HOOD} material={MAT_RUBBER} castShadow />
          <mesh position={[0.031, 0, 0]} geometry={GEO_THERMAL_LENS} material={MAT_LENS_AMBER} />
          <mesh position={[0.039, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_GUNMETAL}>
            <torusGeometry args={[0.050, 0.0024, 10, 36]} />
          </mesh>
        </group>

        {/* Ống kính quang học ban ngày WFOV (tráng phủ phản quang xanh lá ngọc lục bảo) */}
        <group position={[0.165, -0.036, 0.038]}>
          <mesh geometry={GEO_DAY_HOOD} material={MAT_RUBBER} castShadow />
          <mesh position={[0.023, 0, 0]} geometry={GEO_DAY_LENS} material={MAT_LENS_EMERALD} />
          <mesh position={[0.030, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_GUNMETAL}>
            <torusGeometry args={[0.032, 0.002, 10, 32]} />
          </mesh>
        </group>

        {/* Thị kính cao su xếp nếp phía sau + màn ngắm FLIR xanh lục bên trong */}
        <group position={[-0.152, 0.018, -0.012]} rotation={[0, 0.08, -0.06]}>
          <mesh geometry={GEO_EYECUP} material={MAT_RUBBER_SOFT} castShadow />
          <mesh position={[-0.012, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_EYECUP_PHOSPHOR}>
            <cylinderGeometry args={[0.019, 0.019, 0.004, 24]} />
          </mesh>
        </group>

        {/* Hai tay nắm cò điều khiển trái & phải kèm lẫy cò đỏ/vàng */}
        {([-1, 1] as const).map((side) => (
          <group
            key={`grip-${side}`}
            position={[-0.018, -0.044, side * 0.086]}
            rotation={[side * -0.18, 0, 0.16]}
          >
            <mesh geometry={GEO_CLU_GRIP} material={MAT_RUBBER} castShadow />
            <mesh position={[0.032, 0.005, 0]} geometry={rbox(0.026, 0.052, 0.016, 0.003)} material={MAT_DARK_METAL} />
            <mesh
              position={[0.024, 0.036, 0]}
              geometry={rbox(0.012, 0.012, 0.018, 0.003)}
              material={plain(side < 0 ? SWITCH_RED : SWITCH_GOLD, 0.35, 0.2)}
            />
          </group>
        ))}

        {/* Bình pin làm lạnh đầu dò BCU (Battery Coolant Unit) phía trước dưới */}
        <group position={[0.095, -0.096, 0.018]}>
          <mesh geometry={GEO_BCU} material={MAT_TUBE_COMPOSITE} castShadow />
          <mesh position={[0.022, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_BAND_YELLOW}>
            <cylinderGeometry args={[0.0355, 0.0355, 0.016, 28]} />
          </mesh>
        </group>
      </group>

      {/* Ở mode === 'loaded': đạn xếp cánh gọn nằm trong lòng ống với vòm đầu dò ló nhẹ ở cửa ống trước */}
      {loaded && <MissileAssembly finsOpen={0} thrust={0} position={[0.045, 0, 0]} />}
    </group>
  );
};

export const ATGM: React.FC<ATGMProps> = ({
  position,
  rotation,
  scale = 1,
  mode = 'missile',
  finsOpen = 1,
  thrust = 0,
}) => {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {mode === 'missile' ? (
        <MissileAssembly finsOpen={finsOpen} thrust={thrust} />
      ) : (
        <LauncherAssembly loaded={mode === 'loaded'} />
      )}
    </group>
  );
};

const ATGMPreview: React.FC = () => (
  <group>
    <ATGM mode="launcher" position={[0, 0.32, -0.32]} />
    <ATGM mode="missile" finsOpen={1} thrust={0.7} position={[0, 0.42, 0.32]} />
  </group>
);

export const preview = turntable(ATGMPreview, { size: 1.7, center: [0, 0.35, 0] });
