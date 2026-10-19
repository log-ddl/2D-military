import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';
import * as Cm from './_common';

export default class Thumb extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D) {
    // nền tương phản mạnh: trời xanh tươi, mặt đất xám đậm
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    const GY = 930;
    c.fillStyle = '#3a4350'; c.fillRect(0, GY, 1920, 200);
    A.line(c, [[0, GY], [1920, GY]], '#0f172a', 6);
    // xe tải bồn gần cạn
    Cm.exhaust(c, 20, GY - 420, 0.3, 1, 4, 1);
    S.truckSide(c, 540, GY, 4.6, { tank: 0.1, bob: 0 });
    // cột: gần như toàn bộ đã đốt
    S.loadColumn(c, 1255, GY, 170, 540, 0.93);
    // người lính to hơn + một thùng
    S.crate(c, 1520, GY, 3.2, 'fuel');
    Cm.soldier(c, 1770, GY, 3.8, { dir: -1 });
    // băng vàng phía trên, góc dưới bo tròn
    c.fillStyle = '#FFD400';
    c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    c.fillStyle = '#000'; c.textAlign = 'center'; c.textBaseline = 'alphabetic';
    c.fillText('BURNS ITS CARGO', 960, 218);
    c.restore();
  }
}
