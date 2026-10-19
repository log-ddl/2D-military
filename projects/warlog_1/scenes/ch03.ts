// Chương 3 (98.2–140.6): APC. Có phải xe tăng yếu? Không: câu hỏi khác, "tới nơi còn sống".
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import * as R from './shared/rig';
import { P } from './shared/palette';
import * as V from './_assets';
import * as W from './_world';
import { CUE as Q } from './_cue';
import { dip, sideCam, halo, at, type Pt } from './_common';

const TOP_START = Q.arriveAlive - 4.6; // 133.98: sang góc TRÊN để thấy "đường tới đích"

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c);
    if (t < TOP_START) this.side(c, t); else this.top(c, t);
    dip(c, t, TOP_START, 0.18);
  }

  private side(c: CanvasRenderingContext2D, t: number) {
    // cảnh tiếp nối cuối chương 2: xe tải + lính + vùng đỏ → APC chạy vào
    const start = sideCam(640, 2.0, 810);
    const box = sideCam(560, 3.3, 880);        // mặt cắt APC
    const both = sideCam(40, 2.6, 860);        // so sánh xe tải / APC
    const rolling = sideCam(380, 2.0, 810);
    const river = sideCam(700, 1.55, 800);
    const cmp = sideCam(400, 2.0, 810);
    const apcX = A.lerp(430, 1480, A.eio(t, 120.2, 125.4));
    const riverFollow = sideCam(A.clamp(apcX + 120, 700, 1380), 1.55, 800);
    const cam = K.track(t, [
      [98.22, start], [100.8, start], [101.6, box], [108.6, box], [109.2, both], [113.0, both], [113.8, rolling],
      [118.6, rolling], [119.8, sideCam(700, 1.55, 800)], [120.2, sideCam(700, 1.55, 800)],
    ], A.eio);
    let camF = cam;
    if (t >= 120.2) camF = riverFollow;
    if (t >= 125.4) camF = K.mix(riverFollow, cmp, A.eio(t, 125.4, 126.4));
    void camF;
    const cam2 = t >= 120.2 ? camF : cam;
    K.begin(c, cam2);
    const gap = t > 117 && t < 126.5;
    W.sideGround(c, cam2, { scroll: 0, road: true });
    if (gap) W.sideGap(c, 820, 1260, 60, true);

    // ── 98–108: xe chạy vào, mặt cắt, cửa sau
    if (t < 109) {
      const inP = A.eo(t, 98.3, 101.0);
      const ax = 560 - (1 - inP) * 1000;
      // xe tải cũ (cuối chương 2)
      if (t < 101.6) V.truck(c, 520, 0, 1, { load: 'tarp', a: 1 - A.sm(t, 100.4, 101.4) });
      V.apc(c, ax, 0, 1, { ph: ax * 1.2, cut: A.sm(t, 101.3, 103.0), ramp: A.eo(t, 103.4, 104.8), riders: 6 });
      // lính chạy lên cửa sau ở 105–109
      const board = A.ph(t, 105.4, 108.0);
      if (t > 105.2 && t < 109) {
        for (let i = 0; i < 3; i++) {
          const x = A.lerp(ax - 130 - i * 34, ax - 40, A.ph(board * 1.6 - i * 0.22, 0, 1));
          if (A.ph(board * 1.6 - i * 0.22, 0, 1) < 0.96) R.rig(c, { x, y: 0, s: 0.5, walk: t * 9 + i });
        }
      }
    }
    // ── 109–113: pháo nổ trên không; xe tải vs APC
    if (t >= 109 && t < 113.5) {
      const bx = 20, by = -240;
      V.truck(c, -150, 0, 1, { load: 'open' });
      const hit = A.eo(t, 110.7, 111.3);
      for (let i = 0; i < 4; i++) R.rig(c, { x: -200 + i * 24, y: -40, s: 0.4, skin: hit > 0.5 && i % 2 ? { body: '#d58f7c', limb: P.enemy, hat: true } : 'ally' });
      V.apc(c, 190, 0, 1, { cut: 1, riders: 5, spacing: 15 });
      const tP = A.ph(t, 109.9, 110.6);
      if (tP > 0 && tP < 1) F.explosion(c, bx, by, 70, tP);
      // mảnh bay xuống theo nan quạt
      for (let j = 0; j < 17; j++) {
        const ang = Math.PI / 2 + (j - 8) * 0.19;
        const u = A.ph(t, 110.0, 110.9);
        if (u <= 0 || u >= 1) continue;
        const L0 = 40 + u * 330, L1 = L0 - 34;
        const dx = Math.cos(ang), dy = Math.sin(ang);
        // dừng khi chạm mái APC (y≈-60) hoặc xe tải (y≈-70); mảnh trúng APC bật tia lửa
        const stopY = (bx + dx * 400 > 130 && bx + dx * 400 < 270) ? -62 : -78;
        const py = by + dy * L0;
        if (py > stopY) continue;
        A.line(c, [[bx + dx * L1, by + dy * L1], [bx + dx * L0, py]], P.ink, A.px(c, 3));
      }
      F.sparks(c, 190, -64, A.ph(t, 110.6, 111.2), 0.9, -Math.PI / 2, 2.2, 3);
      F.sparks(c, -150, -80, A.ph(t, 110.6, 111.2), 0.9, -Math.PI / 2, 2.2, 5);
      if (hit > 0) U.xMark(c, -176, -90, 14, hit, P.enemy, 5);
    }
    // ── 113.5–119: M113 một mình trên đường
    if (t >= 113.5 && t < 119.5) {
      const x = A.lerp(80, 480, A.eio(t, 113.6, 118.8));
      V.apc(c, x, 0, 1, { ph: x * 1.2, riders: 0 });
    }
    // ── 119.5–126: qua sông, nổi trên mặt nước
    if (t >= 119.5 && t < 126.5) {
      const x = A.lerp(430, 1480, A.eio(t, 120.2, 125.4));
      const inWater = A.sm(x, 800, 880) * (1 - A.sm(x, 1220, 1280));
      const bob = Math.sin(t * 3) * 1.2 * inWater;
      V.apc(c, x, 8 * inWater + bob, 1, { ph: x * 1.2, riders: 0 });
      if (inWater > 0.2) {
        c.save(); c.globalAlpha = 0.55; c.fillStyle = '#bfe3f4';
        c.fillRect(800, 0, 480, 60); c.restore();
        c.strokeStyle = '#7fc4e3'; c.lineWidth = A.px(c, 3);
        c.beginPath(); c.moveTo(800, 2); c.lineTo(1280, 2); c.stroke();
        for (let i = 0; i < 3; i++) F.dust(c, x - 60 - i * 14, 4, ((t * 0.8 + i * 0.3) % 1), 0.5, '#e6f4fa');
      }
      // hàng loạt: xe giống hệt xếp phía sau trên bờ (123.3–125.3)
      for (let i = 0; i < 4; i++) {
        const p = A.back(t, 123.3 + i * 0.35, 123.9 + i * 0.35, 1.3);
        if (t < 123.3 + i * 0.35) continue;
        c.save(); c.translate(40 + i * 130, 0); c.scale(p, p); V.apc(c, 0, 0, 1, { riders: 0, a: 0.95 * (1 - A.sm(t, 125.5, 126.1)) }); c.restore();
      }
    }
    // ── 126–133.9: taxi bọc giáp; không phải xe tăng yếu
    if (t >= 126 && t < TOP_START) {
      const ax = 330, tx = 640;
      V.apc(c, ax, 0, 1, { lamp: A.back(t, Q.taxi, Q.taxi + 0.5, 1.5), riders: 0 });
      // xe tăng mờ đứng cạnh để so: không phải xe tăng yếu
      const gp = A.win(t, Q.weakTank, 133.9, 0.4, 0.4);
      if (gp > 0) {
        V.tank(c, tx, 0, 1, { a: gp * 0.55 });
      }
    }
    K.end(c);
    // dấu "không phải": = bị gạch ở 132.4
    if (t >= Q.weakTank + 1 && t < TOP_START) {
      const [sx, sy] = K.toScreen(cam2, 485, -60);
      const p = A.win(t, Q.weakTank + 1, TOP_START, 0.3, 0.5);
      A.withA(c, p, () => { A.line(c, [[sx - 30, sy - 12], [sx + 30, sy - 12]], P.ink, 9); A.line(c, [[sx - 30, sy + 12], [sx + 30, sy + 12]], P.ink, 9); });
      U.xMark(c, sx, sy, 48, A.eo(t, 132.4, 132.9), P.enemy, 10);
    }
    // nhãn tên: APC / M113 / 1960s
    if (t > 100.0 && t < 101.9) {
      const [sx, sy] = K.toScreen(cam2, 560, -60);
      U.callout(c, 'APC', sx, sy - 190, { to: [sx, sy - 70], p: A.win(t, 100.14, 101.9, 0.3, 0.3), size: 44 });
    }
    if (t > Q.m113 && t < 119.0) {
      const x = A.lerp(80, 480, A.eio(t, 113.6, 118.8));
      const [sx, sy] = K.toScreen(cam2, x, -60);
      U.callout(c, 'M113', sx, sy - 150, { to: [sx, sy - 66], p: A.win(t, Q.m113, 118.9, 0.3, 0.3), size: 44 });
      if (t > 118.3) U.label(c, '1960s', sx, sy - 250, 44, P.ink, A.win(t, 118.34, 119.2, 0.2, 0.3));
    }
    void halo; void at;
  }

  // TRÊN: bản đồ từ điểm xuất phát tới đích, vùng lửa ở giữa
  private top(c: CanvasRenderingContext2D, t: number) {
    const run0 = A.eio(t, 138.0, 139.9);
    const cam: K.Cam = { x: A.lerp(620, 1250, A.eio(t, 137.8, 140.4)), y: 0, z: 1.35 };
    void run0;
    K.begin(c, cam);
    W.topGround(c, cam, { grid: 250, patches: true });
    W.topRoad(c, [[-400, 0], [1900, 0]], 80);
    // vùng lửa địch
    const enemies: Pt[] = [[800, -260], [1180, 250], [1420, -230]];
    const zp = A.sm(t, TOP_START + 0.2, TOP_START + 1.2);
    W.dangerZone(c, 560, -380, 1100, 760, zp * 0.9);
    enemies.forEach((e, i) => {
      A.withA(c, zp, () => {
        A.rrect(c, e[0] - 44, e[1] - 28, 88, 56, 8, P.enemy, P.ink, A.px(c, 3));
        A.circle(c, e[0], e[1], 12, P.enemyLight, P.ink, A.px(c, 2));
        // cung bắn hướng ra đường
        const a0 = Math.atan2(0 - e[1], 640 - e[0]);
        c.fillStyle = 'rgba(180,73,60,0.16)';
        c.beginPath(); c.moveTo(e[0], e[1]); c.arc(e[0], e[1], 420, a0 - 0.5, a0 + 0.5); c.closePath(); c.fill();
      });
      void i;
    });
    // đích bên phải
    A.withA(c, zp, () => { A.rrect(c, 1720, -90, 120, 180, 10, '#d3dbe2', P.ink, A.px(c, 3)); });
    // xe xuất phát
    const run = A.eio(t, 138.0, 139.9);
    const ax = A.lerp(60, 1620, run);
    // xe tăng "thắng trận" làm mờ (135.9–138.3): bắn ổ địch
    const tkP = A.win(t, 135.8, 138.0, 0.4, 0.4);
    if (tkP > 0.01) {
      V.tankTop(c, 300, 150, 1, { a: tkP });
      A.withA(c, tkP, () => {
        F.tracer(c, [440, 130], [790, -240], A.ph(t, 136.2, 137.0), 0.12, P.amber, 6);
        F.tracer(c, [440, 130], [1160, 240], A.ph(t, 137.1, 137.9), 0.12, P.amber, 6);
      });
    }
    V.apcTop(c, ax, 0, 1, { cut: 0.8, riders: 6, ph: ax });
    // lửa địch trượt qua xe nhưng không dừng được
    if (run > 0.1 && run < 0.95) {
      enemies.forEach((e, i) => {
        const u = ((t * 2.2 + i * 0.37) % 1);
        F.tracer(c, e, [ax, 0], u, 0.08, '#d95a48', 4);
      });
    }
    K.end(c);
  }
}
