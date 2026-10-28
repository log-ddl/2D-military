#!/usr/bin/env python3
"""Ráp một dự án: sinh video/Video.tsx + video/entry.tsx từ plan/scenes.json, type-check riêng dự án,
chép media được dùng vào public/media/.

    python3 tools/build.py <id> [--strict]

- Cảnh chưa có file hoặc lỗi kiểu được thay bằng khung giữ chỗ (in tên cảnh + lỗi); các cảnh khác vẫn xem được.
  --strict: có cảnh lỗi thì thoát mã 1.
- Lỗi ở file ngoài scenes/ (cues.ts, local/…) làm hỏng mọi cảnh nên luôn báo lỗi và thoát.
- media('images/x.jpg') trong code: tìm ở input/ rồi library/, chép vào public/media/.
"""
import re
import shutil
import subprocess
import sys
import wave

from common import ENGINE, comp_id, find_media, need, scenes

TRANS = {
    'fade': ("fade()", "import { fade } from '@remotion/transitions/fade';"),
    'slide': ("slide({{ direction: '{d}' }})", "import { slide } from '@remotion/transitions/slide';"),
    'wipe': ("wipe({{ direction: '{d}' }})", "import { wipe } from '@remotion/transitions/wipe';"),
    'flip': ("flip({{ direction: '{d}' }})", "import { flip } from '@remotion/transitions/flip';"),
    'clockWipe': ("clockWipe({{ width: 1920, height: 1080 }})", "import { clockWipe } from '@remotion/transitions/clock-wipe';"),
}


def transition(s: str):
    """'fade' | 'slide:from-right' | 'wipe:from-left' | 'flip:from-top' | 'clockWipe'."""
    kind, _, d = (s or 'fade').partition(':')
    if kind not in TRANS:
        sys.exit(f'chuyển cảnh không hỗ trợ: {s} (có: {", ".join(TRANS)})')
    expr, imp = TRANS[kind]
    return expr.format(d=d or 'from-right'), imp


def write_video(pdir, spec, bad):
    sc = spec['scenes']
    imports, names, used = [], [], set()
    for s in sc:
        f = pdir / 'video/scenes' / f"{s['id']}.tsx"
        if f.exists() and s['id'] not in bad:
            imports.append(f"import {s['id']} from './scenes/{s['id']}';")
            names.append(s['id'])
        else:
            why = bad.get(s['id'], 'chưa dựng').replace("'", '’')[:120]
            names.append(f"placeholder('{s['id']}', '{why}')")
    trans = []
    for s in sc[1:]:
        expr, imp = transition(s.get('transition', 'fade'))
        trans.append(expr)
        used.add(imp)
    cuts = [s['from'] for s in sc] + [sc[-1]['to']]
    pid = pdir.name
    body = f"""// SINH TỰ ĐỘNG bởi tools/build.py từ plan/scenes.json — không sửa tay.
import type {{ VideoSpec }} from '@kit/timeline';
{"import { placeholder } from '@kit/timeline';" if len(imports) < len(sc) else ''}
{chr(10).join(sorted(used))}
{chr(10).join(imports)}

export const spec: VideoSpec = {{
  id: '{pid}',
  fps: {spec.get('fps', 30)},
  cuts: [{', '.join(f'{c:g}' for c in cuts)}],
  scenes: [{', '.join(names)}],
  transitions: [{', '.join(trans)}],
  music: {spec.get('music', 0.4)}, sfx: {spec.get('sfx', 0.5)},
}};
"""
    (pdir / 'video/Video.tsx').write_text(body)
    has_models = (pdir / 'video/local/models/index.ts').exists() or (pdir / 'video/local/models/index.tsx').exists()
    models = f"""
import {{ MODELS }} from './local/models';
import {{ Turntable }} from '@lib/3d/turntable';

const Models: React.FC<{{ name: string }}> = ({{ name }}) => <Turntable models={{MODELS}} name={{name}} />;
""" if has_models else ''
    models_comp = f"""
    <Composition id="{comp_id(pid)}-models" component={{Models}} durationInFrames={{4}} fps={{30}} width={{1920}} height={{1080}} defaultProps={{{{ name: Object.keys(MODELS)[0] ?? '' }}}} />""" if has_models else ''
    (pdir / 'video/entry.tsx').write_text(f"""// SINH TỰ ĐỘNG bởi tools/build.py — entry Remotion chỉ chứa dự án {pid}.
import React from 'react';
import {{ Composition, registerRoot }} from 'remotion';
import {{ VideoTimeline, durationOf }} from '@kit/timeline';
import {{ qualitySchema, qualityScale, type QualityName }} from '@kit/quality';
import {{ spec }} from './Video';
{models}
// Chất lượng / nhạc / sfx chọn ở bảng Props của Studio; render.py truyền Full và cờ --no-music / --no-sfx.
const Main: React.FC<{{ quality: QualityName; music: boolean; sfx: boolean }}> = ({{ quality, music, sfx }}) => (
  <VideoTimeline spec={{{{ ...spec, music: music ? spec.music : 0, sfx: sfx ? spec.sfx : 0 }}}} quality={{qualityScale(quality)}} />
);
registerRoot(() => (
  <>
    <Composition id="{comp_id(pid)}" component={{Main}} schema={{qualitySchema}} defaultProps={{{{ quality: '1/2' as const, music: true, sfx: true }}}} durationInFrames={{durationOf(spec)}} fps={{spec.fps ?? 30}} width={{1920}} height={{1080}} />{models_comp}
  </>
));
""")


def typecheck(pdir):
    r = subprocess.run([str(ENGINE / 'node_modules/.bin/tsc'), '-p', str(pdir / 'tsconfig.json')], capture_output=True, text=True)
    errs = [ln for ln in (r.stdout + r.stderr).splitlines() if 'error TS' in ln]
    return errs


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pdir = need(argv[0])
    spec = scenes(pdir)

    write_video(pdir, spec, {})
    errs = typecheck(pdir)
    bad, other = {}, []
    for e in errs:
        m = re.search(r'video/scenes/(S\d+)\.tsx', e)
        if m:
            bad.setdefault(m.group(1), e.split('error ')[-1])
        else:
            other.append(e)
    if other:
        print('\n'.join(other[:30]))
        sys.exit('LỖI ngoài scenes/ (cues.ts, local/…): sửa trước khi build')
    if bad:
        write_video(pdir, spec, bad)
        left = [e for e in typecheck(pdir) if 'video/scenes/' not in e]
        if left:
            print('\n'.join(left[:30]))
            sys.exit('LỖI sau khi thay khung giữ chỗ')

    # Âm thanh: voice luôn mới nhất; music/sfx im lặng tạm cho tới khi chạy tools/audio.py
    pubroot = pdir / 'public'
    pubroot.mkdir(exist_ok=True)
    v = pdir / 'input/voice.mp3'
    if not (pubroot / 'voice.mp3').exists() or (pubroot / 'voice.mp3').stat().st_mtime < v.stat().st_mtime:
        shutil.copy2(v, pubroot / 'voice.mp3')
    for name in ('music.wav', 'sfx.wav'):
        if not (pubroot / name).exists():
            with wave.open(str(pubroot / name), 'wb') as w:
                w.setnchannels(1); w.setsampwidth(2); w.setframerate(44100); w.writeframes(b'\0\0' * 44100)

    # media('…') được dùng → public/media/
    pub = pdir / 'public/media'
    refs = set()
    for f in (pdir / 'video').rglob('*.tsx'):
        refs |= set(re.findall(r"media\(\s*['\"]([^'\"]+)['\"]\s*\)", f.read_text()))
    missing = []
    for rel in sorted(refs):
        src = find_media(pdir, rel)
        if not src:
            missing.append(rel)
            continue
        dst = pub / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            shutil.copy2(src, dst)

    ok = [s['id'] for s in spec['scenes'] if (pdir / 'video/scenes' / f"{s['id']}.tsx").exists() and s['id'] not in bad]
    todo = [s['id'] for s in spec['scenes'] if not (pdir / 'video/scenes' / f"{s['id']}.tsx").exists()]
    print(f"{pdir.name}: {len(spec['scenes'])} cảnh — xong {len(ok)}, chưa dựng {len(todo)}, lỗi {len(bad)}, media {len(refs) - len(missing)}")
    for sid, why in bad.items():
        print(f'  LỖI {sid}: {why}')
        for e in errs:
            if f'scenes/{sid}.tsx' in e:
                print('     ', e.split('video/')[-1])
    for rel in missing:
        print(f'  THIẾU media: {rel} (không có trong input/ hay library/)')
    if (bad or missing) and '--strict' in argv:
        sys.exit(1)


if __name__ == '__main__':
    main()
