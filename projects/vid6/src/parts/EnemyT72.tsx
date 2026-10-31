import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mix } from '@core/time';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets, Track, Wheel } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT_PRESETS } from '../design/palette';

export type EnemyT72Props = {
  turretYaw?: number;
  gunPitch?: number;
  travel?: number;
  turretPopHeight?: number;
  turretPopRot?: [number, number, number];
  damaged?: number;
  showCarousel?: boolean;
  position?: [number, number, number];
  rotation?: [number, number, number];
};

// Kích thước thật T-72M1/B (1:1 mét):
// - Thân chính dài 6.95 m (x = -3.48 .. +3.47); tính từ cụm thùng dầu đuôi (-3.96) tới đầu nòng (+5.57) = 9.53 m
// - Rộng toàn bộ qua diềm cao su chắn bùn = 3.59 m (z = -1.795 .. +1.795)
// - Cao tới nóc vòm tháp đúc = 2.23 m (đế tháp tại y = 1.50, vòm đúc cao 0.73 m)
// - 6 bánh chịu nặng cỡ lớn mỗi bên r = 0.375 m, xích rộng 0.58 m chạm đất tại y = 0

const ROAD_WHEEL_X = [-2.25, -1.36, -0.47, 0.42, 1.31, 2.2];
const RETURN_ROLLER_X = [-1.62, -0.02, 1.56];
const TRACK_Z = 1.395;

// Biên dạng mũi thân trước (glacis nghiêng 68 độ đặc trưng T-72)
const FRONT_HULL_PTS: P2[] = [
  [1.14, 0.45],
  [2.36, 0.45],
  [2.72, 0.56],
  [3.12, 0.72],
  [3.44, 0.86],
  [3.47, 0.91],
  [3.42, 0.96],
  [2.85, 1.13],
  [2.24, 1.31],
  [1.64, 1.49],
  [1.38, 1.52],
  [1.14, 1.52],
];

// Biên dạng khoang động cơ phía sau (vát đuôi cho lộ rõ 2 thùng dầu phụ 200L treo ngoài)
const REAR_HULL_PTS: P2[] = [
  [-3.12, 0.45],
  [-0.82, 0.45],
  [-0.82, 1.52],
  [-1.08, 1.55],
  [-2.96, 1.54],
  [-3.36, 1.5],
  [-3.48, 1.04],
  [-3.38, 0.78],
];

// Biên dạng chắn bùn / sponson dọc sườn (vòm cong mượt ở đầu mũi & đuôi, >= 24 điểm)
const SPONSON_PTS: P2[] = (() => {
  const pts: P2[] = [
    [-3.46, 0.94],
    [-3.35, 0.97],
    [-2.85, 0.98],
    [2.68, 0.98],
  ];
  for (let i = 0; i <= 10; i++) {
    const a = (i / 10) * Math.PI * 0.55;
    pts.push([3.06 + Math.sin(a) * 0.41, 0.82 + Math.cos(a) * 0.16]);
  }
  for (let i = 10; i >= 0; i--) {
    const a = (i / 10) * Math.PI * 0.58;
    pts.push([3.05 + Math.sin(a) * 0.42, 0.91 + Math.cos(a) * 0.22]);
  }
  pts.push(
    [2.62, 1.16],
    [1.62, 1.32],
    [-1.1, 1.32],
    [-2.95, 1.3],
    [-3.36, 1.2],
    [-3.46, 1.04],
  );
  return pts;
})();

// Biên dạng diềm chắn bùn cao su sườn xe (cao vừa phải y = 0.67..1.08 để lộ rõ 6 bánh lớn r = 0.375m, chia 5 tấm có khe ghép)
const SKIRT_PTS: P2[] = [
  [-3.32, 0.75],
  [-3.1, 0.67],
  [-1.92, 0.67],
  [-1.89, 0.88],
  [-1.86, 0.67],
  [-0.68, 0.67],
  [-0.65, 0.88],
  [-0.62, 0.67],
  [0.58, 0.67],
  [0.61, 0.88],
  [0.64, 0.67],
  [1.86, 0.67],
  [1.89, 0.88],
  [1.92, 0.67],
  [2.86, 0.69],
  [3.18, 0.84],
  [3.04, 1.08],
  [2.56, 1.11],
  [1.56, 1.12],
  [-3.2, 1.11],
  [-3.38, 0.97],
];

// Biên dạng vòm tháp pháo đúc "chảo úp" T-72 (28 điểm cong mượt, cao đúng 0.73 m -> nóc 2.23 m)
const TURRET_DOME_PROFILE: P2[] = (() => {
  const pts: P2[] = [
    [0.95, 0.0],
    [1.14, 0.02],
    [1.29, 0.06],
    [1.36, 0.12],
    [1.38, 0.18],
  ];
  const steps = 22;
  for (let i = 1; i <= steps; i++) {
    const u = i / steps;
    const y = 0.18 + u * 0.52;
    const r = 1.38 * Math.pow(1 - Math.pow(u, 1.55), 0.56) * 0.56 + 0.75 * (1 - u * 0.25);
    pts.push([Math.max(0.02, r), y]);
  }
  pts.push([0.42, 0.718], [0.18, 0.728], [0.001, 0.73]);
  return pts;
})();

// Pháo chính 125mm 2A46 dài 4.47 m tính từ trục nâng (x = 1.10 -> đầu nòng x = 5.57; tổng dài cả thùng dầu đuôi -3.96 = 9.53 m)
const GUN_2A46_PROFILE: P2[] = [
  [0.148, 0.0],
  [0.148, 0.42],
  [0.114, 0.48],
  // Ống bọc cách nhiệt đoạn sau
  [0.098, 0.5],
  [0.098, 0.96],
  [0.107, 0.97],
  [0.107, 1.01],
  [0.097, 1.02],
  [0.097, 1.42],
  // Bầu hút khói (bore evacuator) đặc trưng của pháo 125mm 2A46
  [0.118, 1.46],
  [0.158, 1.55],
  [0.16, 2.08],
  [0.118, 2.18],
  // Ống bọc cách nhiệt đoạn trước (3 đai kẹp kim loại sắc nét)
  [0.09, 2.22],
  [0.089, 2.82],
  [0.098, 2.83],
  [0.098, 2.87],
  [0.088, 2.88],
  [0.086, 3.56],
  [0.095, 3.57],
  [0.095, 3.61],
  [0.085, 3.62],
  [0.083, 4.3],
  // Đầu nòng 125mm + đai chuẩn trực
  [0.096, 4.32],
  [0.096, 4.46],
  [0.064, 4.47],
  [0.062, 4.28],
];

// Bao vải bạt chống bụi quanh gốc pháo (mantlet accordion boot)
const MANTLET_BOOT_PROFILE: P2[] = [
  [0.24, 0.0],
  [0.25, 0.08],
  [0.21, 0.14],
  [0.23, 0.21],
  [0.19, 0.28],
  [0.2, 0.35],
  [0.15, 0.43],
  [0.14, 0.49],
];

// Đai gân thùng dầu phụ 200L gắn ngang đuôi xe (dài 0.86 m, r = 0.285 m)
const FUEL_DRUM_PROFILE: P2[] = [
  [0.001, -0.43],
  [0.255, -0.43],
  [0.28, -0.415],
  [0.28, -0.22],
  [0.296, -0.2],
  [0.296, -0.165],
  [0.28, -0.145],
  [0.28, 0.145],
  [0.296, 0.165],
  [0.296, 0.2],
  [0.28, 0.22],
  [0.28, 0.415],
  [0.255, 0.43],
  [0.001, 0.43],
];

// Tấm sàn nóc thân có khoét lỗ tròn r = 0.96 m cho giỏ tháp pháo & khay nạp đạn tự động
const makeTurretDeckGeo = () => {
  const sh = new THREE.Shape([
    new THREE.Vector2(-1.02, -1.06),
    new THREE.Vector2(1.02, -1.06),
    new THREE.Vector2(1.02, 1.06),
    new THREE.Vector2(-1.02, 1.06),
  ]);
  const hole = new THREE.Path();
  const segs = 48;
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.cos(a) * 0.96;
    const y = Math.sin(a) * 0.96;
    if (i === 0) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: 0.08, bevelEnabled: false, curveSegments: 32 });
  g.rotateX(Math.PI / 2);
  return g;
};

let cachedDeckGeo: THREE.BufferGeometry | null = null;
const getTurretDeckGeo = () => {
  if (!cachedDeckGeo) cachedDeckGeo = makeTurretDeckGeo();
  return cachedDeckGeo;
};

// Vòm tháp pháo đúc nguyên khối mượt (64x28 lưới) kèm gò má đúc dày T-72M1 ("Dolly Parton" cheeks) & UV tỉ lệ mét không giãn vân
let cachedDomeGeo: THREE.BufferGeometry | null = null;
const getTurretDomeGeo = () => {
  if (!cachedDomeGeo) {
    const g = new THREE.LatheGeometry(
      TURRET_DOME_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
      64,
    );
    const pos = g.attributes.position as THREE.BufferAttribute;
    const uv = g.attributes.uv as THREE.BufferAttribute;

    for (let i = 0; i < pos.count; i++) {
      let vx = pos.getX(i) * 1.06;
      const vy = pos.getY(i);
      let vz = pos.getZ(i) * 1.01;
      const r0 = Math.hypot(vx, vz);

      if (r0 > 0.02) {
        const nx = vx / r0;
        const nz = vz / r0;
        // Độ nhô má đúc dày hai bên phía trước (+X, ±Z) đặc trưng của T-72M1/B, liền khối 100% không vết cắt
        const fwd = Math.max(0, nx);
        const sideCheek = Math.sin(Math.min(1, Math.abs(nz) * 1.15) * Math.PI * 0.82);
        const heightBand = Math.exp(-Math.pow((vy - 0.31) / 0.24, 2));
        const cheekBulge = 0.16 * Math.pow(fwd, 1.15) * sideCheek * heightBand;
        // Hõm nhẹ chính giữa khe pháo
        const embrasureDip = 0.07 * Math.pow(fwd, 3.0) * Math.exp(-Math.pow(nz / 0.25, 2)) * heightBand;

        const delta = cheekBulge - embrasureDip;
        vx += nx * delta + fwd * 0.05 * heightBand;
        vz += nz * delta;
      }

      pos.setXYZ(i, vx, vy, vz);
      // UV theo đơn vị mét thực giống extrude (đồng bộ hoàn toàn kích thước đốm ngụy trang với thân xe!)
      uv.setXY(i, vx + vy * 0.32, vz - vy * 0.32);
    }

    pos.needsUpdate = true;
    uv.needsUpdate = true;
    g.computeVertexNormals();
    cachedDomeGeo = g;
  }
  return cachedDomeGeo;
};

// Bánh chịu nặng T-72 cỡ lớn (r = 0.375 m) kèm nắp gân dập ngôi sao 6 cánh đặc trưng Liên Xô
const T72RoadWheel: React.FC<{
  x: number;
  side: 1 | -1;
  spin: number;
  rimColor: string;
  tireColor: string;
}> = ({ x, side, spin, rimColor, tireColor }) => {
  const localSpin = side === 1 ? spin : -spin;
  return (
    <group position={[x, 0.425, side * TRACK_Z]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      <Wheel r={0.375} width={0.44} spin={localSpin} rim={rimColor} tire={tireColor} bolts={8} />
      <group rotation={[0, 0, -localSpin]}>
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i / 6) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.165, Math.sin(a) * 0.165, 0.195]}
              rotation={[0, 0, a]}
              geometry={rbox(0.16, 0.046, 0.042, 0.012)}
              material={plain(rimColor, 0.56, 0.36)}
            />
          );
        })}
      </group>
    </group>
  );
};

// Bánh sao chủ động phía sau có răng kéo xích
const T72Sprocket: React.FC<{
  side: 1 | -1;
  spin: number;
  rimColor: string;
}> = ({ side, spin, rimColor }) => {
  const localSpin = side === 1 ? spin : -spin;
  return (
    <group position={[-2.86, 0.515, side * TRACK_Z]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
      <Wheel r={0.285} width={0.4} spin={localSpin} rim={rimColor} tire="#363532" bolts={6} />
      <group rotation={[0, 0, -localSpin]}>
        {Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          return (
            <mesh
              key={i}
              position={[Math.cos(a) * 0.305, Math.sin(a) * 0.305, 0]}
              rotation={[0, 0, a]}
              geometry={rbox(0.06, 0.036, 0.38, 0.008)}
              material={plain('#3c3a35', 0.48, 0.55)}
            />
          );
        })}
      </group>
    </group>
  );
};

// Vòng khay nạp đạn tự động tròn AZ (22 viên đạn 125mm 2 thành phần xếp hướng tâm dưới sàn tháp)
const CarouselAutoloader: React.FC<{ damaged: number }> = ({ damaged }) => {
  const propellantColor = mix('#d99b4e', '#3a281d', damaged * 0.85);
  const projectileColor = mix('#6a735c', '#292927', damaged * 0.85);
  const frameColor = mix('#3a4038', '#1b1918', damaged);
  const brassColor = mix('#c5a049', '#423624', damaged * 0.8);

  return (
    <group position={[0.18, 0.62, 0]}>
      <mesh position={[0, 0.42, 0]} material={plain(mix('#282c28', '#141312', damaged), 0.85, 0.3)}>
        <cylinderGeometry args={[0.965, 0.965, 0.86, 40, 1, true]} />
      </mesh>
      <mesh position={[0, 0.81, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain('#454842', 0.45, 0.65)}>
        <torusGeometry args={[0.95, 0.032, 10, 48]} />
      </mesh>

      <mesh position={[0, 0.04, 0]} material={plain(frameColor, 0.65, 0.45)} receiveShadow>
        <cylinderGeometry args={[0.91, 0.93, 0.07, 40]} />
      </mesh>
      <mesh position={[0, 0.22, 0]} material={plain(frameColor, 0.5, 0.55)} castShadow>
        <cylinderGeometry args={[0.21, 0.25, 0.38, 24]} />
      </mesh>
      <mesh position={[0, 0.43, 0]} material={plain(brassColor, 0.42, 0.65)}>
        <cylinderGeometry args={[0.14, 0.17, 0.06, 20]} />
      </mesh>

      {/* 22 khay cassette đạn 125mm xếp hướng tâm */}
      {Array.from({ length: 22 }, (_, i) => {
        const a = (i / 22) * Math.PI * 2;
        const isApfsds = i % 3 === 0;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh
              position={[0.56, 0.16, 0]}
              geometry={rbox(0.56, 0.22, 0.115, 0.012)}
              material={plain(frameColor, 0.7, 0.4)}
            />
            <mesh
              position={[0.56, 0.11, 0]}
              rotation={[0, 0, Math.PI / 2]}
              material={plain(isApfsds ? '#35393e' : projectileColor, 0.48, 0.55)}
            >
              <cylinderGeometry args={[0.036, 0.054, 0.52, 12]} />
            </mesh>
            <mesh
              position={[0.55, 0.23, 0]}
              rotation={[0, 0, Math.PI / 2]}
              material={plain(propellantColor, 0.72, 0.12)}
              castShadow
            >
              <cylinderGeometry args={[0.054, 0.054, 0.46, 14]} />
            </mesh>
            <mesh
              position={[0.79, 0.23, 0]}
              rotation={[0, 0, Math.PI / 2]}
              material={plain(brassColor, 0.38, 0.72)}
            >
              <cylinderGeometry args={[0.057, 0.057, 0.045, 14]} />
            </mesh>
          </group>
        );
      })}

      <mesh
        position={[-0.78, 0.46, 0]}
        geometry={rbox(0.16, 0.68, 0.24, 0.02)}
        material={plain(frameColor, 0.55, 0.5)}
      />

      {damaged > 0.25 && (
        <mesh position={[0, 0.085, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.24, 0.86, 32]} />
          <meshStandardMaterial
            color="#2a1208"
            emissive="#ff4d12"
            emissiveIntensity={Math.min(1.6, (damaged - 0.25) * 2.1)}
            roughness={0.9}
          />
        </mesh>
      )}
    </group>
  );
};

export const EnemyT72: React.FC<EnemyT72Props> = ({
  turretYaw = 0,
  gunPitch = 0,
  travel = 0,
  turretPopHeight = 0,
  turretPopRot = [0, 0, 0],
  damaged = 0,
  showCarousel = false,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
}) => {
  const dmg = Math.max(0, Math.min(1, Math.round(damaged * 40) / 40));

  // Vật liệu sơn quân đội Iraq (repeat: 0.42 chuẩn cho cả thân extrude và vòm đúc đã quy đổi UV sang mét)
  const { hullMat, barrelMat, ghostDomeMat } = useMemo(() => {
    const baseHull = paint({
      ...PAINT_PRESETS.t72Iraqi,
      camo: [...PAINT_PRESETS.t72Iraqi.camo],
      repeat: 0.42,
      seed: 17,
    });
    const baseBarrel = paint({
      ...PAINT_PRESETS.t72Iraqi,
      camo: [...PAINT_PRESETS.t72Iraqi.camo],
      repeat: 1.6,
      seed: 17,
    });
    const tint = mix('#ffffff', '#292421', dmg);

    const hMat = dmg > 0 ? baseHull.clone() : baseHull;
    if (dmg > 0) {
      hMat.color = new THREE.Color(tint);
      hMat.metalness = 0.3 * (1 - dmg * 0.55);
    }

    const bMat = dmg > 0 ? baseBarrel.clone() : baseBarrel;
    if (dmg > 0) {
      bMat.color = new THREE.Color(tint);
      bMat.metalness = 0.3 * (1 - dmg * 0.55);
    }

    const gMat = hMat.clone();
    gMat.transparent = true;
    gMat.opacity = 0.28;
    gMat.depthWrite = false;

    return { hullMat: hMat, barrelMat: bMat, ghostDomeMat: gMat };
  }, [dmg]);

  const rimColor = mix('#857f61', '#252220', dmg);
  const tireColor = mix('#252523', '#161514', dmg);
  const rubberSkirtColor = mix('#3c3e34', '#1c1a19', dmg);
  const darkSteelColor = mix('#2f332e', '#171615', dmg);
  const gunSteelColor = mix('#494c40', '#1e1c1a', dmg);
  const drumOliveColor = mix('#8a8464', '#262320', dmg);
  const woodLogColor = mix('#6a553f', '#241e19', dmg);

  const isXrayCutaway = showCarousel && turretPopHeight < 0.04;
  const activeTurretMat = isXrayCutaway ? ghostDomeMat : hullMat;
  const revealCarousel = showCarousel || turretPopHeight > 0.001;

  const geos = useMemo(() => {
    const frontHull = extrude(FRONT_HULL_PTS, 2.12, 0.035);
    const rearHull = extrude(REAR_HULL_PTS, 2.12, 0.035);
    const sponson = extrude(SPONSON_PTS, 0.72, 0.025);
    const skirt = extrude(SKIRT_PTS, 0.032, 0.006);
    const gunBarrel = lathe(GUN_2A46_PROFILE, 32);
    const mantletBoot = lathe(MANTLET_BOOT_PROFILE, 24);
    const fuelDrum = lathe(FUEL_DRUM_PROFILE, 36);
    const drumRotated = fuelDrum.clone();
    drumRotated.rotateY(Math.PI / 2);

    const skirtRivets: [number, number, number][] = [];
    for (let x = -3.08; x <= 2.84; x += 0.31) {
      skirtRivets.push([x, 1.07, 1.804], [x, 1.07, -1.804]);
    }

    const fuelPipeL = pipe(
      [
        [-3.6, 1.54, -0.46],
        [-3.42, 1.61, -0.42],
        [-3.14, 1.55, -0.36],
      ],
      0.019,
      16,
    );
    const fuelPipeR = pipe(
      [
        [-3.6, 1.54, 0.46],
        [-3.42, 1.61, 0.42],
        [-3.14, 1.55, 0.36],
      ],
      0.019,
      16,
    );

    return {
      frontHull,
      rearHull,
      sponson,
      skirt,
      gunBarrel,
      mantletBoot,
      drumRotated,
      skirtRivets,
      fuelPipeL,
      fuelPipeR,
      turretDeck: getTurretDeckGeo(),
      turretDome: getTurretDomeGeo(),
    };
  }, []);

  const wheelSpin = travel / 0.375;
  const sprocketSpin = travel / 0.285;
  const idlerSpin = travel / 0.27;
  const trackColor = mix('#32312d', '#1a1918', dmg);

  // 12 ống phóng đạn khói Tucha 902B 81mm (7 ống bên má trái + 5 ống bên má phải)
  const tuchaLeft: [number, number, number, number, number][] = [
    [0.78, 0.37, -1.04, 0.38, -0.22],
    [0.67, 0.42, -1.11, 0.42, -0.32],
    [0.55, 0.46, -1.16, 0.45, -0.42],
    [0.42, 0.44, -1.21, 0.39, -0.52],
    [0.71, 0.28, -1.12, 0.28, -0.27],
    [0.58, 0.31, -1.18, 0.31, -0.37],
    [0.45, 0.33, -1.23, 0.33, -0.48],
  ];
  const tuchaRight: [number, number, number, number, number][] = [
    [0.68, 0.4, 1.11, 0.39, 0.32],
    [0.55, 0.44, 1.17, 0.43, 0.42],
    [0.42, 0.43, 1.22, 0.38, 0.52],
    [0.6, 0.29, 1.17, 0.29, 0.37],
    [0.47, 0.31, 1.23, 0.31, 0.48],
  ];

  return (
    <group position={position} rotation={rotation}>
      {/* ==================== 1. HỆ THỐNG XÍCH & 6 BÁNH CHỊU NẶNG CỠ LỚN ==================== */}
      {([-1, 1] as const).map((side) => (
        <React.Fragment key={side}>
          <Track
            position={[0, 0.035, side * TRACK_Z]}
            xFront={2.7}
            xRear={-2.74}
            rFront={0.425}
            rRear={0.425}
            width={0.58}
            link={0.155}
            travel={travel}
            color={trackColor}
          />
          {ROAD_WHEEL_X.map((wx, idx) => (
            <T72RoadWheel
              key={idx}
              x={wx}
              side={side}
              spin={wheelSpin}
              rimColor={rimColor}
              tireColor={tireColor}
            />
          ))}
          <group position={[2.82, 0.51, side * TRACK_Z]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
            <Wheel
              r={0.27}
              width={0.38}
              spin={side === 1 ? idlerSpin : -idlerSpin}
              rim={rimColor}
              tire="#343330"
              bolts={6}
            />
          </group>
          <T72Sprocket side={side} spin={sprocketSpin} rimColor={rimColor} />
          {RETURN_ROLLER_X.map((rx, idx) => (
            <group key={idx} position={[rx, 0.79, side * TRACK_Z]} rotation={[0, side === 1 ? 0 : Math.PI, 0]}>
              <Wheel
                r={0.085}
                width={0.26}
                spin={side === 1 ? travel / 0.085 : -travel / 0.085}
                rim={darkSteelColor}
                tire="#242422"
                bolts={4}
              />
            </group>
          ))}
        </React.Fragment>
      ))}

      {/* ==================== 2. THÂN XE T-72 (DÀI 6.95m, RỘNG 3.59m) ==================== */}
      <mesh geometry={geos.frontHull} material={hullMat} castShadow receiveShadow />
      <mesh geometry={geos.rearHull} material={hullMat} castShadow receiveShadow />

      {/* Giếng khoang chiến đấu rỗng dưới sàn tháp pháo */}
      <mesh
        position={[0.16, 0.52, 0]}
        geometry={rbox(2.04, 0.16, 2.12, 0.02)}
        material={hullMat}
        castShadow
        receiveShadow
      />
      {([-1, 1] as const).map((side) => (
        <mesh
          key={side}
          position={[0.16, 1.0, side * 1.01]}
          geometry={rbox(2.04, 0.94, 0.1, 0.015)}
          material={hullMat}
          castShadow
        />
      ))}
      <mesh
        position={[0.18, 1.52, 0]}
        geometry={geos.turretDeck}
        material={hullMat}
        castShadow
        receiveShadow
      />
      <mesh position={[0.18, 1.52, 0]} rotation={[Math.PI / 2, 0, 0]} material={hullMat} castShadow>
        <torusGeometry args={[1.08, 0.045, 10, 48]} />
      </mesh>

      {/* Hai bên sponson, thùng dầu hông & diềm chắn bùn cao su chia tấm */}
      {([-1, 1] as const).map((side) => (
        <React.Fragment key={side}>
          <mesh
            position={[0, 0, side * 1.39]}
            geometry={geos.sponson}
            material={hullMat}
            castShadow
            receiveShadow
          />
          <mesh
            position={[0.25, 1.31, side * 1.48]}
            geometry={rbox(2.88, 0.21, 0.44, 0.025)}
            material={hullMat}
            castShadow
          />
          <mesh
            position={[-2.05, 1.29, side * 1.47]}
            geometry={rbox(1.5, 0.19, 0.42, 0.025)}
            material={hullMat}
            castShadow
          />
          {/* Tấm chắn bùn cao su chia 5 khoang (mép ngoài ±1.795 m -> rộng đúng 3.59 m) */}
          <mesh
            position={[0, 0, side * 1.779]}
            geometry={geos.skirt}
            material={plain(rubberSkirtColor, 0.88, 0.08)}
            castShadow
            receiveShadow
          />
          {/* Bản lề & thanh nẹp thép giữ diềm cao su */}
          <mesh
            position={[-0.12, 1.07, side * 1.79]}
            geometry={rbox(6.2, 0.058, 0.024, 0.006)}
            material={hullMat}
          />
          {[-2.5, -1.25, -0.02, 1.25, 2.45].map((hx, idx) => (
            <mesh
              key={idx}
              position={[hx, 0.88, side * 1.794]}
              geometry={rbox(0.045, 0.36, 0.018, 0.004)}
              material={plain(darkSteelColor, 0.65, 0.35)}
            />
          ))}
        </React.Fragment>
      ))}
      <Rivets points={geos.skirtRivets} r={0.015} color={darkSteelColor} />

      {/* Gờ chắn sóng chữ V nổi sắc nét trên mũi glacis */}
      {([-1, 1] as const).map((side) => (
        <group
          key={side}
          position={[2.34, 1.315, side * 0.51]}
          rotation={[side * 0.11, -side * 0.52, -0.29]}
        >
          <mesh geometry={rbox(1.18, 0.115, 0.04, 0.008)} material={hullMat} castShadow />
          <mesh
            position={[0, 0.055, 0]}
            geometry={rbox(1.18, 0.022, 0.056, 0.004)}
            material={plain(darkSteelColor, 0.55, 0.5)}
          />
        </group>
      ))}

      {/* Kính tiềm vọng trung tâm & nắp cửa lái xe */}
      <mesh
        position={[1.45, 1.54, 0]}
        rotation={[0, 0, -0.18]}
        geometry={rbox(0.26, 0.11, 0.34, 0.02)}
        material={hullMat}
        castShadow
      />
      <mesh
        position={[1.57, 1.535, 0]}
        geometry={rbox(0.05, 0.055, 0.24, 0.006)}
        material={plain('#132428', 0.18, 0.4)}
      />
      <mesh
        position={[1.36, 1.535, 0.28]}
        geometry={rbox(0.46, 0.05, 0.42, 0.02)}
        material={hullMat}
      />

      {/* Đèn pha FG-125 & móc kéo thép rèn mũi thân */}
      {([-1, 1] as const).map((side) => (
        <React.Fragment key={side}>
          <group position={[2.86, 1.18, side * 0.96]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={plain(darkSteelColor, 0.5, 0.5)} castShadow>
              <cylinderGeometry args={[0.088, 0.078, 0.12, 16]} />
            </mesh>
            <mesh position={[0.06, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#dce3cf', 0.15, 0.2)}>
              <cylinderGeometry args={[0.074, 0.074, 0.015, 16]} />
            </mesh>
          </group>
          <mesh
            position={[3.28, 0.8, side * 0.76]}
            geometry={rbox(0.22, 0.09, 0.11, 0.025)}
            material={plain(darkSteelColor, 0.55, 0.6)}
          />
        </React.Fragment>
      ))}

      {/* Lưới tản nhiệt khoang động cơ & cửa xả khói bên sườn trái (-Z) */}
      <mesh
        position={[-1.95, 1.555, 0]}
        geometry={rbox(1.25, 0.035, 1.72, 0.012)}
        material={plain(darkSteelColor, 0.78, 0.4)}
      />
      <mesh
        position={[-2.92, 1.545, 0]}
        geometry={rbox(0.54, 0.04, 1.58, 0.012)}
        material={plain('#232521', 0.85, 0.35)}
      />
      <mesh
        position={[-2.32, 1.24, -1.76]}
        geometry={rbox(0.58, 0.17, 0.1, 0.02)}
        material={plain('#1b1a18', 0.9, 0.3)}
      />

      {/* ==================== 3. HAI THÙNG DẦU PHỤ 200L TREO NỔI ĐUÔI XE & GỖ TỰ CỨU ==================== */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[-3.68, 1.32, side * 0.63]}>
          {/* Thân thùng phuy 200L nằm ngang (r = 0.28 m, dài 0.86 m) */}
          <mesh
            geometry={geos.drumRotated}
            material={plain(drumOliveColor, 0.62, 0.32)}
            castShadow
            receiveShadow
          />
          {/* Gờ dập nổi đồng tâm & gân chữ X chống móp ở hai mặt đầu thùng phuy */}
          {([-0.432, 0.432] as const).map((dz, idx) => (
            <group key={idx} position={[0, 0, dz]}>
              <mesh material={plain(mix('#706a4f', '#211e1c', dmg), 0.6, 0.4)}>
                <torusGeometry args={[0.175, 0.016, 8, 24]} />
              </mesh>
              <mesh
                rotation={[0, 0, 0.78]}
                geometry={rbox(0.32, 0.024, 0.016, 0.005)}
                material={plain(mix('#706a4f', '#211e1c', dmg), 0.6, 0.4)}
              />
              <mesh
                rotation={[0, 0, -0.78]}
                geometry={rbox(0.32, 0.024, 0.016, 0.005)}
                material={plain(mix('#706a4f', '#211e1c', dmg), 0.6, 0.4)}
              />
            </group>
          ))}
          {/* 2 đai thép bản rộng + giá đỡ console treo hẳn thùng dầu ra ngoài đuôi thân */}
          {([-0.25, 0.25] as const).map((sz, idx) => (
            <React.Fragment key={idx}>
              <mesh position={[0, 0, sz]} material={plain(darkSteelColor, 0.48, 0.62)}>
                <torusGeometry args={[0.29, 0.016, 8, 28]} />
              </mesh>
              <mesh
                position={[0.24, -0.2, sz]}
                rotation={[0, 0, 0.38]}
                geometry={rbox(0.44, 0.06, 0.055, 0.01)}
                material={plain(darkSteelColor, 0.55, 0.55)}
                castShadow
              />
              <mesh
                position={[0.22, 0.14, sz]}
                rotation={[0, 0, -0.15]}
                geometry={rbox(0.34, 0.05, 0.05, 0.008)}
                material={plain(darkSteelColor, 0.55, 0.55)}
              />
            </React.Fragment>
          ))}
          {/* Nắp vặn tiếp nhiên liệu */}
          <mesh position={[-0.1, 0.28, side * 0.14]} material={plain(darkSteelColor, 0.45, 0.65)}>
            <cylinderGeometry args={[0.036, 0.036, 0.065, 12]} />
          </mesh>
        </group>
      ))}
      <mesh geometry={geos.fuelPipeL} material={plain(darkSteelColor, 0.55, 0.5)} />
      <mesh geometry={geos.fuelPipeR} material={plain(darkSteelColor, 0.55, 0.5)} />

      {/* Khúc gỗ tự cứu vượt lầy gắn ngang dưới giá thùng dầu đuôi */}
      <mesh
        position={[-3.62, 0.86, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        material={plain(woodLogColor, 0.92, 0.04)}
        castShadow
      >
        <cylinderGeometry args={[0.105, 0.112, 3.22, 16]} />
      </mesh>
      {([-1.15, 1.15] as const).map((lz, idx) => (
        <mesh
          key={idx}
          position={[-3.59, 0.86, lz]}
          rotation={[0, Math.PI / 2, 0]}
          material={plain(darkSteelColor, 0.5, 0.6)}
        >
          <torusGeometry args={[0.118, 0.015, 8, 20]} />
        </mesh>
      ))}

      {/* ==================== 4. KHAY ĐẠN TRÒN CAROUSEL 22 VIÊN (LỘ KHI BUNG THÁP) ==================== */}
      {revealCarousel && <CarouselAutoloader damaged={dmg} />}

      {/* ==================== 5. CỤM THÁP PHÁO VÒM ĐÚC T-72 (CAO TỚI NÓC 2.23m) ==================== */}
      <group
        position={[0.18, 1.5 + turretPopHeight, 0]}
        rotation={[turretPopRot[0], turretYaw + turretPopRot[1], turretPopRot[2]]}
      >
        {/* Vòm tháp đúc nguyên khối mượt "chảo úp" có má đúc dày T-72M1 */}
        <mesh geometry={geos.turretDome} material={activeTurretMat} castShadow receiveShadow />

        {/* Ổ đỡ khiên pháo phía trước */}
        <mesh
          position={[0.98, 0.35, 0]}
          geometry={rbox(0.54, 0.34, 0.54, 0.08)}
          material={activeTurretMat}
          castShadow
        />

        {/* Đáy giỏ tháp & khoá nòng treo dưới tháp khi bị nổ hất tung */}
        {turretPopHeight > 0.03 && (
          <group>
            <mesh position={[0, -0.08, 0]} material={plain(darkSteelColor, 0.75, 0.45)}>
              <cylinderGeometry args={[0.92, 0.86, 0.18, 32]} />
            </mesh>
            <mesh
              position={[0.18, -0.26, 0]}
              geometry={rbox(0.95, 0.32, 0.46, 0.03)}
              material={plain('#232220', 0.65, 0.55)}
            />
            {([-1, 1] as const).map((side) => (
              <mesh
                key={side}
                position={[-0.1, -0.34, side * 0.72]}
                geometry={rbox(0.07, 0.52, 0.07, 0.01)}
                material={plain('#242220', 0.7, 0.45)}
              />
            ))}
          </group>
        )}

        {/* ---------- PHÁO CHÍNH 125mm 2A46 + ĐÈN HỒNG NGOẠI LUNA L-2AG ---------- */}
        <group position={[0.92, 0.35, 0]} rotation={[0, 0, gunPitch]}>
          <mesh
            geometry={geos.mantletBoot}
            material={plain(mix('#464839', '#1e1c1a', dmg), 0.88, 0.06)}
            castShadow
          />
          <mesh geometry={geos.gunBarrel} material={barrelMat} castShadow receiveShadow />
          <mesh position={[4.45, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#0a0a0a', 0.95, 0.1)}>
            <cylinderGeometry args={[0.061, 0.061, 0.05, 20]} />
          </mesh>

          {/* Đèn pha hồng ngoại Luna L-2AG tròn đặc trưng nhô rõ BÊN PHẢI pháo (+Z) */}
          <group position={[0.42, 0.19, 0.55]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={barrelMat} castShadow>
              <cylinderGeometry args={[0.215, 0.205, 0.28, 28]} />
            </mesh>
            <mesh position={[0.14, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={plain(darkSteelColor, 0.45, 0.6)}>
              <torusGeometry args={[0.21, 0.02, 10, 28]} />
            </mesh>
            {/* Mặt kính lọc hồng ngoại đen ánh hồng ngọc sẫm */}
            <mesh
              position={[0.138, 0, 0]}
              rotation={[0, 0, Math.PI / 2]}
              material={plain('#240d1d', 0.1, 0.4)}
            >
              <cylinderGeometry args={[0.198, 0.198, 0.016, 28]} />
            </mesh>
            {([-0.7, 0.7] as const).map((ang, idx) => (
              <mesh
                key={idx}
                position={[0.156, 0, 0]}
                rotation={[ang, 0, 0]}
                geometry={rbox(0.014, 0.4, 0.018, 0.004)}
                material={plain(darkSteelColor, 0.5, 0.55)}
              />
            ))}
            {/* Tay giá chữ L gắn vào ổ khiên pháo */}
            <mesh
              position={[-0.08, -0.15, -0.18]}
              rotation={[0.58, 0.2, 0]}
              geometry={rbox(0.24, 0.28, 0.08, 0.015)}
              material={plain(darkSteelColor, 0.55, 0.5)}
              castShadow
            />
          </group>
        </group>

        {/* ---------- CỤM ỐNG PHÓNG ĐẠN KHÓI TUCHA 902B 81mm ---------- */}
        {[...tuchaLeft, ...tuchaRight].map(([tx, ty, tz, pitch, yaw], idx) => (
          <group key={idx} position={[tx, ty, tz]} rotation={[0, yaw, pitch]}>
            <mesh rotation={[0, 0, -Math.PI / 2]} material={plain(gunSteelColor, 0.52, 0.48)} castShadow>
              <cylinderGeometry args={[0.045, 0.047, 0.28, 14]} />
            </mesh>
            <mesh position={[0.145, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain('#1c1d1a', 0.85, 0.1)}>
              <cylinderGeometry args={[0.048, 0.048, 0.025, 14]} />
            </mesh>
          </group>
        ))}

        {/* ---------- KÍNH NGẮM PHÁO THỦ TPD-K1, HỘP ĐỒ, ỐNG LỘI NƯỚC & ĂNG-TEN ---------- */}
        <group position={[0.48, 0.69, -0.44]}>
          <mesh geometry={rbox(0.4, 0.17, 0.29, 0.025)} material={activeTurretMat} castShadow />
          <mesh
            position={[0.195, 0.01, 0]}
            geometry={rbox(0.03, 0.09, 0.19, 0.005)}
            material={plain('#183836', 0.12, 0.48)}
          />
        </group>
        <mesh position={[0.08, 0.73, -0.54]} material={plain(darkSteelColor, 0.5, 0.5)} castShadow>
          <cylinderGeometry args={[0.075, 0.085, 0.16, 16]} />
        </mesh>

        {/* Cửa sập tròn pháo thủ bên trái (-Z) */}
        <group position={[-0.32, 0.71, -0.46]}>
          <mesh material={activeTurretMat} castShadow>
            <cylinderGeometry args={[0.31, 0.33, 0.07, 24]} />
          </mesh>
          <mesh
            position={[-0.18, 0.055, 0]}
            geometry={rbox(0.12, 0.05, 0.22, 0.01)}
            material={plain(darkSteelColor, 0.55, 0.5)}
          />
        </group>

        {/* Thùng đồ gắn quanh hông & sau tháp đúc + ống thông hơi lội sâu */}
        <mesh
          position={[-1.34, 0.42, 0]}
          rotation={[0, 0, 0.18]}
          geometry={rbox(0.38, 0.34, 0.94, 0.03)}
          material={activeTurretMat}
          castShadow
        />
        <mesh
          position={[-0.28, 0.39, -1.33]}
          rotation={[0.22, 0, 0]}
          geometry={rbox(0.84, 0.3, 0.28, 0.025)}
          material={activeTurretMat}
          castShadow
        />
        <mesh
          position={[-1.48, 0.26, 0.06]}
          rotation={[Math.PI / 2, 0, 0]}
          material={barrelMat}
          castShadow
        >
          <cylinderGeometry args={[0.086, 0.086, 1.58, 18]} />
        </mesh>
        {/* Ăng-ten cần R-173 mảnh phía sau tháp */}
        <mesh
          position={[-0.98, 1.28, -0.52]}
          rotation={[0.04, 0, 0.08]}
          material={plain(darkSteelColor, 0.42, 0.65)}
        >
          <cylinderGeometry args={[0.008, 0.022, 1.25, 8]} />
        </mesh>

        {/* ---------- VÒM CỬA TRƯỞNG XE + ĐẠI LIÊN PHÒNG KHÔNG 12.7mm NSVT ---------- */}
        <group position={[-0.22, 0.71, 0.46]}>
          <mesh material={activeTurretMat} castShadow>
            <cylinderGeometry args={[0.36, 0.39, 0.11, 28]} />
          </mesh>
          {Array.from({ length: 5 }, (_, i) => {
            const a = (i - 2) * 0.52;
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.34, 0.03, Math.sin(a) * 0.34]}
                rotation={[0, -a, 0]}
                geometry={rbox(0.06, 0.055, 0.1, 0.008)}
                material={plain('#16282a', 0.2, 0.4)}
              />
            );
          })}
          <mesh position={[-0.08, 0.075, 0]} material={activeTurretMat} castShadow>
            <cylinderGeometry args={[0.31, 0.31, 0.045, 24]} />
          </mesh>

          {/* Giá súng & Đại liên 12.7mm NSVT trên nóc tháp */}
          <group position={[0.22, 0.17, 0.04]} rotation={[0, 0, 0.06]}>
            <mesh position={[-0.06, -0.07, 0]} material={plain(darkSteelColor, 0.5, 0.6)}>
              <cylinderGeometry args={[0.042, 0.058, 0.17, 12]} />
            </mesh>
            <mesh
              position={[0.08, 0.04, 0]}
              geometry={rbox(0.48, 0.125, 0.105, 0.015)}
              material={plain(gunSteelColor, 0.44, 0.65)}
              castShadow
            />
            <mesh
              position={[-0.19, 0.03, 0]}
              geometry={rbox(0.11, 0.14, 0.17, 0.012)}
              material={plain(darkSteelColor, 0.55, 0.5)}
            />
            <mesh
              position={[0.06, 0.01, 0.135]}
              geometry={rbox(0.25, 0.18, 0.135, 0.015)}
              material={plain(mix('#4d583e', '#22211f', dmg), 0.65, 0.35)}
              castShadow
            />
            <mesh
              position={[0.6, 0.055, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              material={plain('#2b2d2a', 0.38, 0.74)}
              castShadow
            >
              <cylinderGeometry args={[0.019, 0.026, 0.65, 12]} />
            </mesh>
            <mesh
              position={[0.95, 0.055, 0]}
              rotation={[0, 0, -Math.PI / 2]}
              material={plain('#232523', 0.36, 0.78)}
            >
              <cylinderGeometry args={[0.03, 0.018, 0.095, 12]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

export default EnemyT72;

export const preview = turntable(EnemyT72, { size: 9.8, center: [0.4, 1.2, 0] });
