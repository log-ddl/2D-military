// Sân khấu 3D: canvas + bầu trời + nắng có bóng đổ + môi trường phản chiếu động theo trời/nắng + bóng tiếp xúc gầm + hậu kỳ HDR.
// Mọi cảnh 3D bọc trong <Stage>, đặt <Cam> bên trong. Thông số mặc định là ban ngày trong; mỗi video tự chỉnh
// theo thiết kế mỹ thuật của mình (giờ trong ngày, sương, độ phơi sáng…), không có "giao diện chuẩn" bắt buộc.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import { useFrame, useThree } from '@react-three/fiber';
import { EffectComposer, Bloom, DepthOfField, N8AO, Vignette, ToneMapping, SMAA } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';

export type V3 = [number, number, number];

export type StagePostOpts = {
  bloom?: number;
  /** Ngưỡng phát sáng HDR (mặc định 1.2 để sơn sáng không bị cháy nhoè; chỉ lửa nổ / đèn phát sáng mới bloom). */
  bloomThreshold?: number;
  ao?: number;
  aoRadius?: number;
  vignette?: number;
  /** Xoá phông điện ảnh tuỳ chọn cho cảnh cận cơ khí / tiêu cự dài. */
  dof?: { target: V3; focalLength?: number; bokehScale?: number; focusRange?: number };
};

export type StageProps = {
  children: React.ReactNode;
  /** Màu trời: đỉnh, chân trời, dưới chân trời / mặt đất hắt lên. */
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
  /** Cường độ ánh sáng môi trường phản chiếu trên kim loại, sơn, kính, mặt nước. */
  env?: number;
  ambient?: number;
  exposure?: number;
  /** Hậu kỳ; false để tắt hẳn (nhanh hơn khi thử). */
  post?: false | StagePostOpts;
  width?: number;
  height?: number;
};

export const Stage: React.FC<StageProps> = ({
  children, sky = ['#3f8ed6', '#a9d6f2', '#d8e4e8'], sun = [40, 60, 25], sunColor = '#fff3df', sunIntensity = 2.6,
  shadowArea = 40, shadowCenter = [0, 0, 0], fog = [140, 700], fogColor, env = 0.62, ambient = 0.3, exposure = 1,
  post = {}, width = 1920, height = 1080,
}) => {
  const effects: React.ReactElement[] = [];
  if (post !== false) {
    effects.push(<N8AO key="ao" aoRadius={post.aoRadius ?? 1.8} intensity={post.ao ?? 2.5} distanceFalloff={0.85} halfRes />);
    if (post.dof) {
      effects.push(
        <DepthOfField
          key="dof"
          target={post.dof.target}
          focalLength={post.dof.focalLength ?? 0.028}
          worldFocusRange={post.dof.focusRange ?? 14}
          bokehScale={post.dof.bokehScale ?? 2.4}
        />,
      );
    }
    effects.push(<Bloom key="bl" intensity={post.bloom ?? 0.55} luminanceThreshold={post.bloomThreshold ?? 1.2} luminanceSmoothing={0.22} mipmapBlur />);
    effects.push(<ToneMapping key="tm" mode={ToneMappingMode.ACES_FILMIC} />);
    effects.push(<Vignette key="vg" offset={0.32} darkness={post.vignette ?? 0.38} />);
    effects.push(<SMAA key="aa" />);
  }
  const fillDir: V3 = [-sun[0], Math.max(12, Math.abs(sun[1]) * 0.45), -sun[2]];
  return (
    <ThreeCanvas width={width} height={height} dpr={1} shadows flat={post !== false} gl={{ antialias: post === false, toneMappingExposure: exposure }}>
      <SkyDome colors={sky} sun={sun} />
      {fog && <fog attach="fog" args={[fogColor ?? sky[1], fog[0], fog[1]]} />}
      <Env sky={sky} sun={sun} sunColor={sunColor} sunIntensity={sunIntensity} intensity={env} />
      <hemisphereLight args={[sky[1], sky[2], ambient]} />
      <directionalLight position={fillDir} color={sky[1]} intensity={sunIntensity * 0.14} />
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
export const Cam: React.FC<{ pos: V3; look: V3; fov?: number; roll?: number }> = ({ pos, look, fov = 38, roll = 0 }) => {
  const { camera } = useThree();
  const apply = () => {
    camera.position.set(...pos);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(...look);
    const pc = camera as THREE.PerspectiveCamera;
    pc.fov = fov;
    pc.near = 0.1;
    pc.far = 3500;
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
  light.shadow.bias = -0.00025;
  light.shadow.normalBias = 0.018;
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

// Cache PMREM theo từng WebGLRenderer để không nướng lại mỗi khung hình khi trời/nắng không đổi.
const envCache = new WeakMap<THREE.WebGLRenderer, Map<string, THREE.Texture>>();

const Env: React.FC<{ sky: [string, string, string]; sun: V3; sunColor: string; sunIntensity: number; intensity: number }> = ({
  sky, sun, sunColor, sunIntensity, intensity,
}) => {
  const { gl, scene } = useThree();
  gl.localClippingEnabled = true;
  const sx = Math.round(sun[0] * 10), sy = Math.round(sun[1] * 10), sz = Math.round(sun[2] * 10);
  const key = `${sky[0]}|${sky[1]}|${sky[2]}|${sx},${sy},${sz}|${sunColor}|${sunIntensity.toFixed(1)}`;

  const tex = useMemo(() => {
    let map = envCache.get(gl);
    if (!map) { map = new Map(); envCache.set(gl, map); }
    const hit = map.get(key);
    if (hit) return hit;

    // Sinh vòm môi trường HDR khớp đúng bầu trời, hướng mặt trời và ánh hắt mặt đất của cảnh
    const envScene = new THREE.Scene();
    const domeGeo = new THREE.SphereGeometry(20, 48, 24);
    const pos = domeGeo.attributes.position as THREE.BufferAttribute;
    const cols = new Float32Array(pos.count * 3);
    const cTop = new THREE.Color(sky[0]), cHor = new THREE.Color(sky[1]), cBot = new THREE.Color(sky[2]), cSun = new THREE.Color(sunColor);
    const sunDir = new THREE.Vector3(...sun).normalize();
    const v = new THREE.Vector3(), c = new THREE.Color();
    const sunBoost = Math.min(6, Math.max(0.5, sunIntensity * 1.4));

    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      if (v.y >= 0) {
        c.copy(cHor).lerp(cTop, Math.pow(v.y, 0.55));
        // Dải sáng mềm trên đỉnh trời giúp kim loại/kính bắt ven sáng mượt
        const zenithBand = Math.exp(-(((v.z) * 2.2) ** 2)) * Math.pow(v.y, 1.4) * 0.22;
        c.r += zenithBand; c.g += zenithBand; c.b += zenithBand;
      } else {
        c.copy(cHor).multiplyScalar(0.72).lerp(cBot.clone().multiplyScalar(0.52), Math.min(1, -v.y * 2.8));
      }
      const sd = Math.max(0, v.dot(sunDir));
      const spec = (Math.pow(sd, 64) * 3.2 + Math.pow(sd, 8) * 0.42) * sunBoost;
      cols[i * 3] = c.r + cSun.r * spec;
      cols[i * 3 + 1] = c.g + cSun.g * spec;
      cols[i * 3 + 2] = c.b + cSun.b * spec;
    }
    domeGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const domeMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, toneMapped: false });
    envScene.add(new THREE.Mesh(domeGeo, domeMat));

    const pm = new THREE.PMREMGenerator(gl);
    const rt = pm.fromScene(envScene, 0.025);
    pm.dispose();
    domeGeo.dispose();
    domeMat.dispose();

    // Giới hạn tối đa 16 mẫu cache trên một context để tránh rò bộ nhớ khi mặt trời di chuyển liên tục
    if (map.size >= 16) {
      const oldest = map.keys().next().value;
      if (oldest !== undefined) { map.get(oldest)?.dispose(); map.delete(oldest); }
    }
    map.set(key, rt.texture);
    return rt.texture;
  }, [gl, key]);

  scene.environment = tex;
  scene.environmentIntensity = intensity;
  return null;
};

const BLUR_V = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const BLUR_F = `
  uniform sampler2D tMap;
  uniform vec2 uStep;
  varying vec2 vUv;
  void main() {
    float w0 = 0.227027;
    float w1 = 0.316216;
    float w2 = 0.070270;
    vec4 s = texture2D(tMap, vUv) * w0;
    s += texture2D(tMap, vUv + uStep * 1.3846) * w1;
    s += texture2D(tMap, vUv - uStep * 1.3846) * w1;
    s += texture2D(tMap, vUv + uStep * 3.2308) * w2;
    s += texture2D(tMap, vUv - uStep * 3.2308) * w2;
    gl_FragColor = s;
  }
`;

export type ContactShadowProps = {
  /** Tâm vùng bóng tiếp xúc [x, groundY, z] (mặc định [0, 0, 0]). */
  center?: V3;
  /** Cạnh vùng phủ bóng (m, mặc định 20). */
  size?: number;
  /** Chiều cao tối đa tính bóng tiếp xúc từ mặt đất lên (m, mặc định 4.5). */
  reach?: number;
  /** Độ đậm bóng sát chân vật thể 0..1 (mặc định 0.62). */
  opacity?: number;
  /** Bán kính làm nhoè bóng mềm (mặc định 1.8). */
  blur?: number;
  color?: string;
  /** Hàm độ cao mặt đất (nếu đặt trên địa hình lồi lõm). */
  h?: (x: number, z: number) => number;
};

/**
 * Bóng tiếp xúc mềm dưới gầm phương tiện / bánh xe / chân lính (chụp chiều sâu trực giao từ trên xuống + làm mờ Gaussian 2 lượt).
 * Loại bỏ triệt để hiện tượng vật thể "bay lơ lửng" trên mặt sàn hay địa hình.
 */
export const ContactShadow: React.FC<ContactShadowProps> = ({
  center = [0, 0, 0], size = 20, reach = 4.5, opacity = 0.62, blur = 1.8, color = '#0a0f18', h,
}) => {
  const { gl, scene } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);
  const res = 256;

  const pack = useMemo(() => {
    const opts: THREE.RenderTargetOptions = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBAFormat, depthBuffer: true };
    const rtDepth = new THREE.WebGLRenderTarget(res, res, opts);
    const rtPing = new THREE.WebGLRenderTarget(res, res, { ...opts, depthBuffer: false });
    const rtFinal = new THREE.WebGLRenderTarget(res, res, { ...opts, depthBuffer: false });

    const cam = new THREE.OrthographicCamera(-size / 2, size / 2, size / 2, -size / 2, 0.04, reach);
    const depthMat = new THREE.ShaderMaterial({
      uniforms: { uGroundY: { value: center[1] }, uReach: { value: reach } },
      vertexShader: `
        varying float vWorldY;
        #include <common>
        #include <morphtarget_pars_vertex>
        #include <skinning_pars_vertex>
        void main() {
          #include <begin_vertex>
          #include <morphtarget_vertex>
          #include <skinning_vertex>
          vec4 wp = modelMatrix * vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
          #endif
          vWorldY = wp.y;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform float uGroundY;
        uniform float uReach;
        varying float vWorldY;
        void main() {
          float d = clamp((vWorldY - uGroundY) / max(0.05, uReach), 0.0, 1.0);
          float a = pow(1.0 - d, 1.85);
          gl_FragColor = vec4(1.0, 1.0, 1.0, a);
        }
      `,
      transparent: true,
      depthWrite: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.MaxEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    });

    const blurScene = new THREE.Scene();
    const blurCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const blurMat = new THREE.ShaderMaterial({
      vertexShader: BLUR_V,
      fragmentShader: BLUR_F,
      uniforms: { tMap: { value: rtDepth.texture }, uStep: { value: new THREE.Vector2() } },
      depthTest: false,
      depthWrite: false,
    });
    const quadGeo = new THREE.PlaneGeometry(2, 2);
    blurScene.add(new THREE.Mesh(quadGeo, blurMat));

    const receiverMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      uniforms: {
        tShadow: { value: rtFinal.texture },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
      },
      vertexShader: `
        varying vec2 vUv;
        #include <fog_pars_vertex>
        void main() {
          vUv = uv;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          #include <fog_vertex>
        }
      `,
      fragmentShader: `
        uniform sampler2D tShadow;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec2 vUv;
        #include <fog_pars_fragment>
        void main() {
          // Tắt dần ở rìa vùng chụp để không bao giờ lộ viền vuông
          vec2 edge = smoothstep(0.0, 0.12, vUv) * smoothstep(0.0, 0.12, 1.0 - vUv);
          float mask = edge.x * edge.y;
          float a = texture2D(tShadow, vUv).a * uOpacity * mask;
          if (a < 0.004) discard;
          gl_FragColor = vec4(uColor, a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
          #include <fog_fragment>
        }
      `,
    });

    return { rtDepth, rtPing, rtFinal, cam, depthMat, blurScene, blurCam, blurMat, quadGeo, receiverMat };
  }, [res, size, reach]);

  useEffect(() => () => {
    pack.rtDepth.dispose();
    pack.rtPing.dispose();
    pack.rtFinal.dispose();
    pack.depthMat.dispose();
    pack.blurMat.dispose();
    pack.quadGeo.dispose();
    pack.receiverMat.dispose();
  }, [pack]);

  const planeGeo = useMemo(() => {
    const seg = h ? 40 : 1;
    const g = new THREE.PlaneGeometry(size, size, seg, seg);
    g.rotateX(-Math.PI / 2);
    if (h) {
      const p = g.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        const wx = center[0] + p.getX(i), wz = center[2] + p.getZ(i);
        p.setY(i, h(wx, wz) - center[1] + 0.02);
      }
      g.computeVertexNormals();
    }
    return g;
  }, [size, h, center[0], center[1], center[2]]);

  const capture = () => {
    const { rtDepth, rtPing, rtFinal, cam, depthMat, blurScene, blurCam, blurMat, receiverMat } = pack;
    cam.left = -size / 2; cam.right = size / 2; cam.top = size / 2; cam.bottom = -size / 2;
    cam.near = 0.04; cam.far = Math.max(0.2, reach - 0.02);
    cam.position.set(center[0], center[1] + reach, center[2]);
    cam.up.set(0, 0, -1);
    cam.lookAt(center[0], center[1], center[2]);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();

    depthMat.uniforms.uGroundY.value = center[1];
    depthMat.uniforms.uReach.value = reach;
    receiverMat.uniforms.uColor.value.set(color);
    receiverMat.uniforms.uOpacity.value = opacity;

    // Tạm ẩn mặt đất, vòm trời, lưới, hạt sprite và chính tấm nhận bóng khi chụp chiều sâu gầm
    const hidden: THREE.Object3D[] = [];
    scene.traverse((obj) => {
      if (!obj.visible) return;
      const m = (obj as THREE.Mesh).material;
      const transparentNoDepth = m && !Array.isArray(m) && m.transparent && m.depthWrite === false;
      if (
        obj === meshRef.current ||
        obj.userData?.isGround ||
        obj.userData?.noShadow ||
        transparentNoDepth ||
        obj instanceof THREE.Points ||
        obj instanceof THREE.Sprite ||
        obj instanceof THREE.Line
      ) {
        obj.visible = false;
        hidden.push(obj);
      }
    });

    const prevTarget = gl.getRenderTarget();
    const prevOverride = scene.overrideMaterial;
    const prevClearAlpha = gl.getClearAlpha();
    const prevColor = gl.getClearColor(new THREE.Color());
    const prevShadowAuto = gl.shadowMap.autoUpdate;

    gl.shadowMap.autoUpdate = false;
    scene.overrideMaterial = depthMat;
    gl.setClearColor(0x000000, 0);
    gl.setRenderTarget(rtDepth);
    gl.clear(true, true, false);
    gl.render(scene, cam);
    scene.overrideMaterial = prevOverride;

    for (const o of hidden) o.visible = true;

    // 2 lượt Gaussian tách trục cho vùng penumbra êm tự nhiên
    const step = blur / res;
    blurMat.uniforms.tMap.value = rtDepth.texture;
    blurMat.uniforms.uStep.value.set(step, 0);
    gl.setRenderTarget(rtPing);
    gl.clear(true, false, false);
    gl.render(blurScene, blurCam);

    blurMat.uniforms.tMap.value = rtPing.texture;
    blurMat.uniforms.uStep.value.set(0, step);
    gl.setRenderTarget(rtFinal);
    gl.clear(true, false, false);
    gl.render(blurScene, blurCam);

    gl.setRenderTarget(prevTarget);
    gl.setClearColor(prevColor, prevClearAlpha);
    gl.shadowMap.autoUpdate = prevShadowAuto;
  };

  useLayoutEffect(capture);
  useFrame(capture);

  return (
    <mesh
      ref={meshRef}
      geometry={planeGeo}
      material={pack.receiverMat}
      position={[center[0], center[1] + (h ? 0 : 0.012), center[2]]}
      userData={{ isGround: true }}
      renderOrder={1}
    />
  );
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
  return <mesh material={mat} renderOrder={-1} userData={{ isGround: true }}><sphereGeometry args={[1500, 32, 16]} /></mesh>;
};
