# SPEC skill `military` — các quyết định quan trọng được quy định ra sao

Nguồn: `skills/military/SKILL.md`, `templates/STORY.md`, `templates/CHAPTER.md`, `SOUND.md`, `skills/sound-design/SKILL.md`.
Mỗi mục trả lời một câu hỏi người dựng phải quyết. Cột **Skill nói gì** chép ý thật trong skill; cột **Skill bỏ trống** là chỗ agent phải tự đoán.

---

## 0. Dòng chảy (một dòng)

voice → **A1** kịch bản + mỹ thuật + chia cảnh (đồng thời gọi agent nhạc) → **A2** mô hình → **B** dựng cảnh song song → **C** SFX song song + trộn → xuất.

---

## 1. Chia cảnh

| Câu hỏi | Skill nói gì | Skill bỏ trống |
|---|---|---|
| Ai chia | Agent chính, một mình (không xé cho subagent) | — |
| Cắt ở đâu | Cảnh liền mạch, `from` = `to` cảnh trước, phủ đúng voice | Cắt theo câu, theo ý hay theo hành động? Cảnh dài/ngắn tối thiểu–tối đa bao nhiêu giây? Bao nhiêu cảnh / phút? |
| 2D hay 3D | Mỗi cảnh thuần một loại. Sơ đồ, mặt cắt, bản đồ, đồ thị → 2D; khối, địa hình, quỹ đạo, quy mô → 3D. Xen kẽ theo nội dung | Tỉ lệ 2D/3D; khi nào một ý cần cả bản đồ lẫn cảnh thật |
| Góc máy | Không 2 cảnh liền cùng góc / bố cục; luân phiên ngang, trực diện, từ trên, 3/4, mặt cắt, POV | Ý nào thì góc nào (cận cho hành động, rộng cho bố trí…) |
| Ghi ra đâu | `C01.md` bảng: cảnh · mốc · 2D/3D · góc máy & diễn biến (khớp từ nào) · CUE · SFX 1–2 | — |
| Chuyển cảnh | `fade` mặc định; `slide`, `wipe`, `flip`, `clockWipe` | Khi nào dùng loại nào |

## 2. Mỹ thuật

| Câu hỏi | Skill nói gì | Skill bỏ trống |
|---|---|---|
| Mỹ thuật là gì | Ô trong `STORY.md`: không khí, thời đại, thời tiết; bảng màu 2D (nền, chủ thể, nhấn, ta/địch); màu + ánh sáng 3D (trời, nắng, exposure, sương, hậu kỳ) theo giờ; ngôn ngữ camera; kiểu bản đồ; chỗ gắn logo | Định nghĩa "đẹp/đúng" cho từng ô; cách suy từ kịch bản ra lựa chọn |
| Nguyên tắc | Mỗi video tự thiết kế, không khuôn chung; màu/ánh sáng nằm ở `src/design/` | — |
| Đồng bộ | Kích thước mét thật 1:1 chung cho 2D và 3D | **Bước soát tài sản với mỹ thuật**: mô hình, quân trang, vũ khí, cây cỏ, địa hình mặc định mang màu/chất liệu riêng; không có bước đối chiếu với bảng mỹ thuật trước khi dùng |
| Chữ | Mặc định không chữ; chỉ `Label/Callout/Measure3D` 1–3 từ / con số | — |

## 3. Mô hình

| Câu hỏi | Skill nói gì | Skill bỏ trống |
|---|---|---|
| Lấy ở đâu | Khí tài chính, đạo cụ cận → BlenderKit; lõi mổ xẻ / khối hiếm → tự dựng bằng `geom.ts`; địa hình rộng → code (`Terrain/Scatter/Water/Surface`) | Chọn giữa nhiều kết quả BlenderKit theo tiêu chí gì |
| Chuẩn hoá | Mũi +X, đáy Y=0, mét thật; hero 45–65k mặt, nền decimate; `--rig` khớp động; `--recolor` khi màu dân sự | — |
| Bộ binh | 1 phôi + preset màu (5 loại) + gói mocap; `speed = v / speed_mps`, lệch `phase` | Lính trong đơn vị khác nhau theo vị trí thế nào (công cụ chỉ cho đổi màu) |
| Thiếu công cụ | "Công cụ nào thiếu → tự viết trong `src/parts/`" | Không chuẩn cho đồ tự chế (hiệu ứng, thời tiết…), không cổng duyệt riêng → chất lượng tuỳ agent |
| Kiểm | `check.py --part` ảnh 4 góc: hướng +X, tỉ lệ, khớp, độ sáng khi mổ xẻ, logo | — |

## 4. Dựng cảnh & camera

| Câu hỏi | Skill nói gì | Skill bỏ trống |
|---|---|---|
| Camera | Luôn có chủ đích: lia theo chủ thể, kéo lùi mở đại cảnh, đẩy vào chi tiết. 3D mặc định `SplineCam` + đổi `lens` (28–35 mm rộng, 65–85 mm cận) + chống xuyên | — |
| Khung đầu | Cảnh 3D hiện sớm 0.2 s, chồng 0.4 s → khung đầu phải đầy đủ | — |
| Hiệu ứng | Dùng FX thư viện, không cầu trơn | — |
| Giao việc | ≤ 2 cảnh 3D / subagent, prompt gồm danh sách đọc, file được ghi, mẫu code, lời + CUE từ `C01.md` | — |

## 5. Thế nào là hình đạt

| Skill nói gì | Skill bỏ trống |
|---|---|
| Cảnh: sửa ≥ 1 vòng theo "bố cục, độ rõ chủ thể, khung trống, chữ đè, lỗi hình" trên 6 khung tĩnh. Mô hình: theo 4 góc. 2D: biên dạng đúng, 2–3 tông, viền, nền có chiều sâu | **Không có định nghĩa đạt.** "Rõ chủ thể" là rõ cỡ nào; hình có kể đúng lời đang nói không; có đúng mỹ thuật trong STORY không; có đúng yêu cầu người dùng không. Không có bước đối chiếu từng yêu cầu người dùng → cảnh → mốc giây trước khi xuất |

Ghi chú: ảnh 6 khung tĩnh đủ để xét bố cục, màu, chủ thể; chuyển động thì để Studio/xem bản xuất.

## 6. Nhạc

| Bước | Skill nói gì |
|---|---|
| Khi nào | Gọi agent nhạc ngay sau khi khoá STORY + C01; chạy nền song song A2/B |
| Đọc gì | STORY, C01.md, lời từng câu → chấm đường cảm xúc từng đoạn (hook / giải thích / cao trào / kết) |
| Chọn bài | Video ≤ ~3 phút: **một bài** dựng lại cho vừa. Thể loại: cinematic / orchestral hybrid, trống rõ, giọng thứ, 80–110 BPM; tránh có lời, EDM, giọng trưởng tươi. Không dùng lại bài của video trước |
| Tìm (Epidemic) | `SearchRecordings` với `term` tả không khí + lọc `vocals:false`, `bpm`, `duration`, `mood`; nghe thử bằng `sound_probe --music` xem cú hit mở, đoạn thưa, cú hit vào lại, cú kết thật |
| Tải | WAV 4 bản: FULL, DRUMS, BASS, INSTRUMENTS; ba bản sau ghép thành "bài bỏ giai điệu" dùng dưới lời (`under_voice`) |
| Dựng | Back-time: cú kết thật trùng cuối video, cao trào bài trùng cao trào hình; hook vào ngay bằng cú hit; hết hook nhạc khựng; chỉ cắt ở chỗ im hoặc đầu ô nhịp, theo cú hit đo được; tắt nhạc 0.5–2 s trước cú nổ lớn nhất; lời dày thì nhạc thưa; `music_db` −3…+2 dB |
| Nền (`amb`) | Mỗi không gian một lớp nhỏ, liền mạch; file ngắn thì nối mảnh gối 1.5–2 s |

## 7. SFX

| Bước | Skill nói gì |
|---|---|
| Khi nào | Sau khi có `.tsx`; ≤ 4 subagent, mỗi cái một cụm cảnh liền kề, ghi `plan/sfx/C01_k.json` |
| Đọc gì | Code cảnh `.tsx`, không đặt theo từ vựng lời đọc. Với từng cảnh: hình là loại gì (3D thật / mặt cắt / 2D / HUD) · mốc tức thời (`<Explosion at>`, `fireAt`, `bump`) · khoảng chuyển động (`prog(t,a,b)`) · máy quay xa/gần · lời đang nói gì |
| Lập bảng | "Khoảnh khắc âm thanh": cảnh · mốc hoặc khoảng · loại hình · mô tả tiếng (nguồn âm, chất liệu, khoảng cách, `align`, độ dài) — rồi mới tìm |
| Từ khoá | Tiếng Anh, **nguồn âm + hành động + khoảng cách/chất liệu**, không tả cảm xúc: "tank cannon shot distant", "metal armor impact heavy close", "water impact large splash" |
| Tìm & tải | Kho trước (`sound_lib.py search … --epidemic`), dùng lại chỉ khi **đúng chính xác** nguồn âm + chất liệu; thiếu thì `SearchSoundEffects` → `DownloadSoundEffect` (WAV) → `sound_lib.py add` → `sound_probe` xem `dur`, đỉnh, cụm tiếng |
| Đặt | `peak` chỉ cho va/nổ sắc; `start` cho mọi thứ bắt đầu chạy (động cơ, bước chân, cơ khí); `end` cho tiếng dẫn. Va lớn ≤ 3 lớp (va sắc + thân + trầm). Chuyển động dài phủ trọn khoảng (`loop_to`/`trim` + `fi/fo`). Một tiếng chính mỗi lúc; không lặp một file > 2–3 lần/chương; không whoosh mọi cú cắt; cảnh 2D không dùng nổ thật |
| Mức khởi điểm | súng/va thường 0.12–0.26 · cơ khí cận 0.32–0.42 · nổ chính 0.65–0.85 + `duck` 6–7 · nền `rms` 1.0–1.4 · UI bản đồ 0.07–0.11 |
| Theo thể loại quân sự | Súng cận: đanh + cơ cấu khoá nòng; xa: khô + dội địa hình. Thay đạn: tháo băng + lắp + kéo quy-lát khớp tay. Di chuyển: bước bốt + xóc trang bị, phủ khoảng đi. Xe xích: diesel trầm + xích kim loại. Nổ lớn: hút khí → nổ nhiều tầng → đuôi mảnh vụn |

## 8. Trộn & kiểm âm

| Mục | Ngưỡng đạt |
|---|---|
| Lời rõ | Mỗi cảnh trung vị ≥ 12 dB, bị lấp ≤ 25% (cảnh cố ý cho nổ lấn lời được giữ, ghi lý do) |
| Đúng mốc | Mọi nổ/bắn trong `.tsx` có tiếng, lệch ≤ 0.1 s (soát tay) và đỉnh lệch ≤ 150 ms (báo cáo) |
| Thiết bị | −14 LUFS, đỉnh ≤ −1 dBFS; loa điện thoại: nổ lớn vượt giọng ≥ +4 dB; mono mất ≤ 3 dB |
| Nhạc | Cắt ở chỗ im hoặc cú hit; cú kết thật ở cuối |

Âm thanh có ngưỡng đạt bằng số; **hình thì không** (mục 5).

---

## 9. Chỗ skill bỏ trống (gom lại)

| # | Chỗ trống | Hệ quả |
|---|---|---|
| 1 | Không định nghĩa **hình đạt** (rõ chủ thể cỡ nào, kể đúng lời chưa, đúng mỹ thuật chưa) | Mỗi agent tự chấm theo cảm nhận |
| 2 | Không có **checklist yêu cầu người dùng → cảnh → mốc giây** để đối chiếu trước khi xuất | "Làm đúng yêu cầu chưa" tuỳ agent nhớ |
| 3 | **Chia cảnh** không có quy tắc cắt (theo câu/ý/hành động), độ dài, mật độ, cách chọn góc theo ý | Nhịp phim và cách kể khác hẳn giữa hai agent |
| 4 | **Mỹ thuật** chỉ có danh sách ô cần điền; không có bước soát tài sản (mô hình, vũ khí, cây, địa hình mặc định) với mỹ thuật đã chốt | Tài sản mang màu/chất liệu trái bối cảnh lọt vào hình |
| 5 | Thiếu công cụ thì "tự viết", nhưng không có chuẩn hay cổng duyệt cho đồ tự chế | Hiệu ứng, thời tiết… chất lượng chênh lệch |
