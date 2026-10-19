# Shot plan (video dài): warlog_3 — tàu ngầm, chuỗi giải pháp

Mốc là giây toàn phim (voice 479 s). Không chữ trên hình (chỉ ký hiệu). Mọi thứ nhớ suốt phim ghi ở đây.
Không xuất mp4. Tiếng: chỉ `cannon` `mg` `burst` `rocket` `boom` theo `data/sound.json`.

## Lập luận biên tập
- **Hook (0–26 s):** một ống thép chứa người đang ngủ, dưới biển sâu; biển ép, một lỗ bằng đồng xu là chết, và *không ai biết nó ở đâu*. Khoảng trống: "làm sao một con tàu vừa chịu nổi biển, vừa thở, vừa biến mất?"
- **Cả phim = một chuỗi**: mỗi hệ thống giải một vấn đề và đẻ ra vấn đề kế (thân chịu áp → nặng, nổi → ballast → giữ độ sâu → lái → động cơ cần khí → khí cho người → ồn → mù → vũ khí → "ai nghe trước"). Chuỗi hiện thành **dải mắt xích** ở đáy khung từ 43 s, sáng dần từng mắt xích khi chương tới; cuối phim sáng đủ.
- **Cách kể:** cơ chế (mặt cắt bên) cho vật; tactics (từ trên xuống) cho "ai biết gì ở đâu"; đổi góc theo thông tin, không theo lịch. Kết quay lại đúng khung mở đầu (người ngủ) với nghĩa mới: mọi bộ phận đều trả lời "ở dưới và đừng gây tiếng".
- Kết luận "ping thì thua" là diễn giải của người nói (không phải quy tắc) → vẽ là sơ đồ minh hoạ.

## Chương
| # | Mốc | Câu hỏi người xem | Cách kể chính | Góc máy · nơi | Nối sang |
|---|---|---|---|---|---|
| 1 | 0–43.5 | Vì sao ống thép này nguy hiểm và vì sao phải giấu? Một tàu làm sao làm hết? | cơ chế + tactics: áp lực, lỗ nhỏ, bản đồ không ai biết, 4 đòi hỏi → chuỗi | NGANG mặt cắt → TRÊN bản đồ biển | mắt xích 1 |
| 2 | 43.5–82.7 | Biển ép bao nhiêu, vì sao thân hình trụ? | cơ chế: thang độ sâu + khối áp, hộp vs trụ, sườn, hai độ sâu | NGANG (rơi theo thang) → MẶT CẮT NGANG THÂN | thân nặng ⇒ nổi |
| 3 | 82.7–151.9 | Làm sao chìm, nổi, và đứng yên ở một độ sâu? | cơ chế: lực nặng/đẩy, ballast, rồi lớp nước, cân bằng bằng bồn | NGANG mặt cắt, thêm CẬN bồn | giữ độ sâu ⇒ lái |
| 4 | 151.9–178.1 | Lái thế nào, vì sao chậm thì cánh mất tác dụng? | cơ chế: dòng nước qua cánh | NGANG → TRÊN (bánh lái) → NGANG | cần chạy ⇒ động cơ |
| 5 | 178.1–273 | Lấy sức đâu khi không có khí? | cơ chế: sơ đồ năng lượng diesel-điện → AIP → lò phản ứng | SƠ ĐỒ chức năng trong thân, NGANG | cần khí cho người |
| 6 | 262–300 | Người thở bằng gì? | cơ chế: điện phân, scrubber, chưng cất | MẶT CẮT NGANG khoang người | "nghe thấy" |
| 7 | 300–367.9 | Làm sao im lặng? | cơ chế + so sánh: sóng nước vs khí, đệm cao su, chân vịt, ngói | NGANG, CẬN máy, SAU (chân vịt), biểu đồ | im ⇒ mù |
| 8 | 367.9–408.6 | Mù thì "thấy" bằng gì? | tactics: chủ động/bị động, mảng kéo, lớp nhiệt | TRÊN (sonar) → NGANG (lớp nhiệt) | mục đích |
| 9 | 408.6–438.8 | Mục đích của cả chuỗi? | tactics: ngư lôi, tên lửa, không ai biết ở đâu | NGANG → TRÊN bản đồ rộng | điện ảnh vs thật |
| 10 | 438.8–479 | Phim sai ở đâu, và tất cả quy về gì? | tactics: ai nghe trước; callback hook | TRÊN → NGANG mặt cắt (khung mở đầu) | hết |

## Quy ước hình
- Tàu ta: **olive**, mũi hướng **phải** ở mọi góc nhìn. Phe lạ / kẻ nghe: **đỏ gạch** (`enemy`). Nước: xanh nhạt; sâu hơn thì đậm hơn.
- Mặt cắt NGANG: mặt nước ở trên, độ sâu xuống dưới, thang độ sâu bên trái. TRÊN: biển phẳng, mũi tàu phải.
- Xanh trời `sky` = nước / áp lực biển; `amber` = thứ đang được nhấn; đỏ `enemy` = nguy hiểm / bị phát hiện.
- Sóng âm = vòng tròn đồng tâm (nét `ink2`); sóng ping chủ động = vòng đậm đỏ.
- Dải mắt xích đáy khung: thân – bồn – cánh – động cơ – khí – im – sonar – vũ khí.

## Vật xuyên phim
| Vật | Dấu nhận dạng | Chương |
|---|---|---|
| Tàu (NGANG/TRÊN/MẶT CẮT) | thân olive, tháp chỉ huy, cánh lái, chân vịt bên trái, mũi phải | 1–10 |
| Người ngủ | 3 tầng giường ở khoang giữa | 1, 6, 10 |
| Bồn ballast | dải trên/dưới thân; đầy nước = xanh | 3, 4, 10 |
| Ngư lôi | thân trụ xám, đầu tròn | 3, 9 |
| Ống/bộ phận âm thanh | vòng sóng | 7–10 |

(Chi tiết từng chương + trạng thái cuối được ghi dưới khi dựng.)

---
## Trạng thái dựng (đã làm đủ 10 chương, c01–c10, một scene mỗi chương)
- Đã xem sheet từng chương và sheet chỗ nối (`--cuts`). Chỗ nối giữa chương là cắt thẳng có chớp mờ ngắn; dải mắt xích giữ liên tục.
- Âm: 10 cue trong `data/sound.json` (tia nước mg, xả/thổi khí burst, ngư lôi cannon, nổ boom, tên lửa rocket). Không có tiếng ping/sonar vì kit chỉ có 5 loại.
- Chưa nghe voice cùng hình; chưa xuất mp4.
- Lỗi/nhược còn: hình ngói cao su ở chương 10 hơi dày; chương 7 cảnh "đi bộ" vận tốc người chưa khớp tàu; diagram chương 5–6 còn khô so với phần cơ chế.
