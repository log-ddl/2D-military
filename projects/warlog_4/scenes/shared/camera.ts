// kit/camera.ts — camera thuần toán học + chuyển cảnh.
// Camera chỉ trả lời: điểm nào của thế giới nằm giữa khung, phóng bao nhiêu, xoay bao nhiêu.
// Không tự cộng zoom hay lệch ẩn. Không vẽ nền.
import { W, H, C, type Pt, clamp01, lerp, sm, rnd, withA } from './art';

export interface Cam {
  x: number; // điểm thế giới nằm ở tâm màn hình (hoặc ở sx, sy)
  y: number;
  z: number; // 1 = 1 đơn vị thế giới = 1 px
  rot?: number; // radian
  sx?: number; // vị trí tâm trên màn hình, mặc định W/2
  sy?: number; // mặc định H/2
}

/** Đặt transform camera. Luôn đi cặp: begin(...) vẽ thế giới ... end(c). */
export function begin(c: CanvasRenderingContext2D, k: Cam) {
  c.save();
  c.translate(k.sx ?? W / 2, k.sy ?? H / 2);
  if (k.rot) c.rotate(k.rot);
  c.scale(k.z, k.z);
  c.translate(-k.x, -k.y);
}
export function end(c: CanvasRenderingContext2D) {
  c.restore();
}

/** Thế giới → màn hình (dùng để đặt callout, thanh, UI đúng chỗ đối tượng). */
export function toScreen(k: Cam, wx: number, wy: number): Pt {
  const dx = (wx - k.x) * k.z, dy = (wy - k.y) * k.z;
  const r = k.rot ?? 0, cs = Math.cos(r), sn = Math.sin(r);
  return [(k.sx ?? W / 2) + dx * cs - dy * sn, (k.sy ?? H / 2) + dx * sn + dy * cs];
}
/** Màn hình → thế giới. */
export function toWorld(k: Cam, sx: number, sy: number): Pt {
  const dx = sx - (k.sx ?? W / 2), dy = sy - (k.sy ?? H / 2);
  const r = -(k.rot ?? 0), cs = Math.cos(r), sn = Math.sin(r);
  return [k.x + (dx * cs - dy * sn) / k.z, k.y + (dx * sn + dy * cs) / k.z];
}
/** Vùng thế giới đang thấy (bỏ qua rot), có lề m đơn vị thế giới. */
export function view(k: Cam, m = 0) {
  const hw = W / k.z / 2 + m, hh = H / k.z / 2 + m;
  return { x0: k.x - hw, x1: k.x + hw, y0: k.y - hh, y1: k.y + hh };
}

/**
 * Camera ôm trọn một hộp chủ thể: hộp chiếm `frac` khung (theo chiều chặt hơn).
 * Dùng cho shot toàn thân: frac ≈ 0.8 → chủ thể lớn mà vẫn trọn khung, không chạm mép (RULES §2).
 */
export function fit(box: { x: number; y: number; w: number; h: number }, frac = 0.7, off: Pt = [0, 0]): Cam {
  const z = Math.min((W * frac) / box.w, (H * frac) / box.h);
  return { x: box.x + box.w / 2 - off[0] / z, y: box.y + box.h / 2 - off[1] / z, z };
}

/** Nội suy hai camera. Zoom nội suy theo log để tốc độ phóng đều mắt. */
export function mix(a: Cam, b: Cam, p: number): Cam {
  const z = Math.exp(lerp(Math.log(a.z), Math.log(b.z), p));
  // giữ điểm tâm đi theo đường "bay" tự nhiên khi zoom lớn: nội suy theo 1/z
  const w = a.z === b.z ? p : (1 / a.z - 1 / z) / (1 / a.z - 1 / b.z);
  const q = Number.isFinite(w) ? clamp01(w) : p;
  return {
    x: lerp(a.x, b.x, q), y: lerp(a.y, b.y, q), z,
    rot: lerp(a.rot ?? 0, b.rot ?? 0, p),
    sx: lerp(a.sx ?? W / 2, b.sx ?? W / 2, p), sy: lerp(a.sy ?? H / 2, b.sy ?? H / 2, p),
  };
}

/** Camera theo keyframe: [[t, cam], ...], mượt (smoothstep) giữa các key. */
export function track(t: number, ks: [number, Cam][], ease: (t: number, a: number, b: number) => number = sm): Cam {
  if (t <= ks[0]![0]) return ks[0]![1];
  for (let i = 1; i < ks.length; i++) {
    if (t <= ks[i]![0]) return mix(ks[i - 1]![1], ks[i]![1], ease(t, ks[i - 1]![0], ks[i]![0]));
  }
  return ks[ks.length - 1]![1];
}

/**
 * Bám theo một đối tượng chuyển động, có độ trễ (camera "đuổi" theo, không dính cứng).
 * pos(t) trả vị trí thế giới của đối tượng; lag giây; lead > 0 thì nhìn trước hướng đi.
 */
export function follow(t: number, pos: (t: number) => Pt, z: number, lag = 0.35, lead = 0, base: Partial<Cam> = {}): Cam {
  const N = 8;
  let x = 0, y = 0, wsum = 0;
  for (let i = 0; i < N; i++) {
    const w = Math.exp(-i / (N / 3));
    const [px, py] = pos(t - (i / (N - 1)) * lag);
    x += px * w; y += py * w; wsum += w;
  }
  x /= wsum; y /= wsum;
  if (lead) {
    const [a, b] = pos(t), [a2, b2] = pos(t + 0.1);
    x += (a2 - a) * 10 * lead; y += (b2 - b) * 10 * lead;
  }
  return { ...base, x, y, z };
}

/** Độ lệch rung tại t sau cú nổ ở t0. Trả [dx, dy] theo pixel màn hình. */
export function shake(t: number, t0: number, dur = 0.5, amp = 14): Pt {
  const p = (t - t0) / dur;
  if (p < 0 || p > 1) return [0, 0];
  const k = (1 - p) * (1 - p) * amp;
  return [Math.sin(t * 90 + t0) * k, Math.cos(t * 77 + t0 * 3) * k];
}
/** Cộng rung từ nhiều cú [t0, amp, dur?] vào camera (đổi ra đơn vị thế giới). */
export function withShake(k: Cam, t: number, hits: [number, number, number?][]): Cam {
  let dx = 0, dy = 0;
  for (const [t0, amp, dur] of hits) { const [a, b] = shake(t, t0, dur ?? 0.5, amp); dx += a; dy += b; }
  return { ...k, x: k.x - dx / k.z, y: k.y - dy / k.z };
}
/** Rung tay nhẹ liên tục (camera cầm tay), biên độ px. */
export function handheld(k: Cam, t: number, amp = 3): Cam {
  const dx = (Math.sin(t * 1.3) + Math.sin(t * 2.9 + 1) * 0.5) * amp;
  const dy = (Math.cos(t * 1.1) + Math.sin(t * 2.3 + 2) * 0.5) * amp;
  return { ...k, x: k.x + dx / k.z, y: k.y + dy / k.z };
}

// ── Chuyển cảnh (vẽ đè lên màn hình, toạ độ màn hình) ─────────────
// Mọi hàm nhận lt (giây trong scene) và at (mốc cắt), đều tất định theo thời gian.

function screen(c: CanvasRenderingContext2D, fn: () => void) {
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  fn();
  c.restore();
}

/** Chớp trắng ngắn tại mốc cắt. */
export function cutFlash(c: CanvasRenderingContext2D, lt: number, at: number, w = 0.14, color = '#fff') {
  const f = Math.max(0, 1 - Math.abs(lt - at) / w);
  screen(c, () => withA(c, f, () => { c.fillStyle = color; c.fillRect(0, 0, W, H); }));
}

/** Fade màu phủ khung: a = 0..1. */
export function fade(c: CanvasRenderingContext2D, a: number, color: string = C.bg) {
  screen(c, () => withA(c, a, () => { c.fillStyle = color; c.fillRect(0, 0, W, H); }));
}

/**
 * Lia nhanh (whip pan): vệt nhoè ngang tại mốc cắt. Dùng cùng với camera dịch nhanh
 * ở phía trước/sau mốc để cảm giác quăng máy.
 */
export function whip(c: CanvasRenderingContext2D, lt: number, at: number, w = 0.18, dir: 1 | -1 = 1) {
  const p = 1 - Math.abs(lt - at) / w;
  if (p <= 0) return;
  screen(c, () => {
    for (let i = 0; i < 26; i++) {
      const y = rnd(i + 1) * H, h = 6 + rnd(i + 7) * 40;
      const x = ((rnd(i + 3) * W + dir * (lt - at) * 9000) % (W * 1.5)) - W * 0.25;
      withA(c, p * (0.25 + 0.4 * rnd(i + 9)), () => {
        c.fillStyle = i % 3 ? '#ffffff' : C.bg2;
        c.fillRect(x, y, W * (0.3 + rnd(i + 5) * 0.5), h);
      });
    }
    withA(c, p * p * 0.85, () => { c.fillStyle = '#fff'; c.fillRect(0, 0, W, H); });
  });
}

/** Gạt màn: p 0..1, màu phủ chạy ngang theo dir; nửa đầu che, nửa sau mở. */
export function wipe(c: CanvasRenderingContext2D, p: number, dir: 1 | -1 = 1, color: string = C.ink) {
  if (p <= 0 || p >= 1) return;
  screen(c, () => {
    const a = p < 0.5 ? 0 : (p - 0.5) * 2, b = p < 0.5 ? p * 2 : 1;
    const x0 = dir > 0 ? a * W : (1 - b) * W, x1 = dir > 0 ? b * W : (1 - a) * W;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x0 - 120, 0); c.lineTo(x1, 0); c.lineTo(x1 - 120, H); c.lineTo(x0 - 240, H);
    c.closePath(); c.fill();
  });
}

/** Mở/đóng ống kính tròn quanh (x, y) màn hình: p = 0 kín, 1 mở hết. */
export function iris(c: CanvasRenderingContext2D, p: number, x = W / 2, y = H / 2, color: string = C.ink) {
  if (p >= 1) return;
  screen(c, () => {
    const R = Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) * clamp01(p);
    c.fillStyle = color;
    c.beginPath();
    c.rect(0, 0, W, H);
    c.arc(x, y, Math.max(0, R), 0, Math.PI * 2, true);
    c.fill('evenodd');
  });
}

/** Viền khung đen trên/dưới (letterbox) cho khoảnh khắc kịch tính: a = 0..1. */
export function bars(c: CanvasRenderingContext2D, a: number, size = 110) {
  if (a <= 0) return;
  screen(c, () => {
    c.fillStyle = C.ink;
    c.fillRect(0, 0, W, size * a);
    c.fillRect(0, H - size * a, W, size * a);
  });
}
