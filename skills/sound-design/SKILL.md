---
name: sound-design
description: Âm thanh cho video (mọi chủ đề) — chọn và dựng nhạc nền theo kịch bản, đặt SFX nhiều lớp đúng mốc, tiếng nền, trộn và tự kiểm (lời rõ, đúng mốc, loa điện thoại, mono). Chạy bằng một agent âm thanh song song với dựng hình. Giọng đọc giữ nguyên bản. Dùng khi làm hoặc sửa âm thanh của một dự án trong projects/<id>/.
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
4. **SFX:** `SearchSoundEffects` (`term` tả nguồn âm cụ thể: "tank T-72 cannon shot close") → `DownloadSoundEffect` (`WAV`) →
   `sound_lib.py add es:<uuid> --title "…" --url "<link>"`. Có bộ thu thật cho xe quân sự, vũ khí.
5. Link tải là link ký, hết hạn sau ~2 ngày: tải ngay bằng `add`, đừng lưu link. `RETRY_LATER` → chờ `retryAfterSeconds` rồi gọi lại.
6. Chỉ tải những gì sẽ dùng (bài đã chọn + stem, SFX đã chọn). MCP không báo phí / hạn mức; tải thử nhiều thì hỏi người dùng trước.

```
python3 core/tools/sound_lib.py search "metal impact" [-n 8] [--max 3] [--online]     SFX
python3 core/tools/sound_lib.py search "dark cinematic" --music --online               nhạc
.venv/bin/python core/tools/sound_lib.py get fs:441373 mk:2782 --query "metal impact"  tải → đo → INDEX.json
.venv/bin/python core/tools/sound_probe.py fs:441373                                   đỉnh @giây, cụm tiếng, % trầm
.venv/bin/python core/tools/sound_probe.py fs:507747 --music [--grid 86-118]           tempo, giọng, CÚ HIT, cú kết, dB mỗi giây
.venv/bin/python core/tools/audio.py <id>                                              trộn + tự kiểm → .build/sound_report.txt
```
Không nghe được thì chọn theo dấu vết người nghe để lại: nhiều lượt tải **và** nhiều người chấm (★4.4 với 380 phiếu hơn ★4.9 với 6 phiếu);
mô tả của người thu (nguồn âm thật, thiết bị) gần với nghe nhất; loại clip có mô tả khác nguồn âm cần; xem thời lượng và cụm tiếng
(`sound_probe`) trước khi tin. Tìm bằng tiếng Anh, tả **nguồn âm + chất liệu** ("heavy metal door slam"), không tả cảm xúc chung chung.

## 1c. Đọc kịch bản trước khi chọn bất kỳ tiếng nào
Không có bảng tra "sự kiện X → file Y". Với từng đoạn của kịch bản (STORY.md, CNN.md, lời đọc từng câu) xác định: đoạn kể gì và
người xem cần cảm thấy gì · hình là gì (hiện thực / mặt cắt / sơ đồ / HUD) · máy quay ở đâu (cận, xa, trong, ngoài) · lời đang nói gì
đúng lúc đó · có cần tiếng không. Ghi thành bảng **khoảnh khắc âm thanh** (mốc · hình · lời · cần gì · mô tả tiếng: nguồn âm, chất liệu,
khoảng cách, độ dài, đầu, đuôi). Chỉ sau đó mới tìm — bằng mô tả đó — trong kho rồi online. Kiến thức để đọc kịch bản của từng thể loại
ra tiếng: `skills/<skill>/SOUND.md`. Ghi chú trong kho (`sound_lib.py show <khoá>` → `notes`) chỉ giúp dùng đúng file khi đã chọn.

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

## 3. SFX — ít mà đúng
- **Mỗi lúc một tiếng chính.** Chỉ đặt tiếng ở các mốc của câu chuyện (sự kiện vật lý lớn, bước ngoặt), không phải mọi chuyển động.
- **Cú lớn tối đa 3 lớp:** lực va (transient) + thân tiếng + trầm/sub. Thêm tiếng dẫn trước (whoosh, reverse, hút khí `align: end`)
  và đuôi (mảnh vụn, lửa) khi đáng.
- Đỉnh tiếng rơi đúng mốc: `align: "peak"` (mặc định). Mốc lấy từ CUE / mốc từng từ, không ước lượng.
- **Không** whoosh ở mọi chỗ chuyển cảnh (1–2 chỗ đổi không gian lớn là đủ), **không** chuỗi beep, HUD tối đa ~3 lần một phút, cùng một họ tiếng.
- Lớp chạy dài (xích xe, động cơ, drone, lửa): `"norm": "rms"`, bộ trộn đưa vào bus nền (không vang, khoét dải giọng, bỏ sub).
- `"duck": 3…8` (dB) cho cú lớn: nhạc / nền tự hạ quanh cú đó. `"snap": true` cho tiếng nhỏ không gắn cú va (HUD, wipe): dời ±80 ms vào phách nhạc.
- Lia stereo theo vị trí trên hình (`pan`, `[đầu, cuối]` cho vật bay qua), `pitch: [a, b]` cho doppler.
- **Tiếng nền** (`"amb"`): mỗi không gian một lớp nhỏ (gió ngoài trời, ù phòng), đổi theo cảnh. Thiếu thì hình "câm"; thừa thì đục.
- `"stages"`: không gian vang theo đoạn (`out` ngoài trời / `room` trong phòng / `dry`).

## 4. Agent âm thanh (chạy song song với dựng hình)
Agent chính gọi **một subagent âm thanh chạy nền** ngay khi đã có `plan/STORY.md`, phân cảnh (`plan/chapters/CNN.json` + `.md`)
và `src/cues/` — tức là trước khi dựng mô hình / cảnh. Hình dựng mất hàng giờ; âm thanh xong trước. Video dài: một agent nhạc
cho cả phim (ghi `plan/mix.json`) + tối đa vài agent SFX theo nhóm chương (mỗi agent chỉ ghi `plan/sfx/CNN.json` của chương mình).

Prompt giao việc BẮT BUỘC có:
1. Đọc: file này, `skills/<skill>/SOUND.md`, `plan/STORY.md`, `plan/chapters/CNN.md` + `.json`, `plan/voice_map.md` (hoặc `CNN.voice.md`),
   `src/cues/`, **yêu cầu âm thanh của người dùng** (chép nguyên văn vào prompt), **nguồn: epidemic hay free** (mặc định epidemic).
2. Chỉ được tạo/sửa: `plan/mix.json` (agent nhạc), `plan/sfx/CNN.json` (agent SFX), `library/*/dl/` + `INDEX.json` (qua `sound_lib.py`).
   Không sửa `plan/chapters/`, `src/`, giọng; không gọi `build.py`, `render.py`.
3. Làm: đọc kịch bản → bảng khoảnh khắc âm thanh (mục 1c) → tìm trong kho trước → tìm online → tải → `sound_probe` → viết mix.json / sfx → `audio.py <id>` → đọc `.build/sound_report.txt`
   → sửa tới khi đạt mục 5 (ít nhất 1 vòng). Freesound báo 429 thì chờ rồi làm tiếp (có thời gian; đừng bỏ).
4. Báo lại: bảng khoảnh khắc âm thanh, bài nhạc + bảng dựng (giây video ← giây bài, vì sao), các sự kiện SFX, kết quả tự kiểm, chỗ còn ⚠ và lý do giữ.

Khi hình dựng xong: Agent chính chạy lại `audio.py <id>` (≈ 15–30 s / phút video). Cảnh nào đổi mốc thì báo agent âm thanh
(hoặc tự sửa `at` trong `plan/sfx/`). Sửa hình thuần `.tsx` không đổi mốc thì không cần chạy lại.

## 5. Tự kiểm (`.build/sound_report.txt`) — đạt mới giao
- **Lời rõ:** mỗi cảnh trung vị ≥ 12 dB, bị lấp ≤ 25% (dải 1–4 kHz, khung 100 ms). Cảnh cố ý cho nổ lấn lời (cao trào) được giữ,
  ghi lý do trong báo cáo. Không đạt → hạ / cắt ngắn đuôi tiếng, bớt lớp, giảm vang, hạ `music_db` đoạn đó.
- **Đúng mốc:** đỉnh cú lớn lệch ≤ 150 ms (cú nhiều lớp thân tiếng đến sau cú va là bình thường).
- **Thiết bị:** −14 LUFS, đỉnh ≤ −1 dBFS; loa điện thoại giả lập: nổ lớn vượt giọng ≥ +4 dB; gộp mono mất ≤ 3 dB.
  Nổ yếu trên điện thoại → chọn lớp có "thân" ở 300 Hz–3 kHz (nổ chát, mảnh vụn, va kim loại), đừng dựa vào sub;
  mono mất nhiều → bớt lia cực trái/phải ở lớp to.
- **Nhạc:** chỗ cắt nằm trong khoảng im hoặc đúng cú hit; cú kết thật rơi ở cuối; không đổi giọng xa không có vật ngăn.

## 6. Định dạng
Đầy đủ ở docstring `core/tools/audio.py`. Tóm tắt:
```json
plan/mix.json
{"version": 2, "source": "epidemic", "_user": "yêu cầu âm thanh của người dùng (nguyên văn)",
 "stages": [[0, 21.28, "out"], [21.28, 36.18, "room"], [36.18, 70.1, "out"]],
 "music": [{"key": "fs:507747", "in": 3.33, "from": 0, "to": 20.83, "gain": 0.9, "fadeIn": 0.02, "fadeOut": 0.12, "name": "hook: cú hit 3.43 → 0.10"}],
 "music_db": [[0, 0], [53.6, 0], [53.7, -60], [56.2, -60], [56.32, 0]],
 "amb": [{"key": "fs:620099", "in": 10, "from": 0, "to": 21.6, "gain": 0.8, "fadeIn": 0.8, "fadeOut": 0.6, "hp": 120}],
 "options": {"word_dodge": true, "beat_snap": true}, "trim": {"music": 0, "sfx": 0}, "volume": {"music": 1, "sfx": 1}}

plan/sfx/C01.json
{"sfx": [{"at": 9.24, "name": "đạn nảy khỏi giáp", "duck": 6, "layers": [
   {"key": "fs:441373", "gain": 0.8, "pan": 0.15}, {"key": "fs:562198", "gain": 0.65},
   {"key": "fs:671306", "trim": [0, 2.5], "gain": 0.6, "fo": 1.2}]}]}
```
`"volume"` để 1 (bộ trộn đã tính sẵn mức); chỉnh theo yêu cầu bằng `"trim"`. Không ghi SFX vào `"sfx"` của `plan/chapters/CNN.json`
(đó là chỗ của dạng cũ; để trống để khỏi trùng). Dự án cũ không có `"version": 2` vẫn chạy bộ trộn cũ (`audio_legacy.py`).
