import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// WATCHED BEFORE SEEN
export default class ThumbB extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 960, 1920, 120);
    A.line(c, [[0, 960], [1920, 960]], '#0f172a', 8);
    S.drawGroundRadar(c, 260, 960, 'side', { scale: 1.5, active: true, dishAngle: 0.4 });
    for (let i = 1; i <= 3; i++) S.drawWaveArc(c, 420, 700, 190 * i, -0.15, 0.7, '#ffffff', 1, 12);
    S.drawIntruderJet(c, 1250, 560, 'side', { scale: 4.2, rwrAlert: 1 });
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'WATCHED BEFORE SEEN';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
  }
}
