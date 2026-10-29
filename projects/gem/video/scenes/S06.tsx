// Cảnh S06 (105.90 – 128.30s, thuần 3D):
// Bay bám cận cảnh Shahed136 (120–185 km/h) qua thung lũng đá sỏi wadi Rukban lúc chạng vạng:
// xoay mượt từ 3/4 sau (rõ cánh quạt đẩy 2 lá & 4 xi-lanh MD-550) sang ngang hông khi tên lửa siêu thanh rực lửa
// kèm Trail vàng sáng vọt qua tầng trời cao trong 1.4s (đỉnh điểm CUE.s06_hypersonic = 115.40s), rồi tiến lên 3/4 trước
// cận mũi đầu đạn, và từ 123.6s Shahed136 chúc nhẹ xuống khe thung lũng sát đất ~2.5 m cuốn bụi mỏng DustTrail ẩn dưới bóng đồi.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { prog, lerp } from '@kit/theme';
import { useT, Label } from '@kit/motion';
import { Stage, Cam, type V3 } from '@lib/3d/stage';
import { Terrain, Scatter, heightField } from '@lib/3d/terrain';
import { extrude, lathe } from '@lib/3d/geom';
import { plain } from '@lib/3d/materials';
import { DustTrail, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL2D, STAGE_PREDAWN, TERRAIN_PREDAWN } from '../local/palette';
import { Shahed136, SHAHED_CENTER_Y } from '../local/models';

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Đường tim khe thung lũng sông cạn (wadi) uốn nhẹ tự nhiên dọc trục +X. */
const wadiCenterZ = (x: number): number => Math.sin(x / 76) * 4.8;

/**
 * Địa hình sa mạc đá sỏi bazan Rukban:
 * - Nửa đầu (x < 260 m): lòng chảo sa mạc rộng mở với dãy đồi thấp ở xa để lộ rõ đường chân trời & bầu trời tầng cao rộng thoáng.
 * - Nửa cuối (x > 265 m, tương ứng t > 119.5s): hai bờ sườn đồi đá wadi khép gần tạo khe thung lũng sâu để Shahed chúc xuống ẩn mình.
 */
const wadiTerrainHeight = heightField({
  seed: 64,
  amp: 2.6,
  scale: 115,
  add: (x, z) => {
    const zc = wadiCenterZ(x);
    const dz = z - zc;
    const adz = Math.abs(dz);

    // Hệ số khép hẻm thung lũng wadi ở cuối cảnh (từ x = 250 m -> 370 m)
    const canyonIn = clamp((x - 250) / 120, 0, 1);
    const canyonSmooth = canyonIn * canyonIn * (3 - 2 * canyonIn);

    const floorHalfW = lerp(64, 14.0, canyonSmooth);
    const slopeSpan = lerp(65, 36, canyonSmooth);
    const maxWallH = lerp(12.5, 16.0, canyonSmooth);

    const wallU = clamp((adz - floorHalfW) / slopeSpan, 0, 1.25);
    const crag = (Math.sin(x * 0.09 + dz * 0.14) * 0.65 + Math.cos(x * 0.17 - dz * 0.11) * 0.45) * canyonSmooth;
    const wallH = (wallU * wallU * (2.4 - 0.85 * Math.min(1, wallU))) * maxWallH + crag * clamp(wallU * 1.5, 0, 1);

    // Làm phẳng mượt lòng rãnh đáy khe wadi nơi UAV sà xuống ~2.45 m
    const channelFloor = -1.9 * Math.exp(-((dz / 12.0) ** 2));

    // Gợn bậc đá bazan tự nhiên trên sườn đồi
    const terrace = Math.sin(adz * 0.24 + x * 0.035) * 0.95 * clamp((adz - floorHalfW) / 16, 0, 1);

    return wallH + channelFloor + terrace;
  },
});

const avoidWadiFlightFloor = (x: number, z: number): boolean => {
  return Math.abs(z - wadiCenterZ(x)) < 8.2;
};

/**
 * Quả đạn tên lửa siêu thanh (Hypersonic Boost-Glide Missile, dài ~5.6 m) rực plasma cam-trắng ở chóp mũi
 * và luồng lửa phản lực ở đuôi khi vụt qua bầu trời tầng cao trong 1.4 giây quanh CUE.s06_hypersonic (115.40s).
 */
const HypersonicMissile3D: React.FC = () => {
  const { bodyGeo, finGeo, shockConeGeo } = useMemo(() => {
    const body = lathe(
      [
        [0.01, -2.6],
        [0.24, -2.55],
        [0.27, -1.8],
        [0.26, -0.2],
        [0.22, 0.9],
        [0.14, 1.85],
        [0.055, 2.65],
        [0.004, 3.05],
      ],
      24,
    );
    const fin = extrude(
      [
        [-2.55, 0.22],
        [-2.35, 0.78],
        [-1.75, 0.72],
        [-1.05, 0.24],
      ],
      0.04,
      0.008,
    );
    const shock = new THREE.ConeGeometry(0.76, 4.2, 20, 1, true);
    shock.rotateZ(-Math.PI / 2);
    shock.translate(1.25, 0, 0);
    return { bodyGeo: body, finGeo: fin, shockConeGeo: shock };
  }, []);

  const bodyMat = useMemo(() => plain('#3c4652', 0.34, 0.72), []);
  const noseHotMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fff6cc',
        toneMapped: false,
      }),
    [],
  );
  const shockMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff9a3c',
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    [],
  );
  const plumeOuterMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ff8a2b',
        transparent: true,
        opacity: 0.88,
        toneMapped: false,
      }),
    [],
  );
  const plumeCoreMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#fffbe0',
        toneMapped: false,
      }),
    [],
  );

  return (
    <group>
      <mesh geometry={bodyGeo} material={bodyMat} />
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((ang, i) => (
        <group key={i} rotation={[ang, 0, 0]}>
          <mesh geometry={finGeo} material={bodyMat} />
        </group>
      ))}
      <mesh position={[2.45, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={noseHotMat}>
        <coneGeometry args={[0.19, 1.35, 18]} />
      </mesh>
      <mesh geometry={shockConeGeo} material={shockMat} />
      <mesh position={[-4.3, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plumeOuterMat}>
        <coneGeometry args={[0.46, 3.6, 16]} />
      </mesh>
      <mesh position={[-3.5, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plumeCoreMat}>
        <coneGeometry args={[0.26, 2.0, 14]} />
      </mesh>
    </group>
  );
};

const S06: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const SPEED_X = 19.5;
  const shahedPosAt = (sec: number): { pos: V3; yaw: number; pitch: number; bank: number; groundY: number } => {
    const dt = sec - 105.9;
    const x = dt * SPEED_X;
    const z = wadiCenterZ(x);
    const dzdx = (4.8 / 76) * Math.cos(x / 76);
    const d2zdx2 = -(4.8 / (76 * 76)) * Math.sin(x / 76);

    const gY = wadiTerrainHeight(x, z);
    // Từ CUE.s06_low_hide (123.60s), Shahed chúc nhẹ từ 12.5 m xuống sát khe thung lũng chỉ ~2.45 m trên mặt đất
    const descendP = prog(sec, 123.0, 125.6);
    const clearance = lerp(12.5, 2.45, descendP);
    const bob = Math.sin(sec * 2.1) * 0.11 * (1 - 0.55 * descendP);
    const y = gY + clearance + bob;

    const diveBell = Math.sin(descendP * Math.PI);
    const pitch = -0.15 * diveBell + Math.cos(sec * 2.1) * 0.012;
    const yaw = Math.atan2(-dzdx, 1);
    const bank = clamp(d2zdx2 * 210 + Math.sin(sec * 1.45) * 0.04, -0.22, 0.22);

    return { pos: [x, y, z], yaw, pitch, bank, groundY: gY };
  };

  const cur = shahedPosAt(t);
  const [sx, sy, sz] = cur.pos;

  // ---------- Góc máy Cam bám sát Shahed136 qua 4 pha mượt mà (luôn thấy trọn sải cánh & đường chân trời) ----------
  const pToSide = prog(t, 106.3, 113.2);
  const pToFront = prog(t, 117.0, 120.2);
  const pToValley = prog(t, 123.1, 125.8);

  // Góc máy đặt vừa tầm để nửa dưới là đồi đá sỏi trôi nhanh, nửa trên là bầu trời chạng vạng rõ ràng
  const offRear34: V3 = [-4.15, 0.42, 3.35];
  const offSideSky: V3 = [-0.15, -0.45, 5.15];
  const offFront34: V3 = [4.45, 0.45, 3.25];
  const offValleyHide: V3 = [-6.35, 1.65, 4.85];

  const lookRear34: V3 = [0.25, 0.12, -0.65];
  const lookSideSky: V3 = [0.65, 1.05, -3.2];
  const lookFront34: V3 = [-0.28, 0.04, -0.35];
  const lookValleyHide: V3 = [1.85, 0.08, -0.55];

  const mix3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
  const camOff = mix3(mix3(mix3(offRear34, offSideSky, pToSide), offFront34, pToFront), offValleyHide, pToValley);
  const lookOff = mix3(mix3(mix3(lookRear34, lookSideSky, pToSide), lookFront34, pToFront), lookValleyHide, pToValley);

  const camPos: V3 = [sx + camOff[0], sy + camOff[1], sz + camOff[2]];
  const camLook: V3 = [sx + lookOff[0], sy + lookOff[1], sz + lookOff[2]];
  const camFov = lerp(lerp(lerp(40, 44, pToSide), 39, pToFront), 43, pToValley);

  // ---------- Tên lửa siêu thanh ở tầng cao: vọt ngang bầu trời trong đúng 1.40 giây, cắt đỉnh đầu tại CUE.s06_hypersonic (115.40s) ----------
  const refAtHypersonic = useMemo(() => {
    const xRef = (CUE.s06_hypersonic - 105.9) * SPEED_X;
    const zRef = wadiCenterZ(xRef);
    const yRef = wadiTerrainHeight(xRef, zRef) + 12.5;
    return [xRef, yRef, zRef] as V3;
  }, []);

  const { missilePts, missileDirYaw, missileDirPitch } = useMemo(() => {
    const [rx, ry, rz] = refAtHypersonic;
    // Đặt cao hẳn trên tầng trời phía Bắc (-Z), tách bạch hoàn toàn khỏi đỉnh vây đứng Shahed & lệch trục nhìn camera
    const start: V3 = [rx - 28, ry + 10.5, rz - 26];
    const end: V3 = [rx + 72, ry + 17.2, rz - 16];
    const N = 56;
    const pts: V3[] = Array.from({ length: N }, (_, i) => {
      const s = i / (N - 1);
      return [lerp(start[0], end[0], s), lerp(start[1], end[1], s), lerp(start[2], end[2], s)];
    });
    const dx = end[0] - start[0];
    const dy = end[1] - start[1];
    const dz = end[2] - start[2];
    const yaw = Math.atan2(-dz, dx);
    const pitch = Math.atan2(dy, Math.hypot(dx, dz));
    return { missilePts: pts, missileDirYaw: yaw, missileDirPitch: pitch };
  }, [refAtHypersonic]);

  // Vọt vụt qua khung hình trong đúng 1.40 giây quanh mốc CUE.s06_hypersonic (115.40s, khớp chính xác SFX rocket @ 115.40s)
  const hypStart = 115.22;
  const hypEnd = hypStart + 1.40;
  const missileProg = (t - hypStart) / (hypEnd - hypStart);
  const trailUpto = clamp(missileProg, 0, 1);
  const trailFade = t <= hypEnd ? 1 : clamp(1 - (t - hypEnd) / 1.35, 0, 1);

  const missilePos: V3 = useMemo(() => {
    const u = clamp(missileProg, 0, 1);
    const a = missilePts[0];
    const b = missilePts[missilePts.length - 1];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  }, [missileProg, missilePts]);

  const propBlurMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#c4bdb0',
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [],
  );

  // Ánh sáng chạng vạng sa mạc (pha giữa STAGE_PREDAWN và lớp sương bụi thấp ở chân trời)
  const duskStage = useMemo(
    () => ({
      ...STAGE_PREDAWN,
      sky: ['#0f213b', '#3e6082', '#8e7c6a'] as [string, string, string],
      sun: [-46, 24, 38] as V3,
      sunColor: '#e6effe',
      sunIntensity: 2.55,
      ambient: 0.48,
      env: 0.54,
      exposure: 1.16,
      fog: [95, 420] as [number, number],
      fogColor: '#616c78',
    }),
    [],
  );

  return (
    <AbsoluteFill>
      <Stage {...duskStage} shadowArea={18} shadowCenter={[sx, cur.groundY, sz]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Phản xạ cát chạng vạng hắt nhẹ dưới bụng giúp rõ từng đinh tán & xi-lanh MD-550 */}
        <directionalLight position={[18, -14, 24]} color="#d1b692" intensity={0.56} />

        {/* Địa hình thung lũng wadi đá sỏi bazan Rukban */}
        <Terrain
          h={wadiTerrainHeight}
          size={1040}
          seg={224}
          center={[230, 0]}
          colors={{
            ...TERRAIN_PREDAWN,
            low: '#49515d',
            high: '#7c756a',
            rock: '#343b46',
            dry: '#998974',
          }}
          grainRepeat={54}
        />

        {/* Đá tảng bazan & đá dăm khô dọc hai bên triền thung lũng */}
        <Scatter
          kind="rock"
          count={320}
          area={[-80, -170, 540, 170]}
          h={wadiTerrainHeight}
          seed={67}
          scale={[0.5, 1.65]}
          avoid={avoidWadiFlightFloor}
          tint="#7d7a76"
        />
        <Scatter
          kind="rock"
          count={220}
          area={[-60, -130, 520, 130]}
          h={wadiTerrainHeight}
          seed={79}
          scale={[0.24, 0.55]}
          avoid={avoidWadiFlightFloor}
          tint="#595755"
        />
        <Scatter
          kind="bush"
          count={75}
          area={[-60, -140, 520, 140]}
          h={wadiTerrainHeight}
          seed={73}
          scale={[0.32, 0.62]}
          avoid={avoidWadiFlightFloor}
          tint="#db8b54"
        />

        {/* ==================== CHỦ THỂ CHÍNH: UAV CẢM TỬ SHAHED-136 ==================== */}
        <group position={[sx, sy - SHAHED_CENTER_Y, sz]} rotation={[0, cur.yaw, 0]}>
          <Shahed136
            propSpin={(t - 105.0) * 62}
            pitch={cur.pitch}
            bank={cur.bank}
          />
          <group position={[0, SHAHED_CENTER_Y, 0]} rotation={[0, 0, cur.pitch]}>
            <group rotation={[cur.bank, 0, 0]}>
              <mesh position={[-1.672, 0.028, 0]} rotation={[0, Math.PI / 2, 0]} material={propBlurMat}>
                <ringGeometry args={[0.07, 0.335, 28]} />
              </mesh>
            </group>
          </group>
        </group>

        {/* Vệt bụi cát mỏng cuốn lên sát mặt đất khi Shahed136 bay thấp ~2.5 m dưới đáy khe wadi (từ 123.5s) */}
        <DustTrail
          t={t}
          from={123.45}
          to={128.6}
          path={(sec) => {
            const st = shahedPosAt(sec);
            return [st.pos[0] - 1.6, st.groundY + 0.12, st.pos[2]];
          }}
          rate={18}
          size={1.65}
          color="#a89b88"
          life={2.3}
        />

        {/* ==================== TÊN LỬA SIÊU THANH VỌT QUA TẦNG CAO (115.40S) ==================== */}
        {trailUpto > 0.004 && trailFade > 0.01 && (
          <>
            <Trail
              points={missilePts}
              upto={trailUpto}
              color="#ffe680"
              width={0.28}
              opacity={0.96 * trailFade}
              glow
            />
            <Trail
              points={missilePts}
              upto={trailUpto}
              color="#ff7a26"
              width={0.54}
              opacity={0.36 * trailFade}
              glow
            />
          </>
        )}
        {missileProg >= 0 && missileProg <= 1.02 && (
          <group position={missilePos} rotation={[0, missileDirYaw, missileDirPitch]}>
            <HypersonicMissile3D />
          </group>
        )}
      </Stage>

      {/* Nhãn chữ: tối đa 1 <Label> tại mọi thời điểm */}
      <Label
        t={t}
        text="SHAHED"
        x={960}
        y={892}
        from={114.0}
        until={116.8}
        bg={PAL2D.threatMid}
        fg={PAL2D.paper}
      />
      <Label
        t={t}
        text="120–185 KM/H"
        x={960}
        y={892}
        from={CUE.s06_speed}
        until={122.8}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S06;
