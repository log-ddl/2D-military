import React from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { Explosion, Trail } from '@lib/3d/fx';
import { rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL3D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';
import { Kinzhal, Oreshnik, OreshnikRV, PatriotLauncher, PatriotRadar } from '../local/models';

const X_AXIS = new THREE.Vector3(1, 0, 0);

/** Xoay mô hình tên lửa (mũi +X) trùng khít theo vector vận tốc thực. */
const quatFromDir = (dx: number, dy: number, dz: number): THREE.Quaternion => {
  const dir = new THREE.Vector3(dx, dy, dz);
  if (dir.lengthSq() < 1e-8) return new THREE.Quaternion();
  dir.normalize();
  return new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir);
};

// ---------------- Địa hình thung lũng phòng thủ (khởi tạo 1 lần ở cấp module) ----------------
const zRoadCenter = (x: number) => Math.sin(x * 0.021) * 14 + 13;

const H_VALLEY = heightField({
  seed: 505,
  amp: 5.5,
  scale: 105,
  flats: [
    [0, 0, 32, 0],
    [-18, 8, 16, 0.2],
    [18, -6, 16, 0.2],
  ],
  add: (x, z) => {
    // Hai sườn đồi ôm thung lũng tạo chiều sâu rõ nét khi nhìn chúc từ thượng tầng
    const northRidge = 34 * Math.exp(-(((z + 92) / 46) ** 2));
    const southSlope = 19 * Math.exp(-(((z - 105) / 52) ** 2));
    const eastRim = 16 * Math.exp(-(((x - 115) / 56) ** 2));
    const westRim = 14 * Math.exp(-(((x + 125) / 58) ** 2));
    return northRidge + southSlope + eastRim + westRim;
  },
});

const avoidValleyBaseAndRoad = (x: number, z: number) => {
  if (Math.hypot(x, z) < 35) return true;
  if (Math.abs(z - zRoadCenter(x)) < 6.5) return true;
  return false;
};

/** Dải đường cấp phối chiến thuật bám sát độ cao mặt đất xuyên qua lòng thung lũng. */
const VALLEY_ROAD_GEO = (() => {
  const steps = 120;
  const xMin = -185;
  const xMax = 185;
  const halfW = 3.9;
  const pos: number[] = [];
  const uvs: number[] = [];
  const idx: number[] = [];

  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const x = lerp(xMin, xMax, u);
    const zc = zRoadCenter(x);
    const dz = 0.021 * 14 * Math.cos(x * 0.021);
    const inv = 1 / Math.hypot(1, dz);
    const nx = -dz * inv;
    const nz = 1 * inv;

    const xl = x + nx * halfW;
    const zl = zc + nz * halfW;
    const xr = x - nx * halfW;
    const zr = zc - nz * halfW;

    pos.push(xl, H_VALLEY(xl, zl) + 0.12, zl);
    pos.push(xr, H_VALLEY(xr, zr) + 0.12, zr);
    uvs.push(u * 24, 0, u * 24, 1);

    if (i < steps) {
      const a = i * 2;
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
})();

const ROAD_MAT = plain('#7d7566', 0.92, 0.04);
const BUNKER_MAT = paint({
  color: '#525b49',
  camo: ['#3e4637', '#6a6854'],
  camoScale: 1.2,
  wear: 0.25,
  dirt: 0.22,
  roughness: 0.78,
  metalness: 0.14,
  repeat: 1,
  seed: 55,
});
const CONCRETE_MAT = plain('#74787c', 0.88, 0.08);
const BERM_MAT = plain('#585443', 0.95, 0.02);

// ---------------- Quỹ đạo 3 khoang Bus Oreshnik & 18 luồng mưa đầu đạn MIRV ----------------
const BUS1_START: V3 = [-32, 78, -14];
const BUS1_VEL: V3 = [0.95, -1.72, 0.58]; // m/s hướng chúc xuống thung lũng
const BUS_OFFSETS: readonly V3[] = [
  [0, 0, 0],        // Bus #1 (chính giữa — chủ thể cận cảnh 59.2–67.8s)
  [29, 4.0, 18],    // Bus #2 (cánh phải trên cao)
  [-23, -3.0, -21], // Bus #3 (cánh trái trên cao)
];

const busPosAt = (busIdx: number, t: number): V3 => {
  const dt = Math.max(0, t - 59.0);
  const off = BUS_OFFSETS[busIdx];
  return [
    BUS1_START[0] + off[0] + BUS1_VEL[0] * dt,
    BUS1_START[1] + off[1] + BUS1_VEL[1] * dt,
    BUS1_START[2] + off[2] + BUS1_VEL[2] * dt,
  ];
};

const BUS_QUAT = quatFromDir(BUS1_VEL[0], BUS1_VEL[1], BUS1_VEL[2]);

// 6 đầu đạn chính + 12 đạn động năng phụ tách ra cận cảnh từ Bus #1 trong khoảng 62.6s – 67.8s
const CLOSE_PRIMARY_TIMES = [62.55, 62.95, 63.36, 63.76, 64.16, 64.56] as const;

type RainStream = {
  busIdx: number;
  tStart: number;
  tImpact: number;
  start: V3;
  end: V3;
  pts: V3[];
  explode: boolean;
  blastSize: number;
};

const RAIN_STREAMS: RainStream[] = (() => {
  const targets: [number, number][] = [
    // Bus 1 -> khu trung tâm trận địa
    [-5, -3], [8, 4], [-14, 6], [2, -9], [13, -3], [-2, 10],
    // Bus 2 -> cánh Đông trận địa & kho đạn
    [18, 7], [24, -4], [11, 13], [6, 1], [21, 12], [15, -11],
    // Bus 3 -> cánh Tây trận địa & đài chỉ huy
    [-21, -5], [-16, 12], [-25, 4], [-10, -11], [-19, -13], [-8, 3],
  ];

  return targets.map(([tx, tz], i) => {
    const busIdx = Math.floor(i / 6);
    const slot = i % 6;
    const tStart = 68.05 + slot * 0.22 + busIdx * 0.11;
    const tImpact = CUE.s05_rain_impact + slot * 0.36 + busIdx * 0.13; // 70.80 .. 72.86s
    const bPos = busPosAt(busIdx, tStart);
    const ang = (slot * Math.PI) / 3;
    const start: V3 = [
      bPos[0] + 0.8,
      bPos[1] + Math.cos(ang) * 0.9,
      bPos[2] + Math.sin(ang) * 0.9,
    ];
    const end: V3 = [tx, H_VALLEY(tx, tz) + 0.15, tz];
    const n = 28;
    const pts: V3[] = Array.from({ length: n }, (_, k) => {
      const s = k / (n - 1);
      // Hơi cong nhẹ khí động học khi lao xuyên khí quyển đặc
      const bend = Math.sin(s * Math.PI) * 1.8;
      return [
        lerp(start[0], end[0], s),
        lerp(start[1], end[1], s) + bend,
        lerp(start[2], end[2], s),
      ];
    });
    return {
      busIdx,
      tStart,
      tImpact,
      start,
      end,
      pts,
      explode: i % 3 !== 2, // 12 vụ nổ lớn liên hoàn rải đều khắp trận địa
      blastSize: 5.6 + (i % 4) * 1.45,
    };
  });
})();

type KinzhalStrike = {
  tStart: number;
  tImpact: number;
  start: V3;
  end: V3;
  pts: V3[];
  blastSize: number;
};

// 3 quả Kinzhal lao vút từ góc trên bên phải khung hình xuyên chéo xuống đám khói lửa (CUE.s05_kinzhal_wave = 74.2s)
const KINZHAL_WAVE: KinzhalStrike[] = (() => {
  const specs: { tStart: number; tImpact: number; start: V3; target: [number, number]; blastSize: number }[] = [
    { tStart: 74.16, tImpact: 76.62, start: [62, 70, 28], target: [-3, 3], blastSize: 11.2 },
    { tStart: 74.66, tImpact: 77.30, start: [72, 76, 38], target: [11, -5], blastSize: 10.4 },
    { tStart: 75.08, tImpact: 77.68, start: [56, 80, 44], target: [-15, 9], blastSize: 9.8 },
  ];
  return specs.map((sp) => {
    const end: V3 = [sp.target[0], H_VALLEY(sp.target[0], sp.target[1]) + 0.2, sp.target[1]];
    const n = 26;
    const pts: V3[] = Array.from({ length: n }, (_, k) => {
      const s = k / (n - 1);
      return [
        lerp(sp.start[0], end[0], s),
        lerp(sp.start[1], end[1], s) + Math.sin(s * Math.PI) * 1.4,
        lerp(sp.start[2], end[2], s),
      ];
    });
    return { tStart: sp.tStart, tImpact: sp.tImpact, start: sp.start, end, pts, blastSize: sp.blastSize };
  });
})();

const sampleCurve = (pts: V3[], p: number): { pos: V3; quat: THREE.Quaternion } => {
  const u = Math.max(0, Math.min(1, p)) * (pts.length - 1);
  const i = Math.min(pts.length - 2, Math.floor(u));
  const f = u - i;
  const a = pts[i];
  const b = pts[i + 1];
  return {
    pos: [lerp(a[0], b[0], f), lerp(a[1], b[1], f), lerp(a[2], b[2], f)],
    quat: quatFromDir(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
  };
};

const S05: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- Chuyển động Camera: Cận cảnh Bus #1 trên cao -> Kéo lùi đại cảnh 3 khoang Oreshnik & thung lũng ----------------
  const b1 = busPosAt(0, t);
  const closeDrift = prog(t, 59.0, 67.8);
  const closeCamPos: V3 = [
    b1[0] + lerp(-6.6, -8.8, closeDrift),
    b1[1] + lerp(4.8, 6.2, closeDrift),
    b1[2] + lerp(8.8, 11.4, closeDrift),
  ];
  const closeCamLook: V3 = [
    b1[0] + lerp(0.2, 2.2, closeDrift),
    b1[1] + lerp(-0.5, -3.4, closeDrift),
    b1[2] + lerp(-0.2, 0.7, closeDrift),
  ];

  const pullToWide = prog(t, 67.7, 69.35);
  const kinzhalPan = prog(t, 73.5, 75.4);

  const wideDrift = prog(t, 68.0, 77.25);
  const wideCamPos: V3 = [
    lerp(-68, -60, wideDrift),
    lerp(92, 82, wideDrift) - kinzhalPan * 3,
    lerp(92, 86, wideDrift),
  ];
  const wideCamLook: V3 = [
    lerp(-5, 4, kinzhalPan),
    lerp(24, 17, wideDrift) + kinzhalPan * 3,
    lerp(-4, -1, kinzhalPan),
  ];

  const camPos: V3 = [
    lerp(closeCamPos[0], wideCamPos[0], pullToWide),
    lerp(closeCamPos[1], wideCamPos[1], pullToWide),
    lerp(closeCamPos[2], wideCamPos[2], pullToWide),
  ];
  const camLook: V3 = [
    lerp(closeCamLook[0], wideCamLook[0], pullToWide),
    lerp(closeCamLook[1], wideCamLook[1], pullToWide),
    lerp(closeCamLook[2], wideCamLook[2], pullToWide),
  ];
  const fov = lerp(42, 48, pullToWide);

  // Trạng thái mở chóp & số RV còn trong giếng của Bus #1
  const shroudOpen1 = lerp(0.62, 0.94, prog(t, 59.3, 62.6));
  const releasedCount1 = CLOSE_PRIMARY_TIMES.filter((ts) => t >= ts).length;
  const rvPresent1 = Math.max(0, 6 - releasedCount1);
  const busScale = lerp(1.0, 1.42, pullToWide);
  const closePhaseFade = 1 - prog(t, 68.0, 68.9);

  // Hướng vector trục cục bộ của Bus #1 để đẩy chùm RV cận cảnh bay dọc theo hướng bổ xuống
  const fwdVec = new THREE.Vector3(1, 0, 0).applyQuaternion(BUS_QUAT);
  const upVec = new THREE.Vector3(0, 1, 0).applyQuaternion(BUS_QUAT);
  const sideVec = new THREE.Vector3(0, 0, 1).applyQuaternion(BUS_QUAT);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...STAGE_DAWN} fog={[210, 940]} shadowArea={76} shadowCenter={[0, 0, 0]}>
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* ---------------- Địa hình thung lũng, đường chiến thuật & rừng cây ---------------- */}
        <Terrain h={H_VALLEY} size={520} seg={220} center={[0, 0]} colors={TERRAIN_STEPPE} grainRepeat={48} />
        <mesh geometry={VALLEY_ROAD_GEO} material={ROAD_MAT} receiveShadow />

        <Scatter
          kind="pine"
          count={260}
          area={[-195, -175, 195, 175]}
          h={H_VALLEY}
          seed={51}
          scale={[0.85, 1.45]}
          avoid={avoidValleyBaseAndRoad}
          tint="#b4c4ad"
        />
        <Scatter
          kind="broadleaf"
          count={95}
          area={[-175, -150, 175, 160]}
          h={H_VALLEY}
          seed={52}
          scale={[0.8, 1.3]}
          avoid={avoidValleyBaseAndRoad}
          tint="#a9bb9a"
        />
        <Scatter
          kind="rock"
          count={110}
          area={[-185, -165, 185, 165]}
          h={H_VALLEY}
          seed={53}
          scale={[0.7, 1.6]}
          avoid={avoidValleyBaseAndRoad}
        />

        {/* ---------------- Trận địa phòng thủ mục tiêu dưới đáy thung lũng ---------------- */}
        <group>
          <PatriotRadar
            position={[-6, H_VALLEY(-6, -4), -4]}
            azimuth={0.45}
            activeGlow={0.7}
            showBeam={t < 71.3}
            beamAngle={[Math.sin(t * 2.4) * 0.35, 0.56]}
          />
          <PatriotLauncher
            position={[9, H_VALLEY(9, 5), 5]}
            azimuth={0.32}
            elev={45}
            loadedCount={16}
          />
          <PatriotLauncher
            position={[-16, H_VALLEY(-16, 7), 7]}
            azimuth={0.58}
            elev={44}
            loadedCount={16}
          />

          {/* Công sự chỉ huy, kho hậu cần & bờ đất bảo vệ trận địa */}
          <mesh position={[5, H_VALLEY(5, -11) + 1.3, -11]} geometry={rbox(8.5, 2.6, 5.2, 0.15)} material={BUNKER_MAT} castShadow receiveShadow />
          <mesh position={[-12, H_VALLEY(-12, -12) + 1.1, -12]} geometry={rbox(6.8, 2.2, 4.4, 0.12)} material={BUNKER_MAT} castShadow receiveShadow />
          <mesh position={[17, H_VALLEY(17, -6) + 0.9, -6]} geometry={rbox(5.4, 1.8, 3.6, 0.1)} material={CONCRETE_MAT} castShadow receiveShadow />
          <mesh position={[0, H_VALLEY(0, -17) + 0.65, -17]} geometry={rbox(26, 1.3, 2.2, 0.35)} material={BERM_MAT} castShadow receiveShadow />
          <mesh position={[-23, H_VALLEY(-23, 0) + 0.65, 0]} geometry={rbox(2.2, 1.3, 22, 0.35)} material={BERM_MAT} castShadow receiveShadow />
        </group>

        {/* ---------------- 3 khoang Post-Boost MIRV Bus của Oreshnik trên cao ---------------- */}
        {[0, 1, 2].map((bIdx) => {
          if (bIdx > 0 && t < 67.3) return null;
          const bPos = busPosAt(bIdx, t);
          const open = bIdx === 0 ? shroudOpen1 : 0.94;
          const rvs = bIdx === 0 ? rvPresent1 : t < 68.4 ? 3 : 0;
          return (
            <group key={`bus_${bIdx}`} position={bPos} quaternion={BUS_QUAT} scale={busScale}>
              {/* Dịch -4.8 m để gốc của group trùng đúng mâm phân phối 6 đầu đạn MIRV */}
              <Oreshnik busOnly shroudOpen={open} rvPresent={rvs} plume={0.75} position={[-4.8, 0, 0]} />
            </group>
          );
        })}

        {/* ---------------- Chùm đầu đạn độc lập & đạn con cận cảnh tách từ Bus #1 (62.5s – 68.8s) ---------------- */}
        {closePhaseFade > 0.01 &&
          CLOSE_PRIMARY_TIMES.map((ts, idx) => {
            if (t < ts) return null;
            const dt = t - ts;
            const ang = (idx * Math.PI) / 3;
            const radialR = 0.525 + dt * 0.42;
            const fwdDist = 1.05 + 1.45 * dt + 0.65 * dt * dt;

            const cy = Math.cos(ang) * radialR;
            const cz = Math.sin(ang) * radialR;
            const p = new THREE.Vector3(...b1)
              .addScaledVector(fwdVec, fwdDist)
              .addScaledVector(upVec, cy)
              .addScaledVector(sideVec, cz);

            const vel = fwdVec
              .clone()
              .multiplyScalar(1.45 + 1.3 * dt)
              .addScaledVector(upVec, Math.cos(ang) * 0.42)
              .addScaledVector(sideVec, Math.sin(ang) * 0.42);
            const q = quatFromDir(vel.x, vel.y, vel.z);
            const pl = Math.min(1.05, prog(t, ts + 0.15, ts + 1.1) * 0.95) * closePhaseFade;

            // Từ 65.1s (quanh CUE.s05_warheads_26 = 66.52s), tách thêm các đầu đạn động năng con mở rộng chùm
            const subSplit = prog(t, 65.0 + idx * 0.14, 66.8 + idx * 0.14);

            return (
              <React.Fragment key={`close_rv_${idx}`}>
                <group position={[p.x, p.y, p.z]} quaternion={q} scale={closePhaseFade}>
                  <OreshnikRV plasma={pl} />
                </group>
                {subSplit > 0.02 &&
                  [-1, 1].map((side) => {
                    const subAng = ang + side * 0.52;
                    const subSpread = subSplit * 1.15;
                    const sp = p
                      .clone()
                      .addScaledVector(fwdVec, -0.65 * subSplit + side * 0.22)
                      .addScaledVector(upVec, Math.cos(subAng) * subSpread)
                      .addScaledVector(sideVec, Math.sin(subAng) * subSpread);
                    return (
                      <group
                        key={`sub_${idx}_${side}`}
                        position={[sp.x, sp.y, sp.z]}
                        quaternion={q}
                        scale={0.76 * Math.min(1, subSplit * 2.5) * closePhaseFade}
                      >
                        <OreshnikRV plasma={0.95 * closePhaseFade} />
                      </group>
                    );
                  })}
              </React.Fragment>
            );
          })}

        {/* ---------------- Cơn mưa 18 vệt lửa MIRV từ 3 khoang Oreshnik dội xuống thung lũng (68.0s+) ---------------- */}
        {RAIN_STREAMS.map((st, i) => {
          if (t < st.tStart) return null;
          const p = prog(t, st.tStart, st.tImpact, Easing.in(Easing.quad));
          const fadeOut = t > st.tImpact + 1.4 ? Math.max(0, 1 - (t - st.tImpact - 1.4) / 2.2) : 1;
          const { pos, quat } = sampleCurve(st.pts, p);

          return (
            <React.Fragment key={`rain_${i}`}>
              {fadeOut > 0.02 && (
                <>
                  <Trail points={st.pts} upto={p} color="#ff7a24" width={0.28} opacity={0.88 * fadeOut} />
                  {i % 2 === 0 && (
                    <Trail points={st.pts} upto={p} color={PAL3D.flameCore} width={0.1} opacity={0.92 * fadeOut} />
                  )}
                </>
              )}
              {t <= st.tImpact && (
                <group position={pos} quaternion={quat} scale={1.72}>
                  <OreshnikRV plasma={1.15} />
                </group>
              )}
              {st.explode && (
                <Explosion
                  t={t}
                  at={st.tImpact}
                  pos={st.end}
                  size={st.blastSize}
                  seed={20 + i}
                  smokeLife={7.2}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* ---------------- Loạt 3 tên lửa Kinzhal bổ nhào nối tiếp từ góc trên phải (74.2s+) ---------------- */}
        {KINZHAL_WAVE.map((kz, k) => {
          if (t < kz.tStart) return null;
          const p = prog(t, kz.tStart, kz.tImpact, Easing.linear);
          const fadeTrail = t > kz.tImpact + 0.9 ? Math.max(0, 1 - (t - kz.tImpact - 0.9) / 1.4) : 1;
          const { pos, quat } = sampleCurve(kz.pts, p);

          return (
            <React.Fragment key={`kinzhal_${k}`}>
              {fadeTrail > 0.02 && (
                <>
                  <Trail points={kz.pts} upto={p} color="#ff9d2e" width={0.38} opacity={0.92 * fadeTrail} />
                  <Trail points={kz.pts} upto={p} color="#fff3c4" width={0.14} opacity={0.95 * fadeTrail} />
                </>
              )}
              {t <= kz.tImpact && (
                <group position={pos} quaternion={quat} scale={1.85}>
                  <Kinzhal heatGlow={1.0} plume={0.95} />
                </group>
              )}
              <Explosion
                t={t}
                at={kz.tImpact}
                pos={kz.end}
                size={kz.blastSize}
                seed={80 + k}
                smokeLife={6.5}
              />
            </React.Fragment>
          );
        })}
      </Stage>

      <Label t={t} text="ORESHNIK" x={960} y={145} from={CUE.s05_oreshnik_in} until={67.8} />
    </div>
  );
};

export default S05;
