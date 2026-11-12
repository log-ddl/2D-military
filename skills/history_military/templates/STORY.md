# Story: {title}

Voice: `assets/voice/voice.mp3`, tổng {duration} s. Ngôn ngữ chữ trên hình: {lang}. Mốc luôn là giây toàn phim. Skill: `history_military`; video dài thêm `long-video`.

## 1. Lập luận cả phim
- Câu hỏi / nghịch lý mở phim (hook kết bằng câu nào, giây nào):
- Mỗi chương trả lời phần nào:
- Người xem hiểu gì ở cuối; hình ảnh kết quay lại hình ảnh mở nào:
- Góc kể và nguồn chính (kể "qua hồ sơ của ai"):

## 2. Nhịp
- Tốc độ đọc (từ/phút), số khoảng lặng > 2 s:
- **Khoảng nhạc cao trào và khoảng lặng** (đã chèn bằng `voice_prep.py`; giây mới):

| # | Từ–đến (s) | Sau câu nào | Cụm cao trào điểm lại / báo trước gì | Kết bằng (thẻ tên / thẻ chuyển đoạn / đen / lặng) |
|---|---|---|---|---|

- Đường cảm xúc theo đoạn (cho agent nhạc): mở / giải thích / mất mát / cao trào / kết:
- Yêu cầu âm thanh của người dùng (nguyên văn):

## 3. Bảng NGUỒN (khoá trước khi lập bảng shot; đủ 4 nhóm: A toàn cảnh · B con người cận cảnh · C phía bên kia · D vật chứng giấy)
| Nhóm | Mã | Loại (phim / sách / ảnh / bản đồ) | Tên, năm, nơi giữ | Giấy phép | Phủ nội dung gì (năm, nơi, đơn vị) | Dùng ở chương | Khuôn dòng nguồn in trên hình |
|---|---|---|---|---|---|---|---|

Ngân sách (phim dài): số shot dự kiến … → cuộn … · ảnh … · trang … · bản đồ …. Không cuộn nào > 45% thời lượng phim tư liệu.
Cuộn phim: mục lục ở `library/footage/dl/<mã>/NOTES.md`. Sách: `library/images/dl/docs/<mã>.pdf`.

## 4. Chỗ thiếu hình và cách xử lý (nói thật trong dòng nguồn)
| Câu / mốc | Thiếu gì | Dùng thay | Dòng nguồn sẽ ghi |
|---|---|---|---|

## 5. Quy ước xuyên phim
- Tên gọi thống nhất (đơn vị, địa danh, nhân vật) — đúng một cách viết:
- Cách viết số, ngày, đơn vị đo:
- Tên kênh ở chân thẻ (`CardFooter brand`):
- Chỉnh màu phim: `archive` cho toàn bộ phim cũ; ngoại lệ:

## 6. Chương
| # | Mốc (s) | Ý của chương | Nhãn chương trên hình | Mở bằng hình gì → kết bằng hình gì |
|---|---|---|---|---|

## 7. Theo dõi
| # | Bảng shot | Tài sản | Dựng | pace.py | Kiểm | Ghi chú |
|---|---|---|---|---|---|---|
