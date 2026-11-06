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
        'role': get('--role', 'hero'),
        'front': get('--front', 'auto'),
        'up': get('--up', 'auto'),
        'ground': get('--ground', 'bottom'),
        'target_len': float(get('--target-len')) if get('--target-len') else None,
        'decimate': float(get('--decimate')) if get('--decimate') else None,
        'report': get('--report'),
    }


def load_source(src_path: str):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ext = Path(src_path).suffix.lower()
    if ext == '.blend':
        with bpy.data.libraries.load(src_path, link=False) as (data_from, data_to):
            data_to.objects = list(data_from.objects)
        scene = bpy.context.scene
        for obj in data_to.objects:
            if obj is not None and obj.name not in scene.collection.objects:
                scene.collection.objects.link(obj)
        bpy.context.view_layer.update()
        # Giải phóng các collection instance nếu asset đóng gói dạng instance
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
        bpy.ops.import_scene.gltf(filepath=src_path)
    bpy.context.view_layer.update()


def world_bbox(objs):
    mn = Vector((1e18, 1e18, 1e18))
    mx = Vector((-1e18, -1e18, -1e18))
    ok = False
    for o in objs:
        for corner in o.bound_box:
            w = o.matrix_world @ Vector(corner)
            mn.x, mn.y, mn.z = min(mn.x, w.x), min(mn.y, w.y), min(mn.z, w.z)
            mx.x, mx.y, mx.z = max(mx.x, w.x), max(mx.y, w.y), max(mx.z, w.z)
            ok = True
    return (mn, mx) if ok else (Vector((0, 0, 0)), Vector((0, 0, 0)))


def clean_meshes():
    scene = bpy.context.scene
    # Xoá đèn, camera, empty rác hoặc vật thể ẩn render
    for o in list(scene.objects):
        if o.type not in ('MESH', 'CURVE', 'SURFACE', 'FONT', 'EMPTY'):
            bpy.data.objects.remove(o, do_unlink=True)
        elif o.hide_render:
            bpy.data.objects.remove(o, do_unlink=True)

    # Chuyển curve/surface sang mesh nếu có
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
        # Loại bỏ tấm nền / backdrop khổng lồ thường đi kèm file .blend mẫu
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


def make_parent_normalized(meshes, front: str, up: str, ground: str, target_len):
    # Ngắt parent cũ nhưng giữ nguyên ma trận thế giới để xoay đồng nhất
    bpy.ops.object.select_all(action='DESELECT')
    for o in meshes:
        mw = o.matrix_world.copy()
        o.parent = None
        o.matrix_world = mw
    for o in list(bpy.context.scene.objects):
        if o.type == 'EMPTY':
            bpy.data.objects.remove(o, do_unlink=True)
    bpy.context.view_layer.update()

    mn, mx = world_bbox(meshes)
    dim = mx - mn

    # Trong Blender trước khi xuất glTF (export_yup=True):
    # Blender +X -> Three.js +X (mũi hướng trước)
    # Blender +Z -> Three.js +Y (hướng lên trên)
    # Blender -Y -> Three.js +Z (mạn phải)
    ax_map = {
        '+X': Vector((1, 0, 0)), '-X': Vector((-1, 0, 0)),
        '+Y': Vector((0, 1, 0)), '-Y': Vector((0, -1, 0)),
        '+Z': Vector((0, 0, 1)), '-Z': Vector((0, 0, -1)),
    }
    if up == 'auto':
        up_vec = Vector((0, 0, 1))
    else:
        up_vec = ax_map[up]

    if front == 'auto':
        # Trục ngang dài nhất làm trục thân (+X hay -Y); mặc định BlenderKit hay quay mặt về -Y hoặc +Y
        if dim.y >= dim.x * 1.08:
            front_vec = Vector((0, -1, 0))
        else:
            front_vec = Vector((1, 0, 0))
    else:
        front_vec = ax_map[front]

    # Dựng ma trận cơ sở trực chuẩn đưa (front_vec -> +X_bl, up_vec -> +Z_bl)
    f = front_vec.normalized()
    u = (up_vec - f * up_vec.dot(f)).normalized()
    if u.length < 1e-4:
        u = Vector((0, 0, 1)) if abs(f.z) < 0.9 else Vector((0, 1, 0))
        u = (u - f * u.dot(f)).normalized()
    # Hệ toạ độ phải của Blender: X_bl cross Y_bl = Z_bl => Y_bl = Z_bl cross X_bl = u cross f
    y_bl = u.cross(f).normalized()
    # Ta muốn v_new = R @ v_old sao cho R @ f = (1,0,0), R @ y_bl = (0,1,0), R @ u = (0,0,1)
    rot3 = Matrix((f, y_bl, u))  # hàng là f, y_bl, u => R @ f = (1,0,0)!
    rot4 = rot3.to_4x4()

    for o in meshes:
        o.matrix_world = rot4 @ o.matrix_world
    bpy.context.view_layer.update()

    mn, mx = world_bbox(meshes)
    dim = mx - mn
    cur_len = max(dim.x, dim.y, dim.z, 1e-5)
    scale = (target_len / cur_len) if target_len else 1.0
    if abs(scale - 1.0) > 1e-5:
        s4 = Matrix.Diagonal((scale, scale, scale, 1.0))
        for o in meshes:
            o.matrix_world = s4 @ o.matrix_world
        bpy.context.view_layer.update()
        mn, mx = world_bbox(meshes)
        dim = mx - mn

    cx = 0.5 * (mn.x + mx.x)
    cy = 0.5 * (mn.y + mx.y)
    cz = mn.z if ground == 'bottom' else 0.5 * (mn.z + mx.z)
    shift = Matrix.Translation(Vector((-cx, -cy, -cz)))
    for o in meshes:
        o.matrix_world = shift @ o.matrix_world
    bpy.context.view_layer.update()
    return world_bbox(meshes)


def apply_selective_decimate(meshes, role: str, custom_ratio):
    total_before = sum(len(o.data.polygons) for o in meshes)
    ratio = custom_ratio
    if ratio is None:
        if role == 'bg':
            ratio = 0.28
        elif role == 'hero':
            ratio = min(1.0, 45000.0 / total_before) if total_before > 52000 else 1.0
        else:
            ratio = 1.0

    if ratio < 0.98:
        # Đảm bảo không dùng chung mesh data trước khi áp modifier
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


def bake_procedural_materials_if_needed(meshes):
    """Nếu vật liệu dùng node thủ tục phức tạp không có ảnh Base Color, tự nướng nhanh sang PBR Image Texture."""
    baked_count = 0
    visited = set()
    has_procedural = []
    for o in meshes:
        if not o.data.uv_layers:
            continue
        for slot in o.material_slots:
            mat = slot.material
            if not mat or not mat.use_nodes or mat.name in visited:
                continue
            visited.add(mat.name)
            bsdf = next((n for n in mat.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
            if not bsdf:
                continue
            bc_in = bsdf.inputs.get('Base Color')
            if bc_in and bc_in.is_linked:
                # Kiểm tra xem có node TEX_IMAGE nào trong cây nối vào Base Color không
                has_img = any(n.type == 'TEX_IMAGE' and n.image is not None for n in mat.node_tree.nodes)
                if not has_img:
                    has_procedural.append((o, mat, bsdf))

    if not has_procedural:
        return 0

    scene = bpy.context.scene
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 8
    for o, mat, bsdf in has_procedural[:6]:
        try:
            nt = mat.node_tree
            img = bpy.data.images.new(f'bk_bake_{mat.name}', width=512, height=512, alpha=False)
            tex_node = nt.nodes.new('ShaderNodeTexImage')
            tex_node.image = img
            for n in nt.nodes:
                n.select = False
            tex_node.select = True
            nt.nodes.active = tex_node

            # Nối tạm Base Color sang Emission để bake màu gốc chuẩn không phụ thuộc đèn
            bc_link = bsdf.inputs['Base Color'].links[0].from_socket
            emit = nt.nodes.new('ShaderNodeEmission')
            nt.links.new(bc_link, emit.inputs['Color'])
            out_node = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
            if not out_node:
                continue
            old_surf = out_node.inputs['Surface'].links[0].from_socket if out_node.inputs['Surface'].is_linked else None
            nt.links.new(emit.outputs['Emission'], out_node.inputs['Surface'])

            bpy.ops.object.select_all(action='DESELECT')
            o.select_set(True)
            bpy.context.view_layer.objects.active = o
            bpy.ops.object.bake(type='EMIT', margin=4, use_clear=True)
            img.pack()

            if old_surf:
                nt.links.new(old_surf, out_node.inputs['Surface'])
            nt.nodes.remove(emit)
            nt.links.new(tex_node.outputs['Color'], bsdf.inputs['Base Color'])
            baked_count += 1
        except Exception as e:
            print(f'[bk-prep] Bỏ qua bake {mat.name}: {e}')
    return baked_count


def bvh_stats(meshes):
    deps = bpy.context.evaluated_depsgraph_get()
    trees = 0
    min_clear = 1e9
    for o in meshes[:12]:
        try:
            tree = BVHTree.FromObject(o, deps)
            trees += 1
            loc, norm, idx, dist = tree.find_nearest(Vector((50.0, 0.0, 10.0)))
            if dist is not None:
                min_clear = min(min_clear, dist)
        except Exception:
            pass
    return trees


def render_inspect_sheet(meshes, mn: Vector, mx: Vector, inspect_path: str):
    """Chụp nhanh 4 góc EEVEE/Workbench có cọc đỏ chỉ hướng +X (mũi) để Subagent kiểm mắt."""
    scene = bpy.context.scene
    dim = mx - mn
    center = 0.5 * (mn + mx)
    span = max(dim.x, dim.y, dim.z, 0.5)

    # Đặt mũi tên đỏ ở đúng đầu +X để kiểm hướng mặt trước tuyệt đối không nhầm
    bpy.ops.mesh.primitive_cone_add(vertices=16, radius1=span * 0.045, radius2=0.0, depth=span * 0.14,
                                    location=(mx.x + span * 0.09, 0.0, center.z),
                                    rotation=(0.0, math.pi / 2, 0.0))
    marker = bpy.context.active_object
    marker.name = '_BK_Front_PlusX_Marker'
    mmat = bpy.data.materials.new('_BK_Red')
    mmat.use_nodes = True
    bsdf = mmat.node_tree.nodes.get('Principled BSDF')
    if bsdf:
        bsdf.inputs['Base Color'].default_value = (1.0, 0.12, 0.08, 1.0)
        if 'Emission Color' in bsdf.inputs:
            bsdf.inputs['Emission Color'].default_value = (1.0, 0.15, 0.05, 1.0)
            bsdf.inputs['Emission Strength'].default_value = 1.5
    marker.data.materials.append(mmat)

    # Đèn kiểm
    light_data = bpy.data.lights.new(name='_BK_Sun', type='SUN')
    light_data.energy = 3.8
    light_obj = bpy.data.objects.new(name='_BK_Sun', object_data=light_data)
    scene.collection.objects.link(light_obj)
    light_obj.rotation_euler = Euler((math.radians(48), math.radians(15), math.radians(-35)), 'XYZ')

    if not scene.world:
        scene.world = bpy.data.worlds.new('_BK_World')
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get('Background')
    if bg:
        bg.inputs[0].default_value = (0.16, 0.19, 0.23, 1.0)
        bg.inputs[1].default_value = 1.1

    cam_data = bpy.data.cameras.new('_BK_Cam')
    cam_data.lens = 42
    cam_obj = bpy.data.objects.new('_BK_Cam', cam_data)
    scene.collection.objects.link(cam_obj)
    scene.camera = cam_obj

    # Ưu tiên EEVEE trên Blender 5.x, fallback sang WORKBENCH nếu môi trường headless không mở được GPU
    engines = ['BLENDER_EEVEE', 'BLENDER_WORKBENCH', 'CYCLES']
    for eng in engines:
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

    # Xoá đồ kiểm trước khi xuất glb
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
    load_source(args['src'])
    meshes = clean_meshes()
    if not meshes:
        raise RuntimeError(f"Không tìm thấy mesh hợp lệ trong {args['src']}")

    mn, mx = make_parent_normalized(meshes, args['front'], args['up'], args['ground'], args['target_len'])
    faces_before, faces_after, ratio = apply_selective_decimate(meshes, args['role'], args['decimate'])
    baked = bake_procedural_materials_if_needed(meshes)
    bvh_count = bvh_stats(meshes)

    dim = mx - mn
    # Lưu ý: sau khi xuất glTF (Y-up): length(+X) = dim.x, height(+Y) = dim.z, width(Z) = dim.y
    gltf_dim = {'length_x': round(dim.x, 4), 'height_y': round(dim.z, 4), 'width_z': round(dim.y, 4)}
    part_names = [o.name for o in meshes[:40]]

    if args['inspect']:
        render_inspect_sheet(meshes, mn, mx, args['inspect'])

    if args['out']:
        bpy.ops.export_scene.gltf(
            filepath=args['out'],
            export_format='GLB',
            export_yup=True,
            export_apply=True,
            export_texcoords=True,
            export_normals=True,
            export_materials='EXPORT',
            export_image_format='JPEG',
            export_jpeg_quality=86,
        )

    rep = {
        'src': args['src'],
        'role': args['role'],
        'front_used': args['front'],
        'faces_before': faces_before,
        'faces_after': faces_after,
        'decimate_ratio': round(ratio, 4),
        'baked_materials': baked,
        'bvh_trees_verified': bvh_count,
        'gltf_dimensions_m': gltf_dim,
        'gltf_bounds_m': {
            'x': [round(mn.x, 4), round(mx.x, 4)],
            'y': [round(mn.z, 4), round(mx.z, 4)],
            'z': [round(-mx.y, 4), round(-mn.y, 4)],
        },
        'mesh_count': len(meshes),
        'sample_meshes': part_names,
    }
    if args['report']:
        Path(args['report']).write_text(json.dumps(rep, ensure_ascii=False, indent=2))
    print(f"[bk-prep] OK role={args['role']} faces={faces_before}->{faces_after} (ratio={ratio:.2f}) "
          f"dim(X,Y,Z)={gltf_dim['length_x']}x{gltf_dim['height_y']}x{gltf_dim['width_z']}m baked={baked}")


if __name__ == '__main__':
    main()
