# Luật chung cho AI

- Tạo dự án chỉ bằng `core/tools/new.py`; đưa file vào bằng `core/tools/ingest.py`.
- Làm video: đọc skill ghi trong `projects/<id>/project.json` (`skills/<tên>/SKILL.md`); video dài thêm `skills/long-video/SKILL.md`.
- Mỗi tầng một việc, đừng trộn:
  - `remotion/` chỉ Remotion. Không viết code vào đây; nâng bản bằng `core/tools/upgrade.py`. Tài liệu đúng bản: `remotion/docs/`.
  - `core/` phần chung mọi chủ đề. Không đưa thứ riêng một chủ đề vào (màu, mô hình, hiệu ứng quân sự… thuộc skill).
  - `skills/<tên>/` mọi thứ của một chủ đề: SKILL.md, templates, `lib/` (`@skill/<tên>/…`), CATALOG.md.
  - `projects/<id>/` chỉ một video; không đọc hay chép code dự án khác.
- Không sửa file máy sinh: `.build/`, `plan/timeline.json`, `src/cues/index.ts`, `out/`.
- Không sửa, không xoá tài sản `locked: true` trong `assets/ASSETS.json`.
- Thêm / đổi skill xong chạy `python3 core/tools/setup.py` (link vào `.claude/skills`, `.agents/skills`, cập nhật alias).
- Chạy Python có numpy / whisper bằng `.venv/bin/python`; các tool còn lại `python3`.
