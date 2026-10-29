// Sân khấu 3D: canvas + bầu trời + nắng có bóng đổ + ánh sáng môi trường + hậu kỳ.
// Mọi cảnh 3D bọc trong <Stage>, đặt <Cam> bên trong. Thông số mặc định là ban ngày trong; mỗi video tự chỉnh
// theo thiết kế mỹ thuật của mình (giờ trong ngày, sương, độ phơi sáng…), không có "giao diện chuẩn" bắt buộc.
import React, { useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, N8AO, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

export type V3 = [number, number, number];

export type StageProps = {
  children: React.ReactNode;
  /** Màu trời: đỉnh, chân trời, dưới chân trời. */
  sky?: [string, string, string];
  /** Hướng tới mặt trời (không cần chuẩn hoá). */
  sun?: V3;
  sunColor?: string;
  sunIntensity?: number;
  /** Nửa cạnh vùng có bóng đổ quanh `shadowCenter` (đơn vị cảnh). Vùng nhỏ = bóng sắc. */
  shadowArea?: number;
  shadowCenter?: V3;
  /** Sương: khoảng cách bắt đầu / mù hẳn; màu mặc định = chân trời. */
  fog?: [number, number] | null;
  fogColor?: string;
  /** Cường độ ánh sáng môi trường (phản chiếu trên kim loại, sơn). */
  env?: number;
  ambient?: number;
  exposure?: number;
  /** Hậu kỳ; false để tắt hẳn (nhanh hơn khi thử). */
  post?: false | { bloom?: number; bloomThreshold?: number; ao?: number; aoRadius?: number; vignette?: number };
  width?: number;
  height?: number;
};

export const Stage: React.FC<StageProps> = ({
  children, sky = ['#3f8ed6', '#a9d6f2', '#e7f2f2'], sun = [40, 60, 25], sunColor = '#fff3df', sunIntensity = 2.6,
  shadowArea = 40, shadowCenter = [0, 0, 0], fog = [140, 700], fogColor, env = 0.35, ambient = 0.18, exposure = 1,
  post = {}, width = 1920, height = 1080,
}) => {
  const effects: React.ReactElement[] = [];
  if (post !== false) {
    effects.push(<N8AO key="ao" aoRadius={post.aoRadius ?? 2.5} intensity={post.ao ?? 2.2} distanceFalloff={1} halfRes />);
    effects.push(<Bloom key="bl" intensity={post.bloom ?? 0.6} luminanceThreshold={post.bloomThreshold ?? 0.82} luminanceSmoothing={0.2} mipmapBlur />);
    effects.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
    effects.push(<Vignette key="vg" offset={0.3} darkness={post.vignette ?? 0.45} />);
    effects.push(<SMAA key="aa" />);
  }
  return (
    <ThreeCanvas width={width} height={height} dpr={1} shadows flat={post !== false} gl={{ antialias: post === false, toneMappingExposure: exposure }}>
      <SkyDome colors={sky} sun={sun} />
      {fog && <fog attach="fog" args={[fogColor ?? sky[1], fog[0], fog[1]]} />}
      <Env intensity={env} />
      <hemisphereLight args={[sky[1], '#6b6152', ambient]} />
      <Sun dir={sun} color={sunColor} intensity={sunIntensity} area={shadowArea} center={shadowCenter} mapSize={4096} />
      {children}
      {post !== false && <EffectComposer multisampling={0}>{effects}</EffectComposer>}
      {post !== false && <PostWarmup />}
    </ThreeCanvas>
  );
};

/** Composer khởi tạo render target ở lần vẽ đầu nên khung đầu mỗi tab render bị đen: vẽ nháp 2 lần rồi mới cho chụp. */
const PostWarmup: React.FC = () => {
  const advance = useThree((s) => s.advance);
  const [h] = useState(() => delayRender('post warmup'));
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      advance(performance.now());
      advance(performance.now());
      continueRender(h);
    });
    return () => cancelAnimationFrame(id);
  }, [advance, h]);
  return null;
};

/** Camera theo khung hình. Nội suy pos/look bằng prog() ở cảnh rồi truyền vào. */
export const Cam: React.FC<{ pos: V3; look: V3; fov?: number; roll?: number }> = ({ pos, look, fov = 40, roll = 0 }) => {
  const { camera } = useThree();
  const apply = () => {
    camera.position.set(...pos);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(...look);
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov = fov;
    pc.near = 0.1;
    pc.far = 3000;
    pc.updateProjectionMatrix();
    camera.updateMatrixWorld();
  };
  apply();
  useLayoutEffect(apply);
  return null;
};

const Sun: React.FC<{ dir: V3; color: string; intensity: number; area: number; center: V3; mapSize: number }> = ({ dir, color, intensity, area, center, mapSize }) => {
  const light = useMemo(() => new THREE.DirectionalLight(), []);
  const d = new THREE.Vector3(...dir).normalize().multiplyScalar(area * 3);
  light.color.set(color);
  light.intensity = intensity;
  light.position.set(center[0] + d.x, center[1] + d.y, center[2] + d.z);
  light.target.position.set(...center);
  light.target.updateMatrixWorld();
  light.castShadow = true;
  if (light.shadow.mapSize.x !== mapSize) {
    light.shadow.mapSize.set(mapSize, mapSize);
    light.shadow.map?.dispose();
    light.shadow.map = null;
  }
  light.shadow.bias = -0.0004;
  light.shadow.normalBias = 0.03;
  const c = light.shadow.camera;
  c.left = -area; c.right = area; c.top = area; c.bottom = -area; c.near = 1; c.far = area * 8;
  c.updateProjectionMatrix();
  return (
    <>
      <primitive object={light} />
      <primitive object={light.target} />
    </>
  );
};

const Env: React.FC<{ intensity: number }> = ({ intensity }) => {
  const { gl, scene } = useThree();
  const tex = useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    const t = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    pm.dispose();
    return t;
  }, [gl]);
  scene.environment = tex;
  scene.environmentIntensity = intensity;
  return null;
};

const SKY_V = `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const SKY_F = `uniform vec3 top; uniform vec3 hor; uniform vec3 bot; uniform vec3 sun; varying vec3 vDir;
void main(){
  float y = vDir.y;
  vec3 c = y > 0.0 ? mix(hor, top, pow(clamp(y,0.0,1.0), 0.55)) : mix(hor, bot, clamp(-y*4.0,0.0,1.0));
  float s = max(dot(normalize(vDir), normalize(sun)), 0.0);
  c += vec3(1.0,0.92,0.75) * (pow(s, 600.0) * 1.5 + pow(s, 12.0) * 0.18);
  gl_FragColor = vec4(c, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

/** Vòm trời gradient + quầng mặt trời (không bị sương che). */
export const SkyDome: React.FC<{ colors: [string, string, string]; sun: V3 }> = ({ colors, sun }) => {
  const mat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader: SKY_V, fragmentShader: SKY_F, side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color() }, hor: { value: new THREE.Color() }, bot: { value: new THREE.Color() }, sun: { value: new THREE.Vector3() } },
  }), []);
  mat.uniforms.top.value.set(colors[0]);
  mat.uniforms.hor.value.set(colors[1]);
  mat.uniforms.bot.value.set(colors[2]);
  mat.uniforms.sun.value.set(...sun);
  return (
    <mesh material={mat} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1500, 32, 16]} />
    </mesh>
  );
};
