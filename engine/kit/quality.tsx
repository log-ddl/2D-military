// Tuỳ chọn xem / xuất, chọn trong bảng Props của Studio:
// - quality 1/4 · 1/2 · Full (xuất video và sheet luôn Full)
// - music, sfx: bật/tắt nhạc nền và tiếng động (render.py --no-music / --no-sfx).
// Dùng các ô này thay cho nút loa trên timeline: nút loa của Studio ghi `hidden` thẳng vào code kit dùng chung.
// Cảnh không cần đọc — Stage và các hiệu ứng nặng trong lib tự giảm tải theo useQuality().
import { createContext, useContext } from 'react';
import { z } from 'zod';

export const QUALITY = ['1/4', '1/2', 'Full'] as const;
export const qualitySchema = z.object({ quality: z.enum(QUALITY), music: z.boolean(), sfx: z.boolean() });
export type QualityName = (typeof QUALITY)[number];

/** Hệ số độ phân giải: 0.25 | 0.5 | 1. */
export const qualityScale = (q: QualityName) => (q === '1/4' ? 0.25 : q === '1/2' ? 0.5 : 1);

const Ctx = createContext(1);
export const QualityProvider = Ctx.Provider;
/** 0.25 | 0.5 | 1 — dùng trong lib để giảm bóng, hậu kỳ, hạt… khi preview. */
export const useQuality = () => useContext(Ctx);
