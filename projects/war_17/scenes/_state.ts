// scenes/_state.ts — Trạng thái tất định theo thời gian toàn phim t (0..475.742s)
// Giữ liên tục vị trí, hướng, trạng thái của các phương tiện xuyên suốt các cảnh và chương.
import * as A from './shared/art';
import { CUE } from './_cue';

export interface FilmState {
  // Chương 1: Đoàn xe Normandy (sc01) & Cải tạo Kangaroo (sc02)
  convoyX: number;
  truckAlive: number;
  halfTrackAlive: number;
  kangarooGunRem: number;
  kangarooRacksRem: number;
  kangarooBenchesIn: number;
  kangarooDriveX: number;

  // Chương 2: M113 mở bửng & qua cầu (sc06)
  m113Ramp: number;
  m113BridgeX: number;

  // Chương 3: Bánh xích vs 8 bánh lốp & CTIS / Run-flat (sc07..sc09)
  tireFlatten: number;
  tireShredded: number;

  // Chương 4: Đáy chữ V chống mìn, RWS & Bơi qua sông (sc10..sc12)
  rwsAim: number;
  swimProgress: number;

  // Chương 5: Module Boxer, Chiến thuật Battle Taxi & Hội tụ cuối phim (sc13..sc15)
  boxerPodLift: number;
  boxerNewPodDrop: number;
}

export function stateAt(t: number): FilmState {
  // sc01: Đoàn xe tiến về phía chiến hào (0..20.1s)
  const convoyX = A.lerp(-420, 120, A.ph(t, 0, 20.1));
  // Lính trên xe mui trần và bán xích ngã dần khi 3 quả đạn pháo nổ chụp ở 4.8s, 13.8s, 16.5s
  const hit1 = A.sm(t, 4.8, 5.4);
  const hit2 = A.sm(t, 13.8, 14.5);
  const hit3 = A.sm(t, 16.5, 17.2);
  const truckAlive = Math.max(0.2, 1 - hit1 * 0.35 - hit2 * 0.45);
  const halfTrackAlive = Math.max(0.25, 1 - hit2 * 0.35 - hit3 * 0.45);

  // sc02: Cắt pháo (25.9..28.2), tháo giá đạn (28.2..30.0), lắp ghế & lính (30.0..32.6), chạy qua mưa đạn (32.8..43.35)
  const kangarooGunRem = A.eio(t, CUE.torch_off_guns, CUE.rip_out_racks);
  const kangarooRacksRem = A.eio(t, CUE.rip_out_racks, CUE.pack_benches);
  const kangarooBenchesIn = A.eio(t, CUE.pack_benches, CUE.called_kangaroo);
  const kangarooDriveX = A.lerp(0, 460, A.eio(t, CUE.called_kangaroo, 38.2));

  // sc06: M113 mở bửng sau (146..150), đóng bửng chạy qua cầu nông thôn (153..157.04)
  const m113Ramp = A.win(t, 146.2, 153.4, 1.1, 0.9);
  const m113BridgeX = A.lerp(-240, 460, A.eio(t, 153.0, 157.04));

  // sc09: CTIS xả hơi làm bẹt lốp (217.8..225.4) rồi bơm căng lại trên đường nhựa (225.5..228.0)
  const tireFlatten = A.win(t, CUE.bleeding_air_snowshoe, CUE.pumps_hard_tarmac + 1.2, 1.4, 1.2);
  const tireShredded = A.sm(t, CUE.mg_shreds_outer + 0.6, CUE.mg_shreds_outer + 1.5);

  // sc11: RWS quét góc ngắm
  const rwsAim = Math.sin(t * 1.8) * 0.18;

  // sc12: APC bơi qua sông (304.2..313.4)
  const swimProgress = A.eio(t, CUE.trim_board_water_jets, 313.4);

  // sc13: Cần cẩu nhấc module chở quân và hạ module bệnh viện phẫu thuật cho Boxer (369.7..377.8)
  const boxerPodLift = A.eio(t, 369.7, 373.2);
  const boxerNewPodDrop = A.eio(t, 373.4, 377.2);

  return {
    convoyX,
    truckAlive,
    halfTrackAlive,
    kangarooGunRem,
    kangarooRacksRem,
    kangarooBenchesIn,
    kangarooDriveX,
    m113Ramp,
    m113BridgeX,
    tireFlatten,
    tireShredded,
    rwsAim,
    swimProgress,
    boxerPodLift,
    boxerNewPodDrop,
  };
}
