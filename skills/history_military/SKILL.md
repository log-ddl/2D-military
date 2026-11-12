---
name: history_military
description: Dựng phim tư liệu lịch sử quân sự từ kịch bản + voice bằng Remotion trên footage và tài liệu THẬT (phim lưu trữ, ảnh, trang sách gốc, bản đồ) kèm thẻ số liệu, trích dẫn, bản đồ; cắt theo câu, cao trào cắt theo nhịp nhạc; mọi khung đều ghi nguồn. Mỗi video một dự án trong projects/<id>/. Dùng khi người dùng đưa kịch bản / voice về một sự kiện, chiến dịch, nhân vật lịch sử quân sự và muốn video kiểu phim tài liệu (không phải mô phỏng 3D).
---

# Phim tư liệu lịch sử quân sự (footage thật + Remotion)

Khác `military` (dựng 2D/3D bằng code): ở đây **hình là tư liệu thật**, code chỉ làm chữ, thẻ, bản đồ và nhịp cắt.
Sức nặng của phim đến từ kỷ luật, không từ hiệu ứng: **một câu một hình, một điểm nhấn mỗi khung, bảng màu hẹp, nguồn ở mọi khung.**

## 1. Cấu trúc — ai được sửa gì

```
voice/                         voice gốc; voice đã chèn khoảng nghỉ `x.timed.mp3` (tools/voice_prep.py)
library/footage/dl/<mã>/       kho đệm cuộn phim dùng chung MỌI dự án: preview.mp4, sheet_NN.jpg, INDEX.md (máy sinh), NOTES.md (agent viết)
library/images/dl/docs/        PDF sách / báo cáo đã tải
skills/history_military/lib    thành phần dựng (`@skill/history_military/index`) — chỉ đọc khi làm video; xem CATALOG.md
skills/history_military/tools  src.py · pdf.py · satmap.py · voice_prep.py · beats.py · pace.py
projects/<id>/
  assets/                      footage, ảnh, trang sách (mã aNNN, ghi nguồn + giấy phép trong ASSETS.json)
  plan/STORY.md                lập luận, nhịp, bảng NGUỒN (agent chính)
  plan/chapters/C01.md         bảng shot của chương (agent chính) · C01.json (cảnh) · beats.json (beats.py sinh)
  src/scenes/C01S01.tsx …      mỗi file một CẢNH = một đoạn ý 20–45 s, chứa nhiều <Shot> nối tiếp
```
Không đọc hay chép code dự án khác. Không sửa file máy sinh (`.build/`, `plan/timeline.json`, `src/cues/index.ts`, `out/`, `INDEX.md` của cuộn phim).

## 2. Lệnh (chạy từ gốc repo; `T=skills/history_military/tools`)

| Bước | Lệnh | Kết quả |
|---|---|---|
| Nghe voice, chọn chỗ nghỉ | `.venv/bin/python $T/voice_prep.py voice/x.mp3` | từng câu + giây + khoảng lặng |
| Chèn khoảng nghỉ cho cao trào | `.venv/bin/python $T/voice_prep.py voice/x.mp3 --script voice/x.md` (tự tìm dấu `[… 10s]` trong kịch bản) hoặc `--gap 71.0:10.5 --gap 412:6` | `voice/x.timed.mp3` + các khoảng nhạc (giây mới) |
| Khởi tạo | `python3 core/tools/new.py <id> voice/x.timed.mp3 --skill history_military --fps 24` | khuôn `projects/<id>/` |
| Mốc từ | `.venv/bin/python core/tools/asr.py <id>` | `plan/voice_map.md`, `transcript.json` |
| Tìm nguồn | `python3 $T/src.py search "q1" "q2" [--kind film\|text\|image]` | mã archive.org / file Commons + giấy phép |
| Mục lục cuộn phim | `python3 $T/src.py index <mã> [<mã>…]` | `library/footage/dl/<mã>/sheet_*.jpg` + `INDEX.md` |
| Lấy đoạn phim | `python3 $T/src.py clip <id> <mã> 170.8:6 95.2:4 --note "…"` | footage `aNNN` + dòng `<Clip … in={…}>` |
| Sách / báo cáo | `python3 $T/src.py text <mã>` → `python3 $T/pdf.py find <pdf> "cụm từ"` → `pdf.py quote <id> <pdf> <trang> "cụm đầu" "cụm cuối"` · `pdf.py page <id> <pdf> <trang>` | trang `aNNN` + đoạn `<DocPage …>` có toạ độ dòng |
| Ảnh | `python3 $T/src.py image <id> "File:… .jpg"` | ảnh `aNNN` (chặn giấy phép không mở) |
| Ảnh vệ tinh | `python3 $T/satmap.py <id> --center lon,lat --km 60` | ảnh `aNNN` + `bbox`, `size` cho `<SatMap>` |
| Ráp + kiểm kiểu | `python3 core/tools/build.py <id> [--strict]` | `.build/` |
| Kiểm cảnh | `python3 core/tools/check.py <id> --scene C01S02,C01S03` · `--from 40 --to 60` | ảnh `out/checks/…` |
| Âm thanh | `.venv/bin/python core/tools/audio.py <id>` | nhạc + SFX đã trộn |
| Nhịp cao trào | `.venv/bin/python $T/beats.py <id> --from a --to b` | cú hit + `cuts` → `plan/beats.json` |
| Kiểm nhịp + nguồn | `python3 $T/pace.py <id>` | thống kê shot, cảnh báo ⚠ |
| Xem / xuất | `python3 core/tools/render.py <id> --to 60` · `--studio` · không cờ = cả phim | `out/…mp4` |

Video dài (từ ~8 phút): đọc thêm `skills/long-video/SKILL.md`, làm theo chương; bảng NGUỒN trong STORY.md khoá trước khi chia chương.

## 3. Quy trình

Đầu vào: **kịch bản (chữ) + voice**. Chỉ có kịch bản thì làm trước Bước 1 ý 3–4 và Bước 2 (tìm nguồn không cần mốc giây), phần còn lại chờ voice.
Người dùng nên đưa kèm danh sách tài liệu đã dùng để viết kịch bản; có thì bước tìm nguồn nhanh và đúng hơn nhiều.

### Bước 0 — Voice và chỗ thở (trước khi tạo dự án)
1. `voice_prep.py voice/x.mp3`: đọc từng câu, đối chiếu kịch bản. Số liệu, tên riêng lấy theo **kịch bản chữ**, không theo máy nghe.
2. Chọn chỗ chèn khoảng nghỉ chỉ có nhạc (mục 5): sau câu nêu câu hỏi của phim (9–12 s, cho cụm cao trào + thẻ tên), đỉnh mỗi chương lớn (4–7 s).
   Video ≤ 3 phút: thường một chỗ. Kịch bản đã có dấu `[… <số>s]` (vd `[NHẠC ~10s]`, ngôn ngữ nào cũng được) thì chạy `--script <kịch bản>`: công cụ tự tìm chỗ và in câu đứng trước để kiểm;
   kịch bản không có dấu thì tự chọn và chạy `--gap …`. Kết quả: `voice/x.timed.mp3`. Voice đã có sẵn khoảng lặng dài đúng chỗ thì không chèn.
3. `new.py <id> voice/x.timed.mp3 --skill history_military --fps 24`, rồi `asr.py <id>`.

### Bước 1 — Agent chính đọc kịch bản và lập khung
1. Đọc `plan/voice_map.md`. Viết `plan/STORY.md` (template): câu hỏi của phim, các chương, đường cảm xúc, **vị trí các khoảng nhạc**.
2. Chia cảnh trong `plan/chapters/C01.json`: mỗi cảnh một đoạn ý 20–45 s, `"transition": "cut"`, cảnh liền nhau, ranh cảnh trùng đầu câu.
3. Lập **danh sách thứ cần có hình** từ kịch bản, theo câu:
   - con số → nhãn (1–2 số) hoặc thẻ số liệu (≥ 3 số, so sánh, tỉ lệ) · trích dẫn → băng (ngắn) hoặc thẻ gõ máy chữ (dài)
   - tên người, đơn vị, ngày → nhãn góc dưới · địa danh, hướng, khoảng cách → bản đồ
   - "theo hồ sơ…", "ông X viết…" → trang tài liệu gốc tô vàng · còn lại → phim / ảnh tư liệu đúng người, đúng nơi, đúng năm
4. Từ danh sách đó rút ra **nhu cầu nguồn**: sự kiện, đơn vị, địa điểm, năm, loại hình (hành quân, trực thăng, hầm, dân…) và các sách / báo cáo được kịch bản dẫn.
5. **Gọi ngay 1 subagent nhạc nền chạy nền** (`skills/sound-design/SKILL.md` mục 4 Pha 1 + `SOUND.md` của skill này; đưa nó danh sách khoảng nhạc ở ý 1).

### Bước 2 — Tìm nguồn theo CHỦ ĐỀ, lập mục lục (song song bằng subagent)
Gần nửa phim sẽ lấy từ 4–6 cuộn phim cắt nhỏ rải khắp nơi. Tìm cuộn phủ được chủ đề trước, chia cho từng câu sau.
**Một cuộn phim không làm nên một bộ phim:** cùng người quay, cùng màu, cùng góc nhìn (thường là góc tuyên truyền của một quân chủng)
lặp suốt phim là dấu hiệu "máy làm" rõ nhất. Bảng NGUỒN phải đủ **bốn nhóm** trước khi lập bảng shot:

| Nhóm | Là gì | Tối thiểu (video ≤ 3 phút) |
|---|---|---|
| A. Toàn cảnh, hành động | hành quân, pháo, máy bay, căn cứ nhìn từ xa | 2 cuộn khác nguồn (khác quân chủng / khác loạt phim) |
| B. **Con người cận cảnh** | gương mặt lính trong hào, thương binh, dân; ảnh chân dung nhân vật được nhắc tên | 1 cuộn hoặc 3–5 ảnh (`--kind image`: NARA, USMC, AWM trên Commons) |
| C. **Phía bên kia** | phim / ảnh / văn bản của đối phương, hoặc tài liệu Mỹ nói về họ (ảnh tù binh, vũ khí thu được, bản dịch tài liệu thu được) | 1 nguồn; không có nguồn mở thì nêu góc đó bằng trang tài liệu / trích dẫn và ghi rõ ở bảng "chỗ thiếu" |
| D. Vật chứng giấy | trang sách / báo cáo, điện văn, bản đồ gốc, ảnh văn bản | 2 trang + 1 bản đồ gốc |

Không cuộn nào được chiếm quá 45% thời lượng phim tư liệu (`pace.py` đo). Đã lập mục lục 3 cuộn mà bảng shot chỉ dùng 1 là làm sai:
quay lại chia shot cho các cuộn còn lại.
1. Agent chính `src.py search` nhiều từ khoá một lượt (tên chiến dịch, đơn vị, địa danh, năm, tên loạt phim: "Staff Film Report", "Big Picture",
   "Your Army Reports"…; `--kind text` cho sử chính thức, báo cáo; `--kind image` cho ảnh). Chỉ lấy mục `OK` (phạm vi công cộng / giấy phép mở);
   mục `?` phải tự xác minh quyền dùng, không chắc thì bỏ.
2. `src.py index <mã>…` cho 4–8 cuộn ứng viên. **Mỗi cuộn giao 1 subagent** (chạy song song, tối đa ~6): xem mọi `sheet_NN.jpg`, viết
   `library/footage/dl/<mã>/NOTES.md`, mỗi dòng `giây đầu–cuối | thấy gì (chủ thể, hành động, cỡ cảnh) | năm / nơi / đơn vị nếu phim nói rõ | dùng được cho ý nào`.
   Cuộn đã có `NOTES.md` từ dự án trước thì dùng lại, không làm lại.
3. Sách / báo cáo: `src.py text <mã>` → `pdf.py find` đúng câu kịch bản dẫn → ghi số trang vào bảng NGUỒN. Không tìm ra nguyên văn thì
   **không dựng trang tài liệu giả**: chuyển câu đó sang băng trích dẫn ghi nguồn, hoặc báo người dùng.
4. Ghi bảng NGUỒN trong `STORY.md`: mã, tên, năm, nơi giữ, giấy phép, dùng cho chương nào, **khuôn dòng nguồn** sẽ in trên hình.
5. Tìm theo **nội dung hình**, không chỉ theo tên sự kiện: ngoài "khe sanh 1968" còn "marines trench", "wounded medevac", "C-130 airdrop",
   "B-52 arc light", "prisoner interrogation", tên đơn vị, tên loạt phim. Mỗi nhóm A–D ít nhất 2 lượt tìm với từ khoá khác nhau.
6. Câu nào không có hình đúng sự kiện: dùng hình gần nhất **và nói thật trong dòng nguồn** ("phim huấn luyện, quay ở Mỹ", "vị trí minh hoạ",
   "cảnh cùng đơn vị, 1966"). Thiếu quá nhiều (> ~20% thời lượng) thì dừng, báo người dùng danh sách chỗ thiếu.

### Bước 3 — Bảng shot (agent chính; chỗ dừng để người dùng duyệt nếu họ muốn)
Viết `plan/chapters/C01.md` theo template: **mỗi dòng một shot** = mốc `from–to` (đầu câu / vế, lấy ở `voice_map.md`), câu đọc, loại hình,
tài sản (cuộn + giây, hoặc trang, ảnh), chữ trên hình + mốc từng mục, dòng nguồn. Theo luật nhịp mục 4.
Sau đó lấy tài sản một lượt: `src.py clip` (gộp mọi đoạn của một cuộn vào một lệnh), `pdf.py quote/page`, `src.py image`, `satmap.py`.
Điền mã `aNNN` vào bảng shot.

### Bước 4 — Subagent dựng cảnh song song
Chia cảnh thành nhóm 2–4 cảnh, tối đa ~6 subagent cùng lúc. Mỗi prompt BẮT BUỘC có:
1. Đọc: SKILL.md này, `CATALOG.md`, `plan/STORY.md`, `plan/chapters/C01.md` + `.json`, `plan/voice_map.md`, `assets/ASSETS.json`.
2. Chỉ tạo/sửa `src/scenes/C01Sxx.tsx` của nhóm mình; không gọi `build.py`; không tải thêm nguồn (thiếu thì báo lại).
3. Khuôn file: `const C01Sxx: React.FC = () => (<> <Shot from={…} to={…} credit="…">…</Shot> … </>); export default C01Sxx;`
   Mốc `from`/`to`/`at` là **số viết thẳng** theo giây voice tuyệt đối. Shot nối liền nhau, phủ kín cảnh. Tài sản viết `asset('aNNN')` ngay trong cảnh.
4. Chỉ dùng thành phần của `@skill/history_military/index`; **cấm tự viết chữ, màu, font, khung riêng** trong cảnh.
5. **Tự kiểm bằng mắt AI Vision (bắt buộc soi kỹ, cấm xem lướt):** chạy `python3 core/tools/check.py <id> --scene C01Sxx,C01Syy` → mở ảnh PNG đọc từng ô: (a) **đọc rà toàn bộ chữ trên hình** (tiêu đề, thẻ số liệu, nhãn dưới, dòng nguồn, chú thích bản đồ) phải trùng 100% ngôn ngữ `voice` (`plan/transcript.json`, chỉ trừ đoạn nguyên văn tài liệu gốc in kèm bản dịch), không tràn hộp / không đè mặt người; (b) vệt tô vàng nằm đúng dòng và **chữ gốc của trang sách đọc được**, băng dịch đúng nội dung đoạn tô; (c) nhãn bản đồ nằm trong khung và không dính nhau (điểm cách nhau < ~120 px thì phóng to hoặc tách shot; chú thích phụ đặt `minor`); (d) con số trong thẻ không chồng nhau, dòng nguồn có ở mọi shot. Báo lại mốc các sự kiện hình (nổ, trực thăng, xe chạy) cho SFX.

### Bước 5 — Cao trào theo nhịp, SFX, kiểm, xuất
1. Khi `plan/mix.json` xong: `audio.py <id>` → `beats.py <id> --from a --to b` cho từng khoảng nhạc → chép `cuts` vào `<BeatMontage>` của cảnh đó
   (mục 5). Nhạc đổi thì chạy lại.
2. SFX: tối đa 4 subagent theo `skills/sound-design/SKILL.md` Pha 2 + `SOUND.md`, sau khi có `.tsx`.
3. `build.py --strict` → `pace.py <id>` (xử lý hết ⚠) → `check.py <id>` → `render.py <id> --to 60` xem chuyển động thật → xuất cả phim.

## 4. Luật nhịp (phần có lời đọc)
- **Cắt theo câu:** mỗi shot một câu hoặc một vế, điểm cắt nằm ở đầu câu / chỗ nghỉ (lệch ≤ 0,3 s). Trung vị 4–6 s; 8–16 điểm cắt mỗi phút.
- **Chỉ cắt thẳng.** Không fade, không wipe, không trượt giữa các shot. Chuyển động nằm trong thẻ (mục hiện dần) và trong cú đẩy máy rất chậm.
- Shot phim / ảnh ≤ 10 s; câu dài thì đổi hình ở vế câu. Thẻ số liệu 7–9 s, bản đồ 6–8 s, trang tài liệu 6–8 s, thẻ chữ đen 2–4 s (thẻ gõ máy chữ theo độ dài câu trích).
- **Không lặp một loại hình quá 3 shot liền** (trừ phim tư liệu, tối đa ~5). Sau 3–5 shot phim phải có một thẻ / tài liệu / bản đồ làm điểm tựa.
- Tỉ lệ thời lượng tham chiếu: phim + ảnh 55–65% · trang tài liệu ~10% · thẻ số liệu ~10% · bản đồ ~10% · thẻ đen ≤ 10%.
- Cùng một cuộn phim được dùng lại nhiều lần, nhưng **không dùng lại cùng một đoạn** trong vòng 2 phút, và không quá 2 lần cả phim.
- Shot liền nhau lấy từ **cuộn khác nhau** khi có thể; không quá 3 shot liền từ cùng một cuộn (trừ cụm cao trào).
- Mở đầu (hook) 60–90 s: sự kiện + con số + một trích dẫn + nghịch lý / câu hỏi → cụm cao trào → thẻ tên phim. Kết phim quay lại đúng hình ảnh mở đầu.

### 4b. Phân tầng nhịp (bắt buộc với phim từ ~4 phút; phim ngắn áp dụng phần "khoảng lặng" nếu kịch bản có chỗ nặng)
Cắt 4 giây một shot và 6 giây một dòng chữ suốt 40 phút làm người xem kiệt sức. Nhịp phải đổi theo loại đoạn:

| Loại đoạn | Shot | Chữ trên hình | Âm thanh |
|---|---|---|---|
| Mở đầu, dồn dập | 3–4 s | dày (số, trích dẫn) | nhạc căng |
| Giải thích (phần lớn phim) | 5–7 s | vừa: không quá 1 trong 2 shot có chữ | nhạc thưa dưới lời |
| Chứng cứ (trang tài liệu, thẻ số) | 7–9 s | một thứ, đọc kịp | gần như chỉ lời |
| **Khoảng lặng có chủ đích** | 1–3 shot dài 6–10 s, tổng 12–20 s | **không chữ nào** ngoài dòng nguồn | không nhạc hoặc một nốt giữ; chỉ tiếng nền + tiếng của hình (gió, xích xe, mưa) |
| Cao trào theo nhịp | 0,5–2,5 s | tối đa một con số | chỉ nhạc + SFX |

- Khoảng lặng đặt sau thông tin nặng nhất của chương (thương vong, làng bị xoá, lệnh rút), mỗi 3–4 phút một lần. Voice không có chỗ nghỉ thì chèn bằng
  dấu `[LẶNG 15s]` trong kịch bản (`voice_prep.py --script`), ghi vào STORY.md cùng bảng với khoảng nhạc, cột "kết bằng" ghi `lặng`.
- Hình cho khoảng lặng: shot dài, ít chuyển động, **có người** (gương mặt, dáng ngồi, hàng người đi) hoặc cảnh sau trận; `<Clip zoom={[1.02, 1.05]}>`.
- Cả phim: thời lượng có chữ trên hình ≤ 50% (`pace.py` đo). Băng trích dẫn tối đa ~1 mỗi 45 s.

### 4c. Phim dài 30–40 phút: ngân sách tư liệu và cách chia
- Tính trước khi tìm nguồn: 40 phút ≈ **450–550 shot** → cần khoảng **15–20 cuộn phim** đã lập mục lục (mỗi cuộn cho 15–30 đoạn dùng được),
  **60–100 ảnh**, **15–25 trang tài liệu**, **10–15 bản đồ**. Ít hơn một nửa mức này thì báo người dùng trước khi dựng: hoặc bổ sung nguồn, hoặc rút ngắn phim.
- Chia theo `skills/long-video/SKILL.md`: chương 4–6 phút; bảng NGUỒN và bảng "đoạn đã dùng" (cuộn + giây) là của **cả phim**, mỗi chương ghi vào đó
  khi lấy đoạn để chương sau không lấy trùng. Một đoạn phim chỉ dùng một lần; một cuộn không quá ~12% thời lượng phim tư liệu của cả phim.
- Mỗi chương một bộ nguồn chủ đạo riêng (đổi cuộn, đổi tông ảnh, đổi loại vật chứng) để 40 phút không cùng một màu; chạy `pace.py` theo từng chương.
- Lập mục lục cuộn song song (mỗi cuộn một subagent) ngay sau khi có kịch bản, không chờ voice.
- Xuất: `render.py` vốn đã xuất **từng chương thành phần riêng, mỗi phần một Chrome mới, rồi ghép bằng ffmpeg** (`--resume` giữ phần đã xong), nên không
  có chuyện 60.000 khung trong một tiến trình. Việc cần làm là giữ chương ≤ ~6 phút và xuất thử từng chương (`--chapter CNN`) trước khi xuất cả phim.
- Mỗi ~3 phút một cụm cao trào hoặc một khoảng lặng, không dùng cùng một kiểu hai lần liền nhau.

## 5. Cao trào: cắt theo nhịp nhạc (nâng cấp so với `military`)
- Cao trào **chỉ có nhạc + SFX, không lời** (khoảng nghỉ đã chèn ở Bước 0), hoặc nằm dưới một câu rất ngắn. Phần có lời tuyệt đối không cắt theo nhạc.
- Agent nhạc đặt vào khoảng đó đoạn nhạc **có trống / cú hit rõ và dâng dần**, kết bằng một cú hit lớn rồi **im hẳn 0,3–0,8 s** trước khi lời đọc vào lại.
- `beats.py` đo cú hit thật của nhạc đã đặt và đề xuất `cuts` dồn nhịp: shot đầu dài (2–3 phách), ngắn dần, shot cuối 0,5–0,8 s, **cú chốt trùng cú hit mạnh nhất**.
  Được chỉnh tay `cuts` nhưng mỗi mốc phải trùng một cú hit trong danh sách (lệch ≤ 0,05 s).
- Nội dung cụm: 5–9 shot **điểm lại / báo trước** những gì phim sẽ nói (hành động mạnh nhất của mỗi cuộn, một bản đồ, một trang tài liệu, một con số), xen
  loại hình và hướng chuyển động; shot liền nhau tương phản (toàn ↔ cận, tối ↔ sáng, phim ↔ giấy). Không chữ dài: tối đa một con số lớn mỗi shot.
- Sau cú chốt: thẻ tên phim (mở đầu) hoặc khung đen / thẻ chuyển đoạn (giữa phim) bắt đầu **đúng mốc cú chốt**.
- Mỗi cụm chỉ dùng một lần mỗi ~3 phút; nhiều hơn thì mất tác dụng.

## 6. Luật nguồn và sự thật (bắt buộc)
- **Mọi shot có dòng nguồn** (`<Shot credit>`; thẻ số liệu dùng `<CardFooter source>`), trừ thẻ chữ nền đen. Khuôn: `mô tả, thời gian · Nguồn/Ảnh: nơi giữ + mã`.
- Chỉ dùng nguồn phạm vi công cộng hoặc giấy phép mở (CC BY / BY-SA ghi tên tác giả). Không lấy phim truyện, phim tài liệu thương mại, ảnh báo chí còn bản quyền.
- Hình phải **đúng điều câu đang nói** ở mức ghi được trong dòng nguồn. Hình minh hoạ gần đúng thì ghi rõ là minh hoạ; không để người xem hiểu nhầm là cảnh thật của sự kiện.
- Số liệu, tên riêng, trích dẫn trên hình chép từ **kịch bản chữ** và phải khớp tài liệu gốc. Thấy kịch bản lệch tài liệu thì báo người dùng, không tự sửa nội dung.
- Trích dẫn dịch: câu tiếng Việt lớn + nguyên văn tiếng Anh nhỏ. Không bịa nguyên văn.
- **Dấu ngoặc kép chỉ dành cho lời thật.** `<QuoteBand>` / `<QuoteCard>` chỉ dùng cho câu một người đã nói / một văn bản đã viết, có tên nguồn ở `sub`.
  Lời dẫn của kịch bản, ý tóm tắt, câu chuyển đoạn **không** được đặt trong ngoặc kép hay trong băng trích dẫn (dùng `<LowerLabel>` hoặc để hình không chữ).
- **Băng dịch trên trang tài liệu phải là bản dịch của chính đoạn được tô vàng.** Trang nói "…lo Khe Sanh thành một Điện Biên Phủ của Mỹ" thì băng dịch đúng câu đó;
  không được gắn lời của nhân vật khác (ví dụ câu nói của tổng thống) lên một trang không chứa câu ấy. Câu nói không tìm ra văn bản gốc → băng trích dẫn trên ảnh
  nhân vật, `sub` ghi "theo <nguồn kể lại>".
- Ảnh vệ tinh là mặt đất ngày nay: chỉ để chỉ vị trí. Toạ độ điểm, tuyến lấy từ nguồn tra được; ước lượng thì ghi "vị trí minh hoạ".
- Ngôn ngữ chữ trên hình trùng ngôn ngữ voice. Không gắn logo / tên kênh nào ngoài của người dùng (`CardFooter brand`, lấy tên ở `library/brand/brand.json`).

## 6b. Chống "chất máy" (đã nằm trong lib, đừng tắt; đây là lý do)
- **Một cuộn phim chung:** `<Shot>` tự phủ `<FilmLook>` (hạt đổi từng khung, xước, nhấp nháy, mép tối) lên CẢ footage lẫn thẻ, chữ, bản đồ, để đồ hoạ
  không nổi lên như nhãn dán trên phim 16mm. Không dựng thẻ ngoài `<Shot>`.
- **Máy có người cầm:** `Clip`, `Photo`, `DocPage`, `SatMap` đẩy theo đường vào chậm – ra chậm, trôi và thở nhẹ theo nhiễu, khác nhau từng shot. Đừng thay bằng
  nội suy tuyến tính tự viết. Đổi hướng đẩy giữa các shot liền nhau (`zoom={[1.1, 1.04]}` là lùi ra).
- **Trang tài liệu là vật chứng:** nằm trên mặt bàn tối, máy đẩy từ toàn trang vào đoạn văn, chữ gốc đọc được, vệt dạ quang trong suốt. Shot ≥ 6 s.
- **Chữ:** chữ hẹp không chân cho tiêu đề, chữ khuôn tô (stencil) cho chip / nhãn chương, chữ máy chữ cho số nhỏ và nguyên văn. Không thêm font khác trong cảnh.
- **Đa dạng hình** (mục 3 Bước 2) quan trọng hơn mọi hiệu ứng: gương mặt người, vật chứng giấy, phía bên kia.

## 7. Chữ trên hình
- Chữ **tóm tắt** câu đang đọc, không phải phụ đề: khoảng 1/4 số shot phim / ảnh có chữ. Con số được đọc lên thì gần như luôn lên hình.
- Mỗi mục trong thẻ hiện **đúng lúc lời đọc tới nó** (`at` = mốc từ trong `voice_map.md`, sớm hơn 0,1–0,2 s). Không hiện cả thẻ một lượt.
- Mỗi thẻ **một** điểm nhấn vàng (`hi`). Bảng màu chỉ có ở `theme.ts`; ba họ chữ: hẹp chữ hoa (tiêu đề, tên, số lớn), sans (trích dẫn, chú thích), mono (số nhỏ, nguyên văn).
- Băng trích dẫn ≤ ~55 ký tự; dài hơn thì rút bằng "…" hoặc dùng `<QuoteCard>`.

## 8. Âm thanh
Theo `skills/sound-design/SKILL.md` + `skills/history_military/SOUND.md`. Giọng đọc giữ nguyên bản (khoảng nghỉ chèn ở Bước 0 không đổi giọng).
Yêu cầu âm thanh của người dùng đứng trên mọi mặc định.
