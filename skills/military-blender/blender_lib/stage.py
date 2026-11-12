"""Thiết lập sân khấu Blender 5.2 EEVEE Next: Bầu trời vật lý Nishita, Ánh sáng mặt trời, Sương mù Volumetric, Glare/Bloom và Motion Blur.

Múi toạ độ chuẩn trong Blender:
  - Mặt đất là mặt phẳng X–Y (Z = 0 là mặt đất, +Z hướng lên trời).
  - Mũi khí tài chính mặc định hướng dọc +X, sườn trái/phải theo trục Y.
"""
from __future__ import annotations
import math
import bpy


def init_stage(
    fps: int = 30,
    width: int = 1920,
    height: int = 1080,
    samples: int = 4,
    frame_start: int = 1,
    frame_end: int = 300,
    preset: str = 'daylight',
    sun_elevation_deg: float | None = None,
    sun_rotation_deg: float | None = None,
    sun_energy: float | None = None,
    air_density: float | None = None,
    dust_density: float | None = None,
    ozone_density: float | None = None,
    fog_density: float = 0.0,
    fog_color: tuple[float, float, float] = (0.55, 0.68, 0.85),
    motion_blur: bool = True,
    shutter: float = 0.45,
    use_raytracing: bool = False,
) -> bpy.types.Scene:
    """Khởi tạo cảnh Blender sạch và cấu hình chuẩn EEVEE 5.2 + Nishita Sky."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene

    # 1. Cấu hình độ phân giải & tốc độ khung hình
    scn.render.engine = 'BLENDER_EEVEE'
    scn.render.fps = int(fps)
    scn.render.resolution_x = int(width)
    scn.render.resolution_y = int(height)
    scn.render.resolution_percentage = 100
    scn.frame_start = int(frame_start)
    scn.frame_end = int(frame_end)

    # 2. Cấu hình EEVEE 5.2 (nhanh ở 4 samples, hỗ trợ nâng lên 8-16 khi xuất qua đêm)
    eevee = scn.eevee
    eevee.taa_render_samples = int(samples)
    eevee.taa_samples = max(4, min(16, int(samples)))
    if hasattr(eevee, 'use_raytracing'):
        eevee.use_raytracing = bool(use_raytracing)
    if hasattr(eevee, 'use_Shadow'):
        eevee.use_shadows = True
    if hasattr(eevee, 'volumetric_tile_size'):
        eevee.volumetric_tile_size = '4'
    if hasattr(eevee, 'volumetric_samples'):
        eevee.volumetric_samples = 64
    if hasattr(eevee, 'volumetric_start'):
        eevee.volumetric_start = 1.5
    if hasattr(eevee, 'volumetric_end'):
        eevee.volumetric_end = 320.0
    if hasattr(eevee, 'use_volumetric_shadows'):
        eevee.use_volumetric_shadows = True

    scn.render.use_motion_blur = bool(motion_blur)
    scn.render.motion_blur_shutter = float(shutter)

    # 3. Quản lý màu sắc điện ảnh
    try:
        scn.view_settings.view_transform = 'AgX'
        scn.view_settings.look = 'AgX - Medium High Contrast'
    except Exception:
        scn.view_settings.view_transform = 'Filmic'
    scn.view_settings.exposure = 0.0

    # 4. Preset thời gian trong ngày
    presets = {
        'dawn': {
            'sun_el': 4.5, 'sun_rot': 65.0, 'sun_e': 3.2,
            'air': 1.8, 'dust': 2.2, 'ozone': 1.6,
            'sun_col': (1.0, 0.68, 0.42), 'bg_strength': 0.55,
        },
        'golden_hour': {
            'sun_el': 9.5, 'sun_rot': 48.0, 'sun_e': 4.2,
            'air': 1.5, 'dust': 1.8, 'ozone': 1.3,
            'sun_col': (1.0, 0.78, 0.52), 'bg_strength': 0.75,
        },
        'daylight': {
            'sun_el': 34.0, 'sun_rot': 35.0, 'sun_e': 4.8,
            'air': 1.0, 'dust': 0.8, 'ozone': 1.0,
            'sun_col': (1.0, 0.96, 0.90), 'bg_strength': 1.0,
        },
        'high_altitude': {
            'sun_el': 42.0, 'sun_rot': 25.0, 'sun_e': 5.5,
            'air': 0.65, 'dust': 0.3, 'ozone': 1.8,
            'sun_col': (1.0, 0.98, 0.95), 'bg_strength': 1.1,
        },
        'hangar_lab': {
            'sun_el': 28.0, 'sun_rot': 40.0, 'sun_e': 2.6,
            'air': 1.0, 'dust': 1.0, 'ozone': 1.0,
            'sun_col': (0.85, 0.92, 1.0), 'bg_strength': 0.25,
        },
    }
    p = presets.get(preset, presets['daylight'])
    el_deg = sun_elevation_deg if sun_elevation_deg is not None else p['sun_el']
    rot_deg = sun_rotation_deg if sun_rotation_deg is not None else p['sun_rot']
    s_energy = sun_energy if sun_energy is not None else p['sun_e']

    # 5. World Shader: Nishita Physical Sky + tuỳ chọn Volumetric Scatter
    world = bpy.data.worlds.new('MilitaryWorld')
    scn.world = world
    world.use_nodes = True
    nt = world.node_tree
    nt.nodes.clear()

    out_node = nt.nodes.new('ShaderNodeOutputWorld')
    bg_node = nt.nodes.new('ShaderNodeBackground')
    bg_node.inputs['Strength'].default_value = p['bg_strength']

    if preset == 'hangar_lab':
        bg_node.inputs['Color'].default_value = (0.018, 0.032, 0.058, 1.0)
        nt.links.new(bg_node.outputs['Background'], out_node.inputs['Surface'])
    else:
        sky_node = nt.nodes.new('ShaderNodeTexSky')
        try:
            sky_node.sky_type = 'MULTIPLE_SCATTERING'
        except TypeError:
            sky_node.sky_type = 'NISHITA'
        sky_node.sun_disc = True
        sky_node.sun_size = math.radians(1.5)
        sky_node.sun_intensity = 0.85
        sky_node.sun_elevation = math.radians(el_deg)
        sky_node.sun_rotation = math.radians(rot_deg)
        if hasattr(sky_node, 'air_density'):
            sky_node.air_density = air_density if air_density is not None else p['air']
        if hasattr(sky_node, 'dust_density'):
            sky_node.dust_density = dust_density if dust_density is not None else p['dust']
        if hasattr(sky_node, 'ozone_density'):
            sky_node.ozone_density = ozone_density if ozone_density is not None else p['ozone']
        nt.links.new(sky_node.outputs['Color'], bg_node.inputs['Color'])
        nt.links.new(bg_node.outputs['Background'], out_node.inputs['Surface'])

    # Lưu ý: KHÔNG gắn Volume Scatter vào World Output vì trong EEVEE Volume ở vô cực sẽ chắn đen bầu trời Nishita!

    # 6. Đèn Sun chính + Đèn Key/Fill/Rim chiếu sáng rõ thân nhôm bạc từ phía Camera
    sun_data = bpy.data.lights.new('KeySun', type='SUN')
    sun_data.energy = float(s_energy)
    sun_data.color = p['sun_col']
    sun_data.angle = math.radians(2.0)
    sun_obj = bpy.data.objects.new('KeySun', sun_data)
    scn.collection.objects.link(sun_obj)
    sun_obj.rotation_euler = (
        math.radians(90.0 - el_deg),
        0.0,
        math.radians(rot_deg),
    )

    fill_data = bpy.data.lights.new('SkyFill', type='SUN')
    fill_data.energy = float(s_energy) * 0.55
    fill_data.color = (0.72, 0.84, 1.0)
    fill_data.angle = math.radians(25.0)
    fill_data.use_shadow = False
    fill_obj = bpy.data.objects.new('SkyFill', fill_data)
    scn.collection.objects.link(fill_obj)
    fill_obj.rotation_euler = (
        math.radians(48.0),
        0.0,
        math.radians(rot_deg - 110.0),
    )

    bounce_data = bpy.data.lights.new('GroundBounce', type='SUN')
    bounce_data.energy = float(s_energy) * 0.32
    bounce_data.color = (0.85, 0.78, 0.68)
    bounce_data.angle = math.radians(40.0)
    bounce_data.use_shadow = False
    bounce_obj = bpy.data.objects.new('GroundBounce', bounce_data)
    scn.collection.objects.link(bounce_obj)
    bounce_obj.rotation_euler = (
        math.radians(125.0),
        0.0,
        math.radians(rot_deg + 45.0),
    )

    return scn
