// Hình chiếu 2D SVG dùng chung cho các cảnh sơ đồ / hải đồ / mặt cắt kỹ thuật (quy đổi 1:1 từ kích thước mét thật của mô hình 3D):
// - B-25B Mitchell: dài 16.13 m, sải cánh 20.60 m, cao 4.98 m (đổ khối 3 tông sáng/trung/tối + viền P2D.ink nhất quán)
// - USS Hornet CV-8: dài 251.4 m, rộng sàn 35.0 m, đảo chỉ huy mạn phải, vạch sơn trắng cất cánh mạn trái
// - Ký hiệu chiến hạm, hoa gió hải đồ, bờ biển Thái Bình Dương - Nhật Bản - Trung Quốc
import React from 'react';
import { P2D } from '../design/palette';

/**
 * Hình chiếu bằng (nhìn từ trên) của B-25B Mitchell: mũi hướng +X (sang phải), tâm (0,0).
 * Mặc định `ppm = 6` (1 mét = 6 px → dài 96.8 px, sải cánh 123.6 px). Đúng tỉ lệ 16.13 m × 20.60 m!
 */
export const B25Top2D: React.FC<{
  x?: number;
  y?: number;
  rot?: number;
  ppm?: number;
  tint?: 'olive' | 'blue' | 'ghost';
  propPhase?: number;
}> = ({ x = 0, y = 0, rot = 0, ppm = 6, tint = 'olive', propPhase = 0 }) => {
  const s = ppm;
  const cMid = tint === 'blue' ? P2D.usMain : tint === 'ghost' ? '#41586e' : P2D.oliveMid;
  const cLight = tint === 'blue' ? P2D.usLight : tint === 'ghost' ? '#58748f' : P2D.oliveLight;
  const cDark = tint === 'blue' ? P2D.usDark : tint === 'ghost' ? '#293947' : P2D.oliveDark;
  const sw = Math.max(1.2, s * 0.22);

  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {/* Đuôi ngang & 2 cánh đứng H-tail (sải 6.8 m → z = ±3.4 m, x = -6.8..-5.0 m) */}
      <rect x={-6.7 * s} y={-3.4 * s} width={1.7 * s} height={6.8 * s} rx={0.25 * s} fill={cMid} stroke={P2D.ink} strokeWidth={sw} />
      <rect x={-6.7 * s} y={-3.4 * s} width={0.7 * s} height={6.8 * s} fill={cLight} opacity={0.45} />
      {[-3.45, 3.05].map((tz, i) => (
        <rect key={i} x={-7.15 * s} y={tz * s} width={2.35 * s} height={0.4 * s} rx={0.18 * s} fill={cDark} stroke={P2D.ink} strokeWidth={sw * 0.85} />
      ))}

      {/* Cánh chính sải 20.60 m (y = -10.30..+10.30 m) hơi vuốt cánh ngoài */}
      <path
        d={`M ${2.2 * s} ${-0.9 * s}
            L ${2.2 * s} ${-3.3 * s}
            L ${1.25 * s} ${-10.0 * s}
            Q ${0.5 * s} ${-10.45 * s} ${-0.45 * s} ${-10.1 * s}
            L ${-1.05 * s} ${-3.3 * s}
            L ${-1.15 * s} ${-0.9 * s}
            L ${-1.15 * s} ${0.9 * s}
            L ${-1.05 * s} ${3.3 * s}
            L ${-0.45 * s} ${10.1 * s}
            Q ${0.5 * s} ${10.45 * s} ${1.25 * s} ${10.0 * s}
            L ${2.2 * s} ${3.3 * s}
            L ${2.2 * s} ${0.9 * s} Z`}
        fill={cMid}
        stroke={P2D.ink}
        strokeWidth={sw}
      />
      {/* Đổ khối sáng mép trước cánh & tối mép sau cánh */}
      <path
        d={`M ${2.1 * s} ${-3.2 * s} L ${1.2 * s} ${-9.85 * s} L ${0.65 * s} ${-9.9 * s} L ${1.35 * s} ${-3.2 * s} Z
            M ${2.1 * s} ${3.2 * s} L ${1.2 * s} ${9.85 * s} L ${0.65 * s} ${9.9 * s} L ${1.35 * s} ${3.2 * s} Z`}
        fill={cLight}
        opacity={0.65}
      />
      <path
        d={`M ${-0.4 * s} ${-9.95 * s} L ${-1.0 * s} ${-3.2 * s} L ${-0.45 * s} ${-3.2 * s} L ${0.05 * s} ${-9.85 * s} Z
            M ${-0.4 * s} ${9.95 * s} L ${-1.0 * s} ${3.2 * s} L ${-0.45 * s} ${3.2 * s} L ${0.05 * s} ${9.85 * s} Z`}
        fill={cDark}
        opacity={0.55}
      />

      {/* 2 vỏ động cơ Wright R-2600 tại z = ±3.05 m */}
      {[-3.05, 3.05].map((ez, i) => (
        <g key={i} transform={`translate(0 ${ez * s})`}>
          <rect x={-1.5 * s} y={-0.72 * s} width={5.1 * s} height={1.44 * s} rx={0.62 * s} fill={cMid} stroke={P2D.ink} strokeWidth={sw} />
          <rect x={2.7 * s} y={-0.68 * s} width={0.9 * s} height={1.36 * s} rx={0.35 * s} fill={cDark} stroke={P2D.ink} strokeWidth={sw * 0.8} />
          {/* Đĩa cánh quạt đường kính 3.8 m */}
          <ellipse cx={3.85 * s} cy={0} rx={0.28 * s} ry={1.85 * s} fill="#cfe9ff" opacity={0.38} />
          <line
            x1={3.85 * s}
            y1={-1.75 * s * Math.cos(propPhase + i)}
            x2={3.85 * s}
            y2={1.75 * s * Math.cos(propPhase + i)}
            stroke={P2D.ink}
            strokeWidth={Math.max(1.2, sw * 0.9)}
          />
        </g>
      ))}

      {/* Thân máy bay dài 16.13 m (-7.93..+8.20 m) */}
      <path
        d={`M ${8.2 * s} 0
            Q ${8.1 * s} ${-0.82 * s} ${5.2 * s} ${-0.95 * s}
            L ${-2.4 * s} ${-0.92 * s}
            L ${-7.6 * s} ${-0.34 * s}
            Q ${-7.95 * s} 0 ${-7.6 * s} ${0.34 * s}
            L ${-2.4 * s} ${0.92 * s}
            L ${5.2 * s} ${0.95 * s}
            Q ${8.1 * s} ${0.82 * s} ${8.2 * s} 0 Z`}
        fill={cMid}
        stroke={P2D.ink}
        strokeWidth={sw}
      />
      {/* Highlight sống lưng thân */}
      <ellipse cx={0.8 * s} cy={-0.25 * s} rx={5.6 * s} ry={0.32 * s} fill={cLight} opacity={0.55} />
      {/* Kính mũi & kính buồng lái */}
      <path
        d={`M ${8.15 * s} 0 Q ${8.0 * s} ${-0.72 * s} ${6.35 * s} ${-0.78 * s} L ${6.35 * s} ${0.78 * s} Q ${8.0 * s} ${0.72 * s} ${8.15 * s} 0 Z`}
        fill="#9ad0ec"
        stroke={P2D.ink}
        strokeWidth={sw * 0.8}
      />
      <rect x={3.45 * s} y={-0.68 * s} width={1.65 * s} height={1.36 * s} rx={0.28 * s} fill="#89c3e3" stroke={P2D.ink} strokeWidth={sw * 0.8} />
      {/* Tháp pháo lưng Bendix & 2 cán chổi sơn đen ở chóp đuôi */}
      <circle cx={-0.6 * s} cy={0} r={0.52 * s} fill="#a8d8f0" stroke={P2D.ink} strokeWidth={sw * 0.8} />
      <line x1={-7.85 * s} y1={-0.14 * s} x2={-8.75 * s} y2={-0.14 * s} stroke={P2D.ink} strokeWidth={Math.max(1.1, sw * 0.75)} />
      <line x1={-7.85 * s} y1={0.14 * s} x2={-8.75 * s} y2={0.14 * s} stroke={P2D.ink} strokeWidth={Math.max(1.1, sw * 0.75)} />

      {/* Phù hiệu ngôi sao trắng nền tròn xanh trên cánh trái (-Y) */}
      {tint !== 'ghost' && (
        <g transform={`translate(${0.45 * s} ${-6.8 * s})`}>
          <circle r={0.95 * s} fill="#1f4e8c" stroke={P2D.ink} strokeWidth={sw * 0.45} />
          <polygon
            points={[0, 1, 2, 3, 4]
              .map((k) => {
                const a1 = -Math.PI / 2 + (k * Math.PI * 2) / 5;
                const a2 = a1 + Math.PI / 5;
                return `${(Math.cos(a1) * 0.82 * s).toFixed(1)},${(Math.sin(a1) * 0.82 * s).toFixed(1)} ${(Math.cos(a2) * 0.34 * s).toFixed(1)},${(Math.sin(a2) * 0.34 * s).toFixed(1)}`;
              })
              .join(' ')}
            fill="#ffffff"
          />
          <circle r={0.22 * s} fill={P2D.jpMain} />
        </g>
      )}
    </g>
  );
};

/**
 * Hình chiếu ngang & Mặt cắt kỹ thuật (Cutaway) của B-25B Mitchell tỉ lệ 1:1 (dài 16.13 m, cao 4.98 m).
 * Mũi hướng +X (sang phải), mặt đất khi hạ càng ở `y = 0` (trục Y SVG hướng xuống nên thân nằm ở y âm `-1.1..-4.98 * ppm`).
 */
export const B25Cutaway2D: React.FC<{
  x?: number;
  y?: number;
  ppm?: number;
  cutaway?: boolean;
  showStripped?: number; // 0..1: hiệu ứng tách/mờ tháp pháo bụng, giáp thép, Norden
  showFuel?: number; // 0..1: hiển thị bàng quang 160-gal, túi xăng hẻm bò, 10 can xăng 5-gal
  showMarkTwain?: boolean;
  showBroomsticks?: boolean;
  gearDown?: boolean;
}> = ({
  x = 0,
  y = 0,
  ppm = 48,
  cutaway = false,
  showStripped = 0,
  showFuel = 0,
  showMarkTwain = false,
  showBroomsticks = true,
  gearDown = true,
}) => {
  const s = ppm;
  const sw = Math.max(2, s * 0.055);

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Bộ càng đáp 3 bánh chạm y = 0 */}
      {gearDown && (
        <g>
          {/* Càng mũi x = +5.25 m */}
          <line x1={5.25 * s} y1={-1.35 * s} x2={5.25 * s} y2={-0.46 * s} stroke="#9aa7b2" strokeWidth={sw * 1.3} />
          <circle cx={5.25 * s} cy={-0.46 * s} r={0.46 * s} fill="#26292e" stroke={P2D.ink} strokeWidth={sw * 0.9} />
          <circle cx={5.25 * s} cy={-0.46 * s} r={0.2 * s} fill="#8c99a6" />
          {/* Càng chính x = -0.15 m */}
          <line x1={-0.15 * s} y1={-1.55 * s} x2={-0.15 * s} y2={-0.68 * s} stroke="#9aa7b2" strokeWidth={sw * 1.6} />
          <circle cx={-0.15 * s} cy={-0.68 * s} r={0.68 * s} fill="#26292e" stroke={P2D.ink} strokeWidth={sw} />
          <circle cx={-0.15 * s} cy={-0.68 * s} r={0.32 * s} fill="#8c99a6" />
        </g>
      )}

      {/* Các cụm nặng bị tháo bỏ ở Florida (hiện nét đứt đỏ/dịch xuống khi showStripped > 0) */}
      {showStripped > 0.01 && (
        <g opacity={Math.max(0.22, 1 - showStripped * 0.55)} transform={`translate(0 ${showStripped * 1.35 * s})`}>
          {/* Tháp pháo bụng Bendix nặng nề */}
          <path
            d={`M ${-2.45 * s} ${-1.45 * s} L ${-1.35 * s} ${-1.45 * s} L ${-1.5 * s} ${-0.78 * s} Q ${-1.9 * s} ${-0.62 * s} ${-2.3 * s} ${-0.78 * s} Z`}
            fill="#5d2c2c"
            stroke={P2D.dangerRed}
            strokeWidth={sw * 0.85}
            strokeDasharray={`${sw * 2} ${sw * 1.4}`}
          />
          <line x1={-2.3 * s} y1={-0.88 * s} x2={-3.15 * s} y2={-0.82 * s} stroke={P2D.dangerRed} strokeWidth={sw * 0.8} />
          {/* Tấm giáp thép ghế lái & điện đài tầm xa */}
          <rect
            x={2.85 * s}
            y={-2.85 * s}
            width={0.95 * s}
            height={1.1 * s}
            fill="#5d2c2c"
            stroke={P2D.dangerRed}
            strokeWidth={sw * 0.8}
            strokeDasharray={`${sw * 1.8} ${sw * 1.2}`}
          />
          {/* Máy ngắm Norden cồng kềnh ở mũi */}
          <circle
            cx={7.15 * s}
            cy={-2.1 * s}
            r={0.38 * s}
            fill="#5d2c2c"
            stroke={P2D.dangerRed}
            strokeWidth={sw * 0.8}
            strokeDasharray={`${sw * 1.6} ${sw * 1.1}`}
          />
        </g>
      )}

      {/* Thân chính B-25B (x = -7.93..+8.20 m, bụng ~ -1.35 m, lưng ~ -3.35 m) */}
      <path
        d={`M ${8.2 * s} ${-2.05 * s}
            Q ${8.15 * s} ${-2.68 * s} ${6.55 * s} ${-2.82 * s}
            L ${5.15 * s} ${-2.88 * s}
            L ${4.25 * s} ${-3.42 * s}
            L ${1.2 * s} ${-3.42 * s}
            L ${-2.8 * s} ${-3.22 * s}
            L ${-7.55 * s} ${-2.55 * s}
            Q ${-7.93 * s} ${-2.35 * s} ${-7.85 * s} ${-2.05 * s}
            L ${-3.1 * s} ${-1.42 * s}
            L ${4.8 * s} ${-1.35 * s}
            Q ${7.85 * s} ${-1.42 * s} ${8.2 * s} ${-2.05 * s} Z`}
        fill={P2D.oliveMid}
        stroke={P2D.ink}
        strokeWidth={sw}
      />
      {/* Bụng sơn Neutral Gray + sống lưng sáng Olive Light (3 tông khối!) */}
      <path
        d={`M ${-7.75 * s} ${-2.08 * s} L ${-3.1 * s} ${-1.44 * s} L ${4.8 * s} ${-1.37 * s} Q ${7.6 * s} ${-1.44 * s} ${8.05 * s} ${-1.88 * s} L ${-7.75 * s} ${-2.18 * s} Z`}
        fill="#8e98a1"
        opacity={0.78}
      />
      <path
        d={`M ${4.15 * s} ${-3.38 * s} L ${1.2 * s} ${-3.38 * s} L ${-2.8 * s} ${-3.18 * s} L ${-7.2 * s} ${-2.55 * s} L ${-2.8 * s} ${-2.9 * s} L ${4.0 * s} ${-3.08 * s} Z`}
        fill={P2D.oliveLight}
        opacity={0.7}
      />

      {/* Kính mũi bombardier, buồng lái & tháp pháo lưng Bendix */}
      <path
        d={`M ${8.18 * s} ${-2.05 * s} Q ${8.12 * s} ${-2.66 * s} ${6.6 * s} ${-2.8 * s} L ${6.6 * s} ${-1.56 * s} Q ${7.95 * s} ${-1.62 * s} ${8.18 * s} ${-2.05 * s} Z`}
        fill="#8ec9e6"
        fillOpacity={0.78}
        stroke={P2D.ink}
        strokeWidth={sw * 0.85}
      />
      <path
        d={`M ${5.12 * s} ${-2.88 * s} L ${4.25 * s} ${-3.4 * s} L ${2.95 * s} ${-3.4 * s} L ${2.95 * s} ${-2.78 * s} Z`}
        fill="#8ec9e6"
        fillOpacity={0.78}
        stroke={P2D.ink}
        strokeWidth={sw * 0.85}
      />
      {/* Tháp pháo lưng Bendix */}
      <path
        d={`M ${-1.15 * s} ${-3.32 * s} Q ${-0.6 * s} ${-4.02 * s} ${-0.05 * s} ${-3.32 * s} Z`}
        fill="#9ad1ec"
        stroke={P2D.ink}
        strokeWidth={sw * 0.85}
      />
      <line x1={-0.85 * s} y1={-3.68 * s} x2={-1.95 * s} y2={-3.82 * s} stroke={P2D.ink} strokeWidth={sw * 0.9} />

      {/* Cánh đứng đuôi kép chữ H (cao lên tới -4.98 m!) */}
      <path
        d={`M ${-5.05 * s} ${-2.4 * s}
            Q ${-5.15 * s} ${-4.88 * s} ${-6.15 * s} ${-4.96 * s}
            Q ${-7.25 * s} ${-4.92 * s} ${-7.35 * s} ${-2.4 * s}
            Q ${-7.25 * s} ${-1.55 * s} ${-6.2 * s} ${-1.52 * s}
            Q ${-5.15 * s} ${-1.58 * s} ${-5.05 * s} ${-2.4 * s} Z`}
        fill={P2D.oliveMid}
        stroke={P2D.ink}
        strokeWidth={sw}
      />
      <line x1={-6.35 * s} y1={-4.88 * s} x2={-6.35 * s} y2={-1.56 * s} stroke={P2D.ink} strokeWidth={sw * 0.65} />

      {/* Khoang cắt mở kỹ thuật (Cutaway interior) */}
      {cutaway && (
        <g>
          <rect
            x={-4.4 * s}
            y={-3.12 * s}
            width={9.1 * s}
            height={1.58 * s}
            rx={0.2 * s}
            fill="#142330"
            stroke="#5ea6cc"
            strokeWidth={sw * 0.7}
          />
          {/* Sườn khung dầm nhôm máy bay */}
          {[-3.6, -2.4, -1.2, 0.0, 1.2, 2.4, 3.6].map((fx) => (
            <line key={fx} x1={fx * s} y1={-3.1 * s} x2={fx * s} y2={-1.55 * s} stroke="#2e4e66" strokeWidth={sw * 0.45} />
          ))}
          {/* Khoang bom giữa thân (x = -0.4..+1.7 m) với 4 quả bom 500-lb */}
          {[0.05, 0.55, 1.05, 1.5].map((bx, i) => (
            <g key={i} transform={`translate(${bx * s} ${-1.92 * s})`}>
              <rect x={-0.18 * s} y={-0.16 * s} width={0.44 * s} height={0.24 * s} rx={0.1 * s} fill={P2D.oliveLight} stroke={P2D.ink} strokeWidth={sw * 0.45} />
              <rect x={0.08 * s} y={-0.15 * s} width={0.07 * s} height={0.22 * s} fill={P2D.fuelAmber} />
            </g>
          ))}

          {/* Hệ thống xăng tăng cường 1.141 gallon (hiện sáng theo showFuel 0..1) */}
          {showFuel > 0.01 && (
            <g opacity={Math.min(1, showFuel)}>
              {/* 1) Bàng quang cao su mềm 160-gallon buộc ngay phía trên khoang bom */}
              <rect
                x={-0.35 * s}
                y={-2.98 * s}
                width={2.15 * s}
                height={0.74 * s}
                rx={0.26 * s}
                fill={P2D.fuelAmber}
                stroke={P2D.fuelBright}
                strokeWidth={sw * 0.7}
              />
              {/* 2) Túi xăng mềm nhồi trong hẻm bò (crawlway) nối mũi với khoang giữa */}
              <rect
                x={2.05 * s}
                y={-2.45 * s}
                width={1.85 * s}
                height={0.62 * s}
                rx={0.2 * s}
                fill={P2D.fuelAmber}
                stroke={P2D.fuelBright}
                strokeWidth={sw * 0.65}
              />
              {/* 3) 10 can xăng 5-gallon xếp chồng trong khoang thân sau */}
              {Array.from({ length: 10 }, (_, k) => {
                const col = k % 5;
                const row = Math.floor(k / 5);
                return (
                  <rect
                    key={k}
                    x={(-3.95 + col * 0.44) * s}
                    y={(-2.12 - row * 0.48) * s}
                    width={0.36 * s}
                    height={0.42 * s}
                    rx={0.05 * s}
                    fill={P2D.fuelBright}
                    stroke={P2D.ink}
                    strokeWidth={sw * 0.45}
                  />
                );
              })}
            </g>
          )}
        </g>
      )}

      {/* Vỏ động cơ gần & cánh quạt (nếu cutaway=false thì vẽ đặc đè lên giữa thân; nếu cutaway=true vẽ viền mờ để không che khoang bom) */}
      <g opacity={cutaway ? 0.28 : 1}>
        <rect x={-0.6 * s} y={-2.58 * s} width={4.25 * s} height={1.26 * s} rx={0.48 * s} fill={P2D.oliveDark} stroke={P2D.ink} strokeWidth={sw} />
        <line x1={3.85 * s} y1={-3.82 * s} x2={3.85 * s} y2={-0.08 * s} stroke={P2D.ink} strokeWidth={sw * 1.15} />
        <line x1={3.85 * s} y1={-3.82 * s} x2={3.85 * s} y2={-3.52 * s} stroke={P2D.fuelAmber} strokeWidth={sw * 1.2} />
        <line x1={3.85 * s} y1={-0.38 * s} x2={3.85 * s} y2={-0.08 * s} stroke={P2D.fuelAmber} strokeWidth={sw * 1.2} />
      </g>

      {/* Thước ngắm nhôm 20 xu Mark Twain ở chóp mũi */}
      {showMarkTwain && (
        <g transform={`translate(${7.38 * s} ${-2.25 * s})`}>
          <polygon points={`0,0 ${0.46 * s},0 0,${-0.38 * s}`} fill="none" stroke={P2D.fuelBright} strokeWidth={sw * 0.75} />
          <circle cx={0.46 * s} cy={0} r={0.08 * s} fill={P2D.fuelAmber} />
        </g>
      )}

      {/* 2 cán chổi gỗ sơn đen thò ra khỏi chóp kính đuôi */}
      {showBroomsticks && (
        <g>
          <path
            d={`M ${-7.55 * s} ${-2.52 * s} Q ${-8.02 * s} ${-2.3 * s} ${-7.55 * s} ${-2.06 * s} Z`}
            fill="#8ec9e6"
            stroke={P2D.ink}
            strokeWidth={sw * 0.7}
          />
          <line x1={-7.8 * s} y1={-2.36 * s} x2={-9.05 * s} y2={-2.42 * s} stroke="#14161a" strokeWidth={sw * 1.05} strokeLinecap="round" />
          <line x1={-7.8 * s} y1={-2.2 * s} x2={-9.05 * s} y2={-2.16 * s} stroke="#14161a" strokeWidth={sw * 1.05} strokeLinecap="round" />
        </g>
      )}
    </g>
  );
};

/**
 * Hình chiếu bằng (nhìn từ trên) của tàu sân bay USS Hornet CV-8: dài 251.4 m, rộng sàn 35.0 m.
 * Mũi hướng +X (sang phải), đảo chỉ huy bên mạn phải (+Y trong SVG khi nhìn từ trên xuống mũi sang phải!),
 * vạch trắng dẫn bánh trái nằm bên mạn trái (-Y trong SVG, đúng z = -3.8 m!).
 */
export const CarrierTop2D: React.FC<{
  x?: number;
  y?: number;
  rot?: number;
  ppm?: number;
  showLaunchStripe?: boolean;
  parkedCount?: number;
}> = ({ x = 0, y = 0, rot = 0, ppm = 5, showLaunchStripe = true, parkedCount = 0 }) => {
  const s = ppm;
  const sw = Math.max(1.5, s * 0.35);

  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`}>
      {/* Vệt sóng rẽ mũi & đuôi tàu */}
      <path
        d={`M ${128 * s} 0 Q ${95 * s} ${-24 * s} ${-138 * s} ${-28 * s} L ${-138 * s} ${28 * s} Q ${95 * s} ${24 * s} ${128 * s} 0 Z`}
        fill="#cbe8f8"
        opacity={0.18}
      />
      {/* Thân dưới & hành lang pháo phòng không hai mạn */}
      <path
        d={`M ${125.7 * s} 0
            Q ${110 * s} ${-14.5 * s} ${75 * s} ${-17.8 * s}
            L ${-108 * s} ${-17.8 * s}
            L ${-125.7 * s} ${-12.5 * s}
            L ${-125.7 * s} ${12.5 * s}
            L ${-108 * s} ${17.8 * s}
            L ${75 * s} ${17.8 * s}
            Q ${110 * s} ${14.5 * s} ${125.7 * s} 0 Z`}
        fill="#2b3a4a"
        stroke={P2D.ink}
        strokeWidth={sw}
      />
      {/* Sàn bay gỗ sơn xanh xám Yorktown-class (251.4 m × 35 m) */}
      <path
        d={`M ${124.5 * s} ${-11.8 * s}
            L ${90 * s} ${-16.8 * s}
            L ${-115 * s} ${-16.8 * s}
            L ${-124.5 * s} ${-12.2 * s}
            L ${-124.5 * s} ${12.2 * s}
            L ${-115 * s} ${16.8 * s}
            L ${90 * s} ${16.8 * s}
            L ${124.5 * s} ${11.8 * s} Z`}
        fill="#3b4654"
        stroke={P2D.ink}
        strokeWidth={sw * 0.9}
      />
      {/* 3 thang nâng máy bay (elevators 14.6 m × 13.4 m — nhỏ hơn sải cánh 20.6 m của B-25!) */}
      {[-68, -4, 58].map((ex, i) => (
        <rect
          key={i}
          x={(ex - 7.3) * s}
          y={-6.7 * s}
          width={14.6 * s}
          height={13.4 * s}
          fill="#323c48"
          stroke="#6b7d91"
          strokeWidth={Math.max(1, sw * 0.45)}
          strokeDasharray={`${s * 1.4} ${s * 0.9}`}
        />
      ))}
      {/* Vạch cất cánh 467 ft (142.3 m đầu mũi: x = -16.6..+124.5 m), vạch trắng bánh trái tại z = -3.8 m */}
      {showLaunchStripe && (
        <g>
          <line x1={-16.6 * s} y1={-3.8 * s} x2={123.5 * s} y2={-3.8 * s} stroke="#f5f8fa" strokeWidth={Math.max(2, s * 0.48)} />
          <line
            x1={-16.6 * s}
            y1={-0.85 * s}
            x2={123.5 * s}
            y2={-0.85 * s}
            stroke={P2D.fuelAmber}
            strokeWidth={Math.max(1.2, s * 0.28)}
            strokeDasharray={`${s * 2.2} ${s * 1.4}`}
          />
        </g>
      )}
      {/* Đảo chỉ huy thép bên mạn phải (z = +11.25..+17.2 m, x = +12..+46 m) */}
      <rect
        x={12 * s}
        y={11.25 * s}
        width={34 * s}
        height={5.8 * s}
        rx={1.1 * s}
        fill="#66798c"
        stroke={P2D.ink}
        strokeWidth={sw * 0.85}
      />
      <ellipse cx={31 * s} cy={14.1 * s} rx={6.2 * s} ry={2.1 * s} fill="#252c33" stroke={P2D.ink} strokeWidth={sw * 0.6} />

      {/* Xếp tối đa 16 chiếc B-25B trên phần đuôi/giữa sàn tàu đúng tỉ lệ thật */}
      {parkedCount > 0 &&
        Array.from({ length: Math.min(16, parkedCount) }, (_, k) => {
          // Chiếc #1 ở vị trí xuất phát x = -16.6, z = -0.85; 15 chiếc còn lại xếp so le 2 hàng về phía đuôi
          const px = k === 0 ? -16.6 : -32 - Math.floor((k - 1) / 2) * 12.2 - ((k - 1) % 2) * 4.5;
          const pz = k === 0 ? -0.85 : (k - 1) % 2 === 0 ? -5.8 : 4.6;
          const prot = k === 0 ? 0 : (k - 1) % 2 === 0 ? 6 : -7;
          return <B25Top2D key={k} x={px * s} y={pz * s} rot={prot} ppm={s} tint="olive" />;
        })}
    </g>
  );
};

/** Ký hiệu chiến hạm thu gọn trên hải đồ chiến lược */
export const WarshipIcon2D: React.FC<{
  x: number;
  y: number;
  rot?: number;
  scale?: number;
  side: 'us' | 'jp';
  carrier?: boolean;
}> = ({ x, y, rot = 0, scale = 1, side, carrier = true }) => {
  const fill = side === 'us' ? P2D.usMain : P2D.jpMain;
  const light = side === 'us' ? P2D.usLight : P2D.jpLight;
  const dark = side === 'us' ? P2D.usDark : P2D.jpDark;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <path d="M 30 0 Q 18 -11 -26 -10 L -30 -6 L -30 6 L -26 10 Q 18 11 30 0 Z" fill={fill} stroke={P2D.ink} strokeWidth={2.4} />
      <path d="M 27 0 Q 16 -8 -24 -7 L -24 0 Z" fill={light} opacity={0.55} />
      {carrier ? (
        <>
          <rect x={-23} y={-7} width={44} height={14} rx={2} fill={dark} stroke={P2D.ink} strokeWidth={1.6} />
          <line x1={-19} y1={0} x2={18} y2={0} stroke="#ffffff" strokeWidth={1.5} strokeDasharray="5 3" />
          {side === 'jp' && <circle cx={12} cy={0} r={3.6} fill="#ff3b30" stroke="#ffffff" strokeWidth={1} />}
        </>
      ) : (
        <>
          <rect x={-10} y={-4} width={18} height={8} rx={2} fill={dark} stroke={P2D.ink} strokeWidth={1.5} />
          <circle cx={14} cy={0} r={3.2} fill={light} stroke={P2D.ink} strokeWidth={1.4} />
        </>
      )}
    </g>
  );
};

/** Hình chiếu ngang thu gọn B-25B Mitchell (tiện dùng trên sơ đồ tầm bắn / mặt cắt khoảng cách sàn tàu) */
export const B25Side2D: React.FC<{ x?: number; y?: number; ppm?: number; gearDown?: boolean }> = ({
  x = 0,
  y = 0,
  ppm = 24,
  gearDown = false,
}) => <B25Cutaway2D x={x} y={y} ppm={ppm} cutaway={false} gearDown={gearDown} />;

/** Hình chiếu ngang tàu sân bay USS Hornet CV-8 (dài 251.4 m, cao sàn bay 18.3 m trên mực nước y = 0) */
export const CarrierSide2D: React.FC<{ x?: number; y?: number; ppm?: number }> = ({ x = 0, y = 0, ppm = 4 }) => {
  const s = ppm;
  const sw = Math.max(1.4, s * 0.4);
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Thân tàu từ mực nước y = 0 lên sàn bay y = -18.3 * s */}
      <path
        d={`M ${-122 * s} 0 L ${114 * s} 0 L ${125.7 * s} ${-18.3 * s} L ${-125.7 * s} ${-18.3 * s} Z`}
        fill="#344659"
        stroke={P2D.ink}
        strokeWidth={sw}
      />
      <rect x={-125.7 * s} y={-19.6 * s} width={251.4 * s} height={1.6 * s} fill="#465466" stroke={P2D.ink} strokeWidth={sw * 0.8} />
      {/* Tháp đảo chỉ huy cao 16.5 m trên mặt sàn */}
      <rect x={12 * s} y={-35.8 * s} width={34 * s} height={16.2 * s} rx={1.2 * s} fill="#5e7287" stroke={P2D.ink} strokeWidth={sw * 0.85} />
      <line x1={26 * s} y1={-35.8 * s} x2={26 * s} y2={-46 * s} stroke={P2D.ink} strokeWidth={sw * 0.7} />
    </g>
  );
};

/** Hoa gió la bàn hải đồ cổ điển */
export const CompassRose2D: React.FC<{ x: number; y: number; r?: number }> = ({ x, y, r = 54 }) => (
  <g transform={`translate(${x} ${y})`} opacity={0.78}>
    <circle r={r} fill="none" stroke={P2D.seaGrid} strokeWidth={1.6} />
    <circle r={r * 0.78} fill="none" stroke={P2D.seaGrid} strokeWidth={1} strokeDasharray="4 4" />
    {[0, 90, 180, 270].map((deg) => (
      <g key={deg} transform={`rotate(${deg})`}>
        <polygon points={`0,${-r * 1.08} ${r * 0.16},0 0,${-r * 0.18}`} fill={deg === 0 ? P2D.fuelAmber : P2D.paper} />
        <polygon points={`0,${-r * 1.08} ${-r * 0.16},0 0,${-r * 0.18}`} fill={P2D.seaGrid} />
      </g>
    ))}
  </g>
);
