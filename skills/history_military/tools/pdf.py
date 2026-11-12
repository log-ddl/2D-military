#!/usr/bin/env python3
"""Trang tài liệu gốc cho cảnh <DocPage> và bản đồ / bản vẽ trong sách cho <ArchiveMap>. Chạy trên macOS (PDFKit qua swiftc).

    python3 skills/history_military/tools/pdf.py find <file.pdf> "may never recover" "Only two days after"
        → trang nào chứa cụm đó (chỉ số trang tính từ 0, KHÔNG phải số in trên trang) + ngữ cảnh.
    python3 skills/history_military/tools/pdf.py quote <id> <file.pdf> <trang> "Only two days" "to be Viet Cong" [--scale 3] [--note "…"]
        → xuất trang thành ảnh, đưa vào assets/images (mã aNNN), in sẵn đoạn <DocPage …> có toạ độ từng dòng của đoạn trích
          (từ cụm đầu tới hết cụm cuối). Cụm đầu / cuối: 2–4 từ liên tiếp đúng như trong sách; lớp chữ OCR hay sai ở chữ in hoa nhỏ và
          dấu câu, nên chọn cụm toàn chữ thường.
    python3 skills/history_military/tools/pdf.py page <id> <file.pdf> <trang> [--scale 3] [--note "…"]
        → xuất nguyên trang (bản đồ, bản vẽ, ảnh in trong sách) vào assets/images.

PDF lấy bằng `src.py text <mã_archive>` (nằm ở library/images/dl/docs/) hoặc file người dùng đưa.
TODO(nâng cấp tải): PDF chỉ có ảnh quét, không có lớp chữ → `find`/`quote` không ra gì; cần thêm OCR (Vision) để tự lấy hộp dòng.
"""
import json
import subprocess
import sys
from pathlib import Path

from _hm import ROOT, flag, ingest, opt

SRC = Path(__file__).with_name('pdf.swift')
BIN = ROOT / '.cache/history_military/pdf'


def tool() -> Path:
    if not BIN.exists() or BIN.stat().st_mtime < SRC.stat().st_mtime:
        BIN.parent.mkdir(parents=True, exist_ok=True)
        r = subprocess.run(['swiftc', '-O', str(SRC), '-o', str(BIN)], capture_output=True, text=True)
        if r.returncode:
            sys.exit('không biên dịch được pdf.swift (cần macOS + Xcode Command Line Tools):\n' + r.stderr[-600:])
    return BIN


def run(*args) -> str:
    r = subprocess.run([str(tool()), *map(str, args)], capture_output=True, text=True)
    out = r.stdout.strip()
    if r.returncode:
        sys.exit(out or r.stderr.strip())
    return out


def source_note(pdf: Path, page: int, note: str) -> str:
    return f'{pdf.stem} · trang PDF {page} · {note}'.strip(' ·')


def main():
    argv = sys.argv[1:]
    if len(argv) < 2:
        sys.exit(__doc__)
    cmd = argv.pop(0)
    scale, note = opt(argv, '--scale', 3.0, float), opt(argv, '--note', '')
    flag(argv, '--')
    if cmd == 'find':
        print(run(argv[0], 'find', *argv[1:]) or 'không thấy (PDF có thể chỉ là ảnh quét, hoặc cụm từ bị OCR sai: thử cụm ngắn hơn, toàn chữ thường)')
        return
    pid, pdf, page = argv[0], Path(argv[1]).resolve(), int(argv[2])
    out = ROOT / 'projects' / pid / 'input' / f'{pdf.stem[:40]}_p{page}.jpg'
    out.parent.mkdir(parents=True, exist_ok=True)
    if cmd == 'page':
        d = json.loads(run(pdf, 'render', page, scale, out))
        code = ingest(pid, out, 'image', 'pdf', str(pdf.relative_to(ROOT)) if pdf.is_relative_to(ROOT) else pdf.name, source_note(pdf, page, note))
        out.unlink(missing_ok=True)
        print(f"{code}  {d['width']}x{d['height']}  → <ArchiveMap src={{asset('{code}')}} focus={{[50, 40]}} /> hoặc <Photo src={{asset('{code}')}} blend=\"multiply\" />")
    elif cmd == 'quote':
        d = json.loads(run(pdf, 'quote', page, scale, out, argv[3], argv[4]))
        code = ingest(pid, out, 'image', 'pdf', str(pdf.relative_to(ROOT)) if pdf.is_relative_to(ROOT) else pdf.name, source_note(pdf, page, note))
        out.unlink(missing_ok=True)
        lines = ', '.join('{ ' + f"x0: {l['x0']:.0f}, x1: {l['x1']:.0f}, y: {l['y']:.0f}, h: {l['h']:.1f}" + ' }' for l in d['lines'])
        print(f"{code}  {d['width']}x{d['height']}  {len(d['lines'])} dòng")
        print(f"nguyên văn: {d['text']}")
        print(f"<DocPage src={{asset('{code}')}} width={{{d['width']}}} lines={{[{lines}]}}\n  quote=\"“…”\" original=\"…\" />")
        print('thêm `at: <giây>` vào từng dòng theo mốc lời đọc (voice_map); không ghi thì các dòng tự rải trong 3 giây đầu shot.')
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
