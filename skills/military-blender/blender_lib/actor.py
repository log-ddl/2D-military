"""Bộ binh 3D (Mixamo Rig) trong Blender 5.2 (`bpy`):
- Tra cứu trực tiếp kho **2.446 hành động Mixamo (`.fbx`)** từ `mixamo/manifest.csv` (`find_mixamo_fbx`) hoặc nạp gói `.glb` từ `mocap.py pack`.
- Tự động gán Action / NLA Strip lên Armature, hỗ trợ lặp chu kỳ, lệch pha `phase_frames` cho đội hình tiểu đội, pha trộn mượt `blend_to` giữa 2 tư thế, và tự động tính tốc độ bước chân theo `SOLDIER_CLIP_SPEEDS` để không trượt chân.
- Tự động tạo chớp lửa đầu nòng HDR (`muzzle_socket`) tại các frame bắn `fire_frames`.
"""
from __future__ import annotations
import csv
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[3]
MIXAMO_DIR = ROOT / 'mixamo'
MANIFEST_CSV = MIXAMO_DIR / 'manifest.csv'

WALK_AIM_SPEED = 1.0
WALK_PATROL_SPEED = 1.31
WALK_FIRE_SPEED = 1.55
CROUCH_WALK_SPEED = 1.23
RUN_AIM_SPEED = 3.16
RUN_SPEED = 4.84
SPRINT_SPEED = 7.26
STRAFE_LEFT_SPEED = 1.39
STRAFE_RIGHT_SPEED = 0.76
DIVE_ROLL_SPEED = 1.58
PRONE_CRAWL_SPEED = 0.25

SOLDIER_CLIP_SPEEDS: dict[str, float] = {
    'Rifle_Walk_Aim': WALK_AIM_SPEED,
    'Rifle_Walk_Patrol': WALK_PATROL_SPEED,
    'Rifle_Walk_Fire': WALK_FIRE_SPEED,
    'Rifle_Crouch_Walk': CROUCH_WALK_SPEED,
    'Rifle_Run_Aim': RUN_AIM_SPEED,
    'Rifle_Run': RUN_SPEED,
    'Rifle_Sprint': SPRINT_SPEED,
    'Rifle_Strafe_Left': STRAFE_LEFT_SPEED,
    'Rifle_Strafe_Right': STRAFE_RIGHT_SPEED,
    'Rifle_Dive_Roll': DIVE_ROLL_SPEED,
    'Rifle_Prone_Crawl': PRONE_CRAWL_SPEED,
}

_LOADED_ANIM_PACKS: set[str] = set()


def _ensure_anim_pack_loaded(anim_src: str | Path) -> None:
    p = str(Path(anim_src).resolve())
    if p in _LOADED_ANIM_PACKS:
        return
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=p)
    added = [o for o in bpy.data.objects if o not in before]
    for o in added:
        bpy.data.objects.remove(o, do_unlink=True)
    _LOADED_ANIM_PACKS.add(p)


def _find_action(clip_name: str) -> bpy.types.Action | None:
    if clip_name in bpy.data.actions:
        return bpy.data.actions[clip_name]
    cl = clip_name.lower()
    for act in bpy.data.actions:
        if cl in act.name.lower():
            return act
    # Nếu truyền tên file .fbx hoặc từ khoá trong kho 2.446 clip Mixamo, tự động tìm và nạp trực tiếp từ mixamo/
    fbx_path = find_mixamo_fbx(clip_name)
    if fbx_path is not None:
        return load_mixamo_fbx_action(fbx_path, action_name=clip_name)
    return None


def find_mixamo_fbx(query_or_file: str) -> Path | None:
    """Tìm đường dẫn file `.fbx` trong kho 2.446 hành động `mixamo/` theo tên file hoặc từ khoá trong `mixamo/manifest.csv`."""
    cand = MIXAMO_DIR / query_or_file
    if cand.is_file():
        return cand
    if not query_or_file.lower().endswith('.fbx'):
        cand_fbx = MIXAMO_DIR / f'{query_or_file}.fbx'
        if cand_fbx.is_file():
            return cand_fbx
    if not MANIFEST_CSV.is_file():
        return None
    terms = [t.lower() for t in query_or_file.replace('_', ' ').split() if t.strip()]
    best_row = None
    best_score = 0
    with open(MANIFEST_CSV, 'r', encoding='utf-8', newline='') as f:
        for row in csv.DictReader(f):
            nm = (row.get('name') or '').lower()
            desc = (row.get('description') or '').lower()
            fn = (row.get('file') or '').lower()
            hay = f'{nm} {desc} {fn}'
            if all(t in hay for t in terms):
                sc = 10 + (20 if all(t in nm for t in terms) else 0)
                if sc > best_score:
                    best_score = sc
                    best_row = row
    if best_row and best_row.get('file'):
        fp = MIXAMO_DIR / best_row['file']
        if fp.is_file():
            return fp
    return None


def load_mixamo_fbx_action(fbx_path: str | Path, action_name: str | None = None) -> bpy.types.Action | None:
    """Nạp trực tiếp 1 file `.fbx` từ kho `mixamo/` vào Blender, giữ lại Action hoạt cảnh và xoá lưới tạm."""
    p = Path(fbx_path).resolve()
    if not p.is_file():
        return None
    before_objs = set(bpy.data.objects)
    before_acts = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(p))
    new_acts = [a for a in bpy.data.actions if a not in before_acts]
    new_objs = [o for o in bpy.data.objects if o not in before_objs]
    for o in new_objs:
        bpy.data.objects.remove(o, do_unlink=True)
    if new_acts:
        act = new_acts[0]
        if action_name:
            act.name = action_name
        return act
    return None


def add_soldier_3d(
    name: str,
    skin_src: str | Path,
    anim_src: str | Path | None = None,
    clip: str = 'Rifle_Aim_Idle',
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    yaw_deg: float = 0.0,
    scale: float = 1.0,
    move_keyframes: list[tuple[int, tuple[float, float, float], float | None]] | None = None,
    speed: float | None = None,
    phase_frames: int = 0,
    blend_to: tuple[str, int, int] | None = None,
    armed: bool = True,
    fire_frames: list[int] | None = None,
) -> bpy.types.Object:
    """Tạo một người lính 3D có xương và hoạt cảnh NLA trong Blender:
    - `skin_src`: đường dẫn `.glb` nhân vật từ `bk.py prep-actor`.
    - `anim_src`: đường dẫn `.glb` gói clip từ `mocap.py pack`.
    - `clip`: tên hoạt cảnh chính (vd `'Rifle_Walk_Aim'`, `'Rifle_Crouch_Fire'`, `'Rifle_Sprint'`).
    - `move_keyframes`: danh sách `(frame, (x, y, z), yaw_deg_opt)` nếu lính di chuyển trên mặt đất.
      Nếu không truyền `speed`, tự động chia vận tốc di chuyển cho `SOLDIER_CLIP_SPEEDS[clip]` để bước chân khớp 100% mặt đất.
    - `blend_to`: `(target_clip, blend_start_frame, blend_frames)` để pha mượt sang hoạt cảnh thứ hai.
    - `fire_frames`: danh sách frame bóp cò để loé chớp lửa đầu nòng HDR tại `muzzle_socket`.
    """
    if anim_src:
        _ensure_anim_pack_loaded(anim_src)

    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(Path(skin_src).resolve()))
    imported = [o for o in bpy.data.objects if o not in before]

    root = bpy.data.objects.new(name, None)
    root.empty_display_type = 'PLAIN_AXES'
    bpy.context.scene.collection.objects.link(root)

    armature_obj: bpy.types.Object | None = None
    muzzle_socket: bpy.types.Object | None = None

    for o in imported:
        if o.parent is None:
            o.parent = root
        if o.type == 'ARMATURE' and armature_obj is None:
            armature_obj = o
        nl = o.name.lower()
        if 'weapon' in nl and not armed:
            o.hide_render = True
            o.hide_viewport = True
        if 'muzzle_socket' in nl:
            muzzle_socket = o

    # glTF dùng +Y up, trong Blender import_scene.gltf đã tự chuyển sang +Z up
    root.location = location
    root.rotation_euler = (0.0, 0.0, math.radians(yaw_deg))
    root.scale = (scale, scale, scale)

    scn = bpy.context.scene
    fps = float(scn.render.fps)

    # Tự động tính speed nếu có move_keyframes mà chưa truyền speed
    if speed is None:
        if move_keyframes and len(move_keyframes) >= 2 and clip in SOLDIER_CLIP_SPEEDS:
            f0, p0, _ = move_keyframes[0]
            f1, p1, _ = move_keyframes[-1]
            dt = max(1e-3, abs(f1 - f0) / fps)
            dist = math.dist(p0, p1)
            v_mps = dist / dt
            speed = max(0.35, min(2.5, v_mps / SOLDIER_CLIP_SPEEDS[clip]))
        else:
            speed = 1.0

    if move_keyframes:
        for fr, pos, y_deg in move_keyframes:
            root.location = pos
            root.keyframe_insert(data_path='location', frame=int(fr))
            if y_deg is not None:
                root.rotation_euler[2] = math.radians(float(y_deg))
                root.keyframe_insert(data_path='rotation_euler', index=2, frame=int(fr))

    # Gán NLA Strip cho Armature
    if armature_obj is not None:
        if not armature_obj.animation_data:
            armature_obj.animation_data_create()
        armature_obj.animation_data.action = None

        act_main = _find_action(clip)
        if act_main is not None:
            track1 = armature_obj.animation_data.nla_tracks.new()
            track1.name = f'{name}_{clip}'
            start_fr = max(1, scn.frame_start - int(phase_frames))
            strip1 = track1.strips.new(act_main.name, start_fr, act_main)
            strip1.scale = 1.0 / max(0.1, float(speed))
            act_len = max(1.0, (act_main.frame_range[1] - act_main.frame_range[0]) * strip1.scale)
            total_span = max(1.0, float(scn.frame_end - start_fr + 24))
            strip1.repeat = max(1.0, math.ceil(total_span / act_len))

        if blend_to is not None:
            b_clip, b_start, b_dur = blend_to
            act_b = _find_action(b_clip)
            if act_b is not None:
                track2 = armature_obj.animation_data.nla_tracks.new()
                track2.name = f'{name}_{b_clip}'
                strip2 = track2.strips.new(act_b.name, int(b_start), act_b)
                strip2.blend_type = 'REPLACE'
                strip2.blend_in = max(1.0, float(b_dur))
                act_len2 = max(1.0, act_b.frame_range[1] - act_b.frame_range[0])
                strip2.repeat = max(1.0, math.ceil(float(scn.frame_end - b_start + 24) / act_len2))

    # Tạo chớp lửa đầu nòng HDR tại các frame bắn
    if fire_frames:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.14, location=(0, 0, 0))
        flash = bpy.context.active_object
        flash.name = f'{name}_MuzzleFlash'
        flash.parent = muzzle_socket if muzzle_socket is not None else root
        if muzzle_socket is None:
            flash.location = (0.75, 0.0, 1.38)

        mat = bpy.data.materials.new(f'{name}_FlashMat')
        mat.use_nodes = True
        nt = mat.node_tree
        nt.nodes.clear()
        out = nt.nodes.new('ShaderNodeOutputMaterial')
        em = nt.nodes.new('ShaderNodeEmission')
        em.inputs['Color'].default_value = (1.0, 0.62, 0.12, 1.0)
        em.inputs['Strength'].default_value = 0.0
        nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
        flash.data.materials.append(mat)

        for fr in fire_frames:
            for df, s_val, e_val in [(-1, 0.001, 0.0), (0, 1.2, 32.0), (1, 0.65, 12.0), (2, 0.001, 0.0)]:
                f_cur = int(fr + df)
                flash.scale = (s_val * 1.8, s_val * 0.7, s_val * 0.7)
                flash.keyframe_insert(data_path='scale', frame=f_cur)
                em.inputs['Strength'].default_value = e_val
                em.inputs['Strength'].keyframe_insert(data_path='default_value', frame=f_cur)

    return root
