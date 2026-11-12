#!/usr/bin/env python3
"""Chèn khoảng nghỉ vào voice TRƯỚC khi tạo dự án, để cụm cao trào (cắt theo nhịp nhạc) và thẻ tên phim có chỗ chỉ có nhạc.
Giọng không bị đổi: chỉ thêm im lặng giữa hai câu. Chạy bằng .venv (cần faster-whisper).

    .venv/bin/python skills/history_military/tools/voice_prep.py voice/x.mp3
        → nghe và in từng câu kèm giây đầu–cuối + khoảng lặng sau câu (lưu đệm voice/x.words.json).
    .venv/bin/python skills/history_military/tools/voice_prep.py voice/x.mp3 --script voice/x.md [-o voice/x.timed.mp3]
        → TỰ tìm các dấu ngoặc vuông có số giây trong kịch bản (`[NHẠC ~10s]`, `[MUSIC 8s]`, `[6s]`; ngôn ngữ nào cũng được, chỉ cần
          dạng `[… <số>s …]`), khớp chữ kịch bản với lời nghe được để biết dấu nằm sau từ nào, rồi chèn đúng số giây đó.
          Dòng bắt đầu bằng `#` hoặc `>` trong kịch bản bị bỏ qua (tiêu đề, ghi chú). Luôn in câu đứng trước từng chỗ chèn để kiểm.
    .venv/bin/python skills/history_military/tools/voice_prep.py voice/x.mp3 --gap 71.0:10.5 --gap 412.3:6 [-o voice/x.timed.mp3]
        → chèn 10,5 s im lặng vào chỗ nghỉ giữa hai từ gần giây 71.0 nhất (tìm trong ±1,5 s), v.v. In ra các khoảng nhạc theo
          giây MỚI của file kết quả. Sau đó: new.py <id> voice/x.timed.mp3 --skill history_military.

Chọn chỗ chèn: cuối đoạn mở đầu (ngay sau câu nêu câu hỏi của phim, trước thẻ tên) 9–12 s; đỉnh của mỗi chương lớn 4–7 s;
không quá một khoảng mỗi ~3 phút. Không chèn giữa câu.
"""
import difflib
import json
import os
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

from _hm import ROOT, opt, opts

SR = 44100
MODEL_ID = 'deepdml/faster-whisper-large-v3-turbo-ct2'  # cùng model với core/tools/asr.py


def words_of(voice: Path):
    cache = voice.with_suffix('.words.json')
    if cache.exists() and cache.stat().st_mtime >= voice.stat().st_mtime:
        return json.loads(cache.read_text(encoding='utf-8'))
    os.environ.setdefault('HF_HUB_OFFLINE', '1')
    from faster_whisper import WhisperModel
    model = WhisperModel(MODEL_ID, device='cpu', compute_type='int8')
    segs, _ = model.transcribe(str(voice), word_timestamps=True, vad_filter=True)
    out = [{'s': round(s.start, 2), 'e': round(s.end, 2), 't': s.text.strip(), 'w': [[w.word.strip(), round(w.start, 2), round(w.end, 2)] for w in s.words]} for s in segs]
    cache.write_text(json.dumps(out, ensure_ascii=False), encoding='utf-8')
    return out


def sentences(segs):
    """Gộp các mảnh của whisper thành câu (kết bằng . ? !)."""
    cur, out = [], []
    for s in segs:
        for w in s['w']:
            cur.append(w)
            if w[0][-1:] in '.?!…':
                out.append(cur); cur = []
    if cur:
        out.append(cur)
    return out


MARK = re.compile(r'\[[^\]\n]*?(\d+(?:[.,]\d+)?)\s*(?:s|giây|sec)[^\]\n]*\]', re.I)
norm = lambda w: re.sub(r'[\W_]+', '', w.lower())


def gaps_from_script(script: Path, ws):
    """Dấu `[… Ns …]` trong kịch bản → ['giây:độ_dài'] bằng cách căn toàn bộ chữ kịch bản với các từ nghe được."""
    text = '\n'.join(l for l in script.read_text(encoding='utf-8').splitlines() if not l.lstrip().startswith(('#', '>')))
    toks, marks, pos = [], [], 0
    for m in MARK.finditer(text):
        toks += [t for t in map(norm, text[pos:m.start()].split()) if t]
        marks.append((len(toks), float(m[1].replace(',', '.')), m[0]))
        pos = m.end()
    toks += [t for t in map(norm, text[pos:].split()) if t]
    if not marks:
        sys.exit('kịch bản không có dấu dạng [… <số>s …] nào')
    heard = [norm(w[0]) for w in ws]
    blocks = difflib.SequenceMatcher(None, toks, heard, autojunk=False).get_matching_blocks()
    out = []
    for at, dur, raw in marks:
        if at == 0:
            sys.exit(f'{raw}: dấu nằm trước mọi lời đọc, không chèn được')
        j = None  # từ nghe được ứng với từ kịch bản cuối cùng trước dấu (lấy từ khớp gần nhất về phía trước)
        for b in blocks:
            if b.size and b.a < at:
                j = b.b + min(b.size, at - b.a) - 1
        near = sum(1 for b in blocks if b.size and b.a < at and b.a + b.size > at - 12)
        if j is None or not near:
            sys.exit(f'{raw}: không khớp được đoạn kịch bản trước dấu với lời đọc (voice có đúng kịch bản này không?)')
        print(f"{raw} → sau giây {ws[j][2]:.2f}: “…{' '.join(w[0] for w in ws[max(0, j - 7):j + 1])}”")
        out.append(f'{ws[j][2] + 0.05:.2f}:{dur}')
    return out


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    gaps, out, script = opts(argv, '--gap'), opt(argv, '-o'), opt(argv, '--script')
    voice = Path(argv[0]).resolve()
    segs = words_of(voice)
    ws = [w for s in segs for w in s['w']]
    if script:
        gaps += gaps_from_script(Path(script).resolve(), ws)
    if not gaps:
        for sen in sentences(segs):
            i = ws.index(sen[-1])
            pause = ws[i + 1][1] - sen[-1][2] if i + 1 < len(ws) else 0
            print(f"{sen[0][1]:7.2f}–{sen[-1][2]:7.2f}  {' '.join(w[0] for w in sen)}" + (f'   ⟂ {pause:.2f}s' if pause >= 0.45 else ''))
        print(f'\n{len(ws)} từ, {ws[-1][2]:.1f} s, {len(ws) / ws[-1][2] * 60:.0f} từ/phút. Chọn chỗ chèn bằng --gap <giây cuối câu>:<số giây>.')
        return
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(voice), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True).stdout
    x = np.frombuffer(raw, np.int16).copy()
    cuts = []
    for g in gaps:
        t, d = (float(v) for v in g.split(':'))
        cand = [(ws[i + 1][1] - ws[i][2], (ws[i][2] + ws[i + 1][1]) / 2) for i in range(len(ws) - 1) if abs((ws[i][2] + ws[i + 1][1]) / 2 - t) <= 1.5]
        if not cand:
            sys.exit(f'--gap {g}: không có chỗ nghỉ giữa hai từ trong ±1,5 s quanh giây {t}')
        width, at = max(cand)
        if width < 0.25:
            print(f'⚠ --gap {g}: chỗ nghỉ gần nhất chỉ {width:.2f} s (giữa câu?); kiểm lại mốc')
        cuts.append((at, d))
    cuts.sort()
    parts, prev, shift = [], 0, 0.0
    fade = int(0.03 * SR)
    for at, d in cuts:
        i = int(at * SR)
        seg = x[prev:i].astype(np.float32)
        seg[-fade:] *= np.linspace(1, 0, fade)
        parts += [seg, np.zeros(int(d * SR), np.float32)]
        print(f'khoảng nhạc: {at + shift:.2f} – {at + shift + d:.2f} s  (chèn sau giây {at:.2f} của voice gốc)')
        shift += d
        prev = i
    tail = x[prev:].astype(np.float32)
    tail[:fade] *= np.linspace(0, 1, fade)
    parts.append(tail)
    y = np.concatenate(parts).clip(-32768, 32767).astype(np.int16)
    out = Path(out).resolve() if out else voice.with_suffix('.timed.mp3')
    tmp = out.with_suffix('.tmp.wav')
    with wave.open(str(tmp), 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-c:a', 'libmp3lame', '-q:a', '1', str(out)], check=True)
    tmp.unlink()
    print(f'→ {out.relative_to(ROOT) if out.is_relative_to(ROOT) else out}  ({len(y) / SR:.2f} s). Ghi các khoảng nhạc trên vào plan/STORY.md mục Nhịp.')


if __name__ == '__main__':
    main()
