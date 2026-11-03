// Địa hình & mặt nền 3D tất định:
// - heightField() + Terrain + Scatter: địa hình tự nhiên (đồi núi, thung lũng, sa mạc) + cây/đá có chiều sâu tán lá.
// - Water: mặt biển / sông hồ động theo `t` (sóng Gerstner, phản chiếu Fresnel trời/nắng, bọt sóng, vệt rẽ nước tàu/trực thăng).
// - Surface: mặt nền nhân tạo / kỹ thuật (đường băng, bê tông, nhựa đường, boong tàu sân bay, sàn sa bàn/studio liền khối).
import React, { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { fbm, grain, vnoise } from './materials';
import { mat4, merge } from './geom';

export type HeightFn = (x: number, z: number) => number;

/**
 * Hàm độ cao nền: fBm biên độ `amp` (m), bước sóng `scale` (m). `flats` = các bãi phẳng tròn [x, z, bán kính, độ cao]
 * nơi đặt phương tiện / công trình (mép chuyển mượt). `add` = hàm cộng thêm (đồi, sống núi, lòng đường…) do cảnh tự viết.
 */
export const heightField = (o: { seed?: number; amp?: number; scale?: number; oct?: number; flats?: [number, number, number, number][]; add?: HeightFn }): HeightFn => {
  const { seed = 1, amp = 6, scale = 120, oct = 5, flats = [], add } = o;
  return (x, z) => {
    let h = (fbm(x / scale + 50, z / scale + 50, seed, oct) - 0.5) * 2 * amp;
    if (add) h += add(x, z);
    for (const [fx, fz, r, fh] of flats) {
      const d = Math.hypot(x - fx, z - fz);
      const w = d < r ? 1 : d > r * 1.8 ? 0 : 1 - (d - r) / (r * 0.8);
      const s = w * w * (3 - 2 * w);
      h = h * (1 - s) + fh * s;
    }
    return h;
  };
};

/** Sống đồi chạy theo trục Z tại x0 (cao h, nửa rộng w) — ví dụ một hàm `add`. */
export const ridgeX = (x0: number, h: number, w: number): HeightFn => (x) => h * Math.exp(-(((x - x0) / w) ** 2));

export type TerrainColors = { low: string; high: string; rock: string; dry?: string };

/**
 * Lưới địa hình `size` x `size` (m) tâm (cx, cz), màu theo độ cao + độ dốc + vệt khô, có bump vi địa hình và nhận bóng.
 * Hàm `h` nên tạo ở cấp module hoặc useMemo để không dựng lại lưới mỗi khung.
 */
export const Terrain: React.FC<{ h: HeightFn; size?: number; seg?: number; center?: [number, number]; colors?: TerrainColors; grainRepeat?: number }> = ({
  h, size = 400, seg = 256, center = [0, 0], colors = { low: '#6a9246', high: '#96ae66', rock: '#857a6a', dry: '#b5a273' }, grainRepeat = 44,
}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    g.translate(center[0], 0, center[1]);
    const p = g.attributes.position as THREE.BufferAttribute;
    let lo = Infinity, hi = -Infinity;
    for (let i = 0; i < p.count; i++) { const y = h(p.getX(i), p.getZ(i)); p.setY(i, y); lo = Math.min(lo, y); hi = Math.max(hi, y); }
    g.computeVertexNormals();
    const n = g.attributes.normal as THREE.BufferAttribute;
    const cl = new THREE.Color(colors.low), ch = new THREE.Color(colors.high), cr = new THREE.Color(colors.rock), cd = new THREE.Color(colors.dry ?? colors.high);
    const col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i), t = (y - lo) / Math.max(1e-3, hi - lo);
      c.copy(cl).lerp(ch, t);
      const dry = fbm(x / 36, z / 36, 77, 3);
      if (dry > 0.56) c.lerp(cd, Math.min(1, (dry - 0.56) * 4.5));
      const slope = 1 - n.getY(i);
      if (slope > 0.1) {
        const strata = 0.88 + 0.22 * vnoise(y * 1.8, x * 0.15 + z * 0.15, 31);
        c.lerp(cr, Math.min(1, (slope - 0.1) * 4.2)).multiplyScalar(strata);
      }
      c.multiplyScalar(0.9 + 0.2 * fbm(x / 6.5, z / 6.5, 5, 3));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, [h, size, seg, center[0], center[1], colors.low, colors.high, colors.rock, colors.dry]);

  const mat = useMemo(() => {
    const t = grain(11, 6).clone();
    t.needsUpdate = true;
    t.repeat.set(grainRepeat, grainRepeat);
    return new THREE.MeshStandardMaterial({ vertexColors: true, map: t, bumpMap: t, bumpScale: 0.08, roughness: 0.95 });
  }, [grainRepeat]);

  return <mesh geometry={geo} material={mat} receiveShadow userData={{ isGround: true }} />;
};

// ---------- cây, đá, bụi tự nhiên (có chuyển sắc tối-sáng AO theo chiều cao tán lá) ----------
const displaceOrganic = (g: THREE.BufferGeometry, amt: number, seed: number) => {
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const k = (fbm(x * 2.4 + seed, y * 2.4, z * 2.4 + seed, 3) - 0.5) * 2 * amt;
    p.setXYZ(i, x * (1 + k), y * (1 + k * 0.45), z * (1 + k));
  }
  g.computeVertexNormals();
  return g;
};

const shadeCanopy = (g: THREE.BufferGeometry, bottomHex: string, topHex: string) => {
  const p = g.attributes.position as THREE.BufferAttribute;
  let yMin = Infinity, yMax = -Infinity;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); yMin = Math.min(yMin, y); yMax = Math.max(yMax, y); }
  const cb = new THREE.Color(bottomHex), ct = new THREE.Color(topHex), c = new THREE.Color();
  const a = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const hNorm = (y - yMin) / Math.max(1e-3, yMax - yMin);
    const radial = Math.min(1, Math.hypot(x, z) / 1.6);
    c.copy(cb).lerp(ct, Math.min(1, hNorm * 0.78 + radial * 0.28));
    a.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
};

const KINDS: Record<string, () => THREE.BufferGeometry> = {
  pine: () => merge([
    shadeCanopy(new THREE.CylinderGeometry(0.1, 0.22, 2.3, 10).applyMatrix4(mat4([0, 1.15, 0])), '#3e2f21', '#5c4632'),
    shadeCanopy(displaceOrganic(new THREE.ConeGeometry(1.65, 2.5, 14, 3).applyMatrix4(mat4([0, 2.5, 0])), 0.18, 1), '#243f22', '#446e3b'),
    shadeCanopy(displaceOrganic(new THREE.ConeGeometry(1.38, 2.3, 14, 3).applyMatrix4(mat4([0, 3.7, 0])), 0.18, 2), '#294827', '#4d7b43'),
    shadeCanopy(displaceOrganic(new THREE.ConeGeometry(1.05, 2.0, 14, 3).applyMatrix4(mat4([0, 4.85, 0])), 0.18, 3), '#2e502b', '#58894c'),
    shadeCanopy(displaceOrganic(new THREE.ConeGeometry(0.68, 1.55, 12, 2).applyMatrix4(mat4([0, 5.85, 0])), 0.16, 4), '#355c32', '#649856'),
  ]),
  broadleaf: () => merge([
    shadeCanopy(new THREE.CylinderGeometry(0.14, 0.28, 2.5, 10).applyMatrix4(mat4([0, 1.25, 0])), '#423224', '#634c37'),
    shadeCanopy(displaceOrganic(new THREE.IcosahedronGeometry(1.75, 2).applyMatrix4(mat4([0, 3.55, 0], [0, 0, 0], [1.08, 0.88, 1.05])), 0.22, 5), '#2e4d25', '#679649'),
    shadeCanopy(displaceOrganic(new THREE.IcosahedronGeometry(1.32, 2).applyMatrix4(mat4([0.95, 3.0, 0.55])), 0.22, 6), '#2a4722', '#6f9e50'),
    shadeCanopy(displaceOrganic(new THREE.IcosahedronGeometry(1.25, 2).applyMatrix4(mat4([-0.85, 3.1, -0.45])), 0.22, 7), '#294521', '#5f8d43'),
    shadeCanopy(displaceOrganic(new THREE.IcosahedronGeometry(1.1, 2).applyMatrix4(mat4([0.15, 4.35, -0.35])), 0.2, 8), '#375a2d', '#78a858'),
  ]),
  bush: () => merge([
    shadeCanopy(displaceOrganic(new THREE.IcosahedronGeometry(0.82, 2).applyMatrix4(mat4([0, 0.48, 0], [0, 0, 0], [1.35, 0.78, 1.15])), 0.26, 9), '#2c4823', '#669247'),
    shadeCanopy(displaceOrganic(new THREE.IcosahedronGeometry(0.62, 2).applyMatrix4(mat4([0.62, 0.38, 0.32])), 0.25, 10), '#284220', '#709c50'),
    shadeCanopy(displaceOrganic(new THREE.IcosahedronGeometry(0.55, 2).applyMatrix4(mat4([-0.52, 0.36, -0.25])), 0.25, 11), '#284220', '#5f8b42'),
  ]),
  rock: () => shadeCanopy(displaceOrganic(new THREE.DodecahedronGeometry(1, 2).applyMatrix4(mat4([0, 0.28, 0], [0, 0, 0], [1.35, 0.72, 1.05])), 0.32, 12), '#59534b', '#9a9286'),
};

/**
 * Rải `count` cá thể loại `kind` trong vùng [x0, z0, x1, z1] bám mặt đất `h`. `avoid(x,z)` = true thì bỏ (đường, bãi đỗ).
 * Tất định theo `seed`. `scale` = [min, max] tỉ lệ. `tint` nhân màu gốc (vd. '#d8b070' cho mùa thu, '#9fb0a0' cho sương lạnh).
 */
export const Scatter: React.FC<{ kind: 'pine' | 'broadleaf' | 'bush' | 'rock'; count: number; area: [number, number, number, number]; h: HeightFn; seed?: number; scale?: [number, number]; avoid?: (x: number, z: number) => boolean; tint?: string }> = ({
  kind, count, area, h, seed = 1, scale = [0.7, 1.3], avoid, tint = '#ffffff',
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => KINDS[kind](), [kind]);
  const isRock = kind === 'rock';
  const mat = useMemo(() => new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: isRock ? 0.92 : 0.86, flatShading: isRock, color: tint,
  }), [tint, isRock]);
  const items = useMemo(() => {
    const out: THREE.Matrix4[] = [];
    const r = (i: number, k: number) => { const v = Math.sin(i * 12.9898 + k * 78.233 + seed * 37.719) * 43758.5453; return v - Math.floor(v); };
    for (let i = 0; out.length < count && i < count * 6; i++) {
      const x = area[0] + (area[2] - area[0]) * r(i, 1), z = area[1] + (area[3] - area[1]) * r(i, 2);
      if (avoid?.(x, z)) continue;
      const s = scale[0] + (scale[1] - scale[0]) * r(i, 3);
      out.push(mat4([x, h(x, z) - 0.1, z], [0, r(i, 4) * Math.PI * 2, 0], [s * (0.9 + 0.2 * r(i, 5)), s, s * (0.9 + 0.2 * r(i, 6))]));
    }
    return out;
  }, [count, area[0], area[1], area[2], area[3], h, seed, scale[0], scale[1], avoid]);
  useLayoutEffect(() => {
    items.forEach((m, i) => ref.current!.setMatrixAt(i, m));
    ref.current!.instanceMatrix.needsUpdate = true;
  }, [items]);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} castShadow receiveShadow />;
};

// ---------- Mặt nước / Đại dương động theo t (Gerstner waves + Fresnel + Kelvin ship/rotor wakes) ----------
export type WakeSpec = {
  /** Vị trí mũi tàu hoặc tâm xoáy trực thăng [x, z] (m). */
  pos: [number, number];
  /** Hướng di chuyển [dx, dz] của tàu; truyền [0, 0] để vẽ vòng sóng/bọt gió đập xuống từ trực thăng treo. */
  dir?: [number, number];
  length?: number;
  width?: number;
  strength?: number;
};

export type WaterProps = {
  /** Thời gian `t` từ `useT()` để sóng chạy tất định. */
  t: number;
  size?: number;
  seg?: number;
  center?: [number, number];
  /** Mực nước theo trục Y (mặc định 0). */
  level?: number;
  deepColor?: string;
  shallowColor?: string;
  skyColor?: string;
  sun?: [number, number, number];
  sunColor?: string;
  /** Biên độ sóng (m, mặc định 0.45). */
  waveHeight?: number;
  /** Bước sóng cơ sở (m, mặc định 26). */
  waveScale?: number;
  /** Tối đa 4 vệt rẽ nước của tàu chiến / xoáy cánh quạt trên mặt biển. */
  wakes?: WakeSpec[];
};

const MAX_WAKES = 4;

/** Mặt biển / sông hồ động theo `t`: sóng nổi 3D, phản xạ Fresnel góc trượt, lấp lánh mặt trời, bọt đầu sóng và vệt rẽ nước. */
export const Water: React.FC<WaterProps> = ({
  t, size = 900, seg = 220, center = [0, 0], level = 0,
  deepColor = '#0b2840', shallowColor = '#1c5c7c', skyColor = '#9cc6e4',
  sun = [40, 60, 25], sunColor = '#fff2d6', waveHeight = 0.45, waveScale = 26, wakes = [],
}) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    return g;
  }, [size, seg]);

  const mat = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveH: { value: waveHeight },
      uWaveS: { value: waveScale },
      uDeep: { value: new THREE.Color(deepColor) },
      uShallow: { value: new THREE.Color(shallowColor) },
      uSky: { value: new THREE.Color(skyColor) },
      uSunDir: { value: new THREE.Vector3(...sun).normalize() },
      uSunCol: { value: new THREE.Color(sunColor) },
      uWakeCount: { value: 0 },
      uWakePos: { value: Array.from({ length: MAX_WAKES }, () => new THREE.Vector4()) },
      uWakePar: { value: Array.from({ length: MAX_WAKES }, () => new THREE.Vector4()) },
      fogColor: { value: new THREE.Color(skyColor) },
      fogNear: { value: 180 },
      fogFar: { value: 900 },
    },
    fog: true,
    vertexShader: `
      uniform float uTime;
      uniform float uWaveH;
      uniform float uWaveS;
      varying vec3 vWorldPos;
      varying float vCrest;
      #include <fog_pars_vertex>

      vec3 gerstner(vec2 xz, vec2 dir, float steep, float wl, float spd, inout vec3 tang, inout vec3 binorm) {
        float k = 6.283185 / wl;
        float a = steep / k;
        float ph = k * dot(dir, xz) - spd * uTime;
        float c = cos(ph), s = sin(ph);
        tang += vec3(-dir.x * dir.x * steep * s, dir.x * steep * c, -dir.x * dir.y * steep * s);
        binorm += vec3(-dir.x * dir.y * steep * s, dir.y * steep * c, -dir.y * dir.y * steep * s);
        return vec3(dir.x * a * c, a * s, dir.y * a * c);
      }

      void main() {
        vec4 wp0 = modelMatrix * vec4(position, 1.0);
        vec2 xz = wp0.xz;
        vec3 tang = vec3(1.0, 0.0, 0.0);
        vec3 binorm = vec3(0.0, 0.0, 1.0);
        float st = clamp(uWaveH / max(4.0, uWaveS) * 3.2, 0.01, 0.28);
        vec3 d = vec3(0.0);
        d += gerstner(xz, normalize(vec2(0.88, 0.47)), st, uWaveS, 1.9, tang, binorm);
        d += gerstner(xz, normalize(vec2(0.35, -0.93)), st * 0.72, uWaveS * 0.61, 2.4, tang, binorm);
        d += gerstner(xz, normalize(vec2(-0.76, 0.64)), st * 0.48, uWaveS * 0.37, 3.1, tang, binorm);
        d += gerstner(xz, normalize(vec2(0.96, -0.26)), st * 0.32, uWaveS * 0.19, 4.0, tang, binorm);

        vec4 wp = vec4(wp0.xyz + d * clamp(uWaveH * 2.0, 0.0, 4.0) * 0.45, 1.0);
        vWorldPos = wp.xyz;
        vCrest = d.y / max(0.05, uWaveH);
        vec4 mvPosition = viewMatrix * wp;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uWaveH;
      uniform float uWaveS;
      uniform vec3 uDeep;
      uniform vec3 uShallow;
      uniform vec3 uSky;
      uniform vec3 uSunDir;
      uniform vec3 uSunCol;
      uniform int uWakeCount;
      uniform vec4 uWakePos[${MAX_WAKES}];
      uniform vec4 uWakePar[${MAX_WAKES}];
      varying vec3 vWorldPos;
      varying float vCrest;
      #include <fog_pars_fragment>

      float hash2(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }
      float noise2(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
                   mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
      }
      float fbm2(vec2 p) {
        float s = 0.0, a = 0.5;
        for (int i = 0; i < 4; i++) { s += a * noise2(p); p = p * 2.03 + vec2(17.1, 31.7); a *= 0.5; }
        return s;
      }

      void main() {
        vec2 xz = vWorldPos.xz;
        // Gợn sóng nhỏ tần số cao trên bề mặt để bắt lấp lánh mặt trời
        float e = 0.35;
        float h0 = fbm2(xz * 0.32 + vec2(uTime * 0.35, -uTime * 0.22));
        float hx = fbm2((xz + vec2(e, 0.0)) * 0.32 + vec2(uTime * 0.35, -uTime * 0.22));
        float hz = fbm2((xz + vec2(0.0, e)) * 0.32 + vec2(uTime * 0.35, -uTime * 0.22));
        float microScale = 0.22 * clamp(uWaveH + 0.15, 0.1, 1.5);
        vec3 n = normalize(vec3((h0 - hx) * microScale / e, 1.0, (h0 - hz) * microScale / e));

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float ndv = max(dot(n, viewDir), 0.02);
        float fresnel = 0.03 + 0.97 * pow(1.0 - ndv, 4.5);

        vec3 waterBody = mix(uDeep, uShallow, clamp(vCrest * 0.45 + 0.35, 0.0, 1.0));
        vec3 refl = mix(waterBody, uSky * 0.92, clamp(fresnel * 0.88, 0.0, 0.92));

        // Lấp lánh mặt trời trên gợn nước
        vec3 halfV = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(n, halfV), 0.0), 220.0) * 2.4 + pow(max(dot(n, halfV), 0.0), 28.0) * 0.22;
        vec3 col = refl + uSunCol * spec;

        // Bọt trắng đầu ngọn sóng & vệt rẽ nước (Kelvin wake / rotor downwash)
        float foamTex = fbm2(xz * 0.85 - vec2(uTime * 0.4, uTime * 0.25));
        float foam = smoothstep(0.62, 1.05, vCrest + foamTex * 0.45 - 0.25) * clamp(uWaveH * 0.9, 0.0, 0.75);

        for (int i = 0; i < ${MAX_WAKES}; i++) {
          if (i >= uWakeCount) break;
          vec2 wp = uWakePos[i].xy;
          vec2 wd = uWakePos[i].zw;
          float wLen = uWakePar[i].x, wWid = uWakePar[i].y, wStr = uWakePar[i].z;
          vec2 rel = xz - wp;
          float dirLen = length(wd);
          if (dirLen < 0.01) {
            // Vòng gió cánh quạt đập xuống mặt nước (rotor downwash)
            float r = length(rel);
            float ring = exp(-pow((r - wWid * 0.65) / max(1.0, wWid * 0.28), 2.0));
            float ripples = 0.5 + 0.5 * sin(r * 2.6 - uTime * 9.0);
            foam += wStr * ring * (0.45 + 0.55 * foamTex * ripples);
          } else {
            // Vệt rẽ nước mũi chữ V + luồng chân vịt sủi bọt hữu cơ sau đuôi tàu
            vec2 fwd = wd / dirLen;
            vec2 side = vec2(-fwd.y, fwd.x);
            float behind = -dot(rel, fwd);
            float lat = abs(dot(rel, side));
            if (behind > -1.0 && behind < wLen) {
              float u = clamp(behind / max(1.0, wLen), 0.0, 1.0);
              float turb = fbm2(xz * 0.55 + fwd * uTime * 1.6);
              float vSpread = 0.8 + behind * (wWid / max(2.0, wLen)) * 0.52 + (turb - 0.5) * 1.4;
              float vArm = abs(lat - vSpread);
              float bowRamp = smoothstep(-0.8, 3.5, behind);
              float armFoam = exp(-pow(vArm / (0.65 + u * 2.8), 2.0)) * (1.0 - u * 0.85) * bowRamp;
              float sternStart = smoothstep(wLen * 0.35, wLen * 0.55, behind);
              float centerProp = exp(-pow(lat / (0.9 + u * 2.4), 2.0)) * (1.0 - u * 0.55) * sternStart;
              foam += wStr * max(armFoam * 0.72, centerProp * 0.9) * smoothstep(0.22, 0.82, turb);
            }
          }
        }

        col = mix(col, vec3(0.93, 0.96, 0.99), clamp(foam, 0.0, 0.92));
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  }), []);

  useEffect(() => () => { geo.dispose(); mat.dispose(); }, [geo, mat]);

  mat.uniforms.uTime.value = t;
  mat.uniforms.uWaveH.value = waveHeight;
  mat.uniforms.uWaveS.value = waveScale;
  mat.uniforms.uDeep.value.set(deepColor);
  mat.uniforms.uShallow.value.set(shallowColor);
  mat.uniforms.uSky.value.set(skyColor);
  mat.uniforms.uSunDir.value.set(...sun).normalize();
  mat.uniforms.uSunCol.value.set(sunColor);
  const wc = Math.min(MAX_WAKES, wakes.length);
  mat.uniforms.uWakeCount.value = wc;
  for (let i = 0; i < wc; i++) {
    const w = wakes[i], d = w.dir ?? [1, 0];
    mat.uniforms.uWakePos.value[i].set(w.pos[0], w.pos[1], d[0], d[1]);
    mat.uniforms.uWakePar.value[i].set(w.length ?? 45, w.width ?? 14, w.strength ?? 0.85, 0);
  }

  return <mesh geometry={geo} material={mat} position={[center[0], level, center[1]]} userData={{ isGround: true }} />;
};

// ---------- Mặt nền nhân tạo / kỹ thuật (đường băng, bê tông, nhựa đường, boong tàu, sàn studio/sa bàn) ----------
export type SurfaceKind = 'runway' | 'concrete' | 'asphalt' | 'deck' | 'studio';

const surfCache = new Map<string, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture }>();

const makeSurfaceTex = (kind: SurfaceKind, baseHex: string, markings: boolean, seed: number) => {
  const key = `${kind}|${baseHex}|${markings}|${seed}`;
  if (surfCache.has(key)) return surfCache.get(key)!;
  const N = 1024;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(N, N);

  const bcv = document.createElement('canvas');
  bcv.width = bcv.height = N;
  const bctx = bcv.getContext('2d')!;
  const bimg = bctx.createImageData(N, N);

  const c = new THREE.Color(baseHex);
  const br = c.r * 255, bg = c.g * 255, bb = c.b * 255;
  const slabs = kind === 'deck' ? 8 : kind === 'concrete' || kind === 'runway' ? 6 : 0;

  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N;
    const fine = vnoise(u * 128, v * 128, seed, 128);
    const broad = fbm(u * 8, v * 8, seed + 5, 4, 8);
    let shade = kind === 'studio' ? 0.99 + (broad - 0.5) * 0.02 : 0.9 + 0.18 * broad + (fine - 0.5) * 0.08;
    let groove = 0.5 + (fine - 0.5) * (kind === 'studio' ? 0.03 : 0.35);

    if (slabs > 0) {
      const fx = (u * slabs) % 1, fy = (v * slabs) % 1;
      const d = Math.min(Math.min(fx, 1 - fx), Math.min(fy, 1 - fy)) * (N / slabs);
      if (d < 1.8) { shade *= 0.72 + 0.28 * (d / 1.8); groove = 0.12; }
    }
    if (kind === 'deck') {
      // Mắt chằng buộc máy bay (tie-down padeyes) đặc trưng của boong tàu sân bay
      const px = ((u * 16) % 1) - 0.5, py = ((v * 16) % 1) - 0.5;
      if (Math.hypot(px, py) < 0.045) { shade *= 0.65; groove = 0.2; }
    }
    if (kind === 'runway') {
      // Vệt lốp cao su dọc tâm đường băng
      const skid = Math.exp(-(((v - 0.5) / 0.14) ** 2)) * Math.max(0, fbm(u * 24, v * 6, seed + 17, 3, 24) - 0.42);
      shade *= 1 - skid * 0.35;
    }

    const i = (y * N + x) * 4;
    img.data[i] = Math.max(0, Math.min(255, br * shade));
    img.data[i + 1] = Math.max(0, Math.min(255, bg * shade));
    img.data[i + 2] = Math.max(0, Math.min(255, bb * shade));
    img.data[i + 3] = 255;

    const bv = Math.max(0, Math.min(255, groove * 255));
    bimg.data[i] = bimg.data[i + 1] = bimg.data[i + 2] = bv;
    bimg.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  if (markings && (kind === 'runway' || kind === 'asphalt' || kind === 'deck')) {
    ctx.fillStyle = kind === 'asphalt' ? 'rgba(235, 196, 76, 0.82)' : 'rgba(236, 240, 244, 0.85)';
    for (let x = 32; x < N; x += 128) ctx.fillRect(x, N / 2 - 7, 72, 14);
    ctx.fillStyle = 'rgba(236, 240, 244, 0.72)';
    ctx.fillRect(0, 56, N, 8);
    ctx.fillRect(0, N - 64, N, 8);
  }

  const map = new THREE.CanvasTexture(cv);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const bump = new THREE.CanvasTexture(bcv);
  bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
  bump.anisotropy = 8;

  const res = { map, bump };
  surfCache.set(key, res);
  return res;
};

export type SurfaceProps = {
  kind?: SurfaceKind;
  /** Kích thước [dài X, rộng Z] (m) hoặc cạnh vuông (mặc định 240). */
  size?: number | [number, number];
  center?: [number, number];
  y?: number;
  color?: string;
  /** Kẻ vạch tim đường / đường băng (mặc định true cho runway, false cho loại khác). */
  markings?: boolean;
  /** Dựng phông cong liền sàn kiểu phòng studio/sa bàn không đường chân trời gãy (dùng cho kind='studio'). */
  cyclorama?: boolean;
  seed?: number;
};

const DEFAULT_SURF_COLOR: Record<SurfaceKind, string> = {
  runway: '#767b82',
  concrete: '#92969b',
  asphalt: '#3b3f46',
  deck: '#454a52',
  studio: '#d8dde4',
};

/** Mặt nền nhân tạo (đường băng, sân bê tông, đường nhựa, boong tàu, sàn studio/sa bàn sạch). */
export const Surface: React.FC<SurfaceProps> = ({
  kind = 'concrete', size = 240, center = [0, 0], y = 0, color, markings, cyclorama = false, seed = 3,
}) => {
  const [sx, sz] = Array.isArray(size) ? size : [size, size];
  const baseCol = color ?? DEFAULT_SURF_COLOR[kind];
  const showMark = markings ?? (kind === 'runway');

  const mat = useMemo(() => {
    const { map, bump } = makeSurfaceTex(kind, baseCol, showMark, seed);
    const m = map.clone(), b = bump.clone();
    m.needsUpdate = true; b.needsUpdate = true;
    const tile = kind === 'studio' ? 1 : kind === 'runway' ? 36 : 24;
    m.repeat.set(Math.max(1, sx / tile), Math.max(1, sz / tile));
    b.repeat.set(Math.max(1, sx / tile), Math.max(1, sz / tile));
    return new THREE.MeshStandardMaterial({
      map: m,
      bumpMap: b,
      bumpScale: kind === 'studio' ? 0.002 : 0.025,
      roughness: kind === 'studio' ? 0.78 : kind === 'asphalt' ? 0.86 : 0.82,
      metalness: kind === 'deck' ? 0.18 : 0.04,
    });
  }, [kind, baseCol, showMark, seed, sx, sz]);

  const geo = useMemo(() => {
    if (!cyclorama) {
      const g = new THREE.PlaneGeometry(sx, sz, 1, 1);
      g.rotateX(-Math.PI / 2);
      return g;
    }
    // Phông cong cyclorama uốn mượt từ sàn ngang lên tường đứng phía xa (bán kính cong R = 14m)
    const R = 14, H = Math.min(60, sz * 0.45);
    const pts: [number, number][] = [
      [-sz * 0.5, H],
      [-sz * 0.5, R],
    ];
    for (let i = 1; i <= 12; i++) {
      const a = Math.PI + (i / 12) * (Math.PI / 2);
      pts.push([-sz * 0.5 + R + Math.cos(a) * R, R + Math.sin(a) * R]);
    }
    pts.push([sz * 0.5, 0]);
    const pos: number[] = [], uv: number[] = [], idx: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      const [pz, py] = pts[i];
      pos.push(-sx / 2, py, pz, sx / 2, py, pz);
      uv.push(0, i / (pts.length - 1), 1, i / (pts.length - 1));
      if (i < pts.length - 1) {
        const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
        idx.push(a, c, b, b, c, d);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, [sx, sz, cyclorama]);

  return <mesh geometry={geo} material={mat} position={[center[0], y, center[1]]} receiveShadow userData={{ isGround: true }} />;
};
