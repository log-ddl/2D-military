import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { prog, lerp, bump } from '@kit/theme';
import { useT, useSpring, handheld, Layer, Label } from '@kit/motion';
import { Defs2D, Cam2D, Grain } from '@lib/2d/look';
import { drawOn } from '@lib/2d/path';
import { skyline } from '@lib/2d/terrain';
import { CUE } from '../cues';
import { P } from '../local/palette';

const S05: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ các giai đoạn giải phẫu & kích hoạt cảm biến
  const introP = prog(t, 42.85, 44.2);
  const slewP = prog(t, 43.1, 45.45);
  const cutP = prog(t, CUE.s05_mtsb_open - 0.12, CUE.s05_mtsb_open + 0.65);
  const flirP = prog(t, CUE.s05_flir, CUE.s05_flir + 0.5);
  const flirPop = useSpring(t, CUE.s05_flir, 13, 180);
  const eoP = prog(t, CUE.s05_daynight, CUE.s05_daynight + 0.45);
  const eoPop = useSpring(t, CUE.s05_daynight, 14, 280);
  const laserP = prog(t, CUE.s05_laser, CUE.s05_laser + 0.32);
  const radarP = prog(t, CUE.s05_radar, CUE.s05_radar + 0.6);

  // Chuyển động máy quay 2D chủ đích: cận cảnh mũi & MTS-B -> mở nhẹ sang vùng quét quang học
  const pushIn = prog(t, 44.6, 47.0);
  const panBeam = prog(t, 47.0, 51.4);
  const camX = lerp(930, 958, pushIn) + panBeam * 44;
  const camY = lerp(522, 540, pushIn) + panBeam * 14;
  const camZoom = 1.015 + pushIn * 0.055 - panBeam * 0.05;
  const shake = handheld(t, 2.0, 's05-mtsb');

  // Địa hình cao nguyên sa mạc mờ sâu phía dưới để các chùm tia quét tới mục tiêu
  const ridgeFar = useMemo(() => skyline('s05-far', -300, 2300, 882, 96, 620, 1350), []);
  const ridgeMid = useMemo(() => skyline('s05-mid', -300, 2300, 938, 68, 460, 1350), []);
  const ridgeNear = useMemo(() => skyline('s05-near', -300, 2300, 994, 42, 340, 1350), []);

  // Tọa độ tâm cầu MTS-B (phóng lớn tỷ lệ 1.12x cho mặt cắt cực rõ nét) và mục tiêu dưới mặt đất
  const tx = 696;
  const ty = 602;
  const ts = 1.12;
  const turretRot = lerp(7.5, 17.5, slewP);
  const rotRad = (turretRot * Math.PI) / 180;
  const cosR = Math.cos(rotRad);
  const sinR = Math.sin(rotRad);

  // Phép đổi tọa độ cục bộ trên vành thấu kính MTS-B ra tọa độ thế giới khớp tuyệt đối góc xoay
  const lensWorld = (lx: number, ly: number): [number, number] => [
    tx + (lx * cosR - ly * sinR) * ts,
    ty + (lx * sinR + ly * cosR) * ts,
  ];

  const flirStart = lensWorld(154, -34);
  const eoStart = lensWorld(156, 14);
  const laserStart = lensWorld(150, 60);

  const targetX = 1655;
  const targetY = 892;
  const laserLen = Math.hypot(targetX - laserStart[0], targetY - 6 - laserStart[1]);
  const sightExt = prog(t, CUE.s05_eye_intro, 44.8);

  // Tâm đĩa Radar khẩu độ tổng hợp Lynx SAR trong bầu mũi
  const radarOrigin: [number, number] = [1055, 346];
  const radarSweepDeg = 8 + 26 * (0.5 + 0.5 * Math.sin((t - CUE.s05_radar) * 4.2));

  return (
    <AbsoluteFill style={{ background: P.stratTop }}>
      <Cam2D x={camX} y={camY} zoom={camZoom} shake={shake} bg={P.stratTop}>
        <Layer>
          <Defs2D shadow="rgba(7, 13, 24, 0.48)" />
          <defs>
            <linearGradient id="s05-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={P.stratTop} />
              <stop offset="44%" stopColor={P.stratMid} />
              <stop offset="74%" stopColor={P.stratLow} />
              <stop offset="91%" stopColor={P.dawnHorizon} />
              <stop offset="100%" stopColor={P.dawnGlow} />
            </linearGradient>
            <radialGradient id="s05-sun-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor={P.dawnGlow} stopOpacity="0.46" />
              <stop offset="45%" stopColor={P.dawnHorizon} stopOpacity="0.18" />
              <stop offset="100%" stopColor={P.dawnHorizon} stopOpacity="0" />
            </radialGradient>
            <linearGradient id="s05-cavity" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#08111d" />
              <stop offset="55%" stopColor="#102136" />
              <stop offset="100%" stopColor="#0a1625" />
            </linearGradient>
            <linearGradient id="s05-flir-cone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={P.flirHot} stopOpacity="0.48" />
              <stop offset="55%" stopColor={P.flirWarm} stopOpacity="0.21" />
              <stop offset="100%" stopColor={P.flirHot} stopOpacity="0.03" />
            </linearGradient>
            <linearGradient id="s05-eo-cone" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5ce1ff" stopOpacity="0.42" />
              <stop offset="65%" stopColor="#9beeff" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#5ce1ff" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="s05-radar-cone" x1="0" y1="0" x2="1" y2="0.6">
              <stop offset="0%" stopColor={P.gold} stopOpacity="0.36" />
              <stop offset="65%" stopColor={P.gold} stopOpacity="0.12" />
              <stop offset="100%" stopColor={P.gold} stopOpacity="0.0" />
            </linearGradient>
            <clipPath id="s05-nose-clip">
              <path d="M -220,234 L 250,226 C 410,222 495,124 652,122 C 808,120 946,192 1068,262 C 1152,310 1208,350 1226,380 C 1212,410 1138,434 1020,440 L 812,444 L -220,444 Z" />
            </clipPath>
            <clipPath id="s05-sphere-clip">
              <circle cx={0} cy={0} r={152} />
            </clipPath>
          </defs>

          {/* 1. Bầu trời bình minh tầng bình lưu, vầng sáng chân trời mượt & Địa hình cao nguyên mờ sâu */}
          <rect x={-320} y={-220} width={2560} height={1560} fill="url(#s05-sky)" />
          <circle cx={1620} cy={875} r={470} fill="url(#s05-sun-glow)" />

          {/* Các dải luồng khí tầng bình lưu mảnh tạo chiều sâu cho bầu trời góc trên-phải */}
          <g stroke={P.uavHighlight} strokeLinecap="round" opacity={0.11}>
            <line x1={1240} y1={170} x2={1760} y2={170} strokeWidth={2} strokeDasharray="44 26" />
            <line x1={1360} y1={235} x2={1850} y2={235} strokeWidth={1.6} strokeDasharray="32 22" />
          </g>

          <path d={ridgeFar} fill={P.mesaOchre} opacity={0.44} />
          <path d={ridgeMid} fill={P.canyonDark} opacity={0.7} />
          <path d={ridgeNear} fill={P.canyonDeep} opacity={0.92} />

          {/* Tổ hợp công sự mục tiêu nhỏ dưới sườn cao nguyên góc dưới-phải */}
          <g transform={`translate(${targetX}, ${targetY})`}>
            <polygon points="-46,14 -34,-13 28,-13 42,14" fill="#4f3726" stroke={P.ink} strokeWidth={2.2} />
            <rect x={-19} y={-21} width={30} height={9} rx={2} fill="#6b4d37" stroke={P.ink} strokeWidth={1.8} />
            <line x1={-4} y1={-21} x2={-4} y2={-33} stroke={P.uavMid} strokeWidth={2} />
            <path d="M -11,-35 A 9,9 0 0 1 3,-31" fill="none" stroke={P.uavLight} strokeWidth={2} />
          </g>

          {/* 2. Khung lưới kỹ thuật mảnh & Vòng chia độ quang cơ quanh tâm MTS-B */}
          <g opacity={0.3}>
            {[180, 360, 540, 720, 900].map((gy) => (
              <line key={`gy-${gy}`} x1={-160} y1={gy} x2={2080} y2={gy} stroke={P.gridMinor} strokeWidth={1} strokeDasharray="6 10" />
            ))}
            {[240, 696, 1055, 1490].map((gx) => (
              <line key={`gx-${gx}`} x1={gx} y1={-100} x2={gx} y2={1140} stroke={P.gridMinor} strokeWidth={1} strokeDasharray="6 10" />
            ))}
          </g>

          {/* Vòng thước chia độ cực (polar azimuth dial) & cung khóa quang trục quanh cầu MTS-B */}
          <g transform={`translate(${tx}, ${ty})`} opacity={0.38 + 0.36 * introP}>
            <circle cx={0} cy={0} r={212} fill="none" stroke={P.gridMajor} strokeWidth={1.6} strokeDasharray="10 8" />
            <circle cx={0} cy={0} r={238} fill="none" stroke={P.gridMinor} strokeWidth={1.2} />
            {/* Cung quét chủ động của "Mắt thần" ngay từ đầu cảnh (43.28s) */}
            <g transform={`rotate(${turretRot - 24})`}>
              <path
                d="M 224,-46 A 228 228 0 0 1 224,46"
                fill="none"
                stroke={P.laser}
                strokeWidth={3}
                opacity={0.55}
              />
            </g>
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i * 15 * Math.PI) / 180;
              const r0 = i % 2 === 0 ? 204 : 209;
              const r1 = i % 2 === 0 ? 222 : 216;
              return (
                <line
                  key={i}
                  x1={Math.cos(a) * r0}
                  y1={Math.sin(a) * r0}
                  x2={Math.cos(a) * r1}
                  y2={Math.sin(a) * r1}
                  stroke={i % 2 === 0 ? P.uavLight : P.gridMajor}
                  strokeWidth={i % 2 === 0 ? 2 : 1.2}
                />
              );
            })}
          </g>

          {/* Đường trục ngắm thụ động (Optical Boresight Line) từ đầu cảnh để 2 khung đầu đã sống động */}
          <g opacity={0.44 * prog(t, CUE.s05_eye_intro, 44.5) * (1 - laserP * 0.7)}>
            <line
              x1={eoStart[0]}
              y1={eoStart[1]}
              x2={lerp(eoStart[0], targetX, sightExt)}
              y2={lerp(eoStart[1], targetY - 6, sightExt)}
              stroke={P.uavLight}
              strokeWidth={1.8}
              strokeDasharray="10 10"
            />
            {/* Khung ngắm vuông thu hẹp khóa sơ bộ mục tiêu từ đầu cảnh */}
            <g transform={`translate(${targetX}, ${targetY - 6}) scale(${lerp(1.45, 1.0, slewP)})`}>
              <path
                d="M -28,-20 L -28,-28 L -18,-28 M 28,-20 L 28,-28 L 18,-28 M -28,20 L -28,28 L -18,28 M 28,20 L 28,28 L 18,28"
                fill="none"
                stroke={P.uavHighlight}
                strokeWidth={2}
              />
            </g>
          </g>

          {/* 3. CÁC CHÙM TIA QUANG HỌC & SÓNG RADAR (nối khớp tuyệt đối từ tâm từng thấu kính) */}
          {/* 3A. Chùm quét phổ nhiệt hồng ngoại FLIR (47.06s) */}
          {flirP > 0.001 && (
            <g opacity={flirP}>
              <polygon
                points={`${flirStart[0]},${flirStart[1]} ${targetX + 86},${targetY - 66} ${targetX - 74},${targetY + 34}`}
                fill="url(#s05-flir-cone)"
              />
              <line
                x1={flirStart[0]}
                y1={flirStart[1]}
                x2={lerp(flirStart[0], targetX + 86, flirP)}
                y2={lerp(flirStart[1], targetY - 66, flirP)}
                stroke={P.flirHot}
                strokeWidth={2.1}
                strokeDasharray="10 7"
                opacity={0.82}
              />
              <line
                x1={flirStart[0]}
                y1={flirStart[1]}
                x2={lerp(flirStart[0], targetX - 74, flirP)}
                y2={lerp(flirStart[1], targetY + 34, flirP)}
                stroke={P.flirHot}
                strokeWidth={2.1}
                strokeDasharray="10 7"
                opacity={0.82}
              />
              {/* Các cung đẳng nhiệt chạy dọc nón hồng ngoại */}
              {[0.3, 0.55, 0.8].map((u, idx) => {
                const wave = ((u + (t - CUE.s05_flir) * 0.38) % 0.9) + 0.1;
                const cx = lerp(flirStart[0], targetX, wave);
                const cy = lerp(flirStart[1], targetY - 12, wave);
                const rad = 24 + wave * 62;
                return (
                  <ellipse
                    key={idx}
                    cx={cx}
                    cy={cy}
                    rx={rad * 0.42}
                    ry={rad}
                    transform={`rotate(21 ${cx} ${cy})`}
                    fill="none"
                    stroke={P.flirWarm}
                    strokeWidth={2}
                    opacity={(1 - wave * 0.72) * 0.72}
                  />
                );
              })}
            </g>
          )}

          {/* 3B. Chùm cảm biến quang học Ngày / Đêm EO (48.14s) */}
          {eoP > 0.001 && (
            <g opacity={eoP}>
              <polygon
                points={`${eoStart[0]},${eoStart[1]} ${targetX + 38},${targetY - 34} ${targetX - 30},${targetY + 18}`}
                fill="url(#s05-eo-cone)"
              />
              <line
                x1={eoStart[0]}
                y1={eoStart[1]}
                x2={lerp(eoStart[0], targetX + 38, eoP)}
                y2={lerp(eoStart[1], targetY - 34, eoP)}
                stroke="#7be8ff"
                strokeWidth={2.4}
                opacity={0.88}
              />
              <line
                x1={eoStart[0]}
                y1={eoStart[1]}
                x2={lerp(eoStart[0], targetX - 30, eoP)}
                y2={lerp(eoStart[1], targetY + 18, eoP)}
                stroke="#7be8ff"
                strokeWidth={2.4}
                opacity={0.88}
              />
            </g>
          )}

          {/* 3C. Tia Laser đo xa & chiếu xạ mục tiêu sắc như dao (49.10s) */}
          {laserP > 0.001 && (
            <g>
              <line
                x1={laserStart[0]}
                y1={laserStart[1]}
                x2={targetX}
                y2={targetY - 6}
                stroke={P.laser}
                strokeWidth={9.5}
                opacity={0.38}
                filter="url(#glow)"
                {...drawOn(laserLen, laserP)}
              />
              <line
                x1={laserStart[0]}
                y1={laserStart[1]}
                x2={targetX}
                y2={targetY - 6}
                stroke={P.laser}
                strokeWidth={4.4}
                filter="url(#glow)"
                {...drawOn(laserLen, laserP)}
              />
              <line
                x1={laserStart[0]}
                y1={laserStart[1]}
                x2={targetX}
                y2={targetY - 6}
                stroke="#eafff8"
                strokeWidth={1.7}
                {...drawOn(laserLen, laserP)}
              />
              {/* Xung đo khoảng cách (rangefinder pulses) chạy dọc tia laser */}
              {laserP > 0.4 &&
                [0, 0.25, 0.5, 0.75].map((off, idx) => {
                  const s = ((t - CUE.s05_laser) * 1.15 + off) % 1;
                  const px = lerp(laserStart[0], targetX, s);
                  const py = lerp(laserStart[1], targetY - 6, s);
                  const ang = (Math.atan2(targetY - 6 - laserStart[1], targetX - laserStart[0]) * 180) / Math.PI;
                  return (
                    <g key={idx} transform={`translate(${px}, ${py}) rotate(${ang})`} opacity={0.95 - s * 0.35}>
                      <line x1={0} y1={-13} x2={0} y2={13} stroke={P.laser} strokeWidth={2.4} filter="url(#glow)" />
                      <polyline points="-7,-7 2,0 -7,7" fill="none" stroke="#ffffff" strokeWidth={2} />
                    </g>
                  );
                })}
              {/* Khung thoi khóa chiếu xạ laser tại điểm chạm mục tiêu */}
              {laserP >= 0.92 && (
                <g transform={`translate(${targetX}, ${targetY - 6})`}>
                  <circle
                    cx={0}
                    cy={0}
                    r={11 + 4 * Math.sin(t * 18)}
                    fill={P.laser}
                    opacity={0.38}
                    filter="url(#glow)"
                  />
                  <polygon
                    points="0,-25 25,0 0,25 -25,0"
                    fill="none"
                    stroke={P.laser}
                    strokeWidth={2.8}
                    filter="url(#glow)"
                  />
                  <line x1={-35} y1={0} x2={-14} y2={0} stroke={P.laser} strokeWidth={2.2} />
                  <line x1={14} y1={0} x2={35} y2={0} stroke={P.laser} strokeWidth={2.2} />
                  <line x1={0} y1={-35} x2={0} y2={-14} stroke={P.laser} strokeWidth={2.2} />
                  <line x1={0} y1={14} x2={0} y2={35} stroke={P.laser} strokeWidth={2.2} />
                  <circle cx={0} cy={0} r={4.5} fill="#ffffff" />
                </g>
              )}
            </g>
          )}

          {/* 3D. Cung sóng quạt Radar trinh sát Lynx SAR từ bầu mũi (51.00s) */}
          {radarP > 0.001 && (
            <g opacity={radarP}>
              <path
                d={`M ${radarOrigin[0]} ${radarOrigin[1]} L ${radarOrigin[0] + 775} ${radarOrigin[1] - 50} A 785 785 0 0 1 ${radarOrigin[0] + 645} ${radarOrigin[1] + 455} Z`}
                fill="url(#s05-radar-cone)"
              />
              <g transform={`translate(${radarOrigin[0]}, ${radarOrigin[1]}) rotate(${radarSweepDeg})`}>
                <line x1={0} y1={0} x2={745} y2={0} stroke={P.gold} strokeWidth={3} opacity={0.85} filter="url(#glow)" />
              </g>
              {[130, 235, 345, 460, 580, 705].map((baseR, idx) => {
                const expand = ((t - CUE.s05_radar) * 210 + baseR) % 745;
                const r = Math.max(70, expand);
                const a0 = (-4 * Math.PI) / 180;
                const a1 = (35.5 * Math.PI) / 180;
                const x0 = radarOrigin[0] + Math.cos(a0) * r;
                const y0 = radarOrigin[1] + Math.sin(a0) * r;
                const x1 = radarOrigin[0] + Math.cos(a1) * r;
                const y1 = radarOrigin[1] + Math.sin(a1) * r;
                const fade = Math.sin((r / 745) * Math.PI);
                return (
                  <path
                    key={idx}
                    d={`M ${x0.toFixed(1)} ${y0.toFixed(1)} A ${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`}
                    fill="none"
                    stroke={P.gold}
                    strokeWidth={idx % 2 === 0 ? 3.3 : 2.1}
                    strokeDasharray={idx % 2 === 0 ? undefined : '16 10'}
                    opacity={Math.max(0.14, fade * 0.94)}
                    filter={idx % 2 === 0 ? 'url(#glow)' : undefined}
                  />
                );
              })}
            </g>
          )}

          {/* 4. THÂN MŨI MACRO CỦA MQ-9 REAPER (Chiếm ~65% phía trên-trái, đổ khối 3 tông + mặt cắt Lynx SAR) */}
          <g filter="url(#sh)">
            {/* Anten vây lưng UHF phía sau bướu SATCOM */}
            <polygon
              points="162,232 194,158 238,162 224,232"
              fill={P.uavLight}
              stroke={P.ink}
              strokeWidth={3}
              strokeLinejoin="round"
            />
            <line x1={198} y1={164} x2={178} y2={228} stroke={P.uavHighlight} strokeWidth={3} />

            {/* Ống đo tốc độ / áp suất không khí Pitot trước chóp mũi */}
            <g>
              <rect x={1216} y={376} width={38} height={11} rx={3} fill={P.uavDark} stroke={P.ink} strokeWidth={2.4} />
              <line x1={1252} y1={381.5} x2={1326} y2={381.5} stroke={P.uavHighlight} strokeWidth={4.5} strokeLinecap="round" />
              <line x1={1252} y1={383.5} x2={1324} y2={383.5} stroke={P.ink} strokeWidth={1.6} />
            </g>

            {/* Sống bụng khí tài (ventral canoe fairing) dưới thân trước */}
            <path
              d="M -200,438 L 836,438 L 912,424 L 795,462 L -200,462 Z"
              fill={P.uavShadow}
              stroke={P.ink}
              strokeWidth={3}
              strokeLinejoin="round"
            />

            {/* Vỏ thân chính có bướu SATCOM đặc trưng */}
            <path
              d="M -220,234
                 L 250,226
                 C 410,222 495,124 652,122
                 C 808,120 946,192 1068,262
                 C 1152,310 1208,350 1226,380
                 C 1212,410 1138,434 1020,440
                 L 812,444
                 L -220,444 Z"
              fill={P.uavMid}
              stroke={P.ink}
              strokeWidth={3.6}
              strokeLinejoin="round"
            />

            {/* Đổ khối 3 tông (sống lưng đón nắng bình minh & mặt tối dưới bụng) */}
            <g clipPath="url(#s05-nose-clip)">
              <path
                d="M -220,234 L 250,226 C 410,222 495,124 652,122 C 815,120 962,196 1085,270 L 1226,380 L 1140,368 C 980,298 815,212 645,210 C 480,208 380,276 235,282 L -220,286 Z"
                fill={P.uavHighlight}
                opacity={0.86}
              />
              <path
                d="M -220,382 L 860,386 C 1015,388 1138,396 1224,382 L 1205,436 L 810,448 L -220,448 Z"
                fill={P.uavDark}
                opacity={0.78}
              />

              {/* Các vách khung sườn & đinh tán vỏ máy bay */}
              {[80, 310, 560, 825, 985].map((px) => (
                <g key={px}>
                  <line x1={px} y1={115} x2={px} y2={446} stroke={P.uavShadow} strokeWidth={2} opacity={0.72} />
                  {[255, 295, 335, 375, 412].map((ry) => (
                    <circle key={ry} cx={px + 7} cy={ry} r={2.1} fill={P.uavShadow} opacity={0.75} />
                  ))}
                </g>
              ))}
              <line x1={-180} y1={346} x2={830} y2={346} stroke={P.uavShadow} strokeWidth={1.8} opacity={0.55} />
            </g>

            {/* KHOANG CẮT GIẢI PHẪU BẦU MŨI (Lộ đĩa Radar trinh sát Lynx SAR & đường dẫn sóng tại 45.80s) */}
            {cutP > 0.001 && (
              <g opacity={cutP}>
                <path
                  d="M 465,248 C 510,178 585,152 678,154 C 742,156 785,184 806,226 L 806,338 L 465,338 Z"
                  fill="url(#s05-cavity)"
                  stroke={P.ink}
                  strokeWidth={3}
                />
                <line x1={575} y1={162} x2={575} y2={338} stroke={P.uavDark} strokeWidth={6} />
                <line x1={705} y1={158} x2={705} y2={338} stroke={P.uavDark} strokeWidth={6} />
                {/* Chảo SATCOM Ku-band nghiêng trên bướu lưng */}
                <g transform="translate(642, 224) rotate(-18)">
                  <rect x={-10} y={8} width={20} height={36} rx={3} fill={P.uavDark} stroke={P.ink} strokeWidth={2} />
                  <ellipse cx={0} cy={0} rx={58} ry={15} fill={P.uavLight} stroke={P.ink} strokeWidth={2.4} />
                  <ellipse cx={0} cy={-3} rx={46} ry={10} fill={P.uavHighlight} />
                  <line x1={0} y1={-4} x2={0} y2={-28} stroke={P.gold} strokeWidth={3} />
                  <circle cx={0} cy={-30} r={5} fill={P.gold} stroke={P.ink} strokeWidth={1.6} />
                </g>
                <rect x={486} y={272} width={76} height={50} rx={5} fill={P.boardCard} stroke={P.uavLight} strokeWidth={2} />
                <rect x={496} y={284} width={22} height={8} rx={2} fill={P.laser} opacity={0.85} />
                <rect x={524} y={284} width={26} height={8} rx={2} fill={P.gold} opacity={0.85} />
                <path
                  d="M 562,302 L 696,302 L 696,442"
                  fill="none"
                  stroke={P.gold}
                  strokeWidth={4.5}
                  strokeLinejoin="round"
                />
                <path
                  d="M 806,308 L 885,308"
                  fill="none"
                  stroke={P.gold}
                  strokeWidth={3.5}
                  strokeDasharray="8 5"
                />

                {/* KHOANG MŨI CHÍNH: AN/APY-8 LYNX SAR RADAR BAY */}
                <path
                  d="M 856,232
                     C 948,236 1042,270 1126,316
                     C 1176,344 1204,366 1212,380
                     C 1196,404 1130,424 1020,428
                     L 856,430 Z"
                  fill="url(#s05-cavity)"
                  stroke={P.ink}
                  strokeWidth={3.2}
                />
                <rect x={846} y={230} width={14} height={202} fill={P.uavLight} stroke={P.ink} strokeWidth={2.2} />
                {[246, 272, 298, 324, 350, 376, 402].map((hy) => (
                  <line key={hy} x1={846} y1={hy} x2={860} y2={hy + 14} stroke={P.ink} strokeWidth={1.8} />
                ))}

                {/* Bộ thu phát cao tần RF & Giá treo Gimbal 2 trục của Radar Lynx SAR */}
                <rect x={878} y={306} width={78} height={68} rx={6} fill="#25394f" stroke={P.uavLight} strokeWidth={2.2} />
                <line x1={890} y1={324} x2={944} y2={324} stroke={P.gold} strokeWidth={2.5} />
                <line x1={890} y1={340} x2={934} y2={340} stroke={P.uavMid} strokeWidth={2.5} />
                <line x1={890} y1={356} x2={944} y2={356} stroke={P.uavMid} strokeWidth={2.5} />
                <path
                  d="M 956,340 L 1018,340 L 1048,346"
                  fill="none"
                  stroke={P.uavHighlight}
                  strokeWidth={7}
                  strokeLinecap="round"
                />
                <circle cx={1018} cy={340} r={9} fill={P.uavMid} stroke={P.ink} strokeWidth={2.2} />

                {/* Đĩa Anten phẳng khe sóng (Slotted Planar Array) Lynx SAR nghiêng về trước-dưới */}
                <g
                  transform={`translate(${radarOrigin[0]}, ${radarOrigin[1]}) rotate(${21 + (radarP > 0 ? Math.sin(t * 5) * 2.5 : 0)})`}
                >
                  <rect x={-14} y={-66} width={16} height={132} rx={5} fill={P.uavDark} stroke={P.ink} strokeWidth={2.4} />
                  <ellipse
                    cx={6}
                    cy={0}
                    rx={16}
                    ry={64}
                    fill={radarP > 0 ? P.gold : '#c8963e'}
                    stroke={P.ink}
                    strokeWidth={2.6}
                    filter={radarP > 0 ? 'url(#glow)' : undefined}
                  />
                  {[-44, -28, -12, 4, 20, 36].map((sy) => (
                    <line
                      key={sy}
                      x1={-3}
                      y1={sy}
                      x2={15}
                      y2={sy}
                      stroke={radarP > 0 ? '#fff6d6' : P.ink}
                      strokeWidth={2}
                    />
                  ))}
                </g>

                <g transform={`translate(${cutP * 26}, ${-cutP * 22})`} opacity={0.34}>
                  <path
                    d="M 858,228 C 958,236 1068,268 1222,378 C 1206,408 1134,428 1020,434"
                    fill="none"
                    stroke={P.uavHighlight}
                    strokeWidth={2.6}
                    strokeDasharray="12 7"
                  />
                </g>
              </g>
            )}
          </g>

          {/* 5. QUẢ CẦU CẢM BIẾN ĐA QUANG PHỔ AN/DAS-1 MTS-B DƯỚI CẰM (Tỷ lệ ts = 1.12x lớn & sắc nét) */}
          <g transform={`translate(${tx}, ${ty}) scale(${ts})`} filter="url(#sh)">
            {/* Cổ xoay Azimuth gắn vào bụng cằm máy bay */}
            <rect
              x={-98}
              y={-152}
              width={196}
              height={32}
              rx={6}
              fill={P.uavDark}
              stroke={P.ink}
              strokeWidth={3.2}
            />
            <rect
              x={-78}
              y={-124}
              width={156}
              height={24}
              rx={4}
              fill={P.uavMid}
              stroke={P.ink}
              strokeWidth={3}
            />
            {[-56, -28, 0, 28, 56].map((bx) => (
              <circle key={bx} cx={bx} cy={-136} r={3.5} fill={P.uavHighlight} stroke={P.ink} strokeWidth={1.4} />
            ))}

            {/* Khối cầu MTS-B xoay ngắm góc turretRot */}
            <g transform={`rotate(${turretRot})`}>
              <circle cx={0} cy={0} r={154} fill={P.uavMid} stroke={P.ink} strokeWidth={3.6} />
              <g clipPath="url(#s05-sphere-clip)">
                <ellipse cx={-26} cy={-74} rx={138} ry={82} fill={P.uavHighlight} opacity={0.78} />
                <path d="M -160,65 C -60,120 65,118 160,55 L 160,165 L -160,165 Z" fill={P.uavDark} opacity={0.85} />
                <path d="M -30,-156 C 18,-60 18,60 -30,156" fill="none" stroke={P.uavShadow} strokeWidth={2.4} />
                <line x1={-156} y1={0} x2={115} y2={0} stroke={P.uavShadow} strokeWidth={2} opacity={0.65} />
              </g>

              {/* Khung cửa sổ quang học lồi phía trước bên phải của cầu MTS-B */}
              <path
                d="M 118,-108 L 154,-88 C 166,-32 166,32 154,88 L 118,108 Z"
                fill="#19212c"
                stroke={P.ink}
                strokeWidth={3.2}
                strokeLinejoin="round"
              />
              {/* 4 Cửa kính thấu kính mặt trước khớp chính xác tọa độ lensWorld */}
              <ellipse cx={148} cy={-74} rx={7} ry={13} fill="#256b64" stroke={P.ink} strokeWidth={2} />
              <ellipse
                cx={154}
                cy={-34}
                rx={9}
                ry={22}
                fill={flirP > 0 ? P.flirHot : '#b86228'}
                stroke={P.ink}
                strokeWidth={2.2}
                filter={flirP > 0 ? 'url(#glow)' : undefined}
              />
              <ellipse
                cx={156}
                cy={14}
                rx={8.5}
                ry={18}
                fill={eoP > 0 ? '#6ce5ff' : P.opticGlass}
                stroke={P.ink}
                strokeWidth={2.2}
                filter={eoP > 0 ? 'url(#glow)' : undefined}
              />
              <ellipse
                cx={150}
                cy={60}
                rx={7.5}
                ry={14}
                fill={laserP > 0 ? P.laser : '#198768'}
                stroke={P.ink}
                strokeWidth={2.2}
                filter={laserP > 0 ? 'url(#glow)' : undefined}
              />

              {/* GIẢI PHẪU NỘI THẤT CƠ - QUANG HỌC BÊN TRONG QUẢ CẦU MTS-B (Mở tại 45.80s) */}
              {cutP > 0.001 && (
                <g opacity={cutP}>
                  <circle cx={-4} cy={0} r={138} fill="url(#s05-cavity)" stroke={P.uavLight} strokeWidth={3} />
                  <circle
                    cx={-4}
                    cy={0}
                    r={145}
                    fill="none"
                    stroke={P.uavShadow}
                    strokeWidth={6}
                    strokeDasharray="9 7"
                  />

                  {/* Khung Gimbal chống rung 4 trục & Mô-tơ servo đồng bên trái lòng cầu */}
                  <ellipse cx={-12} cy={0} rx={118} ry={124} fill="none" stroke="#355270" strokeWidth={5} />
                  <rect x={-126} y={-46} width={44} height={92} rx={8} fill="#26384d" stroke={P.uavLight} strokeWidth={2.2} />
                  <rect x={-118} y={-34} width={28} height={26} rx={3} fill="#c87638" stroke={P.ink} strokeWidth={1.6} />
                  <rect x={-118} y={2} width={28} height={32} rx={4} fill="#466c8c" stroke={P.ink} strokeWidth={1.6} />
                  <path
                    d="M -22,-136 C -48,-102 -78,-84 -96,-46"
                    fill="none"
                    stroke={P.gold}
                    strokeWidth={4}
                  />

                  {/* Cụm Gương phản xạ bẻ tia Beryllium 45 độ ở trung tâm bàn quang học */}
                  <g transform="translate(-44, -6)">
                    <polygon
                      points="-26,-56 12,-24 12,54 -26,22"
                      fill="#2b455e"
                      stroke={P.uavHighlight}
                      strokeWidth={2.4}
                    />
                    <line x1={-18} y1={-44} x2={6} y2={42} stroke="#9beeff" strokeWidth={3} opacity={0.85} />
                    <circle cx={-8} cy={0} r={8} fill={P.uavMid} stroke={P.ink} strokeWidth={2} />
                  </g>

                  {/* (1) Cụm phụ Spot Tracker trên cùng (y = -74) */}
                  <g transform="translate(8, -74)">
                    <rect x={-22} y={-11} width={132} height={22} rx={4} fill="#1d3044" stroke={P.uavMid} strokeWidth={2} />
                    {[22, 58, 94].map((lx) => (
                      <ellipse key={lx} cx={lx} cy={0} rx={4.5} ry={9} fill="#39a896" opacity={0.85} />
                    ))}
                  </g>

                  {/* (2) Cụm Camera Hồng ngoại FLIR (y = -34) */}
                  <g transform="translate(-14, -34)">
                    <rect
                      x={-26}
                      y={-20}
                      width={172}
                      height={40}
                      rx={6}
                      fill={flirP > 0 ? '#3d1f16' : '#1f3146'}
                      stroke={flirP > 0 ? P.flirHot : P.uavLight}
                      strokeWidth={2.6}
                    />
                    <rect
                      x={-18}
                      y={-13}
                      width={22}
                      height={26}
                      rx={2}
                      fill={flirP > 0 ? P.flirHot : '#8f4c24'}
                      filter={flirP > 0 ? 'url(#glow)' : undefined}
                    />
                    {[24, 62, 98, 130].map((lx, i) => (
                      <ellipse
                        key={lx}
                        cx={lx}
                        cy={0}
                        rx={6}
                        ry={16 - i * 1.1}
                        fill={flirP > 0 ? (i % 2 === 0 ? P.flirHot : P.flirWarm) : '#cc7632'}
                        stroke={P.ink}
                        strokeWidth={1.4}
                      />
                    ))}
                    {flirP > 0 && (
                      <line x1={-4} y1={0} x2={150} y2={0} stroke="#ffe2b8" strokeWidth={3} filter="url(#glow)" />
                    )}
                  </g>

                  {/* (3) Cụm Cảm biến Ngày/Đêm EO Telephoto (y = +14) */}
                  <g transform="translate(-18, 14)">
                    <rect
                      x={-20}
                      y={-17}
                      width={170}
                      height={34}
                      rx={5}
                      fill={eoP > 0 ? '#15364d' : '#1b2c3f'}
                      stroke={eoP > 0 ? '#6ce5ff' : P.uavLight}
                      strokeWidth={2.5}
                    />
                    <rect x={-12} y={-11} width={18} height={22} rx={2} fill={eoP > 0 ? '#8ef0ff' : '#2d6885'} />
                    {[24, 58, 94, 128].map((lx, i) => (
                      <ellipse
                        key={lx}
                        cx={lx}
                        cy={0}
                        rx={5.5}
                        ry={13.5 - i * 0.8}
                        fill={eoP > 0 ? '#7ae8ff' : '#3282a6'}
                        stroke={P.ink}
                        strokeWidth={1.4}
                      />
                    ))}
                    {eoP > 0 && (
                      <line x1={0} y1={0} x2={152} y2={0} stroke="#e6fbff" strokeWidth={2.6} filter="url(#glow)" />
                    )}
                  </g>

                  {/* (4) Cụm Buồng cộng hưởng Laser đo xa & chiếu xạ Nd:YAG (y = +60) */}
                  <g transform="translate(-6, 60)">
                    <rect
                      x={-22}
                      y={-15}
                      width={158}
                      height={30}
                      rx={5}
                      fill={laserP > 0 ? '#0f362c' : '#192a3a'}
                      stroke={laserP > 0 ? P.laser : P.uavMid}
                      strokeWidth={2.5}
                    />
                    <rect
                      x={-10}
                      y={-6}
                      width={86}
                      height={12}
                      rx={3}
                      fill={laserP > 0 ? P.laser : '#1b7a5e'}
                      filter={laserP > 0 ? 'url(#glow)' : undefined}
                    />
                    {[94, 122].map((lx) => (
                      <ellipse
                        key={lx}
                        cx={lx}
                        cy={0}
                        rx={5}
                        ry={11}
                        fill={laserP > 0 ? '#8affdc' : '#239c78'}
                        stroke={P.ink}
                        strokeWidth={1.4}
                      />
                    ))}
                  </g>

                  {/* Nắp vỏ cầu bên hông trượt mở sang trái */}
                  <g transform={`translate(${-cutP * 68}, ${cutP * 14})`} opacity={1 - cutP * 0.72}>
                    <path
                      d="M -20,-148 A 148 148 0 1 0 -20,148 Z"
                      fill={P.uavMid}
                      stroke={P.uavHighlight}
                      strokeWidth={2.5}
                      strokeDasharray="10 6"
                    />
                  </g>
                </g>
              )}
            </g>
          </g>

          {/* 6. BIỂU TƯỢNG QUANG HỌC TRỰC QUAN (KHÔNG DÙNG CHỮ) KHI KÍCH HOẠT FLIR & EO NGÀY/ĐÊM */}
          {/* 6A. Khung PIP mô phỏng ảnh nhiệt Hồng ngoại FLIR mục tiêu (47.06s) */}
          {flirPop > 0.01 && (
            <g
              transform={`translate(1155, 855) scale(${Math.min(1.04, flirPop)})`}
              opacity={Math.min(1, flirPop * 1.4)}
              filter="url(#sh)"
            >
              <line x1={-32} y1={-124} x2={-16} y2={-82} stroke={P.flirHot} strokeWidth={2} strokeDasharray="5 5" />
              <circle cx={-32} cy={-124} r={4.5} fill={P.flirHot} />

              <rect
                x={-130}
                y={-78}
                width={260}
                height={156}
                rx={10}
                fill="#111528"
                stroke={P.flirHot}
                strokeWidth={3}
              />
              <rect x={108} y={-58} width={9} height={28} fill="#fff4d2" />
              <rect x={108} y={-30} width={9} height={28} fill={P.flirWarm} />
              <rect x={108} y={-2} width={9} height={28} fill={P.flirHot} />
              <rect x={108} y={26} width={9} height={30} fill="#4d234a" />

              <path d="M -124,42 Q -40,18 35,34 T 100,28 L 100,72 L -124,72 Z" fill="#231d42" />
              <g transform="translate(-14, 16)" filter="url(#glow)">
                <ellipse cx={0} cy={6} rx={54} ry={22} fill={P.flirHot} opacity={0.35} />
                <polygon points="-38,18 -26,-10 24,-10 36,18" fill={P.flirHot} />
                <polygon points="-22,14 -14,-4 14,-4 22,14" fill={P.flirWarm} />
                <rect x={-10} y={-16} width={20} height={10} rx={2} fill="#fff6d6" />
                <rect x={44} y={4} width={24} height={12} rx={2} fill={P.flirWarm} />
                <circle cx={50} cy={8} r={4} fill="#fff6d6" />
              </g>

              <path
                d="M -90,-52 L -90,-36 M -90,-52 L -74,-52 M 82,-52 L 82,-36 M 82,-52 L 66,-52 M -90,52 L -90,36 M -90,52 L -74,52 M 82,52 L 82,36 M 82,52 L 66,52"
                fill="none"
                stroke={P.flirWarm}
                strokeWidth={2.2}
              />
              <line x1={-34} y1={10} x2={-18} y2={10} stroke="#fff6d6" strokeWidth={1.8} />
              <line x1={-6} y1={10} x2={10} y2={10} stroke="#fff6d6" strokeWidth={1.8} />
              <line x1={-12} y1={-12} x2={-12} y2={4} stroke="#fff6d6" strokeWidth={1.8} />
              <line x1={-12} y1={16} x2={-12} y2={32} stroke="#fff6d6" strokeWidth={1.8} />
            </g>
          )}

          {/* 6B. Biểu tượng Khẩu độ Iris mở + Mặt trời / Trăng lưỡi liềm của Cảm biến Ngày/Đêm (48.14s) */}
          {eoPop > 0.01 && (
            <g
              transform={`translate(1002, 514) scale(${Math.min(1.06, Math.max(0.55, eoPop))})`}
              opacity={Math.min(1, eoPop * 2.2)}
              filter="url(#sh)"
            >
              {/* Dây gióng từ biểu tượng khẩu độ xuống chùm tia EO Ngày/Đêm */}
              <line x1={-12} y1={44} x2={-22} y2={122} stroke="#7be8ff" strokeWidth={2} strokeDasharray="5 5" />
              <circle cx={-22} cy={122} r={4} fill="#7be8ff" />

              <circle cx={0} cy={0} r={44} fill="#0d2236" stroke="#7be8ff" strokeWidth={3} />
              {Array.from({ length: 6 }, (_, i) => {
                const openDeg = lerp(28, 6, eoP);
                return (
                  <g key={i} transform={`rotate(${i * 60 + eoP * 24})`}>
                    <path
                      d={`M 13,-35 L 38,-10 L ${16 + openDeg * 0.25},${-4 + openDeg * 0.35} Z`}
                      fill="#2b6b8f"
                      stroke="#aeefff"
                      strokeWidth={1.5}
                    />
                  </g>
                );
              })}
              <circle cx={0} cy={0} r={18 + eoP * 3} fill="#081726" stroke="#aef2ff" strokeWidth={1.8} />
              <path d="M 0,-11 A 11 11 0 0 0 0,11 Z" fill={P.gold} />
              {[-60, -30, 0, 30, 60].map((degA) => {
                const rad = ((degA + 180) * Math.PI) / 180;
                return (
                  <line
                    key={degA}
                    x1={Math.cos(rad) * 13}
                    y1={Math.sin(rad) * 13}
                    x2={Math.cos(rad) * 17.5}
                    y2={Math.sin(rad) * 17.5}
                    stroke={P.gold}
                    strokeWidth={2}
                    strokeLinecap="round"
                  />
                );
              })}
              <path d="M 2,-11 A 11 11 0 1 1 2,11 A 8 9 0 1 0 2,-11 Z" fill="#7be8ff" />
            </g>
          )}

          {/* Chớp sáng nhẹ trên cửa kính MTS-B đúng nhịp mở mặt cắt */}
          {bump(t, CUE.s05_mtsb_open, 0.55) > 0 && (
            <circle
              cx={tx + 128}
              cy={ty + 12}
              r={95 * bump(t, CUE.s05_mtsb_open, 0.55)}
              fill={P.laser}
              opacity={0.25 * bump(t, CUE.s05_mtsb_open, 0.55)}
              filter="url(#glow)"
            />
          )}

          {/* 7. Viền góc khung kỹ thuật mảnh (HUD Corner Brackets — sạch, không chữ) */}
          <g stroke={P.gridMajor} strokeWidth={2.5} fill="none" opacity={0.55}>
            <polyline points="68,104 68,68 108,68" />
            <polyline points="1852,104 1852,68 1812,68" />
            <polyline points="68,976 68,1012 108,1012" />
            <polyline points="1852,976 1852,1012 1812,1012" />
          </g>
        </Layer>
      </Cam2D>

      {/* Tối đa 1 Label duy nhất theo đúng quy định */}
      <Label
        t={t}
        text="MTS-B"
        x={280}
        y={882}
        from={CUE.s05_mtsb_open}
        until={49.0}
        size={56}
        bg={P.paper}
        fg={P.ink}
      />

      <Grain opacity={0.38} />
    </AbsoluteFill>
  );
};

export default S05;
