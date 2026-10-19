import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as S from './_assets';

// RADAR MUST SHOUT
export default class ThumbA extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = '#7d8b5a'; c.fillRect(0, 930, 1920, 150);
    A.line(c, [[0, 930], [1920, 930]], '#0f172a', 8);
    S.drawGroundRadar(c, 380, 930, 'side', { scale: 2.6, active: true, mobile: true, dishAngle: 0.5 });
    for (let i = 1; i <= 4; i++) S.drawWaveArc(c, 640, 560, 150 * i, -0.2, 0.9, '#ffffff', 1, 14);
    S.drawIntruderJet(c, 1560, 520, 'side', { scale: 3.0, rwrAlert: 1 });
    c.fillStyle = "#FFD400"; c.fillRect(0, 0, 1920, 270);
    c.save();
    c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
    const s = 'RADAR MUST SHOUT';
    const k = Math.min(1, 1780 / c.measureText(s).width);
    c.translate(960, 218); c.scale(k, 1);
    c.fillStyle = "#000"; c.textAlign = "center"; c.fillText(s, 0, 0);
    c.restore();
  }
}
