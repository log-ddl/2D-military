"""Thử nghiệm sound design cho dự án t — chỉ dùng trong thư mục này, không đụng pipeline chung.

    .venv/bin/python projects/t/sound-test/mix.py

Ra out/:  A-sound.mp4 (cách Lyee0011/sound), B-shotcraft.mp4 (cách video-shotcraft), B-shotcraft-khong-nhac.mp4,
          0-goc.mp4 (bản cũ, chỉ chuẩn hoá độ to). Mọi bản chuẩn hoá -14 LUFS để so công bằng.
"""
import subprocess
from pathlib import Path

import numpy as np

SR = 44100
HERE = Path(__file__).resolve().parent
P = HERE.parent
OUT = HERE / 'out'
DUR = 70.1
N = int(SR * DUR)
SILENT = P / 'out/video.mp4'  # chỉ lấy hình


def decode(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)


_cache = {}


def clip(fid):
    if fid not in _cache:
        f = next((HERE / 'sfx').glob(f'fs_{fid}_*')) if (HERE / 'sfx').glob(f'fs_{fid}_*') else None
        _cache[fid] = decode(f)
    return _cache[fid]


def rms10(x):
    h = SR // 100
    k = max(1, len(x) // h)
    return np.sqrt(np.mean(x[:k * h].reshape(k, h) ** 2, axis=1))


def fade(x, fi=0.0, fo=0.0):
    x = x.copy()
    a, b = int(fi * SR), int(fo * SR)
    if a and len(x) > a:
        x[:a] *= np.linspace(0, 1, a)
    if b and len(x) > b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


def place(buf, x, t0):
    i = int(round(t0 * SR))
    if i < 0:
        x, i = x[-i:], 0
    m = min(len(x), len(buf) - i)
    if m > 0:
        buf[i:i + m] += x[:m]


def prep(fid, trim=None, gain=1.0, fo=0.15, fi=0.0, loop_to=None):
    """Cắt [a,b], lặp nếu cần, chuẩn đỉnh -3 dB rồi nhân gain."""
    x = clip(fid)
    if trim:
        x = x[int(trim[0] * SR):int(trim[1] * SR)]
    if loop_to:
        xf = int(0.25 * SR)
        y = x.copy()
        while len(y) < loop_to * SR:
            ramp = np.linspace(0, 1, xf)
            y = np.concatenate([y[:-xf], y[-xf:] * (1 - ramp) + x[:xf] * ramp, x[xf:]])
        x = y[:int(loop_to * SR)]
    x = fade(x, fi, fo)
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-3 / 20) * gain


def lead_trim(x):
    """Bỏ khoảng lặng đầu file (dưới đỉnh -40 dB)."""
    r = rms10(x)
    on = np.where(r > r.max() * 0.01)[0]
    return x[on[0] * SR // 100:] if len(on) else x


def peak_s(x):
    return int(np.argmax(rms10(x))) / 100


# ---------------------------------------------------------------- A: Lyee0011/sound
# Chọn clip tải nhiều nhất mà khớp cue, tránh BY-NC; đo rồi cắt khoảng lặng đầu; đặt đầu tiếng đúng mốc.
# Skill này chỉ lo SFX nên nhạc giữ nguyên bản tổng hợp cũ.
A = [  # (mốc, id, cắt, sức)
    (0.15, 329800, (0, 4.2), .45), (1.72, 640204, None, .75), (8.30, 123222, None, .65), (9.24, 423105, None, .95),
    (14.06, 528561, None, .60), (15.06, 249298, (0, 3.6), .85), (16.45, 569665, (20, 24.6), .48), (26.26, 244983, None, .90),
    (30.64, 134935, None, .55), (32.60, 833599, None, .52), (39.28, 528561, None, .55), (41.56, 521377, None, .88),
    (43.36, 167563, None, .78), (46.02, 528561, None, .70), (47.18, 182429, None, .82), (50.30, 134935, None, .72),
    (53.48, 167563, None, .78), (54.70, 35643, None, 1.0), (62.22, 131708, None, .55), (63.68, 528561, None, .75),
    (66.30, 448002, None, .85), (67.18, 108641, None, 1.0),
]

# ---------------------------------------------------------------- B: video-shotcraft
# Chọn theo nguồn âm thật + chất liệu + độ dài (CC0), cắt đúng cửa sổ hành động, ĐỈNH năng lượng rơi đúng mốc,
# xếp lớp (va chạm = tiếng kim loại + lực), nhạc thật có fade và hạ dưới lời.
# (mốc đỉnh, id, cắt, gain, kiểu đặt: 'peak' = đỉnh vào mốc, 'start' = đầu vào mốc, tuỳ chọn)
B = [
    (0.15, 329800, (7.2, 11.2), .50, 'start', dict(fi=.3, fo=.8)),     # xích tăng nghiền đất, nền
    (1.72, 640204, None, .70, 'peak', {}),                              # xe tăng dằn xuống mô đất
    (9.10, 730959, (0.8, 3.0), .55, 'peak', dict(fo=.6)),               # đạn lao tới, đỉnh ngay trước va
    (9.24, 148840, (0, 0.9), .80, 'peak', {}),                          # đạn nảy khỏi giáp trước
    (9.24, 441373, None, .60, 'peak', {}),                              # lực va
    (14.06, 384187, None, .50, 'peak', {}),
    (15.06, 249298, (0, 3.6), .85, 'peak', dict(fo=.8)),                # ATGM rời ống
    (16.45, 383852, None, .42, 'start', dict(fi=.4, fo=.8, loop_to=4.6)),  # FPV quadcopter rú
    (26.26, 244983, None, .75, 'peak', {}),                             # thép đè lên bệ cân
    (26.26, 640204, None, .50, 'peak', {}),
    (30.64, 812689, None, .45, 'peak', {}),                             # tách lớp giáp
    (30.88, 505669, None, .50, 'peak', {}),
    (32.60, 351371, None, .50, 'peak', {}),                             # gõ vào nóc mỏng
    (39.28, 384187, None, .50, 'peak', {}),
    (41.56, 521377, None, .90, 'peak', {}),                             # tên lửa vọt lên
    (44.00, 730959, (11.8, 15.6), .60, 'peak', dict(fo=.8)),            # bổ nhào
    (46.02, 384187, None, .55, 'peak', {}),
    (47.18, 182429, None, .85, 'peak', {}),                             # kích nổ HEAT
    (50.30, 812689, None, .60, 'peak', {}),                             # luồng kim loại
    (53.48, 812688, None, .60, 'peak', {}),
    (54.70, 177556, (7.4, 13.5), 1.0, 'peak', dict(fo=2.0)),            # hầm đạn nổ
    (62.22, 493162, (3.0, 6.5), .50, 'peak', dict(fo=1.0)),             # radar bắt mục tiêu
    (63.68, 384187, None, .55, 'peak', {}),
    (66.30, 448002, None, .70, 'peak', dict(fo=.8)),                    # bắn đạn đánh chặn
    (67.18, 264031, (0, 4.5), 1.0, 'peak', dict(fo=1.5)),               # nổ đánh chặn
]


def sfx_A():
    buf = np.zeros(N)
    for at, fid, trim, p in A:
        x = clip(fid)
        x = x[int(trim[0] * SR):int(trim[1] * SR)] if trim else lead_trim(x)
        x = fade(x, 0, .15)
        place(buf, x / (np.max(np.abs(x)) + 1e-9) * 10 ** (-3 / 20) * p, at)
    return buf


def sfx_B():
    buf = np.zeros(N)
    for at, fid, trim, g, mode, kw in B:
        x = prep(fid, trim, g, **({'fo': .15} | kw))
        place(buf, x, at - (peak_s(x) if mode == 'peak' else 0))
    return buf


def voice_env(v):
    """0..1: có lời hay không, mượt 0.4 s."""
    r = rms10(v)
    on = (r > max(1e-3, 0.12 * np.percentile(r, 90))).astype(float)
    on = np.convolve(on, np.ones(40) / 40, mode='same')
    return np.clip(np.interp(np.arange(N) / SR, np.arange(len(r)) / 100, on), 0, 1)


def music_B(v):
    x = decode(HERE / 'music' / next(f.name for f in (HERE / 'music').glob('fs_559485_*')))[:N]
    x = np.pad(x, (0, N - len(x)))
    x = fade(x, 1.0, 2.5)
    x = x / (np.sqrt(np.mean(x ** 2)) + 1e-9) * 0.05          # nền: RMS cố định trước khi hạ
    duck = 10 ** (-9 / 20)                                     # hạ 9 dB khi có lời
    return x * (1 - (1 - duck) * voice_env(v)) * 1.6


def master(name, mix):
    OUT.mkdir(exist_ok=True)
    wav = OUT / f'{name}.wav'
    y = np.clip(mix, -4, 4).astype('<f4')
    raw = ['-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-']
    # Đo LUFS rồi chỉnh tuyến tính (không nén dải động như loudnorm động), limiter chỉ bắt đỉnh
    log = subprocess.run(['ffmpeg', '-nostats', *raw, '-af', 'ebur128', '-f', 'null', '-'],
                         input=y.tobytes(), capture_output=True, text=False).stderr.decode()
    lufs = float(log.rsplit('I:', 1)[1].split('LUFS')[0])
    subprocess.run(['ffmpeg', '-y', '-v', 'error', *raw,
                    '-af', f'volume={-14 - lufs:.2f}dB,alimiter=limit=0.84:attack=1:release=80:level=false',
                    '-ar', str(SR), '-ac', '2', str(wav)], input=y.tobytes(), check=True)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(SILENT), '-i', str(wav), '-map', '0:v', '-map', '1:a',
                    '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', str(OUT / f'{name}.mp4')], check=True)
    wav.unlink()
    print('  ', OUT / f'{name}.mp4')


def main():
    v = decode(P / 'assets/voice/voice.mp3')[:N]
    v = np.pad(v, (0, N - len(v)))
    old_music = decode(P / '.build/public/music.wav')[:N]
    old_music = np.pad(old_music, (0, N - len(old_music)))
    old_sfx = decode(P / '.build/public/sfx.wav')[:N]
    old_sfx = np.pad(old_sfx, (0, N - len(old_sfx)))
    vp = np.max(np.abs(v))
    print(f'voice đỉnh {20 * np.log10(vp):.1f} dB')

    master('0-goc', v + old_music * .46 + old_sfx * .58)
    # SFX: đỉnh tiếng mạnh nhất ngang đỉnh voice (bản gốc cũng vậy), không thấp hơn 8 dB như lần đầu
    master('A-sound', v + old_music * .46 + sfx_A() * 1.4 * vp)
    sb = sfx_B() * 1.4 * vp
    master('B-shotcraft', v + music_B(v) * vp + sb)
    master('B-shotcraft-khong-nhac', v + sb)


if __name__ == '__main__':
    main()
