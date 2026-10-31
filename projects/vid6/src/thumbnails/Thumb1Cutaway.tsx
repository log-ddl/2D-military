import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Cam, Stage } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { PAINT_PRESETS } from '../design/palette';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { PowerpackChassis3D } from '../parts/PowerpackChassis3D';
import { TurretInterior3D } from '../parts/TurretInterior3D';

const EnableLocalClipping: React.FC = () => {
  const gl = useThree((s) => s.gl);
  gl.localClippingEnabled = true;
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);
  return null;
};

function makeCutawayBoxPlanes(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
): THREE.Plane[] {
  return [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), xMin),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -xMax),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), yMin),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -yMax),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), zMin),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -zMax),
  ];
}

const CREW_HEXES = new Set([
  '6d7458',
  '3a4236',
  'd7a982',
  '2f372e',
  '737b5c',
  '3e4739',
  'dba982',
  '2d362d',
]);

/** Cột lửa hổ phách mềm mại (volumetric sprite) xả thẳng đứng qua 2 nắp Blowout Panels ở đuôi nóc tháp pháo */
const VerticalBlowoutPlume: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const tex = useMemo(() => softDot(), []);
  const puffs: { pos: [number, number, number]; size: number; color: string; opacity: number }[] = [
    { pos: [0, 0.16, 0], size: 0.88, color: '#fff8cf', opacity: 0.96 },
    { pos: [-0.04, 0.38, 0.03], size: 1.04, color: '#ffbe3b', opacity: 0.9 },
    { pos: [0.03, 0.62, -0.02], size: 1.08, color: '#ff8418', opacity: 0.82 },
    { pos: [-0.02, 0.86, 0.02], size: 0.94, color: '#ff5110', opacity: 0.64 },
    { pos: [0.04, 1.06, 0], size: 0.78, color: '#d9380a', opacity: 0.42 },
  ];
  return (
    <group position={position}>
      <pointLight position={[0, 0.55, 0.35]} color="#ff9d2e" intensity={16} distance={7} />
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.size * 0.85, p.size * 1.05, 1]}>
          <spriteMaterial map={tex} color={p.color} transparent opacity={p.opacity} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
};

/** Vỏ xe tăng M1A2 Abrams hướng sang PHẢI (+X) với 3 cửa sổ cắt phẫu thuật: Khoang tuabin 930°F, Tháp pháo gương Gyro + Blowout, Khoang lái nằm ngửa T-bar */
const RightFacingCutawayAbrams: React.FC<{ offsetX: number }> = ({ offsetX }) => {
  const extRef = useRef<THREE.Group>(null);

  // 1. Cửa sổ tháp pháo sườn +Z (giữ nguyên mặt nóc y = 2.36..2.44 & nắp Blowout đang bung mở!)
  const turretWindow = useMemo(
    () => makeCutawayBoxPlanes(-1.15 + offsetX, 1.12 + offsetX, 1.36, 2.35, 0.12, 2.1),
    [offsetX],
  );
  // 2. Cửa sổ thân xe mở thoáng cả Hốc Tuabin 930°F (đuôi trái) và Hốc Lái Xe T-bar (mũi phải), nối cầu giáp giữa ở x = -1.36..1.24
  const hullWindow = useMemo(
    () => makeCutawayBoxPlanes(-3.62 + offsetX, 3.42 + offsetX, 0.52, 1.44, 0.02, 1.98),
    [offsetX],
  );

  const matMidHullDesert = useMemo(
    () =>
      paint({
        ...PAINT_PRESETS.abramsDesert,
        camo: [...PAINT_PRESETS.abramsDesert.camo],
        seed: 19,
      }),
    [],
  );
  const matInnerWhite = useMemo(() => plain('#e7ecea', 0.62, 0.08), []);

  useLayoutEffect(() => {
    if (!extRef.current) return;
    extRef.current.updateMatrixWorld(true);

    extRef.current.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const m = obj as THREE.Mesh;
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      if (!bb) return;

      const worldBox = bb.clone().applyMatrix4(m.matrixWorld);
      const cx = (worldBox.min.x + worldBox.max.x) * 0.5 - offsetX;
      const cy = (worldBox.min.y + worldBox.max.y) * 0.5;
      const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
      const sizeX = worldBox.max.x - worldBox.min.x;
      const sizeZ = worldBox.max.z - worldBox.min.z;

      // Ẩn trạm CROWS cao để làm nổi bật cột lửa Blowout & tia laser Cyan của gương con quay GPS
      if (cy > 2.58 && cx > -1.0) {
        m.visible = false;
        return;
      }

      // Ẩn ống nòng pháo M256 gốc phía trước khiên pháo để gắn nòng cắt bổ + đạn M829A4 Mach 5 tách sabot
      if (cx > 1.7 && cy > 1.62 && cy < 2.08 && Math.abs(cz) < 0.36) {
        m.visible = false;
        return;
      }

      // Ẩn các tấm váy chắn bùn ở khoang đuôi động cơ (x < -1.25) và mũi khoang lái (x > 1.35) bên sườn +Z, giữ lại 3 tấm váy giữa giống mẫu AI 1
      if (cz > 1.58 && cy > 0.42 && cy < 1.24 && sizeZ < 0.35 && (cx < -1.15 || cx > 1.75)) {
        m.visible = false;
        return;
      }

      // Cắt cửa sổ tháp pháo (không cắt vào 2 cánh cửa nắp Blowout ở y > 2.38!)
      if (cy > 1.36 && cy < 2.42 && sizeZ > 0.7 && sizeX > 2.2) {
        const cloned = (Array.isArray(m.material) ? m.material[0] : m.material).clone();
        cloned.clippingPlanes = turretWindow;
        cloned.clipIntersection = true;
        cloned.clipShadows = true;
        cloned.side = THREE.DoubleSide;
        m.material = cloned;
        return;
      }

      // Thân xe dài: khoét sạch sườn +Z để mở cả khoang lái mũi phải lẫn khoang tuabin 930°F đuôi trái
      if (cy >= 0.5 && cy <= 1.44 && sizeX > 3.5 && sizeZ > 1.8) {
        const hullCutMat = (Array.isArray(m.material) ? m.material[0] : m.material).clone();
        hullCutMat.clippingPlanes = hullWindow;
        hullCutMat.clipIntersection = true;
        hullCutMat.clipShadows = true;
        hullCutMat.side = THREE.DoubleSide;
        m.material = hullCutMat;
      }
    });
  }, [turretWindow, hullWindow, offsetX]);

  return (
    <group position={[offsetX, 0, 0]}>
      <group ref={extRef}>
        <M1A2Abrams
          variant="m1a2"
          camo="desert"
          gunPitch={0}
          turretYaw={0}
          blowoutOpen={0.88}
          exhaustHeat={0.95}
          travel={0}
        />
      </group>

      {/* Khối giáp sườn thân giữa (x = -1.36..+1.24) nối liền với 3 tấm váy giữa, tách biệt rành mạch Hốc Tuabin Đuôi & Hốc Lái Mũi */}
      <mesh position={[-0.06, 1.18, 1.42]} geometry={rbox(2.58, 0.36, 0.72, 0.02)} material={matMidHullDesert} castShadow receiveShadow />

      {/* Hốc khoang trắng sáng sạch của khoang lái mũi phải (sàn hạ y = 0.44 để thấy trọn tài xế nằm ngửa & ghi-đông T-bar!) */}
      <mesh position={[2.32, 0.44, 0.12]} geometry={rbox(2.15, 0.04, 1.76, 0.01)} material={matInnerWhite} receiveShadow />
      <mesh position={[2.32, 0.86, -0.74]} geometry={rbox(2.15, 0.78, 0.05, 0.01)} material={matInnerWhite} receiveShadow />
      <mesh position={[1.24, 0.86, -0.25]} geometry={rbox(0.06, 0.78, 0.98, 0.01)} material={matInnerWhite} receiveShadow />

      {/* Hộp buồng động cơ sơn trắng mở thoáng hướng về phía camera góc trước-phải (không dựng vách che ở x = -1.36!) để phô diễn trọn khối tuabin AGT1500 rực lửa 930°F */}
      <mesh position={[-2.48, 0.44, 0.55]} geometry={rbox(2.26, 0.04, 1.65, 0.01)} material={matInnerWhite} receiveShadow />
      <mesh position={[-2.48, 0.88, -0.26]} geometry={rbox(2.26, 0.84, 0.05, 0.01)} material={matInnerWhite} receiveShadow />
      <mesh position={[-3.58, 0.88, 0.55]} geometry={rbox(0.06, 0.84, 1.65, 0.01)} material={matInnerWhite} />

      {/* Cột lửa xả nổ thẳng đứng qua 2 cánh cửa Blowout Panels trên nóc khoang đạn 36 viên */}
      <VerticalBlowoutPlume position={[-1.92, 2.46, 0.0]} />
    </group>
  );
};

/** Nòng M256 120mm cắt bổ + Đạn M829A4 Mach 5 tách 3 cánh Sabot quanh mũi lao Uranium nghèo tím-vàng + vòng sóng xung kích */
const CutawayBarrelAndMach5Sabot: React.FC<{ offsetX: number }> = ({ offsetX }) => {
  const matCarc = useMemo(
    () =>
      paint({
        ...PAINT_PRESETS.abramsDesert,
        camo: [...PAINT_PRESETS.abramsDesert.camo],
        seed: 21,
      }),
    [],
  );
  const matCarcDouble = useMemo(() => {
    const m = matCarc.clone();
    m.side = THREE.DoubleSide;
    return m;
  }, [matCarc]);
  const matDarkBore = useMemo(() => {
    const m = plain('#1d232b', 0.5, 0.75).clone();
    m.side = THREE.DoubleSide;
    return m;
  }, []);
  const matCutRim = useMemo(() => plain('#d8dde2', 0.45, 0.35), []);

  return (
    <group position={[offsetX, 0.05, 0]}>
      {/* Máng nửa sau (-Z) của ống nòng M256 120mm */}
      <group position={[3.55, 1.8, 0]} rotation={[Math.PI, 0, -Math.PI / 2]}>
        <mesh material={matCarcDouble} castShadow>
          <cylinderGeometry args={[0.115, 0.155, 3.82, 28, 1, false, -Math.PI * 0.5, Math.PI]} />
        </mesh>
        <mesh material={matDarkBore}>
          <cylinderGeometry args={[0.078, 0.092, 3.8, 24, 1, true, -Math.PI * 0.5, Math.PI]} />
        </mesh>
      </group>
      <mesh position={[3.55, 1.91, 0.002]} geometry={rbox(3.8, 0.016, 0.016, 0.002)} material={matCutRim} />
      <mesh position={[3.55, 1.69, 0.002]} geometry={rbox(3.8, 0.016, 0.016, 0.002)} material={matCutRim} />

      {/* Đế kim loại gạt tàn (spent base puck) còn lại sau khi vỏ thuốc phóng tự cháy sạch (C02 kịch bản vid6!) */}
      <Ammo120mm3D kind="base_puck" scale={1.15} position={[1.82, 1.8, 0.02]} />

      {/* Đạn xuyên động năng M829A4 phóng vọt khỏi miệng nòng ở Mach 5: 3 cánh Sabot bung tách quanh thanh xuyên DU tím-vàng */}
      <group position={[6.18, 1.8, 0]}>
        <Ammo120mm3D kind="m829a4_flight" sabotSep={0.68} scale={1.55} />
        {/* Quầng chớp plasma mềm mại đẩy sau đuôi thanh xuyên DU */}
        <sprite position={[-0.38, 0, 0]} scale={[0.92, 0.42, 1]}>
          <spriteMaterial map={softDot()} color="#ffb8f0" transparent opacity={0.88} depthWrite={false} toneMapped={false} />
        </sprite>
        {/* 2 vòng sóng xung kích siêu thanh Mach 5 mờ trắng quanh đầu nòng */}
        {[0.56, 0.88].map((rRing, idx) => (
          <mesh key={idx} position={[-0.25 - idx * 0.22, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[rRing, 0.018, 12, 40]} />
            <meshBasicMaterial color="#e8f6ff" transparent opacity={0.32 - idx * 0.09} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
};

/** Nội thất 4 nghịch lý kỹ thuật của kịch bản vid6: Lái xe nằm ngửa T-bar + Gương con quay phát tia Laser Cyan + Tổ lái tháp pháo + Tuabin phản lực 930°F */
const Vid6ScriptInteriorMechanics: React.FC<{ offsetX: number }> = ({ offsetX }) => {
  const intRef = useRef<THREE.Group>(null);
  const turbRef = useRef<THREE.Group>(null);

  const matHotTurbineGlow = useMemo(
    () =>
      plain('#ff8c1a', 0.28, 0.45, {
        emissive: new THREE.Color('#ff5e00'),
        emissiveIntensity: 1.65,
      }),
    [],
  );

  useLayoutEffect(() => {
    if (intRef.current) {
      intRef.current.updateMatrixWorld(true);
      intRef.current.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const m = obj as THREE.Mesh;
        const orig = Array.isArray(m.material) ? m.material[0] : m.material;
        const std = orig as THREE.MeshStandardMaterial;
        const hex = std?.color ? std.color.getHexString().toLowerCase() : '';

        // Luôn bảo toàn 100% cơ thể Người lái nằm ngửa & 3 thành viên tổ lái tháp pháo!
        if (CREW_HEXES.has(hex)) return;

        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (!bb) return;

        const worldBox = bb.clone().applyMatrix4(m.matrixWorld);
        const cx = (worldBox.min.x + worldBox.max.x) * 0.5 - offsetX;
        const cy = (worldBox.min.y + worldBox.max.y) * 0.5;
        const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
        const sizeX = worldBox.max.x - worldBox.min.x;
        const sizeZ = worldBox.max.z - worldBox.min.z;

        if (cx > 1.38 && cy > 1.32 && Math.abs(cz) > 0.45) {
          m.visible = false;
          return;
        }
        if (cy > 2.33) {
          m.visible = false;
          return;
        }
        if (cx > 0.95 && cy > 1.64 && cy < 1.98 && sizeX > 0.7) {
          m.visible = false;
          return;
        }
        // Chỉ ẩn vách bao ngoài & cụm kính tiềm vọng trên trần (cy > 1.03) của driverOnly, giữ nguyên ghế võng & tay lái T-bar (cy <= 1.03)!
        if (cy < 1.35 && (Math.abs(cz) > 0.88 || cx > 3.35 || sizeZ > 1.9 || (cy > 1.04 && cx > 1.45))) {
          m.visible = false;
          return;
        }
        if (cx < -0.95 && (cy > 2.28 || Math.abs(cz) > 1.18)) {
          m.visible = false;
        }
      });
    }

    if (turbRef.current) {
      turbRef.current.updateMatrixWorld(true);
      turbRef.current.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const m = obj as THREE.Mesh;
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (bb) {
          const wb = bb.clone().applyMatrix4(m.matrixWorld);
          if ((wb.min.y + wb.max.y) * 0.5 < 0.43 && wb.max.y - wb.min.y < 0.45) {
            m.visible = false;
            return;
          }
        }
        const std = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.MeshStandardMaterial;
        const hex = std?.color ? std.color.getHexString().toLowerCase() : '';
        // Tô rực đỏ-cam 930°F cho tầng cánh nén/buồng đốt tuabin phản lực AGT1500
        if (hex === '736050' || hex === 'bf703e' || hex === 'dba93d') {
          m.material = matHotTurbineGlow;
        }
      });
    }
  }, [offsetX, matHotTurbineGlow]);

  return (
    <group position={[offsetX, 0, 0]}>
      <group ref={intRef}>
        <PowerpackChassis3D mode="driverOnly" throttleTwist={0.9} steerAngle={0.1} />
        <TurretInterior3D
          position={[0.04, 0.55, 0]}
          showCrew={true}
          blastDoorOpen={0.12}
          blowoutOpen={0.85}
          loaderPhase={0.35}
        />
      </group>

      {/* Động cơ tuabin trực thăng 1,500 HP Honeywell AGT1500 nóng rực 930°F đặt lộ trọn vẹn trong hốc cắt sườn sau */}
      <group ref={turbRef} position={[-2.52, 0.22, 0.62]} scale={[1.05, 1.05, 1.05]}>
        <pointLight position={[0.0, 0.95, 0.9]} color="#ff881a" intensity={14} distance={5.2} />
        <PowerpackChassis3D mode="turbineOnly" turbineSpin={0.4} exhaustGlow={1} />
      </group>

      {/* Cụm thấu kính phát sáng & Tia Laser ngắm bắn Cyan ổn định con quay 2 trục phóng thẳng từ hộp gương GPS (C01 kịch bản vid6!) */}
      <group position={[1.15, 2.34, 0.68]}>
        <mesh>
          <sphereGeometry args={[0.13, 18, 16]} />
          <meshBasicMaterial color="#3fffe8" transparent opacity={0.92} toneMapped={false} />
        </mesh>
        <mesh position={[2.65, -0.14, -0.22]} rotation={[0, 0.08, -0.055 - Math.PI / 2]}>
          <cylinderGeometry args={[0.016, 0.022, 5.3, 12]} />
          <meshBasicMaterial color="#2bf5e4" transparent opacity={0.88} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

/** Sàn studio xám đậm + lưới đường kẻ kỹ thuật xanh lá neon đặc trưng */
const StudioGreenGridFloor: React.FC = () => {
  const matFloor = useMemo(() => plain('#3d4147', 0.8, 0.08), []);
  const matGreenLine = useMemo(
    () =>
      plain('#2cf542', 0.22, 0.04, {
        emissive: new THREE.Color('#24eb3a'),
        emissiveIntensity: 1.25,
      }),
    [],
  );

  const zLines = [-5.4, -2.6, 0.2, 3.0, 5.8];
  const xLines = [-6.4, -3.2, 0.0, 3.2, 6.4];

  return (
    <group>
      <mesh position={[0, -0.005, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matFloor} receiveShadow>
        <planeGeometry args={[110, 110]} />
      </mesh>
      {zLines.map((zPos, i) => (
        <mesh key={`z${i}`} position={[0, 0.003, zPos]} rotation={[-Math.PI / 2, 0, 0]} material={matGreenLine}>
          <planeGeometry args={[30, 0.055]} />
        </mesh>
      ))}
      {xLines.map((xPos, i) => (
        <mesh key={`x${i}`} position={[xPos, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matGreenLine}>
          <planeGeometry args={[0.055, 26]} />
        </mesh>
      ))}
    </group>
  );
};

export const Thumb1Cutaway: React.FC = () => {
  const offsetX = -1.35;

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#06070a', overflow: 'hidden' }}>
      <Stage
        sky={['#050608', '#07080b', '#090b0f']}
        sun={[22, 38, 28]}
        sunColor="#fff7eb"
        sunIntensity={2.8}
        shadowArea={17}
        shadowCenter={[0, 1.0, 0]}
        fog={[22, 42]}
        fogColor="#06070a"
        env={0.58}
        ambient={0.4}
        exposure={1.06}
        post={{ bloom: 0.44, bloomThreshold: 0.82, ao: 2.0, aoRadius: 1.4, vignette: 0.24 }}
      >
        <EnableLocalClipping />

        {/* Xe hướng sang PHẢI (+X): phô diễn đồng thời Tuabin 930°F, Cột lửa Blowout, Tia Laser Gương Gyro, Lái xe nằm ngửa T-bar & Đạn Mach 5 tách Sabot */}
        <Cam pos={[2.65, 3.46, 9.85]} look={[0.38, 1.66, 0.0]} fov={37.5} />

        <StudioGreenGridFloor />

        <RightFacingCutawayAbrams offsetX={offsetX} />
        <Vid6ScriptInteriorMechanics offsetX={offsetX} />
        <CutawayBarrelAndMach5Sabot offsetX={offsetX} />
      </Stage>

      {/* Typography 100% nguyên bản bám sát kịch bản vid6 ($15M TANK / HOW IT WORKS | 1,500 HP JET · MACH 5) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          fontFamily: "'Impact', 'Arial Narrow', 'Helvetica Neue', sans-serif",
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 68,
            top: 28,
            fontSize: 162,
            fontWeight: 900,
            lineHeight: 0.92,
            letterSpacing: '2px',
            color: '#ffffff',
            textShadow: '0 8px 28px rgba(0,0,0,0.75)',
          }}
        >
          $15M TANK
        </div>
        <div
          style={{
            position: 'absolute',
            left: 72,
            top: 192,
            fontSize: 78,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: '1.5px',
            color: '#46ed3a',
            textShadow: '0 4px 18px rgba(0,0,0,0.85)',
          }}
        >
          HOW IT WORKS
        </div>
        <div
          style={{
            position: 'absolute',
            right: 68,
            top: 56,
            fontFamily: "'Helvetica Neue', 'Arial', sans-serif",
            fontSize: 66,
            fontWeight: 600,
            lineHeight: 1,
            letterSpacing: '0.5px',
            color: '#ffffff',
            textShadow: '0 6px 24px rgba(0,0,0,0.8)',
          }}
        >
          1,500 HP JET · MACH 5
        </div>
      </div>
    </div>
  );
};

export default Thumb1Cutaway;
