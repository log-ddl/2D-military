#!/usr/bin/env python3
"""Bộ kiểm tra ràng buộc cấu trúc & dữ liệu kỹ thuật của skill story_2d:
Chỉ bắt các lỗi kỹ thuật cứng (0% ảnh chụp thật ngoài, 0% 3D, đúng wrapper font StoryText, biên thời gian hợp lệ, đủ âm thanh);
không áp đặt bất kỳ hạn ngạch giây hay phần trăm cứng nhắc nào lên nhịp dựng sáng tạo của kịch bản.

    python3 skills/story_2d/tools/review.py <id> [--strict]

✗ = vi phạm luật kỹ thuật cứng (thoát mã 1) · ⚠ = thiếu bước âm thanh / dữ liệu cần xử lý · i = thông tin tóm tắt dự án.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]

FORBIDDEN_3D = re.compile(r"from\s+['\"](@skill/military/3d/|three|@react-three)")
FORBIDDEN_PHOTO = re.compile(r"\b(PhotoFull|PhotoCard|PersonCutout|PersonDossier|PersonNews|PersonTitle|SatBase)\b")


def strip_comments(code: str) -> str:
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', code)


def tags(code: str, names):
    out = []
    for m in re.finditer(r'<(' + '|'.join(names) + r')\b', code):
        i, depth, quote = m.end(), 0, None
        while i < len(code):
            c = code[i]
            if quote:
                if c == quote and code[i - 1] != '\\':
                    quote = None
            elif c in '"\'`':
                quote = c
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
            elif c == '>' and depth == 0:
                break
            i += 1
        out.append((m.group(1), code[m.end():i]))
    return out


def load_cues(pdir: Path) -> dict:
    cues = {}
    d = pdir / 'src/cues'
    if d.is_dir():
        for f in sorted(d.glob('*.ts')):
            if f.stem == 'index':
                continue
            for k, v in re.findall(r'^\s*([A-Za-z_]\w*)\s*:\s*([0-9]+(?:\.[0-9]+)?)', f.read_text(), re.M):
                cues[k] = float(v)
    return cues


def eval_num(expr: str, cues: dict):
    if not expr:
        return None
    s = expr.strip().strip('{}')
    for k, v in cues.items():
        s = re.sub(rf'\bCUE\.{re.escape(k)}\b', str(v), s)
    if re.fullmatch(r'[0-9.+\-*/ ()]+', s):
        try:
            return float(eval(s, {'__builtins__': {}}, {}))
        except Exception:
            return None
    return None


def main():
    argv = sys.argv[1:]
    if not argv or argv[0].startswith('-'):
        sys.exit(__doc__)
    pid = argv[0]
    pdir = ROOT / 'projects' / pid
    if not (pdir / 'plan/timeline.json').exists():
        sys.exit('chưa có plan/timeline.json: chạy core/tools/build.py trước')

    tl = json.loads((pdir / 'plan/timeline.json').read_text())
    book = {a['id']: a for a in json.loads((pdir / 'assets/ASSETS.json').read_text()).get('assets', [])}
    cues = load_cues(pdir)
    tr_path = pdir / 'plan/transcript.json'
    tr_data = json.loads(tr_path.read_text()) if tr_path.exists() else {}
    voice_lang = tr_data.get('lang') or tr_data.get('language') or '?'
    scenes = tl['scenes']
    dur = tl['duration']

    err, warn, info = [], [], []

    # 1. Kiểm tra tài sản ảnh: cấm ảnh tải web ngoài (trừ khi người dùng chủ động đưa vào input/ có locked=true)
    for aid, a in book.items():
        if a.get('kind') == 'image' and not a.get('locked'):
            err.append(f"ASSETS.json có ảnh ngoài '{aid}' ({a.get('file')}) — story_2d thuần vẽ hoạt hình 2.5D đồng nhất (0% ảnh chụp web)")

    # 2. Kiểm tra src/parts/*.tsx
    part_files = sorted((pdir / 'src/parts').glob('*.ts*')) if (pdir / 'src/parts').is_dir() else []
    for pf in part_files:
        pcode = strip_comments(pf.read_text())
        if FORBIDDEN_3D.search(pcode):
            err.append(f'src/parts/{pf.name}: import 3D (story_2d thuần 2D)')
        if FORBIDDEN_PHOTO.search(pcode):
            err.append(f'src/parts/{pf.name}: dùng component ảnh thật / vệ tinh ({FORBIDDEN_PHOTO.search(pcode).group(1)})')
        if re.search(r'<text\b', pcode) or re.search(r'\bfontFamily\s*:', pcode):
            err.append(f'src/parts/{pf.name}: tự viết <text> hoặc fontFamily — bắt buộc dùng StoryText trong @skill/story_2d/cards')

    # 3. Kiểm tra từng cảnh src/scenes/*.tsx
    punch_count = 0
    for s in scenes:
        sid = s['id']
        stype = s.get('type', 'code')
        if stype != 'code':
            err.append(f'{sid}: type="{stype}" — trong story_2d mọi cảnh phải là type="code" (không chèn clip/still ngoài)')
            continue

        f = pdir / 'src/scenes' / f'{sid}.tsx'
        if not f.exists():
            err.append(f'{sid}: chưa có src/scenes/{sid}.tsx')
            continue

        code = strip_comments(f.read_text())
        if FORBIDDEN_3D.search(code):
            err.append(f'{sid}: import 3D (story_2d thuần 2D)')
        if FORBIDDEN_PHOTO.search(code):
            err.append(f'{sid}: dùng component ảnh thật ({FORBIDDEN_PHOTO.search(code).group(1)})')
        if re.search(r'<text\b', code) or re.search(r'\bfontFamily\s*:', code):
            err.append(f'{sid}: tự viết <text> hoặc fontFamily — dùng StoryText, BlackPunchCard, HudPill, RollingNumber, SpeechBubble, InWorldDoc')

        bcs = tags(code, ('BlackPunchCard',))
        punch_count += len(bcs)
        for _, bp in bcs:
            fm = re.search(r'\bfrom=\{([^}]+)\}|\bfrom=([0-9.]+)', bp)
            f_val = eval_num(fm.group(1) or fm.group(2), cues) if fm else s['from']
            if f_val is not None and (f_val < s['from'] - 0.15 or f_val > s['to'] + 0.15):
                err.append(f'{sid}: BlackPunchCard from={f_val:.2f}s nằm ngoài biên cảnh [{s["from"]:.2f}, {s["to"]:.2f}]')

    # 4. Kiểm âm thanh (mix.json + plan/sfx/*.json + sound_report.txt)
    mix = json.loads((pdir / 'plan/mix.json').read_text()) if (pdir / 'plan/mix.json').exists() else {}
    music = mix.get('music') or []
    if not music or all('synth' in str(m.get('key', '')) for m in music):
        warn.append('chưa có nhạc nền thật trong plan/mix.json — chọn nhạc nền theo skills/sound-design + skills/story_2d/SOUND.md')

    sfx_files = sorted((pdir / 'plan/sfx').glob('*.json')) if (pdir / 'plan/sfx').is_dir() else []
    sfx = []
    for sf in sfx_files:
        try:
            sfx += json.loads(sf.read_text()).get('sfx', [])
        except ValueError:
            err.append(f'plan/sfx/{sf.name}: JSON lỗi cú pháp')

    if not sfx:
        warn.append('chưa có SFX (plan/sfx/*.json trống) — đặt SFX bám sát chuyển động thực tế trong cảnh')
    else:
        for e in sfx:
            at = e.get('at', -1)
            if not (0 <= at <= dur):
                err.append(f"SFX {e.get('name')}: at={at} nằm ngoài thời lượng phim (0–{dur:.1f}s)")

    rep = pdir / '.build/sound_report.txt'
    if not rep.exists():
        warn.append(f'chưa trộn âm thanh: chạy .venv/bin/python core/tools/audio.py {pid}')
    else:
        srcs = [pdir / 'plan/mix.json', *sfx_files]
        if any(x.exists() and x.stat().st_mtime > rep.stat().st_mtime for x in srcs):
            warn.append('mix.json / plan/sfx/*.json mới sửa sau lần trộn gần nhất: chạy lại audio.py')
        left = [ln.strip() for ln in rep.read_text().splitlines() if '⚠' in ln]
        if left:
            warn.append(f'.build/sound_report.txt còn {len(left)} cảnh báo, vd: {left[0][:110]}')

    info.append(
        f'voice={voice_lang} · {len(scenes)} cảnh · {dur:.1f}s · {len(part_files)} parts riêng · '
        f'BlackPunchCard {punch_count} · SFX {len(sfx)}'
    )
    info.append(
        f'BẮT BUỘC AI Vision soi kỹ out/checks/scenes/*.png & sheet.png: '
        f'(1) 100% chữ đúng ngôn ngữ voice="{voice_lang}" & qua Phép thử Xoá Chữ (gỡ sạch nhãn thừa/nhại thoại/tượng thanh), '
        f'(2) diễn biến hành động thực chất theo lời đọc, (3) ánh sáng & điểm nối sạch.'
    )

    for x in err:
        print('✗ ' + x)
    for x in warn:
        print('⚠ ' + x)
    for x in info:
        print('i ' + x)
    print(f'\n{len(err)} lỗi, {len(warn)} cảnh báo' + (' — ĐẠT kiểm cấu trúc; chuyển sang bước AI Vision Audit trên ảnh lưới!' if not err and not warn else ''))
    if err or (warn and '--strict' in argv):
        sys.exit(1)


if __name__ == '__main__':
    main()
