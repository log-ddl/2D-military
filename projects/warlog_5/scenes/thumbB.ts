import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_art';

// SHOOT AND SCOOT
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 930, 1920, 150);
    A.line(c, [[0, 930], [1920, 930]], '#0f172a', 8);
    // vệt tốc độ + bụi phía sau
    for (let i = 0; i < 5; i++) A.line(c, [[1180 + i * 40, 520 + i * 90], [1900, 520 + i * 90]], 'rgba(255,255,255,0.7)', 12);
    for (let i = 0; i < 4; i++) A.circle(c, 1480 + i * 130, 880 - (i % 2) * 20, 70 + i * 14, 'rgba(255,255,255,0.8)', '#0f172a', 5);
    // pháo tự hành quay đầu bỏ chạy sang trái
    S.spGun(c, { x: 1080, y: 930, s: 2.15, dir: -1, elev: 0.15, wheels: true, track: 3 });
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'SHOOT AND SCOOT';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
  }
}
