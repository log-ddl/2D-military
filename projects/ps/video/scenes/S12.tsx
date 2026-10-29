import React from 'react';
import { AbsoluteFill } from 'remotion';
import { FONT } from '@kit/theme';
import { Label, Layer, handheld, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { Cam2D, Grain } from '@lib/2d/look';
import { CUE } from '../cues';
import { PAL2D } from '../local/palette';
import {
  BlueprintBg2D,
  GlowLine2D,
  PATRIOT_CUTAWAY_X,
  PatriotCutaway2D,
  type CutawaySection,
} from '../local/assets2d';

const MISSILE_CX = 960;
const MISSILE_CY = 540;
const MISSILE_SCALE = 1.15;
const BODY_R = 56;

type SectionMeta = {
  id: CutawaySection;
  num: string;
  cx: number;
  x0: number;
  x1: number;
  color: string;
};

const SECTIONS: Record<Exclude<CutawaySection, 'none' | 'igniter' | 'propellant' | 'actuators' | 'fins'>, SectionMeta> = {
  radome: {
    id: 'radome',
    num: '01',
    cx: PATRIOT_CUTAWAY_X.radome,
    x0: 535,
    x1: 700,
    color: PAL2D.amberHot,
  },
  seeker: {
    id: 'seeker',
    num: '02',
    cx: PATRIOT_CUTAWAY_X.seeker,
    x0: 430,
    x1: 532,
    color: PAL2D.cyan,
  },
  endGuidance: {
    id: 'endGuidance',
    num: '03',
    cx: PATRIOT_CUTAWAY_X.endGuidance,
    x0: 320,
    x1: 426,
    color: PAL2D.green,
  },
  midGuidance: {
    id: 'midGuidance',
    num: '04',
    cx: PATRIOT_CUTAWAY_X.midGuidance,
    x0: 220,
    x1: 316,
    color: PAL2D.cyanSoft,
  },
  warhead: {
    id: 'warhead',
    num: '05',
    cx: PATRIOT_CUTAWAY_X.warhead,
    x0: 95,
    x1: 216,
    color: PAL2D.red,
  },
  imu: {
    id: 'imu',
    num: '06',
    cx: PATRIOT_CUTAWAY_X.imu,
    x0: 2,
    x1: 91,
    color: PAL2D.cyan,
  },
};

function toWorldX(localX: number): number {
  return MISSILE_CX + localX * MISSILE_SCALE;
}

const S12: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Mở mượt lớp vỏ mặt cắt X-quang từ 174.1s -> 176.2s
  const peel = prog(t, 174.1, 176.2);

  // Xác định phân khoang đang active khớp chính xác từng mốc CUE
  let activeSec: CutawaySection = 'none';
  let activeMeta: SectionMeta | null = null;
  if (t >= CUE.s12_imu_gyro) {
    activeSec = 'imu';
    activeMeta = SECTIONS.imu;
  } else if (t >= CUE.s12_warhead_90kg) {
    activeSec = 'warhead';
    activeMeta = SECTIONS.warhead;
  } else if (t >= CUE.s12_mid_guidance) {
    activeSec = 'midGuidance';
    activeMeta = SECTIONS.midGuidance;
  } else if (t >= CUE.s12_guidance_end) {
    activeSec = 'endGuidance';
    activeMeta = SECTIONS.endGuidance;
  } else if (t >= CUE.s12_seeker) {
    activeSec = 'seeker';
    activeMeta = SECTIONS.seeker;
  } else if (t >= CUE.s12_radome) {
    activeSec = 'radome';
    activeMeta = SECTIONS.radome;
  }

  // Nội suy mượt tâm camera dọc trục X qua 6 phân khoang (nhân đúng MISSILE_SCALE = 1.15)
  const pZoomIn = prog(t, 176.35, 177.25);
  const pToSeeker = prog(t, CUE.s12_seeker - 0.3, CUE.s12_seeker + 0.45);
  const pToEndGuid = prog(t, CUE.s12_guidance_end - 0.3, CUE.s12_guidance_end + 0.45);
  const pToMidGuid = prog(t, CUE.s12_mid_guidance - 0.3, CUE.s12_mid_guidance + 0.45);
  const pToWarhead = prog(t, CUE.s12_warhead_90kg - 0.3, CUE.s12_warhead_90kg + 0.45);
  const pToImu = prog(t, CUE.s12_imu_gyro - 0.3, CUE.s12_imu_gyro + 0.45);

  let targetLocalX: number = PATRIOT_CUTAWAY_X.radome;
  targetLocalX = lerp(targetLocalX, PATRIOT_CUTAWAY_X.seeker, pToSeeker);
  targetLocalX = lerp(targetLocalX, PATRIOT_CUTAWAY_X.endGuidance, pToEndGuid);
  targetLocalX = lerp(targetLocalX, PATRIOT_CUTAWAY_X.midGuidance, pToMidGuid);
  targetLocalX = lerp(targetLocalX, PATRIOT_CUTAWAY_X.warhead, pToWarhead);
  targetLocalX = lerp(targetLocalX, PATRIOT_CUTAWAY_X.imu, pToImu);

  const camX = lerp(MISSILE_CX, toWorldX(targetLocalX), pZoomIn);
  const camY = lerp(MISSILE_CY, MISSILE_CY + 6, pZoomIn);
  const camZoom = lerp(1.0, 1.55, pZoomIn);
  const shake = handheld(t, lerp(1.2, 1.8, pZoomIn), 's12_xray');

  // Hiệu ứng tia quét laser X-quang dọc thân tên lửa khi mở vỏ (174.1 -> 176.2s)
  const scanActive = t >= 174.05 && t <= 176.35;
  const scanLocalX = lerp(720, -715, peel);

  // Tiến độ tín hiệu vệ tinh GPS (từ CUE.s12_gps = 185.98s)
  const gpsProg = prog(t, CUE.s12_gps, CUE.s12_gps + 0.55);

  return (
    <AbsoluteFill>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={PAL2D.bgDeep}>
        <Layer>
          {/* 1. NỀN BÀN VẼ KỸ THUẬT XANH ĐÁ (PRUSSIAN SLATE BLUEPRINT) */}
          <BlueprintBg2D x={-700} y={-500} w={3400} h={2100} step={120} id="s12_bp" />

          {/* Khung viền bản vẽ kỹ thuật, trục tâm centerline và vạch thước đo chia độ */}
          <g opacity={0.52}>
            <rect
              x={80}
              y={120}
              width={1760}
              height={840}
              rx={10}
              fill="none"
              stroke={PAL2D.grid}
              strokeWidth={2}
            />
            <rect
              x={94}
              y={134}
              width={1732}
              height={812}
              rx={6}
              fill="none"
              stroke={PAL2D.gridFine}
              strokeWidth={1.2}
            />
            {/* Đường trục tâm dọc tên lửa */}
            <line
              x1={60}
              y1={MISSILE_CY}
              x2={1890}
              y2={MISSILE_CY}
              stroke={PAL2D.cyanSoft}
              strokeWidth={1.4}
              strokeDasharray="22 8 4 8"
              opacity={0.55}
            />
            {/* Thước chia vạch dọc đáy bản vẽ */}
            <line x1={155} y1={760} x2={1765} y2={760} stroke={PAL2D.grid} strokeWidth={1.6} />
            {Array.from({ length: 33 }, (_, i) => {
              const tx = 155 + i * 50;
              const major = i % 4 === 0;
              return (
                <line
                  key={`tk_${i}`}
                  x1={tx}
                  y1={760}
                  x2={tx}
                  y2={760 + (major ? 16 : 8)}
                  stroke={PAL2D.grid}
                  strokeWidth={major ? 1.8 : 1.1}
                />
              );
            })}
            {/* Vòng thước ngắm đồng tâm quanh mũi tên lửa */}
            <circle
              cx={toWorldX(615)}
              cy={MISSILE_CY}
              r={165}
              fill="none"
              stroke={PAL2D.grid}
              strokeWidth={1.3}
              strokeDasharray="6 8"
              opacity={0.55}
            />
          </g>

          {/* 2. TÊN LỬA PATRIOT MẶT CẮT X-QUANG CHUẨN (BÓNG ĐỔ VECTOR THUẦN SVG — KHÔNG BỊ CẮT Ô FILTER CHROMIUM TRONG CAM2D) */}
          <g transform={`translate(${MISSILE_CX} ${MISSILE_CY + 16}) scale(${MISSILE_SCALE})`} opacity={0.36}>
            <polygon points="-690,-56 -614,-56 -638,-151 -696,-144" fill="#040b14" />
            <polygon points="-690,56 -614,56 -638,151 -696,144" fill="#040b14" />
            <path
              d={`M-695 ${-BODY_R} L535 ${-BODY_R} C602 ${-BODY_R * 0.94}, 658 ${-BODY_R * 0.52}, 700 0 C658 ${BODY_R * 0.52}, 602 ${BODY_R * 0.94}, 535 ${BODY_R} L-695 ${BODY_R} Z`}
              fill="#040b14"
            />
          </g>
          <PatriotCutaway2D
            x={MISSILE_CX}
            y={MISSILE_CY}
            scale={MISSILE_SCALE}
            peel={peel}
            active={activeSec}
          />

          {/* 3. LỚP HIỆU ỨNG KỸ THUẬT SỐNG ĐỘNG TRÊN TỪNG KHOANG (ĐỒNG HỆ TRỤC VỚI PATRIOTCUTAWAY2D) */}
          <g transform={`translate(${MISSILE_CX} ${MISSILE_CY}) scale(${MISSILE_SCALE})`}>
            {/* Hai nửa vỏ ngoài tách mở lên/xuống và tia quét X-quang lúc bóc vỏ (174.1 -> 176.3s) */}
            {scanActive && (
              <g>
                <path
                  d={`M-695 ${-BODY_R - peel * 48} L535 ${-BODY_R - peel * 48} C602 ${-BODY_R * 0.94 - peel * 48}, 658 ${-BODY_R * 0.52 - peel * 48}, 700 ${-peel * 48}`}
                  fill="none"
                  stroke={PAL2D.pacLight}
                  strokeWidth={2.4}
                  strokeDasharray="10 6"
                  opacity={(1 - peel) * 0.85}
                />
                <path
                  d={`M-695 ${BODY_R + peel * 48} L535 ${BODY_R + peel * 48} C602 ${BODY_R * 0.94 + peel * 48}, 658 ${BODY_R * 0.52 + peel * 48}, 700 ${peel * 48}`}
                  fill="none"
                  stroke={PAL2D.pacLight}
                  strokeWidth={2.4}
                  strokeDasharray="10 6"
                  opacity={(1 - peel) * 0.85}
                />
                <GlowLine2D
                  d={`M${scanLocalX} -125 L${scanLocalX} 125`}
                  color={PAL2D.cyan}
                  core="#ffffff"
                  width={3.2}
                  opacity={Math.sin(peel * Math.PI)}
                />
              </g>
            )}

            {/* (1) KHOANG 01: CHÓP CHE RADAR THẠCH ANH NUNG CHẢY (176.90s) */}
            {activeSec === 'radome' && (
              <g opacity={prog(t, CUE.s12_radome, CUE.s12_radome + 0.3)}>
                {/* Các cung sóng radar truyền xuyên trong suốt qua lớp vỏ thạch anh nung chảy */}
                {[0, 1, 2, 3].map((k) => {
                  const phase = ((t * 1.35 + k * 0.25) % 1);
                  const wx = 530 + phase * 245;
                  const wy = 24 + phase * 62;
                  const alpha = Math.sin(phase * Math.PI);
                  return (
                    <GlowLine2D
                      key={`rw_${k}`}
                      d={`M ${wx - 16} ${-wy} Q ${wx + 24} 0 ${wx - 16} ${wy}`}
                      color={PAL2D.cyan}
                      core="#ffffff"
                      width={2.6}
                      opacity={alpha * 0.88}
                    />
                  );
                })}
                {/* Các tia sóng chuẩn trực xuyên thẳng qua thành gốm thạch anh */}
                {[-26, 0, 26].map((ry) => (
                  <line
                    key={`ray_${ry}`}
                    x1={525}
                    y1={ry * 0.72}
                    x2={775}
                    y2={ry * 1.25}
                    stroke={PAL2D.amberHot}
                    strokeWidth={1.6}
                    strokeDasharray="6 6"
                    opacity={0.65}
                  />
                ))}
              </g>
            )}

            {/* (2) KHOANG 02: CỤM ĐẦU DÒ TÌM KIẾM MỤC TIÊU (180.16s) */}
            {activeSec === 'seeker' && (
              <g opacity={prog(t, CUE.s12_seeker, CUE.s12_seeker + 0.3)}>
                {(() => {
                  const gimDeg = Math.sin((t - CUE.s12_seeker) * 3.4) * 14;
                  return (
                    <g transform={`translate(502 0) rotate(${gimDeg})`}>
                      {/* Nón chùm sóng quét mục tiêu từ đĩa đầu dò */}
                      <polygon points="0,0 265,-82 265,82" fill={PAL2D.cyan} opacity={0.14} />
                      <line x1={0} y1={0} x2={265} y2={-82} stroke={PAL2D.cyan} strokeWidth={1.5} strokeDasharray="6 5" opacity={0.65} />
                      <line x1={0} y1={0} x2={265} y2={82} stroke={PAL2D.cyan} strokeWidth={1.5} strokeDasharray="6 5" opacity={0.65} />
                      {/* Mặt đĩa ăng-ten mảng pha của đầu dò lắc quét góc */}
                      <ellipse cx={0} cy={0} rx={11} ry={34} fill={PAL2D.cyan} stroke="#ffffff" strokeWidth={2} />
                      <line x1={0} y1={0} x2={250} y2={0} stroke="#ffffff" strokeWidth={1.8} strokeDasharray="8 6" opacity={0.8} />
                      {/* Các vòng cung xung tìm kiếm mục tiêu */}
                      {[0, 1, 2].map((k) => {
                        const p = ((t * 1.6 + k * 0.33) % 1);
                        const d = 35 + p * 215;
                        const h = 18 + p * 62;
                        return (
                          <path
                            key={`sk_${k}`}
                            d={`M ${d} ${-h} Q ${d + 22} 0 ${d} ${h}`}
                            fill="none"
                            stroke={PAL2D.cyan}
                            strokeWidth={2.4}
                            opacity={(1 - p) * 0.9}
                          />
                        );
                      })}
                    </g>
                  );
                })()}
              </g>
            )}

            {/* (3) KHOANG 03: KHỐI DẪN ĐƯỜNG GIAI ĐOẠN CUỐI & ĐỊNH VỊ VỆ TINH GPS (182.90s / 185.98s) */}
            {activeSec === 'endGuidance' && (
              <g opacity={prog(t, CUE.s12_guidance_end, CUE.s12_guidance_end + 0.3)}>
                {/* Xung dữ liệu chạy trên 4 thẻ bo mạch xử lý */}
                {[332, 352, 372, 392].map((bx, i) => {
                  const py = -24 + (((t * 2.4 + i * 0.25) % 1) * 48);
                  return (
                    <circle key={`bus_${bx}`} cx={bx + 6.5} cy={py} r={3.4} fill="#ffffff" />
                  );
                })}

                {/* Biểu tượng vệ tinh định vị & sóng liên kết xuống chip thu GPS tại 185.98s */}
                {gpsProg > 0.01 && (
                  <g opacity={gpsProg}>
                    {/* Cụm biểu tượng vệ tinh nhỏ gọn phía trên thân tên lửa (x = 412, y = -132) */}
                    <g transform="translate(412 -132) rotate(-16)">
                      {/* Hai cánh pin mặt trời */}
                      <rect x={-44} y={-8} width={28} height={16} rx={2} fill="#1f4e78" stroke={PAL2D.cyan} strokeWidth={1.8} />
                      <line x1={-30} y1={-8} x2={-30} y2={8} stroke={PAL2D.cyan} strokeWidth={1.2} />
                      <rect x={16} y={-8} width={28} height={16} rx={2} fill="#1f4e78" stroke={PAL2D.cyan} strokeWidth={1.8} />
                      <line x1={30} y1={-8} x2={30} y2={8} stroke={PAL2D.cyan} strokeWidth={1.2} />
                      {/* Thân hộp vệ tinh & chảo phát sóng */}
                      <rect x={-11} y={-11} width={22} height={22} rx={4} fill={PAL2D.pacLight} stroke={PAL2D.stroke} strokeWidth={2} />
                      <path d="M -8 12 Q 0 20 8 12" fill="none" stroke={PAL2D.cyan} strokeWidth={2.2} />
                      <line x1={0} y1={16} x2={0} y2={23} stroke={PAL2D.amberHot} strokeWidth={2} />
                    </g>

                    {/* Đường liên kết và 3 vòng sóng tín hiệu vệ tinh hội tụ vào chip GPS (412, -20) */}
                    <line
                      x1={412}
                      y1={-106}
                      x2={412}
                      y2={-28}
                      stroke={PAL2D.cyan}
                      strokeWidth={1.6}
                      strokeDasharray="4 4"
                      opacity={0.7}
                    />
                    {[0, 1, 2].map((k) => {
                      const p = ((t * 1.5 + k * 0.33) % 1);
                      const sy = lerp(-102, -32, p);
                      const sw = lerp(24, 9, p);
                      return (
                        <path
                          key={`gw_${k}`}
                          d={`M ${412 - sw} ${sy - 5} Q 412 ${sy + 6} ${412 + sw} ${sy - 5}`}
                          fill="none"
                          stroke={PAL2D.cyan}
                          strokeWidth={2.2}
                          opacity={Math.sin(p * Math.PI) * 0.95}
                        />
                      );
                    })}
                    {/* Vòng sáng quanh chip GPS */}
                    <circle
                      cx={412}
                      cy={-20}
                      r={11 + 3 * Math.sin(t * 9)}
                      fill="none"
                      stroke={PAL2D.amberHot}
                      strokeWidth={2.2}
                    />
                  </g>
                )}
              </g>
            )}

            {/* (4) KHOANG 04: PHÂN HỆ DẪN ĐƯỜNG CHẶNG GIỮA DẠNG MÔ-ĐUN (188.60s) */}
            {activeSec === 'midGuidance' && (
              <g opacity={prog(t, CUE.s12_mid_guidance, CUE.s12_mid_guidance + 0.3)}>
                {(() => {
                  const pulse = 0.5 + 0.5 * Math.sin((t - CUE.s12_mid_guidance) * 5.2);
                  return (
                    <>
                      {/* 2 khối mô-đun phát sáng luân phiên và xung truyền bus giữa 2 mô-đun */}
                      <rect
                        x={229}
                        y={-29}
                        width={36}
                        height={58}
                        rx={4}
                        fill={PAL2D.cyanSoft}
                        opacity={0.3 + 0.45 * pulse}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                      <rect
                        x={271}
                        y={-29}
                        width={36}
                        height={58}
                        rx={4}
                        fill={PAL2D.cyan}
                        opacity={0.3 + 0.45 * (1 - pulse)}
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                      {[-14, 0, 14].map((cy) => (
                        <GlowLine2D
                          key={`mb_${cy}`}
                          d={`M 264 ${cy} L 272 ${cy}`}
                          color={PAL2D.amberHot}
                          core="#ffffff"
                          width={2.6}
                        />
                      ))}
                    </>
                  );
                })()}
              </g>
            )}

            {/* (5) KHOANG 05: ĐẦU ĐẠN NẶNG ~90 KG (192.00s) */}
            {activeSec === 'warhead' && (
              <g opacity={prog(t, CUE.s12_warhead_90kg, CUE.s12_warhead_90kg + 0.3)}>
                {/* Xung năng lượng đồng tâm toả ra từ khoang đầu đạn 90 kg */}
                {[0, 1, 2].map((k) => {
                  const p = ((t * 1.25 + k * 0.33) % 1);
                  const rx = 52 + p * 44;
                  const ry = 30 + p * 54;
                  return (
                    <ellipse
                      key={`wp_${k}`}
                      cx={155}
                      cy={0}
                      rx={rx}
                      ry={ry}
                      fill="none"
                      stroke={k % 2 === 0 ? PAL2D.red : PAL2D.amberHot}
                      strokeWidth={2.4}
                      opacity={(1 - p) * 0.85}
                    />
                  );
                })}
                {/* Các tia văng minh họa sức công phá trực tiếp hướng ra ngoài thân */}
                {[-125, -102, -78, -55, 55, 78, 102, 125].map((degAng, idx) => {
                  const rad = (degAng * Math.PI) / 180;
                  const p = ((t * 1.8 + idx * 0.17) % 1);
                  const r0 = 36 + p * 22;
                  const r1 = 56 + p * 46;
                  return (
                    <GlowLine2D
                      key={`frag_${idx}`}
                      d={`M ${155 + Math.cos(rad) * r0} ${Math.sin(rad) * r0} L ${155 + Math.cos(rad) * r1} ${Math.sin(rad) * r1}`}
                      color={PAL2D.amber}
                      core={PAL2D.amberHot}
                      width={2.5}
                      opacity={Math.sin(p * Math.PI) * 0.9}
                    />
                  );
                })}
              </g>
            )}

            {/* (6) KHOANG 06: CẢM BIẾN QUÁN TÍNH & CON QUAY HỒI CHUYỂN IMU (196.50s) */}
            {activeSec === 'imu' && (
              <g opacity={prog(t, CUE.s12_imu_gyro, CUE.s12_imu_gyro + 0.3)}>
                {(() => {
                  const dtImu = t - CUE.s12_imu_gyro;
                  const rxDyn = 8 + 16 * Math.abs(Math.cos(dtImu * 2.3));
                  const ryDyn = 8 + 16 * Math.abs(Math.sin(dtImu * 1.9 + 0.6));
                  const rotSpin = dtImu * 48;
                  return (
                    <g>
                      {/* 3 vòng gimbal con quay hồi chuyển xoay động mượt mà */}
                      <g transform={`translate(46 0) rotate(${rotSpin})`}>
                        <circle cx={0} cy={0} r={27} fill="none" stroke={PAL2D.cyan} strokeWidth={2.4} strokeDasharray="16 6" />
                      </g>
                      <g transform={`translate(46 0) rotate(${Math.sin(dtImu * 1.8) * 28})`}>
                        <ellipse cx={0} cy={0} rx={27} ry={ryDyn} fill="none" stroke={PAL2D.amberHot} strokeWidth={2.4} />
                      </g>
                      <g transform={`translate(46 0) rotate(${Math.cos(dtImu * 2.1) * 24})`}>
                        <ellipse cx={0} cy={0} rx={rxDyn} ry={27} fill="none" stroke={PAL2D.green} strokeWidth={2.4} />
                      </g>
                      <circle cx={46} cy={0} r={4.2} fill="#ffffff" />

                      {/* Cụm trục toạ độ quán tính 3 chiều X - Y - Z sắc gọn ngay phía trên khoang IMU */}
                      <g transform="translate(46 -116)">
                        {/* Trục X (+X hướng mũi) */}
                        <line x1={0} y1={0} x2={38} y2={0} stroke={PAL2D.amberHot} strokeWidth={2.4} />
                        <polygon points="38,-4.5 47,0 38,4.5" fill={PAL2D.amberHot} />
                        <text x={53} y={4} fill={PAL2D.amberHot} fontFamily={FONT} fontSize={13} fontWeight={700}>X</text>

                        {/* Trục Y (thẳng đứng) */}
                        <line x1={0} y1={0} x2={0} y2={-34} stroke={PAL2D.green} strokeWidth={2.4} />
                        <polygon points="-4.5,-34 0,-43 4.5,-34" fill={PAL2D.green} />
                        <text x={-5} y={-48} fill={PAL2D.green} fontFamily={FONT} fontSize={13} fontWeight={700}>Y</text>

                        {/* Trục Z (xiên phối cảnh) */}
                        <line x1={0} y1={0} x2={-24} y2={18} stroke={PAL2D.cyan} strokeWidth={2.4} />
                        <polygon points="-21,21 -31,23 -26,14" fill={PAL2D.cyan} />
                        <text x={-43} y={28} fill={PAL2D.cyan} fontFamily={FONT} fontSize={13} fontWeight={700}>Z</text>

                        <circle cx={0} cy={0} r={3.5} fill="#ffffff" />
                      </g>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* 4. ĐƯỜNG CHỈ DẪN KỸ THUẬT (LEADER LINE MẢNH GỌN + NGOẶC ĐO KHOANG ACTIVE) */}
            {activeMeta && (
              <g>
                {/* Ngoặc đánh dấu bề rộng khoang đang xét ở rìa trên thân */}
                <line x1={activeMeta.x0} y1={-BODY_R - 8} x2={activeMeta.x0} y2={-BODY_R - 20} stroke={activeMeta.color} strokeWidth={2} />
                <line x1={activeMeta.x1} y1={-BODY_R - 8} x2={activeMeta.x1} y2={-BODY_R - 20} stroke={activeMeta.color} strokeWidth={2} />
                <line x1={activeMeta.x0} y1={-BODY_R - 14} x2={activeMeta.x1} y2={-BODY_R - 14} stroke={activeMeta.color} strokeWidth={1.8} />

                {/* Leader line có chấm tròn chỉ thẳng vào khoang đang active, gập 45° xuống dưới thân */}
                <circle cx={activeMeta.cx} cy={26} r={7.5} fill={activeMeta.color} opacity={0.28} />
                <circle cx={activeMeta.cx} cy={26} r={4.2} fill="#ffffff" stroke={activeMeta.color} strokeWidth={2} />
                <polyline
                  points={`${activeMeta.cx},30 ${activeMeta.cx},96 ${activeMeta.cx + 28},122 ${activeMeta.cx + 84},122`}
                  fill="none"
                  stroke={activeMeta.color}
                  strokeWidth={2.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Huy hiệu số thứ tự khoang kỹ thuật (01..06) gọn sắc, không nhồi chữ dài */}
                <rect
                  x={activeMeta.cx + 84}
                  y={106}
                  width={44}
                  height={32}
                  rx={7}
                  fill="#0b1828"
                  stroke={activeMeta.color}
                  strokeWidth={2.2}
                />
                <text
                  x={activeMeta.cx + 106}
                  y={127}
                  textAnchor="middle"
                  fill={PAL2D.paper}
                  fontFamily={FONT}
                  fontSize={16}
                  fontWeight={700}
                >
                  {activeMeta.num}
                </text>
              </g>
            )}
          </g>
        </Layer>
      </Cam2D>

      <Grain opacity={0.32} />

      {/* Nhãn duy nhất */}
      <Label
        t={t}
        text="90 KG"
        x={960}
        y={145}
        from={192.5}
        until={196.2}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S12;
