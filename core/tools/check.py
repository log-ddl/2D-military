#!/usr/bin/env python3
"""Ảnh kiểm (nhiều khung ghép lưới) cho một dự án → out/checks/. Mốc giây từng ô in ra stdout và ghi file .txt cạnh ảnh.

    python3 core/tools/check.py <id>                         cả video → out/checks/sheet.png (24 khung, cần build trước)
    python3 core/tools/check.py <id> --from 40 --to 60       một đoạn → out/checks/sheet_40-60.png (cần build)
    python3 core/tools/check.py <id> --chapter C03           một chương → out/checks/chapters/C03.png (2 khung/cảnh, 12–36; cần build)
    python3 core/tools/check.py <id> --seams [C03,C04]       chỗ nối chương ±1.5 s → out/checks/seams/C03-C04.png (cần build)
    python3 core/tools/check.py <id> --scene C01S02,C01S03   từng cảnh cô lập → out/checks/scenes/C01S02.png (6 khung; KHÔNG cần build)
    python3 core/tools/check.py <id> --part F16,HostGirl     part cô lập theo `preview` của nó → out/checks/parts/F16.png ('all' = mọi part)
    tuỳ chọn: --n 6  --cols 3  --width 960  --force (chụp lại kể cả chưa đổi code)  --full (render đủ độ phân giải)

--scene và --part tự dò đúng cây import của từng mục (cache incremental trong .build/check/), chỉ chụp lại mục thực sự đổi code/tài sản;
--chapter, --seams và --from/--to chỉ đóng gói lát cắt các cảnh nằm trong đoạn cần chụp và tắt giải mã voice.mp3;
giới hạn tối đa 4 tiến trình Chrome render cùng lúc trên máy, nên nhiều subagent gọi song song an toàn.
"""
import contextlib
import fcntl
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

from common import (KIT, LIBRARY, SKILLS, assets, asset_refs, comp_id, ensure_bundle, load, need, opt, remotion, save_json,
                    scene_spec_ts, sync_assets, sync_cues, timeline, tsc, write_if_changed, write_tsconfig)

MAX_PARALLEL_RENDERS = 4
IMPORT_RE = re.compile(r'''(?:from|import)\s*\(?['"]([^'"]+)['"]''')


@contextlib.contextmanager
def render_slot(max_slots: int = MAX_PARALLEL_RENDERS):
    """Giới hạn số tiến trình Chrome/Remotion render đồng thời trên máy (kernel tự nhả khóa nếu tiến trình chết)."""
    lock_dir = Path(tempfile.gettempdir()) / 'video_studio_render_locks'
    lock_dir.mkdir(exist_ok=True)
    fh, start = None, os.getpid() % max_slots
    while fh is None:
        for k in range(max_slots):
            f = open(lock_dir / f'slot_{(start + k) % max_slots}.lock', 'w')
            try:
                fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                fh = f
                break
            except BlockingIOError:
                f.close()
        if fh is None:
            time.sleep(0.35)
    try:
        yield
    finally:
        fcntl.flock(fh.fileno(), fcntl.LOCK_UN)
        fh.close()


@contextlib.contextmanager
def work_lock(work: Path):
    """Khoá thư mục cache để giữ tsbuildinfo và bảng chữ ký an toàn giữa các lần chạy song song."""
    work.mkdir(parents=True, exist_ok=True)
    lf = open(work / '.lock', 'w')
    try:
        fcntl.flock(lf.fileno(), fcntl.LOCK_EX)
        yield work
    finally:
        fcntl.flock(lf.fileno(), fcntl.LOCK_UN)
        lf.close()


def render_scale(tile: int, frame_w: int, full: bool) -> float:
    """--scale của Remotion khớp đúng bề rộng ô ảnh (1.0 khi --full)."""
    return 1.0 if full else max(0.25, min(1.0, round(tile / frame_w, 4)))


def tile_frames(frames: list, td: Path, cols: int, width: int, out: Path):
    """Đánh số lại bằng symlink rồi scale + ghép lưới trong một lệnh ffmpeg, ghi nguyên tử."""
    ext = frames[0].suffix
    for i, fr in enumerate(frames):
        link = td / f'l{i:03d}{ext}'
        if link.exists() or link.is_symlink():
            link.unlink()
        os.symlink(fr.resolve(), link)
    rows = (len(frames) + cols - 1) // cols
    out.parent.mkdir(parents=True, exist_ok=True)
    tmp = td / f'out_{os.getpid()}{out.suffix}'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '1', '-i', str(td / f'l%03d{ext}'),
                    '-vf', f'scale={width}:-1,tile={cols}x{rows}:padding=4', '-frames:v', '1', str(tmp)], check=True)
    os.replace(tmp, out)


def write_secs(out: Path, secs: str):
    write_if_changed(out.with_suffix('.txt'), secs + '\n')


def rel(p: Path, base: Path) -> str:
    return Path(os.path.relpath(p, base)).as_posix()


def typecheck(work: Path, label: str):
    write_tsconfig(work / 'tsconfig.json', ['./entry.tsx'], {'incremental': True, 'tsBuildInfoFile': './tsconfig.tsbuildinfo'})
    errs = tsc(work / 'tsconfig.json')
    if errs:
        print(f'LỖI TypeScript khi kiểm {label}:')
        for e in errs[:30]:
            print('  ', e)
        sys.exit(1)


def render_frames(target: str, comp: str, frames: str, step: int, scale: float, td: Path, pub: list):
    r = remotion(['render', target, comp, str(td / 'f'), '--sequence', '--image-format=jpeg', f'--frames={frames}',
                  f'--every-nth-frame={step}', f'--scale={scale}', '--muted', *pub, '--log=error'], capture_output=True, text=True)
    shots = sorted((td / 'f').glob('*.jpeg'))
    if r.returncode or not shots:
        print(r.stdout[-3000:], r.stderr[-3000:])
        sys.exit(f'render lỗi ({comp})')
    return shots


def bundle(entry: Path, td: Path, pdir: Path):
    rb = remotion(['bundle', str(entry), f'--out-dir={td / "bundle"}', f'--public-dir={pdir / ".build/public"}', '--log=error'],
                  capture_output=True, text=True)
    if rb.returncode:
        print(rb.stdout[-3000:], rb.stderr[-3000:])
        sys.exit('bundle lỗi')
    return str(td / 'bundle')


# ---------------------------------------------------------------- dò phụ thuộc đúng từng cảnh / part

def cue_table(pdir: Path) -> dict:
    """Bảng {khoá_CUE: giá_trị} đọc từ src/cues/*.ts (trừ index.ts)."""
    d = pdir / 'src/cues'
    out = {}
    if d.is_dir():
        for f in sorted(d.glob('*.ts')):
            if f.stem != 'index':
                for k, v in re.findall(r'^\s*([A-Za-z_]\w*)\s*:\s*([^\s,}]+)', f.read_text(), re.M):
                    out[k] = v
    return out


def resolve_ts(base: Path):
    for cand in (base, base.with_suffix('.tsx'), base.with_suffix('.ts'), base.with_suffix('.json'),
                 base / 'index.tsx', base / 'index.ts'):
        if cand.is_file():
            return cand.resolve()
    return None


def trace_deps(start: Path, pdir: Path):
    """Lần theo cây import từ `start` → (tập file nguồn thực sự dùng, tập khoá CUE.<k>, có dùng CUE động không)."""
    cues_idx = (pdir / 'src/cues/index.ts').resolve()
    cues_dir = (pdir / 'src/cues').resolve()
    seen, stack, cue_keys, all_cues = set(), [start.resolve()], set(), False
    while stack:
        cur = stack.pop()
        if cur in seen or not cur.is_file():
            continue
        seen.add(cur)
        txt = cur.read_text(errors='ignore')
        cue_keys.update(re.findall(r'\bCUE\.([A-Za-z_]\w*)', txt))
        if re.search(r'\bCUE\s*\[', txt):
            all_cues = True
        for spec in IMPORT_RE.findall(txt):
            if spec.startswith('.'):
                base = (cur.parent / spec).resolve()
            elif spec.startswith('@core/'):
                base = (KIT / spec[6:]).resolve()
            elif spec.startswith('@skill/'):
                sk, _, rest = spec[7:].partition('/')
                base = (SKILLS / sk / 'lib' / rest).resolve()
            else:
                continue
            nxt = resolve_ts(base)
            if not nxt:
                continue
            if nxt == cues_idx or nxt == cues_dir:
                continue
            stack.append(nxt)
    brand_kit = (KIT / 'brand.ts').resolve()
    if brand_kit in seen and (LIBRARY / 'brand').is_dir():
        seen.update(f.resolve() for f in (LIBRARY / 'brand').iterdir() if f.is_file() and f.name != '.DS_Store')
    if all_cues and cues_dir.is_dir():
        seen.update(f.resolve() for f in cues_dir.glob('*.ts') if f.stem != 'index')
    return seen, cue_keys, all_cues


def read_sigs(pdir: Path) -> dict:
    with work_lock(pdir / '.build/check') as root:
        f = root / 'signatures.json'
        return load(f) if f.is_file() else {}


def update_sigs(pdir: Path, patch: dict):
    if not patch:
        return
    with work_lock(pdir / '.build/check') as root:
        f = root / 'signatures.json'
        cur = load(f) if f.is_file() else {}
        cur.update(patch)
        save_json(f, cur)


def sig_hash(data: dict) -> str:
    return hashlib.sha1(json.dumps(data, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


# ---------------------------------------------------------------- cả video / đoạn / chương / chỗ nối (cần build)

def shoot_ranges(pdir: Path, proj: dict, tl: dict, jobs: list, full: bool):
    """Chụp một hoặc nhiều đoạn [(tag, a, b, n, cols, width, out)].
    Nếu phủ trọn phim → dùng .build/bundle cache; nếu chỉ một phần (chương / mối nối / đoạn) → cắt lát đúng các cảnh liên quan."""
    fps, w, h = proj['fps'], proj['width'], proj['height']
    scenes = tl['scenes']
    plans = []
    for tag, a, b, n, cols, width, out in jobs:
        a = max(0.0, float(a))
        b = min(float(tl['duration']), max(a, float(b)))
        f0, f1 = round(a * fps), max(round(a * fps), round(b * fps) - 1)
        step = max(1, (f1 - f0) // max(1, n - 1)) if n > 1 else f1 - f0 + 1
        hit = [idx for idx, s in enumerate(scenes) if round(s['to'] * fps) > f0 - 7 and round(s['from'] * fps) < f1 + 7]
        i0, i1 = (hit[0], hit[-1]) if hit else (0, len(scenes) - 1)
        plans.append((tag, i0, i1, f0, f1, step, n, cols, width, out))

    silent_props = '--props={"voice":false,"music":false,"sfx":false}'
    if len(plans) == 1 and plans[0][1] == 0 and plans[0][2] == len(scenes) - 1:
        _, _, _, f0, f1, step, n, cols, width, out = plans[0]
        target = ensure_bundle(pdir)
        with tempfile.TemporaryDirectory() as td, render_slot():
            tdp = Path(td)
            shots = render_frames(target, comp_id(pdir.name), f'{f0}-{f1}', step,
                                  render_scale(width, w, full), tdp, [silent_props])[:n]
            tile_frames(shots, tdp, cols, width, out)
        secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(shots)))
        write_secs(out, secs)
        print(out, '\n  mốc (giây):', secs)
        return

    vtxt = (pdir / '.build/Video.tsx').read_text(errors='ignore')
    bad_map = {m.group(1): m.group(0) for m in re.finditer(r"placeholder\('(C\d{2}S\d{2,3})',\s*'[^']*'\)", vtxt)}
    need_idx = sorted({k for _, i0, i1, *_ in plans for k in range(i0, i1 + 1)})
    work_tag = 'slice_' + '_'.join(p[0] for p in plans[:4]) + (f'_{len(plans)}' if len(plans) > 4 else '')

    with work_lock(pdir / '.build/check' / work_tag) as work:
        imports = [
            f"import '{rel(pdir / '.build/assets', work)}';",
            "import React from 'react';",
            "import { Composition, registerRoot } from 'remotion';",
            "import { VideoTimeline, durationOf, type VideoSpec } from '@core/timeline';",
        ]
        trans_imps, scene_imps, comp_expr = set(), [], {}
        use_holder = False
        for k in need_idx:
            s = scenes[k]
            sid = s['id']
            src = pdir / 'src/scenes' / f'{sid}.tsx'
            if sid in bad_map:
                comp_expr[sid], use_holder = bad_map[sid], True
            elif (s['type'] == 'code' or s.get('overlay')) and src.is_file():
                scene_imps.append(f"import {sid} from '{rel(src.with_suffix(''), work)}';")
                comp_expr[sid] = sid
            elif s['type'] == 'code':
                note = 'chưa plan' if s.get('pending') else 'chưa dựng'
                comp_expr[sid], use_holder = f"placeholder('{sid}', '{note}')", True
            else:
                comp_expr[sid] = None
            _, imp = scene_spec_ts(s, comp_expr[sid], w, h)
            if imp:
                trans_imps.add(imp)
        if use_holder:
            imports.append("import { placeholder } from '@core/timeline';")
        overlays = sorted((pdir / 'src/overlays').glob('*.tsx'))
        ov_imps = [f"import Overlay_{f.stem} from '{rel(f.with_suffix(''), work)}';" for f in overlays]
        ov_names = ', '.join(f'Overlay_{f.stem}' for f in overlays)

        specs_ts, comps_ts, bases = [], [], {}
        for tag, i0, i1, f0, f1, step, n, cols, width, out in plans:
            lead = i0 > 0
            tail = i1 < len(scenes) - 1 and (scenes[i1 + 1].get('transition') or 'fade').partition(':')[0] != 'cut'
            lead_f = 6 if lead and (scenes[i0].get('transition') or 'fade').partition(':')[0] != 'cut' else 0
            bases[tag] = round(scenes[i0]['from'] * fps) - lead_f
            items = [scene_spec_ts(scenes[k], comp_expr[scenes[k]['id']], w, h)[0] for k in range(i0, i1 + 1)]
            specs_ts.append(
                f"const spec_{tag}: VideoSpec = {{\n  fps: {fps},\n  lead: {'true' if lead else 'false'}, tail: {'true' if tail else 'false'},\n"
                f"  scenes: [\n    {(',' + chr(10) + '    ').join(items)},\n  ],\n  overlays: [{ov_names}],\n}};"
            )
            cid = comp_id(f'slice-{tag}')
            comps_ts.append(
                f'    <Composition id="{cid}" component={{() => <VideoTimeline spec={{spec_{tag}}} voice={{false}} music={{false}} sfx={{false}} />}} '
                f'durationInFrames={{durationOf(spec_{tag})}} fps={{{fps}}} width={{{w}}} height={{{h}}} />'
            )

        entry_code = '\n'.join([*imports, *sorted(trans_imps), *scene_imps, *ov_imps, '', *specs_ts, '',
                                'registerRoot(() => (', '  <>', *comps_ts, '  </>', '));', ''])
        write_if_changed(work / 'entry.tsx', entry_code)

        with tempfile.TemporaryDirectory(dir=work, prefix='shots_') as td, render_slot():
            tdp = Path(td)
            target, pub = (bundle(work / 'entry.tsx', tdp, pdir), []) if len(plans) > 1 else \
                (str(work / 'entry.tsx'), [f'--public-dir={pdir / ".build/public"}'])
            for tag, i0, i1, f0, f1, step, n, cols, width, out in plans:
                base = bases[tag]
                sd = tdp / tag
                sd.mkdir()
                shots = render_frames(target, comp_id(f'slice-{tag}'), f'{f0 - base}-{f1 - base}', step,
                                      render_scale(width, w, full), sd, pub)[:n]
                tile_frames(shots, sd, cols, width, out)
                secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(shots)))
                write_secs(out, secs)
                print(out, '\n  mốc (giây):', secs)


# ---------------------------------------------------------------- cảnh cô lập

_VI_DIACRITIC_RE = re.compile(
    r'[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]',
    re.IGNORECASE,
)


def warn_scene_typography(pdir: Path, sids: list):
    """Nhắc nhở khi cảnh tự viết thẻ <text>/fontFamily hoặc dùng sai ngôn ngữ chữ so với voice."""
    voice_lang = None
    tr_file = pdir / 'plan/transcript.json'
    if tr_file.is_file():
        try:
            voice_lang = json.loads(tr_file.read_text()).get('language')
        except Exception:
            voice_lang = None

    for sid in sids:
        src = pdir / 'src/scenes' / f'{sid}.tsx'
        if not src.is_file():
            continue
        code = src.read_text()
        raw_txt = len(re.findall(r'<text\b', code))
        raw_font = len(re.findall(r'\bfontFamily\s*:', code))
        if raw_txt or raw_font:
            print(f'  ⚠ [chữ] {sid}.tsx: có {raw_txt} thẻ <text> / {raw_font} fontFamily tự viết — ưu tiên dùng component nhãn chuẩn của skill để đồng bộ chữ toàn kênh')
        if voice_lang == 'en':
            # Bỏ comment trước khi tìm chuỗi hiển thị để không bắt nhầm comment tiếng Việt
            no_comments = re.sub(r'//[^\n]*|/\*[\s\S]*?\*/', '', code)
            ui_strings = re.findall(r'\b(?:text|sub|title|subtitle)\s*=\s*["\']([^"\']+)["\']', no_comments)
            vi_hits = [s for s in ui_strings if _VI_DIACRITIC_RE.search(s)]
            if vi_hits:
                print(f'  ⚠ [ngôn ngữ] {sid}.tsx: voice là tiếng Anh (en) nhưng chữ hiển thị có tiếng Việt: {vi_hits[:3]} — chữ trên hình bắt buộc cùng ngôn ngữ với voice')


def shoot_scenes(pdir: Path, proj: dict, want: list, n: int, cols: int, width: int, force: bool, full: bool):
    tl = timeline(pdir)
    by = {s['id']: s for s in tl['scenes']}
    for sid in want:
        if sid not in by:
            sys.exit(f'không có cảnh {sid} trong plan/chapters/')
        s = by[sid]
        if (s['type'] == 'code' or s.get('overlay')) and not (pdir / 'src/scenes' / f'{sid}.tsx').exists():
            sys.exit(f'chưa có file src/scenes/{sid}.tsx')
    warn_scene_typography(pdir, want)
    sync_cues(pdir)

    fps, w, h = proj['fps'], proj['width'], proj['height']
    cues, reg, sigs = cue_table(pdir), assets(pdir), read_sigs(pdir)
    plan, new_sigs, backfill, all_aids, dirty = {}, {}, {}, set(), []

    for sid in want:
        s = by[sid]
        pad = min(0.3, (s['to'] - s['from']) / 10)
        f0, f1 = round((s['from'] + pad) * fps), round((s['to'] - pad) * fps) - 1
        f1 = max(f0, f1)
        step = max(1, (f1 - f0) // max(1, n - 1)) if n > 1 else f1 - f0 + 1
        base = max(0, round(s['from'] * fps) - 6)
        dur = max(f1 + 1, round(s['to'] * fps) + 6) - base
        cnt = min(n, (f1 - f0) // step + 1)
        exp_secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(cnt))
        plan[sid] = (f0, f0 - base, f1 - base, step, base, dur)

        src = pdir / 'src/scenes' / f'{sid}.tsx'
        dep_files, cue_keys, _ = trace_deps(src, pdir) if src.is_file() else (set(), set(), False)
        aids = sorted(set(asset_refs(pdir, dep_files)) | ({s['asset']} if s.get('asset') else set()))
        all_aids.update(aids)
        for aid in aids:
            af = reg.get(aid, {}).get('file')
            if af and (pdir / 'assets' / af).is_file():
                dep_files.add((pdir / 'assets' / af).resolve())
        dep_mt = max((f.stat().st_mtime for f in dep_files if f.is_file()), default=0.0)
        sig = sig_hash({
            's': {k: s.get(k) for k in ('from', 'to', 'type', 'asset', 'in', 'move', 'overlay', 'volume')},
            'grid': [n, cols, width, full],
            'cues': {k: cues.get(k) for k in sorted(cue_keys)},
            'assets': {a: reg.get(a, {}).get('file') for a in aids},
        })
        new_sigs[f'scene:{sid}'] = sig

        out = pdir / 'out/checks/scenes' / f'{sid}.png'
        txt = out.with_suffix('.txt')
        prev = sigs.get(f'scene:{sid}')
        clean_sig = (prev == sig) if prev is not None else (not full and txt.is_file() and txt.read_text().strip() == exp_secs)
        if not force and out.is_file() and txt.is_file() and out.stat().st_mtime >= dep_mt and clean_sig:
            print(f'{out}  [bỏ qua: chưa đổi code — thêm --force để chụp lại]')
            if prev is None:
                backfill[f'scene:{sid}'] = sig
        else:
            dirty.append(sid)

    if backfill:
        update_sigs(pdir, backfill)
    if not dirty:
        return

    have_aids = {k for k, a in reg.items() if a.get('status') == 'have' and a.get('file') and (pdir / 'assets' / a['file']).is_file()}
    errs = sync_assets(pdir, all_aids | have_aids)
    if errs:
        sys.exit('THIẾU tài sản: ' + '; '.join(errs))

    with work_lock(pdir / '.build/check' / ('scene_' + '_'.join(dirty))) as work:
        imports = [
            "import '" + rel(pdir / '.build/assets', work) + "';",
            "import { Composition, registerRoot } from 'remotion';",
            "import { SceneView } from '@core/timeline';",
        ]
        comps = []
        for sid in dirty:
            s = by[sid]
            comp = None
            if (pdir / 'src/scenes' / f'{sid}.tsx').exists():
                imports.append(f"import {sid} from '{rel(pdir / 'src/scenes' / sid, work)}';")
                comp = sid
            ts, _ = scene_spec_ts(dict(s, transition='cut'), comp, w, h)
            _, _, _, _, base, dur = plan[sid]
            comps.append(f'    <Composition id="scene-{sid}" component={{() => <SceneView s={{{ts}}} t0={{{base / fps:.6f}}} />}} '
                         f'durationInFrames={{{dur}}} fps={{{fps}}} width={{{w}}} height={{{h}}} />')
        write_if_changed(work / 'entry.tsx', '\n'.join(imports) + '\n\nregisterRoot(() => (\n  <>\n' + '\n'.join(comps) + '\n  </>\n));\n')
        typecheck(work, f"cảnh {', '.join(dirty)}")

        done_sigs = {}
        with tempfile.TemporaryDirectory(dir=work, prefix='shots_') as td, render_slot():
            tdp = Path(td)
            target, pub = (bundle(work / 'entry.tsx', tdp, pdir), []) if len(dirty) > 1 else \
                (str(work / 'entry.tsx'), [f'--public-dir={pdir / ".build/public"}'])
            for sid in dirty:
                f0, lf0, lf1, step, _, _ = plan[sid]
                sd = tdp / sid
                sd.mkdir()
                shots = render_frames(target, f'scene-{sid}', f'{lf0}-{lf1}', step, render_scale(width, w, full), sd, pub)[:n]
                out = pdir / 'out/checks/scenes' / f'{sid}.png'
                tile_frames(shots, sd, cols, width, out)
                secs = ' '.join(f'{(f0 + i * step) / fps:.2f}' for i in range(len(shots)))
                write_secs(out, secs)
                done_sigs[f'scene:{sid}'] = new_sigs[f'scene:{sid}']
                print(out, '\n  mốc (giây):', secs)
        update_sigs(pdir, done_sigs)


# ---------------------------------------------------------------- part cô lập

def shoot_parts(pdir: Path, proj: dict, raw: str, width: int, force: bool, full: bool):
    pdirs = pdir / 'src/parts'
    have = {f.stem: f for f in sorted(pdirs.glob('*.tsx')) if re.search(r'\bexport\s+const\s+preview\b', f.read_text())} if pdirs.is_dir() else {}
    names = list(have) if raw == 'all' else list(dict.fromkeys(x.strip() for x in raw.split(',') if x.strip()))
    for nm in names:
        if nm not in have:
            sys.exit(f"part '{nm}' không có hoặc chưa export preview (có: {', '.join(have) or 'trống'})")
    if not names:
        sys.exit('chưa có part nào export preview trong src/parts/')
    sync_cues(pdir)

    w, h = proj['width'], proj['height']
    cues, reg, sigs = cue_table(pdir), assets(pdir), read_sigs(pdir)
    new_sigs, backfill, all_aids, dirty = {}, {}, set(), []

    for nm in names:
        dep_files, cue_keys, _ = trace_deps(have[nm], pdir)
        aids = sorted(set(asset_refs(pdir, dep_files)))
        all_aids.update(aids)
        for aid in aids:
            af = reg.get(aid, {}).get('file')
            if af and (pdir / 'assets' / af).is_file():
                dep_files.add((pdir / 'assets' / af).resolve())
        dep_mt = max((f.stat().st_mtime for f in dep_files if f.is_file()), default=0.0)
        sig = sig_hash({
            'grid': [width, full],
            'cues': {k: cues.get(k) for k in sorted(cue_keys)},
            'assets': {a: reg.get(a, {}).get('file') for a in aids},
        })
        new_sigs[f'part:{nm}'] = sig

        out = pdir / 'out/checks/parts' / f'{nm}.png'
        prev = sigs.get(f'part:{nm}')
        clean_sig = (prev == sig) if prev is not None else (not full)
        if not force and out.is_file() and out.stat().st_mtime >= dep_mt and clean_sig:
            print(f'{out}  [bỏ qua: chưa đổi code — thêm --force để chụp lại]')
            if prev is None:
                backfill[f'part:{nm}'] = sig
        else:
            dirty.append(nm)

    if backfill:
        update_sigs(pdir, backfill)
    if not dirty:
        return

    have_aids = {k for k, a in reg.items() if a.get('status') == 'have' and a.get('file') and (pdir / 'assets' / a['file']).is_file()}
    errs = sync_assets(pdir, all_aids | have_aids)
    if errs:
        sys.exit('THIẾU tài sản: ' + '; '.join(errs))

    tag = 'part_' + '_'.join(dirty[:6]) + (f'_{len(dirty)}' if len(dirty) > 6 else '')
    with work_lock(pdir / '.build/check' / tag) as work:
        imports = [
            "import '" + rel(pdir / '.build/assets', work) + "';",
            "import { Composition, registerRoot } from 'remotion';",
            "import { PreviewHost } from '@core/preview';",
        ]
        comps = []
        for nm in dirty:
            imports.append(f"import {{ preview as P_{nm} }} from '{rel(have[nm].with_suffix(''), work)}';")
            comps.append(f'    <Composition id="{comp_id(f"part-{nm}")}" component={{() => <PreviewHost preview={{P_{nm}}} />}} '
                         f'durationInFrames={{P_{nm}.views}} fps={{30}} width={{{w}}} height={{{h}}} />')
        write_if_changed(work / 'entry.tsx', '\n'.join(imports) + '\n\nregisterRoot(() => (\n  <>\n' + '\n'.join(comps) + '\n  </>\n));\n')
        typecheck(work, f"part {', '.join(dirty)}")

        done_sigs = {}
        with tempfile.TemporaryDirectory(dir=work, prefix='shots_') as td, render_slot():
            tdp = Path(td)
            target = bundle(work / 'entry.tsx', tdp, pdir)
            for nm in dirty:
                sd = tdp / nm
                sd.mkdir()
                r = remotion(['render', target, comp_id(f'part-{nm}'), str(sd / 'f'), '--sequence', '--image-format=jpeg',
                              f'--scale={render_scale(width, w, full)}', '--muted', '--log=error'], capture_output=True, text=True)
                shots = sorted((sd / 'f').glob('*.jpeg'))
                if r.returncode or not shots:
                    print(r.stdout[-3000:], r.stderr[-3000:])
                    sys.exit(f'render lỗi ở part {nm}')
                out = pdir / 'out/checks/parts' / f'{nm}.png'
                tile_frames(shots, sd, 2 if len(shots) == 4 else min(len(shots), 4), width, out)
                done_sigs[f'part:{nm}'] = new_sigs[f'part:{nm}']
                print(out, f'  ({len(shots)} góc)')
        update_sigs(pdir, done_sigs)


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pdir = need(argv[0])
    proj = load(pdir / 'project.json')
    force, full = '--force' in argv, '--full' in argv

    if '--scene' in argv:
        want = list(dict.fromkeys(x.strip() for x in (opt(argv, '--scene') or '').split(',') if x.strip()))
        if not want:
            sys.exit('chưa chỉ định cảnh sau --scene (ví dụ: --scene C01S01,C01S02)')
        shoot_scenes(pdir, proj, want, opt(argv, '--n', 6, int), opt(argv, '--cols', 3, int), opt(argv, '--width', 960, int), force, full)
        return
    if '--part' in argv:
        shoot_parts(pdir, proj, opt(argv, '--part') or sys.exit('chưa chỉ định part sau --part (tên hoặc all)'),
                    opt(argv, '--width', 960, int), force, full)
        return

    if not (pdir / '.build/entry.tsx').exists():
        sys.exit(f'chưa build (python3 core/tools/build.py {pdir.name})')
    tl = load(pdir / 'plan/timeline.json')
    chs = tl['chapters']
    out = pdir / 'out/checks'

    if '--seams' in argv:
        if len(chs) < 2:
            sys.exit('cần ít nhất 2 chương')
        i = argv.index('--seams') + 1
        only = {x.strip() for x in argv[i].split(',')} if i < len(argv) and not argv[i].startswith('--') else set()
        n, cols, width = opt(argv, '--n', 6, int), opt(argv, '--cols', 6, int), opt(argv, '--width', 480, int)
        jobs = []
        for c0, c1 in zip(chs, chs[1:]):
            if not only or c0['id'] in only or c1['id'] in only:
                t = c1['from']
                jobs.append((f"seam_{c0['id']}_{c1['id']}", max(0.0, t - 1.5), t + 1.5, n, cols, width,
                             out / 'seams' / f"{c0['id']}-{c1['id']}.png"))
        if jobs:
            shoot_ranges(pdir, proj, tl, jobs, full)
        return
    if '--chapter' in argv:
        cid = opt(argv, '--chapter')
        c = next((c for c in chs if c['id'] == cid), None) or sys.exit(f'không có chương {cid}')
        k = sum(s['chapter'] == cid for s in tl['scenes'])
        shoot_ranges(pdir, proj, tl, [(f'chapter_{cid}', c['from'], c['to'], opt(argv, '--n', max(12, min(36, 2 * k)), int),
                                       opt(argv, '--cols', 6, int), opt(argv, '--width', 480, int), out / 'chapters' / f'{cid}.png')], full)
        return
    a, b = opt(argv, '--from', 0.0, float), opt(argv, '--to', tl['duration'], float)
    name = 'sheet.png' if '--from' not in argv and '--to' not in argv else f'sheet_{a:g}-{b:g}.png'
    tag = 'full' if name == 'sheet.png' else re.sub(r'[^A-Za-z0-9_]+', '_', f'range_{a:g}_{b:g}')
    shoot_ranges(pdir, proj, tl, [(tag, a, b, opt(argv, '--n', 24, int), opt(argv, '--cols', 6, int),
                                   opt(argv, '--width', 480, int), out / name)], full)


if __name__ == '__main__':
    shutil.which('ffmpeg') or sys.exit('cần ffmpeg')
    main()
