// sc07.ts — Chương 3 (157.04–197.20s): Cuộc đánh đổi giữa Bánh xích và Bánh lốp (Tracks vs Wheels):
// 1) 157.04–171.84s: M113 bám theo MBT vượt bùn sâu nhờ xích phân bố áp lực rộng.
// 2) 172.06–178.38s: Trên quốc lộ nhựa, xích ồn, ngốn xăng và tự nghiến mòn mắt xích khi chạy hàng trăm km.
// 3) 178.70–184.68s: Phải chất từng chiếc xe xích lên đoàn xe đầu kéo sàn thấp (flatbed trucks).
// 4) 184.68–197.20s: Các dòng APC hiện đại (Stryker, Boxer, VBCI, BTR) chuyển sang dùng 8 bánh lốp chủ động lớn.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    A.clear(c, P.bg);

    // Camera: nối mượt từ cuối sc06 ({ x: 260, y: -120, z: 1.18 }) rồi đi theo 4 giai đoạn
    const cam = K.track(
      t,
      [
        [157.04, { x: 260, y: -125, z: 1.18 }],
        [163.0, { x: 60, y: -125, z: 1.16 }],
        [172.5, { x: 40, y: -135, z: 1.38 }],
        [179.0, { x: -20, y: -125, z: 1.08 }],
        [186.5, { x: 60, y: -135, z: 1.18 }],
        [197.2, { x: 180, y: -135, z: 1.28 }],
      ],
      A.eio,
    );

    K.begin(c, cam);

    // ── GIAI ĐOẠN 1 & 2 (157.04 – 178.50s): M113 trên bùn sâu (mud) → chuyển sang quốc lộ nhựa (paved)
    if (t < CUE.flatbed_trucks) {
      const isPaved = t >= CUE.tracks_loud_thirsty;
      V.drawSideGround(c, -1400, 1400, 0, isPaved ? 'paved' : 'mud');

      // Ở đoạn bùn sâu (161.98–171.84s): Xe tăng MBT dẫn trước bên phải, M113 bám theo sau
      const mbtAlpha = 1 - A.sm(t, 171.2, 172.2);
      if (mbtAlpha > 0.01) {
        A.withA(c, mbtAlpha, () => {
          V.drawCombatVehicle(c, {
            x: 340,
            y: 0,
            s: 1.05,
            dir: 1,
            kind: 'mbt',
            view: 'side',
            phase: t * 5.0,
          });
        });
      }

      // Chiếc M113 ở tâm trái: khi sang đường nhựa (t >= 172.06s), xích nóng đỏ và văng mảnh mòn
      const wear = A.sm(t, CUE.tracks_loud_thirsty, CUE.chew_themselves_up + 1.5);
      const m113X = A.lerp(-140, 40, A.sm(t, 171.2, 172.6));
      V.drawM113(c, {
        x: m113X,
        y: 0,
        s: 1.15,
        dir: 1,
        view: 'side',
        phase: t * 6.5,
        trackWear: wear,
      });

      // Mũi tên phân tán trọng lượng đều xuống bùn ("Tracks spread weight well" @ 170.56s)
      const spreadA = A.win(t, 168.0, 172.0, 0.35, 0.35);
      if (spreadA > 0.01) {
        A.withA(c, spreadA, () => {
          A.rrect(c, m113X - 165, 4, 330, 14, 4, P.amber, P.ink, 2);
          for (let k = -2; k <= 2; k++) {
            const ax = m113X + k * 60;
            U.arrow(c, [ax, -6], [ax, 28], { color: P.amber, w: 4, head: 14 });
          }
        });
      }

      // Khi chạy trên quốc lộ nhựa (172.06–178.50s):
      // 1) Vòng sóng tiếng ồn ("loud"), 2) Thanh nhiên liệu tụt nhanh ("thirsty"), 3) Tia lửa & mảnh mắt xích văng ra ("chew themselves up")
      if (isPaved) {
        const pBad = A.sm(t, 172.1, 173.0);
        // Sóng âm ồn ào tỏa ra từ bộ xích
        for (let w = 0; w < 3; w++) {
          const rp = ((t * 1.6 + w * 0.33) % 1 + 1) % 1;
          U.ring(c, m113X, -35, 190, rp, P.amber, 4);
        }
        // Mảnh mắt xích và tia lửa văng dưới gầm xích ("chew themselves up" @ 175.20s)
        if (t >= 174.8) {
          F.sparks(c, m113X - 65, -6, ((t - 174.8) * 3.2) % 1, 1.0, Math.PI * 0.85, 0.9, 11);
          F.sparks(c, m113X + 55, -6, ((t - 174.8) * 3.2 + 0.5) % 1, 1.0, Math.PI * 0.85, 0.9, 23);
          F.debris(c, m113X - 20, -10, (t - 175.0) % 1.4, 0.75, 8, 9, 0, P.dark);
        }
        // Thanh nhiên liệu trên đầu xe tụt nhanh về mức đỏ
        const fuelLvl = Math.max(0.12, 1 - A.ph(t, 172.2, 178.0) * 0.85);
        U.bar(c, m113X - 95, -242, 190, 24, fuelLvl, P.enemy, pBad);
      }

      K.end(c);
      return;
    }

    // ── GIAI ĐOẠN 3 & 4 (178.70 – 197.20s): Xe đầu kéo chở M113 vs APC 8 bánh lốp lớn vượt lên
    V.drawSideGround(c, -1400, 1600, 0, 'paved');

    // Đoàn xe đầu kéo hạng nặng chở M113 trên lưng (178.70–197.20s)
    // Khi APC 8 bánh xuất hiện (184.68s+), xe đầu kéo lùi dần về phía trái/nền sau
    const after8x8 = A.eio(t, CUE.eight_wheels_modern, CUE.eight_wheels_modern + 2.2);
    const flatbedY = A.lerp(0, -110, after8x8);
    const flatbedScale = A.lerp(1.08, 0.72, after8x8);
    const flatbedX = A.lerp(-30, -240, after8x8);

    A.withA(c, A.lerp(1, 0.55, after8x8), () => {
      V.drawFlatbedTruck(c, flatbedX, flatbedY, flatbedScale, t * 2.2, true);
    });

    // Từ 184.68s ("most modern APCs, such as the American Stryker, European Boxer, French VBCI, and Russian BTR family, ride on eight large driven wheels instead"):
    if (t >= CUE.eight_wheels_modern - 0.2) {
      const enterP = A.eo(t, CUE.eight_wheels_modern - 0.2, CUE.eight_wheels_modern + 2.0);
      const apcX = A.lerp(-520, 185, enterP);
      V.drawAPC8x8(c, {
        x: apcX,
        y: 0,
        s: 1.25,
        dir: 1,
        view: 'side',
        wheelRot: t * 8.5,
        rwsType: 'rws',
      });

      // Phía trên bên phải (191.5–197.0s): hiện thêm bóng dáng chiếc BTR-80 8 bánh cùng tiến sang phải để đại diện họ BTR
      const btrP = A.sm(t, 191.8, 193.2);
      if (btrP > 0.01) {
        A.withA(c, btrP * 0.85, () => {
          V.drawBTR80(c, {
            x: apcX + 340,
            y: -110,
            s: 0.78,
            dir: 1,
            view: 'side',
            wheelRot: t * 8.5,
          });
        });
      }

      // Nhấn mạnh 4 trục / 8 bánh lốp chủ động lớn bằng vòng sáng màu hổ phách dưới các bánh xe (194.5–197.2s)
      const highlightWheels = A.win(t, 194.2, 197.1, 0.4, 0.3);
      if (highlightWheels > 0.01) {
        for (const wx of [-142, -82, 58, 118]) {
          U.circleMark(c, apcX + wx * 1.25, -55, 56, highlightWheels, P.amber, 5);
        }
      }
    }

    K.end(c);
  }
}
