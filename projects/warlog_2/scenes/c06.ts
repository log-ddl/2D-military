// Chương 6 · 215.42–238.68 · Rút ngắn quãng đường.
// 215.4–218 TOP đầu mối đường sắt dịch tới · 218–224 SIDE cắt lớp: ống dầu dưới biển (Channel) ·
// 224–227.7 SIDE xe tải đốt vs ống không đốt · 227.7–234.4 TOP kho nhảy cóc theo mặt trận · 234.4–238.7 TOP đơn vị chờ quyết định.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as M from './shared/map';
import * as U from './shared/ui';
import * as S from './_assets';
import * as Cm from './_common';
import { P } from './shared/palette';

const INK = S.INK;
type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];

export default class C06 extends CanvasScene {
  protected draw(c: Ctx, t: number) {
    A.clear(c);
    if (t < 218.1) this.s1(c, t);
    else if (t < 224.0) this.s2(c, t);
    else if (t < 227.7) this.s3(c, t);
    else this.s4(c, t);
  }

  private s1(c: Ctx, t: number) {
    const cam: K.Cam = { x: 640, y: 0, z: 1.05 };
    K.begin(c, cam);
    const v = K.view(cam, 200);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
    M.forest(c, 100, 330, 200, 3); M.forest(c, 900, -330, 210, 6); M.hill(c, 1500, 300, 220, 4, 4);
    const FRONT = 1450;
    const xr = A.lerp(-100, 760, A.eio(t, 215.5, 217.9));
    // đường bộ từ đầu mối tới mặt trận (ngắn dần)
    S.roadLine(c, [[xr, 0], [FRONT, 0]], 44);
    S.railLine(c, [[-1300, 0], [xr, 0]], 22);
    // đoạn ray phía trước bị hỏng: nét đứt cho tới đầu mối mới
    A.rrect(c, xr - 30, -46, 110, 92, 6, P.light, INK, A.px(c, 3.4));
    S.trainTop(c, xr - 150, 0, 1.0, { wagons: 2, load: 1 });
    // xe tải chạy đoạn còn lại
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.12) + i / 4) % 1;
      const out = u < 0.5;
      const k = out ? u / 0.5 : (u - 0.5) / 0.5;
      const x = out ? A.lerp(xr + 70, FRONT - 70, k) : A.lerp(FRONT - 70, xr + 70, k);
      S.truckTop(c, x, out ? -20 : 20, 1.2, { ang: out ? 0 : Math.PI, load: out ? 1 : 0, kind: 'fuel', body: out ? P.olive : P.slate });
    }
    M.unit(c, FRONT + 160, 0, 'armor', 'ally', 260);
    Cm.dimLine(c, xr + 40, FRONT, -170, 1, P.ink, 9);
    K.end(c);
  }

  // cắt lớp biển: nước, đáy biển, ống nằm dưới đáy; tàu thả ống ở trên
  private s2(c: Ctx, t: number) {
    A.clear(c, '#f4f8fb');
    const sea = 430;
    // đất (trái và phải)
    c.fillStyle = '#dfe6d2';
    c.beginPath(); c.moveTo(0, 480); c.lineTo(360, 480); c.lineTo(520, 760); c.lineTo(1400, 760); c.lineTo(1560, 480); c.lineTo(1920, 480); c.lineTo(1920, 1080); c.lineTo(0, 1080); c.closePath(); c.fill();
    A.line(c, [[0, 480], [360, 480], [520, 760], [1400, 760], [1560, 480], [1920, 480]], INK, A.px(c, 4));
    // nước
    c.fillStyle = '#cfe3ee';
    c.beginPath(); c.moveTo(360, sea + 10); for (let x = 360; x <= 1560; x += 30) c.lineTo(x, sea + 10 + Math.sin(x / 80 + t * 1.5) * 5); c.lineTo(1560, 480); c.lineTo(1400, 760); c.lineTo(520, 760); c.lineTo(360, 480); c.closePath(); c.fill();
    A.line(c, (() => { const p: Pt[] = []; for (let x = 360; x <= 1560; x += 30) p.push([x, sea + 10 + Math.sin(x / 80 + t * 1.5) * 5]); return p; })(), '#7fb3cf', A.px(c, 4));
    // hai bờ: Anh trái, Pháp phải; trạm bơm
    A.rrect(c, 150, 380, 140, 100, 4, P.light, INK, A.px(c, 3.4));
    A.rrect(c, 1640, 380, 140, 100, 4, P.light, INK, A.px(c, 3.4));
    A.rrect(c, 290, 430, 40, 20, 3, P.amber, INK, A.px(c, 3));
    // ống: đường theo đáy
    const pipe: Pt[] = [[330, 440], [360, 480], [430, 610], [520, 760], [1400, 760], [1560, 480], [1640, 440]];
    const k = A.eio(t, 218.4, 223.0);
    const seg = S.along(pipe, k);
    // vẽ phần đã thả
    const done: Pt[] = [pipe[0]!];
    let L = 0; const lens: number[] = [];
    for (let i = 1; i < pipe.length; i++) { const d = Math.hypot(pipe[i]![0] - pipe[i - 1]![0], pipe[i]![1] - pipe[i - 1]![1]); lens.push(d); L += d; }
    let s = k * L;
    for (let i = 0; i < lens.length; i++) { if (s >= lens[i]!) { done.push(pipe[i + 1]!); s -= lens[i]!; } else { const u = s / lens[i]!; done.push([A.lerp(pipe[i]![0], pipe[i + 1]![0], u), A.lerp(pipe[i]![1], pipe[i + 1]![1], u)]); break; } }
    A.line(c, done, INK, A.px(c, 20));
    A.line(c, done, '#e5e9ee', A.px(c, 12));
    // nhiên liệu chảy trong ống sau khi ống hoàn tất
    const flow = A.sm(t, 223.0, 223.8);
    if (flow > 0) for (let i = 0; i < 16; i++) { const u = (t * 0.18 + i / 16) % 1; const [x, y] = S.along(pipe, u); A.circle(c, x, y, 5, P.amber, null, 0); }
    // tàu thả ống bên trên
    const sx = seg[0];
    Cm.sea(c, 0, 0, 0, 0);
    S.shipSide(c, sx, sea + 12, 0.55, { load: 0, bob: Math.sin(t * 1.5) * 3 });
    A.line(c, [[sx - 60, sea - 14], [seg[0], seg[1]]], 'rgba(30,41,59,0.5)', A.px(c, 3), [8, 8]);
    // đáy: vài dấu cho biết đây là mặt cắt
    for (let i = 0; i < 8; i++) A.line(c, [[560 + i * 110, 830 + (i % 2) * 14], [590 + i * 110, 830 + (i % 2) * 14]], 'rgba(30,41,59,0.25)', A.px(c, 3));
  }

  // xe tải đốt nhiên liệu dọc đường vs ống không đốt gì
  private s3(c: Ctx, t: number) {
    A.clear(c, '#f4f8fb');
    const lane1 = 420, lane2 = 830;
    c.fillStyle = '#e3e9ee'; c.fillRect(0, lane1, 1920, 140); c.fillRect(0, lane2 - 40, 1920, 150);
    A.line(c, [[0, lane1], [1920, lane1]], INK, A.px(c, 4));
    A.line(c, [[0, lane2 - 40], [1920, lane2 - 40]], INK, A.px(c, 4));
    // làn xe tải: xe chạy, khói, giọt nhiên liệu "đốt"
    for (let i = 0; i < 3; i++) {
      const x = ((t * 190 + i * 700) % 2600) - 340;
      Cm.exhaust(c, x - 125, lane1 - 98, t + i, 1, 1.1);
      S.truckSide(c, x, lane1, 1.1, { tank: 0.9 - 0.25 * ((x + 340) / 2600), ph: x / 24 });
    }
    // làn ống: ống nằm ngang, hạt nhiên liệu chảy, không khói
    A.line(c, [[0, lane2 + 12], [1920, lane2 + 12]], INK, A.px(c, 38));
    A.line(c, [[0, lane2 + 12], [1920, lane2 + 12]], '#e5e9ee', A.px(c, 28));
    for (let i = 0; i < 22; i++) A.circle(c, ((t * 190 + i * 100) % 2200) - 140, lane2 + 12, 8, P.amber, null, 0);
    // trạm bơm ở hai đầu
    A.rrect(c, 60, lane2 - 108, 150, 100, 4, P.light, INK, A.px(c, 3.4));
    A.rrect(c, 1710, lane2 - 108, 150, 100, 4, P.light, INK, A.px(c, 3.4));
  }

  // kho nhảy cóc: mặt trận dịch phải, kho dịch theo, đoạn đường vẫn ngắn
  private s4(c: Ctx, t: number) {
    const f = A.keys(t, [[227.7, 900], [231.0, 1900], [234.0, 2900], [238.7, 3100]]);
    const camX = f - 260;
    const cam: K.Cam = { x: camX + 40, y: 0, z: 1.12 };
    K.begin(c, cam);
    const v = K.view(cam, 300);
    c.fillStyle = S.TOPBG; c.fillRect(v.x0, v.y0, v.x1 - v.x0, v.y1 - v.y0);
    S.topBg(c, cam, 220, 'rgba(0,0,0,0)');
    for (let i = 0; i < 14; i++) { if (i % 2) M.forest(c, 300 + i * 420, (i % 3 - 1) * 330 + 20, 170, i); else M.hill(c, 300 + i * 420, (i % 3 - 1) * 300, 190, 4, i); }
    // đường chính cả chặng
    S.roadLine(c, [[-200, 0], [3900, 0]], 44);
    // các kho: ba vị trí, kho "sống" là kho gần mặt trận nhất; kho cũ để lại (mờ) → nhảy cóc
    const dep = [700, 1500, 2300, 2800];
    const alive = (i: number) => (i === 0 ? t < 229.4 : i === 1 ? t >= 229.4 && t < 232.0 : i === 2 ? t >= 232.0 && t < 234.4 : t >= 234.4);
    dep.forEach((x, i) => {
      const spawn = [227.7, 229.4, 232.0, 234.4][i]!;
      if (t < spawn - 0.1) return;
      const a = alive(i) ? 1 : 0.28;
      const k = i === 0 ? 1 : A.eo(t, spawn, spawn + 0.8);
      S.depotTop(c, x, 0, 1.55, { a: a * k, fill: alive(i) ? 1 : 0.1 });
    });
    // xe tải: hop ngắn giữa kho sống và mặt trận
    const di = [0, 1, 2, 3].filter(alive)[0] ?? 3;
    const dx = dep[di]!;
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.35) + i / 4) % 1;
      const out = u < 0.5, k = out ? u / 0.5 : (u - 0.5) / 0.5;
      const x1 = dx + 190, x2 = f - 180;
      const x = out ? A.lerp(x1, x2, k) : A.lerp(x2, x1, k);
      S.truckTop(c, x, out ? -18 : 18, 1.15, { ang: out ? 0 : Math.PI, load: out ? 1 : 0, kind: (['fuel', 'ammo', 'cargo', 'water'] as S.CrateKind[])[i], body: out ? P.olive : P.slate });
    }
    // mặt trận
    M.unit(c, f + 40, -230, 'armor', 'ally', 250); M.unit(c, f + 40, 220, 'mech', 'ally', 250); M.unit(c, f + 40, 0, 'inf', 'ally', 230);
    M.unit(c, f + 600, -140, 'armor', 'foe', 220); M.unit(c, f + 600, 150, 'inf', 'foe', 210);
    // quãng ngắn: giữ nguyên
    Cm.dimLine(c, dx + 150, f - 140, -200, 1, P.ink, 9);
    // 234.4–238.7: câu hỏi mở — đơn vị gửi/chờ; vòng nhấn quanh các đơn vị
    if (t > 235.4) {
      const k = A.win(t, 235.4, 238.7, 0.5, 0.2);
      A.withA(c, k, () => {
        for (const y of [-230, 0, 220]) A.circle(c, f + 40, y, 170 + 14 * Math.sin(t * 5 + y), null, P.amber, A.px(c, 7));
        M.unit(c, dx - 20, -240, 'hq', 'ally', 230);
      });
    }
    K.end(c);
    void U;
  }
}
