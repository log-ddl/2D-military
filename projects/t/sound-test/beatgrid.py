"""Lưới nhịp cục bộ cho một bài nhạc: chu kỳ phách, phách đầu ô nhịp (downbeat), độ tin cậy.

    .venv/bin/python beatgrid.py <id> a-b [a-b ...]

Mỗi vùng [a,b] giây trong file: dò chu kỳ T (0.55–0.75 s) và pha bằng lược (comb) trên spectral flux,
tinh chỉnh bằng bình phương tối thiểu lên các đỉnh onset gần lưới, rồi chọn pha ô 4 phách có tiếng trầm (kick) mạnh nhất.
"""
import subprocess
import sys
from pathlib import Path

import numpy as np

SR = 22050
HOP = 256
FPS = SR / HOP
HERE = Path(__file__).resolve().parent


def load(fid):
    f = next(HERE.rglob(f'fs_{fid}_*'))
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


def onsets(x):
    n = 2048
    k = 1 + (len(x) - n) // HOP
    S = np.abs(np.fft.rfft(x[np.arange(n)[None, :] + HOP * np.arange(k)[:, None]] * np.hanning(n), axis=1))
    f = np.fft.rfftfreq(n, 1 / SR)
    d = np.maximum(0, np.diff(np.log1p(S), axis=0))
    full = np.r_[0, d.sum(1)]
    low = np.r_[0, d[:, f < 150].sum(1)]
    norm = lambda v: np.maximum(0, v - np.convolve(v, np.ones(64) / 64, 'same'))
    return norm(full), norm(low)


def grid(fl, low, a, b):
    i0, i1 = int(a * FPS), int(b * FPS)
    seg = fl[i0:i1]
    best = (0, 0, 0)
    for T in np.arange(0.55, 0.75, 0.0005):
        p = T * FPS
        for ph in np.arange(0, p, 0.5):
            idx = (ph + p * np.arange(int((len(seg) - ph) / p))).astype(int)
            s = seg[idx].sum() / len(idx)
            if s > best[0]:
                best = (s, T, ph)
    s, T, ph = best
    # tinh chỉnh: đỉnh onset trong ±60 ms quanh mỗi phách → fit t_i = t0 + i*T
    beats = a + ph / FPS + T * np.arange(int((b - a - ph / FPS) / T))
    w = int(0.06 * FPS)
    obs = []
    for i, t in enumerate(beats):
        j = int(t * FPS)
        win = fl[j - w:j + w + 1]
        if len(win) and win.max() > np.percentile(seg, 75):
            obs.append((i, (j - w + np.argmax(win)) / FPS))
    if len(obs) > 6:
        ii, tt = np.array(obs).T
        T, t0 = np.polyfit(ii, tt, 1)
        res = np.abs(tt - (t0 + ii * T))
        beats = t0 + T * np.arange(len(beats))
    else:
        res = np.array([np.nan])
    # downbeat: pha (0..3) có tổng kick lớn nhất
    kick = [sum(low[int(t * FPS) - 2:int(t * FPS) + 3].max() for t in beats[q::4] if int(t * FPS) > 2) for q in range(4)]
    q = int(np.argmax(kick))
    conf = kick[q] / (np.mean(kick) + 1e-9)
    hit = len(obs) / max(1, len(beats))
    return T, beats, beats[q::4], np.nanmedian(res) * 1000, conf, hit


def main():
    fid = sys.argv[1]
    x = load(fid)
    fl, low = onsets(x)
    for r in sys.argv[2:]:
        a, b = map(float, r.split('-'))
        T, beats, downs, res, conf, hit = grid(fl, low, a, b)
        print(f'[{a:.0f}–{b:.0f}s] {60 / T:6.2f} BPM  T={T:.4f}s  lệch trung vị {res:4.0f} ms  phách khớp onset {hit * 100:3.0f}%  '
              f'downbeat rõ x{conf:.2f}')
        print('   ô nhịp:', ' '.join(f'{t:.3f}' for t in downs))


if __name__ == '__main__':
    main()
