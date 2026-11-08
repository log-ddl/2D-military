#!/usr/bin/env python3
"""Công cụ kết nối BlenderKit API (cache dùng chung bk_cache/) và gọi Blender nền (--background --factory-startup).

Cách dùng:
  python3 core/tools/bk.py search "<query1>" ["<query2>" ...] [--free] [-n 8] [-j 6]
  python3 core/tools/bk.py fetch <uuid1[:res]> [<uuid2[:res]> ...] [--res 2K|1K|0.5K|bg|blend] [-j 6] [--thumb] [--force-res]
  python3 core/tools/bk.py inspect-parts <uuid1_hoặc_path> [<uuid2> ...] [--front auto|+X|-X|+Y|-Y] [--target-len <m>] [-j 4]
  python3 core/tools/bk.py prep <asset_uuid_hoặc_đường_dẫn> --out <out.glb> [--role hero|bg] [--target-len <m>]
      [--front auto|+X|-X|+Y|-Y|+Z|-Z] [--up auto|+Y|+Z|-Y|-Z] [--ground bottom|center]
      [--decimate <ratio>] [--rig <rig.json>] [--keep-nodes] [--recolor <#hex>]
      [--save-cache <slug>] [--inspect <sheet.png>]
  python3 core/tools/bk.py prep-actor <asset_uuid_hoặc_blend> --out <out.glb> [--preset <preset.json[:tên]>]
      [--prop <prop.glb_hoặc_slug> | --no-prop] [--decimate 28000] [--res 1K]
      [--save-cache <slug>] [--inspect <sheet.png>]
  python3 core/tools/bk.py list-prepped

Tối ưu tốc độ & an toàn khi chạy song song:
  - Ưu tiên IPv4 (tránh treo timeout 30–75s trên mạng gãy IPv6).
  - Không tải thumbnail.jpg mặc định (chỉ tải khi có --thumb); đạo cụ nền (--role bg / :bg) ưu tiên gói nhẹ 1K/0.5K.
  - Hỗ trợ tìm kiếm, tải và inspect-parts hàng loạt nhiều UUID song song (ThreadPoolExecutor).
  - Khoá file (flock) trên từng thư mục bk_cache/<uuid>/ khi tải; gọi Blender với `--background --factory-startup`.
"""
from __future__ import annotations
from concurrent.futures import ThreadPoolExecutor
import fcntl
import json
import os
import shutil
import subprocess
import sys
import threading
import urllib.parse
import urllib.request
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from common import prefer_ipv4  # noqa: E402

prefer_ipv4()

ROOT = Path(__file__).resolve().parents[2]
CACHE_DIR = ROOT / 'bk_cache'
PREPPED_DIR = CACHE_DIR / 'prepped'
TOKEN_CACHE = ROOT / '.cache/bk_api_key'
BLENDER_BIN = os.environ.get('BLENDER_BIN', '/Applications/Blender.app/Contents/MacOS/Blender')
UA = {'User-Agent': 'BlenderKit-Client/1.0'}
PREP_SCRIPT = Path(__file__).resolve().parent / 'bk_blender_prep.py'
ACTOR_PREP_SCRIPT = Path(__file__).resolve().parent / 'bk_actor_prep.py'
MIXAMO_DIR = ROOT / 'mixamo'
_API_KEY_MEMO: str | None = None
_API_KEY_LOCK = threading.Lock()

VALUE_FLAGS = {
    '-n', '--limit', '-j', '--jobs', '--res', '--front', '--forward', '--up', '--ground',
    '--target-len', '--length', '--height', '--out', '--inspect', '--role',
    '--decimate', '--rig', '--recolor', '--save-cache', '--preset', '--prop',
}


def get_bk_api_key() -> str:
    global _API_KEY_MEMO
    if _API_KEY_MEMO is not None:
        return _API_KEY_MEMO
    with _API_KEY_LOCK:
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


def http_json(url: str, timeout: int = 20, auth: bool = False) -> dict:
    headers = dict(UA)
    if auth:
        token = get_bk_api_key()
        if token:
            headers['Authorization'] = f'Bearer {token}'
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read().decode('utf-8'))


def download_stream(url: str, dst: Path, timeout: int = 120):
    dst.parent.mkdir(parents=True, exist_ok=True)
    tmp = dst.with_name(f'.tmp_{os.getpid()}_{threading.get_ident()}_{dst.name}')
    req = urllib.request.Request(url, headers=UA)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r, open(tmp, 'wb') as out:
            shutil.copyfileobj(r, out, length=1024 * 512)
        os.replace(tmp, dst)
    except BaseException:
        tmp.unlink(missing_ok=True)
        raise


def opt(argv: list[str], *flags: str, default=None):
    for flag in flags:
        if flag in argv:
            idx = argv.index(flag)
            if idx + 1 < len(argv):
                return argv[idx + 1]
    return default


def positional_args(argv: list[str]) -> list[str]:
    out: list[str] = []
    i = 0
    while i < len(argv):
        tok = argv[i]
        if tok in VALUE_FLAGS:
            i += 2
            continue
        if tok.startswith('-'):
            i += 1
            continue
        out.append(tok)
        i += 1
    return out


def _res_order(res_pref: str) -> list[str]:
    rp = (res_pref or '2K').strip()
    if rp.lower() == 'bg':
        return ['resolution_1K', 'resolution_0_5K', 'gltf', 'blend', 'resolution_2K']
    norm = '0_5K' if rp in ('0.5K', '0_5K', '512') else rp
    cand = norm if norm in ('blend', 'gltf') else f'resolution_{norm}'
    base = ['resolution_2K', 'resolution_1K', 'blend', 'resolution_0_5K', 'gltf']
    return [cand] + [k for k in base if k != cand]


def _existing_cached_source(adir: Path) -> Path | None:
    info_p = adir / 'source.json'
    if info_p.is_file():
        try:
            sf = adir / json.loads(info_p.read_text()).get('source_file', '')
            if sf.is_file() and sf.stat().st_size >= 128:
                return sf
        except Exception:
            pass
    for pat in ('source_*.blend', 'source_*.glb'):
        for f in sorted(adir.glob(pat)):
            if f.is_file() and f.stat().st_size >= 128:
                return f
    return None


def _search_one(q: str, n: int, free_only: bool, has_token: bool) -> str:
    full_q = f'{q} asset_type:model' + (' is_free:true' if free_only else '')
    url = f"https://www.blenderkit.com/api/v1/search/?query={urllib.parse.quote_plus(full_q)}&dict_parameters=1&page_size={n}"
    data = http_json(url, auth=has_token)
    plan_tag = 'Full Plan' if (has_token and not free_only) else 'Free'
    lines = [f"Tìm '{q}' ({plan_tag}): tổng {data.get('count', 0)} kết quả"]
    for r in data.get('results', [])[:n]:
        p = r.get('dictParameters') or {}
        files = [f.get('fileType') for f in r.get('files', [])]
        lines.append(
            f"  {r['id']} | {r.get('name')} | free={r.get('isFree')} | faces={p.get('faceCount')} "
            f"| dim={p.get('dimensionX')}x{p.get('dimensionY')}x{p.get('dimensionZ')} | files={files}"
        )
    return '\n'.join(lines)


def cmd_search(argv: list[str]):
    queries = positional_args(argv)
    if not queries:
        sys.exit('Cần từ khoá: bk.py search "fighter jet" ["bunker" ...]')
    has_token = bool(get_bk_api_key())
    free_only = '--free' in argv if has_token else ('--no-free' not in argv)
    n = int(opt(argv, '-n', '--limit', default='8'))
    jobs = max(1, min(int(opt(argv, '-j', '--jobs', default='6')), len(queries)))
    if jobs == 1:
        blocks = [_search_one(queries[0], n, free_only, has_token)]
    else:
        with ThreadPoolExecutor(max_workers=jobs) as ex:
            blocks = list(ex.map(lambda q: _search_one(q, n, free_only, has_token), queries))
    print('\n\n'.join(blocks))


def fetch_asset(
    asset_spec: str,
    res_pref: str = '2K',
    include_thumb: bool = False,
    force_res: bool = False,
) -> Path:
    p_cand = Path(asset_spec)
    if p_cand.is_file():
        return p_cand.resolve()

    asset_id, sep, inline_res = asset_spec.partition(':')
    eff_res = inline_res if (sep and inline_res) else res_pref

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    adir = CACHE_DIR / asset_id
    adir.mkdir(parents=True, exist_ok=True)
    lock_file = open(adir / '.lock', 'w')
    try:
        fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)

        if not force_res and not include_thumb:
            cached = _existing_cached_source(adir)
            if cached is not None:
                return cached

        meta_path = adir / 'meta.json'
        if not meta_path.exists():
            url = f'https://www.blenderkit.com/api/v1/assets/{asset_id}/?dict_parameters=1'
            try:
                meta = http_json(url, auth=True)
            except Exception:
                surl = f'https://www.blenderkit.com/api/v1/search/?query=id:{asset_id}&dict_parameters=1'
                res = http_json(surl, auth=True).get('results', [])
                if not res:
                    raise RuntimeError(f'Không tìm thấy asset BlenderKit: {asset_id}')
                meta = res[0]
            meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2))
        else:
            meta = json.loads(meta_path.read_text())

        files = {f['fileType']: f for f in meta.get('files', []) if f.get('fileType') and f.get('downloadUrl')}
        order = _res_order(eff_res)
        chosen_type = next((k for k in order if k in files), None)
        if not chosen_type:
            raise RuntimeError(f'Asset {asset_id} không có file tải phù hợp: {list(files)}')

        ext = '.glb' if 'gltf' in chosen_type else '.blend'
        target = adir / f'source_{chosen_type}{ext}'
        if not target.exists() or target.stat().st_size < 128:
            dl_api = files[chosen_type]['downloadUrl']
            qsep = '&' if '?' in dl_api else '?'
            dl_info = http_json(f'{dl_api}{qsep}scene_uuid={uuid.uuid4()}', auth=True)
            cdn_url = dl_info.get('filePath')
            if not cdn_url:
                raise RuntimeError(f'Không lấy được filePath CDN cho {asset_id} ({chosen_type}): {dl_info}')
            print(f'[bk] Đang tải {meta.get("name")} ({chosen_type}) → {target.relative_to(ROOT)} ...', flush=True)
            download_stream(cdn_url, target)

        if include_thumb:
            thumb = files.get('thumbnail')
            thumb_path = adir / 'thumbnail.jpg'
            if thumb and not thumb_path.exists():
                try:
                    u = thumb.get('fileThumbnailLarge') or thumb.get('fileThumbnail') or thumb.get('downloadUrl')
                    if u and u.startswith('http'):
                        download_stream(u, thumb_path, timeout=15)
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


def cmd_fetch(argv: list[str]):
    specs = positional_args(argv)
    if not specs:
        sys.exit('Cần ít nhất 1 asset_uuid: bk.py fetch <uuid1> [<uuid2>:bg ...]')
    res = opt(argv, '--res', default='2K')
    include_thumb = '--thumb' in argv
    force_res = '--force-res' in argv
    jobs = max(1, min(int(opt(argv, '-j', '--jobs', default='6')), len(specs)))
    get_bk_api_key()  # nạp sẵn API key 1 lần trước khi rẽ nhánh luồng

    def _one(spec: str):
        try:
            src = fetch_asset(spec, res_pref=res, include_thumb=include_thumb, force_res=force_res)
            return spec, src, None
        except Exception as e:
            return spec, None, str(e)

    results = [_one(specs[0])] if jobs == 1 else list(ThreadPoolExecutor(max_workers=jobs).map(_one, specs))
    failed = 0
    for spec, src, err in results:
        if err:
            failed += 1
            print(f'[bk] LỖI {spec}: {err}', file=sys.stderr)
        else:
            print(f'[bk] Sẵn sàng: {src}')
    if failed:
        sys.exit(1)


def _inspect_one(
    spec: str,
    res: str,
    front: str,
    up: str,
    ground: str,
    target_len: str,
    length_x: str,
    height_y: str,
) -> tuple[str, int, str]:
    src = fetch_asset(spec, res_pref=res)
    report_json = str(src.parent / 'parts_tree.json')
    cmd = [
        BLENDER_BIN, '--background', '--factory-startup', '--python', str(PREP_SCRIPT), '--',
        '--src', str(src), '--front', front, '--up', up, '--ground', ground,
        '--inspect-parts', '--report', report_json,
    ]
    if target_len:
        cmd += ['--target-len', str(target_len)]
    if length_x:
        cmd += ['--length', str(length_x)]
    if height_y:
        cmd += ['--height', str(height_y)]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return spec, r.returncode, (r.stdout[-2000:] + '\n' + r.stderr[-2000:]).strip()
    idx = r.stdout.find('=== BK INSPECT PARTS ===')
    body = r.stdout[idx:] if idx >= 0 else r.stdout[-3000:]
    return spec, 0, f'>>> [{spec}] ({src.name})\n{body.rstrip()}\n[bk] Đã lưu chi tiết cây mesh tại: {report_json}'


def cmd_inspect_parts(argv: list[str]):
    specs = positional_args(argv)
    if not specs:
        sys.exit('Cần asset_uuid hoặc đường dẫn .blend: bk.py inspect-parts <uuid1> [<uuid2> ...]')
    if not Path(BLENDER_BIN).exists():
        sys.exit(f'Không tìm thấy Blender tại {BLENDER_BIN}')
    res = opt(argv, '--res', default='2K')
    front = opt(argv, '--front', '--forward', default='auto')
    up = opt(argv, '--up', default='auto')
    ground = opt(argv, '--ground', default='bottom')
    target_len = opt(argv, '--target-len', default='')
    length_x = opt(argv, '--length', default='')
    height_y = opt(argv, '--height', default='')
    get_bk_api_key()

    if len(specs) > 1:
        with ThreadPoolExecutor(max_workers=min(6, len(specs))) as ex:
            list(ex.map(lambda s: fetch_asset(s, res_pref=res), specs))

    jobs = max(1, min(int(opt(argv, '-j', '--jobs', default='4')), len(specs)))
    run_fn = lambda s: _inspect_one(s, res, front, up, ground, target_len, length_x, height_y)
    results = [run_fn(specs[0])] if jobs == 1 else list(ThreadPoolExecutor(max_workers=jobs).map(run_fn, specs))
    failed = 0
    for spec, rc, out in results:
        if rc != 0:
            failed += 1
            print(f'[bk] inspect-parts lỗi ({spec}, mã {rc}):\n{out}', file=sys.stderr)
        else:
            print(out)
    if failed:
        sys.exit(1)


def cmd_prep(argv: list[str]):
    if not argv:
        sys.exit('Cần asset_uuid: bk.py prep <uuid> <out.glb> (hoặc --out <out.glb>)')
    if not Path(BLENDER_BIN).exists():
        sys.exit(f'Không tìm thấy Blender tại {BLENDER_BIN}')
    asset_id = argv[0]
    role = opt(argv, '--role', default='hero')
    default_res = 'bg' if role == 'bg' else '2K'
    res = opt(argv, '--res', default=default_res)
    get_bk_api_key()
    try:
        src = fetch_asset(asset_id, res_pref=res, force_res=('--force-res' in argv))
    except Exception as e:
        sys.exit(f'[bk] Lỗi tải {asset_id}: {e}')
    pos_out = argv[1] if len(argv) > 1 and not argv[1].startswith('-') else None
    out_glb = opt(argv, '--out', default=pos_out)
    inspect_png = opt(argv, '--inspect')
    target_len = opt(argv, '--target-len', default='')
    length_x = opt(argv, '--length', default='')
    height_y = opt(argv, '--height', default='')
    front = opt(argv, '--front', '--forward', default='auto')
    up = opt(argv, '--up', default='auto')
    ground = opt(argv, '--ground', default='bottom')
    decimate = opt(argv, '--decimate', default='')
    rig_json = opt(argv, '--rig', default='')
    recolor = opt(argv, '--recolor', default='')
    save_slug = opt(argv, '--save-cache', default='')
    report_json = str(src.parent / f'report_{role}.json')

    if out_glb:
        Path(out_glb).parent.mkdir(parents=True, exist_ok=True)
    if inspect_png:
        Path(inspect_png).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        BLENDER_BIN, '--background', '--factory-startup', '--python', str(PREP_SCRIPT), '--',
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
    if length_x:
        cmd += ['--length', str(length_x)]
    if height_y:
        cmd += ['--height', str(height_y)]
    if decimate:
        cmd += ['--decimate', str(decimate)]
    if rig_json:
        cmd += ['--rig', str(Path(rig_json).resolve())]
    if '--keep-nodes' in argv:
        cmd += ['--keep-nodes']
    if recolor:
        cmd += ['--recolor', recolor]

    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        sys.exit(f'Blender prep lỗi (mã {r.returncode})')
    for ln in r.stdout.splitlines():
        if ln.startswith('[bk-prep]'):
            print(ln)
    if save_slug and out_glb and Path(out_glb).is_file():
        PREPPED_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out_glb, PREPPED_DIR / f'{save_slug}.glb')
        if Path(report_json).is_file():
            shutil.copy2(report_json, PREPPED_DIR / f'{save_slug}.meta.json')
        print(f'[bk] Đã lưu bản chuẩn hoá dùng chung: bk_cache/prepped/{save_slug}.glb')
    if Path(report_json).exists():
        print(f'[bk] Báo cáo: {report_json}')


def cmd_prep_actor(argv: list[str]):
    if not argv:
        sys.exit('Cần asset_uuid hoặc .blend: bk.py prep-actor <uuid> <out.glb> [--preset <file.json[:tên]>]')
    if not Path(BLENDER_BIN).exists():
        sys.exit(f'Không tìm thấy Blender tại {BLENDER_BIN}')
    asset_id = argv[0]
    res = opt(argv, '--res', default='1K')
    try:
        src = fetch_asset(asset_id, res_pref=res, force_res=('--force-res' in argv))
    except Exception as e:
        sys.exit(f'[bk] Lỗi tải {asset_id}: {e}')

    pos_out = argv[1] if len(argv) > 1 and not argv[1].startswith('-') else None
    out_glb = opt(argv, '--out', default=pos_out)
    inspect_png = opt(argv, '--inspect')
    preset_arg = opt(argv, '--preset', default='')
    prop_arg = opt(argv, '--prop', default='')
    decimate = opt(argv, '--decimate', default='28000')
    save_slug = opt(argv, '--save-cache', default='')

    resolved_preset = ''
    preset_default_prop = ''
    preset_tag = 'default'
    if preset_arg:
        p_file, sep, key = preset_arg.partition(':')
        pf = Path(p_file)
        if not pf.is_file():
            pf = ROOT / p_file
        if not pf.is_file():
            sys.exit(f'[bk] Không tìm thấy file preset: {p_file}')
        resolved_preset = f'{pf.resolve()}:{key}' if (sep and key) else str(pf.resolve())
        preset_tag = key if (sep and key) else pf.stem
        raw_p = json.loads(pf.read_text(encoding='utf-8'))
        preset_default_prop = raw_p.get('default_prop_cache', '')
        if sep and key and isinstance(raw_p.get('presets'), dict) and key in raw_p['presets']:
            preset_default_prop = raw_p['presets'][key].get('default_prop_cache', preset_default_prop)

    resolved_prop = ''
    if '--no-prop' not in argv:
        cand_prop = prop_arg or preset_default_prop
        if cand_prop:
            pp = Path(cand_prop)
            if not pp.is_file() and (PREPPED_DIR / f'{cand_prop}.glb').is_file():
                pp = PREPPED_DIR / f'{cand_prop}.glb'
            elif not pp.is_file() and (ROOT / cand_prop).is_file():
                pp = ROOT / cand_prop
            if pp.is_file():
                resolved_prop = str(pp.resolve())
            elif prop_arg:
                sys.exit(f'[bk] Không tìm thấy file đạo cụ --prop: {prop_arg}')

    report_json = str(src.parent / f'report_actor_{preset_tag}.json')
    if out_glb:
        Path(out_glb).parent.mkdir(parents=True, exist_ok=True)
    if inspect_png:
        Path(inspect_png).parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        BLENDER_BIN, '--background', '--factory-startup', '--python', str(ACTOR_PREP_SCRIPT), '--',
        '--src', str(src),
        '--mixamo-dir', str(MIXAMO_DIR),
        '--decimate', str(decimate),
        '--report', report_json,
    ]
    if out_glb:
        cmd += ['--out', str(Path(out_glb).resolve())]
    if inspect_png:
        cmd += ['--inspect', str(Path(inspect_png).resolve())]
    if resolved_preset:
        cmd += ['--preset', resolved_preset]
    if resolved_prop:
        cmd += ['--prop', resolved_prop]

    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stdout[-3000:], r.stderr[-3000:])
        sys.exit(f'Blender prep-actor lỗi (mã {r.returncode})')
    for ln in r.stdout.splitlines():
        if ln.startswith(('[bk-actor]', '[mocap-pack]')):
            print(ln)
    if save_slug and out_glb and Path(out_glb).is_file():
        PREPPED_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out_glb, PREPPED_DIR / f'{save_slug}.glb')
        if Path(report_json).is_file():
            shutil.copy2(report_json, PREPPED_DIR / f'{save_slug}.meta.json')
        print(f'[bk] Đã lưu nhân vật chuẩn hoá dùng chung: bk_cache/prepped/{save_slug}.glb')
    if Path(report_json).exists():
        print(f'[bk] Báo cáo: {report_json}')


def cmd_list_prepped():
    if not PREPPED_DIR.is_dir():
        print('[bk] Chưa có mô hình chuẩn hoá sẵn trong bk_cache/prepped/')
        return
    for g in sorted(PREPPED_DIR.glob('*.glb')):
        meta_p = g.with_suffix('.meta.json')
        info = json.loads(meta_p.read_text()) if meta_p.is_file() else {}
        if info.get('type') == 'mocap_pack':
            print(f"  {g.stem:24s} | {g.stat().st_size // 1024:5d} KB | mocap_pack ({info.get('clip_count')} clips)")
            continue
        dim = info.get('gltf_dimensions_m', {})
        pivs = list((info.get('pivots_gltf') or {}).keys())
        print(f"  {g.stem:24s} | {g.stat().st_size // 1024:5d} KB | faces={info.get('faces_after')} "
              f"| dim={dim.get('length_x')}x{dim.get('height_y')}x{dim.get('width_z')}m | pivots={pivs}")


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sub, rest = sys.argv[1], sys.argv[2:]
    if sub == 'search':
        cmd_search(rest)
    elif sub == 'fetch':
        cmd_fetch(rest)
    elif sub == 'inspect-parts':
        cmd_inspect_parts(rest)
    elif sub == 'prep':
        cmd_prep(rest)
    elif sub == 'prep-actor':
        cmd_prep_actor(rest)
    elif sub == 'list-prepped':
        cmd_list_prepped()
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
