#!/usr/bin/env python3
"""SFX riêng cho outtro (động cơ, lắp ráp, vẫy, mất tín hiệu). tools/sound.py chỉ có tiếng bắn/nổ nên không dùng được.
Chạy: python3 projects/outtro/data/make_sfx.py  → assets/audio/sfx.wav (khai audioFile trong project.json).
Mốc phải khớp scenes/outro.ts: parts d, rise 2.3–3.0, drive 2.5–10, collapse 10–11.3."""
import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'tools'))
import sound as S  # noqa: E402

SR, DUR = S.SR, 12.0
buf = np.zeros(int(DUR * SR))
tt, lp, hp, bp, noise, sweep = S.tt, S.lp, S.hp, S.bp, S.noise, S.sweep


def clank(f, g=1.0, d=0.25):
    t = tt(d)
    body = (np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 18)
    tick = hp(noise(d), 2500) * np.exp(-t * 90) * 0.5
    return (body * 0.6 + tick) * g


def thud(d=0.3, g=1.0):
    t = tt(d)
    return sweep(120, 45, d, 0.5) * np.exp(-t * 14) * g


# bộ phận rơi vào: delay trong scenes/outro.ts + 0.55 s bay
land = [(0.15, 120, .9), (0.4, 900, .5), (0.5, 840, .5), (0.6, 960, .5), (0.7, 880, .5), (0.8, 930, .5), (0.9, 850, .5),
        (1.05, 260, .9), (1.4, 520, .8), (1.7, 330, .8), (1.9, 1200, .5), (2.0, 1500, .35)]
for d, f, g in land:
    t0 = d + 0.55 * 0.8
    S.place(buf, clank(f, g), t0)
    if f < 400:
        S.place(buf, thud(g=g), t0)
# lính trồi lên + vẫy: tiếng vải/gió nhẹ
S.place(buf, bp(noise(0.5), 400, 2200) * np.exp(-tt(0.5) * 5) * 0.35, 2.3)
for k in range(5):
    S.place(buf, bp(noise(0.22), 500, 1800) * np.hanning(int(0.22 * SR)) * 0.14, 3.0 + k * 0.72)
# động cơ: nổ máy 2.4, chạy đều đến 8.2, nhỏ dần khi xe ra khỏi khung
t = tt(DUR)
idle = lp(noise(DUR), 220) * 0.8 + np.sin(2 * np.pi * np.cumsum(46 + 5 * np.sin(2 * np.pi * 9 * t)) / SR) * 0.5
env = S.np.clip((t - 2.3) / 0.5, 0, 1) * (1 - np.clip((t - 8.2) / 2.0, 0, 1))
rattle = hp(noise(DUR), 3000) * (0.5 + 0.5 * np.sin(2 * np.pi * 13 * t)) ** 3 * 0.05
buf += (idle * 0.55 + rattle) * env
# xích rin rít nhẹ
buf += bp(noise(DUR), 1200, 4200) * env * 0.04 * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t))
# tắt tín hiệu: rơi tần + tick, rồi chấm
S.place(buf, sweep(900, 60, 1.0, 0.6) * np.exp(-tt(1.0) * 3.0) * 0.55, 10.0)
S.place(buf, bp(noise(1.5), 2000, 8000) * np.exp(-tt(1.5) * 3) * 0.12, 10.0)
S.place(buf, thud(0.5, 0.9), 10.7)
S.place(buf, np.sin(2 * np.pi * 1800 * tt(0.12)) * np.exp(-tt(0.12) * 40) * 0.3, 11.4)

S.write_track(ROOT / 'projects/outtro/assets/audio/sfx.wav', buf * 0.8, 'outtro sfx')
pj = ROOT / 'projects/outtro/project.json'
p = json.loads(pj.read_text())
p.pop('sfxFile', None); p.pop('sfxGain', None)
p.update({'audioFile': 'assets/audio/sfx.wav', 'hasAudio': True})  # render chỉ ghép khi có audioFile (không có voice)
pj.write_text(json.dumps(p, ensure_ascii=False, indent=2) + '\n')
