#!/usr/bin/env python3
"""Công cụ kết nối BlenderKit API (cache dùng chung bk_cache/) và gọi Blender nền (--background --factory-startup).

Cách dùng:
  python3 core/tools/bk.py search "<query>" [--free] [-n 8]
  python3 core/tools/bk.py fetch <asset_uuid> [--res 1K|2K|blend]
  python3 core/tools/bk.py prep <asset_uuid> --out <out.glb> [--role hero|bg] [--target-len <m>]
      [--front auto|+X|-X|+Y|-Y|+Z|-Z] [--up auto|+Y|+Z|-Y|-Z] [--ground bottom|center]
      [--decimate <ratio>] [--inspect <sheet.png>]

An toàn khi nhiều Subagent chạy song song:
  - Khoá file (flock) trên từng thư mục bk_cache/<uuid>/ khi tải.
  - Luôn gọi Blender với `--background --factory-startup --python ...`, không đụng cửa sổ Blender đang mở.
"""
from __future__ import annotations
import fcntl
import json
import os
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = ROOT / 'bk_cache'
TOKEN_CACHE = ROOT / '.cache/bk_api_key'
BLENDER_BIN = os.environ.get('BLENDER_BIN', '/Applications/Blender.app/Contents/MacOS/Blender')
UA = {'User-Agent': 'BlenderKit-Client/1.0'}
PREP_SCRIPT = Path(__file__).resolve().parent / 'bk_blender_prep.py'
_API_KEY_MEMO: str | None = None


def get_bk_api_key() -> str:
    global _API_KEY_MEMO
    if _API_KEY_MEMO is not None:
        return _API_KEY_MEMO
    env_k = os.environ.get('BLENDERKIT_API_KEY', '').strip()
    if env_k:
        _API_KEY_MEMO = env_k
        return env_k
    if TOKEN_CACHE.is_file():
        k = TOKEN_CACHE.read_text().strip()
        if k:
            _API_KEY_MEMO = k
            return k
    # Đọc một lần từ cấu hình addon BlenderKit đã đăng nhập sẵn trong Blender và lưu vào .cache/
    if Path(BLENDER_BIN).exists():
        r = subprocess.run(
            [
                BLENDER_BIN,
                '--background',
                '--python-expr',
                (
                    "import bpy\n"
                    "for k, a in bpy.context.preferences.addons.items():\n"
                    "  if 'blenderkit' in k.lower() and a.preferences:\n"
                    "    v = getattr(a.preferences, 'api_key', '').strip()\n"
                    "    if v: print('BK_TOKEN_FOUND:' + v); break\n"
                ),
            ],
            capture_output=True,
            text=True,
        )
        for ln in r.stdout.splitlines():
            if ln.startswith('BK_TOKEN_FOUND:'):
                val = ln.split('BK_TOKEN_FOUND:', 1)[1].strip()
                if val:
                    TOKEN_CACHE.parent.mkdir(parents=True, exist_ok=True)
                    TOKEN_CACHE.write_text(val)
                    try:
                        os.chmod(TOKEN_CACHE, 0o600)
                    except OSError:
                        pass
                    _API_KEY_MEMO = val
                    return val
    _API_KEY_MEMO = ''
    return ''


def http_json(url: str, timeout: int = 30, auth: bool = False) -> dict:
    headers = dict(UA)
    if auth:
        token = get_bk_api_key()
        if token:
            headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def download_stream(url: str, dst: Path, timeout: int = 180):
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(f'.tmp_{os.getpid()}_{dst.name}')
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r, open(tmp, 'wb') as out:
        shutil.copyfileobj(r, out, length=1024 * 256)
    os.replace(tmp, dst)


def cmd_search(argv: list[str]):
    if not argv:
        sys.exit('Cần từ khoá: bk.py search "fighter jet"')
    q = argv[0]
    has_token = bool(get_bk_api_key())
    free_only = '--free' in argv if has_token else ('--no-free' not in argv)
    n = int(argv[argv.index('-n') + 1]) if '-n' in argv else 8
    full_q = f'{q} asset_type:model' + (' is_free:true' if free_only else '')
    url = f"https://www.blenderkit.com/api/v1/search/?query={urllib.parse.quote_plus(full_q)}&dict_parameters=1&page_size={n}"
    data = http_json(url, auth=has_token)
    print(f"Tìm '{q}' (free={free_only}): tổng {data.get('count', 0)} kết quả")
    for r in data.get('results', [])[:n]:
        p = r.get('dictParameters') or {}
        files = [f.get('fileType') for f in r.get('files', [])]
        print(f"  {r['id']} | {r.get('name')} | faces={p.get('faceCount')} "
              f"| dim={p.get('dimensionX')}x{p.get('dimensionY')}x{p.get('dimensionZ')} | files={files}")


def fetch_asset(asset_id: str, res_pref: str = '1K') -> Path:
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    adir = CACHE_DIR / asset_id
    adir.mkdir(parents=True, exist_ok=True)
    lock_file = open(adir / '.lock', 'w')
    try:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)
        meta_path = adir / 'meta.json'
        if not meta_path.exists():
            url = f'https://www.blenderkit.com/api/v1/assets/{asset_id}/?dict_parameters=1'
            try:
                meta = http_json(url, auth=True)
            except Exception:
                surl = f'https://www.blenderkit.com/api/v1/search/?query=id:{asset_id}&dict_parameters=1'
                res = http_json(surl, auth=True).get('results', [])
                if not res:
                    sys.exit(f'Không tìm thấy asset BlenderKit: {asset_id}')
                meta = res[0]
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        else:
            meta = json.loads(meta_path.read_text())

        files = {f['fileType']: f for f in meta.get('files', []) if f.get('fileType') and f.get('downloadUrl')}
        order = [f'resolution_{res_pref}', 'resolution_1K', 'resolution_2K', 'resolution_0_5K', 'blend', 'gltf']
        chosen_type = next((k for k in order if k in files), None)
        if not chosen_type:
            sys.exit(f'Asset {asset_id} không có file tải phù hợp: {list(files)}')

        ext = '.glb' if 'gltf' in chosen_type else '.blend'
        target = adir / f'source_{chosen_type}{ext}'
        if not target.exists() or target.stat().st_size < 128:
            dl_api = files[chosen_type]['downloadUrl']
            sep = '&' if '?' in dl_api else '?'
            dl_info = http_json(f'{dl_api}{sep}scene_uuid={uuid.uuid4()}', auth=True)
            cdn_url = dl_info.get('filePath')
            if not cdn_url:
                sys.exit(f'Không lấy được filePath CDN cho {asset_id} ({chosen_type}): {dl_info}')
            print(f'[bk] Đang tải {meta.get("name")} ({chosen_type}) → {target.relative_to(ROOT)} ...', flush=True)
            download_stream(cdn_url, target)

        thumb = files.get('thumbnail')
        thumb_path = adir / 'thumbnail.jpg'
        if thumb and not thumb_path.exists():
            try:
                u = thumb.get('fileThumbnailLarge') or thumb.get('fileThumbnail') or thumb.get('downloadUrl')
                if u and u.startswith('http'):
                    download_stream(u, thumb_path, timeout=30)
            except Exception:
                pass

        info_out = adir / 'source.json'
        info_out.write_text(json.dumps({
            'id': asset_id,
            'name': meta.get('name'),
            'chosen_type': chosen_type,
            'source_file': target.name,
            'dictParameters': meta.get('dictParameters') or {},
        }, ensure_ascii=False, indent=2))
        return target
    finally:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
        lock_file.close()


def opt(argv: list[str], flag: str, default=None):
    return argv[argv.index(flag) + 1] if flag in argv and argv.index(flag) + 1 < len(argv) else default


def cmd_fetch(argv: list[str]):
    if not argv:
        sys.exit('Cần asset_uuid: bk.py fetch <uuid>')
    res = opt(argv, '--res', '1K')
    src = fetch_asset(argv[0], res_pref=res)
    print(f'[bk] Sẵn sàng: {src}')


def cmd_prep(argv: list[str]):
    if not argv:
        sys.exit('Cần asset_uuid: bk.py prep <uuid> --out <out.glb>')
    if not Path(BLENDER_BIN).exists():
        sys.exit(f'Không tìm thấy Blender tại {BLENDER_BIN}')
    asset_id = argv[0]
    res = opt(argv, '--res', '1K')
    src = fetch_asset(asset_id, res_pref=res)
    out_glb = opt(argv, '--out')
    inspect_png = opt(argv, '--inspect')
    role = opt(argv, '--role', 'hero')
    target_len = opt(argv, '--target-len', '')
    front = opt(argv, '--front', 'auto')
    up = opt(argv, '--up', 'auto')
    ground = opt(argv, '--ground', 'bottom')
    decimate = opt(argv, '--decimate', '')
    report_json = str(src.parent / f'report_{role}.json')

    if out_glb:
        Path(out_glb).parent.mkdir(parents=True, exist_ok=True)
    if inspect_png:
        Path(inspect_png).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        BLENDER_BIN,
        '--background',
        '--factory-startup',
        '--python', str(PREP_SCRIPT),
        '--',
        '--src', str(src),
        '--role', role,
        '--front', front,
        '--up', up,
        '--ground', ground,
        '--report', report_json,
    ]
    if out_glb:
        cmd += ['--out', str(Path(out_glb).resolve())]
    if inspect_png:
        cmd += ['--inspect', str(Path(inspect_png).resolve())]
    if target_len:
        cmd += ['--target-len', str(target_len)]
    if decimate:
        cmd += ['--decimate', str(decimate)]

    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        sys.exit(f'Blender prep lỗi (mã {r.returncode})')
    for ln in r.stdout.splitlines():
        if ln.startswith('[bk-prep]'):
            print(ln)
    if Path(report_json).exists():
        print(f'[bk] Báo cáo: {report_json}')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sub, rest = sys.argv[1], sys.argv[2:]
    if sub == 'search':
        cmd_search(rest)
    elif sub == 'fetch':
        cmd_fetch(rest)
    elif sub == 'prep':
        cmd_prep(rest)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
