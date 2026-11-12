# Style Spec — Paper Millions (`story_2d` Reference)

Trạng thái: **Phân tích toàn diện từ cả 2 video gốc (1080p30)**:
1. `How_a_Chinese_Spy_Got_Inside_Nvidia [_MG4v3foET8].mp4` — `1187.8s` (19:48), kể chuyện điều tra / gián điệp công nghệ / tiểu sử doanh nhân.
2. `Why_the_Stock_Market_Just_Crashed [zEUKLSrbRZk].mp4` — `899.7s` (15:00), giải thích cơ chế tài chính / vĩ mô / sự kiện thời sự đa nguyên nhân.

Đã đo: phiên âm mốc từng từ (`faster-whisper`), dò cắt cảnh (`scdet`), quét toàn bộ khung `10 fps` đo tỉ lệ chuyển động / whip-pan / thẻ đen `#000000`, đo âm lượng `ebur128` + SNR giọng/nhạc nền, trích bảng mã màu pixel `1080p` và đối chiếu từng `0.5s` hình ↔ từ.

---

## 1. Số liệu định lượng cốt lõi

| Chỉ số | Video 1 (`Nvidia Spy`) | Video 2 (`Market Crash`) | Chuẩn mục tiêu cho `story_2d` |
|---|---|---|---|
| Độ phân giải & FPS | `1920×1080 @ 30fps` | `1920×1080 @ 30fps` | `1920×1080 @ 30fps` |
| Tốc độ đọc (WPM) | `158.2 từ/phút` (3.131 từ) | `153.3 từ/phút` (2.299 từ) | Nhịp vừa phải, nhả chữ rõ, ngắt câu dứt khoát |
| Số điểm cắt cứng (`scdet≥12`) | `330 shot` (`16.7 cắt/phút`) | `219 shot` (`14.6 cắt/phút`) | `14–17 điểm cắt/phút` |
| Độ dài mỗi shot | Trung vị `2.67s` (TB `3.59s`, P10–P90: `1.1–6.6s`) | Trung vị `3.27s` (TB `4.11s`, P10–P90: `1.8–7.8s`) | Trung vị `~3s`; mỗi cảnh `.tsx` (`8–20s`) chứa `3–6` nhịp biến đổi nội cảnh |
| Số từ mỗi shot | Trung vị `9.5 từ/shot` | Trung vị `10.5 từ/shot` | `1 vế câu / 1 hành động hình ảnh` (`8–12 từ`) |
| Độ khớp điểm cắt với từ | `86.9%` trong `±0.20s` đầu từ; `76.7%` sát biên câu | `83.7%` trong `±0.20s` đầu từ; `76.2%` sát biên câu | Mọi biến đổi hình neo trực tiếp vào mốc từ `CUE` |
| Tỉ lệ khung đang chuyển động | `87.4%` khung (ngoài thẻ đen) | `91.7%` khung (ngoài thẻ đen) | `≥ 85%` khung có chuyển động (camera, nhân vật, vật thể, con số) |
| **Thẻ đen Punch-Card (`#000000`)** | `54 thẻ` (`11.6%` thời lượng, TB `2.56s`, mỗi `22.0s`) | `46 thẻ` (`13.2%` thời lượng, TB `2.58s`, mỗi `19.6s`) | **Cứ `18–25s` có 1 thẻ đen (`1.0–3.5s`), chiếm `8–14%` phim** |
| Âm lượng & độ nén | `-14.3 LUFS`, `LRA 2.2 LU`, SNR lời/nhạc `+10.1 dB` | `-14.6 LUFS`, `LRA 2.3 LU`, SNR lời/nhạc `+8.5 dB` | `-14 LUFS`, nén chặt, nhạc nền lùi sâu nhường lời + SFX khô sắc |

---

## 2. Cấu trúc kịch bản & Nhịp thẻ đen (`#000000`)

1. **Cold Open không rào đón (khung `0.0s` vào thẳng nghịch lý thị giác)**:
   - `Nvidia`: Khung `0.0s` mở ngay tại bàn tiệc tối ánh nến ở Singapore — trên bàn Jensen & Alice cười nói lịch sự, **dưới gầm khăn trải bàn** bàn tay đeo găng đen lén chuyền con chip phát sáng xanh lá. Câu chốt hook cắt thẳng sang thẻ đen `#000000`: *"…having dinner with a Chinese spy."*
   - `Crash`: Khung `0.0s` mở cảnh Jensen đổ mồ hôi gánh tảng đá GPU khổng lồ đang rạn nứt trên vách núi đêm, số đỏ nhảy cuộn `-$0B → -$400B`. Câu đảo chiều cắt sang thẻ đen: *"Nobody had."*
2. **Hai loại Thẻ Đen `#000000` (vũ khí giữ nhịp số 1 của kênh)**:
   - **Thẻ Chốt Ý / Nghịch Lý (`Punchline Black Card`, `0.8–3.5s`)**: Đặt ở câu twist, câu hỏi lớn hoặc kết luận đắt giá (*"Jensen has no idea."*, *"So why did the stock market just crash?"*, *"You can't buy electricity that doesn't exist."*). Nền đen `#000000` tuyệt đối, chữ trắng viết tay nghiêng hiện **khớp chính xác từng từ (`w.s`)** theo giọng đọc; đọc xong từ cuối `0.15s` là cắt cứng sang cảnh màu.
   - **Thẻ Chia Chương Im Lặng (`Silent Chapter Card`, `~2.0–2.5s`)**: Đặt vào khoảng nghỉ giọng `2–4s` kèm cú hit nhạc nền (*"The Man With the Key"*, *"The Locked Door"*, *"The Top"*, *"The Midterms"*).
3. **Micro-Skits (Thoại ngắn hài tỉnh queo `2–5s`)**:
   - Xen giữa lời dẫn là các mẩu đối thoại cực ngắn `1–3 câu` giữa các nhân vật phụ (bồi bàn Denny's, bạn cùng phòng, nhân viên ngân hàng, hàng xóm đọc hoá đơn điện) để giải thích khái niệm phức tạp (như *circular financing* hay *30 ngày hết tiền lương*) bằng tình huống đời thường hài hước. Khi áp dụng cho kịch bản chỉ có 1 giọng đọc thuyết minh, cơ chế này chuyển thành **bong bóng thoại ngắn (`1–4 từ`) + biểu cảm đối đáp trên mặt nhân vật**.

---

## 3. Tám quy luật biểu thị Hình ảnh ↔ Giọng đọc (Vì sao không hiểu lời vẫn cuốn hút)

1. **Vật chất hoá khái niệm trừu tượng (Physical Metaphor)**:
   - Thay biểu đồ phẳng bằng vật thể có trọng lực, sức căng và nguy cơ đổ vỡ:
     - *Tăng rồi sập nhanh trong 6 phút* → Quả bóng bay xanh gắn ngọn nến xì hơi teo tóp cạnh đồng hồ bấm giờ `0:00 → 6:00`.
     - *Bong bóng AI* → Nhân vật đứng kẹt bên trong bong bóng xà phòng phản quang chứa các cột đồ thị xanh, mũi kim nhọn từ mép phải chĩa sát vào vỏ bong bóng.
     - *Tỉ trọng 8% S&P 500* → Cây kéo cắt rời rìa phải phát sáng xanh `8¢ NVIDIA` khỏi tờ tiền khổng lồ `ONE DOLLAR / S&P 500`.
     - *Quỹ chỉ số tưởng an toàn nhưng chứa đầy rủi ro* → Nhân viên đội mũ bảo hộ ôm thùng carton dán giấy nhớ `SAFE` / `BORING`, con chip xanh phát sáng bật tung nắp thùng làm nhân viên sững sờ.
     - *Nợ cao gấp 5 lần vốn* → Đĩa cân đồng sập nghiêng vì các khối gạch đỏ `$1 DEBT` đè bẹp đồng xu.
     - *Doanh thu bán chịu `$63B` chưa thu tiền* → Quán ăn `NVIDIA DINER` ngập những chồng đĩa bẩn cao chạm trần ghi sổ nợ `IOU $63B`.
2. **Khung hình Hai Tầng Sự Thật (Dual-Layer / X-Ray Staging)**:
   - Cho người xem quyền "biết nhiều hơn nhân vật" trong cùng một khung: trên bàn ăn nâng ly chúc tụng ↔ dưới gầm bàn trao chip lậu và tiền nhảy `$ BILLIONS`; hoặc vách ngăn đôi (`Split-Wall`) bên trái Washington cấm vận ↔ bên phải văn phòng nối dây lách luật.
3. **Chia Ô Truyện Tranh Tuần Tự theo Mệnh Đề (`Sequential Split-Panel / Triptych`)**:
   - Khi giọng đọc liệt kê 2–3 vế song song (*"No bank failed. No law passed. The economy looked fine."* hoặc *"Land / Power / Permit"*), màn hình chia thành 2 hoặc 3 cột dọc có viền đen dày trượt vào lần lượt khớp đúng đầu từng vế câu — mắt người xem so sánh được cả 3 vế cùng lúc.
4. **Nhân hoá Vật thể, Thương hiệu & Công trình (`Anthropomorphic Props`)**:
   - Mái vòm Quốc hội Mỹ nhắm mắt ngáy `zZz` + bong bóng mũi khi chưa có luật, rồi mở to mắt hoảng hốt khi đổi phe cầm dùi cui; tủ server Trung Quốc có cặp mắt lén nhìn qua dây nhung hộp đêm `AMERICA`; con chip gắn chân que chạy đua trên đường piste `NANOSECONDS`.
5. **Đóng Dấu & Sửa Trực Tiếp Trên Quan Hệ (`Inline Relational Stamps & Live Edits`)**:
   - Đường nét đứt nối `JENSEN HUANG ---- ALICE HUANG` bị đóng dấu đỏ `[X]` ngay tại từ *"no relation"*.
   - Bảng trắng / tờ báo / văn bản không hiện sẵn: bàn tay cầm bút dạ gạch đỏ số cũ, viết đè số mới, khoanh đỏ, tô bút dạ vàng từng dòng hoặc soi kính lúp phóng to đúng chữ đang đọc.
6. **Liên Tục Không Gian bằng Máy Quay 2.5D (`Whip-Pan`, `Window Pull-Back`, `Rack Focus`)**:
   - **Whip-Pan ngang** (4–6 khung có vệt nhoè ngang `motion blur`) khi chuyển từ người này sang người kia trên cùng mặt phẳng.
   - **Pull-Back xuyên lớp**: lùi từ bàn ăn → ra ngoài cửa kính mưa → lia qua đường sang cửa sổ khách sạn tối đối diện → zoom vào ống kính tele của điệp viên.
   - **Rack Focus (`Gaussian Blur` chuyển nét)**: làm mờ hậu cảnh (`blur 6px`) khi bảng thông tin tiền cảnh trượt lên, rồi làm mờ tiền cảnh khi pháo hoa nổ ở hậu cảnh.
7. **Sân Khấu Mặt Bàn Nhìn Từ Trên Xuống (`Top-Down Tabletop`)**:
   - Dùng cho cảnh góp vốn (`3 bàn tay đẩy $200 vào giữa → $600`), vẽ phác thảo sản phẩm bên tách cà phê, hoặc bảng bần (`Corkboard`) ghim ảnh nối chỉ đỏ điều tra.
8. **Hài Hước Ngầm & Chi Tiết Nền (`Visual Micro-Gags`)**:
   - Con ốc sên bò trên đường suy thoái `2½ YEARS` cạnh vực thẳm đỏ `4 WEEKS`; giấy bay dính lên trán trader giữa sàn đỏ lửa trong khi kim đồng hồ `FEAR GAUGE (VIX)` vẫn chỉ `CALM`.

---

## 4. Hệ thống tạo hình mỹ thuật

- **100% Vẽ Hoạt Hình Đồng Nhất — 0% Ảnh Chụp Thật**:
  - Kể cả ảnh chụp lén Polaroid, trang nhất báo *The New York Times*, bài đăng mạng xã hội của chính trị gia hay màn hình TV đều được vẽ lại bằng nét nhân vật hoạt hình cùng vũ trụ.
- **Thiết kế Nhân vật (`Bean / Pawn Puppet Rig`)**:
  - Đầu tròn hơi bầu ngang lớn, không cổ, thân viên nhộng/quân tốt bo tròn, viền đen dày `#050507` (`4–5px` thế giới).
  - Tay chân là **nét que đen uốn cong (`6–8px`, đầu tròn)** với bàn tay 3 ngón đơn giản.
  - **Đổ bóng 2.5D**: nền da ấm + bóng tối viền dưới `radialGradient` + **vành sáng `Rim Light`** rõ nét ở phía hướng về nguồn sáng (vàng cam của nến/đèn bàn, xanh lá neon của chip GPU, đỏ của bảng chứng khoán sập).
  - Khuôn mặt biểu cảm linh hoạt: mắt chấm / mắt cong cười / mắt trợn tròn lòng trắng + đồng tử nhỏ + giọt mồ hôi xanh / lông mày rời / miệng nhép theo trạng thái.
- **Bối cảnh 3 Lớp & Ánh sáng Khí quyển**:
  - Bố cục `Background` (tối/bokeh/mờ nhẹ) + `Midground` (nhân vật & hành động sắc nét) + `Foreground` (vật thể cận cảnh mờ nhẹ tạo thị sai).
  - Bốn bảng màu chủ đạo theo tâm trạng:
    1. `Dark Noir / Tech`: `#0B1320`, `#141E2B`, `#08080A` + điểm sáng neon xanh `#66FF33` / `#76B900` hoặc lam `#38BDF8`.
    2. `Warm Lounge / Interior`: gỗ nâu đỏ `#2C1610`, `#5C121B`, vàng nến `#FFB74D`, kem giấy `#F5ECD8`.
    3. `Alert / Market Crash`: đỏ thẫm `#2A0B0E`, đỏ tươi `#EF4444`, cam lửa `#F97316`.
    4. `Daylight / White Grid`: xám trắng `#E6EAE8` có lưới phối cảnh mờ hoặc xanh trời dịu `#8BB8C8` cho cảnh đời thường / so sánh trực quan.
  - Luôn phủ `Vignette` tối bốn góc và chùm sáng `Spotlight / Light Cone` gom mắt vào đúng 1 tâm điểm duy nhất.
- **Chữ trên hình (`Typography`)**:
  - Duy nhất **1 họ chữ bút dạ / viết tay nghiêng nhẹ** cho mọi tiêu đề nổi, thẻ đen, nhãn dán và HUD (viền đen dày + bóng đổ khi đè lên cảnh; chữ trắng sạch trên thẻ đen `#000000`).
  - HUD giới thiệu nhân vật / địa điểm: hộp bo góc tối bán trong suốt `rgba(16, 18, 22, 0.88)` kèm vạch màu dọc bên trái, chữ gõ hiện nhanh theo từ đọc.
  - Mật độ chữ cực thấp: ngoài thẻ đen (tối đa 1 câu ngắn hiện từng từ), mỗi khung cảnh chỉ chứa `1–4` nhãn ngắn (`1–4 từ/nhãn`).

---

## 5. Âm thanh (`Sound Design`)

- **Nhạc nền**: Pizzicato strings / marimba / dark investigative pulse nhỏ gọn (`-25 dBFS` dưới lời đọc, cách giọng `~9–10 dB`), ngắt nhịp hoặc nhấn trầm ở thẻ đen chia chương.
- **SFX Xúc Giác Vi Mô (`Dry Tactile Cartoon/UI Foley`)**:
  - Không dùng tiếng nổ chiến trường nặng nề; dùng bộ tiếng khô, gọn, bám sát từng chuyển động `.tsx`:
    - Chuyển máy / tách khung: *soft whoosh / paper slide*.
    - Xuất hiện nhãn / bong bóng / vật thể nảy `spring`: *subtle pop / wooden tap / card flip*.
    - Đóng dấu `[X]` / `BLOCKED` / đặt vật nặng: *rubber stamp thud / heavy desk thud*.
    - Viết bảng / gạch bút dạ / tô sáng: *marker scribble / pen strike*.
    - Con số nhảy (`-$400B`, `$5.0T`): *fast digital/mechanical counter tick + cash/sub hit khi dừng*.
