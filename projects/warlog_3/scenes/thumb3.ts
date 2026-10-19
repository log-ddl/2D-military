import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import { P } from './shared/palette';
import * as S from './_sub';

// ONE TINY HOLE: lỗ bằng đồng xu, tia nước xuyên thân đầy người ngủ
export default class Thumb3 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    const cx = 900, cy = 690, r = 360, hx = cx + r, hy = cy;
    A.circle(c, cx, cy, r, '#f6fafc', null, 0);
    for (let tier = 0; tier < 3; tier++) {
      const y = cy - 150 + tier * 140;
      A.rrect(c, cx - 250, y + 34, 500, 12, 5, '#cbd5e1', P.ink2, 3);
      for (let i = 0; i < 4; i++) {
        const x = cx - 190 + i * 127;
        A.rrect(c, x - 44, y - 12, 88, 38, 18, i % 2 ? P.sand : P.light, P.ink, 4);
        A.circle(c, x - 28, y - 14, 15, P.skin, P.ink, 4);
      }
    }
    // tia nước từ lỗ chạy ngang qua khoang
    c.beginPath(); c.moveTo(hx, hy - 12); c.lineTo(cx - 60, hy - 46); c.lineTo(cx - 60, hy + 46); c.lineTo(hx, hy + 12); c.closePath();
    c.fillStyle = '#38bdf8'; c.fill();
    for (let i = 0; i < 6; i++) A.line(c, [[hx - i * 60, hy - 6 + (i % 3) * 8 - 8], [hx - i * 60 - 140, hy - 6 + (i % 3) * 8 - 8]], '#e0f4fd', 5);
    A.circle(c, cx, cy, r, null, P.ink, 30);
    A.circle(c, hx, hy, 22, '#0A84FF', null, 0);
    // đồng xu bên cạnh làm thước
    A.circle(c, 1560, 800, 52, '#fbbf24', P.ink, 8);
    A.circle(c, 1560, 800, 34, null, '#d97706', 5);
    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'ONE TINY HOLE';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void S;
  }
}
