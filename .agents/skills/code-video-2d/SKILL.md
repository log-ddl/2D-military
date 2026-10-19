---
name: code-video-2d
description: Apply consistent 2D drawing principles to military illustrations, adapting subjects, colors and geometry to each brief. Use for clear simplified linework and readable forms; recognizes code_video_2d. Defines drawing style only, without fixed assets, palettes or video production.
---

# Nguyên tắc nét vẽ quân sự

Giữ tên skill cũ để tương thích. Giữ cách tạo hình, không cố định nội dung hình: đường nét, hình khối, mức giản lược và cách chọn chi tiết. Không cần dự án mẫu để áp dụng.

## Nét vẽ cần giữ

- Hình khối 2D giản lược, đường bao rõ và liền, góc/đầu nét mềm vừa phải. Nét chính làm rõ hình dáng; nét phụ mảnh hoặc ít nổi hơn để tránh rối.
- Dáng tổng thể phải dễ nhận ra ở kích thước xem thực. Tách các khối và bộ phận bằng đường bao, khoảng trống và chồng lớp có chủ đích.
- Giữ chi tiết giúp nhận diện chủ thể hoặc hiểu hành động/cơ chế. Lược bỏ chi tiết trang trí nhỏ nếu chúng không hỗ trợ ý cần giải thích.
- Nhân vật, phương tiện và môi trường trong cùng video dùng mức giản lược và cách xử lý nét tương thích. Nhất quán nét vẽ không có nghĩa mọi đối tượng phải cùng hình dạng hoặc tỷ lệ.
- Tạo hình mới theo nội dung thực tế. Chủ đề quyết định loại xe, trang phục, công trình, địa hình và các bộ phận cần có; không lấy một bộ hình có sẵn làm giới hạn sáng tạo.

## Những lựa chọn thuộc từng video

Nền, thời kỳ, bối cảnh và thiết kế đối tượng được chọn theo nguồn và yêu cầu của video. Màu lấy từ bảng `P` trong `scenes/shared/palette.ts` (nền nhạt, viền tối, thân olive; `enemy` cho phe đối phương; `amber`, `sky` để nhấn) để các video thống nhất. Chọn độ tương phản đủ để đọc rõ và giữ nhận dạng đối tượng nhất quán trong video đó.

Góc nhìn phục vụ ý cần hiểu, không phục vụ cảm giác “giống ảnh thật”: ngang cho hành động và dáng nhận dạng, thẳng từ trên xuống cho vị trí/quan hệ/bố cục, mặt cắt, tách lớp hoặc cận cho bộ phận và thành phần bên trong. Điều người xem cần thấy phải rõ ngay ở kích thước phát thật, không được che, nghiêng hoặc quá nhỏ đến mức phải đoán. Không dùng góc chéo 3/4 làm mặc định; chỉ dùng khi hình khối bên ngoài chính là nội dung. Vẽ đối tượng chứa vật (hộp, xe, công trình…) khi nội dung nói về bên trong thì phải vẽ cho thấy bên trong, không chỉ vỏ ngoài. Vẽ hình học phù hợp với góc nhìn, không bóp méo hình ngang để giả góc mới. Giữ các dấu hiệu nhận dạng của cùng đối tượng khi đổi góc.

## Quy trình áp dụng

1. Đọc điều người xem cần hiểu trong shot và chọn cách thể hiện phù hợp.
2. Xác định chủ thể, dáng nhận diện và bộ phận cần nhìn thấy; thiết kế chúng từ bối cảnh hiện tại.
3. Vẽ các khối chính trước, kiểm tra tỷ lệ và vị trí tương đối; bổ sung nét phụ chỉ khi giúp nhận diện hoặc giải thích.
4. Kiểm tra ở kích thước xem thực: chủ thể có rõ không, điểm tương tác có bị che không, chi tiết nào đang gây nhiễu? Sửa bố cục hoặc giảm chi tiết ở chỗ chưa đọc được.
5. Đối chiếu các shot để giữ cách xử lý nét, danh tính đối tượng và trạng thái nhất quán. Một ảnh đẹp riêng lẻ không chứng minh chuỗi giải thích đã rõ.

Phạm vi chỉ là nguyên tắc nét vẽ; không kèm mã tài sản, hình mẫu bắt buộc, bảng màu, renderer hoặc quy trình xuất video. Khi cần mô tả shot chi tiết, dùng [skill mô tả shot](../code-video-director/SKILL.md).


## Callout tối thiểu khi cần

Mặc định không có chữ trên hình. Callout ngắn chỉ dùng khi hình và voice chưa đủ xác định thông tin thiết yếu (xem [director](../code-video-director/SKILL.md) mục 6); không gắn nhãn mọi vật. Theo quyết định nội dung của shot plan: chữ phải đọc được, neo rõ, tránh che chủ thể/điểm tương tác và không tranh chú ý. Chọn cách trình bày phù hợp video, không dùng phông/màu cố định. Không biến nhãn thành tài sản trang trí thường trực.

## Cỡ chủ thể và sử dụng khung hình

Chọn cỡ cảnh từ chủ thể/quan hệ cần đọc, rồi mới bố trí nền. Chủ thể phải lớn và có sức nặng thị giác; không để hình minh họa nhỏ ở giữa một nền rộng vì dùng camera hoặc tọa độ mặc định. Với một vật thể hay cụm cơ chế, có thể khởi đầu ở khoảng 65–90% chiều khung phù hợp với dáng của nó rồi điều chỉnh theo nội dung; đây là gợi ý bố cục, không phải tỷ lệ diện tích bắt buộc. Điểm tương tác quan trọng phải đọc được cả khi thu preview xuống cỡ điện thoại.

Khoảng trống chỉ giữ khi cần hướng chuyển động, quan hệ khoảng cách, đối trọng hoặc callout thật sự cần. Nếu khoảng nền không giúp hiểu ý, tiến camera/crop hoặc tăng kích thước chủ thể. Cho phép cận tràn mép với phần không thiết yếu; không cắt mất điểm tiếp xúc, đầu/cuối quan hệ hoặc dấu nhận dạng. Một vật dài và mảnh cần cận chi tiết hoặc bố cục khác, không chỉ kéo dài hết chiều ngang rồi để trống trên dưới.

Với bản đồ, phóng cụm tình huống đang giải thích để nó sử dụng phần lớn vùng hữu ích; giữ đủ các mốc cần thiết, không phóng từng đơn vị đến mức làm sai khoảng cách. Chỉ mở rộng toàn cảnh khi quan hệ xa là nội dung, rồi trở lại cỡ dễ đọc. Trong shot plan ghi cỡ chủ thể, phần có thể crop và lý do giữ khoảng trống; rà các khung đầu/giữa/cuối chuyển động để tránh chủ thể lại co nhỏ hoặc rời khung.
