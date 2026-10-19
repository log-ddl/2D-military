// sc05.ts — Chương 2 (113.80–135.80s): Góc nhìn TOP mặt cắt ngang đặt cạnh nhau (Plan-view Cutaway Comparison):
// Vì sao bỏ pháo nặng & giỏ tháp pháo sâu lại biến lòng APC thành một "hang chữ nhật sạch sẽ" (clean rectangular cavern)?
// Bên trái: IFV bị vòng giỏ tháp pháo lớn choán giữa khoang, chỉ nhét được 6 lính.
// Bên phải: APC mở thông khoang chữ nhật, xếp dọc hai vách 9–12 lính + tên lửa chống tăng, đạn cối, cáng, can nước.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    const cam = K.track(
      t,
      [
        [113.8, { x: -15, y: 0, z: 1.24 }],
        [122.0, { x: -15, y: 0, z: 1.24 }],
        [127.5, { x: 45, y: 0, z: 1.28 }],
        [135.8, { x: 65, y: 0, z: 1.28 }],
      ],
      A.eio,
    );

    K.begin(c, cam);

    // ── 1. BÊN TRÁI (x = -410): XE CHIẾN ĐẤU BỘ BINH (IFV) CÓ GIỎ THÁP PHÁO LỚN Ở GIỮA ──
    c.save();
    c.translate(-410, 0);
    // Bánh xích hai bên
    A.rrect(c, -265, -148, 530, 38, 8, P.dark, P.ink, LINE.outer);
    A.rrect(c, -265, 110, 530, 38, 8, P.dark, P.ink, LINE.outer);
    // Thân giáp IFV
    A.rrect(c, -250, -118, 500, 236, 14, P.olive, P.ink, LINE.outer);
    // Lòng xe
    A.rrect(c, -226, -96, 452, 192, 8, P.paper, P.ink, LINE.inner);
    // Khoang động cơ trước (bên phải trên)
    A.rrect(c, 85, -86, 130, 96, 6, P.slate, P.ink, LINE.inner);
    // Ghế lái xe (bên phải dưới)
    A.circle(c, 135, 52, 20, P.oliveDark, P.ink, LINE.inner);

    // Vòng tháp pháo & Giỏ tháp pháo sâu (Deep turret basket) choán trọn giữa khoang!
    const basketPulse = 1 + 0.04 * Math.sin(t * 5);
    c.save();
    c.translate(-15, 0);
    c.scale(basketPulse, basketPulse);
    A.circle(c, 0, 0, 88, P.amber, P.ink, LINE.outer);
    A.circle(c, 0, 0, 62, P.oliveLight, P.ink, LINE.inner);
    // Nòng pháo lớn chỉ sang phải
    A.capsule(c, [40, 0], [215, 0], 20, P.dark, P.ink, LINE.outer);
    c.restore();

    // 6 người lính bị ép chật cứng ở góc đuôi xe ("Where an IFV squeezes six or eight soldiers around a central turret ring")
    const ifvSeats: [number, number][] = [
      [-196, -62],
      [-152, -62],
      [-108, -62],
      [-196, 62],
      [-152, 62],
      [-108, 62],
    ];
    ifvSeats.forEach(([sx, sy], idx) => {
      const pS = A.sm(t, 121.6 + idx * 0.2, 122.2 + idx * 0.2);
      A.withA(c, pS, () => {
        A.circle(c, sx, sy, 19, P.olive, P.ink, LINE.inner);
        A.circle(c, sx, sy, 9, P.oliveDark, null, 0);
      });
    });
    c.restore();

    // ── 2. BÊN PHẢI (x = +380): XE BỌC THÉP CHỞ QUÂN (APC) — "CLEAN RECTANGULAR CAVERN" ──
    c.save();
    c.translate(380, 0);
    // Bánh xích / khung ngoài cùng cỡ
    A.rrect(c, -265, -148, 530, 38, 8, P.dark, P.ink, LINE.outer);
    A.rrect(c, -265, 110, 530, 38, 8, P.dark, P.ink, LINE.outer);
    A.rrect(c, -250, -118, 500, 236, 14, P.olive, P.ink, LINE.outer);

    // Khoang động cơ nhỏ gọn phía mũi phải + Ghế lái
    A.rrect(c, 110, -96, 118, 88, 6, P.slate, P.ink, LINE.inner);
    A.circle(c, 155, 52, 20, P.oliveDark, P.ink, LINE.inner);

    // Khoang chữ nhật rộng thênh thang mở ra ("its interior opens up into a clean rectangular cavern" @ 118.30s)
    const cavernP = A.eio(t, 116.5, 119.5);
    const cavW = A.lerp(180, 326, cavernP);
    A.rrect(c, -226, -96, cavW, 192, 8, P.paper, P.ink, LINE.outer);

    // Từ 114.0–117.5s: bóng mờ của giỏ tháp pháo bị gạch bỏ và biến mất để lộ khoang chữ nhật sạch sẽ
    const ghostTurretA = 1 - A.sm(t, 116.8, 118.4);
    if (ghostTurretA > 0.01) {
      A.withA(c, ghostTurretA * 0.65, () => {
        A.circle(c, -45, 0, 82, P.amber, P.ink, LINE.inner);
        U.xMark(c, -45, 0, 52, A.sm(t, 114.8, 115.8), P.enemy, 7);
      });
    }

    // Hai băng ghế dài dọc theo vách ("seats nine to 12 riflemen along the walls" @ 126.48s)
    const benchP = A.sm(t, 119.2, 120.8);
    A.withA(c, benchP, () => {
      A.rrect(c, -216, -88, 306, 34, 4, P.sand, P.ink, LINE.inner);
      A.rrect(c, -216, 54, 306, 34, 4, P.sand, P.ink, LINE.inner);
    });

    // 12 người lính (6 mỗi bên vách) lần lượt hiện ra ngồi thoải mái dọc hai bên
    for (let i = 0; i < 6; i++) {
      const sx = -192 + i * 52;
      const pTop = A.sm(t, 126.2 + i * 0.18, 126.8 + i * 0.18);
      const pBot = A.sm(t, 126.3 + i * 0.18, 126.9 + i * 0.18);
      if (pTop > 0.01) {
        A.withA(c, pTop, () => {
          A.circle(c, sx, -66, 19, P.olive, P.ink, LINE.inner);
          A.circle(c, sx, -66, 9, P.oliveDark, null, 0);
        });
      }
      if (pBot > 0.01) {
        A.withA(c, pBot, () => {
          A.circle(c, sx, 66, 19, P.olive, P.ink, LINE.inner);
          A.circle(c, sx, 66, 9, P.oliveDark, null, 0);
        });
      }
    }

    // Trang bị xếp dọc lối đi giữa (130.98–135.58s):
    // 1) Tên lửa chống tăng (Anti-tank missiles @ 130.98s)
    const pAtgm = A.sm(t, CUE.missiles_mortars_stretchers, CUE.missiles_mortars_stretchers + 0.8);
    if (pAtgm > 0.01) {
      A.withA(c, pAtgm, () => {
        A.rrect(c, -206, -34, 88, 18, 4, P.oliveDark, P.ink, 2);
        A.poly(c, [[-118, -36], [-104, -25], [-118, -14]], P.enemy, P.ink, 2);
        A.rrect(c, -206, -8, 88, 18, 4, P.oliveDark, P.ink, 2);
        A.poly(c, [[-118, -10], [-104, 1], [-118, 12]], P.enemy, P.ink, 2);
      });
    }

    // 2) Hòm đạn cối dự trữ (Spare mortar rounds @ 133.08s)
    const pMortar = A.sm(t, 132.4, 133.2);
    if (pMortar > 0.01) {
      A.withA(c, pMortar, () => {
        A.rrect(c, -86, -34, 68, 32, 4, P.amber, P.ink, 2);
        for (let k = 0; k < 3; k++) {
          A.circle(c, -70 + k * 18, -18, 6, P.dark, P.ink, 1.5);
        }
      });
    }

    // 3) Cáng cứu thương & Can nước (Stretchers and water cans @ 134.1s)
    const pStretcher = A.sm(t, 133.6, 134.5);
    if (pStretcher > 0.01) {
      A.withA(c, pStretcher, () => {
        // Cáng gấp
        A.line(c, [[-90, 22], [12, 22]], P.ink, 3);
        A.rrect(c, -80, 12, 82, 20, 3, P.sand, P.ink, 2);
        // 2 can nước màu xanh dương nhạt (sky)
        A.rrect(c, 24, -30, 32, 26, 4, P.sky, P.ink, 2);
        A.rrect(c, 24, 4, 32, 26, 4, P.sky, P.ink, 2);
      });
    }

    c.restore();

    K.end(c);

    // Callout số người lính: "6" bên IFV và "12" bên APC đúng lúc voice đọc @123.5s và @129.06s
    const p6 = A.win(t, 122.0, 134.8, 0.35, 0.4);
    if (p6 > 0.01) {
      const pt6 = K.toScreen(cam, -410 - 152, -118);
      U.callout(c, '6', pt6[0], pt6[1] - 50, { to: pt6, p: p6, color: P.enemy, size: 36 });
    }
    const p12 = A.win(t, 127.0, 135.4, 0.35, 0.4);
    if (p12 > 0.01) {
      const pt12 = K.toScreen(cam, 380 - 65, -118);
      U.callout(c, '12', pt12[0], pt12[1] - 50, { to: pt12, p: p12, color: P.oliveDark, size: 36 });
    }
  }
}
