"""Thumbnail kiểu studio tối: máy bay nhìn thẳng ngang tầm thân, đèn viền xanh trái / đỏ phải, sàn đen bóng.

Chạy:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python thumbnail/studio_front/build_thumb.py -- --model dc3 [--preview] [--no-save]

Ra: <--out, mặc định thư mục này>/<model>_thumb.png (1280x720) + <model>_thumb.blend
Thêm máy bay: khai báo trong MODELS (đường dẫn .blend nguồn BlenderKit, hướng mũi, tham số khung).
"""
import math
import os
import sys

import bpy
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
BK = os.path.join(ROOT, 'bk_cache')

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []


def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default


PREVIEW = '--preview' in argv
NO_SAVE = '--no-save' in argv
MODEL = arg('--model', 'dc3')

MODELS = {
    # front: hướng mũi trong file nguồn; frame_w: bề ngang khung / sải cánh (<1 = cắt mút cánh như ảnh mẫu)
    # cam_z: độ cao camera theo tỉ lệ chiều cao máy bay (ngang tầm thân); ground: vị trí đáy bánh trong khung (0 = trên, 1 = dưới)
    'dc3': dict(src='bfa66172-84ee-4ccb-ac55-0d3a69cc4965/source_resolution_2K.blend', front='-Y',
                frame_w=0.5, cam_z=0.36, ground=0.9, lens=50, silver=True),
    'v22': dict(src='f093d6b7-e4a8-498e-87f8-de2148c79e66/source_resolution_2K.blend', front='-Y',
                frame_w=1.02, cam_z=0.40, ground=0.86, lens=85, silver=True),
}
CFG = MODELS[MODEL]

RES_X, RES_Y = 1280, 720
SAMPLES = 16 if PREVIEW else 64
LENS = CFG.get('lens', 50.0)


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)


def new_mat(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    return m, m.node_tree.nodes, m.node_tree.links, m.node_tree.nodes['Principled BSDF']


def mesh_obj(name, verts, faces, mat=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], faces)
    me.update()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    return ob


# ---------------- máy bay ----------------
def load_aircraft():
    path = os.path.join(BK, CFG['src'])
    with bpy.data.libraries.load(path, link=False) as (src, dst):
        dst.objects = src.objects
    col = bpy.data.collections.new('Aircraft')
    bpy.context.scene.collection.children.link(col)
    objs = [o for o in dst.objects if o is not None]
    for o in objs:
        col.objects.link(o)
    roots = [o for o in objs if o.parent is None]
    pivot = bpy.data.objects.new('AircraftRoot', None)
    col.objects.link(pivot)
    for o in roots:
        o.parent = pivot
    # mũi hướng về -Y (camera ở phía -Y nhìn sang +Y)
    rot = {'-Y': 0, '+Y': 180, '+X': -90, '-X': 90}[CFG['front']]
    pivot.rotation_euler = (0, 0, math.radians(rot))
    bpy.context.view_layer.update()
    mn, mx = bbox(objs)
    pivot.location = (-(mn.x + mx.x) / 2, -(mn.y + mx.y) / 2, -mn.z)
    bpy.context.view_layer.update()
    mn, mx = bbox(objs)
    # ẩn mảnh lạc nằm dưới sàn
    for o in objs:
        if o.type == 'MESH':
            top = max((o.matrix_world @ Vector(c)).z for c in o.bound_box)
            if top < mn.z - 0.02:
                o.hide_render = True
                o.hide_viewport = True
                print('HIDE stray', o.name)
    return objs, mn, mx


def bbox(objs, min_size=0.3):
    """Hộp bao bỏ qua mảnh vụn < min_size (file BlenderKit hay có chi tiết buồng lái lạc chỗ)."""
    mn = Vector((1e9, 1e9, 1e9))
    mx = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        if o.type != 'MESH' or o.hide_render or max(o.dimensions) < min_size:
            continue
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            mn = Vector(map(min, mn, w))
            mx = Vector(map(max, mx, w))
    return mn, mx


def make_silver(objs):
    """Vỏ nhôm đánh bóng như ảnh mẫu: khử màu sơn gốc, giữ độ sáng tối của texture (đường tấm, đinh tán)."""
    done = set()
    for o in objs:
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if not m or m in done or not m.node_tree:
                continue
            done.add(m)
            if any(k in m.name.lower() for k in ('glass', 'transparent', 'vitre', 'window', 'tire', 'rubber')):
                continue
            nt = m.node_tree
            for nd in list(nt.nodes):
                if nd.type != 'BSDF_PRINCIPLED':
                    continue
                if nd.inputs['Alpha'].is_linked or nd.inputs['Alpha'].default_value < 0.99:
                    continue
                sock = nd.inputs['Base Color']
                hsv = nt.nodes.new('ShaderNodeHueSaturation')
                hsv.inputs['Saturation'].default_value = 0.0
                hsv.inputs['Value'].default_value = 1.0
                mix = nt.nodes.new('ShaderNodeMix')
                mix.data_type = 'RGBA'
                mix.blend_type = 'MULTIPLY'
                mix.inputs['Factor'].default_value = 1.0
                mix.inputs['B'].default_value = srgb('#d7dbe0')
                if sock.is_linked:
                    nt.links.new(sock.links[0].from_socket, hsv.inputs['Color'])
                else:
                    hsv.inputs['Color'].default_value = sock.default_value
                nt.links.new(hsv.outputs['Color'], mix.inputs['A'])
                nt.links.new(mix.outputs['Result'], sock)
                if nd.inputs['Metallic'].is_linked:
                    nt.links.remove(nd.inputs['Metallic'].links[0])
                nd.inputs['Metallic'].default_value = 0.55
                if nd.inputs['Roughness'].is_linked:
                    nt.links.remove(nd.inputs['Roughness'].links[0])
                nd.inputs['Roughness'].default_value = 0.28


# ---------------- studio ----------------
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    objs, mn, mx = load_aircraft()
    if CFG.get('silver'):
        make_silver(objs)
    span = mx.x - mn.x
    height = mx.z - mn.z
    length = mx.y - mn.y

    # sàn đen bóng (phản chiếu mờ)
    fm, fn, fl, fb = new_mat('StudioFloor')
    fb.inputs['Base Color'].default_value = srgb('#3a3e46')
    fb.inputs['Roughness'].default_value = 0.22
    fb.inputs['Specular IOR Level'].default_value = 0.6
    nz = fn.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 0.35
    rr = fn.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = 0.07
    rr.inputs['To Max'].default_value = 0.16
    fl.new(nz.outputs['Fac'], rr.inputs['Value'])
    fl.new(rr.outputs['Result'], fb.inputs['Roughness'])
    mesh_obj('Floor', [(-400, -400, 0), (400, -400, 0), (400, 400, 0), (-400, 400, 0)], [[0, 1, 2, 3]], fm)

    # phông nền tối phía sau (đèn màu hắt lên tạo mảng xanh / đỏ)
    bm, bn, bl, bb = new_mat('StudioBackdrop')
    bb.inputs['Base Color'].default_value = srgb('#16181d')
    bb.inputs['Roughness'].default_value = 0.9
    # tối dần xuống chân phông → chỗ gặp sàn chìm vào bóng tối, không thành đường cắt
    geo = bn.new('ShaderNodeNewGeometry')
    sep = bn.new('ShaderNodeSeparateXYZ')
    bl.new(geo.outputs['Position'], sep.inputs['Vector'])
    grad = bn.new('ShaderNodeMapRange')
    grad.interpolation_type = 'SMOOTHSTEP'
    grad.inputs['From Min'].default_value = 0.0
    grad.inputs['From Max'].default_value = height * 1.6
    grad.inputs['To Min'].default_value = 0.02
    bl.new(sep.outputs['Z'], grad.inputs['Value'])
    gm = bn.new('ShaderNodeMix')
    gm.data_type = 'RGBA'
    gm.blend_type = 'MULTIPLY'
    gm.inputs['Factor'].default_value = 1.0
    gm.inputs['A'].default_value = srgb('#16181d')
    bl.new(grad.outputs['Result'], gm.inputs['B'])
    bl.new(gm.outputs['Result'], bb.inputs['Base Color'])
    back_y = mx.y + max(25.0, length * 1.5)

    mesh_obj('Backdrop', [(-300, back_y, -1), (300, back_y, -1), (300, back_y, 200), (-300, back_y, 200)], [[0, 3, 2, 1]], bm)

    # camera ngang tầm thân, nhìn thẳng, không nghiêng — dùng shift để đặt khung
    frame_w = span * CFG['frame_w']
    frame_h = frame_w * RES_Y / RES_X
    dist = LENS / 36.0 * frame_w
    cam_z = mn.z + height * CFG['cam_z']
    z_center = mn.z + (CFG['ground'] - 0.5) * frame_h   # đáy bánh nằm ở tỉ lệ 'ground' từ trên xuống
    cd = bpy.data.cameras.new('Cam')
    cd.lens = LENS
    cd.sensor_width = 36
    cd.sensor_fit = 'HORIZONTAL'
    cd.shift_y = (z_center - cam_z) / frame_w
    cd.clip_end = 2000
    cam = bpy.data.objects.new('Cam', cd)
    sc.collection.objects.link(cam)
    nose_y = mn.y
    cam.location = (0, nose_y - dist, cam_z)
    cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam

    # ---------- ánh sáng ----------
    def light(kind, name, loc, target, power, color, size=1.0, spot=None, blend=0.6, spread=180):
        ld = bpy.data.lights.new(name, kind)
        ld.energy = power
        ld.color = srgb(color)[:3]
        if kind == 'AREA':
            ld.shape = 'DISK'
            ld.size = size
            ld.spread = math.radians(spread)
        elif kind == 'SPOT':
            ld.spot_size = math.radians(spot)
            ld.spot_blend = blend
            ld.shadow_soft_size = size
        lo = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(lo)
        lo.location = loc
        d = Vector(target) - Vector(loc)
        lo.rotation_euler = d.to_track_quat('-Z', 'Y').to_euler()
        lo.visible_camera = False
        return lo

    s = span / 29.0                       # thang theo cỡ máy bay (DC-3 = 1)
    cz = mn.z + height * 0.45
    # mảng màu trên phông: xanh bên trái, đỏ bên phải
    fw = span * CFG['frame_w'] * (back_y - (mn.y - LENS / 36.0 * span * CFG['frame_w'])) / (LENS / 36.0 * span * CFG['frame_w'])
    bx = fw * 0.36                        # tâm mảng màu: ~1/6 khung tính từ mép
    for nm, sx, col in (('BackBlue', -1, '#2a5cff'), ('BackRed', 1, '#ff1f3d')):
        lo = light('SPOT', nm, (sx * bx, back_y - 22 * s, cz), (sx * bx, back_y, cz + 3 * s), 300000 * s * s, col, 2, 62, 1.0)
        lo.visible_glossy = False
    # đèn viền (rim) từ phía sau hai bên → viền xanh / đỏ trên thân và cánh
    # light linking: đèn viền chỉ chiếu lên máy bay (không phản chiếu thành đốm trên sàn bóng)
    for nm, sx, col in (('RimBlue', -1, '#3b6bff'), ('RimRed', 1, '#ff2b45')):
        lo = light('AREA', nm, (sx * span * 0.7, mx.y + 8 * s, cz + 6 * s), (0, mn.y, cz), 60000 * s * s, col, 8 * s, spread=35)
        lo.light_linking.receiver_collection = bpy.data.collections['Aircraft']
    # đèn hắt thấp từ trước lên mặt dưới cánh (cánh nhôm không bị đen)
    uf = light('AREA', 'UnderFill', (0, mn.y - 12 * s, 0.4 * s), (0, mn.y + 6 * s, cz), 22000 * s * s, '#e6ecff', 14 * s, spread=60)
    uf.light_linking.receiver_collection = bpy.data.collections['Aircraft']
    # đèn chính dịu phía trên trước mặt (thân kim loại sáng, thấy chi tiết)
    key = light('AREA', 'KeyTop', (0, mn.y - 14 * s, mx.z + 14 * s), (0, (mn.y + mx.y) / 2 - 3 * s, cz), 90000 * s * s, '#f2f4ff', 16 * s)
    # đèn nhỏ từ phía camera để mặt trước không bị đen
    ff = light('AREA', 'FrontFill', (0, mn.y - 40 * s, cz + 2 * s), (0, mn.y, cz), 30000 * s * s, '#dfe6ff', 20 * s)
    for lo in (key, ff):   # chỉ chiếu máy bay → không thành chấm sáng phản chiếu trên sàn
        lo.light_linking.receiver_collection = bpy.data.collections['Aircraft']
    # quầng sáng ở đỉnh khung như ảnh mẫu (đèn trần chiếu xuống phông)
    th = light('SPOT', 'TopHalo', (0, back_y - 18 * s, mx.z + 30 * s), (0, back_y, mx.z + 4 * s), 70000 * s * s, '#ffffff', 3, 34, 1.0)

    th.data.specular_factor = 0.0          # không thành chấm phản chiếu trên sàn
    # vũng sáng dịu trên sàn quanh máy bay (thấy bánh, thấy sàn bóng)
    pool = light('SPOT', 'FloorPool', (0, (mn.y + mx.y) / 2 - 2 * s, mx.z + 26 * s), (0, (mn.y + mx.y) / 2 - 2 * s, 0), 700000 * s * s, '#dfe5f2', 6 * s, 52, 1.0)
    pool.data.specular_factor = 0.0
    # nền đen tuyệt đối
    w = bpy.data.worlds.new('Black')
    sc.world = w
    w.use_nodes = True
    w.node_tree.nodes['Background'].inputs['Color'].default_value = (0.004, 0.004, 0.006, 1)
    w.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0

    # ---------- render EEVEE ----------
    sc.render.engine = 'BLENDER_EEVEE'
    ee = sc.eevee
    ee.taa_render_samples = SAMPLES
    for k, v in (('use_raytracing', True), ('ray_tracing_method', 'SCREEN'), ('use_shadows', True),
                 ('use_volumetric_shadows', False), ('fast_gi_method', 'GLOBAL_ILLUMINATION')):
        if hasattr(ee, k):
            setattr(ee, k, v)
    if hasattr(ee, 'ray_tracing_options'):
        ee.ray_tracing_options.resolution_scale = '1'
    sc.render.resolution_x = RES_X
    sc.render.resolution_y = RES_Y
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Punchy'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'
    add_vignette(sc)
    for nm in filter(None, os.environ.get('THUMB_OFF', '').split(',')):   # gỡ lỗi: tắt đèn theo tên
        if nm in bpy.data.objects:
            bpy.data.objects[nm].hide_render = True
    print(f'MODEL {MODEL} span={span:.1f} height={height:.1f} length={length:.1f} dist={dist:.1f}')


def add_vignette(sc):
    """Tối dần mép khung (compositor). Bỏ qua nếu API compositor khác bản."""
    try:
        ng = bpy.data.node_groups.new('Vignette', 'CompositorNodeTree')
        sc.compositing_node_group = ng
        n, l = ng.nodes, ng.links
        rl = n.new('CompositorNodeRLayers')
        out = n.new('NodeGroupOutput')
        ng.interface.new_socket('Image', in_out='OUTPUT', socket_type='NodeSocketColor')
        el = n.new('CompositorNodeEllipseMask')
        el.inputs['Size'].default_value = (0.95, 0.85)
        bl = n.new('CompositorNodeBlur')
        bl.inputs['Size'].default_value = (220, 220)
        l.new(el.outputs['Mask'], bl.inputs['Image'])
        mr = n.new('ShaderNodeMapRange')
        mr.inputs['To Min'].default_value = 0.12
        l.new(bl.outputs['Image'], mr.inputs['Value'])
        mix = n.new('ShaderNodeMix')
        mix.data_type = 'RGBA'
        mix.blend_type = 'MULTIPLY'
        mix.inputs['Factor'].default_value = 1.0
        l.new(rl.outputs['Image'], mix.inputs['A'])
        l.new(mr.outputs['Result'], mix.inputs['B'])
        l.new(mix.outputs['Result'], out.inputs[0])
        print('VIGNETTE on')
    except Exception as e:  # noqa
        print('VIGNETTE skip:', e)
        sc.compositing_node_group = None


build()
name = f'{MODEL}_thumb' + ('_preview' if PREVIEW else '')
OUT = arg('--out', HERE)
out_dir = os.environ.get('PREVIEW_DIR', OUT) if PREVIEW else OUT
os.makedirs(out_dir, exist_ok=True)
if not PREVIEW and not NO_SAVE:
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(out_dir, f'{MODEL}_thumb.blend'), compress=True)
bpy.context.scene.render.filepath = os.path.join(out_dir, name + '.png')
bpy.ops.render.render(write_still=True)
print('RENDERED', bpy.context.scene.render.filepath)
