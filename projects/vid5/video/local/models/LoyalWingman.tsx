// Mô hình 3D tỉ lệ thật 1:1 — UAV chiến đấu tàng hình hiệp đồng Loyal Wingman (CCA / XQ-58A Valkyrie / YFQ-42A class)
// Hệ trục @lib/3d/geom: mũi +X, đỉnh +Y, sải cánh Z.
// Kích thước chuẩn: Dài 9.14 m (x: -4.57..+4.57) · Sải cánh 8.23 m (z: -4.115..+4.115) · Cao 2.44 m (y: 0..2.44 khi gear = 1).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { P } from '../palette';

export type LoyalWingmanProps = {
  gear?: number;
  afterburner?: number;
  ruddervator?: number;
  bank?: number;
  wheelSpin?: number;
};

// Đường cong gờ chine dọc thân X: mũi cá mập chúc nhẹ sắc lẹm, bụng giữa dày chứa khoang vũ khí, đuôi vuốt lên che hồng ngoại
const chineY = (x: number): number => {
  if (x > 1.35) {
    const u = (x - 1.35) / (4.57 - 1.35);
    return 1.15 - 0.08 * Math.pow(u, 1.55);
  }
  if (x < -1.35) {
    const u = Math.min(1, (-1.35 - x) / (4.45 - 1.35));
    return 1.15 + 0.05 * u * u;
  }
  return 1.15;
};

// Hệ số độ dày mặt lưng / mặt bụng theo X để thân giữa có khoang bụng sâu kiểu XQ-58A / YFQ-42A còn mũi & đuôi dẹt sắc
const hullHeightScale = (x: number, upper: boolean): number => {
  if (upper) {
    return 0.50;
  }
  // Mặt bụng phình sâu ở vùng khoang vũ khí trung tâm (x: -1.6..+1.5), thuôn dẹt dần về mũi cá mập và thềm che loa phụt đuôi
  const bellyBulge = Math.exp(-Math.pow((x - 0.05) / 2.25, 2));
  return 0.34 + 0.19 * bellyBulge;
};

// Bán kính nửa chiều rộng gờ chine r(x) dọc thân (30 trạm mượt từ đuôi -4.44 tới mũi nhọn +4.57)
const HULL_PROFILE: P2[] = (() => {
  const pts: P2[] = [
    [0.001, -4.44],
    [0.34, -4.42],
    [0.41, -4.10],
    [0.49, -3.60],
    [0.58, -3.00],
    [0.65, -2.35],
    [0.71, -1.70],
    [0.75, -1.05],
    [0.765, -0.40],
    [0.765, 0.25],
    [0.75, 0.85],
    [0.725, 1.38],
  ];
  const N = 18;
  for (let i = 1; i <= N; i++) {
    const s = i / N;
    const x = 1.38 + s * (4.57 - 1.38);
    const rem = Math.max(0, 1 - s);
    const r = i === N ? 0.002 : 0.725 * Math.pow(rem, 0.63);
    pts.push([r, x]);
  }
  return pts;
})();

// Chóp mũi điện môi radome 6 mặt vát khớp khít 100% với mũi cá mập từ x = +3.72 tới +4.57
const RADOME_PROFILE: P2[] = (() => {
  const pts: P2[] = [[0.001, 3.72]];
  const N = 10;
  for (let i = 0; i <= N; i++) {
    const x = 3.72 + (i / N) * (4.57 - 3.72);
    const rem = Math.max(0, (4.57 - x) / (4.57 - 1.38));
    const r = i === N ? 0.003 : 0.725 * Math.pow(rem, 0.63) + 0.003;
    pts.push([r, x]);
  }
  return pts;
})();

// Lưng ống dẫn khí S-duct hình thang vát thuôn mượt từ miệng hút lưng (x = +0.80) về họng loa phụt (x = -3.92)
const SDUCT_FAIRING_PROFILE: P2[] = [
  [0.001, -3.95],
  [0.27, -3.92],
  [0.31, -3.35],
  [0.35, -2.55],
  [0.38, -1.65],
  [0.40, -0.75],
  [0.41, 0.15],
  [0.40, 0.76],
  [0.001, 0.78],
];

const assignMeterUVs = (geo: THREE.BufferGeometry, refY: (x: number) => number) => {
  const gPos = geo.attributes.position as THREE.BufferAttribute;
  const uvArr = new Float32Array(gPos.count * 2);
  for (let t = 0; t < gPos.count; t += 3) {
    const cy = (gPos.getY(t) + gPos.getY(t + 1) + gPos.getY(t + 2)) / 3;
    const cx = (gPos.getX(t) + gPos.getX(t + 1) + gPos.getX(t + 2)) / 3;
    const upper = cy >= refY(cx);
    for (let k = 0; k < 3; k++) {
      const idx = t + k;
      const vx = gPos.getX(idx);
      const vz = gPos.getZ(idx);
      uvArr[idx * 2] = vx;
      uvArr[idx * 2 + 1] = upper ? vz * 1.14 : -vz * 1.14 + 2.4;
    }
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uvArr, 2));
  geo.computeVertexNormals();
};

const deformChinedLathe = (profile: P2[], offset = 0): THREE.BufferGeometry => {
  const raw = lathe(profile, 6).clone();
  const pos = raw.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y0 = pos.getY(i);
    const z0 = pos.getZ(i);
    const ky = hullHeightScale(x, y0 >= 0);
    const sgnY = y0 >= 0 ? 1 : -1;
    pos.setXYZ(i, x, chineY(x) + y0 * ky + sgnY * offset, z0);
  }
  const geo = raw.index ? raw.toNonIndexed() : raw;
  assignMeterUVs(geo, chineY);
  return geo;
};

const buildSductFairing = (): THREE.BufferGeometry => {
  const raw = lathe(SDUCT_FAIRING_PROFILE, 6).clone();
  const pos = raw.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y0 = pos.getY(i);
    const z0 = pos.getZ(i);
    // Đỉnh lưng S-duct cao nhất ngay sau miệng hút (y ≈ 1.66 m tại x = +0.7) rồi vuốt mượt xuống loa phụt (y ≈ 1.45 m tại x = -3.9)
    const t = Math.max(0, Math.min(1, (x + 3.95) / (0.78 + 3.95)));
    const base = 1.29 + 0.10 * Math.sin(t * Math.PI * 0.65);
    const hScale = y0 >= 0 ? 0.56 + 0.22 * t : 0.18;
    pos.setXYZ(i, x, base + y0 * hScale, z0);
  }
  const geo = raw.index ? raw.toNonIndexed() : raw;
  assignMeterUVs(geo, () => 1.32);
  return geo;
};

// Biên dạng mặt bằng gờ chine sắc (extrudeTop) chạy suốt từ mũi +4.55 (+0.02 bevel = +4.57) tới đuôi
const CHINE_FLANGE_PTS: P2[] = (() => {
  const right: P2[] = [];
  const N = 16;
  for (let i = 0; i <= N; i++) {
    const s = i / N;
    const x = 4.55 - s * (4.55 - 1.38);
    const r = i === 0 ? 0.012 : 0.735 * Math.pow(s, 0.63);
    right.push([x, r]);
  }
  right.push(
    [0.85, 0.76],
    [0.10, 0.78],
    [-0.65, 0.78],
    [-1.40, 0.75],
    [-2.30, 0.66],
    [-3.15, 0.57],
    [-3.95, 0.45],
    [-4.36, 0.36],
  );
  const left: P2[] = [...right].reverse().slice(0, -1).map(([x, z]) => [x, -z]);
  return [...right, ...left];
})();

// Vạch sơn chiến thuật cam / cyan bám chuẩn theo đường cong gờ chine mũi trước (không nhô thừa ra ngoài)
const makeNoseChineStripePts = (x0: number, x1: number, width: number, sign: 1 | -1): P2[] => {
  const outer: P2[] = [];
  const inner: P2[] = [];
  const M = 7;
  for (let i = 0; i <= M; i++) {
    const x = x0 + (i / M) * (x1 - x0);
    const s = Math.max(0.01, (4.55 - x) / (4.55 - 1.38));
    const r = (x >= 1.38 ? 0.735 * Math.pow(s, 0.63) : 0.755) + 0.012;
    outer.push([x, r * sign]);
    inner.push([x, Math.max(0.02, r - width) * sign]);
  }
  const poly = [...outer, ...inner.reverse()];
  return sign === 1 ? poly : poly.reverse();
};

// Sống lưng trung tâm S-duct (extrude mặt cắt X-Y) vuốt trùm mượt lên nắp trên máng loa phụt tàng hình
const SDUCT_SPINE_PTS: P2[] = [
  [-4.20, 1.36],
  [-4.16, 1.44],
  [-3.55, 1.48],
  [-2.60, 1.54],
  [-1.35, 1.61],
  [-0.10, 1.655],
  [0.74, 1.665],
  [1.04, 1.44],
  [1.04, 1.30],
  [-4.20, 1.28],
];

// Mái vòm che cửa hút khí lưng cắt chữ V tàng hình tại x ≈ +0.8 m (Flush Dorsal Serpentine Intake)
const INTAKE_HOOD_ROOF_PTS: P2[] = [
  [0.54, 0.25],
  [0.92, 0.27],
  [0.78, 0.0],
  [0.92, -0.27],
  [0.54, -0.25],
];

// Mũ che mép trên loa phụt tàng hình (ngắn hơn bờ dưới -4.57 m để tạo khe thoát khí hình thang lệch tầng chuẩn stealth)
const AFT_UPPER_HOOD_PTS: P2[] = [
  [-3.55, 0.28],
  [-4.14, 0.23],
  [-4.24, 0.0],
  [-4.14, -0.23],
  [-3.55, -0.28],
];

// Vách lượn chữ S (S-duct serpentine baffle) bên trong họng hút lưng che kín cánh quạt máy nén
const SDUCT_BAFFLE_PTS: P2[] = [
  [0.22, 1.26],
  [0.22, 1.47],
  [0.58, 1.54],
  [0.92, 1.58],
  [1.10, 1.46],
  [0.84, 1.35],
  [0.50, 1.27],
];

// Biên dạng cánh quét 38° (tan 38° = 0.7813), đầu cánh vát chéo, mép sau cắt góc răng cưa tàng hình ±38°
// Với bevel = 0.022 -> đầu mút cánh đạt đúng z = ±(4.093 + 0.022) = ±4.115 m (sải cánh 8.23 m chuẩn 1:1)
const makeWingPts = (sign: 1 | -1): P2[] => {
  const pts: P2[] = [
    [1.14, 0.44 * sign],
    [0.96, 0.65 * sign],
    [-1.73, 4.093 * sign],
    [-2.33, 3.86 * sign],
    [-1.47, 2.76 * sign],
    [-1.76, 2.39 * sign],
    [-0.98, 1.39 * sign],
    [-1.68, 0.49 * sign],
  ];
  return sign === 1 ? pts : pts.reverse();
};

const makeWingRootFairingPts = (sign: 1 | -1): P2[] => {
  const pts: P2[] = [
    [1.10, 0.42 * sign],
    [0.82, 0.78 * sign],
    [-0.25, 1.62 * sign],
    [-1.08, 1.48 * sign],
    [-1.64, 0.46 * sign],
  ];
  return sign === 1 ? pts : pts.reverse();
};

const makeFlaperonPts = (sign: 1 | -1): P2[] => {
  const pts: P2[] = [
    [-1.36, 2.72 * sign],
    [-2.14, 3.72 * sign],
    [-2.28, 3.78 * sign],
    [-1.49, 2.77 * sign],
  ];
  return sign === 1 ? pts : pts.reverse();
};

const makeInboardElevonPts = (sign: 1 | -1): P2[] => {
  const pts: P2[] = [
    [-0.88, 1.42 * sign],
    [-1.60, 2.34 * sign],
    [-1.73, 2.38 * sign],
    [-1.01, 1.46 * sign],
  ];
  return sign === 1 ? pts : pts.reverse();
};

const makeWingtipStripePts = (sign: 1 | -1): P2[] => {
  const pts: P2[] = [
    [-1.48, 3.75 * sign],
    [-1.66, 3.98 * sign],
    [-2.21, 3.77 * sign],
    [-2.03, 3.54 * sign],
  ];
  return sign === 1 ? pts : pts.reverse();
};

const makeWingtipCyanPts = (sign: 1 | -1): P2[] => {
  const pts: P2[] = [
    [-1.36, 3.60 * sign],
    [-1.45, 3.71 * sign],
    [-2.00, 3.50 * sign],
    [-1.91, 3.39 * sign],
  ];
  return sign === 1 ? pts : pts.reverse();
};

const makeHexPts = (rx: number, rz: number): P2[] => [
  [rx, 0],
  [rx * 0.52, rz],
  [-rx * 0.52, rz],
  [-rx, 0],
  [-rx * 0.52, -rz],
  [rx * 0.52, -rz],
];

// Bờ dưới kéo dài phía đuôi (IR-shielding beaver-tail) vươn tới x = -4.552 (-0.018 bevel = -4.570 m chuẩn chiều dài 9.14 m)
const AFT_SHIELD_PTS: P2[] = [
  [-3.52, 0.43],
  [-4.28, 0.36],
  [-4.552, 0.17],
  [-4.40, 0.0],
  [-4.552, -0.17],
  [-4.28, -0.36],
  [-3.52, -0.43],
];

// Cánh đuôi chữ V cố định (nghiêng ngoài 40°, gốc tại y = 1.27, z = ±0.33; cao cục bộ 1.485 + 0.015 bevel -> đỉnh đạt đúng y = 2.440 m)
const VTAIL_FIN_PTS: P2[] = [
  [-2.80, -0.06],
  [-3.98, 1.485],
  [-4.44, 1.43],
  [-4.22, 1.37],
  [-3.82, 0.00],
  [-3.65, -0.06],
];

const RUDDERVATOR_LOCAL_PTS: P2[] = [
  [0.0, 0.0],
  [-0.38, 1.31],
  [-0.64, 1.27],
  [-0.38, -0.01],
];

export const LoyalWingman: React.FC<LoyalWingmanProps> = ({
  gear = 1,
  afterburner = 0,
  ruddervator = 0,
  bank = 0,
  wheelSpin = 0,
}) => {
  const g = Math.max(0, Math.min(1, gear));
  const ab = Math.max(0, Math.min(1, afterburner));
  const rv = Math.max(-0.55, Math.min(0.55, ruddervator));
  const rollRad = Math.abs(bank) > 3.2 ? (bank * Math.PI) / 180 : bank;

  // Vật liệu sơn tàng hình chuẩn theo yêu cầu (repeat = 0.45 cho UV mét thật)
  const hullMat = useMemo(
    () =>
      paint({
        color: P.f22Mid,
        camo: [P.f35Dark, P.f22Light],
        camoScale: 1.5,
        wear: 0.12,
        dirt: 0.15,
        roughness: 0.46,
        metalness: 0.4,
        repeat: 0.45,
        seed: 58,
      }),
    [],
  );

  const controlMat = useMemo(
    () =>
      paint({
        color: P.f22Dark,
        camo: [P.f35Dark, P.f22Mid],
        camoScale: 1.6,
        wear: 0.1,
        dirt: 0.12,
        roughness: 0.5,
        metalness: 0.38,
        repeat: 0.45,
        seed: 64,
      }),
    [],
  );

  // Vật liệu plain() cho cửa sổ cảm biến, dải băng RAM, vạch cam/cyan chiến thuật và loa phụt
  const ramTapeMat = plain(P.f35Tape, 0.48, 0.28);
  const radomeMat = plain(P.f22Light, 0.44, 0.26);
  const satcomCoreMat = plain('#172638', 0.32, 0.6);
  const eoirHousingMat = plain(P.f35Dark, 0.46, 0.38);
  const eoirAmberMat = plain(P.amber, 0.1, 0.88);
  const eoirGoldMat = plain(P.f35Canopy, 0.14, 0.84);
  const tacOrangeMat = plain(P.flame, 0.34, 0.16);
  const tacAmberMat = plain(P.amber, 0.32, 0.2);
  const tacCyanMat = plain(P.cyan, 0.28, 0.24);
  const intakeDarkMat = plain('#070a10', 0.94, 0.08);
  const exhaustTileMat = plain('#181d24', 0.72, 0.38);
  const nozzleMetalMat = plain('#2c3440', 0.34, 0.8);
  const bayWellMat = plain('#161e28', 0.82, 0.25);
  const strutMat = plain('#d4dde7', 0.35, 0.48);
  const chromeMat = plain('#eef5fc', 0.16, 0.92);

  const geos = useMemo(() => {
    const chinedHull = deformChinedLathe(HULL_PROFILE, 0);
    const noseRadome = deformChinedLathe(RADOME_PROFILE, 0.002);
    const sductFairing = buildSductFairing();
    const chineFlange = extrudeTop(CHINE_FLANGE_PTS, 0.052, 0.02);
    const sductSpine = extrude(SDUCT_SPINE_PTS, 0.34, 0.055);

    // Vạch cam & cyan ôm sát đường cong gờ chine mũi trước
    const chineOrangeR = extrudeTop(makeNoseChineStripePts(1.62, 2.78, 0.055, 1), 0.058, 0.004);
    const chineOrangeL = extrudeTop(makeNoseChineStripePts(1.62, 2.78, 0.055, -1), 0.058, 0.004);
    const chineCyanR = extrudeTop(makeNoseChineStripePts(0.95, 1.54, 0.048, 1), 0.058, 0.004);
    const chineCyanL = extrudeTop(makeNoseChineStripePts(0.95, 1.54, 0.048, -1), 0.058, 0.004);

    // Mái vòm & thành vát nghiêng sau 40° của cửa hút khí lưng (x ≈ +0.8 m)
    const intakeHoodRoof = extrudeTop(INTAKE_HOOD_ROOF_PTS, 0.036, 0.01);
    const intakeHoodLipRam = extrudeTop(
      [
        [0.86, 0.255],
        [0.94, 0.27],
        [0.80, 0.0],
        [0.94, -0.27],
        [0.86, -0.255],
        [0.72, 0.0],
      ],
      0.04,
      0.006,
    );
    const intakeSideWallLocal = extrude(
      [
        [-0.28, -0.02],
        [0.10, 0.235],
        [0.34, -0.02],
      ],
      0.042,
      0.008,
    );
    const sductBaffle = extrude(SDUCT_BAFFLE_PTS, 0.40, 0.012);
    const diverterRamp = extrudeTop(
      [
        [1.82, 0.0],
        [1.12, 0.29],
        [0.76, 0.26],
        [0.76, -0.26],
        [1.12, -0.29],
      ],
      0.034,
      0.006,
    );
    const splitterWedge = extrudeTop(
      [
        [1.66, 0.0],
        [1.10, 0.075],
        [0.88, 0.0],
        [1.10, -0.075],
      ],
      0.048,
      0.005,
    );

    // Cánh quét 38° răng cưa & đầu cánh vát chéo
    const wingR = extrudeTop(makeWingPts(1), 0.074, 0.022);
    const wingL = extrudeTop(makeWingPts(-1), 0.074, 0.022);
    const rootFairR = extrudeTop(makeWingRootFairingPts(1), 0.115, 0.028);
    const rootFairL = extrudeTop(makeWingRootFairingPts(-1), 0.115, 0.028);
    const flapR = extrudeTop(makeFlaperonPts(1), 0.054, 0.009);
    const flapL = extrudeTop(makeFlaperonPts(-1), 0.054, 0.009);
    const elevonR = extrudeTop(makeInboardElevonPts(1), 0.056, 0.009);
    const elevonL = extrudeTop(makeInboardElevonPts(-1), 0.056, 0.009);
    const tipOrangeR = extrudeTop(makeWingtipStripePts(1), 0.082, 0.006);
    const tipOrangeL = extrudeTop(makeWingtipStripePts(-1), 0.082, 0.006);
    const tipCyanR = extrudeTop(makeWingtipCyanPts(1), 0.083, 0.005);
    const tipCyanL = extrudeTop(makeWingtipCyanPts(-1), 0.083, 0.005);

    const wingLeRamR = extrudeTop(
      [
        [1.13, 0.45],
        [0.96, 0.65],
        [-1.72, 4.08],
        [-1.81, 4.03],
        [0.88, 0.62],
        [1.04, 0.45],
      ],
      0.078,
      0.006,
    );
    const wingLeRamL = extrudeTop(
      [
        [1.04, -0.45],
        [0.88, -0.62],
        [-1.81, -4.03],
        [-1.72, -4.08],
        [0.96, -0.65],
        [1.13, -0.45],
      ],
      0.078,
      0.006,
    );

    // Dải băng RAM bảo dưỡng chéo mặt trên cánh theo đúng góc 38° stealth
    const wingPanelRamR = extrudeTop(
      [
        [0.24, 0.90],
        [-1.12, 2.64],
        [-1.17, 2.61],
        [0.19, 0.87],
      ],
      0.079,
      0.003,
    );
    const wingPanelRamL = extrudeTop(
      [
        [0.19, -0.87],
        [-1.17, -2.61],
        [-1.12, -2.64],
        [0.24, -0.90],
      ],
      0.079,
      0.003,
    );

    // Mảng SATCOM lục giác trên lưng mũi trước
    const satcomFrame = extrudeTop(makeHexPts(0.48, 0.26), 0.026, 0.007);
    const satcomCore = extrudeTop(makeHexPts(0.40, 0.205), 0.032, 0.005);
    const satcomInner = extrudeTop(makeHexPts(0.25, 0.125), 0.036, 0.003);
    const aftPatch = extrudeTop(makeHexPts(0.21, 0.13), 0.022, 0.005);

    // Cụm tháp cảm biến quang-hồng ngoại đa diện màu vàng hổ phách (EO/IR) dưới cằm mũi
    const eoirPod = extrude(
      [
        [3.42, 0.95],
        [3.13, 0.72],
        [2.68, 0.72],
        [2.44, 0.90],
      ],
      0.26,
      0.018,
    );

    // Thềm che hồng ngoại đuôi, nắp trên chevron & vách hông che loa phụt
    const aftShield = extrudeTop(AFT_SHIELD_PTS, 0.056, 0.018);
    const aftUpperHood = extrudeTop(AFT_UPPER_HOOD_PTS, 0.044, 0.012);
    const aftTroughFloor = extrudeTop(
      [
        [-3.65, 0.30],
        [-4.28, 0.26],
        [-4.49, 0.14],
        [-4.38, 0.0],
        [-4.49, -0.14],
        [-4.28, -0.26],
        [-3.65, -0.30],
      ],
      0.024,
      0.005,
    );
    const shroudWallLocal = extrude(
      [
        [0.36, -0.02],
        [0.28, 0.25],
        [-0.26, 0.22],
        [-0.50, -0.02],
      ],
      0.048,
      0.01,
    );

    // Loa phụt phản lực dẹt nằm gọn bên trong máng che tàng hình (không nhô khỏi nắp lưng)
    const nozzleLiner = lathe(
      [
        [0.19, -4.16],
        [0.21, -4.14],
        [0.23, -3.92],
        [0.215, -3.72],
        [0.165, -3.72],
        [0.185, -3.96],
        [0.175, -4.16],
      ],
      24,
    );
    const turbineCone = lathe(
      [
        [0.002, -4.04],
        [0.075, -3.86],
        [0.16, -3.75],
      ],
      20,
    );
    const abOuter = lathe(
      [
        [0.21, 0],
        [0.245, -0.35],
        [0.19, -1.15],
        [0.09, -1.85],
        [0.003, -2.35],
      ],
      20,
    );
    const abCore = lathe(
      [
        [0.14, 0],
        [0.16, -0.28],
        [0.11, -0.95],
        [0.002, -1.55],
      ],
      16,
    );

    // Đuôi chữ V nghiêng ngoài 40° & ruddervator
    const vtailFin = extrude(VTAIL_FIN_PTS, 0.065, 0.015);
    const ruddervatorGeo = extrude(RUDDERVATOR_LOCAL_PTS, 0.048, 0.01);
    const vtailTipStripe = extrude(
      [
        [-3.82, 1.29],
        [-3.95, 1.455],
        [-4.39, 1.405],
        [-4.28, 1.25],
      ],
      0.072,
      0.005,
    );
    const vtailLeRam = extrude(
      [
        [-2.80, -0.04],
        [-3.97, 1.47],
        [-4.03, 1.46],
        [-2.88, -0.04],
      ],
      0.069,
      0.004,
    );

    // Đường răng cưa RAM khoang vũ khí bụng
    const baySeamStrip = extrudeTop(
      [
        [1.22, 0.03],
        [1.04, 0.08],
        [0.82, 0.02],
        [0.60, 0.08],
        [0.38, 0.02],
        [0.16, 0.08],
        [-0.06, 0.02],
        [-0.28, 0.08],
        [-0.50, 0.02],
        [-0.72, 0.08],
        [-0.94, 0.02],
        [-1.12, 0.05],
        [-1.12, -0.05],
        [-0.94, -0.08],
        [-0.72, -0.02],
        [-0.50, -0.08],
        [-0.28, -0.02],
        [-0.06, -0.08],
        [0.16, -0.02],
        [0.38, -0.08],
        [0.60, -0.02],
        [0.82, -0.08],
        [1.04, -0.02],
        [1.22, -0.03],
      ],
      0.016,
      0.003,
    );

    // Cửa càng đáp tọa độ cục bộ chuẩn ngay tại bản lề z = 0 (mở đối xứng sạch tuyệt đối)
    const noseGearDoorLocal = extrudeTop(
      [
        [0.36, 0.0],
        [0.24, 0.22],
        [-0.24, 0.22],
        [-0.36, 0.0],
      ],
      0.02,
      0.005,
    );
    const mainGearDoorLocalR = extrudeTop(
      [
        [0.38, 0.0],
        [0.25, 0.32],
        [-0.26, 0.32],
        [-0.38, 0.0],
      ],
      0.022,
      0.005,
    );
    const mainGearDoorLocalL = extrudeTop(
      [
        [-0.38, 0.0],
        [-0.26, -0.32],
        [0.25, -0.32],
        [0.38, 0.0],
      ],
      0.022,
      0.005,
    );

    const torqueLink = extrude(
      [
        [0.0, 0.0],
        [0.13, -0.09],
        [0.0, -0.19],
        [-0.03, -0.16],
        [0.075, -0.09],
        [-0.03, -0.03],
      ],
      0.034,
      0.005,
    );

    // Càng chính xuất phát từ y = 0.84, z = ±0.42 xuống trục bánh y = 0.225 (dy = -0.615), z = ±0.88 (dz = ±0.46)
    const mainStrutPipeR = pipe(
      [
        [0, 0, 0],
        [-0.012, -0.18, 0.22],
        [-0.02, -0.38, 0.38],
      ],
      0.038,
      20,
    );
    const mainStrutPipeL = pipe(
      [
        [0, 0, 0],
        [-0.012, -0.18, -0.22],
        [-0.02, -0.38, -0.38],
      ],
      0.038,
      20,
    );
    const brakeLineR = pipe(
      [
        [0.02, -0.04, 0.03],
        [0.015, -0.22, 0.25],
        [0.01, -0.54, 0.40],
      ],
      0.01,
      16,
    );
    const brakeLineL = pipe(
      [
        [0.02, -0.04, -0.03],
        [0.015, -0.22, -0.25],
        [0.01, -0.54, -0.40],
      ],
      0.01,
      16,
    );

    return {
      chinedHull,
      noseRadome,
      sductFairing,
      chineFlange,
      sductSpine,
      chineOrangeR,
      chineOrangeL,
      chineCyanR,
      chineCyanL,
      intakeHoodRoof,
      intakeHoodLipRam,
      intakeSideWallLocal,
      sductBaffle,
      diverterRamp,
      splitterWedge,
      wingR,
      wingL,
      rootFairR,
      rootFairL,
      flapR,
      flapL,
      elevonR,
      elevonL,
      tipOrangeR,
      tipOrangeL,
      tipCyanR,
      tipCyanL,
      wingLeRamR,
      wingLeRamL,
      wingPanelRamR,
      wingPanelRamL,
      satcomFrame,
      satcomCore,
      satcomInner,
      aftPatch,
      eoirPod,
      aftShield,
      aftUpperHood,
      aftTroughFloor,
      shroudWallLocal,
      nozzleLiner,
      turbineCone,
      abOuter,
      abCore,
      vtailFin,
      ruddervatorGeo,
      vtailTipStripe,
      vtailLeRam,
      baySeamStrip,
      noseGearDoorLocal,
      mainGearDoorLocalR,
      mainGearDoorLocalL,
      torqueLink,
      mainStrutPipeR,
      mainStrutPipeL,
      brakeLineR,
      brakeLineL,
    };
  }, []);

  const satcomRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    const ring = makeHexPts(0.445, 0.236);
    for (let i = 0; i < ring.length; i++) {
      const a = ring[i];
      const b = ring[(i + 1) % ring.length];
      for (let k = 0; k < 3; k++) {
        const p = (k + 0.5) / 3;
        pts.push([a[0] + (b[0] - a[0]) * p, 0.034, a[1] + (b[1] - a[1]) * p]);
      }
    }
    return pts;
  }, []);

  const airframeRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      const x = -1.25 + i * 0.28;
      pts.push([x, 1.326, 0.56], [x, 1.326, -0.56]);
    }
    for (let i = 0; i < 7; i++) {
      const x = -2.20 + i * 0.36;
      const t = Math.max(0, Math.min(1, (x + 3.95) / (0.78 + 3.95)));
      const yTop = 1.29 + 0.10 * Math.sin(t * Math.PI * 0.65) + 0.346 * (0.56 + 0.22 * t);
      pts.push([x, yTop, 0.17], [x, yTop, -0.17]);
    }
    for (let i = 0; i < 8; i++) {
      const x = -1.02 + i * 0.30;
      const kyB = hullHeightScale(x, false);
      const yBelly = chineY(x) - 0.76 * 0.866 * kyB;
      pts.push([x, yBelly - 0.002, 0.30], [x, yBelly - 0.002, -0.30]);
    }
    return pts;
  }, []);

  const cantRad = (40 * Math.PI) / 180; // Đuôi chữ V nghiêng ngoài 40°
  const rvAxis = useMemo(() => new THREE.Vector3(-0.38, 1.31, 0).normalize(), []);
  const rvQuatR = useMemo(() => new THREE.Quaternion().setFromAxisAngle(rvAxis, rv), [rvAxis, rv]);
  const rvQuatL = useMemo(() => new THREE.Quaternion().setFromAxisAngle(rvAxis, -rv), [rvAxis, rv]);

  return (
    <group position={[0, 1.15, 0]} rotation={[rollRad, 0, 0]}>
      <group position={[0, -1.15, 0]}>
        {/* ================= 1. THÂN TÀNG HÌNH GỜ CHINE SẮC & MŨI CÁ MẬP ================= */}
        <mesh geometry={geos.chinedHull} material={hullMat} castShadow receiveShadow />
        {/* Chóp mũi điện môi radome 6 diện vát sắc lẹm hướng +X */}
        <mesh geometry={geos.noseRadome} material={radomeMat} castShadow receiveShadow />

        {/* Diềm gờ chine mỏng sắc + vạch sơn nhận diện cam/cyan bám theo biên dạng mũi cong */}
        <mesh
          geometry={geos.chineFlange}
          material={hullMat}
          position={[0, 1.116, 0]}
          rotation={[0, 0, -0.012]}
          castShadow
          receiveShadow
        />
        <mesh geometry={geos.chineOrangeR} material={tacOrangeMat} position={[0, 1.106, 0]} rotation={[0, 0, -0.012]} />
        <mesh geometry={geos.chineOrangeL} material={tacOrangeMat} position={[0, 1.106, 0]} rotation={[0, 0, -0.012]} />
        <mesh geometry={geos.chineCyanR} material={tacCyanMat} position={[0, 1.114, 0]} rotation={[0, 0, -0.012]} />
        <mesh geometry={geos.chineCyanL} material={tacCyanMat} position={[0, 1.114, 0]} rotation={[0, 0, -0.012]} />

        {/* Tấm mảng ăng-ten liên kết dữ liệu vệ tinh SATCOM lục giác trên lưng trước (thay vòm kính phi công) */}
        <group position={[2.34, 1.388, 0]} rotation={[0, 0, -0.088]}>
          <mesh geometry={geos.satcomFrame} material={ramTapeMat} castShadow receiveShadow />
          <mesh geometry={geos.satcomCore} material={satcomCoreMat} position={[0, 0.002, 0]} />
          <mesh geometry={geos.satcomInner} material={plain('#243d58', 0.28, 0.65)} position={[0, 0.003, 0]} />
          <mesh geometry={rbox(0.48, 0.006, 0.018, 0.002)} material={tacCyanMat} position={[0, 0.039, 0]} />
          <mesh geometry={rbox(0.33, 0.006, 0.014, 0.002)} material={tacCyanMat} position={[0, 0.039, 0.08]} />
          <mesh geometry={rbox(0.33, 0.006, 0.014, 0.002)} material={tacCyanMat} position={[0, 0.039, -0.08]} />
          <Rivets points={satcomRivets} r={0.011} color="#74879c" />
        </group>

        {/* Cửa sổ cảm biến quang-hồng ngoại đa diện màu vàng hổ phách (EO/IR) dưới cằm mũi */}
        <group>
          <mesh geometry={geos.eoirPod} material={eoirHousingMat} castShadow receiveShadow />
          <mesh
            geometry={rbox(0.72, 0.026, 0.29, 0.006)}
            material={ramTapeMat}
            position={[2.95, 0.915, 0]}
            rotation={[0, 0, 0.04]}
          />
          {/* Kính sapphire mạ vàng hổ phách nhìn chéo trước */}
          <mesh
            geometry={rbox(0.31, 0.024, 0.19, 0.004)}
            material={eoirAmberMat}
            position={[3.26, 0.825, 0]}
            rotation={[0, 0, 0.63]}
          />
          {/* Kính đáy nhìn xuống mặt đất */}
          <mesh
            geometry={rbox(0.38, 0.018, 0.18, 0.004)}
            material={eoirGoldMat}
            position={[2.91, 0.718, 0]}
          />
          {/* Hai ô kính đa diện vát hai bên trái/phải */}
          {([1, -1] as const).map((s) => (
            <mesh
              key={`eoirSide${s}`}
              geometry={rbox(0.36, 0.14, 0.02, 0.004)}
              material={eoirAmberMat}
              position={[2.96, 0.81, s * 0.132]}
              rotation={[-s * 0.34, s * 0.14, 0.07]}
            />
          ))}
        </group>

        {/* Đường viền răng cưa RAM khoang vũ khí bụng khép phẳng */}
        <mesh geometry={geos.baySeamStrip} material={ramTapeMat} position={[0.05, 0.792, 0]} />
        {([1, -1] as const).map((s) => (
          <mesh
            key={`bayOuterSeam${s}`}
            geometry={rbox(2.34, 0.014, 0.026, 0.004)}
            material={ramTapeMat}
            position={[0.05, 0.80, s * 0.33]}
          />
        ))}

        {/* ================= 2. CỬA HÚT KHÍ LƯNG TÀNG HÌNH & ỐNG S-DUCT (x ≈ +0.8 m) ================= */}
        <group>
          {/* Khối lưng ống dẫn khí S-duct hình thang vát thuôn mượt về loa phụt đuôi */}
          <mesh geometry={geos.sductFairing} material={hullMat} castShadow receiveShadow />
          <mesh geometry={geos.sductSpine} material={hullMat} castShadow receiveShadow />

          {/* Rãnh dẫn dòng tách lớp biên & nêm phân luồng hình thoi phía trước miệng hút x ≈ +0.8..+1.8 m */}
          <mesh geometry={geos.diverterRamp} material={controlMat} position={[0, 1.425, 0]} receiveShadow />
          <mesh geometry={geos.splitterWedge} material={ramTapeMat} position={[0, 1.432, 0]} />

          {/* Mái cửa hút khí hình thang vát chữ V trên lưng giữa thân (x ≈ +0.8 m) + viền băng RAM sáng nổi bật */}
          <mesh geometry={geos.intakeHoodRoof} material={hullMat} position={[0, 1.635, 0]} castShadow receiveShadow />
          <mesh geometry={geos.intakeHoodLipRam} material={ramTapeMat} position={[0, 1.634, 0]} />

          {/* Hai vách bên cửa hút nghiêng trong & vát xuôi sau 42° chuẩn tàng hình */}
          {([1, -1] as const).map((s) => (
            <React.Fragment key={`intakeSide${s}`}>
              <mesh
                geometry={geos.intakeSideWallLocal}
                material={hullMat}
                position={[0.82, 1.43, s * 0.33]}
                rotation={[-s * 0.36, 0, 0]}
                castShadow
              />
              {/* Viền băng RAM cạnh bên miệng hút nghiêng 42° + vạch tam giác cảnh báo cửa hút màu cam USAF */}
              <mesh
                geometry={rbox(0.04, 0.29, 0.046, 0.006)}
                material={ramTapeMat}
                position={[1.03, 1.54, s * 0.29]}
                rotation={[-s * 0.36, 0, 0.72]}
              />
              <mesh
                geometry={rbox(0.28, 0.022, 0.052, 0.004)}
                material={tacOrangeMat}
                position={[1.24, 1.45, s * 0.28]}
                rotation={[0, -s * 0.26, -0.02]}
              />
            </React.Fragment>
          ))}

          {/* Họng tối sâu & vách lượn S-duct che kín 100% mặt cánh quạt động cơ */}
          <mesh
            geometry={rbox(0.36, 0.19, 0.46, 0.01)}
            material={intakeDarkMat}
            position={[0.72, 1.525, 0]}
          />
          <mesh geometry={geos.sductBaffle} material={intakeDarkMat} />

          {/* Ăng-ten GPS/IFF lục giác nhỏ trên lưng S-duct */}
          <mesh geometry={geos.aftPatch} material={ramTapeMat} position={[-0.68, 1.648, 0]} />
        </group>

        {/* ================= 3. CÁNH QUÉT CAO 38° RĂNG CƯA & ĐUÔI CHỮ V 40° ================= */}
        <group>
          <mesh geometry={geos.rootFairR} material={hullMat} position={[0, 1.21, 0]} castShadow receiveShadow />
          <mesh geometry={geos.rootFairL} material={hullMat} position={[0, 1.21, 0]} castShadow receiveShadow />

          <group position={[0, 1.23, 0]} rotation={[0.02, 0, 0]}>
            <mesh geometry={geos.wingR} material={hullMat} castShadow receiveShadow />
            <mesh geometry={geos.wingLeRamR} material={ramTapeMat} position={[0, -0.002, 0]} />
            <mesh geometry={geos.wingPanelRamR} material={ramTapeMat} position={[0, -0.002, 0]} />
            <mesh geometry={geos.flapR} material={controlMat} position={[0, 0.01, 0]} castShadow />
            <mesh geometry={geos.elevonR} material={controlMat} position={[0, 0.01, 0]} castShadow />
            <mesh geometry={geos.tipOrangeR} material={tacOrangeMat} position={[0, -0.004, 0]} />
            <mesh geometry={geos.tipCyanR} material={tacCyanMat} position={[0, -0.0045, 0]} />
          </group>

          <group position={[0, 1.23, 0]} rotation={[-0.02, 0, 0]}>
            <mesh geometry={geos.wingL} material={hullMat} castShadow receiveShadow />
            <mesh geometry={geos.wingLeRamL} material={ramTapeMat} position={[0, -0.002, 0]} />
            <mesh geometry={geos.wingPanelRamL} material={ramTapeMat} position={[0, -0.002, 0]} />
            <mesh geometry={geos.flapL} material={controlMat} position={[0, 0.01, 0]} castShadow />
            <mesh geometry={geos.elevonL} material={controlMat} position={[0, 0.01, 0]} castShadow />
            <mesh geometry={geos.tipOrangeL} material={tacOrangeMat} position={[0, -0.004, 0]} />
            <mesh geometry={geos.tipCyanL} material={tacCyanMat} position={[0, -0.0045, 0]} />
          </group>

          {/* Hai cánh đuôi chữ V nghiêng ngoài 40° (đỉnh cao đúng y = 2.440 m) có mặt lái ruddervator */}
          {([1, -1] as const).map((s) => (
            <group
              key={`vtail${s}`}
              position={[0, 1.27, s * 0.33]}
              rotation={[s * cantRad, 0, 0]}
            >
              <mesh geometry={geos.vtailFin} material={hullMat} castShadow receiveShadow />
              <mesh geometry={geos.vtailLeRam} material={ramTapeMat} />
              <mesh geometry={geos.vtailTipStripe} material={tacOrangeMat} />
              <mesh
                geometry={rbox(0.44, 0.032, 0.074, 0.004)}
                material={tacCyanMat}
                position={[-4.06, 1.22, 0]}
                rotation={[0, 0, -0.11]}
              />
              <group position={[-3.83, 0.04, 0]} quaternion={s === 1 ? rvQuatR : rvQuatL}>
                <mesh geometry={geos.ruddervatorGeo} material={controlMat} castShadow receiveShadow />
              </group>
            </group>
          ))}
        </group>

        {/* ================= 4. LOA PHỤT CHE CHẮN TÀNG HÌNH & LUỒNG LỬA AFTERBURNER ================= */}
        <group>
          {/* Bờ dưới kéo dài tới x = -4.57 m che tia hồng ngoại từ dưới đất nhìn lên + nắp trên chevron gọn sắc */}
          <mesh geometry={geos.aftShield} material={hullMat} position={[0, 1.14, 0]} castShadow receiveShadow />
          <mesh geometry={geos.aftUpperHood} material={hullMat} position={[0, 1.40, 0]} castShadow receiveShadow />
          <mesh geometry={geos.aftTroughFloor} material={exhaustTileMat} position={[0, 1.196, 0]} receiveShadow />
          {/* Hai vách hông nghiêng VÀO TRONG (-s * 0.34) tạo máng che tàng hình hình thang khép kín */}
          {([1, -1] as const).map((s) => (
            <mesh
              key={`shroudWall${s}`}
              geometry={geos.shroudWallLocal}
              material={hullMat}
              position={[-3.92, 1.18, s * 0.31]}
              rotation={[-s * 0.34, 0, 0]}
              castShadow
            />
          ))}

          {/* Ống loa phụt hợp kim titan dẹt đặt lùi sâu bên trong máng che & chóp nón tuabin */}
          <group position={[0, 1.305, 0]} scale={[1, 0.72, 1.12]}>
            <mesh geometry={geos.nozzleLiner} material={nozzleMetalMat} castShadow />
            <mesh geometry={geos.turbineCone} material={exhaustTileMat} />

            {/* Luồng lửa động cơ phản lực điều khiển qua afterburner (0..1) */}
            {ab > 0.01 && (
              <group position={[-4.12, 0, 0]} scale={[0.45 + 0.75 * ab, 0.78 + 0.26 * ab, 0.78 + 0.26 * ab]}>
                <pointLight color="#ff9d3b" intensity={14 * ab} distance={6.5} decay={1.6} position={[-0.35, 0, 0]} />
                <mesh position={[0.16, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.155, 0.155, 0.06, 20]} />
                  <meshBasicMaterial color={P.amberHot} transparent opacity={0.9 * ab} toneMapped={false} />
                </mesh>
                <mesh geometry={geos.abOuter}>
                  <meshBasicMaterial color={P.flame} transparent opacity={0.54 * ab} toneMapped={false} depthWrite={false} />
                </mesh>
                <mesh geometry={geos.abCore}>
                  <meshBasicMaterial color={P.amberHot} transparent opacity={0.9 * ab} toneMapped={false} depthWrite={false} />
                </mesh>
                {[0.28, 0.62, 0.98, 1.34].map((dx, idx) => (
                  <mesh
                    key={idx}
                    position={[-dx, 0, 0]}
                    scale={[0.13 * (1 - idx * 0.17), 0.085 * (1 - idx * 0.18), 0.085 * (1 - idx * 0.18)]}
                  >
                    <octahedronGeometry args={[1, 0]} />
                    <meshBasicMaterial color="#fff8e0" transparent opacity={0.82 * ab} toneMapped={false} depthWrite={false} />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        </group>

        <Rivets points={airframeRivets} r={0.011} color="#6d8096" />

        {/* ================= 5. CÀNG ĐÁP 3 BÁNH THU / HẠ THEO gear (0..1, bánh chạm đúng y = 0) ================= */}
        {/* --- Càng mũi (Nose Gear): trục y = 0.88 - 0.715 = 0.165 m, bán kính r = 0.165 m -> đáy chạm đúng y = 0.000 m --- */}
        <group>
          {g > 0.02 && (
            <mesh geometry={rbox(0.72, 0.11, 0.24, 0.015)} material={bayWellMat} position={[2.22, 0.90, 0]} />
          )}
          <group
            position={[2.22, 0.86, 0.12]}
            rotation={[(g * Math.PI) / 2.05, 0, -0.02]}
          >
            <mesh geometry={geos.noseGearDoorLocal} material={hullMat} castShadow />
          </group>

          {g > 0.03 && (
            <group position={[2.36, 0.88, 0]} rotation={[0, 0, (1 - g) * 1.56]}>
              <mesh position={[-0.022, -0.22, 0]} rotation={[0, 0, -0.08]} material={strutMat} castShadow>
                <cylinderGeometry args={[0.034, 0.03, 0.44, 16]} />
              </mesh>
              <mesh position={[-0.045, -0.51, 0]} rotation={[0, 0, -0.05]} material={chromeMat} castShadow>
                <cylinderGeometry args={[0.022, 0.022, 0.28, 14]} />
              </mesh>
              <mesh
                geometry={rbox(0.024, 0.34, 0.028, 0.006)}
                material={strutMat}
                position={[-0.13, -0.17, 0]}
                rotation={[0, 0, 0.58]}
                castShadow
              />
              <mesh geometry={rbox(0.035, 0.055, 0.075, 0.01)} material={tacAmberMat} position={[0.02, -0.28, 0]} />
              <mesh geometry={rbox(0.038, 0.042, 0.062, 0.008)} material={plain('#eef8ff', 0.12, 0.2)} position={[0.024, -0.28, 0]} />
              <mesh geometry={geos.torqueLink} material={strutMat} position={[-0.025, -0.38, 0]} />
              <mesh geometry={rbox(0.07, 0.13, 0.028, 0.008)} material={strutMat} position={[-0.055, -0.65, 0.065]} castShadow />
              <mesh geometry={rbox(0.06, 0.035, 0.09, 0.008)} material={strutMat} position={[-0.055, -0.59, 0.03]} />
              <Wheel
                r={0.165}
                width={0.095}
                spin={wheelSpin}
                tire="#202328"
                rim="#b8c5d2"
                bolts={6}
                position={[-0.055, -0.715, 0]}
              />
            </group>
          )}
        </group>

        {/* --- Hai càng chính (Main Gear): trục y = 0.84 - 0.615 = 0.225 m, bán kính r = 0.225 m -> đáy chạm đúng y = 0.000 m --- */}
        {([1, -1] as const).map((s) => (
          <group key={`mainGear${s}`}>
            {g > 0.02 && (
              <mesh
                geometry={rbox(0.80, 0.12, 0.30, 0.015)}
                material={bayWellMat}
                position={[-0.58, 0.86, s * 0.36]}
              />
            )}
            <group
              position={[-0.58, 0.81, s * 0.50]}
              rotation={[s * g * 1.44, 0, 0]}
            >
              <mesh
                geometry={s === 1 ? geos.mainGearDoorLocalR : geos.mainGearDoorLocalL}
                material={hullMat}
                castShadow
              />
            </group>

            {g > 0.03 && (
              <group
                position={[-0.56, 0.84, s * 0.42]}
                rotation={[-s * (1 - g) * 1.48, 0, 0]}
              >
                <mesh
                  geometry={s === 1 ? geos.mainStrutPipeR : geos.mainStrutPipeL}
                  material={strutMat}
                  castShadow
                />
                <mesh
                  geometry={s === 1 ? geos.brakeLineR : geos.brakeLineL}
                  material={plain('#3b4654', 0.5, 0.6)}
                />
                <mesh
                  geometry={rbox(0.34, 0.028, 0.032, 0.007)}
                  material={strutMat}
                  position={[0.12, -0.17, s * 0.18]}
                  rotation={[0, -s * 0.48, 0.68]}
                  castShadow
                />
                <mesh position={[-0.02, -0.495, s * 0.38]} material={chromeMat} castShadow>
                  <cylinderGeometry args={[0.027, 0.027, 0.25, 14]} />
                </mesh>
                <mesh
                  geometry={geos.torqueLink}
                  material={strutMat}
                  position={[-0.015, -0.39, s * 0.38]}
                />
                <mesh
                  position={[-0.02, -0.615, s * 0.42]}
                  rotation={[Math.PI / 2, 0, 0]}
                  material={strutMat}
                  castShadow
                >
                  <cylinderGeometry args={[0.026, 0.026, 0.12, 12]} />
                </mesh>
                <Wheel
                  r={0.225}
                  width={0.135}
                  spin={wheelSpin}
                  tire="#1f2227"
                  rim="#b8c5d2"
                  bolts={8}
                  position={[-0.02, -0.615, s * 0.46]}
                />
              </group>
            )}
          </group>
        ))}
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  LoyalWingman: { C: LoyalWingman, size: 10, center: [0, 1.25, 0] },
};
