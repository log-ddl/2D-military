#!/usr/bin/env python3
"""Dựng âm thanh cho một dự án: projects/<id>/public/{voice.mp3, music.wav, sfx.wav}.

    .venv/bin/python tools/audio.py <id>

audio/sound.json  {"sfx": [...]}, mỗi tiếng một trong hai dạng:
    {"t": 3.70, "type": "cannon", "power": 0.8}                  tổng hợp (tools/sound.py)
    {"t": 3.70, "src": "sfx/cannon_01.wav", "vol": 0.9, "trim": [0, 1.5]}   file của bạn
audio/music.json  {"synth": {...} | null, "tracks": [...]}
    synth: mốc nhạc tổng hợp (tools/music.py: pad, root, hits, bass, hats, riser); null = không dùng.
    tracks: [{"src": "music/tense.mp3", "at": 0, "from": 0, "to": 210, "vol": 0.5, "fade": 1.5, "duck": 0.5}]
      at = giây bắt đầu trên video, from/to = đoạn cắt trong file, duck = hạ nhạc bao nhiêu khi có voice (0..1).
File "src" tìm ở projects/<id>/input/ trước, rồi library/. Cần numpy, ffmpeg.
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import numpy as np
except ImportError:
    sys.exit('Thiếu numpy. Chạy bằng .venv/bin/python')

sys.path.insert(0, str(Path(__file__).resolve().parent))
import sound as snd  # noqa: E402
from common import ROOT, find_media, load, need, probe  # noqa: E402

SR = snd.SR


def decode(path: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


def src_file(pdir: Path, rel: str) -> Path:
    f = find_media(pdir, rel)
    if not f:
        sys.exit(f'không thấy "{rel}" trong projects/{pdir.name}/input/ hay library/')
    return f


def voice_env(voice: np.ndarray, n: int) -> np.ndarray:
    """Đường bao voice 0..1 (mượt ~0.3 s) để hạ nhạc khi có lời."""
    hop = SR // 20
    k = len(voice) // hop
    rms = np.sqrt(np.mean(voice[:k * hop].reshape(k, hop) ** 2, axis=1))
    on = (rms > max(0.01, 0.15 * np.percentile(rms, 90))).astype(float)
    on = np.convolve(on, np.ones(7) / 7, mode='same')
    e = np.interp(np.arange(n) / SR, np.arange(k) * hop / SR, on)
    return np.clip(e, 0, 1)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pdir = need(sys.argv[1])
    pub = pdir / 'public'
    pub.mkdir(exist_ok=True)
    voice_f = pdir / 'input/voice.mp3'
    dur = probe(voice_f)
    n = int(SR * dur)
    shutil.copy2(voice_f, pub / 'voice.mp3')

    # Nhạc: tổng hợp (nếu có) + các track file
    mcfg = load(pdir / 'audio/music.json')
    music = np.zeros(n)
    if mcfg.get('synth'):
        with tempfile.TemporaryDirectory() as td:
            cj, wav = Path(td) / 'c.json', Path(td) / 'm.wav'
            cj.write_text(json.dumps(mcfg['synth']))
            subprocess.run([sys.executable, str(ROOT / 'tools/music.py'), str(wav), '--dur', f'{dur:.2f}', '--cues', str(cj)], check=True, capture_output=True)
            m = decode(wav)
            music[:min(n, len(m))] += m[:n]
    tracks = mcfg.get('tracks', [])
    venv = voice_env(decode(voice_f), n) if any(tr.get('duck') for tr in tracks) else None
    for tr in tracks:
        x = decode(src_file(pdir, tr['src']))
        a, b = int(tr.get('from', 0) * SR), int(tr['to'] * SR) if 'to' in tr else len(x)
        x = x[a:b].copy()
        fd = int(tr.get('fade', 1.0) * SR)
        if fd and len(x) > 2 * fd:
            ramp = np.linspace(0, 1, fd)
            x[:fd] *= ramp
            x[-fd:] *= ramp[::-1]
        x *= tr.get('vol', 0.5)
        i0 = int(tr.get('at', 0) * SR)
        seg = np.zeros(n)
        snd.place(seg, x, i0 / SR)
        if tr.get('duck') and venv is not None:
            seg *= 1 - tr['duck'] * venv
        music += seg
    snd.write_track(pub / 'music.wav', music, f"{'synth + ' if mcfg.get('synth') else ''}{len(tracks)} track")

    # SFX: tổng hợp hoặc file
    cues = load(pdir / 'audio/sound.json').get('sfx', [])
    buf = np.zeros(n)
    for c in sorted(cues, key=lambda c: c['t']):
        if 'src' in c:
            x = decode(src_file(pdir, c['src']))
            if 'trim' in c:
                x = x[int(c['trim'][0] * SR):int(c['trim'][1] * SR)]
            x = x * c.get('vol', 1.0)
            kind = c['src']
        else:
            fn = snd.SFX.get(c.get('type'))
            if not fn:
                sys.exit(f"loại SFX không có: {c.get('type')} (có: {', '.join(sorted(snd.SFX))})")
            x = fn(**{k: v for k, v in c.items() if k not in ('t', 'type')})
            kind = c['type']
        snd.place(buf, x, float(c['t']))
        print(f"    {c['t']:7.2f}s  {kind}")
    snd.write_track(pub / 'sfx.wav', buf, f'{len(cues)} tiếng')
    print(f'projects/{pdir.name}/public: voice.mp3, music.wav, sfx.wav ({dur:.2f}s)')


if __name__ == '__main__':
    main()
