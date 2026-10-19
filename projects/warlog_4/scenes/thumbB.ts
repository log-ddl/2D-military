import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import { P } from './shared/palette';
import * as Sh from './_ship';

// A MOVING RUNWAY: sàn tàu sân bay nhìn từ trên, to, có phản lực
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    // vệt sóng sau tàu
    for (let i = 0; i < 6; i++) A.line(c, [[0, 330 + i * 120], [380 + i * 30, 330 + i * 120]], 'rgba(255,255,255,0.55)', 10);
    Sh.carrierTop(c, t, { x: 940, y: 690, s: 1.78, angled: 1 });
    Sh.jetTop(c, 1240, 560, 3.6, { ang: -0.2 } as never);
    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'A MOVING RUNWAY';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void P;
  }
}
