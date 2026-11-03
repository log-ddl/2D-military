// Hiệu ứng 3D tất định theo thời gian t (giây voice):
// - Explosion, MuzzleBlast, DustTrail, Trail, ballistic, ballisticPoints (nâng cấp cầu lửa bức xạ nhiệt + sóng xung kích + tia lửa)
// - JetPlume: luồng phụt động cơ phản lực / tên lửa có vân kim cương siêu thanh (Mach diamonds)
// - RotorBlur: đĩa mờ chuyển động quay tốc độ cao (cánh quạt trực thăng, chân vịt, tuabin)
// - SmokeColumn: cột lửa & khói đen bốc lên liên tục theo gió (mục tiêu cháy, hỏng động cơ, chiến trường)
import React, { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { fbm } from './materials';

type V3 = [number, number, number];
const r1 = (i: number, k: number, s: number) => { const v = Math.sin(i * 12.9898 + k * 78.233 + s * 37.719) * 43758.5453; return v - Math.floor(v); };
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

let soft: THREE.Texture | null = null;
/** Texture đám mây khói fBm mượt liên tục (không bị đốm chấm tròn khi chồng nhiều lớp sprite). */
export const softDot = () => {
  if (soft) return soft;
  const N = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (x - N / 2) / (N / 2), dy = (y - N / 2) / (N / 2);
    const r = Math.hypot(dx, dy);
    const n = fbm((x / N) * 5.5, (y / N) * 5.5, 17, 4);
    const radial = Math.max(0, 1 - r / Math.max(0.45, 0.78 + (n - 0.5) * 0.42));
    const a = radial * radial * (3 - 2 * radial);
    const shade = 225 + (n - 0.5) * 55;
    const i = (y * N + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(170, Math.min(255, shade));
    img.data[i + 3] = Math.max(0, Math.min(255, a * 255));
  }
  ctx.putImageData(img, 0, 0);
  soft = new THREE.CanvasTexture(cv);
  soft.colorSpace = THREE.SRGBColorSpace;
  return soft;
};

const Puff: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({ pos, size, color, opacity, rot = 0 }) => {
  const mat = useMemo(() => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }), []);
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  if (opacity <= 0.003) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

// Shader cầu lửa cuộn bức xạ vật đen (biên tan mềm theo góc nhìn để không lộ cạnh đa giác)
const FIREBALL_V = `
  uniform float uAge;
  uniform float uSeed;
  varying float vHeat;
  varying float vBillow;
  varying vec3 vNorm;
  varying vec3 vView;

  float h3(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float n3(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(h3(i), h3(i + vec3(1,0,0)), u.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), u.x), u.y),
      mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), u.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), u.x), u.y),
      u.z
    );
  }
  float fbm3(vec3 p) {
    float s = 0.0, a = 0.55;
    for (int i = 0; i < 4; i++) { s += a * n3(p); p = p * 2.07 + vec3(13.1, 7.7, 23.3); a *= 0.5; }
    return s;
  }

  void main() {
    vec3 sp = position * 2.6 + vec3(uSeed * 5.1, -uAge * 3.1, uSeed * 3.7);
    float billow = fbm3(sp);
    float disp = (billow - 0.38) * (0.36 + uAge * 0.38);
    vec3 displaced = position + normal * disp;
    vBillow = billow;
    vHeat = clamp(1.22 - billow * 1.05 - uAge * 0.78, 0.0, 1.0);
    vec4 wp = modelMatrix * vec4(displaced, 1.0);
    vNorm = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - wp.xyz);
    gl_Position = projectionMatrix * viewMatrix * wp;
  }
`;

const FIREBALL_F = `
  uniform float uFade;
  varying float vHeat;
  varying float vBillow;
  varying vec3 vNorm;
  varying vec3 vView;
  void main() {
    float ndv = abs(dot(normalize(vNorm), normalize(vView)));
    float edgeSoft = pow(clamp(ndv, 0.0, 1.0), 1.65);
    float h = clamp(vHeat * (0.55 + 0.45 * ndv), 0.0, 1.0);
    vec3 soot = vec3(0.09, 0.08, 0.07);
    vec3 red = vec3(0.95, 0.18, 0.03);
    vec3 orange = vec3(1.85, 0.68, 0.10);
    vec3 core = vec3(3.4, 2.75, 1.55);
    vec3 col = h < 0.26 ? mix(soot, red, h / 0.26)
             : h < 0.66 ? mix(red, orange, (h - 0.26) / 0.40)
             : mix(orange, core, (h - 0.66) / 0.34);
    float a = clamp(uFade * edgeSoft * (0.85 + 0.3 * vBillow), 0.0, 0.96);
    if (a < 0.01) discard;
    gl_FragColor = vec4(col, a);
  }
`;

const FireballMesh: React.FC<{ age: number; fade: number; scale: number; pos: V3; seed: number }> = ({ age, fade, scale, pos, seed }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: FIREBALL_V,
    fragmentShader: FIREBALL_F,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    uniforms: { uAge: { value: 0 }, uSeed: { value: seed }, uFade: { value: 1 } },
  }), [seed]);
  useEffect(() => () => mat.dispose(), [mat]);
  mat.uniforms.uAge.value = age;
  mat.uniforms.uFade.value = fade;
  return (
    <mesh position={pos} scale={scale} material={mat}>
      <icosahedronGeometry args={[1, 5]} />
    </mesh>
  );
};

// Sóng xung kích mỏng tan mềm sát đất
const ShockwaveRing: React.FC<{ radius: number; opacity: number }> = ({ radius, opacity }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: { uOp: { value: 0.3 } },
    vertexShader: `varying vec2 vPos; void main(){ vPos = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: `
      uniform float uOp;
      varying vec2 vPos;
      void main() {
        float r = length(vPos);
        if (r > 1.0 || r < 0.75) discard;
        float band = exp(-pow((r - 0.93) / 0.038, 2.0));
        float a = band * uOp;
        if (a < 0.005) discard;
        gl_FragColor = vec4(vec3(0.95, 0.92, 0.86), a);
      }
    `,
  }), []);
  useEffect(() => () => mat.dispose(), [mat]);
  mat.uniforms.uOp.value = opacity;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.12, 0]} scale={radius} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
};

/**
 * Vụ nổ chạm đất tại `pos` lúc `at`: chớp sáng + sóng xung kích + cầu lửa cuộn nhiệt + tia lửa/mảnh văng + vòng bụi + cột khói.
 * `size` ~ bán kính cầu lửa (m). `smokeLife` = giây khói còn lưu lại.
 */
export const Explosion: React.FC<{ t: number; at: number; pos: V3; size?: number; seed?: number; smokeLife?: number; smoke?: string }> = ({
  t, at, pos, size = 4, seed = 1, smokeLife = 7, smoke = '#524c45',
}) => {
  const dt = t - at;
  if (dt < 0 || dt > smokeLife) return null;
  const fireLife = 0.85;
  const fire = Math.max(0, 1 - dt / fireLife);
  const shock = dt < 0.34 ? (1 - dt / 0.34) ** 1.6 : 0;
  const N = 26, D = 28;
  return (
    <group position={pos}>
      {dt < 0.55 && <pointLight color="#ffb860" intensity={size * size * 65 * (1 - dt / 0.55) ** 2} distance={size * 20} decay={1.5} position={[0, size * 0.9, 0]} />}
      {shock > 0 && <ShockwaveRing radius={size * (0.9 + ease(dt / 0.34) * 3.2)} opacity={shock * 0.32} />}
      {/* Cột khói cuộn đặt quanh và sau cầu lửa */}
      {Array.from({ length: N }, (_, i) => {
        const born = (i / N) * 0.72, age = dt - born;
        if (age < 0) return null;
        const life = smokeLife - born;
        const rise = size * (0.85 + i * 0.13) * ease(age / 2.6) + age * 0.65;
        const k = Math.max(0, 1 - age / life);
        const warmGlow = Math.max(0, 1 - dt / 0.95) * Math.max(0, 1 - i / (N * 0.5));
        const baseSmoke = new THREE.Color(age < 0.45 ? '#2f2924' : smoke).lerp(new THREE.Color('#8e887f'), Math.min(1, age / life));
        if (warmGlow > 0) baseSmoke.lerp(new THREE.Color('#df6d20'), warmGlow * 0.55);
        return (
          <Puff
            key={i}
            pos={[(r1(i, 6, seed) - 0.5) * size * 1.5 + age * 0.42, size * 0.5 + rise, (r1(i, 7, seed) - 0.5) * size * 1.5]}
            size={size * (1.35 + r1(i, 8, seed)) * (0.7 + ease(age / 3) * 1.45)}
            color={`#${baseSmoke.getHexString()}`}
            opacity={0.78 * k}
            rot={i * 1.7 + age * 0.25}
          />
        );
      })}
      {/* Vòng bụi cuộn sát đất */}
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2 + r1(i, 5, seed);
        const d = size * (0.65 + ease(dt / 1.5) * 2.7);
        return <Puff key={`d${i}`} pos={[Math.cos(a) * d, size * 0.3, Math.sin(a) * d]} size={size * (1.2 + dt * 0.82)} color="#b0a084" opacity={0.68 * Math.max(0, 1 - dt / 3.2)} rot={i} />;
      })}
      {fire > 0 && (
        <>
          <FireballMesh age={dt / fireLife} fade={fire} scale={size * (0.48 + ease(dt / 0.5) * 0.92)} pos={[0, size * (0.45 + dt * 0.55), 0]} seed={seed} />
          <FireballMesh age={dt / fireLife + 0.1} fade={fire * 0.85} scale={size * (0.34 + ease(dt / 0.55) * 0.68)} pos={[size * 0.24, size * (0.7 + dt * 0.72), -size * 0.16]} seed={seed + 7} />
          <FireballMesh age={dt / fireLife + 0.16} fade={fire * 0.8} scale={size * (0.3 + ease(dt / 0.55) * 0.62)} pos={[-size * 0.22, size * (0.58 + dt * 0.65), size * 0.2]} seed={seed + 13} />
        </>
      )}
      {/* Tia lửa nóng rực + mảnh vỡ đạn đạo */}
      {dt < 2.2 && Array.from({ length: D }, (_, i) => {
        const a = r1(i, 1, seed) * Math.PI * 2, up = 0.38 + r1(i, 2, seed) * 0.92, v = size * (3.2 + r1(i, 3, seed) * 4.5);
        const x = Math.cos(a) * v * dt * (1 - up * 0.45), z = Math.sin(a) * v * dt * (1 - up * 0.45), y = v * up * dt - 4.9 * dt * dt;
        if (y < -0.15) return null;
        const isSpark = i % 2 === 0 && dt < 1.1;
        return (
          <mesh key={i} position={[x, y, z]} rotation={[dt * 9 + i, dt * 7, 0]} castShadow={!isSpark}>
            <boxGeometry args={isSpark ? [size * 0.12, size * 0.02, size * 0.02] : [size * 0.07, size * 0.045, size * 0.055]} />
            {isSpark ? (
              <meshBasicMaterial color="#ffe090" toneMapped={false} transparent opacity={Math.max(0, 1 - dt / 1.1)} />
            ) : (
              <meshStandardMaterial color="#34312d" roughness={0.9} />
            )}
          </mesh>
        );
      })}
    </group>
  );
};

/** Lửa + luồng chớp hãm đầu nòng + khói thuốc phóng tại `pos`, hướng bắn `dir` (vector). */
export const MuzzleBlast: React.FC<{ t: number; at: number; pos: V3; dir: V3; size?: number; seed?: number }> = ({ t, at, pos, dir, size = 1.5, seed = 2 }) => {
  const dt = t - at;
  if (dt < 0 || dt > 4) return null;
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  const flash = Math.max(0, 1 - dt / 0.13);
  return (
    <group position={pos}>
      {dt < 0.16 && <pointLight color="#ffd27a" intensity={240 * size * flash} distance={size * 24} decay={1.5} />}
      {flash > 0 && (
        <group quaternion={q}>
          {/* Tia phụt chính dọc trục nòng và 2 tia thoát ngang qua loa hãm giật */}
          <JetPlume t={t} pos={[0, 0, 0]} dir={[1, 0, 0]} length={size * 2.4} radius={size * 0.28} thrust={flash * 1.2} color="#ff8c24" coreColor="#fff4cc" />
          <JetPlume t={t} pos={[size * 0.12, 0, 0]} dir={[0.25, 0, 1]} length={size * 1.15} radius={size * 0.16} thrust={flash} color="#ff7b1c" coreColor="#ffe8a8" />
          <JetPlume t={t} pos={[size * 0.12, 0, 0]} dir={[0.25, 0, -1]} length={size * 1.15} radius={size * 0.16} thrust={flash} color="#ff7b1c" coreColor="#ffe8a8" />
        </group>
      )}
      {Array.from({ length: 16 }, (_, i) => {
        const side = new THREE.Vector3(r1(i, 1, seed) - 0.5, r1(i, 2, seed) * 0.55, r1(i, 3, seed) - 0.5).normalize();
        const fwd = i < 7 ? 1 : 0.28;
        const p = d.clone().multiplyScalar(size * (0.9 + ease(dt / 0.8) * 5.2 * fwd)).add(side.multiplyScalar(size * ease(dt / 1.2) * 2.8)).add(new THREE.Vector3(0, dt * 0.75, 0));
        return <Puff key={i} pos={[p.x, p.y, p.z]} size={size * (0.9 + ease(dt / 2) * 2.9)} color="#ccc5ba" opacity={0.68 * Math.max(0, 1 - dt / 4)} rot={i + dt * 0.3} />;
      })}
    </group>
  );
};

/**
 * Luồng phụt phản lực / động cơ tên lửa có vân kim cương siêu thanh (Mach shock diamonds).
 * Hướng phụt dọc vector `dir` bắt đầu từ miệng ống xả `pos`.
 */
export const JetPlume: React.FC<{
  t: number;
  pos?: V3;
  dir?: V3;
  length?: number;
  radius?: number;
  thrust?: number;
  color?: string;
  coreColor?: string;
}> = ({ t, pos = [0, 0, 0], dir = [-1, 0, 0], length = 4.2, radius = 0.38, thrust = 1, color = '#ff6e1a', coreColor = '#ffdca8' }) => {
  const k = Math.max(0, Math.min(1.5, thrust));
  const q = useMemo(() => new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...dir).normalize()), [dir[0], dir[1], dir[2]]);

  const sheathMat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
    toneMapped: false,
    uniforms: {
      uTime: { value: 0 },
      uOuter: { value: new THREE.Color(color) },
      uCore: { value: new THREE.Color(coreColor) },
      uThrust: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNorm;
      varying vec3 vView;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNorm = normalize(mat3(modelMatrix) * normal);
        vView = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uOuter;
      uniform vec3 uCore;
      uniform float uThrust;
      varying vec2 vUv;
      varying vec3 vNorm;
      varying vec3 vView;
      void main() {
        // CylinderGeometry: vUv.y = 0 tại đáy miệng xả (y = -L/2), vUv.y = 1 tại mút đuôi luồng phụt (y = +L/2)
        float s = vUv.y;
        float ndv = max(0.0, dot(normalize(vNorm), normalize(vView)));
        float edge = pow(ndv, 2.1);
        float flick = 0.92 + 0.08 * sin(uTime * 58.0 - s * 20.0);
        float diamonds = pow(max(0.0, sin(s * 25.0 - uTime * 22.0)), 6.0) * pow(max(0.0, 1.0 - s), 1.2);
        float axial = smoothstep(0.0, 0.06, s) * pow(max(0.0, 1.0 - s), 1.6) * flick;
        vec3 base = mix(uOuter * 0.95, uCore * 1.45, clamp((1.0 - s * 2.2) * 0.55 + diamonds * 0.9, 0.0, 1.0));
        float intensity = (axial * 0.55 + diamonds * 0.95) * edge * uThrust;
        if (intensity < 0.004) discard;
        gl_FragColor = vec4(base * intensity, clamp(intensity, 0.0, 1.0));
      }
    `,
  }), []);

  useEffect(() => () => sheathMat.dispose(), [sheathMat]);

  if (k <= 0.01) return null;
  sheathMat.uniforms.uTime.value = t;
  sheathMat.uniforms.uOuter.value.set(color);
  sheathMat.uniforms.uCore.value.set(coreColor);
  sheathMat.uniforms.uThrust.value = k;

  const L = length * (0.55 + 0.45 * k);
  return (
    <group position={pos} quaternion={q}>
      <mesh position={[0, L / 2, 0]} material={sheathMat}>
        <cylinderGeometry args={[radius * 0.12, radius, L, 24, 32, true]} />
      </mesh>
      <mesh position={[0, L * 0.34, 0]} material={sheathMat}>
        <cylinderGeometry args={[radius * 0.04, radius * 0.48, L * 0.68, 20, 24, true]} />
      </mesh>
    </group>
  );
};

/**
 * Đĩa mờ chuyển động quay tốc độ cao (shutter motion-blur disc) cho cánh quạt trực thăng, máy bay cánh quạt, chân vịt, quạt tuabin.
 * Đặt nằm trong mặt phẳng X–Z (trục quay +Y cục bộ) — xoay `rotation` theo trục ổ trục thực tế.
 */
export const RotorBlur: React.FC<{
  radius: number;
  innerRadius?: number;
  blades?: number;
  /** Góc quay hiện tại (rad) để vệt mờ bám đúng pha lá cánh. */
  spin?: number;
  /** Độ nhoè màn trập 0..1 (0 = tắt đĩa mờ khi đứng yên, 0.75..1 = đang quay nhanh). */
  blur?: number;
  color?: string;
  tipColor?: string;
  position?: V3;
  rotation?: V3;
}> = ({ radius, innerRadius = 0.12, blades = 3, spin = 0, blur = 0.85, color = '#222830', tipColor = '#dfe6ee', position = [0, 0, 0], rotation = [0, 0, 0] }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uInner: { value: innerRadius / Math.max(0.01, radius) },
      uBlades: { value: blades },
      uSpin: { value: 0 },
      uBlur: { value: 0.85 },
      uCol: { value: new THREE.Color(color) },
      uTip: { value: new THREE.Color(tipColor) },
    },
    vertexShader: `
      varying vec2 vPos;
      void main() {
        vPos = position.xz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uInner;
      uniform float uBlades;
      uniform float uSpin;
      uniform float uBlur;
      uniform vec3 uCol;
      uniform vec3 uTip;
      varying vec2 vPos;
      void main() {
        float r = length(vPos);
        if (r > 1.0 || r < uInner) discard;
        float ang = atan(vPos.y, vPos.x) - uSpin;
        float sector = 0.5 + 0.5 * cos(ang * uBlades);
        float wedge = mix(pow(sector, 6.0), 0.38 + 0.34 * sector, clamp(uBlur, 0.0, 1.0));
        float radialFade = smoothstep(uInner, uInner + 0.08, r) * (1.0 - smoothstep(0.96, 1.0, r));
        float tipBand = smoothstep(0.91, 0.95, r) * (1.0 - smoothstep(0.985, 1.0, r));
        vec3 col = mix(uCol, uTip, tipBand * 0.85);
        float a = clamp(wedge * radialFade * uBlur * 0.46 + tipBand * uBlur * 0.24, 0.0, 0.65);
        if (a < 0.006) discard;
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }), []);

  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(2, 2, 1, 1);
    g.rotateX(-Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => { mat.dispose(); geo.dispose(); }, [mat, geo]);

  if (blur <= 0.02) return null;
  mat.uniforms.uInner.value = innerRadius / Math.max(0.01, radius);
  mat.uniforms.uBlades.value = blades;
  mat.uniforms.uSpin.value = spin;
  mat.uniforms.uBlur.value = blur;
  mat.uniforms.uCol.value.set(color);
  mat.uniforms.uTip.value.set(tipColor);

  return <mesh geometry={geo} material={mat} position={position} rotation={rotation} scale={[radius, 1, radius]} />;
};

/**
 * Cột lửa cháy âm ỉ + khói đen bốc cao liên tục theo gió (xe cháy, động cơ trúng đạn, khói chiến trường).
 */
export const SmokeColumn: React.FC<{
  t: number;
  from: number;
  until?: number;
  pos: V3;
  size?: number;
  wind?: [number, number];
  fire?: boolean;
  color?: string;
  seed?: number;
}> = ({ t, from, until = 1e9, pos, size = 2.4, wind = [1.4, 0.4], fire = true, color = '#3c3834', seed = 5 }) => {
  if (t < from) return null;
  const life = 5.5, rate = 6;
  const t0 = Math.max(from, t - life), t1 = Math.min(until, t);
  const puffs: React.ReactNode[] = [];
  for (let k = Math.ceil(t0 * rate); k <= Math.floor(t1 * rate); k++) {
    const born = k / rate, age = t - born;
    if (age < 0 || age > life) continue;
    const u = age / life;
    const isFlame = fire && age < 0.65;
    const px = (r1(k, 1, seed) - 0.5) * size * 0.55 + wind[0] * age * (0.5 + 0.5 * u);
    const pz = (r1(k, 2, seed) - 0.5) * size * 0.55 + wind[1] * age * (0.5 + 0.5 * u);
    const py = age * size * 1.15;
    const c = isFlame
      ? new THREE.Color('#ff9d2e').lerp(new THREE.Color('#c83b12'), age / 0.65)
      : new THREE.Color(color).lerp(new THREE.Color('#78736c'), u);
    puffs.push(
      <Puff
        key={k}
        pos={[px, py, pz]}
        size={size * (isFlame ? 0.65 + age * 0.9 : 0.9 + u * 2.6)}
        color={`#${c.getHexString()}`}
        opacity={isFlame ? 0.85 * (1 - age / 0.65) : 0.62 * Math.sin(Math.min(1, age * 2.5) * (Math.PI / 2)) * (1 - u)}
        rot={k * 1.3 + age * 0.35}
      />,
    );
  }
  return <group position={pos}>{puffs}</group>;
};

/** Bụi tung sau phương tiện: `path(t)` trả vị trí bánh xe theo giây; sinh hạt trong [from, to]. */
export const DustTrail: React.FC<{ t: number; from: number; to: number; path: (t: number) => V3; rate?: number; size?: number; color?: string; life?: number }> = ({
  t, from, to, path, rate = 8, size = 2.2, color = '#c9b893', life = 3,
}) => {
  const items: React.ReactNode[] = [];
  const t0 = Math.max(from, t - life), t1 = Math.min(to, t);
  for (let k = Math.ceil(t0 * rate); k <= Math.floor(t1 * rate); k++) {
    const born = k / rate, age = t - born;
    const p = path(born);
    items.push(<Puff key={k} pos={[p[0] + (r1(k, 1, 4) - 0.5) * 1.5, p[1] + 0.4 + age * 0.7, p[2] + (r1(k, 2, 4) - 0.5) * 1.5]} size={size * (0.6 + age)} color={color} opacity={0.55 * (1 - age / life)} rot={k} />);
  }
  return <>{items}</>;
};

/** Vệt sáng theo dãy điểm (quỹ đạo đạn), vẽ tới tỉ lệ `upto` 0..1. Phát sáng (bloom) khi `glow`. */
export const Trail: React.FC<{ points: V3[]; upto?: number; color?: string; width?: number; opacity?: number; glow?: boolean }> = ({
  points, upto = 1, color = '#ffb347', width = 0.15, opacity = 0.9, glow = true,
}) => {
  const n = Math.max(2, Math.floor(points.length * Math.min(1, upto)));
  const geo = useMemo(() => {
    if (upto <= 0.001) return null;
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.slice(0, n).map((p) => new THREE.Vector3(...p))), n * 2, width, 6, false);
  }, [points, n, width, upto]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  const matColor = glow ? new THREE.Color(color).multiplyScalar(1.8) : new THREE.Color(color);
  return (
    <mesh geometry={geo}>
      <meshBasicMaterial color={matColor} transparent opacity={opacity} toneMapped={!glow} />
    </mesh>
  );
};

/** Điểm trên quỹ đạo đạn đạo (parabol) từ `a` tới `b`, đỉnh cao `apex` trên đường nối; p = 0..1. */
export const ballistic = (p: number, a: V3, b: V3, apex: number): V3 => [
  a[0] + (b[0] - a[0]) * p,
  a[1] + (b[1] - a[1]) * p + apex * 4 * p * (1 - p),
  a[2] + (b[2] - a[2]) * p,
];
export const ballisticPoints = (a: V3, b: V3, apex: number, n = 64): V3[] => Array.from({ length: n }, (_, i) => ballistic(i / (n - 1), a, b, apex));
