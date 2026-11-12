#!/usr/bin/env python3
"""Tìm, lập mục lục và lấy nguồn tư liệu (phim, sách, ảnh) cho một video lịch sử quân sự. Chỉ lấy nguồn phạm vi công cộng / giấy phép mở.

    python3 skills/history_military/tools/src.py search "cedar falls 1967" "25th infantry cu chi" [--kind film|text|image] [-n 8]
        film/text: archive.org (kho NARA, Bộ Quốc phòng Mỹ, Big Picture, sử CMH, CIA…) · image: Wikimedia Commons. In: mã | năm | tên | giấy phép.
    python3 skills/history_military/tools/src.py index <mã_archive> [<mã> …]
        tải bản xem nhỏ vào library/footage/dl/<mã>/, dò điểm cắt, chụp contact sheet (mỗi ô = 1 shot của cuộn) → sheet_NN.jpg + INDEX.md (ô → giây).
        Agent XEM các sheet rồi viết library/footage/dl/<mã>/NOTES.md: mỗi dòng `giây đầu–cuối | cảnh gì | năm, nơi, đơn vị nếu phim có nói`.
    python3 skills/history_military/tools/src.py clip <id_dự_án> <mã_archive> 170.8:6 95.2:4 [--note "…"] [--pad 2]
        lấy đúng các đoạn `giây_bắt_đầu:độ_dài` ở bản gốc tốt nhất → projects/<id>/assets/footage (mã aNNN). File có sẵn `pad` giây đệm đầu:
        trong cảnh viết `in={pad}` để vào đúng giây đã chọn.
    python3 skills/history_military/tools/src.py text <mã_archive>
        tải PDF sách / báo cáo vào library/images/dl/docs/ → dùng tiếp với tools/pdf.py.
    python3 skills/history_military/tools/src.py image <id_dự_án> "File:Tên file trên Commons.jpg" [--note "…"] [--width 2400]
        tải ảnh từ Wikimedia Commons (kiểm giấy phép) → projects/<id>/assets/images.

TODO(nâng cấp tải) — phần này cố ý làm đơn giản, chủ dự án sẽ nâng cấp:
  - Nguồn: mới có archive.org + Commons. Chưa có NARA Catalog API (catalog.archives.gov, tìm theo mã 111-LC-…), DVIDS, AWM, IWM,
    CIA Reading Room / DTIC tìm trực tiếp, YouTube qua AutoSubs MCP (download_media) cho cuộn không có trên archive.org.
  - `index` tải cả bản xem nhỏ (70–130 MB mỗi cuộn) tuần tự; chưa tải song song nhiều cuộn, chưa tải tiếp khi đứt.
  - `clip` lấy đoạn bằng ffmpeg seek qua HTTP trên bản MPEG-2 gốc (≈25 s mỗi đoạn, 4 đoạn một lượt); chưa giữ bản gốc trong kho
    để cắt lại không cần mạng, chưa có khử nhiễu / nâng nét, chưa tự bù khi seek lệch.
  - Tìm kiếm chỉ theo từ khoá tên / mô tả; chưa tìm theo nội dung hình (mô tả shot trong NOTES.md của các cuộn đã lập mục lục).
"""
import concurrent.futures as cf
import re
import sys
from pathlib import Path

from _hm import DOCS, REELS, ROOT, download, duration, ff, flag, get_json, ingest, opt

ARCH = 'https://archive.org'
OPEN = re.compile(r'public ?domain|publicdomain|cc0|cc[- ]by(?![- ]n[cd])', re.I)  # PD, CC0, CC BY, CC BY-SA


def search(argv):
    kind, n = opt(argv, '--kind', 'film'), opt(argv, '-n', 8, int)
    for q in argv:
        print(f'== {q}  [{kind}]')
        if kind == 'image':
            d = get_json('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': q,
                         'gsrlimit': n, 'prop': 'imageinfo', 'iiprop': 'size|extmetadata', 'format': 'json'})
            for p in (d.get('query', {}).get('pages', {}) or {}).values():
                i = p['imageinfo'][0]; m = i.get('extmetadata', {})
                lic = m.get('LicenseShortName', {}).get('value', '?')
                print(f"  {'OK ' if OPEN.search(lic) else '!! '}{p['title']} | {i['width']}x{i['height']} | {lic} | {re.sub('<[^>]+>', '', m.get('DateTimeOriginal', {}).get('value', ''))[:20]}")
            continue
        mt = 'movies' if kind == 'film' else 'texts'
        d = get_json(f'{ARCH}/advancedsearch.php', {'q': f'({q}) AND mediatype:{mt}', 'fl[]': ['identifier', 'title', 'year', 'licenseurl', 'collection', 'downloads'],
                     'rows': n, 'sort[]': 'downloads desc', 'output': 'json'})
        for r in d['response']['docs']:
            col = r.get('collection'); col = col if isinstance(col, list) else [col]
            gov = any(c and re.search(r'fedflix|nationalarchives|prelinger|usgovfilms|military|cia|gov', c, re.I) for c in col) or r['identifier'].startswith('gov.')
            lic = r.get('licenseurl', '')
            mark = 'OK ' if OPEN.search(lic) or gov else '?  '   # '?' = phải tự kiểm quyền dùng trước khi lấy
            print(f"  {mark}{r['identifier']} | {r.get('year', '')} | {str(r.get('title'))[:80]} | {lic.split('/')[-3] if lic.count('/') > 3 else '-'}")


def files_of(ident):
    m = get_json(f'{ARCH}/metadata/{ident}')
    if 'files' not in m:
        sys.exit(f'không có mục {ident} trên archive.org')
    return m


def pick_video(m, best: bool):
    vids = [f for f in m['files'] if f['name'].lower().endswith(('.mp4', '.mpeg', '.mpg', '.mov', '.m4v', '.avi')) and f.get('size')]
    if not vids:
        sys.exit('mục này không có file video')
    key = lambda f: int(f['size'])
    if best:  # bản gốc: ưu tiên source=original, rồi tới file lớn nhất
        orig = [f for f in vids if f.get('source') == 'original']
        return max(orig or vids, key=key)
    small = [f for f in vids if f['name'].lower().endswith('.mp4')]
    return min(small or vids, key=key)


def index(argv):
    force = flag(argv, '--force')
    for ident in argv:
        d = REELS / ident
        if (d / 'INDEX.md').exists() and not force:
            print(f'{ident}: đã có mục lục → {d.relative_to(ROOT)}/INDEX.md'); continue
        m = files_of(ident)
        f = pick_video(m, best=False)
        prev = download(f'{ARCH}/download/{ident}/{f["name"]}', d / 'preview.mp4')
        dur = duration(prev)
        import subprocess
        r = subprocess.run(['ffmpeg', '-y', '-i', str(prev), '-vf', "select='gt(scene,0.3)',showinfo", '-an', '-f', 'null', '-'], capture_output=True, text=True)
        cuts = [0.0] + [float(x) for x in re.findall(r'pts_time:([0-9.]+)', r.stderr)] + [dur]
        shots = [(a, b) for a, b in zip(cuts, cuts[1:]) if b - a >= 0.7]   # bỏ chớp / khung lỗi
        cols, rows = 6, 5
        per = cols * rows
        tmp = d / 'tmp'; tmp.mkdir(exist_ok=True)
        for i, (a, b) in enumerate(shots):
            ff('-ss', f'{(a + b) / 2:.2f}', '-i', prev, '-frames:v', '1', '-vf', 'scale=320:240', '-q:v', '4', tmp / f'{i:04d}.jpg')
        lines = [f'# {m["metadata"].get("title", ident)}', '', f'- Mã: `{ident}` · {ARCH}/details/{ident}', f'- Dài {dur:.0f} s · {len(shots)} shot',
                 f'- Giấy phép: {m["metadata"].get("licenseurl", "xem trang nguồn")}', f'- Mô tả: {re.sub("<[^>]+>", " ", str(m["metadata"].get("description", "")))[:600]}', '',
                 'Mỗi ô của sheet là khung giữa của một shot, đọc từ trái sang phải, trên xuống dưới.', '']
        for s in range(0, len(shots), per):
            chunk = shots[s:s + per]
            sheet = d / f'sheet_{s // per + 1:02d}.jpg'
            ff('-start_number', s, '-i', tmp / '%04d.jpg', '-frames:v', '1', '-vf', f'tile={cols}x{rows}:padding=4:color=white', '-q:v', '4', sheet)
            lines.append(f'## {sheet.name}')
            for r0 in range(0, len(chunk), cols):
                lines.append('  '.join(f'{a:.1f}–{b:.1f}' for a, b in chunk[r0:r0 + cols]))
            lines.append('')
        for p in tmp.iterdir(): p.unlink()
        tmp.rmdir()
        (d / 'INDEX.md').write_text('\n'.join(lines), encoding='utf-8')
        print(f'{ident}: {dur:.0f} s, {len(shots)} shot → {d.relative_to(ROOT)}/INDEX.md + sheet_*.jpg  (xem sheet rồi viết NOTES.md)')


def clip(argv):
    note, pad = opt(argv, '--note', ''), opt(argv, '--pad', 2.0, float)
    pid, ident, spans = argv[0], argv[1], argv[2:]
    m = files_of(ident)
    f = pick_video(m, best=True)
    url = f'{ARCH}/download/{ident}/{f["name"]}'
    title = m['metadata'].get('title', ident)
    out_dir = ROOT / 'projects' / pid / 'input'
    out_dir.mkdir(parents=True, exist_ok=True)

    def one(span):
        a, dlen = (float(x) for x in span.split(':'))
        start = max(0.0, a - pad)
        out = out_dir / f"{re.sub(r'[^a-z0-9]+', '_', ident.lower())[-24:]}_{int(a):05d}.mp4"
        # yadif: bản MPEG-2 của NARA thường xen kẽ dòng; ép điểm ảnh vuông, cao 720
        ff('-ss', f'{start:.2f}', '-i', url, '-t', f'{dlen + (a - start) + pad:.2f}', '-an', '-vf', 'yadif,scale=-2:720:flags=lanczos,setsar=1', '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', out)
        return span, a - start, out

    with cf.ThreadPoolExecutor(4) as ex:
        done = list(ex.map(one, spans))
    for span, lead, out in done:  # ingest tuần tự: ASSETS.json không chịu ghi song song
        code = ingest(pid, out, 'footage', 'archive.org', f'{ARCH}/details/{ident}', f'{title} · từ giây {span.split(":")[0]} · {note}'.strip(' ·'))
        out.unlink(missing_ok=True)
        print(f'{code}  {ident} @{span}  → trong cảnh: <Clip src={{asset(\'{code}\')}} in={{{lead:.2f}}} />')


def text(argv):
    for ident in argv:
        m = files_of(ident)
        pdfs = [f for f in m['files'] if f['name'].lower().endswith('.pdf')]
        if not pdfs:
            print(f'{ident}: không có PDF'); continue
        f = max(pdfs, key=lambda f: int(f.get('size', 0)))
        p = download(f'{ARCH}/download/{ident}/{f["name"]}', DOCS / f'{ident}.pdf')
        print(f'{p.relative_to(ROOT)}  ← {m["metadata"].get("title", ident)}  ({ARCH}/details/{ident})')


def image(argv):
    note, width = opt(argv, '--note', ''), opt(argv, '--width', 2400, int)
    pid, title = argv[0], argv[1] if argv[1].startswith('File:') else 'File:' + argv[1]
    d = get_json('https://commons.wikimedia.org/w/api.php', {'action': 'query', 'titles': title, 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': width, 'format': 'json'})
    p = next(iter(d['query']['pages'].values()))
    if 'imageinfo' not in p:
        sys.exit(f'không thấy {title} trên Commons')
    i = p['imageinfo'][0]
    lic = i['extmetadata'].get('LicenseShortName', {}).get('value', '?')
    if not OPEN.search(lic):
        sys.exit(f'giấy phép "{lic}" không thuộc nhóm dùng được (PD / CC0 / CC BY / CC BY-SA): không tải')
    name = re.sub(r'[^A-Za-z0-9]+', '_', title[5:].rsplit('.', 1)[0])[:60] + '.jpg'
    out = download(i.get('thumburl') or i['url'], ROOT / 'projects' / pid / 'input' / name)
    artist = re.sub('<[^>]+>', '', i['extmetadata'].get('Artist', {}).get('value', ''))[:80]
    code = ingest(pid, out, 'image', 'commons', f'https://commons.wikimedia.org/wiki/{title.replace(" ", "_")}', f'{title[5:]} · {artist} · {note}'.strip(' ·'), lic)
    out.unlink(missing_ok=True)
    print(f'{code}  {title}  [{lic}]' + ('' if lic.lower().startswith('public') else '  ← CC BY: phải ghi tên tác giả trong dòng nguồn'))


if __name__ == '__main__':
    cmds = {'search': search, 'index': index, 'clip': clip, 'text': text, 'image': image}
    if len(sys.argv) < 3 or sys.argv[1] not in cmds:
        sys.exit(__doc__)
    cmds[sys.argv[1]](sys.argv[2:])
