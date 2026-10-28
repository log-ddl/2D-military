# CATALOG — thư viện code dùng chung (`engine/lib`, `engine/kit`)

Đây là **bộ đồ nghề**, không phải kho cảnh hay mô hình dựng sẵn. Mỗi video tự thiết kế mỹ thuật, tự dựng mô hình
và bối cảnh của mình (trong `projects/<id>/video/local/`) bằng các công cụ dưới đây. Import bằng alias `@kit/…`, `@lib/…`.
Ảnh mẫu: `previews/3d_toolbox.png`, `previews/2d_toolbox.png`.

## kit — nền tảng
| Import | Dùng cho |
|---|---|
| `@kit/theme`: `D`, `FONT`, `W`, `H`, `prog(t,a,b,ease?)`, `lerp`, `mix(hexA,hexB,p)`, `bump(t,a,d)`, `rnd(seed)`, `skyColors(h)`, `deg` | Bảng màu 2D, hàm thời gian/nội suy |
| `@kit/motion`: `useT(t0)`, `useSpring(t,at)`, `handheld(t,amp,seed)`, `Layer`, `Label` | Giây voice tuyệt đối, lò xo, rung máy, svg toàn khung, nhãn chữ |
| `@kit/media`: `media('images/x.jpg')` | Ảnh/footage của bạn (input/ → library/), build.py tự chép |
| `@kit/timeline` | Engine dùng (Video.tsx sinh tự động) — cảnh không cần import |
| `@kit/quality`: `useQuality()` → 1 · 0.5 · 0.25 | Chất lượng preview chọn trong Studio. `Stage`, `Grain` đã tự giảm tải; công cụ mới nặng (nhiều hạt, filter) nên đọc nó để giảm khi < 1. Xuất video luôn = 1 |

## 2D — `@lib/2d/*`
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

## 3D — `@lib/3d/*`
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
- Công cụ nào thiếu → viết trong `video/local/` của dự án. Chỉ chuyển lên `engine/lib` khi người dùng đồng ý, kèm cập nhật bảng này.
