// Vật liệu tự sinh (texture vẽ bằng canvas từ noise có seed, tất định theo seed — không random).
// paint(): sơn kim loại quân sự có loang ngụy trang, mòn mép, bụi bẩn; grain(): hạt chi tiết phủ lên địa hình.
// Kết quả được cache theo tham số nên gọi trong render mỗi khung không tốn.
import * as THREE from 'three';

// ---------- noise tất định ----------
const hash = (x: number, y: number, s: number) => {
  const h = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return h - Math.floor(h);
};
const smooth = (t: number) => t * t * (3 - 2 * t);
/** Value noise 2D lặp chu kỳ `per` (để texture liền mép khi repeat). */
export const vnoise = (x: number, y: number, seed = 0, per = 1e9) => {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const w = (a: number) => ((a % per) + per) % per;
  const a = hash(w(xi), w(yi), seed), b = hash(w(xi + 1), w(yi), seed), c = hash(w(xi), w(yi + 1), seed), d = hash(w(xi + 1), w(yi + 1), seed);
  const u = smooth(xf), v = smooth(yf);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
};
/** fBm 0..1, `oct` tầng. */
export const fbm = (x: number, y: number, seed = 0, oct = 4, per = 1e9) => {
  let s = 0, amp = 0.5, f = 1, n = 0;
  for (let i = 0; i < oct; i++) { s += amp * vnoise(x * f, y * f, seed + i * 17, per * f); n += amp; amp *= 0.5; f *= 2; }
  return s / n;
};

const cache = new Map<string, unknown>();
const memo = <T>(key: string, make: () => T): T => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key) as T;
};

const canvasTex = (size: number, draw: (img: ImageData) => void, srgb: boolean) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  draw(img);
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const rgb = (hex: string) => { const c = new THREE.Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };

export type PaintOpts = {
  color: string;
  /** Ngụy trang: các màu loang phủ lên màu nền (2–3 màu). */
  camo?: string[];
  camoScale?: number;
  /** Mòn sơn lộ kim loại sáng 0..1 */
  wear?: number;
  /** Bụi bẩn tối ở chân 0..1 (theo trục v của UV) */
  dirt?: number;
  roughness?: number;
  metalness?: number;
  /** Số lần lặp texture trên bề mặt. */
  repeat?: number;
  seed?: number;
};

/** Sơn quân sự: màu nền + loang ngụy trang + vết mòn + bụi; roughnessMap cho độ bóng không đều. */
export const paint = (o: PaintOpts): THREE.MeshStandardMaterial => memo('paint' + JSON.stringify(o), () => {
  const { color, camo = [], camoScale = 1, wear = 0.25, dirt = 0.3, roughness = 0.62, metalness = 0.35, repeat = 1, seed = 1 } = o;
  const N = 512, base = rgb(color), cams = camo.map(rgb), metal = [170, 172, 168];
  const rough = new Float32Array(N * N);
  const map = canvasTex(N, (img) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let c = base;
      for (let k = 0; k < cams.length; k++) {
        const n = fbm(u * camoScale * 4, v * camoScale * 4, seed * 31 + k * 101, 4, camoScale * 4);
        if (n > 0.56 + k * 0.02) c = cams[k];
      }
      const g = fbm(u * 16, v * 16, seed + 5, 3, 16);
      const shade = 0.9 + 0.2 * g;
      const wn = fbm(u * 24, v * 24, seed + 9, 3, 24);
      const worn = wn > 1 - wear * 0.35 ? 1 : 0;
      const dd = dirt * Math.max(0, fbm(u * 8, v * 8, seed + 13, 3, 8) * 1.2 - 0.25) * (0.4 + 0.6 * v);
      const i = (y * N + x) * 4;
      for (let ch = 0; ch < 3; ch++) {
        let val = worn ? metal[ch] : c[ch] * shade;
        val = val * (1 - dd) + 70 * dd;
        img.data[i + ch] = Math.max(0, Math.min(255, val));
      }
      img.data[i + 3] = 255;
      rough[y * N + x] = worn ? 0.35 : Math.min(1, roughness + (g - 0.5) * 0.25 + dd * 0.3);
    }
  }, true);
  const rmap = canvasTex(N, (img) => {
    for (let i = 0; i < N * N; i++) {
      const r = rough[i] * 255;
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = r;
      img.data[i * 4 + 3] = 255;
    }
  }, false);
  map.repeat.set(repeat, repeat);
  rmap.repeat.set(repeat, repeat);
  return new THREE.MeshStandardMaterial({ map, roughnessMap: rmap, roughness: 1, metalness });
});

/** Vật liệu trơn (cao su, kính, kim loại bóng…) có cache. */
export const plain = (color: string, roughness = 0.8, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  memo(`plain${color}${roughness}${metalness}${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));

/** Texture hạt xám quanh 1.0 (nhân với màu đỉnh) để phá mảng màu phẳng trên địa hình, đá… */
export const grain = (seed = 3, scale = 8) => memo(`grain${seed}${scale}`, () => canvasTex(256, (img) => {
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const n = 0.55 * fbm((x / 256) * scale, (y / 256) * scale, seed, 4, scale) + 0.45 * vnoise((x / 256) * 64, (y / 256) * 64, seed + 1, 64);
    const g = 180 + (n - 0.5) * 140;
    const i = (y * 256 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, g));
    img.data[i + 3] = 255;
  }
}, true));
