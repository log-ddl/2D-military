# Âm thanh phim tư liệu lịch sử quân sự

Cách làm chung: `skills/sound-design/SKILL.md`. File này là phần riêng của thể loại: hình là phim lưu trữ **câm**, lời đọc dày (~170–180 từ/phút,
gần như không nghỉ), nên âm thanh có ba việc: giữ mạch dưới lời, làm cho phim câm "có tiếng" một cách kín đáo, và **mang toàn bộ cao trào**.

## 1. Nhạc đi theo cấu trúc của phim (đọc `plan/STORY.md` mục Nhịp trước)
| Đoạn | Nhạc |
|---|---|
| Mở đầu (hook) | Vào ngay bằng một cú hit hoặc nốt trầm giữ, thưa, có nhịp ngầm; căng dần tới câu hỏi của phim. |
| **Khoảng nhạc cao trào** (không lời, mốc ghi trong STORY.md) | Đoạn **có trống / cú hit rõ, dâng dần**, đủ 5–9 cú hit dùng được; cú hit lớn nhất nằm ở 65–100% cuối khoảng; sau cú đó **im hẳn 0,3–0,8 s** (`music_db` về −60) rồi mới vào lại. Đây là chỗ duy nhất nhạc được to (`music_db` +2…+4). |
| Thẻ tên phim (ngay sau cú chốt) | Đuôi vang của cú hit hoặc một nốt giữ; không giai điệu mới. |
| Thân phim, phần giải thích | Nền thưa, ít giai điệu, dùng bản bỏ giai điệu dưới lời (`under_voice`), `music_db` −3…−6. Người xem đang đọc chữ và nghe số liệu. |
| Đoạn mất mát (dân bị dồn đi, thương vong) | Rút trống, còn dây / piano thưa; hoặc tắt nhạc hẳn 5–10 s, chỉ còn tiếng nền. Im lặng nặng hơn nhạc buồn. |
| Kết | Quay lại chất liệu của đoạn mở; cú kết thật của bài rơi đúng khung cuối (back-time). |

- Video ≤ 3 phút: một bài, dựng lại. Chọn bài có cả **đoạn thưa** lẫn **đoạn trống dày**, vì khoảng cao trào cắt từ đoạn dày của chính bài đó
  (đặt `in` sao cho cú hit lớn rơi gần cuối khoảng). `sound_probe --music` cho danh sách cú hit để tính.
- Kiểu nhạc hợp: cinematic tối giản, trống trầm (taiko / low percussion), dây giữ nốt, nhịp 70–100 BPM, giọng thứ. Tránh: hùng ca rực rỡ, nhạc có lời,
  EDM, nhạc "trailer" ồn ào suốt phim. Đề tài Việt Nam: tránh nhạc cụ dân tộc dùng kiểu trang trí; chỉ dùng khi kịch bản thật sự ở góc nhìn đó.
- Sau khi đặt nhạc: agent chính chạy `audio.py` rồi `tools/beats.py --from a --to b`. Nếu công cụ báo **không có nhịp rõ** ở khoảng cao trào,
  agent nhạc phải đổi đoạn / dời `in`, không để hình cắt bừa.

## 2. SFX theo loại hình (đọc `.tsx` trước, như skill chung)
- **Phim lưu trữ câm (`<Clip>`):** thêm tiếng nền của đúng thứ đang thấy, **nhỏ và hơi "cũ"** (`lp` 6–7 kHz, `gain` thấp, `"stage": "out"`): trực thăng UH-1
  (`align: "start"`, `loop_to` phủ trọn shot), xe xích, pháo bắn (mốc theo khung hình có chớp nòng: xem ảnh `check.py`), bước chân trên cỏ, gió rừng.
  Một tiếng chính mỗi shot; shot < 3 s dưới lời dày thì chỉ để tiếng nền chung. Không dựng cả một trận đánh bằng âm thanh trên một đoạn phim lính đi bộ.
- **Thẻ số liệu, trang tài liệu, bản đồ:** `stage: "dry"`. Mỗi mục hiện ra một tiếng rất nhẹ cùng một họ (tick giấy, gạch bút, dấu đóng nhẹ) ở đúng mốc `at`
  của mục đó trong `.tsx`; vệt tô vàng = tiếng bút dạ quang kéo (`align: "start"`, 0,6–0,9 s). Tối đa ~4 tiếng mỗi thẻ; thẻ thứ ba trở đi có thể bỏ bớt.
- **Thẻ gõ máy chữ (`<QuoteCard>`):** tiếng máy đánh chữ cơ, `loop_to` đúng khoảng `typeFrom → typeTo`, tắt gọn khi chữ dừng.
- **Băng trích dẫn / nhãn:** không tiếng, hoặc một tiếng "thở" rất nhỏ cho băng trích dẫn quan trọng nhất của đoạn.
- **Cụm cao trào (`<BeatMontage>`):** mỗi điểm cắt đã trùng một cú hit của nhạc → **không** thêm whoosh vào mọi điểm cắt. Chỉ thêm tiếng hiện thực to, ngắn
  cho 2–3 shot mạnh nhất (nổ, trực thăng lướt qua, loạt súng), `align: "peak"` trùng điểm cắt hoặc sự kiện trong shot; một riser `align: "end"` kết đúng cú chốt;
  cú chốt có lớp sub + `duck` 6. Sau cú chốt: im lặng thật (không đuôi vang dài đè lên câu đọc kế tiếp).
- **Cú đẩy vào tối (`<PushToBlack>`):** tiếng trầm dâng chậm suốt shot, tắt cùng lúc khung đen.
- **Chuyển cảnh thường (cắt theo câu):** không tiếng.

## 2b. Tiếng phải có không gian và có đuôi (lỗi "bật file rồi bấm dừng")
Một tiếng nổ ngoài thực địa rền, dội vào núi và tan vào gió trong 2–4 giây; trực thăng đến từ xa và đi xa dần. Tiếng bị sượng là do các lỗi sau, **cấm**:
1. **Không có tiếng nền (`amb`).** Thiếu lớp nền thì mỗi SFX hiện ra giữa khoảng trống rồi biến mất. `mix.json` bắt buộc có `amb` phủ kín phim:
   ngoài trời (gió, côn trùng, pháo rất xa) cho shot phim; một lớp ù / xè của máy chiếu rất nhỏ cho cả phim; `dry` cho thẻ. Kiểm `dur`, nối mảnh gối 1,5–2 s.
2. **`word_dodge: true`.** Bộ trộn băm tiếng theo từng chữ và chặt đuôi nổ ngay khi lời vào lại. Luôn `"options": {"word_dodge": false, "beat_snap": false}`.
3. **Cắt đuôi theo độ dài shot.** Tiếng **được phép tràn qua điểm cắt**: nổ, pháo, bom → không `trim` phần đuôi (hoặc `fo` 1,5–3 s), `"verb"` ngoài trời;
   máy bay, trực thăng, xe → `fi` 0,6–1,5 và `fo` 1,5–3 s, bắt đầu **trước** điểm cắt 0,3–1 s và tắt sau khi shot đã hết 1–2 s (J-cut / L-cut).
   Chỉ tiếng UI của thẻ mới ngắn và khô.
4. **Cú lớn một lớp.** Mỗi vụ nổ chính ≥ 2–3 lớp: cú đập (`align: "peak"`) + thân nổ đúng chất (đất, kho đạn, bom trải thảm) + **đuôi dội xa** (rền / echo núi,
   `align: "start"`, đặt trễ 0,15–0,4 s, `lp` 2–3 kHz, dài 3–5 s, `gain` thấp). Kho đạn nổ = nổ chính + chuỗi nổ phụ lẻ tẻ 3–6 s.
5. **`align: "peak"` ở sát đầu phim.** Đỉnh của file nằm sau đầu file; đặt `at` < thời gian tới đỉnh thì đầu tiếng bị cụt. Sự kiện đầu tiên ở ≥ 1,0 s hoặc dùng `align: "start"`.
6. **Một file dùng nhiều lần.** Tối đa 2 lần mỗi file; ba vụ nổ là ba tiếng khác nhau (khoảng cách, chất liệu khác nhau).
7. **Ghi SFX vào `plan/chapters/CNN.json`.** Đó là chỗ của dạng cũ: ghi vào `plan/sfx/CNN_k.json`.
`tools/pace.py` kiểm các mục 1, 2, 3, 4, 6, 7 và in ⚠.

## 3. Mức
- Lời đọc là chính: ngoài khoảng cao trào, mọi cảnh phải đạt chỉ số "lời rõ" của `sound_report.txt` mà không cần ngoại lệ.
- Khoảng cao trào được ghi là ngoại lệ có chủ ý (không lời), nổ / trống được phép lên sát trần.
- Phim cũ nghe "mỏng" là đúng chất: đừng đắp sub và stereo rộng cho tiếng của footage; để dành cho cú chốt.
