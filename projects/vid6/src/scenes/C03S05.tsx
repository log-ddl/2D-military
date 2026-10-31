import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, mix, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { DustTrail, Explosion, Trail, softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_STORM } from '../design/stage';
import M1A2Abrams from '../parts/M1A2Abrams';

// ---------------- Địa hình sa mạc hoàng hôn khói dầu Desert Storm 1991 ----------------
const TERRAIN_H = heightField({
  seed: 305,
  amp: 2.6,
  scale: 135,
  oct: 5,
  add: (x, z) => {
    const roadBand = Math.exp(-((z / 9.5) ** 2));
    const trackWave = Math.sin(x * 0.042) * 0.24 + Math.cos(x * 0.019) * 0.16;
    const nearDuneL = 4.2 * Math.exp(-(((z + 32) / 17) ** 2)) * (0.78 + 0.28 * Math.sin(x * 0.036 + 0.9));
    const nearDuneR = 3.6 * Math.exp(-(((z - 34) / 18) ** 2)) * (0.76 + 0.26 * Math.cos(x * 0.032));
    const farRidgeL = 12.5 * Math.exp(-(((z + 96) / 36) ** 2)) * (0.82 + 0.24 * Math.sin(x * 0.02 + 2.1));
    const farRidgeR = 9.8 * Math.exp(-(((z - 104) / 38) ** 2));
    return trackWave * roadBand + (nearDuneL + nearDuneR + farRidgeL + farRidgeR) * (1 - roadBand * 0.9);
  },
});

const AVOID_ROAD = (x: number, z: number) => Math.abs(z) < 8.6 || (x > -80 && x < 95 && Math.abs(z) < 10.2);

// Tốc độ hành tiến chiến thuật liên tục của M1A2 Abrams (m/s)
const TANK_SPEED = 7.4;
const SCENE_ORIGIN_T = 368.6;
const tankXAt = (time: number) => -58 + (time - SCENE_ORIGIN_T) * TANK_SPEED;

const sampleTankPose = (time: number) => {
  const tx = tankXAt(time);
  const yF = TERRAIN_H(tx + 2.8, 0);
  const yR = TERRAIN_H(tx - 2.8, 0);
  const yC = TERRAIN_H(tx, 0);
  const yL = TERRAIN_H(tx, -1.5);
  const yRt = TERRAIN_H(tx, 1.5);
  const ty = (yF + yR + yC) / 3;
  const slopePitch = Math.atan2(yF - yR, 5.6);
  const slopeRoll = Math.atan2(yL - yRt, 3.0);
  return { tx, ty, slopePitch, slopeRoll };
};

const LEFT_TRACK_PATH = (time: number): V3 => {
  const x = tankXAt(time) - 3.55;
  return [x, TERRAIN_H(x, -1.52), -1.52];
};

const RIGHT_TRACK_PATH = (time: number): V3 => {
  const x = tankXAt(time) - 3.55;
  return [x, TERRAIN_H(x, 1.52), 1.52];
};

// Quỹ đạo đạn xuyên APFSDS đối phương bắn xiên ngang sườn phải (~82° so với trục camera) vào đúng khoang đạn đuôi lúc 369.96s
const HIT_POSE = sampleTankPose(CUE.c03_s05_pierce_hit);
const HIT_WORLD_TARGET: V3 = [
  HIT_POSE.tx - 1.92 * Math.cos(HIT_POSE.slopePitch) - 2.02 * Math.sin(HIT_POSE.slopePitch),
  HIT_POSE.ty - 1.92 * Math.sin(HIT_POSE.slopePitch) + 2.02 * Math.cos(HIT_POSE.slopePitch),
  1.38,
];
const HIT_WORLD_START: V3 = [HIT_POSE.tx + 15.5, HIT_POSE.ty + 3.45, 29.5];
const AP_TRAIL_POINTS: V3[] = Array.from({ length: 40 }, (_, i) => {
  const p = i / 39;
  return [
    lerp(HIT_WORLD_START[0], HIT_WORLD_TARGET[0], p),
    lerp(HIT_WORLD_START[1], HIT_WORLD_TARGET[1], p),
    lerp(HIT_WORLD_START[2], HIT_WORLD_TARGET[2], p),
  ];
});

// 36 vị trí viên đạn 120mm xếp gọn bên trong lòng khoang đuôi (x = -1.94, lọt hoàn toàn trong vỏ giáp bustle)
const SHELL_SLOTS: { x: number; y: number; z: number; delay: number }[] = (() => {
  const out: { x: number; y: number; z: number; delay: number }[] = [];
  const ys = [1.68, 1.89, 2.10];
  const zsLeft = [-0.88, -0.74, -0.60, -0.46, -0.32, -0.18];
  const zsRight = [0.18, 0.32, 0.46, 0.60, 0.74, 0.88];
  for (let r = 0; r < ys.length; r++) {
    for (let c = 0; c < 6; c++) {
      out.push({ x: -1.94, y: ys[r], z: zsRight[5 - c], delay: c * 0.05 + r * 0.04 });
      out.push({ x: -1.94, y: ys[r], z: zsLeft[5 - c], delay: 0.28 + c * 0.05 + r * 0.04 });
    }
  }
  return out;
})();

/** Khói giếng dầu cháy xa tắp chân trời Bão táp Sa mạc 1991 */
const DistantOilFires: React.FC<{ t: number }> = ({ t }) => {
  const wells: { x: number; z: number; scale: number; seed: number }[] = useMemo(
    () => [
      { x: 145, z: -78, scale: 1.15, seed: 11 },
      { x: 185, z: -48, scale: 0.95, seed: 23 },
      { x: 162, z: 86, scale: 1.05, seed: 37 },
    ],
    [],
  );

  const spriteTex = useMemo(() => softDot(), []);
  const flameMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ff8a24', toneMapped: false, transparent: true, opacity: 0.9 }),
    [],
  );

  return (
    <group>
      {wells.map((w, wi) => {
        const y0 = TERRAIN_H(w.x, w.z);
        const flicker = 0.88 + 0.16 * Math.sin(t * 7.5 + w.seed);
        return (
          <group key={wi} position={[w.x, y0, w.z]}>
            <mesh position={[0, 1.4 * w.scale, 0]} scale={[1.2 * w.scale * flicker, 2.6 * w.scale * flicker, 1.2 * w.scale]} material={flameMat}>
              <coneGeometry args={[1, 1, 10]} />
            </mesh>
            {Array.from({ length: 11 }, (_, pi) => {
              const cycle = (t * 0.14 + pi / 11 + rnd(w.seed + pi) * 0.08) % 1;
              const py = 2.2 + cycle * 44 * w.scale;
              const driftX = -cycle * 14 * w.scale + (rnd(pi * 3 + w.seed) - 0.5) * 3.5;
              const driftZ = cycle * 6 * w.scale + (rnd(pi * 5 + w.seed) - 0.5) * 3.5;
              const sz = (3.8 + cycle * 15) * w.scale;
              const op = Math.sin(cycle * Math.PI) * 0.52;
              return (
                <sprite key={pi} position={[driftX, py, driftZ]} scale={[sz, sz, sz]}>
                  <spriteMaterial map={spriteTex} color={cycle < 0.14 ? '#6e4526' : '#262220'} transparent opacity={op} depthWrite={false} />
                </sprite>
              );
            })}
          </group>
        );
      })}
    </group>
  );
};

/** Cụm lỗ thủng xuyên sườn phải + hiệu ứng 36 viên đạn kích nổ đỏ rực sau cửa chống nổ đóng kín */
const BustleCookoffFX: React.FC<{ t: number }> = ({ t }) => {
  const hitDt = t - CUE.c03_s05_pierce_hit;
  const igniteP = prog(t, CUE.c03_s05_ignite_36 - 0.15, CUE.c03_s05_ignite_36 + 0.85);
  const doorHighlight =
    prog(t, CUE.c03_s05_door_shut - 0.45, CUE.c03_s05_door_shut + 0.25) *
    (1 - prog(t, CUE.c03_s05_blowout_open + 0.2, CUE.c03_s05_blowout_open + 1.1));
  const preBlowPressure = igniteP * (1 - prog(t, CUE.c03_s05_blowout_open, CUE.c03_s05_blowout_open + 0.25));
  const xrayOpacity = igniteP * (1 - prog(t, CUE.c03_s05_blowout_open - 0.02, CUE.c03_s05_blowout_open + 0.38));

  const spriteTex = useMemo(() => softDot(), []);
  const bulkheadGeo = useMemo(() => rbox(0.06, 0.78, 2.26, 0.015), []);
  const seamLongGeo = useMemo(() => rbox(1.32, 0.028, 0.05, 0.008), []);
  const seamWideGeo = useMemo(() => rbox(0.05, 0.028, 1.96, 0.008), []);

  if (hitDt < 0) return null;

  const pulse = 0.82 + 0.18 * Math.sin(t * 19.0);
  const holeGlow = Math.max(0.28, Math.exp(-hitDt * 0.65) + igniteP * 0.95 * pulse);

  return (
    <group>
      {/* Lỗ đạn xuyên nóng chảy trên vách phải khoang đạn đuôi */}
      <group position={[-1.92, 2.02, 1.39]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.075, 0.075, 0.04, 16]} />
          <meshBasicMaterial color="#090606" />
        </mesh>
        <mesh position={[0, 0, 0.018]}>
          <ringGeometry args={[0.068, 0.148, 20]} />
          <meshBasicMaterial color={mix('#ff5518', '#fff2b0', Math.min(1, holeGlow))} toneMapped={false} side={THREE.DoubleSide} />
        </mesh>
        {/* Tia lửa & khói áp suất xì ngang từ lỗ đạn thủng */}
        {hitDt > 0 && (
          <>
            <pointLight color="#ff7324" intensity={22 * holeGlow} distance={6.5} decay={1.7} position={[0, 0, 0.35]} />
            {Array.from({ length: 8 }, (_, si) => {
              const cyc = (t * 2.6 + si / 8) % 1;
              const dist = 0.12 + cyc * (1.15 + preBlowPressure * 1.0);
              const sz = 0.24 + cyc * 0.68;
              return (
                <sprite
                  key={si}
                  position={[(rnd(si * 3 + 1) - 0.5) * 0.24 * cyc, cyc * 0.36, dist]}
                  scale={[sz, sz, sz]}
                >
                  <spriteMaterial
                    map={spriteTex}
                    color={cyc < 0.42 ? '#ffaa33' : '#574a42'}
                    transparent
                    opacity={(1 - cyc) * 0.72 * Math.max(0.4, preBlowPressure + 0.32)}
                    depthWrite={false}
                  />
                </sprite>
              );
            })}
          </>
        )}
      </group>

      {/* Khe viền hai tấm nắp blowout ửng đỏ rực vì áp suất 36 viên đạn trước khi bung mở */}
      {preBlowPressure > 0.01 && (
        <group position={[-1.84, 2.455, 0]}>
          {[-0.98, 0, 0.98].map((sz, i) => (
            <mesh key={`l${i}`} position={[0, 0, sz]} geometry={seamLongGeo}>
              <meshBasicMaterial color={mix('#ff3b14', '#ffe588', preBlowPressure * pulse)} transparent opacity={preBlowPressure * 0.95} toneMapped={false} />
            </mesh>
          ))}
          {[-0.66, 0.66].map((sx, i) => (
            <mesh key={`w${i}`} position={[sx, 0, 0]} geometry={seamWideGeo}>
              <meshBasicMaterial color={mix('#ff3b14', '#ffe588', preBlowPressure * pulse)} transparent opacity={preBlowPressure * 0.95} toneMapped={false} />
            </mesh>
          ))}
          <pointLight color="#ff5e1a" intensity={42 * preBlowPressure * pulse} distance={7} decay={1.6} position={[0, 0.42, 0]} />
        </group>
      )}

      {/* Bóng nhiệt X-quang 36 viên đạn 120mm xếp gọn trong khoang bustle kích nổ đỏ rực (372.04s .. 376.56s) */}
      {xrayOpacity > 0.01 && (
        <group>
          {SHELL_SLOTS.map((sh, idx) => {
            const localP = prog(t, CUE.c03_s05_ignite_36 + sh.delay, CUE.c03_s05_ignite_36 + sh.delay + 0.32);
            if (localP <= 0.005) return null;
            const hotCol = mix('#ff2b14', '#ffdf73', localP * (0.68 + 0.32 * Math.sin(t * 24 + idx)));
            return (
              <group key={idx} position={[sh.x, sh.y, sh.z]}>
                {/* Thân vỏ thuốc phóng rực lửa */}
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.043, 0.043, 0.68, 10]} />
                  <meshBasicMaterial
                    color={hotCol}
                    transparent
                    opacity={xrayOpacity * localP * 0.74}
                    toneMapped={false}
                    depthTest={false}
                  />
                </mesh>
                {/* Đế kim loại viên đạn quay về phía cửa nạp */}
                <mesh position={[0.35, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.049, 0.049, 0.045, 10]} />
                  <meshBasicMaterial
                    color="#ffe9a6"
                    transparent
                    opacity={xrayOpacity * localP * 0.85}
                    toneMapped={false}
                    depthTest={false}
                  />
                </mesh>
              </group>
            );
          })}
        </group>
      )}

      {/* Vách cửa chống nổ (Blast Door Shut @ 375.24s) chặn đứng hoàn toàn sức nóng bảo vệ 4 người lính phía trước */}
      {doorHighlight > 0.01 && (
        <group position={[-1.24, 1.94, 0]}>
          <mesh geometry={bulkheadGeo}>
            <meshBasicMaterial
              color={PAL.cyan}
              transparent
              opacity={doorHighlight * 0.38}
              toneMapped={false}
              depthTest={false}
            />
          </mesh>
          <mesh position={[0, 0.40, 0]} geometry={rbox(0.08, 0.04, 2.30, 0.01)}>
            <meshBasicMaterial color="#9efcf3" transparent opacity={doorHighlight * 0.85} toneMapped={false} depthTest={false} />
          </mesh>
        </group>
      )}
    </group>
  );
};

/**
 * Ngọn núi lửa khổng lồ (Volcano of Flame) dựng thuần từ các đám cầu lửa thể tích cuồn cuộn (volumetric additive + smoke sprites)
 * và tia lửa thuốc phóng bắn thẳng đứng +Y lên trời — không có cạnh hình trụ cứng, cực kỳ tự nhiên và hùng tráng!
 */
const BlowoutVolcanoPlume: React.FC<{ t: number; slopeRoll: number; slopePitch: number }> = ({
  t,
  slopeRoll,
  slopePitch,
}) => {
  const dt = t - CUE.c03_s05_blowout_open;
  const spriteTex = useMemo(() => softDot(), []);
  const sparkMat = useMemo(() => plain('#ffe98a', 0.2, 0.0, { emissive: '#ffae2b', emissiveIntensity: 3.8 }), []);

  if (dt < 0) return null;

  const openSurge = prog(t, CUE.c03_s05_blowout_open, CUE.c03_s05_blowout_open + 0.32);
  const volcanoBoost = prog(t, CUE.c03_s05_volcano - 0.55, CUE.c03_s05_volcano + 0.45);
  const tailTaper = 1 - 0.28 * prog(t, 383.5, 385.8);
  const power = openSurge * (0.78 + 0.34 * volcanoBoost) * tailTaper;
  const colHeight = (8.4 + 5.8 * volcanoBoost) * tailTaper;
  const flicker = 0.9 + 0.14 * Math.sin(t * 28.5);

  return (
    <group position={[-1.84, 2.44, 0]} rotation={[-slopeRoll, 0, -slopePitch]}>
      <pointLight
        color="#ff9428"
        intensity={280 * power * flicker}
        distance={38}
        decay={1.45}
        position={[0, 3.6, 0]}
      />
      <pointLight
        color="#ffe694"
        intensity={150 * power}
        distance={16}
        decay={1.6}
        position={[0, 0.85, 0]}
      />

      {/* Lớp 1: 38 luồng plasma lửa lõi cộng sáng (AdditiveBlending) phụt thẳng đứng từ 2 miệng hốc blowout trái/phải */}
      {Array.from({ length: 38 }, (_, i) => {
        const speed = 1.9 + (i % 6) * 0.22;
        const raw = dt * speed - (i / 38) * 0.95;
        if (raw < 0) return null;
        const cyc = raw % 1;
        const bayZ = i % 2 === 0 ? 0.48 : -0.48;
        const py = 0.12 + cyc * (colHeight * 0.72);
        const windLag = -(cyc ** 1.8) * 1.45;
        const turb = 0.14 + cyc * 0.62;
        const ang = t * 6.5 + i * 2.39;
        const px = windLag + Math.cos(ang) * turb * 0.48 + (rnd(i * 5 + 3) - 0.5) * 0.32;
        const pz = bayZ * (1 - cyc * 0.36) + Math.sin(ang) * turb * 0.48;

        // Thắt nhẹ ở miệng xả rồi nở bùng cuồn cuộn rồi vuốt nhọn tự nhiên ở đỉnh ngọn lửa
        const taper = Math.sin(Math.min(1, cyc * 1.15) * Math.PI * 0.88);
        const sz = (1.15 + taper * 1.85) * (0.85 + 0.3 * rnd(i * 11 + 1)) * Math.min(1.15, 0.7 + power * 0.45);
        const col = cyc < 0.28 ? mix('#fff6cf', '#ffbb38', cyc / 0.28) : mix('#ffbb38', '#ff4512', (cyc - 0.28) / 0.72);
        const op = Math.min(1, cyc * 10) * ((1 - cyc) ** 1.15) * 0.78 * Math.min(1, power);

        return (
          <sprite key={`core${i}`} position={[px, py, pz]} scale={[sz * 0.92, sz * 1.38, sz * 0.92]}>
            <spriteMaterial
              map={spriteTex}
              color={col}
              transparent
              opacity={op}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        );
      })}

      {/* Lớp 2: 52 cuộn cầu lửa & khói dầu đen cuồn cuộn nối liền từ miệng hốc blowout lên tới độ cao 17 m */}
      {Array.from({ length: 52 }, (_, i) => {
        const speed = 1.05 + (i % 5) * 0.13;
        const raw = dt * speed - (i / 52) * 1.35;
        if (raw < 0) return null;
        const cyc = raw % 1;
        const baySide = i % 2 === 0 ? 0.48 : -0.48;
        const py = 0.35 + cyc * (colHeight + 4.8);
        const windLag = -(cyc ** 1.75) * 3.6;
        const swirlA = t * 4.2 + i * 2.17;
        const spread = 0.2 + cyc * 1.65;
        const px = windLag + Math.cos(swirlA) * spread * 0.56 + (rnd(i * 3 + 7) - 0.5) * 0.5;
        const pz = baySide * (1 - cyc * 0.48) + Math.sin(swirlA) * spread * 0.56;

        const sz = (1.25 + cyc * 4.1) * (0.84 + 0.32 * rnd(i * 7 + 2)) * Math.min(1.15, 0.68 + power * 0.48);
        let col = '#fff2bd';
        if (cyc < 0.20) {
          col = mix('#fff3c4', '#ffb636', cyc / 0.20);
        } else if (cyc < 0.50) {
          col = mix('#ffb636', '#f24e13', (cyc - 0.20) / 0.30);
        } else if (cyc < 0.72) {
          col = mix('#f24e13', '#4f281c', (cyc - 0.50) / 0.22);
        } else {
          col = mix('#42261d', '#292421', (cyc - 0.72) / 0.28);
        }

        const fadeIn = Math.min(1, cyc * 8);
        const fadeOut = 1 - Math.max(0, (cyc - 0.60) / 0.40);
        const op = fadeIn * fadeOut * (cyc < 0.62 ? 0.84 * power : 0.72 * Math.min(1, power + 0.25));

        return (
          <sprite key={`billow${i}`} position={[px, py, pz]} scale={[sz, sz * 1.2, sz]}>
            <spriteMaterial
              map={spriteTex}
              color={col}
              transparent
              opacity={op}
              depthWrite={false}
            />
          </sprite>
        );
      })}

      {/* Lớp 3: 44 tàn lửa thuốc phóng bắn vọt thẳng đứng lên trời */}
      {Array.from({ length: 44 }, (_, si) => {
        const rate = 1.45 + rnd(si * 11 + 3) * 0.9;
        const raw = dt * rate - rnd(si * 5 + 9) * 0.9;
        if (raw < 0) return null;
        const cyc = raw % 1;
        const angle = rnd(si * 13 + 1) * Math.PI * 2;
        const rad = (0.14 + rnd(si * 17 + 4) * 1.45) * cyc;
        const sy = 0.25 + cyc * (colHeight + 3.6);
        const sx = -(cyc ** 1.6) * 2.5 + Math.cos(angle) * rad;
        const sz = (si % 2 === 0 ? 0.46 : -0.46) * (1 - cyc * 0.32) + Math.sin(angle) * rad;
        const sparkScale = (1 - cyc * 0.68) * Math.min(1, power * 1.2);
        if (sparkScale <= 0.05) return null;
        return (
          <mesh
            key={`sp${si}`}
            position={[sx, sy, sz]}
            scale={[0.048 * sparkScale, 0.32 * sparkScale, 0.048 * sparkScale]}
            material={sparkMat}
          >
            <boxGeometry args={[1, 1, 1]} />
          </mesh>
        );
      })}
    </group>
  );
};

const C03S05: React.FC = () => {
  const t = useT();

  const { tx, ty, slopePitch, slopeRoll } = sampleTankPose(t);
  const travel = (t - 364.0) * TANK_SPEED;

  const hitJolt = bump(t, CUE.c03_s05_pierce_hit, 0.38);
  const blowoutJolt = bump(t, CUE.c03_s05_blowout_open, 0.45);
  const hullRoll = -hitJolt * 0.048;
  const hullPitch = -blowoutJolt * 0.024;

  // Hai nắp xả nổ blowout panels bật mở hoàn toàn lên 1.0 từ 376.56s
  const blowoutOpen = prog(t, CUE.c03_s05_blowout_open, CUE.c03_s05_blowout_open + 0.18);

  // Vệt đạn xuyên APFSDS đối phương (bay tới chạm sườn đuôi đúng 369.96s, để lại vệt khói ion mảnh tới 372.65s)
  const apFlightP = prog(t, CUE.c03_s05_pierce_hit - 0.28, CUE.c03_s05_pierce_hit, (x) => x);
  const apCoreFade = 1 - prog(t, CUE.c03_s05_pierce_hit + 0.15, CUE.c03_s05_pierce_hit + 1.15);
  const apWakeFade = 1 - prog(t, CUE.c03_s05_pierce_hit + 0.3, CUE.c03_s05_ignite_36 + 0.75);

  // ---------------- Ngôn ngữ Camera 3/4 trên cao phía sau bám xe đang lăn bánh ----------------
  const pFocusBustle = prog(t, 371.4, 374.8);
  const pVolcanoWide = prog(t, CUE.c03_s05_blowout_open - 0.15, CUE.c03_s05_volcano + 0.6);
  const pCrewRolling = prog(t, CUE.c03_s05_four_soldiers - 0.5, CUE.c03_s05_keep_rolling + 0.4);

  let offX = lerp(-9.8, -7.8, pFocusBustle);
  let offY = lerp(5.1, 5.6, pFocusBustle);
  let offZ = lerp(7.8, 6.4, pFocusBustle);

  offX = lerp(offX, -14.2, pVolcanoWide);
  offY = lerp(offY, 6.7, pVolcanoWide);
  offZ = lerp(offZ, 12.4, pVolcanoWide);

  offX = lerp(offX, -8.2, pCrewRolling);
  offY = lerp(offY, 5.6, pCrewRolling);
  offZ = lerp(offZ, 13.8, pCrewRolling);

  let lookDx = lerp(-0.6, -1.35, pFocusBustle);
  let lookDy = lerp(1.9, 2.08, pFocusBustle);
  lookDx = lerp(lookDx, -1.0, pVolcanoWide);
  lookDy = lerp(lookDy, 5.5, pVolcanoWide);
  lookDx = lerp(lookDx, 0.35, pCrewRolling);
  lookDy = lerp(lookDy, 4.5, pCrewRolling);

  const shakeAmp = hitJolt * 0.22 + blowoutJolt * 0.34;
  const shakeX = Math.sin(t * 43.0) * shakeAmp;
  const shakeY = Math.cos(t * 51.0) * shakeAmp * 0.8;

  const camPos: V3 = [tx + offX + shakeX, ty + offY + shakeY, offZ];
  const camLook: V3 = [tx + lookDx, ty + lookDy + shakeY * 0.4, 0];
  const camFov = lerp(lerp(39, 38, pFocusBustle), 44.5, pVolcanoWide);

  const blowoutWorldPos: V3 = [
    tx - 1.84 * Math.cos(slopePitch) - 2.52 * Math.sin(slopePitch),
    ty - 1.84 * Math.sin(slopePitch) + 2.52 * Math.cos(slopePitch),
    0,
  ];

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_DESERT_STORM.stage}
        shadowArea={34}
        shadowCenter={[tx, ty, 0]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        <Terrain
          h={TERRAIN_H}
          size={460}
          seg={240}
          center={[10, 0]}
          colors={LOOK_DESERT_STORM.terrain}
          grainRepeat={46}
        />
        <Scatter
          kind="rock"
          count={145}
          area={[-130, -110, 175, 110]}
          h={TERRAIN_H}
          seed={3051}
          scale={[0.45, 1.45]}
          avoid={AVOID_ROAD}
          tint={LOOK_DESERT_STORM.scatterTint}
        />
        <Scatter
          kind="bush"
          count={95}
          area={[-130, -100, 175, 100]}
          h={TERRAIN_H}
          seed={3052}
          scale={[0.5, 1.15]}
          avoid={AVOID_ROAD}
          tint="#9c865e"
        />

        <DistantOilFires t={t} />

        <DustTrail
          t={t}
          from={364.5}
          to={386.4}
          path={LEFT_TRACK_PATH}
          rate={10}
          size={2.15}
          color="#cca97e"
          life={3.1}
        />
        <DustTrail
          t={t}
          from={364.5}
          to={386.4}
          path={RIGHT_TRACK_PATH}
          rate={10}
          size={2.15}
          color="#cca97e"
          life={3.1}
        />

        <group position={[tx, ty, 0]} rotation={[slopeRoll, 0, slopePitch]}>
          <M1A2Abrams
            variant="m1a2"
            camo="desert"
            travel={travel}
            turretYaw={0}
            gunPitch={0.022}
            citvYaw={0.18 * Math.sin(t * 0.9)}
            crowsYaw={-0.12}
            hullPitch={hullPitch}
            hullRoll={hullRoll}
            blowoutOpen={blowoutOpen}
            exhaustHeat={0.48}
          />
          <BustleCookoffFX t={t} />
          <BlowoutVolcanoPlume t={t} slopeRoll={slopeRoll} slopePitch={slopePitch} />
        </group>

        {/* Vệt đạn xuyên APFSDS đối phương (lệch >80° so với trục camera) + vệt khói nhiệt lưu hướng bay */}
        {apFlightP > 0.01 && apWakeFade > 0.01 && (
          <>
            <Trail
              points={AP_TRAIL_POINTS}
              upto={apFlightP}
              color="#ffb067"
              width={0.09}
              opacity={0.34 * apWakeFade}
              glow
            />
            {apCoreFade > 0.01 && (
              <>
                <Trail
                  points={AP_TRAIL_POINTS}
                  upto={apFlightP}
                  color="#ff7a1f"
                  width={0.15}
                  opacity={0.55 * apCoreFade}
                  glow
                />
                <Trail
                  points={AP_TRAIL_POINTS}
                  upto={apFlightP}
                  color="#fff5bd"
                  width={0.06}
                  opacity={0.96 * apCoreFade}
                  glow
                />
              </>
            )}
          </>
        )}

        <Explosion
          t={t}
          at={CUE.c03_s05_pierce_hit}
          pos={HIT_WORLD_TARGET}
          size={1.25}
          smokeLife={2.8}
          seed={55}
          smoke="#594e45"
        />

        <Explosion
          t={t}
          at={CUE.c03_s05_blowout_open}
          pos={blowoutWorldPos}
          size={2.85}
          smokeLife={5.8}
          seed={71}
          smoke="#4a3f37"
        />
        <Explosion
          t={t}
          at={CUE.c03_s05_volcano}
          pos={[blowoutWorldPos[0], blowoutWorldPos[1] + 1.0, blowoutWorldPos[2]]}
          size={3.55}
          smokeLife={6.2}
          seed={79}
          smoke="#3d342e"
        />
      </Stage>

      <Label
        t={t}
        text="BLOWOUT PANELS"
        x={360}
        y={165}
        from={CUE.c03_s05_roof_panels}
        until={381.9}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C03S05;
