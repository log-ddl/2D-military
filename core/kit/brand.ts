// Cấu hình & đường dẫn Logo Kênh dùng chung toàn hệ thống (đồng bộ tự động từ library/brand/ vào .build/public/brand/).
import { staticFile } from 'remotion';

export type BrandSpec = {
  file: string;
  whiteFile: string;
  blackFile: string;
  name: string;
  darkTint: string;
  lightTint: string;
  stencilOpacity: number;
  wallOpacity: number;
  isPlaceholder?: boolean;
};

const DEFAULT_BRAND: BrandSpec = {
  file: 'brand/logo_white.svg',
  whiteFile: 'brand/logo_white.svg',
  blackFile: 'brand/logo_black.svg',
  name: 'MILITARY STUDIO',
  darkTint: '#14181f',
  lightTint: '#e8eef5',
  stencilOpacity: 0.46,
  wallOpacity: 0.92,
  isPlaceholder: false,
};

let CURRENT_BRAND: BrandSpec = { ...DEFAULT_BRAND };

/** .build/assets.ts gọi tự động trước khi khởi chạy mọi cảnh hoặc preview. */
export const registerBrand = (spec: Partial<BrandSpec>) => {
  CURRENT_BRAND = { ...DEFAULT_BRAND, ...spec };
};

export const brandConfig = (): BrandSpec => CURRENT_BRAND;

/** URL tĩnh của file logo kênh (`variant`: `'white'` | `'black'` | mặc định) để nạp vào `<BrandDecal>`. */
export const brandLogoUrl = (variant?: 'white' | 'black'): string => {
  if (variant === 'black' && CURRENT_BRAND.blackFile) return staticFile(CURRENT_BRAND.blackFile);
  if (variant === 'white' && CURRENT_BRAND.whiteFile) return staticFile(CURRENT_BRAND.whiteFile);
  return staticFile(CURRENT_BRAND.file);
};
