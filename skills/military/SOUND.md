# Âm thanh video quân sự

Cách làm chung: `skills/sound-design/SKILL.md`. File này **không phải bảng tra**: mọi quyết định âm thanh bắt đầu từ kịch bản
của chính video này. Đây là kiến thức để đọc kịch bản quân sự ra âm thanh cho đúng.

## 1. Đọc kịch bản và code cảnh `.tsx` trước, tiếng sau
Nhạc nền đọc `plan/STORY.md`, `plan/chapters/CNN.md`, lời đọc từng câu (`voice_map.md` / `CNN.voice.md`).
**SFX bắt buộc đọc thêm trực tiếp `src/scenes/CNNSxx.tsx`** để lấy chính xác mốc `<Explosion`, `<MuzzleBlast`, `bump` và khoảng chuyển động `prog(t, a, b)` trên hình.
Với **từng đoạn / từng cảnh** trả lời trước khi nghĩ tới file nào:
1. **Đoạn này kể gì, người xem cần cảm thấy gì?** (câu hỏi gây tò mò · lập luận lạnh · căng dần · cú sốc · lời giải nhẹ nhõm).
   Nhạc đi theo đường này; SFX phục vụ đúng sự kiện đang hiện trên hình, không đặt mù theo từ vựng của lời đọc.
2. **Hình thực tế trong `.tsx` đang là gì?** Chiến trường hiện thực (3D `Terrain`/`Water`, footage) · mặt cắt / phòng kỹ thuật (`cutaway`, hangar, `studio`) · sơ đồ, bản đồ 2D SVG · HUD số liệu.
   Mỗi loại một ngôn ngữ tiếng (mục 2) — kể cả lời đọc đang nói từ "nổ", "rơi", "sóng xung kích" mà hình là sơ đồ 2D thì cũng **cấm** dùng tiếng nổ chiến trường hiện thực.
3. **Máy quay ở đâu?** Cận hay xa, trong hay ngoài xe, POV ai, vật đi qua máy hay đi xa máy → quyết định chất tiếng (mục 3).
4. **Hành động là điểm tức thời hay khoảng kéo dài?** Nổ / va chạm / bắn → điểm `at` (`align: "peak"`, đủ cả các cú nổ phụ trong `.tsx`). Động cơ, cánh quạt, xe lăn xích, xoay cánh, hạ bửng → khoảng `[t_đầu, t_cuối]` (`align: "start"`, `loop_to` phủ trọn khoảng chuyển động, không cắt mẩu 3 s rồi ngắt ngang).
5. **Lời đang nói gì & có cần tiếng không?** Câu đang chứa ý chính → tiếng nhỏ hoặc nhường lời; im lặng ngay trước cú lớn nhất có lực hơn mọi lớp tiếng.

Ghi kết quả thành bảng "khoảnh khắc âm thanh" trong báo cáo: cảnh · mốc `at` hoặc `[t_đầu, t_cuối]` từ `.tsx` · loại hình · cần gì ·
mô tả tiếng (nguồn âm, chất liệu, khoảng cách, `align`, độ dài, đầu, đuôi). **Rồi mới tìm**, bằng mô tả đó.

## 2. Ngôn ngữ tiếng theo loại hình
- **Chiến trường hiện thực:** tiếng thật, nặng, có khoảng cách và vang địa hình. Một tiếng chính mỗi lúc; nền gió / đất.
- **Mặt cắt, phòng kỹ thuật, mô phỏng:** người xem đang *học*, không đang *ở đó* → tiếng thiết kế, gọn, sạch, ít lớp
  (cơ khí, thủy lực, kim loại khô, whoosh nhẹ khi tách lớp); không nổ hiện thực đầy đủ trừ đúng khoảnh khắc kịch bản nhấn.
- **Sơ đồ / bản đồ 2D:** gần như chỉ nhạc; tiếng nhỏ khi một ý xuất hiện (mũi tên, vùng sáng), cùng một họ tiếng.
- **HUD / số liệu:** chỉ khi con số là ý chính của câu; tối đa vài lần một phút; một họ tiếng nhẹ.
- **Chuyển cảnh:** chỉ có tiếng khi đổi hẳn không gian / mạch (vào phòng kỹ thuật, ra lại chiến trường); không whoosh mọi cú cắt.

## 3. Hiểu vật lý để mô tả đúng tiếng (rồi tìm theo mô tả)
- **Khoảng cách:** cận = nhiều tiếng đầu sắc, tiếng cơ khí, đủ dải; xa = mất dải cao, còn rền trầm, đuôi dài, vang địa hình,
  tiếng đến sau hình (xa 1 km ≈ trễ 3 s — chỉ dùng khi muốn nhấn khoảng cách).
- **Trong xe / trong khoang:** tiếng ngoài bị bịt (mất dải cao), rung thân xe, tiếng cơ cấu bên trong rõ.
- **Đạn pháo, đạn xuyên giáp:** nổ nòng (cú đập + sóng áp), đạn siêu thanh xé gió trước khi nghe tiếng nòng nếu ở phía đích,
  va giáp dày = thịch đục + ngân kim loại ngắn; nảy đạn = tiếng rít kim loại đổi cao độ.
- **Tên lửa, ATGM:** khởi động (nổ đẩy ngắn) → động cơ cháy liên tục, lia theo hướng bay, cao độ đổi khi bay qua / xa dần.
- **Drone nhỏ, FPV:** rít cao của động cơ điện, cao độ đổi theo ga và khi lượn; to dần khi lao tới.
- **Đầu đạn nổ lõm (HEAT), luồng kim loại:** kích nổ khô và cực ngắn; luồng kim loại = xé / xì rất nhanh, không phải tiếng nổ lớn.
- **Nổ hầm đạn, nổ lớn:** dâng (hút khí) → cú nổ nhiều tầng (đập + thân + trầm) → đuôi dài (mảnh vụn rơi, lửa, nổ phụ lẻ tẻ).
- **Xe xích:** động cơ diesel trầm + tiếng xích lạch cạch kim loại; xe nặng qua gờ = thịch + kẽo kẹt thân.
- **Bộ binh & súng cá nhân (`<Soldier3D>`):** loạt bắn (`fireAt`, `burstRounds`) ở cận cảnh = nổ đầu nòng đanh gọn + cơ cấu khoá nòng kim loại, ở trung/viễn cảnh = đanh khô có đuôi dội địa hình; thay băng đạn (`Rifle_Reload_Crouch`, `onceFrom`) = tháo băng rỗng + đóng băng mới + kéo quy-lát khớp nhịp tay; tiến quân / xung phong / lăn chiến thuật = lớp bước giày bốt trên đất/sỏi + tiếng xóc nhẹ trang bị vải bố (`align: "start"`, phủ đúng khoảng di chuyển).
- **Radar, hệ thống điện tử:** thường *không có tiếng thật* với người đứng ngoài → nếu kịch bản cần nhấn, dùng tiếng thiết kế
  nhẹ (quét, khoá mục tiêu, `align: "start"`), đừng giả như tiếng thật.
- **Đúng chất liệu bề mặt & cơ cấu (cấm gắn sai nguồn âm):** lao xuống biển/sông phải có tiếng nước tung bọt lớn (splash/plunge), không dùng nổ đất khô; nứt cánh composite / gãy bánh răng thép phải là tiếng rạn xé sợi / nghiến vỡ kim loại, không dùng tiếng đập kính; khớp nối cơ khí trên không không dùng tiếng đóng cửa sắt có vang phòng; máy bay cánh quạt / turboprop / trực thăng đang bay trên hình phải có lớp cánh quạt chạy suốt khoảng bay (`align: "start"`, `loop_to`), không chêm mẩu ngắn rồi tắt.
Mô tả tìm kiếm ghép **nguồn âm + hành động + khoảng cách / chất liệu**: "tank cannon shot distant", "metal armor impact heavy close",
"rocket launch whoosh away", "fpv drone fly by", "turboprop aircraft flyby", "water impact large splash". Với Epidemic, tên SFX dạng "Vehicles, Military, …" — tìm đúng chủng loại khí tài / bề mặt va chạm.

## 4. Nhạc cho thể loại này (chọn theo đường cảm xúc của kịch bản, không theo thói quen)
- Thường hợp: cinematic / orchestral hybrid có trống rõ, giọng thứ, nhịp vừa (khoảng 80–110 BPM), có cú hit mở, đoạn thưa, cú kết thật.
  Kịch bản buồn (thương vong, hậu quả) hay hào hùng (lịch sử, chiến thắng) thì đổi tính chất theo kịch bản.
- Tránh: nhạc có lời hát dưới giọng đọc; EDM / house; nhạc giọng trưởng tươi sáng đè lên đoạn phân tích nghiêm túc.
- Mỗi video chọn bài theo kịch bản của nó; **không dùng lại cùng một bài cho các video liên tiếp** trừ khi người dùng muốn
  (vd series có nhạc chủ đề riêng). Kho có ghi chú cấu trúc từng bài (`sound_lib.py show <khoá>`), dùng để dựng nhanh khi bài hợp.

## 5. Khoảng trống của nguồn (tính tới 2026-11)
- Freesound CC0: thiếu tiếng vũ khí hiện đại thu thật (phóng ATGM, pháo tăng cận) — tiếng có được thường là mô phỏng.
- Epidemic: có bộ thu thật xe quân sự / pháo tăng / đạn nảy; vẫn thiếu radar quân sự thật.
- Thiếu thì dựng từ lớp gần nhất theo mục 3 và ghi rõ trong báo cáo, không bịa là tiếng thật.
