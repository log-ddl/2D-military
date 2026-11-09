"""Dựng banner kênh AIRFACT trong Blender (nhà chứa máy bay, chữ stencil, logo, MQ-1 Predator).

Chạy:
  /Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup \
      --python banner/airfact/build_banner.py -- [--preview] [--no-render]

Ra: banner/airfact/airfact_banner.blend + airfact_banner.png (2048x1152, banner YouTube).
Vùng an toàn mọi thiết bị 1235x338 ở giữa: chữ + logo + drone nằm trong đó;
dải giữa 2048x338 (máy tính) giữ bố cục ngang như ảnh mẫu; phần trên/dưới chỉ TV thấy.
"""
import math
import os
import sys

import bpy
import bmesh
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
PLANE_BLEND = os.path.join(ROOT, 'bk_cache/7ba68385-85fb-4211-a660-191bd43457f6/source_resolution_1K.blend')
LOGO_SVG = os.path.join(ROOT, 'library/brand/logo_black.svg')

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
PREVIEW = '--preview' in argv
NO_RENDER = '--no-render' in argv

# ---------------- bố cục (mét) ----------------
WALL_Y = 34.0          # vách sau (máy bay ở gốc toạ độ, mũi hướng -Y về phía camera)
CAM_DIST = 70.0        # camera ở y = -CAM_DIST
CAM_Z = 1.9
CAM_LENS = 85.0
CAM_SHIFT_Y = 0.006
TEXT_Z = 2.6           # tâm dòng chữ trên vách
CAP_H = 1.32           # chiều cao chữ
LOGO_H = 1.36          # logo kênh thay cho chữ A (cao hơn chữ một chút cho cân thị giác)
PITCH = 3.75           # khoảng cách tâm giữa các ký tự
CORNER = 3.6           # bán kính bo góc chữ (đơn vị: cao chữ = 100)
DOOR_X = 17.6
LAMP_X, LAMP_Z = 7.1, 5.45
PANEL_W, PANEL_H = 2.6, 1.2
SEAM_W = 0.055         # bề rộng khe nối tấm (m) — sơn chữ không vào được khe
LIGHT = dict(world=0.08, key=9000, fill=5000, windows=22000, lamp=9000, bay=30000, scallop=2200, drone=32000)
HAZE = 0.0             # mật độ sương trong nhà chứa (thấy chùm sáng); 0 = tắt
RES_X, RES_Y = (1024, 576) if PREVIEW else (2048, 1152)
SAFE_W, SAFE_H = 1235 / 2048, 338 / 1152   # vùng an toàn YouTube (tỉ lệ khung)
SAMPLES = 32 if PREVIEW else 128


def srgb(h):
    h = h.lstrip('#')
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(((v / 12.92) if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4) for v in c) + (1.0,)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)


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


# ---------------- vật liệu ----------------
WALL_OFFSET = (0.13, -0.02)   # vị trí gốc lưới tấm trên vách (x, z)


def seam_grid(n, mortar=SEAM_W, smooth=0.35):
    """Lưới khe nối tấm thép (Brick texture), dùng chung cho vách và lớp sơn."""
    brick = n.new('ShaderNodeTexBrick')
    brick.offset = 0.0
    brick.squash = 1.0
    brick.inputs['Scale'].default_value = 1.0
    brick.inputs['Brick Width'].default_value = PANEL_W
    brick.inputs['Row Height'].default_value = PANEL_H
    brick.inputs['Mortar Size'].default_value = mortar
    brick.inputs['Mortar Smooth'].default_value = smooth
    brick.inputs['Bias'].default_value = 0.0
    return brick


def wall_material():
    m, n, l, bsdf = new_mat('HangarWallSteel')
    tc = n.new('ShaderNodeTexCoord')
    brick = seam_grid(n)
    brick.inputs['Color1'].default_value = srgb('#b4bac0')
    brick.inputs['Color2'].default_value = srgb('#abb1b8')
    brick.inputs['Mortar'].default_value = srgb('#7d848c')
    l.new(tc.outputs['Object'], brick.inputs['Vector'])
    # vệt dọc mờ trên tấm thép
    mp = n.new('ShaderNodeMapping')
    mp.inputs['Scale'].default_value = (6.0, 0.25, 1.0)
    l.new(tc.outputs['Object'], mp.inputs['Vector'])
    nz = n.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 2.0
    nz.inputs['Detail'].default_value = 6.0
    l.new(mp.outputs['Vector'], nz.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[0].color = (0.86, 0.87, 0.88, 1)
    ramp.color_ramp.elements[1].position = 0.75
    ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    mul = n.new('ShaderNodeMix')
    mul.data_type = 'RGBA'
    mul.blend_type = 'MULTIPLY'
    mul.inputs['Factor'].default_value = 1.0
    l.new(brick.outputs['Color'], mul.inputs['A'])
    l.new(ramp.outputs['Color'], mul.inputs['B'])
    l.new(mul.outputs['Result'], bsdf.inputs['Base Color'])
    bsdf.inputs['Metallic'].default_value = 0.35
    bsdf.inputs['Roughness'].default_value = 0.55
    bump = n.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = 0.35
    bump.inputs['Distance'].default_value = 0.01
    bump.invert = True
    l.new(brick.outputs['Fac'], bump.inputs['Height'])
    l.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return m


def floor_material():
    m, n, l, bsdf = new_mat('HangarFloorEpoxy')
    tc = n.new('ShaderNodeTexCoord')
    nz = n.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 0.6
    nz.inputs['Detail'].default_value = 8.0
    l.new(tc.outputs['Object'], nz.inputs['Vector'])
    ramp = n.new('ShaderNodeValToRGB')
    ramp.color_ramp.elements[0].color = srgb('#8f9499')
    ramp.color_ramp.elements[1].color = srgb('#aeb2b6')
    l.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    l.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    rr = n.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = 0.1
    rr.inputs['To Max'].default_value = 0.26
    l.new(nz.outputs['Fac'], rr.inputs['Value'])
    l.new(rr.outputs['Result'], bsdf.inputs['Roughness'])
    return m


def paint_material(name, hexcol, rough, spec=0.5):
    m, n, l, bsdf = new_mat(name)
    bsdf.inputs['Base Color'].default_value = srgb(hexcol)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Specular IOR Level'].default_value = spec
    # sơn hơi loang: lệch độ nhám rất nhẹ
    tc = n.new('ShaderNodeTexCoord')
    nz = n.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 3.0
    l.new(tc.outputs['Object'], nz.inputs['Vector'])
    rr = n.new('ShaderNodeMapRange')
    rr.inputs['To Min'].default_value = rough - 0.08
    rr.inputs['To Max'].default_value = rough + 0.08
    l.new(nz.outputs['Fac'], rr.inputs['Value'])
    l.new(rr.outputs['Result'], bsdf.inputs['Roughness'])
    return m


def wall_paint_material(name, hexcol):
    """Sơn quét lên vách: sơn đen mờ, mất màu ở khe nối tấm (lộ vách bên dưới)."""
    m, n, l, bsdf = new_mat(name)
    bsdf.inputs['Base Color'].default_value = srgb(hexcol)
    bsdf.inputs['Roughness'].default_value = 0.9
    bsdf.inputs['Specular IOR Level'].default_value = 0.1
    out = n['Material Output']
    # toạ độ thế giới → toạ độ object của vách (x - ox, z - oz)
    geo = n.new('ShaderNodeNewGeometry')
    sep = n.new('ShaderNodeSeparateXYZ')
    l.new(geo.outputs['Position'], sep.inputs['Vector'])
    ax = n.new('ShaderNodeMath')
    ax.operation = 'SUBTRACT'
    ax.inputs[1].default_value = WALL_OFFSET[0]
    l.new(sep.outputs['X'], ax.inputs[0])
    az = n.new('ShaderNodeMath')
    az.operation = 'SUBTRACT'
    az.inputs[1].default_value = WALL_OFFSET[1]
    l.new(sep.outputs['Z'], az.inputs[0])
    comb = n.new('ShaderNodeCombineXYZ')
    l.new(ax.outputs['Value'], comb.inputs['X'])
    l.new(az.outputs['Value'], comb.inputs['Y'])
    brick = seam_grid(n, smooth=0.0)
    l.new(comb.outputs['Vector'], brick.inputs['Vector'])
    # mép sơn dọc khe hơi lởm chởm cho thật
    nz = n.new('ShaderNodeTexNoise')
    nz.inputs['Scale'].default_value = 60.0
    nz.inputs['Detail'].default_value = 4.0
    l.new(comb.outputs['Vector'], nz.inputs['Vector'])
    mix_n = n.new('ShaderNodeMath')
    mix_n.operation = 'MULTIPLY_ADD'
    mix_n.inputs[1].default_value = 0.35
    l.new(nz.outputs['Fac'], mix_n.inputs[0])
    l.new(brick.outputs['Fac'], mix_n.inputs[2])
    gt = n.new('ShaderNodeMath')
    gt.operation = 'GREATER_THAN'
    gt.inputs[1].default_value = 0.5
    l.new(mix_n.outputs['Value'], gt.inputs[0])
    tr = n.new('ShaderNodeBsdfTransparent')
    mx = n.new('ShaderNodeMixShader')
    l.new(gt.outputs['Value'], mx.inputs['Fac'])
    l.new(bsdf.outputs['BSDF'], mx.inputs[1])
    l.new(tr.outputs['BSDF'], mx.inputs[2])
    l.new(mx.outputs['Shader'], out.inputs['Surface'])
    return m


def simple_material(name, hexcol, rough=0.5, metal=0.0, emit=0.0):
    m, n, l, bsdf = new_mat(name)
    bsdf.inputs['Base Color'].default_value = srgb(hexcol)
    bsdf.inputs['Roughness'].default_value = rough
    bsdf.inputs['Metallic'].default_value = metal
    if emit:
        bsdf.inputs['Emission Color'].default_value = srgb(hexcol)
        bsdf.inputs['Emission Strength'].default_value = emit
    return m


# ---------------- chữ stencil tự vẽ (đơn vị: cao chữ = 100) ----------------
def arc(cx, cy, r, a0, a1, steps):
    return [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / steps)),
             cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / steps))) for i in range(steps + 1)]


def round_poly(pts, radii, seg=7):
    """Bo góc đa giác: radii là số hoặc danh sách bán kính theo từng đỉnh (0 = giữ góc nhọn)."""
    n = len(pts)
    if not isinstance(radii, (list, tuple)):
        radii = [radii] * n
    out = []
    for i in range(n):
        px, py = pts[i]
        ax, ay = pts[i - 1]
        bx, by = pts[(i + 1) % n]
        r = radii[i]
        v0 = (ax - px, ay - py)
        v1 = (bx - px, by - py)
        l0, l1 = math.hypot(*v0), math.hypot(*v1)
        if r <= 0 or l0 < 1e-9 or l1 < 1e-9:
            out.append((px, py))
            continue
        u0 = (v0[0] / l0, v0[1] / l0)
        u1 = (v1[0] / l1, v1[1] / l1)
        ang = math.acos(max(-1.0, min(1.0, u0[0] * u1[0] + u0[1] * u1[1])))
        if ang > math.pi - 0.2 or ang < 1e-3:
            out.append((px, py))
            continue
        t = min(r / math.tan(ang / 2), 0.45 * l0, 0.45 * l1)
        rr = t * math.tan(ang / 2)
        bis = (u0[0] + u1[0], u0[1] + u1[1])
        bl = math.hypot(*bis)
        bis = (bis[0] / bl, bis[1] / bl)
        d = rr / math.sin(ang / 2)
        c = (px + bis[0] * d, py + bis[1] * d)
        a = (px + u0[0] * t, py + u0[1] * t)
        b = (px + u1[0] * t, py + u1[1] * t)
        aa = math.atan2(a[1] - c[1], a[0] - c[0])
        ab = math.atan2(b[1] - c[1], b[0] - c[0])
        dd = (ab - aa + math.pi) % (2 * math.pi) - math.pi
        for k in range(seg + 1):
            th = aa + dd * k / seg
            out.append((c[0] + rr * math.cos(th), c[1] + rr * math.sin(th)))
    return out


T = 20.0   # nét
OV = T / 2  # phần chồng lên nhau giữa các nét (chữ liền khối, góc bo bị che trong chỗ chồng)


def glyph(ch):
    """Trả (độ rộng, [đa giác...]). Chữ liền khối — chỗ đứt chỉ do khe nối tấm vách (xem paint_mask)."""
    if ch == 'I':
        return T, [[(0, 0), (T, 0), (T, 100), (0, 100)]]
    if ch == 'R':
        stem = [(0, 0), (T, 0), (T, 100), (0, 100)]
        x0 = T - OV
        cx, r_o = 66.0, 29.5
        cy = 100 - r_o
        r_i = r_o - T
        bottom = cy - r_o
        bowl = [(x0, bottom), (cx, bottom)]
        bowl += arc(cx, cy, r_o, -90, 90, 32)[1:]
        bowl += [(x0, 100), (x0, 100 - T), (cx, 100 - T)]
        bowl += arc(cx, cy, r_i, 90, -90, 32)[1:]
        bowl += [(x0, bottom + T)]
        lw = T * 1.25
        leg_top = bottom + OV
        leg = [(102.0 - lw, 0), (102.0, 0), (48.0 + lw, leg_top), (48.0, leg_top)]
        return 102.0, [stem, bowl, leg]
    if ch == 'F':
        return 88.0, [[(0, 0), (T, 0), (T, 42), (76, 42), (76, 42 + T), (T, 42 + T),
                       (T, 100 - T), (88, 100 - T), (88, 100), (0, 100)]]
    if ch == 'C':
        cx, cy, ro = 50.0, 50.0, 50.0
        ri = ro - T
        a_open = 40.0
        return 100.0, [arc(cx, cy, ro, a_open, 360 - a_open, 72) + arc(cx, cy, ri, 360 - a_open, a_open, 72)]
    if ch == 'T':
        w = 96.0
        h = w / 2 - T / 2
        return w, [[(h, 0), (h + T, 0), (h + T, 100 - T), (w, 100 - T), (w, 100), (0, 100), (0, 100 - T), (h, 100 - T)]]
    raise ValueError(ch)


def glyph_object(ch, cx, zc, height, y, mat, name):
    w, polys = glyph(ch)
    s = height / 100.0
    verts, faces = [], []
    for poly in polys:
        start = len(verts)
        for (gx, gy) in round_poly(poly, CORNER):
            verts.append(((gx - w / 2) * s, 0.0, (gy - 50) * s))
        faces.append(list(range(start, len(verts))))
    ob = mesh_obj(name, verts, faces, mat)
    # sửa pháp tuyến cho cùng hướng về camera (-Y)
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    for f in bm.faces:
        f.normal_update()
        if f.normal.y > 0:
            f.normal_flip()
    bm.to_mesh(ob.data)
    bm.free()
    ob.location = (cx, y, zc)
    return ob


def import_logo(mat, height, cx, zc, y):
    before = set(bpy.data.objects)
    bpy.ops.import_curve.svg(filepath=LOGO_SVG)
    new = [o for o in bpy.data.objects if o not in before and o.type == 'CURVE']
    bpy.ops.object.select_all(action='DESELECT')
    for o in new:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new[0]
    bpy.ops.object.convert(target='MESH')
    if len(new) > 1:
        bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = 'AirfactLogo'
    # SVG nằm trên mặt XY → dựng đứng lên mặt XZ
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    me = ob.data
    xs = [v.co.x for v in me.vertices]
    ys = [v.co.y for v in me.vertices]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    mx, my = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
    s = height / h
    for v in me.vertices:
        x, yy = v.co.x, v.co.y
        v.co = Vector(((x - mx) * s, 0.0, (yy - my) * s))
    bm = bmesh.new()
    bm.from_mesh(me)
    for f in bm.faces:
        f.normal_update()
        if f.normal.y > 0:
            f.normal_flip()
    bm.to_mesh(me)
    bm.free()
    me.materials.clear()
    me.materials.append(mat)
    ob.location = (cx, y, zc)
    for c in list(ob.users_collection):
        c.objects.unlink(ob)
    bpy.context.scene.collection.objects.link(ob)
    return ob, w * s


# ---------------- máy bay ----------------
def append_plane():
    with bpy.data.libraries.load(PLANE_BLEND, link=False) as (src, dst):
        dst.objects = src.objects
    col = bpy.data.collections.new('MQ1_Predator')
    bpy.context.scene.collection.children.link(col)
    for o in dst.objects:
        if o is not None:
            col.objects.link(o)
    root = bpy.data.objects['General Atomics MQ-1 Predator']
    return root, col


def darken_plane(col):
    """Sơn xám chì như ảnh mẫu (bản gốc xám sáng sẽ chìm vào vách)."""
    done = set()
    for o in col.objects:
        for slot in getattr(o, 'material_slots', []):
            m = slot.material
            if not m or m in done or 'plastic' not in m.name.lower():
                continue
            done.add(m)
            nt = m.node_tree
            for nd in nt.nodes:
                if nd.type == 'BSDF_PRINCIPLED':
                    sock = nd.inputs['Base Color']
                    mul = nt.nodes.new('ShaderNodeMix')
                    mul.data_type = 'RGBA'
                    mul.blend_type = 'MULTIPLY'
                    mul.inputs['Factor'].default_value = 1.0
                    mul.inputs['B'].default_value = srgb('#8d939a')
                    if sock.is_linked:
                        nt.links.new(sock.links[0].from_socket, mul.inputs['A'])
                    else:
                        mul.inputs['A'].default_value = sock.default_value
                    nt.links.new(mul.outputs['Result'], sock)


def rrect(name, x0, x1, z0, z1, y, mat, radii):
    """Tấm chữ nhật đứng (mặt XZ) bo góc; radii theo thứ tự đáy-trái, đáy-phải, đỉnh-phải, đỉnh-trái."""
    pts = round_poly([(x0, z0), (x1, z0), (x1, z1), (x0, z1)], list(radii) if isinstance(radii, tuple) else radii)
    return mesh_obj(name, [(x, y, z) for (x, z) in pts], [list(range(len(pts)))], mat)


# ---------------- dựng cảnh ----------------
def build():
    reset()
    sc = bpy.context.scene
    sc.unit_settings.system = 'METRIC'

    # sàn + vách
    fl = mesh_obj('Floor', [(-120, -120, 0), (120, -120, 0), (120, WALL_Y + 0.01, 0), (-120, WALL_Y + 0.01, 0)], [[0, 1, 2, 3]], floor_material())
    wall_mat = wall_material()
    # vách dựng trên mặt XY rồi xoay 90° quanh X để brick texture chạy theo (ngang, cao)
    wall = mesh_obj('BackWall', [(-90, 0, 0), (90, 0, 0), (90, 40, 0), (-90, 40, 0)], [[0, 1, 2, 3]], wall_mat)
    wall.rotation_euler = (math.radians(90), 0, 0)
    wall.location = (WALL_OFFSET[0], WALL_Y, WALL_OFFSET[1])
    # chân tường (gờ bê tông sẫm)
    plinth = simple_material('Plinth', '#8e9399', 0.7)
    mesh_obj('Plinth', [(-90, WALL_Y - 0.02, 0), (90, WALL_Y - 0.02, 0), (90, WALL_Y - 0.02, 0.32), (-90, WALL_Y - 0.02, 0.32)], [[0, 1, 2, 3]], plinth)

    # cửa thoát hiểm hai bên
    door_mat = simple_material('DoorSteel', '#9da3a9', 0.45, 0.4)
    win_mat = simple_material('DoorGlass', '#1d2126', 0.15)
    frame_mat = simple_material('DoorFrame', '#6f767d', 0.5, 0.4)
    for sx in (-1, 1):
        dx = sx * DOOR_X
        yb = WALL_Y - 0.03
        # khung + cánh bo góc trên (chân chạm sàn giữ vuông), ô kính bo cả 4 góc
        rrect(f'DoorFrame{sx}', dx - 1.18, dx + 1.18, 0, 2.38, yb, frame_mat, (0, 0, 0.16, 0.16))
        for k, off in enumerate((-0.53, 0.53)):
            x0 = dx + off
            rrect(f'Door{sx}{k}', x0 - 0.5, x0 + 0.5, 0, 2.28, yb - 0.02, door_mat, (0, 0, 0.09, 0.09))
            rrect(f'DoorWin{sx}{k}', x0 - 0.22, x0 + 0.22, 1.45, 2.0, yb - 0.03, win_mat, 0.06)

    # chữ + logo (sơn đen)
    ink = wall_paint_material('WallBlackPaint', '#050505')
    y_paint = WALL_Y - 0.004
    items = list('AIRFACT')   # hai chữ A chính là logo kênh
    n = len(items)
    for i, ch in enumerate(items):
        cx = (i - (n - 1) / 2) * PITCH
        if ch == 'A':
            lg, _ = import_logo(ink, LOGO_H, cx, TEXT_Z + (LOGO_H - CAP_H) / 2, y_paint)
            lg.name = f'Letter_{i}_A_logo'
        else:
            glyph_object(ch, cx, TEXT_Z, CAP_H, y_paint, ink, f'Letter_{i}_{ch}')
    # ô vuông sẫm giữa các chữ như mẫu (đèn/ổ điện âm tường)
    plate = simple_material('WallPlate', '#4a4f55', 0.5, 0.3)
    for i in range(n + 1):
        if i in (0, n):
            continue
        cx = (i - n / 2) * PITCH
        if abs(cx) < 0.1:
            continue
        s = CAP_H * 0.24
        z0 = TEXT_Z - s / 2
        mesh_obj(f'Plate{i}', [(cx - s / 2, y_paint - 0.01, z0), (cx + s / 2, y_paint - 0.01, z0), (cx + s / 2, y_paint - 0.01, z0 + s), (cx - s / 2, y_paint - 0.01, z0 + s)], [[0, 1, 2, 3]], plate)

    # vạch sơn sàn
    line_mat = paint_material('FloorLinePaint', '#eef0f2', 0.45)
    def strip(name, x0, x1, y0, y1):
        mesh_obj(name, [(x0, y0, 0.003), (x1, y0, 0.003), (x1, y1, 0.003), (x0, y1, 0.003)], [[0, 1, 2, 3]], line_mat)
    lw = 0.22
    strip('LineWall', -60, 60, WALL_Y - 2.6, WALL_Y - 2.6 + lw)
    # khung đỗ (nét đứt) trước máy bay
    yfront = -7.5
    for sx in (-1, 1):
        x = 11.5
        for k in range(10):
            xa = sx * (x - k * 2.4)
            xb = sx * (x - k * 2.4 - 1.6)
            if abs(xb) < 1.2:
                break
            strip(f'Dash{sx}{k}', min(xa, xb), max(xa, xb), yfront, yfront + lw)
        strip(f'Side{sx}', sx * 11.5 - lw / 2, sx * 11.5 + lw / 2, yfront, WALL_Y - 2.6)
    strip('Center', -lw / 2, lw / 2, yfront - 90, yfront)
    # vạch dừng ngang phía trước + vạch vàng an toàn hai bên đường lăn
    strip('StopBar', -3.0, 3.0, yfront - 9.0, yfront - 8.6)
    yel = paint_material('FloorYellowPaint', '#d9a521', 0.5)
    for sx in (-1, 1):
        x = sx * 11.5
        mesh_obj(f'Yellow{sx}', [(x - 0.09, yfront - 90, 0.003), (x + 0.09, yfront - 90, 0.003), (x + 0.09, yfront - 0.3, 0.003), (x - 0.09, yfront - 0.3, 0.003)], [[0, 1, 2, 3]], yel)
    # điểm neo buộc máy bay (vòng thép âm sàn)
    tie = simple_material('TieDown', '#6c7278', 0.35, 0.8)
    for ty in (-14.0, -26.0, -38.0):
        for tx in (-7.0, 7.0):
            bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.18, depth=0.02, location=(tx, ty, 0.006))
            bpy.context.active_object.data.materials.append(tie)

    # phần trên vách (chỉ hiện ở TV): dầm thép ngang + dải cửa sổ trời mờ
    girder = simple_material('Girder', '#5d636a', 0.45, 0.6)
    glow = simple_material('FrostedGlass', '#f3f6fa', 0.3, 0.0, emit=4.0)
    mull = simple_material('Mullion', '#4b5157', 0.5, 0.5)
    yw = WALL_Y - 0.05
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0, WALL_Y - 0.3, 9.85))
    g = bpy.context.active_object
    g.name = 'WallGirder'
    g.scale = (180, 0.6, 0.55)
    g.data.materials.append(girder)
    mesh_obj('ClerestoryGlass', [(-90, yw, 10.5), (90, yw, 10.5), (90, yw, 12.6), (-90, yw, 12.6)], [[0, 1, 2, 3]], glow)
    for k in range(-40, 41):
        x = k * PANEL_W + WALL_OFFSET[0]
        mesh_obj(f'Mullion{k}', [(x - 0.09, yw - 0.02, 10.5), (x + 0.09, yw - 0.02, 10.5), (x + 0.09, yw - 0.02, 12.6), (x - 0.09, yw - 0.02, 12.6)], [[0, 1, 2, 3]], mull)
    for zz in (10.4, 11.5, 12.6):
        mesh_obj(f'Transom{zz}', [(-90, yw - 0.03, zz - 0.07), (90, yw - 0.03, zz - 0.07), (90, yw - 0.03, zz + 0.07), (-90, yw - 0.03, zz + 0.07)], [[0, 1, 2, 3]], mull)

    # máy bay
    root, col = append_plane()
    root.location = (0, 0, 0)
    darken_plane(col)

    # đèn trần treo (hai đèn như mẫu, chỉ thấy phần dưới)
    shade = simple_material('LampShade', '#3a3f45', 0.45, 0.6)
    bulb = simple_material('LampBulb', '#fff4e0', 0.3, 0.0, emit=60.0)
    for sx in (-1, 1):
        bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=0.55, radius2=0.14, depth=0.38, location=(sx * LAMP_X, WALL_Y - 7, LAMP_Z))
        c = bpy.context.active_object
        c.name = f'Lamp{sx}'
        c.data.materials.append(shade)
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=0.03, depth=30, location=(sx * LAMP_X, WALL_Y - 7, LAMP_Z + 15.1))
        bpy.context.active_object.data.materials.append(shade)
        bpy.ops.mesh.primitive_uv_sphere_add(radius=0.22, location=(sx * LAMP_X, WALL_Y - 7, LAMP_Z - 0.2))
        b = bpy.context.active_object
        b.scale = (1, 1, 0.45)
        b.data.materials.append(bulb)

    # ánh sáng dịu
    world = bpy.data.worlds.new('HangarWorld')
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = srgb('#d4d9de')
    bg.inputs['Strength'].default_value = LIGHT['world']

    def area(name, loc, rot, size, size_y, power, color='#ffffff'):
        ld = bpy.data.lights.new(name, 'AREA')
        ld.shape = 'RECTANGLE'
        ld.size = size
        ld.size_y = size_y
        ld.energy = power
        ld.color = srgb(color)[:3]
        lo = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(lo)
        lo.location = loc
        lo.rotation_euler = [math.radians(a) for a in rot]
        lo.visible_camera = False
        lo.visible_glossy = False
        return lo

    def spot(name, loc, rot, power, angle, blend, color, radius=0.15):
        ld = bpy.data.lights.new(name, 'SPOT')
        ld.energy = power
        ld.spot_size = math.radians(angle)
        ld.spot_blend = blend
        ld.shadow_soft_size = radius
        ld.color = srgb(color)[:3]
        lo = bpy.data.objects.new(name, ld)
        sc.collection.objects.link(lo)
        lo.location = loc
        lo.rotation_euler = [math.radians(a) for a in rot]
        return lo

    # nền tối hơn để vùng sáng / tối hiện rõ
    area('KeyTop', (0, 6, 22), (0, 0, 0), 60, 40, LIGHT['key'], '#f4f7ff')
    area('FillFront', (0, -40, 9), (78, 0, 0), 60, 10, LIGHT['fill'], '#eef3ff')
    # ánh sáng trời lọt qua dải cửa sổ trên cao, chiếu chéo xuống sàn
    area('SkyThroughWindows', (0, WALL_Y - 0.6, 11.5), (-62, 0, 0), 120, 2.1, LIGHT['windows'], '#e9f1ff')
    # đèn treo nhìn thấy được: chiếu thẳng xuống, tạo vũng sáng trên sàn quanh drone
    for sx in (-1, 1):
        spot(f'LampSpot{sx}', (sx * LAMP_X, WALL_Y - 7, LAMP_Z - 0.3), (0, 0, 0), LIGHT['lamp'], 95, 0.55, '#ffe9c9', 0.25)
    # các hàng đèn treo phía trên khung hình (gần camera hơn) cho vũng sáng ở tiền cảnh
    for yy in (8.0, -12.0, -32.0):
        for xx in (-LAMP_X * 2, 0.0, LAMP_X * 2) if yy != 8.0 else (-LAMP_X, LAMP_X):
            spot(f'BaySpot{yy}_{xx}', (xx, yy, 15.0), (0, 0, 0), LIGHT['bay'], 70, 0.7, '#fff1dc', 0.3)
    # đèn rọi phía trước vào drone (tránh drone thành bóng đen ngược sáng)
    spot('DroneKey', (0, -25, 12), (66, 0, 0), LIGHT['drone'], 28, 0.8, '#f6f8ff', 1.2)
    # đèn hắt vách (vệt sáng hình vòm trên tấm thép)
    for k in range(-6, 7):
        spot(f'WallScallop{k}', (k * 6.5, WALL_Y - 0.9, 9.3), (14, 0, 0), LIGHT['scallop'], 62, 0.35, '#fff3e2', 0.08)

    # sương mỏng trong nhà chứa để thấy chùm sáng
    if HAZE > 0:
        y0, y1 = 2.0, WALL_Y - 0.1      # chỉ phủ phần sau drone → tiền cảnh trong, chữ vẫn rõ
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, (y0 + y1) / 2, 8))
        hz = bpy.context.active_object
        hz.name = 'Haze'
        hz.scale = (120, y1 - y0, 16)
        hm, hn, hl, hb = new_mat('HazeVolume')
        hn.remove(hb)
        vol = hn.new('ShaderNodeVolumePrincipled')
        vol.inputs['Density'].default_value = HAZE
        vol.inputs['Anisotropy'].default_value = 0.35
        vol.inputs['Color'].default_value = (1, 1, 1, 1)
        hl.new(vol.outputs['Volume'], hn['Material Output'].inputs['Volume'])
        hz.data.materials.append(hm)

    # camera
    cd = bpy.data.cameras.new('Cam')
    cd.lens = CAM_LENS
    cd.sensor_width = 36
    cd.sensor_fit = 'HORIZONTAL'
    cd.shift_y = CAM_SHIFT_Y
    cam = bpy.data.objects.new('Cam', cd)
    sc.collection.objects.link(cam)
    cam.location = (0, -CAM_DIST, CAM_Z)
    cam.rotation_euler = (math.radians(90), 0, 0)
    sc.camera = cam

    # render
    sc.render.engine = 'CYCLES'
    try:
        prefs = bpy.context.preferences.addons['cycles'].preferences
        prefs.compute_device_type = 'METAL'
        prefs.get_devices()
        for d in prefs.devices:
            d.use = True
        sc.cycles.device = 'GPU'
    except Exception as e:  # noqa
        print('GPU off:', e)
    sc.cycles.samples = SAMPLES
    sc.cycles.use_denoising = True
    sc.render.resolution_x = RES_X
    sc.render.resolution_y = RES_Y
    sc.render.resolution_percentage = 100
    sc.view_settings.view_transform = 'AgX'
    sc.view_settings.look = 'AgX - Medium High Contrast'
    sc.render.image_settings.file_format = 'PNG'
    sc.render.image_settings.color_mode = 'RGB'


build()


def report_safe_area():
    """In khung bao (tỉ lệ khung) của chữ + drone và so với vùng an toàn YouTube."""
    from bpy_extras.object_utils import world_to_camera_view
    sc = bpy.context.scene
    dg = bpy.context.evaluated_depsgraph_get()
    xs, ys = [], []
    for o in sc.objects:
        if o.type != 'MESH' or not (o.name.startswith('Letter_') or o.name.startswith('Plate') or o.users_collection[0].name == 'MQ1_Predator'):
            continue
        for c in o.bound_box:
            v = world_to_camera_view(sc, sc.camera, o.matrix_world @ Vector(c))
            xs.append(v.x)
            ys.append(1 - v.y)
    sx0, sx1 = 0.5 - SAFE_W / 2, 0.5 + SAFE_W / 2
    sy0, sy1 = 0.5 - SAFE_H / 2, 0.5 + SAFE_H / 2
    print(f'SAFE content x {min(xs):.3f}-{max(xs):.3f} y {min(ys):.3f}-{max(ys):.3f} | safe x {sx0:.3f}-{sx1:.3f} y {sy0:.3f}-{sy1:.3f}',
          'OK' if min(xs) >= sx0 and max(xs) <= sx1 and min(ys) >= sy0 and max(ys) <= sy1 else 'NGOAI VUNG AN TOAN')


report_safe_area()
name = 'airfact_banner_preview' if PREVIEW else 'airfact_banner'
if not PREVIEW:
    bpy.ops.file.pack_all()
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(HERE, 'airfact_banner.blend'), compress=True)
if not NO_RENDER:
    out = os.path.join(HERE if not PREVIEW else os.environ.get('PREVIEW_DIR', HERE), name + '.png')
    bpy.context.scene.render.filepath = out
    bpy.ops.render.render(write_still=True)
    print('RENDERED', out)
