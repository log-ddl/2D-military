---
name: story_2d
description: Đạo diễn và dựng video kể chuyện / giải thích / điều tra hoạt hình 2.5D bằng Remotion — vũ trụ hoạt hình vẽ 100% đồng nhất (0% ảnh chụp thật, 0% 3D), tự thiết kế bảng màu, bối cảnh và đạo cụ vật lý riêng cho từng kịch bản, kết hợp máy quay chiều sâu (whip-pan, rack focus), âm nhạc & SFX bám sát chuyển động, và hỗ trợ cả voice có sẵn lẫn kịch bản đa giọng (TTS API / MCP). Mỗi video một dự án trong projects/<id>/.
---

# Video Kể chuyện Hoạt hình 2.5D (`story_2d`)

Ở `story_2d`, **toàn bộ bộ phim sống trong một vũ trụ hoạt hình 2.5D vẽ 100% đồng nhất (0% ảnh chụp thật, 0% khối 3D, 0% footage ngoài)**. Mỗi kịch bản tự định hình bầu khí quyển màu sắc riêng (`src/design/palette.ts`), bối cảnh riêng và bộ đạo cụ vật lý độc bản (`src/parts/*.tsx`) vẽ bằng nét mực đậm (`#08080A`), đổ bóng khối 2.5D + vành sáng cạnh (`rimLight`), chữ đồng bộ font hỗ trợ đầy đủ tiếng Việt & tiếng Anh.

**Mục tiêu cốt lõi:** Kể chuyện bằng **hình ảnh động và biến đổi vật lý trực diện** khớp với lời đọc và âm thanh — người xem nhìn thấy câu chuyện diễn ra qua hành động, biểu cảm, ánh sáng và chuyển động máy quay chứ không phải đọc slide chữ hay xem các mẫu hình đóng hộp lặp lại.

---

## 1. Cấu trúc — ai được sửa gì

```
skills/story_2d/lib              hạ tầng kỹ thuật của skill (`@skill/story_2d/*`: theme, stage, actor, cards, map, index) — chỉ đọc
skills/story_2d/tools            voice_stitch.py (tách vai & ghép voice), cast_ref.py (tra nhanh mặt nhân vật thật), review.py (kiểm cấu trúc)
projects/<id>/
  input/                         file người dùng thả vào (voice.mp3, script.md…); ingest.py xếp sang assets/
  assets/voice/voice.mp3         voice chính đã chốt (có sẵn hoặc do voice_stitch.py ghép từ lines/) — locked
  assets/voice/lines/            từng câu thoại lẻ L001.mp3… khi sinh từ TTS API / MCP (luồng Kịch bản)
  plan/voice_script.json         bảng phân vai thoại kèm hướng dẫn đọc giọng
  plan/voice_cast.json           mốc [from, to] từng nhân vật để nhép miệng `Actor2D talk={...}`
  plan/STORY.md                  ý tưởng trung tâm, bảng màu & ngôn ngữ thị giác riêng, nhân vật (nếu có), đạo cụ `src/parts/`
  plan/chapters/C01.md · .json   bảng phân cảnh chi tiết · danh sách cảnh máy đọc (agent chính)
  src/design/                    bảng màu riêng (`palette.ts`) & nhận diện khuôn mặt nhân vật (`cast.tsx`) của bộ phim đó
  src/parts/<Tên>.tsx            đạo cụ / cơ cấu vật lý thiết kế riêng cho kịch bản + `export const preview`
  src/cues/C01.ts                mốc từ chính xác lấy từ `voice_map.md` / `transcript.json` (agent chính)
  src/scenes/C01S01.tsx …        mỗi file một cảnh theo nhịp tự nhiên của câu chuyện
  .build/, out/                  SINH TỰ ĐỘNG — cấm sửa tay
```
Không đọc hay chép code dự án khác trong `projects/`. Không sửa file máy sinh (`.build/`, `plan/timeline.json`, `src/cues/index.ts`, `out/`).

---

## 2. Lệnh (chạy từ gốc repo; `T=skills/story_2d/tools`)

| Bước | Lệnh | Kết quả |
|---|---|---|
| Khởi tạo (có voice) | `python3 core/tools/new.py <id> path/to/voice.mp3 --skill story_2d` | khuôn `projects/<id>/` + `voice.mp3` |
| Khởi tạo (từ kịch bản) | `python3 core/tools/new.py <id> path/to/script.md --skill story_2d` | khuôn `projects/<id>/` + `assets/script/script.md` |
| Tách vai kịch bản | `python3 $T/voice_stitch.py <id> --init` | `plan/voice_script.json` + `assets/voice/lines/` |
| Ghép voice đa giọng | `python3 $T/voice_stitch.py <id> --stitch` | chuẩn hoá âm lượng, ghép `assets/voice/voice.mp3` + `plan/voice_cast.json` |
| Mốc từng từ (ASR) | `.venv/bin/python core/tools/asr.py <id>` | `plan/voice_map.md`, `plan/transcript.json` |
| Tra nhanh mặt người thật | `python3 $T/cast_ref.py <id> "Tên 1" "Tên 2"` *(chỉ gọi cho người ít gặp, ~3s)* | `plan/refs/cast_ref.jpg` (liếc nét chính, ngoài `assets/`) |
| Kiểm part 2D | `python3 core/tools/check.py <id> --part <Tên1>,<Tên2>` (`--part all`) | `out/checks/parts/<Tên>.png` (từ `previewStory`) |
| Ráp + kiểm kiểu TS | `python3 core/tools/build.py <id> [--strict]` | `.build/` |
| Kiểm cảnh | `python3 core/tools/check.py <id> --scene C01S01,C01S02` | `out/checks/scenes/C01S01.png` (6 khung) |
| Sheet cả video | `python3 core/tools/check.py <id>` | `out/checks/sheet.png` |
| **Kiểm cấu trúc** | `python3 $T/review.py <id> [--strict]` | bắt lỗi 0% ảnh thật/3D, font chữ, biên thẻ, âm thanh |
| Âm thanh | `.venv/bin/python core/tools/audio.py <id>` | trộn nhạc + SFX (`skills/sound-design/SKILL.md` + `SOUND.md`) → `.build/sound_report.txt` |
| Xem / xuất | `python3 core/tools/render.py <id> --to 60` · `--studio` · không cờ = cả phim | `out/…mp4` |

Video dài (từ ~8–10 phút trở lên): đọc thêm `skills/long-video/SKILL.md` để chia chương `C01`, `C02`… sau khi đã khoá mỹ thuật (`src/design/`) và đạo cụ dùng chung (`src/parts/`) trong `plan/STORY.md`.

---

## 3. Hai luồng đầu vào: Voice có sẵn vs Kịch bản đa giọng

### Luồng 1 — Người dùng đưa sẵn file `voice`
1. `python3 core/tools/new.py <id> <voice_file> --skill story_2d`
2. `.venv/bin/python core/tools/asr.py <id>` → đọc trọn `plan/voice_map.md` để nắm từng câu, từng từ nhấn, khoảng nghỉ và phân biệt các đoạn nhân vật nói (nếu kịch bản có đánh dấu vai).

### Luồng 2 — Người dùng đưa Kịch bản + Hướng dẫn đọc Voice
1. Khởi tạo dự án với kịch bản, chạy `python3 $T/voice_stitch.py <id> --init`.
2. Biên tập `plan/voice_script.json` theo các vai thực tế của kịch bản:
   - `[NARRATOR | hướng dẫn tông giọng & nhịp đọc]`
   - `[SKIT: <tên_nhân_vật> | hướng dẫn biểu cảm & màu giọng riêng cho nhân vật đó]`
   - `[CHAPTER: <Tên Chương>]` *(tuỳ chọn, chỉ dùng khi kịch bản thực sự chia chương cần khoảng lặng)*.
   > **Lưu ý:** Mọi hướng dẫn giọng của người dùng phải được ghi nguyên vẹn vào trường `voice_hint` trong `plan/voice_script.json`.
3. **Sinh file âm thanh từng câu vào `assets/voice/lines/L001.mp3`, `L002.mp3`…:**
   - Nếu người dùng cung cấp API giọng đọc / MCP riêng: gọi đúng tool/API đó theo `voice_id` & `voice_hint` của từng vai.
   - Nếu dùng MCP Epidemic Sound có sẵn (`GenerateVoiceover` / `ListVoices` → `PollVoiceoverGenerationStatus` → `DownloadVoiceover`): chọn giọng phù hợp cho từng vai.
   - Nếu chưa cấu hình API/MCP nào: dừng lại sau khi xuất `plan/voice_script.json` rõ ràng để người dùng cấp API/MCP hoặc thả file voice vào.
4. Ghép & chuẩn hoá: `python3 $T/voice_stitch.py <id> --stitch` → sinh `assets/voice/voice.mp3` và `plan/voice_cast.json`.
5. Chạy `.venv/bin/python core/tools/asr.py <id>`. Khi dựng cảnh có nhân vật nói, lấy khoảng `[from, to]` truyền vào `<Actor2D talk={[[from, to]]} ... />` để nhép miệng khớp tiếng.

---

## 4. Nguyên lý Đạo diễn Hình ảnh, Hook Mở Màn & Dùng Đúng Công Cụ

**Không dùng bối cảnh đóng hộp lặp lại, không minh hoạ kiểu "nói từ nào hiện icon từ đó", và tuyệt đối không mở đầu nhạt nhẽo.**

1. **Thiết kế Hook Mở Màn `0–15s` đầu tiên — Đập thẳng vào kịch tính, cấm mở cảnh bình bình:**
   - **Cấm mở giây `0.0s` bằng cảnh tĩnh giới thiệu chung chung** (nhân vật đứng chính diện nói chuyện, toà nhà đứng yên, bản đồ tĩnh hay chữ tiêu đề hiện chậm). 3 giây đầu phải khiến người xem khựng lại tự hỏi *"Chuyện gì đang xảy ra thế này?"* bằng 1 trong 3 đòn:
     - *Nghịch lý Thị giác tức thì (Visual Paradox):* Đặt ngay 2 hình ảnh đối chọi gay gắt chung một khung (vd: kẻ chủ mưu mặc quần đùi thản nhiên chơi game ngay trên đống sổ sách tỷ đô đang bốc cháy; bữa tiệc sang trọng trên boong tàu trong khi thân tàu bên dưới đã thủng toang).
     - *Đỉnh điểm Biến cố trước, giải thích sau (In Medias Res):* Mở thẳng vào giây phút sập đổ / tai nạn / cú bấm nút định mệnh căng nhất rồi mới giật ngược về đầu mối câu chuyện.
     - *Cực cận Chi tiết → Giật lùi Lộ Toàn cảnh (Micro-to-Macro Whip Reveal):* Giây `0.0s` dí sát cực cận vào 1 chi tiết nhỏ bất thường đang chuyển động mạnh → tại từ khoá đắt đầu tiên, `whipCam` giật lùi tốc độ cao (`0.25–0.4s`) phơi bày quy mô choáng ngợp phía sau.
   - **Nhịp biến đổi dày trong `10–15s` đầu:** Không để một bố cục đứng yên quá `2.5–3.5s` trong đoạn Hook; kết hợp liên hoàn đổi tiêu cự, lia máy lật không gian và va chạm vật lý dứt khoát ăn khớp SFX ngay từ giây `0.0s`, rồi dứt nhịp gọn ở câu chốt Hook trước khi vào mạch kể Chương 1.

2. **Tư duy Minh hoạ Điện ảnh: Dễ hiểu trong `0.5s` + Có Tầng Nghĩa Đối Lập (`palette.ts` + `src/parts/`):**
   - **Cấm minh hoạ sơ đẳng "nói gì hiện nấy" (Word-for-word) & cấm "ẩn dụ đánh đố":**
     - Không dịch từng danh từ lẻ ra đồ vật rời rạc (đọc *"tiền"* hiện cọc tiền → 2 giây sau đọc *"thời gian"* xoá đi hiện đồng hồ → đọc *"rủi ro"* hiện quả bom) làm mắt người xem bị giật vụn mà nội dung nông cạn.
     - Cũng **cấm** tự chế ra các cơ cấu máy móc/biểu tượng trừu tượng lạ lẫm bắt người xem phải dừng lại "giải đố" trong lúc lời đọc đã trôi qua. **Mỗi khung hình chỉ đặt `1 tình huống chính` nhìn ra ngay trong `0.5 giây`.**
   - **Kết hợp Trực diện + Lật tầng nghĩa ngầm (Anchor World + Subtext):**
     - Giữ cả đoạn ý (`2–5 câu` liền nhau) trong **1 bối cảnh đời thực cụ thể, quen thuộc của câu chuyện** làm trục dẫn mắt (Anchor), rồi dùng **góc máy hoặc hành động vật lý để lật phần sự thật ngầm / sự trớ trêu mà lời đọc không nói thẳng**:
       - *Lật bề nổi ↔ bề chìm:* Nửa đầu cho thấy bề mặt hào nhoáng/bình yên (khán phòng tung pháo giấy báo lãi, quầy giao dịch tấp nập, cái bắt tay ký kết) → máy quay **trượt xuyên vách / xuyên xuống gầm bàn / lùi ra hậu trường** phơi bày thực tế trái ngược (nhân viên hốt hoảng tẩu tán két rỗng, móng nhà bị khoét rỗng, bàn tay phía sau rút chốt).
       - *Sức nặng vật lý đời thường:* Khi cần diễn tả áp lực, bong bóng hay rủi ro trừu tượng, dùng **đồ vật quen thuộc ai nhìn cũng hiểu ngay hệ quả vật lý** (sợi cáp treo căng đứt từng tao, chân ghế bị cưa dần khi người ngồi trên vẫn nâng ly, con đập rạn nứt rỉ nước) thay vì biểu đồ khô khan.
   - Đọc kịch bản để thiết kế bảng màu riêng (`src/design/palette.ts`) truyền vào `<StoryCam bgTop={...} bgBot={...} />`; cắt cảnh và đổi góc máy (`whipCam`, zoom, `Rack Focus`) bám theo nhịp ý và cảm xúc tự nhiên của lời đọc.

3. **Các thành phần dựng sẵn trong `@skill/story_2d` — CHỈ DÙNG ĐÚNG LÚC THẬT SỰ CẦN THIẾT:**
   - **`Actor2D` (Nhân vật):** Chỉ đưa nhân vật vào khi cảnh thực sự cần diễn xuất con người. Những cảnh cận cảnh cơ chế, đồ vật biến dạng, không gian kiến trúc hoặc ẩn dụ vật lý tự thân đã cuốn hút thì **không cần nhét nhân vật vào đứng nhìn cho chật khung**.
   - **`StoryMap2D` (Bản đồ):** Chỉ dùng ở đúng câu kịch bản cần định vị quốc gia, thành phố hay tuyến di chuyển địa lý thật; kịch bản không cần địa lý thì **không dùng bản đồ**.
   - **`InWorldDoc` (Tài liệu / Bảng / Bài đăng):** Chỉ dùng khi câu chuyện thực sự xoay quanh một văn bản, hợp đồng, tờ báo hay bài viết cụ thể cần tô sáng / gạch sửa trực tiếp.
   - **`SplitStage` (Chia khung ngang / dọc):** Chỉ dùng khi lời đọc đang đặt song song các vế đối chiếu hoặc hai tầng không gian đối lập xảy ra cùng lúc (dùng `weight` động để không bỏ trống mảng đen chờ ô sau mở).
   - **`BlackPunchCard` (Thẻ nhấn nền đen `#000000`):** Chỉ dùng khi kịch bản thực sự có một câu chốt / cú đảo chiều đắt giá hoặc điểm ngắt chuyển chương cần khoảng nhấn thị giác mạnh. **Tuyệt đối không ép phải có bao nhiêu thẻ hay cách nhau bao nhiêu giây** — nếu mạch cảm xúc đang liền lạc thì giữ nguyên trên cảnh, không cắt màn đen.

4. **Kỷ luật Chữ ("Chỉ đặt khi thật sự cần thiết") & Luật 1 Ngôn Ngữ Tuyệt Đối:**
   - **Mặc định cảnh không cần chữ.** Chỉ đưa chữ vào hình khi nó mang **dữ kiện cụ thể mà nét vẽ chuyển động, giọng đọc (`voice`) và âm thanh (`SFX`) không tự truyền tải được** (như con số dữ liệu, mốc thời gian, tên riêng cần giới thiệu lần đầu, mác định danh tối giản trên vật thể ẩn dụ, hoặc nội dung văn bản trong `InWorldDoc`).
   - **Phép thử Xoá Chữ trước khi vẽ bất kỳ nhãn / `HudPill` / `SpeechBubble` nào:** Hãy thử che chữ đó đi — nếu người xem đang vừa nhìn chuyển động vừa nghe `voice` + `SFX` mà vẫn hiểu trọn vẹn (vì mắt đã thấy hành động trên hình, tai đã nghe nhân vật nói câu đó trong `voice`, hoặc `SFX` đã phát tiếng động đó rồi) → **chữ đó là thừa, tuyệt đối không đặt vào**.
   - **`HudPill`:** Chỉ bật **đúng 1 lần duy nhất ở cảnh xuất hiện đầu tiên** khi thực thể có tên riêng/chức vụ thật sự cần định danh (khoá mã cảnh trong `plan/STORY.md`); nhân vật ẩn danh/hư cấu không cần tên thì không gắn `HudPill`.
   - **`SpeechBubble`:** Chỉ dùng cho diễn xuất phụ không lời khi 1 giọng Narrator đang kể dẫn; **cấm dùng để nhại lại câu thoại nhân vật đã nói thành tiếng trong `voice`**.
   - **100% văn bản vẽ trên hình bắt buộc trùng duy nhất ngôn ngữ của `voice` (`plan/transcript.json`):** kể cả chữ nhỏ trên biển hiệu, vạch đo, tài liệu, bản đồ (chỉ giữ nguyên tên riêng thương hiệu/đơn vị đo quốc tế như `NVIDIA`, `S&P 500`, `$39`, `mL`).
   - Mọi thẻ chữ trong SVG bắt buộc dùng `<StoryText>` (bọc sẵn `BRUSH_FONT` / `MONO_FONT` + viền đen `paintOrder: stroke fill`); **cấm dùng `<text>` thô hay font hệ thống**.

---

## 5. Chuẩn Tạo hình 2.5D & Quy tắc Chống lỗi Thị giác

1. **Ánh sáng 2.5D có hướng (`LightCone` + `NeonGlow` + `Actor2D lightSide`):**
   - Đặt nguồn sáng hợp lý theo bối cảnh và truyền `lightSide="left" | "right" | "top"` + `rimColor` ăn khớp nguồn sáng đó cho `<Actor2D>` để nhân vật nổi khối rõ khỏi nền.
2. **Nhân vật tách đôi: Mặt cố định gọn nhanh (`src/design/cast.tsx`) — Trang phục tự sáng tạo theo từng cảnh:**
   - Thư viện `@skill/story_2d/actor` chỉ cung cấp **phôi giải phẫu cơ bản** (dáng đầu, vóc người, ngũ quan, tay/chân dài hoặc cộc, các khe SVG `faceSlot`, `hairSlot`, `bodyClipSlot`, `bodySlot`) chứ **không gắn sẵn nhân vật hay tủ quần áo mẫu**.
   - **Phần cố định xuyên suốt phim (`src/design/cast.tsx`):** Chỉ khoá **khuôn mặt, mái tóc, màu da và vóc dáng** để người xem nhận ra cùng một nhân vật:
     - *Nhân vật siêu nổi tiếng đã rõ mặt:* không cần tìm mạng, dựng nhanh từ phôi `<Actor2D>` (`headShape`, `build`, `eyeStyle`, `nose`, `mouthStyle`, `facialHair`, `hair`) kết hợp vài nét SVG đặc trưng trong `hairSlot` / `faceSlot` ngay tại `cast.tsx`.
     - *Nhân vật có thật có nhắc tên nhưng ít gặp / không chắc mặt:* chạy **đúng 1 lệnh gộp** `python3 skills/story_2d/tools/cast_ref.py <id> "Tên 1" "Tên 2"` (~2–3 giây) → liếc `plan/refs/cast_ref.jpg` nắm **2–3 nét lớn nhất** (tóc/hói, kính, râu, dáng mặt) rồi dựng tương đối sát trong `cast.tsx` (**cấm** tỉa tót cầu kỳ làm chậm bước chuẩn bị).
     - *Không có ảnh trên mạng hoặc nhân vật hư cấu / quần chúng:* bỏ qua tra cứu, thiết kế tự do theo vai trò kịch bản.
   - **Phần biến đổi sáng tạo theo từng cảnh (Trang phục & Phụ kiện):** Kịch bản lời bình hầu như không tả ai mặc gì — **cấm mặc chết cứng 1 bộ đồ từ đầu đến cuối phim hay lặp lại màu áo mặc định**. Ở từng cảnh (`C01.md` → `src/scenes/`), đạo diễn tự suy từ **không gian, thời điểm, địa vị và tâm trạng** (ở nhà đêm khuya mặc áo cộc/ba lỗ + quần đùi + dép lê; đi nghỉ mát mặc sơ mi mở; thời sinh viên nghèo mặc áo thun/hoodie; lên hội nghị/sàn giao dịch mặc vest; vào xưởng/phòng lab/trại giam mặc đồ đúng nơi đó…) để phối `torso` + `sleeves` + `bottom` + `shoes` với bảng màu `palette.ts` và vẽ thêm vài nét cổ áo/ve áo/túi/khoá kéo/phụ kiện riêng qua `bodyClipSlot` / `bodySlot`.
3. **Cỡ chủ thể & bố cục khung (`fitBox`):**
   - Khung chuẩn `1920×1080`. Căn `zoom` hoặc `fitBox(box, 0.75..0.84)` để chủ thể diễn xuất chính nổi bật, dễ đọc biểu cảm và chi tiết hành động; truyền toạ độ thực vào `leftHandTo` / `rightHandTo` hoặc `actorSockets(props)` khi nhân vật cầm nắm đạo cụ.
4. **Quy tắc SVG an toàn trên Chromium:**
   - Không tự viết `<filter>` thủ công thiếu `filterUnits="userSpaceOnUse"` trên các nét thẳng hoặc vật thể lớn (sẽ bị cắt hộp 120%). Dùng `<NeonGlow>`, `<LightCone>`, và `<StoryDefs />` từ `@skill/story_2d/stage`.

---

## 6. Quy trình triển khai chuẩn (Đạo diễn & Dựng song song bằng Subagent)

### Bước A — Agent chính chuẩn bị Voice, ASR & Khoá `STORY.md`
1. Chạy Luồng 1 hoặc Luồng 2 (mục 3) để có `assets/voice/voice.mp3` (+ `plan/voice_cast.json` nếu đa giọng) và chạy `.venv/bin/python core/tools/asr.py <id>`.
2. Đọc toàn bộ `plan/voice_map.md`. Viết `plan/STORY.md` chốt định hướng đạo diễn cho riêng bộ phim này:
   - Bảng màu bầu khí quyển riêng → code vào `src/design/palette.ts`.
   - **Kịch bản hình ảnh chi tiết cho `0–15s` Hook mở màn** (đập vào nghịch lý / biến cố nào ngay giây `0.0s`, cú giật lùi/lật góc máy nào, chốt nhịp ở giây nào).
   - Dàn nhân vật (nếu có): chỉ khoá mặt/tóc/vóc dáng vào `src/design/cast.tsx` (trang phục để mở theo bối cảnh từng cảnh) & khoá rõ cảnh nào được bật `HudPill` lần đầu (hoặc `Không`).
   - Danh sách không gian neo & đạo cụ vật lý dễ hiểu trong `0.5s` có cài lớp lật sự thật (`src/parts/<Tên>.tsx`).
   - Các điểm nhấn `BlackPunchCard` (chỉ liệt kê nếu kịch bản thực sự có câu chốt/ngắt chương cần dùng).
3. Viết `plan/chapters/C01.md` + `plan/chapters/C01.json` + `src/cues/C01.ts` (mốc giây toàn phim lấy chính xác từ `voice_map.md` / `transcript.json`).
4. Khởi chạy song song subagent chọn nhạc nền & không gian âm (`amb`) theo `skills/sound-design/SKILL.md` + `skills/story_2d/SOUND.md` khớp đúng thể loại và đường cảm xúc của kịch bản.

### Bước B — Vẽ & Kiểm mắt `src/parts/` trước khi dựng cảnh
1. Thiết kế các đạo cụ đặc thù của câu chuyện trong `src/parts/<Tên>.tsx` (nét viền chuẩn `STROKE.outer`, đổ bóng khối 2.5D), cuối file gắn `export const preview = previewStory([...])`.
2. Chạy `python3 core/tools/check.py <id> --part all` → mở từng ảnh `out/checks/parts/*.png` bằng `read_file` kiểm tra tạo hình trước khi giao dựng cảnh.

### Bước C — Subagent dựng cảnh `src/scenes/` song song
- Giao mỗi subagent **2–3 cảnh liền nhau** (tối đa ~6 subagent chạy song song). Prompt đính kèm: đoạn `voice_map.md`, bảng phân cảnh `C01.md` + bảng nhân vật trong `STORY.md`, chữ ký `src/design/*` + `src/parts/*`, `plan/voice_cast.json` (nếu có), và yêu cầu đọc `skills/story_2d/CATALOG.md`.
- Subagent chỉ viết các file `src/scenes/<SceneId>.tsx` được giao; chỉ dùng chữ và các thành phần thư viện đúng lúc thật sự cần thiết; không sửa `plan/`, `src/design/`, `src/parts/` và **không tự chạy `build.py`**.
- Viết xong nhóm cảnh, subagent chạy 1 lệnh `python3 core/tools/check.py <id> --scene C01S01,C01S02` và **mở ảnh PNG 6 khung bằng `read_file` tự kiểm bằng mắt** theo mục 7 rồi sửa dứt điểm.

### Bước D — Ráp, đặt SFX, Kiểm duyệt `review.py` & Xuất video
1. `python3 core/tools/build.py <id> --strict` — sạch 100% lỗi TypeScript.
2. `python3 core/tools/check.py <id>` — mở `out/checks/sheet.png` kiểm tổng thể mạch thị giác, ánh sáng, sự liền lạc và biến thiên không gian toàn phim.
3. Gọi các subagent SFX đọc trực tiếp `.tsx` + `skills/story_2d/SOUND.md` ghi `plan/sfx/C01_k.json` bám sát từng chuyển động và va chạm vật lý thực tế trên màn hình.
4. `.venv/bin/python core/tools/audio.py <id>` → kiểm `.build/sound_report.txt`.
5. Chạy **`python3 skills/story_2d/tools/review.py <id> --strict`** → sửa sạch mọi lỗi `✗` và cảnh báo `⚠`.
6. Chạy `python3 core/tools/render.py <id> --to 60` để kiểm chuyển động 30fps và độ ăn khớp hình–tiếng (render cả phim khi người dùng yêu cầu).

---

## 7. Kiểm định chất lượng bằng AI Vision trên ảnh `out/checks/` (Bắt buộc soi kỹ)

Mỗi khi mở `out/checks/parts/*.png`, `out/checks/scenes/C01Sxx.png` (6 khung trích đều của cảnh) và `out/checks/sheet.png` bằng `read_file`, rà kỹ từng ô:
1. **Rà toàn bộ chữ bằng mắt & Phép thử Xoá Chữ (ưu tiên số 1):**
   - Đối chiếu ngôn ngữ `plan/transcript.json` → lọt từ lệch ngôn ngữ `voice`, chữ tràn hộp, đè lên mặt nhân vật/chi tiết chính hoặc quá nhỏ → **sửa ngay**.
   - Áp dụng **Phép thử Xoá Chữ**: hễ thấy chữ thừa không mang dữ kiện mới (chữ thuyết minh lại hành động/trạng thái mắt đang thấy, nhãn chú thích vùng khung hình, bong bóng nhại lại câu đã nói trong `voice`, chữ tượng thanh khi đã có SFX, hoặc `HudPill` lặp lại nhân vật cũ) → **gỡ bỏ ngay**.
2. **Soi riêng sức hút của Hook (`0–15s` đầu) & chống minh hoạ sơ đẳng:**
   - Nhìn `C01S01` (và `C01S02`): nếu giây đầu mở ra bằng cảnh tĩnh chung chung (nhân vật đứng yên nói, phòng trống, bản đồ phẳng) → **bắt buộc dựng lại Hook** bằng nghịch lý thị giác hoặc cú lật máy `Micro-to-Macro`.
   - Nhìn chuỗi 6 khung của từng cảnh: nếu thấy kiểu "nói từ nào hiện icon từ đó" rời rạc hoặc cơ cấu trừu tượng rối rắm khó hiểu → **sửa lại thành 1 tình huống đời thực dễ hiểu ngay + góc máy lật lớp nghĩa đối lập**; tuyệt đối không bù đắp cho ảnh tĩnh bằng chữ thuyết minh.
3. **Bố cục sạch & liền mạch:** Nếu có dùng `SplitStage`, không để mảng đen trống chờ ô sau mở (dùng `weight` động); nếu dùng `BlackPunchCard`, từng từ khớp đúng mốc `at` trong `transcript.json`.
4. **Ánh sáng 2.5D & điểm nối cơ học:** Chủ thể tách rõ khỏi nền nhờ ánh sáng/tương phản; tay cầm `leftHandTo` / `rightHandTo`, `RelationLink` hoặc `SpeechBubble tailTo` chạm đúng vị trí.
