"""Đo file âm thanh: thời lượng, giây đỉnh năng lượng (RMS 10ms), vùng hoạt động (> đỉnh-40dB), mức đỉnh."""
import subprocess, sys
from pathlib import Path
import numpy as np
SR = 44100
def decode(p):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(np.float64)
for p in sorted(Path(sys.argv[1]).glob('*.mp3')):
    x = decode(p); h = SR // 100; k = len(x) // h
    rms = np.sqrt(np.mean(x[:k*h].reshape(k, h) ** 2, axis=1))
    pk = int(np.argmax(rms)); on = np.where(rms > rms[pk] * 0.01)[0]
    print(f'{p.name[:44]:44s} {len(x)/SR:6.2f}s  peak@{pk/100:5.2f}s  act {on[0]/100:5.2f}-{on[-1]/100:6.2f}s  max {20*np.log10(np.max(np.abs(x))+1e-9):5.1f}dB')
