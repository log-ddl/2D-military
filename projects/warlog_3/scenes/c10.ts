// Chương 10 (438.8 – 479): điện ảnh vs thật; ai nghe trước; trở về khung mở đầu.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain } from './_c';

const OPEN: K.Cam = { x: -4, y: 896, z: 3.3 };

export default class S10 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 447.5) this.movie(c, t);
    else if (t < 453.9) this.hears(c, t);
    else if (t < 463.4) this.ears(c, t);
    else this.finale(c, t);
    for (const at of [447.5, 453.9, 463.4]) S.cutDip(c, t, at, 0.14);
    chain(c, t, { allLit: t >= 466.2 });
  }

  private ocean(c: CanvasRenderingContext2D) {
    A.clear(c, '#cde3ee');
    for (let x = 0; x <= A.W; x += 120) A.line(c, [[x, 0], [x, A.H]], 'rgba(60,110,140,0.14)', 2);
    for (let y = 0; y <= A.H; y += 120) A.line(c, [[0, y], [A.W, y]], 'rgba(60,110,140,0.14)', 2);
  }

  // phim: ping liên tục
  private movie(c: CanvasRenderingContext2D, t: number) {
    this.ocean(c);
    S.drawSubTop(c, t, { x: 700, y: 540, s: 0.5 });
    for (let i = 0; i < 4; i++) { const ph = ((t - 441) * 0.7 + i / 4) % 1; A.withA(c, 1 - ph, () => A.circle(c, 700, 540, 80 + 900 * ph, null, P.enemy, 6)); }
    // viền phim đen
    K.bars(c, A.sm(t, 439.2, 440.2), 130);
  }

  // thực tế: ai nghe trước
  private hears(c: CanvasRenderingContext2D, t: number) {
    this.ocean(c);
    const us: A.Pt = [520, 620], en: A.Pt = [1400, 380];
    S.drawSubTop(c, t, { x: us[0], y: us[1], s: 0.42 });
    S.drawSubTop(c, t, { x: en[0], y: en[1], s: 0.42, color: P.enemy, rot: Math.PI * 0.93 });
    // kẻ kia ping: vòng đỏ đi ra
    const T0 = 448.2, V = 520, R = (t - T0) * V;
    const d = Math.hypot(en[0] - us[0], en[1] - us[1]);
    if (R > 0 && R < 1700) A.withA(c, 1 - R / 1700, () => A.circle(c, en[0], en[1], R, null, P.enemy, 7));
    // ta nghe được ngay khi vòng chạm: đánh dấu hướng của kẻ ping
    if (R > d) {
      const k = A.sm(R, d, d + 60);
      A.withA(c, k, () => { c.save(); c.translate(us[0], us[1]);
        const a = Math.atan2(en[1] - us[1], en[0] - us[0]);
        c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 340, a - 0.26, a + 0.26); c.closePath(); c.fillStyle = 'rgba(22,163,74,0.2)'; c.fill(); c.strokeStyle = '#16a34a'; c.lineWidth = 4; c.stroke(); c.restore(); });
      A.withA(c, A.sm(R, d + 200, d + 400), () => U.crosshair(c, en[0], en[1], 56, '#16a34a', 1, t));
    }
    // kẻ kia chưa biết ta ở đâu: dấu hỏi bằng vòng đứt quanh ta
    const q = A.sm(t, 450.0, 451.0);
    A.withA(c, q, () => { c.setLineDash([12, 10]); A.circle(c, en[0], en[1], 150, null, P.enemy, 4); c.setLineDash([]); });
    void U;
  }

  // đôi tai quan trọng hơn vũ khí
  private ears(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 420, z: 1.5 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    const e = A.sm(t, 456.2, 457.2);
    S.drawSubSide(c, t, { x: 0, y: 420, s: 1, cut: 1, hl: t >= 456.8 ? ['sonar'] : ['torp'], glow: P.amber, tilesA: A.sm(t, 460, 461) * 0.8, prop: t * 0.8, breath: t * 1.4 });
    if (e > 0) S.waves(c, 262, 420, t, { R: 200, n: 2, per: 1.8, color: '#16a34a', w: 4, a: e });
    K.end(c);
  }

  // quay lại ống chứa người ngủ
  private finale(c: CanvasRenderingContext2D, t: number) {
    const cam = K.mix(OPEN, { x: 0, y: 900, z: 1.45 }, A.eio(t, 466.0, 467.2));
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1500 });
    const words: [string, number][] = [['hull', 467.0], ['ballast', 467.7], ['planes', 468.3], ['plant', 469.0], ['life', 469.6], ['tiles', 470.3]];
    let hl: string[] = [];
    for (const [k, w] of words) if (t >= w && t < 471.4) hl = [k === 'tiles' || k === 'hull' ? 'crew' : k];
    const quiet = A.sm(t, 473.0, 475.0);
    const sub: S.SubSide = { x: 0, y: 900, s: 1, cut: 1, hl: t >= 467 && t < 471.4 ? hl : [], glow: P.amber, tilesA: t >= 470.3 ? 0.4 : 0, breath: t * 1.4 * (1 - 0.7 * quiet), prop: (1 - quiet) * t * 2, planeA: t >= 468.3 && t < 469 ? 0.3 : 0, plant: 'nuclear', plantRun: 1 - quiet };
    S.drawSubSide(c, t, sub);
    // mọi bộ phận trả lời một câu: ở dưới và đừng gây tiếng
    if (t > 466.0 && t < 471.4) S.waves(c, 0, 900, t, { R: 240, n: 2, per: 1.2, color: P.enemy, w: 4, a: 1 - A.sm(t, 470.0, 471.4) });
    K.end(c);
    // cuối: mờ yên lặng
    const fin = A.sm(t, 476.0, 478.4);
    c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = fin * 0.55; c.fillStyle = '#10243a'; c.fillRect(0, 0, A.W, A.H); c.restore();
  }
}
