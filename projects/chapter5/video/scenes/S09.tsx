// S09 — Radar phản pháo & shoot-and-scoot (3D), 210.62 → 232.70.
// Phần A (tới s09_scoot): góc cao sau RadarTruck; đạn địch bay ngang trời, radar quét → khoá → vẽ ngược quỹ đạo teal
// về khẩu địch, vòng đỏ khoanh vị trí; phản pháo phía mình khai hỏa (đạn cam bay đi).
// Phần B: máy thấp ngang ở bãi bắn khác: SPH chạy vào, dừng, nâng nòng, bắn 2 phát, chạy đi; phản pháo rơi chỗ trống.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Stage, Cam, V3 } from '@lib/3d/stage';
import { Terrain, Scatter, heightField, HeightFn } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, DustTrail, Trail, ballistic, ballisticPoints } from '@lib/3d/fx';
import { grain } from '@lib/3d/materials';
import { useT } from '@kit/motion';
import { prog, lerp } from '@kit/theme';
import { SPH, RadarTruck, Shell155, muzzleOf } from '../local/models';
import { CUE } from '../cues';

const TEAL = '#2fb3a8';
const ORANGE = '#ff9a3c';
const RED = '#e04a3a';

// ---------- bố cục thế giới ----------
const R0: V3 = [0, 0, 0]; // xe radar, mũi hướng -Z
const RY = Math.PI / 2;
const E: V3 = [-320, 0, -420]; // khẩu địch
const T: V3 = [380, 0, -380]; // đích đạn địch (ngoài khung)
const APEX = 140;
const B1: V3 = [60, 0, -160]; // khẩu phản pháo phía mình
const B2: V3 = [78, 0, -146];
const F: V3 = [-200, 0, 520]; // bãi bắn của khẩu bị săn (phần B)

const ENEMY_FIRE = 212.0;
const ENEMY_FLIGHT = 9.0;
const pEnemy = (t: number) => (t - ENEMY_FIRE) / ENEMY_FLIGHT;

const roadDip = (x: number, z: number) => {
  const d = Math.abs(z - F[2]);
  return d < 6 ? -0.12 * (1 - d / 6) : 0;
};
const hills = (x: number, z: number) => {
  const far = 1 / (1 + Math.exp((z + 950) / 110));
  const back = 1 / (1 + Math.exp(-(z - 1150) / 110));
  return (far + back) * (38 + 22 * Math.sin(x / 210) + 12 * Math.sin(x / 77 + 1.3));
};
const H: HeightFn = heightField({
  seed: 9, amp: 2.6, scale: 170, oct: 4,
  flats: [[R0[0], R0[2], 30, 0], [E[0], E[2], 35, 0], [B1[0], B1[2], 40, 0], [F[0], F[2], 60, 0]],
  add: (x, z) => hills(x, z),
});
const Hroad: HeightFn = (x, z) => H(x, z) + roadDip(x, z);

const nearRoad = (x: number, z: number) =>
  Math.abs(z - F[2]) < 9 || Math.hypot(x - R0[0], z - R0[2]) < 25 || Math.hypot(x - E[0], z - E[2]) < 28 || Math.hypot(x - B1[0], z - B1[2]) < 32 ||
  (Math.abs(x - F[0]) < 30 && z > F[2] && z < F[2] + 30);

// ---------- quỹ đạo ----------
const ENEMY_PTS = ballisticPoints([E[0], 3, E[2]], [T[0], 0, T[2]], APEX, 200);
const shellPos = (p: number): V3 => ballistic(p, [E[0], 3, E[2]], [T[0], 0, T[2]], APEX);
const TRACE_FROM = pEnemy(CUE.s09_trace);
const TRACE_PTS: V3[] = Array.from({ length: 120 }, (_, i) => shellPos(TRACE_FROM * (1 - i / 119)));

const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const add3 = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const yawTo = (from: V3, to: V3) => Math.atan2(-(to[2] - from[2]), to[0] - from[0]);
const ELEV_B = 0.62;
const RY_B1 = yawTo(B1, E), RY_B2 = yawTo(B2, E);
const MZ_B1 = add3(B1, rotY(muzzleOf(ELEV_B), RY_B1));
const MZ_B2 = add3(B2, rotY(muzzleOf(ELEV_B), RY_B2));
const COUNTER1 = ballisticPoints(MZ_B1, [E[0], 1, E[2]], 150, 160);
const COUNTER2 = ballisticPoints(MZ_B2, [E[0] + 8, 1, E[2] - 6], 150, 160);
const C_FIRE1 = CUE.s09_counter, C_FIRE2 = CUE.s09_counter + 0.45, C_FLIGHT = 5.2;
const RY_E = yawTo(E, T);
const MZ_E = add3(E, rotY(muzzleOf(0.5), RY_E));

// ---------- phần B: chuyển động SPH ----------
const ARRIVE = 226.3;
const sPos = (t: number) => {
  if (t <= ARRIVE) { const p = Math.max(0, (t - CUE.s09_scoot) / (ARRIVE - CUE.s09_scoot)); return -46 * (1 - p) ** 2; }
  if (t <= CUE.s09_leaves) return 0;
  const d = t - CUE.s09_leaves, tc = 1.56;
  return d < tc ? 4.5 * d * d : 4.5 * tc * tc + 14 * (d - tc);
};
const FIRE_B = [CUE.s09_fires, CUE.s09_fires + 0.72];
const elevB = (t: number) => lerp(0.05, 0.62, prog(t, 226.1, 227.1)) * (1 - prog(t, CUE.s09_leaves, CUE.s09_leaves + 0.9)) + 0.06 * prog(t, CUE.s09_leaves, CUE.s09_leaves + 0.9);
const yawB = (t: number) => 0.45 * prog(t, 226.0, 227.0) * (1 - prog(t, CUE.s09_leaves, CUE.s09_leaves + 1.2));
const recoilAt = (t: number, at: number) => {
  const d = t - at;
  if (d < 0 || d > 0.9) return 0;
  return d < 0.05 ? d / 0.05 : (1 - (d - 0.05) / 0.85) ** 2;
};
const sphB = (t: number): V3 => { const x = F[0] + sPos(t); return [x, Hroad(x, F[2]) + 0.02, F[2]]; };
const INCOMING_FROM: V3 = [F[0] - 70, 130, F[2] - 90];
const INCOMING = ballisticPoints(INCOMING_FROM, [F[0], 0.5, F[2]], 10, 60);

// ---------- quạt quét radar (tự dựng, additive) ----------
const sectorGeo = (half: number) => {
  const N = 24, pos: number[] = [];
  for (const plane of [0, 1]) {
    for (let i = 0; i < N; i++) {
      const a0 = -half + (2 * half * i) / N, a1 = -half + (2 * half * (i + 1)) / N;
      const v = (a: number): number[] => (plane === 0 ? [Math.cos(a), Math.sin(a), 0] : [Math.cos(a), 0, Math.sin(a)]);
      pos.push(0, 0, 0, ...v(a0), ...v(a1));
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  return g;
};
const BEAM_V = `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const BEAM_F = `uniform float uOp; uniform float uTime; uniform float uHalf; uniform vec3 uColor; varying vec3 vP;
void main(){
  float r = clamp(length(vP), 0.0, 1.0);
  float ang = atan(length(vP.yz), vP.x) / max(uHalf, 1e-3);
  float edge = smoothstep(0.75, 1.0, ang) * 0.9;
  float rings = smoothstep(0.82, 1.0, 0.5 + 0.5 * sin(r * 26.0 - uTime * 9.0));
  float a = uOp * pow(1.0 - r, 0.55) * (0.35 + edge + rings * 0.6);
  gl_FragColor = vec4(uColor, a);
}`;
const Beam: React.FC<{ origin: V3; dir: V3; length: number; half: number; opacity: number; time: number }> = ({ origin, dir, length, half, opacity, time }) => {
  const hq = Math.round(half * 200) / 200;
  const geo = useMemo(() => sectorGeo(hq), [hq]);
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: BEAM_V, fragmentShader: BEAM_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uOp: { value: 0 }, uTime: { value: 0 }, uHalf: { value: 0.1 }, uColor: { value: new THREE.Color(TEAL) } },
  }), []);
  mat.uniforms.uOp.value = opacity;
  mat.uniforms.uTime.value = time;
  mat.uniforms.uHalf.value = hq;
  if (opacity < 0.005) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...dir).normalize());
  return <mesh geometry={geo} material={mat} position={origin} quaternion={q} scale={length} frustumCulled={false} renderOrder={5} />;
};

// ---------- vòng đỏ + cột sáng đánh dấu vị trí khẩu địch ----------
const Marker: React.FC<{ t: number; at: number; pos: V3 }> = ({ t, at, pos }) => {
  const d = t - at;
  if (d < 0) return null;
  const pop = Math.min(1, d / 0.35);
  const s = 46 * (0.3 + 0.7 * (1 - (1 - pop) ** 3)) * (1 + 0.08 * Math.max(0, 1 - d / 0.6));
  const pulse = (d % 1.2) / 1.2;
  return (
    <group position={[pos[0], H(pos[0], pos[2]) + 0.8, pos[2]]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={s} renderOrder={6}>
        <ringGeometry args={[0.86, 1, 72]} />
        <meshBasicMaterial color={RED} transparent opacity={0.95 * pop} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} scale={s * (1 + pulse * 0.9)} renderOrder={6}>
        <ringGeometry args={[0.95, 1, 72]} />
        <meshBasicMaterial color={RED} transparent opacity={0.7 * (1 - pulse) * pop} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <mesh position={[0, 45, 0]} renderOrder={6}>
        <cylinderGeometry args={[2.5, 5, 90, 16, 1, true]} />
        <meshBasicMaterial color={RED} transparent opacity={0.6 * pop} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} fog={false} />
      </mesh>
    </group>
  );
};

// ---------- đường đất ----------
const Road: React.FC<{ x0: number; x1: number; z: number; w: number }> = ({ x0, x1, z, w }) => {
  const geo = useMemo(() => {
    const g = new THREE.PlaneGeometry(x1 - x0, w, 240, 6);
    g.rotateX(-Math.PI / 2);
    g.translate((x0 + x1) / 2, 0, z);
    const p = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(p.count * 3), c = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), zz = p.getZ(i);
      p.setY(i, Hroad(x, zz) + 0.05);
      const rut = Math.abs(Math.abs(zz - z) - 1.3) < 0.35 ? 0.78 : 1;
      c.set('#8b7150').multiplyScalar(rut * (0.92 + 0.16 * Math.sin(x * 0.7 + zz * 3)));
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.computeVertexNormals();
    return g;
  }, [x0, x1, z, w]);
  const mat = useMemo(() => {
    const tx = grain(23, 6).clone();
    tx.needsUpdate = true;
    tx.repeat.set(60, 2);
    return new THREE.MeshStandardMaterial({ vertexColors: true, map: tx, roughness: 1 });
  }, []);
  return <mesh geometry={geo} material={mat} receiveShadow />;
};

// Hàng cây bờ ruộng (dải hẹp nhiều đoạn).
const HEDGES: { a: [number, number, number, number]; n: number; seed: number; kind: 'broadleaf' | 'bush' | 'pine' }[] = [
  { a: [-650, -128, -60, -116], n: 60, seed: 3, kind: 'broadleaf' },
  { a: [-10, -128, 420, -116], n: 40, seed: 4, kind: 'broadleaf' },
  { a: [-800, -306, -380, -294], n: 40, seed: 5, kind: 'broadleaf' },
  { a: [-250, -306, 600, -294], n: 70, seed: 6, kind: 'broadleaf' },
  { a: [-420, -470, -230, -455], n: 28, seed: 7, kind: 'pine' },
  { a: [-900, -620, 700, -600], n: 120, seed: 8, kind: 'broadleaf' },
  { a: [-160, -280, -150, -130], n: 14, seed: 9, kind: 'broadleaf' },
  { a: [-60, -60, 160, -40], n: 16, seed: 10, kind: 'bush' },
  { a: [-60, 30, 90, 60], n: 16, seed: 11, kind: 'bush' },
  // phần B
  { a: [-330, 492, -60, 500], n: 46, seed: 12, kind: 'broadleaf' },
  { a: [-330, 470, -60, 480], n: 22, seed: 13, kind: 'pine' },
  { a: [-260, 534, -140, 552], n: 26, seed: 14, kind: 'bush' },
  { a: [-450, 380, 50, 440], n: 30, seed: 15, kind: 'broadleaf' },
];

const S09: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const partA = t < CUE.s09_scoot;

  // ---------- radar ----------
  const pe = pEnemy(t);
  const shell = shellPos(Math.min(1.2, Math.max(0, pe)));
  const lock = prog(t, CUE.s09_radar - 0.2, CUE.s09_radar + 0.6);
  const radarBase: V3 = [R0[0] + 0.35, 2.85, R0[2] + 1.75];
  const scanYaw = 0.55 * Math.sin((t - 210) * 1.4) + 0.25;
  const scanDir: V3 = [-Math.sin(scanYaw), 0.32, -Math.cos(scanYaw)];
  const toShell = new THREE.Vector3(shell[0] - radarBase[0], shell[1] - radarBase[1], shell[2] - radarBase[2]);
  const shellDist = toShell.length();
  toShell.normalize();
  const dirV = new THREE.Vector3(...scanDir).normalize().lerp(toShell, lock).normalize();
  const radarYaw = Math.atan2(-dirV.x, -dirV.z);
  const glow = 0.3 + 0.7 * lock;
  const beamLen = lerp(170, shellDist * 1.04, lock);
  const beamHalf = lerp(0.2, 0.035, lock);
  const beamOp = (0.3 + 0.55 * lock) * (1 - prog(t, 217.2, 218.4) * 0.6);
  const radarOrigin: V3 = [radarBase[0] + dirV.x * 0.4, radarBase[1] + dirV.y * 0.4, radarBase[2] + dirV.z * 0.4];

  // ---------- camera ----------
  let pos: V3, look: V3, fov = 48;
  if (partA) {
    const a = prog(t, 210.4, 215.0), b = prog(t, CUE.s09_trace, 217.6), c = prog(t, 217.6, CUE.s09_scoot, (x) => x);
    const p0: V3 = [lerp(-6, -4, a), lerp(12.5, 11.5, a), lerp(34, 28, a)];
    const l0: V3 = [lerp(-70, -110, a), lerp(16, 34, a), -400];
    const p1: V3 = [-40, 120, -10], l1: V3 = [-230, 0, -360];
    const p2: V3 = [-10, 135, 20], l2: V3 = [-170, 0, -320];
    pos = [lerp(lerp(p0[0], p1[0], b), p2[0], c), lerp(lerp(p0[1], p1[1], b), p2[1], c), lerp(lerp(p0[2], p1[2], b), p2[2], c)];
    look = [lerp(lerp(l0[0], l1[0], b), l2[0], c), lerp(lerp(l0[1], l1[1], b), l2[1], c), lerp(lerp(l0[2], l1[2], b), l2[2], c)];
  } else {
    fov = 40;
    const v = sphB(t);
    const follow = Math.min(v[0], F[0] + 3);
    const k = prog(t, CUE.s09_scoot, 226.5);
    const w = prog(t, 228.2, 231.0);
    pos = [lerp(F[0] - 14, F[0] - 3, k) + 3 * w, 1.6 + 0.5 * w, F[2] + 22 + 4 * w];
    look = [lerp(follow + 2, F[0] + 1.5, prog(t, 225.5, 227.0)) + 4 * w + 0.3 * Math.max(0, sPos(t) - 8), 2.0 + 1.5 * prog(t, 230.3, 232.5), F[2]];
    fov = 40 + 6 * prog(t, 229.6, 232.5);
    const sh = t - CUE.s09_impact;
    if (sh > 0 && sh < 2) {
      const amp = 0.35 * Math.exp(-sh * 2.6);
      pos = [pos[0] + amp * Math.sin(sh * 53), pos[1] + amp * Math.sin(sh * 71 + 1), pos[2]];
      look = [look[0] + amp * 0.6 * Math.sin(sh * 47 + 2), look[1] + amp * 0.6 * Math.sin(sh * 61), look[2]];
    }
  }

  // ---------- phần B: SPH ----------
  const vb = sphB(t);
  const eB = elevB(t), yB = yawB(t);
  const recB = Math.max(...FIRE_B.map((f) => recoilAt(t, f)));
  const travelB = sPos(t) + 46;
  const incP = prog(t, CUE.s09_impact - 0.55, CUE.s09_impact, (x) => x);

  return (
    <Stage
      sky={['#4f7fb5', '#f0c890', '#d8b48a']}
      sun={[-60, 22, 30]}
      sunColor="#ffd49a"
      sunIntensity={2.9}
      exposure={1.05}
      fog={[260, 1900]}
      fogColor="#e6c495"
      env={0.3}
      ambient={0.22}
      shadowArea={partA ? 45 : 40}
      shadowCenter={partA ? [0, 0, -5] : [F[0] + 5, 0, F[2]]}
      post={{ bloom: 0.7, bloomThreshold: 0.8, vignette: 0.4 }}
    >
      <Cam pos={pos} look={look} fov={fov} />
      <Terrain h={Hroad} size={3200} seg={400} center={[0, 100]} colors={{ low: '#8f7a48', high: '#b49a5e', rock: '#6e5c3f', dry: '#c8aa66' }} grainRepeat={180} />
      <Road x0={F[0] - 260} x1={F[0] + 260} z={F[2]} w={5.5} />
      {HEDGES.map((g, i) => (
        <Scatter key={i} tint="#d6b77a" kind={g.kind} count={g.n} area={g.a} h={H} seed={g.seed} scale={g.kind === 'bush' ? [1.2, 2.2] : [0.9, 1.5]} avoid={nearRoad} />
      ))}

      {partA && (
        <>
          {/* xe radar */}
          <group position={[R0[0], H(R0[0], R0[2]), R0[2]]} rotation={[0, RY, 0]}>
            <RadarTruck yaw={radarYaw} glow={glow} />
          </group>
          <Beam origin={radarOrigin} dir={[dirV.x, dirV.y, dirV.z]} length={beamLen} half={beamHalf} opacity={beamOp} time={t} />

          {/* khẩu địch + đạn địch */}
          <group position={E} rotation={[0, RY_E, 0]}><SPH elev={0.5} /></group>
          <MuzzleBlast t={t} at={ENEMY_FIRE} pos={MZ_E} dir={[1, 0.6, 0]} size={5} seed={4} />
          {pe > 0 && pe < 1.05 && (
            <>
              <Trail points={ENEMY_PTS} upto={Math.min(1, pe)} color={ORANGE} width={0.9} opacity={0.85} />
              <group position={shell} quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...shellPos(Math.min(1, pe) + 0.01)).sub(new THREE.Vector3(...shell)).normalize())}>
                <Shell155 scale={14} />
                <mesh position={[0, 0, 0]}><sphereGeometry args={[2.2, 12, 8]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.5} toneMapped={false} /></mesh>
              </group>
            </>
          )}

          {/* vẽ ngược quỹ đạo về khẩu địch */}
          {t > CUE.s09_trace && (
            <Trail points={TRACE_PTS} upto={prog(t, CUE.s09_trace, 216.9)} color={TEAL} width={1.3} opacity={0.95} />
          )}
          <Marker t={t} at={216.75} pos={E} />

          {/* phản pháo phía mình */}
          <group position={B1} rotation={[0, RY_B1, 0]}><SPH elev={ELEV_B} recoil={recoilAt(t, C_FIRE1)} /></group>
          <group position={B2} rotation={[0, RY_B2, 0]}><SPH elev={ELEV_B} recoil={recoilAt(t, C_FIRE2)} /></group>
          <MuzzleBlast t={t} at={C_FIRE1} pos={MZ_B1} dir={[MZ_B1[0] - B1[0], 4, MZ_B1[2] - B1[2]]} size={4.5} seed={6} />
          <MuzzleBlast t={t} at={C_FIRE2} pos={MZ_B2} dir={[MZ_B2[0] - B2[0], 4, MZ_B2[2] - B2[2]]} size={4.5} seed={7} />
          {[[COUNTER1, C_FIRE1], [COUNTER2, C_FIRE2]].map(([pts, at], i) => {
            const p = ((t - (at as number)) / C_FLIGHT);
            if (p <= 0) return null;
            const P = pts as V3[];
            const idx = Math.min(P.length - 2, Math.floor(p * (P.length - 1)));
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(...P[idx + 1]).sub(new THREE.Vector3(...P[idx])).normalize());
            return (
              <group key={i}>
                <Trail points={P} upto={Math.min(1, p)} color={ORANGE} width={1.0} opacity={0.9} />
                <group position={P[idx]} quaternion={q}>
                  <Shell155 scale={14} />
                  <mesh><sphereGeometry args={[2.0, 12, 8]} /><meshBasicMaterial color="#ffd27a" transparent opacity={0.55} toneMapped={false} /></mesh>
                </group>
              </group>
            );
          })}
        </>
      )}

      {!partA && (
        <>
          <group position={vb}>
            <SPH elev={eB} yaw={yB} recoil={recB} travel={travelB} />
          </group>
          <DustTrail t={t} from={CUE.s09_scoot} to={ARRIVE - 0.3} path={(tt) => { const p = sphB(tt); return [p[0] - 3.2, p[1], p[2] + 1.0]; }} rate={9} size={2.4} color="#c9b48a" />
          <DustTrail t={t} from={CUE.s09_leaves + 0.1} to={232.8} path={(tt) => { const p = sphB(tt); return [p[0] - 3.2, p[1], p[2] + 1.0]; }} rate={10} size={2.8} color="#c9b48a" />
          {FIRE_B.map((f, i) => (
            <MuzzleBlast key={i} t={t} at={f} pos={add3(sphB(f), muzzleOf(elevB(f), yawB(f)))} dir={[Math.cos(elevB(f)) * Math.cos(yawB(f)), Math.sin(elevB(f)), -Math.cos(elevB(f)) * Math.sin(yawB(f))]} size={2.2} seed={10 + i} />
          ))}
          {FIRE_B.map((f, i) => {
            const d = t - f;
            if (d < 0 || d > 1.6) return null;
            const m0 = add3(sphB(f), muzzleOf(elevB(f), yawB(f)));
            const pts: V3[] = Array.from({ length: 30 }, (_, j) => { const k = j / 29 * 600; return [m0[0] + Math.cos(elevB(f)) * Math.cos(yawB(f)) * k, m0[1] + Math.sin(elevB(f)) * k, m0[2] - Math.cos(elevB(f)) * Math.sin(yawB(f)) * k]; });
            return <Trail key={`f${i}`} points={pts} upto={Math.min(1, d / 0.35)} color={ORANGE} width={0.12} opacity={0.8 * (1 - d / 1.6)} />;
          })}
          {incP > 0 && incP < 1 && (
            <>
              <Trail points={INCOMING} upto={incP} color={ORANGE} width={0.25} opacity={0.85} />
            </>
          )}
          <Explosion t={t} at={CUE.s09_impact} pos={[F[0], Hroad(F[0], F[2]), F[2]]} size={4.5} seed={9} smokeLife={8} />
          {/* hố đạn sau nổ */}
          {t > CUE.s09_impact + 0.1 && (
            <mesh position={[F[0], Hroad(F[0], F[2]) + 0.08, F[2]]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <circleGeometry args={[3.2, 28]} />
              <meshStandardMaterial color="#2e261d" roughness={1} transparent opacity={0.85} />
            </mesh>
          )}
        </>
      )}
    </Stage>
  );
};

export default S09;
