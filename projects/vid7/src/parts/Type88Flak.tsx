// Pháo phòng không Nhật Bản Type 88 75mm (八八式七糎野戦高射砲) — tỷ lệ thật 1:1 (hướng bắn mặc định +X, trên +Y, phải +Z).
// Kích thước chuẩn: 5 chân chống sao đường kính 5.03 m (r = 2.515 m) tại y = 0, nòng 75mm L/44 dài 3.21 m, công sự bao cát Ø 5.8 m cao ~0.9 m.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { rnd } from '@core/time';
import { turntable } from '@skill/military/3d/turntable';
import { extrude, lathe, mat4, merge, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets } from '@skill/military/3d/parts';
import { PAINT } from '../design/palette';

export type Type88FlakProps = {
  yaw?: number;
  elev?: number;
  recoil?: number;
  sandbags?: boolean;
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Tâm khớp trục nâng nòng (trunnion) cố định trên giá pháo trên
const TRUNNION_X = -0.06;
const TRUNNION_Y = 1.48;

/** Tạo một bao cát vải bố phồng giữa, thắt nhẹ hai đầu (giữ nguyên UV từ rbox để ăn vân vải paint). */
function createSandbagPillowGeo(): THREE.BufferGeometry {
  const g = rbox(0.56, 0.195, 0.35, 0.08, 3).clone();
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const nx = Math.min(1, Math.abs(x) / 0.28);
    // Phồng bụng ở giữa, thắt mép buộc ở hai đầu và hơi bẹp đáy do trọng lượng
    const waistBulge = 1.06 - 0.18 * nx * nx;
    const heightPinch = 1.03 - 0.24 * Math.pow(nx, 2.4);
    const sag = y < 0 ? 0.88 : 1.0;
    pos.setXYZ(i, x, y * heightPinch * sag, z * waistBulge);
  }
  g.computeVertexNormals();
  return g;
}

/** Xi-lanh cân bằng lò xo (equilibrator) tự co giãn nối liền giá dưới với máng pháo theo mọi góc nâng elev. */
const TelescopingEquilibrator: React.FC<{
  from: [number, number, number];
  to: [number, number, number];
  bodyMat: THREE.Material;
  rodMat: THREE.Material;
}> = ({ from, to, bodyMat, rodMat }) => {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const len = Math.max(0.15, Math.hypot(dx, dy));
  const ang = Math.atan2(dy, dx);
  const cylLen = Math.min(len * 0.68, 0.44);

  return (
    <group position={from} rotation={[0, 0, ang - Math.PI / 2]}>
      {/* Vỏ ống lò xo dưới */}
      <mesh position={[0, cylLen * 0.5, 0]} material={bodyMat} castShadow>
        <cylinderGeometry args={[0.044, 0.048, cylLen, 14]} />
      </mesh>
      {/* Ty thép mạ trượt nối liền tới tai máng pháo trên */}
      <mesh position={[0, len * 0.5, 0]} material={rodMat} castShadow>
        <cylinderGeometry args={[0.024, 0.024, len, 12]} />
      </mesh>
      {/* Khớp tai chốt 2 đầu */}
      <mesh rotation={[Math.PI / 2, 0, 0]} material={bodyMat}>
        <cylinderGeometry args={[0.048, 0.048, 0.06, 12]} />
      </mesh>
      <mesh position={[0, len, 0]} rotation={[Math.PI / 2, 0, 0]} material={bodyMat}>
        <cylinderGeometry args={[0.042, 0.042, 0.055, 12]} />
      </mesh>
    </group>
  );
};

/** Tay quay vô-lăng điều chỉnh tầm / hướng có nan hoa & tay nắm đồng. */
const SpokedHandwheel: React.FC<{
  r?: number;
  rimMat: THREE.Material;
  hubMat: THREE.Material;
  brassMat: THREE.Material;
}> = ({ r = 0.16, rimMat, hubMat, brassMat }) => (
  <group>
    <mesh material={rimMat} castShadow>
      <torusGeometry args={[r, 0.014, 10, 28]} />
    </mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]} material={hubMat}>
      <cylinderGeometry args={[0.032, 0.036, 0.045, 12]} />
    </mesh>
    {[0, 1, 2, 3].map((i) => (
      <mesh key={i} rotation={[0, 0, (i * Math.PI) / 2]} material={hubMat}>
        <cylinderGeometry args={[0.009, 0.009, r * 1.95, 8]} />
      </mesh>
    ))}
    <mesh position={[r, 0, 0.048]} rotation={[Math.PI / 2, 0, 0]} material={brassMat}>
      <cylinderGeometry args={[0.013, 0.011, 0.085, 10]} />
    </mesh>
  </group>
);

/** Một viên đạn cao xạ 75mm Nhật (vỏ đồng thau + đầu đạn thép đen + ngòi nổ hẹn giờ mũi đồng). */
const Shell75mm: React.FC<{
  position: [number, number, number];
  rotation?: [number, number, number];
  brassMat: THREE.Material;
  shellMat: THREE.Material;
}> = ({ position, rotation = [0, 0, 0], brassMat, shellMat }) => (
  <group position={position} rotation={rotation}>
    {/* Vỏ liều đồng dài 0.48 m */}
    <mesh position={[0, 0.24, 0]} material={brassMat} castShadow>
      <cylinderGeometry args={[0.041, 0.046, 0.48, 12]} />
    </mesh>
    {/* Vành đáy vỏ đạn */}
    <mesh position={[0, 0.012, 0]} material={brassMat}>
      <cylinderGeometry args={[0.05, 0.05, 0.024, 12]} />
    </mesh>
    {/* Đầu đạn nổ mảnh cao xạ 75mm */}
    <mesh position={[0, 0.59, 0]} material={shellMat} castShadow>
      <cylinderGeometry args={[0.024, 0.038, 0.22, 12]} />
    </mesh>
    {/* Ngòi hẹn giờ cơ khí mũi đồng */}
    <mesh position={[0, 0.73, 0]} material={brassMat}>
      <coneGeometry args={[0.024, 0.065, 12]} />
    </mesh>
  </group>
);

export const Type88Flak: React.FC<Type88FlakProps> = ({
  yaw = 0,
  elev = 0.95,
  recoil = 0,
  sandbags = false,
}) => {
  const elevClamped = clamp(elev, -0.08, 1.48); // Type 88 nâng tối đa +85° (1.48 rad)
  const recoilDist = clamp(recoil, 0, 1) * 0.42;

  // ---------- Vật liệu chuẩn theo yêu cầu ----------
  const mats = useMemo(() => {
    const gunPaint = paint({
      color: PAINT.flakGunGrey,
      camo: ['#3d433b', '#5d6358'],
      repeat: 0.45,
      wear: 0.3,
      dirt: 0.35,
      roughness: 0.54,
      metalness: 0.16,
    });
    const barrelMetal = plain('#363b38', 0.36, 0.58);
    const darkBore = plain('#0c0e0d', 0.95, 0.05);
    const machinedSteel = plain('#9ca3a8', 0.26, 0.82);
    const chromeRod = plain('#cfd6db', 0.18, 0.9);
    const brassMat = plain('#c29b43', 0.34, 0.72);
    const seatLeather = plain('#3a322a', 0.78, 0.12);
    const sightOptic = plain('#1d2326', 0.3, 0.55);
    const crateWood = paint({
      color: '#785c3c',
      camo: ['#684e31', '#886a47'],
      repeat: 1.4,
      wear: 0.18,
      dirt: 0.38,
      roughness: 0.86,
      metalness: 0.04,
      seed: 19,
    });
    const crateIron = plain('#2b2d2a', 0.6, 0.55);
    const bagMats = [
      paint({
        color: '#9b8968',
        camo: ['#8d7b5b', '#aa9876'],
        repeat: 1.6,
        wear: 0.12,
        dirt: 0.42,
        roughness: 0.93,
        metalness: 0.02,
        seed: 31,
      }),
      paint({
        color: '#8e7c5d',
        camo: ['#7f6e50', '#9c8a6a'],
        repeat: 1.6,
        wear: 0.12,
        dirt: 0.46,
        roughness: 0.94,
        metalness: 0.02,
        seed: 47,
      }),
      paint({
        color: '#a89675',
        camo: ['#978566', '#b5a383'],
        repeat: 1.6,
        wear: 0.1,
        dirt: 0.38,
        roughness: 0.92,
        metalness: 0.02,
        seed: 61,
      }),
    ];
    return {
      gunPaint,
      barrelMetal,
      darkBore,
      machinedSteel,
      chromeRod,
      brassMat,
      seatLeather,
      sightOptic,
      crateWood,
      crateIron,
      bagMats,
    };
  }, []);

  // ---------- Hình học cơ khí khẩu pháo & công sự bao cát ----------
  const geos = useMemo(() => {
    // 1. Dầm chân chống chữ I thuôn dài từ tâm r=0.36 ra tới bàn đạp r=2.34 (mép ngoài bàn đạp r=0.175 -> tổng bán kính đúng 2.515 m => Ø 5.03 m!)
    const legWeb = extrude(
      [
        [0.35, 0.04],
        [2.30, 0.03],
        [2.32, 0.105],
        [1.92, 0.135],
        [1.15, 0.215],
        [0.44, 0.285],
        [0.35, 0.285],
      ],
      0.11,
      0.012,
    );
    const legTopFlange = extrude(
      [
        [0.36, 0.268],
        [0.45, 0.268],
        [1.15, 0.198],
        [1.92, 0.118],
        [2.31, 0.088],
        [2.31, 0.114],
        [1.92, 0.144],
        [1.15, 0.224],
        [0.45, 0.294],
        [0.36, 0.294],
      ],
      0.175,
      0.008,
    );

    // 2. Trụ bệ xoay trung tâm đúc côn có gờ bích (dựng đứng dọc +Y từ y=0.36 tới y=1.06)
    const columnPts: P2[] = [
      [0.38, 0.36],
      [0.38, 0.41],
      [0.30, 0.44],
      [0.265, 0.62],
      [0.24, 0.88],
      [0.255, 0.99],
      [0.33, 1.03],
      [0.33, 1.06],
      [0.01, 1.06],
    ];
    const pedestalCol = lathe(columnPts, 32).clone();
    pedestalCol.rotateZ(Math.PI / 2);

    // 3. Má giá pháo đôi hình chữ Y (cheek plates) ôm trọn ổ trục trunnion tại (-0.06, 1.48)
    const cheekPts: P2[] = [];
    // Đáy bắt bu-lông vào bàn xoay trên (y = 1.05)
    cheekPts.push([-0.32, 1.05], [0.27, 1.05], [0.29, 1.15], [0.24, 1.24]);
    // Vòng cung mượt 14 điểm bao quanh ổ trục trunnion (-0.06, 1.48) bán kính 0.135 m
    for (let i = 0; i <= 14; i++) {
      const a = -0.35 + (i / 14) * (Math.PI + 0.7);
      cheekPts.push([TRUNNION_X + Math.cos(a) * 0.135, TRUNNION_Y + Math.sin(a) * 0.135]);
    }
    cheekPts.push([-0.25, 1.32], [-0.34, 1.14]);
    const cheekPlate = extrude(cheekPts, 0.064, 0.012);

    // 4. Cung răng nâng tầm (elevation sector gear arc) tâm đúng tại trunnion (0,0) bán kính 0.33 m
    const arcPts: P2[] = [];
    const rOut = 0.34;
    const rIn = 0.25;
    for (let i = 0; i <= 18; i++) {
      const a = -2.45 + (i / 18) * 2.15;
      arcPts.push([Math.cos(a) * rOut, Math.sin(a) * rOut]);
    }
    for (let i = 18; i >= 0; i--) {
      const a = -2.45 + (i / 18) * 2.15;
      arcPts.push([Math.cos(a) * rIn, Math.sin(a) * rIn]);
    }
    const sectorArc = extrude(arcPts, 0.032, 0.005);

    // 5. Máng trượt đỡ nòng (cradle trough) không giật lùi, dài từ x=-0.50 tới x=+1.16
    const cradleSide = extrude(
      [
        [-0.50, -0.055],
        [1.16, -0.045],
        [1.18, 0.055],
        [-0.48, 0.065],
      ],
      0.032,
      0.006,
    );

    // 6. Ống đẩy về thủy khí (recuperator) nổi bật phía trên nòng đặc trưng của Type 88
    const recupTop = lathe(
      [
        [0.01, -0.44],
        [0.072, -0.42],
        [0.072, 0.36],
        [0.062, 0.40],
        [0.058, 0.94],
        [0.066, 0.96],
        [0.066, 1.00],
        [0.042, 1.02],
        [0.005, 1.02],
      ],
      24,
    );

    // 7. Cụm nòng pháo 75mm L/44 dài đúng 3.21 m (từ mặt trước khóa nòng x = -0.35 m tới miệng nòng x = +2.86 m)
    const barrelPts: P2[] = [
      [0.106, -0.35],
      [0.102, 0.26],
      [0.090, 0.28],
      [0.084, 1.14],
      [0.075, 1.17],
      [0.064, 2.08],
      [0.055, 2.75],
      [0.066, 2.79],
      [0.066, 2.86],
      [0.0375, 2.86], // Cỡ nòng đúng 75 mm (bán kính 0.0375 m)
      [0.0375, 2.54],
      [0.002, 2.54],
    ];
    const barrel = lathe(barrelPts, 36);

    // 8. Tay đỡ ghế xạ thủ hai bên uốn ống thép
    const seatBoomL = pipe(
      [
        [-0.12, 0.64, -0.26],
        [-0.30, 0.66, -0.52],
        [-0.50, 0.73, -0.68],
      ],
      0.024,
      20,
    );
    const seatBoomR = pipe(
      [
        [-0.12, 0.64, 0.26],
        [-0.28, 0.66, 0.52],
        [-0.48, 0.73, 0.68],
      ],
      0.024,
      20,
    );

    // 9. Hàng đinh tán quanh vành mâm xoay & nắp ổ trục
    const baseRivets: [number, number, number][] = Array.from({ length: 16 }, (_, i) => {
      const a = (i / 16) * Math.PI * 2;
      return [Math.cos(a) * 0.355, 0.415, Math.sin(a) * 0.355];
    });

    // 10. Công sự bao cát tròn tự nhiên (5 tầng so le, cao ~0.90 m, đường kính tâm đúng 5.80 m, thoáng trọn 5 bàn đạp chân pháo)
    const pillow = createSandbagPillowGeo();
    const batches: [THREE.BufferGeometry[], THREE.BufferGeometry[], THREE.BufferGeometry[]] = [[], [], []];
    const courses = 5;
    const bagsPerFullCircle = 34;
    let bagIdx = 0;

    for (let c = 0; c < courses; c++) {
      // Hàng dưới xếp đúp 2 vòng chân vững chãi (mặt trong r ≈ 2.64 m cách đều mép ngoài bàn đạp r = 2.515 m)
      const subRows = c === 0 ? [-0.08, 0.16] : c === 1 ? [-0.04, 0.14] : [0.03 - c * 0.02];
      for (let sr = 0; sr < subRows.length; sr++) {
        const radius = 2.90 + subRows[sr];
        const y = 0.088 + c * 0.174;
        const stagger = ((c + sr) % 2) * (Math.PI / bagsPerFullCircle);

        for (let k = 0; k < bagsPerFullCircle; k++) {
          const ang = (k / bagsPerFullCircle) * Math.PI * 2 + stagger;
          // Chừa cửa ra vào cho pháo thủ ở góc phía sau (quanh PI rad, rộng ~38°)
          const distFromRear = Math.abs(Math.atan2(Math.sin(ang - Math.PI), Math.cos(ang - Math.PI)));
          if (distFromRear < 0.33) continue;

          bagIdx++;
          const jR = (rnd(bagIdx * 3 + 1) - 0.5) * 0.045;
          const jYaw = (rnd(bagIdx * 3 + 2) - 0.5) * 0.11;
          const jTilt = (rnd(bagIdx * 3 + 3) - 0.5) * 0.05;
          const sx = 0.94 + rnd(bagIdx * 5) * 0.12;
          const sy = 0.94 + rnd(bagIdx * 7) * 0.12;
          const sz = 0.94 + rnd(bagIdx * 11) * 0.12;

          const rActual = radius + jR;
          const bx = Math.cos(ang) * rActual;
          const bz = Math.sin(ang) * rActual;
          // Đặt chiều dài bao cát tiếp tuyến với vòng tròn (xoay quanh Y góc -ang + PI/2)
          const m = mat4([bx, y, bz], [jTilt, -ang + Math.PI / 2 + jYaw, jTilt * 0.6], [sx, sy, sz]);
          const bucket = Math.floor(rnd(bagIdx * 13) * 3) % 3;
          batches[bucket].push(pillow.clone().applyMatrix4(m));
        }
      }
    }

    // Thêm bao cát khóa đầu hồi hai bên cửa vào khớp liền mạch với thân tường tròn
    for (const side of [-1, 1] as const) {
      const gateAng = Math.PI + side * 0.335;
      for (let c = 0; c < 5; c++) {
        bagIdx++;
        const rGate = 2.86 - c * 0.015;
        const m = mat4(
          [Math.cos(gateAng) * rGate, 0.088 + c * 0.174, Math.sin(gateAng) * rGate],
          [0, -gateAng + (c % 2 === 0 ? 0.08 : Math.PI / 2), 0],
          [0.92, 0.96, 0.96],
        );
        batches[(c + (side === 1 ? 1 : 0)) % 3].push(pillow.clone().applyMatrix4(m));
      }
    }

    const sandbagMeshes = batches.map((list) => merge(list));

    return {
      legWeb,
      legTopFlange,
      pedestalCol,
      cheekPlate,
      sectorArc,
      cradleSide,
      recupTop,
      barrel,
      seatBoomL,
      seatBoomR,
      baseRivets,
      sandbagMeshes,
    };
  }, []);

  // Toạ độ tai gắn ống cân bằng trên máng pháo xoay theo góc elev (trong hệ quy chiếu bệ trên)
  const eqUpperX = TRUNNION_X + Math.cos(elevClamped) * 0.36 - Math.sin(elevClamped) * -0.07;
  const eqUpperY = TRUNNION_Y + Math.sin(elevClamped) * 0.36 + Math.cos(elevClamped) * -0.07;

  return (
    <group>
      {/* ==================== 1. ĐẾ 5 CHÂN CHỐNG SAO XOÈ RỘNG Ø 5.03 m TẠI Y = 0 ==================== */}
      <group>
        {/* Đĩa đế thép trung tâm & bầu ổ trục dưới */}
        <mesh position={[0, 0.025, 0]} material={mats.gunPaint} castShadow receiveShadow>
          <cylinderGeometry args={[0.47, 0.50, 0.05, 28]} />
        </mesh>
        <mesh position={[0, 0.21, 0]} material={mats.gunPaint} castShadow receiveShadow>
          <cylinderGeometry args={[0.37, 0.44, 0.32, 28]} />
        </mesh>
        <Rivets points={geos.baseRivets} r={0.015} color="#343832" />

        {/* 5 chân chống toả đều mỗi 72°, tâm bàn đạp tại r = 2.34 m + bán kính bàn đạp 0.175 m = đúng 2.515 m (Ø 5.03 m) */}
        {[0, 1, 2, 3, 4].map((i) => {
          const ang = (i * Math.PI * 2) / 5;
          return (
            <group key={i} rotation={[0, ang, 0]}>
              {/* Tai bản lề gấp chân ở gốc r = 0.38 m */}
              <mesh position={[0.38, 0.18, 0]} geometry={rbox(0.14, 0.28, 0.20, 0.02)} material={mats.gunPaint} castShadow />
              <mesh position={[0.38, 0.33, 0]} material={mats.machinedSteel}>
                <cylinderGeometry args={[0.024, 0.024, 0.06, 10]} />
              </mesh>

              {/* Dầm thép chữ I vươn ra ngoài */}
              <mesh geometry={geos.legWeb} material={mats.gunPaint} castShadow receiveShadow />
              <mesh geometry={geos.legTopFlange} material={mats.gunPaint} castShadow />
              <mesh position={[1.34, 0.028, 0]} geometry={rbox(1.94, 0.026, 0.175, 0.006)} material={mats.gunPaint} receiveShadow />

              {/* Thanh giằng chéo khoá cứng giữa các chân gần bầu trung tâm */}
              <mesh
                position={[0.64, 0.12, 0.22]}
                rotation={[0, -0.58, 0]}
                geometry={rbox(0.56, 0.045, 0.045, 0.01)}
                material={mats.gunPaint}
                castShadow
              />

              {/* Bàn đạp tròn ghim đất (r = 0.175 m tại x = 2.34 m => mép ngoài đúng 2.515 m) + vít kích cân bằng & cọc ghim */}
              <group position={[2.34, 0, 0]}>
                <mesh position={[0, 0.02, 0]} material={mats.gunPaint} castShadow receiveShadow>
                  <cylinderGeometry args={[0.165, 0.175, 0.04, 20]} />
                </mesh>
                {/* Trụ vít kích thăng bằng có tay vặn chữ T */}
                <mesh position={[-0.04, 0.14, 0]} material={mats.gunPaint} castShadow>
                  <cylinderGeometry args={[0.042, 0.048, 0.20, 12]} />
                </mesh>
                <mesh position={[-0.04, 0.26, 0]} material={mats.machinedSteel}>
                  <cylinderGeometry args={[0.018, 0.018, 0.10, 10]} />
                </mesh>
                <mesh position={[-0.04, 0.30, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.machinedSteel}>
                  <cylinderGeometry args={[0.01, 0.01, 0.18, 8]} />
                </mesh>
                {/* Đầu cọc thép đóng ghim xuống đất */}
                <mesh position={[0.065, 0.09, 0]} material={mats.barrelMetal} castShadow>
                  <cylinderGeometry args={[0.024, 0.02, 0.15, 10]} />
                </mesh>
                <mesh position={[0.065, 0.17, 0]} material={mats.machinedSteel}>
                  <cylinderGeometry args={[0.036, 0.036, 0.022, 10]} />
                </mesh>
              </group>
            </group>
          );
        })}
      </group>

      {/* ==================== 2. TRỤ BỆ & KHỐI GIÁ PHÁO TRÊN XOAY THEO YAW ==================== */}
      <group rotation={[0, yaw, 0]}>
        {/* Trụ cột bệ xoay đúc thép */}
        <mesh geometry={geos.pedestalCol} material={mats.gunPaint} castShadow receiveShadow />

        {/* Bàn mâm trên + xà ngang phía trước (để trống khoang sau cho khóa nòng chúc xuống khi bắn góc cao) */}
        <mesh position={[-0.02, 1.055, 0]} geometry={rbox(0.62, 0.06, 0.58, 0.018)} material={mats.gunPaint} castShadow />
        <mesh position={[0.14, 1.18, 0]} geometry={rbox(0.22, 0.20, 0.44, 0.02)} material={mats.gunPaint} castShadow />

        {/* Hai má giá pháo chữ Y (z = ±0.25 m) + nắp ổ trục trunnion bắt bu-lông */}
        {([-1, 1] as const).map((s) => (
          <group key={s}>
            <mesh position={[0, 0, s * 0.25]} geometry={geos.cheekPlate} material={mats.gunPaint} castShadow receiveShadow />
            {/* Gối ổ trục trunnion dày khoá chặt trục nâng nòng */}
            <mesh
              position={[TRUNNION_X, TRUNNION_Y, s * 0.29]}
              rotation={[Math.PI / 2, 0, 0]}
              material={mats.gunPaint}
              castShadow
            >
              <cylinderGeometry args={[0.115, 0.115, 0.045, 20]} />
            </mesh>
            <mesh
              position={[TRUNNION_X, TRUNNION_Y, s * 0.318]}
              rotation={[Math.PI / 2, 0, 0]}
              material={mats.machinedSteel}
            >
              <cylinderGeometry args={[0.055, 0.055, 0.025, 14]} />
            </mesh>

            {/* Cặp ống lò xo cân bằng (equilibrators) nối liền động học từ tai dưới lên máng pháo trên */}
            <TelescopingEquilibrator
              from={[0.21, 1.15, s * 0.305]}
              to={[eqUpperX, eqUpperY, s * 0.305]}
              bodyMat={mats.gunPaint}
              rodMat={mats.chromeRod}
            />
          </group>
        ))}

        {/* Trục ngang trunnion thép xuyên suốt hai má giá pháo (không bao giờ hở khớp) */}
        <mesh position={[TRUNNION_X, TRUNNION_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.machinedSteel} castShadow>
          <cylinderGeometry args={[0.072, 0.072, 0.60, 20]} />
        </mesh>

        {/* Hộp số hướng/tầm, vô-lăng tay quay & tang trống đồng hồ phần tử bắn cao xạ hai bên */}
        {/* Bên trái (-Z): Xạ thủ hướng + tang trống chỉ thị kim đồng + vô-lăng hướng */}
        <group>
          <mesh position={[-0.12, 1.22, -0.33]} geometry={rbox(0.24, 0.20, 0.12, 0.02)} material={mats.gunPaint} castShadow />
          <group position={[-0.22, 1.16, -0.44]} rotation={[0.35, 0.2, 0]}>
            <SpokedHandwheel r={0.155} rimMat={mats.machinedSteel} hubMat={mats.gunPaint} brassMat={mats.brassMat} />
          </group>
          {/* Tang trống đồng hồ nhận phần tử bắn đặc trưng của Type 88 */}
          <mesh position={[0.08, 1.40, -0.37]} rotation={[Math.PI / 2, 0, 0]} material={mats.gunPaint} castShadow>
            <cylinderGeometry args={[0.115, 0.115, 0.15, 20]} />
          </mesh>
          <mesh position={[0.08, 1.40, -0.448]} rotation={[Math.PI / 2, 0, 0]} material={mats.brassMat}>
            <cylinderGeometry args={[0.095, 0.095, 0.012, 20]} />
          </mesh>
        </group>

        {/* Bên phải (+Z): Xạ thủ tầm + hộp cài ngòi hẹn giờ cơ khí + vô-lăng tầm */}
        <group>
          <mesh position={[-0.08, 1.24, 0.33]} geometry={rbox(0.24, 0.22, 0.12, 0.02)} material={mats.gunPaint} castShadow />
          <group position={[-0.14, 1.20, 0.45]} rotation={[-Math.PI / 2 + 0.25, 0, 0]}>
            <SpokedHandwheel r={0.165} rimMat={mats.machinedSteel} hubMat={mats.gunPaint} brassMat={mats.brassMat} />
          </group>
          {/* Ổ máy vặn ngòi nổ hẹn giờ cho đạn 75mm */}
          <mesh position={[0.19, 1.28, 0.39]} rotation={[0, 0, -0.35]} material={mats.gunPaint} castShadow>
            <cylinderGeometry args={[0.075, 0.082, 0.22, 16]} />
          </mesh>
          <mesh position={[0.23, 1.38, 0.39]} rotation={[0, 0, -0.35]} material={mats.brassMat}>
            <cylinderGeometry args={[0.055, 0.065, 0.04, 16]} />
          </mesh>
        </group>

        {/* Ghế xạ thủ hai bên (ghế dập thép bọc đệm tối + cần đỡ ống thép + gác chân) */}
        <mesh geometry={geos.seatBoomL} material={mats.gunPaint} castShadow />
        <mesh geometry={geos.seatBoomR} material={mats.gunPaint} castShadow />
        {([
          [-0.52, 0.74, -0.68, -0.22],
          [-0.50, 0.74, 0.68, 0.22],
        ] as const).map(([sx, sy, sz, rotY], idx) => (
          <group key={idx} position={[sx, sy, sz]} rotation={[0, rotY, 0]}>
            <mesh geometry={rbox(0.32, 0.045, 0.34, 0.02)} material={mats.seatLeather} castShadow />
            <mesh position={[-0.15, 0.14, 0]} rotation={[0, 0, 0.18]} geometry={rbox(0.035, 0.24, 0.28, 0.012)} material={mats.gunPaint} />
            <mesh position={[0.28, -0.22, 0]} geometry={rbox(0.08, 0.025, 0.26, 0.008)} material={mats.gunPaint} />
          </group>
        ))}

        {/* ==================== 3. CỤM MÁNG LÙI, KÍNH NGẮM & NÒNG 75mm L/44 NÂNG THEO ELEV ==================== */}
        <group position={[TRUNNION_X, TRUNNION_Y, 0]} rotation={[0, 0, elevClamped]}>
          {/* Hai cung răng nâng tầm ăn khớp thẳng xuống hộp số giữa hai má giá pháo */}
          {([-1, 1] as const).map((s) => (
            <mesh key={s} position={[0, 0, s * 0.185]} geometry={geos.sectorArc} material={mats.machinedSteel} castShadow />
          ))}

          {/* Máng trượt đỡ nòng chữ U (cố định theo góc nâng, không giật lùi) + thanh ray đồng */}
          <mesh position={[0.33, -0.055, 0]} geometry={rbox(1.68, 0.036, 0.28, 0.01)} material={mats.gunPaint} castShadow />
          {([-1, 1] as const).map((s) => (
            <group key={s}>
              <mesh position={[0, 0, s * 0.135]} geometry={geos.cradleSide} material={mats.gunPaint} castShadow />
              <mesh position={[0.34, 0.062, s * 0.125]} geometry={rbox(1.64, 0.018, 0.036, 0.004)} material={mats.brassMat} />
            </group>
          ))}

          {/* Cặp xi-lanh hãm giật thủy lực đôi nằm dưới máng pháo */}
          {([-1, 1] as const).map((s) => (
            <group key={s} position={[0.29, -0.015, s * 0.072]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.gunPaint} castShadow>
                <cylinderGeometry args={[0.044, 0.046, 1.54, 16]} />
              </mesh>
              <mesh position={[0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.machinedSteel}>
                <cylinderGeometry args={[0.032, 0.036, 0.05, 12]} />
              </mesh>
            </group>
          ))}

          {/* Ống đẩy về thủy khí lớn nằm phía trên nòng + 2 đai ôm giữ cố định vào máng lùi */}
          <mesh position={[0, 0.235, 0]} geometry={geos.recupTop} material={mats.gunPaint} castShadow />
          {[-0.12, 0.66].map((bx, k) => (
            <mesh key={k} position={[bx, 0.135, 0]} geometry={rbox(0.09, 0.30, 0.23, 0.02)} material={mats.gunPaint} castShadow />
          ))}

          {/* Máy ngắm quang học khuỷu gấp (elbow telescopes) gắn hai bên trục trunnion nghiêng theo tầm bắn */}
          {([-1, 1] as const).map((s) => (
            <group key={s} position={[-0.04, 0.14, s * 0.38]}>
              <mesh position={[0, -0.08, -s * 0.06]} geometry={rbox(0.08, 0.16, 0.12, 0.015)} material={mats.gunPaint} />
              <mesh rotation={[0, 0, Math.PI / 2]} material={mats.sightOptic} castShadow>
                <cylinderGeometry args={[0.022, 0.026, 0.38, 12]} />
              </mesh>
              {/* Thị kính gập ngang cho pháo thủ ngắm */}
              <mesh position={[-0.16, -0.03, s * 0.06]} rotation={[Math.PI / 2, 0, 0]} material={mats.sightOptic}>
                <cylinderGeometry args={[0.02, 0.018, 0.12, 10]} />
              </mesh>
            </group>
          ))}

          {/* --- CỤM NÒNG 75mm L/44 (3.21 m) & KHÓA NÒNG GIẬT LÙI DỌC TRỤC THEO RECOIL --- */}
          <group position={[-recoilDist, 0.095, 0]}>
            {/* Nòng 75mm L/44 dài đúng 3.21 m (x = -0.35..+2.86) */}
            <mesh geometry={geos.barrel} material={mats.barrelMetal} castShadow receiveShadow />
            {/* Lòng nòng 75mm tối sâu bên trong miệng pháo */}
            <mesh position={[2.70, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.darkBore}>
              <cylinderGeometry args={[0.0365, 0.0365, 0.31, 18]} />
            </mesh>

            {/* Khối đuôi khóa nòng chữ nhật & nêm khóa nòng trượt ngang bán tự động (x = -0.82..-0.35) */}
            <mesh position={[-0.585, 0, 0]} geometry={rbox(0.47, 0.24, 0.24, 0.024)} material={mats.gunPaint} castShadow />
            <mesh position={[-0.60, 0, 0.015]} geometry={rbox(0.24, 0.19, 0.265, 0.01)} material={mats.machinedSteel} castShadow />
            {/* Tai nối trên khóa nòng kéo ty piston mạ crôm từ ống đẩy về */}
            <mesh position={[-0.45, 0.14, 0]} geometry={rbox(0.16, 0.12, 0.11, 0.015)} material={mats.gunPaint} />
            <mesh position={[-0.36, 0.14, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.chromeRod}>
              <cylinderGeometry args={[0.028, 0.028, 0.52, 12]} />
            </mesh>
            {/* Cần gạt mở khóa nòng tay phải */}
            <mesh position={[-0.52, 0.13, 0.15]} rotation={[0.3, 0, -0.45]} geometry={rbox(0.03, 0.26, 0.025, 0.008)} material={mats.machinedSteel} />

            {/* Máng nạp đạn kim loại phía sau khóa nòng (x = -1.06..-0.80) */}
            <mesh position={[-0.93, -0.055, 0]} geometry={rbox(0.28, 0.025, 0.15, 0.006)} material={mats.machinedSteel} castShadow />
            {([-1, 1] as const).map((s) => (
              <mesh
                key={s}
                position={[-0.93, -0.02, s * 0.072]}
                geometry={rbox(0.28, 0.06, 0.018, 0.004)}
                material={mats.machinedSteel}
              />
            ))}
          </group>
        </group>
      </group>

      {/* ==================== 4. CÔNG SỰ BAO CÁT TRÒN Ø 5.8 m & THÙNG ĐẠN GỖ (KHI SANDBAGS = TRUE) ==================== */}
      {sandbags && (
        <group>
          {/* 3 lô bao cát vải bố gộp lưới tối ưu hiệu năng */}
          {geos.sandbagMeshes.map((bg, i) => (
            <mesh key={i} geometry={bg} material={mats.bagMats[i]} castShadow receiveShadow />
          ))}

          {/* Cụm hòm đạn gỗ 75mm bên khe trống chân chống sau-trái (1 hòm mở nắp lộ 4 viên đạn đồng + 1 hòm đóng) */}
          <group position={[-1.42, 0, -1.36]} rotation={[0, 0.62, 0]}>
            {/* Hòm đạn dưới đóng kín */}
            <mesh position={[0, 0.13, 0]} geometry={rbox(0.92, 0.26, 0.36, 0.012)} material={mats.crateWood} castShadow receiveShadow />
            {[-0.4, 0.4].map((cx, k) => (
              <mesh key={k} position={[cx, 0.13, 0]} geometry={rbox(0.035, 0.268, 0.368, 0.004)} material={mats.crateIron} />
            ))}

            {/* Hòm đạn mở nắp đặt lệch bên cạnh, xếp 4 viên đạn cao xạ 75mm nằm ngang */}
            <group position={[0.08, 0, 0.44]} rotation={[0, -0.18, 0]}>
              <mesh position={[0, 0.02, 0]} geometry={rbox(0.92, 0.04, 0.36, 0.008)} material={mats.crateWood} receiveShadow />
              <mesh position={[0, 0.11, -0.165]} geometry={rbox(0.92, 0.18, 0.03, 0.006)} material={mats.crateWood} castShadow />
              <mesh position={[0, 0.11, 0.165]} geometry={rbox(0.92, 0.18, 0.03, 0.006)} material={mats.crateWood} castShadow />
              <mesh position={[-0.445, 0.11, 0]} geometry={rbox(0.03, 0.18, 0.36, 0.006)} material={mats.crateWood} castShadow />
              <mesh position={[0.445, 0.11, 0]} geometry={rbox(0.03, 0.18, 0.36, 0.006)} material={mats.crateWood} castShadow />
              {/* Nắp hòm gỗ mở tựa ra sau */}
              <mesh position={[0, 0.24, -0.25]} rotation={[-1.05, 0, 0]} geometry={rbox(0.92, 0.028, 0.35, 0.006)} material={mats.crateWood} castShadow />
              {[-0.11, -0.037, 0.037, 0.11].map((sz, k) => (
                <Shell75mm
                  key={k}
                  position={[-0.38, 0.085, sz]}
                  rotation={[0, 0, -Math.PI / 2]}
                  brassMat={mats.brassMat}
                  shellMat={mats.barrelMetal}
                />
              ))}
            </group>
          </group>

          {/* Cụm hòm đạn dự trữ & 2 viên đạn 75mm dựng sẵn bên khe sau-phải cho pháo thủ nạp đạn */}
          <group position={[-1.48, 0, 1.28]} rotation={[0, -0.72, 0]}>
            <mesh position={[0, 0.13, 0]} geometry={rbox(0.92, 0.26, 0.36, 0.012)} material={mats.crateWood} castShadow receiveShadow />
            <mesh position={[0.04, 0.39, -0.02]} rotation={[0, 0.08, 0]} geometry={rbox(0.92, 0.26, 0.36, 0.012)} material={mats.crateWood} castShadow />
            {[-0.4, 0.4].map((cx, k) => (
              <mesh key={k} position={[cx, 0.13, 0]} geometry={rbox(0.035, 0.268, 0.368, 0.004)} material={mats.crateIron} />
            ))}
            <Shell75mm position={[0.58, 0, -0.08]} brassMat={mats.brassMat} shellMat={mats.barrelMetal} />
            <Shell75mm position={[0.66, 0, 0.06]} brassMat={mats.brassMat} shellMat={mats.barrelMetal} />
          </group>
        </group>
      )}
    </group>
  );
};

export const preview = turntable(
  () => <Type88Flak yaw={0.3} elev={0.85} sandbags />,
  { size: 6.2, center: [0, 1.4, 0] },
);

export default Type88Flak;
