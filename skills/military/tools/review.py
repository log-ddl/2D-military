#!/usr/bin/env python3
"""Bộ kiểm tra ràng buộc cấu trúc & dữ liệu riêng của skill military (Remotion 2D/3D):
Chỉ bắt các luật kỹ thuật / cấu trúc thuộc skill military mà mắt nhìn ảnh lưới không tự thấy hết;
phần bố cục, tiếp xúc mặt sàn, ánh sáng, chồng lấn và 100% ngôn ngữ chữ trên hình do AI Vision soi trực tiếp trên ảnh `out/checks/`.

    python3 skills/military/tools/review.py <id> [--strict]

✗ = vi phạm luật cứng (thoát mã 1) · ⚠ = cần xử lý âm thanh / dữ liệu · i = thông tin tóm tắt.
- Không tự viết thẻ `<text>` thô hay ép `fontFamily` trong `src/scenes/` và `src/parts/` (dùng `<Label>`, `<Callout>`, `<Measure3D>`, `<MapLabel>`).
- Không dùng `<Trail>` (ống vệt sáng giả làm đạn/khói đầu cánh — quy tắc mục 5 SKILL.md).
- Mọi mã `asset('aNNN')` dùng trong `scenes/` và `parts/` đều tồn tại trong `ASSETS.json`.
- Âm thanh: đủ nhạc nền + SFX hợp lệ trong thời lượng phim và đã trộn `audio.py` mới nhất.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]


def strip_comments(code: str) -> str:
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', code)


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
    tr_path = pdir / 'plan/transcript.json'
    tr_data = json.loads(tr_path.read_text()) if tr_path.exists() else {}
    voice_lang = tr_data.get('lang') or tr_data.get('language') or '?'
    scenes = tl['scenes']
    dur = tl['duration']

    err, warn, info = [], [], []
    n_3d, n_2d = 0, 0

    # 1. Kiểm tra src/parts/*.tsx
    if (pdir / 'src/parts').is_dir():
        for pf in sorted((pdir / 'src/parts').glob('*.ts*')):
            pcode = strip_comments(pf.read_text())
            if re.search(r'<text\b', pcode) or re.search(r'\bfontFamily\s*:', pcode):
                err.append(f'src/parts/{pf.name}: tự viết <text> hoặc fontFamily — dùng Label, Callout, Measure3D, MapLabel')
            for m in re.finditer(r"asset\('(a\d+)'\)", pcode):
                if m.group(1) not in book:
                    err.append(f"src/parts/{pf.name}: asset('{m.group(1)}') không có trong ASSETS.json")

    # 2. Kiểm tra từng cảnh src/scenes/*.tsx
    for s in scenes:
        sid = s['id']
        if s.get('type', 'code') != 'code':
            continue
        f = pdir / 'src/scenes' / f'{sid}.tsx'
        if not f.exists():
            err.append(f'{sid}: chưa có src/scenes/{sid}.tsx')
            continue

        code = strip_comments(f.read_text())
        is_3d = bool(re.search(r'@skill/military/3d/|@react-three|three', code))
        if is_3d:
            n_3d += 1
        else:
            n_2d += 1

        if re.search(r'<text\b', code) or re.search(r'\bfontFamily\s*:', code):
            err.append(f'{sid}: tự viết <text> hoặc fontFamily — bắt buộc dùng Label, Callout, Measure3D, MapLabel')
        if re.search(r'<Trail\b', code):
            err.append(f'{sid}: dùng <Trail> (cấm dùng ống vệt sáng giả làm đạn/vệt đầu cánh — dùng MuzzleBlast + Explosion)')
        for m in re.finditer(r"asset\('(a\d+)'\)", code):
            if m.group(1) not in book:
                err.append(f"{sid}: asset('{m.group(1)}') không có trong ASSETS.json")

    # 3. Kiểm âm thanh (mix.json + plan/sfx/*.json + sound_report.txt)
    mix = json.loads((pdir / 'plan/mix.json').read_text()) if (pdir / 'plan/mix.json').exists() else {}
    music = mix.get('music') or []
    if not music or all('synth' in str(m.get('key', '')) for m in music):
        warn.append('chưa có nhạc nền thật trong plan/mix.json — gọi agent nhạc nền theo skills/sound-design + skills/military/SOUND.md')
    if not mix.get('amb'):
        warn.append('mix.json chưa có lớp tiếng nền `amb` liền mạch')

    sfx_files = sorted((pdir / 'plan/sfx').glob('*.json')) if (pdir / 'plan/sfx').is_dir() else []
    sfx = []
    for sf in sfx_files:
        try:
            sfx += json.loads(sf.read_text()).get('sfx', [])
        except ValueError:
            err.append(f'plan/sfx/{sf.name}: JSON lỗi cú pháp')

    if not sfx:
        warn.append('chưa có SFX (plan/sfx/*.json trống) — gọi agent SFX sau khi cảnh đã dựng xong .tsx')
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

    info.append(f'voice={voice_lang} · {len(scenes)} cảnh (3D: {n_3d}, 2D: {n_2d}) · {dur:.1f}s · SFX {len(sfx)}')
    info.append(
        f'BẮT BUỘC AI Vision soi kỹ out/checks/parts/*.png, scenes/*.png & sheet.png: '
        f'(1) 100% chữ hiển thị/vỏ mô hình đúng ngôn ngữ voice="{voice_lang}", '
        f'(2) bánh/chân không lún sàn, không che chữ/thước đo, (3) bối cảnh ngày/đêm & vật lý khớp lời đọc.'
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
