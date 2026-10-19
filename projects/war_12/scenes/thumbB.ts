import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// KILL IN SPACE
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.save(); c.translate(700, 800); c.rotate(-0.9); c.scale(3.6, 3.6); S.drawInterceptorBooster(c, { thrust: 1, sep: 0.4 }); c.restore();
    c.save(); c.translate(1380, 560); c.rotate(0.5); c.scale(4.4, 4.4); S.drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.5 }); c.restore();

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'KILL IN SPACE';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
