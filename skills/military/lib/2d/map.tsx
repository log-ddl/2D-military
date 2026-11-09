// Bản đồ địa lý thực tế (Natural Earth 177 quốc gia & đường bờ biển thật) + phép chiếu kinh/vĩ độ [lon, lat] -> [x, y].
import React, { useMemo } from 'react';
import worldGeo from './world_geo.json';
import { contours } from './terrain';

export type LonLat = [number, number];
export type GeoBounds = [number, number, number, number]; // [lonMin, latMin, lonMax, latMax]

export type GeoCountry = {
  iso: string;
  name: string;
  rings: number[][][];
};

const COUNTRIES = worldGeo as GeoCountry[];

function latToMercY(lat: number): number {
  const clamped = Math.max(-82, Math.min(82, lat));
  const rad = (clamped * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
}

export type GeoProjection = {
  bounds: GeoBounds;
  width: number;
  height: number;
  /** Đổi [kinh độ, vĩ độ] thực tế sang toạ độ màn hình SVG [x, y]. */
  project: (lonLat: LonLat) => [number, number];
  /** Đổi mảng [lon, lat][] sang chuỗi path SVG `M ... L ... Z`. */
  ringToPath: (ring: number[][], closed?: boolean) => string;
};

export function createGeoProjection(
  bounds: GeoBounds,
  opts?: { width?: number; height?: number; padding?: number },
): GeoProjection {
  const width = opts?.width ?? 1920;
  const height = opts?.height ?? 1080;
  const pad = opts?.padding ?? 60;
  const [lonMin, latMin, lonMax, latMax] = bounds;

  const yMin = latToMercY(latMin);
  const yMax = latToMercY(latMax);
  const lonSpan = Math.max(1e-4, ((lonMax - lonMin) * Math.PI) / 180);
  const mercSpan = Math.max(1e-4, yMax - yMin);

  const availW = Math.max(100, width - pad * 2);
  const availH = Math.max(100, height - pad * 2);
  const scale = Math.min(availW / lonSpan, availH / mercSpan);

  const mapW = lonSpan * scale;
  const mapH = mercSpan * scale;
  const offsetX = (width - mapW) * 0.5;
  const offsetY = (height - mapH) * 0.5;

  const project = ([lon, lat]: LonLat): [number, number] => {
    const xRatio = (lon - lonMin) / Math.max(1e-4, lonMax - lonMin);
    const yRatio = (yMax - latToMercY(lat)) / mercSpan;
    return [offsetX + xRatio * mapW, offsetY + yRatio * mapH];
  };

  const ringToPath = (ring: number[][], closed = true): string => {
    if (!ring.length) return '';
    let d = '';
    for (let i = 0; i < ring.length; i++) {
      const [x, y] = project([ring[i][0], ring[i][1]]);
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    }
    return closed ? `${d}Z` : d;
  };

  return { bounds, width, height, project, ringToPath };
}

export type GeoMapProps = {
  /** Khung kinh-vĩ độ cần hiển thị: [lonMin, latMin, lonMax, latMax] (ví dụ Bắc Mỹ: [-128, 22, -64, 52]). */
  bounds: GeoBounds;
  width?: number;
  height?: number;
  padding?: number;
  /** Màu nền đại dương (nếu truyền sẽ vẽ thẻ <rect> nền). */
  seaFill?: string;
  /** Màu lục địa mặc định. */
  landFill?: string;
  /** Màu viền bờ biển / biên giới quốc gia. */
  landStroke?: string;
  landStrokeWidth?: number;
  /** Tô màu nổi bật theo mã ISO3 (vd `{ USA: '#213a54', DEU: '#4a2525' }`) hoặc tên nước. */
  highlight?: Record<string, { fill?: string; stroke?: string; strokeWidth?: number; opacity?: number } | string>;
  /** Hiển thị lưới kinh - vĩ tuyến (mặc định true). */
  showGrid?: boolean;
  gridStepLon?: number;
  gridStepLat?: number;
  gridColor?: string;
  /** Hiển thị đường đồng mức địa hình chìm trên nền (mặc định true). */
  showContours?: boolean;
  contourColor?: string;
  contourSeed?: number;
  /** Render-prop nhận `proj` (`proj.project([lon, lat])`) để vẽ thêm tuyến đường, mũi tên, ký hiệu quân sự đúng toạ độ thật. */
  children?: React.ReactNode | ((proj: GeoProjection) => React.ReactNode);
};

export const GeoMap: React.FC<GeoMapProps> = ({
  bounds,
  width = 1920,
  height = 1080,
  padding = 56,
  seaFill = '#0b1826',
  landFill = '#16293d',
  landStroke = '#36587a',
  landStrokeWidth = 1.2,
  highlight,
  showGrid = true,
  gridStepLon,
  gridStepLat,
  gridColor = '#284766',
  showContours = true,
  contourColor = '#1f3a56',
  contourSeed = 17,
  children,
}) => {
  const proj = useMemo(
    () => createGeoProjection(bounds, { width, height, padding }),
    [bounds[0], bounds[1], bounds[2], bounds[3], width, height, padding],
  );

  const visibleCountries = useMemo(() => {
    const [lonMin, latMin, lonMax, latMax] = bounds;
    const marginLon = (lonMax - lonMin) * 0.25 + 8;
    const marginLat = (latMax - latMin) * 0.25 + 8;
    return COUNTRIES.map((c) => {
      const rings = c.rings.filter((r) =>
        r.some(
          ([lon, lat]) =>
            lon >= lonMin - marginLon &&
            lon <= lonMax + marginLon &&
            lat >= latMin - marginLat &&
            lat <= latMax + marginLat,
        ),
      );
      if (!rings.length) return null;
      return {
        iso: c.iso,
        name: c.name,
        d: rings.map((r) => proj.ringToPath(r, true)).join(' '),
      };
    }).filter(Boolean) as { iso: string; name: string; d: string }[];
  }, [proj, bounds[0], bounds[1], bounds[2], bounds[3]]);

  const contourPaths = useMemo(
    () => (showContours ? contours(String(contourSeed), width, height, 6) : []),
    [showContours, contourSeed, width, height],
  );

  const gridLines = useMemo(() => {
    if (!showGrid) return { meridians: [] as string[], parallels: [] as string[] };
    const [lonMin, latMin, lonMax, latMax] = bounds;
    const dLon = gridStepLon ?? (lonMax - lonMin > 90 ? 15 : lonMax - lonMin > 35 ? 10 : 5);
    const dLat = gridStepLat ?? (latMax - latMin > 60 ? 15 : latMax - latMin > 25 ? 10 : 5);
    const meridians: string[] = [];
    const parallels: string[] = [];

    const startLon = Math.floor((lonMin - 15) / dLon) * dLon;
    const endLon = Math.ceil((lonMax + 15) / dLon) * dLon;
    for (let lon = startLon; lon <= endLon; lon += dLon) {
      const [x0, y0] = proj.project([lon, latMax + 15]);
      const [x1, y1] = proj.project([lon, latMin - 15]);
      meridians.push(`M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`);
    }

    const startLat = Math.max(-80, Math.floor((latMin - 10) / dLat) * dLat);
    const endLat = Math.min(80, Math.ceil((latMax + 10) / dLat) * dLat);
    for (let lat = startLat; lat <= endLat; lat += dLat) {
      const [x0, y0] = proj.project([lonMin - 25, lat]);
      const [x1, y1] = proj.project([lonMax + 25, lat]);
      parallels.push(`M${x0.toFixed(1)},${y0.toFixed(1)}L${x1.toFixed(1)},${y1.toFixed(1)}`);
    }
    return { meridians, parallels };
  }, [showGrid, proj, bounds[0], bounds[1], bounds[2], bounds[3], gridStepLon, gridStepLat]);

  return (
    <g>
      {seaFill && <rect x={-200} y={-200} width={width + 400} height={height + 400} fill={seaFill} />}

      {showContours && (
        <g opacity={0.28}>
          {contourPaths.map((c, i) => (
            <path key={i} d={c.d} fill="none" stroke={contourColor} strokeWidth={1.1} />
          ))}
        </g>
      )}

      {showGrid && (
        <g opacity={0.26}>
          {gridLines.meridians.map((d, i) => (
            <path key={`m${i}`} d={d} fill="none" stroke={gridColor} strokeWidth={0.9} strokeDasharray="4 7" />
          ))}
          {gridLines.parallels.map((d, i) => (
            <path key={`p${i}`} d={d} fill="none" stroke={gridColor} strokeWidth={0.9} strokeDasharray="4 7" />
          ))}
        </g>
      )}

      {/* Bóng đổ nhẹ của lục địa xuống mặt biển */}
      <g transform="translate(0, 5)" opacity={0.42}>
        {visibleCountries.map((c, i) => (
          <path key={`sh_${c.iso}_${i}`} d={c.d} fill="#040a12" />
        ))}
      </g>

      {/* Lớp lục địa & biên giới thực tế */}
      <g>
        {visibleCountries.map((c, i) => {
          const hl = highlight?.[c.iso] ?? highlight?.[c.name];
          const hlObj = typeof hl === 'string' ? { fill: hl } : hl;
          return (
            <path
              key={`${c.iso}_${i}`}
              d={c.d}
              fill={hlObj?.fill ?? landFill}
              fillOpacity={hlObj?.opacity ?? 1}
              stroke={hlObj?.stroke ?? landStroke}
              strokeWidth={hlObj?.strokeWidth ?? landStrokeWidth}
              strokeLinejoin="round"
            />
          );
        })}
      </g>

      {typeof children === 'function' ? children(proj) : children}
    </g>
  );
};
