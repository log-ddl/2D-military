// C01S06 (28.26–36.18 s): Dồn giáp ra mặt trước & tử huyệt nóc/sau mỏng 30–40 mm —
// Góc 6: High Overhead Bird's-Eye ~75° Exploded-Armor View trong STAGE_LAB.
// Camera đặt tít trên cao (y ≈ 11.8 → 9.5 m, bán kính ngang ~3.25 m) chúc ~75° xuống lưng MBT trên mâm đo đạc phương vị 3D.
// Khối giáp composite mũi & hai má tháp pháo dày ~800 mm (xanh thép THEME.armorStrong) trượt tiến về +X;
// tấm nóc tháp pháo (40 mm) và nắp khoang động cơ (35 mm) phát sáng đỏ-cam (THEME.armorWeak) bay tách lên,
// kết hợp giá nghiêng giải phẫu trên mâm đo phơi bày trọn vẹn khoang đạn 120mm trong bustle và 2 quạt động cơ V12 bên dưới.
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { lerp, prog, useT } from '@core/time';
import { extrudeTop, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { CUE } from '../cues';
import { HUDLabel, STAGE_LAB, THEME } from '../design';
import { MBT } from '../parts/MBT';

// Mũi tên phẳng biểu diễn dòng phân bổ khối lượng giáp dồn về mặt trước (+X)
const CHEVRON_ARROW_PTS: P2[] = [
  [-0.36, -0.26],
  [0.08, -0.26],
  [0.36, 0.0],
  [0.08, 0.26],
  [-0.36, 0.26],
  [-0.14, 0.0],
];

const C01S06: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  // Tiến độ các giai đoạn giải phẫu vỏ giáp bám chính xác mốc voice CUE
  const moveRoll = prog(t, CUE.c01_redistribute, CUE.c01_shift_front, Easing.out(Easing.cubic));
  const frontShift = prog(t, CUE.c01_shift_front, CUE.c01_shift_front + 1.0, Easing.bezier(0.22, 0.0, 0.15, 1));
  const roofExpose = prog(t, CUE.c01_thin_roof, CUE.c01_thin_deck + 0.72, Easing.bezier(0.25, 0.0, 0.18, 1));
  const deckExpose = prog(t, CUE.c01_thin_deck, CUE.c01_thin_deck + 0.82, Easing.bezier(0.25, 0.0, 0.18, 1));
  const mmCallout = prog(t, CUE.c01_thin_mm - 0.15, CUE.c01_thin_mm + 0.45);

  // Vùng tô sáng giải phẫu & độ tách vỏ explodeAmt (0 -> 0.55 tại shift_front -> 0.98 tại thin_roof/deck)
  const highlightZone: 'none' | 'front' | 'weak' | 'both' =
    t >= CUE.c01_thin_roof ? 'both' : t >= CUE.c01_shift_front ? 'front' : 'none';
  const explodeAmt = 0.55 * frontShift + 0.43 * roofExpose;

  // Giá đỡ kiểm định giữa mâm xoay nghiêng nhẹ -16° quanh trục X khi tách tấm nóc để góc Bird's-Eye trên cao
  // nhìn xuyên thẳng vào khoang đạn đồng 120mm trong bustle và 2 quạt tản nhiệt V12 bên dưới tấm giáp đỏ lơ lửng
  const cradleTiltX = -0.28 * roofExpose;

  // Quỹ đạo Camera Góc 6 — High Overhead Bird's-Eye ~73–75° (y: 11.8 -> 9.5 m, bán kính ngang ~3.25 m quanh tâm xe)
  const orbitP = prog(t, CUE.c01_redistribute, CUE.c01_exploit_weak, Easing.inOut(Easing.sin));
  const az = lerp(1.14, 1.98, orbitP); // quét chậm trên đỉnh đầu ở bán cầu +Z để thân xe trải ngang khung 16:9
  const horizR = lerp(3.16, 3.38, orbitP);
  const camY = lerp(11.8, 9.5, orbitP);
  const camPos: V3 = [Math.cos(az) * horizR, camY, Math.sin(az) * horizR];
  const camLook: V3 = [
    lerp(0.20, -0.22, roofExpose),
    lerp(1.30, 1.44, roofExpose),
    lerp(0.0, -0.26, Math.max(roofExpose * 0.6, mmCallout)),
  ];

  // Hình học & Vật liệu cache
  const chevronGeo = useMemo(() => extrudeTop(CHEVRON_ARROW_PTS, 0.035, 0.006), []);

  const floorMat = plain('#0a111b', 0.72, 0.42);
  const turntableMat = paint({
    color: '#1b2533',
    camo: [],
    repeat: 0.8,
    wear: 0.16,
    dirt: 0.08,
    roughness: 0.50,
    metalness: 0.58,
    seed: 64,
  });
  const cradleSteelMat = plain('#222e3d', 0.45, 0.68);
  const darkRingMat = plain('#121a24', 0.56, 0.66);
  const gaugeSlotMat = plain('#162130', 0.52, 0.58);
  const tickMinorMat = plain('#3a526e', 0.4, 0.5);
  const tickMajorMat = plain('#7da2c9', 0.3, 0.5, { emissive: '#27486b', emissiveIntensity: 0.35 });

  const strongGlowMat = plain(THEME.armorStrong, 0.22, 0.45, {
    emissive: THEME.armorStrong,
    emissiveIntensity: 1.25,
  });
  const strongBlockMat = plain('#2a9df4', 0.25, 0.55, {
    transparent: true,
    opacity: 0.88 * frontShift,
    emissive: THEME.armorStrong,
    emissiveIntensity: 0.72,
  });

  const weakGlowMat = plain(THEME.armorWeak, 0.22, 0.38, {
    emissive: THEME.armorWeak,
    emissiveIntensity: 1.45,
  });
  const weakGuideMat = plain(THEME.armorWeak, 0.2, 0.3, {
    transparent: true,
    opacity: 0.75 * roofExpose,
    emissive: THEME.armorWeak,
    emissiveIntensity: 1.1,
  });

  const frontSlideX = explodeAmt * 1.1;
  const weakLiftY = explodeAmt * 1.25;

  return (
    <AbsoluteFill style={{ backgroundColor: '#070d17' }}>
      <Stage width={W} height={H} {...STAGE_LAB} shadowCenter={[0, 1.2, 0]} shadowArea={11.5}>
        <Cam pos={camPos} look={camLook} fov={46} />

        {/* Đèn studio chiếu đỉnh & ven sườn tôn rõ bề mặt lưng xe, lớp lõi NERA xanh và nội thất khoang máy */}
        <pointLight position={[5.5, 9.5, 6.5]} color="#dceeff" intensity={46} distance={32} decay={1.5} />
        <pointLight position={[-6.5, 8.8, -5.5]} color="#82caff" intensity={36} distance={30} decay={1.5} />
        <pointLight position={[0.0, 6.2, 7.8]} color="#ffe2bd" intensity={26} distance={26} decay={1.6} />

        {/* Đèn đặt gọn trong lòng khoang đạn bustle & khoang máy V12 chiếu sáng đạn đồng 120mm mà không loá sườn xe */}
        {roofExpose > 0.02 && (
          <>
            <pointLight
              position={[-1.65, 2.55, 0.12]}
              color="#ffe5b4"
              intensity={18 * roofExpose}
              distance={3.6}
              decay={1.7}
            />
            <pointLight
              position={[-2.74, 1.85, 0.12]}
              color="#ffd2a6"
              intensity={18 * deckExpose}
              distance={3.4}
              decay={1.7}
            />
          </>
        )}

        {/* ==================== 1. SÀN BUỒNG THỬ NGHIỆM & MÂM ĐO ĐẠC PHƯƠNG VỊ 3D ==================== */}
        <mesh position={[0, -0.14, 0]} geometry={rbox(46, 0.08, 46, 0.01)} material={floorMat} receiveShadow />
        <gridHelper args={[36, 36, '#1f3650', '#111f30']} position={[0, -0.095, 0]} />

        <group position={[0, 0, 0]}>
          <mesh position={[0, -0.05, 0]} material={turntableMat} receiveShadow>
            <cylinderGeometry args={[5.80, 5.92, 0.10, 72]} />
          </mesh>
          <mesh position={[0, -0.035, 0]} material={darkRingMat}>
            <cylinderGeometry args={[5.98, 6.06, 0.07, 72]} />
          </mesh>

          {/* Vòng tròn đồng tâm chuẩn đo lường */}
          {[2.20, 3.85, 5.45].map((rad, ri) => (
            <mesh key={`ring_${ri}`} position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[rad - 0.022, rad + 0.022, 80]} />
              <meshStandardMaterial color="#2f4b69" roughness={0.4} metalness={0.5} side={THREE.DoubleSide} />
            </mesh>
          ))}

          {/* 36 vạch chia góc phương vị 3D quanh mâm đo */}
          {Array.from({ length: 36 }, (_, ai) => {
            const a = (ai / 36) * Math.PI * 2;
            const isMajor = ai % 3 === 0;
            const len = isMajor ? 0.44 : 0.22;
            const rMid = 5.60 - len * 0.5;
            return (
              <mesh
                key={`az_${ai}`}
                position={[Math.cos(a) * rMid, 0.012, Math.sin(a) * rMid]}
                rotation={[0, -a, 0]}
                geometry={rbox(len, isMajor ? 0.026 : 0.016, isMajor ? 0.055 : 0.028, 0.004)}
                material={isMajor ? tickMajorMat : tickMinorMat}
              />
            );
          })}

          {/* Trục chữ thập tâm đo đạc X / Z */}
          <mesh position={[0, 0.005, 0]} geometry={rbox(10.8, 0.01, 0.028, 0.002)} material={tickMinorMat} />
          <mesh position={[0, 0.005, 0]} geometry={rbox(0.028, 0.01, 10.8, 0.002)} material={tickMinorMat} />
        </group>

        {/* ==================== 2. BỆ ĐỠ GIẢI PHẪU & MBT TÁCH LỚP VỎ GIÁP ==================== */}
        <group position={[0, Math.sin(-cradleTiltX) * 1.65, 0]} rotation={[cradleTiltX, 0, 0]}>
          {/* Hai dầm ray thép đỡ xích của bàn gá kiểm định (nghiêng đồng bộ cùng MBT để xích luôn bám chắc mặt bệ) */}
          {([-1.48, 1.48] as const).map((zr, ri) => (
            <mesh
              key={`cradle_${ri}`}
              position={[-0.15, -0.04, zr]}
              geometry={rbox(7.8, 0.08, 0.78, 0.015)}
              material={cradleSteelMat}
              receiveShadow
            />
          ))}

          <MBT
            position={[0, 0, 0]}
            travel={moveRoll * 1.35}
            turretYaw={0}
            gunPitch={0.025}
            highlightZone={highlightZone}
            explodeAmt={explodeAmt}
          />

          {/* 4 tia gióng đỏ mảnh nối tấm nóc tháp pháo 40 mm xuống dàn đạn pháo 120mm bên dưới */}
          {roofExpose > 0.01 &&
            (
              [
                [0.58, -1.22],
                [0.58, 1.22],
                [-2.25, -1.10],
                [-2.25, 1.10],
              ] as const
            ).map(([gx, gz], gi) => (
              <mesh
                key={`roof_guide_${gi}`}
                position={[gx, 2.33 + weakLiftY * 0.5, gz]}
                geometry={rbox(0.024, Math.max(0.05, weakLiftY), 0.024, 0.004)}
                material={weakGuideMat}
              />
            ))}

          {/* 4 tia gióng đỏ mảnh nối nắp khoang động cơ 35 mm xuống 2 quạt tản nhiệt V12 bên dưới */}
          {deckExpose > 0.01 &&
            (
              [
                [-1.72, -0.96],
                [-1.72, 0.96],
                [-3.74, -0.96],
                [-3.74, 0.96],
              ] as const
            ).map(([dx, dz], di) => (
              <mesh
                key={`deck_guide_${di}`}
                position={[dx, 1.48 + weakLiftY * 0.5, dz]}
                geometry={rbox(0.022, Math.max(0.05, weakLiftY), 0.022, 0.004)}
                material={weakGuideMat}
              />
            ))}
        </group>

        {/* ==================== 3. THƯỚC ĐỐI CHIẾU TỈ LỆ 1:1 TRÊN MẶT MÂM: 800 MM XANH vs 35–40 MM ĐỎ ==================== */}
        {frontShift > 0.01 && (
          <group>
            {/* Vòng cung lá chắn giáp mặt trước ±34° ở đầu mũi xe (+X) */}
            <mesh position={[0.35, 0.022, 0]} rotation={[-Math.PI / 2, 0, -0.58]}>
              <ringGeometry args={[4.95, 5.18, 40, 1, 0, 1.16 * frontShift]} />
              <meshStandardMaterial
                color={THEME.armorStrong}
                emissive={THEME.armorStrong}
                emissiveIntensity={1.25}
                transparent
                opacity={0.9 * frontShift}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* 3 mũi tên phẳng phát sáng trượt về phía mũi +X ("dồn phần lớn giáp ra mặt trước") */}
            {[0.35, 1.35, 2.35].map((ax, idx) => (
              <mesh
                key={`arr_${idx}`}
                position={[ax + frontShift * 0.40, 0.022, 2.55]}
                geometry={chevronGeo}
                material={strongGlowMat}
              />
            ))}

            {/* KHỐI CHUẨN GIÁP TRƯỚC 0.80 M (800 MM — LẤP ĐẦY 100% KHUNG THƯỚC KẸP 0.80 M) */}
            <group position={[3.35 + frontSlideX * 0.55, 0.06, 2.55]}>
              <mesh geometry={rbox(0.86, 0.04, 0.58, 0.008)} material={gaugeSlotMat} />
              <mesh position={[0, 0.05, 0]} geometry={rbox(0.80 * frontShift, 0.12, 0.48, 0.012)} material={strongBlockMat} />
              <mesh position={[-0.41 * frontShift, 0.06, 0]} geometry={rbox(0.032, 0.16, 0.58, 0.005)} material={strongGlowMat} />
              <mesh position={[0.41 * frontShift, 0.06, 0]} geometry={rbox(0.032, 0.16, 0.58, 0.005)} material={strongGlowMat} />
            </group>
          </group>
        )}

        {/* KHUNG THƯỚC KẸP 0.80 M CÙNG TỈ LỆ TẠI NÓC THÁP PHÁO: CHỈ CÓ LÁ THÉP ĐỎ MỎNG DÍNH 0.040 M (40 MM = 5%)! */}
        {roofExpose > 0.01 && (
          <group position={[-1.05, 0.06, 2.55]}>
            <mesh geometry={rbox(0.86, 0.035, 0.58, 0.008)} material={gaugeSlotMat} />
            <mesh position={[-0.41, 0.04, 0]} geometry={rbox(0.022, 0.09, 0.56, 0.004)} material={tickMinorMat} />
            <mesh position={[0.41, 0.04, 0]} geometry={rbox(0.022, 0.09, 0.56, 0.004)} material={tickMinorMat} />
            {/* Lá thép đỏ mỏng dính 40 mm nằm lọt thỏm trong khung 800 mm */}
            <mesh position={[0, 0.06, 0]} geometry={rbox(0.042, 0.14, 0.52, 0.005)} material={weakGlowMat} />
          </group>
        )}

        {/* KHUNG THƯỚC KẸP 0.80 M CÙNG TỈ LỆ TẠI KHOANG ĐỘNG CƠ SAU: LÁ THÉP ĐỎ MỎNG DÍNH 0.035 M (35 MM)! */}
        {deckExpose > 0.01 && (
          <group position={[-2.74, 0.06, 2.55]}>
            <mesh geometry={rbox(0.86, 0.035, 0.58, 0.008)} material={gaugeSlotMat} />
            <mesh position={[-0.41, 0.04, 0]} geometry={rbox(0.022, 0.09, 0.56, 0.004)} material={tickMinorMat} />
            <mesh position={[0.41, 0.04, 0]} geometry={rbox(0.022, 0.09, 0.56, 0.004)} material={tickMinorMat} />
            {/* Lá thép đỏ mỏng dính 35 mm nằm lọt thỏm trong khung 800 mm */}
            <mesh position={[0, 0.06, 0]} geometry={rbox(0.036, 0.14, 0.52, 0.005)} material={weakGlowMat} />
          </group>
        )}
      </Stage>

      <HUDLabel
        t={t}
        from={CUE.c01_thin_mm}
        text="NÓC & SAU: CHỈ 30–40 MM"
        sub="TỬ HUYỆT GIÁP MỎNG PHƠI BÀY TỪ TRÊN CAO"
        accent={THEME.armorWeak}
        x={W * 0.5}
        y={SAFE * 2.1}
      />
    </AbsoluteFill>
  );
};

export default C01S06;
