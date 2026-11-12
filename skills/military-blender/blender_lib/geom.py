"""Công cụ dựng hình cơ khí & linh kiện giải phẫu 3D trong Blender (`bpy` / `bmesh`):
- `add_loft()`: Nối mượt đa trạm mặt cắt dọc trục (thân tàu, khung sườn máy bay, lõi động cơ, vỏ tên lửa).
- `add_revolve()`: Tiện tròn quanh trục X (nòng pháo, đạn, trục tuốc-bin, buồng đốt; hỗ trợ `arc_deg < 360` để mở góc cắt giải phẫu).
- `add_airfoil_wing()`: Cánh khí động chuẩn biên dạng NACA 4 chữ số (cánh chính, cánh đuôi, vây tên lửa, xà dọc cánh).
- `add_pipe()`: Ống dẫn / thanh giằng cơ khí uốn theo danh sách điểm 3D.
- `add_wheel()`: Bánh xe quân sự (lốp, vành, trục, bu-lông) hỗ trợ keyframe góc lăn.
- `add_tank_track()`: Dải xích xe tăng / thiết giáp nối tiếp tuyến qua bánh dẫn trước và sau.
- `add_rivets()`: Hàng đinh tán / bu-lông gộp chung 1 mesh nhẹ.
"""
from __future__ import annotations
import math
import bpy
import bmesh
from .materials import machined_metal, armor_plate


def _naca_profile(n_pts: int = 28, thickness: float = 0.12, camber: float = 0.02, camber_pos: float = 0.4) -> list[tuple[float, float]]:
    """Sinh biên dạng cánh khí động NACA chuẩn (trả về danh sách (x_norm - 0.5, z_norm))."""
    upper: list[tuple[float, float]] = []
    lower: list[tuple[float, float]] = []
    p = max(0.1, min(0.9, camber_pos))
    m = camber
    t = thickness
    for i in range(n_pts + 1):
        beta = (i / n_pts) * math.pi
        x = 0.5 * (1.0 - math.cos(beta))
        yt = 5.0 * t * (0.2969 * math.sqrt(max(0.0, x)) - 0.1260 * x - 0.3516 * x**2 + 0.2843 * x**3 - 0.1015 * x**4)
        if x < p:
            yc = (m / (p**2)) * (2.0 * p * x - x**2)
            dyc = (2.0 * m / (p**2)) * (p - x)
        else:
            yc = (m / ((1.0 - p) ** 2)) * ((1.0 - 2.0 * p) + 2.0 * p * x - x**2)
            dyc = (2.0 * m / ((1.0 - p) ** 2)) * (p - x)
        theta = math.atan(dyc)
        xu = x - yt * math.sin(theta) - 0.35
        zu = yc + yt * math.cos(theta)
        xl = x + yt * math.sin(theta) - 0.35
        zl = yc - yt * math.cos(theta)
        upper.append((xu, zu))
        lower.append((xl, zl))
    return upper + list(reversed(lower[1:-1]))


def add_loft(
    name: str,
    stations: list[tuple[float, list[tuple[float, float]]]],
    cap_ends: bool = True,
    material: bpy.types.Material | None = None,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Nối các mặt cắt `[ (x_pos, [(y, z), ...]), ... ]` dọc trục X thành khối Mesh mượt."""
    mesh = bpy.data.meshes.new(f'{name}_Mesh')
    bm = bmesh.new()

    rings = []
    for x_pos, prof in stations:
        ring = [bm.verts.new((float(x_pos), float(y), float(z))) for (y, z) in prof]
        rings.append(ring)

    for r0, r1 in zip(rings[:-1], rings[1:]):
        n = min(len(r0), len(r1))
        for i in range(n):
            j = (i + 1) % n
            try:
                bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
            except ValueError:
                pass

    if cap_ends and rings:
        try:
            bm.faces.new(list(reversed(rings[0])))
            bm.faces.new(rings[-1])
        except ValueError:
            pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.data.materials.append(material or machined_metal(f'{name}_Mat'))
    return obj


def add_revolve(
    name: str,
    profile: list[tuple[float, float]],
    segments: int = 36,
    arc_deg: float = 360.0,
    material: bpy.types.Material | None = None,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Tiện tròn biên dạng `profile = [(x_pos, radius), ...]` quanh trục X. Hỗ trợ `arc_deg < 360` để mở mặt cắt."""
    mesh = bpy.data.meshes.new(f'{name}_Mesh')
    bm = bmesh.new()

    full_circle = abs(arc_deg - 360.0) < 1e-3
    arc_rad = math.radians(arc_deg)
    steps = segments if full_circle else (segments + 1)

    rings = []
    for x_pos, r in profile:
        rad = max(0.0005, float(r))
        ring = []
        for s in range(steps):
            frac = s / float(segments)
            ang = frac * arc_rad
            ring.append(bm.verts.new((float(x_pos), rad * math.cos(ang), rad * math.sin(ang))))
        rings.append(ring)

    for r0, r1 in zip(rings[:-1], rings[1:]):
        limit = segments if full_circle else (steps - 1)
        for i in range(limit):
            j = (i + 1) % len(r0)
            try:
                bm.faces.new((r0[i], r0[j], r1[j], r1[i]))
            except ValueError:
                pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.data.materials.append(material or machined_metal(f'{name}_Mat'))
    return obj


def add_airfoil_wing(
    name: str,
    root_chord: float,
    tip_chord: float,
    span: float,
    sweep: float = 0.0,
    dihedral: float = 0.0,
    thickness: float = 0.12,
    camber: float = 0.02,
    mirror_y: bool = False,
    material: bpy.types.Material | None = None,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Dựng cánh khí động chuẩn NACA kéo dài từ gốc cánh (Y=0) ra đầu mút cánh (Y=span hoặc -span)."""
    base_prof = _naca_profile(24, thickness=thickness, camber=camber)
    sign_y = -1.0 if mirror_y else 1.0

    root_ring = [(x * root_chord, 0.0, z * root_chord) for (x, z) in base_prof]
    tip_ring = [(x * tip_chord - sweep, sign_y * span, z * tip_chord + dihedral) for (x, z) in base_prof]

    mesh = bpy.data.meshes.new(f'{name}_Mesh')
    bm = bmesh.new()
    v_root = [bm.verts.new(p) for p in root_ring]
    v_tip = [bm.verts.new(p) for p in tip_ring]
    n = len(v_root)
    for i in range(n):
        j = (i + 1) % n
        try:
            bm.faces.new((v_root[i], v_root[j], v_tip[j], v_tip[i]))
        except ValueError:
            pass
    try:
        bm.faces.new(list(reversed(v_root)))
        bm.faces.new(v_tip)
    except ValueError:
        pass

    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()

    for poly in mesh.polygons:
        poly.use_smooth = True

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.data.materials.append(material or machined_metal(f'{name}_Mat'))
    return obj


def add_pipe(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float = 0.04,
    material: bpy.types.Material | None = None,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Tạo ống dẫn / thanh giằng cơ khí 3D chạy qua danh sách toạ độ `points`."""
    crv = bpy.data.curves.new(f'{name}_Curve', type='CURVE')
    crv.dimensions = '3D'
    crv.bevel_depth = float(radius)
    crv.bevel_resolution = 6

    sp = crv.splines.new('POLY')
    sp.points.add(len(points) - 1)
    for idx, (x, y, z) in enumerate(points):
        sp.points[idx].co = (float(x), float(y), float(z), 1.0)

    obj = bpy.data.objects.new(name, crv)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.data.materials.append(material or machined_metal(f'{name}_Mat'))
    return obj


def add_wheel(
    name: str,
    radius: float,
    width: float,
    location: tuple[float, float, float] = (0.0, 0.0, 0.0),
    spin_keyframes: list[tuple[int, float]] | None = None,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Tạo bánh xe quân sự (lốp + vành kim loại) đặt tại `location`, trục quay quanh Y."""
    root = bpy.data.objects.new(name, None)
    root.location = location
    bpy.context.scene.collection.objects.link(root)
    if parent:
        root.parent = parent

    bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=radius, depth=width, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
    tire = bpy.context.active_object
    tire.name = f'{name}_Tire'
    tire.parent = root
    tire.data.materials.append(armor_plate(f'{name}_TireMat', color='#1f2124', roughness=0.88, metallic=0.05))

    bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius * 0.62, depth=width * 1.04, location=(0, 0, 0), rotation=(math.pi / 2, 0, 0))
    rim = bpy.context.active_object
    rim.name = f'{name}_Rim'
    rim.parent = root
    rim.data.materials.append(armor_plate(f'{name}_RimMat', color='#4c5442', roughness=0.52, metallic=0.45))

    if spin_keyframes:
        for fr, ang_rad in spin_keyframes:
            root.rotation_euler[1] = float(ang_rad)
            root.keyframe_insert(data_path='rotation_euler', index=1, frame=int(fr))

    return root


def add_tank_track(
    name: str,
    x_front: float,
    x_rear: float,
    r_front: float,
    r_rear: float,
    width: float,
    y_pos: float = 0.0,
    z_bottom: float = 0.0,
    link_thickness: float = 0.07,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Tạo dải xích xe tăng nối bao quanh bánh dẫn trước `(x_front, r_front)` và bánh sau `(x_rear, r_rear)`."""
    crv = bpy.data.curves.new(f'{name}_TrackCurve', type='CURVE')
    crv.dimensions = '3D'
    crv.extrude = width * 0.5
    crv.bevel_depth = link_thickness * 0.5
    crv.bevel_resolution = 2

    pts: list[tuple[float, float, float]] = []
    # Nhánh dưới chạm đất
    pts.append((x_rear, y_pos, z_bottom))
    pts.append((x_front, y_pos, z_bottom))
    # Vòng bánh trước
    zc_f = z_bottom + r_front
    for i in range(1, 9):
        ang = -math.pi / 2 + (i / 8.0) * math.pi
        pts.append((x_front + math.cos(ang) * r_front, y_pos, zc_f + math.sin(ang) * r_front))
    # Vòng bánh sau
    zc_r = z_bottom + r_rear
    for i in range(0, 9):
        ang = math.pi / 2 + (i / 8.0) * math.pi
        pts.append((x_rear + math.cos(ang) * r_rear, y_pos, zc_r + math.sin(ang) * r_rear))

    sp = crv.splines.new('POLY')
    sp.use_cyclic_u = True
    sp.points.add(len(pts) - 1)
    for idx, (x, y, z) in enumerate(pts):
        sp.points[idx].co = (float(x), float(y), float(z), 1.0)

    obj = bpy.data.objects.new(name, crv)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.data.materials.append(armor_plate(f'{name}_Mat', color='#2e302c', roughness=0.82, metallic=0.5))
    return obj


def add_rivets(
    name: str,
    points: list[tuple[float, float, float]],
    radius: float = 0.015,
    material: bpy.types.Material | None = None,
    parent: bpy.types.Object | None = None,
) -> bpy.types.Object:
    """Tạo hàng đinh tán / bu-lông gộp chung trong 1 Mesh duy nhất (siêu nhẹ viewport)."""
    mesh = bpy.data.meshes.new(f'{name}_Mesh')
    bm = bmesh.new()
    for pt in points:
        bmesh.ops.create_icosphere(
            bm,
            subdivisions=1,
            radius=float(radius),
            matrix=bmesh.types.BMesh if False else __import__('mathutils').Matrix.Translation(pt),
        )
    bm.to_mesh(mesh)
    bm.free()

    obj = bpy.data.objects.new(name, mesh)
    bpy.context.scene.collection.objects.link(obj)
    if parent:
        obj.parent = parent
    obj.data.materials.append(material or machined_metal(f'{name}_Mat'))
    return obj
