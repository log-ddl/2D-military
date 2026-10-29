// S08 (147.55 – 172.62s, thuần 2D): Hồ sơ điều tra giải mật Lục quân AR 15-6 — khuyết C-RAM, khuyết Coyote, từ chối radar băng Ku KuRFS.
import React from 'react';
import { Easing } from 'remotion';
import { prog, lerp, bump } from '@kit/theme';
import { useT, handheld, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { TacticalGrid2D, Cram2D, Coyote2D, Kurfs2D } from '../local/draw2d';

/** Huy hiệu dấu hỏi hình học SVG (không dùng text font) đặt trên 3 bệ vũ khí ở câu hỏi mở đầu. */
const QuestionBadge2D: React.FC<{ x: number; y: number; op: number; pulse: number }> = ({ x, y, op, pulse }) => {
  if (op <= 0.01) return null;
  const r = 24 + pulse * 3;
  return (
    <g transform={`translate(${x} ${y})`} opacity={op}>
      <circle cx={0} cy={0} r={r + 5} fill="none" stroke={PAL2D.amberMid} strokeWidth={4} opacity={0.24} />
      <circle cx={0} cy={0} r={r} fill={PAL2D.bgConsole} stroke={PAL2D.amberHi} strokeWidth={2.8} />
      <path
        d="M-7 -7 C-7 -14 7 -14 7 -6 C7 -1 0 0 0 5"
        fill="none"
        stroke={PAL2D.amberHi}
        strokeWidth={3.6}
        strokeLinecap="round"
      />
      <circle cx={0} cy={12} r={2.4} fill={PAL2D.amberHi} />
    </g>
  );
};

/** Dấu gạch khuyết biên chế màu đỏ (vòng tròn + gạch chéo đanh thép) khi bóc trần ô trống rỗng. */
const MissingSlashStamp2D: React.FC<{ x: number; y: number; p: number }> = ({ x, y, p }) => {
  if (p <= 0.01) return null;
  const sc = lerp(1.45, 1.0, p);
  return (
    <g transform={`translate(${x} ${y}) scale(${sc})`} opacity={p}>
      <circle cx={0} cy={0} r={66} fill={PAL2D.threatLo} fillOpacity={0.18} />
      <circle cx={0} cy={0} r={62} fill="none" stroke={PAL2D.threatMid} strokeWidth={7.5} />
      <circle cx={0} cy={0} r={52} fill="none" stroke={PAL2D.threatHi} strokeWidth={1.8} strokeDasharray="8 6" />
      <line x1={-43} y1={43} x2={43} y2={-43} stroke={PAL2D.threatMid} strokeWidth={8.5} strokeLinecap="round" />
    </g>
  );
};

/** Con dấu mộc khung chữ nhật đỏ sập xuống (dùng cho dấu giải mật góc trang & dấu TỪ CHỐI ô KuRFS). */
const MilitaryRedStamp2D: React.FC<{
  x: number;
  y: number;
  w: number;
  h: number;
  rot: number;
  p: number;
  variant: 'declass' | 'denied';
}> = ({ x, y, w, h, rot, p, variant }) => {
  if (p <= 0.01) return null;
  const sc = lerp(1.65, 1.0, p);
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${sc})`} opacity={Math.min(1, p * 1.25)}>
      <rect
        x={-w / 2}
        y={-h / 2}
        width={w}
        height={h}
        rx={6}
        fill={PAL2D.threatLo}
        fillOpacity={variant === 'denied' ? 0.22 : 0.12}
        stroke={PAL2D.threatMid}
        strokeWidth={variant === 'denied' ? 6.5 : 4.5}
      />
      <rect
        x={-w / 2 + 8}
        y={-h / 2 + 8}
        width={w - 16}
        height={h - 16}
        rx={3}
        fill="none"
        stroke={PAL2D.threatMid}
        strokeWidth={2.2}
        strokeDasharray={variant === 'denied' ? '16 5' : '12 4'}
      />
      {variant === 'denied' ? (
        <g stroke={PAL2D.threatMid} strokeLinecap="round">
          <line x1={-28} y1={-24} x2={28} y2={24} strokeWidth={8} />
          <line x1={28} y1={-24} x2={-28} y2={24} strokeWidth={8} />
          <line x1={-w / 2 + 24} y1={-10} x2={-48} y2={-10} strokeWidth={5.5} />
          <line x1={-w / 2 + 24} y1={10} x2={-54} y2={10} strokeWidth={5.5} />
          <line x1={48} y1={-10} x2={w / 2 - 24} y2={-10} strokeWidth={5.5} />
          <line x1={54} y1={10} x2={w / 2 - 24} y2={10} strokeWidth={5.5} />
        </g>
      ) : (
        <g fill={PAL2D.threatMid}>
          <rect x={-w / 2 + 20} y={-14} width={w - 40} height={8} rx={2} />
          <rect x={-w / 2 + 34} y={4} width={w - 68} height={6} rx={2} opacity={0.82} />
        </g>
      )}
    </g>
  );
};

/** Ngôi sao 5 cánh phù hiệu Lục quân Mỹ in trên tiêu đề hồ sơ giấy kem. */
const ArmyStarEmblem2D: React.FC<{ x: number; y: number; r: number }> = ({ x, y, r }) => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.42;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${(Math.cos(a) * rad).toFixed(1)},${(Math.sin(a) * rad).toFixed(1)}`);
  }
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx={0} cy={0} r={r + 10} fill={PAL2D.ink} />
      <circle cx={0} cy={0} r={r + 6} fill="none" stroke={PAL2D.paper} strokeWidth={2} />
      <polygon points={pts.join(' ')} fill={PAL2D.paper} />
    </g>
  );
};

/** Sơ đồ 3 bệ vũ khí bảo vệ quanh căn cứ Tháp 22 ở đầu cảnh (147.55 – 154.5s) trước khi mở hồ sơ giải mật. */
const BasePerimeterIntro2D: React.FC<{ t: number; op: number }> = ({ t, op }) => {
  if (op <= 0.01) return null;
  const qP = prog(t, CUE.s08_question, CUE.s08_question + 0.9);
  const pulse = 0.5 + 0.5 * Math.sin(t * 6.2);
  const ringCol = qP > 0.4 ? PAL2D.amberMid : PAL2D.usMid;

  const pads = [
    { x: 475, y: 635, kind: 'cram' as const },
    { x: 960, y: 295, kind: 'coyote' as const },
    { x: 1445, y: 635, kind: 'kurfs' as const },
  ];

  return (
    <g opacity={op}>
      {/* Đường ranh giới biên giới Syria (Bắc) & Iraq (Đông) nét đứt đỏ cam trên mặt bàn chiến thuật */}
      <path
        d="M170 205 L1085 135 L1735 415 L1810 915"
        fill="none"
        stroke={PAL2D.threatMid}
        strokeWidth={3.4}
        strokeDasharray="18 10"
        opacity={0.68}
      />
      {/* Các mũi tên hướng đe dọa từ bên kia biên giới chĩa vào căn cứ */}
      {[
        { x0: 635, y0: 125, x1: 755, y1: 265 },
        { x0: 1395, y0: 198, x1: 1240, y1: 332 },
        { x0: 1755, y0: 540, x1: 1595, y1: 565 },
      ].map((ar, idx) => {
        const ang = (Math.atan2(ar.y1 - ar.y0, ar.x1 - ar.x0) * 180) / Math.PI;
        return (
          <g key={idx} opacity={0.7}>
            <line x1={ar.x0} y1={ar.y0} x2={ar.x1} y2={ar.y1} stroke={PAL2D.threatMid} strokeWidth={2.6} strokeDasharray="8 6" />
            <polygon
              points="0,0 -14,-6 -14,6"
              fill={PAL2D.threatMid}
              transform={`translate(${ar.x1} ${ar.y1}) rotate(${ang})`}
            />
          </g>
        );
      })}

      {/* Vòng đại cảnh chu vi kết nối 3 bệ phòng không */}
      <circle
        cx={960}
        cy={565}
        r={395}
        fill={PAL2D.usLo}
        fillOpacity={0.09}
        stroke={ringCol}
        strokeWidth={2.4}
        strokeDasharray="14 10"
        opacity={0.75}
      />

      {/* Mặt bằng công sự căn cứ Tháp 22 ở chính giữa bàn */}
      <g transform="translate(960 575)" filter="url(#sh)">
        <polygon
          points="-145,-88 0,-124 145,-88 166,62 0,112 -166,62"
          fill="#1b314d"
          stroke={PAL2D.sandMid}
          strokeWidth={4.2}
        />
        <polygon
          points="-126,-74 0,-104 126,-74 144,50 0,92 -144,50"
          fill="none"
          stroke={PAL2D.grid}
          strokeWidth={1.6}
          strokeDasharray="6 5"
        />
        {[-56, 0, 56].map((cx) =>
          [-28, 24].map((cy) => (
            <rect
              key={`${cx}_${cy}`}
              x={cx - 22}
              y={cy - 11}
              width={44}
              height={22}
              rx={2}
              fill={PAL2D.concreteMid}
              stroke={PAL2D.ink}
              strokeWidth={2}
            />
          )),
        )}
      </g>

      {/* 3 Bệ vũ khí tầm thấp giả định đặt cân đối quanh căn cứ */}
      {pads.map((p, idx) => (
        <g key={idx}>
          <line
            x1={960}
            y1={575}
            x2={p.x}
            y2={p.y - 45}
            stroke={ringCol}
            strokeWidth={2.2}
            strokeDasharray="7 6"
            opacity={0.58}
          />
          <circle
            cx={p.x}
            cy={p.y - 48}
            r={138}
            fill={PAL2D.bgSlate}
            fillOpacity={0.88}
            stroke={ringCol}
            strokeWidth={3.2}
          />
          <circle
            cx={p.x}
            cy={p.y - 48}
            r={120 + pulse * 5}
            fill="none"
            stroke={ringCol}
            strokeWidth={1.6}
            strokeDasharray="10 8"
            opacity={0.68}
          />

          <g filter="url(#sh)">
            {p.kind === 'cram' && <Cram2D x={p.x} y={p.y + 20} scale={1.24} />}
            {p.kind === 'coyote' && (
              <g transform={`translate(${p.x} ${p.y - 24})`}>
                <rect x={-48} y={24} width={96} height={16} rx={3} fill={PAL2D.sandMid} stroke={PAL2D.ink} strokeWidth={2.4} />
                <Coyote2D x={-8} y={-20} rot={-24} scale={1.62} flame={0.55} />
                <Coyote2D x={24} y={5} rot={-24} scale={1.36} flame={0} />
              </g>
            )}
            {p.kind === 'kurfs' && <Kurfs2D x={p.x} y={p.y + 26} scale={1.18} active />}
          </g>

          <QuestionBadge2D x={p.x + 94} y={p.y - 142} op={qP} pulse={pulse} />
        </g>
      ))}
    </g>
  );
};

const S08: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ mở bìa hồ sơ giải mật AR 15-6 (153.55 -> 154.65s)
  const dossierOpenP = prog(t, 153.55, 154.65, Easing.out(Easing.cubic));
  const arStampP = prog(t, CUE.s08_ar156, CUE.s08_ar156 + 0.24, Easing.out(Easing.cubic));

  // Tiến độ khuyết C-RAM (162.48s) và khuyết Coyote (164.04s)
  const cramGhost = t >= CUE.s08_no_cram;
  const cramSlashP = prog(t, CUE.s08_no_cram, CUE.s08_no_cram + 0.32, Easing.out(Easing.back(1.4)));
  const cramScanP = prog(t, CUE.s08_no_cram - 0.35, CUE.s08_no_cram + 0.35);

  const coyoteGhost = t >= CUE.s08_no_coyote;
  const coyoteSlashP = prog(t, CUE.s08_no_coyote, CUE.s08_no_coyote + 0.32, Easing.out(Easing.back(1.4)));
  const coyoteScanP = prog(t, CUE.s08_no_coyote - 0.35, CUE.s08_no_coyote + 0.35);

  // Tiến độ phiếu xin cấp KuRFS, mũi tên tiếp vận bị bẻ hướng & con dấu đỏ TỪ CHỐI (168.50s)
  const supplyReqP = prog(t, 165.1, 166.6);
  const supplyDivertP = prog(t, 166.7, 168.1, Easing.inOut(Easing.cubic));
  const kurfsDenied = t >= CUE.s08_kurfs_denied;
  const deniedStampP = prog(t, CUE.s08_kurfs_denied, CUE.s08_kurfs_denied + 0.26, Easing.out(Easing.back(1.5)));

  // Chuyển động Cam2D chuẩn xác 1:1 với viewBox="0 0 1920 1080" (tâm hồ sơ đúng tại 960, 540):
  const pIntroZoom = prog(t, 147.55, 153.4);
  const pToDossierFull = prog(t, 153.4, 154.7, Easing.inOut(Easing.cubic));
  const pToBay1 = prog(t, 158.35, 160.2, Easing.inOut(Easing.cubic));
  const pToBay2 = prog(t, 162.85, 163.85, Easing.inOut(Easing.cubic));
  const pToBay3 = prog(t, 164.95, 166.35, Easing.inOut(Easing.cubic));
  const pPullBack = prog(t, 170.2, 172.0, Easing.inOut(Easing.cubic));

  let camX = 960;
  let camY = 535;
  let camZoom = lerp(0.96, 1.03, pIntroZoom);

  camX = lerp(camX, 960, pToDossierFull);
  camY = lerp(camY, 535, pToDossierFull);
  camZoom = lerp(camZoom, 0.96, pToDossierFull);

  camX = lerp(camX, 640, pToBay1);
  camY = lerp(camY, 610, pToBay1);
  camZoom = lerp(camZoom, 1.34, pToBay1);

  camX = lerp(camX, 820, pToBay2);
  camY = lerp(camY, 610, pToBay2);
  camZoom = lerp(camZoom, 1.32, pToBay2);

  camX = lerp(camX, 1465, pToBay3);
  camY = lerp(camY, 595, pToBay3);
  camZoom = lerp(camZoom, 1.42, pToBay3);

  camX = lerp(camX, 960, pPullBack);
  camY = lerp(camY, 540, pPullBack);
  camZoom = lerp(camZoom, 0.96, pPullBack);

  const stampJolt =
    bump(t, CUE.s08_ar156, 0.28) * 7 +
    bump(t, CUE.s08_no_cram, 0.22) * 4 +
    bump(t, CUE.s08_no_coyote, 0.22) * 4 +
    bump(t, CUE.s08_kurfs_denied, 0.3) * 8;
  const baseShake = handheld(t, 1.8, 's08-cam');
  const shake: readonly [number, number] = [
    baseShake[0] + Math.sin(t * 48) * stampJolt * 0.45,
    baseShake[1] + stampJolt,
  ];

  const dossierSlideY = lerp(680, 0, dossierOpenP);

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgConsole}>
        <svg width={1920} height={1080} viewBox="0 0 1920 1080" style={{ overflow: 'visible' }}>
          <Defs2D />
          <defs>
            <radialGradient id="s08-desk" cx="50%" cy="50%" r="65%">
              <stop offset="0%" stopColor={PAL2D.bgSlate} />
              <stop offset="65%" stopColor={PAL2D.bgNight} />
              <stop offset="100%" stopColor="#070f1b" />
            </radialGradient>
          </defs>

          {/* 1. Mặt bàn điều hành & điều tra quân sự */}
          <rect x={-400} y={-280} width={2720} height={1640} fill="url(#s08-desk)" />
          <TacticalGrid2D x={-360} y={-240} w={2640} h={1560} step={80} major={320} opacity={0.25} />

          {/* Khung thước vạch kỹ thuật quanh mép bàn */}
          <rect
            x={72}
            y={52}
            width={1776}
            height={976}
            rx={10}
            fill="none"
            stroke={PAL2D.grid}
            strokeWidth={1.8}
            opacity={0.45}
          />

          {/* 2. Sơ đồ phòng thủ lý thuyết quanh căn cứ ở đầu cảnh */}
          <BasePerimeterIntro2D t={t} op={1 - dossierOpenP * 0.9} />

          {/* 3. Bìa & Tờ Hồ Sơ Điều Tra Giải Mật Lục Quân màu kem PAL2D.paper (tâm đúng 960, 540) */}
          {dossierOpenP > 0.01 && (
            <g transform={`translate(0 ${dossierSlideY})`} opacity={Math.min(1, dossierOpenP * 1.35)}>
              {/* Lớp bìa Manila lót dưới tạo độ dày tập hồ sơ */}
              <g filter="url(#sh)">
                <path
                  d="M128 118 L510 118 L542 86 L855 86 L882 118 L1802 118 L1802 992 L128 992 Z"
                  fill={PAL2D.paperDim}
                  stroke={PAL2D.ink}
                  strokeWidth={3.2}
                />
                {/* Tờ hồ sơ chính màu kem PAL2D.paper (148..1772 -> tâm đúng x = 960) */}
                <rect
                  x={148}
                  y={108}
                  width={1624}
                  height={864}
                  rx={6}
                  fill={PAL2D.paper}
                  stroke={PAL2D.ink}
                  strokeWidth={3.2}
                />
              </g>

              {/* Gáy kẹp kim loại ở đỉnh tập hồ sơ */}
              <rect
                x={850}
                y={88}
                width={220}
                height={34}
                rx={5}
                fill={PAL2D.concreteMid}
                stroke={PAL2D.ink}
                strokeWidth={2.6}
              />
              <rect x={864} y={94} width={192} height={8} rx={2} fill={PAL2D.concreteHi} />
              <circle cx={882} cy={106} r={5} fill={PAL2D.basaltDark} />
              <circle cx={1038} cy={106} r={5} fill={PAL2D.basaltDark} />

              {/* Phần Tiêu Đề Hồ Sơ (y = 128..272) */}
              <ArmyStarEmblem2D x={232} y={192} r={34} />

              <g>
                <rect x={302} y={148} width={330} height={15} rx={2} fill={PAL2D.ink} />
                <rect x={648} y={148} width={185} height={15} rx={2} fill={PAL2D.ink} opacity={0.28} />
                <rect x={302} y={178} width={215} height={14} rx={1.5} fill={PAL2D.ink} opacity={0.86} />
                <rect x={530} y={178} width={140} height={14} rx={1.5} fill={PAL2D.concreteLo} opacity={0.45} />
                <rect x={684} y={178} width={250} height={14} rx={1.5} fill={PAL2D.ink} opacity={0.86} />

                <rect x={302} y={206} width={160} height={12} rx={1.5} fill={PAL2D.concreteLo} opacity={0.45} />
                <rect x={476} y={206} width={295} height={12} rx={1.5} fill={PAL2D.ink} opacity={0.86} />
                <rect x={786} y={206} width={190} height={12} rx={1.5} fill={PAL2D.concreteLo} opacity={0.45} />

                <line x1={188} y1={256} x2={1732} y2={256} stroke={PAL2D.ink} strokeWidth={3} />
                <line x1={188} y1={264} x2={1732} y2={264} stroke={PAL2D.ink} strokeWidth={1.4} />
              </g>

              {/* Con dấu giải mật đỏ đóng ở góc trên bên phải tờ hồ sơ lúc 154.76s */}
              <MilitaryRedStamp2D
                x={1525}
                y={188}
                w={290}
                h={74}
                rot={-6}
                p={arStampP}
                variant="declass"
              />

              {/* ========================================================================= */}
              {/* Ô 1 (BÊN TRÁI, x = 192..672): PHÁO PHÒNG KHÔNG XOAY 6 NÒNG C-RAM          */}
              {/* ========================================================================= */}
              <g>
                <rect
                  x={192}
                  y={292}
                  width={480}
                  height={636}
                  rx={8}
                  fill="#efe4d0"
                  stroke={cramGhost ? PAL2D.threatMid : PAL2D.ink}
                  strokeWidth={3}
                />
                <rect
                  x={212}
                  y={314}
                  width={440}
                  height={482}
                  rx={6}
                  fill={PAL2D.bgSlate}
                  stroke={PAL2D.ink}
                  strokeWidth={2.6}
                />
                <TacticalGrid2D x={216} y={318} w={432} h={474} step={48} major={144} opacity={0.28} />

                {!cramGhost && (
                  <path
                    d="M460 585 L622 415 A220 220 0 0 1 636 530 Z"
                    fill={PAL2D.amberMid}
                    opacity={0.18}
                  />
                )}

                <line x1={244} y1={686} x2={620} y2={686} stroke={PAL2D.grid} strokeWidth={2.4} />
                <Cram2D x={422} y={686} scale={1.72} ghost={cramGhost} />
                {/* Viền nét đứt sáng mảnh phụ trợ khi ghost để nhận rõ biên dạng Phalanx trên nền blueprint */}
                {cramGhost && (
                  <rect
                    x={336}
                    y={496}
                    width={176}
                    height={190}
                    rx={8}
                    fill="none"
                    stroke={PAL2D.muted}
                    strokeWidth={1.6}
                    strokeDasharray="8 6"
                    opacity={0.55}
                  />
                )}

                {cramScanP > 0 && cramScanP < 1 && (
                  <line
                    x1={216}
                    y1={lerp(320, 790, cramScanP)}
                    x2={648}
                    y2={lerp(320, 790, cramScanP)}
                    stroke={PAL2D.threatHi}
                    strokeWidth={4}
                  />
                )}

                <MissingSlashStamp2D x={432} y={550} p={cramSlashP} />

                <g transform="translate(216 820)">
                  <circle
                    cx={26}
                    cy={38}
                    r={14}
                    fill={cramGhost ? PAL2D.threatMid : PAL2D.ewTeal}
                    stroke={PAL2D.ink}
                    strokeWidth={2.4}
                  />
                  {[0, 1, 2, 3].map((slot) => (
                    <rect
                      key={slot}
                      x={64 + slot * 64}
                      y={18}
                      width={50}
                      height={40}
                      rx={4}
                      fill={cramGhost ? 'none' : PAL2D.usMid}
                      stroke={cramGhost ? PAL2D.threatMid : PAL2D.ink}
                      strokeWidth={2.4}
                      strokeDasharray={cramGhost ? '6 4' : undefined}
                    />
                  ))}
                  <rect x={340} y={24} width={86} height={11} rx={2} fill={PAL2D.ink} opacity={0.7} />
                  <rect x={340} y={43} width={60} height={9} rx={2} fill={PAL2D.ink} opacity={0.35} />
                </g>
              </g>

              {/* ========================================================================= */}
              {/* Ô 2 (Ở GIỮA, x = 720..1200): ĐẠN ĐÁNH CHẶN PHẢN LỰC COYOTE                */}
              {/* ========================================================================= */}
              <g>
                <rect
                  x={720}
                  y={292}
                  width={480}
                  height={636}
                  rx={8}
                  fill="#efe4d0"
                  stroke={coyoteGhost ? PAL2D.threatMid : PAL2D.ink}
                  strokeWidth={3}
                />
                <rect
                  x={740}
                  y={314}
                  width={440}
                  height={482}
                  rx={6}
                  fill={PAL2D.bgSlate}
                  stroke={PAL2D.ink}
                  strokeWidth={2.6}
                />
                <TacticalGrid2D x={744} y={318} w={432} h={474} step={48} major={144} opacity={0.28} />

                <line x1={772} y1={686} x2={1148} y2={686} stroke={PAL2D.grid} strokeWidth={2.4} />

                <g transform="translate(895 686)">
                  <rect
                    x={-58}
                    y={-22}
                    width={116}
                    height={22}
                    rx={3}
                    fill={PAL2D.sandMid}
                    fillOpacity={coyoteGhost ? 0.16 : 1}
                    stroke={coyoteGhost ? PAL2D.muted : PAL2D.ink}
                    strokeWidth={2.4}
                    strokeDasharray={coyoteGhost ? '7 5' : undefined}
                  />
                  <g transform="translate(0 -32) rotate(-26)">
                    <rect
                      x={-36}
                      y={-28}
                      width={86}
                      height={28}
                      rx={3}
                      fill={PAL2D.usLo}
                      fillOpacity={coyoteGhost ? 0.16 : 1}
                      stroke={coyoteGhost ? PAL2D.muted : PAL2D.ink}
                      strokeWidth={2.4}
                      strokeDasharray={coyoteGhost ? '7 5' : undefined}
                    />
                  </g>
                </g>

                {!coyoteGhost && (
                  <path
                    d="M925 620 Q975 545 1035 495"
                    fill="none"
                    stroke={PAL2D.amberHi}
                    strokeWidth={2.4}
                    strokeDasharray="8 6"
                    opacity={0.75}
                  />
                )}

                <Coyote2D
                  x={995}
                  y={490}
                  rot={-26}
                  scale={2.35}
                  flame={coyoteGhost ? 0 : 0.72}
                  ghost={coyoteGhost}
                />

                {coyoteScanP > 0 && coyoteScanP < 1 && (
                  <line
                    x1={744}
                    y1={lerp(320, 790, coyoteScanP)}
                    x2={1176}
                    y2={lerp(320, 790, coyoteScanP)}
                    stroke={PAL2D.threatHi}
                    strokeWidth={4}
                  />
                )}

                <MissingSlashStamp2D x={960} y={550} p={coyoteSlashP} />

                <g transform="translate(744 820)">
                  <circle
                    cx={26}
                    cy={38}
                    r={14}
                    fill={coyoteGhost ? PAL2D.threatMid : PAL2D.ewTeal}
                    stroke={PAL2D.ink}
                    strokeWidth={2.4}
                  />
                  {[0, 1, 2, 3].map((slot) => (
                    <rect
                      key={slot}
                      x={64 + slot * 64}
                      y={18}
                      width={50}
                      height={40}
                      rx={4}
                      fill={coyoteGhost ? 'none' : PAL2D.usMid}
                      stroke={coyoteGhost ? PAL2D.threatMid : PAL2D.ink}
                      strokeWidth={2.4}
                      strokeDasharray={coyoteGhost ? '6 4' : undefined}
                    />
                  ))}
                  <rect x={340} y={24} width={86} height={11} rx={2} fill={PAL2D.ink} opacity={0.7} />
                  <rect x={340} y={43} width={60} height={9} rx={2} fill={PAL2D.ink} opacity={0.35} />
                </g>
              </g>

              {/* ========================================================================= */}
              {/* Ô 3 (BÊN PHẢI, x = 1248..1728): ĐỀ XUẤT RADAR BĂNG Ku KuRFS BỊ TỪ CHỐI    */}
              {/* ========================================================================= */}
              <g>
                <rect
                  x={1248}
                  y={292}
                  width={480}
                  height={636}
                  rx={8}
                  fill="#efe4d0"
                  stroke={kurfsDenied ? PAL2D.threatMid : PAL2D.ink}
                  strokeWidth={3}
                />
                <rect
                  x={1268}
                  y={314}
                  width={440}
                  height={482}
                  rx={6}
                  fill={PAL2D.bgSlate}
                  stroke={PAL2D.ink}
                  strokeWidth={2.6}
                />
                <TacticalGrid2D x={1272} y={318} w={432} h={474} step={48} major={144} opacity={0.28} />

                {/* Sơ đồ Tuyến Cấp Phát Khí Tài ở nửa trên Ô 3 */}
                <g>
                  <rect
                    x={1286}
                    y={330}
                    width={404}
                    height={146}
                    rx={5}
                    fill={PAL2D.bgConsole}
                    fillOpacity={0.76}
                    stroke={PAL2D.grid}
                    strokeWidth={1.8}
                  />

                  <g transform="translate(1334 404)">
                    <polygon
                      points="-28,-12 0,-28 28,-12 28,26 -28,26"
                      fill={PAL2D.panel}
                      stroke={PAL2D.usHi}
                      strokeWidth={2.2}
                    />
                    {[0, 1, 2, 3].map((lv) => (
                      <rect
                        key={lv}
                        x={-18 + lv * 10}
                        y={2}
                        width={7}
                        height={16}
                        rx={1}
                        fill={lv === 0 ? PAL2D.amberMid : 'none'}
                        stroke={lv === 0 ? PAL2D.amberHi : PAL2D.threatMid}
                        strokeWidth={1.4}
                      />
                    ))}
                  </g>

                  <g transform="translate(1646 362)">
                    <circle cx={0} cy={0} r={18} fill={PAL2D.panel} stroke={PAL2D.amberHi} strokeWidth={2.2} />
                    <polygon points="0,-9 8,6 -8,6" fill={PAL2D.amberMid} />
                  </g>

                  <g transform="translate(1646 438)">
                    <polygon
                      points="-18,-11 0,-18 18,-11 20,9 0,16 -20,9"
                      fill={kurfsDenied ? 'none' : PAL2D.panel}
                      stroke={kurfsDenied ? PAL2D.threatMid : PAL2D.sandHi}
                      strokeWidth={2.2}
                      strokeDasharray={kurfsDenied ? '4 3' : undefined}
                    />
                  </g>

                  <path
                    d="M1370 404 L1485 404 L1555 438 L1616 438"
                    fill="none"
                    stroke={supplyDivertP > 0.3 ? PAL2D.muted : PAL2D.usHi}
                    strokeWidth={2.6}
                    strokeDasharray={supplyDivertP > 0.3 ? '6 6' : undefined}
                    opacity={supplyReqP > 0 ? lerp(0.88, 0.28, supplyDivertP) : 0.25}
                  />

                  {supplyDivertP > 0.01 && (
                    <g>
                      <path
                        d="M1370 404 L1485 404 L1545 362 L1616 362"
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={3.8}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        {...drawOn(280, supplyDivertP)}
                      />
                      {supplyDivertP > 0.85 && (
                        <polygon points="1624,362 1608,354 1608,370" fill={PAL2D.amberHi} />
                      )}
                      <circle cx={1485} cy={404} r={8} fill={PAL2D.threatMid} stroke={PAL2D.ink} strokeWidth={2} />
                    </g>
                  )}
                </g>

                {/* Tổ hợp Radar băng tần Ku KuRFS ở nửa dưới Ô 3 */}
                <line x1={1300} y1={734} x2={1676} y2={734} stroke={PAL2D.grid} strokeWidth={2.4} />

                {!kurfsDenied && (
                  <g opacity={0.55}>
                    {[42, 74, 106].map((rr, ri) => (
                      <path
                        key={rr}
                        d={`M${1425 - rr * 0.7} ${530 - rr * 0.55} A${rr} ${rr} 0 0 1 ${1425 + rr * 0.85} ${530 - rr * 0.35}`}
                        fill="none"
                        stroke={PAL2D.ewTeal}
                        strokeWidth={2.2 - ri * 0.4}
                      />
                    ))}
                  </g>
                )}

                <Kurfs2D x={1462} y={734} scale={1.58} ghost={kurfsDenied} active={!kurfsDenied} />
                <Coyote2D x={1595} y={625} rot={-32} scale={1.38} ghost={kurfsDenied} />
                {kurfsDenied && (
                  <rect
                    x={1372}
                    y={516}
                    width={194}
                    height={218}
                    rx={8}
                    fill="none"
                    stroke={PAL2D.muted}
                    strokeWidth={1.6}
                    strokeDasharray="8 6"
                    opacity={0.5}
                  />
                )}

                {/* Con dấu khung đỏ sập chéo xuống giữa Ô 3 lúc 168.50s (CUE.s08_kurfs_denied) */}
                <MilitaryRedStamp2D
                  x={1488}
                  y={605}
                  w={336}
                  h={106}
                  rot={-15}
                  p={deniedStampP}
                  variant="denied"
                />

                <g transform="translate(1272 820)">
                  <circle
                    cx={26}
                    cy={38}
                    r={14}
                    fill={kurfsDenied ? PAL2D.threatMid : PAL2D.amberMid}
                    stroke={PAL2D.ink}
                    strokeWidth={2.4}
                  />
                  <rect
                    x={62}
                    y={18}
                    width={248}
                    height={40}
                    rx={4}
                    fill={kurfsDenied ? PAL2D.threatLo : PAL2D.panel}
                    fillOpacity={kurfsDenied ? 0.25 : 0.85}
                    stroke={kurfsDenied ? PAL2D.threatMid : PAL2D.ink}
                    strokeWidth={2.4}
                  />
                  {kurfsDenied ? (
                    <line x1={78} y1={38} x2={294} y2={38} stroke={PAL2D.threatMid} strokeWidth={5} strokeLinecap="round" />
                  ) : (
                    <rect x={78} y={33} width={160} height={10} rx={2} fill={PAL2D.amberMid} />
                  )}
                  <rect x={332} y={24} width={92} height={11} rx={2} fill={PAL2D.ink} opacity={0.7} />
                  <rect x={332} y={43} width={64} height={9} rx={2} fill={PAL2D.ink} opacity={0.35} />
                </g>
              </g>
            </g>
          )}
        </svg>
      </Cam2D>

      {/* Tối đa 1 Label trên màn hình tại mọi thời điểm */}
      <Label
        t={t}
        text="AR 15-6"
        x={1200}
        y={192}
        from={CUE.s08_ar156}
        until={158.1}
        size={52}
        bg={PAL2D.threatMid}
        fg={PAL2D.paper}
      />
      <Label
        t={t}
        text="C-RAM · COYOTE"
        x={960}
        y={960}
        from={162.3}
        until={164.8}
        size={48}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />

      <Grain opacity={0.42} />
    </>
  );
};

export default S08;
