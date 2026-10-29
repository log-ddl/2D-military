import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lathe, rbox, merge, mat4, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { PAL3D } from '../palette';

export type OreshnikProps = {
  plume?: number;
  shroudOpen?: number;
  busOnly?: boolean;
  rvPresent?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

export type OreshnikRVProps = {
  plasma?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
};

/** Tiện tròn quanh trục +X (toạ độ x tăng dần từ -X lên +X cho pháp tuyến hướng chuẩn ra ngoài). */
const latheOut = (ascProfile: P2[], seg = 36) => lathe(ascProfile, seg);

// Đường cong ogive khí động cho vỏ chóp bảo vệ đầu đạn (x cục bộ 0..3.20 m, bán kính đáy 0.90 m)
const SHROUD_LEN = 3.2;
const SHROUD_R0 = 0.9;
const SHROUD_WALL = 0.045;

const shroudOuterR = (u: number): number => {
  if (u >= 1) return 0.002;
  if (u > 0.985) {
    const t = (u - 0.985) / 0.015;
    const rEdge = SHROUD_R0 * Math.pow(1 - Math.pow(0.985, 1.55), 0.62);
    return rEdge * Math.sqrt(Math.max(0, 1 - t * t)) + 0.002;
  }
  return SHROUD_R0 * Math.pow(Math.max(0, 1 - Math.pow(u, 1.55)), 0.62);
};

const shroudInnerR = (u: number): number => {
  if (u >= 0.962) return 0;
  return Math.max(0.002, shroudOuterR(u) - SHROUD_WALL);
};

/** Sinh geometry có độ dày thành vỏ thật + gân chịu lực bên trong cho 1 cánh chóp bảo vệ ogive (tâm đối xứng quanh +Y). */
function buildPetalGeometries(phiSpan: number, nAxial = 28, nPhi = 18) {
  const pushQuad = (
    pos: number[],
    uvs: number[],
    a: [number, number, number],
    b: [number, number, number],
    c: [number, number, number],
    d: [number, number, number],
    ua: [number, number],
    ub: [number, number],
    uc: [number, number],
    ud: [number, number],
  ) => {
    pos.push(...a, ...b, ...c, ...a, ...c, ...d);
    uvs.push(...ua, ...ub, ...uc, ...ua, ...uc, ...ud);
  };

  const makeGeo = (pos: number[], uvs: number[]) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    return g;
  };

  // 1) Mặt vỏ ngoài (sơn chiến lược camo) & chóp mũi kim loại chịu nhiệt ở đỉnh
  const outPos: number[] = [];
  const outUv: number[] = [];
  const tipPos: number[] = [];
  const tipUv: number[] = [];
  const tipSplit = Math.floor(nAxial * 0.86);

  for (let i = 0; i < nAxial; i++) {
    const u0 = i / nAxial;
    const u1 = (i + 1) / nAxial;
    const x0 = u0 * SHROUD_LEN;
    const x1 = u1 * SHROUD_LEN;
    const r0 = shroudOuterR(u0);
    const r1 = shroudOuterR(u1);
    const dstP = i >= tipSplit ? tipPos : outPos;
    const dstU = i >= tipSplit ? tipUv : outUv;
    for (let j = 0; j < nPhi; j++) {
      const v0 = j / nPhi;
      const v1 = (j + 1) / nPhi;
      const p0 = -phiSpan / 2 + v0 * phiSpan;
      const p1 = -phiSpan / 2 + v1 * phiSpan;
      const p00: [number, number, number] = [x0, r0 * Math.cos(p0), r0 * Math.sin(p0)];
      const p01: [number, number, number] = [x0, r0 * Math.cos(p1), r0 * Math.sin(p1)];
      const p11: [number, number, number] = [x1, r1 * Math.cos(p1), r1 * Math.sin(p1)];
      const p10: [number, number, number] = [x1, r1 * Math.cos(p0), r1 * Math.sin(p0)];
      pushQuad(dstP, dstU, p00, p01, p11, p10, [u0, v0], [u0, v1], [u1, v1], [u1, v0]);
    }
  }
  const outerGeo = makeGeo(outPos, outUv);
  const noseCapGeo = makeGeo(tipPos, tipUv);

  // 2) Mặt lót tổ ong cách nhiệt bên trong
  const inPos: number[] = [];
  const inUv: number[] = [];
  const nIn = Math.floor(nAxial * 0.95);
  for (let i = 0; i < nIn; i++) {
    const u0 = (i / nIn) * 0.95;
    const u1 = ((i + 1) / nIn) * 0.95;
    const x0 = u0 * SHROUD_LEN;
    const x1 = u1 * SHROUD_LEN;
    const r0 = shroudInnerR(u0);
    const r1 = shroudInnerR(u1);
    for (let j = 0; j < nPhi; j++) {
      const v0 = j / nPhi;
      const v1 = (j + 1) / nPhi;
      const p0 = -phiSpan / 2 + v0 * phiSpan;
      const p1 = -phiSpan / 2 + v1 * phiSpan;
      const q00: [number, number, number] = [x0, r0 * Math.cos(p0), r0 * Math.sin(p0)];
      const q01: [number, number, number] = [x0, r0 * Math.cos(p1), r0 * Math.sin(p1)];
      const q11: [number, number, number] = [x1, r1 * Math.cos(p1), r1 * Math.sin(p1)];
      const q10: [number, number, number] = [x1, r1 * Math.cos(p0), r1 * Math.sin(p0)];
      pushQuad(inPos, inUv, q00, q10, q11, q01, [u0, v0], [u1, v0], [u1, v1], [u0, v1]);
    }
  }
  const linerGeo = makeGeo(inPos, inUv);

  // 3) Hai thành mép tách dọc (có rãnh chốt nổ tách vỏ) + mặt bích đáy + gân khung thép bên trong
  const sidePos: number[] = [];
  const sideUv: number[] = [];
  for (let i = 0; i < nIn; i++) {
    const u0 = (i / nIn) * 0.95;
    const u1 = ((i + 1) / nIn) * 0.95;
    const x0 = u0 * SHROUD_LEN;
    const x1 = u1 * SHROUD_LEN;
    const ro0 = shroudOuterR(u0);
    const ro1 = shroudOuterR(u1);
    const ri0 = shroudInnerR(u0);
    const ri1 = shroudInnerR(u1);

    const pL = -phiSpan / 2;
    const lo0: [number, number, number] = [x0, ro0 * Math.cos(pL), ro0 * Math.sin(pL)];
    const lo1: [number, number, number] = [x1, ro1 * Math.cos(pL), ro1 * Math.sin(pL)];
    const li1: [number, number, number] = [x1, ri1 * Math.cos(pL), ri1 * Math.sin(pL)];
    const li0: [number, number, number] = [x0, ri0 * Math.cos(pL), ri0 * Math.sin(pL)];
    pushQuad(sidePos, sideUv, lo0, lo1, li1, li0, [u0, 0], [u1, 0], [u1, 1], [u0, 1]);

    const pR = phiSpan / 2;
    const ro0p: [number, number, number] = [x0, ro0 * Math.cos(pR), ro0 * Math.sin(pR)];
    const ri0p: [number, number, number] = [x0, ri0 * Math.cos(pR), ri0 * Math.sin(pR)];
    const ri1p: [number, number, number] = [x1, ri1 * Math.cos(pR), ri1 * Math.sin(pR)];
    const ro1p: [number, number, number] = [x1, ro1 * Math.cos(pR), ro1 * Math.sin(pR)];
    pushQuad(sidePos, sideUv, ro0p, ri0p, ri1p, ro1p, [u0, 0], [u0, 1], [u1, 1], [u1, 0]);
  }

  const basePos: number[] = [];
  const baseUv: number[] = [];
  const roB = shroudOuterR(0);
  const riB = shroudInnerR(0);
  for (let j = 0; j < nPhi; j++) {
    const v0 = j / nPhi;
    const v1 = (j + 1) / nPhi;
    const p0 = -phiSpan / 2 + v0 * phiSpan;
    const p1 = -phiSpan / 2 + v1 * phiSpan;
    const b0: [number, number, number] = [0, roB * Math.cos(p0), roB * Math.sin(p0)];
    const b1: [number, number, number] = [0, riB * Math.cos(p0), riB * Math.sin(p0)];
    const b2: [number, number, number] = [0, riB * Math.cos(p1), riB * Math.sin(p1)];
    const b3: [number, number, number] = [0, roB * Math.cos(p1), roB * Math.sin(p1)];
    pushQuad(basePos, baseUv, b0, b1, b2, b3, [v0, 0], [v0, 1], [v1, 1], [v1, 0]);
  }

  const ribGs: THREE.BufferGeometry[] = [];
  for (const ur of [0.14, 0.32, 0.5, 0.68]) {
    const xr = ur * SHROUD_LEN;
    const rr = shroudInnerR(ur) - 0.024;
    if (rr <= 0.06) continue;
    const rPos: number[] = [];
    const rUv: number[] = [];
    const w = 0.042;
    for (let j = 0; j < nPhi; j++) {
      const p0 = -phiSpan / 2 + 0.03 + (j / nPhi) * (phiSpan - 0.06);
      const p1 = -phiSpan / 2 + 0.03 + ((j + 1) / nPhi) * (phiSpan - 0.06);
      const rOut = rr + 0.026;
      const a0: [number, number, number] = [xr - w / 2, rr * Math.cos(p0), rr * Math.sin(p0)];
      const a1: [number, number, number] = [xr + w / 2, rr * Math.cos(p0), rr * Math.sin(p0)];
      const a2: [number, number, number] = [xr + w / 2, rr * Math.cos(p1), rr * Math.sin(p1)];
      const a3: [number, number, number] = [xr - w / 2, rr * Math.cos(p1), rr * Math.sin(p1)];
      pushQuad(rPos, rUv, a0, a1, a2, a3, [0, 0], [1, 0], [1, 1], [0, 1]);
      const f0: [number, number, number] = [xr - w / 2, rOut * Math.cos(p0), rOut * Math.sin(p0)];
      const f3: [number, number, number] = [xr - w / 2, rOut * Math.cos(p1), rOut * Math.sin(p1)];
      pushQuad(rPos, rUv, f0, a0, a3, f3, [0, 0], [0, 1], [1, 1], [1, 0]);
      const k1: [number, number, number] = [xr + w / 2, rOut * Math.cos(p0), rOut * Math.sin(p0)];
      const k2: [number, number, number] = [xr + w / 2, rOut * Math.cos(p1), rOut * Math.sin(p1)];
      pushQuad(rPos, rUv, a1, k1, k2, a2, [0, 0], [0, 1], [1, 1], [1, 0]);
    }
    ribGs.push(makeGeo(rPos, rUv));
  }

  const frameGeo = merge([makeGeo(sidePos, sideUv), makeGeo(basePos, baseUv), ...ribGs]);
  return { outerGeo, noseCapGeo, linerGeo, frameGeo };
}

/** Sinh màng sóng xung kích plasma siêu vượt âm Mach 10 có màu đỉnh mờ dần mượt về 0 ở đuôi (không bị viền cắt cứng). */
function buildPlasmaShockGeo(len: number, rMax: number, power: number, xTip: number, streaks: number) {
  const nA = 28;
  const nP = 40;
  const pos: number[] = [];
  const col: number[] = [];
  const cCore = new THREE.Color(PAL3D.flameCore);
  const cMid = new THREE.Color(PAL3D.plasma);
  const cTail = new THREE.Color('#ff3b08');
  const tmp = new THREE.Color();

  const vertexColor = (u: number, phi: number): [number, number, number] => {
    const wave = streaks > 0 ? 0.72 + 0.28 * Math.cos(phi * streaks) : 1;
    // Cường độ sáng mạnh ở chóp mũi, tắt mượt theo hàm mũ ở đuôi sóng xung kích
    const fade = Math.pow(Math.max(0, 1 - u), 1.65) * (u > 0.35 ? wave : 1 - (u / 0.35) * (1 - wave));
    if (u < 0.22) {
      tmp.copy(cCore).lerp(cMid, u / 0.22);
    } else {
      tmp.copy(cMid).lerp(cTail, Math.min(1, (u - 0.22) / 0.78));
    }
    return [tmp.r * fade, tmp.g * fade, tmp.b * fade];
  };

  for (let i = 0; i < nA; i++) {
    const u0 = i / nA;
    const u1 = (i + 1) / nA;
    const x0 = xTip - u0 * len;
    const x1 = xTip - u1 * len;
    const r0 = 0.012 + rMax * Math.pow(u0, power);
    const r1 = 0.012 + rMax * Math.pow(u1, power);
    for (let j = 0; j < nP; j++) {
      const p0 = (j / nP) * Math.PI * 2;
      const p1 = ((j + 1) / nP) * Math.PI * 2;
      const v00: [number, number, number] = [x0, r0 * Math.cos(p0), r0 * Math.sin(p0)];
      const v01: [number, number, number] = [x0, r0 * Math.cos(p1), r0 * Math.sin(p1)];
      const v11: [number, number, number] = [x1, r1 * Math.cos(p1), r1 * Math.sin(p1)];
      const v10: [number, number, number] = [x1, r1 * Math.cos(p0), r1 * Math.sin(p0)];
      const c00 = vertexColor(u0, p0);
      const c01 = vertexColor(u0, p1);
      const c11 = vertexColor(u1, p1);
      const c10 = vertexColor(u1, p0);
      pos.push(...v00, ...v01, ...v11, ...v00, ...v11, ...v10);
      col.push(...c00, ...c01, ...c11, ...c00, ...c11, ...c10);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** Vây ổn định lưới thép mỏng xuyên sáng (lattice grid fin) đặc trưng tên lửa chiến lược Nga. */
const LatticeFin: React.FC<{ angleDeg: number; xPos: number; rRoot: number }> = ({ angleDeg, xPos, rRoot }) => {
  const finGeo = useMemo(() => {
    const chord = 0.14; // Bản mỏng theo chiều dòng khí để lộ rõ ô lưới tổ ong xuyên sáng
    const span = 0.44;
    const width = 0.62;
    const frameT = 0.018;
    const bladeT = 0.007;
    const parts: THREE.BufferGeometry[] = [];

    // Khung bao titan ngoài của vây lưới
    parts.push(
      rbox(chord, frameT, width, 0.004).clone().applyMatrix4(mat4([0, span, 0])),
      rbox(chord * 1.05, frameT * 1.2, width * 0.96, 0.004).clone().applyMatrix4(mat4([0, 0.07, 0])),
      rbox(chord, span - 0.05, frameT, 0.004).clone().applyMatrix4(mat4([0, span * 0.535, -width / 2])),
      rbox(chord, span - 0.05, frameT, 0.004).clone().applyMatrix4(mat4([0, span * 0.535, width / 2])),
    );

    // Các nan lưới chéo 45° đan ô hình thoi xuyên sáng
    const diagLen = 0.44;
    for (let k = -3; k <= 3; k++) {
      const zOff = k * 0.078;
      parts.push(
        rbox(chord * 0.88, diagLen, bladeT, 0.001).clone().applyMatrix4(mat4([0, span * 0.535, zOff], [Math.PI / 4, 0, 0])),
        rbox(chord * 0.88, diagLen, bladeT, 0.001).clone().applyMatrix4(mat4([0, span * 0.535, zOff], [-Math.PI / 4, 0, 0])),
      );
    }
    return merge(parts);
  }, []);

  return (
    <group position={[xPos, 0, 0]} rotation={[(angleDeg * Math.PI) / 180, 0, 0]}>
      {/* Cụm bản lề gập & cơ cấu truyền động chân vây */}
      <mesh position={[-0.04, rRoot + 0.025, 0]} geometry={rbox(0.42, 0.09, 0.18, 0.02)} material={plain(PAL3D.darkSteel, 0.46, 0.68)} castShadow />
      <mesh position={[0.04, rRoot + 0.075, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain(PAL3D.steel, 0.32, 0.82)}>
        <cylinderGeometry args={[0.028, 0.028, 0.24, 14]} />
      </mesh>
      <mesh position={[0.04, rRoot + 0.055, 0]} geometry={finGeo} material={plain('#8a949e', 0.36, 0.78)} castShadow receiveShadow />
    </group>
  );
};

/** Đầu đạn hồi quyển độc lập MIRV `OreshnikRV` (dài 2.10 m: x = -1.05 .. +1.05, đường kính đáy 0.54 m). */
export const OreshnikRV: React.FC<OreshnikRVProps> = ({
  plasma = 0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: OreshnikRVProps = {}) => {
  const pl = Math.max(0, Math.min(1.5, plasma));

  const geos = useMemo(() => {
    // Biên dạng nón biconic sắc nhọn 2.10 m (-1.05 .. +1.05), bán kính đáy 0.27 m — pháp tuyến chuẩn hướng ngoài
    const aftProfile: P2[] = [
      [0.001, -1.045],
      [0.24, -1.045],
      [0.27, -1.03],
      [0.264, -0.95],
      [0.222, -0.65],
      [0.181, -0.36],
      [0.001, -0.36],
    ];
    const bandProfile: P2[] = [
      [0.001, -0.36],
      [0.183, -0.36],
      [0.184, -0.335],
      [0.168, -0.22],
      [0.001, -0.22],
    ];
    const fwdProfile: P2[] = [
      [0.001, -0.22],
      [0.167, -0.22],
      [0.132, 0.08],
      [0.098, 0.36],
      [0.066, 0.6],
      [0.045, 0.76],
      [0.001, 0.76],
    ];
    const tipProfile: P2[] = [[0.001, 0.76]];
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const x = 0.76 + u * 0.29;
      const r =
        u < 0.92
          ? 0.045 * (1 - u * 0.84)
          : 0.045 * 0.227 * Math.sqrt(Math.max(0, 1 - Math.pow((u - 0.92) / 0.08, 2)));
      tipProfile.push([Math.max(0.0015, r), x]);
    }

    return {
      aft: latheOut(aftProfile, 40),
      band: latheOut(bandProfile, 40),
      fwd: latheOut(fwdProfile, 40),
      tip: latheOut(tipProfile, 32),
      shockOuter: buildPlasmaShockGeo(2.55, 0.44, 0.62, 1.1, 8),
      shockInner: buildPlasmaShockGeo(1.55, 0.21, 0.66, 1.072, 0),
    };
  }, []);

  const carbonMat = useMemo(
    () =>
      paint({
        color: PAL3D.rvCarbon,
        camo: ['#1c2027', '#323944'],
        camoScale: 3.0,
        wear: 0.18,
        dirt: 0.12,
        roughness: 0.68,
        metalness: 0.26,
        repeat: 2,
        seed: 61,
      }),
    [],
  );

  const bandRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      pts.push([-0.3, Math.cos(a) * 0.177, Math.sin(a) * 0.177]);
    }
    return pts;
  }, []);

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* Thân sau vật liệu chịu nhiệt carbon-phenolic đen nhám */}
      <mesh geometry={geos.aft} material={carbonMat} castShadow receiveShadow />
      {/* Ổ khớp cơ khí đáy + 4 cánh rãnh nhỏ tạo xoáy ổn định trục */}
      <mesh position={[-1.03, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.darkSteel, 0.42, 0.76)}>
        <cylinderGeometry args={[0.115, 0.135, 0.045, 24]} />
      </mesh>
      {[0, 90, 180, 270].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <mesh
            key={deg}
            position={[-0.93, Math.cos(rad) * 0.256, Math.sin(rad) * 0.256]}
            rotation={[rad, 0, 0.11]}
            geometry={rbox(0.2, 0.022, 0.028, 0.005)}
            material={plain('#3c434d', 0.45, 0.65)}
          />
        );
      })}

      {/* Đai kim loại cân bằng trọng tâm & vòng cảm biến đồng */}
      <mesh geometry={geos.band} material={plain(PAL3D.steel, 0.3, 0.86)} castShadow receiveShadow />
      <mesh position={[-0.255, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.brass, 0.3, 0.88)}>
        <cylinderGeometry args={[0.172, 0.175, 0.03, 36]} />
      </mesh>
      <Rivets points={bandRivets} r={0.007} color={PAL3D.darkSteel} />

      {/* Thân nón biconic trước & đầu mũi xuyên hợp kim vonfram */}
      <mesh geometry={geos.fwd} material={carbonMat} castShadow receiveShadow />
      <mesh geometry={geos.tip} material={plain('#8c96a2', 0.24, 0.92)} castShadow />

      {/* Màng sóng xung kích & đầu mũi phát sáng plasma cam-trắng rực rỡ ở tốc độ Mach 10 */}
      {pl > 0.01 && (
        <group>
          <mesh geometry={geos.tip} scale={[1.015, 1.04, 1.04]}>
            <meshBasicMaterial
              color={PAL3D.flameCore}
              transparent
              opacity={Math.min(0.96, 0.45 + pl * 0.55)}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={geos.shockInner}>
            <meshBasicMaterial
              vertexColors
              transparent
              opacity={Math.min(0.82, pl * 0.65)}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh geometry={geos.shockOuter}>
            <meshBasicMaterial
              vertexColors
              transparent
              opacity={Math.min(0.72, pl * 0.52)}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

/**
 * Tên lửa đạn đạo tầm trung đa đầu đạn MIRV `Oreshnik`
 * Dài tổng đúng 16.00 m (x: -8.00 .. +8.00), đường kính tầng 1: 1.80 m (r = 0.90 m).
 */
export const Oreshnik: React.FC<OreshnikProps> = ({
  plume = 0,
  shroudOpen = 0,
  busOnly = false,
  rvPresent = 6,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
}: OreshnikProps = {}) => {
  const open = Math.max(0, Math.min(1, shroudOpen));
  const pl = Math.max(0, plume);
  const rvCount = Math.max(0, Math.min(6, Math.round(rvPresent)));

  const geos = useMemo(() => {
    // 1) Tầng 1: loa phụt gimbal (-8.00 .. -7.24) + váy đuôi & thân chính r = 0.90 m (-7.42 .. -1.06)
    const nozzle1: P2[] = [
      [0.48, -8.0],
      [0.55, -8.0],
      [0.45, -7.65],
      [0.32, -7.36],
      [0.37, -7.24],
      [0.24, -7.24],
      [0.24, -7.38],
      [0.47, -7.98],
      [0.48, -8.0],
    ];
    const stage1Hull: P2[] = [
      [0.001, -7.42],
      [0.77, -7.42],
      [0.85, -7.25],
      [0.9, -7.02],
      [0.9, -1.08],
      [0.86, -1.05],
      [0.001, -1.05],
    ];
    // Lõi côn thu chuyển tầng bên trong khung giàn tách tầng (-1.06 .. -0.42)
    const interstageCore: P2[] = [
      [0.001, -1.06],
      [0.76, -1.06],
      [0.74, -0.42],
      [0.001, -0.42],
    ];
    // 2) Tầng 2 nhiên liệu rắn (-0.42 .. +3.08, r = 0.855 m)
    const stage2Hull: P2[] = [
      [0.001, -0.42],
      [0.855, -0.42],
      [0.855, 3.04],
      [0.875, 3.08],
      [0.001, 3.08],
    ];
    // 3) Khoang Post-Boost MIRV Bus (+3.08 .. +4.82, loe nhẹ từ 0.875 lên đúng r = 0.90 m của chóp bảo vệ)
    const busHull: P2[] = [
      [0.001, 3.08],
      [0.82, 3.08],
      [0.875, 3.16],
      [0.9, 3.55],
      [0.9, 4.8],
      [0.858, 4.82],
      [0.001, 4.82],
    ];
    const busNozzle: P2[] = [
      [0.19, 2.78],
      [0.22, 2.78],
      [0.12, 3.06],
      [0.09, 3.1],
      [0.07, 3.06],
      [0.18, 2.79],
      [0.19, 2.78],
    ];

    // Giàn thanh giằng chữ V tách tầng kiểu Nga (Warren interstage truss, 16 thanh xiên quanh chu vi)
    const trussParts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) {
      const a0 = (i / 16) * Math.PI * 2;
      const a1 = ((i + 0.5) / 16) * Math.PI * 2;
      const a2 = ((i + 1) / 16) * Math.PI * 2;
      const pA = new THREE.Vector3(-1.04, Math.cos(a0) * 0.875, Math.sin(a0) * 0.875);
      const pB = new THREE.Vector3(-0.44, Math.cos(a1) * 0.842, Math.sin(a1) * 0.842);
      const pC = new THREE.Vector3(-1.04, Math.cos(a2) * 0.875, Math.sin(a2) * 0.875);
      for (const [u, v] of [
        [pA, pB],
        [pB, pC],
      ] as const) {
        const mid = u.clone().add(v).multiplyScalar(0.5);
        const dir = v.clone().sub(u);
        const len = dir.length();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        const cyl = new THREE.CylinderGeometry(0.022, 0.022, len, 8);
        cyl.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)));
        trussParts.push(cyl);
      }
    }

    const { outerGeo, noseCapGeo, linerGeo, frameGeo } = buildPetalGeometries((Math.PI * 2) / 3, 28, 18);

    return {
      nozzle1: latheOut(nozzle1, 40),
      stage1Hull: latheOut(stage1Hull, 48),
      interstageCore: latheOut(interstageCore, 36),
      interstageTruss: merge(trussParts),
      stage2Hull: latheOut(stage2Hull, 48),
      busHull: latheOut(busHull, 48),
      busNozzle: latheOut(busNozzle, 28),
      petalOuter: outerGeo,
      petalNoseCap: noseCapGeo,
      petalLiner: linerGeo,
      petalFrame: frameGeo,
    };
  }, []);

  const matStage1 = useMemo(
    () =>
      paint({
        color: '#4c5b46',
        camo: [PAL3D.oreshnikBase, PAL3D.oreshnikCamo2, PAL3D.oreshnikCamo1],
        camoScale: 1.5,
        wear: 0.24,
        dirt: 0.22,
        roughness: 0.58,
        metalness: 0.3,
        repeat: 1,
        seed: 41,
      }),
    [],
  );

  const matStage2 = useMemo(
    () =>
      paint({
        color: '#51604a',
        camo: [PAL3D.oreshnikCamo2, PAL3D.oreshnikBase],
        camoScale: 1.65,
        wear: 0.22,
        dirt: 0.18,
        roughness: 0.56,
        metalness: 0.32,
        repeat: 1,
        seed: 53,
      }),
    [],
  );

  const matShroud = useMemo(
    () =>
      paint({
        color: '#4e5d48',
        camo: [PAL3D.oreshnikBase, PAL3D.oreshnikCamo2],
        camoScale: 1.35,
        wear: 0.2,
        dirt: 0.14,
        roughness: 0.55,
        metalness: 0.32,
        repeat: 1,
        seed: 67,
      }),
    [],
  );

  const boosterRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    const rings: [number, number][] = [
      [-6.95, 0.924],
      [-5.15, 0.924],
      [-3.25, 0.924],
      [-1.12, 0.924],
      [-0.38, 0.878],
      [1.18, 0.878],
      [2.88, 0.878],
    ];
    for (const [rx, rr] of rings) {
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        pts.push([rx, Math.cos(a) * rr, Math.sin(a) * rr]);
      }
    }
    return pts;
  }, []);

  const busRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (const rx of [3.18, 4.18, 4.74]) {
      const rr = rx < 3.4 ? 0.894 : 0.916;
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        pts.push([rx, Math.cos(a) * rr, Math.sin(a) * rr]);
      }
    }
    return pts;
  }, []);

  // Góc mở bản lề cánh chóp bảo vệ (0 -> ~58°); đặt pha xoay 30°, 150°, 270° mở cửa sổ 120° lộ trọn 6 đầu đạn
  const petalAngle = open * 1.02;
  const rHinge = 0.885;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ==================== TẦNG ĐẨY 1 & TẦNG ĐẨY 2 (ẩn khi busOnly) ==================== */}
      {!busOnly && (
        <group>
          {/* Loa phụt chính tầng 1 + 4 cụm cơ cấu lái vector lực đẩy (TVC pods) */}
          <mesh geometry={geos.nozzle1} material={plain('#2d333b', 0.5, 0.65)} castShadow />
          <mesh position={[-7.55, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#16191d', 0.86, 0.2)}>
            <cylinderGeometry args={[0.25, 0.43, 0.72, 28, 1, true]} />
          </mesh>
          {[0, 90, 180, 270].map((deg) => (
            <group key={deg} position={[-7.3, 0, 0]} rotation={[(deg * Math.PI) / 180, 0, 0]}>
              <mesh position={[0, 0.82, 0]} geometry={rbox(0.5, 0.14, 0.22, 0.035)} material={plain(PAL3D.darkSteel, 0.46, 0.68)} castShadow />
            </group>
          ))}

          {/* Thân tầng 1 (Ø 1.80 m) */}
          <mesh geometry={geos.stage1Hull} material={matStage1} castShadow receiveShadow />

          {/* Các đai gân sabots định tâm trong ống phóng, khớp nối tầng & vạch chuẩn kỹ thuật */}
          {[-6.95, -5.15, -3.25, -1.12].map((rx, idx) => (
            <group key={rx} position={[rx, 0, 0]}>
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                material={plain(idx % 2 === 0 ? '#3e464e' : '#5e6b56', 0.44, 0.62)}
                castShadow
              >
                <cylinderGeometry args={[0.922, 0.922, idx === 3 ? 0.18 : 0.13, 48]} />
              </mesh>
              {idx === 1 && (
                <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#a8b3a2', 0.55, 0.25)}>
                  <cylinderGeometry args={[0.904, 0.904, 0.055, 48]} />
                </mesh>
              )}
            </group>
          ))}

          {/* 4 vây ổn định lưới thép mỏng xuyên sáng ở gốc đuôi tầng 1 */}
          {[45, 135, 225, 315].map((deg) => (
            <LatticeFin key={deg} angleDeg={deg} xPos={-7.08} rRoot={0.89} />
          ))}

          {/* Khoang giàn thanh giằng chữ V tách tầng (vented interstage truss) đặc trưng tên lửa Nga */}
          <mesh geometry={geos.interstageCore} material={plain('#2b3138', 0.6, 0.52)} castShadow receiveShadow />
          <mesh geometry={geos.interstageTruss} material={plain('#7a848e', 0.38, 0.78)} castShadow />

          {/* Thân tầng 2 nhiên liệu rắn */}
          <mesh geometry={geos.stage2Hull} material={matStage2} castShadow receiveShadow />
          {[-0.38, 1.18, 2.88].map((rx, idx) => (
            <group key={rx} position={[rx, 0, 0]}>
              <mesh
                rotation={[0, 0, Math.PI / 2]}
                material={plain(idx === 1 ? '#5f6d57' : '#3e464e', 0.44, 0.64)}
                castShadow
              >
                <cylinderGeometry args={[0.876, 0.876, 0.13, 48]} />
              </mesh>
              {idx === 1 && (
                <mesh position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#a8b3a2', 0.55, 0.25)}>
                  <cylinderGeometry args={[0.858, 0.858, 0.05, 48]} />
                </mesh>
              )}
            </group>
          ))}

          {/* 2 ống dẫn cáp điều khiển chạy dọc thân (cable raceways) ở ±Y */}
          {[1, -1].map((sgn) => (
            <group key={sgn} rotation={[sgn > 0 ? 0 : Math.PI, 0, 0]}>
              <mesh position={[-3.98, 0.92, 0]} geometry={rbox(5.72, 0.068, 0.13, 0.018)} material={plain('#3c4738', 0.52, 0.48)} castShadow />
              <mesh position={[1.34, 0.874, 0]} geometry={rbox(3.26, 0.062, 0.12, 0.018)} material={plain('#3c4738', 0.52, 0.48)} castShadow />
              {[-6.2, -4.4, -2.4, 0.35, 2.05].map((cx) => (
                <mesh
                  key={cx}
                  position={[cx, cx < -1 ? 0.932 : 0.886, 0]}
                  geometry={rbox(0.085, 0.078, 0.175, 0.01)}
                  material={plain(PAL3D.steel, 0.38, 0.76)}
                />
              ))}
            </group>
          ))}

          <Rivets points={boosterRivets} r={0.014} color="#8b9784" />

          {/* Luồng lửa động cơ đẩy chính tầng 1 */}
          {pl > 0.01 && (
            <group position={[-8.0, 0, 0]}>
              <mesh position={[-0.25 - pl * 2.6, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.72 + pl * 0.25, 1.4 + pl * 5.2, 24, 1, true]} />
                <meshBasicMaterial
                  color={PAL3D.flame}
                  transparent
                  opacity={Math.min(0.88, 0.45 + pl * 0.45)}
                  side={THREE.DoubleSide}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
              <mesh position={[-0.12 - pl * 1.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.42 + pl * 0.12, 0.9 + pl * 2.7, 20]} />
                <meshBasicMaterial
                  color={PAL3D.flameCore}
                  transparent
                  opacity={Math.min(0.96, 0.6 + pl * 0.4)}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  toneMapped={false}
                />
              </mesh>
            </group>
          )}
        </group>
      )}

      {/* ==================== KHOANG POST-BOOST MIRV BUS (x = +3.08 .. +5.55) ==================== */}
      <group>
        <mesh geometry={geos.busHull} material={matStage2} castShadow receiveShadow />

        {/* Đáy động cơ khoang Bus (lộ rõ khi tách tầng busOnly = true) */}
        <mesh position={[3.1, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#2d343c', 0.52, 0.66)}>
          <cylinderGeometry args={[0.81, 0.81, 0.05, 36]} />
        </mesh>
        <mesh position={[3.12, 0, 0]} material={plain(PAL3D.brass, 0.34, 0.82)}>
          <sphereGeometry args={[0.38, 24, 16]} />
        </mesh>
        <mesh geometry={geos.busNozzle} material={plain(PAL3D.darkSteel, 0.4, 0.78)} />

        {/* Vành khớp tách tầng & cửa sổ kính ngắm sao dẫn đường quán tính */}
        <mesh position={[3.16, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#414a54', 0.42, 0.7)} castShadow>
          <cylinderGeometry args={[0.892, 0.882, 0.14, 48]} />
        </mesh>
        <mesh position={[4.74, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#414a54', 0.4, 0.74)} castShadow>
          <cylinderGeometry args={[0.914, 0.914, 0.12, 48]} />
        </mesh>
        <group position={[4.28, 0.895, 0]}>
          <mesh geometry={rbox(0.28, 0.05, 0.24, 0.015)} material={plain(PAL3D.brass, 0.34, 0.82)} />
          <mesh position={[0, 0.018, 0]} geometry={rbox(0.18, 0.03, 0.15, 0.008)} material={plain('#2c4d6e', 0.12, 0.9)} />
        </group>

        {/* 4 cụm loa phụt hiệu chỉnh thái độ nhỏ (attitude vernier thrusters) xếp chữ thập */}
        {[0, 90, 180, 270].map((deg) => (
          <group key={deg} position={[3.78, 0, 0]} rotation={[(deg * Math.PI) / 180, 0, 0]}>
            <mesh position={[0, 0.92, 0]} geometry={rbox(0.56, 0.11, 0.2, 0.03)} material={plain('#3e4650', 0.42, 0.72)} castShadow />
            <mesh position={[-0.29, 0.93, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.steel, 0.34, 0.82)}>
              <coneGeometry args={[0.048, 0.11, 14, 1, true]} />
            </mesh>
            <mesh position={[0.29, 0.93, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain(PAL3D.steel, 0.34, 0.82)}>
              <coneGeometry args={[0.04, 0.09, 14, 1, true]} />
            </mesh>
            <mesh position={[0, 0.985, 0]} material={plain(PAL3D.brass, 0.32, 0.85)}>
              <cylinderGeometry args={[0.038, 0.024, 0.06, 14]} />
            </mesh>
            {busOnly && pl > 0.05 && (
              <mesh position={[-0.46, 0.93, 0]} rotation={[0, 0, Math.PI / 2]}>
                <coneGeometry args={[0.07, 0.35 * pl, 10]} />
                <meshBasicMaterial color={PAL3D.flameCore} transparent opacity={0.75} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
              </mesh>
            )}
          </group>
        ))}

        {/* Mâm bệ phân phối đa đầu đạn (MIRV Dispenser Deck) sáng cơ khí titan/thép để nổi bật 6 đầu đạn đen */}
        <mesh position={[4.8, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#5a6572', 0.42, 0.74)} receiveShadow>
          <cylinderGeometry args={[0.855, 0.855, 0.1, 48]} />
        </mesh>
        {/* Trụ rốn cáp & dẫn đường trung tâm giữa 6 giếng đầu đạn */}
        <mesh position={[5.18, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.steel, 0.35, 0.82)} castShadow>
          <cylinderGeometry args={[0.085, 0.15, 0.76, 24]} />
        </mesh>
        <mesh position={[5.62, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain(PAL3D.brass, 0.32, 0.86)}>
          <coneGeometry args={[0.085, 0.15, 24]} />
        </mesh>

        {/* 6 giếng gắn đầu đạn xếp vòng tròn lục giác (R = 0.525 m) + hiển thị rvPresent (0..6) đầu đạn */}
        {Array.from({ length: 6 }, (_, i) => {
          const ang = (i * Math.PI) / 3;
          const wy = Math.cos(ang) * 0.525;
          const wz = Math.sin(ang) * 0.525;
          const hasRV = i < rvCount;
          return (
            <group key={i} position={[4.82, wy, wz]} rotation={[ang, 0, 0]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={plain('#20262e', 0.58, 0.62)}>
                <cylinderGeometry args={[0.278, 0.285, 0.12, 28]} />
              </mesh>
              <mesh position={[0.045, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.steel, 0.32, 0.85)}>
                <cylinderGeometry args={[0.286, 0.286, 0.036, 28, 1, true]} />
              </mesh>
              <mesh position={[0.14, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(PAL3D.brass, 0.34, 0.82)}>
                <cylinderGeometry args={[0.055, 0.072, 0.24, 16]} />
              </mesh>
              {[0, 120, 240].map((cDeg) => {
                const cr = (cDeg * Math.PI) / 180;
                return (
                  <mesh
                    key={cDeg}
                    position={[0.07, Math.cos(cr) * 0.275, Math.sin(cr) * 0.275]}
                    rotation={[cr, 0, 0]}
                    geometry={rbox(0.09, 0.045, 0.045, 0.008)}
                    material={plain(PAL3D.steel, 0.36, 0.82)}
                  />
                );
              })}

              {hasRV && (
                <group rotation={[0, 0, -0.078]}>
                  <OreshnikRV position={[1.05, 0, 0]} scale={0.96} />
                </group>
              )}
            </group>
          );
        })}

        <Rivets points={busRivets} r={0.013} color="#8f9b88" />

        {busOnly && pl > 0.02 && (
          <mesh position={[2.45 - pl * 0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.24, 0.7 + pl * 0.8, 18]} />
            <meshBasicMaterial color={PAL3D.flameCore} transparent opacity={0.78} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </mesh>
        )}
      </group>

      {/* ==================== CHÓP MŨI BẢO VỆ 3 CÁNH OGIVE (x = +4.80 .. +8.00) ==================== */}
      <group position={[4.8, 0, 0]}>
        {[0, 1, 2].map((k) => {
          // Đặt góc cánh ở 30°, 150°, 270° để khe mở 120° hướng thẳng ra góc nhìn chính, phô trọn mâm 6 đầu đạn MIRV
          const basePhi = Math.PI / 6 + (k * Math.PI * 2) / 3;
          return (
            <group key={k} rotation={[basePhi, 0, 0]}>
              <mesh position={[0.02, rHinge, -0.26]} geometry={rbox(0.15, 0.095, 0.1, 0.015)} material={plain(PAL3D.steel, 0.38, 0.78)} />
              <mesh position={[0.02, rHinge, 0.26]} geometry={rbox(0.15, 0.095, 0.1, 0.015)} material={plain(PAL3D.steel, 0.38, 0.78)} />
              <group position={[open * 0.05, rHinge + open * 0.035, 0]} rotation={[0, 0, petalAngle]}>
                <group position={[0, -rHinge, 0]}>
                  <mesh geometry={geos.petalOuter} material={matShroud} castShadow receiveShadow />
                  <mesh geometry={geos.petalNoseCap} material={plain('#858f99', 0.32, 0.85)} castShadow />
                  <mesh geometry={geos.petalLiner} material={plain('#8b7850', 0.62, 0.28)} receiveShadow />
                  <mesh geometry={geos.petalFrame} material={plain('#505964', 0.42, 0.72)} castShadow />
                </group>
              </group>
            </group>
          );
        })}
      </group>
    </group>
  );
};

export const MODELS: ModelSet = {
  Oreshnik: { C: () => <Oreshnik position={[0, 2.35, 0]} shroudOpen={0.65} />, size: 16.2, center: [0, 2.35, 0] },
  OreshnikRV: { C: () => <OreshnikRV position={[0, 0.8, 0]} plasma={0.5} />, size: 2.5, center: [0, 0.8, 0] },
};
