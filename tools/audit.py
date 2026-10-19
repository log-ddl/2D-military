#!/usr/bin/env python3
"""Audit text cho một project video — bắt vi phạm luật TRƯỚC khi tốn token xem ảnh.

    python3 tools/audit.py <project_id>

Đọc: timeline.json, scenes/*.ts, data/sound.json, data/transcript.json.
In: bảng shot + mốc cắt (đối chiếu mốc câu thoại), rung màn hình, chữ trên hình, mật độ cue SFX.
Không render, không xem ảnh. Luật: .agents/skills/code-video-director/RULES.md
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
COMFY = 4.5             # vùng làm việc thoải mái
MIN_SHOT = 1.2          # dưới mức này là cắt vụn
MAX_AMP = 6.0           # rung 4-6px
HARD_AMP = 8.0
MAX_SHAKE_DUR = 0.35
MAX_LABELS = 2          # nhãn kỹ thuật mỗi scene
BIG_SFX = {'boom', 'explosion', 'cannon', 'mine'}
BED_SFX = {'drone', 'rumble', 'engine', 'radar'}
CUT_TOL = 0.30          # dung sai khớp mốc câu thoại
NEAR_CUT = 0.20         # cue dính mốc cắt


def read_cuts(src: Path):
    """Mốc cắt shot trong một scene: `lt < x`, `lt <= x`, hoặc `lt < CUT` với `const CUT = x`."""
    text = src.read_text()
    cuts = {float(m) for m in re.findall(r'lt\s*<=\s*([0-9.]+)', text)}
    cuts |= {float(m) for m in re.findall(r'lt\s*<\s*([0-9.]+)', text)}
    if re.search(r'lt\s*<=\s*CUT|lt\s*<\s*CUT', text):
        for m in re.findall(r'const\s+CUT\s*=\s*([0-9.]+)', text):
            cuts.add(float(m))
    return sorted(cuts), text


def call_args(text: str, name: str):
    """Nội dung trong ngoặc của mọi lời gọi `name(...)`, quét cân bằng ngoặc."""
    out = []
    for m in re.finditer(re.escape(name) + r'\(', text):
        i, depth, start = m.end(), 1, m.end()
        while i < len(text) and depth:
            if text[i] == '(':
                depth += 1
            elif text[i] == ')':
                depth -= 1
            i += 1
        out.append(text[start:i - 1])
    return out


def read_shakes(text: str):
    """[(amp, dur)] từ các lời gọi K.withShake(cam, lt, [[t0, amp, dur?], ...])."""
    out = []
    for block in call_args(text, 'withShake'):
        for trip in re.findall(r'\[\s*([0-9.]+)\s*,\s*([0-9.]+)\s*(?:,\s*([0-9.]+)\s*)?\]', block):
            amp = float(trip[1])
            dur = float(trip[2]) if trip[2] else 0.5
            out.append((amp, dur))
    return out


def count_labels(text: str):
    return (len(re.findall(r'U\.callout\(', text)) + len(re.findall(r'U\.label\(', text))
            + len(re.findall(r'fillText\(', text)))


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    pid = sys.argv[1]
    pdir = ROOT / 'projects' / pid
    tl = json.loads((pdir / 'timeline.json').read_text())
    problems, notes = [], []
    shots = []          # (scene, start_abs, end_abs)

    print(f'== AUDIT {pid} ==')
    print(f'{"scene":6} {"start":>7} {"end":>7} {"dur":>6}  {"shot (s)":30} {"rung (px/s)":24} chữ')
    for e in tl:
        sc = e['scene']
        src = pdir / 'scenes' / f'{sc}.ts'
        start, end = float(e['start']), float(e['end'])
        dur = end - start
        if not src.exists():
            problems.append(f'{sc}: thiếu file scenes/{sc}.ts')
            print(f'{sc:6} {start:7.2f} {end:7.2f} {dur:6.2f}  {"THIẾU FILE":30}')
            continue
        cuts, text = read_cuts(src)
        bnd = [0.0] + [c for c in cuts if 0 < c < dur] + [dur]
        durs = [round(bnd[i + 1] - bnd[i], 3) for i in range(len(bnd) - 1)]
        for i, d in enumerate(durs):
            shots.append((sc, round(start + bnd[i], 3), round(start + bnd[i + 1], 3)))
        shakes = read_shakes(text)
        labels = count_labels(text)

        flag = ''
        for d in durs:
            if d < MIN_SHOT:
                notes.append(f'{sc}: shot {d:.2f}s quá vụn (< {MIN_SHOT}s)')
        if len(durs) >= 3 and max(durs) - min(durs) < 0.05:
            notes.append(f'{sc}: các shot gần bằng nhau ({durs[0]:.2f}s) — nghi chia lưới đều')
        for amp, sdur in shakes:
            if amp > HARD_AMP:
                problems.append(f'{sc}: rung {amp}px > {HARD_AMP}px')
            elif amp > MAX_AMP:
                notes.append(f'{sc}: rung {amp}px > {MAX_AMP}px')
            if sdur > MAX_SHAKE_DUR:
                problems.append(f'{sc}: rung tắt trong {sdur}s > {MAX_SHAKE_DUR}s')
        if labels > MAX_LABELS:
            problems.append(f'{sc}: {labels} nhãn/chữ trên hình > {MAX_LABELS}')

        sh = ', '.join(f'{a:g}/{d:g}' for a, d in shakes) or '—'
        print(f'{sc:6} {start:7.2f} {end:7.2f} {dur:6.2f}  {str(durs):30} {sh:24} {labels}{flag}')

    # ── mốc cắt vs mốc câu thoại ────────────────────────────────────
    tr = pdir / 'data/transcript.json'
    if tr.exists():
        segs = json.loads(tr.read_text())['segments']
        end_film = max(float(e['end']) for e in tl)
        print('\n-- Mốc cắt vs câu thoại (luật: cắt theo mốc câu, không nhảy chủ đề) --')
        for sc, a, b in shots:
            if b >= end_film - 0.05:      # hết phim, không phải cú cắt
                continue
            verdict = None
            for s in segs:
                s0, s1 = float(s['start']), float(s['end'])
                if s0 < b < s1:                                  # cắt giữa câu
                    if abs(b - s0) <= CUT_TOL:
                        verdict = f'! cắt ngay sau đầu câu mới ({b - s0:.2f}s)'
                    elif s1 - s0 <= COMFY:
                        verdict = f'! bẻ câu ngắn {s1 - s0:.2f}s thành nhiều shot'
                    else:
                        verdict = f'ok (giữa câu dài {s1 - s0:.1f}s)'
                    break
                if abs(b - s1) <= CUT_TOL:
                    verdict = 'ok (khớp mốc ngắt câu)'
                    break
            if verdict is None:
                verdict = '? không khớp mốc câu nào'
                notes.append(f'{sc}: mốc cắt {b:.2f}s không gần mốc câu thoại')
            if verdict.startswith('!'):
                problems.append(f'{sc}: mốc cắt {b:.2f}s — {verdict}')
            print(f'  {sc}  cắt @{b:7.2f}s  {verdict}')

    # ── âm thanh ───────────────────────────────────────────────────
    sj = pdir / 'data/sound.json'
    if sj.exists():
        cfg = json.loads(sj.read_text())
        cues = cfg.get('sfx', [])
        tlm = {e['scene']: float(e['start']) for e in tl}
        per = {}
        for c in cues:
            per[c.get('scene')] = per.get(c.get('scene'), 0) + 1
        n_sc = len(tl)
        big = [c for c in cues if c.get('type') in BIG_SFX]
        print('\n-- Âm thanh --')
        print(f'  shot: {len(shots)}   cue: {len(cues)}   cue/shot: {len(cues) / max(1, len(shots)):.2f}   '
              f'chương: {n_sc}   cue/chương: {len(cues) / max(1, n_sc):.2f}')
        print(f'  tiếng lớn: {len(big)} ({", ".join(sorted({c.get("type") for c in big})) or "—"})')
        silent = [e['scene'] for e in tl if not per.get(e['scene'])]
        print(f'  chương IM SFX: {", ".join(silent) if silent else "KHÔNG CÓ"}')
        if len(cues) > 2 * n_sc:
            problems.append(f'âm thanh: {len(cues)} cue > 2× số chương ({2 * n_sc})')
        if len(cues) > len(shots):
            problems.append(f'âm thanh: {len(cues)} cue > số shot ({len(shots)}) — vượt 1 cue/shot')
        if len(big) > 3:
            problems.append(f'âm thanh: {len(big)} tiếng lớn > 3 cho cả phim')
        if not silent:
            problems.append('âm thanh: không chương nào im SFX')
        # cue dính mốc cắt
        cut_abs = [b for _, a, b in shots]
        stick = [c for c in cues
                 if any(abs((tlm.get(c.get('scene'), 0) + float(c.get('at', 0))) - b) <= NEAR_CUT for b in cut_abs)]
        if stick:
            notes.append(f'âm thanh: {len(stick)} cue rơi đúng mốc cắt — luật là đánh vào hành động, không đánh vào cut')
        # chồng nền: nhiều cue dạng nền trong cùng scene, hoặc một nền quá dài
        music_scenes = {s.get('scene') for s in cfg.get('music', {}).get('sections', [])}
        beds = {}
        for c in cues:
            if c.get('type') in BED_SFX:
                beds.setdefault(c.get('scene'), []).append(float(c.get('dur', 2.5)))
        for sc, durs in beds.items():
            if len(durs) >= 2:
                notes.append(f'âm thanh: {sc} có {len(durs)} cue dạng nền ({", ".join(f"{d:g}s" for d in durs)}) — nghi chồng nền')
            elif sc in music_scenes and max(durs) >= 2.5:
                notes.append(f'âm thanh: {sc} có nền {max(durs):g}s dài đè lên nhạc — cân nhắc bỏ')
        pk = cfg.get('peaks', [])
        if len(pk) > 4:
            notes.append(f'âm thanh: {len(pk)} peaks > 4 — peaks chỉ là 2–4 đỉnh câu chuyện')

    print(f'\n== KẾT QUẢ: {len(problems)} lỗi luật, {len(notes)} cảnh báo ==')
    for p in problems:
        print(f'  ✗ {p}')
    for n in notes:
        print(f'  · {n}')
    if not problems:
        print('  ✓ không vi phạm luật số nào')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
