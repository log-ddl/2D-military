---
name: military-2d
description: Đạo diễn và dựng video quân sự THUẦN 2D từ voice bằng Remotion — kết hợp 3 trụ cột ngang hàng: (1) minh hoạ 2D chiến thuật, hành động và mặt cắt cơ chế (góc ngang đồi/chiến hào, người lính, khí tài, đạn nổ, sa bàn cục bộ, mặt cắt vũ khí/công sự), (2) bản đồ tác chiến địa lý cho cấp chiến dịch, và (3) ảnh tư liệu thật từ web + thẻ nhân vật. Không 3D, không BlenderKit, không footage. Mỗi video một dự án trong projects/<id>/.
---

# Video quân sự 2D: Chiến thuật & Cơ chế 2D + Bản đồ + Ảnh tư liệu (Remotion)

Khác `military` / `military-blender` (dùng khối 3D) và `history_military` (footage lưu trữ + trích trang sách): ở đây **mọi giải thích đều bằng ngôn ngữ 2D rõ nét, kết hợp bản đồ chiến dịch và ảnh tư liệu thật**.
**Ba trụ cột ngang hàng — không lấy bản đồ làm nền vạn năng:**
1. **Minh hoạ 2D Chiến thuật · Hành động · Cơ chế (`SideStage`, `TopStage`, `src/parts/`):** khi lời đọc nói về *cách đánh, giao tranh, phục kích, cao độ địa hình, công sự, vũ khí hay nguyên lý hoạt động* → vẽ trực diện cảnh 2D góc ngang, sa bàn chiến thuật cục bộ hoặc mặt cắt cơ chế.
2. **Bản đồ địa lý (`GeoBase`, `SatBase`):** **chỉ** dùng khi lời đọc nói về *vị trí địa lý rộng, hướng hành quân cấp chiến dịch, bao vây hay tuyến tiếp tế*. Định vị xong phải cắt ngay sang cảnh 2D chiến thuật hoặc ảnh tư liệu.
3. **Ảnh tư liệu thật & Nhân vật (`PhotoFull`, `PhotoCard`, `Person*`):** làm bằng chứng lịch sử khi nhắc tới *con người thật, chỉ huy, diện mạo khí tài ngoài đời, hiện trường và hậu quả thương vong*.

## 1. Cấu trúc — ai được sửa gì

```
voice/                           voice gốc
library/images/dl/search/<slug>/ kho đệm kết quả tìm ảnh (img.py sinh: sheet.jpg, INDEX.md, cands.json) — dùng chung
skills/military-2d/lib           đồ nghề của skill (`@skill/military-2d/…`: theme, field, map, tactics, photo, person) — chỉ đọc
skills/military/lib/2d, label    Cam2D, Defs2D, Grain, Blast2D, Muzzle2D, skyline, contours, Label, Callout — chỉ đọc
projects/<id>/
  input/                         file người dùng thả vào (ảnh riêng, bản đồ gốc…); ingest.py xếp sang assets/
  assets/                        voice, ảnh (mã aNNN, nguồn + cờ trong ASSETS.json); file `locked` — chỉ đọc
  plan/STORY.md                  lập luận, phân vai 3 trụ cột, mỹ thuật, bảng parts 2D, bảng bản đồ, bảng ảnh & nhân vật (agent chính)
  plan/chapters/C01.md · .json   bảng phân cảnh · cảnh máy đọc (agent chính)
  src/design/                    bảng màu của video (agent chính)
  src/parts/<Tên>.tsx            khí tài, công sự, vũ khí, mặt cắt 2D dùng chung + `export const preview` (agent chính / subagent part)
  src/parts/geo.ts               mọi toạ độ [kinh độ, vĩ độ] của các cảnh bản đồ (agent chính; cảnh không tự gõ toạ độ)
  src/cues/C01.ts                mốc voice (agent chính)
  src/scenes/C01S01.tsx …        mỗi file một cảnh, do đúng subagent được giao viết
  .build/, out/                  SINH TỰ ĐỘNG — cấm sửa tay
```
Không đọc hay chép code dự án khác trong `projects/`. Không sửa file máy sinh (`.build/`, `plan/timeline.json`, `src/cues/index.ts`, `out/`).

## 2. Lệnh (chạy từ gốc repo; `T=skills/military-2d/tools`)

| Bước | Lệnh | Kết quả |
|---|---|---|
| Khởi tạo | `python3 core/tools/new.py <id> voice/x.mp3 --skill military-2d` | khuôn `projects/<id>/` |
| Mốc từ | `.venv/bin/python core/tools/asr.py <id>` | `plan/voice_map.md`, `transcript.json` |
| Tìm ảnh | `python3 $T/img.py search "q1" "q2" … [-n 12] [--min 1000] [--site …] [--stock]` | mỗi câu tìm một `library/images/dl/search/<slug>/sheet.jpg` + `INDEX.md` |
| Lấy ảnh | `python3 $T/img.py get <id> <slug>:3,7 <slug2>:1 [--note "…"]` · `get <id> <url ảnh> --page <url trang>` | ảnh `aNNN` trong `assets/images`, kèm nguồn + cờ `risk` / `license-unknown` |
| Tách nền nhân vật | `python3 $T/img.py cutout <id> a006 [a007 …]` | PNG nền trong suốt, mã `aNNN` mới (tag `cutout`) cho `<PersonCutout>` (macOS 14+) |
| Ảnh vệ tinh nền | `python3 skills/history_military/tools/satmap.py <id> --center lon,lat --km 120 [--px 3600]` | ảnh `aNNN` + `bbox`, `size` cho `<SatBase>` |
| Ảnh người dùng đưa | `python3 core/tools/ingest.py <id>` | file trong `input/` → `assets/` (`locked`) |
| Kiểm part 2D | `python3 core/tools/check.py <id> --part Tank2D,Bunker2D` (`--part all`) | `out/checks/parts/<Tên>.png` (4 góc/trạng thái từ `preview2D`, không cần `build.py`) |
| Ráp + kiểm kiểu | `python3 core/tools/build.py <id> [--strict]` | `.build/` |
| Kiểm cảnh | `python3 core/tools/check.py <id> --scene C01S02,C01S03` | `out/checks/scenes/C01S02.png` (6 khung) |
| Sheet cả video | `python3 core/tools/check.py <id>` | `out/checks/sheet.png` |
| **Kiểm duyệt** | `python3 $T/review.py <id> [--strict]` | danh sách ✗ lỗi / ⚠ cảnh báo (tỉ lệ bản đồ, hình, ảnh, nhân vật, âm thanh) + thông tin bản quyền |
| Âm thanh | `.venv/bin/python core/tools/audio.py <id>` | nhạc + SFX đã trộn (`skills/sound-design/SKILL.md` + `SOUND.md`) → `.build/sound_report.txt` |
| Xem / xuất | `python3 core/tools/render.py <id> --to 60` · `--studio` · không cờ = cả phim | `out/…mp4` |

Video dài (từ ~8 phút): đọc thêm `skills/long-video/SKILL.md`, làm theo chương; bảng `src/parts/`, bảng nền bản đồ, `geo.ts`, bảng ảnh và bảng nhân vật trong `STORY.md` khoá trước khi chia chương.

## 3. Quy trình

### Bước A — Agent chính đạo diễn & khoá kế hoạch
1. `new.py`, `asr.py`, đọc toàn bộ `plan/voice_map.md` trước khi chia cảnh (chỉ tra `transcript.json` khi cần mốc từ lẻ). Có file trong `input/` thì `ingest.py`.
2. Rút ra câu hỏi trung tâm và cấu trúc biến đổi của từng đoạn, viết `plan/STORY.md` (template):
   - **Tài sản vẽ 2D dùng chung (`src/parts/<Tên>.tsx`)** — danh sách xe, pháo, máy bay, tàu, công sự, hầm ngầm, mặt cắt vũ khí cần vẽ cho chủ đề này, kèm góc nhìn (`side` / `top` / `cutaway`) và các khớp/trạng thái động (mục 5).
   - **Bản đồ nền & `src/parts/geo.ts`** — chỉ tạo cho những đoạn thật sự cần địa lý vĩ mô (mục 6); chỗ ước lượng ghi `// minh hoạ`.
   - **Nhân vật & Ảnh tư liệu** — danh sách người được nhắc tên (mục 8) và các câu cần ảnh thật làm bằng chứng (mục 7).
3. Viết `plan/chapters/C01.md` + `C01.json` + `src/cues/C01.ts`: mỗi cảnh 8–25 s giải quyết một ý, luân phiên sân khấu (`2D-NGANG`, `2D-SA-BÀN`, `2D-MẶT-CẮT`, `MAP`, `ẢNH`); thiết kế **Hook mở đầu** có hình hoạt động ngay từ khung 0 giải phóng khoảng trống nhận thức mà không chờ lời.
4. Gọi agent nhạc nền chạy song song (`skills/sound-design/SKILL.md` + `SOUND.md`): dựng `plan/mix.json` gồm nhạc, `stages` và `amb`.

### Bước B — Chuẩn bị song song: Tìm ảnh tư liệu & Vẽ tài sản 2D (`src/parts/`)
- **B1 — Tìm & chọn ảnh tư liệu:**
  1. Gom mọi câu tìm vào MỘT lệnh `img.py search "…" "…" …` (cụ thể sự kiện + năm + địa danh / khí tài / tên người + `"portrait"`). Nhiều hơn ~15 câu thì chia 2–4 subagent chạy `img.py`.
  2. **Mở từng `sheet.jpg` xem bằng mắt** rồi mới `img.py get`: đúng khí tài, đúng quân phục / thời kỳ, đúng người (theo chú thích trang gốc đáng tin). Nhân vật dùng `PersonCutout` thì chạy `img.py cutout` và mở PNG kiểm viền tóc/mũ/vai.
  3. Câu không tìm được ảnh đúng: **tuyệt đối không lấy ảnh na ná thế vào** — chuyển câu đó sang dựng cảnh vẽ 2D (`SideStage` / `TopStage` / mặt cắt) và ghi vào `STORY.md`.
- **B2 — Vẽ & kiểm tài sản 2D dùng chung (`src/parts/<Tên>.tsx`):**
  1. Mỗi chủ thể chính (xe tăng, pháo, trực thăng, boong-ke, đầu đạn…) viết thành component SVG trong `src/parts/<Tên>.tsx` theo chuẩn nét mục 5, nhận tham số góc nhìn / trạng thái (vd `view="side" | "top"`, `turretDeg`, `recoil`, `cutaway`, `hit`) để các cảnh dùng chung một nhận dạng thống nhất.
  2. Cuối mỗi part khai `export const preview = preview2D([...])` (`@skill/military-2d/field`) và chạy `python3 core/tools/check.py <id> --part all` → mở ảnh `out/checks/parts/*.png` kiểm dáng nhận diện, tỉ lệ và độ rõ ở kích thước thật **trước khi dựng cảnh chuyển động**.

### Bước C — Subagent dựng cảnh song song
- Chia nhóm 2–3 cảnh liền nhau/subagent (tối đa ~6 subagent chạy cuốn chiếu). Prompt giao việc có đủ: đoạn `voice_map.md`, bảng phân cảnh `C01.md`, chữ ký các part trong `src/parts/` và hằng `geo.ts`, mã ảnh + kiểu thẻ nhân vật, đường dẫn `SKILL.md` và `CATALOG.md` này.
- Subagent chỉ viết `src/scenes/<id>.tsx` được giao; không tự sửa `parts/`, `design/`, `plan/` và **không gọi `build.py`**.
- Tự kiểm gộp 1 phiên Chrome: viết xong hết các cảnh được giao rồi gọi gộp `check.py <id> --scene C01S01,C01S02` (không gọi lẻ từng cảnh), mở ảnh xem đủ 6 khung theo danh sách mục 10, gom lỗi sửa dứt điểm trong 1 vòng.
- Bước D ý 3 (**SFX**): có thể chạy **cuốn chiếu** ngay khi cụm cảnh đầu tiên ở Bước C hoàn thiện `.tsx` (không cần đứng chờ 100% cảnh xong hết mới mở SFX).

### Bước D — Ráp, làm âm thanh và duyệt (đúng thứ tự)
1. `build.py <id> --strict` sạch lỗi.
2. `check.py <id>`: xem sheet cả phim — kiểm nhịp đổi sân khấu, tính liên tục trạng thái và sự đa dạng góc nhìn.
3. **SFX:** gọi tối đa 4 agent SFX song song đọc thẳng `.tsx` + `SOUND.md`, ghi `plan/sfx/C01_k.json`.
4. `audio.py <id>` → đọc `.build/sound_report.txt`, chỉnh tới khi lời rõ ở mọi cảnh.
5. **`review.py <id>`** → sửa hết `✗` và `⚠` (bao gồm cảnh báo lạm dụng bản đồ). Sửa `.tsx` làm đổi mốc thì cập nhật SFX và chạy lại `audio.py`.
6. `render.py <id> --to 60` kiểm chuyển động và âm thanh thật trước khi xuất cả phim.

## 4. Tư duy đạo diễn — Chọn sân khấu theo điều người xem cần hiểu

Vai trò của bạn là **nhà dựng**, không phải người minh hoạ từ khoá ("câu nhắc chữ gì vẽ hình nấy") và càng không phải người treo một tấm bản đồ rồi đẩy mũi tên suốt từ đầu tới cuối phim. Với mỗi đoạn lời dẫn, hỏi: *trước đó trạng thái là gì → sự kiện thay đổi quan hệ nào → góc nhìn nào làm thay đổi đó hiện ra trực diện nhất?*

| Khi câu chuyện nói về… | Sân khấu phải chọn | Tuyệt đối tránh |
|---|---|---|
| **Cách đánh, giao tranh, phục kích, cao độ đồi / chiến hào che khuất, tầm bắn thẳng / cầu vồng** | **`2D-NGANG` (`SideStage`)** hoặc **`2D-SA-BÀN` (`TopStage`)** có địa hình cục bộ, `Soldier2D`, xe/pháo 2D, `Fan2D`, `Muzzle2D`, `Tracer2D`, `ArcShot2D`, `Blast2D` | Treo bản đồ vệ tinh vĩ mô rồi chỉ nháy `Clash2D` hoặc cho hai ô `UnitMark` đụng nhau |
| **Vũ khí, hầm ngầm, công sự, lớp giáp, đầu đạn, nguyên lý hoạt động bên trong** | **`2D-MẶT-CẮT` (`SideStage mood="cutaway"`)** — mở vỏ mờ / mặt cắt / tách lớp theo một trục, `FocusBox` + `Callout` | Nói về bên trong mà chỉ vẽ vỏ ngoài hoặc giữ nguyên trên bản đồ |
| **Vị trí trên thế giới, hướng cơ động cấp chiến dịch, hình thái bao vây, tuyến tiếp tế dài** | **`MAP` (`GeoBase` / `SatBase`)** — đi từ rộng vào hẹp, xong ý địa lý là cắt ngay xuống trận địa 2D hoặc ảnh thật | Giữ nền bản đồ liên tục quá **18–20 s** hoặc chiếm quá **45–50%** thời lượng phim |
| **Con người thật, tướng lĩnh, diện mạo khí tài lịch sử, thương vong, đổ nát** | **`ẢNH & NHÂN VẬT` (`PhotoFull`, `PersonTitle`, `PersonDossier`, `PhotoCard`)** | Vẽ hình minh hoạ giả làm tư liệu lịch sử, hoặc ghim ảnh nhỏ mãi mà không dám cắt sang `PhotoFull` |

- **Cho xem biến đổi vật lý trước khi kết luận bằng ký hiệu:** Dấu X, nhãn chữ hay vòng khoanh chỉ xác nhận điều mắt người xem vừa thấy xảy ra (ví dụ: thấy quả đạn cầu vồng vọt qua sườn đồi rơi trúng nóc hầm rồi mới kết luận công sự bị triệt hạ; không đặt một dấu X thay cho toàn bộ nhân quả).
- **Phân biệt *gọi tên* và *giải thích*:** Một bộ phận chỉ sáng lên khi lời nhắc tên mới là định hướng; giải thích cơ chế hay chiến thuật đòi hỏi thấy *đầu vào tác động ở đâu → bộ phận / đội hình biến đổi thế nào → hệ quả lên phần tiếp theo*.
- **Dùng không gian làm bộ nhớ:** Khi giải thích tiếp cùng một tình huống chiến thuật hoặc cùng một hệ thống cơ khí, giữ nguyên sân khấu và các mốc định vị (bờ sông, mỏm đồi, khung vỏ ngoài) để sự thay đổi đọc được ngay — không dựng lại nền mới vô cớ mỗi khi sang câu mới, nhưng phải cắt dứt khoát khi chuyển từ cấp chiến dịch xuống cấp trận địa hoặc sang ví dụ khác.

## 5. Nguyên tắc vẽ 2D, Chiến thuật & Cơ chế (cốt lõi tạo hình)

### 5a. Nét vẽ & khối (`P`, `LINE` từ `@skill/military-2d/theme`)
- **Hình khối 2D giản lược, đường bao liền và rõ:** nét chính (`LINE.outer = 4`) tách bật dáng tổng thể; nét phụ bên trong (`LINE.inner = 2.25`) mảnh hơn để phân mảng mà không gây rối. Lược bỏ mọi chi tiết trang trí nhỏ không giúp nhận diện chủ thể hay hiểu cơ chế.
- **Đổ khối 2–3 tông nhất quán từ bảng `P`:** thân chính (`P.olive` cho phe ta / `P.enemy` đỏ gạch cho đối phương), mảng đón sáng trên nóc/tháp pháo (`oliveLight` / `enemyLight`), mảng tối gầm/bánh xích (`oliveDark` / `dark`), kính (`glass`), bao cát/đất hào (`sand` / `earth`). Nhân vật, phương tiện và công trình trong cùng video dùng chung một mức giản lược nét.
- **Chọn góc hình học trung thực:** ngang (`side`) cho dáng nhận dạng và hành động bắn/di chuyển; thẳng từ trên xuống (`top`) cho vị trí đội hình và góc quạt bắn; mặt cắt (`cutaway`) cho phần ẩn bên trong. **Không dùng góc chéo 3/4 làm mặc định, và không bóp méo hình ngang để giả góc mới.** Khi đổi góc của cùng một khí tài, giữ các dấu hiệu nhận dạng đặc trưng (dáng tháp pháo, số trục bánh, nòng, màu phe).

### 5b. Cỡ chủ thể & sử dụng khung hình (`fitBox`)
- **Chủ thể phải lớn và có sức nặng thị giác:** khởi đầu từ chủ thể / quan hệ cần đọc rồi mới bố trí nền. Với một khí tài, cụm cơ chế hay tổ chiến đấu, dùng `fitBox(box, 0.75..0.85)` để cụm chính chiếm khoảng **65–90% chiều khung** phù hợp dáng của nó; điểm tương tác quan trọng phải đọc rõ cả khi thu nhỏ cỡ màn hình điện thoại.
- **Không để khoảng trống vô nghĩa:** khoảng trống chỉ giữ khi cần cho hướng di chuyển, đường đạn bay, tầm quan sát `Fan2D` hoặc đối chiếu hai bên. Cho phép cận cảnh cắt tràn mép phần thân không thiết yếu, miễn giữ trọn điểm tiếp xúc và dấu nhận dạng. Một vật dài và mảnh (nòng pháo, tên lửa, tàu, tuyến hào) cần cận cảnh điểm tương tác hoặc bố cục tách khung, không kéo nhỏ ngang màn hình rồi bỏ trống trên dưới.

### 5c. Dựng tình huống chiến thuật (`SideStage` & `TopStage`)
- Ở cấp bản đồ vĩ mô thì dùng `UnitMark`; nhưng **khi câu chuyện đi vào hành động chiến thuật (vượt sông, đánh điểm cao, chống tăng trong phố, phục kích thung lũng), phải chuyển sang hình người lính (`Soldier2D`) và phương tiện/công sự 2D có biên dạng rõ**.
- Lớp hình xuất hiện theo câu hỏi, không bật tất cả ngay khung 0: dựng địa hình mốc (đồi, sông, đường, công sự) → lực lượng vào vị trí → bật `Fan2D` (vùng quan sát / góc bắn chết) đúng lúc phân tích → diễn biến nổ súng (`soldierSockets` → `Muzzle2D` → `Tracer2D` / `ArcShot2D` → `Blast2D`) → bỏ bớt vùng phủ `Fan2D` khi đã hiểu để không che diễn biến tiếp theo.
- Với so sánh chiến thuật ("cách cũ thất bại vs cách mới thành công"), giữ nguyên cùng một địa hình mốc và vị trí mục tiêu để người xem thấy ngay biến số nào tạo ra khác biệt.

### 5d. Dựng cơ chế & mặt cắt 2D (`SideStage mood="cutaway"`)
- **Ba mức quyền nhìn khi cần mổ xẻ:** vật thể nguyên vẹn trong bối cảnh → cụm chức năng (vỏ ngoài chuyển mờ `opacity={0.22}` hoặc cắt dọc lộ khoang trong, giữ đường bao vỏ làm mốc phần–toàn thể) → cận cảnh điểm tương tác kèm `FocusBox`.
- Tách lớp các bộ phận theo một trục thẳng rõ thứ tự lắp ghép; không cho linh kiện bay tứ tung để trang trí.
- Dùng màu nhấn (`P.amber`, `P.sky`, `M.red`) dẫn mắt theo đúng dòng truyền lực, luồng khí thuốc phóng, tia xuyên lõm hay tín hiệu điều khiển — chuyển giao màu tuần tự theo nhân quả, không tô sáng cả hệ thống cùng lúc.

## 6. Chuẩn bản đồ địa lý (khi ở sân khấu `MAP`)

- **Chọn nền theo bề ngang thật của khung nhìn:** từ ~400 km trở lên → `GeoBase` (vector thế giới). Dưới ~400 km → `SatBase` từ `satmap.py` (lấy rộng hơn ~30% để đẩy máy; `--px 3600` khi phóng > 1.5 lần).
- **Mọi điểm là `[kinh độ, vĩ độ]` thật** trong `src/parts/geo.ts` chiếu qua `proj.project()` / `proj.pts()`. Tầm bắn dùng `proj.km(km, tâm)`. Chỗ chỉ biết đại khái vẽ `feint` / `dashed` và ghi `// minh hoạ`.
- **Giữ cỡ nét khi phóng:** truyền `k={1 / zoom}` cho mọi ký hiệu `tactics` trong bản đồ đang phóng. Mỗi khung tối đa 3 `Arrow2D`, 6 `UnitMark`, 6 `MapLabel`.
- **Tiết chế thời lượng:** bản đồ chỉ làm nhiệm vụ định vị không gian lớn (≤ ~45% thời lượng cả phim, không quá ~18–20 s giữ nền bản đồ liên tục; ghim `PhotoCard` trên bản đồ vẫn tính là nền bản đồ).

## 7. Chuẩn ảnh tư liệu

- **Chỉ ảnh tĩnh** từ mọi nguồn trên web qua `img.py` (không dùng footage). Ảnh có cờ `risk` (hãng thông tấn, báo lớn) phải báo rõ trong `STORY.md` và báo cáo cuối; tương đương nhau thì ưu tiên kho lưu trữ mở (Wikimedia Commons, NARA, bảo tàng).
- **Đúng trước, đẹp sau:** sai khí tài / sai thời kỳ / sai địa điểm / sai người tệ hơn không có ảnh (thiếu ảnh đúng thì dựng bằng cảnh vẽ 2D!).
- **Hai vai rõ ràng:** `PhotoCard` ghim lên bản đồ / sa bàn ("ở điểm này ngoài đời trông ra sao", tối đa 2 thẻ cùng lúc); `PhotoFull` phủ toàn khung 3–7 s đẩy máy chậm (`focus` → `focusTo`) khi nói về con người, diện mạo thật của vũ khí hoặc hậu quả chiến trường (cạnh dài ≥ 1500 px, hoặc `fit="contain"`).
- Chốt một tông `grade` (`mono` mặc định) cho cả phim; `caption` tối đa ~6 từ đúng ngôn ngữ voice; `credit` mặc định tắt trừ khi người dùng yêu cầu hoặc giấy phép CC BY bắt buộc. Mỗi ảnh dùng một lần trừ khi cố ý gọi lại.

## 8. Nhân vật — khi lời đọc nhắc tên một người

Mỗi người được nhắc tên lần đầu (hoặc quay lại với vai mới) có thẻ nhân vật (`@skill/military-2d/person`), chọn theo vai trò:
- `PersonTitle` (3–6 s, toàn khung, ảnh ≥ 1100 px): ra mắt nhân vật trung tâm của phim / chương.
- `PersonCutout` (3–6 s, PNG đã `img.py cutout`): chỉ huy đang "đứng trên" bản đồ hoặc sa bàn chiến trường của mình; hai tướng đối đầu có thể đặt ở hai mép khung nhìn vào nhau (`flip`).
- `PersonDossier` (5–9 s): kể lý lịch, chức vụ, số phận — từng dòng gõ máy chữ khớp lời (`fieldAt`).
- `PersonNews` (2.5–4 s): nhân vật phụ nhắc lướt ở góc dưới, không làm chậm nhịp.
- Không dùng cùng một kiểu thẻ hai lần liên tiếp; cùng một người xuất hiện lại dùng kiểu nhẹ hơn lần trước; thiếu chân dung đáng tin thì dùng `Label`, cấm lấy ảnh người khác thế vào.

## 9. Chữ và âm thanh

- **Mặc định tiết chế chữ — để hình và biến đổi 2D tự kể chuyện:** trong cảnh vẽ 2D chiến thuật / cơ chế, chỉ đặt `Callout` / `Label` (`@skill/military/label`) khi hai vật giống nhau cần phân biệt hoặc có con số kỹ thuật / định danh thiết yếu voice vừa đọc (tối đa 2 nhãn cùng lúc, hết vai trò là tắt). Chữ gắn địa danh trên bản đồ dùng `MapLabel`. **Cấm tự viết thẻ `<text>` hay ép `fontFamily` trong `src/scenes/` và `src/parts/`.**
- **Luật 1 ngôn ngữ tuyệt đối:** Mọi chữ xuất hiện trên hình — từ `Callout`, `Label`, `MapLabel`, `Person*`, `PhotoCard caption` cho tới chữ nhỏ vẽ bên trong sơ đồ mặt cắt, biển hiệu hay đạo cụ `src/parts/` — **bắt buộc dùng duy nhất ngôn ngữ của `voice` (`plan/transcript.json`)**; cấm trộn từ tiếng Anh phổ thông vào video tiếng Việt hoặc ngược lại (chỉ giữ mã khí tài/đơn vị đo quốc tế như `T-72`, `B-52`, `mm`, `km`).
- **Âm thanh bắt buộc đủ 3 lớp** (`skills/sound-design/SKILL.md` + `skills/military-2d/SOUND.md`): nhạc nền + tiếng nền `amb` + SFX khớp đúng sân khấu `.tsx` — **trên bản đồ dùng tiếng khô tiết chế/xa, nhưng trong cảnh 2D hành động / cơ chế (`SideStage`, `TopStage`) phải đặt đủ tiếng khai hoả, đạn bay, nổ và chuyển động cơ khí khớp từng sự kiện trên hình**. Giọng đọc giữ nguyên bản.

## 10. Kiểm định chất lượng bằng AI Vision & Kiểm cấu trúc (`review.py`)

> `core/tools/check.py` chỉ là máy chụp lưới ảnh thuần tuý; trách nhiệm phát hiện lỗi thị giác, bố cục và ngôn ngữ chữ nằm 100% ở bước soi bằng mắt Vision dưới đây (**cấm mở ảnh lướt qua cho đủ thủ tục**).

### Kiểm định bằng mắt AI Vision (`out/checks/parts/*.png`, `out/checks/scenes/*.png` & `out/checks/sheet.png`)
Khi mở từng ảnh lưới bằng `read_file`, bắt buộc rà kỹ và xác nhận đủ 5 điểm trước khi chốt xong:
1. **Đọc rà toàn bộ chữ trên ảnh (OCR bằng mắt):** đọc từng từ hiện trên cả 6 khung (kể cả nhãn nhỏ trên bản đồ/sơ đồ/đạo cụ) đối chiếu ngôn ngữ `transcript.json` → có dù chỉ 1 từ lệch ngôn ngữ `voice`, cụt dấu, đè chữ/đè điểm tương tác hoặc tràn mép 5% là phải sửa ngay.
2. **Bỏ nhãn chữ đi, nhìn 6 khung còn đọc ra quan hệ / biến đổi chính không?** Nếu giữ ảnh tĩnh mà không mất lời giải thì chuyển động đang thừa hoặc sai trọng tâm.
3. **Cỡ chủ thể & khoảng trống:** xe, lính, cụm cơ chế hay khu vực giao chiến đã đủ lớn (`65–90%` vùng hữu ích, đọc rõ trên điện thoại) chưa, hay đang bị lọt thỏm giữa nền trống?
4. **Liên tục & vật lý 2D:** bánh/chân chạm đúng mặt đất `groundY`, miệng nòng `muzzle` khớp đúng chớp lửa `Muzzle2D`, đạn `ArcShot2D` chạm đất đúng giây `Blast2D` nổ, mặt cắt giữ đường bao nhận dạng của vật thể gốc.
5. **Nhịp sân khấu & tư liệu:** không treo nền bản đồ lê thê sang phần giải thích chiến thuật/giao tranh; ảnh tư liệu rõ nét, không dính watermark, `cutout` không khuyết đầu/vai.

### Kiểm cấu trúc & dữ liệu riêng của skill (`python3 skills/military-2d/tools/review.py <id>`)
Bắt các ràng buộc dữ liệu mà mắt nhìn ảnh tĩnh không tự thấy hết: import 3D · `<text>` / `fontFamily` tự viết ngoài component chuẩn · toạ độ gõ thẳng trên bản đồ · thiếu `k={1 / zoom}` khi phóng bản đồ · trùng `id` vùng `Zone2D` · mã `asset('aNNN')` thiếu / cỡ ảnh quá bé vỡ hạt / `cutout` chưa tách nền · tính hợp lệ JSON/mốc SFX, `audio.py` mới nhất · cảnh báo ảnh `risk`. Không giao video khi còn lỗi `✗` hoặc chưa qua AI Vision Audit.
