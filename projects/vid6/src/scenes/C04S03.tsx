import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { pipe, rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import PowerpackChassis3D from '../parts/PowerpackChassis3D';

const linear = (x: number) => x;

/** Tích phân vận tốc góc liên tục để cánh nén Titanium không bao giờ giật lùi pha khi tăng tốc ở 1,500 HP. */
function calcTurbineSpin(t: number): number {
  const dt = Math.max(0, t - 520.8);
  const baseOmega = 7.5;
  const boostOmega = 25.0;
  const tBoost = CUE.c04_s03_hp - 0.25;
  const ramp = 1.4;
  const u = Math.max(0, t - tBoost);
  const extra =
    u <= 0
      ? 0
      : u < ramp
        ? 0.5 * boostOmega * ((u * u) / ramp)
        : 0.5 * boostOmega * ramp + boostOmega * (u - ramp);
  return dt * baseOmega + extra;
}

// Chu kỳ van giật xung khí nén tự làm sạch lọc khí M1A2 từ đúng CUE.c04_s03_pulsejet (550.70s)
const PULSE_TRIGGERS = [
  CUE.c04_s03_pulsejet,
  CUE.c04_s03_pulsejet + 1.3,
  CUE.c04_s03_pulsejet + 2.6,
  CUE.c04_s03_pulsejet + 3.9,
  CUE.c04_s03_pulsejet + 4.8,
] as const;

function calcAirPulse(t: number): number {
  if (t < CUE.c04_s03_pulsejet) return 0;
  let best = 0;
  for (const trig of PULSE_TRIGGERS) {
    const dt = t - trig;
    if (dt >= 0 && dt < 1.15) {
      const p = dt < 0.12 ? (dt / 0.12) * 0.32 : 0.32 * (1 - (dt - 0.12) / 1.03);
      best = Math.max(best, Math.max(0, p));
    }
  }
  return best;
}

/** Khoang thử nghiệm động cơ thép tối (Test Cell Pedestal & Gantry) — mặt bệ y=0.04 m khớp khít đế thép AGT1500. */
const EngineTestBay: React.FC<{ glow: number; whisperAmt: number }> = ({ glow, whisperAmt }) => {
  const floorMat = useMemo(() => plain('#17202a', 0.72, 0.42), []);
  const trenchMat = useMemo(() => plain('#0e141c', 0.85, 0.25), []);
  const turntableMat = useMemo(() => plain('#25313f', 0.46, 0.72), []);
  const rimSteelMat = useMemo(() => plain('#4e6073', 0.34, 0.82), []);
  const hazardMat = useMemo(() => plain('#d99b26', 0.48, 0.25), []);
  const pillarMat = useMemo(() => plain('#1c2632', 0.6, 0.58), []);
  const cyanStripMat = useMemo(
    () =>
      plain('#29e3d4', 0.2, 0.1, {
        emissive: new THREE.Color('#1cd4c5'),
        emissiveIntensity: 0.7 + whisperAmt * 1.1,
      }),
    [whisperAmt]
  );
  const amberStripMat = useMemo(
    () =>
      plain('#ffaa2b', 0.2, 0.1, {
        emissive: new THREE.Color('#ff881a'),
        emissiveIntensity: 0.45 + glow * 1.25,
      }),
    [glow]
  );

  const pedPlatformGeo = useMemo(() => rbox(2.65, 0.08, 1.72, 0.02), []);
  const gantryPillarGeo = useMemo(() => rbox(0.42, 5.4, 0.42, 0.03), []);
  const floorRailGeo = useMemo(() => rbox(16, 0.015, 0.08, 0.004), []);

  const degreeTicks = useMemo(
    () =>
      Array.from({ length: 24 }, (_, i) => {
        const a = (i / 24) * Math.PI * 2;
        return { a, major: i % 3 === 0 };
      }),
    []
  );

  const pillars = useMemo(
    () =>
      Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2 + 0.38;
        return {
          x: Math.cos(a) * 8.4,
          z: Math.sin(a) * 8.4,
          rotY: -a,
          isAmber: i % 2 === 1,
        };
      }),
    []
  );

  return (
    <group>
      <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={floorMat} receiveShadow>
        <circleGeometry args={[26, 64]} />
      </mesh>
      <mesh position={[0, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} material={trenchMat} receiveShadow>
        <ringGeometry args={[2.32, 2.68, 64]} />
      </mesh>
      {[-2.8, 2.8].map((rz, idx) => (
        <mesh key={idx} position={[0, 0.002, rz]} geometry={floorRailGeo} material={rimSteelMat} receiveShadow />
      ))}
      {[-3.2, 3.2].map((rx, idx) => (
        <mesh
          key={`x${idx}`}
          position={[rx, 0.002, 0]}
          rotation={[0, Math.PI / 2, 0]}
          geometry={floorRailGeo}
          material={rimSteelMat}
          receiveShadow
        />
      ))}

      <mesh position={[0.04, 0.0, 0]} material={turntableMat} receiveShadow>
        <cylinderGeometry args={[2.18, 2.26, 0.06, 56]} />
      </mesh>
      <mesh position={[0.08, 0.0, 0]} geometry={pedPlatformGeo} material={rimSteelMat} receiveShadow castShadow />
      <mesh position={[0.04, 0.032, 0]} rotation={[-Math.PI / 2, 0, 0]} material={hazardMat}>
        <ringGeometry args={[2.06, 2.15, 56]} />
      </mesh>

      {degreeTicks.map((tk, i) => (
        <mesh
          key={i}
          position={[0.04 + Math.cos(tk.a) * 1.94, 0.035, Math.sin(tk.a) * 1.94]}
          rotation={[0, -tk.a, 0]}
          material={tk.major ? hazardMat : rimSteelMat}
        >
          <boxGeometry args={[tk.major ? 0.16 : 0.09, 0.01, tk.major ? 0.032 : 0.018]} />
        </mesh>
      ))}

      {pillars.map((p, idx) => (
        <group key={idx} position={[p.x, 2.65, p.z]} rotation={[0, p.rotY, 0]}>
          <mesh geometry={gantryPillarGeo} material={pillarMat} />
          <mesh position={[-0.22, -0.3, 0]} material={p.isAmber ? amberStripMat : cyanStripMat}>
            <boxGeometry args={[0.03, 2.8, 0.06]} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 5.1, 0]} rotation={[Math.PI / 2, 0, 0]} material={pillarMat}>
        <torusGeometry args={[8.4, 0.18, 10, 48]} />
      </mesh>
    </group>
  );
};

/** Dòng nhiên liệu đa năng JP-8 chạy dọc cụm ống dẫn trên thân tuabin (kích hoạt quanh c04_s03_jp8 @ 544.72s). */
const Jp8FuelFlowHighlight: React.FC<{ t: number }> = ({ t }) => {
  const active =
    prog(t, CUE.c04_s03_jp8 - 0.35, CUE.c04_s03_jp8 + 0.35) *
    (1 - prog(t, CUE.c04_s03_pulsejet - 0.5, CUE.c04_s03_pulsejet + 0.15));
  const curve = useMemo(
    () =>
      new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.14, 0.37, 0.34),
        new THREE.Vector3(0.13, 0.41, 0.36),
        new THREE.Vector3(0.36, 0.57, 0.34),
        new THREE.Vector3(0.42, 0.78, 0.24),
        new THREE.Vector3(0.42, 0.87, 0.0),
      ]),
    []
  );
  const tubeGeo = useMemo(() => new THREE.TubeGeometry(curve, 36, 0.022, 10, false), [curve]);

  if (active <= 0.01) return null;

  return (
    <group>
      <mesh geometry={tubeGeo}>
        <meshBasicMaterial color="#ffaa2b" transparent opacity={0.42 * active} toneMapped={false} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const u = (((t - CUE.c04_s03_jp8) * 0.9 + i / 8) % 1 + 1) % 1;
        const pos = curve.getPointAt(u);
        return (
          <mesh key={i} position={[pos.x, pos.y, pos.z]}>
            <sphereGeometry args={[0.026, 10, 10]} />
            <meshBasicMaterial color="#ffe787" transparent opacity={0.95 * active} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/** Vệt xoáy khí sạch ánh cyan hút vào phễu AGT1500 & tầng cánh nén Titanium. */
const IntakeAirflowVortex: React.FC<{ t: number; intensity: number }> = ({ t, intensity }) => {
  const streams = useMemo(
    () =>
      Array.from({ length: 6 }, (_, i) => {
        const a0 = (i / 6) * Math.PI * 2;
        const pts: V3[] = [
          [1.46, 0.64 + Math.cos(a0) * 0.32, Math.sin(a0) * 0.32],
          [1.22, 0.64 + Math.cos(a0 + 0.35) * 0.25, Math.sin(a0 + 0.35) * 0.25],
          [0.98, 0.64 + Math.cos(a0 + 0.7) * 0.18, Math.sin(a0 + 0.7) * 0.18],
          [0.72, 0.64 + Math.cos(a0 + 1.05) * 0.16, Math.sin(a0 + 1.05) * 0.16],
        ];
        return pipe(pts, 0.007, 18);
      }),
    []
  );

  if (intensity <= 0.01) return null;

  return (
    <group>
      {streams.map((g, i) => {
        const pulse = 0.55 + 0.45 * Math.sin(t * 7 + i * 1.1);
        return (
          <mesh key={i} geometry={g}>
            <meshBasicMaterial color="#29e3d4" transparent opacity={0.42 * intensity * pulse} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};

/**
 * Hiệu ứng hộp lọc khí nếp gấp xung phản lực (Pulse-Jet Air Cleaner tại world [0.56, 0.90, +0.78]):
 * - Trước 550.70s: đám hạt cát mịn sa mạc trôi về phía màng lọc nếp gấp.
 * - Từ CUE.c04_s03_pulsejet (550.70s): các đợt xung khí nén bắn giật ngược (+Z) thổi tung hàng trăm hạt cát vàng mịn
 *   kèm mây bụi cát văng ngược ra xa, trong khi khí sạch ánh cyan đi vào tuabin.
 */
const PulseJetSandBlast: React.FC<{ t: number }> = ({ t }) => {
  const preSandAmt =
    prog(t, 548.0, 549.1) * (1 - prog(t, CUE.c04_s03_pulsejet - 0.05, CUE.c04_s03_pulsejet + 0.2));
  const cleanFlowAmt = prog(t, CUE.c04_s03_pulsejet + 0.12, CUE.c04_s03_pulsejet + 0.75);

  const puffTex = useMemo(() => softDot(), []);
  const fineSandMatGold = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#f7c86a',
        toneMapped: false,
      }),
    []
  );
  const fineSandMatBright = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffe8a3',
        toneMapped: false,
      }),
    []
  );

  const cleanAirPipes = useMemo(
    () =>
      [-0.18, 0, 0.18].map((dx) =>
        pipe(
          [
            [0.56 + dx, 0.95, 0.72],
            [0.72 + dx * 0.5, 0.81, 0.44],
            [0.92, 0.66, 0.12],
          ],
          0.01,
          18
        )
      ),
    []
  );

  const nozzleXs = [0.32, 0.48, 0.64, 0.8];

  return (
    <group>
      {/* Màn bụi cát mịn sa mạc trôi về phía màng lọc nếp gấp trước khi van xung phản lực khai hoả */}
      {preSandAmt > 0.01 && (
        <group>
          {Array.from({ length: 85 }, (_, i) => {
            const drift = (((t - 547.8) * 0.65 + rnd(i * 3 + 1)) % 1 + 1) % 1;
            const x = 0.24 + rnd(i * 3 + 2) * 0.64;
            const y = 0.81 + rnd(i * 3 + 3) * 0.25;
            const z = lerp(1.62, 0.96, drift);
            const sz = 0.0045 + rnd(i * 5) * 0.0045;
            return (
              <mesh key={`pre${i}`} position={[x, y, z]} material={i % 3 === 0 ? fineSandMatBright : fineSandMatGold}>
                <icosahedronGeometry args={[sz, 0]} />
              </mesh>
            );
          })}
          {Array.from({ length: 8 }, (_, k) => {
            const drift = (((t - 547.8) * 0.45 + k / 8) % 1 + 1) % 1;
            const x = 0.3 + rnd(k * 7 + 1) * 0.52;
            const y = 0.84 + rnd(k * 7 + 2) * 0.18;
            const z = lerp(1.52, 0.99, drift);
            return (
              <sprite key={`presp${k}`} position={[x, y, z]} scale={[0.26, 0.22, 0.26]}>
                <spriteMaterial
                  map={puffTex}
                  color="#dfb56b"
                  transparent
                  opacity={0.28 * preSandAmt * Math.sin(drift * Math.PI)}
                  depthWrite={false}
                />
              </sprite>
            );
          })}
        </group>
      )}

      {/* Các đợt xung khí nén giật ngược (+Z) thổi tung đám hạt cát sa mạc vàng rực văng ngược khỏi hộp lọc */}
      {PULSE_TRIGGERS.map((trig, bIdx) => {
        const dt = t - trig;
        if (dt < 0 || dt > 1.45) return null;
        const jetFade = Math.max(0, 1 - dt / 0.55);
        const burstEase = 1 - (1 - Math.min(1, dt / 1.25)) ** 2.3;
        const particleFade = Math.max(0, 1 - dt / 1.42);

        return (
          <group key={bIdx}>
            {/* 4 luồng khí nén cao áp trắng-cyan phụt giật ngược từ 4 vòi xả của hộp lọc (+Z) */}
            {jetFade > 0.01 && (
              <>
                <pointLight
                  position={[0.56, 0.94, 1.16]}
                  color="#7cf2e8"
                  intensity={14 * jetFade}
                  distance={3.0}
                  decay={1.6}
                />
                {nozzleXs.map((nx, nIdx) =>
                  [0, 1, 2, 3].map((step) => {
                    const f = step / 3;
                    const zPos = 0.99 + f * (0.34 + (1 - jetFade) * 0.26);
                    const sc = 0.09 + f * 0.16;
                    return (
                      <sprite key={`jet_${nIdx}_${step}`} position={[nx, 0.87, zPos]} scale={[sc, sc, sc]}>
                        <spriteMaterial
                          map={puffTex}
                          color={step === 0 ? '#ffffff' : '#7ef4ff'}
                          transparent
                          opacity={(0.65 - f * 0.38) * jetFade}
                          blending={THREE.AdditiveBlending}
                          depthWrite={false}
                        />
                      </sprite>
                    );
                  })
                )}
              </>
            )}

            {/* 150 hạt cát mịn sa mạc vàng rực văng ngược thành chùm ra ngoài (+Z) */}
            {Array.from({ length: 150 }, (_, i) => {
              const seed = bIdx * 300 + i;
              const x0 = 0.24 + rnd(seed * 3 + 1) * 0.64;
              const y0 = 0.81 + rnd(seed * 3 + 2) * 0.21;
              const vx = (rnd(seed * 3 + 3) - 0.5) * 0.78;
              const vy = (rnd(seed * 5 + 1) - 0.25) * 0.62;
              const vz = 0.55 + rnd(seed * 7 + 2) * 1.15;

              const px = x0 + vx * burstEase;
              const py = y0 + vy * burstEase - 0.28 * dt * dt;
              const pz = 0.96 + vz * burstEase * 1.22;
              if (py < 0.05) return null;

              const sz = (0.0048 + rnd(seed * 11) * 0.0055) * (0.6 + 0.4 * particleFade);
              return (
                <mesh
                  key={i}
                  position={[px, py, pz]}
                  material={i % 3 === 0 ? fineSandMatBright : fineSandMatGold}
                >
                  <icosahedronGeometry args={[sz, 0]} />
                </mesh>
              );
            })}

            {/* Mây bụi cát vàng hổ phách bung cuồn cuộn ra xa màng lọc (+Z) */}
            {Array.from({ length: 16 }, (_, k) => {
              const seed = bIdx * 70 + k;
              const px = 0.28 + rnd(seed * 2 + 1) * 0.56 + (rnd(seed * 2 + 2) - 0.5) * 0.5 * burstEase;
              const py = 0.85 + (rnd(seed * 3 + 1) - 0.32) * 0.32 * burstEase - 0.1 * dt * dt;
              const pz = 1.04 + (0.35 + rnd(seed * 5 + 1) * 0.95) * burstEase;
              const scale = 0.2 + burstEase * (0.38 + rnd(seed * 7) * 0.22);
              const op = 0.42 * particleFade;
              if (op <= 0.005) return null;
              return (
                <sprite key={`sp${k}`} position={[px, py, pz]} scale={[scale * 1.25, scale * 0.95, scale]}>
                  <spriteMaterial
                    map={puffTex}
                    color={k % 3 === 0 ? '#ffd884' : '#dfa855'}
                    transparent
                    opacity={op}
                    depthWrite={false}
                  />
                </sprite>
              );
            })}
          </group>
        );
      })}

      {/* Luồng khí sạch ánh cyan sau khi lọc sạch cát chảy êm vào cổ hút cánh tuabin */}
      {cleanFlowAmt > 0.01 &&
        cleanAirPipes.map((g, idx) => (
          <mesh key={`clean${idx}`} geometry={g}>
            <meshBasicMaterial
              color="#29e3d4"
              transparent
              opacity={0.54 * cleanFlowAmt * (0.65 + 0.35 * Math.sin(t * 9 + idx))}
              toneMapped={false}
            />
          </mesh>
        ))}
    </group>
  );
};

const C04S03: React.FC = () => {
  const t = useT();

  const turbineSpin = calcTurbineSpin(t);
  // Bầu đốt & họng xả rực sáng tối đa đúng CUE.c04_s03_hp (533.92s); hạ nón xả đuôi xuống vừa phải khi cận cảnh hộp lọc trước để khung nền cực sạch
  const hpGlowRise = prog(t, CUE.c04_s03_hp - 0.25, CUE.c04_s03_hp + 1.0);
  const filterFocusDim = prog(t, 546.5, 548.5);
  const exhaustGlow = lerp(0.14, 1.0, hpGlowRise) * lerp(1.0, 0.48, filterFocusDim);
  const combustorLightGlow = lerp(0.18, 1.0, hpGlowRise);

  const airPulse = calcAirPulse(t);
  const whisperAmt = bump(t, CUE.c04_s03_whisper - 1.2, 5.6);

  // ---------------- QUỸ ĐẠO CAMERA XOAY TRÒN 360° TUYẾN TÍNH MƯỢT & BÁM CÁC CUE ----------------
  // Giai đoạn 1 (521.00 -> 540.60s): Xoay tuyến tính đủ 360° quanh khối AGT1500:
  //   - 521.5s: Góc trước mặt phễu hút khí (+X, hơi lệch +Z)
  //   - 528.4s: Góc ngang sườn phải (+Z) thấy trọn động cơ trực thăng cải tiến nặng 2,500 lb trên giá đỡ
  //   - 535.2s: Góc 3/4 sau đuôi (-X, -Z, cao độ y ≈ 1.66 m) thấy rõ bầu đốt, buồng trao đổi nhiệt & họng xả rực lửa hổ phách 1,500 HP
  //   - 540.6s: Khép trọn vòng 360° trở về phía trước phễu hút khí (+X, +Z)
  const pOrbit = prog(t, 521.0, 540.6, linear);
  const orbitAngle = lerp(0.32, Math.PI * 2 + 0.36, pOrbit);
  const orbitRadius = lerp(2.55, 2.75, Math.sin(pOrbit * Math.PI));
  const orbitY = lerp(1.1, 1.68, Math.sin(pOrbit * Math.PI));

  let camPos: V3 = [
    0.05 + Math.cos(orbitAngle) * orbitRadius,
    orbitY,
    Math.sin(orbitAngle) * orbitRadius,
  ];
  let camLook: V3 = [
    lerp(0.28, -0.24, Math.sin(pOrbit * Math.PI)),
    0.64,
    0.02,
  ];

  // Giai đoạn 2 (540.40 -> 544.60s): Cận cảnh nhìn xuyên qua cửa sổ cắt bổ trên-phải (z < 0.56, không vướng hộp lọc khí!)
  // thẳng vào 3 tầng cánh nén Titanium đang quay tít trong ánh cyan-amber ("Whispering Death")
  const pWhisper = prog(t, 540.4, 541.9);
  if (pWhisper > 0) {
    const wPos: V3 = [1.38, 1.38, 0.54];
    const wLook: V3 = [0.66, 0.65, 0.02];
    camPos = [
      lerp(camPos[0], wPos[0], pWhisper),
      lerp(camPos[1], wPos[1], pWhisper),
      lerp(camPos[2], wPos[2], pWhisper),
    ];
    camLook = [
      lerp(camLook[0], wLook[0], pWhisper),
      lerp(camLook[1], wLook[1], pWhisper),
      lerp(camLook[2], wLook[2], pWhisper),
    ];
  }

  // Giai đoạn 3 (543.80 -> 547.60s): Lùi rộng bán kính ~42% lấy trọn cụm hộp lọc khí 3 lõi cắt bổ gắn bên sườn tuabin AGT1500 & ống dẫn JP-8 (CUE.c04_s03_jp8 @ 544.72s)
  const pJp8 = prog(t, 543.8, 546.2);
  if (pJp8 > 0) {
    const jPos: V3 = [1.96, 1.58, 2.48];
    const jLook: V3 = [0.24, 0.72, 0.36];
    camPos = [
      lerp(camPos[0], jPos[0], pJp8),
      lerp(camPos[1], jPos[1], pJp8),
      lerp(camPos[2], jPos[2], pJp8),
    ];
    camLook = [
      lerp(camLook[0], jLook[0], pJp8),
      lerp(camLook[1], jLook[1], pJp8),
      lerp(camLook[2], jLook[2], pJp8),
    ];
  }

  // Giai đoạn 4 (547.60 -> 556.24s): Góc 3/4 cao thoáng bên sườn tuabin AGT1500, thấy trọn hộp lọc khí 3 lõi nếp gấp trước & trong lúc bắn chùm cát vàng (+Z)
  const pFilter = prog(t, 547.6, 549.6);
  if (pFilter > 0) {
    const drift = prog(t, 549.6, 556.24, linear);
    const fPos: V3 = [lerp(2.24, 2.04, drift), lerp(1.48, 1.38, drift), lerp(2.44, 2.58, drift)];
    const fLook: V3 = [0.46, 0.82, 0.88];
    camPos = [
      lerp(camPos[0], fPos[0], pFilter),
      lerp(camPos[1], fPos[1], pFilter),
      lerp(camPos[2], fPos[2], pFilter),
    ];
    camLook = [
      lerp(camLook[0], fLook[0], pFilter),
      lerp(camLook[1], fLook[1], pFilter),
      lerp(camLook[2], fLook[2], pFilter),
    ];
  }

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_INTERIOR_BAY.stage}
        shadowArea={6.5}
        shadowCenter={[0.1, 0.6, 0.2]}
      >
        <Cam pos={camPos} look={camLook} fov={38} />

        {/* Đèn chiếu ven cyan-amber làm nổi rõ các tầng cánh nén Titanium và bầu đốt hổ phách */}
        <pointLight
          position={[1.15, 1.08, 0.92]}
          color={mix('#9ee8ff', '#29e3d4', 0.5 + whisperAmt * 0.5)}
          intensity={6.0 + whisperAmt * 11.0}
          distance={5.5}
          decay={1.6}
        />
        <pointLight
          position={[0.18, 0.95, 0.78]}
          color="#ff9224"
          intensity={3.0 + combustorLightGlow * 12.5}
          distance={5.8}
          decay={1.5}
        />
        <pointLight
          position={[-1.45, 0.85, -0.6]}
          color="#ff6a18"
          intensity={2.0 + exhaustGlow * 11.5}
          distance={5.5}
          decay={1.6}
        />

        <EngineTestBay glow={combustorLightGlow} whisperAmt={whisperAmt} />

        {/* Khối động cơ tuabin phản lực Honeywell AGT1500 trên giá đỡ kỹ thuật thép */}
        <PowerpackChassis3D
          mode="turbineOnly"
          turbineSpin={turbineSpin}
          exhaustGlow={exhaustGlow}
          airPulse={airPulse}
        />

        <IntakeAirflowVortex t={t} intensity={0.35 + whisperAmt * 0.65} />
        <Jp8FuelFlowHighlight t={t} />
        <PulseJetSandBlast t={t} />
      </Stage>

      {/* Tối đa 1 <Label> xuất hiện tại một thời điểm */}
      <Label
        t={t}
        text="AGT1500"
        x={960}
        y={132}
        from={CUE.c04_s03_agt1500}
        until={528.20}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="1,500 HP"
        x={960}
        y={132}
        from={CUE.c04_s03_hp}
        until={538.50}
        bg={PAL.amber}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="WHISPERING DEATH"
        x={960}
        y={132}
        from={CUE.c04_s03_whisper}
        until={545.60}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C04S03;
