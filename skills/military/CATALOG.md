# CATALOG — đồ nghề của skill military (`skills/military/lib`) và phần chung (`core/kit`)

Đây là **bộ đồ nghề**, không phải kho cảnh hay mô hình dựng sẵn. Mỗi video tự thiết kế mỹ thuật (`src/design/`), tự dựng
mô hình và bối cảnh (`src/parts/`) bằng các công cụ dưới đây. Ảnh mẫu: `previews/3d_toolbox.png`, `previews/2d_toolbox.png`.

## core — chung mọi skill (`@core/…`)
| Import | Dùng cho |
|---|---|
| `@core/time`: `useT()`, `useSpring(t,at)`, `prog(t,a,b,ease?)`, `lerp`, `bump(t,a,d)`, `rnd(seed)`, `mix(hexA,hexB,p)`, `deg` | Giây voice tuyệt đối, lò xo, nội suy, ngẫu nhiên tất định |
| `@core/frame`: `useSize()` → `{W,H,SAFE}`, `Layer`, `handheld(t,amp,seed)` | Kích thước khung theo project.json, SVG toàn khung, rung máy |
| `@core/asset`: `asset('a012')`, `assetInfo('a012')` | Tài sản theo mã trong ASSETS.json (gọi trong component) |
| `@core/preview`: `type Preview` | `export const preview` của part |

## military — chủ đề (`@skill/military/…`)
| Import | Dùng cho |
|---|---|
| `theme`: `D`, `FONT`, `skyColors(h)` | Bảng màu mặc định, font, màu trời theo giờ |
| `label`: `Label` | `t, text, x, y, from, until, size, bg, fg` — nhãn số / tên riêng bật lò xo |
| `3d/turntable`: `turntable(C, {size, center})` | `export const preview = turntable(F16, { size: 15 })` trong `src/parts/F16.tsx` |

## 2D — `@skill/military/2d/*`
| Import | Props chính | Ghi chú |
|---|---|---|
| `look`: `Defs2D` | `shadow` | Filter `#sh` bóng mềm, `#shHard` bóng cắt giấy, `#glow`, `#grain`, `#rough` (mép run tay) |
| `look`: `Cam2D` | `x, y, zoom, rot, shake, bg` | Đưa điểm thế giới (x,y) vào tâm khung; con vẽ theo toạ độ thế giới |
| `look`: `Grain` | `opacity` | Lớp hạt phủ cuối cảnh |
| `path`: `arcAt, arcPath, arcAngle` | `(x0,y0,x1,y1,apex,s)` | Quỹ đạo parabol, góc xoay đạn theo hướng bay |
| `path`: `smoothPath(pts, closed)`, `drawOn(len,p)` | | Đường cong mượt qua điểm; vẽ dần nét |
| `fx`: `Blast2D` | `t, at, x, y, size, air, life, smoke` | Nổ đất / nổ trên không: chớp, lửa, mảnh, khói |
| `fx`: `Muzzle2D` | `t, at, x, y, angle, size` | Lửa + khói đầu nòng |
| `fx`: `Puff2D` | `x, y, r, color, opacity` | Một cụm khói |
| `terrain`: `skyline(seed,x0,x1,base,amp,wave)` | | Dải đồi nhìn ngang (xếp nhiều lớp cho chiều sâu) |
| `terrain`: `contours(seed,w,h,levels)` | | Đường đồng mức bản đồ (tính một lần, useMemo) |

## 3D — `@skill/military/3d/*`
| Import | Props chính | Ghi chú |
|---|---|---|
| `stage`: `Stage` | `sky[3], sun, sunIntensity, shadowArea, shadowCenter, fog, env, ambient, exposure, post` | Canvas + trời + nắng có bóng + ánh sáng môi trường + hậu kỳ (AO, bloom, ACES, vignette). `post={false}` khi thử nhanh |
| `stage`: `Cam` | `pos, look, fov, roll` | Camera; nội suy pos/look bằng `prog()` |
| `geom`: `extrude(pts,depth,bevel)` | biên dạng nhìn ngang X–Y | Thân xe, tháp pháo, càng — vẽ theo tỉ lệ thật (m) |
| `geom`: `extrudeTop(pts,h)`, `lathe(profile,seg)`, `rbox(w,h,d,r)`, `pipe(pts,r)`, `merge`, `mat4` | | Mặt bằng; nòng/đạn (dọc +X); hộp vát; ống; gộp geometry |
| `materials`: `paint({color, camo[], camoScale, wear, dirt, roughness, metalness, repeat, seed})` | | Sơn quân sự có loang, mòn, bẩn (texture tự sinh, cache) |
| `materials`: `plain(color, rough, metal)`, `grain()`, `fbm`, `vnoise` | | Vật liệu trơn; hạt chi tiết; noise tất định |
| `parts`: `Wheel` | `r, width, spin, tire, rim, bolts, position` | Bánh xe (trục Z); `spin = quãng đường / r` |
| `parts`: `Track` | `xFront, xRear, rFront, rRear, width, travel` | Dải xích chạy theo `travel` (m) |
| `parts`: `Rivets` | `points, r` | Đinh tán instanced |
| `terrain`: `heightField({seed, amp, scale, flats, add})`, `ridgeX(x0,h,w)` | | Hàm độ cao; `add` = hình dạng riêng do cảnh viết |
| `terrain`: `Terrain` | `h, size, seg, center, colors{low,high,rock,dry}` | Lưới đất màu theo độ cao/độ dốc, nhận bóng |
| `terrain`: `Scatter` | `kind: pine/broadleaf/bush/rock, count, area, h, seed, scale, avoid, tint` | Rải cây/đá bám đất, mỗi cá thể khác nhau |
| `fx`: `Explosion` | `t, at, pos, size, smokeLife` | Chớp + cầu lửa + mảnh + vòng bụi + cột khói |
| `fx`: `MuzzleBlast` | `t, at, pos, dir, size` | Lửa + khói đầu nòng |
| `fx`: `DustTrail` | `t, from, to, path(t), rate` | Bụi sau xe chạy |
| `fx`: `Trail`, `ballistic`, `ballisticPoints` | | Vệt quỹ đạo phát sáng; điểm parabol 3D |

## Quy tắc
- Mọi thứ tất định theo `t` và seed: không state, không `Math.random`.
- Hàm độ cao / danh sách điểm nặng: tạo ở cấp module hoặc `useMemo`.
- **UV của `extrude` / `extrudeTop`:** `ExtrudeGeometry` tính UV theo đơn vị mét thật (`1 m = 1 UV`), khác `lathe`/`rbox` (`0..1`) → mảng thân khí tài lớn dựng bằng `extrude` nên đặt `paint({ ..., repeat: 0.35–0.5 })` để vân sơn không bị đốm vụn; đường cong bầu mũi/vòm lớn nên lấy đủ điểm mượt (≥16–20 điểm).
- **Filter SVG trong `<Cam2D>`:** tránh gắn `filter="url(#glow)"` trực tiếp lên đường chéo dài bên trong nhóm đang `scale` của `<Cam2D>` (dễ dính lỗi cắt ô filter của Chromium); ưu tiên vẽ nét kép (halo mờ bản rộng + lõi sáng) hoặc đặt `<Defs2D>` ngoài lớp zoom.
- **Góc `Cam` 3D với `<Trail>`:** tránh đặt quỹ đạo `Cam` đi xuyên trùng dọc theo vector kéo dài của `<Trail>` đầu cánh/đạn để vệt khói không bị chiếu suy biến thành vạch thẳng đứng trên khung hình.
- Công cụ nào thiếu → viết trong `src/parts/` của dự án. Chỉ chuyển lên `skills/military/lib` khi người dùng đồng ý, kèm cập nhật bảng này.
