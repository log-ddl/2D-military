# Chạy bên trong Blender nền:
#   Blender --background --factory-startup --python core/tools/bk_blender_prep.py -- [cờ]
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector
from mathutils.bvhtree import BVHTree


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []

    def get(k, d=None):
        return argv[argv.index(k) + 1] if k in argv and argv.index(k) + 1 < len(argv) else d

    return {
        'src': get('--src'),
        'out': get('--out'),
        'inspect': get('--inspect'),
        'inspect_parts': '--inspect-parts' in argv,
        'role': get('--role', 'hero'),
        'front': get('--front', 'auto'),
        'up': get('--up', 'auto'),
        'ground': get('--ground', 'bottom'),
        'target_len': float(get('--target-len')) if get('--target-len') else None,
        'length_x': float(get('--length')) if get('--length') else None,
        'height_y': float(get('--height')) if get('--height') else None,
        'decimate': float(get('--decimate')) if get('--decimate') else None,
        'rig': get('--rig'),
        'keep_nodes': '--keep-nodes' in argv,
        'recolor': get('--recolor'),
        'report': get('--report'),
    }


def load_source(src_path: str):
    ext = Path(src_path).suffix.lower()
    if ext == '.blend':
        bpy.ops.wm.open_mainfile(filepath=src_path)
        scene = bpy.context.scene
        for obj in list(scene.objects):
            if obj.instance_type == 'COLLECTION' and obj.instance_collection:
                bpy.ops.object.select_all(action='DESELECT')
                obj.select_set(True)
                bpy.context.view_layer.objects.active = obj
                try:
                    bpy.ops.object.duplicates_make_real(use_base_parent=False, use_hierarchy=False)
                    bpy.data.objects.remove(obj, do_unlink=True)
                except Exception:
                    pass
    else:
        bpy.ops.wm.read_factory_settings(use_empty=True)
        bpy.ops.import_scene.gltf(filepath=src_path)
    bpy.context.view_layer.update()


def world_bbox(objs):
    mn = Vector((1e18, 1e18, 1e18))
    mx = Vector((-1e18, -1e18, -1e18))
    ok = False
    for o in objs:
        if o.type == 'MESH' and o.data and len(o.data.vertices) > 0:
            mw = o.matrix_world
            for v in o.data.vertices:
                w = mw @ v.co
                mn.x, mn.y, mn.z = min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)
                mx.x, mx.y, mx.z = max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)
                ok = True
        else:
            for corner in o.bound_box:
                w = o.matrix_world @ Vector(corner)
                mn.x, mn.y, mn.z = min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)
                mx.x, mx.y, mx.z = max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)
                ok = True
    return (mn, mx) if ok else (Vector((0, 0, 0)), Vector((0, 0, 0)))


def clean_meshes(exclude_prefixes=()):
    scene = bpy.context.scene
    for o in list(bpy.data.objects):
        if o.name.startswith(tuple(exclude_prefixes)):
            bpy.data.objects.remove(o, do_unlink=True)
            continue
        if o.type not in ('MESH', 'CURVE', 'SURFACE', 'FONT', 'EMPTY'):
            bpy.data.objects.remove(o, do_unlink=True)
        elif o.hide_render:
            bpy.data.objects.remove(o, do_unlink=True)

    for o in list(scene.objects):
        if o.type in ('CURVE', 'SURFACE', 'FONT'):
            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            try:
                bpy.ops.object.convert(target='MESH')
            except Exception:
                bpy.data.objects.remove(o, do_unlink=True)

    meshes = [o for o in scene.objects if o.type == 'MESH' and len(o.data.polygons) > 0]
    if len(meshes) > 1:
        sizes = []
        for o in meshes:
            mn, mx = world_bbox([o])
            d = mx - mn
            sizes.append((o, max(d.x, d.y, d.z), min(d.x, d.y, d.z), len(o.data.polygons)))
        sizes.sort(key=lambda x: x[1], reverse=True)
        second_max = sizes[1][1] if len(sizes) > 1 else sizes[0][1]
        for o, big, thin, polys in sizes:
            name_low = o.name.lower()
            is_studio = any(w in name_low for w in ('ground', 'floor', 'backdrop', 'shadow', 'plane', 'stage', 'studio'))
            if (big > second_max * 3.2 and polys <= 64) or (is_studio and thin < 0.05 and big > second_max * 1.8):
                bpy.data.objects.remove(o, do_unlink=True)

    return [o for o in scene.objects if o.type == 'MESH' and len(o.data.polygons) > 0]


def bake_world_normalized_to_vertices(
    meshes, front: str, up: str, ground: str, target_len, ground_prefixes=(), length_x=None, height_y=None
):
    """Đưa toàn bộ mesh về hệ trục chuẩn Blender (+X mũi, +Z đỉnh, -Y mạn phải -> glTF +X mũi, +Y đỉnh, +Z phải)
    và nướng thẳng ma trận vào đỉnh lưới để mọi Empty khớp xoay có rotation (0, 0, 0) đồng nhất."""
    for o in list(bpy.data.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)

    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = Matrix.Identity(4)
        o.data = o.data.copy()
        o.data.transform(mw)
        o.data.update()

    mn, mx = world_bbox(meshes)
    dim = mx - mn

    ax_map = {
        '+X': Vector((1, 0, 0)), '-X': Vector((-1, 0, 0)),
        '+Y': Vector((0, 1, 0)), '-Y': Vector((0, -1, 0)),
        '+Z': Vector((0, 0, 1)), '-Z': Vector((0, 0, -1)),
    }
    up_vec = Vector((0, 0, 1)) if up == 'auto' else ax_map[up]
    if front == 'auto':
        front_vec = Vector((0, -1, 0)) if dim.y >= dim.x * 1.08 else Vector((1, 0, 0))
    else:
        front_vec = ax_map[front]

    f = front_vec.normalized()
    u = (up_vec - f * up_vec.dot(f)).normalized()
    if u.length < 1e-4:
        u = Vector((0, 0, 1)) if abs(f.z) < 0.9 else Vector((0, 1, 0))
        u = (u - f * u.dot(f)).normalized()
    y_bl = u.cross(f).normalized()
    rot4 = Matrix((f, y_bl, u)).to_4x4()

    for o in meshes:
        o.data.transform(rot4)
        o.data.update()

    mn, mx = world_bbox(meshes)
    dim = mx - mn
    if length_x:
        scale = length_x / max(dim.x, 1e-5)
    elif height_y:
        scale = height_y / max(dim.z, 1e-5)
    elif target_len:
        scale = target_len / max(dim.x, dim.y, dim.z, 1e-5)
    else:
        scale = 1.0
    if abs(scale - 1.0) > 1e-5:
        s4 = Matrix.Diagonal((scale, scale, scale, 1.0))
        for o in meshes:
            o.data.transform(s4)
            o.data.update()
        mn, mx = world_bbox(meshes)

    g_objs = [o for o in meshes if ground_prefixes and o.name.startswith(tuple(ground_prefixes))]
    g_mn, _ = world_bbox(g_objs) if g_objs else (mn, mx)

    cx = 0.5 * (mn.x + mx.x)
    cy = 0.5 * (mn.y + mx.y)
    cz = g_mn.z if ground == 'bottom' else 0.5 * (mn.z + mx.z)
    shift = Matrix.Translation(Vector((-cx, -cy, -cz)))
    for o in meshes:
        o.data.transform(shift)
        o.data.update()

    bpy.context.view_layer.update()
    return world_bbox(meshes)


def gltf_to_blender(pt):
    """Đổi toạ độ glTF [x, y, z] (+X mũi, +Y cao, +Z phải) sang Blender [x, -z, y]."""
    return Vector((float(pt[0]), -float(pt[2]), float(pt[1])))


def blender_to_gltf(v: Vector):
    """Đổi toạ độ Blender (x, y, z) sang glTF [x, z, -y]."""
    return [round(v.x, 4), round(v.z, 4), round(-v.y, 4)]


def inspect_parts_summary(meshes, mn: Vector, mx: Vector):
    dim = mx - mn
    mats = []
    for m in bpy.data.materials:
        imgs = []
        if m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image:
                    imgs.append(f"{n.image.name}({n.image.size[0]}x{n.image.size[1]},packed={bool(n.image.packed_file)})")
        mats.append({'name': m.name, 'textures': imgs})

    rows = []
    for o in sorted(meshes, key=lambda x: len(x.data.polygons), reverse=True):
        omn, omx = world_bbox([o])
        rows.append({
            'name': o.name,
            'faces': len(o.data.polygons),
            'gltf_min': blender_to_gltf(omn),
            'gltf_max': blender_to_gltf(omx),
            'gltf_center': blender_to_gltf(0.5 * (omn + omx)),
        })

    out = {
        'mesh_count': len(meshes),
        'total_faces': sum(r['faces'] for r in rows),
        'gltf_dimensions_m': {'length_x': round(dim.x, 4), 'height_y': round(dim.z, 4), 'width_z': round(dim.y, 4)},
        'materials': mats,
        'meshes': rows,
    }
    print('=== BK INSPECT PARTS ===')
    print(json.dumps(out, ensure_ascii=False, indent=2))
    return out


def _match_mesh_name(obj_name: str, patterns) -> bool:
    import fnmatch
    for pat in patterns:
        if '*' in pat or '?' in pat or '[' in pat:
            if fnmatch.fnmatch(obj_name, pat):
                return True
        elif obj_name.startswith(pat):
            return True
    return False


def build_rig_hierarchy(meshes, rig_spec: dict):
    """Dựng cây Empty khớp động theo rig.json (hỗ trợ cả mảng "pivots": [...] và map "joints": {...}):
    {
      "pivots": [
        {"name": "WingPivot", "parent": null, "pivot_from": ["trousailes_"], "pivot_mode": "center", "meshes": ["aile_"]},
        {"name": "NacellePivotR", "parent": "WingPivot", "pivot": [1.1, 3.11, 7.09], "meshes": ["moteurD*"]}
      ],
      "rest_group": "Fuselage"
    }
    """
    col = bpy.context.scene.collection

    def make_empty(name: str, loc_bl: Vector, parent=None):
        e = bpy.data.objects.new(name, None)
        col.objects.link(e)
        e.location = loc_bl
        if parent is not None:
            e.parent = parent
            e.matrix_parent_inverse = parent.matrix_world.inverted()
        bpy.context.view_layer.update()
        return e

    def attach(objs, parent):
        bpy.context.view_layer.update()
        inv = parent.matrix_world.inverted()
        for o in objs:
            o.data.transform(inv)
            o.data.update()
            o.parent = parent
            o.location = (0.0, 0.0, 0.0)
            o.rotation_euler = (0.0, 0.0, 0.0)
            o.scale = (1.0, 1.0, 1.0)

    root_name = rig_spec.get('root_name', 'RigRoot')
    root = make_empty(root_name, Vector((0.0, 0.0, 0.0)), None)
    nodes = {root_name: root, None: root, '': root}
    pivots_out = {}
    assigned = set()

    pivot_list = list(rig_spec.get('pivots', []))
    if not pivot_list and isinstance(rig_spec.get('joints'), dict):
        for jname, jcfg in rig_spec['joints'].items():
            item = dict(jcfg)
            item['name'] = jname
            pivot_list.append(item)

    for p in pivot_list:
        nm = p['name']
        par = nodes.get(p.get('parent'), root)
        if 'pivot' in p and p['pivot'] is not None:
            loc_bl = gltf_to_blender(p['pivot'])
        else:
            prefs = tuple(p.get('pivot_from') or p.get('meshes') or ())
            ref_objs = [o for o in meshes if prefs and _match_mesh_name(o.name, prefs)]
            pmn, pmx = world_bbox(ref_objs if ref_objs else meshes)
            mode = p.get('pivot_mode', 'center')
            cx = pmx.x if mode == 'front_edge' else (pmn.x if mode == 'rear_edge' else 0.5 * (pmn.x + pmx.x))
            cy = 0.5 * (pmn.y + pmx.y)
            cz = pmn.z if mode == 'bottom_center' else 0.5 * (pmn.z + pmx.z)
            loc_bl = Vector((cx, cy, cz))

        emp = make_empty(nm, loc_bl, par)
        nodes[nm] = emp
        pivots_out[nm] = blender_to_gltf(loc_bl)

        mprefs = tuple(p.get('meshes') or ())
        if mprefs:
            hit = [o for o in meshes if o not in assigned and _match_mesh_name(o.name, mprefs)]
            assigned.update(hit)
            attach(hit, emp)

    rest = [o for o in meshes if o not in assigned]
    if rest:
        rest_grp = make_empty(rig_spec.get('rest_group', 'Body'), Vector((0.0, 0.0, 0.0)), root)
        attach(rest, rest_grp)
    return pivots_out


def replace_image_safely(old_img, new_pixels_rgba_bottom_up, new_name: str, td: Path):
    """Lưu ảnh PNG ra đĩa rồi nạp lại làm datablock mới để glTF exporter của Blender 5.x không đọc nhầm packed_file cũ."""
    h, w, _ = new_pixels_rgba_bottom_up.shape
    tmp_img = bpy.data.images.new(f'_tmp_{new_name}', width=w, height=h, alpha=True)
    tmp_img.pixels[:] = new_pixels_rgba_bottom_up.ravel().tolist()
    out_png = td / f'{new_name}.png'
    tmp_img.filepath_raw = str(out_png)
    tmp_img.file_format = 'PNG'
    tmp_img.save()
    bpy.data.images.remove(tmp_img)

    fresh = bpy.data.images.load(str(out_png))
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'TEX_IMAGE' and node.image == old_img:
                node.image = fresh
    return fresh


def apply_laplace_recolor(hex_color: str, td: Path) -> int:
    """Đổi các mảng sơn dân sự loè loẹt (vàng/đỏ/cam bão hoà cao) sang màu sơn quân sự `hex_color`
    mà vẫn bảo toàn độ chuyển bóng AO, khung kính tối và lốp/kim loại trung tính."""
    hc = hex_color.lstrip('#')
    tr = int(hc[0:2], 16) / 255.0
    tg = int(hc[2:4], 16) / 255.0
    tb = int(hc[4:6], 16) / 255.0
    # Đổi sRGB mục tiêu sang tuyến tính xấp xỉ để nhân với trường độ sáng AO
    lr, lg, lb = tr ** 2.2, tg ** 2.2, tb ** 2.2
    avg_l = max(1e-3, 0.299 * lr + 0.587 * lg + 0.114 * lb)
    cr, cg, cb = lr / avg_l, lg / avg_l, lb / avg_l

    count = 0
    used_imgs = set()
    for mat in bpy.data.materials:
        if not mat.node_tree:
            continue
        for n in mat.node_tree.nodes:
            if n.type == 'TEX_IMAGE' and n.image and n.image.size[0] >= 256:
                used_imgs.add(n.image)

    for idx, img in enumerate(list(used_imgs)):
        w, h = img.size[0], img.size[1]
        arr = np.array(img.pixels[:], dtype=np.float32).reshape((h, w, 4))
        r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
        lum = 0.299 * r + 0.587 * g + 0.114 * b
        chroma = np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b)

        vivid = chroma > 0.11
        if int(vivid.sum()) < 32 and w < 512:
            continue

        # Giữ nguyên chi tiết tối (khung kính, lốp xe, hốc xả, cánh quạt đen)
        keep_dark = (lum < 0.20) & (chroma < 0.11)
        med_lum = max(0.30, float(np.median(lum[~keep_dark])) if (~keep_dark).any() else float(np.median(lum)))
        shade = np.clip(lum * (avg_l / med_lum), 0.04, 0.94).astype(np.float32)

        # Xoá sạch chữ/logo/dải sơn màu của BlenderKit (vùng có độ bão hoà màu chroma > 0.11) bằng khuếch tán Laplace
        if vivid.any():
            shade[vivid] = avg_l
            for _ in range(48):
                avg4 = 0.25 * (
                    np.roll(shade, 1, axis=0) + np.roll(shade, -1, axis=0)
                    + np.roll(shade, 1, axis=1) + np.roll(shade, -1, axis=1)
                )
                shade[vivid] = avg4[vivid]

        out = arr.copy()
        paint_mask = ~keep_dark
        out[paint_mask, 0] = np.clip(shade[paint_mask] * cr, 0.0, 1.0)
        out[paint_mask, 1] = np.clip(shade[paint_mask] * cg, 0.0, 1.0)
        out[paint_mask, 2] = np.clip(shade[paint_mask] * cb, 0.0, 1.0)
        replace_image_safely(img, out, f'recolor_{idx}_{img.name.split(".")[0]}', td)
        count += 1
    return count


def apply_selective_decimate(meshes, role: str, custom_ratio):
    total_before = sum(len(o.data.polygons) for o in meshes)
    ratio = custom_ratio
    if ratio is None:
        if role == 'bg':
            ratio = 0.28
        elif role == 'hero':
            ratio = min(1.0, 55000.0 / total_before) if total_before > 65000 else 1.0
        else:
            ratio = 1.0

    if ratio < 0.98:
        for o in meshes:
            if o.data.users > 1:
                o.data = o.data.copy()
            polys = len(o.data.polygons)
            if role == 'bg' or polys > 2500:
                bpy.ops.object.select_all(action='DESELECT')
                o.select_set(True)
                bpy.context.view_layer.objects.active = o
                mod = o.modifiers.new(name='BK_Decimate', type='DECIMATE')
                mod.decimate_type = 'COLLAPSE'
                mod.ratio = max(0.08, min(1.0, ratio))
                mod.use_collapse_triangulate = False
                try:
                    bpy.ops.object.modifier_apply(modifier=mod.name)
                except Exception:
                    o.modifiers.remove(mod)
    total_after = sum(len(o.data.polygons) for o in meshes)
    return total_before, total_after, ratio


_PROCEDURAL_NODE_TYPES = {
    'TEX_NOISE', 'TEX_VORONOI', 'TEX_MUSGRAVE', 'TEX_WAVE', 'TEX_GRADIENT',
    'TEX_MAGIC', 'TEX_CHECKER', 'TEX_BRICK', 'VALTORGB', 'AMBIENT_OCCLUSION',
    'BEVEL', 'NEW_GEOMETRY', 'OBJECT_INFO', 'VERTEX_COLOR', 'ATTRIBUTE',
    'GROUP', 'MIX_SHADER', 'ADD_SHADER',
}


def ensure_mesh_uv(o):
    """Tạo UVMap tự động bằng Smart UV Project nếu mesh chưa có lớp UV nào."""
    if o.data.uv_layers:
        return True
    try:
        if o.data.users > 1:
            o.data = o.data.copy()
        o.data.uv_layers.new(name='UVMap')
        bpy.ops.object.select_all(action='DESELECT')
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.uv.smart_project(angle_limit=math.radians(66.0), island_margin=0.02)
        bpy.ops.object.mode_set(mode='OBJECT')
        return True
    except Exception:
        try:
            bpy.ops.object.mode_set(mode='OBJECT')
        except Exception:
            pass
        return bool(o.data.uv_layers)


def _needs_material_bake(mat) -> tuple[bool, bool, bool]:
    """Trả về (bake_color, bake_roughness, bake_normal) nếu vật liệu dùng Shader Nodes thủ tục / NodeGroup."""
    if not mat or not mat.node_tree:
        return (False, False, False)
    nodes = mat.node_tree.nodes
    out_node = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL' and n.is_active_output), None)
    if not out_node:
        out_node = next((n for n in nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if not out_node or not out_node.inputs['Surface'].is_linked:
        return (False, False, False)

    surf_node = out_node.inputs['Surface'].links[0].from_node
    has_proc_nodes = any(n.type in _PROCEDURAL_NODE_TYPES for n in nodes)
    has_bump = any(n.type == 'BUMP' for n in nodes)

    # Nếu nối thẳng NodeGroup hoặc MixShader ra Output -> glTF exporter không hiểu, cần bake cả 3 kênh
    if surf_node.type != 'BSDF_PRINCIPLED':
        return (True, True, has_bump or surf_node.type == 'GROUP')

    bsdf = surf_node
    bc_in = bsdf.inputs.get('Base Color')
    rough_in = bsdf.inputs.get('Roughness')
    norm_in = bsdf.inputs.get('Normal')

    bake_color = False
    if bc_in and bc_in.is_linked:
        from_node = bc_in.links[0].from_node
        if from_node.type != 'TEX_IMAGE' or has_proc_nodes:
            bake_color = True

    bake_rough = False
    if rough_in and rough_in.is_linked:
        from_node = rough_in.links[0].from_node
        if from_node.type != 'TEX_IMAGE' or has_proc_nodes:
            bake_rough = True

    bake_norm = False
    if norm_in and norm_in.is_linked:
        from_node = norm_in.links[0].from_node
        if from_node.type == 'BUMP' or (from_node.type != 'NORMAL_MAP' and has_proc_nodes):
            bake_norm = True

    return (bake_color, bake_rough, bake_norm)


def bake_procedural_materials_if_needed(meshes, td: Path, role: str = 'hero'):
    """Tự động nướng (bake) vật liệu dùng Shader Nodes thủ tục / NodeGroup của BlenderKit
    sang PBR Image Texture (BaseColor, Roughness, Normal) để giữ nguyên chất liệu trong Three.js."""
    baked_count = 0
    mat_to_meshes: dict[str, tuple] = {}
    for o in meshes:
        for slot in o.material_slots:
            mat = slot.material
            if not mat or not mat.node_tree:
                continue
            flags = _needs_material_bake(mat)
            if any(flags):
                if mat.name not in mat_to_meshes:
                    mat_to_meshes[mat.name] = (mat, flags, [])
                mat_to_meshes[mat.name][2].append(o)

    if not mat_to_meshes:
        return 0

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 4
    res = 1024 if role != 'bg' else 512

    for idx, (mat_name, (mat, (do_col, do_rough, do_norm), objs)) in enumerate(list(mat_to_meshes.items())[:10]):
        # Đảm bảo mọi mesh dùng vật liệu này đều có UVMap và chọn mesh lớn nhất để bake
        for o_m in objs:
            ensure_mesh_uv(o_m)
        primary = max(objs, key=lambda m: len(m.data.polygons))
        if not primary.data.uv_layers:
            continue
        try:
            nt = mat.node_tree
            out_node = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
            if not out_node or not out_node.inputs['Surface'].is_linked:
                continue
            old_surf_socket = out_node.inputs['Surface'].links[0].from_socket
            bsdf = old_surf_socket.node if old_surf_socket.node.type == 'BSDF_PRINCIPLED' else None

            def _bake_pass(suffix: str, bake_type: str, non_color: bool = False, emit_socket=None):
                img = bpy.data.images.new(f'bk_{ suffix }_{idx}', width=res, height=res, alpha=False)
                if non_color:
                    img.colorspace_settings.name = 'Non-Color'
                t_node = nt.nodes.new('ShaderNodeTexImage')
                t_node.image = img
                for n in nt.nodes:
                    n.select = False
                t_node.select = True
                nt.nodes.active = t_node

                emit_node = None
                if emit_socket is not None:
                    emit_node = nt.nodes.new('ShaderNodeEmission')
                    nt.links.new(emit_socket, emit_node.inputs['Color'])
                    nt.links.new(emit_node.outputs['Emission'], out_node.inputs['Surface'])

                bpy.ops.object.select_all(action='DESELECT')
                primary.select_set(True)
                bpy.context.view_layer.objects.active = primary
                if bake_type == 'DIFFUSE':
                    bpy.ops.object.bake(type='DIFFUSE', pass_filter={'COLOR'}, margin=4, use_clear=True)
                else:
                    bpy.ops.object.bake(type=bake_type, margin=4, use_clear=True)

                if emit_node is not None:
                    nt.links.new(old_surf_socket, out_node.inputs['Surface'])
                    nt.nodes.remove(emit_node)

                out_png = td / f'baked_{suffix}_{idx}.png'
                img.filepath_raw = str(out_png)
                img.file_format = 'PNG'
                img.save()
                fresh = bpy.data.images.load(str(out_png))
                if non_color:
                    fresh.colorspace_settings.name = 'Non-Color'
                t_node.image = fresh
                return t_node

            col_tex = None
            if do_col:
                bc_sock = bsdf.inputs['Base Color'].links[0].from_socket if (bsdf and bsdf.inputs['Base Color'].is_linked) else None
                col_tex = _bake_pass('col', 'EMIT' if bc_sock else 'DIFFUSE', non_color=False, emit_socket=bc_sock)

            rough_tex = None
            if do_rough:
                r_sock = bsdf.inputs['Roughness'].links[0].from_socket if (bsdf and bsdf.inputs['Roughness'].is_linked) else None
                rough_tex = _bake_pass('rough', 'EMIT' if r_sock else 'ROUGHNESS', non_color=True, emit_socket=r_sock)

            norm_tex = None
            if do_norm:
                norm_tex = _bake_pass('norm', 'NORMAL', non_color=True)

            # Nếu vật liệu gốc là NodeGroup / MixShader, tạo Principled BSDF chuẩn glTF để nối kết quả bake
            if bsdf is None:
                bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
                nt.links.new(bsdf.outputs['BSDF'], out_node.inputs['Surface'])

            if col_tex is not None:
                nt.links.new(col_tex.outputs['Color'], bsdf.inputs['Base Color'])
            if rough_tex is not None:
                nt.links.new(rough_tex.outputs['Color'], bsdf.inputs['Roughness'])
            if norm_tex is not None:
                nmap = nt.nodes.new('ShaderNodeNormalMap')
                nt.links.new(norm_tex.outputs['Color'], nmap.inputs['Color'])
                nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])

            baked_count += 1
        except Exception as e:
            print(f'[bk-prep] Bỏ qua bake {mat_name}: {e}')
    return baked_count


def bvh_stats(meshes):
    deps = bpy.context.evaluated_depsgraph_get()
    trees = 0
    for o in meshes[:12]:
        try:
            tree = BVHTree.FromObject(o, deps)
            if tree:
                trees += 1
        except Exception:
            pass
    return trees


def render_inspect_sheet(meshes, mn: Vector, mx: Vector, inspect_path: str):
    """Chụp nhanh 4 góc EEVEE/Workbench có cọc đỏ chỉ hướng +X (mũi) để Subagent kiểm mắt."""
    scene = bpy.context.scene
    dim = mx - mn
    center = 0.5 * (mn + mx)
    span = max(dim.x, dim.y, dim.z, 0.5)

    bpy.ops.mesh.primitive_cone_add(
        vertices=16,
        radius1=span * 0.045,
        radius2=0.0,
        depth=span * 0.14,
        location=(mx.x + span * 0.09, 0.0, center.z),
        rotation=(0.0, math.pi / 2, 0.0),
    )
    marker = bpy.context.active_object
    marker.name = '_BK_Front_PlusX_Marker'
    mmat = bpy.data.materials.new('_BK_Red')
    bsdf = mmat.node_tree.nodes.get('Principled BSDF') if mmat.node_tree else None
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (1.0, 0.12, 0.08, 1.0)
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = (1.0, 0.15, 0.05, 1.0)
            bsdf.inputs['Emission Strength'].default_value = 1.5
    marker.data.materials.append(mmat)

    light_data = bpy.data.lights.new(name='_BK_Sun', type='SUN')
    light_data.energy = 3.8
    light_obj = bpy.data.objects.new(name='_BK_Sun', object_data=light_data)
    scene.collection.objects.link(light_obj)
    light_obj.rotation_euler = Euler((math.radians(48), math.radians(15), math.radians(-35)), 'XYZ')

    if not scene.world:
        scene.world = bpy.data.worlds.new('_BK_World')
    bg = scene.world.node_tree.nodes.get('Background') if scene.world.node_tree else None
    if bg:
        bg.inputs[0].default_value = (0.16, 0.19, 0.23, 1.0)
        bg.inputs[1].default_value = 1.1

    cam_data = bpy.data.cameras.new('_BK_Cam')
    cam_data.lens = 42
    cam_obj = bpy.data.objects.new('_BK_Cam', cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    for eng in ('BLENDER_EEVEE', 'BLENDER_WORKBENCH', 'CYCLES'):
        try:
            scene.render.engine = eng
            break
        except Exception:
            continue
    if scene.render.engine == 'CYCLES':
        scene.cycles.samples = 12
    scene.render.resolution_x = 640
    scene.render.resolution_y = 400
    scene.render.image_settings.file_format = 'PNG'

    dist = span * 1.65
    views = [
        ('front34_plusX', Vector((center.x + dist * 0.85, center.y - dist * 0.72, center.z + dist * 0.42))),
        ('side_right_plusX_is_right', Vector((center.x, center.y - dist * 1.25, center.z + dist * 0.12))),
        ('top_plusX_is_right', Vector((center.x, center.y - 0.01, center.z + dist * 1.35))),
        ('rear34_minusX', Vector((center.x - dist * 0.88, center.y + dist * 0.72, center.z + dist * 0.45))),
    ]

    td = Path(tempfile.mkdtemp(prefix='bk_inspect_'))
    shots = []
    for i, (vname, pos) in enumerate(views):
        cam_obj.location = pos
        direction = (center - pos).normalized()
        cam_obj.rotation_euler = direction.to_track_quat('-Z', 'Y').to_euler()
        fp = td / f'v{i}_{vname}.png'
        scene.render.filepath = str(fp)
        bpy.ops.render.render(write_still=True)
        shots.append(fp)

    for tmp_obj in (marker, light_obj, cam_obj):
        bpy.data.objects.remove(tmp_obj, do_unlink=True)

    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-i', str(shots[0]), '-i', str(shots[1]), '-i', str(shots[2]), '-i', str(shots[3]),
        '-filter_complex', '[0:v][1:v]hstack=inputs=2[top];[2:v][3:v]hstack=inputs=2[bot];[top][bot]vstack=inputs=2',
        str(inspect_path),
    ], check=True)


def main():
    args = parse_args()
    rig_spec = json.loads(Path(args['rig']).read_text()) if args['rig'] else None
    exclude = tuple(rig_spec.get('exclude_prefixes', ())) if rig_spec else ()
    ground_prefs = tuple(rig_spec.get('ground_prefixes', ())) if rig_spec else ()

    load_source(args['src'])
    meshes = clean_meshes(exclude)
    if not meshes:
        raise RuntimeError(f"Không tìm thấy mesh hợp lệ trong {args['src']}")

    mn, mx = bake_world_normalized_to_vertices(
        meshes,
        args['front'],
        args['up'],
        args['ground'],
        args['target_len'],
        ground_prefs,
        args['length_x'],
        args['height_y'],
    )

    if args['inspect_parts']:
        rep = inspect_parts_summary(meshes, mn, mx)
        if args['report']:
            Path(args['report']).write_text(json.dumps(rep, ensure_ascii=False, indent=2))
        return

    with tempfile.TemporaryDirectory(prefix='bk_tex_') as td_str:
        td = Path(td_str)
        faces_before, faces_after, ratio = apply_selective_decimate(meshes, args['role'], args['decimate'])
        baked = bake_procedural_materials_if_needed(meshes, td, args['role'])
        recolored = apply_laplace_recolor(args['recolor'], td) if args['recolor'] else 0
        bvh_count = bvh_stats(meshes)

        pivots_out = {}
        preserve_tree = bool(rig_spec or args['keep_nodes'])
        if rig_spec:
            pivots_out = build_rig_hierarchy(meshes, rig_spec)

        dim = mx - mn
        gltf_dim = {'length_x': round(dim.x, 4), 'height_y': round(dim.z, 4), 'width_z': round(dim.y, 4)}
        part_names = [o.name for o in meshes[:50]]

        if args['inspect']:
            render_inspect_sheet(meshes, mn, mx, args['inspect'])

        if args['out']:
            bpy.ops.export_scene.gltf(
                filepath=args['out'],
                export_format='GLB',
                export_yup=True,
                export_apply=not preserve_tree,
                export_texcoords=True,
                export_normals=True,
                export_materials='EXPORT',
                export_image_format='WEBP',
                export_image_quality=91,
            )

    rep = {
        'src': args['src'],
        'role': args['role'],
        'front_used': args['front'],
        'faces_before': faces_before,
        'faces_after': faces_after,
        'decimate_ratio': round(ratio, 4),
        'baked_materials': baked,
        'recolored_textures': recolored,
        'bvh_trees_verified': bvh_count,
        'gltf_dimensions_m': gltf_dim,
        'gltf_bounds_m': {
            'x': [round(mn.x, 4), round(mx.x, 4)],
            'y': [round(mn.z, 4), round(mx.z, 4)],
            'z': [round(-mx.y, 4), round(-mn.y, 4)],
        },
        'pivots_gltf': pivots_out,
        'mesh_count': len(meshes),
        'sample_meshes': part_names,
    }
    if args['report']:
        Path(args['report']).write_text(json.dumps(rep, ensure_ascii=False, indent=2))
    print(f"[bk-prep] OK role={args['role']} faces={faces_before}->{faces_after} (ratio={ratio:.2f}) "
          f"dim(X,Y,Z)={gltf_dim['length_x']}x{gltf_dim['height_y']}x{gltf_dim['width_z']}m "
          f"baked={baked} recolor={recolored} pivots={len(pivots_out)}")


if __name__ == '__main__':
    main()
