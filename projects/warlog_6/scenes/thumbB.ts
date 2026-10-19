import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as Ad from './_ad';
import * as C from './_c';

// A DEADLY CONVERSATION
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 940, 1920, 140);
    A.line(c, [[0, 940], [1920, 940]], '#0f172a', 8);
    const hx = 960, hy = 400;
    const pts: A.Pt[] = [[300, 640], [960, 780], [1620, 640]];
    for (const p of pts) { A.line(c, [[hx, hy], p], '#ffffff', 22, [30, 20]); }
    C.hub(c, hx, hy, 2.6, 1, '#FFD400');
    Ad.radarSide(c, 330, 940, 2.1, { ph: 1.2 });
    Ad.launcherSide(c, 960, 940, 1.9, { big: true, elev: 0.6, loaded: 1 });
    Ad.gunSide(c, 1620, 940, 2.0, { elev: 0.6 });
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'A DEADLY CONVERSATION';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
  }
}
