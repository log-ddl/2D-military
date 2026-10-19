import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// SUPERSONIC BLADE TIP
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.save(); c.translate(960, 680); c.scale(1.9, 1.9);
    S.drawAsymmetricRotorTop(c, { rotorAngle: 0.4, advHighlight: 1, sonicShock: 1, showHeroBlade: true });
    c.restore();

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'SUPERSONIC BLADE TIP';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
