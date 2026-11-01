"""Bản C: sound design nhiều lớp theo soundmap.json — chỉ dùng cho thử nghiệm dự án t.

    .venv/bin/python projects/t/sound-test/mix_c.py [soundmap_d.json]   (mặc định soundmap.json → bản C)

Ra out/: C-full.mp4, stem C-stem-{nhac,nen,sfx,voice}.m4a, C-spectrum.png, và bảng tự kiểm in ra màn hình.
Chỉ cần numpy + ffmpeg.
"""
import json
import subprocess
from pathlib import Path

import numpy as np

SR = 44100
HERE = Path(__file__).resolve().parent
P = HERE.parent
OUT = HERE / 'out'
DUR = 70.1
N = int(SR * DUR)
VIDEO = P / 'out/video.mp4'  # chỉ lấy hình
import sys  # noqa: E402
MAP = json.loads((HERE / (sys.argv[1] if len(sys.argv) > 1 else 'soundmap.json')).read_text())
TAG = MAP.get('tag', 'C')


# ---------------------------------------------------------------- đọc file
def find(fid):
    for d in ('c', 'sfx', 'music'):
        hit = sorted((HERE / d).rglob(f'fs_{fid}_*'))
        if hit:
            return hit[0]
    raise SystemExit(f'không thấy file fs_{fid}')


_cache = {}


def decode(fid, ch=1):
    key = (fid, ch)
    if key not in _cache:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(find(fid)), '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
        x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
        _cache[key] = x.reshape(-1, ch).T if ch > 1 else x
    return _cache[key]


# ---------------------------------------------------------------- xử lý cơ bản
def rms10(x):
    h = SR // 100
    k = max(1, len(x) // h)
    return np.sqrt(np.mean(x[:k * h].reshape(k, h) ** 2, axis=1))


def fade(x, fi=0.0, fo=0.0):
    x = x.copy()
    n = x.shape[-1]
    a, b = min(int(fi * SR), n), min(int(fo * SR), n)
    if a:
        x[..., :a] *= np.linspace(0, 1, a) ** 2
    if b:
        x[..., n - b:] *= np.linspace(1, 0, b) ** 2
    return x


def spectral(x, fn):
    """Lọc pha tuyến tính bằng FFT, fn(f) → hệ số."""
    n = x.shape[-1]
    X = np.fft.rfft(x, axis=-1)
    return np.fft.irfft(X * fn(np.fft.rfftfreq(n, 1 / SR)), n, axis=-1)


def hp(f, fc, o=2):
    return (f / fc) ** o / np.sqrt(1 + (f / fc) ** (2 * o))


def lp(f, fc, o=2):
    return 1 / np.sqrt(1 + (f / fc) ** (2 * o))


def loop(x, length):
    xf = int(0.3 * SR)
    y = x.copy()
    while len(y) < length:
        r = np.linspace(0, 1, xf)
        y = np.concatenate([y[:-xf], y[-xf:] * (1 - r) + x[:xf] * r, x[xf:]])
    return y[:length]


def pitch(x, st):
    """Đổi cao độ bằng resample (cả tốc độ, như băng). st: số bán cung hoặc [đầu, cuối] để trượt (doppler)."""
    a, b = (st, st) if np.isscalar(st) else st
    if a == 0 and b == 0:
        return x
    # rate theo vị trí đầu ra xấp xỉ bằng vị trí nguồn
    r = 2 ** (np.linspace(a, b, len(x)) / 12)
    pos = np.cumsum(r)
    pos = pos[pos < len(x) - 1]
    return np.interp(pos, np.arange(len(x)), x)


def pan2(x, p):
    """Constant-power pan; p số hoặc [đầu, cuối]."""
    a, b = (p, p) if np.isscalar(p) else p
    th = (np.linspace(a, b, len(x)) + 1) * np.pi / 4
    return np.vstack([x * np.cos(th), x * np.sin(th)]) * np.sqrt(2)


def place(buf, x, t0):
    i = int(round(t0 * SR))
    if i < 0:
        x, i = x[..., -i:], 0
    m = min(x.shape[-1], buf.shape[-1] - i)
    if m > 0:
        buf[..., i:i + m] += x[..., :m]


def env_db(points, n=N):
    t, d = np.array(points, dtype=float).T
    return 10 ** (np.interp(np.arange(n) / SR, t, d) / 20)


# ---------------------------------------------------------------- vang (IR tổng hợp, stereo khử tương quan)
def make_ir(kind):
    rng = np.random.default_rng(11 if kind == 'out' else 12)
    rt, length = (1.8, 2.2) if kind == 'out' else (0.55, 0.8)
    n = int(length * SR)
    t = np.arange(n) / SR
    decay = 10 ** (-3 * t / rt)
    ir = rng.standard_normal((2, n)) * decay
    if kind == 'out':
        # phản xạ sườn đồi xa: vài tap thưa, đuôi tối
        for d, g in ((0.11, 0.5), (0.19, 0.35), (0.31, 0.25)):
            ir[0, int(d * SR)] += g
            ir[1, int((d + 0.013) * SR)] += g
        ir = spectral(ir, lambda f: lp(f, 2500) * hp(f, 120))
    else:
        ir = spectral(ir, lambda f: lp(f, 6000) * hp(f, 200))
    ir[:, :int(0.004 * SR)] = 0
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def convolve(x, ir):
    n = x.shape[-1] + ir.shape[-1]
    m = 1 << (n - 1).bit_length()
    y = np.fft.irfft(np.fft.rfft(x, m, axis=-1) * np.fft.rfft(ir, m, axis=-1), m, axis=-1)
    return y[:, :x.shape[-1]]


def stage_at(t):
    return next((k for a, b, k in MAP['stages'] if a <= t < b), 'out')


# ---------------------------------------------------------------- SFX
VERB = {'out': 0.09, 'lab': 0.11}


def layer(L):
    x = decode(L['id'])
    if 'trim' in L:
        x = x[int(L['trim'][0] * SR):int(L['trim'][1] * SR)]
    if 'loop_to' in L:
        x = loop(x, int(L['loop_to'] * SR))
    if 'pitch' in L:
        x = pitch(x, L['pitch'])
    x = fade(x, L.get('fi', 0.0), L.get('fo', 0.12))
    if 'hp' in L:
        x = spectral(x, lambda f: hp(f, L['hp'], 2))
    if L.get('norm') == 'rms':
        x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 10 ** (-26 / 20)
    else:
        x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-3 / 20)
    return x * L.get('gain', 1.0)


def build_sfx(venv):
    """Tiếng ngắn (hit) giữ nguyên lực + vang theo cảnh; lớp chạy dài (norm=rms: xích, drone, lửa) vào bus nền
    riêng, không vang, khoét dải giọng như nhạc — chúng là thứ lấp lời nhiều nhất."""
    dry = np.zeros((2, N))
    bed = np.zeros((2, N))
    send = {'out': np.zeros((2, N)), 'lab': np.zeros((2, N))}
    report = []
    for ev in MAP['events']:
        for L in ev['layers']:
            x = layer(L)
            al = L.get('align', 'peak')
            lead = int(np.argmax(rms10(x))) / 100 if al == 'peak' else (len(x) / SR if al == 'end' else 0.0)
            t0 = ev['at'] + L.get('off', 0.0) - lead
            st = pan2(x, L.get('pan', 0.0))
            if L.get('norm') == 'rms':
                place(bed, st, t0)
                continue
            place(dry, st, t0)
            k = stage_at(ev['at'])
            place(send[k], st * L.get('verb', VERB[k]), t0)
        report.append(ev)
    wet = sum(convolve(send[k], make_ir(k)) for k in send)
    wet = carve(wet, venv, mid_db=12, wide_db=0)
    # nền chạy dài không được giữ sub: trầm dành cho cú nổ, nếu không cả phim đục và nổ mất tương phản
    bed = spectral(carve(bed, venv, mid_db=9, wide_db=2) * 0.6, lambda f: hp(f, 90, 2))
    if MAP.get('word_dodge'):
        # bản F: khoét dải giọng theo TỪNG TỪ (sắc, 30 ms) thay vì đường bao mượt — cú nổ chỉ nhường đúng lúc có chữ
        dry = carve(dry, word_env(), mid_db=5, wide_db=0)
    else:
        dry = carve(dry, venv, mid_db=4, wide_db=0)   # khoét nhẹ dải giọng, tiếng trầm của nổ giữ nguyên lực
    out = spectral(dry + bed, lambda f: hp(f, MAP.get('sfx_hp', 28), 4))   # F: 45 Hz — sub sâu ăn headroom, loa nhỏ không phát
    if MAP.get('phone_sat'):
        out = out + phone_harmonics(dry)
    return out + wet, report


# ---------------------------------------------------------------- bản F
def voice_fx(path):
    """Giọng đọc: bớt đục 250 Hz (đo: 57% năng lượng dồn ở đây), nâng dải rõ chữ 3 kHz, thêm 'không khí' 9 kHz,
    giảm xì nhẹ, nén nhẹ (giọng TTS đã đều, LRA 1.5). Giữ nguyên RMS để mọi mức trộn khác không đổi."""
    chain = ('highpass=f=80,equalizer=f=250:t=q:w=1.0:g=-3.5,equalizer=f=500:t=q:w=1.2:g=-1,'
             'equalizer=f=3200:t=q:w=1.0:g=3,highshelf=f=9000:g=1.5,deesser=i=0.35:m=0.5:f=0.5,'
             'acompressor=threshold=-24dB:ratio=2.5:attack=8:release=120:knee=3')
    run = lambda af: np.frombuffer(subprocess.run(
        ['ffmpeg', '-v', 'error', '-i', str(path), *(['-af', af] if af else []), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
        capture_output=True, check=True).stdout, dtype='<f4').astype(np.float64)
    raw, y = run(''), run(chain)
    return y * np.sqrt(np.mean(raw ** 2)) / (np.sqrt(np.mean(y ** 2)) + 1e-12)


def words():
    t = json.loads((P / 'plan/transcript.json').read_text())
    return [(w['s'], w['e']) for s in t['segments'] for w in s['words']]


def word_env():
    """1 trong lúc đang phát âm một từ (±20 ms), mượt 30 ms."""
    e = np.zeros(N)
    for s, en in words():
        e[int(max(0, s - 0.02) * SR):int((en + 0.02) * SR)] = 1
    k = int(0.03 * SR)
    return np.convolve(e, np.ones(k) / k, mode='same')


def dodge_words():
    """Cú nổ lớn (có duck) rơi giữa một từ → dời vào khe giữa hai từ nếu khe nằm trong [-40, +100] ms
    (tiếng trễ hình ≤100 ms mắt không bắt được; sớm hơn hình thì lộ nên chỉ cho 40 ms)."""
    ws = words()
    gaps = [(a[1], b[0]) for a, b in zip(ws, ws[1:]) if b[0] - a[1] >= 0.05]
    log = []
    for ev in MAP['events']:
        if not ev.get('duck'):
            continue
        at = ev['at']
        inside = any(s < at < e for s, e in ws)
        if not inside:
            log.append(f'  {at:6.2f}s đã nằm ở khe        {ev["name"]}')
            continue
        cand = [g0 + 0.01 for g0, g1 in gaps if -0.04 <= g0 + 0.01 - at <= 0.10]
        if cand:
            new = min(cand, key=lambda c: abs(c - at))
            log.append(f'  {at:6.2f}s → {new:6.2f}s ({(new - at) * 1000:+4.0f} ms) vào khe  {ev["name"]}')
            ev['at'] = round(new, 3)
        else:
            log.append(f'  {at:6.2f}s giữ nguyên (không có khe gần) — khoét dải giọng theo từ  {ev["name"]}')
    return log


def phone_harmonics(x):
    """Loa điện thoại gần như không phát dưới ~150 Hz → tạo hài của dải trầm (méo bão hoà) ở 300–1500 Hz — dải loa điện thoại thật sự phát
    để tai 'nghe ra' lực cú nổ; mức hài thấp hơn dải trầm gốc 6 dB nên tai nghe / loa lớn gần như không đổi."""
    low = spectral(x, lambda f: lp(f, 150, 4))
    pk = np.max(np.abs(low)) + 1e-9
    h = np.tanh(4 * low / pk) * pk
    h = spectral(h, lambda f: hp(f, 300, 2) * lp(f, 1500, 2))
    return h * np.sqrt(np.mean(low ** 2)) / (np.sqrt(np.mean(h ** 2)) + 1e-12) * 10 ** (-6 / 20)


def beat_snap(music):
    """Tiếng nhỏ có 'snap' (HUD, whoosh) dời ±80 ms về onset nhạc mạnh gần nhất — hình, tiếng, nhạc khít nhau."""
    m = music.mean(0)
    n, hop = 2048, 512
    k = 1 + (len(m) - n) // hop
    S = np.abs(np.fft.rfft(m[np.arange(n)[None, :] + hop * np.arange(k)[:, None]] * np.hanning(n), axis=1))
    fl = np.r_[0, np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1)]
    fl = np.maximum(0, fl - np.convolve(fl, np.ones(43) / 43, 'same'))
    thr = np.percentile(fl[fl > 0], 85)
    peaks = [i * hop / SR for i in range(1, len(fl) - 1) if fl[i] > thr and fl[i] >= fl[i - 1] and fl[i] >= fl[i + 1]]
    log = []
    for ev in MAP['events']:
        if not ev.get('snap'):
            continue
        near = [p for p in peaks if abs(p - ev['at']) <= 0.08]
        if near:
            new = min(near, key=lambda p: abs(p - ev['at']))
            log.append(f'  {ev["at"]:6.2f}s → {new:6.2f}s ({(new - ev["at"]) * 1000:+4.0f} ms)  {ev["name"]}')
            ev['at'] = round(new, 3)
        else:
            log.append(f'  {ev["at"]:6.2f}s không có phách trong ±80 ms  {ev["name"]}')
    return log


def duck_env():
    """Hạ nhạc / nền quanh các tiếng lớn (sidechain): vào 30 ms trước mốc, giữ 0.25 s, nhả 0.9 s."""
    d = np.zeros(N)
    t = np.arange(N) / SR
    for ev in MAP['events']:
        if ev.get('duck'):
            a = ev['at']
            shape = np.clip((t - (a - 0.03)) / 0.03, 0, 1) * np.clip(1 - (t - (a + 0.25)) / 0.9, 0, 1)
            d = np.maximum(d, shape * ev['duck'])
    return 10 ** (-d / 20)


# ---------------------------------------------------------------- nhạc + nền
def onset_snap(x, src):
    """Tìm onset mạnh nhất trong [src, src+0.6] (spectral flux) để cú hit đầu đoạn rơi đúng nhịp."""
    a, b = int(src * SR), int((src + 0.6) * SR)
    seg = x[:, a:b].mean(0)
    n, hop = 1024, 256
    k = 1 + (len(seg) - n) // hop
    S = np.abs(np.fft.rfft(seg[np.arange(n)[None, :] + hop * np.arange(k)[:, None]] * np.hanning(n), axis=1))
    flux = np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1)
    return src + (int(np.argmax(flux)) + 1) * hop / SR


def build_bed(items, target_db, ch=2):
    buf = np.zeros((2, N))
    for m in items:
        x = decode(m['id'], ch)
        src = m['src']
        if m.get('snap'):
            src = onset_snap(x, src) - 0.1   # 0.1 s trước cú hit, mốc 'at' đặt sẵn sớm 0.1 s
        span = int((m['to'] - m['at']) * SR)
        y = x[:, int(src * SR):int(src * SR) + span]
        if y.shape[-1] < span:
            y = np.pad(y, ((0, 0), (0, span - y.shape[-1])))
        r = np.sqrt(np.mean(y ** 2)) + 1e-9
        y = y / r * 10 ** (target_db / 20) * m.get('gain', 1.0)
        if 'hp' in m or 'lp' in m:
            y = spectral(y, lambda f: (hp(f, m['hp']) if 'hp' in m else 1) * (lp(f, m['lp']) if 'lp' in m else 1))
        place(buf, fade(y, m.get('fi', 0.5), m.get('fo', 0.5)), m['at'])
    return buf


def voice_env(v):
    r = rms10(v)
    on = (r > max(1e-3, 0.12 * np.percentile(r, 90))).astype(float)
    on = np.convolve(on, np.ones(30) / 30, mode='same')
    return np.clip(np.interp(np.arange(N) / SR, np.arange(len(r)) / 100, on), 0, 1)


def carve(x, venv, mid_db=10.0, wide_db=2.5):
    """Khoét dải giọng nói (250 Hz–4 kHz) khi có lời, phần còn lại chỉ hạ nhẹ — nhạc vẫn dày mà lời rõ."""
    band = lambda f: hp(f, 250, 2) * lp(f, 4000, 2)
    mid = spectral(x, band)
    rest = x - mid
    return rest * 10 ** (-wide_db * venv / 20) + mid * 10 ** (-(mid_db + wide_db) * venv / 20)


# ---------------------------------------------------------------- master + kiểm
def ff_raw(x):
    return ['-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-'], np.ascontiguousarray(x.T).astype('<f4').tobytes()


def lufs(x, extra=''):
    args, data = ff_raw(x)
    log = subprocess.run(['ffmpeg', '-nostats', *args, '-af', f'{extra}ebur128', '-f', 'null', '-'],
                         input=data, capture_output=True).stderr.decode()
    return float(log.rsplit('I:', 1)[1].split('LUFS')[0])


GLUE = 'highpass=f=25,acompressor=threshold=-20dB:ratio=2:attack=15:release=250:knee=4,'


def master(mix, name):
    OUT.mkdir(exist_ok=True)
    g = -14 - lufs(mix, GLUE)
    args, data = ff_raw(mix)
    wav = OUT / f'{name}.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', *args, '-af',
                    f'{GLUE}volume={g:.2f}dB,alimiter=limit=0.84:attack=1:release=80:level=false', str(wav)],
                   input=data, check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(VIDEO), '-i', str(wav), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', str(OUT / f'{name}.mp4')], check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(wav), '-lavfi',
                    'showspectrumpic=s=1600x500:legend=1:fscale=log:color=intensity', str(OUT / f'{name}-spectrum.png')], check=True)
    wav.unlink()
    return g


def stem(x, name, g):
    args, data = ff_raw(x * 10 ** (g / 20))
    subprocess.run(['ffmpeg', '-y', '-v', 'error', *args, '-c:a', 'aac', '-b:a', '192k', str(OUT / f'{TAG}-stem-{name}.m4a')],
                   input=data, check=True)


PHONE = 'pan=mono|c0=0.5*c0+0.5*c1,highpass=f=280:poles=2,highpass=f=280:poles=2,lowpass=f=9000,equalizer=f=1500:t=q:w=1:g=3'


def phone(src, name):
    """Mô phỏng loa điện thoại (mono, gần như mất dưới ~280 Hz) để tự nghe / đo cú nổ còn lực không."""
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(src), '-vn', '-af', PHONE, '-c:a', 'aac', '-b:a', '128k',
                    str(OUT / f'{name}.m4a')], check=True)


def check(v, music, amb, sfx, report):
    db = lambda x: 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    venv = voice_env(v) > 0.5
    band = lambda x: spectral(x, lambda f: hp(f, 1000, 2) * lp(f, 4000, 2))
    vb, bg = band(v), band((music + amb + sfx).mean(0))
    print('\nTự kiểm — lời so với mọi thứ khác ở dải 1–4 kHz (dải nghe rõ chữ), khung 100 ms lúc đang nói:')
    h = SR // 10
    k = N // h
    fr = lambda x: np.sqrt(np.mean(x[:k * h].reshape(k, h) ** 2, axis=1)) + 1e-12
    snr = 20 * np.log10(fr(vb) / fr(bg))
    on = venv[:k * h].reshape(k, h).mean(1) > 0.5
    cuts = [0, 4.22, 10.86, 16.36, 21.28, 28.26, 36.18, 45.1, 51.54, 56.32, 70.1]
    for i, (a, b) in enumerate(zip(cuts, cuts[1:])):
        m = on[int(a * 10):int(b * 10)]
        s = snr[int(a * 10):int(b * 10)][m]
        if len(s) < 5:
            continue
        bad = np.mean(s < 6) * 100
        print(f'  S{i + 1:02d} {a:5.2f}–{b:5.2f}s  trung vị {np.median(s):5.1f} dB, bị lấp (<6 dB) {bad:4.0f}% thời gian'
              f'{"  ⚠" if np.median(s) < 12 or bad > 15 else ""}')
    print(f'  nhạc lúc có lời {db(music[:, venv]):.1f} dBFS, lúc nghỉ {db(music[:, ~venv]):.1f};  nền {db(amb):.1f};  voice {db(v[venv]):.1f}')
    print('\nĐỉnh SFX so với mốc (sự kiện có duck):')
    sm = sfx.mean(0)
    r = rms10(sm)
    for ev in report:
        if ev.get('duck'):
            a = int((ev['at'] - 0.3) * 100)
            pk = (a + int(np.argmax(r[a:a + 60]))) / 100
            print(f'  {ev["at"]:6.2f}s → đỉnh {pk:6.2f}s ({(pk - ev["at"]) * 1000:+4.0f} ms)  {ev["name"]}')


def main():
    vraw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(P / 'assets/voice/voice.mp3'), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                          capture_output=True, check=True).stdout
    v = np.frombuffer(vraw, dtype='<f4').astype(np.float64)
    if MAP.get('voice_fx'):
        print('giọng đọc: EQ + de-ess + nén …')
        v = voice_fx(P / 'assets/voice/voice.mp3')
    v = np.pad(v[:N], (0, max(0, N - len(v))))
    v = spectral(v, lambda f: hp(f, 80, 2))
    venv = voice_env(v)

    print('nhạc …')
    music_raw = build_bed(MAP['music'], -22) * env_db(MAP['music_db'])
    if MAP.get('beat_snap'):
        print('nắn tiếng nhỏ vào phách nhạc:', *beat_snap(music_raw), sep='\n')
    if MAP.get('word_dodge'):
        print('cú nổ né lời:', *dodge_words(), sep='\n')
    duck = duck_env()

    print('SFX …')
    sfx, report = build_sfx(venv)
    music = music_raw
    music = spectral(music, lambda f: hp(f, 35, 2) * (1 - 0.5 * lp(f, 120, 2)))   # shelf -6 dB dưới 120 Hz
    music = carve(music, venv) * duck
    print('nền …')
    amb = build_bed(MAP['amb'], -36) * np.sqrt(duck)
    amb = carve(amb, venv, mid_db=4, wide_db=1)

    vp = np.max(np.abs(v))
    sfx *= MAP.get('sfx_gain', 1.1) * vp
    vs = np.vstack([v, v])
    mix = vs + music + amb + sfx
    print('master …')
    g = master(mix, f'{TAG}-full')
    for x, name in ((music, 'nhac'), (amb, 'nen'), (sfx, 'sfx'), (vs, 'voice')):
        stem(x, name, g)
    phone(OUT / f'{TAG}-full.mp4', f'{TAG}-phone')
    check(v, music, amb, sfx, report)
    print('\n', *sorted(p.name for p in OUT.glob(f'{TAG}-*')), sep='\n  ')


if __name__ == '__main__':
    main()
