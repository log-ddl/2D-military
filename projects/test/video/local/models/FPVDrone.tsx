// Mô hình 3D riêng của dự án `test`: FPV Quadcopter chiến thuật mang đầu đạn chống tăng nổ lõm PG-7V.
// Khung carbon chữ X sải cánh 0.58 m, tổng chiều dài cả đầu đạn 0.74 m. Mũi hướng +X, trên +Y.
import React, { useMemo } from 'react';
import { extrudeTop, lathe, pipe, rbox, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';

export type FPVDroneProps = {
  /** Góc quay 4 cánh quạt (rad). */
  rotorSpin?: number;
  /** Góc nghiêng camera FPV ở mũi (rad). */
  cameraPitch?: number;
};

// Biên dạng tấm khung carbon trung tâm (X-Z)
const FRAME_TOP: P2[] = [
  [-0.17, -0.045],
  [0.16, -0.04],
  [0.19, 0.0],
  [0.16, 0.04],
  [-0.17, 0.045],
];

// Biên dạng quả đạn chống tăng nổ lõm PG-7V buộc dưới bụng drone (tiện dọc trục +X, khép kín hai đầu)
const PG7_PROFILE: P2[] = [
  [0.001, -0.265],
  [0.019, -0.26],
  [0.022, -0.14],
  [0.025, -0.05],
  [0.056, 0.06],
  [0.058, 0.12],
  [0.036, 0.24],
  [0.014, 0.33],
  [0.013, 0.38],
  [0.002, 0.39],
];

const ARMS: [number, number, number][] = [
  [1, 1, 1],
  [1, -1, -1],
  [-1, 1, -1],
  [-1, -1, 1],
];

export const FPVDrone: React.FC<FPVDroneProps> = ({ rotorSpin = 0.4, cameraPitch = -0.22 }) => {
  const matCarbon = plain('#1d2024', 0.42, 0.35);
  const matAnodized = plain('#c93b2b', 0.32, 0.72);
  const matMotor = plain('#2c313a', 0.3, 0.78);
  const matCopper = plain('#cf7436', 0.35, 0.82);
  const matProp = plain('#e06d24', 0.38, 0.15);
  const matBattery = plain('#2274a5', 0.4, 0.12);
  const matStrap = plain('#17181a', 0.88, 0.05);
  const matLens = plain('#154c5e', 0.1, 0.9);
  const matBrass = plain('#cfa954', 0.28, 0.82);
  const matWarhead = useMemo(
    () => paint({ color: '#4d5c3b', camo: ['#3a462c', '#6e7552'], camoScale: 1.8, wear: 0.24, dirt: 0.2, roughness: 0.58, metalness: 0.28, seed: 31 }),
    [],
  );

  const plateGeo = useMemo(() => extrudeTop(FRAME_TOP, 0.006, 0.0015), []);
  const warheadGeo = useMemo(() => lathe(PG7_PROFILE, 28), []);
  const vtxStem = useMemo(() => pipe([[-0.15, 0.03, 0], [-0.19, 0.075, 0], [-0.22, 0.125, 0]], 0.0045, 14), []);
  const pwrLead = useMemo(() => pipe([[-0.07, 0.062, 0.032], [-0.11, 0.055, 0.052], [-0.09, 0.024, 0.036]], 0.0045, 14), []);
  const triggerLoop = useMemo(
    () => pipe([[0.385, -0.072, 0], [0.43, -0.068, 0.024], [0.445, -0.072, 0], [0.43, -0.076, -0.024], [0.385, -0.072, 0]], 0.0025, 20),
    [],
  );

  return (
    <group>
      {/* Tấm carbon đáy & đỉnh + 6 trụ nhôm đỏ */}
      <mesh geometry={plateGeo} material={matCarbon} position={[0, -0.016, 0]} castShadow receiveShadow />
      <mesh geometry={plateGeo} material={matCarbon} position={[0, 0.026, 0]} castShadow receiveShadow />
      {/* Cụm mạch điều khiển bay (FC/ESC stack) giữa khung */}
      <mesh geometry={rbox(0.065, 0.026, 0.058, 0.004)} material={plain('#264e36', 0.5, 0.4)} position={[0, 0.006, 0]} />
      {[-0.12, 0, 0.12].flatMap((x) =>
        [-0.032, 0.032].map((z, k) => (
          <mesh key={`${x}-${k}`} position={[x, 0.008, z]} material={matAnodized}>
            <cylinderGeometry args={[0.004, 0.004, 0.042, 8]} />
          </mesh>
        )),
      )}

      {/* 4 tay đòn carbon chữ X + mô-tơ brushless + cánh quạt 3 lá */}
      {ARMS.map(([sx, sz, dir], idx) => {
        const mx = sx * 0.195;
        const mz = sz * 0.195;
        const armAng = Math.atan2(mz, mx);
        return (
          <React.Fragment key={idx}>
            <mesh
              geometry={rbox(0.28, 0.01, 0.026, 0.003)}
              material={matCarbon}
              position={[mx * 0.52, -0.012, mz * 0.52]}
              rotation={[0, -armAng, 0]}
              castShadow
            />
            {/* Đế và chuông mô-tơ */}
            <group position={[mx, 0.004, mz]}>
              <mesh material={matCopper}>
                <cylinderGeometry args={[0.019, 0.019, 0.014, 16]} />
              </mesh>
              <mesh position={[0, 0.004, 0]} material={matMotor} castShadow>
                <cylinderGeometry args={[0.022, 0.022, 0.016, 18]} />
              </mesh>
              <mesh position={[0, 0.018, 0]} material={matAnodized}>
                <cylinderGeometry args={[0.005, 0.006, 0.014, 10]} />
              </mesh>
              {/* Cánh quạt 3 lá quay theo rotorSpin */}
              <group position={[0, 0.015, 0]} rotation={[0, rotorSpin * dir + idx * 0.8, 0]}>
                {[0, 1, 2].map((b) => (
                  <group key={b} rotation={[0, (b * Math.PI * 2) / 3, 0]}>
                    <mesh
                      geometry={rbox(0.125, 0.003, 0.021, 0.0015)}
                      material={matProp}
                      position={[0.066, 0, 0]}
                      rotation={[0.22 * dir, 0.06, 0]}
                      castShadow
                    />
                  </group>
                ))}
              </group>
            </group>
          </React.Fragment>
        );
      })}

      {/* Khối pin LiPo 6S trên lưng + 2 đai buộc đen + dây nguồn */}
      <group position={[-0.01, 0.058, 0]}>
        <mesh geometry={rbox(0.145, 0.052, 0.068, 0.008)} material={matBattery} castShadow />
        {[-0.04, 0.04].map((sx, i) => (
          <mesh key={i} geometry={rbox(0.018, 0.058, 0.074, 0.003)} material={matStrap} position={[sx, -0.004, 0]} />
        ))}
      </group>
      <mesh geometry={pwrLead} material={plain('#e8b923', 0.5, 0.1)} />

      {/* Camera FPV góc rộng ở mũi khung */}
      <group position={[0.155, 0.008, 0]} rotation={[0, 0, cameraPitch]}>
        <mesh geometry={rbox(0.032, 0.032, 0.034, 0.004)} material={matMotor} castShadow />
        <mesh position={[0.02, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matCarbon}>
          <cylinderGeometry args={[0.013, 0.015, 0.016, 16]} />
        </mesh>
        <mesh position={[0.028, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matLens}>
          <sphereGeometry args={[0.011, 14, 10]} />
        </mesh>
      </group>

      {/* Ăng-ten phát video VTX dạng nấm ở đuôi */}
      <mesh geometry={vtxStem} material={matCarbon} />
      <mesh position={[-0.225, 0.132, 0]} material={matAnodized} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.022, 16]} />
      </mesh>

      {/* Quả đạn nổ lõm chống tăng PG-7V kẹp dưới bụng drone + vòng dây kích nổ ở mũi */}
      <group position={[0, -0.072, 0]}>
        <mesh geometry={warheadGeo} material={matWarhead} castShadow receiveShadow />
        {/* Ngòi nổ áp điện kim loại sáng ở đầu quả đạn */}
        <mesh position={[0.355, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={matBrass}>
          <cylinderGeometry args={[0.014, 0.016, 0.055, 16]} />
        </mesh>
        {/* Hai đai thép ôm giữ quả đạn vào đáy khung carbon */}
        {[-0.08, 0.09].map((cx, ci) => {
          const r = cx > 0 ? 0.059 : 0.028;
          return (
            <React.Fragment key={ci}>
              <mesh position={[cx, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matStrap}>
                <cylinderGeometry args={[r, r, 0.02, 20]} />
              </mesh>
              <mesh geometry={rbox(0.022, 0.06, 0.045, 0.003)} material={matStrap} position={[cx, 0.035, 0]} />
            </React.Fragment>
          );
        })}
      </group>
      <mesh geometry={triggerLoop} material={matCopper} />
    </group>
  );
};
