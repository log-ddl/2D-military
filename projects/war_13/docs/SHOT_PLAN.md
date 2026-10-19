# Shot plan (video dài): war_13

Mốc là giây toàn phim (tổng thời lượng `464.48s`). Mặc định không có chữ trên hình. Mọi điều cần nhớ suốt phim ghi ở đây; đầu mỗi chương đọc lại phần "Quy ước" và "Trạng thái cuối" của chương trước.

## Lập luận biên tập
- **Khoảng trống nhận thức ở Hook (0.00–26.86s):** Người xem thường nghĩ muốn chặn một quả tên lửa hành trình hiện đại thì phải bắn hạ nó bằng tên lửa phòng không hay pháo cao xạ (có lửa, khói, mảnh vỡ). Nhưng ngay từ khung hình đầu tiên, một quả tên lửa đang bay nhận tín hiệu dẫn đường từ vệ tinh cách `20,000 km` — tín hiệu ấy khi tới mặt đất còn yếu hơn cả tiếng rào rào nền của phổ vô tuyến, chỉ được nhận ra nhờ khớp đúng mẫu xung (pattern). Một hộp phát nhiễu nhỏ bằng hộp cơm trưa đặt dưới đất phát nhiễu đè lên tần số đó làm tín hiệu vệ tinh bị nuốt chửng: không tiếng nổ, không khói, không mảnh vỡ, nhưng quả tên lửa mù tọa độ và tự bay lệch khỏi mục tiêu.
- **Câu hỏi trung tâm (26.86–52.58s):** Làm thế nào một trận đánh hiện đại lại phân thắng bại mà không ai nổ súng, và vì sao quân đội chi hàng tỷ đô cho cuộc chiến vô hình này?
- **Cách kể xuyên suốt toàn phim:** Biến "phổ điện từ vô hình" thành **các quan hệ vật lý và không gian nhìn thấy được** qua hai cấp độ đan xen linh hoạt (không đổi góc liên tục gây chóng mặt, mỗi cụm giữ góc nhìn đủ lâu để phát triển trạng thái rồi mới chuyển góc khi câu hỏi thay đổi):
  1. **Góc ngang & Mặt cắt cơ chế (`SIDE` / `CUTAWAY` — theo `code-video-mechanism-2d`):** Dùng khi cần mở bên trong tên lửa, máy bay, bộ thu RWR, cơ chế bắt–trả xung trễ (DRFM), đám mây sợi kim loại Chaff cắt theo bước sóng, khối quán tính IMU + camera đối chiếu mặt đất, và cửa sổ phổ tần số / búp sóng anten.
  2. **Góc nhìn từ trên xuống (`TOP` — theo `code-video-tactics-2d`):** Dùng khi cần thấy bố cục không gian rộng, định hướng nguồn phát (triangulation), cự ly lệch hàng trăm mét khi tên lửa bị lừa cổng bám, đội hình máy bay gây nhiễu tầm xa (Standoff Jammer) mở hành lang che biên đội tấn công, đường bay thực tế lệch khỏi đường bay tưởng tượng khi UAV bị Spoofing, và kỷ luật im lặng vô tuyến của Sở chỉ huy lục quân.

## Chương
| # | Mốc (giây) | Câu hỏi người xem | Cách kể chính | Góc máy · nơi chủ đạo | Nối sang chương sau |
|---|---|---|---|---|---|
| 1 | `0.00–52.58` | Vì sao một hộp phát nhiễu nhỏ bằng hộp cơm trưa có thể làm lệch hướng tên lửa mà không cần bắn viên đạn nào? | Cơ chế (mặt cắt đầu tự dẫn & dải phổ) → Chiến thuật (bản đồ 3 trụ cột EW) | `SIDE` (0–26.86s: không trung & mặt đất) → `TOP` (26.86–52.58s: không gian chiến trường liên kết sóng) | Giữ sơ đồ 3 vòng sóng trên bản đồ `TOP`, đi sâu vào trụ cột thứ nhất: Nghe (Listening) |
| 2 | `52.58–165.02` | Làm sao biết địch đang phát sóng gì để nghe lén (Support) và làm mù/đánh lừa radar địch (Attack)? | Chiến thuật (thu định hướng) → Cơ chế (buồng lái RWR, nhại xung DRFM, Chaff & Decoy) → Chiến thuật (tên lửa bắn trượt) | `TOP` (52.58–84.96s: trạm thu & nhịp xung) → `SIDE` (84.96–108.22s: buồng lái RWR) → `TOP/SIDE` (108.22–141.36s: nhiễu ồn & nhại xung DRFM kéo lệch tên lửa) → `SIDE` (141.36–165.02s: phóng Chaff & Decoy) | Từ chiếc máy bay đang phát xung gây nhiễu mạnh ở cuối Chương 2, mở ra mặt trái nguy hiểm của chính luồng sóng đó |
| 3 | `165.02–277.10` | Khi máy gây nhiễu tự biến mình thành ngọn hải đăng hút tên lửa diệt bức xạ, làm sao sống sót và bảo vệ liên lạc của chính mình (Protection)? | Chiến thuật (hải đăng sóng & Standoff Jammer) → Cơ chế (nhảy tần, trải phổ, anten hướng & bảng tín hiệu phần mềm) | `SIDE` (165.02–192.42s: tên lửa bám chùm nhiễu) → `SIDE` rồi `TOP` (192.42–217.24s: máy bay Standoff Jammer mang pod che đội hình) → `SIDE` cơ chế (217.24–277.10s: nhảy tần, trải phổ, anten null-steering & bảng tra tín hiệu) | Từ bảng phần mềm cập nhật liên tục giữa công và thủ, đi vào ví dụ nổi tiếng nhất nơi cả hai phe giằng co: Dẫn đường (Navigation) |
| 4 | `277.10–341.74` | Khi tín hiệu vệ tinh bị nhiễu hoặc bị làm giả (Spoofing), vũ khí tự tìm đường bằng cách nào và vì sao Spoofing lại nguy hiểm hơn nhiễu ồn? | Cơ chế (mặt cắt tên lửa với IMU + camera địa hình) → Chiến thuật (bản đồ UAV/tàu bị Spoofing dẫn đi lạc) | `SIDE` mặt cắt (277.10–309.42s: đạn/tên lửa bị nhiễu GPS bật IMU + camera quét đất) → `TOP` bản đồ đối chiếu nhận thức (309.42–341.74s: Spoofer phát sóng giả dắt UAV và tàu lệch đường) | Từ sóng dẫn đường bị thao túng trên không/biển, chuyển xuống mặt đất nơi thông tin liên lạc bộ đàm là tử huyệt của lục quân |
| 5 | `341.74–393.14` | Vì sao lên tiếng trên bộ đàm là tự chỉ điểm cho pháo binh địch, và cuộc chiến sóng giữa người lái UAV với lính dò sóng diễn ra thế nào? | Chiến thuật (giao hội định vị HQ & kỷ luật im lặng cơ động) → Góc ngang đối kháng (tổ UAV tiền duyên vs máy dò) | `TOP` bản đồ lục quân (341.74–364.18s: giao hội sóng diệt HQ nói nhiều vs HQ im lặng di chuyển) → `SIDE` chiến hào (364.18–393.14s: lính lái FPV có máy báo nhiễu vs lính địch cầm máy dò vị trí người lái) | Từ cuộc đấu sóng trước khi có tiếng nổ ở chiến hào, lùi ra toàn cảnh mạng lưới chỉ huy để nhìn nghịch lý lớn nhất của chiến tranh hiện đại |
| 6 | `393.14–464.48` | Nếu chiến tranh hiện đại là làm đối phương mù và điếc, thì vũ khí quyết định thực sự là thiết bị phần cứng hay thư viện dữ liệu — và quả tên lửa đầu phim trông khác đi thế nào? | Chiến thuật (làm mù nút mạng lưới) → Cơ chế (trắc thủ & thư viện bản ghi sóng) → Tổng hợp toàn cảnh (Callback tên lửa Chương 1) | `TOP` mạng lưới (393.14–414.76s: nút mạng bị cô lập) → `SIDE` (414.76–441.22s: đối chiếu phần cứng vs thư viện dữ liệu sóng & trắc thủ) → `SIDE` mặt cắt toàn cảnh (441.22–464.48s: quả tên lửa Chương 1 hội tụ đủ 5 cơ chế bay qua cảnh quan quy tắc vô tuyến) | Kết phim trên hành trình quả tên lửa xuyên qua phổ sóng vô hình |

## Quy ước hình
- **Bảng màu (`P` trong `scenes/shared/palette.ts`):**
  - **Phe ta / Phương tiện đang giải thích cơ chế bảo vệ & tấn công đường không:** Thân `P.olive` (`#7d8b5a`), mảng tối `P.oliveDark` (`#56633d`), nắp/cánh trên `P.oliveLight` (`#a9b47f`).
  - **Phe đối phương / Đài radar phòng không, trạm gây nhiễu mặt đất, trạm dò sóng, tên lửa đánh chặn:** Thân `P.enemy` (`#b4493c`), mảng sáng `P.enemyLight` (`#d58f7c`).
  - **Tín hiệu hợp lệ / Sóng vệ tinh / Đường truyền đồng đội / Cổng khóa đúng / Camera quét địa hình:** Xanh da trời `P.sky` (`#38bdf8`).
  - **Tín hiệu chú ý / Xung nhại đánh lừa (Deception / Spoofing) / Con quay IMU / Nhảy tần / Cảnh báo RWR:** Vàng hổ phách `P.amber` (`#f59e0b`).
  - **Nhiễu ồn (Noise Jamming) / Vùng cấm / Chùm sóng thù địch / Giao hội chỉ điểm:** Đỏ gạch `P.enemy` (`#b4493c`).
  - **Nhiễu nền tự nhiên của phổ vô tuyến (Background hiss) / Đám mây sợi kim loại Chaff / Thiết bị phần cứng phụ:** Xám lam `P.slate` (`#64748b`) và `P.light` (`#cbd5e1`).
- **Hướng di chuyển trên màn hình:**
  - Phương tiện bay phe ta (Tên lửa hành trình, Tiêm kích, Máy bay Standoff Jammer, UAV): Bay từ **Trái sang Phải** (`+x`).
  - Đài radar phòng không, Trạm gây nhiễu/Spoofer, Tên lửa phòng không/diệt bức xạ đối phương: Đặt ở **Bên Phải hoặc Phía Dưới**, hướng sóng và phóng đạn từ **Phải sang Trái** (`-x`) hoặc từ **Dưới lên Trên** (`-y`).
- **Hình đại diện cho ý (Ngôn ngữ hình thống nhất):**
  - *Tín hiệu có cấu trúc (Patterned Signal):* Chuỗi xung nhịp vuông/tam giác đều đặn màu `P.sky` có nhịp đặc trưng.
  - *Nhiễu nền (Background Hiss) & Nhiễu ồn (Noise Jamming):* Dải răng cưa hỗn loạn (`P.slate` khi là nhiễu tự nhiên thấp; `P.enemy` dày đặc cao vọt khi là nhiễu chủ động).
  - *Xung đánh lừa (Deception / Spoofing):* Xung có hình dáng giống hệt xung thật nhưng tô màu `P.amber` (hoặc bóng ma máy bay nét đứt `P.amber`), kéo khung khóa (`tracking gate`) dịch sang vị trí ảo.
  - *Im lặng vô tuyến (Radio Silence):* Vòng sóng thu nhỏ rồi tắt hẳn, đơn vị chuyển sang viền nét đứt ẩn mình trên nền địa hình.
- **Nền của mỗi nơi:**
  - *Không trung (`SIDE` Sky):* Nền sáng `P.bg`, dải tầng khí quyển/đất thấp ở đáy `P.bg2` với đường chân trời `P.ink`, ở cảnh có vệ tinh có dải quỹ đạo cao phía trên.
  - *Bản đồ chiến thuật (`TOP` Map):* Nền `P.bg`, các mảng địa hình phân vùng bằng `P.bg2`, đường bình độ và trục đường giao thông nét mảnh `P.light`/`P.ink2` giúp mắt định vị khoảng cách và chuyển động camera.
  - *Cận cảnh cơ chế / Mặt cắt (`SIDE` Cutaway / Console):* Vỏ thiết bị viền `P.ink` dày `LINE.outer`, lòng khoang máy màu `P.paper`/`P.dark` làm nổi bật các khối linh kiện và luồng tín hiệu bên trong.

## Vật xuyên phim
| Vật | Dấu nhận dạng giữ ở mọi góc nhìn | Có mặt ở chương nào |
|---|---|---|
| `CruiseMissile` (Tên lửa hành trình) | Thân trụ dài đầu nhọn, cánh giữa (گóc `TOP` chữ thập, góc `SIDE` cánh ngang + đuôi chữ thập), cửa hút gió bụng; khi mở mặt cắt (`cutaway`) lộ rõ 3 khoang: Đầu thu vệ tinh trên lưng, Khối quán tính IMU ở giữa, Camera quét đất ở mũi dưới | Chương 1, 4, 6 |
| `Satellite` (Vệ tinh dẫn đường) | Thân hộp trung tâm `P.slate`, hai cánh pin mặt trời đối xứng kẻ ô, chảo phát sóng hướng xuống | Chương 1, 4 |
| `LunchboxJammer` / `GroundJammer` (Máy phát nhiễu hộp cơm & Trạm gây nhiễu/Spoofer) | Hộp chữ nhật gọn có tay xách và anten cần thẳng đứng (cỡ nhỏ ở Ch.1) hoặc xe/trạm anten chảo đôi phát sóng `P.enemy`/`P.amber` (Ch.3, 4, 5) | Chương 1, 3, 4, 5 |
| `SamRadarSite` (Đài radar phòng không & Bệ phóng SAM) | Xe/đài radar có đĩa anten quay trên bệ chữ A + bệ phóng tên lửa phòng không nghiêng góc 45°, màu `P.enemy` | Chương 1, 2, 3, 6 |
| `StrikeJet` (Tiêm kích chiến đấu) | Dáng cánh tam giác/cánh cụp, buồng lái kính `P.glass`, mũi nhọn; có mặt cắt buồng lái (RWR) và khoang đuôi phóng Chaff/Decoy | Chương 1, 2, 3, 6 |
| `StandoffJammerJet` (Máy bay tác chiến điện tử chuyên dụng) | Máy bay 2 chỗ ngồi lớn hơn `StrikeJet`, dấu nhận dạng đặc trưng là **các pod gây nhiễu hình thoi gắn dưới cánh và hai đầu mút cánh (wingtip pods)** có chóp phát sóng | Chương 3, 6 |
| `TacticalDrone` (UAV chiến thuật / FPV) | Thân nhỏ cánh bằng hoặc 4 cánh quạt (quadcopter), anten thu GPS/radio trên lưng | Chương 4, 5 |
| `MobileHQ` & `RadioUnit` (Xe chỉ huy & Tổ bộ binh/UAV) | Xe tải thùng chỉ huy có cột anten thu phát + lính cầm bộ đàm/tay điều khiển UAV và máy dò phổ cầm tay | Chương 1, 5, 6 |
| `SignalAnalyzer` (Bàn phân tích phổ & Thư viện dữ liệu sóng) | Màn hình hiển thị dải tần/nhịp xung và bảng tra cứu các mẫu tín hiệu (lookup table) kèm trắc thủ đeo tai nghe | Chương 2, 3, 6 |

---

## Chương 1: Vì sao một hộp phát nhiễu nhỏ bằng hộp cơm trưa có thể làm lệch hướng tên lửa mà không cần bắn viên đạn nào? (`0.00–52.58s`)

### Cụm giải thích
1. **Cụm 1.1 — Hook: Tín hiệu 20.000 km yếu hơn nhiễu nền và chiếc hộp cơm làm mù tên lửa (`0.00–26.86s`, Scene `sc01`):**
   - *Đã biết:* Tên lửa hiện đại bay chính xác tới mục tiêu nhờ dẫn đường vệ tinh.
   - *Cần hiểu:* Vì sao tín hiệu hiện đại đó lại mong manh đến mức một hộp phát nhiễu nhỏ xíu dưới đất có thể vô hiệu hóa hoàn toàn mà không cần bắn hạ?
   - *Biến đổi nhìn thấy:*
     - Mở ngay khung đầu (`0.00s`): Quả tên lửa hành trình (`CruiseMissile`, góc `SIDE`, cỡ lớn ở nửa dưới khung) đang lao nhanh từ trái sang phải; phía trên là vệ tinh (`Satellite`) ở quỹ đạo phát chuỗi xung mẫu màu `P.sky` đi qua quãng đường dài `20,000 km` (callout duy nhất `20,000 km` lúc `2.58s`). Khi tới gần mặt đất (`5.00–9.00s`), biên độ xung `P.sky` thu nhỏ lại, nằm thấp hơn cả dải răng cưa nhiễu nền tự nhiên (`P.slate`).
     - Mở mặt cắt lưng tên lửa (`9.26–13.38s`): Bộ thu (`Receiver`) bên trong tên lửa có một khuôn mẫu xung (template gate) khớp chính xác với nhịp xung `P.sky`, lọc được tín hiệu ra khỏi nhiễu nền để giữ cánh lái thẳng.
     - Biến cố (`13.54–21.06s`): Dưới mặt đất xuất hiện hộp phát nhiễu nhỏ cỡ hộp cơm trưa (`LunchboxJammer`, đặt cạnh chiếc mũ sắt/balo để thấy rõ kích thước nhỏ như hộp cơm). Khi hộp bật công tắc, một cột nhiễu đỏ `P.enemy` dâng vọt lên trên đúng tần số đó, phủ kín khuôn mẫu của bộ thu trong bán kính nhiều km.
     - Hệ quả (`21.36–26.66s`): Không có vụ nổ, không có khói đen — khuôn mẫu trong đầu thu tên lửa mất khóa (chuyển sang dấu hỏi/mất sóng), cánh đuôi tên lửa rung nhẹ rồi cả quả tên lửa ngóc lệch hẳn khỏi đường ngắm mục tiêu.
2. **Cụm 1.2 — Toàn cảnh chiến trường sóng vô tuyến và 3 trụ cột Tác chiến điện tử (`26.86–52.58s`, Scene `sc02`):**
   - *Đã biết:* Một nguồn nhiễu nhỏ có thể làm lệch một tên lửa.
   - *Cần hiểu:* Vì sao toàn bộ quân đội hiện đại đều dễ tổn thương trước điều này, và cuộc chiến trên phổ vô tuyến gồm những phần nào?
   - *Biến đổi nhìn thấy:*
     - Chuyển sang góc nhìn từ trên xuống (`TOP`, `26.86–39.40s`): Từ quả tên lửa đang bay lệch, camera lùi ra toàn cảnh không gian chiến trường nơi máy bay (`StrikeJet`), xe chỉ huy (`MobileHQ`), đài radar (`SamRadarSite`), vệ tinh và tên lửa đều được nối với nhau bằng các luồng sóng vô tuyến (`P.sky`).
     - Ba tác động lên sóng (`39.40–52.58s`): Khi voice đọc *"heard, blocked, or lied to"* và *"works in three parts, each of which exists because the one before it left something open"*, trên chính không gian chiến trường đó lần lượt diễn ra 3 biến đổi nối tiếp nhau theo chuỗi nhân quả:
       1. **Heard (Support):** Một chùm sóng phát ra bị phễu thu bên ngoài bắt lấy và định vị ngược về nguồn.
       2. **Blocked (Attack):** Vì đã biết tần số từ bước nghe, một luồng sóng đỏ `P.enemy` phóng tới chặn đứt đường truyền.
       3. **Lied to / Protected (Protection):** Để vượt qua bức tường chặn và bẫy giả `P.amber`, đường truyền đổi nhịp nhảy qua khe hở để tiếp tục kết nối.

### Shot
| Scene · Mốc · Từ then chốt | Điều người xem phải THẤY | Góc máy · cỡ cảnh | Diễn biến (đầu → biến đổi → cuối) | Nối với shot sau |
|---|---|---|---|---|
| `sc01` (`0.00–26.86s`) · `20,000` @2.58, `weaker` @6.6, `pattern` @12.1, `lunchbox` @15.6, `drown` @19.0, `No bang` @21.4, `stops knowing` @25.1 | Tín hiệu vệ tinh đi 20.000 km yếu hơn nhiễu nền, bộ thu tên lửa nhận ra nhờ khuôn mẫu xung, rồi bị hộp nhiễu cỡ hộp cơm trưa dâng nhiễu đè ngập khiến tên lửa tự bay chệch hướng mà không hề bị bắn nổ | `SIDE` kết hợp Mặt cắt (`Cutaway`) khoang thu tên lửa & cửa sổ phổ tần số; tên lửa chiếm ~65% chiều ngang vùng chính, ở `13.5s` camera dịch xuống lấy cả hộp `LunchboxJammer` dưới đất | `0.0–5.0s`: Tên lửa bay ngang, xung `P.sky` từ vệ tinh truyền xuống kèm callout `20,000 km`. `5.0–13.4s`: Cửa sổ mặt cắt bộ thu trong thân tên lửa hiện rõ xung `P.sky` thấp hơn nền nhiễu `P.slate` nhưng khớp khuôn mẫu (pattern match) giữ hướng bay. `13.5–21.1s`: Dưới đất hiện `LunchboxJammer` (cỡ hộp cơm cạnh mũ lính), phát vòm nhiễu `P.enemy` làm cột nhiễu trong bộ thu vọt cao nuốt chửng mẫu xung. `21.4–26.86s`: Không khói lửa, khóa mẫu đứt, cánh lái tên lửa lệch khiến quỹ đạo tên lửa chúi chệch khỏi đường chuẩn | Hard cut đổi góc từ `SIDE` sang `TOP` (`sc02`) theo đúng quả tên lửa đang bay lệch trên bản đồ chiến trường |
| `sc02` (`26.86–52.58s`) · `without anyone firing` @29.5, `radio wave` @40.2, `heard, blocked, or lied to` @41.5–43.5, `three parts` @47.5 | Toàn bộ lực lượng hiện đại phụ thuộc vào mạng sóng vô tuyến nối giữa các đơn vị, và 3 hành động nối đuôi nhau: Nghe sóng → Chặn/Lừa sóng → Bảo vệ sóng qua khe hở | `TOP` bản đồ chiến trường rộng; các đơn vị (`StrikeJet`, `MobileHQ`, `CruiseMissile`, `SamRadarSite`) bố trí rõ 4 góc quanh vùng phổ trung tâm, chiếm ~80% khung | `26.86–34.5s`: Quả tên lửa từ `sc01` nhìn từ trên xuống đang trượt khỏi mục tiêu; camera mở rộng lộ ra xe chỉ huy, tiêm kích, radar đối phương — không có đạn bắn nhưng các đường kết nối quyết định tất cả. `34.7–43.7s`: Các vòng sóng vô tuyến `P.sky` nối giữa các đơn vị; tại `41.5s` sóng bị bắt nghe (`heard`), tại `42.2s` bị luồng đỏ chặn (`blocked`), tại `43.0s` bị bóng giả `P.amber` dẫn lệch (`lied to`). `44.2–52.58s`: 3 vùng chức năng của EW hiện lên như 3 mắt xích mở đường cho nhau, cuối cảnh camera tiến vào mắt xích thứ nhất (trạm thu nghe lén) | Nối liên tục không gian `TOP` vào đầu Chương 2 (`52.58s`) tại trạm thu sóng Electronic Support |

### Trạng thái cuối chương 1
- **Vật xuyên phim (vị trí, hướng, trạng thái):**
  - `GroundStation` (Listener): ở `[-480, -190]` trên bản đồ `TOP`, chảo thu xoay về phía đông nam hướng vào đài `SamRadarSite` (`[520, 60]`), vòng sóng `P.sky` đang bật.
  - `StrikeJet`: ở `[-110, -20]` trên bản đồ `TOP`, hướng `+x` (sang phải), có bóng ma `ghost` ở `[45, -155]`.
  - `MobileHQ`: ở `[-540, 180]` trên bản đồ `TOP`, đang phát sóng.
  - `SamRadarSite`: ở `[520, 60]` trên bản đồ `TOP`, quay mặt về phía tây (`-x`).
- **Cảnh và góc máy cuối:** `sc02` (`TOP` map), camera dừng ở `{ x: -210, y: -95, z: 1.18 }` tập trung vào cụm Trạm thu lắng nghe (`Listener`) và Tiêm kích để vào thẳng Chương 2.
- **Lỗi còn lại:** Đã sửa vị trí hộp `Receiver Pattern Scope` ở `sc01` (`boxY = -248`) để mũi tên lửa khi ngóc lệch không chạm góc hộp. Chỗ nối `sc01 -> sc02` rõ ràng.

---

## Chương 2: Làm sao biết địch đang phát sóng gì để nghe lén (Support) và làm mù/đánh lừa radar địch (Attack)? (`52.58–165.02s`)

### Cụm giải thích
1. **Cụm 2.1 — Electronic Support: Thu sóng định hướng, phân biệt nhịp xung và lập thư viện tín hiệu (`52.58–84.96s`, Scene `sc03`):**
   - *Đã biết:* Sóng vô tuyến đi khắp chiến trường và phần đầu tiên của tác chiến điện tử là lắng nghe (Listening).
   - *Cần hiểu:* Nghe sóng vô tuyến cho biết những thông tin gì, và làm sao phân biệt được từng đài radar hay đơn vị khác nhau?
   - *Biến đổi nhìn thấy:* Tiếp nối nguyên trạng thái bản đồ `TOP` cuối `sc02` (`cam = { x: -210, y: -95, z: 1.18 }`). Ba nguồn phát phía đông (Đài radar cảnh giới, Đài radar hỏa lực SAM, Trạm bộ đàm đơn vị) phát 3 chuỗi xung khác nhau. Trạm thu `Listener` (`[-480, -190]`) kẻ tia định hướng (bearing) tới từng nguồn và mở **Bảng Phân tích Nhịp xung & Thư viện Tín hiệu (Pulse Rhythm & Signal Library)** ở góc trên: 3 dòng xung có nhịp (rhythm) khác hẳn nhau được đo khoảng cách xung và xếp vào các ngăn thư viện mẫu từ thời bình.
2. **Cụm 2.2 — RWR trong buồng lái: Khi âm thanh là dấu hiệu đầu tiên của trận đánh (`84.96–108.22s`, Scene `sc04`):**
   - *Đã biết:* Mặt đất có trạm thu lớn để nghe và phân loại sóng radar.
   - *Cần hiểu:* Nguyên lý nghe đó cứu mạng phi công chiến đấu trong tích tắc như thế nào khi chưa nhìn thấy tên lửa bằng mắt thường?
   - *Biến đổi nhìn thấy:* Chuyển sang góc ngang (`SIDE` kết hợp `Cutaway` buồng lái `StrikeJet` cỡ lớn). Đài radar phòng không `SamRadarSite` ở góc phải dưới quét chùm sóng đỏ qua máy bay. Ngay khi chùm sóng chạm mũi tiêm kích (`90.58s`), hộp RWR trong mũi sáng vàng `P.amber`, truyền tín hiệu lên mũ bay phát vòng âm thanh quanh tai phi công, đồng thời đồng hồ tròn `RwrScope` hiện rõ tia phương vị (bearing) và ký hiệu kim cương đỏ báo vị trí đài SAM (`95.30s`). Lúc `98.20s`, bệ SAM phóng đạn tên lửa bị che khuất dưới tầng mây mù; nhờ tiếng báo RWR sớm vài giây, phi công lập tức nghiêng cánh cơ động thoát hiểm (`103.5s`).
3. **Cụm 2.3 — Electronic Attack (Phần 1): Từ gây nhiễu bão tuyết (Noise Jamming) đến đánh lừa xung trễ (DRFM Deception) kéo lệch tên lửa (`108.22–141.36s`, Scene `sc05`):**
   - *Đã biết:* Nhờ nghe (Support), máy bay đã biết chính xác tần số và nhịp xung của đài radar địch.
   - *Cần hiểu:* Dùng thông tin đó để tấn công ngược lại mắt thần radar bằng nhiễu ồn và bằng đánh lừa xung khác nhau thế nào, và vì sao tên lửa địch lại bắn trượt hàng trăm mét?
   - *Biến đổi nhìn thấy:*
     - *Nửa đầu (`108.22–132.98s`, `SIDE` cơ chế + màn hình `RadarScope` của địch):* Từ `111.74–119.08s`, tiêm kích phát luồng nhiễu ồn đỏ `P.enemy` đúng tần số làm màn hình `RadarScope` của đài SAM phủ kín bão tuyết (snowstorm). Từ `119.34–132.98s` (*"A cleverer version is deception"*), bão tuyết tắt: hộp DRFM trong máy bay bắt giữ đúng xung radar của địch rồi phát trả trễ (`P.amber`), làm đài radar tính sai thời gian bay của sóng và nhìn thấy 1 bóng ma máy bay ở xa hơn vài km (`126.78s`), rồi tách thành cả chục bóng ma máy bay (`131.60s`).
     - *Nửa sau (`133.14–141.36s`, `TOP` nhìn từ trên xuống để đọc rõ khoảng cách trượt hàng trăm mét):* Trên không gian `TOP`, khung khóa đỏ (`tracking gate`) của radar địch đang bám tiêm kích thật thì bị xung giả kéo trượt lùi về phía bóng ma (`range-gate pull-off`). Quả tên lửa SAM lao theo khung khóa bị kéo lệch và phát nổ tung ở khoảng trống cách máy bay thật hàng trăm mét!
4. **Cụm 2.4 — Electronic Attack (Phần 2): Công cụ vật lý Chaff & Mồi bẫy có động cơ Decoy (`141.36–165.02s`, Scene `sc06`):**
   - *Đã biết:* Có thể đánh lừa radar bằng sóng điện tử phát lại.
   - *Cần hiểu:* Các công cụ vật lý thô sơ hơn như sợi kim loại (Chaff) và mồi bẫy bay (Decoy) làm quá tải cảm biến địch theo cơ chế nào?
   - *Biến đổi nhìn thấy:* Góc ngang (`SIDE`) tiêm kích `StrikeJet`. Lúc `143.84s`, khoang đuôi bắn ra đám mây sợi kim loại `ChaffCloud`; cửa sổ phóng đại bên cạnh chỉ rõ 1 sợi kim loại có chiều dài cắt đúng bằng bước sóng radar ($\lambda/2$) nên phản xạ lại tín hiệu cực mạnh, tạo thành cơn bão điểm sáng che khuất máy bay thật. Lúc `153.18s`, từ dưới cánh tiêm kích phóng ra 2 mồi bẫy có động cơ (`AirDecoy`) tự bay phía trước và phát tán chữ ký giả kích thước lớn như tiêm kích thật. Trên màn hình `RadarScope` đối phương (`158.14–165.02s`), cảm biến vẫn hoạt động tốt nhưng ngập trong hàng loạt mục tiêu giống hệt nhau khiến cổng bám nhảy loạn xạ không biết đâu là thật.

### Shot
| Scene · Mốc · Từ then chốt | Điều người xem phải THẤY | Góc máy · cỡ cảnh | Diễn biến (đầu → biến đổi → cuối) | Nối với shot sau |
|---|---|---|---|---|
| `sc03` (`52.58–84.96s`) · `listening` @54.5, `direction` @65.2, `rhythm of its pulses` @68.8, `electronic support` @76.0, `libraries` @81.8 | Trạm thu bắt sóng từ các đài phát đối phương, xác định hướng phương vị và phân loại từng đài radar qua nhịp xung (pulse rhythm) để lưu vào thư viện mẫu | `TOP` bản đồ chiến thuật nối tiếp nguyên vị trí cuối `sc02` (`cam` từ `{x:-210,y:-95,z:1.18}` mở sang `{x:0,y:-40,z:1.0}`), kèm bảng `Signal Library` ở góc trên | `52.58–60.0s`: 3 nguồn phát địch (Radar cảnh giới, Radar SAM, Bộ đàm) phát 3 luồng sóng. `60.1–65.8s`: Trạm thu `Listener` kẻ 3 đường phương vị xác định hướng. `66.0–84.96s`: Bảng phân tích hiện 3 nhịp xung khác nhau (xung thưa, xung kép nhanh, xung cụm) và xếp vào 3 ngăn thư viện tín hiệu | Hard cut từ bản đồ `TOP` vào góc ngang `SIDE` cận cảnh buồng lái chiếc `StrikeJet` vừa xuất hiện trên bản đồ (`sc04`) |
| `sc04` (`84.96–108.22s`) · `cockpit` @86.8, `radar warning receiver` @89.2, `tone sounds` @93.2, `bearing` @96.8, `never see the missile` @99.2, `seconds to react` @105.8 | Bộ thu RWR trong buồng lái tiêm kích bắt chùm quét của radar SAM, phát âm báo trong mũ phi công và hiện hướng đe dọa trên màn hình RWR giúp phi công cơ động tránh tên lửa trước khi nhìn thấy nó | `SIDE` kết hợp `Cutaway` mũi/buồng lái `StrikeJet` (chiếm ~65% khung trái-giữa) + đồng hồ `RwrScope` lớn phía trên + đài `SamRadarSite` ở góc phải dưới | `84.96–90.3s`: Mở mặt cắt mũi `StrikeJet` lộ khối RWR nối mũ bay phi công. `90.6–98.2s`: Đài SAM quét quạt sóng đỏ chạm máy bay → vòng âm thanh `P.amber` ngân quanh mũ phi công + đồng hồ `RwrScope` hiện kim cương đỏ và tia hướng. `98.2–108.22s`: Đạn SAM phóng lên dưới lớp mây mù; phi công đã nghe âm báo nên kịp lượn chúc xuống thoát trước khi đạn tới | Giữ góc `SIDE` với chiếc `StrikeJet` và đài `SamRadarSite`, chuyển trọng tâm từ nghe (RWR) sang phản công bằng sóng (`sc05`) |
| `sc05` (`108.22–141.36s`) · `attack` @110.8, `snowstorm` @116.5, `deception` @120.5, `sends it back late` @125.4, `dozen aircraft` @131.6, `dragged away` @135.2, `hundreds of meters` @140.2 | Sự khác biệt cơ chế giữa Gây nhiễu ồn (phủ kín màn hình radar bằng bão tuyết) và Đánh lừa xung (bắt xung radar địch rồi trả trễ tạo bóng ma kéo cổng bám lệch khỏi máy bay thật làm tên lửa SAM bắn trượt hàng trăm mét) | `108.22–132.98s`: `SIDE` cơ chế (máy bay bên trái, đài SAM bên phải, màn hình `RadarScope` + hộp thu-trả xung DRFM ở trên). `133.14–141.36s`: đổi sang `TOP` để thấy rõ khoảng cách trượt ngang hàng trăm mét | `108.2–119.1s`: Máy bay phát nhiễu ồn đỏ đè tần số → `RadarScope` thành bão tuyết. `119.3–133.0s`: Hộp DRFM bắt xung đỏ, giữ trễ rồi phát lại xung vàng `P.amber` → hiện bóng ma máy bay lùi phía sau rồi tách thành hàng loạt bóng ma. `133.1–141.36s` (`TOP`): Khung khóa đỏ của radar bị kéo trượt sang bóng ma; đạn SAM bay vào khung khóa giả và nổ tung cách xa máy bay thật | Chuyển lại góc `SIDE` cận chiếc `StrikeJet` đang bay để mở khoang đuôi giải thích công cụ vật lý Chaff & Decoy (`sc06`) |
| `sc06` (`141.36–165.02s`) · `cruder tools` @142.4, `Chaff` @143.9, `wavelength` @147.8, `blizzard` @152.1, `Decoys` @153.2, `mimic the signature` @156.2, `too many things` @163.2 | Sợi kim loại Chaff cắt đúng bước sóng radar tạo đám mây phản xạ mạnh, và mồi bẫy có động cơ (Decoy) phóng ra giả chữ ký máy bay lớn — làm màn hình radar địch ngập mục tiêu không biết đâu là thật | `SIDE` (tiêm kích `StrikeJet` mở khoang đuôi phóng `ChaffCloud` và `AirDecoy`, kèm hộp phóng đại bước sóng $\lambda/2$ và màn hình `RadarScope` đối phương) | `141.36–152.6s`: Đuôi tiêm kích bắn bó sợi Chaff nở thành đám mây; khung cận cảnh cho thấy sợi kim loại dài khớp nửa bước sóng radar nên dội sóng cực mạnh che kín máy bay. `153.2–157.9s`: Phóng 2 mồi bẫy có động cơ bay phía trước phát bóng chữ ký máy bay lớn. `158.1–165.02s`: Màn hình `RadarScope` hiện 6 mục tiêu sáng rõ như nhau, cổng khóa nhảy loạn xạ | Nối sang Chương 3 (`165.02s`) trên cùng góc `SIDE`: chiếc tiêm kích đang phát sóng mạnh lập tức lộ vị trí như một ngọn hải đăng |

### Trạng thái cuối chương 2
- **Vật xuyên phim (vị trí, hướng, trạng thái):**
  - `StrikeJet`: ở `[-120, -40]` góc `SIDE`, hướng `+x`, đang mở mặt cắt khoang đuôi và phát sóng.
  - `SamRadarSite`: ở `[560, 320]` góc `SIDE`, hướng chảo về phía máy bay; màn hình `RadarScope` ở `[490, -185]` đang hiển thị nhiều mục tiêu giả.
  - `ChaffCloud`: ở `[-430, -20]`; 2 `AirDecoy` ở `[170, -145]` và `[120, 55]`.
- **Cảnh và góc máy cuối:** `sc06` (`SIDE`), camera ở `{ x: 45, y: 5, z: 1.05 }`.
- **Lỗi còn lại:** Đã cố định vòng sáng `Listener` ở đầu `sc03`, giữ `RwrScope` không chạm mép trên ở `sc04`, và tăng độ phóng camera ở `sc05`–`sc06`.

---

## Chương 3: Khi máy gây nhiễu tự biến mình thành ngọn hải đăng hút tên lửa diệt bức xạ, làm sao sống sót và bảo vệ liên lạc của chính mình (Protection)? (`165.02–277.10s`)

### Cụm giải thích
1. **Cụm 3.1 — Nghịch lý của máy gây nhiễu: Bảo vệ nhưng đồng thời tự biến mình thành ngọn hải đăng (`165.02–192.42s`, Scene `sc07`):**
   - *Đã biết:* Máy bay có thể phát sóng gây nhiễu mạnh để làm mù hoặc đánh lừa radar địch.
   - *Cần hiểu:* Cái giá nguy hiểm mà chính chiếc máy bay phát nhiễu phải gánh chịu là gì, và vì sao quyết định tốt nhất nhiều khi lại là tắt máy gây nhiễu đi?
   - *Biến đổi nhìn thấy:* Nối trực tiếp từ cuối `sc06` (`SIDE`, `cam = {x:45,y:5,z:1.05}`). Chiếc `StrikeJet` ở `[-160, -50]` phát chùm sóng gây nhiễu cực mạnh (`P.amber` / `P.enemy`) về phía đài địch — làm mù đài radar nhưng đồng thời tỏa ra các vòng sáng như ngọn hải đăng (`beacon`) khiến mọi bộ thu từ xa đều thấy. Lúc `175.5s`, bệ phóng đối phương bắn một quả tên lửa tự dẫn bám bức xạ (home-on-jam missile) lao ngược chính giữa chùm sóng gây nhiễu về phía máy bay! Lúc `183.06–192.20s`, hộp điều khiển công tắc jammer trên máy bay hiện trạng thái giằng co (`ON` vs `OFF`), và tại `189.88s` phi công gạt sang **OFF**: chùm sóng hải đăng tắt phụt, quả tên lửa mất đường dẫn trượt thẳng qua khoảng không phía dưới.
2. **Cụm 3.2 — Máy bay gây nhiễu tầm xa chuyên dụng (`StandoffJammerJet`) che chắn cho đội hình tấn công (`192.42–217.24s`, Scene `sc08`):**
   - *Đã biết:* Máy bay tấn công tự bật jammer ở gần địch sẽ dễ bị bắn hạ.
   - *Cần hiểu:* Máy bay tác chiến điện tử chuyên dụng được thiết kế khác tiêm kích thường thế nào và phối hợp đội hình ra sao để che cho biên đội tấn công?
   - *Biến đổi nhìn thấy:*
     - *Nửa đầu (`192.42–203.5s`, `SIDE` cận cảnh thiết kế):* Xuất hiện chiếc `StandoffJammerJet` cỡ lớn (`scale = 2.15`) 2 chỗ ngồi, làm nổi bật các pod gây nhiễu hình thoi treo dưới cánh (có chong chóng phát điện ở mũi) và ở hai đầu mút cánh (wingtip pods) cùng bầu anten trên đỉnh đuôi đứng.
     - *Nửa sau (`203.5–217.24s`, `TOP` bản đồ chiến thuật):* Đổi sang góc `TOP` để đọc quan hệ khoảng cách và che chắn: chiếc `StandoffJammerJet` bay lượn ở tuyến sau (ngoài vòng tầm bắn đỏ của 2 đài `SamRadarSite`), phóng 2 luồng nhiễu định hướng cực mạnh khóa chặt 2 đài radar địch, mở ra một hành lang bóng râm an toàn cho biên đội 3 chiếc `StrikeJet` phía trước tiến vào mục tiêu mà không bị phát hiện.
3. **Cụm 3.3 — Trụ cột thứ ba: Bảo vệ điện tử (Electronic Protection: Nhảy tần, Trải phổ công suất thấp, Anten định hướng) (`217.24–252.92s`, Scene `sc09`):**
   - *Đã biết:* Đối phương luôn tìm cách nghe lén và gây nhiễu đường truyền của ta.
   - *Cần hiểu:* Làm thế nào để thiết bị vô tuyến của ta vẫn nói chuyện được với nhau bất chấp máy gây nhiễu của địch?
   - *Biến đổi nhìn thấy:* Góc ngang (`SIDE` kết hợp Bảng Cơ chế Phổ & Búp sóng ở trung tâm giữa Xe chỉ huy `MobileHQ` bên trái và Tiêm kích `StrikeJet` bên phải, có trạm gây nhiễu địch ở phía dưới):
     - `224.10–231.98s` (*Nhảy tần - Frequency Hopping*): Bảng phổ chia thành 5 kênh tần số ngang; gói tin xanh `P.sky` của ta và cổng thu đồng đội nhảy đồng bộ qua các kênh mỗi phần giây khiến thanh nhiễu đỏ `P.enemy` của địch luôn đuổi hụt ở kênh cũ.
     - `231.98–240.50s` (*Trải phổ - Spread Spectrum*): Đỉnh tín hiệu cao hẹp được dàn phẳng rộng ra khắp dải tần với công suất cực thấp nằm ẩn **dưới lớp nhiễu nền tự nhiên (`P.slate`)**, khiến máy dò địch nhìn vào chỉ thấy nhiễu nền phẳng lặng.
     - `240.98–252.92s` (*Anten định hướng - Directional Antenna*): Từ anten thu mở ra đồ thị búp sóng (radiation pattern) có búp chính màu `P.sky` vươn thẳng về phía đồng đội và hõm triệt tiêu (null) hướng về phía máy gây nhiễu địch bên sườn, làm sóng nhiễu đỏ bị gạt ra ngoài cuộc trò chuyện.
4. **Cụm 3.4 — Không có hình thái vĩnh viễn: Cuộc đua cập nhật phần mềm và Bảng tra cứu tín hiệu (`252.92–277.10s`, Scene `sc10`):**
   - *Đã biết:* Cả tấn công (Attack) và bảo vệ (Protection) đều dựa vào các mẫu tín hiệu và thuật toán.
   - *Cần hiểu:* Vì sao một kỹ thuật tháng này hiệu quả nhưng tháng sau đã vô dụng, và tốc độ viết lại bảng tín hiệu quyết định thắng bại thế nào?
   - *Biến đổi nhìn thấy:* Góc ngang (`SIDE` cơ chế phần mềm & đối chiếu 2 bảng tra tín hiệu):
     - `252.92–263.64s`: Một xung tấn công lách qua khe hở (gap) ở dòng 3 của bộ lọc radar; ngay lập tức luồng cập nhật phần mềm (software update) chạy xuống vá kín khe hở đó, làm kỹ thuật vừa dùng bị chặn đứng ở lần kế tiếp.
     - `264.20–277.10s`: Đối chiếu trực quan 2 bảng `Lookup Table`: **Bảng bên trái (Cập nhật tức thời)** vừa nghe thấy xung lạ mới liền ghi đè dòng mới và khóa chặn ngay; **Bảng bên phải (Mất 1 năm mới cập nhật)** vẫn giữ các mẫu sóng cũ kỹ nên xung mới của đối phương đi xuyên qua dễ dàng.

### Shot
| Scene · Mốc · Từ then chốt | Điều người xem phải THẤY | Góc máy · cỡ cảnh | Diễn biến (đầu → biến đổi → cuối) | Nối với shot sau |
|---|---|---|---|---|
| `sc07` (`165.02–192.42s`) · `cost` @166.2, `beacon` @172.8, `fly down the beam` @178.6, `switch it on` @187.2, `keep it off` @191.6 | Máy gây nhiễu phát sóng mạnh tự biến mình thành ngọn hải đăng dẫn đường cho tên lửa diệt bức xạ lao thẳng theo chùm sóng về phía máy bay; khi tắt jammer thì tên lửa mất khóa | `SIDE` nối liên tục từ cuối `sc06` (`StrikeJet` bên trái-trên, đài địch bên phải-dưới, thêm hộp công tắc `JAMMER ON/OFF` ở góc trên) | `165.0–173.3s`: Máy bay phát nón sóng nhiễu sáng rực như ngọn hải đăng tỏa vòng sóng ra xa. `173.7–180.7s`: Bệ địch phóng tên lửa diệt bức xạ trượt dọc chính giữa tâm chùm sóng nhiễu lao lên máy bay. `180.8–192.42s`: Hộp điều khiển công tắc gạt sang `OFF` lúc `189.9s` → chùm sóng tắt, tên lửa mất tia dẫn bay sượt qua dưới bụng máy bay | Giữ góc `SIDE`, đổi từ chiếc tiêm kích tự mang jammer sang chiếc máy bay gây nhiễu tầm xa chuyên dụng (`sc08`) |
| `sc08` (`192.42–217.24s`) · `specialized jets` @196.8, `pods under its wings` @201.2, `wingtips` @202.8, `blind the radars` @207.8, `aircraft behind it` @214.2 | Cấu tạo pod dưới cánh/đầu mút cánh của máy bay gây nhiễu chuyên dụng (`StandoffJammerJet`) và cách nó bay ngoài vòng hỏa lực để làm mù radar địch, mở hành lang che biên đội tấn công | `192.42–203.5s`: `SIDE` cận cảnh `StandoffJammerJet` (`scale = 2.15`). `203.5–217.24s`: `TOP` bản đồ rộng thấy rõ cự ly đứng ngoài tầm bắn (standoff) và hành lang che đội hình | `192.4–203.5s` (`SIDE`): Làm nổi bật các pod dưới cánh và đầu mút cánh phát sóng định hướng. `203.5–217.24s` (`TOP`): `StandoffJammerJet` bay ngoài vòng tròn tầm bắn SAM, chiếu 2 chùm nhiễu làm mù 2 đài radar địch để 3 chiếc `StrikeJet` bay qua không bị khóa | Từ đường truyền của đội hình trên không, chuyển sang góc `SIDE` cơ chế để giải thích trụ cột thứ 3: Bảo vệ sóng (`sc09`) |
| `sc09` (`217.24–252.92s`) · `protection` @219.8, `hop between frequencies` @225.4, `below the noise` @237.2, `listen in one direction` @242.8, `conversation` @250.2 | Ba cơ chế bảo vệ đường truyền trước máy gây nhiễu: (1) Nhảy tần nhanh theo mẫu chung, (2) Trải phổ công suất thấp ẩn dưới nền nhiễu, (3) Búp sóng anten chỉ nghe hướng đồng đội và bỏ qua nhiễu sườn | `SIDE` (Xe `MobileHQ` bên trái truyền tin cho `StrikeJet` bên phải, trạm Jammer địch ở dưới; ở giữa là khung cơ chế Phổ & Búp sóng lớn chiếm ~60% khung) | `217.2–232.0s`: Gói tin `P.sky` nhảy liên tục qua 5 kênh tần số khớp với đầu thu, bỏ rơi thanh nhiễu đỏ. `232.0–240.5s`: Đỉnh sóng hạ thấp và trải rộng nằm lọt dưới dải răng cưa nhiễu nền `P.slate`. `241.0–252.92s`: Búp sóng anten vươn уз về phía đồng đội và tạo hõm chặn đứng tia nhiễu từ bên sườn | Giữ khung cơ chế tín hiệu ở trung tâm, chuyển sang bảng tra cứu phần mềm (`Lookup Table`) ở `sc10` |
| `sc10` (`252.92–277.10s`) · `no permanent form` @255.2, `software update` @263.0, `table of known signals` @266.8, `speed of rewriting` @270.2, `takes a year` @274.0 | Tác chiến điện tử là cuộc đua phần mềm: lỗ hổng bị vá bằng bản cập nhật, và so sánh trực diện giữa Bảng tín hiệu cập nhật tức thời với Bảng tín hiệu chậm 1 năm | `SIDE` sơ đồ cơ chế & đối chiếu 2 bảng `Signal Lookup Table` đặt cạnh nhau (chiếm ~75% khung) | `252.9–263.6s`: Sóng địch lọt qua khe hở ở dòng 3 → bản cập nhật phần mềm chạy xuống đóng khe hở. `264.2–277.10s`: Bên trái (bảng cập nhật nhanh) ghi nhận sóng mới vào dòng 4 và chặn ngay; bên phải (bảng chậm 1 năm) chỉ chứa mẫu cũ nên để lọt toàn bộ sóng mới | Từ cuộc đua công–thủ cập nhật liên tục, chuyển sang Chương 4 (`277.10s`) với ví dụ nổi tiếng nhất: Dẫn đường vệ tinh |

### Trạng thái cuối chương 3
- **Vật xuyên phim (vị trí, hướng, trạng thái):**
  - `StandoffJammerJet`: ở `[-520, -340]` góc `SIDE` phía trên bảng `Lookup Table` bên trái.
  - `SamRadarSite`: ở `[540, -310]` góc `SIDE` phía trên bảng `Lookup Table` bên phải.
  - Hai bảng `Signal Lookup Table`: ở `[-370, 0]` (đã cập nhật dòng 4 màu `P.sky`) và `[370, 0]` (dòng 4 bị đánh dấu đỏ `P.enemy`).
- **Cảnh và góc máy cuối:** `sc10` (`SIDE` sơ đồ đối chiếu), camera ở `{ x: 0, y: 0, z: 1.0 }`.
- **Lỗi còn lại:** Đã tách cự ly đội hình ở `sc08` để không đè cánh và gắn vật thể thật (`StandoffJammerJet` ↔ `SamRadarSite`) phía trên bảng phần mềm ở `sc10`.

---

## Chương 4: Khi tín hiệu vệ tinh bị nhiễu hoặc bị làm giả (Spoofing), vũ khí tự tìm đường bằng cách nào và vì sao Spoofing lại nguy hiểm hơn nhiễu ồn? (`277.10–341.74s`)

### Cụm giải thích
1. **Cụm 4.1 — Dẫn đường vệ tinh bị gây nhiễu và Bộ sưu tập hệ thống dự phòng bên trong vũ khí (IMU + Camera địa hình) (`277.10–309.42s`, Scene `sc11`):**
   - *Đã biết:* Tín hiệu dẫn đường vệ tinh rất yếu và dễ bị gây nhiễu (như đã thấy ở Chương 1).
   - *Cần hiểu:* Khi GPS bị gây nhiễu trên chiến trường thực tế, các nhà thiết kế đã lắp thêm những cơ chế gì bên trong quả đạn/tên lửa để nó tự biết mình đang ở đâu?
   - *Biến đổi nhìn thấy:* Góc ngang (`SIDE` kết hợp `Cutaway` sâu bên trong `CruiseMissile` cỡ lớn `scale = 2.15`, có vệ tinh ở trên và trạm gây nhiễu `GroundStation` dưới đất):
     - `277.10–295.00s`: Vệ tinh phát sóng xuống tên lửa và UAV; khi trạm gây nhiễu bật sóng đỏ `P.enemy` (`289.70s`), chiếc UAV phụ thuộc hoàn toàn vào 1 tín hiệu bị đẩy lệch khỏi mục tiêu, còn khoang thu vệ tinh (`receiver`) trên lưng `CruiseMissile` chuyển sang đỏ (`jammed`).
     - `295.00–308.66s`: Ngay trong khoang mặt cắt của `CruiseMissile`, các hệ thống dự phòng tự động kích hoạt:
       1. `297.92s` (*Khối quán tính - Inertial Unit*): Khoang giữa (`imu`) sáng vàng `P.amber`, mở cửa sổ phóng đại con quay hồi chuyển 3 trục đo gia tốc tự thân của tên lửa.
       2. `300.5s` (*Camera nhận diện mặt đất*): Khoang mũi dưới (`camera`) sáng xanh `P.sky`, chiếu chùm quét quang học xuống các mỏm đồi bên dưới và khớp với đường viền địa hình lưu sẵn trong bộ nhớ, lái quả tên lửa quay lại đúng đường chuẩn và lao trúng hầm mục tiêu (`307.5s`).
2. **Cụm 4.2 — Spoofing (Đánh lừa tọa độ): Khi chiếc UAV tự tin bay lạc mà không hề biết mình bị lừa (`309.42–341.74s`, Scene `sc12`):**
   - *Đã biết:* Gây nhiễu ồn (Jamming) chặn mất tín hiệu nên vũ khí biết ngay là đang bị nhiễu để bật hệ thống dự phòng.
   - *Cần hiểu:* Spoofing khác Jamming thế nào, và vì sao việc gửi tín hiệu giả lại nguy hiểm và khó phát hiện hơn nhiều?
   - *Biến đổi nhìn thấy:* Chuyển sang góc nhìn từ trên xuống (`TOP` bản đồ ven biển `coast: true`) để đọc rõ sự lệch hướng không gian:
     - `309.42–318.76s`: Chiếc `TacticalDrone` đang bay về mục tiêu phía đông; trạm `GroundStation` (`role: 'spoofer'`) dưới đất không phát nhiễu răng cưa đỏ mà phát chuỗi xung mẫu giả màu vàng `P.amber` rất êm và chuẩn xác đè lên tín hiệu vệ tinh.
     - `318.92–326.58s`: Cửa sổ **Bản đồ trong đầu UAV ("UAV Nav Display")** ở góc trên cho thấy chiếc UAV vẫn tin rằng mình đang bay thẳng tắp trên vạch xanh tới đúng mục tiêu; nhưng trên **Bản đồ thực tế bên dưới**, luồng sóng giả `P.amber` từ từ "dắt bộ" (`slowly walks it`) chiếc UAV thật ngoặt dần lên phía bắc, cách xa đường chuẩn!
     - `326.82–336.46s`: Ở vùng biển phía nam bản đồ, một con tàu (`ShipTop`) đang chạy ngoài khơi nhưng tọa độ ảo bị Spoofing đẩy nhảy hẳn lên nằm giữa đất liền cách đó nhiều km. Cuối cảnh (`336.46–341.74s`), tia sóng chuyển sang mạng thông tin liên lạc mặt đất để nối vào Chương 5.

### Shot
| Scene · Mốc · Từ then chốt | Điều người xem phải THẤY | Góc máy · cỡ cảnh | Diễn biến (đầu → biến đổi → cuối) | Nối với shot sau |
|---|---|---|---|---|
| `sc11` (`277.10–309.42s`) · `navigation` @280.1, `pushed many guided munitions` @292.0, `inertial unit` @299.0, `camera that recognizes the ground` @301.8, `collection of backups` @307.4 | Khi sóng vệ tinh bị nhiễu, tên lửa mở mặt cắt kích hoạt (1) khối quán tính IMU tự đo chuyển động và (2) camera mũi quét khớp địa hình mặt đất để giữ đường bay trúng đích | `SIDE` kết hợp `Cutaway` lớn của `CruiseMissile` (`scale = 2.15`, chiếm ~65% khung), kèm vệ tinh ở trên, trạm nhiễu và địa hình đồi mốc ở dưới | `277.1–295.0s`: Sóng vệ tinh bị trạm nhiễu đỏ chặn; đạn không có dự phòng bay lệch, anten GPS trên tên lửa báo đỏ. `295.0–304.3s`: Khoang `IMU` sáng vàng hiện con quay 3 trục đo vận tốc; khoang `Camera` ở mũi chiếu chùm quét xanh khớp mẫu đồi bên dưới. `304.4–309.42s`: Tên lửa hiệu chỉnh cánh lái lao trúng mục tiêu nổ tung | Hard cut sang góc nhìn từ trên xuống (`TOP`, `sc12`) để thấy trường hợp tinh vi hơn: vũ khí không biết mình mất sóng vì bị Spoofing |
| `sc12` (`309.42–341.74s`) · `Spoofing` @309.6, `false one` @314.8, `slowly walks it` @317.6, `does not know it is lost` @321.4, `ships and aircraft` @328.2, `communications` @338.8 | Trạm Spoofer phát xung giả hoàn hảo làm bộ thu UAV tin tưởng; màn hình nội bộ của UAV vẫn báo bay thẳng tới đích trong khi thực tế ngoài đời UAV bị dắt lệch đi xa (và tàu biển hiện vị trí ảo trên đất liền) | `TOP` bản đồ chiến trường ven biển (`coast: true`), kèm cửa sổ `UAV Internal Nav` đối chiếu trực tiếp nhận thức ảo vs vị trí thật | `309.4–318.8s`: Trạm `Spoofer` phát sóng mẫu vàng `P.amber` êm thay thế sóng vệ tinh. `318.9–326.6s`: Trong hộp nhận thức của UAV, mũi tên vẫn đi thẳng trên đường xanh; ngoài bản đồ thật, UAV bị kéo lệch hẳn lên góc bắc. `326.8–341.74s`: Tàu biển dưới bờ nam hiện bóng ma tọa độ giả nằm sâu trên đất liền; cuối cảnh camera dịch về cụm xe bộ đàm lục quân | Nối liên tục trên góc `TOP` sang Chương 5 (`341.74s`) tại khu vực thông tin liên lạc bộ đàm lục quân |

### Trạng thái cuối chương 4
- **Vật xuyên phim (vị trí, hướng, trạng thái):**
  - `TacticalDrone`: ở `[-130, -285]` trên bản đồ `TOP` (đã bị Spoofer dắt lệch lên phía bắc).
  - `GroundStation` (Spoofer): ở `[60, 120]` trên bản đồ `TOP`.
  - `ShipTop`: tàu thật ở `[-180, 325]` dưới biển, bóng ma tọa độ giả ở `[-220, 45]` trên đất liền.
  - `MobileHQ`: vừa xuất hiện ở `[-460, 120]` đang phát các vòng sóng bộ đàm `P.sky` để dẫn sang Chương 5.
- **Cảnh và góc máy cuối:** `sc12` (`TOP`), camera dừng ở `{ x: -120, y: -20, z: 1.0 }`.
- **Lỗi còn lại:** Đã ngắt tia nhiễu ở `sc11` ngay sau khi tên lửa nổ tại `hitT = 307.6s`.

---

## Chương 5: Vì sao lên tiếng trên bộ đàm là tự chỉ điểm cho pháo binh địch, và cuộc chiến sóng giữa người lái UAV với lính dò sóng diễn ra thế nào? (`341.74–393.14s`)

### Cụm giải thích
1. **Cụm 5.1 — Tử huyệt thông tin liên lạc lục quân và Vũ khí mang tên Im lặng vô tuyến (`341.74–364.18s`, Scene `sc13`):**
   - *Đã biết:* Sóng vô tuyến dùng để dẫn đường có thể bị nghe, chặn và làm giả; điều tương tự cũng xảy ra với bộ đàm thông tin liên lạc.
   - *Cần hiểu:* Chuyện gì xảy ra với một đơn vị nói bộ đàm thiếu kỷ luật, và làm thế nào một sở chỉ huy hiện đại dùng sự im lặng và cơ động để tàng hình trước địch?
   - *Biến đổi nhìn thấy:* Nối liên tục từ cuối `sc12` trên bản đồ `TOP` (`cam = { x: -120, y: -20, z: 1.0 }`):
     - `341.74–348.2s` (*Đơn vị nói nhiều bị định vị giao hội & pháo kích*): Xe `MobileHQ` ở `[-460, 120]` phát sóng bộ đàm liên tục; 2 trạm dò sóng đối phương (`[380, -180]` và `[420, 190]`) lập tức kẻ 2 tia giao hội đỏ cắt nhau đúng tại vị trí xe, gây nhiễu cắt đứt liên lạc rồi gọi pháo binh bắn nổ (`346.8s`).
     - `348.30–364.18s` (*Kỷ luật im lặng vô tuyến*): Ở nửa bắc bản đồ, một Sở chỉ huy cơ động (`MobileHQ` thứ hai ở `[-420, -160]`) chỉ phát 1 xung ngắn ngủi, đổi tần số rồi tắt sóng hoàn toàn (`emitting: false`) và di chuyển dọc theo đường giao thông sang vị trí mới `[-80, -190]`. Hai tia dò sóng của địch quét qua chỉ bắt được cái bóng cũ trống không ở `[-420, -160]`, còn xe chỉ huy thật ở `[-80, -190]` hoàn toàn vô hình.
2. **Cụm 5.2 — Cuộc đấu phổ tần số hàng ngày của UAV chiến trường: Giữa người lính lái drone và người lính dò sóng (`364.18–393.14s`, Scene `sc14`):**
   - *Đã biết:* Các hệ thống lớn như máy bay, tên lửa, sở chỉ huy đều tranh giành phổ vô tuyến.
   - *Cần hiểu:* Ngay ở cấp độ người lính bộ binh với chiếc UAV rẻ tiền nhất chiến trường, cuộc đấu tay đôi trên phổ tần số diễn ra cụ thể như thế nào?
   - *Biến đổi nhìn thấy:* Chuyển sang góc ngang (`SIDE`) tiền duyên chiến trường:
     - Bên trái (`[-480, 320]`) là người lính phe ta (`SoldierEW` vai `drone_op`, `scale = 1.65`) cầm bộ điều khiển lái chiếc `TacticalDrone` trên không (`[-40, -110]`); bên phải (`[480, 320]`) là lính trinh sát điện tử địch (`SoldierEW` vai `df_hunter`, `scale = 1.65`) cùng hộp gây nhiễu tiền duyên (`[220, 320]`).
     - `368.48–377.50s`: Khi hộp gây nhiễu địch phát sóng đỏ chặn đường truyền UAV, chiếc máy báo nhiễu bỏ túi trên ngực người lính lái UAV sáng đèn vàng cảnh báo (mở khung phóng đại máy báo nhiễu ở góc trái trên).
     - `377.50–385.96s`: Ngược lại, thiết bị cầm tay của lính địch bên phải bắt được tia sóng từ tay cầm điều khiển phát lên UAV, hiện mũi tên chỉ thẳng về chỗ người lính lái UAV đang đứng (mở khung phóng đại màn hình dò hướng ở góc phải trên).
     - `386.28–393.14s`: Giữa bầu trời chiến hào, dải phổ tần số hiện lên cuộc giằng co quyết liệt giữa xung điều khiển xanh và tường nhiễu/tia dò đỏ trước cả khi có bất kỳ vụ nổ nào.

### Shot
| Scene · Mốc · Từ then chốt | Điều người xem phải THẤY | Góc máy · cỡ cảnh | Diễn biến (đầu → biến đổi → cuối) | Nối với shot sau |
|---|---|---|---|---|
| `sc13` (`341.74–364.18s`) · `talk on the radio` @343.2, `found by their transmission` @345.0, `silence as a weapon` @350.4, `Headquarters move` @352.4, `stays off the air` @355.8, `like nothing at all` @363.2 | Đối chiếu trên cùng bản đồ `TOP`: đơn vị phát sóng bộ đàm liên tục bị 2 trạm địch giao hội tọa độ và pháo kích; ngược lại Sở chỉ huy phát ngắn, đổi tần số, tắt máy và di chuyển nên tia dò địch quét trượt | `TOP` bản đồ chiến thuật nối liên tục từ cuối `sc12` (`cam = {x:-120,y:-20,z:1.0}` dịch sang `{x:-40,y:-30,z:1.0}`) | `341.7–348.2s`: Xe bộ đàm ở `[-460, 120]` phát sóng liên tục → 2 trạm địch kẻ tia giao hội đỏ khóa trúng và pháo kích nổ tại `346.8s`. `348.3–364.18s`: Xe HQ ở `[-420, -160]` phát 1 xung ngắn, tắt sóng và chạy sang `[-80, -190]` → tia dò địch chỉ chụm vào bóng ma ở vị trí cũ | Hard cut từ bản đồ `TOP` xuống góc ngang `SIDE` chiến hào tiền duyên (`sc14`) để xem cuộc đấu sóng của lính điều khiển UAV |
| `sc14` (`364.18–393.14s`) · `drones` @364.6, `radio link` @369.0, `warns of nearby jamming` @375.8, `where the drone's operator is standing` @379.0, `cheapest weapon` @380.8, `before anything explodes` @389.8 | Cuộc đấu sóng đối kháng trực tiếp giữa người lính lái UAV (mang máy báo nhiễu nhỏ) và người lính địch (mang máy dò tìm vị trí người lái qua sóng điều khiển) | `SIDE` chiến trường tiền duyên (Lính lái UAV bên trái, UAV ở giữa bầu trời, Hộp nhiễu & Lính dò sóng địch bên phải, kèm 2 cửa sổ thiết bị cầm tay và dải phổ tranh chấp ở giữa) | `364.2–372.8s`: Lính trái phát sóng điều khiển UAV; hộp nhiễu địch bật sóng chặn. `372.8–377.5s`: Hộp phóng đại máy báo nhiễu của lính trái nháy vàng cảnh báo. `377.5–385.9s`: Hộp phóng đại máy dò của lính phải bắt sóng ngược về vị trí người lái. `386.0–393.14s`: Dải phổ giữa hai bên giằng co quyết liệt | Chuyển sang Chương 6 (`393.14s`) lùi ra góc `TOP` mạng lưới toàn quân để thấy nghịch lý của chiến tranh mạng lưới |

### Trạng thái cuối chương 5
- **Vật xuyên phim (vị trí, hướng, trạng thái):**
  - `SoldierEW` (`drone_op`): ở `[-450, 320]` góc `SIDE`, máy báo nhiễu bỏ túi đang sáng cảnh báo `P.amber`.
  - `TacticalDrone`: ở `[-20, -65]` góc `SIDE` trên bầu trời tiền duyên.
  - `LunchboxJammer`: ở `[190, 320]` góc `SIDE`, đang phát nhiễu.
  - `SoldierEW` (`df_hunter`): ở `[450, 320]` góc `SIDE`, đang hướng anten dò về phía người lái UAV.
- **Cảnh và góc máy cuối:** `sc14` (`SIDE`), camera dừng ở `{ x: 0, y: 15, z: 1.12 }`.
- **Lỗi còn lại:** Đã tăng kích thước chủ thể lính, UAV và hộp nhiễu ở `sc14` để lấp đầy khung hình.

---

## Chương 6: Nếu chiến tranh hiện đại là làm đối phương mù và điếc, thì vũ khí quyết định thực sự là thiết bị phần cứng hay thư viện dữ liệu — và quả tên lửa đầu phim trông khác đi thế nào? (`393.14–464.48s`)

### Cụm giải thích
1. **Cụm 6.1 — Nghịch lý mạng lưới: Làm quân địch điếc và mù thay vì chỉ tiêu diệt vật lý (`393.14–414.76s`, Scene `sc15`):**
   - *Đã biết:* Từ tên lửa, máy bay đến người lính cầm UAV đều chiến đấu trên phổ vô tuyến.
   - *Cần hiểu:* Sự phụ thuộc vào mạng lưới tạo ra điểm yếu chí mạng nào ở cấp toàn quân, và mục tiêu của chiến tranh hiện đại đã dịch chuyển ra sao?
   - *Biến đổi nhìn thấy:* Góc nhìn từ trên xuống (`TOP` bản đồ mạng lưới chỉ huy):
     - `393.14–402.0s`: Một mạng lưới chỉ huy kết nối dày đặc giúp nhìn thấy mọi thứ (nút trung tâm `MobileHQ` nối sóng `P.sky` tới `SamRadarSite`, `StrikeJet`, `TacticalDrone`, đơn vị mặt đất). Khi một đòn gây nhiễu đánh trúng đúng nút trung tâm (`397.90s`), toàn bộ các nhánh mạng đồng loạt đứt phụt — làm mù cả hệ thống chỉ tại một điểm (`blinded in one place`).
     - `402.10–414.76s`: Đối chiếu hai nửa chiến trường: trước kia là tiêu diệt vật lý bằng hỏa lực nổ; nay là cắt đứt mọi vòng sóng khiến quân địch dù còn nguyên xe pháo nhưng bị **điếc và mù** (vòng sóng tắt xám, mất phương hướng), trong khi mạng lưới của quân mình vẫn giữ được đường truyền nhảy tần xanh `P.sky`.
2. **Cụm 6.2 — Điều dễ hiểu lầm nhất: Không phải thiết bị phần cứng, mà là Thư viện bản ghi thời bình và Trắc thủ nhận ra điều bất thường (`414.76–441.22s`, Scene `sc16`):**
   - *Đã biết:* Người ta thường nghĩ tác chiến điện tử là các thiết bị như máy gây nhiễu, pod hay máy bay chuyên dụng.
   - *Cần hiểu:* Thứ vũ khí quan trọng nhất thực sự quyết định bên nào thắng trong cuộc đua phổ vô tuyến là gì?
   - *Biến đổi nhìn thấy:* Góc ngang (`SIDE` đối chiếu Phần cứng vs Cơ sở dữ liệu & Trắc thủ):
     - `414.76–421.36s`: Bên trái hiện hàng thiết bị phần cứng (`LunchboxJammer`, Pod gây nhiễu, `StandoffJammerJet`) rồi mờ dần xuống cấp phụ.
     - `421.36–441.22s`: Trọng tâm sáng lên ở bên phải: **Thư viện Bản ghi Tín hiệu thu thập từ thời bình** (ngăn dữ liệu sóng đồ sộ) nối với **Trắc thủ đeo tai nghe** trước màn hình phân tích phổ. Giữa dòng xung quen thuộc, một xung bất thường (`unusual` màu `P.amber`) xuất hiện; trắc thủ lập tức khoanh vùng nhận diện điểm dị biệt đó và phát bản cập nhật đổi tần số cho toàn đội hình nhanh hơn đối phương.
3. **Cụm 6.3 — Khép lại vòng tròn: Trở lại quả tên lửa đầu phim trong "Cảnh quan của những quy tắc vô hình" (`441.22–464.48s`, Scene `sc17`):**
   - *Đã biết:* Người xem đã đi qua toàn bộ các cơ chế Nghe (Support), Chặn & Lừa (Attack), Bảo vệ & Dự phòng (Protection & Backups).
   - *Cần hiểu:* Khi nhìn lại quả tên lửa hành trình ở giây đầu tiên của video, mọi mảnh ghép ấy khớp lại với nhau như thế nào trong phổ vô tuyến?
   - *Biến đổi nhìn thấy:* Trở lại đúng góc ngang `SIDE` kết hợp `Cutaway` của quả `CruiseMissile` ở `sc01` (`441.22s`):
     - `444.02–454.04s`: Khi lời dẫn điểm lại từng thành phần, 5 cơ chế lần lượt bật sáng rõ ràng quanh và trong quả tên lửa:
       1. `receiver that listens` (`444.5s`): Khoang thu lưng tên lửa & xung mẫu vệ tinh `P.sky`.
       2. `jammer that blocks` (`446.2s`): Hộp `LunchboxJammer` dưới đất dâng bức tường nhiễu `P.enemy`.
       3. `decoy that lies` (`447.8s`): Mồi bẫy `AirDecoy` bay cạnh phát bóng chữ ký giả `P.amber`.
       4. `radio that hops` (`449.5s`): Chuỗi xung nhảy qua các bậc kênh tần số `P.sky`.
       5. `backup that looks at the ground` (`451.4s`): Khối quán tính `IMU` (`P.amber`) + `Camera` mũi quét địa hình mặt đất (`P.sky`).
     - `454.04–464.48s` (*"a place everyone has to share and nobody can see. It has no front line and no terrain. It is a landscape made of rules, and whoever knows them best moves through it unnoticed"*): Mặt đất vật lý mờ dần, nhường chỗ cho các làn quy tắc tần số (frequency lanes) trải dài khắp không gian; quả tên lửa hiểu rõ quy tắc lướt êm qua khe kênh mở màu xanh mà không bị phát hiện cho tới khung hình cuối cùng.

### Shot
| Scene · Mốc · Từ then chốt | Điều người xem phải THẤY | Góc máy · cỡ cảnh | Diễn biến (đầu → biến đổi → cuối) | Nối với shot sau |
|---|---|---|---|---|
| `sc15` (`393.14–414.76s`) · `depends on its networks` @395.2, `blinded in one place` @400.8, `destroy the enemy's army` @404.5, `making the enemy's army deaf` @408.8, `still able to hear` @411.5 | Mạng lưới nhìn thấy mọi thứ có thể bị làm mù chỉ tại một nút trung tâm; và sự chuyển dịch từ tiêu diệt vật lý sang làm quân địch điếc trong khi giữ cho quân mình nghe được | `TOP` bản đồ mạng lưới toàn quân (chiếm ~80% khung) | `393.1–402.0s`: Mạng lưới kết nối 5 đơn vị bị đánh nhiễu vào đúng nút trung tâm → tất cả nhánh mạng đứt cùng lúc. `402.1–414.76s`: Đội hình địch bị cắt đứt mọi vòng sóng thu-phát (điếc & mù) trong khi đội hình ta vẫn duy trì mạng liên lạc nhảy tần xanh `P.sky` | Chuyển sang góc `SIDE` (`sc16`) để giải phẫu cái gốc tạo nên năng lực đó: thiết bị phần cứng hay thư viện dữ liệu & con người |
| `sc16` (`414.76–441.22s`) · `set of devices` @417.8, `habits and databases` @423.4, `peacetime` @427.8, `change its own faster` @429.5, `library of recordings` @437.4, `what unusual looks like` @440.2 | Đặt cạnh nhau để thấy phần cứng (jammer, pod, máy bay) chỉ là bề nổi; vũ khí quyết định là Thư viện bản ghi tín hiệu thời bình và Trắc thủ phát hiện ngay một xung bất thường | `SIDE` đối chiếu: cụm thiết bị phần cứng bên trái và Bàn phân tích của Trắc thủ + Thư viện bản ghi sóng lớn bên phải | `414.8–421.3s`: Hiện máy gây nhiễu, pod và máy bay chuyên dụng. `421.4–431.2s`: Mở Thư viện bản ghi sóng khổng lồ thu thập từ thời bình và tốc độ đổi sóng trong chiến tranh. `431.4–441.22s`: Trắc thủ đeo tai nghe phát hiện 1 xung dị thường màu vàng `P.amber` lẫn trong chuỗi xung xanh và khóa mục tiêu | Quay trở lại quả tên lửa hành trình đầu phim (`sc17`) để kết nối toàn bộ 5 cơ chế trong cảnh kết |
| `sc17` (`441.22–464.48s`) · `return to the missile` @441.6, `receiver` @444.6, `jammer` @446.2, `decoy` @447.8, `radio that hops` @449.5, `backup` @451.4, `landscape made of rules` @460.2, `unnoticed` @463.4 | Trở lại quả tên lửa hành trình Chương 1 với mặt cắt tổng hợp cả 5 thành phần (Receiver, Jammer, Decoy, Hopping Radio, Ground Camera Backup) bay xuyên qua cảnh quan các làn quy tắc phổ vô tuyến | `SIDE` kết hợp `Cutaway` toàn cảnh giống `sc01` (`CruiseMissile` `scale = 2.05` ở trung tâm) | `441.2–444.0s`: Quả tên lửa Chương 1 xuất hiện lại. `444.0–454.0s`: Lần lượt 5 thành phần bật sáng theo đúng lời đọc (Bộ thu, Hộp nhiễu, Mồi bẫy, Bộ đàm nhảy tần, Camera quét đất). `454.0–464.48s`: Nền địa hình chuyển thành các dải quy tắc tần số; tên lửa lướt êm qua khe kênh xanh mà không bị phát hiện | Kết thúc phim tại `464.48s` |

### Trạng thái cuối chương 6
- **Vật xuyên phim (vị trí, hướng, trạng thái):**
  - `CruiseMissile`: ở `[180, 0]` góc `SIDE` kết hợp `cutaway`, `scale = 2.1`, hiển thị đầy đủ 3 khoang nội thất (`Receiver` xanh `P.sky`, `IMU` vàng `P.amber`, `Ground Camera` xanh `P.sky`) và đồng bộ cùng 5 yếu tố bao quanh (`Satellite` ở `[-360, -295]`, `LunchboxJammer` ở `[-140, 320]`, `AirDecoy` ở `[400, -155]`, hộp nhảy tần ở `[-180, -145]` và chùm quét camera xuống đất).
  - Nền địa hình đã chuyển sang các làn quy tắc phổ vô tuyến (`Spectrum Rule Lanes`), quả tên lửa lướt dọc theo làn kênh an toàn trung tâm.
- **Cảnh và góc máy cuối:** `sc17` (`SIDE` + `Cutaway`), camera dừng tại `{ x: 80, y: 0, z: 1.0 }`.
- **Lỗi còn lại:** Đã mở rộng mốc kết thúc `sc17` trong `timeline.json` lên `464.5` để mẫu biên `464.483s` không bị rơi ra ngoài clip.

## Kết thúc
- **Lỗi chỗ nối giữa chương:** Đã kiểm tra toàn bộ qua `app/out/sheets/cuts_sheet.png` (16 điểm cắt giữa 17 scene) và `app/out/sheets/full_sheet.png` (48 mẫu trải đều toàn phim `0.00–464.483s`). Các điểm nối cùng góc nhìn (`sc02→sc03`, `sc04→sc05`, `sc06→sc07`, `sc09→sc10`, `sc12→sc13`) giữ liên tục không gian; các điểm chuyển đổi giữa `SIDE`/`CUTAWAY` và `TOP` đều đi theo câu hỏi cơ chế ↔ chiến thuật rõ ràng, không giật góc nhìn liên tục.
- **Phần chưa kiểm được:** Không có (đã kiểm tra đầy đủ contact sheet từng chương `ch1_sheet.png` → `ch6_sheet.png`, `full_sheet.png`, `cuts_sheet.png` và biên dịch track âm thanh `assets/audio/sfx.wav` gồm 17 cue).


