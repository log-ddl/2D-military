# Chương {cid}: {title}

Mốc <from>–<to> s (giây toàn phim). Voice từng từ: `plan/voice_map.md` (+ `plan/voice_cast.json` nếu có thoại nhân vật). Máy đọc: `plan/chapters/{cid}.json`, mốc từ: `src/cues/{cid}.ts`.

## 1. Mạch nội dung & Liên kết không gian
- Tiến trình câu chuyện trong chương (mở ra từ đâu → biến cố / thay đổi trạng thái nào → dẫn tới điều gì):
- Liên kết từ chương trước / giao cho chương sau:

## 2. Bảng Phân cảnh
Neo mỗi đoạn vào **1 tình huống đời thực dễ hiểu trong `0.5s` rồi dùng góc máy (`StoryCam` + `whipCam` / `Rack Focus`) lật lớp sự thật đối lập** — **cấm** dịch từng từ ra icon lẻ tẻ, **cấm** ẩn dụ rối rắm đánh đố; riêng `0–15s` đầu (`C01S01`…) bắt buộc mở bằng nghịch lý thị giác / đỉnh điểm biến cố nhịp dày. Chỉ đưa `Actor2D`, `SplitStage`, `InWorldDoc`, `StoryMap2D` hay `BlackPunchCard` vào đúng cảnh thật sự cần chúng:

| Cảnh | Mốc (s) | Không gian neo (`0.5s` hiểu ngay) & Ánh sáng (`palette.ts`) | Bề nổi → Cú lật góc máy / Tầng nghĩa đối lập (Subtext) | Biến đổi vật lý khớp từ khoá nào của voice | Nhân vật (mặt từ `cast.tsx` + trang phục sáng tạo riêng cho cảnh này + `talk`, nếu cần) & `parts/` | Chữ thật sự cần thiết (để trống nếu không cần) / `BlackPunchCard` (nếu có) | Khoá `CUE` & SFX chính |
|---|---|---|---|---|---|---|---|

## 3. Nhóm dựng song song (2–3 cảnh liền nhau / subagent)
- Nhóm 1: {cid}S01, {cid}S02 …

## 4. Ghi chú cập nhật `STORY.md` (nếu có)
-
