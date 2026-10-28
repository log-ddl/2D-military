"""Đường dẫn và tiện ích dùng chung cho tools/*.py. Mọi lệnh nhận <id> và chỉ làm việc trong projects/<id>/."""
import json
import re
import subprocess
import sys
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENGINE = ROOT / 'engine'
LIBRARY = ROOT / 'library'
PROJECTS = ROOT / 'projects'
NPX = 'npx'


def project(pid: str) -> Path:
    if not re.fullmatch(r'[a-z][a-z0-9_]*', pid or ''):
        sys.exit('id chỉ gồm chữ thường, số, gạch dưới và bắt đầu bằng chữ')
    return PROJECTS / pid


def need(pid: str) -> Path:
    p = project(pid)
    if not (p / 'project.json').exists():
        sys.exit(f'chưa có dự án projects/{pid} (chạy tools/init.py trước)')
    return p


def comp_id(pid: str) -> str:
    return pid.replace('_', '-')


def studio_port(pid: str) -> int:
    """Port Studio cố định theo id để nhiều dự án mở cùng lúc không đụng nhau."""
    return 3100 + zlib.crc32(pid.encode()) % 1800


def probe(path: Path) -> float:
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)],
                         capture_output=True, text=True).stdout.strip()
    return float(out) if out else 0.0


def load(path: Path):
    return json.loads(path.read_text())


def scenes(pdir: Path) -> dict:
    """plan/scenes.json đã kiểm: cảnh liền mạch, id dạng S01."""
    spec = load(pdir / 'plan/scenes.json')
    sc = spec.get('scenes', [])
    if not sc:
        sys.exit('plan/scenes.json chưa có cảnh nào')
    for i, s in enumerate(sc):
        if not re.fullmatch(r'S\d{2,3}', s['id']):
            sys.exit(f"id cảnh phải dạng S01: {s['id']}")
        if s['to'] <= s['from']:
            sys.exit(f"{s['id']}: to <= from")
        if i and abs(s['from'] - sc[i - 1]['to']) > 1e-6:
            sys.exit(f"{s['id']}: from {s['from']} không nối với to {sc[i - 1]['to']} của {sc[i - 1]['id']}")
    return spec


def find_media(pdir: Path, rel: str):
    """Tìm tài nguyên theo thứ tự: projects/<id>/input/ → library/."""
    for base in (pdir / 'input', LIBRARY):
        f = base / rel
        if f.is_file():
            return f
    return None


def remotion(args, **kw):
    """Chạy CLI Remotion từ engine/ (để nhận remotion.config.ts)."""
    return subprocess.run([NPX, 'remotion', *args], cwd=ENGINE, **kw)


def opt(argv, key, default=None, cast=str):
    return cast(argv[argv.index(key) + 1]) if key in argv else default
