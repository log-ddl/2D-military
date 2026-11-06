// Hệ vật liệu PBR tự sinh tất định theo seed (có cache, không random):
// - paint(): sơn quân sự đa dụng (ngụy trang, mòn mép, bụi bẩn + vi nhám bề mặt bumpMap)
// - armorPlate(): thép đúc / thép cán giáp hạng nặng (lỗ rỗ đúc vi mô, mòn cạnh kim loại)
// - panelPaint(): vỏ tấm ghép rãnh & đinh tán (máy bay, tàu chiến, tên lửa, radar, xe hiện đại)
// - machined(): kim loại tiện / phay xước có dầu mỡ (nòng pháo, bánh răng, trục truyền động, piston)
// - glass(): kính quang học vật lý MeshPhysicalMaterial (buồng lái, kính tiềm vọng, đầu dò quang điện)
// - ghost() & clipMat(): vỏ bán trong suốt Fresnel / cắt mặt phẳng để mổ xẻ cơ khí bên trong
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

const canvasTex = (size: number, draw: (img: ImageData, ctx: CanvasRenderingContext2D) => void, srgb: boolean, repeat: number | [number, number] = 1) => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  draw(img, ctx);
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  const [rx, ry] = Array.isArray(repeat) ? repeat : [repeat, repeat];
  t.repeat.set(rx, ry);
  t.anisotropy = 8;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
};

const grayTex = (size: number, buf: Float32Array, repeat: number | [number, number] = 1) =>
  canvasTex(size, (img) => {
    for (let i = 0; i < size * size; i++) {
      const v = Math.max(0, Math.min(255, buf[i] * 255));
      img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v;
      img.data[i * 4 + 3] = 255;
    }
  }, false, repeat);

const rgb = (hex: string) => { const c = new THREE.Color(hex); return [c.r * 255, c.g * 255, c.b * 255]; };

export type PaintOpts = {
  color: string;
  /** Ngụy trang: các màu loang phủ lên màu nền (2–3 màu). Bỏ trống nếu sơn đơn sắc. */
  camo?: string[];
  camoScale?: number;
  /** Mòn sơn lộ kim loại sáng 0..1 */
  wear?: number;
  /** Bụi bẩn tối ở chân 0..1 (theo trục v của UV) */
  dirt?: number;
  roughness?: number;
  metalness?: number;
  /** Cường độ gợn vi bề mặt (mặc định 0.012). */
  bump?: number;
  /** Số lần lặp texture trên bề mặt. */
  repeat?: number;
  seed?: number;
};

/** Sơn quân sự: màu nền + loang ngụy trang + vết mòn + bụi + vi nhám bumpMap/roughnessMap. */
export const paint = (o: PaintOpts): THREE.MeshStandardMaterial => memo('paint' + JSON.stringify(o), () => {
  const { color, camo = [], camoScale = 1, wear = 0.22, dirt = 0.26, roughness = 0.58, metalness = 0.34, bump = 0.012, repeat = 1, seed = 1 } = o;
  const N = 512, base = rgb(color), cams = camo.map(rgb), metal = [176, 180, 184];
  const rough = new Float32Array(N * N);
  const bmp = new Float32Array(N * N);
  const map = canvasTex(N, (img) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let c = base;
      for (let k = 0; k < cams.length; k++) {
        const n = fbm(u * camoScale * 4, v * camoScale * 4, seed * 31 + k * 101, 4, camoScale * 4);
        if (n > 0.56 + k * 0.02) c = cams[k];
      }
      const g = fbm(u * 18, v * 18, seed + 5, 3, 18);
      const micro = vnoise(u * 96, v * 96, seed + 23, 96);
      const shade = 0.92 + 0.16 * g + (micro - 0.5) * 0.04;
      const wn = fbm(u * 24, v * 24, seed + 9, 3, 24);
      const worn = wn > 1 - wear * 0.35 ? 1 : 0;
      const dd = dirt * Math.max(0, fbm(u * 8, v * 8, seed + 13, 3, 8) * 1.2 - 0.25) * (0.4 + 0.6 * v);
      const idx = y * N + x, i = idx * 4;
      for (let ch = 0; ch < 3; ch++) {
        let val = worn ? metal[ch] : c[ch] * shade;
        val = val * (1 - dd) + 64 * dd;
        img.data[i + ch] = Math.max(0, Math.min(255, val));
      }
      img.data[i + 3] = 255;
      rough[idx] = worn ? 0.32 : Math.min(1, roughness + (g - 0.5) * 0.22 + dd * 0.3);
      bmp[idx] = worn ? 0.36 : 0.52 + (g - 0.5) * 0.25 + (micro - 0.5) * 0.2 + dd * 0.15;
    }
  }, true, repeat);
  return new THREE.MeshStandardMaterial({
    map, roughnessMap: grayTex(N, rough, repeat), bumpMap: grayTex(N, bmp, repeat), bumpScale: bump, roughness: 1, metalness,
  });
});

export type ArmorOpts = {
  color: string;
  camo?: string[];
  camoScale?: number;
  /** Độ sần rỗ thép đúc/cán 0..1 (mặc định 0.55). */
  pitting?: number;
  wear?: number;
  dust?: number;
  roughness?: number;
  metalness?: number;
  repeat?: number;
  seed?: number;
};

/** Thép giáp đúc / cán hạng nặng (tháp pháo, thân xe tăng, pháo tự hành, lô cốt) — bề mặt rỗ vi mô bắt nắng sắc nét. */
export const armorPlate = (o: ArmorOpts): THREE.MeshStandardMaterial => memo('armor' + JSON.stringify(o), () => {
  const { color, camo = [], camoScale = 1, pitting = 0.55, wear = 0.22, dust = 0.2, roughness = 0.64, metalness = 0.42, repeat = 1, seed = 7 } = o;
  const N = 512, base = rgb(color), cams = camo.map(rgb), steel = [188, 192, 198];
  const rough = new Float32Array(N * N);
  const bmp = new Float32Array(N * N);
  const map = canvasTex(N, (img) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      let c = base;
      for (let k = 0; k < cams.length; k++) {
        if (fbm(u * camoScale * 4, v * camoScale * 4, seed * 29 + k * 83, 4, camoScale * 4) > 0.57 + k * 0.02) c = cams[k];
      }
      const cast = fbm(u * 48, v * 48, seed + 3, 4, 48);
      const pit = vnoise(u * 128, v * 128, seed + 19, 128);
      const wn = fbm(u * 28, v * 28, seed + 11, 3, 28) > 1 - wear * 0.3 ? 1 : 0;
      const du = dust * Math.max(0, fbm(u * 10, v * 10, seed + 41, 3, 10) - 0.35);
      const idx = y * N + x, i = idx * 4;
      const shade = 0.9 + 0.18 * cast + (pit - 0.5) * 0.08 * pitting;
      for (let ch = 0; ch < 3; ch++) {
        let val = wn ? steel[ch] : c[ch] * shade;
        val = val * (1 - du) + 148 * du;
        img.data[i + ch] = Math.max(0, Math.min(255, val));
      }
      img.data[i + 3] = 255;
      rough[idx] = wn ? 0.28 : Math.min(1, roughness + (cast - 0.5) * 0.2 + du * 0.28);
      bmp[idx] = 0.5 + (cast - 0.5) * 0.45 * pitting + (pit - 0.5) * 0.45 * pitting - wn * 0.12;
    }
  }, true, repeat);
  return new THREE.MeshStandardMaterial({
    map, roughnessMap: grayTex(N, rough, repeat), bumpMap: grayTex(N, bmp, repeat), bumpScale: 0.022 * (0.4 + pitting), roughness: 1, metalness,
  });
});

export type PanelOpts = {
  color: string;
  /** Số ô tấm ghép [dọc trục u, quanh chu vi v] (mặc định [8, 6]). */
  panels?: [number, number];
  /** Hàng đinh tán dọc mép tấm (mặc định true). */
  rivets?: boolean;
  /** Độ lệch sắc độ nhẹ giữa các tấm nhôm/composite lân cận 0..1 (mặc định 0.35). */
  panelVar?: number;
  /** Vệt bẩn khí động / muối biển dọc chiều u 0..1 (mặc định 0.18). */
  streak?: number;
  roughness?: number;
  metalness?: number;
  repeat?: number | [number, number];
  seed?: number;
};

/** Vỏ kim loại / composite ghép tấm có rãnh chìm & đinh tán (máy bay, tàu chiến, tàu ngầm, tên lửa, radar, khí tài hiện đại). */
export const panelPaint = (o: PanelOpts): THREE.MeshStandardMaterial => memo('panel' + JSON.stringify(o), () => {
  const { color, panels = [8, 6], rivets = true, panelVar = 0.35, streak = 0.18, roughness = 0.42, metalness = 0.28, repeat = 1, seed = 11 } = o;
  const N = 1024, base = rgb(color);
  const [pu, pv] = panels;
  const rough = new Float32Array(N * N);
  const bmp = new Float32Array(N * N);
  const map = canvasTex(N, (img) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const cu = u * pu, cv = v * pv;
      const iu = Math.floor(cu), iv = Math.floor(cv);
      const fv = cv - iv;
      // Lệch mạch so le giữa các hàng tấm
      const su = (cu + (iv % 2) * 0.35) % pu;
      const fsu = su - Math.floor(su);

      const cellTone = 1 + (hash(Math.floor(su), iv, seed) - 0.5) * 0.09 * panelVar;
      // Khoảng cách pixel tới rãnh ghép tấm
      const dEdgeU = Math.min(fsu, 1 - fsu) * (N / pu);
      const dEdgeV = Math.min(fv, 1 - fv) * (N / pv);
      const dSeam = Math.min(dEdgeU, dEdgeV);
      const seam = dSeam < 1.35 ? 1 - dSeam / 1.35 : 0;

      // Đinh tán nhỏ chạy song song mép tấm
      let riv = 0;
      if (rivets && dSeam > 3.0 && dSeam < 6.2) {
        const along = dEdgeU < dEdgeV ? fv * (N / pv) : fsu * (N / pu);
        const rPhase = ((along % 11) - 5.5);
        const rDist = Math.hypot(rPhase, dSeam - 4.6);
        if (rDist < 1.35) riv = 1 - rDist / 1.35;
      }

      // Vệt gió / muối kéo dài dọc trục u
      const strk = streak * Math.max(0, fbm(u * 3, v * 28, seed + 5, 3, 28) - 0.45);
      const fine = (vnoise(u * 128, v * 128, seed + 17, 128) - 0.5) * 0.03;

      const shade = cellTone * (1 - seam * 0.26 - riv * 0.14 - strk * 0.18) + fine;
      const idx = y * N + x, i = idx * 4;
      for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.max(0, Math.min(255, base[ch] * shade));
      img.data[i + 3] = 255;
      rough[idx] = Math.min(1, Math.max(0.12, roughness + (hash(iu, iv, seed + 3) - 0.5) * 0.08 * panelVar + seam * 0.35 + strk * 0.22));
      bmp[idx] = 0.55 - seam * 0.48 + riv * 0.22 + fine * 0.8;
    }
  }, true, repeat);
  return new THREE.MeshStandardMaterial({
    map, roughnessMap: grayTex(N, rough, repeat), bumpMap: grayTex(N, bmp, repeat), bumpScale: 0.014, roughness: 1, metalness,
  });
});

export type MachinedOpts = {
  color?: string;
  roughness?: number;
  metalness?: number;
  /** Hướng vết tiện/phay: 'u' (quanh trục) hoặc 'v' (dọc trục). */
  brush?: 'u' | 'v';
  /** Vết dầu mỡ / ám khói đầu nòng 0..1. */
  oil?: number;
  seed?: number;
};

/** Kim loại gia công cơ khí có vết phay/tiện xước (bánh răng, trục truyền động, piston thuỷ lực, khoá nòng, vỏ đạn, cánh tuabin). */
export const machined = (o: MachinedOpts = {}): THREE.MeshStandardMaterial => memo('mach' + JSON.stringify(o), () => {
  const { color = '#b8c0c8', roughness = 0.28, metalness = 0.88, brush = 'v', oil = 0.15, seed = 19 } = o;
  const N = 512, base = rgb(color);
  const rough = new Float32Array(N * N);
  const bmp = new Float32Array(N * N);
  const map = canvasTex(N, (img) => {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const u = x / N, v = y / N;
      const su = brush === 'u' ? u * 8 : u * 180;
      const sv = brush === 'u' ? v * 180 : v * 8;
      const scratch = fbm(su, sv, seed, 3, 180);
      const grease = oil * Math.max(0, fbm(u * 6, v * 6, seed + 9, 3, 6) - 0.42);
      const shade = (0.9 + 0.2 * scratch) * (1 - grease * 0.45);
      const idx = y * N + x, i = idx * 4;
      for (let ch = 0; ch < 3; ch++) img.data[i + ch] = Math.max(0, Math.min(255, base[ch] * shade));
      img.data[i + 3] = 255;
      rough[idx] = Math.min(1, Math.max(0.08, roughness + (scratch - 0.5) * 0.16 + grease * 0.25));
      bmp[idx] = 0.5 + (scratch - 0.5) * 0.4;
    }
  }, true);
  return new THREE.MeshStandardMaterial({
    map, roughnessMap: grayTex(N, rough), bumpMap: grayTex(N, bmp), bumpScale: 0.006, roughness: 1, metalness,
  });
});

export type GlassOpts = {
  /** Màu nhuộm kính (mặc định '#1b2836' xanh khói tối). */
  color?: string;
  /** Độ truyền sáng xuyên qua 0..1 (đặt 0.75..0.92 khi bên trong có buồng lái/cảm biến; đặt 0 nếu kính tối phản gương bên ngoài). */
  opacity?: number;
  roughness?: number;
  /** Ánh phủ quang học chống phản xạ / chống radar trên bề mặt (ví dụ '#6b5cff' tím hoặc '#d4a238' vàng). */
  coatColor?: string;
};

/** Kính quang học vật lý (kính buồng lái, kính tiềm vọng xe tăng, vòm đầu dò tên lửa, cửa sổ tàu). */
export const glass = (o: GlassOpts = {}): THREE.MeshPhysicalMaterial => memo('glass' + JSON.stringify(o), () => {
  const { color = '#1b2836', opacity = 0.35, roughness = 0.06, coatColor } = o;
  const seeThrough = opacity < 0.96;
  return new THREE.MeshPhysicalMaterial({
    color: coatColor ?? color,
    attenuationColor: new THREE.Color(color),
    attenuationDistance: 0.8,
    roughness,
    metalness: coatColor ? 0.18 : 0.06,
    ior: 1.52,
    reflectivity: 0.95,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    transparent: seeThrough,
    opacity: seeThrough ? opacity : 1,
    envMapIntensity: 1.6,
    depthWrite: !seeThrough,
    side: THREE.DoubleSide,
  });
});

/**
 * Vật liệu vỏ mờ Fresnel (X-Ray / Ghost Cutaway): biến vỏ ngoài thành lớp kính mờ sáng viền mảnh
 * để người xem thấy rõ toàn bộ cơ cấu bánh răng, đạn, động cơ nằm bên trong đúng dáng khí tài.
 */
export const ghost = (color = '#7cc4e8', opacity = 0.18, rimPower = 2.4): THREE.ShaderMaterial =>
  memo(`ghost${color}${opacity}${rimPower}`, () => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    clipping: true,
    side: THREE.DoubleSide,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uOpacity: { value: opacity },
      uRim: { value: rimPower },
    },
    vertexShader: `
      #include <clipping_planes_pars_vertex>
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        #include <clipping_planes_vertex>
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vNormalW = normalize(mat3(modelMatrix) * normal);
        vViewDir = normalize(cameraPosition - wp.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      #include <clipping_planes_pars_fragment>
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uRim;
      varying vec3 vNormalW;
      varying vec3 vViewDir;
      void main() {
        #include <clipping_planes_fragment>
        vec3 nW = length(vNormalW) > 1e-5 ? normalize(vNormalW) : vec3(0.0, 1.0, 0.0);
        vec3 vD = length(vViewDir) > 1e-5 ? normalize(vViewDir) : vec3(0.0, 0.0, 1.0);
        float ndv = abs(dot(nW, vD));
        float fres = pow(clamp(1.0 - ndv, 0.0, 1.0), uRim);
        float a = clamp(uOpacity * 0.45 + fres * min(0.92, uOpacity * 3.4), 0.02, 0.95);
        vec3 col = mix(uColor * 0.65, uColor * 1.45 + vec3(0.18), fres);
        gl_FragColor = vec4(col, a);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  }));

/** Gắn danh sách mặt phẳng cắt `planes` (từ `clipPlane()`) vào bản sao vật liệu để xẻ dọc mô hình theo thời gian `t`. */
export const clipMat = <T extends THREE.Material>(mat: T, planes: THREE.Plane[]): T => {
  const m = mat.clone() as T;
  m.clippingPlanes = planes;
  m.clipShadows = true;
  m.side = THREE.DoubleSide;
  return m;
};

/** Vật liệu trơn (cao su, kim loại phụ, chi tiết nhỏ…) có cache. */
export const plain = (color: string, roughness = 0.8, metalness = 0, extra: THREE.MeshStandardMaterialParameters = {}) =>
  memo(`plain${color}${roughness}${metalness}${JSON.stringify(extra)}`, () => new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra }));

/** Texture hạt xám quanh 1.0 (nhân với màu đỉnh + làm bump địa hình) để phá mảng màu phẳng trên địa hình, đá… */
export const grain = (seed = 3, scale = 8) => memo(`grain${seed}${scale}`, () => canvasTex(256, (img) => {
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const n = 0.55 * fbm((x / 256) * scale, (y / 256) * scale, seed, 4, scale) + 0.45 * vnoise((x / 256) * 64, (y / 256) * 64, seed + 1, 64);
    const g = 180 + (n - 0.5) * 140;
    const i = (y * 256 + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = Math.max(0, Math.min(255, g));
    img.data[i + 3] = 255;
  }
}, true));
