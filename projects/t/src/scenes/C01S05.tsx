// C01S05 (21.28–28.26 s): Quy luật phân bổ trọng lượng — Góc Isometric 45° trong buồng thử nghiệm STAGE_LAB.
// Bệ cân thủy lực công nghiệp 3D đỡ MBT 60 tấn với 4 trụ xi-lanh thủy lực lộ thiên ở 4 góc vát bát giác;
// 6 bức tường thép cán dày đúng 0.80 m (800 mm) trượt ép kín 6 mặt (có cửa cắt kỹ thuật chữ L + kính thép mỏng
// hướng camera để thấy sắc nét chiếc xe tăng bị đóng hộp bên trong), đè sập bàn cân lún sâu 0.65 m kịch đáy xi-lanh.
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { bump, lerp, mix, prog, useSpring, useT } from '@core/time';
import { extrudeTop, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { CUE } from '../cues';
import { HUDLabel, STAGE_LAB, THEME } from '../design';
import { MBT } from '../parts/MBT';

// Mặt bằng bàn cân thép bát giác công nghiệp (~12.4 m × 8.6 m) vát 4 góc sâu để lộ trọn 4 trụ xi-lanh thủy lực ngoài rìa
const SCALE_DECK_PTS: P2[] = [
  [-4.10, -4.30],
  [4.10, -4.30],
  [6.20, -2.20],
  [6.20, 2.20],
  [4.10, 4.30],
  [-4.10, 4.30],
  [-6.20, 2.20],
  [-6.20, -2.20],
];

const SCALE_RIM_PTS: P2[] = [
  [-4.18, -4.40],
  [4.18, -4.40],
  [6.30, -2.28],
  [6.30, 2.28],
  [4.18, 4.40],
  [-4.18, 4.40],
  [-6.30, 2.28],
  [-6.30, -2.28],
];

// 4 cụm xi-lanh piston thủy lực khổng lồ đặt lộ thiên tại 4 góc vát bát giác (không bị mặt bàn cân che khuất)
const PISTON_OUTRIGGERS: { pos: [number, number]; angle: number }[] = [
  { pos: [-5.48, -3.58], angle: -Math.PI * 0.75 },
  { pos: [5.48, -3.58], angle: -Math.PI * 0.25 },
  { pos: [5.48, 3.58], angle: Math.PI * 0.25 },
  { pos: [-5.48, 3.58], angle: Math.PI * 0.75 },
];

const FLOOR_Y = -1.62;
const WALL_THICK = 0.80; // Đúng 800 mm = 0.80 m tỉ lệ 1:1

const C01S05: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  // Mốc khớp cụm "phân bổ trọng lượng" (giữa c01_weight_law và c01_engine_limit)
  const tWeightPhrase = lerp(CUE.c01_weight_law, CUE.c01_engine_limit, 0.46);
  const gentleBounce = bump(t, tWeightPhrase, 1.05);

  // Giai đoạn nhấn khoang động cơ sau ("không một động cơ nào có thể kéo nổi") rồi khép lại trước khi đóng hộp thép
  const engineOpen =
    prog(t, CUE.c01_engine_limit, CUE.c01_engine_limit + 0.55) *
    (1 - prog(t, CUE.c01_box_clamp - 0.38, CUE.c01_box_clamp - 0.02));

  // 6 tấm tường thép dày 0.80 m bắt đầu trượt vào từ biên khung khi đọc "một khối thép" và ép sập đúng "800mm"
  const boxAppear = prog(t, CUE.c01_box_clamp - 0.36, CUE.c01_box_clamp - 0.05);
  const clampSlide = prog(
    t,
    CUE.c01_box_clamp - 0.32,
    CUE.c01_box_800_all,
    Easing.bezier(0.26, 0.0, 0.12, 1),
  );
  const sealLock = prog(t, CUE.c01_box_800_all, CUE.c01_box_sealed);

  // Bàn cân bị đè sập lún sâu 0.65 m kịch đáy 4 xi-lanh ngay khi 6 khối thép 800 mm đóng sập tại c01_box_800_all
  const preSag = prog(t, CUE.c01_box_clamp, CUE.c01_box_800_all) * 0.08;
  const rawCrushSpring = useSpring(t, CUE.c01_box_800_all, 14, 155);
  const overloadAmt = Math.max(0, Math.min(1.0, rawCrushSpring));
  const overloadColorMix = prog(t, CUE.c01_box_800_all - 0.04, CUE.c01_box_800_all + 0.20);

  // Tổng độ lún bàn cân khi quá tải = 0.08 + 0.57 = 0.65 m chuẩn xác
  const deckY = -gentleBounce * 0.09 - preSag - overloadAmt * 0.57;

  // Tấm đáy dày 0.80 m trượt kê dưới xích xe để lộ rõ chiều dày 0.80 m ngay trên mặt bàn cân
  const tankLocalY = WALL_THICK * clampSlide;
  const impactShakeY = bump(t, CUE.c01_box_800_all, 0.32) * -0.12;

  // Góc 5 — Isometric 45° Engineering Proving-Vault Hydraulic Scale (cao ~33°, fov=32)
  const sceneSpan = prog(t, CUE.c01_weight_law, CUE.c01_redistribute);
  const pullBack = prog(t, CUE.c01_box_clamp - 0.4, CUE.c01_box_sealed);
  const az = lerp(0.73, 0.82, sceneSpan); // ~42° -> ~47°
  const dist = lerp(19.6, 22.4, pullBack);
  const elev = 0.585; // ~33.5° nhìn rõ cả thân trụ piston thủy lực lẫn nóc hộp thép 800 mm
  const horizR = dist * Math.cos(elev);
  const lookY = lerp(0.62, 0.46, pullBack) + impactShakeY;
  const camPos: V3 = [
    Math.cos(az) * horizR + 0.15,
    lookY + dist * Math.sin(elev),
    Math.sin(az) * horizR,
  ];
  const camLook: V3 = [0.10, lookY, 0.0];

  // Hình học cache
  const geos = useMemo(
    () => ({
      deckCore: extrudeTop(SCALE_DECK_PTS, 0.30, 0.028),
      deckRim: extrudeTop(SCALE_RIM_PTS, 0.11, 0.018),
      hoseFL: pipe(
        [
          [-5.95, FLOOR_Y + 0.28, 3.85],
          [-6.65, FLOOR_Y + 0.14, 4.30],
          [-7.35, FLOOR_Y + 0.05, 4.65],
        ],
        0.038,
        18,
      ),
      hoseFR: pipe(
        [
          [5.95, FLOOR_Y + 0.28, 3.85],
          [6.65, FLOOR_Y + 0.14, 4.30],
          [7.35, FLOOR_Y + 0.05, 4.65],
        ],
        0.038,
        18,
      ),
      hoseRL: pipe(
        [
          [-5.95, FLOOR_Y + 0.28, -3.85],
          [-6.65, FLOOR_Y + 0.14, -4.30],
          [-7.35, FLOOR_Y + 0.05, -4.65],
        ],
        0.038,
        18,
      ),
      hoseRR: pipe(
        [
          [5.95, FLOOR_Y + 0.28, -3.85],
          [6.65, FLOOR_Y + 0.14, -4.30],
          [7.35, FLOOR_Y + 0.05, -4.65],
        ],
        0.038,
        18,
      ),
    }),
    [],
  );

  // Vật liệu sàn xưởng, bàn cân, xi-lanh và khối thép cán công nghiệp 800 mm (không đốm ngụy trang)
  const vaultFloorMat = plain('#0c1420', 0.66, 0.48);
  const pitFloorMat = plain('#060b12', 0.80, 0.34);
  const deckSteelMat = paint({
    color: '#2a3543',
    camo: [],
    repeat: 0.6,
    wear: 0.22,
    dirt: 0.12,
    roughness: 0.46,
    metalness: 0.64,
    seed: 53,
  });
  const darkMachinedMat = plain('#1a222d', 0.44, 0.74);
  const cylinderBodyMat = plain('#2a3848', 0.36, 0.78);
  const chromeRodMat = plain('#e3ecf7', 0.12, 0.95);
  const hazardYellowMat = plain('#d89a14', 0.44, 0.28);

  // Thép cán phay xám bạc đồng nhất, không loang camo để tôn khối hình học nặng nề dày 0.80 m
  const rolledSteel800Mat = paint({
    color: '#6e7c8c',
    camo: [],
    repeat: 2.2,
    wear: 0.16,
    dirt: 0.08,
    roughness: 0.42,
    metalness: 0.72,
    seed: 91,
  });
  const cutFaceSteelMat = plain('#8293a6', 0.52, 0.62);

  // Màu đèn đo tải trọng: Xanh lam chuẩn (60 tấn) -> Đỏ chói quá tải (>180 tấn)
  const loadHex = mix(THEME.apsCyan, THEME.threatRed, overloadColorMix);
  const loadGlowMat = plain(loadHex, 0.22, 0.3, {
    emissive: loadHex,
    emissiveIntensity: lerp(0.95, 1.75, overloadColorMix) + gentleBounce * 0.30,
  });

  // Chỉ viền mép cắt mảnh (22 mm) phát sáng vừa đủ để không gây loá mờ chiếc xe tăng bên trong
  const seamHex = mix(THEME.amberGold, THEME.threatRed, overloadColorMix);
  const cutSeamGlowMat = plain(seamHex, 0.24, 0.4, {
    emissive: seamHex,
    emissiveIntensity: lerp(0.65, 1.05, sealLock),
  });

  // Lớp kính thép kỹ thuật trong trẻo ở cửa cắt chữ L (opacity thấp 0.11 để thấy rõ 100% chi tiết MBT bên trong)
  const phantomSteelGlassMat = plain('#7f9bb8', 0.14, 0.25, {
    transparent: true,
    opacity: 0.11 * boxAppear,
    depthWrite: false,
  });

  const BOX_CX = 0.20;
  const slideDist = (1 - clampSlide) * 4.8;
  const roofDrop = (1 - clampSlide) * 4.2;

  // Kích thước ty ben thủy lực lộ thiên ở 4 góc ngoài: lộ dài 0.72 m khi bình thường -> nén sập còn 0.07 m khi lún 0.65 m!
  const barrelTopY = FLOOR_Y + 0.74; // -0.88 m
  const yokeY = deckY - 0.12;        // -0.12 m -> -0.77 m khi lún 0.65 m
  const rodVisibleH = Math.max(0.05, yokeY - barrelTopY);

  const loadSegments = 20;
  const activeSegCount = overloadColorMix > 0.3 ? loadSegments : Math.round(7 + gentleBounce * 3);

  return (
    <AbsoluteFill style={{ backgroundColor: '#070d17' }}>
      <Stage width={W} height={H} {...STAGE_LAB} shadowCenter={[0, 0.8, 0]} shadowArea={14.5}>
        <Cam pos={camPos} look={camLook} fov={32} />

        {/* Đèn phụ studio 3 điểm trong buồng thử nghiệm tôn khối thép xe tăng & 4 cụm piston mạ crôm */}
        <pointLight position={[11.0, 9.0, 11.5]} color="#dceeff" intensity={48} distance={40} decay={1.5} />
        <pointLight position={[-11.5, 8.0, -9.0]} color="#7ec8ff" intensity={38} distance={38} decay={1.5} />
        <pointLight position={[7.0, 3.2, -10.5]} color="#ffd7aa" intensity={28} distance={34} decay={1.6} />

        {/* Đèn nội thất trung tính đặt giữa khoang hộp giữ cho chiếc MBT bị đóng hộp luôn sáng rõ, không loá mép cắt */}
        {boxAppear > 0.05 && (
          <pointLight
            position={[-0.35, deckY + 2.55, 0.0]}
            color="#dcecff"
            intensity={16 * boxAppear}
            distance={7.5}
            decay={1.6}
          />
        )}

        {/* Đèn vàng hổ phách nhấn khoang động cơ V12 phía sau khi đọc "không một động cơ nào có thể kéo nổi" */}
        {engineOpen > 0.01 && (
          <pointLight
            position={[-3.45, deckY + 3.2, 0.8]}
            color={THEME.amberGold}
            intensity={38 * engineOpen}
            distance={8.5}
            decay={1.5}
          />
        )}

        {/* Đèn báo động đỏ hắt lên 4 trụ xi-lanh thủy lực khi quá tải >180 tấn */}
        {overloadColorMix > 0.01 && (
          <>
            <pointLight
              position={[5.6, FLOOR_Y + 1.3, 3.9]}
              color={THEME.threatRed}
              intensity={28 * overloadColorMix}
              distance={9.5}
              decay={1.6}
            />
            <pointLight
              position={[-5.6, FLOOR_Y + 1.3, 3.9]}
              color={THEME.threatRed}
              intensity={26 * overloadColorMix}
              distance={9.5}
              decay={1.6}
            />
          </>
        )}

        {/* ==================== 1. SÀN XƯỞNG THÉP BUỒNG THỬ NGHIỆM & HỐ CÂN 1M GRID ==================== */}
        <mesh position={[0, FLOOR_Y - 0.06, 0]} geometry={rbox(56, 0.12, 56, 0.01)} material={vaultFloorMat} receiveShadow />
        <gridHelper args={[44, 44, '#2d4d70', '#16283d']} position={[0, FLOOR_Y + 0.006, 0]} />

        {/* Hố móng bệ cân âm sàn viền vàng công nghiệp */}
        <mesh position={[0, FLOOR_Y + 0.015, 0]} geometry={rbox(15.2, 0.03, 11.2, 0.01)} material={pitFloorMat} receiveShadow />
        {([-5.62, 5.62] as const).map((zp, zi) => (
          <mesh key={`pit_z_${zi}`} position={[0, FLOOR_Y + 0.04, zp]} geometry={rbox(15.38, 0.06, 0.18, 0.01)} material={hazardYellowMat} />
        ))}
        {([-7.62, 7.62] as const).map((xp, xi) => (
          <mesh key={`pit_x_${xi}`} position={[xp, FLOOR_Y + 0.04, 0]} geometry={rbox(0.18, 0.06, 11.42, 0.01)} material={hazardYellowMat} />
        ))}

        {/* Khung cột buồng thử nghiệm phía xa */}
        {[-12, -4, 4, 12].map((px, pi) => (
          <group key={`pillar_${pi}`}>
            <mesh position={[px, 3.6, -14.0]} geometry={rbox(0.55, 10.6, 0.55, 0.03)} material={darkMachinedMat} />
            <mesh position={[-15.0, 3.6, px * 0.85]} geometry={rbox(0.55, 10.6, 0.55, 0.03)} material={darkMachinedMat} />
          </group>
        ))}

        {/* ==================== 2. 4 TRỤ XI-LANH THỦY LỰC LỘ THIÊN Ở 4 GÓC BÁT GIÁC ==================== */}
        <mesh geometry={geos.hoseFL} material={darkMachinedMat} />
        <mesh geometry={geos.hoseFR} material={darkMachinedMat} />
        <mesh geometry={geos.hoseRL} material={darkMachinedMat} />
        <mesh geometry={geos.hoseRR} material={darkMachinedMat} />

        {PISTON_OUTRIGGERS.map(({ pos: [px, pz], angle }, idx) => (
          <group key={`piston_${idx}`} position={[px, 0, pz]}>
            {/* Bệ móng thép bắt 4 góc hố cân */}
            <mesh position={[0, FLOOR_Y + 0.08, 0]} geometry={rbox(1.28, 0.16, 1.28, 0.025)} material={darkMachinedMat} receiveShadow />
            {/* Vỏ xi-lanh thủy lực hạng nặng (cao 0.60 m, cố định trên sàn hố) */}
            <mesh position={[0, FLOOR_Y + 0.42, 0]} material={cylinderBodyMat} castShadow receiveShadow>
              <cylinderGeometry args={[0.45, 0.48, 0.56, 28]} />
            </mesh>
            {/* Cổ bích xi-lanh & vòng chặn kịch đáy (tại y = -0.88 m) */}
            <mesh position={[0, barrelTopY - 0.03, 0]} material={darkMachinedMat} castShadow>
              <cylinderGeometry args={[0.53, 0.53, 0.09, 28]} />
            </mesh>
            <mesh position={[0, barrelTopY + 0.022, 0]} material={loadGlowMat}>
              <cylinderGeometry args={[0.48, 0.50, 0.034, 28]} />
            </mesh>

            {/* Cột đèn báo quá tải gắn trên vai xi-lanh */}
            <mesh
              position={[px > 0 ? 0.50 : -0.50, FLOOR_Y + 0.48, pz > 0 ? 0.25 : -0.25]}
              geometry={rbox(0.15, 0.28, 0.15, 0.02)}
              material={loadGlowMat}
            />

            {/* Ty ben mạ crôm sáng bóng lộ rõ 0.72 m ở 60 tấn -> bị đè thụt kịch đáy còn 0.07 m ở >180 tấn! */}
            <mesh position={[0, barrelTopY + rodVisibleH * 0.5, 0]} material={chromeRodMat} castShadow>
              <cylinderGeometry args={[0.27, 0.27, rodVisibleH + 0.04, 28]} />
            </mesh>

            {/* 3 vòng đệm lò xo chịu tải quanh ty ben bị ép sát vào nhau khi bàn cân sập */}
            {[0.25, 0.52, 0.79].map((frac, ri) => (
              <mesh
                key={ri}
                position={[0, barrelTopY + rodVisibleH * frac, 0]}
                material={ri === 1 ? loadGlowMat : darkMachinedMat}
              >
                <cylinderGeometry args={[0.36, 0.36, 0.038, 24]} />
              </mesh>
            ))}

            {/* Đầu khớp nối & tay đòn thép (Outrigger Yoke) vươn vào đỡ góc vát bàn cân */}
            <group position={[0, yokeY, 0]} rotation={[0, -angle, 0]}>
              <mesh material={cylinderBodyMat} castShadow>
                <cylinderGeometry args={[0.40, 0.36, 0.18, 24]} />
              </mesh>
              <mesh position={[-0.58, -0.02, 0]} geometry={rbox(1.16, 0.22, 0.52, 0.025)} material={darkMachinedMat} castShadow />
            </group>
          </group>
        ))}

        {/* ==================== 3. BÀN CÂN THÉP BÁT GIÁC + VÀNH ĐÈN ĐO TẢI TRỌNG ==================== */}
        <group position={[0, deckY, 0]}>
          <mesh position={[0, -0.30, 0]} geometry={geos.deckCore} material={deckSteelMat} castShadow receiveShadow />
          <mesh position={[0, -0.18, 0]} geometry={geos.deckRim} material={darkMachinedMat} castShadow receiveShadow />

          {/* Vành đèn LED đo tải ôm khít chuẩn xác 8 cạnh bàn cân bát giác */}
          <mesh position={[0, -0.09, 4.38]} geometry={rbox(8.24, 0.055, 0.06, 0.01)} material={loadGlowMat} />
          <mesh position={[0, -0.09, -4.38]} geometry={rbox(8.24, 0.055, 0.06, 0.01)} material={loadGlowMat} />
          <mesh position={[6.28, -0.09, 0]} geometry={rbox(0.06, 0.055, 4.46, 0.01)} material={loadGlowMat} />
          <mesh position={[-6.28, -0.09, 0]} geometry={rbox(0.06, 0.055, 4.46, 0.01)} material={loadGlowMat} />
          <mesh
            position={[5.24, -0.09, 3.34]}
            rotation={[0, -Math.PI / 4, 0]}
            geometry={rbox(0.06, 0.055, 2.96, 0.01)}
            material={loadGlowMat}
          />
          <mesh
            position={[-5.24, -0.09, 3.34]}
            rotation={[0, Math.PI / 4, 0]}
            geometry={rbox(0.06, 0.055, 2.96, 0.01)}
            material={loadGlowMat}
          />
          <mesh
            position={[5.24, -0.09, -3.34]}
            rotation={[0, Math.PI / 4, 0]}
            geometry={rbox(0.06, 0.055, 2.96, 0.01)}
            material={loadGlowMat}
          />
          <mesh
            position={[-5.24, -0.09, -3.34]}
            rotation={[0, -Math.PI / 4, 0]}
            geometry={rbox(0.06, 0.055, 2.96, 0.01)}
            material={loadGlowMat}
          />

          {/* Thang đo 20 vạch tải trọng trên mép bàn cân trước (+Z) */}
          {Array.from({ length: loadSegments }, (_, si) => {
            const sx = -3.80 + si * 0.40;
            const lit = si < activeSegCount;
            return (
              <mesh
                key={`seg_${si}`}
                position={[sx, 0.018, 4.10]}
                geometry={rbox(0.28, 0.036, 0.22, 0.008)}
                material={lit ? loadGlowMat : darkMachinedMat}
              />
            );
          })}

          {/* Hai vệt ray dẫn hướng xích xe tăng trên mặt bàn cân */}
          {([-1.48, 1.48] as const).map((zt, ti) => (
            <mesh key={`lane_${ti}`} position={[-0.35, 0.008, zt]} geometry={rbox(9.2, 0.016, 0.76, 0.004)} material={darkMachinedMat} receiveShadow />
          ))}

          {/* Khung đo giới hạn mô-men động cơ V12 ở đuôi xe khi tới mốc c01_engine_limit (không bật đỏ nóc xe) */}
          {engineOpen > 0.01 && (
            <group position={[-3.38, 0.024, 0]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.75, 1.94, 44]} />
                <meshStandardMaterial
                  color={THEME.amberGold}
                  emissive={THEME.amberGold}
                  emissiveIntensity={1.35 * engineOpen}
                  transparent
                  opacity={0.9 * engineOpen}
                  side={THREE.DoubleSide}
                />
              </mesh>
              <mesh position={[0, 1.55, 2.15]} geometry={rbox(1.95, 0.05, 0.05, 0.008)} material={cutSeamGlowMat} />
            </group>
          )}

          {/* ==================== 4. XE TĂNG CHỦ LỰC MBT TRÊN BÀN CÂN ==================== */}
          <MBT
            position={[-0.65, tankLocalY, 0]}
            gunPitch={0.02}
            turretYaw={0.04}
            explodeAmt={0}
            highlightZone="none"
          />

          {/* ==================== 5. SÁU TẤM TƯỜNG THÉP CÁN DÀY ĐÚNG 0.80 M (800 MM) ÉP KÍN 6 PHÍA ==================== */}
          {boxAppear > 0.005 && (
            <group>
              {/* (1) TẤM ĐÁY DÀY 0.80 M (11.60 × 0.80 × 5.56 m) */}
              <group position={[BOX_CX, -WALL_THICK * (1 - clampSlide) + WALL_THICK * 0.5, 0]}>
                <mesh geometry={rbox(11.60, WALL_THICK, 5.56, 0.025)} material={rolledSteel800Mat} castShadow receiveShadow />
                <mesh position={[0, WALL_THICK * 0.5 - 0.018, 2.785]} geometry={rbox(11.54, 0.024, 0.024, 0.004)} material={cutSeamGlowMat} />
                <mesh position={[5.805, WALL_THICK * 0.5 - 0.018, 0]} geometry={rbox(0.024, 0.024, 5.50, 0.004)} material={cutSeamGlowMat} />
              </group>

              {/* (2) TẤM TƯỜNG SAU (-X) DÀY ĐÚNG 0.80 M */}
              <group position={[-5.20 - slideDist, 2.13, 0]}>
                <mesh geometry={rbox(WALL_THICK, 2.66, 5.56, 0.025)} material={rolledSteel800Mat} castShadow receiveShadow />
                <mesh position={[0, 0, 2.785]} geometry={rbox(WALL_THICK - 0.04, 0.024, 0.024, 0.004)} material={cutSeamGlowMat} />
              </group>

              {/* (3) TẤM TƯỜNG SƯỜN XA (-Z) DÀY ĐÚNG 0.80 M */}
              <group position={[BOX_CX, 2.13, -2.38 - slideDist]}>
                <mesh geometry={rbox(10.00, 2.66, WALL_THICK, 0.025)} material={rolledSteel800Mat} castShadow receiveShadow />
              </group>

              {/* (4) TẤM TƯỜNG TRƯỚC (+X) DÀY ĐÚNG 0.80 M — cắt bậc góc trên +Z phơi bày mặt cắt kim loại dày 0.80 m */}
              <group position={[5.60 + slideDist, 0, 0]}>
                <mesh position={[0, 2.13, -1.23]} geometry={rbox(WALL_THICK, 2.66, 3.10, 0.022)} material={rolledSteel800Mat} castShadow receiveShadow />
                <mesh position={[0, 1.17, 1.55]} geometry={rbox(WALL_THICK, 0.74, 2.46, 0.02)} material={rolledSteel800Mat} castShadow receiveShadow />
                <mesh position={[0, 2.50, 2.38]} geometry={rbox(WALL_THICK, 1.92, WALL_THICK, 0.02)} material={rolledSteel800Mat} castShadow />
                {/* Mặt cắt kim loại phay sáng dày 0.80 m + chỉ viền mảnh 22 mm (không loá) */}
                <mesh position={[0, 2.50, 0.33]} geometry={rbox(WALL_THICK - 0.01, 1.92, 0.025, 0.004)} material={cutFaceSteelMat} />
                <mesh position={[0, 1.55, 1.15]} geometry={rbox(WALL_THICK - 0.01, 0.025, 1.66, 0.004)} material={cutFaceSteelMat} />
                <mesh position={[WALL_THICK * 0.5, 2.50, 0.33]} geometry={rbox(0.022, 1.92, 0.028, 0.004)} material={cutSeamGlowMat} />
                <mesh position={[-WALL_THICK * 0.5, 2.50, 0.33]} geometry={rbox(0.022, 1.92, 0.028, 0.004)} material={cutSeamGlowMat} />
                <mesh position={[0, 2.50, 1.15]} geometry={rbox(WALL_THICK * 0.90, 1.90, 1.62, 0.01)} material={phantomSteelGlassMat} />
              </group>

              {/* (5) TẤM TƯỜNG SƯỜN PHẢI (+Z, HƯỚNG CAMERA) DÀY ĐÚNG 0.80 M — cửa cắt kỹ thuật chữ L */}
              <group position={[0, 0, 2.38 + slideDist]}>
                <mesh position={[-3.95, 2.13, 0]} geometry={rbox(1.70, 2.66, WALL_THICK, 0.022)} material={rolledSteel800Mat} castShadow receiveShadow />
                <mesh position={[4.50, 2.13, 0]} geometry={rbox(1.40, 2.66, WALL_THICK, 0.022)} material={rolledSteel800Mat} castShadow receiveShadow />
                <mesh position={[0.35, 0.98, 0]} geometry={rbox(6.90, 0.36, WALL_THICK, 0.018)} material={rolledSteel800Mat} castShadow receiveShadow />

                {/* Vách mặt cắt thép đặc dày 0.80 m phay sáng + vạch thước đo 800 mm + chỉ viền mép mảnh */}
                <mesh position={[-3.09, 2.31, 0]} geometry={rbox(0.028, 2.30, WALL_THICK - 0.01, 0.004)} material={cutFaceSteelMat} />
                <mesh position={[3.79, 2.31, 0]} geometry={rbox(0.028, 2.30, WALL_THICK - 0.01, 0.004)} material={cutFaceSteelMat} />
                <mesh position={[0.35, 1.17, 0]} geometry={rbox(6.90, 0.028, WALL_THICK - 0.01, 0.004)} material={cutFaceSteelMat} />

                {/* Chỉ viền phát sáng mảnh 22 mm chạy dọc hai mép ngoài/trong để khóa rõ chiều dày 0.80 m */}
                {([-WALL_THICK * 0.5 + 0.014, WALL_THICK * 0.5 - 0.014] as const).map((dz, ei) => (
                  <React.Fragment key={`edge_s_${ei}`}>
                    <mesh position={[-3.09, 2.31, dz]} geometry={rbox(0.032, 2.30, 0.022, 0.003)} material={cutSeamGlowMat} />
                    <mesh position={[3.79, 2.31, dz]} geometry={rbox(0.032, 2.30, 0.022, 0.003)} material={cutSeamGlowMat} />
                    <mesh position={[0.35, 1.17, dz]} geometry={rbox(6.90, 0.032, 0.022, 0.003)} material={cutSeamGlowMat} />
                  </React.Fragment>
                ))}

                {/* Gân vạch chia 0.80 m trên vách mặt cắt trụ sườn */}
                {[-0.26, -0.09, 0.09, 0.26].map((dz, ti) => (
                  <mesh key={`tick_s_${ti}`} position={[-3.07, 2.15, dz]} geometry={rbox(0.035, 0.05, 0.022, 0.003)} material={cutSeamGlowMat} />
                ))}

                <mesh position={[0.35, 2.31, 0]} geometry={rbox(6.84, 2.26, WALL_THICK * 0.90, 0.01)} material={phantomSteelGlassMat} />
              </group>

              {/* (6) TẤM NÓC THÉP KHỔNG LỒ (+Y) DÀY ĐÚNG 0.80 M — mặt cắt thép đặc dày 0.80 m ngay trên tháp pháo */}
              <group position={[0, 3.86 + roofDrop, 0]}>
                <mesh position={[BOX_CX, 0, -1.15]} geometry={rbox(11.60, WALL_THICK, 3.26, 0.025)} material={rolledSteel800Mat} castShadow receiveShadow />
                <mesh position={[-4.35, 0, 1.63]} geometry={rbox(2.50, WALL_THICK, 2.30, 0.022)} material={rolledSteel800Mat} castShadow />
                <mesh position={[4.90, 0, 1.63]} geometry={rbox(2.20, WALL_THICK, 2.30, 0.022)} material={rolledSteel800Mat} castShadow />

                {/* Mặt cắt kim loại phay sáng dày 0.80 m của tấm nóc ngay trên tháp pháo */}
                <mesh position={[0.35, 0, 0.49]} geometry={rbox(6.90, WALL_THICK - 0.01, 0.028, 0.004)} material={cutFaceSteelMat} />
                <mesh position={[-3.09, 0, 1.63]} geometry={rbox(0.028, WALL_THICK - 0.01, 2.30, 0.004)} material={cutFaceSteelMat} />
                <mesh position={[3.79, 0, 1.63]} geometry={rbox(0.028, WALL_THICK - 0.01, 2.30, 0.004)} material={cutFaceSteelMat} />

                {/* Chỉ viền phát sáng mảnh 22 mm trên và dưới mặt cắt 0.80 m của tấm nóc */}
                {([-WALL_THICK * 0.5 + 0.014, WALL_THICK * 0.5 - 0.014] as const).map((dy, ri) => (
                  <React.Fragment key={`edge_r_${ri}`}>
                    <mesh position={[0.35, dy, 0.50]} geometry={rbox(6.92, 0.022, 0.032, 0.003)} material={cutSeamGlowMat} />
                    <mesh position={[-3.09, dy, 1.63]} geometry={rbox(0.032, 0.022, 2.30, 0.003)} material={cutSeamGlowMat} />
                    <mesh position={[3.79, dy, 1.63]} geometry={rbox(0.032, 0.022, 2.30, 0.003)} material={cutSeamGlowMat} />
                  </React.Fragment>
                ))}

                {/* Thước vạch chia 800 mm dựng dọc trên mặt cắt 0.80 m của tấm nóc */}
                {[-1.8, 0.0, 1.8].map((tx, colIdx) =>
                  [-0.24, 0.0, 0.24].map((dy, ri) => (
                    <mesh key={`rt_${colIdx}_${ri}`} position={[tx, dy, 0.512]} geometry={rbox(0.14, 0.020, 0.024, 0.003)} material={cutSeamGlowMat} />
                  )),
                )}

                <mesh position={[0.35, 0, 1.63]} geometry={rbox(6.84, WALL_THICK * 0.90, 2.26, 0.01)} material={phantomSteelGlassMat} />
              </group>
            </group>
          )}
        </group>
      </Stage>

      <HUDLabel
        t={t}
        from={CUE.c01_box_800_all}
        text="800 MM × 6 MẶT > 180 TẤN"
        sub="VƯỢT QUÁ GIỚI HẠN MỌI ĐỘNG CƠ"
        accent={THEME.threatRed}
        x={W * 0.5}
        y={H - SAFE * 2.0}
      />
    </AbsoluteFill>
  );
};

export default C01S05;
