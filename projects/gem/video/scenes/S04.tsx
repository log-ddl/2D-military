// Cảnh S04 (64.40 – 89.68s, thuần 3D):
// Fly-over tầm thấp ban ngày qua căn cứ hậu cần dã chiến Tháp 22 (Tower 22) tại ngã ba biên giới Jordan–Syria–Iraq
// (không đường băng bê tông — bãi trực thăng chữ H trên nền sỏi đầm, kho công binh, cần cẩu SkyHook 15 m & ScanEagle tuần tra),
// sau đó nâng độ cao nhìn dọc tuyến đường tiếp máu 20 km xuyên bờ đất biên giới tới tiền đồn Al-Tanf bên phía Syria.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { prog, lerp } from '@kit/theme';
import { useT, Label } from '@kit/motion';
import { Stage, Cam, type V3 } from '@lib/3d/stage';
import { Terrain, Scatter, heightField } from '@lib/3d/terrain';
import { extrude, extrudeTop, rbox, pipe, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Wheel } from '@lib/3d/parts';
import { DustTrail, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_RUKBAN_DAY, TERRAIN_RUKBAN_DAY } from '../local/palette';
import {
  ChuContainer,
  TWall,
  HescoWall,
  NightHawkMast,
  ConcreteBunker,
  ScanEagle,
  SkyHookCrane,
} from '../local/models';

/** Khoảng cách từ điểm (px, pz) tới đoạn thẳng 2D (ax, az) -> (bx, bz). */
const distToSeg2D = (px: number, pz: number, ax: number, az: number, bx: number, bz: number): number => {
  const vx = bx - ax;
  const vz = bz - az;
  const len2 = vx * vx + vz * vz;
  if (len2 < 1e-6) return Math.hypot(px - ax, pz - az);
  const u = Math.max(0, Math.min(1, ((px - ax) * vx + (pz - az) * vz) / len2));
  return Math.hypot(px - (ax + u * vx), pz - (az + u * vz));
};

/** Toạ độ X của tuyến đường đất sỏi tiếp vận chạy từ cổng Bắc Tháp 22 (-Z) tới tiền đồn Al-Tanf ở xa. */
const roadCenterX = (z: number): number => {
  if (z >= -20) return -6;
  const s = Math.min(1, (-20 - z) / 235);
  return -6 - 28 * (s * s * (3 - 2 * s)) + Math.sin((z + 20) / 38) * 3.2;
};

// Điểm giao ngã ba biên giới Jordan - Syria - Iraq (phía Đông-Bắc căn cứ Tháp 22)
const TRI_X = 42;
const TRI_Z = -44;

// Hàm độ cao cao nguyên đá sỏi Rukban + bờ đất (berm) ngã ba biên giới + đường đất tiếp vận
const rukbanDayHeight = heightField({
  seed: 22,
  amp: 3.4,
  scale: 135,
  flats: [
    // Mặt bằng sỏi đầm căn cứ dã chiến Tháp 22
    [0, 6, 42, 0],
    // Mặt bằng tiền đồn Al-Tanf ở xa phía Bắc bên kia biên giới Syria
    [-34, -252, 26, 1.4],
  ],
  add: (x, z) => {
    // 1. Ba nhánh bờ đất phân giới ngã ba biên giới (Jordan-Syria, Jordan-Iraq, Syria-Iraq)
    const dJS = distToSeg2D(x, z, -360, -34, TRI_X, TRI_Z);
    const dJI = distToSeg2D(x, z, TRI_X, TRI_Z, 320, 68);
    const dSI = distToSeg2D(x, z, TRI_X, TRI_Z, 210, -360);
    const dBerm = Math.min(dJS, dJI, dSI);

    // Mở cửa khẩu tiếp vận xuyên qua bờ đất biên giới tại nơi tuyến đường cắt qua
    const rx = roadCenterX(z);
    const dRoad = Math.abs(x - rx);
    const gateMask = Math.max(0, Math.min(1, (dRoad - 4.8) / 4.0));
    // Bờ đất biên giới đắp cao 3.3 m, sườn dốc sắc nét để nổi rõ giao điểm chữ Y ngã ba Jordan-Syria-Iraq
    const bermH = 3.35 * Math.exp(-((dBerm / 2.45) ** 2)) * gateMask;
    // Hào chống xe sâu chạy dọc sát bờ đất phân giới
    const ditchH = -0.95 * Math.exp(-(((dBerm - 4.4) / 1.8) ** 2)) * gateMask;

    // 2. Lòng đường đất sỏi tiếp vận đầm phẳng từ Tháp 22 sang Al-Tanf
    const inRoadSpan = z < -18 && z > -258 ? 1 : 0;
    const roadCut = inRoadSpan * -0.18 * Math.exp(-((dRoad / 3.6) ** 2));

    // 3. Bờ luỹ đất công sự thấp bao quanh chu vi ngoài căn cứ dã chiến Tháp 22 (mở cổng Bắc tại x ≈ -6)
    const pRect = Math.max(Math.abs(x) - 31, Math.abs(z - 5) - 26);
    const northGateOpen = z < -15 && Math.abs(x + 6) < 5.5 ? 0 : 1;
    const basePerimeterBerm = 1.45 * Math.exp(-((pRect / 1.9) ** 2)) * northGateOpen;

    // 4. Các gò đá bazan thấp phía xa tạo chiều sâu chân trời sa mạc Rukban
    const farRidge =
      5.5 * Math.exp(-(((z + 320) / 55) ** 2)) +
      3.8 * Math.exp(-(((x - 145) / 48) ** 2) - (((z + 130) / 80) ** 2));

    return bermH + ditchH + roadCut + basePerimeterBerm + farRidge;
  },
});

const avoidBaseAndRoad = (x: number, z: number): boolean => {
  // Tránh lòng căn cứ Tháp 22, tiền đồn Al-Tanf và lòng đường đất tiếp vận
  if (Math.hypot(x, z - 6) < 46) return true;
  if (Math.hypot(x + 34, z + 252) < 30) return true;
  if (z < -14 && z > -265 && Math.abs(x - roadCenterX(z)) < 7.5) return true;
  return false;
};

// -------------------- Phụ kiện dã chiến dựng tỉ lệ mét thật 1:1 --------------------

/** Lều vòm kho hậu cần / xưởng công binh dã chiến (dài 9.6 m, rộng 5.4 m, cao 3.25 m — KHÔNG phải nhà kiên cố). */
const LogisticsTent: React.FC<{ seed?: number }> = ({ seed = 71 }) => {
  const { shellGeo, ribGeo, crateMat, canvasMat, frameMat, tarpBlueMat } = useMemo(() => {
    const archPts: P2[] = [];
    const N = 20;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI;
      const px = -Math.cos(a) * 2.68;
      const py = 0.85 + Math.sin(a) * 2.38;
      archPts.push([px, py]);
    }
    const fullPts: P2[] = [[-2.72, 0], [-2.72, 0.85], ...archPts, [2.72, 0.85], [2.72, 0]];
    const ribPts: P2[] = [
      ...fullPts,
      [2.52, 0],
      [2.52, 0.82],
      ...Array.from({ length: N + 1 }, (_, i) => {
        const a = ((N - i) / N) * Math.PI;
        return [-Math.cos(a) * 2.48, 0.82 + Math.sin(a) * 2.18] as P2;
      }),
      [-2.52, 0.82],
      [-2.52, 0],
    ];
    // Lều vòm đùn dọc Z rồi xoay nằm dọc X
    const shell = extrude(fullPts, 9.4, 0.04).clone();
    shell.rotateY(Math.PI / 2);

    const rib = extrude(ribPts, 0.14, 0.015).clone();
    rib.rotateY(Math.PI / 2);

    return {
      shellGeo: shell,
      ribGeo: rib,
      canvasMat: paint({
        color: '#c9b48f',
        camo: ['#bba37c', '#d7c5a3'],
        camoScale: 2.5,
        repeat: 0.4,
        dirt: 0.28,
        wear: 0.14,
        roughness: 0.88,
        metalness: 0.04,
        seed,
      }),
      frameMat: plain('#5c646d', 0.55, 0.35),
      crateMat: paint({
        color: '#9e845c',
        camo: ['#8a714c', '#b3986f'],
        repeat: 0.9,
        dirt: 0.3,
        roughness: 0.85,
        metalness: 0.08,
        seed: seed + 5,
      }),
      tarpBlueMat: plain('#35688e', 0.72, 0.08),
    };
  }, [seed]);

  const darkOpeningMat = useMemo(() => plain('#1c2026', 0.92, 0.08), []);

  return (
    <group>
      <mesh geometry={shellGeo} material={canvasMat} castShadow receiveShadow />
      {[-4.4, -2.2, 0, 2.2, 4.4].map((rx) => (
        <mesh key={rx} position={[rx, 0, 0]} geometry={ribGeo} material={frameMat} castShadow />
      ))}
      {/* Cửa cuốn bạt mở ở hai đầu hồi kho hậu cần + kiện hàng pallet bên cửa */}
      {([-4.72, 4.72] as const).map((ex, idx) => (
        <group key={idx} position={[ex, 0, 0]}>
          <mesh position={[0, 1.32, 0]} geometry={rbox(0.08, 2.55, 3.1, 0.01)} material={darkOpeningMat} />
          <mesh position={[idx === 0 ? -0.1 : 0.1, 2.68, 0]} rotation={[Math.PI / 2, 0, 0]} material={canvasMat} castShadow>
            <cylinderGeometry args={[0.16, 0.16, 3.25, 14]} />
          </mesh>
        </group>
      ))}
      {/* Kiện hàng quân nhu & bồn nước/nhiên liệu dã chiến xếp sát hiên kho */}
      <group position={[5.45, 0, -1.1]}>
        <mesh position={[0, 0.52, 0]} geometry={rbox(1.35, 1.04, 1.15, 0.03)} material={crateMat} castShadow receiveShadow />
        <mesh position={[0, 1.07, 0]} geometry={rbox(1.4, 0.14, 1.2, 0.03)} material={tarpBlueMat} castShadow />
      </group>
      <group position={[5.35, 0, 1.25]}>
        <mesh position={[0, 0.42, 0]} geometry={rbox(1.15, 0.84, 1.05, 0.03)} material={crateMat} castShadow receiveShadow />
      </group>
    </group>
  );
};

/**
 * Bãi đáp trực thăng chữ H dã chiến trên nền sỏi đầm (KHÔNG có đường băng hay sân bê tông):
 * Đầm từ đất sỏi sẫm màu, viền bằng các viên đá tiêu quét vôi trắng-vàng, chữ H ghép từ tấm ghi dã chiến & cột túi gió cam.
 */
const GravelHelipad: React.FC<{ t: number }> = ({ t }) => {
  const gravelPadMat = useMemo(
    () =>
      paint({
        color: '#7a6952',
        camo: ['#6b5c47', '#8c795f'],
        camoScale: 3.5,
        repeat: 0.45,
        dirt: 0.4,
        wear: 0.2,
        roughness: 0.96,
        metalness: 0.03,
        seed: 88,
      }),
    [],
  );
  const limeMat = useMemo(
    () =>
      paint({
        color: '#e5dfd0',
        camo: ['#cfc7b6', '#f0ece1'],
        repeat: 0.8,
        dirt: 0.36,
        wear: 0.3,
        roughness: 0.92,
        metalness: 0.05,
        seed: 91,
      }),
    [],
  );
  const amberMarkMat = useMemo(() => plain('#d9a13b', 0.82, 0.08), []);
  const poleMat = useMemo(() => plain('#59626b', 0.5, 0.45), []);
  const sockOrange = useMemo(() => plain('#e85d2a', 0.65, 0.05), []);
  const sockWhite = useMemo(() => plain('#efeae0', 0.68, 0.05), []);

  const padDiskGeo = useMemo(() => {
    const pts: P2[] = Array.from({ length: 28 }, (_, i) => {
      const a = (i / 28) * Math.PI * 2;
      const r = 8.4 + Math.sin(i * 3.7) * 0.25;
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    return extrudeTop(pts, 0.055, 0.02);
  }, []);

  const windWave = Math.sin(t * 3.2) * 0.14;

  return (
    <group>
      {/* Nền sỏi đầm lu phẳng (không phải bê tông) */}
      <mesh geometry={padDiskGeo} material={gravelPadMat} receiveShadow />

      {/* 24 viên đá mốc sơn vôi trắng/vàng xếp vòng tròn quanh bãi đáp */}
      {Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        const r = 7.75;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, 0.09, Math.sin(a) * r]}
            rotation={[0, -a, 0]}
            geometry={rbox(0.42, 0.14, 0.68, 0.04)}
            material={i % 3 === 0 ? amberMarkMat : limeMat}
            castShadow
            receiveShadow
          />
        );
      })}

      {/* Chữ H dã chiến bằng tấm ghi rải trên mặt sỏi */}
      <mesh position={[-2.1, 0.068, 0]} geometry={rbox(0.85, 0.03, 5.8, 0.01)} material={limeMat} receiveShadow />
      <mesh position={[2.1, 0.068, 0]} geometry={rbox(0.85, 0.03, 5.8, 0.01)} material={limeMat} receiveShadow />
      <mesh position={[0, 0.07, 0]} geometry={rbox(3.45, 0.03, 0.85, 0.01)} material={limeMat} receiveShadow />

      {/* Cột túi gió hàng không dã chiến (Windsock) đặt ở góc bãi đáp */}
      <group position={[9.4, 0, -5.8]}>
        <mesh position={[0, 2.3, 0]} material={poleMat} castShadow>
          <cylinderGeometry args={[0.04, 0.055, 4.6, 10]} />
        </mesh>
        <group position={[0, 4.48, 0]} rotation={[0, -0.55 + windWave * 0.5, 0]}>
          {[0, 1, 2, 3].map((seg) => (
            <mesh
              key={seg}
              position={[0.32 + seg * 0.34, -seg * 0.03 + windWave * seg * 0.05, 0]}
              rotation={[0, 0, -Math.PI / 2 - 0.08 - windWave * 0.12]}
              material={seg % 2 === 0 ? sockOrange : sockWhite}
              castShadow
            >
              <cylinderGeometry args={[0.19 - seg * 0.032, 0.22 - seg * 0.032, 0.35, 12, 1, true]} />
            </mesh>
          ))}
        </group>
      </group>
    </group>
  );
};

/** Xe tải vận tải hậu cần quân sự FMTV 6x6 tỉ lệ thật (~6.8 m dài) chở hàng tiếp máu cho Al-Tanf. */
const SupplyTruck: React.FC<{ spin?: number }> = ({ spin = 0 }) => {
  const cabMat = useMemo(
    () =>
      paint({
        color: '#c4ae88',
        camo: ['#b09972', '#d4c09c'],
        repeat: 0.5,
        dirt: 0.32,
        wear: 0.18,
        roughness: 0.65,
        metalness: 0.22,
        seed: 104,
      }),
    [],
  );
  const tarpMat = useMemo(
    () =>
      paint({
        color: '#a8926d',
        camo: ['#96805d', '#baa47e'],
        repeat: 0.45,
        dirt: 0.3,
        wear: 0.12,
        roughness: 0.88,
        metalness: 0.05,
        seed: 109,
      }),
    [],
  );
  const chassisMat = useMemo(() => plain('#2a3038', 0.6, 0.45), []);
  const glassMat = useMemo(() => plain('#182633', 0.14, 0.78), []);

  const cabGeo = useMemo(
    () =>
      extrude(
        [
          [1.05, 0.72],
          [1.05, 2.68],
          [2.55, 2.68],
          [3.08, 1.92],
          [3.18, 1.48],
          [3.18, 0.72],
        ],
        2.36,
        0.06,
      ),
    [],
  );

  const cargoTarpGeo = useMemo(
    () =>
      extrude(
        [
          [-3.25, 1.12],
          [-3.25, 2.62],
          [-2.95, 2.95],
          [0.55, 2.95],
          [0.85, 2.62],
          [0.85, 1.12],
        ],
        2.42,
        0.05,
      ),
    [],
  );

  return (
    <group>
      {/* Sắt-xi gầm + cản trước */}
      <mesh position={[-0.1, 0.68, 0]} geometry={rbox(6.55, 0.28, 1.12, 0.04)} material={chassisMat} castShadow />
      <mesh position={[3.24, 0.66, 0]} geometry={rbox(0.24, 0.34, 2.38, 0.04)} material={chassisMat} castShadow />
      {/* Cabin bọc giáp & kính chắn gió */}
      <mesh geometry={cabGeo} material={cabMat} castShadow receiveShadow />
      <mesh position={[2.86, 2.18, 0]} rotation={[0, 0, 0.56]} geometry={rbox(0.08, 0.62, 2.02, 0.02)} material={glassMat} />
      {/* Sàn thùng hàng & khung mui bạt hậu cần */}
      <mesh position={[-1.2, 0.98, 0]} geometry={rbox(4.2, 0.26, 2.44, 0.03)} material={cabMat} castShadow />
      <mesh geometry={cargoTarpGeo} material={tarpMat} castShadow receiveShadow />
      {/* 6 bánh xe địa hình lớn (bán kính 0.54 m, chạm đất y = 0) */}
      {([-2.35, -1.05, 2.15] as const).map((wx) =>
        ([-1.06, 1.06] as const).map((wz) => (
          <group key={`${wx}_${wz}`} position={[wx, 0.54, wz]} rotation={[0, wz < 0 ? Math.PI : 0, 0]}>
            <Wheel r={0.54} width={0.36} spin={wz < 0 ? -spin : spin} />
          </group>
        )),
      )}
    </group>
  );
};

/** Cụm tiền đồn Al-Tanf ở phía xa bên kia biên giới Syria (cự ly biểu kiến chân trời đại diện 20 km). */
const AlTanfOutpostFar: React.FC<{ highlight: number }> = ({ highlight }) => {
  const bermMat = useMemo(
    () =>
      paint({
        color: '#b59c76',
        camo: ['#9e8662', '#cbb38c'],
        repeat: 0.5,
        dirt: 0.3,
        roughness: 0.92,
        metalness: 0.05,
        seed: 205,
      }),
    [],
  );
  const structMat = useMemo(() => plain('#d4cbbd', 0.72, 0.15), []);
  const mastMat = useMemo(() => plain('#6b7785', 0.5, 0.4), []);
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PAL3D.usBlueAccent,
        transparent: true,
        opacity: 0.78 * highlight,
        toneMapped: false,
      }),
    [highlight],
  );
  const beaconMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe680',
        transparent: true,
        opacity: 0.9 * highlight,
        toneMapped: false,
      }),
    [highlight],
  );

  return (
    <group>
      {/* Vành đai luỹ đất & tường công sự bao quanh tiền đồn Al-Tanf */}
      <mesh position={[0, 1.3, 13]} geometry={rbox(28, 2.6, 2.2, 0.2)} material={bermMat} castShadow receiveShadow />
      <mesh position={[0, 1.3, -13]} geometry={rbox(28, 2.6, 2.2, 0.2)} material={bermMat} castShadow receiveShadow />
      <mesh position={[-14, 1.3, 0]} geometry={rbox(2.2, 2.6, 26, 0.2)} material={bermMat} castShadow receiveShadow />
      <mesh position={[14, 1.3, 0]} geometry={rbox(2.2, 2.6, 26, 0.2)} material={bermMat} castShadow receiveShadow />
      {/* Các cụm nhà dã chiến & tháp truyền tin bên trong Al-Tanf */}
      {[-7, 0, 7].map((bx) => (
        <mesh key={bx} position={[bx, 1.6, -2]} geometry={rbox(4.8, 3.2, 7.5, 0.1)} material={structMat} castShadow />
      ))}
      <mesh position={[5, 9.5, 4]} material={mastMat} castShadow>
        <cylinderGeometry args={[0.18, 0.35, 19, 8]} />
      </mesh>
      {/* Vòng định vị chiến thuật phát sáng khi tuyến tiếp máu chạm tới Al-Tanf */}
      {highlight > 0.01 && (
        <>
          <mesh position={[0, 0.65, 0]} rotation={[-Math.PI / 2, 0, 0]} material={ringMat}>
            <ringGeometry args={[18.5, 20.6, 48]} />
          </mesh>
          <mesh position={[5, 19.4, 4]} material={beaconMat}>
            <sphereGeometry args={[0.95, 14, 12]} />
          </mesh>
        </>
      )}
    </group>
  );
};

const S04: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Dãy điểm 3D cho tuyến mạch dẫn sáng tiếp vận 20 km từ cổng Bắc Tháp 22 sang tiền đồn Al-Tanf
  const { supplyCorePts, supplyHaloPts, borderPosts, fuelPipeGeo } = useMemo(() => {
    const core: V3[] = [];
    const halo: V3[] = [];
    const steps = 72;
    for (let i = 0; i <= steps; i++) {
      const z = lerp(-18, -239, i / steps);
      const x = roadCenterX(z);
      const y = rukbanDayHeight(x, z);
      core.push([x, y + 0.65, z]);
      halo.push([x, y + 0.48, z]);
    }

    // Các cọc tiêu phân giới cắm dọc 3 nhánh bờ đất ngã ba biên giới
    const posts: V3[] = [];
    for (let k = -6; k <= 1; k++) {
      const u = (k + 6) / 7;
      const px = lerp(-95, TRI_X, u);
      const pz = lerp(-39.5, TRI_Z, u);
      if (Math.abs(px - roadCenterX(pz)) > 6.5) {
        posts.push([px, rukbanDayHeight(px, pz), pz]);
      }
    }
    for (let k = 1; k <= 5; k++) {
      const u = k / 5;
      const px1 = lerp(TRI_X, 130, u);
      const pz1 = lerp(TRI_Z, -10, u);
      posts.push([px1, rukbanDayHeight(px1, pz1), pz1]);

      const px2 = lerp(TRI_X, 95, u);
      const pz2 = lerp(TRI_Z, -135, u);
      posts.push([px2, rukbanDayHeight(px2, pz2), pz2]);
    }

    const fPipe = pipe(
      [
        [-2.2, 0.35, -8.5],
        [-2.2, 0.35, -3.5],
        [2.5, 0.35, -3.5],
      ],
      0.07,
      18,
    );

    return { supplyCorePts: core, supplyHaloPts: halo, borderPosts: posts, fuelPipeGeo: fPipe };
  }, []);

  // ---------- Động học ScanEagle bay lượn vòng thấp trên bãi thu hồi & bãi trực thăng chữ H ----------
  const orbitR = 17.5;
  const orbitCx = 13.5;
  const orbitCz = 1.5;
  const orbitAng = (t - 64.0) * 0.44 + 0.6;
  const uavX = orbitCx + Math.cos(orbitAng) * orbitR;
  const uavZ = orbitCz + Math.sin(orbitAng) * orbitR;
  const uavY = 12.2 + Math.sin(orbitAng * 2) * 0.55;
  // Vector vận tốc tiếp tuyến: vx = -sin(ang), vz = cos(ang) -> góc yaw chuẩn Three.js = atan2(-vz, vx)
  const uavVx = -Math.sin(orbitAng);
  const uavVz = Math.cos(orbitAng);
  const uavYaw = Math.atan2(-uavVz, uavVx);

  // ---------- Động học đoàn xe tải hậu cần chạy xuyên biên giới về hướng Al-Tanf ----------
  const convoyPosAt = (sec: number): V3 => {
    const z = -19 - Math.max(0, sec - 64.0) * 4.4;
    const x = roadCenterX(z);
    return [x, rukbanDayHeight(x, z), z];
  };
  const truckPos = convoyPosAt(t);
  const truckAhead = convoyPosAt(t + 0.25);
  const truckYaw = Math.atan2(-(truckAhead[2] - truckPos[2]), truckAhead[0] - truckPos[0]);
  const truckDist = Math.max(0, t - 64.0) * 4.4;

  // Tiến độ vệt dẫn sáng tuyến tiếp máu 20 km tới Al-Tanf (82.65 -> 86.2s)
  const supplyProg = prog(t, 82.65, 86.2);
  const alTanfHighlight = prog(t, 85.4, 86.8);

  // ---------- Chuyển động Camera 3 nhịp mượt mà suốt 25.28 giây ----------
  // Nhịp 1 (64.4 - 74.2s): Toàn cảnh trung-thấp Tháp 22 giữa sa mạc đá sỏi & lộ diện bờ đất ngã ba biên giới phía sau
  // Nhịp 2 (74.2 - 82.6s): Hạ thấp fly-over lướt sát bãi trực thăng chữ H sỏi đầm, kho công binh, cẩu SkyHook 15m & ScanEagle
  // Nhịp 3 (82.6 - 89.68s): Nâng cao mở đại cảnh nhìn dọc tuyến đường tiếp vận nối thẳng qua biên giới tới tiền đồn Al-Tanf
  const p1 = prog(t, 64.4, 74.2);
  const p2 = prog(t, 74.2, 82.6);
  const p3 = prog(t, 82.6, 89.5);

  const posA: V3 = [-42, 15.0, 40];
  const posB: V3 = [36, 14.5, 32];
  const posC: V3 = [-1, 10.6, 25];
  const posD: V3 = [-12, 39.0, 22];

  const lookA: V3 = [2, 2.4, -2];
  const lookB: V3 = [16, 2.8, -22];
  const lookC: V3 = [13, 6.8, -3];
  const lookD: V3 = [-28, 3.0, -185];

  const mixV3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const camPos = mixV3(mixV3(mixV3(posA, posB, p1), posC, p2), posD, p3);
  const camLook = mixV3(mixV3(mixV3(lookA, lookB, p1), lookC, p2), lookD, p3);
  const camFov = lerp(lerp(42, 43, p2), 43, p3);

  const bladderMat = useMemo(
    () =>
      paint({
        color: '#5d6652',
        camo: ['#4e5745', '#707a63'],
        repeat: 0.7,
        dirt: 0.35,
        roughness: 0.85,
        metalness: 0.08,
        seed: 144,
      }),
    [],
  );
  const postWhiteMat = useMemo(() => plain('#ebe5d8', 0.75, 0.08), []);
  const postRedMat = useMemo(() => plain('#c9412e', 0.7, 0.1), []);
  const roadTrackMat = useMemo(() => plain('#78654c', 0.96, 0.02), []);

  // Các xung mũi tên năng lượng chạy dọc tuyến tiếp máu khi supplyProg > 0
  const pulseCount = 5;

  return (
    <AbsoluteFill>
      <Stage {...STAGE_RUKBAN_DAY} shadowArea={62} shadowCenter={[2, 0, -4]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình cao nguyên đá sỏi Rukban trải rộng tới chân trời Bắc (không bao giờ hở mép sàn) */}
        <Terrain h={rukbanDayHeight} size={1100} seg={180} center={[0, -110]} colors={TERRAIN_RUKBAN_DAY} grainRepeat={56} />

        {/* Đá tảng bazan & đá dăm khô sa mạc Rukban (khử sắc xanh cây tươi để chuẩn sa mạc đá sỏi) */}
        <Scatter
          kind="rock"
          count={280}
          area={[-260, -320, 260, 140]}
          h={rukbanDayHeight}
          seed={41}
          scale={[0.45, 1.45]}
          avoid={avoidBaseAndRoad}
          tint="#9a8b78"
        />
        <Scatter
          kind="rock"
          count={220}
          area={[-230, -290, 230, 120]}
          h={rukbanDayHeight}
          seed={53}
          scale={[0.22, 0.52]}
          avoid={avoidBaseAndRoad}
          tint="#6d6256"
        />
        <Scatter
          kind="bush"
          count={65}
          area={[-220, -280, 220, 110]}
          h={rukbanDayHeight}
          seed={49}
          scale={[0.3, 0.58]}
          avoid={avoidBaseAndRoad}
          tint="#e09258"
        />

        {/* Vệt bánh xe sỏi đầm dọc con đường đất tiếp vận xuyên biên giới */}
        {Array.from({ length: 44 }, (_, i) => {
          const z0 = -20 - i * 5.0;
          const z1 = z0 - 3.6;
          const xm = roadCenterX((z0 + z1) * 0.5);
          const ang = Math.atan2(roadCenterX(z1) - roadCenterX(z0), z1 - z0);
          const ym = rukbanDayHeight(xm, (z0 + z1) * 0.5) + 0.03;
          return (
            <group key={i} position={[xm, ym, (z0 + z1) * 0.5]} rotation={[0, ang, 0]}>
              <mesh position={[-1.15, 0, 0]} geometry={rbox(0.65, 0.025, 3.8, 0.01)} material={roadTrackMat} receiveShadow />
              <mesh position={[1.15, 0, 0]} geometry={rbox(0.65, 0.025, 3.8, 0.01)} material={roadTrackMat} receiveShadow />
            </group>
          );
        })}

        {/* Cọc mốc phân giới trên đỉnh bờ đất chữ Y & Trụ mốc tam giác tại tâm Ngã ba biên giới */}
        <group position={[TRI_X, rukbanDayHeight(TRI_X, TRI_Z), TRI_Z]}>
          <mesh position={[0, 1.4, 0]} material={postWhiteMat} castShadow>
            <cylinderGeometry args={[0.25, 0.65, 2.8, 3]} />
          </mesh>
          <mesh position={[0, 2.45, 0]} material={postRedMat}>
            <cylinderGeometry args={[0.28, 0.34, 0.55, 3]} />
          </mesh>
        </group>
        {borderPosts.map((bp, idx) => (
          <group key={idx} position={bp}>
            <mesh position={[0, 0.75, 0]} material={postWhiteMat} castShadow>
              <cylinderGeometry args={[0.09, 0.11, 1.5, 8]} />
            </mesh>
            <mesh position={[0, 1.25, 0]} material={postRedMat}>
              <cylinderGeometry args={[0.096, 0.096, 0.34, 8]} />
            </mesh>
          </group>
        ))}

        {/* ==================== CĂN CỨ HẬU CẦN DÃ CHIẾN THÁP 22 (TOWER 22) ==================== */}

        {/* 1. Các cụm rọ đất công sự HESCO trấn giữ cổng Bắc, bãi cẩu SkyHook và khu kho hậu cần */}
        <group position={[-13.5, 0, -20.5]}>
          <HescoWall cells={5} />
        </group>
        <group position={[2.5, 0, -20.5]}>
          <HescoWall cells={5} />
        </group>
        <group position={[25.5, 0, -4.5]} rotation={[0, Math.PI / 2, 0]}>
          <HescoWall cells={5} />
        </group>
        <group position={[8.5, 0, -13.5]}>
          <HescoWall cells={4} />
        </group>

        {/* Tháp camera nhiệt NightHawk cao 6.5m ở góc Đông-Bắc hướng về biên giới Syria-Iraq */}
        <group position={[24.5, 0, -17.5]}>
          <NightHawkMast yaw={0.85} pitch={-0.06} strobe={0} />
        </group>

        {/* 2. Khu nhà ngủ container cải tạo CHU + Tường bê tông chống mảnh chữ T (T-Wall) + Hầm trú ẩn */}
        {([-19.5, -11.5] as const).map((cx, ci) =>
          ([9.0, 15.2] as const).map((cz, ri) => (
            <group key={`chu_${ci}_${ri}`} position={[cx, 0, cz]}>
              <ChuContainer warmLight={false} />
            </group>
          )),
        )}
        {/* Các dãy tường bê tông Bremer chữ T cao 3.66m che chắn sát dãy nhà CHU */}
        <group position={[-15.5, 0, 5.2]}>
          <TWall count={8} />
        </group>
        <group position={[-15.5, 0, 19.0]}>
          <TWall count={8} />
        </group>
        <group position={[-23.8, 0, 12.1]} rotation={[0, Math.PI / 2, 0]}>
          <TWall count={6} />
        </group>
        {/* Hầm bê tông chữ U cạnh khu sinh hoạt */}
        <group position={[-5.2, 0, 12.2]} rotation={[0, Math.PI, 0]}>
          <ConcreteBunker strobe={0} />
        </group>

        {/* 3. Khu kho hậu cần, công binh & nhiên liệu dã chiến (trung tâm căn cứ) */}
        <group position={[-8.5, 0, -8.5]}>
          <LogisticsTent />
        </group>
        <group position={[-8.5, 0, -0.5]}>
          <LogisticsTent />
        </group>
        {/* Bồn mềm dự trữ nhiên liệu dã chiến (fuel bladders) trong bờ bao cát nhỏ */}
        <group position={[2.2, 0, -7.2]}>
          <mesh position={[0, 0.48, -1.6]} scale={[1, 0.52, 1]} geometry={rbox(3.8, 1.5, 2.1, 0.55)} material={bladderMat} castShadow receiveShadow />
          <mesh position={[0, 0.48, 1.4]} scale={[1, 0.52, 1]} geometry={rbox(3.8, 1.5, 2.1, 0.55)} material={bladderMat} castShadow receiveShadow />
          <mesh geometry={fuelPipeGeo} material={plain('#444c54', 0.55, 0.5)} />
        </group>
        {/* Xe tải hậu cần đang đỗ bốc hàng cạnh lều kho */}
        <group position={[1.5, 0, 2.6]} rotation={[0, 2.75, 0]}>
          <SupplyTruck spin={0} />
        </group>

        {/* 4. Khu hàng không dã chiến: Bãi trực thăng chữ H sỏi đầm + Cần cẩu SkyHook 15m + ScanEagle bay lượn */}
        <group position={[15.5, 0, 14.5]}>
          <GravelHelipad t={t} />
        </group>

        <group position={[19.5, 0, -6.5]}>
          <SkyHookCrane
            spotlight={false}
            boomYaw={-0.42}
            cableSway={Math.sin(t * 1.15) * 0.12}
          />
        </group>

        {/* UAV trinh sát không bánh xe ScanEagle bay lượn tuần tra tầm thấp trên bãi thu hồi */}
        <group position={[uavX, uavY, uavZ]} rotation={[0, uavYaw, 0]}>
          <ScanEagle
            propSpin={(t - 64.0) * 52}
            bank={0.32}
            pitch={0.03}
            turretYaw={0.45}
          />
        </group>

        {/* ==================== TUYẾN TIẾP MÁU 20 KM TỚI TIỀN ĐỒN AL-TANF ==================== */}

        {/* Xe tải tiếp vận đang hành quân từ cổng Bắc Tháp 22 xuyên biên giới sang Al-Tanf */}
        <group position={truckPos} rotation={[0, truckYaw, 0]}>
          <SupplyTruck spin={truckDist / 0.54} />
        </group>
        <DustTrail
          t={t}
          from={64.0}
          to={90.0}
          path={(sec) => {
            const p = convoyPosAt(sec);
            return [p[0], p[1] + 0.1, p[2] + 2.8];
          }}
          rate={6}
          size={1.7}
          color="#cdb998"
          life={2.6}
        />

        {/* Vệt mạch dẫn sáng tiếp vận nối từ Tháp 22 qua bờ biên giới Syria tới Al-Tanf (82.65 - 89.68s) */}
        {supplyProg > 0.002 && (
          <>
            <Trail points={supplyHaloPts} upto={supplyProg} color="#ff9d2e" width={0.48} opacity={0.34} glow />
            <Trail points={supplyCorePts} upto={supplyProg} color="#fff2b2" width={0.21} opacity={0.95} glow />
            {Array.from({ length: pulseCount }, (_, k) => {
              const u = ((t * 0.36 + k / pulseCount) % 1) * supplyProg;
              if (u < 0.03 || u > supplyProg - 0.02) return null;
              const idx = Math.min(supplyCorePts.length - 1, Math.floor(u * (supplyCorePts.length - 1)));
              const pt = supplyCorePts[idx];
              return (
                <mesh key={k} position={[pt[0], pt[1] + 0.18, pt[2]]}>
                  <sphereGeometry args={[0.52, 12, 10]} />
                  <meshBasicMaterial color="#fff6cc" toneMapped={false} />
                </mesh>
              );
            })}
          </>
        )}

        {/* Tiền đồn Al-Tanf của Mỹ ở phía xa bên kia biên giới Syria */}
        <group position={[-34, rukbanDayHeight(-34, -252), -252]}>
          <AlTanfOutpostFar highlight={alTanfHighlight} />
        </group>
      </Stage>

      {/* Nhãn chữ: tối đa 1 <Label> tại mọi thời điểm */}
      <Label
        t={t}
        text="TOWER 22"
        x={960}
        y={138}
        from={CUE.s04_tower22}
        until={73.5}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="AL-TANF · 20 KM"
        x={960}
        y={138}
        from={CUE.s04_altanf}
        until={89.2}
        bg={PAL2D.usMid}
        fg={PAL2D.paper}
      />
    </AbsoluteFill>
  );
};

export default S04;
