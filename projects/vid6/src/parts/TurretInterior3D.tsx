import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lerp } from '@core/time';
import { extrude, lathe, mat4, merge, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT_PRESETS, PAL } from '../design/palette';

export type TurretInterior3DProps = {
  mirrorTilt?: [number, number];
  gunPitch?: number;
  recoil?: number;
  breechOpen?: number;
  puckDrop?: number;
  cadillacTurn?: number;
  blastDoorOpen?: number;
  blowoutOpen?: number;
  loaderPhase?: number;
  halonSpray?: number;
  showCrew?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

// ---------- Vật liệu dùng chung (cache tự động trong materials.ts) ----------
const matArmorExt = () =>
  paint({
    ...PAINT_PRESETS.abramsDesert,
    camo: [...PAINT_PRESETS.abramsDesert.camo],
    seed: 11,
  });
const matInteriorWall = () =>
  paint({
    color: '#cbd4ce',
    camo: ['#bfc9c2', '#d9e1dc'],
    camoScale: 1.8,
    wear: 0.2,
    dirt: 0.22,
    roughness: 0.7,
    metalness: 0.22,
    repeat: 0.5,
    seed: 23,
  });
const matBreechAlloy = () =>
  paint({
    color: '#738394',
    camo: ['#607080', '#8798a9'],
    camoScale: 2.2,
    wear: 0.34,
    dirt: 0.18,
    roughness: 0.36,
    metalness: 0.82,
    repeat: 0.8,
    seed: 37,
  });
const matGunCradle = () => plain('#44505d', 0.45, 0.74);
const matCutEdge = () => plain('#c43b29', 0.48, 0.35);
const matChrome = () => plain('#e2ebf4', 0.12, 0.94);
const matMirror = () =>
  plain('#f0fdff', 0.02, 0.98, {
    emissive: new THREE.Color('#42efe0'),
    emissiveIntensity: 0.26,
  });
const matDarkSteel = () => plain('#252c34', 0.55, 0.68);
const matMidSteel = () => plain('#687786', 0.44, 0.68);
const matBrass = () => plain('#dba93d', 0.28, 0.85);
const matYellow = () => plain('#f2b61d', 0.38, 0.22);
const matBlackRubber = () => plain('#1b1f25', 0.88, 0.08);
const matRedHalon = () => plain('#cf2424', 0.34, 0.35);
const matPropellant = () => plain(PAL.propellant, 0.66, 0.06);
const matSabot = () => plain('#2a3038', 0.42, 0.62);
const matDuTip = () =>
  plain('#9173ed', 0.26, 0.78, {
    emissive: new THREE.Color(PAL.duPurple),
    emissiveIntensity: 0.2,
  });
const matAmpWarhead = () => plain('#566347', 0.54, 0.32);
const matAmberScreen = () =>
  plain('#ffaa2b', 0.2, 0.08, {
    emissive: new THREE.Color('#ff9d1c'),
    emissiveIntensity: 1.1,
  });
const matAmberHot = () =>
  plain('#ffe787', 0.16, 0.08, {
    emissive: new THREE.Color('#ffe27a'),
    emissiveIntensity: 1.4,
  });
const matCyanOptic = () =>
  plain('#29e3d4', 0.12, 0.45, {
    emissive: new THREE.Color('#1bd1c2'),
    emissiveIntensity: 0.7,
  });

// ---------- Geometry tĩnh cấp module ----------
// Đoạn gốc nòng pháo M256 120mm + bầu hút khói (Bore Evacuator) đặc trưng Abrams
const BARREL_STUB_GEO = lathe(
  [
    [0.152, 0.16],
    [0.152, 0.52],
    [0.126, 0.58],
    [0.12, 1.02],
    [0.162, 1.08],
    [0.162, 1.54],
    [0.112, 1.6],
    [0.106, 1.84],
    [0.062, 1.84],
    [0.06, 0.16],
  ],
  36
);

// Lòng buồng đạn 120mm mạ crôm bóng bên trong khoá nòng
const CHAMBER_BORE_GEO = lathe(
  [
    [0.088, -0.82],
    [0.088, -0.4],
    [0.062, -0.34],
    [0.062, 0.2],
    [0.08, 0.2],
    [0.08, -0.34],
    [0.102, -0.4],
    [0.102, -0.82],
  ],
  28
);

// Đế đạn kim loại ("gạt tàn" / spent aft-cap puck, đường kính thật 160mm)
const PUCK_GEO = lathe(
  [
    [0.001, -0.024],
    [0.082, -0.024],
    [0.084, -0.015],
    [0.08, 0.026],
    [0.068, 0.026],
    [0.064, -0.008],
    [0.001, -0.008],
  ],
  28
);

// Biên dạng nghiêng vát chữ V sắc lẹm của má giáp trước M1A2 bên trái
const LEFT_CHEEK_GEO = extrude(
  [
    [0.78, 0.86],
    [2.16, 0.96],
    [2.24, 1.12],
    [1.36, 1.72],
    [0.78, 1.76],
  ],
  0.94,
  0.024
);

// Khiên chắn pháo trung tâm (Gun Mantlet) vát chéo đồng bộ biên dạng má giáp M1A2
const MANTLET_WEDGE_GEO = extrude(
  [
    [1.46, 0.9],
    [2.06, 0.96],
    [2.14, 1.16],
    [1.76, 1.54],
    [1.46, 1.56],
  ],
  0.82,
  0.025
);

// Má giáp trước bên phải cắt ngang thấp (y = 1.12) để phô diễn mặt cắt sandwich giáp Chobham
const RIGHT_CHEEK_BASE_GEO = extrude(
  [
    [0.92, 0.86],
    [2.16, 0.96],
    [2.22, 1.11],
    [0.92, 1.11],
  ],
  0.96,
  0.016
);

// Biên dạng vát đáy đuôi khoang đạn Bustle chuẩn M1A2
const BUSTLE_SIDE_LEFT_LOW = extrude(
  [
    [-2.56, 0.98],
    [-2.32, 0.86],
    [-1.02, 0.86],
    [-1.02, 1.08],
    [-2.56, 1.08],
  ],
  0.11,
  0.01
);

// Giá ống thép bên ngoài sườn trái khoang đuôi M1A2 (Bustle Stowage Rack)
const BUSTLE_RACK_PIPES = [
  pipe(
    [
      [-1.18, 1.58, -1.5],
      [-1.22, 1.58, -1.64],
      [-2.38, 1.58, -1.64],
      [-2.42, 1.58, -1.5],
    ],
    0.018,
    24
  ),
  pipe(
    [
      [-1.18, 1.24, -1.5],
      [-1.22, 1.24, -1.64],
      [-2.38, 1.24, -1.64],
      [-2.42, 1.24, -1.5],
    ],
    0.018,
    24
  ),
];

// Khung ống thép bảo vệ giỏ tháp pháo (mở thoáng mặt cắt bên phải +Z)
const BASKET_STANCHIONS = [124, 168, 212, 255, 298].map((degAng) => {
  const a = (degAng * Math.PI) / 180;
  return pipe(
    [
      [0.06 + Math.cos(a) * 1.02, 0.16, Math.sin(a) * 1.02],
      [0.06 + Math.cos(a) * 1.06, 0.48, Math.sin(a) * 1.06],
      [0.06 + Math.cos(a) * 1.12, 0.84, Math.sin(a) * 1.12],
    ],
    0.026,
    24
  );
});

const makeArcPipe = (y: number, radius: number, degStart: number, degEnd: number, rTube = 0.022) => {
  const pts: [number, number, number][] = [];
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const a = ((degStart + ((degEnd - degStart) * i) / steps) * Math.PI) / 180;
    pts.push([0.06 + Math.cos(a) * radius, y, Math.sin(a) * radius]);
  }
  return pipe(pts, rTube, 36);
};

const BASKET_RAIL_LOW = makeArcPipe(0.42, 1.05, 122, 302, 0.02);
const BASKET_RAIL_HIGH = makeArcPipe(0.7, 1.1, 122, 302, 0.022);

// Đường ống thuỷ lực từ khớp xoay sàn giỏ và từ công tắc đầu gối dẫn thẳng lên xi-lanh cửa chống nổ!
const HYDRAULIC_SLIP_PIPES = [
  pipe(
    [
      [0.06, 0.24, 0.04],
      [0.32, 0.22, 0.2],
      [0.72, 0.36, 0.42],
      [0.92, 0.86, 0.56],
    ],
    0.016,
    24
  ),
  pipe(
    [
      [0.02, 0.24, -0.05],
      [-0.28, 0.2, -0.45],
      [-0.34, 0.58, -0.94],
    ],
    0.015,
    20
  ),
];

const KNEE_TO_BLASTDOOR_PIPE = pipe(
  [
    [-0.34, 0.66, -0.96],
    [-0.68, 0.94, -1.04],
    [-0.95, 1.35, -1.16],
    [-0.95, 1.69, -1.05],
  ],
  0.016,
  24
);

const HALON_MANIFOLD_PIPE = pipe(
  [
    [-0.82, 1.22, -1.28],
    [-0.82, 1.36, -1.26],
    [-0.36, 1.36, -1.26],
    [0.26, 1.36, -1.26],
  ],
  0.014,
  24
);

// ---------- Giá tổ ong 36 viên đạn 120mm (4 hàng x 9 cột = đúng 36 viên!) ----------
const buildAmmoBustleGeometries = () => {
  const bases: THREE.BufferGeometry[] = [];
  const primers: THREE.BufferGeometry[] = [];
  const propellants: THREE.BufferGeometry[] = [];
  const bands: THREE.BufferGeometry[] = [];
  const sabots: THREE.BufferGeometry[] = [];
  const duTips: THREE.BufferGeometry[] = [];
  const ampHeads: THREE.BufferGeometry[] = [];
  const collars: THREE.BufferGeometry[] = [];

  const baseCyl = new THREE.CylinderGeometry(0.078, 0.078, 0.038, 20);
  baseCyl.rotateZ(Math.PI / 2);
  const primerCyl = new THREE.CylinderGeometry(0.022, 0.022, 0.044, 12);
  primerCyl.rotateZ(Math.PI / 2);
  const propCyl = new THREE.CylinderGeometry(0.059, 0.061, 0.68, 18);
  propCyl.rotateZ(Math.PI / 2);
  const bandCyl = new THREE.CylinderGeometry(0.0625, 0.0625, 0.055, 18);
  bandCyl.rotateZ(Math.PI / 2);
  const sabotCone = lathe(
    [
      [0.058, 0],
      [0.048, 0.08],
      [0.024, 0.21],
      [0.015, 0.24],
    ],
    16
  );
  const duSpike = lathe(
    [
      [0.014, 0],
      [0.011, 0.09],
      [0.002, 0.14],
    ],
    12
  );
  const ampCone = lathe(
    [
      [0.059, 0],
      [0.056, 0.12],
      [0.032, 0.25],
      [0.014, 0.3],
    ],
    16
  );
  const ringShape = new THREE.Shape();
  ringShape.absarc(0, 0, 0.084, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.068, 0, Math.PI * 2, true);
  ringShape.holes.push(hole);
  const collarGeo = new THREE.ExtrudeGeometry(ringShape, { depth: 0.05, bevelEnabled: false, curveSegments: 8 });
  collarGeo.rotateY(Math.PI / 2);

  const rowY = [1.01, 1.18, 1.35, 1.52];
  let idx = 0;
  for (let r = 0; r < 4; r++) {
    const stagger = r % 2 === 0 ? -0.045 : 0.045;
    for (let c = 0; c < 9; c++) {
      const z = -1.04 + c * 0.26 + stagger;
      const y = rowY[r];
      bases.push(baseCyl.clone().applyMatrix4(mat4([-1.14, y, z])));
      primers.push(primerCyl.clone().applyMatrix4(mat4([-1.138, y, z])));
      propellants.push(propCyl.clone().applyMatrix4(mat4([-1.49, y, z])));
      bands.push(bandCyl.clone().applyMatrix4(mat4([-1.34, y, z])));
      collars.push(collarGeo.clone().applyMatrix4(mat4([-1.25, y, z])));
      collars.push(collarGeo.clone().applyMatrix4(mat4([-1.78, y, z])));

      const isSabot = idx % 3 !== 2;
      if (isSabot) {
        sabots.push(sabotCone.clone().applyMatrix4(mat4([-1.83, y, z], [0, Math.PI, 0])));
        duTips.push(duSpike.clone().applyMatrix4(mat4([-2.06, y, z], [0, Math.PI, 0])));
      } else {
        ampHeads.push(ampCone.clone().applyMatrix4(mat4([-1.83, y, z], [0, Math.PI, 0])));
      }
      idx++;
    }
  }

  return {
    basesGeo: merge(bases),
    primersGeo: merge(primers),
    propellantsGeo: merge(propellants),
    bandsGeo: merge(bands),
    sabotsGeo: merge(sabots),
    duTipsGeo: merge(duTips),
    ampHeadsGeo: merge(ampHeads),
    collarsGeo: merge(collars),
  };
};

const AMMO_RACK_GEOS = buildAmmoBustleGeometries();

// ---------- Mặt cắt nhiều lớp giáp phức hợp Chobham + Lưới Uranium nghèo ----------
const ChobhamCutawayLayers: React.FC<{ position: [number, number, number]; width?: number }> = ({
  position,
  width = 0.84,
}) => {
  const matCeramic = plain('#e3dccb', 0.5, 0.08);
  const matDuMesh = plain('#7a63b8', 0.32, 0.75);
  const matKevlar = plain('#b9bc9e', 0.78, 0.05);
  return (
    <group position={position}>
      {/* Tấm thép cán đồng nhất RHA ngoài cùng */}
      <mesh position={[0.45, 0, 0]} material={matMidSteel()} castShadow>
        <boxGeometry args={[0.068, 0.25, width]} />
      </mesh>
      {/* 5 cụm sandwich phản ứng phi nổ NERA (gốm SiC + cao su đàn hồi + tấm thép trượt) */}
      {[-0.22, -0.08, 0.06, 0.2, 0.33].map((xOff, i) => (
        <group key={i} position={[xOff, 0.012, 0]} rotation={[0, 0.36, 0]}>
          <mesh position={[0.022, 0, 0]} material={matCeramic} castShadow>
            <boxGeometry args={[0.03, 0.245, width * 0.86]} />
          </mesh>
          <mesh position={[0, 0, 0]} material={matBlackRubber()}>
            <boxGeometry args={[0.018, 0.24, width * 0.86]} />
          </mesh>
          <mesh position={[-0.02, 0, 0]} material={matChrome()}>
            <boxGeometry args={[0.015, 0.245, width * 0.86]} />
          </mesh>
        </group>
      ))}
      {/* Tấm lưới Uranium nghèo (DU) siêu cứng màu tím ánh kim */}
      <mesh position={[-0.34, 0.008, 0]} material={matDuMesh} castShadow>
        <boxGeometry args={[0.052, 0.25, width]} />
      </mesh>
      {/* Lớp lót Kevlar chống mảnh + vách lưng thép */}
      <mesh position={[-0.4, 0.006, 0]} material={matKevlar}>
        <boxGeometry args={[0.034, 0.25, width]} />
      </mesh>
      <mesh position={[-0.445, 0, 0]} material={matGunCradle()}>
        <boxGeometry args={[0.044, 0.255, width]} />
      </mesh>
    </group>
  );
};

// ---------- Mô hình cách điệu Lính xe tăng đội mũ CVC ----------
const TankCrewFigure: React.FC<{
  pose: 'gunner' | 'commander';
  position: [number, number, number];
  gripAngle?: number;
}> = ({ pose, position, gripAngle = 0 }) => {
  const matSuit = plain('#6d7458', 0.82, 0.05);
  const matVest = plain('#3a4236', 0.78, 0.1);
  const matSkin = plain('#d7a982', 0.68, 0.04);
  const matHelmet = plain('#2f372e', 0.52, 0.18);
  const isCmd = pose === 'commander';

  return (
    <group position={position}>
      {[-0.095, 0.095].map((zOff, i) => (
        <group key={i} position={[0.1, 0.04, zOff]}>
          <mesh position={[0.08, 0.02, 0]} rotation={[0, 0, -0.14]} material={matSuit} castShadow>
            <boxGeometry args={[0.28, 0.105, 0.105]} />
          </mesh>
          <mesh position={[0.22, -0.14, 0]} rotation={[0, 0, 0.22]} material={matSuit} castShadow>
            <boxGeometry args={[0.095, 0.26, 0.095]} />
          </mesh>
          <mesh position={[0.27, -0.26, 0]} material={matBlackRubber()}>
            <boxGeometry args={[0.15, 0.065, 0.095]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.27, 0]} rotation={[0, 0, isCmd ? -0.05 : -0.18]} material={matVest} castShadow>
        <boxGeometry args={[0.21, 0.36, 0.29]} />
      </mesh>
      <group position={[isCmd ? 0.03 : 0.08, 0.54, 0]}>
        <mesh material={matSkin} castShadow>
          <sphereGeometry args={[0.092, 16, 14]} />
        </mesh>
        <mesh position={[-0.01, 0.02, 0]} material={matHelmet} castShadow>
          <sphereGeometry args={[0.112, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
        </mesh>
        {[-0.102, 0.102].map((zEar, i) => (
          <mesh key={i} position={[-0.01, -0.01, zEar]} material={matBlackRubber()}>
            <cylinderGeometry args={[0.044, 0.044, 0.03, 12]} />
          </mesh>
        ))}
        <mesh position={[0.08, -0.03, 0.04]} material={matDarkSteel()}>
          <boxGeometry args={[0.08, 0.032, 0.14]} />
        </mesh>
      </group>
      {[-0.135, 0.135].map((zArm, i) => (
        <group
          key={i}
          position={[0.05, 0.39, zArm]}
          rotation={[gripAngle * (i === 0 ? 0.22 : -0.22), 0, isCmd ? -0.34 : -0.46]}
        >
          <mesh position={[0.13, 0, 0]} material={matSuit} castShadow>
            <boxGeometry args={[0.27, 0.082, 0.082]} />
          </mesh>
          <mesh position={[0.27, 0.03, i === 0 ? 0.02 : -0.02]} material={matBlackRubber()}>
            <sphereGeometry args={[0.046, 10, 10]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// ---------- Lính nạp đạn xoay người bê đạn 120mm + tì đầu gối lên Knee Switch ----------
const LoaderCrewFigure: React.FC<{ phase: number }> = ({ phase }) => {
  const p = clamp01(phase);
  const matSuit = plain('#6d7458', 0.82, 0.05);
  const matVest = plain('#3a4236', 0.78, 0.1);
  const matSkin = plain('#d7a982', 0.68, 0.04);
  const matHelmet = plain('#2f372e', 0.52, 0.18);

  const torsoYaw = lerp(-2.1, -0.32, p);
  const shellPitch = lerp(0.16, -0.04, p);
  const kneePress = Math.sin(Math.min(1, p * 2.2) * Math.PI) * 0.07;

  return (
    <group position={[-0.3, 0.16, -0.58]}>
      {/* Chân phải trụ */}
      <group position={[0.07, 0, 0.12]}>
        <mesh position={[0, 0.22, 0]} material={matSuit} castShadow>
          <boxGeometry args={[0.11, 0.42, 0.11]} />
        </mesh>
        <mesh position={[0.03, 0.035, 0]} material={matBlackRubber()}>
          <boxGeometry args={[0.18, 0.07, 0.11]} />
        </mesh>
      </group>
      {/* Chân trái khuỵu gối sát tấm công tắc đầu gối vàng-đen */}
      <group position={[-0.04, 0, -0.14]}>
        <mesh position={[0, 0.21, -0.06 - kneePress * 0.5]} rotation={[0.28, 0, 0]} material={matSuit} castShadow>
          <boxGeometry args={[0.11, 0.4, 0.11]} />
        </mesh>
        <mesh position={[0, 0.43, -0.14 - kneePress]} rotation={[-0.28, 0, 0]} material={matSuit} castShadow>
          <boxGeometry args={[0.115, 0.28, 0.115]} />
        </mesh>
        <mesh position={[0.02, 0.035, 0.02]} material={matBlackRubber()}>
          <boxGeometry args={[0.18, 0.07, 0.11]} />
        </mesh>
      </group>

      {/* Thân trên xoay người bê viên đạn 120mm */}
      <group position={[0, 0.54, -0.02]} rotation={[0, torsoYaw, 0]}>
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, -0.1]} material={matVest} castShadow>
          <boxGeometry args={[0.23, 0.4, 0.32]} />
        </mesh>
        <group position={[0.04, 0.51, 0]}>
          <mesh material={matSkin} castShadow>
            <sphereGeometry args={[0.095, 16, 14]} />
          </mesh>
          <mesh position={[-0.01, 0.02, 0]} material={matHelmet} castShadow>
            <sphereGeometry args={[0.114, 18, 14, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
          </mesh>
          {[-0.105, 0.105].map((zEar, i) => (
            <mesh key={i} position={[-0.01, -0.01, zEar]} material={matBlackRubber()}>
              <cylinderGeometry args={[0.044, 0.044, 0.03, 12]} />
            </mesh>
          ))}
        </group>

        {[-0.17, 0.17].map((zArm, i) => (
          <mesh
            key={i}
            position={[0.16, 0.22, zArm]}
            rotation={[0, i === 0 ? 0.18 : -0.18, -0.35]}
            material={matSuit}
            castShadow
          >
            <boxGeometry args={[0.3, 0.09, 0.09]} />
          </mesh>
        ))}

        {/* Viên đạn 120mm M829A4 dài ~1m màu kem + đế thép + mũi DU */}
        <group position={[0.28, 0.17, 0.02]} rotation={[0, 0.32, shellPitch]}>
          <mesh position={[-0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matChrome()} castShadow>
            <cylinderGeometry args={[0.078, 0.078, 0.042, 20]} />
          </mesh>
          <mesh position={[-0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matPropellant()} castShadow>
            <cylinderGeometry args={[0.058, 0.06, 0.64, 20]} />
          </mesh>
          <mesh position={[-0.12, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matBlackRubber()}>
            <cylinderGeometry args={[0.061, 0.061, 0.05, 18]} />
          </mesh>
          <mesh
            position={[0.28, 0, 0]}
            geometry={lathe(
              [
                [0.058, 0],
                [0.046, 0.09],
                [0.022, 0.22],
              ],
              18
            )}
            material={matSabot()}
            castShadow
          />
          <mesh
            position={[0.5, 0, 0]}
            geometry={lathe(
              [
                [0.014, 0],
                [0.01, 0.1],
                [0.002, 0.15],
              ],
              12
            )}
            material={matDuTip()}
          />
        </group>
      </group>
    </group>
  );
};

export const TurretInterior3D: React.FC<TurretInterior3DProps> = ({
  mirrorTilt = [0, 0],
  gunPitch = 0,
  recoil = 0,
  breechOpen = 0,
  puckDrop = 0,
  cadillacTurn = 0,
  blastDoorOpen = 0.35,
  blowoutOpen = 0,
  loaderPhase = 0.3,
  halonSpray = 0,
  showCrew = true,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const rec = clamp01(recoil);
  const brOpen = clamp01(breechOpen);
  const pkDrop = clamp01(puckDrop);
  const doorOpen = clamp01(blastDoorOpen);
  const blowOpen = clamp01(blowoutOpen);
  const spray = clamp01(halonSpray);

  // Quỹ đạo rơi parabol của đế kim loại gạt tàn xuống sàn giỏ
  const puckX = lerp(-0.04, -0.36, pkDrop);
  const puckY = lerp(1.02, 0.2, pkDrop * pkDrop);
  const puckRotZ = pkDrop * 2.4;

  const floorRivets = useMemo<[number, number, number][]>(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const a = (i / 20) * Math.PI * 2;
        return [0.06 + Math.cos(a) * 1.01, 0.165, Math.sin(a) * 1.01];
      }),
    []
  );

  return (
    <group position={position} rotation={rotation}>
      {/* ==================== 1. GIỎ THÁP PHÁO (TURRET BASKET) & KHUNG ỐNG THÉP (`pipe`) ==================== */}
      <group>
        <mesh position={[0.06, 0.14, 0]} material={matInteriorWall()} castShadow receiveShadow>
          <cylinderGeometry args={[1.08, 1.05, 0.05, 44]} />
        </mesh>
        <mesh position={[0.06, 0.11, 0]} material={matDarkSteel()} receiveShadow>
          <cylinderGeometry args={[1.04, 0.98, 0.025, 36]} />
        </mesh>
        <Rivets points={floorRivets} r={0.015} color="#586470" />

        {/* Cổ góp điện-thuỷ lực tâm sàn giỏ */}
        <mesh position={[0.06, 0.2, 0]} material={matMidSteel()} castShadow>
          <cylinderGeometry args={[0.2, 0.23, 0.1, 24]} />
        </mesh>
        <mesh position={[0.06, 0.27, 0]} material={matBrass()} castShadow>
          <cylinderGeometry args={[0.125, 0.125, 0.06, 20]} />
        </mesh>
        {HYDRAULIC_SLIP_PIPES.map((g, i) => (
          <mesh key={i} geometry={g} material={matMidSteel()} castShadow />
        ))}

        {/* Khay cao su hứng đế đạn kim loại ("gạt tàn") dưới khoá nòng */}
        <group position={[-0.35, 0.175, -0.02]}>
          <mesh material={matBlackRubber()} castShadow receiveShadow>
            <boxGeometry args={[0.4, 0.05, 0.44]} />
          </mesh>
          <mesh position={[0.07, 0.036, -0.09]} rotation={[0.1, 0.3, Math.PI / 2]} geometry={PUCK_GEO} material={matChrome()} castShadow />
          <mesh position={[-0.08, 0.036, 0.09]} rotation={[-0.12, 0.8, Math.PI / 2]} geometry={PUCK_GEO} material={matMidSteel()} castShadow />
        </group>

        {BASKET_STANCHIONS.map((g, i) => (
          <mesh key={i} geometry={g} material={i === 2 ? matYellow() : matDarkSteel()} castShadow />
        ))}
        <mesh geometry={BASKET_RAIL_LOW} material={matDarkSteel()} castShadow />
        <mesh geometry={BASKET_RAIL_HIGH} material={matYellow()} castShadow />

        {/* Vành ổ bi & bánh răng xoay tháp pháo (Turret Ring) ở y = 0.85 */}
        <mesh position={[0.06, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} material={matGunCradle()} castShadow>
          <torusGeometry args={[1.16, 0.052, 14, 48]} />
        </mesh>
      </group>

      {/* ==================== 2. VỎ GIÁP THÁP PHÁO CẮT BỔ & SANDWICH GIÁP CHOBHAM ==================== */}
      <group>
        {/* Sàn sườn bên trái & sàn khoang đạn đuôi Bustle */}
        <mesh position={[-0.1, 0.86, -1.28]} geometry={rbox(1.94, 0.055, 0.5, 0.015)} material={matArmorExt()} castShadow receiveShadow />
        <mesh position={[1.52, 0.86, 0.96]} geometry={rbox(1.24, 0.055, 1.02, 0.015)} material={matArmorExt()} castShadow receiveShadow />
        <mesh position={[-1.78, 0.86, 0]} geometry={rbox(1.54, 0.06, 2.94, 0.02)} material={matArmorExt()} castShadow receiveShadow />

        {/* MÁ GIÁP TRƯỚC BÊN TRÁI VÁT CHỮ V CHUẨN M1A2 + SANDWICH CHOBHAM LỘ Ở VÁCH TRONG */}
        <mesh position={[0, 0, -0.94]} geometry={LEFT_CHEEK_GEO} material={matArmorExt()} castShadow receiveShadow />
        <group position={[1.52, 1.24, -0.49]} rotation={[0, -0.2, 0]}>
          <ChobhamCutawayLayers position={[0, 0, 0]} width={0.42} />
        </group>

        {/* MÁ GIÁP TRƯỚC BÊN PHẢI CẮT NGANG THẤP (y = 1.11) LỘ TRỌN MẶT CẮT SANDWICH CHOBHAM 7 LỚP! */}
        <mesh position={[0, 0, 0.96]} geometry={RIGHT_CHEEK_BASE_GEO} material={matArmorExt()} castShadow receiveShadow />
        <mesh position={[1.56, 1.115, 0.96]} material={matCutEdge()}>
          <boxGeometry args={[1.24, 0.018, 0.96]} />
        </mesh>
        <group position={[1.56, 1.02, 0.96]} rotation={[0, 0.14, 0]}>
          <ChobhamCutawayLayers position={[0, 0, 0]} width={0.86} />
        </group>

        {/* Khiên chắn pháo vát góc chuẩn Abrams (Gun Mantlet) + Súng đồng trục M240 */}
        <mesh geometry={MANTLET_WEDGE_GEO} material={matArmorExt()} castShadow />
        <mesh position={[2.22, 1.24, -0.3]} rotation={[0, 0, Math.PI / 2]} material={matDarkSteel()} castShadow>
          <cylinderGeometry args={[0.022, 0.024, 0.62, 12]} />
        </mesh>

        {/* Vách bên trái tháp pháo cắt mở cửa sổ rộng để góc cao-trái nhìn rõ trọn người nạp đạn & khoá nòng */}
        <mesh position={[0.66, 1.31, -1.44]} geometry={rbox(0.38, 0.9, 0.14, 0.02)} material={matArmorExt()} castShadow />
        <mesh position={[-0.22, 1.04, -1.44]} geometry={rbox(1.4, 0.36, 0.14, 0.015)} material={matArmorExt()} castShadow />
        <mesh position={[-0.22, 1.18, -1.35]} material={matInteriorWall()}>
          <boxGeometry args={[1.65, 0.58, 0.038]} />
        </mesh>
        <mesh position={[-0.22, 1.225, -1.44]} material={matCutEdge()}>
          <boxGeometry args={[1.38, 0.02, 0.145]} />
        </mesh>
        <mesh position={[-0.96, 1.32, -1.44]} geometry={rbox(0.28, 0.92, 0.14, 0.02)} material={matArmorExt()} castShadow />

        {/* Cầu nóc tháp pháo thu gọn dọc trục giữa (mở thoáng hoàn toàn phía trên khoá nòng M256, người nạp đạn & công tắc đầu gối!) */}
        <mesh position={[-0.52, 1.77, -0.02]} geometry={rbox(1.02, 0.07, 0.44, 0.02)} material={matArmorExt()} castShadow />
        <mesh position={[-0.52, 1.77, -0.245]} material={matCutEdge()}>
          <boxGeometry args={[1.0, 0.072, 0.022]} />
        </mesh>
        <mesh position={[-0.01, 1.77, -0.02]} material={matCutEdge()}>
          <boxGeometry args={[0.022, 0.072, 0.43]} />
        </mesh>
        {/* Nhánh cầu nóc sau đỡ vòm kính trưởng xe & trụ CITV */}
        <mesh position={[-0.42, 1.77, 0.48]} geometry={rbox(0.72, 0.07, 0.68, 0.02)} material={matArmorExt()} castShadow />
        {/* Vành cửa nắp người nạp đạn gá bên trái sống nóc */}
        <mesh position={[-0.64, 1.82, -0.18]} material={matMidSteel()} castShadow>
          <cylinderGeometry args={[0.22, 0.24, 0.055, 24]} />
        </mesh>
      </group>

      {/* ==================== 3. CỤM KHOÁ NÒNG PHÁO CHÍNH 120MM M256 ==================== */}
      <group position={[1.12, 1.22, 0]} rotation={[0, 0, gunPitch]}>
        {/* Trục ngỗng pháo & máng đỡ cố định */}
        <mesh rotation={[Math.PI / 2, 0, 0]} material={matGunCradle()} castShadow>
          <cylinderGeometry args={[0.115, 0.115, 0.84, 24]} />
        </mesh>
        <mesh position={[-0.24, -0.15, 0]} geometry={rbox(1.16, 0.15, 0.54, 0.025)} material={matGunCradle()} castShadow />

        {/* Tấm chắn bảo vệ chống giật bên trái khoá nòng (sọc an toàn vàng-thép) */}
        <mesh position={[-0.82, 0.02, -0.29]} geometry={rbox(1.22, 0.44, 0.036, 0.01)} material={matYellow()} castShadow />
        <mesh position={[-0.82, -0.2, -0.14]} geometry={rbox(1.18, 0.04, 0.32, 0.01)} material={matDarkSteel()} />

        {/* 2 xi-lanh thuỷ lực hãm giật cỡ lớn nằm nổi bật phía trên giá pháo */}
        {[-0.2, 0.2].map((zOff, i) => (
          <group key={i} position={[-0.08, 0.27, zOff]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={matGunCradle()} castShadow>
              <cylinderGeometry args={[0.078, 0.078, 0.9, 22]} />
            </mesh>
            <mesh position={[-0.44, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matBrass()}>
              <cylinderGeometry args={[0.084, 0.084, 0.045, 22]} />
            </mesh>
          </group>
        ))}

        {/* KHỐI PHÁO GIẬT LÙI THEO `recoil` (0..1 -> lùi -0.32 m) */}
        <group position={[-0.32 * rec, 0, 0]}>
          {/* Gốc nòng pháo 120mm M256 + Bầu hút khói (vươn tới x ~ +2.96 m) */}
          <mesh geometry={BARREL_STUB_GEO} material={matArmorExt()} castShadow receiveShadow />
          <mesh position={[-0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matBreechAlloy()} castShadow>
            <cylinderGeometry args={[0.18, 0.17, 0.56, 28]} />
          </mesh>

          {/* 2 ty ben thuỷ lực mạ crôm sáng bóng nối trực tiếp vào tai trên khoá nòng */}
          {[-0.2, 0.2].map((zOff, i) => (
            <mesh key={i} position={[-0.64, 0.27, zOff]} rotation={[0, 0, Math.PI / 2]} material={matChrome()} castShadow>
              <cylinderGeometry args={[0.048, 0.048, 0.66, 18]} />
            </mesh>
          ))}

          {/* KHỐI THÉP KHOÁ NÒNG VUÔNG VỨC NẶNG NỀ (M256 Forged Breech Ring — hợp kim thép sáng tương phản cao!) */}
          <mesh position={[-0.78, 0.22, 0]} geometry={rbox(0.78, 0.14, 0.52, 0.022)} material={matBreechAlloy()} castShadow />
          <mesh position={[-0.58, -0.24, 0]} geometry={rbox(0.4, 0.1, 0.52, 0.022)} material={matBreechAlloy()} castShadow />
          {[-0.2, 0.2].map((zSide, i) => (
            <mesh key={i} position={[-0.78, -0.01, zSide]} geometry={rbox(0.78, 0.38, 0.12, 0.022)} material={matBreechAlloy()} castShadow />
          ))}
          {/* Lòng buồng đạn 120mm mạ crôm */}
          <mesh position={[-0.38, 0, 0]} geometry={CHAMBER_BORE_GEO} material={matChrome()} />

          {/* KHỐI TRƯỢT ĐỨNG KHOÁ NÒNG (Vertical Sliding Breech Block) mở xuống theo `breechOpen` */}
          <group position={[-0.86, -0.01 - 0.26 * brOpen, 0]}>
            <mesh geometry={rbox(0.28, 0.36, 0.27, 0.018)} material={matChrome()} castShadow />
            <mesh position={[-0.145, 0.03, 0]} material={matDarkSteel()}>
              <boxGeometry args={[0.02, 0.17, 0.17]} />
            </mesh>
          </group>

          {/* Tay đòn mở khoá nòng bên phải */}
          <group position={[-0.88, 0.08, 0.28]} rotation={[0, 0, -brOpen * 0.95]}>
            <mesh position={[-0.12, 0.1, 0]} rotation={[0, 0, -0.65]} material={matChrome()} castShadow>
              <cylinderGeometry args={[0.022, 0.022, 0.34, 12]} />
            </mesh>
            <mesh position={[-0.22, 0.22, 0.03]} material={matRedHalon()}>
              <sphereGeometry args={[0.038, 12, 12]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Đế đạn kim loại ("gạt tàn") văng rơi xuống sàn theo `puckDrop` (0..1) */}
      <mesh
        position={[puckX, puckY, 0]}
        rotation={[0.18 * pkDrop, 0.35 * pkDrop, puckRotZ]}
        geometry={PUCK_GEO}
        material={matChrome()}
        castShadow
      />

      {/* ==================== 4. PHÁO THỦ, TAY CẦM CADILLAC, GƯƠNG CON QUAY GPS & TRƯỞNG XE CITV ==================== */}
      <group>
        {/* Ghế Pháo thủ (dịch ra trước-ngoài một chút x = +0.54, z = +0.72 để mở thoáng tầm nhìn ngang vào khoá nòng M256!) */}
        <group position={[0.54, 0.34, 0.72]}>
          <mesh position={[0, -0.09, 0]} material={matDarkSteel()} castShadow>
            <cylinderGeometry args={[0.06, 0.09, 0.2, 14]} />
          </mesh>
          <mesh position={[0.04, 0.03, 0]} geometry={rbox(0.4, 0.08, 0.38, 0.02)} material={matBlackRubber()} castShadow />
          <mesh position={[-0.16, 0.26, 0]} rotation={[0, 0, 0.2]} geometry={rbox(0.08, 0.46, 0.36, 0.02)} material={matBlackRubber()} castShadow />
        </group>

        {/* Bảng điều khiển hoả lực & Màn hình ngắm nhiệt FLIR phát sáng hổ phách (xoay nghiêng ra mặt cắt để nổi rõ!) */}
        <group position={[1.08, 1.08, 0.72]} rotation={[0, 0.38, 0]}>
          <mesh geometry={rbox(0.28, 0.34, 0.42, 0.02)} material={matMidSteel()} castShadow />
          {/* Màn hình ngắm nhiệt chính hướng về pháo thủ & lộ rõ từ góc ngang / 3/4 */}
          <group position={[-0.145, 0.04, 0.02]} rotation={[0, 0.18, -0.12]}>
            <mesh geometry={rbox(0.038, 0.23, 0.3, 0.01)} material={matDarkSteel()} />
            <mesh position={[-0.021, 0, 0]} material={matAmberScreen()}>
              <boxGeometry args={[0.008, 0.18, 0.25]} />
            </mesh>
            <mesh position={[-0.026, 0, 0]} material={matAmberHot()}>
              <boxGeometry args={[0.004, 0.13, 0.008]} />
            </mesh>
            <mesh position={[-0.026, 0, 0]} material={matAmberHot()}>
              <boxGeometry args={[0.004, 0.008, 0.16]} />
            </mesh>
          </group>
          {/* Màn hình thông số đường đạn phụ ở mặt hông cắt bổ (+Z) để góc trước-phải cũng thấy ánh sáng hổ phách! */}
          <mesh position={[0.02, 0.05, 0.212]} material={matAmberScreen()}>
            <boxGeometry args={[0.18, 0.14, 0.008]} />
          </mesh>
        </group>

        {/* TAY CẦM ĐÔI ĐIỀU KHIỂN HOẢ LỰC KIỂU "CADILLACS" xoay theo `cadillacTurn` */}
        <group position={[0.86, 0.96, 0.72]} rotation={[0, 0.28, 0]}>
          <mesh position={[0.1, -0.02, 0]} rotation={[0, 0, 0.3]} material={matMidSteel()} castShadow>
            <cylinderGeometry args={[0.032, 0.038, 0.24, 14]} />
          </mesh>
          <group rotation={[cadillacTurn * 0.58, 0, 0]}>
            {/* Càng chữ U đôi màu vàng-thép đặc trưng Cadillac */}
            <mesh rotation={[Math.PI / 2, 0, 0]} material={matChrome()} castShadow>
              <cylinderGeometry args={[0.026, 0.026, 0.34, 14]} />
            </mesh>
            <mesh geometry={rbox(0.07, 0.07, 0.11, 0.012)} material={matYellow()} castShadow />
            {[-0.15, 0.15].map((zGrip, i) => (
              <group key={i} position={[-0.02, 0.07, zGrip]}>
                <mesh rotation={[0, 0, -0.22]} material={matBlackRubber()} castShadow>
                  <cylinderGeometry args={[0.026, 0.03, 0.17, 12]} />
                </mesh>
                <mesh position={[0.028, 0.058, 0]} material={matRedHalon()}>
                  <sphereGeometry args={[0.021, 10, 10]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>

        {/* Ống dẫn tia ngắm nối thị kính pháo thủ lên hộp gương GPS */}
        <mesh position={[1.08, 1.36, 0.68]} material={matMidSteel()} castShadow>
          <cylinderGeometry args={[0.07, 0.08, 0.32, 18]} />
        </mesh>

        {/* HỘP QUANG HỌC GPS MỞ NẮP CẮT BỔ: 2 VÒNG GIMBAL CON QUAY HỒI CHUYỂN + TẤM GƯƠNG PHẲNG BÓNG LOÁNG! */}
        <group position={[1.08, 1.72, 0.68]}>
          {/* Khung đáy, vách trái & cửa kính trước (mở trống mặt phải +Z, nóc +Y và nửa lưng sau để gương nổi bật rực rỡ!) */}
          <mesh position={[0, -0.21, 0]} geometry={rbox(0.58, 0.048, 0.48, 0.012)} material={matArmorExt()} castShadow />
          <mesh position={[0, 0.02, -0.22]} geometry={rbox(0.58, 0.42, 0.048, 0.012)} material={matArmorExt()} castShadow />
          <mesh position={[-0.27, -0.06, -0.08]} geometry={rbox(0.048, 0.26, 0.3, 0.012)} material={matArmorExt()} castShadow />
          {/* Viền đỏ mặt cắt kỹ thuật hộp GPS */}
          <mesh position={[0, 0.23, -0.22]} material={matCutEdge()}>
            <boxGeometry args={[0.57, 0.016, 0.052]} />
          </mesh>
          <mesh position={[0, -0.21, 0.235]} material={matCutEdge()}>
            <boxGeometry args={[0.57, 0.05, 0.016]} />
          </mesh>
          {/* Cửa kính quang học GPS hướng +X (khung viền mảnh cắt bổ để không che khuất gương từ góc 3/4 trước!) */}
          <mesh position={[0.26, -0.14, -0.02]} material={matDarkSteel()} castShadow>
            <boxGeometry args={[0.045, 0.06, 0.34]} />
          </mesh>
          <mesh position={[0.26, 0.02, -0.17]} material={matDarkSteel()} castShadow>
            <boxGeometry args={[0.045, 0.32, 0.06]} />
          </mesh>
          <mesh position={[0.27, 0.02, -0.02]}>
            <boxGeometry args={[0.012, 0.24, 0.26]} />
            <meshStandardMaterial
              color="#58f5e6"
              emissive="#1ad1c2"
              emissiveIntensity={0.45}
              transparent
              opacity={0.32}
              roughness={0.08}
            />
          </mesh>

          {/* 2 VÒNG GIMBAL CON QUAY HỒI CHUYỂN + TẤM GƯƠNG PHẲNG PHẢN XẠ NGHIÊNG BÙ GÓC `mirrorTilt` */}
          <group position={[-0.01, 0.02, 0.02]}>
            <mesh position={[0, -0.15, 0]} material={matDarkSteel()}>
              <cylinderGeometry args={[0.032, 0.042, 0.1, 14]} />
            </mesh>
            {/* Vòng gimbal ngoài (Pitch) */}
            <group rotation={[0, 0, mirrorTilt[0]]}>
              <mesh rotation={[0, Math.PI / 2, 0]} material={matBrass()} castShadow>
                <torusGeometry args={[0.178, 0.018, 14, 36]} />
              </mesh>
              <mesh position={[0, 0.178, 0]} material={matCyanOptic()}>
                <cylinderGeometry args={[0.038, 0.038, 0.048, 16]} />
              </mesh>

              {/* Vòng gimbal trong (Roll) */}
              <group rotation={[mirrorTilt[1], 0, 0]}>
                <mesh material={matCyanOptic()} castShadow>
                  <torusGeometry args={[0.14, 0.016, 14, 32]} />
                </mesh>
                <mesh position={[0, 0, 0.14]} rotation={[Math.PI / 2, 0, 0]} material={matBrass()}>
                  <cylinderGeometry args={[0.034, 0.034, 0.044, 16]} />
                </mesh>

                {/* TẤM GƯƠNG PHẲNG PHẢN XẠ BÓNG LOÁNG (lộ rõ mặt phẳng gương chữ nhật sáng rực từ cả góc trước & ngang!) */}
                <group rotation={[0.55, 0.42, 0.52]}>
                  <mesh geometry={rbox(0.22, 0.02, 0.165, 0.005)} material={matDarkSteel()} castShadow />
                  <mesh position={[0, 0.012, 0]} material={matMirror()}>
                    <boxGeometry args={[0.202, 0.008, 0.148]} />
                  </mesh>
                  {/* Vệt phản quang sáng chéo trên mặt gương phẳng */}
                  <mesh position={[0.02, 0.017, 0]} rotation={[0, 0.45, 0]} material={matChrome()}>
                    <boxGeometry args={[0.16, 0.003, 0.024]} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>

        {/* Ghế Trưởng xe ngồi cao phía sau pháo thủ (x = -0.46, z = +0.74) */}
        <group position={[-0.46, 0.72, 0.74]}>
          <mesh position={[0, -0.28, 0]} material={matDarkSteel()} castShadow>
            <cylinderGeometry args={[0.065, 0.1, 0.54, 14]} />
          </mesh>
          <mesh position={[0.03, 0.02, 0]} geometry={rbox(0.38, 0.08, 0.38, 0.02)} material={matBlackRubber()} castShadow />
          <mesh position={[-0.15, 0.27, 0]} rotation={[0, 0, 0.14]} geometry={rbox(0.08, 0.44, 0.36, 0.02)} material={matBlackRubber()} castShadow />
        </group>
        {/* Màn hình ảnh nhiệt CITV trước mặt trưởng xe */}
        <group position={[-0.04, 1.32, 0.74]} rotation={[0, 0.34, -0.1]}>
          <mesh geometry={rbox(0.14, 0.24, 0.28, 0.015)} material={matMidSteel()} castShadow />
          <mesh position={[-0.072, 0, 0]} material={matAmberScreen()}>
            <boxGeometry args={[0.008, 0.18, 0.22]} />
          </mesh>
        </group>

        {/* TRỤ KÍNH TIỀM VỌNG NHIỆT 360° CITV & VÒM KÍNH TRƯỞNG XE PHÍA TRÊN GHẾ TRƯỞNG XE */}
        <group position={[-0.36, 1.81, 0.58]}>
          <mesh material={matArmorExt()} castShadow>
            <cylinderGeometry args={[0.3, 0.33, 0.085, 24]} />
          </mesh>
          {Array.from({ length: 6 }, (_, i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.25, 0.055, Math.sin(a) * 0.25]}
                rotation={[0, -a, 0]}
                material={matCyanOptic()}
              >
                <boxGeometry args={[0.05, 0.058, 0.088]} />
              </mesh>
            );
          })}
          <group position={[0.1, 0.18, -0.06]}>
            <mesh position={[0, -0.08, 0]} material={matMidSteel()} castShadow>
              <cylinderGeometry args={[0.155, 0.185, 0.12, 24]} />
            </mesh>
            <mesh position={[0, 0.06, 0]} material={matArmorExt()} castShadow>
              <cylinderGeometry args={[0.175, 0.175, 0.22, 24]} />
            </mesh>
            <mesh position={[0.14, 0.06, 0]} material={matDarkSteel()} castShadow>
              <boxGeometry args={[0.1, 0.16, 0.2]} />
            </mesh>
            <mesh position={[0.192, 0.06, 0]} material={matCyanOptic()}>
              <boxGeometry args={[0.012, 0.12, 0.15]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* ==================== 5. CÔNG TẮC ĐẦU GỐI, BÌNH HALON & KHOANG ĐẠN ĐUÔI BUSTLE 36 VIÊN ==================== */}
      <group>
        {/* CÔNG TẮC ĐẦU GỐI (KNEE SWITCH) MÀU VÀNG-ĐEN NỔI BẬT + ỐNG DẪN LÊN XI-LANH CỬA CHỐNG NỔ */}
        <group position={[-0.34, 0.62, -0.94]} rotation={[-0.18, 0.15, 0]}>
          <mesh position={[0, 0, -0.055]} geometry={rbox(0.36, 0.24, 0.06, 0.012)} material={matDarkSteel()} castShadow />
          <mesh position={[0, 0, 0.008]} geometry={rbox(0.32, 0.2, 0.05, 0.01)} material={matYellow()} castShadow />
          {[-0.095, 0, 0.095].map((xStripe, i) => (
            <mesh key={i} position={[xStripe, 0, 0.032]} rotation={[0, 0, 0.28]} material={matBlackRubber()}>
              <boxGeometry args={[0.04, 0.18, 0.01]} />
            </mesh>
          ))}
        </group>
        <mesh geometry={KNEE_TO_BLASTDOOR_PIPE} material={matYellow()} castShadow />

        {/* BÌNH CỨU HOẢ ĐỎ HALON & ĐẦU PHUN DẬP LỬA QUANG HỌC (`halonSpray`) */}
        <group>
          {[-0.64, -0.82].map((xBot, i) => (
            <group key={i} position={[xBot, 1.08, -1.27]}>
              <mesh material={matRedHalon()} castShadow>
                <cylinderGeometry args={[0.068, 0.068, 0.34, 18]} />
              </mesh>
              <mesh position={[0, 0.18, 0]} material={matRedHalon()}>
                <sphereGeometry args={[0.068, 16, 12]} />
              </mesh>
              <mesh position={[0, 0.25, 0]} material={matBrass()}>
                <cylinderGeometry args={[0.022, 0.026, 0.055, 12]} />
              </mesh>
              <mesh position={[0, 0.02, 0]} material={matDarkSteel()}>
                <cylinderGeometry args={[0.073, 0.073, 0.04, 18]} />
              </mesh>
            </group>
          ))}
          <mesh geometry={HALON_MANIFOLD_PIPE} material={matChrome()} castShadow />
          {[-0.36, 0.24].map((xNoz, i) => (
            <mesh key={i} position={[xNoz, 1.36, -1.21]} rotation={[Math.PI / 2, 0, 0]} material={matBrass()}>
              <coneGeometry args={[0.035, 0.06, 14]} />
            </mesh>
          ))}
          <group position={[-0.08, 1.4, -1.28]}>
            <mesh material={matDarkSteel()}>
              <boxGeometry args={[0.085, 0.085, 0.06]} />
            </mesh>
            <mesh position={[0, 0, 0.035]} material={matRedHalon()}>
              <sphereGeometry args={[0.025, 12, 12]} />
            </mesh>
          </group>

          {spray > 0.001 && (
            <group>
              <mesh position={[-0.25, 1.12, -0.52]} scale={[1.35 * spray, 0.95 * spray, 1.25 * spray]}>
                <sphereGeometry args={[0.85, 22, 18]} />
                <meshStandardMaterial
                  color="#d9fbff"
                  emissive="#6ce8f5"
                  emissiveIntensity={0.28}
                  transparent
                  opacity={0.26 * spray}
                  depthWrite={false}
                />
              </mesh>
              <mesh position={[0.2, 1.05, -0.1]} scale={[1.15 * spray, 0.85 * spray, 1.15 * spray]}>
                <sphereGeometry args={[0.72, 20, 16]} />
                <meshStandardMaterial
                  color="#eaffff"
                  emissive="#8ff2ff"
                  emissiveIntensity={0.22}
                  transparent
                  opacity={0.2 * spray}
                  depthWrite={false}
                />
              </mesh>
            </group>
          )}
        </group>

        {/* VÁCH NGĂN BỌC THÉP & CỬA CHỐNG NỔ THUỶ LỰC TRƯỢT NGANG (`blastDoorOpen`, mặc định 0.35!) */}
        <group position={[-1.02, 0, 0]}>
          <mesh position={[0, 0.92, 0]} geometry={rbox(0.08, 0.1, 2.88, 0.01)} material={matInteriorWall()} castShadow />
          <mesh position={[0, 1.69, 0]} geometry={rbox(0.09, 0.14, 2.88, 0.01)} material={matInteriorWall()} castShadow />
          <mesh position={[0, 1.3, -1.32]} geometry={rbox(0.08, 0.72, 0.24, 0.01)} material={matInteriorWall()} castShadow />
          <mesh position={[0, 1.3, 0]} geometry={rbox(0.08, 0.72, 0.16, 0.01)} material={matInteriorWall()} castShadow />
          <mesh position={[0, 1.3, 1.32]} geometry={rbox(0.08, 0.72, 0.24, 0.01)} material={matInteriorWall()} castShadow />

          <mesh position={[0.055, 1.63, 0]} material={matDarkSteel()}>
            <boxGeometry args={[0.05, 0.045, 2.66]} />
          </mesh>
          <mesh position={[0.055, 0.96, 0]} material={matDarkSteel()}>
            <boxGeometry args={[0.05, 0.045, 2.66]} />
          </mesh>

          {/* Xi-lanh thuỷ lực dẫn động cửa chống nổ */}
          <mesh position={[0.09, 1.7, -0.78]} rotation={[Math.PI / 2, 0, 0]} material={matYellow()} castShadow>
            <cylinderGeometry args={[0.038, 0.038, 0.88, 16]} />
          </mesh>
          <mesh
            position={[0.09, 1.7, -0.32 + doorOpen * 0.56]}
            rotation={[Math.PI / 2, 0, 0]}
            material={matChrome()}
            castShadow
          >
            <cylinderGeometry args={[0.022, 0.022, 0.9, 14]} />
          </mesh>

          {/* Cửa chống nổ trượt bên trái */}
          {[0, 1].map((leaf) => {
            const zClosed = -0.92 + leaf * 0.56;
            const zOpen = -0.18 + leaf * 0.12;
            const zCur = lerp(zClosed, zOpen, doorOpen);
            return (
              <group key={`L${leaf}`} position={[0.042 + leaf * 0.022, 1.3, zCur]}>
                <mesh geometry={rbox(0.024, 0.66, 0.6, 0.006)} material={matBreechAlloy()} castShadow />
                {[-0.18, 0, 0.18].map((yRib, rIdx) => (
                  <mesh key={rIdx} position={[0.014, yRib, 0]} material={matGunCradle()}>
                    <boxGeometry args={[0.012, 0.045, 0.54]} />
                  </mesh>
                ))}
                <mesh position={[0.015, 0, -0.27]} material={matYellow()}>
                  <boxGeometry args={[0.012, 0.62, 0.04]} />
                </mesh>
              </group>
            );
          })}

          {/* Cửa chống nổ trượt bên phải */}
          {[0, 1].map((leaf) => {
            const zClosed = 0.92 - leaf * 0.56;
            const zOpen = 0.18 - leaf * 0.12;
            const zCur = lerp(zClosed, zOpen, doorOpen);
            return (
              <group key={`R${leaf}`} position={[0.042 + leaf * 0.022, 1.3, zCur]}>
                <mesh geometry={rbox(0.024, 0.66, 0.6, 0.006)} material={matBreechAlloy()} castShadow />
                {[-0.18, 0, 0.18].map((yRib, rIdx) => (
                  <mesh key={rIdx} position={[0.014, yRib, 0]} material={matGunCradle()}>
                    <boxGeometry args={[0.012, 0.045, 0.54]} />
                  </mesh>
                ))}
                <mesh position={[0.015, 0, 0.27]} material={matYellow()}>
                  <boxGeometry args={[0.012, 0.62, 0.04]} />
                </mesh>
              </group>
            );
          })}
        </group>

        {/* KHOANG ĐẠN ĐUÔI BUSTLE CẮT BỔ, GIÁ TỔ ONG 36 VIÊN ĐẠN 120MM & 2 TẤM XẢ NỔ BLOWOUT */}
        <group>
          <mesh position={[0, 0, -1.44]} geometry={BUSTLE_SIDE_LEFT_LOW} material={matArmorExt()} castShadow />
          <mesh position={[-1.8, 1.69, -1.44]} geometry={rbox(1.52, 0.16, 0.11, 0.01)} material={matArmorExt()} castShadow />
          <mesh position={[-2.48, 1.34, -1.44]} geometry={rbox(0.18, 0.62, 0.11, 0.01)} material={matArmorExt()} castShadow />
          <mesh position={[-1.8, 1.085, -1.44]} material={matCutEdge()}>
            <boxGeometry args={[1.28, 0.018, 0.115]} />
          </mesh>
          {/* Giỏ ống thép chứa đồ bên ngoài sườn trái khoang đuôi đặc trưng M1A2 */}
          {BUSTLE_RACK_PIPES.map((g, i) => (
            <mesh key={i} geometry={g} material={matArmorExt()} castShadow />
          ))}

          {/* Khung đuôi sau cắt bổ */}
          <mesh position={[-2.54, 1.0, 0]} geometry={rbox(0.1, 0.2, 2.94, 0.015)} material={matArmorExt()} castShadow />
          <mesh position={[-2.54, 1.35, -1.16]} geometry={rbox(0.1, 0.6, 0.62, 0.015)} material={matArmorExt()} castShadow />
          <mesh position={[-2.54, 1.69, 0]} geometry={rbox(0.1, 0.16, 2.94, 0.015)} material={matArmorExt()} castShadow />
          <mesh position={[-2.5, 1.35, 1.41]} geometry={rbox(0.14, 0.84, 0.12, 0.015)} material={matArmorExt()} castShadow />
          <mesh position={[-1.8, 1.71, 1.41]} geometry={rbox(1.52, 0.12, 0.1, 0.015)} material={matArmorExt()} castShadow />

          {/* Vách ngăn dọc & vòng cổ giá tổ ong đỡ 36 viên đạn */}
          <mesh position={[-1.52, 1.26, 0]} material={matDarkSteel()}>
            <boxGeometry args={[0.88, 0.72, 0.04]} />
          </mesh>
          <mesh geometry={AMMO_RACK_GEOS.collarsGeo} material={matMidSteel()} castShadow />

          {/* 36 VIÊN ĐẠN 120MM */}
          <mesh geometry={AMMO_RACK_GEOS.basesGeo} material={matChrome()} castShadow />
          <mesh geometry={AMMO_RACK_GEOS.primersGeo} material={matBrass()} />
          <mesh geometry={AMMO_RACK_GEOS.propellantsGeo} material={matPropellant()} castShadow />
          <mesh geometry={AMMO_RACK_GEOS.bandsGeo} material={matBlackRubber()} />
          <mesh geometry={AMMO_RACK_GEOS.sabotsGeo} material={matSabot()} castShadow />
          <mesh geometry={AMMO_RACK_GEOS.duTipsGeo} material={matDuTip()} />
          <mesh geometry={AMMO_RACK_GEOS.ampHeadsGeo} material={matAmpWarhead()} castShadow />

          {/* 2 TẤM XẢ NỔ (BLOWOUT PANELS) BẬT TUNG LÊN TRỜI THEO `blowoutOpen` */}
          <mesh position={[-1.78, 1.77, 0]} geometry={rbox(1.48, 0.05, 0.14, 0.01)} material={matArmorExt()} castShadow />
          {[-1, 1].map((side) => (
            <group
              key={side}
              position={[-1.12, 1.78, side * 0.72]}
              rotation={[side * blowOpen * 0.16, 0, blowOpen * 1.18]}
            >
              <group position={[-0.66, 0.02, 0]}>
                <mesh geometry={rbox(1.3, 0.055, 1.24, 0.015)} material={matArmorExt()} castShadow receiveShadow />
                <mesh position={[0, -0.032, 0]} material={matDarkSteel()}>
                  <boxGeometry args={[1.18, 0.02, 1.12]} />
                </mesh>
                {[-0.36, 0, 0.36].map((xRib, k) => (
                  <mesh key={k} position={[xRib, -0.042, 0]} material={matCutEdge()}>
                    <boxGeometry args={[0.05, 0.018, 1.08]} />
                  </mesh>
                ))}
              </group>
            </group>
          ))}
        </group>
      </group>

      {/* ==================== 6. TỔ LÁI 3 NGƯỜI (`showCrew`) ==================== */}
      {showCrew && (
        <group>
          <TankCrewFigure pose="gunner" position={[0.54, 0.41, 0.72]} gripAngle={cadillacTurn} />
          <TankCrewFigure pose="commander" position={[-0.46, 0.79, 0.74]} />
          <LoaderCrewFigure phase={loaderPhase} />
        </group>
      )}
    </group>
  );
};

export default TurretInterior3D;

export const preview = turntable(TurretInterior3D, { size: 5.8, center: [-0.2, 1.0, 0] });
