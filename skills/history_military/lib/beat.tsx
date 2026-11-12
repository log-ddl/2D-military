// Cụm cao trào cắt theo nhịp nhạc: mỗi phần tử là một shot, điểm cắt = các cú hit / phách do tools/beats.py đo từ nhạc đã đặt.
// Chỉ dùng ở khoảng KHÔNG có lời đọc (khoảng nghỉ chèn bằng tools/voice_prep.py) hoặc dưới một câu ngắn; phần lời bình thường vẫn cắt theo câu.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { prog, useT } from '@core/time';
import { Shot } from './shot';

export type BeatShot = { node: React.ReactNode; credit?: string; dark?: boolean };

/**
 * `cuts` = [t0, t1, …, tn] giây voice tuyệt đối, tăng dần (chép từ `plan/beats.json`); `shots[i]` chạy trong [cuts[i], cuts[i+1]).
 * `punch` = cú giật phóng nhẹ ngay điểm cắt (0 = tắt) để cắt "ăn" vào phách. Số shot phải bằng cuts.length - 1.
 * Nhịp nên DỒN: shot dài ở đầu (2–3 phách), ngắn dần về cuối (1 phách), shot cuối cùng cắt thẳng sang thẻ tên / im lặng.
 */
export const BeatMontage: React.FC<{ cuts: number[]; shots: BeatShot[]; punch?: number }> = ({ cuts, shots, punch = 0.05 }) => {
  const t = useT();
  if (t < cuts[0] || t >= cuts[cuts.length - 1]) return null;
  return (
    <AbsoluteFill style={{ backgroundColor: '#000' }}>
      {shots.map((s, i) => i + 1 >= cuts.length ? null : (
        <Shot key={i} from={cuts[i]} to={cuts[i + 1]} credit={s.credit} dark={s.dark}>
          <AbsoluteFill style={{ transform: `scale(${1 + punch * (1 - prog(t, cuts[i], cuts[i] + 0.18))})` }}>{s.node}</AbsoluteFill>
        </Shot>))}
    </AbsoluteFill>
  );
};
