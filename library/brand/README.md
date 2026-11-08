# Logo & Nhận diện Kênh dùng chung (`library/brand/`)

Thả trực tiếp file logo chính thức của kênh vào thư mục này với tên **`logo.png`** (khuyên dùng PNG nền trong suốt `512×512` hoặc `1024×1024` px) hoặc **`logo.svg`**.

- Khi chưa có `logo.png` / `logo.svg`, hệ thống tự động dùng `logo_placeholder.png` để không bao giờ gãy bản dựng.
- Ngay khi bạn chép `logo.png` vào đây, `build.py`, `check.py` và `render.py` tự nhận diện dấu thời gian mới và cập nhật lên toàn bộ vách nhà chứa (`<BrandWallMark>`), sơn stencil trên khí tài (`<BrandDecal>`) và nhãn kim loại (`<BrandPlate>`) mà không cần sửa code dự án.
- Chỉnh màu sơn stencil mặc định hoặc độ đậm nhạt tại `brand.json`.
