"""Điều khiển Camera điện ảnh trong Blender 5.2 (camera.py):
- Nội suy quỹ đạo Camera (pos) và Điểm nhìn (look target) bằng Bezier mượt tự động.
- Hỗ trợ gắn Camera theo dõi chủ thể đang di chuyển (`parent` hoặc `Track To`).
- Hàm `project_point_2d(pos_3d, frame)` chiếu toạ độ 3D ra pixel màn hình `[x_px, y_px]` (1920x1080)
  để đặt tâm ngắm `<Callout at={[x_px, y_px]} ... />` chính xác tuyệt đối lên bộ phận trên clip.
"""
from __future__ import annotations
import math
import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Vector


def setup_camera(
    keyframes: list[dict],
    fov_deg: float = 40.0,
    parent: bpy.types.Object | None = None,
    dof_distance: float | None = None,
    dof_fstop: float = 5.6,
) -> tuple[bpy.types.Object, bpy.types.Object]:
    """Tạo Camera và Empty LookTarget với danh sách keyframes:
    `keyframes = [{'frame': 1, 'pos': (22, -20, 7), 'look': (0, 0, 2.8), 'fov': 40}, ...]`
    """
    scn = bpy.context.scene

    target = bpy.data.objects.new('CamLookTarget', None)
    target.empty_display_type = 'SPHERE'
    target.empty_display_size = 0.35
    scn.collection.objects.link(target)

    cam_data = bpy.data.cameras.new('MainCamera')
    cam_data.lens_unit = 'FOV'
    cam_data.angle = math.radians(fov_deg)
    cam_data.clip_start = 0.15
    cam_data.clip_end = 2500.0

    if dof_distance is not None:
        cam_data.dof.use_dof = True
        cam_data.dof.focus_distance = float(dof_distance)
        cam_data.dof.aperture_fstop = float(dof_fstop)

    cam_obj = bpy.data.objects.new('MainCamera', cam_data)
    scn.collection.objects.link(cam_obj)
    scn.camera = cam_obj

    if parent is not None:
        cam_obj.parent = parent
        target.parent = parent

    track = cam_obj.constraints.new(type='TRACK_TO')
    track.target = target
    track.track_axis = 'TRACK_NEGATIVE_Z'
    track.up_axis = 'UP_Y'

    for kf in keyframes:
        f = int(kf['frame'])
        if 'pos' in kf:
            cam_obj.location = tuple(kf['pos'])
            cam_obj.keyframe_insert(data_path='location', frame=f)
        if 'look' in kf:
            target.location = tuple(kf['look'])
            target.keyframe_insert(data_path='location', frame=f)
        if 'fov' in kf:
            cam_data.angle = math.radians(float(kf['fov']))
            cam_data.keyframe_insert(data_path='lens', frame=f)

    return cam_obj, target


def project_point_2d(
    pos_3d: tuple[float, float, float],
    frame: int | None = None,
    width: int = 1920,
    height: int = 1080,
) -> tuple[int, int]:
    """Chiếu toạ độ thế giới 3D `(x, y, z)` tại `frame` sang toạ độ màn hình 2D `[x_px, y_px]` (gốc trên-trái)
    để truyền vào `<Callout at={[x_px, y_px]} to={[...]} />` trong `src/scenes/C01Sxx.tsx`.
    """
    scn = bpy.context.scene
    if frame is not None:
        scn.frame_set(int(frame))
    bpy.context.view_layer.update()
    cam = scn.camera
    if cam is None:
        return width // 2, height // 2
    co_2d = world_to_camera_view(scn, cam, Vector(pos_3d))
    x_px = int(round(co_2d.x * width))
    y_px = int(round((1.0 - co_2d.y) * height))
    return x_px, y_px


def export_callout_anchors(
    anchors: dict[str, tuple[tuple[float, float, float] | bpy.types.Object, int]],
    out_json_path: str | None = None,
    width: int = 1920,
    height: int = 1080,
) -> dict[str, dict]:
    """Chiếu danh sách điểm neo 3D `{ 'ten_bo_phan': (pos_3d_hoac_obj, frame), ... }` sang toạ độ pixel 2D `[x_px, y_px]`
    và lưu vào file JSON (mặc định `out/blend/<SceneID>.callouts.json` nếu có).
    Giúp file `src/scenes/C01Sxx.tsx` đặt `<Callout at={[x_px, y_px]} ... />` khớp 100% đến từng pixel.
    """
    import json
    from pathlib import Path

    scn = bpy.context.scene
    cur_frame = scn.frame_current
    result: dict[str, dict] = {}

    for key, (target, fr) in anchors.items():
        scn.frame_set(int(fr))
        bpy.context.view_layer.update()
        if isinstance(target, bpy.types.Object):
            pos = tuple(target.matrix_world.translation)
        else:
            pos = (float(target[0]), float(target[1]), float(target[2]))
        x_px, y_px = project_point_2d(pos, frame=int(fr), width=width, height=height)
        result[key] = {'frame': int(fr), 'at': [x_px, y_px], 'world': [round(v, 3) for v in pos]}

    scn.frame_set(cur_frame)
    if out_json_path:
        p = Path(out_json_path)
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    return result

