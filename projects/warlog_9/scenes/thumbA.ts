import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// NINE TIMES HEAVIER: phi công bị rút máu, máy bay vẫn vào cua gắt
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    // máy bay vào cua gắt phía sau, mờ nhẹ
    S.jetSide(c, 1560, 760, 2.7, -0.5, { ab: 1, t: 0 });
    // phi công rất to, đang xám đi
    c.save();
    c.fillStyle = 'rgba(15,23,42,0.0)';
    S.pilotSide(c, 520, 930, 3.4, { drain: 0.9, head: 0.2 });
    c.restore();
    // mũi tên G ép xuống
    for (const x of [130, 800, 1040]) { A.line(c, [[x, 330], [x, 470]], '#ffffff', 26); A.poly(c, [[x - 40, 470], [x + 40, 470], [x, 550]], '#ffffff', null, 0); }
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'NINE TIMES HEAVIER';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
  }
}
