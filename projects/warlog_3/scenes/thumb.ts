import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';

export default class Thumb extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    // đáy biển đậm để tàu nổi bật
    c.fillStyle = '#0a5fc4'; c.fillRect(0, 880, 1920, 200);
    A.line(c, [[0, 880], [1920, 880]], '#0f172a', 6);
    // tàu ngầm mặt cắt, người ngủ bên trong
    S.drawSubSide(c, t, { x: 1010, y: 620, s: 2.75, cut: 1, plant: 'nuclear', plantRun: 0.5, breath: 0.8, prop: 0.6 });
    // tiếng bị gạch bỏ phía sau chân vịt
    const px = 150, py = 620;
    for (let i = 1; i <= 3; i++) { c.beginPath(); c.arc(px, py, 38 * i, Math.PI - 0.9, Math.PI + 0.9); c.strokeStyle = '#ffffff'; c.lineWidth = 13; c.lineCap = 'round'; c.stroke(); }
    A.line(c, [[px - 150, py - 130], [px + 20, py + 130]], P.enemy, 26);
    // băng vàng + chữ
    c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
    c.save();
    const s = 'STAY DOWN. NO SOUND';
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const w = c.measureText(s).width, k = Math.min(1, 1780 / w);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
    c.restore();
    void U;
  }
}
