# Logo & Nhận diện Kênh dùng chung (`library/brand/`)

Thư mục này chứa bộ logo chính thức của kênh được đồng bộ tự động vào mọi dự án qua `build.py`, `check.py` và `render.py`:

- **`logo_white.svg`** — bản logo màu trắng (dùng cho khí tài sơn tối, xanh ô-liu, xám chiến thuật, rằn ri).
- **`logo_black.svg`** — bản logo màu đen (dùng cho khí tài vỏ nhôm bạc, sơn trắng vùng cực hoặc nền sáng).
- (Tuỳ chọn) **`logo.svg`** / **`logo.png`** — bản logo mặc định nếu dùng chung 1 file.

## Quy tắc gắn Logo (`@skill/military/3d/brand`)
- **Chỉ dùng `<BrandDecal target={root} ... />`** để chiếu sơn stencil low-vis (`opacity ~ 0.42–0.46`, `wear ~ 0.18–0.22`) ôm cong khít 100% lên bề mặt lưới 3D của khí tài chính (cánh đuôi đứng, lưng cánh chính, tháp pháo xe tăng, mạn tàu).
- **Cấm** gắn biển tường nhà chứa (`BrandWallMark`), bảng kim loại (`BrandPlate`) hay đóng dấu góc màn hình 2D (`BrandMark2D`).
- Cấu hình màu sơn stencil và độ đậm mặc định nằm tại `brand.json`.
