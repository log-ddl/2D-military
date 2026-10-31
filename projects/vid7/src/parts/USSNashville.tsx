// USS Nashville (CL-43) — Tuần dương hạm hạng nhẹ lớp Brooklyn hộ tống Lực lượng Đặc nhiệm 16 (18/04/1942)
// Quy ước hệ trục 1:1 mét thật: Dài 185.4 m (x: -92.7..+92.7), rộng mớn nước 18.8 m (z: -9.4..+9.4),
// mớn nước y = 0, đáy chìm chống hà y = -6.5 m, boong giữa ~7.2 m vươn cao lên 9.2 m ở mũi.
// Đặc trưng nhận diện: 5 tháp pháo chính 3 nòng 6-inch/47 (3 mũi, 2 lái = 15 nòng), 2 ống khói nghiêng,
// 2 cột tàu 3 chân (tripod masts) có máy đo xa, 8 pháo phụ 5-inch hai mạn, giàn phóng & cần cẩu thủy phi cơ đuôi.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT } from '../design/palette';

export type USSNashvilleProps = {
  /** Góc xoay 5 tháp pháo chính hướng về một mạn (rad, dương = xoay sang mạn trái -Z, âm = mạn phải +Z) */
  turretYaw?: number;
  /** Góc nâng 15 nòng pháo 6-inch/47 (rad) */
  gunElev?: number;
  /** Độ giật lùi nòng pháo 0..1 */
  recoil?: number;
};

const L = 185.4;
const HALF_L = L / 2; // 92.7 m
const HALF_BEAM = 9.4; // 18.8 m / 2
const DRAFT = -6.5;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth01 = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Độ cao mép boong tàu (sheer line) theo u = 0 (lái -92.7) -> 1 (mũi +92.7) */
function deckSheerY(u: number): number {
  // Đuôi 6.95 m -> giữa tàu ~7.22 m -> nâng dần kiểu flush/raised forecastle lên 9.22 m ở mũi
  const sternDip = 0.25 * Math.pow(clamp((0.28 - u) / 0.28, 0, 1), 1.6);
  const bowRise = 2.02 * Math.pow(clamp((u - 0.52) / 0.48, 0, 1), 1.72);
  return 7.2 - sternDip + bowRise;
}

/** Biên dạng mũi clipper raked stem (x theo độ cao y) */
function xStemAtY(y: number): number {
  if (y >= 0) {
    const t = clamp(y / 9.22, 0, 1);
    return lerp(89.8, HALF_L, Math.pow(t, 0.86));
  }
  // Phần chìm dưới nước lượn tròn forefoot về sống đáy
  const t = clamp(-y / 6.5, 0, 1);
  return lerp(89.8, 82.6, Math.pow(t, 1.85));
}

/** Biên dạng đuôi cruiser transom & cut-up chân vịt (x theo độ cao y) */
function xSternAtY(y: number): number {
  if (y >= 0.2) {
    return -HALF_L + (6.95 - clamp(y, 0.2, 7.2)) * 0.1;
  }
  const t = clamp((0.2 - y) / 6.7, 0, 1);
  return lerp(-91.98, -79.5, Math.pow(t, 1.45));
}

/** Nửa chiều rộng thân tàu z >= 0 tại vị trí dọc u (0..1) và độ cao y (-6.5..sheer) */
function hullHalfBeam(u: number, y: number): number {
  if (u >= 0.9995) return 0;

  // Hệ số mặt bằng mớn nước (planform tại y = 0)
  let wlPlan = 1.0;
  if (u > 0.56) {
    const tb = (u - 0.56) / 0.44;
    wlPlan = Math.pow(Math.max(0, 1 - Math.pow(tb, 1.68)), 0.86);
  } else if (u < 0.28) {
    const ts = (0.28 - u) / 0.28;
    wlPlan = 1 - 0.42 * Math.pow(ts, 1.65);
  }

  // Đai giáp hông tàu (armored belt dày 127mm) ôm sát theo đúng đường cong vỏ giữa tàu (không lồi khỏi mũi)
  const beltU = smooth01((u - 0.2) / 0.06) * (1 - smooth01((u - 0.72) / 0.07));
  const beltY = smooth01((y + 1.1) / 0.35) * (1 - smooth01((y - 3.35) / 0.35));
  const armorBelt = 0.16 * beltU * beltY;

  const sheer = deckSheerY(u);
  if (y >= 0) {
    const ty = clamp(y / Math.max(sheer, 0.1), 0, 1);
    const bowFactor = smooth01((u - 0.6) / 0.38);
    const flare = bowFactor * Math.sin(Math.pow(ty, 0.82) * Math.PI * 0.5) * 1.68 * (1 - Math.pow(u, 7));
    const midFactor = 1 - bowFactor;
    const tumble = midFactor * 0.15 * Math.pow(ty, 2.2);
    const baseZ = HALF_BEAM * wlPlan + flare - tumble + armorBelt;
    const tipFade = u > 0.96 ? Math.cos(((u - 0.96) / 0.04) * (Math.PI * 0.5)) : 1;
    return Math.max(0, baseZ * tipFade);
  }

  // Phần dưới mớn nước y < 0 (-6.5..0)
  const d = clamp(-y / 6.5, 0, 1);
  const bowPinch = smooth01((u - 0.62) / 0.38);
  const sternSkeg = smooth01((0.24 - u) / 0.24);
  const midFullness = 1 - 0.62 * bowPinch - 0.72 * sternSkeg;
  const bilgeExp = lerp(2.2, 4.6, clamp(midFullness, 0, 1));
  const section = Math.pow(Math.max(0, 1 - Math.pow(d, bilgeExp)), 0.52);
  const keelFloor = lerp(0.05, 0.55, clamp(midFullness, 0, 1)) * (1 - d * 0.82);
  const zUnder = HALF_BEAM * wlPlan * Math.max(section, keelFloor * (1 - d)) + armorBelt;
  return Math.max(0, zUnder * (1 - 0.78 * sternSkeg * Math.pow(d, 0.9)));
}

/** Dựng dải vỏ tàu khép kín giữa hai hàm độ cao yLow(u) và yHigh(u), UV chuẩn tỷ lệ tàu */
function buildHullBand(
  nu: number,
  ns: number,
  yLowFn: (u: number) => number,
  yHighFn: (u: number) => number,
  closeBottom = false,
): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const UV_SCALE = 1 / 11; // với repeat=0.38 cho mảng ngụy trang Measure 12/21 mịn đúng tỷ lệ tuần dương hạm

  const rows = ns + 1 + (closeBottom ? 1 : 0);

  for (let side = 0; side < 2; side++) {
    const sign = side === 0 ? 1 : -1;
    const baseVertex = pos.length / 3;

    for (let i = 0; i <= nu; i++) {
      const u = i / nu;
      const y0 = yLowFn(u);
      const y1 = yHighFn(u);

      if (closeBottom) {
        const xKeel = lerp(xSternAtY(y0), xStemAtY(y0), u);
        pos.push(xKeel, y0, 0);
        uv.push(xKeel * UV_SCALE, (y0 - 4) * UV_SCALE);
      }

      for (let j = 0; j <= ns; j++) {
        const s = j / ns;
        const y = lerp(y0, y1, s);
        const x = lerp(xSternAtY(y), xStemAtY(y), u);
        const z = hullHalfBeam(u, y) * sign;
        pos.push(x, y, z);
        uv.push(x * UV_SCALE, (y + Math.abs(z) * 0.45) * UV_SCALE);
      }
    }

    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < rows - 1; j++) {
        const p00 = baseVertex + i * rows + j;
        const p10 = baseVertex + (i + 1) * rows + j;
        const p01 = baseVertex + i * rows + (j + 1);
        const p11 = baseVertex + (i + 1) * rows + (j + 1);
        if (sign > 0) {
          idx.push(p00, p10, p11, p00, p11, p01);
        } else {
          idx.push(p00, p11, p10, p00, p01, p11);
        }
      }
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Dựng mặt boong chính khớp khít 100% với mép sheer line, có độ vồng thoát nước (deck camber) */
function buildMainDeckGeo(nu: number, nz: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const UV_SCALE = 1 / 10;
  const cols = nz + 1;

  for (let i = 0; i <= nu; i++) {
    const u = i / nu;
    const yEdge = deckSheerY(u);
    const x = lerp(xSternAtY(yEdge), xStemAtY(yEdge), u);
    const b = hullHalfBeam(u, yEdge);
    for (let k = 0; k <= nz; k++) {
      const f = (k / nz) * 2 - 1;
      const z = f * b;
      const camber = 0.2 * (1 - f * f) * (b / HALF_BEAM);
      pos.push(x, yEdge + camber, z);
      uv.push(x * UV_SCALE, z * UV_SCALE);
    }
  }

  for (let i = 0; i < nu; i++) {
    for (let k = 0; k < nz; k++) {
      const p00 = i * cols + k;
      const p10 = (i + 1) * cols + k;
      const p01 = i * cols + (k + 1);
      const p11 = (i + 1) * cols + (k + 1);
      idx.push(p00, p01, p11, p00, p11, p10);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Dựng vách đuôi phẳng (stern transom) tại u = 0 */
function buildTransomGeo(yMin: number, yMax: number, ny = 10, nz = 8): THREE.BufferGeometry {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const cols = nz + 1;

  for (let j = 0; j <= ny; j++) {
    const t = j / ny;
    const y = lerp(yMin, yMax, t);
    const x = xSternAtY(y);
    const b = hullHalfBeam(0, y);
    const isTop = j === ny && yMax > 6;
    for (let k = 0; k <= nz; k++) {
      const f = (k / nz) * 2 - 1;
      const camber = isTop ? 0.2 * (1 - f * f) * (b / HALF_BEAM) : 0;
      pos.push(x, y + camber, f * b);
      uv.push(f * b * 0.1, y * 0.1);
    }
  }

  for (let j = 0; j < ny; j++) {
    for (let k = 0; k < nz; k++) {
      const p00 = j * cols + k;
      const p01 = j * cols + (k + 1);
      const p10 = (j + 1) * cols + k;
      const p11 = (j + 1) * cols + (k + 1);
      idx.push(p00, p01, p11, p00, p11, p10);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Tháp pháo chính 3 nòng 6-inch/47 cal Mark 16 (152 mm) đặc trưng của lớp Brooklyn */
const Triple6InchTurret: React.FC<{
  position: [number, number, number];
  barbetteH: number;
  yaw: number;
  elev: number;
  recoil: number;
  turretMat: THREE.Material;
  barrelMat: THREE.Material;
  darkSteelMat: THREE.Material;
  canvasMat: THREE.Material;
  lensMat: THREE.Material;
}> = ({ position, barbetteH, yaw, elev, recoil, turretMat, barrelMat, darkSteelMat, canvasMat, lensMat }) => {
  const { houseGeo, roofSlopeGeo, barrelGeo, blastBagGeo } = useMemo(() => {
    const plan: P2[] = [
      [3.2, -2.18],
      [3.2, 2.18],
      [1.38, 3.12],
      [-1.78, 3.16],
      [-3.78, 2.58],
      [-4.0, 1.88],
      [-4.0, -1.88],
      [-3.78, -2.58],
      [-1.78, -3.16],
      [1.38, -3.12],
    ];
    const house = extrudeTop(plan, 2.12, 0.08);

    const sideSlope: P2[] = [
      [-3.55, 2.05],
      [1.25, 2.05],
      [3.16, 1.28],
      [3.16, 2.05],
      [1.15, 2.42],
      [-3.28, 2.38],
    ];
    const roofSlope = extrude(sideSlope, 4.35, 0.05);

    // Nòng pháo 6-inch/47 cal tiện lathe (dài 6.35 m nổi bật sắc nét)
    const barrel = lathe(
      [
        [0.23, 0.0],
        [0.23, 1.2],
        [0.195, 1.28],
        [0.18, 2.75],
        [0.15, 4.55],
        [0.134, 6.02],
        [0.165, 6.18],
        [0.165, 6.35],
        [0.085, 6.35],
        [0.085, 6.1],
      ],
      24,
    );

    // Bọc bạt chống nước gốc nòng (blast bag / bloomer)
    const bag = lathe(
      [
        [0.44, -0.15],
        [0.49, 0.14],
        [0.41, 0.34],
        [0.46, 0.56],
        [0.36, 0.8],
        [0.26, 1.05],
      ],
      20,
    );

    return { houseGeo: house, roofSlopeGeo: roofSlope, barrelGeo: barrel, blastBagGeo: bag };
  }, []);

  return (
    <group position={position}>
      {/* Bệ giáp hình trụ barbette */}
      <mesh position={[0, barbetteH / 2, 0]} material={turretMat} castShadow receiveShadow>
        <cylinderGeometry args={[3.06, 3.2, barbetteH, 28]} />
      </mesh>
      <mesh position={[0, barbetteH - 0.08, 0]} material={darkSteelMat}>
        <cylinderGeometry args={[3.24, 3.24, 0.18, 28]} />
      </mesh>

      {/* Khối tháp pháo xoay theo turretYaw */}
      <group position={[0, barbetteH, 0]} rotation={[0, yaw, 0]}>
        <mesh geometry={houseGeo} material={turretMat} castShadow receiveShadow />
        <mesh geometry={roofSlopeGeo} material={turretMat} castShadow receiveShadow />

        {/* Hai tai máy đo xa quang học nhô ngang đặc trưng hai bên hông sau tháp (rangefinder ears) */}
        {([-1, 1] as const).map((s) => (
          <group key={s} position={[-1.45, 1.58, s * 3.5]}>
            <mesh geometry={rbox(1.36, 0.7, 1.4, 0.08)} material={turretMat} castShadow />
            <mesh position={[0.66, 0, s * 0.25]} geometry={rbox(0.12, 0.38, 0.54, 0.02)} material={lensMat} />
          </group>
        ))}

        {/* Kính ngắm tiềm vọng trên nóc, nắp trưởng tháp & hộp quạt thông gió đuôi */}
        <mesh position={[-0.4, 2.52, -1.18]} geometry={rbox(0.78, 0.36, 0.68, 0.06)} material={turretMat} castShadow />
        <mesh position={[-0.4, 2.52, 1.18]} geometry={rbox(0.78, 0.36, 0.68, 0.06)} material={turretMat} castShadow />
        <mesh position={[-2.2, 2.4, 0]} material={darkSteelMat}>
          <cylinderGeometry args={[0.46, 0.5, 0.2, 16]} />
        </mesh>
        <mesh position={[-4.06, 1.18, 0]} geometry={rbox(0.34, 1.18, 3.15, 0.05)} material={darkSteelMat} castShadow />

        {/* Cụm 3 nòng pháo 6-inch/47 nâng hạ theo gunElev và giật lùi theo recoil */}
        <group position={[2.72, 1.18, 0]} rotation={[0, 0, elev]}>
          {([-1.38, 0, 1.38] as const).map((bz, idx) => (
            <group key={idx} position={[0, 0, bz]}>
              <mesh geometry={blastBagGeo} material={canvasMat} castShadow />
              <mesh position={[-recoil * 0.68, 0, 0]} geometry={barrelGeo} material={barrelMat} castShadow />
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};

/** Ụ pháo phụ phòng không / đối hải 5-inch/25 cal (8 khẩu bố trí hai mạn giữa tàu) */
const Secondary5InchGun: React.FC<{
  position: [number, number, number];
  side: 1 | -1;
  mountMat: THREE.Material;
  barrelMat: THREE.Material;
  deckMat: THREE.Material;
}> = ({ position, side, mountMat, barrelMat, deckMat }) => {
  const barrelGeo = useMemo(
    () =>
      lathe(
        [
          [0.17, 0],
          [0.155, 0.95],
          [0.12, 2.25],
          [0.105, 3.35],
          [0.125, 3.48],
          [0.065, 3.48],
        ],
        16,
      ),
    [],
  );

  const outYaw = side > 0 ? -Math.PI * 0.46 : Math.PI * 0.46;

  return (
    <group position={position}>
      {/* Thành chắn mảnh đạn tròn (gun tub) */}
      <mesh position={[0, 0.5, 0]} material={mountMat} castShadow receiveShadow>
        <cylinderGeometry args={[1.68, 1.68, 1.0, 18]} />
      </mesh>
      <mesh position={[0, 0.96, 0]} material={deckMat}>
        <cylinderGeometry args={[1.54, 1.54, 0.08, 18]} />
      </mesh>

      {/* Bệ xoay & khóa nòng 5-inch/25 */}
      <group position={[0, 0.52, 0]} rotation={[0, outYaw, 0]}>
        <mesh position={[0, 0.46, 0]} material={mountMat} castShadow>
          <cylinderGeometry args={[0.4, 0.54, 0.96, 14]} />
        </mesh>
        <mesh position={[0.05, 1.0, 0]} geometry={rbox(1.18, 0.58, 0.88, 0.06)} material={mountMat} castShadow />
        <group position={[0.26, 1.08, 0]} rotation={[0, 0, 0.26]}>
          <mesh position={[0.46, 0.23, 0]} rotation={[0, 0, -Math.PI / 2]} material={barrelMat}>
            <cylinderGeometry args={[0.105, 0.105, 1.15, 12]} />
          </mesh>
          <mesh geometry={barrelGeo} material={barrelMat} castShadow />
        </group>
      </group>
    </group>
  );
};

/** Ống khói lớn hơi nghiêng về sau đặc trưng của tuần dương hạm lớp Brooklyn */
const CruiserFunnel: React.FC<{
  position: [number, number, number];
  height: number;
  bodyMat: THREE.Material;
  capMat: THREE.Material;
  pipeMat: THREE.Material;
}> = ({ position, height, bodyMat, capMat, pipeMat }) => {
  const { bodyGeo, capGeo } = useMemo(() => {
    const oval: P2[] = [];
    const N = 24;
    for (let i = 0; i < N; i++) {
      const a = (i / N) * Math.PI * 2;
      oval.push([Math.cos(a) * 2.65, Math.sin(a) * 1.55]);
    }
    const capH = 1.8;
    return {
      bodyGeo: extrudeTop(oval, height - capH, 0.05),
      capGeo: extrudeTop(oval, capH, 0.04),
    };
  }, [height]);

  return (
    <group position={position}>
      <mesh position={[0, 0.78, 0]} geometry={rbox(6.5, 1.65, 4.5, 0.18)} material={bodyMat} castShadow receiveShadow />
      <group position={[0, 1.25, 0]} rotation={[0, 0, 0.14]}>
        <mesh geometry={bodyGeo} material={bodyMat} castShadow receiveShadow />
        <mesh position={[0, height - 1.8, 0]} geometry={capGeo} material={capMat} castShadow />
        <mesh position={[2.72, height * 0.48, 0]} material={pipeMat}>
          <cylinderGeometry args={[0.12, 0.12, height * 0.92, 10]} />
        </mesh>
        <mesh position={[-2.72, height * 0.46, 0.35]} material={pipeMat}>
          <cylinderGeometry args={[0.1, 0.1, height * 0.88, 10]} />
        </mesh>
      </group>
    </group>
  );
};

/** Đài điều khiển hỏa lực chính Mk 34 có cánh tay máy đo xa quang học ngang */
const Mk34Director: React.FC<{
  position: [number, number, number];
  yaw?: number;
  bodyMat: THREE.Material;
  lensMat: THREE.Material;
  darkMat: THREE.Material;
}> = ({ position, yaw = 0, bodyMat, lensMat, darkMat }) => (
  <group position={position} rotation={[0, yaw, 0]}>
    <mesh position={[0, 0.88, 0]} material={bodyMat} castShadow>
      <cylinderGeometry args={[1.38, 1.54, 1.76, 20]} />
    </mesh>
    <mesh position={[0.15, 2.1, 0]} geometry={rbox(2.45, 1.28, 2.25, 0.16)} material={bodyMat} castShadow />
    <mesh position={[-0.1, 2.26, 0]} rotation={[Math.PI / 2, 0, 0]} material={bodyMat} castShadow>
      <cylinderGeometry args={[0.28, 0.28, 5.15, 16]} />
    </mesh>
    {([-2.52, 2.52] as const).map((z) => (
      <mesh key={z} position={[0.18, 2.26, z]} geometry={rbox(0.46, 0.48, 0.44, 0.05)} material={lensMat} />
    ))}
    <mesh position={[0.3, 3.12, 0]} geometry={rbox(0.26, 0.9, 2.5, 0.03)} material={darkMat} />
  </group>
);

/** Cột tàu 3 chân (Tripod Mast) kèm đài quan sát, máy đo xa quang học & xà ngang */
const TripodMast: React.FC<{
  baseX: number;
  baseY: number;
  topY: number;
  legSpreadX: number;
  legSpreadZ: number;
  platformY: number;
  yardSpan: number;
  steelMat: THREE.Material;
  darkMat: THREE.Material;
  lensMat: THREE.Material;
}> = ({ baseX, baseY, topY, legSpreadX, legSpreadZ, platformY, yardSpan, steelMat, darkMat, lensMat }) => {
  const { legPort, legStbd, stayFore } = useMemo(() => {
    const joinY = platformY - 0.3;
    return {
      legPort: pipe(
        [
          [baseX + legSpreadX, baseY, -legSpreadZ],
          [baseX + legSpreadX * 0.5, lerp(baseY, joinY, 0.5), -legSpreadZ * 0.52],
          [baseX, joinY, -0.15],
        ],
        0.26,
        16,
      ),
      legStbd: pipe(
        [
          [baseX + legSpreadX, baseY, legSpreadZ],
          [baseX + legSpreadX * 0.5, lerp(baseY, joinY, 0.5), legSpreadZ * 0.52],
          [baseX, joinY, 0.15],
        ],
        0.26,
        16,
      ),
      stayFore: pipe(
        [
          [baseX, topY - 1.2, 0],
          [baseX + 4.2, platformY - 2.5, 0],
        ],
        0.045,
        8,
      ),
    };
  }, [baseX, baseY, topY, legSpreadX, legSpreadZ, platformY]);

  const mastH = topY - baseY;

  return (
    <group>
      <mesh position={[baseX, baseY + mastH / 2, 0]} material={steelMat} castShadow>
        <cylinderGeometry args={[0.17, 0.44, mastH, 14]} />
      </mesh>
      <mesh geometry={legPort} material={steelMat} castShadow />
      <mesh geometry={legStbd} material={steelMat} castShadow />
      <mesh geometry={stayFore} material={darkMat} />

      <group position={[baseX + 0.25, platformY, 0]}>
        <mesh geometry={rbox(3.5, 0.38, 3.9, 0.12)} material={steelMat} castShadow />
        <mesh position={[0.1, 0.68, 0]} geometry={rbox(2.8, 1.08, 3.0, 0.18)} material={steelMat} castShadow />
        <mesh position={[0.25, 1.58, 0]} geometry={rbox(1.55, 0.92, 1.65, 0.12)} material={steelMat} castShadow />
        <mesh position={[0.25, 1.76, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
          <cylinderGeometry args={[0.19, 0.19, 3.5, 12]} />
        </mesh>
        <mesh position={[0.44, 1.76, -1.7]} geometry={rbox(0.3, 0.34, 0.3, 0.03)} material={lensMat} />
        <mesh position={[0.44, 1.76, 1.7]} geometry={rbox(0.3, 0.34, 0.3, 0.03)} material={lensMat} />
      </group>

      <mesh position={[baseX + 0.2, platformY - 0.85, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMat} castShadow>
        <cylinderGeometry args={[0.12, 0.16, yardSpan, 10]} />
      </mesh>
      <mesh position={[baseX, topY - 2.6, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
        <cylinderGeometry args={[0.09, 0.12, yardSpan * 0.58, 10]} />
      </mesh>
      <mesh position={[baseX + 0.35, topY - 0.55, 0]} geometry={rbox(0.24, 1.15, 2.6, 0.03)} material={darkMat} />
    </group>
  );
};

/** Cần cẩu thủy phi cơ kết cấu giàn thép rỗng (open-truss lattice crane) ở đuôi lớp Brooklyn */
const SternLatticeCrane: React.FC<{
  position: [number, number, number];
  steelMat: THREE.Material;
  darkMat: THREE.Material;
}> = ({ position, steelMat, darkMat }) => {
  const boomLen = 13.8;
  return (
    <group position={position}>
      {/* Bệ trụ xoay cần cẩu */}
      <mesh position={[0, 1.85, 0]} material={steelMat} castShadow>
        <cylinderGeometry args={[0.76, 1.02, 3.7, 16]} />
      </mesh>
      <mesh position={[-0.5, 2.8, 0]} geometry={rbox(1.6, 1.4, 1.5, 0.1)} material={steelMat} castShadow />

      {/* Tay cần giàn thép 4 thanh biên + thanh giằng ngang/chéo */}
      <group position={[0, 3.45, 0]} rotation={[0, 0, -0.8]}>
        {([-0.38, 0.38] as const).map((cx) =>
          ([-0.42, 0.42] as const).map((cz) => (
            <mesh key={`${cx}_${cz}`} position={[cx, boomLen / 2, cz]} material={steelMat} castShadow>
              <cylinderGeometry args={[0.075, 0.095, boomLen, 8]} />
            </mesh>
          )),
        )}
        {/* Thanh giằng ngang & chéo dọc suốt chiều dài cần cẩu */}
        {Array.from({ length: 8 }, (_, k) => {
          const yk = 1.2 + k * 1.65;
          const dir = k % 2 === 0 ? 1 : -1;
          return (
            <group key={k} position={[0, yk, 0]}>
              <mesh geometry={rbox(0.84, 0.09, 0.92, 0.02)} material={steelMat} />
              <mesh
                position={[0, 0.8, 0.42]}
                rotation={[0, 0, dir * 0.44]}
                geometry={rbox(0.08, 1.8, 0.08, 0.01)}
                material={darkMat}
              />
              <mesh
                position={[0, 0.8, -0.42]}
                rotation={[0, 0, -dir * 0.44]}
                geometry={rbox(0.08, 1.8, 0.08, 0.01)}
                material={darkMat}
              />
            </group>
          );
        })}
        {/* Cụm ròng rọc puly đầu cần cẩu */}
        <mesh position={[0, boomLen + 0.15, 0]} rotation={[Math.PI / 2, 0, 0]} material={darkMat}>
          <cylinderGeometry args={[0.45, 0.45, 0.55, 14]} />
        </mesh>
      </group>
    </group>
  );
};

/** Xuồng cứu sinh / xuồng máy hải quân treo trên giá davit hai mạn */
const ShipsWhaleboat: React.FC<{
  position: [number, number, number];
  hullMat: THREE.Material;
  coverMat: THREE.Material;
  steelMat: THREE.Material;
}> = ({ position, hullMat, coverMat, steelMat }) => {
  const boatGeo = useMemo(() => {
    const plan: P2[] = [
      [-4.1, 0],
      [-3.1, 1.05],
      [0, 1.28],
      [3.1, 1.05],
      [4.2, 0],
      [3.1, -1.05],
      [0, -1.28],
      [-3.1, -1.05],
    ];
    return extrudeTop(plan, 1.1, 0.08);
  }, []);

  return (
    <group position={position}>
      <mesh geometry={boatGeo} material={hullMat} castShadow />
      <mesh position={[0, 1.06, 0]} geometry={rbox(6.4, 0.18, 2.05, 0.06)} material={coverMat} />
      {([-2.7, 2.7] as const).map((dx) => (
        <mesh key={dx} position={[dx, -0.45, 0]} geometry={rbox(0.24, 1.9, 0.45, 0.04)} material={steelMat} />
      ))}
    </group>
  );
};

export const USSNashville: React.FC<USSNashvilleProps> = ({
  turretYaw = 0,
  gunElev = 0.08,
  recoil = 0,
}) => {
  // Vật liệu sơn mờ Hải quân Mỹ Measure 12 (Modified) tháng 4/1942:
  // Thân tàu Sea Blue 5-S loang Ocean Gray 5-O; Thượng tầng & Tháp pháo Ocean Gray 5-O loang Haze Gray 5-H; Sàn tàu Deck Blue 20-B
  const mats = useMemo(
    () => ({
      hullFreeboard: paint({
        color: PAINT.navyHull,
        camo: [...PAINT.navyHullCamo, PAINT.navySuper],
        camoScale: 1.05,
        wear: 0.22,
        dirt: 0.22,
        roughness: 0.66,
        metalness: 0.18,
        repeat: 0.38,
        seed: 43,
      }),
      underwaterRed: paint({
        color: PAINT.antiFoulingRed,
        camo: ['#5c201d', '#7e332e'],
        camoScale: 1.4,
        wear: 0.18,
        dirt: 0.3,
        roughness: 0.72,
        metalness: 0.12,
        repeat: 0.38,
        seed: 44,
      }),
      bootBlack: plain('#191d22', 0.78, 0.12),
      deckBlue: paint({
        color: PAINT.navyDeckStain,
        camo: ['#2e3640', '#414b59'],
        camoScale: 1.8,
        wear: 0.2,
        dirt: 0.22,
        roughness: 0.78,
        metalness: 0.14,
        repeat: 0.38,
        seed: 45,
      }),
      superGrey: paint({
        color: PAINT.navySuper,
        camo: ['#4e6073', '#788ca0'],
        camoScale: 1.45,
        wear: 0.18,
        dirt: 0.15,
        roughness: 0.62,
        metalness: 0.18,
        repeat: 0.38,
        seed: 46,
      }),
      gunBarrelSteel: plain('#3c4754', 0.42, 0.55),
      darkSteel: plain('#262e37', 0.48, 0.52),
      sootBlack: plain('#181b20', 0.86, 0.16),
      canvasBlastBag: paint({
        color: '#d8d2bf',
        wear: 0.14,
        dirt: 0.25,
        roughness: 0.88,
        metalness: 0.02,
        repeat: 1,
        seed: 47,
      }),
      bridgeGlass: plain('#162632', 0.15, 0.32),
      bronzeProp: plain('#a48140', 0.38, 0.76),
      boatWhite: plain('#d7dee4', 0.64, 0.08),
      raftGrey: plain('#768594', 0.72, 0.12),
      flagRed: plain('#bc2a2a', 0.75, 0.04),
      flagBlue: plain('#1f3a68', 0.75, 0.04),
    }),
    [],
  );

  const geos = useMemo(() => {
    const NU = 76;
    const underwater = buildHullBand(NU, 12, () => DRAFT, () => 0.22, true);
    const bootTop = buildHullBand(NU, 2, () => 0.22, () => 0.7, false);
    const freeboard = buildHullBand(NU, 12, () => 0.7, deckSheerY, false);
    const mainDeck = buildMainDeckGeo(NU, 12);
    const transomUpper = buildTransomGeo(0.7, deckSheerY(0), 8, 8);
    const transomBoot = buildTransomGeo(0.22, 0.7, 2, 6);
    const transomUnder = buildTransomGeo(-1.8, 0.22, 4, 6);

    const superDeckPlan: P2[] = [
      [28.5, -4.1],
      [28.5, 4.1],
      [18.0, 5.8],
      [-20.5, 5.8],
      [-31.2, 4.4],
      [-31.2, -4.4],
      [-20.5, -5.8],
      [18.0, -5.8],
    ];
    const superBase = extrudeTop(superDeckPlan, 3.35, 0.08);

    const flagBridgePlan: P2[] = [
      [25.4, -2.9],
      [25.4, 2.9],
      [22.0, 4.6],
      [13.4, 4.6],
      [13.4, -4.6],
      [22.0, -4.6],
    ];
    const flagBridge = extrudeTop(flagBridgePlan, 2.8, 0.07);

    const navBridgePlan: P2[] = [
      [24.6, -2.5],
      [24.6, 2.5],
      [22.2, 4.1],
      [15.2, 4.1],
      [15.2, -4.1],
      [22.2, -4.1],
    ];
    const navBridge = extrudeTop(navBridgePlan, 2.65, 0.06);

    const breakwaterPlan: P2[] = [
      [75.4, 0],
      [71.6, 5.15],
      [71.1, 4.88],
      [74.5, 0],
      [71.1, -4.88],
      [71.6, -5.15],
    ];
    const breakwater = extrudeTop(breakwaterPlan, 0.95, 0.03);

    const aerialPort = pipe(
      [
        [17.3, 25.9, -4.8],
        [-2.5, 24.4, -4.4],
        [-22.4, 22.9, -4.1],
      ],
      0.048,
      20,
    );
    const aerialStbd = pipe(
      [
        [17.3, 25.9, 4.8],
        [-2.5, 24.4, 4.4],
        [-22.4, 22.9, 4.1],
      ],
      0.048,
      20,
    );
    const aerialTop = pipe(
      [
        [17.2, 33.4, 0],
        [-2.6, 31.6, 0],
        [-22.5, 30.8, 0],
      ],
      0.042,
      20,
    );

    const chainPort = pipe(
      [
        [76.8, 8.85, -1.35],
        [81.5, 9.02, -1.72],
        [86.2, 9.2, -1.95],
      ],
      0.14,
      12,
    );
    const chainStbd = pipe(
      [
        [76.8, 8.85, 1.35],
        [81.5, 9.02, 1.72],
        [86.2, 9.2, 1.95],
      ],
      0.14,
      12,
    );

    const craneCable = pipe(
      [
        [-89.6, 9.8, 0],
        [-79.3, 20.15, 0],
        [-79.3, 13.8, 0],
      ],
      0.058,
      14,
    );

    const portholes: [number, number, number][] = [];
    for (let x = -72; x <= 78; x += 3.6) {
      const u = clamp((x + HALF_L) / L, 0.02, 0.96);
      const y = deckSheerY(u) - 1.55;
      const z = hullHalfBeam(u, y);
      if (z > 1.8) {
        portholes.push([x, y, z + 0.03], [x, y, -z - 0.03]);
      }
      if (x > 25 && x < 74) {
        const y2 = deckSheerY(u) - 3.05;
        const z2 = hullHalfBeam(u, y2);
        if (z2 > 1.8) {
          portholes.push([x + 1.8, y2, z2 + 0.03], [x + 1.8, y2, -z2 - 0.03]);
        }
      }
    }

    return {
      underwater,
      bootTop,
      freeboard,
      mainDeck,
      transomUpper,
      transomBoot,
      transomUnder,
      superBase,
      flagBridge,
      navBridge,
      breakwater,
      aerialPort,
      aerialStbd,
      aerialTop,
      chainPort,
      chainStbd,
      craneCable,
      portholes,
    };
  }, []);

  const clampedElev = clamp(gunElev, -0.09, 0.72);
  const clampedRecoil = clamp(recoil, 0, 1);
  const fwdYaw = turretYaw;
  const aftYaw = Math.PI - turretYaw;

  return (
    <group>
      {/* ==================== 1. THÂN TÀU 185.4m x 18.8m & PHẦN CHÌM -6.5m ==================== */}
      <mesh geometry={geos.underwater} material={mats.underwaterRed} receiveShadow />
      <mesh geometry={geos.bootTop} material={mats.bootBlack} receiveShadow />
      <mesh geometry={geos.freeboard} material={mats.hullFreeboard} castShadow receiveShadow />
      <mesh geometry={geos.mainDeck} material={mats.deckBlue} receiveShadow />
      <mesh geometry={geos.transomUpper} material={mats.hullFreeboard} castShadow receiveShadow />
      <mesh geometry={geos.transomBoot} material={mats.bootBlack} />
      <mesh geometry={geos.transomUnder} material={mats.underwaterRed} />

      {/* Vây giảm lắc dưới nước (bilge keels) gọn trong đoạn thân song song giữa tàu */}
      {([-1, 1] as const).map((s) => (
        <mesh
          key={s}
          position={[-2.0, -4.85, s * 7.75]}
          rotation={[s * 0.65, 0, 0]}
          geometry={rbox(50.0, 0.14, 0.92, 0.03)}
          material={mats.underwaterRed}
        />
      ))}

      {/* 4 trục chân vịt, 4 chân vịt đồng & bánh lái kép dưới đuôi tàu */}
      {([-1, 1] as const).map((s) => (
        <React.Fragment key={s}>
          <group position={[-79.5, -4.15, s * 4.75]}>
            <mesh position={[5.2, 0.45, -s * 0.55]} rotation={[0, s * 0.1, -Math.PI / 2 + 0.08]} material={mats.underwaterRed}>
              <cylinderGeometry args={[0.24, 0.28, 11.5, 10]} />
            </mesh>
            <mesh material={mats.bronzeProp}>
              <cylinderGeometry args={[0.42, 0.3, 0.9, 12]} />
            </mesh>
            {[0, 1, 2].map((b) => (
              <mesh
                key={b}
                rotation={[(b * Math.PI * 2) / 3, 0.35, 0]}
                position={[-0.2, 0, 0]}
                geometry={rbox(0.14, 2.85, 0.68, 0.04)}
                material={mats.bronzeProp}
              />
            ))}
          </group>
          <group position={[-85.2, -4.45, s * 2.45]}>
            <mesh position={[5.5, 0.38, -s * 0.3]} rotation={[0, s * 0.05, -Math.PI / 2 + 0.06]} material={mats.underwaterRed}>
              <cylinderGeometry args={[0.24, 0.28, 12.0, 10]} />
            </mesh>
            <mesh material={mats.bronzeProp}>
              <cylinderGeometry args={[0.42, 0.3, 0.9, 12]} />
            </mesh>
            {[0, 1, 2].map((b) => (
              <mesh
                key={b}
                rotation={[(b * Math.PI * 2) / 3, -0.35, 0]}
                position={[-0.2, 0, 0]}
                geometry={rbox(0.14, 2.85, 0.68, 0.04)}
                material={mats.bronzeProp}
              />
            ))}
          </group>
          <mesh
            position={[-88.8, -3.55, s * 2.35]}
            geometry={rbox(3.4, 4.3, 0.42, 0.1)}
            material={mats.underwaterRed}
          />
        </React.Fragment>
      ))}

      {/* Ô cửa tròn dọc thân, vách chắn sóng mũi, tời neo, dây xích & 2 mỏ neo mũi */}
      <Rivets points={geos.portholes} r={0.19} color="#182028" />
      <mesh position={[0, 8.62, 0]} geometry={geos.breakwater} material={mats.superGrey} castShadow />
      <mesh geometry={geos.chainPort} material={mats.darkSteel} />
      <mesh geometry={geos.chainStbd} material={mats.darkSteel} />
      {([-1, 1] as const).map((s) => {
        const uAnc = (85.6 + HALF_L) / L;
        const zAnc = hullHalfBeam(uAnc, 7.15) + 0.05;
        return (
          <group key={s}>
            <mesh position={[76.6, 8.95, s * 1.35]} material={mats.darkSteel} castShadow>
              <cylinderGeometry args={[0.7, 0.85, 0.74, 14]} />
            </mesh>
            <group position={[85.6, 7.15, s * zAnc]} rotation={[0, -s * 0.25, -0.45]}>
              <mesh geometry={rbox(1.9, 0.36, 0.32, 0.06)} material={mats.darkSteel} castShadow />
              <mesh position={[-0.75, 0, 0]} geometry={rbox(0.55, 1.45, 0.38, 0.08)} material={mats.darkSteel} castShadow />
            </group>
            {[80.5, 60.0, -54.0, -76.0, -88.0].map((bx) => {
              const u = (bx + HALF_L) / L;
              const by = deckSheerY(u) + 0.25;
              const bz = Math.max(1.2, hullHalfBeam(u, by) - 0.75);
              return (
                <mesh key={bx} position={[bx, by, s * bz]} geometry={rbox(0.95, 0.52, 0.45, 0.08)} material={mats.darkSteel} />
              );
            })}
          </group>
        );
      })}

      {/* Cột cờ mũi (jackstaff) & cột cờ lái */}
      <mesh position={[92.1, 11.2, 0]} material={mats.darkSteel}>
        <cylinderGeometry args={[0.05, 0.08, 4.1, 8]} />
      </mesh>
      <group position={[-92.2, 7.0, 0]}>
        <mesh position={[-0.35, 2.4, 0]} rotation={[0, 0, 0.22]} material={mats.darkSteel}>
          <cylinderGeometry args={[0.06, 0.09, 5.0, 8]} />
        </mesh>
        <mesh position={[-1.45, 4.35, 0.05]} rotation={[0, 0.12, 0]} geometry={rbox(1.75, 1.05, 0.05, 0.01)} material={mats.flagRed} />
        <mesh position={[-0.95, 4.62, 0.06]} rotation={[0, 0.12, 0]} geometry={rbox(0.75, 0.52, 0.06, 0.01)} material={mats.flagBlue} />
      </group>

      {/* ==================== 2. NĂM THÁP PHÁO CHÍNH 3 NÒNG 6-INCH/47 (15 NÒNG!) ==================== */}
      <Triple6InchTurret
        position={[66.5, 8.42, 0]}
        barbetteH={0.88}
        yaw={fwdYaw}
        elev={clampedElev}
        recoil={clampedRecoil}
        turretMat={mats.superGrey}
        barrelMat={mats.gunBarrelSteel}
        darkSteelMat={mats.darkSteel}
        canvasMat={mats.canvasBlastBag}
        lensMat={mats.bridgeGlass}
      />
      <Triple6InchTurret
        position={[51.8, 7.98, 0]}
        barbetteH={3.96}
        yaw={fwdYaw}
        elev={clampedElev}
        recoil={clampedRecoil}
        turretMat={mats.superGrey}
        barrelMat={mats.gunBarrelSteel}
        darkSteelMat={mats.darkSteel}
        canvasMat={mats.canvasBlastBag}
        lensMat={mats.bridgeGlass}
      />
      <Triple6InchTurret
        position={[35.8, 7.66, 0]}
        barbetteH={1.18}
        yaw={fwdYaw}
        elev={clampedElev}
        recoil={clampedRecoil}
        turretMat={mats.superGrey}
        barrelMat={mats.gunBarrelSteel}
        darkSteelMat={mats.darkSteel}
        canvasMat={mats.canvasBlastBag}
        lensMat={mats.bridgeGlass}
      />
      <Triple6InchTurret
        position={[-44.5, 7.16, 0]}
        barbetteH={3.58}
        yaw={aftYaw}
        elev={clampedElev}
        recoil={clampedRecoil}
        turretMat={mats.superGrey}
        barrelMat={mats.gunBarrelSteel}
        darkSteelMat={mats.darkSteel}
        canvasMat={mats.canvasBlastBag}
        lensMat={mats.bridgeGlass}
      />
      <Triple6InchTurret
        position={[-59.5, 7.08, 0]}
        barbetteH={0.88}
        yaw={aftYaw}
        elev={clampedElev}
        recoil={clampedRecoil}
        turretMat={mats.superGrey}
        barrelMat={mats.gunBarrelSteel}
        darkSteelMat={mats.darkSteel}
        canvasMat={mats.canvasBlastBag}
        lensMat={mats.bridgeGlass}
      />

      {/* ==================== 3. THƯỢNG TẦNG ĐÀI CHỈ HUY NHIỀU TẦNG & 2 CỘT TRIPOD ==================== */}
      <mesh position={[0, 7.22, 0]} geometry={geos.superBase} material={mats.superGrey} castShadow receiveShadow />
      <mesh position={[-1.2, 10.58, 0]} geometry={rbox(56.5, 0.08, 10.6, 0.03)} material={mats.deckBlue} receiveShadow />

      {/* Tháp chỉ huy bọc thép dày (Armored Conning Tower) */}
      <mesh position={[26.6, 12.6, 0]} material={mats.superGrey} castShadow>
        <cylinderGeometry args={[2.05, 2.22, 4.3, 22]} />
      </mesh>
      <mesh position={[27.55, 13.75, 0]} geometry={rbox(2.35, 0.28, 3.3, 0.05)} material={mats.bridgeGlass} />

      {/* Flag Bridge, Navigation Bridge & hai cánh buồng lái (Bridge Wings) */}
      <mesh position={[0, 10.55, 0]} geometry={geos.flagBridge} material={mats.superGrey} castShadow receiveShadow />
      <mesh position={[0, 13.32, 0]} geometry={geos.navBridge} material={mats.superGrey} castShadow receiveShadow />
      <mesh position={[20.8, 14.2, 0]} geometry={rbox(3.5, 1.4, 14.6, 0.12)} material={mats.superGrey} castShadow />
      <mesh position={[20.8, 14.92, 0]} geometry={rbox(3.3, 0.08, 14.4, 0.02)} material={mats.deckBlue} />
      <mesh position={[24.05, 15.1, 0]} geometry={rbox(1.55, 0.62, 4.7, 0.06)} material={mats.bridgeGlass} />
      <mesh position={[21.8, 15.1, 0]} geometry={rbox(4.6, 0.62, 8.28, 0.06)} material={mats.bridgeGlass} />

      {/* Signal Bridge & Đài điều khiển hỏa lực chính Mk 34 trước */}
      <mesh position={[19.8, 17.2, 0]} geometry={rbox(6.4, 2.4, 5.8, 0.14)} material={mats.superGrey} castShadow />
      <Mk34Director
        position={[20.6, 18.4, 0]}
        yaw={fwdYaw * 0.85}
        bodyMat={mats.superGrey}
        lensMat={mats.bridgeGlass}
        darkMat={mats.darkSteel}
      />

      {/* Cột tàu 3 chân phía trước (Fore Tripod Mast) */}
      <TripodMast
        baseX={17.0}
        baseY={15.8}
        topY={34.5}
        legSpreadX={-3.2}
        legSpreadZ={3.3}
        platformY={26.8}
        yardSpan={15.2}
        steelMat={mats.superGrey}
        darkMat={mats.darkSteel}
        lensMat={mats.bridgeGlass}
      />

      {/* Thượng tầng phía sau, Đài điều khiển hỏa lực Mk 34 sau & Cột tàu 3 chân sau */}
      <mesh position={[-25.5, 12.05, 0]} geometry={rbox(12.2, 3.05, 7.6, 0.15)} material={mats.superGrey} castShadow receiveShadow />
      <mesh position={[-25.5, 13.59, 0]} geometry={rbox(11.9, 0.08, 7.3, 0.02)} material={mats.deckBlue} />
      <mesh position={[-27.2, 14.55, 0]} geometry={rbox(7.8, 2.1, 5.4, 0.14)} material={mats.superGrey} castShadow />
      <Mk34Director
        position={[-28.8, 15.6, 0]}
        yaw={aftYaw * 0.85}
        bodyMat={mats.superGrey}
        lensMat={mats.bridgeGlass}
        darkMat={mats.darkSteel}
      />
      <TripodMast
        baseX={-22.5}
        baseY={13.5}
        topY={31.8}
        legSpreadX={3.1}
        legSpreadZ={3.2}
        platformY={23.6}
        yardSpan={13.4}
        steelMat={mats.superGrey}
        darkMat={mats.darkSteel}
        lensMat={mats.bridgeGlass}
      />

      {/* Dây ăng-ten vô tuyến nối giữa 2 cột tripod */}
      <mesh geometry={geos.aerialPort} material={mats.darkSteel} />
      <mesh geometry={geos.aerialStbd} material={mats.darkSteel} />
      <mesh geometry={geos.aerialTop} material={mats.darkSteel} />

      {/* ==================== 4. HAI ỐNG KHÓI LỚN NGHIÊNG & ĐÀI ĐÈN PHA ==================== */}
      <CruiserFunnel
        position={[4.2, 10.55, 0]}
        height={11.2}
        bodyMat={mats.superGrey}
        capMat={mats.sootBlack}
        pipeMat={mats.darkSteel}
      />
      <CruiserFunnel
        position={[-11.2, 10.55, 0]}
        height={10.8}
        bodyMat={mats.superGrey}
        capMat={mats.sootBlack}
        pipeMat={mats.darkSteel}
      />
      {([-1, 1] as const).map((s) => (
        <group key={s} position={[-3.5, 13.8, s * 3.8]}>
          <mesh position={[0, -1.6, 0]} material={mats.superGrey}>
            <cylinderGeometry args={[0.45, 0.65, 3.2, 10]} />
          </mesh>
          <mesh geometry={rbox(2.6, 0.28, 2.6, 0.08)} material={mats.superGrey} castShadow />
          <mesh position={[0, 0.72, s * 0.25]} rotation={[0, 0, Math.PI / 2]} material={mats.darkSteel} castShadow>
            <cylinderGeometry args={[0.52, 0.52, 0.85, 14]} />
          </mesh>
        </group>
      ))}

      {/* ==================== 5. TÁM PHÁO PHỤ 5-INCH HAI MẠN, XUỒNG & PHAO BÈ ==================== */}
      {([-1, 1] as const).map((s) => (
        <React.Fragment key={s}>
          {[8.2, -0.4, -9.0, -17.6].map((gx) => (
            <Secondary5InchGun
              key={gx}
              position={[gx, 10.55, s * 7.25]}
              side={s}
              mountMat={mats.superGrey}
              barrelMat={mats.gunBarrelSteel}
              deckMat={mats.deckBlue}
            />
          ))}
          {[22.8, -26.8].map((ax) => (
            <group key={ax} position={[ax, 10.58, s * 5.6]}>
              <mesh position={[0, 0.48, 0]} material={mats.superGrey} castShadow>
                <cylinderGeometry args={[1.25, 1.25, 0.95, 14]} />
              </mesh>
              <mesh position={[0, 0.92, s * 0.55]} rotation={[s * 0.45, 0, 0]} material={mats.gunBarrelSteel}>
                <cylinderGeometry args={[0.07, 0.09, 1.75, 8]} />
              </mesh>
            </group>
          ))}
          <ShipsWhaleboat
            position={[3.8, 12.0, s * 8.05]}
            hullMat={mats.boatWhite}
            coverMat={mats.raftGrey}
            steelMat={mats.darkSteel}
          />
          <ShipsWhaleboat
            position={[-13.5, 12.0, s * 8.05]}
            hullMat={mats.boatWhite}
            coverMat={mats.raftGrey}
            steelMat={mats.darkSteel}
          />
          {[14.2, -4.6, -22.2].map((rx) => (
            <mesh
              key={rx}
              position={[rx, 9.15, s * 5.88]}
              geometry={rbox(2.5, 1.45, 0.36, 0.16)}
              material={mats.raftGrey}
              castShadow
            />
          ))}
        </React.Fragment>
      ))}

      {/* ==================== 6. CẦN CẨU GIÀN THÉP & MÁY PHÓNG THỦY PHI CƠ Ở ĐUÔI TÀU ==================== */}
      <mesh position={[-72.8, 7.2, 0]} geometry={rbox(9.6, 0.34, 5.6, 0.08)} material={mats.superGrey} receiveShadow />
      <mesh position={[-72.8, 7.38, 0]} geometry={rbox(9.2, 0.08, 0.18, 0.02)} material={mats.darkSteel} />

      {([-1, 1] as const).map((s) => (
        <group key={s} position={[-79.2, 7.05, s * 5.25]} rotation={[0, -s * 0.14, 0]}>
          <mesh position={[0, 0.65, 0]} material={mats.superGrey} castShadow>
            <cylinderGeometry args={[0.95, 1.15, 1.3, 14]} />
          </mesh>
          <mesh position={[0.5, 1.55, 0]} geometry={rbox(17.5, 0.78, 1.15, 0.06)} material={mats.superGrey} castShadow />
          <mesh position={[0.5, 1.98, 0]} geometry={rbox(17.2, 0.14, 0.72, 0.02)} material={mats.darkSteel} />
        </group>
      ))}

      <SternLatticeCrane position={[-89.2, 6.98, 0]} steelMat={mats.superGrey} darkMat={mats.darkSteel} />
      <mesh geometry={geos.craneCable} material={mats.darkSteel} />
      {/* Móc cẩu thủy phi cơ */}
      <mesh position={[-79.3, 13.6, 0]} geometry={rbox(0.45, 0.55, 0.35, 0.08)} material={mats.darkSteel} />
    </group>
  );
};

export default USSNashville;

export const preview = turntable(() => <USSNashville turretYaw={0.45} gunElev={0.14} />, {
  size: 186,
  center: [0, 9, 0],
});
