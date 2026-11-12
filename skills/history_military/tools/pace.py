#!/usr/bin/env python3
"""Kiểm nhịp dựng và luật nguồn của một dự án history_military, đọc thẳng src/scenes/*.tsx. Chạy trước khi xuất.

    python3 skills/history_military/tools/pace.py <id>

Báo: số shot, độ dài trung bình / trung vị, shot quá dài (> 10 s, không phải thẻ) hay quá ngắn (< 1,2 s ngoài cụm cao trào),
khoảng thời gian trong cảnh không shot nào phủ (khung đen), shot thiếu dòng nguồn, điểm cắt rơi giữa câu (lệch > 0,6 s khỏi mọi
đầu câu / chỗ nghỉ của lời đọc), tỉ lệ thời lượng theo loại hình, số điểm nhấn vàng mỗi thẻ. Mốc <Shot from to> phải là số viết thẳng.
Thêm: độ đa dạng nguồn phim (một cuộn chiếm quá 45% thời lượng phim, hoặc ít hơn 3 cuộn), băng trích dẫn bị dùng làm phụ đề,
trang tài liệu quá ngắn để đọc, mật độ chữ, và âm thanh (thiếu tiếng nền, SFX đặt sai chỗ, tiếng bị chặt đuôi, một file lặp nhiều lần).
"""
import json
import re
import statistics
import sys

from _hm import ROOT

NUM = r'(-?\d+(?:\.\d+)?)'
KINDS = [('thẻ chữ đen', r'<(TitleCard|Interstitial|QuoteCard)\b'), ('thẻ số liệu', r'<(StatColumns|BarChart|Donut|TimelineCard|SplitPanel)\b'),
         ('trang tài liệu', r'<DocPage\b'), ('bản đồ', r'<(SatMap|ArchiveMap)\b'), ('phim tư liệu', r'<Clip\b'), ('ảnh tĩnh', r'<(Photo|PushToBlack)\b')]


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pdir = ROOT / 'projects' / sys.argv[1]
    tl = json.loads((pdir / 'plan/timeline.json').read_text(encoding='utf-8')) if (pdir / 'plan/timeline.json').exists() else None
    if not tl:
        sys.exit('chưa có plan/timeline.json: chạy build.py trước')
    tr = pdir / 'plan/transcript.json'
    starts = []
    pauses = []
    if tr.exists():
        ws = [w for s in json.loads(tr.read_text(encoding='utf-8'))['segments'] for w in s.get('words', [])]
        for i, w in enumerate(ws):
            if i == 0 or w['s'] - ws[i - 1]['e'] >= 0.3 or ws[i - 1]['w'].strip()[-1:] in '.?!,;:…':
                starts.append(w['s'])
            if i > 0 and w['s'] - ws[i - 1]['e'] >= 0.6:
                pauses.append((ws[i - 1]['e'], w['s']))
    shots, warn, kinds = [], [], {}
    reel, texted, quiet_max, bands = {}, 0.0, 0.0, 0
    amap = {a['id']: a for a in json.loads((pdir / 'assets/ASSETS.json').read_text(encoding='utf-8'))['assets']}
    for sc in tl['scenes']:
        f = pdir / 'src/scenes' / f"{sc['id']}.tsx"
        if not f.exists():
            warn.append(f"{sc['id']}: chưa có file cảnh"); continue
        src = f.read_text(encoding='utf-8')
        spans = []
        for m in re.finditer(r'<Shot\b([^>]*?)>', src, re.S):
            a = re.search(r'from=\{' + NUM + r'\}', m[1]); b = re.search(r'to=\{' + NUM + r'\}', m[1])
            if not a or not b:
                warn.append(f"{sc['id']}: <Shot> có from/to không phải số viết thẳng"); continue
            end = src.find('</Shot>', m.end())
            body = src[m.end():end if end > 0 else m.end()]
            kind = next((k for k, rx in KINDS if re.search(rx, body)), 'khác')
            spans.append((float(a[1]), float(b[1]), kind, 'credit=' in m[1] or bool(re.search(r'<(CardFooter|Credit)\b', body)), body, False))
        for m in re.finditer(r'<BeatMontage\b[^>]*?cuts=\{\[([^\]]+)\]\}', src, re.S):
            cs = [float(x) for x in re.findall(NUM, m[1])]
            spans += [(x, y, 'cao trào', True, '', True) for x, y in zip(cs, cs[1:])]
        spans.sort()
        cur = sc['from']
        for a, b, kind, credit, body, beat in spans:
            if a - cur > 0.06:
                warn.append(f"{sc['id']}: {cur:.2f}–{a:.2f} s không shot nào phủ (khung đen)")
            cur = max(cur, b)
            d = b - a
            kinds[kind] = kinds.get(kind, 0) + d
            shots.append(d)
            if not credit and kind != 'thẻ chữ đen':
                warn.append(f"{sc['id']} @{a:.2f}: shot {kind} thiếu credit (dòng nguồn)")
            if d > 10 and kind in ('phim tư liệu', 'ảnh tĩnh', 'khác'):
                warn.append(f"{sc['id']} @{a:.2f}: shot {kind} dài {d:.1f} s (> 10 s): chia theo vế câu")
            if d < 1.2 and not beat:
                warn.append(f"{sc['id']} @{a:.2f}: shot {d:.2f} s quá ngắn ngoài cụm cao trào")
            if starts and not beat and a > sc['from'] + 0.01 and min(abs(a - s) for s in starts) > 0.6 and not any(p0 - 0.2 <= a <= p1 + 0.2 for p0, p1 in pauses):
                warn.append(f"{sc['id']} @{a:.2f}: điểm cắt rơi giữa câu (cách đầu câu / chỗ nghỉ gần nhất {min(abs(a - s) for s in starts):.2f} s)")
            for cm in re.finditer(r"<Clip\b[^>]*?asset\('(a\d+)'\)", body):
                a_ = amap.get(cm[1], {}); key = a_.get('url') or re.sub(r'_\d+\.\w+$', '', a_.get('file', cm[1]))
                reel[key] = reel.get(key, 0) + d / max(1, len(re.findall(r'<Clip\b', body)))
            has_text = bool(re.search(r'<(QuoteBand|LowerLabel|StatColumns|BarChart|Donut|TimelineCard|DocPage|QuoteCard|PanelHead|ChapterMark)\b', body))
            texted += d if has_text else 0
            for qm in re.finditer(r'<QuoteBand\b[^>]*?text="([^"]*)"', body):
                bands += 1
                if not re.search(r'[“"«]', qm[1]) or not re.search(r'sub="[^"]{3,}"', body):
                    warn.append(f"{sc['id']} @{a:.2f}: QuoteBand không phải trích dẫn có nguồn (“{qm[1][:30]}…”): lời dẫn / ý tóm tắt thì dùng LowerLabel hoặc bỏ chữ")
            if kind == 'trang tài liệu' and d < 6:
                warn.append(f"{sc['id']} @{a:.2f}: trang tài liệu chỉ {d:.1f} s (< 6 s): không kịp đẩy vào, tô và đọc")
            hi = len(re.findall(r'\bhi: true|\bhi=', body))
            if hi > 1:
                warn.append(f"{sc['id']} @{a:.2f}: {hi} điểm nhấn vàng trong một thẻ (chỉ một)")
        if sc['to'] - cur > 0.06:
            warn.append(f"{sc['id']}: {cur:.2f}–{sc['to']:.2f} s cuối cảnh không shot nào phủ")
    if not shots:
        sys.exit('không tìm thấy <Shot> nào')
    tot = sum(shots)
    print(f"{len(shots)} shot / {tot:.0f} s · trung bình {tot / len(shots):.2f} s · trung vị {statistics.median(shots):.2f} s · {len(shots) / tot * 60:.1f} điểm cắt / phút")
    print('chuẩn: trung vị 4–6 s, 8–16 điểm cắt / phút')
    print('tỉ lệ: ' + ' · '.join(f'{k} {100 * v / tot:.0f}%' for k, v in sorted(kinds.items(), key=lambda kv: -kv[1])))
    print('chuẩn: phim + ảnh 55–65%, tài liệu ~10%, thẻ số liệu ~10%, bản đồ ~10%, thẻ đen ≤ 10%')
    # --- nguồn phim
    ftot = sum(reel.values())
    if ftot:
        print('nguồn phim: ' + ' · '.join(f"{k.rsplit('/', 1)[-1][:28]} {100 * v / ftot:.0f}%" for k, v in sorted(reel.items(), key=lambda kv: -kv[1])))
        top = max(reel.values()) / ftot
        need = 3 if ftot > 40 else 2
        if len(reel) < need:
            warn.append(f'chỉ {len(reel)} cuộn phim cho {ftot:.0f} s footage (cần ≥ {need}; phim dài ≥ 1 cuộn mỗi ~2,5 phút footage): tìm thêm nguồn khác góc nhìn')
        elif top > 0.45:
            warn.append(f'một cuộn chiếm {100 * top:.0f}% thời lượng phim (> 45%): thêm cuộn / ảnh khác, nhất là cận cảnh con người và phía bên kia')
    if kinds.get('ảnh tĩnh', 0) / tot < 0.05:
        warn.append('ảnh tĩnh < 5% thời lượng: thiếu chân dung / cận cảnh con người, ảnh vật chứng (vũ khí, văn bản)')
    # --- mật độ chữ
    print(f'shot có chữ: {100 * texted / tot:.0f}% thời lượng · {bands} băng trích dẫn')
    if tot > 240 and texted / tot > 0.5:
        warn.append(f'{100 * texted / tot:.0f}% thời lượng có chữ trên hình: phim dài cần khoảng lặng không chữ (mục 4b)')
    if bands > max(2, tot / 45):
        warn.append(f'{bands} băng trích dẫn trong {tot:.0f} s (tối đa ~1 mỗi 45 s): băng chỉ dành cho lời nói thật của một người / văn bản')
    # --- âm thanh
    mix = pdir / 'plan/mix.json'
    if mix.exists():
        m = json.loads(mix.read_text(encoding='utf-8'))
        ev = [e for f in sorted((pdir / 'plan/sfx').glob('*.json')) for e in json.loads(f.read_text(encoding='utf-8')).get('sfx', [])] if (pdir / 'plan/sfx').is_dir() else []
        legacy = [e for c in sorted((pdir / 'plan/chapters').glob('C*.json')) for e in json.loads(c.read_text(encoding='utf-8')).get('sfx', [])]
        if legacy:
            warn.append(f'{len(legacy)} SFX ghi trong plan/chapters/*.json ("sfx" dạng cũ): chuyển sang plan/sfx/CNN_k.json, để mảng đó trống')
        if not m.get('amb'):
            warn.append('mix.json không có "amb": thiếu tiếng nền liền mạch (gió rừng, ù phim cũ) nên mỗi SFX nghe như bật / tắt một file')
        if m.get('options', {}).get('word_dodge', False):
            warn.append('mix.json "word_dodge": true: tiếng bị băm theo từng chữ và đuôi nổ bị cắt khi lời vào lại; đặt false')
        seen = {}
        for e in ev + legacy:
            for l in e.get('layers', []):
                seen[l.get('key')] = seen.get(l.get('key'), 0) + 1
                big = e.get('duck') or re.search(r'nổ|pháo|bom|explos|blast|artill', e.get('name', ''), re.I)
                if big and l.get('align', 'peak') == 'peak' and l.get('fo', 0) < 1.5 and 'trim' in l:
                    warn.append(f"SFX @{e['at']} “{e.get('name', '')}”: tiếng nổ bị trim mà fo < 1,5 s: đuôi bị chặt; bỏ trim phần đuôi hoặc đặt fo 1,5–3")
                if l.get('align') == 'start' and 'trim' in l and l.get('fo', 0) < 0.8:
                    warn.append(f"SFX @{e['at']} “{e.get('name', '')}”: tiếng kéo dài bị cắt cứng ở cuối (fo < 0,8 s)")
            if (e.get('duck') or 0) and len(e.get('layers', [])) < 2:
                warn.append(f"SFX @{e['at']} “{e.get('name', '')}”: cú lớn chỉ 1 lớp: thêm thân tiếng / đuôi dội (2–3 lớp)")
        for k, n in seen.items():
            if n > 2:
                warn.append(f'file SFX {k} dùng {n} lần (tối đa 2): mỗi vụ nổ / sự kiện một tiếng riêng')
    for w in warn:
        print('⚠ ' + w)
    print('đạt' if not warn else f'{len(warn)} cảnh báo')


if __name__ == '__main__':
    main()
