"""Blender worker đóng gói các clip `.fbx` từ kho Mixamo thành 1 file `.glb` (`NLA_TRACKS`) gọn nhẹ.

Độc lập chủ đề (dùng chung cho quân sự, lịch sử, khoa học, dân sự):
- Chuẩn hoá tên 65 xương Mixamo (`mixamorig:Hips` -> `Hips`, không dấu `:`).
- Thêm 2 xương gắn đạo cụ tuỳ chọn (`weapon_mount` con của `Spine2` + `muzzle_socket` đầu đạo cụ).
- Tự động đo vận tốc mặt đất thực (`speed_mps`) từ Root Motion xương `Hips` và khử trôi ngang thành `In-Place` không trượt chân.
- Hỗ trợ 4 chế độ tay cầm đạo cụ (`none`/`slung`, `two_hand` kèm bù IK swing tối thiểu cho vai giáp rộng, `reload_rh`/`rh_hold`, `grenade_lh`/`lh_hold`).
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Euler, Matrix, Vector

DEFAULT_PROP_MOUNT = {
    'sling_butt_offset': [-0.115, 0.205, 0.165],
    'sling_dir': [0.34, 0.04, -0.94],
    'sling_up': [0.10, 0.99, 0.08],
    'muzzle_len': 0.845,
    'muzzle_up': 0.036,
    'grip_local': [0.018, 0.225, -0.072],
    'fore_local': [-0.020, 0.482, -0.020],
}


def canon_bone(name: str) -> str:
    """Chuẩn hoá tên xương Mixamo (`mixamorig:Hips`, `mixamorig1:Hips` -> `Hips`), bỏ dấu `:`."""
    return name.split(':', 1)[-1] if ':' in name else name


def assign_action_with_slot(arm, act):
    if not arm.animation_data:
        arm.animation_data_create()
    arm.animation_data.action = act
    if act is not None and hasattr(arm.animation_data, 'action_slot') and getattr(act, 'slots', None):
        if len(act.slots) > 0:
            arm.animation_data.action_slot = act.slots[0]


def smoothstep01(x: float) -> float:
    x = max(0.0, min(1.0, x))
    return x * x * (3.0 - 2.0 * x)


def build_mixamo67_armature(
    ref_fbx_path: Path,
    joint_head_map: dict[str, Vector] | None = None,
    prop_mount_cfg: dict | None = None,
):
    """Tạo bộ khung chuẩn 67 xương (`SoldierRig`, scale=1, rot=0) trong không gian mét Z-up của Blender:
    - 65 xương Mixamo chuẩn (giữ 100% ma trận hướng 3x3 từ FBX Mixamo, đặt đầu khớp theo `joint_head_map` nếu có)
    - `weapon_mount` (con của `Spine2`, Rest Pose đeo gọn sau lưng)
    - `muzzle_socket` (con của `weapon_mount`, điểm đầu đạo cụ / nòng)."""
    sc = bpy.context.scene
    sc.render.fps = 30
    sc.render.fps_base = 1.0
    pm = {**DEFAULT_PROP_MOUNT, **(prop_mount_cfg or {})}

    before_objs = set(bpy.data.objects)
    before_acts = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(ref_fbx_path))
    imp_objs = [o for o in bpy.data.objects if o not in before_objs]
    ref_arm = next(o for o in imp_objs if o.type == 'ARMATURE')

    ref_bones_info = []
    for b in ref_arm.data.bones:
        cname = canon_bone(b.name)
        pname = canon_bone(b.parent.name) if b.parent else None
        wh = ref_arm.matrix_world @ b.head_local
        wt = ref_arm.matrix_world @ b.tail_local
        m3 = (ref_arm.matrix_world @ b.matrix_local).to_3x3().normalized()
        ref_bones_info.append((cname, pname, wh.copy(), wt.copy(), m3.copy()))

    for o in imp_objs:
        ad = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if ad and ad.users == 0 and isinstance(ad, bpy.types.Armature):
            bpy.data.armatures.remove(ad)
    for act in list(bpy.data.actions):
        if act not in before_acts:
            bpy.data.actions.remove(act)

    jmap = joint_head_map or {}
    arm_data = bpy.data.armatures.new('ActorRigData')
    arm_obj = bpy.data.objects.new('SoldierRig', arm_data)
    sc.collection.objects.link(arm_obj)
    bpy.ops.object.select_all(action='DESELECT')
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj

    bpy.ops.object.mode_set(mode='EDIT')
    ebones = arm_data.edit_bones
    for cname, pname, wh, wt, m3 in ref_bones_info:
        eb = ebones.new(cname)
        eb.use_connect = False
        eb.use_deform = True
        if pname and pname in ebones:
            eb.parent = ebones[pname]
        length = max(0.025, (wt - wh).length)
        head_raw = jmap.get(cname)
        head_p = Vector(head_raw) if head_raw is not None else wh
        y_col = m3.col[1].normalized()
        z_col = m3.col[2].normalized()
        eb.head = head_p
        eb.tail = head_p + y_col * length
        eb.align_roll(z_col)

    sp2 = ebones['Spine2']
    wm = ebones.new('weapon_mount')
    wm.parent = sp2
    wm.use_connect = False
    wm.use_deform = True
    sling_butt = sp2.head + Vector(pm['sling_butt_offset'])
    sling_dir = Vector(pm['sling_dir']).normalized()
    sling_up = Vector(pm['sling_up']).normalized()
    wm.head = sling_butt
    wm.tail = sling_butt + sling_dir * 0.25
    wm.align_roll(sling_up)

    ms = ebones.new('muzzle_socket')
    ms.parent = wm
    ms.use_connect = False
    ms.use_deform = False
    mz_pos = sling_butt + sling_dir * float(pm['muzzle_len']) + sling_up * float(pm['muzzle_up'])
    ms.head = mz_pos
    ms.tail = mz_pos + sling_dir * 0.10
    ms.align_roll(sling_up)

    bpy.ops.object.mode_set(mode='OBJECT')
    for pb in arm_obj.pose.bones:
        pb.rotation_mode = 'QUATERNION'
    return arm_obj


def solve_prop_rot_from_two_hands(
    dir_world: Vector,
    rh_thumb_up: Vector,
    p_grip_local: Vector,
    p_fore_local: Vector,
) -> Matrix:
    """Giải ma trận xoay 3x3 đưa trục `(p_fore_local - p_grip_local)` trùng `dir_world`
    và trục đứng đạo cụ `+Z_wm` bám theo hướng ngón cái bàn tay phải `rh_thumb_up`."""
    u_loc = (p_fore_local - p_grip_local).normalized()
    z_loc_ref = Vector((0.0, 0.0, 1.0))
    w_loc = (z_loc_ref - z_loc_ref.dot(u_loc) * u_loc).normalized()
    v_loc = u_loc.cross(w_loc).normalized()
    B_loc = Matrix((u_loc, v_loc, w_loc)).transposed()

    u_w = dir_world.normalized()
    w_w_raw = rh_thumb_up - rh_thumb_up.dot(u_w) * u_w
    if w_w_raw.length < 1e-4:
        w_w_raw = Vector((0.0, 0.0, 1.0)) - Vector((0.0, 0.0, 1.0)).dot(u_w) * u_w
    w_w = w_w_raw.normalized()
    v_w = u_w.cross(w_w).normalized()
    B_w = Matrix((u_w, v_w, w_w)).transposed()

    return B_w @ B_loc.transposed()


def apply_minimal_swing_left_arm_ik(arm_obj, target_lm1_world: Vector, weight: float = 1.0):
    """Dịch nhẹ bàn tay trái (`LeftArm` + `LeftForeArm`) bằng phép quay swing tối thiểu từ chính FK Mixamo
    để `LeftHandMiddle1` bám khít vào điểm đỡ trước trên đạo cụ (bù sai khác bề rộng vai giáp),
    giữ nguyên mặt phẳng khuỷu tay, xoắn cẳng tay và độ cong ngón tay gốc."""
    if weight <= 1e-4:
        return
    mw = arm_obj.matrix_world
    mwi = mw.inverted()

    ua_pb = arm_obj.pose.bones['LeftArm']
    la_pb = arm_obj.pose.bones['LeftForeArm']
    hd_pb = arm_obj.pose.bones['LeftHand']
    lm1_pb = arm_obj.pose.bones['LeftHandMiddle1']

    S = mw @ ua_pb.head
    E_fk = mw @ la_pb.head
    W_fk = mw @ hd_pb.head
    LM1_fk = mw @ lm1_pb.head

    R_ua_fk = (mw @ ua_pb.matrix).to_3x3().normalized()
    R_la_fk = (mw @ la_pb.matrix).to_3x3().normalized()
    R_hd_fk = (mw @ hd_pb.matrix).to_3x3().normalized()

    hand_to_knuckle = LM1_fk - W_fk
    W_goal = W_fk.lerp(target_lm1_world - hand_to_knuckle, weight)

    L1 = (E_fk - S).length
    L2 = (W_fk - E_fk).length
    d_vec = W_goal - S
    raw_d = d_vec.length
    max_reach = max(0.05, L1 + L2 - 0.003)
    D = min(max_reach, max(abs(L1 - L2) + 0.003, raw_d))
    d_hat = d_vec.normalized() if raw_d > 1e-6 else Vector((0.0, -1.0, 0.0))

    e_rel = E_fk - S
    pole_perp = e_rel - e_rel.dot(d_hat) * d_hat
    if pole_perp.length < 1e-4:
        pole_perp = Vector((-0.5, 0.2, -0.8)) - Vector((-0.5, 0.2, -0.8)).dot(d_hat) * d_hat
    p_hat = pole_perp.normalized()

    cos_a = max(-1.0, min(1.0, (L1 * L1 + D * D - L2 * L2) / (2.0 * L1 * D)))
    sin_a = math.sqrt(max(0.0, 1.0 - cos_a * cos_a))

    E_tgt = S + L1 * (cos_a * d_hat + sin_a * p_hat)
    W_tgt = S + D * d_hat

    u1_fk = (E_fk - S).normalized()
    u1_tgt = (E_tgt - S).normalized()
    q_ua = u1_fk.rotation_difference(u1_tgt)
    R_ua_new = q_ua.to_matrix() @ R_ua_fk

    ua_pb.matrix = mwi @ (Matrix.Translation(S) @ R_ua_new.to_4x4())
    bpy.context.view_layer.update()

    E_now = mw @ la_pb.head
    u2_carried = (q_ua @ (W_fk - E_fk).normalized()).normalized()
    u2_tgt = (W_tgt - E_now).normalized()
    q_la = u2_carried.rotation_difference(u2_tgt)
    R_la_new = q_la.to_matrix() @ (q_ua.to_matrix() @ R_la_fk)

    la_pb.matrix = mwi @ (Matrix.Translation(E_now) @ R_la_new.to_4x4())
    bpy.context.view_layer.update()

    W_now = mw @ hd_pb.head
    hd_pb.matrix = mwi @ (Matrix.Translation(W_now) @ R_hd_fk.to_4x4())
    bpy.context.view_layer.update()


def calibrate_mesh_ground_offset(arm_obj, mesh_obj, ref_fbx_path: Path) -> float:
    """Đo chính xác độ cao đáy giày của `mesh_obj` ở khung đầu của `ref_fbx_path` để hiệu chuẩn chạm phẳng Z = 0.000m."""
    sc = bpy.context.scene
    mw = arm_obj.matrix_world
    dst_hips_rest = mw @ arm_obj.data.bones['Hips'].head_local

    before_objs = set(bpy.data.objects)
    before_acts = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=str(ref_fbx_path))
    imp_objs = [o for o in bpy.data.objects if o not in before_objs]
    src_arm = next(o for o in imp_objs if o.type == 'ARMATURE')
    src_act = src_arm.animation_data.action if src_arm.animation_data else None
    f0 = max(1, int(round(src_act.frame_range[0]))) if src_act else 1
    sc.frame_set(f0)
    bpy.context.view_layer.update()

    src_pb_map = {canon_bone(pb.name): pb for pb in src_arm.pose.bones}
    src_hips_rest = src_arm.matrix_world @ src_arm.data.bones[src_pb_map['Hips'].name].head_local
    hip_scale = dst_hips_rest.z / max(0.5, src_hips_rest.z)
    q_map = {cname: spb.rotation_quaternion.copy() for cname, spb in src_pb_map.items()}
    hips_w0 = (src_arm.matrix_world @ src_pb_map['Hips'].head).copy()

    for o in imp_objs:
        ad = o.data
        bpy.data.objects.remove(o, do_unlink=True)
        if ad and ad.users == 0 and isinstance(ad, bpy.types.Armature):
            bpy.data.armatures.remove(ad)
    for act in list(bpy.data.actions):
        if act not in before_acts:
            bpy.data.actions.remove(act)

    assign_action_with_slot(arm_obj, None)
    for pb in arm_obj.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    for cname, qv in q_map.items():
        if cname in arm_obj.pose.bones:
            arm_obj.pose.bones[cname].rotation_quaternion = qv
    dz0 = (hips_w0.z - src_hips_rest.z) * hip_scale
    hips_rest_m = mw @ arm_obj.data.bones['Hips'].matrix_local
    arm_obj.pose.bones['Hips'].location = hips_rest_m.to_3x3().inverted() @ Vector((0.0, 0.0, dz0))
    bpy.context.view_layer.update()

    depsgraph = bpy.context.evaluated_depsgraph_get()
    eval_mesh = mesh_obj.evaluated_get(depsgraph).to_mesh()
    min_z_eval = min((mesh_obj.matrix_world @ v.co).z for v in eval_mesh.vertices)
    mesh_obj.evaluated_get(depsgraph).to_mesh_clear()

    for pb in arm_obj.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    return -min_z_eval


def bake_mixamo_clips_onto_rig(
    arm_obj,
    mixamo_dir: Path,
    clips_spec: list[dict],
    p_grip_local: Vector,
    p_fore_local: Vector,
    z_ground_fix: float = 0.0,
) -> list[dict]:
    sc = bpy.context.scene
    mw = arm_obj.matrix_world
    mwi = mw.inverted()
    dst_hips_rest = mw @ arm_obj.data.bones['Hips'].head_local
    report: list[dict] = []

    for item in clips_spec:
        clip_name = item['clip']
        fbx_file = item['fbx']
        prop_mode = item.get('mode', 'none')
        fbx_path = mixamo_dir / fbx_file

        before_objs = set(bpy.data.objects)
        before_acts = set(bpy.data.actions)
        bpy.ops.import_scene.fbx(filepath=str(fbx_path))
        imp_objs = [o for o in bpy.data.objects if o not in before_objs]
        src_arm = next(o for o in imp_objs if o.type == 'ARMATURE')
        src_act = src_arm.animation_data.action if src_arm.animation_data else None

        f0 = max(1, int(round(src_act.frame_range[0])))
        f1 = max(f0 + 1, int(round(src_act.frame_range[1])))
        n_frames = f1 - f0 + 1
        dur_sec = max(1, f1 - f0) / 30.0

        src_pb_map = {canon_bone(pb.name): pb for pb in src_arm.pose.bones}
        src_hips_rest = src_arm.matrix_world @ src_arm.data.bones[src_pb_map['Hips'].name].head_local
        hip_scale = dst_hips_rest.z / max(0.5, src_hips_rest.z)

        sampled_quats = {b.name: [] for b in arm_obj.pose.bones if b.name in src_pb_map}
        sampled_hips_w = []
        sampled_rm1_w = []
        sampled_lm1_w = []
        sampled_rh_thumb_w = []

        for f in range(f0, f1 + 1):
            sc.frame_set(f)
            bpy.context.view_layer.update()
            for cname, spb in src_pb_map.items():
                if cname in sampled_quats:
                    sampled_quats[cname].append(spb.rotation_quaternion.copy())
            sampled_hips_w.append((src_arm.matrix_world @ src_pb_map['Hips'].head).copy())
            sampled_rm1_w.append((src_arm.matrix_world @ src_pb_map['RightHandMiddle1'].head).copy())
            sampled_lm1_w.append((src_arm.matrix_world @ src_pb_map['LeftHandMiddle1'].head).copy())
            rh_m3 = (src_arm.matrix_world @ src_pb_map['RightHand'].matrix).to_3x3().normalized()
            sampled_rh_thumb_w.append(rh_m3.col[0].copy())

        for o in imp_objs:
            ad = o.data
            bpy.data.objects.remove(o, do_unlink=True)
            if ad and ad.users == 0 and isinstance(ad, bpy.types.Armature):
                bpy.data.armatures.remove(ad)
        for act in list(bpy.data.actions):
            if act not in before_acts:
                bpy.data.actions.remove(act)

        dx_total = sampled_hips_w[-1].x - sampled_hips_w[0].x
        dy_total = sampled_hips_w[-1].y - sampled_hips_w[0].y
        raw_dist = math.hypot(dx_total, dy_total) * hip_scale
        has_root_motion = raw_dist > 0.12
        speed_mps = (raw_dist / dur_sec) if has_root_motion else 0.0

        new_act = bpy.data.actions.new(name=clip_name)
        assign_action_with_slot(arm_obj, new_act)
        for pb in arm_obj.pose.bones:
            pb.location = (0.0, 0.0, 0.0)
            pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            pb.scale = (1.0, 1.0, 1.0)

        hips_pb = arm_obj.pose.bones['Hips']
        hips_rest_rot3 = (mw @ arm_obj.data.bones['Hips'].matrix_local).to_3x3().normalized()
        hips_rest_rot3_inv = hips_rest_rot3.inverted()
        wm_pb = arm_obj.pose.bones['weapon_mount']
        rh_pb = arm_obj.pose.bones['RightHand']
        lh_pb = arm_obj.pose.bones['LeftHand']
        rm1_pb = arm_obj.pose.bones['RightHandMiddle1']

        T_rh_local = None
        T_lh_local = None
        d0_hands = (sampled_lm1_w[0] - sampled_rm1_w[0]).length

        for idx in range(n_frames):
            out_f = idx + 1
            sc.frame_set(out_f)

            for cname, q_list in sampled_quats.items():
                arm_obj.pose.bones[cname].rotation_quaternion = q_list[idx].copy()

            u = idx / max(1, n_frames - 1)
            p_hip = sampled_hips_w[idx]
            p0 = sampled_hips_w[0]
            if has_root_motion:
                wx = (p_hip.x - p0.x - u * dx_total) * hip_scale
                wy = (p_hip.y - p0.y - u * dy_total) * hip_scale
            else:
                wx = (p_hip.x - src_hips_rest.x) * hip_scale
                wy = (p_hip.y - src_hips_rest.y) * hip_scale
            wz = (p_hip.z - src_hips_rest.z) * hip_scale + z_ground_fix
            hips_pb.location = hips_rest_rot3_inv @ Vector((wx, wy, wz))
            bpy.context.view_layer.update()

            if prop_mode in ('none', 'slung'):
                wm_pb.location = (0.0, 0.0, 0.0)
                wm_pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
            else:
                dir_src = sampled_lm1_w[idx] - sampled_rm1_w[idx]
                dist_hands = dir_src.length
                R_two = solve_prop_rot_from_two_hands(dir_src, sampled_rh_thumb_w[idx], p_grip_local, p_fore_local)
                rm1_dst = mw @ rm1_pb.head
                butt_two = rm1_dst - (R_two @ p_grip_local)
                M_two = Matrix.Translation(butt_two) @ R_two.to_4x4()

                if idx == 0:
                    T_rh_local = (mw @ rh_pb.matrix).inverted() @ M_two
                    T_lh_local = (mw @ lh_pb.matrix).inverted() @ M_two

                if prop_mode == 'two_hand':
                    wm_pb.matrix = mwi @ M_two
                    bpy.context.view_layer.update()
                    p_fore_w = butt_two + (R_two @ p_fore_local)
                    apply_minimal_swing_left_arm_ik(arm_obj, p_fore_w, weight=1.0)
                elif prop_mode in ('reload_rh', 'rh_hold'):
                    w_one = smoothstep01((idx - 8) / 10.0) * (1.0 - smoothstep01((idx - (n_frames - 19)) / 10.0))
                    M_rh = (mw @ rh_pb.matrix) @ T_rh_local
                    q_blend = M_two.to_quaternion().slerp(M_rh.to_quaternion(), w_one)
                    p_blend = M_two.to_translation().lerp(M_rh.to_translation(), w_one)
                    M_final = Matrix.Translation(p_blend) @ q_blend.to_matrix().to_4x4()
                    wm_pb.matrix = mwi @ M_final
                    bpy.context.view_layer.update()
                    if 1.0 - w_one > 0.01:
                        p_fore_w = p_blend + (q_blend.to_matrix() @ p_fore_local)
                        apply_minimal_swing_left_arm_ik(arm_obj, p_fore_w, weight=(1.0 - w_one))
                elif prop_mode in ('grenade_lh', 'lh_hold'):
                    w_lh_dist = smoothstep01((dist_hands - (d0_hands + 0.025)) / 0.065)
                    w_lh_env = smoothstep01((idx - 4) / 6.0) * (1.0 - smoothstep01((idx - (n_frames - 11)) / 6.0))
                    w_lh = max(w_lh_dist, w_lh_env * 0.92 if 12 <= idx <= n_frames - 16 else 0.0)
                    if 1.0 - w_lh > 0.01:
                        p_fore_two = butt_two + (R_two @ p_fore_local)
                        apply_minimal_swing_left_arm_ik(arm_obj, p_fore_two, weight=(1.0 - w_lh))
                        if idx == 0:
                            T_lh_local = (mw @ lh_pb.matrix).inverted() @ M_two
                    M_lh = (mw @ lh_pb.matrix) @ T_lh_local
                    q_blend = M_two.to_quaternion().slerp(M_lh.to_quaternion(), w_lh)
                    p_blend = M_two.to_translation().lerp(M_lh.to_translation(), w_lh)
                    wm_pb.matrix = mwi @ (Matrix.Translation(p_blend) @ q_blend.to_matrix().to_4x4())
                    bpy.context.view_layer.update()

            for pb in arm_obj.pose.bones:
                if pb.name != 'muzzle_socket':
                    pb.keyframe_insert(data_path='rotation_quaternion', frame=out_f)
            hips_pb.keyframe_insert(data_path='location', frame=out_f)
            wm_pb.keyframe_insert(data_path='location', frame=out_f)

        info = {
            'clip': clip_name,
            'fbx': fbx_file,
            'mode': prop_mode,
            'frames': n_frames,
            'duration': round(dur_sec, 3),
            'speed_mps': round(speed_mps, 3),
            'root_motion_stripped': has_root_motion,
        }
        report.append(info)
        print(
            f"[mocap-pack] {clip_name:22s} | {n_frames:3d}f ({dur_sec:4.2f}s) "
            f"| v={speed_mps:4.2f} m/s | mode={prop_mode}"
        )

    return report


def wrap_plus_x_and_export(arm_obj, out_glb: Path, include_animations: bool):
    """Đưa nhân vật về hướng mặt chuẩn `+X` (Three.js Y-up) và xuất `.glb`."""
    sc = bpy.context.scene
    assign_action_with_slot(arm_obj, None)
    for pb in arm_obj.pose.bones:
        pb.location = (0.0, 0.0, 0.0)
        pb.rotation_quaternion = (1.0, 0.0, 0.0, 0.0)
        pb.scale = (1.0, 1.0, 1.0)

    if include_animations:
        if not arm_obj.animation_data:
            arm_obj.animation_data_create()
        for tr in list(arm_obj.animation_data.nla_tracks):
            arm_obj.animation_data.nla_tracks.remove(tr)
        for act in sorted(bpy.data.actions, key=lambda a: a.name):
            if getattr(act, 'slots', None) is not None and len(act.slots) == 0:
                continue
            trk = arm_obj.animation_data.nla_tracks.new()
            trk.name = act.name
            f0 = max(0, int(round(act.frame_range[0])))
            strip = trk.strips.new(act.name, f0, act)
            strip.name = act.name
            strip.action_frame_start = act.frame_range[0]
            strip.action_frame_end = act.frame_range[1]
            if hasattr(strip, 'action_slot') and getattr(act, 'slots', None) and len(act.slots) > 0:
                strip.action_slot = act.slots[0]
            trk.mute = False

    root_wrap = bpy.data.objects.new('ActorRootPlusX', None)
    sc.collection.objects.link(root_wrap)
    arm_obj.parent = root_wrap
    root_wrap.rotation_euler = Euler((0.0, 0.0, math.pi / 2), 'XYZ')
    bpy.context.view_layer.update()

    out_glb.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(out_glb),
        export_format='GLB',
        export_yup=True,
        export_skins=True,
        export_morph=False,
        export_def_bones=False,
        export_animations=include_animations,
        export_animation_mode='NLA_TRACKS',
        export_bake_animation=False,
        export_anim_slide_to_zero=True,
        export_optimize_animation_size=True,
        export_texcoords=True,
        export_normals=True,
        export_materials='EXPORT',
        export_image_format='WEBP',
        export_image_quality=90,
    )
    arm_obj.parent = None
    bpy.data.objects.remove(root_wrap, do_unlink=True)
    arm_obj.rotation_euler = (0.0, 0.0, 0.0)


def _load_rig_profile(base_rig_arg: str) -> dict:
    if not base_rig_arg:
        return {}
    p = Path(base_rig_arg)
    candidates = [p] if p.suffix == '.json' else [
        p.with_suffix('.meta.json'),
        p.with_suffix('.json'),
        p.parent / 'report_actor.json',
    ]
    for c in candidates:
        if c.is_file():
            data = json.loads(c.read_text(encoding='utf-8'))
            return data.get('rig_profile', data)
    return {}


def main():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

    def get_opt(flag: str, default: str = '') -> str:
        if flag in argv:
            idx = argv.index(flag)
            if idx + 1 < len(argv):
                return argv[idx + 1]
        return default

    mixamo_dir = Path(get_opt('--mixamo-dir'))
    spec_data = json.loads(Path(get_opt('--spec')).read_text(encoding='utf-8'))
    out_glb = Path(get_opt('--out'))
    report_json = Path(get_opt('--report'))
    rig_prof = _load_rig_profile(get_opt('--base-rig'))

    for o in list(bpy.data.objects):
        bpy.data.objects.remove(o, do_unlink=True)

    clips = spec_data['clips']
    pm_cfg = {
        **DEFAULT_PROP_MOUNT,
        **(spec_data.get('prop_mount') or {}),
        **(rig_prof.get('prop_mount') or {}),
    }
    if 'grip_local' in spec_data:
        pm_cfg['grip_local'] = spec_data['grip_local']
    if 'fore_local' in spec_data:
        pm_cfg['fore_local'] = spec_data['fore_local']

    joint_heads = {
        k: Vector(v) for k, v in (rig_prof.get('joint_heads') or {}).items()
    }
    z_ground_fix = float(rig_prof.get('z_ground_fix', spec_data.get('z_ground_fix', -0.0256)))

    ref_fbx = mixamo_dir / clips[0]['fbx']
    mix_arm = build_mixamo67_armature(ref_fbx, joint_head_map=joint_heads, prop_mount_cfg=pm_cfg)

    dm = bpy.data.meshes.new('AnimCarrierMesh')
    dm.from_pydata([(0.0, 0.0, 0.9), (0.0001, 0.0, 0.9), (0.0, 0.0001, 0.9)], [], [(0, 1, 2)])
    dm.update()
    dobj = bpy.data.objects.new('AnimCarrier', dm)
    bpy.context.scene.collection.objects.link(dobj)
    vg = dobj.vertex_groups.new(name='Hips')
    vg.add([0, 1, 2], 1.0, 'REPLACE')
    dobj.parent = mix_arm
    amod = dobj.modifiers.new(name='Armature', type='ARMATURE')
    amod.object = mix_arm

    p_grip = Vector(pm_cfg['grip_local'])
    p_fore = Vector(pm_cfg['fore_local'])
    report = bake_mixamo_clips_onto_rig(
        mix_arm,
        mixamo_dir=mixamo_dir,
        clips_spec=clips,
        p_grip_local=p_grip,
        p_fore_local=p_fore,
        z_ground_fix=z_ground_fix,
    )

    wrap_plus_x_and_export(mix_arm, out_glb, include_animations=True)
    report_json.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print(f"[mocap-pack] Xuất xong {len(report)} clip -> {out_glb} ({out_glb.stat().st_size // 1024} KB)")


if __name__ == '__main__':
    main()
