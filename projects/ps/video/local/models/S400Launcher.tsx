import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, lathe, rbox, pipe, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Wheel, Rivets } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

export type S400LauncherProps = {
  elev?: number;        // 0..90 độ, mặc định 90
  loadedCount?: number; // 0..4, mặc định 4
  wheelSpin?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

const PIVOT_X = -5.42;
const PIVOT_Y = 1.48;

/** Tiện tròn quanh trục cục bộ +X (toạ độ dọc trục tăng dần cho pháp tuyến hướng chuẩn ra ngoài). */
const latheOut = (ascProfile: P2[], seg = 36) => lathe(ascProfile, seg);

/** Chân chống thuỷ lực hạng nặng hạ bám mặt đất chuẩn tại y = 0. */
const HydraulicOutrigger: React.FC<{ x: number; zSign: 1 | -1; zOut: number }> = ({ x, zSign, zOut }) => {
  const zArmMid = zSign * (0.95 + (zOut - 0.95) * 0.5);
  const armLen = zOut - 0.82;
  return (
    <group position={[x, 0, 0]}>
      {/* Cần vươn ngang hộp thép vát từ khung sườn ra trụ kích */}
      <mesh
        position={[0, 1.13, zArmMid]}
        rotation={[zSign * -0.1, 0, 0]}
        geometry={rbox(0.36, 0.25, armLen, 0.025)}
        material={plain('#3e4e35', 0.58, 0.38)}
        castShadow
      />
      {/* Vỏ xi-lanh thuỷ lực đứng + nắp bích */}
      <mesh position={[0, 0.76, zSign * zOut]} material={plain(PAL3D.s400Base, 0.54, 0.42)} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.98, 22]} />
      </mesh>
      <mesh position={[0, 1.24, zSign * zOut]} material={plain(PAL3D.darkSteel, 0.44, 0.72)}>
        <cylinderGeometry args={[0.138, 0.138, 0.07, 22]} />
      </mesh>
      {/* Ty ben mạ crôm */}
      <mesh position={[0, 0.24, zSign * zOut]} material={plain(PAL3D.steel, 0.18, 0.9)} castShadow>
        <cylinderGeometry args={[0.078, 0.078, 0.4, 20]} />
      </mesh>
      {/* Đĩa chân đế có gân tăng cứng tiếp đất đúng y = 0.00 */}
      <mesh position={[0, 0.036, zSign * zOut]} material={plain(PAL3D.darkSteel, 0.52, 0.65)} castShadow receiveShadow>
        <cylinderGeometry args={[0.25, 0.295, 0.072, 24]} />
      </mesh>
      {[0, 90].map((deg) => (
        <mesh
          key={deg}
          position={[0, 0.082, zSign * zOut]}
          rotation={[0, (deg * Math.PI) / 180, 0]}
          geometry={rbox(0.48, 0.052, 0.052, 0.008)}
          material={plain('#4a535c', 0.48, 0.68)}
        />
      ))}
    </group>
  );
};

/** Cụm xi-lanh thuỷ lực nâng giàn phóng 2 tầng tự động bám khớp theo mọi góc elev (0..90°). */
const ElevationCylinder: React.FC<{ ax: number; ay: number; bx: number; by: number; z: number }> = ({ ax, ay, bx, by, z }) => {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  const barrelLen = 2.18;
  const stage1Len = Math.max(0.4, (dist - barrelLen * 0.45) * 0.62);
  const stage2Len = Math.max(0.4, dist - barrelLen * 0.55);

  return (
    <group position={[ax, ay, z]} rotation={[0, 0, ang]}>
      <mesh rotation={[Math.PI / 2, 0, 0]} material={plain(PAL3D.darkSteel, 0.44, 0.74)}>
        <cylinderGeometry args={[0.115, 0.115, 0.22, 18]} />
      </mesh>
      <mesh position={[barrelLen * 0.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#536746', 0.5, 0.45)} castShadow>
        <cylinderGeometry args={[0.13, 0.14, barrelLen, 22]} />
      </mesh>
      <mesh position={[barrelLen, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.darkSteel, 0.38, 0.78)}>
        <cylinderGeometry args={[0.148, 0.148, 0.12, 22]} />
      </mesh>
      <mesh
        position={[barrelLen * 0.55 + stage1Len * 0.5, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={plain(PAL3D.steel, 0.16, 0.92)}
        castShadow
      >
        <cylinderGeometry args={[0.095, 0.095, stage1Len, 20]} />
      </mesh>
      <mesh
        position={[dist - stage2Len * 0.5, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={plain('#dce5ee', 0.14, 0.94)}
        castShadow
      >
        <cylinderGeometry args={[0.068, 0.068, stage2Len, 20]} />
      </mesh>
      <mesh position={[dist, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain(PAL3D.darkSteel, 0.44, 0.74)}>
        <cylinderGeometry args={[0.105, 0.105, 0.2, 18]} />
      </mesh>
    </group>
  );
};

/**
 * Một ống phóng trụ tròn 48N6 của S-400 (dài đúng 7.50 m: localX = -0.58 .. +6.92, đường kính 0.90 m → r = 0.45 m).
 * `loaded = true`: đậy nắp vòm bảo vệ kín; `loaded = false`: bung vỡ nắp, lộ lòng ống rỗng tối đen ám muội khói.
 */
const Canister48N6: React.FC<{
  localY: number;
  localZ: number;
  loaded: boolean;
  tubeMat: THREE.Material;
  capGeo: THREE.BufferGeometry;
  breechGeo: THREE.BufferGeometry;
}> = ({ localY, localZ, loaded, tubeMat, capGeo, breechGeo }) => {
  const xStart = -0.58;
  const xEnd = 6.92;
  const len = 7.5;
  const xMid = (xStart + xEnd) * 0.5;

  const ribPositions = useMemo(() => {
    const arr: number[] = [];
    for (let i = 0; i < 11; i++) {
      arr.push(xStart + 0.35 + i * 0.68);
    }
    return arr;
  }, []);

  return (
    <group position={[0, localY, localZ]}>
      {/* Thân ống trụ chính dài 7.50 m, Ø 0.90 m */}
      <mesh position={[xMid, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={tubeMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.45, 0.45, len - 0.14, 42, 1, !loaded]} />
      </mesh>

      {/* Vạch sơn đánh dấu chiến thuật của đạn 48N6 trên thân ống */}
      <mesh position={[5.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#a6b29c', 0.58, 0.22)}>
        <cylinderGeometry args={[0.453, 0.453, 0.08, 42]} />
      </mesh>

      {/* Đáy khóa nòng & bầu sinh khí phóng lạnh (cold-launch gas generator breech) */}
      <mesh geometry={breechGeo} material={plain('#3c4a34', 0.54, 0.48)} castShadow receiveShadow />
      <mesh position={[xStart + 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#3d4650', 0.45, 0.68)} castShadow>
        <cylinderGeometry args={[0.486, 0.486, 0.15, 42]} />
      </mesh>

      {/* 11 đai gân vòng cứng tăng cường dọc suốt chiều dài ống (nổi khối sáng/tối rõ nét) */}
      {ribPositions.map((rx, idx) => (
        <group key={idx} position={[rx, 0, 0]}>
          <mesh
            rotation={[0, 0, Math.PI / 2]}
            material={plain(!loaded && idx >= 9 ? '#282c2a' : '#687b59', 0.48, 0.44)}
            castShadow
          >
            <cylinderGeometry args={[0.478, 0.478, 0.072, 42]} />
          </mesh>
          <mesh
            position={[-0.042, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={plain('#2e3828', 0.62, 0.4)}
          >
            <cylinderGeometry args={[0.462, 0.462, 0.02, 42]} />
          </mesh>
        </group>
      ))}

      {/* Ống dẫn cáp khởi điểm chạy dọc sườn ngoài ống phóng */}
      <mesh
        position={[xMid - 0.08, 0, localZ > 0 ? 0.468 : -0.468]}
        geometry={rbox(len - 0.45, 0.07, 0.06, 0.015)}
        material={plain('#44533a', 0.52, 0.48)}
        castShadow
      />

      {/* Vành miệng ống phóng ở localX = +6.92 */}
      <mesh
        position={[xEnd - 0.05, 0, 0]}
        rotation={[0, 0, Math.PI / 2]}
        material={plain(loaded ? '#454f58' : '#1b1d1f', 0.46, 0.65)}
        castShadow
      >
        <cylinderGeometry args={[0.488, 0.482, 0.12, 42]} />
      </mesh>

      {loaded ? (
        /* TRẠNG THÁI CÓ ĐẠN: Đậy kín nắp chóp màng bảo vệ có gân chữ thập */
        <group>
          <mesh geometry={capGeo} material={plain('#6c7f5c', 0.48, 0.34)} castShadow receiveShadow />
          {[0, 90].map((deg) => (
            <mesh
              key={deg}
              position={[xEnd + 0.052, 0, 0]}
              rotation={[(deg * Math.PI) / 180, 0, 0]}
              geometry={rbox(0.045, 0.88, 0.036, 0.006)}
              material={plain('#3c454e', 0.45, 0.66)}
            />
          ))}
          <mesh position={[xEnd + 0.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.brass, 0.35, 0.82)}>
            <cylinderGeometry args={[0.078, 0.095, 0.045, 20]} />
          </mesh>
        </group>
      ) : (
        /* TRẠNG THÁI ĐÃ BẮN HẾT ĐẠN: Nắp bung vỡ toác, lộ lòng ống sâu tối đen & vết ám muội khói */
        <group>
          <mesh position={[xEnd - 0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#1d2021', 0.88, 0.15)}>
            <cylinderGeometry args={[0.456, 0.454, 0.46, 36, 1, true]} />
          </mesh>
          <mesh position={[xEnd - 1.42, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.425, 0.425, 2.8, 32, 1, true]} />
            <meshStandardMaterial color="#0b0d0f" roughness={0.96} metalness={0.08} side={THREE.BackSide} />
          </mesh>
          <mesh position={[xEnd - 2.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.425, 0.425, 0.05, 28]} />
            <meshBasicMaterial color="#07080a" />
          </mesh>
          <mesh position={[xEnd - 0.08, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.432, 0.432, 0.14, 32, 1, true]} />
            <meshStandardMaterial color="#181b1e" roughness={0.82} metalness={0.35} side={THREE.DoubleSide} />
          </mesh>
          {Array.from({ length: 8 }, (_, k) => {
            const a = (k / 8) * Math.PI * 2 + 0.2;
            const splay = 0.52 + (k % 3) * 0.16;
            const shardLen = 0.23 + (k % 2) * 0.07;
            return (
              <group key={k} position={[xEnd - 0.01, Math.cos(a) * 0.44, Math.sin(a) * 0.44]} rotation={[a, 0, 0]}>
                <mesh
                  position={[shardLen * 0.42, shardLen * 0.28, 0]}
                  rotation={[0, 0, splay]}
                  geometry={rbox(shardLen, 0.024, 0.16, 0.004)}
                  material={plain('#292e28', 0.8, 0.24)}
                  castShadow
                />
              </group>
            );
          })}
          <mesh
            position={[xEnd + 0.08, 0, localZ > 0 ? 0.56 : -0.56]}
            rotation={[localZ > 0 ? 0.65 : -0.65, 0, 0]}
            geometry={rbox(0.18, 0.04, 0.16, 0.01)}
            material={plain('#2b3135', 0.62, 0.52)}
            castShadow
          />
        </group>
      )}
    </group>
  );
};

/**
 * Xe bệ phóng tự hành phòng không S-400 Triumf (5P85SM2 trên khung gầm việt dã 8×8 MZKT-7930)
 * Quy ước: cabin hướng +X, đỉnh +Y, bánh xe & chân chống tiếp đất chuẩn y = 0.
 * Dài khung xe 13.10 m (x: -6.55 .. +6.55), rộng ~2.85 m, cao ~8.40 m khi dựng ống 90°.
 */
export const S400Launcher: React.FC<S400LauncherProps> = ({
  elev = 90,
  loadedCount = 4,
  wheelSpin = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: S400LauncherProps = {}) => {
  const elevClamped = Math.max(0, Math.min(90, elev));
  const elevRad = (elevClamped * Math.PI) / 180;
  const loaded = Math.max(0, Math.min(4, Math.round(loadedCount)));

  const geos = useMemo(() => {
    // 1) Cabin quân sự bọc thép vát góc MZKT-7930 "Astrolog" (x = +3.82 .. +6.51, rộng 2.76 m + bevel 0.04 = 2.84 m)
    const cabPts: P2[] = [
      [3.82, 1.48],
      [5.28, 1.48],
      [5.54, 0.9],
      [6.36, 0.9],
      [6.51, 1.1],
      [6.51, 1.4],
      [6.16, 1.68],
      [5.63, 2.64],
      [5.48, 2.74],
      [3.88, 2.74],
      [3.82, 2.64],
    ];
    const cabGeo = extrude(cabPts, 2.76, 0.04);

    // 2) Khoang động cơ diesel YaMZ + máy phát điện phụ & tản nhiệt lớn ngay sau cabin (x = +1.60 .. +3.74)
    // Kết thúc ở x = +1.60 để khi hạ ngang ống phóng (elev = 0°, mũi ống ở x = +1.50) nằm gọn trên giá yên ngựa không va chạm!
    const engPts: P2[] = [
      [1.6, 1.42],
      [3.74, 1.42],
      [3.74, 2.68],
      [3.58, 2.78],
      [1.82, 2.78],
      [1.6, 2.52],
    ];
    const engGeo = extrude(engPts, 2.66, 0.04);

    // 3) Hốc chắn bùn vát góc cụm 2 trục bánh trước và 2 trục bánh sau
    const frontFenderPts: P2[] = [
      [1.48, 1.08],
      [1.72, 1.44],
      [5.18, 1.44],
      [5.4, 1.08],
      [5.22, 1.08],
      [5.05, 1.35],
      [1.88, 1.35],
      [1.66, 1.08],
    ];
    const rearFenderPts: P2[] = [
      [-5.14, 1.06],
      [-4.88, 1.44],
      [-1.44, 1.44],
      [-1.18, 1.06],
      [-1.36, 1.06],
      [-1.58, 1.35],
      [-4.72, 1.35],
      [-4.94, 1.06],
    ];
    const frontFenderGeo = extrude(frontFenderPts, 2.83, 0.02);
    const rearFenderGeo = extrude(rearFenderPts, 2.83, 0.02);

    // 4) Ống xả động cơ diesel lớn bên hông phải + cặp ống dẫn dầu thuỷ lực cao áp trên sàn bệ
    const exhaustPipeGeo = pipe(
      [
        [3.42, 2.18, 1.24],
        [3.6, 2.42, 1.36],
        [3.6, 3.08, 1.36],
        [3.48, 3.28, 1.43],
      ],
      0.072,
      28,
    );
    const hoseRightGeo = pipe(
      [
        [-0.35, 1.56, 0.42],
        [-0.95, 1.54, 0.66],
        [-1.68, 1.38, 0.72],
      ],
      0.028,
      24,
    );
    const hoseLeftGeo = pipe(
      [
        [-0.35, 1.56, -0.42],
        [-0.95, 1.54, -0.66],
        [-1.68, 1.38, -0.72],
      ],
      0.028,
      24,
    );

    // 5) Nắp vòm bảo vệ đầu ống phóng 48N6 (localX = +6.91 .. +7.07) & bầu đáy phóng lạnh (-0.58 .. -0.42) — pháp tuyến chuẩn ngoài
    const capProfile: P2[] = [[0.001, 6.91], [0.472, 6.91], [0.472, 6.95]];
    for (let i = 0; i <= 16; i++) {
      const u = i / 16;
      const r = 0.456 * Math.cos(u * Math.PI * 0.5);
      const x = 6.95 + Math.sin(u * Math.PI * 0.5) * 0.12;
      capProfile.push([Math.max(0.001, r), x]);
    }
    const breechProfile: P2[] = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      const x = -0.58 + (1 - Math.cos(u * Math.PI * 0.5)) * 0.12;
      const r = Math.sin(u * Math.PI * 0.5) * 0.448;
      breechProfile.push([Math.max(0.001, r), x]);
    }
    breechProfile.push([0.448, -0.42], [0.001, -0.42]);

    return {
      cabGeo,
      engGeo,
      frontFenderGeo,
      rearFenderGeo,
      exhaustPipeGeo,
      hoseRightGeo,
      hoseLeftGeo,
      capGeo: latheOut(capProfile, 40),
      breechGeo: latheOut(breechProfile, 40),
    };
  }, []);

  const hullPaint = useMemo(
    () =>
      paint({
        color: PAL3D.s400Base,
        camo: [PAL3D.s400Camo1, PAL3D.s400Camo2],
        camoScale: 1.35,
        wear: 0.24,
        dirt: 0.28,
        roughness: 0.6,
        metalness: 0.3,
        repeat: 0.4,
        seed: 73,
      }),
    [],
  );

  const tubePaint = useMemo(
    () =>
      paint({
        color: PAL3D.s400Tube,
        camo: [PAL3D.s400Base, '#667856', PAL3D.s400Camo1],
        camoScale: 1.45,
        wear: 0.22,
        dirt: 0.2,
        roughness: 0.55,
        metalness: 0.32,
        repeat: 1,
        seed: 89,
      }),
    [],
  );

  const cabRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (const sgn of [-1, 1]) {
      const z = sgn * 1.425;
      for (let x = 3.96; x <= 5.42; x += 0.34) pts.push([x, 2.66, z]);
      for (let y = 1.58; y <= 2.55; y += 0.32) pts.push([3.92, y, z]);
      for (let x = 1.78; x <= 3.6; x += 0.38) pts.push([x, 2.64, sgn * 1.375]);
    }
    return pts;
  }, []);

  const cylLocalX = 1.78;
  const cylLocalY = 0.34;
  const cylTopX = PIVOT_X + cylLocalX * Math.cos(elevRad) - cylLocalY * Math.sin(elevRad);
  const cylTopY = PIVOT_Y + cylLocalX * Math.sin(elevRad) + cylLocalY * Math.cos(elevRad);

  const axleXs = [4.45, 2.45, -2.15, -4.15];

  const tubeSlots: [number, number][] = [
    [1.72, -0.51], // Ống 0: trên - trái
    [1.72, 0.51],  // Ống 1: trên - phải
    [0.76, -0.51], // Ống 2: dưới - trái
    [0.76, 0.51],  // Ống 3: dưới - phải
  ];

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ==================== 1. KHUNG GẦM 8×8, 8 BÁNH ĐỊA HÌNH & 4 CHÂN CHỐNG ==================== */}
      <group>
        {/* Dầm dọc sắt-xi đôi chịu tải hạng nặng */}
        {[-0.54, 0.54].map((z) => (
          <mesh
            key={z}
            position={[0.38, 1.18, z]}
            geometry={rbox(12.2, 0.34, 0.24, 0.03)}
            material={plain('#2b3327', 0.68, 0.42)}
            castShadow
            receiveShadow
          />
        ))}
        {/* Sàn bệ máy phía sau, máng rãnh thu nhận dầm nâng & cụm tủ thiết bị hai bên hông sàn */}
        <mesh position={[-1.92, 1.41, 0]} geometry={rbox(6.95, 0.14, 2.56, 0.025)} material={hullPaint} castShadow receiveShadow />

        {/* Hộc tủ thuỷ lực - điện tử & sàn thao tác hai bên mép ngoài (nằm ngoài biên Z ±0.98 để không cấn ống khi hạ 0°) */}
        {[-1, 1].map((sgn) => (
          <group key={sgn}>
            <mesh
              position={[-0.25, 1.62, sgn * 1.16]}
              geometry={rbox(2.15, 0.28, 0.32, 0.025)}
              material={hullPaint}
              castShadow
            />
            <mesh
              position={[-2.95, 1.56, sgn * 1.16]}
              geometry={rbox(2.55, 0.18, 0.3, 0.02)}
              material={plain('#3c4a33', 0.58, 0.42)}
              castShadow
            />
            {/* Bình chữa cháy đỏ sẫm & cuộn cáp chiến thuật bên hông */}
            <mesh
              position={[0.98, 1.62, sgn * 1.18]}
              rotation={[0, 0, Math.PI / 2]}
              material={plain('#8a2d29', 0.45, 0.35)}
              castShadow
            >
              <cylinderGeometry args={[0.075, 0.075, 0.42, 14]} />
            </mesh>
            {/* Dầm vai đuôi bảo vệ chân chống sau & đèn hậu (x tới -6.55) */}
            <mesh
              position={[-5.95, 1.18, sgn * 1.18]}
              geometry={rbox(1.2, 0.28, 0.44, 0.03)}
              material={plain('#384630', 0.6, 0.42)}
              castShadow
            />
            <mesh position={[-6.54, 1.18, sgn * 1.22]} geometry={rbox(0.05, 0.12, 0.26, 0.01)} material={plain('#a82e2e', 0.35, 0.2)} />
          </group>
        ))}

        {/* Trạm van phân phối thuỷ lực trung tâm & ống dẫn dầu cao áp trên mặt sàn */}
        <mesh position={[-0.25, 1.56, 0]} geometry={rbox(0.76, 0.18, 0.88, 0.025)} material={plain('#394533', 0.54, 0.5)} castShadow />
        <mesh geometry={geos.hoseRightGeo} material={plain('#202428', 0.65, 0.35)} />
        <mesh geometry={geos.hoseLeftGeo} material={plain('#202428', 0.65, 0.35)} />

        {/* Giá đỡ yên ngựa khoá cứng cụm ống phóng khi hạ ngang hành quân (elev = 0°, đặt tại x = +1.30) */}
        <group position={[1.3, 1.62, 0]}>
          <mesh geometry={rbox(0.28, 0.3, 2.12, 0.025)} material={plain('#35432e', 0.58, 0.46)} castShadow />
          {[-0.51, 0.51].map((z) => (
            <group key={z} position={[0, 0.2, z]}>
              <mesh position={[0, 0, -0.34]} rotation={[0.35, 0, 0]} geometry={rbox(0.24, 0.28, 0.12, 0.02)} material={plain(PAL3D.darkSteel, 0.5, 0.62)} />
              <mesh position={[0, 0, 0.34]} rotation={[-0.35, 0, 0]} geometry={rbox(0.24, 0.28, 0.12, 0.02)} material={plain(PAL3D.darkSteel, 0.5, 0.62)} />
            </group>
          ))}
        </group>

        {/* Hốc chắn bùn trước & sau */}
        <mesh geometry={geos.frontFenderGeo} material={hullPaint} castShadow receiveShadow />
        <mesh geometry={geos.rearFenderGeo} material={hullPaint} castShadow receiveShadow />

        {/* Bồn nhiên liệu diesel, thùng dầu thuỷ lực & hòm phụ tùng dưới gầm giữa trục 2 và trục 3 */}
        {[-1, 1].map((sgn) => (
          <group key={sgn}>
            <mesh
              position={[-0.38, 1.12, sgn * 1.12]}
              rotation={[0, 0, Math.PI / 2]}
              material={plain('#415037', 0.54, 0.44)}
              castShadow
            >
              <cylinderGeometry args={[0.28, 0.28, 1.32, 24]} />
            </mesh>
            <mesh position={[0.88, 1.16, sgn * 1.14]} geometry={rbox(0.86, 0.48, 0.52, 0.03)} material={hullPaint} castShadow />
          </group>
        ))}

        {/* Trục cầu vi sai, trục các-đăng & 8 bánh lốp địa hình lớn (r = 0.68 m → đáy lốp chuẩn y = 0.00) */}
        <mesh position={[0.15, 0.74, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#23272a', 0.6, 0.55)}>
          <cylinderGeometry args={[0.075, 0.075, 9.0, 14]} />
        </mesh>
        {axleXs.map((ax, idx) => (
          <group key={idx}>
            <mesh position={[ax, 0.68, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain('#222629', 0.65, 0.5)} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 2.2, 16]} />
            </mesh>
            <mesh position={[ax, 0.68, 0]} material={plain('#1d2023', 0.62, 0.55)}>
              <sphereGeometry args={[0.21, 16, 12]} />
            </mesh>
            <Wheel
              r={0.68}
              width={0.48}
              spin={wheelSpin}
              tire={PAL3D.tire}
              rim={PAL3D.s400Base}
              bolts={10}
              position={[ax, 0.68, 1.18]}
            />
            <group position={[ax, 0.68, -1.18]} rotation={[0, Math.PI, 0]}>
              <Wheel r={0.68} width={0.48} spin={-wheelSpin} tire={PAL3D.tire} rim={PAL3D.s400Base} bolts={10} />
            </group>
          </group>
        ))}

        {/* 4 chân chống thuỷ lực hạ bám đất chuẩn y = 0.00 */}
        <HydraulicOutrigger x={0.28} zSign={1} zOut={1.54} />
        <HydraulicOutrigger x={0.28} zSign={-1} zOut={1.54} />
        <HydraulicOutrigger x={-5.85} zSign={1} zOut={1.62} />
        <HydraulicOutrigger x={-5.85} zSign={-1} zOut={1.62} />
      </group>

      {/* ==================== 2. CABIN BỌC THÉP MZKT-7930 & KHOANG ĐỘNG CƠ DIESEL ==================== */}
      <group>
        <mesh geometry={geos.cabGeo} material={hullPaint} castShadow receiveShadow />

        {/* Cản trước hầm hố, móc kéo đôi, lưới tản nhiệt mũi & cụm đèn pha bọc lồng thép */}
        <mesh position={[6.52, 1.04, 0]} geometry={rbox(0.14, 0.34, 2.84, 0.03)} material={plain('#323f2c', 0.56, 0.48)} castShadow />
        {[-0.72, 0.72].map((z) => (
          <mesh key={z} position={[6.58, 1.02, z]} geometry={rbox(0.12, 0.11, 0.14, 0.02)} material={plain(PAL3D.steel, 0.4, 0.76)} />
        ))}
        <mesh position={[6.52, 1.29, 0]} geometry={rbox(0.06, 0.22, 1.24, 0.015)} material={plain('#1a1f1c', 0.78, 0.35)} />
        {[-1, 1].map((sgn) => (
          <group key={sgn} position={[6.52, 1.24, sgn * 1.04]}>
            <mesh geometry={rbox(0.07, 0.2, 0.48, 0.015)} material={plain('#1e2420', 0.65, 0.45)} />
            <mesh position={[0.03, 0, -sgn * 0.1]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.068, 0.068, 0.03, 18]} />
              <meshStandardMaterial color="#f2f7ff" emissive="#fff2cc" emissiveIntensity={0.42} roughness={0.14} metalness={0.5} />
            </mesh>
            <mesh position={[0.03, 0, sgn * 0.07]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.056, 0.056, 0.03, 18]} />
              <meshStandardMaterial color="#e8f0fa" roughness={0.18} metalness={0.6} />
            </mesh>
            <mesh position={[0.03, 0.02, sgn * 0.19]} geometry={rbox(0.03, 0.06, 0.06, 0.008)} material={plain(PAL3D.flame, 0.3, 0.2)} />
          </group>
        ))}

        {/* 2 Ô KÍNH CHẮN GIÓ NGHIÊNG TÁCH ĐÔI ĐẶC TRƯNG MZKT-7930 + khung thép nổi + gạt nước */}
        {[-0.68, 0.68].map((z) => (
          <group key={z} position={[5.92, 2.18, z]} rotation={[0, 0, 0.495]}>
            <mesh geometry={rbox(0.075, 0.85, 1.09, 0.02)} material={plain('#4c5e41', 0.52, 0.42)} />
            <mesh position={[0.026, 0, 0]} geometry={rbox(0.035, 0.72, 0.96, 0.01)} material={plain('#2b4d6e', 0.1, 0.9)} />
            <mesh position={[0.05, -0.1, 0.06]} rotation={[0.32, 0, 0]} geometry={rbox(0.02, 0.46, 0.022, 0.004)} material={plain('#181c20', 0.5, 0.6)} />
          </group>
        ))}
        <mesh position={[5.93, 2.18, 0]} rotation={[0, 0, 0.495]} geometry={rbox(0.095, 0.87, 0.24, 0.02)} material={plain('#384630', 0.55, 0.45)} />
        <mesh position={[5.73, 2.68, 0]} rotation={[0, 0, 0.2]} geometry={rbox(0.28, 0.055, 2.74, 0.015)} material={plain('#3c4b34', 0.56, 0.42)} castShadow />

        {/* Cửa hông bọc thép, ô kính hông, bậc trèo & gương chiếu hậu 2 bên cabin */}
        {[-1, 1].map((sgn) => (
          <group key={sgn}>
            <mesh position={[4.86, 2.08, sgn * 1.422]} geometry={rbox(1.02, 1.06, 0.03, 0.012)} material={plain('#495c3f', 0.56, 0.36)} />
            <mesh position={[4.94, 2.28, sgn * 1.43]} geometry={rbox(0.68, 0.44, 0.03, 0.01)} material={plain('#2b4d6e', 0.12, 0.88)} />
            <mesh position={[4.16, 2.28, sgn * 1.425]} geometry={rbox(0.36, 0.42, 0.026, 0.01)} material={plain('#2b4d6e', 0.12, 0.88)} />
            <mesh position={[4.48, 1.92, sgn * 1.445]} geometry={rbox(0.14, 0.04, 0.04, 0.008)} material={plain(PAL3D.steel, 0.36, 0.78)} />
            <mesh position={[5.42, 1.18, sgn * 1.42]} geometry={rbox(0.32, 0.04, 0.12, 0.008)} material={plain(PAL3D.darkSteel, 0.52, 0.65)} />
            <mesh position={[5.76, 2.22, sgn * 1.53]} geometry={rbox(0.08, 0.42, 0.18, 0.02)} material={plain('#262d27', 0.48, 0.52)} castShadow />
            <mesh position={[5.76, 2.44, sgn * 1.47]} geometry={rbox(0.04, 0.04, 0.16, 0.01)} material={plain(PAL3D.darkSteel, 0.45, 0.7)} />
            <mesh position={[5.76, 2.0, sgn * 1.47]} geometry={rbox(0.04, 0.04, 0.16, 0.01)} material={plain(PAL3D.darkSteel, 0.45, 0.7)} />
          </group>
        ))}

        {/* Nắp cửa nóc trưởng xe, đèn pha tìm kiếm, hộp lọc NBC & cần ăng-ten liên lạc */}
        <mesh position={[4.68, 2.8, -0.58]} material={plain('#485a3e', 0.55, 0.38)} castShadow>
          <cylinderGeometry args={[0.36, 0.38, 0.09, 24]} />
        </mesh>
        <mesh position={[4.28, 2.82, 0.62]} geometry={rbox(0.68, 0.14, 0.64, 0.03)} material={plain('#43543a', 0.58, 0.38)} castShadow />
        <mesh position={[5.42, 2.84, -0.96]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.darkSteel, 0.4, 0.7)}>
          <cylinderGeometry args={[0.075, 0.09, 0.14, 16]} />
        </mesh>
        <mesh position={[3.95, 3.48, -1.28]} material={plain(PAL3D.steel, 0.32, 0.84)}>
          <cylinderGeometry args={[0.012, 0.024, 1.5, 8]} />
        </mesh>

        {/* Khoang động cơ diesel & máy phát điện ngay sau cabin + lưới tản nhiệt lớn + ống xả đứng */}
        <mesh geometry={geos.engGeo} material={hullPaint} castShadow receiveShadow />
        {[-1, 1].map((sgn) => (
          <group key={sgn} position={[2.76, 2.16, sgn * 1.372]}>
            <mesh geometry={rbox(1.58, 0.84, 0.03, 0.01)} material={plain('#1b211c', 0.82, 0.3)} />
            {[-0.28, -0.14, 0, 0.14, 0.28].map((ly) => (
              <mesh key={ly} position={[0, ly, sgn * 0.014]} geometry={rbox(1.48, 0.048, 0.022, 0.004)} material={plain('#46583c', 0.56, 0.4)} />
            ))}
          </group>
        ))}
        {/* Cửa quạt gió làm mát tròn lớn & cụm két tản nhiệt đôi trên nóc khoang động cơ */}
        <mesh position={[2.95, 2.82, 0]} material={plain('#262f24', 0.68, 0.44)} castShadow>
          <cylinderGeometry args={[0.56, 0.6, 0.08, 28]} />
        </mesh>
        <mesh position={[2.02, 2.83, 0]} geometry={rbox(0.56, 0.12, 1.68, 0.025)} material={plain('#384630', 0.56, 0.44)} castShadow />

        {/* Bầu giảm thanh bọc vỏ bảo vệ nhiệt & ống xả diesel lớn bên hông phải */}
        <mesh position={[3.6, 2.28, 1.36]} material={plain('#32393e', 0.48, 0.68)} castShadow>
          <cylinderGeometry args={[0.145, 0.145, 1.22, 20]} />
        </mesh>
        <mesh geometry={geos.exhaustPipeGeo} material={plain('#444c54', 0.42, 0.76)} castShadow />

        <Rivets points={cabRivets} r={0.013} color="#768868" />
      </group>

      {/* ==================== 3. BẢN LỀ ĐUÔI, XI-LANH KÉP & CỤM 4 ỐNG PHÓNG TRÒN 48N6 (7.50m × Ø0.90m) ==================== */}
      <group>
        {/* Bệ gối bản lề nâng hạng nặng ở đuôi xe + tấm chắn hướng luồng phụt đuôi */}
        {[-0.64, 0.64].map((z) => (
          <mesh
            key={z}
            position={[PIVOT_X, 1.38, z]}
            geometry={rbox(0.7, 0.5, 0.22, 0.03)}
            material={plain('#34422d', 0.54, 0.52)}
            castShadow
          />
        ))}
        <mesh position={[PIVOT_X, PIVOT_Y, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain(PAL3D.steel, 0.36, 0.8)} castShadow>
          <cylinderGeometry args={[0.135, 0.135, 1.6, 24]} />
        </mesh>
        <mesh
          position={[PIVOT_X - 0.18, 1.06, 0]}
          rotation={[0, 0, -0.38]}
          geometry={rbox(0.06, 0.54, 1.54, 0.015)}
          material={plain('#2b333a', 0.55, 0.6)}
          castShadow
        />

        {/* Cặp xi-lanh thuỷ lực kép nâng giàn 4 ống phóng */}
        <ElevationCylinder ax={-1.72} ay={1.34} bx={cylTopX} by={cylTopY} z={0.74} />
        <ElevationCylinder ax={-1.72} ay={1.34} bx={cylTopX} by={cylTopY} z={-0.74} />

        {/* Khung giàn nâng xoay quanh bản lề đuôi: elev = 0° (hành quân ngang) → elev = 90° (dựng thẳng đứng cao ~8.40 m) */}
        <group position={[PIVOT_X, PIVOT_Y, 0]} rotation={[0, 0, elevRad]}>
          {/* Dầm xương sống giàn nâng trung tâm nối bản lề với 4 gông kẹp cụm ống 2×2 */}
          <mesh
            position={[3.05, 0.34, 0]}
            geometry={rbox(6.75, 0.26, 0.92, 0.03)}
            material={plain('#3a4832', 0.56, 0.46)}
            castShadow
            receiveShadow
          />
          {[-0.74, 0.74].map((z) => (
            <mesh
              key={z}
              position={[cylLocalX, cylLocalY, z]}
              geometry={rbox(0.38, 0.25, 0.16, 0.025)}
              material={plain('#3e4750', 0.46, 0.7)}
            />
          ))}

          {/* Bàn mâm đế truyền lực giật phóng lạnh dưới đáy 4 ống (localX = -0.60) */}
          <mesh position={[-0.6, 1.24, 0]} geometry={rbox(0.13, 2.02, 2.06, 0.03)} material={plain('#313c2b', 0.55, 0.54)} castShadow />

          {/* 4 bộ khung gông thép chữ H khoá cứng cụm 2×2 ống phóng tròn 48N6 */}
          {[0.25, 2.3, 4.35, 6.32].map((fx) => (
            <group key={fx} position={[fx, 1.24, 0]}>
              <mesh geometry={rbox(0.19, 0.16, 2.08, 0.02)} material={plain('#454f58', 0.46, 0.68)} castShadow />
              <mesh position={[0, -0.36, 0]} geometry={rbox(0.21, 1.32, 0.19, 0.02)} material={plain('#454f58', 0.46, 0.68)} castShadow />
              {[-1.02, 1.02].map((fz) => (
                <mesh key={fz} position={[0, 0, fz]} geometry={rbox(0.19, 1.18, 0.085, 0.015)} material={plain('#415038', 0.5, 0.54)} castShadow />
              ))}
            </group>
          ))}

          {/* 4 ống phóng trụ tròn lớn 48N6 (7.50 m × Ø 0.90 m, cụm 2×2) */}
          {tubeSlots.map(([ly, lz], idx) => (
            <Canister48N6
              key={idx}
              localY={ly}
              localZ={lz}
              loaded={idx < loaded}
              tubeMat={tubePaint}
              capGeo={geos.capGeo}
              breechGeo={geos.breechGeo}
            />
          ))}
        </group>
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  S400Launcher: { C: S400Launcher as React.FC, size: 13.5, center: [0, 3.6, 0] },
};
