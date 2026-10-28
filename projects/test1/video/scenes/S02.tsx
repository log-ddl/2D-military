import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog, rnd } from '@kit/theme';
import { Label, handheld, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { MQ9Side2D } from '../local/uav2d';

// Địa hình cao nguyên sa mạc nhiều lớp chiều sâu tính một lần ở cấp module
const MESA_FAR = skyline('s02-mesa-far', -450, 2450, 740, 84, 740, 1450);
const MESA_MID = skyline('s02-mesa-mid', -450, 2450, 792, 74, 530, 1450);
const CANYON_NEAR = skyline('s02-canyon-near', -450, 2450, 848, 56, 400, 1450);
const FORE_RIDGE = skyline('s02-fore-ridge', -450, 2450, 968, 34, 340, 1450);

// Sao tất định trên tầng quỹ đạo chàm sâu
const STARS = Array.from({ length: 48 }, (_, i) => ({
  x: -220 + rnd(i * 3 + 1) * 2360,
  y: -160 + rnd(i * 3 + 2) * 360,
  r: 0.9 + rnd(i * 3 + 3) * 1.8,
  a: 0.32 + rnd(i * 5 + 7) * 0.6,
}));

// Đá cuội & bụi sa mạc tiền cảnh để phần đất dưới căn cứ giàu chi tiết mỹ thuật
const DESERT_ROCKS = Array.from({ length: 18 }, (_, i) => ({
  x: -80 + i * 125 + rnd(i * 7 + 2) * 55,
  y: 942 + rnd(i * 7 + 4) * 95,
  w: 16 + rnd(i * 7 + 6) * 26,
  h: 7 + rnd(i * 7 + 8) * 11,
}));

/** Vệ tinh liên lạc quân sự SATCOM ở tầng quỹ đạo cao (2 cánh pin mặt trời ánh xanh-vàng + chảo phát sóng kép) */
const MilitarySatellite2D: React.FC<{ x: number; y: number; active: number; t: number }> = ({ x, y, active, t }) => {
  const pulse = 0.65 + 0.35 * Math.sin(t * 7);
  return (
    <g transform={`translate(${x} ${y}) rotate(-10)`} filter="url(#sh)">
      {/* Cánh pin mặt trời bên trái */}
      <g transform="translate(-54, -4)">
        <line x1={0} y1={4} x2={-194} y2={4} stroke={P.uavLight} strokeWidth={3.4} />
        {[0, 1, 2].map((k) => {
          const px = -190 + k * 60;
          return (
            <g key={k}>
              <rect x={px} y={-19} width={55} height={46} rx={2} fill="#173d63" stroke={P.gold} strokeWidth={2.1} />
              <rect x={px + 2} y={-17} width={51} height={15} fill="#255f94" opacity={0.88} />
              <line x1={px + 18} y1={-19} x2={px + 18} y2={27} stroke="#5393cc" strokeWidth={1.1} opacity={0.78} />
              <line x1={px + 37} y1={-19} x2={px + 37} y2={27} stroke="#5393cc" strokeWidth={1.1} opacity={0.78} />
              <line x1={px} y1={4} x2={px + 55} y2={4} stroke={P.gold} strokeWidth={1.2} opacity={0.85} />
            </g>
          );
        })}
      </g>

      {/* Cánh pin mặt trời bên phải */}
      <g transform="translate(54, -4)">
        <line x1={0} y1={4} x2={194} y2={4} stroke={P.uavLight} strokeWidth={3.4} />
        {[0, 1, 2].map((k) => {
          const px = 11 + k * 60;
          return (
            <g key={k}>
              <rect x={px} y={-19} width={55} height={46} rx={2} fill="#173d63" stroke={P.gold} strokeWidth={2.1} />
              <rect x={px + 2} y={-17} width={51} height={15} fill="#255f94" opacity={0.88} />
              <line x1={px + 18} y1={-19} x2={px + 18} y2={27} stroke="#5393cc" strokeWidth={1.1} opacity={0.78} />
              <line x1={px + 37} y1={-19} x2={px + 37} y2={27} stroke="#5393cc" strokeWidth={1.1} opacity={0.78} />
              <line x1={px} y1={4} x2={px + 55} y2={4} stroke={P.gold} strokeWidth={1.2} opacity={0.85} />
            </g>
          );
        })}
      </g>

      {/* Thân bus vệ tinh 3 tông + bọc lá nhiệt vàng MLI */}
      <polygon
        points="-50,-25 50,-25 56,19 -56,19"
        fill={P.uavDark}
        stroke={P.ink}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      <rect x={-46} y={-23} width={92} height={15} fill={P.uavLight} opacity={0.88} />
      <rect x={-29} y={-21} width={58} height={36} rx={3} fill="#d68b22" stroke={P.ink} strokeWidth={2.2} />
      <rect x={-27} y={-19} width={54} height={12} fill={P.gold} opacity={0.92} />
      <line x1={-10} y1={-21} x2={-10} y2={15} stroke="#7d4c0b" strokeWidth={1.6} />
      <line x1={10} y1={-21} x2={10} y2={15} stroke="#7d4c0b" strokeWidth={1.6} />

      {/* Chảo thu/phát trái hướng xuống Trạm GCS */}
      <g transform="translate(-32, 24) rotate(28)">
        <path d="M -22,-4 A 22,13 0 0 0 22,-4 Z" fill={P.uavHighlight} stroke={P.ink} strokeWidth={2.3} />
        <line x1={0} y1={6} x2={0} y2={19} stroke={P.uavLight} strokeWidth={2} />
        <circle cx={0} cy={20} r={3.8} fill={active > 0 ? P.gold : P.uavMid} stroke={P.ink} strokeWidth={1.5} />
      </g>

      {/* Chảo thu/phát phải hướng sang MQ-9 Reaper */}
      <g transform="translate(34, 24) rotate(-26)">
        <path d="M -22,-4 A 22,13 0 0 0 22,-4 Z" fill={P.uavHighlight} stroke={P.ink} strokeWidth={2.3} />
        <line x1={0} y1={6} x2={0} y2={19} stroke={P.uavLight} strokeWidth={2} />
        <circle cx={0} cy={20} r={3.8} fill={active > 0 ? P.laser : P.uavMid} stroke={P.ink} strokeWidth={1.5} />
      </g>

      <rect x={-9} y={19} width={18} height={11} rx={2} fill={P.uavMid} stroke={P.ink} strokeWidth={2} />
      {active > 0.05 && (
        <circle cx={0} cy={29} r={5.5 + 3 * pulse} fill={P.gold} opacity={active * 0.92} filter="url(#glow)" />
      )}
    </g>
  );
};

/**
 * Cột anten & Chảo thu phát sóng Ku-band SATCOM lớn hướng chuẩn góc +40° lên Vệ tinh.
 * Tâm khớp chảo tại (x + 4, y - 142); xoay +40° đưa đầu Feed Horn (0, -50) tới đúng (x + 36.1, y - 180.3).
 */
const KuBandGroundDish2D: React.FC<{ x: number; y: number; active: number; t: number }> = ({ x, y, active, t }) => {
  return (
    <g transform={`translate(${x} ${y})`} filter="url(#sh)">
      {/* Bệ bê tông cốt thép */}
      <polygon
        points="-46,0 46,0 38,-16 -38,-16"
        fill={P.uavMid}
        stroke={P.ink}
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <rect x={-36} y={-14} width={72} height={5} fill={P.uavHighlight} opacity={0.65} />

      {/* Tháp giàn thép chữ A đỡ chảo */}
      <polygon
        points="-22,-16 22,-16 11,-114 -11,-114"
        fill={P.uavDark}
        stroke={P.ink}
        strokeWidth={2.5}
        strokeLinejoin="round"
      />
      <line x1={-18} y1={-16} x2={12} y2={-65} stroke={P.uavLight} strokeWidth={2} />
      <line x1={18} y1={-16} x2={-12} y2={-65} stroke={P.uavLight} strokeWidth={2} />
      <line x1={-14} y1={-65} x2={10} y2={-112} stroke={P.uavLight} strokeWidth={2} />
      <line x1={14} y1={-65} x2={-10} y2={-112} stroke={P.uavLight} strokeWidth={2} />

      {/* Cụm mô-tơ xoay Azimuth/Elevation */}
      <circle cx={0} cy={-120} r={13} fill={P.oliveMid} stroke={P.ink} strokeWidth={2.4} />
      <rect x={-12} y={-139} width={22} height={18} rx={3} fill={P.uavMid} stroke={P.ink} strokeWidth={2.2} />

      {/* Lòng chảo Parabol xoay +40° hướng thẳng mặt chảo & cần Feed Horn về phía Vệ tinh (740, 160) */}
      <g transform="translate(4, -142) rotate(40)">
        <path d="M -62,0 C -54,36 54,36 62,0 Z" fill={P.sandMid} stroke={P.ink} strokeWidth={2.6} />
        <path d="M -56,0 C -44,21 44,21 56,0 Z" fill={P.sandLight} opacity={0.85} />
        <ellipse cx={0} cy={0} rx={62} ry={14} fill={P.uavHighlight} stroke={P.ink} strokeWidth={2.5} />
        <ellipse cx={0} cy={2} rx={52} ry={10} fill={P.uavLight} />
        {/* 3 thanh chống hội tụ đúng tâm đầu thu phát sóng Feed Horn (0, -50) */}
        <line x1={-42} y1={-2} x2={0} y2={-48} stroke={P.ink} strokeWidth={2.2} />
        <line x1={42} y1={-2} x2={0} y2={-48} stroke={P.ink} strokeWidth={2.2} />
        <line x1={0} y1={8} x2={0} y2={-48} stroke={P.uavDark} strokeWidth={2.2} />
        <circle
          cx={0}
          cy={-50}
          r={5.8}
          fill={active > 0.05 ? P.gold : P.flirHot}
          stroke={P.ink}
          strokeWidth={2}
        />

        {/* Sóng xung động RF Ku-band tỏa ra đồng tâm từ đúng đầu Feed Horn */}
        {active > 0.05 &&
          [0, 1, 2].map((w) => {
            const ph = (t * 1.85 + w / 3) % 1;
            const r = 12 + ph * 34;
            return (
              <path
                key={w}
                d={`M ${-r * 0.76},${-53 - r * 0.54} A ${r},${r} 0 0 1 ${r * 0.76},${-53 - r * 0.54}`}
                fill="none"
                stroke={P.gold}
                strokeWidth={2.4}
                opacity={active * (1 - ph) * 0.92}
              />
            );
          })}
      </g>
    </g>
  );
};

/**
 * Thành viên kíp lái ngồi trên ghế điều khiển chuyên dụng (góc 3/4 rõ nét, không bị bàn hay màn hình che).
 * Đỉnh đầu ở y = -84 (thấp hơn đáy dàn 6 màn hình ở y = -96 nên tách biệt hoàn toàn, sắc nét 100%).
 */
const CrewOperator2D: React.FC<{
  x: number;
  y: number;
  role: 'pilot' | 'sensor';
  lit: number;
  t: number;
}> = ({ x, y, role, lit, t }) => {
  const rimColor = role === 'pilot' ? '#4cc9ff' : P.flirHot;
  const stickTilt = role === 'pilot' ? Math.sin(t * 2.5) * 6 : Math.cos(t * 3.2) * 3.5;
  const suitMain = role === 'pilot' ? '#4a5c46' : '#3d5368';
  const suitRim = mix(suitMain, rimColor, 0.3 + 0.38 * lit);

  return (
    <g transform={`translate(${x} ${y})`}>
      {/* Bệ bàn console riêng trước mặt từng ghế + Cần lái HOTAS / Tay cầm cò vũ khí đặt trên mặt bàn */}
      <polygon
        points="14,-44 58,-44 62,-37 12,-37"
        fill="#2c3e54"
        stroke={P.ink}
        strokeWidth={1.7}
      />
      <rect x={18} y={-37} width={40} height={35} fill="#162436" stroke={P.ink} strokeWidth={1.6} />

      {/* Cần lái HOTAS (Sĩ quan chỉ huy) hoặc Tay điều khiển cảm biến & nút phóng đỏ (Kỹ thuật viên vũ khí) */}
      <g transform={`translate(39, -44) rotate(${stickTilt})`}>
        <rect x={-6} y={-3} width={12} height={4} rx={1.5} fill={P.uavDark} stroke={P.ink} strokeWidth={1.3} />
        <path d="M -2,-3 L 1,-19 L 7,-21 L 5,-3 Z" fill={P.missileBody} stroke={P.ink} strokeWidth={1.5} />
        <circle
          cx={5}
          cy={-20}
          r={2.5}
          fill={role === 'pilot' ? P.gold : P.danger}
          filter={lit > 0.6 ? 'url(#glow)' : undefined}
        />
      </g>
      {/* Cụm tay ga Throttle / Nút khóa mục tiêu phụ */}
      <rect x={21} y={-48} width={11} height={4.5} rx={1.5} fill={P.uavMid} stroke={P.ink} strokeWidth={1.3} />
      <circle cx={26} cy={-50} r={2.2} fill={role === 'pilot' ? P.laser : P.danger} opacity={0.5 + 0.5 * lit} />

      {/* Chân & Đùi người lái ngồi trên ghế */}
      <path
        d="M -4,-27 L 17,-27 L 22,-5 L 13,-5 L 10,-20 L -6,-20 Z"
        fill="#2d3947"
        stroke={P.ink}
        strokeWidth={1.6}
        strokeLinejoin="round"
      />

      {/* Thân áo bay quân sự + Ánh màn hình hắt sáng viền ngực */}
      <path
        d="M -13,-27 L -11,-60 C -10,-67 10,-67 12,-59 L 13,-27 Z"
        fill={suitMain}
        stroke={P.ink}
        strokeWidth={1.8}
      />
      <path
        d="M 1,-64 C 8,-64 11,-59 12,-46 L 12,-28 L 3,-28 Z"
        fill={rimColor}
        opacity={0.22 + 0.38 * lit}
      />
      {/* Phù hiệu cầu vai */}
      <rect x={3} y={-57} width={6} height={4.2} rx={0.8} fill={role === 'pilot' ? P.gold : P.laser} />

      {/* Cánh tay vươn ra phía trước nắm chắc cần lái HOTAS (vẽ đè lên trước thân & bàn để tạo chiều sâu rõ nét) */}
      <path
        d="M 4,-53 L 20,-47 L 37,-54"
        fill="none"
        stroke={P.ink}
        strokeWidth={9.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 4,-53 L 20,-47 L 37,-54"
        fill="none"
        stroke={suitRim}
        strokeWidth={6.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={38} cy={-54} r={3.6} fill="#d7a982" stroke={P.ink} strokeWidth={1.4} />

      {/* Đầu, tai nghe liên lạc chiến thuật & cần micro (tâm ở y = -74, đỉnh đầu -85 -> thoáng hoàn toàn dưới màn hình) */}
      <g transform={`translate(1, -74) rotate(${Math.sin(t * 1.5 + (role === 'pilot' ? 0 : 2.1)) * 2.5})`}>
        <circle cx={0} cy={0} r={10} fill="#dba981" stroke={P.ink} strokeWidth={1.8} />
        <path d="M -10,1 C -10.5,-9.5 5,-12.5 9.5,-4.5 C 5,-5.5 -2,-4.5 -6.5,3 Z" fill="#222730" />
        {/* Ánh sáng màn hình phản chiếu lên khuôn mặt */}
        <path d="M 4,-7.5 A 9.5,9.5 0 0 1 6.5,7.5" fill="none" stroke={rimColor} strokeWidth={2.4} opacity={0.4 + 0.55 * lit} />
        {/* Tai nghe chụp đầu + micro cần */}
        <path d="M -2,-10.5 C 0.5,-12.5 4.5,-10 3.2,-1" fill="none" stroke={P.ink} strokeWidth={2.3} />
        <ellipse cx={1.2} cy={0} rx={3.8} ry={5.2} fill={P.uavLight} stroke={P.ink} strokeWidth={1.6} />
        <path d="M 3.5,2.2 Q 10,5.2 13.5,3" fill="none" stroke={P.ink} strokeWidth={1.6} />
        <circle cx={14} cy={3} r={1.7} fill={role === 'pilot' ? P.laser : P.gold} />
      </g>

      {/* Ghế điều khiển chuyên dụng lưng cao bọc đệm giáp */}
      <g>
        <rect x={-7} y={-19} width={7} height={15} fill={P.uavDark} stroke={P.ink} strokeWidth={1.5} />
        <path d="M -20,-2 L -3.5,-5 L 13,-2" fill="none" stroke={P.uavMid} strokeWidth={3.2} strokeLinecap="round" />
        <rect x={-18} y={-27} width={31} height={8.5} rx={3} fill={P.missileBody} stroke={P.ink} strokeWidth={1.8} />
        <path
          d="M -22,-23 L -18,-70 C -17,-76 -9,-76 -8,-70 L -10,-23 Z"
          fill={P.missileBody}
          stroke={P.ink}
          strokeWidth={1.8}
        />
        <rect x={-19.5} y={-81} width={10.5} height={10.5} rx={3} fill={P.uavDark} stroke={P.ink} strokeWidth={1.6} />
        <rect x={-13} y={-43} width={19} height={4.5} rx={2} fill={P.uavMid} stroke={P.ink} strokeWidth={1.4} />
      </g>
    </g>
  );
};

/** Container Trạm điều khiển mặt đất (GCS) 3 tông + Mặt cắt kỹ thuật lộ rõ 2 thành viên kíp lái & dàn 6 màn hình sáng rực */
const GCSContainer2D: React.FC<{
  x: number;
  y: number;
  cutaway: number;
  pilotLit: number;
  techLit: number;
  techLock: number;
  gcsActive: number;
  t: number;
}> = ({ x, y, cutaway, pilotLit, techLit, techLock, gcsActive, t }) => {
  // Kích thước container lớn sắc nét: rộng 468 px (0..468), cao 194 px (-194..0)
  const w = 468;
  const h = 194;
  const horizonTilt = Math.sin(t * 1.35) * 5.5;
  const lockBox = lerp(16, 7.5, Math.min(1, techLock));

  return (
    <g transform={`translate(${x} ${y})`} filter="url(#sh)">
      {/* Khung gầm thép chịu lực dưới đáy container */}
      <rect x={-8} y={-10} width={w + 16} height={10} rx={2} fill={P.uavShadow} stroke={P.ink} strokeWidth={2.4} />
      {[30, 130, 234, 338, 438].map((bx) => (
        <rect key={bx} x={bx - 13} y={-8} width={26} height={6} fill={P.uavMid} stroke={P.ink} strokeWidth={1.4} />
      ))}

      {/* Cụm điều hòa HVAC quân sự + Anten UHF & Đèn hiệu nóc container */}
      <g transform={`translate(28, ${-h})`}>
        <rect x={0} y={-28} width={98} height={28} rx={3} fill={P.sandMid} stroke={P.ink} strokeWidth={2.3} />
        <rect x={4} y={-25} width={90} height={8} fill={P.sandLight} opacity={0.82} />
        {[15, 31, 47, 63, 79].map((gx) => (
          <line key={gx} x1={gx} y1={-13} x2={gx} y2={-4} stroke={P.canyonDark} strokeWidth={2.4} />
        ))}
        <line x1={148} y1={0} x2={148} y2={-38} stroke={P.ink} strokeWidth={2.2} />
        <line x1={402} y1={0} x2={402} y2={-32} stroke={P.ink} strokeWidth={2.2} />
        <rect x={222} y={-12} width={16} height={12} rx={2} fill={P.uavDark} stroke={P.ink} strokeWidth={1.8} />
        <circle
          cx={230}
          cy={-15}
          r={5.2}
          fill={gcsActive > 0.1 ? P.gold : P.flirHot}
          filter={gcsActive > 0.1 ? 'url(#glow)' : undefined}
        />
      </g>

      {/* Khối hộp chính của Container GCS */}
      <rect x={0} y={-h} width={w} height={h - 10} rx={4} fill="#0a1322" stroke={P.ink} strokeWidth={2.8} />

      {/* ================= NỘI THẤT BUỒNG ĐIỀU KHIỂN GCS (MẶT CẮT KỸ THUẬT) ================= */}
      {cutaway > 0.01 && (
        <g opacity={Math.min(1, cutaway * 1.25)}>
          {/* Vách hậu chống nhiễu điện từ & Sàn kỹ thuật */}
          <rect x={11} y={-h + 11} width={w - 22} height={h - 30} fill="#0b1626" />
          <rect x={11} y={-32} width={w - 22} height={13} fill="#18283e" />
          {/* Vách ngăn kỹ thuật mảnh giữa 2 khoang trạm điều khiển */}
          <line x1={264} y1={-h + 16} x2={264} y2={-32} stroke="#1f3754" strokeWidth={2} />

          {/* Dải đèn LED trần buồng lái */}
          <rect x={92} y={-h + 14} width={156} height={3.5} rx={1.5} fill="#3aa6f5" opacity={0.55 + 0.4 * pilotLit} />
          <rect
            x={280}
            y={-h + 14}
            width={162}
            height={3.5}
            rx={1.5}
            fill={techLock > 0.2 ? P.flirHot : '#3aa6f5'}
            opacity={0.45 + 0.5 * techLit}
          />

          {/* Tủ rack máy chủ mã hóa đường truyền vệ tinh SATCOM bên trái (x = 18..74) */}
          <g transform="translate(18, -172)">
            <rect x={0} y={0} width={54} height={140} rx={2} fill="#132338" stroke={P.ink} strokeWidth={1.8} />
            {[0, 1, 2, 3, 4, 5].map((r) => (
              <g key={r} transform={`translate(5, ${8 + r * 21})`}>
                <rect x={0} y={0} width={44} height={15} rx={1.5} fill="#09111d" stroke="#284669" strokeWidth={1} />
                <circle cx={7} cy={7.5} r={2.1} fill={r % 2 === 0 ? P.laser : P.gold} />
                <circle cx={14} cy={7.5} r={2.1} fill={P.laser} opacity={0.75} />
                <rect x={22} y={5.5} width={16} height={4} fill="#294d75" />
              </g>
            ))}
          </g>

          {/* ---- DÀN 3 MÀN HÌNH GHẾ 1: SĨ QUAN CHỈ HUY / PHI CÔNG (x = 88..252, y = -170..-118) ---- */}
          <g transform="translate(88, -170)">
            <ellipse
              cx={82}
              cy={28}
              rx={86}
              ry={38}
              fill="#2ca8ff"
              opacity={0.14 + 0.25 * pilotLit}
              filter="url(#glow)"
            />

            {/* Màn hình 1A (Trái): Đồ thị sóng liên kết SATCOM & Dải tốc độ/trần bay */}
            <rect
              x={0}
              y={5}
              width={48}
              height={42}
              rx={2}
              fill="#071322"
              stroke={pilotLit > 0.3 ? '#4bc3ff' : '#2c4866'}
              strokeWidth={1.9}
            />
            <polyline
              points="4,33 12,24 19,29 28,15 36,21 44,12"
              fill="none"
              stroke={P.gold}
              strokeWidth={2}
              opacity={0.5 + 0.5 * pilotLit}
            />
            {[0, 1, 2, 3].map((b) => (
              <rect key={b} x={5 + b * 10.5} y={38} width={7.5} height={4.5} fill={P.laser} opacity={0.45 + 0.55 * pilotLit} />
            ))}

            {/* Màn hình 1B (Chính giữa - Lớn): HUD Chân trời nhân tạo */}
            <g transform="translate(52, 0)">
              <rect
                x={0}
                y={0}
                width={60}
                height={50}
                rx={2.5}
                fill="#091a2e"
                stroke={pilotLit > 0.3 ? P.laser : '#35587a'}
                strokeWidth={2.2}
              />
              <g transform="translate(30, 25)">
                <clipPath id="s02-hud-clip">
                  <rect x={-27} y={-22} width={54} height={44} rx={1.5} />
                </clipPath>
                <g clipPath="url(#s02-hud-clip)">
                  <g transform={`rotate(${horizonTilt})`}>
                    <rect x={-38} y={-34} width={76} height={34} fill="#1d5d94" opacity={0.55 + 0.42 * pilotLit} />
                    <rect x={-38} y={0} width={76} height={34} fill="#825632" opacity={0.55 + 0.42 * pilotLit} />
                    <line x1={-36} y1={0} x2={36} y2={0} stroke={P.laser} strokeWidth={1.7} />
                    <line x1={-13} y1={-9} x2={13} y2={-9} stroke={P.laser} strokeWidth={1.2} />
                    <line x1={-10} y1={9} x2={10} y2={9} stroke={P.laser} strokeWidth={1.2} />
                  </g>
                  <path d="M -12,0 L -4,0 L -2,3.5 M 12,0 L 4,0 L 2,3.5" fill="none" stroke={P.gold} strokeWidth={1.8} />
                  <circle cx={0} cy={0} r={2} fill={P.gold} />
                </g>
              </g>
            </g>

            {/* Màn hình 1C (Phải): Bản đồ chiến thuật quỹ đạo tuần tra */}
            <rect
              x={116}
              y={5}
              width={48}
              height={42}
              rx={2}
              fill="#081824"
              stroke={pilotLit > 0.3 ? '#4bc3ff' : '#2c4866'}
              strokeWidth={1.9}
            />
            <ellipse
              cx={140}
              cy={26}
              rx={17}
              ry={10}
              fill="none"
              stroke={P.laser}
              strokeWidth={1.6}
              strokeDasharray="4 3"
              opacity={0.5 + 0.5 * pilotLit}
            />
            <polygon points="149,20 157,25 149,28" fill={P.gold} />
            <circle cx={129} cy={29} r={2.4} fill={P.flirHot} />
          </g>

          {/* ---- DÀN 3 MÀN HÌNH GHẾ 2: KỸ THUẬT VIÊN CẢM BIẾN & VŨ KHÍ (x = 278..442, y = -170..-118) ---- */}
          <g transform="translate(278, -170)">
            <ellipse
              cx={82}
              cy={28}
              rx={88}
              ry={40}
              fill={techLock > 0.15 ? P.flirHot : '#28b899'}
              opacity={0.1 + 0.3 * techLit}
              filter="url(#glow)"
            />

            {/* Màn hình 2A (Trái): Quang phổ cảm biến MTS-B & Chiếu xạ Laser */}
            <rect
              x={0}
              y={5}
              width={48}
              height={42}
              rx={2}
              fill="#08191e"
              stroke={techLock > 0.2 ? P.laser : '#294c54'}
              strokeWidth={1.9}
            />
            {[0, 1, 2, 3, 4].map((k) => {
              const bh = 9 + ((k * 7 + Math.floor(t * 6)) % 22);
              return (
                <rect
                  key={k}
                  x={6 + k * 7.8}
                  y={42 - bh}
                  width={5}
                  height={bh}
                  fill={k === 3 && techLock > 0.3 ? P.danger : P.laser}
                  opacity={0.4 + 0.6 * techLit}
                />
              );
            })}

            {/* Màn hình 2B (Chính giữa - Lớn): Khung ngắm hồng ngoại FLIR khóa mục tiêu */}
            <g transform="translate(52, 0)">
              <rect
                x={0}
                y={0}
                width={60}
                height={50}
                rx={2.5}
                fill="#11131a"
                stroke={techLock > 0.2 ? P.danger : '#3a4a5e'}
                strokeWidth={2.3}
              />
              <ellipse cx={30} cy={25} rx={13} ry={8} fill={P.flirHot} opacity={0.32 + 0.5 * techLit} />
              <rect x={23} y={21} width={14} height={8} rx={1.5} fill={P.dawnGlow} opacity={0.55 + 0.45 * techLit} />
              <line x1={6} y1={25} x2={19} y2={25} stroke={techLock > 0.2 ? P.danger : P.laser} strokeWidth={1.4} />
              <line x1={41} y1={25} x2={54} y2={25} stroke={techLock > 0.2 ? P.danger : P.laser} strokeWidth={1.4} />
              <line x1={30} y1={5} x2={30} y2={15} stroke={techLock > 0.2 ? P.danger : P.laser} strokeWidth={1.4} />
              <line x1={30} y1={35} x2={30} y2={45} stroke={techLock > 0.2 ? P.danger : P.laser} strokeWidth={1.4} />
              <rect
                x={30 - lockBox}
                y={25 - lockBox * 0.78}
                width={lockBox * 2}
                height={lockBox * 1.56}
                fill="none"
                stroke={techLock > 0.2 ? P.danger : P.gold}
                strokeWidth={2}
              />
            </g>

            {/* Màn hình 2C (Phải): Trạng thái 6 giá treo vũ khí dưới cánh MQ-9 */}
            <rect
              x={116}
              y={5}
              width={48}
              height={42}
              rx={2}
              fill="#0c1522"
              stroke={techLock > 0.2 ? P.gold : '#2c4866'}
              strokeWidth={1.9}
            />
            <line x1={121} y1={22} x2={159} y2={22} stroke={P.uavLight} strokeWidth={2.4} />
            <line x1={140} y1={14} x2={140} y2={35} stroke={P.uavLight} strokeWidth={2.8} />
            {[-14, -7.5, 7.5, 14].map((dx, idx) => (
              <rect
                key={idx}
                x={138.7 + dx}
                y={24}
                width={2.8}
                height={9.5}
                fill={techLock > 0.2 ? P.danger : P.gold}
                opacity={0.5 + 0.5 * techLit}
              />
            ))}
          </g>

          {/* 2 GHẾ ĐIỀU KHIỂN CHUYÊN DỤNG & KÍP LÁI (Tách biệt hoàn toàn dưới dàn 6 màn hình) */}
          {/* Ghế 1: Sĩ quan chỉ huy / phi công cầm cần lái HOTAS (bật sáng 19.3s) */}
          <CrewOperator2D x={144} y={-19} role="pilot" lit={pilotLit} t={t} />
          {/* Ghế 2: Kỹ thuật viên cảm biến & vũ khí (bật sáng khóa mục tiêu 21.02s) */}
          <CrewOperator2D x={334} y={-19} role="sensor" lit={techLit} t={t} />
        </g>
      )}

      {/* ================= VÁCH NGOÀI CONTAINER GCS 3 TÔNG (TRƯỚC KHI MỞ CUTAWAY) ================= */}
      {cutaway < 0.99 && (
        <g opacity={1 - cutaway * 0.96}>
          <rect x={0} y={-h} width={w} height={h - 10} rx={4} fill={P.uavDark} stroke={P.ink} strokeWidth={2.8} />
          <rect x={3} y={-h + 3} width={w - 6} height={26} rx={2} fill={P.sandMid} opacity={0.88} />
          <rect x={12} y={-h + 28} width={w - 24} height={h - 56} fill={P.uavMid} stroke={P.ink} strokeWidth={2} />
          {Array.from({ length: 16 }, (_, i) => {
            const rx = 76 + i * 24;
            return (
              <g key={i}>
                <line x1={rx} y1={-h + 32} x2={rx} y2={-32} stroke={P.uavShadow} strokeWidth={2.4} />
                <line x1={rx + 3} y1={-h + 32} x2={rx + 3} y2={-32} stroke={P.uavLight} strokeWidth={1.6} />
              </g>
            );
          })}
          <rect x={22} y={-152} width={44} height={122} rx={2} fill={P.oliveMid} stroke={P.ink} strokeWidth={2.2} />
          <rect x={31} y={-138} width={26} height={20} rx={2} fill={P.opticGlass} stroke={P.ink} strokeWidth={1.8} />
          <rect x={57} y={-92} width={4} height={13} rx={1} fill={P.gold} />
          <rect x={78} y={-102} width={366} height={13} fill={P.oliveDark} opacity={0.85} />
          <rect x={78} y={-92} width={190} height={3.2} fill={P.gold} opacity={0.9} />
          {[
            [0, -h],
            [w - 16, -h],
            [0, -24],
            [w - 16, -24],
          ].map(([cx, cy], idx) => (
            <rect key={idx} x={cx} y={cy} width={16} height={14} fill={P.sandLight} stroke={P.ink} strokeWidth={2} />
          ))}
        </g>
      )}

      {/* Viền mặt cắt kỹ thuật (Cutaway Frame) kèm vạch cảnh báo vàng-đen */}
      {cutaway > 0.05 && (
        <g opacity={cutaway}>
          <path
            d={`M 0,${-h} L ${w},${-h} L ${w},-10 L 0,-10 Z M 11,${-h + 11} L 11,-19 L ${w - 11},-19 L ${w - 11},${-h + 11} Z`}
            fill={P.uavMid}
            fillRule="evenodd"
            stroke={P.ink}
            strokeWidth={2.2}
          />
          {Array.from({ length: 19 }, (_, i) => (
            <polygon
              key={i}
              points={`${16 + i * 24},-18 ${26 + i * 24},-18 ${21 + i * 24},-11 ${11 + i * 24},-11`}
              fill={i % 2 === 0 ? P.gold : P.ink}
            />
          ))}
        </g>
      )}
    </g>
  );
};

const S02: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ các sự kiện bám chuẩn mốc CUE
  const openPullback = prog(t, 10.65, 13.8); // Từ cận rộng phi cơ mở lùi ra toàn cảnh tổ hợp 3 tầng tại CUE.s02_system_open (11.98s)
  const sysOpen = prog(t, CUE.s02_system_open - 0.25, CUE.s02_system_open + 1.1);
  const uavScan = prog(t, CUE.s02_uav_node, CUE.s02_uav_node + 0.85);
  const gcsUplink = prog(t, CUE.s02_gcs_link, CUE.s02_gcs_link + 0.72);
  const satForward = prog(t, CUE.s02_sat_link, CUE.s02_sat_link + 0.68);
  const zoomIn = prog(t, CUE.s02_crew_zoom - 0.06, CUE.s02_crew_zoom + 1.02);
  const cutaway = prog(t, CUE.s02_crew_zoom, CUE.s02_crew_zoom + 0.7);
  const pilotLit = prog(t, CUE.s02_crew_zoom + 0.02, CUE.s02_crew_zoom + 0.55);
  const techFocus = prog(t, CUE.s02_tech_officer - 0.12, CUE.s02_tech_officer + 0.45);
  const techLit = 0.28 + 0.72 * techFocus;
  const lockFlash = bump(t, CUE.s02_tech_officer, 0.75);

  // Chuyển động Camera 2D có chủ đích xuyên suốt 3 nhịp:
  // (1) Mở cảnh từ phi cơ kéo lùi ra đại cảnh tổ hợp 3 tầng (10.88 -> 13.8s)
  // (2) Giữ toàn cảnh sắc nét cho tam giác dữ liệu GCS <-> SATCOM <-> MQ-9 (13.8 -> 19.2s)
  // (3) Đẩy zoom mượt ~2.36x vào mặt cắt buồng điều khiển GCS & dịch nhẹ sang Kỹ thuật viên vũ khí lúc 21.02s
  const wideX = lerp(995, 960, openPullback);
  const wideY = lerp(505, 535, openPullback);
  const wideZoom = lerp(1.07, 1.0, openPullback);

  const camX = lerp(wideX, 472, zoomIn) + techFocus * 46;
  const camY = lerp(wideY, 804, zoomIn);
  const camZoom = lerp(wideZoom, 2.36, zoomIn);
  const shake = handheld(t, lerp(2.1, 0.85, zoomIn), 's02-cam');

  // Tọa độ 3 nút mạng lưới tác chiến C4ISR
  const satX = 740 + Math.sin((t - 10.8) * 0.45) * 9;
  const satY = 158 + Math.cos((t - 10.8) * 0.6) * 4;

  const uavX = 1385 + Math.sin((t - 10.8) * 0.75) * 20;
  const uavY = 382 + Math.cos((t - 10.8) * 1.05) * 8;
  const uavRot = Math.sin((t - 10.8) * 0.75) * 1.6;

  // Chảo Ku-band mặt đất tại (176, 905) -> xoay +40° đưa tâm Feed Horn đúng tới (176 + 36.1, 905 - 180.3) = (212.1, 724.7)
  const dishX = 176;
  const dishY = 905;
  const dishFeedX = 212.1;
  const dishFeedY = 724.7;

  // Container GCS mặt đất (x = 256..724, y = 905)
  const gcsX = 256;
  const gcsY = 905;

  // Đầu mút chuẩn xác của các tia sóng xung động
  const satLeftFeed: [number, number] = [satX - 30, satY + 38];
  const satRightFeed: [number, number] = [satX + 36, satY + 34];
  const uavSatcomDome: [number, number] = [uavX + 94, uavY - 18];
  const uavMtsbBall: [number, number] = [uavX + 106, uavY + 21];
  const groundTarget: [number, number] = [1645, 886];

  const lenUplink = Math.hypot(satLeftFeed[0] - dishFeedX, satLeftFeed[1] - dishFeedY);
  const lenSatToUav = Math.hypot(uavSatcomDome[0] - satRightFeed[0], uavSatcomDome[1] - satRightFeed[1]);
  const lenGcsToUavGuide = Math.hypot(uavMtsbBall[0] - (gcsX + 448), uavMtsbBall[1] - (gcsY - 135));
  const lenScanRay = Math.hypot(groundTarget[0] - uavMtsbBall[0], groundTarget[1] - uavMtsbBall[1]);

  return (
    <AbsoluteFill>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.stratTop}>
        <svg
          width={2900}
          height={1800}
          viewBox="-450 -250 2900 1800"
          style={{ position: 'absolute', left: -450, top: -250, overflow: 'visible' }}
        >
          <Defs2D shadow="rgba(8, 14, 24, 0.45)" />
          <defs>
            <linearGradient id="s02-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#060e1a" />
              <stop offset="22%" stopColor={P.stratTop} />
              <stop offset="48%" stopColor={P.stratMid} />
              <stop offset="70%" stopColor={P.stratLow} />
              <stop offset="88%" stopColor={P.dawnHorizon} />
              <stop offset="100%" stopColor={P.dawnGlow} />
            </linearGradient>
            <radialGradient id="s02-dawn-sun" cx="0.72" cy="0.88" r="0.38">
              <stop offset="0%" stopColor="#ffe7b8" stopOpacity="0.74" />
              <stop offset="45%" stopColor={P.dawnHorizon} stopOpacity="0.28" />
              <stop offset="100%" stopColor={P.dawnHorizon} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="s02-scan-cone" x1="0" y1="0" x2="0.35" y2="1">
              <stop offset="0%" stopColor={P.laser} stopOpacity="0.44" />
              <stop offset="70%" stopColor={P.laser} stopOpacity="0.15" />
              <stop offset="100%" stopColor={P.laser} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* 1. NỀN TRỜI PHÂN TẦNG VŨ TRỤ - BÌNH LƯU - BÌNH MINH */}
          <rect x={-450} y={-250} width={2900} height={1120} fill="url(#s02-sky)" />
          <rect x={-450} y={-250} width={2900} height={1120} fill="url(#s02-dawn-sun)" />

          {STARS.map((s, idx) => (
            <circle
              key={idx}
              cx={s.x}
              cy={s.y}
              r={s.r}
              fill="#e9f2ff"
              opacity={s.a * (0.65 + 0.35 * Math.sin(t * 2.2 + idx))}
            />
          ))}

          {/* Vòng cung phân tầng Quỹ đạo & Tầng bình lưu */}
          <path
            d="M -380,295 Q 960,185 2300,305"
            fill="none"
            stroke={P.gridMajor}
            strokeWidth={1.7}
            strokeDasharray="10 8"
            opacity={0.3 + 0.4 * sysOpen}
          />
          <path
            d="M -380,535 Q 960,485 2300,540"
            fill="none"
            stroke={P.gridMinor}
            strokeWidth={1.4}
            strokeDasharray="6 10"
            opacity={0.25 + 0.3 * sysOpen}
          />

          {/* 2. ĐỊA HÌNH ĐỒI NÚI SA MẠC NHIỀU LỚP CHIỀU SÂU */}
          <path d={MESA_FAR} fill={mix(P.mesaOchre, P.dawnHorizon, 0.42)} />
          <path d={MESA_MID} fill={P.mesaOchre} />
          <path d={CANYON_NEAR} fill={P.canyonDark} />
          <rect x={-450} y={892} width={2900} height={560} fill="#4b2e1d" />
          <path d={FORE_RIDGE} fill={P.canyonDeep} />
          <path
            d="M -450,894 L 960,894 L 1080,918 L 2450,918 L 2450,890 L -450,890 Z"
            fill={P.sandMid}
            opacity={0.38}
          />
          {/* Đá tảng sa mạc tiền cảnh tạo chiều sâu chất liệu */}
          {DESERT_ROCKS.map((rk, idx) => (
            <ellipse
              key={idx}
              cx={rk.x}
              cy={rk.y}
              rx={rk.w}
              ry={rk.h}
              fill={idx % 2 === 0 ? '#5c3924' : '#331e12'}
              stroke={P.ink}
              strokeWidth={1.4}
              opacity={0.72}
            />
          ))}

          {/* Sân đỗ bê tông căn cứ quân sự đặt trạm GCS (x = 55..855, y = 905) */}
          <g>
            <polygon
              points="55,924 860,924 828,896 85,896"
              fill="#4b5461"
              stroke={P.ink}
              strokeWidth={2.4}
            />
            <line
              x1="92"
              y1="905"
              x2="820"
              y2="905"
              stroke={P.gold}
              strokeWidth={1.8}
              strokeDasharray="16 12"
              opacity={0.65}
            />
            {/* Đèn lề sân đỗ căn cứ */}
            {[110, 240, 740, 825].map((lx) => (
              <circle key={lx} cx={lx} cy={919} r={3} fill="#45b6ff" stroke={P.ink} strokeWidth={1.2} />
            ))}
            {/* Máy phát điện dã chiến bên phải Container GCS */}
            <g transform="translate(754, 905)" filter="url(#sh)">
              <rect x={0} y={-46} width={58} height={46} rx={3} fill={P.oliveMid} stroke={P.ink} strokeWidth={2.2} />
              <rect x={6} y={-38} width={22} height={18} fill={P.oliveDark} stroke={P.ink} strokeWidth={1.5} />
              <rect x={34} y={-38} width={16} height={28} fill={P.uavDark} stroke={P.ink} strokeWidth={1.5} />
              <path d="M 46,-46 L 46,-58 L 53,-62" fill="none" stroke={P.uavMid} strokeWidth={3} strokeLinecap="round" />
            </g>
            {/* Tuyến ống dẫn cáp quang nối Container GCS sang chân cột chảo Ku-band */}
            <path
              d={`M ${gcsX},888 L ${dishX + 20},888`}
              fill="none"
              stroke={gcsUplink > 0.05 ? P.gold : P.uavDark}
              strokeWidth={4.5}
            />
            <path
              d={`M ${gcsX},888 L ${dishX + 20},888`}
              fill="none"
              stroke={P.ink}
              strokeWidth={1.4}
              strokeDasharray="6 5"
            />
          </g>

          {/* Cụm mục tiêu mặt đất phía đông (x = 1645, y = 886) nhận chùm quét cảm biến từ MQ-9 */}
          <g transform={`translate(${groundTarget[0]} ${groundTarget[1]})`}>
            <polygon points="-28,6 28,6 22,-14 -20,-14" fill={P.sandMid} stroke={P.ink} strokeWidth={2} />
            <rect x={-12} y={-22} width={22} height={10} fill={P.canyonDark} stroke={P.ink} strokeWidth={1.8} />
            {uavScan > 0.1 && (
              <g opacity={uavScan}>
                <ellipse cx={0} cy={2} rx={44} ry={13} fill="none" stroke={P.laser} strokeWidth={2} strokeDasharray="7 5" />
                <circle cx={0} cy={-6} r={5} fill={P.flirHot} filter="url(#glow)" />
              </g>
            )}
          </g>

          {/* 3. TAM GIÁC MẠNG LƯỚI TÁC CHIẾN C4ISR (GCS <-> VỆ TINH SATCOM <-> MQ-9 REAPER) */}
          {/* Khung sơ đồ tam giác tổ hợp mở dần từ CUE.s02_system_open (11.98s) */}
          {sysOpen > 0.02 && (
            <g opacity={sysOpen * (1 - zoomIn * 0.65)}>
              <line
                x1={dishFeedX}
                y1={dishFeedY}
                x2={satLeftFeed[0]}
                y2={satLeftFeed[1]}
                stroke={P.gold}
                strokeWidth={2}
                strokeDasharray="7 8"
                opacity={0.42}
              />
              <line
                x1={satRightFeed[0]}
                y1={satRightFeed[1]}
                x2={uavSatcomDome[0]}
                y2={uavSatcomDome[1]}
                stroke={P.gold}
                strokeWidth={2}
                strokeDasharray="7 8"
                opacity={0.42}
              />
              {/* Vòng nhận diện 3 nút tổ hợp tác chiến */}
              <circle
                cx={satX}
                cy={satY + 4}
                r={76}
                fill="none"
                stroke={P.gold}
                strokeWidth={1.6}
                strokeDasharray="8 8"
                opacity={0.35 * sysOpen}
              />
              <path
                d={`M ${gcsX + 448},${gcsY - 135} L ${uavMtsbBall[0]},${uavMtsbBall[1]}`}
                fill="none"
                stroke={P.laserSoft}
                strokeWidth={2}
                opacity={0.45 + 0.45 * satForward}
                {...drawOn(lenGcsToUavGuide, Math.max(sysOpen * 0.5, satForward))}
              />
            </g>
          )}

          {/* Chùm quét cảm biến MTS-B từ MQ-9 xuống mặt đất (16.08s - CUE.s02_uav_node) */}
          {uavScan > 0.01 && (
            <g opacity={uavScan}>
              <polygon
                points={`${uavMtsbBall[0]},${uavMtsbBall[1]} ${groundTarget[0] - 58},${groundTarget[1]} ${groundTarget[0] + 54},${groundTarget[1]}`}
                fill="url(#s02-scan-cone)"
              />
              <line
                x1={uavMtsbBall[0]}
                y1={uavMtsbBall[1]}
                x2={groundTarget[0]}
                y2={groundTarget[1]}
                stroke={P.laser}
                strokeWidth={2.6}
                filter="url(#glow)"
                {...drawOn(lenScanRay, uavScan)}
              />
              {[0, 1, 2].map((k) => {
                const p = ((t * 0.95 + k / 3) % 1) * uavScan;
                const sx = lerp(uavMtsbBall[0], groundTarget[0], p);
                const sy = lerp(uavMtsbBall[1], groundTarget[1], p);
                const hw = 4 + p * 48;
                return (
                  <line
                    key={k}
                    x1={sx - hw}
                    y1={sy}
                    x2={sx + hw}
                    y2={sy}
                    stroke={P.laser}
                    strokeWidth={1.8}
                    opacity={(1 - p * 0.7) * 0.78}
                  />
                );
              })}
            </g>
          )}

          {/* Tia Uplink Ku-band xuất phát chính xác từ tâm Feed Horn chảo mặt đất lên Vệ tinh (17.34s - CUE.s02_gcs_link) */}
          {gcsUplink > 0.01 && (
            <g>
              <line
                x1={dishFeedX}
                y1={dishFeedY}
                x2={satLeftFeed[0]}
                y2={satLeftFeed[1]}
                stroke={P.gold}
                strokeWidth={3.8}
                filter="url(#glow)"
                {...drawOn(lenUplink, gcsUplink)}
              />
              <line
                x1={dishFeedX + 6}
                y1={dishFeedY + 4}
                x2={satLeftFeed[0] + 6}
                y2={satLeftFeed[1] + 4}
                stroke={P.laser}
                strokeWidth={2.2}
                opacity={0.82 * satForward}
                {...drawOn(lenUplink, satForward)}
              />
              {gcsUplink > 0.25 &&
                [0, 1, 2, 3].map((k) => {
                  const p = (t * 0.88 + k * 0.25) % 1;
                  if (p > gcsUplink) return null;
                  const px = lerp(dishFeedX, satLeftFeed[0], p);
                  const py = lerp(dishFeedY, satLeftFeed[1], p);
                  return (
                    <circle
                      key={k}
                      cx={px}
                      cy={py}
                      r={4.5}
                      fill="#fff3cf"
                      stroke={P.gold}
                      strokeWidth={2}
                      filter="url(#glow)"
                    />
                  );
                })}
            </g>
          )}

          {/* Tia Ku/Ka-band Vệ tinh <-> Bướu mũi SATCOM MQ-9 khép kín tam giác (18.36s - CUE.s02_sat_link) */}
          {satForward > 0.01 && (
            <g>
              <line
                x1={satRightFeed[0]}
                y1={satRightFeed[1]}
                x2={uavSatcomDome[0]}
                y2={uavSatcomDome[1]}
                stroke={P.gold}
                strokeWidth={3.6}
                filter="url(#glow)"
                {...drawOn(lenSatToUav, satForward)}
              />
              <line
                x1={satRightFeed[0] - 5}
                y1={satRightFeed[1] + 7}
                x2={uavSatcomDome[0] - 5}
                y2={uavSatcomDome[1] + 7}
                stroke={P.laser}
                strokeWidth={2.3}
                filter="url(#glow)"
                {...drawOn(lenSatToUav, satForward)}
              />
              {satForward > 0.25 &&
                [0, 1, 2, 3].map((k) => {
                  const p = (t * 0.95 + k * 0.25) % 1;
                  const px = lerp(satRightFeed[0], uavSatcomDome[0], p);
                  const py = lerp(satRightFeed[1], uavSatcomDome[1], p);
                  const rx = lerp(uavSatcomDome[0] - 5, satRightFeed[0] - 5, p);
                  const ry = lerp(uavSatcomDome[1] + 7, satRightFeed[1] + 7, p);
                  return (
                    <g key={k}>
                      <circle cx={px} cy={py} r={4.2} fill="#fff3cf" stroke={P.gold} strokeWidth={1.8} />
                      <circle cx={rx} cy={ry} r={3.6} fill="#d6fff2" stroke={P.laser} strokeWidth={1.6} />
                    </g>
                  );
                })}
            </g>
          )}

          {/* 4. BA NÚT KHÍ TÀI CHÍNH */}
          <MilitarySatellite2D x={satX} y={satY} active={Math.max(gcsUplink * 0.65, satForward)} t={t} />

          <g filter="url(#sh)">
            {uavScan > 0.05 && (
              <circle
                cx={uavX + 18}
                cy={uavY}
                r={195}
                fill="none"
                stroke={P.laser}
                strokeWidth={2}
                strokeDasharray="12 10"
                opacity={0.38 * uavScan}
              />
            )}
            <MQ9Side2D x={uavX} y={uavY} scale={0.78} rot={uavRot} propPhase={t * 28} showWeapons={true} />
          </g>

          <KuBandGroundDish2D x={dishX} y={dishY} active={gcsUplink} t={t} />
          <GCSContainer2D
            x={gcsX}
            y={gcsY}
            cutaway={cutaway}
            pilotLit={pilotLit}
            techLit={techLit}
            techLock={techFocus + lockFlash * 0.25}
            gcsActive={gcsUplink}
            t={t}
          />
        </svg>
      </Cam2D>

      <Grain opacity={0.42} />

      {/* Tối đa 1 nhãn duy nhất trên màn hình */}
      <Label
        t={t}
        text="GCS · SATCOM"
        x={530}
        y={465}
        from={17.34}
        until={19.15}
        size={48}
        bg={P.paper}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S02;
