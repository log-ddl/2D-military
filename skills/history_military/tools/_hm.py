"""Phần dùng chung của bộ công cụ history_military: đường dẫn, tải file, gọi ffmpeg."""
import json
import subprocess
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'core/tools'))
REELS = ROOT / 'library/footage/dl'     # kho đệm cuộn phim dùng chung mọi dự án (agent được ghi vào dl/)
DOCS = ROOT / 'library/images/dl/docs'  # PDF sách / báo cáo đã tải
UA = 'history-military-skill/0.1 (local video research tool)'


def get_json(url: str, params: dict = None, timeout=40):
    if params:
        url += ('&' if '?' in url else '?') + urllib.parse.urlencode(params, doseq=True)
    req = urllib.request.Request(url, headers={'User-Agent': UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def download(url: str, dest: Path, timeout=600) -> Path:
    """Tải một file về `dest` (bỏ qua nếu đã có).
    TODO(nâng cấp tải): chưa có tải tiếp khi đứt (HTTP Range), chưa thử lại, chưa chạy song song, chưa kiểm checksum
    (archive.org có md5/sha1 trong metadata), chưa giới hạn tốc độ. Hiện chỉ là một lệnh curl."""
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 0:
        return dest
    tmp = dest.with_suffix(dest.suffix + '.part')
    r = subprocess.run(['curl', '-sL', '--fail', '-m', str(timeout), '-A', UA, '-o', str(tmp), url])
    if r.returncode or not tmp.exists() or tmp.stat().st_size == 0:
        tmp.unlink(missing_ok=True)
        sys.exit(f'không tải được: {url}')
    tmp.rename(dest)
    return dest


def ff(*args, check=True):
    r = subprocess.run(['ffmpeg', '-v', 'error', '-y', *map(str, args)], capture_output=True, text=True)
    if check and r.returncode:
        sys.exit('ffmpeg lỗi: ' + r.stderr.strip()[-400:])
    return r


def duration(path) -> float:
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(path)], capture_output=True, text=True).stdout.strip()
    return float(out) if out else 0.0


def opt(argv, key, default=None, cast=str):
    if key in argv:
        i = argv.index(key)
        v = cast(argv[i + 1])
        del argv[i:i + 2]
        return v
    return default


def opts(argv, key, cast=str):
    out = []
    while key in argv:
        out.append(opt(argv, key, cast=cast))
    return out


def flag(argv, key):
    if key in argv:
        argv.remove(key)
        return True
    return False


def ingest(pid: str, file: Path, kind: str, source: str, url: str, note: str, license_='PD') -> str:
    """Gọi core/tools/ingest.py, trả về mã aNNN."""
    r = subprocess.run([sys.executable, str(ROOT / 'core/tools/ingest.py'), pid, str(file), '--kind', kind, '--source', source,
                        '--url', url, '--license', license_, '--note', note], capture_output=True, text=True)
    if r.returncode:
        sys.exit('ingest lỗi: ' + (r.stderr or r.stdout).strip()[-300:])
    return r.stdout.strip().split()[0] if r.stdout.strip() else '?'
