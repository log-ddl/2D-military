// Công trình doanh trại & công sự phòng thủ Tháp 22 (Tower 22, Jordan) — tỉ lệ 1:1 mét thật, mặt đáy y = 0.
// Gồm: ChuContainer (ISO 20ft cải tạo nhà ngủ), TWall (tường bê tông Bremer chữ T), HescoWall (rọ đất công sự HESCO),
// NightHawkMast (tháp giàn thép 6.5m gắn camera ảnh nhiệt EO/IR NightHawk & còi báo động), ConcreteBunker (hầm chữ U).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, rbox, pipe, merge, mat4, type P2 } from '@lib/3d/geom';
import { paint, plain, fbm } from '@lib/3d/materials';
import { Rivets } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

const clamp01 = (v = 0) => Math.max(0, Math.min(1, v));

// ============================================================================
// 1. CHU CONTAINER — Nhà ngủ container cải tạo ISO 20ft (6.06 × 2.44 × 2.59 m)
// ============================================================================

export type ChuContainerProps = {
  /** Mức độ hư hại sau vụ nổ (0..1): xé toạc mảng vách tôn & góc mái, ám khói đen, lộ khung thép trong. */
  damaged?: number;
  /** Lắp thêm hệ khung giàn thép và mái nghiêng kích nổ sớm cao +0.85 m trên nóc (S20). */
  hasBlastRoof?: boolean;
  /** Bật ánh sáng vàng ấm #ffbe6b hắt qua khe cửa sổ chớp & đèn hiên (cảnh đêm rạng sáng 05:30). */
  warmLight?: boolean;
  seed?: number;
};

/** Tạo biên dạng mặt bằng tôn sóng hình thang dọc theo trục X (x0..x1) để đùn đứng bằng extrudeTop. */
function makeCorrugatedWallGeo(x0: number, x1: number, height: number, zSign: 1 | -1, period = 0.28): THREE.BufferGeometry {
  const pts: P2[] = [];
  const zOut = 1.204 * zSign;
  const zIn = 1.146 * zSign;
  const zBack = 1.114 * zSign;
  const span = x1 - x0;
  const steps = Math.max(2, Math.round(span / period));
  const dx = span / steps;

  for (let i = 0; i < steps; i++) {
    const a = x0 + i * dx;
    pts.push([a, zIn]);
    pts.push([a + dx * 0.14, zOut]);
    pts.push([a + dx * 0.50, zOut]);
    pts.push([a + dx * 0.64, zIn]);
  }
  pts.push([x1, zIn]);
  pts.push([x1, zBack]);
  pts.push([x0, zBack]);
  return extrudeTop(pts, height, 0.004);
}

/** Tạo mảng tôn sóng đầu hồi dọc theo trục Z (z0..z1) tại đầu X. */
function makeEndCorrugatedGeo(z0: number, z1: number, height: number, xSign: 1 | -1, period = 0.25): THREE.BufferGeometry {
  const pts: P2[] = [];
  const xOut = 2.980 * xSign;
  const xIn = 2.932 * xSign;
  const xBack = 2.900 * xSign;
  const span = z1 - z0;
  const steps = Math.max(2, Math.round(span / period));
  const dz = span / steps;

  for (let i = 0; i < steps; i++) {
    const a = z0 + i * dz;
    pts.push([xIn, a]);
    pts.push([xOut, a + dz * 0.15]);
    pts.push([xOut, a + dz * 0.50]);
    pts.push([xIn, a + dz * 0.65]);
  }
  pts.push([xIn, z1]);
  pts.push([xBack, z1]);
  pts.push([xBack, z0]);
  return extrudeTop(pts, height, 0.004);
}

/** Tạo tấm nóc tôn dập sóng ngang (chạy từ x0..x1, đùn dọc Z). */
function makeRoofDeckGeo(x0: number, x1: number, zDepth: number): THREE.BufferGeometry {
  const pts: P2[] = [];
  const span = x1 - x0;
  const steps = Math.max(2, Math.round(span / 0.30));
  const dx = span / steps;
  for (let i = 0; i < steps; i++) {
    const a = x0 + i * dx;
    pts.push([a, 2.536]);
    pts.push([a + dx * 0.16, 2.574]);
    pts.push([a + dx * 0.52, 2.574]);
    pts.push([a + dx * 0.68, 2.536]);
  }
  pts.push([x1, 2.536]);
  pts.push([x1, 2.495]);
  pts.push([x0, 2.495]);
  return extrude(pts, zDepth, 0.004);
}

/** Khung cửa sổ chớp quân sự CHU (kích thước ~0.86 × 0.74 m), phát sáng khe chớp khi warmLight = true. */
const ChuShutteredWindow: React.FC<{
  pos: [number, number, number];
  warmLight: boolean;
  frameMat: THREE.Material;
  slatMat: THREE.Material;
  tilted?: number;
}> = ({ pos, warmLight, frameMat, slatMat, tilted = 0 }) => {
  const paneMat = useMemo(
    () =>
      warmLight
        ? plain('#ffdca6', 0.32, 0.05, {
            emissive: new THREE.Color('#ffbe6b'),
            emissiveIntensity: 1.95,
          })
        : plain('#17212b', 0.16, 0.55),
    [warmLight]
  );
  const bounceMat = useMemo(
    () =>
      warmLight
        ? plain('#d5ab70', 0.65, 0.1, {
            emissive: new THREE.Color('#ffbe6b'),
            emissiveIntensity: 0.42,
          })
        : slatMat,
    [warmLight, slatMat]
  );

  return (
    <group position={pos} rotation={[tilted * 0.18, -tilted * 0.22, tilted * 0.28]}>
      {/* Khung bao thép hộp ngoài */}
      <mesh geometry={rbox(0.86, 0.06, 0.08, 0.008)} position={[0, 0.35, 0]} material={frameMat} castShadow />
      <mesh geometry={rbox(0.88, 0.07, 0.115, 0.008)} position={[0, -0.35, 0.016]} material={frameMat} castShadow />
      <mesh geometry={rbox(0.06, 0.66, 0.08, 0.008)} position={[-0.40, 0, 0]} material={frameMat} castShadow />
      <mesh geometry={rbox(0.06, 0.66, 0.08, 0.008)} position={[0.40, 0, 0]} material={frameMat} castShadow />
      {/* Gờ chắn mưa trên cửa sổ */}
      <mesh
        geometry={rbox(0.92, 0.025, 0.13, 0.005)}
        position={[0, 0.395, 0.03]}
        rotation={[0.16, 0, 0]}
        material={frameMat}
        castShadow
      />
      {/* Mặt kính / lòng sáng bên trong */}
      <mesh geometry={rbox(0.74, 0.62, 0.02, 0.003)} position={[0, 0, -0.012]} material={paneMat} />
      {/* Đố dọc chia đôi */}
      <mesh geometry={rbox(0.032, 0.63, 0.045, 0.005)} position={[0, 0, 0.008]} material={frameMat} />
      {/* 6 lá sách cửa sổ chớp nghiêng chắn nắng bụi */}
      {[-0.24, -0.144, -0.048, 0.048, 0.144, 0.24].map((sy, idx) => (
        <mesh
          key={idx}
          geometry={rbox(0.73, 0.022, 0.078, 0.004)}
          position={[0, sy, 0.026]}
          rotation={[0.48 + (idx % 2) * tilted * 0.35, 0, 0]}
          material={bounceMat}
          castShadow
        />
      ))}
    </group>
  );
};

/** Cục nóng điều hòa cửa sổ (through-wall AC unit) gắn nhô ra ở đầu hồi +X kèm quạt lưới rõ nét. */
const WindowAcUnit: React.FC<{ pos: [number, number, number]; seed: number; frameMat: THREE.Material }> = ({
  pos,
  seed,
  frameMat,
}) => {
  const acBodyMat = useMemo(
    () =>
      paint({
        color: '#bcc2c7',
        camo: ['#aeb5bb', '#c8ced3'],
        camoScale: 4,
        repeat: 1.1,
        dirt: 0.25,
        wear: 0.12,
        roughness: 0.58,
        metalness: 0.16,
        seed: seed + 19,
      }),
    [seed]
  );
  const darkCavityMat = plain('#151a1f', 0.9, 0.12);
  const meshGrilleMat = plain('#505a64', 0.45, 0.32);

  // Quạt lưới bảo vệ mặt trước cục nóng (gộp vòng đồng tâm + nan hướng tâm)
  const grilleGeo = useMemo(() => {
    const parts: THREE.BufferGeometry[] = [];
    for (const rad of [0.055, 0.105, 0.155, 0.208]) {
      const ring = new THREE.TorusGeometry(rad, 0.006, 6, 28);
      ring.applyMatrix4(mat4([0, 0, 0], [0, Math.PI / 2, 0]));
      parts.push(ring);
    }
    for (let k = 0; k < 8; k++) {
      const ang = (k / 8) * Math.PI;
      const spoke = new THREE.CylinderGeometry(0.0055, 0.0055, 0.43, 6);
      spoke.applyMatrix4(mat4([0, 0, 0], [ang, 0, 0]));
      parts.push(spoke);
    }
    return merge(parts);
  }, []);

  const drainPipeGeo = useMemo(
    () =>
      pipe(
        [
          [0.14, -0.27, 0.26],
          [0.10, -0.46, 0.28],
          [0.05, -0.88, 0.28],
          [0.06, -1.24, 0.30],
        ],
        0.014,
        20
      ),
    []
  );

  const whipPipeGeo = useMemo(
    () =>
      pipe(
        [
          [0.12, -0.18, -0.39],
          [0.04, -0.32, -0.52],
          [-0.01, -0.24, -0.66],
          [-0.01, -0.10, -0.72],
        ],
        0.017,
        20
      ),
    []
  );

  return (
    <group position={pos}>
      {/* Khung cổ áo xuyên vách + 2 thanh chống chữ L chịu lực */}
      <mesh geometry={rbox(0.08, 0.62, 0.86, 0.01)} position={[0.02, 0, 0]} material={frameMat} castShadow />
      {[-0.32, 0.32].map((sz, i) => (
        <group key={i} position={[0, 0, sz]}>
          <mesh geometry={rbox(0.52, 0.045, 0.045, 0.006)} position={[0.25, -0.30, 0]} material={frameMat} castShadow />
          <mesh
            geometry={rbox(0.56, 0.04, 0.04, 0.006)}
            position={[0.22, -0.49, 0]}
            rotation={[0, 0, 0.64]}
            material={frameMat}
            castShadow
          />
        </group>
      ))}

      {/* Thân vỏ thép cục nóng màu xám sáng nổi rõ chi tiết quạt */}
      <mesh geometry={rbox(0.48, 0.54, 0.78, 0.018)} position={[0.25, 0, 0]} material={acBodyMat} castShadow receiveShadow />
      {/* Nắp che nắng gờ nghiêng bên trên */}
      <mesh
        geometry={rbox(0.53, 0.028, 0.82, 0.006)}
        position={[0.26, 0.285, 0]}
        rotation={[0, 0, -0.06]}
        material={frameMat}
        castShadow
      />

      {/* Khe tản nhiệt dàn ngưng hai bên hông cục nóng */}
      {([-1, 1] as const).map((side) =>
        [-0.20, -0.13, -0.06, 0.01, 0.08, 0.15].map((ly, k) => (
          <mesh
            key={`${side}_${k}`}
            geometry={rbox(0.34, 0.022, 0.018, 0.003)}
            position={[0.26, ly, side * 0.394]}
            material={darkCavityMat}
          />
        ))
      )}

      {/* Vành miệng gió tròn & Khoang hốc quạt âm vào mặt trước +X */}
      <mesh position={[0.494, 0.01, 0.10]} rotation={[0, Math.PI / 2, 0]} material={frameMat}>
        <torusGeometry args={[0.218, 0.012, 8, 28]} />
      </mesh>
      <mesh position={[0.482, 0.01, 0.10]} rotation={[0, 0, Math.PI / 2]} material={darkCavityMat}>
        <cylinderGeometry args={[0.214, 0.214, 0.03, 28]} />
      </mesh>
      {/* Bầu mô-tơ + 5 cánh quạt dàn nóng */}
      <group position={[0.488, 0.01, 0.10]}>
        <mesh rotation={[0, 0, Math.PI / 2]} material={plain('#6c757e', 0.45, 0.35)}>
          <cylinderGeometry args={[0.048, 0.048, 0.04, 16]} />
        </mesh>
        {[0, 1, 2, 3, 4].map((b) => {
          const a = (b / 5) * Math.PI * 2 + 0.35;
          return (
            <mesh
              key={b}
              geometry={rbox(0.012, 0.145, 0.068, 0.004)}
              position={[0.004, Math.cos(a) * 0.115, Math.sin(a) * 0.115]}
              rotation={[a, 0.42, 0]}
              material={plain('#3c444d', 0.5, 0.3)}
            />
          );
        })}
      </group>
      {/* Lưới thép bảo vệ quạt */}
      <mesh geometry={grilleGeo} position={[0.504, 0.01, 0.10]} material={meshGrilleMat} castShadow />

      {/* Nắp hộp máy nén & khe gió phụ bên cạnh quạt */}
      <mesh geometry={rbox(0.022, 0.44, 0.20, 0.005)} position={[0.492, 0, -0.24]} material={acBodyMat} />
      {[-0.14, -0.07, 0, 0.07, 0.14].map((vy, k) => (
        <mesh
          key={k}
          geometry={rbox(0.028, 0.02, 0.15, 0.003)}
          position={[0.498, vy, -0.24]}
          material={darkCavityMat}
        />
      ))}

      {/* Hộp cầu dao điện ngoài trời + ống ruột gà & ống xả nước ngưng */}
      <mesh geometry={rbox(0.11, 0.22, 0.16, 0.01)} position={[0.05, -0.02, -0.74]} material={frameMat} castShadow />
      <mesh geometry={whipPipeGeo} material={plain('#333940', 0.7, 0.2)} castShadow />
      <mesh geometry={drainPipeGeo} material={plain('#c5ccd1', 0.55, 0.08)} />
    </group>
  );
};

/** Giàn mái thép chống đạn kích nổ sớm (pre-detonation stand-off blast roof, cao +0.86 m trên nóc CHU). */
const ChuBlastRoof: React.FC<{ steelMat: THREE.Material; roofSheetMat: THREE.Material }> = ({
  steelMat,
  roofSheetMat,
}) => {
  const trussX = [-2.90, -0.97, 0.97, 2.90];
  return (
    <group position={[0, 2.59, 0]}>
      {/* 4 vì kèo thép chữ A chống trên dầm nóc ISO */}
      {trussX.map((tx, idx) => (
        <group key={idx} position={[tx, 0, 0]}>
          <mesh geometry={rbox(0.08, 0.52, 0.08, 0.008)} position={[0, 0.26, -1.13]} material={steelMat} castShadow />
          <mesh geometry={rbox(0.08, 0.52, 0.08, 0.008)} position={[0, 0.26, 1.13]} material={steelMat} castShadow />
          <mesh geometry={rbox(0.08, 0.82, 0.08, 0.008)} position={[0, 0.41, 0]} material={steelMat} castShadow />
          <mesh geometry={rbox(0.06, 0.06, 2.34, 0.006)} position={[0, 0.04, 0]} material={steelMat} castShadow />
          <mesh
            geometry={rbox(0.055, 0.055, 1.24, 0.005)}
            position={[0, 0.44, -0.56]}
            rotation={[0.52, 0, 0]}
            material={steelMat}
            castShadow
          />
          <mesh
            geometry={rbox(0.055, 0.055, 1.24, 0.005)}
            position={[0, 0.44, 0.56]}
            rotation={[-0.52, 0, 0]}
            material={steelMat}
            castShadow
          />
          <mesh
            geometry={rbox(0.07, 0.07, 1.51, 0.006)}
            position={[0, 0.65, -0.73]}
            rotation={[-0.23, 0, 0]}
            material={steelMat}
            castShadow
          />
          <mesh
            geometry={rbox(0.07, 0.07, 1.51, 0.006)}
            position={[0, 0.65, 0.73]}
            rotation={[0.23, 0, 0]}
            material={steelMat}
            castShadow
          />
        </group>
      ))}

      {/* Xà gồ dọc đỡ tôn kích nổ sớm */}
      {[-1.32, -0.68, 0, 0.68, 1.32].map((pz, k) => {
        const py = 0.82 - Math.abs(pz) * 0.235;
        return (
          <mesh
            key={k}
            geometry={rbox(6.44, 0.05, 0.05, 0.005)}
            position={[0, py, pz]}
            material={steelMat}
            castShadow
          />
        );
      })}

      {/* Hai mái tôn thép kích nổ sớm nghiêng 2 phía + úp nóc */}
      <mesh
        geometry={rbox(6.48, 0.032, 1.52, 0.005)}
        position={[0, 0.685, -0.735]}
        rotation={[-0.23, 0, 0]}
        material={roofSheetMat}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={rbox(6.48, 0.032, 1.52, 0.005)}
        position={[0, 0.685, 0.735]}
        rotation={[0.23, 0, 0]}
        material={roofSheetMat}
        castShadow
        receiveShadow
      />
      <mesh geometry={rbox(6.50, 0.045, 0.22, 0.008)} position={[0, 0.855, 0]} material={steelMat} castShadow />
    </group>
  );
};

export const ChuContainer: React.FC<ChuContainerProps> = ({
  damaged = 0,
  hasBlastRoof = false,
  warmLight = false,
  seed = 11,
}) => {
  const dmg = clamp01(damaged);
  const breached = dmg > 0.04;

  const wallMat = useMemo(
    () =>
      paint({
        color: PAL3D.chuWall,
        camo: ['#cdc5b6', '#ded8cc'],
        camoScale: 4,
        repeat: 0.42,
        dirt: 0.24 + dmg * 0.32,
        wear: 0.08 + dmg * 0.22,
        roughness: 0.78,
        metalness: 0.14,
        seed,
      }),
    [seed, dmg]
  );

  const roofMat = useMemo(
    () =>
      paint({
        color: PAL3D.chuRoof,
        camo: ['#a4acb5', '#b8c0c9'],
        camoScale: 4,
        repeat: 0.42,
        dirt: 0.26 + dmg * 0.3,
        wear: 0.12,
        roughness: 0.74,
        metalness: 0.20,
        seed: seed + 5,
      }),
    [seed, dmg]
  );

  const frameMat = useMemo(
    () =>
      paint({
        color: '#75808d',
        camo: [PAL3D.chuFrame, '#828e9c'],
        camoScale: 4,
        repeat: 0.55,
        dirt: 0.26,
        wear: 0.16,
        roughness: 0.60,
        metalness: 0.22,
        seed: seed + 9,
      }),
    [seed]
  );

  const doorMat = useMemo(
    () =>
      paint({
        color: '#c4bdb0',
        camo: ['#b9b1a3', '#cfc8bb'],
        camoScale: 4,
        repeat: 0.8,
        dirt: 0.22,
        wear: 0.12,
        roughness: 0.68,
        metalness: 0.18,
        seed: seed + 15,
      }),
    [seed]
  );

  const charMat = useMemo(
    () =>
      paint({
        color: '#222428',
        camo: ['#151619', '#383532'],
        camoScale: 3,
        repeat: 0.9,
        dirt: 0.75,
        wear: 0.12,
        roughness: 0.94,
        metalness: 0.10,
        seed: seed + 33,
      }),
    [seed]
  );

  // Vách sóng mặt sau (-Z) nguyên tấm
  const backWallGeo = useMemo(() => makeCorrugatedWallGeo(-2.86, 2.86, 2.32, -1, 0.286), []);
  // Vách sóng mặt trước (+Z): nguyên tấm khi chưa nổ, hoặc khoét mảng toạc (-2.42..-0.36) khi damaged > 0
  const frontWallIntactGeo = useMemo(() => makeCorrugatedWallGeo(-2.86, 2.86, 2.32, 1, 0.286), []);
  const frontWallLeftGeo = useMemo(() => makeCorrugatedWallGeo(-2.86, -2.42, 2.32, 1, 0.22), []);
  const frontWallRightGeo = useMemo(() => makeCorrugatedWallGeo(-0.36, 2.86, 2.32, 1, 0.286), []);
  const frontWallApronGeo = useMemo(() => makeCorrugatedWallGeo(-2.42, -0.36, 0.74, 1, 0.258), []);

  // Hai đầu hồi (+X gắn AC, -X cửa container hàn kín)
  const plusXWallGeo = useMemo(() => makeEndCorrugatedGeo(-1.05, 1.05, 2.32, 1, 0.262), []);
  const minusXWallGeo = useMemo(() => makeEndCorrugatedGeo(-1.05, 1.05, 2.26, -1, 0.262), []);

  // Tấm nóc tôn dập sóng
  const roofIntactGeo = useMemo(() => makeRoofDeckGeo(-2.88, 2.88, 2.18), []);
  const roofLeftGeo = useMemo(() => makeRoofDeckGeo(-2.88, -2.40, 2.18), []);
  const roofRightGeo = useMemo(() => makeRoofDeckGeo(-0.34, 2.88, 2.18), []);

  // Tay vịn nhỏ bên bậc thềm cửa
  const stepRailGeo = useMemo(
    () =>
      pipe(
        [
          [2.30, 0.14, 1.24],
          [2.30, 0.76, 1.24],
          [2.30, 0.76, 1.50],
          [2.30, 0.14, 1.50],
        ],
        0.016,
        24
      ),
    []
  );

  const darkSlotMat = plain('#151a20', 0.9, 0.18);

  return (
    <group>
      {/* Lõi hộp kín bên trong tránh khe sáng lọt qua mối ghép (khoét vùng nổ khi breached) */}
      {!breached ? (
        <mesh geometry={rbox(5.84, 2.34, 2.22, 0.01)} position={[0, 1.31, 0]} material={darkSlotMat} />
      ) : (
        <>
          <mesh geometry={rbox(3.26, 2.34, 2.22, 0.01)} position={[1.22, 1.31, 0]} material={darkSlotMat} />
          <mesh geometry={rbox(0.48, 2.34, 2.22, 0.01)} position={[-2.64, 1.31, 0]} material={darkSlotMat} />
        </>
      )}

      {/* 8 gù đúc góc tiêu chuẩn ISO (Corner Castings) kèm lỗ khóa twist-lock sắc nét */}
      {([-2.94, 2.94] as const).map((cx) =>
        ([0.09, 2.50] as const).map((cy, yi) =>
          ([-1.13, 1.13] as const).map((cz) => (
            <group key={`${cx}_${cy}_${cz}`} position={[cx, cy, cz]}>
              <mesh geometry={rbox(0.18, 0.18, 0.18, 0.012)} material={frameMat} castShadow receiveShadow />
              <mesh geometry={rbox(0.088, 0.054, 0.192, 0.01)} material={darkSlotMat} />
              <mesh geometry={rbox(0.192, 0.054, 0.088, 0.01)} material={darkSlotMat} />
              {yi === 1 && <mesh geometry={rbox(0.088, 0.192, 0.062, 0.01)} material={darkSlotMat} />}
            </group>
          ))
        )
      )}

      {/* 4 cột trụ góc đứng ISO */}
      {([-2.94, 2.94] as const).map((cx) =>
        ([-1.13, 1.13] as const).map((cz) => (
          <mesh
            key={`p_${cx}_${cz}`}
            geometry={rbox(0.15, 2.24, 0.15, 0.012)}
            position={[cx, 1.295, cz]}
            material={frameMat}
            castShadow
            receiveShadow
          />
        ))
      )}

      {/* Dầm dọc đáy (kèm 2 hốc càng xe nâng forklift) & dầm dọc đỉnh */}
      {([-1.14, 1.14] as const).map((sz) => (
        <group key={`rail_${sz}`}>
          <mesh geometry={rbox(5.72, 0.15, 0.13, 0.01)} position={[0, 0.075, sz]} material={frameMat} castShadow receiveShadow />
          {([-0.54, 0.54] as const).map((fx) => (
            <mesh key={fx} geometry={rbox(0.34, 0.085, 0.145, 0.006)} position={[fx, 0.068, sz]} material={darkSlotMat} />
          ))}
          {sz > 0 && breached ? (
            <>
              <mesh geometry={rbox(3.26, 0.13, 0.13, 0.01)} position={[1.23, 2.525, sz]} material={frameMat} castShadow />
              <mesh geometry={rbox(0.46, 0.13, 0.13, 0.01)} position={[-2.63, 2.525, sz]} material={frameMat} castShadow />
              <mesh
                geometry={rbox(1.18, 0.12, 0.12, 0.01)}
                position={[-1.85, 2.50 - dmg * 0.16, sz + dmg * 0.14]}
                rotation={[dmg * 0.35, -dmg * 0.18, -dmg * 0.24]}
                material={charMat}
                castShadow
              />
            </>
          ) : (
            <mesh geometry={rbox(5.72, 0.13, 0.13, 0.01)} position={[0, 2.525, sz]} material={frameMat} castShadow />
          )}
        </group>
      ))}

      {/* Dầm ngang hai đầu hồi */}
      {([-2.95, 2.95] as const).map((ex) => (
        <group key={`end_${ex}`}>
          <mesh geometry={rbox(0.13, 0.15, 2.10, 0.01)} position={[ex, 0.075, 0]} material={frameMat} castShadow />
          <mesh geometry={rbox(0.13, 0.13, 2.10, 0.01)} position={[ex, 2.525, 0]} material={frameMat} castShadow />
        </group>
      ))}

      {/* Vách tôn sóng dọc mặt sau (-Z) + 2 ô thông gió dập nổi chuẩn ISO */}
      <mesh geometry={backWallGeo} position={[0, 0.145, 0]} material={wallMat} castShadow receiveShadow />
      {([-2.15, 2.15] as const).map((vx) => (
        <mesh key={vx} geometry={rbox(0.24, 0.28, 0.035, 0.006)} position={[vx, 2.16, -1.205]} material={frameMat} castShadow />
      ))}

      {/* Vách tôn sóng dọc mặt trước (+Z) & Nóc tôn */}
      {!breached ? (
        <>
          <mesh geometry={frontWallIntactGeo} position={[0, 0.145, 0]} material={wallMat} castShadow receiveShadow />
          <mesh geometry={roofIntactGeo} position={[0, 0, 0]} material={roofMat} castShadow receiveShadow />
        </>
      ) : (
        <>
          <mesh geometry={frontWallLeftGeo} position={[0, 0.145, 0]} material={charMat} castShadow receiveShadow />
          <mesh geometry={frontWallRightGeo} position={[0, 0.145, 0]} material={wallMat} castShadow receiveShadow />
          <mesh geometry={frontWallApronGeo} position={[0, 0.145, 0]} material={charMat} castShadow receiveShadow />
          <mesh geometry={roofLeftGeo} position={[0, 0, 0]} material={charMat} castShadow receiveShadow />
          <mesh geometry={roofRightGeo} position={[0, 0, 0]} material={roofMat} castShadow receiveShadow />

          {/* Hốc khoang ngủ cháy đen bên trong & khung xương thép chữ C cong vênh lộ ra */}
          <group position={[-1.39, 1.32, 0.12]}>
            <mesh geometry={rbox(2.14, 0.08, 2.10, 0.01)} position={[0, -1.12, -0.10]} material={charMat} receiveShadow />
            <mesh geometry={rbox(2.14, 2.24, 0.08, 0.01)} position={[0, 0, -1.08]} material={charMat} receiveShadow />
            <mesh geometry={rbox(0.08, 2.24, 2.04, 0.01)} position={[-1.05, 0, -0.10]} material={charMat} />
            <mesh geometry={rbox(0.08, 2.24, 2.04, 0.01)} position={[1.05, 0, -0.10]} material={charMat} />

            {[-0.72, -0.24, 0.26, 0.70].map((sx, idx) => (
              <mesh
                key={`stud_${idx}`}
                geometry={rbox(0.065, 2.12, 0.075, 0.006)}
                position={[sx, -0.04, 0.88 - (idx % 2) * 0.14 * dmg]}
                rotation={[(idx % 2 === 0 ? 1 : -1) * 0.28 * dmg, 0.15 * dmg, (idx - 1.5) * 0.16 * dmg]}
                material={frameMat}
                castShadow
              />
            ))}
            {[-0.62, 0.05, 0.66].map((rx, idx) => (
              <mesh
                key={`rafter_${idx}`}
                geometry={rbox(0.07, 0.08, 2.08, 0.006)}
                position={[rx, 1.06 - idx * 0.11 * dmg, -0.06]}
                rotation={[0.24 * dmg, 0.1 * idx * dmg, -0.22 * dmg]}
                material={frameMat}
                castShadow
              />
            ))}

            <mesh
              geometry={rbox(0.68, 1.38, 0.035, 0.005)}
              position={[-0.86, 0.25, 1.18 + 0.22 * dmg]}
              rotation={[0.18 * dmg, -0.68 * dmg, 0.16 * dmg]}
              material={charMat}
              castShadow
            />
            <mesh
              geometry={rbox(0.74, 1.26, 0.035, 0.005)}
              position={[0.84, 0.30, 1.16 + 0.20 * dmg]}
              rotation={[-0.22 * dmg, 0.62 * dmg, -0.20 * dmg]}
              material={charMat}
              castShadow
            />
            <mesh
              geometry={rbox(1.36, 0.038, 0.96, 0.005)}
              position={[-0.12, 1.34 + 0.18 * dmg, 0.56]}
              rotation={[-0.58 * dmg, 0.14 * dmg, 0.24 * dmg]}
              material={charMat}
              castShadow
            />
            <mesh geometry={rbox(0.62, 1.85, 0.018, 0.003)} position={[1.34, 0.08, 1.095]} material={charMat} />
          </group>
        </>
      )}

      {/* 2 cửa sổ chớp mặt trước (+Z) */}
      <ChuShutteredWindow
        pos={[0.22, 1.50, 1.195]}
        warmLight={warmLight && dmg < 0.7}
        frameMat={frameMat}
        slatMat={doorMat}
      />
      {(!breached || dmg < 0.35) && (
        <ChuShutteredWindow
          pos={[-1.38, 1.50, 1.195]}
          warmLight={warmLight && !breached}
          frameMat={frameMat}
          slatMat={doorMat}
          tilted={dmg * 1.4}
        />
      )}

      {/* Cửa thép ra vào mặt trước (+Z tại x = +1.82) kèm tay nắm, mái hắt, đèn hiên & bậc thềm thép */}
      <group position={[1.82, 0, 0]}>
        <mesh geometry={rbox(1.04, 2.12, 0.10, 0.01)} position={[0, 1.21, 1.185]} material={frameMat} castShadow />
        <mesh geometry={rbox(0.88, 1.98, 0.055, 0.008)} position={[0, 1.21, 1.215]} material={doorMat} castShadow receiveShadow />
        <mesh
          geometry={rbox(0.28, 0.34, 0.02, 0.004)}
          position={[0, 1.68, 1.238]}
          material={
            warmLight
              ? plain('#ffdba6', 0.3, 0.05, { emissive: new THREE.Color('#ffbe6b'), emissiveIntensity: 1.4 })
              : plain('#1b2530', 0.2, 0.55)
          }
        />
        {[-0.58, -0.52, -0.46, -0.40].map((ly, i) => (
          <mesh key={i} geometry={rbox(0.50, 0.02, 0.02, 0.003)} position={[0, 1.21 + ly, 1.24]} material={frameMat} />
        ))}
        {[0.58, 1.21, 1.84].map((hy, i) => (
          <mesh key={i} position={[0.45, hy, 1.238]} material={frameMat}>
            <cylinderGeometry args={[0.018, 0.018, 0.09, 10]} />
          </mesh>
        ))}
        <mesh geometry={rbox(0.05, 0.16, 0.025, 0.005)} position={[-0.34, 1.15, 1.245]} material={plain('#c9d0d6', 0.35, 0.5)} />
        <mesh geometry={rbox(0.13, 0.024, 0.03, 0.006)} position={[-0.30, 1.15, 1.268]} material={plain('#dce2e8', 0.3, 0.55)} />

        {/* Mái hắt che mưa & đèn lồng hiên */}
        <mesh
          geometry={rbox(1.16, 0.032, 0.26, 0.006)}
          position={[0, 2.31, 1.29]}
          rotation={[0.15, 0, 0]}
          material={frameMat}
          castShadow
        />
        <mesh
          geometry={rbox(0.15, 0.09, 0.10, 0.02)}
          position={[0, 2.38, 1.24]}
          material={
            warmLight
              ? plain('#ffe2b0', 0.25, 0.05, { emissive: new THREE.Color('#ffbe6b'), emissiveIntensity: 2.1 })
              : plain('#525b64', 0.4, 0.25)
          }
        />

        {/* Bậc thềm nhỏ thép nhám (chân chạm đất y = 0) */}
        <mesh geometry={rbox(1.12, 0.045, 0.36, 0.008)} position={[0, 0.14, 1.39]} material={frameMat} castShadow receiveShadow />
        {([-0.48, 0.48] as const).map((bx) => (
          <group key={bx} position={[bx, 0, 0]}>
            <mesh geometry={rbox(0.06, 0.14, 0.06, 0.006)} position={[0, 0.07, 1.53]} material={frameMat} castShadow />
            <mesh geometry={rbox(0.06, 0.14, 0.06, 0.006)} position={[0, 0.07, 1.25]} material={frameMat} castShadow />
          </group>
        ))}
      </group>
      <mesh geometry={stepRailGeo} material={frameMat} castShadow />

      {/* Đầu hồi +X: vách tôn + Cục nóng điều hòa cửa sổ kèm quạt lưới */}
      <mesh geometry={plusXWallGeo} position={[0, 0.145, 0]} material={wallMat} castShadow receiveShadow />
      <WindowAcUnit pos={[3.00, 1.48, 0.08]} seed={seed} frameMat={frameMat} />

      {/* Đầu hồi -X: cửa đôi container ISO gốc đã hàn cố định + 4 thanh khóa đứng */}
      <mesh geometry={minusXWallGeo} position={[0, 0.175, 0]} material={wallMat} castShadow receiveShadow />
      <mesh geometry={rbox(0.03, 2.28, 0.045, 0.005)} position={[-2.985, 1.30, 0]} material={darkSlotMat} />
      {([-0.74, -0.26, 0.26, 0.74] as const).map((lz, i) => (
        <group key={i} position={[-3.01, 0, lz]}>
          <mesh position={[0, 1.30, 0]} material={plain('#96a0aa', 0.45, 0.38)} castShadow>
            <cylinderGeometry args={[0.017, 0.017, 2.26, 10]} />
          </mesh>
          {[0.38, 1.30, 2.22].map((ky, ki) => (
            <mesh key={ki} geometry={rbox(0.048, 0.06, 0.058, 0.006)} position={[0.01, ky, 0]} material={frameMat} />
          ))}
        </group>
      ))}

      {/* Tuỳ chọn giàn mái kích nổ sớm cao thêm ~0.85 m bên trên nóc */}
      {hasBlastRoof && <ChuBlastRoof steelMat={frameMat} roofSheetMat={roofMat} />}
    </group>
  );
};

// ============================================================================
// 2. T-WALL — Tường bê tông chống mảnh chữ T (Bremer / Texas T-Wall)
//    1 tấm đơn: cao 3.66 m, ngang 1.22 m (X), đế chữ T rộng 1.50 m (Z) -> thân 0.32 m
// ============================================================================

export type TWallProps = {
  /** Số tấm ghép liền mạch dọc trục X (mặc định 1 -> 1.22 m; count = 4 -> 4.88 m). */
  count?: number;
  seed?: number;
};

const TWALL_BEVEL = 0.018;
const TWALL_PROFILE: P2[] = [
  [-(0.75 - TWALL_BEVEL), TWALL_BEVEL],
  [0.75 - TWALL_BEVEL, TWALL_BEVEL],
  [0.75 - TWALL_BEVEL, 0.175],
  [0.275, 0.52],
  [0.16 - TWALL_BEVEL, 0.94],
  [0.16 - TWALL_BEVEL, 3.575],
  [0.118, 3.66 - TWALL_BEVEL],
  [-0.118, 3.66 - TWALL_BEVEL],
  [-(0.16 - TWALL_BEVEL), 3.575],
  [-(0.16 - TWALL_BEVEL), 0.94],
  [-0.275, 0.52],
  [-(0.75 - TWALL_BEVEL), 0.175],
];

export const TWall: React.FC<TWallProps> = ({ count = 1, seed = 21 }) => {
  const n = Math.max(1, Math.round(count));
  const pitch = 1.22;

  const slabGeo = useMemo(() => {
    const g = extrude(TWALL_PROFILE, 1.202, TWALL_BEVEL).clone();
    g.rotateY(Math.PI / 2);
    return g;
  }, []);

  // Gờ mộng dương khớp nối âm dương dọc cạnh +X của thân tường
  const tongueGeo = useMemo(
    () =>
      extrudeTop(
        [
          [0, -0.062],
          [0.042, -0.040],
          [0.042, 0.040],
          [0, 0.062],
        ],
        2.54,
        0.004
      ),
    []
  );

  // 2 móc thép cẩu (pipe) trên đỉnh mỗi tấm
  const liftHookLeftGeo = useMemo(
    () =>
      pipe(
        [
          [-0.41, 3.62, 0],
          [-0.41, 3.745, 0],
          [-0.35, 3.79, 0],
          [-0.29, 3.745, 0],
          [-0.29, 3.62, 0],
        ],
        0.017,
        22
      ),
    []
  );
  const liftHookRightGeo = useMemo(
    () =>
      pipe(
        [
          [0.29, 3.62, 0],
          [0.29, 3.745, 0],
          [0.35, 3.79, 0],
          [0.41, 3.745, 0],
          [0.41, 3.62, 0],
        ],
        0.017,
        22
      ),
    []
  );

  const mats = useMemo(
    () =>
      [0, 1, 2].map((v) =>
        paint({
          color: PAL3D.concrete,
          camo: PAL3D.concreteCamo,
          camoScale: 4,
          repeat: 0.42,
          dirt: 0.35,
          wear: 0.2,
          roughness: 0.88,
          metalness: 0.05,
          seed: seed + v * 13,
        })
      ),
    [seed]
  );

  const rebarMat = plain('#606870', 0.52, 0.42);
  const recessMat = plain('#454a50', 0.92, 0.06);

  return (
    <group>
      {Array.from({ length: n }, (_, i) => {
        const cx = (i - (n - 1) / 2) * pitch;
        const mat = mats[i % mats.length];
        return (
          <group key={i} position={[cx, 0, 0]}>
            {/* Khối bê tông chữ T đúc sẵn */}
            <mesh geometry={slabGeo} material={mat} castShadow receiveShadow />

            {/* Rãnh khớp nối âm dương giữa các tấm: mộng dương bên +X, rãnh âm bên -X */}
            <mesh geometry={tongueGeo} position={[0.596, 0.98, 0]} material={mat} castShadow />
            <mesh geometry={rbox(0.036, 2.56, 0.124, 0.005)} position={[-0.592, 2.25, 0]} material={recessMat} />

            {/* 2 hốc lõm đỉnh tường & 2 móc thép cẩu tròn */}
            <mesh geometry={rbox(0.17, 0.04, 0.11, 0.006)} position={[-0.35, 3.645, 0]} material={recessMat} />
            <mesh geometry={rbox(0.17, 0.04, 0.11, 0.006)} position={[0.35, 3.645, 0]} material={recessMat} />
            <mesh geometry={liftHookLeftGeo} material={rebarMat} castShadow />
            <mesh geometry={liftHookRightGeo} material={rebarMat} castShadow />

            {/* Hốc xỏ càng nâng / thoát nước dưới chân đế & lỗ ty cốp-pha trên mặt tường */}
            {([-0.36, 0.36] as const).map((fx) => (
              <group key={fx}>
                <mesh geometry={rbox(0.22, 0.072, 1.504, 0.006)} position={[fx, 0.038, 0]} material={recessMat} />
                {([1.52, 2.84] as const).map((ty) =>
                  ([-0.158, 0.158] as const).map((tz) => (
                    <mesh key={`${ty}_${tz}`} position={[fx, ty, tz]} rotation={[Math.PI / 2, 0, 0]} material={recessMat}>
                      <cylinderGeometry args={[0.025, 0.018, 0.018, 12]} />
                    </mesh>
                  ))
                )}
              </group>
            ))}
          </group>
        );
      })}
    </group>
  );
};

// ============================================================================
// 3. HESCO WALL — Dãy rọ đất công sự HESCO Bastion (mỗi ô 1.06 × 1.10 × 2.13 m)
// ============================================================================

export type HescoWallProps = {
  /** Số ô rọ ghép dọc trục X (mặc định 3 ô -> dài 3.18 m, đáy y = 0). */
  cells?: number;
  seed?: number;
};

/** Tạo bao vải địa kỹ thuật phồng nhẹ ở bụng do áp lực cát sỏi bên trong (1 ô chuẩn 1.06 × 1.10 × 2.13 m). */
function makeHescoLinerGeo(): THREE.BufferGeometry {
  const w = 0.99;
  const h = 2.09;
  const d = 1.01;
  const g = new THREE.BoxGeometry(w, h, d, 12, 18, 12);
  g.translate(0, h / 2 + 0.01, 0);

  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const ty = clamp01(y / h);
    const ux = x / (w / 2);
    const uz = z / (d / 2);

    const belly = Math.sin(Math.pow(ty, 0.78) * Math.PI);
    const pillow = 1 + 0.09 * Math.abs(Math.sin(ty * Math.PI * 15));
    const swellZ = 0.040 * belly * Math.cos(ux * Math.PI * 0.45) * pillow;
    const swellX = 0.032 * belly * Math.cos(uz * Math.PI * 0.45) * pillow;

    pos.setX(i, x + Math.sign(x) * Math.max(0, swellX));
    pos.setZ(i, z + Math.sign(z) * Math.max(0, swellZ));
  }
  g.computeVertexNormals();
  return g;
}

/** Tạo ụ đất sỏi nhô nhẹ trên miệng mỗi ô rọ HESCO (y = 2.02..2.25 m). */
function makeHescoFillCapGeo(seed: number): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(0.95, 0.22, 0.97, 14, 4, 14);
  g.translate(0, 2.04, 0);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (y > 2.05) {
      const rx = x / 0.475;
      const rz = z / 0.485;
      const dome = Math.max(0, 1 - 0.50 * (rx * rx + rz * rz));
      const lump = (fbm(x * 4.0 + 4, z * 4.0 + 7, seed, 3) - 0.45) * 0.075;
      pos.setY(i, 2.085 + dome * 0.145 + lump * dome);
    }
  }
  g.computeVertexNormals();
  return g;
}

/** Tạo tấm lưới thép hàn ô vuông (mặt trước/sau dài 1.06 m hoặc vách ngăn sâu 1.10 m, cao 2.13 m). */
function makeWeldedMeshPanelGeo(width: number, height: number, cols: number, rows: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const wireR = 0.0074;
  for (let c = 0; c <= cols; c++) {
    const x = -width / 2 + (c / cols) * width;
    const vBar = new THREE.CylinderGeometry(wireR, wireR, height, 6);
    vBar.applyMatrix4(mat4([x, height / 2, 0]));
    parts.push(vBar);
  }
  for (let r = 0; r <= rows; r++) {
    const y = 0.03 + (r / rows) * (height - 0.045);
    const hBar = new THREE.CylinderGeometry(wireR, wireR, width + 0.02, 6);
    hBar.applyMatrix4(mat4([0, y, 0], [0, 0, Math.PI / 2]));
    parts.push(hBar);
  }
  return merge(parts);
}

/** Tạo trụ lò xo xoắn nối góc HESCO + chốt thép xuyên dọc cao 2.15 m. */
function makeCornerHelixGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const pin = new THREE.CylinderGeometry(0.011, 0.011, 2.15, 8);
  pin.applyMatrix4(mat4([0, 1.075, 0]));
  parts.push(pin);

  const hook = new THREE.TorusGeometry(0.028, 0.009, 6, 12, Math.PI * 1.25);
  hook.applyMatrix4(mat4([0.024, 2.15, 0]));
  parts.push(hook);

  const turns = 30;
  for (let k = 0; k < turns; k++) {
    const y = 0.045 + (k / (turns - 1)) * 2.04;
    const ring = new THREE.TorusGeometry(0.025, 0.0065, 6, 12);
    ring.applyMatrix4(mat4([0, y, 0], [Math.PI / 2 + 0.24, (k % 2) * 0.2, 0]));
    parts.push(ring);
  }
  return merge(parts);
}

export const HescoWall: React.FC<HescoWallProps> = ({ cells = 3, seed = 31 }) => {
  const n = Math.max(1, Math.round(cells));
  const cellLen = 1.06;
  const cellDepth = 1.10;
  const cellHeight = 2.13;
  const totalLen = n * cellLen;

  const linerGeo = useMemo(() => makeHescoLinerGeo(), []);
  const frontMeshGeo = useMemo(() => makeWeldedMeshPanelGeo(cellLen - 0.02, cellHeight, 8, 16), []);
  const sideMeshGeo = useMemo(() => {
    const g = makeWeldedMeshPanelGeo(cellDepth - 0.02, cellHeight, 8, 16).clone();
    g.rotateY(Math.PI / 2);
    return g;
  }, []);
  const helixGeo = useMemo(() => makeCornerHelixGeo(), []);
  const fillCaps = useMemo(() => [0, 1, 2].map((v) => makeHescoFillCapGeo(seed + v * 17)), [seed]);

  const fabricMat = useMemo(
    () =>
      paint({
        color: PAL3D.hescoSand,
        camo: ['#ae956d', '#c3ab83'],
        camoScale: 4,
        repeat: 1.5,
        dirt: 0.26,
        wear: 0.06,
        roughness: 0.94,
        metalness: 0.02,
        seed,
      }),
    [seed]
  );

  const hemMat = useMemo(
    () =>
      paint({
        color: '#a38b64',
        camo: ['#967f5a', '#b59d75'],
        camoScale: 4,
        repeat: 1.4,
        dirt: 0.28,
        wear: 0.08,
        roughness: 0.95,
        metalness: 0.02,
        seed: seed + 3,
      }),
    [seed]
  );

  const gravelMat = useMemo(
    () =>
      paint({
        color: '#9b8462',
        camo: ['#7b694f', '#b59e79', '#61594f'],
        camoScale: 4,
        repeat: 1.6,
        dirt: 0.35,
        wear: 0.12,
        roughness: 0.96,
        metalness: 0.03,
        seed: seed + 7,
      }),
    [seed]
  );

  const meshMat = useMemo(
    () =>
      paint({
        color: PAL3D.hescoMesh,
        camo: ['#576055', '#687166'],
        camoScale: 4,
        repeat: 1.0,
        dirt: 0.18,
        wear: 0.24,
        roughness: 0.48,
        metalness: 0.34,
        seed: seed + 11,
      }),
    [seed]
  );

  const rockMatDark = plain('#5d564e', 0.92, 0.05);
  const rockMatLight = plain('#ad9672', 0.92, 0.04);

  return (
    <group>
      {/* Từng ô rọ vải địa + lưới mặt trước/sau + ụ đất sỏi nhô trên miệng */}
      {Array.from({ length: n }, (_, i) => {
        const cx = (i - (n - 1) / 2) * cellLen;
        return (
          <group key={i} position={[cx, 0, 0]}>
            <mesh geometry={linerGeo} material={fabricMat} castShadow receiveShadow />

            {/* Viền gập vải địa trên miệng rọ */}
            <mesh geometry={rbox(1.01, 0.055, 0.045, 0.01)} position={[0, 2.085, 0.505]} material={hemMat} />
            <mesh geometry={rbox(1.01, 0.055, 0.045, 0.01)} position={[0, 2.085, -0.505]} material={hemMat} />
            <mesh geometry={rbox(0.045, 0.055, 0.98, 0.01)} position={[-0.495, 2.085, 0]} material={hemMat} />
            <mesh geometry={rbox(0.045, 0.055, 0.98, 0.01)} position={[0.495, 2.085, 0]} material={hemMat} />

            {/* Khung lưới thép hàn ô vuông mặt trước (+Z) và mặt sau (-Z) */}
            <mesh geometry={frontMeshGeo} position={[0, 0, 0.542]} material={meshMat} castShadow />
            <mesh geometry={frontMeshGeo} position={[0, 0, -0.542]} material={meshMat} castShadow />

            {/* Ụ đất đá sỏi Rukban nhô nhẹ trên miệng rọ + thanh giằng thép chống phình */}
            <mesh geometry={fillCaps[i % fillCaps.length]} material={gravelMat} castShadow receiveShadow />
            <mesh position={[-0.22, 2.115, 0]} rotation={[Math.PI / 2, 0, 0]} material={meshMat}>
              <cylinderGeometry args={[0.0065, 0.0065, 1.07, 6]} />
            </mesh>
            <mesh position={[0.22, 2.115, 0]} rotation={[Math.PI / 2, 0, 0]} material={meshMat}>
              <cylinderGeometry args={[0.0065, 0.0065, 1.07, 6]} />
            </mesh>

            {/* Đá dăm bazan & sỏi sa mạc rải trên mặt rọ */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((rk) => {
              const ang = rk * 2.05 + i * 1.3;
              const rad = 0.09 + ((rk * 37 + i * 19) % 28) * 0.012;
              const rx = Math.cos(ang) * rad;
              const rz = Math.sin(ang) * rad;
              const s = 0.038 + ((rk * 13 + i * 7) % 5) * 0.009;
              return (
                <mesh
                  key={rk}
                  geometry={rbox(s * 1.45, s * 0.88, s * 1.18, s * 0.3)}
                  position={[rx, 2.205 - (rx * rx + rz * rz) * 0.22, rz]}
                  rotation={[rk * 0.5, ang, rk * 0.3]}
                  material={rk % 2 === 0 ? rockMatDark : rockMatLight}
                  castShadow
                />
              );
            })}
          </group>
        );
      })}

      {/* Vách lưới ngăn & hai đầu hồi + lò xo nối góc ở mọi khớp đứng */}
      {Array.from({ length: n + 1 }, (_, k) => {
        const sx = -totalLen / 2 + k * cellLen;
        return (
          <group key={`seam_${k}`} position={[sx, 0, 0]}>
            <mesh geometry={sideMeshGeo} material={meshMat} castShadow />
            <mesh geometry={helixGeo} position={[0, 0, 0.544]} material={meshMat} castShadow />
            <mesh geometry={helixGeo} position={[0, 0, -0.544]} material={meshMat} castShadow />
          </group>
        );
      })}
    </group>
  );
};

// ============================================================================
// 4. NIGHTHAWK MAST — Tháp camera ảnh nhiệt EO/IR NightHawk cao 6.50 m & Còi báo động
// ============================================================================

export type NightHawkMastProps = {
  /** Góc phương vị đầu camera nhiệt (rad, 0 = nhìn thẳng hướng +X). */
  yaw?: number;
  /** Góc gật gù nâng/hạ ống kính (rad, dương = ngước lên, âm = chúi xuống). */
  pitch?: number;
  /** Cường độ đèn chớp cảnh báo đỏ tại cụm loa còi báo động cao 4.2 m (0..1). */
  strobe?: number;
};

/** Kết cấu cột tháp giàn thép chữ nhật (0.68 × 0.58 m, từ y = 0.24 m lên y = 5.74 m) kèm thang leo. */
function makeLatticeMastGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const hx = 0.31;
  const hz = 0.26;
  const y0 = 0.24;
  const y1 = 5.74;
  const totalH = y1 - y0;

  // 4 trụ thép góc đứng
  for (const sx of [-hx, hx]) {
    for (const sz of [-hz, hz]) {
      const leg = new THREE.BoxGeometry(0.058, totalH, 0.058);
      leg.applyMatrix4(mat4([sx, (y0 + y1) / 2, sz]));
      parts.push(leg);
    }
  }

  // 9 tầng khung giằng ngang + thanh chéo chữ Z trên cả 4 mặt chữ nhật
  const bays = 9;
  const bayH = totalH / bays;
  for (let b = 0; b <= bays; b++) {
    const y = y0 + b * bayH;
    for (const sz of [-hz, hz]) {
      const gx = new THREE.BoxGeometry(hx * 2, 0.038, 0.038);
      gx.applyMatrix4(mat4([0, y, sz]));
      parts.push(gx);
    }
    for (const sx of [-hx, hx]) {
      const gz = new THREE.BoxGeometry(0.038, 0.038, hz * 2);
      gz.applyMatrix4(mat4([sx, y, 0]));
      parts.push(gz);
    }

    if (b < bays) {
      const ym = y + bayH / 2;
      const flip = b % 2 === 0 ? 1 : -1;

      const lenX = Math.hypot(hx * 2, bayH);
      const angX = Math.atan2(bayH, hx * 2);
      for (const sz of [-hz, hz]) {
        const dFront = new THREE.BoxGeometry(lenX, 0.030, 0.030);
        const dir = sz > 0 ? flip : -flip;
        dFront.applyMatrix4(mat4([0, ym, sz], [0, 0, dir * angX]));
        parts.push(dFront);
      }

      const lenZ = Math.hypot(hz * 2, bayH);
      const angZ = Math.atan2(bayH, hz * 2);
      for (const sx of [-hx, hx]) {
        const dSide = new THREE.BoxGeometry(0.030, 0.030, lenZ);
        const dir = sx > 0 ? flip : -flip;
        dSide.applyMatrix4(mat4([sx, ym, 0], [dir * angZ, 0, 0]));
        parts.push(dSide);
      }
    }
  }

  // Thang sắt bảo trì gắn dọc mặt -X
  for (const lz of [-0.15, 0.15]) {
    const rail = new THREE.CylinderGeometry(0.013, 0.013, totalH - 0.1, 6);
    rail.applyMatrix4(mat4([-hx - 0.065, (y0 + y1) / 2, lz]));
    parts.push(rail);
  }
  for (let r = 0; r < 17; r++) {
    const ry = y0 + 0.24 + r * 0.315;
    const rung = new THREE.CylinderGeometry(0.010, 0.010, 0.31, 6);
    rung.applyMatrix4(mat4([-hx - 0.065, ry, 0], [Math.PI / 2, 0, 0]));
    parts.push(rung);
  }

  return merge(parts);
}

/** Đèn chớp cảnh báo đỏ có lồng thép bảo vệ (phát sáng đỏ PAL3D.alarmRed khi strobe > 0). */
const WarningStrobeBeacon: React.FC<{
  pos: [number, number, number];
  strobe: number;
  steelMat: THREE.Material;
}> = ({ pos, strobe, steelMat }) => {
  const s = clamp01(strobe);
  const lensGeo = useMemo(() => {
    const g = lathe(
      [
        [0.078, 0],
        [0.082, 0.02],
        [0.078, 0.14],
        [0.062, 0.18],
        [0.028, 0.205],
        [0.001, 0.212],
      ],
      24
    ).clone();
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);

  const lensMat = useMemo(
    () =>
      s > 0.005
        ? plain('#ff564a', 0.16, 0.05, {
            emissive: new THREE.Color(PAL3D.alarmRed),
            emissiveIntensity: 1.35 + s * 3.1,
          })
        : plain('#471114', 0.22, 0.15),
    [s]
  );

  const coreMat = useMemo(
    () =>
      plain('#ffe2dc', 0.1, 0, {
        emissive: new THREE.Color('#ff8878'),
        emissiveIntensity: 2.6 * s,
      }),
    [s]
  );

  return (
    <group position={pos}>
      <mesh position={[0, 0.03, 0]} material={steelMat} castShadow>
        <cylinderGeometry args={[0.088, 0.096, 0.06, 20]} />
      </mesh>
      <mesh geometry={lensGeo} position={[0, 0.058, 0]} material={lensMat} />
      {s > 0.005 && (
        <mesh position={[0, 0.145, 0]} material={coreMat}>
          <cylinderGeometry args={[0.036, 0.042, 0.11, 14]} />
        </mesh>
      )}
      <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
        <torusGeometry args={[0.092, 0.006, 6, 20]} />
      </mesh>
      {[0, 1].map((k) => (
        <mesh key={k} position={[0, 0.16, 0]} rotation={[0, (k * Math.PI) / 2, 0]} material={steelMat}>
          <torusGeometry args={[0.094, 0.0055, 6, 18, Math.PI]} />
        </mesh>
      ))}
    </group>
  );
};

export const NightHawkMast: React.FC<NightHawkMastProps> = ({ yaw = 0, pitch = 0, strobe = 0 }) => {
  const mastGeo = useMemo(() => makeLatticeMastGeo(), []);

  // Bệ bê tông vát mép chân tháp (y = 0..0.24 m)
  const padGeo = useMemo(
    () =>
      extrudeTop(
        [
          [-0.78, -0.78],
          [0.78, -0.78],
          [0.78, 0.78],
          [-0.78, 0.78],
        ],
        0.24,
        0.025
      ),
    []
  );

  // Loa phóng thanh / còi báo động vành loe (dọc +X)
  const hornBellGeo = useMemo(
    () =>
      lathe(
        [
          [0.082, -0.14],
          [0.082, -0.03],
          [0.048, 0.01],
          [0.062, 0.10],
          [0.098, 0.20],
          [0.148, 0.28],
          [0.178, 0.32],
          [0.166, 0.32],
          [0.045, 0.03],
        ],
        28
      ),
    []
  );

  // 2 vành ống kính hồng ngoại lớn (MWIR & EO) của đầu camera NightHawk
  const irBarrelLargeGeo = useMemo(
    () =>
      lathe(
        [
          [0.104, 0],
          [0.104, 0.105],
          [0.112, 0.118],
          [0.112, 0.155],
          [0.095, 0.160],
          [0.086, 0.130],
        ],
        30
      ),
    []
  );
  const irBarrelMedGeo = useMemo(
    () =>
      lathe(
        [
          [0.086, 0],
          [0.086, 0.100],
          [0.093, 0.112],
          [0.093, 0.146],
          [0.078, 0.150],
          [0.070, 0.124],
        ],
        28
      ),
    []
  );

  const baseConduitGeo = useMemo(
    () =>
      pipe(
        [
          [-0.58, 0.48, 0.14],
          [-0.44, 0.36, 0.14],
          [-0.22, 0.38, 0.10],
          [-0.14, 0.65, 0.06],
        ],
        0.022,
        20
      ),
    []
  );

  const concreteMat = useMemo(
    () =>
      paint({
        color: PAL3D.concrete,
        camo: PAL3D.concreteCamo,
        camoScale: 4,
        repeat: 0.45,
        dirt: 0.35,
        wear: 0.18,
        roughness: 0.88,
        metalness: 0.05,
        seed: 41,
      }),
    []
  );

  const steelMat = useMemo(
    () =>
      paint({
        color: '#697785',
        camo: [PAL3D.craneSteel, '#7b8a99'],
        camoScale: 4,
        repeat: 0.55,
        dirt: 0.22,
        wear: 0.22,
        roughness: 0.56,
        metalness: 0.26,
        seed: 43,
      }),
    []
  );

  const cabinetMat = useMemo(
    () =>
      paint({
        color: '#9ba2a8',
        camo: ['#8c939a', '#abb2b8'],
        camoScale: 4,
        repeat: 0.8,
        dirt: 0.26,
        wear: 0.16,
        roughness: 0.60,
        metalness: 0.20,
        seed: 47,
      }),
    []
  );

  // Vỏ đầu gimbal EO/IR xám thẫm quân sự có tương phản khối rõ nét dưới nắng & chạng vạng
  const turretSlateMat = useMemo(
    () =>
      paint({
        color: '#4e5864',
        camo: ['#414a55', '#5d6876'],
        camoScale: 4,
        repeat: 1.0,
        dirt: 0.16,
        wear: 0.18,
        roughness: 0.50,
        metalness: 0.24,
        seed: 53,
      }),
    []
  );

  const bezelAlloyMat = plain('#85919e', 0.42, 0.38);

  const hornMat = useMemo(
    () =>
      paint({
        color: '#bcc4cb',
        camo: ['#aab2ba', '#cdd4db'],
        camoScale: 4,
        repeat: 0.9,
        dirt: 0.22,
        wear: 0.14,
        roughness: 0.54,
        metalness: 0.22,
        seed: 59,
      }),
    []
  );

  // Kính Germanium hồng ngoại xanh đen bóng đặc trưng (có ánh phản quang AR xanh chàm sâu)
  const germaniumGlassMat = useMemo(
    () =>
      plain('#081e30', 0.06, 0.86, {
        emissive: new THREE.Color('#0c3352'),
        emissiveIntensity: 0.32,
      }),
    []
  );
  const germaniumRimMat = plain('#286a94', 0.18, 0.65);
  const lrfOpticMat = useMemo(
    () =>
      plain('#10352c', 0.08, 0.82, {
        emissive: new THREE.Color('#14473a'),
        emissiveIntensity: 0.25,
      }),
    []
  );
  const darkMetalMat = plain('#2c333c', 0.55, 0.30);

  const anchorBolts = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (const bx of [-0.31, 0.31]) {
      for (const bz of [-0.26, 0.26]) {
        for (const ox of [-0.07, 0.07]) {
          for (const oz of [-0.07, 0.07]) {
            pts.push([bx + ox, 0.268, bz + oz]);
          }
        }
      }
    }
    return pts;
  }, []);

  return (
    <group>
      {/* 1. Bệ bê tông chân tháp + bản mã neo + hộp tủ điện thép điều khiển */}
      <mesh geometry={padGeo} material={concreteMat} castShadow receiveShadow />
      {([-0.31, 0.31] as const).map((bx) =>
        ([-0.26, 0.26] as const).map((bz) => (
          <mesh
            key={`bp_${bx}_${bz}`}
            geometry={rbox(0.20, 0.028, 0.20, 0.005)}
            position={[bx, 0.252, bz]}
            material={steelMat}
            castShadow
          />
        ))
      )}
      <Rivets points={anchorBolts} r={0.014} color="#464f58" />

      {/* Hộp tủ điện thép NEMA gắn chân tháp */}
      <group position={[-0.58, 0.92, 0]}>
        <mesh geometry={rbox(0.38, 0.88, 0.54, 0.015)} material={cabinetMat} castShadow receiveShadow />
        <mesh
          geometry={rbox(0.43, 0.03, 0.58, 0.006)}
          position={[-0.01, 0.455, 0]}
          rotation={[0, 0, 0.08]}
          material={steelMat}
          castShadow
        />
        <mesh geometry={rbox(0.018, 0.76, 0.44, 0.005)} position={[-0.192, 0, 0]} material={cabinetMat} />
        <mesh geometry={rbox(0.03, 0.12, 0.035, 0.005)} position={[-0.205, 0.02, 0.16]} material={darkMetalMat} />
        <mesh geometry={rbox(0.01, 0.11, 0.14, 0.002)} position={[-0.201, 0.20, 0]} material={plain('#d89c2b', 0.5, 0.1)} />
        <mesh geometry={rbox(0.28, 0.055, 0.48, 0.006)} position={[0.22, 0.30, 0]} material={steelMat} />
        <mesh geometry={rbox(0.28, 0.055, 0.48, 0.006)} position={[0.22, -0.30, 0]} material={steelMat} />
      </group>
      <mesh geometry={baseConduitGeo} material={darkMetalMat} castShadow />

      {/* 2. Cột tháp giàn thép chữ nhật + ống cáp trục dọc */}
      <mesh geometry={mastGeo} material={steelMat} castShadow receiveShadow />
      <mesh position={[-0.12, 3.00, 0.08]} material={darkMetalMat}>
        <cylinderGeometry args={[0.024, 0.024, 5.44, 10]} />
      </mesh>

      {/* 3. Cụm loa phóng thanh / còi báo động căn cứ & Đèn chớp cảnh báo đỏ tại y = 4.20 m */}
      <group position={[0, 4.20, 0]}>
        <mesh geometry={rbox(0.76, 0.16, 0.66, 0.01)} material={steelMat} castShadow />
        <mesh geometry={rbox(0.20, 0.28, 0.24, 0.01)} position={[0, -0.22, 0.34]} material={cabinetMat} castShadow />

        {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ang, idx) => (
          <group key={idx} rotation={[0, ang, 0]}>
            <group position={[0.38, 0.02, 0]} rotation={[0, 0, -0.18]}>
              <mesh geometry={rbox(0.16, 0.04, 0.07, 0.005)} position={[-0.04, -0.09, 0]} material={steelMat} />
              <mesh geometry={hornBellGeo} material={hornMat} castShadow />
              <mesh position={[-0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={turretSlateMat}>
                <cylinderGeometry args={[0.086, 0.086, 0.12, 20]} />
              </mesh>
              <mesh position={[0.16, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={turretSlateMat}>
                <coneGeometry args={[0.042, 0.14, 16]} />
              </mesh>
            </group>
          </group>
        ))}

        <mesh geometry={rbox(1.06, 0.045, 0.045, 0.006)} position={[0, 0.24, 0]} rotation={[0, 0.58, 0]} material={steelMat} castShadow />
        <WarningStrobeBeacon pos={[0.45, 0.26, 0.29]} strobe={strobe} steelMat={steelMat} />
        <WarningStrobeBeacon pos={[-0.45, 0.26, -0.29]} strobe={strobe} steelMat={steelMat} />
      </group>

      {/* 4. Sàn đỉnh tháp (y = 5.76 m) + Đầu gimbal EO/IR NightHawk (đỉnh vòm đúng y = 6.50 m) */}
      <group position={[0, 5.76, 0]}>
        <mesh geometry={rbox(0.90, 0.06, 0.80, 0.01)} material={steelMat} castShadow receiveShadow />
        {([-0.30, 0.30] as const).map((gx) =>
          ([-0.25, 0.25] as const).map((gz) => (
            <mesh
              key={`g_${gx}_${gz}`}
              geometry={rbox(0.11, 0.14, 0.11, 0.006)}
              position={[gx, -0.09, gz]}
              material={steelMat}
            />
          ))
        )}
        {/* Kim thu sét nhỏ & nấm GPS ở góc sau không vướng vòng quay gimbal */}
        <mesh position={[-0.39, 0.36, -0.34]} material={steelMat}>
          <cylinderGeometry args={[0.005, 0.014, 0.68, 8]} />
        </mesh>
        <mesh position={[-0.36, 0.07, 0.32]} material={plain('#dce2e8', 0.45, 0.1)}>
          <cylinderGeometry args={[0.058, 0.065, 0.07, 16]} />
        </mesh>

        {/* Đế trụ cổ xoay phương vị cố định */}
        <mesh position={[0, 0.09, 0]} material={turretSlateMat} castShadow>
          <cylinderGeometry args={[0.23, 0.265, 0.13, 28]} />
        </mesh>

        {/* Cụm chạc chữ U xoay phương vị theo yaw (yaw = 0 nhìn thẳng +X) */}
        <group position={[0, 0.155, 0]} rotation={[0, yaw, 0]}>
          <mesh position={[0, 0.035, 0]} material={turretSlateMat} castShadow>
            <cylinderGeometry args={[0.235, 0.235, 0.07, 28]} />
          </mesh>
          <mesh geometry={rbox(0.28, 0.065, 0.56, 0.015)} position={[0, 0.075, 0]} material={turretSlateMat} castShadow />

          {/* Hai tay chạc nâng hai bên (z = ±0.255) */}
          {([-0.255, 0.255] as const).map((uz, i) => (
            <group key={i} position={[0, 0.27, uz]}>
              <mesh geometry={rbox(0.23, 0.35, 0.075, 0.022)} material={turretSlateMat} castShadow />
              <mesh rotation={[Math.PI / 2, 0, 0]} material={bezelAlloyMat}>
                <cylinderGeometry args={[0.088, 0.088, 0.095, 20]} />
              </mesh>
            </group>
          ))}

          {/* Khối trụ-cầu cảm biến EO/IR NightHawk gật gù theo pitch (tâm y = 6.21 m, đỉnh mái chắn lóa đúng y = 6.50 m) */}
          <group position={[0, 0.295, 0]} rotation={[0, 0, pitch]}>
            {/* Bầu cầu trung tâm + thân trụ ngang nối trục nâng */}
            <mesh material={turretSlateMat} castShadow>
              <sphereGeometry args={[0.255, 30, 24]} />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={turretSlateMat} castShadow>
              <cylinderGeometry args={[0.195, 0.195, 0.44, 24]} />
            </mesh>

            {/* Mái vòm chắn nắng phía trên (đỉnh đạt đúng y = 6.50 m) */}
            <mesh
              geometry={rbox(0.38, 0.042, 0.40, 0.016)}
              position={[0.05, 0.262, 0]}
              rotation={[0, 0, -0.06]}
              material={bezelAlloyMat}
              castShadow
            />

            {/* Mặt nạ quang học phẳng phía trước (+X) */}
            <mesh geometry={rbox(0.09, 0.29, 0.40, 0.022)} position={[0.172, 0.01, 0]} material={darkMetalMat} castShadow />

            {/* Ống kính hồng ngoại lớn #1 (MWIR Thermal — bên +Z) + kính Germanium xanh đen bóng */}
            <group position={[0.16, 0.03, 0.104]}>
              <mesh geometry={irBarrelLargeGeo} material={turretSlateMat} castShadow />
              <mesh position={[0.148, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={bezelAlloyMat}>
                <torusGeometry args={[0.098, 0.009, 8, 26]} />
              </mesh>
              <mesh position={[0.144, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={germaniumRimMat}>
                <torusGeometry args={[0.084, 0.006, 8, 24]} />
              </mesh>
              <mesh position={[0.124, 0, 0]} scale={[0.34, 1, 1]} material={germaniumGlassMat}>
                <sphereGeometry args={[0.086, 26, 20]} />
              </mesh>
            </group>

            {/* Ống kính hồng ngoại lớn #2 (EO/SWIR Telephoto — bên -Z) + kính Germanium xanh đen bóng */}
            <group position={[0.16, 0.03, -0.108]}>
              <mesh geometry={irBarrelMedGeo} material={turretSlateMat} castShadow />
              <mesh position={[0.138, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={bezelAlloyMat}>
                <torusGeometry args={[0.081, 0.008, 8, 26]} />
              </mesh>
              <mesh position={[0.134, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={germaniumRimMat}>
                <torusGeometry args={[0.069, 0.005, 8, 24]} />
              </mesh>
              <mesh position={[0.116, 0, 0]} scale={[0.34, 1, 1]} material={germaniumGlassMat}>
                <sphereGeometry args={[0.071, 24, 18]} />
              </mesh>
            </group>

            {/* Cửa sổ đo xa Laser LRF phụ ở dưới giữa 2 ống kính lớn */}
            <group position={[0.218, -0.102, -0.002]}>
              <mesh geometry={rbox(0.04, 0.066, 0.125, 0.008)} material={bezelAlloyMat} />
              <mesh geometry={rbox(0.045, 0.044, 0.096, 0.004)} material={lrfOpticMat} />
            </group>

            {/* Cánh tản nhiệt nhôm phía sau bầu camera (-X) */}
            {[-0.12, -0.072, -0.024, 0.024, 0.072, 0.12].map((fz, fi) => (
              <mesh
                key={fi}
                geometry={rbox(0.065, 0.21, 0.014, 0.003)}
                position={[-0.23, 0, fz]}
                material={bezelAlloyMat}
              />
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};

// ============================================================================
// 5. CONCRETE BUNKER — Hầm trú ẩn bê tông chữ U nửa chìm (4.50 × 3.20 × 2.20 m, dùng cho S11 & S18)
// ============================================================================

export type ConcreteBunkerProps = {
  /** Bật đèn chớp cảnh báo đỏ trên cửa hầm trú ẩn (0..1, dùng ở S18). */
  strobe?: number;
  seed?: number;
};

export const ConcreteBunker: React.FC<ConcreteBunkerProps> = ({ strobe = 0, seed = 61 }) => {
  const archGeo = useMemo(() => {
    const b = 0.02;
    const prof: P2[] = [
      [-(1.30 - b), b],
      [-(0.72 - b), b],
      [-(0.72 - b), 1.72],
      [-(0.56 - b), 1.88],
      [0.56 - b, 1.88],
      [0.72 - b, 1.72],
      [0.72 - b, b],
      [1.30 - b, b],
      [1.24 - b, 1.82],
      [0.98 - b, 2.20 - b],
      [-(0.98 - b), 2.20 - b],
      [-(1.24 - b), 1.82],
    ];
    const g = extrude(prof, 3.76, b).clone();
    g.rotateY(Math.PI / 2);
    return g;
  }, []);

  const bermGeo = useMemo(() => {
    const b = 0.015;
    const prof: P2[] = [
      [-(1.60 - b), b],
      [-(1.15 - b), b],
      [-(1.15 - b), 1.25],
      [-(1.60 - b), b + 0.04],
    ];
    const left = extrude(prof, 3.60, b).clone();
    left.rotateY(Math.PI / 2);
    const right = left.clone();
    right.rotateY(Math.PI);
    return merge([left, right]);
  }, []);

  const concreteMat = useMemo(
    () =>
      paint({
        color: PAL3D.concrete,
        camo: PAL3D.concreteCamo,
        camoScale: 4,
        repeat: 0.42,
        dirt: 0.36,
        wear: 0.20,
        roughness: 0.88,
        metalness: 0.05,
        seed,
      }),
    [seed]
  );

  const sandBermMat = useMemo(
    () =>
      paint({
        color: PAL3D.hescoSand,
        camo: ['#a48b63', '#c3ab82'],
        camoScale: 4,
        repeat: 0.8,
        dirt: 0.34,
        wear: 0.12,
        roughness: 0.95,
        metalness: 0.02,
        seed: seed + 5,
      }),
    [seed]
  );

  const steelMat = plain('#5d6874', 0.55, 0.32);
  const darkInteriorMat = plain('#0f1318', 0.95, 0.05);

  return (
    <group>
      <mesh geometry={archGeo} position={[-0.35, 0, 0]} material={concreteMat} castShadow receiveShadow />
      <mesh geometry={rbox(0.28, 1.94, 1.64, 0.01)} position={[-2.10, 0.97, 0]} material={concreteMat} castShadow />
      <mesh geometry={rbox(3.40, 1.84, 1.38, 0.01)} position={[-0.50, 0.93, 0]} material={darkInteriorMat} />

      <mesh geometry={bermGeo} position={[-0.35, 0, 0]} material={sandBermMat} receiveShadow />
      {[-1.5, -0.75, 0, 0.75].map((sx, idx) => (
        <mesh
          key={idx}
          geometry={rbox(0.68, 0.14, 1.56, 0.05)}
          position={[sx, 2.24, 0]}
          material={sandBermMat}
          castShadow
        />
      ))}

      {([-0.96, 0.96] as const).map((wz, i) => (
        <mesh
          key={i}
          geometry={rbox(0.74, 1.65, 0.34, 0.015)}
          position={[1.88, 0.825, wz]}
          material={concreteMat}
          castShadow
          receiveShadow
        />
      ))}
      {([-0.74, 0.74] as const).map((hz, i) => (
        <mesh
          key={`hz_${i}`}
          geometry={rbox(0.04, 1.55, 0.12, 0.004)}
          position={[1.54, 0.82, hz]}
          material={plain('#d89c28', 0.6, 0.1)}
        />
      ))}

      <group position={[1.56, 2.02, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <WarningStrobeBeacon pos={[0, 0, 0]} strobe={strobe} steelMat={steelMat} />
      </group>
    </group>
  );
};

// ============================================================================
// BÀN XOAY KIỂM MÔ HÌNH 4 GÓC (python3 tools/sheet.py gem --model ChuContainer,NightHawkMast,BastionSet)
// ============================================================================

export const MODELS: ModelSet = {
  ChuContainer: { C: () => <ChuContainer warmLight />, size: 6.4, center: [0, 1.35, 0] },
  NightHawkMast: { C: () => <NightHawkMast yaw={0.4} strobe={0.8} />, size: 8.2, center: [0, 3.3, 0] },
  BastionSet: {
    C: () => (
      <group>
        <group position={[-1.4, 0, -0.9]}>
          <TWall count={3} />
        </group>
        <group position={[1.4, 0, 0.9]}>
          <HescoWall cells={3} />
        </group>
      </group>
    ),
    size: 6.8,
    center: [0, 1.7, 0],
  },
};
