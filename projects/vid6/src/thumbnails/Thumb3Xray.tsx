import React, { useLayoutEffect, useMemo, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Cam, Stage } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { plain } from '@skill/military/3d/materials';
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

const AMMO_DARK_HEXES = new Set(['2a3038', '566347', '9173ed', '252c34', '262e37', '1e252e']);

/** Cột lửa vụ nổ 36 viên đạn dạng mây lửa mềm (volumetric sprite) thoát thẳng đứng qua 2 nắp Blowout mở chữ V */
const XrayBlowoutFireball: React.FC<{ position: [number, number, number] }> = ({ position }) => {
  const tex = useMemo(() => softDot(), []);
  const puffs: { pos: [number, number, number]; size: number; color: string; opacity: number }[] = [
    { pos: [0, 0.25, 0], size: 1.05, color: '#fff8cf', opacity: 0.96 },
    { pos: [0.04, 0.62, -0.03], size: 1.28, color: '#ffbf3b', opacity: 0.9 },
    { pos: [-0.05, 1.02, 0.04], size: 1.36, color: '#ff8216', opacity: 0.82 },
    { pos: [0.03, 1.44, 0], size: 1.22, color: '#ff4d10', opacity: 0.66 },
    { pos: [-0.04, 1.82, 0.02], size: 1.05, color: '#d63608', opacity: 0.44 },
  ];
  return (
    <group position={position}>
      <pointLight position={[0, 0.95, 0.35]} color="#ff9922" intensity={20} distance={8.5} />
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.size * 0.85, p.size * 1.2, 1]}>
          <spriteMaterial map={tex} color={p.color} transparent opacity={p.opacity} depthWrite={false} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
};

/** Vỏ xe tăng M1A2 Abrams X-quang xám bán trong suốt (blowoutOpen = 0.92 mở bung 2 nắp xả nổ trên nóc!) */
const GhostExteriorAbrams: React.FC = () => {
  const ghostRef = useRef<THREE.Group>(null);

  const windowCutPlanes = useMemo(
    () => makeCutawayBoxPlanes(-3.62, 3.46, 0.68, 2.36, 0.1, 2.2),
    [],
  );

  const ghostShellMat = useMemo(() => {
    const m = new THREE.MeshStandardMaterial({
      color: new THREE.Color('#a4aeb9'),
      roughness: 0.76,
      metalness: 0.16,
      transparent: true,
      opacity: 0.31,
      depthWrite: false,
      side: THREE.FrontSide,
    });
    m.clippingPlanes = windowCutPlanes;
    m.clipIntersection = true;
    return m;
  }, [windowCutPlanes]);

  const ghostWheelTrackMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#b0bac5'),
        roughness: 0.7,
        metalness: 0.2,
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.FrontSide,
      }),
    [],
  );

  useLayoutEffect(() => {
    if (!ghostRef.current) return;
    ghostRef.current.updateMatrixWorld(true);

    ghostRef.current.traverse((obj) => {
      if (!(obj as THREE.Mesh).isMesh) return;
      const m = obj as THREE.Mesh;
      m.geometry.computeBoundingBox();
      const bb = m.geometry.boundingBox;
      if (!bb) return;

      const worldBox = bb.clone().applyMatrix4(m.matrixWorld);
      const cy = (worldBox.min.y + worldBox.max.y) * 0.5;
      const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
      const sizeZ = worldBox.max.z - worldBox.min.z;

      if (cz > 1.58 && cy > 0.42 && cy < 1.24 && sizeZ < 0.35) {
        m.visible = false;
        return;
      }

      if (cy < 0.86 || cy > 2.38) {
        m.material = ghostWheelTrackMat;
      } else {
        m.material = ghostShellMat;
      }
      m.castShadow = false;
      m.receiveShadow = false;
      m.renderOrder = 10;
    });
  }, [ghostShellMat, ghostWheelTrackMat]);

  return (
    <group ref={ghostRef}>
      <M1A2Abrams variant="m1a2" camo="desert" gunPitch={0.008} blowoutOpen={0.92} travel={0} />
    </group>
  );
};

/**
 * Khoang chiến đấu Xanh Dương Điện + 4 Tổ Lái Vàng Kim sống sót an toàn nhờ cửa chống nổ + Tuabin AGT1500 rực lửa Hổ Phách 930°F ở đuôi!
 */
const XrayCyanSurvivabilityInterior: React.FC = () => {
  const intRef = useRef<THREE.Group>(null);
  const turbGlowRef = useRef<THREE.Group>(null);

  const goldCrewMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffc400'),
        emissive: new THREE.Color('#5e3800'),
        emissiveIntensity: 0.26,
        roughness: 0.28,
        metalness: 0.5,
      }),
    [],
  );

  const cyanBrightMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#00adff'),
        emissive: new THREE.Color('#003366'),
        emissiveIntensity: 0.26,
        roughness: 0.36,
        metalness: 0.24,
      }),
    [],
  );

  const cyanDeepMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#045aa1'),
        emissive: new THREE.Color('#011e3d'),
        emissiveIntensity: 0.2,
        roughness: 0.44,
        metalness: 0.42,
      }),
    [],
  );

  const amberTurbineMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ff8c1a'),
        emissive: new THREE.Color('#ff5900'),
        emissiveIntensity: 1.25,
        roughness: 0.32,
        metalness: 0.45,
      }),
    [],
  );

  const amberCoreMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color('#ffd24d'),
        emissive: new THREE.Color('#ff9d00'),
        emissiveIntensity: 1.55,
        roughness: 0.25,
        metalness: 0.35,
      }),
    [],
  );

  const cyanRingBackOnlyMat = useMemo(() => {
    const m = cyanBrightMat.clone();
    m.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0.25)];
    return m;
  }, [cyanBrightMat]);

  useLayoutEffect(() => {
    if (intRef.current) {
      intRef.current.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) {
          if (
            Math.abs(obj.position.x + 0.3) < 0.02 &&
            Math.abs(obj.position.y - 0.16) < 0.02 &&
            Math.abs(obj.position.z + 0.58) < 0.02
          ) {
            obj.position.set(-0.88, 0.44, 0.24);
          } else if (
            Math.abs(obj.position.x + 0.46) < 0.02 &&
            Math.abs(obj.position.y - 0.79) < 0.02 &&
            Math.abs(obj.position.z - 0.74) < 0.02
          ) {
            obj.position.set(-0.26, 0.86, 0.58);
          }
        }
      });

      intRef.current.updateMatrixWorld(true);

      intRef.current.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const m = obj as THREE.Mesh;
        const orig = Array.isArray(m.material) ? m.material[0] : m.material;
        const std = orig as THREE.MeshStandardMaterial;
        const hex = std?.color ? std.color.getHexString().toLowerCase() : '';

        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (!bb) return;

        const worldBox = bb.clone().applyMatrix4(m.matrixWorld);
        const cx = (worldBox.min.x + worldBox.max.x) * 0.5;
        const cy = (worldBox.min.y + worldBox.max.y) * 0.5;
        const cz = (worldBox.min.z + worldBox.max.z) * 0.5;
        const sizeX = worldBox.max.x - worldBox.min.x;
        const sizeZ = worldBox.max.z - worldBox.min.z;

        if (Math.abs(cz) > 1.12 && cy < 0.96) {
          m.visible = false;
          return;
        }

        if (!CREW_HEXES.has(hex)) {
          if (cx > 0.68 && cy > 1.34 && (cz > 0.42 || cx > 1.52)) {
            m.visible = false;
            return;
          }
          if (cx < -0.82 && cx > -1.16 && cz > 0.65 && cy > 1.35) {
            m.visible = false;
            return;
          }
          if (cy > 2.34) {
            m.visible = false;
            return;
          }
          if (cx > 1.65 && cy > 0.72 && cz > 0.72 && sizeZ < 0.35) {
            m.visible = false;
            return;
          }
          if (cy > 1.34 && cy < 1.47 && sizeX > 2.1 && sizeZ > 2.1) {
            m.material = cyanRingBackOnlyMat;
            m.renderOrder = 2;
            return;
          }
        }

        if (CREW_HEXES.has(hex)) {
          m.material = goldCrewMat;
        } else if (AMMO_DARK_HEXES.has(hex)) {
          m.material = cyanDeepMat;
        } else {
          m.material = cyanBrightMat;
        }
        m.renderOrder = 2;
      });
    }

    if (turbGlowRef.current) {
      turbGlowRef.current.updateMatrixWorld(true);
      turbGlowRef.current.traverse((obj) => {
        if (!(obj as THREE.Mesh).isMesh) return;
        const m = obj as THREE.Mesh;
        m.geometry.computeBoundingBox();
        const bb = m.geometry.boundingBox;
        if (bb) {
          const wb = bb.clone().applyMatrix4(m.matrixWorld);
          if ((wb.min.y + wb.max.y) * 0.5 < 0.35 && wb.max.y - wb.min.y < 0.5) {
            m.visible = false;
            return;
          }
        }
        const orig = Array.isArray(m.material) ? m.material[0] : m.material;
        const std = orig as THREE.MeshStandardMaterial;
        const hex = std?.color ? std.color.getHexString().toLowerCase() : '';
        if (hex === '736050' || hex === 'bf703e' || hex === 'dba93d') {
          m.material = amberCoreMat;
        } else {
          m.material = amberTurbineMat;
        }
        m.renderOrder = 3;
      });
    }
  }, [goldCrewMat, cyanBrightMat, cyanDeepMat, cyanRingBackOnlyMat, amberTurbineMat, amberCoreMat]);

  return (
    <group>
      <group ref={intRef}>
        <PowerpackChassis3D mode="driverOnly" throttleTwist={0.9} steerAngle={0.06} />
        <PowerpackChassis3D mode="suspensionOnly" />
        <TurretInterior3D
          position={[0.04, 0.55, 0]}
          showCrew={true}
          blastDoorOpen={0.05}
          blowoutOpen={0.9}
          loaderPhase={0.48}
          gunPitch={0.008}
        />
      </group>

      {/* Động cơ tuabin phản lực trực thăng 1,500 HP AGT1500 phát sáng nhiệt hổ phách 930°F đặt đúng giữa khoang đuôi bên phải */}
      <group ref={turbGlowRef} position={[-2.52, 0.14, 0.18]}>
        <pointLight position={[0.0, 0.95, 0.65]} color="#ff8811" intensity={12} distance={5} />
        <PowerpackChassis3D mode="turbineOnly" turbineSpin={0.35} exhaustGlow={1} />
      </group>

      {/* Cột lửa vụ nổ 36 viên đạn thoát thẳng lên trời qua nắp Blowout trong khi 4 lính vàng bên trong hoàn toàn nguyên vẹn */}
      <XrayBlowoutFireball position={[-1.92, 2.48, 0.0]} />
    </group>
  );
};

/** Sàn bản vẽ kỹ thuật X-Ray tối có các đường gióng blueprint xanh xám mảnh */
const BlueprintDarkStudioFloor: React.FC = () => {
  const floorMat = useMemo(() => plain('#151920', 0.34, 0.38), []);
  const lineMat = useMemo(
    () =>
      plain('#3b5570', 0.5, 0.1, {
        emissive: new THREE.Color('#273e57'),
        emissiveIntensity: 0.45,
      }),
    [],
  );

  return (
    <group>
      <mesh position={[0, -0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <planeGeometry args={[48, 36]} />
      </mesh>
      {[-4.5, -2.25, 0, 2.25, 4.5].map((zPos, i) => (
        <mesh key={`bz${i}`} position={[0, 0.002, zPos]} rotation={[-Math.PI / 2, 0, 0]} material={lineMat}>
          <planeGeometry args={[28, 0.022]} />
        </mesh>
      ))}
      {[-6, -3, 0, 3, 6].map((xPos, i) => (
        <mesh key={`bx${i}`} position={[xPos, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={lineMat}>
          <planeGeometry args={[0.022, 20]} />
        </mesh>
      ))}
    </group>
  );
};

export const Thumb3Xray: React.FC = () => {
  const wallMat = useMemo(() => plain('#191e26', 0.94, 0.04), []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#181c24', overflow: 'hidden' }}>
      {/* Lật gương ngang để xe tăng X-Ray quay mũi sang TRÁI (đối lập hoàn toàn bố cục hướng phải của AiTelly, khớp 1:1 với bản AI mới của vid6!) */}
      <div style={{ position: 'absolute', inset: 0, transform: 'scaleX(-1)' }}>
        <Stage
          sky={['#151920', '#1d232d', '#12161c']}
          sun={[22, 36, 28]}
          sunColor="#fff9f0"
          sunIntensity={2.5}
          shadowArea={18}
          shadowCenter={[0.2, 1.1, 0]}
          fog={[45, 140]}
          fogColor="#181c24"
          env={0.5}
          ambient={0.36}
          exposure={1.03}
          post={{ bloom: 0.34, bloomThreshold: 0.84, ao: 2.0, aoRadius: 1.4, vignette: 0.32 }}
        >
          <EnableLocalClipping />

          <Cam pos={[2.65, 2.38, 10.55]} look={[0.48, 1.52, 0.0]} fov={36} />

          <BlueprintDarkStudioFloor />
          <mesh position={[0, 5.2, -7.5]} material={wallMat}>
            <planeGeometry args={[48, 18]} />
          </mesh>

          <XrayCyanSurvivabilityInterior />
          <GhostExteriorAbrams />
        </Stage>
      </div>

      {/* Typography 100% nguyên bản bám sát kịch bản vid6 (36 SHELLS | CREW SURVIVES / BLOWOUT SECRET | 1,500 HP / AGT1500 JET) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          fontFamily: "'Arial Black', 'Montserrat', 'Helvetica Neue', sans-serif",
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 56,
            top: 32,
            fontSize: 126,
            fontWeight: 900,
            fontStyle: 'italic',
            lineHeight: 1,
            letterSpacing: '-2px',
            color: '#fff000',
            textShadow: '0 8px 24px rgba(0,0,0,0.8)',
          }}
        >
          36 SHELLS
        </div>

        <div
          style={{
            position: 'absolute',
            right: -28,
            top: 24,
            width: 930,
            height: 148,
            backgroundColor: '#fff000',
            transform: 'skewX(-14deg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 28px rgba(0,0,0,0.6)',
          }}
        >
          <span
            style={{
              fontSize: 90,
              fontWeight: 900,
              fontStyle: 'italic',
              letterSpacing: '-2px',
              color: '#08090c',
              paddingRight: 18,
            }}
          >
            CREW SURVIVES
          </span>
        </div>

        <div
          style={{
            position: 'absolute',
            right: 48,
            top: 186,
            textAlign: 'right',
            fontSize: 82,
            fontWeight: 900,
            fontStyle: 'italic',
            lineHeight: 0.96,
            letterSpacing: '-1.5px',
            color: '#fff000',
            textShadow: '0 6px 20px rgba(0,0,0,0.88)',
          }}
        >
          <div>BLOWOUT</div>
          <div>SECRET</div>
        </div>

        {/* Huy hiệu thông số động cơ tuabin phản lực 1,500 HP AGT1500 JET góc dưới trái */}
        <div
          style={{
            position: 'absolute',
            left: 38,
            bottom: 28,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
          }}
        >
          <div
            style={{
              border: '4px solid #fff000',
              borderBottom: 'none',
              borderRadius: '10px 10px 0 0',
              backgroundColor: 'rgba(18, 22, 30, 0.86)',
              padding: '8px 20px 6px 20px',
              fontSize: 64,
              fontWeight: 900,
              fontStyle: 'italic',
              lineHeight: 1,
              color: '#fff000',
            }}
          >
            1,500 HP
          </div>
          <div
            style={{
              backgroundColor: '#fff000',
              borderRadius: '0 10px 10px 10px',
              padding: '6px 22px 8px 20px',
              fontSize: 52,
              fontWeight: 900,
              fontStyle: 'italic',
              lineHeight: 1,
              color: '#08090c',
              boxShadow: '0 8px 20px rgba(0,0,0,0.65)',
            }}
          >
            AGT1500 JET
          </div>
        </div>
      </div>
    </div>
  );
};

export default Thumb3Xray;
