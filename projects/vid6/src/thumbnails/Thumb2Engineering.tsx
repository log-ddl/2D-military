import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Cam, Stage } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { DustTrail, softDot } from '@skill/military/3d/fx';
import { pipe, rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';
import { EnemyT72 } from '../parts/EnemyT72';
import { FpvDrone3D } from '../parts/FpvDrone3D';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { TurretInterior3D } from '../parts/TurretInterior3D';

const EnableLocalClipping: React.FC = () => {
  const gl = useThree((s) => s.gl);
  gl.localClippingEnabled = true;
  useLayoutEffect(() => {
    gl.localClippingEnabled = true;
  }, [gl]);
  return null;
};

function makeRotatedCutawayBoxPlanes(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number,
  zMin: number,
  zMax: number,
  yaw: number,
): THREE.Plane[] {
  const rotM = new THREE.Matrix4().makeRotationY(yaw);
  const planes = [
    new THREE.Plane(new THREE.Vector3(-1, 0, 0), xMin),
    new THREE.Plane(new THREE.Vector3(1, 0, 0), -xMax),
    new THREE.Plane(new THREE.Vector3(0, -1, 0), yMin),
    new THREE.Plane(new THREE.Vector3(0, 1, 0), -yMax),
    new THREE.Plane(new THREE.Vector3(0, 0, -1), zMin),
    new THREE.Plane(new THREE.Vector3(0, 0, 1), -zMax),
  ];
  return planes.map((p) => p.applyMatrix4(rotM));
}

/** Chiến trường sa mạc đỏ rực nắng + dãy núi đá xa + xác xe tăng T-72 bốc khói bay tháp pháo ở chân trời trái (C01 & C03 kịch bản vid6) */
const DesertBattlefieldWithPoppedT72: React.FC = () => {
  const heightFn = useMemo(
    () =>
      heightField({
        seed: 64,
        amp: 0.68,
        scale: 52,
        flats: [
          [0, 0, 15, 0],
          [3.5, -15.5, 6, 0.1],
        ],
        add: (x, z) => {
          if (z < -22) {
            const ridgeLine = -38 + Math.sin(x * 0.22) * 3.0;
            const distZ = (z - ridgeLine) / 9.5;
            const envZ = Math.max(0, 1 - distZ * distZ);
            if (envZ <= 0) return 0;
            const envX = Math.max(0, 1 - Math.pow((x - 1.0) / 19.0, 2));
            const crag = 0.6 + 0.25 * Math.abs(Math.sin(x * 0.4 + 0.5)) + 0.15 * Math.abs(Math.cos(x * 0.9 - z * 0.2));
            return envZ * envZ * envX * crag * 6.2;
          }
          return 0;
        },
      }),
    [],
  );

  const avoidRocks = useMemo(
    () => (x: number, z: number) => Math.hypot(x, z) < 6.8 || z < -13,
    [],
  );

  return (
    <group>
      <Terrain
        h={heightFn}
        size={260}
        seg={180}
        colors={{
          low: '#c26938',
          high: '#a94822',
          rock: '#7a2f15',
          dry: '#e8a870',
        }}
      />

      <Scatter
        kind="rock"
        count={115}
        area={[-24, -12, 26, 22]}
        h={heightFn}
        tint="#8c4220"
        scale={[0.07, 0.2]}
        avoid={avoidRocks}
        seed={73}
      />

      {/* Xác xe tăng T-72 màu xanh ô-liu Nga cháy khói bay tháp pháo nằm dưới khoảng trống dưới nòng pháo bên trái (không đè lên đạn Sabot!) */}
      <group position={[5.15, 0.04, -10.8]} rotation={[0, 0.68, 0]} scale={[0.52, 0.52, 0.52]}>
        <EnemyT72 damaged={0.45} turretPopHeight={0.14} turretPopRot={[0.32, 0.55, 0.72]} showCarousel={true} />
        {[0, 1, 2, 3, 4].map((k) => (
          <sprite key={k} position={[-0.25 * k, 1.45 + k * 0.9, 0.2 * k]} scale={[2.2 + k * 0.75, 2.2 + k * 0.75, 1]}>
            <spriteMaterial
              map={softDot()}
              color={k === 0 ? '#ff7b1c' : '#23201e'}
              transparent
              opacity={Math.max(0.22, 0.68 - k * 0.1)}
              depthWrite={false}
              toneMapped={k !== 0}
            />
          </sprite>
        ))}
      </group>
    </group>
  );
};

/** Hero M1A2 SEPv3 phóng 40 mph tung bụi cát, cửa sổ cắt má giáp lộ sandwich Chobham/DU & khai hoả đạn M829A4 Mach 5 tách Sabot */
const FiringAbramsHero40Mph: React.FC<{ turretYaw: number; gunPitch: number }> = ({ turretYaw, gunPitch }) => {
  const tankRef = useRef<THREE.Group>(null);
  const intRef = useRef<THREE.Group>(null);

  // Khoét cửa sổ phẫu thuật trên má-sườn tháp pháo gần camera (+Z) để lộ rõ các tấm giáp phức hợp Chobham/DU & giá đạn 36 viên
  const cheekCutPlanes = useMemo(
    () => makeRotatedCutawayBoxPlanes(-2.15, 0.92, 1.48, 2.28, 0.42, 2.05, turretYaw),
    [turretYaw],
  );

  const towCable = useMemo(
    () =>
      pipe(
        [
          [3.68, 0.62, -0.82],
          [3.79, 0.46, -0.38],
          [3.83, 0.43, 0.0],
          [3.79, 0.48, 0.42],
          [3.68, 0.62, 0.82],
        ],
        0.024,
        24,
      ),
    [],
  );
  const matBlackCable = useMemo(() => plain('#181c22', 0.55, 0.45), []);
  const matArmorPlate = useMemo(() => plain('#adb7c2', 0.35, 0.78), []);
  const matDuLayer = useMemo(() => plain('#6e5ca8', 0.32, 0.76), []);

  useLayoutEffect(() => {
    if (tankRef.current) {
      tankRef.current.updateMatrixWorld(true);
      tankRef.current.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const m = obj as THREE.Mesh;
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (!bb) return;

        const worldBox = bb.clone().applyMatrix4(m.matrixWorld);
        const cy = (worldBox.min.y + worldBox.max.y) * 0.5;
        const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
        const sizeZ = worldBox.max.z - worldBox.min.z;

        // Ẩn giỏ đồ sườn +Z ngay trước cửa sổ cắt má giáp
        if (cy > 1.42 && cy < 2.38 && cz > 1.2 && sizeZ < 0.65) {
          m.visible = false;
          return;
        }

        if (cy > 1.36 && cy < 2.48 && sizeZ > 0.8) {
          const cloned = (Array.isArray(m.material) ? m.material[0] : m.material).clone();
          cloned.clippingPlanes = cheekCutPlanes;
          cloned.clipIntersection = true;
          cloned.clipShadows = true;
          cloned.side = THREE.DoubleSide;
          m.material = cloned;
        }
      });
    }

    if (intRef.current) {
      intRef.current.updateMatrixWorld(true);
      const invRot = new THREE.Matrix4().makeRotationY(-turretYaw);
      intRef.current.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const m = obj as THREE.Mesh;
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (!bb) return;

        const localBox = bb.clone().applyMatrix4(m.matrixWorld).applyMatrix4(invRot);
        const cx = (localBox.min.x + localBox.max.x) * 0.5;
        const cy = (localBox.min.y + localBox.max.y) * 0.5;
        const cz = (localBox.min.z + localBox.max.z) * 0.5;

        if (cy > 2.26 || cy < 1.46 || cx > 0.78 || cx < -2.2 || Math.abs(cz) > 1.28) {
          m.visible = false;
        }
      });
    }
  }, [cheekCutPlanes, turretYaw]);

  return (
    <group>
      <group ref={tankRef}>
        <M1A2Abrams
          variant="sepv3"
          camo="desert"
          turretYaw={turretYaw}
          gunPitch={gunPitch}
          hullPitch={-0.014}
          exhaustHeat={0.85}
          travel={4.2}
        />
      </group>

      <mesh geometry={towCable} material={matBlackCable} castShadow />

      {/* Bụi cát sa mạc cuộn dày dưới 2 dải xích T-158 khi xe lao 40 mph */}
      <DustTrail t={6.5} speed={14} pos={[-3.6, 0.12, 1.55]} color="#d89b68" size={1.65} />
      <DustTrail t={6.5} speed={14} pos={[-1.4, 0.08, 1.65]} color="#dfa574" size={1.25} />
      <DustTrail t={6.5} speed={14} pos={[-3.8, 0.15, -1.45]} color="#d29360" size={1.55} />

      <group rotation={[0, turretYaw, 0]}>
        <group ref={intRef}>
          <TurretInterior3D position={[0.04, 0.55, 0]} gunPitch={gunPitch} blastDoorOpen={0.85} showCrew={false} />
        </group>

        {/* Tấm sandwich giáp phức hợp NERA Chobham + Uranium nghèo nghiêng sắc nét trong ô cửa cắt má trước */}
        {[-0.05, 0.12, 0.29, 0.46, 0.63].map((px, idx) => (
          <mesh
            key={idx}
            position={[px, 1.88, 1.05 - idx * 0.04]}
            rotation={[0.24, 0.28, 0]}
            geometry={rbox(0.045, 0.54, 0.42, 0.005)}
            material={idx % 2 === 0 ? matArmorPlate : matDuLayer}
            castShadow
          />
        ))}

        {/* Chớp lửa đầu nòng M256 dạng mây lửa mềm (volumetric sprite) + Đạn M829A4 Mach 5 bung tách 3 cánh Sabot nổi bật trên nền trời */}
        <group position={[0.44, 1.85, 0]} rotation={[0, 0, gunPitch]}>
          <pointLight position={[5.55, 0, 0.3]} color="#ffaa2b" intensity={20} distance={7.5} />
          {[
            { x: 5.45, s: [0.95, 0.75], c: '#fff8cf', o: 0.96 },
            { x: 5.75, s: [1.45, 0.95], c: '#ffbe3d', o: 0.88 },
            { x: 6.02, s: [1.55, 1.1], c: '#ff7a18', o: 0.68 },
          ].map((p, idx) => (
            <sprite key={idx} position={[p.x, 0, 0]} scale={[p.s[0], p.s[1], 1]}>
              <spriteMaterial map={softDot()} color={p.c} transparent opacity={p.o} depthWrite={false} toneMapped={false} />
            </sprite>
          ))}

          {/* Đạn M829A4 bay ở Mach 5 tách 3 cánh Sabot rõ nét ngay phía trước quầng lửa đầu nòng */}
          <Ammo120mm3D kind="m829a4_flight" sabotSep={0.56} scale={1.38} position={[6.52, 0, 0]} />
        </group>
      </group>
    </group>
  );
};

export const Thumb2Engineering: React.FC = () => {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#2486de', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1)' }}>
        <Stage
          sky={['#1677d2', '#62bcf5', '#cdecfd']}
          sun={[38, 36, 34]}
          sunColor="#fff7e8"
          sunIntensity={3.2}
          shadowArea={22}
          shadowCenter={[0.2, 1.1, 0]}
          fog={[150, 520]}
          fogColor="#bbe5fc"
          env={0.5}
          ambient={0.3}
          exposure={1.07}
          post={{ bloom: 0.38, bloomThreshold: 0.86, ao: 2.2, aoRadius: 1.8, vignette: 0.2 }}
        >
          <EnableLocalClipping />

          <Cam pos={[8.35, 1.04, 6.65]} look={[1.75, 1.88, -1.05]} fov={39.5} />

          <DesertBattlefieldWithPoppedT72 />

          <FiringAbramsHero40Mph turretYaw={0.22} gunPitch={0.022} />

          {/* FPV Kamikaze Drone $500 chúc mũi đầu đạn PG-7VL + vòng dây đồng chạm nổ hướng thẳng xuống nóc tháp pháo M1A2! */}
          <FpvDrone3D
            position={[-1.78, 3.88, 1.48]}
            rotation={[0.18, 0.48, -0.52]}
            rotorSpin={0.45}
            pitch={0}
            scale={2.45}
          />
        </Stage>
      </div>

      {/* Khung khoá mục tiêu chiến thuật màu đỏ ôm vừa khít chiếc FPV Drone $500 ở góc trên bên phải */}
      <div
        style={{
          position: 'absolute',
          right: 175,
          top: 128,
          width: 345,
          height: 235,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: -34,
            fontFamily: "'Montserrat', 'Arial Black', 'Helvetica Neue', sans-serif",
            fontWeight: 900,
            fontSize: 27,
            letterSpacing: '0.5px',
            color: '#bd221c',
            textShadow: '0 1px 6px rgba(255,255,255,0.45)',
          }}
        >
          $500 DRONE
        </div>
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 58,
            height: 58,
            borderTop: '4px solid #c62821',
            borderLeft: '4px solid #c62821',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 0,
            bottom: 0,
            width: 58,
            height: 58,
            borderBottom: '4px solid #c62821',
            borderRight: '4px solid #c62821',
          }}
        />
      </div>

      {/* Typography 100% nguyên bản từ kịch bản vid6 (73.6 TONS OF / PURE PHYSICS / VS $500 DRONE) */}
      <div
        style={{
          position: 'absolute',
          left: 58,
          top: 42,
          pointerEvents: 'none',
          fontFamily: "'Montserrat', 'Arial Black', 'Helvetica Neue', sans-serif",
          fontWeight: 900,
          fontSize: 88,
          lineHeight: 0.99,
          letterSpacing: '-2px',
          color: '#083a78',
          textTransform: 'uppercase',
          textShadow: '0 2px 10px rgba(255,255,255,0.22)',
        }}
      >
        <div>73.6 TONS OF</div>
        <div>PURE PHYSICS</div>
        <div>VS $500 DRONE</div>
      </div>
    </div>
  );
};

export default Thumb2Engineering;
