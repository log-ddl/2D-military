// Bộ quân giới & đạo cụ Doolittle Raid (18/04/1942) tỉ lệ thật 1:1 (1 đơn vị = 1 mét; mũi +X, trên +Y, phải +Z)
// Gồm: BombANM64 (có biến thể gắn huy chương Nhật), IncendiaryCluster (AN-M17 bung mở), ThermiteBomblet (AN-M50 4.000°F),
// GasCan5Gal (can xăng 5-gal có vết đục lỗ), MarkTwainSight (thước ngắm nhôm 20 xu), ParachuteRaider (phi công nhảy dù Ø 7.30 m).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT } from '../design/palette';

// ============================================================================
// 1. BombANM64 — Bom phá 500-lb AN-M64 (dài 1.45 m, Ø 0.36 m, dọc trục +X)
// ============================================================================
export type BombANM64Props = {
  /** Gắn tấm huy chương hữu nghị Nhật Bản bằng đồng/vàng + ruy-băng đỏ-trắng buộc dây đồng (510–519 s) */
  medal?: boolean;
  seed?: number;
};

export const BombANM64: React.FC<BombANM64Props> = ({ medal = false, seed = 17 }) => {
  const mats = useMemo(
    () => ({
      olive: paint({
        color: '#5b663f',
        camo: [PAINT.bombOlive, '#687449'],
        wear: 0.18,
        dirt: 0.16,
        roughness: 0.66,
        metalness: 0.14,
        seed,
      }),
      yellowBand: plain(PAINT.bombYellowBand, 0.5, 0.08),
      steel: plain('#858d94', 0.38, 0.68),
      darkSteel: plain('#3c4247', 0.54, 0.45),
      brass: plain('#dab04c', 0.24, 0.82),
      bronzeMedal: plain('#e4b343', 0.22, 0.85),
      copperWire: plain('#df8646', 0.26, 0.82),
      ribbonRed: plain(PAINT.hinomaruRed, 0.7, 0.04),
      ribbonWhite: plain('#f7f2e7', 0.72, 0.04),
    }),
    [seed],
  );

  const geos = useMemo(() => {
    const bodyProfile: P2[] = [
      [0.068, -0.46],
      [0.095, -0.39],
      [0.125, -0.31],
      [0.152, -0.23],
      [0.171, -0.15],
      [0.18, -0.07],
      [0.18, 0.22],
      [0.177, 0.29],
      [0.169, 0.36],
      [0.155, 0.43],
      [0.134, 0.5],
      [0.105, 0.565],
      [0.071, 0.618],
      [0.044, 0.655],
    ];
    const body = lathe(bodyProfile, 44);

    // 2 đai sơn vàng nhận diện thuốc nổ mạnh (HE)
    const frontBand = lathe(
      [
        [0.1775, 0.305],
        [0.172, 0.358],
      ],
      44,
    );
    const aftBand = lathe(
      [
        [0.147, -0.258],
        [0.1615, -0.205],
      ],
      44,
    );

    const noseFuze = lathe(
      [
        [0.044, 0.653],
        [0.041, 0.682],
        [0.026, 0.695],
        [0.015, 0.724],
      ],
      24,
    );

    const tailCone = lathe(
      [
        [0.048, -0.715],
        [0.056, -0.6],
        [0.07, -0.455],
      ],
      28,
    );
    const finShape: P2[] = [
      [-0.725, 0.048],
      [-0.455, 0.068],
      [-0.535, 0.176],
      [-0.725, 0.176],
    ];
    const finPlate = extrude(finShape, 0.008, 0.0015);

    const lugLoop = pipe(
      [
        [-0.022, 0.176, 0],
        [-0.018, 0.214, 0],
        [0.018, 0.214, 0],
        [0.022, 0.176, 0],
      ],
      0.008,
      14,
    );
    const armingWire = pipe(
      [
        [0.706, 0.024, 0.008],
        [0.52, 0.155, 0.02],
        [0.2, 0.198, 0.005],
      ],
      0.003,
      16,
    );

    // 2 vòng dây đồng quấn quanh bụng bom buộc tấm huy chương hữu nghị Nhật Bản
    const wirePts1: [number, number, number][] = [];
    const wirePts2: [number, number, number][] = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2;
      const r = 0.184;
      wirePts1.push([0.028 + Math.sin(a * 2) * 0.003, Math.cos(a) * r, Math.sin(a) * r]);
      wirePts2.push([0.092 - Math.sin(a * 2) * 0.003, Math.cos(a) * r, Math.sin(a) * r]);
    }
    const copperLoop1 = pipe(wirePts1, 0.0042, 44);
    const copperLoop2 = pipe(wirePts2, 0.0042, 44);
    const copperTwist = pipe(
      [
        [0.03, 0.16, 0.096],
        [0.06, 0.175, 0.104],
        [0.09, 0.16, 0.096],
        [0.075, 0.192, 0.116],
      ],
      0.0042,
      14,
    );

    return {
      body,
      frontBand,
      aftBand,
      noseFuze,
      tailCone,
      finPlate,
      lugLoop,
      armingWire,
      copperLoop1,
      copperLoop2,
      copperTwist,
    };
  }, []);

  return (
    <group>
      <mesh geometry={geos.body} material={mats.olive} castShadow receiveShadow />
      <mesh geometry={geos.frontBand} material={mats.yellowBand} />
      <mesh geometry={geos.aftBand} material={mats.yellowBand} />

      {/* 2 móc treo lưng bom */}
      {[-0.06, 0.19].map((xl, i) => (
        <group key={i} position={[xl, 0, 0]}>
          <mesh position={[0, 0.18, 0]} geometry={rbox(0.068, 0.014, 0.032, 0.004)} material={mats.darkSteel} />
          <mesh geometry={geos.lugLoop} material={mats.steel} castShadow />
        </group>
      ))}

      {/* Ngòi nổ chong chóng mũi AN-M103 */}
      <mesh geometry={geos.noseFuze} material={mats.brass} castShadow />
      <mesh geometry={geos.armingWire} material={mats.steel} />
      <group position={[0.718, 0, 0]}>
        {[0, 1, 2, 3].map((k) => (
          <mesh
            key={k}
            rotation={[(k * Math.PI) / 2 + 0.35, 0.32, 0]}
            position={[0, Math.cos((k * Math.PI) / 2) * 0.028, Math.sin((k * Math.PI) / 2) * 0.028]}
            geometry={rbox(0.006, 0.046, 0.016, 0.002)}
            material={mats.steel}
          />
        ))}
      </group>

      {/* Cụm cánh đuôi hộp vuông (x=-0.725..-0.455) */}
      <mesh geometry={geos.tailCone} material={mats.olive} castShadow />
      {[0, 1, 2, 3].map((k) => (
        <mesh
          key={`fin-${k}`}
          rotation={[Math.PI / 4 + (k * Math.PI) / 2, 0, 0]}
          geometry={geos.finPlate}
          material={mats.olive}
          castShadow
        />
      ))}
      {[0, 1, 2, 3].map((k) => {
        const a = (k * Math.PI) / 2;
        const offset = 0.124;
        return (
          <mesh
            key={`box-${k}`}
            position={[-0.635, Math.cos(a) * offset, Math.sin(a) * offset]}
            rotation={[a, 0, 0]}
            geometry={rbox(0.175, 0.007, 0.252, 0.002)}
            material={mats.olive}
            castShadow
          />
        );
      })}

      {/* Biến thể lịch sử: Tấm huy chương hữu nghị Nhật Bản + ruy-băng đỏ-trắng buộc dây đồng quanh thân bom */}
      {medal && (
        <group>
          <mesh geometry={geos.copperLoop1} material={mats.copperWire} castShadow />
          <mesh geometry={geos.copperLoop2} material={mats.copperWire} castShadow />
          <mesh geometry={geos.copperTwist} material={mats.copperWire} />

          {/* Dải ruy-băng lụa kẻ sọc đỏ-trắng chữ V vắt từ nút dây đồng trên lưng xuống sườn phải (+Z, +Y) */}
          <group position={[0.06, 0.148, 0.118]} rotation={[0.68, 0, 0]}>
            {[-2, -1, 0, 1, 2].map((sIdx) => (
              <mesh
                key={sIdx}
                position={[sIdx * 0.0155, 0, 0.004]}
                geometry={rbox(0.016, 0.16, 0.007, 0.0015)}
                material={Math.abs(sIdx) % 2 === 1 ? mats.ribbonWhite : mats.ribbonRed}
                castShadow
              />
            ))}
            <mesh position={[0, -0.076, 0.007]} geometry={rbox(0.088, 0.013, 0.012, 0.003)} material={mats.brass} />
          </group>

          {/* Mặt huy chương đồng vàng chạm hoa cúc 16 cánh & mặt trời đỏ đặt ở góc 62° rõ từ cả ngang lẫn trên cao */}
          <group position={[0.06, 0.084, 0.168]} rotation={[1.1, 0, 0]}>
            <mesh material={mats.bronzeMedal} castShadow>
              <cylinderGeometry args={[0.053, 0.053, 0.01, 32]} />
            </mesh>
            {Array.from({ length: 16 }, (_, k) => {
              const a = (k / 16) * Math.PI * 2;
              return (
                <mesh key={k} position={[Math.cos(a) * 0.048, 0.002, Math.sin(a) * 0.048]} material={mats.brass}>
                  <cylinderGeometry args={[0.0075, 0.0075, 0.011, 10]} />
                </mesh>
              );
            })}
            <mesh position={[0, 0.005, 0]} material={mats.brass}>
              <cylinderGeometry args={[0.035, 0.038, 0.006, 24]} />
            </mesh>
            <mesh position={[0, 0.008, 0]} material={mats.ribbonRed}>
              <cylinderGeometry args={[0.017, 0.018, 0.005, 20]} />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

// ============================================================================
// 2. ThermiteBomblet — Bom cháy con 4-lb AN-M50 lục giác (dài 0.34 m, Ø 0.05 m)
// ============================================================================
export type ThermiteBombletProps = {
  /** Phát sáng trắng-cam 4.000°F ở đầu magnesium khi kích hoạt cháy */
  ignited?: boolean;
};

export const ThermiteBomblet: React.FC<ThermiteBombletProps> = ({ ignited = false }) => {
  const { hexPts, mats } = useMemo(() => {
    const r = 0.025;
    const pts: P2[] = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    return {
      hexPts: pts,
      mats: {
        noseSteel: plain('#677077', 0.42, 0.65),
        magnesiumBody: plain('#a8b1b8', 0.44, 0.52),
        purpleBand: plain('#853b66', 0.54, 0.12),
        tailOlive: plain('#5c6644', 0.64, 0.2),
        hotWhite: new THREE.MeshBasicMaterial({ color: PAINT.thermiteHot, toneMapped: false }),
        hotOrange: new THREE.MeshBasicMaterial({ color: PAINT.thermiteCore, toneMapped: false }),
      },
    };
  }, []);

  const geos = useMemo(() => {
    const mkHex = (len: number, rScale = 1, bevel = 0.0015) => {
      const scaled = hexPts.map(([x, y]): P2 => [x * rScale, y * rScale]);
      const g = extrude(scaled, len, bevel).clone();
      g.rotateY(Math.PI / 2);
      return g;
    };
    return {
      tail: mkHex(0.088, 0.96, 0.0012),
      body: mkHex(0.178, 1.0, 0.0018),
      band: mkHex(0.03, 1.03, 0.0008),
      nose: mkHex(0.074, 0.98, 0.003),
    };
  }, [hexPts]);

  return (
    <group>
      <mesh position={[-0.126, 0, 0]} geometry={geos.tail} material={mats.tailOlive} castShadow />
      <mesh position={[0.007, 0, 0]} geometry={geos.body} material={mats.magnesiumBody} castShadow />
      <mesh position={[0.052, 0, 0]} geometry={geos.band} material={mats.purpleBand} />
      <mesh position={[0.133, 0, 0]} geometry={geos.nose} material={mats.noseSteel} castShadow />

      {/* Ngọn lửa magnesium-thermite trắng-cam rực rỡ 4.000°F (toneMapped={false}) */}
      {ignited && (
        <group position={[0.075, 0, 0]}>
          <mesh scale={[1.85, 1.25, 1.25]} material={mats.hotOrange}>
            <dodecahedronGeometry args={[0.038, 1]} />
          </mesh>
          <mesh position={[0.015, 0.004, 0]} scale={[1.55, 0.95, 0.95]} material={mats.hotWhite}>
            <dodecahedronGeometry args={[0.028, 1]} />
          </mesh>
          {[-1, 1].map((s) => (
            <React.Fragment key={s}>
              <mesh
                position={[-0.048, s * 0.022, -s * 0.016]}
                scale={[2.4, 0.6, 0.6]}
                material={mats.hotOrange}
              >
                <octahedronGeometry args={[0.015, 0]} />
              </mesh>
              <mesh position={[0.035, -s * 0.026, s * 0.022]} material={mats.hotWhite}>
                <octahedronGeometry args={[0.01, 0]} />
              </mesh>
            </React.Fragment>
          ))}
        </group>
      )}
    </group>
  );
};

// ============================================================================
// 3. IncendiaryCluster — Chùm bom cháy 500-lb AN-M17 (dài 1.20 m, Ø 0.38 m)
// ============================================================================
export type IncendiaryClusterProps = {
  /** Độ bung đai thép làm các thanh bom cháy con toả rộng (0 = bó kín lục giác, 0..1 = bung toả trên không) */
  open?: number;
  ignited?: boolean;
};

type ClusterSlot = {
  bank: number;
  xBase: number;
  yBase: number;
  zBase: number;
  radAngle: number;
  ringNorm: number;
  jitter: number;
};

export const IncendiaryCluster: React.FC<IncendiaryClusterProps> = ({ open = 0, ignited = false }) => {
  const p = Math.max(0, Math.min(1, open));

  const slots = useMemo<ClusterSlot[]>(() => {
    const list: ClusterSlot[] = [];
    const rings = [
      { count: 6, r: 0.053 },
      { count: 12, r: 0.106 },
      { count: 18, r: 0.159 },
    ];
    [-0.12, 0.24].forEach((xBase, bIdx) => {
      rings.forEach((rg, rIdx) => {
        for (let k = 0; k < rg.count; k++) {
          const a = (k / rg.count) * Math.PI * 2;
          const sector = ((a % (Math.PI / 3)) + Math.PI / 3) % (Math.PI / 3);
          const hexScale = Math.cos(Math.PI / 6) / Math.cos(sector - Math.PI / 6);
          const rr = rg.r * hexScale;
          const yBase = Math.cos(a) * rr;
          const zBase = Math.sin(a) * rr;
          const jitter = (((k * 17 + rIdx * 31 + bIdx * 13) % 11) - 5) / 5;
          list.push({
            bank: bIdx === 0 ? -1 : 1,
            xBase,
            yBase,
            zBase,
            radAngle: a,
            ringNorm: (rIdx + 1) / 3,
            jitter,
          });
        }
      });
    });
    return list;
  }, []);

  const mats = useMemo(
    () => ({
      olive: paint({
        color: '#5b663f',
        camo: [PAINT.bombOlive, '#687449'],
        wear: 0.18,
        dirt: 0.16,
        roughness: 0.66,
        metalness: 0.14,
        seed: 29,
      }),
      strapSteel: plain('#32373c', 0.46, 0.68),
      adapterSteel: plain('#626a70', 0.48, 0.58),
      brass: plain('#d6a849', 0.28, 0.82),
      yellowBand: plain(PAINT.bombYellowBand, 0.52, 0.1),
      purpleBand: plain('#853b66', 0.54, 0.12),
    }),
    [],
  );

  const geos = useMemo(() => {
    const hexPlatePts: P2[] = Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2;
      return [Math.cos(a) * 0.186, Math.sin(a) * 0.186];
    });
    const endPlate = extrude(hexPlatePts, 0.024, 0.003).clone();
    endPlate.rotateY(Math.PI / 2);

    const halfStrapPts: [number, number, number][] = [
      [0, 0.01, -0.188],
      [0, 0.164, -0.095],
      [0, 0.164, 0.095],
      [0, 0.01, 0.188],
    ];
    const halfStrap = pipe(halfStrapPts, 0.0095, 16);

    const finShape: P2[] = [
      [-0.6, 0.045],
      [-0.37, 0.062],
      [-0.43, 0.184],
      [-0.6, 0.184],
    ];
    const tailFin = extrude(finShape, 0.008, 0.0015);
    const tailShaft = lathe(
      [
        [0.044, -0.6],
        [0.056, -0.36],
      ],
      20,
    );
    const noseFuze = lathe(
      [
        [0.042, 0.555],
        [0.036, 0.585],
        [0.018, 0.6],
      ],
      20,
    );

    return { endPlate, halfStrap, tailFin, tailShaft, noseFuze };
  }, []);

  const coreBack = -p * 0.14;
  const noseFwd = p * 0.22;

  return (
    <group>
      {/* Dầm thép lõi + cánh đuôi hộp Olive Drab chuẩn quân giới Mỹ (x=-0.60..+0.60) */}
      <group position={[coreBack, -p * 0.04, 0]} rotation={[0, 0, -p * 0.12]}>
        <mesh position={[0.06, 0, 0]} geometry={rbox(0.92, 0.055, 0.055, 0.008)} material={mats.adapterSteel} castShadow />
        <mesh position={[-0.33, 0, 0]} geometry={geos.endPlate} material={mats.olive} castShadow />
        <mesh geometry={geos.tailShaft} material={mats.olive} castShadow />
        {[0, 1, 2, 3].map((k) => (
          <mesh
            key={`cfin-${k}`}
            rotation={[Math.PI / 4 + (k * Math.PI) / 2, 0, 0]}
            geometry={geos.tailFin}
            material={mats.olive}
            castShadow
          />
        ))}
        {[0, 1, 2, 3].map((k) => {
          const a = (k * Math.PI) / 2;
          return (
            <mesh
              key={`cbox-${k}`}
              position={[-0.515, Math.cos(a) * 0.13, Math.sin(a) * 0.13]}
              rotation={[a, 0, 0]}
              geometry={rbox(0.165, 0.007, 0.264, 0.002)}
              material={mats.olive}
              castShadow
            />
          );
        })}
        {/* Vạch tím-vàng nhỏ trên ống đuôi đánh dấu chùm bom cháy */}
        <mesh position={[-0.4, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.yellowBand}>
          <cylinderGeometry args={[0.055, 0.053, 0.025, 20]} />
        </mesh>
      </group>

      {/* Mâm chụp mũi + ngòi hẹn giờ bung tách về phía trước */}
      <group position={[noseFwd, p * 0.05, 0]} rotation={[0, p * 0.22, p * 0.3]}>
        <mesh position={[0.44, 0, 0]} geometry={geos.endPlate} material={mats.olive} castShadow />
        <mesh position={[0.454, 0, 0]} geometry={rbox(0.01, 0.32, 0.045, 0.002)} material={mats.purpleBand} />
        <mesh position={[-0.1, 0, 0]} geometry={geos.noseFuze} material={mats.brass} castShadow />
      </group>

      {/* 3 đai thép lục giác bung gãy văng ra xung quanh khi open > 0 */}
      {[-0.2, 0.06, 0.31].map((xs, idx) => (
        <React.Fragment key={`strap-${idx}`}>
          {([1, -1] as const).map((half) => (
            <group
              key={half}
              position={[
                xs + (idx - 1) * p * 0.16,
                half * p * (0.28 + idx * 0.07),
                (idx - 1) * p * 0.12 * half,
              ]}
              rotation={[half * p * 1.45, p * 0.6 * (idx - 1), (half < 0 ? Math.PI : 0) + p * 0.8 * half]}
            >
              <mesh geometry={geos.halfStrap} material={mats.strapSteel} castShadow />
              {half > 0 && (
                <mesh position={[0, 0.175, 0]} geometry={rbox(0.038, 0.024, 0.05, 0.004)} material={mats.adapterSteel} />
              )}
            </group>
          ))}
        </React.Fragment>
      ))}

      {/* 72 thanh bom cháy lục giác AN-M50 toả rộng dần theo tiến độ open */}
      {slots.map((sl, idx) => {
        const spread = p * (0.14 + sl.ringNorm * 0.44 + Math.abs(sl.jitter) * 0.08);
        const y = sl.yBase + Math.cos(sl.radAngle) * spread;
        const z = sl.zBase + Math.sin(sl.radAngle) * spread;
        const x = sl.xBase + sl.bank * p * 0.16 + sl.jitter * p * 0.14;
        const fanAngle = p * (0.22 + sl.ringNorm * 0.36);
        const pitchZ = Math.cos(sl.radAngle) * fanAngle;
        const yawY = -Math.sin(sl.radAngle) * fanAngle;
        return (
          <group key={idx} position={[x, y, z]} rotation={[sl.jitter * p * 0.9, yawY, pitchZ]}>
            <ThermiteBomblet ignited={ignited && idx % 4 === 0} />
          </group>
        );
      })}
    </group>
  );
};

// ============================================================================
// 4. GasCan5Gal — Can xăng thép 5-gallon quân sự Mỹ 1942 (0.34 × 0.24 × 0.46 m, đáy ở y=0)
// ============================================================================
export type GasCan5GalProps = {
  /** Vết đục lỗ tam giác ở mặt trên như lúc tổ bay B-25 đục chìm xuống biển Hoa Đông (622 s) */
  punctured?: boolean;
  seed?: number;
};

export const GasCan5Gal: React.FC<GasCan5GalProps> = ({ punctured = false, seed = 61 }) => {
  const mats = useMemo(
    () => ({
      canSteel: paint({
        color: '#697450',
        camo: [PAINT.gasCanSteel, '#78845d'],
        wear: 0.26,
        dirt: 0.18,
        roughness: 0.62,
        metalness: 0.16,
        seed,
      }),
      panelRecess: plain('#4e573b', 0.72, 0.14),
      xRibRaised: plain('#7b8860', 0.56, 0.2),
      bareMetal: plain('#cfd7dc', 0.28, 0.85),
      holeBlack: plain('#0b0d0c', 0.96, 0.05),
      brassCap: plain('#d8aa49', 0.25, 0.84),
      fuelWet: plain('#df9b2a', 0.18, 0.3),
    }),
    [seed],
  );

  const geos = useMemo(() => {
    const barCenter = pipe(
      [
        [-0.095, 0.405, 0],
        [-0.082, 0.454, 0],
        [0.045, 0.454, 0],
        [0.058, 0.405, 0],
      ],
      0.009,
      16,
    );
    const barSide = pipe(
      [
        [-0.092, 0.405, 0],
        [-0.08, 0.449, 0],
        [0.042, 0.449, 0],
        [0.055, 0.405, 0],
      ],
      0.008,
      16,
    );
    const chain = pipe(
      [
        [0.072, 0.408, 0.024],
        [0.088, 0.398, 0.048],
        [0.106, 0.418, 0.032],
      ],
      0.003,
      12,
    );
    const triHolePts: P2[] = [
      [-0.026, -0.019],
      [0.028, -0.016],
      [0.002, 0.028],
    ];
    const triHole = extrude(triHolePts, 0.014, 0.0005).clone();
    triHole.rotateX(Math.PI / 2);

    const triFlapPts: P2[] = [
      [-0.021, -0.014],
      [0.021, -0.012],
      [0.002, 0.023],
    ];
    const triFlap = extrude(triFlapPts, 0.0035, 0.0004).clone();
    triFlap.rotateX(Math.PI / 2);

    return { barCenter, barSide, chain, triHole, triFlap };
  }, []);

  return (
    <group>
      {/* Thân can xăng thép dập (0.34 × 0.405 × 0.24 m) + gờ hàn giữa */}
      <mesh position={[0, 0.205, 0]} geometry={rbox(0.34, 0.405, 0.24, 0.034)} material={mats.canSteel} castShadow receiveShadow />
      <mesh position={[0, 0.205, 0]} geometry={rbox(0.346, 0.395, 0.013, 0.004)} material={mats.panelRecess} />

      {/* Gân dập chữ X nổi rõ tương phản ở cả hai mặt hông (+Z và -Z) */}
      {([-1, 1] as const).map((side) => (
        <group key={side} position={[0, 0.2, side * 0.119]}>
          <mesh geometry={rbox(0.26, 0.295, 0.006, 0.002)} material={mats.panelRecess} />
          <mesh rotation={[0, 0, 0.74]} geometry={rbox(0.285, 0.024, 0.015, 0.006)} material={mats.xRibRaised} castShadow />
          <mesh rotation={[0, 0, -0.74]} geometry={rbox(0.285, 0.024, 0.015, 0.006)} material={mats.xRibRaised} castShadow />
          <mesh geometry={rbox(0.062, 0.062, 0.017, 0.006)} material={mats.xRibRaised} castShadow />
        </group>
      ))}

      {/* Quai xách 3 thanh thép ống (y = 0.40..0.46 m) */}
      <mesh geometry={geos.barCenter} material={mats.canSteel} castShadow />
      <mesh position={[0, 0, -0.052]} geometry={geos.barSide} material={mats.canSteel} castShadow />
      <mesh position={[0, 0, 0.052]} geometry={geos.barSide} material={mats.canSteel} castShadow />
      {([-1, 1] as const).map((side) => (
        <mesh
          key={`cheek-${side}`}
          position={[-0.018, 0.422, side * 0.058]}
          geometry={rbox(0.175, 0.042, 0.008, 0.002)}
          material={mats.canSteel}
          castShadow
        />
      ))}

      {/* Cổ rót & nắp vặn đồng 4 tai ở vai trước */}
      <group position={[0.108, 0.408, 0]} rotation={[0, 0, -0.24]}>
        <mesh material={mats.canSteel} castShadow>
          <cylinderGeometry args={[0.03, 0.034, 0.028, 20]} />
        </mesh>
        <mesh position={[0, 0.021, 0]} material={mats.brassCap} castShadow>
          <cylinderGeometry args={[0.034, 0.034, 0.019, 20]} />
        </mesh>
        {[0, 1].map((k) => (
          <mesh
            key={k}
            position={[0, 0.027, 0]}
            rotation={[0, (k * Math.PI) / 2, 0]}
            geometry={rbox(0.08, 0.011, 0.014, 0.003)}
            material={mats.brassCap}
          />
        ))}
      </group>
      <mesh geometry={geos.chain} material={mats.brassCap} />

      {/* Biến thể punctured: 2 vết đục lỗ tam giác toác mép thép sáng trên mặt vai can */}
      {punctured && (
        <group>
          {[
            { x: -0.042, z: 0.068, ry: 0.35 },
            { x: 0.03, z: -0.072, ry: -1.1 },
          ].map((h, i) => (
            <group key={i} position={[h.x, 0.406, h.z]} rotation={[0, h.ry, 0]}>
              <mesh geometry={geos.triHole} material={mats.holeBlack} />
              <mesh
                position={[0, 0.011, -0.013]}
                rotation={[-0.72, 0, 0]}
                geometry={geos.triFlap}
                material={mats.bareMetal}
              />
              <mesh position={[0.004, 0.002, 0.005]} geometry={rbox(0.052, 0.003, 0.046, 0.001)} material={mats.fuelWet} />
            </group>
          ))}
        </group>
      )}
    </group>
  );
};

// ============================================================================
// 5. MarkTwainSight — Thước ngắm ném bom 20 xu "Mark Twain" của Đại úy Ross Greening
//    (cao ~0.26 m, dài ~0.30 m, 2 thanh nhôm phế liệu ghép góc tam giác + núm đồng + khe chữ thập)
// ============================================================================
export type MarkTwainSightProps = {
  /** Góc chúi thanh ngắm theo độ cao & tốc độ bay (rad, mặc định 0.38) */
  aimAngle?: number;
};

export const MarkTwainSight: React.FC<MarkTwainSightProps> = ({ aimAngle = 0.38 }) => {
  const mats = useMemo(
    () => ({
      aluMain: paint({
        color: '#d2dae0',
        camo: [PAINT.aluminumScrap, '#e1e8ed'],
        wear: 0.25,
        dirt: 0.08,
        roughness: 0.32,
        metalness: 0.72,
        seed: 73,
      }),
      aluDark: plain('#939ea6', 0.4, 0.68),
      scaleInk: plain('#1b1f23', 0.65, 0.2),
      brassKnob: plain('#dfb04b', 0.22, 0.85),
      crossWire: plain('#231c10', 0.35, 0.75),
      spiritGlass: plain('#8ce0a8', 0.18, 0.2),
    }),
    [],
  );

  const geos = useMemo(() => {
    const quadPts: P2[] = [
      [-0.125, 0.025],
      [0.095, 0.025],
      [0.105, 0.055],
    ];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * (Math.PI * 0.46);
      quadPts.push([-0.115 + Math.cos(a) * 0.22, 0.035 + Math.sin(a) * 0.22]);
    }
    quadPts.push([-0.125, 0.255]);
    const quadrantPlate = extrude(quadPts, 0.009, 0.0015);

    const ringPts: [number, number, number][] = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ringPts.push([0, Math.cos(a) * 0.031, Math.sin(a) * 0.031]);
    }
    const frontHoodRing = pipe(ringPts, 0.0036, 28);

    const peepPts: [number, number, number][] = [];
    for (let i = 0; i <= 20; i++) {
      const a = (i / 20) * Math.PI * 2;
      peepPts.push([0, Math.cos(a) * 0.012, Math.sin(a) * 0.012]);
    }
    const rearPeepRing = pipe(peepPts, 0.003, 20);

    return { quadrantPlate, frontHoodRing, rearPeepRing };
  }, []);

  return (
    <group>
      {/* Thanh nhôm đế gá chữ T nằm ngang dài 0.29 m */}
      <mesh position={[-0.005, 0.012, 0]} geometry={rbox(0.29, 0.016, 0.08, 0.003)} material={mats.aluMain} castShadow receiveShadow />
      <mesh position={[-0.005, 0.026, 0]} geometry={rbox(0.27, 0.018, 0.025, 0.002)} material={mats.aluDark} castShadow />
      <mesh position={[0.045, 0.025, 0.024]} rotation={[0, 0, Math.PI / 2]} material={mats.spiritGlass}>
        <cylinderGeometry args={[0.0065, 0.0065, 0.058, 12]} />
      </mesh>

      {/* Bản nhôm tam giác cung chia độ đứng (có vạch chia độ ở cả 2 mặt hông) */}
      <mesh position={[0, 0, -0.008]} geometry={geos.quadrantPlate} material={mats.aluMain} castShadow />
      {Array.from({ length: 12 }, (_, i) => {
        const a = 0.08 + (i / 11) * (Math.PI * 0.4);
        const rx = -0.115 + Math.cos(a) * 0.206;
        const ry = 0.035 + Math.sin(a) * 0.206;
        return (
          <mesh
            key={`tick-${i}`}
            position={[rx, ry, -0.008]}
            rotation={[0, 0, a]}
            geometry={rbox(i % 3 === 0 ? 0.024 : 0.014, 0.0034, 0.012, 0.0005)}
            material={mats.scaleInk}
          />
        );
      })}
      {[
        { x: -0.068, y: 0.095, r: 0.024 },
        { x: -0.075, y: 0.168, r: 0.018 },
      ].map((lh, i) => (
        <mesh key={i} position={[lh.x, lh.y, -0.008]} rotation={[Math.PI / 2, 0, 0]} material={mats.aluDark}>
          <cylinderGeometry args={[lh.r, lh.r, 0.012, 18]} />
        </mesh>
      ))}

      {/* Thanh nhôm ngắm chéo xoay quanh bản lề sau + khe chữ thập + núm vặn đồng */}
      <group position={[-0.112, 0.215, 0.007]} rotation={[0, 0, -aimAngle]}>
        <mesh position={[0.132, 0, 0]} geometry={rbox(0.3, 0.023, 0.015, 0.003)} material={mats.aluMain} castShadow />
        <mesh position={[0.132, -0.009, 0.006]} geometry={rbox(0.295, 0.006, 0.025, 0.0015)} material={mats.aluDark} />

        {/* Lỗ ngắm sau */}
        <group position={[-0.012, 0.025, 0]}>
          <mesh position={[0, -0.012, 0]} geometry={rbox(0.008, 0.024, 0.016, 0.002)} material={mats.aluMain} />
          <mesh geometry={geos.rearPeepRing} material={mats.aluDark} />
        </group>

        {/* Vòng khe ngắm chữ thập phía trước (+X) */}
        <group position={[0.268, 0.034, 0]}>
          <mesh position={[0, -0.021, 0]} geometry={rbox(0.01, 0.028, 0.018, 0.002)} material={mats.aluMain} />
          <mesh geometry={geos.frontHoodRing} material={mats.aluMain} castShadow />
          <mesh geometry={rbox(0.0025, 0.06, 0.0025, 0.0005)} material={mats.crossWire} />
          <mesh geometry={rbox(0.0025, 0.0025, 0.06, 0.0005)} material={mats.crossWire} />
        </group>

        {/* Núm đồng khoá góc trên cung chia độ */}
        <group position={[0.205, 0, 0.017]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.brassKnob} castShadow>
            <cylinderGeometry args={[0.018, 0.018, 0.02, 20]} />
          </mesh>
          <mesh position={[0, 0, 0.012]} rotation={[Math.PI / 2, 0, 0]} material={mats.brassKnob}>
            <cylinderGeometry args={[0.01, 0.01, 0.013, 16]} />
          </mesh>
        </group>
      </group>

      {/* 2 núm đồng khía tại trục bản lề & con trượt tốc độ */}
      {[
        [-0.112, 0.215, 0.019],
        [-0.088, 0.036, 0.026],
      ].map(([kx, ky, kz], idx) => (
        <mesh key={`knob-${idx}`} position={[kx, ky, kz]} rotation={[Math.PI / 2, 0, 0]} material={mats.brassKnob} castShadow>
          <cylinderGeometry args={[0.017, 0.017, 0.022, 20]} />
        </mesh>
      ))}
    </group>
  );
};

// ============================================================================
// 6. ParachuteRaider — Phi công Doolittle nhảy dù trong đêm bão Trung Hoa
//    (Vòm dù lụa trắng ngà Ø 7.30 m có đỉnh ở y=+1.60 m, 12 dây dù, phi công cao 1.75 m ở y=-5.80..-4.05 m)
// ============================================================================
export type ParachuteRaiderProps = {
  /** Góc đung đưa con lắc trong gió bão (rad, mặc định 0) */
  sway?: number;
};

function buildSilkCanopyGeometry(): THREE.BufferGeometry {
  const GORES = 12;
  const SUB_U = 4;
  const STEPS_V = 12;
  const segU = GORES * SUB_U;

  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let iv = 0; iv <= STEPS_V; iv++) {
    const v = iv / STEPS_V;
    const phi = 0.07 + v * (Math.PI * 0.485);
    const baseR = Math.sin(phi) * 3.62;
    const baseY = 1.6 - (1 - Math.cos(phi)) * 1.76;

    for (let iu = 0; iu <= segU; iu++) {
      const a = (iu / segU) * Math.PI * 2;
      const gorePhase = ((iu % SUB_U) / SUB_U) * Math.PI;
      const puff = Math.sin(gorePhase) * (0.04 + 0.095 * Math.sin(v * Math.PI));
      const scallopY = Math.sin(gorePhase) * 0.09 * Math.pow(v, 2.2);

      const r = baseR + puff;
      const y = baseY + scallopY;
      pos.push(Math.cos(a) * r, y, Math.sin(a) * r);
      uvs.push((iu / segU) * 6, v * 2);
    }
  }

  const row = segU + 1;
  for (let iv = 0; iv < STEPS_V; iv++) {
    for (let iu = 0; iu < segU; iu++) {
      const a = iv * row + iu;
      const b = (iv + 1) * row + iu;
      const c = (iv + 1) * row + (iu + 1);
      const d = iv * row + (iu + 1);
      idx.push(a, b, c, a, c, d);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export const ParachuteRaider: React.FC<ParachuteRaiderProps> = ({ sway = 0 }) => {
  const mats = useMemo(
    () => ({
      silkCanopy: new THREE.MeshStandardMaterial({
        color: '#f3eee2',
        roughness: 0.72,
        metalness: 0.04,
        side: THREE.DoubleSide,
      }),
      seamRib: plain('#ccc4b0', 0.8, 0.04),
      shroudLine: plain('#e6e0cd', 0.78, 0.05),
      harnessWeb: plain('#e1dac6', 0.84, 0.05),
      maeWestYellow: plain('#f0be28', 0.58, 0.06),
      leatherA2: plain('#533322', 0.52, 0.1),
      furCollar: plain('#b89872', 0.88, 0.02),
      helmetLeather: plain('#3d2518', 0.56, 0.1),
      trousersKhaki: plain('#736a4b', 0.82, 0.04),
      bootsDark: plain('#2e1d14', 0.6, 0.12),
      skin: plain('#daa986', 0.74, 0.02),
      goggleGlass: plain(PAINT.cockpitGlass, 0.18, 0.8),
      buckleSteel: plain('#adb6bd', 0.35, 0.78),
    }),
    [],
  );

  const geos = useMemo(() => {
    const canopy = buildSilkCanopyGeometry();
    const seamPipes: THREE.BufferGeometry[] = [];
    const shroudPipes: THREE.BufferGeometry[] = [];
    const skirtPts: [number, number, number][] = [];

    const skirtPhi = 0.07 + Math.PI * 0.485;
    const skirtR = Math.sin(skirtPhi) * 3.62;
    const skirtY = 1.6 - (1 - Math.cos(skirtPhi)) * 1.76;

    for (let i = 0; i <= 48; i++) {
      const a = (i / 48) * Math.PI * 2;
      const gorePhase = ((i % 4) / 4) * Math.PI;
      const rr = skirtR + Math.sin(gorePhase) * 0.04;
      const yy = skirtY + Math.sin(gorePhase) * 0.09;
      skirtPts.push([Math.cos(a) * rr, yy, Math.sin(a) * rr]);
    }
    const skirtHem = pipe(skirtPts, 0.015, 56);

    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * Math.PI * 2;
      const ca = Math.cos(a);
      const sa = Math.sin(a);

      const ribPts: [number, number, number][] = [];
      for (let s = 0; s <= 8; s++) {
        const v = s / 8;
        const phi = 0.07 + v * (Math.PI * 0.485);
        const rr = Math.sin(phi) * 3.625;
        const yy = 1.604 - (1 - Math.cos(phi)) * 1.76;
        ribPts.push([ca * rr, yy, sa * rr]);
      }
      seamPipes.push(pipe(ribPts, 0.014, 14));

      const riserZ = sa >= 0 ? 0.2 : -0.2;
      const riserX = ca * 0.06;
      shroudPipes.push(
        pipe(
          [
            [ca * skirtR, skirtY, sa * skirtR],
            [ca * 1.85, -1.95, sa * 1.85],
            [riserX, -3.72, riserZ],
          ],
          0.0115,
          12,
        ),
      );
    }

    const riserRight = pipe([[0.02, -3.7, 0.2], [0.03, -4.12, 0.18], [0.06, -4.48, 0.14]], 0.023, 10);
    const riserLeft = pipe([[0.02, -3.7, -0.2], [0.03, -4.12, -0.18], [0.06, -4.48, -0.14]], 0.023, 10);

    return { canopy, skirtHem, seamPipes, shroudPipes, riserRight, riserLeft };
  }, []);

  return (
    <group position={[0, 1.6, 0]} rotation={[sway * 0.32, 0, sway]}>
      <group position={[0, -1.6, 0]}>
        {/* Vòm dù lụa trắng ngà Ø 7.30 m (đỉnh tại y = +1.60 m) + viền mép & 12 múi khâu */}
        <mesh geometry={geos.canopy} material={mats.silkCanopy} castShadow receiveShadow />
        <mesh geometry={geos.skirtHem} material={mats.seamRib} />
        {geos.seamPipes.map((g, i) => (
          <mesh key={`rib-${i}`} geometry={g} material={mats.seamRib} />
        ))}

        {/* 12 dây dù mảnh tụ xuống 2 đai vai */}
        {geos.shroudPipes.map((g, i) => (
          <mesh key={`line-${i}`} geometry={g} material={mats.shroudLine} />
        ))}
        <mesh geometry={geos.riserRight} material={mats.harnessWeb} />
        <mesh geometry={geos.riserLeft} material={mats.harnessWeb} />

        {/* Phi công Doolittle (cao 1.75 m, treo từ mũ bay y=-4.05 m tới mũi ủng y=-5.80 m) */}
        <group>
          <group position={[0.03, -4.18, 0]}>
            <mesh material={mats.skin} castShadow>
              <sphereGeometry args={[0.115, 16, 14]} />
            </mesh>
            <mesh position={[-0.012, 0.015, 0]} material={mats.helmetLeather} castShadow>
              <sphereGeometry args={[0.124, 16, 14]} />
            </mesh>
            <mesh position={[0.105, 0.025, -0.042]} rotation={[0, Math.PI / 2, 0]} material={mats.goggleGlass}>
              <cylinderGeometry args={[0.032, 0.032, 0.028, 12]} />
            </mesh>
            <mesh position={[0.105, 0.025, 0.042]} rotation={[0, Math.PI / 2, 0]} material={mats.goggleGlass}>
              <cylinderGeometry args={[0.032, 0.032, 0.028, 12]} />
            </mesh>
          </group>

          {/* Áo da bay A-2 nâu sẫm + cổ lông cừu */}
          <mesh position={[0, -4.58, 0]} geometry={rbox(0.27, 0.56, 0.42, 0.07)} material={mats.leatherA2} castShadow />
          <mesh position={[-0.01, -4.3, 0]} geometry={rbox(0.26, 0.07, 0.31, 0.03)} material={mats.furCollar} />

          {/* Áo phao vàng sáng "Mae West" B-3 hai múi phồng trước ngực */}
          <mesh position={[0.075, -4.52, -0.095]} geometry={rbox(0.21, 0.39, 0.165, 0.06)} material={mats.maeWestYellow} castShadow />
          <mesh position={[0.075, -4.52, 0.095]} geometry={rbox(0.21, 0.39, 0.165, 0.06)} material={mats.maeWestYellow} castShadow />
          <mesh position={[-0.02, -4.32, 0]} geometry={rbox(0.24, 0.085, 0.28, 0.04)} material={mats.maeWestYellow} />

          {/* Đai ngực vải trắng & khoá chữ D */}
          <mesh position={[0.165, -4.56, 0]} rotation={[0.48, 0, 0]} geometry={rbox(0.035, 0.44, 0.055, 0.008)} material={mats.harnessWeb} />
          <mesh position={[0.165, -4.56, 0]} rotation={[-0.48, 0, 0]} geometry={rbox(0.035, 0.44, 0.055, 0.008)} material={mats.harnessWeb} />
          <mesh position={[0.18, -4.58, 0]} geometry={rbox(0.03, 0.075, 0.075, 0.012)} material={mats.buckleSteel} />
          <mesh position={[-0.16, -4.58, 0]} geometry={rbox(0.11, 0.36, 0.3, 0.03)} material={mats.harnessWeb} castShadow />

          {/* Hai tay giơ nắm dây đai dù */}
          {([-1, 1] as const).map((side) => (
            <group key={`arm-${side}`}>
              <mesh
                position={[0.02, -4.24, side * 0.22]}
                rotation={[side * 0.08, 0, -0.12]}
                geometry={rbox(0.115, 0.52, 0.115, 0.045)}
                material={mats.leatherA2}
                castShadow
              />
              <mesh position={[0.025, -3.96, side * 0.2]} material={mats.helmetLeather}>
                <sphereGeometry args={[0.056, 10, 10]} />
              </mesh>
            </group>
          ))}

          {/* Hai chân quần bay khaki & ủng da bay ở y = -5.80 m */}
          <mesh position={[0, -4.92, 0]} geometry={rbox(0.24, 0.18, 0.36, 0.05)} material={mats.trousersKhaki} castShadow />
          {([-1, 1] as const).map((side) => (
            <group key={`leg-${side}`} position={[0, -4.98, side * 0.115]}>
              <mesh position={[0.03, -0.2, 0]} rotation={[0, 0, 0.16]} geometry={rbox(0.145, 0.42, 0.145, 0.05)} material={mats.trousersKhaki} castShadow />
              <mesh position={[0.02, -0.1, 0]} geometry={rbox(0.165, 0.05, 0.165, 0.015)} material={mats.harnessWeb} />
              <mesh position={[0.01, -0.55, 0]} rotation={[0, 0, -0.14]} geometry={rbox(0.125, 0.36, 0.125, 0.04)} material={mats.trousersKhaki} castShadow />
              <mesh position={[0.035, -0.76, 0]} geometry={rbox(0.21, 0.12, 0.12, 0.035)} material={mats.bootsDark} castShadow />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};

// ============================================================================
// Bàn trưng bày kiểm tra tổng hợp 6 món quân giới & đạo cụ (chỉ dùng cho preview)
// ============================================================================
const OrdnanceShowcase: React.FC = () => {
  const crateMat = useMemo(() => plain('#856a47', 0.84, 0.04), []);
  const standMat = useMemo(() => plain('#4e565c', 0.58, 0.35), []);

  return (
    <group>
      {/* 1. Bom phá 500-lb AN-M64 gắn huy chương hữu nghị Nhật Bản & ruy-băng đỏ-trắng trên giá gỗ */}
      <group position={[0.42, 0, 0.96]}>
        <mesh position={[-0.22, 0.09, 0]} geometry={rbox(0.12, 0.18, 0.42, 0.015)} material={crateMat} receiveShadow castShadow />
        <mesh position={[0.24, 0.09, 0]} geometry={rbox(0.12, 0.18, 0.42, 0.015)} material={crateMat} receiveShadow castShadow />
        <group position={[0, 0.28, 0]}>
          <BombANM64 medal />
        </group>
      </group>

      {/* 2. Chùm bom cháy 500-lb AN-M17 đang chúi mũi bung đai thép toả 72 thanh thermite lục giác (open=0.38) */}
      <group position={[0.38, 0, -0.94]}>
        <mesh position={[-0.08, 0.3, 0]} geometry={rbox(0.12, 0.6, 0.12, 0.02)} material={standMat} castShadow />
        <mesh position={[-0.08, 0.02, 0]} geometry={rbox(0.46, 0.04, 0.46, 0.01)} material={standMat} receiveShadow />
        <group position={[0, 0.66, 0]} rotation={[0, 0, -0.2]}>
          <IncendiaryCluster open={0.38} />
        </group>
      </group>

      {/* 3. Cặp quả bom cháy con lục giác 4-lb AN-M50 (1 quả thường + 1 quả phát sáng trắng-cam 4.000°F) */}
      <group position={[0.34, 0, 0.04]}>
        <mesh position={[0, 0.14, 0]} geometry={rbox(0.54, 0.28, 0.44, 0.02)} material={crateMat} castShadow receiveShadow />
        <group position={[0, 0.308, -0.095]}>
          <ThermiteBomblet ignited={false} />
        </group>
        <group position={[0, 0.308, 0.095]} rotation={[0, 0.16, 0]}>
          <ThermiteBomblet ignited />
        </group>
      </group>

      {/* 4. Can xăng thép 5-gallon quân sự Mỹ 1942 có gân chữ X, nắp đồng và vết đục lỗ tam giác */}
      <group position={[1.28, 0, -0.26]}>
        <mesh position={[0, 0.09, 0]} geometry={rbox(0.46, 0.18, 0.38, 0.015)} material={crateMat} castShadow receiveShadow />
        <group position={[0, 0.18, 0]} rotation={[0, -0.38, 0]}>
          <GasCan5Gal punctured />
        </group>
      </group>

      {/* 5. Thước ngắm nhôm phế liệu 20 xu "Mark Twain" của Đại úy Ross Greening đặt trên bệ cao vừa mắt */}
      <group position={[1.28, 0, 0.44]}>
        <mesh position={[0, 0.21, 0]} geometry={rbox(0.38, 0.42, 0.26, 0.015)} material={standMat} castShadow receiveShadow />
        <group position={[0, 0.42, 0]} rotation={[0, 0.32, 0]}>
          <MarkTwainSight aimAngle={0.36} />
        </group>
      </group>

      {/* 6. Phi công nhảy dù ParachuteRaider (thu nhỏ 0.28x riêng trong preview để thấy trọn cả 6 đạo cụ) */}
      <group position={[-1.25, 1.78, -0.02]} scale={0.28}>
        <ParachuteRaider sway={0.08} />
      </group>
    </group>
  );
};

export const preview = turntable(OrdnanceShowcase, { size: 4.5, center: [0, 0.9, 0] });

export default OrdnanceShowcase;
