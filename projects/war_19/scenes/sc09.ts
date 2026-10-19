// scenes/sc09.ts — Chương 4, Shot 4.1 (245.50 – 277.40s)
// Cận cảnh mặt cắt Càng đáp & Nền đất: Bánh xe hẹp áp suất cao của máy bay dân sự đâm thủng lớp vỏ đất sét/bùn,
// trong khi bầu càng phình chứa 12–28 lốp béo áp suất thấp của C-17/An-124 dàn đều tải trọng như chân sâu róm.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { drawCallout, lw } from './_assets';

const camSplitCompare: K.Cam = { x: 0, y: -35, z: 1.48 };
const camFocusPod: K.Cam = { x: 115, y: -45, z: 1.68 };

const camTrack: [number, K.Cam][] = [
  [245.50, camSplitCompare],
  [262.00, camSplitCompare],
  [266.00, camFocusPod],
  [277.40, camFocusPod],
];

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(t, camTrack, A.eio);
    A.clear(c, P.bg);
    K.begin(c, cam);

    const outW = lw(c, LINE.outer);
    const inW = lw(c, LINE.inner);

    const isDirt = A.sm(t, CUE.ch4_mil_mud_clay - 0.3, CUE.ch4_mil_mud_clay + 0.6);
    const civSink = A.eio(t, CUE.ch4_mil_mud_clay + 1.0, CUE.ch4_punch_crust + 0.8);

    // 1. Mặt cắt địa chất bên dưới (y = 0..220)
    // Bên trái (-520..-60): từ bê tông dày chuyển sang đất sét mỏng + bùn sâu
    A.rrect(c, -520, 0, 450, 185, 6, isDirt > 0.5 ? P.sand : P.light, P.ink, outW);
    if (isDirt < 0.5) {
      // Lớp bê tông dày nhiều tầng (several feet thick concrete)
      A.rrect(c, -516, 42, 442, 65, 2, P.slate, P.ink, inW);
      for (let gx = -480; gx <= -100; gx += 60) {
        A.line(c, [[gx, 0], [gx, 42]], P.ink, inW * 0.7);
      }
    } else {
      // Lớp vỏ đất sét mỏng (thin crust) trên nền bùn nhão (mud)
      A.rrect(c, -516, 28, 442, 152, 4, P.oliveDark, P.ink, inW);
      // Vết nứt toác khi bánh xe dân sự đâm thủng vỏ đất
      if (civSink > 0.15) {
        A.poly(c, [
          [-345, 0], [-295, civSink * 56], [-235, 0],
        ], P.dark, P.enemy, outW);
      }
    }

    // Bên phải (-40..540): Đường băng đất sét / bùn lót tấm ghi thép (matted steel planks laid over mud)
    A.rrect(c, -40, 0, 580, 185, 6, P.sand, P.ink, outW);
    A.rrect(c, -36, 32, 572, 148, 4, P.oliveDark, P.ink, inW);
    // Hàng tấm ghi thép đục lỗ trải trên mặt bùn
    for (let px = -25; px <= 465; px += 68) {
      A.rrect(c, px, -8, 62, 10, 2, P.slate, P.ink, inW);
    }

    // 2. Bên trái (x = -290): Càng đáp máy bay dân sự (ít lốp hẹp áp suất cao)
    const sinkY = civSink * 46;
    c.save();
    c.translate(-290, sinkY);
    // Gầm bụng trắng máy bay dân sự
    A.rrect(c, -155, -195, 310, 62, 16, P.white, P.ink, outW);
    A.line(c, [[-150, -155], [150, -155]], P.slate, lw(c, 5));
    // Trụ càng cao + 2 bánh hẹp áp suất cao
    A.rrect(c, -12, -135, 24, 105, 4, P.slate, P.ink, outW);
    A.circle(c, -22, -26, 26, P.dark, P.ink, outW);
    A.circle(c, 22, -26, 26, P.dark, P.ink, outW);
    A.circle(c, -22, -26, 10, P.light, P.ink, inW);
    A.circle(c, 22, -26, 10, P.light, P.ink, inW);
    // Mũi tên áp lực tập trung cực lớn đâm thẳng xuống đất
    const arrowCol = isDirt > 0.5 ? P.enemy : P.amber;
    A.line(c, [[0, -68], [0, 32]], arrowCol, lw(c, 6.5));
    A.poly(c, [[0, 46], [-12, 24], [12, 24]], arrowCol, P.ink, inW);
    c.restore();

    // 3. Bên phải (x = 245): Bầu càng phình (Bulging Pods) + Hàng dài lốp béo áp suất thấp như chân sâu róm
    const milEnter = A.sm(t, CUE.ch4_punch_crust - 0.5, CUE.ch4_punch_crust + 0.8);
    A.withA(c, milEnter, () => {
      c.save();
      c.translate(245, 0);

      // Thân bụng thấp màu olive + Bầu càng phình bên má bụng (hiPods)
      const hiPod = A.win(t, CUE.ch4_bulging_pods - 0.3, 276.8, 0.4, 0.4);
      A.rrect(c, -255, -185, 510, 95, 24, P.olive, P.ink, outW);
      const podFill = hiPod > 0.05 ? A.lerpColor(P.oliveDark, P.amber, hiPod * 0.75) : P.oliveDark;
      A.rrect(c, -225, -118, 450, 58, 26, podFill, P.ink, outW);

      // 7 cặp bánh xe béo áp suất thấp dàn dọc bầu càng (tượng trưng cho 12–28 bánh xe chân sâu róm)
      for (let i = 0; i < 7; i++) {
        const wx = -180 + i * 60;
        // Chuyển động nhún lượn sóng như chân sâu róm ("feet of a caterpillar")
        const wave = Math.sin(t * 7.5 - i * 0.75) * 4.5 * A.sm(t, CUE.ch4_caterpillar - 0.5, CUE.ch4_caterpillar + 0.5);
        const wy = -26 + wave;

        A.rrect(c, wx - 6, -64, 12, 38 + wave, 3, P.dark, P.ink, inW);
        // Lốp béo hơi bẹp ở đáy để tăng diện tích tiếp xúc (wide low-pressure tire)
        A.ellipse(c, wx, wy, 24, 21, 0, P.dark, P.ink, outW);
        A.circle(c, wx, wy, 8.5, P.light, P.ink, inW);

        // Mũi tên phân tán tải trọng nhỏ đều dưới mỗi bánh xe
        A.line(c, [[wx, 0], [wx, 24]], P.sky, lw(c, 3.5));
        A.poly(c, [[wx, 32], [wx - 6, 20], [wx + 6, 20]], P.sky, null, 0);
      }

      c.restore();
    });

    K.end(c);

    // Callout 12–28 TIRES
    const cTires = A.win(t, CUE.ch4_punch_crust + 1.5, 277.0, 0.35, 0.35);
    drawCallout(c, cam, 245, -118, 0, -68, '12–28 TIRES', cTires, P.amber);
  }
}
