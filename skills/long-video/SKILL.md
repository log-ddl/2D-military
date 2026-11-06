---
name: long-video
description: Làm video dài (khoảng 10 phút tới 50 phút trở lên) theo chương bằng Remotion. Chốt base và mỹ thuật cho cả phim trước, rồi chia chương, plan và dựng song song bằng subagent mà vẫn giữ mốc từng từ và chuẩn chất lượng của skill chính (ghi trong project.json, ví dụ military). Skill này chỉ chia việc; chuẩn dựng là của skill chính.
---

# Video dài theo chương

Skill này **chỉ chia việc**. Mọi chuẩn dựng (lệnh, tư duy đạo diễn, chất lượng 2D/3D, chữ, âm thanh) vẫn là của skill chính
(`"skill"` trong `project.json`, ví dụ `skills/military/SKILL.md`), đọc nó trước. Mỗi chương
phải qua **đủ mọi bước** như một video ngắn: không bớt mốc từng từ, không bớt tự kiểm hình, không đổi model nhanh hơn để xong sớm.

Video ngắn hơn khoảng 8–10 phút: không dùng skill này, làm thẳng skill chính.

**Nguyên tắc nặng nhẹ:** Agent chính chỉ giữ khung (STORY.md, base, kiểm chỗ nối); cái nặng (plan chi tiết, dựng cảnh, xem sheet
từng chương) giao subagent. Mọi trạng thái nằm trong file nên bị nén hội thoại vẫn làm tiếp được.

**Bắt đầu / làm tiếp:** đã có `plan/STORY.md` thì đọc mục 8 "Theo dõi" và làm tiếp phần còn thiếu, không làm lại.

## 1. Tệp riêng của video theo chương

```
plan/STORY.md                 Agent chính (template STORY.md của skill chính)
plan/mix.json                 agent nhạc (skills/sound-design): nhạc cả phim, tiếng nền, "version": 2
plan/chapters/CNN.json        khung {"id","title","from","to","scenes":[],"sfx":[]} do Agent chính; "scenes" do planner chương NN
plan/chapters/CNN.voice.md    SINH bởi asr.py --chapters: câu + mốc MỌI từ của đúng chương
plan/chapters/CNN.md          planner chương NN (template CHAPTER.md)
src/cues/film.ts              mốc chung cả phim (Agent chính, nếu cần)
src/cues/CNN.ts               planner chương NN: `export const CUE = { c03_fire: 812.4, ... } as const;` mọi khoá bắt đầu `cNN_`
src/cues/index.ts             SINH TỰ ĐỘNG gộp src/cues/*.ts — cấm sửa tay; cảnh vẫn `import { CUE } from '../cues'`
src/parts/…                   base dùng chung (Agent chính + subagent mô hình), khoá trước khi chia chương
src/parts/CNN_<Tên>.tsx       biến thể 2D / 3D riêng chương NN (planner chương NN), 3D kiểm bằng --part
src/scenes/CNNSxx.tsx         mỗi file một cảnh, id dạng C03S05 (chương 03, cảnh 05)
plan/sfx/CNN.json             {"sfx":[...]} SFX của chương NN, do agent SFX (skills/sound-design) viết; audio.py gộp
```

Lệnh thêm:

| Lệnh | Kết quả |
|---|---|
| `.venv/bin/python core/tools/asr.py <id> --chapters` | `plan/chapters/CNN.voice.md` cho mọi chương |
| `python3 core/tools/check.py <id> --chapter C03` | `out/checks/chapters/C03.png` (cần `build.py` trước) |
| `python3 core/tools/check.py <id> --seams [C03,C04]` | `out/checks/seams/CNN-CMM.png` ±1.5 s quanh mỗi chỗ nối chương |

`build.py` kiểm: chương liền nhau, cảnh phủ đúng mốc chương, id cảnh đúng chương, CUE không trùng tên. Chương chưa plan
hiện một khung giữ chỗ.

## 2. Khung cả phim (Agent chính tự làm)

1. `new.py`, `ingest.py`, `asr.py` như skill chính. Xem `assets/ASSETS.json` và `library/`.
2. Đọc **toàn bộ** `plan/voice_map.md` (mốc theo câu là đủ để chia chương; chi tiết từng từ để cho planner chương).
3. Liệt kê **mọi** khí tài, phương tiện, nhân vật, địa danh / bản đồ, hiệu ứng **xuất hiện ở hơn một chỗ** trong cả phim. Có thể gọi
   1 subagent tra kích thước thật song song.
4. Chia chương **theo ý**, không theo đồng hồ: mỗi chương trả lời một câu hỏi, thường 3–6 phút; ranh giới ở chỗ nghỉ `‖` hoặc
   chỗ đổi ý. Đặt mốc chương trùng `from`/`to` của câu.
5. Viết `plan/STORY.md` theo template: lập luận, **thiết kế mỹ thuật chung**, **bảng base** (file đích, kích thước mét thật 1:1,
   chữ ký `props` đủ rộng cho các biến thể chương sẽ cần: hư hỏng, cháy, ngụy trang, cấu hình đạn/giáp, phụ kiện), quy ước tên,
   bảng chương có trạng thái đầu/cuối, bảng theo dõi.
6. Viết khung `plan/chapters/CNN.json` cho mọi chương (`"scenes": []`; `new.py` đã tạo `C01` phủ cả voice: sửa `to` của nó), chạy `asr.py <id> --chapters`.
7. `src/design/` (bảng màu / ánh sáng). `plan/mix.json` để agent nhạc viết (mục 4). Xoá `src/cues/C01.ts` mẫu nếu chưa dùng,
   tạo `src/cues/film.ts` nếu cần mốc chung.
8. Gửi người dùng lập luận + bảng chương + bảng base, **dừng chờ duyệt** (trừ khi họ đã bảo làm luôn).

## 3. Base (khoá xong mới sang plan chương)

Như Bước A2 của skill chính, nhưng cho cả phim:
- Mô hình 3D: 2–5 subagent song song, mỗi cái 1–2 file `src/parts/<Tên>.tsx`, tự kiểm `check.py --part`. Nhiều mô
  hình thì chạy nhiều đợt.
- Hình chiếu 2D đồng bộ với 3D, địa hình / bản đồ / ký hiệu dùng chung: Agent chính vẽ (hoặc giao subagent khi quá nhiều, mỗi
  subagent một nhóm file riêng).
- `python3 core/tools/build.py <id>` sạch lỗi, duyệt `out/checks/parts/*.png`. Cập nhật cột Trạng thái.

## 4. Plan chương (song song)

Gọi subagent **mọi chương cùng lúc** (nhiều chương thì chia đợt ~6–8). Prompt mỗi planner BẮT BUỘC có:
1. Đọc: SKILL.md của skill chính, skill này, `plan/STORY.md`, `plan/chapters/CNN.voice.md` (mốc từng từ), template
   `CHAPTER.md`, CATALOG.md của skill chính, `assets/ASSETS.json`, các file base liên quan trong `src/parts/`. Đọc lướt mục "Chương"
   của STORY.md để biết chương trước / sau, **không** đọc voice của chương khác.
2. Chỉ được tạo/sửa: `plan/chapters/CNN.md`, mảng `"scenes"` trong `plan/chapters/CNN.json` (giữ id/title/from/to),
   `src/cues/CNN.ts`, `src/parts/CNN_*.tsx`. Không sửa base, STORY.md, chương khác; không gọi `build.py`.
3. Phân cảnh chi tiết như skill chính: id `CNNS01…`, cảnh liền mạch, cảnh đầu `from` = mốc chương, cảnh cuối
   `to` = mốc chương; mỗi sự kiện hình khớp đúng từ trong voice (CUE `cNN_…` lấy giây của từ). Luật xen 2D/3D, không hai cảnh
   liền cùng góc máy, áp cả với cảnh cuối chương trước / đầu chương sau theo trạng thái trong STORY.md.
4. Biến thể riêng chương: dựng trên base (props, bọc thêm chi tiết), không dựng lại. Biến thể 3D tự kiểm `check.py --part
   CNN_<Tên>`. Thứ nhiều chương cần hoặc phải sửa base → ghi vào mục 5 "Đề xuất", không tự làm.
5. Chia nhóm dựng (mỗi nhóm tối đa 2 cảnh 3D). Báo lại: số cảnh, nhóm, đề xuất.

Xong, Agent chính **đọc mọi `CNN.md`** (bảng phân cảnh + đề xuất) và kiểm cả phim:
- trạng thái cuối chương N khớp trạng thái đầu chương N+1; góc máy / 2D-3D hai bên chỗ nối không trùng;
- tên gọi đúng quy ước; cùng một cách xử lý không lặp đều đều qua nhiều chương;
- đề xuất base: chấp nhận thì bổ sung base (props / mô hình mới, kiểm lại `--part`), ghi vào STORY.md mục 7; báo planner chỉnh lại nếu cần.
`python3 core/tools/build.py <id>` sạch lỗi (mọi cảnh hiện giữ chỗ). Cập nhật Plan / Duyệt; gửi người dùng theo đợt nếu họ muốn duyệt.

**Nhạc nền chạy nền ngay sau khi plan chương khoá** (`skills/sound-design/SKILL.md` mục 4 — Pha 1, công thức `skills/<skill>/SOUND.md`):
gọi **1 agent nhạc** cho cả phim viết `plan/mix.json` (một bài mỗi phần lớn, cùng họ giọng, chỗ đổi bài ở ranh giới chương có khoảng im / cú hit; `stages` và `amb` nối gối không vượt `dur` file gốc). Kèm nguyên văn yêu cầu âm thanh của người dùng và nguồn (`epidemic` / `free`).
Không chờ nó; dựng cảnh (mục 5) chạy song song. **Chưa gọi agent SFX ở bước này** — SFX chạy cuốn chiếu ở mục 6.1 ngay khi từng chương dựng xong `.tsx` để đọc thẳng mốc hình thực tế.

## 5. Dựng cảnh (dây chuyền cuốn chiếu)

Như Bước B của skill chính, gom toàn bộ nhóm cảnh của mọi chương (đã chốt hết ở mục 4) thành hàng đợi theo thứ tự `C01 → CNN`, rồi chạy **dây chuyền cuốn chiếu giữ ~6 subagent hoạt động liên tục** (khớp 4 luồng Chrome render + luồng viết code):
- **Không chia đợt cứng chờ thợ chậm nhất:** hễ **1 subagent bất kỳ báo xong**, lập tức giao ngay nhóm cảnh kế tiếp trong hàng đợi (vượt qua ranh giới chương bình thường vì plan/CUE mọi chương đã khoá ở mục 4).
- Prompt mỗi subagent dựng BẮT BUỘC có, ngoài 5 điểm của Bước B:
  - Đọc thêm `plan/STORY.md` mục 2–4, `plan/chapters/CNN.md`, `plan/chapters/CNN.voice.md`, `src/cues/CNN.ts`, `src/parts/CNN_*`.
  - File được tạo/sửa: chỉ `src/scenes/CNNSxx.tsx` của nhóm mình (SFX do agent SFX làm sau khi chương đủ `.tsx`).
  - Cần thêm mốc → báo lại, không sửa `cues/CNN.ts` (planner chương đã xong việc; Agent chính thêm khoá `cNN_…`).

Cập nhật cột Dựng ngay khi một chương đủ cảnh (và mở ngay kiểm hình + dựng SFX cuốn chiếu cho chương đó luôn, xem mục 6).

## 6. Kiểm & dựng SFX cuốn chiếu theo chương (Agent chính kiểm chỗ nối)

1. Ngay khi một chương `CNN` vừa dựng đủ cảnh `src/scenes/CNNS*.tsx`, chạy `python3 core/tools/build.py <id>` rồi **gọi song song 2 subagent cho chương `CNN`** trong lúc các chương sau vẫn đang dựng:
   - **1 subagent kiểm hình** (`check.py <id> --chapter CNN` — tự cắt lát đúng các cảnh trong khoảng kiểm và tắt giải mã `voice.mp3`, không phụ thuộc `audio.py`): xem ảnh, đối chiếu `CNN.md` và chuẩn chất lượng của skill chính; báo cảnh hỏng kèm lý do. Không sửa code.
   - **1 subagent SFX của chương `CNN`** (`skills/sound-design/SKILL.md` mục 4 — Pha 2 + `skills/<skill>/SOUND.md`): đọc trực tiếp toàn bộ `src/scenes/CNNS*.tsx` của chương đó để ghi `plan/sfx/CNN.json` khớp chính xác mọi mốc `<Explosion`/`<MuzzleBlast`/va chạm và khoảng chuyển động `prog(t, a, b)` trên hình (chưa gọi `audio.py` khi các chương khác chưa xong).
2. Khi toàn bộ cảnh đã dựng xong, agent nhạc và mọi agent SFX chương đã báo xong (nếu có cảnh dựng lại làm đổi mốc sự kiện thì cập nhật `plan/sfx/CNN.json` cảnh đó) → chạy `.venv/bin/python core/tools/audio.py <id>` (kiểm chéo `.tsx` mục 5 `sound-design` + đọc `.build/sound_report.txt`) → `python3 core/tools/build.py <id> --strict` sạch lỗi.
3. Agent chính: `check.py <id> --seams`, xem mọi `out/checks/seams/*.png` (gom toàn bộ chỗ nối trong 1 lần chụp cắt lát: liền mạch, không giật màu / ánh sáng vô lý, trạng thái khớp).
4. Cảnh hỏng → giao lại subagent dựng cảnh đó kèm ghi chú. **Khi sửa lỗi hình ảnh thuần `.tsx` mà không đổi `plan/mix.json` hay `plan/sfx/*.json` (`"sfx"`), KHÔNG chạy lại `audio.py`** — chỉ chạy `python3 core/tools/build.py <id> --strict` rồi chụp lại đúng `--chapter CNN` / `--seams` bị ảnh hưởng. Cập nhật cột Kiểm.
5. Báo người dùng: đã dựng gì, lỗi còn lại theo chương. Xuất `render.py <id>` chỉ khi được yêu cầu (video dài render nhiều giờ, chạy nền).
