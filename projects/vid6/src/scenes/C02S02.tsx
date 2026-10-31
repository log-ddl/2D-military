import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { plain } from '@skill/military/3d/materials';
import { rbox } from '@skill/military/3d/geom';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

// Không gian xưởng kiểm định đạn đạo & bàn đo lường thép phay chuẩn (Metrology Platen)
const OrdnanceMetrologyBench: React.FC<{ lockActive: number; cradleRetract: number }> = ({
  lockActive,
  cradleRetract,
}) => {
  const matFloor = useMemo(() => plain('#121a24', 0.8, 0.32), []);
  const matPedestal = useMemo(() => plain('#1a2431', 0.62, 0.52), []);
  const matPlaten = useMemo(() => plain('#233243', 0.46, 0.58), []);
  const matTrim = useMemo(() => plain('#4b6078', 0.32, 0.78), []);
  const matChrome = useMemo(() => plain('#d7e2ee', 0.16, 0.92), []);
  const matBrass = useMemo(() => plain('#dfb14b', 0.26, 0.86), []);
  const matCyanLine = useMemo(
    () =>
      plain('#29e3d4', 0.2, 0.4, {
        emissive: new THREE.Color('#1cc9bb'),
        emissiveIntensity: 0.65,
      }),
    [],
  );
  const matAmberLed = useMemo(
    () =>
      plain('#ffaa2b', 0.2, 0.2, {
        emissive: new THREE.Color('#ff9d1c'),
        emissiveIntensity: 0.35 + lockActive * 1.25,
      }),
    [lockActive],
  );

  const clampShift = lockActive * 0.014;
  const jawScaleY = 1 - cradleRetract * 0.62;

  return (
    <group>
      {/* Sàn xưởng thép tối & cột dầm kỹ thuật hậu cảnh tạo chiều sâu cho góc máy thấp */}
      <mesh position={[0, -0.82, 0]} material={matFloor} receiveShadow>
        <cylinderGeometry args={[6.8, 7.0, 0.08, 64]} />
      </mesh>
      {[-2.4, -0.8, 0.8, 2.4].map((xCol, idx) => (
        <group key={idx} position={[xCol, 0.2, -2.65]}>
          <mesh geometry={rbox(0.22, 2.1, 0.24, 0.02)} material={matPedestal} />
          <mesh position={[0, 0.28, 0.125]} material={matCyanLine}>
            <boxGeometry args={[0.014, 1.15, 0.008]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 0.96, -2.52]} geometry={rbox(6.2, 0.09, 0.16, 0.015)} material={matTrim} />

      {/* Thân bệ bàn kiểm định đạn 120mm */}
      <mesh position={[0, -0.41, 0]} geometry={rbox(1.42, 0.76, 0.6, 0.025)} material={matPedestal} receiveShadow />
      <mesh position={[0, -0.022, 0]} geometry={rbox(1.62, 0.044, 0.72, 0.012)} material={matPlaten} castShadow receiveShadow />
      <mesh position={[0, -0.022, 0.362]} geometry={rbox(1.6, 0.022, 0.012, 0.004)} material={matTrim} />

      {/* Đường trục chuẩn laser cyan dọc tâm bàn */}
      <mesh position={[0, 0.001, 0]} material={matCyanLine}>
        <boxGeometry args={[1.46, 0.002, 0.0035]} />
      </mesh>

      {/* Thước chia vạch cơ khí chính xác dọc mép trước bàn kiểm định (x = -0.45..+0.45 m) */}
      <group position={[0.02, 0.003, 0.12]}>
        <mesh geometry={rbox(0.96, 0.006, 0.034, 0.002)} material={matPedestal} receiveShadow />
        {Array.from({ length: 37 }, (_, i) => {
          const xTick = -0.45 + i * 0.025;
          const isMajor = i % 4 === 0;
          const isMid = i % 2 === 0;
          return (
            <mesh
              key={i}
              position={[xTick, 0.004, isMajor ? -0.003 : 0.004]}
              material={isMajor ? matBrass : matChrome}
            >
              <boxGeometry args={[isMajor ? 0.0035 : 0.0018, 0.002, isMajor ? 0.022 : isMid ? 0.015 : 0.009]} />
            </mesh>
          );
        })}
      </group>

      {/* Hai trụ giá chữ V đỡ viên đạn 56-lb M829A4 (hạ thấp gọn xuống mặt bàn khi tách lộ riêng mũi lao DU 22 mm) */}
      {[-0.27, 0.17].map((xPos, idx) => (
        <group key={idx} position={[xPos, 0, 0]} scale={[1, jawScaleY, 1]}>
          <mesh position={[0, 0.075, 0]} geometry={rbox(0.042, 0.15, 0.145, 0.006)} material={matTrim} castShadow />
          <mesh position={[0, 0.148, 0]} rotation={[0, Math.PI / 2, Math.PI]} material={matChrome}>
            <torusGeometry args={[0.064, 0.0075, 10, 24, Math.PI]} />
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              key={side}
              position={[0, 0.165, side * (0.078 - clampShift)]}
              geometry={rbox(0.032, 0.026, 0.018, 0.004)}
              material={matBrass}
              castShadow
            />
          ))}
          <mesh position={[0.022, 0.05, 0.064]} material={matAmberLed}>
            <boxGeometry args={[0.005, 0.042, 0.013]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Giá bậc thang 3 loại đạn 120mm ở hậu cảnh phải để nổi trọn trong nhịp mở cảnh ("depends on the target") và sạch 100% nền sau cánh đuôi DU
const BackgroundTargetAmmoRack: React.FC = () => {
  const matFrame = useMemo(() => plain('#1e2a38', 0.56, 0.6), []);
  const matBracket = useMemo(() => plain('#51657a', 0.38, 0.76), []);

  const tiers: { kind: 'm1028_canister' | 'm1147_amp' | 'm829a4_cartridge'; y: number; z: number }[] = [
    { kind: 'm1028_canister', y: 0.13, z: 0.17 },
    { kind: 'm1147_amp', y: 0.28, z: 0.0 },
    { kind: 'm829a4_cartridge', y: 0.43, z: -0.17 },
  ];

  return (
    <group position={[1.6, -0.02, -0.84]} rotation={[0, -0.42, 0]}>
      <mesh position={[0, 0.015, 0]} geometry={rbox(0.88, 0.03, 0.56, 0.008)} material={matFrame} receiveShadow />
      {[-0.26, 0.2].map((xp, i) => (
        <group key={i} position={[xp, 0, 0]}>
          {tiers.map((tr, k) => (
            <group key={k} position={[0, tr.y / 2, tr.z]}>
              <mesh geometry={rbox(0.028, tr.y, 0.04, 0.005)} material={matBracket} castShadow />
            </group>
          ))}
        </group>
      ))}
      {tiers.map((tr, k) => (
        <Ammo120mm3D
          key={k}
          kind={tr.kind}
          scale={0.88}
          position={[0, tr.y + 0.055, tr.z]}
          rotation={[0.3 * k, 0, 0.04]}
        />
      ))}
    </group>
  );
};

// Vỏ ngoài & cổ sabot bán trong suốt tách mở làm đôi ở `209.42..211.20` rồi lướt ra ngoài để nhường sân khấu sạch cho mũi lao DU
const SplitGhostShellOverlay: React.FC<{ sep: number; clearOut: number; roll: number }> = ({
  sep,
  clearOut,
  roll,
}) => {
  const halfCaseGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.0585, 0.0602, 0.432, 32, 1, false, 0, Math.PI);
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);

  const halfSabotGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.038, 0.058, 0.31, 28, 1, false, 0, Math.PI);
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);

  const ghostOp = lerp(0.86, 0.32, sep) * (1 - clearOut);
  if (sep <= 0.001 || ghostOp <= 0.005) return null;

  const spreadY = sep * 0.13 + clearOut * 0.18;
  const pushBackZ = -sep * 0.14 - clearOut * 0.22;

  return (
    <group position={[0, 0.21, 0]}>
      {clearOut < 0.95 && (
        <Ammo120mm3D
          kind="base_puck"
          scale={1 - clearOut * 0.28}
          position={[lerp(-0.492, -0.57, sep) - clearOut * 0.08, 0, pushBackZ * 0.6]}
          rotation={[roll, 0, -Math.PI / 2]}
        />
      )}

      {[1, -1].map((dir) => (
        <group
          key={dir}
          position={[0, dir * spreadY, pushBackZ]}
          rotation={[dir === 1 ? 0 : Math.PI, 0, dir * sep * 0.09]}
        >
          <mesh position={[-0.14, 0, 0]} geometry={halfCaseGeo}>
            <meshStandardMaterial
              color="#e4cfa8"
              roughness={0.55}
              metalness={0.08}
              transparent
              opacity={ghostOp}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0.22, 0, 0]} geometry={halfSabotGeo}>
            <meshStandardMaterial
              color="#475364"
              roughness={0.38}
              metalness={0.45}
              transparent
              opacity={ghostOp * 1.05}
              depthWrite={false}
              side={THREE.DoubleSide}
            />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Thanh dưỡng chuẩn đường kính 22 mm (cỡ cán chổi) đặt song song ngay dưới-sau mũi lao DU để đối chiếu 1:1 không che cân chì
const BroomstickGaugeComparison: React.FC<{ appear: number; dartY: number }> = ({
  appear,
  dartY,
}) => {
  const matAshWood = useMemo(() => plain('#c89c62', 0.62, 0.06), []);
  const matWoodRing = useMemo(() => plain('#9e7440', 0.68, 0.08), []);
  const matBrass = useMemo(() => plain('#e2b34c', 0.25, 0.88), []);
  const matCaliper = useMemo(() => plain('#8396aa', 0.26, 0.86), []);
  const matCyan = useMemo(
    () =>
      plain('#29e3d4', 0.16, 0.35, {
        emissive: new THREE.Color('#22d8c9'),
        emissiveIntensity: 0.95,
      }),
    [],
  );

  if (appear <= 0.005) return null;

  const gaugeY = lerp(0.02, 0.142, appear);
  const gaugeZ = -0.052;
  const dy = dartY - gaugeY;
  const dz = 0 - gaugeZ;
  const bridgeLen = Math.hypot(dy, dz);
  const bridgePitch = Math.atan2(dz, dy);

  return (
    <group position={[0, gaugeY, gaugeZ]} scale={[1, appear, appear]}>
      {/* Thanh trụ gỗ tần bì tiện chuẩn đường kính đúng 22 mm (r = 0.011 m, dài 0.78 m — cỡ cán chổi) */}
      <mesh rotation={[0, 0, Math.PI / 2]} material={matAshWood} castShadow receiveShadow>
        <cylinderGeometry args={[0.011, 0.011, 0.78, 28]} />
      </mesh>
      {[-0.25, -0.08, 0.08, 0.25].map((xr, idx) => (
        <mesh key={idx} position={[xr, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matWoodRing}>
          <cylinderGeometry args={[0.0112, 0.0112, 0.005, 24]} />
        </mesh>
      ))}
      {[-0.385, 0.385].map((xe, idx) => (
        <mesh key={idx} position={[xe, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={matBrass} castShadow>
          <cylinderGeometry args={[0.0116, 0.0116, 0.022, 24]} />
        </mesh>
      ))}

      {/* Chân trụ đỡ thanh dưỡng & ngàm thước cặp laser cyan đối chiếu bề dày 22 mm lên thẳng thân mũi lao DU */}
      {[-0.14, 0.18].map((xc, idx) => (
        <group key={idx} position={[xc, 0, 0]}>
          <mesh position={[0, -gaugeY / 2, 0]} geometry={rbox(0.012, gaugeY, 0.014, 0.002)} material={matCaliper} />
          {[-0.0122, 0.0122].map((yc, j) => (
            <mesh key={j} position={[0, yc, 0.016]} material={matCyan}>
              <boxGeometry args={[0.007, 0.0028, 0.044]} />
            </mesh>
          ))}
          {/* Đường gióng đối chiếu 1:1 lên ngàm 22 mm trên mũi lao DU */}
          <mesh
            position={[0, dy / 2, dz / 2]}
            rotation={[bridgePitch, 0, 0]}
            material={matCyan}
          >
            <boxGeometry args={[0.0024, bridgeLen, 0.0024]} />
          </mesh>
          {[-0.0122, 0.0122].map((yc, j) => (
            <mesh key={`u${j}`} position={[0, dy + yc, dz]} material={matCyan}>
              <boxGeometry args={[0.007, 0.0028, 0.032]} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
};

// Cân đối chứng mật độ bằng thể tích (2 khối lập phương cùng cỡ: khối Uranium nghèo đè trĩu 1.7× khối Chì)
const DensityLeadBalance: React.FC<{ appear: number; tiltProgress: number }> = ({
  appear,
  tiltProgress,
}) => {
  const matBase = useMemo(() => plain('#202c3a', 0.52, 0.65), []);
  const matBeam = useMemo(() => plain('#6c7d90', 0.48, 0.56), []);
  const matBrass = useMemo(() => plain('#b89140', 0.44, 0.66), []);
  const matLead = useMemo(() => plain('#555d67', 0.82, 0.34), []);
  const matDuCube = useMemo(
    () =>
      plain('#726494', 0.28, 0.82, {
        emissive: new THREE.Color(PAL.duPurple),
        emissiveIntensity: 0.22,
      }),
    [],
  );
  const matAmberBar = useMemo(
    () =>
      plain(PAL.amber, 0.35, 0.15, {
        emissive: new THREE.Color('#ff9d1c'),
        emissiveIntensity: 0.62,
      }),
    [],
  );

  if (appear <= 0.005) return null;

  const beamAngle = -tiltProgress * 0.26;
  const armHalf = 0.086;
  const leftPanY = Math.sin(-beamAngle) * armHalf;
  const rightPanY = Math.sin(beamAngle) * armHalf;

  return (
    <group
      position={[0.21, 0.002, lerp(0.3, 0.185, appear)]}
      rotation={[0, -0.22, 0]}
      scale={appear * 0.94}
    >
      {/* Đế cân & trụ dao đặt cân */}
      <mesh position={[0, 0.008, 0]} geometry={rbox(0.25, 0.016, 0.1, 0.004)} material={matBase} castShadow receiveShadow />
      <mesh position={[0, 0.044, 0]} geometry={rbox(0.02, 0.062, 0.034, 0.004)} material={matBrass} castShadow />

      {/* Thang đo lực nén hổ phách bên dưới đĩa Uranium nghèo */}
      {[0, 1, 2, 3].map((bIdx) => (
        <mesh
          key={bIdx}
          position={[0.086, 0.02 + bIdx * 0.0065, 0.038]}
          material={tiltProgress > bIdx * 0.22 ? matAmberBar : matBase}
        >
          <boxGeometry args={[0.034, 0.0038, 0.005]} />
        </mesh>
      ))}

      {/* Đòn cân xoay */}
      <group position={[0, 0.076, 0]} rotation={[0, 0, beamAngle]}>
        <mesh geometry={rbox(0.19, 0.009, 0.016, 0.003)} material={matBeam} castShadow />
        <mesh rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
          <cylinderGeometry args={[0.01, 0.01, 0.024, 16]} />
        </mesh>
      </group>

      {/* Đĩa trái (bị nhấc lên): Khối Chì chuẩn (Lead) xám xỉn */}
      <group position={[-armHalf, 0.078 + leftPanY, 0]}>
        <mesh position={[0, 0.004, 0]} material={matBeam} castShadow>
          <cylinderGeometry args={[0.04, 0.034, 0.007, 24]} />
        </mesh>
        <mesh position={[0, 0.032, 0]} geometry={rbox(0.048, 0.048, 0.048, 0.003)} material={matLead} castShadow />
      </group>

      {/* Đĩa phải (đè trĩu xuống 1.7×): Khối Uranium nghèo CÙNG THỂ TÍCH ánh tím-thép */}
      <group position={[armHalf, 0.078 + rightPanY, 0]}>
        <mesh position={[0, 0.004, 0]} material={matBeam} castShadow>
          <cylinderGeometry args={[0.04, 0.034, 0.007, 24]} />
        </mesh>
        <mesh position={[0, 0.032, 0]} geometry={rbox(0.048, 0.048, 0.048, 0.004)} material={matDuCube} castShadow />
        <mesh position={[0, 0.032, 0]}>
          <boxGeometry args={[0.0505, 0.0505, 0.0505]} />
          <meshBasicMaterial color={PAL.duPurple} wireframe transparent opacity={0.35} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

const C02S02: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // Viên đạn xoay mượt quanh trục dọc trên bàn kiểm định
  const shellRoll = (t - 198.4) * 0.55;

  // Khoá kẹp giá chữ V tại `M829A4,@204.02`
  const lockActive = prog(t, CUE.c02_s02_m829a4 - 0.16, CUE.c02_s02_m829a4 + 0.22);

  // Luồng đèn spotlight bạc lạnh quét dọc thân tạo ánh kim "Silver Bullet" (`206.05` -> `209.25`)
  const silverSweep = prog(t, 206.05, CUE.c02_s02_silver_bullet + 1.05);
  const silverEnv = Math.sin(silverSweep * Math.PI);
  const silverSpotX = lerp(-0.52, 0.56, silverSweep);

  // Tách vỏ bán trong suốt lộ trọn mũi lao Uranium nghèo 6 cánh đuôi (`Hidden@209.42` -> `finned@211.14`)
  const sep = prog(t, CUE.c02_s02_hidden_inside, CUE.c02_s02_finned_dart);
  // Sau khi tách xong, hai mảnh vỏ bán trong suốt trượt gọn ra ngoài (`211.35..212.35`) để mũi lao DU chiếm trọn khung sắc nét
  const ghostClearOut = prog(t, CUE.c02_s02_finned_dart + 0.2, CUE.c02_s02_broomstick - 0.35);

  const dartY = lerp(0.21, 0.238, sep);
  const pinSupport = prog(t, CUE.c02_s02_hidden_inside + 0.18, CUE.c02_s02_finned_dart);

  // Thanh dưỡng chuẩn 22 mm cỡ cán chổi (`broomstick,@212.72`)
  const broomAppear = prog(t, CUE.c02_s02_broomstick - 0.42, CUE.c02_s02_broomstick + 0.42);

  // Ánh tím-thép Uranium quét dọc thân rãnh ren (`depleted@214.20`)
  const duWave = prog(t, CUE.c02_s02_depleted_uranium - 0.35, CUE.c02_s02_depleted_uranium + 1.35);
  const duGlowActive = prog(t, CUE.c02_s02_depleted_uranium - 0.35, CUE.c02_s02_depleted_uranium + 0.45);
  const duScanRingEnv = Math.sin(duWave * Math.PI);
  const duScanX = lerp(-0.38, 0.42, duWave);

  // Khối chì đối chứng mật độ 1.7× (`1@215.80 .7 times denser than lead`)
  const leadAppear = prog(t, CUE.c02_s02_denser_1_7x - 0.45, CUE.c02_s02_denser_1_7x + 0.3);
  const leadTilt = prog(t, CUE.c02_s02_denser_1_7x - 0.05, CUE.c02_s02_denser_1_7x + 0.65);

  // Quỹ đạo Camera Macro Góc Thấp Lia Mượt — giữ trọn 100% viên đạn, đế tách, mũi lao DU 0.80 m & thanh dưỡng 22 mm với lề an toàn rộng hai bên:
  const pToHero = prog(t, 198.4, CUE.c02_s02_heavy_armor + 0.35);
  const pOrbitCartridge = prog(t, CUE.c02_s02_heavy_armor + 0.35, CUE.c02_s02_hidden_inside - 0.1);
  const pToDartMacro = prog(t, CUE.c02_s02_hidden_inside, CUE.c02_s02_broomstick + 0.6);
  const pToLeadCompare = prog(t, CUE.c02_s02_denser_1_7x - 0.55, CUE.c02_s02_denser_1_7x + 0.85);

  const pos0: V3 = [-0.62, 0.38, 1.48];
  const look0: V3 = [0.42, 0.23, -0.24];

  const pos1: V3 = [-0.28, 0.35, 1.32];
  const look1: V3 = [0.0, 0.2, 0.0];

  const pos2: V3 = [0.26, 0.34, 1.26];
  const look2: V3 = [0.0, 0.2, 0.0];

  const pos3: V3 = [0.34, 0.35, 1.06];
  const look3: V3 = [0.03, 0.19, -0.01];

  const pos4: V3 = [0.32, 0.34, 1.12];
  const look4: V3 = [0.05, 0.16, 0.035];

  let camPos = lerpV3(pos0, pos1, pToHero);
  let camLook = lerpV3(look0, look1, pToHero);
  camPos = lerpV3(camPos, pos2, pOrbitCartridge);
  camLook = lerpV3(camLook, look2, pOrbitCartridge);
  camPos = lerpV3(camPos, pos3, pToDartMacro);
  camLook = lerpV3(camLook, look3, pToDartMacro);
  camPos = lerpV3(camPos, pos4, pToLeadCompare);
  camLook = lerpV3(camLook, look4, pToLeadCompare);

  const camFov = lerp(lerp(lerp(38, 36, pToHero), 34, pToDartMacro), 35, pToLeadCompare);

  const matPin = useMemo(() => plain('#d9b154', 0.25, 0.88), []);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: PAL.bgDeep }}>
      <Stage {...LOOK_INTERIOR_BAY.stage} shadowCenter={[0, 0.2, 0]} shadowArea={5.5} width={W} height={H}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Đèn studio cân bằng: giữ vỏ thuốc phóng kem không cháy sáng (bloom) đồng thời làm loé cạnh kim loại mũi lao DU */}
        <pointLight position={[0.45, 1.35, 1.3]} color="#fff3e2" intensity={2.5} distance={6.5} decay={1.4} />
        <pointLight position={[-0.95, 0.95, 1.1]} color="#c4e4ff" intensity={2.2} distance={6.0} decay={1.45} />
        <pointLight position={[0.08, 0.88, -1.05]} color="#88d4ff" intensity={4.2} distance={5.5} decay={1.35} />
        <pointLight position={[0.05, 0.28, 0.95]} color="#ffe8c8" intensity={1.15} distance={2.8} decay={1.5} />

        {/* Luồng đèn Spotlight bạc lạnh quét dọc thân viên đạn tạo ánh kim "Silver Bullet" */}
        {silverEnv > 0.01 && (
          <group position={[silverSpotX, 0.21, 0]}>
            <pointLight position={[0, 0.3, 0.26]} color="#eef8ff" intensity={silverEnv * 8.5} distance={1.5} decay={1.6} />
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.084, 0.0032, 8, 36]} />
              <meshBasicMaterial color="#e8f6ff" transparent opacity={silverEnv * 0.78} toneMapped={false} />
            </mesh>
          </group>
        )}

        {/* Ánh sáng tím-thép Uranium chạy dọc thân rãnh ren mũi lao DU (`depleted@214.20`) */}
        {duGlowActive > 0.01 && (
          <pointLight
            position={[0.05, 0.36, 0.24]}
            color={PAL.duPurple}
            intensity={duGlowActive * 4.8}
            distance={1.9}
            decay={1.45}
          />
        )}
        {duScanRingEnv > 0.01 && (
          <group position={[duScanX, dartY, 0]}>
            <pointLight position={[0, 0.05, 0.1]} color="#b49aff" intensity={duScanRingEnv * 5.2} distance={0.85} decay={1.6} />
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[0.034, 0.0028, 8, 28]} />
              <meshBasicMaterial color={PAL.duPurple} transparent opacity={duScanRingEnv * 0.92} toneMapped={false} />
            </mesh>
          </group>
        )}

        <OrdnanceMetrologyBench lockActive={lockActive} cradleRetract={sep} />
        <BackgroundTargetAmmoRack />

        {/* Chủ thể chính trên bàn kiểm định: Viên M829A4 56-lb -> tách vỏ lộ trọn mũi lao DU 0.80 m 6 cánh đuôi */}
        {sep <= 0.001 ? (
          <Ammo120mm3D
            kind="m829a4_cartridge"
            position={[0, 0.21, 0]}
            rotation={[shellRoll, 0, 0]}
          />
        ) : (
          <group>
            <Ammo120mm3D
              kind="du_dart"
              position={[lerp(0.092, 0.0, sep), dartY, 0]}
              rotation={[shellRoll, 0, 0]}
            />
            <SplitGhostShellOverlay sep={sep} clearOut={ghostClearOut} roll={shellRoll} />

            {/* Hai trụ đỡ chữ V mảnh bằng đồng thau nâng riêng thanh xuyên 22 mm lên vị trí nổi bật */}
            {[-0.18, 0.2].map((xp, idx) => (
              <group key={idx} position={[xp, 0, 0]} scale={[1, pinSupport, 1]}>
                <mesh position={[0, (dartY - 0.012) / 2, 0]} material={matPin} castShadow>
                  <cylinderGeometry args={[0.005, 0.0085, dartY - 0.012, 14]} />
                </mesh>
                <mesh position={[0, dartY - 0.012, 0]} rotation={[0, Math.PI / 2, Math.PI]} material={matPin}>
                  <torusGeometry args={[0.0135, 0.0028, 8, 16, Math.PI]} />
                </mesh>
              </group>
            ))}
          </group>
        )}

        {/* Thanh dưỡng chuẩn 22 mm cỡ cán chổi đặt song song để đối chiếu độ mảnh */}
        <BroomstickGaugeComparison appear={broomAppear} dartY={dartY} />

        {/* Cân đối chứng khối Chì vs khối Uranium nghèo cùng thể tích (1.7× LEAD) */}
        <DensityLeadBalance appear={leadAppear} tiltProgress={leadTilt} />
      </Stage>

      <Label
        t={t}
        text="M829A4"
        x={W * 0.23}
        y={H * 0.17}
        from={CUE.c02_s02_m829a4}
        until={208.9}
        bg={PAL.cream}
        fg={PAL.ink}
      />

      <Label
        t={t}
        text="1.7× LEAD"
        x={W * 0.74}
        y={H * 0.17}
        from={CUE.c02_s02_denser_1_7x}
        until={217.85}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C02S02;
