# 4. Code camera trên không gian dùng chung

Chỉ cần khi kế hoạch có đoạn nối `continuous` hoặc camera di chuyển qua nhiều nhịp. Máy đứng và hard cut không cần mẫu này. File này chỉ là mẫu code; quyết định khi nào di chuyển camera nằm ở [director](../SKILL.md) mục 3–4.

Đọc định nghĩa camera của project trước khi dùng. Mẫu này khớp API `kit/camera.ts` hiện có; không ghi đè bản kit của project. `worldAt`, `drawWorld`, `cameraAt` bên dưới là helper **cần tạo trong project**, không phải API kit.

## 4.1 Tách ba trách nhiệm
- **World/layout:** tọa độ cố định, asset ID, parent/anchor, layer và góc chiếu. Các đoạn không liền nhau có thể dùng cùng world. Không xây một world khổng lồ cho các nơi không liên quan.
- **State:** `worldAt(t)` trả trạng thái tất định theo thời gian toàn phim hoặc một ánh xạ thời gian câu chuyện được định nghĩa rõ. Cùng vật giữ ID và pha, bất kể đang được camera nhìn hay không. Quay lại địa điểm thì lấy state đúng lần trở lại, không chạy lại animation mở đầu.
- **Camera:** `cameraAt(t)` trả `K.Cam` từ track của take hiện tại. Ranh giới nhịp không tự reset track. `drawWorld` không tự thay camera.

Có thể đặt trong các file `_world.ts`, `_state.ts`, `_camera.ts`; đây là gợi ý cấu trúc, không bắt tên file. Mỗi scene gọi cùng helper khi dùng cùng world/view. Góc SIDE/TOP là renderer khác trên cùng state, không phải chỉ đổi `cam.rot`.

## 4.2 Track xuyên nhiều nhịp, cùng thế giới
Mẫu dưới chỉ minh họa kỹ thuật: thay tọa độ và thời gian theo voice/kế hoạch, không lấy làm lưới chia nhịp. Các camera mốc phải dùng cùng hệ tọa độ và zoom dương.

```ts
import * as K from './shared/camera';
import * as A from './shared/art';

const wide: K.Cam = { x: 0, y: 0, z: 0.8 };
const detailA: K.Cam = { x: -300, y: 0, z: 2 };
const detailB: K.Cam = { x: 300, y: 0, z: 2 };
const cameraKeys: [number, K.Cam][] = [
  [0, wide], [1.1, wide],          // giữ toàn cảnh
  [2.6, detailA], [3.5, detailA],  // tiến vào A rồi giữ
  [5.1, detailB], [6.4, detailB],  // lia A → B trên cùng world
  [8.4, wide],                     // lùi ra thấy quan hệ tổng thể
];
export function cameraAt(t: number): K.Cam {
  return K.track(t, cameraKeys, A.eio);
}
```

Trong hàm `draw(c, t, lt)` của scene:
```ts
const state = worldAt(t); // helper project: trạng thái mọi vật liên quan
const cam = cameraAt(t);
A.clear(c, '#f4f8fb');     // phủ toàn màn hình TRƯỚC transform camera
K.begin(c, cam);
drawWorld(c, state, cam); // helper project: cùng layout, không chỉ vẽ vật của nhịp
K.end(c);
// UI màn hình nếu cần: vẽ sau K.end; neo bằng K.toScreen(cam, wx, wy).
```

`K.begin` thực hiện translate tới tâm màn hình → scale zoom → translate ngược tâm world. `K.track` gọi `K.mix`, nội suy vị trí và zoom (zoom theo log). Vì vậy camera đổi khung nhìn của cả world, không lấy một bộ phận ra vẽ riêng giữa màn hình. Chỉ cull vật chắc chắn ngoài viewport; vật không phải trọng tâm nhưng còn trong khung vẫn phải hiện.

## 4.3 Nối camera, follow và cut
Ưu tiên một track cho cả take để tránh mốc nối không khớp. Nếu phải tách hàm, lưu camera ranh giới từ track trước rồi dùng nó làm điểm đầu, thay vì tự gõ một camera cận mới:
```ts
// previousCameraAt và nextFocusAt: helper project phải được định nghĩa.
const joinTime = 12; // ví dụ; thay bằng mốc thực
const from = previousCameraAt(joinTime);
const to = nextFocusAt(t); // có thể tính từ anchor đang chuyển động
const cam = K.mix(from, to, A.eio(t, joinTime, joinTime + 0.7));
```
Mẫu này phù hợp khi bắt đầu một lần chuyển máy mới. Nếu camera đang chạy qua ranh giới, giữ track xuyên ranh giới để tránh dừng rồi chạy lại. Kiểm cả vị trí lẫn nhịp vận tốc.

Vật đang chạy có thể dùng `K.follow(t, positionAt, zoom, lag, lead)`, với `positionAt(time)` trả `[worldX, worldY]` từ cùng state. Hàm phải xử lý cả thời điểm trước/sau vùng đang xem do follow lấy mẫu lân cận. Chuyển từ máy đứng sang follow cần `K.mix` trong một khoảng thời gian; gán ngay camera follow cũng gây nhảy.

Hard cut được viết rõ: chọn camera/renderer mới tại thời điểm cắt; không nội suy giả giữa SIDE và TOP bằng camera 2D. State và ID vẫn dùng chung. Không dùng `K.whip`, flash hoặc fade để che lỗi ở đường nối được ghi là continuous.

## 4.4 Nền và vùng nhìn
Sau nền màu toàn màn hình, địa hình/kiến trúc nằm trong world và không trôi theo camera. Với camera không xoay, tâm màn hình mặc định, `K.view(cam, margin)` cho vùng cần phủ; mặt đất có thể kéo tới biên viewport nhưng vật mốc phải giữ tọa độ world. `K.view` không xử lý `rot` và tâm `sx/sy` tùy chỉnh: trường hợp đó lấy bốn góc màn hình qua `K.toWorld` để tính vùng bao. Zoom-out không được lộ mép nền do chỉ vẽ một rect bằng kích thước màn hình trong world.

## 4.5 Kiểm đường nối
- Với mỗi nối continuous, xem ngay trước, tại, sau mốc nối và giữa quãng lia/zoom: nền có đủ, vật có biến mất/đổi vị trí/scale riêng, pha có reset không?
- So camera hai phía ranh giới: tại đúng ranh giới phải trùng x/y/z/rot/sx/sy (sau chuẩn hóa giá trị mặc định), trừ rung có chủ ý. Các frame sát ranh giới phải tiến triển êm, không nhảy.
- Tua thẳng tới một mốc và phát từ đầu phải cho cùng trạng thái. Kiểm lại lần trở lại world ở đoạn xa, không chỉ lần đầu.
- Không chỉ render đầu/cuối: ảnh tĩnh đẹp không chứng minh đường chuyển máy đạt. Kiểm preview với voice; mỗi nhịp phải mang thông tin mới, không chỉ trôi camera.
