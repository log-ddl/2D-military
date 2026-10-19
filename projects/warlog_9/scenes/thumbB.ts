import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// PILOT IS WEAKEST: tiêm kích rất to, khoanh đỏ vào phi công
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    S.jetSide(c, 840, 700, 3.6, 0.0, { ab: 1, t: 0, pilot: true });
    A.circle(c, 1135, 570, 125, null, '#ffffff', 22);
    A.circle(c, 1135, 570, 125, null, '#b4493c', 12);
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'PILOT IS WEAKEST';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
  }
}
