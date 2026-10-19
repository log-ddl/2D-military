import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import * as U from './_assets';
import { CUE } from './_cue';

/**
 * sc09 (217.24–252.92s): Chương 3 (Phần 3) — Electronic Protection (Bảo vệ điện tử)
 * Giải thích 3 cơ chế bảo vệ đường truyền giữa Xe chỉ huy (trái) và Tiêm kích (phải) trước trạm gây nhiễu địch (dưới):
 * 1. Frequency Hopping (224.10–231.98s): nhảy tần hàng trăm lần/giây theo mẫu chỉ đồng đội biết.
 * 2. Spread Spectrum / LPI (231.98–240.98s): trải tín hiệu trên dải tần rộng với công suất thấp dưới nền nhiễu.
 * 3. Directional Antenna (240.98–252.92s): định hình búp sóng chỉ nghe hướng đồng đội và triệt tiêu (null) máy gây nhiễu bên sườn.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const cam = K.track(
      t,
      [
        [217.24, { x: 0, y: 10, z: 1.02 }],
        [240.98, { x: 20, y: 20, z: 1.04 }],
        [252.92, { x: 0, y: 10, z: 1.02 }],
      ],
      A.eio
    );

    A.clear(c, P.bg);
    K.begin(c, cam);

    const lwO = A.px(c, LINE.outer);
    const lwI = A.px(c, LINE.inner);

    U.drawSkyEnv(c, cam, { groundY: 320, hills: true });

    const hqPos: A.Pt = [-610, 320];
    const jetPos: A.Pt = [590, -110];
    const jamPos: A.Pt = [40, 320];

    const modeHop =
      A.sm(t, CUE.c3_third_protection, CUE.c3_freq_hop) *
      (1 - A.sm(t, CUE.c3_spread_spectrum - 0.3, CUE.c3_spread_spectrum + 0.3));
    const modeSpread =
      A.sm(t, CUE.c3_spread_spectrum - 0.2, CUE.c3_spread_spectrum + 0.4) *
      (1 - A.sm(t, CUE.c3_antenna_shaped - 0.3, CUE.c3_antenna_shaped + 0.3));
    const modeDir = A.sm(t, CUE.c3_antenna_shaped - 0.2, CUE.c3_antenna_shaped + 0.5);

    // 1. Ba đơn vị tham gia: Xe chỉ huy đồng đội (trái), Tiêm kích đồng đội (phải), Trạm gây nhiễu địch (dưới giữa)
    c.save();
    c.translate(hqPos[0], hqPos[1]);
    U.drawMobileHQ(c, { view: 'side', scale: 1.45, emitting: true });
    c.restore();

    c.save();
    c.translate(jetPos[0], jetPos[1]);
    U.drawStrikeJet(c, { view: 'side', scale: 1.7 });
    c.restore();

    c.save();
    c.translate(jamPos[0], jamPos[1]);
    U.drawGroundStation(c, {
      view: 'side',
      scale: 1.3,
      role: 'jammer',
      team: 'enemy',
      dishAngle: -0.9,
      active: true,
    });
    c.restore();

    // Đường liên lạc đồng đội vượt qua nhiễu
    const hqAnt: A.Pt = [hqPos[0] - 34, hqPos[1] - 140];
    const jetAnt: A.Pt = [jetPos[0] - 90, jetPos[1] + 10];
    const jamAnt: A.Pt = [jamPos[0], jamPos[1] - 115];

    U.drawSignalLink(c, hqAnt, jetAnt, t, {
      color: P.sky,
      mode: 'pulse',
      speed: 2.6,
      progress: 1,
    });

    // 2. KHUNG CƠ CHẾ BẢO VỆ Ở TRUNG TÂM (biến đổi qua 3 cơ chế)
    const bx = -20;
    const by = -115;
    const bw = 640;
    const bh = 280;

    // CƠ CHẾ 1: NHẢY TẦN (FREQUENCY HOPPING: 217.24–231.98s)
    if (modeHop > 0.01) {
      A.withA(c, modeHop, () => {
        A.rrect(c, bx - bw / 2 - 6, by - bh / 2 - 6, bw + 12, bh + 12, 12, P.dark, P.ink, lwO);
        A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 8, P.paper, P.ink, lwI);

        const lanes = 5;
        const pattern = [0, 3, 1, 4, 2, 0, 4, 1];
        const stepIdx = Math.floor(t * 4.5) % pattern.length;
        const activeLane = pattern[stepIdx]!;
        const jammerLane = pattern[(stepIdx + pattern.length - 1) % pattern.length]!; // Jammer luôn chậm 1 nhịp!

        for (let i = 0; i < lanes; i++) {
          const ly = by - 92 + i * 46;
          A.rrect(c, bx - bw / 2 + 24, ly - 16, bw - 48, 32, 6, P.bg2, P.light, lwI);

          // Cổng phát (trái) và cổng thu đồng đội (phải) nhảy đồng bộ sang kênh activeLane
          if (i === activeLane) {
            A.rrect(c, bx - bw / 2 + 32, ly - 13, 84, 26, 4, P.sky, P.ink, lwO);
            A.rrect(c, bx + bw / 2 - 116, ly - 13, 84, 26, 4, P.sky, P.ink, lwO);
            U.drawSignalLink(c, [bx - bw / 2 + 120, ly], [bx + bw / 2 - 120, ly], t, {
              color: P.sky,
              mode: 'pulse',
              speed: 3.5,
              progress: 1,
            });
          }

          // Máy gây nhiễu địch đánh hụt ở kênh vừa nhảy đi
          if (i === jammerLane && t > CUE.c3_freq_hop) {
            A.rrect(c, bx - 70, ly - 13, 140, 26, 4, 'rgba(180,73,60,0.35)', P.enemy, lwO);
          }
        }
      });
    }

    // CƠ CHẾ 2: TRẢI PHỔ CÔNG SUẤT THẤP DƯỚI NỀN NHIỄU (SPREAD SPECTRUM / LPI: 231.98–240.98s)
    if (modeSpread > 0.01) {
      const spreadMorph = A.eio(t, CUE.c3_spread_spectrum + 0.5, CUE.c3_below_noise);
      A.withA(c, modeSpread, () => {
        A.rrect(c, bx - bw / 2 - 6, by - bh / 2 - 6, bw + 12, bh + 12, 12, P.dark, P.ink, lwO);
        A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 8, P.paper, P.ink, lwI);

        const baseY = by + 95;
        const leftX = bx - bw / 2 + 34;
        const rightX = bx + bw / 2 - 34;

        // Dải tín hiệu của ta: từ 1 đỉnh cao hẹp biến đổi thành dải rộng phẳng nằm thấp dưới mức nhiễu nền
        const halfW = A.lerp(36, 265, spreadMorph);
        const peakH = A.lerp(175, 28, spreadMorph);
        A.rrect(c, bx - halfW, baseY - peakH, halfW * 2, peakH, 6, 'rgba(56,189,248,0.38)', P.sky, lwO);

        // Đường ngưỡng nhiễu nền tự nhiên (Noise floor: cao 62px — che kín dải tín hiệu trải phổ 28px!)
        const noisePts: A.Pt[] = [[leftX, baseY]];
        for (let x = leftX; x <= rightX; x += 10) {
          const r = A.rnd(Math.floor(x / 10) + Math.floor(t * 10) * 19);
          noisePts.push([x, baseY - (42 + r * 32)]);
        }
        noisePts.push([rightX, baseY]);
        A.poly(c, noisePts, 'rgba(100,116,139,0.28)', P.slate, lwO);
        A.line(c, [[leftX, baseY], [rightX, baseY]], P.ink, lwO);
      });
    }

    // CƠ CHẾ 3: ANTEN ĐỊNH HƯỚNG & BÚP SÓNG TRIỆT TIÊU NHIỄU SƯỜN (DIRECTIONAL ANTENNA: 240.98–252.92s)
    if (modeDir > 0.01) {
      A.withA(c, modeDir, () => {
        // Vẽ búp sóng định hướng (Main Lobe) của anten Tiêm kích hướng thẳng về phía Xe chỉ huy đồng đội
        const angToHQ = Math.atan2(hqAnt[1] - jetAnt[1], hqAnt[0] - jetAnt[0]);
        c.save();
        c.translate(jetAnt[0], jetAnt[1]);
        c.rotate(angToHQ);
        // Búp sóng chính (Main lobe) vươn dài đón tín hiệu đồng đội
        A.ellipse(c, 220, 0, 220, 48, 0, 'rgba(56,189,248,0.22)', P.sky, lwO);
        // Hai búp phụ nhỏ có khe triệt tiêu (Null) đúng hướng máy gây nhiễu bên dưới
        A.ellipse(c, 35, -52, 42, 18, -0.6, 'rgba(56,189,248,0.14)', P.sky, lwI);
        c.restore();

        // Chùm nhiễu từ trạm Jammer dưới đất bắn lên sườn bị khe Null chặn cụt
        const blockPt: A.Pt = [jetAnt[0] - 95, jetAnt[1] + 85];
        U.drawSignalLink(c, jamAnt, blockPt, t, {
          color: P.enemy,
          mode: 'noise',
          amp: 12,
          speed: 3.2,
          progress: 1,
        });
        A.circle(c, blockPt[0], blockPt[1], 22, P.paper, P.enemy, lwO);
        A.line(c, [[blockPt[0] - 10, blockPt[1] - 10], [blockPt[0] + 10, blockPt[1] + 10]], P.enemy, lwO);
        A.line(c, [[blockPt[0] + 10, blockPt[1] - 10], [blockPt[0] - 10, blockPt[1] + 10]], P.enemy, lwO);
      });
    }

    K.end(c);
  }
}
