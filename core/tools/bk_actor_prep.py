"""Blender worker chuẩn hoá phôi người (Rigify / Humanoid `.blend`) sang khung 67 xương chuẩn Mixamo
và tuỳ biến trang phục mô-đun theo cấu hình JSON.

Độc lập chủ đề (không chứa dữ liệu riêng của bất kỳ chủ đề nào):
- Lọc bỏ widget Rigify và tách rời/ẩn đảo lưới phụ kiện theo toạ độ không gian (`strip_islands`).
- Đổi hoạ tiết vải 4 sắc thái hữu cơ (`camo4`) hoặc nhuộm màu vật liệu (`tint`) giữ nguyên 100% nếp gấp vải, đường may, AO và Normal.
- Đưa nhân vật về T-Pose chuẩn Mixamo, co tỷ lệ 1:1 khớp chiều cao háng Mixamo (`0.9752m`), gộp trọng số đỉnh sang 65 xương Mixamo + `weapon_mount` + `muzzle_socket`.
- Xuất `.glb` nhẹ (hướng mặt `+X`, đế giày chạm `Y = 0` trong Three.js) và lưu `rig_profile` vào báo cáo JSON để đồng bộ 100% với `mocap.py pack`.
"""
from __future__ import annotations

import json
import math
import subprocess
import sys
import tempfile
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

sys.path.insert(0, str(Path(__file__).resolve().parent))
import mocap_blender_pack as mbp  # noqa: E402


def clean_humanoid_scene(arm_name: str, drop_substrings: list[str]):
    arm_obj = bpy.data.objects.get(arm_name)
    if arm_obj is None:
        arms = [o for o in bpy.data.objects if o.type == 'ARMATURE']
        if not arms:
            raise RuntimeError('Không tìm thấy Armature nào trong file .blend')
        arm_obj = max(arms, key=lambda a: len(a.data.bones))

    drop_lows = [s.lower() for s in drop_substrings]
    for o in list(bpy.data.objects):
        if o.type in ('LIGHT', 'CAMERA'):
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        if o.type == 'ARMATURE' and o != arm_obj:
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        if o.type == 'MESH':
            nm_l = o.name.lower()
            in_wgt = any('wgt' in c.name.lower() for c in o.users_collection)
            has_arm = any(m.type == 'ARMATURE' and m.object == arm_obj for m in o.modifiers)
            dropped = any(sub in nm_l for sub in drop_lows)
            if in_wgt or dropped or o.name.startswith(('cs_', 'WGT-', 'wgt_')) or o.hide_render or not has_arm:
                bpy.data.objects.remove(o, do_unlink=True)
                continue
    for o in list(bpy.data.objects):
        if o.type == 'EMPTY' and o != arm_obj and len(o.children) == 0:
            bpy.data.objects.remove(o, do_unlink=True)
    return arm_obj


def strip_mesh_islands(rules: list[dict]):
    """Gỡ bỏ các cụm lưới rời (đảo liên thông) trên sub-mesh khớp điều kiện tâm bao (vd: giáp vai, balo, túi phụ)."""
    for rule in rules:
        target_name = rule.get('mesh', '')
        obj = bpy.data.objects.get(target_name)
        if obj is None:
            obj = next((o for o in bpy.data.objects if o.type == 'MESH' and o.name.strip() == target_name.strip()), None)
        if not obj or obj.type != 'MESH':
            continue
        if obj.data.users > 1:
            obj.data = obj.data.copy()

        bm = bmesh.new()
        bm.from_mesh(obj.data)
        visited = set()
        to_delete = []
        mw = obj.matrix_world
        for v in bm.verts:
            if v.index in visited:
                continue
            comp = []
            stack = [v]
            visited.add(v.index)
            while stack:
                cur = stack.pop()
                comp.append(cur)
                for e in cur.link_edges:
                    nb = e.other_vert(cur)
                    if nb.index not in visited:
                        visited.add(nb.index)
                        stack.append(nb)
            pts = [mw @ c.co for c in comp]
            cx = sum(p.x for p in pts) / len(pts)
            cy = sum(p.y for p in pts) / len(pts)
            cz = sum(p.z for p in pts) / len(pts)

            match = True
            if 'abs_x_gt' in rule and not (abs(cx) > float(rule['abs_x_gt'])):
                match = False
            if 'abs_y_gt' in rule and not (abs(cy) > float(rule['abs_y_gt'])):
                match = False
            if 'x_gt' in rule and not (cx > float(rule['x_gt'])):
                match = False
            if 'x_lt' in rule and not (cx < float(rule['x_lt'])):
                match = False
            if 'y_gt' in rule and not (cy > float(rule['y_gt'])):
                match = False
            if 'y_lt' in rule and not (cy < float(rule['y_lt'])):
                match = False
            if 'z_gt' in rule and not (cz > float(rule['z_gt'])):
                match = False
            if 'z_lt' in rule and not (cz < float(rule['z_lt'])):
                match = False
            if match:
                to_delete.extend(comp)

        if to_delete:
            bmesh.ops.delete(bm, geom=to_delete, context='VERTS')
            bm.to_mesh(obj.data)
            obj.data.update()
        bm.free()


def synthesize_4tone_pattern(h: int, w: int, colors: list[list[float]], freq_scale: float = 1.0) -> np.ndarray:
    """Sinh bản đồ hoạ tiết 4 sắc thái hữu cơ trên không gian UV."""
    yy, xx = np.meshgrid(
        np.linspace(0.0, 1.0, h, endpoint=False),
        np.linspace(0.0, 1.0, w, endpoint=False),
        indexing='ij',
    )
    k = float(freq_scale)
    f1 = (
        np.sin(2 * np.pi * k * (3.0 * xx + 2.0 * yy) + 0.4)
        + 0.75 * np.cos(2 * np.pi * k * (5.0 * xx - 4.0 * yy) - 1.1)
        + 0.50 * np.sin(2 * np.pi * k * (9.0 * xx + 7.0 * yy) + 2.3)
        + 0.30 * np.cos(2 * np.pi * k * (15.0 * xx - 11.0 * yy) + 0.8)
    )
    f2 = (
        np.cos(2 * np.pi * k * (4.0 * xx - 3.0 * yy) + 1.7)
        + 0.70 * np.sin(2 * np.pi * k * (7.0 * xx + 6.0 * yy) - 0.6)
        + 0.45 * np.cos(2 * np.pi * k * (12.0 * xx + 9.0 * yy) + 1.9)
    )
    c0 = np.array(colors[0], dtype=np.float32)
    c1 = np.array(colors[1], dtype=np.float32)
    c2 = np.array(colors[2], dtype=np.float32)
    c3 = np.array(colors[3], dtype=np.float32)

    w1 = 1.0 / (1.0 + np.exp(-3.8 * (f1 - 0.35)))
    w2 = 1.0 / (1.0 + np.exp(-4.2 * (f2 - 0.52)))
    w3 = 1.0 / (1.0 + np.exp(-5.0 * (-f1 - 0.85)))

    pat = c0[None, None, :] * np.ones((h, w, 1), dtype=np.float32)
    pat = pat * (1.0 - w1[..., None]) + c1[None, None, :] * w1[..., None]
    pat = pat * (1.0 - 0.75 * w2[..., None]) + c2[None, None, :] * (0.75 * w2[..., None])
    pat = pat * (1.0 - 0.65 * w3[..., None]) + c3[None, None, :] * (0.65 * w3[..., None])
    return pat


def _compute_cloth_mask(rgb: np.ndarray, lum: np.ndarray, mask_mode: str) -> np.ndarray:
    if mask_mode == 'warm_cloth':
        return np.clip((rgb[..., 0] - rgb[..., 2]) * 7.5, 0.0, 1.0) * np.clip((lum - 0.08) * 4.0, 0.0, 1.0)
    if mask_mode == 'warm_gear':
        return np.clip((rgb[..., 0] - rgb[..., 2]) * 8.0 + 0.25, 0.0, 1.0) * np.clip((lum - 0.12) * 5.0, 0.0, 1.0)
    if mask_mode == 'mid_bright':
        return np.clip((lum - 0.10) * 5.0, 0.0, 1.0)
    return np.ones_like(lum, dtype=np.float32)


def apply_material_customizations(tag: str, mat_rules: dict[str, dict]):
    for mat_key, cfg in mat_rules.items():
        mat = bpy.data.materials.get(mat_key)
        if mat is None:
            mat = next((m for m in bpy.data.materials if m.name.strip().lower() == mat_key.strip().lower()), None)
        if not mat or not mat.node_tree:
            continue

        mode = cfg.get('mode', 'tint')
        mask_mode = cfg.get('mask', 'all')
        strength = float(cfg.get('strength', 1.0))

        for n in mat.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and 'BaseColor' in (n.image.filepath or n.image.name):
                src_img = n.image
                img = src_img.copy()
                img.name = f'{tag}_{mat.name.strip()}_BaseColor'
                w, h = img.size
                arr = np.empty(w * h * 4, dtype=np.float32)
                img.pixels.foreach_get(arr)
                rgba = arr.reshape(h, w, 4)
                rgb = rgba[..., :3]
                lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
                mask = _compute_cloth_mask(rgb, lum, mask_mode) * strength

                if mode == 'camo4':
                    colors = cfg['colors']
                    freq = float(cfg.get('freq_scale', 1.0))
                    ref_lum = max(0.05, float(cfg.get('ref_lum', 0.365)))
                    pat = synthesize_4tone_pattern(h, w, colors, freq_scale=freq)
                    shade = np.clip(lum / ref_lum, 0.22, 1.65)[..., None]
                    target_rgb = pat * shade
                else:
                    sc_rgb = cfg.get('scale', [1.0, 1.0, 1.0])
                    bias_rgb = cfg.get('bias', [0.0, 0.0, 0.0])
                    target_rgb = np.stack(
                        [
                            lum * float(sc_rgb[0]) + float(bias_rgb[0]),
                            lum * float(sc_rgb[1]) + float(bias_rgb[1]),
                            lum * float(sc_rgb[2]) + float(bias_rgb[2]),
                        ],
                        axis=-1,
                    )

                rgba[..., :3] = np.clip(rgb * (1.0 - mask[..., None]) + target_rgb * mask[..., None], 0.0, 1.0)
                img.pixels.foreach_set(rgba.reshape(-1))
                img.update()
                img.pack()
                n.image = img


def join_and_clean_actor_mesh(arm, max_total_faces: int = 28000):
    meshes = [
        o for o in bpy.context.scene.objects
        if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)
    ]
    for o in meshes:
        if o.data.shape_keys:
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            o.shape_key_clear()
        if o.data.uv_layers:
            act_name = next((u.name for u in o.data.uv_layers if u.active_render), o.data.uv_layers[0].name)
            for u in list(o.data.uv_layers):
                if u.name != act_name:
                    o.data.uv_layers.remove(u)
            o.data.uv_layers[0].name = 'UVMap'
            o.data.uv_layers[0].active = True
            o.data.uv_layers[0].active_render = True

    total = sum(len(o.data.polygons) for o in meshes)
    if max_total_faces > 0 and total > max_total_faces:
        ratio = max(0.25, min(0.95, max_total_faces / float(total)))
        for o in meshes:
            if len(o.data.polygons) < 1500:
                continue
            if o.data.users > 1:
                o.data = o.data.copy()
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            mod = o.modifiers.new(name='ActorDecimate', type='DECIMATE')
            mod.decimate_type = 'COLLAPSE'
            mod.ratio = ratio
            while o.modifiers.find(mod.name) > 0:
                bpy.ops.object.modifier_move_up(modifier=mod.name)
            try:
                bpy.ops.object.modifier_apply(modifier=mod.name)
            except Exception:
                if mod.name in o.modifiers:
                    o.modifiers.remove(mod)

    meshes = [
        o for o in bpy.context.scene.objects
        if o.type == 'MESH' and any(m.type == 'ARMATURE' and m.object == arm for m in o.modifiers)
    ]
    if len(meshes) > 1:
        bpy.ops.object.select_all(action='DESELECT')
        for o in meshes:
            o.select_set(True)
        bpy.context.view_layer.objects.active = meshes[0]
        bpy.ops.object.join()
        meshes = [bpy.context.view_layer.objects.active]

    mesh_obj = meshes[0]
    mesh_obj.name = 'Actor_Skinned_Mesh'
    mesh_obj.data.validate()
    for mat in mesh_obj.data.materials:
        if mat and mat.node_tree:
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if bsdf:
                em_in = bsdf.inputs.get('Emission Color')
                if em_in and em_in.is_linked:
                    for lk in list(em_in.links):
                        mat.node_tree.links.remove(lk)
                em_str = bsdf.inputs.get('Emission Strength')
                if em_str:
                    em_str.default_value = 0.0
    return mesh_obj, total, len(mesh_obj.data.polygons)


def build_rigify_to_mixamo_vgroup_remap() -> dict[str, str]:
    remap = {
        'DEF-spine': 'Hips',
        'DEF-pelvis.L': 'Hips',
        'DEF-pelvis.R': 'Hips',
        'DEF-spine.001': 'Spine',
        'DEF-spine.002': 'Spine1',
        'DEF-spine.003': 'Spine2',
        'DEF-breast.L': 'Spine2',
        'DEF-breast.R': 'Spine2',
        'DEF-spine.004': 'Neck',
        'DEF-spine.005': 'Neck',
        'DEF-spine.006': 'Head',
    }
    for side, pfx in [('L', 'Left'), ('R', 'Right')]:
        remap[f'DEF-shoulder.{side}'] = f'{pfx}Shoulder'
        remap[f'DEF-upper_arm.{side}'] = f'{pfx}Arm'
        remap[f'DEF-upper_arm.{side}.001'] = f'{pfx}Arm'
        remap[f'DEF-forearm.{side}'] = f'{pfx}ForeArm'
        remap[f'DEF-forearm.{side}.001'] = f'{pfx}ForeArm'
        remap[f'DEF-hand.{side}'] = f'{pfx}Hand'
        for p_idx in ('01', '02', '03', '04'):
            remap[f'DEF-palm.{p_idx}.{side}'] = f'{pfx}Hand'
        for f_src, f_dst in [
            ('thumb', 'HandThumb'),
            ('f_index', 'HandIndex'),
            ('f_middle', 'HandMiddle'),
            ('f_ring', 'HandRing'),
            ('f_pinky', 'HandPinky'),
        ]:
            for seg_s, seg_d in [('01', '1'), ('02', '2'), ('03', '3')]:
                remap[f'DEF-{f_src}.{seg_s}.{side}'] = f'{pfx}{f_dst}{seg_d}'
        remap[f'DEF-thigh.{side}'] = f'{pfx}UpLeg'
        remap[f'DEF-thigh.{side}.001'] = f'{pfx}UpLeg'
        remap[f'DEF-shin.{side}'] = f'{pfx}Leg'
        remap[f'DEF-shin.{side}.001'] = f'{pfx}Leg'
        remap[f'DEF-foot.{side}'] = f'{pfx}Foot'
        remap[f'DEF-toe.{side}'] = f'{pfx}ToeBase'
    return remap


def merge_and_rename_vertex_groups(mesh_obj):
    remap = build_rigify_to_mixamo_vgroup_remap()
    mesh = mesh_obj.data
    old_idx_to_new_name = {}
    for vg in mesh_obj.vertex_groups:
        if vg.name in remap:
            old_idx_to_new_name[vg.index] = remap[vg.name]

    vert_weights = []
    for v in mesh.vertices:
        acc = {}
        for g in v.groups:
            dst = old_idx_to_new_name.get(g.group)
            if dst and g.weight > 1e-6:
                acc[dst] = acc.get(dst, 0.0) + g.weight
        s = sum(acc.values())
        if s > 1e-6:
            acc = {k: val / s for k, val in acc.items()}
        vert_weights.append(acc)

    mesh_obj.vertex_groups.clear()
    created = {}
    for v_idx, acc in enumerate(vert_weights):
        for gname, w in acc.items():
            vg = created.get(gname)
            if vg is None:
                vg = mesh_obj.vertex_groups.new(name=gname)
                created[gname] = vg
            vg.add([v_idx], w, 'REPLACE')


def pose_rigify_to_mixamo_tpose_and_bake_mesh(arm, mesh_obj) -> dict[str, list[float]]:
    sc = bpy.context.scene
    t_act = next((a for a in bpy.data.actions if 't_pose' in a.name.lower() or 't-pose' in a.name.lower()), None)
    if t_act:
        mbp.assign_action_with_slot(arm, t_act)
        sc.frame_set(1)
        bpy.context.view_layer.update()

    def_names = [b.name for b in arm.data.bones if b.use_deform]
    baked_mats = {nm: (arm.matrix_world @ arm.pose.bones[nm].matrix).copy() for nm in def_names}
    mbp.assign_action_with_slot(arm, None)
    for pb in arm.pose.bones:
        for c in list(pb.constraints):
            pb.constraints.remove(c)
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.rotation_euler = (0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 0.0) if False else (1.0, 1.0, 1.0)
    bpy.context.view_layer.update()

    def apply_world_mats(mat_map):
        for b in arm.data.bones:
            if b.name in mat_map:
                pb = arm.pose.bones[b.name]
                pb.matrix = arm.matrix_world.inverted() @ mat_map[b.name]
                bpy.context.view_layer.update()

    apply_world_mats(baked_mats)

    for side, target_dir in [('L', Vector((1.0, 0.0, 0.0))), ('R', Vector((-1.0, 0.0, 0.0)))]:
        ua = arm.pose.bones[f'DEF-upper_arm.{side}']
        hd = arm.pose.bones[f'DEF-hand.{side}']
        p_pivot = (arm.matrix_world @ ua.head).copy()
        cur_vec = ((arm.matrix_world @ hd.head) - p_pivot).normalized()
        q_fix = cur_vec.rotation_difference(target_dir)
        R_fix = Matrix.Translation(p_pivot) @ q_fix.to_matrix().to_4x4() @ Matrix.Translation(-p_pivot)
        arm_chain = [
            nm for nm in def_names
            if nm.endswith(f'.{side}') or nm.endswith(f'.{side}.001')
            if any(k in nm for k in ('upper_arm', 'forearm', 'hand', 'palm', 'f_index', 'f_middle', 'f_ring', 'f_pinky', 'thumb'))
        ]
        for nm in arm_chain:
            baked_mats[nm] = R_fix @ baked_mats[nm]
    apply_world_mats(baked_mats)

    for side in ('L', 'R'):
        for fname in ('f_index', 'f_middle', 'f_ring', 'f_pinky'):
            b1 = arm.pose.bones[f'DEF-{fname}.01.{side}']
            b3 = arm.pose.bones[f'DEF-{fname}.03.{side}']
            piv = (arm.matrix_world @ b1.head).copy()
            v_cur = (arm.matrix_world @ b3.tail) - piv
            v_flat = Vector((v_cur.x, v_cur.y, 0.0)).normalized()
            q_f = v_cur.normalized().rotation_difference(v_flat)
            Rf = Matrix.Translation(piv) @ q_f.to_matrix().to_4x4() @ Matrix.Translation(-piv)
            for seg in ('01', '02', '03'):
                nm = f'DEF-{fname}.{seg}.{side}'
                baked_mats[nm] = Rf @ baked_mats[nm]
    apply_world_mats(baked_mats)

    for side in ('L', 'R'):
        th = arm.pose.bones[f'DEF-thigh.{side}']
        ft = arm.pose.bones[f'DEF-foot.{side}']
        p_hip = (arm.matrix_world @ th.head).copy()
        p_ank = (arm.matrix_world @ ft.head).copy()
        cur_leg = (p_ank - p_hip).normalized()
        tgt_leg = Vector((0.0, cur_leg.y, -math.sqrt(max(0.01, 1.0 - cur_leg.y * cur_leg.y)))).normalized()
        q_leg = cur_leg.rotation_difference(tgt_leg)
        R_leg = Matrix.Translation(p_hip) @ q_leg.to_matrix().to_4x4() @ Matrix.Translation(-p_hip)
        for nm in (f'DEF-thigh.{side}', f'DEF-thigh.{side}.001', f'DEF-shin.{side}', f'DEF-shin.{side}.001', f'DEF-foot.{side}', f'DEF-toe.{side}'):
            baked_mats[nm] = R_leg @ baked_mats[nm]
    apply_world_mats(baked_mats)

    raw_joints = {}
    for nm in def_names:
        pb = arm.pose.bones[nm]
        raw_joints[nm] = ((arm.matrix_world @ pb.head).copy(), (arm.matrix_world @ pb.tail).copy())

    old_parent = mesh_obj.parent
    mw_keep = mesh_obj.matrix_world.copy()
    mesh_obj.parent = None
    mesh_obj.matrix_world = mw_keep
    if old_parent and old_parent != arm and old_parent.type == 'EMPTY' and len(old_parent.children) == 0:
        bpy.data.objects.remove(old_parent, do_unlink=True)

    bpy.ops.object.select_all(action='DESELECT')
    mesh_obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_obj
    for m in list(mesh_obj.modifiers):
        if m.type == 'ARMATURE':
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

    z_min = min(v.co.z for v in mesh_obj.data.vertices)
    thigh_l_raw = raw_joints['DEF-thigh.L'][0]
    scale_f = 0.9752 / max(0.5, thigh_l_raw.z - z_min)
    dy_shift = 0.0160 - thigh_l_raw.y * scale_f

    S_mat = Matrix.Translation(Vector((0.0, dy_shift, -z_min * scale_f))) @ Matrix.Scale(scale_f, 4)
    mesh_obj.data.transform(S_mat)
    mesh_obj.data.update()

    sj = {nm: (S_mat @ hd, S_mat @ tl) for nm, (hd, tl) in raw_joints.items()}
    for act in list(bpy.data.actions):
        bpy.data.actions.remove(act)
    bpy.data.objects.remove(arm, do_unlink=True)

    jmap: dict[str, Vector] = {
        'Spine': sj['DEF-spine.001'][0],
        'Spine1': sj['DEF-spine.002'][0],
        'Spine2': sj['DEF-spine.003'][0],
        'Neck': sj['DEF-spine.004'][0],
        'Head': sj['DEF-spine.006'][0],
        'HeadTop_End': sj['DEF-spine.006'][1],
    }
    for side, pfx in [('L', 'Left'), ('R', 'Right')]:
        jmap[f'{pfx}Shoulder'] = sj[f'DEF-shoulder.{side}'][0]
        jmap[f'{pfx}Arm'] = sj[f'DEF-upper_arm.{side}'][0]
        jmap[f'{pfx}ForeArm'] = sj[f'DEF-forearm.{side}'][0]
        jmap[f'{pfx}Hand'] = sj[f'DEF-hand.{side}'][0]
        for f_src, f_dst in [
            ('thumb', 'HandThumb'),
            ('f_index', 'HandIndex'),
            ('f_middle', 'HandMiddle'),
            ('f_ring', 'HandRing'),
            ('f_pinky', 'HandPinky'),
        ]:
            jmap[f'{pfx}{f_dst}1'] = sj[f'DEF-{f_src}.01.{side}'][0]
            jmap[f'{pfx}{f_dst}2'] = sj[f'DEF-{f_src}.02.{side}'][0]
            jmap[f'{pfx}{f_dst}3'] = sj[f'DEF-{f_src}.03.{side}'][0]
            jmap[f'{pfx}{f_dst}4'] = sj[f'DEF-{f_src}.03.{side}'][1]
        jmap[f'{pfx}UpLeg'] = sj[f'DEF-thigh.{side}'][0]
        jmap[f'{pfx}Leg'] = sj[f'DEF-shin.{side}'][0]
        jmap[f'{pfx}Foot'] = sj[f'DEF-foot.{side}'][0]
        jmap[f'{pfx}ToeBase'] = sj[f'DEF-toe.{side}'][0]
        jmap[f'{pfx}Toe_End'] = sj[f'DEF-toe.{side}'][1]

    return {k: [round(v.x, 5), round(v.y, 5), round(v.z, 5)] for k, v in jmap.items()}


def attach_prop_to_weapon_mount(arm_obj, prop_glb: Path, prop_mount_cfg: dict):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=str(prop_glb))
    imp = [o for o in bpy.data.objects if o not in before]
    prop_mesh = max((o for o in imp if o.type == 'MESH'), key=lambda o: len(o.data.polygons))
    for o in imp:
        if o != prop_mesh:
            bpy.data.objects.remove(o, do_unlink=True)

    prop_mesh.name = prop_mount_cfg.get('mesh_name', 'Actor_Prop_Mesh')
    prop_mesh.parent = None
    prop_mesh.matrix_world = Matrix.Identity(4)
    prop_mesh.data = prop_mesh.data.copy()

    rows = prop_mount_cfg.get('local_matrix') or [
        [0.0, -1.0, 0.0, 0.0],
        [1.0,  0.0, 0.0, 0.405],
        [0.0,  0.0, 1.0, -0.188],
        [0.0,  0.0, 0.0, 1.0],
    ]
    R_local = Matrix([tuple(r) for r in rows])
    wm_rest_world = arm_obj.matrix_world @ arm_obj.data.bones['weapon_mount'].matrix_local
    prop_mesh.data.transform(wm_rest_world @ R_local)
    prop_mesh.data.update()

    prop_mesh.vertex_groups.clear()
    vg = prop_mesh.vertex_groups.new(name='weapon_mount')
    vg.add(list(range(len(prop_mesh.data.vertices))), 1.0, 'REPLACE')

    prop_mesh.parent = arm_obj
    prop_mesh.matrix_parent_inverse = arm_obj.matrix_world.inverted()
    mod = prop_mesh.modifiers.new(name='Armature', type='ARMATURE')
    mod.object = arm_obj
    return prop_mesh


def render_4panel_studio_sheet(
    arm_obj,
    out_png: Path,
    mixamo_dir: Path,
    pm_cfg: dict,
    z_ground_fix: float,
    inspect_clips: list[dict] | None = None,
):
    """Render ảnh kiểm định 2x2 cận cảnh (4 tư thế mocap đại diện hoặc 4 góc xoay studio) để kiểm tra mắt thường."""
    sc = bpy.context.scene
    sc.render.engine = 'BLENDER_EEVEE'
    sc.render.resolution_x = 640
    sc.render.resolution_y = 640
    sc.render.film_transparent = False
    if not sc.world:
        sc.world = bpy.data.worlds.new('InspectWorld')
    sc.world.use_nodes = True
    bg = sc.world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs[0].default_value = (0.21, 0.23, 0.26, 1.0)
        bg.inputs[1].default_value = 1.20

    key_d = bpy.data.lights.new('KeySun', 'SUN')
    key_d.energy = 3.8
    key_o = bpy.data.objects.new('KeySun', key_d)
    sc.collection.objects.link(key_o)
    key_o.rotation_euler = Euler((math.radians(50), math.radians(15), math.radians(32)), 'XYZ')

    fill_d = bpy.data.lights.new('FillSun', 'SUN')
    fill_d.energy = 1.5
    fill_o = bpy.data.objects.new('FillSun', fill_d)
    sc.collection.objects.link(fill_o)
    fill_o.rotation_euler = Euler((math.radians(65), 0, math.radians(-135)), 'XYZ')

    bpy.ops.mesh.primitive_plane_add(size=8.0, location=(0, 0, 0))
    floor_obj = bpy.context.active_object
    fmat = bpy.data.materials.new('FloorMat')
    fmat.use_nodes = True
    fmat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.22, 0.20, 0.17, 1.0)
    fmat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = 0.92
    floor_obj.data.materials.append(fmat)

    cd = bpy.data.cameras.new('InspectCam')
    co = bpy.data.objects.new('InspectCam', cd)
    sc.collection.objects.link(co)
    sc.camera = co

    if inspect_clips:
        mbp.bake_mixamo_clips_onto_rig(
            arm_obj,
            mixamo_dir=mixamo_dir,
            clips_spec=inspect_clips,
            p_grip_local=Vector(pm_cfg['grip_local']),
            p_fore_local=Vector(pm_cfg['fore_local']),
            z_ground_fix=z_ground_fix,
        )
        views = [
            (inspect_clips[0]['clip'], int(inspect_clips[0].get('frame', 10)), 54, Vector((-1.15, -1.45, 1.38)), Vector((0.0, -0.18, 1.15))),
            (inspect_clips[min(1, len(inspect_clips) - 1)]['clip'], int(inspect_clips[min(1, len(inspect_clips) - 1)].get('frame', 10)), 48, Vector((1.45, -1.75, 1.15)), Vector((0.0, -0.10, 0.90))),
            (inspect_clips[min(2, len(inspect_clips) - 1)]['clip'], int(inspect_clips[min(2, len(inspect_clips) - 1)].get('frame', 20)), 50, Vector((-1.30, -1.60, 0.98)), Vector((-0.05, -0.10, 0.68))),
            (inspect_clips[min(3, len(inspect_clips) - 1)]['clip'], int(inspect_clips[min(3, len(inspect_clips) - 1)].get('frame', 15)), 46, Vector((1.25, 1.75, 1.25)), Vector((0.0, 0.0, 0.95))),
        ]
    else:
        views = [
            (None, 1, 48, Vector((0.0, -2.35, 1.12)), Vector((0.0, 0.0, 0.95))),
            (None, 1, 48, Vector((-1.65, -1.65, 1.15)), Vector((0.0, 0.0, 0.95))),
            (None, 1, 48, Vector((2.25, -0.35, 1.12)), Vector((0.0, 0.0, 0.95))),
            (None, 1, 48, Vector((0.35, 2.30, 1.15)), Vector((0.0, 0.0, 0.95))),
        ]

    td = Path(tempfile.mkdtemp(prefix='actor_inspect_'))
    shots = []
    for idx, (aname, fno, lens, cpos, clook) in enumerate(views):
        mbp.assign_action_with_slot(arm_obj, None)
        for pb in arm_obj.pose.bones:
            pb.location = (0.0, 0.0, 0.0)
            pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            pb.scale = (1.0, 1.0, 1.0)
        if aname:
            mbp.assign_action_with_slot(arm_obj, bpy.data.actions.get(aname))
        sc.frame_set(fno)
        cd.lens = lens
        co.location = cpos
        co.rotation_euler = (clook - cpos).normalized().to_track_quat('-Z', 'Y').to_euler()
        bpy.context.view_layer.update()
        fp = td / f's{idx}.png'
        sc.render.filepath = str(fp)
        bpy.ops.render.render(write_still=True)
        shots.append(fp)

    for o in (floor_obj, key_o, fill_o, co):
        bpy.data.objects.remove(o, do_unlink=True)
    for act in list(bpy.data.actions):
        bpy.data.actions.remove(act)

    out_png.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-i', str(shots[0]), '-i', str(shots[1]), '-i', str(shots[2]), '-i', str(shots[3]),
        '-filter_complex', '[0:v][1:v]hstack=inputs=2[r0];[2:v][3:v]hstack=inputs=2[r1];[r0][r1]vstack=inputs=2',
        str(out_png),
    ], check=True)
    print(f'[bk-actor] Đã chụp bảng kiểm định 2x2 -> {out_png}')


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

    def get_opt(flag: str, default: str = '') -> str:
        if flag in argv:
            idx = argv.index(flag)
            if idx + 1 < len(argv):
                return argv[idx + 1]
        return default

    src_blend = Path(get_opt('--src'))
    out_glb = Path(get_opt('--out')) if get_opt('--out') else None
    report_json = Path(get_opt('--report'))
    inspect_png = Path(get_opt('--inspect')) if get_opt('--inspect') else None
    preset_json = get_opt('--preset')
    prop_glb = Path(get_opt('--prop')) if get_opt('--prop') else None
    mixamo_dir = Path(get_opt('--mixamo-dir'))
    max_faces = int(float(get_opt('--decimate', '28000')))

    preset_cfg: dict = {}
    preset_tag = 'default'
    if preset_json:
        p_str, sep, key = preset_json.partition(':')
        raw = json.loads(Path(p_str).read_text(encoding='utf-8'))
        if sep and key:
            presets_map = raw.get('presets') or raw
            if key not in presets_map:
                raise RuntimeError(f"Không tìm thấy preset '{key}' trong {p_str}")
            base_common = {k: v for k, v in raw.items() if k != 'presets'}
            preset_cfg = {**base_common, **presets_map[key]}
            preset_tag = key
        else:
            preset_cfg = raw
            preset_tag = preset_cfg.get('name', Path(p_str).stem)

    bpy.ops.wm.open_mainfile(filepath=str(src_blend))
    arm_name = preset_cfg.get('armature_name', 'rig')
    drop_objs = preset_cfg.get('strip_objects') or []
    rig = clean_humanoid_scene(arm_name, drop_objs)

    if preset_cfg.get('strip_islands'):
        strip_mesh_islands(preset_cfg['strip_islands'])
    if preset_cfg.get('materials'):
        apply_material_customizations(preset_tag, preset_cfg['materials'])

    mesh_obj, faces_before, faces_after = join_and_clean_actor_mesh(rig, max_total_faces=max_faces)
    joint_heads_list = pose_rigify_to_mixamo_tpose_and_bake_mesh(rig, mesh_obj)
    merge_and_rename_vertex_groups(mesh_obj)

    pm_cfg = {**mbp.DEFAULT_PROP_MOUNT, **(preset_cfg.get('prop_mount') or {})}
    ref_fbx_name = preset_cfg.get('ref_fbx', '')
    ref_fbx = (mixamo_dir / ref_fbx_name) if (ref_fbx_name and (mixamo_dir / ref_fbx_name).is_file()) else next(mixamo_dir.glob('*.fbx'))

    joint_heads_vec = {k: Vector(v) for k, v in joint_heads_list.items()}
    mix_arm = mbp.build_mixamo67_armature(ref_fbx, joint_head_map=joint_heads_vec, prop_mount_cfg=pm_cfg)

    mesh_obj.parent = mix_arm
    mesh_obj.matrix_parent_inverse = mix_arm.matrix_world.inverted()
    arm_mod = mesh_obj.modifiers.new(name='Armature', type='ARMATURE')
    arm_mod.object = mix_arm

    if prop_glb and prop_glb.is_file():
        attach_prop_to_weapon_mount(mix_arm, prop_glb, pm_cfg)

    z_ground_fix = mbp.calibrate_mesh_ground_offset(mix_arm, mesh_obj, ref_fbx)

    if inspect_png:
        render_4panel_studio_sheet(
            mix_arm,
            inspect_png,
            mixamo_dir=mixamo_dir,
            pm_cfg=pm_cfg,
            z_ground_fix=z_ground_fix,
            inspect_clips=preset_cfg.get('inspect_clips'),
        )

    xs = [v.co.x for v in mesh_obj.data.vertices]
    ys = [v.co.y for v in mesh_obj.data.vertices]
    zs = [v.co.z for v in mesh_obj.data.vertices]
    report = {
        'type': 'actor_skin',
        'preset': preset_tag,
        'faces_before': faces_before,
        'faces_after': faces_after,
        'gltf_dimensions_m': {
            'length_x': round(max(ys) - min(ys), 3),
            'height_y': round(max(zs) - min(zs), 3),
            'width_z': round(max(xs) - min(xs), 3),
        },
        'pivots_gltf': {'weapon_mount': True, 'muzzle_socket': True},
        'rig_profile': {
            'joint_heads': joint_heads_list,
            'z_ground_fix': round(z_ground_fix, 5),
            'prop_mount': pm_cfg,
        },
    }
    report_json.parent.mkdir(parents=True, exist_ok=True)
    report_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    if out_glb:
        mbp.wrap_plus_x_and_export(mix_arm, out_glb, include_animations=False)
        print(
            f"[bk-actor] Xuất xong '{preset_tag}' -> {out_glb} "
            f"(faces={faces_before}->{faces_after}, z_fix={z_ground_fix:+.4f}m, {out_glb.stat().st_size // 1024} KB)"
        )


if __name__ == '__main__':
    main()
