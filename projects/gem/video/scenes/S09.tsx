// S09 (172.62 – 187.50s, thuần 3D): Góc ngước thấp từ trạm tác chiến điện tử (EW) chế áp mềm phát sóng vô tuyến đêm vs Flycam bị cắt sóng & Shahed-136 bay tự hành xuyên thẳng.
import React, { useMemo } from 'react';
import { Easing } from 'remotion';
import * as THREE from 'three';
import { prog, lerp } from '@kit/theme';
import { useT } from '@kit/motion';
import { Stage, Cam, type V3 } from '@lib/3d/stage';
import { Terrain, Scatter, heightField } from '@lib/3d/terrain';
import { rbox, lathe, pipe, merge, mat4, type P2 } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_PREDAWN, TERRAIN_PREDAWN } from '../local/palette';
import { Shahed136, ChuContainer, TWall, HescoWall } from '../local/models';

// Địa hình sa mạc đá sỏi bazan Rukban: sân công sự phẳng quanh gốc (r = 22m) + dải đồi thấp phía chân trời đêm
const terrainH = heightField({
  seed: 909,
  amp: 2.8,
  scale: 95,
  flats: [[0, 0, 22, 0]],
  add: (x, z) => {
    const northRidge = 8.5 * Math.exp(-(((z + 72) / 26) ** 2));
    const sideKnoll = 4.2 * Math.exp(-(((x - 42) / 22) ** 2) - (((z + 35) / 24) ** 2));
    return northRidge + sideKnoll;
  },
});

const avoidCompound = (x: number, z: number) => Math.hypot(x, z) < 16.5;

// Toạ độ đặt cột tháp tác chiến điện tử chế áp mềm (EW Directional Jammer Mast)
const EW_MAST_POS: V3 = [-2.55, 0, 0.25];
const EW_GIMBAL_HEIGHT = 7.05;

// ============================================================================
// 1. CỘT THÁP TÁC CHIẾN ĐIỆN TỬ CHẾ ÁP MỀM (EW DIRECTIONAL JAMMER MAST)
//    Tự dựng tỉ lệ 1:1 mét thật bằng rbox / lathe / pipe (cao ~7.9 m)
// ============================================================================

const EwJammerMast: React.FC<{ yaw: number; elev: number; activePower: number; pulse: number }> = ({
  yaw,
  elev,
  activePower,
  pulse,
}) => {
  const geos = useMemo(() => {
    const mastPoleProfile: P2[] = [
      [0.01, 0.22],
      [0.135, 0.22],
      [0.135, 2.65],
      [0.152, 2.66],
      [0.152, 2.76],
      [0.106, 2.77],
      [0.106, 4.95],
      [0.122, 4.96],
      [0.122, 5.05],
      [0.082, 5.06],
      [0.082, 6.82],
      [0.01, 6.82],
    ];
    const mastPole = lathe(mastPoleProfile, 28).clone();
    mastPole.rotateZ(Math.PI / 2);

    const trussParts: THREE.BufferGeometry[] = [];
    const R = 0.34;
    const y0 = 0.24;
    const y1 = 4.90;
    const bays = 7;
    const bayH = (y1 - y0) / bays;
    const angles = [0, (Math.PI * 2) / 3, (Math.PI * 4) / 3];

    for (const a of angles) {
      const leg = new THREE.CylinderGeometry(0.022, 0.022, y1 - y0, 8);
      leg.applyMatrix4(mat4([Math.cos(a) * R, (y0 + y1) / 2, Math.sin(a) * R]));
      trussParts.push(leg);
    }

    for (let b = 0; b <= bays; b++) {
      const y = y0 + b * bayH;
      for (let k = 0; k < 3; k++) {
        const a0 = angles[k];
        const a1 = angles[(k + 1) % 3];
        const p0 = new THREE.Vector3(Math.cos(a0) * R, y, Math.sin(a0) * R);
        const p1 = new THREE.Vector3(Math.cos(a1) * R, y, Math.sin(a1) * R);
        const mid = p0.clone().add(p1).multiplyScalar(0.5);
        const len = p0.distanceTo(p1);
        const yawBar = Math.atan2(-(p1.z - p0.z), p1.x - p0.x);
        const hBar = new THREE.BoxGeometry(len, 0.026, 0.026);
        hBar.applyMatrix4(mat4([mid.x, mid.y, mid.z], [0, yawBar, 0]));
        trussParts.push(hBar);

        if (b < bays) {
          const pTop = new THREE.Vector3(Math.cos(a1) * R, y + bayH, Math.sin(a1) * R);
          const dMid = p0.clone().add(pTop).multiplyScalar(0.5);
          const dLen = p0.distanceTo(pTop);
          const dxz = Math.hypot(pTop.x - p0.x, pTop.z - p0.z);
          const pitchBar = Math.atan2(bayH, dxz);
          const dBar = new THREE.BoxGeometry(dLen, 0.02, 0.02);
          dBar.applyMatrix4(mat4([dMid.x, dMid.y, dMid.z], [0, yawBar, pitchBar]));
          trussParts.push(dBar);
        }
      }
    }
    const lattice = merge(trussParts);

    const guyWires = angles.map((a) =>
      pipe(
        [
          [Math.cos(a) * 0.36, 4.82, Math.sin(a) * 0.36],
          [Math.cos(a) * 0.92, 2.45, Math.sin(a) * 0.92],
          [Math.cos(a) * 1.48, 0.08, Math.sin(a) * 1.48],
        ],
        0.011,
        16,
      ),
    );

    const radomeProf: P2[] = [[0.01, 0]];
    const domeSamples = 18;
    for (let i = 0; i <= domeSamples; i++) {
      const s = i / domeSamples;
      let r = 0.275;
      if (s < 0.12) {
        r = 0.16 + (s / 0.12) * 0.115;
      } else if (s > 0.62) {
        const u = (s - 0.62) / 0.38;
        r = 0.275 * Math.sqrt(Math.max(0.002, 1 - u * u));
      }
      radomeProf.push([r, s * 0.98]);
    }
    radomeProf.push([0.005, 0.985]);
    const omniRadome = lathe(radomeProf, 32).clone();
    omniRadome.rotateZ(Math.PI / 2);

    const rfCoax = pipe(
      [
        [-0.45, 1.42, 0.22],
        [-0.22, 1.85, 0.24],
        [-0.16, 3.40, 0.18],
        [-0.13, 5.20, 0.12],
      ],
      0.022,
      24,
    );

    const helixPts: [number, number, number][] = [];
    const turns = 5.5;
    const hSteps = 44;
    for (let i = 0; i <= hSteps; i++) {
      const u = i / hSteps;
      const ang = u * turns * Math.PI * 2;
      helixPts.push([0.08 + u * 0.66, Math.sin(ang) * 0.088, Math.cos(ang) * 0.088]);
    }
    const helicalCoil = pipe(helixPts, 0.0085, 48);

    const helicalCore = lathe(
      [
        [0.01, 0.04],
        [0.072, 0.04],
        [0.072, 0.74],
        [0.052, 0.78],
        [0.005, 0.79],
      ],
      22,
    );

    const yagiFeedLoop = pipe(
      [
        [-0.18, 0, 0],
        [-0.24, -0.09, 0],
        [-0.10, -0.13, 0],
        [0.02, -0.03, 0],
      ],
      0.01,
      14,
    );

    return {
      mastPole,
      lattice,
      guyWires,
      omniRadome,
      rfCoax,
      helicalCoil,
      helicalCore,
      yagiFeedLoop,
    };
  }, []);

  const palletMat = useMemo(
    () =>
      paint({
        color: PAL3D.craneSteel,
        camo: ['#45515d', '#627180'],
        camoScale: 4,
        repeat: 0.7,
        dirt: 0.32,
        wear: 0.24,
        roughness: 0.58,
        metalness: 0.35,
        seed: 91,
      }),
    [],
  );

  const shelterMat = useMemo(
    () =>
      paint({
        color: PAL3D.lidsTan,
        camo: PAL3D.lidsCamo,
        camoScale: 4,
        repeat: 0.85,
        dirt: 0.28,
        wear: 0.16,
        roughness: 0.68,
        metalness: 0.18,
        seed: 93,
      }),
    [],
  );

  const radomeMat = useMemo(
    () =>
      paint({
        color: '#b8c3ce',
        camo: ['#a6b2be', '#cad4de'],
        camoScale: 3,
        repeat: 0.9,
        dirt: 0.16,
        wear: 0.1,
        roughness: 0.42,
        metalness: 0.12,
        seed: 95,
      }),
    [],
  );

  const panelFaceMat = useMemo(
    () =>
      paint({
        color: PAL3D.kurfsPanel,
        camo: ['#364452', '#4f6072'],
        camoScale: 5,
        repeat: 1.0,
        dirt: 0.12,
        wear: 0.14,
        roughness: 0.44,
        metalness: 0.28,
        seed: 97,
      }),
    [],
  );

  const darkAlloy = plain('#262d35', 0.52, 0.42);
  const brightAlloy = plain('#9aa7b4', 0.34, 0.68);
  const copperMat = plain('#d48d4c', 0.3, 0.78);

  const beaconIntensity = 0.6 + activePower * (1.2 + 0.7 * pulse);
  const tealGlowMat = useMemo(
    () =>
      plain(PAL2D.ewTeal, 0.2, 0.05, {
        emissive: new THREE.Color(PAL2D.ewTeal),
        emissiveIntensity: beaconIntensity,
      }),
    [beaconIntensity],
  );

  const yagiElements = [
    { x: -0.44, len: 0.88, r: 0.012 },
    { x: -0.22, len: 0.78, r: 0.016 },
    { x: 0.0, len: 0.68, r: 0.011 },
    { x: 0.21, len: 0.64, r: 0.011 },
    { x: 0.42, len: 0.60, r: 0.011 },
    { x: 0.63, len: 0.56, r: 0.011 },
    { x: 0.84, len: 0.51, r: 0.011 },
  ];

  return (
    <group position={EW_MAST_POS}>
      {/* 1. Pallet khung thép dã chiến + 4 chân đế chống lún */}
      <mesh geometry={rbox(2.05, 0.22, 1.80, 0.024)} position={[0, 0.11, 0]} material={palletMat} castShadow receiveShadow />
      {([-0.94, 0.94] as const).map((ox) =>
        ([-0.82, 0.82] as const).map((oz) => (
          <group key={`${ox}_${oz}`} position={[ox, 0, oz]}>
            <mesh position={[0, 0.03, 0]} material={darkAlloy}>
              <cylinderGeometry args={[0.14, 0.16, 0.06, 14]} />
            </mesh>
            <mesh position={[0, 0.16, 0]} material={brightAlloy}>
              <cylinderGeometry args={[0.032, 0.032, 0.24, 10]} />
            </mesh>
          </group>
        )),
      )}

      {/* 2. Tủ khuếch đại công suất cao tần RF bên cạnh chân cột */}
      <group position={[-0.46, 0.84, 0.18]}>
        <mesh geometry={rbox(0.96, 1.24, 0.86, 0.028)} material={shelterMat} castShadow receiveShadow />
        <mesh geometry={rbox(1.02, 0.045, 0.92, 0.01)} position={[0, 0.63, 0]} material={palletMat} castShadow />
        {[-0.32, -0.22, -0.12, -0.02, 0.08, 0.18, 0.28].map((fx, i) => (
          <mesh
            key={i}
            geometry={rbox(0.026, 0.82, 0.045, 0.004)}
            position={[fx, -0.04, 0.44]}
            material={darkAlloy}
          />
        ))}
        {[-0.18, -0.06, 0.06, 0.18].map((lx, i) => (
          <mesh
            key={i}
            geometry={rbox(0.065, 0.032, 0.02, 0.004)}
            position={[lx, 0.48, 0.435]}
            material={tealGlowMat}
          />
        ))}
      </group>
      <mesh geometry={geos.rfCoax} material={darkAlloy} castShadow />

      {/* 3. Trụ ống lồng tâm, giàn tháp 3 cạnh & 3 dây chằng neo đất */}
      <mesh geometry={geos.mastPole} material={palletMat} castShadow receiveShadow />
      <mesh geometry={geos.lattice} material={palletMat} castShadow receiveShadow />
      {geos.guyWires.map((gw, idx) => (
        <React.Fragment key={idx}>
          <mesh geometry={gw} material={darkAlloy} />
          <mesh
            position={[
              Math.cos((idx * Math.PI * 2) / 3) * 1.48,
              0.08,
              Math.sin((idx * Math.PI * 2) / 3) * 1.48,
            ]}
            material={palletMat}
          >
            <cylinderGeometry args={[0.055, 0.07, 0.18, 10]} />
          </mesh>
        </React.Fragment>
      ))}

      {/* 4. Vòm Radome đa hướng chế áp GNSS tại y = 5.34 m */}
      <group position={[0, 5.34, 0]}>
        <mesh geometry={rbox(0.68, 0.06, 0.68, 0.012)} position={[0, -0.03, 0]} material={palletMat} castShadow />
        <mesh geometry={geos.omniRadome} material={radomeMat} castShadow receiveShadow />
        <mesh position={[0, 0.14, 0]} material={darkAlloy}>
          <cylinderGeometry args={[0.282, 0.282, 0.05, 28]} />
        </mesh>
        <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2, 0, 0]} material={tealGlowMat}>
          <torusGeometry args={[0.278, 0.015, 8, 32]} />
        </mesh>
      </group>

      {/* 5. Đỉnh tháp (y = 7.05 m): Bàn xoay Gimbal gắn 2 Panel Mảng Pha + 2 Giàn Yagi Định Hướng + 1 Helical */}
      <group position={[0, EW_GIMBAL_HEIGHT, 0]} rotation={[0, yaw, 0]}>
        <mesh position={[0, -0.16, 0]} material={darkAlloy} castShadow>
          <cylinderGeometry args={[0.14, 0.16, 0.24, 20]} />
        </mesh>
        <mesh geometry={rbox(0.24, 0.06, 0.56, 0.01)} position={[0, -0.02, 0]} material={palletMat} castShadow />
        <mesh geometry={rbox(0.18, 0.28, 0.06, 0.01)} position={[0, 0.12, -0.25]} material={palletMat} castShadow />
        <mesh geometry={rbox(0.18, 0.28, 0.06, 0.01)} position={[0, 0.12, 0.25]} material={palletMat} castShadow />

        <group position={[0, 0.16, 0]} rotation={[0, 0, elev]}>
          <mesh geometry={rbox(0.12, 0.12, 1.46, 0.015)} material={palletMat} castShadow />

          {([-0.24, 0.24] as const).map((pz) => (
            <group key={pz} position={[0.12, 0, pz]}>
              <mesh geometry={rbox(0.11, 0.78, 0.38, 0.02)} material={radomeMat} castShadow receiveShadow />
              <mesh geometry={rbox(0.03, 0.70, 0.31, 0.01)} position={[0.052, 0, 0]} material={panelFaceMat} />
              <mesh geometry={rbox(0.015, 0.56, 0.022, 0.004)} position={[0.064, 0, 0]} material={tealGlowMat} />
            </group>
          ))}

          <group position={[-0.08, 0.52, 0]}>
            <mesh position={[0.04, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={palletMat} castShadow>
              <cylinderGeometry args={[0.145, 0.145, 0.04, 22]} />
            </mesh>
            <mesh geometry={geos.helicalCore} material={radomeMat} castShadow />
            <mesh geometry={geos.helicalCoil} material={copperMat} castShadow />
          </group>

          {([-0.68, 0.68] as const).map((yz) => (
            <group key={yz} position={[0.24, 0, yz]}>
              <mesh geometry={rbox(1.46, 0.042, 0.042, 0.006)} position={[0.20, 0, 0]} material={brightAlloy} castShadow />
              <mesh geometry={rbox(0.12, 0.085, 0.085, 0.01)} position={[-0.22, -0.03, 0]} material={darkAlloy} />
              <mesh geometry={geos.yagiFeedLoop} material={darkAlloy} />
              {yagiElements.map((el, ei) => (
                <mesh
                  key={ei}
                  position={[el.x, 0, 0]}
                  material={ei === 1 ? tealGlowMat : brightAlloy}
                  castShadow
                >
                  <cylinderGeometry args={[el.r, el.r, el.len, 10]} />
                </mesh>
              ))}
            </group>
          ))}
        </group>
      </group>

      <pointLight
        color={PAL2D.ewTeal}
        intensity={4.5 * activePower * (0.75 + 0.25 * pulse)}
        distance={13}
        decay={1.7}
        position={[0.4, EW_GIMBAL_HEIGHT + 0.4, 0]}
      />
    </group>
  );
};

// ============================================================================
// 2. VÒM SÓNG VÔ TUYẾN CHẾ ÁP MỀM (EW WAVE FIELD)
//    Dùng các vành torusGeometry thanh mảnh + toneMapped={true} để sắc xanh ngọc
//    PAL2D.ewTeal rõ nét trên nền trời đêm rạng sáng, TUYỆT ĐỐI KHÔNG LÓA TRẮNG.
// ============================================================================

const EwWaveField: React.FC<{ t: number; yaw: number; elev: number; power: number }> = ({
  t,
  yaw,
  elev,
  power,
}) => {
  if (power <= 0.01) return null;

  const dirWaves = Array.from({ length: 7 }, (_, i) => {
    const phase = (((t - 172.0) * 0.58 + i / 7) % 1 + 1) % 1;
    const dist = 0.85 + phase * 18.0;
    const radius = 0.46 + dist * 0.34;
    const env = Math.sin(Math.min(1, phase * 3.2) * (Math.PI / 2)) * Math.pow(1 - phase, 0.78);
    return { dist, radius, op: env * 0.58 * power };
  });

  const omniArcs = Array.from({ length: 4 }, (_, i) => {
    const phase = (((t - 172.2) * 0.42 + i / 4) % 1 + 1) % 1;
    const radius = 0.9 + phase * 13.5;
    const env = Math.sin(Math.min(1, phase * 3.0) * (Math.PI / 2)) * Math.pow(1 - phase, 0.85);
    return { radius, op: env * 0.36 * power };
  });

  return (
    <group position={EW_MAST_POS}>
      <group position={[0, EW_GIMBAL_HEIGHT + 0.16, 0]} rotation={[0, yaw, 0]}>
        <group rotation={[0, 0, elev]}>
          {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ang, idx) => (
            <group key={idx} rotation={[ang, 0, 0]}>
              <mesh position={[9.2, 3.45, 0]} rotation={[0, 0, Math.atan2(3.1, 9.0) - Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.018, 18.8, 6]} />
                <meshBasicMaterial color={PAL2D.ewTealLo} transparent opacity={0.18 * power} toneMapped />
              </mesh>
            </group>
          ))}

          {dirWaves.map((w, idx) => (
            <group key={idx} position={[w.dist, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <mesh>
                <torusGeometry args={[w.radius, 0.044, 10, 56]} />
                <meshBasicMaterial color={PAL2D.ewTeal} transparent opacity={w.op} toneMapped />
              </mesh>
              <mesh position={[0, 0, -0.14]}>
                <torusGeometry args={[w.radius * 0.96, 0.022, 8, 48]} />
                <meshBasicMaterial color="#7ef9eb" transparent opacity={w.op * 0.65} toneMapped />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      <group position={[0, 5.80, 0]}>
        {omniArcs.map((a, idx) => (
          <group key={idx} rotation={[0, idx * 0.45 + t * 0.12, 0]}>
            <mesh>
              <torusGeometry args={[a.radius, 0.032, 8, 52, Math.PI]} />
              <meshBasicMaterial color={PAL2D.ewTeal} transparent opacity={a.op} toneMapped />
            </mesh>
            <mesh rotation={[0, Math.PI / 2, 0]}>
              <torusGeometry args={[a.radius, 0.028, 8, 52, Math.PI]} />
              <meshBasicMaterial color={PAL2D.ewTealLo} transparent opacity={a.op * 0.8} toneMapped />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

// ============================================================================
// 3. FLYCAM 4 CÁNH DÂN DỤNG (CIVIL QUADCOPTER) & TIA LIÊN LẠC ĐIỀU KHIỂN
// ============================================================================

const CivilQuadcopter: React.FC<{
  pos: V3;
  rot: V3;
  propSpin: number;
  jammed: boolean;
  jamAge: number;
  t: number;
}> = ({ pos, rot, propSpin, jammed, jamAge, t }) => {
  const skidsGeo = useMemo(() => {
    const leftLeg = pipe(
      [
        [-0.12, -0.03, -0.11],
        [-0.14, -0.18, -0.16],
        [0.14, -0.18, -0.16],
        [0.12, -0.03, -0.11],
      ],
      0.011,
      20,
    );
    const rightLeg = pipe(
      [
        [-0.12, -0.03, 0.11],
        [-0.14, -0.18, 0.16],
        [0.14, -0.18, 0.16],
        [0.12, -0.03, 0.11],
      ],
      0.011,
      20,
    );
    return { leftLeg, rightLeg };
  }, []);

  const shellMat = plain('#e4ebf2', 0.36, 0.12);
  const carbonMat = plain('#262d36', 0.48, 0.32);
  const rotorMat = plain('#1b2026', 0.42, 0.2);

  const fastBlink = Math.sin(t * (jammed ? 28 : 9)) > -0.15;
  const frontLedCol = jammed ? '#ff3b30' : '#28f088';
  const rearLedCol = jammed ? '#ff9500' : '#ff3b30';

  const arms: { ax: number; az: number; front: boolean; dir: 1 | -1 }[] = [
    { ax: 0.36, az: -0.36, front: true, dir: 1 },
    { ax: 0.36, az: 0.36, front: true, dir: -1 },
    { ax: -0.36, az: -0.36, front: false, dir: -1 },
    { ax: -0.36, az: 0.36, front: false, dir: 1 },
  ];

  return (
    <group position={pos} rotation={rot}>
      <mesh geometry={rbox(0.38, 0.115, 0.22, 0.036)} material={shellMat} castShadow />
      <mesh geometry={rbox(0.25, 0.046, 0.155, 0.015)} position={[-0.02, 0.068, 0]} material={carbonMat} />
      <mesh position={[0.15, -0.08, 0]} material={carbonMat}>
        <sphereGeometry args={[0.05, 16, 12]} />
      </mesh>
      <mesh geometry={skidsGeo.leftLeg} material={carbonMat} />
      <mesh geometry={skidsGeo.rightLeg} material={carbonMat} />

      {arms.map((arm, idx) => {
        const yawArm = Math.atan2(-arm.az, arm.ax);
        const armLen = Math.hypot(arm.ax, arm.az);
        const ledColor = arm.front ? frontLedCol : rearLedCol;
        const motorSpin = propSpin * arm.dir * (jammed && idx % 2 === 1 ? 0.38 : 1.0) + idx * 0.8;
        return (
          <React.Fragment key={idx}>
            <mesh
              geometry={rbox(armLen, 0.03, 0.036, 0.008)}
              position={[arm.ax * 0.5, 0.01, arm.az * 0.5]}
              rotation={[0, yawArm, 0]}
              material={shellMat}
              castShadow
            />
            <group position={[arm.ax, 0.032, arm.az]}>
              <mesh material={carbonMat}>
                <cylinderGeometry args={[0.038, 0.038, 0.05, 14]} />
              </mesh>
              <group position={[0, 0.034, 0]} rotation={[0, motorSpin, 0]}>
                <mesh geometry={rbox(0.38, 0.006, 0.036, 0.003)} material={rotorMat} />
              </group>
              <mesh position={[0, 0.034, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.042, 0.19, 24]} />
                <meshBasicMaterial color="#cfd8e3" transparent opacity={0.19} side={THREE.DoubleSide} toneMapped />
              </mesh>
              <mesh position={[0, -0.036, 0]}>
                <sphereGeometry args={[0.026, 10, 8]} />
                <meshBasicMaterial
                  color={ledColor}
                  transparent
                  opacity={fastBlink ? 0.96 : 0.24}
                  toneMapped={false}
                />
              </mesh>
            </group>
          </React.Fragment>
        );
      })}

      {/* Vòng xung cắt đứt liên lạc bùng quanh thân flycam ngay khoảnh khắc 183.20s */}
      {jammed && jamAge < 1.55 && (
        <group>
          <mesh rotation={[0.5 + jamAge * 2, jamAge * 3, 0.3]}>
            <torusGeometry args={[0.45 + jamAge * 0.48, 0.022, 8, 36]} />
            <meshBasicMaterial
              color={PAL2D.ewTeal}
              transparent
              opacity={Math.max(0, 1 - jamAge / 1.55) * 0.78}
              toneMapped
            />
          </mesh>
          <mesh rotation={[-0.7, jamAge * 2.2, 0.8]}>
            <torusGeometry args={[0.36 + jamAge * 0.38, 0.018, 8, 32]} />
            <meshBasicMaterial
              color={PAL2D.threatMid}
              transparent
              opacity={Math.max(0, 1 - jamAge / 1.35) * 0.76}
              toneMapped
            />
          </mesh>
        </group>
      )}
    </group>
  );
};

/** Tia sóng điều khiển nét đứt hướng từ mặt đất lên Flycam (bị cắt đứt gãy vụn lúc 183.20s). */
const RcControlLinkBeam: React.FC<{ dronePos: V3; t: number; jamP: number }> = ({ dronePos, t, jamP }) => {
  if (jamP >= 0.98) return null;
  const origin: V3 = [6.4, 1.1, 4.4];
  const dirVec = new THREE.Vector3(
    dronePos[0] - origin[0],
    dronePos[1] - 0.14 - origin[1],
    dronePos[2] - origin[2],
  ).normalize();
  const baseQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirVec);
  const segments = 10;

  return (
    <group>
      {Array.from({ length: segments }, (_, i) => {
        const u0 = (i + (((t * 2.2) % 1) * 0.8)) / segments;
        if (u0 < 0.06 || u0 > 0.95) return null;
        const scatter = jamP * 0.85;
        const jx = Math.sin(i * 17.3 + t * 20) * scatter;
        const jy = Math.cos(i * 11.7 + t * 18) * scatter;
        const jz = Math.sin(i * 23.1 - t * 16) * scatter;

        const px = lerp(origin[0], dronePos[0], u0) + jx;
        const py = lerp(origin[1], dronePos[1] - 0.14, u0) + jy;
        const pz = lerp(origin[2], dronePos[2], u0) + jz;

        const col = jamP > 0.12 ? PAL2D.threatMid : PAL2D.amberHi;
        const op = (1 - jamP) * 0.82;
        return (
          <mesh key={i} position={[px, py, pz]} quaternion={baseQuat}>
            <cylinderGeometry args={[0.022, 0.022, 0.28, 8]} />
            <meshBasicMaterial color={col} transparent opacity={op} toneMapped />
          </mesh>
        );
      })}
    </group>
  );
};

// ============================================================================
// 4. CẢNH CHÍNH S09
// ============================================================================

const S09: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Công suất phát sóng của trạm EW: mở vòm tối đa từ CUE.s09_ew_pulse (174.50s)
  const ewRamp = prog(t, CUE.s09_ew_pulse - 0.35, CUE.s09_ew_pulse + 1.15, Easing.out(Easing.cubic));
  const ewPower = 0.25 + 0.75 * ewRamp;
  const ewPulse = 0.5 + 0.5 * Math.sin((t - CUE.s09_ew_pulse) * 5.4);

  const mastYaw = -0.18 + Math.sin(t * 0.42) * 0.11;
  const mastElev = 0.44;

  // Quỹ đạo Flycam 4 cánh dân dụng ở tầm gần (tiến vào từ 179.0s, bị cắt liên lạc lúc 183.20s)
  const showFlycam = t >= 179.0;
  const flyApproachP = prog(t, 179.0, CUE.s09_flycam_jam, Easing.out(Easing.quad));
  const isJammed = t >= CUE.s09_flycam_jam;
  const jamAge = Math.max(0, t - CUE.s09_flycam_jam);
  const jamFadeP = prog(t, CUE.s09_flycam_jam, CUE.s09_flycam_jam + 0.95);

  const hoverX = lerp(5.5, 2.25, flyApproachP) + Math.sin(t * 1.9) * 0.08;
  const hoverY = lerp(5.1, 6.05, flyApproachP) + Math.cos(t * 2.3) * 0.07;
  const hoverZ = lerp(3.4, 2.35, flyApproachP);

  // Sau 183.20s: chao nghiêng lắc mạnh và tụt hẫng độ cao (giữ còn thấy ở góc dưới khung hình tới cuối cảnh)
  const dropY = isJammed ? Math.min(2.85, 0.58 * jamAge + 0.09 * jamAge * jamAge) : 0;
  const driftX = isJammed ? Math.sin(jamAge * 5.2) * 0.28 + jamAge * 0.26 : 0;
  const driftZ = isJammed ? Math.cos(jamAge * 4.4) * 0.2 : 0;

  const flyPos: V3 = [hoverX + driftX, hoverY - dropY, hoverZ + driftZ];
  const flyRot: V3 = isJammed
    ? [
        Math.sin(jamAge * 9.2) * 0.56 + 0.44,
        -2.5 + jamAge * 1.85,
        Math.cos(jamAge * 7.8) * 0.48 - 0.36,
      ]
    : [0.05 * Math.sin(t * 2.4), -2.55, -0.08];

  // Quỹ đạo UAV cảm tử quân sự Shahed-136 ở tầng cao hơn (y = 11.25 m — tách thoáng khỏi đỉnh Yagi, không cắt rìa phải ở 187.1s)
  const showShahed = t >= 181.6;
  const shahedSpeed = 3.25; // m/s
  const shahedX = 0.85 + (t - CUE.s09_shahed_pass) * shahedSpeed;
  const shahedPos: V3 = [shahedX, 11.25, -1.85];

  const passWaveOp =
    prog(t, CUE.s09_shahed_pass - 1.2, CUE.s09_shahed_pass - 0.2) *
    (1 - prog(t, CUE.s09_shahed_pass + 1.0, CUE.s09_shahed_pass + 2.2));

  // Chuyển động Camera 3D: đặt thấp y ≈ 2.18 m cạnh công sự HescoWall, ngước chéo lên bầu trời đêm rạng sáng
  const camP1 = prog(t, 172.62, 181.0, Easing.inOut(Easing.sin));
  const camP2 = prog(t, 181.0, 186.8, Easing.inOut(Easing.cubic));

  const camPos: V3 = [
    lerp(lerp(-0.85, 0.85, camP1), 1.35, camP2),
    lerp(lerp(2.24, 2.16, camP1), 2.10, camP2),
    lerp(lerp(8.6, 9.4, camP1), 10.1, camP2),
  ];

  const camLook: V3 = [
    lerp(lerp(-1.45, -0.25, camP1), 0.75, camP2),
    lerp(lerp(5.25, 6.35, camP1), 8.20, camP2),
    lerp(lerp(-1.4, -1.7, camP1), -2.1, camP2),
  ];

  return (
    <Stage {...STAGE_PREDAWN} shadowArea={32} shadowCenter={[0, 3, -1]}>
      <Cam pos={camPos} look={camLook} fov={47} />

      <Terrain h={terrainH} size={360} seg={220} colors={TERRAIN_PREDAWN} grainRepeat={44} />
      <Scatter
        kind="rock"
        count={110}
        area={[-85, -95, 85, 45]}
        h={terrainH}
        seed={91}
        scale={[0.35, 0.95]}
        avoid={avoidCompound}
        tint="#6b727c"
      />
      <Scatter
        kind="bush"
        count={42}
        area={[-75, -85, 75, 35]}
        h={terrainH}
        seed={92}
        scale={[0.45, 0.85]}
        avoid={avoidCompound}
        tint="#5c655e"
      />

      {/* Đèn pha vàng natri hắt ấm lên vách rọ đất HESCO & nhà ngủ CHU trong giờ xanh 05:30 sáng */}
      <pointLight
        color={PAL3D.sodiumLamp}
        intensity={13}
        distance={20}
        decay={1.6}
        position={[4.6, 3.4, -1.5]}
      />
      <pointLight
        color={PAL3D.sodiumLamp}
        intensity={9}
        distance={16}
        decay={1.7}
        position={[-6.8, 3.2, -3.5]}
      />

      {/* Công sự rọ đất HescoWall mở lối nhìn thoáng ở giữa để lộ rõ cửa sổ sáng đèn ấm của ChuContainer */}
      <group position={[-4.25, 0, 2.85]} rotation={[0, 0.28, 0]}>
        <HescoWall cells={3} seed={31} />
      </group>
      <group position={[5.65, 0, 2.25]} rotation={[0, -0.58, 0]}>
        <HescoWall cells={3} seed={37} />
      </group>
      <group position={[-7.2, 0, -2.2]} rotation={[0, 1.15, 0]}>
        <HescoWall cells={4} seed={43} />
      </group>

      {/* Dãy nhà ngủ container CHU sáng đèn ấm (lộ rõ cửa sổ chớp & đèn hiên vàng ấm qua khe công sự) & T-Wall */}
      <group position={[3.8, 0, -5.2]} rotation={[0, -0.34, 0]}>
        <ChuContainer warmLight seed={15} />
      </group>
      <group position={[-9.8, 0, -7.2]} rotation={[0, 0.36, 0]}>
        <ChuContainer warmLight seed={21} />
      </group>
      <group position={[5.6, 0, -9.2]} rotation={[0, -0.34, 0]}>
        <TWall count={5} seed={51} />
      </group>
      <group position={[-11.4, 0, -11.0]} rotation={[0, 0.36, 0]}>
        <TWall count={5} seed={57} />
      </group>

      {/* Cột tháp tác chiến điện tử chế áp mềm & Vòm sóng vô tuyến xanh ngọc PAL2D.ewTeal */}
      <EwJammerMast yaw={mastYaw} elev={mastElev} activePower={ewPower} pulse={ewPulse} />
      <EwWaveField t={t} yaw={mastYaw} elev={mastElev} power={ewPower} />

      {/* Tầm gần: Flycam 4 cánh dân dụng bị sóng EW cắt đứt tia liên lạc, chao nghiêng tụt xuống */}
      {showFlycam && (
        <>
          <RcControlLinkBeam dronePos={flyPos} t={t} jamP={jamFadeP} />
          <CivilQuadcopter
            pos={flyPos}
            rot={flyRot}
            propSpin={t * 52}
            jammed={isJammed}
            jamAge={jamAge}
            t={t}
          />
        </>
      )}

      {/* Tầng cao hơn: Shahed-136 lầm lũi bay thẳng băng xuyên qua các vòng sóng xanh không mảy may suy suyển */}
      {showShahed && (
        <group position={shahedPos} rotation={[0, -0.08, 0]}>
          <Shahed136 propSpin={t * 38} pitch={-0.015} bank={0} />
          {passWaveOp > 0.01 && (
            <group position={[0.45, 0.55, 0]} rotation={[0, Math.PI / 2, 0]}>
              <mesh>
                <torusGeometry args={[1.58, 0.03, 8, 44]} />
                <meshBasicMaterial color={PAL2D.ewTeal} transparent opacity={passWaveOp * 0.52} toneMapped />
              </mesh>
            </group>
          )}
        </group>
      )}
    </Stage>
  );
};

export default S09;
