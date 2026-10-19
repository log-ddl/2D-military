import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import { P } from './shared/palette';
import * as Sh from './_ship';

// LAND AT FULL THROTTLE: phản lực to chạm sàn, ga tối đa, móc bắt dây
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    // sàn tàu
    c.fillStyle = '#3a4350'; c.fillRect(0, 880, 1920, 200);
    A.line(c, [[0, 880], [1920, 880]], '#0f172a', 8);
    for (let i = 0; i < 8; i++) A.rrect(c, 40 + i * 250, 960, 140, 14, 4, '#f8fafc', null, 0);
    // dây hãm
    A.line(c, [[420, 874], [420, 874]], '#e2e8f0', 8);
    A.rrect(c, 380, 868, 80, 14, 7, '#e2e8f0', P.ink, 4);
    // phản lực rất to
    Sh.jetSide(c, 1020, 870 - 20 * 11.5, 11.5, { gear: 1, hook: 1, flame: 1, ang: 0.04 });
    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'FULL THROTTLE LANDING';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
  }
}
