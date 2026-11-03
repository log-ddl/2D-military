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
| `label`: `Label`, `Callout` | `Label`: `t, text, x, y, from, until, size, fg` · `Callout`: `t, text, at, to, from, until, fg, lineColor` — chữ không khung & đường gióng mảnh 1.35px thống nhất toàn kênh |
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
| `stage`: `Stage` | `sky[3], sun, sunIntensity, shadowArea, shadowCenter, fog, env, ambient, exposure, post{bloom, bloomThreshold, ao, dof}` | Canvas + trời + nắng có bóng + PMREM động theo trời/nắng + hậu kỳ HDR (`bloomThreshold=1.2`). `post={false}` khi thử nhanh |
| `stage`: `Cam`, `ContactShadow` | `Cam`: `pos, look, fov, roll` · `ContactShadow`: `center, size, reach, opacity, blur, h?` | Camera nội suy bằng `prog()`; bóng tiếp xúc gầm chống bay lơ lửng |
| `geom`: `loft(stations, opts)` | `stations: {x, rz?, ry?, y?, z?, n?, twist?, pts?}[]` | Nối mượt đa mặt cắt biến thiên dọc `+X` (thân máy bay, tàu chiến, tàu ngầm, tháp pháo đúc, vỏ động cơ, mũi tên lửa) |
| `geom`: `sweep(profile, curvePts, opts)`, `airfoil(chord, thick?, camber?)` | `opts: {steps, taper, twist, caps}` | Quét tiết diện 2D dọc đường cong 3D có thu phóng/xoắn (cánh máy bay, cánh quạt, chân vịt, ống dẫn) + biên dạng NACA |
| `geom`: `extrude(pts,depth,bevel)`, `extrudeTop(pts,h)`, `lathe(profile,seg)`, `revolve(profile,seg,arc)`, `shell(geo,thick)`, `clipPlane(normal,offset)`, `rbox`, `pipe`, `merge`, `mat4` | | Đùn phẳng; tiện tròn / tiện mở góc giải phẫu (`revolve`); tạo độ dày vỏ (`shell`); mặt phẳng cắt cơ khí (`clipPlane`) |
| `materials`: `paint(o)`, `armorPlate(o)`, `panelPaint(o)`, `machined(o)` | | Sơn ngụy trang; thép giáp đúc sần (`armorPlate`); vỏ ghép tấm rãnh + đinh tán (`panelPaint`); kim loại tiện phay xước (`machined`) |
| `materials`: `glass(o)`, `ghost(color?, opacity?)`, `clipMat(mat, planes)`, `plain`, `grain`, `fbm`, `vnoise` | | Kính quang học vật lý (`glass`); vỏ mờ X-ray Fresnel (`ghost`) & cắt mặt phẳng (`clipMat`) lộ cơ khí bên trong |
| `parts`: `Wheel`, `Track`, `Rivets`, `Measure3D`, `ScaleHuman` | `Wheel`: `r, width, spin` · `Track`: `xFront, xRear, rFront, rRear, width, travel` · `Measure3D`: `from, to, text, color, progress` · `ScaleHuman`: `position, height` | Bánh xe, dải xích, đinh tán, thước đo kích thước nằm trong phối cảnh 3D (`Measure3D`), hình người chuẩn tỷ lệ 1.78m (`ScaleHuman`) |
| `terrain`: `heightField`, `ridgeX`, `Terrain`, `Scatter` | `Scatter`: `kind: pine/broadleaf/bush/rock` | Địa hình tự nhiên + tán cây có chiều sâu AO |
| `terrain`: `Water`, `Surface` | `Water`: `t, waveHeight, wakes[]` · `Surface`: `kind: runway/concrete/asphalt/deck/studio, cyclorama?` | Mặt biển động có sóng Gerstner & vệt rẽ nước (`Water`); đường băng, bê tông, boong tàu, sàn studio/sa bàn (`Surface`) |
| `fx`: `Explosion`, `MuzzleBlast`, `JetPlume`, `RotorBlur`, `SmokeColumn`, `DustTrail`, `Trail`, `ballistic`, `ballisticPoints` | | Cầu lửa bức xạ nhiệt + xung kích; luồng phản lực vân Mach (`JetPlume`); đĩa mờ quay (`RotorBlur`); cột cháy khói (`SmokeColumn`) |

## Quy tắc
- Mọi thứ tất định theo `t` và seed: không state, không `Math.random`.
- Hàm độ cao / danh sách điểm nặng: tạo ở cấp module hoặc `useMemo`.
- **UV của `extrude` / `extrudeTop`:** `ExtrudeGeometry` tính UV theo đơn vị mét thật (`1 m = 1 UV`), khác `lathe`/`rbox` (`0..1`) → mảng thân khí tài lớn dựng bằng `extrude` nên đặt `paint({ ..., repeat: 0.35–0.5 })` để vân sơn không bị đốm vụn; đường cong bầu mũi/vòm lớn nên lấy đủ điểm mượt (≥16–20 điểm).
- **Filter SVG trong `<Cam2D>`:** tránh gắn `filter="url(#glow)"` trực tiếp lên đường chéo dài bên trong nhóm đang `scale` của `<Cam2D>` (dễ dính lỗi cắt ô filter của Chromium); ưu tiên vẽ nét kép (halo mờ bản rộng + lõi sáng) hoặc đặt `<Defs2D>` ngoài lớp zoom.
- **Góc `Cam` 3D với `<Trail>`:** tránh đặt quỹ đạo `Cam` đi xuyên trùng dọc theo vector kéo dài của `<Trail>` đầu cánh/đạn để vệt khói không bị chiếu suy biến thành vạch thẳng đứng trên khung hình.
- Công cụ nào thiếu → viết trong `src/parts/` của dự án. Chỉ chuyển lên `skills/military/lib` khi người dùng đồng ý, kèm cập nhật bảng này.
