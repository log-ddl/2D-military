"""Bộ đồ nghề Hiệu ứng Vật lý & Kỹ thuật 3D tổng quát trong Blender 5.2 (fx.py).

LƯU Ý QUAN TRỌNG:
- Đây là BỘ ĐỒ NGHỀ (Toolbox), KHÔNG phải khuôn mẫu bắt buộc cho mọi cảnh.
- Chỉ gọi đúng công cụ mà nội dung lời thoại (`voice`) và kịch bản (`STORY.md` / `C01.md`) của cảnh đó yêu cầu:
  + Cảnh bắn/nổ chiến trường -> `add_explosion`, `add_muzzle_blast`, `add_smoke_column`
  + Cảnh tên lửa / tiêm kích phản lực -> `add_jet_plume`
  + Cảnh cánh quạt / trực thăng / tuabin -> `add_rotor_blur`
  + Cảnh phân tích luồng khí / sóng xung kích / trường từ quanh vật thể -> `add_surface_curves` (BVHTree chống đâm xuyên)
  + Cảnh có vệt khói / vệt đạn bám theo điểm chuyển động -> `add_attached_trail`
  + Cảnh cần mây / sương mù / khói thể tích -> `add_volumetric_domain`
  + Cảnh biển / hải quân -> `add_water_surface`
  + Cảnh mặt đất tự nhiên / sàn kỹ thuật -> `add_displaced_terrain`, `scatter_instances`, `add_technical_floor`
"""
from __future__ import annotations
import math
import random
import bpy
import bmesh
from mathutils import Vector
from mathutils.bvhtree import BVHTree


# ==============================================================================
# 1. CHÁY NỔ, ĐẦU NÒNG, LUỒNG PHỤT PHẢN LỰC & ĐĨA MỜ CÁNH QUẠT
# ==============================================================================

def add_explosion(
    location: tuple[float, float, float],
    at_frame: int,
    size: float = 4.5,
    duration_frames: int = 75,
    seed: int = 1,
) -> bpy.types.Object:
    """Vụ nổ 3D tại `location` bắt đầu ở `at_frame`: cầu lửa bức xạ nhiệt + sóng xung kích + cột khói."""
    scn = bpy.context.scene
    root = bpy.data.objects.new(f'Explosion_{at_frame}', None)
    scn.collection.objects.link(root)
    root.location = location

    # Cầu lửa trung tâm nở nhanh rồi tắt
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1.0)
    fireball = bpy.context.active_object
    fireball.name = f'Fireball_{at_frame}'
    fireball.parent = root

    mat = bpy.data.materials.new(f'FireballMat_{at_frame}')
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    emiss = nt.nodes.new('ShaderNodeEmission')
    emiss.inputs['Color'].default_value = (1.0, 0.42, 0.08, 1.0)
    emiss.inputs['Strength'].default_value = 28.0

    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 3.5
    noise.inputs['Detail'].default_value = 5.0

    fade_val = nt.nodes.new('ShaderNodeValue')
    fade_val.outputs[0].default_value = 0.0
    fade_val.outputs[0].keyframe_insert(data_path='default_value', frame=max(1, at_frame - 1))
    fade_val.outputs[0].default_value = 1.0
    fade_val.outputs[0].keyframe_insert(data_path='default_value', frame=at_frame + 2)
    fade_val.outputs[0].default_value = 0.0
    fade_val.outputs[0].keyframe_insert(data_path='default_value', frame=at_frame + int(duration_frames * 0.45))

    mult = nt.nodes.new('ShaderNodeMath')
    mult.operation = 'MULTIPLY'
    nt.links.new(noise.outputs['Fac'], mult.inputs[0])
    nt.links.new(fade_val.outputs[0], mult.inputs[1])

    mix_sh = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(mult.outputs[0], mix_sh.inputs['Fac'])
    nt.links.new(transp.outputs['BSDF'], mix_sh.inputs[1])
    nt.links.new(emiss.outputs['Emission'], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs['Shader'], out_node.inputs['Surface'])
    fireball.data.materials.append(mat)

    fireball.scale = (0.01, 0.01, 0.01)
    fireball.keyframe_insert(data_path='scale', frame=max(1, at_frame - 1))
    fireball.scale = (size, size, size * 0.85)
    fireball.keyframe_insert(data_path='scale', frame=at_frame + 10)
    fireball.scale = (size * 1.45, size * 1.45, size * 1.3)
    fireball.keyframe_insert(data_path='scale', frame=at_frame + duration_frames)
    fireball.location = (0.0, 0.0, size * 0.35)
    fireball.keyframe_insert(data_path='location', frame=at_frame)
    fireball.location = (0.0, 0.0, size * 1.6)
    fireball.keyframe_insert(data_path='location', frame=at_frame + duration_frames)

    return root


def add_jet_plume(
    parent_obj: bpy.types.Object,
    local_pos: tuple[float, float, float] = (-4.0, 0.0, 0.0),
    direction: tuple[float, float, float] = (-1.0, 0.0, 0.0),
    length: float = 4.2,
    radius: float = 0.36,
    color: tuple[float, float, float] = (1.0, 0.48, 0.12),
) -> bpy.types.Object:
    """Luồng phụt động cơ phản lực / tên lửa phát sáng HDR gắn vào miệng xả `parent_obj`."""
    bpy.ops.mesh.primitive_cone_add(
        vertices=28,
        radius1=radius,
        radius2=radius * 0.08,
        depth=length,
    )
    plume = bpy.context.active_object
    plume.name = 'JetPlume3D'
    plume.parent = parent_obj
    dir_v = Vector(direction).normalized()
    plume.location = Vector(local_pos) + dir_v * (length * 0.5)
    plume.rotation_euler = dir_v.to_track_quat('-Z', 'Y').to_euler()

    mat = bpy.data.materials.new('JetPlumeMat')
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    emiss = nt.nodes.new('ShaderNodeEmission')
    emiss.inputs['Color'].default_value = (*color, 1.0)
    emiss.inputs['Strength'].default_value = 22.0

    tex_coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tex_coord.outputs['Generated'], sep.inputs['Vector'])

    mix_sh = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(sep.outputs['Z'], mix_sh.inputs['Fac'])
    nt.links.new(transp.outputs['BSDF'], mix_sh.inputs[1])
    nt.links.new(emiss.outputs['Emission'], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs['Shader'], out_node.inputs['Surface'])
    plume.data.materials.append(mat)
    return plume


def add_rotor_blur(
    parent_obj: bpy.types.Object,
    local_pos: tuple[float, float, float],
    radius: float = 1.75,
    normal_axis: str = 'X',
    opacity: float = 0.24,
    color: tuple[float, float, float] = (0.78, 0.82, 0.88),
) -> bpy.types.Object:
    """Đĩa mờ cánh quạt quay tốc độ cao (propeller / helicopter rotor motion blur disc)."""
    bpy.ops.mesh.primitive_circle_add(vertices=64, radius=radius, fill_type='TRIFAN')
    disc = bpy.context.active_object
    disc.name = 'RotorBlurDisc'
    disc.parent = parent_obj
    disc.location = local_pos
    if normal_axis.upper() == 'X':
        disc.rotation_euler = (0.0, math.pi / 2.0, 0.0)
    elif normal_axis.upper() == 'Y':
        disc.rotation_euler = (math.pi / 2.0, 0.0, 0.0)

    mat = bpy.data.materials.new('RotorBlurMat')
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.35

    mix_sh = nt.nodes.new('ShaderNodeMixShader')
    mix_sh.inputs['Fac'].default_value = float(opacity)
    nt.links.new(transp.outputs['BSDF'], mix_sh.inputs[1])
    nt.links.new(bsdf.outputs['BSDF'], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs['Shader'], out_node.inputs['Surface'])
    disc.data.materials.append(mat)
    return disc


# ==============================================================================
# 2. ĐƯỜNG CONG BÁM BỀ MẶT BVHTREE (CHỐNG ĐÂM XUYÊN) & VỆT KHÓI GẮN SOCKET
# ==============================================================================

def _build_combined_bvh(meshes: list[bpy.types.Object]) -> BVHTree:
    bpy.context.view_layer.update()
    bm_all = bmesh.new()
    for m in meshes:
        if m.type != 'MESH' or not m.visible_get():
            continue
        bm_part = bmesh.new()
        bm_part.from_mesh(m.data)
        bm_part.transform(m.matrix_world)
        for v in bm_part.verts:
            bm_all.verts.new(v.co)
        bm_all.verts.ensure_lookup_table()
        offset = len(bm_all.verts) - len(bm_part.verts)
        for f in bm_part.faces:
            try:
                bm_all.faces.new([bm_all.verts[v.index + offset] for v in f.verts])
            except ValueError:
                pass
        bm_part.free()
    bvh = BVHTree.FromBMesh(bm_all)
    bm_all.free()
    return bvh


def add_surface_curves(
    target_meshes: list[bpy.types.Object],
    x_span: tuple[float, float] = (12.0, -12.0),
    y_seeds: tuple[float, ...] = (-4.8, -2.6, -1.0, -0.45, 0.45, 1.0, 2.6, 4.8),
    z_seeds: tuple[float, ...] = (2.2, 3.0, 3.8, 4.5),
    clearance: float = 0.28,
    bevel_radius: float = 0.022,
    color: tuple[float, float, float] = (0.15, 0.82, 1.0),
    morph_color: tuple[float, float, float] | None = None,
    morph_frames: tuple[int, int] | None = None,
) -> bpy.types.Collection:
    """Tạo các đường cong kỹ thuật 3D tự động trượt ôm quanh bề mặt thật của vật thể (nhờ BVHTree),
    tuyệt đối không đâm xuyên qua thân/cánh/giáp. Dùng khi kịch bản cần minh hoạ luồng khí, sóng xung kích, từ trường.
    """
    bvh = _build_combined_bvh(target_meshes)
    col = bpy.data.collections.new('SurfaceCurves3D')
    bpy.context.scene.collection.children.link(col)

    mat = bpy.data.materials.new('SurfaceCurveMat')
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()

    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    emiss = nt.nodes.new('ShaderNodeEmission')
    emiss.inputs['Color'].default_value = (*color, 1.0)
    emiss.inputs['Strength'].default_value = 5.5

    if morph_color is not None and morph_frames is not None:
        f0, f1 = int(morph_frames[0]), int(morph_frames[1])
        emiss.inputs['Color'].keyframe_insert(data_path='default_value', frame=f0)
        emiss.inputs['Color'].default_value = (*morph_color, 1.0)
        emiss.inputs['Color'].keyframe_insert(data_path='default_value', frame=f1)

    uv_node = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(uv_node.outputs['Generated'], sep.inputs['Vector'])

    scn = bpy.context.scene
    wave_add = nt.nodes.new('ShaderNodeMath')
    wave_add.operation = 'ADD'
    nt.links.new(sep.outputs['X'], wave_add.inputs[0])
    wave_add.inputs[1].default_value = 0.0
    wave_add.inputs[1].keyframe_insert(data_path='default_value', frame=scn.frame_start)
    wave_add.inputs[1].default_value = -6.0
    wave_add.inputs[1].keyframe_insert(data_path='default_value', frame=scn.frame_end)

    wave_sin = nt.nodes.new('ShaderNodeMath')
    wave_sin.operation = 'SINE'
    wave_mult = nt.nodes.new('ShaderNodeMath')
    wave_mult.operation = 'MULTIPLY'
    wave_mult.inputs[1].default_value = 18.0
    nt.links.new(wave_add.outputs[0], wave_mult.inputs[0])
    nt.links.new(wave_mult.outputs[0], wave_sin.inputs[0])

    remap_pulse = nt.nodes.new('ShaderNodeMapRange')
    remap_pulse.inputs['From Min'].default_value = -1.0
    remap_pulse.inputs['From Max'].default_value = 1.0
    remap_pulse.inputs['To Min'].default_value = 0.12
    remap_pulse.inputs['To Max'].default_value = 0.65
    nt.links.new(wave_sin.outputs[0], remap_pulse.inputs['Value'])

    mix_sh = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(remap_pulse.outputs['Result'], mix_sh.inputs['Fac'])
    nt.links.new(transp.outputs['BSDF'], mix_sh.inputs[1])
    nt.links.new(emiss.outputs['Emission'], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs['Shader'], out_node.inputs['Surface'])

    steps = 36
    x0, x1 = x_span
    idx = 0
    for y0 in y_seeds:
        for z0 in z_seeds:
            if abs(y0) > 1.8 and z0 > 3.2:
                continue
            pts: list[Vector] = []
            cur_y, cur_z = float(y0), float(z0)
            for s in range(steps + 1):
                u = s / steps
                x = x0 + (x1 - x0) * u
                cur_y = cur_y * 0.85 + y0 * 0.15
                cur_z = cur_z * 0.85 + z0 * 0.15
                p = Vector((x, cur_y, cur_z))
                loc, norm, _, dist = bvh.find_nearest(p, 2.5)
                if loc is not None and dist is not None:
                    vec_from_surf = p - loc
                    radial_out = Vector((0.0, p.y, p.z - 2.6))
                    if radial_out.length > 1e-4:
                        radial_out.normalize()
                    else:
                        radial_out = Vector((0.0, 0.0, 1.0))
                    is_inside = vec_from_surf.dot(radial_out) < 0.0 or (norm is not None and vec_from_surf.dot(norm) < 0.0)
                    if is_inside or dist < clearance:
                        push_dir = radial_out if radial_out.length > 1e-4 else norm
                        p = loc + push_dir * clearance
                        cur_y, cur_z = p.y, p.z
                pts.append(p)

            for _ in range(3):
                smoothed = [pts[0]]
                for i in range(1, len(pts) - 1):
                    sm = (pts[i - 1] + pts[i] * 2.0 + pts[i + 1]) * 0.25
                    loc, norm, _, dist = bvh.find_nearest(sm, clearance)
                    if loc is not None and dist is not None and dist < clearance:
                        radial_out = Vector((0.0, sm.y, sm.z - 2.6)).normalized()
                        sm = loc + radial_out * clearance
                    smoothed.append(sm)
                smoothed.append(pts[-1])
                pts = smoothed

            curve_data = bpy.data.curves.new(f'SurfaceCurve_{idx}', type='CURVE')
            curve_data.dimensions = '3D'
            curve_data.bevel_depth = float(bevel_radius)
            curve_data.use_fill_caps = False
            spline = curve_data.splines.new('NURBS')
            spline.points.add(len(pts) - 1)
            for pi, pt in enumerate(pts):
                spline.points[pi].co = (pt.x, pt.y, pt.z, 1.0)
            spline.use_endpoint_u = True

            c_obj = bpy.data.objects.new(f'SurfaceCurve_{idx}', curve_data)
            c_obj.data.materials.append(mat)
            col.objects.link(c_obj)
            idx += 1

    return col


def add_attached_trails(
    parent_root: bpy.types.Object,
    target_meshes: list[bpy.types.Object],
    trail_length: float = 16.0,
    max_opacity: float = 0.28,
) -> list[bpy.types.Object]:
    """Gắn dải khói mảnh trực tiếp vào 2 đỉnh ngoài cùng của cánh/thân (`parent = parent_root`)
    với độ mờ giảm dần về 0 ở đuôi, không bao giờ bị lệch toạ độ khi vật thể nghiêng/leo cao.
    """
    bpy.context.view_layer.update()
    inv_root = parent_root.matrix_world.inverted()

    min_y_pt = Vector((0.0, 0.0, 0.0))
    max_y_pt = Vector((0.0, 0.0, 0.0))
    for m in target_meshes:
        if m.type != 'MESH' or not m.visible_get():
            continue
        mw = inv_root @ m.matrix_world
        for v in m.data.vertices:
            co = mw @ v.co
            if co.y < min_y_pt.y:
                min_y_pt = co.copy()
            if co.y > max_y_pt.y:
                max_y_pt = co.copy()

    mat = bpy.data.materials.new('AttachedTrailMat')
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()

    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    principled = nt.nodes.new('ShaderNodeBsdfPrincipled')
    principled.inputs['Base Color'].default_value = (0.92, 0.96, 1.0, 1.0)
    principled.inputs['Roughness'].default_value = 0.9

    tex_coord = nt.nodes.new('ShaderNodeTexCoord')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(tex_coord.outputs['Generated'], sep.inputs['Vector'])

    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = (max_opacity, max_opacity, max_opacity, 1.0)
    ramp.color_ramp.elements[1].position = 0.95
    ramp.color_ramp.elements[1].color = (0.0, 0.0, 0.0, 1.0)
    nt.links.new(sep.outputs['X'], ramp.inputs['Fac'])

    mix_sh = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(ramp.outputs['Color'], mix_sh.inputs['Fac'])
    nt.links.new(transp.outputs['BSDF'], mix_sh.inputs[1])
    nt.links.new(principled.outputs['BSDF'], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs['Shader'], out_node.inputs['Surface'])

    trails: list[bpy.types.Object] = []
    for side_idx, tip in enumerate((min_y_pt, max_y_pt)):
        cdata = bpy.data.curves.new(f'AttachedTrail_{side_idx}', type='CURVE')
        cdata.dimensions = '3D'
        cdata.bevel_depth = 0.055
        spline = cdata.splines.new('NURBS')
        n_pts = 10
        spline.points.add(n_pts - 1)
        for i in range(n_pts):
            u = i / (n_pts - 1)
            spline.points[i].co = (tip.x - u * trail_length, tip.y, tip.z - u * 0.25, 1.0)
            spline.points[i].radius = max(0.05, 1.0 - u * 0.85)
        spline.use_endpoint_u = True

        tobj = bpy.data.objects.new(f'AttachedTrail_{side_idx}', cdata)
        tobj.parent = parent_root
        tobj.data.materials.append(mat)
        bpy.context.scene.collection.objects.link(tobj)
        trails.append(tobj)

    return trails


# ==============================================================================
# 3. ĐỒ NGHỀ ĐỊA HÌNH, BIỂN, KHỐI THỂ TÍCH (MÂY/SƯƠNG/KHÓI) & SÀN KỸ THUẬT
# ==============================================================================

def add_volumetric_domain(
    name: str = 'VolumetricDomain',
    location: tuple[float, float, float] = (0.0, 0.0, -8.0),
    size: tuple[float, float, float] = (420.0, 420.0, 14.0),
    density: float = 0.14,
    coverage: float = 0.52,
    noise_scale: float = 0.028,
    detail: float = 5.5,
    color: tuple[float, float, float] = (0.90, 0.94, 1.0),
    emission_tint: tuple[float, float, float] = (0.12, 0.16, 0.24),
    emission_strength: float = 0.04,
    wind_offset_per_sec: tuple[float, float, float] = (1.2, 0.2, 0.0),
) -> bpy.types.Object:
    """Tạo vùng thể tích 3D (mây, sương mù thung lũng, khói chiến trường, bụi sa mạc) bằng Principled Volume."""
    bpy.ops.mesh.primitive_cube_add(size=1.0, location=location)
    vol_box = bpy.context.active_object
    vol_box.name = name
    vol_box.scale = (size[0], size[1], size[2])
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    mat = bpy.data.materials.new(f'{name}_VolMat')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    vol_bsdf = nt.nodes.new('ShaderNodeVolumePrincipled')
    vol_bsdf.inputs['Color'].default_value = (*color, 1.0)
    vol_bsdf.inputs['Anisotropy'].default_value = 0.45
    vol_bsdf.inputs['Emission Color'].default_value = (*emission_tint, 1.0)
    vol_bsdf.inputs['Emission Strength'].default_value = float(emission_strength)

    tex_coord = nt.nodes.new('ShaderNodeTexCoord')
    mapping = nt.nodes.new('ShaderNodeMapping')

    scn = bpy.context.scene
    fps = max(1, scn.render.fps)
    dur_s = (scn.frame_end - scn.frame_start) / fps
    mapping.inputs['Location'].default_value = (0.0, 0.0, 0.0)
    mapping.inputs['Location'].keyframe_insert(data_path='default_value', frame=scn.frame_start)
    mapping.inputs['Location'].default_value = (
        wind_offset_per_sec[0] * dur_s * 0.05,
        wind_offset_per_sec[1] * dur_s * 0.05,
        wind_offset_per_sec[2] * dur_s * 0.05,
    )
    mapping.inputs['Location'].keyframe_insert(data_path='default_value', frame=scn.frame_end)

    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.noise_dimensions = '3D'
    noise.inputs['Scale'].default_value = float(noise_scale)
    noise.inputs['Detail'].default_value = float(detail)
    noise.inputs['Roughness'].default_value = 0.62

    ramp = nt.nodes.new('ShaderNodeValToRGB')
    low_edge = max(0.1, min(0.85, 1.0 - coverage))
    ramp.color_ramp.elements[0].position = low_edge
    ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    ramp.color_ramp.elements[1].position = min(0.98, low_edge + 0.28)
    ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)

    sep_xyz = nt.nodes.new('ShaderNodeSeparateXYZ')
    z_ramp = nt.nodes.new('ShaderNodeValToRGB')
    z_ramp.color_ramp.elements[0].position = 0.05
    z_ramp.color_ramp.elements[0].color = (0.0, 0.0, 0.0, 1.0)
    el_mid = z_ramp.color_ramp.elements.new(0.5)
    el_mid.color = (1.0, 1.0, 1.0, 1.0)
    z_ramp.color_ramp.elements[2].position = 0.95
    z_ramp.color_ramp.elements[2].color = (0.0, 0.0, 0.0, 1.0)

    mult_fade = nt.nodes.new('ShaderNodeMath')
    mult_fade.operation = 'MULTIPLY'
    mult_dens = nt.nodes.new('ShaderNodeMath')
    mult_dens.operation = 'MULTIPLY'
    mult_dens.inputs[1].default_value = float(density)

    nt.links.new(tex_coord.outputs['Object'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(tex_coord.outputs['Generated'], sep_xyz.inputs['Vector'])
    nt.links.new(sep_xyz.outputs['Z'], z_ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], mult_fade.inputs[0])
    nt.links.new(z_ramp.outputs['Color'], mult_fade.inputs[1])
    nt.links.new(mult_fade.outputs['Value'], mult_dens.inputs[0])
    nt.links.new(mult_dens.outputs['Value'], vol_bsdf.inputs['Density'])
    nt.links.new(vol_bsdf.outputs['Volume'], out_node.inputs['Volume'])

    vol_box.data.materials.append(mat)
    return vol_box


def add_displaced_terrain(
    name: str = 'Terrain',
    size: float = 650.0,
    subdivisions: int = 140,
    height_amp: float = 18.0,
    z_base: float = 0.0,
    flat_center_radius: float = 0.0,
    seed: int = 17,
    color_low: tuple[float, float, float] = (0.14, 0.22, 0.13),
    color_high: tuple[float, float, float] = (0.34, 0.32, 0.28),
    roughness: float = 0.88,
) -> bpy.types.Object:
    """Tạo mặt đất / địa hình 3D với màu sắc và biên độ cao thấp tuỳ biến theo đúng thiết kế trong STORY.md."""
    bpy.ops.mesh.primitive_grid_add(
        x_subdivisions=subdivisions,
        y_subdivisions=subdivisions,
        size=size,
        location=(0.0, 0.0, z_base),
    )
    terr = bpy.context.active_object
    terr.name = name

    mesh = terr.data
    for v in mesh.vertices:
        x, y = v.co.x, v.co.y
        h = (
            math.sin(x * 0.015 + seed) * math.cos(y * 0.015 - seed * 0.5) * height_amp * 0.55
            + math.sin(x * 0.038 - y * 0.029 + seed * 1.7) * height_amp * 0.28
            + math.cos(x * 0.085 + y * 0.072 + seed * 3.1) * height_amp * 0.12
            + math.sin(y * 0.011) * height_amp * 0.35
        )
        if flat_center_radius > 0.0:
            r = math.hypot(x, y)
            if r < flat_center_radius:
                h = 0.0
            elif r < flat_center_radius * 1.45:
                u = (r - flat_center_radius) / (flat_center_radius * 0.45)
                smooth_u = u * u * (3.0 - 2.0 * u)
                h *= smooth_u
        v.co.z = h

    mesh.update()
    bpy.ops.object.shade_smooth()

    mat = bpy.data.materials.new(f'{name}_Mat')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Roughness'].default_value = float(roughness)

    tex_coord = nt.nodes.new('ShaderNodeTexCoord')
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 18.0
    noise.inputs['Detail'].default_value = 8.0
    noise.inputs['Roughness'].default_value = 0.7

    mix_col = nt.nodes.new('ShaderNodeMix')
    mix_col.data_type = 'RGBA'
    mix_col.inputs[6].default_value = (*color_low, 1.0)
    mix_col.inputs[7].default_value = (*color_high, 1.0)

    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.5

    nt.links.new(tex_coord.outputs['Object'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], mix_col.inputs[0])
    nt.links.new(mix_col.outputs[2], bsdf.inputs['Base Color'])
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

    terr.data.materials.append(mat)
    return terr


def scatter_instances(
    surface_obj: bpy.types.Object,
    proto_meshes: list[bpy.types.Object],
    count: int = 90,
    area: tuple[float, float, float, float] = (-200.0, -200.0, 200.0, 200.0),
    scale_range: tuple[float, float] = (0.85, 1.45),
    seed: int = 19,
) -> bpy.types.Collection:
    """Rải các bản sao linked instances của đạo cụ/cây/đá từ BlenderKit lên bề mặt `surface_obj`."""
    bpy.context.view_layer.update()
    bm = bmesh.new()
    bm.from_mesh(surface_obj.data)
    bm.transform(surface_obj.matrix_world)
    bvh = BVHTree.FromBMesh(bm)
    bm.free()

    col = bpy.data.collections.new('ScatteredInstances')
    bpy.context.scene.collection.children.link(col)

    rng = random.Random(seed)
    x0, y0, x1, y1 = area
    for i in range(count):
        rx = rng.uniform(x0, x1)
        ry = rng.uniform(y0, y1)
        loc, _, _, _ = bvh.ray_cast(Vector((rx, ry, 500.0)), Vector((0.0, 0.0, -1.0)), 1000.0)
        if loc is None:
            continue
        sc = rng.uniform(scale_range[0], scale_range[1])
        rz = rng.uniform(0.0, math.pi * 2.0)
        for m in proto_meshes:
            inst = bpy.data.objects.new(f'Inst_{i}_{m.name}', m.data)
            inst.location = loc
            inst.rotation_euler = (0.0, 0.0, rz)
            inst.scale = (sc, sc, sc)
            col.objects.link(inst)

    return col


def add_water_surface(
    size: float = 800.0,
    z: float = 0.0,
    color: tuple[float, float, float] = (0.02, 0.09, 0.18),
    wave_scale: float = 28.0,
    wave_bump: float = 0.28,
) -> bpy.types.Object:
    """Tạo mặt biển / sông PBR có sóng động theo thời gian dùng cho bối cảnh hải quân / đổ bộ."""
    bpy.ops.mesh.primitive_grid_add(x_subdivisions=120, y_subdivisions=120, size=size, location=(0.0, 0.0, z))
    water = bpy.context.active_object
    water.name = 'WaterSurface'

    mat = bpy.data.materials.new('WaterSurfaceMat')
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = 0.08
    bsdf.inputs['Metallic'].default_value = 0.15

    tex_coord = nt.nodes.new('ShaderNodeTexCoord')
    mapping = nt.nodes.new('ShaderNodeMapping')
    scn = bpy.context.scene
    mapping.inputs['Location'].default_value = (0.0, 0.0, 0.0)
    mapping.inputs['Location'].keyframe_insert(data_path='default_value', frame=scn.frame_start)
    mapping.inputs['Location'].default_value = (1.5, 0.8, 0.0)
    mapping.inputs['Location'].keyframe_insert(data_path='default_value', frame=scn.frame_end)

    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = float(wave_scale)
    noise.inputs['Detail'].default_value = 6.0
    noise.inputs['Roughness'].default_value = 0.55

    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = float(wave_bump)

    nt.links.new(tex_coord.outputs['Object'], mapping.inputs['Vector'])
    nt.links.new(mapping.outputs['Vector'], noise.inputs['Vector'])
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    water.data.materials.append(mat)
    return water
