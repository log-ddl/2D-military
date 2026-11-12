// Bảng màu và chữ của phong cách phim tư liệu lịch sử quân sự. Mọi cảnh lấy màu / chữ ở đây, không ghi cứng trong cảnh.
import { loadFont as loadTitle } from '@remotion/google-fonts/SairaExtraCondensed';
import { loadFont as loadStencil } from '@remotion/google-fonts/SairaStencil';
import { loadFont as loadSans } from '@remotion/google-fonts/BeVietnamPro';
import { loadFont as loadMono } from '@remotion/google-fonts/IBMPlexMono';
import { prog } from '@core/time';

const SUB = { subsets: ['latin', 'vietnamese'] as ('latin' | 'vietnamese')[] };
/** Chữ hoa hẹp: tiêu đề thẻ, tên người, con số lớn. */
export const TITLE = loadTitle('normal', { weights: ['600', '700'], ...SUB }).fontFamily;
/** Chữ khuôn tô (stencil) kiểu sơn trên thùng đạn: chip đầu thẻ, nhãn chương, chip bản đồ. Chỉ dùng cho nhãn ngắn chữ hoa. */
export const STENCIL = loadStencil('normal', { weights: ['500', '600'], ...SUB }).fontFamily;
/** Sans: trích dẫn, chú thích, dòng nguồn. */
export const SANS = loadSans('normal', { weights: ['400', '500', '600'], ...SUB }).fontFamily;
/** Mono kiểu máy chữ văn phòng (IBM Plex Mono, có dấu tiếng Việt): số liệu nhỏ, ngày tháng, nguyên văn tiếng Anh, thẻ gõ máy chữ. */
export const MONO = loadMono('normal', { weights: ['400', '600'], ...SUB }).fontFamily;

/** Bảng màu hẹp: giấy kaki, mực, trắng ngà, MỘT vàng nhấn, MỘT đỏ cam. Không thêm màu nhấn thứ ba. */
export const C = {
  paper: '#cdbf88',
  ink: '#1b1913',
  inkSoft: 'rgba(27,25,19,0.62)',
  yellow: '#f6c21a',
  red: '#d8452b',
  white: '#f3f1ea',
  cream: '#ece4cc',
  black: '#0a0b0b',
};

/** 0→1 trong d giây kể từ a (giây voice tuyệt đối), có easing. */
export const ease = (t: number, a: number, d = 0.45) => prog(t, a, a + d);
/** Hiện ở `at`, tắt trước `until`: 0..1. */
export const inOut = (t: number, at: number, until = 1e9, i = 0.4, o = 0.3) => ease(t, at, i) * (1 - ease(t, until - o, o));
