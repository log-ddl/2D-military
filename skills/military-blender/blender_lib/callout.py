"""Hệ thống chú thích kỹ thuật `<Callout>` và `<Label>` dựng trực tiếp 100% trong Blender 5.2 (`callout.py`):
- `add_callout_3d()`: Tạo tâm ngắm ô vuông kép tại điểm neo 3D `at_3d` + đường gióng vẽ dần (`bevel_factor_end`) + hộp nhãn chữ in hoa tại `to_3d` tự động hướng mặt về Camera (`Track To`).
- Khi mở file `.blend` và bấm Spacebar, toàn bộ Callout và đường chỉ hiển thị trực tiếp ở 60 FPS cùng khí tài 3D.
"""
from __future__ import annotations
import bpy
from mathutils import Vector


def _make_emission_mat(name: str, color: tuple[float, float, float], strength: float = 4.5) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*color, 1.0)
    em.inputs['Strength'].default_value = float(strength)
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    return mat


def _make_plate_mat(name: str, bg_color: tuple[float, float, float] = (0.015, 0.025, 0.04)) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*bg_color, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.85
    bsdf.inputs['Metallic'].default_value = 0.1
    if 'Emission Color' in bsdf.inputs:
        bsdf.inputs['Emission Color'].default_value = (*bg_color, 1.0)
        bsdf.inputs['Emission Strength'].default_value = 0.6
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def _face_camera(obj: bpy.types.Object, cam_obj: bpy.types.Object | None) -> None:
    if cam_obj is None:
        return
    tr = obj.constraints.new(type='TRACK_TO')
    tr.target = cam_obj
    tr.track_axis = 'TRACK_Z'
    tr.up_axis = 'UP_Y'


def add_callout_3d(
    text: str,
    at_3d: tuple[float, float, float],
    to_3d: tuple[float, float, float],
    appear_frames: tuple[int, int] | None = None,
    hide_frames: tuple[int, int] | None = None,
    color: tuple[float, float, float] = (0.18, 0.82, 1.0),
    text_size: float = 0.46,
    line_thickness: float = 0.022,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Tạo chú thích kỹ thuật 3D (Tâm ngắm + Đường gióng gãy khúc + Bảng chữ hướng về Camera):
    - `at_3d`: Toạ độ 3D trên bộ phận khí tài nơi đặt tâm ngắm.
    - `to_3d`: Toạ độ 3D trong không gian nơi đặt bảng chữ chú thích.
    - `appear_frames`: `(f_start, f_end)` hiệu ứng vẽ đường gióng và bung hộp chữ.
    - `hide_frames`: `(h_start, h_end)` hiệu ứng thu gọn và ẩn đi khi đọc xong.
    """
    scn = bpy.context.scene
    cam = scn.camera
    root = bpy.data.objects.new(f'Callout_{text[:14]}', None)
    root.empty_display_type = 'PLAIN_AXES'
    scn.collection.objects.link(root)
    if parent is not None:
        root.parent = parent

    mat_accent = _make_emission_mat(f'CalloutAccent_{text[:10]}', color, strength=5.5)
    mat_white = _make_emission_mat(f'CalloutText_{text[:10]}', (0.98, 0.99, 1.0), strength=4.2)
    mat_plate = _make_plate_mat(f'CalloutPlate_{text[:10]}')

    p_at = Vector(at_3d)
    p_to = Vector(to_3d)
    # Điểm khuỷu gãy góc 45 độ tự nhiên giữa at_3d và to_3d
    p_elbow = Vector((
        p_at.x + (p_to.x - p_at.x) * 0.65,
        p_at.y + (p_to.y - p_at.y) * 0.65,
        p_to.z,
    ))

    # 1. Tâm ngắm (Reticle ô vuông + chấm tâm) tại at_3d hướng về Camera
    reticle = bpy.data.objects.new(f'Reticle_{text[:10]}', None)
    reticle.location = p_at
    scn.collection.objects.link(reticle)
    reticle.parent = root
    _face_camera(reticle, cam)

    r_size = text_size * 0.36
    crv_ret = bpy.data.curves.new(f'ReticleCurve_{text[:10]}', type='CURVE')
    crv_ret.dimensions = '3D'
    crv_ret.bevel_depth = line_thickness * 0.85
    sp_ret = crv_ret.splines.new('POLY')
    sp_ret.use_cyclic_u = True
    corners = [(-r_size, -r_size, 0), (r_size, -r_size, 0), (r_size, r_size, 0), (-r_size, r_size, 0)]
    sp_ret.points.add(len(corners) - 1)
    for i, c in enumerate(corners):
        sp_ret.points[i].co = (*c, 1.0)
    ret_box = bpy.data.objects.new(f'ReticleBox_{text[:10]}', crv_ret)
    scn.collection.objects.link(ret_box)
    ret_box.parent = reticle
    ret_box.data.materials.append(mat_accent)

    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=line_thickness * 2.2, location=(0, 0, 0))
    ret_dot = bpy.context.active_object
    ret_dot.name = f'ReticleDot_{text[:10]}'
    ret_dot.parent = reticle
    ret_dot.data.materials.append(mat_white)

    # 2. Đường gióng (Leader Line) nối từ at_3d -> p_elbow -> to_3d
    crv_line = bpy.data.curves.new(f'LeaderCurve_{text[:10]}', type='CURVE')
    crv_line.dimensions = '3D'
    crv_line.bevel_depth = line_thickness
    crv_line.bevel_resolution = 3
    sp_line = crv_line.splines.new('POLY')
    sp_line.points.add(2)
    for idx, pt in enumerate((p_at, p_elbow, p_to)):
        sp_line.points[idx].co = (pt.x, pt.y, pt.z, 1.0)
    line_obj = bpy.data.objects.new(f'LeaderLine_{text[:10]}', crv_line)
    scn.collection.objects.link(line_obj)
    line_obj.parent = root
    line_obj.data.materials.append(mat_accent)

    # 3. Hộp nhãn chữ (Billboard hướng thẳng về Camera) tại to_3d
    badge = bpy.data.objects.new(f'Badge_{text[:10]}', None)
    badge.location = p_to
    scn.collection.objects.link(badge)
    badge.parent = root
    _face_camera(badge, cam)

    label_str = text.upper()
    txt_curve = bpy.data.curves.new(f'CalloutFont_{text[:10]}', type='FONT')
    txt_curve.body = label_str
    txt_curve.size = float(text_size)
    txt_curve.align_x = 'CENTER'
    txt_curve.align_y = 'CENTER'
    txt_curve.extrude = 0.008
    txt_obj = bpy.data.objects.new(f'CalloutText_{text[:10]}', txt_curve)
    scn.collection.objects.link(txt_obj)
    txt_obj.parent = badge
    txt_obj.location = (0.0, 0.0, 0.025)
    txt_obj.data.materials.append(mat_white)

    # Tính kích thước hộp nền theo độ dài chuỗi chữ
    box_w = max(text_size * 2.2, len(label_str) * text_size * 0.58 + text_size * 0.9)
    box_h = text_size * 1.45

    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.0))
    plate = bpy.context.active_object
    plate.name = f'CalloutPlate_{text[:10]}'
    plate.parent = badge
    plate.scale = (box_w, box_h, 1.0)
    plate.data.materials.append(mat_plate)

    # Viền sáng thanh đứng bên trái hộp nhãn
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(-box_w * 0.5 + text_size * 0.08, 0, 0.012))
    bar = bpy.context.active_object
    bar.name = f'CalloutBar_{text[:10]}'
    bar.parent = badge
    bar.scale = (text_size * 0.14, box_h, 1.0)
    bar.data.materials.append(mat_accent)

    for o in (ret_box, ret_dot, line_obj, txt_obj, plate, bar):
        if hasattr(o, 'visible_shadow'):
            o.visible_shadow = False

    # 4. Keyframe hoạt cảnh mở ra (appear_frames) và đóng lại (hide_frames)
    if appear_frames is not None:
        f0, f1 = int(appear_frames[0]), int(appear_frames[1])
        f_mid = int(round((f0 + f1) * 0.5))

        reticle.scale = (0.001, 0.001, 0.001)
        reticle.keyframe_insert(data_path='scale', frame=max(1, f0 - 1))
        reticle.scale = (1.0, 1.0, 1.0)
        reticle.keyframe_insert(data_path='scale', frame=f_mid)

        crv_line.bevel_factor_end = 0.0
        crv_line.keyframe_insert(data_path='bevel_factor_end', frame=f0)
        crv_line.bevel_factor_end = 1.0
        crv_line.keyframe_insert(data_path='bevel_factor_end', frame=f1)

        badge.scale = (0.001, 0.001, 0.001)
        badge.keyframe_insert(data_path='scale', frame=f_mid)
        badge.scale = (1.0, 1.0, 1.0)
        badge.keyframe_insert(data_path='scale', frame=f1)

    if hide_frames is not None:
        h0, h1 = int(hide_frames[0]), int(hide_frames[1])
        badge.scale = (1.0, 1.0, 1.0)
        badge.keyframe_insert(data_path='scale', frame=h0)
        badge.scale = (0.001, 0.001, 0.001)
        badge.keyframe_insert(data_path='scale', frame=h1)

        crv_line.bevel_factor_end = 1.0
        crv_line.keyframe_insert(data_path='bevel_factor_end', frame=h0)
        crv_line.bevel_factor_end = 0.0
        crv_line.keyframe_insert(data_path='bevel_factor_end', frame=h1)

        reticle.scale = (1.0, 1.0, 1.0)
        reticle.keyframe_insert(data_path='scale', frame=h0)
        reticle.scale = (0.001, 0.001, 0.001)
        reticle.keyframe_insert(data_path='scale', frame=h1)

    return root
