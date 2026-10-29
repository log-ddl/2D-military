// Hình vẽ 2D dùng chung cho dự án `gem` — quy đổi đúng tỉ lệ mét thật 1:1 với các mô hình 3D (mặc định 1 m = 40 px ở scale = 1).
// Đổ khối 3 tông (sáng / trung / tối) + viền mực `PAL2D.ink` nhất quán, không chứa biến thừa (`noUnusedLocals`).
import React from 'react';
import { PAL2D } from './palette';

const PX_PER_M = 40;

/** Lưới kỹ thuật nền hồ sơ giải mật / bàn điều khiển chiến thuật (tránh mảng màu phẳng trống). */
export const TacticalGrid2D: React.FC<{
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  step?: number;
  major?: number;
  color?: string;
  opacity?: number;
}> = ({ x = -400, y = -300, w = 2720, h = 1680, step = 80, major = 320, color = PAL2D.grid, opacity = 0.26 }) => {
  const xs: number[] = [];
  const ys: number[] = [];
  for (let gx = Math.ceil(x / step) * step; gx <= x + w; gx += step) xs.push(gx);
  for (let gy = Math.ceil(y / step) * step; gy <= y + h; gy += step) ys.push(gy);
  return (
    <g opacity={opacity} pointerEvents="none">
      {xs.map((gx) => (
        <line
          key={`vx${gx}`}
          x1={gx}
          y1={y}
          x2={gx}
          y2={y + h}
          stroke={color}
          strokeWidth={gx % major === 0 ? 1.6 : 0.8}
          opacity={gx % major === 0 ? 0.85 : 0.42}
        />
      ))}
      {ys.map((gy) => (
        <line
          key={`hy${gy}`}
          x1={x}
          y1={gy}
          x2={x + w}
          y2={gy}
          stroke={color}
          strokeWidth={gy % major === 0 ? 1.6 : 0.8}
          opacity={gy % major === 0 ? 0.85 : 0.42}
        />
      ))}
    </g>
  );
};

export type Shahed2DProps = {
  x?: number;
  y?: number;
  rot?: number;
  scale?: number;
  view?: 'top' | 'side';
  propAngle?: number;
  xray?: boolean;
  ghost?: boolean;
  tint?: 'threat' | 'putty';
};

/**
 * UAV cảm tử dòng Shahed (3.50 m dài × 2.50 m sải cánh delta = 140 × 100 px ở scale=1).
 * Mũi luôn hướng +X (sang phải) khi rot = 0.
 */
export const Shahed2D: React.FC<Shahed2DProps> = ({
  x = 0,
  y = 0,
  rot = 0,
  scale = 1,
  view = 'top',
  propAngle = 0,
  xray = false,
  ghost = false,
  tint = 'threat',
}) => {
  const hi = tint === 'threat' ? PAL2D.threatHi : '#ebe6da';
  const mid = tint === 'threat' ? PAL2D.threatMid : '#cfc8b8';
  const lo = tint === 'threat' ? PAL2D.threatLo : '#8c8577';
  const dash = ghost ? '7 5' : undefined;
  const fillOp = ghost ? 0.14 : xray ? 0.28 : 1;
  const bladeLen = 17 * Math.max(0.35, Math.abs(Math.cos(propAngle)));

  if (view === 'side') {
    // Dài 140 px (-70..+70), thân cao ~21 px, vây đầu cánh cao ±18 px
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
        {/* Ống pitot mũi */}
        <line x1={68} y1={0} x2={78} y2={0} stroke={PAL2D.chalk} strokeWidth={2} strokeDasharray={dash} />
        {/* Vây đứng đầu cánh (nhìn xuyên chiều ngang ở đuôi) */}
        <path
          d="M-64 -6 L-44 -6 L-54 -23 L-67 -21 Z"
          fill={lo}
          fillOpacity={fillOp}
          stroke={PAL2D.ink}
          strokeWidth={2.2}
          strokeDasharray={dash}
        />
        <path
          d="M-64 6 L-44 6 L-52 19 L-66 17 Z"
          fill={lo}
          fillOpacity={fillOp}
          stroke={PAL2D.ink}
          strokeWidth={2.2}
          strokeDasharray={dash}
        />
        {/* Thân trụ + mũi đầu đạn ogive */}
        <path
          d="M-64 -9 L28 -10 C48 -10 62 -5 70 0 C62 5 48 10 28 10 L-64 9 Z"
          fill={mid}
          fillOpacity={fillOp}
          stroke={PAL2D.ink}
          strokeWidth={2.6}
          strokeDasharray={dash}
        />
        {/* Mảng sáng lưng & mảng tối bụng */}
        {!ghost && (
          <>
            <path d="M-62 -8 L28 -9 C45 -9 58 -5 66 -1 L26 -3 L-62 -3 Z" fill={hi} fillOpacity={xray ? 0.25 : 0.75} />
            <path d="M-62 4 L28 4 L64 2 C56 6 44 9 28 9 L-62 8 Z" fill={lo} fillOpacity={xray ? 0.25 : 0.65} />
          </>
        )}
        {/* Gờ cánh tam giác nhìn ngang + mấu phóng bụng */}
        <path d="M-63 2 L14 1 L6 6 L-63 6 Z" fill={lo} fillOpacity={fillOp} stroke={PAL2D.ink} strokeWidth={1.8} />
        <rect x={-16} y={9} width={14} height={4} rx={1.5} fill={PAL2D.basalt} stroke={PAL2D.ink} strokeWidth={1.5} />
        {/* Đường khớp đầu đạn & ăng-ten CRPA trên lưng */}
        <line x1={26} y1={-9.5} x2={26} y2={9.5} stroke={PAL2D.ink} strokeWidth={2} />
        <rect x={-12} y={-13} width={16} height={3.5} rx={1.5} fill={PAL2D.chalk} stroke={PAL2D.ink} strokeWidth={1.5} />
        {/* Cụm động cơ MD-550 & cánh quạt đẩy 2 lá đuôi */}
        <rect x={-71} y={-6} width={7} height={12} rx={2} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={1.8} />
        <line x1={-73} y1={-bladeLen} x2={-73} y2={bladeLen} stroke={PAL2D.amberHi} strokeWidth={3.2} strokeLinecap="round" />
        <circle cx={-73} cy={0} r={3} fill={PAL2D.ink} />
        {/* Nội thất X-quang (dùng khi giải phẫu khoang dẫn đường) */}
        {xray && (
          <g>
            {/* Đầu đạn nổ mảnh ở mũi */}
            <path d="M28 -7 L54 -5 L63 0 L54 5 L28 7 Z" fill={PAL2D.threatMid} opacity={0.82} stroke={PAL2D.amberHi} strokeWidth={1.5} />
            {/* Chip tọa độ & khối INS giữa thân */}
            <rect x={2} y={-6} width={18} height={12} rx={2} fill={PAL2D.usLo} stroke={PAL2D.ewTeal} strokeWidth={1.6} />
            <circle cx={-24} cy={0} r={6.5} fill="none" stroke={PAL2D.amberMid} strokeWidth={1.8} />
            <ellipse cx={-24} cy={0} rx={6.5} ry={2.8} fill="none" stroke={PAL2D.amberHi} strokeWidth={1.4} />
          </g>
        )}
      </g>
    );
  }

  // Nhìn từ đỉnh đầu ('top'): dài 140 px (-70..+70), sải cánh delta 100 px (-50..+50)
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      <line x1={68} y1={0} x2={78} y2={0} stroke={PAL2D.chalk} strokeWidth={2} strokeDasharray={dash} />
      {/* Cánh tam giác cụt (cropped delta) */}
      <path
        d="M22 -8 L-48 -50 L-64 -50 L-62 0 L-64 50 L-48 50 L22 8 Z"
        fill={mid}
        fillOpacity={fillOp}
        stroke={PAL2D.ink}
        strokeWidth={2.6}
        strokeLinejoin="round"
        strokeDasharray={dash}
      />
      {/* Đổ khối sáng nửa cánh trái / tối nửa cánh phải */}
      {!ghost && (
        <>
          <path d="M20 -7 L-48 -48 L-62 -48 L-60 -2 L18 -2 Z" fill={hi} fillOpacity={xray ? 0.2 : 0.45} />
          <path d="M20 7 L-48 48 L-62 48 L-60 2 L18 2 Z" fill={lo} fillOpacity={xray ? 0.2 : 0.38} />
        </>
      )}
      {/* Khe cánh tà elevon + 2 tấm vây đầu mút cánh */}
      <line x1={-56} y1={-45} x2={-56} y2={-11} stroke={PAL2D.ink} strokeWidth={1.6} strokeDasharray={dash} />
      <line x1={-56} y1={11} x2={-56} y2={45} stroke={PAL2D.ink} strokeWidth={1.6} strokeDasharray={dash} />
      <rect x={-66} y={-52} width={20} height={4} rx={1.5} fill={lo} stroke={PAL2D.ink} strokeWidth={1.8} />
      <rect x={-66} y={48} width={20} height={4} rx={1.5} fill={lo} stroke={PAL2D.ink} strokeWidth={1.8} />
      {/* Thân trụ giữa liền cánh + mũi ogive */}
      <path
        d="M-64 -8 L32 -8 C50 -8 62 -4 70 0 C62 4 50 8 32 8 L-64 8 Z"
        fill={hi}
        fillOpacity={ghost ? 0.18 : xray ? 0.35 : 0.92}
        stroke={PAL2D.ink}
        strokeWidth={2.4}
        strokeDasharray={dash}
      />
      <line x1={30} y1={-7.5} x2={30} y2={7.5} stroke={PAL2D.ink} strokeWidth={1.8} />
      {/* Cụm 4 ăng-ten chống nhiễu CRPA trên lưng */}
      <rect x={-14} y={-4.5} width={9} height={9} rx={1.8} fill={PAL2D.paper} stroke={PAL2D.ink} strokeWidth={1.4} />
      {/* Xi-lanh động cơ 2 bên đuôi + cánh quạt đẩy */}
      <rect x={-69} y={-11} width={6} height={22} rx={2} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={1.6} />
      <line x1={-73} y1={-bladeLen} x2={-73} y2={bladeLen} stroke={PAL2D.amberHi} strokeWidth={3.2} strokeLinecap="round" />
    </g>
  );
};

export type ScanEagle2DProps = {
  x?: number;
  y?: number;
  rot?: number;
  scale?: number;
  view?: 'top' | 'side';
  propAngle?: number;
};

/**
 * UAV trinh sát Boeing Insitu ScanEagle (dài 1.71 m × sải cánh quét 3.11 m = 68.4 × 124.4 px ở scale=1).
 * Đặc trưng: bụng trơn không bánh xe, cầu quang-hồng ngoại ở mũi, cánh quét mảnh có mấu móc SkyHook ở đầu cánh.
 */
export const ScanEagle2D: React.FC<ScanEagle2DProps> = ({
  x = 0,
  y = 0,
  rot = 0,
  scale = 1,
  view = 'top',
  propAngle = 0,
}) => {
  const blade = 12 * Math.max(0.35, Math.abs(Math.sin(propAngle)));
  if (view === 'side') {
    return (
      <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
        {/* Vây winglet đầu cánh nhìn ngang */}
        <path d="M-34 -3 L-18 -3 L-28 -22 L-38 -20 Z" fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2} />
        {/* Thân gọn không càng đáp */}
        <path
          d="M-30 -6 L18 -7 C27 -7 33 -4 35 0 C33 4 27 7 18 7 L-30 6 Z"
          fill={PAL2D.usMid}
          stroke={PAL2D.ink}
          strokeWidth={2.4}
        />
        <path d="M-28 -5 L18 -6 L31 -1 L-28 -1 Z" fill={PAL2D.usHi} opacity={0.8} />
        {/* Cầu camera EO/IR mũi */}
        <circle cx={28} cy={2} r={5.5} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={1.8} />
        <circle cx={30} cy={2} r={2.2} fill={PAL2D.ewTeal} />
        {/* Cánh quạt đẩy đuôi */}
        <line x1={-34} y1={-blade} x2={-34} y2={blade} stroke={PAL2D.chalk} strokeWidth={2.6} strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      {/* Đôi cánh dài mảnh quét 23 độ */}
      <path
        d="M10 -5 L-20 -62 L-31 -62 L-10 -5 Z"
        fill={PAL2D.usHi}
        stroke={PAL2D.ink}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      <path
        d="M10 5 L-20 62 L-31 62 L-10 5 Z"
        fill={PAL2D.usMid}
        stroke={PAL2D.ink}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      {/* Mấu móc cáp SkyHook ở hai đầu mút cánh */}
      <path d="M-21 -62 L-15 -66 L-18 -59" fill="none" stroke={PAL2D.amberHi} strokeWidth={2.2} strokeLinecap="round" />
      <path d="M-21 62 L-15 66 L-18 59" fill="none" stroke={PAL2D.amberHi} strokeWidth={2.2} strokeLinecap="round" />
      {/* Thân trung tâm + đầu cầu EO/IR */}
      <path
        d="M-30 -6 L22 -6 C30 -6 35 -3 36 0 C35 3 30 6 22 6 L-30 6 Z"
        fill={PAL2D.chalk}
        stroke={PAL2D.ink}
        strokeWidth={2.3}
      />
      <circle cx={29} cy={0} r={4.6} fill={PAL2D.basaltDark} stroke={PAL2D.ink} strokeWidth={1.6} />
      <line x1={-33} y1={-blade} x2={-33} y2={blade} stroke={PAL2D.chalk} strokeWidth={2.6} strokeLinecap="round" />
    </g>
  );
};

/** Đạn phản lực đánh chặn Coyote Block II (dài 1.45 m — tên lửa tuốc-bin cánh chữ X, không phải cánh quạt). */
export const Coyote2D: React.FC<{
  x?: number;
  y?: number;
  rot?: number;
  scale?: number;
  flame?: number;
  ghost?: boolean;
}> = ({ x = 0, y = 0, rot = 0, scale = 1, flame = 0, ghost = false }) => {
  const dash = ghost ? '7 5' : undefined;
  const op = ghost ? 0.16 : 1;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      {flame > 0 && !ghost && (
        <g opacity={Math.min(1, flame)}>
          <path d={`M-34 0 L${-34 - 28 * flame} -6 L${-34 - 42 * flame} 0 L${-34 - 28 * flame} 6 Z`} fill={PAL2D.amberMid} />
          <path d={`M-34 0 L${-34 - 20 * flame} -3 L${-34 - 28 * flame} 0 L${-34 - 20 * flame} 3 Z`} fill={PAL2D.amberHi} />
        </g>
      )}
      {/* 4 cánh nâng giữa thân & 4 cánh lái đuôi */}
      <path d="M-2 -5 L-12 -18 L-18 -18 L-11 -5 Z" fill={PAL2D.usLo} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2} strokeDasharray={dash} />
      <path d="M-2 5 L-12 18 L-18 18 L-11 5 Z" fill={PAL2D.usLo} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2} strokeDasharray={dash} />
      <path d="M-24 -5 L-31 -13 L-35 -13 L-31 -5 Z" fill={PAL2D.basalt} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={1.8} strokeDasharray={dash} />
      <path d="M-24 5 L-31 13 L-35 13 L-31 5 Z" fill={PAL2D.basalt} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={1.8} strokeDasharray={dash} />
      {/* Cửa hút khí lưng */}
      <path d="M-16 -5 L-6 -9 L2 -9 L6 -5 Z" fill={PAL2D.usMid} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={1.8} strokeDasharray={dash} />
      {/* Thân đạn trụ + mũi radome */}
      <path
        d="M-33 -5 L20 -5 C28 -5 34 -2.5 37 0 C34 2.5 28 5 20 5 L-33 5 Z"
        fill={PAL2D.concreteHi}
        fillOpacity={op}
        stroke={PAL2D.ink}
        strokeWidth={2.3}
        strokeDasharray={dash}
      />
      {!ghost && (
        <>
          <path d="M20 -5 C28 -5 34 -2.5 37 0 C34 2.5 28 5 20 5 Z" fill={PAL2D.basaltDark} />
          <rect x={8} y={-4.5} width={6} height={9} fill={PAL2D.threatMid} />
        </>
      )}
    </g>
  );
};

/** Tổ hợp radar băng Ku `KuRFS` 4 mặt mảng pha + bệ phóng 4 ống đạn Coyote (cao 3.45 m = 138 px ở scale=1). */
export const Kurfs2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  ghost?: boolean;
  active?: boolean;
}> = ({ x = 0, y = 0, scale = 1, ghost = false, active = true }) => {
  const dash = ghost ? '8 6' : undefined;
  const op = ghost ? 0.16 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Bệ pallet bọc giáp (gốc y=0 là mặt đất) */}
      <rect x={-56} y={-28} width={112} height={28} rx={4} fill={PAL2D.sandMid} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2.6} strokeDasharray={dash} />
      {!ghost && <rect x={-54} y={-26} width={108} height={9} rx={2} fill={PAL2D.sandHi} opacity={0.7} />}
      {/* Cột tháp radar KuRFS bên trái */}
      <rect x={-34} y={-92} width={16} height={64} fill={PAL2D.concreteLo} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2.4} strokeDasharray={dash} />
      {/* Đầu radar AESA đa diện 4 mặt */}
      <polygon
        points="-50,-92 -42,-132 -10,-132 -2,-92"
        fill={active && !ghost ? PAL2D.usMid : PAL2D.basalt}
        fillOpacity={op}
        stroke={PAL2D.ink}
        strokeWidth={2.6}
        strokeDasharray={dash}
      />
      {!ghost && (
        <>
          <polygon points="-45,-97 -39,-126 -26,-126 -26,-97" fill={PAL2D.usHi} opacity={0.65} />
          <polygon points="-24,-97 -24,-126 -13,-126 -7,-97" fill={PAL2D.usLo} opacity={0.75} />
          <ellipse cx={-26} cy={-136} rx={10} ry={4} fill={PAL2D.concreteHi} stroke={PAL2D.ink} strokeWidth={2} />
        </>
      )}
      {/* Bệ 4 ống phóng nghiêng Coyote bên phải */}
      <g transform="translate(22 -42) rotate(-32)">
        <rect x={-18} y={-26} width={52} height={24} rx={3} fill={PAL2D.usLo} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2.5} strokeDasharray={dash} />
        {!ghost && <rect x={-16} y={-24} width={48} height={8} fill={PAL2D.usMid} opacity={0.8} />}
      </g>
      <circle cx={22} cy={-36} r={8} fill={PAL2D.basalt} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2.2} strokeDasharray={dash} />
    </g>
  );
};

/** Tổ hợp pháo xoay tự động C-RAM Phalanx 20mm (dùng cho bảng biên chế S08 & cải tổ S20). */
export const Cram2D: React.FC<{ x?: number; y?: number; scale?: number; ghost?: boolean }> = ({
  x = 0,
  y = 0,
  scale = 1,
  ghost = false,
}) => {
  const dash = ghost ? '8 6' : undefined;
  const op = ghost ? 0.16 : 1;
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <rect x={-48} y={-26} width={96} height={26} rx={4} fill={PAL2D.sandMid} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2.6} strokeDasharray={dash} />
      <rect x={-22} y={-68} width={44} height={42} rx={4} fill={PAL2D.concreteMid} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2.5} strokeDasharray={dash} />
      {/* Vòm trắng Phalanx đặc trưng */}
      <path
        d="M-20 -68 L-20 -102 C-20 -116 20 -116 20 -102 L20 -68 Z"
        fill={PAL2D.paper}
        fillOpacity={op}
        stroke={PAL2D.ink}
        strokeWidth={2.6}
        strokeDasharray={dash}
      />
      {/* Cụm nòng xoay 6 nòng Gatling 20mm */}
      <g transform="translate(14 -62) rotate(-26)">
        <rect x={0} y={-5} width={46} height={10} rx={2} fill={PAL2D.basaltDark} fillOpacity={op} stroke={PAL2D.ink} strokeWidth={2.2} strokeDasharray={dash} />
      </g>
    </g>
  );
};

/**
 * Mặt cắt ngang nhà container cải tạo CHU (rộng 2.44 m × cao 2.59 m = 98 × 104 px ở scale=1, gốc y=0 tại mặt đất).
 * Đồng bộ tuyệt đối với tường chữ T (cao 3.66 m = 146 px, cao hơn nóc CHU đúng 1.07 m!).
 */
export const ChuSection2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  damaged?: boolean;
  hasBlastRoof?: boolean;
  tag?: string;
}> = ({ x = 0, y = 0, scale = 1, damaged = false, hasBlastRoof = false, tag }) => {
  const w = 2.44 * PX_PER_M; // 97.6
  const h = 2.59 * PX_PER_M; // 103.6
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Khung vỏ tôn mỏng container CHU */}
      <rect
        x={-w / 2}
        y={-h}
        width={w}
        height={h}
        rx={3}
        fill={damaged ? '#3b2322' : '#22364f'}
        stroke={damaged ? PAL2D.threatMid : PAL2D.concreteHi}
        strokeWidth={3.2}
      />
      {/* Gân tôn & giường tầng bên trong mặt cắt */}
      <rect x={-w / 2 + 6} y={-h + 6} width={w - 12} height={h - 12} fill="none" stroke={PAL2D.concreteLo} strokeWidth={1.4} strokeDasharray="5 4" />
      <rect x={-w / 2 + 12} y={-28} width={34} height={6} rx={2} fill={PAL2D.usMid} opacity={0.75} />
      <rect x={-w / 2 + 12} y={-58} width={34} height={6} rx={2} fill={PAL2D.usMid} opacity={0.55} />
      {/* Cục nóng điều hòa cửa sổ */}
      <rect x={w / 2 - 2} y={-h + 24} width={16} height={22} rx={2} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.2} />
      {/* Vết xé toạc vỏ tôn khi trúng sóng nổ & mảnh văng */}
      {damaged && (
        <g>
          <path d={`M${-w / 2 - 4} ${-h + 18} L${-w / 2 + 16} ${-h + 30} L${-w / 2 - 2} ${-h + 44} L${-w / 2 + 20} ${-h + 58}`} fill="none" stroke={PAL2D.amberHi} strokeWidth={2.6} />
          <circle cx={0} cy={-h * 0.5} r={22} fill={PAL2D.threatMid} opacity={0.28} />
        </g>
      )}
      {/* Giàn mái kích nổ sớm (pre-detonation roof screen — dùng ở cảnh S20) */}
      {hasBlastRoof && (
        <g>
          <line x1={-w / 2 + 8} y1={-h} x2={-w / 2 + 8} y2={-h - 26} stroke={PAL2D.usHi} strokeWidth={3} />
          <line x1={w / 2 - 8} y1={-h} x2={w / 2 - 8} y2={-h - 26} stroke={PAL2D.usHi} strokeWidth={3} />
          <line x1={-w / 2 + 8} y1={-h} x2={0} y2={-h - 34} stroke={PAL2D.usMid} strokeWidth={2.2} />
          <line x1={w / 2 - 8} y1={-h} x2={0} y2={-h - 34} stroke={PAL2D.usMid} strokeWidth={2.2} />
          <path
            d={`M${-w / 2 - 14} ${-h - 24} L0 ${-h - 38} L${w / 2 + 14} ${-h - 24}`}
            fill="none"
            stroke={PAL2D.amberHi}
            strokeWidth={4.5}
            strokeLinecap="round"
          />
        </g>
      )}
      {tag && (
        <text x={0} y={-h + 24} textAnchor="middle" fill={PAL2D.chalk} fontSize={18} fontWeight={700} fontFamily="monospace">
          {tag}
        </text>
      )}
    </g>
  );
};

/**
 * Mặt cắt ngang tường bê tông chống mảnh chữ T (Bremer T-Wall: cao 3.66 m = 146.4 px, đế chữ T 1.50 m = 60 px).
 */
export const TWallSection2D: React.FC<{ x?: number; y?: number; scale?: number }> = ({ x = 0, y = 0, scale = 1 }) => {
  const h = 3.66 * PX_PER_M; // 146.4
  const bw = 1.50 * PX_PER_M; // 60
  const tw = 0.34 * PX_PER_M; // 13.6
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <path
        d={`M${-bw / 2} 0 L${-bw / 2} -14 L${-tw / 2 - 5} -26 L${-tw / 2} ${-h} L${tw / 2} ${-h} L${tw / 2 + 5} -26 L${bw / 2} -14 L${bw / 2} 0 Z`}
        fill={PAL2D.concreteMid}
        stroke={PAL2D.ink}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      <rect x={-tw / 2 + 2} y={-h + 3} width={4} height={h - 28} fill={PAL2D.concreteHi} opacity={0.75} />
      <path d={`M-3 ${-h} C-3 ${-h - 8} 3 ${-h - 8} 3 ${-h}`} fill="none" stroke={PAL2D.concreteLo} strokeWidth={2.2} />
    </g>
  );
};

/** Hình chiếu bằng oanh tạc cơ siêu thanh B-1B Lancer (dài 44.5 m, cánh cụp xòe theo wingSweep 0..1). */
export const B1BPlan2D: React.FC<{
  x?: number;
  y?: number;
  rot?: number;
  scale?: number;
  wingSweep?: number;
}> = ({ x = 0, y = 0, rot = 0, scale = 1, wingSweep = 0.85 }) => {
  // Quy ước: thân dài 120 px (-60..+60) ở scale=1 cho gọn trên bản đồ chiến lược
  const tipX = -4 - wingSweep * 34;
  const tipY = 54 - wingSweep * 23;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      {/* Cánh biến hình trái & phải */}
      <path
        d={`M12 -10 L${tipX} ${-tipY} L${tipX - 10} ${-tipY + 3} L-18 -11 Z`}
        fill={PAL2D.usMid}
        stroke={PAL2D.ink}
        strokeWidth={2.4}
      />
      <path
        d={`M12 10 L${tipX} ${tipY} L${tipX - 10} ${tipY - 3} L-18 11 Z`}
        fill={PAL2D.usLo}
        stroke={PAL2D.ink}
        strokeWidth={2.4}
      />
      {/* Đuôi ngang chữ thập */}
      <path d="M-40 -5 L-56 -22 L-61 -20 L-52 -4 Z" fill={PAL2D.usMid} stroke={PAL2D.ink} strokeWidth={2} />
      <path d="M-40 5 L-56 22 L-61 20 L-52 4 Z" fill={PAL2D.usLo} stroke={PAL2D.ink} strokeWidth={2} />
      {/* Thân cổ thiên nga liền gốc cánh */}
      <path
        d="M-60 -4 L-20 -11 L14 -10 L42 -5 C52 -4 58 -2 62 0 C58 2 52 4 42 5 L14 10 L-20 11 L-60 4 Z"
        fill={PAL2D.usHi}
        stroke={PAL2D.ink}
        strokeWidth={2.4}
      />
      {/* Kính buồng lái */}
      <path d="M40 -3 L48 -1.5 L48 1.5 L40 3 Z" fill={PAL2D.basaltDark} />
    </g>
  );
};
