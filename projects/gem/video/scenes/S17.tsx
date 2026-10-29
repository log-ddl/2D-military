import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog } from '@kit/theme';
import { handheld, Label, useT } from '@kit/motion';
import { Cam2D, Grain } from '@lib/2d/look';
import { Blast2D, Puff2D } from '@lib/2d/fx';
import { contours, skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { ChuSection2D, Shahed2D, TacticalGrid2D, TWallSection2D } from '../local/draw2d';

// Địa hình đồng mức & dải đồi nền tính 1 lần ở cấp module (khung 1920 × 2040 < 2048px tránh lỗi cắt tile GPU Chromium)
const BG_CONTOURS = contours('gem-s17-rukban', 1920, 2040, 8, 28, 540);
const SKY_FAR = skyline('gem-s17-far', 150, 1770, 372, 60, 500, 442);
const SKY_NEAR = skyline('gem-s17-near', 150, 1770, 402, 35, 340, 442);

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const starPoints = (cx: number, cy: number, rOut: number, rIn: number): string => {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOut : rIn;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(' ');
};

/** Mặt cắt rọ đất HESCO (1.10 × 2.13 m) đặt phía ngoài tường chữ T để đồng bộ cảnh S16. */
const HescoSection2D: React.FC<{ x: number; y: number; scale?: number }> = ({ x, y, scale = 1.46 }) => {
  const w = 1.1 * 40 * scale;
  const h = 2.13 * 40 * scale;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path
        d={`M${-w * 0.46} ${-h} Q0 ${-h - 14} ${w * 0.46} ${-h} Z`}
        fill={PAL2D.sandMid}
        stroke={PAL2D.ink}
        strokeWidth={2.2}
      />
      <rect
        x={-w / 2}
        y={-h}
        width={w}
        height={h}
        rx={4}
        fill={PAL2D.hescoHi}
        stroke={PAL2D.ink}
        strokeWidth={2.6}
      />
      <rect x={-w / 2 + 5} y={-h + 5} width={w - 10} height={h - 10} fill={PAL2D.hescoLo} opacity={0.42} />
      {[-0.75, -0.5, -0.25].map((fy, i) => (
        <line
          key={i}
          x1={-w / 2 + 3}
          y1={h * fy}
          x2={w / 2 - 3}
          y2={h * fy}
          stroke={PAL2D.basaltDark}
          strokeWidth={1.6}
          opacity={0.65}
        />
      ))}
    </g>
  );
};

// Danh sách 6 dãy nhà CHU mỗi bên trên mặt bằng hành lang dài (x từ 270..1650)
const PLAN_CHU_XS = [375, 609, 843, 1077, 1311, 1545];

// 22 tia mảnh văng tất định quét dọc ống dẫn hành lang (mặt bằng)
const SHRAPNEL_RAYS = Array.from({ length: 22 }, (_, i) => {
  const dir = i % 2 === 0 ? 1 : -1;
  const k = Math.floor(i / 2);
  const angle = ((k - 5) / 5.5) * 0.28;
  const speed = 0.82 + ((i * 7) % 5) * 0.06;
  const bounce = k % 3 === 0;
  return { dir, angle, speed, bounce };
});

const S17: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ==================== TIẾN ĐỘ VẬT LÝ SÓNG XUNG KÍCH (NỬA ĐẦU 327.22 - 339.6s) ====================
  const dtBlast = t - CUE.s17_blast_trap; // nổ lúc 328.20s
  const hasDetonated = dtBlast >= 0;

  // Sóng mở rộng ban đầu đập vào mặt trong tường bê tông chữ T (328.20 -> 331.50s)
  const outWaveP = prog(t, CUE.s17_blast_trap, CUE.s17_lock_gas);
  // Tường chữ T phản xạ dội ngược & khóa lối thoát khí (331.50 -> 334.60s)
  const reflWaveP = prog(t, CUE.s17_lock_gas, 334.6);
  const lockFlash = bump(t, CUE.s17_lock_gas, 1.6);
  // Ống dẫn sóng xung kích nén áp suất cực đại quét dọc hành lang (333.5 -> 339.0s)
  const channelP = prog(t, 333.5, 339.0);
  const overpressureFill = clamp01(prog(t, 331.3, 333.8) * (1 - prog(t, 339.1, 340.5)));

  // Mặt cắt ngang: container CC & Z bị xé toạc khi sóng phản xạ ép ngược vào
  const sectionBreached = t >= 332.0;

  // Khoảng cách mũi sóng xung kích quét dọc mặt bằng hành lang từ tâm x = 960 ra 2 đầu (tối đa 705 px)
  const frontDist = lerp(48, 705, channelP);

  // ==================== TIẾN ĐỘ BẢNG QUÂN SỐ 350 BINH SĨ (NỬA SAU 339.8 - 354.4s) ====================
  const panToGrid = prog(t, 339.35, 341.0);
  const camPushCorridor = prog(t, 333.8, 339.0) * (1 - panToGrid);

  const camX = 960;
  const camY = lerp(522 + camPushCorridor * 52, 1500, panToGrid);
  const camZoom = lerp(1.0 + camPushCorridor * 0.06, 1.0 + prog(t, 341.2, 354.2) * 0.03, panToGrid);

  // Rung máy cầm tay nhẹ + chấn động lúc quả đạn nổ trong khe hẹp (328.20s)
  const baseShake = handheld(t, 1.8, 's17-cam');
  const blastJolt = dtBlast >= 0 && dtBlast < 1.2 ? Math.exp(-dtBlast * 3.4) * 13 : 0;
  const shake: readonly [number, number] = [
    baseShake[0] + Math.sin(t * 52) * blastJolt,
    baseShake[1] + Math.cos(t * 61) * blastJolt * 0.8,
  ];

  // Tiến độ sóng quá áp trên lưới 350 quân nhân (25 cột × 14 hàng)
  const inj47P = prog(t, CUE.s17_inj47 - 0.45, CUE.s17_inj47 + 0.75);
  const inj108P = prog(t, CUE.s17_inj100, CUE.s17_inj100 + 2.35);
  const tbiPulse = t >= CUE.s17_tbi ? 0.5 + 0.5 * Math.sin((t - CUE.s17_tbi) * 5.2) : 0;

  // Tọa độ 350 vị trí quân nhân (25 × 14) tính sẵn trong khung y = 1136..1996
  const soldiers = useMemo(() => {
    const list: { idx: number; x: number; y: number }[] = [];
    for (let row = 0; row < 14; row++) {
      for (let col = 0; col < 25; col++) {
        const idx = row * 25 + col;
        const x = 264 + col * 58;
        const y = 1212 + row * 51;
        list.push({ idx, x, y });
      }
    }
    return list;
  }, []);

  // Thanh tỉ lệ trực quan dưới đáy bảng 350 quân nhân (thuần đồ họa kỹ thuật, không chữ thừa)
  const fallenRatio = (3 / 350) * prog(t, CUE.s17_fallen3, CUE.s17_fallen3 + 0.5);
  const injuredCountVisual = lerp(47 * inj47P, 105, inj108P);
  const injuredRatio = injuredCountVisual / 350;

  return (
    <AbsoluteFill>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <svg width={1920} height={2040} viewBox="0 0 1920 2040">
          <defs>
            <linearGradient id="s17-bg-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0a1524" />
              <stop offset="48%" stopColor="#132741" />
              <stop offset="100%" stopColor="#0b1728" />
            </linearGradient>
            <linearGradient id="s17-overpressure" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={PAL2D.threatMid} stopOpacity={0.78} />
              <stop offset="22%" stopColor={PAL2D.amberMid} stopOpacity={0.46} />
              <stop offset="50%" stopColor={PAL2D.threatLo} stopOpacity={0.62} />
              <stop offset="78%" stopColor={PAL2D.amberMid} stopOpacity={0.46} />
              <stop offset="100%" stopColor={PAL2D.threatMid} stopOpacity={0.78} />
            </linearGradient>
            <radialGradient id="s17-corridor-core" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PAL2D.amberHi} stopOpacity={0.85} />
              <stop offset="45%" stopColor={PAL2D.threatMid} stopOpacity={0.55} />
              <stop offset="100%" stopColor={PAL2D.threatLo} stopOpacity={0} />
            </radialGradient>
            <clipPath id="s17-upper-clip">
              <rect x={160} y={44} width={1600} height={446} rx={12} />
            </clipPath>
            <clipPath id="s17-plan-clip">
              <rect x={160} y={518} width={1600} height={486} rx={12} />
            </clipPath>
            <clipPath id="s17-grid-clip">
              <rect x={160} y={1134} width={1600} height={862} rx={14} />
            </clipPath>
          </defs>

          {/* Nền sâu hồ sơ kỹ thuật + đường đồng mức Rukban + lưới chiến thuật */}
          <rect x={0} y={0} width={1920} height={2040} fill="url(#s17-bg-grad)" />
          <g opacity={0.14}>
            {BG_CONTOURS.map((c) => (
              <path
                key={c.level}
                d={c.d}
                fill="none"
                stroke={c.level % 2 === 0 ? PAL2D.sandMid : PAL2D.grid}
                strokeWidth={c.level % 3 === 0 ? 1.5 : 0.9}
              />
            ))}
          </g>
          <TacticalGrid2D x={0} y={0} w={1920} h={2040} step={80} major={320} opacity={0.24} />

          {/* ======================================================================================== */}
          {/* TẦNG 1 (Y = 44..490): MẶT CẮT NGANG VẬT LÝ TƯỜNG CHỮ T (3.66M) KHÓA SÓNG NỔ KHE NHÀ CHU  */}
          {/* ======================================================================================== */}
          {/* Đổ bóng vector sắc nét (không dùng SVG feDropShadow trên khung 1600px để tránh lỗi tile GPU) */}
          <rect x={168} y={54} width={1600} height={446} rx={12} fill="#040a14" opacity={0.62} />
          <rect
            x={160}
            y={44}
            width={1600}
            height={446}
            rx={12}
            fill={PAL2D.bgConsole}
            stroke={PAL2D.grid}
            strokeWidth={2.5}
          />

          <g clipPath="url(#s17-upper-clip)">
            {/* Lớp đồi sa mạc đêm nhiều tầng tạo chiều sâu phía sau mặt cắt */}
            <path d={SKY_FAR} fill="#12263f" opacity={0.85} />
            <path d={SKY_NEAR} fill="#193252" opacity={0.9} />
            <TacticalGrid2D x={160} y={44} w={1600} h={392} step={40} major={160} opacity={0.18} />

            {/* Vùng khí áp suất cực đại bị khóa kín giữa hai bức tường chữ T (x = 478..1442) */}
            {overpressureFill > 0.01 && (
              <g opacity={overpressureFill}>
                <rect x={478} y={222} width={964} height={214} fill="url(#s17-overpressure)" />
                {/* Nắp khóa áp suất ngang đỉnh tường chữ T 3.66m không cho sóng thoát ra ngoài */}
                <line
                  x1={478}
                  y1={222}
                  x2={1442}
                  y2={222}
                  stroke={PAL2D.threatHi}
                  strokeWidth={3.5}
                  strokeDasharray="14 8"
                />
              </g>
            )}

            {/* Địa tầng sỏi cát & đá bazan Rukban dưới chân công trình (y = 436..490) */}
            <rect x={160} y={436} width={1600} height={20} fill={PAL2D.sandMid} />
            <rect x={160} y={456} width={1600} height={36} fill={PAL2D.basaltDark} />
            <line x1={160} y1={436} x2={1760} y2={436} stroke={PAL2D.sandHi} strokeWidth={3} />
            {Array.from({ length: 32 }, (_, i) => {
              const hx = 180 + i * 50;
              return (
                <line
                  key={`gh_${i}`}
                  x1={hx}
                  y1={438}
                  x2={hx - 20}
                  y2={486}
                  stroke={PAL2D.sandLo}
                  strokeWidth={1.6}
                  opacity={0.45}
                />
              );
            })}

            {/* Rọ đất HESCO bảo vệ vòng ngoài */}
            <HescoSection2D x={346} y={436} scale={1.46} />
            <HescoSection2D x={1574} y={436} scale={1.46} />

            {/* Hai bức tường bê tông chữ T cao 3.66 m (cao vượt nóc CHU 2.59 m!) */}
            <TWallSection2D x={468} y={436} scale={1.46} />
            <TWallSection2D x={1452} y={436} scale={1.46} />

            {/* Vệt chớp phản xạ trên mặt trong bê tông tường chữ T khi khóa lối thoát khí (331.50s) */}
            {(lockFlash > 0.01 || reflWaveP > 0) && (
              <g opacity={Math.max(lockFlash, overpressureFill * 0.85)}>
                <rect x={476} y={222} width={10} height={212} fill={PAL2D.amberHi} opacity={0.85} />
                <rect x={1434} y={222} width={10} height={212} fill={PAL2D.amberHi} opacity={0.85} />
                <rect x={472} y={220} width={22} height={214} fill={PAL2D.threatMid} opacity={0.35} />
                <rect x={1426} y={220} width={22} height={214} fill={PAL2D.threatMid} opacity={0.35} />
              </g>
            )}

            {/* Hai dãy nhà ngủ container CHU: CC (x = 700) và Z (x = 1220), cao 2.59 m */}
            <ChuSection2D x={700} y={436} scale={1.46} tag="CC" damaged={sectionBreached} />
            <ChuSection2D x={1220} y={436} scale={1.46} tag="Z" damaged={sectionBreached} />

            {/* Thước gióng trực quan chênh lệch độ cao T-Wall (3.66m) cao hơn nóc CHU (2.59m) */}
            <g opacity={0.8}>
              <line x1={482} y1={222} x2={690} y2={222} stroke={PAL2D.amberMid} strokeWidth={1.8} strokeDasharray="6 5" />
              <line x1={592} y1={222} x2={592} y2={285} stroke={PAL2D.amberHi} strokeWidth={2.4} />
              <polygon points="592,222 587,232 597,232" fill={PAL2D.amberHi} />
              <polygon points="592,285 587,275 597,275" fill={PAL2D.amberHi} />
            </g>

            {/* Giàn khung thép & mái hiên cứng nối giữa hai dãy CC và Z tại y = 282 */}
            {!hasDetonated ? (
              <g>
                <line x1={772} y1={284} x2={1148} y2={284} stroke={PAL2D.concreteHi} strokeWidth={5} />
                <path
                  d="M772 284 L835 266 L898 284 L960 264 L1022 284 L1085 266 L1148 284"
                  fill="none"
                  stroke={PAL2D.concreteMid}
                  strokeWidth={2.6}
                />
              </g>
            ) : (
              <g>
                <line x1={772} y1={284} x2={875} y2={308} stroke={PAL2D.basalt} strokeWidth={5} />
                <line x1={1148} y1={284} x2={1045} y2={310} stroke={PAL2D.basalt} strokeWidth={5} />
                <line x1={875} y1={308} x2={920} y2={338} stroke={PAL2D.threatMid} strokeWidth={3.5} />
                <line x1={1045} y1={310} x2={1002} y2={340} stroke={PAL2D.threatMid} strokeWidth={3.5} />
              </g>
            )}

            {/* Chiếc Shahed-136 lao xiên xuống giàn khung cứng ngay trước mốc nổ 328.20s */}
            {!hasDetonated && (
              <g>
                <line
                  x1={840}
                  y1={86}
                  x2={952}
                  y2={268}
                  stroke={PAL2D.threatMid}
                  strokeWidth={3.2}
                  strokeDasharray="10 7"
                  opacity={0.8}
                />
                <Shahed2D
                  x={lerp(856, 954, prog(t, 327.22, CUE.s17_blast_trap, (v) => v))}
                  y={lerp(116, 270, prog(t, 327.22, CUE.s17_blast_trap, (v) => v))}
                  rot={58}
                  scale={0.96}
                  view="side"
                  propAngle={t * 48}
                />
              </g>
            )}

            {/* Cung sóng xung kích ban đầu tỏa ra đập vào tường chữ T (nét kép halo + lõi sáng) */}
            {hasDetonated && outWaveP < 1 && (
              <g>
                {[1.0, 0.76, 0.52].map((f, idx) => {
                  const r = lerp(28, 482, clamp01(outWaveP * 1.12 - idx * 0.12)) * f;
                  const op = (1 - outWaveP * 0.55) * (1 - idx * 0.22);
                  return (
                    <g key={`ow_${idx}`} opacity={op}>
                      <circle
                        cx={960}
                        cy={288}
                        r={r}
                        fill="none"
                        stroke={PAL2D.threatMid}
                        strokeWidth={11}
                        opacity={0.32}
                      />
                      <circle cx={960} cy={288} r={r} fill="none" stroke={PAL2D.amberHi} strokeWidth={3.5} />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Cung sóng phản xạ dội ngược từ hai mặt tường bê tông chữ T ép xuyên qua CHU CC & Z */}
            {t >= CUE.s17_lock_gas && (
              <g opacity={clamp01(1 - prog(t, 338.8, 340.2))}>
                {[0, 0.22, 0.44].map((delay, idx) => {
                  const p = clamp01((reflWaveP - delay) / (1 - delay * 0.6));
                  if (p <= 0) return null;
                  const lx = lerp(484, 885, p);
                  const rx = lerp(1436, 1035, p);
                  const op = (1 - idx * 0.25) * (0.48 + 0.52 * Math.sin(p * Math.PI));
                  return (
                    <g key={`rw_${idx}`} opacity={op}>
                      <path
                        d={`M${lx - 26} 228 Q${lx + 38} 330 ${lx - 26} 430`}
                        fill="none"
                        stroke={PAL2D.threatMid}
                        strokeWidth={14}
                        opacity={0.38}
                      />
                      <path
                        d={`M${lx - 26} 228 Q${lx + 38} 330 ${lx - 26} 430`}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={4}
                      />
                      <path
                        d={`M${rx + 26} 228 Q${rx - 38} 330 ${rx + 26} 430`}
                        fill="none"
                        stroke={PAL2D.threatMid}
                        strokeWidth={14}
                        opacity={0.38}
                      />
                      <path
                        d={`M${rx + 26} 228 Q${rx - 38} 330 ${rx + 26} 430`}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={4}
                      />
                    </g>
                  );
                })}

                {/* Mũi tên phản xạ sóng nổ bị tường bê tông chữ T khóa kín dội ngược */}
                <g opacity={clamp01(prog(t, 331.5, 332.3))}>
                  <path
                    d="M556 260 L490 288 L568 326"
                    fill="none"
                    stroke={PAL2D.amberHi}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polygon points="578,331 558,333 566,315" fill={PAL2D.amberHi} />

                  <path
                    d="M1364 260 L1430 288 L1352 326"
                    fill="none"
                    stroke={PAL2D.amberHi}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <polygon points="1342,331 1362,333 1354,315" fill={PAL2D.amberHi} />
                </g>
              </g>
            )}

            {/* Chùm tia mảnh văng xuyên thủng vách tôn mỏng của hai container CC & Z trên mặt cắt */}
            {t >= 332.0 && (
              <g opacity={clamp01(prog(t, 332.0, 332.8) * (1 - prog(t, 338.8, 340.0)))}>
                {[-3, -2, -1, 0, 1, 2, 3].map((k) => {
                  const yEnd = 357 + k * 21;
                  const reach = prog(t, 332.0 + Math.abs(k) * 0.08, 333.4);
                  const lx2 = lerp(960, 560, reach);
                  const rx2 = lerp(960, 1360, reach);
                  const ly2 = lerp(288, yEnd, reach);
                  return (
                    <g key={`sec_frag_${k}`}>
                      <line
                        x1={960}
                        y1={288}
                        x2={lx2}
                        y2={ly2}
                        stroke={PAL2D.threatHi}
                        strokeWidth={2.5}
                        strokeDasharray="18 10"
                      />
                      <line
                        x1={960}
                        y1={288}
                        x2={rx2}
                        y2={ly2}
                        stroke={PAL2D.threatHi}
                        strokeWidth={2.5}
                        strokeDasharray="18 10"
                      />
                    </g>
                  );
                })}
              </g>
            )}

            {/* Quả cầu lửa nổ Blast2D tại khe hẹp trên mặt cắt ngang */}
            <Blast2D t={t} at={CUE.s17_blast_trap} x={960} y={294} size={72} seed={17} life={6.0} air />
          </g>

          {/* Đường gióng đồng bộ từ mặt cắt ngang xuống mặt bằng hành lang bên dưới */}
          <g opacity={0.48}>
            <line x1={478} y1={490} x2={234} y2={518} stroke={PAL2D.grid} strokeWidth={1.8} strokeDasharray="6 5" />
            <line x1={960} y1={490} x2={960} y2={518} stroke={PAL2D.amberMid} strokeWidth={2.2} strokeDasharray="6 5" />
            <line x1={1442} y1={490} x2={1686} y2={518} stroke={PAL2D.grid} strokeWidth={1.8} strokeDasharray="6 5" />
          </g>

          {/* ======================================================================================== */}
          {/* TẦNG 2 (Y = 518..1004): MẶT BẰNG ỐNG DẪN SÓNG XUNG KÍCH & MƯA MẢNH VĂNG QUÉT DỌC PHÒNG NGỦ */}
          {/* ======================================================================================== */}
          <rect x={168} y={528} width={1600} height={486} rx={12} fill="#040a14" opacity={0.62} />
          <rect
            x={160}
            y={518}
            width={1600}
            height={486}
            rx={12}
            fill={PAL2D.bgConsole}
            stroke={PAL2D.grid}
            strokeWidth={2.5}
          />

          <g clipPath="url(#s17-plan-clip)">
            <TacticalGrid2D x={160} y={518} w={1600} h={486} step={40} major={160} opacity={0.2} />

            {/* Nền đất đá sỏi bên trong khuôn viên tường chữ T */}
            <rect x={226} y={578} width={1468} height={366} fill="#122338" />

            {/* Luồng sóng quá áp cam-đỏ nén cực đại chạy dọc ống dẫn hành lang (333.5 - 339.2s) */}
            {hasDetonated && (
              <g opacity={clamp01(prog(t, 328.25, 329.0) * (1 - prog(t, 339.2, 340.5)))}>
                <rect
                  x={960 - frontDist}
                  y={584}
                  width={frontDist * 2}
                  height={354}
                  fill="url(#s17-overpressure)"
                  opacity={0.36 + 0.55 * clamp01(prog(t, 331.5, 334.2))}
                />
                <ellipse cx={960} cy={761} rx={Math.min(440, frontDist * 0.85)} ry={162} fill="url(#s17-corridor-core)" />
              </g>
            )}

            {/* Hai hàng tường bê tông chữ T thẳng tắp kẹp chặt trên & dưới hành lang */}
            {[554, 940].map((ty, rowIdx) => (
              <g key={`tw_plan_${rowIdx}`}>
                <rect
                  x={226}
                  y={ty}
                  width={1468}
                  height={28}
                  rx={3}
                  fill={PAL2D.concreteMid}
                  stroke={PAL2D.ink}
                  strokeWidth={2.8}
                />
                <rect
                  x={228}
                  y={rowIdx === 0 ? ty + 19 : ty + 3}
                  width={1464}
                  height={6}
                  fill={lockFlash > 0.05 || channelP > 0 ? mix(PAL2D.concreteHi, PAL2D.amberHi, 0.65) : PAL2D.concreteHi}
                />
                {Array.from({ length: 18 }, (_, s) => (
                  <line
                    key={s}
                    x1={226 + (s + 1) * (1468 / 19)}
                    y1={ty}
                    x2={226 + (s + 1) * (1468 / 19)}
                    y2={ty + 28}
                    stroke={PAL2D.ink}
                    strokeWidth={1.8}
                  />
                ))}
              </g>
            ))}

            {/* Tường chữ T khóa hai đầu & dãy ô rọ đất HESCO bao ngoài */}
            <rect x={196} y={554} width={26} height={288} rx={3} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.6} />
            <rect x={1698} y={680} width={26} height={288} rx={3} fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2.6} />
            {Array.from({ length: 16 }, (_, hi) => (
              <g key={`hesco_p_${hi}`}>
                <rect
                  x={236 + hi * 91}
                  y={528}
                  width={85}
                  height={20}
                  rx={2}
                  fill={PAL2D.hescoLo}
                  stroke={PAL2D.ink}
                  strokeWidth={1.8}
                />
                <rect
                  x={236 + hi * 91}
                  y={974}
                  width={85}
                  height={20}
                  rx={2}
                  fill={PAL2D.hescoLo}
                  stroke={PAL2D.ink}
                  strokeWidth={1.8}
                />
              </g>
            ))}

            {/* 12 phòng ngủ container CHU (6 dãy CC bên trên + 6 dãy Z bên dưới) bị sóng nổ quét xuyên dần */}
            {PLAN_CHU_XS.map((cx, idx) => {
              const distFromEpicenter = Math.abs(cx - 960);
              const hitTime =
                distFromEpicenter < 140
                  ? 328.55
                  : lerp(333.5, 338.6, clamp01((distFromEpicenter - 80) / 620));
              const roomDamaged = t >= hitTime;
              const hitPulse = bump(t, hitTime, 0.9);

              return (
                <React.Fragment key={`chu_pair_${idx}`}>
                  {[
                    { cy: 658, isTop: true },
                    { cy: 864, isTop: false },
                  ].map(({ cy, isTop }, sideIdx) => (
                    <g key={sideIdx} transform={`translate(${cx} ${cy})`}>
                      <rect
                        x={-104}
                        y={-44}
                        width={208}
                        height={88}
                        rx={4}
                        fill={roomDamaged ? mix('#3f1c1c', '#5e221c', hitPulse) : '#1f3550'}
                        stroke={roomDamaged ? PAL2D.threatMid : PAL2D.concreteHi}
                        strokeWidth={roomDamaged ? 3.2 : 2.6}
                      />
                      <line
                        x1={0}
                        y1={-42}
                        x2={0}
                        y2={42}
                        stroke={roomDamaged ? PAL2D.threatLo : PAL2D.grid}
                        strokeWidth={2}
                      />
                      {[-76, -34, 24, 66].map((bx, bi) => (
                        <g
                          key={bi}
                          transform={
                            roomDamaged
                              ? `translate(${bx} 0) rotate(${(bi % 2 === 0 ? 1 : -1) * 14})`
                              : `translate(${bx} 0)`
                          }
                        >
                          <rect
                            x={-13}
                            y={-28}
                            width={26}
                            height={54}
                            rx={3}
                            fill={roomDamaged ? PAL2D.threatLo : PAL2D.usLo}
                            stroke={roomDamaged ? PAL2D.amberMid : PAL2D.usHi}
                            strokeWidth={1.5}
                          />
                          <rect
                            x={-10}
                            y={isTop ? -24 : 12}
                            width={20}
                            height={10}
                            rx={2}
                            fill={roomDamaged ? PAL2D.amberMid : PAL2D.chalk}
                            opacity={0.75}
                          />
                        </g>
                      ))}
                      <rect
                        x={104}
                        y={-15}
                        width={12}
                        height={30}
                        rx={2}
                        fill={PAL2D.concreteMid}
                        stroke={PAL2D.ink}
                        strokeWidth={1.8}
                      />
                      {roomDamaged && (
                        <g>
                          <path
                            d={
                              isTop
                                ? 'M-78 44 L-62 30 L-46 44 L-26 26 L-8 44 L14 28 L34 44 L54 31 L72 44'
                                : 'M-78 -44 L-62 -30 L-46 -44 L-26 -26 L-8 -44 L14 -28 L34 -44 L54 -31 L72 -44'
                            }
                            fill="none"
                            stroke={PAL2D.amberHi}
                            strokeWidth={2.6}
                          />
                          <Puff2D
                            x={cx > 960 ? 22 : -22}
                            y={0}
                            r={22}
                            color={PAL2D.threatMid}
                            opacity={0.28 + 0.35 * hitPulse}
                            seed={idx * 7 + sideIdx}
                          />
                        </g>
                      )}
                    </g>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Mái giàn thép trung tâm hành lang giữa CC và Z trên mặt bằng */}
            <rect
              x={860}
              y={705}
              width={200}
              height={112}
              fill="none"
              stroke={hasDetonated ? PAL2D.threatMid : PAL2D.concreteMid}
              strokeWidth={2.2}
              strokeDasharray="8 6"
            />

            {/* Phản xạ dội ngang từ hai tường chữ T vào lòng hành lang (331.50s) */}
            {t >= CUE.s17_lock_gas && t < 339.8 && (
              <g opacity={clamp01(prog(t, 331.5, 332.2) * (1 - prog(t, 338.8, 339.8)))}>
                {[-180, 0, 180].map((ox, oi) => (
                  <g key={`pref_${oi}`}>
                    <path
                      d={`M${935 + ox} 608 L${960 + ox} 586 L${985 + ox} 620`}
                      fill="none"
                      stroke={PAL2D.amberHi}
                      strokeWidth={3.2}
                      strokeLinecap="round"
                    />
                    <path
                      d={`M${935 + ox} 914 L${960 + ox} 936 L${985 + ox} 902`}
                      fill="none"
                      stroke={PAL2D.amberHi}
                      strokeWidth={3.2}
                      strokeLinecap="round"
                    />
                  </g>
                ))}
              </g>
            )}

            {/* Hai đầu mũi sóng xung kích nén Mach-stem + mưa mảnh văng quét dọc suốt hành lang (333.5 - 339.4s) */}
            {t >= 333.4 && (
              <g opacity={clamp01(prog(t, 333.4, 334.0) * (1 - prog(t, 339.2, 340.2)))}>
                {SHRAPNEL_RAYS.map((ray, ri) => {
                  const dist = Math.min(715, frontDist * ray.speed);
                  const xEnd = 960 + ray.dir * dist;
                  const rawY = 761 + Math.tan(ray.angle) * dist;
                  const yClamped = Math.max(590, Math.min(932, rawY));
                  if (ray.bounce && (rawY < 594 || rawY > 928)) {
                    const yWall = rawY < 594 ? 590 : 932;
                    const xMid = 960 + ray.dir * dist * 0.56;
                    const yBounce = rawY < 594 ? 702 : 820;
                    return (
                      <path
                        key={`sr_${ri}`}
                        d={`M960 761 L${xMid.toFixed(1)} ${yWall} L${xEnd.toFixed(1)} ${yBounce}`}
                        fill="none"
                        stroke={ri % 3 === 0 ? PAL2D.amberHi : PAL2D.threatHi}
                        strokeWidth={2.2}
                        strokeDasharray="22 12"
                        opacity={0.85}
                      />
                    );
                  }
                  return (
                    <line
                      key={`sr_${ri}`}
                      x1={960}
                      y1={761}
                      x2={xEnd}
                      y2={yClamped}
                      stroke={ri % 3 === 0 ? PAL2D.amberHi : PAL2D.threatHi}
                      strokeWidth={2.2}
                      strokeDasharray="24 12"
                      opacity={0.82}
                    />
                  );
                })}

                {([-1, 1] as const).map((dir) => {
                  const fx = 960 + dir * frontDist;
                  const bow = dir * 44;
                  return (
                    <g key={`mach_${dir}`}>
                      {[0, 48, 96].map((lag, li) => {
                        const lx = fx - dir * lag;
                        if (Math.abs(lx - 960) < 35) return null;
                        const op = 1 - li * 0.3;
                        return (
                          <g key={li} opacity={op}>
                            <path
                              d={`M${lx} 585 Q${lx + bow} 761 ${lx} 937`}
                              fill="none"
                              stroke={PAL2D.threatMid}
                              strokeWidth={18 - li * 4}
                              opacity={0.42}
                            />
                            <path
                              d={`M${lx} 585 Q${lx + bow} 761 ${lx} 937`}
                              fill="none"
                              stroke={li === 0 ? PAL2D.amberHi : PAL2D.amberMid}
                              strokeWidth={5.5 - li * 1.3}
                            />
                          </g>
                        );
                      })}
                    </g>
                  );
                })}
              </g>
            )}

            {/* Vụ nổ trung tâm trên mặt bằng hành lang */}
            <Blast2D t={t} at={CUE.s17_blast_trap} x={960} y={761} size={62} seed={27} life={6.0} air />
          </g>

          {/* ======================================================================================== */}
          {/* KHU VỰC DƯỚI (Y = 1134..1996): LƯỚI QUÂN SỐ 350 BINH SĨ (25 × 14) — ĐẠI ĐỘI 718 & >100/350 */}
          {/* ======================================================================================== */}
          <rect x={168} y={1144} width={1600} height={862} rx={14} fill="#040a14" opacity={0.62} />
          <rect
            x={160}
            y={1134}
            width={1600}
            height={862}
            rx={14}
            fill={PAL2D.bgConsole}
            stroke={PAL2D.grid}
            strokeWidth={2.8}
          />
          <rect
            x={176}
            y={1150}
            width={1568}
            height={830}
            rx={10}
            fill="none"
            stroke={PAL2D.gridSoft}
            strokeWidth={1.6}
          />

          <g clipPath="url(#s17-grid-clip)">
            {/* Vòng sóng quá áp lan rộng trên biểu đồ 350 quân nhân lúc 348.94s (CUE.s17_inj100) */}
            {t >= CUE.s17_inj100 && inj108P < 1 && (
              <g opacity={(1 - inj108P) * 0.85}>
                <circle
                  cx={264}
                  cy={1212}
                  r={lerp(40, 1520, inj108P)}
                  fill="none"
                  stroke={PAL2D.threatMid}
                  strokeWidth={18}
                  opacity={0.35}
                />
                <circle
                  cx={264}
                  cy={1212}
                  r={lerp(40, 1520, inj108P)}
                  fill="none"
                  stroke={PAL2D.amberHi}
                  strokeWidth={4}
                />
              </g>
            )}

            {/* Lưới 25 × 14 = 350 biểu tượng quân nhân trang nghiêm */}
            <g>
              {soldiers.map(({ idx, x, y }) => {
                // 3 chiến sĩ Đại đội Công binh 718 tử trận tại chỗ (idx 0, 1, 2 ở hàng đầu)
                if (idx < 3) {
                  const starAppear = prog(t, CUE.s17_fallen3 + idx * 0.14, CUE.s17_fallen3 + idx * 0.14 + 0.38);
                  const starPulse = bump(t, CUE.s17_fallen3 + idx * 0.14, 1.1);
                  return (
                    <g key={idx} transform={`translate(${x} ${y})`}>
                      {starAppear < 1 && (
                        <g opacity={1 - starAppear}>
                          <circle cx={0} cy={-9.5} r={5.8} fill={PAL2D.usHi} stroke={PAL2D.ink} strokeWidth={1.6} />
                          <path
                            d="M-11 12.5 L-11 3 C-11 -2 -6 -4 0 -4 C6 -4 11 -2 11 3 L11 12.5 Z"
                            fill={PAL2D.usMid}
                            stroke={PAL2D.ink}
                            strokeWidth={1.6}
                          />
                        </g>
                      )}
                      {starAppear > 0 && (
                        <g transform={`scale(${lerp(0.4, 1 + starPulse * 0.16, starAppear)})`} opacity={starAppear}>
                          {starPulse > 0.02 && (
                            <circle
                              cx={0}
                              cy={0}
                              r={19 + starPulse * 14}
                              fill="none"
                              stroke={PAL2D.amberHi}
                              strokeWidth={2.5}
                              opacity={starPulse * 0.85}
                            />
                          )}
                          <circle
                            cx={0}
                            cy={0}
                            r={19.5}
                            fill={PAL2D.threatLo}
                            stroke={PAL2D.threatMid}
                            strokeWidth={2.6}
                          />
                          <polygon
                            points={starPoints(0, 0, 14, 6)}
                            fill={PAL2D.amberHi}
                            stroke={PAL2D.ink}
                            strokeWidth={1.6}
                            strokeLinejoin="round"
                          />
                          <polygon points={starPoints(0, 0, 7.8, 3.3)} fill={PAL2D.amberMid} opacity={0.75} />
                        </g>
                      )}
                    </g>
                  );
                }

                // 47 quân nhân bị thương công bố ban đầu (idx 3..49) -> mở rộng lên tổng 108/350 vị trí (idx 0..107)
                let hitAmt = 0;
                let isDeepWave = false;
                if (idx < 50) {
                  const delay47 = ((idx - 3) / 47) * 0.55;
                  hitAmt = prog(t, CUE.s17_inj47 - 0.35 + delay47, CUE.s17_inj47 + 0.15 + delay47);
                } else if (idx < 108) {
                  const delay108 = ((idx - 50) / 58) * 1.45;
                  hitAmt = prog(t, CUE.s17_inj100 + delay108, CUE.s17_inj100 + 0.45 + delay108);
                  isDeepWave = true;
                }

                const fullReportBlend = idx < 50 ? inj108P : hitAmt;
                const bodyBase = PAL2D.usMid;
                const bodyAlert = isDeepWave
                  ? mix(PAL2D.amberMid, PAL2D.threatMid, 0.62)
                  : mix(PAL2D.amberMid, PAL2D.threatMid, 0.38 * fullReportBlend);
                const bodyFill = hitAmt > 0 ? mix(bodyBase, bodyAlert, hitAmt) : bodyBase;

                const headBase = PAL2D.usHi;
                const headAlert = isDeepWave
                  ? PAL2D.threatHi
                  : mix(PAL2D.amberHi, PAL2D.threatHi, 0.45 * fullReportBlend);
                const headFill = hitAmt > 0 ? mix(headBase, headAlert, hitAmt) : headBase;

                return (
                  <g key={idx} transform={`translate(${x} ${y})`} opacity={hitAmt > 0 ? 1 : 0.72}>
                    {hitAmt > 0.5 && (
                      <circle
                        cx={0}
                        cy={-1}
                        r={18 + tbiPulse * 2.4}
                        fill={isDeepWave ? PAL2D.threatMid : PAL2D.amberMid}
                        opacity={0.18 + tbiPulse * 0.14}
                      />
                    )}
                    {hitAmt > 0.5 && t >= CUE.s17_tbi && (
                      <circle
                        cx={0}
                        cy={-9.8}
                        r={9.2 + tbiPulse * 2.1}
                        fill="none"
                        stroke={PAL2D.amberHi}
                        strokeWidth={1.5}
                        opacity={0.35 + tbiPulse * 0.45}
                      />
                    )}
                    <path
                      d="M-11 12.5 L-11 3 C-11 -2 -6.2 -4 0 -4 C6.2 -4 11 -2 11 3 L11 12.5 Z"
                      fill={bodyFill}
                      stroke={PAL2D.ink}
                      strokeWidth={1.8}
                    />
                    <path
                      d="M-9 10.6 L-9 3.2 C-9 -0.3 -4.8 -2 0 -2 L0 10.6 Z"
                      fill="#ffffff"
                      opacity={hitAmt > 0 ? 0.18 : 0.12}
                    />
                    <circle cx={0} cy={-9.8} r={5.9} fill={headFill} stroke={PAL2D.ink} strokeWidth={1.8} />
                  </g>
                );
              })}
            </g>

            {/* Thanh tỷ lệ quân số trực quan dưới chân bảng (350 tổng: 3 tử trận + 105 chấn thương quá áp = 108/350) */}
            <g transform="translate(264 1930)">
              <rect
                x={0}
                y={0}
                width={1392}
                height={20}
                rx={10}
                fill={PAL2D.usLo}
                stroke={PAL2D.ink}
                strokeWidth={2.2}
              />
              {injuredRatio > 0.001 && (
                <rect
                  x={1392 * fallenRatio}
                  y={2}
                  width={1392 * injuredRatio}
                  height={16}
                  rx={6}
                  fill={mix(PAL2D.amberMid, PAL2D.threatMid, inj108P * 0.55)}
                />
              )}
              {fallenRatio > 0.001 && (
                <rect x={2} y={2} width={Math.max(16, 1392 * fallenRatio)} height={16} rx={6} fill={PAL2D.amberHi} />
              )}
              {[1, 2, 3, 4, 5, 6].map((tick) => (
                <line
                  key={tick}
                  x1={(1392 * tick) / 7}
                  y1={0}
                  x2={(1392 * tick) / 7}
                  y2={20}
                  stroke={PAL2D.ink}
                  strokeWidth={2}
                  opacity={0.7}
                />
              ))}
            </g>
          </g>
        </svg>
      </Cam2D>

      {/* Tối đa 1 <Label> trên màn hình tại mọi thời điểm */}
      <Label
        t={t}
        text="ĐẠI ĐỘI 718"
        x={960}
        y={104}
        from={341.4}
        until={344.0}
        size={54}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text=">100 / 350"
        x={960}
        y={104}
        from={CUE.s17_inj100}
        until={354.22}
        size={58}
        bg={PAL2D.threatMid}
        fg={PAL2D.paper}
      />

      <Grain opacity={0.42} />
    </AbsoluteFill>
  );
};

export default S17;
