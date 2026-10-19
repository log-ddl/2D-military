import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as Ad from './_ad';
import * as C from './_c';

// RADAR CAN'T KILL
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 940, 1920, 140);
    A.line(c, [[0, 940], [1920, 940]], '#0f172a', 8);
    Ad.radarSide(c, 400, 940, 2.7, { ph: 0.9 });
    // chùm dò tới máy bay địch
    for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(640, 660, 170 * i, -0.75, -0.05); c.strokeStyle = '#ffffff'; c.lineWidth = 12; c.lineCap = 'round'; c.stroke(); }
    Ad.jetSide(c, 1500, 470, 3.6, { side: 'atk', dir: -1 });
    // tên lửa bị gạch bỏ: radar không có đòn đánh
    Ad.missile(c, 1030, 820, -0.0, 150, { flame: 0, color: '#1e293b' });
    A.line(c, [[880, 700], [1230, 940]], '#ffffff', 34);
    A.line(c, [[880, 700], [1230, 940]], '#b4493c', 20);
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = "RADAR CAN'T KILL";
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
    void C;
  }
}
