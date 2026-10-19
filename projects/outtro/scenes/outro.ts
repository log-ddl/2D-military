import { CanvasScene } from './shared/base';
import * as A from './shared/art';

/**
 * Outro 12 s, không chữ.
 * 0–2.4 các bộ phận bay vào lắp thành xe tăng · 2.3–3 lính trồi lên vẫy tay · 2.5–10 xe chạy chậm qua khung
 * mặt trời mọc → lặn 0–9.4, tối dần, sáng/bóng đổi dần · 10–11.3 vụt tắt CRT: đường ngang → chấm.
 */
const DUR = 12;
const GY = 700;          // mặt đất
const SC = 1.55;         // cỡ xe

type Part = { d: number; dx: number; dy: number; rot: number };
const P = (i: number, d: number): Part => ({
  d,
  dx: (A.rnd(i * 3.1) - 0.5) * 900,
  dy: -360 - A.rnd(i * 7.7) * 380,
  rot: (A.rnd(i * 5.3) - 0.5) * 2.4,
});
const parts = {
  track: P(1, 0.15), w0: P(2, 0.4), w1: P(3, 0.5), w2: P(4, 0.6), w3: P(5, 0.7), w4: P(6, 0.8), w5: P(7, 0.9),
  hull: P(8, 1.05), turret: P(9, 1.4), barrel: P(10, 1.7), hatch: P(11, 1.9), ant: P(12, 2.0),
};

export default class S extends CanvasScene {
  protected draw(c: CanvasRenderingContext2D, _t: number, lt: number) {
    A.clear(c);
    const cx = A.W / 2, cy = A.H / 2;
    // tiến độ ngày: 0 bình minh → 0.5 trưa → 1 hoàng hôn
    const day = A.ph(lt, 0, 9.4);
    const low = Math.pow(1 - Math.sin(Math.PI * day), 2);   // 1 khi mặt trời thấp
    const sunX = A.lerp(220, 1700, day);
    const sunY = GY + 30 - Math.sin(Math.PI * day) * 560 + 110 * A.sm(lt, 9.0, 10.4);
    const dusk = A.sm(day, 0.5, 1);   // càng về sau càng tối

    // collapse CRT bao cả cảnh
    const sy = 1 - A.ei(lt, 10.0, 10.7) * 0.995;
    const sx = 1 - A.eo(lt, 10.7, 11.3);
    c.save();
    c.translate(cx, cy);
    c.scale(Math.max(sx, 0.0001), Math.max(sy, 0.0001));
    c.translate(-cx, -cy);

    // trời đổi màu theo ánh sáng
    const sky = c.createLinearGradient(0, 0, 0, GY);
    sky.addColorStop(0, A.lerpColor('#f4f8fb', '#f3c9b0', low * 0.75));
    sky.addColorStop(1, A.lerpColor('#f4f8fb', '#fbe0c4', low));
    c.fillStyle = sky; c.fillRect(0, 0, A.W, GY);
    const night = c.createLinearGradient(0, 0, 0, GY);
    night.addColorStop(0, '#4b5a7a'); night.addColorStop(1, '#8a7f95');
    c.globalAlpha = dusk * 0.85; c.fillStyle = night; c.fillRect(0, 0, A.W, GY); c.globalAlpha = 1;

    // mặt trời: vòng ánh sáng + đĩa + tia xoay chậm
    const sunCol = A.lerpColor('#fde68a', '#f59e0b', low);
    c.save();
    c.beginPath(); c.rect(0, 0, A.W, GY); c.clip();
    const halo = c.createRadialGradient(sunX, sunY, 20, sunX, sunY, 260 + 120 * low);
    halo.addColorStop(0, `rgba(253,224,138,${0.55 + 0.15 * low})`); halo.addColorStop(1, 'rgba(253,224,138,0)');
    c.fillStyle = halo; c.fillRect(0, 0, A.W, GY);
    c.strokeStyle = sunCol; c.lineWidth = 5; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) {
      const a = lt * 0.25 + i * Math.PI / 7;
      c.beginPath();
      c.moveTo(sunX + Math.cos(a) * 82, sunY + Math.sin(a) * 82);
      c.lineTo(sunX + Math.cos(a) * (108 + 10 * Math.sin(lt * 2 + i)), sunY + Math.sin(a) * (108 + 10 * Math.sin(lt * 2 + i)));
      c.stroke();
    }
    c.fillStyle = sunCol; c.strokeStyle = A.C.ink; c.lineWidth = 4;
    c.beginPath(); c.arc(sunX, sunY, 62, 0, Math.PI * 2); c.fill(); c.stroke();
    c.restore();

    // đồi xa + đồi gần
    c.lineWidth = 4; c.strokeStyle = A.C.ink;
    c.fillStyle = A.lerpColor('#dbe4ec', '#e8c9b8', low * 0.8);
    c.beginPath(); c.moveTo(-40, GY); c.quadraticCurveTo(420, GY - 300, 980, GY); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = A.lerpColor('#cbd5e1', '#d9b3a3', low * 0.8);
    c.beginPath(); c.moveTo(1200, GY); c.quadraticCurveTo(1620, GY - 190, 2000, GY); c.closePath(); c.fill(); c.stroke();
    // đất
    c.fillStyle = A.lerpColor('#e8eff4', '#e2cdbd', low * 0.7);
    c.fillRect(0, GY, A.W, A.H - GY);
    c.beginPath(); c.moveTo(0, GY); c.lineTo(A.W, GY); c.stroke();

    // xe
    const drive = A.ph(lt, 2.5, 10.0);
    const tx = A.lerp(620, 2230, drive);
    this.tank(c, tx, GY + 14, lt, drive, sunX, low);

    c.fillStyle = `rgba(20,30,66,${0.5 * dusk})`; c.fillRect(0, 0, A.W, A.H);
    // lớp phủ ấm khi nắng thấp
    c.fillStyle = `rgba(245,158,11,${0.10 * low})`; c.fillRect(0, 0, A.W, A.H);
    // scanline đậm dần khi mất tín hiệu
    c.fillStyle = `rgba(30,41,59,${0.04 + 0.2 * A.bump(lt, 9.7, 0.8)})`;
    for (let y = 0; y < A.H; y += 6) c.fillRect(0, y, A.W, 2);
    c.restore();

    // đường ngang → chấm
    c.fillStyle = A.C.ink;
    if (lt >= 10.7) {
      const half = A.W / 2 * (1 - A.eo(lt, 10.7, 11.3)) + 5;
      c.globalAlpha = 1 - A.sm(lt, 11.4, DUR);
      c.fillRect(cx - half, cy - 2.5, half * 2, 5);
      c.globalAlpha = 1;
    }
  }

  private tank(c: CanvasRenderingContext2D, x: number, y: number, lt: number, drive: number, sunX: number, low: number) {
    // bóng đổ ngược hướng mặt trời
    const sh = A.clamp((x - sunX) / 700, -1, 1);
    const asm = A.sm(lt, 1.6, 2.3);
    c.save();
    c.fillStyle = `rgba(30,41,59,${0.16 * asm})`;
    c.beginPath();
    c.ellipse(x + sh * 120, y - 2, 170 * SC * (0.9 + 0.5 * low), 14, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();

    // chi tiết mỗi bộ phận: bay vào theo trình tự
    const ent = (p: Part) => {
      const k = A.back(lt, p.d, p.d + 0.55, 1.4);
      const o = 1 - k;
      const a = A.sm(lt, p.d, p.d + 0.18);
      c.translate(p.dx * o, p.dy * o);
      c.rotate(p.rot * o);
      c.globalAlpha = a;
      return a > 0.001;
    };
    const wheelRot = (x - 620) / 22 / SC;
    c.save();
    c.translate(x, y); c.scale(SC, SC);
    c.lineJoin = 'round'; c.strokeStyle = A.C.ink; c.lineWidth = 3.2;

    const part = (p: Part, f: () => void) => { c.save(); if (ent(p)) f(); c.restore(); };

    part(parts.track, () => {
      c.fillStyle = '#334155'; c.beginPath(); c.roundRect(-150, -62, 300, 62, 31); c.fill(); c.stroke();
    });
    ([parts.w0, parts.w1, parts.w2, parts.w3, parts.w4, parts.w5] as Part[]).forEach((p, i) => {
      part(p, () => {
        const wx = -110 + i * 44;
        c.translate(wx, -31);
        c.fillStyle = '#cbd5e1'; c.beginPath(); c.arc(0, 0, 22, 0, Math.PI * 2); c.fill(); c.stroke();
        c.rotate(wheelRot);
        c.lineWidth = 2.4;
        for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 4); c.beginPath(); c.moveTo(-15, 0); c.lineTo(15, 0); c.stroke(); }
        c.fillStyle = A.C.ink; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
      });
    });
    part(parts.hull, () => {
      c.fillStyle = '#7d8b5a';
      c.beginPath();
      c.moveTo(-145, -62); c.lineTo(-145, -104); c.lineTo(110, -104); c.lineTo(150, -78); c.lineTo(150, -62); c.closePath();
      c.fill(); c.stroke();
      c.lineWidth = 2; c.beginPath(); c.moveTo(-120, -86); c.lineTo(100, -86); c.stroke();
    });
    // lính trồi lên từ cửa tháp pháo (vẽ trước tháp pháo để bị che phần dưới)
    const rise = A.sm(lt, 2.3, 3.0);
    if (rise > 0) {
      const sxp = -18, base = -150 + (1 - rise) * 70;
      c.save();
      c.lineWidth = 3;
      // thân
      c.fillStyle = '#56633d';
      c.beginPath(); c.roundRect(sxp - 17, base - 44, 34, 52, 8); c.fill(); c.stroke();
      // tay vẫy: vai → cánh tay trên → cẳng tay
      const sh = [sxp + 12, base - 34];
      const up = -1.15 - 0.08 * Math.sin(lt * 3);
      const fa = up + 0.75 * Math.sin(lt * 8.5);
      const e: [number, number] = [sh[0] + Math.cos(up) * 36, sh[1] + Math.sin(up) * 36];
      const h: [number, number] = [e[0] + Math.cos(fa) * 34, e[1] + Math.sin(fa) * 34];
      c.strokeStyle = A.C.ink; c.lineWidth = 12; c.lineCap = 'round';
      c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(e[0], e[1]); c.lineTo(h[0], h[1]); c.stroke();
      c.strokeStyle = '#56633d'; c.lineWidth = 7;
      c.beginPath(); c.moveTo(sh[0], sh[1]); c.lineTo(e[0], e[1]); c.lineTo(h[0], h[1]); c.stroke();
      c.fillStyle = '#f1d3b0'; c.strokeStyle = A.C.ink; c.lineWidth = 3;
      c.beginPath(); c.arc(h[0], h[1], 8.5, 0, Math.PI * 2); c.fill(); c.stroke();
      // đầu + mũ
      c.beginPath(); c.arc(sxp, base - 62, 16, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#334155';
      c.beginPath(); c.arc(sxp, base - 66, 17, Math.PI, Math.PI * 2); c.closePath(); c.fill(); c.stroke();
      c.restore();
    }
    part(parts.turret, () => {
      c.fillStyle = '#a9b47f'; c.beginPath(); c.roundRect(-70, -150, 150, 48, 18); c.fill(); c.stroke();
    });
    part(parts.barrel, () => {
      c.fillStyle = '#475569';
      c.beginPath(); c.roundRect(76, -134, 170, 13, 4); c.fill(); c.stroke();
      c.beginPath(); c.roundRect(236, -139, 22, 23, 4); c.fill(); c.stroke();
    });
    part(parts.hatch, () => {
      c.fillStyle = '#64748b'; c.beginPath(); c.roundRect(-44, -160, 52, 12, 5); c.fill(); c.stroke();
    });
    part(parts.ant, () => {
      c.lineWidth = 2.4; c.lineCap = 'round';
      const w = Math.sin(lt * 5) * 6 * drive;
      c.beginPath(); c.moveTo(-58, -148); c.quadraticCurveTo(-64 + w * 0.5, -200, -70 + w, -250); c.stroke();
    });
    c.restore();
  }
}
