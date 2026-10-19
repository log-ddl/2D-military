# Video giải thích quân sự 2D

Dựng video giải thích từ voice bằng code Canvas 2D. Mỗi video là một project trong `projects/<id>/`; engine render dùng chung nằm trong `app/`.

## Cấu trúc
- `app/`: engine render (`src/engine`), trình nạp project (`src/runtime`), giao diện Studio (`src/studio`, `server`), script render (`scripts/render.ts`).
- `kit/`: hạ tầng chép vào mọi project (`scenes/shared/`): lớp scene, easing, camera, bảng màu, hiệu ứng, bản đồ.
- `tools/`: `init_video.py` (tạo project), `asr.py` (voice → mốc từng từ), `sound.py` (tiếng bắn, tiếng nổ), `audit.py`.
- `templates/`: mẫu project.
- `.agents/skills/code-video-director/`: skill hướng dẫn AI dựng video (quy trình, luật, quy chuẩn vẽ).
- `projects/<id>/`: `project.json`, `timeline.json`, `scenes/`, `data/`, `docs/SHOT_PLAN.md`, `assets/audio/`, `out/`.

## Cài đặt
```bash
cd app && bun install
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # cho tools/asr.py
```

## Làm một video
```bash
python3 tools/init_video.py <id> voice/<file>.mp3
python3 tools/asr.py <id>
cd app && bun run dev          # xem trước: http://localhost:5173/?project=<id>
```
Sau đó giao cho AI: "Dựng video từ voice/<file>.mp3 thành project <id>. Dùng skill code-video-director."

## Render
```bash
cd app
bun scripts/render.ts stills --project <id> --t 3,12.5
bun scripts/render.ts sheet  --project <id> --from 0 --to <dur> --n 24 --cols 4
bun scripts/render.ts video  --project <id> --samples auto --shutter 0.2   # xuất out/<id>.mp4
```
Mặc định 1920×1080, 60 fps; `--scale 2` cho 4K.

## Duyệt video trong Studio

- Timeline ngang bên dưới: bấm thước hoặc waveform để tua, dùng Thu phóng để xem chi tiết. Kéo hai mép cảnh để đổi thời gian; mép tự bắt dính với cảnh kế bên. Có thể chọn mép và dùng phím trái/phải để chỉnh 0,1 giây.
- Thay đổi thời gian là bản nháp. Vào tab **Cảnh → Lưu Timeline** để áp dụng vào player và render.
- Tab **Lời đọc** đọc `data/transcript.json` từ `tools/asr.py`. Bấm câu để tua tới đoạn tương ứng; câu đang phát được tô sáng. Viền vàng báo câu chưa được cảnh bao phủ đầy đủ.
- Tab **Ghi chú**: nhập yêu cầu sửa rồi bấm ghi chú tại thời điểm hiện tại. Có thể nhảy lại mốc, đánh dấu đã xử lý hoặc mở lại. **Sao chép yêu cầu sửa cho AI** lấy những ghi chú chưa xử lý kèm file scene tương ứng.
- Ghi chú được lưu trong `projects/<id>/data/review-notes.json`; waveform được tính từ file voice (hoặc audio chính) khi mở project.

Kiểm tra luồng review bằng project tạm, tự dọn sau khi chạy:
```bash
cd app
bun run dev --port 5194
# Terminal khác:
STUDIO_URL=http://127.0.0.1:5194 bun run verify:review
```

## AI qua Claude Code / Antigravity CLI

Mở tab **AI · CLI** ở cột phải. Studio tìm `claude` và `agy` trong PATH hoặc `~/.local/bin`, dùng cấu hình đăng nhập sẵn có của CLI; không nhập API key vào Studio.

1. Chọn CLI và nhập model nếu muốn ghi đè model mặc định của CLI.
2. Chọn skill có sẵn từ `.agents/skills` của repo hoặc thư mục skill cá nhân. Có thể dán nội dung skill/hướng dẫn bổ sung.
3. Nhập yêu cầu và bấm **Gửi yêu cầu** (Cmd/Ctrl + Enter). **Lấy ghi chú** đưa các ghi chú chưa xử lý vào ô yêu cầu để sửa trước khi gửi.
4. Gửi yêu cầu tiếp theo để nối lại đúng session của project. **Session mới** lưu lịch sử Studio cũ vào `.studio/ai/history/` rồi mở cuộc trò chuyện mới; dùng nút này trước khi đổi CLI.

Các project chạy độc lập, tối đa 4 CLI đồng thời; project tiếp theo chờ trong hàng đợi. Một project chỉ chạy một lượt tại một thời điểm. Đổi project hoặc đóng tab không dừng CLI; nút **Dừng** dừng process CLI. Tắt/restart server sẽ ngắt tác vụ, lượt sau có thể resume session đã khởi tạo. Bảng các project đang chạy có liên kết để chuyển qua theo dõi.

Chế độ **Cho phép sửa file** dùng acceptEdits/accept-edits; **Tự động xét quyền** dùng auto của CLI; **Chỉ lập kế hoạch** dùng plan. Studio không bật bypass permissions. Khi CLI báo thiếu quyền hoặc lỗi đăng nhập/model, xem log và chỉnh cấu hình CLI hoặc gửi lại yêu cầu phù hợp. Các CLI chạy trong thư mục project; hướng dẫn yêu cầu chỉ sửa project đó, nhưng đây không phải sandbox hệ thống file.

Trạng thái/session được lưu tại `.studio/ai/<project>.json`; UI giữ tối đa 300 mục log gần nhất, lịch sử hội thoại đầy đủ do CLI quản lý. Sau khi AI sửa timeline, bấm **Tải lại preview**. Không sửa thủ công cùng file trong khi AI đang viết file đó.

Kiểm thử tích hợp thật (gọi tài khoản CLI đang cấu hình, tạo project tạm rồi dọn):
```bash
cd app
STUDIO_LIVE_AI=1 STUDIO_URL=http://127.0.0.1:5194 bun scripts/verify-ai.ts
```
