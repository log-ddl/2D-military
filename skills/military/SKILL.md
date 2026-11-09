---
name: military
description: Đạo diễn và dựng video giải thích quân sự từ voice bằng Remotion (cảnh thuần 2D SVG hoặc thuần 3D Three.js), mỗi video là một dự án độc lập trong projects/<id>/, dựng mô hình và dựng cảnh song song bằng subagent.
---

# Đạo diễn & dựng video (Remotion)

## 1. Cấu trúc — ai được sửa gì

```
voice/                     voice gốc
library/                   media dùng chung của NGƯỜI DÙNG (gồm cả library/brand/ chứa logo kênh) — agent chỉ đọc
mixamo/                    kho 2.446 clip mocap quang học Mixamo — chỉ tra cứu qua mixamo/manifest.csv (cấm quét hàng loạt .fbx)
bk_cache/                  kho đệm mô hình .blend tải từ BlenderKit & bk_cache/prepped/ (.glb chuẩn hoá dùng chung)
core/kit, skills/military/lib   code dùng chung — agent chỉ đọc khi dựng video; xem skills/military/CATALOG.md
projects/<id>/
  input/                   file người dùng thả vào hoặc file .glb đã qua bk.py prep; ingest.py xếp sang assets/
  assets/                  tài sản (voice, ảnh, footage, .glb, sfx, nhạc) + ASSETS.json; file `locked` của người dùng — agent chỉ đọc
  plan/                    transcript.json, voice_map.md (asr.py) · STORY.md, chapters/C01.md, C01.json, mix.json, sfx/
                           timeline.json SINH TỰ ĐỘNG (build.py)
  src/cues/C01.ts          agent chính (cues/index.ts SINH TỰ ĐỘNG)
  src/design/              bảng màu / ánh sáng dùng chung (agent chính)
  src/parts/               hình 2D dùng chung (agent chính); mô hình 3D lẻ src/parts/<Tên>.tsx do các subagent Bước A2 dựng song song
  src/scenes/C01S01.tsx …  mỗi file một cảnh, do đúng subagent Bước B được giao viết
  .build/, out/            SINH TỰ ĐỘNG — cấm sửa tay
```

**Độc lập tuyệt đối:** không đọc, không chép, không tham khảo code của dự án khác trong `projects/`. Chỉ dùng lại qua
`core/kit`, `skills/military/lib`, `library/` và `bk_cache/`. Muốn biết API thì đọc `CATALOG.md` và tài liệu Remotion (`remotion/docs/`) / three.js.
Mô hình 3D theo kiến trúc **Hybrid** (mục 5): khí tài chính & đạo cụ cận cảnh lấy từ **BlenderKit Full Plan** qua `core/tools/bk.py` (tải vào `bk_cache/` → chuẩn hoá bằng Blender dòng lệnh nền sang `.glb` → `input/` → `ingest.py`), kết hợp tự dựng bằng code (`geom.ts`) cho lõi cơ khí giải phẫu bên trong hoặc khối đặc thù không có sẵn; ảnh/footage thật chỉ lấy từ tài sản người dùng bỏ vào (`assets/`, `library/`).
Nhạc / SFX: theo `skills/sound-design/SKILL.md` — Epidemic Sound (MCP, mặc định) hoặc kho `library/` / Freesound CC0 / Mixkit qua `core/tools/sound_lib.py` (agent chỉ ghi vào `library/*/dl/`, `library/*/epidemic/` và `INDEX.json`).

## 2. Lệnh (chạy từ gốc repo; lệnh nào cũng chỉ đụng projects/<id>)

| Bước | Lệnh | Kết quả |
|---|---|---|
| Khởi tạo | `python3 core/tools/new.py <id> voice/x.mp3 --skill military [--from a --to b]` | khuôn `projects/<id>/` |
| Kho 3D BlenderKit | `python3 core/tools/bk.py search "q1" "q2" [-j 6] · fetch <id1> <id2>:bg [-j 6] · inspect-parts <id1> <id2> [-j 4] · prep <uuid> <out.glb> [--role hero\|bg] [--rig …] [--recolor #hex] [--save-cache <slug>] · list-prepped` | tìm / tải hàng loạt song song vào `bk_cache/` (không tải thumbnail mặc định; `:bg` lấy gói nhẹ 1K/0.5K) → soi tên mesh → chuẩn hoá `.glb` |
| Bộ binh & Mocap | `python3 core/tools/mocap.py search "q1" "q2" [-n 20] · mocap.py pack --out <anims.glb> --spec <clips.json> [--base-rig <slug>] · bk.py prep-actor <uuid> <out.glb> [--preset skills/military/presets/infantry_uniforms.json:<tên>] [--prop <vũ_khí.glb> \| --no-prop]` | tra `mixamo/manifest.csv` → đóng gói kho clip `.glb` (`NLA_TRACKS` + `.speeds.json`) · tuỳ biến trang phục & chuẩn hoá khung 67 xương Mixamo |
| Nhận file | `python3 core/tools/ingest.py <id>` | file trong `input/` → `assets/`, mã `aNNN` trong ASSETS.json |
| Mốc từ | `.venv/bin/python core/tools/asr.py <id>` | `plan/voice_map.md`, `transcript.json` |
| Ráp + kiểm kiểu | `python3 core/tools/build.py <id> [--strict]` | `.build/` từ `plan/chapters/`; cảnh lỗi → khung giữ chỗ + in lỗi |
| Kiểm mô hình | `python3 core/tools/check.py <id> --part M109,T72` | `out/checks/parts/<Tên>.png` (4 góc, chụp gộp 1 phiên; tự kiểm `tsc` cô lập, không cần `build.py`; `--part all` chụp hết) |
| Kiểm cảnh | `python3 core/tools/check.py <id> --scene C01S03,C01S07` | `out/checks/scenes/C01S03.png` (6 khung, rộng 960; `tsc` incremental cô lập, tự bỏ qua cảnh chưa đổi code; thêm `--force` để ép chụp lại) |
| Âm thanh | `python3 core/tools/sound_lib.py search "…"` · `.venv/bin/python core/tools/sound_lib.py get fs:ID` · `.venv/bin/python core/tools/audio.py <id>` | kho `library/`; `.build/public/{voice.mp3,music.wav,sfx.wav,master.json}` + `.build/sound_report.txt` (agent âm thanh, mục 7) |
| Sheet cả video | `python3 core/tools/check.py <id>` | `out/checks/sheet.png` |
| Xem / xuất | `python3 core/tools/render.py <id> --studio` · `python3 core/tools/render.py <id> [--chapter CNN] [--no-music] [--no-sfx]` | Studio port riêng (bảng Props: music, sfx) · `out/video.mp4` (hoặc xuất thử 1 chương `--chapter CNN`) |

**Video dài (khoảng 8–10 phút trở lên): đọc thêm `skills/long-video/SKILL.md` và làm theo chương.** Skill đó
thay Bước A1–C dưới đây bằng: chốt base + mỹ thuật cả phim trong `plan/STORY.md` → plan từng chương song song (`plan/chapters/CNN.*`,
`src/cues/CNN.ts`, id cảnh `C03S05`) → dựng cảnh song song → kiểm theo chương và chỗ nối (`check.py --chapter`, `--seams`).
Mọi chuẩn chất lượng mục 4–7 giữ nguyên.

Không dùng nút mắt/loa trên timeline Studio: nó ghi `hidden` thẳng vào code dùng chung (ảnh hưởng mọi dự án và bản xuất). Bật/tắt nhạc, sfx bằng bảng Props.

## 3. Quy trình

Video ngắn là một chương `C01` (`new.py` đã tạo `plan/chapters/C01.json` phủ cả voice). Id cảnh `C01S01`, `C01S02`…; mốc CUE `c01_…`.

### Bước A1 — Agent chính khoá chuẩn đạo diễn (một đầu não thống nhất)
1. `new.py`, `ingest.py` (nếu người dùng thả file vào `input/`), `asr.py`, đọc `plan/voice_map.md`. Xem `assets/ASSETS.json`, `library/` và `bk.py list-prepped` (hoặc `bk.py search`) để nắm mô hình 3D sẵn có. *(Khi có nhiều khí tài cần số liệu thực tế hoặc cần tìm mã UUID trên BlenderKit, có thể gọi 1 subagent chạy song song lúc chờ `asr.py`; không xé lẻ việc chia cảnh cho nhiều subagent).*
2. Trực tiếp viết `plan/STORY.md` theo template: **thiết kế mỹ thuật riêng cho video này** (không khí, giờ trong ngày, bảng màu
   2D và 3D, ngôn ngữ camera, chất liệu, ngôn ngữ chữ trên hình khớp `transcript.json`, vị trí gắn Logo Kênh 3D), bảng tài sản `src/parts/` ghi rõ **file đích, kích thước mét thật 1:1, nguồn (`bk-rig` / `bk-prop` / `code-3d`) và chữ ký `props`** cho từng mô hình 3D lẫn hình chiếu 2D dùng chung (để hình dáng 2D và 3D đồng bộ tuyệt đối); và `plan/chapters/C01.md` (template CHAPTER.md) với bảng phân cảnh (`Góc máy & diễn biến`).
3. Viết mảng `scenes` trong `plan/chapters/C01.json`: `{"id":"C01S01","from":0,"to":20.4,"type":"code","transition":"fade"}`
   — cảnh liền mạch (`from` = `to` cảnh trước, phủ đúng chương), `transition` của cảnh k là cú chuyển VÀO cảnh k: `fade` (mặc định), `slide:from-right`, `wipe:from-left`, `flip:from-top`, `clockWipe`.
4. Viết `src/cues/C01.ts` (`export const CUE = {...} as const`: mọi mốc sự kiện đặt tên theo cảnh `c01_s03_fire`) và bảng màu/ánh sáng dùng chung `src/design/` (chỉ màu và ánh sáng; chữ dùng `<Label>` / `<Callout>`, xem mục 7).
5. **Gọi ngay 1 subagent nhạc nền chạy nền** (prompt theo `skills/sound-design/SKILL.md` mục 4 — Pha 1, kèm nguyên văn yêu cầu âm thanh của người dùng nếu có và **nguồn: Epidemic (mặc định) hay free** nếu người dùng chọn; đọc thêm `skills/military/SOUND.md`). Nó viết `plan/mix.json` (nhạc + `stages` + `amb`) song song với A2/B; không chờ nó. **Chưa làm SFX ở bước này** — SFX chỉ chạy ở Bước C sau khi đã có code cảnh `.tsx` thực tế.

### Bước A2 — Chuẩn hoá `.glb` qua Blender nền & Subagent dựng mô hình 3D song song (khoá xong mới sang Bước B)
- **Không gối Bước B khi chưa khoá xong Bước A2** (để đồng bộ tuyệt đối tỉ lệ/chi tiết giữa 2D và 3D, không đụng `src/parts/`).
- **Tải & chuẩn hoá mô hình BlenderKit hàng loạt song song trước khi giao bọc `parts/`:** gộp toàn bộ từ khoá vào 1 lệnh `bk.py search "q1" "q2" … -j 6`, tải gộp toàn bộ mã UUID trong 1 lệnh `bk.py fetch <hero_id> <bg_id>:bg … -j 6` (tuyệt đối không gọi lẻ tuần tự từng mô hình; mặc định không tải thumbnail, đạo cụ nền gắn hậu tố `:bg` để lấy gói 1K/0.5K nhẹ máy), soi gộp tên mesh bằng `bk.py inspect-parts <id1> <id2> … -j 4`, rồi chuẩn hoá sang `projects/<id>/input/<tên>.glb` bằng `bk.py prep` (chạy `Blender --background --factory-startup --python ...`, cho phép chạy song song nhiều tiến trình `prep` độc lập) và gọi `ingest.py <id>` một lượt để cấp mã `aNNN` trong `ASSETS.json` (kèm `--save-cache <slug>` cho khí tài hay gặp).
- **Mô hình 3D (`src/parts/`) → giao subagent dựng song song** (chỉ 1 mô hình thì Agent chính hoặc 1 subagent làm; có nhiều khí tài 3D khác nhau mới chia nhiều subagent song song — **không tách rời động cơ/bộ phận của cùng một khí tài thành part trưng bày riêng dưới đất**):
  - Mỗi subagent 3D chỉ tạo/sửa đúng 1–2 file được giao `src/parts/<Tên>.tsx`: bọc `.glb` qua `<GltfRig>` / `<GltfPart>` (`@skill/military/3d/gltf`), gắn khớp chuyển động, gắn `<BrandDecal>` nếu là khí tài chính và lồng lõi cơ khí giải phẫu ngay đúng vị trí bộ phận đó trên thân/cánh của chính khí tài khi kịch bản cần mổ xẻ (hoặc tự dựng bằng `loft`/`sweep`/`revolve`/`extrude` nếu BlenderKit không có đúng chủng loại). Cuối file khai `export const preview = turntable(<Tên>, { size: …, center: … });` (`@skill/military/3d/turntable`).
  - **Tự kiểm 4 góc bắt buộc:** mỗi subagent 3D gọi thẳng `python3 core/tools/check.py <id> --part <Tên>` (tự kiểm `tsc` cô lập trên đúng file đó, **không gọi `build.py`**) → đọc `out/checks/parts/<Tên>.png`, sửa ít nhất 1 vòng (hướng mặt trước `+X`, đúng chủng loại/biên dạng, tỉ lệ, khớp chuyển động, không chồng lưới Z-fighting) tới khi đạt.
- **Hình 2D & Bản đồ dùng chung (`src/parts/*`) → Agent chính tự vẽ trực tiếp bằng SVG** ngay trong lúc chờ các subagent 3D chạy ngầm (bản đồ địa lý dùng `<GeoMap>` từ `@skill/military/2d/map` để lên đúng đường bờ biển/biên giới thực tế; khí tài 2D quy đổi từ kích thước mét thật đã chốt ở A1, đổ khối 2–3 tông sáng/tối + viền nhất quán).
- Khi toàn bộ subagent 3D báo xong: Agent chính chạy `python3 core/tools/build.py <id>` sạch lỗi và duyệt nhanh ảnh `out/checks/parts/*.png` (`check.py <id> --part all`) trước khi mở Bước B.

### Bước B — Subagent dựng cảnh song song (dây chuyền cuốn chiếu)
- Chia cảnh thành 2–8+ nhóm tuỳ độ dài video; **mỗi subagent tối đa 2 cảnh 3D** (3D tốn công hơn 2D). Nếu ≤6 nhóm thì gọi song song một lượt; nếu >6 nhóm thì chạy **dây chuyền cuốn chiếu giữ ~6 subagent hoạt động liên tục** — hễ 1 subagent xong là bù ngay nhóm tiếp theo, không chia đợt cứng đứng chờ subagent chậm nhất (giữ prompt giao việc gọn, tham chiếu chi tiết từ `C01.md`). Mỗi prompt BẮT BUỘC có:
  1. Đọc: SKILL.md này, `plan/STORY.md`, `plan/chapters/C01.md`, `C01.json`, `src/cues/C01.ts`, `skills/military/CATALOG.md`, `assets/ASSETS.json`, các file trong `src/design/`, `src/parts/` liên quan.
  2. Danh sách file duy nhất được tạo/sửa: `src/scenes/C01Sxx.tsx` của nhóm mình. Không sửa `parts/`, `design/`, `cues/`, `plan/`, file nhóm khác; **không gọi `build.py`**.
  3. Mỗi file: `const C01Sxx: React.FC = () => { const t = useT(); … }; export default C01Sxx;` (`useT` từ `@core/time`: giây voice tuyệt đối).
  4. Lời thoại + mốc `CUE.*` + góc máy & diễn biến cảnh lấy từ `C01.md`.
  5. **Tự kiểm hình bắt buộc:** vòng 1 gọi `python3 core/tools/check.py <id> --scene C01Sxx,C01Syy`; từ vòng sửa thứ 2 trở đi **chỉ gọi riêng cảnh vừa sửa** (`check.py <id> --scene C01Syy`) để không render lại cảnh đã đạt → đọc ảnh `out/checks/scenes/C01Sxx.png`, sửa ít nhất một vòng (tự điều chỉnh cự ly camera xa/gần theo ảnh thực tế để chủ thể/sải cánh/thước đo nằm trọn trong khung không bị cắt cụt, kiểm độ rõ chủ thể, chữ đè, lỗi hình). Báo lại: đã kiểm gì, còn gì chưa ổn, mốc giây các sự kiện lớn cho SFX.
- Tool chạy song song an toàn: `check.py` lần chính xác cây `import` / khoá `CUE` / asset của từng cảnh và mô hình (sửa 1 part hay chạy `build.py` không làm mất cache của cảnh không liên quan), giữ cache `tsc` incremental riêng trong `.build/check/`, hạ `--scale` khớp đúng kích thước ô kiểm hình và điều tiết tối đa 4 tiến trình Chrome render đồng thời.

### Bước C — Dựng SFX song song (tối đa 4 subagent) từ `.tsx`, ráp & kiểm
Ngay khi các subagent Bước B dựng xong `src/scenes/C01S*.tsx`: chia các cảnh thành **tối đa 4 cụm cảnh chạy song song bởi tối đa 4 subagent SFX** (theo `skills/sound-design/SKILL.md` mục 4 — Pha 2 + `skills/military/SOUND.md`; mỗi subagent `k` chỉ đọc các `src/scenes/C01Sxx.tsx` thuộc cụm mình để viết riêng `plan/sfx/C01_k.json` khớp từng mốc `<Explosion`/`<MuzzleBlast`/va chạm và khoảng chuyển động `prog(t, a, b)`, không tự viết script giả lập trộn âm trên RAM; có thể chạy `build.py --strict` + `check.py <id>` song song trong lúc chờ 4 subagent SFX) → khi cả 4 subagent SFX xong, chạy `.venv/bin/python core/tools/audio.py <id>` (tự động gộp mọi `plan/sfx/*.json`, kiểm bảng đối chiếu `.tsx` mục 5 lẫn `.build/sound_report.txt`, mục ⚠) → sửa hoặc giao lại cảnh hỏng nếu có. *(Khi sửa lỗi hình ảnh thuần `.tsx` ở vòng kiểm mà không đổi mốc nổ/chuyển động, `plan/mix.json` hay `plan/sfx/`, không chạy lại `audio.py` — chỉ chạy `build.py --strict` rồi `check.py`; nếu sửa `.tsx` làm đổi mốc sự kiện thì cập nhật đúng file `plan/sfx/C01_k.json` chứa cảnh đó và chạy lại `audio.py`).*

## 4. Tư duy đạo diễn
- Mỗi cảnh thuần 2D hoặc thuần 3D (cảnh 3D chỉ được đè `<Label>` / `<Callout>` HTML khi thật sự cần). Xen kẽ theo nội dung: sơ đồ, mặt cắt, bản đồ, đồ thị → 2D; khối, địa hình, quỹ đạo trong không gian, quy mô → 3D. Bản đồ / sơ đồ 2D chỉ giữ ngắn gọn đúng đoạn nói về vị trí địa lý, tuyến đường hoặc chiến thuật rồi cắt ngay sang cảnh 3D hành động (không treo cảnh 2D tĩnh lê thê).
- **Chia cảnh theo bối cảnh & tính liên tục vật lý (thường 12–28s/cảnh):** mỗi cảnh chỉ chứa một không gian / thời điểm nhất quán; khi lời đọc chuyển địa điểm, đổi ngày/đêm hoặc đổi sang bối cảnh khác thì tách thành cảnh mới. Mọi vật thể trong cảnh phải tồn tại xuyên suốt hoặc di chuyển từ ngoài vào / ra khỏi khung hình theo quỹ đạo liên tục — **tuyệt đối cấm dùng điều kiện thời gian (`t >= X && ...`, `phase === ...`) để bật/tắt làm vật thể tự dưng hiện ra hoặc biến mất giữa cảnh**.
- Không hai cảnh liền nhau cùng góc máy / cùng bố cục; luân phiên ngang, trực diện, từ trên, 3/4, mặt cắt, POV.
- Camera luôn có chủ đích: lia theo chủ thể, kéo lùi mở đại cảnh, đẩy vào chi tiết (tự căn khoảng cách xa/gần theo kích thước thật của từng loại vũ khí khi xem ảnh chụp `check.py`, không để thân/sải cánh/thước đo bị cắt cụt). 2D: `Cam2D` + `handheld`. 3D: `Cam` nội suy `pos/look` (hoặc `SplineCam` khi cần lượn đường cong).
- Màu, ánh sáng, nền theo thiết kế mỹ thuật của chính video (`STORY.md`), không theo một khuôn chung.

## 5. Chất lượng 3D (bắt buộc)
- **Kiến trúc Hybrid 3D (BlenderKit Full Plan + Blender nền + Lõi cơ khí tự dựng):**
  - **Khí tài chính (`hero`) & Đạo cụ cận cảnh (`prop`):** Ưu tiên tìm đúng chủng loại trên BlenderKit (`bk.py search` → `bk.py fetch` lưu vào `bk_cache/`), kiểm tra cấu trúc mesh bằng `bk.py inspect-parts`, rồi chuẩn hoá qua dòng lệnh nền `bk.py prep` (`Blender --background --factory-startup --python ...`): xoay mũi chuẩn về `+X`, đặt đáy chạm `Y=0`, ép đúng kích thước mét thật (`--length`/`--height`), giữ nguyên hoặc giảm nhẹ giữ ~45k–65k mặt cho vật thể chính cận cảnh (`--role hero`), **chỉ gắn `Decimate` mạnh (`--role bg`, ~0.2–0.3) cho đồ nền ở xa**. Khi cần xoay bộ phận (cánh nghiêng, cánh quạt, tháp pháo, nòng, càng đáp) thì khai báo `--rig <rig.json>`; khi bản gốc mang màu dân sự/cứu hộ quá chói hoặc dính chữ/logo không hợp bối cảnh thì dùng `--recolor <#hex>` hoặc `replaceMaterial`. Không lấy sai chủng loại phương tiện và không đè chồng hai lớp lưới gây Z-fighting.
  - **Bộ binh & Nhân vật 3D (`<Soldier3D>`, `@skill/military/3d/actor`):** Chỉ đưa con người vào cảnh khi lời đọc thực sự nói tới hành động của con người (không đặt người hay hình nộm đứng làm cảnh vô nghĩa bên ngoài khí tài). Nhân vật bắt buộc lấy từ phôi người Blender qua `bk.py prep-actor` ghép trang phục theo preset (`skills/military/presets/infantry_uniforms.json` hoặc `--no-prop` / gỡ giáp mũ đúng vai nhân vật). Chuyển động lấy từ `mixamo/manifest.csv` đóng gói qua `mocap.py pack`; đặt `speed = v / speed_mps` (`SOLDIER_CLIP_SPEEDS`) để không trượt chân.
  - **Lõi cơ khí giải phẫu & Khối đặc thù:** Khi thuyết minh về động cơ, cánh quạt, càng đáp hay khoang bên trong, **phải hiển thị/mổ xẻ ngay tại đúng vị trí bộ phận đó trên chính khí tài** (mở/làm mờ vỏ bầu động cơ hoặc thân trên chính chiếc máy bay/xe tăng đó), tuyệt đối không đặt thêm một cục động cơ hay bộ phận rời thứ hai dưới đất bên cạnh khí tài. Dùng `loft`, `sweep` + `airfoil`, `lathe` / `revolve`, `extrude`, `shell`, `rbox`, `Wheel`, `Track`, `Rivets`, `pipe` để lồng khớp bên trong vỏ `.glb` hoặc dựng khí tài hiếm không có trên BlenderKit. Dùng `rad(độ)` từ `@core/time` cho góc xoay radian trong 3D. Kiểm 4 góc bằng `--part` trước khi dùng.
- **Chất liệu sơn PBR & Mổ xẻ liền mạch:** giữ nguyên sơn PBR gốc (`BaseColor`, `Roughness`, `Metallic`, `Normal`, `AO`) nướng sẵn từ Blender trên vỏ ngoài `.glb` (hoặc thay bằng vật liệu PBR sạch `panelPaint()`, `armorPlate()`, `machined()`, `glass()`, `paint()` với `repeat: 0.35–0.5` cho mảng `extrude` lớn). Khi cần mổ xẻ cấu tạo theo lời thoại: dùng `<GltfRig>` (`ghostNodes` + `cutaway` chuyển mượt vỏ ngoài sang lớp kính X-Ray Fresnel lộ cụm cơ khí bên trong) hoặc `<GltfPart>` (`clipPlanes` cắt mặt phẳng trượt động kèm viền laser HDR phát sáng + `<CutawayLayer>`).
- **Môi trường kết hợp (Địa hình code rộng + Đạo cụ môi trường BlenderKit):** đại cảnh rộng hàng km dùng code shader (`terrain.tsx`) để liền mạch và giữ tốc độ xuất hình nhanh: mặt đất tự nhiên dùng `heightField` + `Terrain` + `Scatter`; biển/sông dùng `Water` (có `wakes`); đường băng, boong tàu, nhà chứa lớn hoặc không gian studio/sa bàn kỹ thuật dùng `Surface` (`runway`/`asphalt`/`deck`/`studio`) + `<ContactShadow>`. Đạo cụ môi trường cận cảnh nhiều chi tiết vụn (boong-ke, công sự, xe hậu cần, trạm radar, nhà đổ nát, rào chắn) lấy từ BlenderKit đặt lên nền code. Nếu dùng `<SplineCam>` trong nhà chứa kín, gắn `userData={{ noCollide: true }}` (hoặc `noCollide` trên `GltfPart`/`GltfRig`) cho vỏ nhà chứa.
- **Gắn Logo Kênh tự nhiên trong thế giới 3D (`@skill/military/3d/brand`):** logo kênh đồng bộ tự động từ `library/brand/`. Mặc định **không** dán watermark 2D cứng ở góc màn hình; thay vào đó gắn tinh tế vào không gian 3D như `<BrandDecal>` sơn stencil low-vis ôm sát mặt cong cánh đứng đuôi / thân khí tài (`target={root}` trong `GltfRig`), `<BrandWallMark>` hoặc `<BrandPlate>`.
- **Hiệu ứng & góc máy:** dùng `Explosion`, `MuzzleBlast`, `JetPlume` (luồng phản lực/tên lửa), `RotorBlur` (cánh quạt/chân vịt quay nhanh), `SmokeColumn`, `DustTrail`, `Trail` — không dùng quả cầu trơn làm vụ nổ hay thanh trụ cứng đờ làm luồng đạn. Tránh đặt quỹ đạo camera đi xuyên trùng dọc theo vector kéo dài của `<Trail>` đầu cánh/đạn để vệt khói không bị chiếu suy biến thành vạch thẳng đứng.
- Cảnh 3D hiển thị sớm 0.2 s và chồng chuyển cảnh 0.4 s: khung đầu đã phải đầy đủ.

## 6. Chất lượng 2D
- Bản đồ địa lý bắt buộc dùng `<GeoMap>` (`@skill/military/2d/map`) với dữ liệu đường bờ biển & biên giới thực tế (Natural Earth) và phép chiếu kinh-vĩ độ `proj.project([lon, lat])` — cấm tự gõ mảng đa giác ít đỉnh vẽ lục địa/quốc gia méo mó.
- Chủ thể 2D vẽ có biên dạng đúng (theo kích thước thật, đồng bộ với mô hình 3D), có khối (2–3 tông sáng/tối), viền nhất quán; dùng `Defs2D` (bóng `#sh`), `Grain`.
- Tránh gắn trực tiếp `filter="url(#glow)"` lên đường chéo dài bên trong nhóm đang phóng/thu của `<Cam2D>` (tránh lỗi cắt viền ô filter của Chromium); ưu tiên vẽ nét kép (halo mờ bản rộng + lõi sáng) hoặc đặt `<Defs2D>` ngoài `<Cam2D>`.
- Nền có chiều sâu (`skyline` nhiều lớp, `contours` cho bản đồ), không để mảng màu phẳng trống.
- Hiệu ứng `Blast2D`, `Muzzle2D`, `Puff2D`; quỹ đạo `arcPath` + `drawOn`.

## 7. Chữ & âm thanh
- **Chữ: mặc định không có chữ** (85–90% cảnh 3D để hình ảnh tự kể chuyện; cấm treo biển tiêu đề góc khung kiểu hộp UI suốt cảnh). Chỉ khi thật sự cần nêu một kích thước hoặc định danh kỹ thuật ngắn (1–3 từ / con số) mà hình không tự nói được: dùng `<Measure3D>` (`@skill/military/3d/parts`) cho kích thước phối cảnh 3D, hoặc `<Label>` / `<Callout>` (`@skill/military/label`) — chỉ bật đúng vài giây đang đọc tới thông số đó rồi tắt ngay trước khi camera chuyển góc khác. Cấm tự viết thẻ `<text>` SVG hay ép `fontFamily` / khung hộp tự chế trong cảnh.
- **Ngôn ngữ chữ trên màn hình bắt buộc trùng 100% với ngôn ngữ của `voice` (`plan/transcript.json`):** nếu voice là tiếng Anh thì toàn bộ chữ trên hình (`<Label>`, `<Callout>`, `<Measure3D>`, chữ trên bản đồ 2D) phải viết bằng tiếng Anh; nếu voice là tiếng Việt thì viết bằng tiếng Việt. Tuyệt đối không trộn lẫn hai ngôn ngữ.
- Âm thanh tách 2 pha theo `skills/sound-design/SKILL.md` + công thức quân sự `skills/military/SOUND.md`: **agent nhạc nền** (Bước A1 ý 5) dựng `plan/mix.json` (`"version": 2`, nhạc + `stages` + `amb` liền mạch), **tối đa 4 agent SFX chạy song song** (Bước C, sau khi có `.tsx`) đọc thẳng cụm `src/scenes/*.tsx` được giao và ghi `plan/sfx/C01_1.json`..`C01_4.json` khớp từng chuyển động/vụ nổ rồi Agent chính chạy `audio.py` kiểm lời rõ / khớp hình / không đứt tiếng / loa điện thoại. `"sfx"` trong `plan/chapters/C01.json` để trống. Giọng đọc giữ nguyên bản.
- **Yêu cầu âm thanh của người dùng đứng trên mọi mặc định** (chép nguyên văn vào prompt agent âm thanh và `"_user"` trong mix.json).
- Ưu tiên dùng media người dùng đã đưa vào (`assets/`, `library/`). Nhạc / SFX tổng hợp (`synth`) chỉ là đường lùi khi không có mạng.
