// Chương 8 (367.9 – 408.6): mù. Ánh sáng/radar không xuống được → sonar chủ động lộ mình, bị động chỉ nghe → mảng kéo → lớp nhiệt bẻ âm.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P } from './shared/palette';
import * as S from './_sub';
import { chain } from './_c';

const CUTS = [373.98, 386.8, 393.0, 402.0];

function grid(c: CanvasRenderingContext2D) {
  A.clear(c, '#cde3ee');
  for (let x = 0; x <= A.W; x += 120) A.line(c, [[x, 0], [x, A.H]], 'rgba(60,110,140,0.14)', 2);
  for (let y = 0; y <= A.H; y += 120) A.line(c, [[0, y], [A.W, y]], 'rgba(60,110,140,0.14)', 2);
}

export default class S08 extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number) {
    A.clear(c);
    if (t < 373.98) this.dark(c, t);
    else if (t < 386.8) this.active(c, t);
    else if (t < 393.0) this.passive(c, t);
    else if (t < 402.0) this.arrays(c, t);
    else this.layers(c, t);
    for (const at of CUTS) S.cutDip(c, t, at, 0.12);
    chain(c, t);
  }

  private dark(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 560, z: 0.85 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1200, top: '#dff0f8', bot: '#2c4a63' });
    // chùm sáng từ mặt nước tắt dần theo độ sâu
    const p = A.sm(t, 369.0, 370.4);
    for (let i = 0; i < 5; i++) {
      const x0 = -520 + i * 260, w = 70;
      const g = c.createLinearGradient(0, 0, 0, 700);
      g.addColorStop(0, `rgba(255,248,200,${0.55 * p})`); g.addColorStop(1, 'rgba(255,248,200,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, 0); c.lineTo(x0 + w, 0); c.lineTo(x0 + w - 80, 700); c.lineTo(x0 - 80, 700); c.closePath(); c.fill();
    }
    // radar từ tàu mặt nước chạm mặt nước rồi dừng
    const rp = A.sm(t, 371.2, 372.0);
    drawShipSide(c, 520, 0);
    if (rp > 0) {
      for (let i = 0; i < 3; i++) { const ph = ((t * 0.8) + i / 3) % 1; A.withA(c, rp * (1 - ph), () => { c.beginPath(); c.arc(520, -70, 40 + 220 * ph, Math.PI * 1.1, Math.PI * 1.9); c.strokeStyle = P.slate; c.lineWidth = A.px(c, 4); c.stroke(); }); }
      A.withA(c, rp, () => { for (let i = 0; i < 4; i++) S.arrowW(c, [380 + i * 80, 10], [380 + i * 80, 120], 1, P.slate, 4, 12); U.xMark(c, 520, 140, 40, A.sm(t, 372.0, 372.8), P.enemy, A.px(c, 8)); });
    }
    S.drawSubSide(c, t, { x: -180, y: 700, s: 0.8, cut: 0.0, prop: t * 2 });
    K.end(c);
  }

  private active(c: CanvasRenderingContext2D, t: number) {
    grid(c);
    const us: A.Pt = [520, 560], tg: A.Pt = [1260, 380], e1: A.Pt = [1560, 840], e2: A.Pt = [1620, 190];
    S.drawSubTop(c, t, { x: us[0], y: us[1], s: 0.42 });
    S.drawSubTop(c, t, { x: tg[0], y: tg[1], s: 0.42, color: P.enemy, rot: Math.PI * 0.9 });
    S.drawSubTop(c, t, { x: e1[0], y: e1[1], s: 0.42, color: P.enemy, rot: -0.7 });
    S.drawSubTop(c, t, { x: e2[0], y: e2[1], s: 0.42, color: P.enemy, rot: 2.4 });
    const T0 = 377.9, V = 360;       // đi đồng đều
    const R = (t - T0) * V;
    // sóng ping đi ra
    for (let k = 0; k < 2; k++) {
      const r = R - k * 1.6 * V;
      if (r > 0 && r < 1500) A.withA(c, 1 - r / 1500, () => A.circle(c, us[0], us[1], r, null, P.enemy, 7));
    }
    // tiếng vọng từ mục tiêu về
    const dT = Math.hypot(tg[0] - us[0], tg[1] - us[1]);
    const re = R - dT;
    if (re > 0 && re < dT) A.withA(c, 1 - re / dT * 0.4, () => A.circle(c, tg[0], tg[1], re, null, P.amber, 6));
    if (R > dT) A.withA(c, A.sm(R, dT, dT + 60), () => U.crosshair(c, tg[0], tg[1], 52, P.amber, 1, t));
    // "mọi người đều biết": các tàu kia bắt được xung
    for (const e of [e1, e2]) {
      const d = Math.hypot(e[0] - us[0], e[1] - us[1]);
      if (R > d) A.withA(c, A.sm(R, d, d + 40), () => { U.circleMark(c, e[0], e[1], 90, 1, P.enemy, 9); S.waves(c, e[0], e[1], t, { R: 160, n: 2, per: 1.0, color: P.enemy, w: 4 }); });
    }
    // chấm hướng về phía ta từ hai kẻ nghe
    const fin = A.sm(t, 383.2, 384.4);
    if (fin > 0) { for (const e of [e1, e2, tg]) S.arrowW(c, [e[0] - 80 * Math.sign(e[0] - us[0]), e[1] - 40 * Math.sign(e[1] - us[1])], [us[0] + 90, us[1] + (e[1] - us[1]) * 0.1], fin, P.enemy, 5, 18); }
  }

  private passive(c: CanvasRenderingContext2D, t: number) {
    grid(c);
    const us: A.Pt = [620, 560], tg: A.Pt = [1380, 380];
    S.drawSubTop(c, t, { x: us[0], y: us[1], s: 0.42 });
    S.drawSubTop(c, t, { x: tg[0], y: tg[1], s: 0.42, color: P.enemy, rot: Math.PI * 0.9 });
    // chỉ có sóng yếu từ mục tiêu tới ta; ta không phát gì
    for (let i = 0; i < 4; i++) { const ph = (((t - 386.8) * 0.45) + i / 4) % 1; A.withA(c, 0.85 * (1 - ph), () => A.circle(c, tg[0], tg[1], 40 + 900 * ph, null, P.ink2, 4)); }
    // nón nghe quanh mũi
    const a = Math.atan2(tg[1] - us[1], tg[0] - us[0]);
    A.withA(c, A.sm(t, 388, 389), () => {
      c.save(); c.translate(us[0], us[1]);
      c.beginPath(); c.moveTo(0, 0); c.arc(0, 0, 360, a - 0.28, a + 0.28); c.closePath();
      c.fillStyle = 'rgba(22,163,74,0.18)'; c.fill(); c.strokeStyle = '#16a34a'; c.lineWidth = 4; c.stroke();
      c.restore();
    });
    // người chỉ huy phát ping = chấm đỏ chói: gạch bỏ
    A.withA(c, A.sm(t, 389.2, 390.0), () => { U.ring(c, us[0], us[1], 150, 0.5, P.enemy, 6); U.xMark(c, us[0], us[1], 70, A.sm(t, 389.6, 390.4), P.enemy, 9); });
  }

  private arrays(c: CanvasRenderingContext2D, t: number) {
    grid(c);
    const x = 1150, y = 520, s = 0.9, tow = 520;
    // nguồn ở xa phía sau-trái
    const src: A.Pt = [160, 760];
    for (let i = 0; i < 4; i++) { const ph = (((t - 393) * 0.4) + i / 4) % 1; A.withA(c, 0.8 * (1 - ph), () => A.circle(c, src[0], src[1], 60 + 1100 * ph, null, P.ink2, 4)); }
    A.circle(c, src[0], src[1], 14, P.enemy, P.ink, 3);
    S.drawSubTop(c, t, { x, y, s, tow: tow / s, towPhase: t * 1.2 });
    // mảng gắn thân: cung quanh mũi
    const ap = A.sm(t, 394.0, 394.8);
    A.withA(c, ap, () => {
      for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(x + 300 * s, y, 90 + i * 26, -0.9, 0.9); c.strokeStyle = '#16a34a'; c.lineWidth = 7; c.stroke(); }
    });
    // dây thuỷ âm kéo: nhấn khi nhắc "cáp dài"
    const tp = A.sm(t, 397.6, 398.6);
    A.withA(c, tp, () => { U.circleMark(c, x - 300 * s - tow * 0.55, y, 70, 1, '#16a34a', 7); });
  }

  private layers(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 520, z: 0.9 };
    K.begin(c, cam);
    S.sea(c, cam, 0, t, { deep: 1400 });
    const v = K.view(cam, 40);
    // các lớp nhiệt
    const bands: [number, number, string][] = [[0, 360, 'rgba(250,200,120,0.18)'], [360, 520, 'rgba(120,180,230,0.20)'], [520, 1400, 'rgba(60,110,190,0.20)']];
    for (const [a, b, col] of bands) { c.fillStyle = col; c.fillRect(v.x0, a, v.x1 - v.x0, b - a); }
    for (const yy of [360, 520]) A.line(c, [[v.x0, yy], [v.x1, yy]], 'rgba(30,60,100,0.4)', A.px(c, 3), [20, 14]);
    // ta (phải): đang nghe; kẻ lạ (trái): vùng khuất bóng
    const us: A.Pt = [-520, 330], en: A.Pt = [520, 650];
    S.drawSubSide(c, t, { x: us[0], y: us[1], s: 0.55, cut: 0, prop: t });
    c.save(); c.translate(en[0], en[1]); c.scale(-1, 1); c.translate(-en[0], -en[1]);
    S.drawSubSide(c, t, { x: en[0], y: en[1], s: 0.55, cut: 0 });
    c.restore();
    // tia âm từ kẻ lạ cong xuống, không tới ta
    const pr = A.sm(t, 402.8, 404.0);
    for (let i = 0; i < 7; i++) {
      const ang = -0.25 + i * 0.11;          // góc ban đầu, so với phương ngang đi sang trái
      const pts: A.Pt[] = [];
      for (let k = 0; k <= 40; k++) {
        const u = (k / 40) * pr;
        const dx = -u * 1500;
        pts.push([en[0] + dx - 0, en[1] - Math.sin(ang) * (-dx) * 0.55 + (dx * dx) * 0.00022 * (ang > 0 ? 1 : 1.3)]);
      }
      A.line(c, pts, 'rgba(180,73,60,0.8)', A.px(c, 4), [10, 8]);
    }
    A.withA(c, A.sm(t, 405.2, 406.0), () => { U.circleMark(c, us[0], us[1] + 10, 120, 1, '#16a34a', A.px(c, 7)); });
    K.end(c);
  }
}

function drawShipSide(c: CanvasRenderingContext2D, x: number, y: number) {
  c.save(); c.translate(x, y);
  A.poly(c, [[-120, -30], [100, -30], [140, -50], [120, 6], [-110, 6]], P.slate, P.ink, A.px(c, 4));
  A.rrect(c, -30, -64, 70, 36, 4, P.paper, P.ink, A.px(c, 3));
  A.line(c, [[10, -64], [10, -96]], P.ink, A.px(c, 4));
  c.restore();
}
