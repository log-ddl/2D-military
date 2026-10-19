import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';

function banner(c: CanvasRenderingContext2D, s: string) {
  c.fillStyle = '#FFD400'; c.fillRect(0, 0, 1920, 270);
  c.save();
  c.font = "400 250px Impact, 'Haettenschweiler', 'Arial Narrow', sans-serif";
  const k = Math.min(1, 1780 / c.measureText(s).width);
  c.translate(960, 218); c.scale(k, 1);
  c.fillStyle = '#000'; c.textAlign = 'center'; c.fillText(s, 0, 0);
  c.restore();
}

// WHOEVER PINGS LOSES: kẻ ping bị nghe trước
export default class Thumb2 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    // vòng ping đỏ của kẻ kia, lan về phía ta
    const en: A.Pt = [1420, 470], us: A.Pt = [470, 760];
    for (const r of [150, 330, 520, 720, 930]) A.circle(c, en[0], en[1], r, null, 'rgba(255,255,255,0.75)', 10);
    A.circle(c, en[0], en[1], 150, null, '#ffffff', 14);
    S.drawSubTop(c, t, { x: en[0], y: en[1], s: 0.95, color: P.enemy, rot: Math.PI + 0.35 });
    // ta: nón nghe xanh + tâm ngắm lên kẻ ping
    const a = Math.atan2(en[1] - us[1], en[0] - us[0]);
    c.save(); c.translate(us[0], us[1]);
    c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 820, a - 0.17, a + 0.17); c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.28)'; c.fill(); c.restore();
    S.drawSubTop(c, t, { x: us[0], y: us[1], s: 0.95, rot: a });
    U.crosshair(c, en[0] + 40, en[1] - 6, 120, '#ffffff', 1, 0);
    banner(c, 'WHOEVER PINGS LOSES');
  }
}
