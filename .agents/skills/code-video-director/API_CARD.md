# API kỹ thuật — chỉ đọc khi viết scene

Phong cách nằm ở [code-video-2d](../code-video-2d/SKILL.md). Dùng Canvas chuẩn để tạo hình; không cần nạp danh mục rig/map/fx/ui.

## Scene
```ts
import { CanvasScene } from './shared/base';
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, lt: number) {
    // t: giây toàn phim; lt: giây trong scene; canvas 1920×1080.
    // Base đã xóa nền sáng mỗi frame.
  }
}
```
Kit được init chép vào `scenes/shared/`. Không sửa các file đó; helper riêng đặt trong `scenes/_*.ts` của project. App chỉ nạp scene có tên trong `timeline.json`, nên file helper trong `scenes/` không bị coi là scene.

## Thời gian và nét — import * as A from './shared/art'
- `A.ph(t,a,b)`, `A.sm(t,a,b)`, `A.eo(t,a,b)`, `A.ei(t,a,b)`, `A.eio(t,a,b)` trả tiến độ 0..1. Đây là hàm ba đối số.
- `A.lerp(from,to,p)`; ví dụ `A.lerp(x0,x1,A.sm(lt,t0,t1))`.
- `A.keys(t, [[t0,v0],[t1,v1]])`, `A.rnd(seed)` tất định, `A.px(c,n)` đổi pixel màn hình sang độ dày trong transform hiện tại.
- `A.lerpColor(hexA,hexB,p)` pha hai màu hex. Màu hình lấy từ bảng màu project theo quy chuẩn vẽ; **không dùng `A.C.*` cho hình**.

Mẫu triển khai camera liên tục và world dùng chung: [hướng dẫn code](references/camera-code.md).

## Camera — import * as K from './shared/camera'
- `Cam = {x,y,z,rot?,sx?,sy?}`; điểm thế giới `(x,y)` ở tâm màn hình, `z` là độ phóng.
- `K.begin(c,cam)` → vẽ thế giới → `K.end(c)`; luôn đi cặp. UI vẽ sau camera theo tọa độ màn hình.
- `K.track(t, [[t0,cam0],[t1,cam1]])`, `K.fit({x,y,w,h},frac)`; `K.toScreen(cam,wx,wy)` cho điểm neo trên màn hình.
- `K.withShake(cam,t,[[t0,amp,dur]])` khi hành động cần rung.
- Chọn và giữ hệ tọa độ thế giới nhất quán; SIDE có thể dùng mặt đất y=0, phía trên y âm.

Helper khác là tùy chọn. Nếu cần, đọc đúng chữ ký trong `scenes/shared/<file>.ts`; không đoán, không nạp cả thư viện. Dùng `save/restore` cân bằng; không gọi camera bên trong hàm asset.

## Lỗi kỹ thuật hay gặp
- `save()`/`restore()` lệch làm mất transform camera mà không báo lỗi.
- Tọa độ thế giới và màn hình phải tách rõ; UI vẽ sau `K.end` neo bằng `K.toScreen`.
- Cảnh báo của công cụ không phải chỉ đạo nghệ thuật: không thêm cut, tiếng hay chi tiết chỉ để hết cảnh báo.
