# Story: {title}

Voice: `assets/voice/voice.mp3`, tổng {duration} s. Mốc luôn là giây toàn phim. Skill: `military` (chuẩn dựng); video dài thêm `long-video` (chia việc).

## 1. Lập luận cả phim
- Hook mở câu hỏi gì:
- Mỗi chương trả lời phần nào:
- Người xem hiểu gì ở cuối:

## 2. Thiết kế mỹ thuật chung (mọi chương theo)
- Không khí, thời đại, thời tiết chủ đạo (chương được đổi giờ trong ngày / thời tiết theo nội dung, ghi ở bảng chương):
- Bảng màu 2D (nền, chủ thể, nhấn, phe ta / phe địch) → `src/design/`:
- Bảng màu & ánh sáng 3D (sky, sun, exposure, sương, hậu kỳ) theo từng giờ trong ngày:
- Ngôn ngữ camera chung:
- Kiểu bản đồ / sơ đồ chung (nét, chữ, ký hiệu quân sự):
- Vị trí gắn Logo Kênh 3D (vách nhà chứa / mặt sàn studio / sơn stencil đuôi hoặc thân khí tài — `@skill/military/3d/brand`):
- Media người dùng sẽ dùng (mã trong `assets/ASSETS.json` hoặc `library/`):

## 3. Base dùng chung (`src/parts/`, khoá trước khi chia chương)
Mỗi base có đủ `props` để chương phát triển tiếp (trạng thái, cấu hình, ngụy trang, phụ kiện) mà không sửa base.

| Tên / Component | File đích | 3D/2D | Kích thước thật (m) / nguồn (`bk-rig` / `bk-actor` / `bk-prop` / `code-3d`) | Props / bộ phận chuyển động / biến thể qua props | Dùng ở chương | Trạng thái |
|---|---|---|---|---|---|---|

## 4. Quy ước xuyên phim
- Tên gọi thống nhất (khí tài, đơn vị, địa danh) — đúng một tên cho mỗi thứ:
- Hiệu ứng dùng chung (nổ, khói, vệt đạn) và mức độ:
- Nhãn chữ: kiểu, vị trí:
- Mốc chung `src/cues/film.ts` (nếu có):

## 5. Chương
| # | Mốc (s) | Câu hỏi / ý của chương | Giờ / bối cảnh | Trạng thái đầu | Trạng thái cuối | Nối với chương sau |
|---|---|---|---|---|---|---|

## 6. Âm nhạc
- Yêu cầu âm thanh của người dùng (nguyên văn, đứng trên mọi mặc định):
- Đường cảm xúc theo đoạn (hook / giải thích / cao trào / kết) → agent âm thanh dựng nhạc theo đó (`skills/sound-design/SKILL.md`):

## 7. Đề xuất bổ sung base từ các chương
| Chương | Đề xuất | Quyết định |
|---|---|---|

## 8. Theo dõi
| # | Plan | Duyệt | Dựng | Kiểm | Ghi chú |
|---|---|---|---|---|---|
