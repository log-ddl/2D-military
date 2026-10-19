import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// TANK WON\'T FIT
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    S.drawB747(c, 760, 760, { view: 'side', scale: 2.2, floorCrush: 1 });
    S.drawTank(c, 1560, 900, { view: 'side', scale: 2.4 });

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'TANK WON\'T FIT';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
