import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// REFUEL IN FLIGHT
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.save(); c.translate(560, 470); S.drawVictor(c, 'side', { scale: 3.6, hoseOut: 1 }); c.restore();
    c.save(); c.translate(1360, 780); S.drawVulcan(c, 'side', { scale: 3.6 }); c.restore();

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'REFUEL IN FLIGHT';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
