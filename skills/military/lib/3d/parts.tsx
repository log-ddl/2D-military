// Bộ phận cơ khí & thước tỷ lệ dùng chung để dựng phương tiện: bánh xe, dải xích chạy được, đinh tán, thước đo phối cảnh 3D, người chuẩn tỷ lệ.
// Đây là linh kiện, không phải mô hình hoàn chỉnh — mỗi video tự dựng phương tiện của mình từ các linh kiện này.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { lathe, rbox } from './geom';
import { plain } from './materials';
import { FONT } from '../theme';

/** Bánh xe nằm trong mặt X–Y (trục quay Z). `spin` = góc quay (rad) — truyền quãng đường / r để bánh lăn đúng. */
export const Wheel: React.FC<{ r: number; width: number; spin?: number; tire?: string; rim?: string; bolts?: number; position?: [number, number, number] }> = ({
  r, width, spin = 0, tire = '#2b2b2b', rim = '#6b7a5a', bolts = 8, position = [0, 0, 0],
}) => {
  const tireG = useMemo(() => {
    const g = lathe([[r * 0.62, -width / 2], [r * 0.96, -width / 2], [r, -width * 0.35], [r, width * 0.35], [r * 0.96, width / 2], [r * 0.62, width / 2]], 40).clone();
    g.rotateY(Math.PI / 2);
    return g;
  }, [r, width]);
  return (
    <group position={position} rotation={[0, 0, -spin]}>
      <mesh geometry={tireG} material={plain(tire, 0.92)} castShadow receiveShadow />
      <mesh rotation={[Math.PI / 2, 0, 0]} material={plain(rim, 0.55, 0.3)} castShadow>
        <cylinderGeometry args={[r * 0.64, r * 0.64, width * 0.82, 32]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, width * 0.42]} material={plain(rim, 0.5, 0.35)}>
        <cylinderGeometry args={[r * 0.24, r * 0.3, width * 0.12, 20]} />
      </mesh>
      {Array.from({ length: bolts }, (_, i) => {
        const a = (i / bolts) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * r * 0.42, Math.sin(a) * r * 0.42, width * 0.43]} rotation={[Math.PI / 2, 0, 0]} material={plain('#3a3a36', 0.4, 0.6)}>
            <cylinderGeometry args={[r * 0.04, r * 0.04, width * 0.08, 6]} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Dải xích vòng quanh bánh dẫn trước (xFront, rFront) và bánh sau (xRear, rRear), mặt dưới ở y=0.
 * `travel` = quãng đường xe đã đi (m) để mắt xích chạy. Nằm trong mặt X–Y, bề rộng `width` theo Z.
 */
export const Track: React.FC<{ xFront: number; xRear: number; rFront: number; rRear: number; width: number; travel?: number; link?: number; color?: string; position?: [number, number, number] }> = ({
  xFront, xRear, rFront, rRear, width, travel = 0, link = 0.17, color = '#3b3a36', position = [0, 0, 0],
}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  // Đường vòng: đáy phẳng y=0, đỉnh nối tiếp tuyến hai bánh.
  const path = useMemo(() => {
    const cf = new THREE.Vector2(xFront, rFront), cr = new THREE.Vector2(xRear, rRear);
    const segs: { len: number; at: (s: number) => [number, number, number] }[] = [];
    const line = (a: THREE.Vector2, b: THREE.Vector2) => {
      const len = a.distanceTo(b), ang = Math.atan2(b.y - a.y, b.x - a.x);
      segs.push({ len, at: (s) => [a.x + ((b.x - a.x) * s) / len, a.y + ((b.y - a.y) * s) / len, ang] });
    };
    const arc = (c: THREE.Vector2, r: number, a0: number, a1: number) => {
      const len = Math.abs(a1 - a0) * r, dir = Math.sign(a1 - a0);
      segs.push({ len, at: (s) => { const a = a0 + (dir * s) / r; return [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r, a + (dir * Math.PI) / 2]; } });
    };
    const topAng = Math.atan2(rFront - rRear, xFront - xRear);
    line(new THREE.Vector2(xRear, 0), new THREE.Vector2(xFront, 0));
    arc(cf, rFront, -Math.PI / 2, Math.PI / 2 + topAng);
    line(new THREE.Vector2(xFront - Math.sin(topAng) * rFront, rFront + Math.cos(topAng) * rFront), new THREE.Vector2(xRear - Math.sin(topAng) * rRear, rRear + Math.cos(topAng) * rRear));
    arc(cr, rRear, Math.PI / 2 + topAng, Math.PI * 1.5);
    const total = segs.reduce((a, s) => a + s.len, 0);
    return { segs, total };
  }, [xFront, xRear, rFront, rRear]);
  const count = Math.floor(path.total / link);
  const geo = useMemo(() => rbox(link * 0.92, 0.07, width, 0.015), [link, width]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    const step = path.total / count;
    for (let i = 0; i < count; i++) {
      let s = (((i * step - travel) % path.total) + path.total) % path.total;
      let k = 0;
      while (s > path.segs[k].len && k < path.segs.length - 1) { s -= path.segs[k].len; k++; }
      const [x, y, a] = path.segs[k].at(s);
      o.position.set(x, y, 0);
      o.rotation.set(0, 0, a);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <group position={position}>
      <instancedMesh ref={ref} args={[geo, plain(color, 0.85, 0.4), count]} castShadow receiveShadow />
    </group>
  );
};

/** Hàng đinh tán / bu lông nhỏ tại các điểm (toạ độ cục bộ). */
export const Rivets: React.FC<{ points: [number, number, number][]; r?: number; color?: string }> = ({ points, r = 0.018, color = '#5c6650' }) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    points.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); ref.current!.setMatrixAt(i, o.matrix); });
    ref.current!.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined, plain(color, 0.5, 0.5), points.length]}>
      <sphereGeometry args={[r, 6, 4]} />
    </instancedMesh>
  );
};

export type Measure3DProps = {
  /** Điểm đầu mút trái [x, y, z] trong không gian 3D. */
  from: [number, number, number];
  /** Điểm đầu mút phải [x, y, z] trong không gian 3D. */
  to: [number, number, number];
  /** Số đo ngắn gọn (vd: '16.26 m / 53.3 ft'). */
  text: string;
  /** Màu thanh gióng & chữ (mặc định đỏ cam kỹ thuật '#f06858'). */
  color?: string;
  /** Vector hướng lên của chữ (mặc định [0, 1, 0]). */
  up?: [number, number, number];
  /** Chiều cao vạch chặn hai đầu (m). */
  tickSize?: number;
  /** Độ dày thanh kích thước (m). */
  thickness?: number;
  /** Chiều cao chữ trong không gian 3D (m). */
  fontSize?: number;
  /** Tiến trình mở thanh 0..1 (dùng với useSpring / prog). */
  progress?: number;
};

/**
 * Thước đo kích thước nằm trực tiếp trong phối cảnh 3D (`|——— 16.26 m ———|`),
 * tự biến dạng phối cảnh cùng phương tiện và đọc xuôi chiều từ cả hai phía camera.
 */
export const Measure3D: React.FC<Measure3DProps> = ({
  from,
  to,
  text,
  color = '#f06858',
  up = [0, 1, 0],
  tickSize = 0.65,
  thickness = 0.085,
  fontSize = 0.82,
  progress = 1,
}) => {
  const p = Math.max(0, Math.min(1, progress));

  const basis = useMemo(() => {
    const a = new THREE.Vector3(...from);
    const b = new THREE.Vector3(...to);
    const mid = a.clone().add(b).multiplyScalar(0.5);
    const len = a.distanceTo(b);
    if (len < 1e-4) return null;
    const dir = b.clone().sub(a).divideScalar(len);
    let u = new THREE.Vector3(...up).normalize();
    if (Math.abs(dir.dot(u)) > 0.98) {
      u = Math.abs(dir.z) < 0.9 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
    }
    const normal = new THREE.Vector3().crossVectors(dir, u).normalize();
    const orthoUp = new THREE.Vector3().crossVectors(normal, dir).normalize();
    const m = new THREE.Matrix4().makeBasis(dir, orthoUp, normal);
    const quat = new THREE.Quaternion().setFromRotationMatrix(m);
    return { mid, len, quat };
  }, [from[0], from[1], from[2], to[0], to[1], to[2], up[0], up[1], up[2]]);

  const labelTex = useMemo(() => {
    const hPx = 240;
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = hPx;
    let ctx = c.getContext('2d')!;
    const fontSpec = `700 136px ${FONT}`;
    ctx.font = fontSpec;
    const wPx = Math.max(256, Math.ceil(ctx.measureText(text).width + 96));
    c.width = wPx;
    c.height = hPx;
    ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, wPx, hPx);
    ctx.font = fontSpec;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 22;
    ctx.strokeStyle = 'rgba(8, 12, 20, 0.82)';
    ctx.strokeText(text, wPx / 2, hPx * 0.52);
    ctx.fillStyle = color;
    ctx.fillText(text, wPx / 2, hPx * 0.52);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return { tex, aspect: wPx / hPx };
  }, [text, color]);

  const barMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        toneMapped: false,
      }),
    [color],
  );

  if (!basis || p <= 0.02) return null;

  const barOpacity = Math.max(0, Math.min(1, p / 0.35));
  barMat.opacity = barOpacity;
  const span = basis.len * (0.85 + 0.15 * Math.min(1, p / 0.5));
  const planeH = fontSize * 1.65;
  const planeW = planeH * labelTex.aspect;
  const textOpacity = Math.max(0, Math.min(1, (p - 0.12) / 0.45));
  const textY = thickness * 0.5 + fontSize * 0.72;

  return (
    <group position={[basis.mid.x, basis.mid.y, basis.mid.z]} quaternion={basis.quat} userData={{ noShadow: true, noCollide: true }}>
      <mesh material={barMat} renderOrder={998}>
        <boxGeometry args={[span, thickness, thickness * 0.65]} />
      </mesh>
      <mesh position={[-span / 2, 0, 0]} material={barMat} renderOrder={998}>
        <boxGeometry args={[thickness * 1.15, tickSize, thickness * 0.65]} />
      </mesh>
      <mesh position={[span / 2, 0, 0]} material={barMat} renderOrder={998}>
        <boxGeometry args={[thickness * 1.15, tickSize, thickness * 0.65]} />
      </mesh>
      {textOpacity > 0.005 && (
        <group position={[0, textY, 0]}>
          <mesh position={[0, 0, 0.002]} renderOrder={999}>
            <planeGeometry args={[planeW, planeH]} />
            <meshBasicMaterial
              map={labelTex.tex}
              transparent
              opacity={textOpacity}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
              side={THREE.FrontSide}
            />
          </mesh>
          <mesh position={[0, 0, -0.002]} rotation={[0, Math.PI, 0]} renderOrder={999}>
            <planeGeometry args={[planeW, planeH]} />
            <meshBasicMaterial
              map={labelTex.tex}
              transparent
              opacity={textOpacity}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
              side={THREE.FrontSide}
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** Đã ngưng dùng (trả về null): nhân vật con người bắt buộc lấy từ Blender qua `bk.py prep-actor` + `<Soldier3D>`. */
export const ScaleHuman: React.FC<{
  position?: [number, number, number];
  rotationY?: number;
  height?: number;
  color?: string;
}> = () => null;
