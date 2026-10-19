import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// HALF-HOUR TO IMPACT
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.save(); c.translate(960, 640); c.rotate(-0.6); c.scale(3.6, 3.6);
    S.drawICBM(c, { view: 'side', thrust: 1, reentryGlow: 1 });
    c.restore();

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'HALF-HOUR TO IMPACT';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
