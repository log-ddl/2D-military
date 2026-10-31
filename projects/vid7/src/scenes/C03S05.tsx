import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { extrude, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets } from '@skill/military/3d/parts';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { MarkTwainSight } from '../parts/Ordnance3D';
import { FactoryComplex, TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';

// Toạ độ mục tiêu tính chính xác theo hình học tia ngắm từ mắt camera [-0.23, 0.292, +0.078]
// xuyên qua tâm dây chữ thập MarkTwainSight [+0.14657, +0.13677, +0.007] (aimAngle = 0.42) xuống mái xưởng y = 6.5 m
const ARSENAL_X = 207.9;
const ARSENAL_Z = -39.2;
const PLANE_Y = 92.0;

const TOKYO_NORTH_H = heightField({
  seed: 305,
  amp: 2.5,
  scale: 190,
  flats: [
    [ARSENAL_X, ARSENAL_Z, 260, 0],
    [-40, 0, 180, 0],
    [490, -25, 210, 0],
  ],
});

const avoidUrbanStructures = (x: number, z: number) => {
  if (Math.abs(x - ARSENAL_X) < 88 && Math.abs(z - ARSENAL_Z) < 68) return true;
  if (Math.abs(z - 68) < 22) return true;
  if (Math.abs(((x + 400) % 72) - 36) < 10) return true;
  if (Math.abs(((z + 400) % 60) - 30) < 9) return true;
  return false;
};

type RowBlockSpec = { x: number; z: number; rot: number; variant: number };

const ROWHOUSE_BLOCKS: RowBlockSpec[] = [
  { x: -18, z: -110, rot: 0, variant: 0 },
  { x: 42, z: -110, rot: 0, variant: 1 },
  { x: 102, z: -112, rot: 0, variant: 2 },
  { x: 158, z: -132, rot: 0, variant: 0 },
  { x: 222, z: -136, rot: 0, variant: 1 },
  { x: 286, z: -132, rot: 0, variant: 2 },
  { x: 348, z: -112, rot: 0, variant: 0 },
  { x: 412, z: -108, rot: 0, variant: 1 },

  { x: -20, z: -46, rot: 0, variant: 2 },
  { x: 40, z: -46, rot: 0, variant: 0 },
  { x: 96, z: -44, rot: Math.PI / 2, variant: 1 },
  { x: 336, z: -48, rot: 0, variant: 2 },
  { x: 398, z: -46, rot: 0, variant: 0 },
  { x: 462, z: -48, rot: 0, variant: 1 },

  { x: -12, z: 18, rot: 0, variant: 1 },
  { x: 48, z: 20, rot: 0, variant: 2 },
  { x: 104, z: 22, rot: 0, variant: 0 },
  { x: 162, z: 38, rot: 0, variant: 1 },
  { x: 226, z: 40, rot: 0, variant: 2 },
  { x: 288, z: 36, rot: 0, variant: 0 },
  { x: 348, z: 22, rot: 0, variant: 1 },
  { x: 412, z: 22, rot: 0, variant: 2 },
  { x: 476, z: 20, rot: 0, variant: 0 },

  { x: 54, z: 116, rot: 0, variant: 0 },
  { x: 126, z: 118, rot: 0, variant: 1 },
  { x: 202, z: 120, rot: 0, variant: 2 },
  { x: 278, z: 118, rot: 0, variant: 0 },
  { x: 356, z: 116, rot: 0, variant: 1 },
  { x: 432, z: 120, rot: 0, variant: 2 },
];

/** Cánh tay áo da bay A-2 + bo cổ tay len Olive + bàn tay găng da liền khối tuyệt đối dọc một trục giải phẫu */
const ConnectedBomberArm: React.FC<{
  side: 'right' | 'left';
  sleeveMat: THREE.Material;
  cuffMat: THREE.Material;
  gloveMat: THREE.Material;
  pinch?: number;
}> = ({ side, sleeveMat, cuffMat, gloveMat, pinch = 0 }) => {
  const s = side === 'right' ? 1 : -1;
  const sleeveGeo = useMemo(
    () =>
      pipe(
        [
          [-0.072, -0.006, 0],
          [-0.18, -0.028, s * 0.032],
          [-0.32, -0.068, s * 0.085],
          [-0.48, -0.125, s * 0.155],
        ],
        0.044,
        24,
      ),
    [s],
  );

  return (
    <group>
      {/* Ống tay áo da bay A-2 uốn cong mượt nối liền vào cổ tay len (không bao giờ hở khớp) */}
      <mesh geometry={sleeveGeo} material={sleeveMat} castShadow />
      {/* Bo cổ tay len dệt Olive ôm sát cổ tay găng da */}
      <mesh position={[-0.068, -0.005, 0]} rotation={[0, 0, Math.PI / 2 - 0.08]} material={cuffMat} castShadow>
        <cylinderGeometry args={[0.033, 0.039, 0.052, 16]} />
      </mesh>
      {/* Mu bàn tay găng da bay */}
      <mesh position={[-0.022, -0.002, 0]} geometry={rbox(0.068, 0.03, 0.058, 0.013)} material={gloveMat} castShadow />
      {/* Ngón trỏ & ngón cái kẹp núm đồng / đặt trên cò điện */}
      <mesh
        position={[0.024, 0.006 - pinch * 0.4, -s * 0.014]}
        rotation={[0, s * 0.18, -0.1 - pinch]}
        geometry={rbox(0.048, 0.015, 0.016, 0.007)}
        material={gloveMat}
        castShadow
      />
      <mesh
        position={[0.016, -0.012 + pinch * 0.25, -s * 0.022]}
        rotation={[0, s * 0.36, 0.16]}
        geometry={rbox(0.042, 0.016, 0.017, 0.007)}
        material={gloveMat}
        castShadow
      />
      {/* Các ngón còn lại khép tự nhiên */}
      <mesh
        position={[0.02, -0.003, s * 0.005]}
        rotation={[0, s * 0.06, -0.18]}
        geometry={rbox(0.045, 0.015, 0.015, 0.006)}
        material={gloveMat}
      />
      <mesh
        position={[0.014, -0.01, s * 0.021]}
        rotation={[0, 0, -0.25]}
        geometry={rbox(0.04, 0.014, 0.014, 0.006)}
        material={gloveMat}
      />
    </group>
  );
};

/**
 * Khoang vòm mũi kính Bombardier B-25B góc nhìn bên trong tỉ lệ 1:1 (gốc [0,0,0] tại chân đế MarkTwainSight).
 * Khẩu độ cửa ngắm bom chính diện để trống trong suốt 100% không kính đục, mọi thanh nan nối khít liền mạch vào vành mũi.
 */
const BombardierNoseInterior: React.FC<{ t: number }> = ({ t }) => {
  const mats = useMemo(
    () => ({
      frameOlive: paint({
        color: '#465031',
        camo: ['#3c4529', '#55613c'],
        repeat: 0.9,
        wear: 0.22,
        dirt: 0.16,
        roughness: 0.58,
        metalness: 0.34,
        seed: 41,
      }),
      chromateGreen: paint({
        color: '#5c703c',
        camo: ['#506333', '#6a7f47'],
        repeat: 1.1,
        wear: 0.2,
        dirt: 0.18,
        roughness: 0.68,
        metalness: 0.24,
        seed: 43,
      }),
      duralumin: plain('#b8c2c8', 0.34, 0.74),
      darkSteel: plain('#23282c', 0.44, 0.72),
      switchBox: plain('#1b1e21', 0.58, 0.35),
      redTrigger: plain('#d12c24', 0.38, 0.18),
      brass: plain('#dfb24c', 0.24, 0.85),
      leatherA2: paint({
        color: '#4f301f',
        camo: ['#412617', '#5f3b27'],
        repeat: 1.4,
        wear: 0.24,
        dirt: 0.14,
        roughness: 0.55,
        metalness: 0.08,
        seed: 57,
      }),
      woolCuff: plain('#474e32', 0.88, 0.04),
      gloveTan: plain('#c99d72', 0.72, 0.04),
    }),
    [],
  );

  const geos = useMemo(() => {
    const domePt = (x: number, ang: number): V3 => {
      const u = Math.max(0, Math.min(1, (x + 0.62) / 1.16));
      const prof = Math.pow(Math.max(0.06, 1 - u * u * 0.72), 0.56);
      const yc = lerp(0.12, 0.065, u * u);
      const ry = 0.64 * prof;
      const rz = 0.63 * prof;
      return [x, yc + Math.cos(ang) * ry, Math.sin(ang) * rz];
    };

    const bezelPt = (ang: number): V3 => {
      const dy = Math.cos(ang) * 0.26;
      const dz = Math.sin(ang) * 0.35;
      const px = 0.44 - dy * 0.24;
      const py = 0.055 + dy;
      return [px, py, dz];
    };

    const sampleArch = (x: number, a0: number, a1: number, n = 24) => {
      const pts: V3[] = [];
      for (let i = 0; i <= n; i++) pts.push(domePt(x, lerp(a0, a1, i / n)));
      return pts;
    };

    const rearArch = pipe(sampleArch(-0.46, -Math.PI * 0.74, Math.PI * 0.74, 28), 0.019, 32);
    const midUpperArch = pipe(sampleArch(-0.04, -Math.PI * 0.68, Math.PI * 0.68, 28), 0.014, 30);

    // Khung bầu dục cửa kính phẳng ngắm bom khép kín 100% (closed = true, không có khe nứt ở đỉnh 12h!)
    const bezelLoopVecs: THREE.Vector3[] = [];
    for (let i = 0; i < 32; i++) {
      const p = bezelPt((i / 32) * Math.PI * 2);
      bezelLoopVecs.push(new THREE.Vector3(p[0], p[1], p[2]));
    }
    const aimingBezel = new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(bezelLoopVecs, true),
      72,
      0.0155,
      12,
      true,
    );

    // Các thanh nan dọc nối khít từ vòm sau vào đúng chu vi vành cửa ngắm trước (không có đầu ống cụt thừa!)
    const stringerAngles = [-Math.PI * 0.58, -Math.PI * 0.32, 0, Math.PI * 0.32, Math.PI * 0.58];
    const stringers = stringerAngles.map((ang) => {
      const p0 = domePt(-0.52, ang);
      const p1 = domePt(-0.26, ang);
      const p2 = domePt(-0.04, ang);
      const p3 = domePt(0.18, ang);
      const pEnd = bezelPt(ang);
      return pipe([p0, p1, p2, p3, pEnd], 0.012, 24);
    });

    const pedestalPts: P2[] = [
      [-0.16, -0.16],
      [0.145, -0.16],
      [0.135, 0.002],
      [-0.15, 0.002],
    ];
    const sightPedestal = extrude(pedestalPts, 0.072, 0.004);

    const releaseCable = pipe(
      [
        [-0.04, 0.05, -0.21],
        [-0.18, -0.06, -0.27],
        [-0.46, -0.15, -0.34],
      ],
      0.008,
      18,
    );

    const rivets: V3[] = [];
    for (let i = 0; i < 16; i++) {
      const p = bezelPt((i / 16) * Math.PI * 2);
      rivets.push([p[0] - 0.01, p[1], p[2]]);
    }
    for (const rx of [-0.12, -0.05, 0.02, 0.09]) {
      rivets.push([rx, -0.03, 0.038]);
      rivets.push([rx, -0.12, 0.038]);
    }

    return {
      rearArch,
      midUpperArch,
      stringers,
      aimingBezel,
      sightPedestal,
      releaseCable,
      rivets,
    };
  }, []);

  // Tay phải Hạ sĩ Fred Bremer tinh chỉnh núm khoá đồng trên thước ngắm rồi hạ nhẹ giữ vững đế thước
  const pHandSettle = prog(t, 468.6, 471.2);
  const knobFineTurn = Math.sin((t - 462.76) * 2.8) * 0.0035 * (1 - pHandSettle);
  const rightArmPos: V3 = [
    lerp(0.086, 0.078, pHandSettle),
    lerp(0.118, 0.024, pHandSettle) + knobFineTurn,
    lerp(0.052, 0.066, pHandSettle),
  ];
  const rightArmRot: V3 = [
    lerp(-0.1, -0.05, pHandSettle),
    lerp(0.56, 0.48, pHandSettle),
    lerp(0.22, 0.14, pHandSettle),
  ];

  // Tay trái Bremer giữ hộp cò điện cắt bom bên khung trái (hiện rõ ở góc dưới-trái khi căn mục tiêu 470–475.8 s)
  const pLeftReady = prog(t, 469.4, 472.0);
  const triggerPress = prog(t, 475.3, 475.82) * 0.01 + bump(t, CUE.c03_s05_hold_steady_chief, 0.5) * 0.002;

  return (
    <group>
      <pointLight position={[-0.26, 0.38, 0.36]} color="#fff7e8" intensity={1.1} distance={2.0} decay={2} />
      <pointLight position={[0.18, 0.42, -0.32]} color="#d8ecff" intensity={0.58} distance={1.8} decay={2} />

      {/* Sàn khoang mũi Bombardier & dầm chịu lực */}
      <mesh position={[-0.22, -0.21, 0]} geometry={rbox(0.88, 0.04, 0.86, 0.01)} material={mats.chromateGreen} receiveShadow />
      {[-0.44, -0.26, -0.08, 0.1].map((rx, i) => (
        <mesh key={`frib-${i}`} position={[rx, -0.182, 0]} geometry={rbox(0.026, 0.022, 0.82, 0.004)} material={mats.frameOlive} />
      ))}
      <mesh position={[0.2, -0.21, 0]} rotation={[0, 0, 0.14]} geometry={rbox(0.3, 0.032, 0.68, 0.008)} material={mats.frameOlive} />

      {/* Chân đế hợp kim nhôm đinh tán nâng thước ngắm MarkTwainSight */}
      <mesh geometry={geos.sightPedestal} material={mats.chromateGreen} castShadow receiveShadow />
      <mesh position={[-0.005, -0.006, 0]} geometry={rbox(0.31, 0.014, 0.092, 0.003)} material={mats.duralumin} castShadow />

      {/* THƯỚC NGẮM NHÔM PHẾ LIỆU 20 XU "MARK TWAIN" (aimAngle = 0.42 rad chuẩn C03.md) */}
      <MarkTwainSight aimAngle={0.42} />

      {/* Khung vòm mũi kính Bombardier liền mạch, khẩu độ giữa trong suốt 100% */}
      <mesh geometry={geos.rearArch} material={mats.frameOlive} castShadow />
      <mesh geometry={geos.midUpperArch} material={mats.frameOlive} castShadow />
      {geos.stringers.map((g, i) => (
        <mesh key={`str-${i}`} geometry={g} material={mats.frameOlive} castShadow />
      ))}
      <mesh geometry={geos.aimingBezel} material={mats.frameOlive} castShadow />
      <Rivets points={geos.rivets} r={0.0045} color="#a9b3b9" />

      {/* Súng máy phòng vệ mũi .30 cal Browning AN/M2 bên mạn phải (+Z = +0.32 m) */}
      <group position={[0.08, 0.04, 0.32]} rotation={[0.04, -0.14, -0.12]}>
        <mesh geometry={rbox(0.28, 0.078, 0.058, 0.006)} material={mats.darkSteel} castShadow />
        <mesh position={[0.26, 0.008, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.darkSteel} castShadow>
          <cylinderGeometry args={[0.019, 0.019, 0.28, 14]} />
        </mesh>
        <mesh position={[0.44, 0.008, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.darkSteel}>
          <cylinderGeometry args={[0.009, 0.008, 0.16, 10]} />
        </mesh>
        <mesh position={[0.02, -0.14, 0.05]} geometry={rbox(0.18, 0.14, 0.09, 0.008)} material={mats.chromateGreen} castShadow />
        {Array.from({ length: 5 }, (_, k) => (
          <mesh
            key={`belt-${k}`}
            position={[0.01, -0.02 - k * 0.016, 0.032 + k * 0.004]}
            rotation={[0, 0, Math.PI / 2]}
            material={mats.brass}
          >
            <cylinderGeometry args={[0.0045, 0.0045, 0.058, 8]} />
          </mesh>
        ))}
      </group>

      {/* Hộp công tắc chọn khoang bom & nút cò điện cắt bom sơn đỏ bên trái (-Z = -0.21 m) */}
      <group position={[-0.04, 0.055, -0.21]} rotation={[0.1, 0.28, 0]}>
        <mesh geometry={rbox(0.13, 0.095, 0.052, 0.006)} material={mats.switchBox} castShadow />
        <mesh position={[0, 0.016, 0.027]} geometry={rbox(0.1, 0.02, 0.004, 0.001)} material={mats.duralumin} />
        {[-0.03, 0, 0.03].map((sx, i) => (
          <mesh key={`tog-${i}`} position={[sx, -0.016, 0.032]} rotation={[0.45, 0, 0]} material={mats.duralumin}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.022, 8]} />
          </mesh>
        ))}
        <mesh position={[0.02, 0.055 - triggerPress, 0.005]} material={mats.redTrigger} castShadow>
          <cylinderGeometry args={[0.013, 0.014, 0.022, 14]} />
        </mesh>
        <mesh position={[0.02, 0.047, 0.005]} material={mats.brass}>
          <cylinderGeometry args={[0.018, 0.018, 0.008, 14]} />
        </mesh>
      </group>
      <mesh geometry={geos.releaseCable} material={mats.darkSteel} />

      {/* Cánh tay phải & bàn tay liền khối của Hạ sĩ Fred Bremer căn thước ngắm MarkTwainSight */}
      <group position={rightArmPos} rotation={rightArmRot}>
        <ConnectedBomberArm
          side="right"
          sleeveMat={mats.leatherA2}
          cuffMat={mats.woolCuff}
          gloveMat={mats.gloveTan}
        />
      </group>

      {/* Cánh tay trái & ngón tay đặt lên nút cò cắt bom điện tử */}
      <group
        position={[lerp(-0.12, -0.042, pLeftReady), lerp(-0.04, 0.112, pLeftReady), lerp(-0.27, -0.195, pLeftReady)]}
        rotation={[0.08, -0.46, -0.12]}
      >
        <ConnectedBomberArm
          side="left"
          sleeveMat={mats.leatherA2}
          cuffMat={mats.woolCuff}
          gloveMat={mats.gloveTan}
          pinch={triggerPress * 25}
        />
      </group>
    </group>
  );
};

const C03S05: React.FC = () => {
  const t = useT();

  const urbanMats = useMemo(
    () => ({
      roadAsphalt: plain('#494c4a', 0.92, 0.04),
      yardConcrete: paint({
        color: '#9b968c',
        camo: ['#8c877d', '#aaa59a'],
        repeat: 4,
        wear: 0.2,
        dirt: 0.28,
        roughness: 0.88,
        metalness: 0.04,
        seed: 81,
      }),
      perimeterWall: plain('#6e483d', 0.86, 0.06),
      canalWater: plain('#2b6384', 0.22, 0.18),
      canalBank: plain('#8d897f', 0.88, 0.05),
      railBed: plain('#58534c', 0.94, 0.06),
      railSteel: plain('#7d848a', 0.42, 0.72),
    }),
    [],
  );

  // Vận tốc bay ngang đều tay của Doolittle (khớp tâm chữ thập đúng vào trung tâm xưởng vũ khí lúc 475.25 s)
  const planeX = (t - 475.25) * 19.5;

  // Trước 467.38 s cân chỉnh lái tay cực nhẹ; từ "steady by hand" trở đi đường chân trời Tokyo phẳng tuyệt đối!
  const settle = 1 - prog(t, 466.2, 468.0);
  const handRoll = Math.sin((t - 462.76) * 2.1) * 0.013 * settle;
  const handPitch = Math.cos((t - 462.76) * 1.6) * 0.005 * settle;

  // Chuyển mượt từ cận cảnh cơ khí 3/4 sang đường ngắm Bombardier [-0.23, 0.292, +0.078]:
  // z = +0.078 tách hẳn vòng lỗ ngắm sau (bên trái) khỏi vòng chữ thập trước (bên phải, không chồng lên nhau!)
  const pOpen = prog(t, 462.76, 468.2);
  const pAim = prog(t, 468.3, 472.1);

  const camRel: V3 = [
    lerp(lerp(-0.39, -0.34, pOpen), -0.23, pAim),
    lerp(lerp(0.245, 0.262, pOpen), 0.292, pAim),
    lerp(lerp(0.235, 0.185, pOpen), 0.078, pAim),
  ];

  const lookRel: V3 = [
    lerp(0.45, 0.15, pAim),
    lerp(0.095, 0.172, pAim),
    lerp(-0.04, -0.018, pAim),
  ];

  const camPos: V3 = [planeX + camRel[0], PLANE_Y + camRel[1], camRel[2]];
  const camLook: V3 = [planeX + lookRel[0], PLANE_Y + lookRel[1] + handPitch * 0.4, lookRel[2]];
  const fov = lerp(40, 38, pAim);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        {...STAGE_PRESETS.tokyoNoon}
        fog={[260, 1080]}
        shadowArea={180}
        shadowCenter={[ARSENAL_X - 16, 10, ARSENAL_Z]}
      >
        <Cam pos={camPos} look={camLook} fov={fov} roll={handRoll} />

        {/* ==================== MẶT ĐẤT ĐÔ THỊ & KHU XƯỞNG VŨ KHÍ BẮC TOKYO ==================== */}
        <Terrain
          h={TOKYO_NORTH_H}
          size={1450}
          seg={180}
          center={[220, -10]}
          colors={TERRAIN_PALETTE.tokyoUrban}
          grainRepeat={52}
        />

        {/* Kênh nước công nghiệp nhánh sông Sumida & cầu bắc ngang */}
        <group position={[220, 0, 68]}>
          <mesh position={[0, 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]} material={urbanMats.canalWater}>
            <planeGeometry args={[1200, 28]} />
          </mesh>
          <mesh position={[0, 0.35, -15.2]} geometry={rbox(1200, 0.7, 2.4, 0.05)} material={urbanMats.canalBank} receiveShadow />
          <mesh position={[0, 0.35, 15.2]} geometry={rbox(1200, 0.7, 2.4, 0.05)} material={urbanMats.canalBank} receiveShadow />
          {[55, 210, 375].map((bx, i) => (
            <mesh key={`br-${i}`} position={[bx - 220, 0.9, 0]} geometry={rbox(14, 0.8, 34, 0.08)} material={urbanMats.yardConcrete} castShadow />
          ))}
        </group>

        {/* Lưới đường nhựa & tuyến đường sắt vận tải quân nhu dẫn vào xưởng vũ khí */}
        {[-80, -8, 46, -148].map((rz, idx) => (
          <mesh key={`rd-x-${idx}`} position={[220, 0.08, rz]} rotation={[-Math.PI / 2, 0, 0]} material={urbanMats.roadAsphalt} receiveShadow>
            <planeGeometry args={[1150, 9.5]} />
          </mesh>
        ))}
        {[12, 82, 128, 304, 372, 440].map((rx, idx) => (
          <mesh key={`rd-z-${idx}`} position={[rx, 0.09, -20]} rotation={[-Math.PI / 2, 0, 0]} material={urbanMats.roadAsphalt} receiveShadow>
            <planeGeometry args={[9.0, 380]} />
          </mesh>
        ))}
        <group position={[210, 0.12, -88]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={urbanMats.railBed}>
            <planeGeometry args={[860, 6.5]} />
          </mesh>
          <mesh position={[0, 0.08, -1.1]} geometry={rbox(860, 0.14, 0.22, 0.02)} material={urbanMats.railSteel} />
          <mesh position={[0, 0.08, 1.1]} geometry={rbox(860, 0.14, 0.22, 0.02)} material={urbanMats.railSteel} />
        </group>

        {/* ==================== MỤC TIÊU CHÍNH: KHU XƯỞNG VŨ KHÍ QUÂN SỰ (MILITARY ARSENAL) ==================== */}
        <group position={[ARSENAL_X, 0, ARSENAL_Z]}>
          <mesh position={[8, 0.1, -4]} rotation={[-Math.PI / 2, 0, 0]} material={urbanMats.yardConcrete} receiveShadow>
            <planeGeometry args={[146, 108]} />
          </mesh>
          <mesh position={[8, 1.4, -57]} geometry={rbox(148, 2.8, 1.2, 0.05)} material={urbanMats.perimeterWall} castShadow />
          <mesh position={[8, 1.4, 49]} geometry={rbox(148, 2.8, 1.2, 0.05)} material={urbanMats.perimeterWall} castShadow />
          <mesh position={[-65, 1.4, -4]} geometry={rbox(1.2, 2.8, 107, 0.05)} material={urbanMats.perimeterWall} castShadow />
          <mesh position={[81, 1.4, -4]} geometry={rbox(1.2, 2.8, 107, 0.05)} material={urbanMats.perimeterWall} castShadow />

          {/* Phân xưởng vũ khí chính mái răng cưa + 2 ống khói gạch sọc đỏ-trắng */}
          <group rotation={[0, 0.88, 0]}>
            <FactoryComplex variant={0} damage={0} />
          </group>

          <group position={[46, 0, -24]} rotation={[0, -0.68, 0]} scale={0.74}>
            <FactoryComplex variant={1} damage={0} />
          </group>
          {[-38, -18].map((wx, idx) => (
            <mesh
              key={`wh-${idx}`}
              position={[wx, 3.4, 28]}
              geometry={rbox(15, 6.8, 22, 0.1)}
              material={urbanMats.perimeterWall}
              castShadow
              receiveShadow
            />
          ))}
        </group>

        {ROWHOUSE_BLOCKS.map((b, idx) => (
          <group key={`rb-${idx}`} position={[b.x, 0, b.z]} rotation={[0, b.rot, 0]}>
            <TokyoRowhouseBlock variant={b.variant} burning={false} />
          </group>
        ))}

        <Scatter
          kind="broadleaf"
          count={120}
          area={[-60, -220, 540, 200]}
          h={TOKYO_NORTH_H}
          seed={35}
          scale={[0.85, 1.35]}
          avoid={avoidUrbanStructures}
        />
        <Scatter
          kind="pine"
          count={75}
          area={[-40, -200, 520, 185]}
          h={TOKYO_NORTH_H}
          seed={52}
          scale={[0.9, 1.4]}
          avoid={avoidUrbanStructures}
        />

        {/* ==================== KHOANG MŨI KÍNH BOMBARDIER & THƯỚC NGẮM 20 XU MARK TWAIN ==================== */}
        <group position={[planeX, PLANE_Y, 0]} rotation={[handRoll, 0, handPitch]}>
          <BombardierNoseInterior t={t} />
        </group>
      </Stage>

      <Label
        t={t}
        text="20¢ MARK TWAIN SIGHT"
        x={1080}
        y={255}
        from={CUE.c03_s05_mark_twain_sight}
        until={469.5}
      />
    </div>
  );
};

export default C03S05;
