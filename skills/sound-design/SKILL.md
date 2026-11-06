---
name: sound-design
description: Âm thanh cho video (mọi chủ đề) — chọn và dựng nhạc nền theo kịch bản, đặt SFX nhiều lớp khớp từng chuyển động/vụ nổ thực tế trong code cảnh .tsx, tiếng nền liền mạch, trộn và tự kiểm. Nhạc nền chạy song song khi có kịch bản; SFX chạy ngay sau khi cảnh đã dựng xong .tsx. Giọng đọc giữ nguyên bản. Dùng khi làm hoặc sửa âm thanh của một dự án trong projects/<id>/.
---

# Sound design

Công thức riêng của chủ đề (tiếng gì cho sự kiện gì, kiểu nhạc) nằm ở skill chính: `skills/<skill>/SOUND.md`. File này là cách làm chung.

## 0. Ba luật gốc
1. **Yêu cầu của người dùng đứng trên hết.** Prompt có nói về âm thanh ("nhạc buồn", "dùng bài này", "không nổ", "ít SFX", "nhạc to hơn")
   thì làm đúng như vậy, kể cả trái mặc định dưới đây. Ghi yêu cầu vào đầu `plan/mix.json` (`"_user"`) để các vòng sau không làm mất.
   Chỉnh mức cả bus theo yêu cầu bằng `"trim": {"music": dB, "sfx": dB}`.
2. **Giọng đọc giữ nguyên bản.** Không EQ, nén, lọc, đổi tốc độ. Muốn lời rõ thì nhạc / SFX nhường chỗ (bộ trộn tự khoét dải giọng).
3. Phạm vi: **nhạc + SFX + tiếng nền + tối ưu thiết bị** (một bản xuất nghe ổn cả tai nghe lẫn loa điện thoại).

## 1. Nguồn và license
Người dùng chọn nguồn trong prompt; ghi vào `plan/mix.json` → `"source"`:
- **`epidemic` (mặc định khi không nói gì):** nhạc và SFX lấy từ **Epidemic Sound qua MCP** trước (xem 1b), thiếu SFX thì bù bằng nguồn free.
  Cần MCP Epidemic đã kết nối; chưa kết nối thì báo người dùng, không tự đổi sang free.
- **`free`** (người dùng nói "dùng free", "nguồn miễn phí"…): kho `library/` → **Freesound CC0** → **Mixkit** (license Mixkit, không cần ghi tên). `sound_lib.py` chỉ trả về các nguồn này.
- Chỉ dùng nguồn tải tự động được; không vượt chặn bot của trang nào.
- File người dùng bỏ vào `library/` (ngoài `dl/`, `epidemic/`) và `assets/` là của họ: chỉ đọc. Agent chỉ ghi vào `library/*/dl/`, `library/*/epidemic/` và `INDEX.json`.
- `audio.py` ghi `.build/sound_credits.md` (nguồn từng file) và cảnh báo nếu dùng file trái nguồn đã chọn; nhắc người dùng khi xuất bản.

### 1b. Epidemic Sound (MCP) — khi `"source": "epidemic"`
File Epidemic thuộc gói trả phí của người dùng: **không chia sẻ ra ngoài**, kho để riêng `library/*/epidemic/`, khoá `es:`. Trong kho chỉ thấy khi search thêm `--epidemic`.
1. **Tìm nhạc:** `SearchRecordings` với `term` tả không khí + `filter` (`vocals: false`, `bpm`, `duration` ms, `moodSlugs`, `musicalKeys`).
   Mỗi kết quả có `bpm`, tag mood/genre, `stems` và `lqmp3Url` (nghe thử). Chưa tải gì: tải bản nghe thử về `/tmp` và
   `sound_probe.py <file> --music` để xem cấu trúc (cú hit mở, đoạn thưa, cú hit vào lại, cú kết) → chọn bài hợp đường cảm xúc.
   Cần thêm bài giống bài đã ưng: `SearchSimilarToRecording`.
2. **Tải bài đã chọn:** `DownloadRecording` (`fileType: WAV`) với `stemType` lần lượt **FULL, DRUMS, BASS, INSTRUMENTS** → mỗi link:
   `.venv/bin/python core/tools/sound_lib.py add es:<uuid>[:drums|:bass|:instruments] --music --stem <…> --title "…" --author "…" --url "<link>"`.
   MCP không tải riêng giai điệu, nhưng **trống + bass + instruments = bài bỏ giai điệu** → ghi vào `"under_voice"` của từng mảnh nhạc:
   lúc có lời bộ trộn tự dùng bản bỏ giai điệu, khoảng nghỉ trả bài đầy đủ; khi đó `"music_carve": 6`.
3. **Dựng:** như mục 2, cắt trên bài gốc (giữ được stem). `EditRecording` (Epidemic tự dựng theo độ dài) chỉ dùng khi cần một bản liền
   dài đúng X giây và chỉ ghim **một** vùng (`requiredRegionsAtOffsets` 1 phần tử, `maxResults: 1`, `forceDuration: true`) — ghim nhiều vùng
   thì MCP trả kết quả rỗng. Bản tự dựng không có stem. Tải bằng `PollEditRecordingJob` → `DownloadRecordingEdit` → `sound_lib.py add es-edit:<editId> …`.
4. **SFX:** `SearchSoundEffects` (`term` tả nguồn âm + hành động + chất liệu cụ thể của cảnh: `"turboprop aircraft flyby"`, `"water impact large splash"`, `"ejection seat rocket"`, `"metal gear fracture"`) → `DownloadSoundEffect` (`WAV`) →
   `sound_lib.py add es:<uuid> --title "…" --url "<link>"`. Có bộ thu thật cho xe quân sự, máy bay, vũ khí, cơ khí.
   **Không lấy tạm file khác bản chất có sẵn trong `library/`** (vd lấy tiếng đóng cửa sắt thay cho khớp tiếp dầu trên không, lấy búa đập kính thay cho nứt cánh quạt/bánh răng, lấy pháo nổ đất khô thay cho rơi xuống nước): kho chỉ dùng lại khi đúng chính xác nguồn âm và chất liệu cần; chưa có thì bắt buộc tìm và tải mới từ Epidemic.
5. Link tải là link ký, hết hạn sau ~2 ngày: tải ngay bằng `add`, đừng lưu link. `RETRY_LATER` → chờ `retryAfterSeconds` rồi gọi lại.
6. Chỉ tải những gì sẽ dùng (bài đã chọn + stem, SFX đã chọn). MCP không báo phí / hạn mức; tải thử nhiều thì hỏi người dùng trước.

```
python3 core/tools/sound_lib.py search "metal impact" [-n 8] [--max 3] [--online]     SFX
python3 core/tools/sound_lib.py search "dark cinematic" --music --online               nhạc
.venv/bin/python core/tools/sound_lib.py get <khoá_fs_hoặc_mk> --query "metal impact"  tải → đo → INDEX.json
.venv/bin/python core/tools/sound_probe.py <khoá_hoặc_file>                            dur, đỉnh @giây, cụm tiếng (segs), % trầm
.venv/bin/python core/tools/sound_probe.py <khoá_hoặc_file> --music [--grid 86-118]    tempo, giọng, CÚ HIT, cú kết, dB mỗi giây
.venv/bin/python core/tools/audio.py <id>                                              trộn + tự kiểm → .build/sound_report.txt
```
Không nghe được thì chọn theo dấu vết người nghe để lại: nhiều lượt tải **và** nhiều người chấm (★4.4 với 380 phiếu hơn ★4.9 với 6 phiếu);
mô tả của người thu (nguồn âm thật, thiết bị) gần với nghe nhất; loại clip có mô tả khác nguồn âm cần; **luôn chạy `sound_probe` xem `dur`, `peak` và `segs`** trước khi cắt đặt (để không chọn nhầm gói nhiều phát liên tiếp hoặc đặt sai `align`). Tìm bằng tiếng Anh, tả **nguồn âm + chất liệu** ("heavy metal door slam"), không tả cảm xúc chung chung.

## 1c. Đọc kịch bản và code cảnh `.tsx` trước khi chọn bất kỳ tiếng nào
Không có bảng tra "sự kiện X → file Y", và **tuyệt đối không đặt SFX mù theo từ vựng của lời đọc**.
- **Với nhạc nền (`mix.json`):** đọc `STORY.md`, `CNN.md`, lời đọc từng câu để dựng đường cảm xúc và không gian `stages` / `amb`.
- **Với SFX (`plan/sfx/CNN.json`):** bắt buộc đọc trực tiếp **code cảnh đã dựng `src/scenes/CNNSxx.tsx`** (cùng `CNN.md`, `CNN.voice.md`, `src/cues/CNN.ts`). Với từng cảnh xác định từ chính code `.tsx`:
  1. **Hình thực tế trên màn hình là gì?** Hiện thực 3D ngoài trời (`Terrain`, `Water`) · 3D giải phẫu/phòng kỹ thuật (`cutaway`, hangar, `studio`) · sơ đồ / mặt cắt / bản đồ 2D SVG · HUD. Âm thanh đi theo thứ đang hiện trên hình (vd lời nói *"shockwaves"* hay *"fatal crashes"* nhưng hình là sơ đồ 2D luồng khí trên cánh thì dùng tiếng gió/thiết kế nhẹ, **cấm** nổ đại bác hiện thực!).
  2. **Mốc tức thời chính xác trong `.tsx`:** quét mọi `<Explosion at={…}>`, `<MuzzleBlast at={…}>`, `<Blast2D …>`, `<Muzzle2D …>`, `bump(t, mốc, …)`, thời điểm chạm đất / phóng ghế / gãy vỡ. Trên hình nổ mấy lần, ở giây nào thì đặt đúng bấy nhiêu mốc (không lấy đại 1 mốc `CUE` của câu thoại làm lệch 1–4 s hoặc bỏ câm các vụ nổ phụ!).
  3. **Khoảng chuyển động kéo dài `[t_đầu, t_cuối]` trong `.tsx`:** đọc từ `prog(t, t_đầu, t_cuối)` (cất cánh, bay ngang, nghiêng động cơ, gập lá, xoay cánh, hạ bửng, xe lăn xích) để phủ tiếng đúng trọn khoảng `t_cuối - t_đầu`.
  4. **Máy quay ở đâu & lời đang nói gì lúc đó:** cận/xa, trong/ngoài khoang; câu đang mang ý giải thích chính thì tiếng nhỏ hoặc nhường lời.
Ghi thành bảng **khoảnh khắc âm thanh** (cảnh · mốc `at` hoặc khoảng `[t_đầu, t_cuối]` từ `.tsx` · loại hình · mô tả nguồn âm, chất liệu, khoảng cách, `align`). Chỉ sau đó mới tìm và tải đúng tiếng. Kiến thức đọc kịch bản từng thể loại: `skills/<skill>/SOUND.md`.

## 2. Nhạc nền — dựng theo kịch bản
1. **Đọc kịch bản trước:** chấm đường cảm xúc từng đoạn (hook / giải thích / cao trào / kết) từ `plan/STORY.md`. Nhạc đi theo đường đó.
2. **Video ≤ ~3 phút: MỘT bài, dựng lại cho vừa.** Ghép nhiều bài là thứ nghe hỗn tạp nhất. Video dài: một bài mỗi chương hoặc
   mỗi phần lớn, các bài cùng giọng hoặc họ hàng (cùng giọng, song song Dm↔F, cách quãng 5).
3. **Chọn bài có cấu trúc dùng được:** cú hit mở, đoạn thưa (break) cho phần giải thích, đoạn dày cho cao trào, **cú kết thật**.
   `sound_probe --music` cho ra cú hit, cú kết, dB mỗi giây → đọc ra intro / build / break / drop / outro.
4. **Back-time (khớp từ cuối lên):** đặt cú kết thật của bài trùng cuối video (đuôi vang ≤ 1 s), cao trào bài trùng cao trào hình,
   rồi bỏ/thêm đoạn ở giữa. Không kết bằng fade dở câu.
5. **Hook:** vào ngay bằng cú hit hoặc giữa câu nhạc đang căng (cú hit rơi ~0.1 s), không intro fade. Hết hook (câu hỏi lớn) nhạc
   **khựng** để đánh dấu sang phần giải thích.
6. **Chỉ cắt ở chỗ im có chủ ý** (khựng sau hook, im trước cú nổ lớn) hoặc đúng phách đầu ô nhịp, bỏ / thêm trọn câu 4 ô.
   Căn theo **cú hit đo được**, không tin lưới nhịp tự dò (hay bám phách phụ, lệch tới nửa phách).
7. **Tắt nhạc 0.5–2 s trước cú nổ lớn nhất**, để cú nổ có chỗ; nhạc vào lại ở cảnh sau.
8. Lời đọc dày thì nhạc thưa (bộ trộn tự khoét dải giọng; vẫn nên đặt đoạn break dưới phần lời dày nhất).
9. Mức: `music_db` chỉnh theo đoạn (−3…+2 dB); không đẩy nhạc to để "hay hơn".
10. **Không bao giờ đặt mảnh vượt quá độ dài file (`dur`):** bộ trộn `audio.py` **không tự loop** `music` hay `amb` — nếu `in + (to - from) > dur` của file gốc, phần dư bị đệm `0` (nhạc/nền đứt phựt sang im lặng!). Luôn kiểm `dur` trước khi đặt `from`/`to`.

## 3. SFX — khớp hình, liền mạch, không đứt đoạn
- **Mỗi lúc một tiếng chính.** Chỉ đặt tiếng ở các sự kiện thực sự diễn ra trên hình (va chạm/vụ nổ vật lý, cơ cấu vận hành chính, chuyển động phương tiện chủ đạo), không nhồi vào mọi chi tiết nhỏ.
- **Chọn đúng `align` theo bản chất âm thanh (CẤM để mặc định `"peak"` cho tiếng chuyển động/cơ khí):**
  - `"align": "peak"` *(mặc định của `audio.py`)* — **chỉ dùng cho cú va đập / nổ đầu sắc** (pháo bắn, nổ, đạn chạm giáp, sập khóa). Đỉnh rơi đúng mốc `at`.
  - `"align": "start"` — **bắt buộc ghi rõ cho mọi tiếng bắt đầu tại `at`**: cơ cấu thủy lực/cơ khí bắt đầu xoay, động cơ/cánh quạt chạy, máy bay bay ngang, còi báo, quét UI. *(Nếu quên ghi `"align": "start"` trên file có `peak` nằm giữa/cuối clip, `at - peak` sẽ kéo tiếng kêu sớm 1–3 s trước khi hình nhúc nhích rồi tắt ngấm ngay lúc hình mới chạy, thậm chí `t0 < 0` làm cụt mất đầu file và mất luôn `fi`!).*
  - `"align": "end"` — dùng cho **tiếng dẫn trước kết thúc đúng vào cú va** (whoosh lao tới đích, riser, hút khí trước nổ).
- **Cú va lớn tối đa 3 lớp:** lực va sắc (transient) + thân tiếng đúng chất liệu (nổ đất, nổ nước, xé kim loại…) + trầm/sub; thêm tiếng dẫn (`align: "end"`) và đuôi (mảnh vụn, lửa, bọt nước) khi đáng.
- **Tiếng kéo dài theo hành động `[t_đầu, t_cuối]` (cánh quạt, động cơ, xe xích, xoay cánh, hạ bửng, lửa cháy):**
  - Phải phủ trọn khoảng chuyển động `D = t_cuối - t_đầu` đọc từ `.tsx` — **cấm cắt mẩu 2–4 s rồi bỏ câm giữa lúc phương tiện vẫn đang bay/quay trên hình!**
  - Đặt `"at": t_đầu`, **bắt buộc `"align": "start"`**, dùng `"loop_to": D` (nếu đoạn nguồn ngắn hơn `D`, bộ trộn tự nối crossfade 0.3 s) hoặc `"trim": [a, a + D]` trên đoạn đều của file dài, kèm `"fi": 0.4…0.8`, `"fo": 0.6…1.2`.
  - Lưu ý mức khi dùng `"norm": "rms"`: bộ trộn đã chuẩn hoá sẵn về `-26 dB` × `0.6` (`-30.4 dB`), lọc `hp 90 Hz` và khoét thêm `-11 dB` khi có lời đọc → đặt **`"gain": 1.0…1.8`** để nghe rõ nền máy/xích (đặt `0.2–0.3` sẽ tụt xuống `-50 dB` mất sạch tiếng!). Nếu là chuyển động cơ khí cận cảnh dài 3–6 s cần nghe rõ chi tiết, để chế độ thường (không ghi `norm: "rms"`), `"align": "start"`, `"gain": 0.35…0.55`, `"fi": 0.4`, `"fo": 0.8`.
- **Cắt `trim: [a, b]` không làm khựng đầu hay cụt đuôi:** `audio.py` mặc định `fi: 0.0, fo: 0.12` (chỉ hợp với file nguyên bản đã tự tắt). Hễ dùng `trim` cắt vào vùng đang có tiếng (`a > 0` hoặc `b < dur` xem trên `segs` của `sound_probe`): **bắt buộc ghi `"fi": 0.05…0.4`** (nếu `a > 0`) và **`"fo": 0.4…1.2`** (nếu `b < dur`) để đuôi tắt tự nhiên, không bị chặt cụt. Với file gói nhiều tiếng rời (`segs` có nhiều cụm), phải `trim` lấy đúng 1 cụm cần dùng.
- **Giữ SFX mượt và đúng khung hình (`"word_dodge": false`):** khi SFX đã lấy mốc trực tiếp từ code `.tsx`, đặt `"options": {"word_dodge": false, "beat_snap": false}` trong `plan/mix.json` (bật `beat_snap: true` chỉ khi thật sự dùng `"snap": true` cho tiếng UI nhỏ). Khi tắt `word_dodge`, bộ trộn vẫn tự khoét mượt dải giọng theo câu (`venv` 300 ms) để lời rõ mà **không dịch lệch mốc nổ khỏi hình** và **không băm nhấp nhả 30 ms theo từng chữ** lên các tiếng SFX ngân dài.
- **Đa dạng nguồn âm, cấm xào công thức:** không lặp cùng 1 khoá SFX va chạm/cơ khí/nổ quá **2–3 lần trong một chương**; không copy-paste một bộ 2–3 lớp cố định cho mọi vụ nổ khắp phim. Mỗi bối cảnh (va đất, lao xuống nước, nổ trên không, gãy bánh răng, súng máy, tiếp dầu) phải có bộ file đúng vật lý riêng.
- **Không** whoosh ở mọi chỗ chuyển cảnh (1–2 chỗ đổi không gian lớn là đủ), **không** chuỗi beep, HUD tối đa ~3 lần một phút, cùng một họ tiếng.
- `"duck": 3…8` (dB) cho cú lớn: nhạc / nền tự hạ quanh cú đó. Lia stereo theo vị trí trên hình (`pan`, `[đầu, cuối]` cho vật bay qua), `pitch: [a, b]` cho doppler.
- **Tiếng nền (`"amb"`) liền mạch, không đứt quãng:** mỗi không gian một lớp nhỏ (gió biển, đồng trống, ù phòng kỹ thuật) đổi theo cảnh. **Bắt buộc kiểm `dur` của file `amb`:** vì `audio.py` không tự loop `amb`, nếu khoảng `[from, to]` cần phủ dài hơn `dur` của file gốc (vd cảnh 120 s mà file dài 30 s), **phải chia thành các mảnh nối tiếp gối chồng nhau 1.5–2 s** với `"fadeIn": 1.5, "fadeOut": 1.5` (vd `[0, 29.5]`, `[28.0, 57.5]`…), tuyệt đối không để `in + (to - from) > dur` làm đứt phựt nền sang im lặng!
- `"stages"`: không gian vang theo đoạn (`out` ngoài trời / `room` trong phòng / `dry` cho sơ đồ 2D sạch).

## 4. Tách hai pha: Agent Nhạc chạy sớm, Agent SFX chạy sau khi có `.tsx`
Không gộp làm SFX trước khi dựng cảnh (làm mù trước khi có `.tsx` chắc chắn lệch mốc hình và bỏ sót sự kiện):
- **Pha 1 — Agent Nhạc (`plan/mix.json`, chạy song song với dựng mô hình/cảnh):** gọi ngay sau khi khoá `plan/STORY.md` và `plan/chapters/CNN.md` + `.json`. Chỉ tạo/sửa `plan/mix.json` (`stages`, `music`, `music_db`, `amb`, `options`, `trim`) và tải nhạc/nền qua `sound_lib.py`. Kiểm kỹ mọi mảnh `music` và `amb` có `in + (to - from) ≤ dur`.
- **Pha 2 — Agent SFX (`plan/sfx/CNN.json`, chỉ chạy SAU KHI chương đã dựng xong `src/scenes/CNNSxx.tsx`):**
  - Video ngắn (1 chương): gọi ngay đầu Bước C sau khi các subagent Bước B viết xong `src/scenes/C01S*.tsx`.
  - Video dài (nhiều chương): gọi **cuốn chiếu theo chương** — hễ chương `CNN` vừa dựng đủ `src/scenes/CNNS*.tsx` thì gọi ngay 1 subagent SFX cho chương đó (chạy song song với subagent kiểm hình chương `CNN` và dựng hình các chương sau).

Prompt giao việc cho **Agent SFX** BẮT BUỘC có:
1. Đọc: file này, `skills/<skill>/SOUND.md`, `plan/STORY.md`, `plan/chapters/CNN.md` + `.json`, `plan/voice_map.md` (hoặc `CNN.voice.md`), `src/cues/CNN.ts`, **toàn bộ file `src/scenes/CNNS*.tsx` của chương được giao**, **yêu cầu âm thanh của người dùng** (chép nguyên văn), **nguồn: `epidemic` hay `free`** (mặc định `epidemic`).
2. Chỉ được tạo/sửa: `plan/sfx/CNN.json` của chương mình, `library/*/dl/` + `library/*/epidemic/` + `INDEX.json` (qua `sound_lib.py`). Không sửa `plan/mix.json`, `plan/chapters/`, `src/`, giọng; không gọi `build.py`, `render.py`.
3. Làm: đọc kỹ từng `src/scenes/CNNSxx.tsx` → lập bảng khoảnh khắc âm thanh khớp chính xác mốc nổ/va chạm (`<Explosion`, `<MuzzleBlast`, `bump`) và khoảng chuyển động `[t_đầu, t_cuối]` (`prog`) + loại khung hình (3D hiện thực / cắt lớp / 2D) → tìm đúng nguồn âm (Epidemic trước khi `"source": "epidemic"`, không lấy file sai chất liệu trong kho) → tải → `sound_probe` kiểm `dur`/`peak`/`segs` → viết `plan/sfx/CNN.json` đúng `align`, `loop_to`, `fi`/`fo`.
4. Báo lại: bảng đối chiếu từng cảnh (`CNNSxx`: sự kiện trong `.tsx` ↔ `at` / `loop_to` / khoá file + `align` trong JSON), danh sách file mới tải, xác nhận không lặp quá trần và không có lớp bị cắt cụt.

Khi cả `plan/mix.json` và mọi `plan/sfx/CNN.json` đã xong: chạy `.venv/bin/python core/tools/audio.py <id>` → đọc `.build/sound_report.txt` + kiểm chéo mục 5 → sửa ít nhất 1 vòng tới khi đạt hết. Nếu vòng kiểm hình sau đó sửa `.tsx` làm đổi mốc nổ/chuyển động của cảnh nào thì cập nhật lại `plan/sfx/CNN.json` cảnh đó rồi chạy lại `audio.py <id>`; sửa hình thuần `.tsx` không đổi mốc thì không cần chạy lại.

## 5. Tự kiểm — kiểm chéo `.tsx` + `.build/sound_report.txt` (đạt cả hai mới giao)
Lưu ý: `.build/sound_report.txt` chỉ đo mức tín hiệu và so đỉnh sóng với chính số `at` ghi trong JSON (hễ để `align: "peak"` thì báo cáo luôn in `+0 ms` kể cả khi lệch hình 3 giây hay gắn nhầm tiếng đại bác vào sơ đồ 2D!). Vì vậy bắt buộc kiểm đủ hai tầng:
- **Kiểm khớp hình & không đứt tiếng (rà trực tiếp `plan/mix.json` + `plan/sfx/*.json` với `src/scenes/*.tsx` và `INDEX.json`):**
  1. **Đủ và đúng mốc hình:** mọi `<Explosion`, `<MuzzleBlast`, `<Blast2D`, `<Muzzle2D` và cú va/phóng trong `.tsx` đều có sự kiện SFX lệch ≤ `0.1 s` (không bỏ câm các cú nổ phụ trong cùng cảnh).
  2. **Đúng `align` và không cụt đầu:** chỉ tiếng va sắc mới để `align: "peak"`; mọi tiếng cơ khí, thủy lực, động cơ, bay ngang, UI đều ghi rõ `"align": "start"` (hoặc `"end"` cho tiếng dẫn); không có lớp nào `at + off - lead < 0`.
  3. **Đủ độ dài & mượt đầu/đuôi:** chuyển động dài trên hình có `loop_to` / `trim` phủ hết `[t_đầu, t_cuối]`; mọi `trim: [a, b]` có `fi ≥ 0.05` (khi `a > 0`) và `fo ≥ 0.4` (khi `b < dur`); mọi mảnh `music` và `amb` thỏa `in + (to - from) ≤ dur` (không mảnh nào bị đệm `0` gây câm giữa chừng).
  4. **Đúng loại hình & không lặp nhàm:** cảnh 2D sơ đồ / cắt lớp kỹ thuật không gắn tiếng nổ chiến trường hiện thực; không có 1 khoá SFX cơ khí/va chạm lặp quá 2–3 lần mỗi chương.
- **Kiểm chỉ số trộn (`.build/sound_report.txt`):**
  - **Lời rõ:** mỗi cảnh trung vị ≥ 12 dB, bị lấp ≤ 25% (dải 1–4 kHz, khung 100 ms). Cảnh cố ý cho nổ lấn lời (cao trào) được giữ, ghi lý do trong báo cáo. Không đạt → hạ `gain` / cắt gọn đuôi bằng `trim` + `fo`, bớt lớp, giảm vang, hạ `music_db` đoạn đó.
  - **Đúng mốc:** đỉnh cú lớn lệch ≤ 150 ms (cú nhiều lớp thân tiếng đến sau cú va là bình thường).
  - **Thiết bị:** −14 LUFS, đỉnh ≤ −1 dBFS; loa điện thoại giả lập: nổ lớn vượt giọng ≥ +4 dB; gộp mono mất ≤ 3 dB. Nổ yếu trên điện thoại → chọn lớp có "thân" ở 300 Hz–3 kHz (nổ chát, mảnh vụn, va kim loại), đừng dựa vào sub; mono mất nhiều → bớt lia cực trái/phải ở lớp to.
  - **Nhạc:** chỗ cắt nằm trong khoảng im hoặc đúng cú hit; cú kết thật rơi ở cuối; không đổi giọng xa không có vật ngăn.

## 6. Định dạng
Đầy đủ ở docstring `core/tools/audio.py`. Tóm tắt (các khoá `<…>` dưới đây chỉ là tên minh hoạ — **không chép mã mẫu**, phải tìm đúng file của dự án):
```json
plan/mix.json
{"version": 2, "source": "epidemic", "_user": "yêu cầu âm thanh của người dùng (nguyên văn)",
 "stages": [[0, 25.7, "out"], [25.7, 76.0, "room"], [76.0, 104.8, "dry"]],
 "music": [{"key": "es:<uuid_music>", "in": 3.33, "from": 0, "to": 25.7, "gain": 0.65, "fadeIn": 0.05, "fadeOut": 0.6,
            "under_voice": ["es:<uuid_music>:drums", "es:<uuid_music>:bass", "es:<uuid_music>:instruments"]}],
 "music_carve": 6,
 "music_db": [[0, 0], [53.6, 0], [53.7, -60], [56.2, -60], [56.32, 0]],
 "amb": [{"key": "es:<uuid_wind_dur80s>", "in": 0, "from": 0, "to": 25.7, "gain": 0.35, "fadeIn": 0.8, "fadeOut": 0.8, "hp": 120}],
 "options": {"word_dodge": false, "beat_snap": false}, "trim": {"music": 0, "sfx": 0}, "volume": {"music": 1, "sfx": 1}}

plan/sfx/C01.json
{"sfx": [
  {"at": 0.0, "name": "c01_s01_rotor_hover_to_cruise", "layers": [
     {"key": "es:<uuid_turboprop_loop>", "align": "start", "norm": "rms", "loop_to": 25.5, "gain": 1.3, "fi": 0.6, "fo": 1.0}]},
  {"at": 12.24, "name": "c01_s01_nacelle_tilt_servo", "layers": [
     {"key": "es:<uuid_hydraulic_8s>", "align": "start", "trim": [0.2, 8.2], "gain": 0.42, "fi": 0.3, "fo": 0.8}]},
  {"at": 64.02, "name": "c01_s03_crash_impact", "duck": 6, "layers": [
     {"key": "es:<uuid_whoosh_in>", "trim": [0.5, 1.8], "align": "end", "gain": 0.5, "fi": 0.2, "hp": 80},
     {"key": "es:<uuid_impact_transient>", "align": "peak", "gain": 0.85, "pan": 0.1},
     {"key": "es:<uuid_explosion_body>", "trim": [0, 3.8], "align": "peak", "gain": 0.8, "fo": 1.0}]}
]}
```
`"volume"` để 1 (bộ trộn đã tính sẵn mức); chỉnh theo yêu cầu bằng `"trim"`. Không ghi SFX vào `"sfx"` của `plan/chapters/CNN.json`
(đó là chỗ của dạng cũ; để trống để khỏi trùng). Dự án cũ không có `"version": 2` vẫn chạy bộ trộn cũ (`audio_legacy.py`).
