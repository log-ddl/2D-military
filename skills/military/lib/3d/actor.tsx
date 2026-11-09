// Bộ binh 3D PBR 67 xương (SkinnedMesh) dùng chung kho hoạt cảnh mocap quang học Mixamo.
// Chuẩn hoá từ 1 phôi gốc qua `bk.py prep-actor` + gói clip `mocap.py pack`:
//   - Đế giày chạm Y = 0, mặt nhìn dọc +X (yaw = 0).
//   - Tương thích hoàn toàn với `ContactShadow` (bóng tiếp xúc mềm thực theo khung xương động).
//   - Hỗ trợ pha trộn mượt `blendTo`, chạy một lần `onceFrom`, lệch pha `phase` cho đội hình tiểu đội,
//     tự động pha giật vai & sinh chớp lửa đầu nòng `muzzle_socket` theo mảng `fireAt`.
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { continueRender, delayRender } from 'remotion';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { bump } from '@core/time';
import { getCachedGLTF, loadCachedGLTF, makeSafePbrMaterial } from './gltf';
import { JetPlume, softDot } from './fx';
import type { V3 } from './stage';

/** 24 hoạt cảnh mocap chuẩn trong `skills/military/presets/mixamo_combat_clips.json` (mở rộng mở cho mọi clip Mixamo khác). */
export type SoldierClip =
  | 'Rifle_Aim_Idle'
  | 'Rifle_Low_Idle'
  | 'Rifle_Look_Idle'
  | 'Rifle_Walk_Aim'
  | 'Rifle_Walk_Patrol'
  | 'Rifle_Walk_Fire'
  | 'Rifle_Crouch_Idle'
  | 'Rifle_Kneel_Idle'
  | 'Rifle_Crouch_Walk'
  | 'Rifle_Crouch_Fire'
  | 'Rifle_Stand_Fire'
  | 'Rifle_Run'
  | 'Rifle_Run_Aim'
  | 'Rifle_Sprint'
  | 'Rifle_Strafe_Left'
  | 'Rifle_Strafe_Right'
  | 'Rifle_Reload_Crouch'
  | 'Rifle_Dive_Roll'
  | 'Rifle_Prone_Crawl'
  | 'Rifle_Prone_Fire'
  | 'Rifle_Throw_Grenade'
  | 'Rifle_Cover_Idle'
  | 'Kneeling_Pointing'
  | 'Salute'
  | (string & {});

/** Vận tốc mặt đất thực tế (m/s) trích xuất từ Root Motion xương `Hips` của Mixamo FBX (nhân với `speed` để khớp 100% không trượt chân). */
export const WALK_AIM_SPEED = 1.0;
export const WALK_PATROL_SPEED = 1.31;
export const WALK_FIRE_SPEED = 1.55;
export const CROUCH_WALK_SPEED = 1.23;
export const RUN_AIM_SPEED = 3.16;
export const RUN_SPEED = 4.84;
export const SPRINT_SPEED = 7.26;
export const STRAFE_LEFT_SPEED = 1.39;
export const STRAFE_RIGHT_SPEED = 0.76;
export const DIVE_ROLL_SPEED = 1.58;
export const PRONE_CRAWL_SPEED = 0.25;

export const SOLDIER_CLIP_SPEEDS: Record<string, number> = {
  Rifle_Walk_Aim: WALK_AIM_SPEED,
  Rifle_Walk_Patrol: WALK_PATROL_SPEED,
  Rifle_Walk_Fire: WALK_FIRE_SPEED,
  Rifle_Crouch_Walk: CROUCH_WALK_SPEED,
  Rifle_Run_Aim: RUN_AIM_SPEED,
  Rifle_Run: RUN_SPEED,
  Rifle_Sprint: SPRINT_SPEED,
  Rifle_Strafe_Left: STRAFE_LEFT_SPEED,
  Rifle_Strafe_Right: STRAFE_RIGHT_SPEED,
  Rifle_Dive_Roll: DIVE_ROLL_SPEED,
  Rifle_Prone_Crawl: PRONE_CRAWL_SPEED,
};

export type ClipPlaySpec = {
  clip: SoldierClip;
  weight: number;
  speed?: number;
  /** Nếu truyền `onceFrom`, clip chạy 1 lần tính từ thời điểm `t = onceFrom` (kẹp ở frame cuối, không lặp). */
  onceFrom?: number;
};

export type Soldier3DProps = {
  /** Thời gian tuyệt đối `useT()` (giây). */
  t: number;
  /** Đường dẫn asset `.glb` nhân vật từ `bk.py prep-actor` (ví dụ `asset('a016')`). */
  skinSrc: string;
  /** Đường dẫn asset `.glb` gói hoạt cảnh từ `mocap.py pack` (ví dụ `asset('a018')`). */
  animSrc: string;
  clip?: SoldierClip;
  /** Nếu truyền `onceFrom`, clip chính chạy 1 lần từ mốc `t = onceFrom` (thay đạn, ném lựu đạn, lăn, chào...). */
  onceFrom?: number;
  /** Pha trộn sang clip thứ hai (vd: từ lăn chiến thuật / ném lựu đạn chuyển mượt về ngồi ngắm bắn). */
  blendTo?: ClipPlaySpec;
  /** Hệ số tốc độ phát hoạt cảnh (mặc định `1`). Khi nhân vật di chuyển với vận tốc `v`, đặt `speed = v / speed_mps_của_clip` để không trượt chân. */
  speed?: number;
  /** Độ lệch pha (giây) để các lính trong tiểu đội không bước/thở đồng bộ như robot. */
  phase?: number;
  position?: V3;
  /** Góc quay hướng mặt quanh trục Y (radian; `0` = nhìn dọc `+X`). */
  yaw?: number;
  scale?: number;
  /** Ẩn/hiện vũ khí gắn trên `weapon_mount` (mặc định `true`; ở các clip `slung`, súng tự động đeo chéo sau lưng). */
  showWeapon?: boolean;
  /** Danh sách thời điểm bóp cò (giây): tự động pha giật vai Mixamo + sinh chớp lửa loạt đạn ở `muzzle_socket`. */
  fireAt?: number[];
  /** Số viên mỗi loạt bắn (mặc định `3` viên cách nhau `0.10s`). */
  burstRounds?: number;
  castShadow?: boolean;
  receiveShadow?: boolean;
};

/** Chớp lửa đầu nòng súng bộ binh 5.56mm/7.62mm: tia lửa loa che chớp sắc gọn + khói thuốc súng mỏng. */
export const RifleMuzzleFlash: React.FC<{ t: number; at: number; pos: V3; dir: V3; seed: number }> = ({
  t,
  at,
  pos,
  dir,
  seed,
}) => {
  const smokeMat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false, color: '#cfc8be' }),
    [],
  );
  const dt = t - at;
  if (dt < 0 || dt > 0.75) return null;
  const d = new THREE.Vector3(...dir).normalize();
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
  const flash = Math.max(0, 1 - dt / 0.085);
  const smokeOp = 0.2 * Math.max(0, 1 - dt / 0.75);
  smokeMat.opacity = smokeOp;
  smokeMat.rotation = seed + dt * 1.2;
  const drift = d.clone().multiplyScalar(0.18 + dt * 0.65).add(new THREE.Vector3(0, dt * 0.28, 0));

  return (
    <group position={pos}>
      {flash > 0 && (
        <>
          <pointLight color="#ffd180" intensity={9.5 * flash} distance={4.5} decay={1.8} />
          <group quaternion={q}>
            <JetPlume t={t} pos={[0, 0, 0]} dir={[1, 0, 0]} length={0.46} radius={0.055} thrust={flash * 1.25} color="#ff8e26" coreColor="#fff6d6" />
            <JetPlume t={t} pos={[0.03, 0, 0]} dir={[0.45, 0.3, 0.85]} length={0.22} radius={0.032} thrust={flash} color="#ff7a1c" coreColor="#ffe8a8" />
            <JetPlume t={t} pos={[0.03, 0, 0]} dir={[0.45, 0.3, -0.85]} length={0.22} radius={0.032} thrust={flash} color="#ff7a1c" coreColor="#ffe8a8" />
          </group>
        </>
      )}
      {smokeOp > 0.004 && (
        <sprite
          material={smokeMat}
          position={[drift.x, drift.y, drift.z]}
          scale={[0.16 + dt * 0.38, 0.16 + dt * 0.38, 1]}
        />
      )}
    </group>
  );
};

function computeLocalToRoot(node: THREE.Object3D, root: THREE.Object3D): THREE.Matrix4 {
  const chain: THREE.Object3D[] = [];
  let cur: THREE.Object3D | null = node;
  while (cur && cur !== root) {
    chain.push(cur);
    cur = cur.parent;
  }
  const m = new THREE.Matrix4();
  for (let i = chain.length - 1; i >= 0; i--) {
    chain[i].updateMatrix();
    m.multiply(chain[i].matrix);
  }
  return m;
}

export const Soldier3D: React.FC<Soldier3DProps> = ({
  t,
  skinSrc,
  animSrc,
  clip = 'Rifle_Aim_Idle',
  onceFrom,
  blendTo,
  speed = 1,
  phase = 0,
  position = [0, 0, 0],
  yaw = 0,
  scale = 1,
  showWeapon = true,
  fireAt = [],
  burstRounds = 3,
  castShadow = true,
  receiveShadow = true,
}) => {
  const advance = useThree((s) => s.advance);
  const invalidate = useThree((s) => s.invalidate);
  const [loadedPair, setLoadedPair] = useState<{
    skin: Awaited<ReturnType<typeof loadCachedGLTF>>;
    anims: Awaited<ReturnType<typeof loadCachedGLTF>>;
  } | null>(() => {
    const s = getCachedGLTF(skinSrc);
    const a = getCachedGLTF(animSrc);
    return s && a ? { skin: s, anims: a } : null;
  });
  const [handle] = useState<number | null>(() =>
    getCachedGLTF(skinSrc) && getCachedGLTF(animSrc) ? null : delayRender(`soldier3d:${skinSrc}`),
  );
  const releasedRef = useRef(handle === null);

  const releaseOnce = () => {
    if (!releasedRef.current && handle !== null) {
      releasedRef.current = true;
      continueRender(handle);
    }
  };

  useEffect(() => {
    let cancelled = false;
    if (loadedPair) return;
    Promise.all([loadCachedGLTF(skinSrc), loadCachedGLTF(animSrc)])
      .then(([skin, anims]) => {
        if (!cancelled) setLoadedPair({ skin, anims });
      })
      .catch((err) => {
        console.error('Lỗi nạp nhân vật / gói hoạt cảnh Mixamo:', skinSrc, animSrc, err);
        releaseOnce();
      });
    return () => {
      cancelled = true;
    };
  }, [skinSrc, animSrc, loadedPair]);

  const actor = useMemo(() => {
    if (!loadedPair) return null;
    const root = cloneSkeleton(loadedPair.skin.scene);
    let muzzleNode = null as THREE.Object3D | null;
    let weaponMesh = null as THREE.Object3D | null;

    root.traverse((o) => {
      o.userData.noCollide = true;
      if (o.name === 'muzzle_socket' || o.name.startsWith('muzzle_socket')) {
        muzzleNode = o;
      }
      if (
        o.name === 'M4_Rifle_Mesh' ||
        o.name === 'Actor_Prop_Mesh' ||
        o.name.startsWith('M4_Rifle') ||
        o.name.startsWith('Actor_Prop')
      ) {
        weaponMesh = o;
      }
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.frustumCulled = false;
      m.castShadow = castShadow;
      m.receiveShadow = receiveShadow;
      if (m.geometry && m.geometry.attributes.uv && !m.geometry.attributes.uv1) {
        m.geometry.setAttribute('uv1', m.geometry.attributes.uv);
      }
      m.material = Array.isArray(m.material)
        ? m.material.map((mat) => makeSafePbrMaterial(mat))
        : makeSafePbrMaterial(m.material);
    });

    const mixer = new THREE.AnimationMixer(root);
    const actions = new Map<string, { action: THREE.AnimationAction; duration: number }>();
    for (const c of loadedPair.anims.animations) {
      const act = mixer.clipAction(c);
      act.loop = THREE.LoopRepeat;
      act.enabled = false;
      act.play();
      actions.set(c.name, { action: act, duration: Math.max(0.04, c.duration) });
    }

    return { root, mixer, actions, muzzleNode, weaponMesh };
  }, [loadedPair, castShadow, receiveShadow]);

  useEffect(() => {
    return () => {
      if (actor) actor.mixer.stopAllAction();
    };
  }, [actor]);

  useEffect(() => {
    if (!actor) return;
    invalidate();
    if (releasedRef.current) return;
    const raf1 = requestAnimationFrame(() => {
      advance(performance.now());
      releaseOnce();
    });
    return () => {
      cancelAnimationFrame(raf1);
    };
  }, [actor, advance, invalidate]);

  useEffect(() => () => releaseOnce(), []);

  const burstSpan = Math.max(0.28, (burstRounds - 1) * 0.1 + 0.24);
  let fireWeight = 0;
  for (const at of fireAt) {
    fireWeight = Math.max(fireWeight, bump(t, at - 0.04, burstSpan + 0.08));
  }

  const applyPose = () => {
    if (!actor) return null;
    if (actor.weaponMesh) {
      actor.weaponMesh.visible = showWeapon;
    }

    for (const entry of actor.actions.values()) {
      entry.action.enabled = false;
      entry.action.setEffectiveWeight(0);
    }

    const activate = (name: SoldierClip, w: number, rate = speed, startOnce?: number) => {
      if (w <= 0.001) return;
      const entry = actor.actions.get(name);
      if (!entry) return;
      let localT: number;
      if (startOnce !== undefined) {
        localT = Math.max(0, Math.min(entry.duration - 0.001, (t - startOnce) * rate));
      } else {
        localT = (((t * rate + phase) % entry.duration) + entry.duration) % entry.duration;
      }
      entry.action.enabled = true;
      entry.action.setEffectiveTimeScale(1);
      entry.action.setEffectiveWeight(w);
      entry.action.time = localT;
    };

    const blendW = blendTo ? Math.max(0, Math.min(1, blendTo.weight)) : 0;
    const baseW = 1 - blendW;

    const fireClipFor = (c: SoldierClip): SoldierClip | null => {
      if (c === 'Rifle_Walk_Fire' || c === 'Rifle_Stand_Fire' || c === 'Rifle_Crouch_Fire' || c === 'Rifle_Prone_Fire') {
        return null;
      }
      if (c === 'Rifle_Prone_Crawl') return 'Rifle_Prone_Fire';
      if (c === 'Rifle_Crouch_Idle' || c === 'Rifle_Kneel_Idle' || c === 'Rifle_Crouch_Walk') {
        return 'Rifle_Crouch_Fire';
      }
      if (
        c === 'Rifle_Aim_Idle' ||
        c === 'Rifle_Low_Idle' ||
        c === 'Rifle_Look_Idle' ||
        c === 'Rifle_Walk_Aim' ||
        c === 'Rifle_Walk_Patrol' ||
        c === 'Rifle_Run_Aim'
      ) {
        return 'Rifle_Stand_Fire';
      }
      return null;
    };

    const isMovingRifle = (c: SoldierClip) =>
      c === 'Rifle_Walk_Aim' ||
      c === 'Rifle_Walk_Patrol' ||
      c === 'Rifle_Crouch_Walk' ||
      c === 'Rifle_Run' ||
      c === 'Rifle_Run_Aim' ||
      c === 'Rifle_Sprint' ||
      c === 'Rifle_Strafe_Left' ||
      c === 'Rifle_Strafe_Right' ||
      c === 'Rifle_Prone_Crawl';

    const fw = Math.min(0.92, fireWeight);
    const fcBase = fireClipFor(clip);
    if (fw > 0.01 && fcBase && baseW > 0.01) {
      const k = isMovingRifle(clip) ? fw * 0.34 : fw * 0.88;
      activate(clip, baseW * (1 - k), speed, onceFrom);
      activate(fcBase, baseW * k, 1.15);
    } else {
      activate(clip, baseW, speed, onceFrom);
    }

    if (blendTo && blendW > 0.001) {
      const bRate = blendTo.speed ?? speed;
      const fcBlend = fireClipFor(blendTo.clip);
      if (fw > 0.01 && fcBlend) {
        const k = isMovingRifle(blendTo.clip) ? fw * 0.34 : fw * 0.88;
        activate(blendTo.clip, blendW * (1 - k), bRate, blendTo.onceFrom);
        activate(fcBlend, blendW * k, 1.15);
      } else {
        activate(blendTo.clip, blendW, bRate, blendTo.onceFrom);
      }
    }

    actor.mixer.update(0);

    if (actor.muzzleNode) {
      const m = computeLocalToRoot(actor.muzzleNode, actor.root);
      const p = new THREE.Vector3().setFromMatrixPosition(m);
      const pAhead = new THREE.Vector3(0, 0.25, 0).applyMatrix4(m);
      const d = pAhead.sub(p).normalize();
      return {
        pos: [p.x, p.y, p.z] as V3,
        dir: [d.x, d.y, d.z] as V3,
      };
    }
    return {
      pos: [0.84, clip.includes('Crouch') ? 0.88 : 1.32, -0.15] as V3,
      dir: [1, 0, 0] as V3,
    };
  };

  const muzzle = applyPose();
  useLayoutEffect(() => {
    applyPose();
  });

  if (!actor || !muzzle) return null;

  const shots: { at: number; seed: number }[] = [];
  let skinHash = 0;
  for (let i = 0; i < skinSrc.length; i++) skinHash = (skinHash * 31 + skinSrc.charCodeAt(i)) | 0;
  fireAt.forEach((bAt, bi) => {
    for (let r = 0; r < burstRounds; r++) {
      shots.push({ at: bAt + r * 0.1, seed: bi * 13 + r * 7 + (skinHash & 63) });
    }
  });

  return (
    <group position={position} rotation={[0, yaw, 0]} scale={[scale, scale, scale]} userData={{ noCollide: true }}>
      <primitive object={actor.root} />
      {showWeapon &&
        shots.map((s, idx) => (
          <RifleMuzzleFlash
            key={idx}
            t={t}
            at={s.at}
            pos={muzzle.pos}
            dir={muzzle.dir}
            seed={s.seed}
          />
        ))}
    </group>
  );
};
