#!/usr/bin/env python3
"""Công cụ tách thoại đa nhân vật (Narrator + Micro-Skits + Thẻ Chương Im Lặng) & ghép thành assets/voice/voice.mp3.

Dùng khi người dùng đưa kịch bản + hướng dẫn đọc voice (để gọi TTS API hoặc MCP sinh từng câu thoại):

  1) Khởi tạo bảng phân vai thoại từ kịch bản Markdown:
     python3 skills/story_2d/tools/voice_stitch.py <id> --init [đường_dẫn_script.md]
     → sinh projects/<id>/plan/voice_script.json + thư mục assets/voice/lines/

     Cú pháp gợi ý trong script.md (hoặc AI tự biên tập vào plan/voice_script.json):
       [NARRATOR | trầm ấm, nhịp kể điều tra 155 wpm]
       In Singapore, the boss of the most valuable company on earth is having dinner with a Chinese spy.

       [SKIT: jensen | vui vẻ, nâng ly]
       To our customers!

       [SKIT: alice | điềm tĩnh, bí ẩn]
       To friends!

       [CHAPTER: The Man With the Key]

  2) Sau khi gọi API / MCP lưu các file âm thanh vào `assets/voice/lines/<line_id>.mp3` (hoặc `.wav`):
     python3 skills/story_2d/tools/voice_stitch.py <id> --stitch
     → chuẩn hoá đồng mức âm lượng (-16 LUFS) giữa các giọng, chèn khoảng nghỉ tự nhiên (0.20s cho thoại đối đáp skit,
       0.40s hết câu dẫn, 2.15s lặng cho Silent Chapter Card), xuất `assets/voice/voice.mp3`, cập nhật `project.json` +
       `ASSETS.json` và ghi `plan/voice_cast.json` (mốc [from, to] chính xác từng nhân vật để gắn prop `talk` nhép miệng!).
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'core/tools'))
from common import need, probe, save_json  # noqa: E402

HEADER_RE = re.compile(r'^\[\s*(NARRATOR|SKIT\s*:\s*[^|\]]+|CHAPTER\s*:\s*[^\]]+)(?:\|\s*([^\]]+))?\s*\]$', re.I)


def parse_script_md(text: str) -> list:
    items = []
    cur_role = 'narrator'
    cur_hint = ''
    idx = 1

    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith('#'):
            continue
        m = HEADER_RE.match(line)
        if m:
            head = m.group(1).strip()
            hint = (m.group(2) or '').strip()
            if head.upper().startswith('CHAPTER'):
                title = head.split(':', 1)[1].strip()
                items.append({
                    'id': f'L{idx:03d}',
                    'role': 'chapter_card',
                    'title': title,
                    'silent_dur': 2.15,
                })
                idx += 1
            elif head.upper().startswith('SKIT'):
                actor = re.sub(r'[^a-z0-9_]+', '_', head.split(':', 1)[1].strip().lower()).strip('_')
                cur_role = f'skit:{actor or "guest"}'
                cur_hint = hint
            else:
                cur_role = 'narrator'
                cur_hint = hint
            continue

        lid = f'L{idx:03d}'
        is_skit = cur_role.startswith('skit:')
        items.append({
            'id': lid,
            'role': cur_role,
            'voice_hint': cur_hint,
            'text': line,
            'file': f'assets/voice/lines/{lid}.mp3',
            'pause_after': 0.20 if is_skit else 0.40,
        })
        idx += 1
    return items


def cmd_init(pdir: Path, script_arg: str = None):
    if script_arg:
        spath = Path(script_arg).expanduser()
    else:
        cands = sorted((pdir / 'assets/script').glob('*'))
        if not cands:
            sys.exit(f'không thấy file kịch bản trong {pdir / "assets/script"} (truyền đường dẫn sau --init)')
        spath = cands[0]
    if not spath.is_file():
        sys.exit(f'không thấy file kịch bản: {spath}')

    (pdir / 'assets/voice/lines').mkdir(parents=True, exist_ok=True)
    items = parse_script_md(spath.read_text())
    out = {
        'voices': {
            'narrator': {'hint': 'Giọng dẫn chuyện chính: rõ nét, hơi châm biếm nhẹ, ~155 từ/phút'},
        },
        'lines': items,
    }
    for it in items:
        r = it['role']
        if r.startswith('skit:') and r not in out['voices']:
            out['voices'][r] = {'hint': it.get('voice_hint') or f'Nhân vật {r.split(":", 1)[1]}: thoại ngắn tự nhiên'}

    save_json(pdir / 'plan/voice_script.json', out)
    print(f'→ {pdir / "plan/voice_script.json"} ({len(items)} mục, thư mục lines: assets/voice/lines/)')


def make_silence(out_wav: Path, dur: float):
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error',
        '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=mono',
        '-t', f'{max(0.02, dur):.3f}',
        '-c:a', 'pcm_s16le', str(out_wav),
    ], check=True)


def normalize_clip(src: Path, out_wav: Path):
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', str(src),
        '-af', 'loudnorm=I=-16:TP=-1.5:LRA=7,aresample=44100',
        '-ac', '1', '-c:a', 'pcm_s16le', str(out_wav),
    ], check=True)


def cmd_stitch(pdir: Path):
    vs_path = pdir / 'plan/voice_script.json'
    if not vs_path.is_file():
        sys.exit(f'chưa có {vs_path} (chạy --init hoặc tạo plan/voice_script.json trước)')
    vs = json.loads(vs_path.read_text())
    lines = vs.get('lines') or []
    if not lines:
        sys.exit('plan/voice_script.json không có mục nào trong "lines"')

    cast = []
    cursor = 0.0

    with tempfile.TemporaryDirectory() as td_str:
        td = Path(td_str)
        concat_parts = []
        seg_idx = 0

        for it in lines:
            lid = it.get('id', f'L{seg_idx:03d}')
            role = it.get('role', 'narrator')

            if role == 'chapter_card':
                sdur = float(it.get('silent_dur', 2.15))
                swav = td / f's_{seg_idx:04d}.wav'
                make_silence(swav, sdur)
                concat_parts.append(swav)
                cast.append({
                    'id': lid,
                    'role': 'chapter_card',
                    'title': it.get('title', ''),
                    'from': round(cursor, 3),
                    'to': round(cursor + sdur, 3),
                })
                cursor += sdur
                seg_idx += 1
                continue

            rel_file = it.get('file', f'assets/voice/lines/{lid}.mp3')
            src = pdir / rel_file
            if not src.exists():
                alt_wav = src.with_suffix('.wav')
                if alt_wav.exists():
                    src = alt_wav
                else:
                    sys.exit(f'thiếu file âm thanh của {lid} ({role}): {src}')

            nwav = td / f's_{seg_idx:04d}.wav'
            normalize_clip(src, nwav)
            cdur = probe(nwav)
            concat_parts.append(nwav)
            cast.append({
                'id': lid,
                'role': role,
                'text': it.get('text', ''),
                'from': round(cursor, 3),
                'to': round(cursor + cdur, 3),
            })
            cursor += cdur
            seg_idx += 1

            pause = float(it.get('pause_after', 0.35))
            if pause > 0.01:
                pwav = td / f's_{seg_idx:04d}.wav'
                make_silence(pwav, pause)
                concat_parts.append(pwav)
                cursor += pause
                seg_idx += 1

        lst = td / 'concat.txt'
        lst.write_text('\n'.join(f"file '{p.as_posix()}'" for p in concat_parts) + '\n')
        out_mp3 = pdir / 'assets/voice/voice.mp3'
        out_mp3.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run([
            'ffmpeg', '-y', '-loglevel', 'error',
            '-f', 'concat', '-safe', '0', '-i', str(lst),
            '-c:a', 'libmp3lame', '-b:a', '192k', str(out_mp3),
        ], check=True)

    total_dur = probe(out_mp3)
    save_json(pdir / 'plan/voice_cast.json', {'duration': total_dur, 'segments': cast})

    # Cập nhật ASSETS.json & project.json & C01.json nếu dự án mới khởi tạo từ script
    book_path = pdir / 'assets/ASSETS.json'
    if book_path.exists():
        book = json.loads(book_path.read_text())
        has_v = any(a.get('file') == 'voice/voice.mp3' for a in book.get('assets', []))
        if not has_v:
            nxt = int(book.get('next', len(book.get('assets', [])) + 1))
            aid = f'a{nxt:03d}'
            book['next'] = nxt + 1
            book.setdefault('assets', []).append({
                'id': aid,
                'kind': 'voice',
                'file': 'voice/voice.mp3',
                'status': 'have',
                'source': 'voice_stitch',
                'duration': total_dur,
                'locked': True,
                'tags': [],
                'used': [],
            })
        else:
            for a in book['assets']:
                if a.get('file') == 'voice/voice.mp3':
                    a['duration'] = total_dur
        save_json(book_path, book)

    pjson_path = pdir / 'project.json'
    if pjson_path.exists():
        pj = json.loads(pjson_path.read_text())
        pj['duration'] = total_dur
        save_json(pjson_path, pj)

    c01_path = pdir / 'plan/chapters/C01.json'
    if c01_path.exists():
        c01 = json.loads(c01_path.read_text())
        if not c01.get('scenes'):
            c01['to'] = total_dur
            save_json(c01_path, c01)
    else:
        save_json(c01_path, {'id': 'C01', 'title': '', 'from': 0, 'to': total_dur, 'scenes': [], 'sfx': []})
        c01_md = pdir / 'plan/chapters/C01.md'
        if not c01_md.exists():
            tpl = ROOT / 'skills/story_2d/templates/CHAPTER.md'
            txt = tpl.read_text() if tpl.is_file() else '# C01 — \n'
            c01_md.write_text(txt.replace('{cid}', 'C01').replace('{title}', ''))
        c01_cue = pdir / 'src/cues/C01.ts'
        if not c01_cue.exists():
            c01_cue.parent.mkdir(parents=True, exist_ok=True)
            c01_cue.write_text('// Mốc voice (giây) của chương C01, khoá bắt đầu bằng c01_.\nexport const CUE = {} as const;\n')

    print(f'→ {out_mp3} ({total_dur:.2f}s) · {pdir / "plan/voice_cast.json"} ({len(cast)} đoạn)')
    print(f'Bước tiếp theo: .venv/bin/python core/tools/asr.py {pdir.name}')


def main():
    argv = sys.argv[1:]
    if len(argv) < 2:
        sys.exit(__doc__)
    pdir = need(argv[0])
    if argv[1] == '--init':
        cmd_init(pdir, argv[2] if len(argv) > 2 else None)
    elif argv[1] == '--stitch':
        cmd_stitch(pdir)
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
