# Âm thanh video `story_2d` (Nhạc nền theo cảm xúc kịch bản & Foley bám sát chuyển động)

Đọc trước `skills/sound-design/SKILL.md` để nắm cơ chế `mix.json` và `audio.py`. File này hướng dẫn cách chọn nhạc nền và đặt SFX từ chính code `.tsx` của cảnh sao cho sống động, xúc giác và không bao giờ lấn át giọng đọc.

---

## 1. Nhạc nền (`music` trong `mix.json`) & Không gian nền (`amb`)

1. **Chọn nhạc theo đúng thể loại & đường cảm xúc của kịch bản (`SearchRecordings`):**
   - Không đóng khung vào một màu nhạc cố định. Đọc kỹ `plan/STORY.md` và nội dung kịch bản để chọn đúng chất liệu âm nhạc:
     - *Điều tra / Tài chính / Kinh doanh:* tiết tấu rình rập gọn gàng, bassline, pizzicato, synth pulse hoặc piano tối giản.
     - *Kịch tính / Bí ẩn / Tâm lý / Khoa học viễn tưởng:* dark ambient pulse, cello trầm, đồng hồ/cơ khí căng thẳng, synth khí quyển sâu.
     - *Lịch sử / Nhân vật / Bi kịch / Hành động:* nhạc cụ mộc, dàn dây có chiều sâu hoặc nhịp trống căng theo đúng sức nặng sự kiện.
   - Giữ nhạc nền lùi gọn dưới giọng đọc (tránh nhạc có vocal hoặc dải trung `1.5–4 kHz` dày đặc tranh chấp với lời nói).
2. **Đòn bắt tai cho Hook (`0–15s` đầu) & Điểm chuyển nhạc:**
   - **Giây `0.0s` vào ngay lập tức (Cold Open):** Cấm fade-in nhạc rề rà 4–5s làm xẹp Hook! Ngay trong `0.0–0.3s` đầu phải có tiếng foley cận cảnh sắc nét khớp hình ảnh mở màn (tiếng lửa táp, đồng hồ tích tắc gắt, kéo khoá, kính nứt, còi xa…) kèm nhịp nhạc căng đi vào ngay, và tạo **1 cú ngắt nhịp gọn (`drop` / `sub hit` ngắn)** ở câu chốt cuối Hook trước khi mở sang Chương 1.
   - Đổi nhạc hoặc hạ/dâng âm lượng tự nhiên theo các bước ngoặt lớn của câu chuyện.
   - Nếu cảnh có dùng `BlackPunchCard` ở câu twist quan trọng, có thể `duck` nhẹ hoặc ngắt nhạc thoáng qua để câu chốt vang lên sắc nét rồi thả nhịp nhạc trở lại.
3. **Tiếng không gian nền (`amb`):**
   - Lót mỏng vừa đủ (`gain 0.06–0.14`) đúng với môi trường thực tế đang vẽ trên màn hình (hầm kín, phòng máy chủ, văn phòng, ngoài trời mưa, nhà xưởng…); những cảnh không gian trừu tượng tối giản thì giữ nền sạch (`dry`).

---

## 2. Đặt SFX từ chuyển động thực tế trong `.tsx` (`plan/sfx/*.json`)

Mỗi agent SFX mở trực tiếp `src/scenes/CNNSxx.tsx` + `src/cues/CNN.ts`, đọc các mốc biến đổi thực sự trên màn hình để đặt SFX ăn khớp:

| Chuyển động thực tế trong `.tsx` | Gợi ý chất tiếng (`SearchSoundEffects`) | Cách căn mốc |
|---|---|---|
| `whipCam` lia máy nhanh / zoom gắt | Tiếng lướt gió gọn, trầm mềm (`soft cloth whoosh`, `camera swish short`) | `align: "peak"` giữa khoảng chuyển máy |
| `SplitStage` có khung trượt vào (`from`) | Tiếng trượt vách / thẻ gọn (`panel slide`, `card snap`) | `align: "start"` tại mốc `from` |
| `BlackPunchCard` mở ra (nếu có) | Tiếng nhấn trầm gọn (`low muted thump`, `soft piano/sub hit`) hoặc tiếng cơ học mảnh theo chủ đề phim | `align: "peak"` tại `from` |
| `InWorldDoc` tô sáng / gạch bỏ / khoanh đỏ | Tiếng bút dạ quẹt giấy, bút gạch xoẹt (`marker swipe`, `pen strike`) | `align: "start"` tại `highlightAt` / `strikeAt` / `circleAt` |
| `RelationLink` đóng dấu `[X]` (`crossAt`) | Tiếng đóng dấu / gõ dứt khoát (`stamp thud`, `sharp impact`) | `align: "peak"` tại `crossAt` |
| `RollingNumber` cuộn số (`from` → `to`) | Tiếng nhảy số mảnh (`counter tick`) kết thúc bằng tiếng chốt nhẹ tại `to` | Phủ `[from, to]`, lọc bớt dải cao nếu đè lời |
| Đạo cụ vật lý tự vẽ trong `src/parts/` & `scenes/` | **Bám đúng vật liệu thật của đạo cụ đó:** bánh răng kim loại ăn khớp, thuỷ tinh nứt/chảy, giấy rút sột soạt, công tắc tắt phụt, quạt tản nhiệt quay chậm dần, vật nặng đặt lên bàn… | Khớp chính xác biểu thức `prog(t, a, b)` / `useSpring(t, at)` trong code cảnh |
| Hành động nhân vật `Actor2D` | Tiếng bước chân theo mặt sàn, đặt tay lên vật thể, cụng ly, sột soạt áo… khi hành động đó là điểm nhấn của cảnh | Khớp đúng cử chỉ trong cảnh |

### Nguyên tắc tiết chế & độ sạch:
- **Đặt SFX theo điểm nhấn thực tế, không rải đều máy móc theo giây:** chỗ nào có hành động vật lý đắt giá thì đặt tiếng rõ chất liệu; chỗ nào nhân vật đang thoại trầm lắng không có va chạm thì để khoảng sạch cho giọng đọc thở.
- Hai chuyển động sát nhau (`< 0.22s`) gộp thành 1 SFX chính, tránh chồng chéo rối tai và không để SFX che khuất phụ âm lời đọc.
