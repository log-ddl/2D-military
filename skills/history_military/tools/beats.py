#!/usr/bin/env python3
"""Đo cú hit / phách của nhạc ĐÃ ĐẶT trong một khoảng cao trào và đề xuất điểm cắt dồn nhịp cho <BeatMontage>.
Chạy sau khi agent nhạc xong plan/mix.json và đã chạy audio.py (đọc .build/public/music.wav, tức đúng giây của video).

    .venv/bin/python skills/history_military/tools/beats.py <id> --from 71.8 --to 82.0 [--shots 7] [--min 0.5]
        → in mọi cú hit trong khoảng (giây video, độ mạnh) và một dãy `cuts` dồn nhịp: shot đầu dài, ngắn dần, cú cuối trùng cú hit mạnh
          nhất gần `--to` (chỗ nhạc "rơi" vào thẻ tên / im lặng). Ghi vào plan/beats.json dưới khoá "<from>-<to>".
    --shots: số shot muốn có (mặc định theo độ dài: ~1 shot / 1,4 s) · --min: shot ngắn nhất (s).

Dùng: chép `cuts` vào <BeatMontage cuts={[…]}>. Nhạc đổi (đổi bài, dời `in`) thì chạy lại và cập nhật cuts.
Nếu khoảng đó nhạc không có cú hit rõ (đoạn pad) thì công cụ báo: đổi đoạn nhạc hoặc dời `in`, đừng cắt bừa.
"""
import json
import sys
import wave

import numpy as np

from _hm import ROOT, opt


def onset_env(x, sr, hop=512, n=2048):
    """Phổ thông lượng dương (spectral flux), nhấn dải trầm–trung nơi có trống."""
    win = np.hanning(n)
    frames = np.lib.stride_tricks.sliding_window_view(x, n)[::hop]
    mag = np.abs(np.fft.rfft(frames * win, axis=1))
    f = np.fft.rfftfreq(n, 1 / sr)
    mag = np.log1p(6 * mag) * np.where(f < 4000, 1.0, 0.4)
    flux = np.maximum(mag[1:] - mag[:-1], 0).sum(1)
    flux = np.concatenate([[0], flux])
    return flux / (flux.max() + 1e-9), hop / sr


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pid = argv.pop(0)
    a, b = opt(argv, '--from', cast=float), opt(argv, '--to', cast=float)
    min_len, want = opt(argv, '--min', 0.5, float), opt(argv, '--shots', None, int)
    if a is None or b is None:
        sys.exit(__doc__)
    path = ROOT / 'projects' / pid / '.build/public/music.wav'
    if not path.exists():
        sys.exit('chưa có .build/public/music.wav: chạy .venv/bin/python core/tools/audio.py <id> trước (sau khi có plan/mix.json)')
    t0 = max(0, a - 1)
    dur = b - a + 2
    import subprocess
    r = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(t0), '-t', str(dur), '-i', str(path),
                        '-f', 'f32le', '-ac', '1', '-ar', '44100', '-'], capture_output=True)
    sr = 44100
    x = np.frombuffer(r.stdout, np.float32)
    if np.abs(x).max() < 1e-3:
        sys.exit(f'khoảng {a}–{b} s không có nhạc: kiểm plan/mix.json')
    env, dt = onset_env(x, sr)
    t0 = max(0, a - 1)
    med = np.median(env)
    hits = []
    for i in range(2, len(env) - 2):
        t = t0 + i * dt
        if a <= t <= b and env[i] == env[i - 2:i + 3].max() and env[i] > max(0.12, 3 * med):
            if hits and t - hits[-1][0] < 0.18:
                if env[i] > hits[-1][1]:
                    hits[-1] = (t, float(env[i]))
            else:
                hits.append((t, float(env[i])))
    print(f'{len(hits)} cú hit trong {a}–{b} s:')
    print('  ' + '  '.join(f'{t:.2f}({s:.2f})' for t, s in hits))
    if len(hits) < 3:
        sys.exit('⚠ nhạc ở khoảng này không có nhịp rõ để cắt theo: chọn đoạn nhạc có trống / cú hit, hoặc dời `in` của mảnh nhạc.')
    # cú chốt: hit mạnh nhất trong 35% cuối khoảng
    late = [h for h in hits if h[0] >= a + (b - a) * 0.65] or hits[-2:]
    end = max(late, key=lambda h: h[1])[0]
    n = want or max(3, round((end - a) / 1.4))
    # mục tiêu: độ dài shot giảm tuyến tính (dồn nhịp), rồi bám từng mốc vào cú hit gần nhất
    w8 = np.linspace(1.7, 0.6, n); w8 = w8 / w8.sum() * (end - a)
    ideal = a + np.cumsum(w8)[:-1]
    cuts = [a]
    for t in ideal:
        cand = [h for h in hits if h[0] - cuts[-1] >= min_len and end - h[0] >= min_len]
        if not cand:
            break
        pick = min(cand, key=lambda h: abs(h[0] - t) - 0.15 * h[1])[0]
        if pick > cuts[-1]:
            cuts.append(pick)
    cuts.append(end)
    cuts = [round(c, 2) for c in cuts]
    lens = [round(y - x_, 2) for x_, y in zip(cuts, cuts[1:])]
    print(f'cuts ({len(cuts) - 1} shot, cú chốt {end:.2f} s): {cuts}')
    print(f'độ dài shot: {lens}')
    if end < b - 0.05:
        print(f'sau cú chốt còn {b - end:.2f} s tới {b}: đặt thẻ tên / im lặng bắt đầu đúng {end:.2f} s.')
    store = ROOT / 'projects' / pid / 'plan/beats.json'
    data = json.loads(store.read_text(encoding='utf-8')) if store.exists() else {}
    data[f'{a:g}-{b:g}'] = {'hits': [[round(t, 2), round(s, 2)] for t, s in hits], 'cuts': cuts}
    store.write_text(json.dumps(data, ensure_ascii=False, indent=1), encoding='utf-8')
    print(f'→ plan/beats.json["{a:g}-{b:g}"]')


if __name__ == '__main__':
    main()
