#!/usr/bin/env python3
"""Khởi tạo một project video theo chuẩn code-video-director.

    python3 tools/init_video.py <project_id> [đường_dẫn_voice.mp3] [--kit]

- Tạo khung projects/<id>/ nếu chưa có: project.json, timeline.json, scenes/shared, assets/audio,
  data, docs, out. Không ghi đè file đã có.
- Có voice: chép thành assets/audio/voice.mp3 và đặt duration theo voice.
- Chép kit/ vào scenes/shared/ (chỉ file chưa có). --kit ghi đè bằng bản kit mới nhất: CHỈ dùng cho project mới,
  project đang dựng dở sẽ vỡ nếu API kit đã đổi.
- Chép mẫu SHOT_PLAN.md vào docs/ và sound.json vào data/.
"""
import json
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKILL = ROOT / '.agents/skills/code-video-director'


def probe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True).stdout.strip()
    return round(float(out), 3) if out else 0.0


def put(src, dst, force=False):
    if dst.exists() and not force:
        return False
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return True


def main():
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    force_kit = '--kit' in sys.argv
    if not a:
        print(__doc__)
        sys.exit(1)
    pid = a[0]
    voice = Path(a[1]).expanduser() if len(a) > 1 else None
    p = ROOT / 'projects' / pid
    for d in ('scenes/shared', 'assets/audio', 'data', 'docs', 'out/stills', 'out/sheets'):
        (p / d).mkdir(parents=True, exist_ok=True)
    log = []

    if voice:
        if not voice.exists():
            sys.exit(f'không thấy voice: {voice}')
        if put(voice, p / 'assets/audio/voice.mp3', force=True):
            log.append('voice.mp3')
    dur = probe(p / 'assets/audio/voice.mp3') if (p / 'assets/audio/voice.mp3').exists() else 0.0

    pj = p / 'project.json'
    meta = json.loads(pj.read_text()) if pj.exists() else {
        'schemaVersion': 1, 'id': pid, 'name': pid, 'type': 'custom', 'bpm': 120,
        'createdAt': datetime.now().astimezone().isoformat(timespec='seconds')}
    if dur:
        meta.update({'duration': dur, 'hasAudio': True, 'audioFile': 'assets/audio/voice.mp3',
                     'voiceFile': 'assets/audio/voice.mp3'})
        if (p / 'assets/audio/sfx.wav').exists():
            meta.setdefault('sfxFile', 'assets/audio/sfx.wav')
            meta.setdefault('sfxGain', 0.5)
    else:
        meta.setdefault('duration', 10)
        meta.setdefault('hasAudio', False)
    pj.write_text(json.dumps(meta, ensure_ascii=False, indent=2) + '\n')
    log.append('project.json')

    tl = p / 'timeline.json'
    if not tl.exists():
        tl.write_text(json.dumps([{'id': 'sc01', 'scene': 'sc01', 'start': 0, 'end': meta['duration']}], indent=2) + '\n')
        log.append('timeline.json')
    sc = p / 'scenes/sc01.ts'
    if not sc.exists():
        sc.write_text("import { CanvasScene } from './shared/base';\nimport * as A from './shared/art';\n"
                      "import * as K from './shared/camera';\n\n"
                      "/** Scene tạm do init_video.py tạo. Thay theo SHOT_PLAN. API: kit/KIT.md */\n"
                      "export default class S extends CanvasScene {\n"
                      "  protected draw(c: CanvasRenderingContext2D, _t: number, _lt: number) {\n"
                      "    A.clear(c);\n    K.begin(c, { x: A.W / 2, y: A.H / 2, z: 1 });\n    K.end(c);\n  }\n}\n")
        log.append('scenes/sc01.ts')

    for f in sorted((ROOT / 'kit').glob('*.ts')):
        if put(f, p / 'scenes/shared' / f.name, force=force_kit):
            log.append(f'shared/{f.name}')
    for src, dst in (('templates/SHOT_PLAN.md', 'docs/SHOT_PLAN.md'),
                     ('templates/sound.json', 'data/sound.json')):
        if put(SKILL / src, p / dst):
            log.append(dst)

    print(f'projects/{pid}: ' + (', '.join(log) if log else 'đã đủ, không đổi gì'))
    print(f'duration = {meta["duration"]}s' + ('' if dur else '  (chưa có voice)'))
    print(f'Tiếp: python3 tools/asr.py {pid}')


if __name__ == '__main__':
    main()
