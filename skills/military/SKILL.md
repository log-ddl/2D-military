---
name: military
description: Đạo diễn và dựng video giải thích quân sự từ voice bằng Remotion (cảnh thuần 2D SVG hoặc thuần 3D Three.js), mỗi video là một dự án độc lập trong projects/<id>/, dựng mô hình và dựng cảnh song song bằng subagent.
---

# Đạo diễn & dựng video (Remotion)

## 1. Cấu trúc — ai được sửa gì

```
voice/                     voice gốc
library/                   media dùng chung của NGƯỜI DÙNG — agent chỉ đọc
core/kit, skills/military/lib   code dùng chung — agent chỉ đọc khi dựng video; xem skills/military/CATALOG.md
projects/<id>/
  input/                   NGƯỜI DÙNG thả file vào; ingest.py xếp sang assets/
  assets/                  tài sản (voice, ảnh, footage, sfx, nhạc) + ASSETS.json; file `locked` của người dùng — agent chỉ đọc
  plan/                    transcript.json, voice_map.md (asr.py) · STORY.md, chapters/C01.md, C01.json, mix.json (agent chính)
                           timeline.json SINH TỰ ĐỘNG (build.py)
  src/cues/C01.ts          agent chính (cues/index.ts SINH TỰ ĐỘNG)
  src/design/              bảng màu / ánh sáng dùng chung (agent chính)
  src/parts/               hình 2D dùng chung (agent chính); mô hình 3D lẻ src/parts/<Tên>.tsx do các subagent Bước A2 dựng song song
  src/scenes/C01S01.tsx …  mỗi file một cảnh, do đúng subagent Bước B được giao viết
  .build/, out/            SINH TỰ ĐỘNG — cấm sửa tay
```

**Độc lập tuyệt đối:** không đọc, không chép, không tham khảo code của dự án khác trong `projects/`. Chỉ dùng lại qua
`core/kit`, `skills/military/lib` và `library/`. Muốn biết API thì đọc `CATALOG.md` và tài liệu Remotion (`remotion/docs/`) / three.js.
Không tải mô hình 3D hay hình ảnh từ ngoài: mô hình tự dựng; ảnh/nhạc/sfx thật chỉ lấy từ tài sản người dùng bỏ vào (`assets/`, `library/`).

## 2. Lệnh (chạy từ gốc repo; lệnh nào cũng chỉ đụng projects/<id>)

| Bước | Lệnh | Kết quả |
|---|---|---|
| Khởi tạo | `python3 core/tools/new.py <id> voice/x.mp3 --skill military [--from a --to b]` | khuôn `projects/<id>/` |
| Nhận file | `python3 core/tools/ingest.py <id>` | file trong `input/` → `assets/`, mã `aNNN` trong ASSETS.json |
| Mốc từ | `.venv/bin/python core/tools/asr.py <id>` | `plan/voice_map.md`, `transcript.json` |
| Ráp + kiểm kiểu | `python3 core/tools/build.py <id> [--strict]` | `.build/` từ `plan/chapters/`; cảnh lỗi → khung giữ chỗ + in lỗi |
| Kiểm mô hình | `python3 core/tools/check.py <id> --part M109,T72` | `out/checks/parts/<Tên>.png` (4 góc, chụp gộp 1 phiên; tự kiểm `tsc` cô lập, không cần `build.py`; `--part all` chụp hết) |
| Kiểm cảnh | `python3 core/tools/check.py <id> --scene C01S03,C01S07` | `out/checks/scenes/C01S03.png` (6 khung, rộng 960; `tsc` incremental cô lập, tự bỏ qua cảnh chưa đổi code; thêm `--force` để ép chụp lại) |
| Âm thanh | `.venv/bin/python core/tools/audio.py <id>` | `.build/public/{voice.mp3,music.wav,sfx.wav}` |
| Sheet cả video | `python3 core/tools/check.py <id>` | `out/checks/sheet.png` |
| Xem / xuất | `python3 core/tools/render.py <id> --studio` · `python3 core/tools/render.py <id> [--no-music] [--no-sfx]` | Studio port riêng (bảng Props: music, sfx) · `out/video.mp4` (chỉ khi được yêu cầu) |

**Video dài (khoảng 8–10 phút trở lên): đọc thêm `skills/long-video/SKILL.md` và làm theo chương.** Skill đó
thay Bước A1–C dưới đây bằng: chốt base + mỹ thuật cả phim trong `plan/STORY.md` → plan từng chương song song (`plan/chapters/CNN.*`,
`src/cues/CNN.ts`, id cảnh `C03S05`) → dựng cảnh song song → kiểm theo chương và chỗ nối (`check.py --chapter`, `--seams`).
Mọi chuẩn chất lượng mục 4–7 giữ nguyên.

Không dùng nút mắt/loa trên timeline Studio: nó ghi `hidden` thẳng vào code dùng chung (ảnh hưởng mọi dự án và bản xuất). Bật/tắt nhạc, sfx bằng bảng Props.

## 3. Quy trình

Video ngắn là một chương `C01` (`new.py` đã tạo `plan/chapters/C01.json` phủ cả voice). Id cảnh `C01S01`, `C01S02`…; mốc CUE `c01_…`.

### Bước A1 — Agent chính khoá chuẩn đạo diễn (một đầu não thống nhất)
1. `new.py`, `ingest.py` (nếu người dùng thả file vào `input/`), `asr.py`, đọc `plan/voice_map.md`. Xem `assets/ASSETS.json` và `library/` có ảnh/footage/sfx/nhạc nào của người dùng để dùng. *(Khi có nhiều khí tài cần số liệu thực tế, có thể gọi 1 subagent `research` tra kích thước thật song song lúc chờ `asr.py`; không xé lẻ việc chia cảnh cho nhiều subagent).*
2. Trực tiếp viết `plan/STORY.md` theo template: **thiết kế mỹ thuật riêng cho video này** (không khí, giờ trong ngày, bảng màu
   2D và 3D, ngôn ngữ camera, chất liệu), bảng tài sản `src/parts/` ghi rõ **file đích, kích thước mét thật 1:1 và chữ ký `props`** cho từng mô hình 3D lẫn hình chiếu 2D dùng chung (để hình dáng 2D và 3D đồng bộ tuyệt đối); và `plan/chapters/C01.md` (template CHAPTER.md) với bảng phân cảnh.
3. Viết mảng `scenes` trong `plan/chapters/C01.json`: `{"id":"C01S01","from":0,"to":26.2,"type":"code","transition":"fade"}`
   — cảnh liền mạch (`from` = `to` cảnh trước, phủ đúng chương), `transition` của cảnh k là cú chuyển VÀO cảnh k: `fade` (mặc định), `slide:from-right`, `wipe:from-left`, `flip:from-top`, `clockWipe`.
4. Viết `src/cues/C01.ts` (`export const CUE = {...} as const`: mọi mốc sự kiện đặt tên theo cảnh `c01_s03_fire`) và bảng màu/ánh sáng dùng chung `src/design/` (chỉ màu và ánh sáng; chữ dùng `<Label>`, xem mục 7).

### Bước A2 — Subagent dựng mô hình 3D song song, Agent chính vẽ hình 2D dùng chung (khoá xong mới sang Bước B)
- **Không gối Bước B khi chưa khoá xong Bước A2** (để đồng bộ tuyệt đối tỉ lệ/chi tiết giữa 2D và 3D, không đụng `src/parts/`).
- **Mô hình 3D (`src/parts/`) → giao subagent dựng song song** (chỉ 1 mô hình nhỏ thì Agent chính tự làm; từ 2 mô hình 3D trở lên thì gọi 2–5 subagent song song):
  - Mỗi subagent 3D chỉ tạo/sửa đúng 1–2 file được giao `src/parts/<Tên>.tsx` (nếu có đạn/phụ kiện gắn chung trên nhiều xe/máy bay thì chốt file phụ kiện trước hoặc gộp vào một nhóm rõ ràng). Cuối file khai `export const preview = turntable(<Tên>, { size: …, center: … });` (`@skill/military/3d/turntable`).
  - **Tự kiểm 4 góc bắt buộc:** mỗi subagent 3D gọi thẳng `python3 core/tools/check.py <id> --part <Tên>` (tự kiểm `tsc` cô lập trên đúng file đó, **không gọi `build.py`**) → đọc `out/checks/parts/<Tên>.png`, sửa ít nhất 1 vòng (biên dạng, tỉ lệ, khớp chuyển động, UV sơn) tới khi đạt.
- **Hình 2D dùng nhiều cảnh (`src/parts/*`) → Agent chính tự vẽ trực tiếp bằng SVG như chuẩn cũ** ngay trong lúc chờ các subagent 3D chạy ngầm (quy đổi từ kích thước mét thật đã chốt ở A1, đổ khối 3 tông sáng/trung/tối + viền nhất quán).
- Khi toàn bộ subagent 3D báo xong: Agent chính chạy `python3 core/tools/build.py <id>` sạch lỗi và duyệt nhanh ảnh `out/checks/parts/*.png` (`check.py <id> --part all`) trước khi mở Bước B.

### Bước B — Subagent dựng cảnh song song
- Chia cảnh thành 2–8+ nhóm tuỳ độ dài video (có thể chạy 4–10 subagent song song; nếu >6 subagent thì giữ prompt giao việc gọn, tham chiếu chi tiết từ `C01.md`, hoặc gọi làm 2 nhịp liền nhau); **mỗi subagent tối đa 2 cảnh 3D** (3D tốn công hơn 2D). Mỗi prompt BẮT BUỘC có:
  1. Đọc: SKILL.md này, `plan/STORY.md`, `plan/chapters/C01.md`, `C01.json`, `src/cues/C01.ts`, `skills/military/CATALOG.md`, `assets/ASSETS.json`, các file trong `src/design/`, `src/parts/` liên quan.
  2. Danh sách file duy nhất được tạo/sửa: `src/scenes/C01Sxx.tsx` của nhóm mình. Không sửa `parts/`, `design/`, `cues/`, `plan/`, file nhóm khác; **không gọi `build.py`**.
  3. Mỗi file: `const C01Sxx: React.FC = () => { const t = useT(); … }; export default C01Sxx;` (`useT` từ `@core/time`: giây voice tuyệt đối).
  4. Lời thoại + mốc `CUE.*` + mô tả cảnh lấy từ `C01.md`.
  5. **Tự kiểm hình bắt buộc:** vòng 1 gọi `python3 core/tools/check.py <id> --scene C01Sxx,C01Syy`; từ vòng sửa thứ 2 trở đi **chỉ gọi riêng cảnh vừa sửa** (`check.py <id> --scene C01Syy`) để không render lại cảnh đã đạt → đọc ảnh `out/checks/scenes/C01Sxx.png`, sửa ít nhất một vòng (bố cục, độ rõ chủ thể, khung trống, chữ đè, lỗi hình). Báo lại: đã kiểm gì, còn gì chưa ổn, mốc giây các sự kiện lớn cho SFX.
- Tool chạy song song an toàn: mỗi nhóm cảnh/mô hình có cache `tsc` incremental riêng trong `.build/check/`, hạ `--scale` khớp đúng kích thước ô kiểm hình và điều tiết tối đa 4 tiến trình Chrome render đồng thời.

### Bước C — Agent chính ráp & kiểm
Ghi `"sfx"` vào `C01.json` theo mốc subagent báo → `audio.py` → `build.py --strict` (phải sạch lỗi) → `check.py <id>` → tự xem sheet, sửa hoặc giao lại cảnh hỏng.

## 4. Tư duy đạo diễn
- Mỗi cảnh thuần 2D hoặc thuần 3D (cảnh 3D chỉ được đè `<Label>` HTML). Xen kẽ theo nội dung: sơ đồ, mặt cắt, bản đồ,
  đồ thị → 2D; khối, địa hình, quỹ đạo trong không gian, quy mô → 3D.
- Không hai cảnh liền nhau cùng góc máy / cùng bố cục; luân phiên ngang, trực diện, từ trên, 3/4, mặt cắt, POV.
- Camera luôn có chủ đích: lia theo chủ thể, kéo lùi mở đại cảnh, đẩy vào chi tiết. 2D: `Cam2D` + `handheld`. 3D: `Cam` nội suy pos/look.
- Màu, ánh sáng, nền theo thiết kế mỹ thuật của chính video (STORY.md), không theo một khuôn chung.

## 5. Chất lượng 3D (bắt buộc)
- **Mô hình tự dựng, đủ chi tiết:** lấy kích thước thật (m) và biên dạng nhìn ngang/trên của phương tiện; dựng bằng
  `extrude` (thân, tháp pháo theo biên dạng thật, không phải hộp trơn; đường cong mũi/vòm lấy đủ điểm mượt ≥16–20 điểm), `lathe` (nòng có hãm giật, đạn), `rbox`, `Wheel`, `Track`,
  `Rivets`, `pipe`; thêm chi tiết nhận diện (nắp, kính tiềm vọng, thùng đồ, móc kéo, xích chạy). Mỗi mô hình có bộ phận
  chuyển động tách riêng qua props (góc nâng nòng, xoay tháp, giật nòng, `travel`). Kiểm 4 góc bằng `--part` trước khi dùng.
- **Vật liệu & tỉ lệ UV:** `paint()` có ngụy trang/mòn/bẩn cho thân; `plain()` cho cao su, kính, kim loại. Không dùng một màu phẳng cho cả xe. Lưu ý `extrude` / `extrudeTop` tính UV theo đơn vị mét thật (`1 m = 1 UV`, khác `lathe`/`rbox` là `0..1`) nên mảng thân lớn dựng bằng `extrude` đặt `repeat: 0.35–0.5` để vân sơn không bị đốm vụn.
- **Bối cảnh:** `<Stage>` (bóng đổ, ánh sáng môi trường, hậu kỳ) chỉnh theo giờ trong ngày của cảnh; địa hình bằng
  `heightField` + `add` riêng (đồi, đường, bãi phẳng chỗ đặt xe), `Scatter` cây/đá/bụi; không dùng mặt phẳng trơn hay khối cầu bóp làm đồi.
- **Hiệu ứng & góc máy:** `Explosion`, `MuzzleBlast`, `DustTrail`, `Trail` — không dùng quả cầu trong suốt làm vụ nổ. Tránh đặt quỹ đạo `Cam` đi xuyên trùng dọc theo vector kéo dài của `<Trail>` đầu cánh/đạn để vệt khói không bị chiếu suy biến thành vạch thẳng đứng.
- Cảnh 3D hiển thị sớm 0.2 s và chồng chuyển cảnh 0.4 s: khung đầu đã phải đầy đủ.

## 6. Chất lượng 2D
- Chủ thể vẽ có biên dạng đúng (theo kích thước thật, đồng bộ với mô hình 3D), có khối (2–3 tông sáng/tối), viền nhất quán; dùng `Defs2D` (bóng `#sh`), `Grain`.
- Tránh gắn trực tiếp `filter="url(#glow)"` lên đường chéo dài bên trong nhóm đang phóng/thu của `<Cam2D>` (tránh lỗi cắt viền ô filter của Chromium); ưu tiên vẽ nét kép (halo mờ bản rộng + lõi sáng) hoặc đặt `<Defs2D>` ngoài `<Cam2D>`.
- Nền có chiều sâu (`skyline` nhiều lớp, `contours` cho bản đồ), không để mảng màu phẳng trống.
- Hiệu ứng `Blast2D`, `Muzzle2D`, `Puff2D`; quỹ đạo `arcPath` + `drawOn`.

## 7. Chữ & âm thanh
- Chữ: mặc định không. Chỉ `<Label>` (`@skill/military/label`) cho số hoặc tên riêng voice đang đọc khi hình không tự nói được; tối đa 1 nhãn trên màn hình. Không tự viết component chữ / nhãn khác, không đổi kiểu `Label`.
- `"sfx"` trong `plan/chapters/C01.json`: 1–2 tiếng mỗi cảnh, đúng sự kiện vật lý lớn nhất, `at` lấy đúng giây trong code (CUE). Dạng tổng hợp
  `{"at":3.7,"synth":"cannon"}` (cannon mg burst rocket boom whoosh tick chime thud whir prop) hoặc file `{"at":3.7,"asset":"a050","volume":0.9}`.
- `plan/mix.json`: nhạc `{"synth": {pad, root, hits, bass, hats, riser}}` và/hoặc tài sản `{"asset":"a040","from":0,"volume":0.4}`; `volume.music`, `volume.sfx` là mức chung.
- Ưu tiên dùng media người dùng đã đưa vào (`assets/`, `library/`).
