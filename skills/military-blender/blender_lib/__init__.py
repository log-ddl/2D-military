"""Thư viện dựng cảnh 3D, Bản đồ Chiến lược 3D & Chú thích Callout gốc 100% trong Blender 5.2+ (bpy) cho skill military-blender."""
from .stage import init_stage
from .loader import resolve_asset_path, compute_world_bounds, load_asset, find_meshes, rig_joint
from .camera import setup_camera, project_point_2d, export_callout_anchors
from .cutaway import setup_laser_cutaway
from .brand import add_brand_decal
from .measure3d import add_measure_3d
from .callout import add_callout_3d
from .geomap import build_geomap_3d, add_map_route, add_map_marker
from .materials import (
    military_paint,
    armor_plate,
    panel_paint,
    machined_metal,
    optical_glass,
    replace_materials,
)
from .geom import (
    add_loft,
    add_revolve,
    add_airfoil_wing,
    add_pipe,
    add_wheel,
    add_tank_track,
    add_rivets,
)
from .actor import (
    SOLDIER_CLIP_SPEEDS,
    find_mixamo_fbx,
    load_mixamo_fbx_action,
    add_soldier_3d,
)
from .fx import (
    add_explosion,
    add_jet_plume,
    add_rotor_blur,
    add_surface_curves,
    add_attached_trails,
    add_volumetric_domain,
    add_displaced_terrain,
    scatter_instances,
    add_water_surface,
)

__all__ = [
    'init_stage',
    'resolve_asset_path',
    'compute_world_bounds',
    'load_asset',
    'find_meshes',
    'rig_joint',
    'setup_camera',
    'project_point_2d',
    'export_callout_anchors',
    'setup_laser_cutaway',
    'add_brand_decal',
    'add_measure_3d',
    'add_callout_3d',
    'build_geomap_3d',
    'add_map_route',
    'add_map_marker',
    'military_paint',
    'armor_plate',
    'panel_paint',
    'machined_metal',
    'optical_glass',
    'replace_materials',
    'add_loft',
    'add_revolve',
    'add_airfoil_wing',
    'add_pipe',
    'add_wheel',
    'add_tank_track',
    'add_rivets',
    'SOLDIER_CLIP_SPEEDS',
    'find_mixamo_fbx',
    'load_mixamo_fbx_action',
    'add_soldier_3d',
    'add_explosion',
    'add_jet_plume',
    'add_rotor_blur',
    'add_surface_curves',
    'add_attached_trails',
    'add_volumetric_domain',
    'add_displaced_terrain',
    'scatter_instances',
    'add_water_surface',
]
