import React from 'react';
import { Easing } from 'remotion';
import { FONT, prog, lerp, mix } from '@kit/theme';
import { useT, handheld, useSpring, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { CUE } from '../cues';
import { P } from '../local/palette';
import { BlueprintGrid, F15Top2D, F15Front2D, Weapon2D } from '../local/jets2d';

const S24: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const shake = handheld(t, 1.6, 's24_cft');

  // Chuyển cảnh mượt từ Trạm 1 (960, 540 — Kỷ lục 104-0 & 3 ngăn hồ sơ Lầu Năm Góc)
  // sang Trạm 2 (3220, 540 — Bàn phân tích Điểm yếu #1: CFT 1.500 gal vs Thùng dầu phụ cản gió)
  const zoomFolder01 = prog(t, 686.8, 688.0, Easing.inOut(Easing.cubic));
  const toWorkbench = prog(t, 687.7, 689.1, Easing.bezier(0.42, 0, 0.18, 1));

  const camX1 = lerp(960, 430, zoomFolder01);
  const camY1 = lerp(540, 575, zoomFolder01);
  const zoom1 = lerp(1.0, 1.32, zoomFolder01);

  const camX = lerp(camX1, 3220, toWorkbench);
  const camY = lerp(camY1, 540, toWorkbench);
  const camZoom = lerp(zoom1, 1.0, toWorkbench);

  // Nhịp 1: Huy hiệu 104-0 mở tách thành 3 ngăn hồ sơ cảnh báo đỏ lúc 684.60s
  const badgeIn = useSpring(t, 677.8, 12, 140);
  const splitVuln = prog(t, CUE.s24_threeVuln - 0.15, CUE.s24_threeVuln + 1.05, Easing.out(Easing.cubic));

  // Nhịp 2: Các pha biến đổi cấu hình CFT -> Cắt bỏ CFT (705.5s) -> Đeo thùng dầu phụ dưới cánh (714.0s)
  const cftAppear = prog(t, 690.6, CUE.s24_cftShow + 0.5, Easing.out(Easing.cubic));
  const cftFuelFill = prog(t, CUE.s24_cft1500gal - 0.4, CUE.s24_cft1500gal + 1.6);
  const cftStrip = prog(t, CUE.s24_cftStrip, CUE.s24_cftStrip + 1.7, Easing.inOut(Easing.cubic));
  const dropSlam = useSpring(t, CUE.s24_dropTankPenalty, 11, 175);
  const hasDrop = t >= CUE.s24_dropTankPenalty;
  const strikeCross = prog(t, CUE.s24_dropTankPenalty + 0.55, CUE.s24_dropTankPenalty + 1.35, Easing.out(Easing.cubic));

  // Vòng bán kính tác chiến: rộng màu xanh lục khi có CFT -> co rút mạnh sang đỏ cam từ 705.5s
  const combatRadius = lerp(342, 206, cftStrip) * (0.45 + 0.55 * cftAppear);
  const radiusColor = mix(P.green, P.red, cftStrip);

  return (
    <>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.bgDeep}>
        <svg width={5200} height={1500} style={{ overflow: 'visible' }}>
          <Defs2D shadow="rgba(6, 12, 24, 0.56)" />

          {/* =====================================================================
              NHỊP 1 (x: 0..1920, tâm 960): BẢNG TỶ SỐ 104–0 & 3 NGĂN HỒ SƠ CẢNH BÁO ĐỎ
             ===================================================================== */}
          <g transform="translate(960 540)">
            <BlueprintGrid x0={-1120} y0={-660} w={2240} h={1320} step={110} id="s24_bp1" />

            {/* HUY HIỆU BẢNG TỶ SỐ KHÔNG CHIẾN HUYỀN THOẠI 104 – 0 (tách mở lúc 684.60s) */}
            {splitVuln < 0.99 && (
              <g
                transform={`scale(${0.86 + 0.14 * Math.min(1, badgeIn)})`}
                opacity={1 - prog(t, CUE.s24_threeVuln + 0.1, CUE.s24_threeVuln + 0.95)}
              >
                {/* Nửa trên bảng tỷ số trượt lên khi tách */}
                <g transform={`translate(0 ${-splitVuln * 190})`}>
                  <path
                    d="M-520,0 L-520,-215 L-475,-260 L475,-260 L520,-215 L520,0 Z"
                    fill="#112744"
                    stroke={P.amber}
                    strokeWidth={3.5}
                    filter="url(#sh)"
                  />
                  {/* Đôi cánh đại bàng vàng phía trên */}
                  <polygon
                    points="0,-206 -215,-222 -165,-186 -42,-182 0,-164 42,-182 165,-186 215,-222"
                    fill={P.amber}
                  />
                  {/* Lưới 52 ngôi sao chiến công nửa trên */}
                  {Array.from({ length: 52 }, (_, i) => {
                    const col = i % 13;
                    const row = Math.floor(i / 13);
                    return (
                      <circle
                        key={`st_${i}`}
                        cx={-420 + col * 70}
                        cy={-142 + row * 28}
                        r={3.2}
                        fill={P.amberHot}
                        opacity={0.32}
                      />
                    );
                  })}
                </g>

                {/* Nửa dưới bảng tỷ số trượt xuống khi tách */}
                <g transform={`translate(0 ${splitVuln * 190})`}>
                  <path
                    d="M-520,0 L520,0 L520,210 L475,255 L-475,255 L-520,210 Z"
                    fill="#0d1f38"
                    stroke={P.amber}
                    strokeWidth={3.5}
                    filter="url(#sh)"
                  />
                  {/* Lưới 52 ngôi sao chiến công nửa dưới (tổng 104 chiến công) */}
                  {Array.from({ length: 52 }, (_, i) => {
                    const col = i % 13;
                    const row = Math.floor(i / 13);
                    return (
                      <circle
                        key={`sb_${i}`}
                        cx={-420 + col * 70}
                        cy={38 + row * 28}
                        r={3.2}
                        fill={P.amberHot}
                        opacity={0.32}
                      />
                    );
                  })}
                  <rect x={-330} y={172} width={660} height={46} rx={10} fill="#163358" stroke={P.amber} strokeWidth={1.8} />
                  <text x={0} y={202} fontFamily={FONT} fontWeight={700} fontSize={21} fill={P.amberHot} textAnchor="middle">
                    F-15 EAGLE · UNDEFEATED AIR-TO-AIR RECORD
                  </text>
                </g>

                {/* Con số uy nghi 104 – 0 ở tâm huy hiệu */}
                <g opacity={1 - splitVuln * 1.3}>
                  <text
                    x={-165}
                    y={64}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={196}
                    fill={P.amberHot}
                    stroke={P.ink}
                    strokeWidth={5}
                    textAnchor="middle"
                  >
                    104
                  </text>
                  <rect x={42} y={-14} width={76} height={18} rx={5} fill={P.cyan} />
                  <text
                    x={255}
                    y={64}
                    fontFamily={FONT}
                    fontWeight={700}
                    fontSize={196}
                    fill={P.f15Light}
                    stroke={P.ink}
                    strokeWidth={5}
                    textAnchor="middle"
                  >
                    0
                  </text>
                </g>

                {/* Vết chớp cảnh báo đỏ cắt ngang huy hiệu lúc 684.60s */}
                {splitVuln > 0.02 && (
                  <line
                    x1={-590}
                    y1={0}
                    x2={590}
                    y2={0}
                    stroke={P.red}
                    strokeWidth={6}
                    opacity={1 - splitVuln * 0.7}
                  />
                )}
              </g>
            )}

            {/* 3 NGĂN HỒ SƠ CẢNH BÁO ĐỎ CỦA LẦU NĂM GÓC (PENTAGON VULNERABILITY DOSSIERS) */}
            {splitVuln > 0.05 && (
              <g opacity={Math.min(1, splitVuln * 1.35)}>
                {/* Thanh tiêu đề báo cáo kiểm định Lầu Năm Góc */}
                <g transform={`translate(0 ${lerp(-220, -335, splitVuln)})`}>
                  <rect x={-370} y={-34} width={740} height={68} rx={12} fill="#261019" stroke={P.red} strokeWidth={2.6} />
                  <text x={0} y={8} fontFamily={FONT} fontWeight={700} fontSize={25} fill="#ffffff" textAnchor="middle">
                    PENTAGON TEST REPORT · 3 SHARP VULNERABILITIES
                  </text>
                </g>

                {[
                  {
                    cx: -530,
                    code: '01 · FUEL/CFT',
                    sub: 'MISSING CONFORMAL TANKS',
                    active: true,
                    icon: 'cft' as const,
                  },
                  {
                    cx: 0,
                    code: '02 · TOOLING',
                    sub: 'GAO WINDSCREEN DRILL ERROR',
                    active: false,
                    icon: 'tool' as const,
                  },
                  {
                    cx: 530,
                    code: '03 · PHYSICS',
                    sub: '200 SQ FT NON-STEALTH RCS',
                    active: false,
                    icon: 'phys' as const,
                  },
                ].map((f, idx) => {
                  const spreadX = lerp(0, f.cx, splitVuln);
                  return (
                    <g key={idx} transform={`translate(${spreadX} 35)`}>
                      {/* Tai kẹp hồ sơ (Folder Tab) */}
                      <path
                        d="M-215,-215 L-55,-215 L-25,-182 L215,-182 L215,215 L-215,215 Z"
                        fill={f.active ? '#24121d' : '#132238'}
                        stroke={f.active ? P.red : '#8a3040'}
                        strokeWidth={f.active ? 3.6 : 2.2}
                        filter="url(#sh)"
                      />
                      <rect
                        x={-192}
                        y={-158}
                        width={384}
                        height={48}
                        rx={8}
                        fill={f.active ? P.red : '#3b1824'}
                      />
                      <text
                        x={0}
                        y={-126}
                        fontFamily={FONT}
                        fontWeight={700}
                        fontSize={25}
                        fill="#ffffff"
                        textAnchor="middle"
                      >
                        {f.code}
                      </text>

                      {/* Hình biểu tượng kỹ thuật bên trong từng ngăn hồ sơ */}
                      <rect x={-176} y={-88} width={352} height={196} rx={12} fill="#0a1524" stroke={P.grid} strokeWidth={1.6} />
                      {f.icon === 'cft' && (
                        <g transform="translate(0 10)">
                          <Weapon2D kind="droptank" x={0} y={0} scale={1.55} accent={P.amber} />
                          <circle cx={0} cy={0} r={58} fill="none" stroke={P.amber} strokeWidth={2.4} strokeDasharray="10 7" />
                        </g>
                      )}
                      {f.icon === 'tool' && (
                        <g transform="translate(0 10)">
                          <circle cx={-12} cy={-6} r={42} fill="none" stroke={P.cyan} strokeWidth={2.4} strokeDasharray="8 6" />
                          <circle cx={14} cy={12} r={42} fill="none" stroke={P.red} strokeWidth={2.8} />
                          <line x1={-12} y1={-6} x2={14} y2={12} stroke={P.amberHot} strokeWidth={2.5} />
                        </g>
                      )}
                      {f.icon === 'phys' && (
                        <g transform="translate(0 10)">
                          {[28, 54, 80].map((r) => (
                            <circle key={r} cx={0} cy={0} r={r} fill="none" stroke={P.red} strokeWidth={2.2} opacity={1.1 - r / 100} />
                          ))}
                          <polygon points="0,-18 18,0 0,18 -18,0" fill={P.red} />
                        </g>
                      )}

                      <text x={0} y={156} fontFamily={FONT} fontWeight={700} fontSize={18} fill={f.active ? P.amberHot : P.muted} textAnchor="middle">
                        {f.sub}
                      </text>
                      <text x={0} y={184} fontFamily={FONT} fontWeight={500} fontSize={13} fill={P.red} textAnchor="middle">
                        CLASSIFIED AUDIT FILE #{idx + 1}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </g>

          {/* =====================================================================
              NHỊP 2 (x: 2260..4180, tâm 3220): PHÂN TÍCH ĐIỂM YẾU #1 (CFT 1.500 GAL VS DROP TANKS)
             ===================================================================== */}
          <g transform="translate(3220 540)">
            <BlueprintGrid x0={-1120} y0={-660} w={2240} h={1320} step={110} id="s24_bp2" />

            {/* ---------------- BÊN TRÁI (cx = -465): HÌNH CHIẾU BẰNG F15Top2D & VÒNG BÁN KÍNH TÁC CHIẾN ---------------- */}
            <g transform="translate(-465 36)">
              <rect
                x={-415}
                y={-396}
                width={830}
                height={815}
                rx={22}
                fill="rgba(12, 26, 46, 0.88)"
                stroke={P.gridBright}
                strokeWidth={2.2}
                filter="url(#sh)"
              />

              {/* Lưới tâm cực đo tầm bay không tiếp dầu */}
              {[120, 230, 342].map((r, idx) => (
                <circle
                  key={r}
                  cx={0}
                  cy={-10}
                  r={r}
                  fill="none"
                  stroke={P.gridBright}
                  strokeWidth={1.1}
                  strokeDasharray="6 8"
                  opacity={0.3 + idx * 0.08}
                />
              ))}
              <line x1={-370} y1={-10} x2={370} y2={-10} stroke={P.grid} strokeWidth={1.1} opacity={0.45} />
              <line x1={0} y1={-368} x2={0} y2={348} stroke={P.grid} strokeWidth={1.1} opacity={0.45} />

              {/* Vòng bóng mờ bán kính rộng ban đầu (hiện rõ độ hụt tầm khi CFT bị gỡ bỏ lúc 705.5s) */}
              {cftStrip > 0.04 && (
                <g opacity={cftStrip * 0.72}>
                  <circle
                    cx={0}
                    cy={-10}
                    r={342}
                    fill="none"
                    stroke={P.green}
                    strokeWidth={2}
                    strokeDasharray="12 10"
                  />
                  {/* 4 mũi tên đỏ chỉ sự co rút tầm bay không tiếp dầu */}
                  {[45, 135, 225, 315].map((ang) => (
                    <g key={ang} transform={`translate(0 -10) rotate(${ang})`}>
                      <line x1={328} y1={0} x2={226} y2={0} stroke={P.red} strokeWidth={3} />
                      <polygon points="218,0 236,-9 236,9" fill={P.red} />
                    </g>
                  ))}
                </g>
              )}

              {/* VÒNG TRÒN BÁN KÍNH TÁC CHIẾN ĐỘNG (Xanh lục rộng -> Đỏ cam co rút) */}
              <circle
                cx={0}
                cy={-10}
                r={combatRadius}
                fill={radiusColor}
                fillOpacity={0.11}
                stroke={radiusColor}
                strokeWidth={4}
              />

              {/* F-15EX HÌNH CHIẾU BẰNG Ở TÂM (Mũi hướng thẳng lên trên rot=-90) */}
              <g transform="translate(0 -10)">
                <F15Top2D
                  scale={0.78}
                  rot={-90}
                  cft={false}
                  wingTipMissiles
                  fullLoad={!hasDrop}
                  dropTanks={false}
                />

                {/* HAI BỒN THÙNG DẦU KHÍ ĐỘNG ỐP THÂN (CFT) TÔ NỔI VÀNG HỔ PHÁCH (+1,500 GAL) -> TÁCH RỜI MỜ BIẾN MẤT TẠI 705.5s */}
                {cftAppear > 0.01 && cftStrip < 0.99 && (
                  <g opacity={cftAppear * (1 - cftStrip)}>
                    {/* Bồn CFT bên trái thân (trượt tách sang trái khi cftStrip tăng) */}
                    <g transform={`translate(${-cftStrip * 72} 0) rotate(-90) scale(0.78)`}>
                      <path
                        d="M56,-29 Q10,-46 -116,-41 L-146,-26 Z"
                        fill={P.amber}
                        stroke={P.ink}
                        strokeWidth={2.4}
                      />
                      <path d="M38,-35 L-102,-35" stroke={P.amberHot} strokeWidth={2.2} />
                    </g>
                    {/* Bồn CFT bên phải thân (trượt tách sang phải khi cftStrip tăng) */}
                    <g transform={`translate(${cftStrip * 72} 0) rotate(-90) scale(0.78)`}>
                      <path
                        d="M56,29 Q10,46 -116,41 L-146,26 Z"
                        fill={P.amber}
                        stroke={P.ink}
                        strokeWidth={2.4}
                      />
                      <path d="M38,35 L-102,35" stroke={P.amberHot} strokeWidth={2.2} />
                    </g>

                    {/* Nhãn chú thích trực tiếp +1,500 GAL sát hai bồn CFT */}
                    <g opacity={cftFuelFill}>
                      <line x1={-36} y1={12} x2={-162} y2={12} stroke={P.amberHot} strokeWidth={2.2} />
                      <rect x={-308} y={-8} width={146} height={40} rx={8} fill="#182f4f" stroke={P.amber} strokeWidth={2} />
                      <text x={-235} y={18} fontFamily={FONT} fontWeight={700} fontSize={18} fill={P.amberHot} textAnchor="middle">
                        +1,500 GAL
                      </text>
                    </g>
                  </g>
                )}

                {/* HAI THÙNG DẦU PHỤ TO KỀNH GẮN SẬP VÀO MẤU CÁNH CHÍNH LÚC 714.00s + SÓNG CẢN GIÓ ĐỎ */}
                {hasDrop && (
                  <g>
                    {[-1, 1].map((side) => {
                      const px = side * lerp(115, 56, Math.min(1, dropSlam));
                      return (
                        <g key={side} transform={`translate(${px} 8)`}>
                          <Weapon2D kind="droptank" rot={-90} scale={0.88} accent={P.red} />
                          {/* Vệt sóng cản khí động đỏ cam (Drag Wake) */}
                          <path
                            d="M-18,-56 Q0,-76 18,-56 M-24,48 L-30,96 M24,48 L30,96"
                            fill="none"
                            stroke={P.red}
                            strokeWidth={2.6}
                            strokeDasharray="7 5"
                          />
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>

              {/* Thanh trạng thái bán kính tác chiến dưới đáy khung trái */}
              <rect
                x={-375}
                y={334}
                width={750}
                height={58}
                rx={12}
                fill="#09172a"
                stroke={radiusColor}
                strokeWidth={2.4}
              />
              <text x={0} y={370} fontFamily={FONT} fontWeight={700} fontSize={21} fill={radiusColor} textAnchor="middle">
                {cftStrip < 0.4
                  ? 'UNREFUELED COMBAT RADIUS: EXTENDED (LOW-DRAG CFT)'
                  : hasDrop
                    ? 'DRAGGY WING DROP TANKS · HIGH AERODYNAMIC PENALTY'
                    : 'IOC LOT WITHOUT CFT · UNREFUELED RANGE REDUCED'}
              </text>
            </g>

            {/* ---------------- BÊN PHẢI (cx = +455): HÌNH CHIẾU MŨI F15Front2D & PHẠT MẤU TREO BOM ĐÁNH ĐẤT ---------------- */}
            <g transform="translate(455 36)">
              <rect
                x={-425}
                y={-396}
                width={850}
                height={815}
                rx={22}
                fill="rgba(12, 26, 46, 0.88)"
                stroke={P.gridBright}
                strokeWidth={2.2}
                filter="url(#sh)"
              />

              {/* Tiêu đề kỹ thuật góc trên khung phải */}
              <rect x={-385} y={-366} width={770} height={48} rx={10} fill="#102542" />
              <text x={0} y={-335} fontFamily={FONT} fontWeight={700} fontSize={20} fill={P.text} textAnchor="middle">
                {cftStrip < 0.4
                  ? 'TEST JET CONFIGURATION · CONFORMAL TANKS + BOMB RACKS'
                  : 'EARLY IOC SQUADRON · CFT STRIPPED & WING PYLONS HIJACKED'}
              </text>

              {/* HÌNH CHIẾU TRỰC DIỆN F15Front2D PHÓNG LỚN (scale 2.1) */}
              <g transform="translate(0 -92)">
                <F15Front2D
                  scale={2.1}
                  cft={false}
                  loadout={hasDrop ? 'clean' : 'standard12'}
                />

                {/* Cặp bồn CFT ốp mượt sát hai bên hông cửa hút khí tô nổi vàng hổ phách + giá bom tiếp tuyến */}
                {cftAppear > 0.01 && cftStrip < 0.99 && (
                  <g opacity={cftAppear * (1 - cftStrip)}>
                    {[-1, 1].map((side) => (
                      <g key={side} transform={`translate(${side * (96 + cftStrip * 68)} 11)`}>
                        <path
                          d={
                            side === -1
                              ? 'M14,-19 Q-14,-18 -20,2 Q-16,19 14,19 Z'
                              : 'M-14,-19 Q14,-18 20,2 Q16,19 -14,19 Z'
                          }
                          fill={P.amber}
                          stroke={P.ink}
                          strokeWidth={2.6}
                        />
                        <ellipse cx={side * 2} cy={-4} rx={7} ry={6} fill={P.amberHot} opacity={0.7} />
                        {/* Giá bom tiếp tuyến gắn dưới bồn CFT (không chiếm mấu cánh!) */}
                        {[-5, 9].map((bx) => (
                          <g key={bx} transform={`translate(${side * bx} 24)`}>
                            <line x1={0} y1={-6} x2={0} y2={0} stroke={P.f15Dark} strokeWidth={2.6} />
                            <circle cx={0} cy={5} r={5.5} fill="#5b6953" stroke={P.ink} strokeWidth={1.6} />
                            <circle cx={0} cy={5} r={2.2} fill={P.amberHot} />
                          </g>
                        ))}
                      </g>
                    ))}
                  </g>
                )}

                {/* Khi thùng dầu phụ gắn sập vào mấu cánh chính lúc 714.00s */}
                {hasDrop && (
                  <g>
                    {/* Giữ lại 4 tên lửa phòng không ở đầu cánh & góc thân */}
                    {[-296, -55, 55, 296].map((mx) => (
                      <g key={mx}>
                        <line x1={mx} y1={12} x2={mx} y2={34} stroke={P.f15Dark} strokeWidth={3} />
                        <circle cx={mx} cy={41} r={8.5} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.8} />
                      </g>
                    ))}

                    {/* Hai thùng dầu phụ 600-gal to kềnh choán cứng mấu vũ khí chính dưới cánh */}
                    {[-1, 1].map((side) => {
                      const dropY = lerp(115, 58, Math.min(1, dropSlam));
                      return (
                        <g key={side} transform={`translate(${side * 164} ${dropY})`}>
                          <line x1={0} y1={-46} x2={0} y2={-22} stroke={P.f15Dark} strokeWidth={6} />
                          <circle cx={0} cy={0} r={26} fill={P.amber} stroke={P.red} strokeWidth={3.5} />
                          <circle cx={0} cy={0} r={10} fill={P.f15Dark} />
                          {/* Vòng cảnh báo lực cản gió lớn */}
                          <circle cx={0} cy={0} r={36} fill="none" stroke={P.red} strokeWidth={2.2} strokeDasharray="7 5" />
                        </g>
                      );
                    })}
                  </g>
                )}
              </g>

              {/* Thanh đối chiếu Nhiên liệu & Lực cản gió */}
              <g transform="translate(0 72)">
                <rect x={-385} y={0} width={770} height={84} rx={12} fill="#0a182c" stroke={P.grid} strokeWidth={1.6} />
                <text x={-356} y={32} fontFamily={FONT} fontWeight={700} fontSize={16} fill={P.muted}>
                  EXTRA FUEL:
                </text>
                <rect x={-220} y={14} width={380} height={24} rx={6} fill="#142945" />
                <rect
                  x={-220}
                  y={14}
                  width={380 * (hasDrop ? 0.52 : (1 - cftStrip) * cftFuelFill)}
                  height={24}
                  rx={6}
                  fill={hasDrop ? P.red : P.amber}
                />
                <text x={358} y={33} fontFamily={FONT} fontWeight={700} fontSize={18} fill={cftStrip < 0.4 ? P.amberHot : P.red} textAnchor="end">
                  {cftStrip < 0.4 ? '>10,000 LB LOW-DRAG' : hasDrop ? 'WING DROP TANKS' : '0 LB CFT (SKIPPED)'}
                </text>
                <text x={0} y={66} fontFamily={FONT} fontWeight={500} fontSize={15} fill={cftStrip < 0.4 ? P.green : P.amber} textAnchor="middle">
                  {cftStrip < 0.4
                    ? 'ALL UNDERWING WEAPON PYLONS FREE FOR PRECISION BOMBS'
                    : 'UPFRONT COST CUTS LEFT IOC JETS WITHOUT CONFORMAL TANKS'}
                </text>
              </g>

              {/* KHAY GIÁ BOM ĐÁNH ĐẤT CHÍNH XÁC BỊ THÙNG DẦU PHỤ ĐÁNH BẬT & GẠCH CHÉO ĐỎ (714.00s) */}
              <g transform="translate(0 184)">
                <rect
                  x={-385}
                  y={0}
                  width={770}
                  height={208}
                  rx={14}
                  fill={hasDrop ? '#1f101a' : cftStrip > 0.4 ? '#1d1914' : '#0a1c2e'}
                  stroke={hasDrop ? P.red : cftStrip > 0.4 ? P.amber : P.green}
                  strokeWidth={2.5}
                />
                <text
                  x={0}
                  y={34}
                  fontFamily={FONT}
                  fontWeight={700}
                  fontSize={18}
                  fill={hasDrop ? P.red : cftStrip > 0.4 ? P.amberHot : P.green}
                  textAnchor="middle"
                >
                  {hasDrop
                    ? 'WEAPON PYLONS OCCUPIED BY DROP TANKS · MINIMAL GROUND STRIKE'
                    : cftStrip > 0.4
                      ? 'CFT TANGENTIAL BOMB RACKS LOST · WING PYLONS AT RISK'
                      : 'TANGENTIAL & WING PRECISION GROUND-STRIKE RACKS'}
                </text>

                {/* Khi chưa đeo Drop Tank: 4 quả bom đánh đất chính xác xếp ngay ngắn */}
                <g opacity={hasDrop ? 0.28 : cftStrip > 0.4 ? 0.55 : 0.95} transform={`translate(0 ${hasDrop ? 22 : 0})`}>
                  {[-245, -82, 82, 245].map((bx) => (
                    <g key={bx} transform={`translate(${bx} 102)`}>
                      <rect x={-34} y={-36} width={68} height={10} rx={3} fill={P.f15Dark} />
                      <Weapon2D kind="bunkerbuster" x={0} y={0} scale={0.95} />
                    </g>
                  ))}
                </g>

                {/* Khi 714.0s tới: Thùng dầu phụ Weapon2D kind="droptank" đè lên & gạch chéo đỏ giá bom */}
                {hasDrop && (
                  <g>
                    <g transform={`translate(0 92) scale(${0.8 + 0.2 * Math.min(1, dropSlam)})`}>
                      <Weapon2D kind="droptank" x={-185} y={0} scale={1.18} />
                      <Weapon2D kind="droptank" x={185} y={0} scale={1.18} />
                    </g>
                    {strikeCross > 0.02 && (
                      <g opacity={strikeCross}>
                        <line x1={-345} y1={52} x2={lerp(-345, 345, strikeCross)} y2={lerp(52, 184, strikeCross)} stroke={P.red} strokeWidth={9} strokeLinecap="round" />
                        <line x1={345} y1={52} x2={lerp(345, -345, strikeCross)} y2={lerp(52, 184, strikeCross)} stroke={P.red} strokeWidth={9} strokeLinecap="round" />
                        <rect x={-198} y={102} width={396} height={44} rx={8} fill={P.red} stroke={P.ink} strokeWidth={2.2} />
                        <text x={0} y={131} fontFamily={FONT} fontWeight={700} fontSize={20} fill="#ffffff" textAnchor="middle">
                          NO PRECISION STRIKE RACKS
                        </text>
                      </g>
                    )}
                  </g>
                )}
              </g>
            </g>
          </g>
        </svg>
      </Cam2D>

      <Grain opacity={0.38} />

      {/* Tối đa 1 <Label> trên màn hình theo tuần tự */}
      <Label
        t={t}
        text="104–0 RECORD"
        x={960}
        y={104}
        from={CUE.s24_record104}
        until={682.8}
        size={50}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="1,500 GAL CFT"
        x={960}
        y={104}
        from={CUE.s24_cft1500gal}
        until={700.2}
        size={50}
        bg={P.amber}
        fg={P.ink}
      />
    </>
  );
};

export default S24;
