// Cảnh C02S03 (186.38–205.64 s) — THUẦN 3D Bão khơi Tây Thái Bình Dương (STAGE_PRESETS.stormDawn, swell = 3.9):
// - Toàn bộ 16 chiếc B-25B cải hoán (lowerTurret=false, broomsticks=true, chained=true) nhồi kín từ đuôi tàu lên tới chiếc #1 của Doolittle tại [-16.6, HORNET_DECK_Y, HORNET_B25_Z] mà không chiếc nào đè cánh lên nhau.
// - 186.38–193.2 s: Camera mở từ đuôi cao bao quát cả 16 chiếc rồi bay vút dọc sống tàu mở ra 467 ft sàn ướt phía trước ("467 FT DECK · 60 FT DROP").
// - 193.2–196.2 s: Lao vọt qua mép mũi HORNET_BOW_X = 125.7 chúc xuống vách mũi tàu cao sừng sững 60 ft rẽ sóng bão trắng xoá.
// - 196.2–205.64 s: Vòng mượt lại cận-trung chiếc #1 nơi Trung tá Tiến sĩ MIT Jimmy Doolittle (áo da bay A-2 nâu ấm, mũ sĩ quan USAAF) đứng cạnh mũi máy bay trên vạch xuất phát ("LT. COL. JIMMY DOOLITTLE").
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog, rnd, useT } from '@core/time';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { extrudeTop, lathe, pipe, rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';
import { HORNET_B25_Z, HORNET_BOW_X, HORNET_DECK_Y, USSHornet } from '../parts/USSHornet';

const SWELL = 3.9;
// Dùng chung 1 seed duy nhất cho toàn bộ 16 chiếc B-25B để tái sử dụng 100% cache CanvasTexture của paint(), tránh nghẽn CPU khi chuyển cảnh
const SHARED_B25_SEED = 18;

const deckToWorld = (local: V3, pose: { y: number; pitch: number; roll: number }): V3 => {
  const v = new THREE.Vector3(local[0], local[1], local[2]);
  v.applyEuler(new THREE.Euler(pose.roll, 0, pose.pitch, 'XYZ'));
  return [v.x, v.y + pose.y, v.z];
};

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

type DeckPlaneSpec = { x: number; z: number; yaw: number; lead?: boolean };

const SIXTEEN_B25_LAYOUT: DeckPlaneSpec[] = (() => {
  const list: DeckPlaneSpec[] = [
    { x: -16.6, z: HORNET_B25_Z, yaw: 0, lead: true },
  ];
  for (let k = 0; k < 8; k++) {
    list.push({
      x: -25.8 - k * 13.7,
      z: 7.45,
      yaw: 0.28,
    });
  }
  for (let k = 0; k < 7; k++) {
    list.push({
      x: -32.65 - k * 13.7,
      z: -7.45,
      yaw: -0.28,
    });
  }
  return list;
})();

// ---------------- Toàn bộ BufferGeometry của Trung tá Jimmy Doolittle khởi tạo tĩnh 1 lần (0 cấp phát mỗi frame) ----------------
const DOOLITTLE_GEO = (() => {
  const torso = lathe(
    [
      [0.01, 0.0],
      [0.152, 0.02],
      [0.162, 0.11],
      [0.188, 0.27],
      [0.214, 0.44],
      [0.192, 0.52],
      [0.088, 0.55],
    ],
    22,
  );
  torso.rotateZ(Math.PI / 2);
  torso.scale(0.86, 1, 1.12);

  const capCrown = lathe(
    [
      [0.09, 0.0],
      [0.094, 0.032],
      [0.132, 0.078],
      [0.136, 0.096],
      [0.064, 0.112],
      [0.002, 0.116],
    ],
    24,
  );
  capCrown.rotateZ(Math.PI / 2);

  const boot = rbox(0.26, 0.11, 0.115, 0.035);
  const pocket = rbox(0.03, 0.13, 0.105, 0.008);

  const legL = pipe(
    [
      [0, 0.1, 0],
      [0.022, 0.48, -0.11 * 0.04],
      [0, 0.88, -0.11 * -0.12],
    ],
    0.08,
    12,
  );
  const legR = pipe(
    [
      [0, 0.1, 0],
      [0.022, 0.48, 0.11 * 0.04],
      [0, 0.88, 0.11 * -0.12],
    ],
    0.08,
    12,
  );
  const armR = pipe(
    [
      [0, 0, 0],
      [0.16, -0.12, 0.05],
      [0.37, -0.02, -0.01],
    ],
    0.058,
    12,
  );
  const armL = pipe(
    [
      [0, 0, 0],
      [0.03, -0.18, -0.09],
      [0.1, -0.34, -0.02],
    ],
    0.058,
    12,
  );

  return { torso, capCrown, boot, pocket, legL, legR, armR, armL };
})();

const JimmyDoolittleFigure: React.FC<{ t: number }> = ({ t }) => {
  const mats = useMemo(
    () => ({
      a2Leather: plain('#6e432a', 0.52, 0.12),
      a2Pocket: plain('#5e3822', 0.56, 0.1),
      knitCuff: plain('#3d2316', 0.88, 0.04),
      khakiShirt: plain('#cbb792', 0.76, 0.04),
      tieOlive: plain('#4b4730', 0.8, 0.04),
      khakiPants: plain('#9e8d70', 0.78, 0.04),
      capOlive: plain('#596242', 0.7, 0.06),
      visorLeather: plain('#361e12', 0.35, 0.18),
      skin: plain('#dea985', 0.62, 0.03),
      eyeDark: plain('#241c18', 0.5, 0.05),
      brass: plain('#e4ba4e', 0.3, 0.82),
      silver: plain('#d5dce3', 0.28, 0.85),
      binoBlack: plain('#22262b', 0.45, 0.45),
    }),
    [],
  );

  // Bọc thêm useMemo tham chiếu hình học ống tay/chân đúng chuẩn không bao giờ tạo lại BufferGeometry mỗi frame
  const limbGeos = useMemo(
    () => ({
      legs: [DOOLITTLE_GEO.legL, DOOLITTLE_GEO.legR] as const,
      armR: DOOLITTLE_GEO.armR,
      armL: DOOLITTLE_GEO.armL,
    }),
    [],
  );

  const gestureBob = Math.sin(t * 1.8) * 0.045;

  return (
    <group>
      {/* Hai chân đứng vững trên sàn tàu */}
      {([-0.11, 0.11] as const).map((zl, idx) => (
        <group key={`leg-${idx}`} position={[idx === 0 ? 0.035 : -0.025, 0, zl]}>
          <mesh geometry={DOOLITTLE_GEO.boot} material={mats.visorLeather} position={[0.04, 0.055, 0]} castShadow />
          <mesh geometry={limbGeos.legs[idx]} material={mats.khakiPants} castShadow />
        </group>
      ))}

      {/* Thân áo khoác da bay A-2 màu nâu hạt dẻ chuẩn USAAF 1942 */}
      <group position={[0, 0.86, 0]} rotation={[0, 0, -0.03]}>
        <mesh geometry={DOOLITTLE_GEO.torso} material={mats.a2Leather} castShadow receiveShadow />
        <mesh position={[0, 0.035, 0]} scale={[0.87, 1, 1.1]} material={mats.knitCuff}>
          <cylinderGeometry args={[0.16, 0.154, 0.07, 18]} />
        </mesh>

        {/* Hai túi hộp trước ngực áo A-2, nẹp khoá kéo đồng & bảng tên da */}
        {([-0.095, 0.095] as const).map((zp, i) => (
          <mesh
            key={`pkt-${i}`}
            geometry={DOOLITTLE_GEO.pocket}
            material={mats.a2Pocket}
            position={[0.158, 0.16, zp]}
            rotation={[0, zp * -0.35, 0]}
            castShadow
          />
        ))}
        <mesh position={[0.172, 0.27, 0]} rotation={[0, 0, 0.04]} material={mats.brass}>
          <boxGeometry args={[0.014, 0.41, 0.016]} />
        </mesh>
        <mesh position={[0.166, 0.36, -0.085]} rotation={[0, 0.28, 0]} material={mats.visorLeather}>
          <boxGeometry args={[0.015, 0.028, 0.075]} />
        </mesh>

        {/* Cổ sơ mi khaki, cà vạt sĩ quan cài trong áo & ve cổ áo da A-2 bẻ hai bên */}
        <mesh position={[0.085, 0.5, 0]} rotation={[0, 0, -0.25]} material={mats.khakiShirt}>
          <boxGeometry args={[0.08, 0.09, 0.11]} />
        </mesh>
        <mesh position={[0.125, 0.47, 0]} rotation={[0, 0, -0.3]} material={mats.tieOlive}>
          <boxGeometry args={[0.03, 0.09, 0.036]} />
        </mesh>
        {([-1, 1] as const).map((s) => (
          <mesh
            key={`collar-${s}`}
            position={[0.055, 0.535, s * 0.082]}
            rotation={[s * 0.38, s * -0.25, -0.18]}
            material={mats.a2Pocket}
            castShadow
          >
            <boxGeometry args={[0.13, 0.045, 0.035]} />
          </mesh>
        ))}

        {/* Cầu vai & cấp hiệu Trung tá (lá sồi bạc Lt. Col.) */}
        {([-0.185, 0.185] as const).map((zs, i) => (
          <group key={`epaulet-${i}`} position={[0.005, 0.525, zs]} rotation={[zs > 0 ? 0.12 : -0.12, 0, 0]}>
            <mesh material={mats.a2Pocket}>
              <boxGeometry args={[0.08, 0.016, 0.11]} />
            </mesh>
            <mesh position={[0.005, 0.01, zs > 0 ? 0.02 : -0.02]} material={mats.silver}>
              <boxGeometry args={[0.038, 0.012, 0.038]} />
            </mesh>
          </group>
        ))}

        {/* Ống nhòm hàng hải treo trước ngực áo da */}
        <group position={[0.182, 0.25, 0.01]} rotation={[0, 0, -0.18]}>
          {([-0.032, 0.032] as const).map((zb, i) => (
            <mesh key={`bino-${i}`} position={[0, 0, zb]} material={mats.binoBlack} castShadow>
              <cylinderGeometry args={[0.022, 0.028, 0.11, 12]} />
            </mesh>
          ))}
          <mesh material={mats.brass}>
            <boxGeometry args={[0.02, 0.04, 0.07]} />
          </mesh>
        </group>

        {/* Tay phải đưa lên chỉ thẳng về phía mũi tàu 467 ft */}
        <group position={[0.02, 0.46, 0.22]} rotation={[0.1, -0.18, gestureBob]}>
          <mesh geometry={limbGeos.armR} material={mats.a2Leather} castShadow />
          <mesh position={[0.36, -0.025, -0.01]} rotation={[0, 0, Math.PI / 2]} material={mats.knitCuff}>
            <cylinderGeometry args={[0.046, 0.048, 0.045, 12]} />
          </mesh>
          <mesh position={[0.41, -0.015, -0.01]} scale={[1.25, 0.85, 0.9]} material={mats.skin}>
            <sphereGeometry args={[0.042, 10, 10]} />
          </mesh>
        </group>

        {/* Tay trái giữ vạt áo da vững chãi giữa gió bão */}
        <group position={[0.01, 0.46, -0.22]}>
          <mesh geometry={limbGeos.armL} material={mats.a2Leather} castShadow />
          <mesh position={[0.115, -0.36, 0.0]} material={mats.skin}>
            <sphereGeometry args={[0.042, 10, 10]} />
          </mesh>
        </group>

        {/* Đầu, khuôn mặt cương nghị & Mũ sĩ quan USAAF "50-Mission Crush" */}
        <group position={[0.025, 0.635, 0]} rotation={[0, -0.22, 0.04]}>
          <mesh position={[-0.01, -0.055, 0]} material={mats.skin}>
            <cylinderGeometry args={[0.055, 0.064, 0.09, 14]} />
          </mesh>
          <mesh scale={[1.03, 1.14, 0.94]} material={mats.skin} castShadow>
            <sphereGeometry args={[0.095, 20, 16]} />
          </mesh>
          <mesh position={[0.04, -0.048, 0]} material={mats.skin}>
            <boxGeometry args={[0.095, 0.055, 0.11]} />
          </mesh>
          <mesh position={[0.096, -0.004, 0]} rotation={[0, 0, -0.28]} material={mats.skin}>
            <coneGeometry args={[0.016, 0.042, 8]} />
          </mesh>
          {([-0.034, 0.034] as const).map((ze, i) => (
            <mesh key={`eye-${i}`} position={[0.088, 0.018, ze]} material={mats.eyeDark}>
              <sphereGeometry args={[0.01, 8, 8]} />
            </mesh>
          ))}
          {([-0.088, 0.088] as const).map((ze, i) => (
            <mesh key={`ear-${i}`} position={[0.0, 0.0, ze]} scale={[0.6, 1.1, 0.45]} material={mats.skin}>
              <sphereGeometry args={[0.022, 8, 8]} />
            </mesh>
          ))}
          <mesh position={[-0.018, 0.012, 0]} scale={[0.98, 0.96, 0.97]} material={mats.visorLeather}>
            <sphereGeometry args={[0.096, 18, 14, Math.PI * 0.52, Math.PI * 0.96, Math.PI * 0.18, Math.PI * 0.62]} />
          </mesh>

          {/* Mũ sĩ quan USAAF */}
          <group position={[-0.005, 0.048, 0]} rotation={[0, 0, -0.07]}>
            <mesh geometry={DOOLITTLE_GEO.capCrown} material={mats.capOlive} castShadow />
            <mesh position={[0.002, 0.018, 0]} material={mats.capOlive}>
              <cylinderGeometry args={[0.093, 0.093, 0.032, 22]} />
            </mesh>
            <mesh position={[0.012, 0.014, 0]} material={mats.visorLeather}>
              <cylinderGeometry args={[0.095, 0.095, 0.014, 20, 1, false, -Math.PI * 0.46, Math.PI * 0.92]} />
            </mesh>
            <mesh position={[0.088, 0.004, 0]} rotation={[0, 0, -0.24]} scale={[1.0, 0.12, 1.12]} material={mats.visorLeather} castShadow>
              <cylinderGeometry args={[0.08, 0.088, 0.038, 20]} />
            </mesh>
            <mesh position={[0.106, 0.062, 0]} rotation={[0, 0, -0.15]} scale={[0.6, 1.1, 1.35]} material={mats.brass}>
              <octahedronGeometry args={[0.024, 0]} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
};

// Dải bọt sóng chữ V rẽ mũi tàu sân bay
const BOW_WAKE_GEO = extrudeTop(
  [
    [117.5, 0.0],
    [114.0, 2.2],
    [104.0, 6.8],
    [88.0, 12.8],
    [86.0, 9.2],
    [102.0, 3.6],
    [112.0, 0.0],
    [102.0, -3.6],
    [86.0, -9.2],
    [88.0, -12.8],
    [104.0, -6.8],
    [114.0, -2.2],
  ],
  0.35,
  0.08,
);

const WET_DECK_PATCHES = Array.from({ length: 11 }, (_, i) => ({
  x: -10 + i * 12.2,
  z: (rnd(i * 13 + 5) - 0.5) * 14.5,
  rx: 4.5 + rnd(i * 7 + 1) * 4.2,
  rz: 2.2 + rnd(i * 11 + 3) * 2.8,
}));

const C02S03: React.FC = () => {
  const t = useT();
  const pose = shipPose(0, 0, 251.4, 35.0, t, SWELL);

  const sceneMats = useMemo(
    () => ({
      wetSheen: new THREE.MeshStandardMaterial({
        color: '#22303d',
        roughness: 0.09,
        metalness: 0.68,
        transparent: true,
        opacity: 0.32,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
      bowWakeFoam: new THREE.MeshStandardMaterial({
        color: '#dceaf3',
        roughness: 0.78,
        metalness: 0.04,
        transparent: true,
        opacity: 0.46,
      }),
    }),
    [],
  );

  // ---------------- Nội suy 3 nhịp Camera ----------------
  // Nhịp 1 (186.38–192.6 s): Mở cao từ đuôi tàu bao quát trọn 16 chiếc B-25B rồi lao vút qua chiếc #1 mở ra 467 ft sàn ướt
  const pSweepDeck = prog(t, CUE.c02_s03_start - 0.2, 192.55);
  const posBeat1 = lerpV3(
    [-116.0, HORNET_DECK_Y + 21.5, -13.0],
    [48.0, HORNET_DECK_Y + 6.8, -5.8],
    pSweepDeck,
  );
  const lookBeat1 = lerpV3(
    [-38.0, HORNET_DECK_Y + 1.4, 0.5],
    [120.0, HORNET_DECK_Y + 0.2, -1.0],
    pSweepDeck,
  );

  // Nhịp 2 (192.5–196.15 s): Vọt qua mép mũi HORNET_BOW_X = 125.7 chúc xuống vách mũi thép cao 60 ft rẽ sóng Thái Bình Dương
  const pToBowDrop = prog(t, 192.45, 194.1);
  const pHoldBowDrop = prog(t, 194.1, 196.15);
  const posBeat2 = lerpV3(
    [HORNET_BOW_X + 20.8, 11.4, -22.0],
    [HORNET_BOW_X + 26.8, 8.6, -16.8],
    pHoldBowDrop,
  );
  const lookBeat2 = lerpV3(
    [HORNET_BOW_X - 8.7, 12.0, -0.5],
    [HORNET_BOW_X - 11.7, 10.5, 0.2],
    pHoldBowDrop,
  );

  // Nhịp 3 (196.15–205.64 s): Vòng mượt lại cận-trung chính diện 3/4 Trung tá Jimmy Doolittle (tại x = -8.95, thoáng hẳn khỏi chèn bánh)
  const pToDoolittle = prog(t, 196.1, 197.7);
  const pOrbitDoolittle = prog(t, 197.7, 205.64);
  const posBeat3 = lerpV3(
    [-4.15, HORNET_DECK_Y + 2.08, -5.85],
    [-6.65, HORNET_DECK_Y + 1.56, -4.0],
    pOrbitDoolittle,
  );
  const lookBeat3 = lerpV3(
    [-10.75, HORNET_DECK_Y + 1.58, -1.35],
    [-9.35, HORNET_DECK_Y + 1.52, -1.78],
    pOrbitDoolittle,
  );

  const pos12 = lerpV3(posBeat1, posBeat2, pToBowDrop);
  pos12[1] += 4.2 * Math.sin(pToBowDrop * Math.PI);

  const localCamPos = lerpV3(pos12, posBeat3, pToDoolittle);
  localCamPos[1] += 9.5 * Math.sin(pToDoolittle * Math.PI);
  localCamPos[2] -= 10.5 * Math.sin(pToDoolittle * Math.PI);

  const look12 = lerpV3(lookBeat1, lookBeat2, pToBowDrop);
  const localCamLook = lerpV3(look12, lookBeat3, pToDoolittle);

  const worldPos = deckToWorld(localCamPos, pose);
  const minWaveClear = waveY(worldPos[0], worldPos[2], t, SWELL) + 2.1;
  if (worldPos[1] < minWaveClear) worldPos[1] = minWaveClear;
  const worldLook = deckToWorld(localCamLook, pose);

  const camFov = lerp(lerp(43, 45, pToBowDrop), 37, pToDoolittle);

  const localShadowFocus = lerpV3(
    lerpV3([-56, HORNET_DECK_Y, 0], [116, 11, 0], pToBowDrop),
    [-10.0, HORNET_DECK_Y + 1.5, -1.8],
    pToDoolittle,
  );
  const worldShadowFocus = deckToWorld(localShadowFocus, pose);

  const bowWaveH = waveY(112, 0, t, SWELL);

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.stormDawn}
        ambient={0.35}
        exposure={1.07}
        shadowArea={lerp(lerp(78, 48, pToBowDrop), 22, pToDoolittle)}
        shadowCenter={worldShadowFocus}
      >
        <Cam pos={worldPos} look={worldLook} fov={camFov} />

        <OceanSurface t={t} swell={SWELL} size={1200} seg={168} palette="stormPacific" />

        {/* Vệt bọt sóng chữ V rẽ nước bám theo mặt biển tại mũi tàu */}
        <mesh
          geometry={BOW_WAKE_GEO}
          material={sceneMats.bowWakeFoam}
          position={[0, bowWaveH + 0.12, 0]}
          scale={[1, 0.7 + 0.4 * Math.sin(t * 2.2), 1 + 0.08 * Math.cos(t * 1.9)]}
        />

        <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
          <USSHornet
            hullNumber="8"
            showLaunchLines={true}
            flagWave={t * 1.85}
            aaYaw={0.18}
            elevatorDown={0}
          />

          {WET_DECK_PATCHES.map((p, idx) => (
            <mesh
              key={`wet-${idx}`}
              position={[p.x, HORNET_DECK_Y + 0.008, p.z]}
              rotation={[-Math.PI / 2, 0, 0]}
              scale={[p.rx, p.rz, 1]}
              material={sceneMats.wetSheen}
              receiveShadow
            >
              <circleGeometry args={[1, 20]} />
            </mesh>
          ))}

          {/* Toàn bộ 16 chiếc B-25B dùng chung SHARED_B25_SEED = 18 và tắt đèn điểm thừa để tối ưu tối đa hiệu năng mount & GPU */}
          {SIXTEEN_B25_LAYOUT.map((p, idx) => (
            <group key={`b25-${idx}`} position={[p.x, HORNET_DECK_Y, p.z]} rotation={[0, p.yaw, 0]}>
              <B25Mitchell
                gear={1}
                lowerTurret={false}
                broomsticks={true}
                chained={true}
                navLights={false}
                propSpin={p.lead ? t * 2.6 : t * 0.85 + idx * 0.6}
                seed={SHARED_B25_SEED}
              />
            </group>
          ))}

          {/* Trung tá Tiến sĩ MIT Jimmy Doolittle nhích lên x = -8.95 m (tách thoáng hoàn toàn khỏi thanh chèn bánh mũi màu vàng) */}
          <group position={[-8.95, HORNET_DECK_Y, -2.35]} rotation={[0, 0.44, 0]}>
            <JimmyDoolittleFigure t={t} />
          </group>
        </group>
      </Stage>

      <Label
        t={t}
        text="467 FT DECK · 60 FT DROP"
        x={540}
        y={190}
        from={CUE.c02_s03_deck_467}
        until={196.2}
      />
      <Label
        t={t}
        text="LT. COL. JIMMY DOOLITTLE"
        x={1360}
        y={840}
        from={CUE.c02_s03_doolittle}
        until={204.8}
      />
    </AbsoluteFill>
  );
};

export default C02S03;
