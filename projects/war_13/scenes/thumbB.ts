import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// LUNCHBOX BEATS MISSILE
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 940, 1920, 140); A.line(c, [[0, 940], [1920, 940]], '#0f172a', 8);
    c.save(); c.translate(560, 560); c.scale(3.0, 3.0); S.drawCruiseMissile(c, { view: 'side', gpsState: 'jammed', thrust: 1 }); c.restore();
    c.save(); c.translate(1480, 900); c.scale(4.8, 4.8); S.drawLunchboxJammer(c, { view: 'side', active: true }); c.restore();

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'LUNCHBOX BEATS MISSILE';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
