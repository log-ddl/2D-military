# Đồ nghề `@skill/story_2d` (`CATALOG.md`)

Thư viện `@skill/story_2d` chỉ cung cấp **khung xương kỹ thuật 2.5D** (ống kính máy quay, ánh sáng, font chữ) và một số công cụ chuyên biệt (`Actor2D`, `StoryMap2D`, `InWorldDoc`, `BlackPunchCard`…) để **chỉ lấy ra dùng đúng lúc kịch bản thật sự cần**.
Bối cảnh, bảng màu khí quyển (`src/design/palette.ts`) và các đạo cụ / ẩn dụ vật lý (`src/parts/*.tsx`) phải được thiết kế mới theo đúng nội dung của từng bộ phim.

Kết hợp với các hàm thời gian từ `@core/time` (`useT`, `prog`, `lerp`, `useSpring`, `rnd`, `mix` — lưu ý `const t = useT()` trả về **giây toàn phim**, khớp trực tiếp với các mốc trong `CUE`) và `Easing` từ `'remotion'`.

---

## 1. Font chữ, Độ dày nét & Màu tiện ích (`@skill/story_2d/theme`)

```tsx
import { BRUSH_FONT, MONO_FONT, STROKE, S, mix } from '@skill/story_2d/theme';
```

- **`BRUSH_FONT`**: Font viết tay bút dạ `Shantell Sans` (`normal` + `italic`, hỗ trợ đầy đủ dấu tiếng Việt & tiếng Anh).
- **`MONO_FONT`**: `JetBrains Mono` cho con số kỹ thuật, toạ độ, mã định danh, đồng hồ điện tử.
- **`STROKE`**: `{ outer: 4.5, limb: 7.5, inner: 2.5, thin: 1.6, panel: 8 }` — chuẩn độ dày viền mực `#08080A` trên không gian `1920×1080`.
- **`S`**: Hằng màu tiện ích cơ bản:
  - Mực & nền cơ bản: `S.ink` (`#08080A`), `S.inkSoft`, `S.black` (`#000000` cho `BlackPunchCard`), `S.white`, `S.offWhite`, `S.hudBg`.
  - Tông da nhân vật: `S.skin1` .. `S.skin6`, `S.silhouette`.
  - Sắc nhấn & vật liệu cơ bản: `S.green`, `S.greenDark`, `S.greenGlow`, `S.greenSoft`, `S.red`, `S.redDark`, `S.redSoft`, `S.gold`, `S.goldDark`, `S.amber`, `S.blue`, `S.blueDark`, `S.sky`, `S.purple`, `S.paper`, `S.paperDark`, `S.cork`, `S.wood`, `S.woodDark`, `S.steel`, `S.steelLight`, `S.steelDark`.
  - **Quan trọng:** Mỗi dự án tự tạo `src/design/palette.ts` chứa bảng màu nền, tường, ánh sáng riêng cho thế giới của kịch bản đó thay vì dùng màu rập khuôn.

---

## 2. Máy quay 2.5D, Ánh sáng & Chia khung trống (`@skill/story_2d/stage`)

```tsx
import {
  StoryCam, whipCam, fitBox, screenOf, StoryDefs, Vignette,
  LightCone, NeonGlow, SplitStage, previewStory,
} from '@skill/story_2d/stage';
```

### 2.1. `<StoryCam>` + `whipCam(t, stops, driftSeed)` — Máy quay 3 lớp chiều sâu + Whip-Pan + Rack Focus
```tsx
const t = useT(); // giây toàn phim
const cam = whipCam(t, [
  { x: 640, y: 560, zoom: 1.25 },
  { at: CUE.s01_turn, dur: 0.28, x: 1320, y: 560, zoom: 1.25 }, // lia nhanh tự bật directional motion blur
  { at: CUE.s01_wide, dur: 1.6, x: 960, y: 540, zoom: 0.95 },   // lùi máy mượt
], 7);

return (
  <StoryCam
    {...cam}
    bgTop={PAL.bgTop}
    bgBot={PAL.bgBot}
    bg={<CustomBackgroundSVG />}
    bgBlur={lerp(4, 0, prog(t, CUE.s01_focus, CUE.s01_focus + 0.6))}
    fg={<CustomForegroundSVG />}
    fgBlur={3}
    vignette={0.45}
  >
    <svg width={2400} height={1400} viewBox="-240 -160 2400 1400" style={{ overflow: 'visible' }}>
      <StoryDefs />
      {/* Trung cảnh tự thiết kế theo bối cảnh kịch bản */}
    </svg>
  </StoryCam>
);
```
- `StoryCam` nhận `bgColor` (CSS bất kỳ) hoặc cặp `bgTop` / `bgBot`, cùng `bgBlur`, `midBlur`, `fgBlur` và `vignette` (`0..1`).
- `fitBox({ x, y, w, h }, frac = 0.78)` → `{ x, y, zoom }` căn vừa khít vùng hành động vào khung `1920×1080`.
- `screenOf(cam, [wx, wy])` → `[sx, sy]` đổi toạ độ thế giới sang toạ độ màn hình `1920×1080`.

### 2.2. Nguồn sáng an toàn trên Chromium (`<LightCone>` & `<NeonGlow>`)
- **`<LightCone x y toX? toY? topWidth? botWidth? color? opacity?>`**: Chùm sáng chiếu có hướng trong SVG.
- **`<NeonGlow x y r? rx? ry? color? opacity? pulse={t}>`**: Quầng phát sáng mềm bằng `radialGradient` (không bị lỗi cắt hộp filter khi zoom cận).

### 2.3. `<SplitStage>` — Khung chia ô trống (chỉ dùng khi cần đặt song song nhiều vế hoặc đối lập 2 tầng)
```tsx
<SplitStage
  t={t}
  direction="horizontal" // 'horizontal' (chia cột trái-phải) hoặc 'vertical' (chia tầng trên-dưới)
  panels={[
    { bgTop: PAL.leftTop, bgBot: PAL.leftBot, weight: 1, render: (w, h) => <LeftScene w={w} h={h} t={t} /> },
    { from: CUE.s02_second, slideFrom: 'right', bgTop: PAL.rightTop, bgBot: PAL.rightBot, weight: 1, render: (w, h) => <RightScene w={w} h={h} t={t} /> },
  ]}
  overlay={<OptionalBridgeAcrossDivider />}
/>
```
- Khi ô thứ 2 trượt vào trễ hơn (`from`), truyền `weight` động theo `t` để ô 1 chiếm trọn khung trước rồi nhường chỗ mượt mà (tránh để mảng đen chờ ô 2).

### 2.4. `previewStory([...])` — Xuất preview kiểm tra cho `src/parts/<Tên>.tsx`
```tsx
export const preview = previewStory([
  { label: '1. Trạng thái đóng', bgTop: '#0F172A', bgBot: '#1E293B', render: () => <CustomProp x={960} y={540} open={0} /> },
  { label: '2. Trạng thái mở', bgTop: '#0F172A', bgBot: '#1E293B', render: () => <CustomProp x={960} y={540} open={1} /> },
]);
```

---

## 3. Khung Giải phẫu Nhân vật 2.5D, Bàn tay & Nhân hoá (`@skill/story_2d/actor`)
*(Thư viện chỉ cung cấp **phôi định hình cơ bản**, không gắn sẵn nhân vật cụ thể hay tủ quần áo mẫu. Mặt/tóc nhận diện khoá trong `src/design/cast.tsx`; trang phục tự thiết kế sáng tạo theo bối cảnh từng cảnh)*

```tsx
import { Actor2D, actorSockets, TopDownHand, AliveProp, CrowdStrip, type Actor2DProps } from '@skill/story_2d/actor';
```

- **`<Actor2D>` + `actorSockets(props)`**:
  - Vị trí & động học: `x`, `y` (bàn chân đứng hoặc tâm hông nếu `seated`/`bust`), `s` (`s = 1` cao `~298px`), `flip` (`1` | `-1`), `lean` (nghiêng thân quanh hông), `walk` (chu kỳ bước chân, vd `t * 7`), `seated`, `bust`, `opacity`.
  - **Phôi đầu, mặt & tóc cơ bản** (dùng cho `src/design/cast.tsx` để định hình nhận diện):
    - `headShape`: `'round'` (elip tối giản) | `'oval'` (thuôn có cằm) | `'square'` (hàm vuông góc cạnh) | `'jowls'` (má dưới đầy, hàm dày) | `'wide'` (mặt bầu rộng) | `'narrow'` (trán rộng thu nhỏ xuống cằm).
    - `build`: `'slim'` | `'regular'` | `'broad'` (vai rộng) | `'heavy'` (thân to đậm); `skin`, `ears` (`boolean`, tự bật khi `headShape !== 'round'`).
    - Ngũ quan cơ bản: `eyeStyle` (`'dot'` | `'almond'` | `'squint'` | `'hooded'`), `eyeSpacing` (mặc định `20`), `eyeBags`, `browStyle` (`'arch'` | `'bushy'` | `'flat'` | `'thin'`), `browColor`, `nose` (`'none'` | `'button'` | `'straight'` | `'bulbous'` | `'pointed'` | `'hooked'`), `mouthStyle` (`'default'` | `'pursed'` | `'smirk'` | `'stern'` | `'warm'` | `'grin'`), `facialHair` (`'none'` | `'stubble'` | `'mustache'` | `'goatee'` | `'beard'` | `'full-beard'`), `facialHairColor`, `nasolabial`, `foreheadLines`, `doubleChin`.
    - Phôi tóc & kính cơ bản: `hair` (`'none'` | `'short'` | `'parted'` | `'tousled'` | `'slick'` | `'curly'` | `'receding'` | `'balding'` | `'bob'` | `'long'` | `'ponytail'` | `'bun'` | `'spiky'`), `hairColor`, `glasses` (`'none'` | `'rect'` | `'round'` | `'sunglasses'`).
  - **Phôi thân, tay & chân cơ bản** (phối lại linh hoạt theo bối cảnh của từng cảnh):
    - `torso` (đường cắt hõm cổ/vai cơ bản): `'plain'` (thân trơn nguyên khối) | `'crew'` (cổ tròn lộ da, mặc định) | `'vneck'` (cổ chữ V) | `'tank'` (khoét cổ U + lộ hai bả vai trần) | `'open'` (khoác mở hai bên lộ lớp lót `accentColor` ở giữa) | `'silhouette'`.
    - `bodyColor`, `accentColor`, `sleeves` (`'long'` | `'short'` tay cộc lộ cẳng tay da | `'sleeveless'` tay trần hoàn toàn | `'stick'`), `sleeveColor`.
    - `bottom` (`'pants'` quần dài | `'shorts'` quần đùi lộ bắp chân da | `'skirt'` chân váy | `'stick'`), `pantsColor`, `shoes` (`'dress'` | `'sneakers'` | `'sandals'` | `'bare'`), `shoesColor`.
  - **5 Khe lắp ghép SVG tự do đúng lớp Z-order** (để vẽ tóc/nét mặt đặc trưng và tự sáng tạo trang phục riêng cho từng cảnh):
    - `faceSlot`: gốc `(0, 0)` tại tâm mặt (trên da mặt, dưới kính & tóc — vẽ quầng mắt, vết sẹo, râu/nếp mặt riêng).
    - `hairSlot`: gốc `(0, 0)` tại tâm đầu (vẽ mái tóc độc bản hoặc mũ/nón bất kỳ của nhân vật).
    - `bodyClipSlot`: gốc `(0, 0)` tại đỉnh thân `(x, bodyTop)`, **tự động cắt khít trong đường cong ngực/eo (`bodyClip`) và nằm dưới viền mực ngoài `STROKE.outer`**. Vùng lộ dưới cằm: `x: -55..55` (`broad`/`heavy`: `-70..70`), `y = 32` (ngay sát cằm) → `y = 128` (gấu áo tại hông). Dùng để vẽ nhanh cổ áo, ve áo, cà vạt, khoá kéo, dây rút, túi áo, thắt lưng, phù hiệu, hoạ tiết riêng theo từng cảnh mà không bao giờ lem ra ngoài thân.
    - `bodySlot`: gốc `(0, 0)` tại đỉnh thân, **không cắt clip** (vẽ chi tiết tràn khỏi thân: áo choàng, khăn quàng bay, dây đeo…).
    - `accessory`: gốc `(0, 0)` tại tâm đầu, lớp trên cùng.
  - Biểu cảm, Tay & Ánh sáng: `mood` (`'neutral'` | `'happy'` | `'laugh'` | `'smug'` | `'worried'` | `'shocked'` | `'angry'` | `'deadpan'` | `'suspicious'` | `'sleepy'` | `'sleep'` | `'wink'` | `'sad'` | `'silhouette'`), `look={[lx, ly]}`, `talk` (`boolean`, `0..1`, hoặc `[[from, to]]`), `sweat`, `zzz`, `blush`, `leftArm` / `rightArm` (`'rest'` | `'hip'` | `'wave'` | `'point-side'` | `'point-up'` | `'hold-front'` | `'overhead'` | `'chin'`), **`leftHandTo={[wx, wy]}` / `rightHandTo={[wx, wy]}`**, `lightSide` (`'left'` | `'right'` | `'top'` | `'none'`), `rimColor`, `rimStrength`.
  - `actorSockets(props)` trả về `{ head, top, mouth, chest, leftHand, rightHand, box }` trong không gian thế giới.
- **`<TopDownHand fromPt={[x0, y0]} toPt={[x1, y1]} sleeveColor? skin? gloved? width? />`**: Cánh tay vươn từ mép khung cho các góc cận mặt bàn / thao tác tay.
- **`<AliveProp x y faceOffset? faceScale? mood? look? sweat? zzz? run? t?>...</AliveProp>`**: Gắn mắt/miệng/chân hoạt hình khi kịch bản cần nhân hoá một vật thể tự vẽ.
- **`<CrowdStrip x y width count? scale? seed? silhouette? />`**: Dải đám đông nền hoặc tiền cảnh khi cần không gian đông người.

---

## 4. Chữ, Thẻ nhấn & Tài liệu hoạt hình (`@skill/story_2d/cards`)
*(Áp dụng nghiêm ngặt Phép thử Xoá Chữ: chỉ gọi khi mang dữ kiện thật sự cần thiết)*

```tsx
import {
  StoryText, BlackPunchCard, HudPill, RollingNumber,
  RelationLink, SpeechBubble, InWorldDoc,
} from '@skill/story_2d/cards';
```

- **`<StoryText x={0} y={0} text="$4.2B" size={34} color={S.white} strokeWidth={7} mono={false} />`**: Thẻ chữ SVG chuẩn viền mực (bắt buộc dùng thay cho `<text>` thô khi cần gắn số liệu/ký hiệu lên đạo cụ).
- **`<BlackPunchCard t={t} from={CUE.twist_0} until={CUE.twist_end} words={[{ w: 'It', at: CUE.w1 }, { w: 'never', at: CUE.w2, color: S.red }, { w: 'existed.', at: CUE.w3, color: S.red }]} />`**: Thẻ nền `#000000` hiện từng từ khớp `at` (hoặc `title="..."` cho thẻ ngắt chương im lặng). Chỉ dùng khi kịch bản thực sự có điểm chốt đắt giá hoặc ngắt hồi — không ép theo chu kỳ giây.
- **`<HudPill t={t} from={0.4} until={3.6} text="MARCUS VANCE" sub="CEO · HELION" accent={S.sky} align="left" />`**: Thẻ giới thiệu nhân vật / địa điểm (chỉ bật đúng 1 lần đầu tiên khi thực sự cần định danh tên riêng/chức vụ).
- **`<RollingNumber t={t} from={CUE.n0} to={CUE.n1} until={CUE.n_end} startVal={0} endVal={4.2} decimals={1} prefix="$" suffix="B" locale="en-US" x={960} y={200} color={S.gold} />`**: Con số cuộn động khi lời đọc nhấn mạnh sự nhảy vọt/sụt giảm số liệu (`locale="vi-VN"` cho định dạng số tiếng Việt).
- **`<RelationLink t={t} from={CUE.link} until={CUE.link_end} a={[620, 420]} b={[1300, 420]} label? crossAt={CUE.deny} />`**: Đường chấm nối quan hệ giữa 2 chủ thể + tuỳ chọn đóng dấu `[X]` phủ định tại `crossAt`.
- **`<SpeechBubble t={t} from={CUE.b0} until={CUE.b1} x={780} y={240} tailTo={[720, 360]} text="..." />`**: Bong bóng thoại ngắn (`1–4 từ`) **chỉ** dùng cho diễn xuất phụ không lời khi 1 giọng Narrator đang đọc dẫn (cấm dùng nhại lại câu thoại đã có tiếng trong `voice`).
- **`<InWorldDoc t={t} kind="statement" | "newspaper" | "tweet" | "whiteboard" | "clipboard" x={960} y={540} header="..." subHeader? lines={[{ text: '...', highlightAt: CUE.h1, strikeAt: CUE.s1, replaceWith: '...' }]} />`**: Tài liệu vẽ trong thế giới hoạt hình — **chỉ** dùng khi câu chuyện thực sự xoay quanh văn bản/bằng chứng đó.

---

## 5. Bản đồ Địa lý Phẳng (`@skill/story_2d/map`)
*(Chỉ dùng khi câu chuyện thực sự nhắc đến vị trí quốc gia, thành phố hoặc tuyến đường địa lý)*

```tsx
import { StoryMap2D, MapPin2D, MapFlightArc, MapPillar2D } from '@skill/story_2d/map';

<StoryMap2D bounds={{ west: 95, south: -8, east: 132, north: 28 }} tone="noir" highlight={{ SGP: S.gold }}>
  {(proj) => {
    const sg = proj.pt([103.82, 1.35]);
    const hk = proj.pt([114.17, 22.32]);
    return (
      <>
        <MapFlightArc t={t} from={CUE.arc} dur={1.1} a={hk} b={sg} color={S.red} />
        <MapPin2D t={t} from={CUE.pin1} at={hk} label="HONG KONG" color={S.red} />
        <MapPin2D t={t} from={CUE.pin2} at={sg} label="SINGAPORE" color={S.gold} />
        <MapPillar2D t={t} from={CUE.pil} at={sg} height={160} color={S.green} />
      </>
    );
  }}
</StoryMap2D>
```
