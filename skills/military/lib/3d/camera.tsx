// Camera điện ảnh cho quy trình Blender + Three.js:
// 1. Đường cong mượt CatmullRom Spline (centripetal, không gãy góc hay văng cua)
// 2. Đổi tiêu cự ống kính (mặc định 29mm tương đương fov = 38° thoáng đãng như <Cam>)
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
  /** Tiêu cự ống kính 35mm (mặc định 29mm tương đương fov = 38°). */
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
      lens: keyframes[0].lens ?? 29,
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
  const lens = (kA.lens ?? 29) + ((kB.lens ?? 29) - (kA.lens ?? 29)) * e;
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

export type ModelPose3D = {
  pos?: V3;
  rot?: V3;
  position?: V3;
  rotation?: V3;
  scale?: number | V3;
};

export type ProjectedPoint2D = [number, number] & { at: [number, number] };

function makeProjectedPoint(sx: number, sy: number): ProjectedPoint2D {
  const tuple: [number, number] = [sx, sy];
  return Object.assign(tuple, { at: tuple });
}

/** Chuyển toạ độ cục bộ [lx, ly, lz] trên khí tài đang bay/di chuyển sang toạ độ thế giới 3D [wx, wy, wz]. */
export function worldAt(localPt: V3, pose?: ModelPose3D): V3 {
  if (!pose) return localPt;
  const v = new THREE.Vector3(...localPt);
  if (pose.scale !== undefined) {
    if (typeof pose.scale === 'number') {
      v.multiplyScalar(pose.scale);
    } else {
      v.set(v.x * pose.scale[0], v.y * pose.scale[1], v.z * pose.scale[2]);
    }
  }
  const rot = pose.rot ?? pose.rotation;
  if (rot) {
    v.applyEuler(new THREE.Euler(rot[0], rot[1], rot[2], 'XYZ'));
  }
  const pos = pose.pos ?? pose.position;
  if (pos) {
    v.x += pos[0];
    v.y += pos[1];
    v.z += pos[2];
  }
  return [v.x, v.y, v.z];
}

/** Chiếu điểm 3D (thế giới hoặc cục bộ qua `modelPose`) qua thông số ống kính `rig` ra toạ độ màn hình 2D [px, py] (1920×1080) để neo `<Callout>`. */
export function projectCameraPoint(
  pt: V3,
  rig: { pos: V3; look: V3; lens?: number; roll?: number },
  opts?: { width?: number; height?: number; minY?: number; modelPose?: ModelPose3D },
): ProjectedPoint2D {
  const w = opts?.width ?? 1920;
  const h = opts?.height ?? 1080;
  const minY = opts?.minY ?? 0.45;
  const wPt = opts?.modelPose ? worldAt(pt, opts.modelPose) : pt;

  const cam = new THREE.PerspectiveCamera(45, w / h, 0.08, 3500);
  cam.filmGauge = 36;
  cam.setFocalLength(Math.max(12, Math.min(250, rig.lens ?? 29)));
  cam.position.set(rig.pos[0], Math.max(minY, rig.pos[1]), rig.pos[2]);
  const r = rig.roll ?? 0;
  cam.up.set(Math.sin(r), Math.cos(r), 0);
  cam.lookAt(rig.look[0], rig.look[1], rig.look[2]);
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);

  const ndc = new THREE.Vector3(...wPt).project(cam);
  const sx = Math.max(60, Math.min(w - 60, (ndc.x * 0.5 + 0.5) * w));
  const sy = Math.max(60, Math.min(h - 60, (-ndc.y * 0.5 + 0.5) * h));
  return makeProjectedPoint(sx, sy);
}

/** Chiếu điểm 3D qua quỹ đạo `SplineCam` (`keyframes` + `{ t }` hoặc `{ u }`) ra toạ độ màn hình 2D [px, py] để `<Callout>` bám dính 100% theo bộ phận 3D. */
export function projectSplinePoint(
  pt: V3,
  keyframesOrT: SplineKeyframe[] | number,
  paramOrKeyframes: { u?: number; t?: number } | SplineKeyframe[],
  optsOrPose?: { width?: number; height?: number; minY?: number; modelPose?: ModelPose3D } | ModelPose3D,
): ProjectedPoint2D {
  if (typeof keyframesOrT === 'number') {
    const keyframes = paramOrKeyframes as SplineKeyframe[];
    const rig = sampleSplineRig(keyframes, { t: keyframesOrT });
    const isDirectPose =
      optsOrPose && ('pos' in optsOrPose || 'position' in optsOrPose || 'rot' in optsOrPose || 'rotation' in optsOrPose);
    return projectCameraPoint(
      pt,
      rig,
      isDirectPose
        ? { modelPose: optsOrPose as ModelPose3D }
        : (optsOrPose as { width?: number; height?: number; minY?: number; modelPose?: ModelPose3D }),
    );
  }
  const rig = sampleSplineRig(keyframesOrT, paramOrKeyframes as { u?: number; t?: number });
  return projectCameraPoint(
    pt,
    rig,
    optsOrPose as { width?: number; height?: number; minY?: number; modelPose?: ModelPose3D },
  );
}

export function calloutOffset(
  at: [number, number],
  dx: number,
  dy: number,
  bounds: [number, number, number, number] = [210, 110, 1710, 950],
): [number, number] {
  const tx = Math.max(bounds[0], Math.min(bounds[2], at[0] + dx));
  const ty = Math.max(bounds[1], Math.min(bounds[3], at[1] + dy));
  return [tx, ty];
}
