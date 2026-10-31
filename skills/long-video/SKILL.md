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
plan/mix.json                 Agent chính (nhạc, mức music / sfx cho cả phim)
plan/chapters/CNN.json        khung {"id","title","from","to","scenes":[],"sfx":[]} do Agent chính; "scenes" do planner chương NN
plan/chapters/CNN.voice.md    SINH bởi asr.py --chapters: câu + mốc MỌI từ của đúng chương
plan/chapters/CNN.md          planner chương NN (template CHAPTER.md)
src/cues/film.ts              mốc chung cả phim (Agent chính, nếu cần)
src/cues/CNN.ts               planner chương NN: `export const CUE = { c03_fire: 812.4, ... } as const;` mọi khoá bắt đầu `cNN_`
src/cues/index.ts             SINH TỰ ĐỘNG gộp src/cues/*.ts — cấm sửa tay; cảnh vẫn `import { CUE } from '../cues'`
src/parts/…                   base dùng chung (Agent chính + subagent mô hình), khoá trước khi chia chương
src/parts/CNN_<Tên>.tsx       biến thể 2D / 3D riêng chương NN (planner chương NN), 3D kiểm bằng --part
src/scenes/CNNSxx.tsx         mỗi file một cảnh, id dạng C03S05 (chương 03, cảnh 05)
plan/sfx/CNNSxx.json          {"sfx":[...]} của cảnh đó, do subagent dựng cảnh viết; audio.py gộp
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
7. `plan/mix.json` cho cả phim. `src/design/` (bảng màu / ánh sáng). Xoá `src/cues/C01.ts` mẫu nếu chưa dùng,
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

## 5. Dựng cảnh (song song, theo chương)

Như Bước B của skill chính, giao theo nhóm trong `CNN.md` (4–10 subagent một đợt, chương đầu trước). Prompt mỗi subagent dựng
BẮT BUỘC có, ngoài 5 điểm của Bước B:
- Đọc thêm `plan/STORY.md` mục 2–4, `plan/chapters/CNN.md`, `plan/chapters/CNN.voice.md`, `src/cues/CNN.ts`, `src/parts/CNN_*`.
- File được tạo/sửa: `src/scenes/CNNSxx.tsx` và `plan/sfx/CNNSxx.json` của nhóm mình (1–2 tiếng mỗi cảnh, `at` lấy từ CUE).
- Cần thêm mốc → báo lại, không sửa `cues/CNN.ts` (planner chương đã xong việc; Agent chính thêm khoá `cNN_…`).

Cập nhật cột Dựng khi mỗi chương đủ cảnh.

## 6. Kiểm (giao subagent theo chương, Agent chính kiểm chỗ nối)

1. `.venv/bin/python core/tools/audio.py <id>` → `python3 core/tools/build.py <id> --strict` sạch lỗi.
2. Mỗi chương một subagent kiểm (song song): `check.py <id> --chapter CNN`, xem ảnh, đối chiếu `CNN.md` và chuẩn chất lượng của
   skill chính; báo cảnh hỏng kèm lý do. Không sửa code.
3. Agent chính: `check.py <id> --seams`, xem mọi `out/checks/seams/*.png` (liền mạch, không giật màu / ánh sáng vô lý, trạng thái khớp).
4. Cảnh hỏng → giao lại subagent dựng cảnh đó kèm ghi chú, rồi lặp 1–3 cho chương đó. Cập nhật cột Kiểm.
5. Báo người dùng: đã dựng gì, lỗi còn lại theo chương. Xuất `render.py <id>` chỉ khi được yêu cầu (video dài render nhiều giờ, chạy nền).
