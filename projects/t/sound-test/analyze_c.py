"""Đo file cho bản C.  .venv/bin/python analyze_c.py <thư mục> [--music]

SFX: thời lượng, đỉnh, vùng hoạt động, các cụm tiếng (onset tách bởi khoảng lặng), % năng lượng dưới 120 Hz.
--music: thêm tempo (tự tương quan onset), giọng (Krumhansl), đường năng lượng mỗi 2 s.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 22050


def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


def frames(x, n=1024, hop=512):
    k = 1 + (len(x) - n) // hop
    idx = np.arange(n)[None, :] + hop * np.arange(k)[:, None]
    return x[idx] * np.hanning(n)


def tempo(x):
    S = np.abs(np.fft.rfft(frames(x), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1)
    flux -= flux.mean()
    ac = np.correlate(flux, flux, 'full')[len(flux) - 1:]
    fps = SR / 512
    lags = np.arange(len(ac)) / fps
    ok = (lags > 60 / 180) & (lags < 60 / 60)
    lag = lags[ok][np.argmax(ac[ok])]
    return 60 / lag


MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NAMES = 'C C# D D# E F F# G G# A A# B'.split()


def key(x):
    S = np.abs(np.fft.rfft(frames(x, 4096, 2048), axis=1)).mean(0)
    f = np.fft.rfftfreq(4096, 1 / SR)
    ok = (f > 55) & (f < 2000)
    pc = np.round(12 * np.log2(f[ok] / 440) + 9) % 12
    chroma = np.array([S[ok][pc == i].sum() for i in range(12)])
    best = max(((np.corrcoef(np.roll(prof, k), chroma)[0, 1], NAMES[k] + q) for prof, q in ((MAJ, ''), (MIN, 'm')) for k in range(12)))
    return best[1]


def main():
    d = Path(sys.argv[1])
    music = '--music' in sys.argv
    for p in sorted(d.glob('*.mp3')):
        x = decode(p)
        h = SR // 100
        k = len(x) // h
        r = np.sqrt(np.mean(x[:k * h].reshape(k, h) ** 2, axis=1))
        pk = int(np.argmax(r))
        on = r > r[pk] * 10 ** (-30 / 20)
        segs, i = [], 0
        while i < len(on):
            if on[i]:
                j = i
                while j < len(on) and (on[j] or on[j:j + 25].any()):
                    j += 1
                if j - i > 5:
                    segs.append(f'{i / 100:.2f}-{j / 100:.2f}')
                i = j
            i += 1
        X = np.abs(np.fft.rfft(x)) ** 2
        fr = np.fft.rfftfreq(len(x), 1 / SR)
        low = X[fr < 120].sum() / X.sum() * 100
        line = f'{p.name[:46]:46s} {len(x) / SR:6.1f}s pk@{pk / 100:6.2f} low{low:4.0f}%'
        if music:
            e = 20 * np.log10(np.sqrt(np.mean(x[:len(x) // (2 * SR) * 2 * SR].reshape(-1, 2 * SR) ** 2, axis=1)) + 1e-9)
            line += f' bpm {tempo(x):5.1f} key {key(x):3s}\n    dB/2s: ' + ' '.join(f'{v:.0f}' for v in e)
        else:
            line += f'  cụm: {" ".join(segs[:8])}{" …" if len(segs) > 8 else ""}'
        print(line)


if __name__ == '__main__':
    main()
