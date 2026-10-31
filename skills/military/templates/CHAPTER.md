# Chương {cid}: {title}

Mốc <from>–<to> s (giây toàn phim). Voice từng từ: `plan/chapters/{cid}.voice.md`. Máy đọc: `plan/chapters/{cid}.json`, mốc: `src/cues/{cid}.ts`.

## 1. Ý chương
- Câu hỏi chương trả lời:
- Trạng thái đầu (nhận từ chương trước, đúng như STORY.md):
- Trạng thái cuối (giao cho chương sau, đúng như STORY.md):
- Giờ trong ngày / bối cảnh / chỉnh ánh sáng so với thiết kế chung:

## 2. Base dùng & biến thể riêng chương
| Base | Dùng props nào / biến thể | File biến thể riêng (nếu có) | Dùng ở cảnh |
|---|---|---|---|

Biến thể riêng chương: `src/parts/{cid}_<Tên>.tsx` (2D hoặc 3D; 3D kiểm `--part`). Chỉ kế thừa base, không sửa base.

## 3. Phân cảnh
| Cảnh | Mốc (s) | 2D/3D | Góc máy & diễn biến (khớp từ nào) | Mốc CUE chính | SFX (1–2) |
|---|---|---|---|---|---|

## 4. Nhóm dựng (mỗi nhóm tối đa 2 cảnh 3D)
- Nhóm 1: {cid}S01, {cid}S02 …

## 5. Đề xuất sửa STORY.md / base (nếu có)
-
