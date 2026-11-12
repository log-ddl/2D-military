"""Hệ vật liệu PBR quân sự bằng Shader Nodes gốc của Blender 5.2 (`Principled BSDF` + `Noise` + `Voronoi` + `Bevel` + `Ambient Occlusion`):
- `military_paint()`: Sơn quân sự đa dụng (đơn sắc hoặc loang ngụy trang `camo`, mòn mép kim loại, bụi bẩn, vi nhám).
- `armor_plate()`: Thép cán / thép đúc giáp hạng nặng (bề mặt rỗ đúc vi mô, cạnh mòn sáng).
- `panel_paint()`: Vỏ tấm ghép khí tài (máy bay, tàu chiến, tên lửa, radar) có rãnh ghép tấm Brick/Voronoi.
- `machined_metal()`: Kim loại tiện / phay xước cơ khí (nòng pháo, trục truyền động, xi-lanh, khung sườn máy bay).
- `optical_glass()`: Kính quang học vật lý (buồng lái, kính ngắm, đầu dò quang điện).
- `replace_materials()`: Thay thế vật liệu cho danh sách mesh (dùng khi mô hình BlenderKit dính sơn/logo dân sự hoặc cần đồng bộ màu sơn quân sự).
"""
from __future__ import annotations
import bpy


def _hex_to_rgba(hex_str: str | tuple | list, alpha: float = 1.0) -> tuple[float, float, float, float]:
    if isinstance(hex_str, (tuple, list)):
        if len(hex_str) >= 4:
            return (float(hex_str[0]), float(hex_str[1]), float(hex_str[2]), float(hex_str[3]))
        return (float(hex_str[0]), float(hex_str[1]), float(hex_str[2]), alpha)
    h = str(hex_str).lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    r = int(h[0:2], 16) / 255.0
    g = int(h[2:4], 16) / 255.0
    b = int(h[4:6], 16) / 255.0
    # Chuyển sRGB sang Linear gần đúng cho Blender Shader Nodes
    return (r ** 2.2, g ** 2.2, b ** 2.2, alpha)


def military_paint(
    name: str = 'MilitaryPaint',
    color: str = '#4b5338',
    camo: list[str] | None = None,
    camo_scale: float = 2.5,
    wear: float = 0.22,
    dirt: float = 0.25,
    roughness: float = 0.58,
    metallic: float = 0.25,
    bump_strength: float = 0.08,
) -> bpy.types.Material:
    """Sơn quân sự PBR: hỗ trợ loang ngụy trang `camo`, vết xước kim loại và vi nhám bề mặt."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Metallic'].default_value = float(metallic)
    bsdf.inputs['Roughness'].default_value = float(roughness)
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    tex_coord = nt.nodes.new('ShaderNodeTexCoord')

    # Lớp màu nền + ngụy trang (nếu có)
    base_rgba = _hex_to_rgba(color)
    current_color_socket = None

    rgb_base = nt.nodes.new('ShaderNodeRGB')
    rgb_base.outputs[0].default_value = base_rgba
    current_color_socket = rgb_base.outputs[0]

    if camo:
        for idx, c_hex in enumerate(camo):
            noise_camo = nt.nodes.new('ShaderNodeTexNoise')
            noise_camo.inputs['Scale'].default_value = float(camo_scale) * (1.0 + idx * 0.35)
            noise_camo.inputs['Detail'].default_value = 3.5
            noise_camo.inputs['Roughness'].default_value = 0.6
            nt.links.new(tex_coord.outputs['Object'], noise_camo.inputs['Vector'])

            ramp = nt.nodes.new('ShaderNodeValToRGB')
            ramp.color_ramp.interpolation = 'CONSTANT' if len(camo) >= 3 else 'LINEAR'
            ramp.color_ramp.elements[0].position = 0.48 + idx * 0.04
            ramp.color_ramp.elements[0].color = (0, 0, 0, 1)
            ramp.color_ramp.elements[1].position = 0.53 + idx * 0.04
            ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
            nt.links.new(noise_camo.outputs['Fac'], ramp.inputs['Fac'])

            mix_camo = nt.nodes.new('ShaderNodeMix')
            mix_camo.data_type = 'RGBA'
            mix_camo.inputs['B'].default_value = _hex_to_rgba(c_hex)
            nt.links.new(ramp.outputs['Color'], mix_camo.inputs['Factor'])
            nt.links.new(current_color_socket, mix_camo.inputs['A'])
            current_color_socket = mix_camo.outputs['Result']

    # Lớp bụi bẩn & mòn sơn kim loại bằng Noise chi tiết cao
    noise_wear = nt.nodes.new('ShaderNodeTexNoise')
    noise_wear.inputs['Scale'].default_value = 14.0
    noise_wear.inputs['Detail'].default_value = 8.0
    noise_wear.inputs['Roughness'].default_value = 0.72
    nt.links.new(tex_coord.outputs['Object'], noise_wear.inputs['Vector'])

    if wear > 0 or dirt > 0:
        mix_dirt = nt.nodes.new('ShaderNodeMix')
        mix_dirt.data_type = 'RGBA'
        mix_dirt.inputs['Factor'].default_value = min(0.65, float(dirt) * 0.5 + float(wear) * 0.35)
        mix_dirt.inputs['B'].default_value = (0.18, 0.17, 0.15, 1.0)
        nt.links.new(current_color_socket, mix_dirt.inputs['A'])
        current_color_socket = mix_dirt.outputs['Result']

    nt.links.new(current_color_socket, bsdf.inputs['Base Color'])

    # Vi nhám Bump
    if bump_strength > 0:
        bump = nt.nodes.new('ShaderNodeBump')
        bump.inputs['Strength'].default_value = float(bump_strength)
        bump.inputs['Distance'].default_value = 0.008
        nt.links.new(noise_wear.outputs['Fac'], bump.inputs['Height'])
        nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])

    return mat


def armor_plate(
    name: str = 'ArmorPlate',
    color: str = '#3d4435',
    roughness: float = 0.62,
    metallic: float = 0.45,
) -> bpy.types.Material:
    """Thép cán / thép đúc giáp hạng nặng với bề mặt rỗ đúc vi mô."""
    return military_paint(
        name=name,
        color=color,
        wear=0.32,
        dirt=0.28,
        roughness=roughness,
        metallic=metallic,
        bump_strength=0.14,
    )


def panel_paint(
    name: str = 'PanelPaint',
    color: str = '#8c969e',
    roughness: float = 0.36,
    metallic: float = 0.78,
    panel_scale: float = 6.0,
) -> bpy.types.Material:
    """Vỏ tấm ghép nhôm/thép hàng không & hải quân (có rãnh ghép tấm Brick Texture)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = _hex_to_rgba(color)
    bsdf.inputs['Metallic'].default_value = float(metallic)
    bsdf.inputs['Roughness'].default_value = float(roughness)
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])

    tex_coord = nt.nodes.new('ShaderNodeTexCoord')
    brick = nt.nodes.new('ShaderNodeTexBrick')
    brick.inputs['Scale'].default_value = float(panel_scale)
    brick.inputs['Mortar Size'].default_value = 0.012
    brick.inputs['Mortar Smooth'].default_value = 0.1
    brick.inputs['Color1'].default_value = _hex_to_rgba(color)
    brick.inputs['Color2'].default_value = tuple(c * 0.92 for c in _hex_to_rgba(color)[:3]) + (1.0,)
    brick.inputs['Mortar'].default_value = (0.04, 0.045, 0.05, 1.0)
    nt.links.new(tex_coord.outputs['Object'], brick.inputs['Vector'])
    nt.links.new(brick.outputs['Color'], bsdf.inputs['Base Color'])

    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.15
    bump.inputs['Distance'].default_value = 0.006
    nt.links.new(brick.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def machined_metal(
    name: str = 'MachinedMetal',
    color: str = '#b8c2cc',
    roughness: float = 0.26,
    metallic: float = 0.92,
) -> bpy.types.Material:
    """Kim loại tiện / phay cơ khí sáng bóng (lõi động cơ, trục khuỷu, khung sườn giải phẫu, nòng pháo)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = _hex_to_rgba(color)
    bsdf.inputs['Metallic'].default_value = float(metallic)
    bsdf.inputs['Roughness'].default_value = float(roughness)
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def optical_glass(
    name: str = 'OpticalGlass',
    tint: str = '#a8d8ff',
    alpha: float = 0.28,
    roughness: float = 0.05,
    ior: float = 1.52,
) -> bpy.types.Material:
    """Kính quang học trong suốt cho buồng lái, cửa sổ khoang khách, đầu dò quang điện."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = _hex_to_rgba(tint)
    bsdf.inputs['Roughness'].default_value = float(roughness)
    bsdf.inputs['IOR'].default_value = float(ior)
    bsdf.inputs['Alpha'].default_value = float(alpha)
    if 'Transmission Weight' in bsdf.inputs:
        bsdf.inputs['Transmission Weight'].default_value = 0.85
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return mat


def replace_materials(
    mesh_objs: list[bpy.types.Object],
    new_mat: bpy.types.Material,
    only_slot_Keywords: list[str] | None = None,
) -> None:
    """Thay thế vật liệu trên danh sách mesh (toàn bộ hoặc chỉ các slot khớp từ khoá như logo/livery dân sự)."""
    kws = [k.lower() for k in (only_slot_Keywords or [])]
    for obj in mesh_objs:
        if obj.type != 'MESH' or not obj.data:
            continue
        if not obj.data.materials:
            obj.data.materials.append(new_mat)
            continue
        for i, slot_mat in enumerate(obj.data.materials):
            if not kws:
                obj.data.materials[i] = new_mat
            else:
                mname = (slot_mat.name if slot_mat else '').lower()
                if any(k in mname for k in kws):
                    obj.data.materials[i] = new_mat
