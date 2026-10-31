import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, mix } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { rbox, extrude, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Explosion, softDot } from '@skill/military/3d/fx';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';

// ---------- Texture tia nắng bình minh biên mờ Gaussian (không nắp tròn, không viền cứng) ----------
let cachedSunBeamTex: THREE.CanvasTexture | null = null;
function getGoldenBeamTexture(): THREE.CanvasTexture {
  if (cachedSunBeamTex) return cachedSunBeamTex;
  const W = 128;
  const H = 256;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    const fadeTop = Math.pow(Math.min(1, v / 0.34), 1.8);
    const fadeBot = Math.pow(Math.min(1, (1 - v) / 0.34), 1.8);
    const av = fadeTop * fadeBot;
    for (let x = 0; x < W; x++) {
      const u = x / (W - 1);
      const au = Math.pow(Math.sin(Math.PI * u), 2.5);
      const a = Math.round(255 * Math.max(0, Math.min(1, au * av)));
      const idx = (y * W + x) * 4;
      img.data[idx] = 255;
      img.data[idx + 1] = 255;
      img.data[idx + 2] = 255;
      img.data[idx + 3] = a;
    }
  }
  ctx.putImageData(img, 0, 0);
  cachedSunBeamTex = new THREE.CanvasTexture(cv);
  cachedSunBeamTex.colorSpace = THREE.SRGBColorSpace;
  return cachedSunBeamTex;
}

function buildSoftRayGeo(wTop: number, wBot: number, height: number, faceYaw = 0.68): THREE.BufferGeometry {
  const y0 = -height * 0.5;
  const y1 = height * 0.5;
  const c = Math.cos(faceYaw);
  const s = Math.sin(faceYaw);
  const pos = [
    -wTop * 0.5 * c, y1, -wTop * 0.5 * s,
    wTop * 0.5 * c, y1, wTop * 0.5 * s,
    -wBot * 0.5 * c, y0, -wBot * 0.5 * s,
    wBot * 0.5 * c, y0, wBot * 0.5 * s,
  ];
  const uvs = [0, 1, 1, 1, 0, 0, 1, 0];
  const idx = [0, 2, 1, 1, 2, 3];
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---------- Địa hình thung lũng làng mạc miền đông Trung Quốc (Chiết Giang / Giang Tây, rộng 1000 m không lộ viền) ----------
const valleyHeight = heightField({
  seed: 408,
  amp: 5.5,
  scale: 95,
  flats: [
    [12, -4, 18, 1.2],
    [54, 5, 22, 1.8],
    [98, -5, 22, 2.4],
  ],
  add: (x, z) => {
    const centerZ = Math.sin(x / 52) * 7.0;
    const dz = Math.abs(z - centerZ);
    const sideSlope = dz < 23 ? 0 : Math.min(86, ((dz - 23) / 38) ** 1.55 * 35);
    const farRidge = x > 165 ? Math.min(92, ((x - 165) / 60) ** 1.45 * 46) : 0;
    const backSlope = x < -50 ? Math.min(48, ((-50 - x) / 48) ** 1.4 * 24) : 0;
    return sideSlope + farRidge + backSlope;
  },
});

const avoidVillageFloor = (x: number, z: number) => {
  const cz = Math.sin(x / 52) * 7.0;
  return x > -24 && x < 135 && Math.abs(z - cz) < 26;
};

// ---------- Sprite khói / mây mềm ----------
const CloudPuff: React.FC<{
  pos: V3;
  size: number;
  color: string;
  opacity: number;
  rot?: number;
  stretchX?: number;
}> = ({ pos, size, color, opacity, rot = 0, stretchX = 1.3 }) => {
  const mat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
      }),
    [],
  );
  if (opacity <= 0.003) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size * stretchX, size * 0.85, size]} />;
};

// ---------- Ngôi nhà gỗ mái ngói xám đầu hồi cong truyền thống làng mạc Trung Hoa đang cháy âm ỉ ----------
type HouseSpec = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  ry: number;
  ruined: boolean;
  smokeIntensity: number;
};

const VILLAGE_HOUSES: HouseSpec[] = [
  { x: 3, z: -9, w: 7.6, d: 5.6, h: 3.4, ry: 0.16, ruined: true, smokeIntensity: 1.0 },
  { x: 12, z: 3, w: 8.8, d: 6.0, h: 3.7, ry: -0.2, ruined: true, smokeIntensity: 1.15 },
  { x: 20, z: -12, w: 6.8, d: 5.0, h: 3.2, ry: 0.32, ruined: false, smokeIntensity: 0.45 },
  { x: 28, z: 8, w: 7.4, d: 5.4, h: 3.4, ry: 0.1, ruined: true, smokeIntensity: 0.9 },
  { x: 40, z: -3, w: 9.4, d: 6.4, h: 3.8, ry: -0.16, ruined: true, smokeIntensity: 1.2 },
  { x: 49, z: 12, w: 7.0, d: 5.2, h: 3.3, ry: 0.26, ruined: false, smokeIntensity: 0.5 },
  { x: 57, z: -12, w: 8.0, d: 5.6, h: 3.5, ry: -0.14, ruined: true, smokeIntensity: 1.05 },
  { x: 66, z: 3, w: 8.6, d: 6.0, h: 3.6, ry: 0.22, ruined: true, smokeIntensity: 1.1 },
  { x: 76, z: 14, w: 6.8, d: 5.0, h: 3.2, ry: -0.3, ruined: false, smokeIntensity: 0.4 },
  { x: 85, z: -7, w: 9.0, d: 6.2, h: 3.7, ry: 0.12, ruined: true, smokeIntensity: 1.0 },
  { x: 96, z: 5, w: 7.8, d: 5.5, h: 3.4, ry: -0.18, ruined: true, smokeIntensity: 0.95 },
  { x: 107, z: -11, w: 8.2, d: 5.8, h: 3.5, ry: 0.24, ruined: false, smokeIntensity: 0.5 },
  { x: 118, z: 2, w: 9.2, d: 6.2, h: 3.7, ry: -0.1, ruined: true, smokeIntensity: 1.05 },
];

const SmolderingVillage: React.FC<{ t: number }> = ({ t }) => {
  const mats = useMemo(
    () => ({
      // Tường vôi trắng ngà Giang Nam bị ám khói đen rõ nét kiến trúc làng mạc Trung Hoa
      plasterWall: paint({
        color: '#b2a898',
        camo: ['#786f64', '#cac1b2'],
        wear: 0.3,
        dirt: 0.55,
        roughness: 0.9,
        metalness: 0.03,
        repeat: 0.55,
        seed: 81,
      }),
      charredWood: paint({
        color: '#2c221d',
        camo: ['#1b1512', '#42342c'],
        wear: 0.22,
        dirt: 0.45,
        roughness: 0.92,
        metalness: 0.04,
        repeat: 0.7,
        seed: 82,
      }),
      greyTile: paint({
        color: '#464c54',
        camo: ['#32373d', '#5a616b'],
        wear: 0.26,
        dirt: 0.36,
        roughness: 0.82,
        metalness: 0.1,
        repeat: 0.75,
        seed: 83,
      }),
      stoneBase: plain('#58544e', 0.9, 0.04),
      streamWater: plain('#47525c', 0.22, 0.35),
      emberCore: new THREE.MeshBasicMaterial({ color: '#ff701f', toneMapped: false }),
      emberHot: new THREE.MeshBasicMaterial({ color: '#ffd166', toneMapped: false }),
    }),
    [],
  );

  // Biên dạng mái ngói âm dương dốc võng cong hai mái hiên kiểu Trung Hoa cổ truyền
  const fullRoofGeo = useMemo(() => {
    const pts: P2[] = [
      [-0.58, -0.02],
      [-0.64, 0.05],
      [-0.44, 0.13],
      [-0.22, 0.28],
      [0, 0.48],
      [0.22, 0.28],
      [0.44, 0.13],
      [0.64, 0.05],
      [0.58, -0.02],
    ];
    return extrude(pts, 1.0, 0.015);
  }, []);

  // Phần mái ngói còn sót lại (~58% chiều dài) trên những căn nhà bị cháy sập nửa mái
  const halfRoofGeo = useMemo(() => {
    const pts: P2[] = [
      [-0.58, -0.02],
      [-0.64, 0.05],
      [-0.44, 0.13],
      [-0.22, 0.28],
      [0, 0.47],
      [0.22, 0.28],
      [0.44, 0.13],
      [0.64, 0.05],
      [0.58, -0.02],
    ];
    return extrude(pts, 0.56, 0.015);
  }, []);

  return (
    <group>
      {/* Con suối nhỏ dưới đáy thung lũng phản chiếu ánh lửa và sương sớm */}
      {Array.from({ length: 12 }, (_, i) => {
        const sx = -10 + i * 12;
        const sz = Math.sin(sx / 52) * 7.0 - 2.2;
        return (
          <mesh
            key={`stream-${i}`}
            position={[sx, valleyHeight(sx, sz) + 0.06, sz]}
            rotation={[0, -Math.cos(sx / 52) * 0.13, 0]}
            geometry={rbox(13.5, 0.08, 3.4, 0.03)}
            material={mats.streamWater}
            receiveShadow
          />
        );
      })}

      {VILLAGE_HOUSES.map((h, idx) => {
        const y0 = valleyHeight(h.x, h.z);
        const flicker = 0.78 + 0.22 * Math.sin(t * 5.6 + idx * 2.1);
        return (
          <group key={idx} position={[h.x, y0, h.z]} rotation={[0, h.ry, 0]}>
            {/* Bệ móng đá & thân tường vôi trắng ám khói có cột gỗ bốn góc */}
            <mesh position={[0, 0.24, 0]} geometry={rbox(h.w + 0.45, 0.48, h.d + 0.45, 0.05)} material={mats.stoneBase} receiveShadow />
            <mesh
              position={[0, h.h * 0.5 + 0.22, 0]}
              geometry={rbox(h.w, h.h, h.d, 0.05)}
              material={mats.plasterWall}
              castShadow
              receiveShadow
            />
            {/* Khung cửa gỗ & cột hiên truyền thống */}
            <mesh position={[0, 1.35, -h.d * 0.5 - 0.03]} geometry={rbox(1.35, 2.1, 0.08, 0.02)} material={mats.charredWood} />
            {([-1, 1] as const).map((sx) => (
              <mesh
                key={`win-${sx}`}
                position={[sx * h.w * 0.28, 1.75, -h.d * 0.5 - 0.03]}
                geometry={rbox(1.1, 1.05, 0.08, 0.02)}
                material={h.ruined && sx === 1 ? mats.emberCore : mats.charredWood}
              />
            ))}

            {/* Tường đầu hồi bậc thang (Mã đầu tường - Horse-head gable wall đặc trưng Huệ Châu / Chiết Giang) */}
            {([-1, 1] as const).map((s) => (
              <group key={`gable-${s}`} position={[s * (h.w * 0.5 + 0.08), 0, 0]}>
                <mesh position={[0, h.h * 0.58 + 0.3, 0]} geometry={rbox(0.24, h.h + 0.7, h.d + 0.28, 0.03)} material={mats.plasterWall} castShadow />
                <mesh position={[0, h.h + 0.95, 0]} geometry={rbox(0.26, 0.75, h.d * 0.58, 0.03)} material={mats.plasterWall} castShadow />
                <mesh position={[0, h.h + 1.36, 0]} geometry={rbox(0.32, 0.14, h.d * 0.62, 0.03)} material={mats.greyTile} />
              </group>
            ))}

            {!h.ruined ? (
              /* Mái ngói âm dương nguyên vẹn có đòn nóc uốn cong hai đầu */
              <group>
                <group position={[0, h.h + 0.2, 0]} scale={[h.d + 0.8, h.h * 0.92, h.w + 0.3]} rotation={[0, Math.PI / 2, 0]}>
                  <mesh geometry={fullRoofGeo} material={mats.greyTile} castShadow receiveShadow />
                </group>
                <mesh position={[0, h.h + 1.82, 0]} geometry={rbox(h.w + 0.55, 0.22, 0.24, 0.04)} material={mats.greyTile} castShadow />
              </group>
            ) : (
              /* Mái ngói âm dương bị cháy sập một nửa, nửa còn lại giữ rõ dáng mái cong Trung Hoa + hố lửa than hồng rực sáng */
              <group>
                <group
                  position={[-h.w * 0.21, h.h + 0.2, 0]}
                  scale={[h.d + 0.75, h.h * 0.9, h.w + 0.1]}
                  rotation={[0, Math.PI / 2, 0]}
                >
                  <mesh geometry={halfRoofGeo} material={mats.greyTile} castShadow receiveShadow />
                </group>
                <mesh
                  position={[-h.w * 0.21, h.h + 1.78, 0]}
                  geometry={rbox(h.w * 0.56, 0.2, 0.22, 0.04)}
                  material={mats.greyTile}
                />
                {/* Xà gồ cháy đen bên phần mái sập */}
                {[0.06, 0.22, 0.38].map((u, ri) => (
                  <mesh
                    key={ri}
                    position={[u * h.w, h.h + 0.55, 0]}
                    rotation={[0.28 * (ri % 2 === 0 ? 1 : -1), 0, -0.22]}
                    geometry={rbox(0.16, 0.18, h.d * 0.96, 0.02)}
                    material={mats.charredWood}
                    castShadow
                  />
                ))}
                {/* Ổ than hồng & lưỡi lửa âm ỉ phát sáng bên dưới mái sập */}
                <mesh position={[h.w * 0.2, h.h * 0.82, 0.05]} geometry={rbox(h.w * 0.42, 0.36, h.d * 0.54, 0.08)} material={mats.emberCore} />
                <mesh
                  position={[h.w * 0.22, h.h * 1.02, -0.06]}
                  scale={[1, flicker, 1]}
                  geometry={rbox(h.w * 0.24, 0.34, h.d * 0.28, 0.06)}
                  material={mats.emberHot}
                />
              </group>
            )}
          </group>
        );
      })}

      {/* Tường đá sân phơi lúa & cổng làng */}
      {[16, 46, 78, 104].map((wx, i) => (
        <mesh
          key={`wall-${i}`}
          position={[wx, valleyHeight(wx, -1.5) + 0.48, -1.5 + (i % 2) * 4]}
          rotation={[0, 0.25 * (i % 2 === 0 ? 1 : -1), 0]}
          geometry={rbox(14, 0.95, 0.45, 0.06)}
          material={mats.stoneBase}
          castShadow
        />
      ))}

      {/* Đèn than lửa cam ấm chiếu rõ mái ngói & cột khói trong sương sớm */}
      <pointLight position={[12, 7.0, 1]} color="#ff6e22" intensity={54} distance={45} decay={1.5} />
      <pointLight position={[42, 7.5, -2]} color="#ff7729" intensity={58} distance={48} decay={1.5} />
      <pointLight position={[66, 7.5, 3]} color="#ff6c20" intensity={50} distance={45} decay={1.5} />
      <pointLight position={[95, 7.5, 2]} color="#ff7226" intensity={48} distance={45} decay={1.5} />

      {/* Các cột khói đen-cam trải dài trong sương sớm */}
      {VILLAGE_HOUSES.filter((h) => h.smokeIntensity > 0.6).map((h, pIdx) => {
        const yBase = valleyHeight(h.x, h.z) + h.h + 0.8;
        return (
          <group key={`plume-${pIdx}`}>
            {Array.from({ length: 10 }, (_, k) => {
              const cycle = (((t * 0.3 + k * 0.1 + pIdx * 0.27) % 1) + 1) % 1;
              const rise = cycle * 34 * h.smokeIntensity;
              const driftX = cycle * cycle * 15 + Math.sin(cycle * 5 + pIdx) * 1.3;
              const driftZ = cycle * 5.2 + Math.cos(cycle * 4 + pIdx) * 1.1;
              const size = (2.5 + cycle * 9.0) * h.smokeIntensity;
              const col =
                cycle < 0.18
                  ? mix('#eb6a28', '#3a312d', cycle / 0.18)
                  : mix('#2f2a28', '#635b57', (cycle - 0.18) / 0.82);
              const op = Math.sin(Math.min(1, cycle * 4.5) * (Math.PI * 0.5)) * (1 - cycle) * 0.68;
              return (
                <CloudPuff
                  key={k}
                  pos={[h.x + h.w * 0.15 + driftX, yBase + rise, h.z + driftZ]}
                  size={size}
                  color={col}
                  opacity={op}
                  rot={k * 0.9 + cycle * 1.4}
                  stretchX={1.15}
                />
              );
            })}
          </group>
        );
      })}

      {/* Sương sớm bảng lảng dọc thung lũng */}
      {Array.from({ length: 14 }, (_, i) => {
        const mx = -8 + i * 9.5;
        const mz = -12 + ((i * 11) % 26);
        return (
          <CloudPuff
            key={`vmist-${i}`}
            pos={[mx, valleyHeight(mx, mz) + 2.8, mz]}
            size={15 + (i % 3) * 4}
            color="#857a74"
            opacity={0.17}
            rot={i * 0.5}
            stretchX={1.65}
          />
        );
      })}
    </group>
  );
};

// ---------- Đội hình chữ V 4 biên đội bậc thang (4 × 4 = ĐÚNG 16 CHIẾC B-25B MITCHELL) tách biệt rõ nét trên bầu trời ----------
// BẮT BUỘC truyền cùng seed={18} và navLights={false} cho cả 16 chiếc để tái sử dụng 100% cache paint() và render cực nhanh!
const B25_FORMATION_OFFSETS: V3[] = [
  // Biên đội 1 — Mũi nhọn dẫn đầu (Doolittle #1..#4)
  [0, 0, 0],
  [-15, 2.2, -19],
  [-15, 2.2, 19],
  [-30, 4.4, -38],
  // Biên đội 2 — Cánh phải mở rộng (#5..#8)
  [-30, 4.4, 38],
  [-45, 6.8, -57],
  [-45, 6.8, 57],
  [-24, 9.5, -2],
  // Biên đội 3 — Tầng trung cao (#9..#12)
  [-39, 12.0, -22],
  [-39, 12.0, 20],
  [-54, 14.5, -42],
  [-54, 14.5, 40],
  // Biên đội 4 — Tầng thượng hậu vệ (#13..#16 -> Tổng cộng 16 chiếc rõ ràng không chồng lấp!)
  [-50, 18.2, -7],
  [-50, 18.2, 11],
  [-66, 20.8, -26],
  [-66, 20.8, 28],
];

// ---------- Mô hình 3D Huân chương Danh dự (US Army / USAAF 1942 Medal of Honor) ----------
const WHITE_STAR_13_POS: [number, number][] = [
  [-0.068, 0.072],
  [0, 0.072],
  [0.068, 0.072],
  [-0.035, 0.036],
  [0.035, 0.036],
  [-0.068, 0.0],
  [0, 0.0],
  [0.068, 0.0],
  [-0.035, -0.036],
  [0.035, -0.036],
  [-0.068, -0.072],
  [0, -0.072],
  [0.068, -0.072],
];

function makeStar2DPts(rOuter: number, rInner: number, baseAngle: number): P2[] {
  const pts: P2[] = [];
  for (let i = 0; i < 10; i++) {
    const a = baseAngle + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

const MedalOfHonor3D: React.FC = () => {
  const mats = useMemo(
    () => ({
      goldBright: plain('#f8ce5c', 0.16, 0.91),
      goldRich: plain('#e2ac34', 0.21, 0.88),
      goldAntique: plain('#b6811b', 0.34, 0.82),
      laurelGreen: plain('#1d7d42', 0.23, 0.34),
      laurelLight: plain('#2c9e57', 0.21, 0.3),
      silkBlue: paint({
        color: '#67b2e6',
        camo: ['#5da5d9', '#77bff0'],
        camoScale: 4,
        wear: 0.04,
        dirt: 0.04,
        roughness: 0.44,
        metalness: 0.07,
        repeat: 3.5,
        seed: 1942,
      }),
      silkBlueEdge: plain('#4e94c7', 0.48, 0.07),
      starWhite: plain('#f9fcff', 0.28, 0.1),
    }),
    [],
  );

  const geos = useMemo(() => {
    const invertedStarBase = extrude(makeStar2DPts(0.245, 0.106, -Math.PI / 2), 0.022, 0.006);
    const invertedStarCore = extrude(makeStar2DPts(0.21, 0.088, -Math.PI / 2), 0.032, 0.008);

    const armRayPts: P2[] = [
      [-0.024, 0.075],
      [0, 0.195],
      [0.024, 0.075],
      [0, 0.095],
    ];
    const armRay = extrude(armRayPts, 0.038, 0.004);

    const leafPts: P2[] = [
      [0, -0.026],
      [0.015, -0.008],
      [0.012, 0.014],
      [0, 0.03],
      [-0.012, 0.014],
      [-0.015, -0.008],
    ];
    const laurelLeaf = extrude(leafPts, 0.018, 0.003);

    const padPts: P2[] = [
      [-0.128, -0.118],
      [0.128, -0.118],
      [0.146, -0.082],
      [0.146, 0.102],
      [0.122, 0.128],
      [-0.122, 0.128],
      [-0.146, 0.102],
      [-0.146, -0.082],
    ];
    const silkPad = extrude(padPts, 0.022, 0.005);

    // Dải lụa đeo cổ chữ V gọn gàng vừa khít trong khung hình kèm thanh cài vàng trên đỉnh pad
    const neckStrapR = extrude(
      [
        [0.025, 0.118],
        [0.125, 0.118],
        [0.205, 0.29],
        [0.115, 0.305],
      ],
      0.014,
      0.003,
    );
    const neckStrapL = extrude(
      [
        [-0.125, 0.118],
        [-0.025, 0.118],
        [-0.115, 0.305],
        [-0.205, 0.29],
      ],
      0.014,
      0.003,
    );

    const smallWhiteStar = extrude(makeStar2DPts(0.019, 0.008, Math.PI / 2), 0.009, 0.0015);

    const eagleWingR = extrude(
      [
        [0.01, -0.01],
        [0.085, 0.022],
        [0.072, -0.008],
        [0.048, -0.022],
        [0.01, -0.022],
      ],
      0.016,
      0.003,
    );

    return {
      invertedStarBase,
      invertedStarCore,
      armRay,
      laurelLeaf,
      silkPad,
      neckStrapR,
      neckStrapL,
      smallWhiteStar,
      eagleWingR,
    };
  }, []);

  return (
    <group>
      {/* A. Ngôi sao vàng 5 cánh đảo ngược & vòng nguyệt quế xanh đúc nổi */}
      <group position={[0, -0.14, 0]}>
        <mesh geometry={geos.invertedStarBase} material={mats.goldRich} />
        <mesh geometry={geos.invertedStarCore} material={mats.goldBright} />

        {Array.from({ length: 5 }, (_, k) => {
          const ang = -Math.PI / 2 + (k * Math.PI * 2) / 5;
          const tipX = Math.cos(ang) * 0.252;
          const tipY = Math.sin(ang) * 0.252;
          const perp = ang + Math.PI / 2;
          return (
            <React.Fragment key={`arm-${k}`}>
              <mesh rotation={[0, 0, ang - Math.PI / 2]} geometry={geos.armRay} material={mats.goldBright} />
              {[
                [tipX + Math.cos(ang) * 0.013, tipY + Math.sin(ang) * 0.013],
                [tipX + Math.cos(perp) * 0.014, tipY + Math.sin(perp) * 0.014],
                [tipX - Math.cos(perp) * 0.014, tipY - Math.sin(perp) * 0.014],
              ].map(([bx, by], bi) => (
                <mesh key={bi} position={[bx, by, 0]} material={mats.goldBright}>
                  <sphereGeometry args={[0.013, 12, 10]} />
                </mesh>
              ))}
            </React.Fragment>
          );
        })}

        {/* Vòng nguyệt quế xanh ngọc lục bảo */}
        <mesh position={[0, 0, 0.004]} material={mats.laurelGreen}>
          <torusGeometry args={[0.152, 0.016, 12, 48]} />
        </mesh>
        {Array.from({ length: 20 }, (_, k) => {
          const a = (k / 20) * Math.PI * 2;
          const r = 0.152 + (k % 2 === 0 ? 0.008 : -0.006);
          return (
            <mesh
              key={`leaf-${k}`}
              position={[Math.cos(a) * r, Math.sin(a) * r, 0.012]}
              rotation={[0, 0, a + (k % 2 === 0 ? 0.35 : -0.35)]}
              geometry={geos.laurelLeaf}
              material={k % 2 === 0 ? mats.laurelLight : mats.laurelGreen}
            />
          );
        })}

        {/* Huy hiệu Minerva trung tâm */}
        <mesh position={[0, 0, 0.014]} rotation={[Math.PI / 2, 0, 0]} material={mats.goldRich}>
          <cylinderGeometry args={[0.088, 0.092, 0.024, 36]} />
        </mesh>
        <mesh position={[0, 0, 0.022]} rotation={[Math.PI / 2, 0, 0]} material={mats.goldAntique}>
          <cylinderGeometry args={[0.072, 0.072, 0.014, 32]} />
        </mesh>
        {Array.from({ length: 24 }, (_, k) => {
          const a = (k / 24) * Math.PI * 2;
          return (
            <mesh key={`bead-${k}`} position={[Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0.027]} material={mats.goldBright}>
              <sphereGeometry args={[0.0055, 8, 8]} />
            </mesh>
          );
        })}
        <mesh position={[-0.004, 0.008, 0.031]} scale={[0.85, 1.05, 0.5]} material={mats.goldBright}>
          <sphereGeometry args={[0.032, 16, 14]} />
        </mesh>
        <mesh position={[0.006, 0.032, 0.031]} rotation={[0, 0, -0.35]} geometry={rbox(0.052, 0.018, 0.016, 0.006)} material={mats.goldBright} />
        <mesh position={[-0.002, -0.032, 0.03]} geometry={rbox(0.048, 0.028, 0.014, 0.006)} material={mats.goldRich} />
      </group>

      {/* B. Khoen treo, thanh vàng "VALOR" & Đại bàng tung cánh */}
      {([-0.145, 0.145] as const).map((xr, idx) => (
        <mesh key={`ring-${idx}`} position={[xr, 0.092, 0]} rotation={[0, 0.35, 0]} material={mats.goldBright}>
          <torusGeometry args={[0.02, 0.0055, 10, 20]} />
        </mesh>
      ))}
      <group position={[0, 0.14, 0]}>
        <mesh geometry={rbox(0.27, 0.062, 0.024, 0.008)} material={mats.goldRich} />
        <mesh position={[0, 0, 0.004]} geometry={rbox(0.242, 0.042, 0.022, 0.005)} material={mats.goldAntique} />
        {[-0.08, -0.04, 0, 0.04, 0.08].map((xv, i) => (
          <mesh key={i} position={[xv, 0, 0.017]} geometry={rbox(0.02, 0.026, 0.008, 0.002)} material={mats.goldBright} />
        ))}
      </group>
      <group position={[0, 0.2, 0.004]}>
        <mesh geometry={rbox(0.038, 0.056, 0.024, 0.01)} material={mats.goldBright} />
        <mesh position={[0, 0.036, 0.004]} material={mats.goldBright}>
          <sphereGeometry args={[0.016, 12, 10]} />
        </mesh>
        <mesh geometry={geos.eagleWingR} material={mats.goldBright} />
        <mesh scale={[-1, 1, 1]} geometry={geos.eagleWingR} material={mats.goldBright} />
        <mesh position={[0, 0.052, -0.002]} material={mats.goldRich}>
          <torusGeometry args={[0.018, 0.005, 8, 18]} />
        </mesh>
      </group>

      {/* C. Dải ruy-băng lụa xanh dương nhạt điểm đúng 13 ngôi sao trắng */}
      <group position={[0, 0.375, -0.004]}>
        <mesh position={[0, 0, -0.006]} geometry={geos.neckStrapR} material={mats.silkBlueEdge} />
        <mesh position={[0, 0, -0.006]} geometry={geos.neckStrapL} material={mats.silkBlueEdge} />
        <mesh position={[0, 0, -0.002]} scale={[1.04, 1.03, 0.9]} geometry={geos.silkPad} material={mats.silkBlueEdge} />
        <mesh geometry={geos.silkPad} material={mats.silkBlue} />
        <mesh position={[0, 0.13, 0.005]} geometry={rbox(0.26, 0.024, 0.026, 0.006)} material={mats.goldRich} />

        {WHITE_STAR_13_POS.map(([sx, sy], idx) => (
          <mesh key={`ws-${idx}`} position={[sx, sy, 0.012]} geometry={geos.smallWhiteStar} material={mats.starWhite} />
        ))}
      </group>
    </group>
  );
};

// ---------- Cảnh chính C04S08 (748.90–777.84 s) ----------
const C04S08: React.FC = () => {
  const t = useT();

  // Tiến độ nâng cần cẩu tại "Yet strategically" (759.22 s -> hoàn tất mở bầu trời ở 761.0 s)
  const craneP = prog(t, 759.05, 761.1);
  const skyP = prog(t, 758.7, 761.5);
  const flySweep = prog(t, 761.1, 773.6);
  const medalEnter = prog(t, 773.55, 775.4);

  const formX = 48 + (t - 760.0) * 15.5;
  const formY = 158.0;

  // Nửa đầu (748.90–759.00 s): bay lướt sườn đồi nhìn xuống thung lũng làng mạc Trung Hoa âm ỉ khói
  const valleyGlide = prog(t, 748.7, 759.2);
  const valleyCamPos: V3 = [lerp(-22, 34, valleyGlide), lerp(24.0, 20.5, valleyGlide), lerp(-33, -25, valleyGlide)];
  const valleyCamLook: V3 = [lerp(28, 84, valleyGlide), lerp(4.2, 5.8, valleyGlide), lerp(2, 4, valleyGlide)];

  // Nửa sau (759.22–777.84 s): ngước góc 3/4 từ dưới biển mây vàng lên toàn bộ 16 chiếc B-25;
  // Khi Huân chương Danh dự nâng lên ở góc dưới-trái (773.55–777.84 s), nâng đội hình B-25 sang nửa trên-phải bầu trời để không bị che!
  const skyCamPos: V3 = [
    formX + lerp(36, 23, flySweep),
    formY + lerp(-21.0, -16.5, flySweep),
    lerp(42, 30, flySweep),
  ];
  const skyCamLook: V3 = [
    formX + lerp(-26, -20, flySweep) + medalEnter * 4.5,
    formY + lerp(7.5, 8.5, flySweep) - medalEnter * 9.5,
    lerp(-2.5, -1.5, flySweep) + medalEnter * 8.5,
  ];

  const camPos: V3 = [
    lerp(valleyCamPos[0], skyCamPos[0], craneP),
    lerp(valleyCamPos[1], skyCamPos[1], craneP),
    lerp(valleyCamPos[2], skyCamPos[2], craneP),
  ];
  const camLook: V3 = [
    lerp(valleyCamLook[0], skyCamLook[0], craneP),
    lerp(valleyCamLook[1], skyCamLook[1], craneP),
    lerp(valleyCamLook[2], skyCamLook[2], craneP),
  ];

  // Bầu trời bình minh vàng ấm rực rỡ (không bị ám tím, đúng chuẩn sunColor: '#ffd89b', sunIntensity: 2.65)
  const skyTop = mix('#28303d', '#2d5c88', skyP);
  const skyHor = mix('#685c58', '#f0b25d', skyP);
  const skyBot = mix('#9e7459', '#ffe8b8', skyP);
  const sunCol = mix('#e6a87c', '#ffd89b', skyP);
  const sunInt = lerp(1.75, 2.65, skyP);
  const sunDir: V3 = [lerp(72, -70, skyP), lerp(22, 24, skyP), lerp(28, -46, skyP)];
  const fogNear = lerp(65, 175, skyP);
  const fogFar = lerp(340, 820, skyP);
  const fogCol = mix('#665b57', '#e5b276', skyP);

  // Neo tấm Huân chương Danh dự 3D ở tiền cảnh dưới cánh đội hình B-25, nằm trọn vẹn trong khung hình không chạm chữ <Label>
  const medalTransform = useMemo(() => {
    const f = new THREE.Vector3(camLook[0] - camPos[0], camLook[1] - camPos[1], camLook[2] - camPos[2]).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    const r = new THREE.Vector3().crossVectors(f, worldUp).normalize();
    const u = new THREE.Vector3().crossVectors(r, f).normalize();

    const dist = 3.5;
    const xOff = -0.88;
    const yOff = lerp(-1.45, -0.36, medalEnter);

    const pos = new THREE.Vector3(...camPos)
      .addScaledVector(f, dist)
      .addScaledVector(r, xOff)
      .addScaledVector(u, yOff);

    const basis = new THREE.Matrix4().makeBasis(r, u, f.clone().negate());
    const spinY = new THREE.Matrix4().makeRotationY(lerp(-0.45, 0.16, medalEnter) + Math.sin(t * 0.9) * 0.045);
    const tiltX = new THREE.Matrix4().makeRotationX(-0.04);
    basis.multiply(spinY).multiply(tiltX);
    const euler = new THREE.Euler().setFromRotationMatrix(basis);

    const keyLightPos = pos
      .clone()
      .addScaledVector(f, -1.7)
      .addScaledVector(r, 0.95)
      .addScaledVector(u, 0.7);
    const rimLightPos = pos
      .clone()
      .addScaledVector(f, -1.35)
      .addScaledVector(r, -0.95)
      .addScaledVector(u, -0.25);

    return {
      pos: [pos.x, pos.y, pos.z] as V3,
      rot: [euler.x, euler.y, euler.z] as V3,
      keyLight: [keyLightPos.x, keyLightPos.y, keyLightPos.z] as V3,
      rimLight: [rimLightPos.x, rimLightPos.y, rimLightPos.z] as V3,
    };
  }, [camPos[0], camPos[1], camPos[2], camLook[0], camLook[1], camLook[2], medalEnter, t]);

  const softRayGeo = useMemo(() => buildSoftRayGeo(18, 42, 145), []);

  const shadowCenter: V3 = craneP < 0.5 ? [48, 4, 0] : [formX - 24, formY + 6, 0];
  const shadowArea = craneP < 0.5 ? 65 : 82;

  return (
    <>
      <Stage
        sky={[skyTop, skyHor, skyBot]}
        sun={sunDir}
        sunColor={sunCol}
        sunIntensity={sunInt}
        shadowArea={shadowArea}
        shadowCenter={shadowCenter}
        fog={[fogNear, fogFar]}
        fogColor={fogCol}
        env={lerp(0.35, 0.46, skyP)}
        ambient={lerp(0.34, 0.34, skyP)}
        exposure={1.07}
        post={{ bloom: lerp(0.62, 0.72, skyP), bloomThreshold: 0.78, ao: 2.0, aoRadius: 2.4, vignette: 0.42 }}
      >
        <Cam pos={camPos} look={camLook} fov={39} />

        {/* Đèn bình minh chiếu sáng rõ sườn núi/mái ngói ở nửa đầu & mũi cả 16 chiếc B-25 ở nửa sau */}
        <directionalLight
          position={craneP < 0.5 ? [-35, 42, -55] : [formX + 85, formY + 26, 72]}
          color={craneP < 0.5 ? '#c8b8ad' : '#ffe4b3'}
          intensity={lerp(0.65, 1.4, skyP)}
        />

        {/* ==================== 1. THUNG LŨNG LÀNG MẠC TRUNG HOA ÂM Ỉ KHÓI LỬA ==================== */}
        {craneP < 0.92 && (
          <group>
            <Terrain h={valleyHeight} size={960} seg={184} center={[55, 0]} colors={TERRAIN_PALETTE.chinaMountains} />
            <Scatter
              kind="pine"
              count={150}
              area={[-85, -165, 220, 165]}
              h={valleyHeight}
              seed={4081}
              scale={[0.85, 1.55]}
              avoid={avoidVillageFloor}
              tint="#7e8a7b"
            />
            <Scatter
              kind="broadleaf"
              count={85}
              area={[-65, -135, 195, 135]}
              h={valleyHeight}
              seed={4082}
              scale={[0.75, 1.35]}
              avoid={avoidVillageFloor}
              tint="#898c75"
            />
            <Scatter
              kind="rock"
              count={65}
              area={[-45, -95, 175, 95]}
              h={valleyHeight}
              seed={4083}
              scale={[0.7, 1.4]}
              avoid={avoidVillageFloor}
            />
            <SmolderingVillage t={t} />

            <Explosion t={t} at={746.4} pos={[36, valleyHeight(36, -4), -4]} size={3.2} seed={11} smokeLife={13} smoke="#3b3533" />
            <Explosion
              t={t}
              at={CUE.c04_s08_japan_reprisal}
              pos={[79, valleyHeight(79, 8), 8]}
              size={3.6}
              seed={19}
              smokeLife={11}
              smoke="#36302e"
            />
          </group>
        )}

        {/* ==================== 2. BIỂN MÂY SÁNG BÌNH MINH & ĐỘI HÌNH 16 CHIẾC B-25 MITCHELL ==================== */}
        {t >= 758.2 && (
          <group>
            {/* Biển mây bồng bềnh ánh vàng ấm ở y ~ 105..126 m che kín chân trời khi máy quay nâng lên */}
            {Array.from({ length: 48 }, (_, i) => {
              const cx = formX - 165 + ((i * 23) % 270);
              const cz = -155 + ((i * 37) % 290);
              const cy = 104 + (i % 6) * 3.8;
              const cCol = i % 3 === 0 ? '#ffebbf' : i % 3 === 1 ? '#f7ce94' : '#e3b278';
              return (
                <CloudPuff
                  key={`skycloud-${i}`}
                  pos={[cx, cy, cz]}
                  size={38 + (i % 4) * 12}
                  color={mix('#756b68', cCol, skyP)}
                  opacity={0.38 * Math.min(1, skyP * 1.35)}
                  rot={i * 0.7}
                  stretchX={1.75}
                />
              );
            })}

            {/* Toàn bộ 16 chiếc B-25B Mitchell cải hoán (seed={18} đồng nhất, tháo tháp bụng, gắn cán chổi đuôi) */}
            {B25_FORMATION_OFFSETS.map(([ox, oy, oz], idx) => {
              const bobY = Math.sin(t * 1.15 + idx * 0.85) * 0.32;
              const bankRoll = Math.sin(t * 0.92 + idx * 1.1) * 0.022;
              return (
                <group
                  key={`b25-${idx}`}
                  position={[formX + ox, formY + oy + bobY, oz]}
                  rotation={[bankRoll, 0, 0.032]}
                >
                  <B25Mitchell
                    seed={18}
                    lowerTurret={false}
                    broomsticks={true}
                    propFast={true}
                    propSpin={t * 28 + idx * 0.4}
                    gear={0}
                    bombBay={0}
                    navLights={false}
                  />
                </group>
              );
            })}

            {/* Luồng nắng vàng bình minh biên mờ Gaussian rọi xiên qua đội hình B-25 (không lộ nắp tròn!) */}
            {skyP > 0.2 &&
              (
                [
                  [-16, 4, -14],
                  [-42, 8, 10],
                  [-64, 12, -22],
                  [-28, 2, 26],
                ] as V3[]
              ).map(([rx, ry, rz], idx) => (
                <mesh
                  key={`sunray-${idx}`}
                  position={[formX + rx, formY + ry - 8, rz]}
                  rotation={[0.34, 0, 0.52]}
                  geometry={softRayGeo}
                >
                  <meshBasicMaterial
                    map={getGoldenBeamTexture()}
                    color="#ffe4ad"
                    transparent
                    opacity={0.14 * skyP}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                  />
                </mesh>
              ))}
          </group>
        )}

        {/* ==================== 3. TẤM HUÂN CHƯƠNG DANH DỰ 3D (MEDAL OF HONOR) Ở TIỀN CẢNH DƯỚI CÁNH B-25 ==================== */}
        {medalEnter > 0.005 && (
          <group>
            <pointLight position={medalTransform.keyLight} color="#ffe9b3" intensity={6.2 * medalEnter} distance={6.0} decay={1.4} />
            <pointLight position={medalTransform.rimLight} color="#d4e9ff" intensity={2.4 * medalEnter} distance={5.0} decay={1.5} />
            <group position={medalTransform.pos} rotation={medalTransform.rot} scale={1.08}>
              <MedalOfHonor3D />
            </group>
          </group>
        )}
      </Stage>

      <Label
        t={t}
        text="250,000 CIVILIANS"
        x={960}
        y={895}
        from={CUE.c04_s08_250k_civilians}
        until={758.6}
        size={50}
      />
      <Label
        t={t}
        text="MEDAL OF HONOR"
        x={1295}
        y={875}
        from={776.28}
        until={777.65}
        size={50}
      />
    </>
  );
};

export default C04S08;
