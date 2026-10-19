import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// A 60-TON FIREWORK
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 940, 1920, 140); A.line(c, [[0, 940], [1920, 940]], '#0f172a', 8);
    S.drawTank(c, { x: 760, y: 940, s: 2.3, view: 'side' } as never);
    for (let i = 0; i < 14; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 13); A.line(c, [[760, 700], [760 + Math.cos(a) * (260 + (i % 3) * 90), 700 + Math.sin(a) * (260 + (i % 3) * 90)]], i % 2 ? '#fbbf24' : '#f97316', 18); }
    A.circle(c, 760, 700, 150, '#f97316', '#0f172a', 8); A.circle(c, 760, 700, 90, '#fde68a', null, 0);

    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'A 60-TON FIREWORK';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void A; void S; void t;
  }
}
