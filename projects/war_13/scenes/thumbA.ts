import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// DROWN THE SIGNAL
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.save(); c.translate(420, 520); c.scale(2.4, 2.4); S.drawSatellite(c, { view: 'side', emitting: true }); c.restore();
    for (let i = 1; i <= 4; i++) { c.beginPath(); c.arc(500, 560, 160 * i, 0.15, 0.95); c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.lineCap = 'round'; c.stroke(); }
    c.save(); c.translate(1480, 780); c.scale(4.6, 4.6); S.drawLunchboxJammer(c, { view: 'side', active: true }); c.restore();

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'DROWN THE SIGNAL';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
