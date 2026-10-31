// Hình chiếu 2D dùng chung của M1A2 Abrams (quy đổi đồng bộ 1:1 từ kích thước thật: 100 px = 1.00 m).
// Thân dài 793 px (7.93 m), tổng dài cả pháo 977 px (9.77 m), rộng 366 px (3.66 m), cao nóc tháp 244 px (2.44 m).
// Tuyệt đối không chứa chữ/nhãn tự viết (chữ ở cảnh dùng <Label>).
import React from 'react';
import { Layer } from '@core/frame';
import type { Preview } from '@core/preview';
import { Defs2D } from '@skill/military/2d/look';
import { PAL } from '../design/palette';

export type AbramsSide2DProps = {
  x?: number;
  y?: number;
  scale?: number;
  camo?: 'desert' | 'woodland';
  gunElevDeg?: number;
  /** Độ võng nhiệt đầu nòng (px hướng xuống tại miệng nòng, phục vụ sơ đồ MRS bù cong nhiệt). */
  barrelDroopPx?: number;
  /** Bật chế độ X-quang thấy khoang lái nằm ngửa, gương GPS, khoá nòng M256, 36 đạn đuôi, 14 thanh xoắn & tuabin AGT1500. */
  xray?: boolean;
  flip?: boolean;
};

const ROAD_WHEELS_X = [-265, -178, -91, -4, 83, 170, 257];

export const AbramsSide2D: React.FC<AbramsSide2DProps> = ({
  x = 0,
  y = 0,
  scale = 1,
  camo = 'desert',
  gunElevDeg = 0,
  barrelDroopPx = 0,
  xray = false,
  flip = false,
}) => {
  const cLight = camo === 'desert' ? PAL.hullLight : PAL.woodLight;
  const cMid = camo === 'desert' ? PAL.hullMid : PAL.woodMid;
  const cDark = camo === 'desert' ? PAL.hullDark : PAL.woodDark;
  const bodyOpacity = xray ? 0.24 : 1;

  // Đầu nòng từ x=195..581 (dài 386 px) trong hệ toạ độ khớp mantlet (195, -196)
  const bLen = 386;
  const droop = barrelDroopPx;

  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      {/* Bóng gầm xe trên mặt đất */}
      <ellipse cx={-10} cy={4} rx={395} ry={14} fill="rgba(8,14,22,0.48)" />

      {/* Dải xích T-158 bao quanh bánh dẫn & bánh sao */}
      <path
        d="M -352 -46 L -310 -4 L 298 -4 L 354 -52 L 344 -86 L -344 -86 Z"
        fill="#262b33"
        stroke={PAL.ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      <path
        d="M -338 -46 L -304 -13 L 292 -13 L 340 -52 L 332 -76 L -332 -76 Z"
        fill="#39414d"
        stroke="#1b2026"
        strokeWidth={2}
      />

      {/* Bánh sao chủ động sau (-332, -48) & bánh dẫn hướng trước (330, -52) */}
      <g transform="translate(-332 -48)">
        <circle r={30} fill={cDark} stroke={PAL.ink} strokeWidth={3.5} />
        <circle r={17} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.5} />
        <circle r={7} fill={cLight} />
      </g>
      <g transform="translate(330 -52)">
        <circle r={27} fill={cDark} stroke={PAL.ink} strokeWidth={3.5} />
        <circle r={15} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={2.5} />
      </g>

      {/* 7 cặp bánh chịu nặng đôi (r = 31.5 px) */}
      {ROAD_WHEELS_X.map((wx, idx) => (
        <g key={idx} transform={`translate(${wx} -35.5)`}>
          <circle r={31.5} fill="#252930" stroke={PAL.ink} strokeWidth={3.2} />
          <circle r={21} fill={cMid} stroke={PAL.ink} strokeWidth={2.5} />
          <circle r={10} fill={cDark} stroke={PAL.ink} strokeWidth={2} />
          <circle r={4} fill={PAL.steelLight} />
        </g>
      ))}

      {/* Thân xe chính (793 px: -396 tới +397) */}
      <g opacity={bodyOpacity}>
        {/* Bụng dưới thân */}
        <path
          d="M -396 -86 L -374 -58 L 315 -58 L 397 -104 L 397 -122 L -396 -122 Z"
          fill={cDark}
          stroke={PAL.ink}
          strokeWidth={3.5}
          strokeLinejoin="round"
        />
        {/* Thân trên & mũi glacis nghiêng thoải */}
        <path
          d="M -396 -122 L -396 -152 L -170 -158 L 195 -154 L 397 -120 L 397 -104 L -396 -104 Z"
          fill={cMid}
          stroke={PAL.ink}
          strokeWidth={3.8}
          strokeLinejoin="round"
        />
        {/* Dải sáng vát mép trên glacis & sàn động cơ */}
        <path
          d="M -392 -150 L -170 -156 L 195 -152 L 390 -119 L 382 -112 L 192 -143 L -170 -146 L -392 -141 Z"
          fill={cLight}
        />
        {/* Vỉ xả đuôi tuabin 930°F & cửa gió sàn sau */}
        <rect x={-396} y={-146} width={16} height={34} fill="#222830" stroke={PAL.ink} strokeWidth={2.5} />
        {[-140, -132, -124, -116].map((gy) => (
          <line key={gy} x1={-395} y1={gy} x2={-381} y2={gy} stroke={PAL.amber} strokeWidth={2} opacity={0.65} />
        ))}
        {/* 7 tấm váy chắn đạn bên hông (side skirts) có bản lề */}
        {[-375, -278, -180, -82, 16, 114, 212].map((sx, i) => {
          const w = i === 6 ? 156 : 95;
          return (
            <g key={sx}>
              <path
                d={
                  i === 6
                    ? `M ${sx} -118 L ${sx + w} -106 L ${sx + w - 22} -66 L ${sx} -56 Z`
                    : `M ${sx} -118 L ${sx + w} -118 L ${sx + w} -56 L ${sx} -56 Z`
                }
                fill={i % 2 === 0 ? cMid : cLight}
                stroke={PAL.ink}
                strokeWidth={3}
                strokeLinejoin="round"
              />
              <rect x={sx + 10} y={-112} width={16} height={7} rx={2} fill={cDark} />
              <rect x={sx + w - 32} y={-112} width={16} height={7} rx={2} fill={cDark} />
            </g>
          );
        })}
        {/* Kính tiềm vọng người lái ở mũi */}
        <path d="M 205 -152 L 238 -152 L 246 -138 L 200 -138 Z" fill={cDark} stroke={PAL.ink} strokeWidth={2.5} />
        <rect x={224} y={-150} width={14} height={7} fill={PAL.cyan} />
      </g>

      {/* Cụm pháo M256 120mm (khớp xoay tại mantlet 195, -196) */}
      <g transform={`translate(195 -196) rotate(${-gunElevDeg})`}>
        {/* Nòng pháo: thẳng hoặc cong nhẹ khi mô phỏng giãn nở nhiệt mặt trời */}
        {Math.abs(droop) < 0.5 ? (
          <g>
            {/* Ống gốc & áo nhiệt */}
            <rect x={0} y={-12} width={162} height={24} fill={cMid} stroke={PAL.ink} strokeWidth={3.4} />
            <rect x={0} y={-12} width={162} height={8} fill={cLight} />
            {/* Bầu hút khói (bore evacuator) lệch tâm */}
            <rect x={158} y={-18} width={76} height={34} rx={7} fill={cLight} stroke={PAL.ink} strokeWidth={3.4} />
            <rect x={158} y={4} width={76} height={12} rx={4} fill={cDark} />
            {/* Đoạn nòng trước tới miệng pháo (x=386 → tổng toạ độ +581) */}
            <rect x={232} y={-9.5} width={154} height={19} fill={cMid} stroke={PAL.ink} strokeWidth={3.2} />
            <rect x={232} y={-9.5} width={154} height={6} fill={cLight} />
            {/* Đai miệng nòng & cảm biến gương đầu nòng MRS */}
            <rect x={374} y={-12} width={13} height={24} rx={2} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.5} />
            <path d="M 375 -12 L 375 -26 L 385 -26 L 385 -12 Z" fill={PAL.amber} stroke={PAL.ink} strokeWidth={2.2} />
          </g>
        ) : (
          <g>
            <path
              d={`M 0 -10 Q ${bLen * 0.55} ${-10 + droop * 0.25} ${bLen} ${-9 + droop} L ${bLen} ${9 + droop} Q ${bLen * 0.55} ${10 + droop * 0.25} 0 10 Z`}
              fill={cMid}
              stroke={PAL.ink}
              strokeWidth={3.4}
            />
            <rect
              x={158}
              y={-17 + droop * 0.22}
              width={74}
              height={32}
              rx={7}
              fill={cLight}
              stroke={PAL.ink}
              strokeWidth={3.2}
            />
            {/* Cảm biến gương MRS nghiêng theo đầu nòng bị võng */}
            <rect
              x={bLen - 11}
              y={-25 + droop}
              width={10}
              height={15}
              fill={PAL.amberHot}
              stroke={PAL.ink}
              strokeWidth={2.2}
            />
          </g>
        )}
      </g>

      {/* Vòng cổ tháp pháo nối kín thân xe và đáy tháp pháo */}
      <rect x={-118} y={-166} width={256} height={14} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.8} opacity={bodyOpacity} />

      {/* Tháp pháo đa diện Chobham (-288 tới +205, đỉnh nóc -244) */}
      <g opacity={bodyOpacity}>
        {/* Khối chính tháp pháo & khoang đạn đuôi bustle */}
        <path
          d="M -288 -174 L -288 -242 L -60 -244 L 96 -244 L 208 -204 L 195 -162 L -165 -160 L -265 -168 Z"
          fill={cMid}
          stroke={PAL.ink}
          strokeWidth={4}
          strokeLinejoin="round"
        />
        {/* Mảng sáng vát má trên Chobham */}
        <path d="M -284 -240 L 94 -242 L 202 -203 L 90 -216 L -284 -216 Z" fill={cLight} />
        {/* Mảng tối vát gầm khoang bustle & cằm má tháp */}
        <path d="M -286 -175 L -165 -162 L 193 -164 L 204 -196 L 94 -192 L -286 -192 Z" fill={cDark} />
        {/* 2 tấm xả nổ (blowout panels) gờ nổi trên nóc đuôi tháp */}
        <rect x={-268} y={-249} width={128} height={6} rx={2} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={2.2} />
        {/* Khung giỏ đồ sườn tháp & ống phóng đạn khói 6 nòng */}
        <rect x={-195} y={-228} width={145} height={42} rx={3} fill="none" stroke={PAL.ink} strokeWidth={2.8} />
        <line x1={-148} y1={-228} x2={-148} y2={-186} stroke={PAL.ink} strokeWidth={2.4} />
        <line x1={-98} y1={-228} x2={-98} y2={-186} stroke={PAL.ink} strokeWidth={2.4} />
        <path d="M 102 -208 L 136 -215 L 139 -195 L 105 -190 Z" fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.5} />

        {/* Hộp kính ngắm chính GPS ("doghouse") phía trước phải */}
        <path d="M 86 -244 L 132 -244 L 138 -266 L 86 -266 Z" fill={cLight} stroke={PAL.ink} strokeWidth={3} />
        <rect x={125} y={-262} width={10} height={14} fill={PAL.amber} stroke={PAL.ink} strokeWidth={2} />

        {/* Kính tiềm vọng nhiệt 360° CITV của trưởng xe */}
        <rect x={14} y={-276} width={34} height={32} rx={5} fill={cMid} stroke={PAL.ink} strokeWidth={3} />
        <rect x={34} y={-270} width={12} height={15} rx={2} fill={PAL.cyan} stroke={PAL.ink} strokeWidth={2} />

        {/* Trạm vũ khí điều khiển từ xa CROWS + đại liên .50 cal M2HB */}
        <g transform="translate(-42 -244)">
          <rect x={-18} y={-24} width={34} height={24} rx={4} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={2.8} />
          <rect x={-8} y={-42} width={38} height={14} rx={3} fill="#2a313b" stroke={PAL.ink} strokeWidth={2.6} />
          <line x1={30} y1={-36} x2={92} y2={-36} stroke={PAL.ink} strokeWidth={5.5} strokeLinecap="round" />
        </g>

        {/* Cần ăng-ten mảnh đuôi tháp */}
        <line x1={-274} y1={-242} x2={-284} y2={-330} stroke={PAL.ink} strokeWidth={2.4} strokeLinecap="round" />
      </g>

      {/* Lớp X-quang nội thất cơ khí (chỉ hiện khi xray = true) */}
      {xray && (
        <g>
          {/* 14 thanh xoắn dưới sàn */}
          {ROAD_WHEELS_X.map((wx, i) => (
            <circle key={i} cx={wx} cy={-74} r={5.5} fill={PAL.cyan} stroke={PAL.ink} strokeWidth={1.8} />
          ))}
          {/* Động cơ tuabin phản lực Honeywell AGT1500 & hộp số Allison ở đuôi */}
          <rect x={-372} y={-142} width={156} height={54} rx={8} fill={PAL.steelDark} stroke={PAL.amber} strokeWidth={3} />
          <circle cx={-305} cy={-115} r={19} fill="#1f2833" stroke={PAL.amberHot} strokeWidth={2.5} />
          <path d="M -392 -128 L -372 -122 L -372 -108 L -392 -102 Z" fill={PAL.crimson} opacity={0.85} />

          {/* Người lái nằm ngửa ở mũi xe + ghi-đông mô-tô T-bar */}
          <path
            d="M 155 -88 Q 210 -86 252 -118"
            fill="none"
            stroke={PAL.cyan}
            strokeWidth={10}
            strokeLinecap="round"
          />
          <circle cx={260} cy={-126} r={11} fill={PAL.cream} stroke={PAL.ink} strokeWidth={2.5} />
          <line x1={232} y1={-132} x2={215} y2={-112} stroke={PAL.amberHot} strokeWidth={4} strokeLinecap="round" />

          {/* Khoá nòng pháo M256 120mm & giỏ tháp pháo */}
          <rect x={-68} y={-158} width={178} height={74} rx={6} fill="rgba(21,35,52,0.72)" stroke={PAL.gridBright} strokeWidth={2.2} />
          <rect x={58} y={-212} width={125} height={34} rx={4} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={3} />
          {/* Pháo thủ + gương ổn định trong hộp GPS */}
          <path d="M 48 -102 L 58 -138 L 78 -132" fill="none" stroke={PAL.steelLight} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={62} cy={-150} r={10} fill={PAL.cream} stroke={PAL.ink} strokeWidth={2.4} />
          <line x1={102} y1={-262} x2={120} y2={-248} stroke={PAL.cyan} strokeWidth={4} strokeLinecap="round" />
          {/* Trưởng xe phía trên sau pháo thủ */}
          <path d="M -14 -138 L -6 -175 L 14 -168" fill="none" stroke={PAL.steelLight} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={-6} cy={-188} r={10} fill={PAL.cream} stroke={PAL.ink} strokeWidth={2.4} />
          {/* Lính nạp đạn + công tắc đầu gối */}
          <path d="M -68 -96 L -58 -124 L -48 -154 L -68 -172" fill="none" stroke={PAL.amberHot} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={-45} cy={-165} r={10} fill={PAL.cream} stroke={PAL.ink} strokeWidth={2.4} />
          <rect x={-82} y={-132} width={12} height={18} rx={3} fill={PAL.amber} stroke={PAL.ink} strokeWidth={1.8} />

          {/* Cửa chống nổ trượt & 36 viên đạn nổ mạnh ở đuôi tháp pháo */}
          <line x1={-116} y1={-240} x2={-116} y2={-172} stroke={PAL.amberHot} strokeWidth={6} />
          <rect x={-278} y={-236} width={154} height={58} rx={4} fill="rgba(255,66,66,0.22)" stroke={PAL.crimson} strokeWidth={2.5} />
          {[-260, -236, -212, -188, -164, -140].map((ax) =>
            [-224, -207, -190].map((ay) => (
              <circle key={`${ax}_${ay}`} cx={ax} cy={ay} r={6.2} fill={PAL.propellant} stroke={PAL.crimson} strokeWidth={1.6} />
            )),
          )}
        </g>
      )}
    </g>
  );
};

export const AbramsTop2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  turretDeg?: number;
  camo?: 'desert' | 'woodland';
  /** Tô vùng độ dày giáp: má trước Uranium siêu dày vs nóc tháp & sàn động cơ mỏng. */
  showArmorZones?: boolean;
}> = ({ x = 0, y = 0, scale = 1, turretDeg = 0, camo = 'desert', showArmorZones = false }) => {
  const cLight = camo === 'desert' ? PAL.hullLight : PAL.woodLight;
  const cMid = camo === 'desert' ? PAL.hullMid : PAL.woodMid;
  const cDark = camo === 'desert' ? PAL.hullDark : PAL.woodDark;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {/* Bóng đổ hình chiếu bằng */}
      <rect x={-404} y={-190} width={812} height={384} rx={18} fill="rgba(8,14,22,0.45)" />

      {/* Thân xe 793 x 366 px */}
      <path
        d="M -396 -183 L 352 -183 L 397 -146 L 397 146 L 352 183 L -396 183 Z"
        fill={cMid}
        stroke={PAL.ink}
        strokeWidth={4}
        strokeLinejoin="round"
      />
      {/* Hai dải váy chắn xích hai bên */}
      <rect x={-392} y={-181} width={748} height={54} fill={cDark} stroke={PAL.ink} strokeWidth={2.5} />
      <rect x={-392} y={127} width={748} height={54} fill={cDark} stroke={PAL.ink} strokeWidth={2.5} />

      {/* Sàn lưới động cơ tuabin phía sau */}
      <rect
        x={-380}
        y={-114}
        width={185}
        height={228}
        rx={6}
        fill={showArmorZones ? 'rgba(255,66,66,0.34)' : cDark}
        stroke={showArmorZones ? PAL.crimson : PAL.ink}
        strokeWidth={3}
      />
      {[-84, -44, -4, 36, 76].map((ly) => (
        <line key={ly} x1={-366} y1={ly} x2={-210} y2={ly} stroke={PAL.ink} strokeWidth={3} opacity={0.55} />
      ))}

      {/* Mũi giáp trước thân xe & nắp lái xe */}
      {showArmorZones && (
        <path d="M 250 -124 L 392 -124 L 392 124 L 250 124 Z" fill="rgba(41,227,212,0.32)" stroke={PAL.cyan} strokeWidth={3} />
      )}
      <circle cx={268} cy={0} r={24} fill={cLight} stroke={PAL.ink} strokeWidth={3} />

      {/* Cụm tháp pháo xoay */}
      <g transform={`rotate(${turretDeg})`}>
        {/* Pháo chính M256 120mm */}
        <rect x={165} y={-11} width={416} height={22} fill={cMid} stroke={PAL.ink} strokeWidth={3.5} />
        <rect x={338} y={-17} width={76} height={34} rx={7} fill={cLight} stroke={PAL.ink} strokeWidth={3.2} />
        <rect x={570} y={-14} width={12} height={28} rx={2} fill={PAL.amber} stroke={PAL.ink} strokeWidth={2.2} />

        {/* Mặt bằng tháp pháo đa giác */}
        <path
          d="M -288 -134 L 78 -144 L 204 -86 L 204 86 L 78 144 L -288 134 Z"
          fill={cLight}
          stroke={PAL.ink}
          strokeWidth={4}
          strokeLinejoin="round"
        />

        {/* Khi bật showArmorZones: má trước DU xanh-cyan siêu dày vs nóc mỏng đỏ */}
        {showArmorZones && (
          <>
            <path
              d="M 78 -142 L 202 -85 L 202 85 L 78 142 L 42 74 L 42 -74 Z"
              fill="rgba(41,227,212,0.45)"
              stroke={PAL.cyan}
              strokeWidth={3.5}
            />
            <rect
              x={-272}
              y={-112}
              width={304}
              height={224}
              rx={8}
              fill="rgba(255,66,66,0.32)"
              stroke={PAL.crimson}
              strokeWidth={3}
              strokeDasharray="12 8"
            />
          </>
        )}

        {/* 2 tấm xả nổ (blowout panels) ở đuôi nóc tháp */}
        <rect x={-268} y={-106} width={122} height={96} rx={5} fill={cMid} stroke={PAL.ink} strokeWidth={3} />
        <rect x={-268} y={10} width={122} height={96} rx={5} fill={cMid} stroke={PAL.ink} strokeWidth={3} />

        {/* Cửa trưởng xe (phải), cửa nạp đạn (trái), CITV & GPS */}
        <circle cx={-32} cy={62} r={34} fill={cDark} stroke={PAL.ink} strokeWidth={3} />
        <circle cx={-40} cy={-60} r={30} fill={cMid} stroke={PAL.ink} strokeWidth={3} />
        <circle cx={34} cy={-68} r={20} fill={PAL.cyan} stroke={PAL.ink} strokeWidth={3} />
        <rect x={88} y={48} width={44} height={34} rx={4} fill={PAL.amber} stroke={PAL.ink} strokeWidth={2.8} />
      </g>
    </g>
  );
};

export const Shell120Icon2D: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rotDeg?: number;
  kind?: 'm829a4' | 'm1147' | 'puck';
}> = ({ x = 0, y = 0, scale = 1, rotDeg = 0, kind = 'm829a4' }) => (
  <g transform={`translate(${x} ${y}) rotate(${rotDeg}) scale(${scale})`}>
    {/* Đế kim loại stub base puck */}
    <rect x={-160} y={-34} width={34} height={68} rx={4} fill={PAL.steelDark} stroke={PAL.ink} strokeWidth={3} />
    <rect x={-166} y={-38} width={10} height={76} rx={3} fill={PAL.steelMid} stroke={PAL.ink} strokeWidth={2.6} />
    {kind === 'm1147' && (
      <>
        <rect x={-148} y={-33} width={6} height={66} fill={PAL.amberHot} />
        <rect x={-136} y={-33} width={6} height={66} fill={PAL.amber} />
      </>
    )}
    {kind !== 'puck' && (
      <>
        {/* Vỏ thuốc phóng cứng tự cháy */}
        <path
          d="M -126 -30 L 42 -30 L 58 -22 L 58 22 L 42 30 L -126 30 Z"
          fill={PAL.propellant}
          stroke={PAL.ink}
          strokeWidth={3}
        />
        <rect x={-124} y={-27} width={164} height={14} fill="#f7ead0" />
        {kind === 'm829a4' ? (
          <>
            {/* Cổ sabot 3 cánh & mũi lao Uranium nghèo */}
            <path d="M 58 -21 L 122 -14 L 122 14 L 58 21 Z" fill="#2c333d" stroke={PAL.ink} strokeWidth={2.8} />
            <path d="M 58 -5 L 185 0 L 58 5 Z" fill={PAL.duPurple} stroke={PAL.ink} strokeWidth={2.2} />
          </>
        ) : (
          <path d="M 58 -22 L 154 -5 L 166 0 L 154 5 L 58 22 Z" fill={PAL.woodMid} stroke={PAL.ink} strokeWidth={3} />
        )}
      </>
    )}
  </g>
);

export const NatoUnitBadge2D: React.FC<{
  x: number;
  y: number;
  side: 'friendly' | 'hostile';
  scale?: number;
}> = ({ x, y, side, scale = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${scale})`}>
    {side === 'friendly' ? (
      <>
        <rect x={-44} y={-28} width={88} height={56} rx={6} fill="#1b5e9e" stroke={PAL.cream} strokeWidth={4} />
        <rect x={-26} y={-13} width={52} height={26} rx={13} fill="none" stroke={PAL.amberHot} strokeWidth={4} />
      </>
    ) : (
      <>
        <polygon points="0,-40 42,0 0,40 -42,0" fill={PAL.crimsonDeep} stroke={PAL.crimson} strokeWidth={4} />
        <rect x={-20} y={-10} width={40} height={20} rx={10} fill="none" stroke={PAL.cream} strokeWidth={3.5} />
      </>
    )}
  </g>
);

const Abrams2DPreview: React.FC<{ view: number }> = ({ view }) => (
  <Layer>
    <Defs2D />
    <rect width={1920} height={1080} fill={PAL.bg} />
    {view === 0 && <AbramsSide2D x={900} y={720} scale={1.45} camo="desert" />}
    {view === 1 && <AbramsSide2D x={900} y={720} scale={1.45} camo="desert" xray barrelDroopPx={14} />}
    {view === 2 && <AbramsTop2D x={880} y={540} scale={1.35} turretDeg={-12} showArmorZones />}
    {view === 3 && (
      <g>
        <Shell120Icon2D x={620} y={360} scale={1.6} kind="m829a4" />
        <Shell120Icon2D x={620} y={560} scale={1.6} kind="m1147" />
        <Shell120Icon2D x={620} y={740} scale={1.6} kind="puck" />
        <NatoUnitBadge2D x={1320} y={440} side="friendly" scale={1.6} />
        <NatoUnitBadge2D x={1320} y={640} side="hostile" scale={1.6} />
      </g>
    )}
  </Layer>
);

export const preview: Preview = { views: 4, C: Abrams2DPreview };
