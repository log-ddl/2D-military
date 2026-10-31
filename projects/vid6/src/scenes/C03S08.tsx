import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, mix } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { TurretInterior3D } from '../parts/TurretInterior3D';

const hash01 = (i: number, k: number, seed = 308) => {
  const v = Math.sin(i * 12.9898 + k * 78.233 + seed * 37.719) * 43758.5453;
  return v - Math.floor(v);
};

// Toạ độ chính xác bên trong khoang TurretInterior3D (đồng bộ 1:1 với TurretInterior3D.tsx)
const P_SENSOR_EYE: V3 = [-0.08, 1.40, -1.235]; // mắt cảm biến quang học trên vách sau-trái
const P_NOZZLE_L: V3 = [-0.36, 1.355, -1.19]; // vòi phun đồng số 1 trên ống góp mạ crôm
const P_NOZZLE_R: V3 = [0.24, 1.355, -1.19]; // vòi phun đồng số 2 trên ống góp mạ crôm
const P_BOTTLE_1: V3 = [-0.64, 1.33, -1.27]; // van bình Halon đỏ 1
const P_BOTTLE_2: V3 = [-0.82, 1.33, -1.27]; // van bình Halon đỏ 2
const P_FUEL_FLASH: V3 = [-0.14, 0.44, -0.96]; // cầu lửa nhiên liệu bùng gần sàn giỏ ngay dưới vách bình Halon

/** Bệ studio cơ khí tối đỡ mô hình cắt bổ TurretInterior3D */
const StudioMechanicalPedestal: React.FC = () => {
  const floorMat = useMemo(() => plain('#121a24', 0.9, 0.15), []);
  const deckMat = useMemo(() => plain('#1e2835', 0.62, 0.52), []);
  const rimMat = useMemo(() => plain('#3c4d61', 0.42, 0.76), []);
  const accentMat = useMemo(() => plain('#6b7f96', 0.32, 0.85), []);
  const hazardMat = useMemo(() => plain('#c98e22', 0.48, 0.25), []);

  return (
    <group>
      <mesh position={[0, -0.16, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[64, 64]} />
      </mesh>
      <mesh position={[-0.2, -0.08, 0]} material={deckMat} receiveShadow>
        <cylinderGeometry args={[3.45, 3.68, 0.14, 64]} />
      </mesh>
      <mesh position={[-0.2, 0.02, 0]} material={rimMat} receiveShadow>
        <cylinderGeometry args={[1.55, 1.66, 0.06, 48]} />
      </mesh>
      <mesh position={[-0.2, 0.052, 0]} rotation={[Math.PI / 2, 0, 0]} material={accentMat}>
        <torusGeometry args={[1.54, 0.018, 12, 64]} />
      </mesh>
      <mesh position={[-0.2, -0.008, 0]} rotation={[Math.PI / 2, 0, 0]} material={accentMat}>
        <torusGeometry args={[3.43, 0.024, 12, 72]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.2;
        return (
          <group key={i} position={[-0.2 + Math.cos(a) * 3.32, 0.01, Math.sin(a) * 3.32]} rotation={[0, -a, 0]}>
            <mesh geometry={rbox(0.28, 0.08, 0.18, 0.012)} material={rimMat} castShadow />
            <mesh position={[-0.08, 0.044, 0]} geometry={rbox(0.10, 0.014, 0.14, 0.003)} material={hazardMat} />
          </group>
        );
      })}
    </group>
  );
};

/** Mắt cảm biến quang học UV/IR chớp tia quét cyan bắt trúng tâm chớp lửa nhiên liệu trong 3 ms */
const OpticalFlameSensorFX: React.FC<{ t: number; fireCenter: V3 }> = ({ t, fireCenter }) => {
  const brassMat = useMemo(() => plain('#d8a840', 0.28, 0.86), []);
  const housingMat = useMemo(() => plain('#222a33', 0.45, 0.72), []);

  const spotOn = prog(t, CUE.c03_s08_optical_spot - 0.04, CUE.c03_s08_optical_spot + 0.25);
  const lock3ms = prog(t, CUE.c03_s08_3ms - 0.12, CUE.c03_s08_3ms + 0.18);
  const fadeAfterFlood = 1 - prog(t, CUE.c03_s08_flood_gas + 1.3, CUE.c03_s08_150ms + 0.5);
  const beamVis = spotOn * fadeAfterFlood;

  const beamInfo = useMemo(() => {
    const dir = new THREE.Vector3(
      fireCenter[0] - P_SENSOR_EYE[0],
      fireCenter[1] - P_SENSOR_EYE[1],
      fireCenter[2] - P_SENSOR_EYE[2],
    );
    const len = dir.length();
    const norm = dir.clone().normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);
    const mid: V3 = [
      (P_SENSOR_EYE[0] + fireCenter[0]) * 0.5,
      (P_SENSOR_EYE[1] + fireCenter[1]) * 0.5,
      (P_SENSOR_EYE[2] + fireCenter[2]) * 0.5,
    ];
    return { len, q, mid };
  }, [fireCenter[0], fireCenter[1], fireCenter[2]]);

  const signalP = prog(t, CUE.c03_s08_3ms, CUE.c03_s08_flood_gas + 0.12);

  return (
    <group>
      {/* Viền thấu kính quang học nổi rõ trên vách sau-trái ngay từ đầu cảnh */}
      <group position={P_SENSOR_EYE}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={housingMat}>
          <cylinderGeometry args={[0.056, 0.062, 0.032, 20]} />
        </mesh>
        <mesh position={[0, 0, 0.015]} rotation={[Math.PI / 2, 0, 0]} material={brassMat}>
          <cylinderGeometry args={[0.044, 0.048, 0.014, 20]} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <sphereGeometry args={[0.031, 16, 14]} />
          <meshBasicMaterial color={spotOn > 0.05 ? '#8efff8' : '#256c78'} toneMapped={false} />
        </mesh>
        {spotOn > 0.02 && (
          <>
            <mesh position={[0, 0, 0.026]} rotation={[0, 0, t * 4]}>
              <ringGeometry args={[0.054, 0.072, 24]} />
              <meshBasicMaterial
                color={PAL.cyan}
                transparent
                opacity={0.94 * beamVis}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
            <pointLight color={PAL.cyan} intensity={3.8 * beamVis} distance={2.5} decay={1.6} />
          </>
        )}
      </group>

      {/* Nón tia quét cyan + tia khoá laser & các vòng cắt lớp bắt trúng tâm cầu lửa trong chuyển động siêu chậm */}
      {beamVis > 0.01 && (
        <>
          <group position={beamInfo.mid} quaternion={beamInfo.q}>
            <mesh>
              <cylinderGeometry args={[0.24, 0.024, beamInfo.len * spotOn, 24, 1, true]} />
              <meshBasicMaterial
                color={PAL.cyan}
                transparent
                opacity={0.22 * beamVis}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh>
              <cylinderGeometry args={[0.0085, 0.0085, beamInfo.len * spotOn, 10]} />
              <meshBasicMaterial
                color="#e0ffff"
                transparent
                opacity={0.94 * beamVis}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {[0.28, 0.62, 0.92].map((u, idx) => {
              const slide = ((u + (t - CUE.c03_s08_optical_spot) * 0.45) % 1);
              const r = lerp(0.028, 0.23, slide);
              const yOff = (slide - 0.5) * beamInfo.len;
              return (
                <mesh key={idx} position={[0, yOff, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[Math.max(0.008, r - 0.013), r, 24]} />
                  <meshBasicMaterial
                    color={PAL.cyanSoft}
                    transparent
                    opacity={0.72 * beamVis}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              );
            })}
          </group>

          {/* Khung khoá mục tiêu 3 MS ngay tại tâm đám cháy */}
          <group position={fireCenter}>
            <mesh rotation={[-Math.PI / 3.5, 0.2, t * 2.4]} scale={lerp(1.4, 1.0, lock3ms)}>
              <ringGeometry args={[0.22, 0.255, 32]} />
              <meshBasicMaterial
                color={PAL.cyan}
                transparent
                opacity={0.94 * beamVis}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh rotation={[-Math.PI / 3.5, 0.2, -t * 3.2]} scale={lerp(1.18, 0.72, lock3ms)}>
              <ringGeometry args={[0.13, 0.155, 6]} />
              <meshBasicMaterial
                color="#eaffff"
                transparent
                opacity={0.88 * beamVis * Math.max(0.35, lock3ms)}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        </>
      )}

      {/* Tín hiệu kích hoạt chạy dọc ống góp mạ crôm tới van 2 bình Halon đỏ & 2 vòi đồng */}
      {signalP > 0.01 && t < CUE.c03_s08_150ms && (
        <group>
          {[P_BOTTLE_1, P_BOTTLE_2, P_NOZZLE_L, P_NOZZLE_R].map((pt, idx) => (
            <mesh key={idx} position={[pt[0], pt[1], pt[2] + 0.025]}>
              <sphereGeometry args={[0.024, 12, 12]} />
              <meshBasicMaterial
                color={PAL.cyan}
                transparent
                opacity={0.88 * fadeAfterFlood}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
};

/** Cầu lửa nhiên liệu cam rực đa lớp thể tích (bùng lên @ 425.94 -> slow-motion @ 427.00..430.04 -> tắt sạch trước 432.55) */
const InternalFuelFlashFX: React.FC<{ t: number }> = ({ t }) => {
  const matCore = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#fff6c8',
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    [],
  );
  const matMid = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#ff9624',
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
      }),
    [],
  );
  const matOuter = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#e03c10',
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
      }),
    [],
  );

  if (t < CUE.c03_s08_fuel_flash) return null;

  const igniteFast = prog(t, CUE.c03_s08_fuel_flash, CUE.c03_s08_optical_spot);
  const slowMoCreep = prog(t, CUE.c03_s08_optical_spot, CUE.c03_s08_flood_gas, (x) => x);
  const suppressP = prog(t, CUE.c03_s08_flood_gas + 0.12, CUE.c03_s08_150ms - 0.22);
  const alive = 1 - suppressP;

  if (alive <= 0.004) return null;

  const slowTime =
    t < CUE.c03_s08_optical_spot
      ? t - CUE.c03_s08_fuel_flash
      : (CUE.c03_s08_optical_spot - CUE.c03_s08_fuel_flash) + (t - CUE.c03_s08_optical_spot) * 0.14;

  const rBase = (0.12 + igniteFast * 0.24 + slowMoCreep * 0.07) * (0.25 + 0.75 * alive);

  matCore.opacity = 0.96 * alive;
  matMid.opacity = 0.9 * alive;
  matMid.color.set(mix('#ff7300', '#a82808', suppressP));
  matOuter.opacity = 0.78 * alive;
  matOuter.color.set(mix('#d92604', '#4d1208', suppressP));

  return (
    <group position={P_FUEL_FLASH}>
      <pointLight
        color="#ff6e14"
        intensity={18 * igniteFast * alive * alive}
        distance={3.6}
        decay={1.7}
        position={[0, 0.14, 0.08]}
      />

      {/* Vỏ cầu lửa cam-đỏ đậm tương phản mạnh với sàn giỏ sáng */}
      <mesh position={[0, 0.06, 0]} scale={[rBase * 0.95, rBase * 0.85, rBase * 0.95]}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial
          color={mix('#ff5500', '#7a1c08', suppressP)}
          transparent
          opacity={0.72 * alive}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0, 0.06, 0]} scale={rBase * 0.52}>
        <icosahedronGeometry args={[1, 2]} />
        <meshBasicMaterial
          color="#fff0a6"
          transparent
          opacity={0.95 * alive}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {/* Lõi plasma nhiên liệu sáng rực */}
      <sprite material={matCore} position={[0, 0.07, 0]} scale={[rBase * 1.25, rBase * 1.2, 1]} />

      {/* Các lưỡi lửa cuộn thể tích mềm tự nhiên (không bị viền hình tròn cứng) */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2 + slowTime * 0.85;
        const rad = rBase * (0.25 + 0.45 * hash01(i, 1));
        const yUp = (0.02 + hash01(i, 2) * rBase * 0.85 + slowTime * 0.035) * alive;
        const sz = rBase * (0.95 + 0.65 * hash01(i, 3));
        return (
          <sprite
            key={i}
            material={i % 3 === 0 ? matCore : i % 2 === 0 ? matMid : matOuter}
            position={[Math.cos(a) * rad, yUp, Math.sin(a) * rad]}
            scale={[sz, sz * 1.15, 1]}
          />
        );
      })}

      {/* Hạt tia lửa nhiên liệu bắn lơ lửng trong chuyển động siêu chậm */}
      {Array.from({ length: 20 }, (_, i) => {
        const ang = hash01(i, 4) * Math.PI * 2;
        const elev = 0.25 + hash01(i, 5) * 0.85;
        const spd = 0.28 + hash01(i, 6) * 0.48;
        const dist = Math.min(0.55, slowTime * spd);
        const sx = Math.cos(ang) * dist * (1 - elev * 0.35);
        const sz = Math.sin(ang) * dist * (1 - elev * 0.35);
        const sy = dist * elev + 0.02;
        return (
          <mesh key={`sp-${i}`} position={[sx, sy, sz]} rotation={[i, slowTime * 3, 0]}>
            <octahedronGeometry args={[0.012 * alive, 0]} />
            <meshBasicMaterial color="#ffe896" transparent opacity={0.92 * alive} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Luồng khí dập lửa Halon trắng-cyan dày mịn phun từ 2 vòi đồng tràn ngập khoang dưới 150 ms */
const HalonSuppressionPlumeFX: React.FC<{ t: number }> = ({ t }) => {
  const dt = t - CUE.c03_s08_flood_gas;
  const jetIn = prog(t, CUE.c03_s08_flood_gas, CUE.c03_s08_flood_gas + 0.38);
  const bayFill = prog(t, CUE.c03_s08_flood_gas + 0.16, CUE.c03_s08_150ms);
  const settle = prog(t, CUE.c03_s08_150ms + 0.4, 436.4);

  const jetStrength = jetIn * lerp(1.0, 0.36, settle);

  const mistMatWhite = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#eaffff',
        transparent: true,
        opacity: 0.24,
        depthWrite: false,
      }),
    [],
  );
  const mistMatCyan = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#88f4ff',
        transparent: true,
        opacity: 0.22,
        depthWrite: false,
      }),
    [],
  );

  const nozzleJets = useMemo(() => {
    const targets: [V3, V3][] = [
      [P_NOZZLE_L, [-0.22, 0.36, -0.82]],
      [P_NOZZLE_R, [0.06, 0.36, -0.78]],
    ];
    return targets.map(([noz, trg]) => {
      const v = new THREE.Vector3(trg[0] - noz[0], trg[1] - noz[1], trg[2] - noz[2]);
      const len = v.length();
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), v.clone().normalize());
      return { noz, trg, len, q, dir: v.normalize() };
    });
  }, []);

  if (dt < 0) return null;

  return (
    <group>
      <pointLight
        position={[-0.1, 0.85, -0.82]}
        color="#8cf6ff"
        intensity={5.2 * bayFill * lerp(1, 0.55, settle)}
        distance={3.8}
        decay={1.6}
      />

      {/* Hai luồng nón khí áp lực cao phun trực tiếp từ 2 vòi đồng trên ống góp mạ crôm */}
      {nozzleJets.map((nj, ni) => {
        const curLen = nj.len * Math.min(1, dt / 0.28);
        return (
          <group key={ni} position={nj.noz} quaternion={nj.q}>
            <mesh position={[0, -curLen * 0.5, 0]}>
              <cylinderGeometry args={[0.024, 0.28 * Math.min(1, dt / 0.32), curLen, 20, 1, true]} />
              <meshBasicMaterial
                color="#d8fcff"
                transparent
                opacity={0.3 * jetStrength}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, -curLen * 0.45, 0]}>
              <cylinderGeometry args={[0.011, 0.13 * Math.min(1, dt / 0.32), curLen * 0.9, 16, 1, true]} />
              <meshBasicMaterial
                color="#ffffff"
                transparent
                opacity={0.44 * jetStrength}
                side={THREE.DoubleSide}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}

      {/* Các cụm hạt sương khí động học lao dọc theo luồng phun xuống dập tắt tâm lửa */}
      {Array.from({ length: 24 }, (_, i) => {
        const nj = nozzleJets[i % 2];
        const cycle = ((dt * 1.7 + i * 0.07) % 1);
        if (dt < i * 0.014) return null;
        const spread = cycle * 0.24;
        const ang = hash01(i, 1) * Math.PI * 2;
        const px = nj.noz[0] + nj.dir.x * (nj.len * cycle) + Math.cos(ang) * spread;
        const py = nj.noz[1] + nj.dir.y * (nj.len * cycle);
        const pz = nj.noz[2] + nj.dir.z * (nj.len * cycle) + Math.sin(ang) * spread;
        const sz = (0.16 + cycle * 0.44) * jetStrength;
        if (sz <= 0.02) return null;
        return (
          <sprite
            key={`jet-${i}`}
            material={i % 3 === 0 ? mistMatCyan : mistMatWhite}
            position={[px, py, pz]}
            scale={[sz, sz, sz]}
          />
        );
      })}

      {/* Màn sương Halon trắng-cyan dày mịn cuộn tràn sàn giỏ dưới chân tổ lái (giữ thoáng tầm cao để cặp bình Halon đỏ rực và tổ lái luôn rõ nét) */}
      {bayFill > 0.01 &&
        Array.from({ length: 36 }, (_, i) => {
          const r = 0.12 + Math.sqrt(hash01(i, 2)) * 0.88;
          const a = hash01(i, 3) * Math.PI * 2 + dt * (0.24 + hash01(i, 4) * 0.18);
          const cx = -0.08 + Math.cos(a) * r;
          const cz = -0.58 + Math.sin(a) * r * 0.78;
          const cy = 0.22 + hash01(i, 5) * 0.44 + Math.sin(dt * 1.4 + i) * 0.035;
          const grow = prog(dt, i * 0.022, 0.48 + i * 0.025);
          const sz = (0.44 + hash01(i, 6) * 0.42) * grow * lerp(1.0, 0.82, settle);
          if (sz <= 0.02) return null;
          return (
            <sprite
              key={`cloud-${i}`}
              material={i % 2 === 0 ? mistMatWhite : mistMatCyan}
              position={[cx, cy, cz]}
              scale={[sz * 1.25, sz * 0.76, sz]}
            />
          );
        })}
    </group>
  );
};

const C03S08: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // halonSpray tăng 0 -> 1 ngay khi xả khí lúc 430.04s (đúng chuẩn < 150 ms)
  const halonSpray = prog(t, CUE.c03_s08_flood_gas, CUE.c03_s08_flood_gas + 0.35);

  // Lính nạp đạn xoay gọn về phía khoá nòng bên trái khung hình, mở thoáng 100% cặp bình Halon đỏ, ống góp crôm & mắt cảm biến
  const loaderPhase = lerp(0.96, 1.0, prog(t, 423.8, 436.5));
  const cadillacTurn = Math.sin((t - 424.0) * 0.6) * 0.08;

  // Quỹ đạo Camera đặt hoàn toàn bên trong khoang trước (pos.x <= 0.68 < 0.78):
  // - Hoàn toàn loại bỏ mặt sau má giáp Chobham trái (x >= 0.78) khỏi khung hình!
  // - Nằm gọn bên trong bán kính 2 khối cầu halonSpray của base khi spray=1 -> triệt tiêu 100% viền cầu cứng và giữ cặp bình Halon đỏ tươi sắc nét!
  const pIntro = prog(t, 423.8, CUE.c03_s08_optical_spot);
  const pSlowScan = prog(t, CUE.c03_s08_optical_spot, CUE.c03_s08_flood_gas);
  const pWideFlood = prog(t, CUE.c03_s08_flood_gas, 436.3);

  let camPos: V3 = [
    lerp(0.68, 0.62, pIntro),
    lerp(1.52, 1.48, pIntro),
    lerp(-0.42, -0.44, pIntro),
  ];
  let camLook: V3 = [
    lerp(-0.46, -0.36, pIntro),
    lerp(0.98, 0.94, pIntro),
    lerp(-1.04, -1.02, pIntro),
  ];
  let fov = lerp(52, 55, pIntro);

  if (pSlowScan > 0) {
    camPos = [
      lerp(camPos[0], 0.59, pSlowScan),
      lerp(camPos[1], 1.47, pSlowScan),
      lerp(camPos[2], -0.45, pSlowScan),
    ];
    camLook = [
      lerp(camLook[0], -0.34, pSlowScan),
      lerp(camLook[1], 0.94, pSlowScan),
      lerp(camLook[2], -1.02, pSlowScan),
    ];
    fov = lerp(fov, 56, pSlowScan);
  }

  if (pWideFlood > 0) {
    camPos = [
      lerp(camPos[0], 0.60, pWideFlood),
      lerp(camPos[1], 1.48, pWideFlood),
      lerp(camPos[2], -0.35, pWideFlood),
    ];
    camLook = [
      lerp(camLook[0], -0.40, pWideFlood),
      lerp(camLook[1], 0.92, pWideFlood),
      lerp(camLook[2], -0.94, pWideFlood),
    ];
    fov = lerp(fov, 56, pWideFlood);
  }

  const fireCenterTarget: V3 = [P_FUEL_FLASH[0], P_FUEL_FLASH[1] + 0.06, P_FUEL_FLASH[2]];

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden' }}>
      <Stage
        {...LOOK_INTERIOR_BAY.stage}
        width={W}
        height={H}
        shadowArea={7.5}
        shadowCenter={[-0.25, 0.95, -0.65]}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Đèn phụ khoang cơ khí chiếu nổi khối bình Halon đỏ, ống góp mạ crôm, vòi đồng & công tắc đầu gối */}
        <pointLight position={[0.32, 1.58, -0.56]} color="#eef5ff" intensity={2.2} distance={4.2} decay={1.5} />
        <pointLight position={[-0.58, 1.48, -0.72]} color="#fff5e6" intensity={1.6} distance={3.2} decay={1.6} />

        <StudioMechanicalPedestal />

        <TurretInterior3D
          showCrew={true}
          blastDoorOpen={0}
          breechOpen={0}
          loaderPhase={loaderPhase}
          cadillacTurn={cadillacTurn}
          halonSpray={halonSpray}
          mirrorTilt={[0.02, -0.01]}
        />

        <InternalFuelFlashFX t={t} />

        <OpticalFlameSensorFX t={t} fireCenter={fireCenterTarget} />

        <HalonSuppressionPlumeFX t={t} />
      </Stage>

      {t < CUE.c03_s08_150ms && (
        <Label
          t={t}
          text="3 MS"
          x={W * 0.82}
          y={H * 0.25}
          from={CUE.c03_s08_3ms}
          until={431.6}
          bg={PAL.cream}
          fg={PAL.ink}
        />
      )}
      <Label
        t={t}
        text="< 150 MS"
        x={W * 0.80}
        y={H * 0.25}
        from={CUE.c03_s08_150ms}
        until={436.0}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C03S08;
