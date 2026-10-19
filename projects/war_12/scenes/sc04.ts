import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P } from './shared/palette';
import {
  drawICBM,
  drawInterceptorBooster,
  drawKillVehicle,
  drawSpaceDebrisItem,
  drawFeatherHammerBox,
  lwO,
  lwI,
} from './_assets';
import { CUE } from './_cue';

/**
 * sc04 (136.02 – 198.00s): Cơ chế Hit-to-kill ngoài không gian & Bài toán mồi bẫy trong chân không.
 * - Phần A (136.02 – 165.86s):
 *   + 136.02 – 150.78s: Vì sao ngoài không gian không thể nổ gần mục tiêu như tên lửa phòng không (tốc độ tiếp cận quá nhanh + chân không không truyền sóng nổ).
 *   + 150.78 – 165.86s: Tên lửa đánh chặn mở vỏ tách phương tiện nhỏ `KillVehicle (EKV)` -> Mặt cắt `cut` lộ cảm biến đầu mũi và 4 vòi phụt ngang chỉnh hướng trực tiếp đâm thẳng vào đầu đạn (`Hit-to-kill`).
 * - Phần B (165.86 – 198.00s):
 *   + 165.86 – 185.76s: Một đầu đạn trong không gian không bay một mình: tầng đẩy rỗng lộn nhào bên cạnh, bóng bay mồi bẫy (vỏ mỏng rỗng) và đám mảnh kim loại phản xạ.
 *   + 185.76 – 198.00s: Hộp chân không Búa & Lông vũ (`drawFeatherHammerBox`) chứng minh trong chân không vật nặng và vật nhẹ rơi giống hệt nhau; đầu tự dẫn EKV phải chọn đúng 1 mục tiêu thật trong 10 vật thể (`10 OBJECTS`) chỉ trong vài giây.
 */
export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    // Nền không gian vũ trụ
    A.clear(c, '#dfe9f2');

    if (t < CUE.c2_next_question_tell) {
      this.drawHitToKillMechanism(c, t);
    } else {
      this.drawVacuumDecoysAndHammer(c, t);
    }
  }

  private drawHitToKillMechanism(c: CanvasRenderingContext2D, t: number) {
    const cam = K.track(
      t,
      [
        [CUE.ch2_start, { x: 0, y: 0, z: 1.0 }],
        [CUE.c2_hits_directly, { x: 0, y: 0, z: 1.05 }],
        [CUE.c2_sensor_thrusters, { x: 60, y: 0, z: 1.28 }],
        [CUE.c2_hit_to_kill, { x: 0, y: 0, z: 1.1 }],
      ],
      A.eio
    );

    // Rung máy mạnh đúng khoảnh khắc va chạm Hit-to-kill (t = 160.2s)
    const shookCam = K.withShake(cam, t, [[160.2, 24, 0.7]]);

    K.begin(c, shookCam);
    const o = lwO(c);
    const inn = lwI(c);

    // Đường chân trời khí quyển thấp phía dưới để giữ định hướng không gian
    c.fillStyle = P.bg;
    c.fillRect(-1600, 390, 3200, 400);
    A.line(
      c,
      [
        [-1600, 390],
        [1600, 390],
      ],
      P.slate,
      inn,
      [16, 12]
    );

    // ── Nhịp 1 (136.02 – 150.78s): Tại sao nổ gần (proximity blast) thất bại trong chân không? ──
    if (t < CUE.c2_hits_directly) {
      const p = A.ph(t, CUE.ch2_start, CUE.c2_hits_directly);
      // Đầu đạn lao cực nhanh từ trái sang phải, vụ nổ phòng không nở ra phía sau lưng và tắt lịm trong chân không
      const wx = A.lerp(-580, 560, A.eio(t, CUE.ch2_start + 0.5, CUE.c2_vacuum_anyway));
      const wy = -40;

      // Đạn kiểu phòng không bay lên phát nổ lệch phía sau tại t = 142.0s
      const proxBoomP = A.ph(t, 141.5, 145.5);
      if (t < 141.8) {
        const iy = A.lerp(320, 60, A.sm(t, CUE.ch2_start + 0.5, 141.5));
        A.rrect(c, -80, iy - 12, 54, 24, 4, P.olive, P.ink, o);
      }
      if (proxBoomP > 0 && proxBoomP < 1) {
        // Vụ nổ trong chân không không có sóng xung kích lan xa, bị đánh dấu X
        F.explosion(c, -50, 55, 85, proxBoomP, o);
      }
      if (t > 142.8) {
        U.xMark(c, -50, 55, 58, A.sm(t, 142.8, 143.8), P.enemy, o * 1.5);
      }

      // Đầu đạn vượt qua nguyên vẹn với vận tốc nhiều km/s
      A.line(
        c,
        [
          [-640, wy],
          [wx, wy],
        ],
        P.enemy,
        o,
        [16, 10]
      );
      c.save();
      c.translate(wx, wy);
      c.scale(2.1, 2.1);
      drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.4 });
      c.restore();

      K.end(c);
      return;
    }

    // ── Nhịp 2 (150.78 – 165.86s): Tách đầu tự dẫn EKV, mặt cắt cảm biến + vòi phụt ngang & Va chạm trực diện ──
    const sepP = A.sm(t, CUE.c2_hits_directly, CUE.c2_sensor_thrusters);
    const cutP = A.win(t, CUE.c2_sensor_thrusters - 0.3, CUE.c2_hit_to_kill - 1.2, 0.4, 0.4);
    const collideP = A.ei(t, CUE.c2_sensor_thrusters + 2.2, 160.2);
    const postHit = t >= 160.2;

    if (!postHit) {
      // Tầng đẩy Booster lùi lại phía phải sau khi tách EKV
      const boosterX = A.lerp(380, 680, sepP);
      c.save();
      c.translate(boosterX, 40);
      c.scale(-1.55, 1.55);
      drawInterceptorBooster(c, {
        thrust: sepP < 0.25 ? 0.7 : 0,
        sep: A.clamp01(sepP * 1.2),
        hideEKV: true,
      });
      c.restore();

      // Đầu tự dẫn EKV ở giữa-phải tự chỉnh độ cao bằng các xung vòi phụt ngang (DACS) để khớp đúng tâm đầu đạn
      const steerStep =
        A.lerp(40, -18, A.sm(t, 155.2, 156.6)) + A.lerp(0, 18, A.sm(t, 157.0, 158.3));
      const ekvX = A.lerp(240, 20, collideP);
      const ekvY = A.lerp(steerStep, 0, collideP);

      const fireDown = t >= 155.1 && t <= 156.6 ? 1.0 : 0.0;
      const fireUp = t >= 156.9 && t <= 158.3 ? 1.0 : 0.0;

      // Đầu đạn mục tiêu lao từ bên trái vào điểm va chạm (0, 0)
      const warheadX = A.lerp(-540, -20, A.sm(t, CUE.c2_hits_directly, 160.2));
      const warheadY = 0;

      // Đường ngắm khóa chính tâm giữa cảm biến EKV và mũi đầu đạn
      A.line(
        c,
        [
          [warheadX + 55, warheadY],
          [ekvX - 80, ekvY],
        ],
        P.sky,
        inn * 1.2,
        [10, 8]
      );

      c.save();
      c.translate(warheadX, warheadY);
      c.scale(2.2, 2.2);
      drawICBM(c, { view: 'side', stage: 'warhead', reentryGlow: 0.45 });
      c.restore();

      c.save();
      c.translate(ekvX, ekvY);
      c.scale(-2.15, 2.15);
      drawKillVehicle(c, {
        view: cutP > 0.4 ? 'cut' : 'side',
        thrusterUp: fireUp,
        thrusterDown: fireDown,
        sensorCone: 95,
      });
      c.restore();
    } else {
      // Khoảnh khắc va chạm trực diện Hit-to-kill (t >= 160.2s): động năng nghiền nát cả hai thành mảnh văng
      const age = t - 160.2;
      F.explosion(c, 0, 0, 195, A.clamp01(age / 1.5), o * 1.2);
      F.sparks(c, 0, 0, A.clamp01(age / 1.2), 2.2, 0, Math.PI * 2, 7);

      // Hai vệt quỹ đạo đối đầu ("a bullet meeting a bullet") giữ trên màn hình kèm đám mảnh vỡ trôi trong chân không
      U.arrow(c, [-560, 0], [-45, 0], { p: 1, color: P.enemy, w: o * 1.3 });
      U.arrow(c, [560, 0], [45, 0], { p: 1, color: P.oliveDark, w: o * 1.3 });
      A.circle(c, 0, 0, 56 + age * 14, null, P.amber, inn);

      // Các mảnh vỡ của Warhead và EKV bung tỏa trong chân không (không có trọng lực kéo rơi ngay)
      const spread = A.eo(t, 160.2, 165.8);
      for (let i = 0; i < 16; i++) {
        const ang = (i / 16) * Math.PI * 2 + 0.2;
        const dist = (45 + (i % 3) * 55) * spread;
        const fx = Math.cos(ang) * dist * 1.4;
        const fy = Math.sin(ang) * dist * 0.9;
        c.save();
        c.translate(fx, fy);
        c.rotate(age * (i % 2 ? 1.8 : -1.5) + i);
        A.poly(
          c,
          [
            [-14, -8],
            [16, -4],
            [8, 12],
            [-10, 10],
          ],
          i % 2 === 0 ? P.enemy : P.oliveLight,
          P.ink,
          inn
        );
        c.restore();
      }
    }

    K.end(c);
  }

  private drawVacuumDecoysAndHammer(c: CanvasRenderingContext2D, t: number) {
    const cam: K.Cam = { x: 0, y: 0, z: 1.0 };
    K.begin(c, cam);
    const o = lwO(c);
    const inn = lwI(c);

    // Đường ranh giới khí quyển dưới đáy
    c.fillStyle = P.bg;
    c.fillRect(-1200, 410, 2400, 300);
    A.line(
      c,
      [
        [-1200, 410],
        [1200, 410],
      ],
      P.slate,
      inn,
      [16, 12]
    );

    const deployP = A.sm(t, CUE.c2_not_arrive_alone, CUE.c2_metal_echoes);
    const boxWin = A.win(t, CUE.c2_feather_hammer - 0.4, CUE.c2_ten_objects + 0.8, 0.45, 0.45);
    const scan10P = A.sm(t, CUE.c2_ten_objects - 0.3, CUE.c2_more_than_one_chance - 0.5);

    // Dịch đám mây sang phải một chút khi hộp chân không Búa & Lông vũ hiện lên bên trái
    const cloudCenterX = A.lerp(-140, 80, boxWin);
    const drift = (t - CUE.c2_next_question_tell) * 14;

    // 10 vật thể bay cùng nhau trong chân không:
    // - 1 Đầu đạn thật (index 0)
    // - 1 Tầng đẩy rỗng lộn nhào (index 1)
    // - 5 Bóng bay mồi bẫy hình nón/hình cầu (index 2..6)
    // - 3 Cụm mảnh nhiễu kim loại (index 7..9)
    const offsets: [number, number, string][] = [
      [20, -10, 'real'],
      [-175, 45, 'stage'],
      [95, -135, 'cone'],
      [120, 105, 'cone'],
      [-45, -170, 'sphere'],
      [-35, 165, 'sphere'],
      [165, -25, 'cone'],
      [-125, -95, 'chaff'],
      [40, 210, 'chaff'],
      [-145, 185, 'chaff'],
    ];

    const objPositions: A.Pt[] = [];

    offsets.forEach(([ox, oy, kind], idx) => {
      const x = cloudCenterX + ox * deployP + drift * 0.35;
      const y = oy * deployP;
      objPositions.push([x, y]);

      c.save();
      c.translate(x, y);
      if (kind === 'real') {
        c.scale(1.65, 1.65);
        drawICBM(c, { view: 'side', stage: 'warhead' });
      } else if (kind === 'stage') {
        c.rotate((t - CUE.c2_upper_stage_tumbles) * 1.15);
        c.scale(1.45, 1.45);
        drawSpaceDebrisItem(c, 'tumblingStage');
      } else if (kind === 'cone') {
        c.scale(1.6, 1.6);
        drawSpaceDebrisItem(c, 'balloonCone');
      } else if (kind === 'sphere') {
        c.scale(1.5, 1.5);
        drawSpaceDebrisItem(c, 'balloonSphere');
      } else {
        c.rotate(idx + t * 0.6);
        c.scale(1.5, 1.5);
        drawSpaceDebrisItem(c, 'chaffCluster');
      }
      c.restore();

      // Vòng sóng phản xạ radar giả quanh các mảnh kim loại & bóng mồi ("fill the sky with echoes")
      if (t >= CUE.c2_release_decoys && kind !== 'real') {
        const echoR = 26 + ((t * 40 + idx * 17) % 32);
        A.withA(c, 0.35, () => {
          A.circle(c, x, y, echoR, null, P.sky, inn * 0.8);
        });
      }
    });

    // Hộp thí nghiệm chân không Búa & Lông vũ ở bên trái (185.3 – 192.5s)
    if (boxWin > 0) {
      const fallP = ((t - CUE.c2_feather_hammer + 0.4) * 0.42) % 1;
      A.withA(c, boxWin, () => {
        c.save();
        c.translate(-560, 0);
        c.scale(1.35, 1.35);
        drawFeatherHammerBox(c, { fallProgress: A.clamp01(fallP), hasAir: false });
        c.restore();
      });
    }

    // Đầu tự dẫn EKV ở bên phải quét cảm biến qua 10 vật thể trong vài giây ("decide which of ten objects is the real one")
    const ekvX = 640;
    const ekvY = 0;
    c.save();
    c.translate(ekvX, ekvY);
    c.scale(-1.95, 1.95);
    drawKillVehicle(c, {
      view: 'side',
      thrusterUp: Math.sin(t * 14) > 0.3 ? 0.8 : 0,
      thrusterDown: Math.cos(t * 14) > 0.3 ? 0.8 : 0,
      sensorCone: 140,
    });
    c.restore();

    if (scan10P > 0) {
      // Quét tia cảm biến nhảy liên tục qua 10 vật thể
      const activeIdx = Math.floor((t * 7.5) % objPositions.length);
      objPositions.forEach(([ox, oy], idx) => {
        const isCurrent = idx === activeIdx;
        A.circle(
          c,
          ox,
          oy,
          isCurrent ? 38 : 28,
          null,
          isCurrent ? P.amber : P.sky,
          isCurrent ? o * 1.2 : inn
        );
      });
      const [tx, ty] = objPositions[activeIdx]!;
      A.line(
        c,
        [
          [ekvX - 95, ekvY],
          [tx, ty],
        ],
        P.amber,
        o,
        [12, 8]
      );
    }

    K.end(c);

    // Callout số "10 OBJECTS" khi voice đọc "which of ten objects is the real one" (191.72 – 197.5s)
    const call10 = A.win(t, CUE.c2_ten_objects, CUE.c2_more_than_one_chance - 0.4, 0.35, 0.35);
    if (call10 > 0) {
      const [sx, sy] = K.toScreen(cam, cloudCenterX + 80, -210);
      U.callout(c, '10 OBJECTS', sx, sy - 40, {
        to: [sx, sy + 30],
        p: call10,
        color: P.amber,
        size: 34,
      });
    }
  }
}
