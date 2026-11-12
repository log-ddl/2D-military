#!/usr/bin/env python3
"""Bộ kiểm duyệt của skill military-2d: đọc thẳng src/scenes/*.tsx, src/parts/*.tsx, ASSETS.json, plan/mix.json, plan/sfx/*.json và báo lỗi luật của SKILL.md.
Chạy sau build.py, trước khi xuất. Máy chỉ bắt được lỗi ĐẾM ĐƯỢC; đúng / sai của hình vẫn phải xem ảnh check.py (SKILL.md mục 10).

    python3 skills/military-2d/tools/review.py <id> [--strict]

✗ = vi phạm luật cứng (thoát mã 1) · ⚠ = cần xem lại (thoát mã 1 khi --strict) · i = thông tin cho người dùng.
Hình:     import 3D, chữ tự viết, toạ độ gõ thẳng trong cảnh bản đồ, ký hiệu thiếu `k` khi phóng bản đồ, mật độ ký hiệu, trùng id vùng, cảnh quá dài,
          tỉ lệ lạm dụng bản đồ địa lý (> 55% hoặc > 20 s giữ nền bản đồ liên tục mà không cắt sang cảnh vẽ 2D / PhotoFull).
Ảnh:      mã không có, ảnh quá nhỏ cho toàn khung, ảnh cắt giấy chưa tách nền, ảnh dùng lặp, chú thích dài, thiếu ảnh tư liệu (< 15%), thiếu đa dạng khung ảnh.
Nhân vật: cùng kiểu thẻ hai lần liên tiếp, cả phim một kiểu, cùng một người lặp nguyên kiểu.
Âm thanh: chưa có nhạc thật, thiếu tiếng nền, cảnh có diễn biến mà không có SFX, SFX ngoài phim, một tiếng lặp quá nhiều, tiếng nổ cận trên cảnh thuần bản đồ,
          chưa trộn lại sau khi sửa, cảnh báo còn lại trong sound_report.txt.
Bản quyền: liệt kê ảnh có cờ risk / license-unknown đang dùng trong phim.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MAP_BASES = ('GeoBase', 'SatBase')
FIELD_STAGES = ('SideStage', 'TopStage')
FIELD_ELS = ('Soldier2D', 'Fan2D', 'Tracer2D', 'ArcShot2D', 'Shock2D', 'FocusBox', 'Blast2D', 'Muzzle2D', 'Puff2D')
COMBAT_FX = ('Blast2D', 'Muzzle2D', 'Tracer2D', 'ArcShot2D', 'Shock2D', 'SideStage')
TACTICS = ('Arrow2D', 'FrontLine', 'Zone2D', 'Route2D', 'RangeRing', 'UnitMark', 'MapLabel', 'Clash2D')
PHOTOS = ('PhotoCard', 'PhotoFull')
PERSONS = ('PersonCutout', 'PersonNews', 'PersonDossier', 'PersonTitle')
FULL_MEDIA = ('PhotoFull', 'PersonTitle')
LIMIT = {'Arrow2D': 3, 'UnitMark': 6, 'MapLabel': 6}
PERSON_VI = {'PersonCutout': 'cắt giấy', 'PersonNews': 'thời sự', 'PersonDossier': 'hồ sơ', 'PersonTitle': 'tiêu đề'}
REAL_BOOM = re.compile(r'explos|artillery|cannon|gunshot|gun shot|machine ?gun|bomb|missile|rocket', re.I)


def strip_comments(code: str) -> str:
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.S)
    return re.sub(r'(?m)^\s*//.*$', '', code)


def tags(code: str, names):
    """Mọi thẻ JSX <Tên …> trong code → (tên, chuỗi props). Đi tới dấu > ở độ sâu ngoặc nhọn 0 để không vấp `=>` hay `>` trong biểu thức."""
    out = []
    for m in re.finditer(r'<(' + '|'.join(names) + r')\b', code):
        i, depth, quote = m.end(), 0, None
        while i < len(code):
            c = code[i]
            if quote:
                if c == quote and code[i - 1] != '\\':
                    quote = None
            elif c in '"\'`':
                quote = c
            elif c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
            elif c == '>' and depth == 0:
                break
            i += 1
        out.append((m.group(1), code[m.end():i]))
    return out


def prop(props: str, key: str):
    m = re.search(r'\b' + key + r'=(?:"([^"]*)"|\'([^\']*)\'|\{`([^`]*)`\}|\{"([^"]*)"\}|\{\'([^\']*)\'\})', props)
    return next((g for g in m.groups() if g is not None), None) if m else None


def main():
    argv = sys.argv[1:]
    if not argv or argv[0].startswith('-'):
        sys.exit(__doc__)
    pdir = ROOT / 'projects' / argv[0]
    if not (pdir / 'plan/timeline.json').exists():
        sys.exit('chưa có plan/timeline.json: chạy core/tools/build.py trước')
    tl = json.loads((pdir / 'plan/timeline.json').read_text())
    book = {a['id']: a for a in json.loads((pdir / 'assets/ASSETS.json').read_text())['assets']}
    tr_path = pdir / 'plan/transcript.json'
    tr_data = json.loads(tr_path.read_text()) if tr_path.exists() else {}
    voice_lang = tr_data.get('lang') or tr_data.get('language') or '?'
    scenes, dur = tl['scenes'], tl['duration']
    err, warn, info = [], [], []

    used = {}            # mã ảnh → [cảnh]
    persons = []         # (cảnh, kiểu, tên)
    photo_kinds = {'PhotoCard': 0, 'PhotoFull': 0}
    has_media = {}       # cảnh → có ảnh / thẻ nhân vật
    is_map = {}          # cảnh → dùng GeoBase / SatBase
    pure_map = {}        # cảnh → nền hoàn toàn là bản đồ (không có cảnh vẽ 2D hay PhotoFull / PersonTitle cắt hẳn)
    is_2d_craft = {}     # cảnh → dựng 2D chiến thuật / hành động / cơ chế (SideStage, TopStage, Soldier2D, part 2D…)
    allows_boom = {}     # cảnh → có bắn / nổ trực diện 2D nên cho phép SFX súng / pháo hiện thực
    events = {}          # cảnh → số thứ xuất hiện trên hình (để đối chiếu SFX)
    has_geo = (pdir / 'src/parts/geo.ts').exists()

    # Kiểm cả src/parts/*.tsx về import 3D và thẻ <text> tự viết
    in_parts = set()
    part_names = set()
    if (pdir / 'src/parts').is_dir():
        for pf in sorted((pdir / 'src/parts').glob('*.ts*')):
            raw = pf.read_text()
            in_parts |= set(re.findall(r"asset\('(a\d+)'\)", raw))
            if pf.suffix == '.tsx' and pf.stem != 'geo':
                part_names.add(pf.stem)
            pcode = strip_comments(raw)
            if re.search(r"from\s+['\"](@skill/military/3d/|three|@react-three)", pcode):
                err.append(f'src/parts/{pf.name}: import 3D (skill này thuần 2D)')
            if re.search(r'<text\b', pcode) or re.search(r'\bfontFamily\s*:', pcode):
                err.append(f'src/parts/{pf.name}: tự viết <text> / fontFamily — dùng MapLabel, Label, Callout')

    for s in scenes:
        sid, f = s['id'], pdir / 'src/scenes' / f"{s['id']}.tsx"
        if s.get('type', 'code') != 'code':
            continue
        if not f.exists():
            err.append(f'{sid}: chưa có src/scenes/{sid}.tsx'); continue
        code = strip_comments(f.read_text())
        length = s['to'] - s['from']

        # --- phân loại sân khấu của cảnh
        map_tags = tags(code, MAP_BASES)
        stage_tags = tags(code, FIELD_STAGES)
        field_tags = tags(code, FIELD_ELS)
        tac = tags(code, TACTICS)
        media = tags(code, PHOTOS + PERSONS)
        full_media = tags(code, FULL_MEDIA)
        used_parts = [pn for pn in part_names if re.search(r'<\s*' + re.escape(pn) + r'\b', code)]
        own_2d = [x for x in re.findall(r'<([A-Z]\w*(?:2D|Stage|Cutaway|Diagram))\b', code)
                  if x not in TACTICS and x not in FIELD_STAGES and x not in FIELD_ELS]

        scene_is_map = bool(map_tags)
        scene_is_craft = bool(stage_tags or field_tags or used_parts or own_2d or 'skyline(' in code or 'contours(' in code)
        is_map[sid] = scene_is_map
        is_2d_craft[sid] = scene_is_craft
        pure_map[sid] = scene_is_map and not scene_is_craft and not bool(full_media)
        allows_boom[sid] = bool(tags(code, COMBAT_FX) or used_parts or own_2d) or not scene_is_map

        # --- hình
        if re.search(r"from\s+['\"](@skill/military/3d/|three|@react-three)", code):
            err.append(f'{sid}: import 3D (skill này thuần 2D)')
        if re.search(r'<text\b', code) or re.search(r'\bfontFamily\s*:', code):
            err.append(f'{sid}: tự viết <text> / fontFamily — dùng MapLabel, Label, Callout, thẻ nhân vật')
        if scene_is_map:
            lit = re.findall(r'\[\s*-?\d{1,3}\.\d{2,6}\s*,\s*-?\d{1,2}\.\d{2,6}\s*\]', code)
            if len(lit) > 1:
                warn.append(f'{sid}: {len(lit)} toạ độ [lon, lat] gõ thẳng trong cảnh — đưa vào src/parts/geo.ts' + ('' if has_geo else ' (dự án chưa có geo.ts)'))
        zooming = bool(re.search(r'zoom[=:]\s*\{?\s*(?!1\b|\d+(\.\d+)?\s*[},])', code)) and 'Cam2D' in code
        no_k = sorted({n for n, p in tac if not re.search(r'\bk=', p)})
        if scene_is_map and zooming and no_k:
            warn.append(f'{sid}: {", ".join(no_k)} thiếu k={{1 / zoom}} trong khi máy phóng bản đồ — nét và chữ sẽ phình to')
        for n, lim in LIMIT.items():
            c = sum(1 for x, _ in tac if x == n)
            if c > lim:
                warn.append(f'{sid}: {c} {n} trong một cảnh (nên ≤ {lim} cùng lúc) — kiểm chúng có hiện lần lượt không, hoặc tách cảnh')
        zid = [prop(p, 'id') or 'z' for n, p in tac if n == 'Zone2D']
        if len(zid) != len(set(zid)):
            err.append(f'{sid}: nhiều Zone2D trùng id — mỗi vùng một id riêng (không thì gạch chéo lấy nhầm màu)')
        if length > 25:
            warn.append(f'{sid}: dài {length:.0f} s (cảnh nên 8–25 s, một ý)')
        if 'Cam2D' in code and not tac and not scene_is_craft and not media:
            warn.append(f'{sid}: sân khấu trống, không có ký hiệu / chủ thể 2D / ảnh nào')

        # --- ảnh + nhân vật
        has_media[sid] = bool(media)
        events[sid] = len(tac) + len(media) + len(field_tags) + len(used_parts) + len(own_2d)
        for n, p in media:
            m = re.search(r"\bsrc=\{asset\('(a\d+)'\)\}", p)
            aid = m.group(1) if m else None
            if n in photo_kinds:
                photo_kinds[n] += 1
            if n in PERSONS:
                persons.append((sid, n, prop(p, 'name') or '?'))
            cap = prop(p, 'caption')
            if cap and len(cap.split()) > 7:
                warn.append(f'{sid}: chú thích dài {len(cap.split())} từ ("{cap[:40]}…") — tối đa ~6 từ')
            if not aid:
                continue
            a = book.get(aid)
            if not a:
                err.append(f'{sid}: {n} dùng {aid} không có trong ASSETS.json'); continue
            used.setdefault(aid, []).append(sid)
            long_side = max(a.get('width') or 0, a.get('height') or 0)
            need = 1100 if n == 'PersonTitle' else 1500   # thẻ tiêu đề chỉ phủ nửa khung
            if n in ('PhotoFull', 'PersonTitle') and long_side and long_side < need and 'fit="contain"' not in p:
                warn.append(f'{sid}: {n} dùng {aid} cạnh dài {long_side} px (< {need}) — sẽ vỡ khi phủ khung; đổi ảnh, hoặc PhotoCard / fit="contain"')
            if n == 'PersonCutout' and 'cutout' not in a.get('tags', []):
                err.append(f'{sid}: PersonCutout dùng {aid} chưa tách nền — chạy img.py cutout {argv[0]} {aid}')
        for m in re.finditer(r"asset\('(a\d+)'\)", code):
            if m.group(1) not in book:
                err.append(f"{sid}: asset('{m.group(1)}') không có trong ASSETS.json")
            elif m.group(1) not in used:
                used.setdefault(m.group(1), []).append(sid)

    # --- cân bằng 3 trụ cột (Bản đồ địa lý · Vẽ 2D chiến thuật/cơ chế · Ảnh tư liệu/Nhân vật)
    for aid, where in used.items():
        a = book[aid]
        if a.get('source') == 'eox' or 'cutout' in a.get('tags', []):
            continue
        if len(set(where)) > 1:
            warn.append(f'{aid} dùng ở {len(set(where))} cảnh ({", ".join(sorted(set(where)))}) — mỗi ảnh một lần trừ khi cố ý quay lại')

    code_scenes = [s for s in scenes if s['id'] in has_media]
    total = sum(s['to'] - s['from'] for s in code_scenes) or 1
    map_dur = sum((s['to'] - s['from']) * (1.0 if pure_map[s['id']] else 0.5 if is_map[s['id']] else 0.0) for s in code_scenes)
    craft_dur = sum(s['to'] - s['from'] for s in code_scenes if is_2d_craft[s['id']])
    media_dur = sum(s['to'] - s['from'] for s in code_scenes if has_media[s['id']])
    map_ratio, craft_ratio, media_ratio = map_dur / total, craft_dur / total, media_dur / total

    if len(code_scenes) >= 5 and map_ratio > 0.55:
        warn.append(f'bản đồ địa lý chiếm {map_ratio:.0%} thời lượng (nên ≤ 45–50%) — cắt các đoạn chiến thuật, giao tranh, vũ khí sang cảnh vẽ 2D (SideStage / TopStage / mặt cắt) hoặc PhotoFull')
    if len(code_scenes) >= 5 and map_ratio > 0.40 and craft_dur == 0:
        warn.append('chưa có cảnh vẽ 2D chiến thuật / hành động / mặt cắt nào (SideStage, TopStage, src/parts) — đừng đẩy mũi tên bản đồ cho cả đoạn giao tranh hay nguyên lý')

    run, start = 0.0, None
    for s in code_scenes:
        if not pure_map[s['id']]:
            run, start = 0.0, None
        else:
            start = start or s['id']
            run += s['to'] - s['from']
            if run > 22:
                warn.append(f'{run:.0f} s liền giữ nền bản đồ ({start} → {s["id"]}) — cắt sang cảnh vẽ 2D chiến thuật / hành động / mặt cắt hoặc PhotoFull')
                run, start = 0.0, None

    # --- âm thanh
    mix = json.loads((pdir / 'plan/mix.json').read_text()) if (pdir / 'plan/mix.json').exists() else {}
    music = mix.get('music') or []
    if not music or all('synth' in m for m in music):
        warn.append('chưa có nhạc thật (plan/mix.json chỉ có nhạc tổng hợp giữ chỗ) — gọi agent nhạc nền theo skills/sound-design')
    else:
        cover = sum(max(0, min(m.get('to', dur), dur) - m.get('from', 0)) for m in music)
        if cover < dur * 0.8:
            warn.append(f'nhạc chỉ phủ {cover:.0f}/{dur:.0f} s của phim')
    if not mix.get('amb'):
        warn.append('mix.json chưa có lớp nền `amb` — tiếng sẽ hiện ra giữa khoảng trống (SOUND.md mục 3)')
    sfx_files = sorted((pdir / 'plan/sfx').glob('*.json')) if (pdir / 'plan/sfx').is_dir() else []
    sfx = []
    for f in sfx_files:
        try:
            sfx += json.loads(f.read_text()).get('sfx', [])
        except ValueError:
            err.append(f'plan/sfx/{f.name}: JSON hỏng')
    if not sfx:
        warn.append('chưa có SFX (plan/sfx/*.json trống) — gọi agent SFX sau khi cảnh đã dựng xong')
    else:
        for e in sfx:
            if not 0 <= e.get('at', 0) <= dur:
                err.append(f"SFX {e.get('name')}: at={e.get('at')} nằm ngoài phim (0–{dur:.0f} s)")
        for s in scenes:
            sid = s['id']
            n = sum(1 for e in sfx if s['from'] <= e.get('at', -1) < s['to'])
            if events.get(sid, 0) >= 2 and n == 0:
                warn.append(f'{sid}: {events[sid]} thứ xuất hiện trên hình nhưng không có SFX nào')
            max_rate = 0.9 if pure_map.get(sid) else 1.8
            if n > max(8, (s['to'] - s['from']) * max_rate):
                warn.append(f"{sid}: {n} SFX trong {s['to'] - s['from']:.0f} s — quá dày, sẽ lấn lời đọc")
        keys = {}
        for e in sfx:
            at = e.get('at', -1)
            owner = next((s['id'] for s in scenes if s['from'] <= at < s['to']), None)
            for ly in e.get('layers', []):
                keys[ly.get('key')] = keys.get(ly.get('key'), 0) + 1
            if owner and not allows_boom.get(owner, True):
                if REAL_BOOM.search(e.get('name', '')) and not re.search(r'distant|far|xa|muffl', e.get('name', ''), re.I):
                    warn.append(f"SFX {e.get('name')} @{at} ({owner}): tiếng nổ / súng cận trên cảnh thuần bản đồ — chỉ dùng bản xa/đục, hoặc chỉ nổ cận ở cảnh 2D hành động (SOUND.md mục 2)")
        for k, c in keys.items():
            if c > 8:
                warn.append(f'một tiếng ({k}) dùng {c} lần — đổi biến thể cho đỡ máy móc')
    rep = pdir / '.build/sound_report.txt'
    srcs = [pdir / 'plan/mix.json', *sfx_files]
    if not rep.exists():
        warn.append('chưa trộn âm thanh: chạy .venv/bin/python core/tools/audio.py ' + argv[0])
    else:
        if any(f.exists() and f.stat().st_mtime > rep.stat().st_mtime for f in srcs):
            warn.append('mix.json / plan/sfx đã sửa sau lần trộn gần nhất: chạy lại audio.py')
        left = [ln.strip() for ln in rep.read_text().splitlines() if '⚠' in ln]
        if left:
            warn.append(f'.build/sound_report.txt còn {len(left)} cảnh báo, vd: {left[0][:110]}')

    # --- bản quyền (thông tin)
    risky = [(aid, book[aid]) for aid in sorted(used) if 'risk' in book[aid].get('tags', [])]
    unknown = [aid for aid in sorted(used) if 'license-unknown' in book[aid].get('tags', []) and 'risk' not in book[aid].get('tags', [])]
    for aid, a in risky:
        info.append(f'RỦI RO BẢN QUYỀN {aid} ({a.get("source")}) dùng ở {", ".join(sorted(set(used[aid])))} — ảnh hãng thông tấn / báo lớn: {a.get("url")}')
    if unknown:
        info.append(f'{len(unknown)} ảnh chưa rõ giấy phép đang dùng: {", ".join(unknown)}')
    unused = [a['id'] for a in book.values() if a.get('kind') == 'image' and a['id'] not in used and a['id'] not in in_parts and not a.get('locked')]
    if unused:
        info.append(f'{len(unused)} ảnh đã tải nhưng chưa dùng: {", ".join(unused)}')
    kinds = ', '.join(f'{PERSON_VI[k]} {sum(1 for _, x, _ in persons if x == k)}' for k in PERSONS if any(x == k for _, x, _ in persons)) or 'không có'
    info.append(
        f'voice={voice_lang} · {len(scenes)} cảnh · {dur:.0f} s · nền bản đồ {map_ratio:.0%} · vẽ 2D chiến thuật/cơ chế {craft_ratio:.0%} · cảnh có ảnh/nhân vật {media_ratio:.0%} '
        f'(ghim {photo_kinds["PhotoCard"]}, toàn khung {photo_kinds["PhotoFull"]}, thẻ nhân vật: {kinds}) · SFX {len(sfx)} · nhạc {len([m for m in music if "synth" not in m])} đoạn'
    )
    info.append(
        f'BẮT BUỘC AI Vision soi kỹ out/checks/scenes/*.png & sheet.png: '
        f'(1) 100% chữ trên hình/bản đồ/chú thích đúng ngôn ngữ voice="{voice_lang}", '
        f'(2) chủ thể 65–90% vùng hữu ích, không đè chữ/tràn mép, (3) liên tục vật lý 2D qua 6 ô.'
    )

    for x in err:
        print('✗ ' + x)
    for x in warn:
        print('⚠ ' + x)
    for x in info:
        print('i ' + x)
    print(f'\n{len(err)} lỗi, {len(warn)} cảnh báo' + (' — ĐẠT kiểm cấu trúc; chuyển sang bước AI Vision Audit trên ảnh lưới (SKILL.md mục 10)!' if not err and not warn else ''))
    if err or (warn and '--strict' in argv):
        sys.exit(1)


if __name__ == '__main__':
    main()
