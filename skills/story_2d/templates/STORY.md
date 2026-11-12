# Story: {title}

Voice: `assets/voice/voice.mp3`, tổng {duration} s. Ngôn ngữ chữ trên hình: . Mốc luôn là giây toàn phim. Skill: `story_2d` (vũ trụ hoạt hình 2.5D đồng nhất — 0% ảnh chụp thật, 0% 3D).

## 1. Tinh thần kịch bản & Ngôn ngữ thị giác riêng (`src/design/palette.ts`)
- Tông cảm xúc & thể loại câu chuyện:
- Bảng màu bầu khí quyển thiết kế riêng cho bộ phim này (màu nền chính/phụ, màu ánh sáng nhấn, màu chất liệu chủ đạo → code vào `src/design/palette.ts`):
- Cú đảo chiều / cao trào lớn nhất nằm ở đâu:

## 2. Thiết kế Hook Mở Màn (`0–15s` đầu tiên — Bắt buộc kịch tính, cấm cảnh giới thiệu tĩnh)
- **Giây `0.0s` đập vào mắt hình ảnh gì** *(chọn 1: Nghịch lý thị giác đối chọi gay gắt / Đỉnh điểm biến cố In Medias Res / Cực cận chi tiết bất thường → giật lùi lộ toàn cảnh)*:
- **Nhịp biến đổi liên hoàn trong `10–15s` đầu** *(mỗi `2.5–3.5s` lật góc máy / hành động vật lý nào theo lời đọc → điểm chốt cuối Hook ở giây nào trước khi vào Chương 1)*:

## 3. Phân vai Giọng đọc (nếu đi từ Kịch bản → `plan/voice_script.json` & `voice_cast.json`)
- Hướng dẫn đọc voice gốc của người dùng (ghi nguyên văn):
- Bảng giọng:
| Vai (`role`) | Nhân vật / Mô tả | Giọng / API / MCP sử dụng | Tông đọc & tốc độ (`voice_hint`) |
|---|---|---|---|
| `narrator` | Người dẫn chuyện chính | | |

## 4. Nhận diện Khuôn mặt Nhân vật → `src/design/cast.tsx` *(Để trống nếu kịch bản không cần nhân vật cố định)*
`cast.tsx` **chỉ khoá khuôn mặt, mái tóc, màu da và vóc dáng** để nhận ra cùng một người (với người thật ít gặp: gộp 1 lệnh `cast_ref.py` ~3s nắm 2–3 nét chính rồi dựng tương đối gọn nhanh; hư cấu/không có ảnh thì tự thiết kế). **Cấm khoá cứng 1 bộ quần áo cho cả phim** — trang phục của từng cảnh phải tự suy sáng tạo theo không gian, thời điểm và tâm trạng lúc đó (`torso` + `sleeves` + `bottom` + `bodyClipSlot` / `bodySlot` phối theo `palette.ts`). Chỉ bật `HudPill` ở đúng 1 cảnh xuất hiện đầu tiên khi thực sự cần định danh tên riêng/chức vụ; không cần thì ghi `Không`:

| Mã hằng (`cast.tsx`) | Cảnh bật `HudPill` lần đầu (`C01Sxx` hoặc `Không`) | Nội dung `HudPill` (`text` / `sub`, để trống nếu `Không`) | Nét mặt, tóc & dáng cố định (`headShape`, `build`, `hair`/`hairSlot`, `faceSlot`, `skin`) | Định hướng biến đổi trang phục qua các bối cảnh / giai đoạn trong phim |
|---|---|---|---|---|

## 5. Không gian Neo & Đạo cụ Vật lý (`src/parts/<Tên>.tsx`)
Neo đoạn ý vào bối cảnh đời thực **nhìn `0.5s` hiểu ngay** + cài lớp **lật mặt sau / đối lập ngầm (Subtext)**; **cấm** dịch từng từ ra icon lẻ tẻ và **cấm** vẽ cơ cấu trừu tượng đánh đố người xem (kiểm bằng `check.py --part all` trước khi dựng cảnh):

| File `src/parts/` (hoặc cảnh riêng) | Đoạn ý trong kịch bản | Tình huống bề nổi dễ hiểu ngay (`0.5s`) → Cú lật góc máy / biến đổi vật lý phơi bày tầng nghĩa ngầm | Dùng ở các cảnh |
|---|---|---|---|

## 6. Điểm nhấn `BlackPunchCard` *(Tuỳ chọn — chỉ đặt khi kịch bản thực sự có câu chốt đắt hoặc ngắt hồi; để trống nếu không cần)*
| # | Mốc giây (`CUE`) | Loại (`WORDS` câu chốt từng từ / `TITLE` chia chương) | Nội dung chữ trên nền `#000000` | Từ tô màu nhấn (nếu có) |
|---|---|---|---|---|

## 7. Chương
| # | Mốc (s) | Trọng tâm nội dung & cảm xúc | Không gian neo & cú lật thị giác chính | Liên kết sang chương tiếp theo |
|---|---|---|---|---|
{chapters}
## 8. Âm nhạc & SFX
- Yêu cầu âm thanh của người dùng (nếu có):
- Âm thanh bắt tai giây `0.0s` cho Hook + màu nhạc nền, không gian âm (`amb`) & chất liệu SFX chủ đạo (`skills/sound-design/SKILL.md` + `skills/story_2d/SOUND.md`):

## 9. Tiến độ
| Chương | Plan | Parts 2D | Dựng cảnh | Kiểm & `review.py` |
|---|---|---|---|---|
{progress}
