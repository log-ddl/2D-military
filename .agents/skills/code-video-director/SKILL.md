---
name: code-video-director
description: Đạo diễn và dựng video giải thích quân sự từ voice bằng Remotion (cảnh thuần 2D SVG hoặc thuần 3D Three.js), mỗi video là một dự án độc lập trong projects/<id>/, dựng cảnh song song bằng subagent.
---

# Đạo diễn & dựng video (Remotion)

## 1. Cấu trúc — ai được sửa gì

```
voice/                     voice gốc
library/                   media dùng chung của NGƯỜI DÙNG (images, videos, sfx, music) — agent chỉ đọc; xem INDEX.md
engine/kit, engine/lib     code dùng chung — agent chỉ đọc khi dựng video; xem engine/lib/CATALOG.md
projects/<id>/
  input/                   của NGƯỜI DÙNG: voice.mp3, images/, videos/, sfx/, music/ — agent chỉ đọc
  plan/                    transcript.json, voice_map.md (asr.py) · SHOT_PLAN.md, scenes.json (agent chính)
  video/cues.ts            agent chính
  video/local/             agent chính: thiết kế + mô hình riêng của video (local/models/index.ts → MODELS)
  video/scenes/S01.tsx …   mỗi file một cảnh, do đúng subagent được giao viết
  video/Video.tsx, entry.tsx   SINH TỰ ĐỘNG (build.py) — cấm sửa tay
  audio/music.json, sound.json agent chính
  public/, out/            SINH TỰ ĐỘNG
```

**Độc lập tuyệt đối:** không đọc, không chép, không tham khảo code của dự án khác trong `projects/`. Chỉ dùng lại qua
`engine/kit`, `engine/lib` và `library/`. Muốn biết API thì đọc `CATALOG.md` và tài liệu Remotion / three.js.
Không tải mô hình 3D hay hình ảnh từ ngoài: mô hình tự dựng; ảnh/nhạc/sfx thật chỉ lấy từ `input/` hoặc `library/` do người dùng bỏ vào.

## 2. Lệnh (chạy từ gốc repo; lệnh nào cũng chỉ đụng projects/<id>)

| Bước | Lệnh | Kết quả |
|---|---|---|
| Khởi tạo | `python3 tools/init.py <id> voice/x.mp3 [--from a --to b]` | khuôn `projects/<id>/` |
| Mốc từ | `.venv/bin/python tools/asr.py <id>` | `plan/voice_map.md`, `transcript.json` |
| Ráp + kiểm kiểu | `python3 tools/build.py <id>` | Video.tsx từ scenes.json; cảnh lỗi → khung giữ chỗ + in lỗi |
| Kiểm mô hình | `python3 tools/sheet.py <id> --model M109` | `out/models/M109.png` (4 góc) |
| Kiểm cảnh | `python3 tools/sheet.py <id> --scene S03,S07` | `out/scenes/S03.png` (6 khung, rộng 960; tự kiểm `tsc` & đóng gói cô lập, không cần `build.py`) |
| Âm thanh | `.venv/bin/python tools/audio.py <id>` | `public/{voice.mp3,music.wav,sfx.wav}` |
| Sheet cả video | `python3 tools/sheet.py <id>` | `out/sheet.png` |
| Xem / xuất | `python3 tools/render.py <id> --studio` · `python3 tools/render.py <id> [--no-music] [--no-sfx]` | Studio port riêng (bảng Props: quality 1/4·1/2·Full, music, sfx) · `out/video.mp4` (chỉ khi được yêu cầu) |

Không dùng nút mắt/loa trên timeline Studio: nó ghi `hidden` thẳng vào `engine/kit` dùng chung (ảnh hưởng mọi dự án và bản xuất). Bật/tắt nhạc, sfx bằng bảng Props.

## 3. Quy trình

### Bước A — Agent chính khoá nền tảng (trước khi gọi subagent)
1. `init.py`, `asr.py`, đọc `plan/voice_map.md`. Xem `input/` có ảnh/footage/sfx/nhạc nào của người dùng để dùng.
2. Viết `plan/SHOT_PLAN.md` theo template: **thiết kế mỹ thuật riêng cho video này** (không khí, giờ trong ngày, bảng màu
   2D và 3D, ngôn ngữ camera, chất liệu), danh sách mô hình cần dựng kèm kích thước thật, bảng cảnh.
3. Viết `plan/scenes.json`: `{"fps":30,"music":0.4,"sfx":0.5,"scenes":[{"id":"S01","from":0,"to":26.2,"kind":"3d","transition":"fade","brief":"…"}]}`
   — cảnh liền mạch (`from` = `to` cảnh trước), `transition` của cảnh k là cú chuyển VÀO cảnh k: `fade`, `slide:from-right`, `wipe:from-left`, `flip:from-top`, `clockWipe`.
4. Viết `video/cues.ts` (`export const CUE = {...} as const`): mọi mốc sự kiện, đặt tên theo cảnh (`s03_fire`).
5. **Dựng mô hình 3D trước** trong `video/local/models/` (mục 5), khai `MODELS` trong `index.ts`, `build.py`, kiểm
   `sheet.py --model <Tên>`, tự xem ảnh, sửa tới khi đạt. Các hình 2D dùng nhiều cảnh cũng làm sẵn trong `local/`.

### Bước B — Subagent dựng cảnh song song
- Chia cảnh thành 2–8+ nhóm tuỳ độ dài video (có thể chạy 4–10 subagent song song; nếu >6 subagent thì giữ prompt giao việc gọn, tham chiếu chi tiết từ `SHOT_PLAN.md`, hoặc gọi làm 2 nhịp liền nhau); **mỗi subagent tối đa 2 cảnh 3D** (3D tốn công hơn 2D). Mỗi prompt BẮT BUỘC có:
  1. Đọc: SKILL.md này, `plan/SHOT_PLAN.md`, `plan/scenes.json`, `video/cues.ts`, `engine/lib/CATALOG.md`, `library/INDEX.md`, các file trong `video/local/` liên quan.
  2. Danh sách file duy nhất được tạo/sửa: `video/scenes/Sxx.tsx` của nhóm mình. Không sửa `local/`, `cues.ts`, `scenes.json`, `Video.tsx`, `entry.tsx`, file nhóm khác; **không gọi `build.py`**.
  3. Mỗi file: `const Sxx: React.FC<{ t0: number }> = …; export default Sxx;`, `const t = useT(t0)` (giây voice tuyệt đối).
  4. Lời thoại + mốc `CUE.*` + mô tả cảnh lấy từ SHOT_PLAN.
  5. **Tự kiểm hình bắt buộc:** gọi thẳng `python3 tools/sheet.py <id> --scene Sxx,Syy` (lệnh tự kiểm `tsc` cô lập cho đúng cảnh của nhóm và đóng gói riêng, không đụng `Video.tsx`/`entry.tsx`)
     → đọc ảnh `out/scenes/Sxx.png`, sửa ít nhất một vòng (bố cục, độ rõ chủ thể, khung trống, chữ đè, lỗi hình). Báo lại: đã kiểm gì, còn gì chưa ổn, mốc giây các sự kiện lớn cho SFX.
- Tool chạy song song an toàn: mỗi lệnh `--scene` có entry/tsconfig tạm riêng và khoá điều tiết tối đa 4 tiến trình Chrome render đồng thời.

### Bước C — Agent chính ráp & kiểm
`audio.py` → `build.py --strict` (phải sạch lỗi) → `sheet.py <id>` → tự xem sheet, sửa hoặc giao lại cảnh hỏng.

## 4. Tư duy đạo diễn
- Mỗi cảnh thuần 2D hoặc thuần 3D (cảnh 3D chỉ được đè `<Label>` HTML). Xen kẽ theo nội dung: sơ đồ, mặt cắt, bản đồ,
  đồ thị → 2D; khối, địa hình, quỹ đạo trong không gian, quy mô → 3D.
- Không hai cảnh liền nhau cùng góc máy / cùng bố cục; luân phiên ngang, trực diện, từ trên, 3/4, mặt cắt, POV.
- Camera luôn có chủ đích: lia theo chủ thể, kéo lùi mở đại cảnh, đẩy vào chi tiết. 2D: `Cam2D` + `handheld`. 3D: `Cam` nội suy pos/look.
- Màu, ánh sáng, nền theo thiết kế mỹ thuật của chính video (SHOT_PLAN), không theo một khuôn chung.

## 5. Chất lượng 3D (bắt buộc)
- **Mô hình tự dựng, đủ chi tiết:** lấy kích thước thật (m) và biên dạng nhìn ngang/trên của phương tiện; dựng bằng
  `extrude` (thân, tháp pháo theo biên dạng thật, không phải hộp trơn), `lathe` (nòng có hãm giật, đạn), `rbox`, `Wheel`, `Track`,
  `Rivets`, `pipe`; thêm chi tiết nhận diện (nắp, kính tiềm vọng, thùng đồ, móc kéo, xích chạy). Mỗi mô hình có bộ phận
  chuyển động tách riêng qua props (góc nâng nòng, xoay tháp, giật nòng, `travel`). Kiểm 4 góc bằng `--model` trước khi dùng.
- **Vật liệu:** `paint()` có ngụy trang/mòn/bẩn cho thân; `plain()` cho cao su, kính, kim loại. Không dùng một màu phẳng cho cả xe.
- **Bối cảnh:** `<Stage>` (bóng đổ, ánh sáng môi trường, hậu kỳ) chỉnh theo giờ trong ngày của cảnh; địa hình bằng
  `heightField` + `add` riêng (đồi, đường, bãi phẳng chỗ đặt xe), `Scatter` cây/đá/bụi; không dùng mặt phẳng trơn hay khối cầu bóp làm đồi.
- **Hiệu ứng:** `Explosion`, `MuzzleBlast`, `DustTrail`, `Trail` — không dùng quả cầu trong suốt làm vụ nổ.
- Cảnh 3D hiển thị sớm 0.2 s và chồng chuyển cảnh 0.4 s: khung đầu đã phải đầy đủ.

## 6. Chất lượng 2D
- Chủ thể vẽ có biên dạng đúng (theo kích thước thật), có khối (2–3 tông sáng/tối), viền nhất quán; dùng `Defs2D` (bóng `#sh`), `Grain`.
- Nền có chiều sâu (`skyline` nhiều lớp, `contours` cho bản đồ), không để mảng màu phẳng trống.
- Hiệu ứng `Blast2D`, `Muzzle2D`, `Puff2D`; quỹ đạo `arcPath` + `drawOn`.

## 7. Chữ & âm thanh
- Chữ: mặc định không. Chỉ `<Label>` cho số hoặc tên riêng voice đang đọc khi hình không tự nói được; tối đa 1 nhãn trên màn hình.
- `audio/sound.json`: 1–2 tiếng mỗi cảnh, đúng sự kiện vật lý lớn nhất, `t` lấy đúng giây trong code (CUE). Dạng tổng hợp
  `{"t":3.7,"type":"cannon"}` (cannon mg burst rocket boom whoosh tick chime thud whir prop) hoặc file `{"t":3.7,"src":"sfx/x.wav","vol":0.9}`.
- `audio/music.json`: `synth` (pad, root, hits, bass, hats, riser) và/hoặc `tracks` `[{"src":"music/x.mp3","at":0,"vol":0.4,"duck":0.5}]`.
- File `src` tìm ở `input/` trước rồi `library/`; ưu tiên dùng media người dùng đã đưa vào.
