// Cảnh C02S02 (156.98–186.38 s) — THUẦN 3D trên USS Hornet (CV-8) biển êm (swell = 0.95):
// - 156.98–165.70 s: Camera thấp sát sàn đuôi lướt qua các sợi cáp thép hãm đà hướng thẳng vào bụng đuôi trơn nhẵn không có móc hãm (without a tailhook @ 160.88 s) của chiếc B-25B nguyên bản nhà máy (lowerTurret=true, broomsticks=false).
// - 165.70–174.30 s: Bốc cao vòng qua mạn phải phô trọn dáng cánh hải âu gull-wing trên mặt sàn chật hẹp ("B-25B MITCHELL").
// - 174.30–186.38 s: Nhìn chéo từ trên mũi xuống khi bàn nâng thang máy giữa tụt sâu xuống hầm hangar (elevatorDown: 0 → 0.92 từ 179.94 s), cho thấy trực quan đôi cánh cứng 20.60 m tràn rộng hơn miệng hố thang máy 13.4 m tới 3.6 m mỗi bên ("67 FT 7 IN WINGSPAN").
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog, useT } from '@core/time';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { merge, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';
import { HORNET_DECK_Y, USSHornet } from '../parts/USSHornet';

const SWELL = 0.95;

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

// Hệ dây cáp thép hãm đà & puly căng cáp dọc sàn sau tới sát đuôi chiếc B-25B (x = -54..-22.5 m)
// nối liền mạch với 9 cáp đuôi tàu để cả lúc lướt sàn lẫn lúc dừng cận bụng đuôi B-25 đều thấy sợi cáp thép ngay dưới bụng đuôi không móc hãm!
const FORWARD_ARRESTING_DETAIL = (() => {
  const cableParts: THREE.BufferGeometry[] = [];
  const sheaveParts: THREE.BufferGeometry[] = [];
  for (const wx of [-54, -46, -38, -30.5, -23.6]) {
    const span = 12.0;
    cableParts.push(
      pipe(
        [
          [wx, HORNET_DECK_Y + 0.088, -span],
          [wx, HORNET_DECK_Y + 0.098, -4.0],
          [wx, HORNET_DECK_Y + 0.102, 0],
          [wx, HORNET_DECK_Y + 0.098, 4.0],
          [wx, HORNET_DECK_Y + 0.088, span],
        ],
        0.038,
        8,
      ),
    );
    for (const sz of [-8.5, -3.8, 0, 3.8, 8.5]) {
      const g = rbox(0.32, 0.078, 0.13, 0.015);
      g.translate(wx - 0.08, HORNET_DECK_Y + 0.042, sz);
      sheaveParts.push(g);
    }
    for (const sgn of [-1, 1]) {
      const block = rbox(0.45, 0.11, 0.48, 0.02);
      block.translate(wx, HORNET_DECK_Y + 0.055, sgn * span);
      sheaveParts.push(block);
    }
  }
  return {
    cables: merge(cableParts),
    sheaves: merge(sheaveParts),
  };
})();

/**
 * Kết cấu lòng giếng thang nâng giữa (Midships Elevator Shaft: x = -3.3..+11.3, z = -6.7..+6.7)
 * Phối cảnh hình học 3D chuẩn từ góc nhìn cao để thể hiện rõ thành vách thép dầm chữ I, ray dẫn hướng thuỷ lực
 * và mặt bàn nâng hạ sâu xuống hầm hangar được đèn kỹ thuật chiếu sáng (nằm tại cao độ y = 17.62..18.29 m ngay trên mặt đáy giếng 17.605 m của Hornet).
 */
const ElevatorPitInterior: React.FC<{ elevatorDown: number; camLocal: V3 }> = ({ elevatorDown, camLocal }) => {
  const mats = useMemo(
    () => ({
      shaftWall: paint({
        color: '#3c4c5d',
        camo: ['#2c3947', '#4e6175'],
        repeat: 0.5,
        wear: 0.25,
        dirt: 0.3,
        roughness: 0.62,
        metalness: 0.42,
        seed: 44,
      }),
      guideSteel: plain('#7d90a3', 0.38, 0.72),
      sunkenWood: paint({
        color: '#2e3640',
        camo: ['#252c35', '#3c4552'],
        repeat: 0.6,
        wear: 0.28,
        dirt: 0.26,
        roughness: 0.76,
        metalness: 0.14,
        seed: 51,
      }),
      yellowMark: plain(PAINT.deckStripeYellow, 0.55, 0.12),
      voidShadow: plain('#0d1218', 0.95, 0.08),
      lampGlow: plain('#ffdca8', 0.2, 0.05, {
        emissive: new THREE.Color('#ffae4a'),
        emissiveIntensity: 2.6,
      }),
    }),
    [],
  );

  if (elevatorDown <= 0.02) return null;

  // Phép chiếu phối cảnh chính xác từ camera qua cao độ bàn nâng thật (yTrue = 18.30 - elevatorDown * 6.35) lên mặt phẳng giếng yProj = 17.635 m
  const yProj = 17.635;
  const yTrue = HORNET_DECK_Y - elevatorDown * 6.35;
  const camY = Math.max(HORNET_DECK_Y + 4.0, camLocal[1]);
  const s = (camY - yProj) / Math.max(0.5, camY - yTrue); // tỷ lệ thu nhỏ phối cảnh của bàn nâng nằm sâu 5.8 m dưới hầm!

  // Dịch tâm bàn nâng [4.0, yTrue, 0] theo tia nhìn từ camera lên mặt phẳng yProj (kẹp gọn trong lòng giếng 14.5 × 13.3 m)
  const rawCx = camLocal[0] + (4.0 - camLocal[0]) * s;
  const rawCz = camLocal[2] + (0.0 - camLocal[2]) * s;
  const platW = 14.4 * s;
  const platD = 13.2 * s;
  const halfX = Math.max(1.0, (14.48 - platW) * 0.5);
  const halfZ = Math.max(0.8, (13.28 - platD) * 0.5);
  const cx = Math.max(4.0 - halfX, Math.min(4.0 + halfX, rawCx));
  const cz = Math.max(-halfZ, Math.min(halfZ, rawCz));

  // Các mép bàn nâng đã chiếu phối cảnh để nối vách giếng nghiêng theo đúng tia nhìn 3D
  const xMinP = cx - platW * 0.5;
  const xMaxP = cx + platW * 0.5;
  const zMinP = cz - platD * 0.5;
  const zMaxP = cz + platD * 0.5;

  return (
    <group>
      {/* Đáy tối khoang hangar bao quanh bàn nâng */}
      <mesh position={[4.0, 17.618, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.voidShadow}>
        <planeGeometry args={[14.54, 13.34]} />
      </mesh>

      {/* Vách thép trên của miệng giếng thang nâng (y = 17.63..18.28 m) + dầm sườn dọc & đèn hầm hangar */}
      {([-6.64, 6.64] as const).map((zw, idx) => (
        <group key={`ewall-z-${idx}`}>
          <mesh position={[4.0, 17.95, zw]} material={mats.shaftWall} receiveShadow>
            <boxGeometry args={[14.56, 0.64, 0.12]} />
          </mesh>
          {[-1.5, 1.5, 4.0, 6.5, 9.5].map((rx, ri) => (
            <mesh key={`rib-z-${ri}`} position={[rx, 17.95, zw - Math.sign(zw) * 0.08]} material={mats.guideSteel}>
              <boxGeometry args={[0.16, 0.64, 0.1]} />
            </mesh>
          ))}
        </group>
      ))}
      {([-3.24, 11.24] as const).map((xw, idx) => (
        <group key={`ewall-x-${idx}`}>
          <mesh position={[xw, 17.95, 0]} material={mats.shaftWall} receiveShadow>
            <boxGeometry args={[0.12, 0.64, 13.36]} />
          </mesh>
          {[-4.5, -1.5, 1.5, 4.5].map((rz, ri) => (
            <mesh key={`rib-x-${ri}`} position={[xw - Math.sign(xw - 4.0) * 0.08, 17.95, rz]} material={mats.guideSteel}>
              <boxGeometry args={[0.1, 0.64, 0.16]} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Vách giếng sâu phối cảnh nối từ miệng giếng (x = +11.24, z = -6.64) xuống mép bàn nâng đã hạ sâu 5.8 m */}
      {xMaxP < 11.15 && (
        <mesh
          position={[(11.24 + xMaxP) * 0.5, 17.628, (0 + cz) * 0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={mats.shaftWall}
        >
          <planeGeometry args={[11.24 - xMaxP, 13.25]} />
        </mesh>
      )}
      {zMinP > -6.55 && (
        <mesh
          position={[4.0, 17.63, (-6.64 + zMinP) * 0.5]}
          rotation={[-Math.PI / 2, 0, 0]}
          material={mats.shaftWall}
        >
          <planeGeometry args={[14.48, zMinP - -6.64]} />
        </mesh>
      )}

      {/* 4 ray trụ thuỷ lực dẫn hướng ở 4 góc nối thẳng từ miệng giếng tới 4 góc bàn nâng bên dưới */}
      {(
        [
          [11.18, -6.58, xMaxP, zMinP],
          [11.18, 6.58, xMaxP, zMaxP],
          [-3.18, -6.58, xMinP, zMinP],
          [-3.18, 6.58, xMinP, zMaxP],
        ] as [number, number, number, number][]
      ).map(([xTop, zTop, xBot, zBot], idx) => (
        <mesh
          key={`guide-${idx}`}
          geometry={pipe(
            [
              [xTop, 18.24, zTop],
              [xBot, yProj + 0.02, zBot],
            ],
            0.09,
            8,
          )}
          material={mats.guideSteel}
        />
      ))}

      {/* Mặt bàn nâng gỗ-thép nằm sâu dưới đáy giếng thang nâng (có viền cảnh báo vàng & khe ván sắc nét) */}
      <group position={[cx, yProj + 0.012, cz]}>
        <mesh material={mats.sunkenWood} receiveShadow>
          <boxGeometry args={[platW, 0.03, platD]} />
        </mesh>
        {/* Viền thép vàng quanh bàn nâng đã hạ xuống hầm */}
        <mesh position={[0, 0.018, platD * 0.5 - 0.12]} material={mats.yellowMark}>
          <boxGeometry args={[platW, 0.01, 0.16]} />
        </mesh>
        <mesh position={[0, 0.018, -platD * 0.5 + 0.12]} material={mats.yellowMark}>
          <boxGeometry args={[platW, 0.01, 0.16]} />
        </mesh>
        <mesh position={[platW * 0.5 - 0.12, 0.018, 0]} material={mats.yellowMark}>
          <boxGeometry args={[0.16, 0.01, platD]} />
        </mesh>
        <mesh position={[-platW * 0.5 + 0.12, 0.018, 0]} material={mats.yellowMark}>
          <boxGeometry args={[0.16, 0.01, platD]} />
        </mesh>
      </group>

      {/* Đèn pha kỹ thuật chiếu sáng bên trong miệng hầm hangar */}
      {([-5.2, 5.2] as const).map((zl, i) => (
        <mesh key={`hlamp-${i}`} position={[11.12, 18.08, zl]} material={mats.lampGlow}>
          <boxGeometry args={[0.12, 0.14, 0.65]} />
        </mesh>
      ))}
      <pointLight position={[7.5, 18.15, -2.5]} color="#ffcf8c" intensity={10 * elevatorDown} distance={18} decay={1.7} />
      <pointLight position={[1.5, 18.15, 2.5]} color="#ffcf8c" intensity={8 * elevatorDown} distance={18} decay={1.7} />
    </group>
  );
};

const C02S02: React.FC = () => {
  const t = useT();
  const pose = shipPose(0, 0, 251.4, 35.0, t, SWELL);

  const extraMats = useMemo(
    () => ({
      brightCable: plain('#c2d2e2', 0.28, 0.85),
      darkSheave: plain('#1d242c', 0.65, 0.45),
      pitSafetyYellow: plain(PAINT.deckStripeYellow, 0.5, 0.15),
      overhangRed: plain('#e0483e', 0.55, 0.12),
    }),
    [],
  );

  // Bàn nâng thang máy giữa hạ sâu xuống hầm hangar: elevatorDown 0 → 0.92 từ 179.94 s
  const elevatorDown = lerp(0, 0.92, prog(t, CUE.c02_s02_elevator - 0.15, 182.9));

  // ---------------- Nội suy 3 nhịp Camera ----------------
  // Nhịp 1 (156.98–165.45 s): Thấp sát sàn đuôi lướt qua hàng cáp hãm đà, dừng ngay sau sợi cáp x = -23.6 nhìn lên bụng đuôi trơn không móc hãm của B-25B
  const pTrackWires = prog(t, CUE.c02_s02_start - 0.2, 161.8);
  const pHoldTail = prog(t, 161.8, 165.45);
  const posShot1 = lerpV3(
    lerpV3([-69.5, HORNET_DECK_Y + 0.78, -2.2], [-26.4, HORNET_DECK_Y + 0.92, -2.4], pTrackWires),
    [-24.8, HORNET_DECK_Y + 0.98, -2.85],
    pHoldTail,
  );
  const lookShot1 = lerpV3(
    lerpV3([-42.0, HORNET_DECK_Y + 0.35, -0.3], [-16.8, HORNET_DECK_Y + 1.38, -0.1], pTrackWires),
    [-15.8, HORNET_DECK_Y + 1.48, 0.0],
    pHoldTail,
  );

  // Nhịp 2 (165.45–173.9 s): Bốc cao vòng qua mạn phải (+Z, ngay sau đảo chỉ huy x < 12) phô trọn dáng cánh hải âu gull-wing
  const pToStarboard = prog(t, 165.45, 168.0);
  const pOrbitStarboard = prog(t, 168.0, 173.85);
  const posShot2 = lerpV3(
    [6.8, HORNET_DECK_Y + 11.2, 20.8],
    [9.8, HORNET_DECK_Y + 13.6, 17.2],
    pOrbitStarboard,
  );
  const lookShot2 = lerpV3(
    [-11.2, HORNET_DECK_Y + 2.1, -0.2],
    [-9.6, HORNET_DECK_Y + 1.9, 0.1],
    pOrbitStarboard,
  );

  // Nhịp 3 (173.85–186.38 s): Góc chéo cao từ phía trước mũi mạn trái đóng khung cận-trung hố thang nâng (13.4 m) vs sải cánh cứng B-25B (20.60 m)
  const pToElevator = prog(t, 173.85, 176.8);
  const pInspectPit = prog(t, 176.8, 186.38);
  const posShot3 = lerpV3(
    [18.2, HORNET_DECK_Y + 20.8, -14.8],
    [13.8, HORNET_DECK_Y + 22.4, -10.2],
    pInspectPit,
  );
  const lookShot3 = lerpV3(
    [-4.8, HORNET_DECK_Y + 0.4, 0.1],
    [-4.2, HORNET_DECK_Y - 0.3, 0.0],
    pInspectPit,
  );

  const pos12 = lerpV3(posShot1, posShot2, pToStarboard);
  pos12[1] += 3.8 * Math.sin(pToStarboard * Math.PI);
  pos12[2] += 4.2 * Math.sin(pToStarboard * Math.PI);

  const localCamPos = lerpV3(pos12, posShot3, pToElevator);
  localCamPos[1] += 5.2 * Math.sin(pToElevator * Math.PI);

  const look12 = lerpV3(lookShot1, lookShot2, pToStarboard);
  const localCamLook = lerpV3(look12, lookShot3, pToElevator);

  const worldPos = deckToWorld(localCamPos, pose);
  const minOceanClear = waveY(worldPos[0], worldPos[2], t, SWELL) + 1.8;
  if (worldPos[1] < minOceanClear) worldPos[1] = minOceanClear;
  const worldLook = deckToWorld(localCamLook, pose);

  const camFov = lerp(lerp(42, 39, pToStarboard), 40, pToElevator);
  const shadowFocus = deckToWorld([-6, HORNET_DECK_Y, 0], pose);

  // Thanh cữ đo độ tràn sải cánh trên mặt sàn (hiển thị từ lúc nói về sải cánh 67 ft 7 in @ 174.30 s)
  const pWingGauge = prog(t, CUE.c02_s02_wingspan, 176.2);

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.stormDawn}
        fog={[185, 760]}
        exposure={1.1}
        sunIntensity={2.55}
        ambient={0.36}
        shadowArea={52}
        shadowCenter={shadowFocus}
      >
        <Cam pos={worldPos} look={worldLook} fov={camFov} />

        <OceanSurface t={t} swell={SWELL} size={1100} seg={156} palette="japanShore" />

        <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
          <USSHornet
            hullNumber="8"
            showLaunchLines={false}
            flagWave={t * 0.75}
            elevatorDown={elevatorDown}
          />

          {/* Cáp thép hãm đà kéo dài lên sát phía sau đuôi chiếc B-25B */}
          <mesh geometry={FORWARD_ARRESTING_DETAIL.cables} material={extraMats.brightCable} castShadow />
          <mesh geometry={FORWARD_ARRESTING_DETAIL.sheaves} material={extraMats.darkSheave} receiveShadow />

          {/* Kết cấu lòng giếng thang nâng & bàn nâng hạ sâu phối cảnh trong hầm hangar */}
          <ElevatorPitInterior elevatorDown={elevatorDown} camLocal={localCamPos} />

          {/* Chiếc B-25B Mitchell nguyên bản nhà máy (lowerTurret=true, broomsticks=false) tại x = -11.8, z = 0 */}
          <group position={[-11.8, HORNET_DECK_Y, 0]}>
            <B25Mitchell
              gear={1}
              lowerTurret={true}
              broomsticks={false}
              chained={true}
              navLights={false}
              propSpin={0.35}
              seed={18}
            />
          </group>

          {/* Gờ chắn vàng dọc hai mép thang nâng (z = ±6.75 m) & vạch gióng đỏ trên sàn chỉ rõ phần cánh B-25 (z = ±10.30 m) tràn ra ngoài 3.6 m mỗi bên! */}
          {pWingGauge > 0.02 && (
            <group>
              {([-1, 1] as const).map((sgn) => (
                <group key={`overhang-${sgn}`}>
                  {/* Gờ giới hạn bề rộng miệng thang nâng z = ±6.82 m */}
                  <mesh position={[4.0, HORNET_DECK_Y + 0.06, sgn * 6.82]} material={extraMats.pitSafetyYellow} castShadow>
                    <boxGeometry args={[14.6, 0.11, 0.16]} />
                  </mesh>
                  {/* Vạch gióng dọc từ mép thang nâng (z = ±6.70) tới dưới đầu mút cánh B-25 (z = ±10.30) */}
                  <mesh
                    position={[-6.8, HORNET_DECK_Y + 0.035, sgn * (6.7 + 1.8 * pWingGauge)]}
                    material={extraMats.overhangRed}
                  >
                    <boxGeometry args={[0.24, 0.04, 3.6 * pWingGauge]} />
                  </mesh>
                  {/* Thanh chặn đứng dưới mút cánh z = ±10.30 m */}
                  <mesh
                    position={[-8.2, HORNET_DECK_Y + 0.04, sgn * 10.3]}
                    material={extraMats.overhangRed}
                  >
                    <boxGeometry args={[4.4 * pWingGauge, 0.045, 0.22]} />
                  </mesh>
                </group>
              ))}
            </group>
          )}

          {/* 3 chiếc B-25B nguyên bản khác đang xếp thử ở hai bên mạn đuôi tàu */}
          <group position={[-76.0, HORNET_DECK_Y, 7.6]} rotation={[0, 0.24, 0]}>
            <B25Mitchell gear={1} lowerTurret={true} broomsticks={false} chained={true} navLights={false} propSpin={0.8} seed={18} />
          </group>
          <group position={[-91.5, HORNET_DECK_Y, -7.5]} rotation={[0, -0.22, 0]}>
            <B25Mitchell gear={1} lowerTurret={true} broomsticks={false} chained={true} navLights={false} propSpin={1.4} seed={18} />
          </group>
          <group position={[-107.0, HORNET_DECK_Y, 7.2]} rotation={[0, 0.26, 0]}>
            <B25Mitchell gear={1} lowerTurret={true} broomsticks={false} chained={true} navLights={false} propSpin={2.1} seed={18} />
          </group>
        </group>
      </Stage>

      <Label
        t={t}
        text="B-25B MITCHELL"
        x={470}
        y={195}
        from={CUE.c02_s02_enter_b25}
        until={172.8}
      />
      <Label
        t={t}
        text="67 FT 7 IN WINGSPAN"
        x={1410}
        y={210}
        from={CUE.c02_s02_wingspan}
        until={184.8}
      />
    </AbsoluteFill>
  );
};

export default C02S02;
