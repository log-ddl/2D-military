// Hệ thống gắn Logo Kênh tự nhiên bên trong không gian 3D & sơ đồ 2D (Diegetic Anti-Reup Branding).
// Tự động nạp file logo từ `library/brand/` qua `@core/brand` (an toàn khung đầu với `delayRender` + `advance`):
// - <BrandWallMark>: Logo kiến trúc/sơn tường trên vách nhà chứa máy bay, tháp chỉ huy, sàn studio X-Ray, bục sa bàn.
// - <BrandDecal>: Sơn stencil ôm cong khít 100% theo bề mặt lưới 3D của cánh đuôi máy bay, tháp pháo xe tăng, mạn tàu, thùng đạn.
// - <BrandPlate>: Bảng tên kim loại phay xước khắc nổi logo cho các góc cận mổ xẻ cơ khí / hộp số.
// - <BrandMark2D>: Dấu bản vẽ kỹ thuật mờ tinh tế cho cảnh bản đồ / sơ đồ 2D.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { DecalGeometry } from 'three/examples/jsm/geometries/DecalGeometry.js';
import { brandConfig, brandLogoUrl } from '@core/brand';
import { merge } from './geom';
import { vnoise } from './materials';
import type { V3 } from './stage';

const imgPromiseCache = new Map<string, Promise<HTMLImageElement>>();
const imgLoadedCache = new Map<string, HTMLImageElement>();

function loadBrandImg(url: string): Promise<HTMLImageElement> {
  if (imgLoadedCache.has(url)) return Promise.resolve(imgLoadedCache.get(url)!);
  if (!imgPromiseCache.has(url)) {
    imgPromiseCache.set(
      url,
      new Promise<HTMLImageElement>((resolve, reject) => {
        const im = new Image();
        im.crossOrigin = 'anonymous';
        im.onload = () => {
          imgLoadedCache.set(url, im);
          resolve(im);
        };
        im.onerror = (e) => reject(e);
        im.src = url;
      }),
    );
  }
  return imgPromiseCache.get(url)!;
}

const processedTexCache = new Map<string, { map: THREE.CanvasTexture; bump: THREE.CanvasTexture; aspect: number }>();

/** Chuyển ảnh logo bất kỳ (PNG/SVG đen, trắng hoặc nhiều màu) thành CanvasTexture chuẩn PBR + BumpMap khắc kim loại. */
function buildBrandTextures(img: HTMLImageElement, tint: string | 'original', wear: number) {
  const key = `${img.src}|${tint}|${wear.toFixed(3)}`;
  if (processedTexCache.has(key)) return processedTexCache.get(key)!;

  const N = 512;
  const aspect = img.naturalWidth > 0 && img.naturalHeight > 0 ? img.naturalWidth / img.naturalHeight : 1;
  const cv = document.createElement('canvas');
  cv.width = N;
  cv.height = N;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, N, N);

  // Giữ đúng tỉ lệ khung ảnh gốc nằm gọn chính tâm canvas vuông có lề 4% tránh lem biên UV Decal
  const pad = Math.round(N * 0.04);
  const avail = N - pad * 2;
  const dw = aspect >= 1 ? avail : Math.round(avail * aspect);
  const dh = aspect >= 1 ? Math.round(avail / aspect) : avail;
  const dx = Math.round((N - dw) * 0.5);
  const dy = Math.round((N - dh) * 0.5);
  ctx.drawImage(img, dx, dy, dw, dh);

  if (tint !== 'original') {
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = tint;
    ctx.fillRect(0, 0, N, N);
    ctx.globalCompositeOperation = 'source-over';
  }

  const idata = ctx.getImageData(0, 0, N, N);
  const px = idata.data;

  // Nếu ảnh người dùng đưa vào không có kênh trong suốt (nền trắng hoặc đen đặc), tự tách nền mượt theo độ sáng góc ảnh
  const cornerAlpha = (px[3] + px[(N - 1) * 4 + 3] + px[(N * (N - 1)) * 4 + 3]) / 3;
  if (cornerAlpha > 250) {
    const cr = px[0], cg = px[1], cb = px[2];
    const tc = tint !== 'original' ? new THREE.Color(tint) : null;
    for (let i = 0; i < px.length; i += 4) {
      const diff = Math.hypot(px[i] - cr, px[i + 1] - cg, px[i + 2] - cb) / 441.67;
      const a = Math.max(0, Math.min(1, (diff - 0.08) / 0.25));
      px[i + 3] = Math.round(a * 255);
      if (tc) {
        px[i] = Math.round(tc.r * 255);
        px[i + 1] = Math.round(tc.g * 255);
        px[i + 2] = Math.round(tc.b * 255);
      }
    }
  }

  // Tạo hiệu ứng tróc xước sơn stencil quân sự nhẹ tất định (nếu wear > 0) và trích xuất kênh độ cao cho bumpMap
  const bcv = document.createElement('canvas');
  bcv.width = N;
  bcv.height = N;
  const bctx = bcv.getContext('2d')!;
  const bimg = bctx.createImageData(N, N);
  const bpx = bimg.data;

  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4;
      let a = px[i + 3] / 255;
      if (wear > 0.005 && a > 0.01) {
        const scuff = vnoise((x / N) * 42, (y / N) * 42, 71, 42);
        const grain = vnoise((x / N) * 150, (y / N) * 150, 19, 150);
        const keep = Math.max(0.15, Math.min(1, 1 - wear * (0.65 * Math.max(0, 0.58 - scuff) + 0.35 * (1 - grain))));
        a *= keep;
        px[i + 3] = Math.round(a * 255);
      }
      const hVal = Math.round((0.5 + 0.5 * a) * 255);
      bpx[i] = bpx[i + 1] = bpx[i + 2] = hVal;
      bpx[i + 3] = 255;
    }
  }

  ctx.putImageData(idata, 0, 0);
  bctx.putImageData(bimg, 0, 0);

  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  map.needsUpdate = true;

  const bump = new THREE.CanvasTexture(bcv);
  bump.anisotropy = 8;
  bump.needsUpdate = true;

  const out = { map, bump, aspect };
  processedTexCache.set(key, out);
  return out;
}

function useBrandImage() {
  const url = brandLogoUrl();
  const advance = useThree((s) => s.advance);
  const invalidate = useThree((s) => s.invalidate);
  const [img, setImg] = useState<HTMLImageElement | null>(() => imgLoadedCache.get(url) ?? null);
  const [handle] = useState(() => delayRender(`brand:${url}`));
  const releasedRef = useRef(false);

  const releaseOnce = () => {
    if (!releasedRef.current) {
      releasedRef.current = true;
      continueRender(handle);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (img) return;
    loadBrandImg(url)
      .then((loaded) => {
        if (!cancelled) setImg(loaded);
      })
      .catch((err) => {
        console.error('Lỗi nạp logo kênh:', url, err);
        releaseOnce();
      });
    return () => {
      cancelled = true;
    };
  }, [url, img]);

  useEffect(() => {
    if (!img || releasedRef.current) return;
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
  }, [img, advance, invalidate]);

  useEffect(() => () => releaseOnce(), []);
  return img;
}

export type BrandWallMarkProps = {
  position?: V3;
  /** Góc xoay Euler [rx, ry, rz] (radian). Mặc định [0, Math.PI / 2, 0] hướng về +X (dùng cho vách hậu x = -L). */
  rotation?: V3;
  /** Bề rộng tổng thể của biểu tượng trên tường/sàn (m, mặc định 6.5m). */
  width?: number;
  /** Màu sơn ('original' để giữ nguyên màu gốc của file logo, hoặc mã hex như '#14181f'). */
  tint?: string | 'original';
  opacity?: number;
  roughness?: number;
  metalness?: number;
  /** Tạo tấm nền phù điêu mỏng phía sau để nổi khối kiến trúc trên vách nhà chứa. */
  backingPlate?: boolean;
  backingColor?: string;
};

/** Gắn logo kênh lên vách nhà chứa máy bay, cửa khoang, sàn studio X-Ray hoặc vách bục sa bàn. */
export const BrandWallMark: React.FC<BrandWallMarkProps> = ({
  position = [0, 8, 0],
  rotation = [0, Math.PI / 2, 0],
  width = 6.5,
  tint,
  opacity,
  roughness = 0.58,
  metalness = 0.12,
  backingPlate = false,
  backingColor = '#dce3ec',
}) => {
  const cfg = brandConfig();
  const img = useBrandImage();
  const resolvedTint = tint ?? cfg.darkTint;
  const resolvedOpacity = opacity ?? cfg.wallOpacity;

  const tex = useMemo(
    () => (img ? buildBrandTextures(img, resolvedTint, 0) : null),
    [img, resolvedTint],
  );

  const mat = useMemo(() => {
    if (!tex) return null;
    return new THREE.MeshStandardMaterial({
      map: tex.map,
      transparent: true,
      alphaTest: 0.015,
      opacity: resolvedOpacity,
      roughness,
      metalness,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });
  }, [tex, resolvedOpacity, roughness, metalness]);

  if (!tex || !mat) return null;

  return (
    <group position={position} rotation={rotation} userData={{ noCollide: true, noShadow: true }}>
      {backingPlate && (
        <mesh position={[0, 0, -0.03]} userData={{ noCollide: true, noShadow: true }}>
          <boxGeometry args={[width * 1.16, width * 1.16, 0.04]} />
          <meshStandardMaterial color={backingColor} roughness={0.45} metalness={0.08} />
        </mesh>
      )}
      <mesh material={mat} castShadow={false} receiveShadow userData={{ noCollide: true, noShadow: true }}>
        <planeGeometry args={[width, width]} />
      </mesh>
    </group>
  );
};

export type BrandDecalProps = {
  /** Mesh hoặc nhánh Object3D (ví dụ `root` từ `<GltfRig>` hoặc `ref.current` của thân/tháp pháo) cần chiếu sơn lên. */
  target: THREE.Object3D | React.RefObject<THREE.Object3D | null> | null;
  /** Tâm điểm đặt logo trong hệ toạ độ cục bộ của `target` [x, y, z] (m). */
  position: V3;
  /** Pháp tuyến hướng mặt ngoài tại vị trí dán trong hệ cục bộ của `target` (ví dụ [0, 0, 1] cho sườn phải +Z). */
  normal?: V3;
  /** Góc xoay nghiêng của logo quanh pháp tuyến (radian, mặc định 0). */
  roll?: number;
  /** Kích thước [rộng, cao, độ sâu chiếu] (m) hoặc một số đơn (mặc định 1.2m). */
  size?: number | V3;
  /** Màu sơn stencil ('original' để giữ màu gốc, mặc định lấy `darkTint` hoặc xám chiến thuật low-vis). */
  tint?: string | 'original';
  /** Độ đậm sơn stencil (mặc định lấy từ `brand.json`, ~0.46 cho kiểu low-vis quân sự). */
  opacity?: number;
  /** Độ tróc xước vi mô hoà vào lớp sơn giáp/vỏ máy bay (0..1, mặc định 0.18). */
  wear?: number;
  roughness?: number;
  metalness?: number;
};

/** Sơn Stencil / Decal chiếu và ôm cong khít 100% theo bề mặt lưới 3D của khí tài (đuôi máy bay, tháp pháo, tàu chiến). */
export const BrandDecal: React.FC<BrandDecalProps> = ({
  target,
  position,
  normal = [0, 0, 1],
  roll = 0,
  size = 1.2,
  tint,
  opacity,
  wear = 0.18,
  roughness = 0.52,
  metalness = 0.16,
}) => {
  const cfg = brandConfig();
  const img = useBrandImage();
  const resolvedTint = tint ?? cfg.darkTint;
  const resolvedOpacity = opacity ?? cfg.stencilOpacity;

  const obj = target && 'current' in target ? target.current : target;

  const tex = useMemo(
    () => (img ? buildBrandTextures(img, resolvedTint, wear) : null),
    [img, resolvedTint, wear],
  );

  const [sx, sy, sz]: V3 = typeof size === 'number' ? [size, size, size * 0.85] : size;
  const posKey = `${position[0].toFixed(4)},${position[1].toFixed(4)},${position[2].toFixed(4)}`;
  const normKey = `${normal[0].toFixed(4)},${normal[1].toFixed(4)},${normal[2].toFixed(4)}`;
  const sizeKey = `${sx.toFixed(4)},${sy.toFixed(4)},${sz.toFixed(4)},${roll.toFixed(4)}`;

  const decalGeo = useMemo(() => {
    if (!obj) return null;
    obj.updateWorldMatrix(true, true);
    const invRoot = obj.matrixWorld.clone().invert();

    const localPos = new THREE.Vector3(...position);
    const worldPos = localPos.clone().applyMatrix4(obj.matrixWorld);

    const worldNorm = new THREE.Vector3(...normal)
      .transformDirection(obj.matrixWorld)
      .normalize();

    // Dựng hệ trục chuẩn cho máy chiếu DecalGeometry (trục +Z của Euler hướng dọc theo pháp tuyến bề mặt)
    const upGuess = Math.abs(worldNorm.y) > 0.92 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const right = new THREE.Vector3().crossVectors(upGuess, worldNorm).normalize();
    const up = new THREE.Vector3().crossVectors(worldNorm, right).normalize();
    const basis = new THREE.Matrix4().makeBasis(right, up, worldNorm);
    if (Math.abs(roll) > 1e-5) {
      basis.multiply(new THREE.Matrix4().makeRotationZ(roll));
    }
    const worldEuler = new THREE.Euler().setFromRotationMatrix(basis);

    const worldScale = new THREE.Vector3();
    obj.getWorldScale(worldScale);
    const scaleAvg = (worldScale.x + worldScale.y + worldScale.z) / 3 || 1;
    const boxSize = new THREE.Vector3(sx * scaleAvg, sy * scaleAvg, sz * scaleAvg);
    const hitBox = new THREE.Box3().setFromCenterAndSize(worldPos, boxSize.clone().multiplyScalar(1.35));

    const parts: THREE.BufferGeometry[] = [];
    const tmpBox = new THREE.Box3();

    obj.traverse((child) => {
      const m = child as THREE.Mesh;
      if (!m.isMesh || !m.visible || !m.geometry || !m.geometry.attributes.position) return;
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) {
        tmpBox.copy(m.geometry.boundingBox).applyMatrix4(m.matrixWorld);
        if (!tmpBox.intersectsBox(hitBox)) return;
      }
      const dg = new DecalGeometry(m, worldPos, worldEuler, boxSize);
      if (dg.attributes.position && dg.attributes.position.count > 0) {
        dg.applyMatrix4(invRoot);
        // Lọc bỏ các mặt tam giác quay lưng lại hướng chiếu (chống xuyên thấu qua cánh đuôi mỏng / vách kép)
        const posAttr = dg.attributes.position;
        const nrmAttr = dg.attributes.normal;
        const uvAttr = dg.attributes.uv;
        const localDir = new THREE.Vector3(...normal).normalize();
        const fPos: number[] = [];
        const fNrm: number[] = [];
        const fUv: number[] = [];
        const triN = new THREE.Vector3();
        const vA = new THREE.Vector3();
        const vB = new THREE.Vector3();
        const vC = new THREE.Vector3();
        for (let i = 0; i + 2 < posAttr.count; i += 3) {
          if (nrmAttr) {
            triN.set(
              (nrmAttr.getX(i) + nrmAttr.getX(i + 1) + nrmAttr.getX(i + 2)) / 3,
              (nrmAttr.getY(i) + nrmAttr.getY(i + 1) + nrmAttr.getY(i + 2)) / 3,
              (nrmAttr.getZ(i) + nrmAttr.getZ(i + 1) + nrmAttr.getZ(i + 2)) / 3,
            ).normalize();
          } else {
            vA.fromBufferAttribute(posAttr, i);
            vB.fromBufferAttribute(posAttr, i + 1);
            vC.fromBufferAttribute(posAttr, i + 2);
            triN.crossVectors(vB.clone().sub(vA), vC.clone().sub(vA)).normalize();
          }
          if (triN.dot(localDir) < 0.08) continue;
          for (let k = 0; k < 3; k++) {
            const idx = i + k;
            fPos.push(posAttr.getX(idx), posAttr.getY(idx), posAttr.getZ(idx));
            if (nrmAttr) fNrm.push(nrmAttr.getX(idx), nrmAttr.getY(idx), nrmAttr.getZ(idx));
            if (uvAttr) fUv.push(uvAttr.getX(idx), uvAttr.getY(idx));
          }
        }
        dg.dispose();
        if (fPos.length > 0) {
          const filtered = new THREE.BufferGeometry();
          filtered.setAttribute('position', new THREE.Float32BufferAttribute(fPos, 3));
          if (fNrm.length > 0) filtered.setAttribute('normal', new THREE.Float32BufferAttribute(fNrm, 3));
          if (fUv.length > 0) filtered.setAttribute('uv', new THREE.Float32BufferAttribute(fUv, 2));
          parts.push(filtered);
        }
      } else {
        dg.dispose();
      }
    });

    if (parts.length === 0) return null;
    if (parts.length === 1) return parts[0];
    const merged = merge(parts);
    for (const p of parts) p.dispose();
    return merged;
  }, [obj, posKey, normKey, sizeKey]);

  const mat = useMemo(() => {
    if (!tex) return null;
    return new THREE.MeshStandardMaterial({
      map: tex.map,
      transparent: true,
      alphaTest: 0.01,
      opacity: resolvedOpacity,
      roughness,
      metalness,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    });
  }, [tex, resolvedOpacity, roughness, metalness]);

  if (!decalGeo || !mat) return null;
  return <mesh geometry={decalGeo} material={mat} castShadow={false} receiveShadow userData={{ noCollide: true }} />;
};

export type BrandPlateProps = {
  position?: V3;
  rotation?: V3;
  /** Chiều rộng tấm nhãn kim loại (m, mặc định 0.65m). */
  width?: number;
  plateColor?: string;
  logoTint?: string | 'original';
};

/** Nhãn kim loại phay xước dập nổi/khắc chìm logo (dùng ở góc cận mổ xẻ cơ khí, bệ trưng bày động cơ). */
export const BrandPlate: React.FC<BrandPlateProps> = ({
  position = [0, 0.02, 0],
  rotation = [-Math.PI / 2, 0, 0],
  width = 0.65,
  plateColor = '#8f98a3',
  logoTint = '#1d232b',
}) => {
  const img = useBrandImage();
  const tex = useMemo(() => (img ? buildBrandTextures(img, logoTint, 0) : null), [img, logoTint]);
  if (!tex) return null;

  const h = width * 0.62;
  const thick = Math.max(0.008, width * 0.022);

  return (
    <group position={position} rotation={rotation} userData={{ noCollide: true }}>
      <mesh receiveShadow castShadow userData={{ noCollide: true }}>
        <boxGeometry args={[width, h, thick]} />
        <meshStandardMaterial color={plateColor} roughness={0.32} metalness={0.78} />
      </mesh>
      <mesh position={[0, 0, thick * 0.5 + 0.001]} receiveShadow userData={{ noCollide: true }}>
        <planeGeometry args={[h * 0.86, h * 0.86]} />
        <meshStandardMaterial
          map={tex.map}
          bumpMap={tex.bump}
          bumpScale={0.012}
          transparent
          opacity={0.88}
          roughness={0.28}
          metalness={0.65}
          depthWrite={false}
          polygonOffset
          polygonOffsetFactor={-2}
          polygonOffsetUnits={-2}
        />
      </mesh>
    </group>
  );
};

/** Dấu bản vẽ kỹ thuật nhỏ gọn gắn cố định vào tờ bản đồ / sơ đồ 2D (không phải watermark nổi trên kính). */
export const BrandMark2D: React.FC<{
  x?: number;
  y?: number;
  size?: number;
  opacity?: number;
}> = ({ x = 1810, y = 1010, size = 54, opacity = 0.28 }) => {
  const url = brandLogoUrl();
  return (
    <image
      href={url}
      x={x - size * 0.5}
      y={y - size * 0.5}
      width={size}
      height={size}
      opacity={opacity}
      preserveAspectRatio="xMidYMid meet"
    />
  );
};
