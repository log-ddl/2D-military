// sc13.ts — Chương 5 (337.28–378.00s): Chiếc APC như một "căn phòng tự hành có giáp bảo vệ" làm 12 công việc phía sau tiểu đội:
// 1) 337.28–358.20s: Tháo ghế băng ra khỏi khoang sau, cùng một thân xe lần lượt biến thành:
//    - Xe cứu thương bọc thép (armored ambulance),
//    - Xe chỉ huy di động ngập máy vô tuyến (mobile command post),
//    - Xe chở cối hạng nặng 120mm bắn qua cửa nóc (120mm mortar carrier),
//    - Xe công binh / Xe tác chiến điện tử (electronic warfare van).
// 2) 358.20–378.00s: Chiếc Boxer châu Âu (European Boxer) đẩy ý tưởng này tới tận cùng:
//    khung gầm 8 bánh + buồng lái là đế chung (base unit), khoang sau là module nhiệm vụ rời (mission pod) giữ bằng khóa lớn;
//    cần cẩu dã chiến nhấc module chở quân ra và hạ module bệnh viện phẫu thuật xuống đúng 8 bánh xe đó.
import { CanvasScene } from './shared/base';
import * as A from './shared/art';
import * as K from './shared/camera';
import * as F from './shared/fx';
import * as U from './shared/ui';
import { P, LINE } from './shared/palette';
import * as V from './_assets';
import { CUE } from './_cue';
import { stateAt } from './_state';

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, t: number, _lt: number) {
    const st = stateAt(t);
    A.clear(c, P.bg);

    const isBoxer = t >= CUE.european_boxer - 0.1;

    const cam = K.track(
      t,
      [
        [337.28, { x: -10, y: -140, z: 1.54 }],
        [350.0, { x: -10, y: -155, z: 1.48 }],
        [358.5, { x: 0, y: -155, z: 1.38 }],
        [370.0, { x: 0, y: -175, z: 1.24 }],
        [378.0, { x: 0, y: -155, z: 1.36 }],
      ],
      A.eio,
    );

    K.begin(c, cam);
    V.drawSideGround(c, -1400, 1400, 0, 'paved');

    if (!isBoxer) {
      // ── PHẦN A (337.28 – 358.14s): BIẾN ĐỔI KHOANG TRONG CỦA CÙNG MỘT THÂN XE QUA CÁC VAI TRÒ ──
      let role: V.APC8x8Opts['podRole'] = 'troop';
      if (t >= CUE.engineer_ew_role - 0.2) role = 'ew';
      else if (t >= CUE.mortar_120_role - 0.2) role = 'mortar';
      else if (t >= CUE.command_post_role - 0.2) role = 'command';
      else if (t >= CUE.ambulance_role + 0.5) role = 'ambulance';

      // Động tác rút băng ghế ra khỏi đuôi xe ("Take the benches out of the back" @ 344.08s)
      const benchOut = A.win(t, 343.6, 345.2, 0.3, 0.4);
      if (benchOut > 0.01) {
        A.withA(c, benchOut, () => {
          const bx = A.lerp(-140, -340, A.eio(t, 343.6, 345.0));
          A.rrect(c, bx - 80, -135, 160, 18, 4, P.sand, P.ink, LINE.inner);
          U.arrow(c, [bx - 90, -126], [bx - 155, -126], { color: P.amber, w: 5, head: 16 });
        });
      }

      V.drawAPC8x8(c, {
        x: 0,
        y: 0,
        s: 1.32,
        dir: 1,
        view: 'cutaway',
        wheelRot: 0,
        rwsType: role === 'mortar' || role === 'ew' ? 'none' : 'rws',
        podRole: role,
        mortarDoorsOpen: A.sm(t, 350.8, 351.8),
      });

      // Hiệu ứng hoạt động đặc trưng cho từng vai trò:
      // 1) Xe chỉ huy (Command post @ 348.34–350.52s): sóng vô tuyến phát ra từ cột ăng-ten
      if (role === 'command') {
        for (let w = 0; w < 3; w++) {
          const rp = ((t * 1.8 + w * 0.33) % 1 + 1) % 1;
          U.ring(c, -185, -315, 95, rp, P.sky, 4);
        }
      }

      // 2) Xe cối 120mm (120mm mortar @ 350.64–354.94s): khai hỏa đạn cối 120mm qua cửa nóc mở ở t = 352.6s!
      if (role === 'mortar') {
        const fireAge = t - 352.6;
        if (fireAge > 0 && fireAge < 1.8) {
          F.muzzleFlash(c, -68, -260, -Math.PI * 0.35, A.clamp01(fireAge / 0.35), 1.1, LINE.outer);
          F.smoke(c, -68, -265, fireAge, 0.85, 5, P.slate, 12);
          F.arcShot(c, [-68, -260], [320, -420], A.clamp01(fireAge / 1.1), 120, {
            color: P.amber,
            w: 5,
          });
        }
      }

      // 3) Xe tác chiến điện tử (EW van @ 355.22–358.14s): vòm jammer phát xung điện từ
      if (role === 'ew') {
        for (let w = 0; w < 3; w++) {
          const rp = ((t * 2.2 + w * 0.33) % 1 + 1) % 1;
          U.ring(c, -116, -320, 140, rp, P.amber, 4);
        }
      }

      K.end(c);

      // Callout "120 mm" khi xe cối 120mm xuất hiện @351.86s
      const p120 = A.win(t, 351.0, 354.8, 0.3, 0.35);
      if (p120 > 0.01) {
        const pt = K.toScreen(cam, -90, -255);
        U.callout(c, '120 mm', pt[0] - 80, pt[1] - 48, {
          to: pt,
          p: p120,
          color: P.ink,
          size: 34,
        });
      }
      return;
    }

    // ── PHẦN B (358.14 – 378.00s): EUROPEAN BOXER — ĐẾ CHUNG 8 BÁNH + CẦN CẨU THAY MODULE NHIỆM VỤ ──
    // Giàn cần cẩu dã chiến (Field crane) phía trên chiếc Boxer
    A.line(c, [[-380, 0], [-350, -410]], P.slate, LINE.outer + 2);
    A.line(c, [[380, 0], [350, -410]], P.slate, LINE.outer + 2);
    A.rrect(c, -385, -426, 770, 22, 4, P.slate, P.ink, LINE.outer);

    // Từ 358.2..373.3s: Module chở quân (troop module) được mở khóa và nhấc lên cao rồi dịch sang trái
    // Từ 373.3..378.0s: Module bệnh viện phẫu thuật (surgical hospital module) hạ từ trên xuống khớp vào đúng 8 bánh xe!
    const isHospitalPhase = t >= 373.2;
    const liftY = !isHospitalPhase
      ? st.boxerPodLift * 155
      : (1 - st.boxerNewPodDrop) * 155;

    V.drawAPC8x8(c, {
      x: 0,
      y: 0,
      s: 1.32,
      dir: 1,
      view: 'cutaway',
      wheelRot: 0,
      rwsType: 'rws',
      podLiftY: liftY / 1.32,
      podRole: isHospitalPhase ? 'hospital' : 'troop',
    });

    // Dây cáp và móc cẩu nối từ dầm cẩu (-404) xuống nóc module đang được nhấc/hạ
    if (t >= 368.5) {
      const podTopY = (-172 - liftY / 1.32) * 1.32;
      const hookX = -105;
      A.rrect(c, hookX - 28, -408, 56, 18, 4, P.amber, P.ink, LINE.inner);
      A.line(c, [[hookX - 16, -390], [hookX - 55, podTopY]], P.ink, 3.5);
      A.line(c, [[hookX + 16, -390], [hookX + 55, podTopY]], P.ink, 3.5);
    }

    // Nhấn mạnh các chốt khóa hạng nặng (Heavy locks @ 365.12–369.58s) dưới đáy module
    const lockFocus = A.win(t, 365.0, 369.6, 0.35, 0.35);
    if (lockFocus > 0.01) {
      U.focus(c, -235, -148, 225, 38, lockFocus, P.amber, 4);
    }

    K.end(c);

    // Callout "Boxer" đúng lúc voice giới thiệu @359.00s
    const pBoxer = A.win(t, 358.4, 364.8, 0.35, 0.4);
    if (pBoxer > 0.01) {
      const pt = K.toScreen(cam, 60, -225);
      U.callout(c, 'Boxer', pt[0], pt[1] - 52, {
        to: pt,
        p: pBoxer,
        color: P.ink,
        size: 36,
      });
    }
  }
}
