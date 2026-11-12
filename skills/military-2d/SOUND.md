# Âm thanh video military-2d (2D chiến thuật · hành động · cơ chế + bản đồ + ảnh tư liệu)

Cách làm chung: `skills/sound-design/SKILL.md` (đọc trước). File này quy định cách đọc code `.tsx` của một cảnh `military-2d` ra đúng chất liệu âm thanh.
Nguyên tắc gốc: **âm thanh đi theo khoảng cách và sân khấu trên hình**, không đi theo từ vựng của lời đọc:
- Cảnh **bản đồ địa lý** (`GeoBase` / `SatBase`): người xem đang đứng trong phòng tác chiến — tiếng tiết chế, khô, chiến sự chỉ nghe từ rất xa.
- Cảnh **vẽ 2D chiến thuật / hành động / cơ chế** (`SideStage`, `TopStage`, mặt cắt `src/parts/`): người xem đang đứng trước trận địa hoặc bên trong khí tài — mỗi phát khai hoả, viên đạn, vụ nổ hay chuyển động cơ khí thấy trên hình đều có tiếng thật khớp mốc.
- Cảnh **ảnh tư liệu & nhân vật** (`PhotoFull`, `Person*`): tiếng màn trập / giấy hồ sơ và lớp không khí tư liệu gợi cảnh.

## 1. Đọc `.tsx` trước, tiếng sau
Mỗi cảnh, liệt kê đúng những thứ xuất hiện trên hình và mốc `from` / `at` / `cut` / `hit` / `fieldAt` của chúng trong `src/scenes/CNNSxx.tsx`
(mốc là biểu thức thì tính ra giây từ `src/cues/CNN.ts`). Mỗi thứ thuộc một dòng của bảng mục 2.
Ví dụ: lời đọc nói *"pháo kích dữ dội"* — nếu hình là `Arrow2D` trên bản đồ thì tiếng là của mũi tên; nếu hình là `<Muzzle2D>` + `<ArcShot2D>` + `<Blast2D>` trong `<SideStage>` thì đặt đủ tiếng pháo đầu nòng, tiếng rít đạn bay và tiếng nổ chạm đất!

## 2. Tiếng theo thành phần trên hình

### 2a. Cảnh vẽ 2D chiến thuật · hành động · cơ chế (`SideStage`, `TopStage`, `src/parts/`)
| Thành phần (`.tsx`) | Tiếng | Cách đặt |
|---|---|---|
| `Muzzle2D` (súng trường / súng máy từ `Soldier2D` hoặc ụ súng) | tiếng súng trường / loạt ngắn súng máy sắc gọn (`rifle`, `mg burst`) | `align: "peak"` tại `at` |
| `Muzzle2D` (pháo xe tăng / lựu pháo / ống phóng `tube`) | cú nổ đầu nòng đanh + lực đẩy trầm (`cannon fire`, `rpg launch`) | `align: "peak"` tại `at` |
| `Tracer2D` | tiếng đạn vút nhanh qua không khí (`bullet whiz` / `ricochet` nhẹ) | `align: "start"` tại `at`, dài ≈ `dur`; bắn loạt dày thì chỉ lấy 2–3 viên đại diện |
| `ArcShot2D` | tiếng rít đạn pháo / cối bay cầu vồng (`artillery whistle` / `mortar incoming`) | kết thúc đúng tại `at + dur` (ngay trước cú nổ chạm đất) |
| `Blast2D` / `Shock2D` | vụ nổ thật + đất đá văng (`explosion`, `debris`), cỡ tỷ lệ với `size` (`air` = nổ phòng không gọn, đanh) | `align: "peak"` tại `at` |
| Khí tài 2D di chuyển (`src/parts/`: xe tăng, thiết giáp, trực thăng, máy bay) | một lớp động cơ / xích nghiến / cánh quạt trầm vừa phải, lùi dưới lời (`lp` 2–3 kHz) | `align: "start"` suốt quãng xe/máy bay chạy trong khung, `fi` / `fo` 0.6 s |
| Cơ chế / mặt cắt 2D (khoá nòng trượt, nạp đạn, tách lớp vỏ, tia năng lượng) | tiếng cơ khí kim loại khớp từng nhịp (`metal latch`, `hydraulic`, `servo`, xung trầm) | đúng mốc `prog(t, a, b)` của bộ phận chuyển động |
| `Fan2D` / `FocusBox` | tiếng quét / khoá ngắm rất nhẹ (`soft scan`, `focus tick`) | `align: "start"` tại `from`, gain thấp |

### 2b. Cảnh bản đồ địa lý (`GeoBase` / `SatBase`)
Mọi SFX của bản đồ dùng `"stage": "dry"`, gain thấp, cùng MỘT họ tiếng cho cả phim:

| Thành phần (`.tsx`) | Tiếng | Cách đặt |
|---|---|---|
| `Arrow2D` | nét trượt / whoosh ngắn, hơi trầm cho mũi chủ lực, mảnh hơn cho `feint` | `align: "start"` tại `from`, dài ≈ `dur`; đuôi tắt đúng lúc đầu mũi tên dừng |
| `FrontLine` vẽ ra | nét bút / dao kéo trên giấy | `align: "start"` tại `from` |
| `FrontLine` / `Zone2D` dịch (`shift`) | tiếng trầm dâng chậm, căng | phủ trọn khoảng `prog(t, a, b)` của `shift`, `fi` + `fo` dài |
| `Zone2D` hiện | tiếng "thở" trầm rất nhẹ | 1 lần, bỏ nếu cùng lúc có thứ khác |
| `UnitMark` hiện | dập nhẹ (quân cờ đặt xuống bàn, dấu gỗ) | `align: "peak"` tại `from`; nhiều đơn vị hiện dồn trong < 1 s thì chỉ 1–2 tiếng |
| `UnitMark hit` | cú đục trầm ngắn + im | `align: "peak"` tại `hit` |
| `Route2D` | gần như không tiếng; `cut` = một tiếng đứt / cắt khô | `align: "peak"` tại `cut` |
| `RangeRing` | tiếng quét / ping mềm một lần | tại `from`; `sweep` không lặp tiếng theo vòng quay |
| `Clash2D` | nổ / pháo **rất xa, đục** (`lp` 1.5–2.5 kHz), 1 lớp, gain thấp | `align: "peak"` tại `from`; 1–2 cú là đủ |
| `MapLabel`, `Label`, `Callout` | không tiếng | (con số là ý chính của câu thì 1 tick nhẹ) |

- Trên cảnh **thuần bản đồ**, **cấm tiếng nổ cận / súng máy chát chúa** (chỉ nổ thật khi đã cắt sang cảnh vẽ 2D hành động ở mục 2a!).

### 2c. Ảnh tư liệu & thẻ nhân vật
| Thành phần (`.tsx`) | Tiếng | Cách đặt |
|---|---|---|
| `PhotoCard` | giấy ảnh trượt / đặt xuống bàn | `align: "peak"` tại `from` |
| `PhotoFull` | màn trập máy ảnh cơ hoặc cú trầm nhẹ khi vào ảnh; giữ > 4 s thì lót 1 lớp nền gợi cảnh dịu (`lp` 6 kHz) | vào: `align: "peak"` tại `from`; nền: `loop_to` = `until`, `fi` / `fo` 0.8 s |
| `PersonCutout` | giấy xé + dán (2 lớp ngắn): người bật lên, mẩu tên dán xuống sau 0.28 s | `from` và `from + 0.28` |
| `PersonNews` | tiếng quét ngang kiểu bản tin, gọn, sáng | `align: "start"` tại `from + 0.14` |
| `PersonDossier` | bìa hồ sơ đặt xuống → máy chữ cơ cho từng dòng → dấu đóng | bìa tại `from`; máy chữ tại từng `fieldAt`; dấu đóng tại dòng cuối + 0.9 |
| `PersonTitle` | cú trầm thiết kế + khoảng lặng ngắn trước đó | `align: "peak"` tại `from + 0.35`; `duck` nhạc nhẹ |
| Chuyển cảnh | không tiếng; chỉ whoosh nhẹ khi nhảy cấp nhìn từ bản đồ vĩ mô cắt thẳng xuống trận địa `SideStage` / `TopStage` | |

- Mật độ: cảnh bản đồ ≤ ~1 SFX mỗi 1.5 s; cảnh giao chiến 2D được đặt theo từng phát bắn/nổ nhưng gộp các phát sát nhau < 0.18 s và luôn hạ dải 1–4 kHz để không đè lời đọc.

## 3. Tiếng nền (`amb` trong `mix.json`, phủ kín phim)
- Đặt một lớp nền xuyên suốt nhẹ (`hp` 100–140, gain ~0.1–0.2): gió thảo nguyên / rừng xa hoặc không gian phòng chỉ huy.
- Ở các cảnh `SideStage` ngoài trời hoặc `PhotoFull` dài, có thể chồng lớp gió / mưa / chiến trường xa theo `stages` hoặc SFX loop dịu để cảnh có chiều sâu không gian.

## 4. Nhạc
- Đoạn phân tích chiến thuật / cơ chế / bản đồ: nhịp pulse đều, gọn, ít giai điệu (70–100 BPM), nhường lời.
- Đoạn giao tranh 2D cao trào (`SideStage` / tấn công quyết định): đẩy nhịp căng và dày hơn; đoạn hậu quả / thương vong (`PhotoFull`): rút nhạc xuống tối giản hoặc lặng.
- Điểm đổi đoạn nhạc đặt trùng điểm chuyển sân khấu lớn (ví dụ từ bản đồ chiến dịch cắt xuống trận đánh 2D, hoặc vào `PersonTitle`).
- Tránh: nhạc có lời; quân nhạc minh hoạ lộ liễu trừ khi người dùng yêu cầu; EDM.

## 5. Tự kiểm
1. Mỗi SFX trỏ được về một thành phần / chuyển động cụ thể trong `.tsx` và khớp đúng mốc giây của nó.
2. Cảnh thuần bản đồ nghe tiết chế; cảnh 2D giao chiến nghe có lực vật lý mà giọng đọc vẫn rõ từng chữ.
3. `python3 skills/military-2d/tools/review.py <id>` sạch lỗi và cảnh báo âm thanh; `.build/sound_report.txt` đạt "lời rõ" ở mọi cảnh.
