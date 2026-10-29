#!/usr/bin/env python3
"""Ảnh kiểm hình (nhiều khung ghép lưới) cho một dự án.

    python3 tools/sheet.py <id>                               cả video → out/sheet.png (24 khung, cần build.py trước)
    python3 tools/sheet.py <id> --scene S03,S07               từng cảnh cô lập → out/scenes/S03.png … (6 khung, rộng 960; tự kiểm tsc riêng, KHÔNG cần build.py)
    python3 tools/sheet.py <id> --from 40 --to 60             một đoạn → out/sheet_40-60.png (cần build.py trước)
    python3 tools/sheet.py <id> --model MQ9Reaper,GBU39SDB    mô hình 4 góc cô lập → out/models/<Tên>.png (tự kiểm tsc riêng, KHÔNG cần build.py hay index.ts; truyền 'all' để chụp hết)
    tuỳ chọn: --n 6  --cols 3  --width 960  --force (ép chụp lại kể cả chưa đổi code)  --full (render gốc 1080p thay vì scale theo ô)

Mốc giây của từng ô (trái→phải, trên→dưới) in ra stdout và ghi file .txt cạnh ảnh.
Chế độ --scene và --model dùng cache tsc incremental riêng trong projects/<id>/.cache/, tự bỏ qua mục chưa đổi code,
hạ độ phân giải render gốc (--scale) khớp đúng kích thước ô ảnh và điều tiết tối đa 4 tiến trình Chrome đồng thời.
"""
import contextlib
import fcntl
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from common import ENGINE, comp_id, find_media, need, opt, remotion, scenes

MAX_PARALLEL_RENDERS = 4


@contextlib.contextmanager
def render_slot(max_slots: int = MAX_PARALLEL_RENDERS):
    """Giới hạn tối đa `max_slots` tiến trình Chrome/Remotion render đồng thời trên máy (kernel tự nhả khóa nếu tiến trình bị dừng đột ngột)."""
    lock_dir = Path(tempfile.gettempdir()) / '2d_military_render_locks'
    lock_dir.mkdir(exist_ok=True)
    fh = None
    start_idx = os.getpid() % max_slots
    while fh is None:
        for k in range(max_slots):
            slot = lock_dir / f'slot_{(start_idx + k) % max_slots}.lock'
            f = open(slot, 'w')
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                f.write(f'{os.getpid()}\n')
                f.flush()
                fh = f
                break
            except BlockingIOError:
                f.close()
        if fh is None:
            time.sleep(0.35)
    try:
        yield
    finally:
        try:
            fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        finally:
            fh.close()


@contextlib.contextmanager
def work_lock(work_dir: Path):
    """Khoá theo thư mục cache cố định để giữ tsconfig.tsbuildinfo an toàn giữa các vòng chạy."""
    work_dir.mkdir(parents=True, exist_ok=True)
    lf = open(work_dir / '.lock', 'w')
    try:
        fcntl.flock(lf.fileno(), fcntl.LOCK_EX)
        yield work_dir
    finally:
        try:
            fcntl.flock(lf.fileno(), fcntl.LOCK_UN)
        finally:
            lf.close()


def render_scale(width: int, full: bool) -> float:
    """Tính hệ số --scale của Remotion khớp đúng kích thước ô ảnh đầu ra (1.0 khi --full)."""
    if full or width > 960:
        return 1.0
    return max(0.25, min(1.0, round(width / 1920.0, 4)))


def tile_frames(frames: list[Path], td: Path, cols: int, width: int, out: Path):
    """Đánh số lại bằng symlink (0 subprocess) rồi scale + ghép lưới trong 1 lệnh ffmpeg duy nhất, ghi nguyên tử."""
    ext = frames[0].suffix
    for i, fr in enumerate(frames):
        link = td / f'l{i:03d}{ext}'
        if link.exists() or link.is_symlink():
            link.unlink()
        os.symlink(fr.resolve(), link)
    rows = (len(frames) + cols - 1) // cols
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp_out = td / f'out_{os.getpid()}{out.suffix}'
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-framerate', '1', '-i', str(td / f'l%03d{ext}'),
        '-vf', f'scale={width}:-1,tile={cols}x{rows}:padding=4',
        '-frames:v', '1', str(tmp_out),
    ], check=True)
    os.replace(tmp_out, out)


def write_secs_atomic(out: Path, secs: str, td: Path):
    txt = out.with_suffix('.txt')
    tmp_txt = td / f'out_{os.getpid()}.txt'
    tmp_txt.write_text(secs + '\n')
    os.replace(tmp_txt, txt)


def ensure_node_modules(pdir: Path):
    nm = pdir.parent / 'node_modules'
    if not nm.exists():
        try:
            os.symlink('../engine/node_modules', nm)
        except FileExistsError:
            pass


def latest_mtime(paths: list[Path]) -> float:
    mt = 0.0
    for p in paths:
        if p.is_file():
            mt = max(mt, p.stat().st_mtime)
        elif p.is_dir():
            for sub in p.rglob('*'):
                if sub.is_file() and sub.suffix in ('.ts', '.tsx', '.json'):
                    mt = max(mt, sub.stat().st_mtime)
    return mt


def run_isolated_tsc(work: Path, includes: list[str], label: str):
    """Chạy tsc có cache incremental (.tsbuildinfo) giữ lại trong thư mục `work`."""
    tsconfig_file = work / 'tsconfig.json'
    cfg = {
        'extends': Path(os.path.relpath(ENGINE / 'tsconfig.base.json', work)).as_posix(),
        'compilerOptions': {
            'incremental': True,
            'tsBuildInfoFile': './tsconfig.tsbuildinfo',
        },
        'include': includes,
    }
    new_cfg = json.dumps(cfg, indent=2) + '\n'
    if not tsconfig_file.exists() or tsconfig_file.read_text() != new_cfg:
        tsconfig_file.write_text(new_cfg)

    r_tsc = subprocess.run([str(ENGINE / 'node_modules/.bin/tsc'), '-p', str(tsconfig_file)], capture_output=True, text=True)
    errs = [ln for ln in (r_tsc.stdout + r_tsc.stderr).splitlines() if 'error TS' in ln]
    if errs:
        print(f'LỖI TypeScript khi kiểm {label}:')
        for e in errs[:30]:
            print('  ', e)
        sys.exit(1)


def sync_scene_media(pdir: Path, target_scenes: list[str]):
    """Quét media('…') trong local/, cues.ts và các cảnh đang chụp để chép an toàn vào public/media/ mà không cần build.py."""
    scan_files: list[Path] = []
    cues = pdir / 'video/cues.ts'
    if cues.exists():
        scan_files.append(cues)
    local_dir = pdir / 'video/local'
    if local_dir.exists():
        scan_files.extend(p for p in local_dir.rglob('*') if p.suffix in ('.ts', '.tsx'))
    for sid in target_scenes:
        sf = pdir / 'video/scenes' / f'{sid}.tsx'
        if sf.exists():
            scan_files.append(sf)

    refs: set[str] = set()
    for f in scan_files:
        refs |= set(re.findall(r"media\(\s*['\"]([^'\"]+)['\"]\s*\)", f.read_text()))

    (pdir / 'public').mkdir(exist_ok=True)
    pub_media = pdir / 'public/media'
    missing = []
    for rel in sorted(refs):
        src = find_media(pdir, rel)
        if not src:
            missing.append(rel)
            continue
        dst = pub_media / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        if not dst.exists() or dst.stat().st_mtime < src.stat().st_mtime:
            tmp_dst = dst.with_name(f'.tmp_{os.getpid()}_{dst.name}')
            shutil.copy2(src, tmp_dst)
            os.replace(tmp_dst, dst)
    if missing:
        for rel in missing:
            print(f'  THIẾU media: {rel} (không có trong input/ hay library/)')
        sys.exit(1)


def shoot(pdir: Path, a: float, b: float, n: int, cols: int, width: int, out: Path, fps: int, full: bool):
    f0, f1 = round(a * fps), max(round(a * fps), round(b * fps) - 1)
    step = max(1, (f1 - f0) // max(1, n - 1)) if n > 1 else f1 - f0 + 1
    scale = render_scale(width, full)
    props = json.dumps({'music': False, 'sfx': False})
    with tempfile.TemporaryDirectory() as td:
        td_path = Path(td)
        with render_slot():
            r = remotion([
                'render', str(pdir / 'video/entry.tsx'), comp_id(pdir.name), str(td_path / 'f'),
                '--sequence', '--image-format=jpeg',
                f'--frames={f0}-{f1}', f'--every-nth-frame={step}',
                f'--scale={scale}', f'--props={props}',
                '--muted', f'--public-dir={pdir / "public"}', '--log=error',
            ], capture_output=True, text=True)
        frames = sorted((td_path / 'f').glob('*.jpeg'))[:n]
        if r.returncode or not frames:
            print(r.stdout[-3000:], r.stderr[-3000:])
            sys.exit('render lỗi')
        tile_frames(frames, td_path, cols, width, out)
        secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(frames)))
        write_secs_atomic(out, secs, td_path)
    print(out, '\n  mốc (giây):', secs)


def shoot_isolated_scenes(pdir: Path, spec: dict, want: list[str], n: int, cols: int, width: int, fps: int, force: bool, full: bool):
    """Kiểm kiểu TypeScript riêng (incremental) + tự bỏ qua cảnh chưa đổi + chụp lưới cô lập không đụng Video.tsx / entry.tsx."""
    by = {s['id']: s for s in spec['scenes']}
    for sid in want:
        if sid not in by:
            sys.exit(f'không có cảnh {sid} trong plan/scenes.json')
        sf = pdir / 'video/scenes' / f'{sid}.tsx'
        if not sf.exists():
            sys.exit(f'chưa có file video/scenes/{sid}.tsx')

    ensure_node_modules(pdir)
    sync_scene_media(pdir, want)
    scale = render_scale(width, full)

    tag = 'scene_' + '_'.join(want)
    with work_lock(pdir / '.cache' / tag) as work:
        imports = [
            "import React from 'react';",
            "import { AbsoluteFill, Composition, registerRoot } from 'remotion';",
        ]
        wrappers = []
        comps = []
        plan: dict[str, tuple[int, int, int, int]] = {}

        for sid in want:
            s = by[sid]
            rel_mod = Path(os.path.relpath(pdir / 'video/scenes' / sid, work)).as_posix()
            imports.append(f"import {sid} from '{rel_mod}';")

            pad = min(0.3, (s['to'] - s['from']) / 10)
            a, b = s['from'] + pad, s['to'] - pad
            f0 = round(a * fps)
            f1 = max(f0, round(b * fps) - 1)
            step = max(1, (f1 - f0) // max(1, n - 1)) if n > 1 else f1 - f0 + 1

            base_f = max(0, round(s['from'] * fps) - 6)
            end_f = max(base_f + 1, round(s['to'] * fps) + 6, f1 + 1)
            dur_frames = end_f - base_f
            t0_val = base_f / fps

            wrappers.append(
                f"const Wrap_{sid}: React.FC = () => ("
                f"<AbsoluteFill style={{{{ backgroundColor: '#000' }}}}>"
                f"<{sid} t0={{{t0_val:.8f}}} />"
                f"</AbsoluteFill>);"
            )
            comps.append(
                f'    <Composition id="scene-{sid}" component={{Wrap_{sid}}} durationInFrames={{{dur_frames}}} fps={{{fps}}} width={{1920}} height={{1080}} />'
            )
            plan[sid] = (f0, f0 - base_f, f1 - base_f, step)

        entry_file = work / 'entry.tsx'
        entry_src = (
            '\n'.join(imports) + '\n\n'
            + '\n'.join(wrappers) + '\n\n'
            + 'registerRoot(() => (\n  <>\n'
            + '\n'.join(comps) + '\n  </>\n));\n'
        )
        if not entry_file.exists() or entry_file.read_text() != entry_src:
            entry_file.write_text(entry_src)

        # Kiểm kiểu cô lập theo đúng cây import từ entry.tsx (không bị ảnh hưởng bởi cảnh nhóm khác đang sửa dở)
        includes = ['./entry.tsx']
        if (pdir / 'video/cues.ts').exists():
            includes.append(Path(os.path.relpath(pdir / 'video/cues.ts', work)).as_posix())
        run_isolated_tsc(work, includes, f"cảnh {', '.join(want)}")

        # Chỉ render những cảnh thực sự có thay đổi mã nguồn (trừ khi có --force)
        shared_mt = latest_mtime([pdir / 'plan/scenes.json', pdir / 'video/cues.ts', pdir / 'video/local'])
        dirty: list[str] = []
        for sid in want:
            out_png = pdir / 'out/scenes' / f'{sid}.png'
            out_txt = out_png.with_suffix('.txt')
            sc_mt = max(shared_mt, (pdir / 'video/scenes' / f'{sid}.tsx').stat().st_mtime)
            if (not force and not full and out_png.exists() and out_txt.exists()
                    and out_png.stat().st_mtime >= sc_mt and len(out_txt.read_text().split()) == n):
                print(f'{out_png}  [bỏ qua: chưa đổi code — thêm --force để chụp lại]')
            else:
                dirty.append(sid)

        if not dirty:
            return

        with tempfile.TemporaryDirectory(dir=work, prefix='shots_') as tmp_shots:
            shots_dir = Path(tmp_shots)
            with render_slot():
                if len(dirty) > 1:
                    bundle_dir = shots_dir / 'bundle'
                    rb = remotion(['bundle', str(entry_file), f'--out-dir={bundle_dir}', f'--public-dir={pdir / "public"}', '--log=error'],
                                  capture_output=True, text=True)
                    if rb.returncode:
                        print(rb.stdout[-3000:], rb.stderr[-3000:])
                        sys.exit('bundle lỗi')
                    serve_target = str(bundle_dir)
                    pub_flags: list[str] = []
                else:
                    serve_target = str(entry_file)
                    pub_flags = [f'--public-dir={pdir / "public"}']

                for sid in dirty:
                    f0, lf0, lf1, step = plan[sid]
                    sc_td = shots_dir / f'shot_{sid}'
                    sc_td.mkdir(exist_ok=True)
                    r = remotion([
                        'render', serve_target, f'scene-{sid}', str(sc_td / 'f'),
                        '--sequence', '--image-format=jpeg',
                        f'--frames={lf0}-{lf1}', f'--every-nth-frame={step}',
                        f'--scale={scale}', '--muted', *pub_flags, '--log=error',
                    ], capture_output=True, text=True)
                    frames = sorted((sc_td / 'f').glob('*.jpeg'))[:n]
                    if r.returncode or not frames:
                        print(r.stdout[-3000:], r.stderr[-3000:])
                        sys.exit(f'render lỗi ở cảnh {sid}')
                    out = pdir / 'out/scenes' / f'{sid}.png'
                    tile_frames(frames, sc_td, cols, width, out)
                    secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(frames)))
                    write_secs_atomic(out, secs, sc_td)
                    print(out, '\n  mốc (giây):', secs)


def _extract_models_keys(src: str) -> list[str]:
    """Trích danh sách key cấp 1 của `export const MODELS ... = { Key: { ... } }`."""
    m = re.search(r'\bexport\s+const\s+MODELS\b[^=]*=\s*\{', src)
    if not m:
        return []
    i, n = m.end(), len(src)
    depth = 1
    buf: list[str] = []
    while i < n and depth > 0:
        ch = src[i]
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                break
        elif depth == 1:
            buf.append(ch)
        i += 1
    top = ''.join(buf)
    return list(dict.fromkeys(re.findall(r'(?:^|[,;\n])\s*([A-Za-z_][A-Za-z0-9_]*)\s*:', top)))


def _index_imports_ready(index_file: Path) -> bool:
    """Kiểm tra mọi import tương đối './X' trong models/index.ts đã có file thật trên đĩa chưa."""
    src = index_file.read_text()
    base = index_file.parent
    for rel in re.findall(r"""from\s+['"](\.[^'"]+)['"]""", src):
        cand = base / rel
        if not any(cand.with_suffix(ext).exists() for ext in ('', '.ts', '.tsx')) and not (cand / 'index.ts').exists() and not (cand / 'index.tsx').exists():
            return False
    return True


def resolve_model_targets(pdir: Path, raw_spec: str) -> list[tuple[str, Path, str]]:
    """Ánh xạ danh sách tên model sang [(model_name, source_file, 'models_map' | 'component')] mà không cần build.py."""
    models_dir = pdir / 'video/local/models'
    if not models_dir.exists():
        sys.exit(f'chưa có thư mục {models_dir}')

    leaf_files = sorted(f for f in models_dir.iterdir() if f.is_file() and f.suffix in ('.ts', '.tsx') and f.stem != 'index')
    index_file = next((f for f in (models_dir / 'index.tsx', models_dir / 'index.ts') if f.exists()), None)

    leaf_info: dict[Path, tuple[list[str], set[str]]] = {}
    for f in leaf_files:
        txt = f.read_text()
        mkeys = _extract_models_keys(txt)
        comps = set(re.findall(r'\bexport\s+(?:const|function)\s+([A-Z][A-Za-z0-9_]*)\b', txt))
        leaf_info[f] = (mkeys, comps)

    idx_keys: list[str] = []
    if index_file and _index_imports_ready(index_file):
        idx_keys = _extract_models_keys(index_file.read_text())

    tokens = [x.strip() for x in raw_spec.split(',') if x.strip()]
    if tokens == ['all']:
        seen: list[str] = []
        for f in leaf_files:
            for k in leaf_info[f][0]:
                if k not in seen:
                    seen.append(k)
        for k in idx_keys:
            if k not in seen:
                seen.append(k)
        if not seen:
            for f in leaf_files:
                if f.stem in leaf_info[f][1] and f.stem not in seen:
                    seen.append(f.stem)
        tokens = seen

    if not tokens:
        sys.exit('chưa tìm thấy mô hình nào để chụp (ví dụ: --model MQ9Reaper)')

    resolved: list[tuple[str, Path, str]] = []
    seen_names: set[str] = set()
    for tok in tokens:
        file_hint, name = tok.split(':', 1) if ':' in tok else (None, tok)
        if name in seen_names:
            continue
        seen_names.add(name)

        if file_hint:
            target = next((models_dir / f'{file_hint}{ext}' for ext in ('', '.tsx', '.ts') if (models_dir / f'{file_hint}{ext}').is_file()), None)
            if not target:
                sys.exit(f'không thấy file mô hình {file_hint} trong {models_dir}')
            mkeys, comps = leaf_info.get(target, (_extract_models_keys(target.read_text()), set()))
            if name in mkeys:
                resolved.append((name, target, 'models_map'))
            elif name in comps:
                resolved.append((name, target, 'component'))
            else:
                sys.exit(f'file {target.name} không export MODELS[{name!r}] hay component {name}')
            continue

        # Ưu tiên 1: file lẻ export `MODELS` chứa `name` (cô lập 100% cho subagent Bước A2 chạy song song)
        ordered_leaves = sorted(leaf_files, key=lambda f: (0 if f.stem == name else 1, f.name))
        hit_leaf = next((f for f in ordered_leaves if name in leaf_info[f][0]), None)
        if hit_leaf:
            resolved.append((name, hit_leaf, 'models_map'))
            continue

        # Ưu tiên 2: models/index.ts đã khai `MODELS[name]` (tương thích ngược hoàn toàn)
        if index_file and name in idx_keys:
            resolved.append((name, index_file, 'models_map'))
            continue

        # Ưu tiên 3: file lẻ export trực tiếp component `<Name />` (chưa khai MODELS vẫn chụp được ngay)
        hit_comp = next((f for f in ordered_leaves if name in leaf_info[f][1]), None)
        if hit_comp:
            resolved.append((name, hit_comp, 'component'))
            continue

        avail = sorted({k for f in leaf_files for k in leaf_info[f][0]} | set(idx_keys) | {c for f in leaf_files for c in leaf_info[f][1]})
        sys.exit(f"không tìm thấy mô hình '{name}' trong {models_dir} (hiện có: {', '.join(avail) or 'trống'})")

    return resolved


def shoot_isolated_models(pdir: Path, raw_spec: str, width: int, force: bool, full: bool):
    """Kiểm tsc cô lập + chụp bàn xoay 4 góc cho 1 hoặc nhiều mô hình trong 1 phiên Chrome duy nhất, KHÔNG cần build.py."""
    targets = resolve_model_targets(pdir, raw_spec)
    ensure_node_modules(pdir)
    sync_scene_media(pdir, [])
    scale = render_scale(width, full)

    names = [t[0] for t in targets]
    tag = 'model_' + '_'.join(names[:6]) + (f'_{len(names)}' if len(names) > 6 else '')
    with work_lock(pdir / '.cache' / tag) as work:
        imports = [
            "import React from 'react';",
            "import { Composition, registerRoot, useCurrentFrame } from 'remotion';",
            "import { Turntable, type ModelSet } from '@lib/3d/turntable';",
        ]
        file_alias: dict[Path, str] = {}
        comp_imports: list[str] = []
        entries_code: list[str] = []

        for idx, (name, src_file, mode) in enumerate(targets):
            rel_mod = Path(os.path.relpath(src_file.with_suffix(''), work)).as_posix()
            if mode == 'models_map':
                alias = file_alias.get(src_file)
                if not alias:
                    alias = f'M_{len(file_alias)}'
                    file_alias[src_file] = alias
                    imports.append(f"import {{ MODELS as {alias} }} from '{rel_mod}';")
                entries_code.append(f"  {json.dumps(name)}: {alias}[{json.dumps(name)}],")
            else:
                calias = f'C_{idx}'
                comp_imports.append(f"import {{ {name} as {calias} }} from '{rel_mod}';")
                entries_code.append(f"  {json.dumps(name)}: {{ C: {calias} as React.FC, size: 12 }},")

        order_json = json.dumps(names)
        entry_src = (
            '\n'.join(imports + comp_imports) + '\n\n'
            + 'const ALL_MODELS: ModelSet = {\n' + '\n'.join(entries_code) + '\n};\n'
            + f'const DEFAULT_ORDER: string[] = {order_json};\n\n'
            + 'const BatchModels: React.FC<{ names?: string[] }> = ({ names }) => {\n'
            + '  const list = names && names.length > 0 ? names : DEFAULT_ORDER;\n'
            + '  const f = useCurrentFrame();\n'
            + '  const name = list[Math.min(list.length - 1, Math.floor(f / 4))];\n'
            + '  return <Turntable models={ALL_MODELS} name={name} />;\n'
            + '};\n\n'
            + 'registerRoot(() => (\n'
            + f'  <Composition id="isolated-models" component={{BatchModels}} durationInFrames={{{max(4, len(names) * 4)}}} fps={{30}} width={{1920}} height={{1080}} />\n'
            + '));\n'
        )
        entry_file = work / 'entry.tsx'
        if not entry_file.exists() or entry_file.read_text() != entry_src:
            entry_file.write_text(entry_src)

        # Chỉ kiểm đúng entry.tsx và cây import thực sự của mô hình đang chụp (cô lập hoàn toàn với file mô hình nhóm khác đang viết)
        run_isolated_tsc(work, ['./entry.tsx'], f"mô hình {', '.join(names)}")

        shared_local_files = [f for f in (pdir / 'video/local').glob('*.ts*')] if (pdir / 'video/local').exists() else []
        shared_mt = latest_mtime(shared_local_files)
        dirty: list[str] = []
        for name, src_file, _ in targets:
            out_png = pdir / 'out/models' / f'{name}.png'
            dep_mt = latest_mtime([pdir / 'video/local/models']) if src_file.stem == 'index' else max(shared_mt, src_file.stat().st_mtime)
            if not force and not full and out_png.exists() and out_png.stat().st_mtime >= dep_mt:
                print(f'{out_png}  [bỏ qua: chưa đổi code — thêm --force để chụp lại]')
            else:
                dirty.append(name)

        if not dirty:
            return

        total_frames = len(dirty) * 4
        with tempfile.TemporaryDirectory(dir=work, prefix='mshots_') as tmp_shots:
            td_path = Path(tmp_shots)
            with render_slot():
                r = remotion([
                    'render', str(entry_file), 'isolated-models', str(td_path / 'f'),
                    '--sequence', '--image-format=jpeg',
                    f'--frames=0-{total_frames - 1}',
                    f'--scale={scale}',
                    f'--props={json.dumps({"names": dirty})}',
                    '--muted', f'--public-dir={pdir / "public"}', '--log=error',
                ], capture_output=True, text=True)
            frames = sorted((td_path / 'f').glob('*.jpeg'))
            if r.returncode or len(frames) < total_frames:
                print(r.stdout[-3000:], r.stderr[-3000:])
                sys.exit('render lỗi khi chụp mô hình')

            for i, name in enumerate(dirty):
                chunk = frames[i * 4:(i + 1) * 4]
                sub_td = td_path / f'tile_{i}'
                sub_td.mkdir(exist_ok=True)
                out = pdir / 'out/models' / f'{name}.png'
                tile_frames(chunk, sub_td, 2, width, out)
                print(out, '\n  góc: 3/4 trước | ngang | 3/4 sau | chéo cao')


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pdir = need(argv[0])
    force = '--force' in argv
    full = '--full' in argv

    if '--scene' in argv:
        spec = scenes(pdir)
        fps = spec.get('fps', 30)
        want = list(dict.fromkeys(x.strip() for x in opt(argv, '--scene').split(',') if x.strip()))
        if not want:
            sys.exit('chưa chỉ định tên cảnh sau --scene (ví dụ: --scene S01,S02)')
        shoot_isolated_scenes(pdir, spec, want, opt(argv, '--n', 6, int), opt(argv, '--cols', 3, int), opt(argv, '--width', 960, int), fps, force, full)
        return

    if '--model' in argv:
        raw_model = opt(argv, '--model')
        if not raw_model:
            sys.exit('chưa chỉ định tên mô hình sau --model (ví dụ: --model MQ9Reaper hoặc --model all)')
        shoot_isolated_models(pdir, raw_model, opt(argv, '--width', 960, int), force, full)
        return

    if not (pdir / 'video/entry.tsx').exists():
        sys.exit('chưa build (python3 tools/build.py <id>)')

    spec = scenes(pdir)
    fps = spec.get('fps', 30)
    a = opt(argv, '--from', 0.0, float)
    b = opt(argv, '--to', spec['scenes'][-1]['to'], float)
    name = 'sheet.png' if '--from' not in argv and '--to' not in argv else f'sheet_{a:g}-{b:g}.png'
    shoot(pdir, a, b, opt(argv, '--n', 24, int), opt(argv, '--cols', 6, int), opt(argv, '--width', 480, int), pdir / 'out' / name, fps, full)


if __name__ == '__main__':
    shutil.which('ffmpeg') or sys.exit('cần ffmpeg')
    main()
