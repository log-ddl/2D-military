// scenes/sc07.ts — Chương 3, Shot 3.2 (194.50 – 216.80s)
// Góc TOP-DOWN Mặt cắt ngang lòng khoang: Hai dải ghế lưới nylon đỏ mở ra dọc vách cách nhiệt,
// hàng chục lính dù ngồi vai kề vai, đầu gối ép sát chiếc xe thiết giáp chằng 8 sợi xích thép ở lối đi giữa.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { ch3StateAt } from './_state';
import {
  drawArmoredVehicle,
  drawSoldier,
  lw,
} from './_assets';

const camCabinWide: K.Cam = { x: 0, y: 0, z: 1.65 };
const camChainsTight: K.Cam = { x: 10, y: 0, z: 1.98 };

const camTrack: [number, K.Cam][] = [
  [194.50, camCabinWide],
  [208.50, camCabinWide],
  [211.80, camChainsTight],
  [216.80, camChainsTight],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = ch3StateAt(t);
    let cam = K.track(t, camTrack, A.eio);
    if (t >= CUE.ch3_chains_hope) {
      cam = K.handheld(cam, t * 2.5, 4);
    }

    A.clear(c, P.bg2);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    // 1. Thân máy bay C-17 nhìn từ trên xuống (TOP-DOWN), mở toang toàn bộ nóc khoang
    A.rrect(c, -480, -175, 960, 350, 48, P.olive, P.ink, outW);
    // Lớp chăn cách nhiệt trần trụi dọc hai bên vách (bare insulation blankets)
    A.rrect(c, -440, -148, 880, 296, 16, P.bg2, P.ink, outW);
    // Sàn khoang kim loại có 2 ray con lăn và lưới khuyên chằng buộc
    A.rrect(c, -425, -124, 850, 248, 8, P.paper, P.ink, inW);
    for (let gx = -390; gx <= 390; gx += 65) {
      A.line(c, [[gx, -122], [gx, 122]], P.light, inW * 0.7);
      for (const gy of [-68, 68]) {
        A.circle(c, gx, gy, 4.5, P.slate, P.ink, inW * 0.7);
      }
    }

    // 2. Hai dải ghế lưới nylon màu đỏ (Red nylon webbing seats) lật mở dọc hai vách trên/dưới
    const seatW = A.lerp(6, 34, st.seatUnfold);
    for (let sx = -385; sx <= 345; sx += 46) {
      // Hàng ghế vách trên
      A.rrect(c, sx, -122, 40, seatW, 4, P.enemy, P.ink, inW);
      A.line(c, [[sx + 20, -122], [sx + 20, -122 + seatW]], P.enemyLight, inW * 0.7);
      // Hàng ghế vách dưới
      A.rrect(c, sx, 122 - seatW, 40, seatW, 4, P.enemy, P.ink, inW);
      A.line(c, [[sx + 20, 122 - seatW], [sx + 20, 122]], P.enemyLight, inW * 0.7);
    }

    // 3. Hàng chục lính dù ngồi vai kề vai (shoulder to shoulder), đầu gối hướng vào giữa khoang
    if (st.troopsSeated > 0.01) {
      let idx = 0;
      for (let sx = -365; sx <= 365; sx += 46) {
        const localP = A.clamp01(st.troopsSeated * 1.4 - idx * 0.04);
        idx++;
        if (localP <= 0) continue;
        A.withA(c, localP, () => {
          // Lính ngồi hàng trên (quay mặt xuống y = 0)
          drawSoldier(c, sx, -94, { view: 'top', scale: 1.35, color: P.olive });
          // Đầu gối nhô về phía lối đi giữa
          A.circle(c, sx - 5, -76, 4.5, P.oliveDark, P.ink, inW * 0.7);
          A.circle(c, sx + 5, -76, 4.5, P.oliveDark, P.ink, inW * 0.7);

          // Lính ngồi hàng dưới (quay mặt lên y = 0)
          drawSoldier(c, sx, 94, { view: 'top', scale: 1.35, color: P.olive });
          A.circle(c, sx - 5, 76, 4.5, P.oliveDark, P.ink, inW * 0.7);
          A.circle(c, sx + 5, 76, 4.5, P.oliveDark, P.ink, inW * 0.7);
        });
      }
    }

    // 4. Chiếc xe thiết giáp chằng xích thép nằm ngay lối đi giữa (center aisle)
    const vehEnter = A.sm(t, 206.0, 208.2);
    A.withA(c, vehEnter, () => {
      // 8 sợi xích thép (steel chains) chằng chéo từ 4 góc xe thiết giáp ra các khuyên sàn
      const hiChain = A.sm(t, CUE.ch3_chains_hope - 0.2, CUE.ch3_chains_hope + 0.6);
      const chainCol = hiChain > 0.1 ? A.lerpColor(P.dark, P.amber, hiChain) : P.dark;
      const chains: [A.Pt, A.Pt][] = [
        [[-105, -42], [-195, -68]],
        [[-85, -42], [-130, -68]],
        [[85, -42], [130, -68]],
        [[105, -42], [195, -68]],
        [[-105, 42], [-195, 68]],
        [[-85, 42], [-130, 68]],
        [[85, 42], [130, 68]],
        [[105, 42], [195, 68]],
      ];
      for (const [c0, c1] of chains) {
        A.line(c, [c0, c1], chainCol, lw(c, 4.5), [8, 5]);
        A.circle(c, c1[0], c1[1], 6.5, P.amber, P.ink, inW);
      }

      drawArmoredVehicle(c, 0, 0, {
        kind: 'ifv',
        view: 'top',
        scale: 1.75,
      });
    });

    K.end(c);
  }
}
