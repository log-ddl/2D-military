# Video Giải Thích Quân Sự (Remotion 2D · 3D)

Dựng video giải thích quân sự từ voice bằng Remotion (cảnh SVG 2D và Three.js 3D), điều phối bởi skill `code-video-director`.
Mỗi video là một dự án độc lập trong `projects/<id>/`; nhiều dự án chạy song song không ảnh hưởng nhau.

## Cấu trúc
```
voice/            voice gốc
library/          media dùng chung của bạn: images/ videos/ sfx/ music/ (INDEX.md)
engine/           Remotion: chỉ để preview và xuất
  kit/            nền tảng (màu, thời gian, timeline)
  lib/            bộ đồ nghề 2D/3D dùng chung (CATALOG.md)
tools/            init.py asr.py build.py audio.py sheet.py render.py
projects/<id>/
  input/          của bạn: voice.mp3, images/, videos/, sfx/, music/
  plan/           voice_map.md, SHOT_PLAN.md, scenes.json
  video/          cues.ts, scenes/S01.tsx…, local/ (mô hình, hình riêng của video)
  audio/          music.json, sound.json
  public/ out/    sinh tự động (âm thanh, sheet, mp4)
```
Tài nguyên (`media('…')` trong cảnh, `src` trong audio/*.json) tìm ở `projects/<id>/input/` trước, rồi `library/`.

## Cài đặt (một lần)
```bash
cd engine && npm i && cd ..
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
```

## Làm một video
```bash
python3 tools/init.py <id> voice/<file>.mp3      # --from/--to để cắt một đoạn
.venv/bin/python tools/asr.py <id>               # plan/voice_map.md
# giao cho AI theo skill code-video-director: SHOT_PLAN, scenes.json, cues.ts, mô hình, cảnh
python3 tools/build.py <id>                      # sinh Video.tsx, kiểm kiểu, cảnh lỗi → khung giữ chỗ
python3 tools/sheet.py <id> --scene S03          # kiểm một cảnh  (--model M109: kiểm mô hình 4 góc)
.venv/bin/python tools/audio.py <id>             # public/music.wav, sfx.wav
python3 tools/sheet.py <id>                      # out/sheet.png
python3 tools/render.py <id> --studio            # xem trong Studio (port riêng theo id; bật/tắt music, sfx ở bảng Props)
python3 tools/render.py <id>                     # out/video.mp4  (thêm --no-music / --no-sfx để bỏ nhạc / tiếng động)
```
