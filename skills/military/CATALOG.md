# CATALOG — đồ nghề của skill military (`skills/military/lib`) và phần chung (`core/kit`)

Đây là **bộ đồ nghề**, không phải kho cảnh hay mô hình dựng sẵn. Mỗi video tự thiết kế mỹ thuật (`src/design/`), tự dựng
mô hình và bối cảnh (`src/parts/`) bằng các công cụ dưới đây. Ảnh mẫu: `previews/3d_toolbox.png`, `previews/2d_toolbox.png`.

## core — chung mọi skill (`@core/…`)
| Import | Dùng cho |
|---|---|
| `@core/time`: `useT()`, `useSpring(t,at)`, `prog(t,a,b,ease?)`, `lerp`, `bump(t,a,d)`, `rnd(seed)`, `mix(hexA,hexB,p)`, `rad(deg)`, `deg(rad)` | Giây voice tuyệt đối, lò xo, nội suy; **`rad(d)` đổi độ→radian cho 3D**, `deg(r)` đổi radian→độ cho SVG |
| `@core/frame`: `useSize()` → `{W,H,SAFE}`, `Layer`, `handheld(t,amp,seed)` | Kích thước khung theo project.json, SVG toàn khung, rung máy |
| `@core/asset`: `asset('a012')`, `assetInfo('a012')` | Tài sản theo mã trong ASSETS.json (gọi trong component) |
| `@core/brand`: `brandLogoUrl()`, `brandConfig()` | URL logo kênh & cấu hình màu/độ mờ từ `library/brand/` (tự đồng bộ sang `.build/public/brand/`) |
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
| `stage`: `Cam`, `ContactShadow` | `Cam`: `pos, look, fov, roll` · `ContactShadow`: `center, size, reach, opacity, blur, h?` | Camera nội suy bằng `prog()`; bóng tiếp xúc gầm chống bay lơ lửng (hỗ trợ cả `SkinnedMesh` động) |
| `actor`: `Soldier3D`, `RifleMuzzleFlash`, `SOLDIER_CLIP_SPEEDS` | `t, skinSrc, animSrc, clip, onceFrom?, blendTo?, speed?, phase?, position, yaw, showWeapon?, fireAt?, burstRounds?` | Lính bộ binh PBR 67 xương dùng chung kho mocap Mixamo; tự pha giật vai & chớp lửa đầu nòng `muzzle_socket` theo `fireAt`; `SOLDIER_CLIP_SPEEDS` khớp vận tốc mặt đất chống trượt chân |
| `camera`: `SplineCam`, `sampleSplineRig` | `keyframes: {at?, pos, look, lens?, roll?}[]`, `t?`, `u?`, `clearance=0.65`, `minY=0.45` | Camera mặc định: đường cong mượt `CatmullRomCurve3` + đổi tiêu cự `lens` (mm) + quét `BVHTree` chống đâm xuyên vật thể |
| `bvh`: `BVHTree` | `BVHTree.fromScene(obj)`, `findNearest(pos, maxDist)` | Cây phân hoạch tam giác đo khoảng cách gần nhất để trượt tránh va chạm |
| `gltf`: `GltfPart` | `src, position, rotation, scale, noCollide?, clipPlanes?, cutRimColor?, cutRimWidth?, cutRimBoost?, ghostCutawayOpacity?, children?` | Nạp `.glb` an toàn `delayRender`; hỗ trợ cắt mặt phẳng động kèm viền laser HDR + bóng kính `ghost` |
| `gltf`: `GltfRig` | `src, position, rotation, scale, noCollide?, joints?, ghostNodes?, cutaway?, ghostColor?, ghostMaxOpacity?, children={(root)=>…}` | Khí tài `.glb` nhiều khớp động (`joints: { Node: { rot, pos, posOffset, scale, visible, castShadow } }`) + mổ xẻ X-Ray mượt theo nhóm vỏ (`ghostNodes` + `cutaway`) |
| `brand`: `BrandWallMark`, `BrandDecal`, `BrandPlate`, `BrandMark2D` | `BrandWallMark`: `position, rotation, width, tint, opacity, backingPlate` · `BrandDecal`: `target, position, normal, roll, size, tint, opacity, wear` · `BrandPlate`: `position, rotation, width` | Gắn Logo Kênh tự nhiên trong thế giới 3D: vách nhà chứa/sàn studio (`BrandWallMark`), sơn stencil ôm cong lưới 3D (`BrandDecal`), bảng kim loại khắc nổi (`BrandPlate`), dấu sơ đồ 2D (`BrandMark2D`) |
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

## CLI kho 3D BlenderKit & Blender nền (`core/tools/bk.py`)
- `python3 core/tools/bk.py search "<q1>" ["<q2>" ...] [-n 8] [-j 6] [--free]` — tìm nhiều từ khoá song song trên BlenderKit (hỗ trợ cả Full Plan qua `BLENDERKIT_API_KEY`).
- `python3 core/tools/bk.py fetch <uuid1> [<uuid2>:bg ...] [-j 6] [--res 2K|1K|0.5K|bg] [--thumb] [--force-res]` — tải song song nhiều mô hình vào `bk_cache/` dùng chung mọi dự án (mặc định bỏ qua thumbnail, tái sử dụng bản đã có trong cache, hậu tố `:bg` ưu tiên gói nhẹ 1K/0.5K cho đạo cụ nền).
- `python3 core/tools/bk.py inspect-parts <uuid1> [<uuid2> ...] [-j 4]` — mở Blender nền song song liệt kê toàn bộ tên mesh, số mặt, hộp bao chuẩn glTF `[x, y, z]`, vật liệu & độ phân giải texture.
- `python3 core/tools/bk.py prep <uuid_hoặc_blend> <đích.glb> [--role hero|prop|bg] [--length M | --height M] [--forward +X|-X|+Y|-Y] [--rig rig.json] [--recolor "#6b737b"] [--save-cache <slug>]` — chuẩn hoá hướng mũi `+X`, đáy `Y=0`, tạo cây khớp Empty xoay chuẩn (`--rig`), đổi màu sơn giữ AO (`--recolor`), nén ảnh WebP và xuất `.glb`.
- `python3 core/tools/bk.py prep-actor <uuid_hoặc_blend> <đích.glb> [--preset skills/military/presets/infantry_uniforms.json:<desert|woodland|multicam|urban|arctic>] [--prop <vũ_khí.glb> | --no-prop] [--save-cache <slug>] [--inspect <sheet.png>]` — tuỳ biến trang phục mô-đun (gỡ giáp vai/túi phụ, đổi rằn ri 4 màu `camo4` hoặc nhuộm `tint` giữ nguyên nếp vải/AO/Normal) và chuẩn hoá khung 67 xương Mixamo (`+X` forward, đế giày `Y=0`, gắn vũ khí lên `weapon_mount` + `muzzle_socket`).
- `python3 core/tools/bk.py list-prepped` — liệt kê các bản `.glb` (khí tài, nhân vật, gói mocap) đã chuẩn hoá sẵn trong `bk_cache/prepped/`.

## CLI kho hoạt cảnh Mixamo (`core/tools/mocap.py`)
- `python3 core/tools/mocap.py search "<từ khoá 1>" ["<từ khoá 2>" ...] [-n 20]` — tra nhanh `mixamo/manifest.csv` (2.446 clip quang học; tuyệt đối không quét trực tiếp các file `.fbx`).
- `python3 core/tools/mocap.py pack --out <anims.glb> --spec <clips.json> [--base-rig <slug_hoặc_meta.json>] [--report <speeds.json>] [--save-cache <slug>]` — đóng gói danh sách clip `.fbx` sang 1 file `.glb` (`NLA_TRACKS`) nhẹ dùng chung cho mọi biến thể quân phục, tự đo `speed_mps`, khử trôi ngang `Hips` thành `In-Place` và căn chuẩn 2 tay cầm súng (`two_hand`, `reload_rh`, `grenade_lh`, `slung`). Bộ 24 clip chiến đấu mẫu: `skills/military/presets/mixamo_combat_clips.json`.
