import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// DESIGNED BY RULER
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    S.drawStealthDiamond(c, 960, 640, 3.6, 'side', { dir: 1, highlightFacet: 99 });
    S.drawRuler(c, 400, 900, 1100, 0);

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'DESIGNED BY RULER';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
