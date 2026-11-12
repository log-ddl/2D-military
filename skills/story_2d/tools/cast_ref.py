#!/usr/bin/env python3
"""Tra cực nhanh (~1–2 giây) ảnh mặt tham chiếu cho nhân vật người thật ít gặp qua Wikipedia/Commons API.
Xuất 1 tấm ghép nhỏ duy nhất `projects/<id>/plan/refs/cast_ref.jpg` (ngoài `assets/`) để AI liếc 2–3 nét chính
(tóc/hói, kính, râu, màu da) tránh vẽ bịa; không có ảnh thì bỏ qua ngay lập tức, tuyệt đối không làm chậm Bước A.

    python3 skills/story_2d/tools/cast_ref.py <id> "Scott Bessent" "Liang Wenfeng"
"""
from concurrent.futures import ThreadPoolExecutor
import json
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
UA = 'Story2DCastRef/1.0 (local research helper)'


def get_json(url: str):
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    return json.loads(urllib.request.urlopen(req, timeout=2.5).read().decode('utf-8'))


def fetch_thumbs(name: str, limit: int = 2) -> list[bytes]:
    urls: list[str] = []
    q = urllib.parse.quote(name)
    # 1. Wikipedia pageimages (chính xác nhất cho chân dung người thật)
    try:
        wp = get_json(
            f'https://en.wikipedia.org/w/api.php?action=query&generator=search&gsrsearch={q}'
            f'&gsrlimit=3&prop=pageimages&pithumbsize=320&format=json'
        )
        for p in sorted((wp.get('query', {}).get('pages') or {}).values(), key=lambda x: x.get('index', 99)):
            u = (p.get('thumbnail') or {}).get('source')
            if u and not u.lower().endswith('.svg') and u not in urls:
                urls.append(u)
    except Exception:
        pass

    # 2. Dự phòng Wikimedia Commons nếu chưa đủ 2 ảnh
    if len(urls) < limit:
        try:
            cm = get_json(
                f'https://commons.wikimedia.org/w/api.php?action=query&generator=search'
                f'&gsrsearch={q}&gsrnamespace=6&gsrlimit=4&prop=imageinfo&iiprop=url&iiurlwidth=320&format=json'
            )
            for p in (cm.get('query', {}).get('pages') or {}).values():
                for ii in p.get('imageinfo') or []:
                    u = ii.get('thumburl') or ii.get('url')
                    if u and not u.lower().endswith(('.svg', '.pdf', '.webm', '.ogv')) and u not in urls:
                        urls.append(u)
        except Exception:
            pass

    def grab(u: str):
        try:
            r = urllib.request.Request(u, headers={'User-Agent': UA})
            b = urllib.request.urlopen(r, timeout=2.5).read()
            return b if len(b) > 1200 else None
        except Exception:
            return None

    with ThreadPoolExecutor(max_workers=3) as ex:
        got = [b for b in ex.map(grab, urls[: limit + 2]) if b]
    return got[:limit]


def main():
    argv = [a for a in sys.argv[1:] if not a.startswith('-')]
    if len(argv) < 2:
        sys.exit(__doc__)
    pid, names = argv[0], argv[1:8]
    pdir = ROOT / 'projects' / pid
    out_dir = pdir / 'plan' / 'refs' if pdir.is_dir() else ROOT / '.build' / 'refs'
    out_dir.mkdir(parents=True, exist_ok=True)
    out_img = out_dir / 'cast_ref.jpg'

    with ThreadPoolExecutor(max_workers=min(6, len(names))) as ex:
        results = list(ex.map(fetch_thumbs, names))

    with tempfile.TemporaryDirectory() as tmp:
        tpath = Path(tmp)
        tiles = []
        labels = []
        for idx, (name, imgs) in enumerate(zip(names, results)):
            if not imgs:
                print(f'  - {name}: không có ảnh nhanh → vẽ tự do theo kịch bản')
                continue
            f = tpath / f'raw_{idx}.jpg'
            f.write_bytes(imgs[0])
            sc = tpath / f'tile_{idx}.jpg'
            r = subprocess.run(
                [
                    'ffmpeg', '-y', '-loglevel', 'error', '-i', str(f),
                    '-vf', 'scale=280:280:force_original_aspect_ratio=increase,crop=280:280',
                    str(sc),
                ],
                timeout=4,
            )
            if r.returncode == 0 and sc.exists():
                tiles.append(sc)
                labels.append(f'Ô {len(tiles)}: {name}')

        if not tiles:
            print('Không có ảnh tham chiếu — thiết kế tự do theo vai kịch bản.')
            return

        if len(tiles) == 1:
            out_img.write_bytes(tiles[0].read_bytes())
        else:
            inputs = [x for t in tiles for x in ('-i', str(t))]
            subprocess.run(
                [
                    'ffmpeg', '-y', '-loglevel', 'error', *inputs,
                    '-filter_complex', f'hstack=inputs={len(tiles)}',
                    str(out_img),
                ],
                check=False,
                timeout=4,
            )

    print(f'{out_img}  ({" | ".join(labels)})')


if __name__ == '__main__':
    main()
