// Nạp mô hình .glb chuẩn hoá từ Blender/BlenderKit vào Remotion <Stage> (an toàn khung đầu nhờ delayRender + advance).
// Hỗ trợ mổ xẻ cơ khí liền mạch (Seamless Cutaway):
// - Cắt mặt phẳng động `clipPlanes` giữ nguyên 100% texture PBR thật của BlenderKit
// - Tự thắp viền cắt laser HDR phát sáng dọc đúng tiết diện vỏ bị xẻ (ăn khớp Bloom của Stage)
// - Tuỳ chọn phủ lớp vỏ X-Ray `ghost` mờ ở phần bị xẻ đi để giữ nguyên biên dạng tổng thể của máy bay/khí tài.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { ghost } from './materials';
import type { V3 } from './stage';

const gltfCache = new Map<string, Promise<GLTF>>();
const parsedCache = new Map<string, GLTF>();

function loadCachedGLTF(url: string): Promise<GLTF> {
  if (parsedCache.has(url)) return Promise.resolve(parsedCache.get(url)!);
  if (!gltfCache.has(url)) {
    const loader = new GLTFLoader();
    gltfCache.set(
      url,
      new Promise<GLTF>((resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            parsedCache.set(url, gltf);
            resolve(gltf);
          },
          undefined,
          (err) => reject(err),
        );
      }),
    );
  }
  return gltfCache.get(url)!;
}

const HDR_NAN_CLAMP_GLSL = `
#include <dithering_fragment>
if (isnan(gl_FragColor.r) || isinf(gl_FragColor.r) || !(gl_FragColor.r >= 0.0)) gl_FragColor.r = 0.0; else gl_FragColor.r = min(gl_FragColor.r, 24000.0);
if (isnan(gl_FragColor.g) || isinf(gl_FragColor.g) || !(gl_FragColor.g >= 0.0)) gl_FragColor.g = 0.0; else gl_FragColor.g = min(gl_FragColor.g, 24000.0);
if (isnan(gl_FragColor.b) || isinf(gl_FragColor.b) || !(gl_FragColor.b >= 0.0)) gl_FragColor.b = 0.0; else gl_FragColor.b = min(gl_FragColor.b, 24000.0);
if (isnan(gl_FragColor.a) || isinf(gl_FragColor.a) || !(gl_FragColor.a >= 0.0)) gl_FragColor.a = 1.0; else gl_FragColor.a = clamp(gl_FragColor.a, 0.0, 1.0);
`;

/** Gắn khoá chống tràn HalfFloat16 / NaN (từ UV tiếp tuyến suy biến của glTF) để bảo vệ Bloom mipmapBlur. */
function makeSafePbrMaterial(srcMat: THREE.Material): THREE.Material {
  const mat = srcMat.clone();
  if (!(mat as THREE.ShaderMaterial).isShaderMaterial) {
    const prevKey = mat.customProgramCacheKey?.bind(mat);
    const prevCompile = mat.onBeforeCompile?.bind(mat);
    mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|gltfHdrSafe`;
    mat.onBeforeCompile = (shader, renderer) => {
      if (prevCompile) prevCompile(shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        HDR_NAN_CLAMP_GLSL,
      );
    };
  }
  return mat;
}

/** Gắn shader phát sáng viền mặt cắt laser HDR lên bản sao vật liệu PBR mà không làm mất texture gốc. */
function makeLaserClippedMaterial(
  srcMat: THREE.Material,
  planes: THREE.Plane[],
  rimColor: string,
  rimWidth: number,
  rimBoost: number,
): THREE.Material {
  const mat = srcMat.clone();
  mat.clippingPlanes = planes;
  mat.clipShadows = true;
  mat.side = THREE.DoubleSide;

  const std = mat as THREE.MeshStandardMaterial;
  const prevKey = mat.customProgramCacheKey?.bind(mat);
  const prevCompile = mat.onBeforeCompile?.bind(mat);
  if (std.isMeshStandardMaterial && rimBoost > 0 && rimWidth > 0) {
    const col = new THREE.Color(rimColor);
    std.customProgramCacheKey = () =>
      `${prevKey ? prevKey() : ''}|laserCut_${rimColor}_${rimWidth.toFixed(3)}_${rimBoost.toFixed(2)}|gltfHdrSafe`;
    std.onBeforeCompile = (shader, renderer) => {
      if (prevCompile) prevCompile(shader, renderer);
      shader.uniforms.uCutRimColor = { value: col };
      shader.uniforms.uCutRimWidth = { value: rimWidth };
      shader.uniforms.uCutRimBoost = { value: rimBoost };
      shader.fragmentShader = shader.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
           uniform vec3 uCutRimColor;
           uniform float uCutRimWidth;
           uniform float uCutRimBoost;`,
        )
        .replace(
          '#include <emissivemap_fragment>',
          `#include <emissivemap_fragment>
           #if NUM_CLIPPING_PLANES > 0
             float cutGap0 = clippingPlanes[ 0 ].w - dot( vClipPosition, clippingPlanes[ 0 ].xyz );
             float cutRim = smoothstep( uCutRimWidth, 0.0, max( 0.0, cutGap0 ) );
             #if NUM_CLIPPING_PLANES > 1
               float cutGap1 = clippingPlanes[ 1 ].w - dot( vClipPosition, clippingPlanes[ 1 ].xyz );
               cutRim = max( cutRim, smoothstep( uCutRimWidth, 0.0, max( 0.0, cutGap1 ) ) );
             #endif
             totalEmissiveRadiance += uCutRimColor * ( cutRim * cutRim * uCutRimBoost );
           #endif`,
        )
        .replace('#include <dithering_fragment>', HDR_NAN_CLAMP_GLSL);
    };
  } else if (!(mat as THREE.ShaderMaterial).isShaderMaterial) {
    mat.customProgramCacheKey = () => `${prevKey ? prevKey() : ''}|gltfHdrSafe`;
    mat.onBeforeCompile = (shader, renderer) => {
      if (prevCompile) prevCompile(shader, renderer);
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        HDR_NAN_CLAMP_GLSL,
      );
    };
  }
  return mat;
}

export type GltfPartProps = {
  /** URL từ asset('aNNN'). */
  src: string;
  position?: V3;
  rotation?: V3;
  scale?: number | V3;
  /** Cờ tắt va chạm BVHTree (ví dụ: vỏ nhà chứa máy bay / đồ nền xa). */
  noCollide?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  /** Mặt phẳng cắt mổ xẻ (nếu truyền vào sẽ tự kích hoạt mặt cắt hai mặt + viền sáng laser). */
  clipPlanes?: THREE.Plane[];
  /** Màu viền laser dọc vết cắt (mặc định cam nhiệt '#ff8a1e'). */
  cutRimColor?: string;
  /** Bề rộng viền sáng vết cắt (m, mặc định 0.085m). */
  cutRimWidth?: number;
  /** Cường độ HDR của viền vết cắt (mặc định 3.4, vượt ngưỡng Bloom 1.2). Đặt 0 để tắt viền sáng. */
  cutRimBoost?: number;
  /** Độ mờ lớp vỏ X-Ray Fresnel ở nửa bị cắt bỏ (0 = bỏ hẳn, 0.14 = hiện bóng kính mờ giữ dáng khí tài). */
  ghostCutawayOpacity?: number;
  ghostColor?: string;
};

export const GltfPart: React.FC<GltfPartProps> = ({
  src,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  noCollide = false,
  castShadow = true,
  receiveShadow = true,
  clipPlanes,
  cutRimColor = '#ff8a1e',
  cutRimWidth = 0.085,
  cutRimBoost = 3.4,
  ghostCutawayOpacity = 0,
  ghostColor = '#6ec6ff',
}) => {
  const advance = useThree((s) => s.advance);
  const invalidate = useThree((s) => s.invalidate);
  const [gltf, setGltf] = useState<GLTF | null>(() => parsedCache.get(src) ?? null);
  const [handle] = useState(() => delayRender(`gltf:${src}`));
  const releasedRef = useRef(false);

  const releaseOnce = () => {
    if (!releasedRef.current) {
      releasedRef.current = true;
      continueRender(handle);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (gltf) return;
    loadCachedGLTF(src)
      .then((loaded) => {
        if (!cancelled) setGltf(loaded);
      })
      .catch((err) => {
        console.error('Lỗi nạp GLB:', src, err);
        releaseOnce();
      });
    return () => {
      cancelled = true;
    };
  }, [src, gltf]);

  const hasClip = Boolean(clipPlanes && clipPlanes.length > 0);

  // Cây mesh chính (giữ nguyên vật liệu PBR gốc hoặc gắn clipPlanes + viền laser)
  const mainRoot = useMemo(() => {
    if (!gltf) return null;
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      if (noCollide) o.userData.noCollide = true;
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = castShadow;
      m.receiveShadow = receiveShadow;
      if (m.geometry && m.geometry.attributes.uv && !m.geometry.attributes.uv1) {
        m.geometry.setAttribute('uv1', m.geometry.attributes.uv);
      }
      const applyOne = (mat: THREE.Material) => {
        const std = mat as THREE.MeshStandardMaterial;
        if (std.map) std.map.colorSpace = THREE.SRGBColorSpace;
        if (std.emissiveMap) std.emissiveMap.colorSpace = THREE.SRGBColorSpace;
        return hasClip
          ? makeLaserClippedMaterial(mat, clipPlanes!, cutRimColor, cutRimWidth, cutRimBoost)
          : makeSafePbrMaterial(mat);
      };
      m.material = Array.isArray(m.material) ? m.material.map(applyOne) : applyOne(m.material);
    });
    return root;
  }, [gltf, noCollide, castShadow, receiveShadow, hasClip, cutRimColor, cutRimWidth, cutRimBoost]);

  // Chỉ nhả delayRender SAU KHI mainRoot đã mount vào cây Three.js và advance 2 lượt cho ContactShadow + EffectComposer
  useEffect(() => {
    if (!mainRoot || releasedRef.current) return;
    invalidate();
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      advance(performance.now());
      raf2 = requestAnimationFrame(() => {
        advance(performance.now());
        releaseOnce();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [mainRoot, advance, invalidate]);

  // Bảo hiểm khi unmount sớm
  useEffect(() => () => releaseOnce(), []);

  if (mainRoot && hasClip && clipPlanes) {
    mainRoot.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mat of mats) {
        mat.clippingPlanes = clipPlanes;
      }
    });
  }

  const invPlanes = useMemo(
    () => (clipPlanes && clipPlanes.length > 0 ? [clipPlanes[0].clone().negate()] : []),
    [clipPlanes],
  );

  const ghostRoot = useMemo(() => {
    if (!gltf || !hasClip || ghostCutawayOpacity <= 0.005) return null;
    const gMat = ghost(ghostColor, ghostCutawayOpacity, 2.5).clone();
    const root = gltf.scene.clone(true);
    root.traverse((o) => {
      o.userData.noCollide = true;
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = false;
      m.receiveShadow = false;
      m.material = gMat;
    });
    return { root, gMat };
  }, [gltf, hasClip, ghostCutawayOpacity, ghostColor]);

  if (ghostRoot && invPlanes.length > 0) {
    ghostRoot.gMat.clippingPlanes = invPlanes;
  }

  if (!mainRoot) return null;
  const sc: V3 = typeof scale === 'number' ? [scale, scale, scale] : scale;

  return (
    <group position={position} rotation={rotation} scale={sc} userData={noCollide ? { noCollide: true } : undefined}>
      <primitive object={mainRoot} />
      {ghostRoot && <primitive object={ghostRoot.root} />}
    </group>
  );
};
