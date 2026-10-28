#!/usr/bin/env python3
"""Ảnh kiểm hình (nhiều khung ghép lưới) cho một dự án.

    python3 tools/sheet.py <id>                         cả video → out/sheet.png (24 khung, cần build.py trước)
    python3 tools/sheet.py <id> --scene S03,S07         từng cảnh cô lập → out/scenes/S03.png … (6 khung, rộng 960; tự kiểm tsc riêng, KHÔNG cần build.py)
    python3 tools/sheet.py <id> --from 40 --to 60       một đoạn → out/sheet_40-60.png (cần build.py trước)
    python3 tools/sheet.py <id> --model M109            mô hình 4 góc (video/local/models) → out/models/M109.png (cần build.py trước)
    tuỳ chọn: --n 6  --cols 3  --width 960

Mốc giây của từng ô (trái→phải, trên→dưới) in ra stdout và ghi file .txt cạnh ảnh.
Chế độ --scene sinh entry & tsconfig tạm riêng cho từng lệnh và điều tiết tối đa 4 tiến trình Chrome render đồng thời,
giúp 4–10 subagent chạy song song không đụng file hay nghẽn GPU/CPU.
"""
import contextlib
import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from common import ENGINE, comp_id, find_media, need, opt, remotion, scenes

MAX_PARALLEL_RENDERS = 4


@contextlib.contextmanager
def render_slot(max_slots: int = MAX_PARALLEL_RENDERS):
    """Giới hạn tối đa `max_slots` tiến trình Chrome/Remotion render đồng thời trên máy (kernel tự nhả khóa nếu tiến trình bị dừng đột ngột)."""
    lock_dir = Path(tempfile.gettempdir()) / '2d_military_render_locks'
    lock_dir.mkdir(exist_ok=True)
    fh = None
    start_idx = os.getpid() % max_slots
    while fh is None:
        for k in range(max_slots):
            slot = lock_dir / f'slot_{(start_idx + k) % max_slots}.lock'
            f = open(slot, 'w')
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                f.write(f'{os.getpid()}\n')
                f.flush()
                fh = f
                break
            except BlockingIOError:
                f.close()
        if fh is None:
            time.sleep(0.35)
    try:
        yield
    finally:
        try:
            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        finally:
            fh.close()


def tile_frames(frames: list[Path], td: Path, cols: int, width: int, out: Path):
    """Thu nhỏ từng khung và ghép lưới bằng ffmpeg, ghi ra `out` theo kiểu nguyên tử (atomic replace)."""
    for i, fr in enumerate(frames):
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(fr), '-vf', f'scale={width}:-1', str(td / f'l{i:03d}.jpg')], check=True)
    rows = (len(frames) + cols - 1) // cols
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp_out = td / f'out_{os.getpid()}{out.suffix}'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '1', '-i', str(td / 'l%03d.jpg'), '-vf',
                    f'tile={cols}x{rows}:padding=4', '-frames:v', '1', str(tmp_out)], check=True)
    os.replace(tmp_out, out)


def write_secs_atomic(out: Path, secs: str, td: Path):
    txt = out.with_suffix('.txt')
    tmp_txt = td / f'out_{os.getpid()}.txt'
    tmp_txt.write_text(secs + '\n')
    os.replace(tmp_txt, txt)


def shoot(pdir: Path, a: float, b: float, n: int, cols: int, width: int, out: Path, fps: int):
    f0, f1 = round(a * fps), max(round(a * fps), round(b * fps) - 1)
    step = max(1, (f1 - f0) // max(1, n - 1)) if n > 1 else f1 - f0 + 1
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        with render_slot():
            r = remotion(['render', str(pdir / 'video/entry.tsx'), comp_id(pdir.name), str(td / 'f'), '--sequence', '--image-format=jpeg',
                          f'--frames={f0}-{f1}', f'--every-nth-frame={step}', '--props={"quality":"Full"}', '--muted', f'--public-dir={pdir / "public"}', '--log=error'],
                         capture_output=True, text=True)
        frames = sorted((td / 'f').glob('*.jpeg'))[:n]
        if r.returncode or not frames:
            print(r.stdout[-3000:], r.stderr[-3000:])
            sys.exit('render lỗi')
        tile_frames(frames, td, cols, width, out)
        secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(frames)))
        write_secs_atomic(out, secs, td)
    print(out, '\n  mốc (giây):', secs)


def sync_scene_media(pdir: Path, target_scenes: list[str]):
    """Quét media('…') trong local/, cues.ts và các cảnh đang chụp để chép an toàn vào public/media/ mà không cần build.py."""
    scan_files: list[Path] = []
    cues = pdir / 'video/cues.ts'
    if cues.exists():
        scan_files.append(cues)
    local_dir = pdir / 'video/local'
    if local_dir.exists():
        scan_files.extend(p for p in local_dir.rglob('*') if p.suffix in ('.ts', '.tsx'))
    for sid in target_scenes:
        sf = pdir / 'video/scenes' / f'{sid}.tsx'
        if sf.exists():
            scan_files.append(sf)

    refs: set[str] = set()
    for f in scan_files:
        refs |= set(re.findall(r"media\(\s*['\"]([^'\"]+)['\"]\s*\)", f.read_text()))

    (pdir / 'public').mkdir(exist_ok=True)
    pub_media = pdir / 'public/media'
    missing = []
    for rel in sorted(refs):
        src = find_media(pdir, rel)
        if not src:
            missing.append(rel)
            continue
        dst = pub_media / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            tmp_dst = dst.with_name(f'.tmp_{os.getpid()}_{dst.name}')
            shutil.copy2(src, tmp_dst)
            os.replace(tmp_dst, dst)
    if missing:
        for rel in missing:
            print(f'  THIẾU media: {rel} (không có trong input/ hay library/)')
        sys.exit(1)


def shoot_isolated_scenes(pdir: Path, spec: dict, want: list[str], n: int, cols: int, width: int, fps: int):
    """Kiểm kiểu TypeScript riêng + đóng gói 1 lần + chụp lưới cho các cảnh `want` mà không đụng Video.tsx / entry.tsx."""
    by = {s['id']: s for s in spec['scenes']}
    for sid in want:
        if sid not in by:
            sys.exit(f'không có cảnh {sid} trong plan/scenes.json')
        sf = pdir / 'video/scenes' / f'{sid}.tsx'
        if not sf.exists():
            sys.exit(f'chưa có file video/scenes/{sid}.tsx')

    # Đảm bảo symlink node_modules cho dự án (phòng trường hợp thư mục được chép tay)
    nm = pdir.parent / 'node_modules'
    if not nm.exists():
        try:
            os.symlink('../engine/node_modules', nm)
        except FileExistsError:
            pass

    sync_scene_media(pdir, want)

    cache_root = pdir / '.cache'
    cache_root.mkdir(exist_ok=True)
    work = Path(tempfile.mkdtemp(prefix=f"scene_{'_'.join(want)}_", dir=cache_root))
    try:
        # 1. Sinh entry.tsx tạm chỉ import đúng các cảnh cần chụp
        imports = [
            "import React from 'react';",
            "import { AbsoluteFill, Composition, registerRoot } from 'remotion';",
            "import { QualityProvider } from '@kit/quality';",
        ]
        wrappers = []
        comps = []
        plan: dict[str, tuple[int, int, int, int]] = {}  # sid -> (f0_abs, lf0, lf1, step)

        for sid in want:
            s = by[sid]
            rel_mod = Path(os.path.relpath(pdir / 'video/scenes' / sid, work)).as_posix()
            imports.append(f"import {sid} from '{rel_mod}';")

            pad = min(0.3, (s['to'] - s['from']) / 10)
            a, b = s['from'] + pad, s['to'] - pad
            f0 = round(a * fps)
            f1 = max(f0, round(b * fps) - 1)
            step = max(1, (f1 - f0) // max(1, n - 1)) if n > 1 else f1 - f0 + 1

            base_f = max(0, round(s['from'] * fps) - 6)
            end_f = max(base_f + 1, round(s['to'] * fps) + 6, f1 + 1)
            dur_frames = end_f - base_f
            t0_val = base_f / fps

            wrappers.append(
                f"const Wrap_{sid}: React.FC = () => ("
                f"<QualityProvider value={{1}}><AbsoluteFill style={{{{ backgroundColor: '#000' }}}}>"
                f"<{sid} t0={{{t0_val:.8f}}} />"
                f"</AbsoluteFill></QualityProvider>);"
            )
            comps.append(
                f'    <Composition id="scene-{sid}" component={{Wrap_{sid}}} durationInFrames={{{dur_frames}}} fps={{{fps}}} width={{1920}} height={{1080}} />'
            )
            plan[sid] = (f0, f0 - base_f, f1 - base_f, step)

        entry_file = work / 'entry.tsx'
        entry_file.write_text(
            '\n'.join(imports) + '\n\n'
            + '\n'.join(wrappers) + '\n\n'
            + 'registerRoot(() => (\n  <>\n'
            + '\n'.join(comps) + '\n  </>\n));\n'
        )

        # 2. Kiểm kiểu TypeScript cô lập (chỉ kiểm cues.ts, local/, và đúng các cảnh trong `want`)
        includes = ['./entry.tsx']
        if (pdir / 'video/cues.ts').exists():
            includes.append(Path(os.path.relpath(pdir / 'video/cues.ts', work)).as_posix())
        if (pdir / 'video/local').exists():
            includes.append(Path(os.path.relpath(pdir / 'video/local', work)).as_posix())
        for sid in want:
            includes.append(Path(os.path.relpath(pdir / 'video/scenes' / f'{sid}.tsx', work)).as_posix())

        tsconfig_file = work / 'tsconfig.json'
        tsconfig_file.write_text(json.dumps({
            'extends': Path(os.path.relpath(ENGINE / 'tsconfig.base.json', work)).as_posix(),
            'include': includes,
        }, indent=2) + '\n')

        r_tsc = subprocess.run([str(ENGINE / 'node_modules/.bin/tsc'), '-p', str(tsconfig_file)], capture_output=True, text=True)
        errs = [ln for ln in (r_tsc.stdout + r_tsc.stderr).splitlines() if 'error TS' in ln]
        if errs:
            print(f"LỖI TypeScript khi kiểm cảnh {', '.join(want)}:")
            for e in errs[:30]:
                print('  ', e)
            sys.exit(1)

        # 3. Đóng gói Rspack 1 lần (nếu chụp >=2 cảnh) và xuất ảnh dưới khóa điều tiết 4 slot
        with render_slot():
            if len(want) > 1:
                bundle_dir = work / 'bundle'
                rb = remotion(['bundle', str(entry_file), f'--out-dir={bundle_dir}', f'--public-dir={pdir / "public"}', '--log=error'],
                              capture_output=True, text=True)
                if rb.returncode:
                    print(rb.stdout[-3000:], rb.stderr[-3000:])
                    sys.exit('bundle lỗi')
                serve_target = str(bundle_dir)
                pub_flags: list[str] = []
            else:
                serve_target = str(entry_file)
                pub_flags = [f'--public-dir={pdir / "public"}']

            for sid in want:
                f0, lf0, lf1, step = plan[sid]
                sc_td = work / f'shot_{sid}'
                sc_td.mkdir(exist_ok=True)
                r = remotion([
                    'render', serve_target, f'scene-{sid}', str(sc_td / 'f'),
                    '--sequence', '--image-format=jpeg',
                    f'--frames={lf0}-{lf1}', f'--every-nth-frame={step}',
                    '--muted', *pub_flags, '--log=error',
                ], capture_output=True, text=True)
                frames = sorted((sc_td / 'f').glob('*.jpeg'))[:n]
                if r.returncode or not frames:
                    print(r.stdout[-3000:], r.stderr[-3000:])
                    sys.exit(f'render lỗi ở cảnh {sid}')
                out = pdir / 'out/scenes' / f'{sid}.png'
                tile_frames(frames, sc_td, cols, width, out)
                secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(frames)))
                write_secs_atomic(out, secs, sc_td)
                print(out, '\n  mốc (giây):', secs)
    finally:
        shutil.rmtree(work, ignore_errors=True)
        try:
            cache_root.rmdir()
        except OSError:
            pass


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pdir = need(argv[0])

    if '--scene' in argv:
        spec = scenes(pdir)
        fps = spec.get('fps', 30)
        want = list(dict.fromkeys(x.strip() for x in opt(argv, '--scene').split(',') if x.strip()))
        if not want:
            sys.exit('chưa chỉ định tên cảnh sau --scene (ví dụ: --scene S01,S02)')
        shoot_isolated_scenes(pdir, spec, want, opt(argv, '--n', 6, int), opt(argv, '--cols', 3, int), opt(argv, '--width', 960, int), fps)
        return

    if not (pdir / 'video/entry.tsx').exists():
        sys.exit('chưa build (python3 tools/build.py <id>)')

    if '--model' in argv:
        name = opt(argv, '--model')
        out = pdir / 'out/models' / f'{name}.png'
        with tempfile.TemporaryDirectory() as td:
            td_path = Path(td)
            with render_slot():
                r = remotion(['render', str(pdir / 'video/entry.tsx'), comp_id(pdir.name) + '-models', str(td_path / 'f'), '--sequence', '--image-format=jpeg',
                              '--frames=0-3', f'--props={json.dumps({"name": name})}', '--muted', f'--public-dir={pdir / "public"}', '--log=error'],
                             capture_output=True, text=True)
            frames = sorted((td_path / 'f').glob('*.jpeg'))
            if r.returncode or len(frames) < 4:
                print(r.stdout[-3000:], r.stderr[-3000:])
                sys.exit('render lỗi (đã khai video/local/models/index.ts và chạy build.py chưa?)')
            out.parent.mkdir(parents=True, exist_ok=True)
            tmp_out = td_path / f'model_{os.getpid()}.png'
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *sum([['-i', str(f)] for f in frames], []), '-filter_complex',
                            '[0][1]hstack[a];[2][3]hstack[b];[a][b]vstack,scale=1920:-1', str(tmp_out)], check=True)
            os.replace(tmp_out, out)
        print(out, '\n  góc: 3/4 trước | ngang | 3/4 sau | chéo cao')
        return

    spec = scenes(pdir)
    fps = spec.get('fps', 30)
    a = opt(argv, '--from', 0.0, float)
    b = opt(argv, '--to', spec['scenes'][-1]['to'], float)
    name = 'sheet.png' if '--from' not in argv and '--to' not in argv else f'sheet_{a:g}-{b:g}.png'
    shoot(pdir, a, b, opt(argv, '--n', 24, int), opt(argv, '--cols', 6, int), opt(argv, '--width', 480, int), pdir / 'out' / name, fps)


if __name__ == '__main__':
    shutil.which('ffmpeg') or sys.exit('cần ffmpeg')
    main()
