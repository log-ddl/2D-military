// Nền bản đồ cho cảnh military-2d. Hai loại nền, CHUNG một cách dùng: con là hàm nhận `proj`, mọi thứ vẽ theo [kinh độ, vĩ độ] thật.
// - <GeoBase>: bản đồ vector thế giới (Natural Earth) — cấp châu lục / quốc gia / chiến trường rộng (bề ngang từ ~400 km trở lên).
// - <SatBase>: ảnh vệ tinh làm tối (skills/history_military/tools/satmap.py tải kèm bbox) — cấp chiến dịch / trận đánh (dưới ~400 km),
//   nơi đường bờ biển vector quá thô và người xem cần thấy núi, sông, thung lũng thật.
// Đặt trong <Cam2D>; toạ độ thế giới = pixel của nền (mặc định rộng 1920, cho `width` lớn hơn khi cần phóng sâu mà vẫn nét).
import React, { useMemo } from 'react';
import { Img } from 'remotion';
import { Defs2D } from '@skill/military/2d/look';
import { GeoMap, type GeoMapProps } from '@skill/military/2d/map';
import { M } from './theme';

export type LonLat = [number, number];
export type Pt = [number, number];
export type Proj = {
  width: number;
  height: number;
  /** [kinh độ, vĩ độ] → [x, y] thế giới. */
  project: (p: LonLat) => Pt;
  /** Nhiều điểm một lượt (cho mũi tên, tuyến, vùng). */
  pts: (ps: LonLat[]) => Pt[];
  /** Số pixel thế giới ứng với `km` tại vĩ độ của `at` (vòng tầm bắn, thước tỉ lệ). */
  km: (km: number, at: LonLat) => number;
};

const wrap = (project: (p: LonLat) => Pt, width: number, height: number): Proj => ({
  width,
  height,
  project,
  pts: (ps) => ps.map(project),
  km: (km, at) => {
    const dLon = km / (111.32 * Math.cos((at[1] * Math.PI) / 180));
    const [x0] = project(at);
    const [x1] = project([at[0] + dLon, at[1]]);
    return Math.abs(x1 - x0);
  },
});

/** Bản đồ vector thế giới. Nhận mọi props của GeoMap (`bounds`, `highlight`, `showGrid`…); màu mặc định theo bảng M. */
export const GeoBase: React.FC<Omit<GeoMapProps, 'children'> & { children?: (proj: Proj) => React.ReactNode }> = ({ children, width = 1920, height = 1080, ...rest }) => (
  <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
    <Defs2D />
    <GeoMap seaFill={M.sea} landFill={M.land} landStroke={M.coast} gridColor={M.grid} width={width} height={height} {...rest}>
      {(p) => (children ? children(wrap(p.project, width, height)) : null)}
    </GeoMap>
  </svg>
);

/**
 * Ảnh vệ tinh làm nền. `bbox` = [tây, nam, đông, bắc] và `size` = [rộng, cao] px của ảnh: chép đúng dòng satmap.py in ra.
 * `dim` 0..1: phủ tối thêm (vùng sa mạc / tuyết sáng cần ~0.55 để ra cảnh đêm và để ký hiệu nổi).
 * `tone`: 'night' (mặc định: tối, ngả xanh, để mũi tên và chữ nổi) | 'day' (giữ màu, hơi dịu) | 'paper' (ngả nâu kiểu bản đồ giấy).
 */
export const SatBase: React.FC<{ src: string; bbox: [number, number, number, number]; size: [number, number]; width?: number; tone?: 'night' | 'day' | 'paper'; dim?: number; grid?: boolean; children?: (proj: Proj) => React.ReactNode }> = ({
  src, bbox, size, width = 1920, tone = 'night', dim = 0, grid = false, children,
}) => {
  const height = Math.round((width * size[1]) / size[0]);
  const proj = useMemo(
    () => wrap(([lon, lat]) => [((lon - bbox[0]) / (bbox[2] - bbox[0])) * width, ((bbox[3] - lat) / (bbox[3] - bbox[1])) * height], width, height),
    [bbox[0], bbox[1], bbox[2], bbox[3], width, height],
  );
  const filter = tone === 'night' ? 'saturate(0.55) brightness(1.05) contrast(1.2)' : tone === 'paper' ? 'sepia(0.55) saturate(0.6) brightness(0.82) contrast(1.05)' : 'saturate(0.8) brightness(0.86)';
  const tint = tone === 'night' ? 'rgba(12,34,60,0.3)' : tone === 'paper' ? 'rgba(120,96,60,0.16)' : 'rgba(10,20,34,0.12)';
  const step = (bbox[2] - bbox[0]) / 8;
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width, height }}>
      <Img src={src} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter }} />
      <div style={{ position: 'absolute', inset: 0, background: tint }} />
      {dim > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(4,10,22,${dim})` }} />}
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <Defs2D />
        {grid && (
          <g opacity={0.22} stroke="#cfe2f5" strokeWidth={0.8} strokeDasharray="4 8">
            {Array.from({ length: 9 }, (_, i) => {
              const [x] = proj.project([bbox[0] + step * i, bbox[1]]);
              return <line key={`v${i}`} x1={x} y1={0} x2={x} y2={height} />;
            })}
            {Array.from({ length: 6 }, (_, i) => {
              const y = (height * i) / 5;
              return <line key={`h${i}`} x1={0} y1={y} x2={width} y2={y} />;
            })}
          </g>
        )}
        {children ? children(proj) : null}
      </svg>
    </div>
  );
};

/** Điểm thế giới → điểm màn hình khi đang dùng <Cam2D x y zoom rot>: để đặt <PhotoCard pin>, <Label>, <Callout> (lớp HTML theo màn hình) đúng chỗ trên bản đồ. */
export const screenOf = (cam: { x: number; y: number; zoom?: number; rot?: number; shake?: readonly [number, number] }, p: Pt): Pt => {
  const z = cam.zoom ?? 1, a = ((cam.rot ?? 0) * Math.PI) / 180;
  const dx = (p[0] - cam.x) * z, dy = (p[1] - cam.y) * z;
  return [960 + (cam.shake?.[0] ?? 0) + dx * Math.cos(a) - dy * Math.sin(a), 540 + (cam.shake?.[1] ?? 0) + dx * Math.sin(a) + dy * Math.cos(a)];
};
