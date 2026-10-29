// Bộ hình chiếu SVG 2D dùng chung cho dự án PS — đồng bộ 1:1 kích thước mét thật (1 m = 100 px ở scale = 1)
// và bảng màu 3 tông sáng/trung/tối với hệ mô hình 3D trong video/local/models/.
import React, { useMemo } from 'react';
import { PAL2D } from './palette';
import { contours, skyline } from '@lib/2d/terrain';

/** Nét phát sáng kép an toàn bên trong <Cam2D> (halo bản rộng + lõi sáng, không bị Chromium cắt ô filter). */
export const GlowLine2D: React.FC<{
  d: string;
  color?: string;
  core?: string;
  width?: number;
  dash?: string;
  opacity?: number;
  strokeDasharray?: string;
  strokeDashoffset?: number;
}> = ({ d, color = PAL2D.cyan, core = '#ffffff', width = 4, dash, opacity = 1, strokeDasharray, strokeDashoffset }) => (
  <g opacity={opacity}>
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width * 2.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.26}
      strokeDasharray={strokeDasharray ?? dash}
      strokeDashoffset={strokeDashoffset}
    />
    <path
      d={d}
      fill="none"
      stroke={color}
      strokeWidth={width}
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeDasharray={strokeDasharray ?? dash}
      strokeDashoffset={strokeDashoffset}
    />
    <path
      d={d}
      fill="none"
      stroke={core}
      strokeWidth={Math.max(1.2, width * 0.38)}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={0.85}
      strokeDasharray={strokeDasharray ?? dash}
      strokeDashoffset={strokeDashoffset}
    />
  </g>
);

/** Nền bàn vẽ kỹ thuật xanh đá (Prussian Slate Blueprint) có lưới toạ độ & thước chia vạch. */
export const BlueprintBg2D: React.FC<{
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  step?: number;
  id?: string;
}> = ({ x = -600, y = -400, w = 3200, h = 2000, step = 120, id = 'bp' }) => {
  const cols = Math.ceil(w / step);
  const rows = Math.ceil(h / step);
  return (
    <g>
      <defs>
        <radialGradient id={`${id}_rg`} cx="50%" cy="45%" r="65%">
          <stop offset="0%" stopColor={PAL2D.bgMid} />
          <stop offset="65%" stopColor={PAL2D.bgDeep} />
          <stop offset="100%" stopColor={PAL2D.bgNight} />
        </radialGradient>
      </defs>
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id}_rg)`} />
      {/* Lưới phụ */}
      <g stroke={PAL2D.gridFine} strokeWidth={1} opacity={0.45}>
        {Array.from({ length: cols * 2 }, (_, i) => (
          <line key={`fx${i}`} x1={x + i * (step / 2)} y1={y} x2={x + i * (step / 2)} y2={y + h} />
        ))}
        {Array.from({ length: rows * 2 }, (_, j) => (
          <line key={`fy${j}`} x1={x} y1={y + j * (step / 2)} x2={x + w} y2={y + j * (step / 2)} />
        ))}
      </g>
      {/* Lưới chính */}
      <g stroke={PAL2D.grid} strokeWidth={1.4} opacity={0.32}>
        {Array.from({ length: cols }, (_, i) => (
          <line key={`mx${i}`} x1={x + i * step} y1={y} x2={x + i * step} y2={y + h} />
        ))}
        {Array.from({ length: rows }, (_, j) => (
          <line key={`my${j}`} x1={x} y1={y + j * step} x2={x + w} y2={y + j * step} />
        ))}
      </g>
    </g>
  );
};

/** Nền mặt cắt bầu trời bình minh lạnh 3 lớp núi có chiều sâu cho cảnh không phận ngang. */
export const DawnAirspaceBg2D: React.FC<{
  x0?: number;
  x1?: number;
  groundY?: number;
  seed?: string;
  id?: string;
}> = ({ x0 = -600, x1 = 2800, groundY = 880, seed = 'ps_dawn', id = 'dawn' }) => {
  const far = useMemo(() => skyline(seed + '_f', x0, x1, groundY - 95, 190, 760, groundY + 700), [seed, x0, x1, groundY]);
  const mid = useMemo(() => skyline(seed + '_m', x0, x1, groundY - 45, 130, 520, groundY + 700), [seed, x0, x1, groundY]);
  const near = useMemo(() => skyline(seed + '_n', x0, x1, groundY - 8, 70, 360, groundY + 700), [seed, x0, x1, groundY]);
  return (
    <g>
      <defs>
        <linearGradient id={`${id}_sky`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PAL2D.bgNight} />
          <stop offset="38%" stopColor={PAL2D.bgDeep} />
          <stop offset="75%" stopColor={PAL2D.bgSky} />
          <stop offset="100%" stopColor={PAL2D.bgHorizon} />
        </linearGradient>
      </defs>
      <rect x={x0} y={-700} width={x1 - x0} height={groundY + 1400} fill={`url(#${id}_sky)`} />
      {/* Quầng ráng bình minh sát chân trời */}
      <ellipse cx={(x0 + x1) * 0.62} cy={groundY - 90} rx={900} ry={220} fill="#ffd6a0" opacity={0.14} />
      <path d={far} fill={PAL2D.ridgeFar} opacity={0.85} />
      <path d={mid} fill={PAL2D.ridgeMid} />
      <path d={near} fill={PAL2D.ridgeNear} />
      <rect x={x0} y={groundY} width={x1 - x0} height={600} fill={PAL2D.ground} />
      <line x1={x0} y1={groundY} x2={x1} y2={groundY} stroke={PAL2D.groundLine} strokeWidth={4} />
    </g>
  );
};

/** Nền sa bàn bản đồ đồng mức chiến thuật (tính một lần bằng useMemo). */
export const TopoMapBg2D: React.FC<{
  w?: number;
  h?: number;
  seed?: string;
  cx?: number;
  cy?: number;
}> = ({ w = 2400, h = 1500, seed = 'ps_topo', cx = 960, cy = 540 }) => {
  const lines = useMemo(() => contours(seed, w, h, 10, 20, 480), [seed, w, h]);
  const ox = cx - w / 2;
  const oy = cy - h / 2;
  return (
    <g>
      <rect x={ox} y={oy} width={w} height={h} fill={PAL2D.bgDeep} />
      <g transform={`translate(${ox} ${oy})`}>
        {lines.map((ln) => (
          <path
            key={ln.level}
            d={ln.d}
            fill="none"
            stroke={PAL2D.grid}
            strokeWidth={ln.level % 3 === 0 ? 1.8 : 1.0}
            opacity={0.16 + ln.level * 0.025}
          />
        ))}
      </g>
      {[220, 440, 660, 880].map((r) => (
        <circle key={r} cx={cx} cy={cy} r={r} fill="none" stroke={PAL2D.grid} strokeWidth={1.2} strokeDasharray="8 10" opacity={0.28} />
      ))}
    </g>
  );
};

/** Luồng lửa động cơ tên lửa 2D hướng -X (gắn tại đuôi tên lửa). */
const Plume2D: React.FC<{ x: number; y: number; len: number; r: number; power?: number }> = ({ x, y, len, r, power = 1 }) => {
  if (power <= 0.01) return null;
  const L = len * power;
  const R = r * (0.75 + 0.25 * power);
  return (
    <g>
      <path d={`M${x} ${y - R * 1.1} Q${x - L * 0.55} ${y - R * 1.45} ${x - L * 1.25} ${y} Q${x - L * 0.55} ${y + R * 1.45} ${x} ${y + R * 1.1} Z`} fill={PAL2D.amber} opacity={0.35} />
      <path d={`M${x} ${y - R * 0.8} Q${x - L * 0.45} ${y - R * 1.0} ${x - L} ${y} Q${x - L * 0.45} ${y + R * 1.0} ${x} ${y + R * 0.8} Z`} fill={PAL2D.amber} />
      <path d={`M${x} ${y - R * 0.42} Q${x - L * 0.3} ${y - R * 0.5} ${x - L * 0.62} ${y} Q${x - L * 0.3} ${y + R * 0.5} ${x} ${y + R * 0.42} Z`} fill={PAL2D.amberHot} />
    </g>
  );
};

/**
 * Tên lửa đánh chặn PAC-3 CRI (tỉ lệ 1:1 ở scale=1: dài 520 px = 5.20 m, đường kính gốc 25.4 px = 254 mm).
 * `thicknessScale` mặc định 1.35 giúp nhìn rõ trên đại cảnh; đặt = 1.0 khi đo kích thước kỹ thuật.
 * Tâm tại (0,0), mũi hướng +X.
 */
export const PAC3_2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  flip?: boolean;
  flame?: number;
  acmFire?: number; // -1 (phụt xuống), 0 (tắt), +1 (phụt lên)
  thicknessScale?: number;
}> = ({ x = 0, y = 0, scale = 1, rot = 0, flip = false, flame = 0, acmFire = 0, thicknessScale = 1.35 }) => {
  const r = 12.7 * thicknessScale;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -scale : scale} ${scale})`}>
      <Plume2D x={-260} y={0} len={150} r={r * 1.15} power={flame} />
      {/* 4 cánh lái đuôi */}
      <polygon points={`-252,${-r} -218,${-r} -232,${-r * 2.35} -256,${-r * 2.2}`} fill={PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={2} />
      <polygon points={`-252,${r} -218,${r} -232,${r * 2.35} -256,${r * 2.2}`} fill={PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={2} />
      {/* Thân chính 3 tông */}
      <rect x={-255} y={-r} width={415} height={r * 2} rx={2} fill={PAL2D.pacMid} stroke={PAL2D.stroke} strokeWidth={2.2} />
      <rect x={-255} y={-r + 1.5} width={415} height={r * 0.58} fill={PAL2D.pacLight} />
      <rect x={-255} y={r * 0.38} width={415} height={r * 0.62 - 1.5} fill={PAL2D.pacDark} opacity={0.75} />
      {/* Loa phụt đuôi */}
      <polygon points={`-260,${-r * 0.78} -255,${-r * 0.92} -255,${r * 0.92} -260,${r * 0.78}`} fill={PAL2D.ruGreyDark} stroke={PAL2D.stroke} strokeWidth={1.8} />
      {/* Các đai tầng & khoang điện tử */}
      {[-120, -20, 62, 118].map((bx) => (
        <rect key={bx} x={bx} y={-r} width={8} height={r * 2} fill={PAL2D.ruGreyDark} opacity={0.75} />
      ))}
      {/* Vòng 180 động cơ đẩy ngang ACM đặc trưng ở phần mũi (x = 126..158) */}
      <rect x={126} y={-r} width={32} height={r * 2} fill="#252d38" stroke={PAL2D.stroke} strokeWidth={1.6} />
      {[132, 142, 152].map((ax) =>
        [-0.62, -0.2, 0.2, 0.62].map((ky, j) => (
          <circle key={`${ax}_${j}`} cx={ax} cy={ky * r} r={1.9} fill="#d7b36a" />
        )),
      )}
      {/* Chóp radome thạch anh nung chảy ogive */}
      <path
        d={`M160 ${-r} C198 ${-r * 0.94}, 236 ${-r * 0.52}, 260 0 C236 ${r * 0.52}, 198 ${r * 0.94}, 160 ${r} Z`}
        fill={PAL2D.radome}
        stroke={PAL2D.stroke}
        strokeWidth={2.2}
      />
      <path d={`M162 ${-r * 0.72} C196 ${-r * 0.68}, 230 ${-r * 0.35}, 253 -1`} fill="none" stroke="#fff9eb" strokeWidth={2.2} opacity={0.7} />
      {/* Tia lửa phản lực ngang ACM khi kích hoạt */}
      {Math.abs(acmFire) > 0.02 && (
        <g transform={`translate(142 0) scale(1 ${acmFire >= 0 ? -1 : 1})`}>
          <polygon points={`-14,${r} 0,${r + 95 * Math.abs(acmFire)} 14,${r}`} fill={PAL2D.amber} opacity={0.45} />
          <polygon points={`-8,${r} 0,${r + 72 * Math.abs(acmFire)} 8,${r}`} fill={PAL2D.amber} />
          <polygon points={`-4,${r} 0,${r + 44 * Math.abs(acmFire)} 4,${r}`} fill={PAL2D.amberHot} />
        </g>
      )}
    </g>
  );
};

/** Tên lửa PAC-2 đời cũ (dài 531 px = 5.31 m, đường kính lớn 41 px = 410 mm, cánh đuôi tam giác cụt rộng). */
export const PAC2_2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  flip?: boolean;
  flame?: number;
}> = ({ x = 0, y = 0, scale = 1, rot = 0, flip = false, flame = 0 }) => {
  const r = 23;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -scale : scale} ${scale})`}>
      <Plume2D x={-266} y={0} len={165} r={r} power={flame} />
      {/* Cánh đuôi clipped-delta lớn đặc trưng PAC-2 */}
      <polygon points={`-258,${-r} -185,${-r} -218,${-r * 2.55} -260,${-r * 2.4}`} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={2.2} />
      <polygon points={`-258,${r} -185,${r} -218,${r * 2.55} -260,${r * 2.4}`} fill={PAL2D.usDark} stroke={PAL2D.stroke} strokeWidth={2.2} />
      {/* Thân trụ lớn 3 tông */}
      <rect x={-262} y={-r} width={412} height={r * 2} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={2.4} />
      <rect x={-262} y={-r + 2} width={412} height={r * 0.55} fill={PAL2D.usLight} />
      <rect x={-262} y={r * 0.42} width={412} height={r * 0.58 - 2} fill={PAL2D.usDark} />
      {/* Khoang đầu đạn phân mảnh nổ phá + ngòi nổ tiếp cận */}
      <rect x={45} y={-r} width={78} height={r * 2} fill={PAL2D.amber} opacity={0.28} />
      <line x1={45} y1={-r} x2={45} y2={r} stroke={PAL2D.amber} strokeWidth={2.4} />
      <line x1={123} y1={-r} x2={123} y2={r} stroke={PAL2D.amber} strokeWidth={2.4} />
      {/* Chóp ogive */}
      <path
        d={`M150 ${-r} C196 ${-r * 0.92}, 238 ${-r * 0.48}, 266 0 C238 ${r * 0.48}, 196 ${r * 0.92}, 150 ${r} Z`}
        fill={PAL2D.radome}
        stroke={PAL2D.stroke}
        strokeWidth={2.4}
      />
    </g>
  );
};

/**
 * Tên lửa đường đạn phóng từ trên không Kh-47M2 Kinzhal (dài 720 px = 7.20 m, đường kính 92 px = 0.92 m).
 * Hỗ trợ `heatGlow` (vỏ plasma ma sát khí quyển ở mũi) và `cutFuel` (0..1 mặt cắt thuốc phóng rắn cho cảnh S10).
 */
export const Kinzhal2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  flip?: boolean;
  flame?: number;
  heatGlow?: number;
  showCutaway?: boolean;
  fuelRemain?: number; // 0..1 lượng nhiên liệu rắn còn lại khi showCutaway
}> = ({ x = 0, y = 0, scale = 1, rot = 0, flip = false, flame = 0, heatGlow = 0, showCutaway = false, fuelRemain = 1 }) => {
  const r = 46;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -scale : scale} ${scale})`}>
      <Plume2D x={-360} y={0} len={230} r={r * 0.95} power={flame} />
      {/* Cánh lái đuôi cropped-delta */}
      <polygon points={`-346,${-r} -252,${-r} -295,${-r * 1.95} -350,${-r * 1.85}`} fill={PAL2D.ruGreyMid} stroke={PAL2D.stroke} strokeWidth={2.5} />
      <polygon points={`-346,${r} -252,${r} -295,${r * 1.95} -350,${r * 1.85}`} fill={PAL2D.ruGreyDark} stroke={PAL2D.stroke} strokeWidth={2.5} />
      {/* Thân khí động côn-trụ lớn kiểu Iskander */}
      <path
        d={`M-352 ${-r * 0.92} L-320 ${-r} L60 ${-r} L210 ${-r * 0.68} L360 0 L210 ${r * 0.68} L60 ${r} L-320 ${r} L-352 ${r * 0.92} Z`}
        fill={PAL2D.ruGreyMid}
        stroke={PAL2D.stroke}
        strokeWidth={2.8}
      />
      {/* Đổ khối sáng trên / tối dưới */}
      <path d={`M-320 ${-r + 2} L60 ${-r + 2} L210 ${-r * 0.68 + 2} L350 -1 L208 ${-r * 0.32} L60 ${-r * 0.42} L-320 ${-r * 0.42} Z`} fill={PAL2D.ruGreyLight} opacity={0.75} />
      <path d={`M-320 ${r - 2} L60 ${r - 2} L210 ${r * 0.68 - 2} L350 1 L208 ${r * 0.32} L60 ${r * 0.42} L-320 ${r * 0.42} Z`} fill={PAL2D.ruGreyDark} opacity={0.85} />
      {/* Đai khớp khoang */}
      {[-230, -80, 58, 208].map((bx) => (
        <line key={bx} x1={bx} y1={bx > 60 ? -r * 0.68 : -r} x2={bx} y2={bx > 60 ? r * 0.68 : r} stroke={PAL2D.stroke} strokeWidth={2} opacity={0.65} />
      ))}
      {/* Cửa sổ mặt cắt nhiên liệu rắn cho cảnh S10 */}
      {showCutaway && (
        <g>
          <rect x={-305} y={-r * 0.68} width={345} height={r * 1.36} rx={8} fill="#141922" stroke={PAL2D.amber} strokeWidth={2.4} />
          {/* Lõi thuốc phóng rắn cháy lùi từ sau ra trước */}
          {fuelRemain > 0.01 && (
            <g>
              <rect
                x={-300 + 335 * (1 - fuelRemain)}
                y={-r * 0.58}
                width={335 * fuelRemain}
                height={r * 1.16}
                rx={4}
                fill="#c97228"
              />
              <rect
                x={-300 + 335 * (1 - fuelRemain)}
                y={-r * 0.16}
                width={335 * fuelRemain}
                height={r * 0.32}
                fill="#1d232e"
              />
              {/* Mặt cháy đang bùng lửa */}
              {flame > 0.05 && (
                <ellipse cx={-300 + 335 * (1 - fuelRemain)} cy={0} rx={14} ry={r * 0.54} fill={PAL2D.amberHot} />
              )}
            </g>
          )}
        </g>
      )}
      {/* Màng plasma ma sát khí quyển đỏ cam bọc mũi khi lao vào khí quyển dày */}
      {heatGlow > 0.02 && (
        <g opacity={heatGlow}>
          <path
            d={`M120 ${-r * 1.35} Q290 ${-r * 1.05} 382 0 Q290 ${r * 1.05} 120 ${r * 1.35} Q275 ${r * 0.72} 364 0 Q275 ${-r * 0.72} 120 ${-r * 1.35} Z`}
            fill={PAL2D.red}
            opacity={0.5}
          />
          <path
            d={`M185 ${-r * 0.95} Q310 ${-r * 0.72} 372 0 Q310 ${r * 0.72} 185 ${r * 0.95} Q295 ${r * 0.48} 360 0 Q295 ${-r * 0.48} 185 ${-r * 0.95} Z`}
            fill={PAL2D.amberHot}
          />
        </g>
      )}
    </g>
  );
};

/** Phương tiện lượn siêu vượt âm Boeing X-51A Waverider (dài 762 px, mũi nêm nén sóng xung kích + cửa hút Scramjet dưới bụng). */
export const X51_2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  scramjetFlame?: number;
  showAirflow?: boolean;
}> = ({ x = 0, y = 0, scale = 1, rot = 0, scramjetFlame = 0.85, showAirflow = false }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
    {scramjetFlame > 0.02 && <Plume2D x={-370} y={8} len={220} r={26} power={scramjetFlame} />}
    {/* Cánh ổn định chữ thập nghiêng */}
    <polygon points="-330,-30 -240,-30 -285,-82 -345,-76" fill={PAL2D.ruGreyDark} stroke={PAL2D.stroke} strokeWidth={2.2} />
    <polygon points="-140,-30 -75,-30 -105,-68 -150,-64" fill={PAL2D.ruGreyMid} stroke={PAL2D.stroke} strokeWidth={2.2} />
    {/* Thân trên Waverider mũi nêm phẳng đáy */}
    <path
      d="M-370 -28 L40 -30 L215 -18 L380 4 L145 14 L-370 14 Z"
      fill={PAL2D.pacMid}
      stroke={PAL2D.stroke}
      strokeWidth={2.6}
    />
    <path d="M-370 -26 L40 -28 L215 -16 L368 3 L210 -6 L40 -14 L-370 -14 Z" fill={PAL2D.pacLight} />
    {/* Buồng đốt động cơ phản lực tĩnh siêu âm Scramjet dưới bụng */}
    <path
      d="M-370 14 L125 14 L78 44 L-355 44 Z"
      fill={PAL2D.ruGreyDark}
      stroke={PAL2D.stroke}
      strokeWidth={2.4}
    />
    {showAirflow && (
      <g>
        {/* Sóng xung kích nén khí ở mũi nêm dồn thẳng vào họng Scramjet */}
        <line x1={380} y1={4} x2={75} y2={48} stroke={PAL2D.cyan} strokeWidth={2.6} strokeDasharray="8 6" />
        <path d="M350 28 L120 28 L45 29 L-345 29" fill="none" stroke={PAL2D.cyanSoft} strokeWidth={3.2} />
        {/* Ngọn lửa cháy siêu âm bên trong buồng đốt không có tuabin */}
        <rect x={-255} y={19} width={225} height={19} rx={6} fill={PAL2D.amber} opacity={0.88} />
        <rect x={-230} y={23} width={165} height={11} rx={4} fill={PAL2D.amberHot} />
      </g>
    )}
  </g>
);

/** UAV cánh tam giác Shahed-136 (view='top' nhìn từ trên cho sa bàn/bầy UAV; view='side' cho mặt cắt độ cao). */
export const Shahed136_2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  flip?: boolean;
  view?: 'top' | 'side';
}> = ({ x = 0, y = 0, scale = 1, rot = 0, flip = false, view = 'top' }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -scale : scale} ${scale})`}>
    {view === 'top' ? (
      <g>
        {/* Cánh tam giác gãy cranked-delta 3.5m × 2.5m */}
        <polygon
          points="175,0 55,-24 -135,-125 -158,-125 -140,-24 -175,-16 -175,16 -140,24 -158,125 -135,125 55,24"
          fill={PAL2D.shahedMid}
          stroke={PAL2D.stroke}
          strokeWidth={2.4}
        />
        <polygon points="175,0 55,-24 -135,-125 -140,-24 -175,0" fill={PAL2D.shahedLight} opacity={0.6} />
        {/* Thân trung tâm + chân vịt đẩy đuôi */}
        <ellipse cx={10} cy={0} rx={155} ry={18} fill={PAL2D.shahedLight} stroke={PAL2D.stroke} strokeWidth={1.8} />
        <rect x={-190} y={-28} width={8} height={56} rx={3} fill={PAL2D.ink} opacity={0.75} />
      </g>
    ) : (
      <g>
        {/* Nhìn ngang: thân thuôn + vây đứng đầu mút cánh + chân vịt sau */}
        <polygon points="-155,-10 -85,-10 -128,-54 -158,-50" fill={PAL2D.shahedDark} stroke={PAL2D.stroke} strokeWidth={2} />
        <path d="M-165 -12 L95 -14 C138 -14, 165 -6, 175 0 C165 8, 138 14, 95 14 L-165 10 Z" fill={PAL2D.shahedMid} stroke={PAL2D.stroke} strokeWidth={2.2} />
        <path d="M-160 -10 L95 -12 L168 -1 L95 -2 L-160 -2 Z" fill={PAL2D.shahedLight} />
        <rect x={-178} y={-24} width={7} height={48} rx={3} fill={PAL2D.ink} />
      </g>
    )}
  </g>
);

/** Tên lửa hành trình Kh-101 (dài 745 px, thân vát tàng hình, cánh cụp giữa thân, động cơ TRDD-50A dưới đuôi). */
export const Kh101_2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  flip?: boolean;
  flame?: number;
}> = ({ x = 0, y = 0, scale = 1, rot = 0, flip = false, flame = 0.7 }) => (
  <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -scale : scale} ${scale})`}>
    <Plume2D x={-348} y={32} len={95} r={11} power={flame} />
    {/* Cụm động cơ tuabin cánh quạt treo dưới đuôi */}
    <rect x={-345} y={18} width={68} height={26} rx={8} fill={PAL2D.ruGreyDark} stroke={PAL2D.stroke} strokeWidth={2} />
    {/* Cánh đuôi */}
    <polygon points="-355,-20 -300,-20 -330,-62 -362,-58" fill={PAL2D.ruGreyMid} stroke={PAL2D.stroke} strokeWidth={2} />
    {/* Thân tàng hình vát cạnh chined */}
    <path
      d="M-365 -18 L245 -20 L372 2 L255 18 L-365 18 Z"
      fill={PAL2D.ruGreyMid}
      stroke={PAL2D.stroke}
      strokeWidth={2.4}
    />
    <path d="M-362 -16 L245 -18 L364 1 L245 -2 L-362 -2 Z" fill={PAL2D.ruGreyLight} />
    <line x1={-360} y1={2} x2={365} y2={2} stroke={PAL2D.stroke} strokeWidth={1.6} opacity={0.55} />
    {/* Cánh nâng giữa thân xuôi sau */}
    <polygon points="-45,6 65,6 -55,44 -95,42" fill={PAL2D.ruGreyDark} stroke={PAL2D.stroke} strokeWidth={2} />
  </g>
);

/** Tên lửa đạn đạo tầm trung đa đầu đạn Oreshnik 2D + đầu đạn độc lập OreshnikRV2D. */
export const Oreshnik2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  shroudOpen?: number;
  flame?: number;
}> = ({ x = 0, y = 0, scale = 1, rot = 0, shroudOpen = 0, flame = 0 }) => {
  const r = 72;
  const openDeg = shroudOpen * 34;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <Plume2D x={-620} y={0} len={260} r={r * 0.9} power={flame} />
      {/* Thân 2 tầng đẩy + khoang MIRV bus */}
      <rect x={-610} y={-r} width={780} height={r * 2} rx={4} fill={PAL2D.ruOliveMid} stroke={PAL2D.stroke} strokeWidth={3} />
      <rect x={-610} y={-r + 3} width={780} height={r * 0.52} fill={PAL2D.ruOliveLight} />
      <rect x={-610} y={r * 0.42} width={780} height={r * 0.58 - 3} fill={PAL2D.ruOliveDark} />
      {[-220, 110].map((sx) => (
        <rect key={sx} x={sx} y={-r - 3} width={16} height={r * 2 + 6} fill={PAL2D.amber} opacity={0.65} />
      ))}
      {/* 6 đầu đạn MIRV bên trong khoang mũi khi mở chóp */}
      {shroudOpen > 0.05 && (
        <g>
          {[-42, -16, 16, 42].map((vy, i) => (
            <polygon
              key={i}
              points={`175,${vy - 11} 285,${vy} 175,${vy + 11}`}
              fill="#2a303a"
              stroke={PAL2D.amber}
              strokeWidth={1.8}
            />
          ))}
        </g>
      )}
      {/* 2 nửa chóp bảo vệ tách mở */}
      <g transform={`translate(170 ${-r}) rotate(${-openDeg})`}>
        <path d={`M0 0 C110 4, 210 ${r * 0.45}, 290 ${r} L0 ${r} Z`} fill={PAL2D.ruOliveLight} stroke={PAL2D.stroke} strokeWidth={2.6} />
      </g>
      <g transform={`translate(170 ${r}) rotate(${openDeg})`}>
        <path d={`M0 0 C110 -4, 210 ${-r * 0.45}, 290 ${-r} L0 ${-r} Z`} fill={PAL2D.ruOliveDark} stroke={PAL2D.stroke} strokeWidth={2.6} />
      </g>
    </g>
  );
};

/** Bệ phóng Patriot M903 nhìn ngang (mặt đất tại y = 0, hướng phóng sang phải +X). */
export const PatriotLauncher2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  elev?: number;
}> = ({ x = 0, y = 0, scale = 1, flip = false, elev = 38 }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
    {/* Khung gầm sơ-mi rơ-moóc M860 */}
    <rect x={-480} y={-112} width={940} height={34} rx={4} fill={PAL2D.usDark} stroke={PAL2D.stroke} strokeWidth={3} />
    {/* Máy phát điện phía trước (+X) */}
    <rect x={235} y={-235} width={195} height={125} rx={6} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={3} />
    <rect x={235} y={-235} width={195} height={36} rx={4} fill={PAL2D.usLight} />
    {/* Chân chống trước & sau chạm y = 0 */}
    <rect x={385} y={-112} width={22} height={104} fill={PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={2.4} />
    <rect x={368} y={-10} width={56} height={10} rx={2} fill={PAL2D.usDark} />
    <rect x={-465} y={-112} width={22} height={104} fill={PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={2.4} />
    <rect x={-482} y={-10} width={56} height={10} rx={2} fill={PAL2D.usDark} />
    {/* 2 bánh lốp sau (r = 54) */}
    {[-365, -235].map((wx) => (
      <g key={wx} transform={`translate(${wx} -54)`}>
        <circle r={54} fill="#20242a" stroke={PAL2D.stroke} strokeWidth={3} />
        <circle r={31} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={2} />
        <circle r={11} fill={PAL2D.usDark} />
      </g>
    ))}
    {/* Bệ mâm xoay */}
    <rect x={-165} y={-168} width={230} height={58} rx={5} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={3} />
    {/* Giàn 4x4 ống phóng PAC-3 xoay theo góc nâng elev */}
    <g transform={`translate(-120 -168) rotate(${-elev})`}>
      <rect x={-170} y={-215} width={540} height={195} rx={6} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={3.2} />
      <rect x={-170} y={-215} width={540} height={55} fill={PAL2D.usLight} />
      <rect x={-170} y={-72} width={540} height={52} fill={PAL2D.usDark} />
      {[-80, 20, 120, 220, 310].map((gx) => (
        <line key={gx} x1={gx} y1={-215} x2={gx} y2={-20} stroke={PAL2D.stroke} strokeWidth={2.4} opacity={0.6} />
      ))}
      <line x1={-170} y1={-118} x2={370} y2={-118} stroke={PAL2D.stroke} strokeWidth={3} />
    </g>
    {/* Xi-lanh thuỷ lực nâng giàn */}
    <line x1={45} y1={-155} x2={75} y2={-285} stroke={PAL2D.pacLight} strokeWidth={12} strokeLinecap="round" />
  </g>
);

/** Mặt trước giàn 4×4 = 16 ống phóng PAC-3 (cho cảnh S04, S19, S23). */
export const PatriotQuadFace2D: React.FC<{
  x: number;
  y: number;
  size?: number;
  loadedCount?: number; // 0..16
  showNumbers?: boolean;
}> = ({ x, y, size = 340, loadedCount = 16, showNumbers = true }) => {
  const half = size / 2;
  const quadGap = size * 0.06;
  const quadSize = (size - quadGap * 3) / 2;
  const cellGap = quadSize * 0.1;
  const cellSize = (quadSize - cellGap * 3) / 2;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x={-half} y={-half} width={size} height={size} rx={14} fill={PAL2D.usDark} stroke={PAL2D.stroke} strokeWidth={4} />
      {[0, 1].map((qr) =>
        [0, 1].map((qc) => {
          const qx = -half + quadGap + qc * (quadSize + quadGap);
          const qy = -half + quadGap + qr * (quadSize + quadGap);
          return (
            <g key={`q_${qr}_${qc}`}>
              <rect x={qx} y={qy} width={quadSize} height={quadSize} rx={8} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={2.6} />
              {[0, 1].map((cr) =>
                [0, 1].map((cc) => {
                  const idx = qr * 8 + qc * 4 + cr * 2 + cc;
                  const cx = qx + cellGap + cc * (cellSize + cellGap);
                  const cy = qy + cellGap + cr * (cellSize + cellGap);
                  const armed = idx < loadedCount;
                  return (
                    <g key={idx}>
                      <rect
                        x={cx}
                        y={cy}
                        width={cellSize}
                        height={cellSize}
                        rx={6}
                        fill={armed ? '#15382a' : '#181c22'}
                        stroke={armed ? PAL2D.green : '#49525e'}
                        strokeWidth={2.4}
                      />
                      <circle
                        cx={cx + cellSize / 2}
                        cy={cy + cellSize / 2}
                        r={cellSize * 0.28}
                        fill={armed ? PAL2D.green : '#2a2f38'}
                        opacity={armed ? 0.9 : 0.55}
                      />
                      {showNumbers && (
                        <text
                          x={cx + cellSize / 2}
                          y={cy + cellSize - 6}
                          textAnchor="middle"
                          fill={armed ? PAL2D.paper : PAL2D.muted}
                          fontSize={cellSize * 0.24}
                          fontWeight={700}
                          fontFamily="sans-serif"
                        >
                          {idx + 1}
                        </text>
                      )}
                    </g>
                  );
                }),
              )}
            </g>
          );
        }),
      )}
    </g>
  );
};

/** Đài radar mảng pha AN/MPQ-65 nhìn ngang (mặt đất tại y = 0, mặt radar hướng sang phải +X). */
export const PatriotRadar2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  beamOn?: boolean;
  beamAngleDeg?: number;
}> = ({ x = 0, y = 0, scale = 1, flip = false, beamOn = false, beamAngleDeg = -26 }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
    {beamOn && (
      <g transform={`translate(95 -275) rotate(${beamAngleDeg})`}>
        <polygon points="0,0 780,-130 780,130" fill={PAL2D.cyan} opacity={0.14} />
        <line x1={0} y1={0} x2={780} y2={0} stroke={PAL2D.cyan} strokeWidth={3} strokeDasharray="14 10" opacity={0.75} />
      </g>
    )}
    <rect x={-460} y={-110} width={900} height={32} rx={4} fill={PAL2D.usDark} stroke={PAL2D.stroke} strokeWidth={3} />
    {[-350, -225].map((wx) => (
      <g key={wx} transform={`translate(${wx} -54)`}>
        <circle r={54} fill="#20242a" stroke={PAL2D.stroke} strokeWidth={3} />
        <circle r={30} fill={PAL2D.usMid} />
      </g>
    ))}
    <rect x={230} y={-225} width={180} height={115} rx={6} fill={PAL2D.usMid} stroke={PAL2D.stroke} strokeWidth={2.8} />
    {/* Shelter điện tử + mặt phẳng mảng pha nghiêng 20 độ */}
    <polygon
      points="-250,-110 85,-110 155,-415 -220,-395"
      fill={PAL2D.usMid}
      stroke={PAL2D.stroke}
      strokeWidth={3.2}
    />
    <line x1={88} y1={-115} x2={158} y2={-415} stroke={PAL2D.cyan} strokeWidth={8} />
  </g>
);

/** Xe bệ phóng S-400 Triumf 8×8 với 4 ống phóng đứng 48N6 (mặt đất tại y = 0, đầu xe +X). */
export const S400Launcher2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  flip?: boolean;
  loadedCount?: number; // 0..4
}> = ({ x = 0, y = 0, scale = 1, flip = false, loadedCount = 4 }) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
    {/* Khung gầm xe 8x8 MZKT dài 13.1 m */}
    <rect x={-620} y={-142} width={1240} height={42} rx={4} fill={PAL2D.ruOliveDark} stroke={PAL2D.stroke} strokeWidth={3.2} />
    {/* Cabin bọc thép vát đầu + khoang máy */}
    <polygon points="355,-142 635,-142 648,-235 565,-325 355,-325" fill={PAL2D.ruOliveMid} stroke={PAL2D.stroke} strokeWidth={3.2} />
    <polygon points="555,-305 628,-235 555,-235" fill="#7fc3e0" opacity={0.65} stroke={PAL2D.stroke} strokeWidth={2} />
    <rect x={125} y={-285} width={215} height={143} rx={5} fill={PAL2D.ruOliveDark} stroke={PAL2D.stroke} strokeWidth={2.8} />
    {/* 4 trục bánh địa hình lớn (r = 68) */}
    {[-480, -295, 225, 435].map((wx) => (
      <g key={wx} transform={`translate(${wx} -68)`}>
        <circle r={68} fill="#1f2328" stroke={PAL2D.stroke} strokeWidth={3.4} />
        <circle r={38} fill={PAL2D.ruOliveMid} stroke={PAL2D.stroke} strokeWidth={2.2} />
        <circle r={14} fill={PAL2D.ruOliveDark} />
      </g>
    ))}
    {/* Cụm 4 ống phóng đứng tròn (hiển thị 4 ống xếp so le rõ trạng thái đầy/rỗng 0..4) */}
    {[0, 1, 2, 3].map((idx) => {
      const tx = -545 + idx * 96;
      const armed = idx < loadedCount;
      return (
        <g key={idx}>
          <rect
            x={tx}
            y={-835}
            width={82}
            height={690}
            rx={10}
            fill={armed ? PAL2D.ruOliveMid : '#2a3036'}
            stroke={armed ? PAL2D.green : PAL2D.stroke}
            strokeWidth={3}
          />
          <rect x={tx + 8} y={-832} width={20} height={684} fill={armed ? PAL2D.ruOliveLight : '#3b424a'} opacity={0.65} />
          {[-730, -580, -430, -280].map((ry) => (
            <rect key={ry} x={tx - 3} y={ry} width={88} height={11} fill={PAL2D.ruOliveDark} />
          ))}
          {armed ? (
            <rect x={tx - 4} y={-852} width={90} height={20} rx={5} fill={PAL2D.green} stroke={PAL2D.stroke} strokeWidth={2.4} />
          ) : (
            <ellipse cx={tx + 41} cy={-835} rx={38} ry={10} fill="#111418" stroke={PAL2D.red} strokeWidth={2.4} />
          )}
        </g>
      );
    })}
  </g>
);

/** Hình bóng người trưởng thành chuẩn cao 175 px (= 1.75 m ở scale=1, bàn chân đặt tại y = 0) để đối chiếu tỉ lệ 1:1. */
export const HumanOperator2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  color?: string;
}> = ({ x = 0, y = 0, scale = 1, color = PAL2D.cyanSoft }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {/* Đầu + mũ bảo hộ nhẹ */}
    <circle cx={0} cy={-161} r={13} fill={color} stroke={PAL2D.stroke} strokeWidth={2} />
    {/* Thân trên & hai tay */}
    <path
      d="M-18 -143 C-22 -143, -26 -136, -26 -125 L-24 -82 L-15 -82 L-15 -122 L-12 -122 L-12 0 L-2 0 L-2 -68 L2 -68 L2 0 L12 0 L12 -122 L15 -122 L15 -82 L24 -82 L26 -125 C26 -136, 22 -143, 18 -143 Z"
      fill={color}
      stroke={PAL2D.stroke}
      strokeWidth={2}
    />
  </g>
);

export type CutawaySection =
  | 'none'
  | 'radome'
  | 'seeker'
  | 'endGuidance'
  | 'midGuidance'
  | 'warhead'
  | 'imu'
  | 'igniter'
  | 'propellant'
  | 'actuators'
  | 'fins';

export const PATRIOT_CUTAWAY_X = {
  radome: 615,
  seeker: 481,
  endGuidance: 373,
  midGuidance: 268,
  warhead: 155,
  imu: 46,
  igniter: -30,
  propellant: -337,
  actuators: -653,
  fins: -653,
  propellantSpan: [-612, -62] as const,
} as const;

/**
 * Mặt cắt giải phẫu X-quang dọc toàn thân tên lửa Patriot (dài 1400 px trên bàn vẽ, chia đúng 10 phân khoang kỹ thuật
 * cho 2 cảnh S12 và S13 để hình dáng & ranh giới khoang khớp tuyệt đối 100%, khoang nhiên liệu rắn đúng ~40% chiều dài).
 * Trục X từ -700 (đuôi) tới +700 (chóp mũi), tâm Y = 0, bán kính thân R = 56 px.
 */
export const PatriotCutaway2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  peel?: number; // 0 = vỏ ngoài kín, 1 = mở toàn bộ cửa sổ mặt cắt bên trong
  active?: CutawaySection;
  finDeflectDeg?: number;
}> = ({ x = 0, y = 0, scale = 1, rot = 0, peel = 1, active = 'none', finDeflectDeg = 0 }) => {
  const R = 56;
  const hi = (s: CutawaySection) => (active === s ? 1 : 0.34);
  const strokeHi = (s: CutawaySection) => (active === s ? PAL2D.amberHot : PAL2D.grid);

  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      {/* Cánh lái đuôi (10. fins: -690..-615) */}
      <g opacity={0.55 + 0.45 * hi('fins')}>
        <g transform={`translate(-652 ${-R}) rotate(${finDeflectDeg})`}>
          <polygon points="-38,0 38,0 14,-95 -44,-88" fill={active === 'fins' ? PAL2D.amber : PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={3} />
        </g>
        <g transform={`translate(-652 ${R}) rotate(${-finDeflectDeg})`}>
          <polygon points="-38,0 38,0 14,95 -44,88" fill={active === 'fins' ? PAL2D.amber : PAL2D.pacDark} stroke={PAL2D.stroke} strokeWidth={3} />
        </g>
      </g>

      {/* Vỏ thân nền ngoài */}
      <path
        d={`M-695 ${-R} L535 ${-R} C602 ${-R * 0.94}, 658 ${-R * 0.52}, 700 0 C658 ${R * 0.52}, 602 ${R * 0.94}, 535 ${R} L-695 ${R} Z`}
        fill={PAL2D.pacMid}
        stroke={PAL2D.stroke}
        strokeWidth={3.5}
      />
      <rect x={-695} y={-R + 3} width={1230} height={22} fill={PAL2D.pacLight} />

      {/* Lòng mặt cắt kỹ thuật bên trong (hiện theo peel 0..1) */}
      {peel > 0.01 && (
        <g opacity={peel}>
          <path
            d={`M-688 ${-R + 10} L535 ${-R + 10} C596 ${-R * 0.78}, 648 ${-R * 0.42}, 684 0 C648 ${R * 0.42}, 596 ${R * 0.78}, 535 ${R - 10} L-688 ${R - 10} Z`}
            fill="#0c1724"
            stroke={PAL2D.grid}
            strokeWidth={2}
          />

          {/* 1. Chóp che radar thạch anh nung chảy (535..700) */}
          <g opacity={0.45 + 0.55 * hi('radome')}>
            <path
              d={`M535 ${-R} C602 ${-R * 0.94}, 658 ${-R * 0.52}, 700 0 C658 ${R * 0.52}, 602 ${R * 0.94}, 535 ${R} L535 ${R - 13} C592 ${R * 0.75}, 642 ${R * 0.4}, 676 0 C642 ${-R * 0.4}, 592 ${-R * 0.75}, 535 ${-R + 13} Z`}
              fill={active === 'radome' ? PAL2D.amberHot : PAL2D.radome}
              stroke={strokeHi('radome')}
              strokeWidth={2.5}
            />
          </g>

          {/* 2. Cụm đầu dò tìm kiếm mục tiêu radar chủ động (430..532) */}
          <g opacity={0.35 + 0.65 * hi('seeker')}>
            <rect x={430} y={-R + 14} width={102} height={(R - 14) * 2} rx={6} fill="#162c42" stroke={strokeHi('seeker')} strokeWidth={2.4} />
            <ellipse cx={502} cy={0} rx={11} ry={34} fill={PAL2D.cyan} opacity={0.85} />
            <rect x={442} y={-22} width={44} height={44} rx={4} fill="#2c5378" stroke={PAL2D.cyanSoft} strokeWidth={1.8} />
          </g>

          {/* 3. Khối dẫn đường giai đoạn cuối + định vị vệ tinh GPS (320..426) */}
          <g opacity={0.35 + 0.65 * hi('endGuidance')}>
            <rect x={320} y={-R + 14} width={106} height={(R - 14) * 2} rx={5} fill="#18344a" stroke={strokeHi('endGuidance')} strokeWidth={2.4} />
            {[332, 352, 372, 392].map((px) => (
              <rect key={px} x={px} y={-30} width={13} height={60} rx={2} fill={PAL2D.green} opacity={0.75} />
            ))}
            <circle cx={412} cy={-20} r={8} fill={PAL2D.cyan} />
          </g>

          {/* 4. Phân hệ dẫn đường chặng giữa dạng mô-đun (220..316) */}
          <g opacity={0.35 + 0.65 * hi('midGuidance')}>
            <rect x={220} y={-R + 14} width={96} height={(R - 14) * 2} rx={5} fill="#1f3147" stroke={strokeHi('midGuidance')} strokeWidth={2.4} />
            <rect x={230} y={-28} width={34} height={56} rx={4} fill={PAL2D.cyanSoft} opacity={0.65} />
            <rect x={272} y={-28} width={34} height={56} rx={4} fill={PAL2D.cyanSoft} opacity={0.65} />
          </g>

          {/* 5. Đầu đạn ~90 kg — bộ phận trực tiếp tiêu diệt vũ khí đối phương (95..216) */}
          <g opacity={0.38 + 0.62 * hi('warhead')}>
            <rect x={95} y={-R + 12} width={121} height={(R - 12) * 2} rx={6} fill="#4d1e24" stroke={active === 'warhead' ? PAL2D.red : strokeHi('warhead')} strokeWidth={2.8} />
            <rect x={105} y={-30} width={101} height={60} rx={5} fill={PAL2D.red} opacity={0.78} />
            {Array.from({ length: 10 }, (_, i) => (
              <circle key={i} cx={116 + (i % 5) * 19} cy={i < 5 ? -14 : 14} r={5} fill={PAL2D.amberHot} />
            ))}
          </g>

          {/* 6. Linh kiện cảm biến quán tính & cụm gia tốc con quay hồi chuyển IMU (2..91) */}
          <g opacity={0.35 + 0.65 * hi('imu')}>
            <rect x={2} y={-R + 14} width={89} height={(R - 14) * 2} rx={5} fill="#1c2d42" stroke={strokeHi('imu')} strokeWidth={2.4} />
            <circle cx={46} cy={0} r={26} fill="none" stroke={PAL2D.cyan} strokeWidth={2.5} />
            <ellipse cx={46} cy={0} rx={26} ry={10} fill="none" stroke={PAL2D.amber} strokeWidth={2.1} />
            <ellipse cx={46} cy={0} rx={10} ry={26} fill="none" stroke={PAL2D.green} strokeWidth={2.1} />
          </g>

          {/* 7. Bộ phận đẩy, kích nổ và khai hỏa (-58..-2) */}
          <g opacity={0.35 + 0.65 * hi('igniter')}>
            <rect x={-58} y={-R + 14} width={56} height={(R - 14) * 2} rx={5} fill="#3d2b1c" stroke={strokeHi('igniter')} strokeWidth={2.4} />
            <polygon points="-10,-20 -52,0 -10,20" fill={PAL2D.amber} />
          </g>

          {/* 8. Khoang chứa thuốc phóng nhiên liệu rắn chiếm đúng ~40% chiều dài (-612..-62 = 550/1400) */}
          <g opacity={0.38 + 0.62 * hi('propellant')}>
            <rect x={-612} y={-R + 12} width={550} height={(R - 12) * 2} rx={6} fill="#3b2618" stroke={strokeHi('propellant')} strokeWidth={2.8} />
            <rect x={-602} y={-35} width={530} height={70} rx={4} fill="#c87429" />
            <rect x={-605} y={-10} width={536} height={20} rx={4} fill="#141a22" />
          </g>

          {/* 9. Bơm động cơ, ống loa phụt & các cơ cấu chấp hành điều khiển cánh lái (-690..-616) */}
          <g opacity={0.35 + 0.65 * hi('actuators')}>
            <rect x={-688} y={-R + 14} width={72} height={(R - 14) * 2} rx={5} fill="#25303d" stroke={strokeHi('actuators')} strokeWidth={2.4} />
            <polygon points="-618,-18 -688,-32 -688,32 -618,18" fill="#465260" stroke={PAL2D.pacLight} strokeWidth={2} />
            <rect x={-674} y={-38} width={44} height={13} rx={3} fill={PAL2D.cyanSoft} />
            <rect x={-674} y={25} width={44} height={13} rx={3} fill={PAL2D.cyanSoft} />
          </g>
        </g>
      )}
    </g>
  );
};
