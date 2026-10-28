#!/usr/bin/env python3
"""Ảnh kiểm hình (nhiều khung ghép lưới) cho một dự án. Chạy tools/build.py trước.

    python3 tools/sheet.py <id>                         cả video → out/sheet.png (24 khung)
    python3 tools/sheet.py <id> --scene S03,S07         từng cảnh → out/scenes/S03.png … (6 khung, rộng 960)
    python3 tools/sheet.py <id> --from 40 --to 60       một đoạn → out/sheet_40-60.png
    python3 tools/sheet.py <id> --model M109            mô hình 4 góc (video/local/models) → out/models/M109.png
    tuỳ chọn: --n 6  --cols 3  --width 960

Mốc giây của từng ô (trái→phải, trên→dưới) in ra stdout và ghi file .txt cạnh ảnh.
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from common import comp_id, need, opt, remotion, scenes


def shoot(pdir: Path, a: float, b: float, n: int, cols: int, width: int, out: Path, fps: int):
    f0, f1 = round(a * fps), max(round(a * fps), round(b * fps) - 1)
    step = max(1, (f1 - f0) // max(1, n - 1)) if n > 1 else f1 - f0 + 1
    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        r = remotion(['render', str(pdir / 'video/entry.tsx'), comp_id(pdir.name), str(td / 'f'), '--sequence', '--image-format=jpeg',
                      f'--frames={f0}-{f1}', f'--every-nth-frame={step}', '--props={"quality":"Full"}', '--muted', f'--public-dir={pdir / "public"}', '--log=error'],
                     capture_output=True, text=True)
        frames = sorted((td / 'f').glob('*.jpeg'))[:n]
        if r.returncode or not frames:
            print(r.stdout[-3000:], r.stderr[-3000:])
            sys.exit('render lỗi')
        for i, fr in enumerate(frames):
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(fr), '-vf', f'scale={width}:-1', str(td / f'l{i:03d}.jpg')], check=True)
        rows = (len(frames) + cols - 1) // cols
        out.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '1', '-i', str(td / 'l%03d.jpg'), '-vf',
                        f'tile={cols}x{rows}:padding=4', '-frames:v', '1', str(out)], check=True)
    secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(frames)))
    out.with_suffix('.txt').write_text(secs + '\n')
    print(out, '\n  mốc (giây):', secs)


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pdir = need(argv[0])
    if not (pdir / 'video/entry.tsx').exists():
        sys.exit('chưa build (python3 tools/build.py <id>)')
    if '--model' in argv:
        name = opt(argv, '--model')
        out = pdir / 'out/models' / f'{name}.png'
        with tempfile.TemporaryDirectory() as td:
            r = remotion(['render', str(pdir / 'video/entry.tsx'), comp_id(pdir.name) + '-models', str(Path(td) / 'f'), '--sequence', '--image-format=jpeg',
                          '--frames=0-3', f'--props={json.dumps({"name": name})}', '--muted', f'--public-dir={pdir / "public"}', '--log=error'], capture_output=True, text=True)
            frames = sorted((Path(td) / 'f').glob('*.jpeg'))
            if r.returncode or len(frames) < 4:
                print(r.stdout[-3000:], r.stderr[-3000:])
                sys.exit('render lỗi (đã khai video/local/models/index.ts và chạy build.py chưa?)')
            out.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', *sum([['-i', str(f)] for f in frames], []), '-filter_complex',
                            '[0][1]hstack[a];[2][3]hstack[b];[a][b]vstack,scale=1920:-1', str(out)], check=True)
        print(out, '\n  góc: 3/4 trước | ngang | 3/4 sau | chéo cao')
        return
    spec = scenes(pdir)
    fps = spec.get('fps', 30)
    if '--scene' in argv:
        want = opt(argv, '--scene').split(',')
        by = {s['id']: s for s in spec['scenes']}
        for sid in want:
            if sid not in by:
                sys.exit(f'không có cảnh {sid}')
            s = by[sid]
            pad = min(0.3, (s['to'] - s['from']) / 10)
            shoot(pdir, s['from'] + pad, s['to'] - pad, opt(argv, '--n', 6, int), opt(argv, '--cols', 3, int),
                  opt(argv, '--width', 960, int), pdir / 'out/scenes' / f'{sid}.png', fps)
        return
    a = opt(argv, '--from', 0.0, float)
    b = opt(argv, '--to', spec['scenes'][-1]['to'], float)
    name = 'sheet.png' if '--from' not in argv and '--to' not in argv else f'sheet_{a:g}-{b:g}.png'
    shoot(pdir, a, b, opt(argv, '--n', 24, int), opt(argv, '--cols', 6, int), opt(argv, '--width', 480, int), pdir / 'out' / name, fps)


if __name__ == '__main__':
    shutil.which('ffmpeg') or sys.exit('cần ffmpeg')
    main()
