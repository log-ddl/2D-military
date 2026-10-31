// Công cụ dựng hình: đùn biên dạng 2D, tiện tròn, khối vát cạnh, ống theo đường. Có cache theo tham số.
// Quy ước khi dựng mô hình: lấy kích thước thật (mét) làm đơn vị, mũi phương tiện hướng +X, trên là +Y.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const cache = new Map<string, THREE.BufferGeometry>();
const memo = (key: string, make: () => THREE.BufferGeometry) => {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
};

export type P2 = [number, number];

/**
 * Đùn một biên dạng 2D (mặt cắt nhìn ngang, trục X–Y) thành khối dày `depth` theo Z, căn giữa Z.
 * Dùng cho thân xe, tháp pháo, càng kéo… vẽ biên dạng theo ảnh nhìn ngang tỉ lệ thật. `bevel` = vát mép (m).
 */
export const extrude = (pts: P2[], depth: number, bevel = 0.04) =>
  memo(`ex${JSON.stringify(pts)}${depth}${bevel}`, () => {
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const g = new THREE.ExtrudeGeometry(sh, { depth: depth - bevel * 2, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 12 });
    g.translate(0, 0, -(depth - bevel * 2) / 2);
    g.computeVertexNormals();
    return g;
  });

/** Đùn biên dạng nhìn từ trên (trục X–Z) thành khối cao `h` theo Y, đáy ở y=0. Dùng cho mặt bằng tháp pháo, sàn. */
export const extrudeTop = (pts: P2[], h: number, bevel = 0.04) =>
  memo(`ext${JSON.stringify(pts)}${h}${bevel}`, () => {
    const g = extrude(pts, h, bevel).clone();
    g.rotateX(Math.PI / 2);
    g.translate(0, h / 2, 0);
    return g;
  });

/**
 * Tiện tròn quanh trục: `profile` là [bán kính, vị trí dọc trục] từ đầu tới cuối. Kết quả nằm dọc trục +X
 * (từ x=profile[0][1]) — đúng cho nòng pháo, đạn, ống phóng. `seg` = số cạnh tròn.
 */
export const lathe = (profile: P2[], seg = 32) =>
  memo(`la${JSON.stringify(profile)}${seg}`, () => {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.0001), y)), seg);
    g.rotateZ(-Math.PI / 2);
    return g;
  });

/** Hộp vát tròn cạnh bán kính r. */
export const rbox = (w: number, h: number, d: number, r = 0.05, seg = 2) =>
  memo(`rb${w}${h}${d}${r}${seg}`, () => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)));

/** Ống tròn chạy theo đường cong qua các điểm (dây, ống thủy lực, tay vịn). */
export const pipe = (pts: [number, number, number][], r = 0.03, seg = 48) =>
  memo(`pi${JSON.stringify(pts)}${r}${seg}`, () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p))), seg, r, 8, false));

/** Gộp nhiều geometry (đã đặt vị trí bằng applyMatrix4) thành một để vẽ nhanh. */
export const merge = (gs: THREE.BufferGeometry[]) => mergeGeometries(gs.map((g) => (g.index ? g.toNonIndexed() : g)), false)!;

/** Ma trận đặt vị trí/xoay/tỉ lệ (dùng với merge hoặc InstancedMesh). */
export const mat4 = (pos: [number, number, number], rot: [number, number, number] = [0, 0, 0], scale: number | [number, number, number] = 1) => {
  const s = typeof scale === 'number' ? [scale, scale, scale] : scale;
  return new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...s));
};
