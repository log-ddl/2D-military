// scenes/_state.ts — Trạng thái liên tục của các vật thể xuyên chương (đảm bảo điểm nối khớp 100%).
import type * as K from './shared/camera';

export interface ChapterBoundaryState {
  cam: K.Cam;
  mbtPos: [number, number];
  ifvPos: [number, number];
  bmpPos: [number, number];
}

// Trạng thái chuẩn tại các ranh giới chương để chương sau bắt đầu khớp tuyệt đối với cuối chương trước:
export const BOUNDARY = {
  // Cuối Chương 1 (t = 72.60s) -> Đầu Chương 2 (t = 72.60s):
  // MBT (trên, y = -135) và IFV (dưới, y = 175) ở góc SIDE Cutaway đang đối chiếu giải phẫu
  ch1_to_ch2: {
    cam: { x: 10, y: -35, z: 1.32 } as K.Cam,
    mbtPos: [0, -135] as [number, number],
    ifvPos: [0, 175] as [number, number],
  },
  // Cuối Chương 2 (t = 129.95s) -> Đầu Chương 3 (t = 129.95s):
  // Camera cận vào khoang bộ binh phía sau của thân xe ở góc SIDE Cutaway (x = -120, y = -95, z = 1.95)
  ch2_to_ch3: {
    cam: { x: -115, y: -95, z: 1.92 } as K.Cam,
    ifvPos: [0, 0] as [number, number],
  },
  // Cuối Chương 3 (t = 200.70s) -> Đầu Chương 4 (t = 200.70s):
  // Camera đang nhìn vào giỏ tháp pháo ở giữa thân IFV (x = 10, y = -110, z = 1.65)
  ch3_to_ch4: {
    cam: { x: 10, y: -110, z: 1.65 } as K.Cam,
    ifvPos: [0, 0] as [number, number],
  },
  // Cuối Chương 4 (t = 289.50s) -> Đầu Chương 5 (t = 289.50s):
  // Chiếc IFV ở trung tâm (x = 0, y = 0) bị hỏa lực đối phương từ bên phải nhắm bắn (z = 1.35)
  ch4_to_ch5: {
    cam: { x: 0, y: -90, z: 1.35 } as K.Cam,
    ifvPos: [0, 0] as [number, number],
  },
  // Cuối Chương 5 (t = 398.10s) -> Đầu Chương 6 (t = 398.10s):
  // Chiếc IFV ở trung tâm (x = 0, y = 0) góc SIDE, sẵn sàng chuyển sang tình huống bị bắn cháy khi đi lẻ vs phối hợp
  ch5_to_ch6: {
    cam: { x: 0, y: -95, z: 1.42 } as K.Cam,
    ifvPos: [0, 0] as [number, number],
  },
} as const;
