import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { Label, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { MuzzleBlast, Trail } from '@lib/3d/fx';
import { pipe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Wheel } from '@lib/3d/parts';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { CUE } from '../cues';
import { Kinzhal, PAC3, PatriotLauncher, PatriotRadar, patriotMuzzlePos } from '../local/models';
import { PAL2D, PAL3D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';

// Địa hình đồi chỉ huy phòng không bình minh Đông Âu (tính 1 lần ở cấp module)
const H_COMMAND_HILL = heightField({
  seed: 15,
  amp: 5.2,
  scale: 115,
  flats: [
    [-13.6, -2.2, 7.5, 2.6], // Bãi đặt đài radar AN/MPQ-65
    [-2.0, 4.8, 6.5, 2.6],   // Bãi đặt xe trạm chỉ huy điều khiển hoả lực ECS
    [10.2, 0.8, 8.0, 2.6],   // Bãi đặt bệ phóng Patriot M903 chính
    [6.8, -14.0, 6.5, 2.3],  // Bãi đặt bệ phóng thứ hai phía sau khẩu đội
  ],
  add: (x, z) =>
    2.4 * Math.exp(-((x * x + z * z) / (46 * 46))) -
    3.8 * Math.exp(-(((x - 62) ** 2 + (z + 18) ** 2) / (58 * 58))),
});

const avoidBatteryPad = (x: number, z: number) =>
  Math.hypot(x + 1, z - 1) < 25.5 || (x > -10 && x < 25 && z > 6 && z < 40);

/** Xe trạm chỉ huy điều khiển hoả lực AN/MSQ-104 ECS dựng gọn bằng rbox quân sự + bánh lốp + cột ăng-ten liên lạc cao. */
const PatriotECS: React.FC<{
  position: V3;
  rotation?: V3;
  txPulse?: number;
}> = ({ position, rotation = [0, 0, 0], txPulse = 0 }) => {
  const camoBox = useMemo(
    () =>
      paint({
        color: PAL3D.usBase,
        camo: [PAL3D.usCamo2, PAL3D.usCamo1],
        camoScale: 1.05,
        wear: 0.22,
        dirt: 0.16,
        roughness: 0.68,
        metalness: 0.14,
        repeat: 1,
        seed: 91,
      }),
    [],
  );
  const darkMat = useMemo(() => plain(PAL3D.darkSteel, 0.5, 0.55), []);
  const steelMat = useMemo(() => plain(PAL3D.steel, 0.32, 0.8), []);
  const glassMat = useMemo(() => plain(PAL3D.glass, 0.18, 0.85), []);

  const cableGeo = useMemo(
    () =>
      pipe(
        [
          [-2.9, 3.45, -1.05],
          [-3.18, 3.55, -1.05],
          [-3.18, 5.85, -1.05],
        ],
        0.02,
        16,
      ),
    [],
  );

  return (
    <group position={position} rotation={rotation}>
      {/* Khung sắt-xi xe tải quân sự 6x6 (dài 7.8 m, mặt lốp chạm chuẩn y = 0) */}
      <mesh position={[0, 0.86, 0]} geometry={rbox(7.6, 0.24, 2.38, 0.03)} material={darkMat} castShadow receiveShadow />
      {/* 3 trục bánh xe địa hình r = 0.52 m */}
      {[-2.45, -1.15, 2.35].map((ax) => (
        <React.Fragment key={ax}>
          <Wheel r={0.52} width={0.34} tire={PAL3D.tire} rim="#536144" bolts={8} position={[ax, 0.52, 1.12]} />
          <Wheel r={0.52} width={0.34} tire={PAL3D.tire} rim="#536144" bolts={8} position={[ax, 0.52, -1.12]} />
        </React.Fragment>
      ))}

      {/* Cabin đầu xe (+X) + nắp ca-pô + kính chắn gió */}
      <mesh position={[2.85, 1.48, 0]} geometry={rbox(1.55, 1.02, 2.28, 0.06)} material={camoBox} castShadow receiveShadow />
      <mesh position={[1.82, 1.92, 0]} geometry={rbox(1.38, 1.76, 2.36, 0.06)} material={camoBox} castShadow receiveShadow />
      <mesh position={[2.53, 2.24, 0.54]} geometry={rbox(0.05, 0.54, 0.92, 0.02)} material={glassMat} />
      <mesh position={[2.53, 2.24, -0.54]} geometry={rbox(0.05, 0.54, 0.92, 0.02)} material={glassMat} />
      <mesh position={[3.64, 1.42, 0]} geometry={rbox(0.08, 0.58, 1.56, 0.02)} material={darkMat} />

      {/* Thùng shelter chỉ huy chiến thuật S-280 đặt sau lưng cabin */}
      <mesh position={[-1.08, 2.26, 0]} geometry={rbox(4.25, 2.38, 2.48, 0.05)} material={camoBox} castShadow receiveShadow />
      {/* Điều hoà ECU trước thùng shelter & máy phát phụ bên hông */}
      <mesh position={[0.62, 3.05, 0]} geometry={rbox(0.86, 0.68, 1.82, 0.04)} material={camoBox} castShadow />
      <mesh position={[-1.1, 1.15, 1.24]} geometry={rbox(1.25, 0.42, 0.36, 0.03)} material={darkMat} castShadow />
      {/* Các nẹp gân gia cường và cửa hậu trạm ECS */}
      {[-2.8, -1.65, -0.5, 0.65].map((rx) => (
        <mesh key={rx} position={[rx, 2.26, 1.255]} geometry={rbox(0.06, 2.28, 0.04, 0.01)} material={darkMat} />
      ))}
      <mesh position={[-3.22, 2.18, 0]} geometry={rbox(0.04, 1.75, 1.02, 0.02)} material={darkMat} />

      {/* Trụ ăng-ten liên lạc & truyền dữ liệu hoả lực VHF/UHF vươn cao ở góc thùng chỉ huy */}
      <group position={[-3.18, 1.2, -1.05]}>
        <mesh position={[0, 1.4, 0]} material={darkMat} castShadow>
          <cylinderGeometry args={[0.075, 0.095, 2.8, 14]} />
        </mesh>
        <mesh position={[0, 3.85, 0]} material={steelMat} castShadow>
          <cylinderGeometry args={[0.042, 0.062, 2.4, 12]} />
        </mesh>
        {/* Chùm chấn tử chữ thập trên đỉnh cột ăng-ten (y ~ 6.35 m) */}
        <mesh position={[0, 4.95, 0]} geometry={rbox(1.15, 0.035, 0.035, 0.008)} material={steelMat} />
        <mesh position={[0, 4.95, 0]} geometry={rbox(0.035, 0.035, 1.15, 0.008)} material={steelMat} />
        <mesh position={[0, 5.25, 0]} material={steelMat}>
          <cylinderGeometry args={[0.018, 0.026, 0.7, 10]} />
        </mesh>
        {/* Đèn xung truyền lệnh điều khiển hoả lực */}
        {txPulse > 0.02 && (
          <mesh position={[0, 5.58, 0]}>
            <sphereGeometry args={[0.16 + txPulse * 0.14, 16, 12]} />
            <meshBasicMaterial
              color={PAL3D.cyanBeam}
              transparent
              opacity={0.45 + 0.5 * txPulse}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        )}
      </group>
      <mesh geometry={cableGeo} material={darkMat} />
    </group>
  );
};

const RADAR_POS: V3 = [-13.6, H_COMMAND_HILL(-13.6, -2.2), -2.2];
const ECS_POS: V3 = [-2.0, H_COMMAND_HILL(-2.0, 4.8), 4.8];
const LAUNCHER_POS: V3 = [10.2, H_COMMAND_HILL(10.2, 0.8), 0.8];
const LAUNCHER2_POS: V3 = [6.8, H_COMMAND_HILL(6.8, -14.0), -14.0];

const LAUNCH_ELEV = 38;
const LAUNCH_AZ = 0;

const S15: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // ---------------- 1. Đài radar mảng pha AN/MPQ-65 đứng yên hoàn toàn, quét chùm tia điện tử cực nhanh ----------------
  const lockP = prog(t, 270.55, 270.88, Easing.out(Easing.cubic));
  const scanYaw = Math.sin(t * 9) * 0.42;
  const scanPitch = 0.35 + Math.cos(t * 7) * 0.18;
  const beamYaw = lerp(scanYaw, 0.04, lockP);
  const beamPitch = lerp(scanPitch, 0.55, lockP);
  const activeGlow = 0.85 + 0.12 * Math.sin(t * 8.5) + 0.22 * lockP;

  // ---------------- 2. Đường truyền dữ liệu mục tiêu: Radar -> Trạm chỉ huy ECS -> Bệ phóng Patriot ----------------
  const link1Pts = useMemo<V3[]>(() => {
    const a: V3 = [RADAR_POS[0] - 0.8, RADAR_POS[1] + 3.2, RADAR_POS[2] + 1.1];
    const b: V3 = [ECS_POS[0] - 2.9, ECS_POS[1] + 6.4, ECS_POS[2] - 1.2];
    return Array.from({ length: 28 }, (_, i) => {
      const s = i / 27;
      return [
        lerp(a[0], b[0], s),
        lerp(a[1], b[1], s) + Math.sin(s * Math.PI) * 1.6,
        lerp(a[2], b[2], s),
      ];
    });
  }, []);

  const link2Pts = useMemo<V3[]>(() => {
    const a: V3 = [ECS_POS[0] - 2.9, ECS_POS[1] + 6.4, ECS_POS[2] - 1.2];
    const b: V3 = [LAUNCHER_POS[0] - 1.2, LAUNCHER_POS[1] + 2.2, LAUNCHER_POS[2] + 0.8];
    return Array.from({ length: 28 }, (_, i) => {
      const s = i / 27;
      return [
        lerp(a[0], b[0], s),
        lerp(a[1], b[1], s) + Math.sin(s * Math.PI) * 1.4,
        lerp(a[2], b[2], s),
      ];
    });
  }, []);

  const pLink1 = prog(t, 271.1, 273.3, (x) => x);
  const pLink2 = prog(t, 273.4, 276.2, (x) => x);
  const linkFade = 1 - prog(t, 276.6, 277.5);
  const ecsPulse =
    t >= 271.1 && t <= 276.8 ? 0.55 + 0.45 * Math.sin((t - 271.1) * 16) : 0;

  // ---------------- 3. Mục tiêu Kinzhal bổ nhào ở tầng cao phía xa khi radar bắt dính (270.74s) ----------------
  const kinzhalP = prog(t, 270.5, 278.1, (x) => x);
  const kinzhalPos: V3 = [
    lerp(96, 68, kinzhalP),
    lerp(66, 46, kinzhalP),
    lerp(-5, -2.5, kinzhalP),
  ];

  // ---------------- 4. Khai hoả PAC-3 tại CUE.s15_pac3_launch (276.6s) ----------------
  const muzLocal = useMemo(() => patriotMuzzlePos(LAUNCH_ELEV, LAUNCH_AZ, 0), []);
  const muzWorld: V3 = [
    LAUNCHER_POS[0] + muzLocal[0],
    LAUNCHER_POS[1] + muzLocal[1],
    LAUNCHER_POS[2] + muzLocal[2],
  ];
  const elevRad = (LAUNCH_ELEV * Math.PI) / 180;
  const launchDir: V3 = [Math.cos(elevRad), Math.sin(elevRad), 0];

  const fired = t >= CUE.s15_pac3_launch;
  const fireDt = Math.max(0, t - CUE.s15_pac3_launch);
  // Tốc độ vọt khỏi ống phóng được căn chính xác để tại 278.1s (dt = 1.5s) cả trận địa lẫn quả PAC-3 đều trọn vẹn trong khung hình rộng
  const pacDist = -0.9 + 9.5 * fireDt + 4.4 * fireDt * fireDt;
  const pacPitch = elevRad + 0.05 * Math.min(1, fireDt / 1.5);
  const pacPos: V3 = [
    muzWorld[0] + Math.cos(pacPitch) * pacDist,
    muzWorld[1] + Math.sin(pacPitch) * pacDist,
    muzWorld[2],
  ];

  const pacTrailPts = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    for (let i = 0; i <= 32; i++) {
      const d = (i / 32) * 24.5;
      const p = elevRad + 0.05 * (i / 32);
      pts.push([
        muzWorld[0] + Math.cos(p) * Math.max(0, d - 2.2),
        muzWorld[1] + Math.sin(p) * Math.max(0, d - 2.2),
        muzWorld[2],
      ]);
    }
    return pts;
  }, [muzWorld[0], muzWorld[1], muzWorld[2], elevRad]);
  const pacTrailUpto = prog(t, CUE.s15_pac3_launch + 0.12, 278.1, (x) => x);

  // ---------------- 5. Chuyển động Camera <Cam>: Cận mặt mảng pha AN/MPQ-65 -> Kéo lùi toàn trận địa & cú phóng PAC-3 ----------------
  // Tâm mặt bát giác nghiêng 20° của PatriotRadar trong thế giới:
  const faceCenter: V3 = [RADAR_POS[0] + 3.35, RADAR_POS[1] + 2.98, RADAR_POS[2]];

  const pPushLens = prog(t, 252.0, 259.6, Easing.bezier(0.35, 0, 0.2, 1));
  const pArcLens = prog(t, 259.6, 270.4, (x) => x);
  const pPullWide = prog(t, 270.55, 275.0, Easing.bezier(0.42, 0, 0.18, 1));
  const pTrackFire = prog(t, 276.4, 278.1, Easing.out(Easing.cubic));

  // Pha cận cảnh (252.0 – 270.5s): đẩy sát vào mặt phẳng bát giác nghiêng 20° và thấu kính >5.000 phần tử (chừa khoảng trời trên cho nhãn)
  const closeStartPos: V3 = [RADAR_POS[0] + 9.4, RADAR_POS[1] + 2.6, RADAR_POS[2] + 5.8];
  const closeMidPos: V3 = [faceCenter[0] + 5.55, faceCenter[1] + 0.35, faceCenter[2] + 2.35];
  const closeEndPos: V3 = [faceCenter[0] + 5.45, faceCenter[1] + 0.55, faceCenter[2] - 1.45];

  const lerpV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

  let camClosePos = lerpV3(closeStartPos, closeMidPos, pPushLens);
  camClosePos = lerpV3(camClosePos, closeEndPos, pArcLens);
  const camCloseLook = lerpV3(
    [RADAR_POS[0] + 1.2, RADAR_POS[1] + 2.45, RADAR_POS[2]],
    [faceCenter[0], faceCenter[1] + 0.22, faceCenter[2]],
    pPushLens,
  );

  // Pha đại cảnh trận địa (270.7 – 278.1s): kéo lùi qua trạm ECS mở trọn Radar + ECS + Bệ phóng M903 + đường đạn PAC-3
  const widePos: V3 = [3.8, 11.4, 39.5];
  const wideFirePos: V3 = [5.8, 12.0, 41.2];
  const wideLook: V3 = [1.0, 6.8, 0.0];
  const wideFireLook: V3 = [7.8, 12.2, 0.5];

  const camWidePos = lerpV3(widePos, wideFirePos, pTrackFire);
  const camWideLook = lerpV3(wideLook, wideFireLook, pTrackFire);

  const camPos = lerpV3(camClosePos, camWidePos, pPullWide);
  const camLook = lerpV3(camCloseLook, camWideLook, pPullWide);
  const fov = lerp(lerp(39, 35, pPushLens), 45, pPullWide);

  const shadowCenter: V3 = pPullWide > 0.45 ? [1.5, 2.6, 0.5] : [RADAR_POS[0] + 1.5, RADAR_POS[1] + 2.0, RADAR_POS[2]];

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: '#1d3e66' }}>
      <Stage
        {...STAGE_DAWN}
        shadowCenter={shadowCenter}
        shadowArea={pPullWide > 0.45 ? 36 : 16}
      >
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Đồi chỉ huy phòng không thảo nguyên bình minh */}
        <Terrain h={H_COMMAND_HILL} size={560} seg={220} colors={TERRAIN_STEPPE} />
        <Scatter
          kind="pine"
          count={120}
          area={[-180, -170, 190, 140]}
          h={H_COMMAND_HILL}
          seed={151}
          scale={[0.85, 1.45]}
          avoid={avoidBatteryPad}
          tint="#b8c8b4"
        />
        <Scatter
          kind="bush"
          count={160}
          area={[-140, -130, 150, 120]}
          h={H_COMMAND_HILL}
          seed={152}
          scale={[0.7, 1.3]}
          avoid={avoidBatteryPad}
          tint="#9fb092"
        />
        <Scatter
          kind="rock"
          count={75}
          area={[-120, -110, 130, 100]}
          h={H_COMMAND_HILL}
          seed={153}
          scale={[0.6, 1.35]}
          avoid={avoidBatteryPad}
        />

        {/* Đài radar mảng pha AN/MPQ-65 đứng yên tuyệt đối, lái tia hoàn toàn bằng điện tử */}
        <PatriotRadar
          position={RADAR_POS}
          azimuth={0}
          activeGlow={activeGlow}
          showBeam
          beamAngle={[beamYaw, beamPitch]}
        />

        {/* Xe trạm chỉ huy điều khiển hoả lực AN/MSQ-104 ECS ở trung tâm trận địa */}
        <PatriotECS
          position={ECS_POS}
          rotation={[0, 0.34, 0]}
          txPulse={ecsPulse}
        />

        {/* Bệ phóng Patriot M903 chính (khai hoả tại 276.6s) + bệ phóng thứ hai bảo vệ sườn */}
        <PatriotLauncher
          position={LAUNCHER_POS}
          azimuth={LAUNCH_AZ}
          elev={LAUNCH_ELEV}
          loadedCount={fired ? 15 : 16}
        />
        <PatriotLauncher
          position={LAUNCHER2_POS}
          rotation={[0, 0.14, 0]}
          azimuth={0}
          elev={38}
          loadedCount={16}
        />

        {/* Xung đường truyền dữ liệu hoả lực loé sáng từ Radar -> Trạm chỉ huy ECS -> Bệ phóng M903 */}
        {pLink1 > 0.01 && linkFade > 0.01 && (
          <Trail
            points={link1Pts}
            upto={pLink1}
            color={PAL3D.cyanBeam}
            width={0.09}
            opacity={0.88 * linkFade}
            glow
          />
        )}
        {pLink2 > 0.01 && linkFade > 0.01 && (
          <Trail
            points={link2Pts}
            upto={pLink2}
            color="#5ff2ff"
            width={0.1}
            opacity={0.92 * linkFade}
            glow
          />
        )}

        {/* Mục tiêu Kinzhal nóng đỏ plasma đang bổ nhào từ tầng cao lúc radar khoá chùm sóng */}
        {t >= 270.5 && (
          <group>
            <Kinzhal
              position={kinzhalPos}
              rotation={[0, 0, -2.52]}
              plume={0}
              heatGlow={1}
              scale={1.15}
            />
            <Trail
              points={[
                [99, 68, -5.2],
                [lerp(99, kinzhalPos[0], 0.5), lerp(68, kinzhalPos[1], 0.5), lerp(-5.2, kinzhalPos[2], 0.5)],
                kinzhalPos,
              ]}
              upto={1}
              color="#ff6b2b"
              width={0.22}
              opacity={0.78}
              glow
            />
          </group>
        )}

        {/* Lửa khói đầu ống phóng & tên lửa đánh chặn PAC-3 phóng vọt lên trời lúc 276.6s */}
        <MuzzleBlast
          t={t}
          at={CUE.s15_pac3_launch}
          pos={muzWorld}
          dir={launchDir}
          size={2.15}
          seed={15}
        />
        {/* Khói phụt phản lực gọn phía sau đuôi ống phóng M903 (không che khuất xe ECS) */}
        <MuzzleBlast
          t={t}
          at={CUE.s15_pac3_launch}
          pos={[LAUNCHER_POS[0] - 2.3, LAUNCHER_POS[1] + 1.5, LAUNCHER_POS[2] + 0.4]}
          dir={[-0.85, -0.2, -0.25]}
          size={1.05}
          seed={29}
        />

        {fired && (
          <>
            <Trail
              points={pacTrailPts}
              upto={pacTrailUpto}
              color="#ffc35c"
              width={0.26}
              opacity={0.95}
              glow
            />
            <PAC3
              position={pacPos}
              rotation={[0, 0, pacPitch]}
              plume={1.2}
            />
          </>
        )}
      </Stage>

      {/* Nhãn (tối đa 1 nhãn trên màn hình mỗi thời điểm, đặt thoáng ở góc trời trên không đè vào mặt radar) */}
      <Label
        t={t}
        text="AN/MPQ-65"
        x={960}
        y={102}
        from={CUE.s15_an_mpq65}
        until={264.1}
        size={52}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="> 5.000 PHẦN TỬ"
        x={960}
        y={102}
        from={CUE.s15_elements_5000}
        until={269.6}
        size={50}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </div>
  );
};

export default S15;
