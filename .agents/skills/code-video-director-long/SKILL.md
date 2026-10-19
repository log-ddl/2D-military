---
name: code-video-director-long
description: Dựng video giải thích quân sự 2D dài (từ khoảng 4 phút, ví dụ 8–9 phút) từ voice trong pdoom-video, trong một phiên. Giữ chất lượng đều từ đầu đến cuối bằng kế hoạch toàn phim, vẽ vật một lần, dựng và kiểm theo từng chương, ghi trạng thái cuối mỗi chương. Video ngắn dùng code-video-director.
---

# Code Video Director: video dài

**Mọi nguyên tắc kể bằng hình, vẽ, cấu tạo, chiến thuật, chữ, tiếng, lệnh và API theo [code-video-director](../code-video-director/SKILL.md)** và các skill nó dẫn tới. Đọc skill đó trước. File này chỉ thêm cách tổ chức để video dài không tụt chất lượng ở các chương cuối, kể cả khi ngữ cảnh bị nén giữa chừng.

**Nguyên tắc:** điều gì cần nhớ suốt phim thì **ghi vào `docs/SHOT_PLAN.md`**, không dựa vào trí nhớ của phiên. Đầu mỗi chương đọc lại từ file đó.

## 1. Kế hoạch toàn phim
- Tạo project và mốc voice như director mục 8. Thay `docs/SHOT_PLAN.md` bằng [mẫu video dài](templates/SHOT_PLAN.md).
- Đọc toàn bộ `data/voice_map.md` (không đọc cả `transcript.json`). Viết **lập luận biên tập, hook** và **chia chương** theo ý (thường 1–2 phút một chương, ranh giới ở chỗ đổi câu hỏi hoặc đổi tình huống, không chia đều theo giây).
- Mỗi chương một dòng: mốc, câu hỏi người xem, cách kể chính (cấu tạo / chiến thuật / so sánh), góc máy và nơi chốn chủ đạo, nối với chương sau thế nào.
- Ghi **vật xuyên phim** và **quy ước hình** (hình nào đại diện cho ý nào, phe nào màu gì, hướng di chuyển của mỗi phe, nền của mỗi nơi).
- Chưa viết shot chi tiết cho mọi chương: chỉ làm khi tới chương đó.

## 2. Vẽ toàn bộ vật một lần
Vẽ mọi vật của cả phim (mọi góc nhìn sẽ dùng) và nền của mỗi nơi trước khi dựng chương nào, theo code-video-2d. Render một ảnh tất cả vật, duyệt, sửa. Sau đó giữ nguyên thiết kế; nếu buộc phải sửa vật đã dùng, ghi vào Shot plan và kiểm lại các chương đã xong có vật đó.

## 3. Dựng theo từng chương
Lặp cho chương 1, 2, 3…:
1. **Đọc lại** trong Shot plan: quy ước hình, vật xuyên phim, **trạng thái cuối chương trước**. Chỉ mở `_assets.ts`, `_state.ts`, `_cue.ts` khi cần; không đọc lại code các chương đã xong.
2. **Shot chi tiết** của chương này (cụm giải thích, shot, góc máy, cỡ cảnh) theo director mục 1–5; thỉnh thoảng dùng các góc gợi ý thêm ở director mục 3 để chương không đơn điệu. Chương phải bắt đầu đúng trạng thái cuối chương trước.
3. **Dựng** các scene của chương; thêm cue và state mới vào file chung.
4. **Kiểm** bằng sheet của riêng chương (`--from <đầu chương> --to <cuối chương> --n 24 --cols 4`) và sheet chỗ nối trong chương cùng chỗ nối với chương trước. Sửa theo director mục 7.
5. **Ghi trạng thái cuối chương** vào Shot plan: mỗi vật xuyên phim đang ở đâu, hướng nào, trạng thái gì; cảnh và góc máy cuối; lỗi còn lại.

Không quay lại sửa chương đã xong, trừ lỗi ở chỗ nối hoặc khi đổi vật dùng chung.

## 4. Kết thúc
- Sheet toàn phim (`--n 48`) và sheet `--cuts`: xem chỗ nối giữa các chương, nhịp chung, hướng màn hình và nền có nhất quán.
- Tiếng bắn, tiếng nổ cho cả phim theo director mục 8.
- Báo cáo theo chương: đã xong, lỗi còn lại, phần chưa kiểm được (chưa nghe voice).

## Tiết kiệm token
- Đọc `voice_map.md`; `transcript.json` chỉ để tra mốc một từ.
- Xem bằng sheet, không render still lẻ trừ khi soi chi tiết một khung.
- Sửa đúng đoạn cần sửa, không viết lại cả file.
