"""Nạp trực tiếp file .blend gốc từ bk_cache/<uuid>/ (giữ 100% Shader Nodes gốc của BlenderKit)
hoặc file .glb đã chuẩn hoá trong bk_cache/prepped/ và projects/<id>/assets/.
"""
from __future__ import annotations
import math
from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[3]
BK_CACHE = ROOT / 'bk_cache'
PREPPED_CACHE = BK_CACHE / 'prepped'


def resolve_asset_path(spec: str | Path, project_dir: str | Path | None = None) -> Path:
    """Tìm đường dẫn file .blend hoặc .glb từ UUID BlenderKit, tên slug trong prepped, hoặc đường dẫn."""
    p = Path(spec)
    if p.is_file():
        return p.resolve()

    if project_dir:
        cand = Path(project_dir) / str(spec)
        if cand.is_file():
            return cand.resolve()
        cand_refs = Path(project_dir) / 'assets/refs' / f'{spec}.glb'
        if cand_refs.is_file():
            return cand_refs.resolve()

    # Tìm trong bk_cache/<uuid>/ ưu tiên file .blend gốc để giữ 100% Shader Nodes của BlenderKit
    adir = BK_CACHE / str(spec)
    if adir.is_dir():
        for pat in ('source_*.blend', '*.blend', 'source_*.glb', '*.glb'):
            found = sorted(adir.glob(pat))
            if found:
                return found[0].resolve()

    # Tìm trong bk_cache/prepped/<slug>.glb
    for ext in ('.blend', '.glb'):
        prep_cand = PREPPED_CACHE / f'{spec}{ext}'
        if prep_cand.is_file():
            return prep_cand.resolve()

    raise FileNotFoundError(f'Không tìm thấy tài sản 3D cho: {spec}')


def compute_world_bounds(objs: list[bpy.types.Object]) -> tuple[Vector, Vector]:
    """Tính hộp bao thế giới [min_v, max_v] của danh sách các Mesh."""
    bpy.context.view_layer.update()
    mins = Vector((1e9, 1e9, 1e9))
    maxs = Vector((-1e9, -1e9, -1e9))
    found = False
    for o in objs:
        if o.type != 'MESH' or not o.visible_get():
            continue
        for corner in o.bound_box:
            wc = o.matrix_world @ Vector(corner)
            mins.x = min(mins.x, wc.x)
            mins.y = min(mins.y, wc.y)
            mins.z = min(mins.z, wc.z)
            maxs.x = max(maxs.x, wc.x)
            maxs.y = max(maxs.y, wc.y)
            maxs.z = max(maxs.z, wc.z)
            found = True
    if not found:
        return Vector((0, 0, 0)), Vector((1, 1, 1))
    return mins, maxs


def load_asset(
    spec: str | Path,
    name: str = 'AssetRoot',
    project_dir: str | Path | None = None,
    target_len: float | None = None,
    target_height: float | None = None,
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    rotation_deg: tuple[float, float, float] = (0.0, 0.0, 0.0),
    ground: bool = True,
) -> tuple[bpy.types.Object, list[bpy.types.Object]]:
    """Nạp mô hình .blend hoặc .glb vào cảnh và đặt dưới một Empty điều khiển trung tâm.

    Trả về: (root_empty, danh_sách_mesh_con)
    """
    src_path = resolve_asset_path(spec, project_dir=project_dir)
    scn = bpy.context.scene
    before = set(bpy.data.objects)

    if src_path.suffix.lower() == '.blend':
        with bpy.data.libraries.load(str(src_path), link=False) as (data_from, data_to):
            data_to.objects = list(data_from.objects)
        imported = []
        for obj in data_to.objects:
            if obj is not None:
                scn.collection.objects.link(obj)
                imported.append(obj)
    else:
        bpy.ops.import_scene.gltf(filepath=str(src_path))
        imported = [o for o in bpy.data.objects if o not in before]

    # Lọc bỏ các mặt phẳng phông nền / đèn / camera rác từ file mẫu nếu có
    clean_objs: list[bpy.types.Object] = []
    for o in imported:
        nm_low = o.name.lower()
        if o.type in ('CAMERA', 'LIGHT') or any(k in nm_low for k in ('background', 'backdrop', 'studio_plane', 'shadow_plane')):
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        clean_objs.append(o)

    root = bpy.data.objects.new(name, None)
    root.empty_display_type = 'PLAIN_AXES'
    scn.collection.objects.link(root)

    top_objs = [o for o in clean_objs if o.parent not in clean_objs]
    for o in top_objs:
        o.parent = root

    bpy.context.view_layer.update()
    meshes = [o for o in clean_objs if o.type == 'MESH']
    mins, maxs = compute_world_bounds(meshes)
    size = maxs - mins
    center = (mins + maxs) * 0.5

    # Chuẩn hoá tỷ lệ nếu truyền target_len (theo trục lớn nhất X/Y) hoặc target_height (trục Z)
    scale_factor = 1.0
    if target_len is not None and max(size.x, size.y) > 1e-4:
        scale_factor = float(target_len) / max(size.x, size.y)
    elif target_height is not None and size.z > 1e-4:
        scale_factor = float(target_height) / size.z

    # Dịch chuyển các node gốc sao cho tâm X, Y ở (0, 0) và đáy chạm Z = 0 (nếu ground=True)
    z_ref = mins.z if ground else center.z
    offset = Vector((-center.x, -center.y, -z_ref))

    if abs(scale_factor - 1.0) > 1e-4 or offset.length > 1e-4:
        norm_pivot = bpy.data.objects.new(f'{name}_Norm', None)
        scn.collection.objects.link(norm_pivot)
        norm_pivot.parent = root
        for o in top_objs:
            o.parent = norm_pivot
            o.location = o.location + offset
        norm_pivot.scale = (scale_factor, scale_factor, scale_factor)

    root.location = location
    root.rotation_euler = (
        math.radians(rotation_deg[0]),
        math.radians(rotation_deg[1]),
        math.radians(rotation_deg[2]),
    )
    bpy.context.view_layer.update()
    return root, meshes


def find_meshes(
    meshes: list[bpy.types.Object],
    include_prefixes: list[str] | tuple[str, ...] = (),
    exclude_prefixes: list[str] | tuple[str, ...] = (),
) -> list[bpy.types.Object]:
    """Lọc danh sách mesh theo tên hoặc tên node cha."""
    out = []
    inc = [p.lower() for p in include_prefixes]
    exc = [p.lower() for p in exclude_prefixes]
    for m in meshes:
        chain_names = []
        cur: bpy.types.Object | None = m
        while cur is not None:
            chain_names.append(cur.name.lower())
            cur = cur.parent
        if exc and any(any(cn.startswith(ep) or ep in cn for cn in chain_names) for ep in exc):
            continue
        if not inc or any(any(cn.startswith(ip) or ip in cn for cn in chain_names) for ip in inc):
            out.append(m)
    return out


def rig_joint(
    name: str,
    part_meshes: list[bpy.types.Object],
    pivot_world: tuple[float, float, float] | None = None,
    rot_keyframes: list[tuple[int, tuple[float, float, float]]] | None = None,
    loc_keyframes: list[tuple[int, tuple[float, float, float]]] | None = None,
) -> bpy.types.Object:
    """Tạo khớp động học (Empty Pivot) cho nhóm bộ phận (tháp pháo, nòng pháo, radar, càng đáp, cánh quạt):
    - Tự động tính tâm hộp bao thế giới của `part_meshes` làm tâm xoay nếu không truyền `pivot_world`.
    - Bảo toàn ma trận thế giới `matrix_world` khi gắn `part_meshes` vào khớp.
    - Hỗ trợ keyframe góc quay `rot_keyframes = [(frame, (rx_deg, ry_deg, rz_deg)), ...]` và dịch chuyển `loc_keyframes`.
    """
    scn = bpy.context.scene
    bpy.context.view_layer.update()

    if pivot_world is None:
        mins, maxs = compute_world_bounds(part_meshes)
        c = (mins + maxs) * 0.5
        pivot_world = (c.x, c.y, c.z)

    joint = bpy.data.objects.new(name, None)
    joint.empty_display_type = 'ARROWS'
    joint.empty_display_size = 0.4
    scn.collection.objects.link(joint)

    first_parent = part_meshes[0].parent if part_meshes else None
    if first_parent is not None:
        joint.parent = first_parent
        bpy.context.view_layer.update()
        joint.matrix_world.translation = Vector(pivot_world)
    else:
        joint.location = pivot_world

    bpy.context.view_layer.update()
    for m in part_meshes:
        mw = m.matrix_world.copy()
        m.parent = joint
        m.matrix_world = mw

    if rot_keyframes:
        for fr, (rx, ry, rz) in rot_keyframes:
            joint.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz))
            joint.keyframe_insert(data_path='rotation_euler', frame=int(fr))

    if loc_keyframes:
        base_loc = joint.location.copy()
        for fr, (dx, dy, dz) in loc_keyframes:
            joint.location = (base_loc.x + dx, base_loc.y + dy, base_loc.z + dz)
            joint.keyframe_insert(data_path='location', frame=int(fr))

    return joint

