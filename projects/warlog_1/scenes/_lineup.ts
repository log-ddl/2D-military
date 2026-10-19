import * as V from './_assets';
import type { LineKey } from './_common';

/** Vẽ một loại xe NGANG theo khoá chuỗi (cùng thiết kế mọi chương). */
export function drawKind(c: CanvasRenderingContext2D, key: LineKey, x: number, y: number, s = 1, o: V.VO & { u?: number; cut?: number } = {}) {
  switch (key) {
    case 'truck': V.truck(c, x, y, s, o); break;
    case 'apc': V.apc(c, x, y, s, o); break;
    case 'ifv': V.ifv(c, x, y, s, o); break;
    case 'tank': V.tank(c, x, y, s, o); break;
    case 'arv': V.arv(c, x, y, s, o); break;
    case 'bridge': V.bridgeLayer(c, x, y, s, o); break;
  }
}
/** Chiều cao thân (đơn vị cục bộ) để đặt biểu tượng phía trên. */
export const TOP_OF: Record<LineKey, number> = { truck: 78, apc: 64, ifv: 104, tank: 98, arv: 104, bridge: 74 };
