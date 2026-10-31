# Nghịch lý Giáp Xe Tăng 60 Tấn & Phòng Vệ Chủ Động (t)

Skill: military. Mốc luôn là giây voice toàn phim (0.00–70.10 s). Voice: `assets/voice/voice.mp3`, bản đọc `plan/voice_map.md`.

## Ý chính
- **Hook mở câu hỏi gì (0.00–21.28 s):** Một chiếc xe tăng chủ lực hiện đại nặng 60 tấn, đắt 10 triệu USD, giáp mặt trước dày tương đương 800 mm thép đồng nhất chặn đứng đạn bắn thẳng — vì sao lại bị hạ gục dễ dàng bởi một quả đạn chống tăng vác vai hoặc chiếc FPV drone giá vài trăm USD?
- **Mỗi phần trả lời điều gì:**
  - *Quy luật phân bổ trọng lượng (21.28–36.18 s):* Không động cơ nào kéo nổi khối hộp thép 800 mm bọc kín cả 6 mặt (>180 tấn); kỹ sư buộc phải dồn giáp ra mặt trước, để lại tử huyệt nóc tháp pháo và khoang động cơ sau chỉ mỏng 30–40 mm.
  - *Cơ chế đột kích nóc & luồng xuyên nổ lõm (36.18–56.32 s):* Tên lửa vọt lên đỉnh cao 150 m rồi bổ nhào thẳng đứng vào nóc mỏng; đầu đạn HEAT dùng sóng nổ ép phễu đồng thành luồng kim loại siêu tốc 8 km/s xuyên thủng nóc và kích nổ hầm đạn bên dưới.
  - *Lời giải sống còn (56.32–70.10 s):* Không thể đắp thêm thép, xe tăng hiện đại dùng hệ thống phòng vệ chủ động (APS) với radar AESA quét 360° phát hiện mục tiêu trong vài phần nghìn giây và phóng đạn đánh chặn nổ tung mối đe dọa trước khi chạm giáp.
- **Người xem hiểu gì ở cuối:** Cuộc đấu tăng – chống tăng hiện đại đã chuyển từ "đua độ dày thép thụ động" sang "khai thác tử huyệt hình học từ trên cao và lá chắn đánh chặn chủ động bằng radar".

## Phong cách (→ `src/design/`)
- **Toàn bộ 100% là 3D (`type: "code"` với `<Stage>` + `<Cam>`), tuyệt đối không lặp bố cục hay góc máy giữa bất kỳ hai cảnh nào.**
- **Hai không gian ánh sáng 3D đối lập có chủ đích:**
  1. **Chiến trường Thảo nguyên Hoàng hôn Lạnh (`STAGE_BATTLE` — dùng cho S01, S02, S03, S04, S07, S09 phần nổ ngoài, S10):** Trời chiều muộn Đông Âu tương phản cao (`sky: ['#182842', '#7a6f78', '#d9955f']`), mặt trời xiên thấp `[-58, 26, 34]` màu vàng hổ phách `#ffd39b` (`sunIntensity: 3.1`), sương khói chiến trường `[90, 420]`, đất thảo nguyên lồi lõm vệt xích (`low: '#3f4730'`, `high: '#6d6745'`, `rock: '#575048'`, `dry: '#947e54'`), hậu kỳ ACES Filmic + N8AO + Bloom `0.78` tôn lửa đầu nòng, vệt đạn và sóng radar.
  2. **Buồng Thử nghiệm & Giải phẫu Giáp 3D (`STAGE_LAB` — dùng cho S05, S06, S08 và đầu S09):** Không gian 3D kỹ thuật tối sâu màu thép xanh đen (`sky: ['#080e18', '#132033', '#0a111c']`), ánh sáng studio xiên sắc nét `[32, 52, 28]` (`sunIntensity: 2.8`), sàn bệ thử nghiệm 3D có vạch chia mét, vật liệu cắt lớp X-quang phát sáng mã màu vật lý (đỏ hổ phách cho giáp dày/vùng nguy hiểm, đồng nóng chảy `#ff8c3b` → `#fff2b2` cho luồng xuyên Munroe, lam ngọc `#00e5ff` cho chuẩn đo lường & radar).
- **Ngôn ngữ camera (10 cảnh = 10 bố cục & góc máy hoàn toàn khác nhau):**
  - `C01S01`: Góc cực thấp sát đất (0.6 m) ngước 15° lia vòng cung trước mũi xe tăng đang lao tới.
  - `C01S02`: Góc sườn chéo ngang 70° bắt theo viên đạn xuyên giáp APFSDS bay ngang đập vào giáp trước.
  - `C01S03`: Góc qua vai (Over-the-shoulder POV) từ công sự sườn đồi cao nhìn qua ống phóng ATGM xuống thung lũng.
  - `C01S04`: Góc Chase-Cam bám sát đuôi FPV drone có nghiêng cánh (`roll`) bổ nhào chéo xuống xe tăng.
  - `C01S05`: Góc trục đo Isometric 45° trong buồng thử nghiệm 3D với bệ cân thủy lực và 6 bức tường thép 800 mm ép kín.
  - `C01S06`: Góc Bird's-Eye 75° từ đỉnh đầu chúc thẳng xuống nóc xe tăng với vỏ giáp tách lớp (Exploded 3D View).
  - `C01S07`: Đại cảnh cắt ngang chiến trường tầm xa nâng dần theo đỉnh parabol 150 m rồi chúc thẳng đứng theo quỹ đạo bổ nhào.
  - `C01S08`: Góc cận cảnh Macro 1.2 m ngang mặt cắt 180° của đầu đạn nổ lõm (`ShapedChargeCutaway`) ngay trên tấm thép nóc.
  - `C01S09`: Góc X-quang bên trong giỏ tháp pháo & vòng đạn dưới sàn kéo giật lùi xuyên ra ngoài khi hầm đạn phát nổ dây chuyền.
  - `C01S10`: Góc 3/4 chiến thuật tầm trung cao 4 m xoay quỹ đạo quanh xe tăng gắn APS với vòm radar 360° và cú đánh chặn trên không.
- **Nhãn chữ (`HUDLabel` trong `src/design/`):** Khung HUD quân sự tối `#0c1420` viền sắc màu nhấn (`#ffb703` hoặc `#00e5ff`), font `Space Grotesk` đậm, tối đa 1 nhãn ngắn cho con số then chốt (`60 TẤN · $10M`, `800 MM RHA`, `~$500`, `150 M`, `8 KM/S`, `360° APS`).
- **Tài sản thật:** Chỉ dùng `a001` (`voice/voice.mp3`, `locked: true`). Toàn bộ mô hình 3D tự dựng và âm nhạc/SFX tổng hợp chuẩn mốc `CUE`.

## Quy ước chung
Part dùng ở nhiều cảnh (`src/parts/`), khoá và kiểm 4 góc bằng `check.py t --part` trước khi dựng cảnh.

| Part | File | 3D/2D | Kích thước thật (m) / nguồn | Props / bộ phận chuyển động | Dùng ở chương | Trạng thái |
|---|---|---|---|---|---|---|
| `MBT` | `src/parts/MBT.tsx` | 3D | Thân dài 7.9 m (cả pháo 9.8 m), rộng 3.7 m, cao 2.45 m (chuẩn MBT thế hệ 3+ M1A2/Leopard 2A7) | `turretYaw`, `gunPitch`, `recoil`, `travel`, `highlightZone` (`'none'\|'front'\|'weak'\|'both'`), `explodeAmt`, `charred`, `aps`, `apsYaw` | C01 (S01–S07, S09, S10) | ✅ |
| `ATGM` | `src/parts/ATGM.tsx` | 3D | Ống phóng + CLU dài 1.2 m, đường kính 0.14 m; đạn tên lửa dài 1.1 m, đường kính 0.127 m (chuẩn FGM-148 Javelin) | `mode` (`'missile'\|'launcher'\|'loaded'`), `finsOpen` (0..1), `thrust` (0..1), `scale` | C01 (S03, S07, S10) | ✅ |
| `FPVDrone` | `src/parts/FPVDrone.tsx` | 3D | Khung carbon X 0.52 m, mang đầu đạn PG-7VL dài 0.48 m dưới bụng | `spin` (góc quay 4 cánh quạt), `armed`, `scale` | C01 (S04) | ✅ |
| `ShapedChargeCutaway` | `src/parts/ShapedChargeCutaway.tsx` | 3D | Đầu đạn HEAT cắt bổ 180° Ø 0.36 m (macro), phễu đồng 60°, tấm thép nóc 0.10 m | `orientation`, `detonate`, `collapse`, `jet`, `pierce`, `showArmor` | C01 (S08, S09) | ✅ |
| `APSRadarPod` | `src/parts/APSRadarPod.tsx` | 3D | Bệ phóng đánh chặn 2 trục 0.95×0.75×0.78 m + mảng radar AESA + đạn đánh chặn + vòm 360° | `yaw`, `pitch`, `fireProgress`, `scanPhase`, `scanRadius`, `alertAngle` | C01 (S10) | ✅ |

- **Tên gọi thống nhất:** Xe tăng chủ lực (`MBT`), Giáp đồng nhất tương đương (`800 MM RHA`), Tên lửa đột kích nóc (`ATGM`), Luồng xuyên nổ lõm (`8 KM/S`), Hệ thống phòng vệ chủ động (`360° APS`).
- **Hiệu ứng dùng chung:** `Explosion`, `MuzzleBlast`, `DustTrail`, `Trail` từ `@skill/military/3d/fx` (tránh đặt trục `Cam` trùng hướng kéo dài của `<Trail>`).

## Chương
| Chương | Từ–đến (s) | Câu hỏi / ý của chương | Giờ / bối cảnh | Mở đầu → kết thúc bằng hình gì |
|---|---|---|---|---|
| C01 | 0.00–70.10 | Giải mã nghịch lý xe tăng 60 tấn giáp trước 800 mm gục ngã trước đạn đột kích nóc & cơ chế APS cứu mạng | Hoàng hôn thảo nguyên lạnh xen buồng giải phẫu thép 3D tối | Mở: góc sát đất ngước nhìn MBT 60 tấn nghiền xích lao tới → Kết: vòm radar APS 360° phóng đạn đánh chặn nổ tung tên lửa trên không, MBT băng qua lửa khói |

## Âm thanh (→ `plan/mix.json`)
- **Nhạc nền tổng hợp đa lớp chuẩn mốc `CUE`:**
  - **Cao trào ngay mở đầu (0.00–10.86 s):** Ostinato bass kép D2+D3 dồn dập từ giây 0.0, hi-hat 16 nốt căng, trống taiko dội ở `0.05 s`, `1.72 s` (`60 tấn`), `3.12 s` (`10 triệu đô`), và cú chặn đứng đạn xuyên giáp ở `9.24 s`.
  - **Đoạn nghịch lý phục kích (10.86–21.28 s):** Nhịp bass căng vừa, điểm nhấn phóng ATGM `15.06 s` và FPV bổ nhào `16.98 s`.
  - **Đoạn giải thích kỹ thuật lắng lấy đà (21.28–36.18 s):** Hạ bass xuống nền trầm thưa để lời giải thích phân bổ trọng lượng nổi rõ, nhấn trống trầm khi 6 khối thép 800 mm sập xuống bệ cân (`26.26 s`).
  - **Cao trào gay cấn 1 — Đột kích nóc & Luồng xuyên 8 km/s (36.18–56.32 s):** Toàn bộ dàn bass kép + hi-hat tốc độ cao trở lại, riser kéo vút từ lúc tên lửa vọt lên `41.56 s` tới cú bổ nhào chạm nóc `46.02 s`, dồn trống dập ở `50.30 s` (luồng đồng siêu tốc) và nổ hầm đạn `54.70 s`.
  - **Cao trào gay cấn 2 — APS Radar 360° Đánh chặn (56.32–70.10 s):** Riser thứ hai kéo căng từ lúc radar khóa mục tiêu `63.68 s` tới cú phóng đánh chặn `66.30 s` và bùng nổ trên không `67.18 s`, kết gọn lúc `70.10 s`.

## Đề xuất bổ sung part từ các chương
| Chương | Đề xuất | Quyết định |
|---|---|---|
| C01 | Đã bao phủ đủ 5 part 3D chuyên biệt ngay từ đầu | Khoá ở Bước A2 |

## Tiến độ
| Chương | Plan | Dựng | Kiểm |
|---|---|---|---|
| C01 | ✅ | ✅ | ✅ |
