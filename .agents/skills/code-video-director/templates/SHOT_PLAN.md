# Shot plan: <id>

Voice: `input/voice.mp3`. Mốc là giây voice. Máy đọc: `plan/scenes.json`, mốc: `video/cues.ts`.

## 1. Ý tưởng
- Câu hỏi mở đầu / điểm nhấn:
- Mô-típ hình xuyên suốt:

## 2. Thiết kế mỹ thuật riêng của video
- Không khí, giờ trong ngày, thời tiết:
- Bảng màu 2D (nền, chủ thể, nhấn):
- Bảng màu & ánh sáng 3D (sky, sun, exposure, sương, hậu kỳ):
- Ngôn ngữ camera:
- Media người dùng sẽ dùng (input/ hoặc library/):

## 3. Mô hình & hình dùng chung (`video/local/`)
| Tên / Component | File đích (`video/local/...`) | Loại (3D/2D) | Kích thước thật (m) / nguồn tỉ lệ | Props / Bộ phận chuyển động | Dùng ở cảnh |
|---|---|---|---|---|---|

## 4. Phân cảnh
| Cảnh | Mốc (s) | 2D/3D | Góc máy & diễn biến | Mốc CUE chính | SFX (1–2) |
|---|---|---|---|---|---|

## 5. Phân công subagent
- **Bước A2 — Subagent dựng mô hình 3D (`video/local/models/`):** *(hình 2D dùng chung trong `video/local/` do Agent chính tự vẽ)*
  - Model 1: `video/local/models/...`
- **Bước B — Subagent dựng cảnh (`video/scenes/`):**
  - Nhóm 1: S01, S02 …

## 6. Âm thanh
- Nhạc (synth / tracks):
- SFX:
