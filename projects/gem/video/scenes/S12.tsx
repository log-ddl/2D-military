import React, { useMemo } from 'react';
import { Easing } from 'remotion';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  ScanEagle2D,
  Shahed2D,
  Kurfs2D,
  TacticalGrid2D,
} from '../local/draw2d';
import { useT, useSpring, handheld, Layer } from '@kit/motion';
import { prog, lerp } from '@kit/theme';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { contours } from '@lib/2d/terrain';

// Hành lang bay tiếp cận hẹp về Tháp 22 (nghiêng 7.6 độ từ trái-trên xuống căn cứ bên phải)
const BASE_X = 1525;
const BASE_Y = 535;
const CORR_ANG = 7.6;
const CORR_RAD = (CORR_ANG * Math.PI) / 180;
const COS_C = Math.cos(CORR_RAD);
const SIN_C = Math.sin(CORR_RAD);

const corridorPt = (distFromBase: number, lateralOffset = 0): [number, number] => [
  BASE_X - distFromBase * COS_C - lateralOffset * SIN_C,
  BASE_Y - distFromBase * SIN_C + lateralOffset * COS_C,
];

/** Tạo chuỗi điểm đa giác đều 5 cạnh (biểu tượng Lầu Năm Góc - Pentagon). */
const pentagonPoints = (cx: number, cy: number, r: number): string =>
  Array.from({ length: 5 }, (_, i) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

const S12: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const mapContours = useMemo(() => contours('s12_rukban_iff', 2400, 1400, 8, 22, 540), []);

  // Nửa đầu (222.68 - 231.80s): Sơ đồ giả thuyết báo chí "UAV địch bám đuôi UAV Mỹ gây nhầm IFF & khóa hỏa lực"
  const pFlight = prog(t, 222.68, 231.8, Easing.linear);
  const pTailMerge = prog(t, 223.3, CUE.s12_myth_tail + 0.4);
  const pIffConfuse = prog(t, CUE.s12_myth_tail + 0.2, CUE.s12_myth_tail + 1.25);
  const pFireLock = prog(t, CUE.s12_myth_tail + 1.35, CUE.s12_myth_tail + 2.1);
  const spFireLock = useSpring(t, CUE.s12_myth_tail + 1.35, 12, 165);

  // Nửa sau (231.80 - 237.06s): Hồ sơ Lầu Năm Góc gạch chéo đỏ đậm xóa sổ sơ đồ giả thuyết & mở mặt cắt phòng trực BDOC tối lạnh
  const pSlash1 = prog(t, CUE.s12_debunk, CUE.s12_debunk + 0.34);
  const pSlash2 = prog(t, CUE.s12_debunk + 0.18, CUE.s12_debunk + 0.52);
  const pReveal = prog(t, CUE.s12_debunk + 0.45, CUE.s12_debunk + 1.35);
  const spPentagon = useSpring(t, CUE.s12_debunk + 0.4, 13, 150);

  // Vị trí ScanEagle Mỹ bay trước trên hành lang quay về căn cứ
  const usDist = lerp(960, 500, pFlight);
  const [usX, usY] = corridorPt(usDist, 0);

  // Vị trí Shahed đỏ bám sát ngay sau đuôi ScanEagle ~226 px (mũi sát cánh quạt đuôi, không chồng lấn hình học)
  const enemyDist = usDist + lerp(285, 226, pTailMerge);
  const enemyLat = lerp(-145, 0, pTailMerge);
  const [shX, shY] = corridorPt(enemyDist, enemyLat);
  const shRot = CORR_ANG + lerp(16, 0, pTailMerge);

  // Tâm khung nhận diện bạn-thù IFF bọc chung cả 2 máy bay
  const pairMidX = (usX + shX) * 0.5 + 14;
  const pairMidY = (usY + shY) * 0.5 + 2;

  // Quạt quét radar thẩm vấn IFF từ căn cứ
  const sweepDeg = 180 + CORR_ANG + Math.sin(t * 2.1) * 20;
  const sweepRad = (sweepDeg * Math.PI) / 180;
  const fanHalf = 0.16;

  // Cam2D: Nửa đầu bám dọc sơ đồ hành lang IFF; Nửa sau mở bố cục đối sánh tờ giả thuyết bị gạch X đỏ bên trái & phòng trực BDOC lạnh gáy bên phải
  const camX = lerp(lerp(930, 1020, pFlight), 980, pReveal);
  const camY = lerp(535, 540, pReveal);
  const camZoom = lerp(1.0, 1.04, prog(t, CUE.s12_debunk + 0.4, 237.0));
  const debShake = t >= CUE.s12_debunk && t < CUE.s12_debunk + 0.55 ? 7 : 2.0;
  const shake = handheld(t, debShake, 's12_iff');

  const iffAlt = Math.sin(t * 11) > 0;

  // Khi mở mặt cắt BDOC (pReveal: 0 -> 1), sơ đồ giả thuyết thu gọn mượt về bên trái trong vùng an toàn kèm nguyên dấu X đỏ đậm bên trên
  const mythScale = lerp(1, 0.34, pReveal);
  const mythTx = lerp(0, 18, pReveal);
  const mythTy = lerp(0, 335, pReveal);
  const mythRot = lerp(0, -3.2, pReveal);

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgNight}>
        <Layer>
          <Defs2D shadow="rgba(4, 9, 18, 0.65)" />
          <defs>
            <radialGradient id="s12BgGrad" cx="54%" cy="50%" r="68%">
              <stop offset="0%" stopColor={PAL2D.panel} />
              <stop offset="60%" stopColor={PAL2D.bgSlate} />
              <stop offset="100%" stopColor={PAL2D.bgNight} />
            </radialGradient>
            <linearGradient id="s12ScreenCone" x1="0%" y1="50%" x2="100%" y2="50%">
              <stop offset="0%" stopColor="#63c8ff" stopOpacity={0.48} />
              <stop offset="50%" stopColor="#268be0" stopOpacity={0.2} />
              <stop offset="100%" stopColor="#091526" stopOpacity={0} />
            </linearGradient>
            <clipPath id="s12BdocClip">
              <rect x={636} y={214} width={1148} height={652} rx={8} />
            </clipPath>
          </defs>

          {/* 1. NỀN BẢN ĐỒ CHIẾN THUẬT & LƯỚI ĐỒNG MỨC */}
          <rect x={-300} y={-220} width={2560} height={1520} fill="url(#s12BgGrad)" />
          <g transform="translate(-220 -150)" opacity={0.22}>
            {mapContours.map((c) => (
              <path
                key={c.level}
                d={c.d}
                fill="none"
                stroke={c.level % 3 === 0 ? PAL2D.sandMid : PAL2D.grid}
                strokeWidth={c.level % 3 === 0 ? 1.5 : 0.9}
              />
            ))}
          </g>
          <TacticalGrid2D x={-300} y={-220} w={2560} h={1520} step={80} major={320} opacity={0.25} />

          {/* ========================================================================== */}
          {/* 2. SƠ ĐỒ GIẢ THUYẾT BÁM ĐUÔI NHẬN NHẦM IFF + HAI NÉT GẠCH CHÉO ĐỎ ĐẬM XÓA SỔ */}
          {/* ========================================================================== */}
          <g
            transform={`translate(${mythTx} ${mythTy}) rotate(${mythRot} 960 540) scale(${mythScale})`}
            opacity={lerp(1, 0.92, pReveal)}
          >
            {/* Khung thẻ hồ sơ giả thuyết truyền thông khi bị ghim sang bên trái ở nửa sau */}
            {pReveal > 0.02 && (
              <rect
                x={140}
                y={120}
                width={1580}
                height={840}
                rx={26}
                fill="#0b1829"
                fillOpacity={0.94 * pReveal}
                stroke={PAL2D.threatMid}
                strokeWidth={6}
                opacity={pReveal}
              />
            )}

            {/* Vòng cự ly thẩm vấn IFF đồng tâm quanh căn cứ Tháp 22 */}
            {[210, 390, 580, 780, 990].map((r, idx) => (
              <circle
                key={r}
                cx={BASE_X}
                cy={BASE_Y}
                r={r}
                fill="none"
                stroke={idx % 2 === 0 ? PAL2D.usMid : PAL2D.grid}
                strokeWidth={idx === 2 ? 2.2 : 1.3}
                strokeDasharray={idx % 2 === 0 ? '12 8' : '4 8'}
                opacity={0.4}
              />
            ))}

            {/* Vòng xung sóng thẩm vấn IFF lan từ đài radar căn cứ quét dọc hành lang */}
            {[0, 1].map((pIdx) => {
              const ph = (t * 0.55 + pIdx * 0.5) % 1;
              const pr = 110 + ph * 960;
              return (
                <path
                  key={`iff_wave_${pIdx}`}
                  d={`M${BASE_X - pr * 0.94} ${BASE_Y - pr * 0.34} A${pr} ${pr} 0 0 0 ${BASE_X - pr * 0.98} ${BASE_Y + pr * 0.2}`}
                  fill="none"
                  stroke={pIffConfuse > 0.4 ? PAL2D.amberHi : PAL2D.ewTeal}
                  strokeWidth={3}
                  opacity={(1 - ph) * 0.65}
                />
              );
            })}

            {/* Quạt sóng quét radar thẩm vấn IFF */}
            <path
              d={`M${BASE_X} ${BASE_Y} L${BASE_X + Math.cos(sweepRad - fanHalf) * 1080} ${BASE_Y + Math.sin(sweepRad - fanHalf) * 1080} A1080 1080 0 0 1 ${BASE_X + Math.cos(sweepRad + fanHalf) * 1080} ${BASE_Y + Math.sin(sweepRad + fanHalf) * 1080} Z`}
              fill={pIffConfuse > 0.4 ? PAL2D.amberMid : PAL2D.ewTeal}
              opacity={0.12}
            />
            <line
              x1={BASE_X}
              y1={BASE_Y}
              x2={BASE_X + Math.cos(sweepRad) * 1080}
              y2={BASE_Y + Math.sin(sweepRad) * 1080}
              stroke={pIffConfuse > 0.4 ? PAL2D.amberHi : PAL2D.ewTeal}
              strokeWidth={2.5}
              opacity={0.68}
            />

            {/* Dải hành lang bay tiếp cận hẹp */}
            <g transform={`translate(${BASE_X} ${BASE_Y}) rotate(${CORR_ANG + 180})`}>
              <rect x={95} y={-60} width={1340} height={120} fill={PAL2D.usMid} opacity={0.12} />
              <line x1={95} y1={-60} x2={1435} y2={-60} stroke={PAL2D.usHi} strokeWidth={2.4} strokeDasharray="16 10" opacity={0.72} />
              <line x1={95} y1={60} x2={1435} y2={60} stroke={PAL2D.usHi} strokeWidth={2.4} strokeDasharray="16 10" opacity={0.72} />
              <line x1={95} y1={0} x2={1435} y2={0} stroke={PAL2D.usMid} strokeWidth={1.6} strokeDasharray="6 10" opacity={0.48} />
              {[240, 460, 680, 900, 1120, 1340].map((cx) => (
                <path
                  key={cx}
                  d={`M${cx + 14} -16 L${cx - 8} 0 L${cx + 14} 16`}
                  fill="none"
                  stroke={PAL2D.usHi}
                  strokeWidth={2.5}
                  opacity={0.4}
                />
              ))}
            </g>

            {/* Căn cứ Tháp 22 nhìn bằng ở đầu phải hành lang */}
            <g transform={`translate(${BASE_X} ${BASE_Y})`}>
              <polygon
                points="-88,-74 62,-84 96,-24 84,76 -58,88 -102,22"
                fill="#13273f"
                stroke={PAL2D.sandMid}
                strokeWidth={3.6}
              />
              <polygon
                points="-74,-60 50,-68 78,-18 68,62 -48,72 -84,18"
                fill="none"
                stroke={PAL2D.concreteMid}
                strokeWidth={1.8}
                strokeDasharray="10 5"
              />
              {[-36, -12, 12].map((ry, i) => (
                <g key={i}>
                  <rect x={-46} y={ry} width={34} height={13} rx={2} fill={PAL2D.panelHi} stroke={PAL2D.usHi} strokeWidth={1.4} />
                  <rect x={4} y={ry} width={34} height={13} rx={2} fill={PAL2D.panelHi} stroke={PAL2D.usHi} strokeWidth={1.4} />
                </g>
              ))}
              <circle cx={0} cy={-42} r={16} fill={PAL2D.bgConsole} stroke={PAL2D.ewTeal} strokeWidth={2.6} />
              <circle cx={0} cy={-42} r={5} fill={PAL2D.ewTeal} />
            </g>

            {/* Đường bay ScanEagle xanh & đường bám đuôi của Shahed đỏ */}
            <line
              x1={corridorPt(1390, 0)[0]}
              y1={corridorPt(1390, 0)[1]}
              x2={usX}
              y2={usY}
              stroke={PAL2D.usHi}
              strokeWidth={3}
              opacity={0.55}
            />
            <path
              d={`M${corridorPt(1380, -185)[0]} ${corridorPt(1380, -185)[1]} Q${corridorPt(1070, -150)[0]} ${corridorPt(1070, -150)[1]} ${shX} ${shY}`}
              fill="none"
              stroke={PAL2D.threatMid}
              strokeWidth={3.4}
              strokeDasharray="10 7"
              opacity={0.88}
            />

            {/* Vùng núp bóng khí động sát sau đuôi ScanEagle */}
            {pTailMerge > 0.15 && (
              <g transform={`translate(${usX} ${usY}) rotate(${CORR_ANG})`} opacity={0.26 * pTailMerge}>
                <polygon points="-34,-18 -275,-58 -275,58 -34,18" fill={PAL2D.threatMid} />
              </g>
            )}

            {/* Máy bay Mỹ ScanEagle2D bay trước về căn cứ */}
            <g>
              <circle
                cx={usX}
                cy={usY}
                r={78}
                fill="none"
                stroke={PAL2D.usHi}
                strokeWidth={2.3}
                strokeDasharray="8 6"
                opacity={0.78}
              />
              {[0, 1].map((w) => {
                const ph = (t * 1.4 + w * 0.5) % 1;
                const r = 34 + ph * 68;
                return (
                  <path
                    key={w}
                    d={`M${usX + r * 0.7} ${usY - r * 0.55} A${r} ${r} 0 0 1 ${usX + r * 0.55} ${usY + r * 0.7}`}
                    fill="none"
                    stroke={PAL2D.ewTeal}
                    strokeWidth={2.5}
                    opacity={(1 - ph) * 0.82}
                  />
                );
              })}
              <ScanEagle2D x={usX} y={usY} rot={CORR_ANG} scale={2.15} view="top" propAngle={t * 36} />
            </g>

            {/* Máy bay địch Shahed2D đỏ bám sát ngay sau cánh quạt đuôi ScanEagle */}
            <g>
              <circle
                cx={shX}
                cy={shY}
                r={74}
                fill={PAL2D.threatMid}
                fillOpacity={0.13}
                stroke={PAL2D.threatMid}
                strokeWidth={2.3}
                strokeDasharray="6 5"
              />
              <Shahed2D x={shX} y={shY} rot={shRot} scale={1.85} view="top" propAngle={t * 40} tint="threat" />
            </g>

            {/* KHUNG NHẬN NHẦM BẠN-THÙ IFF (NỬA TRƯỚC XANH BẠN - NỬA SAU VÀNG/ĐỎ THÙ CHẬP LÀM MỘT) */}
            {pIffConfuse > 0.02 && (
              <g transform={`translate(${pairMidX} ${pairMidY}) rotate(${CORR_ANG})`} opacity={pIffConfuse}>
                <rect
                  x={-228}
                  y={-96}
                  width={228}
                  height={192}
                  fill={PAL2D.amberMid}
                  fillOpacity={0.12}
                />
                <rect
                  x={0}
                  y={-96}
                  width={198}
                  height={192}
                  fill={PAL2D.usMid}
                  fillOpacity={0.12}
                />
                <rect
                  x={-228}
                  y={-96}
                  width={426}
                  height={192}
                  rx={12}
                  fill="none"
                  stroke={iffAlt ? PAL2D.amberHi : PAL2D.usHi}
                  strokeWidth={3.8}
                  strokeDasharray="18 8"
                />
                <path d="M-228 -58 L-228 -96 L-180 -96" fill="none" stroke={PAL2D.threatHi} strokeWidth={5.5} />
                <path d="M-228 58 L-228 96 L-180 96" fill="none" stroke={PAL2D.threatHi} strokeWidth={5.5} />
                <path d="M150 -96 L198 -96 L198 -58" fill="none" stroke={PAL2D.usHi} strokeWidth={5.5} />
                <path d="M150 96 L198 96 L198 58" fill="none" stroke={PAL2D.usHi} strokeWidth={5.5} />

                {/* Huy hiệu hai sóng đáp trả IFF bạn-thù xoắn rối vào nhau */}
                <g transform="translate(-14 -132)">
                  <rect
                    x={-92}
                    y={-29}
                    width={184}
                    height={58}
                    rx={29}
                    fill={PAL2D.bgConsole}
                    stroke={PAL2D.amberHi}
                    strokeWidth={3.2}
                  />
                  <path d="M-68 0 Q-50 -19 -34 0 T0 0 T34 0 T68 0" fill="none" stroke={PAL2D.usHi} strokeWidth={3.2} />
                  <path d="M-68 4 Q-48 21 -30 -2 T8 4 T44 -4 T68 2" fill="none" stroke={PAL2D.threatMid} strokeWidth={3.2} />
                  <polygon points="0,-20 20,0 0,20 -20,0" fill={PAL2D.amberMid} stroke={PAL2D.ink} strokeWidth={2} />
                  <rect x={-2.5} y={-10} width={5} height={12} rx={1.5} fill={PAL2D.ink} />
                  <circle cx={0} cy={7} r={2.8} fill={PAL2D.ink} />
                </g>
              </g>
            )}

            {/* TRẠM HỎA LỰC PHÒNG KHÔNG & BIỂU TƯỢNG Ổ KHÓA HỎA LỰC */}
            <g>
              {pIffConfuse > 0.2 && (
                <line
                  x1={1325}
                  y1={752}
                  x2={pairMidX + 20}
                  y2={pairMidY + 58}
                  stroke={pFireLock > 0.2 ? PAL2D.amberMid : PAL2D.usHi}
                  strokeWidth={3.4}
                  strokeDasharray="10 8"
                  opacity={0.88}
                />
              )}

              <g transform="translate(1330 850)">
                <ellipse cx={0} cy={4} rx={88} ry={22} fill="#0a1524" opacity={0.65} />
                <Kurfs2D x={0} y={0} scale={1.08} active={pFireLock < 0.3} />
              </g>

              {pFireLock > 0.02 && (
                <g
                  transform={`translate(1165 708) scale(${Math.min(1.1, spFireLock)})`}
                  opacity={pFireLock}
                  filter="url(#sh)"
                >
                  <polygon
                    points="-34,-72 34,-72 72,-34 72,34 34,72 -34,72 -72,34 -72,-34"
                    fill={PAL2D.bgConsole}
                    stroke={PAL2D.amberHi}
                    strokeWidth={4.8}
                  />
                  <polygon
                    points="-28,-61 28,-61 61,-28 61,28 28,61 -28,61 -61,28 -61,-28"
                    fill={PAL2D.amberLo}
                    fillOpacity={0.3}
                    stroke={PAL2D.amberMid}
                    strokeWidth={2}
                  />
                  <circle cx={0} cy={4} r={42} fill="none" stroke={PAL2D.threatMid} strokeWidth={2.6} opacity={0.58} />
                  <line x1={-48} y1={4} x2={48} y2={4} stroke={PAL2D.threatMid} strokeWidth={2.2} opacity={0.58} />
                  <line x1={0} y1={-44} x2={0} y2={52} stroke={PAL2D.threatMid} strokeWidth={2.2} opacity={0.58} />

                  <path
                    d="M-20 -6 L-20 -23 A20 20 0 0 1 20 -23 L20 -6"
                    fill="none"
                    stroke={PAL2D.amberHi}
                    strokeWidth={9}
                    strokeLinecap="round"
                  />
                  <path
                    d="M-20 -6 L-20 -23 A20 20 0 0 1 20 -23 L20 -6"
                    fill="none"
                    stroke={PAL2D.paper}
                    strokeWidth={3.2}
                    strokeLinecap="round"
                  />
                  <rect
                    x={-32}
                    y={-7}
                    width={64}
                    height={48}
                    rx={7}
                    fill={PAL2D.amberMid}
                    stroke={PAL2D.ink}
                    strokeWidth={3.2}
                  />
                  <rect x={-27} y={-3} width={54} height={12} rx={3} fill={PAL2D.amberHi} opacity={0.78} />
                  <circle cx={0} cy={13} r={6.8} fill={PAL2D.ink} />
                  <polygon points="-3.8,15 3.8,15 5.8,30 -5.8,30" fill={PAL2D.ink} />
                </g>
              )}
            </g>

            {/* HAI NÉT GẠCH CHÉO ĐỎ ĐẬM ĐÈ LÊN TRÊN SƠ ĐỒ GIẢ THUYẾT TẠI 231.80s (LUÔN HIỆN RÕ CẢ KHI THU VỀ GÓC TRÁI!) */}
            {pSlash1 > 0.01 && (
              <g>
                <line
                  x1={205}
                  y1={165}
                  x2={1665}
                  y2={905}
                  stroke={PAL2D.ink}
                  strokeWidth={42}
                  strokeLinecap="round"
                  {...drawOn(1640, pSlash1)}
                />
                <line
                  x1={205}
                  y1={165}
                  x2={1665}
                  y2={905}
                  stroke={PAL2D.threatMid}
                  strokeWidth={28}
                  strokeLinecap="round"
                  {...drawOn(1640, pSlash1)}
                />
                {pSlash2 > 0.01 && (
                  <>
                    <line
                      x1={1665}
                      y1={165}
                      x2={205}
                      y2={905}
                      stroke={PAL2D.ink}
                      strokeWidth={42}
                      strokeLinecap="round"
                      {...drawOn(1640, pSlash2)}
                    />
                    <line
                      x1={1665}
                      y1={165}
                      x2={205}
                      y2={905}
                      stroke={PAL2D.threatMid}
                      strokeWidth={28}
                      strokeLinecap="round"
                      {...drawOn(1640, pSlash2)}
                    />
                  </>
                )}
              </g>
            )}
          </g>

          {/* ========================================================================== */}
          {/* 3. HỒ SƠ GIẢI MẬT LẦU NĂM GÓC (5 CẠNH) & MẶT CẮT PHÒNG TRỰC BDOC TỐI LẠNH */}
          {/* ========================================================================== */}
          {pReveal > 0.01 && (
            <g
              opacity={pReveal}
              transform={`translate(1210 540) scale(${lerp(0.92, 1, pReveal)}) translate(-1210 -540)`}
            >
              {/* Khung tường bê tông mặt cắt kiến trúc phòng điều hành phòng thủ căn cứ (BDOC) */}
              <g filter="url(#sh)">
                <rect
                  x={610}
                  y={188}
                  width={1200}
                  height={704}
                  rx={12}
                  fill="#233040"
                  stroke={PAL2D.paperDim}
                  strokeWidth={4}
                />
                {/* Ký hiệu gạch chéo mặt cắt tường bê tông */}
                <g stroke={PAL2D.concreteLo} strokeWidth={1.6} opacity={0.42}>
                  {Array.from({ length: 28 }, (_, i) => {
                    const hx = 630 + i * 42;
                    return (
                      <React.Fragment key={i}>
                        <line x1={hx} y1={190} x2={hx - 18} y2={212} />
                        <line x1={hx} y1={868} x2={hx - 18} y2={890} />
                      </React.Fragment>
                    );
                  })}
                </g>

                {/* Lòng phòng trực BDOC tối lạnh */}
                <rect
                  x={636}
                  y={214}
                  width={1148}
                  height={652}
                  rx={8}
                  fill="#050b14"
                  stroke={PAL2D.ink}
                  strokeWidth={3}
                />
              </g>

              {/* Trên nóc hầm BDOC ngoài trời đêm: còi báo động tắt ngúm & đầu kính NightHawk quay đi hướng khác */}
              <g transform="translate(1510 188)" opacity={0.9}>
                <rect x={-105} y={-16} width={210} height={16} rx={4} fill={PAL2D.hescoLo} stroke={PAL2D.ink} strokeWidth={2} />
                <line x1={25} y1={-16} x2={25} y2={-82} stroke={PAL2D.concreteLo} strokeWidth={4.5} />
                <polygon points="25,-64 54,-76 54,-52" fill={PAL2D.concreteMid} stroke={PAL2D.ink} strokeWidth={2} />
                <polygon points="25,-64 -4,-76 -4,-52" fill={PAL2D.concreteLo} stroke={PAL2D.ink} strokeWidth={2} />
                <circle cx={25} cy={-88} r={6.5} fill="#3d1114" stroke={PAL2D.ink} strokeWidth={1.8} />
              </g>

              {/* NỘI THẤT PHÒNG TRỰC BDOC TỐI LẠNH VỚI ÁNH SÁNG MÀN HÌNH XANH HẮT VÀO BÓNG KÍP TRỰC */}
              <g clipPath="url(#s12BdocClip)">
                {/* Xà thép trần & máng đèn trần tắt ngúm */}
                {Array.from({ length: 7 }, (_, i) => {
                  const bx = 720 + i * 168;
                  return (
                    <g key={i}>
                      <rect x={bx} y={214} width={22} height={26} fill="#0d1828" stroke={PAL2D.ink} strokeWidth={1.6} />
                      <line x1={bx + 11} y1={240} x2={636} y2={240} stroke="#101f33" strokeWidth={2} />
                    </g>
                  );
                })}
                <rect x={980} y={236} width={220} height={14} rx={3} fill="#111c2b" stroke="#1e3148" strokeWidth={1.6} />
                <rect x={1360} y={236} width={210} height={14} rx={3} fill="#111c2b" stroke="#1e3148" strokeWidth={1.6} />

                {/* Bảng bản đồ khu vực chiến thuật trên tường hậu chìm trong bóng tối lạnh */}
                <rect x={1125} y={305} width={335} height={205} rx={4} fill="#081322" stroke="#1a304d" strokeWidth={2.2} />
                <circle cx={1292} cy={408} r={72} fill="none" stroke="#182f4d" strokeWidth={1.8} strokeDasharray="7 6" />
                <line x1={1155} y1={408} x2={1430} y2={408} stroke="#182f4d" strokeWidth={1.4} />
                <line x1={1292} y1={322} x2={1292} y2={494} stroke="#182f4d" strokeWidth={1.4} />

                {/* Tủ rack máy chủ thông tin liên lạc & hộp nút còi báo động đỏ bỏ không ở góc phải phòng */}
                <g transform="translate(1545 585)">
                  <rect x={-52} y={-245} width={104} height={510} rx={4} fill="#08111e" stroke="#1a2c44" strokeWidth={2.2} />
                  {Array.from({ length: 8 }, (_, r) => (
                    <g key={r} transform={`translate(0 ${-210 + r * 48})`}>
                      <rect x={-42} y={0} width={84} height={32} rx={2} fill="#0d192b" stroke="#182b44" strokeWidth={1.4} />
                      <circle cx={-28} cy={16} r={3} fill={r % 3 === 0 ? PAL2D.ewTeal : PAL2D.usMid} opacity={0.75} />
                      <circle cx={-16} cy={16} r={3} fill={PAL2D.usLo} opacity={0.65} />
                    </g>
                  ))}
                </g>

                {/* Hộp công tắc còi báo động khẩn cấp màu đỏ trên cột bê tông — tắt ngúm, không một bàn tay chạm tới */}
                <g transform="translate(1705 468)">
                  <rect x={-34} y={-50} width={68} height={100} rx={6} fill="#131d2b" stroke="#2a3e57" strokeWidth={2.5} />
                  <circle cx={0} cy={-10} r={20} fill="#4f1419" stroke={PAL2D.ink} strokeWidth={2.6} />
                  <circle cx={-5} cy={-15} r={5.5} fill="#82242b" opacity={0.65} />
                  <rect x={-20} y={22} width={40} height={10} rx={2} fill="#243447" />
                </g>

                {/* DÀN MÀN HÌNH PHÒNG KHÔNG FAAD NGHIÊNG 3/4 BÊN TRÁI HẮT CHÙM SÁNG XANH LẠNH VÀO KÍP TRỰC */}
                <polygon points="870,342 1620,240 1690,845 870,675" fill="url(#s12ScreenCone)" />
                <polygon points="940,425 1520,370 1560,795 940,660" fill="url(#s12ScreenCone)" opacity={0.88} />

                {/* Bàn điều hành chiến thuật chữ L */}
                <polygon
                  points="636,655 1070,655 1135,866 636,866"
                  fill="#0e1b2d"
                  stroke="#213a59"
                  strokeWidth={2.8}
                />

                {/* Màn hình lớn #1 (Màn hình radar phòng không FAAD sáng xanh băng) */}
                <g>
                  <polygon
                    points="695,332 895,364 895,612 695,638"
                    fill="#081b30"
                    stroke={PAL2D.usHi}
                    strokeWidth={3.6}
                  />
                  <polygon points="708,346 882,375 882,599 708,622" fill="#0d2d4f" />
                  <ellipse cx={796} cy={484} rx={68} ry={96} fill="none" stroke={PAL2D.usMid} strokeWidth={2} opacity={0.75} />
                  <ellipse cx={796} cy={484} rx={38} ry={54} fill="none" stroke={PAL2D.usMid} strokeWidth={1.5} opacity={0.55} />
                  {/* Tín hiệu UAV Mỹ phía trên được kíp trực đóng khung chú ý */}
                  <circle cx={808} cy={416} r={12} fill="none" stroke={PAL2D.ewTeal} strokeWidth={2.6} />
                  <circle cx={808} cy={416} r={4.5} fill={PAL2D.usHi} />
                  {/* Hai chấm đỏ nhỏ lầm lũi bò lên từ rìa Nam màn hình mà không ai để tâm */}
                  <circle
                    cx={776}
                    cy={570 - (t - CUE.s12_debunk) * 2.2}
                    r={4.5}
                    fill={PAL2D.threatMid}
                    opacity={0.55 + 0.45 * Math.sin(t * 9)}
                  />
                  <circle
                    cx={791}
                    cy={583 - (t - CUE.s12_debunk) * 2.0}
                    r={3.6}
                    fill={PAL2D.threatHi}
                    opacity={0.45 + 0.45 * Math.cos(t * 9)}
                  />
                </g>

                {/* Màn hình phụ #2 (Theo dõi thu hồi UAV) */}
                <g>
                  <polygon
                    points="912,430 1038,452 1038,620 912,635"
                    fill="#0b2542"
                    stroke={PAL2D.ewTeal}
                    strokeWidth={3}
                  />
                  <line x1={975} y1={454} x2={975} y2={618} stroke={PAL2D.ewTeal} strokeWidth={1.6} opacity={0.65} />
                  <circle cx={975} cy={536} r={25} fill="none" stroke={PAL2D.usHi} strokeWidth={2.2} opacity={0.8} />
                </g>

                {/* BÓNG 3 QUÂN NHÂN KÍP TRỰC ĐỘI TAI NGHE DÁN MẮT VÀO MÀN HÌNH, ÁNH XANH LẠNH HẮT SẮC LẸM LÊN MẶT & VAI */}
                {/* Kíp trực #1 */}
                <g transform="translate(1120 645)">
                  <rect x={28} y={-55} width={28} height={198} rx={10} fill="#070e18" stroke="#1a2e46" strokeWidth={2} />
                  <path
                    d="M-56 220 L-42 15 C-36 -22 -8 -44 22 -38 C46 -32 56 -4 52 45 L48 220 Z"
                    fill="#050b14"
                  />
                  <path
                    d="M-53 178 L-41 16 C-36 -18 -14 -39 10 -39"
                    fill="none"
                    stroke={PAL2D.usHi}
                    strokeWidth={4.8}
                    strokeLinecap="round"
                  />
                  <path
                    d="M-24 22 L-94 14 L-118 6"
                    fill="none"
                    stroke="#060e18"
                    strokeWidth={26}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M-30 10 L-94 3 L-120 -4"
                    fill="none"
                    stroke={PAL2D.usHi}
                    strokeWidth={3.4}
                    strokeLinecap="round"
                  />
                  <circle cx={-8} cy={-78} r={34} fill="#050b14" />
                  <path
                    d="M-28 -104 C-38 -96 -45 -84 -42 -72 C-45 -64 -40 -52 -24 -47"
                    fill="none"
                    stroke={PAL2D.usHi}
                    strokeWidth={4.5}
                    strokeLinecap="round"
                  />
                  <path d="M-8 -113 C8 -113 16 -96 12 -76" fill="none" stroke="#2a4c73" strokeWidth={5} />
                  <ellipse cx={4} cy={-76} rx={9} ry={13} fill="#14263b" stroke={PAL2D.usMid} strokeWidth={2} />
                  <path d="M-2 -70 L-36 -60" fill="none" stroke={PAL2D.usHi} strokeWidth={2.2} />
                </g>

                {/* Kíp trực #2 đứng phía sau cùng nhìn dồn vào màn hình */}
                <g transform="translate(1315 592)">
                  <path
                    d="M-52 272 L-44 -5 C-38 -42 -12 -60 22 -54 C52 -48 64 -18 62 38 L58 272 Z"
                    fill="#040911"
                  />
                  <path
                    d="M-49 184 L-43 -4 C-38 -38 -16 -56 10 -55"
                    fill="none"
                    stroke={PAL2D.usMid}
                    strokeWidth={4.2}
                    strokeLinecap="round"
                  />
                  <circle cx={-4} cy={-96} r={35} fill="#040911" />
                  <path
                    d="M-24 -124 C-35 -114 -41 -102 -38 -89 C-41 -80 -35 -68 -20 -63"
                    fill="none"
                    stroke={PAL2D.usHi}
                    strokeWidth={4}
                    strokeLinecap="round"
                  />
                  <ellipse cx={8} cy={-94} rx={8} ry={12} fill="#112236" stroke={PAL2D.usMid} strokeWidth={1.8} />
                </g>

                {/* Kíp trực #3 ở tiền cảnh */}
                <g transform="translate(995 776)" opacity={0.96}>
                  <path d="M-64 110 C-58 32 -28 2 16 4 C58 6 76 38 82 110 Z" fill="#04080f" />
                  <path d="M-56 76 C-50 26 -26 5 8 4" fill="none" stroke={PAL2D.ewTeal} strokeWidth={3.6} opacity={0.85} />
                  <circle cx={8} cy={-38} r={38} fill="#04080f" />
                  <path
                    d="M-18 -66 C-30 -55 -33 -40 -29 -24"
                    fill="none"
                    stroke={PAL2D.ewTeal}
                    strokeWidth={3.8}
                    strokeLinecap="round"
                  />
                </g>
              </g>

              {/* BIỂU TƯỢNG 5 CẠNH LẦU NĂM GÓC (PENTAGON EMBLEM) ĐÓNG GÓC TRÊN TRÁI MẶT CẮT GIẢI MẬT */}
              <g
                transform={`translate(652 222) scale(${Math.min(1.06, spPentagon)})`}
                filter="url(#sh)"
              >
                <circle r={96} fill={PAL2D.bgConsole} stroke={PAL2D.amberMid} strokeWidth={4.2} />
                <circle r={85} fill="none" stroke={PAL2D.paperDim} strokeWidth={1.6} strokeDasharray="8 6" />
                <polygon
                  points={pentagonPoints(0, 4, 68)}
                  fill={PAL2D.paper}
                  stroke={PAL2D.ink}
                  strokeWidth={3.2}
                  strokeLinejoin="round"
                />
                <polygon
                  points={pentagonPoints(0, 4, 48)}
                  fill={PAL2D.panelHi}
                  stroke={PAL2D.ink}
                  strokeWidth={2.4}
                  strokeLinejoin="round"
                />
                <polygon
                  points={pentagonPoints(0, 4, 28)}
                  fill={PAL2D.bgConsole}
                  stroke={PAL2D.amberHi}
                  strokeWidth={2.5}
                  strokeLinejoin="round"
                />
                {Array.from({ length: 5 }, (_, i) => {
                  const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
                  return (
                    <line
                      key={i}
                      x1={Math.cos(a) * 28}
                      y1={4 + Math.sin(a) * 28}
                      x2={Math.cos(a) * 67}
                      y2={4 + Math.sin(a) * 67}
                      stroke={PAL2D.ink}
                      strokeWidth={2.1}
                    />
                  );
                })}
              </g>
            </g>
          )}
        </Layer>
      </Cam2D>
      <Grain opacity={0.42} />
    </>
  );
};

export default S12;
