# Shot plan: chapter5 — Pháo binh: những cuộc đánh đổi phía sau khẩu pháo (471.8 s)

Voice: `input/voice.mp3`. Mốc là giây voice. Máy đọc: `plan/scenes.json`, mốc: `video/cues.ts`.
**Đợt thử hiện tại:** dựng S01, S09 (3D) và S03, S13 (2D); các cảnh khác để khung giữ chỗ.

## 1. Ý tưởng
- Câu hỏi mở đầu: kíp pháo gần như không bao giờ thấy thứ mình bắn trúng — vậy pháo bắn trúng bằng cách nào, và vì sao có nhiều loại pháo?
- Mô-típ xuyên suốt: **đường quỹ đạo cam** nối pháo với mục tiêu = "khoảng cách cần đóng lại"; cảm biến/radar luôn là **màu teal**.

## 2. Thiết kế mỹ thuật riêng
- Không khí: đồng quê ôn đới cuối thu, **chiều muộn (golden hour)**: nắng thấp màu mật ong, bóng đổ dài, khói và bụi bắt nắng, chân trời mờ ấm.
- Bảng màu 2D: giấy kỹ thuật kem `#efe6d2`, mực `#2a2a26`, ô liu `#5f6b3a`, đất son `#b98a4a`, nhấn quỹ đạo cam `#e8772e`, cảm biến teal `#2fb3a8`, nguy hiểm đỏ `#d94a3a`. Mặt cắt có 2–3 tông, bóng `#sh`, hạt `Grain`.
- 3D: sky `['#4f7fb5', '#f0c890', '#d8b48a']`, nắng `#ffd49a` thấp từ phía tây (`sun ≈ [-60, 22, 30]`), exposure 1.05, sương ấm 150–700 m, bloom nhẹ cho lửa. Đất: ruộng rạ vàng nâu + bờ cây xanh thẫm + đất xới.
- Xe: sơn ô liu `#5f6b3a` loang `#3f4a2a`/`#8c7d52`/`#2a2e22`, mòn mép, bùn ở chân.
- Camera: 3D chuyển động chậm có quán tính (dolly, crane, bay bám đạn); 2D trượt và đẩy vào chi tiết bằng `Cam2D`.

## 3. Mô hình & hình dùng chung (`video/local/`)
| Tên | Loại | Kích thước thật | Bộ phận chuyển động | Dùng ở |
|---|---|---|---|---|
| `SPH` | 3D | Pháo tự hành bánh xích 155 mm kiểu M109: thân 6.2 × 3.15 m, cao 3.2 m, nòng 39 cỡ ≈ 6 m | `elev` nâng nòng, `yaw` tháp, `recoil`, `travel` (xích + bánh) | S01, S09 |
| `Shell155` | 3D | Đạn 155 mm dài 0.8 m, Ø 155 mm | — (`scale` phóng to khi bay) | S01, S09 |
| `RadarTruck` | 3D | Xe 6×6 dài 8 m, mặt radar 2.4 × 1.8 m | `yaw` mặt radar, `glow` | S09 |

## 4. Phân cảnh
| Cảnh | Mốc (s) | 2D/3D | Góc máy & diễn biến | CUE chính | SFX |
|---|---|---|---|---|---|
| **S01** | 0–26.20 | 3D | Mở: dolly thấp dọc thân pháo trên ruộng rạ lúc chiều; nòng nâng; **bắn** (`s01_fire`) — giật nòng, lửa, khói; camera bám đạn lên cao (`s01_climb`), mây và mặt đất xa dần; đạn rơi xuống mục tiêu khuất sau bờ cây (`s01_cannotSee`) → **nổ** (`s01_lands`); cắt về chỗ pháo: pháo đã chạy, chỉ còn vệt xích và bụi (`s01_drive`); cuối crane cao: chỗ pháo và cột khói mục tiêu ở hai mép khung, cách nhau cả cánh đồng (`s01_samePic`). Nhãn "800 m/s" ở `s01_800`. | s01_fire 3.70, s01_lands 16.14 | cannon 3.70, boom 16.14 |
| S02 | 26.20–50.90 | 2D | Bản đồ: vòng tầm 20/30 km, các loại pháo, cán cân đánh đổi | | |
| **S03** | 50.90–87.96 | 2D | **Mặt cắt kỹ thuật nhìn ngang** trên giấy kem: nòng ngắn — khí đẩy đạn một đoạn, đạn rời chậm (`s03_gas`); nòng dài ra, khí đẩy lâu hơn, đạn rời nhanh (`s03_faster`). `s03_heavier`: đạn to hơn. `s03_bigger`: kéo lùi thấy cả khẩu pháo to nặng lún bánh. `s03_155`: nhãn "155 mm". Thước tầm cuối khung: 20→30 km (`s03_range20/30`), gắn đạn rocket / base-bleed (`s03_ext`) → 40 km (`s03_40`). `s03_costs`: ba quả cân "trọng lượng, tiền, tuổi thọ nòng" rơi lên đĩa cân. | s03_faster 56.56 | cannon 56.56 |
| S04 | 87.96–116.46 | 2D | Mòn nòng | | |
| S05 | 116.46–143.10 | 3D | Lựu pháo vs pháo nòng dài qua đồi | | |
| S06 | 143.10–165.48 | 2D | Tốc độ bắn | | |
| S07 | 165.48–190.48 | 3D | Súng cối | | |
| S08 | 190.48–210.62 | 2D | Kéo vs tự hành | | |
| **S09** | 210.62–232.70 | 3D | Chiều muộn, góc cao phía sau **RadarTruck** nhìn ra cánh đồng. Đạn địch bay qua trời (`s09_radar`), mặt radar xoay theo, quạt quét teal; `s09_trace`: đường teal vẽ ngược theo quỹ đạo về điểm bắn, vòng đỏ khoanh vị trí. `s09_counter`: phản pháo phía mình khai hỏa (đạn cam bay đi). `s09_scoot`: cắt sang pháo SPH phía bên kia: chạy vào vị trí (`s09_move`), dừng, nâng nòng, bắn (`s09_fires`), chạy đi tung bụi (`s09_leaves`); đạn phản pháo rơi đúng chỗ trống (`s09_impact`). | s09_counter 217.90, s09_impact 230.24 | rocket→cannon 217.90, boom 230.24 |
| S10 | 232.70–253.76 | 2D | Bản đồ vị trí dùng hai lần | | |
| S11 | 253.76–281.76 | 2D | Vòng lặp quan sát → FDC → bắn → hiệu chỉnh | | |
| S12 | 281.76–308.14 | 3D | MRSI | | |
| **S13** | 308.14–340.56 | 2D | **Từ trên xuống** một mục tiêu (ụ súng trên đồng): `s13_belt` hàng chục hố đạn rải rộng, chỉ vài hố gần; `s13_20th` cắt sang đống vỏ đạn chất cao (nhãn "20th century"). `s13_guided`: khung chèn mặt cắt đạn dẫn đường: đầu GPS, cánh lái bật ra (nhãn "GPS" ở `s13_gps`); `s13_meters`: một đạn rơi trúng tâm (`s13_single` nổ). `s13_price`: giá vọt lên (chồng đồng xu); `s13_jammer`: sóng nhiễu đỏ, đạn lệch. `s13_both`: hai giá đạn — nhiều đạn thường / ít đạn dẫn đường. | s13_single 325.84 | boom 325.84 |
| S14–S18 | 340.56–471.80 | | Ngòi nổ, hậu cần, mạng cảm biến, cuộc đua tốc độ, tổng kết | | |

## 5. Phân công subagent (đợt thử)
- Subagent 1: S01 · Subagent 2: S09 · Subagent 3: S03 · Subagent 4: S13

## 6. Âm thanh
- Nhạc synth: pad trầm, bass vào từ S03, hats ở S09, hits trùng các cú nổ lớn.
- SFX: theo cột trên, mốc lấy từ CUE trong code.
