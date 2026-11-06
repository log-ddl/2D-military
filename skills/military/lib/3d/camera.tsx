// Camera điện ảnh mặc định cho quy trình Blender + Three.js:
// 1. Đường cong mượt CatmullRom Spline (centripetal, không gãy góc hay văng cua)
// 2. Đổi tiêu cự ống kính (lens mm chuẩn cảm biến Full-Frame 35mm: 20mm rộng -> 85mm/135mm tele)
// 3. Quét khoảng cách BVHTree mỗi khung hình để tự động trượt tránh va chạm, cấm đâm xuyên vật thể & mặt sàn.
import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import type { V3 } from './stage';
import { BVHTree } from './bvh';

export type SplineKeyframe = {
  /** Thời điểm chuẩn hoá 0..1 hoặc giây tuyệt đối nếu truyền `t` kèm mốc. */
  at?: number;
  pos: V3;
  look: V3;
  /** Tiêu cự ống kính 35mm (mặc định 35mm). Góc rộng ~22-28mm, vừa ~35-50mm, tele cận ~75-135mm. */
  lens?: number;
  /** Nghiêng máy nhẹ (radian) khi lượn cua. */
  roll?: number;
};

export type SplineCamProps = {
  /** Tiến trình dọc quỹ đạo 0..1 (hoặc truyền `t` nếu mỗi keyframe có `at` theo giây). */
  u?: number;
  /** Giây hiện tại `useT()` khi dùng mốc `at` trên `keyframes`. */
  t?: number;
  keyframes: SplineKeyframe[];
  /** Khoảng cách tối thiểu từ ống kính tới vỏ vật thể tính bằng BVHTree (m, mặc định 0.65m). Đặt 0 để tắt. */
  clearance?: number;
  /** Độ cao tối thiểu của camera so với sàn/đất (m, mặc định 0.45m). */
  minY?: number;
  /** Chỉ quét BVH trên nhóm vật thể chỉ định (mặc định quét toàn cảnh trừ vòm nhà chứa bằng cờ userData.noCollide). */
  collideGroup?: React.RefObject<THREE.Object3D | null>;
};

const smoothstep = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

/** Tính trước toạ độ Spline + tiêu cự tại thời điểm `t` (dùng được cả ngoài React để khớp nối giữa nhiều cảnh). */
export function sampleSplineRig(keyframes: SplineKeyframe[], param: { u?: number; t?: number }) {
  const n = keyframes.length;
  if (n === 0) throw new Error('SplineCam cần ít nhất 1 keyframe');
  if (n === 1) {
    return {
      pos: [...keyframes[0].pos] as V3,
      look: [...keyframes[0].look] as V3,
      lens: keyframes[0].lens ?? 35,
      roll: keyframes[0].roll ?? 0,
    };
  }

  const posCurve = new THREE.CatmullRomCurve3(
    keyframes.map((k) => new THREE.Vector3(...k.pos)),
    false,
    'centripetal',
    0.5,
  );
  const lookCurve = new THREE.CatmullRomCurve3(
    keyframes.map((k) => new THREE.Vector3(...k.look)),
    false,
    'centripetal',
    0.5,
  );

  let s = 0;
  let segIdx = 0;
  let localAlpha = 0;

  if (param.t !== undefined && keyframes[0].at !== undefined) {
    const t = param.t;
    const t0 = keyframes[0].at!;
    const tEnd = keyframes[n - 1].at!;
    if (t <= t0) {
      s = 0; segIdx = 0; localAlpha = 0;
    } else if (t >= tEnd) {
      s = 1; segIdx = n - 2; localAlpha = 1;
    } else {
      for (let i = 0; i < n - 1; i++) {
        const a = keyframes[i].at!, b = keyframes[i + 1].at!;
        if (t >= a && t <= b) {
          segIdx = i;
          localAlpha = b > a ? (t - a) / (b - a) : 0;
          // Ánh xạ sang tham số u của spline (phân đoạn đều i / (n - 1)) có làm mượt nhẹ ở hai đầu toàn quỹ đạo
          s = (i + localAlpha) / (n - 1);
          break;
        }
      }
    }
  } else {
    s = Math.max(0, Math.min(1, param.u ?? 0));
    const scaled = s * (n - 1);
    segIdx = Math.min(n - 2, Math.floor(scaled));
    localAlpha = scaled - segIdx;
  }

  const p = posCurve.getPoint(s);
  const lk = lookCurve.getPoint(s);
  const kA = keyframes[segIdx];
  const kB = keyframes[segIdx + 1];
  const e = smoothstep(localAlpha);
  const lens = (kA.lens ?? 35) + ((kB.lens ?? 35) - (kA.lens ?? 35)) * e;
  const roll = (kA.roll ?? 0) + ((kB.roll ?? 0) - (kA.roll ?? 0)) * e;

  return {
    pos: [p.x, p.y, p.z] as V3,
    look: [lk.x, lk.y, lk.z] as V3,
    lens,
    roll,
  };
}

export const SplineCam: React.FC<SplineCamProps> = ({
  u,
  t,
  keyframes,
  clearance = 0.65,
  minY = 0.45,
  collideGroup,
}) => {
  const { camera, scene } = useThree();
  const bvhCache = useRef<{ count: number; tree: BVHTree } | null>(null);

  const sampled = useMemo(() => sampleSplineRig(keyframes, { u, t }), [keyframes, u, t]);

  const apply = () => {
    const camPos = new THREE.Vector3(...sampled.pos);
    const lookPos = new THREE.Vector3(...sampled.look);

    // Chống lọt sàn trước
    if (camPos.y < minY) camPos.y = minY;

    // Quét BVHTree chống đâm xuyên vật thể (tối đa 2 vòng trượt tiếp tuyến mượt)
    if (clearance > 0) {
      const targetRoot = collideGroup?.current ?? scene;
      let meshCount = 0;
      targetRoot.traverse((o) => {
        if ((o as THREE.Mesh).isMesh && o.visible && !o.userData?.noCollide && !o.userData?.isGround) meshCount++;
      });

      if (meshCount > 0) {
        if (!bvhCache.current || bvhCache.current.count !== meshCount) {
          bvhCache.current = { count: meshCount, tree: BVHTree.fromScene(targetRoot) };
        }
        const tree = bvhCache.current.tree;
        for (let iter = 0; iter < 2; iter++) {
          const hit = tree.findNearest(camPos, clearance * 1.35);
          if (!hit || hit.distance >= clearance) break;

          const pushDir = camPos.clone().sub(hit.point);
          if (pushDir.lengthSq() < 1e-6) {
            pushDir.copy(hit.normal);
          } else {
            pushDir.normalize();
            // Nếu vector đẩy ngược hướng nhìn ra ngoài tâm vật thể, ưu tiên đẩy ra xa điểm nhìn
            const awayFromLook = camPos.clone().sub(lookPos);
            if (pushDir.dot(awayFromLook) < -0.25) {
              pushDir.lerp(awayFromLook.normalize(), 0.55).normalize();
            }
          }
          const delta = clearance - hit.distance;
          camPos.addScaledVector(pushDir, delta);
        }
      }
    }

    if (camPos.y < minY) camPos.y = minY;

    const pc = camera as THREE.PerspectiveCamera;
    pc.filmGauge = 36; // Chuẩn Full-Frame 36x24mm
    pc.setFocalLength(Math.max(12, Math.min(250, sampled.lens)));
    pc.near = 0.08;
    pc.far = 3500;
    pc.position.copy(camPos);
    pc.up.set(Math.sin(sampled.roll), Math.cos(sampled.roll), 0);
    pc.lookAt(lookPos);
    pc.updateProjectionMatrix();
    pc.updateMatrixWorld();
  };

  apply();
  useLayoutEffect(apply);
  return null;
};
