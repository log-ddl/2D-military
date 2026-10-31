#!/usr/bin/env python3
"""Dashboard Web quản lý các dự án video (viết tách riêng, nối với core/tools/*.py qua CLI chuẩn).

    ./dash
    python3 dashboard/server.py [--port 3000] [--no-open]

- Không sửa remotion/, core/ hay skills/; chỉ gọi lệnh của core/tools/.
- Bấm mở dự án → tự kiểm build.py nếu cần, khởi chạy ngầm `core/tools/render.py <id> --studio` ở port riêng và mở thẳng Remotion Timeline.
- Hỗ trợ tạo dự án mới (chọn hoặc tải file voice lên), đổi tên dự án đồng bộ ID, xóa/dọn rác, xem nhanh sheet/model/mp4 và chạy lệnh trực tiếp.
"""
from __future__ import annotations

import atexit
import json
import mimetypes
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.parse
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DASH_DIR = Path(__file__).resolve().parent
ROOT = DASH_DIR.parent
TOOLS_DIR = ROOT / 'core/tools'
sys.path.insert(0, str(TOOLS_DIR))

from common import PROJECTS, comp_id, opt, probe, studio_port  # noqa: E402

VOICE_DIR = ROOT / 'voice'
VENV_PY = str(ROOT / '.venv/bin/python') if (ROOT / '.venv/bin/python').exists() else sys.executable
SYS_PY = sys.executable

ID_RE = re.compile(r'^[a-z][a-z0-9_]*$')

# Bộ nhớ đệm thời lượng file voice để /api/state phản hồi tức thì (< 5ms)
_VOICE_CACHE: dict[str, tuple[float, int, float]] = {}

# Quản lý tiến trình Studio do Dashboard bật: pid_str -> {'proc': Popen, 'port': int, 'logs': list[str]}
_STUDIO_LOCK = threading.Lock()
_STUDIOS: dict[str, dict] = {}

# Quản lý các tác vụ CLI chạy nền (build, asr, audio, sheet, mp4)
_JOB_LOCK = threading.Lock()
_JOBS: dict[str, dict] = {}
_JOB_SEQ = 0


def is_port_open(port: int, host: str = '127.0.0.1', timeout: float = 0.12) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.settimeout(timeout)
        return s.connect_ex((host, port)) == 0


def is_studio_http_ready(port: int) -> bool:
    """Remotion mở TCP port sớm với mã 503 ('Studio is starting...'); chỉ khi trả HTTP 200 thì server mới thực sự sẵn sàng."""
    if not is_port_open(port):
        return False
    try:
        with urllib.request.urlopen(f'http://127.0.0.1:{port}/', timeout=0.6) as resp:
            return resp.status == 200
    except Exception:
        return False


def dir_size_mb(path: Path) -> float:
    total = 0
    if not path.exists():
        return 0.0
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d not in ('node_modules', '.cache')]
        for fn in files:
            fp = Path(root) / fn
            if not fp.is_symlink():
                try:
                    total += fp.stat().st_size
                except OSError:
                    pass
    return round(total / (1024 * 1024), 1)


def list_voices() -> list[dict]:
    VOICE_DIR.mkdir(exist_ok=True)
    items = []
    for f in sorted(VOICE_DIR.iterdir()):
        if not f.is_file() or f.name.startswith('.') or f.suffix.lower() not in ('.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'):
            continue
        st = f.stat()
        key = str(f)
        cached = _VOICE_CACHE.get(key)
        if cached and cached[0] == st.st_mtime and cached[1] == st.st_size:
            dur = cached[2]
        else:
            dur = round(probe(f), 2)
            _VOICE_CACHE[key] = (st.st_mtime, st.st_size, dur)
        items.append({
            'name': f.name,
            'rel': f'voice/{f.name}',
            'size_mb': round(st.st_size / (1024 * 1024), 2),
            'duration': dur,
            'mtime': int(st.st_mtime),
        })
    return items


# Skill chỉ chia việc (dùng kèm skill chủ đề), không chọn làm skill chính của dự án
WORKFLOW_SKILLS = {'long-video'}


def list_skills() -> list[str]:
    d = ROOT / 'skills'
    return sorted(x.name for x in d.iterdir() if (x / 'SKILL.md').is_file() and x.name not in WORKFLOW_SKILLS) if d.is_dir() else []


def read_json_safe(path: Path, default):
    try:
        return json.loads(path.read_text())
    except Exception:
        return default


def inspect_project(pdir: Path) -> dict:
    pid = pdir.name
    pmeta = read_json_safe(pdir / 'project.json', {'id': pid})
    smeta = read_json_safe(pdir / 'plan/timeline.json', {'fps': pmeta.get('fps', 30), 'scenes': []})
    raw_scenes = smeta.get('scenes', []) if isinstance(smeta, dict) else []

    scenes_info = []
    done_count = 0
    for s in raw_scenes:
        sid = s.get('id', '')
        code_f = pdir / 'src/scenes' / f'{sid}.tsx'
        sheet_f = pdir / 'out/checks/scenes' / f'{sid}.png'
        has_code = code_f.is_file() or s.get('type') in ('clip', 'still')
        if has_code:
            done_count += 1
        scenes_info.append({
            'id': sid,
            'from': s.get('from', 0),
            'to': s.get('to', 0),
            'kind': s.get('type', ''),
            'brief': s.get('chapter', ''),
            'has_code': has_code,
            'has_sheet': sheet_f.is_file(),
            'sheet_mtime': int(sheet_f.stat().st_mtime) if sheet_f.is_file() else 0,
        })

    models_dir = pdir / 'out/checks/parts'
    models_info = []
    if models_dir.is_dir():
        for mf in sorted(models_dir.glob('*.png')):
            models_info.append({
                'name': mf.stem,
                'file': mf.name,
                'mtime': int(mf.stat().st_mtime),
            })

    sheet_main = pdir / 'out/checks/sheet.png'
    mp4_file = pdir / 'out/video.mp4'
    music_wav = pdir / '.build/public/music.wav'
    voice_in = pdir / 'assets/voice/voice.mp3'

    # build.py tạo file wav im lặng 1 giây (~88KB); file thật từ audio.py lớn hơn nhiều
    has_real_audio = music_wav.is_file() and music_wav.stat().st_size > 110_000

    port = studio_port(pid)
    cid = comp_id(pid)
    running = is_port_open(port)

    dur = pmeta.get('duration') or (raw_scenes[-1].get('to', 0) if raw_scenes else 0)
    try:
        mtime = int(max(
            (pdir / 'project.json').stat().st_mtime,
            (pdir / 'plan/timeline.json').stat().st_mtime if (pdir / 'plan/timeline.json').exists() else 0,
            sheet_main.stat().st_mtime if sheet_main.exists() else 0,
        ))
    except OSError:
        mtime = 0

    return {
        'id': pid,
        'comp_id': cid,
        'port': port,
        'studio_running': running,
        'studio_url': f'http://localhost:{port}/{cid}',
        'duration': round(float(dur or 0), 2),
        'fps': smeta.get('fps', pmeta.get('fps', 30)),
        'voice_src': (pmeta.get('source') or {}).get('file') or '',
        'skill': pmeta.get('skill') or '',
        'size': f"{pmeta.get('width', 1920)}×{pmeta.get('height', 1080)}",
        'has_voice': voice_in.is_file(),
        'has_asr': (pdir / 'plan/voice_map.md').is_file(),
        'has_shot_plan': (pdir / 'plan/STORY.md').is_file(),
        'has_entry': (pdir / '.build/entry.tsx').is_file(),
        'has_audio': has_real_audio,
        'has_sheet': sheet_main.is_file(),
        'sheet_mtime': int(sheet_main.stat().st_mtime) if sheet_main.is_file() else 0,
        'has_mp4': mp4_file.is_file(),
        'mp4_size_mb': round(mp4_file.stat().st_size / (1024 * 1024), 2) if mp4_file.is_file() else 0,
        'mp4_mtime': int(mp4_file.stat().st_mtime) if mp4_file.is_file() else 0,
        'scenes_total': len(scenes_info),
        'scenes_done': done_count,
        'scenes': scenes_info,
        'models': models_info,
        'disk_mb': dir_size_mb(pdir),
        'mtime': mtime,
    }


def list_projects() -> list[dict]:
    PROJECTS.mkdir(exist_ok=True)
    res = []
    for d in sorted(PROJECTS.iterdir()):
        if d.is_dir() and not d.is_symlink() and (d / 'project.json').is_file():
            res.append(inspect_project(d))
    res.sort(key=lambda x: (-int(x['studio_running']), -x['mtime'], x['id']))
    return res


def has_active_job(pid: str) -> bool:
    with _JOB_LOCK:
        return any(j['project'] == pid and j['status'] == 'running' for j in _JOBS.values())


def start_background_job(pid: str, action: str, title: str, cmds: list[list[str]]) -> dict:
    global _JOB_SEQ
    with _JOB_LOCK:
        for j in _JOBS.values():
            if j['project'] == pid and j['action'] == action and j['status'] == 'running':
                return j
        _JOB_SEQ += 1
        jid = f'job-{_JOB_SEQ}'
        job = {
            'id': jid,
            'project': pid,
            'action': action,
            'title': title,
            'status': 'running',
            'started_at': int(time.time()),
            'finished_at': None,
            'log': [],
            '_proc': None,
        }
        _JOBS[jid] = job

    def runner():
        env = {**os.environ, 'PYTHONUNBUFFERED': '1'}
        try:
            for cmd in cmds:
                pretty = ' '.join(cmd)
                with _JOB_LOCK:
                    job['log'].append(f'$ {pretty}')
                proc = subprocess.Popen(
                    cmd, cwd=ROOT, env=env,
                    stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                    text=True, start_new_session=True,
                )
                with _JOB_LOCK:
                    job['_proc'] = proc
                assert proc.stdout is not None
                for line in proc.stdout:
                    clean = line.rstrip('\r\n')
                    with _JOB_LOCK:
                        job['log'].append(clean)
                        if len(job['log']) > 400:
                            job['log'] = job['log'][-400:]
                rc = proc.wait()
                if rc != 0:
                    with _JOB_LOCK:
                        if job['status'] != 'cancelled':
                            job['status'] = 'error'
                            job['log'].append(f'[Lỗi: mã thoát {rc}]')
                        job['finished_at'] = int(time.time())
                        job['_proc'] = None
                    return
            with _JOB_LOCK:
                if job['status'] == 'running':
                    job['status'] = 'done'
                    job['log'].append('[Hoàn tất]')
                job['finished_at'] = int(time.time())
                job['_proc'] = None
        except Exception as exc:
            with _JOB_LOCK:
                job['status'] = 'error'
                job['log'].append(f'[Ngoại lệ: {exc}]')
                job['finished_at'] = int(time.time())
                job['_proc'] = None

    threading.Thread(target=runner, daemon=True).start()
    return serialize_job(job)


def cancel_job(jid: str) -> bool:
    with _JOB_LOCK:
        job = _JOBS.get(jid)
        if not job or job['status'] != 'running':
            return False
        job['status'] = 'cancelled'
        job['log'].append('[Đã huỷ bởi người dùng]')
        proc = job.get('_proc')
    if proc and proc.poll() is None:
        try:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
        except OSError:
            pass
    return True


def serialize_job(j: dict) -> dict:
    return {k: v for k, v in j.items() if not k.startswith('_')}


def list_jobs() -> list[dict]:
    with _JOB_LOCK:
        vals = sorted(_JOBS.values(), key=lambda x: -int(x['id'].split('-')[1]))[:15]
        return [serialize_job(j) for j in vals]


def stop_all_other_studios(except_pid: str | None = None):
    """Đảm bảo tại mọi thời điểm chỉ có tối đa 1 Remotion Studio hoạt động (tránh tràn WebGL context & nghẽn Rspack)."""
    if PROJECTS.is_dir():
        for d in sorted(PROJECTS.iterdir()):
            if d.is_dir() and not d.is_symlink() and (d / 'project.json').is_file():
                if d.name != except_pid and is_port_open(studio_port(d.name)):
                    stop_studio_for(d.name)
    with _STUDIO_LOCK:
        tracked = [k for k in _STUDIOS.keys() if k != except_pid]
    for k in tracked:
        stop_studio_for(k)


def start_studio_for(pid: str) -> tuple[bool, str, str]:
    pdir = PROJECTS / pid
    if not (pdir / 'project.json').is_file():
        return False, '', f'Không tìm thấy dự án {pid}'

    # Luôn tắt Studio của dự án khác đang mở (nếu có) trước khi mở dự án này
    stop_all_other_studios(except_pid=pid)

    port = studio_port(pid)
    url = f'http://localhost:{port}/{comp_id(pid)}'
    if is_studio_http_ready(port):
        return True, url, 'Studio đã chạy sẵn'
    if is_port_open(port):
        # Đang dở hoặc kẹt từ lần trước → dọn sạch rồi bật mới
        stop_studio_for(pid)

    # Tự chạy build.py nếu chưa có entry.tsx để mở Timeline không bao giờ lỗi trắng
    if not (pdir / '.build/entry.tsx').is_file():
        rb = subprocess.run([SYS_PY, 'core/tools/build.py', pid], cwd=ROOT, capture_output=True, text=True)
        if rb.returncode != 0:
            msg = (rb.stdout + '\n' + rb.stderr).strip()[-500:]
            return False, '', f'Build thất bại trước khi mở Studio:\n{msg}'

    # BROWSER=none ngăn Remotion CLI tự bật thêm 1 tab trùng lặp ngoài tab của Dashboard
    env = {**os.environ, 'BROWSER': 'none'}
    logs: list[str] = []
    proc = subprocess.Popen(
        [SYS_PY, 'core/tools/render.py', pid, '--studio'],
        cwd=ROOT,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        start_new_session=True,
    )

    def drain():
        assert proc.stdout is not None
        for ln in proc.stdout:
            logs.append(ln.rstrip('\r\n'))
            if len(logs) > 120:
                del logs[:-120]

    threading.Thread(target=drain, daemon=True).start()
    with _STUDIO_LOCK:
        _STUDIOS[pid] = {'proc': proc, 'port': port, 'logs': logs}

    # Đợi Remotion Studio trả về HTTP 200 sẵn sàng (không còn 503 'Studio is starting...')
    deadline = time.time() + 25.0
    while time.time() < deadline:
        if is_studio_http_ready(port):
            return True, url, 'Đã bật Studio'
        if proc.poll() is not None:
            err_tail = '\n'.join(logs[-15:])
            return False, '', f'Studio dừng sớm (mã {proc.returncode}):\n{err_tail}'
        time.sleep(0.3)

    return True, url, 'Studio đang đóng gói lần đầu (có thể mất thêm vài giây trên tab mới)'


def stop_studio_for(pid: str) -> tuple[bool, str]:
    port = studio_port(pid)
    with _STUDIO_LOCK:
        info = _STUDIOS.pop(pid, None)
    if info:
        proc = info['proc']
        if proc.poll() is None:
            try:
                os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            except OSError:
                pass

    # Phòng trường hợp Studio được mở từ terminal bên ngoài Dashboard (trong dải port riêng 3100..4900)
    if 3100 <= port <= 4900 and is_port_open(port):
        r = subprocess.run(['lsof', '-ti', f'tcp:{port}'], capture_output=True, text=True)
        for line in r.stdout.splitlines():
            line = line.strip()
            if line.isdigit():
                try:
                    os.kill(int(line), signal.SIGTERM)
                except OSError:
                    pass

    deadline = time.time() + 2.0
    while time.time() < deadline and is_port_open(port):
        time.sleep(0.15)

    if 3100 <= port <= 4900 and is_port_open(port):
        r = subprocess.run(['lsof', '-ti', f'tcp:{port}'], capture_output=True, text=True)
        for line in r.stdout.splitlines():
            line = line.strip()
            if line.isdigit():
                try:
                    os.kill(int(line), signal.SIGKILL)
                except OSError:
                    pass
        time.sleep(0.2)

    return True, f'Đã tắt Studio của {pid}'


def cleanup_all_studios():
    with _STUDIO_LOCK:
        pids = list(_STUDIOS.keys())
    for pid in pids:
        try:
            stop_studio_for(pid)
        except Exception:
            pass


atexit.register(cleanup_all_studios)


class DashboardHandler(BaseHTTPRequestHandler):
    server_version = 'MilitaryVideoDash/1.0'

    def log_message(self, fmt: str, *args):
        # Giữ terminal sạch gọn, không spam mỗi lần trình duyệt poll /api/state
        if self.path.startswith('/api/state') or self.path.startswith('/files/'):
            return
        sys.stderr.write(f"[dash] {self.command} {self.path} -> {args[1] if len(args) > 1 else ''}\n")

    def send_json(self, data: dict, status: int = 200):
        raw = json.dumps(data, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(raw)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(raw)

    def read_json_body(self) -> dict:
        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0:
            return {}
        return json.loads(self.rfile.read(length).decode('utf-8'))

    def serve_project_file(self, rel_url: str):
        # /files/<pid>/<subpath>
        parts = [urllib.parse.unquote(p) for p in rel_url.split('/') if p]
        if len(parts) < 2 or not ID_RE.match(parts[0]):
            self.send_error(HTTPStatus.BAD_REQUEST, 'Đường dẫn không hợp lệ')
            return
        base = (PROJECTS / parts[0]).resolve()
        target = (base / '/'.join(parts[1:])).resolve()
        if not target.is_relative_to(base) or not target.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, 'Không tìm thấy file')
            return

        ctype = mimetypes.guess_type(str(target))[0] or 'application/octet-stream'
        if target.suffix in ('.md', '.txt', '.json', '.ts', '.tsx'):
            ctype = f'{ctype}; charset=utf-8' if 'charset' not in ctype else ctype

        size = target.stat().st_size
        range_hdr = self.headers.get('Range')
        if range_hdr and range_hdr.startswith('bytes='):
            m = re.match(r'bytes=(\d*)-(\d*)', range_hdr)
            if m:
                start = int(m.group(1)) if m.group(1) else 0
                end = int(m.group(2)) if m.group(2) else size - 1
                end = min(end, size - 1)
                if start <= end and start < size:
                    chunk_len = end - start + 1
                    self.send_response(HTTPStatus.PARTIAL_CONTENT)
                    self.send_header('Content-Type', ctype)
                    self.send_header('Accept-Ranges', 'bytes')
                    self.send_header('Content-Range', f'bytes {start}-{end}/{size}')
                    self.send_header('Content-Length', str(chunk_len))
                    self.end_headers()
                    with open(target, 'rb') as f:
                        f.seek(start)
                        left = chunk_len
                        while left > 0:
                            buf = f.read(min(65536, left))
                            if not buf:
                                break
                            self.wfile.write(buf)
                            left -= len(buf)
                    return

        self.send_response(HTTPStatus.OK)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(size))
        self.send_header('Accept-Ranges', 'bytes')
        self.send_header('Cache-Control', 'no-cache')
        self.end_headers()
        with open(target, 'rb') as f:
            shutil.copyfileobj(f, self.wfile)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path in ('/', '/index.html'):
            html = (DASH_DIR / 'index.html').read_bytes()
            self.send_response(HTTPStatus.OK)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Content-Length', str(len(html)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(html)
            return

        if path == '/api/state':
            self.send_json({
                'ok': True,
                'root': str(ROOT),
                'projects': list_projects(),
                'voices': list_voices(),
                'skills': list_skills(),
                'jobs': list_jobs(),
            })
            return

        if path.startswith('/files/'):
            self.serve_project_file(path[len('/files/'):])
            return

        self.send_error(HTTPStatus.NOT_FOUND, 'Not found')

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        try:
            if path == '/api/voice/upload':
                raw_name = urllib.parse.unquote(self.headers.get('X-Filename') or 'voice.mp3')
                safe_name = re.sub(r'[^a-zA-Z0-9._-]', '_', Path(raw_name).name)
                if Path(safe_name).suffix.lower() not in ('.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'):
                    self.send_json({'ok': False, 'error': 'Chỉ hỗ trợ file âm thanh (.mp3, .wav, .m4a, .aac, .ogg, .flac)'}, 400)
                    return
                length = int(self.headers.get('Content-Length') or 0)
                if length <= 0 or length > 300 * 1024 * 1024:
                    self.send_json({'ok': False, 'error': 'Dung lượng file không hợp lệ (tối đa 300MB)'}, 400)
                    return
                VOICE_DIR.mkdir(exist_ok=True)
                dst = VOICE_DIR / safe_name
                data = self.rfile.read(length)
                dst.write_bytes(data)
                self.send_json({'ok': True, 'voice': f'voice/{safe_name}', 'name': safe_name})
                return

            body = self.read_json_body()

            if path == '/api/studio/start':
                pid = str(body.get('id', '')).strip()
                if not ID_RE.match(pid):
                    self.send_json({'ok': False, 'error': 'ID dự án không hợp lệ'}, 400)
                    return
                ok, url, msg = start_studio_for(pid)
                self.send_json({'ok': ok, 'url': url, 'message': msg, 'error': '' if ok else msg}, 200 if ok else 500)
                return

            if path == '/api/studio/stop':
                pid = str(body.get('id', '')).strip()
                if not ID_RE.match(pid):
                    self.send_json({'ok': False, 'error': 'ID dự án không hợp lệ'}, 400)
                    return
                ok, msg = stop_studio_for(pid)
                self.send_json({'ok': ok, 'message': msg})
                return

            if path == '/api/studio/stop_all':
                stop_all_other_studios(except_pid=None)
                self.send_json({'ok': True, 'message': 'Đã tắt toàn bộ tiến trình Studio'})
                return

            if path == '/api/project/create':
                pid = str(body.get('id', '')).strip()
                voice_rel = str(body.get('voice', '')).strip()
                t_from = body.get('from')
                t_to = body.get('to')
                run_asr = bool(body.get('run_asr', False))

                if not ID_RE.match(pid):
                    self.send_json({'ok': False, 'error': 'ID chỉ gồm chữ thường a-z, số 0-9, dấu gạch dưới (_) và bắt đầu bằng chữ cái'}, 400)
                    return
                if (PROJECTS / pid).exists():
                    self.send_json({'ok': False, 'error': f'Dự án "{pid}" đã tồn tại'}, 400)
                    return
                # Bỏ trống voice = dự án trống (thêm voice / kịch bản sau qua input/ + ingest)
                cmd = [SYS_PY, 'core/tools/new.py', pid]
                if voice_rel:
                    vpath = (ROOT / voice_rel).resolve()
                    if not vpath.is_relative_to(VOICE_DIR.resolve()) or not vpath.is_file():
                        self.send_json({'ok': False, 'error': 'File voice không hợp lệ (phải nằm trong voice/)'}, 400)
                        return
                    cmd.append(voice_rel)
                    if t_from not in (None, ''):
                        cmd += ['--from', str(float(t_from))]
                    if t_to not in (None, ''):
                        cmd += ['--to', str(float(t_to))]
                skill = str(body.get('skill') or '')
                if skill:
                    if skill not in list_skills():
                        self.send_json({'ok': False, 'error': f'Không có skill "{skill}"'}, 400)
                        return
                    cmd += ['--skill', skill]
                fmt = str(body.get('format') or '16:9')
                cmd += ['--format', fmt]

                r = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
                if r.returncode != 0:
                    self.send_json({'ok': False, 'error': (r.stdout + '\n' + r.stderr).strip()}, 500)
                    return

                # Có voice thì build khung ban đầu ngay để mở Studio được luôn (dự án trống chưa có chương nào)
                if voice_rel:
                    subprocess.run([SYS_PY, 'core/tools/build.py', pid], cwd=ROOT, capture_output=True, text=True)

                job = None
                if run_asr and voice_rel:
                    job = start_background_job(pid, 'asr', f'ASR trích mốc từ ({pid})', [[VENV_PY, 'core/tools/asr.py', pid]])

                self.send_json({'ok': True, 'id': pid, 'job': job})
                return

            if path == '/api/project/rename':
                old_id = str(body.get('old_id', '')).strip()
                new_id = str(body.get('new_id', '')).strip()
                if not ID_RE.match(old_id) or not ID_RE.match(new_id):
                    self.send_json({'ok': False, 'error': 'Tên dự án mới chỉ gồm chữ thường a-z, số 0-9, gạch dưới (_) và bắt đầu bằng chữ cái'}, 400)
                    return
                if old_id == new_id:
                    self.send_json({'ok': True, 'id': new_id})
                    return
                old_dir = PROJECTS / old_id
                new_dir = PROJECTS / new_id
                if not (old_dir / 'project.json').is_file():
                    self.send_json({'ok': False, 'error': f'Không tìm thấy dự án "{old_id}"'}, 404)
                    return
                if new_dir.exists():
                    self.send_json({'ok': False, 'error': f'Tên dự án "{new_id}" đã được dùng'}, 400)
                    return
                if has_active_job(old_id):
                    self.send_json({'ok': False, 'error': f'Dự án "{old_id}" đang chạy tác vụ nền, hãy đợi xong hoặc huỷ trước khi đổi tên'}, 400)
                    return

                stop_studio_for(old_id)
                old_dir.rename(new_dir)

                # Đồng bộ project.json, tiêu đề STORY.md và tái tạo .build/ theo ID mới
                pj_path = new_dir / 'project.json'
                pmeta = read_json_safe(pj_path, {})
                pmeta['id'] = new_id
                pj_path.write_text(json.dumps(pmeta, ensure_ascii=False, indent=2) + '\n')

                sp_path = new_dir / 'plan/STORY.md'
                if sp_path.is_file():
                    txt = sp_path.read_text()
                    if txt.startswith(f'# {old_id}\n'):
                        sp_path.write_text(txt.replace(f'# {old_id}', f'# {new_id}', 1))

                if (new_dir / '.build').is_dir():
                    shutil.rmtree(new_dir / '.build', ignore_errors=True)
                    subprocess.run([SYS_PY, 'core/tools/build.py', new_id], cwd=ROOT, capture_output=True, text=True)

                self.send_json({'ok': True, 'old_id': old_id, 'id': new_id})
                return

            if path == '/api/project/delete':
                pid = str(body.get('id', '')).strip()
                mode = str(body.get('mode', 'all')).strip()  # 'all' | 'out'
                if not ID_RE.match(pid):
                    self.send_json({'ok': False, 'error': 'ID không hợp lệ'}, 400)
                    return
                pdir = (PROJECTS / pid).resolve()
                if not pdir.is_relative_to(PROJECTS.resolve()) or not (pdir / 'project.json').is_file():
                    self.send_json({'ok': False, 'error': f'Không tìm thấy dự án "{pid}"'}, 404)
                    return
                if has_active_job(pid):
                    self.send_json({'ok': False, 'error': f'Dự án "{pid}" đang chạy tác vụ nền, hãy đợi xong hoặc huỷ trước'}, 400)
                    return

                if mode == 'out':
                    for sub in ('out', '.build/check'):
                        sd = pdir / sub
                        if sd.is_dir():
                            shutil.rmtree(sd, ignore_errors=True)
                    (pdir / 'out').mkdir(exist_ok=True)
                    self.send_json({'ok': True, 'message': f'Đã dọn sạch thư mục out/ của "{pid}" (giữ nguyên code & âm thanh)'})
                    return

                stop_studio_for(pid)
                shutil.rmtree(pdir)
                self.send_json({'ok': True, 'message': f'Đã xoá dự án "{pid}"'})
                return

            if path == '/api/job/start':
                pid = str(body.get('id', '')).strip()
                action = str(body.get('action', '')).strip()
                if not ID_RE.match(pid) or not (PROJECTS / pid / 'project.json').is_file():
                    self.send_json({'ok': False, 'error': 'Dự án không hợp lệ'}, 400)
                    return

                if action == 'asr':
                    cmds = [[VENV_PY, 'core/tools/asr.py', pid]]
                    title = f'ASR bóc băng ({pid})'
                elif action == 'build':
                    cmds = [[SYS_PY, 'core/tools/build.py', pid]]
                    title = f'Build & kiểm kiểu ({pid})'
                elif action == 'build_strict':
                    cmds = [[SYS_PY, 'core/tools/build.py', pid, '--strict']]
                    title = f'Build --strict ({pid})'
                elif action == 'audio':
                    cmds = [[VENV_PY, 'core/tools/audio.py', pid], [SYS_PY, 'core/tools/build.py', pid]]
                    title = f'Tổng hợp Audio + Build ({pid})'
                elif action == 'sheet':
                    cmds = [[SYS_PY, 'core/tools/build.py', pid], [SYS_PY, 'core/tools/check.py', pid]]
                    title = f'Xuất bảng ảnh tổng sheet.png ({pid})'
                elif action == 'mp4':
                    flags = []
                    if not body.get('music', True):
                        flags.append('--no-music')
                    if not body.get('sfx', True):
                        flags.append('--no-sfx')
                    cmds = [[SYS_PY, 'core/tools/build.py', pid], [SYS_PY, 'core/tools/render.py', pid, *flags]]
                    title = f'Render video.mp4 ({pid})'
                else:
                    self.send_json({'ok': False, 'error': f'Tác vụ không hỗ trợ: {action}'}, 400)
                    return

                job = start_background_job(pid, action, title, cmds)
                self.send_json({'ok': True, 'job': job})
                return

            if path == '/api/job/cancel':
                jid = str(body.get('job_id', '')).strip()
                ok = cancel_job(jid)
                self.send_json({'ok': ok})
                return

            self.send_json({'ok': False, 'error': 'API không tồn tại'}, 404)
        except Exception as exc:
            self.send_json({'ok': False, 'error': str(exc)}, 500)


def pick_port(preferred: int) -> int:
    for p in range(preferred, preferred + 15):
        if not is_port_open(p):
            return p
    return preferred


def main():
    argv = sys.argv[1:]
    if '--help' in argv or '-h' in argv:
        print(__doc__)
        return
    preferred_port = opt(argv, '--port', 3000, int)
    port = pick_port(preferred_port)
    no_open = '--no-open' in argv

    srv = ThreadingHTTPServer(('127.0.0.1', port), DashboardHandler)

    def handle_sig(signum, frame):
        print('\nĐang đóng Dashboard và dọn tiến trình Studio con...')
        cleanup_all_studios()
        threading.Thread(target=srv.shutdown, daemon=True).start()

    signal.signal(signal.SIGINT, handle_sig)
    signal.signal(signal.SIGTERM, handle_sig)

    url = f'http://localhost:{port}'
    print(f'Dashboard Quản lý Dự án: {url}  (Ctrl+C để thoát)')
    if not no_open:
        threading.Timer(0.35, lambda: webbrowser.open(url)).start()

    try:
        srv.serve_forever()
    finally:
        srv.server_close()
        cleanup_all_studios()


if __name__ == '__main__':
    main()
