import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as V from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, _t: number, _lt: number) {
    c.fillStyle = '#0A84FF'; c.fillRect(0, 0, 1920, 1080);
    c.fillStyle = 'rgba(255,255,255,0.12)';
    for (let x = 0; x < 1920; x += 160) c.fillRect(x, 0, 80, 1080);
    // [loại, x, y, góc (độ), tỉ lệ]
    const list: [string, number, number, number, number][] = [
      ['tank', 200, 730, 0, 3.0], ['truck', 470, 760, -8, 3.0], ['ifv', 740, 690, 0, 3.0],
      ['apc', 960, 810, 6, 3.2], ['arv', 1220, 690, -8, 2.7], ['bridge', 1480, 840, 32, 2.2], ['tank', 1740, 690, 4, 2.9],
    ];
    list.forEach(([k, x, y, deg, s]) => {
      c.save(); c.translate(x, y); c.rotate(-Math.PI / 2 + (deg * Math.PI) / 180);
      const o = { side: 'ally' as const };
      if (k === 'truck') V.truckTop(c, 0, 0, s, o);
      if (k === 'apc') V.apcTop(c, 0, 0, s, o);
      if (k === 'ifv') V.ifvTop(c, 0, 0, s, o);
      if (k === 'tank') V.tankTop(c, 0, 0, s, o);
      if (k === 'arv') V.arvTop(c, 0, 0, s, o);
      if (k === 'bridge') V.bridgeLayerTop(c, 0, 0, s, { ...o, u: 0 });
      c.restore();
    });
    c.fillStyle = '#ffd400';
    c.beginPath(); c.roundRect(0, 0, 1920, 290, [0, 0, 40, 40]); c.fill();
    const T = 'PICK YOUR ROLE';
    c.font = '900 200px Archivo, Impact, sans-serif';
    c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    const w = c.measureText(T).width, sx = 1860 / w;
    c.save(); c.translate(30, 242); c.scale(sx, 1.18);
    c.fillStyle = '#111'; c.fillText(T, 0, 0);
    c.restore();
    void A;
  }
}
