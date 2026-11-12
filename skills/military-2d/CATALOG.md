# CATALOG — đồ nghề của skill military-2d (`skills/military-2d/lib`)

Bộ đồ nghề dựng video quân sự thuần 2D (không phải kho khí tài dựng sẵn — khí tài/công sự/mặt cắt riêng của từng chủ đề vẽ trong `src/parts/` của dự án).
Ảnh mẫu: `previews/person_styles.jpg`, `previews/geobase_route_photofull.png`, `../military/previews/2d_toolbox.png`.

Dùng chung từ nơi khác:
- `@core/*`: `useT`, `prog`, `lerp`, `bump`, `rnd`, `deg`, `mix`, `useSpring`, `asset('aNNN')`, `handheld`, `type Preview`.
- `@skill/military/2d/look`: `Cam2D`, `Defs2D`, `Grain`.
- `@skill/military/2d/fx`: `Blast2D`, `Muzzle2D`, `Puff2D`.
- `@skill/military/2d/terrain`: `skyline`, `contours`, `height2`.
- `@skill/military/2d/path`: `smoothPath`, `arcPath`, `drawOn`.
- `@skill/military/label`: `Label`, `Callout`.
- Cấm import từ `@skill/military/3d/*`, `three`, `@react-three/*`.

## Ba khung cảnh ngang hàng (chọn đúng sân khấu theo câu hỏi, không mặc định bản đồ)

```tsx
// (A) Cảnh 2D góc ngang — hành động, giao tranh, cao độ đồi/chiến hào, mặt cắt cơ chế
const t = useT();
const cam = { ...fitBox({ x: 320, y: 420, w: 1180, h: 420 }, 0.8), shake: handheld(t, 1.5) };
const so = soldierSockets({ x: 560, y: 780, s: 1.5, aim: 0.08 });
<>
  <Cam2D {...cam} bg={P.bg}>
    <SideStage camX={cam.x} groundY={780} mood="day" seed="hill1">
      <Soldier2D x={560} y={780} s={1.5} aim={0.08} />
      <Tank2D x={1180} y={780} side="enemy" /> {/* vẽ trong src/parts/Tank2D.tsx */}
      {so.muzzle && <Muzzle2D t={t} at={CUE.fire} x={so.muzzle[0]} y={so.muzzle[1]} angle={so.muzzleDeg!} size={34} />}
      <Tracer2D t={t} fromPt={so.muzzle!} toPt={[1120, 720]} at={CUE.fire} />
      <Blast2D t={t} at={CUE.fire + 0.22} x={1120} y={735} size={65} />
    </SideStage>
  </Cam2D>
  <Callout t={t} text="RPG-7" at={screenOf(cam, so.head)} to={[420, 260]} from={CUE.fire - 0.6} until={CUE.fire + 2.2} />
  <Grain opacity={0.28} />
</>

// (B) Cảnh 2D sa bàn chiến thuật cục bộ (TopStage) — phục kích, tạt sườn, hoả lực chéo, đội hình
<Cam2D {...cam} bg={P.bg}>
  <TopStage seed="valley" tone="light">
    <Fan2D t={t} at={[680, 520]} r={460} a0={-28} a1={24} from={CUE.ambush} side="blue" k={1 / cam.zoom} />
    {/* sông, đường, rừng, công sự, thân xe nhìn từ trên + Arrow2D / Blast2D */}
  </TopStage>
</Cam2D>

// (C) Cảnh Bản đồ địa lý (GeoBase / SatBase) — CHỈ dùng khi định vị địa lý / hướng cơ động cấp chiến dịch
<Cam2D {...cam} bg={M.sea}>
  <GeoBase bounds={[98, 8, 114, 24]}>
    {(proj) => <>…ký hiệu tactics, truyền k={1 / cam.zoom}…</>}
  </GeoBase>
</Cam2D>
```

## `theme`
| Import | Dùng cho |
|---|---|
| `P` | Bảng màu tạo hình 2D (nền sáng `bg, bg2, paper`, viền `ink, ink2`, khối 2–3 tông `olive/oliveLight/oliveDark`, `ally/*`, `enemy/*`, `slate, dark, light, skin, glass, sand, earth, grass, forest, water, amber, sky`) |
| `LINE` | Độ dày nét chuẩn trên khung 1920×1080 ở `zoom = 1`: `LINE.outer = 4`, `LINE.inner = 2.25` |
| `M` | Bảng màu tối cho bản đồ tác chiến & khung tư liệu: `sea, land, landHi, coast, grid, ink, dim, blue, red, amber, paper, paperInk` |
| `FONT`, `sideColor(side)`, `type Side = 'blue' \| 'red' \| 'amber'` | Font chung toàn kênh; mọi prop `side` nhận tên phe hoặc mã màu hex |

## `field` — sân khấu & đồ nghề 2D chiến thuật / hành động / cơ chế
| Import | Props chính | Ghi chú |
|---|---|---|
| `SideStage` | `groundY = 780` (`null` = tắt đất), `camX = 960`, `mood: 'day' \| 'dusk' \| 'night' \| 'cutaway'`, `seed`, `showHills?`, `width = 3840, height = 2160` | Góc ngang: bầu trời + 3 lớp đồi `skyline` thị sai + mặt đất + `<Defs2D />`. Đặt trong `Cam2D` |
| `TopStage` | `width = 2400, height = 1400, seed, tone: 'light' \| 'dark', gridStep = 160, showContours = true, levels = 8` | Sa bàn cục bộ nhìn từ trên: lưới chiến thuật + đường đồng mức `contours` + `<Defs2D />`. Đặt trong `Cam2D` |
| `Soldier2D` | `x, y` (chân trên mặt đất), `s = 1` (cao ~100 px), `dir: 1 \| -1`, `skin: 'ally' \| 'blue' \| 'foe' \| 'civil' \| { body, limb, hat }`, `walk?` (vd `t * 8`), `lie?: 'prone' \| 'dead'`, `aim?` (radian), `weapon?: 'rifle' \| 'tube' \| null`, `opacity?` | Người lính 2D tối giản nét thẳng chuẩn mực: đứng, bước đi, nằm sấp bắn, vác ống phóng chống tăng, ngã |
| `soldierSockets(opts)` | Cùng tham số với `Soldier2D` | Trả `{ head, hand, muzzle?, muzzleRad?, muzzleDeg?, box }` để gắn chuẩn `Muzzle2D`, `Tracer2D`, `Callout`, `fitBox` |
| `Fan2D` | `t, at, r, a0, a1` (độ), `from, dur = 0.7, until?, side, fill = 0.16, k = 1` | Góc quạt tầm bắn / vùng quan sát / hoả lực chéo |
| `Tracer2D` | `t, fromPt, toPt, at, dur = 0.22, len = 0.22, color?, core?, width = 4.5, k = 1` | Tia đạn vạch lao nhanh từ nòng tới mục tiêu rồi tắt hẳn |
| `ArcShot2D`, `arcPoint` | `t, fromPt, toPt, at, dur = 1.25, lift = 220, trailUntil?, side = 'amber', shellSize = 15, k = 1` | Đạn cầu vồng pháo / cối / tên lửa bay theo parabol, chạm đích đúng lúc `at + dur` |
| `Shock2D` | `t, at, x, y, r = 130, dur = 0.45, color?, k = 1` | Vòng sóng xung kích lan nhanh tại điểm nổ / xuyên giáp |
| `FocusBox` | `t, x, y, w, h, from, until?, color = M.amber, corner = 22` | Khung ngắm 4 góc vuông (đặt NGOÀI `Cam2D`, toạ độ màn hình 1920×1080) khoanh bộ phận cơ chế |
| `fitBox(box, frac = 0.78)` | `box: { x, y, w, h }` → `{ x, y, zoom }` | Đưa hộp chủ thể vào tâm `Cam2D`, chiếm `frac` khung (giữ chủ thể lớn 65–90% khung) |
| `preview2D(slots, bg?)` | `slots: { label, render, bg? }[]` → `Preview` | Xuất `export const preview = preview2D([...])` cuối `src/parts/<Tên>.tsx` để kiểm 4 ô bằng `check.py <id> --part <Tên>` |

## `map` — nền bản đồ địa lý
| Import | Props chính | Ghi chú |
|---|---|---|
| `GeoBase` | `bounds: [lonMin, latMin, lonMax, latMax], highlight: { VNM: màu }, width?, height?, showGrid?, showContours?` | Vector thế giới. Bề ngang thật ≥ ~400 km. Con là `(proj) => …` |
| `SatBase` | `src, bbox, size` (chép từ `satmap.py`), `width = 1920`, `tone: 'night' \| 'day' \| 'paper'`, `dim?`, `grid?` | Ảnh vệ tinh. Dưới ~400 km. `width` lớn hơn (2880, 3840) khi cần phóng sâu |
| `proj` | `project([lon, lat]) → [x, y]` · `pts(LonLat[]) → Pt[]` · `km(km, [lon, lat]) → px` · `width`, `height` | Dùng chung cho cả hai nền bản đồ |
| `screenOf(cam, pt)` | `cam: { x, y, zoom?, rot?, shake? }` | Điểm thế giới → điểm màn hình `[sx, sy]`, dùng cho cả `SideStage`, `TopStage`, `GeoBase`, `SatBase` |

## `tactics` — ký hiệu tác chiến (SVG thế giới, dùng trong bản đồ hoặc `TopStage`; đều nhận `t, from, until?, side?, k?`)
| Import | Props riêng | Ghi chú |
|---|---|---|
| `Arrow2D` | `pts, dur = 1.6, width = 22, feint?, retreat?, opacity?` | Mũi tiến công thân thuôn mọc dần. `feint` = nét đứt (nghi binh), `retreat` = rỗng |
| `FrontLine` | `pts, to?, shift?, dur, teeth: 'left' \| 'right' \| 'none', width, dashed?` | Mặt trận có răng chĩa về hướng tiến; dịch bằng `to` + `shift={prog(t, a, b)}` |
| `Zone2D` | `pts, to?, shift?, fill = 0.2, hatch = true, id` | Vùng kiểm soát / túi bao vây; mỗi vùng trong một cảnh cần `id` riêng |
| `Route2D` | `pts, dur, width, speed = 26, cut?, cutPos = 0.5` | Tuyến tiếp tế nét đứt trôi; `cut` = giây tuyến bị cắt (dấu X) |
| `RangeRing` | `at, r, fill, sweep?` | Vòng tầm bắn / bán kính radar |
| `UnitMark` | `at, kind: infantry \| armor \| mech \| artillery \| airborne \| recon \| air \| supply \| hq, echelon?, name?, size = 46, hit?` | Ký hiệu đơn vị kiểu tham mưu (cấp chiến dịch). Xuống cấp trận đánh cụ thể thì ưu tiên xe/lính 2D! |
| `MapLabel` | `at, text, kind: 'city' \| 'region' \| 'water' \| 'plain', size?, color?, anchor?, dx?, dy?` | Chữ gắn toạ độ thế giới (tự đảo viền sáng/tối theo màu chữ). Thành phần duy nhất được vẽ `<text>` SVG |
| `Clash2D` | `at, count = 3, every = 0.55, size = 34` | Chớp báo điểm giao tranh trên bản đồ (không thay cho cảnh đánh nhau 2D thật) |
| `sampleCurve(pts, n)`, `cutAt(line, p)` | → `{ pts, tip, angle, length }` | Lấy vị trí + góc tiếp tuyến dọc đường cong (cho xe / đơn vị chạy theo tuyến) |

## `photo` & `person` — ảnh tư liệu & thẻ nhân vật (lớp màn hình 1920×1080, ngoài `Cam2D`)
| Import | Props chính | Ghi chú |
|---|---|---|
| `PhotoCard` | `t, src, x, y, w, h, from, until?, focus = [50, 40], tilt?, grade = 'mono', caption?, credit?, pin?: [x, y], accent?` | Ảnh viền giấy ghim lên bản đồ / sa bàn |
| `PhotoFull` | `t, src, from, until, focus, focusTo?, zoom = [1.04, 1.14], grade, fit: 'cover' \| 'contain', caption?, credit?, dim?` | Ảnh toàn khung đẩy máy chậm |
| `PersonCutout` | `t, from, until?, name, role?, src` (PNG từ `img.py cutout`), `x, h, bottom, aspect, tilt, flip?, tagSide, note?, accent?` | Nhân vật cắt giấy viền trắng dán trên nền cảnh |
| `PersonNews` | `t, from, until?, name, role?, src, x = 110, y = 800, chip?, focus, accent` | Dải tên thời sự góc dưới cho nhân vật phụ |
| `PersonDossier` | `t, from, until?, name, role?, src, fields: [nhãn, nội dung][]` (≤ 5), `fieldAt?, stamp?, focus, tilt` | Hồ sơ gõ máy chữ khớp từng dòng với lời đọc |
| `PersonTitle` | `t, from, until` (bắt buộc), `name, role?, src, side: 'left' \| 'right', years?, kicker?, focus, accent?` | Toàn khung: chân dung nửa màn hình + tên cỡ lớn |

## Quy tắc kỹ thuật
- Mọi thứ tất định theo `t`: không state, không `Math.random` (dùng `rnd(seed)` từ `@core/time`).
- Thành phần thế giới (`SideStage`, `TopStage`, `GeoBase`, `SatBase`, `Soldier2D`, `tactics`, `Blast2D`, `Muzzle2D`, part 2D) đặt TRONG `Cam2D`; `Photo*`, `Person*`, `FocusBox`, `Label`, `Callout` đặt NGOÀI `Cam2D` (1920×1080).
- Không gắn `filter="url(#glow)"` lên nét chéo dài bên trong `Cam2D` đang phóng (Chromium cắt ô filter); vẽ nét kép (halo mờ rộng + lõi sáng) thay thế.
- Khí tài, công sự, vũ khí, mặt cắt vẽ mới theo nội dung thực tế trong `src/parts/<Tên>.tsx`, kèm `export const preview = preview2D([...])`.

## CLI riêng của skill (`skills/military-2d/tools/`)
- `img.py search "<q1>" ["<q2>" …] [-n 12] [--engine bing,commons,openverse] [--site …] [--min 1000] [--stock]` → `library/images/dl/search/<slug>/sheet.jpg` + `INDEX.md`.
- `img.py get <id> <slug>:<số>[,<số>] … | <url ảnh> [--page <url trang>] [--note "…"] [--tags …]` → tải về `assets/images`, ghi `ASSETS.json`.
- `img.py cutout <id> <mã> [<mã> …]` → tách nền nhân vật bằng Vision macOS 14+ ra PNG trong suốt (tag `cutout`).
- `review.py <id> [--strict]` — kiểm lỗi cứng `✗`, cảnh báo `⚠` (bao gồm kiểm tỉ lệ lạm dụng bản đồ) và thông tin bản quyền `i`.
