---
name: code-video-director
description: Plan and build 2D Canvas military explainer videos from a voice in pdoom-video, through content-led editorial decisions, visual storytelling, pacing and continuity, then code the scenes. Recognizes code_video_director. Entry point: routes to code-video-2d (drawing), code-video-mechanism-2d (how things work) and code-video-tactics-2d (situations on maps).
---

# Quy trình đạo diễn và mô tả shot

Phạm vi chuyên đề quân sự; phương pháp là quy trình ra quyết định theo nội dung. Đầu ra là phương án kể bằng hình, mô tả shot, rồi bản dựng bằng code theo mục 8. Nét vẽ theo [code-video-2d](../code-video-2d/SKILL.md); màu dùng bảng `P` trong `scenes/shared/palette.ts`. Chỉ làm trong project được giao, không đọc project khác.

**Thứ tự làm việc không phải thứ tự kể chuyện.** Không biến các bước dưới đây thành các cảnh bắt buộc. Không áp một chuỗi sự kiện, cung kịch tính, loại hành động, số shot hoặc nhịp cắt cho mọi đoạn. Không lấy một đoạn mẫu được duyệt làm công thức của cả phim. Các trường mô tả là thông tin cho người dựng, không phải những việc phải xuất hiện lần lượt trên màn hình.

## Một đầu vào cho toàn bộ kế hoạch

Người dùng chỉ cần gọi `code-video-director`. Skill này chịu trách nhiệm đọc nguồn, chia đơn vị ý nghĩa, chọn cách kể bằng hình và lập một shot plan thống nhất. Không yêu cầu người dùng tự chọn hoặc gọi lần lượt các skill phụ.

Sau khi hiểu toàn bộ nguồn, trước khi chốt shot, đọc hướng dẫn chuyên biệt phù hợp:
- Giải thích máy móc, vũ khí, phương tiện hoặc nguyên lý hoạt động: [code-video-mechanism-2d](../code-video-mechanism-2d/SKILL.md).
- Giải thích tình huống chiến thuật hoặc lịch sử qua vị trí, địa hình và diễn biến lực lượng: [code-video-tactics-2d](../code-video-tactics-2d/SKILL.md).
- [code-video-2d](../code-video-2d/SKILL.md) quy định cách vẽ cho các shot 2D.

Hai skill chuyên biệt bổ sung quyết định kể bằng hình, không tạo thêm một lần chia kịch bản hoặc một shot plan riêng. Đoạn pha trộn dùng hướng dẫn tương ứng theo ý cần giải thích; không ép toàn bộ video vào một dạng. Director giữ quyền quyết định liên tục, nhịp và phân bổ thời gian trên toàn đoạn.

## 1. Hiểu nguồn và xác định nhiệm vụ truyền đạt

Đọc toàn bộ nguồn trước khi chia cảnh. Xác định đối tượng xem, kiến thức họ đã có, câu hỏi video cần giải đáp, trọng tâm và mức chính xác cần thiết. Giữ các lựa chọn đã có của người dùng; chỉ hỏi điều chưa biết nếu nó thực sự ảnh hưởng hướng làm.

Phân biệt thông tin được nguồn xác nhận, suy luận minh hoạ và phần chưa chắc chắn. Không thêm sự kiện hoặc khẳng định kỹ thuật để tăng hấp dẫn. Nếu dùng tình huống giả định, phải nhận diện nó là minh hoạ trong hồ sơ shot; không làm nó trông như bằng chứng lịch sử.

Với voice, đọc `data/voice_map.md` (câu kèm mốc thời gian) để hiểu nội dung và lập kế hoạch; chỉ tra `data/transcript.json` khi cần mốc của một từ cụ thể, không đọc cả file. Giữ ràng buộc thời lượng. Chưa có timing thì ghi là ước lượng. Việc chia đoạn dựa vào đơn vị ý nghĩa; không mặc định một câu bằng một shot hoặc mọi câu đều cần một hình mới.

Đầu ra bước này: những điều quan trọng người xem cần hiểu và giới hạn của nguồn/thời gian. Không viết lại lời dẫn thành danh sách vật thể cần hiện.

**Hook đi trước phần thân.** Trước khi lập kế hoạch các đoạn còn lại, thiết kế phần mở đầu theo [hook](references/hook.md): tìm khoảng trống nhận thức đúng với nguồn, thiết kế hình hoạt động ngay từ khung đầu và tự truyền tải mà không cần chờ voice. Nếu voice mở đầu chưa tạo được khoảng trống đó, phải báo lại cho người dùng và đề xuất cách sắp xếp, không im lặng dựng tiếp.

## 2. Thiết kế trải nghiệm xem ở cấp toàn đoạn

Vai trò là nhà dựng, không phải người minh hoạ: không hỏi “câu này nhắc tới gì thì vẽ cái đó” mà hỏi người xem đang ở trạng thái nào và hình nào giúp họ hiểu thêm. Với đoạn voice khô, trừu tượng hoặc dày thông tin mà chưa biết nên hiện gì, bắt buộc đọc và làm theo [tư duy nhà dựng](references/editor-thinking.md) (rút ý thật, tìm cấu trúc của ý, rồi mới tìm hình; không sao chép hình từ video khác).

Quyết định người xem cần biết gì, nhìn thấy gì và chú ý vào đâu qua từng phần. Xem hình ảnh có thể đóng góp gì ngoài lời nói: làm rõ quan hệ, chứng minh một nhận định, bộc lộ thông tin, cho thấy diễn biến, đối chiếu hoặc giúp nhận ra điều lời dẫn không thể diễn đạt nhanh. Chọn đóng góp phù hợp, không bắt mỗi phần phải có tất cả.

Chọn cách tổ chức phù hợp với bản chất thông tin và mục đích đoạn. Có thể giữ cùng không gian, đổi điểm nhìn, tổ chức đồng thời hoặc tuần tự, lược thời gian hay giữ một khoảnh khắc; đây là lựa chọn biên tập, không phải danh sách phải lần lượt sử dụng. Nhân quả phải đúng khi nội dung khẳng định nhân quả; nội dung so sánh hay mô tả không phải bịa ra xung đột để có câu chuyện.

Sự hấp dẫn đến từ việc dẫn sự chú ý và phát triển hiểu biết, không nhất thiết từ nguy hiểm, tốc độ hoặc cao trào. Quyết định điều gì cần hiện ngay, điều gì cần chuẩn bị, điều gì có thể giữ lại để người xem khám phá; không che thông tin thiết yếu đến mức gây hiểu lầm.

Đầu ra bước này: chủ ý kể bằng hình và lý do chọn nó. Chỉ ghi lựa chọn thực sự có tác dụng, không dùng tính từ như “điện ảnh”, “kịch tính”, “mượt” thay cho quyết định.

### Chia kịch bản thành cụm giải thích, rồi mới chia shot

Trước khi liệt kê shot, đọc [chia cảnh theo phát hiện và trạng thái](references/scene-structure.md). Lập các cụm theo câu hỏi hoặc quan hệ người xem cần hiểu. Một cụm có thể đi qua nhiều câu voice và nhiều cỡ cảnh; một shot có thể chứa nhiều nhịp thay đổi có nghĩa. Không dùng dấu chấm, danh từ mới hoặc thời lượng cố định làm ranh giới mặc định.

Với mỗi cụm, ghi ngắn: người xem đã biết gì → còn cần hiểu gì → bằng chứng/biến đổi nào sẽ nhìn thấy → cuối cụm hiểu thêm gì. Giữ đúng thứ tự và nội dung voice đã chốt; thiết kế hình chuẩn bị, giải thích và gọi lại trong thời lượng đó, không tự viết lại lời để khớp một công thức.

Chỉ tách shot khi có nhu cầu đọc hình cụ thể: điểm tương tác cần cỡ khác, phần bị che cần cách biểu diễn khác, một đối chiếu cần bố cục khác, hoặc nguồn chuyển không gian/thời gian/tình huống. Nếu bố cục hiện tại vẫn giải thích rõ phần tiếp theo, tiếp tục phát triển nó. Ghi lý do tại mỗi ranh giới shot và yếu tố mang sang: vật thể, bộ phận, vị trí, hướng chuyển động, trạng thái hoặc câu hỏi chưa được giải đáp.

Dạng cơ chế: nối các nhịp bằng phần–toàn thể và sự chuyển giao tác động; cho thấy tương tác làm thay đổi gì rồi liên hệ với kết quả. Dạng chiến thuật: nối bằng các mốc không gian và trạng thái của tình huống trong nguồn; giữ dấu vết thay đổi để đọc được hệ quả. Đây là tiêu chí chọn cảnh, không phải hai chuỗi cảnh bắt buộc.

## 3. Chọn hình thức biểu đạt và góc nhìn

Hình thức biểu đạt được suy ra từ cấu trúc của ý đã rút ở [tư duy nhà dựng](references/editor-thinking.md), không chọn từ danh sách có sẵn. So sánh các cách thể hiện hợp lý dựa trên điều cần đọc rõ: hình trực quan, sơ đồ, không gian, đối chiếu, chi tiết, lớp bên trong hoặc kết hợp. Chọn phương án giúp người xem hiểu với ít gánh nặng suy đoán nhất mà vẫn giữ chủ ý kể chuyện.

Góc nhìn, cỡ cảnh và chuyển động camera phụ thuộc vào thông tin cần thấy. Không cố định một góc cho mọi ý, không đổi góc theo lịch, không cho rằng zoom là một cách giải thích mới. Khi đổi cách biểu diễn hoặc tỷ lệ, cung cấp đủ dấu hiệu để người xem hiểu họ đang nhìn cùng đối tượng hay một ví dụ khác.

**Quy tắc bắt buộc: điều cần hiểu phải nhìn thấy rõ, không nửa vời.** Trước mỗi shot, viết một câu: “người xem phải THẤY gì?” (thành phần bên trong, vị trí tương đối, so sánh, diễn biến, số liệu…). Chọn góc và cách vẽ cho thấy đúng điều đó ngay ở kích thước phát thật. Không chọn góc vì “trông giống thật”. Nếu điều cần thấy bị che, bị nghiêng, quá nhỏ hoặc phải đoán, shot chưa đạt, phải đổi góc hoặc cách biểu đạt chứ không chữa bằng chữ hay hiệu ứng.
- Cần thấy **bên trong, thành phần, cấu tạo**: dùng mặt cắt, hình tách lớp hoặc tách rời. Không chỉ vẽ vỏ ngoài.
- Cần thấy **vị trí, khoảng cách, bố cục, quan hệ giữa nhiều đối tượng**: nhìn thẳng từ trên xuống hoặc sơ đồ.
- Cần thấy **hành động, tư thế, hình dáng nhận dạng**: nhìn ngang, không nghiêng.
- Cần thấy **số liệu, xu hướng, so sánh**: biểu đồ hoặc sơ đồ có trục và thang đo đọc được, không dùng hình minh hoạ thay cho số liệu.
- Góc chéo 3/4 chỉ dùng khi hình khối bên ngoài chính là nội dung cần hiểu; không dùng làm mặc định.
- Nếu một góc không đủ, dùng nhiều hình có quan hệ rõ (toàn cảnh rồi chi tiết, vỏ rồi lớp trong) thay vì ép tất cả vào một hình.

**Gợi ý thêm góc và cách nhìn (không bắt buộc):** ngoài nhìn ngang và từ trên xuống còn có chính diện hoặc phía sau, cận một bộ phận, qua ống ngắm, toàn cảnh rất rộng, góc thấp (chân trời đặt thấp), đặt cạnh nhau để so, camera đi theo, nền nhiều lớp trôi khác tốc độ. Thỉnh thoảng dùng khi nội dung cho phép để video không đơn điệu.

Quyết định cỡ chủ thể ngay khi lập shot, trước khi dựng nền: vùng nào phải đủ lớn để người xem đọc được, phần nào được crop và khoảng trống nào thực sự có vai trò. Nếu một toàn cảnh không cho thấy cơ chế hoặc quan hệ cần hiểu, lập cận cảnh/mặt cắt hoặc thay bố cục ngay ở đây; không để người dựng tự chữa bằng zoom sau cùng. Áp dụng mục “Cỡ cảnh và nền thừa” bên dưới vào từng shot.

Xác định thứ bậc thị giác: điểm cần chú ý, yếu tố hỗ trợ, phần có thể bỏ. Nhiều hành động đồng thời được phép nếu quan hệ của chúng là điều cần giải thích và vẫn đọc được; không ép mọi cảnh thành một hành động cô lập.

## 4. Phân bổ nhịp và chuyển tiếp

Phân bổ thời gian theo độ khó đọc của hình, ý nghĩa và nhịp voice; không chia đều và không cắt mỗi khi hết câu. Xác định chỗ cần quan sát, biến đổi, nhấn hoặc nghỉ. Các đoạn có thể có nhịp khác nhau nếu nội dung cần; tránh lặp cùng động tác xuất hiện, cùng thời lượng hoặc cùng kiểu kết thúc do thói quen.

Mỗi chuyển tiếp phải có quan hệ biên tập xác định: tiếp tục, thay điểm nhìn, đổi phạm vi, đối chiếu, đổi thời gian/không gian hoặc quan hệ khác do nội dung đặt ra. Chọn cắt, giữ cảnh hoặc chuyển động dựa vào quan hệ đó. Không bắt mọi nối cảnh phải êm bằng crossfade; một cú cắt rõ có thể đúng hơn một chuyển cảnh kéo dài.

Khi sự việc tiếp tục, giữ các dấu hiệu nhận dạng, trạng thái và diễn biến cần thiết. Khi sự việc đổi, giúp người xem nhận ra thay đổi. Không làm vật thể biến mất, quay lại trạng thái cũ hoặc đổi hướng vô cớ. Không áp quy tắc liên tục vật lý vào một phép so sánh được trình bày rõ là sơ đồ.

## 5. Viết mô tả đủ để triển khai

Với mỗi shot hoặc cụm shot, ghi các quyết định cần thiết:

- Cụm giải thích mà shot thuộc về; liên hệ với nguồn và thời gian thật/ước lượng; điều người xem hiểu thêm nhờ hình. Ghi lý do tách shot và yếu tố nối từ shot trước khi có chuyển cảnh.
- Hình thức biểu đạt, góc/cỡ cảnh, không gian, vị trí và tỷ lệ; cỡ vùng cần đọc trong khung, phần được crop và lý do giữ khoảng trống nếu đáng kể; thứ tự che khuất hoặc lớp nếu có tương tác phức tạp.
- Những gì đã hiện diện, trạng thái liên quan và điểm chú ý của người xem.
- Diễn biến cụ thể theo mốc khi có chuyển động: đối tượng/bộ phận, đường đi hoặc biến đổi, tiếp xúc, liên kết, tốc độ và cách dừng; quan hệ đồng thời/phụ thuộc chỉ ghi khi thực sự tồn tại.
- Những gì giữ nguyên hoặc thay đổi trong khoảng đó, hình cần đọc được ở thời điểm quan trọng và cách liên hệ với phần kế tiếp.
- Callout nếu cần: nội dung chính xác, đối tượng được chỉ, vị trí neo và khoảng xuất hiện; nếu không cần thì ghi không dùng.
- Dấu hiệu quan sát được để đánh giá shot đã thực hiện được chủ ý hay chưa.

Không buộc shot tĩnh phải có chuyển động, shot so sánh phải có hậu quả hay shot quan sát phải có cao trào. Lược các trường không áp dụng thay vì bịa nội dung để điền. Chi tiết phải giảm chỗ đoán khi dựng, không tăng số chữ cho có vẻ kỹ.

## 6. Text: mặc định không có chữ

Mặc định không có chữ trên hình: ý được diễn đạt bằng hình và chuyển động. Chỉ dùng callout ngắn khi hai vật trông giống nhau mà hình không phân biệt được, hoặc con số chính voice đọc ra; tối đa 2 cùng lúc. Trước mỗi callout, kiểm tra: bỏ nó thì có mất thông tin thiết yếu hoặc dễ hiểu sai không? Nếu không, bỏ. Không tiêu đề, phụ đề, nhãn kết luận hay con số tự thêm.

Neo rõ vào đối tượng/vùng cần chỉ; tránh che hành động, giao nhau với đường quan hệ khác hoặc trông như chi tiết trong bối cảnh. Hiện đủ lâu để đọc, mất đi khi hết vai trò, bám đúng đối tượng nếu hình di chuyển. Vào/ra chữ không được giành chú ý của sự kiện chính. Giữ cách trình bày nhất quán trong video; không áp phông hoặc màu cố định cho mọi dự án.

## 7. Rà ở hai cấp và sửa theo lỗi thực tế

Đọc [tiêu chí rà soát](references/review.md) để kiểm tra toàn đoạn rồi từng shot. Rà sự phát triển ý, độ lặp, quan hệ hình–voice, phân bổ chú ý và nhịp trước; sau đó mới rà chi tiết chuyển động/layer. Sửa nguyên nhân ở đúng cấp: ý không rõ thì đổi cách biểu đạt, không chỉ thêm chữ; quan hệ chưa rõ thì sửa staging, không chỉ thêm hiệu ứng.

Kiểm bản dựng bằng ảnh render (mục 8): xem ở các mốc cần đọc chi tiết, trong ngữ cảnh với shot kế bên, và tại các mốc cần đọc chi tiết; phân biệt lỗi diễn đạt với lỗi triển khai. Không coi đúng timing, nhiều chi tiết hoặc FPS cao là bằng chứng video đã rõ và hấp dẫn.

Đầu ra cần có lập luận biên tập ngắn, kế hoạch shot đủ triển khai, callout đã chọn và các điểm cần kiểm chứng. Quy trình định hướng quyết định; không hứa một khuôn mẫu bảo đảm mọi video hay.

## 8. Dựng

Lệnh: [TOOLS_CARD](TOOLS_CARD.md). API kit (scene, easing, camera): [API_CARD](API_CARD.md).

1. **Voice:** chưa có project thì `python3 tools/init_video.py <id> voice/<file>.mp3`; lấy mốc thời gian bằng `python3 tools/asr.py <id>` (đọc `voice_map.md`; `transcript.json` chỉ để tra mốc từng từ). Ghi kế hoạch vào `docs/SHOT_PLAN.md` trước khi code.
2. **Vẽ:** mọi vật trong `scenes/_assets.ts`, mỗi vật một hàm vẽ nhận góc nhìn làm tham số, theo [code-video-2d](../code-video-2d/SKILL.md). Vẽ xong, render một ảnh có tất cả vật để xem trước khi làm chuyển động.
3. **Chuyển động:** mốc thời gian lấy từ bảng cue `scenes/_cue.ts` đặt tên theo từ voice; vật xuất hiện ở nhiều cảnh lấy vị trí, trạng thái từ một hàm chung `scenes/_state.ts`; mỗi cảnh một file scene. Easing có sẵn (`A.sm`, `A.eo`, `A.eio`); camera liên tục dùng `K.track` / `K.follow` ([mẫu code camera](references/camera-code.md)). Tất định theo thời gian: không `Math.random`, không lưu trạng thái giữa các frame. Không sửa `scenes/shared/` (kit).
4. **Kiểm:** xem bằng **sheet** (nhiều khung hình ghép trong một ảnh), không render từng still lẻ; still chỉ dùng khi cần soi chi tiết một khung. Render sheet toàn phim và sheet quanh chỗ nối, xem ảnh, sửa theo mục 7:
   `cd app && bun scripts/render.ts sheet --project <id> --from 0 --to <dur> --n 24 --cols 4` và `… sheet --project <id> --cuts --cols 2`.
5. **Tiếng:** chỉ tiếng bắn (`cannon`, `mg`, `burst`, `rocket`) và tiếng nổ (`boom`), đúng lúc bắn hoặc nổ trên hình, không nhạc nền. Không giới hạn số lượng: đoạn đánh nhau thì mỗi phát bắn, mỗi vụ nổ thấy trên hình đều có tiếng. Ghi `data/sound.json`, chạy `python3 tools/sound.py <id>` ([cách làm](references/sound.md)).

Báo cáo ngắn: đã làm gì, còn lỗi gì, chưa nghe được voice. Chỉ xuất MP4 khi được yêu cầu.

## Cỡ cảnh và nền thừa

Ghi rõ kích thước chủ thể/điểm tương tác trong shot plan. Dựng chủ thể lớn trước rồi mới bố trí nền; rà ở cỡ preview nhỏ. Khoảng nền không phục vụ định hướng, chuyển động, so sánh hoặc callout thì crop/tiến camera/tăng cỡ chủ thể. Vật dài mảnh cần cận chi tiết, không coi rộng hết khung là đủ lớn. Cho phép phần phụ tràn mép; giữ trọn điểm tương tác và mốc nhận dạng. Với bản đồ, phóng cả cụm quan hệ, không làm sai khoảng cách bằng cách tăng riêng kích thước đơn vị.
