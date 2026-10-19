# Thẻ công cụ — tra lệnh theo phần việc

## Quy trình lệnh (chạy từ gốc repo)
Quy trình dựng: [SKILL](SKILL.md) mục 8.

| Bước | Lệnh | Ra |
|---|---|---|
| khởi tạo | `python3 tools/init_video.py <id> voice/<file>.mp3` | khung project + bản chép `kit/` + mẫu |
| 1 | `python3 tools/asr.py <id>` | `data/voice_map.md` (đọc: câu kèm mốc), `data/transcript.json` (chỉ tra mốc từng từ) |
| 2 | `cd app && bun scripts/render.ts stills --project <id> --t a,b,c` | `out/stills/`: một ảnh tất cả vật; ngoài ra chỉ dùng still khi soi chi tiết, còn lại xem bằng sheet |
| 3 | `cd app && bun scripts/render.ts sheet --project <id> --cuts --cols 2` | 4 frame quanh mỗi ranh giới scene |
| 3 | `cd app && bun scripts/render.ts sheet --project <id> --from 0 --to <dur> --n 24 --cols 4` | sheet toàn phim |
| âm thanh | `python3 tools/sound.py <id>` | `assets/audio/sfx.wav` (tiếng bắn, tiếng nổ) |
| xuất (chỉ khi được yêu cầu) | `cd app && bun scripts/render.ts video --project <id> --samples auto --shutter 0.2` | `out/<id>.mp4` |

- Sheet được đặt tên theo frame đầu và cuối (`out/sheets/sheet_<đầu>-<cuối>.png`); thêm `--out <file>` nếu muốn tên riêng.

- Render dùng dev server ở `--url` (mặc định `http://localhost:5173`); không có thì tự spawn server riêng.
  **Nhiều agent chạy song song phải mỗi agent một `--url` khác nhau** để tránh HMR reload làm rớt trang.
- `--only sc01,sc02` chỉ nạp các scene đó (nhanh hơn, và không vỡ vì file scene khác đang viết dở).
- `--t` là **giây toàn phim**, không phải `lt` trong scene.
- `--scale 2` = 4K; `--samples auto` = motion blur; `--cuts` = sheet quanh các mốc cắt.
- Preview: `cd app && bun run dev` → `http://localhost:5173/?project=<id>`.

## `data/sound.json`
Chỉ tiếng bắn (`cannon`, `mg`, `burst`, `rocket`) và tiếng nổ (`boom`), không nhạc nền. Lược đồ và ví dụ: [guide âm thanh](references/sound.md).

## Ghi chú kỹ thuật
- `init_video.py` chép `kit/` vào `projects/<id>/scenes/shared/`. **Không chạy `--kit`** trên project đang dựng
  (ghi đè bản chép, vỡ API).
- Scene import từ `./shared/...`, không import xuyên sang project mẫu.
- `--samples auto` chỉ dùng khi xuất video; stills để mặc định.
