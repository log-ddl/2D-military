#!/usr/bin/env python3
"""Trộn âm thanh một dự án → .build/public/{voice.mp3, music.wav, sfx.wav, master.json} + .build/sound_report.txt.

    .venv/bin/python core/tools/audio.py <id>

plan/mix.json có "version": 2 → bộ trộn này (cách làm: skills/sound-design/SKILL.md). Không có → audio_legacy.py (dự án cũ).
Giọng đọc KHÔNG bị xử lý: voice.mp3 giữ nguyên bản; lời rõ là nhờ nhạc / SFX nhường chỗ.

plan/mix.json (v2)
  "stages": [[0, 21.3, "out"], [21.3, 36.2, "room"]]          không gian vang theo đoạn: out (ngoài trời) | room (phòng) | dry
  "music":  [{"key": "fs:507747", "in": 3.33, "from": 0, "to": 20.83, "gain": 0.9, "fadeIn": 0.02, "fadeOut": 0.12}]
              mỗi mảnh: lấy file từ giây "in", đặt vào video [from, to]. Nguồn: "key" (library) | "file" | "asset" | "synth" (nhạc tạm)
  "music_db": [[0, 0], [53.6, 0], [53.7, -60]]                 tự động mức nhạc (dB) theo giây video
  "amb":    [{"key": "fs:620099", "in": 10, "from": 0, "to": 21.6, "gain": 0.8, "hp": 120}]    tiếng nền môi trường
  "options": {"word_dodge": true, "beat_snap": true}           nổ nhường lời theo từng từ · tiếng có "snap" dời ±80 ms vào phách nhạc
  "trim":   {"music": 0, "sfx": 0}                             chỉnh tay cả bus (dB) — yêu cầu của người dùng đặt ở đây
  "source": "free" | "epidemic"                                nguồn người dùng chọn (mặc định epidemic); dùng file trái nguồn → ⚠ trong báo cáo
  music[].under_voice: ["es:<uuid>:drums", "es:<uuid>:bass", "es:<uuid>:instruments"]   lúc có lời dùng các stem này (bỏ giai điệu)
  "music_carve": 10                                            mức khoét dải giọng của nhạc (dB); có under_voice thì 6 là đủ
SFX: "sfx" trong plan/chapters/CNN.json và plan/sfx/*.json, mỗi sự kiện:
  {"at": 9.24, "name": "đạn nảy khỏi giáp", "duck": 6, "snap": false, "layers": [
      {"key": "fs:441373", "gain": 0.8, "pan": 0.15},                       align mặc định "peak": đỉnh tiếng rơi đúng at
      {"key": "fs:730959", "trim": [0.8, 2.6], "align": "end", "pan": [-0.8, 0.1], "hp": 80},
      {"key": "fs:329800", "norm": "rms", "loop_to": 10, "fi": 0.4, "fo": 1.2}]}   norm=rms: lớp nền chạy dài
  layer: trim [a,b] · align peak|start|end · off · gain · pan số hoặc [đầu,cuối] · pitch bán cung hoặc [đầu,cuối] · fi/fo · hp · verb · loop_to
  Dạng cũ {"at", "synth": "cannon"} / {"at", "asset": "a050"} vẫn đọc được (một lớp, đầu tiếng tại at).
render.py áp master.json (nén nhẹ + chuẩn -14 LUFS + limiter) sau khi cộng các track. Cần numpy, ffmpeg.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

try:
    import numpy as np
except ImportError:
    sys.exit('Thiếu numpy. Chạy bằng .venv/bin/python')

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import ROOT, assets, link_file, load, need, timeline  # noqa: E402

SR = 44100
GLUE = 'highpass=f=25,acompressor=threshold=-20dB:ratio=2:attack=15:release=250:knee=4'
LIMIT = 'alimiter=limit=0.84:attack=1:release=80:level=false'
PHONE = 'pan=mono|c0=0.5*c0+0.5*c1,highpass=f=280:poles=2,highpass=f=280:poles=2,lowpass=f=9000,equalizer=f=1500:t=q:w=1:g=3'
VERB = {'out': 0.09, 'room': 0.11, 'dry': 0.0}


# ---------------------------------------------------------------- nguồn
class Src:
    def __init__(self, pdir):
        self.pdir, self.reg, self.cache, self.used = pdir, assets(pdir), {}, {}
        sys.path.insert(0, str(Path(__file__).parent))
        import sound_lib
        self.lib = sound_lib

    def path(self, d):
        if 'key' in d:
            e = self.lib.find(d['key'])
            if not e or not (ROOT / e['file']).exists():
                sys.exit(f"{d['key']} chưa có trong library — tải: .venv/bin/python core/tools/sound_lib.py get {d['key']}")
            self.used[d['key']] = e
            return ROOT / e['file']
        if 'asset' in d:
            a = self.reg.get(d['asset'])
            f = self.pdir / 'assets' / a['file'] if a and a.get('file') else None
            if not f or not f.is_file():
                sys.exit(f"tài sản {d['asset']} chưa có file (assets/ASSETS.json)")
            return f
        if 'file' in d:
            for base in (self.pdir, ROOT):
                if (base / d['file']).is_file():
                    return base / d['file']
            sys.exit(f"không thấy file {d['file']}")
        sys.exit(f'nguồn âm thanh thiếu key/asset/file: {d}')

    def decode(self, d, ch=1):
        if 'synth' in d and isinstance(d['synth'], str):
            import synth_sfx
            fn = synth_sfx.SFX.get(d['synth'])
            if not fn:
                sys.exit(f"sfx tổng hợp không có: {d['synth']} (có: {', '.join(sorted(synth_sfx.SFX))})")
            layer_keys = ('at', 'synth', 'volume', 'gain', 'name', 'align', 'pan', 'off', 'trim', 'fi', 'fo', 'hp', 'verb', 'pitch', 'loop_to', 'norm')
            x = fn(**{k: v for k, v in d.items() if k not in layer_keys})
            return np.vstack([x] * ch) if ch > 1 else x
        f = self.path(d)
        key = (str(f), ch)
        if key not in self.cache:
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(f), '-ac', str(ch), '-ar', str(SR), '-f', 'f32le', '-'],
                                 capture_output=True, check=True).stdout
            x = np.frombuffer(raw, dtype='<f4').astype(np.float64)
            self.cache[key] = x.reshape(-1, ch).T if ch > 1 else x
        return self.cache[key]


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
    n = x.shape[-1]
    return np.fft.irfft(np.fft.rfft(x, axis=-1) * fn(np.fft.rfftfreq(n, 1 / SR)), n, axis=-1)


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
    a, b = (st, st) if np.isscalar(st) else st
    if a == 0 and b == 0:
        return x
    pos = np.cumsum(2 ** (np.linspace(a, b, len(x)) / 12))
    pos = pos[pos < len(x) - 1]
    return np.interp(pos, np.arange(len(x)), x)


def pan2(x, p):
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


def env_db(points, n):
    if not points:
        return np.ones(n)
    t, d = np.array(points, dtype=float).T
    return 10 ** (np.interp(np.arange(n) / SR, t, d) / 20)


def carve(x, env, mid_db=10.0, wide_db=2.5):
    """Khoét dải giọng nói (250 Hz–4 kHz) theo env 0..1, phần còn lại hạ nhẹ: nhạc / nổ vẫn dày mà lời rõ."""
    mid = spectral(x, lambda f: hp(f, 250, 2) * lp(f, 4000, 2))
    return (x - mid) * 10 ** (-wide_db * env / 20) + mid * 10 ** (-(mid_db + wide_db) * env / 20)


# ---------------------------------------------------------------- vang
def make_ir(kind):
    rng = np.random.default_rng(11 if kind == 'out' else 12)
    rt, length = (1.8, 2.2) if kind == 'out' else (0.55, 0.8)
    t = np.arange(int(length * SR)) / SR
    ir = rng.standard_normal((2, len(t))) * 10 ** (-3 * t / rt)
    if kind == 'out':
        for d, g in ((0.11, 0.5), (0.19, 0.35), (0.31, 0.25)):     # phản xạ địa hình xa
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
    return np.fft.irfft(np.fft.rfft(x, m, axis=-1) * np.fft.rfft(ir, m, axis=-1), m, axis=-1)[:, :x.shape[-1]]


# ---------------------------------------------------------------- giọng (chỉ đọc, không sửa)
def voice_env(v, n):
    r = rms10(v)
    on = (r > max(1e-3, 0.12 * np.percentile(r, 90))).astype(float)
    on = np.convolve(on, np.ones(30) / 30, mode='same')
    return np.clip(np.interp(np.arange(n) / SR, np.arange(len(r)) / 100, on), 0, 1)


def words(pdir):
    f = pdir / 'plan/transcript.json'
    if not f.exists():
        return []
    return [(w['s'], w['e']) for s in load(f).get('segments', []) for w in s.get('words', [])]


def word_env(ws, n):
    e = np.zeros(n)
    for s, en in ws:
        e[int(max(0, s - 0.02) * SR):int((en + 0.02) * SR)] = 1
    k = int(0.03 * SR)
    return np.convolve(e, np.ones(k) / k, mode='same')


# ---------------------------------------------------------------- sự kiện SFX
def normalize_events(raw):
    """Dạng cũ (synth / asset một tiếng) → sự kiện một lớp, đầu tiếng tại at như bộ trộn cũ."""
    out = []
    for e in raw:
        if 'layers' in e:
            out.append(json.loads(json.dumps(e)))
            continue
        layer = {k: v for k, v in e.items() if k not in ('at', 'volume')}
        layer.update(align='start', gain=e.get('volume', e.get('power', 1.0)))
        if 'trim' in e:
            layer['trim'] = e['trim']
        out.append({'at': e['at'], 'name': e.get('synth') or e.get('asset', 'sfx'), 'layers': [layer]})
    return sorted(out, key=lambda e: e['at'])


def dodge_words(events, ws):
    """Nổ lớn (có duck) rơi giữa một từ → dời vào khe giữa hai từ nếu khe trong [-40, +100] ms
    (tiếng trễ hình ≤100 ms mắt không bắt được; sớm hơn hình thì lộ nên chỉ cho 40 ms)."""
    gaps = [a[1] for a, b in zip(ws, ws[1:]) if b[0] - a[1] >= 0.05]
    log = []
    for ev in events:
        if not ev.get('duck') or not any(s < ev['at'] < e for s, e in ws):
            continue
        cand = [g + 0.01 for g in gaps if -0.04 <= g + 0.01 - ev['at'] <= 0.10]
        if cand:
            new = min(cand, key=lambda c: abs(c - ev['at']))
            log.append(f"  nổ né lời: {ev['at']:.2f} → {new:.2f} s  {ev.get('name', '')}")
            ev['at'] = round(new, 3)
    return log


def beat_snap(events, music):
    m = music.mean(0)
    n, hop = 2048, 512
    k = 1 + (len(m) - n) // hop
    if k < 3:
        return []
    S = np.abs(np.fft.rfft(m[np.arange(n)[None, :] + hop * np.arange(k)[:, None]] * np.hanning(n), axis=1))
    fl = np.r_[0, np.maximum(0, np.diff(np.log1p(S), axis=0)).sum(1)]
    fl = np.maximum(0, fl - np.convolve(fl, np.ones(43) / 43, 'same'))
    if not (fl > 0).any():
        return []
    thr = np.percentile(fl[fl > 0], 85)
    peaks = [i * hop / SR for i in range(1, len(fl) - 1) if fl[i] > thr and fl[i] >= fl[i - 1] and fl[i] >= fl[i + 1]]
    log = []
    for ev in events:
        if ev.get('snap'):
            near = [p for p in peaks if abs(p - ev['at']) <= 0.08]
            if near:
                new = min(near, key=lambda p: abs(p - ev['at']))
                log.append(f"  vào phách: {ev['at']:.2f} → {new:.2f} s  {ev.get('name', '')}")
                ev['at'] = round(new, 3)
    return log


def stage_at(stages, t):
    return next((k for a, b, k in stages if a <= t < b), stages[-1][2] if stages else 'out')


def build_sfx(src, events, stages, n, venv, wenv, sfx_hp):
    """Tiếng ngắn giữ lực + vang theo không gian; lớp chạy dài (norm=rms) vào bus nền riêng, không vang, khoét dải giọng."""
    dry, bed = np.zeros((2, n)), np.zeros((2, n))
    send = {k: np.zeros((2, n)) for k in VERB}
    for ev in events:
        for L in ev['layers']:
            x = src.decode(L)
            if 'trim' in L:
                x = x[int(L['trim'][0] * SR):int(L['trim'][1] * SR)]
            if 'loop_to' in L:
                x = loop(x, int(L['loop_to'] * SR))
            if 'pitch' in L:
                x = pitch(x, L['pitch'])
            if len(x) < 8:
                continue
            x = fade(x, L.get('fi', 0.0), L.get('fo', 0.12))
            if 'hp' in L:
                x = spectral(x, lambda f, c=L['hp']: hp(f, c, 2))
            if L.get('norm') == 'rms':
                x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 10 ** (-26 / 20)
            else:
                x = x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-3 / 20)
            x = x * L.get('gain', 1.0)
            al = L.get('align', 'peak')
            lead = int(np.argmax(rms10(x))) / 100 if al == 'peak' else (len(x) / SR if al == 'end' else 0.0)
            t0 = ev['at'] + L.get('off', 0.0) - lead
            st = pan2(x, L.get('pan', 0.0))
            if L.get('norm') == 'rms':
                place(bed, st, t0)
                continue
            place(dry, st, t0)
            k = stage_at(stages, ev['at'])
            place(send[k], st * L.get('verb', VERB[k]), t0)
    wet = sum(convolve(send[k], make_ir(k)) for k in ('out', 'room') if send[k].any())
    wet = carve(wet, venv, mid_db=12, wide_db=0) if np.ndim(wet) else np.zeros((2, n))
    bed = spectral(carve(bed, venv, mid_db=9, wide_db=2) * 0.6, lambda f: hp(f, 90, 2))
    dry = carve(dry, wenv, mid_db=5, wide_db=0) if wenv is not None else carve(dry, venv, mid_db=4, wide_db=0)
    return spectral(dry + bed, lambda f: hp(f, sfx_hp, 4)) + wet


def duck_env(events, n):
    """Hạ nhạc / nền quanh tiếng lớn (sidechain): vào 30 ms trước mốc, giữ 0.25 s, nhả 0.9 s."""
    d = np.zeros(n)
    t = np.arange(n) / SR
    for ev in events:
        if ev.get('duck'):
            a = ev['at']
            d = np.maximum(d, np.clip((t - (a - 0.03)) / 0.03, 0, 1) * np.clip(1 - (t - (a + 0.25)) / 0.9, 0, 1) * ev['duck'])
    return 10 ** (-d / 20)


def build_bed(src, items, target_db, n, pdir, dur, venv=None):
    """"under_voice": [khoá stem…] (vd trống + bass + instruments của cùng bài) → lúc có lời chuyển mượt sang các stem đó,
    tức bài bỏ giai điệu; khoảng nghỉ trả lại bài đầy đủ. Stem phải cùng độ dài / cùng mốc với file chính."""
    buf = np.zeros((2, n))
    for m in items:
        if isinstance(m.get('synth'), dict):     # nhạc tổng hợp tạm (đường lùi khi chưa có nhạc thật)
            with tempfile.TemporaryDirectory() as td:
                cj, wav = Path(td) / 'c.json', Path(td) / 'm.wav'
                cj.write_text(json.dumps(m['synth']))
                subprocess.run([sys.executable, str(Path(__file__).with_name('synth_music.py')), str(wav), '--dur', f'{dur:.2f}',
                                '--cues', str(cj)], check=True, capture_output=True)
                x = src.decode({'file': str(wav)}, 2)
            m = {'from': 0, 'to': dur, 'in': 0, **{k: v for k, v in m.items() if k != 'synth'}}
        else:
            x = src.decode(m, 2)
        a, b = m.get('from', 0.0), m.get('to', dur)
        span = int((b - a) * SR)
        i0 = int(m.get('in', 0.0) * SR)
        cut = lambda z: np.pad(z[:, i0:i0 + span], ((0, 0), (0, max(0, span - z[:, i0:i0 + span].shape[-1]))))
        y = cut(x)
        k = 10 ** (target_db / 20) * m.get('gain', m.get('volume', 1.0)) / (np.sqrt(np.mean(y ** 2)) + 1e-9)
        y = y * k
        if m.get('under_voice') and venv is not None:
            s = sum(cut(src.decode({'key': key} if ':' in key else {'file': key}, 2)) for key in m['under_voice']) * k
            e = venv[int(a * SR):int(a * SR) + span]
            e = np.convolve(np.pad(e, (0, span - len(e))), np.ones(int(0.4 * SR)) / int(0.4 * SR), mode='same')
            y = y * (1 - e) + s * e
        if 'hp' in m or 'lp' in m:
            y = spectral(y, lambda f: (hp(f, m['hp']) if 'hp' in m else 1) * (lp(f, m['lp']) if 'lp' in m else 1))
        place(buf, fade(y, m.get('fadeIn', 0.5), m.get('fadeOut', 0.5)), a)
    return buf


# ---------------------------------------------------------------- ghi + đo
def write_wav(path, x):
    """WAV float 32-bit stereo (cho phép > 0 dBFS trước master, không vỡ tiếng)."""
    path.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', str(path)],
                   input=np.ascontiguousarray(x.T).astype('<f4').tobytes(), check=True)


def ff_measure(x, af):
    log = subprocess.run(['ffmpeg', '-nostats', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', af, '-f', 'null', '-'],
                         input=np.ascontiguousarray(x.T).astype('<f4').tobytes(), capture_output=True).stderr.decode()
    return log


def lufs(x, pre=''):
    log = ff_measure(x, f'{pre}ebur128=peak=true')
    i = float(log.rsplit('I:', 1)[1].split('LUFS')[0])
    tp = float(log.rsplit('Peak:', 1)[1].split('dBFS')[0]) if 'Peak:' in log else 0.0
    return i, tp


def render_master(x, g):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af',
                          f'{GLUE},volume={g:.2f}dB,{LIMIT}', '-f', 'f32le', '-'],
                         input=np.ascontiguousarray(x.T).astype('<f4').tobytes(), capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64).reshape(-1, 2).T


def frame_db(x, h):
    k = len(x) // h
    return 20 * np.log10(np.sqrt(np.mean(x[:k * h].reshape(k, h) ** 2, axis=1)) + 1e-9)


def auto_protect_voice(v, music, amb, sfx, venv, scenes, logs):
    """Tự động khoét thêm dải 1–4 kHz của SFX ở đúng các khung lúc có lời nếu SFX lấn giọng đọc."""
    n = len(v)
    h = SR // 10
    k = n // h
    if k < 5:
        return sfx
    band = lambda x: spectral(x, lambda f: hp(f, 1000, 2) * lp(f, 4000, 2))
    vb = frame_db(band(v), h)
    bg = frame_db(band((music + amb + sfx).mean(0)), h)
    on = venv[:k * h].reshape(k, h).mean(1) > 0.5
    snr = vb - bg

    extra_frame_db = np.zeros(k)
    adjusted = []
    for s in scenes:
        a, b = max(0, int(s['from'] * 10)), min(k, int(s['to'] * 10))
        z = snr[a:b][on[a:b]]
        if len(z) >= 5:
            med = float(np.median(z))
            bad = float(np.mean(z < 6) * 100)
            if med < 12.6 or bad > 22.0:
                need_med = max(0.0, 13.4 - med)
                p22 = float(np.percentile(z, 22))
                need_bad = max(0.0, 7.0 - p22) if bad > 22.0 else 0.0
                cut_db = min(18.0, max(need_med, need_bad) + 1.2)
                extra_frame_db[a:b] = np.maximum(extra_frame_db[a:b], cut_db)
                adjusted.append(f"{s['id']}(-{cut_db:.1f}dB)")
    if not adjusted:
        return sfx
    t_frames = (np.arange(k) + 0.5) * 0.1
    curve_db = np.interp(np.arange(n) / SR, t_frames, extra_frame_db) * venv
    curve_db = np.convolve(curve_db, np.ones(int(0.08 * SR)) / int(0.08 * SR), mode='same')
    logs.append(f"  tự cân bằng SFX nhường lời (1–4 kHz): {', '.join(adjusted)}")
    return carve(sfx, curve_db, mid_db=1.0, wide_db=0.35)


def report(pdir, tl, v, music, amb, sfx, events, master, logs, used):
    n = len(v)
    lines = list(logs)
    band = lambda x: spectral(x, lambda f: hp(f, 1000, 2) * lp(f, 4000, 2))
    h = SR // 10
    vb, bg = frame_db(band(v), h), frame_db(band((music + amb + sfx).mean(0)), h)
    on = voice_env(v, n)[:len(vb) * h].reshape(len(vb), h).mean(1) > 0.5
    snr = vb - bg
    lines.append('\nLời so với mọi thứ khác ở dải 1–4 kHz (khung 100 ms lúc đang nói) — đạt: trung vị ≥ 12 dB, bị lấp ≤ 25%:')
    for s in tl['scenes']:
        a, b = int(s['from'] * 10), int(s['to'] * 10)
        z = snr[a:b][on[a:b]]
        if len(z) >= 5:
            bad = np.mean(z < 6) * 100
            lines.append(f"  {s['id']} {s['from']:6.2f}–{s['to']:6.2f}s  trung vị {np.median(z):5.1f} dB, lấp {bad:3.0f}%"
                         f"{'  ⚠' if np.median(z) < 12 or bad > 25 else ''}")
    lines.append('\nĐỉnh SFX so với mốc (sự kiện có duck) — đạt: lệch ≤ 150 ms (cú nhiều lớp có thân tiếng đến sau cú va):')
    r = rms10(sfx.mean(0))
    for ev in events:
        if ev.get('duck'):
            a = max(0, int((ev['at'] - 0.06) * 100))   # bỏ qua tiếng dẫn trước (riser, hút khí) nằm trước mốc
            w = r[a:a + 56]
            pk = (a + int(np.argmax(w))) / 100 if len(w) else ev['at']
            lines.append(f"  {ev['at']:7.2f}s → {pk:7.2f}s ({(pk - ev['at']) * 1000:+4.0f} ms){'  ⚠' if abs(pk - ev['at']) > 0.15 else ''}  {ev.get('name', '')}")
    # thiết bị
    i, tp = lufs(master)
    lines.append(f'\nThiết bị:\n  độ to {i:.1f} LUFS (mục tiêu -14), đỉnh {tp:.1f} dBFS (≤ -1)')
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', '-', '-af', PHONE, '-f', 'f32le', '-'],
                         input=np.ascontiguousarray(master.T).astype('<f4').tobytes(), capture_output=True, check=True).stdout
    ph = np.frombuffer(raw, dtype='<f4').astype(np.float64)
    pr = frame_db(ph, SR // 20)
    ref = np.median(pr[pr > -50]) if (pr > -50).any() else -30
    big = [ev for ev in events if ev.get('duck', 0) >= 5]
    if big:
        vals = [pr[int((ev['at'] - 0.05) * 20):int((ev['at'] + 0.45) * 20)].max() - ref for ev in big]
        lines.append(f'  loa điện thoại (giả lập): nổ lớn vượt giọng trung bình {np.mean(vals):+.1f} dB (đạt ≥ +4)'
                     f"{'  ⚠ nổ yếu trên điện thoại' if np.mean(vals) < 4 else ''}")
    st = music + amb + sfx
    mono_loss = 10 * np.log10(np.sum(st.mean(0) ** 2) * 2 / (np.sum(st ** 2) + 1e-12) + 1e-12)
    lines.append(f"  gộp mono (điện thoại 1 loa): nhạc+SFX mất {-mono_loss:.1f} dB (đạt ≤ 3){'  ⚠' if mono_loss < -3 else ''}")
    want = mix_source(pdir)
    paid = sorted(k for k, e in used.items() if e.get('source') == 'epidemic')
    if want != 'epidemic' and paid:
        lines.append(f'\n⚠ Nguồn đã chọn là "{want}" nhưng đang dùng {len(paid)} file Epidemic (trả phí): {", ".join(paid[:4])}…')
    lines.append(f'\nNguồn: {want} · ' + ', '.join(f"{s}: {sum(e.get('source') == s for e in used.values())}"
                                                 for s in sorted({e.get('source', '?') for e in used.values()})))
    if used:
        cred = ['# Nguồn âm thanh', '', '| khoá | tên | tác giả | license | trang |', '|---|---|---|---|---|']
        cred += [f"| {k} | {e.get('title', '')} | {e.get('author', '')} | {e.get('license', '')} | {e.get('page', '')} |" for k, e in sorted(used.items())]
        (pdir / '.build/sound_credits.md').write_text('\n'.join(cred) + '\n')
        lines.append(f'\n{len(used)} file từ library → .build/sound_credits.md')
    text = '\n'.join(lines)
    (pdir / '.build/sound_report.txt').write_text(text + '\n')
    print(text)


def mix_source(pdir):
    """'epidemic' (mặc định; cần MCP Epidemic Sound) hoặc 'free' (người dùng chọn: Freesound CC0, Mixkit, kho)."""
    f = pdir / 'plan/mix.json'
    return (load(f).get('source') if f.exists() else None) or 'epidemic'


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pdir = need(sys.argv[1])
    mix = load(pdir / 'plan/mix.json') if (pdir / 'plan/mix.json').exists() else {}
    if mix.get('version') != 2:
        import runpy
        sys.argv = [str(Path(__file__).with_name('audio_legacy.py'))] + sys.argv[1:]
        runpy.run_path(sys.argv[0], run_name='__main__')
        return

    tl = timeline(pdir)
    dur = tl['duration']
    n = int(SR * dur)
    pub = pdir / '.build/public'
    pub.mkdir(parents=True, exist_ok=True)
    src = Src(pdir)
    opt = mix.get('options', {})
    stages = mix.get('stages') or [[0, dur, 'out']]

    voice_f = pdir / 'assets/voice/voice.mp3'
    if voice_f.is_file():
        link_file(voice_f, pub / 'voice.mp3')       # giọng giữ nguyên bản
        v = src.decode({'file': str(voice_f)})
    else:
        v = np.zeros(n)
    v = np.pad(v[:n], (0, max(0, n - len(v))))
    venv = voice_env(v, n)
    ws = words(pdir)

    print('nhạc …')
    music = build_bed(src, mix.get('music', []), -22, n, pdir, dur, venv) * env_db(mix.get('music_db'), n)
    events = normalize_events(tl['sfx'])
    logs = []
    if opt.get('beat_snap', True) and music.any():
        logs += beat_snap(events, music)
    if opt.get('word_dodge', True) and ws:
        logs += dodge_words(events, ws)
    duck = duck_env(events, n)
    music = spectral(music, lambda f: hp(f, 35, 2) * (1 - 0.5 * lp(f, 120, 2)))   # nhạc bớt trầm: trầm dành cho cú nổ
    music = carve(music, venv, mid_db=mix.get('music_carve', 10.0)) * duck   # có stem bỏ giai điệu thì khoét nhẹ hơn (6)
    print('nền …')
    amb = carve(build_bed(src, mix.get('amb', []), -36, n, pdir, dur) * np.sqrt(duck), venv, mid_db=4, wide_db=1)
    print(f'SFX ({len(events)} sự kiện) …')
    vp = np.max(np.abs(v)) or 0.6
    sfx = build_sfx(src, events, stages, n, venv, word_env(ws, n) if opt.get('word_dodge', True) and ws else None,
                    mix.get('sfx_hp', 28)) * mix.get('sfx_gain', 1.1) * vp

    trim = mix.get('trim', {})
    music *= 10 ** (trim.get('music', 0) / 20)
    sfx_scale = 10 ** (trim.get('sfx', 0) / 20)
    amb *= sfx_scale
    sfx = auto_protect_voice(v, music, amb, sfx * sfx_scale, venv, tl['scenes'], logs)
    sfx_all = sfx + amb
    vs = np.vstack([v, v])
    full = vs + music + sfx_all
    g = -14 - lufs(full, GLUE + ',')[0]
    master = render_master(full, g)

    vol = tl['volume']    # render / Studio nhân track với volume → ghi sẵn chia ngược để ra đúng mức đã thiết kế
    write_wav(pub / 'music.wav', music / max(vol['music'], 1e-3))
    write_wav(pub / 'sfx.wav', sfx_all / max(vol['sfx'], 1e-3))
    (pub / 'master.json').write_text(json.dumps({'gain_db': round(g, 2), 'filter': f'{GLUE},volume={g:.2f}dB,{LIMIT}'}))
    report(pdir, tl, v, music, amb, sfx, events, master, logs, src.used)
    print(f'projects/{pdir.name}/.build/public: voice.mp3 (nguyên bản), music.wav, sfx.wav, master.json ({dur:.2f}s)')


if __name__ == '__main__':
    main()
