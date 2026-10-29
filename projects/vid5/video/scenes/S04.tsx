import React from 'react';
import { AbsoluteFill } from 'remotion';
import { handheld, Label, Layer, useT } from '@kit/motion';
import { bump, lerp, prog } from '@kit/theme';
import { Cam2D, Defs2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { CUE } from '../cues';
import { BlueprintGrid, F15Side2D, Weapon2D } from '../local/jets2d';
import { P } from '../local/palette';

const S04: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tọa độ đặt F15Side2D kích thước lớn (scale = 2.8 -> dài 1305.6 px từ x = 307 đến x = 1613)
  const jetX = 960;
  const jetY = 468;
  const jetScale = 2.8;

  // Quét tia laser X-quang bóc lớp vỏ xám từ mũi về đuôi (81.80s -> 86.50s)
  const xrayP = prog(t, CUE.s04_peelStart, 86.5);
  const scanActive = prog(t, CUE.s04_peelStart - 0.18, CUE.s04_peelStart + 0.2) * (1 - prog(t, 86.5, 87.05));
  // Khớp chính xác 1:1 với clipPath <rect x={240 - 485 * xray} ... /> bên trong F15Side2D
  const scanX = jetX + (240 - 485 * xrayP) * jetScale;

  // 4 hệ thống bên dưới lớp vỏ sơn xám kích hoạt đúng mốc CUE
  const pSupercomp = prog(t, CUE.s04_supercomp, CUE.s04_supercomp + 0.75);
  const pForcefield = prog(t, CUE.s04_forcefield, CUE.s04_forcefield + 0.85);
  const pWingtip = prog(t, CUE.s04_wingtip, CUE.s04_wingtip + 0.65);
  const pFirepower = prog(t, CUE.s04_firepower, CUE.s04_firepower + 0.85);

  // Tọa độ thế giới của các cụm bộ phận bên trong F15Side2D (ở jetX=960, jetY=468, scale=2.8)
  const compX = jetX + 36 * jetScale; // 1060.8 (Hộp siêu máy tính ADCP II ngay sau buồng lái)
  const compY = jetY - 1.5 * jetScale; // 463.8
  const radarX = jetX + 179 * jetScale; // 1461.2 (Mảng radar AESA AN/APG-82 ở mũi)
  const radarY = jetY + 1 * jetScale; // 470.8
  const epawssTailX = jetX - 178 * jetScale; // 461.6 (Cụm u tác chiến điện tử EPAWSS đỉnh cánh đuôi đứng)
  const epawssTailY = jetY - 105 * jetScale; // 174.0
  const wingtipX = jetX - 124 * jetScale; // 612.8 (Mấu đầu cánh bí mật 50 năm)
  const wingtipY = jetY + 7 * jetScale; // 487.6

  // Điều khiển Cam2D: lia chậm dọc thân từ phần mũi về phía đuôi theo thanh quét, rồi mở rộng ôm trọn 15 tấn hỏa lực
  const driftIntro = prog(t, 75.76, CUE.s04_peelStart);
  const followScan = prog(t, CUE.s04_peelStart, 86.6);
  const pullWide = prog(t, 90.8, 93.2);

  const camX = lerp(lerp(lerp(975, 1025, driftIntro), 925, followScan), 960, pullWide);
  const camY = lerp(lerp(458, 468, followScan), 532, pullWide);
  const camZoom = lerp(lerp(1.05, 1.02, followScan), 0.92, pullWide);

  const hh = handheld(t, 2.8, 's04_cam');
  const heavyDropJolt = bump(t, CUE.s04_firepower + 0.55, 0.38) * 9;
  const shake: readonly [number, number] = [hh[0], hh[1] + heavyDropJolt * Math.sin(t * 45)];

  return (
    <AbsoluteFill style={{ background: '#07101d' }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg="#07101d">
        <Layer>
          <Defs2D />
          <BlueprintGrid x0={-550} y0={-380} w={3020} h={1860} step={100} id="s04_bp" tint="#091729" />

          {/* ==================== BỐI CẢNH HANG-GA KỸ THUẬT TỐI SÂU ==================== */}
          {/* Giàn kèo thép mái hang-ga phía trên */}
          <g opacity={0.34}>
            <rect x={-200} y={24} width={2320} height={64} fill="#060d18" stroke={P.grid} strokeWidth={1.6} />
            {Array.from({ length: 20 }, (_, i) => {
              const tx = -160 + i * 116;
              return (
                <g key={i} stroke={P.gridBright} strokeWidth={1.5}>
                  <line x1={tx} y1={24} x2={tx + 58} y2={88} />
                  <line x1={tx + 58} y1={88} x2={tx + 116} y2={24} />
                </g>
              );
            })}
          </g>

          {/* Chùm đèn rọi trần hang-ga tạo chiều sâu không gian */}
          {[460, 960, 1460].map((lx, idx) => (
            <polygon
              key={idx}
              points={`${lx - 36},88 ${lx + 36},88 ${lx + 230},930 ${lx - 230},930`}
              fill={P.cyanSoft}
              opacity={0.035}
            />
          ))}

          {/* Hai đường ray cổng quét X-quang trên (y=118) và dưới sàn hang-ga (y=926) */}
          <g>
            <rect x={170} y={110} width={1580} height={16} rx={4} fill="#0e1e34" stroke={P.gridBright} strokeWidth={1.6} />
            <rect x={170} y={922} width={1580} height={22} rx={4} fill="#0e1e34" stroke={P.gridBright} strokeWidth={1.8} />
            {Array.from({ length: 32 }, (_, i) => {
              const rx = 200 + i * 49;
              return (
                <g key={i} opacity={0.45}>
                  <line x1={rx} y1={110} x2={rx} y2={126} stroke={P.cyan} strokeWidth={1.2} />
                  <line x1={rx} y1={922} x2={rx} y2={936} stroke={P.amber} strokeWidth={1.4} />
                </g>
              );
            })}
          </g>

          {/* Đường gióng kích thước bản vẽ thập niên 1970 (mờ dần khi tia X bóc lớp vỏ xám) */}
          {xrayP < 0.98 && (
            <g opacity={(1 - xrayP * 0.85) * 0.55}>
              <line x1={307} y1={600} x2={1613} y2={600} stroke={P.gridBright} strokeWidth={1.6} strokeDasharray="8 6" />
              <line x1={307} y1={560} x2={307} y2={622} stroke={P.gridBright} strokeWidth={1.8} />
              <line x1={1613} y1={505} x2={1613} y2={622} stroke={P.gridBright} strokeWidth={1.8} />
              <circle cx={1280} cy={415} r={54} fill="none" stroke={P.gridBright} strokeWidth={1.3} strokeDasharray="5 5" />
            </g>
          )}

          {/* ==================== HỆ THỐNG 2: VÒM TRƯỜNG LỰC ĐIỆN TỬ CYAN (87.50s) ==================== */}
          {pForcefield > 0.01 && (() => {
            // Khi dàn hỏa lực 15 tấn hạ xuống lúc 91.52s, vòm lá chắn điện tử giãn rộng ôm trọn cả kho vũ khí mà không cắt ngang thân bom
            const domeCy = lerp(jetY - 26, 520, pFirepower);
            const domeRx = lerp(742, 825, pFirepower) * (0.9 + 0.1 * pForcefield);
            const domeRy = lerp(290, 388, pFirepower) * (0.9 + 0.1 * pForcefield);
            const innerRx = domeRx * 0.925;
            const innerRy = domeRy * 0.86;
            return (
              <g opacity={pForcefield}>
                <ellipse
                  cx={jetX + 6}
                  cy={domeCy}
                  rx={domeRx}
                  ry={domeRy}
                  fill={P.cyan}
                  fillOpacity={0.04}
                  stroke={P.cyan}
                  strokeWidth={14}
                  strokeOpacity={0.14}
                />
                <ellipse
                  cx={jetX + 6}
                  cy={domeCy}
                  rx={domeRx}
                  ry={domeRy}
                  fill="none"
                  stroke={P.cyanSoft}
                  strokeWidth={2.8}
                  strokeDasharray="26 12 8 12"
                  strokeDashoffset={-t * 48}
                />
                <ellipse
                  cx={jetX + 6}
                  cy={domeCy}
                  rx={innerRx}
                  ry={innerRy}
                  fill="none"
                  stroke={P.cyan}
                  strokeWidth={1.8}
                  strokeDasharray="12 16"
                  strokeDashoffset={t * 36}
                  opacity={0.7}
                />

                {/* Sóng cầu phát ra từ u ăng-ten EPAWSS trên đỉnh cánh đuôi đứng & mũi máy bay */}
                {[0, 1, 2].map((w) => {
                  const ph = ((t - CUE.s04_forcefield + w * 0.45) % 1.35) / 1.35;
                  return (
                    <g key={w}>
                      <circle
                        cx={epawssTailX}
                        cy={epawssTailY}
                        r={16 + ph * 86}
                        fill="none"
                        stroke={P.cyanSoft}
                        strokeWidth={2.4 * (1 - ph)}
                        opacity={0.8 * (1 - ph)}
                      />
                      <circle
                        cx={jetX + 215 * jetScale}
                        cy={jetY + 4 * jetScale}
                        r={14 + ph * 74}
                        fill="none"
                        stroke={P.cyan}
                        strokeWidth={2.2 * (1 - ph)}
                        opacity={0.7 * (1 - ph)}
                      />
                    </g>
                  );
                })}

                {/* Tín hiệu radar đỏ từ ngoài lao vào bị vòm chắn điện tử bẻ gãy bật ngược */}
                <g opacity={prog(t, CUE.s04_forcefield + 0.35, CUE.s04_forcefield + 0.9)}>
                  <path d="M1840,295 L1675,355 L1795,240" fill="none" stroke={P.red} strokeWidth={2.6} />
                  <circle cx={1675} cy={355} r={7} fill={P.cyanSoft} />
                  <path d="M105,280 L255,345 L140,225" fill="none" stroke={P.red} strokeWidth={2.6} />
                  <circle cx={255} cy={345} r={7} fill={P.cyanSoft} />
                </g>
              </g>
            );
          })()}

          {/* ==================== CHỦ THỂ CHÍNH: F-15EX NHÌN NGANG BÓC VỎ X-QUANG ==================== */}
          <g filter="url(#sh)">
            <F15Side2D x={jetX} y={jetY} scale={jetScale} xray={xrayP} />
          </g>

          {/* ==================== HỆ THỐNG 1: SIÊU MÁY TÍNH BAY ADCP II (85.50s) ==================== */}
          {pSupercomp > 0.01 && (
            <g opacity={pSupercomp}>
              {/* Đường cáp quang xung vàng nối từ lõi siêu máy tính ra mảng radar mũi & đuôi */}
              <path
                d={`M${compX} ${compY} L${compX + 125} ${compY + 7} L${radarX} ${radarY}`}
                fill="none"
                stroke={P.amberHot}
                strokeWidth={3.4}
                {...drawOn(420, pSupercomp)}
              />
              <path
                d={`M${compX} ${compY} L${jetX - 95 * jetScale} ${jetY - 9 * jetScale} L${epawssTailX} ${epawssTailY + 12}`}
                fill="none"
                stroke={P.amber}
                strokeWidth={2.8}
                {...drawOn(760, pSupercomp)}
              />
              <path
                d={`M${compX} ${compY + 6} L${wingtipX} ${wingtipY}`}
                fill="none"
                stroke={P.amber}
                strokeWidth={2.4}
                {...drawOn(480, pSupercomp)}
              />

              {/* Các hạt xung dữ liệu ánh sáng chạy dọc trục thần kinh */}
              {[0, 1, 2].map((k) => {
                const u = ((t * 1.4 + k * 0.33) % 1);
                return (
                  <g key={k}>
                    <circle cx={lerp(compX, radarX, u)} cy={lerp(compY, radarY, u)} r={4.5} fill="#ffffff" />
                    <circle
                      cx={lerp(compX, jetX - 150 * jetScale, u)}
                      cy={lerp(compY, jetY - 8 * jetScale, u)}
                      r={4}
                      fill={P.amberHot}
                    />
                  </g>
                );
              })}

              {/* Hộp vi mạch siêu máy tính phát sáng rực ngay sau buồng lái */}
              <rect
                x={compX - 46}
                y={compY - 26}
                width={92}
                height={52}
                rx={7}
                fill={P.amber}
                fillOpacity={0.22}
                stroke={P.amberHot}
                strokeWidth={2.8}
              />
              {[-30, -15, 0, 15, 30].map((px) => (
                <g key={px} stroke={P.amberHot} strokeWidth={2}>
                  <line x1={compX + px} y1={compY - 34} x2={compX + px} y2={compY - 26} />
                  <line x1={compX + px} y1={compY + 26} x2={compX + px} y2={compY + 34} />
                </g>
              ))}
              <circle
                cx={compX}
                cy={compY}
                r={44 + Math.sin(t * 8) * 4}
                fill="none"
                stroke={P.amberHot}
                strokeWidth={1.8}
                strokeDasharray="8 6"
              />
            </g>
          )}

          {/* ==================== HỆ THỐNG 3: BÍ MẬT MẤU ĐẦU CÁNH 50 NĂM (89.24s) ==================== */}
          {pWingtip > 0.01 && (
            <g opacity={pWingtip}>
              {/* Giá phóng đầu cánh mở khóa & đạn AIM-120 gắn tại đầu cánh */}
              <rect
                x={wingtipX - 58}
                y={wingtipY + 4}
                width={126}
                height={11}
                rx={3}
                fill={P.amber}
                stroke={P.ink}
                strokeWidth={1.8}
              />
              <Weapon2D kind="amraam" x={wingtipX + 12} y={wingtipY + 22} scale={2.25} accent={P.amberHot} />

              {/* Vòng khóa tiêu điểm nền tối nổi bật & các tia chớp điện hổ phách đánh sáng tại mấu đầu cánh */}
              <circle cx={wingtipX} cy={wingtipY} r={34} fill="#0b1524" fillOpacity={0.75} stroke={P.amber} strokeWidth={3} />
              <polygon
                points={`${wingtipX},${wingtipY - 16} ${wingtipX + 16},${wingtipY} ${wingtipX},${wingtipY + 16} ${wingtipX - 16},${wingtipY}`}
                fill={P.amberHot}
                stroke={P.ink}
                strokeWidth={1.6}
              />
              {[0, 60, 120, 180, 240, 300].map((degA, idx) => {
                const sparkOp = 0.35 + 0.65 * Math.abs(Math.sin(t * 14 + idx * 1.3));
                return (
                  <g
                    key={degA}
                    transform={`translate(${wingtipX} ${wingtipY}) rotate(${degA})`}
                    opacity={sparkOp}
                  >
                    <polyline
                      points="22,0 36,-8 32,5 52,-3"
                      fill="none"
                      stroke={P.amberHot}
                      strokeWidth={2.6}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* ==================== HỆ THỐNG 4: DÀN HỎA LỰC 15 TẤN TRƯỢT HẠ DƯỚI BỤNG/CÁNH (91.52s) ==================== */}
          {pFirepower > 0.01 && (
            <g
              transform={`translate(0 ${-68 * (1 - pFirepower)})`}
              opacity={pFirepower}
              filter="url(#sh)"
            >
              {/* Cáp & thanh treo thủy lực nối từ khung xương bụng máy bay xuống dàn vũ khí */}
              {[450, 600, 760, 980, 1200, 1360, 1500].map((px, i) => (
                <line
                  key={i}
                  x1={px}
                  y1={515}
                  x2={px}
                  y2={i === 3 ? 585 : i === 2 || i === 4 ? 690 : 780}
                  stroke={P.amber}
                  strokeWidth={2}
                  strokeDasharray="6 5"
                  opacity={0.5}
                />
              ))}

              {/* Tầng 1 (Sát trục bụng trung tâm, y = 596): Tên lửa siêu vượt âm 22 ft khổng lồ + cặp AMRAAM hộ tống */}
              <Weapon2D kind="hypersonic" x={980} y={596} scale={2.55} />
              <Weapon2D kind="amraam" x={555} y={596} scale={2.2} />
              <Weapon2D kind="amraam" x={1395} y={596} scale={2.2} />

              {/* Tầng 2 (y = 696): Cặp bom xuyên boong-ke 5.000 lb GBU-28 + cặp tên lửa tầm nhiệt AIM-9X */}
              <Weapon2D kind="bunkerbuster" x={755} y={696} scale={2.32} />
              <Weapon2D kind="bunkerbuster" x={1205} y={696} scale={2.32} />
              <Weapon2D kind="aim9x" x={445} y={696} scale={2.2} />
              <Weapon2D kind="aim9x" x={1505} y={696} scale={2.2} />

              {/* Tầng 3 (y = 788): Dàn 4 tên lửa không đối không tầm xa AIM-120D AMRAAM */}
              {[595, 840, 1120, 1365].map((mx) => (
                <Weapon2D key={mx} kind="amraam" x={mx} y={788} scale={2.2} />
              ))}

              {/* Thanh thước tải trọng hỏa lực cực đại dưới sàn dàn giá đạn */}
              <rect x={430} y={856} width={1060} height={20} rx={6} fill="#091526" stroke={P.amber} strokeWidth={1.8} />
              <rect x={435} y={860} width={1050 * pFirepower} height={12} rx={4} fill={P.amber} />
            </g>
          )}

          {/* ==================== THANH TIA QUÉT LASER X-QUANG THẲNG ĐỨNG (81.80 – 86.80s) ==================== */}
          {scanActive > 0.01 && (
            <g opacity={scanActive}>
              {/* Vệt quét lân quang kéo theo sau thanh laser */}
              <rect
                x={scanX}
                y={128}
                width={95}
                height={792}
                fill={P.cyan}
                opacity={0.07}
              />
              {/* Nét kép chùm tia laser thẳng đứng từ ray trần tới ray sàn */}
              <line x1={scanX} y1={126} x2={scanX} y2={922} stroke={P.cyan} strokeWidth={28} opacity={0.16} />
              <line x1={scanX} y1={126} x2={scanX} y2={922} stroke={P.cyanSoft} strokeWidth={9} opacity={0.42} />
              <line x1={scanX} y1={126} x2={scanX} y2={922} stroke="#ffffff" strokeWidth={3.2} />

              {/* Hai cụm đầu phát laser trượt trên đường ray trần & sàn */}
              <polygon
                points={`${scanX - 24},112 ${scanX + 24},112 ${scanX + 14},136 ${scanX - 14},136`}
                fill={P.bgCard}
                stroke={P.cyanSoft}
                strokeWidth={2}
              />
              <polygon
                points={`${scanX - 14},912 ${scanX + 14},912 ${scanX + 24},938 ${scanX - 24},938`}
                fill={P.bgCard}
                stroke={P.cyanSoft}
                strokeWidth={2}
              />

              {/* Điểm lóe sáng nơi tia laser bóc tách qua lớp vỏ tôn máy bay */}
              {xrayP > 0.03 && xrayP < 0.97 && (
                <g>
                  <circle cx={scanX} cy={jetY - 28} r={14} fill={P.cyanSoft} opacity={0.5} />
                  <circle cx={scanX} cy={jetY - 28} r={5} fill="#ffffff" />
                  <circle cx={scanX} cy={jetY + 36} r={14} fill={P.cyanSoft} opacity={0.5} />
                  <circle cx={scanX} cy={jetY + 36} r={5} fill="#ffffff" />
                </g>
              )}
            </g>
          )}
        </Layer>
      </Cam2D>

      <Grain opacity={0.42} />

      <Label
        t={t}
        text="15 TONS"
        x={960}
        y={104}
        from={CUE.s04_firepower}
        until={96.4}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S04;
