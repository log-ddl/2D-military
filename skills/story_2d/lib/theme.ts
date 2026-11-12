// Hệ font chữ (hỗ trợ đầy đủ tiếng Việt & tiếng Anh), độ dày nét cọ chuẩn và bảng hằng màu cơ bản cho skill story_2d.
// Lưu ý: Mỗi dự án tự định nghĩa bảng màu bầu khí quyển riêng phù hợp kịch bản trong `src/design/palette.ts`.
import { loadFont as loadBrush } from '@remotion/google-fonts/ShantellSans';
import { loadFont as loadMono } from '@remotion/google-fonts/JetBrainsMono';
import { mix } from '@core/time';

const brushNormal = loadBrush('normal', {
  weights: ['500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
});
const brushItalic = loadBrush('italic', {
  weights: ['500', '600', '700', '800'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
});
const monoLoader = loadMono('normal', {
  weights: ['500', '700'],
  subsets: ['latin', 'latin-ext', 'vietnamese'],
});

/** Font viết tay / bút dạ chủ đạo cho thẻ chữ, nhãn cần thiết, tài liệu hoạt hình và HUD. */
export const BRUSH_FONT = brushNormal.fontFamily;
/** Font chữ số cố định độ rộng cho con số kỹ thuật, toạ độ, bảng điện tử, biên lai. */
export const MONO_FONT = monoLoader.fontFamily;
void brushItalic;

/** Độ dày nét cọ chuẩn trên không gian thế giới 1920×1080 (tự phóng tự nhiên khi StoryCam zoom cận cảnh). */
export const STROKE = {
  outer: 4.5,   // đường bao chính của nhân vật, đạo cụ, kiến trúc
  limb: 7.5,    // tay chân nhân vật uốn cong đầu tròn
  inner: 2.5,   // nếp áo, gọng kính, chi tiết bên trong
  thin: 1.6,    // nét khắc mảnh, vạch chia nhỏ
  panel: 8,     // vách chia khung SplitStage
} as const;

/** Bảng màu tiện ích cơ bản (mực, da nhân vật, sắc nhấn ngữ nghĩa); màu bối cảnh từng phim đặt tại `src/design/palette.ts`. */
export const S = {
  black: '#000000',       // nền tuyệt đối của BlackPunchCard
  ink: '#08080A',         // viền mực hoạt hình đồng nhất
  inkSoft: '#1E242B',     // nét phụ / bóng cứng
  white: '#FFFFFF',
  offWhite: '#F8FAFC',

  // Tông da nhân vật cơ bản
  skin1: '#F5CBA7',
  skin2: '#E5B087',
  skin3: '#D89868',
  skin4: '#B87A52',
  skin5: '#8C5638',
  skin6: '#F9DEC9',
  silhouette: '#0D1117',

  // Sắc nhấn cơ bản
  green: '#65E827',
  greenDark: '#2A7B12',
  greenGlow: '#76FF03',
  greenSoft: '#BBF7D0',

  red: '#EF4444',
  redDark: '#991B1B',
  redSoft: '#FCA5A5',

  gold: '#FACC15',
  goldDark: '#CA8A04',
  amber: '#F59E0B',

  blue: '#3B82F6',
  blueDark: '#1D4ED8',
  sky: '#38BDF8',
  purple: '#8B5CF6',

  // Chất liệu trung tính hay gặp
  paper: '#F6EEDB',
  paperDark: '#E2D4B7',
  cork: '#9E7246',
  wood: '#6B4226',
  woodDark: '#432816',
  steel: '#64748B',
  steelLight: '#CBD5E1',
  steelDark: '#334155',
  hudBg: 'rgba(14, 17, 23, 0.90)',
} as const;

export { mix };
