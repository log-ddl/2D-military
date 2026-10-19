import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import { P } from './shared/palette';
import * as S from './_art';

// NEVER SEES TARGET
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 930, 1920, 150);
    A.line(c, [[0, 930], [1920, 930]], '#0f172a', 8);
    // pháo rất to, đang bắn
    S.spGun(c, { x: 360, y: 930, s: 1.75, elev: 0.5, recoil: 0.8 });
    // chớp nòng
    const mx = 360 + (62 + Math.cos(0.5) * 340 * 1.0) * 1.75, my = 930 - (140 + Math.sin(0.5) * 340) * 1.75;
    c.beginPath(); c.moveTo(mx, my); c.lineTo(mx + 120, my - 90); c.lineTo(mx + 40, my - 10); c.lineTo(mx + 150, my + 30); c.closePath();
    c.fillStyle = '#fde68a'; c.fill(); c.strokeStyle = '#0f172a'; c.lineWidth = 5; c.stroke();
    // mắt bị gạch: người bắn không thấy mục tiêu
    S.eye(c, 1440, 640, 190, 1, '#ffffff');
    // mục tiêu rất xa và nhỏ
    A.line(c, [[1300, 930], [1900, 930]], '#0f172a', 4);
    A.rrect(c, 1760, 880, 70, 50, 6, P.enemy, '#0f172a', 5);
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'NEVER SEES TARGET';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
  }
}
