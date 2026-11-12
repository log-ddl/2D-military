// Bảng màu mặc định của skill military-2d:
// - `M`: bảng màu tối cho bản đồ tác chiến + khung ảnh tư liệu.
// - `P` & `LINE`: bảng màu sáng / trung tính 2–3 tông khối + chuẩn độ dày nét cho cảnh vẽ 2D chiến thuật, hành động và mặt cắt cơ chế.
// Mỗi video có thể tuỳ biến lại trong `src/design/`, giữ nhất quán màu phe xuyên suốt phim.
export { FONT } from '@skill/military/theme';

export const M = {
  // nền bản đồ
  sea: '#0b1826',
  land: '#16293d',
  landHi: '#22405e',
  coast: '#36587a',
  grid: '#284766',
  // chữ
  ink: '#f4f7fb',
  dim: '#8ea3b8',
  // phe: xanh = ta / đồng minh, đỏ = đối phương, vàng = trung lập / điểm nhấn
  blue: '#4aa3ff',
  red: '#ff5046',
  amber: '#f2c14e',
  // khung ảnh tư liệu
  paper: '#f1ead9',
  paperInk: '#1c232d',
} as const;

/** Bảng màu tạo hình 2D (khí tài, người lính, công sự, mặt cắt cơ chế, sa bàn cục bộ) — đổ khối 2–3 tông + viền `ink` rõ nét. */
export const P = {
  bg: '#f4f8fb',         // nền sáng chính
  bg2: '#e8eff4',        // nền phụ, mặt đất xa
  paper: '#f8fafc',      // trắng ngà / nền mặt cắt kỹ thuật
  white: '#ffffff',
  ink: '#1e293b',        // viền chính (outer)
  ink2: '#475569',       // nét phụ bên trong (inner)
  olive: '#7d8b5a',      // thân khí tài / quân phục olive
  oliveDark: '#56633d',  // mảng tối / bóng gầm
  oliveLight: '#a9b47f', // tháp pháo, nắp trên, mảng đón sáng
  ally: '#3b7dd8',       // phe xanh trên nền sáng
  allyDark: '#275699',
  allyLight: '#76a9f0',
  enemy: '#b4493c',      // đỏ gạch: phe đối phương / mục tiêu nguy hiểm
  enemyDark: '#7f2f26',
  enemyLight: '#d58f7c', // mảng sáng thân đối phương
  slate: '#64748b',      // thép / nòng súng / cơ khí
  dark: '#334155',       // thép tối / bánh xích / khoang cắt
  light: '#cbd5e1',      // kim loại sáng / vỏ mờ
  skin: '#f1d3b0',       // da người lính
  glass: '#d6e6ee',      // kính buồng lái, cửa sổ
  sand: '#cdbd8c',       // bao cát, bạt, thùng đạn, đất hào
  earth: '#9a886c',      // mặt đất / vách chiến hào cắt dọc
  grass: '#8da16f',      // dải đồi gần
  forest: '#6b8255',     // tán rừng chiến thuật
  water: '#9ec5dd',      // sông / bờ nước cục bộ
  amber: '#f59e0b',      // nhấn tín hiệu / luồng năng lượng
  sky: '#38bdf8',        // nhấn phụ / tia dẫn đường
} as const;

/** Độ dày nét chuẩn trên khung 1920×1080 ở `zoom = 1` (nhân với `k = 1 / zoom` khi đặt trong `Cam2D`). */
export const LINE = {
  outer: 4,
  inner: 2.25,
} as const;

export type Side = 'blue' | 'red' | 'amber';
export const sideColor = (s: Side | string) => (s === 'blue' ? M.blue : s === 'red' ? M.red : s === 'amber' ? M.amber : s);
