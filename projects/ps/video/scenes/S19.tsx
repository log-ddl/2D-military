import React from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { FONT, bump, deg, lerp, prog } from '@kit/theme';
import { Label, Layer, handheld, useT } from '@kit/motion';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { Blast2D } from '@lib/2d/fx';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  BlueprintBg2D,
  GlowLine2D,
  Kinzhal2D,
  Oreshnik2D,
  PAC3_2D,
  PatriotLauncher2D,
  PatriotQuadFace2D,
} from '../local/assets2d';

// ==================== BẢNG 1 (X = 0..1920): GHÉP CẶP 16 ĐẠN PAC-3 vs 17 MỤC TIÊU ====================
const COL_X0 = 286;
const COL_STEP = 92; // i = 0..16 -> 286 .. 1758 (trọn vẹn cả QuadFace bên trái lẫn cột #17 bên phải)
const TOP_ROW_Y = 248;
const BOT_ROW_Y = 805;

const colX = (i: number) => COL_X0 + i * COL_STEP;
const fireTime = (i: number) => 348.2 + i * 0.24; // 348.20 .. 351.80s
const hitTime = (i: number) => fireTime(i) + 0.5; // 348.70 .. 352.30s

// ==================== BẢNG 2 (X = 2200..4120, tâm 3160): CÂY PHÂN RÃ ORESHNIK 1 -> 6 -> 36 ====================
const B2_CX = 3160;
const MIRV_Y = 434;
const DEF2_Y = 895;

const mirvNodeX = (c: number) => B2_CX + (c - 2.5) * 290; // 6 nhánh MIRV: 2435 .. 3885
const subTargetX = (k: number) => B2_CX + (k - 17.5) * 48; // 36 tia đạn con: 2320 .. 4000
const def2SlotX = (i: number) => B2_CX + (i - 7.5) * 52; // 16 ô đạn nhỏ bé ở giữa: 2770 .. 3550

// 16 ô đạn ở giữa chỉ nối chặn được 16 tia ở vùng trung tâm (tia thứ 10..25), 20 tia hai bên sườn xuyên thẳng xuống đáy
const isSubBlocked = (k: number) => k >= 10 && k < 26;

/** Icon đầu đạn đỏ hướng thẳng xuống dùng trong các ô mục tiêu 01..17. */
const ThreatDartIcon: React.FC<{ x: number; y: number; active: boolean; killed: boolean; highlight?: boolean }> = ({
  x,
  y,
  active,
  killed,
  highlight = false,
}) => {
  const fillMid = killed ? '#323a45' : highlight ? PAL2D.amberHot : active ? PAL2D.red : '#782a34';
  const fillDark = killed ? '#212730' : active ? PAL2D.redDeep : '#4a1b22';
  return (
    <g transform={`translate(${x} ${y})`}>
      <polygon
        points="-12,-34 12,-34 15,6 0,36 -15,6"
        fill={fillMid}
        stroke={PAL2D.stroke}
        strokeWidth={2}
      />
      <polygon points="0,-34 12,-34 15,6 0,36" fill={fillDark} opacity={0.65} />
      <polygon points="-18,-34 -12,-34 -12,-18 -20,-14" fill={fillDark} />
      <polygon points="18,-34 12,-34 12,-18 20,-14" fill={fillDark} />
    </g>
  );
};

/** Khoang MIRV 6 giếng hình lục giác ở tầng phân nhánh thứ nhất của sơ đồ cây Oreshnik. */
const MirvPodNode2D: React.FC<{ x: number; y: number; appear: number }> = ({ x, y, appear }) => {
  if (appear <= 0.01) return null;
  return (
    <g transform={`translate(${x} ${y}) scale(${appear})`}>
      <polygon
        points="0,-34 30,-17 30,17 0,34 -30,17 -30,-17"
        fill="#1e2733"
        stroke={PAL2D.amber}
        strokeWidth={2.8}
      />
      <polygon points="0,-31 27,-15 0,0 -27,-15" fill="#324052" opacity={0.75} />
      {Array.from({ length: 6 }, (_, i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <circle
            key={i}
            cx={Math.cos(a) * 14}
            cy={Math.sin(a) * 14}
            r={4.2}
            fill={PAL2D.red}
            stroke={PAL2D.amberHot}
            strokeWidth={1.2}
          />
        );
      })}
      <circle cx={0} cy={0} r={3.5} fill={PAL2D.amberHot} />
    </g>
  );
};

const S19: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  let remainAmmo1 = 16;
  for (let i = 0; i < 16; i++) {
    if (t >= fireTime(i)) remainAmmo1--;
  }

  // Quả #17 lọt lưới lao thẳng từ hàng trên (y=248) xuyên đáy (y=945) lúc CUE.s19_leaker_17 (354.76s)
  const leakerArmed = t >= 352.9;
  const leakerFallP = prog(t, 353.35, CUE.s19_leaker_17, Easing.in(Easing.quad));
  const leakerImpacted = t >= CUE.s19_leaker_17;
  const leakerY = lerp(TOP_ROW_Y + 30, 942, leakerFallP);
  const x17 = colX(16);

  // Giữ trọn cả giàn 4x4 bên trái lẫn cột #17 bên phải trong khung Bảng 1, rồi trượt mượt sang Bảng 2 lúc 356.68s
  const pFocus17 = prog(t, 352.95, 354.4, Easing.inOut(Easing.cubic));
  const pSlideTree = prog(t, 356.68, 357.95, Easing.inOut(Easing.cubic));

  const camX = lerp(lerp(960, 986, pFocus17), B2_CX, pSlideTree);
  const camY = lerp(lerp(540, 552, pFocus17), 535, pSlideTree);
  const camZoom = lerp(lerp(1.0, 1.015, pFocus17), 0.98, pSlideTree);

  const [hx, hy] = handheld(t, 2.5, 's19_cam');
  const shake17 = bump(t, CUE.s19_leaker_17, 0.55) * 16;
  const shakeCollapse = bump(t, 360.2, 0.75) * 10;
  const sx = hx + Math.sin(t * 54) * (shake17 + shakeCollapse);
  const sy = hy + Math.cos(t * 49) * (shake17 + shakeCollapse);

  let remainAmmo2 = 16;
  for (let i = 0; i < 16; i++) {
    if (t >= 359.25 + i * 0.045) remainAmmo2--;
  }
  const collapseOverload = prog(t, 360.1, 360.7);

  return (
    <AbsoluteFill style={{ background: PAL2D.bgDeep }}>
      <Defs2D />
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={[sx, sy]} bg={PAL2D.bgDeep}>
        <Layer>
          <BlueprintBg2D x={-700} y={-450} w={5600} h={2100} step={120} id="s19_bp" />

          {/* ================================================================================= */}
          {/* GIAI ĐOẠN 1 (X = 0..1920): MA TRẬN GHÉP CẶP 16 Ô ĐẠN PATRIOT vs 17 MỤC TIÊU ĐỎ    */}
          {/* ================================================================================= */}
          <g>
            <rect
              x={54}
              y={156}
              width={1812}
              height={186}
              rx={14}
              fill="#0a1829"
              opacity={0.65}
              stroke={PAL2D.grid}
              strokeWidth={1.6}
            />
            <rect
              x={54}
              y={708}
              width={1812}
              height={204}
              rx={14}
              fill="#0a1829"
              opacity={0.65}
              stroke={PAL2D.grid}
              strokeWidth={1.6}
            />

            {/* Mặt giàn 4x4 = 16 ống phóng Patriot bên trái kết nối trực tiếp vào 16 ô đạn ngang */}
            <g filter="url(#sh)">
              <PatriotQuadFace2D x={150} y={BOT_ROW_Y} size={148} loadedCount={remainAmmo1} showNumbers={false} />
            </g>
            <line
              x1={225}
              y1={BOT_ROW_Y}
              x2={colX(0) - 38}
              y2={BOT_ROW_Y}
              stroke={remainAmmo1 > 0 ? PAL2D.cyan : '#3a4756'}
              strokeWidth={3.5}
            />

            {/* 17 cột ghép cặp xác suất */}
            {Array.from({ length: 17 }, (_, i) => {
              const cx = colX(i);
              const is17 = i === 16;
              const numLabel = String(i + 1).padStart(2, '0');

              const capScan = !is17 ? bump(t, 344.2 + i * 0.11, 0.75) : 0;
              const threatLockP = prog(t, 347.1 + i * 0.045, 347.65 + i * 0.045, Easing.out(Easing.back(1.3)));
              const fired = !is17 && t >= fireTime(i);
              const killed = !is17 && t >= hitTime(i);
              const flyP = !is17 ? prog(t, fireTime(i), hitTime(i), (x) => x) : 0;
              const interceptY = lerp(BOT_ROW_Y - 76, TOP_ROW_Y + 62, flyP);
              const launchFlash = !is17 ? bump(t, fireTime(i), 0.24) : 0;

              return (
                <g key={i}>
                  <line
                    x1={cx}
                    y1={TOP_ROW_Y + 76}
                    x2={cx}
                    y2={BOT_ROW_Y - 78}
                    stroke={is17 && leakerArmed ? PAL2D.red : killed ? '#3a4a5c' : PAL2D.gridFine}
                    strokeWidth={is17 && leakerArmed ? 2.6 : 1.5}
                    strokeDasharray="7 8"
                    opacity={is17 && leakerArmed ? 0.88 : 0.45}
                  />

                  {/* ---------- Ô MỤC TIÊU ĐỎ PHÍA TRÊN (01..17) ---------- */}
                  <g
                    transform={`translate(${cx} ${TOP_ROW_Y}) scale(${0.94 + 0.06 * threatLockP})`}
                    opacity={0.58 + 0.42 * threatLockP}
                  >
                    <rect
                      x={-37}
                      y={-72}
                      width={74}
                      height={144}
                      rx={10}
                      fill={
                        killed
                          ? '#161d26'
                          : is17 && leakerArmed
                            ? '#59121c'
                            : threatLockP > 0.2
                              ? '#36131b'
                              : '#192234'
                      }
                      stroke={
                        killed
                          ? '#414d5c'
                          : is17 && leakerArmed
                            ? PAL2D.amberHot
                            : threatLockP > 0.2
                              ? PAL2D.red
                              : '#6b3744'
                      }
                      strokeWidth={is17 && leakerArmed ? 3.5 : 2.4}
                    />
                    {!(is17 && t >= 353.35) && (
                      <ThreatDartIcon
                        x={0}
                        y={-12}
                        active={threatLockP > 0.2}
                        killed={killed}
                        highlight={is17 && leakerArmed}
                      />
                    )}
                    <text
                      x={0}
                      y={56}
                      textAnchor="middle"
                      fill={killed ? '#556373' : is17 && leakerArmed ? PAL2D.amberHot : PAL2D.paper}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={21}
                    >
                      {numLabel}
                    </text>

                    {killed && (
                      <g stroke="#8796a8" strokeWidth={3.8} strokeLinecap="round" opacity={0.9}>
                        <line x1={-25} y1={-54} x2={25} y2={28} />
                        <line x1={25} y1={-54} x2={-25} y2={28} />
                      </g>
                    )}
                  </g>

                  {/* ---------- Ô ĐẠN PATRIOT PHÍA DƯỚI (01..16) HOẶC LỖ HỔNG CỘT #17 ---------- */}
                  {!is17 ? (
                    <g transform={`translate(${cx} ${BOT_ROW_Y})`}>
                      <rect
                        x={-37}
                        y={-76}
                        width={74}
                        height={152}
                        rx={10}
                        fill={fired ? '#141a22' : capScan > 0.1 ? '#1b4d3e' : '#11332a'}
                        stroke={fired ? '#394350' : capScan > 0.1 ? PAL2D.amberHot : PAL2D.cyan}
                        strokeWidth={capScan > 0.1 ? 3.2 : 2.4}
                      />
                      {!fired ? (
                        <PAC3_2D x={0} y={-14} scale={0.175} rot={-90} thicknessScale={1.85} />
                      ) : (
                        <circle cx={0} cy={-14} r={14} fill="#0d1117" stroke="#313b47" strokeWidth={2} />
                      )}
                      <text
                        x={0}
                        y={60}
                        textAnchor="middle"
                        fill={fired ? '#4b5868' : PAL2D.cyan}
                        fontFamily={FONT}
                        fontWeight={700}
                        fontSize={21}
                      >
                        {numLabel}
                      </text>
                    </g>
                  ) : (
                    <g transform={`translate(${cx} ${BOT_ROW_Y})`}>
                      <rect
                        x={-37}
                        y={-76}
                        width={74}
                        height={152}
                        rx={10}
                        fill={leakerArmed ? '#331018' : '#0f1d2e'}
                        fillOpacity={leakerArmed ? 0.72 : 0.42}
                        stroke={PAL2D.red}
                        strokeWidth={2.6}
                        strokeDasharray="9 7"
                        opacity={0.55 + 0.45 * prog(t, 347.5, 348.5)}
                      />
                      <line x1={-16} y1={-12} x2={16} y2={-12} stroke={PAL2D.red} strokeWidth={3.5} opacity={0.8} />
                      <text
                        x={0}
                        y={60}
                        textAnchor="middle"
                        fill={PAL2D.red}
                        fontFamily={FONT}
                        fontWeight={700}
                        fontSize={22}
                        opacity={0.9}
                      >
                        00
                      </text>
                    </g>
                  )}

                  {/* ---------- ĐƯỜNG ĐÁNH CHẶN XANH GHÉP CẶP 1-ĐỐI-1 CHO CỘT 01..16 (SẠCH GỌN, KHÔNG BỊ KHÓI CHE) ---------- */}
                  {!is17 && fired && (
                    <g>
                      {launchFlash > 0.01 && (
                        <circle
                          cx={cx}
                          cy={BOT_ROW_Y - 76}
                          r={14 * launchFlash}
                          fill={PAL2D.amberHot}
                          opacity={launchFlash}
                        />
                      )}
                      <GlowLine2D
                        d={`M ${cx} ${BOT_ROW_Y - 76} L ${cx} ${interceptY.toFixed(1)}`}
                        color={PAL2D.cyan}
                        core="#ebffff"
                        width={killed ? 2.2 : 4.2}
                        opacity={killed ? 0.4 : 0.96}
                      />
                      {!killed && (
                        <PAC3_2D x={cx} y={interceptY} scale={0.145} rot={-90} flame={1} thicknessScale={1.8} />
                      )}
                      <Blast2D
                        t={t}
                        at={hitTime(i)}
                        x={cx}
                        y={TOP_ROW_Y + 50}
                        size={19}
                        air
                        seed={80 + i}
                        life={0.95}
                        smoke="#6c8299"
                      />
                    </g>
                  )}
                </g>
              );
            })}

            {/* Bệ phóng Patriot đặt dưới đáy cột #17 hứng trọn đòn xuyên thủng khi cả 16 ống đã về 0 */}
            <g opacity={leakerImpacted ? 0.55 : 1} filter="url(#sh)">
              <PatriotLauncher2D x={x17 - 16} y={992} scale={0.19} flip elev={38} />
            </g>

            {/* MỤC TIÊU THỨ #17 SÁNG RỰC ĐỎ THẪM LAO THẲNG XUYÊN QUA HÀNG PHÒNG THỦ ĐÃ CẠN ĐẠN */}
            {t >= 353.35 && (
              <g>
                <GlowLine2D
                  d={`M ${x17} ${TOP_ROW_Y + 30} L ${x17} ${leakerY.toFixed(1)}`}
                  color={PAL2D.red}
                  core={PAL2D.amberHot}
                  width={7.2}
                  opacity={1 - prog(t, CUE.s19_leaker_17 + 0.6, CUE.s19_leaker_17 + 2.4) * 0.55}
                />
                {!leakerImpacted && (
                  <g>
                    {/* Vầng hào quang plasma đỏ rực bao lấy mũi đầu đạn #17 */}
                    <ellipse cx={x17} cy={leakerY + 14} rx={24} ry={58} fill={PAL2D.red} opacity={0.42} />
                    <ellipse cx={x17} cy={leakerY + 26} rx={14} ry={36} fill={PAL2D.amber} opacity={0.62} />
                    <Kinzhal2D x={x17} y={leakerY} scale={0.21} rot={90} flame={0} heatGlow={1} />
                  </g>
                )}
              </g>
            )}
            <Blast2D
              t={t}
              at={CUE.s19_leaker_17}
              x={x17}
              y={962}
              size={115}
              seed={17}
              life={4.5}
              smoke="#5d544f"
            />
          </g>

          {/* ================================================================================= */}
          {/* GIAI ĐOẠN 2 (X = 2200..4120): CÂY PHÂN NHÁNH CẤP SỐ NHÂN ORESHNIK (1 -> 6 -> 36)  */}
          {/* ================================================================================= */}
          <g>
            <rect
              x={B2_CX - 910}
              y={34}
              width={1820}
              height={992}
              rx={18}
              fill="#081525"
              opacity={0.58}
              stroke={PAL2D.grid}
              strokeWidth={1.8}
            />

            {/* 1. Đỉnh cây: 1 quả tên lửa Oreshnik mở chóp bảo vệ trọn vẹn trong khung bàn vẽ */}
            <g filter="url(#sh)">
              <Oreshnik2D
                x={B2_CX}
                y={176}
                scale={0.165}
                rot={90}
                shroudOpen={prog(t, 357.0, 357.95, Easing.out(Easing.cubic)) * 0.92}
              />
            </g>
            <circle
              cx={B2_CX}
              cy={234}
              r={10.5}
              fill={PAL2D.amberHot}
              stroke={PAL2D.red}
              strokeWidth={3}
            />

            {/* 2. Tầng 1: Tách 6 nhánh MIRV độc lập */}
            {Array.from({ length: 6 }, (_, c) => {
              const mx = mirvNodeX(c);
              const branchP = prog(t, 357.35 + c * 0.08, 358.25 + c * 0.08, Easing.out(Easing.cubic));
              const d = `M ${B2_CX} 234 C ${B2_CX} 330, ${mx} 322, ${mx} ${MIRV_Y - 32}`;
              const dash = drawOn(980, branchP);
              const podAppear = prog(t, 358.0 + c * 0.08, 358.45 + c * 0.08, Easing.out(Easing.back(1.4)));

              return (
                <g key={`mirv_${c}`}>
                  {branchP > 0.01 && (
                    <GlowLine2D
                      d={d}
                      color={PAL2D.amber}
                      core={PAL2D.amberHot}
                      width={4.2}
                      strokeDasharray={dash.strokeDasharray}
                      strokeDashoffset={dash.strokeDashoffset}
                    />
                  )}
                  <MirvPodNode2D x={mx} y={MIRV_Y} appear={podAppear} />
                </g>
              );
            })}

            {/* 3. Tầng 2: Mỗi nhánh MIRV lại bung tiếp 6 tia đạn con (= 36 tia đỏ rực rõ nét không bị khói che!) */}
            {Array.from({ length: 36 }, (_, k) => {
              const c = Math.floor(k / 6);
              const s = k % 6;
              const mx = mirvNodeX(c);
              const tx = subTargetX(k);
              const blocked = isSubBlocked(k);

              const tStart = 358.42 + c * 0.06 + s * 0.035;
              const rayP = prog(t, tStart, tStart + 1.45, Easing.in(Easing.quad));
              if (rayP <= 0.01) return null;

              const endY = blocked ? 715 : DEF2_Y - 8;
              const maxP = blocked ? Math.min(rayP, 0.76) / 0.76 : rayP;
              const curX = lerp(mx, tx, maxP);
              const curY = lerp(MIRV_Y + 32, endY, maxP);
              const rot = deg(Math.atan2(endY - (MIRV_Y + 32), tx - mx));

              return (
                <g key={`sub_${k}`}>
                  <GlowLine2D
                    d={`M ${mx} ${MIRV_Y + 32} L ${curX.toFixed(1)} ${curY.toFixed(1)}`}
                    color={PAL2D.red}
                    core={PAL2D.amberHot}
                    width={blocked && rayP > 0.76 ? 2.0 : 3.2}
                    opacity={blocked && rayP > 0.76 ? 0.36 : 0.96}
                  />
                  {!(blocked && rayP >= 0.76) && (
                    <g transform={`translate(${curX} ${curY}) rotate(${rot})`}>
                      <polygon points="-11,-5.5 12,0 -11,5.5" fill={PAL2D.amberHot} stroke={PAL2D.red} strokeWidth={1.6} />
                    </g>
                  )}
                  {/* Điểm xuyên thủng rực lửa của 20 tia đạn con không thể đánh chặn ở hai bên sườn */}
                  {!blocked && rayP >= 0.98 && (
                    <circle
                      cx={tx}
                      cy={endY}
                      r={7.5 + 2.5 * Math.sin(t * 18 + k)}
                      fill={PAL2D.amberHot}
                      stroke={PAL2D.red}
                      strokeWidth={2.4}
                    />
                  )}
                </g>
              );
            })}

            {/* 4. Đáy cây: Hàng 16 ô đạn nhỏ bé của Patriot bị 36 tia đạn con áp đảo hoàn toàn */}
            <g>
              <rect
                x={B2_CX - 432}
                y={DEF2_Y - 50}
                width={864}
                height={102}
                rx={12}
                fill={collapseOverload > 0.1 ? '#361118' : '#0d2233'}
                stroke={collapseOverload > 0.1 ? PAL2D.red : PAL2D.cyan}
                strokeWidth={collapseOverload > 0.1 ? 3.4 : 2.2}
              />

              {Array.from({ length: 16 }, (_, i) => {
                const sxSlot = def2SlotX(i);
                const pairedSubIdx = 10 + i;
                const pairedSubX = subTargetX(pairedSubIdx);
                const tDefFire = 359.22 + i * 0.04;
                const defFired = t >= tDefFire;
                const defP = prog(t, tDefFire, tDefFire + 0.38);

                return (
                  <g key={`d2_${i}`}>
                    <rect
                      x={sxSlot - 20}
                      y={DEF2_Y - 36}
                      width={40}
                      height={72}
                      rx={6}
                      fill={defFired ? '#151b23' : '#12382c'}
                      stroke={
                        collapseOverload > 0.2
                          ? PAL2D.red
                          : defFired
                            ? '#3e4957'
                            : PAL2D.green
                      }
                      strokeWidth={2}
                    />
                    {!defFired ? (
                      <circle cx={sxSlot} cy={DEF2_Y - 6} r={8.5} fill={PAL2D.green} />
                    ) : (
                      <circle cx={sxSlot} cy={DEF2_Y - 6} r={7.5} fill="#252c36" />
                    )}
                    <text
                      x={sxSlot}
                      y={DEF2_Y + 25}
                      textAnchor="middle"
                      fill={defFired ? '#546170' : PAL2D.paper}
                      fontFamily={FONT}
                      fontWeight={700}
                      fontSize={13}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </text>

                    {defP > 0.01 && (
                      <>
                        <GlowLine2D
                          d={`M ${sxSlot} ${DEF2_Y - 36} L ${lerp(sxSlot, pairedSubX, defP).toFixed(1)} ${lerp(DEF2_Y - 36, 715, defP).toFixed(1)}`}
                          color={PAL2D.cyan}
                          core="#e6ffff"
                          width={2.2}
                          opacity={0.85 - 0.5 * prog(t, tDefFire + 0.4, tDefFire + 1.4)}
                        />
                        <Blast2D
                          t={t}
                          at={tDefFire + 0.38}
                          x={pairedSubX}
                          y={715}
                          size={15}
                          air
                          seed={200 + i}
                          life={1.1}
                          smoke="#6c8299"
                        />
                      </>
                    )}
                  </g>
                );
              })}

              {/* Chớp nổ gọn sắc ở hai cánh sườn (life=1.4s để không đùn sương mù che 36 tia ở cuối cảnh!) */}
              {[1, 4, 7, 9, 26, 28, 31, 34].map((impactIdx, j) => (
                <Blast2D
                  key={`breach_${impactIdx}`}
                  t={t}
                  at={360.0 + (j % 4) * 0.12}
                  x={subTargetX(impactIdx)}
                  y={DEF2_Y + 4}
                  size={34}
                  seed={300 + j}
                  life={1.45}
                  smoke="#635751"
                />
              ))}

              <g transform={`translate(${B2_CX} ${DEF2_Y + 84})`}>
                <rect
                  x={-110}
                  y={-23}
                  width={220}
                  height={46}
                  rx={23}
                  fill="#101824"
                  stroke={remainAmmo2 === 0 ? PAL2D.red : PAL2D.cyan}
                  strokeWidth={2.5}
                />
                <text
                  x={0}
                  y={8}
                  textAnchor="middle"
                  fill={remainAmmo2 === 0 ? PAL2D.red : PAL2D.cyan}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={24}
                >
                  {`${String(remainAmmo2).padStart(2, '0')} / 16`}
                </text>
              </g>
            </g>
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.4} />

      <Label t={t} text="MỤC TIÊU #17" x={960} y={140} from={354.0} until={356.5} />
    </AbsoluteFill>
  );
};

export default S19;
