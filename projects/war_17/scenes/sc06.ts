// sc06.ts — Chương 2 (135.80–157.04s): Chiếc M113 kinh điển của Mỹ (1960) —
// Từ ngoài trông như "chiếc hộp giày bằng nhôm trên bánh xích" (aluminum shoebox on tracks),
// nhưng nhờ là một chiếc hộp rỗng có bửng sau lớn (big ramp at the back),
// nó nuốt trọn cả tiểu đội + đạn dược cuối tuần mà vẫn đủ nhẹ để băng qua một cây cầu nông thôn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as R from './shared/rig';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { stateAt } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    // Camera: cận chiếc M113 lúc giới thiệu dáng "hộp giày nhôm" và mở bửng nạp quân (135.8..153.0s)
    // -> lùi nhẹ & lia sang phải theo chiếc M113 băng qua cây cầu nông thôn (153.0..157.04s).
    const cam = K.track(
      t,
      [
        [135.8, { x: -210, y: -135, z: 1.52 }],
        [146.0, { x: -235, y: -130, z: 1.48 }],
        [152.5, { x: -220, y: -130, z: 1.44 }],
        [157.04, { x: 260, y: -120, z: 1.18 }],
      ],
      A.eio,
    );

    K.begin(c, cam);

    // Địa hình: bờ đất hai bên + dòng suối nông thôn (x = 40..420) + Cây cầu nông thôn nhỏ (Country bridge)
    V.drawSideGround(c, -1400, 40, 0, 'dirt');
    V.drawSideGround(c, 420, 1400, 0, 'dirt');

    // Lòng suối & mặt nước bên dưới cầu
    A.poly(
      c,
      [
        [40, 0],
        [85, 115],
        [375, 115],
        [420, 0],
      ],
      P.bg2,
      P.ink,
      LINE.outer,
    );
    A.rrect(c, 58, 38, 344, 74, 0, P.sky, null, 0);
    A.line(c, [[56, 38], [404, 38]], P.ink, LINE.inner);

    // Kết cấu cầu gỗ/đá nông thôn bắc qua suối (x = 20..440)
    // Trụ đá hai đầu và giữa suối
    A.rrect(c, 22, -4, 34, 118, 4, P.slate, P.ink, LINE.outer);
    A.rrect(c, 214, 10, 32, 105, 4, P.slate, P.ink, LINE.outer);
    A.rrect(c, 404, -4, 34, 118, 4, P.slate, P.ink, LINE.outer);
    // Mặt cầu và thành lan can gỗ/thép
    A.rrect(c, 15, -16, 430, 18, 3, P.sand, P.ink, LINE.outer);
    for (let bx = 45; bx <= 415; bx += 60) {
      A.line(c, [[bx, -16], [bx, -58]], P.oliveDark, LINE.outer);
    }
    A.line(c, [[35, -54], [425, -54]], P.oliveDark, LINE.outer);

    // Khung nét đứt minh họa "hộp giày bằng nhôm" (aluminum shoebox @ 143.40–145.80s)
    const shoeboxA = A.win(t, 142.8, 146.4, 0.35, 0.35);
    if (shoeboxA > 0.01) {
      A.withA(c, shoeboxA * 0.75, () => {
        c.save();
        c.translate(st.m113BridgeX, 0);
        c.setLineDash([12, 8]);
        A.rrect(c, -182, -198, 368, 134, 6, null, P.amber, 4);
        c.setLineDash([]);
        c.restore();
      });
    }

    // Tiểu đội bộ binh bước lên cầu dẫn bửng sau vào trong khoang M113 (148.5–152.8s)
    const boardP = A.ph(t, 148.4, 152.6);
    if (boardP > 0 && boardP < 1) {
      for (let i = 0; i < 4; i++) {
        const u = A.clamp01(boardP * 1.5 - i * 0.18);
        if (u > 0 && u < 0.95) {
          const sx = st.m113BridgeX + A.lerp(-355, -165, u);
          const sy = A.lerp(0, -68, Math.max(0, (u - 0.45) / 0.55));
          R.rig(c, {
            x: sx,
            y: sy,
            s: 0.88,
            dir: 1,
            skin: 'ally',
            walk: t * 11 + i,
            weapon: 'rifle',
          });
        }
      }
    }

    // Chiếc M113: từ 135.8..146.1s ở góc 'side' để thấy vỏ hộp nhôm,
    // từ 146.1..153.6s mở 'cutaway' + hạ bửng sau để thấy rõ khoang rỗng chứa cả tiểu đội + đạn dược,
    // sau 153.6s đóng bửng chạy qua cầu nông thôn.
    const isCutaway = t >= 146.1 && t <= 154.0;
    const movePh = A.eio(t, 153.2, 157.04) * 28;
    V.drawM113(c, {
      x: st.m113BridgeX,
      y: st.m113BridgeX > 15 && st.m113BridgeX < 440 ? -16 : 0,
      s: 1.15,
      dir: 1,
      view: isCutaway ? 'cutaway' : 'side',
      phase: movePh,
      rampOpen: st.m113Ramp,
    });

    K.end(c);

    // Callout "M113" đúng lúc voice giới thiệu @137.30s
    const pM113 = A.win(t, 136.4, 142.2, 0.35, 0.4);
    if (pM113 > 0.01) {
      const pt = K.toScreen(cam, st.m113BridgeX, -195);
      U.callout(c, 'M113 (1960)', pt[0], pt[1] - 58, {
        to: pt,
        p: pM113,
        color: P.ink,
        size: 34,
      });
    }
  }
}
