#!/usr/bin/env python3
"""Công cụ chạy cảnh & dựng phim 100% bằng Blender 5.2 (không qua Remotion) cho skill military-blender:
- Chụp ảnh kiểm 6 khung nhanh (--check) + tự động lưu file .blend (out/blend/C01Sxx.blend) để mở xem 60 FPS.
- Xuất thử một đoạn ngắn vài giây (--test C01S01 --seconds 4) để duyệt chuyển động nhanh.
- Xuất toàn bộ cảnh .mp4 và ráp nối bằng bàn dựng Blender Video Sequence Editor (VSE) có chuyển cảnh
  (CROSS / GAMMA_CROSS / WIPE / CUT) + trộn âm thanh (voice + music + sfx) thẳng ra out/video.mp4 (--render).

Cách dùng:
  python3 skills/military-blender/tools/blender_runner.py <id> --check [C01S01,C01S02 | all] [-j 2]
  python3 skills/military-blender/tools/blender_runner.py <id> --test <C01S01> [--seconds 4] [--samples 4]
  python3 skills/military-blender/tools/blender_runner.py <id> --render [C01S01,C01S02 | all] [--samples 4] [-j 2]
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
PROJECTS = ROOT / 'projects'
BLENDER_BIN = os.environ.get('BLENDER_BIN', '/Applications/Blender.app/Contents/MacOS/Blender')
SKILL_DIR = Path(__file__).resolve().parents[1]


def opt(argv: list[str], *flags: str, default=None):
    for f in flags:
        if f in argv:
            idx = argv.index(f)
            if idx + 1 < len(argv):
                return argv[idx + 1]
    return default


def resolve_scenes(pdir: Path, target_spec: str, chapter: str | None = None) -> list[str]:
    bdir = pdir / 'blender'
    if not bdir.is_dir():
        sys.exit(f'Chưa có thư mục {bdir.relative_to(ROOT)}')
    if chapter:
        return sorted(f.stem for f in bdir.glob(f'{chapter}S[0-9][0-9]*.py'))
    if target_spec == 'all':
        return sorted(f.stem for f in bdir.glob('C[0-9][0-9]S[0-9][0-9]*.py'))
    return [s.strip() for s in target_spec.split(',') if s.strip()]


def run_check_one(pdir: Path, sid: str) -> tuple[str, bool, str]:
    script_path = pdir / 'blender' / f'{sid}.py'
    if not script_path.is_file():
        return sid, False, f'Không thấy {script_path}'

    blend_dir = pdir / 'out/blend'
    check_dir = pdir / 'out/checks/scenes'
    blend_dir.mkdir(parents=True, exist_ok=True)
    check_dir.mkdir(parents=True, exist_ok=True)
    blend_out = blend_dir / f'{sid}.blend'
    sheet_out = check_dir / f'{sid}.png'

    with tempfile.TemporaryDirectory(prefix=f'bcheck_{sid}_') as tmpd:
        wrapper = Path(tmpd) / 'run_wrapper.py'
        wrapper.write_text(f"""
import sys, bpy
sys.path.insert(0, {str(SKILL_DIR)!r})
sys.path.insert(0, {str(pdir / 'blender')!r})

with open({str(script_path)!r}, 'r', encoding='utf-8') as f:
    code = compile(f.read(), {str(script_path)!r}, 'exec')
    exec(code, {{
        '__name__': '__main__',
        '__file__': {str(script_path)!r},
        'PROJECT_DIR': {str(pdir)!r},
        'SCENE_ID': {str(sid)!r},
    }})

scn = bpy.context.scene
# Lưu file .blend chuẩn 1080p để người dùng mở xem trực tiếp 60 FPS không lag
bpy.ops.wm.save_as_mainfile(filepath={str(blend_out)!r})

# Chụp 6 khung kiểm tra nhanh ở 960x540 (2 samples)
scn.render.resolution_x = 960
scn.render.resolution_y = 540
scn.eevee.taa_render_samples = 2
if hasattr(scn.render.image_settings, 'media_type'):
    scn.render.image_settings.media_type = 'IMAGE'
scn.render.image_settings.file_format = 'PNG'

f0, f1 = scn.frame_start, scn.frame_end
span = max(1, f1 - f0)
frames = [int(round(f0 + span * (i / 5.0))) for i in range(6)]
for idx, fr in enumerate(frames):
    scn.frame_set(fr)
    scn.render.filepath = {str(Path(tmpd))!r} + f'/f_{{idx:02d}}.png'
    bpy.ops.render.render(write_still=True)
""")
        r = subprocess.run(
            [BLENDER_BIN, '--background', '--factory-startup', '--python', str(wrapper)],
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            return sid, False, (r.stdout + '\n' + r.stderr)[-1500:]

        frames_png = [Path(tmpd) / f'f_{i:02d}.png' for i in range(6)]
        if not all(fp.is_file() for fp in frames_png):
            return sid, False, 'Blender không xuất đủ 6 khung kiểm tra\n' + (r.stdout + r.stderr)[-1200:]

        cmd = [
            'ffmpeg', '-y', '-loglevel', 'error',
            *[arg for fp in frames_png for arg in ('-i', str(fp))],
            '-filter_complex',
            '[0:v][1:v][2:v][3:v][4:v][5:v]xstack=inputs=6:layout=0_0|w0_0|0_h0|w0_h0|0_h0+h2|w0_h0+h2,scale=960:-1',
            str(sheet_out),
        ]
        subprocess.run(cmd, check=True)
    return sid, True, f'{sheet_out.relative_to(ROOT)} & {blend_out.relative_to(ROOT)}'


def build_overview_sheet(pdir: Path, sids: list[str] | None = None, chapter: str | None = None) -> None:
    """Gộp các ảnh kiểm trong out/checks/scenes/C*.png (của các cảnh Blender) thành out/checks/blender_sheet.png hoặc chapters/CNN.png."""
    check_dir = pdir / 'out/checks/scenes'
    if sids:
        pngs = [check_dir / f'{s}.png' for s in sids if (check_dir / f'{s}.png').is_file()]
    else:
        b_stems = sorted(f.stem for f in (pdir / 'blender').glob('C[0-9][0-9]S[0-9][0-9]*.py'))
        pngs = [check_dir / f'{s}.png' for s in b_stems if (check_dir / f'{s}.png').is_file()]
    if len(pngs) < 2:
        return
    if chapter:
        ch_dir = pdir / 'out/checks/chapters'
        ch_dir.mkdir(parents=True, exist_ok=True)
        sheet_out = ch_dir / f'{chapter}.png'
    else:
        sheet_out = pdir / 'out/checks/blender_sheet.png'
    inputs = [arg for fp in pngs for arg in ('-i', str(fp))]
    n = len(pngs)
    streams = ''.join(f'[{i}:v]scale=960:-1[v{i}];' for i in range(n))
    vlabels = ''.join(f'[v{i}]' for i in range(n))
    subprocess.run(
        ['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', f'{streams}{vlabels}vstack=inputs={n}', str(sheet_out)],
        check=False,
    )


def run_test_clip(pdir: Path, sid: str, seconds: float, samples: int, res: str) -> None:
    script_path = pdir / 'blender' / f'{sid}.py'
    if not script_path.is_file():
        sys.exit(f'Không thấy {script_path}')

    w_str, _, h_str = res.lower().partition('x')
    w, h = int(w_str or 1280), int(h_str or 720)
    blend_dir = pdir / 'out/blend'
    blend_dir.mkdir(parents=True, exist_ok=True)
    blend_out = blend_dir / f'{sid}.blend'
    mp4_out = pdir / 'out' / f'test_{sid}.mp4'
    mp4_out.parent.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix=f'btest_{sid}_') as tmpd:
        wrapper = Path(tmpd) / 'test_wrapper.py'
        wrapper.write_text(f"""
import sys, bpy
sys.path.insert(0, {str(SKILL_DIR)!r})
sys.path.insert(0, {str(pdir / 'blender')!r})

with open({str(script_path)!r}, 'r', encoding='utf-8') as f:
    code = compile(f.read(), {str(script_path)!r}, 'exec')
    exec(code, {{
        '__name__': '__main__',
        '__file__': {str(script_path)!r},
        'PROJECT_DIR': {str(pdir)!r},
        'SCENE_ID': {str(sid)!r},
    }})

scn = bpy.context.scene
bpy.ops.wm.save_as_mainfile(filepath={str(blend_out)!r})

fps = scn.render.fps
scn.render.resolution_x = {w}
scn.render.resolution_y = {h}
scn.eevee.taa_render_samples = {int(samples)}
scn.frame_end = min(scn.frame_end, scn.frame_start + int(round({float(seconds)} * fps)) - 1)

if hasattr(scn.render.image_settings, 'media_type'):
    scn.render.image_settings.media_type = 'VIDEO'
scn.render.ffmpeg.format = 'MPEG4'
scn.render.ffmpeg.codec = 'H264'
scn.render.ffmpeg.constant_rate_factor = 'HIGH'
scn.render.filepath = {str(mp4_out)!r}
bpy.ops.render.render(animation=True)
""")
        print(f'Đang xuất clip test ngắn ({seconds}s, {w}x{h}, {samples} samples) cho {sid} ...')
        r = subprocess.run([BLENDER_BIN, '--background', '--factory-startup', '--python', str(wrapper)])
        if r.returncode != 0:
            sys.exit(f'Lỗi xuất clip test {sid}')
        print(f'Xong clip test: {mp4_out.relative_to(ROOT)} (file Blender: {blend_out.relative_to(ROOT)})')


def run_render_one(pdir: Path, sid: str, samples: int) -> tuple[str, bool, str]:
    script_path = pdir / 'blender' / f'{sid}.py'
    if not script_path.is_file():
        return sid, False, f'Không thấy {script_path}'

    blend_dir = pdir / 'out/blend'
    clips_dir = pdir / 'out/clips'
    blend_dir.mkdir(parents=True, exist_ok=True)
    clips_dir.mkdir(parents=True, exist_ok=True)
    blend_out = blend_dir / f'{sid}.blend'
    mp4_out = clips_dir / f'{sid}.mp4'

    with tempfile.TemporaryDirectory(prefix=f'brender_{sid}_') as tmpd:
        wrapper = Path(tmpd) / 'render_wrapper.py'
        wrapper.write_text(f"""
import sys, bpy
sys.path.insert(0, {str(SKILL_DIR)!r})
sys.path.insert(0, {str(pdir / 'blender')!r})

with open({str(script_path)!r}, 'r', encoding='utf-8') as f:
    code = compile(f.read(), {str(script_path)!r}, 'exec')
    exec(code, {{
        '__name__': '__main__',
        '__file__': {str(script_path)!r},
        'PROJECT_DIR': {str(pdir)!r},
        'SCENE_ID': {str(sid)!r},
    }})

scn = bpy.context.scene
scn.eevee.taa_render_samples = {int(samples)}
bpy.ops.wm.save_as_mainfile(filepath={str(blend_out)!r})

# Đệm thêm +12 frames (0.4s) ở đuôi để khi bàn dựng VSE Blender chồng chuyển cảnh GAMMA_CROSS / WIPE không bị hụt hình
scn.frame_end = int(scn.frame_end) + 12

if hasattr(scn.render.image_settings, 'media_type'):
    scn.render.image_settings.media_type = 'VIDEO'
scn.render.ffmpeg.format = 'MPEG4'
scn.render.ffmpeg.codec = 'H264'
scn.render.ffmpeg.constant_rate_factor = 'PERC_LOSSLESS'
scn.render.filepath = {str(mp4_out)!r}
bpy.ops.render.render(animation=True)
""")
        r = subprocess.run(
            [BLENDER_BIN, '--background', '--factory-startup', '--python', str(wrapper)],
            capture_output=True,
            text=True,
        )
        if r.returncode != 0:
            return sid, False, (r.stdout + '\n' + r.stderr)[-1500:]
    return sid, True, str(mp4_out.relative_to(ROOT))


def assemble_vse_master(pdir: Path) -> None:
    """Ráp nối các clip trong out/clips/*.mp4 kèm hiệu ứng chuyển cảnh (GAMMA_CROSS / WIPE / CUT)
    và trộn 3 rãnh âm thanh (voice.mp3 + music.wav + sfx.wav) bằng bàn dựng Blender VSE ra out/video.mp4.
    """
    chs = [json.loads(f.read_text(encoding='utf-8')) for f in sorted((pdir / 'plan/chapters').glob('C[0-9][0-9].json'))]
    scenes = [s for c in chs for s in (c.get('scenes') or [])]
    if not scenes:
        return

    clips_dir = pdir / 'out/clips'
    if not all((clips_dir / f"{s['id']}.mp4").is_file() for s in scenes):
        print('Chưa xuất đủ tất cả các cảnh trong plan/chapters/*.json nên chưa ráp out/video.mp4.')
        return

    proj = json.loads((pdir / 'project.json').read_text(encoding='utf-8'))
    fps = int(proj.get('fps', 30))
    w = int(proj.get('width', 1920))
    h = int(proj.get('height', 1080))
    total_frames = int(round(float(scenes[-1]['to']) * fps))

    vse_blend = pdir / 'out/blend/master_vse.blend'
    video_no_audio = pdir / 'out/.video_vse_silent.mp4'
    final_mp4 = pdir / 'out/video.mp4'

    with tempfile.TemporaryDirectory(prefix='bvse_') as tmpd:
        vse_script = Path(tmpd) / 'vse_assemble.py'
        vse_script.write_text(f"""
import bpy
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.fps = {fps}
scn.render.resolution_x = {w}
scn.render.resolution_y = {h}
scn.render.resolution_percentage = 100
scn.frame_start = 1
scn.frame_end = {total_frames}
scn.render.use_sequencer = True

if not scn.sequence_editor:
    scn.sequence_editor_create()
seq_all = scn.sequence_editor.strips if hasattr(scn.sequence_editor, 'strips') else scn.sequence_editor.sequences

scenes_meta = {json.dumps(scenes)}
clips_dir = {str(clips_dir)!r}
fps = {fps}
T_HALF = 6  # 12-frame transition overlap (6 frames before, 6 frames after)

prev_strip = None
for idx, s in enumerate(scenes_meta):
    sid = s['id']
    mp4_path = f"{{clips_dir}}/{{sid}}.mp4"
    trans_kind = (s.get('transition') or 'fade').split(':')[0]
    f_start = max(1, int(round(float(s['from']) * fps)) + 1 - (T_HALF if idx > 0 and trans_kind != 'cut' else 0))
    f_end = int(round(float(s['to']) * fps)) + (T_HALF if idx < len(scenes_meta) - 1 else 0)
    chan = 1 if (idx % 2 == 0) else 2

    st = seq_all.new_movie(name=sid, filepath=mp4_path, channel=chan, frame_start=f_start)
    st.frame_final_end = max(f_start + 1, f_end)

    if idx > 0 and prev_strip is not None and trans_kind != 'cut':
        eff_type = 'WIPE' if trans_kind in ('wipe', 'clockWipe') else 'GAMMA_CROSS'
        try:
            seq_all.new_effect(
                name=f"Trans_{{sid}}",
                type=eff_type,
                channel=3,
                frame_start=st.frame_final_start,
                frame_end=prev_strip.frame_final_end,
                seq1=prev_strip,
                seq2=st,
            )
        except TypeError:
            seq_all.new_effect(
                name=f"Trans_{{sid}}",
                type=eff_type,
                channel=3,
                frame_start=st.frame_final_start,
                length=max(1, prev_strip.frame_final_end - st.frame_final_start),
                input1=prev_strip,
                input2=st,
            )
    prev_strip = st

bpy.ops.wm.save_as_mainfile(filepath={str(vse_blend)!r})
if hasattr(scn.render.image_settings, 'media_type'):
    scn.render.image_settings.media_type = 'VIDEO'
scn.render.ffmpeg.format = 'MPEG4'
scn.render.ffmpeg.codec = 'H264'
scn.render.ffmpeg.constant_rate_factor = 'HIGH'
scn.render.filepath = {str(video_no_audio)!r}
bpy.ops.render.render(animation=True)
""")
        print('Đang ráp nối các cảnh bằng bàn dựng Blender VSE (master_vse.blend) ...')
        subprocess.run([BLENDER_BIN, '--background', '--factory-startup', '--python', str(vse_script)], check=True)

    # Ghép phần âm thanh đã chuẩn hoá (từ audio.py: voice.mp3 + music.wav + sfx.wav) vào video
    pub = pdir / '.build/public'
    voice_p = pub / 'voice.mp3'
    if not voice_p.is_file():
        voice_p = pdir / 'assets/voice/voice.mp3'
    music_p = pub / 'music.wav'
    sfx_p = pub / 'sfx.wav'

    mix_file = pdir / 'plan/mix.json'
    vol_m, vol_s = 0.4, 0.5
    if mix_file.is_file():
        vols = json.loads(mix_file.read_text(encoding='utf-8')).get('volume', {})
        vol_m = float(vols.get('music', vol_m))
        vol_s = float(vols.get('sfx', vol_s))

    if voice_p.is_file() and music_p.is_file() and sfx_p.is_file():
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error',
            '-i', str(video_no_audio),
            '-i', str(voice_p),
            '-i', str(music_p),
            '-i', str(sfx_p),
            '-filter_complex',
            f'[1:a]volume=1.0[v];[2:a]volume={vol_m}[m];[3:a]volume={vol_s}[s];[v][m][s]amix=inputs=3:duration=first:normalize=0[aout]',
            '-map', '0:v:0', '-map', '[aout]',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
            str(final_mp4),
        ], check=True)
    elif voice_p.is_file():
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error',
            '-i', str(video_no_audio), '-i', str(voice_p),
            '-map', '0:v:0', '-map', '1:a:0',
            '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-shortest',
            str(final_mp4),
        ], check=True)
    else:
        video_no_audio.replace(final_mp4)

    if video_no_audio.is_file():
        video_no_audio.unlink()
    print(f'Hoàn tất xuất video 100% Blender: {final_mp4.relative_to(ROOT)} (Bàn dựng VSE: {vse_blend.relative_to(ROOT)})')


def main():
    argv = sys.argv[1:]
    if len(argv) < 2:
        sys.exit(__doc__)
    pid = argv[0]
    pdir = PROJECTS / pid
    if not pdir.is_dir():
        sys.exit(f'Không tìm thấy dự án projects/{pid}')

    jobs = max(1, int(opt(argv, '-j', '--jobs', default='2')))
    samples = int(opt(argv, '--samples', default='4'))
    chapter = opt(argv, '--chapter', default=None)

    if '--test' in argv:
        sid = opt(argv, '--test', default='C01S01')
        secs = float(opt(argv, '--seconds', default='4.0'))
        res = opt(argv, '--res', default='1280x720')
        run_test_clip(pdir, sid, secs, samples, res)
        return

    if '--check' in argv:
        target = opt(argv, '--check', default='all')
        if target.startswith('--'):
            target = 'all'
        sids = resolve_scenes(pdir, target, chapter=chapter)
        with ThreadPoolExecutor(max_workers=jobs) as ex:
            results = list(ex.map(lambda s: run_check_one(pdir, s), sids))
        for sid, ok, msg in results:
            print(f"[{'OK' if ok else 'ERR'}] {sid}: {msg}")
        if not all(ok for _, ok, _ in results):
            sys.exit(1)
        build_overview_sheet(pdir, sids=sids, chapter=chapter)
        return

    if '--render' in argv:
        target = opt(argv, '--render', default='all')
        if target.startswith('--'):
            target = 'all'
        sids = resolve_scenes(pdir, target, chapter=chapter)
        with ThreadPoolExecutor(max_workers=jobs) as ex:
            results = list(ex.map(lambda s: run_render_one(pdir, s, samples), sids))
        for sid, ok, msg in results:
            print(f"[{'OK' if ok else 'ERR'}] {sid}: {msg}")
        if not all(ok for _, ok, _ in results):
            sys.exit(1)
        if target == 'all' and not chapter:
            assemble_vse_master(pdir)
        return

    sys.exit(__doc__)


if __name__ == '__main__':
    main()
