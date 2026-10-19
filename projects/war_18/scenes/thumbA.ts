import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// TEN SECONDS DECIDE
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 900, 1920, 180); A.line(c, [[0, 900], [1920, 900]], '#0f172a', 8);
    S.drawTrench(c, 960, 900, 1500, 200, 'side');
    for (const [x, y] of [[300, 480], [760, 400], [1240, 520], [1640, 420]]) S.drawShell(c, { x, y, rot: Math.PI / 2 + 0.2, scale: 3.2 });
    A.circle(c, 960, 880, 120, '#f97316', '#0f172a', 8); A.circle(c, 960, 880, 70, '#fde68a', null, 0);

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'TEN SECONDS DECIDE';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
