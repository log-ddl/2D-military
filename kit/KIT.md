# Kit dùng chung

> [!IMPORTANT]
> **`kit/` bị khoá.** Không sửa, thêm hay xoá file trong `kit/` khi chưa được người dùng cho phép rõ ràng trong cuộc trò chuyện hiện tại.
> - Đang dựng video mà thấy thiếu: viết helper trong `projects/<id>/scenes/` (hoặc sửa bản chép `scenes/shared/` của project đó).
> - Muốn đưa thứ gì vào kit: dừng lại, trình người dùng ảnh still + lý do nó dùng được cho **chủ đề khác**. Chỉ sửa khi người dùng đồng ý.
> - Mỗi lần kit đổi: thêm một dòng vào [Nhật ký](#nhật-ký-thay-đổi) (ngày, đổi gì, ai duyệt).

Kit chỉ chứa **công cụ** dùng được cho mọi video quân sự 2D. Không chứa chủ thể (xe, tàu, máy bay, vũ khí cụ thể) và không chứa ẩn dụ riêng của một video. Chủ thể vẽ trong từng project, theo [quy chuẩn vẽ](../.agents/skills/code-video-director/guide/1-visual.md).

`tools/init_video.py` chép kit vào `projects/<id>/scenes/shared/`. Scene import từ `./shared/...`. Project cũ giữ bản chép cũ nên không bị vỡ khi kit đổi. **Không chạy `--kit` trên project đang dựng dở** (lệnh này ghi đè bản chép).

| File | Nội dung |
|---|---|
| `base.ts` | `CanvasScene`: lớp cha của mọi scene, `draw(c, t, lt)` (t = giây tuyệt đối, lt = giây trong scene) |
| `art.ts` | Bảng màu nền sáng `C`, `W`/`H`, easing, số ngẫu nhiên ổn định, hình cơ bản |
| `camera.ts` | Camera thuần toán học, theo keyframe, bám đối tượng, rung, chuyển cảnh |
| `fx.ts` | Nổ, sóng xung kích, khói, lửa, bụi, mảnh văng, tia lửa, chớp nòng, đạn vạch, quỹ đạo |
| `ui.ts` | Callout, nhãn, số đếm, mũi tên, thanh, vòng, khung ngắm bộ phận, dấu X, tâm ngắm |
| `map.ts` | Nền bản đồ + lưới, sông/đường/rừng/thị trấn/đồi, ký hiệu đơn vị, mũi tiến công, mặt trận, vùng, góc quạt |
| `rig.ts` | Người lính tối giản: chân/tay mỗi bên một nét, đi, ngắm, nằm, da, điểm gắn |

Xem thử toàn bộ kit: `http://localhost:5173/?project=kit_demo` (5 cảnh, 40 giây).

## Mẫu scene
```ts
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as R from './shared/rig';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, lt: number) {
    A.clear(c);
    const cam = K.track(lt, [[0, { x: 960, y: 540, z: 1 }], [3, { x: 1200, y: 600, z: 2.2 }]]);
    K.begin(c, cam);
    // ... nền + chủ thể do project tự vẽ, toạ độ thế giới
    const so = R.rig(c, { x: 1200, y: 800, s: 1.6, aim: 0.1 });
    F.muzzleFlash(c, so.muzzle![0], so.muzzle![1], so.muzzleAng!, A.ph(lt, 2, 2.1));
    K.end(c);
    // UI ở toạ độ màn hình, đặt theo phép chiếu camera
    const [x, y] = K.toScreen(cam, so.head[0], so.head[1]);
    U.callout(c, 'AK-74', x, y - 160, { to: [x, y - 30], p: A.win(lt, 1, 4) });
  }
}
```

## art.ts
- `C`: `bg`, `bg2`, `paper`, `ink`, `inkLight`, `inkDim`, `grid`, `steel*`, `ally`/`allyD`, `foe`/`foeD`, `skin`, màu nhấn `blue cyan green yellow amber orange red`.
- Thời gian: `ph` (tuyến tính), `sm` (smoothstep), `eo`, `ei`, `eio`, `back` (vượt rồi về), `bump`, `win(t, a, b, fi, fo)` (hiện có fade), `keys(t, [[t, v]...])`.
- `rnd(seed)`: số ngẫu nhiên ổn định. Không dùng `Math.random` vì render từng frame.
- `px(c, n)`: n pixel màn hình đổi ra đơn vị hiện tại, dùng để giữ nét đều khi zoom. `scaleOf(c)`.
- Hình: `poly`, `line`, `rrect`, `circle`, `ellipse`, `capsule` (đoạn dày có viền), `path`, `fs`, `withA`, `clear`.

## camera.ts
- `Cam = { x, y, z, rot?, sx?, sy? }`: điểm thế giới (x, y) nằm ở tâm khung, phóng z. **Không có zoom hay lệch ẩn.**
- `begin(c, cam)` … `end(c)`: luôn đi cặp.
- `toScreen(cam, wx, wy)` và `toWorld(cam, sx, sy)`: đặt callout/UI đúng đối tượng. `view(cam)`: vùng thế giới đang thấy.
- `fit(box, frac)`: camera ôm hộp chủ thể theo tỉ lệ khung (chiều chặt hơn), luôn trọn khung. Shot toàn thân dùng `frac ≈ 0.8`: lớn mà không chạm mép ([RULES §2](../.agents/skills/code-video-director/RULES.md)). `R.rig` trả `box` để đưa thẳng vào đây.
- `track(t, [[t, cam]...])`: camera theo keyframe. `mix(a, b, p)`: zoom nội suy theo log nên tốc độ phóng đều mắt.
- `follow(t, pos, z, lag, lead)`: bám đối tượng có độ trễ. `withShake(cam, t, [[t0, amp]...])`, `handheld(cam, t, amp)`.
- Chuyển cảnh (toạ độ màn hình): `cutFlash`, `fade`, `whip` (lia nhanh), `wipe`, `iris`, `bars` (viền đen điện ảnh).

## fx.ts
`explosion(x, y, r, p)`, `shock`, `smoke(x, y, age)`, `fire(x, y, age)`, `dust(x, y, p)`, `debris(x, y, age, size, n, seed, groundY)`, `sparks`, `muzzleFlash(x, y, ang, p)`, `tracer(a, b, p)`, `arcPos(a, b, p, h)` → `[x, y, góc]`, `arcShot`, `straightShot`. Đầu đạn/tên lửa truyền qua `head(c, x, y, ang)`, do project vẽ.

## ui.ts
Vẽ **sau** `K.end(c)`, toạ độ màn hình. `label`, `callout(text, x, y, { to, p, color, badge })`, `counter(value, x, y, p, { unit })`, `arrow(a, b, { p })`, `pathArrow(pts, { p })`, `dashed`, `bar`, `ring`, `circleMark`, `focus(x, y, w, h, p)` (khung 4 góc cho zoom vào bộ phận được nêu tên), `xMark`, `crosshair`.
Luật dùng chữ nằm trong [RULES §1](../.agents/skills/code-video-director/RULES.md): mặc định không có chữ, nhãn chỉ khi hình không phân biệt được, tối đa 2 cùng lúc.

## map.ts
Vẽ **trong** camera. `KM = 100` đơn vị thế giới.
- `mapBg(c, cam)`: nền + lưới 1 km. Địa hình: `river`, `road`, `forest`, `town`, `hill`.
- `unit(x, y, kind, side, s, { dead })`: ký hiệu kiểu NATO đơn giản. Ta là chữ nhật xanh, địch là hình thoi đỏ. `kind`: `inf armor mech art recon hq air ad`.
- `advance(pts, p, { color, w })`: mũi tiến công mọc dần. `front(pts, p, { side })`: tuyến mặt trận có răng. `zone(pts)`: vùng nét đứt. `fan(x, y, r, a0, a1, p)`: góc quạt tầm bắn/quan sát. `route(pts, p)`: tuyến hành quân.
- Màn hình: `scaleBar(c, cam, km, x, y)`, `north(x, y)`.

## rig.ts
Đúng kiểu lính testvideo2. **Mỗi chân là một nét thẳng từ hông xuống chân, tay là một nét ngắn, không gối, không khuỷu.** Thân là khối bo góc, đầu tròn có mũ nửa vòm, súng là một nét. Người cao ~100 đơn vị, gốc ở chân, `s` là hệ số phóng.
- `rig(c, { x, y, s, dir, skin, walk, aim, lie, weapon, alpha })` → `Sockets { head, hand, muzzle?, muzzleAng?, box }`.
  - `walk`: pha bước, ví dụ `lt * 8`; bỏ trống là đứng yên. Hai nét chân xoè theo `sin`.
  - `aim`: góc tay + súng (radian, + là chếch lên). Ném lựu đạn cũng dùng `aim` rồi lấy `hand`.
  - `lie`: `'prone'` (nằm bắn, súng vẫn hướng trước) hoặc `'dead'` (ngã, rơi súng).
  - `weapon`: `'rifle'` (mặc định), `'tube'` (ống phóng), `null`. Vũ khí khác thì project tự vẽ tại `hand`.
- **Da** `SKINS`: `ally foe civil` (`{ body, limb, hat }`), hoặc truyền thẳng object `Skin`.
- **Không thêm** khớp, IK, bảng tư thế hay chi tiết trang trí. Cần dáng khác thì vẽ trong project.

## Nhật ký thay đổi
| Ngày | Thay đổi | Duyệt |
|---|---|---|
| 08-10-2026 | Dựng lại kit: bỏ `kit.ts`, `kit2.ts`, `models.ts` (xe Nga, vòng xích, nền trời đất cố định, camera ×1.32). Thêm `camera`, `fx`, `ui`, `map`, `rig`. Bản cũ lưu ở `docs/_archive/kit_2026-10-08/` | người dùng |
| 09-10-2026 | `rig.ts` tối giản theo kiểu lính testvideo2: bỏ LOD, áo giáp, ba lô, túi, mắt/mũi, bàn tay, giày, mũ nồi/mũ đệm. Giữ tư thế, IK, điểm gắn | người dùng |
| 09-10-2026 | `rig.ts` viết lại y hệt `drawSoldier` testvideo2: chân/tay mỗi bên một nét thẳng, bỏ khớp, IK, POSES, Hold. API còn `walk aim lie weapon skin` | người dùng |
| 09-10-2026 | Chú thích `camera.fit` và mục camera trong KIT.md theo luật khung mới (toàn thân trọn khung, `frac ≈ 0.8`). Code không đổi | người dùng |
