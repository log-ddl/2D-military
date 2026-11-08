#!/usr/bin/env python3
"""Kho âm thanh dùng chung: tìm → tải → đo → ghi danh mục. Mọi dự án dùng lại, càng làm càng ít phải tải.

    python3 core/tools/sound_lib.py search "<q1>" ["<q2>" ...] [--music] [--max 5] [-n 8] [-j 4] [--online]
    .venv/bin/python core/tools/sound_lib.py get fs:123 mk:456 [-j 6] [--music]   tải song song về library/<sfx|music>/dl/, đo, ghi INDEX.json
    .venv/bin/python core/tools/sound_lib.py scan                             đưa file người dùng tự bỏ vào library/ vào danh mục
    python3 core/tools/sound_lib.py show fs:123                      xem bản ghi
    .venv/bin/python core/tools/sound_lib.py add es:<uuid>[:drums] --url "<link MCP>" [--music] --title "…" --author "…" [--stem drums]
                                                                     nhận file Epidemic (agent lấy link bằng MCP Download*) → library/<loại>/epidemic/

Thứ tự nguồn khi search: kho library/ (đã có, không tốn mạng) → Freesound (CHỈ CC0) → Mixkit (license Mixkit, không cần ghi tên).
Mặc định chỉ tìm online khi kho không đủ n kết quả; --online để luôn hỏi thêm.
Khoá: fs:<id> Freesound · mk:<id> Mixkit SFX · mkm:<id> Mixkit nhạc · lib:<đường dẫn> file người dùng ·
      es:<uuid> Epidemic (es:<uuid>:drums|bass|instruments = stem, es-edit:<editId> = bản Epidemic tự dựng).
Epidemic (trả phí theo gói, KHÔNG chia sẻ file) chỉ dùng khi người dùng chọn: search thêm --epidemic mới thấy trong kho.
Danh mục: library/sfx/INDEX.json, library/music/INDEX.json (vào git); file âm thanh không vào git. Cần ffmpeg; đo cần numpy (.venv).
"""
from __future__ import annotations
import fcntl
import html
import json
import os
import re
import sys
import threading
import time
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import prefer_ipv4  # noqa: E402

prefer_ipv4()

ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / 'library'
CACHE = Path.home() / '.cache' / 'sound_lib' / 'search.json'
UA = {'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'}
AUDIO = ('.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aif', '.aiff')
LICENSE = {'fs': 'CC0 (Freesound)', 'mk': 'Mixkit Sound Effects Free License', 'mkm': 'Mixkit Stock Music Free License'}


# ---------------------------------------------------------------- mạng (IPv4 ưu tiên, giãn cách nhẹ trang tìm kiếm, tải CDN song song)
_last: dict[str, float] = {}
_host_locks: dict[str, threading.Lock] = {}
_meta_lock = threading.Lock()


def _throttle_host(host: str, gap: float = 0.35):
    with _meta_lock:
        lk = _host_locks.setdefault(host, threading.Lock())
    with lk:
        wait = gap - (time.time() - _last.get(host, 0))
        if wait > 0:
            time.sleep(wait)
        _last[host] = time.time()


def fetch(url, timeout=30, tries=3, throttle=True):
    host = urllib.parse.urlparse(url).netloc
    for n in range(tries):
        if throttle:
            _throttle_host(host)
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code == 429 and n < tries - 1:
                time.sleep(3 * 2 ** n)
                continue
            raise
        except OSError:
            if n == tries - 1:
                raise
            time.sleep(1 + n)


# ---------------------------------------------------------------- danh mục (khoá file đa tiến trình cho 4 subagent SFX chạy song song)
def index_path(kind):
    return LIB / kind / 'INDEX.json'


@contextmanager
def _file_lock(lock_file: Path):
    lock_file.parent.mkdir(parents=True, exist_ok=True)
    with open(lock_file, 'a+') as lf:
        fcntl.flock(lf.fileno(), fcntl.LOCK_EX)
        try:
            yield
        finally:
            fcntl.flock(lf.fileno(), fcntl.LOCK_UN)


def _atomic_write(path: Path, text: str):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_name(f'.tmp_{os.getpid()}_{threading.get_ident()}_{path.name}')
    tmp.write_text(text)
    os.replace(tmp, path)


def load_index(kind):
    try:
        return json.loads(index_path(kind).read_text())
    except (OSError, ValueError):
        return {}


def save_index(kind, idx):
    p = index_path(kind)
    _atomic_write(p, json.dumps(dict(sorted(idx.items())), ensure_ascii=False, indent=1))


def update_index(kind, updates: dict):
    """Đọc mới + gộp + ghi nguyên tử dưới khoá flock để nhiều subagent gọi add/get cùng lúc không ghi đè mất mục của nhau."""
    if not updates:
        return
    with _file_lock(LIB / kind / '.index.lock'):
        idx = load_index(kind)
        for k, val in updates.items():
            old_q = idx.get(k, {}).get('queries', [])
            new_q = list(dict.fromkeys(old_q + val.get('queries', [])))
            idx[k] = {**idx.get(k, {}), **val, **({'queries': new_q} if new_q else {})}
        save_index(kind, idx)


def find(key):
    for kind in ('sfx', 'music'):
        e = load_index(kind).get(key)
        if e:
            return e
    return None


def _cache(rows=None):
    if rows:
        with _file_lock(CACHE.parent / '.cache.lock'):
            try:
                c = json.loads(CACHE.read_text())
            except (OSError, ValueError):
                c = {}
            c.update({r['key']: r for r in rows})
            _atomic_write(CACHE, json.dumps(c, ensure_ascii=False))
            return c
    try:
        return json.loads(CACHE.read_text())
    except (OSError, ValueError):
        return {}


# ---------------------------------------------------------------- nguồn
def search_local(q, kind, epidemic=False):
    words = set(re.findall(r'\w+', q.lower()))
    rows = []
    for k, e in load_index(kind).items():
        if (e.get('source') == 'epidemic') != epidemic:
            continue
        hay = ' '.join([e.get('title', ''), e.get('notes', ''), ' '.join(e.get('tags', [])), ' '.join(e.get('queries', []))]).lower()
        score = sum(w in hay for w in words)
        if score:
            rows.append(dict(e, key=k, stats=f"★{e.get('rating', '-')} ↓{e.get('downloads', '-')}", _score=score))
    rows.sort(key=lambda r: (-r['_score'], -(r.get('downloads') or 0)))
    return rows


def search_freesound(q, kind, pages=2):
    params = {'q': q, 'f': 'license:"Creative Commons 0"'}
    rows = []
    for page in range(1, pages + 1):
        t = fetch('https://freesound.org/search/?' + urllib.parse.urlencode({**params, 'page': page})).decode('utf-8', 'replace')
        for blk in t.split('class="bw-search__result"')[1:]:
            g = lambda k: (re.search(rf'data-{k}="([^"]*)"', blk) or [None, ''])[1]
            rt = re.search(r'aria-label="Average rating of ([\d.]+)"', blk)
            rn = re.search(r'bw-rating__count[^>]*>\((\d+)\)', blk)
            desc = re.search(r'<div class="max-h-60px[^"]*"\s*>\s*(.*?)\s*</div>', blk, re.S)
            sid, mp3 = g('sound-id'), g('mp3')
            if not sid or not mp3:
                continue
            rows.append({'key': f'fs:{sid}', 'source': 'freesound', 'id': sid, 'title': html.unescape(g('title')),
                         'author': g('username'), 'dur': round(float(g('duration') or 0), 1), 'license': LICENSE['fs'],
                         'page': f'https://freesound.org/s/{sid}/', 'url': mp3.replace('-lq.mp3', '-hq.mp3'),
                         'downloads': int(g('num-downloads') or 0), 'rating': float(rt[1]) if rt else None,
                         'votes': int(rn[1]) if rn else 0,
                         'desc': html.unescape(re.sub(r'<[^>]+>|\s+', ' ', desc[1])).strip()[:100] if desc else ''})
    # nhiều người tải + nhiều người chấm = bằng chứng tốt nhất khi không nghe được
    rows.sort(key=lambda r: -(r['downloads'] + 50 * r['votes']))
    for r in rows:
        r['stats'] = f"↓{r['downloads']} ★{r['rating'] or '-'}({r['votes']})"
    return rows


def _mixkit_page(url, kind):
    try:
        t = fetch(url).decode('utf-8', 'replace')
    except OSError:
        return []
    rows = []
    for card in t.split('class="item-grid-card ')[1:]:
        u = re.search(r'data-audio-player-preview-url-value="([^"]+)"', card)
        i = re.search(r'data-audio-player-item-id-value="(\d+)"', card)
        ti = re.search(r'item-grid-card__title">\s*([^<]+?)\s*<', card)
        du = re.search(r'data-test-id="duration">\s*(\d+):(\d+)', card)
        if not (u and i and ti):
            continue
        p = 'mkm' if kind == 'music' else 'mk'
        tags = [html.unescape(x).lower() for x in re.findall(r'class="meta-links__link"[^>]*>([^<]+)<', card)]
        rows.append({'key': f'{p}:{i[1]}', 'source': 'mixkit', 'id': i[1], 'title': html.unescape(ti[1]), 'author': 'Mixkit',
                     'dur': int(du[1]) * 60 + int(du[2]) if du else 0, 'license': LICENSE[p], 'page': url, 'url': u[1],
                     'tags': tags, 'stats': 'mixkit'})
    return rows


def search_mixkit(q, kind):
    """Mixkit không có ô tìm thật: thử trang tag theo từng từ / cụm từ."""
    words = re.findall(r'[a-z]+', q.lower())
    slugs = ['-'.join(words)] + words
    rows, seen = [], set()
    for s in dict.fromkeys(slugs):
        urls = ([f'https://mixkit.co/free-stock-music/tag/{s}/', f'https://mixkit.co/free-stock-music/mood/{s}/',
                 f'https://mixkit.co/free-stock-music/genre/{s}/'] if kind == 'music'
                else [f'https://mixkit.co/free-sound-effects/{s}/'])
        for u in urls:
            for r in _mixkit_page(u, kind):
                if r['key'] not in seen:
                    seen.add(r['key'])
                    rows.append(r)
        if len(rows) >= 20:
            break
    return rows


def search(q, kind='sfx', n=8, max_dur=None, online=False, epidemic=False):
    rows = search_local(q, kind, epidemic)
    if epidemic:    # Epidemic tìm online bằng MCP (SearchRecordings / SearchSoundEffects), ở đây chỉ xem kho
        return rows[:n]
    if online or len(rows) < n:
        def _safe_src(fn):
            try:
                return fn(q, kind)
            except OSError as e:
                print(f'  ({fn.__name__}: {e})', file=sys.stderr)
                return []

        with ThreadPoolExecutor(2) as ex:
            lists = [lst for lst in ex.map(_safe_src, (search_freesound, search_mixkit)) if lst]
        found = [r for grp in zip(*[l + [None] * (max(map(len, lists)) - len(l)) for l in lists]) for r in grp if r] if lists else []
        with _meta_lock:
            _cache(found)
        have = {r['key'] for r in rows}
        rows += [r for r in found if r['key'] not in have]
    if max_dur:
        rows = [r for r in rows if not r.get('dur') or r['dur'] <= max_dur]
    return rows[:n] if not online else rows[:max(n, 12)]


# ---------------------------------------------------------------- tải + đo
def slug(s):
    return re.sub(r'[^\w]+', '-', s).strip('-')[:40]


def get(keys, kind, query='', jobs=6):
    sys.path.insert(0, str(Path(__file__).parent))
    import sound_probe as sp
    idx, cache = load_index(kind), _cache()
    out = LIB / kind / 'dl'
    out.mkdir(parents=True, exist_ok=True)
    idx_lock = threading.Lock()
    updates: dict = {}

    def one(key):
        with idx_lock:
            if key in idx and (ROOT / idx[key]['file']).exists():
                if query and query not in idx[key].get('queries', []):
                    updates[key] = {**idx[key], 'queries': idx[key].get('queries', []) + [query]}
                return key, 'đã có'
        r = cache.get(key)
        if not r:
            return key, 'LỖI: chưa search ra khoá này'
        dst = out / f"{key.replace(':', '_')}_{slug(r['title'])}{Path(urllib.parse.urlparse(r['url']).path).suffix or '.mp3'}"
        if not dst.exists():
            data = fetch(r['url'], timeout=90, throttle=False)
            if len(data) < 2000 or data[:15].lstrip().startswith(b'<'):
                return key, 'LỖI: không phải file âm thanh'
            tmp = dst.with_name(f'.tmp_{os.getpid()}_{threading.get_ident()}_{dst.name}')
            tmp.write_bytes(data)
            tmp.replace(dst)
        x = sp.decode(dst)
        a = sp.analyze_music(x) if kind == 'music' else sp.analyze_sfx(x)
        if kind == 'music':
            a.pop('energy')
        e = {k: r.get(k) for k in ('source', 'id', 'title', 'author', 'license', 'page', 'url', 'downloads', 'rating', 'votes', 'desc', 'tags')}
        with idx_lock:
            updates[key] = {**{k: v for k, v in e.items() if v not in (None, '', [])}, 'file': str(dst.relative_to(ROOT)),
                            'queries': [query] if query else [], **a}
        return key, f"{a['dur']} s" + (f" · ~{a['bpm']} BPM {a['key']}" if kind == 'music' else f" · đỉnh @{a['peak']} s")

    workers = max(1, min(jobs, len(keys))) if keys else 1
    with ThreadPoolExecutor(workers) as ex:
        res = list(ex.map(lambda k: _safe(one, k), keys))
    update_index(kind, updates)
    for k, msg in res:
        print(f'  {k:12s} {msg}')


def _safe(fn, k):
    try:
        return fn(k)
    except Exception as e:  # một file hỏng không làm hỏng cả lượt
        return k, f'LỖI: {e!r}'


def scan():
    """File người dùng tự bỏ vào library/<sfx|music>/ (ngoài dl/) → danh mục, license 'người dùng tự cung cấp'."""
    sys.path.insert(0, str(Path(__file__).parent))
    import sound_probe as sp
    for kind in ('sfx', 'music'):
        idx = load_index(kind)
        known = {e['file'] for e in idx.values()}
        n = 0
        for f in sorted((LIB / kind).rglob('*')):
            rel = str(f.relative_to(ROOT))
            if f.suffix.lower() not in AUDIO or rel in known or '/dl/' in rel or '/epidemic/' in rel:
                continue
            x = sp.decode(f)
            a = sp.analyze_music(x) if kind == 'music' else sp.analyze_sfx(x)
            a.pop('energy', None)
            idx[f'lib:{f.relative_to(LIB / kind)}'] = {'source': 'user', 'title': f.stem.replace('_', ' '), 'license': 'người dùng tự cung cấp',
                                                         'file': rel, 'tags': [p.lower() for p in f.relative_to(LIB / kind).parts[:-1]], **a}
            n += 1
        save_index(kind, idx)
        print(f'{kind}: thêm {n} file người dùng vào danh mục')


def add(key, kind, url, title, author='', stem=None, query=''):
    """File Epidemic: agent lấy link tải (ký tạm) bằng MCP rồi gọi lệnh này → tải, đo, ghi danh mục với license theo gói."""
    sys.path.insert(0, str(Path(__file__).parent))
    import sound_probe as sp
    if not key.startswith(('es:', 'es-edit:')):
        sys.exit('khoá Epidemic dạng es:<uuid>, es:<uuid>:drums, es-edit:<editId>')
    out = LIB / kind / 'epidemic'
    out.mkdir(parents=True, exist_ok=True)
    ext = Path(urllib.parse.urlparse(url).path).suffix or '.wav'
    dst = out / f"{slug(title)}{'_' + stem.upper() if stem else ''}_{key.split(':')[1][:8]}{ext}"
    if not dst.exists():
        data = fetch(url, timeout=180, throttle=False)
        if len(data) < 2000 or data[:15].lstrip().startswith(b'<'):
            sys.exit('link không trả file âm thanh (hết hạn? lấy lại link bằng MCP)')
        tmp = dst.with_name(f'.tmp_{os.getpid()}_{threading.get_ident()}_{dst.name}')
        tmp.write_bytes(data)
        tmp.replace(dst)
    x = sp.decode(dst)
    a = sp.analyze_music(x) if kind == 'music' else sp.analyze_sfx(x)
    a.pop('energy', None)
    entry = {'source': 'epidemic', 'id': key.split(':')[1], 'title': title, 'author': author, 'stem': stem or 'full',
             'license': 'Epidemic Sound (theo gói đăng ký — không chia sẻ file)', 'page': 'https://www.epidemicsound.com/',
             'file': str(dst.relative_to(ROOT)), 'queries': [query] if query else [], **a}
    update_index(kind, {key: entry})
    print(f"  {key}  {dst.relative_to(ROOT)}  {a['dur']} s" + (f" · ~{a['bpm']} BPM {a['key']} · cú kết {a['end_hit']}" if kind == 'music' else f" · đỉnh @{a['peak']} s"))


def _pos_args(argv):
    val_flags = {'-n', '--max', '-j', '--query', '--url', '--title', '--author', '--stem'}
    out, i = [], 0
    while i < len(argv):
        if argv[i] in val_flags:
            i += 2
        elif argv[i].startswith('-'):
            i += 1
        else:
            out.append(argv[i])
            i += 1
    return out


def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    kind = 'music' if '--music' in a else 'sfx'
    opt = lambda k, d: type(d)(a[a.index(k) + 1]) if k in a else d
    if a[0] == 'search':
        qs = _pos_args(a[1:])
        if not qs:
            sys.exit('search cần ít nhất 1 từ khoá')
        n, max_d, onl, epi = opt('-n', 8), opt('--max', 0.0) or None, '--online' in a, '--epidemic' in a
        jobs = max(1, min(opt('-j', 4), len(qs)))
        fn = lambda q: (q, search(q, kind, n=n, max_dur=max_d, online=onl, epidemic=epi))
        groups = [fn(qs[0])] if jobs == 1 else list(ThreadPoolExecutor(jobs).map(fn, qs))
        for idx_q, (q, rows) in enumerate(groups):
            if len(qs) > 1:
                print((f'\n' if idx_q else '') + f'=== {q} ===')
            for r in rows:
                where = 'KHO' if r.get('file') else r.get('source', '')
                print('\t'.join([r['key'], where, r['title'][:46], f"{r.get('dur', '?')}s", r.get('stats', ''),
                                 (r.get('desc') or ' '.join(r.get('tags', [])))[:70]]))
            if not rows:
                print('(không có)')
    elif a[0] == 'get':
        get([k for k in _pos_args(a[1:]) if ':' in k], kind, query=opt('--query', ''), jobs=opt('-j', 6))
    elif a[0] == 'add':
        if '--url' not in a or '--title' not in a:
            sys.exit('add cần --url "<link>" và --title "<tên>"')
        add(a[1], kind, opt('--url', ''), opt('--title', ''), opt('--author', ''), opt('--stem', '') or None, opt('--query', ''))
    elif a[0] == 'scan':
        scan()
    elif a[0] == 'show':
        print(json.dumps(find(a[1]), ensure_ascii=False, indent=1))
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
