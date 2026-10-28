// Bộ mô hình mục tiêu mặt đất tỉ lệ thật (mét) cho các cảnh trinh sát & tấn công (S06, S10):
// 1. FortifiedBunker: Công sự chỉ huy bê tông cốt thép kiên cố (8.5 x 7.0 x 3.2 m) + hào bao Hesco + cột radar xoay `dishYaw`.
// 2. TacticalTruck: Xe tải quân sự cơ động 6x6 (7.2 x 2.5 x 2.9 m) + 6 bánh `Wheel` lăn theo `travel`.
import React, { useMemo } from 'react';
import { extrude, extrudeTop, lathe, pipe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';

export const FortifiedBunker: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  dishYaw?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], dishYaw = 0.5 }) => {
  // Khối bê tông chính tường vát chống mảnh đạn (dài 6.8 m, rộng 5.8 m, cao 2.45 m)
  const mainShell = useMemo(
    () =>
      extrude(
        [
          [-3.4, 0],
          [3.4, 0],
          [2.75, 2.35],
          [-2.85, 2.35],
        ],
        5.8,
        0.12,
      ),
    [],
  );

  // Mái bê tông dày nhô gờ bảo vệ lỗ châu mai
  const roofCap = useMemo(
    () =>
      extrudeTop(
        [
          [-2.95, -2.65],
          [2.1, -2.65],
          [2.95, -1.7],
          [2.95, 1.7],
          [2.1, 2.65],
          [-2.95, 2.65],
        ],
        0.48,
        0.08,
      ),
    [],
  );

  // Vòm tháp quan sát trên nóc
  const cupolaGeo = useMemo(
    () =>
      extrudeTop(
        [
          [-1.1, -1.1],
          [0.9, -1.1],
          [1.3, -0.45],
          [1.3, 0.45],
          [0.9, 1.1],
          [-1.1, 1.1],
        ],
        0.72,
        0.06,
      ),
    [],
  );

  // Chảo radar liên lạc trên nóc (tiện tròn dọc +X)
  const dishGeo = useMemo(
    () =>
      lathe(
        [
          [0.04, 0],
          [0.24, 0.05],
          [0.48, 0.16],
          [0.64, 0.32],
          [0.6, 0.34],
          [0.2, 0.09],
          [0.02, 0.04],
        ],
        24,
      ),
    [],
  );

  const concretePaint = paint({
    color: '#a3937e',
    camo: ['#8f806c', '#b5a58f'],
    camoScale: 1.0,
    wear: 0.25,
    dirt: 0.34,
    roughness: 0.88,
    metalness: 0.08,
    repeat: 0.4,
    seed: 201,
  });
  const armorPaint = paint({
    color: '#5a5850',
    camo: ['#4c4a43', '#6b675c'],
    wear: 0.28,
    dirt: 0.24,
    roughness: 0.62,
    metalness: 0.5,
    repeat: 0.5,
    seed: 202,
  });
  const hescoPaint = paint({
    color: '#c4a87e',
    camo: ['#ae9269', '#d1b78f'],
    wear: 0.16,
    dirt: 0.3,
    roughness: 0.92,
    metalness: 0.05,
    repeat: 0.6,
    seed: 203,
  });
  const slitDark = plain('#121316', 0.9, 0.1);
  const mastMetal = plain('#6d7378', 0.48, 0.65);

  return (
    <group position={position} rotation={rotation}>
      {/* Khối thân bê tông cốt thép & Mái chống bom */}
      <mesh geometry={mainShell} material={concretePaint} castShadow receiveShadow />
      <mesh position={[0, 2.25, 0]} geometry={roofCap} material={concretePaint} castShadow receiveShadow />

      {/* Tấm giáp thép gia cố mặt trên & Tháp quan sát chỉ huy */}
      <mesh position={[-0.4, 2.73, 0]} geometry={cupolaGeo} material={concretePaint} castShadow receiveShadow />
      <mesh position={[-0.35, 3.46, 0]} geometry={rbox(2.1, 0.12, 1.9, 0.03)} material={armorPaint} castShadow />

      {/* Khe bắn / lỗ châu mai tối sâu + Mái hắt thép che mảnh đạn ở 3 mặt */}
      <mesh position={[2.98, 1.68, 0]} geometry={rbox(0.36, 0.28, 2.7, 0.02)} material={slitDark} />
      <mesh position={[3.04, 1.88, 0]} geometry={rbox(0.46, 0.1, 2.95, 0.02)} material={armorPaint} castShadow />
      <mesh position={[0.2, 1.68, 2.86]} geometry={rbox(2.9, 0.28, 0.34, 0.02)} material={slitDark} />
      <mesh position={[0.2, 1.88, 2.92]} geometry={rbox(3.15, 0.1, 0.44, 0.02)} material={armorPaint} castShadow />
      <mesh position={[0.2, 1.68, -2.86]} geometry={rbox(2.9, 0.28, 0.34, 0.02)} material={slitDark} />
      <mesh position={[0.2, 1.88, -2.92]} geometry={rbox(3.15, 0.1, 0.44, 0.02)} material={armorPaint} castShadow />
      <mesh position={[0.56, 3.08, 0]} geometry={rbox(1.02, 0.22, 1.54, 0.02)} material={slitDark} />

      {/* Cửa thép hầm ngầm phía sau (-X) + Khung dầm chữ U */}
      <mesh position={[-3.12, 1.05, 0]} geometry={rbox(0.35, 2.05, 1.75, 0.04)} material={armorPaint} castShadow />
      <mesh position={[-3.32, 1.0, 0]} geometry={rbox(0.08, 1.82, 1.42, 0.02)} material={ concretePaint } />
      <mesh position={[-3.35, 1.0, 0]} geometry={rbox(0.08, 1.76, 1.34, 0.02)} material={armorPaint} />

      {/* Ống thông gió lọc khí hầm ngầm */}
      {[-1.4, -2.0].map((x, idx) => (
        <group key={idx} position={[x, 2.75, -1.75]}>
          <mesh position={[0, 0.35, 0]} material={armorPaint} castShadow>
            <cylinderGeometry args={[0.16, 0.18, 0.7, 14]} />
          </mesh>
          <mesh position={[0, 0.72, 0]} material={armorPaint} castShadow>
            <coneGeometry args={[0.28, 0.18, 14]} />
          </mesh>
        </group>
      ))}

      {/* Dãy rọ đá chống nổ Hesco bao quanh chân công sự */}
      {[-2.4, -1.2, 0, 1.2, 2.4].map((z, i) => (
        <React.Fragment key={i}>
          <mesh position={[4.15, 0.62, z]} geometry={rbox(1.05, 1.24, 1.12, 0.06)} material={hescoPaint} castShadow receiveShadow />
        </React.Fragment>
      ))}
      {[-2.2, -1.0, 0.2, 1.4, 2.6].map((x, i) => (
        <React.Fragment key={i}>
          <mesh position={[x, 0.62, 3.65]} geometry={rbox(1.12, 1.24, 1.05, 0.06)} material={hescoPaint} castShadow receiveShadow />
          <mesh position={[x, 0.62, -3.65]} geometry={rbox(1.12, 1.24, 1.05, 0.06)} material={hescoPaint} castShadow receiveShadow />
        </React.Fragment>
      ))}

      {/* Cột anten & Chảo Radar liên lạc xoay trên nóc */}
      <group position={[-0.6, 3.52, 0.35]}>
        <mesh position={[0, 0.65, 0]} material={mastMetal} castShadow>
          <cylinderGeometry args={[0.07, 0.11, 1.3, 12]} />
        </mesh>
        <group position={[0, 1.32, 0]} rotation={[0, dishYaw, -0.18]}>
          <mesh geometry={dishGeo} material={mastMetal} castShadow />
          <mesh position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={armorPaint}>
            <cylinderGeometry args={[0.025, 0.025, 0.42, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
};

export const TacticalTruck: React.FC<{
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Quãng đường xe chạy (m) để 6 bánh lăn khớp mặt đất */
  travel?: number;
}> = ({ position = [0, 0, 0], rotation = [0, 0, 0], travel = 0 }) => {
  const wheelR = 0.54;
  const spin = travel / wheelR;

  // Biên dạng nhìn ngang Cabin đầu xe tải quân sự 6x6 (x từ +1.15 tới +3.55, đáy y=0.68)
  const cabGeo = useMemo(
    () =>
      extrude(
        [
          [1.12, 0.72],
          [3.48, 0.72],
          [3.56, 1.48],
          [2.72, 1.66],
          [2.32, 2.58],
          [1.12, 2.6],
        ],
        2.36,
        0.08,
      ),
    [],
  );

  // Thùng hàng quân sự có mui vòm gân khung sườn (x từ -3.55 tới +0.98)
  const cargoCanopy = useMemo(
    () =>
      extrude(
        [
          [-3.52, 1.42],
          [0.96, 1.42],
          [0.96, 2.66],
          [0.5, 2.92],
          [-3.06, 2.92],
          [-3.52, 2.66],
        ],
        2.44,
        0.07,
      ),
    [],
  );

  const exhaustPipe = useMemo(
    () =>
      pipe(
        [
          [1.04, 0.78, -1.05],
          [1.04, 1.4, -1.24],
          [1.04, 2.86, -1.24],
          [0.95, 2.98, -1.24],
        ],
        0.052,
        20,
      ),
    [],
  );

  const rivetPts = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 9; i++) {
      const x = -3.3 + i * 0.52;
      pts.push([x, 1.15, 1.24], [x, 1.15, -1.24]);
    }
    return pts;
  }, []);

  const desertBody = paint({
    color: '#c9ac7e',
    camo: ['#ae9062', '#877150'],
    camoScale: 0.9,
    wear: 0.2,
    dirt: 0.28,
    roughness: 0.68,
    metalness: 0.22,
    repeat: 0.38,
    seed: 211,
  });
  const canvasMat = paint({
    color: '#a8926b',
    camo: ['#947f59', '#b8a27b'],
    camoScale: 1.0,
    wear: 0.14,
    dirt: 0.24,
    roughness: 0.9,
    metalness: 0.05,
    repeat: 0.38,
    seed: 212,
  });
  const chassisMat = plain('#2c2e30', 0.65, 0.55);
  const glassMat = plain('#1c2d38', 0.14, 0.85);
  const headlightMat = plain('#fff2cc', 0.15, 0.3);

  const axles = [2.35, -1.35, -2.65];

  return (
    <group position={position} rotation={rotation}>
      {/* Khung gầm sắt-xi dọc + Cản trước thép + Bình dầu phụ */}
      <mesh position={[0, 0.64, 0]} geometry={rbox(7.1, 0.24, 1.16, 0.03)} material={chassisMat} castShadow />
      <mesh position={[3.6, 0.68, 0]} geometry={rbox(0.22, 0.34, 2.46, 0.04)} material={chassisMat} castShadow />
      <mesh position={[0.35, 0.72, 1.02]} geometry={rbox(1.15, 0.44, 0.46, 0.08)} material={chassisMat} castShadow />
      <mesh position={[0.35, 0.72, -1.02]} rotation={[0, 0, Math.PI / 2]} material={chassisMat} castShadow>
        <cylinderGeometry args={[0.23, 0.23, 1.1, 16]} />
      </mesh>

      {/* Cabin đầu xe + Kính chắn gió đôi nổi rõ + Kính cửa hông + Lưới tản nhiệt + Đèn pha */}
      <mesh geometry={cabGeo} material={desertBody} castShadow receiveShadow />
      <mesh position={[2.62, 2.11, 0.56]} rotation={[0, 0, 0.41]} geometry={rbox(0.08, 0.66, 0.94, 0.02)} material={glassMat} />
      <mesh position={[2.62, 2.11, -0.56]} rotation={[0, 0, 0.41]} geometry={rbox(0.08, 0.66, 0.94, 0.02)} material={glassMat} />
      <mesh position={[2.44, 2.52, 0]} geometry={rbox(0.24, 0.08, 2.34, 0.02)} material={chassisMat} castShadow />
      <mesh position={[1.82, 2.08, 1.19]} geometry={rbox(0.95, 0.56, 0.05, 0.02)} material={glassMat} />
      <mesh position={[1.82, 2.08, -1.19]} geometry={rbox(0.95, 0.56, 0.05, 0.02)} material={glassMat} />
      {/* Gương chiếu hậu hai bên cabin */}
      <mesh position={[2.48, 2.05, 1.32]} geometry={rbox(0.08, 0.36, 0.16, 0.02)} material={chassisMat} />
      <mesh position={[2.48, 2.05, -1.32]} geometry={rbox(0.08, 0.36, 0.16, 0.02)} material={chassisMat} />
      {/* Nắp cửa nóc trưởng xe */}
      <mesh position={[1.75, 2.64, 0.45]} material={desertBody} castShadow>
        <cylinderGeometry args={[0.36, 0.38, 0.1, 18]} />
      </mesh>
      {/* Lưới tản nhiệt & Đèn pha nổi phía trước */}
      <mesh position={[3.57, 1.14, 0]} geometry={rbox(0.08, 0.52, 1.36, 0.02)} material={chassisMat} />
      {[-0.92, 0.92].map((z, i) => (
        <mesh key={i} position={[3.58, 1.06, z]} rotation={[0, 0, Math.PI / 2]} material={headlightMat}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
        </mesh>
      ))}
      <mesh geometry={exhaustPipe} material={chassisMat} castShadow />

      {/* Thùng xe tải quân sự & Bạt mui có sườn gân */}
      <mesh position={[-1.28, 1.12, 0]} geometry={rbox(4.56, 0.68, 2.48, 0.04)} material={desertBody} castShadow receiveShadow />
      <mesh geometry={cargoCanopy} material={canvasMat} castShadow receiveShadow />
      {[-3.1, -2.2, -1.3, -0.4, 0.5].map((x, i) => (
        <mesh key={i} position={[x, 2.18, 0]} geometry={rbox(0.07, 1.54, 2.48, 0.03)} material={desertBody} />
      ))}
      <Rivets points={rivetPts} r={0.014} color="#584c38" />

      {/* 6 Bánh xe địa hình lớn (3 cầu 6x6, chạm đúng mặt phẳng y = 0) */}
      {axles.map((ax, idx) => (
        <React.Fragment key={idx}>
          <mesh position={[ax, wheelR, 0]} rotation={[Math.PI / 2, 0, 0]} material={chassisMat}>
            <cylinderGeometry args={[0.07, 0.07, 2.1, 10]} />
          </mesh>
          <Wheel r={wheelR} width={0.34} spin={spin} position={[ax, wheelR, 1.06]} rim="#8f7854" tire="#222325" bolts={8} />
          <group position={[ax, wheelR, -1.06]} scale={[1, 1, -1]}>
            <Wheel r={wheelR} width={0.34} spin={spin} rim="#8f7854" tire="#222325" bolts={8} />
          </group>
        </React.Fragment>
      ))}
    </group>
  );
};
