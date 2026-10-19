import * as A from './shared/art';
import { CUE } from './_cue';

// Trạng thái dùng chung xuyên suốt các cảnh để giữ tính liên tục vị trí, góc quay và trạng thái
export interface WorldState {
  radarSideX: number;
  radarGroundY: number;
  radarDishElev: number;
  radarTopAzimuth: number;
  jetSideX: number;
  jetSideY: number;
  rwrAlert: number;
}

export function stateAt(t: number): WorldState {
  const radarSideX = -520;
  const radarGroundY = 230;

  // Chảo ở góc SIDE luôn ngẩng hướng về phía mục tiêu trên cao (-0.34 rad)
  const radarDishElev = -0.34;

  // Góc quay phương vị ở góc TOP
  let radarTopAzimuth = -0.22;
  if (t >= CUE.ch1_question && t < 46.0) {
    radarTopAzimuth = (t - CUE.ch1_question) * 1.15;
  } else if (t >= CUE.ch1_dish_turns && t < CUE.ch1_end) {
    // Xoay từ -1.3 rad tới đúng phương vị mục tiêu (-0.28 rad) rồi khóa nhẹ
    radarTopAzimuth = A.lerp(-1.35, -0.28, A.eio(t, CUE.ch1_dish_turns, CUE.ch1_sharper));
  }

  // Vị trí máy bay đối phương ở góc SIDE trong Chương 1 (liên tục qua ranh giới 46.00s)
  let jetSideX = 440;
  let jetSideY = -140;
  if (t < CUE.ch1_question) {
    jetSideX = A.lerp(490, 310, A.ph(t, 0, CUE.ch1_question));
  } else if (t >= 45.0 && t < CUE.ch1_end) {
    // Trước 59.3s ở cự ly trung bình (360), tới 59.3–64.5s áp sát (150m -> x=160), từ 64.5s lùi xa (150km -> x=580)
    const nearP = A.eio(t, CUE.ch1_delay_150m - 0.5, CUE.ch1_delay_150m + 0.6);
    const farP = A.eio(t, CUE.ch1_delay_150km - 0.5, CUE.ch1_delay_150km + 0.7);
    jetSideX = 360 - 200 * nearP + 420 * farP;
    jetSideY = -135 + 45 * nearP - 95 * farP;
  }

  // Cảnh báo RWR trên máy bay khi nghe thấy tiếng hét của radar
  const rwrAlert =
    t >= CUE.ch1_receiver - 0.5 && t < CUE.ch1_question
      ? A.sm(t, CUE.ch1_receiver - 0.5, CUE.ch1_receiver + 0.8)
      : 0;

  return {
    radarSideX,
    radarGroundY,
    radarDishElev,
    radarTopAzimuth,
    jetSideX,
    jetSideY,
    rwrAlert,
  };
}
