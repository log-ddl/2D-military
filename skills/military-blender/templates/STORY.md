# Story: {title}

Voice: `assets/voice/voice.mp3`, tổng {duration} s. Ngôn ngữ chữ trên hình (theo `transcript.json`): {lang}. Mốc luôn là giây toàn phim. Skill: `military-blender` (dựng 100% bằng Blender 5.2 EEVEE + Blender VSE); video dài thêm `long-video` (chia việc).

## 1. Lập luận cả phim
- Hook mở câu hỏi gì:
- Mỗi chương trả lời phần nào:
- Người xem hiểu gì ở cuối:

## 2. Thiết kế mỹ thuật chung (mọi chương theo — 100% bám theo bối cảnh lời bình `voice`)
- Không khí, thời đại, địa điểm chiến trường / bối cảnh thật theo kịch bản (chương được đổi giờ trong ngày / thời tiết theo nội dung, ghi ở bảng chương):
- Bảng màu & ánh sáng 3D trong Blender (`init_stage(preset=...)`, mặt trời, bầu trời vật lý, sương mù / mây / địa hình theo đúng bối cảnh thực tế của từng cảnh):
- Ngôn ngữ camera 3D chung (`setup_camera`):
- Phong cách Sa bàn Bản đồ Địa lý 3D (`build_geomap_3d`, màu lục địa, màu quốc gia nhấn, đường bay 3D `add_map_route`):
- Vị trí gắn Logo Kênh 3D (`add_brand_decal` sơn stencil uốn cong ôm sát lên thân/cánh đuôi khí tài hoặc đồ vật 3D, tự động cân bằng màu sáng/tối `variant='auto'` — đọc từ `library/brand/`):

## 3. Tài sản 3D dùng chung (`bk_cache/<uuid>/source_*.blend` hoặc `mixamo/*.fbx`, khoá trước khi chia chương)
| Tên khí tài / bối cảnh / nhân vật | Nguồn (`bk_cache/<uuid>` / `mixamo/*.fbx` / `code-blender`) | Kích thước thật (m) | Bộ phận khớp nối (`rig_joint`) / nhóm vỏ mổ xẻ (`setup_laser_cutaway`) | Dùng ở chương | Trạng thái |
|---|---|---|---|---|---|

## 4. Quy ước xuyên phim
- Ngôn ngữ chữ hiển thị trên màn hình (bắt buộc trùng 100% với ngôn ngữ của `voice` trong `transcript.json`):
- Tên gọi thống nhất (khí tài, đơn vị, địa danh) — đúng một tên cho mỗi thứ:
- Hiệu ứng 3D dùng theo đúng lời bình (nổ, khói, mây, đường dòng khí, vệt xoáy, mặt cắt laser):
- Chú thích `<Callout>` 3D (`add_callout_3d`) & Thước đo (`add_measure_3d`):

## 5. Chương
| # | Mốc (s) | Câu hỏi / ý của chương | Giờ / bối cảnh thực tế | Trạng thái đầu | Trạng thái cuối | Nối với chương sau |
|---|---|---|---|---|---|---|

## 6. Âm nhạc & SFX
- Yêu cầu âm thanh của người dùng (nguyên văn, đứng trên mọi mặc định):
- Đường cảm xúc theo đoạn (hook / giải thích / cao trào / kết) → agent âm thanh dựng nhạc theo đó (`skills/sound-design/SKILL.md` + `skills/military-blender/SOUND.md`):

## 7. Đề xuất bổ sung tài sản 3D từ các chương
| Chương | Đề xuất | Quyết định |
|---|---|---|

## 8. Theo dõi
| # | Plan | Duyệt | Dựng `.blend` & `--check` | Kiểm `--test` | Xuất chính thức (`--render all` khi có lệnh) |
|---|---|---|---|---|---|
