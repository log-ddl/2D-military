# Catalog `@skill/history_military/index`

Khung 1920×1080, 24 fps. Mọi mốc (`from`, `to`, `at`, `until`) là **giây voice tuyệt đối, số viết thẳng**. Tài sản: `asset('aNNN')` (`@core/asset`) viết ngay trong cảnh.
Thành phần đặt trong `<Shot>` tự lấy khoảng thời gian của shot; `at` mặc định = đầu shot + ~0,4 s.

```tsx
import React from 'react';
import { asset } from '@core/asset';
import { Shot, Clip, QuoteBand, LowerLabel } from '@skill/history_military/index';

const C01S01: React.FC = () => (
  <>
    <Shot from={0} to={6} credit="Tam giác sắt, tháng 1/1966 · Nguồn: Staff Film Report 66-5A (Bộ Quốc phòng Mỹ)">
      <Clip src={asset('a002')} in={4.75} />
      <LowerLabel at={1.0} text="26/1/1967" sub="chiến dịch Cedar Falls khép lại" mono />
    </Shot>
    <Shot from={6} to={13.4} credit="…">
      <Clip src={asset('a004')} in={2.0} />
      <QuoteBand at={7.1} text="“…có thể sẽ không bao giờ hồi phục”" sub="tướng William DePuy, Sư đoàn 1 bộ binh Mỹ" />
    </Shot>
  </>
);
export default C01S01;
```

## Khung
| Thành phần | Dùng cho | Props chính |
|---|---|---|
| `Shot` | một nhịp hình, cắt thẳng | `from`, `to`, `credit` (dòng nguồn), `dark` (nguồn chữ tối trên nền sáng), `bg` |
| `BeatMontage` | cụm cao trào cắt theo nhịp nhạc | `cuts={[t0…tn]}` (từ `plan/beats.json`), `shots={[{ node, credit, dark }]}` (n phần tử), `punch` |

## Phim và ảnh (`footage.tsx`)
| Thành phần | Dùng cho | Props chính |
|---|---|---|
| `Clip` | đoạn phim phủ khung, đã chỉnh màu | `src`, `in` (giây trong file), `at`/`until` (chia shot thành vài đoạn), `zoom=[1.05,1.11]`, `y` (% neo dọc), `grade='archive'\|'color'\|'none'`, `rate` |
| `Photo` | ảnh tĩnh, đẩy chậm | `src`, `focus=[x%,y%]`, `zoom`, `grade='color'`, `vignette`, `blend="multiply"` (ảnh quét trên nền kem) |
| `PushToBlack` | đẩy vào một điểm tới khi tối hẳn | `src`, `focus`, `zoom=[1.15,4.2]` |
| `Vignette` | viền tối rời | `strength` |
| `FilmLook` | hạt phim, xước, nhấp nháy phủ toàn khung; `<Shot>` tự gắn (`film={0}` để tắt, `1.3` cho nặng hơn) | `amount` |
| `drift(t, a, b, seed)` | tiến độ + trôi + thở kiểu máy cầm tay, cho thành phần tự viết trong lib | → `{ p, x, y, breathe }` |

`grade="archive"` cho mọi phim đen trắng / màu cũ (đồng bộ cả phim); `"color"` cho ảnh màu chất lượng tốt; ảnh hiện đại (di tích ngày nay) dùng `"color"` + `vignette={0.6}`.

## Chữ (`text.tsx`)
| Thành phần | Dùng cho | Props chính |
|---|---|---|
| `QuoteBand` | trích dẫn ngắn đè lên footage | `text`, `sub` (nguồn + nguyên văn), `at`, `until`, `y=500`, `size=62` (giảm còn 54 nếu > 45 ký tự) |
| `LowerLabel` | tên người / đơn vị; `mono` cho số, ngày | `text`, `sub`, `mono`, `at`, `until` |
| `ChapterMark` | nhãn chương góc trên trái | `index="CHƯƠNG I"`, `title`, `hold` |
| `TitleCard` | thẻ tên phim (nội dung của một `Shot` 5–6 s) | `title`, `sub` |
| `Interstitial` | một dòng chữ mono nền tối, 2–4 s | `text` |
| `QuoteCard` | trích dẫn dài, gõ máy chữ | `head`, `source`, `lines` (ngắt sẵn ≤ 28 ký tự), `original`, `typeFrom`, `typeTo` |
| `Credit` | dòng nguồn đặt tay (trong `SplitPanel`) | `text`, `dark`, `left`/`right` |

## Thẻ giấy kaki (`card.tsx`)
```tsx
<Shot from={21.33} to={29.17}>
  <Paper bg={asset('a020')}>
    <CardHeader chip="CEDAR FALLS" date="8–26/1/1967" title="Họ đã tung vào" />
    <StatColumns stats={[{ at: 21.75, n: '~20', label: 'tiểu đoàn' }, { at: 24.3, n: '96', label: 'phi vụ B-52', hi: true }]} />
    <CardFooter brand="TÊN KÊNH" left="Ảnh nền: …" source="Nguồn: B. W. Rogers (Lục quân Mỹ, 1974)" />
  </Paper>
</Shot>
```
| Thành phần | Dùng cho | Props chính |
|---|---|---|
| `Paper` | nền giấy | `bg` (ảnh nền mờ) |
| `CardHeader` / `CardFooter` | đầu / chân thẻ | `chip`, `date`, `title` · `source` (bắt buộc), `left`, `brand` |
| `StatColumns` | 2–4 con số | `stats=[{ at, n, label, hi }]` |
| `BarChart` | so sánh vài đại lượng | `bars=[{ at, label, value, text, hi }]`, `max` |
| `Donut` | cơ cấu một tổng | `total`, `unit`, `slices=[{ at, label, value, sub, tone }]` |
| `TimelineCard` | mốc thời gian | `marks=[{ at, pos (0..1), year, label, hi, photo }]` |
| `SplitPanel` + `PanelHead` + `DimensionBox` | ảnh bên trái, bảng bên phải (kích thước, so sánh) | `left={…}`, `split=1100` · `kicker`, `title` · `w`, `h`, `wAt`, `hAt`, `ratio` (rộng / cao thật), `hi` |

Trong `SplitPanel`, toạ độ con tính theo bảng phải (rộng `1920 - split`). Thẻ không có `Shot credit`: nguồn nằm ở `CardFooter` / `Credit`.

## Trang tài liệu (`doc.tsx`)
`pdf.py quote` in sẵn `<DocPage src width lines>`; thêm `at` cho từng dòng theo mốc lời đọc, `quote` (bản dịch của CHÍNH đoạn được tô), `original` (nguyên văn rút gọn).
Trang nằm trên mặt bàn tối, máy đẩy `push=1.1` giây từ toàn trang vào đoạn văn rồi mới tô; chữ gốc tự phóng cho đọc được; băng dịch nằm dưới đoạn trích.
Đoạn tô ≤ 4 dòng, shot ≥ 6 s. `<Shot … credit="tên sách (tác giả, năm), tr. N">` (nền bàn tối nên không cần `dark`). Không tự ước lượng toạ độ dòng.

## Bản đồ (`map.tsx`)
| Thành phần | Dùng cho | Props chính |
|---|---|---|
| `SatMap` | vị trí, hướng, khoảng cách trên ảnh vệ tinh | `src`, `bbox`, `size` (satmap.py in sẵn), `view=[{ center: [lon,lat], scale }, {…}]`, `pins=[{ at, pos, text, sub, side, minor }]`, `routes=[{ at, dur, pts, label }]`, `zones=[{ at, pts, label, sub }]`, `title`, `sub` |
| `ArchiveMap` | bản đồ / bản vẽ gốc từ sách | `src`, `focus=[x%,y%]`, `zoom`, `tilt=-10`, `title`, `sub` |
| `MapChip` | chip tên bản đồ rời | `title`, `sub` |

Nhãn tự né nhau, có thẻ nền và nét dẫn; `minor: true` cho chú thích phụ (tối đa 2 nhãn chính + 3 phụ mỗi bản đồ); lưới toạ độ bật sẵn (`grid={false}` để tắt).
`scale` 1 = ảnh rộng bằng khung; đừng vượt quá `size[0] / 1920 × 1,2` (vỡ hình). Kiểm bằng `check.py` rằng mọi nhãn nằm trong khung ở cả đầu và cuối shot.

## Màu, chữ (`theme.ts`)
`C` (paper, ink, yellow, red, white, cream), `TITLE` (hẹp) / `STENCIL` (khuôn tô, nhãn ngắn chữ hoa) / `SANS` / `MONO` (máy chữ), `ease(t, a, d)`, `inOut(t, at, until)`. Cảnh không tự đặt màu hay font.

## Giới hạn hiện tại (ghi để nâng cấp)
- Chưa có font máy chữ cơ thật (Special Elite, Courier Prime trong gói không có dấu tiếng Việt); đang dùng IBM Plex Mono. Muốn dùng font riêng: nạp file font trong `theme.ts`.
- Chưa có quang sai màu (chromatic aberration) và lem mực trên chữ; `FilmLook` mới có hạt, xước, nhấp nháy.
- `QuoteBand` chỉ dành cho trích dẫn thật có nguồn (pace.py cảnh báo khi dùng làm phụ đề).
- `SatMap` chưa có lớp sông / đường từ OpenStreetMap; tuyến phải ghi toạ độ tay.
- Chưa có thành phần "ảnh trong khung tròn gắn trên bản đồ", "bộ đếm số chạy", "so sánh hai ảnh trước / sau".
