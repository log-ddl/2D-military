// Các cụm công trình mục tiêu 3D tỉ lệ thật 1:1 (mét) tại Nhật Bản (Tokyo, Yokohama, Nagoya):
// - FactoryComplex: nhà máy vũ khí / luyện thép / lắp ráp máy bay Mitsubishi mái răng cưa + ống khói gạch cao
// - OilRefineryCluster: cụm bồn chứa dầu hình trụ + tháp chưng cất + đường ống dẫn
// - TokyoRowhouseBlock: dãy nhà gỗ mái ngói xám đen truyền thống ngoại ô Tokyo
// - PowerLineSpan: cột điện cao thế khung thép chữ A + dây điện võng (để B-25 của Greening luồn dưới dây ở y < 14 m!)
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { turntable } from '@skill/military/3d/turntable';
import { extrude, lathe, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';

export const FactoryComplex: React.FC<{ damage?: number; variant?: number }> = ({ damage = 0, variant = 0 }) => {
  const dmgTier = damage > 0.4 ? 1 : 0;
  const brickMat = paint({
    color: variant % 2 === 0 ? '#75463b' : '#5e5b55',
    camo: ['#5c382f', '#82584b'],
    repeat: 0.4,
    wear: 0.25 + dmgTier * 0.35,
    dirt: 0.35 + dmgTier * 0.35,
    roughness: 0.85,
    metalness: 0.1,
    seed: 11 + variant,
  });
  const roofMat = paint({
    color: dmgTier ? '#2e2b29' : '#454c54',
    camo: ['#383e45', '#555d66'],
    repeat: 0.42,
    wear: 0.35,
    dirt: 0.4 + dmgTier * 0.35,
    roughness: 0.72,
    metalness: 0.35,
    seed: 21 + variant,
  });
  const glassMat = plain(damage > 0.3 ? '#ff9d3b' : '#9ab4c4', 0.25, 0.2);

  // Biên dạng nhà xưởng 4 nhịp mái răng cưa (sawtooth factory hall): dài 52 m, cao 11.5 m, rộng 28 m
  const sawtoothHall = useMemo(() => {
    const pts: [number, number][] = [
      [-26, 0],
      [26, 0],
      [26, 7.2],
      [13, 11.2],
      [13, 7.2],
      [0, 11.2],
      [0, 7.2],
      [-13, 11.2],
      [-13, 7.2],
      [-26, 11.2],
    ];
    return extrude(pts, 28, 0.08);
  }, []);

  const stackGeo = useMemo(
    () =>
      lathe(
        [
          [2.1, 0],
          [1.85, 4],
          [1.35, 23.5],
          [1.52, 24.1],
          [1.42, 24.6],
          [1.1, 24.6],
          [1.1, 23.5],
        ],
        24,
      ),
    [],
  );

  return (
    <group>
      {/* Nhà xưởng chính mái răng cưa */}
      <mesh geometry={sawtoothHall} material={brickMat} castShadow receiveShadow />
      {/* Các dải kính lấy sáng thẳng đứng trên từng nhịp mái răng cưa */}
      {[-13, 0, 13].map((x, idx) => (
        <mesh key={idx} position={[x + 0.12, 9.1, 0]} geometry={rbox(0.22, 3.2, 26.8, 0.03)} material={glassMat} />
      ))}
      {/* Phân xưởng phụ lò cao / kho bên cạnh */}
      <mesh position={[-8, 4.4, 19.5]} geometry={rbox(32, 8.8, 11, 0.12)} material={roofMat} castShadow receiveShadow />
      <mesh position={[15, 3.2, -18.5]} geometry={rbox(18, 6.4, 9, 0.1)} material={brickMat} castShadow receiveShadow />
      {/* 2 ống khói gạch công nghiệp cao 24.6 m có vạch sơn cảnh báo trắng-đỏ trên đỉnh */}
      {[
        [18, 18.5],
        [23.5, 15.5],
      ].map(([sx, sz], i) => (
        <group key={i} position={[sx, 0, sz]}>
          <group rotation={[0, 0, Math.PI / 2]}>
            <mesh geometry={stackGeo} material={brickMat} castShadow receiveShadow />
          </group>
          <mesh position={[0, 21.4, 0]} material={plain('#d8d3c8', 0.8)}>
            <cylinderGeometry args={[1.44, 1.48, 1.3, 24]} />
          </mesh>
          <mesh position={[0, 22.7, 0]} material={plain('#a8352d', 0.8)}>
            <cylinderGeometry args={[1.4, 1.44, 1.3, 24]} />
          </mesh>
        </group>
      ))}
      {/* Dãy cửa sổ nhà xưởng mặt hông */}
      {[-18, -10, -2, 6, 14, 21].map((wx) => (
        <React.Fragment key={wx}>
          <mesh position={[wx, 4.0, 14.08]} geometry={rbox(4.2, 3.0, 0.16, 0.02)} material={glassMat} />
          <mesh position={[wx, 4.0, -14.08]} geometry={rbox(4.2, 3.0, 0.16, 0.02)} material={glassMat} />
        </React.Fragment>
      ))}
      {/* Mảng sập mái cháy đỏ khi trúng bom */}
      {damage > 0.35 && (
        <mesh position={[-3, 7.6, 2]} rotation={[0.25, 0.4, -0.3]}>
          <boxGeometry args={[12, 2.4, 10]} />
          <meshBasicMaterial color="#ff6f1f" toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

export const OilRefineryCluster: React.FC<{ damage?: number }> = ({ damage = 0 }) => {
  const dmgTier = damage > 0.4 ? 1 : 0;
  const tankMat = paint({
    color: dmgTier ? '#383634' : '#aeb5ba',
    camo: ['#98a0a6', '#c2c8cc'],
    repeat: 0.45,
    wear: 0.3 + dmgTier * 0.4,
    dirt: 0.32 + dmgTier * 0.4,
    roughness: 0.52,
    metalness: 0.48,
    seed: 33,
  });
  const rustSteel = paint({
    color: '#52585e',
    camo: ['#41464b', '#676d73'],
    repeat: 0.5,
    wear: 0.4,
    dirt: 0.4,
    roughness: 0.6,
    metalness: 0.55,
    seed: 39,
  });

  const pipeRun1 = useMemo(
    () =>
      pipe(
        [
          [-16, 1.4, -6],
          [-2, 1.4, -6],
          [4, 3.5, -2],
          [14, 3.5, -2],
        ],
        0.38,
        28,
      ),
    [],
  );
  const pipeRun2 = useMemo(
    () =>
      pipe(
        [
          [-14, 1.1, 8],
          [6, 1.1, 8],
          [12, 5.2, 5],
          [16, 5.2, 5],
        ],
        0.32,
        28,
      ),
    [],
  );

  const tanks: [number, number, number, number][] = [
    [-12, -8, 6.8, 9.5],
    [3, -9, 6.8, 9.5],
    [-11, 8, 5.6, 8.2],
    [2, 8.5, 5.6, 8.2],
  ];

  return (
    <group>
      {/* Đê bao bê tông chống tràn dầu */}
      <mesh position={[-4.5, 0.55, 0]} geometry={rbox(36, 1.1, 33, 0.08)} material={plain('#74726b', 0.92)} receiveShadow />
      {/* 4 bồn chứa dầu hình trụ lớn */}
      {tanks.map(([tx, tz, r, h], idx) => {
        const crushed = damage > 0.4 && idx % 2 === 0;
        return (
          <group key={idx} position={[tx, 0, tz]} scale={crushed ? [1.06, 0.68, 0.94] : [1, 1, 1]}>
            <mesh position={[0, h / 2, 0]} material={tankMat} castShadow receiveShadow>
              <cylinderGeometry args={[r, r, h, 28]} />
            </mesh>
            <mesh position={[0, h + 0.45, 0]} material={tankMat} castShadow>
              <coneGeometry args={[r * 1.01, 0.9, 28]} />
            </mesh>
            {/* Vành hành lang thép đỉnh bồn */}
            <mesh position={[0, h - 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={rustSteel}>
              <torusGeometry args={[r + 0.12, 0.08, 6, 28]} />
            </mesh>
          </group>
        );
      })}
      {/* 2 tháp chưng cất phân đoạn cao 18 m & 21 m */}
      {[
        [15, -3, 1.6, 18.5],
        [17.5, 4.5, 1.35, 21.0],
      ].map(([cx, cz, cr, ch], i) => (
        <group key={i} position={[cx, 0, cz]}>
          <mesh position={[0, ch / 2, 0]} material={rustSteel} castShadow receiveShadow>
            <cylinderGeometry args={[cr * 0.92, cr, ch, 20]} />
          </mesh>
          {[0.3, 0.55, 0.8].map((f) => (
            <mesh key={f} position={[0, ch * f, 0]} rotation={[Math.PI / 2, 0, 0]} material={tankMat}>
              <torusGeometry args={[cr + 0.28, 0.1, 6, 20]} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh geometry={pipeRun1} material={rustSteel} castShadow />
      <mesh geometry={pipeRun2} material={rustSteel} castShadow />
    </group>
  );
};

export const TokyoRowhouseBlock: React.FC<{ variant?: number; burning?: boolean }> = ({ variant = 0, burning = false }) => {
  const woodMat = paint({
    color: '#6b533e',
    camo: ['#594432', '#7d634b'],
    repeat: 0.5,
    wear: 0.25,
    dirt: 0.3,
    roughness: 0.88,
    seed: 51 + variant,
  });
  const tileMat = paint({
    color: '#3c424a',
    camo: ['#31363d', '#495059'],
    repeat: 0.5,
    wear: 0.2,
    dirt: 0.25,
    roughness: 0.65,
    metalness: 0.15,
    seed: 61 + variant,
  });

  const plasterMat = paint({
    color: '#b8aa93',
    camo: ['#a6977f', '#c7baa4'],
    repeat: 0.5,
    wear: 0.22,
    dirt: 0.28,
    roughness: 0.9,
    seed: 55 + variant,
  });

  const roofGeo = useMemo(
    () =>
      extrude(
        [
          [-5.6, -0.15],
          [5.6, -0.15],
          [0, 2.45],
        ],
        8.8,
        0.04,
      ),
    [],
  );

  const houses: [number, number, number][] = [
    [-11.5, -6.2, 0],
    [0, -6.2, 0],
    [11.5, -6.2, 0],
    [-11.5, 6.2, Math.PI],
    [0, 6.2, Math.PI],
    [11.5, 6.2, Math.PI],
  ];

  return (
    <group>
      {houses.map(([hx, hz, rotY], i) => (
        <group key={i} position={[hx, 0, hz]} rotation={[0, rotY, 0]}>
          {/* Tầng trệt gỗ sẫm & tầng trên vách vữa sáng kiểu nhà phố Nhật 1940 */}
          <mesh position={[0, 1.35, 0]} geometry={rbox(9.6, 2.7, 7.6, 0.04)} material={woodMat} castShadow receiveShadow />
          <mesh position={[0, 3.7, 0]} geometry={rbox(9.3, 2.1, 7.3, 0.04)} material={plasterMat} castShadow receiveShadow />
          <mesh position={[0, 2.68, 3.95]} geometry={rbox(9.9, 0.18, 0.85, 0.02)} material={tileMat} castShadow />
          <mesh position={[0, 4.72, 0]} geometry={roofGeo} material={tileMat} castShadow receiveShadow />
          {burning && i % 2 === 0 && (
            <mesh position={[0, 3.6, 0]}>
              <boxGeometry args={[7.2, 3.2, 5.6]} />
              <meshBasicMaterial color="#ff8a24" toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
};

/**
 * Nhịp đường dây điện cao thế công nghiệp Yokohama: 2 tháp khung thép cao 27 m đặt tại z = ±span/2,
 * các dây cáp võng có đáy ở y ≈ 15.2 m (đủ cao để chiếc B-25 cao 5 m của Greening bay sát đất ở y = 6..9 m luồn hẳn bên dưới!).
 */
export const PowerLineSpan: React.FC<{ span?: number }> = ({ span = 76 }) => {
  const steelMat = plain('#4b5359', 0.55, 0.65);
  const wireMat = plain('#1f2326', 0.7, 0.4);

  const cables = useMemo(() => {
    const out: THREE.BufferGeometry[] = [];
    for (const [armY, armX, sag] of [
      [24.5, -2.8, 7.8],
      [24.5, 2.8, 7.8],
      [20.2, -3.6, 5.4],
      [20.2, 3.6, 5.4],
    ] as const) {
      const pts: [number, number, number][] = [];
      for (let i = 0; i <= 16; i++) {
        const u = i / 16;
        const z = -span / 2 + span * u;
        const y = armY - sag * 4 * u * (1 - u);
        pts.push([armX, y, z]);
      }
      out.push(pipe(pts, 0.055, 32));
    }
    return out;
  }, [span]);

  const Tower: React.FC<{ z: number }> = ({ z }) => (
    <group position={[0, 0, z]}>
      {/* 4 trụ chân tháp chụm dần lên đỉnh */}
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sz], i) => (
        <mesh
          key={i}
          position={[sx * 1.45, 13.5, sz * 1.45]}
          rotation={[sz * -0.075, 0, sx * 0.075]}
          geometry={rbox(0.28, 27.2, 0.28, 0.02)}
          material={steelMat}
          castShadow
        />
      ))}
      {/* Các xà ngang & tay đỡ sứ cách điện */}
      {[6, 12, 17.5, 23].map((ty) => {
        const w = 3.8 - ty * 0.09;
        return <mesh key={ty} position={[0, ty, 0]} geometry={rbox(w, 0.22, w, 0.02)} material={steelMat} />;
      })}
      <mesh position={[0, 20.5, 0]} geometry={rbox(7.8, 0.32, 0.42, 0.03)} material={steelMat} castShadow />
      <mesh position={[0, 24.8, 0]} geometry={rbox(6.2, 0.3, 0.38, 0.03)} material={steelMat} castShadow />
    </group>
  );

  return (
    <group>
      <Tower z={-span / 2} />
      <Tower z={span / 2} />
      {cables.map((g, i) => (
        <mesh key={i} geometry={g} material={wireMat} />
      ))}
    </group>
  );
};

const TargetShowcase: React.FC = () => (
  <group>
    <group position={[-32, 0, -14]}>
      <FactoryComplex variant={0} />
    </group>
    <group position={[28, 0, -12]}>
      <OilRefineryCluster />
    </group>
    <group position={[-22, 0, 24]}>
      <TokyoRowhouseBlock />
    </group>
    <group position={[26, 0, 22]} rotation={[0, Math.PI / 2, 0]}>
      <PowerLineSpan span={38} />
    </group>
  </group>
);

export const preview = turntable(TargetShowcase, { size: 95, center: [0, 9, 4] });
