import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { TurretInterior3D } from '../parts/TurretInterior3D';

// Tâm quay chính xác của cụm 2 vòng gimbal & tấm gương phản xạ trong hộp GPS của TurretInterior3D ([1.08-0.01, 1.72+0.02, 0.68+0.02])
const MIRROR_PIVOT: V3 = [1.07, 1.74, 0.7];
const DEGREE_TICKS = [-0.6, -0.3, 0, 0.3, 0.6] as const;

const C01S05: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  // Dao động pitch / roll liên tục của thân tháp pháo mô phỏng dằn xóc địa hình (lệch pha vuông góc để mọi khung hình đều thấy góc nghiêng rõ)
  const ampBoost = 1 + 0.26 * prog(t, CUE.c01_s05_dual_gyro - 0.3, CUE.c01_s05_pitch_roll);
  const pitchOsc =
    (Math.sin(t * 3.8 + 0.35) * 0.072 + Math.sin(t * 7.9 + 1.2) * 0.034 + Math.cos(t * 13.4) * 0.012) * ampBoost;
  const rollOsc =
    (Math.cos(t * 3.3 + 0.7) * 0.066 + Math.sin(t * 6.7 + 2.1) * 0.029 + Math.sin(t * 11.8) * 0.011) * ampBoost;

  // Con quay hồi chuyển 2 trục nghiêng gương phẳng ngược chiều chính xác:
  // R_x(rollOsc) * R_z(pitchOsc) * R_z(-pitchOsc) * R_x(-rollOsc) === Identity tuyệt đối trong không gian 3D!
  const mirrorTilt: [number, number] = [-pitchOsc, -rollOsc];

  // Tính vị trí miệng ống dẫn quang học thị kính pháo thủ ([1.08, 1.38, 0.68] cục bộ) khi tháp pháo lắc để nối tia phản xạ liền mạch
  const eyepieceEntryWorld = useMemo<V3>(() => {
    const localRel = new THREE.Vector3(1.08 - MIRROR_PIVOT[0], 1.38 - MIRROR_PIVOT[1], 0.68 - MIRROR_PIVOT[2]);
    localRel.applyEuler(new THREE.Euler(rollOsc, 0, pitchOsc, 'XYZ'));
    return [MIRROR_PIVOT[0] + localRel.x, MIRROR_PIVOT[1] + localRel.y, MIRROR_PIVOT[2] + localRel.z];
  }, [rollOsc, pitchOsc]);

  const internalRayGeo = useMemo(() => {
    const p0 = new THREE.Vector3(...MIRROR_PIVOT);
    const p1 = new THREE.Vector3(...eyepieceEntryWorld);
    const curve = new THREE.LineCurve3(p0, p1);
    return new THREE.TubeGeometry(curve, 4, 0.006, 10, false);
  }, [eyepieceEntryWorld]);

  // Các mốc bật đồ hoạ quang học & thước đo góc con quay hồi chuyển
  const beamReveal = prog(t, CUE.c01_s05_start + 0.35, CUE.c01_s05_tiny_mirror + 0.3);
  const gyroHudAlpha = prog(t, CUE.c01_s05_dual_gyro - 0.35, CUE.c01_s05_dual_gyro + 0.55);
  const counterTiltGlow = prog(t, CUE.c01_s05_counter_tilt - 0.25, CUE.c01_s05_counter_tilt + 0.55);

  // ---------------- Ngôn ngữ Camera Macro Cắt bổ (Mở hoàn toàn ở hướng +Z / +Y, KHÔNG BỊ VÁCH THÉP CHE) ----------------
  // Nhịp 1 (80.64–84.85 s): Trượt từ góc 3/4 trước-phải qua gốc pháo M256 nặng nề vào cận cảnh hộp quang học GPS cắt bổ
  const pPushMacro = prog(t, 80.64, 84.85, Easing.inOut(Easing.cubic));
  // Nhịp 2 (85.40–92.00 s): Xoay cận cảnh macro quanh 2 vòng gimbal đồng/cyan & mặt gương chữ nhật sáng rực
  const pGyroOrbit = prog(t, 85.4, 92.0, Easing.inOut(Easing.sin));
  // Nhịp 3 (92.10–95.30 s): Mở góc nhẹ về trước-phải để thấy rõ cả gương nghiêng ngược chiều, tháp pháo chao lắc & tia cyan phẳng phiu tuyệt đối
  const pBeamShow = prog(t, 92.1, 94.8, Easing.inOut(Easing.cubic));

  const startPos: V3 = [2.46, 2.25, 2.42];
  const startLook: V3 = [1.12, 1.58, 0.48];

  const macroPosA: V3 = [1.56, 2.08, 1.74];
  const macroLookA: V3 = [1.09, 1.74, 0.7];

  const macroPosB: V3 = [1.3, 2.04, 1.6];
  const macroLookB: V3 = [1.08, 1.74, 0.69];

  const finalPos: V3 = [1.9, 2.05, 2.0];
  const finalLook: V3 = [1.31, 1.73, 0.67];

  const pos12: V3 = [
    lerp(lerp(startPos[0], macroPosA[0], pPushMacro), macroPosB[0], pGyroOrbit),
    lerp(lerp(startPos[1], macroPosA[1], pPushMacro), macroPosB[1], pGyroOrbit),
    lerp(lerp(startPos[2], macroPosA[2], pPushMacro), macroPosB[2], pGyroOrbit),
  ];
  const look12: V3 = [
    lerp(lerp(startLook[0], macroLookA[0], pPushMacro), macroLookB[0], pGyroOrbit),
    lerp(lerp(startLook[1], macroLookA[1], pPushMacro), macroLookB[1], pGyroOrbit),
    lerp(lerp(startLook[2], macroLookA[2], pPushMacro), macroLookB[2], pGyroOrbit),
  ];

  const camPos: V3 = [
    lerp(pos12[0], finalPos[0], pBeamShow),
    lerp(pos12[1], finalPos[1], pBeamShow),
    lerp(pos12[2], finalPos[2], pBeamShow),
  ];
  const camLook: V3 = [
    lerp(look12[0], finalLook[0], pBeamShow),
    lerp(look12[1], finalLook[1], pBeamShow),
    lerp(look12[2], finalLook[2], pBeamShow),
  ];
  const camFov = lerp(lerp(32, 29, pPushMacro), 30.5, pBeamShow);

  const floorPlateMat = useMemo(() => plain('#18222e', 0.72, 0.48), []);
  const floorRingMat = useMemo(() => plain('#263648', 0.5, 0.62), []);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: '#0e1620' }}>
      <Stage
        {...LOOK_INTERIOR_BAY.stage}
        shadowCenter={[1.05, 1.55, 0.65]}
        shadowArea={8}
        width={W}
        height={H}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Đèn studio trung tính giúp nổi bật chất liệu đồng, thép, sơn CARC và mặt gương mà không làm cháy sáng bloom */}
        <pointLight position={[1.75, 2.38, 1.95]} color="#fff7ec" intensity={2.1} distance={6.5} decay={1.6} />
        <pointLight position={[0.55, 2.15, 1.62]} color="#dceeff" intensity={1.3} distance={5.2} decay={1.6} />

        {/* Bệ sàn khoang cơ khí thép tối (đặt thấp y = -0.18 để tháp pháo nghiêng lắc tự do không chạm sàn) */}
        <group position={[0, -0.18, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={floorPlateMat} receiveShadow>
            <circleGeometry args={[18, 64]} />
          </mesh>
          <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorRingMat}>
            <ringGeometry args={[2.35, 2.46, 64]} />
          </mesh>
          <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorRingMat}>
            <ringGeometry args={[4.1, 4.18, 64]} />
          </mesh>
        </group>

        {/* Thân tháp pháo cắt bổ dao động pitch/roll liên tục quanh MIRROR_PIVOT trong khi gương nghiêng ngược chiều */}
        <group position={MIRROR_PIVOT} rotation={[rollOsc, 0, pitchOsc]}>
          <TurretInterior3D
            position={[-MIRROR_PIVOT[0], -MIRROR_PIVOT[1], -MIRROR_PIVOT[2]]}
            showCrew={false}
            blastDoorOpen={0}
            gunPitch={0}
            mirrorTilt={mirrorTilt}
          />

          {/* Vòng chia độ mảnh bên ngoài gimbal gắn theo vỏ hộp GPS đang lắc: làm nổi độ nghiêng tương đối mà không đè lên gương */}
          {gyroHudAlpha > 0.01 && (
            <group>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.218, 0.0024, 8, 48]} />
                <meshBasicMaterial
                  color={PAL.amber}
                  transparent
                  opacity={0.58 * gyroHudAlpha}
                  toneMapped={false}
                />
              </mesh>
              {DEGREE_TICKS.map((ang, idx) => (
                <mesh
                  key={idx}
                  position={[0, Math.cos(ang) * 0.224, Math.sin(ang) * 0.224]}
                  rotation={[ang, 0, 0]}
                >
                  <boxGeometry args={[0.005, 0.014, 0.004]} />
                  <meshBasicMaterial
                    color={PAL.amberHot}
                    transparent
                    opacity={0.78 * gyroHudAlpha}
                    toneMapped={false}
                  />
                </mesh>
              ))}
            </group>
          )}
        </group>

        {/* ==================== HỆ QUANG HỌC ỔN ĐỊNH TUYỆT ĐỐI TRONG KHÔNG GIAN THẾ GIỚI ==================== */}
        {beamReveal > 0.01 && (
          <group>
            {/* Điểm hội tụ phản xạ sắc nét ngay tâm mặt gương phẳng */}
            <mesh position={[MIRROR_PIVOT[0], MIRROR_PIVOT[1] + 0.006, MIRROR_PIVOT[2]]}>
              <sphereGeometry args={[0.013, 14, 14]} />
              <meshBasicMaterial color="#dcffff" transparent opacity={0.95 * beamReveal} toneMapped={false} />
            </mesh>

            {/* Tia quang học cyan (#29e3d4) phản xạ từ mặt gương đi xuyên qua cửa kính GPS — NẰM NGANG PHẲNG PHIU TUYỆT ĐỐI! */}
            <group position={MIRROR_PIVOT}>
              {/* Lõi tia laser/quang học sắc lẹm dọc đúng trục +X thế giới (y = 1.740 không đổi) */}
              <mesh position={[2.6 * beamReveal, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0052, 0.0052, 5.2 * beamReveal, 14]} />
                <meshBasicMaterial color="#9efcf4" transparent opacity={0.96 * beamReveal} toneMapped={false} />
              </mesh>
              {/* Lớp vỏ quang học cyan #29e3d4 mảnh gọn, không nhòe */}
              <mesh position={[2.6 * beamReveal, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.0145, 0.0145, 5.2 * beamReveal, 14]} />
                <meshBasicMaterial color={PAL.cyan} transparent opacity={0.38 * beamReveal} toneMapped={false} />
              </mesh>

              {/* Các vòng xung sóng chuẩn trực dọc tia ngắm ngang phía trước cửa kính GPS */}
              {[0, 1, 2, 3].map((idx) => {
                const pulse = (t * 0.85 + idx * 0.25) % 1;
                const xRing = 0.36 + pulse * 1.15;
                return (
                  <mesh key={idx} position={[xRing, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                    <torusGeometry args={[0.032 + pulse * 0.016, 0.0022, 8, 28]} />
                    <meshBasicMaterial
                      color={PAL.cyan}
                      transparent
                      opacity={0.72 * (1 - pulse) * beamReveal}
                      toneMapped={false}
                    />
                  </mesh>
                );
              })}

              {/* Khung thước ngắm chân trời tĩnh đặt ngoài cửa kính GPS (x = +0.58 m) đối chiếu trực tiếp với vỏ tháp đang lắc */}
              <group position={[0.58, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <mesh>
                  <torusGeometry args={[0.074, 0.0028, 10, 36]} />
                  <meshBasicMaterial
                    color={PAL.cyan}
                    transparent
                    opacity={(0.62 + 0.3 * counterTiltGlow) * beamReveal}
                    toneMapped={false}
                  />
                </mesh>
                {[-1, 1].map((s) => (
                  <mesh key={s} position={[s * 0.1, 0, 0]}>
                    <boxGeometry args={[0.04, 0.0038, 0.0038]} />
                    <meshBasicMaterial
                      color={PAL.cyanSoft}
                      transparent
                      opacity={0.85 * beamReveal}
                      toneMapped={false}
                    />
                  </mesh>
                ))}
              </group>
            </group>

            {/* Nhánh tia phản xạ truyền thẳng xuống ống kính tiềm vọng của pháo thủ bên dưới */}
            <mesh geometry={internalRayGeo}>
              <meshBasicMaterial color={PAL.cyan} transparent opacity={0.75 * beamReveal} toneMapped={false} />
            </mesh>
          </group>
        )}
      </Stage>

      {/* Đúng 1 nhãn chữ neo cụm con quay hồi chuyển 2 trục */}
      <Label
        t={t}
        text="DUAL-AXIS GYRO"
        from={CUE.c01_s05_dual_gyro}
        until={93.0}
        x={SAFE + 275}
        y={H - SAFE - 82}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C01S05;
