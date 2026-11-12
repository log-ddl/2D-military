"""Hiệu ứng Mặt phẳng Quét Laser Mổ xẻ Cơ khí (Progressive Laser Cutaway Slicer) trong Blender 5.2.

Giải quyết triệt để lỗi "vỏ biến mất đột ngột":
  1. Lúc mở (Scan-in): Mặt phẳng Laser HDR quét dọc từ đầu này sang đầu kia.
     - Phía trước tia Laser: Vỏ kim loại PBR đặc nguyên bản 100%, nội thất bên trong ẩn hoàn toàn.
     - Ngay tại tia Laser: Vệt cắt phát sáng HDR (cam nhiệt hoặc xanh cyan).
     - Phía sau tia Laser: Vỏ kim loại hoá thành màng kính mờ Fresnel (giữ phom dáng khí tài),
       đồng thời nội thất/động cơ bên trong lộ dần ra đúng tới vị trí tia Laser vừa đi qua.
  2. Lúc đóng (Scan-out): Tia Laser quét ngược lại, hàn kín lớp vỏ kim loại PBR đặc trở lại.
"""
from __future__ import annotations
import bpy


def _enable_alpha_blend(mat: bpy.types.Material):
    if hasattr(mat, 'surface_render_method'):
        mat.surface_render_method = 'BLENDED'
    elif hasattr(mat, 'blend_method'):
        mat.blend_method = 'BLEND'


def _animate_value_node(
    val_node: bpy.types.ShaderNodeValue,
    closed_val: float,
    open_val: float,
    scan_in_frames: tuple[int, int],
    scan_out_frames: tuple[int, int] | None = None,
):
    out_sock = val_node.outputs[0]
    f_in0, f_in1 = int(scan_in_frames[0]), int(scan_in_frames[1])

    out_sock.default_value = float(closed_val)
    out_sock.keyframe_insert(data_path='default_value', frame=max(1, f_in0 - 1))
    out_sock.keyframe_insert(data_path='default_value', frame=f_in0)

    out_sock.default_value = float(open_val)
    out_sock.keyframe_insert(data_path='default_value', frame=f_in1)

    if scan_out_frames is not None:
        f_out0, f_out1 = int(scan_out_frames[0]), int(scan_out_frames[1])
        out_sock.default_value = float(open_val)
        out_sock.keyframe_insert(data_path='default_value', frame=f_out0)
        out_sock.default_value = float(closed_val)
        out_sock.keyframe_insert(data_path='default_value', frame=f_out1)


def setup_laser_cutaway(
    shell_objs: list[bpy.types.Object],
    inner_objs: list[bpy.types.Object] = (),
    hide_liner_objs: list[bpy.types.Object] = (),
    axis: str = 'X',
    closed_coord: float = 12.0,
    open_coord: float = -12.0,
    scan_in_frames: tuple[int, int] = (25, 85),
    scan_out_frames: tuple[int, int] | None = None,
    laser_color: tuple[float, float, float] = (0.12, 0.78, 1.0),
    laser_width: float = 0.22,
    laser_strength: float = 16.0,
    ghost_opacity: float = 0.14,
):
    """Thiết lập hiệu ứng quét Laser mở/đóng đồng bộ trên vỏ ngoài (`shell_objs`) và ruột bên trong (`inner_objs`)."""
    axis_idx = {'X': 0, 'Y': 1, 'Z': 2}[axis.upper()]
    # direction = +1 nếu quét từ giá trị lớn xuống giá trị nhỏ (vd +12 -> -12), -1 nếu ngược lại
    direction = 1.0 if closed_coord > open_coord else -1.0

    processed_shell_mats: set[str] = set()
    for obj in shell_objs:
        if obj.type != 'MESH' or not obj.data.materials:
            continue
        for slot_idx, mat in enumerate(obj.data.materials):
            if mat is None:
                continue
            if mat.name not in processed_shell_mats:
                mat_copy = mat.copy()
                mat_copy.name = f'{mat.name}_LaserShell'
                obj.data.materials[slot_idx] = mat_copy
                processed_shell_mats.add(mat_copy.name)
                _inject_shell_laser_nodes(
                    mat_copy,
                    axis_idx=axis_idx,
                    direction=direction,
                    closed_coord=closed_coord,
                    open_coord=open_coord,
                    scan_in_frames=scan_in_frames,
                    scan_out_frames=scan_out_frames,
                    laser_color=laser_color,
                    laser_width=laser_width,
                    laser_strength=laser_strength,
                    ghost_opacity=ghost_opacity,
                )

    # Các lớp vách lót đục bên trong (hide_liner_objs) sẽ bị cắt biến mất hoàn toàn phía sau tia Laser
    processed_liner_mats: set[str] = set()
    for obj in hide_liner_objs:
        if obj.type != 'MESH' or not obj.data.materials:
            continue
        for slot_idx, mat in enumerate(obj.data.materials):
            if mat is None:
                continue
            if mat.name not in processed_liner_mats:
                mat_copy = mat.copy()
                mat_copy.name = f'{mat.name}_LaserLiner'
                obj.data.materials[slot_idx] = mat_copy
                processed_liner_mats.add(mat_copy.name)
                _inject_shell_laser_nodes(
                    mat_copy,
                    axis_idx=axis_idx,
                    direction=direction,
                    closed_coord=closed_coord,
                    open_coord=open_coord,
                    scan_in_frames=scan_in_frames,
                    scan_out_frames=scan_out_frames,
                    laser_color=laser_color,
                    laser_width=laser_width * 0.8,
                    laser_strength=laser_strength * 0.6,
                    ghost_opacity=0.0,
                )

    # Các bộ phận cơ khí/nội thất bên trong (inner_objs) chỉ lộ dần ra phía sau tia Laser
    processed_inner_mats: set[str] = set()
    for obj in inner_objs:
        if obj.type != 'MESH' or not obj.data.materials:
            continue
        for slot_idx, mat in enumerate(obj.data.materials):
            if mat is None:
                continue
            if mat.name not in processed_inner_mats:
                mat_copy = mat.copy()
                mat_copy.name = f'{mat.name}_LaserInner'
                obj.data.materials[slot_idx] = mat_copy
                processed_inner_mats.add(mat_copy.name)
                _inject_inner_laser_nodes(
                    mat_copy,
                    axis_idx=axis_idx,
                    direction=direction,
                    closed_coord=closed_coord,
                    open_coord=open_coord,
                    scan_in_frames=scan_in_frames,
                    scan_out_frames=scan_out_frames,
                    laser_color=laser_color,
                    laser_width=laser_width,
                    laser_strength=laser_strength * 0.75,
                )


def _inject_shell_laser_nodes(
    mat: bpy.types.Material,
    axis_idx: int,
    direction: float,
    closed_coord: float,
    open_coord: float,
    scan_in_frames: tuple[int, int],
    scan_out_frames: tuple[int, int] | None,
    laser_color: tuple[float, float, float],
    laser_width: float,
    laser_strength: float,
    ghost_opacity: float,
):
    mat.use_nodes = True
    _enable_alpha_blend(mat)
    nt = mat.node_tree
    out_node = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if out_node is None or not out_node.inputs['Surface'].links:
        return
    orig_shader_socket = out_node.inputs['Surface'].links[0].from_socket

    geom = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geom.outputs['Position'], sep.inputs['Vector'])
    coord_sock = sep.outputs[axis_idx]

    cut_val = nt.nodes.new('ShaderNodeValue')
    cut_val.label = 'LaserCutCoord'
    _animate_value_node(cut_val, closed_coord, open_coord, scan_in_frames, scan_out_frames)

    # diff = (coord - cut_val) * direction
    # Khi diff > 0: tia Laser đã quét qua (chuyển sang Ghost X-Ray)
    # Khi diff < 0: tia Laser chưa tới (giữ nguyên vỏ kim loại đặc orig_shader_socket)
    sub = nt.nodes.new('ShaderNodeMath')
    sub.operation = 'SUBTRACT'
    nt.links.new(coord_sock, sub.inputs[0])
    nt.links.new(cut_val.outputs[0], sub.inputs[1])

    signed_diff = nt.nodes.new('ShaderNodeMath')
    signed_diff.operation = 'MULTIPLY'
    nt.links.new(sub.outputs[0], signed_diff.inputs[0])
    signed_diff.inputs[1].default_value = float(direction)

    # Hệ số đã quét qua: scanned_fac = smoothstep(-w*0.5, +w*0.5, signed_diff)
    map_scanned = nt.nodes.new('ShaderNodeMapRange')
    map_scanned.interpolation_type = 'SMOOTHSTEP'
    map_scanned.inputs['From Min'].default_value = -laser_width * 0.5
    map_scanned.inputs['From Max'].default_value = laser_width * 0.5
    nt.links.new(signed_diff.outputs[0], map_scanned.inputs['Value'])

    # Hệ số nằm đúng trên lưỡi cắt Laser: abs(signed_diff) < laser_width
    abs_diff = nt.nodes.new('ShaderNodeMath')
    abs_diff.operation = 'ABSOLUTE'
    nt.links.new(signed_diff.outputs[0], abs_diff.inputs[0])

    map_laser = nt.nodes.new('ShaderNodeMapRange')
    map_laser.interpolation_type = 'SMOOTHSTEP'
    map_laser.inputs['From Min'].default_value = laser_width
    map_laser.inputs['From Max'].default_value = 0.0
    nt.links.new(abs_diff.outputs[0], map_laser.inputs['Value'])

    # Shader Ghost X-Ray Fresnel (màng kính mờ giữ đường viền khí tài)
    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    ghost_emiss = nt.nodes.new('ShaderNodeEmission')
    ghost_emiss.inputs['Color'].default_value = (*laser_color, 1.0)
    ghost_emiss.inputs['Strength'].default_value = 1.6

    layer_w = nt.nodes.new('ShaderNodeLayerWeight')
    layer_w.inputs['Blend'].default_value = 0.35
    fresnel_mult = nt.nodes.new('ShaderNodeMath')
    fresnel_mult.operation = 'MULTIPLY'
    nt.links.new(layer_w.outputs['Facing'], fresnel_mult.inputs[0])
    fresnel_mult.inputs[1].default_value = float(ghost_opacity)

    ghost_mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(fresnel_mult.outputs[0], ghost_mix.inputs['Fac'])
    nt.links.new(transp.outputs['BSDF'], ghost_mix.inputs[1])
    nt.links.new(ghost_emiss.outputs['Emission'], ghost_mix.inputs[2])

    # Trộn giữa Vỏ PBR gốc (chưa quét) và Ghost X-Ray (đã quét)
    shell_or_ghost = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(map_scanned.outputs['Result'], shell_or_ghost.inputs['Fac'])
    nt.links.new(orig_shader_socket, shell_or_ghost.inputs[1])
    nt.links.new(ghost_mix.outputs['Shader'], shell_or_ghost.inputs[2])

    # Đè lưỡi cắt Laser HDR phát sáng rực rỡ tại biên quét
    laser_emiss = nt.nodes.new('ShaderNodeEmission')
    laser_emiss.inputs['Color'].default_value = (*laser_color, 1.0)
    laser_emiss.inputs['Strength'].default_value = float(laser_strength)

    final_mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(map_laser.outputs['Result'], final_mix.inputs['Fac'])
    nt.links.new(shell_or_ghost.outputs['Shader'], final_mix.inputs[1])
    nt.links.new(laser_emiss.outputs['Emission'], final_mix.inputs[2])

    nt.links.new(final_mix.outputs['Shader'], out_node.inputs['Surface'])


def _inject_inner_laser_nodes(
    mat: bpy.types.Material,
    axis_idx: int,
    direction: float,
    closed_coord: float,
    open_coord: float,
    scan_in_frames: tuple[int, int],
    scan_out_frames: tuple[int, int] | None,
    laser_color: tuple[float, float, float],
    laser_width: float,
    laser_strength: float,
):
    mat.use_nodes = True
    _enable_alpha_blend(mat)
    nt = mat.node_tree
    out_node = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
    if out_node is None or not out_node.inputs['Surface'].links:
        return
    orig_shader_socket = out_node.inputs['Surface'].links[0].from_socket

    geom = nt.nodes.new('ShaderNodeNewGeometry')
    sep = nt.nodes.new('ShaderNodeSeparateXYZ')
    nt.links.new(geom.outputs['Position'], sep.inputs['Vector'])
    coord_sock = sep.outputs[axis_idx]

    cut_val = nt.nodes.new('ShaderNodeValue')
    cut_val.label = 'LaserCutCoordInner'
    _animate_value_node(cut_val, closed_coord, open_coord, scan_in_frames, scan_out_frames)

    sub = nt.nodes.new('ShaderNodeMath')
    sub.operation = 'SUBTRACT'
    nt.links.new(coord_sock, sub.inputs[0])
    nt.links.new(cut_val.outputs[0], sub.inputs[1])

    signed_diff = nt.nodes.new('ShaderNodeMath')
    signed_diff.operation = 'MULTIPLY'
    nt.links.new(sub.outputs[0], signed_diff.inputs[0])
    signed_diff.inputs[1].default_value = float(direction)

    # Khi signed_diff > 0 (tia Laser đã đi qua): hiện nội thất PBR (Result = 1)
    # Khi signed_diff < 0 (tia Laser chưa tới): ẩn hoàn toàn (Transparent BSDF)
    map_reveal = nt.nodes.new('ShaderNodeMapRange')
    map_reveal.interpolation_type = 'SMOOTHSTEP'
    map_reveal.inputs['From Min'].default_value = -laser_width * 0.4
    map_reveal.inputs['From Max'].default_value = laser_width * 0.4
    nt.links.new(signed_diff.outputs[0], map_reveal.inputs['Value'])

    abs_diff = nt.nodes.new('ShaderNodeMath')
    abs_diff.operation = 'ABSOLUTE'
    nt.links.new(signed_diff.outputs[0], abs_diff.inputs[0])

    map_laser = nt.nodes.new('ShaderNodeMapRange')
    map_laser.interpolation_type = 'SMOOTHSTEP'
    map_laser.inputs['From Min'].default_value = laser_width * 0.85
    map_laser.inputs['From Max'].default_value = 0.0
    nt.links.new(abs_diff.outputs[0], map_laser.inputs['Value'])

    transp = nt.nodes.new('ShaderNodeBsdfTransparent')
    reveal_mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(map_reveal.outputs['Result'], reveal_mix.inputs['Fac'])
    nt.links.new(transp.outputs['BSDF'], reveal_mix.inputs[1])
    nt.links.new(orig_shader_socket, reveal_mix.inputs[2])

    laser_emiss = nt.nodes.new('ShaderNodeEmission')
    laser_emiss.inputs['Color'].default_value = (*laser_color, 1.0)
    laser_emiss.inputs['Strength'].default_value = float(laser_strength)

    final_mix = nt.nodes.new('ShaderNodeMixShader')
    nt.links.new(map_laser.outputs['Result'], final_mix.inputs['Fac'])
    nt.links.new(reveal_mix.outputs['Shader'], final_mix.inputs[1])
    nt.links.new(laser_emiss.outputs['Emission'], final_mix.inputs[2])

    nt.links.new(final_mix.outputs['Shader'], out_node.inputs['Surface'])
