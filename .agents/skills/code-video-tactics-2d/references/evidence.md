# Căn cứ thị giác và cách chuyển thành skill

Mẫu ngày 08-10-2026: hai MP4 EuroDefence do người dùng cung cấp. Quan sát chuỗi frame trực tiếp mỗi 3 giây trong 00:00–03:00; bổ sung 03:00–04:05 ở Terrain để bù quảng cáo, và mẫu giữa/cuối mỗi 5 giây. Mốc gần đúng, không đo chính xác điểm cắt hoặc easing. Không có retention thực tế. Đây là phân tích thiết kế hình, không xác thực nội dung chiến thuật của nguồn.

| Nguồn và đoạn | Quan sát | Lý giải biên tập | Quy tắc có thể chuyển giao |
|---|---|---|---|
| [Terrain](https://www.youtube.com/watch?v=abH4q5jMW3k&t=22), ~00:22–00:46 | Cùng bố cục rộng, chủ thể và lớp địa hình/overlay lần lượt thay đổi | Người xem đọc sự khác nhau trên một nền đã biết, giảm công sức tìm lại vị trí | Giữ yếu tố chung; đưa quan hệ cần đọc vào đúng lúc |
| Terrain, ~00:49–01:16 | Nền đơn giản phát triển thành cấu trúc phức tạp hơn qua các lớp | Quá trình xây hình chính là quá trình giải thích | Cho hình phát triển; không cắt thành các tấm sơ đồ tách biệt |
| Terrain, ~02:25–03:03 | Cùng rừng/đường, các nhóm và dấu trạng thái thay đổi trong khung | Mốc không gian giữ vai trò bộ nhớ | Kết quả có dấu lưu lại; không reset chỉ vì đổi câu |
| [Encirclement](https://www.youtube.com/watch?v=ZqT6KyjIHAA&t=31), ~00:31–01:16 | Một sơ đồ được giữ, vùng làm nổi đổi, dấu và chủ thể cập nhật; cuối có dấu kiểm | Người xem thấy một tình huống phát triển trước khi nhận kết luận | Kết luận phải được hỗ trợ bởi thay đổi đã thấy |
| Encirclement, ~01:19–02:01 | Không gian rộng vẫn chứa nhiều nhóm, nhưng hoạt động/đường nối đổi theo thời điểm | Cho thấy mối liên hệ đồng thời mà không phải đổi toàn bộ cảnh | Phân cấp chú ý trong cùng thế giới; không tuần tự hóa sai nguồn |
| Encirclement, ~02:04–02:58 | Con đường làm mốc, có vùng màu/nhãn/hướng bổ sung | Overlay giải thích quan hệ vô hình trên không gian hữu hình | Một kiểu đường/vùng có một nghĩa rõ; không overlay trang trí |
| Hai video, phần cuối | Các ô nhỏ gọi lại tình huống, dấu X thêm lần lượt | Dùng ký ức thị giác để tổng hợp, giảm nhu cầu kể lại toàn bộ | Tóm tắt bằng hình đã học; không mở nhiều câu chuyện mới trong lưới |

Quy tắc không đồng nghĩa sao chép toàn bộ phong cách. Không cố định nền xanh, hai bên đỏ/xanh, texture cây, dấu X hay chấm tròn. Giản lược tới mức quan hệ rõ, nhưng tăng chi tiết khi chính chi tiết đó là thông tin cần xem.

## Hai khác biệt với skill cơ chế

- Điểm neo chính là không gian giữa các đối tượng; ở cơ chế thường là nhận dạng phần–toàn thể và chuỗi biến đổi trong vật thể.
- Đổi trạng thái trên cùng bản đồ thường hữu ích hơn đổi góc liên tục. Tuy nhiên nếu cao độ/che khuất không thể đọc bằng top-down, đổi cách biểu diễn có định vị là đúng hơn trung thành máy móc với bản đồ.
