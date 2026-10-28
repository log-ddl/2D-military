#!/usr/bin/env python3
"""Tạo khuôn một dự án video.

    python3 tools/init.py <id> voice/<file>.mp3 [--from 113.7 --to 152.1]

Tạo projects/<id>/ (input/, plan/, video/, audio/, public/, out/) và project.json. --from/--to cắt một đoạn voice (giây).
Không ghi đè file đã có, không đụng dự án khác.
"""
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from common import PROJECTS, ROOT, opt, probe, project

TEMPLATES = ROOT / '.agents/skills/code-video-director/templates'


def put(path: Path, text: str):
    if not path.exists():
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text)


def main():
    argv = sys.argv[1:]
    pos = [a for i, a in enumerate(argv) if not a.startswith('--') and (i == 0 or argv[i - 1] not in ('--from', '--to'))]
    if len(pos) < 2:
        sys.exit(__doc__)
    pid, src = pos[0], Path(pos[1]).expanduser()
    pdir = project(pid)
    if not src.exists():
        sys.exit(f'không thấy voice: {src}')
    a, b = opt(argv, '--from', None, float), opt(argv, '--to', None, float)

    for d in ('input/images', 'input/videos', 'input/sfx', 'input/music', 'plan', 'video/scenes', 'video/local', 'audio', 'public', 'out'):
        (pdir / d).mkdir(parents=True, exist_ok=True)
    voice = pdir / 'input/voice.mp3'
    if not voice.exists():
        if a is not None or b is not None:
            cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(a or 0), '-i', str(src)]
            if b is not None:
                cmd += ['-t', str(b - (a or 0))]
            subprocess.run(cmd + ['-af', 'afade=t=in:d=0.05', '-c:a', 'libmp3lame', '-q:a', '2', str(voice)], check=True)
        else:
            shutil.copy2(src, voice)
    dur = round(probe(voice), 2)

    put(pdir / 'project.json', json.dumps({'id': pid, 'voice': str(src.resolve().relative_to(ROOT) if src.resolve().is_relative_to(ROOT) else src),
                                          'from': a, 'to': b, 'duration': dur, 'fps': 30}, ensure_ascii=False, indent=2) + '\n')
    put(pdir / 'plan/SHOT_PLAN.md', (TEMPLATES / 'SHOT_PLAN.md').read_text().replace('<id>', pid))
    put(pdir / 'plan/scenes.json', json.dumps({'fps': 30, 'music': 0.4, 'sfx': 0.5,
                                               'scenes': [{'id': 'S01', 'from': 0, 'to': dur, 'kind': '2d', 'transition': 'fade', 'brief': ''}]}, indent=2) + '\n')
    put(pdir / 'video/cues.ts', f'// Mốc voice (giây) từ plan/voice_map.md. Một nguồn duy nhất cho cảnh và âm thanh.\nexport const CUE = {{\n  start: 0,\n  end: {dur},\n}} as const;\n')
    put(pdir / 'audio/sound.json', json.dumps({'sfx': []}, indent=2) + '\n')
    put(pdir / 'audio/music.json', json.dumps({'synth': {'pad': 2.0, 'root': 38, 'hits': [], 'bass': [[2.0, dur, 0.6]], 'hats': [dur, dur], 'riser': [dur - 0.1, dur]}, 'tracks': []}, indent=2) + '\n')
    put(pdir / 'tsconfig.json', json.dumps({'extends': '../../engine/tsconfig.base.json', 'include': ['video']}, indent=2) + '\n')

    # Code dự án import 'remotion', 'three'… từ node_modules của engine.
    nm = PROJECTS / 'node_modules'
    if not nm.exists():
        os.symlink('../engine/node_modules', nm)

    print(f'projects/{pid}/  (voice {dur}s)')
    print(f'Tiếp: .venv/bin/python tools/asr.py {pid}')


if __name__ == '__main__':
    main()
