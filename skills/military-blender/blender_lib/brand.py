"""Gắn Logo Kênh dạng lớp sơn Stencil uốn cong ôm sát bề mặt vật thể/khí tài 3D trong Blender (`brand.py`):
- Tự động đọc file vector `library/brand/logo_white.svg` / `logo_black.svg` và cấu hình màu trong `library/brand/brand.json`.
- Chỉ dùng duy nhất kiểu sơn Stencil (`add_brand_decal`) dùng `Shrinkwrap` ép ôm khít mặt cong thân máy bay, cánh đứng đuôi,
  tháp pháo xe tăng, vỏ tàu chiến hoặc thùng hàng quân sự.
- Tự động chọn màu sơn sáng (`lightTint`) hoặc tối (`darkTint`) tương phản hài hoà với màu bề mặt của vật thể (`variant='auto'`),
  kèm hiệu ứng mòn xước nhẹ (`wear`) như lớp sơn thực tế trên vỏ khí tài.
"""
from __future__ import annotations
import json
import math
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[3]
BRAND_DIR = ROOT / 'library/brand'


def _hex_to_rgb_linear(hex_str: str) -> tuple[float, float, float]:
    h = hex_str.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return (
        (int(h[0:2], 16) / 255.0) ** 2.2,
        (int(h[2:4], 16) / 255.0) ** 2.2,
        (int(h[4:6], 16) / 255.0) ** 2.2,
    )


def _read_brand_cfg() -> dict:
    cfg = {
        'darkTint': '#14181f',
        'lightTint': '#e8eef5',
        'stencilOpacity': 0.48,
    }
    cfg_file = BRAND_DIR / 'brand.json'
    if cfg_file.is_file():
        try:
            cfg.update(json.loads(cfg_file.read_text(encoding='utf-8')))
        except Exception:
            pass
    return cfg


def _estimate_target_luminance(target_mesh: bpy.types.Object) -> float:
    """Ước lượng độ sáng bề mặt của `target_mesh` (0..1) để tự chọn sơn stencil màu tối hay màu sáng."""
    if not target_mesh or not getattr(target_mesh, 'data', None):
        return 0.25
    mats = getattr(target_mesh.data, 'materials', None)
    if not mats:
        return 0.25
    for m in mats:
        if m and m.use_nodes and m.node_tree:
            for node in m.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED' and 'Base Color' in node.inputs:
                    col = node.inputs['Base Color'].default_value
                    return 0.2126 * float(col[0]) + 0.7152 * float(col[1]) + 0.0722 * float(col[2])
    return 0.25


def _load_svg_logo_obj(name: str = 'BrandLogoSVG', variant: str = 'light') -> bpy.types.Object | None:
    """Nạp trực tiếp `library/brand/logo_white.svg` hoặc `logo_black.svg` thành đối tượng 3D chuẩn hoá rộng 1.0m, tâm tại (0,0,0)."""
    svg_candidates = (
        ['logo_black.svg', 'logo_white.svg', 'logo.svg']
        if variant == 'dark'
        else ['logo_white.svg', 'logo.svg', 'logo_black.svg']
    )
    svg_path = None
    for fn in svg_candidates:
        cand = BRAND_DIR / fn
        if cand.is_file():
            svg_path = cand
            break
    if svg_path is None:
        return None

    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=str(svg_path))
    imported = [o for o in bpy.data.objects if o not in before and o.type == 'CURVE']
    if not imported:
        return None

    bpy.ops.object.select_all(action='DESELECT')
    for o in imported:
        o.select_set(True)
    bpy.context.view_layer.objects.active = imported[0]
    if len(imported) > 1:
        bpy.ops.object.join()
    crv_obj = bpy.context.view_layer.objects.active
    crv_obj.name = name
    crv_obj.data.extrude = 0.0

    bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')
    crv_obj.location = (0.0, 0.0, 0.0)
    bpy.context.view_layer.update()
    dims = crv_obj.dimensions.copy()
    max_dim = max(dims.x, dims.y, 1e-4)
    scale_f = 1.0 / max_dim
    crv_obj.scale = (scale_f, scale_f, 1.0)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return crv_obj


def _make_stencil_paint_mat(
    name: str,
    tint: tuple[float, float, float],
    opacity: float = 0.48,
    wear: float = 0.18,
    roughness: float = 0.52,
) -> bpy.types.Material:
    """Tạo vật liệu sơn Stencil mờ tự nhiên (có vết mài mòn vi mô bằng Noise, không phát sáng giả tạo)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    nt = mat.node_tree
    nt.nodes.clear()

    out_node = nt.nodes.new('ShaderNodeOutputMaterial')
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Base Color'].default_value = (*tint, 1.0)
    bsdf.inputs['Roughness'].default_value = float(roughness)
    bsdf.inputs['Metallic'].default_value = 0.15

    mix_sh = nt.nodes.new('ShaderNodeMixShader')
    if wear > 0.01:
        tex_coord = nt.nodes.new('ShaderNodeTexCoord')
        noise = nt.nodes.new('ShaderNodeTexNoise')
        noise.inputs['Scale'].default_value = 18.0
        noise.inputs['Detail'].default_value = 5.0
        noise.inputs['Roughness'].default_value = 0.65
        nt.links.new(tex_coord.outputs['Object'], noise.inputs['Vector'])

        ramp = nt.nodes.new('ShaderNodeValToRGB')
        ramp.color_ramp.elements[0].position = max(0.0, min(0.6, float(wear) * 0.85))
        ramp.color_ramp.elements[0].color = (0.25, 0.25, 0.25, 1.0)
        ramp.color_ramp.elements[1].position = min(1.0, ramp.color_ramp.elements[0].position + 0.35)
        ramp.color_ramp.elements[1].color = (1.0, 1.0, 1.0, 1.0)
        nt.links.new(noise.outputs['Fac'], ramp.inputs['Fac'])

        mult = nt.nodes.new('ShaderNodeMath')
        mult.operation = 'MULTIPLY'
        mult.inputs[0].default_value = float(opacity)
        nt.links.new(ramp.outputs['Color'], mult.inputs[1])
        nt.links.new(mult.outputs[0], mix_sh.inputs['Fac'])
    else:
        mix_sh.inputs['Fac'].default_value = float(opacity)

    nt.links.new(transp.outputs['BSDF'], mix_sh.inputs[1])
    nt.links.new(bsdf.outputs['BSDF'], mix_sh.inputs[2])
    nt.links.new(mix_sh.outputs['Shader'], out_node.inputs['Surface'])
    return mat


def add_brand_decal(
    target_mesh: bpy.types.Object,
    parent_root: bpy.types.Object | None = None,
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation_deg: tuple[float, float, float] = (90.0, 0.0, 0.0),
    rotation: tuple[float, float, float] | None = None,
    size: tuple[float, float] | float = (1.5, 1.5),
    variant: str = 'auto',
    tint: tuple[float, float, float] | None = None,
    opacity: float | None = None,
    wear: float = 0.18,
) -> bpy.types.Object:
    """Sơn Stencil Logo Kênh uốn cong ôm khít bề mặt vật thể/khí tài (`target_mesh`) bằng `Shrinkwrap`:
    - `variant`: `'auto'` (tự động đo độ sáng của `target_mesh`: vỏ sáng màu bạc/trắng/cát -> sơn tối `darkTint`;
      vỏ tối màu xanh lính/xám/ngụy trang -> sơn sáng `lightTint`), hoặc chỉ định `'light'` / `'dark'`.
    - `opacity`: mặc định lấy `stencilOpacity` (`0.46`) từ `library/brand/brand.json` để hoà quyện tự nhiên như lớp sơn thật.
    """
    cfg = _read_brand_cfg()
    if variant == 'auto':
        lum = _estimate_target_luminance(target_mesh)
        chosen_variant = 'dark' if lum > 0.42 else 'light'
    else:
        chosen_variant = 'dark' if variant.lower() in ('dark', 'black') else 'light'

    if tint is None:
        hex_col = cfg['darkTint'] if chosen_variant == 'dark' else cfg['lightTint']
        tint = _hex_to_rgb_linear(hex_col)
    if opacity is None:
        opacity = float(cfg.get('stencilOpacity', 0.48))

    logo_obj = _load_svg_logo_obj('BrandDecalSVG', variant=chosen_variant)
    if logo_obj is None:
        bpy.ops.mesh.primitive_plane_add(size=1.0, location=location)
        logo_obj = bpy.context.active_object
    else:
        bpy.ops.object.select_all(action='DESELECT')
        logo_obj.select_set(True)
        bpy.context.view_layer.objects.active = logo_obj
        bpy.ops.object.convert(target='MESH')
        # Chia lưới mịn để Shrinkwrap uốn mượt theo bề mặt cong của thân máy bay / tháp pháo / vỏ tàu
        rem = logo_obj.modifiers.new(name='DecalSubdiv', type='SUBSURF')
        rem.subdivision_type = 'SIMPLE'
        rem.levels = 2
        rem.render_levels = 2

    w = float(size[0]) if isinstance(size, (tuple, list)) else float(size)
    logo_obj.scale = (w, w, w)
    logo_obj.location = location
    if rotation is not None:
        logo_obj.rotation_euler = (float(rotation[0]), float(rotation[1]), float(rotation[2]))
    else:
        logo_obj.rotation_euler = (
            math.radians(rotation_deg[0]),
            math.radians(rotation_deg[1]),
            math.radians(rotation_deg[2]),
        )
    if parent_root is not None:
        logo_obj.parent = parent_root

    sw = logo_obj.modifiers.new(name='DecalShrinkwrap', type='SHRINKWRAP')
    sw.target = target_mesh
    sw.wrap_method = 'NEAREST_SURFACEPOINT'
    sw.wrap_mode = 'OUTSIDE_SURFACE'
    sw.offset = 0.008

    mat = _make_stencil_paint_mat('BrandStencilMat', tint=tint, opacity=opacity, wear=wear)
    logo_obj.data.materials.clear()
    logo_obj.data.materials.append(mat)
    if hasattr(logo_obj, 'visible_shadow'):
        logo_obj.visible_shadow = False
    return logo_obj
