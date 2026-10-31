import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { DustTrail, Trail } from '@skill/military/3d/fx';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_DESERT_GLARE } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';

// Địa hình trảng cát phẳng cứng cho Abrams lăn bánh chậm uy nghi, bao quanh bởi đụn cát & gờ đá sa mạc
const H_DESERT_PAN = heightField({
  seed: 67,
  amp: 2.1,
  scale: 115,
  flats: [
    [16, 0, 34, 0.0],
    [42, 0, 26, 0.05],
  ],
  add: (x, z) => {
    const absZ = Math.abs(z);
    const rim =
      absZ > 24
        ? 6.4 * Math.exp(-(((absZ - 64) / 26) ** 2)) * (0.78 + 0.3 * Math.sin(x * 0.05 + (z > 0 ? 1.4 : 0)))
        : 0;
    const farHorizon = x > 85 ? 9.5 * Math.exp(-(((x - 165) / 38) ** 2)) : 0;
    return rim + farHorizon;
  },
});

const AVOID_TANK_PAD = (x: number, z: number) => Math.abs(z) < 8.5 && x > -18 && x < 68;

// Đường viền quét quang học cyan quanh mép nóc tháp pháo Chobham (hệ toạ độ tháp pháo tại y_roof = 2.46 m)
const TURRET_ROOF_SCAN_LOOP: V3[] = [
  [1.07, 2.46, 0.0],
  [1.07, 2.46, 0.3],
  [1.38, 2.46, 0.33],
  [1.0, 2.46, 1.37],
  [0.26, 2.46, 1.49],
  [-0.84, 2.46, 1.43],
  [-1.24, 2.46, 1.27],
  [-2.61, 2.45, 1.2],
  [-2.61, 2.45, -1.18],
  [-1.24, 2.46, -1.25],
  [-0.84, 2.46, -1.39],
  [0.24, 2.46, -1.44],
  [0.98, 2.46, -1.33],
  [1.35, 2.46, -0.33],
  [1.07, 2.46, -0.3],
  [1.07, 2.46, 0.0],
];

const BARREL_SCAN_LINE: V3[] = [
  [0.44, 1.87, 0],
  [5.72, 1.87, 0],
];

const PROWL_SPEED = 2.15;
const tankPosX = (sec: number) => (sec - CUE.c01_s02_start) * PROWL_SPEED;

const C01S02: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const tx = tankPosX(t);
  const ty = H_DESERT_PAN(tx, 0);
  const hullPitch = Math.sin(t * 2.2) * 0.005;
  const turretYaw = lerp(-0.06, 0.0, prog(t, CUE.c01_s02_start, CUE.c01_s02_climb_hatch));
  const citvYaw = (t - CUE.c01_s02_start) * 0.42;

  // ==================== NGÔN NGỮ CAMERA 2 PHA ====================
  // Pha 1 (23.86 -> 32.40 s): Quỹ đạo 3/4 vòng cung từ mũi trái qua chính diện pháo M256 sang má phải Chobham
  const pOrbit = prog(t, CUE.c01_s02_start, CUE.c01_s02_climb_hatch);
  const orbitAz = lerp(-0.68, 0.72, pOrbit);
  const orbitRad = lerp(9.3, 8.4, pOrbit);
  const orbitPos: V3 = [
    tx + 0.5 + Math.cos(orbitAz) * orbitRad,
    ty + lerp(1.58, 2.02, pOrbit),
    Math.sin(orbitAz) * orbitRad,
  ];
  const orbitLook: V3 = [
    tx + lerp(0.55, 0.2, pOrbit),
    ty + lerp(1.36, 1.54, pOrbit),
    lerp(-0.1, 0.08, pOrbit),
  ];

  // Pha 2 (32.40 -> 39.60 s): Nâng cao máy lên trên nóc tháp pháo và đẩy chúc xuống cụm cửa sập & quang học ($15M)
  const pClimb = prog(t, CUE.c01_s02_climb_hatch, 35.8);
  const pDiveHatch = prog(t, 35.6, 39.6);

  // Giữ khung hình ôm trọn cả 2 cửa sập (trưởng xe & nạp đạn), hộp GPS, trụ CITV và mặt phẳng laser X-ray quét dọc
  const highPos: V3 = [
    tx + lerp(2.05, 1.35, pDiveHatch),
    ty + lerp(4.85, 4.28, pDiveHatch),
    lerp(2.65, 1.88, pDiveHatch),
  ];
  const highLook: V3 = [
    tx + lerp(0.05, -0.04, pDiveHatch),
    ty + lerp(2.22, 2.4, pDiveHatch),
    lerp(0.1, 0.04, pDiveHatch),
  ];

  const camPos: V3 = [
    lerp(orbitPos[0], highPos[0], pClimb),
    lerp(orbitPos[1], highPos[1], pClimb),
    lerp(orbitPos[2], highPos[2], pClimb),
  ];
  const camLook: V3 = [
    lerp(orbitLook[0], highLook[0], pClimb),
    lerp(orbitLook[1], highLook[1], pClimb),
    lerp(orbitLook[2], highLook[2], pClimb),
  ];
  const camFov = lerp(38, 35, pDiveHatch);

  // Hiệu ứng quét tia mảnh màu cyan quanh viền tháp pháo & cửa sập dẫn sang bản vẽ X-quang 2D ở C01S03
  const scanP = prog(t, 36.4, 39.2);
  const sweepPlaneX = lerp(3.4, -2.5, prog(t, CUE.c01_s02_common_sense - 0.5, 39.5));
  const showSweepPlane = t >= CUE.c01_s02_common_sense - 0.5;

  const cyanRingMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PAL.cyan,
        transparent: true,
        opacity: 0.9,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const cyanPlaneMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: PAL.cyan,
        transparent: true,
        opacity: 0.2,
        toneMapped: false,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_DESERT_GLARE.stage}
        width={W}
        height={H}
        shadowArea={16}
        shadowCenter={[tx, ty + 1.2, 0]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        <Terrain
          h={H_DESERT_PAN}
          size={480}
          seg={220}
          center={[25, 0]}
          colors={LOOK_DESERT_GLARE.terrain}
          grainRepeat={46}
        />
        <Scatter
          kind="rock"
          count={155}
          area={[-45, -95, 120, 95]}
          h={H_DESERT_PAN}
          seed={71}
          scale={[0.55, 1.9]}
          avoid={AVOID_TANK_PAD}
          tint={LOOK_DESERT_GLARE.scatterTint}
        />
        <Scatter
          kind="rock"
          count={85}
          area={[-40, -85, 110, 85]}
          h={H_DESERT_PAN}
          seed={89}
          scale={[0.3, 0.85]}
          avoid={AVOID_TANK_PAD}
          tint="#b89f76"
        />

        <group position={[tx, ty, 0]}>
          <M1A2Abrams
            variant="m1a2"
            camo="desert"
            travel={(t - 18) * PROWL_SPEED}
            hullPitch={hullPitch}
            turretYaw={turretYaw}
            gunPitch={0.015}
            citvYaw={citvYaw}
            crowsYaw={-0.16}
            exhaustHeat={0.48}
          />

          {/* Lưới quét tia cyan trên nóc tháp pháo & cụm cửa sập ở cuối cảnh dẫn vào X-ray C01S03 */}
          {scanP > 0.005 && (
            <group rotation={[0, turretYaw, 0]}>
              <Trail
                points={TURRET_ROOF_SCAN_LOOP}
                upto={scanP}
                color={PAL.cyan}
                width={0.028}
                opacity={0.92 * Math.min(1, scanP * 2)}
                glow
              />
              <Trail
                points={BARREL_SCAN_LINE}
                upto={scanP}
                color={PAL.cyan}
                width={0.02}
                opacity={0.8 * Math.min(1, scanP * 2)}
                glow
              />

              <group>
                {/* Cửa sập trưởng xe */}
                <mesh position={[-0.08, 2.52, 0.7]} rotation={[-Math.PI / 2, 0, t * 1.4]} material={cyanRingMat}>
                  <ringGeometry args={[0.41 * scanP, 0.45 * scanP, 36]} />
                </mesh>
                {/* Cửa sập người nạp đạn */}
                <mesh position={[-0.16, 2.48, -0.62]} rotation={[-Math.PI / 2, 0, -t * 1.2]} material={cyanRingMat}>
                  <ringGeometry args={[0.36 * scanP, 0.395 * scanP, 36]} />
                </mesh>
                {/* Trụ kính tiềm vọng CITV */}
                <mesh position={[0.66, 2.66, -0.66]} rotation={[-Math.PI / 2, 0, t * 1.8]} material={cyanRingMat}>
                  <ringGeometry args={[0.24 * scanP, 0.275 * scanP, 32]} />
                </mesh>
                {/* Hộp kính ngắm GPS */}
                <mesh position={[0.92, 2.62, 0.72]} rotation={[-Math.PI / 2, 0, 0]} material={cyanRingMat}>
                  <ringGeometry args={[0.31 * scanP, 0.35 * scanP, 4]} />
                </mesh>
              </group>

              {/* Mặt phẳng laser cyan quét cắt dọc thân xe mở màn cho X-ray */}
              {showSweepPlane && (
                <group position={[sweepPlaneX, 1.48, 0]}>
                  <mesh rotation={[0, Math.PI / 2, 0]} material={cyanPlaneMat}>
                    <planeGeometry args={[4.1, 3.0]} />
                  </mesh>
                  <mesh position={[0, 1.46, 0]} rotation={[0, 0, Math.PI / 2]} material={cyanRingMat}>
                    <cylinderGeometry args={[0.022, 0.022, 4.1, 8]} />
                  </mesh>
                  <pointLight color={PAL.cyan} intensity={9} distance={6.0} decay={1.8} />
                </group>
              )}
            </group>
          )}
        </group>

        <DustTrail
          t={t}
          from={21.0}
          to={40.0}
          rate={6}
          size={1.45}
          life={2.3}
          color="#d5bf96"
          path={(bt) => {
            const bx = tankPosX(bt) - 3.6;
            return [bx, H_DESERT_PAN(bx, 1.52), 1.52];
          }}
        />
        <DustTrail
          t={t}
          from={21.0}
          to={40.0}
          rate={6}
          size={1.45}
          life={2.3}
          color="#ccb58c"
          path={(bt) => {
            const bx = tankPosX(bt) - 3.6;
            return [bx, H_DESERT_PAN(bx, -1.52), -1.52];
          }}
        />
      </Stage>

      <Label
        t={t}
        text="M1A2 ABRAMS"
        x={330}
        y={925}
        from={CUE.c01_s02_m1a2}
        until={31.8}
        size={52}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="$15 MILLION"
        x={320}
        y={155}
        from={CUE.c01_s02_15m}
        until={38.75}
        size={52}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C01S02;
