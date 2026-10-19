// scenes/_state.ts — Trạng thái thế giới và camera liên tục dùng chung giữa các scene trong war_20.
import * as A from './shared/art';
import * as K from './shared/camera';
import { CUE } from './_cue';

// ── Tọa độ mốc trên bản đồ Đại Tây Dương (TOP: Chương 1 & Chương 5B) ──
export const ATLANTIC = {
  ascension: [-480, -340] as A.Pt,
  falkland: [480, 340] as A.Pt,
};

/** Điểm nội suy dọc tuyến bay Đại Tây Dương từ Ascension (-480,-340) tới Falkland (480,340) */
export function atlanticPt(u: number, offsetPerp = 0): [number, number, number] {
  const [x0, y0] = ATLANTIC.ascension;
  const [x1, y1] = ATLANTIC.falkland;
  const dx = x1 - x0;
  const dy = y1 - y0;
  const ang = Math.atan2(dy, dx);
  const nx = -Math.sin(ang);
  const ny = Math.cos(ang);
  const bx = A.lerp(x0, x1, u) + nx * offsetPerp;
  const by = A.lerp(y0, y1, u) + ny * offsetPerp;
  return [bx, by, ang];
}

/** Camera liên tục cho cụm bản đồ Đại Tây Dương Chương 1 (sc01 -> sc02, 0.00..41.96s) */
export function atlanticCamCh1(t: number): K.Cam {
  const keys: [number, K.Cam][] = [
    // Mở đầu cận đảo Falkland lúc thả 21 quả bom
    [0.0, { x: 460, y: 330, z: 1.75 }],
    [4.6, { x: 460, y: 330, z: 1.75 }],
    // Lia dọc lên đảo núi lửa Ascension & lùi rộng thấy toàn bộ 6.000 km
    [8.2, { x: -380, y: -270, z: 1.35 }],
    [10.2, { x: 0, y: 0, z: 0.92 }],
    [16.8, { x: 0, y: 0, z: 0.92 }],
    // Ranh giới sc01 -> sc02 (17.42s): thu về căn cứ Ascension đón 11 chiếc Victor cất cánh
    [17.42, { x: -340, y: -240, z: 1.22 }],
    [21.5, { x: -260, y: -180, z: 1.18 }],
    // Đi theo chuỗi tiếp sức từ Bắc xuống Nam qua 4 chặng
    [26.5, { x: -80, y: -60, z: 1.12 }],
    [31.5, { x: 140, y: 100, z: 1.12 }],
    [35.2, { x: 360, y: 255, z: 1.25 }],
    // Lùi ra toàn cảnh thấy hình tháp tiếp sức với chiếc Vulcan ở mũi nhọn
    [37.2, { x: 20, y: 15, z: 0.92 }],
    [41.96, { x: 20, y: 15, z: 0.92 }],
  ];
  return K.track(t, keys, A.eio);
}

/** Vị trí chuẩn của Tanker và Receiver trong không gian SIDE ở độ cao 8-9 km (dùng nối Chương 1 -> 2 -> 3 -> 4) */
export const SIDE_PAIR = {
  tanker: [210, -145] as A.Pt,
  receiverDocked: [-175, 110] as A.Pt,
};

/** Camera liên tục cho cụm Flying Boom ở Chương 2 (sc06 -> sc07 -> sc08, 156.08..252.56s) */
export function boomCamCh2(t: number): K.Cam {
  const keys: [number, K.Cam][] = [
    [156.08, { x: 0, y: -10, z: 1.0 }],
    [165.0, { x: 20, y: -20, z: 1.08 }],
    // Cận vào cần cứng 15m và cánh chữ V dưới đuôi tanker
    [170.5, { x: 35, y: -5, z: 1.42 }],
    [177.0, { x: 35, y: -5, z: 1.42 }],
    // Lùi vừa để thấy phi công receiver tiến vào vị trí nhìn đèn bụng
    [183.5, { x: 10, y: -15, z: 1.12 }],
    [195.08, { x: 10, y: -15, z: 1.12 }],
    // Ranh giới sc06 -> sc07 (195.08s): tiến lên thân Tanker xem Boom Operator
    [199.5, { x: 135, y: -135, z: 1.55 }],
    [209.5, { x: 175, y: -140, z: 1.50 }],
    // Lia xuống theo cần cứng khi Operator đẩy ống lồng khóa vào lưng tiêm kích
    [213.5, { x: -10, y: 15, z: 1.45 }],
    [222.0, { x: -35, y: 35, z: 1.52 }],
    // Lùi ra thấy tốc độ bơm 3.000 - 4.000 L/phút cho cả tiêm kích và oanh tạc cơ
    [226.0, { x: 0, y: 0, z: 1.05 }],
    [233.56, { x: 0, y: 0, z: 1.05 }],
  ];
  return K.track(t, keys, A.eio);
}

export { CUE };
