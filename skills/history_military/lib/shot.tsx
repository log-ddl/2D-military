// Shot = một nhịp hình (thường một câu / một vế của lời đọc), vào và ra bằng CẮT THẲNG.
// Một cảnh (file CNNSxx.tsx) chứa nhiều <Shot> nối tiếp; mốc viết theo giây voice tuyệt đối.
import React, { createContext, useContext } from 'react';
import { AbsoluteFill } from 'remotion';
import { useT } from '@core/time';
import { FilmLook } from './footage';
import { Credit } from './text';

export type ShotSpan = { from: number; to: number };
const ShotCtx = createContext<ShotSpan>({ from: 0, to: 1e9 });
/** Khoảng [from, to) của shot đang chứa component này. */
export const useShot = () => useContext(ShotCtx);

/**
 * Một shot. `credit` là dòng ghi nguồn (BẮT BUỘC với mọi shot có footage / ảnh / tài liệu / số liệu; chỉ thẻ chữ nền đen được bỏ).
 * `dark` = dòng nguồn chữ tối (nền giấy sáng). `film` = độ nặng lớp hạt phim phủ lên mọi thứ trong shot (mặc định 1; 0 = tắt).
 */
export const Shot: React.FC<{ from: number; to: number; credit?: string; dark?: boolean; bg?: string; film?: number; children?: React.ReactNode }> = ({
  from, to, credit, dark, bg = '#000', film = 1, children,
}) => {
  const t = useT();
  if (t < from || t >= to) return null;
  return (
    <ShotCtx.Provider value={{ from, to }}>
      <AbsoluteFill style={{ backgroundColor: bg, overflow: 'hidden' }}>
        {children}
        {credit ? <Credit text={credit} dark={dark} /> : null}
        <FilmLook amount={film} />
      </AbsoluteFill>
    </ShotCtx.Provider>
  );
};
