"""Bản đồ Chiến lược Địa lý 3D dựng trực tiếp 100% trong Blender 5.2 (`geomap.py`):
- Đọc dữ liệu biên giới & đường bờ biển thật của 177 quốc gia từ `presets/world_geo.json` (Natural Earth).
- Dựng bàn sa bàn chiến thuật 3D: mặt biển tối có lưới kinh-vĩ tuyến phát sáng, lục địa đùn khối nổi 3D (`extrude`),
  các quốc gia trọng điểm (`highlight`) nổi cao hơn và phát sáng viền bờ biển.
- Hỗ trợ vẽ tuyến bay / mũi tấn công / hành trình 3D (`add_map_route`), ghim toạ độ thành phố/căn cứ (`add_map_marker`),
  và vòng sóng radar lan toả (`add_map_radar_ring`).
"""
from __future__ import annotations
import json
import math
from pathlib import Path
from typing import Callable
import bpy

WORLD_GEO_PATH = Path(__file__).resolve().parents[1] / 'presets' / 'world_geo.json'


def _hex_to_rgb(hex_str: str) -> tuple[float, float, float]:
    h = hex_str.lstrip('#')
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return ((int(h[0:2], 16) / 255.0) ** 2.2, (int(h[2:4], 16) / 255.0) ** 2.2, (int(h[4:6], 16) / 255.0) ** 2.2)


def _lat_to_merc(lat: float) -> float:
    clamped = max(-82.0, min(82.0, float(lat)))
    rad = math.radians(clamped)
    return math.log(math.tan(math.pi / 4.0 + rad / 2.0))


def build_geomap_3d(
    bounds: tuple[float, float, float, float] = (-126.0, 23.0, -65.0, 50.0),
    map_width: float = 32.0,
    map_height: float = 18.0,
    highlight: dict[str, str] | None = None,
    sea_color: str = '#07111e',
    land_color: str = '#152538',
    border_color: str = '#2d5478',
    grid_step_deg: float = 10.0,
) -> tuple[bpy.types.Object, Callable[[float, float, float], tuple[float, float, float]]]:
    """Khởi tạo Sa bàn Địa lý 3D trong Blender từ khung kinh-vĩ độ `bounds = (lon_min, lat_min, lon_max, lat_max)`.
    Trả về `(map_root, project_fn)` trong đó `project_fn(lon, lat, z=0.15) -> (x, y, z)` đổi kinh/vĩ độ sang toạ độ 3D Blender.
    """
    scn = bpy.context.scene
    lon_min, lat_min, lon_max, lat_max = [float(v) for v in bounds]
    y_min = _lat_to_merc(lat_min)
    y_max = _lat_to_merc(lat_max)
    lon_span = max(1e-4, math.radians(lon_max - lon_min))
    merc_span = max(1e-4, y_max - y_min)

    scale = min(map_width / lon_span, map_height / merc_span)
    eff_w = lon_span * scale
    eff_h = merc_span * scale

    def project_fn(lon: float, lat: float, z: float = 0.16) -> tuple[float, float, float]:
        xr = (float(lon) - lon_min) / max(1e-4, lon_max - lon_min)
        yr = (_lat_to_merc(float(lat)) - y_min) / merc_span
        x_3d = (xr - 0.5) * eff_w
        y_3d = (yr - 0.5) * eff_h
        return (x_3d, y_3d, float(z))

    root = bpy.data.objects.new('GeoMap3D_Root', None)
    scn.collection.objects.link(root)

    # 1. Mặt biển chiến thuật
    bpy.ops.mesh.primitive_plane_add(size=1.0, location=(0, 0, 0.0))
    sea = bpy.context.active_object
    sea.name = 'GeoMap_Sea'
    sea.parent = root
    sea.scale = (map_width * 1.35, map_height * 1.35, 1.0)
    mat_sea = bpy.data.materials.new('GeoMap_SeaMat')
    mat_sea.use_nodes = True
    bsdf_sea = mat_sea.node_tree.nodes.get('Principled BSDF')
    if bsdf_sea:
        bsdf_sea.inputs['Base Color'].default_value = (*_hex_to_rgb(sea_color), 1.0)
        bsdf_sea.inputs['Roughness'].default_value = 0.25
        bsdf_sea.inputs['Metallic'].default_value = 0.35
    sea.data.materials.append(mat_sea)

    # 2. Lưới kinh - vĩ tuyến chiến thuật
    mat_grid = bpy.data.materials.new('GeoMap_GridMat')
    mat_grid.use_nodes = True
    nt_g = mat_grid.node_tree
    nt_g.nodes.clear()
    out_g = nt_g.nodes.new('ShaderNodeOutputMaterial')
    em_g = nt_g.nodes.new('ShaderNodeEmission')
    em_g.inputs['Color'].default_value = (*_hex_to_rgb(border_color), 1.0)
    em_g.inputs['Strength'].default_value = 0.85
    nt_g.links.new(em_g.outputs['Emission'], out_g.inputs['Surface'])

    crv_grid = bpy.data.curves.new('GeoMap_GridCurve', type='CURVE')
    crv_grid.dimensions = '3D'
    crv_grid.bevel_depth = 0.012
    lon_start = math.floor(lon_min / grid_step_deg) * grid_step_deg
    lon_cur = lon_start
    while lon_cur <= lon_max + 1e-3:
        if lon_min <= lon_cur <= lon_max:
            sp = crv_grid.splines.new('POLY')
            sp.points.add(1)
            p0 = project_fn(lon_cur, lat_min, 0.01)
            p1 = project_fn(lon_cur, lat_max, 0.01)
            sp.points[0].co = (*p0, 1.0)
            sp.points[1].co = (*p1, 1.0)
        lon_cur += grid_step_deg

    lat_start = math.floor(lat_min / grid_step_deg) * grid_step_deg
    lat_cur = lat_start
    while lat_cur <= lat_max + 1e-3:
        if lat_min <= lat_cur <= lat_max:
            sp = crv_grid.splines.new('POLY')
            sp.points.add(1)
            p0 = project_fn(lon_min, lat_cur, 0.01)
            p1 = project_fn(lon_max, lat_cur, 0.01)
            sp.points[0].co = (*p0, 1.0)
            sp.points[1].co = (*p1, 1.0)
        lat_cur += grid_step_deg

    grid_obj = bpy.data.objects.new('GeoMap_Grid', crv_grid)
    scn.collection.objects.link(grid_obj)
    grid_obj.parent = root
    grid_obj.data.materials.append(mat_grid)

    # 3. Đọc dữ liệu biên giới thật 177 quốc gia và đùn khối 3D
    countries = json.loads(WORLD_GEO_PATH.read_text(encoding='utf-8'))
    hl_map = {k.upper(): v for k, v in (highlight or {}).items()}

    mat_land = bpy.data.materials.new('GeoMap_LandMat')
    mat_land.use_nodes = True
    bsdf_l = mat_land.node_tree.nodes.get('Principled BSDF')
    if bsdf_l:
        bsdf_l.inputs['Base Color'].default_value = (*_hex_to_rgb(land_color), 1.0)
        bsdf_l.inputs['Roughness'].default_value = 0.65
        bsdf_l.inputs['Metallic'].default_value = 0.15

    mat_border = bpy.data.materials.new('GeoMap_BorderMat')
    mat_border.use_nodes = True
    nt_b = mat_border.node_tree
    nt_b.nodes.clear()
    out_b = nt_b.nodes.new('ShaderNodeOutputMaterial')
    em_b = nt_b.nodes.new('ShaderNodeEmission')
    em_b.inputs['Color'].default_value = (*_hex_to_rgb(border_color), 1.0)
    em_b.inputs['Strength'].default_value = 1.6
    nt_b.links.new(em_b.outputs['Emission'], out_b.inputs['Surface'])

    margin = 18.0
    for c in countries:
        iso = (c.get('iso') or '').upper()
        name = c.get('name') or iso
        is_hl = iso in hl_map or name.upper() in hl_map
        hl_hex = hl_map.get(iso) or hl_map.get(name.upper())

        rings_in_view = []
        for ring in c.get('rings', []):
            if any((lon_min - margin <= pt[0] <= lon_max + margin and lat_min - margin <= pt[1] <= lat_max + margin) for pt in ring):
                rings_in_view.append(ring)
        if not rings_in_view:
            continue

        # Khối lục địa 2D filled + extrude 3D
        crv_c = bpy.data.curves.new(f'Country_{iso}', type='CURVE')
        crv_c.dimensions = '2D'
        crv_c.fill_mode = 'BOTH'
        crv_c.extrude = 0.09 if is_hl else 0.045
        crv_c.bevel_depth = 0.01

        # Đường viền bờ biển phát sáng
        crv_b = bpy.data.curves.new(f'Border_{iso}', type='CURVE')
        crv_b.dimensions = '3D'
        crv_b.bevel_depth = 0.022 if is_hl else 0.012

        z_top = 0.105 if is_hl else 0.055
        for ring in rings_in_view:
            if len(ring) < 3:
                continue
            sp = crv_c.splines.new('POLY')
            sp.use_cyclic_u = True
            sp.points.add(len(ring) - 1)

            sp_b = crv_b.splines.new('POLY')
            sp_b.use_cyclic_u = True
            sp_b.points.add(len(ring) - 1)

            for i, pt in enumerate(ring):
                x3, y3, _ = project_fn(pt[0], pt[1], 0.0)
                sp.points[i].co = (x3, y3, 0.0, 1.0)
                sp_b.points[i].co = (x3, y3, z_top, 1.0)

        c_obj = bpy.data.objects.new(f'Land_{iso}', crv_c)
        c_obj.location = (0, 0, 0.045)
        scn.collection.objects.link(c_obj)
        c_obj.parent = root

        b_obj = bpy.data.objects.new(f'Coast_{iso}', crv_b)
        scn.collection.objects.link(b_obj)
        b_obj.parent = root

        if is_hl and hl_hex:
            mat_hl = bpy.data.materials.new(f'MatHL_{iso}')
            mat_hl.use_nodes = True
            bsdf_h = mat_hl.node_tree.nodes.get('Principled BSDF')
            rgb_h = _hex_to_rgb(hl_hex)
            if bsdf_h:
                bsdf_h.inputs['Base Color'].default_value = (*rgb_h, 1.0)
                bsdf_h.inputs['Roughness'].default_value = 0.45
                if 'Emission Color' in bsdf_h.inputs:
                    bsdf_h.inputs['Emission Color'].default_value = (*rgb_h, 1.0)
                    bsdf_h.inputs['Emission Strength'].default_value = 0.35
            c_obj.data.materials.append(mat_hl)
        else:
            c_obj.data.materials.append(mat_land)

        b_obj.data.materials.append(mat_border)

    return root, project_fn


def add_map_route(
    name: str,
    project_fn: Callable[[float, float, float], tuple[float, float, float]],
    waypoints_lonlat: list[tuple[float, float]],
    draw_frames: tuple[int, int] | None = None,
    arc_height: float = 0.35,
    thickness: float = 0.055,
    color: tuple[float, float, float] = (0.18, 0.85, 1.0),
    emission_strength: float = 8.0,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Vẽ tuyến hành trình / đường bay / quỹ đạo tên lửa 3D trên bản đồ với hiệu ứng chạy dần theo `draw_frames`."""
    scn = bpy.context.scene
    crv = bpy.data.curves.new(f'{name}_Curve', type='CURVE')
    crv.dimensions = '3D'
    crv.bevel_depth = float(thickness)
    crv.bevel_resolution = 4

    # Nội suy mịn giữa các điểm kinh-vĩ độ và nâng độ cao vòm parabol nếu arc_height > 0
    dense_pts: list[tuple[float, float, float]] = []
    n_seg = len(waypoints_lonlat) - 1
    steps_per_seg = 24
    total_steps = max(1, n_seg * steps_per_seg)
    step_idx = 0

    for k in range(n_seg):
        lon0, lat0 = waypoints_lonlat[k]
        lon1, lat1 = waypoints_lonlat[k + 1]
        for s in range(steps_per_seg + (1 if k == n_seg - 1 else 0)):
            u = s / float(steps_per_seg)
            lon = lon0 + (lon1 - lon0) * u
            lat = lat0 + (lat1 - lat0) * u
            global_u = step_idx / float(total_steps)
            z_arc = 0.16 + math.sin(global_u * math.pi) * float(arc_height)
            dense_pts.append(project_fn(lon, lat, z_arc))
            step_idx += 1

    sp = crv.splines.new('POLY')
    sp.points.add(len(dense_pts) - 1)
    for i, (x, y, z) in enumerate(dense_pts):
        sp.points[i].co = (x, y, z, 1.0)

    obj = bpy.data.objects.new(name, crv)
    scn.collection.objects.link(obj)
    if parent:
        obj.parent = parent

    mat = bpy.data.materials.new(f'{name}_Mat')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*color, 1.0)
    em.inputs['Strength'].default_value = float(emission_strength)
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])
    obj.data.materials.append(mat)

    if draw_frames is not None:
        f0, f1 = int(draw_frames[0]), int(draw_frames[1])
        crv.bevel_factor_end = 0.0
        crv.keyframe_insert(data_path='bevel_factor_end', frame=f0)
        crv.bevel_factor_end = 1.0
        crv.keyframe_insert(data_path='bevel_factor_end', frame=f1)

    return obj


def add_map_marker(
    project_fn: Callable[[float, float, float], tuple[float, float, float]],
    lon: float,
    lat: float,
    label: str,
    appear_frames: tuple[int, int] | None = None,
    color: tuple[float, float, float] = (1.0, 0.72, 0.18),
    size: float = 0.42,
    label_offset: tuple[float, float] = (0.0, 0.55),
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Đặt tâm ghim thành phố / căn cứ quân sự phát sáng kèm nhãn chữ 3D trên bản đồ."""
    scn = bpy.context.scene
    x, y, z = project_fn(lon, lat, 0.16)

    pin = bpy.data.objects.new(f'Marker_{label}', None)
    pin.location = (x, y, z)
    scn.collection.objects.link(pin)
    if parent:
        pin.parent = parent

    mat = bpy.data.materials.new(f'MarkerMat_{label}')
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    em = nt.nodes.new('ShaderNodeEmission')
    em.inputs['Color'].default_value = (*color, 1.0)
    em.inputs['Strength'].default_value = 7.5
    nt.links.new(em.outputs['Emission'], out.inputs['Surface'])

    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=size * 0.28, depth=0.06, location=(0, 0, 0.03))
    dot = bpy.context.active_object
    dot.name = f'MarkerDot_{label}'
    dot.parent = pin
    dot.data.materials.append(mat)

    bpy.ops.mesh.primitive_torus_add(major_radius=size * 0.55, minor_radius=size * 0.055, location=(0, 0, 0.03))
    ring = bpy.context.active_object
    ring.name = f'MarkerRing_{label}'
    ring.parent = pin
    ring.data.materials.append(mat)

    txt_crv = bpy.data.curves.new(f'MarkerFont_{label}', type='FONT')
    txt_crv.body = label.upper()
    txt_crv.size = float(size)
    txt_crv.align_x = 'CENTER'
    txt_crv.align_y = 'CENTER'
    txt_crv.extrude = 0.012
    txt_obj = bpy.data.objects.new(f'MarkerText_{label}', txt_crv)
    scn.collection.objects.link(txt_obj)
    txt_obj.parent = pin
    txt_obj.location = (label_offset[0], label_offset[1], 0.08)

    mat_txt = bpy.data.materials.new(f'MarkerTxtMat_{label}')
    mat_txt.use_nodes = True
    nt_t = mat_txt.node_tree
    nt_t.nodes.clear()
    out_t = nt_t.nodes.new('ShaderNodeOutputMaterial')
    em_t = nt_t.nodes.new('ShaderNodeEmission')
    em_t.inputs['Color'].default_value = (0.98, 0.99, 1.0, 1.0)
    em_t.inputs['Strength'].default_value = 5.0
    nt_t.links.new(em_t.outputs['Emission'], out_t.inputs['Surface'])
    txt_obj.data.materials.append(mat_txt)

    if appear_frames is not None:
        f0, f1 = int(appear_frames[0]), int(appear_frames[1])
        pin.scale = (0.001, 0.001, 0.001)
        pin.keyframe_insert(data_path='scale', frame=max(1, f0 - 1))
        pin.scale = (1.18, 1.18, 1.18)
        pin.keyframe_insert(data_path='scale', frame=int(round((f0 + f1) * 0.6)))
        pin.scale = (1.0, 1.0, 1.0)
        pin.keyframe_insert(data_path='scale', frame=f1)

    return pin
