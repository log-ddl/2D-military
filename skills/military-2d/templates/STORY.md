# Story: {title}

Voice: `assets/voice/voice.mp3`, tổng {duration} s. Ngôn ngữ chữ trên hình (theo `transcript.json`): . Mốc luôn là giây toàn phim. Skill: `military-2d`.

## 1. Lập luận & trải nghiệm xem
- Câu hỏi trung tâm người xem muốn được giải đáp:
- Hook mở đầu (khoảng trống nhận thức + hình hoạt động ngay từ khung đầu mà không chờ lời):
- Phân vai 3 trụ cột trong phim này (đoạn nào cần Bản đồ địa lý · đoạn nào cần Vẽ 2D chiến thuật / hành động / mặt cắt · đoạn nào cần Ảnh tư liệu & Nhân vật):
- Người xem nhận ra quan hệ / bài học gì ở cuối:

## 2. Thiết kế mỹ thuật chung → `src/design/`
- Bảng màu cảnh vẽ 2D (dựa trên `P`, `LINE` — màu nền, địa hình, màu thân phe ta / phe đối phương / điểm nhấn):
- Bảng màu bản đồ địa lý (dựa trên `M` — biển, đất, nước tô nổi, màu phe đồng bộ với cảnh vẽ 2D):
- Tông ảnh tư liệu cả phim (`mono` / `warm` / `cold` / `none`) và có hiện dòng nguồn trên hình không:
- Quy ước hình xuyên phim (hình / ký hiệu nào đại diện cho khái niệm nào, giữ nhất quán từ đầu đến cuối):

## 3. Tài sản vẽ 2D dùng chung (`src/parts/<Tên>.tsx` — khoá & `check.py --part` trước khi dựng cảnh)
Mọi khí tài, công sự, vũ khí hay mặt cắt xuất hiện ở nhiều cảnh hoặc cần biên dạng chuẩn phải vẽ thành hàm/component nhận góc nhìn & trạng thái trong `src/parts/`.

| File `src/parts/` | Chủ thể | Góc nhìn cần có (`side` / `top` / `cutaway`) | Kích thước thật / tỉ lệ chuẩn | Các bộ phận / điểm gắn động (tháp pháo, nòng, nắp, vỏ cắt…) |
|---|---|---|---|---|

## 4. Bản đồ nền & dữ kiện địa lý (chỉ cho các cảnh thực sự nói về địa lý cấp chiến dịch)
### 4a. Bản đồ nền
| Tên | Loại (`GeoBase` / `SatBase`) | bounds hoặc bbox + size | Mã ảnh | Bề ngang thật (km) | Dùng ở cảnh |
|---|---|---|---|---|---|

### 4b. Toạ độ (`src/parts/geo.ts`) & đơn vị trên bản đồ
| Tên hằng | Là gì (địa danh / tuyến / mặt trận ngày nào / vùng) | Toạ độ lấy từ đâu | Chắc chắn / minh hoạ |
|---|---|---|---|

| Đơn vị | Phe | Binh chủng | Cấp | Tên hiển thị (đúng một tên) |
|---|---|---|---|---|

## 5. Ảnh tư liệu & Nhân vật
### 5a. Ảnh tư liệu
| Mã | Ảnh gì (ai / cái gì / ở đâu / năm) — đã tự xem và xác nhận | Nguồn (trang gốc) | Cỡ | Cờ (`risk` / `license-unknown`) | Dùng ở cảnh, kiểu (`PhotoCard` / `PhotoFull`) |
|---|---|---|---|---|---|

Câu cần ảnh mà chưa tìm được tấm đúng (chuyển sang dựng 2D hoặc báo người dùng bổ sung vào `input/`):
-

### 5b. Nhân vật (mỗi người được nhắc tên)
| Người | Tên hiển thị (đúng một cách) | Chức vụ tại thời điểm sự kiện | Phe | Mã ảnh (+ mã đã tách nền) | Lần xuất hiện → kiểu thẻ (`PersonTitle` / `PersonCutout` / `PersonDossier` / `PersonNews`) |
|---|---|---|---|---|---|

## 6. Chương
| # | Mốc (s) | Câu hỏi chương giải đáp | Sân khấu chủ đạo (`MAP` / `2D-NGANG` / `2D-SA-BÀN` / `2D-MẶT-CẮT` / `ẢNH`) | Trạng thái đầu → biến đổi → trạng thái cuối & nối sang chương sau |
|---|---|---|---|---|
{chapters}
## 7. Âm nhạc
- Yêu cầu âm thanh của người dùng (nguyên văn, đứng trên mọi mặc định):
- Đường cảm xúc theo đoạn → agent âm thanh (`skills/sound-design/SKILL.md` + `skills/military-2d/SOUND.md`):

## 8. Theo dõi
| # | Plan | Parts 2D & Ảnh | Dựng | Kiểm | Ghi chú |
|---|---|---|---|---|---|
{progress}
