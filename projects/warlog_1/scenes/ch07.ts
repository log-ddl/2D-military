// Chương 7 (297.6–347.5): ai kéo xe tăng ra? Xe cứu kéo.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { dip, sideCam, halo, type Pt } from './_common';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < Q.towed - 0.2) this.rescue(c, t); else this.fates(c, t);
    dip(c, t, Q.towed - 0.2, 0.15);
  }

  private rescue(c: CanvasRenderingContext2D, t: number) {
    // 0: xe tăng + bộ phận; 1: mất xích, sa lầy; 2: ARV tới, neo, kéo
    const camA = sideCam(160, 3.4, 880), camB = sideCam(360, 1.9, 820), camC = sideCam(330, 2.1, 830);
    let cam = camA;
    if (t > 309.2) cam = K.mix(camA, camB, A.eio(t, 309.2, 310.6));
    if (t > 318) cam = K.mix(camB, camC, A.eio(t, 318, 320));
    K.begin(c, cam);
    const mudOn = t > 309;
    W.sideGround(c, cam, { scroll: 0, road: false, mud: mudOn ? [[300, 760]] : [] });
    const sink = A.sm(t, 310.2, 312.8);
    // vị trí xe tăng: chạy tới vũng, rồi bị kéo ra
    let tx = 100;
    if (t >= 309) tx = A.lerp(100, 560, A.eio(t, 309.0, 311.0));
    const pull = A.eio(t, 328.3, 334.0);
    if (t >= 328.3) tx = A.lerp(560, 150, pull);
    const rise = t > 327 ? 1 - A.sm(t, 329.0, 331.0) : 1;
    const dy = sink * 11 * rise;
    // xích tuột
    const track = A.sm(t, Q.throwsTrack, Q.throwsTrack + 1.2);
    V.tank(c, tx, dy, 1, { cut: t < 309 ? 1 : 0, ph: t < 311 ? tx * 1.2 : 0 });
    if (track > 0) {
      // đoạn xích rơi ra phía sau
      c.save(); c.translate(tx - 70, dy);
      A.rrect(c, -110 * track, -6, 90 * track + 20, 10, 4, P.dark, P.ink, A.px(c, 3));
      c.restore();
    }
    // vô số bộ phận (302.9–309): bánh răng nảy lên quanh xe
    if (t > Q.parts && t < 309.2) {
      for (let i = 0; i < 14; i++) {
        const p = A.back(t, Q.parts + i * 0.38, Q.parts + 0.45 + i * 0.38, 1.4);
        if (t < Q.parts + i * 0.38) continue;
        V.cargo(c, tx - 90 + (i % 7) * 30, -100 - Math.floor(i / 7) * 40, 'parts', 0.5 * p, 1);
      }
    }
    // ARV
    const arvIn = A.eo(t, Q.arvIs - 0.5, Q.arvIs + 2.0);
    const ax = -380 + arvIn * 380 - 40 + 0;
    const ao: V.ArvO = { ph: ax * 1.2, boom: A.sm(t, Q.crane, Q.crane + 1.2) * 0.6, spade: A.sm(t, Q.winch, Q.winch + 1.2) };
    if (t > Q.arvIs - 0.5) {
      V.arv(c, ax, 0, 1, ao);
      // cáp tời từ đầu cần tới đuôi xe tăng
      const cp = A.eo(t, Q.winch + 1.0, Q.winch + 2.4);
      if (cp > 0) {
        const hk = V.arvHook(ax, 0, 1, ao);
        const end: Pt = [tx - 82, -32 + dy];
        A.line(c, [hk, [A.lerp(hk[0], end[0], cp), A.lerp(hk[1], end[1], cp) + 14 * Math.sin(cp * Math.PI)]], P.amber, A.px(c, 4));
      }
      if (t > Q.winch && t < Q.winch + 1.4) F.dust(c, ax - 90, 8, A.ph(t, Q.winch, Q.winch + 1.4), 0.8, '#a58f63');
    }
    // dưới hỏa lực (334.2–335.3)
    if (t > Q.underFire - 0.1 && t < Q.treasure) {
      for (let j = 0; j < 3; j++) {
        const u = ((t - Q.underFire) * 2.2 + j / 3) % 1;
        F.tracer(c, [1000, -90 - j * 12], [tx + 20, -60], u, 0.1, '#d95a48', 4);
      }
      F.dust(c, 420 + (t % 1) * 80, 0, (t * 1.6) % 1, 1.0, '#cbbf9a');
    }
    K.end(c);
    if (t > Q.m88 && t < 335) {
      const [sx, sy] = K.toScreen(cam, ax, -90);
      U.callout(c, 'M88', sx, sy - 200, { to: [sx, sy - 10], p: A.win(t, Q.m88 + 0.3, 334, 0.3, 0.3), size: 44 });
    }
    if (t > 332 && t < 335.5) {
      const [sx, sy] = K.toScreen(cam, tx, -110);
      U.callout(c, '60 t', sx, sy - 120, { to: [sx, sy], p: A.win(t, 332.0, 335.0, 0.3, 0.3), size: 40 });
    }
    void halo;
  }

  // hai số phận: kéo đi → sửa → quay lại; bỏ lại → mất cả cuộc chiến
  private fates(c: CanvasRenderingContext2D, t: number) {
    const cam = sideCam(540, 1.25, 720);
    K.begin(c, cam);
    W.sideGround(c, cam, { scroll: 0, road: true });
    // đường trên: xe tăng bị kéo, sửa vài ngày, quay lại
    const drag = A.eio(t, Q.towed, Q.towed + 2.2);
    const back = A.eio(t, 343.0, 345.0);
    // hai làn xếp chồng (làn dưới vẽ lệch xuống bằng scale thế giới)
    c.save(); c.translate(0, -240);
    c.fillStyle = W.GROUND; c.fillRect(-400, 0, 2000, 120); A.line(c, [[-400, 0], [1600, 0]], P.ink, A.px(c, 3));
    const x1 = A.lerp(900, 150, drag) + back * 700;
    V.arv(c, A.lerp(900 + 320, 150 + 320, drag) - back * 0, 0, 1, { a: 1 - back });
    V.tank(c, x1, 0, 1, { ph: x1 * 1.2 });
    // cờ lê khi sửa
    const fix = A.win(t, 341.5, 343.3, 0.2, 0.2);
    if (fix > 0) halo(c, 150, -50, 150, 80, fix, P.sky, 6);
    c.restore();
    // làn dưới: bỏ lại, mất hẳn
    c.save(); c.translate(0, 0);
    const gone = A.sm(t, Q.abandoned + 0.5, Q.abandoned + 2.5);
    V.tank(c, 900, 0, 1, { a: 1 - gone * 0.9 });
    if (t > Q.abandoned) F.smoke(c, 900, -90, t - Q.abandoned, 1.1, 6, '#555b64', 14);
    c.restore();
    K.end(c);
    // dấu hiệu: quay lại / mất
    if (t > Q.abandoned + 1.2) { const [sx, sy] = K.toScreen(cam, 900, -70); U.xMark(c, sx, sy, 50, A.eo(t, Q.abandoned + 1.2, Q.abandoned + 1.8), P.enemy, 10); }
  }
}
