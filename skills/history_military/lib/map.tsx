// Bản đồ: ảnh vệ tinh làm tối (tools/satmap.py tải kèm bbox) với nhãn ghim, tuyến, vùng theo kinh-vĩ độ thật; và bản đồ quân sự gốc trên nền kem.
// Cấm ước lượng vị trí bằng mắt: mọi điểm trên ảnh vệ tinh là [kinh độ, vĩ độ] thật. Vị trí chỉ gần đúng thì dòng nguồn ghi "vị trí minh hoạ".
import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { drift } from './footage';
import { useShot } from './shot';
import { C, ease, MONO, SANS, STENCIL, TITLE } from './theme';

export type LonLat = [number, number];
export type View = { center: LonLat; scale: number };
export type Pin = { at: number; pos: LonLat; text: string; sub?: string; side?: 'top' | 'bottom'; minor?: boolean };
export type Route = { at: number; dur?: number; pts: LonLat[]; label?: string };
export type Zone = { at: number; pts: LonLat[]; label?: string; sub?: string };

/** Xếp nhãn không đè nhau: mỗi nhãn thử lần lượt trên / dưới / phải / trái điểm ghim (rồi xa dần), chọn chỗ đầu tiên trống và nằm trong khung. */
type Box = { x: number; y: number; w: number; h: number };
const hit = (a: Box, b: Box, pad = 10) => a.x < b.x + b.w + pad && a.x + a.w + pad > b.x && a.y < b.y + b.h + pad && a.y + a.h + pad > b.y;
function place(px: number, py: number, w: number, h: number, prefer: 'top' | 'bottom', used: Box[]): Box {
  const order = prefer === 'top' ? ['top', 'bottom', 'right', 'left'] : ['bottom', 'top', 'right', 'left'];
  for (const gap of [54, 96, 140, 190]) for (const side of order) {
    const b: Box = side === 'top' ? { x: px - w / 2, y: py - gap - h, w, h } : side === 'bottom' ? { x: px - w / 2, y: py + gap, w, h }
      : side === 'right' ? { x: px + gap, y: py - h / 2, w, h } : { x: px - gap - w, y: py - h / 2, w, h };
    if (b.x < 50 || b.y < 50 || b.x + b.w > 1870 || b.y + b.h > 1000) continue;
    if (!used.some((u) => hit(b, u))) return b;
  }
  return { x: Math.min(1870 - w, Math.max(50, px - w / 2)), y: Math.max(50, py - 54 - h), w, h };
}

/**
 * `bbox` = [tây, nam, đông, bắc] và `size` = [rộng, cao] px của ảnh (satmap.py in sẵn dòng chép vào đây).
 * `view` = [đầu, cuối] của shot: tâm + độ phóng (scale 1 = ảnh rộng bằng khung). Nhãn / tuyến / vùng hiện ở `at`.
 * Nhãn tự né nhau và nối về điểm ghim bằng nét dẫn. `minor: true` cho chú thích phụ (thẻ nhỏ, nhạt): mỗi bản đồ tối đa 2 nhãn chính + 3 nhãn phụ.
 * Các điểm quá gần nhau trên khung (< ~120 px) thì phóng `view.scale` to hơn hoặc tách thành hai shot; đừng nhồi.
 */
export const SatMap: React.FC<{ src: string; bbox: [number, number, number, number]; size: [number, number]; view: [View, View]; pins?: Pin[]; routes?: Route[]; zones?: Zone[]; title?: string; sub?: string; grid?: boolean }> = ({
  src, bbox, size, view, pins = [], routes = [], zones = [], title, sub, grid = true,
}) => {
  const t = useT();
  const { from, to } = useShot();
  const dr = drift(t, from, to, from + 11, 3);
  const p = dr.p;
  const sc = lerp(view[0].scale, view[1].scale, p);
  const cLon = lerp(view[0].center[0], view[1].center[0], p), cLat = lerp(view[0].center[1], view[1].center[1], p);
  const k = (1920 * sc) / size[0];
  const raw = ([lon, lat]: LonLat) => [((lon - bbox[0]) / (bbox[2] - bbox[0])) * size[0], ((bbox[3] - lat) / (bbox[3] - bbox[1])) * size[1]];
  const [ccx, ccy] = raw([cLon, cLat]);
  const px = (q: LonLat) => { const [x, y] = raw(q); return [(x - ccx) * k + 960 + dr.x, (y - ccy) * k + 540 + dr.y] as const; };
  const d = (pts: LonLat[]) => pts.map((q, i) => `${i ? 'L' : 'M'}${px(q).map((v) => v.toFixed(1)).join(' ')}`).join(' ');
  // lưới toạ độ: bước 0,1° (hoặc 0,05° / 0,5° theo độ phóng), đánh số ở mép như bản đồ quân sự
  const span = (bbox[2] - bbox[0]) / sc, step = span > 2.5 ? 0.5 : span > 0.9 ? 0.1 : 0.05;
  const gl: React.ReactNode[] = [];
  if (grid) {
    for (let lon = Math.ceil(bbox[0] / step) * step; lon <= bbox[2]; lon += step) { const x = px([lon, cLat])[0]; if (x > 0 && x < 1920) gl.push(
      <g key={'v' + lon.toFixed(2)}><line x1={x} y1={0} x2={x} y2={1080} stroke="#fff" strokeOpacity={0.09} strokeWidth={1} /><text x={x + 6} y={1066} fill="#fff" fillOpacity={0.4} fontFamily={MONO} fontSize={15}>{lon.toFixed(2)}°Đ</text></g>); }
    for (let lat = Math.ceil(bbox[1] / step) * step; lat <= bbox[3]; lat += step) { const y = px([cLon, lat])[1]; if (y > 0 && y < 1080) gl.push(
      <g key={'h' + lat.toFixed(2)}><line x1={0} y1={y} x2={1920} y2={y} stroke="#fff" strokeOpacity={0.09} strokeWidth={1} /><text x={10} y={y - 6} fill="#fff" fillOpacity={0.4} fontFamily={MONO} fontSize={15}>{lat.toFixed(2)}°B</text></g>); }
  }
  // xếp nhãn theo vị trí CUỐI shot để nhãn không nhảy chỗ khi máy đẩy
  const used: Box[] = title ? [{ x: 50, y: 40, w: 520, h: 120 }] : [];
  const kEnd = (1920 * view[1].scale) / size[0], [ex, ey] = raw(view[1].center);
  const pxEnd = (q: LonLat) => { const [x, y] = raw(q); return [(x - ex) * kEnd + 960, (y - ey) * kEnd + 540] as const; };
  const boxes = [...pins].sort((a, b) => Number(!!a.minor) - Number(!!b.minor)).map((n) => {
    const fs = n.minor ? 22 : 34, w = Math.max(n.text.length * fs * 0.6, (n.sub?.length ?? 0) * 11) + 40, h = (n.minor ? 38 : 56) + (n.sub ? 26 : 0);
    const [x, y] = pxEnd(n.pos); const b = place(x, y, w, h, n.side ?? 'top', used); used.push(b); return { n, b, off: [b.x - x, b.y - y] as const };
  });
  const routeBoxes = routes.filter((r) => r.label).map((r) => { const m = pxEnd(r.pts[Math.floor(r.pts.length / 2)]); const w = r.label!.length * 15 + 30;
    const b = place(m[0], m[1], w, 40, 'bottom', used); used.push(b); return { r, off: [b.x - m[0], b.y - m[1]] as const, w }; });
  return (
    <AbsoluteFill style={{ backgroundColor: '#0c120e', overflow: 'hidden' }}>
      <Img src={src} style={{ position: 'absolute', left: 960 - ccx * k + dr.x, top: 540 - ccy * k + dr.y, width: size[0] * k, height: size[1] * k, filter: 'saturate(0.55) sepia(0.18) brightness(0.92) contrast(1.22)' }} />
      <AbsoluteFill style={{ backgroundColor: '#3d4a2e', mixBlendMode: 'soft-light', opacity: 0.5 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 50%, rgba(0,0,0,0.6) 100%)' }} />
      <svg width={1920} height={1080} style={{ position: 'absolute', inset: 0 }}>
        <defs><marker id="hmArrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={C.red} /></marker></defs>
        {gl}
        {zones.map((z, i) => <path key={i} d={d(z.pts) + ' Z'} fill={C.red} fillOpacity={0.28 * ease(t, z.at, 0.6)} stroke={C.red} strokeOpacity={0.9 * ease(t, z.at, 0.6)} strokeWidth={2.5} strokeDasharray="14 8" />)}
        {routes.map((r, i) => { const q = prog(t, r.at, r.at + (r.dur ?? 1.4)); return q <= 0 ? null : (
          <g key={i}><path d={d(r.pts)} fill="none" stroke="#000" strokeOpacity={0.45} strokeWidth={11} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} />
            <path d={d(r.pts)} fill="none" stroke={C.red} strokeWidth={5} strokeLinecap="round" pathLength={1} strokeDasharray={`${q} 1`} markerEnd={q > 0.97 ? 'url(#hmArrow)' : undefined} /></g>); })}
        {boxes.map(({ n, off }, i) => { const [x, y] = px(n.pos), a = ease(t, n.at, 0.4); const fs = n.minor ? 22 : 34, h = (n.minor ? 38 : 56) + (n.sub ? 26 : 0);
          const w = Math.max(n.text.length * fs * 0.6, (n.sub?.length ?? 0) * 11) + 40; const lx = x + off[0] + w / 2, ly = y + off[1] + (off[1] < 0 ? h : 0);
          return <g key={'l' + i} opacity={a}><line x1={x} y1={y} x2={lerp(x, lx, a)} y2={lerp(y, ly, a)} stroke="#f3f1ea" strokeWidth={n.minor ? 1.5 : 2.5} />
            <circle cx={x} cy={y} r={n.minor ? 5 : 8} fill={n.minor ? '#f3f1ea' : C.red} stroke="#f3f1ea" strokeWidth={2} /></g>; })}
      </svg>
      {zones.filter((z) => z.label).map((z, i) => { const m = px(z.pts.reduce((a, q) => [a[0] + q[0] / z.pts.length, a[1] + q[1] / z.pts.length] as LonLat, [0, 0] as LonLat));
        return <div key={'z' + i} style={{ position: 'absolute', left: m[0], top: m[1], transform: 'translate(-50%,-50%)', opacity: ease(t, z.at + 0.3), textAlign: 'center', background: C.red, color: C.white, padding: '6px 14px', fontFamily: STENCIL, fontWeight: 600, fontSize: 28, letterSpacing: '0.06em' }}>
          {z.label}{z.sub ? <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 18, opacity: 0.9, letterSpacing: 0 }}>{z.sub}</div> : null}</div>; })}
      {routeBoxes.map(({ r, off, w }, i) => { const m = px(r.pts[Math.floor(r.pts.length / 2)]);
        return <div key={'r' + i} style={{ position: 'absolute', left: m[0] + off[0], top: m[1] + off[1], width: w, height: 40, opacity: ease(t, r.at + (r.dur ?? 1.4) * 0.6), background: C.red, color: C.white,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontWeight: 600, fontSize: 22 }}>{r.label}</div>; })}
      {boxes.map(({ n, off }, i) => { const [x, y] = px(n.pos), a = ease(t, n.at, 0.4); const fs = n.minor ? 22 : 34; return (
        <div key={i} style={{ position: 'absolute', left: x + off[0], top: y + off[1] + (1 - a) * 8, opacity: a, whiteSpace: 'nowrap', textAlign: 'center',
          background: n.minor ? 'rgba(24,26,22,0.82)' : 'rgba(16,17,15,0.94)', border: `1px solid rgba(243,241,234,${n.minor ? 0.28 : 0.55})`, borderTop: n.minor ? undefined : `4px solid ${C.red}`,
          boxShadow: '0 6px 18px rgba(0,0,0,0.55)', color: C.white, padding: n.minor ? '5px 14px 4px' : '8px 20px 6px' }}>
          <div style={{ fontFamily: n.minor ? SANS : TITLE, fontWeight: n.minor ? 500 : 700, fontSize: fs, letterSpacing: n.minor ? '0.01em' : '0.04em', lineHeight: 1.15 }}>{n.text}</div>
          {n.sub ? <div style={{ fontFamily: MONO, fontSize: 18, opacity: 0.78, marginTop: 2 }}>{n.sub}</div> : null}
        </div>); })}
      {title ? <MapChip title={title} sub={sub} /> : null}
    </AbsoluteFill>
  );
};

/** Chip tên bản đồ góc trên trái. */
export const MapChip: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => {
  const t = useT();
  const { from } = useShot();
  return (
    <div style={{ position: 'absolute', left: 70, top: 62, opacity: ease(t, from + 0.15, 0.35), background: 'rgba(20,20,18,0.92)', color: C.white, fontFamily: STENCIL, fontWeight: 600, fontSize: 30, letterSpacing: '0.07em', padding: '8px 18px 6px', textTransform: 'uppercase', border: '1px solid rgba(243,241,234,0.4)' }}>
      {title}{sub ? <div style={{ fontFamily: SANS, fontWeight: 400, fontSize: 21, opacity: 0.8, letterSpacing: 0, textTransform: 'none', paddingBottom: 4 }}>{sub}</div> : null}
    </div>
  );
};

/** Bản đồ / bản vẽ quân sự gốc (ảnh quét từ sách) trên nền kem, hơi nghiêng, đẩy chậm. `focus` = [x%, y%] vùng cần xem; `zoom` = [đầu, cuối]. */
export const ArchiveMap: React.FC<{ src: string; focus?: [number, number]; zoom?: [number, number]; tilt?: number; title?: string; sub?: string }> = ({ src, focus = [50, 40], zoom = [1.0, 1.07], tilt = -10, title, sub }) => {
  const t = useT();
  const { from, to } = useShot();
  const p = prog(t, from, to, (x) => x);
  return (
    <AbsoluteFill style={{ backgroundColor: C.cream, overflow: 'hidden' }}>
      <AbsoluteFill style={{ transform: `rotate(${lerp(tilt, tilt + 1.5, p)}deg) scale(1.3)`, backgroundColor: C.cream }}>
        <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${focus[0]}% ${focus[1]}%`,
          transform: `scale(${lerp(zoom[0], zoom[1], p)})`, transformOrigin: `${focus[0]}% ${focus[1]}%`, mixBlendMode: 'multiply', filter: 'sepia(0.35) contrast(1.1)' }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(236,228,204,0) 55%, rgba(120,105,70,0.35) 100%)' }} />
      {title ? <MapChip title={title} sub={sub} /> : null}
    </AbsoluteFill>
  );
};
