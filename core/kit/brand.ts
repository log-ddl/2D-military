// Cấu hình & đường dẫn Logo Kênh dùng chung toàn hệ thống (đồng bộ tự động từ library/brand/ vào .build/public/brand/).
import { staticFile } from 'remotion';

export type BrandSpec = {
  file: string;
  name: string;
  darkTint: string;
  lightTint: string;
  stencilOpacity: number;
  wallOpacity: number;
  isPlaceholder?: boolean;
};

const DEFAULT_BRAND: BrandSpec = {
  file: 'brand/logo_placeholder.png',
  name: 'CHANNEL',
  darkTint: '#14181f',
  lightTint: '#e8eef5',
  stencilOpacity: 0.44,
  wallOpacity: 0.9,
  isPlaceholder: true,
};

let CURRENT_BRAND: BrandSpec = { ...DEFAULT_BRAND };

/** .build/assets.ts gọi tự động trước khi khởi chạy mọi cảnh hoặc preview. */
export const registerBrand = (spec: Partial<BrandSpec>) => {
  CURRENT_BRAND = { ...DEFAULT_BRAND, ...spec };
};

export const brandConfig = (): BrandSpec => CURRENT_BRAND;

/** URL tĩnh của file logo kênh để nạp vào THREE.TextureLoader, <Img> hoặc 2D overlay. */
export const brandLogoUrl = (): string => staticFile(CURRENT_BRAND.file);
