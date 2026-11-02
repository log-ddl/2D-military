#!/usr/bin/env python3
"""Đo file âm thanh để dựng: SFX (đỉnh, các cụm tiếng, % trầm) và nhạc (tempo, giọng, đường năng lượng, cú hit, lưới ô nhịp).
Chỉ cần numpy + ffmpeg. Vừa là module (sound_lib, audio dùng), vừa là lệnh:

    .venv/bin/python core/tools/sound_probe.py <file|fs:ID|mk:ID>              SFX
    .venv/bin/python core/tools/sound_probe.py <file|key> --music [--grid 80-120] [--profile 0-60]

Lưu ý thực tế: lưới nhịp tự dò có thể bám phách phụ (lệch tới nửa phách). Dựng nhạc thì căn theo CÚ HIT đo trực tiếp
(--music in ra), lưới chỉ dùng để chọn chỗ cắt trong đoạn đều.
"""
import subprocess
import sys
from pathlib import Path

try:
    import numpy as np
except ImportError:
    sys.exit('Thiếu numpy. Chạy bằng .venv/bin/python')

ROOT = Path(__file__).resolve().parents[2]
SR = 22050
HOP = 256


def decode(path, sr=SR, ch=1):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', str(ch), '-ar', str(sr), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    return x.reshape(-1, ch).T if ch > 1 else x


def rms_db(x, win):
    k = max(1, len(x) // win)
    return 20 * np.log10(np.sqrt(np.mean(x[:k * win].reshape(k, win) ** 2, axis=1)) + 1e-9)


def _frames(x, n, hop):
    k = 1 + (len(x) - n) // hop
    return x[np.arange(n)[None, :] + hop * np.arange(k)[:, None]] * np.hanning(n)


# ---------------------------------------------------------------- SFX
def analyze_sfx(x, sr=SR):
    """dur, peak (giây đỉnh RMS 10 ms), segs (cụm tiếng > đỉnh-30 dB, nối khe < 0.25 s), low (% năng lượng < 120 Hz)."""
    h = sr // 100
    r = rms_db(x, h)
    pk = int(np.argmax(r))
    on = r > r[pk] - 30
    segs, i = [], 0
    while i < len(on):
        if on[i]:
            j = i
            while j < len(on) and on[j:j + 25].any():
                j += 1
            if j - i > 5:
                segs.append([round(i / 100, 2), round(j / 100, 2)])
            i = j
        i += 1
    X = np.abs(np.fft.rfft(x)) ** 2
    f = np.fft.rfftfreq(len(x), 1 / sr)
    return {'dur': round(len(x) / sr, 2), 'peak': round(pk / 100, 2), 'segs': segs[:12],
            'low': round(float(X[f < 120].sum() / (X.sum() + 1e-12) * 100)), 'max_db': round(float(20 * np.log10(np.max(np.abs(x)) + 1e-9)), 1)}


# ---------------------------------------------------------------- nhạc
MAJ = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MIN = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
NAMES = 'C C# D D# E F F# G G# A A# B'.split()


def key_of(x, sr=SR):
    """Giọng (Krumhansl) — gần đúng; đủ để biết hai bài có họ hàng (cùng giọng / song song / cách quãng 5) hay không."""
    S = np.abs(np.fft.rfft(_frames(x, 4096, 2048), axis=1)).mean(0)
    f = np.fft.rfftfreq(4096, 1 / sr)
    ok = (f > 55) & (f < 2000)
    pc = np.round(12 * np.log2(f[ok] / 440) + 9) % 12
    chroma = np.array([S[ok][pc == i].sum() for i in range(12)])
    return max((np.corrcoef(np.roll(p, k), chroma)[0, 1], NAMES[k] + q) for p, q in ((MAJ, ''), (MIN, 'm')) for k in range(12))[1]


def onsets(x, sr=SR):
    S = np.abs(np.fft.rfft(_frames(x, 2048, HOP), axis=1))
    f = np.fft.rfftfreq(2048, 1 / sr)
    d = np.maximum(0, np.diff(np.log1p(S), axis=0))
    norm = lambda v: np.maximum(0, v - np.convolve(v, np.ones(64) / 64, 'same'))
    return norm(np.r_[0, d.sum(1)]), norm(np.r_[0, d[:, f < 150].sum(1)])


def tempo(fl, sr=SR):
    fps = sr / HOP
    v = fl - fl.mean()
    ac = np.correlate(v, v, 'full')[len(v) - 1:]
    lags = np.arange(len(ac)) / fps
    ok = (lags > 0.4) & (lags < 1.0)   # 60–150 BPM
    return 60 / lags[ok][np.argmax(ac[ok])]


def hits(x, sr=SR, rise=8.0, look=5, med=None):
    """Cú hit = mức RMS 40 ms nhảy ≥ rise dB trong look×40 ms và vượt trung vị bài. Trả [(giây, dB sau hit)]."""
    h = int(0.04 * sr)
    r = rms_db(x, h)
    med = np.median(r) if med is None else med
    out = []
    for i in range(look, len(r)):
        if r[i] - r[max(0, i - look):i].min() >= rise and r[i] > med and r[i] >= r[max(0, i - 2):i + 3].max():
            t = i * h / sr
            if not out or t - out[-1][0] > 1.0:
                out.append((round(t, 2), round(float(r[i]), 1)))
    return out


def grid(x, a, b, sr=SR):
    """Lưới phách cục bộ trong [a,b]: (T, phách, ô nhịp, lệch ms, độ tin downbeat)."""
    fl, low = onsets(x, sr)
    fps = sr / HOP
    seg = fl[int(a * fps):int(b * fps)]
    best = (0, 0, 0)
    for T in np.arange(0.4, 1.0, 0.0005):
        p = T * fps
        for ph in np.arange(0, p, 0.5):
            idx = (ph + p * np.arange(int((len(seg) - ph) / p))).astype(int)
            if len(idx):
                s = seg[idx].mean()
                if s > best[0]:
                    best = (s, T, ph)
    _, T, ph = best
    beats = a + ph / fps + T * np.arange(int((b - a - ph / fps) / T))
    w = int(0.06 * fps)
    obs = []
    for i, t in enumerate(beats):
        j = int(t * fps)
        win = fl[max(0, j - w):j + w + 1]
        if len(win) and win.max() > np.percentile(seg, 75):
            obs.append((i, (j - w + np.argmax(win)) / fps))
    res = float('nan')
    if len(obs) > 6:
        ii, tt = np.array(obs).T
        T, t0 = np.polyfit(ii, tt, 1)
        res = float(np.median(np.abs(tt - (t0 + ii * T)))) * 1000
        beats = t0 + T * np.arange(len(beats))
    kick = [sum(low[max(0, int(t * fps) - 2):int(t * fps) + 3].max() for t in beats[q::4] if int(t * fps) > 2) for q in range(4)]
    q = int(np.argmax(kick))
    return T, beats, beats[q::4], res, kick[q] / (np.mean(kick) + 1e-9)


def analyze_music(x, sr=SR):
    fl, _ = onsets(x, sr)
    e = rms_db(x, sr)
    hs = hits(x, sr)
    # cú kết: trong 25 s cuối, cú bật cuối cùng (≥ 6 dB trong 0.4 s) còn to ngang thân bài (đuôi tắt dần nhô lên không tính)
    tail = max(0, len(x) - 25 * sr)
    med = float(np.median(rms_db(x, int(0.04 * sr))))
    end = hits(x[tail:], sr, rise=6, look=10, med=med)
    return {'dur': round(len(x) / sr, 2), 'bpm': round(tempo(fl, sr), 1), 'key': key_of(x, sr),
            'hits': hs, 'end_hit': round(tail / sr + end[-1][0], 2) if end else (hs[-1][0] if hs else None),
            'energy': [round(float(v)) for v in e]}


# ---------------------------------------------------------------- lệnh
def resolve(arg):
    if ':' in arg and not Path(arg).exists():
        sys.path.insert(0, str(Path(__file__).parent))
        from sound_lib import find
        e = find(arg)
        if not e:
            sys.exit(f'{arg} chưa có trong library (tải bằng sound_lib.py get)')
        return ROOT / e['file']
    return Path(arg)


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    f = resolve(sys.argv[1])
    x = decode(f)
    if '--music' in sys.argv:
        m = analyze_music(x)
        print(f"{f.name}: {m['dur']} s · ~{m['bpm']} BPM · giọng {m['key']} · cú kết {m['end_hit']} s")
        print('cú hit (giây, dB):', ' '.join(f'{t}({d})' for t, d in m['hits']))
        a, b = 0, len(m['energy'])
        if '--profile' in sys.argv:
            a, b = map(int, sys.argv[sys.argv.index('--profile') + 1].split('-'))
        print('dB mỗi giây:', ' '.join(f'{i}:{v}' for i, v in enumerate(m['energy']) if a <= i < b))
        for i, arg in enumerate(sys.argv):
            if arg == '--grid':
                a, b = map(float, sys.argv[i + 1].split('-'))
                T, _, downs, res, conf = grid(x, a, b)
                print(f'lưới [{a:g}–{b:g}] {60 / T:.2f} BPM, lệch {res:.0f} ms, downbeat x{conf:.2f}:',
                      ' '.join(f'{t:.3f}' for t in downs))
    else:
        s = analyze_sfx(x)
        print(f"{f.name}: {s['dur']} s · đỉnh @{s['peak']} s · trầm {s['low']}% · cụm {s['segs']}")


if __name__ == '__main__':
    main()
