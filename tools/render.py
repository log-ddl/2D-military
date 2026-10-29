#!/usr/bin/env python3
"""Xuất mp4 hoặc mở Studio cho một dự án (chỉ đóng gói đúng dự án đó). Chạy tools/build.py và tools/audio.py trước.

    python3 tools/render.py <id>              → projects/<id>/out/video.mp4 (voice + nhạc + sfx)
    python3 tools/render.py <id> --no-music --no-sfx   bỏ nhạc nền / tiếng động khỏi bản xuất
    python3 tools/render.py <id> --studio     → Studio ở port riêng của dự án (bật/tắt music, sfx ở bảng Props)
"""
import json
import sys

from common import comp_id, need, remotion, studio_port


def main():
    argv = sys.argv[1:]
    if not argv:
        sys.exit(__doc__)
    pdir = need(argv[0])
    entry, pub = str(pdir / 'video/entry.tsx'), f'--public-dir={pdir / "public"}'
    if '--studio' in argv:
        port = studio_port(pdir.name)
        print(f'http://localhost:{port}/{comp_id(pdir.name)}')
        sys.exit(remotion(['studio', entry, pub, f'--port={port}']).returncode)
    props = {'music': '--no-music' not in argv, 'sfx': '--no-sfx' not in argv}
    out = pdir / 'out/video.mp4'
    print(f"xuất {out.relative_to(pdir.parent.parent)}: nhạc {'có' if props['music'] else 'không'}, sfx {'có' if props['sfx'] else 'không'}")
    sys.exit(remotion(['render', entry, comp_id(pdir.name), str(out), pub, f'--props={json.dumps(props)}']).returncode)


if __name__ == '__main__':
    main()
