#!/usr/bin/env python3
"""Tìm và lấy ẢNH tư liệu thật từ mọi nguồn trên web cho video military-2d. Không chặn theo giấy phép: chỉ lọc theo chất lượng
(đủ lớn, không watermark, không trùng) và GHI LẠI nguồn + mức rủi ro bản quyền vào ASSETS.json để người dùng tự quyết.

    python3 skills/military-2d/tools/img.py search "khe sanh 1968 marines" "general giap portrait" [-n 12] [--engine bing,commons,openverse]
            [--site dvidshub.net] [--min 1000] [--stock]
        Mỗi câu tìm → library/images/dl/search/<slug>/: sheet.jpg (lưới 6 cột, đọc trái sang phải, trên xuống dưới), INDEX.md (ô → số thứ tự,
        kích thước, trang gốc, cờ rủi ro), cands.json. Agent PHẢI mở sheet.jpg xem rồi mới chọn (chú thích ảnh quân sự trên mạng sai rất nhiều).
        --site: bó trong một trang (archives.gov, loc.gov, awm.gov.au, history.army.mil …). Tuỳ Bing có lập chỉ mục ảnh của trang đó hay không:
                không ra kết quả thì bỏ --site và thêm tên kho vào câu tìm ("… NARA", "… DVIDS", "… Bundesarchiv").
        --min:  bề ngang tối thiểu (px) khi máy tìm kiếm có cho biết kích thước. --stock: giữ cả kho ảnh có watermark (mặc định bỏ).
    python3 skills/military-2d/tools/img.py get <id_dự_án> <slug>:3,7 [<slug2>:1 …] [--note "…"] [--tags portrait,1968]
    python3 skills/military-2d/tools/img.py get <id_dự_án> https://…/anh.jpg [--page https://trang-goc] [--note "…"]
        Tải bản lớn nhất → projects/<id>/assets/images (mã aNNN), ghi url trang gốc, giấy phép nếu biết (không biết: "unknown"),
        gắn tag `risk` khi ảnh của hãng thông tấn / kho ảnh trả phí. Trang chặn tải tự động: lệnh báo lỗi, đổi ứng viên khác
        hoặc mở trang gốc bằng trình duyệt, lưu ảnh vào projects/<id>/input/ rồi chạy core/tools/ingest.py kèm --url.
    python3 skills/military-2d/tools/img.py cutout <id_dự_án> a006 [a007 …]
        Tách chủ thể (người, khí tài) khỏi nền bằng Vision của macOS → PNG nền trong suốt, mã aNNN mới (tag `cutout`, giữ nguồn của ảnh gốc).
        Dùng cho <PersonCutout> (kiểu cắt giấy). Xem lại ảnh tách: tóc / mũ / vai bị khuyết thì đổi ảnh gốc có nền đơn giản hơn.
"""
import concurrent.futures as cf
import html
import json
import re
import subprocess
import sys
import time
import urllib.parse
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
CACHE = ROOT / 'library/images/dl/search'
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
ENGINES = ('bing', 'commons', 'openverse')   # DuckDuckGo / Google / Yandex trả thử thách chống bot: không dùng
# kho ảnh in watermark lên bản xem thử: bỏ vì chất lượng (không phải vì giấy phép)
WATERMARK = re.compile(r'alamy|shutterstock|gettyimages|istockphoto|dreamstime|depositphotos|123rf|agefotostock|bigstock|adobe\.com|stock\.adobe|'
                       r'granger|bridgemanimages|mediastorehouse|pixers|fineartamerica|pinterest|pinimg|ebay|ebayimg|amazon|etsy|redbubble', re.I)
# hãng thông tấn / báo ảnh: hay khiếu nại bản quyền nhất khi đăng video → gắn tag risk
RISK = re.compile(r'apnews|ap\.org|apimages|reuters|afp\.com|epa\.eu|nytimes|washingtonpost|theguardian|bbc\.|cnn\.|time\.com|life\.com|'
                  r'magnumphotos|nationalgeographic|wsj\.com|bloomberg|spiegel|lemonde|corbis|ullstein|akg-images|topfoto|sputnik|tass', re.I)
OPEN = re.compile(r'public ?domain|publicdomain|pdm|cc0|cc[- ]?by', re.I)
COLS = 6


def curl(url, *extra, timeout=40, binary=False):
    r = subprocess.run(['curl', '-sL', '--fail', '--compressed', '-m', str(timeout), '-A', UA, *extra, url], capture_output=True)
    if r.returncode:
        return None
    return r.stdout if binary else r.stdout.decode('utf-8', 'ignore')


def host_of(url):
    return re.sub(r'^www\.', '', urllib.parse.urlparse(url or '').netloc.lower())


def q(params):
    return urllib.parse.urlencode(params)


def opt(argv, key, default=None, cast=str):
    if key in argv:
        i = argv.index(key)
        v = cast(argv[i + 1])
        del argv[i:i + 2]
        return v
    return default


def flag(argv, key):
    if key in argv:
        argv.remove(key)
        return True
    return False


def slug(s, n=48):
    return re.sub(r'[^a-z0-9]+', '_', s.lower()).strip('_')[:n] or 'q'


# ---------------------------------------------------------------- máy tìm kiếm (mỗi hàm trả list ứng viên, lỗi thì trả [])

def bing(query, n, min_w):
    size = '+filterui:imagesize-wallpaper' if min_w >= 1600 else '+filterui:imagesize-large' if min_w >= 800 else ''
    found = []
    for _ in range(3):  # Bing đôi lúc trả trang rỗng (nhất là câu có site:): thử lại vài lần
        page = curl('https://www.bing.com/images/search?' + q({'q': query, 'form': 'HDRSC2', 'first': 1, 'count': max(n * 2, 35), 'qft': size, 'adlt': 'strict'}))
        found = re.findall(r'class="iusc"[^>]*?\bm="([^"]+)"', page or '')
        if found:
            break
        time.sleep(1.2)
    out = []
    for m in found:
        try:
            d = json.loads(html.unescape(m))
        except ValueError:
            continue
        if d.get('murl'):
            out.append({'img': d['murl'], 'thumb': d.get('turl'), 'page': d.get('purl'), 'title': d.get('t', ''), 'engine': 'bing'})
    return out


def commons(query, n, min_w):
    raw = curl('https://commons.wikimedia.org/w/api.php?' + q({'action': 'query', 'generator': 'search', 'gsrnamespace': 6, 'gsrsearch': query, 'gsrlimit': n,
               'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata', 'iiurlwidth': 2400, 'format': 'json'}))
    try:
        pages = (json.loads(raw or '{}').get('query', {}).get('pages', {}) or {}).values()
    except ValueError:
        return []
    out = []
    for p in sorted(pages, key=lambda p: p.get('index', 0)):
        i = (p.get('imageinfo') or [{}])[0]
        if not i.get('url') or not re.search(r'\.(jpe?g|png|tiff?|webp|gif)$', p['title'], re.I):
            continue
        meta = i.get('extmetadata', {})
        out.append({'img': i.get('thumburl') or i['url'], 'thumb': re.sub(r'/\d+px-', '/400px-', i['thumburl']) if i.get('thumburl') else i['url'],
                    'page': i.get('descriptionurl'), 'title': p['title'][5:], 'w': i.get('width'), 'h': i.get('height'),
                    'license': meta.get('LicenseShortName', {}).get('value'), 'author': re.sub('<[^>]+>', '', meta.get('Artist', {}).get('value', ''))[:80].strip(),
                    'engine': 'commons'})
    return out


def openverse(query, n, min_w):
    raw = curl('https://api.openverse.org/v1/images/?' + q({'q': query, 'page_size': min(n, 20)}), '-H', 'Accept: application/json')
    try:
        res = json.loads(raw or '{}').get('results', [])
    except ValueError:
        return []
    return [{'img': r['url'], 'thumb': r.get('thumbnail') or r['url'], 'page': r.get('foreign_landing_url'), 'title': r.get('title') or '', 'w': r.get('width'),
             'h': r.get('height'), 'license': f"{r.get('license', '')} {r.get('license_version') or ''}".strip(), 'author': r.get('creator') or '',
             'engine': 'openverse'} for r in res if r.get('url')]


# ---------------------------------------------------------------- search

def thumb(c, dest: Path):
    """Tải ảnh xem thử và ép về ô 320x240 (đệm xám). Trả True nếu được."""
    for url in (c.get('thumb'), c.get('img')):
        if not url:
            continue
        raw = curl(url, '-e', c.get('page') or url, timeout=25, binary=True)
        if not raw or len(raw) < 800:
            continue
        tmp = dest.with_suffix('.raw')
        tmp.write_bytes(raw)
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-frames:v', '1', '-vf',
                            'scale=320:240:force_original_aspect_ratio=decrease,pad=320:240:(ow-iw)/2:(oh-ih)/2:color=0x202020', '-q:v', '4', str(dest)],
                           capture_output=True)
        tmp.unlink(missing_ok=True)
        if r.returncode == 0 and dest.exists():
            return True
    return False


def _search_one(query, site, engines, fns, n, min_w, stock):
    full = f'{query} site:{site}' if site else query
    with cf.ThreadPoolExecutor(len(engines)) as ex:
        got = dict(zip(engines, ex.map(lambda e: fns[e](query if e in ('commons', 'openverse') else full, n, 0 if site else min_w), engines)))
    if site:  # chỉ giữ ứng viên đúng trang (commons / openverse không hiểu site:, Bing đôi lúc trả kết quả lạc đề)
        for e in engines:
            got[e] = [c for c in got.get(e, []) if site in host_of(c.get('page')) or site in host_of(c['img'])]
    # xen kẽ các máy để không máy nào chiếm hết chỗ; bỏ trùng url, watermark, ảnh nhỏ
    merged, seen = [], set()
    for k in range(max((len(v) for v in got.values()), default=0)):
        for e in engines:
            if k >= len(got[e]):
                continue
            c = got[e][k]
            key = re.sub(r'[?#].*$', '', c['img'])
            if key in seen or not re.match(r'https?://', c['img']):
                continue
            seen.add(key)
            hosts = f"{host_of(c['img'])} {host_of(c.get('page'))}"
            if not stock and WATERMARK.search(hosts):
                continue
            if c.get('w') and c['w'] < min_w:
                continue
            c['host'] = host_of(c.get('page')) or host_of(c['img'])
            c['risk'] = bool(RISK.search(hosts))
            merged.append(c)
    d = CACHE / slug(full)
    d.mkdir(parents=True, exist_ok=True)
    for old in d.glob('*.jpg'):
        old.unlink()
    pool = merged[:n * 2]
    with cf.ThreadPoolExecutor(8) as ex:
        ok = list(ex.map(lambda ic: thumb(ic[1], d / f't{ic[0]:03d}.jpg'), enumerate(pool)))
    keep = [c for c, good in zip(pool, ok) if good][:n]
    for i, f in enumerate(sorted(p for p, good in zip([d / f't{i:03d}.jpg' for i in range(len(pool))], ok) if good)[:n]):
        f.rename(d / f'{i + 1:03d}.jpg')
    for f in d.glob('t*.jpg'):
        f.unlink()
    counts = ' '.join(f'{e}:{len(got[e])}' for e in engines)
    if not keep:
        return f'== {full}: không có ứng viên ({counts}) — đổi từ khoá (tiếng Anh, thêm năm / địa danh / tên đơn vị) hoặc đổi --engine'
    rows = -(-len(keep) // COLS)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-start_number', '1', '-i', str(d / '%03d.jpg'), '-frames:v', '1', '-vf',
                    f'tile={COLS}x{rows}:padding=6:color=white', '-q:v', '3', str(d / 'sheet.jpg')], capture_output=True)
    for i, c in enumerate(keep, 1):
        c['n'] = i
    (d / 'cands.json').write_text(json.dumps({'query': full, 'cands': keep}, ensure_ascii=False, indent=1))
    lines = [f'# {full}', '', f'Lưới {COLS} cột: ô số 1 ở góc trên trái, đọc trái sang phải, trên xuống dưới. Lấy: `img.py get <id> {d.name}:<số>`', '',
             '| # | hàng,cột | kích thước | trang gốc | giấy phép | cờ | tiêu đề |', '|---|---|---|---|---|---|---|']
    for c in keep:
        size = f"{c['w']}x{c['h']}" if c.get('w') else '?'
        lines.append(f"| {c['n']} | {(c['n'] - 1) // COLS + 1},{(c['n'] - 1) % COLS + 1} | {size} | {c['host']} | {c.get('license') or '?'} | "
                     f"{'RISK' if c['risk'] else ''} | {c['title'][:90].replace('|', '/')} |")
    (d / 'INDEX.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
    out_lines = [f'== {full}: {len(keep)} ứng viên ({counts}) → {d.relative_to(ROOT)}/sheet.jpg + INDEX.md']
    for c in keep:
        size = f"{c['w']}x{c['h']}" if c.get('w') else '?'
        out_lines.append(f"  {c['n']:>2} {'!' if c['risk'] else ' '} {size:<11} {c['host'][:28]:<28} {c['title'][:70]}")
    return '\n'.join(out_lines)


def search(argv):
    n, min_w, stock = opt(argv, '-n', 12, int), opt(argv, '--min', 1000, int), flag(argv, '--stock')
    site = opt(argv, '--site')
    jobs = opt(argv, '-j', 4, int)
    engines = [e for e in (opt(argv, '--engine') or ','.join(ENGINES)).split(',') if e]
    bad = [e for e in engines if e not in ENGINES]
    if bad or not argv:
        sys.exit(f'máy tìm kiếm không có: {bad} (có: {", ".join(ENGINES)})' if bad else __doc__)
    fns = {'bing': bing, 'commons': commons, 'openverse': openverse}
    with cf.ThreadPoolExecutor(max(1, min(jobs, len(argv)))) as ex:
        for report in ex.map(lambda q_str: _search_one(q_str, site, engines, fns, n, min_w, stock), argv):
            print(report, flush=True)


# ---------------------------------------------------------------- get

def probe_size(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0:s=x', str(path)],
                         capture_output=True, text=True).stdout.strip()
    m = re.match(r'(\d+)x(\d+)', out)
    return (int(m.group(1)), int(m.group(2))) if m else (0, 0)


def fetch(c, dest_dir: Path, name: str):
    """Tải bản lớn về dest_dir/<name>.jpg (chuẩn hoá JPEG, cạnh dài tối đa 3600). Trả (path, w, h) hoặc None."""
    raw = None
    for ref in (c.get('page'), c['img'], None):
        args = ('-e', ref) if ref else ()
        raw = curl(c['img'], *args, '-H', 'Accept: image/avif,image/webp,image/*,*/*;q=0.8', timeout=90, binary=True)
        if raw and len(raw) > 4000 and not raw[:200].lstrip().lower().startswith((b'<!doc', b'<html')):
            break
        raw = None
    if not raw:
        return None
    dest_dir.mkdir(parents=True, exist_ok=True)
    tmp, out = dest_dir / f'{name}.raw', dest_dir / f'{name}.jpg'
    tmp.write_bytes(raw)
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-frames:v', '1', '-vf',
                        "scale='min(3600,iw)':'min(3600,ih)':force_original_aspect_ratio=decrease:flags=lanczos", '-q:v', '2', str(out)], capture_output=True)
    tmp.unlink(missing_ok=True)
    if r.returncode or not out.exists():
        out.unlink(missing_ok=True)
        return None
    w, h = probe_size(out)
    return out, w, h


def get(argv):
    note, tags, page = opt(argv, '--note', ''), opt(argv, '--tags', ''), opt(argv, '--page')
    if len(argv) < 2:
        sys.exit(__doc__)
    pid, refs = argv[0], argv[1:]
    pdir = ROOT / 'projects' / pid
    if not (pdir / 'project.json').exists():
        sys.exit(f'chưa có dự án projects/{pid}')
    todo = []
    for ref in refs:
        if re.match(r'https?://', ref):
            hosts = f'{host_of(ref)} {host_of(page)}'
            todo.append({'img': ref, 'page': page or ref, 'title': Path(urllib.parse.urlparse(ref).path).stem, 'host': host_of(page) or host_of(ref),
                         'risk': bool(RISK.search(hosts))})
            continue
        s, _, nums = ref.partition(':')
        f = CACHE / s / 'cands.json'
        if not f.exists() or not nums:
            sys.exit(f'không hiểu "{ref}": cần <slug>:<số>[,<số>] của một lần search (thư mục trong {CACHE.relative_to(ROOT)}/) hoặc một url ảnh')
        by = {c['n']: c for c in json.loads(f.read_text())['cands']}
        for k in nums.split(','):
            if int(k) not in by:
                sys.exit(f'{s} không có ô số {k} (có 1–{len(by)})')
            todo.append(by[int(k)])
    # Tải và chuẩn hoá song song mọi ảnh trước, sau đó mới gọi ingest.py tuần tự để không tranh chấp mã aNNN trong ASSETS.json
    names = [f"{i:02d}_{slug(c.get('title') or 'image', 36)}_{slug(host_of(c['img']), 14)}" for i, c in enumerate(todo)]
    with cf.ThreadPoolExecutor(max(1, min(6, len(todo)))) as ex:
        fetched = list(ex.map(lambda cn: fetch(cn[0], pdir / 'input', cn[1]), zip(todo, names)))
    for c, got in zip(todo, fetched):
        if not got:
            print(f"!! không tải được: {c['img']}\n   trang gốc: {c.get('page')}\n   → chọn ô khác, hoặc mở trang gốc bằng trình duyệt, lưu ảnh vào projects/{pid}/input/ "
                  f"rồi: python3 core/tools/ingest.py {pid} projects/{pid}/input/<file> --kind image --source {c.get('host')} --url \"{c.get('page')}\"")
            continue
        out, w, h = got
        lic = c.get('license') or 'unknown'
        tg = sorted({t for t in tags.split(',') if t} | ({'risk'} if c.get('risk') else set()) | (set() if OPEN.search(lic) else {'license-unknown'}))
        nt = ' · '.join(x for x in (c.get('title', '')[:120], c.get('author', ''), note) if x)
        cmd = [sys.executable, str(ROOT / 'core/tools/ingest.py'), pid, str(out), '--kind', 'image', '--source', c.get('host') or 'web', '--url', c.get('page') or c['img'],
               '--license', lic, '--note', nt]
        if tg:
            cmd += ['--tags', ','.join(tg)]
        r = subprocess.run(cmd, capture_output=True, text=True)
        out.unlink(missing_ok=True)
        if r.returncode:
            print('!! ingest lỗi: ' + (r.stderr or r.stdout).strip()[-300:])
            continue
        code = r.stdout.strip().split()[0]
        warn = '  ← RISK: ảnh hãng thông tấn / báo, dễ bị khiếu nại bản quyền' if c.get('risk') else ''
        small = '  ← NHỎ: chỉ dùng làm ảnh ghim / thẻ nhân vật, không phóng toàn khung' if max(w, h) < 1500 else ''
        print(f"{code}  {w}x{h}  [{lic}]  {c.get('host')}  {c.get('title', '')[:60]}{warn}{small}")


# ---------------------------------------------------------------- cutout

def cutout(argv):
    if len(argv) < 2:
        sys.exit(__doc__)
    pid, ids = argv[0], argv[1:]
    pdir = ROOT / 'projects' / pid
    book = json.loads((pdir / 'assets/ASSETS.json').read_text())
    by = {a['id']: a for a in book['assets']}
    src, exe = Path(__file__).with_name('cutout.swift'), ROOT / '.cache/military-2d/cutout'
    if not exe.exists() or exe.stat().st_mtime < src.stat().st_mtime:
        exe.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(['swiftc', '-O', str(src), '-o', str(exe)], capture_output=True, text=True)
        if r.returncode:
            sys.exit('không biên dịch được cutout.swift (cần macOS 14+ và Xcode Command Line Tools):\n' + r.stderr[-600:])
    for aid in ids:
        a = by.get(aid)
        if not a or a.get('kind') != 'image':
            print(f'!! {aid}: không phải ảnh trong ASSETS.json'); continue
        f = pdir / 'assets' / a['file']
        out = pdir / 'input' / f'{f.stem[:44]}_cut.png'
        out.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run([str(exe), str(f), str(out)], capture_output=True, text=True)
        if not r.stdout.startswith('OK') or not out.exists():
            print(f'!! {aid}: {r.stdout.strip() or r.stderr.strip()[-200:]}'); continue
        cmd = [sys.executable, str(ROOT / 'core/tools/ingest.py'), pid, str(out), '--kind', 'image', '--source', a.get('source') or 'web', '--url', a.get('url') or '',
               '--license', a.get('license') or 'unknown', '--note', f"tách nền từ {aid} · {a.get('note', '')}"[:200],
               '--tags', ','.join(sorted(set(a.get('tags', [])) | {'cutout'}))]
        g = subprocess.run(cmd, capture_output=True, text=True)
        out.unlink(missing_ok=True)
        if g.returncode:
            print('!! ingest lỗi: ' + (g.stderr or g.stdout).strip()[-300:]); continue
        print(f"{g.stdout.strip().split()[0]}  ← tách nền từ {aid}  {r.stdout.strip()[3:]}")


if __name__ == '__main__':
    cmds = {'search': search, 'get': get, 'cutout': cutout}
    if len(sys.argv) < 3 or sys.argv[1] not in cmds:
        sys.exit(__doc__)
    cmds[sys.argv[1]](sys.argv[2:])
