#!/usr/bin/env python3
"""Công cụ tra cứu kho mocap Mixamo (`mixamo/manifest.csv`) và đóng gói clip hoạt cảnh `.glb` dùng chung.

Tuyệt đối chỉ đọc `mixamo/manifest.csv` khi tìm kiếm (không quét hàng nghìn file `.fbx`).
Hoạt động độc lập mọi chủ đề (quân sự, lịch sử, khoa học, dân sự).

Cách dùng:
  python3 core/tools/mocap.py search "<từ khoá 1>" ["<từ khoá 2>" ...] [-n 20]
  python3 core/tools/mocap.py pack --out <anims.glb> --spec <clips.json> [--base-rig <actor.glb>]
      [--report <speeds.json>] [--save-cache <slug>]
  python3 core/tools/mocap.py pack --out <anims.glb> --clips "Walk=Walking__c9c84e7b.fbx:two_hand,Idle=Idle__xxx.fbx:none"
      [--prop-grip 0.018,0.225,-0.072 --prop-fore -0.020,0.482,-0.020] [--base-rig <actor.glb>]
      [--report <speeds.json>] [--save-cache <slug>]
"""
from __future__ import annotations

import csv
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MIXAMO_DIR = ROOT / 'mixamo'
MANIFEST_CSV = MIXAMO_DIR / 'manifest.csv'
PREPPED_DIR = ROOT / 'bk_cache' / 'prepped'
BLENDER_BIN = os.environ.get('BLENDER_BIN', '/Applications/Blender.app/Contents/MacOS/Blender')
PACK_SCRIPT = Path(__file__).resolve().parent / 'mocap_blender_pack.py'

VALUE_FLAGS = {
    '-n', '--limit', '--out', '--spec', '--clips', '--base-rig',
    '--prop-grip', '--prop-fore', '--report', '--save-cache',
}


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


def _load_manifest() -> list[dict[str, str]]:
    if not MANIFEST_CSV.is_file():
        sys.exit(f'[mocap] Không tìm thấy {MANIFEST_CSV}')
    with open(MANIFEST_CSV, 'r', encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


def _score_row(row: dict[str, str], terms: list[str]) -> int:
    name_l = (row.get('name') or '').lower()
    desc_l = (row.get('description') or '').lower()
    file_l = (row.get('file') or '').lower()
    hay = f'{name_l} {desc_l} {file_l}'
    if not all(t in hay for t in terms):
        return 0
    score = 10
    if all(t in name_l for t in terms):
        score += 20
    phrase = ' '.join(terms)
    if phrase in name_l:
        score += 30
    elif phrase in desc_l:
        score += 15
    return score


def cmd_search(argv: list[str]):
    queries = positional_args(argv)
    if not queries:
        sys.exit('Cần từ khoá: python3 core/tools/mocap.py search "rifle walk" ["reload" ...]')
    limit = max(1, int(opt(argv, '-n', '--limit', default='20')))
    rows = _load_manifest()
    blocks: list[str] = []
    for q in queries:
        terms = [t for t in q.lower().replace('_', ' ').split() if t]
        scored: list[tuple[int, dict[str, str]]] = []
        for r in rows:
            sc = _score_row(r, terms)
            if sc > 0:
                scored.append((sc, r))
        scored.sort(key=lambda x: (-x[0], x[1].get('name', ''), x[1].get('file', '')))
        lines = [f"Tìm Mixamo '{q}' (manifest {len(rows)} clip): khớp {len(scored)} kết quả"]
        for _, r in scored[:limit]:
            lines.append(
                f"  {r.get('file', ''):44s} | {r.get('name', ''):28s} | {r.get('description', '')}"
            )
        blocks.append('\n'.join(lines))
    print('\n\n'.join(blocks))


def _parse_vec3(s: str | None) -> list[float] | None:
    if not s:
        return None
    parts = [float(x.strip()) for x in s.split(',')]
    if len(parts) != 3:
        sys.exit(f'[mocap] Vector 3 chiều không hợp lệ: {s} (cần x,y,z)')
    return parts


def _parse_inline_clips(raw: str) -> list[dict[str, str]]:
    items: list[dict[str, str]] = []
    for entry in raw.split(','):
        entry = entry.strip()
        if not entry:
            continue
        if '=' in entry:
            alias, rest = entry.split('=', 1)
        else:
            rest = entry
            alias = Path(rest.split(':', 1)[0]).stem.split('__')[0]
        if ':' in rest:
            fbx_file, mode = rest.split(':', 1)
        else:
            fbx_file, mode = rest, 'none'
        items.append({'clip': alias.strip(), 'fbx': fbx_file.strip(), 'mode': mode.strip()})
    return items


def cmd_pack(argv: list[str]):
    if not Path(BLENDER_BIN).exists():
        sys.exit(f'[mocap] Không tìm thấy Blender tại {BLENDER_BIN}')
    pos = positional_args(argv)
    out_glb = opt(argv, '--out', default=(pos[0] if pos else None))
    if not out_glb:
        sys.exit('Cần --out <anims.glb>: python3 core/tools/mocap.py pack --out <anims.glb> --spec <clips.json>')

    spec_path = opt(argv, '--spec')
    inline_clips = opt(argv, '--clips')
    if not spec_path and not inline_clips:
        sys.exit('Cần --spec <clips.json> hoặc --clips "Alias=File.fbx[:mode],..."')

    spec_data: dict = {}
    if spec_path:
        sp = Path(spec_path)
        if not sp.is_file():
            sys.exit(f'[mocap] Không tìm thấy file spec: {sp}')
        spec_data = json.loads(sp.read_text(encoding='utf-8'))

    if inline_clips:
        spec_data['clips'] = _parse_inline_clips(inline_clips)

    grip_override = _parse_vec3(opt(argv, '--prop-grip'))
    fore_override = _parse_vec3(opt(argv, '--prop-fore'))
    if grip_override is not None:
        spec_data['grip_local'] = grip_override
    if fore_override is not None:
        spec_data['fore_local'] = fore_override

    clips = spec_data.get('clips') or []
    if not clips:
        sys.exit('[mocap] Danh sách clips rỗng.')
    for c in clips:
        fp = MIXAMO_DIR / c['fbx']
        if not fp.is_file():
            sys.exit(f"[mocap] Không tìm thấy file FBX trong mixamo/: {c['fbx']}")

    out_p = Path(out_glb).resolve()
    out_p.parent.mkdir(parents=True, exist_ok=True)
    report_p = Path(opt(argv, '--report', default=str(out_p.with_suffix('.speeds.json')))).resolve()
    report_p.parent.mkdir(parents=True, exist_ok=True)
    base_rig = opt(argv, '--base-rig', default='')
    save_slug = opt(argv, '--save-cache', default='')

    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, encoding='utf-8') as tf:
        json.dump(spec_data, tf, ensure_ascii=False, indent=2)
        tmp_spec = Path(tf.name)

    try:
        cmd = [
            BLENDER_BIN, '--background', '--factory-startup', '--python', str(PACK_SCRIPT), '--',
            '--mixamo-dir', str(MIXAMO_DIR),
            '--spec', str(tmp_spec),
            '--out', str(out_p),
            '--report', str(report_p),
        ]
        if base_rig:
            br_path = Path(base_rig)
            if not br_path.is_file() and (PREPPED_DIR / f'{base_rig}.glb').is_file():
                br_path = PREPPED_DIR / f'{base_rig}.glb'
            if not br_path.is_file():
                sys.exit(f'[mocap] Không tìm thấy --base-rig: {base_rig}')
            cmd += ['--base-rig', str(br_path.resolve())]

        r = subprocess.run(cmd, capture_output=True, text=True)
        if r.returncode != 0:
            print(r.stdout[-3000:], r.stderr[-3000:], file=sys.stderr)
            sys.exit(f'[mocap] Blender pack lỗi (mã {r.returncode})')
        for ln in r.stdout.splitlines():
            if ln.startswith('[mocap-pack]'):
                print(ln)
    finally:
        tmp_spec.unlink(missing_ok=True)

    if save_slug and out_p.is_file():
        PREPPED_DIR.mkdir(parents=True, exist_ok=True)
        shutil.copy2(out_p, PREPPED_DIR / f'{save_slug}.glb')
        if report_p.is_file():
            meta = {
                'type': 'mocap_pack',
                'clip_count': len(clips),
                'clips': json.loads(report_p.read_text(encoding='utf-8')),
            }
            (PREPPED_DIR / f'{save_slug}.meta.json').write_text(
                json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8'
            )
        print(f'[mocap] Đã lưu gói hoạt cảnh dùng chung: bk_cache/prepped/{save_slug}.glb')
    print(f'[mocap] Bảng vận tốc & thời lượng: {report_p}')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sub, rest = sys.argv[1], sys.argv[2:]
    if sub == 'search':
        cmd_search(rest)
    elif sub == 'pack':
        cmd_pack(rest)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
