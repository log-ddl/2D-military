// Chương 6 (270.2 – 300): thở. Điện phân nước biển, scrubber CO2, chưng cất; nhiều dự phòng.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain, icon, IconKind } from './_c';

export default class S06 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c, '#e6eff5');
    if (t >= 298.9) this.recap(c, t);
    else this.diagram(c, t);
    S.cutDip(c, t, 298.9, 0.14);
    chain(c, t);
  }

  private diagram(c: CanvasRenderingContext2D, t: number) {
    // biển bên phải, thân tàu bên trái
    c.fillStyle = '#b6d5e6'; c.fillRect(1460, 0, 460, 1080);
    A.line(c, [[1460, 0], [1460, 1080]], P.ink, 10);
    for (let i = 0; i < 6; i++) A.line(c, [[1500 + (i % 2) * 40, 80 + i * 150], [1600 + (i % 2) * 40, 80 + i * 150]], '#fff', 5);
    // khoang người
    A.rrect(c, 120, 200, 520, 640, 24, '#fff', P.ink, 6);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 2; i++) {
      const x = 250 + i * 240, y = 290 + r * 140, k = 1 + 0.06 * Math.sin(t * 1.7 + i + r);
      A.rrect(c, x - 70, y - 14 * k, 140, 28 * k, 14, (i + r) % 2 ? P.sand : P.light, P.ink, 4);
      A.circle(c, x - 52, y - 4, 16, P.skin, P.ink, 4);
    }
    // 1) điện phân (270.2 →)
    const e = A.sm(t, 270.4, 271.4);
    A.withA(c, e, () => {
      A.rrect(c, 900, 150, 260, 180, 20, '#fff', P.ink, 6);
      A.line(c, [[980, 170], [980, 310]], P.dark, 10); A.line(c, [[1080, 170], [1080, 310]], P.dark, 10);
      A.rrect(c, 920, 230, 220, 80, 6, 'rgba(56,189,248,0.6)', null, 0);
    });
    const fe = A.sm(t, 277.2, 277.8);
    S.flow(c, [[1460, 260], [1160, 260]], t, { col: P.sky, a: fe, n: 5, spd: 0.5 });
    S.flow(c, [[900, 190], [640, 190]], t, { col: '#38bdf8', a: A.sm(t, 279.6, 280.2), n: 5, spd: 0.6, r: 7 });   // O2 vào khoang
    S.flow(c, [[1160, 190], [1300, 190], [1300, 80], [1460, 80]], t, { col: '#ffffff', a: A.sm(t, 279.8, 280.4), n: 4, spd: 0.6, r: 5 });  // H2 ra biển
    // bọt tại điện cực
    S.bubbles(c, 980, 300, 40, 90, t, 5, 2, e * A.sm(t, 277.2, 278));
    S.bubbles(c, 1080, 300, 40, 90, t, 5, 7, e * A.sm(t, 277.2, 278));
    // 2) scrubber CO2 (283.8 →)
    const s = A.sm(t, 284.0, 284.8);
    A.withA(c, s, () => {
      A.rrect(c, 900, 440, 260, 170, 20, '#fff', P.ink, 6);
      for (let i = 0; i < 5; i++) A.rrect(c, 930 + i * 44, 462, 28, 126, 6, i % 2 ? '#e2e8f0' : '#cbd5e1', P.ink2, 3);
      const sw = (Math.sin(t * 1.2) * 0.5 + 0.5) * 168;
      A.rrect(c, 928 + sw * 0, 600, 200, 10, 5, P.amber, null, 0);
    });
    S.flow(c, [[640, 520], [900, 520]], t, { col: '#475569', a: s, n: 6, spd: 0.7, r: 6 });   // CO2 ra khỏi người, vào máy
    // CO2 bị giữ lại: chất thải gom bên trong
    const caught = A.sm(t, 285.4, 290);
    A.withA(c, s, () => { for (let i = 0; i < 8; i++) A.circle(c, 940 + (i % 4) * 56, 540 + Math.floor(i / 4) * 30, 7 * Math.min(1, caught * 8 - i * 0.6 + 0.2), '#334155', null, 0); });
    // 3) chưng cất nước ngọt (290.5 →)
    const d = A.sm(t, 290.5, 291.3);
    A.withA(c, d, () => {
      A.rrect(c, 900, 730, 260, 170, 20, '#fff', P.ink, 6);
      A.rrect(c, 920, 800, 100, 80, 6, 'rgba(56,189,248,0.7)', P.ink2, 3);
      A.line(c, [[1030, 790], [1090, 750], [1140, 790]], '#94a3b8', 6);
      A.circle(c, 1100, 860, 10 + 3 * Math.sin(t * 4), '#bfe7f8', P.ink, 3);
    });
    S.flow(c, [[1460, 840], [1160, 840]], t, { col: P.sky, a: d, n: 5, spd: 0.5 });
    S.flow(c, [[900, 820], [640, 820]], t, { col: '#7dd3fc', a: A.sm(t, 293.0, 293.6) * 0 + d, n: 4, spd: 0.4, r: 8 });
    // "nếu ngừng, chỉ còn vài giờ": thanh ngắn so với "ngày"; ba bộ dự phòng
    const hrs = A.sm(t, 292.6, 293.4);
    A.withA(c, hrs, () => {
      A.rrect(c, 700, 905, 740, 28, 14, '#fff', P.ink, 4);
      A.rrect(c, 704, 909, 90, 20, 10, P.enemy, null, 0);
      for (let i = 0; i < 7; i++) A.rrect(c, 704 + 100 + i * 90, 909, 78, 20, 10, '#d1fae5', null, 0);
    });
    const bk = A.sm(t, 296.0, 297.4);
    A.withA(c, bk, () => {
      for (const [x, y] of [[900, 150], [900, 440], [900, 730]] as const) { A.rrect(c, x + 14, y + 14, 260, 170, 20, null, 'rgba(30,41,59,0.45)', 4); }
    });
    void K; void U;
  }

  private recap(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 420, z: 1.35 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    S.drawSubSide(c, t, { x: 0, y: 420 + 8 * Math.sin(t * 1.2), s: 1, cut: 1, plant: 'nuclear', plantRun: 0.7, prop: t * 3, breath: t * 1.6, batt: 1 });
    K.end(c);
    const icons: [IconKind, number, number, number][] = [['dive', 340, 240, 298.98], ['plane', 1580, 240, 299.3], ['engine', 340, 800, 299.6], ['lungs', 1580, 800, 299.9]];
    for (const [k, x, y, t0] of icons) { const p = A.back(t, t0, t0 + 0.4); if (p > 0) icon(c, k, x, y, 74 * Math.min(1, p)); }
  }
}
