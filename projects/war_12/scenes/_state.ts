import * as A from './shared/art';
import * as F from './shared/fx';

// Tọa độ chuẩn cho Thế giới Lát cắt Trái Đất - Vũ trụ (Earth-to-Space Side World)
export const WORLD_SIDE = {
  groundY: 320,
  karmanY: -90,
  launchSite: [-740, 310] as A.Pt,
  satellitePos: [-180, -340] as A.Pt,
  radarSite: [420, 304] as A.Pt,
  siloSite: [620, 310] as A.Pt,
  terminalSite: [760, 312] as A.Pt,
  citySite: [835, 315] as A.Pt,
  arcApexH: 560,
} as const;

// Tọa độ chuẩn cho Thế giới Bản đồ Chiến dịch (Strategic Top-Down Map World)
export const WORLD_TOP = {
  launchPad: [-640, 40] as A.Pt,
  boostRadius: 230, // Bán kính vài trăm km quanh điểm phóng (nằm gọn trong lãnh thổ đối phương)
  enemyBorderX: -190,
  defenderCoastX: 250,
  radarTop: [340, -140] as A.Pt,
  cityNorth: [580, -210] as A.Pt,
  citySouth: [640, 190] as A.Pt,
  baseCentral: [460, 20] as A.Pt,
} as const;

/**
 * Lấy vị trí [x, y, ang] trên cung quỹ đạo đạn đạo chuẩn từ điểm phóng (-740, 310) tới thành phố (835, 315)
 * với tiến độ u trong [0, 1].
 * - u in [0, 0.24]: Giai đoạn 1 - Boost phase (đốt tầng đẩy leo lên không gian)
 * - u in [0.24, 0.78]: Giai đoạn 2 - Midcourse phase (bay quán tính trong chân không vũ trụ)
 * - u in [0.78, 1.0]: Giai đoạn 3 - Terminal phase (hồi quyển lao xuống mục tiêu)
 */
export function ballisticArcAt(u: number): [number, number, number] {
  return F.arcPos(
    WORLD_SIDE.launchSite,
    WORLD_SIDE.citySite,
    A.clamp01(u),
    WORLD_SIDE.arcApexH
  );
}

/**
 * Vẽ đường quỹ đạo đạn đạo từ u0 đến u1 trên thế giới `side`.
 */
export function drawBallisticCurve(
  c: CanvasRenderingContext2D,
  u0: number,
  u1: number,
  color: string,
  width: number,
  dash?: number[]
) {
  if (u1 <= u0) return;
  const pts: A.Pt[] = [];
  const N = 48;
  for (let i = 0; i <= N; i++) {
    const u = A.lerp(u0, u1, i / N);
    const [x, y] = ballisticArcAt(u);
    pts.push([x, y]);
  }
  A.line(c, pts, color, width, dash);
}
