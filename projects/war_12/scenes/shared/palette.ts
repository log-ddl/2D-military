// Bảng màu chung cho mọi asset và mọi project (nguồn duy nhất của mã màu).
// Project dùng bản chép ở scenes/shared/palette.ts; ý nghĩa từng màu: guide/1-visual.md.
export const P = {
  bg: '#f4f8fb',      // nền sáng
  bg2: '#e8eff4',     // nền phụ, mặt đất nhạt
  paper: '#f8fafc',   // trắng ngà
  white: '#ffffff',
  ink: '#1e293b',     // viền chính
  ink2: '#475569',    // nét phụ
  olive: '#7d8b5a',   // thân chính
  oliveDark: '#56633d',
  oliveLight: '#a9b47f', // tháp pháo, nắp, phần trên của thân olive
  slate: '#64748b',
  dark: '#334155',
  light: '#cbd5e1',
  skin: '#f1d3b0',
  enemy: '#b4493c',   // đỏ gạch: đối phương, nguy hiểm
  enemyLight: '#d58f7c', // phần trên của thân phe đối phương
  glass: '#d6e6ee',   // kính, cửa sổ
  sand: '#cdbd8c',    // bạt, thùng hàng
  amber: '#f59e0b',   // nhấn
  sky: '#38bdf8',     // nhấn
} as const;

// Độ dày nét chuẩn trên khung 1920×1080 ở z = 1.
export const LINE = { outer: 4, inner: 2.25 } as const;
