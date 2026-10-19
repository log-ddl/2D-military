import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as V from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, _t: number, _lt: number) {
    const g = c.createLinearGradient(0, 0, 0, 760);
    g.addColorStop(0, '#b3321f'); g.addColorStop(0.6, '#f0662a'); g.addColorStop(1, '#ffb347');
    c.fillStyle = g; c.fillRect(0, 0, 1920, 1080);
    // mặt trời thấp
    A.circle(c, 1500, 800, 150, '#ffd27a', null, 0);
    // mặt đất
    c.fillStyle = '#d19a4f'; c.fillRect(0, 880, 1920, 200);
    c.fillStyle = '#b9833c'; c.fillRect(0, 880, 1920, 10);
    // đoàn xe xa: bóng tối nhỏ về phía chân trời
    const keep = { ...V.COLORS.ally };
    Object.assign(V.COLORS.ally, { b: '#3a1d12', d: '#2a140c', l: '#4a2618' });
    const far: [string, number][] = [['truck', 1230], ['apc', 1390], ['ifv', 1530], ['arv', 1700], ['truck', 1840]];
    far.forEach(([k, x], i) => {
      const s = 0.55 - i * 0.04;
      if (k === 'truck') V.truck(c, x, 890, s, {});
      if (k === 'apc') V.apc(c, x, 890, s, {});
      if (k === 'ifv') V.ifv(c, x, 890, s, {});
      if (k === 'arv') V.arv(c, x, 890, s, {});
    });
    Object.assign(V.COLORS.ally, keep);
    // bóng + xe tăng to ở tiền cảnh
    c.fillStyle = 'rgba(80,40,10,0.35)'; c.beginPath(); c.ellipse(560, 960, 560, 40, 0, 0, 6.283); c.fill();
    V.tank(c, 560, 960, 4.6, { lift: 0 });
    // chữ
    const T = '60 TONS OF STEEL';
    c.font = '900 210px Archivo, Impact, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const w = c.measureText(T).width, sx = 1840 / w;
    c.save(); c.translate(40, 240); c.scale(sx, 1.15);
    c.lineJoin = 'round'; c.lineWidth = 26; c.strokeStyle = '#000'; c.strokeText(T, 0, 0);
    c.fillStyle = '#fff'; c.fillText(T, 0, 0); c.restore();
  }
}
