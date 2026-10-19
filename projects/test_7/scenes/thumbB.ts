import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// SHIP VERSUS ROWBOAT
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 900, 1920, 140); A.line(c, [[0, 900], [1920, 900]], '#0f172a', 8);
    S.drawCargoShip(c, 700, 900, 2.0);
    S.drawRowBoat(c, 1640, 900, 5.2);

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'SHIP VERSUS ROWBOAT';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
