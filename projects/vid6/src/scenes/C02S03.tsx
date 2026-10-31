import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter, heightField } from '@skill/military/3d/terrain';
import { MuzzleBlast, Trail } from '@skill/military/3d/fx';
import { rbox, type P2 } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_PROVING_NOON } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';

const PAD_Y = 0.56;
const GUN_PITCH = 0.012;
const MUZZLE_POS: V3 = [5.72, PAD_Y + 1.91, 0];

// Địa hình trường bắn thử nghiệm đạn đạo trưa nắng gắt:
// Bệ bắn phẳng tại x=0, hành lang bay phẳng dọc +X, hai đê đất chắn đạn hai bên và dãy núi sa mạc xa phía bắc (-Z)
const H_PROVING = heightField({
  seed: 203,
  amp: 2.4,
  scale: 110,
  flats: [[0, 0, 13, PAD_Y]],
  add: (x, z) => {
    const laneMask = Math.exp(-Math.pow(z / 8.5, 4));
    const laneFlat = -1.1 * laneMask * (x > 8 ? 1 : 0);
    const bermN = x > 10 ? 3.2 * Math.exp(-Math.pow((z + 15.5) / 4.2, 2)) : 0;
    const bermS = x > 14 ? 2.6 * Math.exp(-Math.pow((z - 18.5) / 4.5, 2)) : 0;
    const farRidge =
      19.0 * Math.exp(-Math.pow((z + 96) / 26, 2)) * (0.75 + 0.25 * Math.sin(x * 0.035)) +
      12.0 * Math.exp(-Math.pow((z + 62) / 18, 2)) * (0.7 + 0.3 * Math.cos(x * 0.05 + 1.2));
    return laneFlat + bermN + bermS + farRidge;
  },
});

const avoidFiringLane = (x: number, z: number) =>
  (Math.abs(z) < 11.5 && x > -18 && x < 310) || Math.hypot(x, z) < 18;

// Các cổng đo sơ tốc quang học (chronograph gates) & cọc mốc cự ly dọc hành lang trường bắn (-Z)
const RANGE_STATIONS = Array.from({ length: 21 }, (_, i) => 18 + i * 13);

const ProvingRangeMarkers: React.FC = () => {
  const steelMat = plain('#3a424c', 0.48, 0.62);
  const concreteMat = plain('#9e9585', 0.88, 0.05);
  const orangeMat = plain('#e05a24', 0.52, 0.15);
  const whiteMat = plain('#ece6d8', 0.55, 0.1);
  const sensorMat = plain('#1c2530', 0.3, 0.75);

  return (
    <group>
      {/* Vệt đường cấp phối sỏi nén dọc tuyến bắn */}
      <mesh position={[145, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]} material={plain('#9c805c', 0.96, 0.02)} receiveShadow>
        <planeGeometry args={[280, 6.4]} />
      </mesh>

      {RANGE_STATIONS.map((rx, idx) => {
        const gy = H_PROVING(rx, -3.8);
        const isMajorGate = idx % 2 === 0;
        return (
          <group key={idx} position={[rx, gy, -3.8]}>
            <mesh position={[0, 0.22, 0]} geometry={rbox(0.75, 0.44, 0.65, 0.04)} material={concreteMat} castShadow receiveShadow />
            <mesh position={[0, 1.05, 0]} geometry={rbox(0.16, 1.25, 0.16, 0.02)} material={whiteMat} castShadow />
            <mesh position={[0, 1.95, 0]} geometry={rbox(0.165, 0.65, 0.165, 0.02)} material={orangeMat} castShadow />
            <mesh position={[0, 2.55, 0]} geometry={rbox(0.16, 0.55, 0.16, 0.02)} material={whiteMat} castShadow />
            <mesh position={[0, 3.05, 0]} geometry={rbox(0.165, 0.45, 0.165, 0.02)} material={orangeMat} castShadow />

            {isMajorGate && (
              <group position={[0, 0, -1.6]}>
                <mesh position={[0, 1.85, -1.8]} geometry={rbox(0.18, 3.5, 0.18, 0.02)} material={steelMat} castShadow />
                <mesh position={[0, 3.52, -0.1]} geometry={rbox(0.22, 0.18, 3.65, 0.02)} material={steelMat} castShadow />
                <mesh position={[0, 0.34, 0.5]} geometry={rbox(0.42, 0.28, 1.8, 0.03)} material={sensorMat} castShadow />
              </group>
            )}

            <mesh
              position={[0, 0.45, -4.8]}
              geometry={rbox(4.2, 0.9, 0.55, 0.06)}
              material={concreteMat}
              castShadow
              receiveShadow
            />
          </group>
        );
      })}
    </group>
  );
};

// Biên dạng mảnh cánh sabot composite văng tụt hẳn lại phía sau sau khi sabotSep đạt 1.0 (t > 228.55s)
const DETACHED_PETAL_PROFILE: P2[] = [
  [0.034, -0.1],
  [0.058, -0.04],
  [0.046, 0.04],
  [0.055, 0.14],
  [0.058, 0.23],
  [0.024, 0.18],
  [0.015, -0.09],
];

const RecedingSabotPetals: React.FC<{ extraSep: number; rollBase: number }> = ({ extraSep, rollBase }) => {
  const petalGeo = useMemo(() => {
    const g = new THREE.LatheGeometry(
      DETACHED_PETAL_PROFILE.map(([r, y]) => new THREE.Vector2(r, y)),
      14,
      -0.98,
      1.96,
    );
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);

  const compositeMat = plain('#2a303a', 0.34, 0.38);
  if (extraSep <= 0 || extraSep > 1.8) return null;

  const radial = 0.21 + extraSep * 0.34;
  const axial = -0.14 - extraSep * 4.5;
  const peelAngle = 0.68 + extraSep * 1.9;

  return (
    <group rotation={[rollBase, 0, 0]}>
      {[0, 1, 2].map((i) => (
        <group key={i} rotation={[(i * Math.PI * 2) / 3, 0, 0]}>
          <group position={[axial - 0.08, radial, 0]} rotation={[extraSep * 0.55, 0, peelAngle]}>
            <group position={[0.08, 0, 0]}>
              <mesh geometry={petalGeo} material={compositeMat} castShadow />
            </group>
          </group>
        </group>
      ))}
    </group>
  );
};

// Sợi khí động mảnh sắc nét thoát ra từ 3 mép cánh sabot lúc xé gió bung tách (không phủ nón mờ đè làm đục kim loại đạn!)
const SabotSlipstreamThreads: React.FC<{ sabotSep: number; detachP: number }> = ({
  sabotSep,
  detachP,
}) => {
  const active = Math.sin(Math.min(1, sabotSep) * Math.PI) * (1 - detachP);
  if (sabotSep <= 0.04 || active <= 0.02) return null;

  return (
    <group>
      {[0, 1, 2].map((i) => {
        const ang = (i * Math.PI * 2) / 3;
        const r = 0.062 + sabotSep * 0.22;
        const x = 0.04 - sabotSep * 0.22;
        return (
          <mesh
            key={i}
            position={[x, Math.cos(ang) * r, Math.sin(ang) * r]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.002, 0.009, 0.42, 8]} />
            <meshBasicMaterial
              color="#fff6e0"
              transparent
              opacity={0.45 * active}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        );
      })}
    </group>
  );
};

const C02S03: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // 1. Khai hoả pháo M256 120mm đầu cảnh (Leaving@218.10) + dư chấn lửa đầu nòng
  const fireAt = CUE.c02_s03_muzzle_fire;
  const dtFire = t - fireAt;
  const recoilKick =
    dtFire < 0
      ? 0
      : dtFire < 0.08
        ? dtFire / 0.08
        : Math.max(0, 1 - (dtFire - 0.08) / 0.72);
  const hullRock = -0.016 * bump(t, fireAt, 0.6);

  // 2. Hành trình bay Mach 5 dọc tuyến bắn trường bắn (tăng tốc bullet-time C1 mượt 0.7s đầu khỏi đầu nòng rồi giữ tốc độ hành trình 20.6 m/s)
  const flightDt = Math.max(0, dtFire);
  const rampT = 0.7;
  const v0 = 6.8;
  const v1 = 20.6;
  const flightDist =
    flightDt <= rampT
      ? v0 * flightDt + 0.5 * (v1 - v0) * ((flightDt * flightDt) / rampT)
      : 0.5 * (v0 + v1) * rampT + v1 * (flightDt - rampT);
  const dartX = MUZZLE_POS[0] + flightDist;
  const dartY = MUZZLE_POS[1] + flightDist * 0.0018;
  const dartPos: V3 = [dartX, dartY, 0];

  // Tỉ lệ 1.32 cân đối: đủ lớn để rõ từng rãnh cản gió & răng cưa sabot, đồng thời giữ trọn 100% cả 3 cánh khi bung xoè cực đại
  const dartScale = lerp(1.0, 1.32, prog(t, fireAt + 0.25, fireAt + 1.15));
  const dartRoll = 0.38 + flightDt * 0.85;

  // 3. Tách 3 cánh sabot (three@225.90 -> sabot@226.66 -> peel@227.46)
  // Tại 225.80s bắt đầu hé tách (~0.18), tới 228.1..228.48s bung xoè 120° trọn vẹn trong khung, sau 228.52s tụt nhanh về phía sau (-X) để lộ mũi lao đặc
  const preCrack = prog(t, 225.55, CUE.c02_s03_three_petals);
  const mainPeel = prog(t, CUE.c02_s03_three_petals, 228.48);
  const sabotSep = Math.min(1, preCrack * 0.18 + mainPeel * 0.82);

  const isDetached = t > 228.52;
  const extraDetach = Math.max(0, t - 228.52);
  const detachFade = prog(t, 228.52, 229.05);

  // 4. Vệt sáng <Trail> bám chính xác vào hạt vạch đường (tracer) ở đuôi thanh xuyên DU
  const tailOffset = 0.398 * dartScale;
  const tailX = dartX - tailOffset;
  const trailKey = Math.round(flightDt * 60);
  const trailPts = useMemo<V3[]>(() => {
    if (tailX <= MUZZLE_POS[0] + 0.15) {
      return [MUZZLE_POS, [MUZZLE_POS[0] + 0.2, MUZZLE_POS[1], 0]];
    }
    const startX = Math.max(MUZZLE_POS[0], tailX - 30);
    const steps = 24;
    return Array.from({ length: steps }, (_, i) => {
      const u = i / (steps - 1);
      const px = lerp(startX, tailX, u);
      const py = MUZZLE_POS[1] + (px - MUZZLE_POS[0]) * 0.0018;
      return [px, py, 0];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trailKey]);

  // 5. Ngôn ngữ camera nội suy thuần vector độ lệch tương đối (offPos, offLook) neo trực tiếp vào [dartX, dartY, 0]:
  // -> Đảm bảo dartX - camLook.x <= 1.05m tại mọi thời điểm (viên đạn KHÔNG BAO GIỜ trượt khỏi khung ở pha chuyển máy ~218.6..219.6s)
  // - 218.10..219.15s: Chuyển mượt từ góc 3/4 thấy trọn M1A2 khai hoả + đạn vọt khỏi chớp lửa sang góc bám chéo hông đạn
  // - 225.30..228.95s: Lùi máy z=2.52m để cả 3 cánh sabot bung xoè cực đại nằm gọn 100% trong khung (dư ~37% biên trên/dưới) cho tới khi tụt khuất ra sau
  // - 228.95..231.20s: Ép cận góc chéo ~34° vào riêng thanh DU đặc nguyên khối không thuốc nổ (solid@228.96 -> zero@230.00)
  const catchP = prog(t, fireAt + 0.12, fireAt + 1.05);
  const peelFrameP = prog(t, 225.3, 227.3);
  const solidCloseP = prog(t, 228.95, 230.05);

  const launchOffPos: V3 = [5.48, 0.58, 6.1];
  const launchOffLook: V3 = [-1.05, -0.18, 0.0];

  const trackOffPos: V3 = [
    lerp(lerp(1.12, 1.46, peelFrameP), 1.05, solidCloseP),
    lerp(lerp(0.22, 0.26, peelFrameP), 0.16, solidCloseP),
    lerp(lerp(1.68, 2.52, peelFrameP), 0.72, solidCloseP),
  ];
  const trackOffLook: V3 = [
    lerp(-0.03, 0.05, solidCloseP),
    -0.02,
    lerp(-0.04, -0.02, solidCloseP),
  ];

  const camPos: V3 = [
    dartX + lerp(launchOffPos[0], trackOffPos[0], catchP),
    dartY + lerp(launchOffPos[1], trackOffPos[1], catchP),
    lerp(launchOffPos[2], trackOffPos[2], catchP),
  ];
  const camLook: V3 = [
    dartX + lerp(launchOffLook[0], trackOffLook[0], catchP),
    dartY + lerp(launchOffLook[1], trackOffLook[1], catchP),
    lerp(launchOffLook[2], trackOffLook[2], catchP),
  ];
  const fov = lerp(lerp(38, lerp(35, 36, peelFrameP), catchP), 32, solidCloseP);

  const shadowCenter: V3 = [
    dartX + lerp(-2.6, 0, catchP),
    dartY + lerp(-0.8, 0, catchP),
    0,
  ];
  const shadowArea = lerp(24, 6.5, catchP);

  // Quầng lửa dư chấn đầu nòng kéo dài ~0.42s để bắt rõ uy lực phát bắn M256 ở đầu cảnh
  const residualMuzzleGlow =
    dtFire >= 0 && dtFire < 0.46 ? Math.pow(1 - dtFire / 0.46, 1.6) : 0;

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_PROVING_NOON.stage}
        shadowCenter={shadowCenter}
        shadowArea={shadowArea}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        <Terrain
          h={H_PROVING}
          size={540}
          seg={240}
          center={[135, -10]}
          colors={LOOK_PROVING_NOON.terrain}
          grainRepeat={48}
        />
        <Scatter
          kind="rock"
          count={140}
          area={[-35, -75, 310, 55]}
          h={H_PROVING}
          seed={31}
          scale={[0.5, 1.35]}
          avoid={avoidFiringLane}
          tint={LOOK_PROVING_NOON.scatterTint}
        />
        <Scatter
          kind="bush"
          count={95}
          area={[-35, -65, 300, 48]}
          h={H_PROVING}
          seed={47}
          scale={[0.55, 1.15]}
          avoid={avoidFiringLane}
          tint="#b9a374"
        />
        <ProvingRangeMarkers />

        {/* Xe tăng M1A2 Abrams SEPv3 trên bệ bắn trường bắn khai hoả pháo M256 120mm */}
        <M1A2Abrams
          position={[0, PAD_Y, 0]}
          variant="sepv3"
          camo="desert"
          gunPitch={GUN_PITCH}
          recoil={recoilKick}
          hullPitch={hullRock}
          travel={0}
        />

        {/* Chớp lửa + sóng khói đầu nòng M256 */}
        <MuzzleBlast
          t={t}
          at={fireAt - 0.01}
          pos={MUZZLE_POS}
          dir={[Math.cos(GUN_PITCH), Math.sin(GUN_PITCH), 0]}
          size={2.35}
          seed={12}
        />
        {/* Nhịp chớp phụ thoát khí buồng nòng 0.24s sau phát bắn để đầu cảnh rực lửa rõ nét */}
        <MuzzleBlast
          t={t}
          at={fireAt + 0.24}
          pos={[MUZZLE_POS[0] + 0.35, MUZZLE_POS[1], 0]}
          dir={[Math.cos(GUN_PITCH), Math.sin(GUN_PITCH), 0]}
          size={1.75}
          seed={18}
        />
        {residualMuzzleGlow > 0.01 && (
          <pointLight
            color="#ffb84d"
            intensity={220 * residualMuzzleGlow}
            distance={22}
            decay={1.5}
            position={[MUZZLE_POS[0] + 0.9, MUZZLE_POS[1] + 0.2, 0.4]}
          />
        )}

        {/* Viên đạn xuyên động năng M829A4 bay Mach 5 + 3 cánh sabot bung tách cực nét + vệt <Trail> */}
        {dtFire >= -0.01 && (
          <>
            {tailX > MUZZLE_POS[0] + 0.25 && (
              <>
                <Trail
                  points={trailPts}
                  upto={1}
                  color={PAL.amberHot}
                  width={0.036}
                  opacity={0.95}
                  glow
                />
                <Trail
                  points={trailPts}
                  upto={1}
                  color={PAL.amber}
                  width={0.095}
                  opacity={0.34}
                  glow
                />
              </>
            )}

            <group position={dartPos} rotation={[0, 0, GUN_PITCH * 0.25]}>
              <group scale={dartScale}>
                {!isDetached ? (
                  <Ammo120mm3D
                    kind="m829a4_flight"
                    sabotSep={sabotSep}
                    rotation={[dartRoll, 0, 0]}
                  />
                ) : (
                  <>
                    <Ammo120mm3D
                      kind="du_dart"
                      rotation={[dartRoll, 0, 0]}
                    />
                    <RecedingSabotPetals
                      extraSep={extraDetach}
                      rollBase={dartRoll}
                    />
                  </>
                )}

                <group rotation={[dartRoll, 0, 0]}>
                  <SabotSlipstreamThreads
                    sabotSep={sabotSep}
                    detachP={detachFade}
                  />
                </group>
              </group>
            </group>
          </>
        )}
      </Stage>

      {/* Nhãn thông số duy nhất đúng mốc Mach@222.58..225.45s (tắt dứt khoát trước nhịp tách sabot 225.80s) */}
      <Label
        t={t}
        text="MACH 5"
        x={W * 0.22}
        y={H * 0.17}
        from={CUE.c02_s03_mach5}
        until={225.45}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C02S03;
