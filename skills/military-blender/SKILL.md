---
name: military-blender
description: Đạo diễn và dựng video giải thích quân sự / kỹ thuật 100% bằng Blender 5.2 EEVEE gốc (không qua Remotion): giữ 100% Shader Nodes BlenderKit, Sa bàn Địa lý 3D (geomap.py), Chú thích Callout 3D (callout.py), Bộ binh Mixamo 2.446 hành động (actor.py), Mặt cắt Laser HDR (cutaway.py), và ráp nối chuyển cảnh bằng Blender VSE. Mặc định chỉ dựng .blend + chụp ảnh kiểm --check / xuất đoạn thử ngắn --test; CHỈ xuất full video khi người dùng ra lệnh.
---

# Đạo diễn & Dựng Video Quân sự / Kỹ thuật 100% Bằng Blender 5.2 Gốc (`military-blender`)

> [!IMPORTANT]
> **QUY TẮC SỐ 1 — 100% BLENDER, KHÔNG RẬP KHUÔN BỐI CẢNH & CẤM TỰ Ý XUẤT FULL VIDEO KHI CHƯA ĐƯỢC LỆNH:**
> 1. **Làm 100% trên Blender 5.2 (Không dùng Remotion):** Tất cả các cảnh — bao gồm **Cảnh 3D khí tài/chiến trường**, **Sa bàn Bản đồ Địa lý 3D (`build_geomap_3d`)**, **Chú thích kỹ thuật Callout (`add_callout_3d`)**, **Thước đo (`add_measure_3d`)**, **Logo kênh 3D (`add_brand_decal`)**, và **Chuyển cảnh VSE (`GAMMA_CROSS` / `WIPE` / `CUT`)** — đều được dựng hoàn toàn bằng Python `bpy` trong `projects/<id>/blender/C01Sxx.py`. Khi mở file `out/blend/C01Sxx.blend`, người dùng xem được trọn vẹn cả cảnh, bản đồ lẫn Callout ở 60 FPS không lag.
> 2. **Bối cảnh phụ thuộc 100% vào lời bình (`voice`):** `blender_lib` chỉ là **bộ đồ nghề (toolbox)**, tuyệt đối không phải khuôn mẫu cố định. Cảnh nào nói về biển thì dựng biển + tàu; cảnh nào nói về sa mạc/đô thị/nhà xưởng thì tìm tải đúng tài sản `.blend` đó từ BlenderKit; chỉ khi lời đọc nói tới giải phẫu bên trong mới dùng `setup_laser_cutaway`; chỉ khi nói tới luồng khí/sóng xung kích mới dùng `add_surface_curves`.
> 3. **Mặc định chỉ dừng ở bước Dựng `.blend` + Kiểm 6 khung (`--check`) / Xuất thử đoạn ngắn (`--test`) + Trộn âm thanh (`audio.py`):** Tuyệt đối **KHÔNG** tự ý chạy `blender_runner.py --render` để xuất toàn bộ video khi người dùng chưa ra lệnh xuất (vì người dùng sẽ duyệt trên `.blend` / ảnh kiểm / clip test ngắn trước rồi mới cho xuất hàng loạt qua đêm).

## 1. Cấu trúc — ai được sửa gì

```
voice/                     voice gốc
library/                   media dùng chung của NGƯỜI DÙNG (gồm cả library/brand/ chứa logo kênh) — agent chỉ đọc
mixamo/                    kho 2.446 clip mocap quang học Mixamo (.fbx) — tra cứu qua mixamo/manifest.csv hoặc find_mixamo_fbx()
bk_cache/                  kho đệm mô hình/môi trường/vật liệu .blend tải từ BlenderKit & bk_cache/prepped/
skills/military-blender/   bộ đồ nghề blender_lib & blender_runner.py — agent chỉ đọc khi dựng video; xem CATALOG.md
projects/<id>/
  assets/                  tài sản (voice, sfx, nhạc) + ASSETS.json; file `locked` của người dùng — agent chỉ đọc
  plan/                    transcript.json, voice_map.md (asr.py) · STORY.md, chapters/C01.md, C01.json, mix.json, sfx/
  blender/                 C01S01.py … kịch bản Python Blender 5.2 cho TỪNG CẢNH (cả cảnh 3D khí tài lẫn cảnh Bản đồ Địa lý 3D)
  out/
    blend/                 C01S01.blend … (mở xem trực tiếp 60 FPS) & master_vse.blend (bàn dựng chuyển cảnh toàn phim)
    checks/scenes/         C01S01.png … (ảnh lưới 6 khung kiểm tra nhanh) & out/checks/blender_sheet.png
    test_C01Sxx.mp4        clip test ngắn 3–5s khi chạy --test
    clips/                 C01S01.mp4 … (các cảnh lẻ xuất khi chạy --render)
    video.mp4              video hoàn chỉnh xuất từ bàn dựng Blender VSE + FFmpeg Audio (chỉ khi có lệnh --render all)
```

**Độc lập tuyệt đối:** không đọc, không chép, không tham khảo code của dự án khác trong `projects/`. Chỉ dùng lại qua `skills/military-blender/`, `library/`, `mixamo/` và `bk_cache/`.
Nhạc / SFX: theo `skills/sound-design/SKILL.md` và `skills/military-blender/SOUND.md` — Epidemic Sound (MCP, mặc định) hoặc kho `library/` / Freesound CC0 / Mixkit qua `core/tools/sound_lib.py`.

## 2. Lệnh (chạy từ gốc repo; lệnh nào cũng chỉ đụng `projects/<id>`)

| Bước | Lệnh | Kết quả |
|---|---|---|
| Khởi tạo | `python3 core/tools/new.py <id> voice/x.mp3 --skill military-blender [--from a --to b]` | khuôn `projects/<id>/` |
| Kho 3D BlenderKit | `python3 core/tools/bk.py search "q1" "q2" [-j 6] · fetch <id1> <id2>:bg [-j 6] · inspect-parts <id1> <id2> [-j 4]` | tìm / tải hàng loạt song song vào `bk_cache/<uuid>/` (giữ nguyên file `.blend` gốc có đủ Shader Nodes PBR) |
| Bộ binh & Mocap | `python3 core/tools/mocap.py search "q1" "q2" [-n 20]` · `bk.py prep-actor <uuid> <out.glb> [--preset skills/military-blender/presets/infantry_uniforms.json:<tên>]` | tra cứu **2.446 hành động `.fbx`** trong `mixamo/manifest.csv` và nạp trực tiếp vào Blender qua `add_soldier_3d` |
| Mốc từ | `.venv/bin/python core/tools/asr.py <id>` | `plan/voice_map.md`, `transcript.json` |
| **Kiểm cảnh Blender & lưu `.blend`** | `python3 skills/military-blender/tools/blender_runner.py <id> --check C01S01,C01S02 [-j 2]` | Lưu `out/blend/C01Sxx.blend` (mở xem 60 FPS không lag) + chụp 6 khung `out/checks/scenes/C01Sxx.png` |
| **Xuất thử đoạn ngắn (3–5s)** | `python3 skills/military-blender/tools/blender_runner.py <id> --test C01S01 [--seconds 4] [--samples 4]` | Xuất nhanh `out/test_C01S01.mp4` để kiểm tra chuyển động / hiệu ứng |
| Âm thanh | `python3 core/tools/sound_lib.py search "…"` · `.venv/bin/python core/tools/audio.py <id>` | `.build/public/{voice.mp3,music.wav,sfx.wav,master.json}` + `.build/sound_report.txt` |
| **Xuất toàn bộ video bằng Blender VSE (CHỈ KHI USER BẢO XUẤT)** | `python3 skills/military-blender/tools/blender_runner.py <id> --render all [--samples 4] [-j 2]` | Xuất toàn bộ cảnh 1080p ra `out/clips/C01Sxx.mp4`, ráp chuyển cảnh bằng **Blender VSE (`master_vse.blend`)** + trộn âm thanh ra `out/video.mp4` |

**Video dài (khoảng 8–10 phút trở lên): đọc thêm `skills/long-video/SKILL.md` và làm theo chương.**

## 3. Quy trình

Video ngắn là một chương `C01`. Id cảnh `C01S01`, `C01S02`…

### Bước A1 — Agent chính khoá chuẩn đạo diễn (một đầu não thống nhất)
1. Chạy `new.py`, `asr.py`, đọc kỹ `plan/voice_map.md`. Xem `library/`, `mixamo/manifest.csv` và `bk.py search` để nắm tài sản 3D sẵn có.
2. Trực tiếp viết `plan/STORY.md` theo template: **thiết kế mỹ thuật riêng biệt cho đúng nội dung video này** (không khí, giờ trong ngày, bối cảnh địa lý/lịch sử thực tế từ voice, bảng màu, ngôn ngữ camera, chất liệu, ngôn ngữ chữ Callout trên hình khớp `transcript.json`, vị trí gắn **Logo Kênh 3D**), bảng tài sản ghi rõ **mã UUID BlenderKit (`.blend` gốc), kích thước mét thật 1:1** cho từng khí tài và đạo cụ môi trường; viết `plan/chapters/C01.md` với bảng phân cảnh chi tiết.
3. Viết mảng `scenes` trong `plan/chapters/C01.json` (ghi rõ `id`, `from`, `to`, `transition`: `'fade'` / `'wipe'` / `'cut'`).
4. **Gọi ngay 1 subagent nhạc nền chạy nền** (theo `skills/sound-design/SKILL.md` mục 4 — Pha 1 + `skills/military-blender/SOUND.md`). Nó viết `plan/mix.json` (nhạc + `stages` + `amb`) song song với A2/B; không chờ nó. **Chưa làm SFX ở bước này** — SFX chỉ chạy ở Bước C sau khi đã có code cảnh thực tế.

### Bước A2 — Tải tài sản `.blend` gốc từ BlenderKit & Tra cứu Mocap Mixamo (khoá xong mới sang Bước B)
- **Tải hàng loạt song song các mô hình khí tài, đạo cụ môi trường, cây cối, công trình đúng theo bối cảnh `STORY.md`:** gộp toàn bộ từ khoá vào 1 lệnh `bk.py search "q1" "q2" … -j 6`, tải gộp toàn bộ mã UUID trong 1 lệnh `bk.py fetch <id1> <id2>:bg … -j 6` vào `bk_cache/<uuid>/`, và chạy `bk.py inspect-parts <id1> <id2> … -j 4` để nắm rõ tên từng mesh con (thân, tháp pháo, cánh, càng đáp, động cơ, nội thất).
- Nếu kịch bản có bộ binh/phi hành đoàn, chạy `python3 core/tools/mocap.py search "<từ khoá>"` để chọn đúng file `.fbx` từ kho **2.446 hành động Mixamo** trong `mixamo/manifest.csv`.

### Bước B — Subagent dựng cảnh song song 100% trong Blender (`blender/C01Sxx.py`)
Chia cảnh thành các nhóm (mỗi subagent tối đa 2 cảnh). Mỗi prompt BẮT BUỘC có:
1. Đọc: `SKILL.md` này, `plan/STORY.md`, `plan/chapters/C01.md`, `C01.json`, `skills/military-blender/CATALOG.md`.
2. Danh sách file duy nhất được tạo/sửa: `projects/<id>/blender/C01Sxx.py`:
   - Với **cảnh 3D khí tài / chiến trường**: dựng bằng `blender_lib` (`stage`, `loader`, `camera`, `cutaway`, `actor`, `fx`, `brand`, `measure3d`, `callout`) bám sát 100% bối cảnh và hành động trong `C01.md`.
   - Với **cảnh Bản đồ Địa lý Chiến lược**: dựng ngay trong `blender/C01Sxx.py` bằng `blender_lib.geomap` (`build_geomap_3d`, `add_map_route`, `add_map_marker`) kết hợp `setup_camera` bay lượn trên sa bàn 3D.
3. **Tự kiểm hình bắt buộc (`--check`):**
   - Viết xong các cảnh được giao, subagent gọi `python3 skills/military-blender/tools/blender_runner.py <id> --check C01Sxx,C01Syy` (tự động lưu `out/blend/C01Sxx.blend` và chụp 6 khung ra `out/checks/scenes/C01Sxx.png`).
   - Đọc trực tiếp ảnh `out/checks/scenes/C01Sxx.png` bằng **AI Vision (bắt buộc soi kỹ từng ô, cấm xem lướt)**: (a) đọc rà mọi chữ hiển thị (`Callout`, `Measure3D`, nhãn bản đồ 3D, chữ dính sẵn trên vỏ `.blend` dân sự) — **100% chữ trên hình bắt buộc trùng duy nhất ngôn ngữ `voice` (`plan/transcript.json`)**, xoá sạch logo/chữ thương mại sai bối cảnh; (b) chủ thể/sải cánh/thước đo/Callout nằm trọn trong khung không bị cắt cụt hay che lấp nhau; (c) ánh sáng/vật liệu rõ nét, bánh xe/chân chạm đúng mặt sàn, không đâm xuyên lưới; (d) 6 khung thể hiện rõ tiến trình chuyển động theo lời đọc. Sửa dứt điểm nếu có lỗi và chụp lại `--check`.
   - Báo lại: đã kiểm gì, mốc giây (hoặc frame) của mọi chuyển động/vụ nổ/tiếng cơ khí cho Bước C (SFX).

### Bước C — Dựng SFX song song (tối đa 4 subagent) & Dừng chờ lệnh Xuất của người dùng
1. Chia các cảnh thành **tối đa 4 cụm cảnh chạy bởi tối đa 4 subagent SFX** (theo `skills/sound-design/SKILL.md` mục 4 — Pha 2 + `SOUND.md`): đọc trực tiếp `blender/C01Sxx.py` để đặt SFX nhiều lớp khớp từng chuyển động/vụ nổ/mặt cắt Laser vào `plan/sfx/C01_1.json`..`C01_4.json`.
2. Khi các subagent SFX và Nhạc nền xong, Agent chính chạy `.venv/bin/python core/tools/audio.py <id>` để trộn âm thanh và kiểm tra `.build/sound_report.txt` (độ rõ lời 1–4 kHz trung vị ≥ 12 dB, bị lấp ≤ 25%, độ to -14 LUFS).
3. **DỪNG LẠI BÁO CÁO NGƯỜI DÙNG:** Trình bày danh sách file `.blend` (`out/blend/*.blend`), ảnh kiểm 6 khung (`out/checks/scenes/*.png`), báo cáo âm thanh (`.build/sound_report.txt`), và chỉ chạy xuất toàn bộ video (`blender_runner.py <id> --render all`) khi người dùng ra lệnh xuất.

## 4. Chất lượng 3D Blender 5.2 (bắt buộc)
- **Giữ nguyên 100% Shader Nodes gốc của BlenderKit & Xoá sạch logo dân sự (`blender_lib.loader` & `blender_lib.materials`):** Dùng `load_asset` nạp trực tiếp từ `bk_cache/<uuid>/source_*.blend`; nếu mô hình có sơn/logo thương mại dân sự hoặc cần đồng bộ sơn quân sự, dùng `replace_materials` kết hợp `military_paint`, `armor_plate`, `panel_paint`, `machined_metal`, `optical_glass`. Điều khiển khớp xoay bộ phận (tháp pháo, nòng, radar, càng đáp, cánh quạt) bằng `rig_joint`.
- **Bộ binh 3D Mixamo 2.446 hành động (`blender_lib.actor`):** Tìm hành động trong `mixamo/manifest.csv` bằng `mocap.py search` hoặc truyền trực tiếp tên hành động / file `.fbx` vào `add_soldier_3d`; tự động khớp vận tốc bước chân với `SOLDIER_CLIP_SPEEDS` để không trượt chân trên mặt đất, pha trộn mượt `blend_to`, và loé chớp lửa đầu nòng HDR (`muzzle_socket`) tại `fire_frames`.
- **Mổ xẻ cơ khí tuần tự bằng Mặt phẳng Quét Laser HDR (`blender_lib.cutaway.setup_laser_cutaway` & `blender_lib.geom`):**
  - Khi lời thoại nói về cấu tạo bên trong (khoang nội thất, động cơ, buồng đạn, khung dầm), bắt buộc dùng `setup_laser_cutaway` để một mặt phẳng có **viền sáng Laser HDR** quét dọc qua lớp vỏ: tia Laser đi tới đâu thì vỏ ngoài chuyển thành kính mờ Fresnel (`ghost_opacity`) và phần ruột bên trong (`inner_objs`) lộ dần ra tới đó; khi kết thúc đoạn giải phẫu, tia Laser quét ngược lại (`scan_out_frames`) để hàn kín lớp vỏ kim loại đặc trở lại. Nếu mô hình BlenderKit rỗng ruột, dùng `blender_lib.geom` (`add_loft`, `add_revolve`, `add_airfoil_wing`, `add_pipe`, `add_wheel`, `add_tank_track`, `add_rivets`) dựng bổ sung lõi cơ khí bên trong.
- **Sa bàn Bản đồ Địa lý 3D (`blender_lib.geomap`):**
  - Dùng `build_geomap_3d(bounds, highlight)` để đùn khối 3D cho 177 quốc gia thực tế từ `presets/world_geo.json`, vẽ tuyến hành trình/đường bay 3D chạy dần bằng `add_map_route`, và ghim toạ độ thành phố/căn cứ bằng `add_map_marker`.
- **Chú thích Callout & Thước đo 3D trực tiếp trong Blender (`blender_lib.callout` & `blender_lib.measure3d`):**
  - Mặc định 85–90% thời lượng để hình ảnh 3D tự kể chuyện. Khi cần chỉ vào một bộ phận kèm thông số ngắn (1–3 từ / con số, **bắt buộc cùng ngôn ngữ với `voice`**), dùng `add_callout_3d(text, at_3d, to_3d, appear_frames, hide_frames)` hoặc `add_measure_3d(...)`.
- **Gắn Logo Kênh dạng lớp sơn Stencil uốn cong theo vật thể (`blender_lib.brand.add_brand_decal`):**
  - Đọc tự động từ `library/brand/` (`logo_white.svg`, `logo_black.svg`, `brand.json`). Tuyệt đối không gắn bảng phẳng lên tường hay dán watermark 2D cứng; chỉ dùng `add_brand_decal` (`Shrinkwrap`) ép lớp sơn stencil uốn cong ôm sát bề mặt khí tài/đồ vật 3D (cánh đứng đuôi, thân máy bay, tháp pháo xe tăng, vỏ tàu, thùng hàng quân sự), tự động đổi màu sáng (`lightTint`) hoặc tối (`darkTint`) hài hoà với màu sơn nền (`variant='auto'`).
