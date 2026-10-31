// Mô hình 3D tàu sân bay lớp Yorktown: USS Hornet (CV-8) / USS Enterprise (CV-6) — tỉ lệ thật 1:1 (1 đơn vị = 1 mét).
// Hệ trục chuẩn toàn phim: Mũi tàu (Bow) +X, Trên +Y, Mạn phải (Starboard / Đảo chỉ huy) +Z, Mạn trái (Port) -Z.
// Mặt nước biển trung bình y = 0; đáy chìm y = -8.5 m; mặt trên sàn đáp (Flight Deck) y = +18.3 m (đúng 60 ft).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { extrude, extrudeTop, lathe, mat4, merge, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { fbm, paint, plain, vnoise } from '@skill/military/3d/materials';
import { turntable } from '@skill/military/3d/turntable';
import { PAINT } from '../design/palette';

export const HORNET_DECK_Y = 18.3;
export const HORNET_B25_Z = -0.85;
export const HORNET_STRIPE_Z = -3.8;
export const HORNET_BOW_X = 125.7;

export type USSHornetProps = {
  hullNumber?: '8' | '6';
  showLaunchLines?: boolean;
  flagWave?: number;
  aaYaw?: number;
  elevatorDown?: number;
};

// ---------------- Toán học nội suy mượt & chuẩn hoá UV cho khối lớn ----------------
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const smooth01 = (t: number) => {
  const c = clamp(t, 0, 1);
  return c * c * (3 - 2 * c);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Thu nhỏ UV của khối extrude lớn (1 m = 1 UV gốc) để vân paint(repeat: 0.35) mịn đồng nhất trên tàu dài 251.4 m. */
const scaleUV = (g: THREE.BufferGeometry, factor = 0.1) => {
  const uv = g.getAttribute('uv');
  if (!uv) return g;
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, uv.getX(i) * factor, uv.getY(i) * factor);
  }
  uv.needsUpdate = true;
  return g;
};

const xform = (
  src: THREE.BufferGeometry,
  pos: [number, number, number],
  rot: [number, number, number] = [0, 0, 0],
  scale: number | [number, number, number] = 1,
  uvScale?: number,
) => {
  const g = src.clone();
  if (uvScale !== undefined) scaleUV(g, uvScale);
  g.applyMatrix4(mat4(pos, rot, scale));
  return g;
};

// ---------------- Biên dạng mặt bằng sàn đáp (Flight Deck 251.4 m × 35.0 m) ----------------
/** Nửa bề rộng sàn đáp theo x (-125.7..+125.7 m): giữa tàu rộng 35.0 m (±17.5), mút mũi ~24 m (±12), mút đuôi ~26 m (±13). */
const deckHalfWidth = (x: number): number => {
  if (x > 74) {
    const t = smooth01((x - 74) / (125.7 - 74));
    const tipRound = x > 123.6 ? 1 - 0.13 * Math.pow((x - 123.6) / 2.1, 2) : 1;
    return lerp(17.5, 12.0, Math.pow(t, 1.14)) * tipRound;
  }
  if (x < -78) {
    const t = smooth01((-78 - x) / (125.7 - 78));
    const sternRound = x < -123.3 ? 1 - 0.15 * Math.pow((-123.3 - x) / 2.4, 2) : 1;
    return lerp(17.5, 13.0, Math.pow(t, 1.14)) * sternRound;
  }
  return 17.5;
};

const makeDeckOutline = (): P2[] => {
  const xs: number[] = [-125.7, -125.1, -124.2, -122.5];
  for (let x = -118; x <= 118; x += 4) xs.push(x);
  xs.push(122.0, 124.0, 125.1, 125.7);
  const pts: P2[] = [];
  for (const x of xs) pts.push([x, deckHalfWidth(x)]);
  for (let i = xs.length - 1; i >= 0; i--) pts.push([xs[i], -deckHalfWidth(xs[i])]);
  return pts;
};

// Thang nâng giữa (Midships Elevator): x = -3.3..+11.3 (dài 14.6 m, tâm x = +4.0), z = -6.7..+6.7 (rộng 13.4 m)
const MID_ELEV_X0 = -3.3;
const MID_ELEV_X1 = 11.3;
const MID_ELEV_Z = 6.7;

const buildFlightDeckWithElevatorHole = (thickness: number): THREE.BufferGeometry => {
  const pts = makeDeckOutline();
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, z)));
  const hole = new THREE.Path([
    new THREE.Vector2(MID_ELEV_X0, -MID_ELEV_Z),
    new THREE.Vector2(MID_ELEV_X1, -MID_ELEV_Z),
    new THREE.Vector2(MID_ELEV_X1, MID_ELEV_Z),
    new THREE.Vector2(MID_ELEV_X0, MID_ELEV_Z),
  ]);
  sh.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(sh, { depth: thickness, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(Math.PI / 2);
  g.translate(0, thickness, 0);
  const pos = g.getAttribute('position');
  const uv = g.getAttribute('uv');
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / 16, pos.getZ(i) / 8);
  }
  uv.needsUpdate = true;
  g.computeVertexNormals();
  return g;
};

// ---------------- Vật liệu mặt sàn gỗ sơn xanh-xám Hải quân (PAINT.navyDeckStain) ----------------
let cachedDeckMat: THREE.MeshStandardMaterial | null = null;
const getDeckWoodMaterial = (): THREE.MeshStandardMaterial => {
  if (cachedDeckMat) return cachedDeckMat;
  const N = 512;
  const base = new THREE.Color(PAINT.navyDeckStain); // #353d47
  const br = base.r * 255;
  const bg = base.g * 255;
  const bb = base.b * 255;

  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(N, N);

  const rcv = document.createElement('canvas');
  rcv.width = rcv.height = N;
  const rctx = rcv.getContext('2d')!;
  const rimg = rctx.createImageData(N, N);

  const planks = 44;
  for (let y = 0; y < N; y++) {
    const v = y / N;
    const vf = v * planks;
    const plankIdx = Math.floor(vf);
    const plankFrac = vf - plankIdx;
    const isSeam = plankFrac < 0.075 || plankFrac > 0.96;
    const plankTone = 0.98 + 0.18 * vnoise(plankIdx * 1.7, 3.1, 41, planks * 2);

    for (let x = 0; x < N; x++) {
      const u = x / N;
      const buttShift = vnoise(plankIdx * 3.3, 7.7, 19, 128);
      const buttFrac = ((u * 4 + buttShift) % 1 + 1) % 1;
      const isButt = buttFrac < 0.013;

      const grain = fbm(u * 26, v * 92, 7, 3, 92);
      const salt = fbm(u * 6, v * 6, 23, 4, 6);
      const wear = Math.max(0, fbm(u * 9, v * 11, 53, 3, 11) - 0.5) * 0.55;

      let shade = plankTone * (0.96 + 0.2 * grain) * (0.96 + 0.16 * salt);
      if (isSeam || isButt) shade *= 0.72;

      const isTieStrip = plankIdx % 7 === 0 && plankFrac > 0.42 && plankFrac < 0.58 && ((x >> 3) & 1) === 0;
      const idx = (y * N + x) * 4;
      // Sắc gỗ thông Douglas fir bạc muối lộ nhẹ dưới lớp stain xanh-xám Hải quân
      const woodWarmR = 116;
      const woodWarmG = 106;
      const woodWarmB = 94;

      let rr = br * shade * (1 - wear) + woodWarmR * wear;
      let gg = bg * shade * (1 - wear) + woodWarmG * wear;
      let bbv = bb * shade * (1 - wear) + woodWarmB * wear;
      if (isTieStrip) {
        rr *= 0.84;
        gg *= 0.86;
        bbv *= 0.88;
      }

      img.data[idx] = clamp(rr, 0, 255);
      img.data[idx + 1] = clamp(gg, 0, 255);
      img.data[idx + 2] = clamp(bbv, 0, 255);
      img.data[idx + 3] = 255;

      const rough = clamp((isSeam ? 0.92 : 0.72 + (grain - 0.5) * 0.18 - wear * 0.14) * 255, 45, 248);
      rimg.data[idx] = rimg.data[idx + 1] = rimg.data[idx + 2] = rough;
      rimg.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  rctx.putImageData(rimg, 0, 0);

  const map = new THREE.CanvasTexture(cv);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.anisotropy = 8;
  map.colorSpace = THREE.SRGBColorSpace;

  const rmap = new THREE.CanvasTexture(rcv);
  rmap.wrapS = rmap.wrapT = THREE.RepeatWrapping;
  rmap.anisotropy = 8;

  cachedDeckMat = new THREE.MeshStandardMaterial({
    map,
    roughnessMap: rmap,
    roughness: 1,
    metalness: 0.12,
  });
  return cachedDeckMat;
};

// ---------------- Vật liệu cờ Hải quân Mỹ 48 sao (US Ensign 1942) ----------------
let cachedFlagMat: THREE.MeshStandardMaterial | null = null;
const getUSFlagMaterial = (): THREE.MeshStandardMaterial => {
  if (cachedFlagMat) return cachedFlagMat;
  const W = 256;
  const H = 128;
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d')!;

  const sh = H / 13;
  for (let i = 0; i < 13; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#b22234' : '#edf1f5';
    ctx.fillRect(0, i * sh, W, sh + 0.5);
  }
  const cw = W * 0.42;
  const ch = sh * 7;
  ctx.fillStyle = '#1d3268';
  ctx.fillRect(0, 0, cw, ch);
  ctx.fillStyle = '#f2f5f8';
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 8; c++) {
      const sx = ((c + 0.55) / 8.1) * cw;
      const sy = ((r + 0.55) / 6.1) * ch;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cachedFlagMat = new THREE.MeshStandardMaterial({
    map: tex,
    roughness: 0.78,
    metalness: 0.04,
    side: THREE.DoubleSide,
  });
  return cachedFlagMat;
};

// ---------------- Loft thân tàu lớp Yorktown (Indexed Smooth Normals + Clipper Bow + Cruiser Stern) ----------------
type HullBandMeshes = {
  lowerRed: THREE.BufferGeometry;
  bootBelt: THREE.BufferGeometry;
  upperNavy: THREE.BufferGeometry;
  forecastleDeck: THREE.BufferGeometry;
};

const hullXBounds = (y: number): [number, number] => {
  // Mũi tàu clipper bow vươn cong sắc từ mớn nước (x=+114.2) tới mút boong mũi (x=+122.4 ở y=+12.8)
  let xFwd: number;
  if (y < 0) {
    const t = (y + 8.5) / 8.5;
    xFwd = lerp(101.5, 114.2, Math.pow(clamp(t, 0, 1), 0.58));
  } else {
    const t = clamp(y / 12.8, 0, 1);
    xFwd = 114.2 + 8.2 * Math.pow(t, 1.38);
  }
  // Đuôi cruiser stern hớt cao ở đáy sau để lộ 4 chân vịt & bánh lái ở x = -106..-120
  let xAft: number;
  if (y < -1.2) {
    const t = (y + 8.5) / 7.3;
    xAft = lerp(-92.5, -117.6, Math.pow(clamp(t, 0, 1), 0.72));
  } else {
    const t = clamp((y + 1.2) / 12.2, 0, 1);
    xAft = lerp(-117.6, -121.0, Math.pow(t, 0.55));
  }
  return [xAft, xFwd];
};

/** Nửa bề rộng thân: đúng 12.7 m ở mớn nước (rộng 25.4 m); loe clipper bow mạnh ở mũi và vồng mạn tới 14.5 m ở boong hangar. */
const hullHalfBeamAt = (u: number, y: number, yTop: number): number => {
  if (u <= 0.0001 || u >= 0.9999) return 0;

  let planFactor: number;
  if (u > 0.6) {
    const tb = (u - 0.6) / 0.4;
    const finePower = y < 0 ? 1.38 : lerp(1.24, 0.84, clamp(y / 12.8, 0, 1));
    planFactor = Math.pow(Math.max(0, 1 - Math.pow(tb, 1.54)), finePower);
  } else if (u < 0.28) {
    const ts = (0.28 - u) / 0.28;
    const sternExp = y < -1.5 ? 1.48 : 0.9;
    planFactor = Math.pow(Math.max(0, 1 - Math.pow(ts, 1.75)), sternExp);
  } else {
    planFactor = 1.0;
  }

  let secFactor: number;
  if (y < 0) {
    const yn = clamp((y + 8.5) / 8.5, 0, 1);
    const vSharp = u > 0.7 ? lerp(0.18, 0.86, (u - 0.7) / 0.3) : u < 0.22 ? lerp(0.18, 0.78, (0.22 - u) / 0.22) : 0.16;
    const boxBilge = 1 - Math.pow(1 - yn, 4.2);
    const vHull = Math.pow(yn, 0.78);
    secFactor = lerp(boxBilge, vHull, vSharp);
  } else {
    const yt = clamp(y / Math.max(10.5, yTop), 0, 1);
    const bowFlare = u > 0.65 ? 0.32 * Math.pow((u - 0.65) / 0.35, 1.2) * Math.pow(yt, 1.12) : 0;
    const midFlare = 0.14 * Math.pow(yt, 1.15);
    secFactor = 1.0 + midFlare + bowFlare;
  }

  return 12.7 * planFactor * secFactor;
};

const buildYorktownHull = (): HullBandMeshes => {
  const NU = 60;
  const fixedYs = [-8.5, -8.15, -7.4, -6.2, -4.6, -3.0, -1.6, -0.9, -0.45, 0.0, 0.48];
  const upperSteps = 8;
  const NV = fixedYs.length - 1 + upperSteps;

  const us: number[] = [];
  for (let i = 0; i <= NU; i++) {
    us.push(0.5 - 0.5 * Math.cos((Math.PI * i) / NU));
  }

  const grid: [number, number, number][][] = [];
  for (let j = 0; j <= NV; j++) {
    const row: [number, number, number][] = [];
    for (let i = 0; i <= NU; i++) {
      const u = us[i];
      const sheerY =
        u > 0.6
          ? 11.2 + 1.6 * Math.pow((u - 0.6) / 0.4, 1.72)
          : u < 0.25
            ? 11.2 - 0.45 * Math.pow((0.25 - u) / 0.25, 1.5)
            : 11.2;

      let y: number;
      if (j < fixedYs.length) {
        y = fixedYs[j];
      } else {
        const ft = (j - (fixedYs.length - 1)) / upperSteps;
        y = lerp(0.48, sheerY, ft);
      }

      const [xAft, xFwd] = hullXBounds(y);
      const x = lerp(xAft, xFwd, u);
      const z = j === 0 && y <= -8.49 ? 0 : hullHalfBeamAt(u, y, sheerY);
      row.push([x, y, z]);
    }
    grid.push(row);
  }
  for (let i = 1; i < NU; i++) {
    const u = us[i];
    const [xAft, xFwd] = hullXBounds(-8.5);
    const x = lerp(xAft, xFwd, u);
    grid[1][i] = [x, -8.45, hullHalfBeamAt(u, -8.35, 11.2) * 0.68];
  }

  // Dùng lưới đỉnh có chỉ số (indexed BufferGeometry) tách riêng mạn phải & mạn trái để pháp tuyến mượt mà vẫn sắc sống mũi!
  const buildIndexedBand = (jStart: number, jEnd: number): THREE.BufferGeometry => {
    const rows = jEnd - jStart + 1;
    const cols = NU + 1;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Nửa 1: Mạn phải (+Z)
    for (let r = 0; r < rows; r++) {
      const j = jStart + r;
      for (let i = 0; i < cols; i++) {
        const p = grid[j][i];
        positions.push(p[0], p[1], p[2]);
        uvs.push(p[0] * 0.085, p[1] * 0.085);
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let i = 0; i < NU; i++) {
        const a = r * cols + i;
        const b = a + 1;
        const d = (r + 1) * cols + i;
        const c = d + 1;
        indices.push(a, b, c, a, c, d);
      }
    }

    // Nửa 2: Mạn trái (-Z)
    const offset = rows * cols;
    for (let r = 0; r < rows; r++) {
      const j = jStart + r;
      for (let i = 0; i < cols; i++) {
        const p = grid[j][i];
        positions.push(p[0], p[1], -p[2]);
        uvs.push(p[0] * 0.085, p[1] * 0.085);
      }
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let i = 0; i < NU; i++) {
        const a = offset + r * cols + i;
        const b = a + 1;
        const d = offset + (r + 1) * cols + i;
        const c = d + 1;
        indices.push(a, c, b, a, d, c);
      }
    }

    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.setIndex(indices);
    g.computeVertexNormals();
    return g;
  };

  const buildMainDeckCap = (): THREE.BufferGeometry => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const topRow = grid[NV];
    for (let i = 0; i < NU; i++) {
      const s0 = topRow[i];
      const s1 = topRow[i + 1];
      const c0: [number, number, number] = [s0[0], s0[1], 0];
      const c1: [number, number, number] = [s1[0], s1[1], 0];
      const p0: [number, number, number] = [s0[0], s0[1], -s0[2]];
      const p1: [number, number, number] = [s1[0], s1[1], -s1[2]];

      positions.push(c0[0], c0[1], c0[2], s0[0], s0[1], s0[2], s1[0], s1[1], s1[2]);
      positions.push(c0[0], c0[1], c0[2], s1[0], s1[1], s1[2], c1[0], c1[1], c1[2]);
      positions.push(c0[0], c0[1], c0[2], p1[0], p1[1], p1[2], p0[0], p0[1], p0[2]);
      positions.push(c0[0], c0[1], c0[2], c1[0], c1[1], c1[2], p1[0], p1[1], p1[2]);

      for (let k = 0; k < 4; k++) {
        uvs.push(c0[0] * 0.08, 0, s0[0] * 0.08, s0[2] * 0.08, s1[0] * 0.08, s1[2] * 0.08);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    g.computeVertexNormals();
    return g;
  };

  return {
    lowerRed: buildIndexedBand(0, 8),
    bootBelt: buildIndexedBand(8, 10),
    upperNavy: buildIndexedBand(10, NV),
    forecastleDeck: buildMainDeckCap(),
  };
};

// ---------------- Chữ số Hải quân kiểu stencil ('8' cho CV-8 Hornet, '6' cho CV-6 Enterprise) ----------------
const buildNavalDigit2D = (digit: '8' | '6', w: number, h: number, thickness: number): THREE.BufferGeometry => {
  const t = w * 0.23;
  const hw = w / 2;
  const hh = h / 2;
  const ch = w * 0.16;

  const poly = (pts: P2[]) => extrude(pts, thickness, 0);
  const parts: THREE.BufferGeometry[] = [];

  parts.push(
    poly([
      [-hw + ch, hh],
      [hw - ch, hh],
      [hw, hh - ch],
      [hw - t * 0.4, hh - t],
      [-hw + t * 0.4, hh - t],
      [-hw, hh - ch],
    ]),
  );
  parts.push(
    poly([
      [-hw + t * 0.35, t * 0.48],
      [hw - t * 0.35, t * 0.48],
      [hw - t * 0.15, 0],
      [hw - t * 0.35, -t * 0.48],
      [-hw + t * 0.35, -t * 0.48],
      [-hw + t * 0.15, 0],
    ]),
  );
  parts.push(
    poly([
      [-hw + t * 0.4, -hh + t],
      [hw - t * 0.4, -hh + t],
      [hw, -hh + ch],
      [hw - ch, -hh],
      [-hw + ch, -hh],
      [-hw, -hh + ch],
    ]),
  );
  parts.push(
    poly([
      [-hw, hh - ch - 0.04],
      [-hw + t, hh - t - 0.04],
      [-hw + t, t * 0.52],
      [-hw, t * 0.2],
    ]),
  );
  parts.push(
    poly([
      [-hw, -t * 0.2],
      [-hw + t, -t * 0.52],
      [-hw + t, -hh + t + 0.04],
      [-hw, -hh + ch + 0.04],
    ]),
  );
  parts.push(
    poly([
      [hw - t, -t * 0.52],
      [hw, -t * 0.2],
      [hw, -hh + ch + 0.04],
      [hw - t, -hh + t + 0.04],
    ]),
  );

  if (digit === '8') {
    parts.push(
      poly([
        [hw - t, hh - t - 0.04],
        [hw, hh - ch - 0.04],
        [hw, t * 0.2],
        [hw - t, t * 0.52],
      ]),
    );
  } else {
    parts.push(
      poly([
        [hw - t, hh - t - 0.04],
        [hw, hh - ch - 0.04],
        [hw, hh - t * 1.65],
        [hw - t, hh - t * 1.65],
      ]),
    );
  }

  return merge(parts);
};

// ---------------- Khung dầm thép chữ A đục rỗng đỡ mũi & đuôi sàn bay (đặc trưng lớp Yorktown) ----------------
// Mở khoang boong mũi thông thoáng dài 44 m (x = +78..+122 m) với 6 khung cổng thép chữ A đục rỗng lỗ tròn!
const buildPiercedSupportFrames = (): THREE.BufferGeometry => {
  const parts: THREE.BufferGeometry[] = [];

  // 4 dầm dọc đục rỗng (pierced longitudinal girders) chạy dưới gầm đầu mũi sàn bay (x = +78..+124.8 m)
  const makeLongGirder = (): THREE.BufferGeometry => {
    const sh = new THREE.Shape([
      new THREE.Vector2(78.0, 16.85),
      new THREE.Vector2(124.2, 17.32),
      new THREE.Vector2(125.0, 17.78),
      new THREE.Vector2(78.0, 17.78),
    ]);
    for (let hx = 80.5; hx <= 121.0; hx += 3.1) {
      const hy = lerp(17.34, 17.55, (hx - 80.5) / 40.5);
      const hole = new THREE.Path();
      hole.absarc(hx, hy, 0.26, 0, Math.PI * 2, true);
      sh.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.36, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -0.18);
    scaleUV(g, 0.12);
    return g;
  };

  const lg = makeLongGirder();
  for (const zPos of [-9.2, -4.4, 4.4, 9.2]) {
    parts.push(xform(lg, [0, 0, zPos]));
  }

  // 6 khung cổng chữ A đục rỗng (transverse pierced portal bents) vươn từ mép boong clipper bow lên đỡ sàn đáp
  const bowStations = [
    { x: 81.5, yBase: 11.3, zBase: 12.6, zTop: 16.9 },
    { x: 89.5, yBase: 11.45, zBase: 11.2, zTop: 16.0 },
    { x: 97.5, yBase: 11.68, zBase: 9.4, zTop: 14.9 },
    { x: 105.0, yBase: 11.95, zBase: 7.4, zTop: 13.8 },
    { x: 112.2, yBase: 12.25, zBase: 5.1, zTop: 12.8 },
    { x: 118.8, yBase: 12.56, zBase: 2.6, zTop: 11.9 },
  ];

  for (const st of bowStations) {
    const yTop = 17.72;
    const sh = new THREE.Shape([
      new THREE.Vector2(-st.zTop, yTop),
      new THREE.Vector2(st.zTop, yTop),
      new THREE.Vector2(st.zTop, yTop - 0.95),
      new THREE.Vector2(st.zBase + 0.72, st.yBase),
      new THREE.Vector2(st.zBase - 0.78, st.yBase),
      new THREE.Vector2(st.zBase - 0.12, yTop - 1.48),
      new THREE.Vector2(2.2, yTop - 1.48),
      new THREE.Vector2(1.05, st.yBase),
      new THREE.Vector2(-1.05, st.yBase),
      new THREE.Vector2(-2.2, yTop - 1.48),
      new THREE.Vector2(-(st.zBase - 0.12), yTop - 1.48),
      new THREE.Vector2(-(st.zBase - 0.78), st.yBase),
      new THREE.Vector2(-(st.zBase + 0.72), st.yBase),
      new THREE.Vector2(-st.zTop, yTop - 0.95),
    ]);

    const span = st.zTop - 1.9;
    for (let hz = -span; hz <= span; hz += 2.2) {
      if (Math.abs(hz) < 1.1) continue;
      const hole = new THREE.Path();
      hole.absarc(hz, yTop - 0.7, 0.36, 0, Math.PI * 2, true);
      sh.holes.push(hole);
    }

    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.48, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -0.24);
    g.rotateY(-Math.PI / 2);
    g.translate(st.x, 0, 0);
    scaleUV(g, 0.12);
    parts.push(g);
  }

  // Thanh giằng chéo chữ X bằng thép giữa các khung chữ A mũi tàu
  for (let k = 0; k < bowStations.length - 1; k++) {
    const a = bowStations[k];
    const b = bowStations[k + 1];
    for (const sgn of [-1, 1]) {
      parts.push(
        pipe(
          [
            [a.x, a.yBase + 0.45, sgn * a.zBase],
            [b.x, 17.05, sgn * (b.zTop - 1.5)],
          ],
          0.18,
          8,
        ),
      );
      parts.push(
        pipe(
          [
            [b.x, b.yBase + 0.45, sgn * b.zBase],
            [a.x, 17.05, sgn * (a.zTop - 1.5)],
          ],
          0.18,
          8,
        ),
      );
    }
  }

  // Hệ 4 khung dầm chữ A & thanh chống xiên đỡ đuôi sàn bay (stern overhang: x = -121..-88 m)
  const sternStations = [
    { x: -90.0, zBase: 11.8, zTop: 16.5 },
    { x: -100.0, zBase: 10.2, zTop: 15.6 },
    { x: -110.0, zBase: 7.9, zTop: 14.3 },
    { x: -118.8, zBase: 4.9, zTop: 13.0 },
  ];
  for (const st of sternStations) {
    const sh = new THREE.Shape([
      new THREE.Vector2(-st.zTop, 17.72),
      new THREE.Vector2(st.zTop, 17.72),
      new THREE.Vector2(st.zTop, 16.88),
      new THREE.Vector2(st.zBase + 0.6, 10.85),
      new THREE.Vector2(st.zBase - 0.7, 10.85),
      new THREE.Vector2(st.zBase - 0.08, 16.35),
      new THREE.Vector2(-(st.zBase - 0.08), 16.35),
      new THREE.Vector2(-(st.zBase - 0.7), 10.85),
      new THREE.Vector2(-(st.zBase + 0.6), 10.85),
      new THREE.Vector2(-st.zTop, 16.88),
    ]);
    for (let hz = -(st.zTop - 2.1); hz <= st.zTop - 2.1; hz += 2.4) {
      const hole = new THREE.Path();
      hole.absarc(hz, 17.08, 0.32, 0, Math.PI * 2, true);
      sh.holes.push(hole);
    }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.48, bevelEnabled: false, curveSegments: 10 });
    g.translate(0, 0, -0.24);
    g.rotateY(-Math.PI / 2);
    g.translate(st.x, 0, 0);
    scaleUV(g, 0.12);
    parts.push(g);
  }
  for (let k = 0; k < sternStations.length - 1; k++) {
    const a = sternStations[k];
    const b = sternStations[k + 1];
    for (const sgn of [-1, 1]) {
      parts.push(
        pipe(
          [
            [b.x, 11.3, sgn * b.zBase],
            [a.x, 17.0, sgn * (a.zTop - 1.5)],
          ],
          0.18,
          8,
        ),
      );
    }
  }

  // Hệ công-xôn dầm ngang (cantilever beams) dọc hai bên mép dưới sàn bay
  const beamBox = rbox(0.44, 0.6, 3.9, 0.05);
  for (let bx = -86; bx <= 76; bx += 5.5) {
    const hw = deckHalfWidth(bx);
    parts.push(xform(beamBox, [bx, 17.5, hw - 2.0], [0.12, 0, 0], 1, 0.2));
    parts.push(xform(beamBox, [bx, 17.5, -(hw - 2.0)], [-0.12, 0, 0], 1, 0.2));
  }

  return merge(parts);
};

// ---------------- Khoang chứa máy bay (Hangar Superstructure: Measure 12 Modified Ocean Gray), cửa cuốn & xuồng ----------------
const buildHangarAndHullSuper = () => {
  const superGrayParts: THREE.BufferGeometry[] = [];
  const darkRecessParts: THREE.BufferGeometry[] = [];
  const boatHullParts: THREE.BufferGeometry[] = [];
  const raftParts: THREE.BufferGeometry[] = [];

  // Khối hangar chính từ x = -86..+78 m (để lộ boong đuôi 40 m và boong mũi clipper 44 m đúng dáng Yorktown-class!)
  darkRecessParts.push(xform(rbox(164, 6.45, 25.0, 0.08), [-4, 14.38, 0]));
  // Vách đầu & cuối hangar có cổng thép cuốn lớn thông ra boong mũi/đuôi
  superGrayParts.push(xform(rbox(1.1, 6.5, 27.6, 0.06), [77.5, 14.4, 0], [0, 0, 0], 1, 0.14));
  superGrayParts.push(xform(rbox(1.1, 6.5, 27.0, 0.06), [-85.5, 14.4, 0], [0, 0, 0], 1, 0.14));

  // Hố giếng thang nâng giữa (Midships elevator pit) ở x = -3.3..+11.3, z = -6.7..+6.7
  darkRecessParts.push(xform(rbox(14.8, 0.3, 13.6, 0.04), [4.0, 11.65, 0]));
  darkRecessParts.push(xform(rbox(14.9, 6.6, 0.26, 0.03), [4.0, 14.9, 6.82]));
  darkRecessParts.push(xform(rbox(14.9, 6.6, 0.26, 0.03), [4.0, 14.9, -6.82]));
  darkRecessParts.push(xform(rbox(0.26, 6.6, 13.6, 0.03), [-3.42, 14.9, 0]));
  darkRecessParts.push(xform(rbox(0.26, 6.6, 13.6, 0.03), [11.42, 14.9, 0]));

  // Thành hangar mở ra z = ±14.2 m (ăn khớp mặt loe mạn tàu 28.4 m ở y = 11.2 m để đón ánh sáng tự nhiên!)
  for (const sgn of [-1, 1]) {
    const zWall = sgn * 14.15;
    superGrayParts.push(xform(rbox(164, 1.45, 1.4, 0.06), [-4, 17.05, zWall], [0, 0, 0], 1, 0.14));
    superGrayParts.push(xform(rbox(164, 1.2, 1.55, 0.06), [-4, 11.6, zWall], [0, 0, 0], 1, 0.14));

    // Các mảng vách kín xen kẽ 4 ô cửa cuốn mở lớn (open roller-shutter hangar bays)
    const closedSpans: [number, number][] = [
      [-86, -72],
      [-56, -40],
      [-24, -8],
      [8, 26],
      [42, 58],
      [70, 78],
    ];
    for (const [xa, xb] of closedSpans) {
      superGrayParts.push(xform(rbox(xb - xa, 4.4, 1.3, 0.05), [(xa + xb) / 2, 14.25, zWall], [0, 0, 0], 1, 0.14));
    }

    // Hộp lô cửa cuốn thép trên 4 ô cửa mở hangar
    const openBays: [number, number][] = [
      [-72, -56],
      [-40, -24],
      [-8, 8],
      [58, 70],
    ];
    for (const [xa, xb] of openBays) {
      const len = xb - xa;
      const cx = (xa + xb) / 2;
      superGrayParts.push(xform(rbox(len, 1.15, 0.5, 0.04), [cx, 15.85, sgn * 13.95], [0, 0, 0], 1, 0.2));
      superGrayParts.push(xform(rbox(0.58, 4.3, 0.95, 0.04), [cx, 14.25, sgn * 14.1], [0, 0, 0], 1, 0.25));
    }

    // Hệ cột sườn thép thẳng đứng (pilasters) dọc thành hangar
    const pilaster = rbox(0.78, 6.5, 1.65, 0.05);
    for (let px = -84; px <= 76; px += 8) {
      superGrayParts.push(xform(pilaster, [px, 14.35, sgn * 14.3], [0, 0, 0], 1, 0.22));
    }

    // Xuồng cứu sinh Hải quân (Motor Whaleboats dài 8.4 m) treo trên cần davit trong hốc mạn tàu
    const boatShape = extrudeTop(
      [
        [-4.2, 0],
        [-3.6, 0.98],
        [-1.8, 1.32],
        [1.5, 1.32],
        [3.3, 0.88],
        [4.3, 0],
        [3.3, -0.88],
        [1.5, -1.32],
        [-1.8, -1.32],
        [-3.6, -0.98],
      ],
      1.2,
      0.08,
    );
    for (const bx of [-48, -16, 50]) {
      boatHullParts.push(xform(boatShape, [bx, 12.35, sgn * 14.65], [0, 0, 0], 1, 0.35));
      for (const dx of [-2.5, 2.5]) {
        superGrayParts.push(
          pipe(
            [
              [bx + dx, 12.1, sgn * 13.7],
              [bx + dx, 14.7, sgn * 14.85],
              [bx + dx, 15.0, sgn * 14.4],
            ],
            0.13,
            10,
          ),
        );
      }
    }

    // Phao bè cứu sinh bầu dục (Carley life-rafts) gắn dọc thành hangar
    const raftRing = new THREE.TorusGeometry(0.95, 0.24, 8, 18);
    for (const rx of [-81, -77, -33, -29, 14, 18, 72.5, 75.8]) {
      raftParts.push(xform(raftRing, [rx, 14.4, sgn * 15.02], [0, Math.PI / 2, 0], [1.35, 0.85, 1]));
    }
  }

  // Công-xôn vòm thép lớn bên mạn phải (+Z) đỡ khối nặng Đảo chỉ huy (x = +12..+46 m)
  const islandSponsonProfile: P2[] = [
    [13.8, 11.4],
    [14.7, 11.4],
    [17.3, 16.9],
    [17.3, 18.15],
    [13.8, 18.15],
  ];
  const islandSponsonRib = extrude(islandSponsonProfile, 0.78, 0.04);
  for (let sx = 13.5; sx <= 45.5; sx += 4.0) {
    superGrayParts.push(xform(islandSponsonRib, [sx, 0, 0], [0, -Math.PI / 2, 0], 1, 0.15));
  }
  superGrayParts.push(xform(rbox(34.2, 1.5, 3.6, 0.1), [29.0, 17.45, 15.45], [0, 0, 0], 1, 0.12));

  // Thiết bị boong mũi (Forecastle details: tấm chắn sóng chữ V, tời neo, 2 mỏ neo Hải quân lớn, xích neo)
  superGrayParts.push(xform(rbox(5.8, 0.88, 0.36, 0.05), [103.5, 12.35, 2.35], [0, -0.45, 0], 1, 0.3));
  superGrayParts.push(xform(rbox(5.8, 0.88, 0.36, 0.05), [103.5, 12.35, -2.35], [0, 0.45, 0], 1, 0.3));
  for (const sgn of [-1, 1]) {
    superGrayParts.push(xform(new THREE.CylinderGeometry(0.68, 0.82, 0.98, 14), [108.8, 12.6, sgn * 1.95]));
    superGrayParts.push(xform(new THREE.CylinderGeometry(0.34, 0.38, 0.72, 10), [114.0, 12.75, sgn * 2.35]));
    // Mỏ neo Hải quân thu gọn bên má mũi clipper bow
    darkRecessParts.push(xform(rbox(0.48, 2.5, 0.38, 0.06), [113.6, 8.9, sgn * 4.35], [0.25 * sgn, 0.32 * sgn, -0.22]));
    darkRecessParts.push(xform(rbox(1.42, 0.8, 0.44, 0.08), [113.3, 7.82, sgn * 4.58], [0.25 * sgn, 0.32 * sgn, -0.22]));
    darkRecessParts.push(
      pipe(
        [
          [108.8, 12.3, sgn * 1.95],
          [112.5, 12.45, sgn * 1.6],
          [115.8, 12.58, sgn * 1.2],
        ],
        0.14,
        10,
      ),
    );
  }

  return {
    superGrayGeo: merge(superGrayParts),
    darkGeo: merge(darkRecessParts),
    boatGeo: merge(boatHullParts),
    raftGeo: merge(raftParts),
  };
};

// ---------------- Hệ chân vịt 4 trục, bánh lái & vây giảm lắc dưới nước ----------------
const buildUnderwaterRunningGear = () => {
  const hullRedParts: THREE.BufferGeometry[] = [];
  const bronzeParts: THREE.BufferGeometry[] = [];

  hullRedParts.push(
    xform(
      extrude(
        [
          [-108.0, -7.8],
          [-92.0, -8.45],
          [-92.0, -2.5],
          [-111.5, -2.2],
        ],
        1.05,
        0.08,
      ),
      [0, 0, 0],
      [0, 0, 0],
      1,
      0.12,
    ),
  );
  hullRedParts.push(
    xform(
      extrude(
        [
          [-119.2, -7.4],
          [-114.2, -7.9],
          [-113.8, -2.1],
          [-118.4, -1.9],
          [-119.8, -4.5],
        ],
        0.84,
        0.1,
      ),
      [0, 0, 0],
      [0, 0, 0],
      1,
      0.15,
    ),
  );

  for (const sgn of [-1, 1]) {
    hullRedParts.push(xform(rbox(90, 0.22, 1.38, 0.04), [-1, -7.15, sgn * 11.75], [sgn * 0.62, 0, 0], 1, 0.12));
  }

  const shafts = [
    { xEnd: -107.0, xStart: -88.0, z: 7.1, yEnd: -5.6 },
    { xEnd: -107.0, xStart: -88.0, z: -7.1, yEnd: -5.6 },
    { xEnd: -113.0, xStart: -92.0, z: 3.55, yEnd: -5.9 },
    { xEnd: -113.0, xStart: -92.0, z: -3.55, yEnd: -5.9 },
  ];

  const hubGeo = lathe(
    [
      [0.05, -0.95],
      [0.46, -0.35],
      [0.52, 0.35],
      [0.36, 0.65],
    ],
    14,
  );
  const bladeGeo = rbox(0.18, 1.88, 0.74, 0.05);

  for (const sh of shafts) {
    hullRedParts.push(
      pipe(
        [
          [sh.xStart, sh.yEnd + 0.9, sh.z * 0.86],
          [sh.xEnd, sh.yEnd, sh.z],
        ],
        0.26,
        8,
      ),
    );
    hullRedParts.push(
      pipe(
        [
          [sh.xEnd + 1.2, -2.3, sh.z * 0.72],
          [sh.xEnd + 0.8, sh.yEnd, sh.z],
          [sh.xEnd + 1.2, -3.1, sh.z * 1.12],
        ],
        0.16,
        8,
      ),
    );
    bronzeParts.push(xform(hubGeo, [sh.xEnd - 0.3, sh.yEnd, sh.z]));
    for (let b = 0; b < 4; b++) {
      const a = (b * Math.PI) / 2 + 0.35;
      bronzeParts.push(
        xform(
          bladeGeo,
          [sh.xEnd - 0.32, sh.yEnd + Math.cos(a) * 1.05, sh.z + Math.sin(a) * 1.05],
          [a, 0.38 * Math.sign(sh.z), 0],
        ),
      );
    }
  }

  return {
    underwaterGearGeo: merge(hullRedParts),
    propellerBronzeGeo: merge(bronzeParts),
  };
};

// ---------------- Đảo chỉ huy thép (Island Superstructure) bên mạn phải (+Z) ----------------
// Đặt x = +12..+46 m, mặt vách thép phía trong sát sàn bay ĐÚNG TẠI z = +11.25 m (ra tới z = +17.2 m),
// cao y = 18.3..34.8 m (+ cột radar CXAM & giàn dây tín hiệu lên ~46.8 m).
const buildIslandSuperstructure = () => {
  const superParts: THREE.BufferGeometry[] = [];
  const darkParts: THREE.BufferGeometry[] = [];
  const glassParts: THREE.BufferGeometry[] = [];
  const detailParts: THREE.BufferGeometry[] = [];

  // 1) Đế Đảo chỉ huy (x = +12.0..+46.0, z = +11.25..+17.05, y = 18.3..23.3 m) — mặt trong phẳng đúng z = +11.25 m!
  const basePlan: P2[] = [
    [12.0, 11.25],
    [43.6, 11.25],
    [45.4, 11.75],
    [46.0, 12.9],
    [46.0, 15.1],
    [45.1, 16.45],
    [42.8, 17.05],
    [15.2, 17.05],
    [12.8, 16.35],
    [12.0, 15.0],
  ];
  superParts.push(xform(extrudeTop(basePlan, 5.0, 0.05), [0, HORNET_DECK_Y, 0], [0, 0, 0], 1, 0.14));

  for (const dx of [16.5, 23.0, 31.5, 39.5]) {
    darkParts.push(xform(rbox(0.95, 1.95, 0.08, 0.04), [dx, HORNET_DECK_Y + 1.1, 11.27]));
  }
  // Bậc thang thép ngoài vách đảo lên tầng cầu tàu (áp sát z = +11.30..+11.45 bên trong hốc lượn mũi/đuôi đảo)
  detailParts.push(xform(rbox(2.6, 0.14, 0.35, 0.02), [13.8, 20.9, 11.44], [0, 0, 0.72]));

  // 2) Tầng Đài chỉ huy Đô đốc Halsey (Flag Bridge: x = +30.2..+45.4, y = 23.3..26.3 m)
  const flagBridgePlan: P2[] = [
    [30.2, 11.3],
    [43.4, 11.3],
    [45.0, 11.9],
    [45.4, 13.1],
    [45.4, 15.1],
    [44.6, 16.35],
    [42.4, 16.95],
    [30.2, 16.95],
  ];
  superParts.push(xform(extrudeTop(flagBridgePlan, 3.0, 0.05), [0, 23.3, 0], [0, 0, 0], 1, 0.15));

  // 3) Tầng Buồng lái & Điều hành bay (Navigation Bridge & Pri-Fly: x = +30.8..+44.8, y = 26.3..29.4 m)
  const navBridgePlan: P2[] = [
    [30.8, 11.26],
    [42.9, 11.26],
    [44.4, 11.9],
    [44.8, 13.1],
    [44.8, 15.0],
    [44.0, 16.2],
    [42.0, 16.85],
    [30.8, 16.85],
  ];
  superParts.push(xform(extrudeTop(navBridgePlan, 3.1, 0.05), [0, 26.3, 0], [0, 0, 0], 1, 0.15));

  // 4) Tầng Đài chỉ huy lộ thiên (Open Conn: x = +32.5..+43.6, y = 29.4..31.9 m) + thành chắn mảnh đạn rỗng lòng trên nóc
  const connPlan: P2[] = [
    [32.5, 11.65],
    [42.2, 11.65],
    [43.6, 12.55],
    [43.6, 15.45],
    [42.2, 16.35],
    [32.5, 16.35],
  ];
  superParts.push(xform(extrudeTop(connPlan, 2.2, 0.05), [0, 29.4, 0], [0, 0, 0], 1, 0.16));
  // Lan can thép chắn mảnh đạn (splinter bulwark) tạo khối đài lộ thiên thật trên nóc cầu tàu
  superParts.push(xform(rbox(10.6, 0.95, 0.2, 0.03), [37.5, 32.0, 11.75], [0, 0, 0], 1, 0.25));
  superParts.push(xform(rbox(10.6, 0.95, 0.2, 0.03), [37.5, 32.0, 16.25], [0, 0, 0], 1, 0.25));
  superParts.push(xform(rbox(0.22, 0.95, 4.3, 0.03), [43.45, 32.0, 14.0], [0, 0, 0], 1, 0.25));

  // Dải cửa kính ngang nhiều tầng của Đài chỉ huy Halsey & Buồng lái + mái chắn nắng
  for (const tierY of [24.95, 27.95]) {
    const xFront = tierY < 26 ? 45.32 : 44.72;
    glassParts.push(xform(rbox(0.22, 0.86, 3.45, 0.03), [xFront, tierY, 14.1]));
    glassParts.push(xform(rbox(11.4, 0.86, 0.18, 0.03), [37.4, tierY, 11.3]));
    glassParts.push(xform(rbox(9.8, 0.86, 0.18, 0.03), [37.2, tierY, 16.84]));
    darkParts.push(xform(rbox(11.8, 0.15, 0.44, 0.02), [37.4, tierY + 0.5, 11.28]));
    darkParts.push(xform(rbox(0.46, 0.15, 3.8, 0.02), [xFront + 0.06, tierY + 0.5, 14.1]));
    for (let wx = 32.2; wx <= 42.6; wx += 1.3) {
      darkParts.push(xform(rbox(0.12, 0.92, 0.24, 0.01), [wx, tierY, 11.29]));
    }
  }

  // Cầu tín hiệu (Signal Bridge), hộp cờ hiệu & 4 đèn pha tín hiệu
  superParts.push(xform(rbox(7.2, 1.15, 0.32, 0.04), [29.8, 26.85, 11.36], [0, 0, 0], 1, 0.2));
  superParts.push(xform(rbox(7.2, 1.15, 0.32, 0.04), [29.8, 26.85, 17.08], [0, 0, 0], 1, 0.2));
  detailParts.push(xform(rbox(3.4, 0.95, 0.55, 0.04), [29.5, 26.8, 11.68]));
  for (const sz of [11.65, 16.85]) {
    darkParts.push(xform(new THREE.CylinderGeometry(0.46, 0.46, 0.64, 14), [31.2, 28.05, sz], [0, 0, Math.PI / 2]));
    detailParts.push(xform(new THREE.CylinderGeometry(0.14, 0.2, 0.9, 10), [31.2, 27.4, sz]));
    // Cặp đèn pha lớn 36-inch bên sườn sau ống khói
    darkParts.push(xform(new THREE.CylinderGeometry(0.55, 0.52, 0.72, 14), [17.4, 32.6, sz], [0, 0, Math.PI / 2]));
    superParts.push(xform(new THREE.CylinderGeometry(0.85, 0.4, 0.45, 12), [17.4, 31.8, sz]));
  }

  // 5) Ống khói lớn khí động học tích hợp liền khối ngay sau đài chỉ huy (x = +17.5..+31.2, y = 23.3..34.8 m)
  // Chia 2 tầng thuôn nhẹ lên trên + chóp vát nghiêng về sau đúng biên dạng lớp Yorktown!
  const funnelLowerPlan: P2[] = [
    [17.4, 12.15],
    [19.2, 11.55],
    [29.8, 11.55],
    [31.2, 12.35],
    [31.2, 15.85],
    [29.8, 16.65],
    [19.2, 16.65],
    [17.4, 16.05],
  ];
  const funnelUpperPlan: P2[] = [
    [17.7, 12.32],
    [19.4, 11.72],
    [29.5, 11.72],
    [30.9, 12.48],
    [30.9, 15.72],
    [29.5, 16.48],
    [19.4, 16.48],
    [17.7, 15.88],
  ];
  superParts.push(xform(extrudeTop(funnelLowerPlan, 6.2, 0.08), [0, 23.3, 0], [0, 0, 0], 1, 0.13));
  superParts.push(xform(extrudeTop(funnelUpperPlan, 4.15, 0.07), [0, 29.45, 0], [0, 0, 0], 1, 0.13));

  // Chóp ống khói sơn đen chống ám khói hơi vát nhẹ về phía đuôi (y = 33.5..34.85 m)
  darkParts.push(xform(extrudeTop(funnelUpperPlan, 1.32, 0.06), [0, 33.52, 0], [0, 0, -0.032], 1, 0.15));
  darkParts.push(xform(rbox(11.2, 0.26, 3.6, 0.05), [24.3, 34.72, 14.1], [0, 0, -0.032]));
  for (let gx = 19.6; gx <= 29.0; gx += 2.35) {
    detailParts.push(xform(rbox(0.14, 0.34, 3.9, 0.02), [gx, 34.76, 14.1]));
  }
  // Cửa chớp thông gió sườn ống khói & đường ống xả hơi nước
  for (const bandY of [26.7, 29.48, 33.42]) {
    detailParts.push(xform(rbox(13.6, 0.18, 5.05, 0.04), [24.3, bandY, 14.1]));
  }
  for (let lx = 20.2; lx <= 28.6; lx += 1.4) {
    darkParts.push(xform(rbox(0.85, 0.65, 0.12, 0.02), [lx, 25.2, 11.54]));
    darkParts.push(xform(rbox(0.85, 0.65, 0.12, 0.02), [lx, 25.2, 16.66]));
  }
  detailParts.push(
    pipe(
      [
        [17.35, 23.5, 13.5],
        [17.55, 34.2, 13.5],
      ],
      0.16,
      8,
    ),
  );
  detailParts.push(
    pipe(
      [
        [17.35, 23.5, 14.7],
        [17.55, 34.2, 14.7],
      ],
      0.13,
      8,
    ),
  );

  // 6) Khối tháp sau ống khói & 2 Máy chỉ huy hoả lực pháo 5-inch Mk 37 (trước & sau ống khói)
  const aftIslandPlan: P2[] = [
    [12.4, 11.8],
    [17.6, 11.8],
    [17.6, 16.4],
    [12.4, 16.4],
  ];
  superParts.push(xform(extrudeTop(aftIslandPlan, 6.2, 0.05), [0, 23.3, 0], [0, 0, 0], 1, 0.15));

  for (const dir of [
    { x: 39.8, y: 31.7 },
    { x: 14.8, y: 29.5 },
  ]) {
    superParts.push(xform(new THREE.CylinderGeometry(1.45, 1.6, 1.0, 16), [dir.x, dir.y + 0.5, 14.1]));
    superParts.push(xform(rbox(2.38, 1.58, 2.22, 0.16), [dir.x, dir.y + 1.68, 14.1], [0, 0, 0], 1, 0.25));
    detailParts.push(xform(new THREE.CylinderGeometry(0.24, 0.24, 4.15, 12), [dir.x + 0.2, dir.y + 1.92, 14.1], [Math.PI / 2, 0, 0]));
    darkParts.push(xform(rbox(0.45, 0.88, 1.88, 0.04), [dir.x + 0.35, dir.y + 2.84, 14.1]));
  }

  // 7) Cột ăng-ten kiềng 3 chân (Tripod Foremast), Radar cảnh giới CXAM-1, Cột sau & Giàn dây tín hiệu
  detailParts.push(
    pipe(
      [
        [32.0, 31.2, 14.1],
        [31.65, 46.8, 14.1],
      ],
      0.34,
      10,
    ),
  );
  detailParts.push(
    pipe(
      [
        [30.2, 31.0, 12.35],
        [31.85, 39.8, 14.1],
      ],
      0.2,
      8,
    ),
  );
  detailParts.push(
    pipe(
      [
        [30.2, 31.0, 15.85],
        [31.85, 39.8, 14.1],
      ],
      0.2,
      8,
    ),
  );

  // Sàn thao tác & Ăng-ten Radar CXAM-1 dạng khung nệm chữ nhật
  superParts.push(xform(new THREE.CylinderGeometry(1.5, 1.1, 0.35, 14), [32.1, 40.2, 14.1]));
  darkParts.push(xform(rbox(0.32, 2.38, 4.4, 0.04), [32.65, 41.68, 14.1]));
  detailParts.push(xform(rbox(0.5, 0.16, 4.5, 0.02), [32.65, 40.55, 14.1]));
  detailParts.push(xform(rbox(0.5, 0.16, 4.5, 0.02), [32.65, 42.8, 14.1]));
  for (let rz = 12.1; rz <= 16.1; rz += 0.66) {
    detailParts.push(xform(rbox(0.46, 2.28, 0.1, 0.01), [32.65, 41.68, rz]));
  }

  // Cột ăng-ten sau ống khói (Aft Mainmast) + Thanh gaff treo cờ Hải quân Mỹ
  detailParts.push(
    pipe(
      [
        [16.8, 29.5, 14.1],
        [16.3, 44.6, 14.1],
      ],
      0.26,
      10,
    ),
  );
  detailParts.push(
    pipe(
      [
        [16.55, 36.2, 14.1],
        [12.1, 39.6, 14.1],
      ],
      0.11,
      8,
    ),
  );

  // Xà ngang treo cờ tín hiệu (Signal Yardarms) & giàn dây tín hiệu
  detailParts.push(xform(new THREE.CylinderGeometry(0.11, 0.14, 8.6, 10), [31.8, 39.2, 14.1], [Math.PI / 2, 0, 0]));
  detailParts.push(xform(new THREE.CylinderGeometry(0.08, 0.11, 5.6, 8), [31.72, 44.5, 14.1], [Math.PI / 2, 0, 0]));
  detailParts.push(xform(new THREE.CylinderGeometry(0.1, 0.12, 6.8, 10), [16.45, 38.8, 14.1], [Math.PI / 2, 0, 0]));

  for (const hz of [11.6, 12.6, 15.6, 16.6]) {
    darkParts.push(
      pipe(
        [
          [31.8, 39.2, hz],
          [29.6, 27.1, clamp(hz, 11.55, 16.75)],
        ],
        0.035,
        6,
      ),
    );
  }
  for (const wz of [12.3, 14.1, 15.9]) {
    darkParts.push(
      pipe(
        [
          [31.75, 44.3, wz * 0.6 + 14.1 * 0.4],
          [24.1, 43.3, wz * 0.6 + 14.1 * 0.4],
          [16.35, 43.8, wz * 0.6 + 14.1 * 0.4],
        ],
        0.035,
        10,
      ),
    );
  }

  // 8) Cụm loa phóng thanh boong tàu (5MC Bullhorns: "Army pilots! Man your planes!")
  // Gắn dọc mặt trong đảo chỉ huy tại y = 23.75 m, miệng loa nằm ở z = +11.26..+11.98 m (không nhô quá vách z = +11.25 m!)
  const hornCone = lathe(
    [
      [0.13, 0.0],
      [0.17, 0.22],
      [0.48, 0.7],
      [0.52, 0.74],
      [0.44, 0.74],
      [0.15, 0.24],
    ],
    14,
  );
  for (const lx of [19.2, 27.5, 35.5, 41.8]) {
    detailParts.push(xform(hornCone, [lx - 0.35, 23.85, 11.98], [0, Math.PI / 2 - 0.18, -0.28]));
    detailParts.push(xform(hornCone, [lx + 0.35, 23.85, 11.98], [0, Math.PI / 2 + 0.18, -0.28]));
    darkParts.push(xform(rbox(0.85, 0.38, 0.28, 0.03), [lx, 23.8, 11.95]));
  }

  const raftRing = new THREE.TorusGeometry(0.85, 0.2, 8, 16);
  for (const rx of [18.5, 22.2, 25.8]) {
    detailParts.push(xform(raftRing, [rx, 21.0, 17.16], [0, Math.PI / 2, 0], [1.3, 0.85, 1]));
  }

  return {
    islandSuperGeo: merge(superParts),
    islandDarkGeo: merge(darkParts),
    islandGlassGeo: merge(glassParts),
    islandDetailGeo: merge(detailParts),
  };
};

// ---------------- Hành lang súng phòng không (Catwalks), ụ công-xôn & Pháo 5-inch / 1.1-inch / 20mm Oerlikon ----------------
type GunPlacement = { pos: [number, number, number]; baseYaw: number };

const buildSponsonsAndCatwalks = () => {
  const parts: THREE.BufferGeometry[] = [];
  const fiveInchMounts: GunPlacement[] = [];
  const quad11Mounts: GunPlacement[] = [];
  const oerlikonMounts: GunPlacement[] = [];

  // 1) 8 ụ pháo 5-inch/38 cal ở 4 góc sàn bay (mặt sàn ụ y = 16.05 m, thành chắn y = 17.2 m < 18.3 m)
  const cornerGroups = [
    { xs: [74.5, 83.5], sgn: 1 },
    { xs: [74.5, 83.5], sgn: -1 },
    { xs: [-85.5, -76.5], sgn: 1 },
    { xs: [-85.5, -76.5], sgn: -1 },
  ];
  for (const cg of cornerGroups) {
    for (const gx of cg.xs) {
      const hw = deckHalfWidth(gx);
      const gz = cg.sgn * (hw + 0.65);
      parts.push(xform(new THREE.CylinderGeometry(2.65, 1.55, 1.85, 16), [gx, 15.15, gz], [0, 0, 0], 1, 0.2));
      parts.push(xform(new THREE.CylinderGeometry(2.75, 2.75, 1.05, 16, 1, true), [gx, 16.58, gz], [0, 0, 0], 1, 0.2));
      parts.push(xform(rbox(0.55, 3.2, 3.6, 0.05), [gx, 13.9, cg.sgn * (hw - 1.2)], [cg.sgn * 0.58, 0, 0], 1, 0.2));

      fiveInchMounts.push({
        pos: [gx, 16.08, gz],
        baseYaw: cg.sgn > 0 ? -Math.PI / 2 : Math.PI / 2,
      });
    }
    // Hòm đạn trực chiến giữa hai khẩu pháo 5-inch
    const midX = (cg.xs[0] + cg.xs[1]) / 2;
    const midHw = deckHalfWidth(midX);
    parts.push(xform(rbox(2.4, 1.25, 1.35, 0.05), [midX, 16.55, cg.sgn * (midHw + 0.5)], [0, 0, 0], 1, 0.3));
  }

  // 2) 4 khẩu đội pháo phòng không 4 nòng 1.1-inch ("Chicago Piano")
  const quadSpots: { pos: [number, number, number]; yaw: number; tubR: number }[] = [
    { pos: [49.2, 18.45, 14.35], yaw: -Math.PI * 0.35, tubR: 2.35 },
    { pos: [8.8, 18.45, 14.35], yaw: -Math.PI * 0.65, tubR: 2.35 },
    { pos: [121.0, 13.35, 0.0], yaw: 0, tubR: 2.25 },
    { pos: [-121.2, 11.55, 0.0], yaw: Math.PI, tubR: 2.35 },
  ];
  for (const qs of quadSpots) {
    parts.push(xform(new THREE.CylinderGeometry(qs.tubR, qs.tubR * 0.78, 1.35, 16), [qs.pos[0], qs.pos[1] - 0.65, qs.pos[2]], [0, 0, 0], 1, 0.2));
    parts.push(xform(new THREE.CylinderGeometry(qs.tubR + 0.08, qs.tubR + 0.08, 1.05, 16, 1, true), [qs.pos[0], qs.pos[1] + 0.52, qs.pos[2]], [0, 0, 0], 1, 0.2));
    quad11Mounts.push({ pos: qs.pos, baseYaw: qs.yaw });
  }

  // 3) Hành lang thép chạy dọc hai bên mép sàn đáp (Deck-edge Catwalks & 20mm Oerlikon Gun Tubs)
  const portCatwalkSpans: [number, number][] = [
    [-70, 68],
    [89, 112],
    [-112, -91],
  ];
  const stbdCatwalkSpans: [number, number][] = [
    [-70, 8],
    [52, 68],
    [89, 112],
    [-112, -91],
  ];

  const addCatwalkSide = (spans: [number, number][], sgn: number) => {
    for (const [xa, xb] of spans) {
      const steps = Math.max(1, Math.round((xb - xa) / 12));
      const dx = (xb - xa) / steps;
      for (let s = 0; s < steps; s++) {
        const cx = xa + (s + 0.5) * dx;
        const hw = deckHalfWidth(cx);
        const cz = sgn * (hw + 0.72);
        parts.push(xform(rbox(dx - 0.15, 0.24, 1.45, 0.03), [cx, 16.55, cz], [0, 0, 0], 1, 0.25));
        parts.push(xform(rbox(dx - 0.15, 1.05, 0.16, 0.02), [cx, 17.12, cz + sgn * 0.68], [0, 0, 0], 1, 0.25));

        const tz = cz + sgn * 0.52;
        parts.push(xform(new THREE.CylinderGeometry(1.18, 0.85, 1.25, 12), [cx, 16.95, tz], [0, 0, 0], 1, 0.25));
        oerlikonMounts.push({
          pos: [cx, 16.68, tz],
          baseYaw: sgn > 0 ? -Math.PI / 2 : Math.PI / 2,
        });
      }
    }
  };

  addCatwalkSide(portCatwalkSpans, -1);
  addCatwalkSide(stbdCatwalkSpans, 1);

  return {
    sponsonGeo: merge(parts),
    fiveInchMounts,
    quad11Mounts,
    oerlikonMounts,
  };
};

// ---------------- Geometry dùng chung cho từng khẩu đội pháo (xoay theo aaYaw) ----------------
const buildGunUnitGeometries = () => {
  // 1) Pháo 5-inch/38 cal Mk 12 (bệ xoay mở của tàu sân bay lớp Yorktown + khiên chắn mảnh đạn & khoá nòng)
  const fiveBody = merge([
    xform(new THREE.CylinderGeometry(1.25, 1.38, 0.45, 14), [0, 0.22, 0]),
    xform(rbox(1.55, 1.25, 1.65, 0.1), [-0.25, 0.88, 0], [0, 0, 0], 1, 0.35),
    xform(rbox(0.24, 1.15, 1.85, 0.04), [0.58, 0.95, 0], [0, 0, -0.22], 1, 0.35),
    xform(rbox(0.85, 0.88, 0.48, 0.06), [0.22, 1.0, 0.72], [0, 0, 0], 1, 0.35),
  ]);
  const fiveBarrelRaw = lathe(
    [
      [0.25, -0.35],
      [0.24, 1.15],
      [0.16, 3.2],
      [0.125, 5.45],
      [0.145, 5.65],
      [0.09, 5.66],
    ],
    14,
  );
  const fiveBarrel = xform(fiveBarrelRaw, [0.42, 1.16, 0], [0, 0, 0.32]);

  // 2) Pháo phòng không 4 nòng 1.1-inch ("Chicago Piano")
  const quadBody = merge([
    xform(new THREE.CylinderGeometry(0.85, 1.05, 0.65, 12), [0, 0.32, 0]),
    xform(rbox(1.15, 0.85, 1.35, 0.08), [-0.1, 0.9, 0], [0, 0, 0], 1, 0.4),
  ]);
  const barrel11 = lathe(
    [
      [0.09, 0.0],
      [0.085, 0.95],
      [0.048, 2.25],
      [0.065, 2.38],
    ],
    10,
  );
  const quadBarrels = merge(
    [-0.36, -0.12, 0.12, 0.36].map((bz) => xform(barrel11, [0.25, 1.02, bz], [0, 0, 0.52])),
  );

  // 3) Pháo phòng không 20mm Oerlikon
  const oerlikonGeo = merge([
    xform(new THREE.CylinderGeometry(0.16, 0.32, 0.88, 10), [0, 0.44, 0]),
    xform(rbox(0.1, 0.72, 0.78, 0.03), [0.18, 0.92, 0], [0, 0, -0.35]),
    xform(
      lathe(
        [
          [0.055, -0.25],
          [0.05, 0.35],
          [0.028, 1.45],
          [0.04, 1.55],
        ],
        8,
      ),
      [0.05, 0.96, 0],
      [0, 0, 0.58],
    ),
  ]);

  return { fiveBody, fiveBarrel, quadBody, quadBarrels, oerlikonGeo };
};

// ---------------- Chi tiết mặt sàn đáp: Viền 3 thang nâng, cáp hãm đà & vạch chuẩn sàn tàu ----------------
const buildDeckSurfaceDetails = () => {
  const darkMetalParts: THREE.BufferGeometry[] = [];
  const cableParts: THREE.BufferGeometry[] = [];
  const aftYellowParts: THREE.BufferGeometry[] = [];

  // Viền thép & vạch góc cảnh báo 3 thang nâng máy bay (Forward x = +58, Midships x = +4, Aft x = -54; mỗi thang 14.6 × 13.4 m)
  const addElevatorRim = (cx: number, L: number, W: number) => {
    const yRim = HORNET_DECK_Y + 0.014;
    darkMetalParts.push(xform(rbox(L + 0.32, 0.028, 0.2, 0.005), [cx, yRim, W / 2 + 0.1]));
    darkMetalParts.push(xform(rbox(L + 0.32, 0.028, 0.2, 0.005), [cx, yRim, -(W / 2 + 0.1)]));
    darkMetalParts.push(xform(rbox(0.2, 0.028, W + 0.32, 0.005), [cx - L / 2 - 0.1, yRim, 0]));
    darkMetalParts.push(xform(rbox(0.2, 0.028, W + 0.32, 0.005), [cx + L / 2 + 0.1, yRim, 0]));

    // Vạch đứt cảnh báo mép hố thang nâng (elevator boundary dashes) giúp nhận diện rõ cả 3 thang nâng lớp Yorktown
    const yDash = HORNET_DECK_Y + 0.018;
    for (let dx = -L / 2 + 1.2; dx <= L / 2 - 1.2; dx += 2.9) {
      aftYellowParts.push(xform(rbox(1.4, 0.024, 0.14, 0.003), [cx + dx, yDash, W / 2 + 0.32]));
      aftYellowParts.push(xform(rbox(1.4, 0.024, 0.14, 0.003), [cx + dx, yDash, -(W / 2 + 0.32)]));
    }
    for (let dz = -W / 2 + 1.2; dz <= W / 2 - 1.2; dz += 2.7) {
      // Tránh đè trực tiếp lên vạch trắng bánh trái Doolittle z = -3.80
      if (cx > -20 && Math.abs(dz - HORNET_STRIPE_Z) < 1.2) continue;
      aftYellowParts.push(xform(rbox(0.14, 0.024, 1.3, 0.003), [cx - L / 2 - 0.32, yDash, dz]));
      aftYellowParts.push(xform(rbox(0.14, 0.024, 1.3, 0.003), [cx + L / 2 + 0.32, yDash, dz]));
    }
  };
  addElevatorRim(58.0, 14.6, 13.4);
  addElevatorRim(4.0, 14.6, 13.4);
  addElevatorRim(-54.0, 14.6, 13.4);

  // Khe co giãn nhiệt bằng thép ngang sàn đáp
  for (const jx of [-92, -30, 32, 86]) {
    const w = deckHalfWidth(jx) * 1.94;
    darkMetalParts.push(xform(rbox(0.18, 0.024, w, 0.004), [jx, HORNET_DECK_Y + 0.011, 0]));
  }

  // 9 sợi cáp hãm đà máy bay (Arresting Gear Wires) ở phần sau sàn đáp (x = -110..-62 m)
  for (let wx = -110; wx <= -62; wx += 6) {
    const span = Math.min(12.2, deckHalfWidth(wx) - 1.8);
    cableParts.push(
      pipe(
        [
          [wx, HORNET_DECK_Y + 0.07, -span],
          [wx, HORNET_DECK_Y + 0.075, 0],
          [wx, HORNET_DECK_Y + 0.07, span],
        ],
        0.032,
        6,
      ),
    );
    darkMetalParts.push(xform(rbox(0.38, 0.09, 0.42, 0.02), [wx, HORNET_DECK_Y + 0.045, -span]));
    darkMetalParts.push(xform(rbox(0.38, 0.09, 0.42, 0.02), [wx, HORNET_DECK_Y + 0.045, span]));
  }

  // Vạch đứt tâm hạ cánh chuẩn ở nửa sau sàn tàu (z = 0, x = -107..-24 m, chừa số hiệu đuôi ở x = -115.5 m)
  for (let sx = -106; sx <= -24; sx += 7.5) {
    if (sx > -63 && sx < -45) continue;
    aftYellowParts.push(xform(rbox(4.2, 0.026, 0.24, 0.004), [sx, HORNET_DECK_Y + 0.016, 0]));
  }

  return {
    deckDarkGeo: merge(darkMetalParts),
    arrestingCableGeo: merge(cableParts),
    aftCenterlineGeo: merge(aftYellowParts),
  };
};

// ---------------- Vạch sơn cất cánh Doolittle trên 467 ft (142.3 m: x = -16.6..+125.7 m) ----------------
const buildDoolittleLaunchLines = () => {
  const fixedWhite: THREE.BufferGeometry[] = [];
  const fixedYellow: THREE.BufferGeometry[] = [];
  const elevWhite: THREE.BufferGeometry[] = [];
  const elevYellow: THREE.BufferGeometry[] = [];

  const yMark = HORNET_DECK_Y + 0.024;
  const hMark = 0.03;

  // 1) Vạch sơn trắng dẫn bánh trái B-25 tại ĐÚNG z = -3.80 m (HORNET_STRIPE_Z), rộng 0.38 m, từ x = -16.6 m tới +125.35 m
  // Lưu ý: Số hiệu mũi ('8'/'6') rộng 5.0 m đặt giữa sàn (z = -2.50..+2.50) nên hoàn toàn KHÔNG chạm vạch z = -3.80 m!
  const addWhiteSeg = (x0: number, x1: number, target: THREE.BufferGeometry[], yRef: number) => {
    const len = x1 - x0;
    target.push(xform(rbox(len, hMark, 0.38, 0.004), [(x0 + x1) / 2, yRef, HORNET_STRIPE_Z]));
  };
  addWhiteSeg(-16.6, MID_ELEV_X0 - 0.06, fixedWhite, yMark);
  addWhiteSeg(MID_ELEV_X0 + 0.08, MID_ELEV_X1 - 0.08, elevWhite, hMark * 0.5 + 0.01);
  addWhiteSeg(MID_ELEV_X1 + 0.06, 125.35, fixedWhite, yMark);

  // Vạch ngang xuất phát 467 ft (x = -16.6 m) và các vạch căn bánh dọc vạch trắng tới mút mũi (x = +124.6 m)
  fixedWhite.push(xform(rbox(0.42, hMark, 4.6, 0.004), [-16.6, yMark, -2.32]));
  for (const spotX of [18.0, 48.0, 78.0, 104.0]) {
    fixedWhite.push(xform(rbox(0.3, hMark, 1.35, 0.004), [spotX, yMark, HORNET_STRIPE_Z]));
  }
  fixedWhite.push(xform(rbox(0.42, hMark, 1.85, 0.004), [124.6, yMark, HORNET_STRIPE_Z]));

  // 2) Vạch định hướng song song cho bánh mũi B-25 tại ĐÚNG z = -0.85 m (HORNET_B25_Z), rộng 0.26 m
  // Nhường khoảng trống x = +110.2..+121.2 m quanh số hiệu sàn mũi ('8'/'6' đặt tâm ở x = +115.6, z = 0)
  const addYellowRun = (x0: number, x1: number, target: THREE.BufferGeometry[], yRef: number) => {
    for (let x = x0; x < x1 - 0.8; x += 4.6) {
      if (x > 108.5 && x < 121.0) continue;
      const segEnd = Math.min(x + 3.1, x1);
      const len = segEnd - x;
      if (len > 0.4) {
        target.push(xform(rbox(len, hMark, 0.26, 0.004), [(x + segEnd) / 2, yRef, HORNET_B25_Z]));
      }
    }
  };
  addYellowRun(-16.6, MID_ELEV_X0 - 0.1, fixedYellow, yMark);
  addYellowRun(MID_ELEV_X0 + 0.2, MID_ELEV_X1 - 0.2, elevYellow, hMark * 0.5 + 0.01);
  addYellowRun(MID_ELEV_X1 + 0.1, 124.4, fixedYellow, yMark);

  return {
    fixedWhiteGeo: merge(fixedWhite),
    fixedYellowGeo: merge(fixedYellow),
    elevWhiteGeo: merge(elevWhite),
    elevYellowGeo: merge(elevYellow),
  };
};

// ---------------- Lá cờ Hải quân tung bay theo gió bão (flagWave) ----------------
const WavingEnsign: React.FC<{ flagWave: number; material: THREE.Material }> = ({ flagWave, material }) => {
  const geo = useMemo(() => {
    const W = 3.8;
    const H = 2.0;
    const g = new THREE.PlaneGeometry(W, H, 16, 8);
    const pos = g.getAttribute('position');
    for (let i = 0; i < pos.count; i++) {
      const lx = pos.getX(i);
      const ly = pos.getY(i);
      const dist = (W / 2 - lx) / W;
      const phase = dist * 7.2 - flagWave * 4.5;
      const flutter = Math.pow(dist, 1.25) * (0.34 * Math.sin(phase) + 0.12 * Math.cos(phase * 1.9 + ly * 1.4));
      const sag = -0.18 * dist - 0.08 * dist * dist;
      pos.setXYZ(i, lx - W / 2, ly + sag, flutter);
    }
    const uv = g.getAttribute('uv');
    for (let i = 0; i < uv.count; i++) {
      uv.setX(i, 1 - uv.getX(i));
    }
    pos.needsUpdate = true;
    uv.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }, [flagWave]);

  return <mesh geometry={geo} material={material} position={[12.25, 39.35, 14.1]} castShadow />;
};

// ---------------- Cache cấp module cho toàn bộ hình học tĩnh của USS Hornet ----------------
type StaticShipBundle = ReturnType<typeof createStaticShipBundle>;
let cachedBundle: StaticShipBundle | null = null;

const createStaticShipBundle = () => {
  const hull = buildYorktownHull();
  const frames = buildPiercedSupportFrames();
  const hangar = buildHangarAndHullSuper();
  const runningGear = buildUnderwaterRunningGear();
  const deckThickness = 0.24;
  const flightDeckGeo = buildFlightDeckWithElevatorHole(deckThickness);

  const underDeckSteelGeo = buildFlightDeckWithElevatorHole(0.42);
  scaleUV(underDeckSteelGeo, 0.18);

  const midElevWood = rbox(14.48, 0.22, 13.28, 0.01);
  midElevWood.translate(0, -0.11, 0);
  const ePos = midElevWood.getAttribute('position');
  const eUv = midElevWood.getAttribute('uv');
  for (let i = 0; i < ePos.count; i++) {
    eUv.setXY(i, (ePos.getX(i) + 4.0) / 16, ePos.getZ(i) / 8);
  }
  eUv.needsUpdate = true;

  const midElevSteelParts: THREE.BufferGeometry[] = [
    xform(rbox(14.52, 0.36, 13.32, 0.02), [0, -0.39, 0], [0, 0, 0], 1, 0.2),
  ];
  for (let rx = -6; rx <= 6; rx += 3) {
    midElevSteelParts.push(xform(rbox(0.28, 0.55, 13.1, 0.02), [rx, -0.75, 0], [0, 0, 0], 1, 0.25));
  }
  const midElevSteelGeo = merge(midElevSteelParts);

  const island = buildIslandSuperstructure();
  const sponsons = buildSponsonsAndCatwalks();
  const guns = buildGunUnitGeometries();
  const deckDetails = buildDeckSurfaceDetails();
  const launchLines = buildDoolittleLaunchLines();

  // Số hiệu sàn đáp (rộng 5.0 m, dài 8.8 m) căn giữa trục z = 0 ở cả đầu mũi và cuối đuôi sàn đáp
  const deckDigits: Record<'8' | '6', THREE.BufferGeometry> = {
    '8': buildNavalDigit2D('8', 5.0, 8.8, 0.032),
    '6': buildNavalDigit2D('6', 5.0, 8.8, 0.032),
  };
  const islandDigits: Record<'8' | '6', THREE.BufferGeometry> = {
    '8': buildNavalDigit2D('8', 1.68, 2.8, 0.04),
    '6': buildNavalDigit2D('6', 1.68, 2.8, 0.04),
  };

  return {
    hull,
    frames,
    hangar,
    runningGear,
    deckThickness,
    flightDeckGeo,
    underDeckSteelGeo,
    midElevWood,
    midElevSteelGeo,
    island,
    sponsons,
    guns,
    deckDetails,
    launchLines,
    deckDigits,
    islandDigits,
  };
};

const getShipBundle = (): StaticShipBundle => {
  if (!cachedBundle) cachedBundle = createStaticShipBundle();
  return cachedBundle;
};

// ================ Component chính: USSHornet (CV-8 / CV-6 lớp Yorktown) ================
export const USSHornet: React.FC<USSHornetProps> = ({
  hullNumber = '8',
  showLaunchLines = true,
  flagWave = 0,
  aaYaw = 0,
  elevatorDown = 0,
}) => {
  const b = useMemo(() => getShipBundle(), []);

  const mats = useMemo(() => {
    // Thân tàu chính: đúng chữ ký paint({ color: PAINT.navyHull, camo: [...PAINT.navyHullCamo], repeat: 0.35, wear: 0.25, dirt: 0.3 })
    const hullMat = paint({
      color: PAINT.navyHull,
      camo: [...PAINT.navyHullCamo],
      repeat: 0.35,
      wear: 0.25,
      dirt: 0.3,
      roughness: 0.6,
      metalness: 0.35,
      seed: 8,
    });
    const antiFoulingMat = paint({
      color: PAINT.antiFoulingRed,
      camo: ['#5c201d', '#7d302b'],
      repeat: 0.35,
      wear: 0.18,
      dirt: 0.34,
      roughness: 0.68,
      metalness: 0.2,
      seed: 18,
    });
    // Đảo chỉ huy & thượng tầng hangar / khung chữ A mũi (Measure 12 Modified Ocean Gray — PAINT.navySuper)
    const islandMat = paint({
      color: PAINT.navySuper,
      camo: [PAINT.navyHull, '#6d8094'],
      repeat: 0.38,
      wear: 0.22,
      dirt: 0.22,
      roughness: 0.56,
      metalness: 0.38,
      seed: 28,
    });
    const hangarSuperMat = paint({
      color: '#4e6073',
      camo: [PAINT.navyHull, PAINT.navySuper],
      repeat: 0.36,
      wear: 0.24,
      dirt: 0.26,
      roughness: 0.6,
      metalness: 0.35,
      seed: 33,
    });
    const forecastleMat = paint({
      color: '#34414e',
      camo: ['#2b3642', '#425161'],
      repeat: 0.38,
      wear: 0.26,
      dirt: 0.3,
      roughness: 0.74,
      metalness: 0.24,
      seed: 38,
    });
    const deckWoodMat = getDeckWoodMaterial();
    const bootBlackMat = plain('#181d23', 0.84, 0.12);
    const darkSteelMat = plain('#1f262e', 0.72, 0.38);
    const detailSteelMat = plain('#54667a', 0.5, 0.45);
    const gunBarrelMat = plain('#2a333d', 0.44, 0.62);
    const glassMat = plain(PAINT.cockpitGlass, 0.16, 0.68);
    const boatMat = plain('#8594a3', 0.66, 0.15);
    const raftMat = plain('#97a2ab', 0.76, 0.08);
    const bronzeMat = plain('#8e7037', 0.38, 0.78);
    const stripeWhiteMat = plain(PAINT.deckStripeWhite, 0.72, 0.05, {
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const stripeYellowMat = plain(PAINT.deckStripeYellow, 0.72, 0.05, {
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const elevBoundMat = plain('#b6953e', 0.78, 0.05, {
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
    const flagMat = getUSFlagMaterial();

    return {
      hullMat,
      antiFoulingMat,
      islandMat,
      hangarSuperMat,
      forecastleMat,
      deckWoodMat,
      bootBlackMat,
      darkSteelMat,
      detailSteelMat,
      gunBarrelMat,
      glassMat,
      boatMat,
      raftMat,
      bronzeMat,
      stripeWhiteMat,
      stripeYellowMat,
      elevBoundMat,
      flagMat,
    };
  }, []);

  const elevDrop = clamp(elevatorDown, 0, 1) * 6.35;
  const deckNumGeo = b.deckDigits[hullNumber];
  const islandNumGeo = b.islandDigits[hullNumber];

  return (
    <group>
      {/* 1. Thân tàu lớp Yorktown (Đáy đỏ chống hà y=-8.5..-0.45, Đai mớn nước y=-0.45..+0.48, Thân trên Measure 12/21) */}
      <mesh geometry={b.hull.lowerRed} material={mats.antiFoulingMat} castShadow receiveShadow />
      <mesh geometry={b.hull.bootBelt} material={mats.bootBlackMat} receiveShadow />
      <mesh geometry={b.hull.upperNavy} material={mats.hullMat} castShadow receiveShadow />
      <mesh geometry={b.hull.forecastleDeck} material={mats.forecastleMat} receiveShadow />

      {/* Bánh lái, vây chống lắc & 4 trục chân vịt đồng */}
      <mesh geometry={b.runningGear.underwaterGearGeo} material={mats.antiFoulingMat} />
      <mesh geometry={b.runningGear.propellerBronzeGeo} material={mats.bronzeMat} />

      {/* 2. Khung dầm thép chữ A đục rỗng đỡ mũi/đuôi sàn bay + Khoang Hangar mở cửa cuốn, công-xôn & xuồng cứu sinh */}
      <mesh geometry={b.frames} material={mats.hangarSuperMat} castShadow receiveShadow />
      <mesh geometry={b.hangar.superGrayGeo} material={mats.hangarSuperMat} castShadow receiveShadow />
      <mesh geometry={b.hangar.darkGeo} material={mats.darkSteelMat} receiveShadow />
      <mesh geometry={b.hangar.boatGeo} material={mats.boatMat} castShadow receiveShadow />
      <mesh geometry={b.hangar.raftGeo} material={mats.raftMat} castShadow />

      {/* 3. Kết cấu sàn đáp (Flight Deck: mặt trên gỗ sơn xanh-xám Hải quân ĐÚNG TẠI y = +18.30 m = HORNET_DECK_Y) */}
      <mesh
        geometry={b.underDeckSteelGeo}
        material={mats.hangarSuperMat}
        position={[0, HORNET_DECK_Y - b.deckThickness - 0.42, 0]}
        castShadow
        receiveShadow
      />
      <mesh
        geometry={b.flightDeckGeo}
        material={mats.deckWoodMat}
        position={[0, HORNET_DECK_Y - b.deckThickness, 0]}
        castShadow
        receiveShadow
      />

      {/* Viền 3 thang nâng, khe co giãn, 9 cáp hãm đà & vạch chuẩn sàn tàu */}
      <mesh geometry={b.deckDetails.deckDarkGeo} material={mats.darkSteelMat} receiveShadow />
      <mesh geometry={b.deckDetails.arrestingCableGeo} material={mats.detailSteelMat} />
      <mesh geometry={b.deckDetails.aftCenterlineGeo} material={mats.elevBoundMat} receiveShadow />

      {/* 4. Thang nâng máy bay giữa tàu (Midships Elevator: x = +4.0 m, hạ xuống hangar theo elevatorDown 0..1) */}
      <group position={[4.0, HORNET_DECK_Y - elevDrop, 0]}>
        <mesh geometry={b.midElevWood} material={mats.deckWoodMat} castShadow receiveShadow />
        <mesh geometry={b.midElevSteelGeo} material={mats.hangarSuperMat} castShadow receiveShadow />
        {showLaunchLines && (
          <>
            <mesh geometry={b.launchLines.elevWhiteGeo} material={mats.stripeWhiteMat} receiveShadow />
            <mesh geometry={b.launchLines.elevYellowGeo} material={mats.stripeYellowMat} receiveShadow />
          </>
        )}
      </group>

      {/* 5. Vạch sơn cất cánh Doolittle 467 ft (x = -16.6..+125.7 m: vạch trắng bánh trái z = -3.80, vạch bánh mũi z = -0.85) */}
      {showLaunchLines && (
        <>
          <mesh geometry={b.launchLines.fixedWhiteGeo} material={mats.stripeWhiteMat} receiveShadow />
          <mesh geometry={b.launchLines.fixedYellowGeo} material={mats.stripeYellowMat} receiveShadow />
        </>
      )}

      {/* Số hiệu sàn tàu ('8' cho USS Hornet CV-8 hoặc '6' cho USS Enterprise CV-6) căn giữa ở đầu mũi & cuối đuôi sàn */}
      <mesh
        geometry={deckNumGeo}
        material={mats.stripeWhiteMat}
        position={[-115.5, HORNET_DECK_Y + 0.024, 0]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
        receiveShadow
      />
      <mesh
        geometry={deckNumGeo}
        material={mats.stripeWhiteMat}
        position={[115.6, HORNET_DECK_Y + 0.024, 0]}
        rotation={[-Math.PI / 2, 0, Math.PI / 2]}
        receiveShadow
      />

      {/* 6. Đảo chỉ huy thép (Island Superstructure) bên mạn phải (+Z: x = +12..+46 m, vách trong đúng z = +11.25 m) */}
      <mesh geometry={b.island.islandSuperGeo} material={mats.islandMat} castShadow receiveShadow />
      <mesh geometry={b.island.islandDarkGeo} material={mats.darkSteelMat} castShadow receiveShadow />
      <mesh geometry={b.island.islandGlassGeo} material={mats.glassMat} />
      <mesh geometry={b.island.islandDetailGeo} material={mats.detailSteelMat} castShadow />

      {/* Số hiệu Hải quân màu trắng sơn hai bên sườn tầng trên ống khói Đảo chỉ huy */}
      <mesh
        geometry={islandNumGeo}
        material={mats.stripeWhiteMat}
        position={[24.5, 31.45, 11.63]}
        rotation={[0, Math.PI, 0]}
      />
      <mesh
        geometry={islandNumGeo}
        material={mats.stripeWhiteMat}
        position={[24.5, 31.45, 16.57]}
        rotation={[0, 0, 0]}
      />

      {/* Lá cờ Hải quân Mỹ 48 sao tung bay trên gaff cột sau (flagWave) */}
      <WavingEnsign flagWave={flagWave} material={mats.flagMat} />

      {/* 7. Hành lang súng phòng không (Catwalks), ụ công-xôn & hệ pháo 5-inch / 1.1-inch / 20mm xoay theo aaYaw */}
      <mesh geometry={b.sponsons.sponsonGeo} material={mats.hangarSuperMat} castShadow receiveShadow />

      {b.sponsons.fiveInchMounts.map((m, idx) => (
        <group key={`g5-${idx}`} position={m.pos} rotation={[0, m.baseYaw + aaYaw, 0]}>
          <mesh geometry={b.guns.fiveBody} material={mats.islandMat} castShadow receiveShadow />
          <mesh geometry={b.guns.fiveBarrel} material={mats.gunBarrelMat} castShadow />
        </group>
      ))}

      {b.sponsons.quad11Mounts.map((m, idx) => (
        <group key={`q11-${idx}`} position={m.pos} rotation={[0, m.baseYaw + aaYaw, 0]}>
          <mesh geometry={b.guns.quadBody} material={mats.islandMat} castShadow />
          <mesh geometry={b.guns.quadBarrels} material={mats.gunBarrelMat} castShadow />
        </group>
      ))}

      {b.sponsons.oerlikonMounts.map((m, idx) => (
        <group key={`aa20-${idx}`} position={m.pos} rotation={[0, m.baseYaw + aaYaw, 0]}>
          <mesh geometry={b.guns.oerlikonGeo} material={mats.gunBarrelMat} castShadow />
        </group>
      ))}
    </group>
  );
};

export const preview = turntable(() => <USSHornet hullNumber="8" showLaunchLines />, { size: 252, center: [0, 14, 0] });
