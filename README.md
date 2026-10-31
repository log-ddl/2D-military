# Video Studio (Remotion)

Dựng video từ voice bằng Remotion. Mỗi video là một dự án độc lập trong `projects/<id>/`, cùng một khung
cho mọi chủ đề. Chủ đề (quân sự, …) là các **skill** trong `skills/`: thêm chủ đề mới chỉ cần thêm một thư mục skill.

## Cấu trúc
```
AGENTS.md         luật chung cho AI
remotion/         CHỈ Remotion: package.json khoá phiên bản, node_modules, config, docs/ (tài liệu đúng bản)
core/
  kit/            code dùng trong video: time, frame, asset, timeline, scenes (clip/still), preview  → @core/…
  tools/          new ingest asr build check audio render setup upgrade
skills/<tên>/     SKILL.md, templates/, lib/ (→ @skill/<tên>/…), agents/
  military/       video giải thích quân sự 2D/3D
  long-video/     chia việc theo chương, dùng cho mọi skill
library/          media dùng chung giữa các video
projects/<id>/    mỗi video một thư mục (xem "Khung một dự án")
voice/            voice gốc
dashboard/        giao diện web quản lý dự án (./dash)
```

## Cài đặt (một lần)
```bash
python3 core/tools/setup.py                    # cài remotion/, nối node_modules, link skill vào .claude/ và .agents/
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
python3 core/tools/upgrade.py                  # tải tài liệu Remotion đúng bản về remotion/docs/
```

## Làm một video
```bash
python3 core/tools/new.py vid6 voice/x.mp3 --skill military     # --from/--to cắt đoạn, --format 9:16 cho video dọc
python3 core/tools/ingest.py vid6                               # file bạn thả vào projects/vid6/input/ → assets/
.venv/bin/python core/tools/asr.py vid6                         # plan/voice_map.md
# giao cho AI theo skill: STORY.md, chương, part, cảnh
python3 core/tools/build.py vid6
python3 core/tools/check.py vid6 --scene C01S03                 # --part F16, --chapter C02, --seams, không cờ = cả video
.venv/bin/python core/tools/audio.py vid6
python3 core/tools/render.py vid6 --studio                      # xem; bỏ --studio để xuất out/video.mp4
```

## Nâng Remotion
```bash
python3 core/tools/upgrade.py latest           # hoặc một số bản cụ thể: 4.0.560
```
Đổi mọi gói `remotion`, `@remotion/*` trong `remotion/package.json`, cài lại, tải tài liệu đúng bản. Sau đó build + check lại một dự án.

## Thêm một chủ đề
Tạo `skills/<tên>/` có `SKILL.md` (frontmatter `name`, `description`), tuỳ chọn `templates/STORY.md`, `templates/CHAPTER.md`,
`lib/` (code dùng trong cảnh, import `@skill/<tên>/…`), `CATALOG.md`. Chạy lại `python3 core/tools/setup.py`.
Dự án dùng skill đó: `new.py <id> … --skill <tên>`.

## Khung một dự án (cho người viết skill / sửa tool)
AI làm video chỉ đọc skill; phần này để viết skill mới cho đúng với tool. `new.py` tạo khung, `build.py` kiểm.
```
projects/<id>/
  project.json        id, skill, width, height, fps, remotion, source, duration
  input/              người dùng thả file; ingest.py xếp sang assets/
  assets/             voice/ script/ footage/ images/ music/ sfx/ refs/ + ASSETS.json
  plan/               transcript.json, voice_map.md (asr) · STORY.md · chapters/CNN.md, CNN.json, CNN.voice.md
                      sfx/CNNSxx.json (tuỳ chọn) · mix.json · timeline.json (build sinh)
  src/                design/ parts/ cues/CNN.ts (cues/index.ts build sinh) scenes/CNNSxx.tsx overlays/
  out/                video.mp4, checks/ (ảnh kiểm)
  .build/             máy sinh, xoá thoải mái
```
- **ASSETS.json**: `{"next": 4, "assets": [{"id": "a001", "kind": "voice|script|footage|image|music|sfx|ref", "file": "voice/voice.mp3",
  "status": "have|need", "source": "user|library|youtube|…", "locked": true, "tags": [], "used": [], "want": "…khi need"}]}`.
  Code gọi bằng mã: `asset('a012')` (`@core/asset`).
- **chapters/CNN.json**: `{"id": "C01", "title": "", "from": 0, "to": 42.5, "scenes": [...], "sfx": [...]}`. Chương nối liền nhau,
  cảnh liền mạch và phủ đúng chương. Video ngắn = một chương `C01`.
  - cảnh: `{"id": "C01S01", "from": 0, "to": 12, "type": "code|clip|still", "transition": "fade|cut|slide:from-right|wipe:from-left|flip:from-top|clockWipe"}`
    (mặc định `code`, `fade`). `clip`: `"asset", "in"` (giây trong file), `"volume"` tuỳ chọn. `still`: `"asset", "move": "zoom-in|zoom-out|pan-left|pan-right|none"`.
    `"overlay": true` thì `src/scenes/<id>.tsx` vẽ đè lên clip / still.
  - sfx: `{"at": 14.2, "asset": "a050", "volume": 0.8, "trim": [0, 1.5]}` hoặc `{"at": 14.2, "synth": "boom", "power": 0.7}`.
- **mix.json**: `{"volume": {"voice": 1, "music": 0.4, "sfx": 0.5}, "music": [{"asset": "a040", "from": 0, "to": 120, "in": 0,
  "fadeIn": 1, "fadeOut": 2, "volume": 1, "duck": 0.5} | {"synth": {...}}]}`.
- **Cảnh**: `const C01S01: React.FC = () => { const t = useT(); … }; export default C01S01;` (giây voice tuyệt đối).
  **Part**: `export const preview: Preview` (`@core/preview`) để `check.py --part` chụp.
- Tên: dự án `[a-z][a-z0-9_]*`, chương `CNN`, cảnh `CNNSNN`, tài sản `aNNN`, mốc `cNN_<tên>`.
