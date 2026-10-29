// Mô hình 3D F-15C/D Eagle Chiến tranh Lạnh (1:1 theo mét thật: dài 19.43 m, sải cánh 13.05 m, cao 5.63 m).
// Phục vụ S05 (tai nạn gãy dầm upper-right longeron Missouri 2007 + phóng ghế ACES II)
// và S09 (F-15D Israel hạ cánh 1 cánh ở tốc độ 260 knot năm 1983).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, pipe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import type { ModelSet } from '@lib/3d/turntable';
import { P } from '../palette';

export type F15LegacyProps = {
  gear?: number;
  wheelSpin?: number;
  afterburner?: number;
  breakSplit?: number;
  ejectProgress?: number;
  missingRightWing?: boolean;
};

/** Toạ độ điểm gãy dầm upper-right longeron ngay sau buồng lái (x = +3.10 m, y = 2.55 m, z = +0.58 m). */
export const F15_BREAK_POS: [number, number, number] = [3.1, 2.55, 0.58];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smooth01 = (v: number) => {
  const c = clamp01(v);
  return c * c * (3 - 2 * c);
};

// ---------------- Công cụ loft mặt cắt thân & cánh có UV mét thật liền mạch ----------------

type FuseSec = {
  x: number;
  cy: number;
  ryTop: number;
  ryBot: number;
  rzTop: number;
  rzBot: number;
  /** Bậc siêu elip: 2 = elip tròn, >2 = vai hộp đặc trưng F-15 */
  pTop?: number;
  pBot?: number;
  /** Bề rộng gờ chine/sống thân ngang hông */
  chineZ?: number;
  chineY?: number;
};

const sgnPow = (v: number, e: number) => Math.sign(v) * Math.pow(Math.abs(v), e);

const evalFuseRing = (s: FuseSec, seg = 36): [number, number, number][] => {
  const pts: [number, number, number][] = [];
  const pT = s.pTop ?? 2.1;
  const pB = s.pBot ?? 2.2;
  for (let j = 0; j < seg; j++) {
    // theta = 0 ở đỉnh (+Y), pi/2 ở hông phải (+Z), pi ở bụng (-Y), 3pi/2 ở hông trái (-Z)
    const th = (j / seg) * Math.PI * 2;
    const c = Math.cos(th);
    const sn = Math.sin(th);
    const upper = c >= 0;
    const exp = 2 / (upper ? pT : pB);
    const ry = upper ? s.ryTop : s.ryBot;
    const rz = upper ? s.rzTop : s.rzBot;
    const y = s.cy + ry * sgnPow(c, exp);
    let z = rz * sgnPow(sn, exp);
    if (s.chineZ && s.chineZ > rz) {
      const w = Math.pow(Math.abs(sn), 6) * Math.exp(-Math.pow((c - (s.chineY ?? -0.05)) * 2.6, 2));
      z += Math.sign(sn) * (s.chineZ - rz) * w;
    }
    pts.push([s.x, y, z]);
  }
  return pts;
};

const buildLoftRings = (
  rings: [number, number, number][][],
  capStart = false,
  capEnd = false,
): THREE.BufferGeometry => {
  const n = rings.length;
  const m = rings[0].length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i < n; i++) {
    let arc = 0;
    for (let j = 0; j <= m; j++) {
      const p = rings[i][j % m];
      if (j > 0) {
        const prev = rings[i][(j - 1) % m];
        arc += Math.hypot(p[1] - prev[1], p[2] - prev[2]);
      }
      pos.push(p[0], p[1], p[2]);
      // UV tính theo mét thật để khớp tuyệt đối qua mặt cắt x = 3.10 m
      uv.push(p[0], arc);
    }
  }

  const stride = m + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * stride + j;
      const b = a + 1;
      const c = (i + 1) * stride + j + 1;
      const d = (i + 1) * stride + j;
      idx.push(a, b, c, a, c, d);
    }
  }

  const addCap = (ringIdx: number, flip: boolean) => {
    const ring = rings[ringIdx];
    let cx = 0, cy = 0, cz = 0;
    for (const p of ring) {
      cx += p[0];
      cy += p[1];
      cz += p[2];
    }
    cx /= m;
    cy /= m;
    cz /= m;
    const cIdx = pos.length / 3;
    pos.push(cx, cy, cz);
    uv.push(cx, 0);
    const base = pos.length / 3;
    for (let j = 0; j < m; j++) {
      const p = ring[j];
      pos.push(p[0], p[1], p[2]);
      uv.push(p[1], p[2]);
    }
    for (let j = 0; j < m; j++) {
      const a = base + j;
      const b = base + ((j + 1) % m);
      if (flip) idx.push(cIdx, b, a);
      else idx.push(cIdx, a, b);
    }
  };

  if (capStart) addCap(0, true);
  if (capEnd) addCap(n - 1, false);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

type WingSec = {
  z: number;
  xLE: number;
  xTE: number;
  y: number;
  t: number;
  camber?: number;
};

/** Dựng cánh biên dạng khí động siêu âm (z tăng dần z0 < z1 để pháp tuyến hướng ra ngoài). */
const buildAirfoilWing = (secs: WingSec[], capInner = true, capOuter = true): THREE.BufferGeometry => {
  const chordU = [1.0, 0.88, 0.72, 0.54, 0.36, 0.2, 0.08, 0.02, 0.0];
  const rings: [number, number, number][][] = secs.map((s) => {
    const c = s.xLE - s.xTE;
    const cam = s.camber ?? 0.008;
    const pts: [number, number, number][] = [];
    for (let k = 0; k < chordU.length; k++) {
      const u = chordU[k];
      const halfT = s.t * 0.5 * Math.sin(Math.pow(u, 0.72) * Math.PI);
      const yc = cam * c * Math.sin(u * Math.PI);
      const x = s.xLE - u * c;
      pts.push([x, s.y + yc + halfT, s.z]);
    }
    for (let k = chordU.length - 2; k >= 1; k--) {
      const u = chordU[k];
      const halfT = s.t * 0.44 * Math.sin(Math.pow(u, 0.72) * Math.PI);
      const yc = cam * c * Math.sin(u * Math.PI);
      const x = s.xLE - u * c;
      pts.push([x, s.y + yc - halfT, s.z]);
    }
    return pts;
  });

  const n = rings.length;
  const m = rings[0].length;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i < n; i++) {
    for (let j = 0; j <= m; j++) {
      const p = rings[i][j % m];
      pos.push(p[0], p[1], p[2]);
      uv.push(p[0], p[2]);
    }
  }
  const stride = m + 1;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < m; j++) {
      const a = i * stride + j;
      const b = (i + 1) * stride + j;
      const c = (i + 1) * stride + j + 1;
      const d = a + 1;
      idx.push(a, b, c, a, c, d);
    }
  }

  const capWing = (ri: number, positiveZ: boolean) => {
    const ring = rings[ri];
    let cx = 0, cy = 0;
    const cz = ring[0][2];
    for (const p of ring) {
      cx += p[0];
      cy += p[1];
    }
    cx /= m;
    cy /= m;
    const cIdx = pos.length / 3;
    pos.push(cx, cy, cz);
    uv.push(cx, cz);
    const base = pos.length / 3;
    for (let j = 0; j < m; j++) {
      const p = ring[j];
      pos.push(p[0], p[1], p[2]);
      uv.push(p[0], p[1]);
    }
    for (let j = 0; j < m; j++) {
      const a = base + j;
      const b = base + ((j + 1) % m);
      if (positiveZ) idx.push(cIdx, b, a);
      else idx.push(cIdx, a, b);
    }
  };

  if (capInner) capWing(0, false);
  if (capOuter) capWing(n - 1, true);

  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
};

// ---------------- Mặt cắt chuẩn tại vách ngăn x = +3.10 m (khớp 100% hai cụm thân) ----------------

const BREAK_SEC: FuseSec = {
  x: 3.1,
  cy: 1.97,
  ryTop: 0.77,
  ryBot: 0.67,
  rzTop: 0.69,
  rzBot: 0.73,
  pTop: 2.35,
  pBot: 2.6,
  chineZ: 0.84,
  chineY: 0.22,
};

// ---------------- Linh kiện phụ trợ: AIM-7 Sparrow, Giá treo cánh, Loa phụt F100 ----------------

const Aim7Sparrow: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const bodyGeo = useMemo(
    () =>
      lathe(
        [
          [0.001, -1.8],
          [0.102, -1.78],
          [0.102, 1.12],
          [0.092, 1.34],
          [0.068, 1.56],
          [0.036, 1.72],
          [0.002, 1.82],
        ],
        20,
      ),
    [],
  );
  const noseGeo = useMemo(
    () =>
      lathe(
        [
          [0.103, 1.1],
          [0.092, 1.34],
          [0.068, 1.56],
          [0.036, 1.72],
          [0.002, 1.82],
        ],
        20,
      ),
    [],
  );
  const midFinGeo = useMemo(() => extrude([[0.28, 0.09], [-0.26, 0.09], [-0.34, 0.51], [-0.14, 0.51]], 0.018, 0.003), []);
  const tailFinGeo = useMemo(() => extrude([[-1.34, 0.09], [-1.78, 0.09], [-1.8, 0.36], [-1.58, 0.36]], 0.016, 0.003), []);
  const finAngles = [Math.PI * 0.25, Math.PI * 0.75, Math.PI * 1.25, Math.PI * 1.75];

  return (
    <group position={position}>
      <mesh geometry={bodyGeo} material={plain(P.ordWhite, 0.38, 0.18)} castShadow receiveShadow />
      <mesh geometry={noseGeo} material={plain(P.ordDark, 0.42, 0.22)} castShadow />
      <mesh position={[0.62, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(P.amber, 0.4, 0.2)}>
        <cylinderGeometry args={[0.104, 0.104, 0.08, 18]} />
      </mesh>
      <mesh position={[-0.78, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#6e4b32', 0.45, 0.2)}>
        <cylinderGeometry args={[0.104, 0.104, 0.08, 18]} />
      </mesh>
      {finAngles.map((ang, k) => (
        <group key={k} rotation={[ang, 0, 0]}>
          <mesh geometry={midFinGeo} material={plain(P.ordMid, 0.42, 0.48)} castShadow />
          <mesh geometry={tailFinGeo} material={plain(P.ordMid, 0.42, 0.48)} castShadow />
        </group>
      ))}
    </group>
  );
};

/** Giá treo cánh trong (Station 2 & Station 8) kèm thanh ray hông LAU-114 chuẩn F-15C/D */
const InboardWingPylon: React.FC<{ z: number; matPylon: THREE.Material }> = ({ z, matPylon }) => {
  const pylonGeo = useMemo(
    () =>
      extrude(
        [
          [0.95, 2.3],
          [0.42, 1.72],
          [-2.35, 1.74],
          [-2.78, 2.02],
          [-2.52, 2.3],
        ],
        0.15,
        0.02,
      ),
    [],
  );
  const railGeo = useMemo(() => rbox(2.55, 0.085, 0.065, 0.015), []);
  return (
    <group position={[0, 0, z]}>
      <mesh geometry={pylonGeo} material={matPylon} castShadow receiveShadow />
      <mesh geometry={railGeo} position={[-0.72, 1.98, 0.125]} material={plain(P.legMid, 0.5, 0.35)} castShadow />
      <mesh geometry={railGeo} position={[-0.72, 1.98, -0.125]} material={plain(P.legMid, 0.5, 0.35)} castShadow />
      <mesh geometry={rbox(1.9, 0.06, 0.17, 0.015)} position={[-0.85, 1.7, 0]} material={plain(P.ordDark, 0.45, 0.55)} />
    </group>
  );
};

/** Loa phụt động cơ Pratt & Whitney F100-PW-220 trần thanh truyền đặc trưng F-15C/D + luồng lửa buồng đốt hậu */
const F100Nozzle: React.FC<{ z: number; ab: number }> = ({ z, ab }) => {
  const abClamped = clamp01(ab);
  const throatR = 0.44 + abClamped * 0.045;
  const nozzleOuterGeo = useMemo(
    () =>
      lathe(
        [
          [0.57, -8.02],
          [0.56, -8.32],
          [0.52, -8.72],
          [0.46, -9.28],
          [0.42, -9.28],
          [0.46, -8.68],
          [0.45, -8.05],
        ],
        28,
      ),
    [],
  );
  const nozzleRingGeo = useMemo(
    () =>
      lathe(
        [
          [0.59, -8.02],
          [0.59, -8.2],
          [0.565, -8.25],
          [0.565, -8.02],
        ],
        28,
      ),
    [],
  );
  const innerDuctGeo = useMemo(
    () =>
      lathe(
        [
          [0.01, -7.85],
          [0.43, -7.88],
          [0.43, -9.24],
        ],
        24,
      ),
    [],
  );

  const flameLen = 5.4 * abClamped;

  return (
    <group position={[0, 1.88, z]}>
      <mesh
        geometry={nozzleOuterGeo}
        scale={[1, throatR / 0.45, throatR / 0.45]}
        material={plain('#3c424c', 0.36, 0.8)}
        castShadow
      />
      <mesh geometry={nozzleRingGeo} material={plain('#6c7582', 0.32, 0.82)} castShadow />
      <mesh geometry={innerDuctGeo} material={plain('#16181d', 0.85, 0.25)} />
      {/* Vòng đốt hậu bên trong họng động cơ */}
      <mesh
        position={[-8.45, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={plain('#2b2019', 0.4, 0.3, {
          emissive: new THREE.Color(abClamped > 0.02 ? P.amberHot : '#1a120d'),
          emissiveIntensity: abClamped * 3.8,
        })}
      >
        <torusGeometry args={[0.31, 0.035, 10, 24]} />
      </mesh>
      <mesh
        position={[-8.3, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
        material={plain('#231b15', 0.5, 0.4, {
          emissive: new THREE.Color(abClamped > 0.02 ? P.flame : '#000000'),
          emissiveIntensity: abClamped * 2.8,
        })}
      >
        <circleGeometry args={[0.41, 24]} />
      </mesh>

      {/* 16 thanh truyền co giãn cánh hoa nằm dọc thân loa phụt ("turkey-featherless" chuẩn USAF/IDF F-15C/D) */}
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        const rMid = 0.528 * (throatR / 0.45);
        return (
          <group key={i} rotation={[a, 0, 0]}>
            <mesh
              position={[-8.68, rMid, 0]}
              rotation={[0, 0, Math.PI / 2 - 0.075]}
              material={plain('#858e99', 0.3, 0.85)}
              castShadow
            >
              <cylinderGeometry args={[0.015, 0.012, 1.12, 6]} />
            </mesh>
            <mesh position={[-8.16, rMid + 0.032, 0]} material={plain('#545d68', 0.35, 0.8)}>
              <boxGeometry args={[0.16, 0.042, 0.055]} />
            </mesh>
          </group>
        );
      })}

      {/* Luồng lửa buồng đốt hậu + vân kim cương Mach cho pha hạ cánh 260 knot S09 */}
      {abClamped > 0.02 && (
        <group position={[-9.24, 0, 0]}>
          <mesh
            position={[-flameLen * 0.5, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={plain(P.flame, 0.2, 0, {
              transparent: true,
              opacity: 0.64 * abClamped,
              emissive: new THREE.Color(P.flame),
              emissiveIntensity: 2.6,
              depthWrite: false,
            })}
          >
            <coneGeometry args={[0.45 * (0.75 + 0.25 * abClamped), flameLen, 22, 1, true]} />
          </mesh>
          <mesh
            position={[-flameLen * 0.36, 0, 0]}
            rotation={[0, 0, Math.PI / 2]}
            material={plain(P.amberHot, 0.15, 0, {
              transparent: true,
              opacity: 0.84 * abClamped,
              emissive: new THREE.Color(P.amber),
              emissiveIntensity: 3.5,
              depthWrite: false,
            })}
          >
            <coneGeometry args={[0.3 * (0.75 + 0.25 * abClamped), flameLen * 0.72, 20]} />
          </mesh>
          {[0.12, 0.28, 0.45, 0.62, 0.79].map((u, idx) => {
            const s = (1 - u * 0.68) * abClamped;
            return (
              <mesh
                key={idx}
                position={[-flameLen * u, 0, 0]}
                scale={[2.1 * s, 0.55 * s, 0.55 * s]}
                material={plain('#fff7df', 0.1, 0, {
                  transparent: true,
                  opacity: 0.88 * (1 - u * 0.5),
                  emissive: new THREE.Color('#ffe7a8'),
                  emissiveIntensity: 4.2,
                  depthWrite: false,
                })}
              >
                <octahedronGeometry args={[0.34, 1]} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// ---------------- Vách ngăn khung sườn & dầm Upper-Right Longeron gãy nham nhở tại x = +3.10 m ----------------

const BrokenBulkheadFace: React.FC<{ dir: 1 | -1 }> = ({ dir }) => {
  const alloyMat = plain('#b8c6d4', 0.32, 0.78);
  const darkCavityMat = plain('#101720', 0.88, 0.18);
  const fractureGlowMat = plain(P.flame, 0.32, 0.25, {
    emissive: new THREE.Color('#ff4a1c'),
    emissiveIntensity: 1.9,
  });

  const cables = useMemo(
    () => [
      pipe(
        [
          [0, 2.15, -0.32],
          [dir * 0.22, 2.08, -0.36],
          [dir * 0.44, 1.94, -0.28],
        ],
        0.022,
        12,
      ),
      pipe(
        [
          [0, 1.72, 0.38],
          [dir * 0.26, 1.62, 0.44],
          [dir * 0.48, 1.46, 0.39],
        ],
        0.024,
        12,
      ),
      pipe(
        [
          [0, 2.32, 0.14],
          [dir * 0.19, 2.26, 0.2],
          [dir * 0.36, 2.12, 0.24],
        ],
        0.018,
        12,
      ),
    ],
    [dir],
  );

  return (
    <group position={[3.1, 0, 0]}>
      {/* Khoang thiết bị tối bên trong mặt cắt */}
      <mesh
        position={[-dir * 0.03, 1.96, 0]}
        scale={[1, 1.04, 1]}
        rotation={[0, (dir * Math.PI) / 2, 0]}
        material={darkCavityMat}
      >
        <circleGeometry args={[0.66, 28]} />
      </mesh>
      {/* Vành khung vách ngăn hợp kim tròn/hộp chịu lực */}
      <mesh
        position={[dir * 0.01, 1.96, 0]}
        scale={[1, 1.05, 1]}
        rotation={[0, Math.PI / 2, 0]}
        material={alloyMat}
        castShadow
      >
        <torusGeometry args={[0.65, 0.055, 10, 28]} />
      </mesh>
      {/* Dầm khung hộp chữ thập bên trong vách ngăn FS-403 */}
      <mesh geometry={rbox(0.08, 1.24, 0.09, 0.01)} position={[dir * 0.02, 1.96, 0]} material={alloyMat} />
      <mesh geometry={rbox(0.08, 0.1, 1.26, 0.01)} position={[dir * 0.02, 2.18, 0]} material={alloyMat} />
      <mesh geometry={rbox(0.08, 0.1, 1.28, 0.01)} position={[dir * 0.02, 1.66, 0]} material={alloyMat} />
      <mesh geometry={rbox(0.07, 0.78, 0.07, 0.01)} position={[dir * 0.02, 1.94, 0.34]} material={alloyMat} />
      <mesh geometry={rbox(0.07, 0.78, 0.07, 0.01)} position={[dir * 0.02, 1.94, -0.34]} material={alloyMat} />

      {/* 3 thanh dầm longeron phụ (trên-trái, dưới-phải, dưới-trái) gãy lộ hợp kim */}
      {[
        [2.53, -0.56],
        [1.48, 0.56],
        [1.48, -0.56],
      ].map(([ly, lz], k) => (
        <group key={k} position={[dir * 0.11, ly, lz]}>
          <mesh geometry={rbox(0.26, 0.09, 0.09, 0.01)} rotation={[0.12 * (k + 1), -0.1 * dir, 0.08]} material={alloyMat} />
        </group>
      ))}

      {/* THANH DẦM CHÍNH GÃY ĐỨT: UPPER-RIGHT LONGERON [3.10, 2.55, +0.58] — dầm chữ I nham nhở màu kim loại + đỏ cam */}
      <group position={[dir * 0.15, 2.55, 0.58]} rotation={[0.14 * dir, -0.18 * dir, -0.22 * dir]}>
        <mesh geometry={rbox(0.4, 0.042, 0.15, 0.006)} position={[0, 0.058, 0]} material={alloyMat} castShadow />
        <mesh geometry={rbox(0.38, 0.115, 0.045, 0.005)} position={[0, 0, 0]} material={alloyMat} castShadow />
        <mesh geometry={rbox(0.36, 0.042, 0.15, 0.006)} position={[-0.02, -0.058, 0]} material={alloyMat} castShadow />
        <mesh
          geometry={rbox(0.16, 0.15, 0.16, 0.01)}
          position={[dir * 0.18, 0.01, 0.01]}
          rotation={[0.45, 0.35, 0.28]}
          material={fractureGlowMat}
        />
        <mesh
          position={[dir * 0.25, 0.03, -0.02]}
          rotation={[0.3, 0.6, -0.4]}
          material={plain(P.red, 0.35, 0.3, { emissive: new THREE.Color(P.red), emissiveIntensity: 1.6 })}
        >
          <coneGeometry args={[0.08, 0.2, 5]} />
        </mesh>
        <mesh position={[dir * 0.22, -0.04, 0.04]} rotation={[-0.4, 0.2, 0.5]} material={plain('#dce7f2', 0.25, 0.88)}>
          <coneGeometry args={[0.06, 0.17, 4]} />
        </mesh>
      </group>

      {/* Mảnh vỏ tôn nham nhở quanh chu vi vết gãy */}
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2;
        const py = 1.97 + Math.cos(a) * 0.69;
        const pz = Math.sin(a) * 0.69;
        return (
          <mesh
            key={i}
            position={[dir * (0.08 + (i % 3) * 0.04), py, pz]}
            rotation={[a, 0.25 * dir, -0.2 * dir]}
            material={i % 2 === 0 ? alloyMat : plain(P.legMid, 0.5, 0.35)}
          >
            <boxGeometry args={[0.18, 0.025, 0.14]} />
          </mesh>
        );
      })}

      {/* Ống thuỷ lực & bó cáp điện bị đứt rời */}
      <mesh geometry={cables[0]} material={plain(P.amber, 0.4, 0.6)} />
      <mesh geometry={cables[1]} material={plain('#2b3038', 0.75, 0.2)} />
      <mesh geometry={cables[2]} material={plain('#9fb1c4', 0.35, 0.75)} />
    </group>
  );
};

// ---------------- Ghế phóng thoát hiểm ACES II + Phi công + Luồng rocket + Dù cứu sinh C-9 ----------------

const SeatAndPilot: React.FC<{ ejecting: boolean; ep: number }> = ({ ejecting, ep }) => {
  const chuteOpen = clamp01((ep - 0.35) / 0.28);
  const rocketBurn = ejecting ? clamp01(1 - Math.max(0, ep - 0.38) / 0.22) : 0;

  return (
    <group>
      {/* Khung ghế phóng McDonnell Douglas ACES II */}
      <mesh geometry={rbox(0.14, 0.96, 0.48, 0.025)} position={[-0.22, 0.48, 0]} rotation={[0, 0, 0.18]} material={plain('#252b33', 0.6, 0.45)} castShadow />
      <mesh geometry={rbox(0.46, 0.13, 0.46, 0.025)} position={[0.02, 0.06, 0]} material={plain('#2b323b', 0.6, 0.45)} castShadow />
      <mesh geometry={rbox(0.08, 0.68, 0.42, 0.02)} position={[-0.14, 0.44, 0]} rotation={[0, 0, 0.18]} material={plain('#495742', 0.82, 0.05)} />
      <mesh geometry={rbox(0.22, 0.22, 0.38, 0.03)} position={[-0.28, 0.96, 0]} material={plain('#384336', 0.7, 0.2)} castShadow />
      <mesh geometry={rbox(0.22, 0.03, 0.03, 0.008)} position={[-0.16, 1.03, 0.21]} material={plain('#8a96a3', 0.4, 0.7)} />
      <mesh geometry={rbox(0.22, 0.03, 0.03, 0.008)} position={[-0.16, 1.03, -0.21]} material={plain('#8a96a3', 0.4, 0.7)} />
      <mesh position={[0.24, 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} material={plain(P.amber, 0.4, 0.2)}>
        <torusGeometry args={[0.055, 0.014, 8, 16]} />
      </mesh>

      {/* Phi công USAF/IDF trong bộ đồ bay kháng áp G-suit + mũ bay HGU-55/P */}
      <group position={[0.02, 0.14, 0]}>
        <mesh geometry={rbox(0.26, 0.48, 0.38, 0.07)} position={[-0.04, 0.32, 0]} rotation={[0, 0, 0.14]} material={plain('#4c5c47', 0.8, 0.05)} castShadow />
        <mesh geometry={rbox(0.28, 0.42, 0.1, 0.02)} position={[-0.03, 0.33, 0.11]} rotation={[0, 0, 0.14]} material={plain('#aeb8b0', 0.7, 0.15)} />
        <mesh geometry={rbox(0.28, 0.42, 0.1, 0.02)} position={[-0.03, 0.33, -0.11]} rotation={[0, 0, 0.14]} material={plain('#aeb8b0', 0.7, 0.15)} />
        <mesh geometry={rbox(0.42, 0.15, 0.15, 0.05)} position={[0.18, 0.06, 0.11]} rotation={[0, 0, -0.08]} material={plain('#4c5c47', 0.8, 0.05)} />
        <mesh geometry={rbox(0.42, 0.15, 0.15, 0.05)} position={[0.18, 0.06, -0.11]} rotation={[0, 0, -0.08]} material={plain('#4c5c47', 0.8, 0.05)} />
        <mesh geometry={rbox(0.14, 0.34, 0.13, 0.04)} position={[0.36, -0.14, 0.11]} rotation={[0, 0, 0.25]} material={plain('#262a2e', 0.85, 0.1)} />
        <mesh geometry={rbox(0.14, 0.34, 0.13, 0.04)} position={[0.36, -0.14, -0.11]} rotation={[0, 0, 0.25]} material={plain('#262a2e', 0.85, 0.1)} />
        <mesh geometry={rbox(0.32, 0.11, 0.11, 0.04)} position={[0.08, 0.28, 0.22]} rotation={[0.2, -0.25, -0.35]} material={plain('#4c5c47', 0.8, 0.05)} />
        <mesh geometry={rbox(0.32, 0.11, 0.11, 0.04)} position={[0.08, 0.28, -0.22]} rotation={[-0.2, 0.25, -0.35]} material={plain('#4c5c47', 0.8, 0.05)} />
        <group position={[-0.08, 0.69, 0]}>
          <mesh material={plain('#e8eef5', 0.26, 0.2)} castShadow>
            <sphereGeometry args={[0.15, 20, 16]} />
          </mesh>
          <mesh position={[0.048, 0.015, 0]} rotation={[0, 0, -0.22]} material={plain('#141a24', 0.12, 0.55)}>
            <sphereGeometry args={[0.136, 18, 12, -Math.PI * 0.42, Math.PI * 0.84, Math.PI * 0.22, Math.PI * 0.34]} />
          </mesh>
          <mesh position={[0.12, -0.055, 0]} rotation={[0, 0, -Math.PI / 3]} material={plain('#2d353b', 0.75, 0.1)}>
            <coneGeometry args={[0.055, 0.12, 10]} />
          </mesh>
        </group>
      </group>

      {/* Luồng lửa & cụm khói rocket đẩy dưới đáy ghế phóng ACES II (cone mũi chúc xuống -> ngọn lửa phun từ đáy ghế xuống dưới) */}
      {ejecting && rocketBurn > 0.01 && (
        <group position={[-0.08, -0.06, 0]}>
          <mesh
            position={[0, -0.95 * rocketBurn, 0]}
            rotation={[Math.PI, 0, 0]}
            material={plain(P.flame, 0.15, 0, {
              transparent: true,
              opacity: 0.85 * rocketBurn,
              emissive: new THREE.Color(P.flame),
              emissiveIntensity: 3.4,
              depthWrite: false,
            })}
          >
            <coneGeometry args={[0.28 * rocketBurn + 0.06, 1.9 * rocketBurn, 16]} />
          </mesh>
          <mesh
            position={[0, -0.55 * rocketBurn, 0]}
            rotation={[Math.PI, 0, 0]}
            material={plain(P.amberHot, 0.1, 0, {
              transparent: true,
              opacity: 0.92 * rocketBurn,
              emissive: new THREE.Color('#fff2b8'),
              emissiveIntensity: 4.2,
              depthWrite: false,
            })}
          >
            <coneGeometry args={[0.15 * rocketBurn + 0.04, 1.1 * rocketBurn, 14]} />
          </mesh>
          {[0.45, 0.9, 1.4, 2.0, 2.65].map((d, idx) => (
            <mesh
              key={idx}
              position={[-idx * 0.16, -1.1 * rocketBurn - d * (0.45 + ep * 0.7), (idx % 2 === 0 ? 1 : -1) * 0.08 * idx]}
              material={plain('#dde4ec', 0.95, 0, {
                transparent: true,
                opacity: Math.max(0.14, 0.62 - idx * 0.09),
                depthWrite: false,
              })}
            >
              <sphereGeometry args={[0.24 + idx * 0.13, 12, 10]} />
            </mesh>
          ))}
        </group>
      )}

      {/* Vòm dù cứu sinh tròn cam-trắng C-9 bung mở phía trên phi công khi ejectProgress > 0.35 */}
      {chuteOpen > 0.01 && (
        <group position={[-0.06, 0.82, 0]}>
          <group
            position={[0, 3.6 * smooth01(chuteOpen), 0]}
            scale={[
              0.2 + 0.8 * smooth01(chuteOpen),
              0.3 + 0.7 * smooth01(chuteOpen),
              0.2 + 0.8 * smooth01(chuteOpen),
            ]}
          >
            {Array.from({ length: 12 }, (_, i) => {
              const a0 = (i / 12) * Math.PI * 2;
              const isOrange = i % 2 === 0;
              return (
                <mesh
                  key={i}
                  material={plain(isOrange ? '#ff5f1f' : '#f2f6fb', 0.72, 0.04, {
                    side: THREE.DoubleSide,
                  })}
                  castShadow
                >
                  <sphereGeometry args={[2.85, 8, 12, a0, (Math.PI * 2) / 12 + 0.015, 0, Math.PI * 0.54]} />
                </mesh>
              );
            })}
            <mesh position={[0, 2.83, 0]} rotation={[-Math.PI / 2, 0, 0]} material={plain('#d8e2ec', 0.7, 0.1)}>
              <ringGeometry args={[0.24, 0.42, 20]} />
            </mesh>
          </group>
          {Array.from({ length: 12 }, (_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const s = 0.2 + 0.8 * smooth01(chuteOpen);
            const rimR = 2.85 * Math.sin(Math.PI * 0.54) * s;
            const rimY =
              3.6 * smooth01(chuteOpen) + 2.85 * Math.cos(Math.PI * 0.54) * (0.3 + 0.7 * smooth01(chuteOpen));
            const dx = Math.cos(a) * rimR;
            const dz = Math.sin(a) * rimR;
            const len = Math.hypot(dx, rimY, dz);
            const quat = new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 1, 0),
              new THREE.Vector3(dx, rimY, dz).normalize(),
            );
            const eul = new THREE.Euler().setFromQuaternion(quat);
            return (
              <mesh
                key={i}
                position={[dx * 0.5, rimY * 0.5, dz * 0.5]}
                rotation={[eul.x, eul.y, eul.z]}
                material={plain('#dce5ef', 0.6, 0.1)}
              >
                <cylinderGeometry args={[0.009, 0.009, len, 4]} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// ---------------- Mô hình chính: F15Legacy (F-15C/D Eagle Chiến tranh Lạnh) ----------------

export const F15Legacy: React.FC<F15LegacyProps> = ({
  gear = 1,
  wheelSpin = 0,
  afterburner = 0,
  breakSplit = 0,
  ejectProgress = 0,
  missingRightWing = false,
}) => {
  const gProg = clamp01(gear);
  const abProg = clamp01(afterburner);
  const bs = clamp01(breakSplit);
  const ep = clamp01(ejectProgress);

  // Vật liệu sơn ngụy trang mảng mây lớn Compass Ghost Chiến tranh Lạnh (camoScale * 4 nguyên -> không đường nối, repeat: 0.4)
  const matGhostMain = useMemo(
    () =>
      paint({
        color: P.legLight,
        camo: ['#bfd3e6'],
        camoScale: 0.25,
        wear: 0.08,
        dirt: 0.07,
        roughness: 0.47,
        metalness: 0.25,
        repeat: 0.4,
        seed: 21,
      }),
    [],
  );
  const matGhostAccent = useMemo(
    () =>
      paint({
        color: '#c2d5e7',
        camo: [P.legLight, P.legMid],
        camoScale: 0.25,
        wear: 0.09,
        dirt: 0.08,
        roughness: 0.49,
        metalness: 0.27,
        repeat: 0.4,
        seed: 39,
      }),
    [],
  );
  const matRadome = useMemo(
    () =>
      paint({
        color: '#c3d5e6',
        camo: ['#b4c8dc'],
        camoScale: 0.25,
        wear: 0.04,
        dirt: 0.05,
        roughness: 0.43,
        metalness: 0.16,
        repeat: 0.4,
        seed: 11,
      }),
    [],
  );
  const matTitaniumAft = useMemo(
    () =>
      paint({
        color: '#9aa4af',
        camo: ['#7d8792', '#b3bcc6'],
        camoScale: 0.5,
        wear: 0.26,
        dirt: 0.18,
        roughness: 0.35,
        metalness: 0.74,
        repeat: 0.5,
        seed: 51,
      }),
    [],
  );
  const matCanopyGlass = useMemo(
    () =>
      plain('#82cff2', 0.1, 0.24, {
        transparent: true,
        opacity: 0.4,
      }),
    [],
  );

  // ---------- Hình học Cụm Mũi - Buồng lái (x >= +3.10 m .. +9.71 m) ----------
  const fwdGeos = useMemo(() => {
    // 1. Khúc thân buồng lái từ mặt cắt vách ngăn x = 3.10 m tới sát vách radome x = 6.65 m
    const cockpitSecs: FuseSec[] = [
      BREAK_SEC,
      { x: 3.7, cy: 1.96, ryTop: 0.72, ryBot: 0.66, rzTop: 0.68, rzBot: 0.72, pTop: 2.3, pBot: 2.5, chineZ: 0.81, chineY: 0.2 },
      { x: 4.45, cy: 1.95, ryTop: 0.67, ryBot: 0.64, rzTop: 0.66, rzBot: 0.7, pTop: 2.2, pBot: 2.35, chineZ: 0.75, chineY: 0.18 },
      { x: 5.25, cy: 1.93, ryTop: 0.64, ryBot: 0.62, rzTop: 0.64, rzBot: 0.67, pTop: 2.1, pBot: 2.2 },
      { x: 5.98, cy: 1.91, ryTop: 0.61, ryBot: 0.58, rzTop: 0.61, rzBot: 0.63, pTop: 2.05, pBot: 2.1 },
      { x: 6.65, cy: 1.88, ryTop: 0.558, ryBot: 0.532, rzTop: 0.566, rzBot: 0.575, pTop: 2.0, pBot: 2.0 },
    ];
    const cockpitHull = buildLoftRings(cockpitSecs.map((s) => evalFuseRing(s, 36)), false, false);

    // 2. Chóp mũi Radome ogive khí động mượt 22 trạm (x = 6.65 m -> +9.63 m + đầu pitot tới +9.71 m)
    const radomeSecs: FuseSec[] = [];
    const nRad = 22;
    for (let i = 0; i <= nRad; i++) {
      const u = i / nRad;
      const x = 6.65 + u * 2.98;
      const prof = Math.pow(1 - Math.pow(u, 1.38), 0.66);
      const cy = 1.88 - 0.14 * Math.pow(u, 1.55);
      const rY = Math.max(0.012, 0.545 * prof);
      const rZ = Math.max(0.012, 0.575 * prof);
      radomeSecs.push({
        x,
        cy,
        ryTop: rY * (1 + 0.025 * (1 - u)),
        ryBot: rY * (0.975 + 0.025 * u),
        rzTop: rZ * (0.985 + 0.015 * u),
        rzBot: rZ,
        pTop: 2.0,
        pBot: 2.0,
      });
    }
    const radomeHull = buildLoftRings(radomeSecs.map((s) => evalFuseRing(s, 36)), false, true);

    // 3. Kính chắn gió trước cố định vuốt liền vào đỉnh vòm kính (x = 5.42 .. 6.48 m)
    const wsSecs: FuseSec[] = [
      { x: 5.42, cy: 2.5, ryTop: 0.58, ryBot: 0.12, rzTop: 0.45, rzBot: 0.47, pTop: 2.0, pBot: 2.2 },
      { x: 5.78, cy: 2.45, ryTop: 0.45, ryBot: 0.1, rzTop: 0.39, rzBot: 0.41, pTop: 2.0, pBot: 2.2 },
      { x: 6.14, cy: 2.4, ryTop: 0.27, ryBot: 0.08, rzTop: 0.3, rzBot: 0.32, pTop: 2.0, pBot: 2.2 },
      { x: 6.48, cy: 2.35, ryTop: 0.06, ryBot: 0.04, rzTop: 0.15, rzBot: 0.17, pTop: 2.0, pBot: 2.2 },
    ];
    const windshield = buildLoftRings(wsSecs.map((s) => evalFuseRing(s, 28)), true, true);

    // 4. Vòm kính giọt nước cao thoáng đặc trưng F-15 (Bubble Canopy, x = 3.12 .. 5.42 m, cao tới y = 3.13 m)
    const canStations: [number, number, number, number][] = [
      [3.12, 2.66, 0.1, 0.29],
      [3.38, 2.63, 0.26, 0.36],
      [3.76, 2.59, 0.43, 0.42],
      [4.2, 2.55, 0.54, 0.46],
      [4.65, 2.52, 0.6, 0.475],
      [5.02, 2.51, 0.62, 0.47],
      [5.26, 2.505, 0.6, 0.46],
      [5.42, 2.5, 0.58, 0.45],
    ];
    const canopyGlass = buildLoftRings(
      canStations.map(([x, cy, ryT, rz]) =>
        evalFuseRing({ x, cy, ryTop: ryT, ryBot: 0.08, rzTop: rz, rzBot: rz * 1.03, pTop: 2.0, pBot: 2.3 }, 28),
      ),
      true,
      true,
    );

    // Khung vòm cung ôm khít theo biên dạng cong thực của kính tại x = 5.42 m (không nhô góc hộp)
    const archSecs: FuseSec[] = [
      { x: 5.38, cy: 2.5, ryTop: 0.592, ryBot: 0.09, rzTop: 0.462, rzBot: 0.478, pTop: 2.0, pBot: 2.3 },
      { x: 5.46, cy: 2.5, ryTop: 0.585, ryBot: 0.09, rzTop: 0.456, rzBot: 0.472, pTop: 2.0, pBot: 2.3 },
    ];
    const canopyFrameArch = buildLoftRings(archSecs.map((s) => evalFuseRing(s, 28)), true, true);

    return { cockpitHull, radomeHull, windshield, canopyGlass, canopyFrameArch };
  }, []);

  // ---------- Hình học Cụm Thân chính - Cửa hút khí - Động cơ - Cánh - Đuôi (x <= +3.10 m) ----------
  const aftGeos = useMemo(() => {
    // 1. Thân trung tâm + sống lưng khí động nối tiếp tuyến mượt từ vòm kính & BREAK_SEC (x = +3.10 m) ra tới x = -8.12 m
    const centerSecs: FuseSec[] = [
      { x: -8.12, cy: 1.9, ryTop: 0.34, ryBot: 0.28, rzTop: 0.48, rzBot: 0.5, pTop: 2.3, pBot: 2.4 },
      { x: -6.8, cy: 1.93, ryTop: 0.46, ryBot: 0.56, rzTop: 0.88, rzBot: 0.96, pTop: 2.4, pBot: 2.8 },
      { x: -4.8, cy: 1.95, ryTop: 0.58, ryBot: 0.65, rzTop: 1.08, rzBot: 1.22, pTop: 2.4, pBot: 3.0 },
      { x: -2.4, cy: 1.97, ryTop: 0.67, ryBot: 0.68, rzTop: 1.12, rzBot: 1.26, pTop: 2.35, pBot: 3.0 },
      { x: 0.1, cy: 1.98, ryTop: 0.72, ryBot: 0.68, rzTop: 0.96, rzBot: 1.08, pTop: 2.3, pBot: 2.9 },
      { x: 1.75, cy: 1.98, ryTop: 0.75, ryBot: 0.67, rzTop: 0.78, rzBot: 0.85, pTop: 2.32, pBot: 2.7, chineZ: 0.88, chineY: 0.22 },
      { x: 2.55, cy: 1.975, ryTop: 0.765, ryBot: 0.67, rzTop: 0.72, rzBot: 0.77, pTop: 2.35, pBot: 2.65, chineZ: 0.86, chineY: 0.22 },
      BREAK_SEC,
    ];
    const centerHull = buildLoftRings(centerSecs.map((s) => evalFuseRing(s, 36)), true, false);

    // 2. Thân ống dẫn khí chính phía sau miệng hút (x = +2.22 .. -5.95 m) + miệng hút rỗng nghiêng trước 35° (x = +2.22 .. +3.06 m)
    const intakeTrunk = extrude(
      [
        [2.24, 2.38],
        [2.24, 1.33],
        [-5.95, 1.3],
        [-5.95, 2.34],
        [1.45, 2.42],
      ],
      0.78,
      0.032,
    );
    // Thành vách bên của miệng cửa hút khí vát xéo chuẩn F-15 (môi trên nhô ra x = +3.06, môi dưới lùi về x = +2.30)
    const intakeSideWall = extrude(
      [
        [3.06, 2.38],
        [2.3, 1.33],
        [2.16, 1.33],
        [2.16, 2.38],
      ],
      0.065,
      0.01,
    );

    const nacelleAft = lathe(
      [
        [0.57, -8.05],
        [0.62, -7.25],
        [0.64, -6.45],
        [0.63, -5.92],
      ],
      28,
    );

    const tailBoom = extrude(
      [
        [-4.2, 2.22],
        [-4.5, 1.56],
        [-8.6, 1.58],
        [-9.72, 1.78],
        [-9.72, 1.98],
        [-8.85, 2.22],
      ],
      0.34,
      0.035,
    );

    const gloveStrakeR = extrudeTop(
      [
        [3.04, 1.32],
        [1.55, 1.95],
        [-0.4, 1.95],
        [-0.4, 1.25],
      ],
      0.16,
      0.025,
    );
    const gloveStrakeL = extrudeTop(
      [
        [3.04, -1.32],
        [-0.4, -1.25],
        [-0.4, -1.95],
        [1.55, -1.95],
      ],
      0.16,
      0.025,
    );

    // 3. Cánh chính biên dạng khí động siêu âm (góc quét mép trước 45°, anhedral -1°, sải cánh 13.05 m: z = ±6.525 m)
    const rightRootSecs: WingSec[] = [
      { z: 1.34, xLE: 2.06, xTE: -4.44, y: 2.37, t: 0.27 },
      { z: 1.65, xLE: 1.75, xTE: -4.45, y: 2.362, t: 0.25 },
      { z: 1.95, xLE: 1.45, xTE: -4.46, y: 2.355, t: 0.232 },
    ];
    const rightOuterSecs: WingSec[] = [
      { z: 1.95, xLE: 1.45, xTE: -4.46, y: 2.355, t: 0.232 },
      { z: 3.15, xLE: 0.25, xTE: -4.48, y: 2.332, t: 0.185 },
      { z: 4.55, xLE: -1.15, xTE: -4.5, y: 2.306, t: 0.14 },
      { z: 5.95, xLE: -2.55, xTE: -4.51, y: 2.28, t: 0.102 },
      { z: 6.42, xLE: -3.05, xTE: -4.52, y: 2.272, t: 0.084 },
      { z: 6.525, xLE: -3.42, xTE: -4.48, y: 2.27, t: 0.062 },
    ];
    const leftFullSecs: WingSec[] = [
      { z: -6.525, xLE: -3.42, xTE: -4.48, y: 2.27, t: 0.062 },
      { z: -6.42, xLE: -3.05, xTE: -4.52, y: 2.272, t: 0.084 },
      { z: -5.95, xLE: -2.55, xTE: -4.51, y: 2.28, t: 0.102 },
      { z: -4.55, xLE: -1.15, xTE: -4.5, y: 2.306, t: 0.14 },
      { z: -3.15, xLE: 0.25, xTE: -4.48, y: 2.332, t: 0.185 },
      { z: -1.95, xLE: 1.45, xTE: -4.46, y: 2.355, t: 0.232 },
      { z: -1.65, xLE: 1.75, xTE: -4.45, y: 2.362, t: 0.25 },
      { z: -1.34, xLE: 2.06, xTE: -4.44, y: 2.37, t: 0.27 },
    ];

    const rightWingStub = buildAirfoilWing(rightRootSecs, false, true);
    const rightWingOuter = buildAirfoilWing(rightOuterSecs, false, true);
    const leftWingFull = buildAirfoilWing(leftFullSecs, true, false);

    // 4. Hai cánh đuôi đứng dựng thẳng 90° chuẩn F-15C/D (cao 5.63 m, KHÔNG có u EPAWSS!)
    const vTailFin = extrude(
      [
        [-5.12, 2.2],
        [-7.64, 5.56],
        [-9.12, 5.56],
        [-8.76, 2.2],
      ],
      0.13,
      0.022,
    );
    const leftTailPointedTip = lathe(
      [
        [0.012, -9.24],
        [0.052, -9.1],
        [0.055, -7.62],
        [0.032, -7.32],
        [0.002, -7.12],
      ],
      16,
    );
    const rightTailFlatCap = rbox(1.48, 0.08, 0.085, 0.018);

    // 5. Cánh đuôi ngang toàn động (All-moving Stabilators) có bậc răng cưa dogtooth
    const stabRSecs: WingSec[] = [
      { z: 1.74, xLE: 1.12, xTE: -1.48, y: 0, t: 0.12, camber: 0 },
      { z: 2.44, xLE: 0.36, xTE: -1.58, y: 0, t: 0.1, camber: 0 },
      { z: 2.52, xLE: 0.5, xTE: -1.6, y: 0, t: 0.095, camber: 0 },
      { z: 4.305, xLE: -1.42, xTE: -1.87, y: 0, t: 0.052, camber: 0 },
    ];
    const stabLSecs: WingSec[] = [...stabRSecs].reverse().map((s) => ({ ...s, z: -s.z }));
    const stabRight = buildAirfoilWing(stabRSecs, true, true);
    const stabLeft = buildAirfoilWing(stabLSecs, true, true);

    const speedbrake = extrudeTop(
      [
        [1.75, -0.52],
        [1.75, 0.52],
        [-0.95, 0.58],
        [-0.95, -0.58],
      ],
      0.055,
      0.015,
    );

    return {
      centerHull,
      intakeTrunk,
      intakeSideWall,
      nacelleAft,
      tailBoom,
      gloveStrakeR,
      gloveStrakeL,
      rightWingStub,
      rightWingOuter,
      leftWingFull,
      vTailFin,
      leftTailPointedTip,
      rightTailFlatCap,
      stabRight,
      stabLeft,
      speedbrake,
    };
  }, []);

  const dorsalRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let x = -5.4; x <= 2.8; x += 0.55) {
      pts.push([x, 2.41, 1.51], [x, 2.41, -1.51]);
    }
    return pts;
  }, []);

  // ---------- Ma trận biến dạng gãy mũi (breakSplit) & Quỹ đạo phóng ghế + bung dù (ejectProgress) ----------
  const nosePivot: [number, number, number] = [3.1, 2.02, 0];
  const nosePos: [number, number, number] = [
    nosePivot[0] + bs * 5.5,
    nosePivot[1] - bs * 6.5,
    nosePivot[2] + bs * 1.4,
  ];
  const noseRot: [number, number, number] = [bs * 0.7, bs * 0.45, -bs * 1.15];

  const ejectedPose = useMemo(() => {
    const localSeat = new THREE.Vector3(4.82 - nosePivot[0], 1.98 - nosePivot[1], 0);
    const bsAtRail = Math.min(bs, 0.45 * (1 - smooth01(ep * 1.6)) + bs * (1 - smooth01(ep * 2.5)));
    const railEuler = new THREE.Euler(bsAtRail * 0.7, bsAtRail * 0.45, -bsAtRail * 1.15);
    const railOrigin = new THREE.Vector3(
      nosePivot[0] + bsAtRail * 5.5,
      nosePivot[1] - bsAtRail * 6.5,
      nosePivot[2] + bsAtRail * 1.4,
    );
    const seatBase = localSeat.clone().applyEuler(railEuler).add(railOrigin);
    const upDir = new THREE.Vector3(0, 1, 0)
      .applyEuler(railEuler)
      .lerp(new THREE.Vector3(0, 1, 0), smooth01(ep * 2.2))
      .normalize();

    const climb = ep < 0.4 ? (ep / 0.4) * 8.2 : 8.2 + ((ep - 0.4) / 0.6) * 5.4;
    const windDriftX = -ep * ep * 6.2;
    const p = seatBase.addScaledVector(upDir, climb);
    p.x += windDriftX;

    const uprightFactor = 1 - smooth01(ep * 3.0);
    const rot: [number, number, number] = [
      railEuler.x * uprightFactor,
      railEuler.y * uprightFactor,
      railEuler.z * uprightFactor,
    ];
    return { pos: [p.x, p.y, p.z] as [number, number, number], rot };
  }, [bs, ep]);

  const stabPitchR = missingRightWing ? 0.26 : 0;
  const stabPitchL = missingRightWing ? -0.18 : 0;

  return (
    <group>
      {/* ==================== 1. CỤM THÂN CHÍNH - CÁNH - ĐỘNG CƠ - ĐUÔI (x < +3.10 m) ==================== */}
      <group>
        <mesh geometry={aftGeos.centerHull} material={matGhostMain} castShadow receiveShadow />
        <mesh geometry={aftGeos.speedbrake} position={[0, 2.684, 0]} rotation={[0, 0, 0.015]} material={matGhostAccent} castShadow />

        {/* Hai cửa hút khí chữ nhật rỗng nghiêng trước 35° & vỏ động cơ đôi (trái & phải) */}
        {([1, -1] as const).map((side) => (
          <group key={side}>
            <mesh geometry={aftGeos.intakeTrunk} position={[0, 0, side * 1.15]} material={matGhostMain} castShadow receiveShadow />
            {/* Hai thành bên ngoài & trong của miệng hút khí vát xéo + môi trên + môi dưới (không thò góc dưới bụng) */}
            <mesh geometry={aftGeos.intakeSideWall} position={[0, 0, side * 1.505]} material={matGhostMain} castShadow />
            <mesh geometry={aftGeos.intakeSideWall} position={[0, 0, side * 0.795]} material={matGhostMain} castShadow />
            <mesh geometry={rbox(0.92, 0.065, 0.77, 0.015)} position={[2.62, 2.35, side * 1.15]} material={matGhostMain} castShadow />
            <mesh geometry={rbox(0.24, 0.055, 0.77, 0.012)} position={[2.24, 1.355, side * 1.15]} material={matGhostMain} />
            {/* Tấm ramp điều hướng sóng xung kích nghiêng xuống trong miệng hút + lòng ống tối sâu */}
            <mesh geometry={rbox(0.84, 0.05, 0.65, 0.01)} position={[2.62, 2.24, side * 1.15]} rotation={[0, 0, -0.21]} material={matGhostAccent} />
            <mesh position={[2.22, 1.84, side * 1.15]} rotation={[0, Math.PI / 2, 0]} material={plain('#080c12', 0.94, 0.08)}>
              <planeGeometry args={[0.66, 0.94]} />
            </mesh>
            {/* Bọc titan trần chịu nhiệt đuôi động cơ F100 */}
            <mesh geometry={aftGeos.nacelleAft} position={[0, 1.88, side * 0.78]} material={matTitaniumAft} castShadow receiveShadow />
            {/* Dầm đuôi ngoài (Tail Boom) kéo tới x = -9.72 m */}
            <mesh geometry={aftGeos.tailBoom} position={[0, 0, side * 1.66]} material={matGhostMain} castShadow receiveShadow />
            <mesh geometry={rbox(0.28, 0.16, 0.24, 0.02)} position={[-9.6, 1.88, side * 1.66]} material={plain(P.legDark, 0.45, 0.3)} />
          </group>
        ))}

        {/* Strake gốc cánh hai bên & cửa nòng pháo xoay 20mm M61A1 Vulcan ở gốc cánh phải */}
        <mesh geometry={aftGeos.gloveStrakeR} position={[0, 2.29, 0]} material={matGhostMain} castShadow receiveShadow />
        <mesh geometry={aftGeos.gloveStrakeL} position={[0, 2.29, 0]} material={matGhostMain} castShadow receiveShadow />
        <group position={[2.22, 2.38, 1.64]}>
          <mesh geometry={rbox(0.75, 0.14, 0.22, 0.04)} material={matGhostAccent} castShadow />
          <mesh position={[0.38, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#151920', 0.6, 0.6)}>
            <cylinderGeometry args={[0.052, 0.052, 0.16, 14]} />
          </mesh>
        </group>

        {/* CÁNH TRÁI đầy đủ (z: -6.525 .. -1.34 m) — mấu đầu cánh Station 1 ĐỂ TRỐNG hoàn toàn chuẩn lịch sử */}
        <mesh geometry={aftGeos.leftWingFull} material={matGhostMain} castShadow receiveShadow />
        <mesh
          geometry={rbox(0.22, 0.045, 0.045, 0.015)}
          position={[-3.38, 2.27, -6.51]}
          material={plain(P.red, 0.25, 0.1, { emissive: new THREE.Color(P.red), emissiveIntensity: 0.7 })}
        />
        <InboardWingPylon z={-2.95} matPylon={matGhostMain} />

        {/* CÁNH PHẢI: mỏm gốc cánh trong (z: +1.34 .. +1.95 m, dài 0.61 m / 2 feet) luôn hiện */}
        <mesh geometry={aftGeos.rightWingStub} material={matGhostMain} castShadow receiveShadow />

        {/* Phần cánh phải ngoài z > +1.95 m & giá treo Station 8: biến mất khi missingRightWing = true (S09 F-15D Israel 1983) */}
        {!missingRightWing ? (
          <group>
            <mesh geometry={aftGeos.rightWingOuter} material={matGhostMain} castShadow receiveShadow />
            <mesh
              geometry={rbox(0.22, 0.045, 0.045, 0.015)}
              position={[-3.38, 2.27, 6.51]}
              material={plain(P.green, 0.25, 0.1, { emissive: new THREE.Color(P.green), emissiveIntensity: 0.7 })}
            />
            <InboardWingPylon z={2.95} matPylon={matGhostMain} />
          </group>
        ) : (
          /* MỎM GỐC CÁNH PHẢI CỤT DÀI ~0.61 M (2 FEET) Ở z = +1.95 m: vệt ám khói đen + xà dọc hợp kim nhôm nham nhở */
          <group position={[0, 0, 1.95]}>
            <mesh geometry={rbox(5.78, 0.24, 0.24, 0.03)} position={[-1.48, 2.355, -0.08]} material={plain('#181a1e', 0.92, 0.12)} />
            <mesh geometry={rbox(5.45, 0.26, 0.14, 0.02)} position={[-1.46, 2.355, -0.2]} material={plain('#2b2f35', 0.88, 0.18)} />
            {[
              { x: 0.78, len: 0.34, rotY: 0.12, rotX: -0.06 },
              { x: -0.95, len: 0.42, rotY: -0.09, rotX: 0.08 },
              { x: -2.85, len: 0.31, rotY: 0.16, rotX: -0.1 },
            ].map((sp, idx) => (
              <group key={idx} position={[sp.x, 2.355, sp.len * 0.42]} rotation={[sp.rotX, sp.rotY, 0]}>
                <mesh geometry={rbox(0.11, 0.17, sp.len, 0.008)} material={plain('#c3cfd9', 0.32, 0.82)} castShadow />
                <mesh geometry={rbox(0.24, 0.035, sp.len * 0.92, 0.006)} position={[0, 0.075, 0]} material={plain('#aebcc8', 0.35, 0.78)} />
                <mesh geometry={rbox(0.24, 0.035, sp.len * 0.88, 0.006)} position={[0, -0.075, 0]} material={plain('#aebcc8', 0.35, 0.78)} />
              </group>
            ))}
            {[-3.95, -3.3, -2.35, -1.65, -0.35, 0.25, 1.15].map((rx, idx) => (
              <mesh
                key={idx}
                position={[rx, 2.35 + ((idx % 3) - 1) * 0.055, 0.09 + (idx % 2) * 0.08]}
                rotation={[0.25 * (idx % 3), -0.3 + idx * 0.11, 0.18 * (idx % 2 === 0 ? 1 : -1)]}
                material={idx % 3 === 0 ? plain('#1c1f24', 0.9, 0.15) : plain('#bccad6', 0.36, 0.76)}
                castShadow
              >
                <boxGeometry args={[0.36, 0.028, 0.24]} />
              </mesh>
            ))}
            <mesh
              geometry={pipe(
                [
                  [-0.6, 2.36, -0.05],
                  [-0.68, 2.32, 0.18],
                  [-0.82, 2.24, 0.32],
                ],
                0.022,
                10,
              )}
              material={plain('#4c5663', 0.5, 0.6)}
            />
          </group>
        )}

        {/* HAI CÁNH ĐUÔI ĐỨNG THANH MẢNH TRUYỀN THỐNG F-15C/D (y tới 5.63 m, KHÔNG có u ăng-ten lớn EPAWSS) */}
        {/* Bên TRÁI (z = -1.66 m): đỉnh đầu nhọn mảnh */}
        <group position={[0, 0, -1.66]}>
          <mesh geometry={aftGeos.vTailFin} material={matGhostMain} castShadow receiveShadow />
          <mesh geometry={aftGeos.leftTailPointedTip} position={[0, 5.575, 0]} material={plain(P.legMid, 0.45, 0.3)} castShadow />
          {/* Dải mã hiệu đầu cánh đuôi đứng USAF/IDF Chiến tranh Lạnh + khe bản lề bánh lái hướng */}
          <mesh geometry={rbox(1.44, 0.14, 0.136, 0.01)} position={[-8.34, 5.32, 0]} material={plain(P.legDark, 0.48, 0.28)} />
          <mesh geometry={rbox(0.03, 2.48, 0.136, 0.005)} position={[-8.14, 3.65, 0]} rotation={[0, 0, 0.11]} material={plain(P.legDark, 0.6, 0.2)} />
          <mesh
            position={[-9.11, 5.18, 0]}
            material={plain(P.red, 0.2, 0.1, { emissive: new THREE.Color(P.red), emissiveIntensity: 0.9 })}
          >
            <sphereGeometry args={[0.04, 10, 8]} />
          </mesh>
        </group>
        {/* Bên PHẢI (z = +1.66 m): đỉnh phẳng thanh mảnh chuẩn F-15C/D */}
        <group position={[0, 0, 1.66]}>
          <mesh geometry={aftGeos.vTailFin} material={matGhostMain} castShadow receiveShadow />
          <mesh geometry={aftGeos.rightTailFlatCap} position={[-8.38, 5.59, 0]} material={plain(P.legMid, 0.45, 0.3)} castShadow />
          <mesh geometry={rbox(1.44, 0.14, 0.136, 0.01)} position={[-8.34, 5.32, 0]} material={plain(P.legDark, 0.48, 0.28)} />
          <mesh geometry={rbox(0.03, 2.48, 0.136, 0.005)} position={[-8.14, 3.65, 0]} rotation={[0, 0, 0.11]} material={plain(P.legDark, 0.6, 0.2)} />
        </group>

        {/* HAI CÁNH ĐUÔI NGANG TOÀN ĐỘNG (lệch góc bù nâng tự động khi missingRightWing = true) */}
        <group position={[-7.85, 1.82, 0]} rotation={[0, 0, stabPitchR]}>
          <mesh geometry={aftGeos.stabRight} material={matGhostMain} castShadow receiveShadow />
        </group>
        <group position={[-7.85, 1.82, 0]} rotation={[0, 0, stabPitchL]}>
          <mesh geometry={aftGeos.stabLeft} material={matGhostMain} castShadow receiveShadow />
        </group>

        {/* CẶP LOA PHỤT ĐỘNG CƠ F100-PW-220 + LUỒNG LỬA BUỒNG ĐỐT HẬU */}
        <F100Nozzle z={0.78} ab={abProg} />
        <F100Nozzle z={-0.78} ab={abProg} />

        {/* 4 ĐẠN TÊN LỬA KHÔNG ĐỐI KHÔNG AIM-7F/M SPARROW ỐP HÔNG THÂN CHUẨN F-15C/D */}
        <Aim7Sparrow position={[0.92, 1.35, 1.54]} />
        <Aim7Sparrow position={[0.92, 1.35, -1.54]} />
        <Aim7Sparrow position={[-3.75, 1.35, 1.54]} />
        <Aim7Sparrow position={[-3.75, 1.35, -1.54]} />

        {/* CÀNG ĐÁP CHÍNH TRÁI & PHẢI (chạm đúng mặt đất y = 0.00 m khi gear = 1) */}
        {([1, -1] as const).map((side) => (
          <group key={side}>
            {gProg > 0.03 && (
              <group position={[-1.35, 1.44, side * 1.18]} rotation={[0, 0, (1 - gProg) * 1.48]}>
                <mesh
                  position={[0, -0.49, side * 0.085]}
                  rotation={[side * -0.17, 0, 0]}
                  material={plain('#e5ecf2', 0.4, 0.35)}
                  castShadow
                >
                  <cylinderGeometry args={[0.068, 0.056, 1.0, 14]} />
                </mesh>
                <mesh
                  position={[0, -0.78, side * 0.135]}
                  rotation={[side * -0.17, 0, 0]}
                  material={plain('#cfd9e3', 0.2, 0.88)}
                >
                  <cylinderGeometry args={[0.045, 0.045, 0.42, 12]} />
                </mesh>
                <mesh
                  position={[0.24, -0.34, side * -0.05]}
                  rotation={[side * 0.24, 0, 0.56]}
                  material={plain('#d8e2ec', 0.42, 0.4)}
                >
                  <cylinderGeometry args={[0.032, 0.032, 0.74, 10]} />
                </mesh>
                <Wheel
                  r={0.46}
                  width={0.29}
                  spin={wheelSpin}
                  tire="#212428"
                  rim="#d8e0e8"
                  bolts={10}
                  position={[0, -0.98, side * 0.17]}
                />
              </group>
            )}
            <mesh
              geometry={rbox(1.55, 0.045, 0.48, 0.012)}
              position={[-1.12, 1.31 - gProg * 0.22, side * (1.06 - gProg * 0.12)]}
              rotation={[side * gProg * 1.38, 0, 0]}
              material={matGhostMain}
              castShadow
            />
          </group>
        ))}

        <Rivets points={dorsalRivets} r={0.014} color="#6b8096" />

        {/* Mặt cắt vách ngăn lộ ra ở đầu trước thân chính khi breakSplit > 0 */}
        {bs > 0.002 && <BrokenBulkheadFace dir={1} />}
      </group>

      {/* ==================== 2. CỤM MŨI - BUỒNG LÁI (x >= +3.10 m .. +9.71 m) ==================== */}
      <group position={nosePos} rotation={noseRot}>
        <group position={[-nosePivot[0], -nosePivot[1], -nosePivot[2]]}>
          <mesh geometry={fwdGeos.cockpitHull} material={matGhostMain} castShadow receiveShadow />
          <mesh geometry={fwdGeos.radomeHull} material={matRadome} castShadow receiveShadow />
          {/* Chóp chống sét đầu mũi radome + ống Pitot kim loại chạm đúng x = +9.71 m */}
          <mesh position={[9.52, 1.745, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain(P.legDark, 0.42, 0.3)}>
            <coneGeometry args={[0.088, 0.24, 20]} />
          </mesh>
          <mesh position={[9.64, 1.74, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain('#c7d3df', 0.28, 0.85)}>
            <coneGeometry args={[0.022, 0.15, 12]} />
          </mesh>
          {/* Dải sơn chống loá mờ trước kính chắn gió */}
          <mesh
            geometry={rbox(0.86, 0.045, 0.52, 0.02)}
            position={[6.55, 2.38, 0]}
            rotation={[0, 0, -0.14]}
            material={plain(P.legDark, 0.72, 0.15)}
          />

          {/* Khoang buồng lái + Bảng táp-lô + Kính ngắm HUD xanh lục */}
          <mesh geometry={rbox(2.15, 0.56, 0.82, 0.05)} position={[4.45, 2.22, 0]} material={plain('#1b232e', 0.85, 0.15)} />
          <mesh geometry={rbox(0.55, 0.36, 0.72, 0.04)} position={[5.48, 2.48, 0]} material={plain('#141a22', 0.85, 0.15)} />
          <mesh
            geometry={rbox(0.022, 0.23, 0.23, 0.004)}
            position={[5.42, 2.75, 0]}
            rotation={[0, 0, -0.45]}
            material={plain(P.green, 0.1, 0.2, {
              transparent: true,
              opacity: 0.5,
              emissive: new THREE.Color(P.green),
              emissiveIntensity: 0.75,
            })}
          />
          {/* Khoang thiết bị điện tử Avionics Bay sau lưng ghế phi công F-15C */}
          <mesh geometry={rbox(0.76, 0.52, 0.64, 0.03)} position={[3.68, 2.42, 0]} material={plain('#252f3d', 0.65, 0.35)} />
          <mesh geometry={rbox(0.58, 0.15, 0.52, 0.02)} position={[3.68, 2.72, 0]} material={plain('#5e6d7e', 0.45, 0.55)} />

          {/* Kính chắn gió cố định & khung vòm cung ôm khít biên dạng */}
          <mesh geometry={fwdGeos.windshield} material={matCanopyGlass} />
          <mesh geometry={fwdGeos.canopyFrameArch} material={plain(P.legMid, 0.46, 0.3)} castShadow />

          {/* Vòm kính Bubble Canopy: khép kín bình thường, bung bay lùi xoay ra sau khi ejectProgress > 0 */}
          <group
            position={ep > 0.002 ? [-ep * 9.5, ep * 4.4 - ep * ep * 3.8, ep * 0.65] : [0, 0, 0]}
            rotation={ep > 0.002 ? [ep * 0.85, ep * 0.5, ep * 2.6] : [0, 0, 0]}
          >
            <mesh geometry={fwdGeos.canopyGlass} material={matCanopyGlass} />
            <mesh geometry={rbox(2.28, 0.06, 0.93, 0.02)} position={[4.26, 2.52, 0]} material={plain(P.legMid, 0.48, 0.28)} />
          </group>

          {/* Khi chưa phóng ghế (ep === 0), ghế ACES II & phi công nổi rõ bên trong vòm kính buồng lái */}
          {ep <= 0.002 && (
            <group position={[4.82, 1.98, 0]}>
              <SeatAndPilot ejecting={false} ep={0} />
            </group>
          )}

          {/* CÀNG ĐÁP MŨI (x = +4.95 m, z = 0): bánh r = 0.34 m chạm đúng y = 0.00 m khi gear = 1 */}
          {gProg > 0.03 && (
            <group position={[4.95, 1.38, 0]} rotation={[0, 0, -(1 - gProg) * 1.52]}>
              <mesh position={[0, -0.46, 0]} material={plain('#e5ecf2', 0.4, 0.35)} castShadow>
                <cylinderGeometry args={[0.056, 0.048, 0.88, 14]} />
              </mesh>
              <mesh position={[0, -0.78, 0]} material={plain('#d0dae4', 0.2, 0.88)}>
                <cylinderGeometry args={[0.038, 0.038, 0.44, 12]} />
              </mesh>
              {/* Cặp đèn pha hạ cánh & lăn đường băng trên trụ càng mũi */}
              <mesh
                position={[0.075, -0.42, 0.045]}
                rotation={[0, 0, Math.PI / 2]}
                material={plain('#fff8e6', 0.15, 0.2, {
                  emissive: new THREE.Color('#fff2cc'),
                  emissiveIntensity: 0.95,
                })}
              >
                <cylinderGeometry args={[0.046, 0.046, 0.04, 14]} />
              </mesh>
              <mesh
                position={[0.075, -0.42, -0.045]}
                rotation={[0, 0, Math.PI / 2]}
                material={plain('#fff8e6', 0.15, 0.2, {
                  emissive: new THREE.Color('#fff2cc'),
                  emissiveIntensity: 0.95,
                })}
              >
                <cylinderGeometry args={[0.046, 0.046, 0.04, 14]} />
              </mesh>
              <mesh position={[0.22, -0.28, 0]} rotation={[0, 0, 0.62]} material={plain('#d8e2ec', 0.42, 0.4)}>
                <cylinderGeometry args={[0.026, 0.026, 0.68, 10]} />
              </mesh>
              <Wheel
                r={0.34}
                width={0.21}
                spin={wheelSpin}
                tire="#212428"
                rim="#d8e0e8"
                bolts={8}
                position={[0, -1.04, 0]}
              />
            </group>
          )}
          <mesh
            geometry={rbox(1.22, 0.04, 0.38, 0.01)}
            position={[5.05, 1.33 - gProg * 0.18, gProg * 0.21]}
            rotation={[gProg * 1.45, 0, 0]}
            material={matGhostMain}
            castShadow
          />

          {/* Mặt cắt vách ngăn & dầm upper-right longeron gãy nham nhở phía sau cụm mũi khi breakSplit > 0 */}
          {bs > 0.002 && <BrokenBulkheadFace dir={-1} />}
        </group>
      </group>

      {/* ==================== 3. GHẾ PHÓNG ACES II + PHI CÔNG + DÙ CỨU SINH (khi ejectProgress > 0) ==================== */}
      {ep > 0.002 && (
        <group position={ejectedPose.pos} rotation={ejectedPose.rot}>
          <SeatAndPilot ejecting ep={ep} />
        </group>
      )}
    </group>
  );
};

export const MODELS: ModelSet = {
  F15Legacy: { C: F15Legacy, size: 20, center: [0, 2.5, 0] },
};
