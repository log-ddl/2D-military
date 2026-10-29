import React, { useMemo } from 'react';
import { Layer, handheld, useT } from '@kit/motion';
import { lerp, prog, rnd } from '@kit/theme';
import { Cam2D, Grain } from '@lib/2d/look';
import { Puff2D } from '@lib/2d/fx';
import { arcAngle, arcAt, arcPath } from '@lib/2d/path';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import { GlowLine2D, Kinzhal2D } from '../local/assets2d';

// Hằng số không gian mặt cắt bầu khí quyển 2D
const X_MIN = -600;
const X_MAX = 2900;
const UPPER_ATMO_Y = 440; // Ranh giới tầng bình lưu giữa
const DENSE_ATMO_Y = 732; // Ranh giới tầng khí quyển dày đặc bên dưới
const GROUND_Y = 1105;    // Mặt đất

// Hằng số quỹ đạo liên tục C1: bay ngang trên cao (142.6..149.6s) -> parabol quán tính (149.6..157.0s)
const T_CRUISE_0 = 142.6;
const T_DIVE_0 = 149.6;
const T_DIVE_END = 157.0;
const CRUISE_Y = 210;
const CRUISE_X0 = 310;
const CRUISE_X1 = 840; // Điểm bắt đầu uốn parabol rơi
const DIVE_X1 = 1980;
const DIVE_Y1 = 890;
// Đặt apex = (DIVE_Y1 - CRUISE_Y) / 4 = 170 để tiếp tuyến parabol tại s = 0 nằm ngang hoàn toàn (dy/ds = 0)
const DIVE_APEX = (DIVE_Y1 - CRUISE_Y) / 4;
const KIN_SCALE = 0.86;

function kinzhalState2D(tau: number): { x: number; y: number; rot: number; diveS: number } {
  if (tau <= T_DIVE_0) {
    const u = Math.max(0, (tau - T_CRUISE_0) / (T_DIVE_0 - T_CRUISE_0));
    return {
      x: lerp(CRUISE_X0, CRUISE_X1, u),
      y: CRUISE_Y,
      rot: 0,
      diveS: 0,
    };
  }
  const s = Math.min(1.08, (tau - T_DIVE_0) / (T_DIVE_END - T_DIVE_0));
  const [x, y] = arcAt(CRUISE_X1, CRUISE_Y, DIVE_X1, DIVE_Y1, DIVE_APEX, s);
  const rot = arcAngle(CRUISE_X1, CRUISE_Y, DIVE_X1, DIVE_Y1, DIVE_APEX, s);
  return { x, y, rot, diveS: s };
}

// Điểm tắt sạch nhiên liệu (148.28s) và điểm mũi chạm tầng khí quyển đặc (154.56s)
const BURNOUT_ST = kinzhalState2D(CUE.s10_burnout);
const HIT_ATMO_ST = kinzhalState2D(CUE.s10_hit_atmo);
const HIT_NOSE_X = HIT_ATMO_ST.x + Math.cos((HIT_ATMO_ST.rot * Math.PI) / 180) * (360 * KIN_SCALE);
const HIT_NOSE_Y = DENSE_ATMO_Y;

// Các hạt phân tử khí thể hiện sự chênh lệch mật độ rõ rệt giữa tầng loãng trên cao và tầng khí quyển dày đặc bên dưới
const ATMO_PARTICLES = (() => {
  const pts: { x: number; y: number; r: number; op: number; dense: boolean }[] = [];
  // Tầng trên cao: rất thưa và mờ
  for (let i = 0; i < 42; i++) {
    pts.push({
      x: -200 + rnd(i * 3 + 1) * 2700,
      y: 20 + rnd(i * 3 + 2) * (UPPER_ATMO_Y - 40),
      r: 1.5 + rnd(i * 3 + 3) * 1.8,
      op: 0.14 + rnd(i * 5 + 1) * 0.14,
      dense: false,
    });
  }
  // Tầng chuyển tiếp: mật độ trung bình
  for (let i = 0; i < 75; i++) {
    pts.push({
      x: -200 + rnd(i * 7 + 11) * 2700,
      y: UPPER_ATMO_Y + 12 + rnd(i * 7 + 12) * (DENSE_ATMO_Y - UPPER_ATMO_Y - 24),
      r: 1.8 + rnd(i * 7 + 13) * 2.2,
      op: 0.2 + rnd(i * 7 + 14) * 0.18,
      dense: false,
    });
  }
  // Tầng khí quyển dày đặc bên dưới: dày đặc hạt phân tử khí trắng-xanh
  for (let i = 0; i < 230; i++) {
    pts.push({
      x: -200 + rnd(i * 11 + 31) * 2700,
      y: DENSE_ATMO_Y + 10 + rnd(i * 11 + 32) * (GROUND_Y - DENSE_ATMO_Y - 25),
      r: 2.0 + rnd(i * 11 + 33) * 3.0,
      op: 0.28 + rnd(i * 11 + 34) * 0.34,
      dense: true,
    });
  }
  return pts;
})();

// Các dải vân khí quyển đặc nằm ngang
const DENSE_STREAKS = Array.from({ length: 18 }, (_, i) => ({
  x: -100 + (i % 6) * 440 + rnd(i * 13 + 5) * 180,
  y: DENSE_ATMO_Y + 28 + Math.floor(i / 6) * 110 + rnd(i * 13 + 7) * 55,
  w: 190 + rnd(i * 13 + 9) * 220,
  op: 0.16 + rnd(i * 13 + 11) * 0.18,
}));

const S10: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Dải núi 3 lớp dưới đáy mặt cắt khí quyển
  const ridgeFar = useMemo(() => skyline('s10_far', X_MIN, X_MAX, GROUND_Y - 88, 165, 720, GROUND_Y + 500), []);
  const ridgeMid = useMemo(() => skyline('s10_mid', X_MIN, X_MAX, GROUND_Y - 40, 110, 480, GROUND_Y + 500), []);
  const ridgeNear = useMemo(() => skyline('s10_near', X_MIN, X_MAX, GROUND_Y - 8, 58, 330, GROUND_Y + 500), []);

  const st = kinzhalState2D(t);
  const rotRad = (st.rot * Math.PI) / 180;
  const noseX = st.x + Math.cos(rotRad) * (360 * KIN_SCALE);
  const noseY = st.y + Math.sin(rotRad) * (360 * KIN_SCALE);

  // Lõi nhiên liệu rắn cháy lùi không phanh từ 100% về 0% đúng CUE.s10_burnout (148.28s)
  const burnProg = prog(t, 142.85, CUE.s10_burnout, (x) => x);
  const fuelRemain = Math.max(0, 1 - burnProg);

  // Ngọn lửa đuôi rực không thể hãm cho tới khi tắt phụt lúc 148.28s
  const burnoutCut = 1 - prog(t, CUE.s10_burnout - 0.08, CUE.s10_burnout + 0.14);
  const flame = t < CUE.s10_burnout + 0.15 ? (0.98 + 0.09 * Math.sin(t * 34)) * burnoutCut : 0;

  // Nhiệt ma sát khí quyển bừng sáng ở mũi khi đâm vào tầng khí quyển dày đặc lúc CUE.s10_hit_atmo (154.56s)
  const hitAtmoProg = prog(t, CUE.s10_hit_atmo - 0.18, CUE.s10_hit_atmo + 0.45);
  const heatGlow = hitAtmoProg;

  // Chuyển động <Cam2D>: Nửa đầu zoom cận 1.35 bám khoang thuốc phóng; từ 150.2s thu lùi mượt về 0.88 mở toàn cảnh khí quyển
  const pPullBack = prog(t, 150.1, 153.2);
  const pFollowDive = prog(t, 153.0, 156.7);

  const closeCamX = st.x - 42;
  const closeCamY = st.y - 12;
  const wideCamX = lerp(1280, 1455, pFollowDive);
  const wideCamY = lerp(615, 645, pFollowDive);

  const camX = lerp(closeCamX, wideCamX, pPullBack);
  const camY = lerp(closeCamY, wideCamY, pPullBack);
  const camZoom = lerp(1.35, 0.88, pPullBack);

  const impactAmp = t >= CUE.s10_hit_atmo ? 5.5 * (1 - 0.35 * prog(t, CUE.s10_hit_atmo, 156.7)) : 2.0;
  const shake = handheld(t, impactAmp, 's10_cam');

  // Đường quỹ đạo quán tính parabol đã bay và đường dự báo tới mặt đất
  const fullBallisticD = useMemo(
    () => arcPath(CRUISE_X1, CRUISE_Y, 2145, GROUND_Y, 224, 1, 64),
    [],
  );
  const flownDiveD = st.diveS > 0.005
    ? arcPath(CRUISE_X1, CRUISE_Y, DIVE_X1, DIVE_Y1, DIVE_APEX, Math.min(1, st.diveS), 48)
    : '';

  // Độ mờ cụm chỉ báo kỹ thuật cận cảnh buồng đốt (tự thu mờ khi kéo xa)
  const hudNearAlpha = 1 - prog(t, 149.8, 151.1);

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <Layer>
          <defs>
            {/* Gradient tổng thể bầu khí quyển từ tầng cao loãng xuống tầng đặc */}
            <linearGradient id="s10_sky_grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#050d19" />
              <stop offset="32%" stopColor={PAL2D.bgNight} />
              <stop offset="56%" stopColor={PAL2D.bgDeep} />
              <stop offset="75%" stopColor="#1e4973" />
              <stop offset="100%" stopColor="#4c82ad" />
            </linearGradient>

            {/* Dải tầng khí quyển dày đặc bên dưới (xanh trắng đậm dần) */}
            <linearGradient id="s10_dense_band" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#5bc8f5" stopOpacity={0.22} />
              <stop offset="35%" stopColor="#6fa0c7" stopOpacity={0.36} />
              <stop offset="78%" stopColor="#9ec5e2" stopOpacity={0.52} />
              <stop offset="100%" stopColor="#cfe3f2" stopOpacity={0.62} />
            </linearGradient>

            {/* Quầng sáng chấn động tại điểm đâm xuyên ranh giới khí quyển đặc */}
            <radialGradient id="s10_atmo_flash" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={PAL2D.amberHot} stopOpacity={0.85} />
              <stop offset="45%" stopColor={PAL2D.red} stopOpacity={0.38} />
              <stop offset="100%" stopColor={PAL2D.red} stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* 1. NỀN MẶT CẮT CÁC TẦNG MẬT ĐỘ KHÍ QUYỂN */}
          <rect x={X_MIN} y={-420} width={X_MAX - X_MIN} height={GROUND_Y + 420} fill="url(#s10_sky_grad)" />

          {/* Lưới toạ độ kỹ thuật mảnh trên nền tầng cao */}
          <g stroke={PAL2D.gridFine} strokeWidth={1} opacity={0.32}>
            {Array.from({ length: 24 }, (_, i) => (
              <line key={`gx_${i}`} x1={-400 + i * 140} y1={-360} x2={-400 + i * 140} y2={GROUND_Y} />
            ))}
            {Array.from({ length: 12 }, (_, j) => (
              <line key={`gy_${j}`} x1={X_MIN} y1={-240 + j * 120} x2={X_MAX} y2={-240 + j * 120} />
            ))}
          </g>

          {/* Tầng chuyển tiếp giữa (440..732) */}
          <rect
            x={X_MIN}
            y={UPPER_ATMO_Y}
            width={X_MAX - X_MIN}
            height={DENSE_ATMO_Y - UPPER_ATMO_Y}
            fill={PAL2D.bgSky}
            opacity={0.18}
          />
          <line
            x1={X_MIN}
            y1={UPPER_ATMO_Y}
            x2={X_MAX}
            y2={UPPER_ATMO_Y}
            stroke={PAL2D.grid}
            strokeWidth={1.8}
            strokeDasharray="14 12"
            opacity={0.45}
          />

          {/* TẦNG KHÍ QUYỂN DÀY ĐẶC BÊN DƯỚI (732..1105) */}
          <rect
            x={X_MIN}
            y={DENSE_ATMO_Y}
            width={X_MAX - X_MIN}
            height={GROUND_Y - DENSE_ATMO_Y}
            fill="url(#s10_dense_band)"
          />
          {/* Các vân mây/lớp khí đặc nằm ngang */}
          {DENSE_STREAKS.map((stLine, idx) => (
            <rect
              key={`ds_${idx}`}
              x={stLine.x - ((t - 142.8) * 14) % 160}
              y={stLine.y}
              width={stLine.w}
              height={8}
              rx={4}
              fill="#d8ecfa"
              opacity={stLine.op}
            />
          ))}
          {/* Ranh giới rõ nét của tầng khí quyển dày đặc */}
          <GlowLine2D
            d={`M${X_MIN} ${DENSE_ATMO_Y} L${X_MAX} ${DENSE_ATMO_Y}`}
            color={PAL2D.cyanSoft}
            core="#e8f7ff"
            width={3.2}
            opacity={0.78}
          />

          {/* Thước cột mật độ khí quyển bên trái biểu đồ (hình học trực quan: thưa ở trên -> đặc kín ở dưới) */}
          <g transform="translate(520 0)" opacity={0.35 + 0.55 * pPullBack}>
            <line x1={0} y1={80} x2={0} y2={GROUND_Y - 25} stroke={PAL2D.grid} strokeWidth={2} />
            {Array.from({ length: 18 }, (_, i) => {
              const py = 100 + i * 54;
              const density = Math.pow(i / 17, 1.85);
              return (
                <rect
                  key={`bar_${i}`}
                  x={8}
                  y={py}
                  width={12 + density * 64}
                  height={6}
                  rx={3}
                  fill={py >= DENSE_ATMO_Y ? PAL2D.cyanSoft : PAL2D.grid}
                  opacity={0.3 + density * 0.65}
                />
              );
            })}
          </g>

          {/* Hạt phân tử không khí theo 3 tầng mật độ */}
          <g>
            {ATMO_PARTICLES.map((pt, i) => (
              <circle
                key={`ap_${i}`}
                cx={pt.x}
                cy={pt.y}
                r={pt.r}
                fill={pt.dense ? '#e6f4ff' : PAL2D.cyanSoft}
                opacity={pt.op}
              />
            ))}
          </g>

          {/* Địa hình 3 lớp núi skyline & mặt đất bên dưới */}
          <path d={ridgeFar} fill={PAL2D.ridgeFar} opacity={0.85} />
          <path d={ridgeMid} fill={PAL2D.ridgeMid} />
          <path d={ridgeNear} fill={PAL2D.ridgeNear} />
          <rect x={X_MIN} y={GROUND_Y} width={X_MAX - X_MIN} height={520} fill={PAL2D.ground} />
          <line x1={X_MIN} y1={GROUND_Y} x2={X_MAX} y2={GROUND_Y} stroke={PAL2D.groundLine} strokeWidth={4} />

          {/* Vòng tâm mục tiêu dưới mặt đất ở cuối nhánh parabol */}
          <g transform={`translate(2145 ${GROUND_Y})`} opacity={pPullBack * 0.85}>
            <ellipse cx={0} cy={0} rx={52} ry={14} fill="none" stroke={PAL2D.red} strokeWidth={2.6} />
            <ellipse cx={0} cy={0} rx={22} ry={6} fill={PAL2D.red} opacity={0.45} />
          </g>

          {/* 2. ĐƯỜNG QUỸ ĐẠO CHÁY ĐỘNG CƠ -> TẮT LỬA -> PARABOL QUÁN TÍNH */}
          {/* Vệt lửa cam khi còn nhiên liệu rắn (dịu dần tự nhiên sau khi động cơ tắt lúc 148.28s) */}
          <GlowLine2D
            d={`M${CRUISE_X0 - 260} ${CRUISE_Y} L${Math.min(st.x - 315, BURNOUT_ST.x - 315)} ${CRUISE_Y}`}
            color={PAL2D.amber}
            core={PAL2D.amberHot}
            width={6}
            opacity={0.72 * (1 - 0.55 * prog(t, CUE.s10_burnout, CUE.s10_burnout + 1.8))}
          />

          {/* Đường dự báo parabol quán tính nét đứt */}
          {t >= CUE.s10_burnout && (
            <path
              d={fullBallisticD}
              fill="none"
              stroke={PAL2D.muted}
              strokeWidth={2.6}
              strokeDasharray="12 12"
              opacity={0.45 * prog(t, CUE.s10_burnout, 151.8)}
            />
          )}

          {/* Vệt quỹ đạo quán tính xám lạnh không còn lửa sau khi burnout */}
          {t > CUE.s10_burnout && (
            <path
              d={`M${BURNOUT_ST.x} ${BURNOUT_ST.y} L${Math.min(st.x, CRUISE_X1)} ${CRUISE_Y}`}
              fill="none"
              stroke="#9fb3c8"
              strokeWidth={3.5}
              strokeDasharray="8 6"
              opacity={0.65}
            />
          )}
          {flownDiveD && (
            <GlowLine2D
              d={flownDiveD}
              color={t >= CUE.s10_hit_atmo ? PAL2D.amber : '#8da9c4'}
              core="#e8f1f8"
              width={3.6}
              opacity={0.75}
            />
          )}

          {/* Dấu mốc điểm cạn sạch nhiên liệu (Burnout Marker) hiện rõ khi thu lùi toàn cảnh, không đè lên thanh HUD */}
          {t >= 149.7 && (
            <g transform={`translate(${BURNOUT_ST.x} ${BURNOUT_ST.y - 68})`} opacity={prog(t, 149.7, 150.45)}>
              <line x1={0} y1={12} x2={0} y2={58} stroke={PAL2D.red} strokeWidth={2.2} strokeDasharray="4 4" />
              <circle cx={0} cy={0} r={14} fill="#141c28" stroke={PAL2D.red} strokeWidth={2.6} />
              <line x1={-7} y1={-7} x2={7} y2={7} stroke={PAL2D.red} strokeWidth={2.6} />
              <line x1={7} y1={-7} x2={-7} y2={7} stroke={PAL2D.red} strokeWidth={2.6} />
            </g>
          )}

          {/* Khói xám mỏng Puff2D lơ lửng thoát ra từ loa phụt ngay khi động cơ rắn vừa cháy cạn tắt phụt */}
          {t >= CUE.s10_burnout &&
            Array.from({ length: 11 }, (_, i) => {
              const born = CUE.s10_burnout + i * 0.22;
              const age = t - born;
              if (age < 0 || age > 4.6) return null;
              const bSt = kinzhalState2D(born);
              const bRad = (bSt.rot * Math.PI) / 180;
              const px = bSt.x - Math.cos(bRad) * (365 * KIN_SCALE) - age * 28;
              const py = bSt.y - Math.sin(bRad) * (365 * KIN_SCALE) + (rnd(i * 9 + 2) - 0.5) * 18 - age * 5;
              const lifeK = 1 - age / 4.6;
              return (
                <Puff2D
                  key={`bo_puff_${i}`}
                  seed={100 + i}
                  x={px}
                  y={py}
                  r={14 + age * 11}
                  color="#95a2b0"
                  opacity={0.52 * lifeK}
                />
              );
            })}

          {/* Hiệu ứng gợn sóng chấn động tại mặt ranh giới khí quyển đặc lúc CUE.s10_hit_atmo (154.56s) */}
          {t >= CUE.s10_hit_atmo - 0.05 && (
            <g transform={`translate(${HIT_NOSE_X} ${HIT_NOSE_Y})`}>
              {(() => {
                const dtHit = Math.max(0, t - CUE.s10_hit_atmo);
                const fade = Math.max(0, 1 - dtHit / 2.1);
                return (
                  <>
                    <circle cx={0} cy={0} r={95 + dtHit * 130} fill="url(#s10_atmo_flash)" opacity={fade} />
                    <ellipse
                      cx={0}
                      cy={0}
                      rx={45 + dtHit * 240}
                      ry={12 + dtHit * 32}
                      fill="none"
                      stroke={PAL2D.amberHot}
                      strokeWidth={3.2}
                      opacity={fade * 0.85}
                    />
                    <ellipse
                      cx={0}
                      cy={0}
                      rx={25 + dtHit * 145}
                      ry={8 + dtHit * 20}
                      fill="none"
                      stroke={PAL2D.cyanSoft}
                      strokeWidth={2.2}
                      opacity={fade * 0.7}
                    />
                  </>
                );
              })()}
            </g>
          )}

          {/* 3. CHỦ THỂ CHÍNH: TÊN LỬA KINZHAL2D CÓ CỬA SỔ MẶT CẮT THUỐC PHÓNG RẮN (BÓNG ĐỔ VECTOR AN TOÀN TRONG CAM2D) */}
          <g opacity={0.34} transform="translate(0 14)">
            <g transform={`translate(${st.x} ${st.y}) rotate(${st.rot}) scale(${KIN_SCALE})`}>
              <path d="M-352 -42 L60 -42 L210 -31 L360 0 L210 31 L60 42 L-352 42 Z" fill="#050b14" />
            </g>
          </g>
          <Kinzhal2D
            x={st.x}
            y={st.y}
            scale={KIN_SCALE}
            rot={st.rot}
            flame={flame}
            heatGlow={heatGlow}
            showCutaway={true}
            fuelRemain={fuelRemain}
          />

          {/* Sóng xung kích nén khí chữ V (Bow-Shock) bọc quanh mũi Kinzhal khi cày sâu vào tầng khí quyển đặc */}
          {heatGlow > 0.04 && (
            <g transform={`translate(${noseX} ${noseY}) rotate(${st.rot})`} opacity={heatGlow}>
              <GlowLine2D
                d="M -235 -128 Q -35 -48 16 0 Q -35 48 -235 128"
                color={PAL2D.red}
                core={PAL2D.amberHot}
                width={4.4}
                opacity={0.88}
              />
              <GlowLine2D
                d="M -150 -74 Q -20 -26 8 0 Q -20 26 -150 74"
                color={PAL2D.amber}
                core="#ffffff"
                width={3.0}
                opacity={0.92}
              />
              {/* Tia lửa plasma tước dọc hai bên sườn mũi */}
              {[-1, 1].map((side) =>
                [0, 1, 2].map((k) => {
                  const phase = ((t * 4.5 + k * 0.33) % 1);
                  const sx = -25 - phase * 195;
                  const sy = side * (16 + phase * 82);
                  return (
                    <circle
                      key={`sp_${side}_${k}`}
                      cx={sx}
                      cy={sy}
                      r={3.5 * (1 - phase * 0.6)}
                      fill={PAL2D.amberHot}
                      opacity={1 - phase}
                    />
                  );
                }),
              )}
            </g>
          )}

          {/* 4. ĐỒ HOẠ KỸ THUẬT CẬN CẢNH TRÊN KHOANG ĐỐT (NỬA ĐẦU: KHÔNG THỂ ĐIỀU CHỈNH LỰC ĐẨY) */}
          {hudNearAlpha > 0.01 && (
            <g transform={`translate(${st.x - 115} ${st.y - 98})`} opacity={hudNearAlpha}>
              {/* Đường dóng xuống mặt cháy lõi nhiên liệu rắn */}
              <line
                x1={-143 + 288 * (1 - fuelRemain)}
                y1={28}
                x2={-143 + 288 * (1 - fuelRemain)}
                y2={58}
                stroke={fuelRemain > 0.01 ? PAL2D.amberHot : PAL2D.red}
                strokeWidth={2.2}
                strokeDasharray="4 3"
              />
              <circle
                cx={-143 + 288 * (1 - fuelRemain)}
                cy={28}
                r={4.5}
                fill={fuelRemain > 0.01 ? PAL2D.amberHot : PAL2D.red}
              />

              {/* Khung thanh mức thuốc phóng rắn & biểu tượng van tiết lưu bị khoá gạch chéo */}
              <rect
                x={-155}
                y={-22}
                width={312}
                height={34}
                rx={7}
                fill="#0b1522"
                stroke={fuelRemain > 0.01 ? PAL2D.amber : PAL2D.red}
                strokeWidth={2}
                opacity={0.92}
              />
              {/* Thanh nhiên liệu rút cạn không phanh từ trái sang phải */}
              {fuelRemain > 0.005 && (
                <rect
                  x={-145 + 246 * (1 - fuelRemain)}
                  y={-13}
                  width={246 * fuelRemain}
                  height={16}
                  rx={4}
                  fill={PAL2D.amber}
                />
              )}
              {/* Các vạch chia phần tư trên thanh nhiên liệu */}
              {[0.25, 0.5, 0.75].map((q) => (
                <line
                  key={q}
                  x1={-145 + 246 * q}
                  y1={-15}
                  x2={-145 + 246 * q}
                  y2={5}
                  stroke="#0b1522"
                  strokeWidth={2}
                  opacity={0.7}
                />
              ))}

              {/* Biểu tượng kỹ thuật: Van điều tiết lực đẩy bị gạch chéo khoá cứng (không có van tiết lưu) */}
              <g transform="translate(128 -5)">
                <circle cx={0} cy={0} r={12} fill="#182230" stroke={PAL2D.pacLight} strokeWidth={1.8} />
                <line x1={-7} y1={0} x2={7} y2={0} stroke={PAL2D.amberHot} strokeWidth={2.4} />
                <circle cx={0} cy={0} r={3} fill={PAL2D.amberHot} />
                {/* Vòng tròn cấm / gạch chéo đỏ */}
                <circle cx={0} cy={0} r={13.5} fill="none" stroke={PAL2D.red} strokeWidth={2.4} />
                <line x1={-9.5} y1={-9.5} x2={9.5} y2={9.5} stroke={PAL2D.red} strokeWidth={2.6} />
              </g>
            </g>
          )}
        </Layer>
      </Cam2D>
      <Grain opacity={0.35} />
    </>
  );
};

export default S10;
