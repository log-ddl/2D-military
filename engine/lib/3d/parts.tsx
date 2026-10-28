// Bộ phận cơ khí dùng chung để dựng phương tiện: bánh xe, dải xích chạy được, đinh tán.
// Đây là linh kiện, không phải mô hình hoàn chỉnh — mỗi video tự dựng phương tiện của mình từ các linh kiện này.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { lathe, rbox } from './geom';
import { plain } from './materials';

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
