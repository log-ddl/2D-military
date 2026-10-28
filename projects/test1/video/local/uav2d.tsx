// Bộ hình vẽ 2D dùng chung chuẩn tỉ lệ thật cho MQ-9 Reaper và kho vũ khí (đổ khối 3 tông + viền sắc nét).
import React from 'react';
import { P } from './palette';

/**
 * Hình chiếu cạnh MQ-9 Reaper (mũi hướng +X sang phải, tâm ở giữa thân, dài ~440 px ứng với 11.0 m -> 40 px/m).
 */
export const MQ9Side2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  propPhase?: number;
  showWeapons?: boolean;
  flip?: boolean;
}> = ({ x = 0, y = 0, scale = 1, rot = 0, propPhase = 0, showWeapons = true, flip = false }) => {
  const bladeH = 26 + 18 * Math.abs(Math.sin(propPhase));
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${flip ? -scale : scale} ${scale})`}>
      {/* Vây đuôi dưới (ventral fin) */}
      <polygon
        points="-172,6 -208,6 -196,44 -176,38"
        fill={P.uavDark}
        stroke={P.ink}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      {/* Cánh đuôi chữ V hướng lên (nhìn nghiêng chồng lớp xa & gần) */}
      <polygon
        points="-165,-6 -204,-72 -220,-68 -192,-4"
        fill={P.uavDark}
        stroke={P.ink}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <polygon
        points="-156,-4 -196,-78 -215,-74 -184,-2"
        fill={P.uavLight}
        stroke={P.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <line x1={-194} y1={-72} x2={-172} y2={-6} stroke={P.uavMid} strokeWidth={2} />

      {/* Hốc hút gió động cơ lưng TPE331 */}
      <path
        d="M -118,-12 L -132,-26 L -186,-22 L -196,-10 Z"
        fill={P.uavMid}
        stroke={P.ink}
        strokeWidth={2.4}
      />
      <rect x={-135} y={-25} width={7} height={11} rx={2} fill={P.ink} />

      {/* Thân chính có bướu mũi SATCOM đặc trưng của MQ-9 */}
      <path
        d="M 220,4
           C 218,-8 196,-16 168,-22
           C 138,-29 102,-30 70,-22
           L -122,-14
           L -204,-8
           L -208,4
           L -130,12
           L 118,15
           C 164,15 204,12 220,4 Z"
        fill={P.uavMid}
        stroke={P.ink}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      {/* Mảng sáng lưng & bướu SATCOM (tạo khối 3 tông) */}
      <path
        d="M 214,1 C 198,-10 164,-21 124,-25 C 96,-27 76,-21 56,-17 L -188,-8 L -120,-4 L 116,-2 C 162,-2 195,2 214,1 Z"
        fill={P.uavHighlight}
        opacity={0.85}
      />
      {/* Bụng tối */}
      <path
        d="M 196,8 C 166,13 130,14 96,14 L -132,11 L -202,4 L -125,5 L 122,6 Z"
        fill={P.uavDark}
        opacity={0.75}
      />
      {/* Đường ghép tấm vỏ */}
      <line x1={66} y1={-21} x2={66} y2={14} stroke={P.uavShadow} strokeWidth={1.6} />
      <line x1={-34} y1={-16} x2={-34} y2={12} stroke={P.uavShadow} strokeWidth={1.6} />
      <line x1={-122} y1={-13} x2={-122} y2={11} stroke={P.uavShadow} strokeWidth={1.6} />

      {/* Cầu quang điện tử AN/DAS-1 MTS-B dưới cằm */}
      <g transform="translate(136, 17)">
        <rect x={-9} y={-5} width={18} height={9} rx={2} fill={P.uavDark} stroke={P.ink} strokeWidth={2} />
        <circle cx={0} cy={10} r={13} fill={P.uavMid} stroke={P.ink} strokeWidth={2.4} />
        <path d="M -6,2 A 11,11 0 0 1 10,8" fill="none" stroke={P.uavHighlight} strokeWidth={2} />
        <ellipse cx={6} cy={11} rx={5.5} ry={6.5} fill={P.opticGlass} stroke={P.ink} strokeWidth={1.6} />
        <circle cx={7.5} cy={9} r={2} fill={P.laser} opacity={0.9} />
      </g>

      {/* Giá treo & Vũ khí dưới cánh (nhìn nghiêng) */}
      {showWeapons && (
        <g transform="translate(8, 12)">
          <polygon points="-14,-2 18,-2 12,13 -8,13" fill={P.uavDark} stroke={P.ink} strokeWidth={2} />
          <Munition2D kind="gbu12" x={2} y={18} scale={0.62} />
          <Munition2D kind="hellfire" x={14} y={29} scale={0.68} />
        </g>
      )}

      {/* Cánh chính vươn dài nhìn nghiêng (có độ vểnh nhẹ) */}
      <path
        d="M 42,2 L -18,5 L -54,-6 L 14,-8 Z"
        fill={P.uavHighlight}
        stroke={P.ink}
        strokeWidth={2.6}
        strokeLinejoin="round"
      />

      {/* Chóp spinner & Cánh quạt đẩy 3 lá phía đuôi */}
      <path d="M -208,-6 L -222,-2 L -222,2 L -208,6 Z" fill={P.uavDark} stroke={P.ink} strokeWidth={2.2} />
      <ellipse cx={-224} cy={0} rx={4.5} ry={48} fill={P.uavHighlight} opacity={0.22} />
      <ellipse cx={-224} cy={0} rx={3} ry={bladeH} fill={P.missileBody} stroke={P.ink} strokeWidth={1.6} />
      <circle cx={-224} cy={0} r={4} fill={P.gold} stroke={P.ink} strokeWidth={1.5} />
    </g>
  );
};

/**
 * Hình chiếu bằng nhìn thẳng từ trên xuống (Top-Down Orthographic) của MQ-9 Reaper.
 * Tỉ lệ chính xác: Sải cánh 20,12 m = 805 px (40 px/m), Chiều dài 11,0 m = 440 px (y từ -220 mũi tới +220 đuôi).
 * Mũi hướng lên trên (-Y).
 */
export const MQ9Top2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  highlightSpan?: number;
  highlightLoad?: number;
}> = ({ x = 0, y = 0, scale = 1, highlightLoad = 0 }) => {
  const halfSpan = 402.4; // 10.06 m * 40 px/m -> tổng sải cánh 804.8 px (20.12 m)
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* 6 điểm treo vũ khí dưới cánh (ẩn một phần dưới cánh) */}
      {[-1, 1].map((s) => (
        <g key={s} opacity={0.92}>
          {/* GBU-12 ở mấu trong (±2.1 m = ±84 px) */}
          <g transform={`translate(${s * 88} -8) rotate(-90) scale(0.55)`}>
            <Munition2D kind="gbu12" />
          </g>
          {/* Cụm đôi Hellfire ở mấu giữa (±3.6 m = ±144 px) */}
          <g transform={`translate(${s * 148} 2) rotate(-90) scale(0.58)`}>
            <Munition2D kind="hellfire" y={-10} />
            <Munition2D kind="hellfire" y={10} />
          </g>
          {highlightLoad > 0 && (
            <>
              <circle cx={s * 88} cy={-6} r={16} fill="none" stroke={P.gold} strokeWidth={2.5} opacity={highlightLoad} />
              <circle cx={s * 148} cy={4} r={18} fill="none" stroke={P.flirHot} strokeWidth={2.5} opacity={highlightLoad} />
            </>
          )}
        </g>
      ))}

      {/* Cánh chính tỉ lệ dài mảnh đặc trưng 20,12 m */}
      <polygon
        points={`
          -22,-36
          -${halfSpan},-8
          -${halfSpan},10
          -22,22
          22,22
          ${halfSpan},10
          ${halfSpan},-8
          22,-36
        `}
        fill={P.uavMid}
        stroke={P.ink}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      {/* Mép trước cánh sáng & đường cánh tà / aileron */}
      <polygon
        points={`-22,-36 -${halfSpan},-8 -${halfSpan},-1 -22,-18 22,-18 ${halfSpan},-1 ${halfSpan},-8 22,-36`}
        fill={P.uavHighlight}
        opacity={0.78}
      />
      <line x1={-385} y1={4} x2={-42} y2={14} stroke={P.uavShadow} strokeWidth={1.8} />
      <line x1={42} y1={14} x2={385} y2={4} stroke={P.uavShadow} strokeWidth={1.8} />

      {/* Đuôi chữ V nhìn từ trên (sải ngang ~4.4 m = 176 px) */}
      <polygon
        points="-12,154 -96,204 -92,216 -10,188 10,188 92,216 96,204 12,154"
        fill={P.uavMid}
        stroke={P.ink}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      <polygon
        points="-12,154 -96,204 -93,209 -12,168 12,168 93,209 96,204 12,154"
        fill={P.uavHighlight}
        opacity={0.7}
      />

      {/* Thân máy bay dài 11,0 m (-220 tới +220) */}
      <path
        d="M 0,-220
           C 15,-214 24,-176 25,-124
           L 22,30
           L 13,196
           L 0,212
           L -13,196
           L -22,30
           L -25,-124
           C -24,-176 -15,-214 0,-220 Z"
        fill={P.uavLight}
        stroke={P.ink}
        strokeWidth={3}
      />
      {/* Sống lưng thân & Bướu SATCOM */}
      <ellipse cx={0} cy={-142} rx={15} ry={54} fill={P.uavHighlight} stroke={P.uavMid} strokeWidth={1.6} />
      <rect x={-9} y={96} width={18} height={54} rx={6} fill={P.uavDark} stroke={P.ink} strokeWidth={1.8} />

      {/* Cánh quạt đẩy phía sau đuôi (+220) */}
      <rect x={-52} y={214} width={104} height={6} rx={3} fill={P.missileBody} stroke={P.ink} strokeWidth={1.8} />
      <circle cx={0} cy={216} r={6} fill={P.gold} stroke={P.ink} strokeWidth={2} />
    </g>
  );
};

/**
 * Hình vẽ 2D chi tiết các loại đạn/tên lửa của MQ-9 (mũi hướng +X sang phải).
 */
export const Munition2D: React.FC<{
  kind: 'hellfire' | 'gbu12' | 'griffin' | 'gbu38' | 'gbu39';
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
}> = ({ kind, x = 0, y = 0, scale = 1, rot = 0 }) => {
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${scale})`}>
      {kind === 'hellfire' && (
        <g>
          {/* AGM-114 Hellfire: thân đen than chì, đầu dò kính vòm, 4 cánh đuôi + vạch vàng */}
          <polygon points="-46,-14 -30,-6 -48,-6" fill={P.missileLight} stroke={P.ink} strokeWidth={1.8} />
          <polygon points="-46,14 -30,6 -48,6" fill={P.missileBody} stroke={P.ink} strokeWidth={1.8} />
          <path d="M -48,-6 L 34,-6 C 44,-6 50,-3 50,0 C 50,3 44,6 34,6 L -48,6 Z" fill={P.missileBody} stroke={P.ink} strokeWidth={2.2} />
          <rect x={-44} y={-4.5} width={76} height={3} fill={P.missileLight} opacity={0.75} />
          <rect x={14} y={-6} width={5} height={12} fill={P.gold} />
          <path d="M 38,-5.5 C 46,-5.5 51,-2.5 51,0 C 51,2.5 46,5.5 38,5.5 Z" fill={P.laser} opacity={0.75} stroke={P.ink} strokeWidth={1.5} />
        </g>
      )}
      {kind === 'gbu12' && (
        <g>
          {/* GBU-12 Paveway II: thân xanh ô-liu, đầu dò laser + cánh mũi canard, cụm cánh đuôi xòe */}
          <polygon points="-84,-20 -58,-8 -86,-8" fill={P.oliveLight} stroke={P.ink} strokeWidth={2} />
          <polygon points="-84,20 -58,8 -86,8" fill={P.oliveDark} stroke={P.ink} strokeWidth={2} />
          <path d="M -86,-7 L -52,-9 L 26,-9 C 46,-9 60,-4 68,-3 L 84,-3 L 84,3 L 68,3 C 60,4 46,9 26,9 L -52,9 L -86,7 Z" fill={P.oliveMid} stroke={P.ink} strokeWidth={2.2} />
          <path d="M -50,-7 L 26,-7 C 42,-7 54,-4 62,-2 L -50,-2 Z" fill={P.oliveLight} opacity={0.75} />
          <rect x={18} y={-8.5} width={6} height={17} fill={P.gold} />
          {/* Cánh canard dẫn đường Paveway phía mũi */}
          <polygon points="52,-4 66,-15 70,-4" fill={P.uavMid} stroke={P.ink} strokeWidth={1.8} />
          <polygon points="52,4 66,15 70,4" fill={P.uavDark} stroke={P.ink} strokeWidth={1.8} />
          <circle cx={85} cy={0} r={3.2} fill={P.laser} stroke={P.ink} strokeWidth={1.4} />
        </g>
      )}
      {kind === 'griffin' && (
        <g>
          {/* AGM-176 Griffin: tên lửa mini gọn nhẹ thân xám sáng + mũi bán chủ động */}
          <polygon points="-32,-11 -20,-5 -34,-5" fill={P.uavMid} stroke={P.ink} strokeWidth={1.8} />
          <polygon points="-32,11 -20,5 -34,5" fill={P.uavDark} stroke={P.ink} strokeWidth={1.8} />
          <path d="M -34,-5 L 24,-5 C 32,-5 36,-2 36,0 C 36,2 32,5 24,5 L -34,5 Z" fill={P.uavLight} stroke={P.ink} strokeWidth={2} />
          <rect x={8} y={-5} width={4} height={10} fill={P.flirHot} />
          <circle cx={34} cy={0} r={3.5} fill={P.opticGlass} stroke={P.ink} strokeWidth={1.4} />
        </g>
      )}
      {kind === 'gbu38' && (
        <g>
          {/* GBU-38 JDAM: thân bom Mk-82 ô-liu + ốp đuôi xám dẫn đường GPS JDAM + đai strake giữa thân */}
          <polygon points="-72,-16 -48,-8 -74,-8" fill={P.uavMid} stroke={P.ink} strokeWidth={2} />
          <polygon points="-72,16 -48,8 -74,8" fill={P.uavDark} stroke={P.ink} strokeWidth={2} />
          <path d="M -46,-9 L 28,-9 C 52,-9 68,-4 76,0 C 68,4 52,9 28,9 L -46,9 Z" fill={P.oliveMid} stroke={P.ink} strokeWidth={2.2} />
          <rect x={-74} y={-8} width={30} height={16} rx={2} fill={P.uavMid} stroke={P.ink} strokeWidth={2.2} />
          <rect x={-16} y={-11} width={34} height={3} rx={1} fill={P.uavLight} stroke={P.ink} strokeWidth={1.4} />
          <rect x={24} y={-8.5} width={6} height={17} fill={P.gold} />
        </g>
      )}
      {kind === 'gbu39' && (
        <g>
          {/* GBU-39 SDB: thân mảnh chóp nhọn + bệ cánh gấp Diamondback trên lưng */}
          <polygon points="-58,-12 -44,-5 -60,-5" fill={P.uavMid} stroke={P.ink} strokeWidth={1.8} />
          <polygon points="-58,12 -44,5 -60,5" fill={P.uavDark} stroke={P.ink} strokeWidth={1.8} />
          <path d="M -60,-5 L 36,-5 C 50,-5 60,-2 66,0 C 60,2 50,5 36,5 L -60,5 Z" fill={P.oliveLight} stroke={P.ink} strokeWidth={2} />
          {/* Cụm cánh Diamondback xếp trên lưng */}
          <rect x={-32} y={-9} width={62} height={4.5} rx={1.5} fill={P.uavHighlight} stroke={P.ink} strokeWidth={1.8} />
          <rect x={26} y={-5} width={5} height={10} fill={P.gold} />
        </g>
      )}
    </g>
  );
};
