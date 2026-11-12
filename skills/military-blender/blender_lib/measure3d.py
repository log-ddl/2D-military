"""Thước đo kích thước phối cảnh 3D trực tiếp trong Blender (measure3d.py).
Vẽ thanh gióng `|——— 19.7 M LENGTH ———|` phát sáng sắc nét trong không gian 3D.
"""
from __future__ import annotations
import math
import bpy
from mathutils import Vector


def add_measure_3d(
    from_pt: tuple[float, float, float],
    to_pt: tuple[float, float, float],
    text: str,
    color: tuple[float, float, float] = (0.22, 0.74, 0.98),
    font_size: float = 0.72,
    tick_size: float = 0.65,
    thickness: float = 0.045,
    appear_frames: tuple[int, int] | None = None,
    hide_frames: tuple[int, int] | None = None,
) -> bpy.types.Object:
    """Tạo thước đo 3D phát sáng kèm chữ nổi trong cảnh Blender."""
    scn = bpy.context.scene
    a = Vector(from_pt)
    b = Vector(to_pt)
    mid = (a + b) * 0.5
    diff = b - a
    length = diff.length
    if length < 1e-4:
        return None

    root = bpy.data.objects.new(f'Measure_{text}', None)
    scn.collection.objects.link(root)
    root.location = mid

    # Xoay trục +X của root dọc theo vector từ a -> b, trục +Z hướng lên
    x_axis = diff.normalized()
    up_ref = Vector((0.0, 0.0, 1.0))
    if abs(x_axis.dot(up_ref)) > 0.96:
        up_ref = Vector((0.0, 1.0, 0.0))
    y_axis = up_ref.cross(x_axis).normalized()
    z_axis = x_axis.cross(y_axis).normalized()

    mat_rot = root.matrix_world.to_3x3()
    mat_rot.col[0] = x_axis
    mat_rot.col[1] = y_axis
    mat_rot.col[2] = z_axis
    root.rotation_euler = mat_rot.to_euler()

    mat = bpy.data.materials.new(f'MeasureMat_{text}')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    emiss = nt.nodes.new('ShaderNodeEmission')
    emiss.inputs['Color'].default_value = (*color, 1.0)
    emiss.inputs['Strength'].default_value = 3.2
    nt.links.new(emiss.outputs['Emission'], out_node.inputs['Surface'])

    # Thanh ngang chính
    bpy.ops.mesh.primitive_cube_add(size=1.0)
    bar = bpy.context.active_object
    bar.name = f'Bar_{text}'
    bar.parent = root
    bar.location = (0.0, 0.0, 0.0)
    bar.scale = (length, thickness, thickness)
    bar.data.materials.append(mat)

    # Hai vạch chặn đầu (ticks)
    for sign in (-0.5, 0.5):
        bpy.ops.mesh.primitive_cube_add(size=1.0)
        tick = bpy.context.active_object
        tick.parent = root
        tick.location = (sign * length, 0.0, 0.0)
        tick.scale = (thickness * 1.4, thickness * 1.2, tick_size)
        tick.data.materials.append(mat)

    # Chữ thông số
    font_curve = bpy.data.curves.new(type='FONT', name=f'Text_{text}')
    font_curve.body = text
    font_curve.size = float(font_size)
    font_curve.align_x = 'CENTER'
    font_curve.align_y = 'BOTTOM'
    font_curve.extrude = 0.015
    txt_obj = bpy.data.objects.new(f'TextObj_{text}', font_curve)
    scn.collection.objects.link(txt_obj)
    txt_obj.parent = root
    txt_obj.location = (0.0, 0.0, tick_size * 0.35 + 0.12)
    txt_obj.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    txt_obj.data.materials.append(mat)

    if appear_frames is not None:
        f0, f1 = int(appear_frames[0]), int(appear_frames[1])
        root.scale = (0.001, 0.001, 0.001)
        root.keyframe_insert(data_path='scale', frame=max(1, f0 - 1))
        root.keyframe_insert(data_path='scale', frame=f0)
        root.scale = (1.0, 1.0, 1.0)
        root.keyframe_insert(data_path='scale', frame=f1)

    if hide_frames is not None:
        h0, h1 = int(hide_frames[0]), int(hide_frames[1])
        root.scale = (1.0, 1.0, 1.0)
        root.keyframe_insert(data_path='scale', frame=h0)
        root.scale = (0.001, 0.001, 0.001)
        root.keyframe_insert(data_path='scale', frame=h1)

    return root
