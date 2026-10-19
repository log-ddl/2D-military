import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';
import { CUE } from './_cue';
import { mainRotorAngleAt } from './_state';
import { drawBgSkyGrid, drawHeli, drawExplosion2D, lw } from './_assets';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Camera TOP-DOWN:
    // - 83.64 -> 92.20: Ôm trọn thân trực thăng + đĩa rotor để thấy mô-men xoắn của cánh và phản mô-men của thân
    // - 92.20 -> 103.80: Dịch nhẹ sang trái nhấn vào cánh quạt đuôi (tail rotor) và đường rút công suất
    // - 103.80 -> 107.08: Lùi nhẹ + rung máy tại 104.45s khi đạn bắn gãy cánh quạt đuôi làm thân xoay tít
    const camTrack: [number, K.Cam][] = [
      [83.64, { x: -30, y: 0, z: 1.56 }],
      [92.00, { x: -30, y: 0, z: 1.56 }],
      [93.80, { x: -115, y: -10, z: 1.82 }],
      [103.40, { x: -115, y: -10, z: 1.82 }],
      [104.60, { x: -20, y: 0, z: 1.48 }],
      [107.08, { x: -20, y: 0, z: 1.48 }],
    ];
    let cam = K.track(t, camTrack, A.eio);
    cam = K.withShake(cam, t, [[104.45, 16, 0.55]]);

    const rotA = mainRotorAngleAt(t);

    // Góc xoay thân (bodyYaw):
    // - 89.6 -> 94.0: Thân bị lực phản mô-men kéo lệch ngược chiều rotor (-0.28 rad)
    // - 94.5 -> 104.4: Cánh quạt đuôi đẩy ngang ép thân về thẳng (0 rad)
    // - 104.45 -> 107.08: Cánh quạt đuôi trúng đạn nổ -> thân quay tít ngược chiều rotor!
    const preTwist = -0.32 * A.sm(t, CUE.ch2_body_spins_other_way - 0.5, CUE.ch2_body_spins_other_way + 1.0) * (1 - A.eio(t, CUE.ch2_pushes_sideways - 0.2, CUE.ch2_pushes_sideways + 1.0));
    const spinOut = t >= 104.45 ? -Math.pow(t - 104.45, 1.75) * 2.4 : 0;
    const bodyYaw = preTwist + spinOut;

    K.begin(c, cam);
    const lo = lw(c, LINE.outer);
    const li = lw(c, LINE.inner);

    drawBgSkyGrid(c, -1800, -1200, 3600, 2400, 110);

    // --- 1. Vòng cung chỉ chiều quay Rotor chính (chiều KĐH, màu amber) ---
    const showRotorTorque = A.win(t, CUE.ch2_motor_spins_one_way - 0.4, CUE.ch2_takes_power, 0.4, 0.5);
    if (showRotorTorque > 0.01) {
      A.withA(c, showRotorTorque, () => {
        c.save();
        c.translate(14, 0);
        c.beginPath();
        c.arc(0, 0, 262, -Math.PI * 0.72, -Math.PI * 0.28);
        c.strokeStyle = P.amber;
        c.lineWidth = lw(c, 6);
        c.stroke();
        // Đầu mũi tên chiều KĐH tại góc -0.28*PI
        const ax = Math.cos(-Math.PI * 0.28) * 262;
        const ay = Math.sin(-Math.PI * 0.28) * 262;
        A.poly(c, [[ax + 12, ay + 14], [ax - 14, ay + 2], [ax + 4, ay - 14]], P.amber, P.ink, li);
        c.restore();
      });
    }

    // --- 2. Vòng cung chỉ Phản mô-men xoắn muốn vặn thân ngược chiều (ngược KĐH, màu enemy) ---
    const showBodyReaction = A.win(t, CUE.ch2_body_spins_other_way - 0.4, CUE.ch2_other_answers, 0.4, 0.4);
    if (showBodyReaction > 0.01) {
      A.withA(c, showBodyReaction, () => {
        c.save();
        c.translate(14, 0);
        c.beginPath();
        c.arc(0, 0, 155, Math.PI * 0.22, Math.PI * 0.78);
        c.strokeStyle = P.enemy;
        c.lineWidth = lw(c, 5.5);
        c.setLineDash([14, 8]);
        c.stroke();
        c.setLineDash([]);
        // Đầu mũi tên ngược chiều KĐH (kéo đuôi xuống dưới +y, mũi lên trên -y)
        const bx = Math.cos(Math.PI * 0.78) * 155;
        const by = Math.sin(Math.PI * 0.78) * 155;
        A.poly(c, [[bx - 14, by - 12], [bx + 12, by - 4], [bx - 2, by + 14]], P.enemy, P.ink, li);
        c.restore();
      });
    }

    // --- 3. Vẽ Thân Trực thăng xoay quanh tâm trục rotor (14, 0) ---
    c.save();
    c.translate(14, 0);
    c.rotate(bodyYaw);
    c.translate(-14, 0);

    drawHeli(c, {
      view: 'top',
      rotorAngle: rotA - bodyYaw,
      tailDamaged: t >= 104.45,
    });

    // --- 4. Luồng đẩy ngang của Cánh Quạt Đuôi (93.5 - 104.4s) ---
    const tailPush = A.win(t, CUE.ch2_small_rotor_tail - 0.2, 104.42, 0.35, 0.15);
    if (tailPush > 0.01) {
      A.withA(c, tailPush, () => {
        // Cánh quạt đuôi tại (-272, -18) thổi luồng khí lên trên (-y) để đẩy dầm đuôi xuống (+y) hay ngược lại:
        // Vì phản mô-men kéo đuôi xuống (+y), cánh quạt đuôi phải đẩy dầm đuôi LÊN (-y), tức thổi khí xuống (+y)!
        for (let i = -1; i <= 1; i++) {
          const lx = -272 + i * 14;
          const off = (t * 180) % 45;
          A.line(c, [[lx, 8 + off * 0.3], [lx, 65 + off * 0.6]], P.sky, lw(c, 3));
        }
        // Mũi tên lực giữ đuôi hướng lên (-y) chống lại phản mô-men
        A.capsule(c, [-272, -32], [-272, -108], 9, P.amber, P.ink, li);
        A.poly(c, [[-272, -128], [-286, -102], [-258, -102]], P.amber, P.ink, lo);
      });
    }

    // --- 5. Đường rút công suất từ Hộp số chính chạy dọc dầm đuôi (99.5 - 104.4s) ---
    const powerDrain = A.win(t, CUE.ch2_takes_power - 0.4, 104.42, 0.3, 0.2);
    if (powerDrain > 0.01) {
      A.withA(c, powerDrain, () => {
        const dashOff = -(t * 140) % 28;
        c.save();
        c.lineDashOffset = dashOff;
        A.line(c, [[14, 0], [-272, -14]], P.amber, lw(c, 5), [16, 12]);
        c.restore();
        // Vòng cảnh báo cánh quạt đuôi mỏng manh lộ thiên (102.5 - 104.4s)
        const expP = A.sm(t, CUE.ch2_thin_exposed - 0.3, CUE.ch2_thin_exposed + 0.3);
        if (expP > 0.01) {
          A.circle(c, -272, -18, 38, null, P.enemy, lw(c, 3.5));
        }
      });
    }

    // Vệt khói đen ở đuôi sau khi trúng đạn (104.45 - 107.08s)
    if (t >= 104.45) {
      for (let k = 0; k < 5; k++) {
        const age = ((t - 104.45) * 3 + k * 0.35) % 1.8;
        A.withA(c, Math.max(0, 0.65 - age * 0.35), () => {
          A.circle(c, -272 - age * 28, -18 + age * 22, 10 + age * 16, P.slate, P.ink2, li);
        });
      }
    }

    c.restore();

    // --- 6. Viên đạn bắn tới và Vụ nổ tại Cánh Quạt Đuôi (104.15 - 105.35s) ---
    if (t >= 104.12 && t <= 104.46) {
      const bp = A.ph(t, 104.12, 104.45);
      const bx = A.lerp(-480, -272, bp);
      const by = A.lerp(-180, -18, bp);
      A.capsule(c, [bx - 18, by - 14], [bx, by], 6, P.enemy, P.ink, li);
    }
    if (t >= 104.45 && t <= 105.45) {
      drawExplosion2D(c, -272, -18, (t - 104.45) / 0.95, 78);
    }

    K.end(c);
  }
}
