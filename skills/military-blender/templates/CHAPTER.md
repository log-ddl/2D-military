# Chương {cid}: {title}

Mốc <from>–<to> s (giây toàn phim). Voice từng từ: `plan/chapters/{cid}.voice.md`. Máy đọc: `plan/chapters/{cid}.json`.

## 1. Ý chương
- Câu hỏi chương trả lời:
- Trạng thái đầu (nhận từ chương trước, đúng như STORY.md):
- Trạng thái cuối (giao cho chương sau, đúng như STORY.md):
- Giờ trong ngày / địa điểm / bối cảnh thực tế theo lời bình:

## 2. Tài sản 3D & Bộ phận mổ xẻ / Khớp động học dùng trong chương
| Tài sản (`bk_cache/<uuid>` / `mixamo/*.fbx`) | Khớp động (`rig_joint`) / Vật liệu (`materials.py`) / Giải phẫu (`cutaway.py`, `geom.py`) | Dùng ở cảnh |
|---|---|---|

## 3. Phân cảnh (100% dựng trong `blender/{cid}Sxx.py`)
| Cảnh | Mốc (s) | Loại cảnh Blender (`3D Khí tài/Chiến trường` hay `3D GeoMap`) | Bối cảnh & diễn biến (khớp từ nào trong voice) | Callout (`add_callout_3d`) / Thước đo (`add_measure_3d`) | Chuyển cảnh (`fade` / `wipe` / `cut`) |
|---|---|---|---|---|---|

## 4. Nhóm dựng (mỗi nhóm tối đa 2 cảnh Blender)
- Nhóm 1: {cid}S01, {cid}S02 …

## 5. Đề xuất sửa STORY.md / tài sản 3D (nếu có)
-
