// C02S10 (330.86–354.86 s) — 3D stormDawn trên sàn tàu USS Hornet:
// Chiếc cuối cùng #16 "Bat Out of Hell" (Trung úy Billy Farrow) bị gió xoáy cánh quạt từ chiếc #15 quật chao đảo,
// sự cố thủy thủ chèn bánh trượt chân ở đĩa cánh quạt trái trong màn bụi nước mù, và cận cảnh lỗ vỡ nham nhở 1 foot
// xuyên thủng mũi kính Bombardier ngay trước mặt Hạ sĩ Jacob DeShazer.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, bump, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, PAINT } from '../design/palette';
import { USSHornet, HORNET_DECK_Y, HORNET_B25_Z } from '../parts/USSHornet';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose, type OceanSurfaceProps } from '../parts/OceanSurface';

const SWELL = 4.35;

/** Biến đổi điểm từ hệ quy chiếu máy bay sang hệ quy chiếu sàn tàu Hornet. */
function planeToShip(local: V3, planePos: V3, planeRot: V3): V3 {
  const v = new THREE.Vector3(local[0], local[1], local[2])
    .applyEuler(new THREE.Euler(planeRot[0], planeRot[1], planeRot[2], 'XYZ'))
    .add(new THREE.Vector3(planePos[0], planePos[1], planePos[2]));
  return [v.x, v.y, v.z];
}

/** Biến đổi điểm từ hệ quy chiếu tàu Hornet sang world space theo shipPose. */
function shipToWorld(shipPt: V3, pose: { y: number; pitch: number; roll: number }): V3 {
  const v = new THREE.Vector3(shipPt[0], shipPt[1], shipPt[2]).applyEuler(
    new THREE.Euler(pose.roll, 0, pose.pitch, 'XYZ'),
  );
  return [v.x, v.y + pose.y, v.z];
}

/** Một cụm sương bụi nước / luồng gió xoáy cánh quạt tất định. */
const SprayPuff: React.FC<{ pos: V3; size: number; opacity: number; color?: string; rot?: number }> = ({
  pos,
  size,
  opacity,
  color = '#d8e5ee',
  rot = 0,
}) => {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  if (opacity <= 0.004 || size <= 0.02) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size, size * 0.72, size]} />;
};

/** Tổ bay bên trong mũi kính & buồng lái chiếc #16 + vách tối khoang mũi làm nổi bật lỗ vỡ 1 foot của B25Mitchell. */
const Plane16CrewAndBrokenDetail: React.FC<{ t: number; broken: boolean }> = ({ t, broken }) => {
  const leatherMat = useMemo(() => plain('#3d291c', 0.72, 0.08), []);
  const fleeceMat = useMemo(() => plain('#cbb899', 0.85, 0.04), []);
  const maeWestMat = useMemo(() => plain('#c99a26', 0.68, 0.06), []);
  const skinMat = useMemo(() => plain('#cfa382', 0.65, 0.04), []);
  const helmetMat = useMemo(() => plain('#322117', 0.6, 0.12), []);
  const goggleGlassMat = useMemo(() => plain('#22323d', 0.16, 0.45), []);
  const goggleRimMat = useMemo(() => plain('#9ba4ab', 0.32, 0.78), []);
  const bulkheadMat = useMemo(() => plain('#12180f', 0.92, 0.12, { side: THREE.DoubleSide }), []);
  const darkVoidMat = useMemo(() => plain('#0a0e09', 0.95, 0.06, { side: THREE.DoubleSide }), []);
  const frameSnapMat = useMemo(() => plain('#485332', 0.58, 0.35), []);

  // Hạ sĩ Bombardier Jacob DeShazer nhổm người nhìn sững vào lỗ vỡ [7.96, 2.38, -0.13]
  const spotP = prog(t, 347.6, 351.2);
  const leanX = lerp(7.05, 7.18, spotP);
  const headTilt = lerp(0.08, 0.26, spotP);
  const armRaise = lerp(-0.32, 0.52, prog(t, 349.6, 352.0));

  return (
    <group>
      {/* Vách tối khoang mũi tại x = 6.55 m tạo hốc tối sâu bên trong để lỗ thủng 1 foot tại [7.96, 2.38, -0.13] tách bạch hoàn toàn */}
      <mesh position={[6.55, 2.2, 0]} rotation={[0, 0, Math.PI / 2]} material={bulkheadMat}>
        <cylinderGeometry args={[0.59, 0.59, 0.05, 24]} />
      </mesh>
      <mesh position={[6.78, 2.38, 0.36]} material={darkVoidMat}>
        <boxGeometry args={[0.48, 0.52, 0.1]} />
      </mesh>
      <mesh position={[6.78, 2.38, -0.36]} material={darkVoidMat}>
        <boxGeometry args={[0.48, 0.52, 0.1]} />
      </mesh>

      {/* Trung úy Billy Farrow (ghế trái z = -0.34) & Cơ phó Robert Hite (ghế phải z = +0.34) trong buồng lái */}
      {([-0.34, 0.34] as const).map((zp, idx) => (
        <group key={`pilot-${idx}`} position={[4.3, 2.52, zp]}>
          <mesh position={[0, 0.22, 0]} geometry={rbox(0.28, 0.42, 0.34, 0.06)} material={leatherMat} />
          <mesh position={[0.04, 0.24, 0]} geometry={rbox(0.24, 0.34, 0.3, 0.05)} material={maeWestMat} />
          <mesh position={[0.03, 0.52, 0]} material={skinMat}>
            <sphereGeometry args={[0.105, 14, 12]} />
          </mesh>
          <mesh position={[0.01, 0.54, 0]} material={helmetMat}>
            <sphereGeometry args={[0.112, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.68]} />
          </mesh>
        </group>
      ))}

      {/* Hạ sĩ Xạ thủ cắt bom Jacob DeShazer quỳ hơi lệch sang phải (z = +0.06) để không che lấp hốc tối của lỗ thủng [7.96, 2.38, -0.13] */}
      <group position={[leanX, 1.79, 0.05]}>
        <group rotation={[0, -0.14, -0.2]}>
          <mesh position={[0, 0.25, 0]} geometry={rbox(0.25, 0.43, 0.32, 0.06)} material={leatherMat} castShadow />
          <mesh position={[0.05, 0.26, 0]} geometry={rbox(0.2, 0.33, 0.28, 0.04)} material={maeWestMat} />
          <mesh position={[0.02, 0.45, 0]} rotation={[0.15, 0, 0]} material={fleeceMat}>
            <torusGeometry args={[0.092, 0.03, 8, 16]} />
          </mesh>
        </group>

        {/* Đầu đội mũ bay da + kính bay đẩy lên trán, mắt ngoái sang trái nhìn thẳng vào lỗ vỡ [7.96, 2.38, -0.13] */}
        <group position={[0.1, 0.51, -0.02]} rotation={[0.04, 0.24, headTilt]}>
          <mesh material={skinMat} castShadow>
            <sphereGeometry args={[0.098, 16, 14]} />
          </mesh>
          <mesh position={[-0.012, 0.015, 0]} rotation={[0, 0, 0.15]} material={helmetMat}>
            <sphereGeometry args={[0.105, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
          </mesh>
          {([-0.04, 0.04] as const).map((zg, gi) => (
            <group key={`gog-${gi}`} position={[0.084, 0.046, zg]} rotation={[0, Math.PI / 2, 0]}>
              <mesh material={goggleRimMat}>
                <torusGeometry args={[0.026, 0.0055, 8, 14]} />
              </mesh>
              <mesh material={goggleGlassMat}>
                <circleGeometry args={[0.023, 12]} />
              </mesh>
            </group>
          ))}
        </group>

        {/* Tay trái đeo găng da đưa lên gần mép dưới lỗ kính vỡ */}
        <group position={[0.09, 0.36, -0.15]} rotation={[0.14, 0.15, armRaise]}>
          <mesh position={[0.13, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={leatherMat}>
            <cylinderGeometry args={[0.04, 0.045, 0.26, 10]} />
          </mesh>
          <mesh position={[0.27, 0.02, -0.01]} material={leatherMat}>
            <sphereGeometry args={[0.042, 10, 8]} />
          </mesh>
        </group>
      </group>

      {/* Chi tiết bổ trợ thanh khung mũi gãy toác & tia mưa muối bay lọt qua lỗ thủng [7.96, 2.38, -0.13] (không che miệng lỗ!) */}
      {broken && (
        <group position={[7.96, 2.38, -0.13]}>
          {/* Hai đầu thanh nan khung Olive Drab bị gãy gập ở rìa lỗ thủng */}
          <mesh position={[-0.09, 0.14, -0.05]} rotation={[0.45, -0.35, -0.68]} material={frameSnapMat}>
            <cylinderGeometry args={[0.012, 0.012, 0.18, 8]} />
          </mesh>
          <mesh position={[0.07, -0.13, 0.04]} rotation={[-0.38, 0.28, 0.74]} material={frameSnapMat}>
            <cylinderGeometry args={[0.011, 0.011, 0.16, 8]} />
          </mesh>

          {/* Vệt bụi mưa bão mảnh bay xuyên qua tâm lỗ vỡ vào khoang mũi */}
          {Array.from({ length: 6 }, (_, k) => {
            const cycle = ((t * 5.8 + k * 0.17) % 1 + 1) % 1;
            const sx = lerp(0.24, -0.36, cycle);
            const sy = (rnd(k * 13 + 3) - 0.5) * 0.14;
            const sz = (rnd(k * 29 + 7) - 0.5) * 0.14;
            return (
              <mesh
                key={`wind-streak-${k}`}
                position={[sx, sy, sz]}
                rotation={[0, 0.28, -0.16]}
                material={plain('#eef7ff', 0.2, 0.1, {
                  transparent: true,
                  opacity: Math.sin(cycle * Math.PI) * 0.62,
                })}
              >
                <boxGeometry args={[0.19, 0.0055, 0.0055]} />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

/** Thủy thủ boong tàu Hải quân Mỹ đứng khom cứu hộ (gốc y = 0 luôn bám mặt sàn, không xuyên sàn). */
const StandingRescuerCrew: React.FC<{
  jerseyColor: string;
  vestColor: string;
  helmetColor: string;
  crouch?: number;
  stride?: number;
}> = ({ jerseyColor, vestColor, helmetColor, crouch = 0.32, stride = 0 }) => {
  const jerseyMat = useMemo(() => plain(jerseyColor, 0.82, 0.05), [jerseyColor]);
  const vestMat = useMemo(() => plain(vestColor, 0.78, 0.06), [vestColor]);
  const pantsMat = useMemo(() => plain('#152233', 0.86, 0.05), []);
  const helmetMat = useMemo(() => plain(helmetColor, 0.74, 0.08), [helmetColor]);
  const skinMat = useMemo(() => plain('#c99d7c', 0.68, 0.04), []);
  const bootMat = useMemo(() => plain('#1a1c1e', 0.85, 0.12), []);

  const hipY = 0.82 - crouch * 0.24;
  const torsoBend = 0.34 + crouch * 0.98;

  return (
    <group>
      {/* Hai chân khuỵu gối bám chắc mặt sàn ướt (đế giày luôn tại y >= 0.05, cách xa thân người ngã) */}
      {([-0.12, 0.12] as const).map((zl, li) => {
        const s = li === 0 ? stride : -stride;
        return (
          <group key={`leg-${li}`}>
            <mesh
              position={[s * 0.1, 0.055, zl]}
              geometry={rbox(0.24, 0.11, 0.14, 0.03)}
              material={bootMat}
              castShadow
            />
            <mesh
              position={[0.03 + s * 0.06, hipY * 0.52, zl]}
              rotation={[0, 0, -0.2 * crouch + s * 0.24]}
              geometry={rbox(0.16, hipY * 0.96, 0.16, 0.04)}
              material={pantsMat}
              castShadow
            />
          </group>
        );
      })}

      {/* Thân trên cúi rạp về phía trước từ khoảng cách an toàn ~0.72 m để nắm mép vai kéo đồng đội */}
      <group position={[0, hipY, 0]} rotation={[0, 0, -torsoBend]}>
        <mesh position={[0, 0.3, 0]} geometry={rbox(0.25, 0.56, 0.39, 0.06)} material={jerseyMat} castShadow />
        <mesh position={[0.02, 0.32, 0]} geometry={rbox(0.29, 0.41, 0.42, 0.07)} material={vestMat} castShadow />
        <mesh position={[0.05, 0.67, 0]} material={skinMat} castShadow>
          <sphereGeometry args={[0.102, 12, 10]} />
        </mesh>
        <mesh position={[0.04, 0.69, 0]} material={helmetMat}>
          <sphereGeometry args={[0.112, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.74]} />
        </mesh>
        {/* Hai cánh tay vươn chúc xuống nắm đúng bờ vai áo phao thủy thủ bị ngã (không xuyên qua ngực/đầu) */}
        {([-0.21, 0.21] as const).map((za, ai) => (
          <group key={`rarm-${ai}`} position={[0.09, 0.45, za]} rotation={[za * -0.3, za * -0.24, -0.58]}>
            <mesh position={[0.24, 0, 0]} geometry={rbox(0.48, 0.112, 0.112, 0.04)} material={jerseyMat} castShadow />
            <mesh position={[0.49, 0, 0]} material={skinMat}>
              <sphereGeometry args={[0.05, 10, 8]} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

/** Thủy thủ chèn bánh áo xanh trượt ngã ngồi/ngửa trên mặt sàn ướt (toàn bộ cơ thể y >= 0, tuyệt đối không xuyên sàn!). */
const FallenDeckhandCrew: React.FC<{ slipProg: number }> = ({ slipProg }) => {
  const jerseyMat = useMemo(() => plain('#1d4573', 0.82, 0.05), []);
  const vestMat = useMemo(() => plain('#31475e', 0.78, 0.06), []);
  const pantsMat = useMemo(() => plain('#152233', 0.86, 0.05), []);
  const helmetMat = useMemo(() => plain('#18375c', 0.74, 0.08), []);
  const skinMat = useMemo(() => plain('#c99d7c', 0.68, 0.04), []);
  const bootMat = useMemo(() => plain('#1a1c1e', 0.85, 0.12), []);

  // Từ tư thế mất thăng bằng khuỵu chân (slipProg = 0) → trượt ngã ngửa/nghiêng lưng xuống sàn (slipProg = 1, hông tại y = 0.14 m)
  const hipY = lerp(0.76, 0.14, slipProg);
  const backTilt = lerp(0.28, 1.05, slipProg); // Ngả lưng về sau (-X cục bộ), đầu vẫn cao trên sàn y ~ 0.45 m
  const legPitch = lerp(-0.15, 1.38, slipProg); // Hai chân duỗi trượt ra trước trên mặt sàn gỗ

  return (
    <group>
      {/* Hai chân trượt dài trên mặt ván gỗ ướt (y luôn >= 0.09 m) */}
      {([-0.12, 0.12] as const).map((zl, li) => (
        <group
          key={`fleg-${li}`}
          position={[0, hipY, zl]}
          rotation={[li === 0 ? 0.08 : -0.1, 0, legPitch + (li === 0 ? 0.08 : -0.06)]}
        >
          <mesh position={[0, -0.36, 0]} geometry={rbox(0.16, 0.72, 0.16, 0.04)} material={pantsMat} castShadow />
          <mesh position={[0.05, -0.72, 0]} geometry={rbox(0.23, 0.11, 0.14, 0.03)} material={bootMat} />
        </group>
      ))}

      {/* Thân trên ngả ra sau trên sàn ướt, hai tay co trước ngực nắm cổ tay đồng đội cứu hộ */}
      <group position={[0, hipY, 0]} rotation={[0.12 * slipProg, 0, backTilt]}>
        <mesh position={[0, 0.28, 0]} geometry={rbox(0.25, 0.55, 0.39, 0.06)} material={jerseyMat} castShadow />
        <mesh position={[0.02, 0.3, 0]} geometry={rbox(0.29, 0.4, 0.42, 0.07)} material={vestMat} castShadow />
        <mesh position={[0.03, 0.65, 0]} material={skinMat} castShadow>
          <sphereGeometry args={[0.102, 12, 10]} />
        </mesh>
        <mesh position={[0.01, 0.67, 0]} material={helmetMat}>
          <sphereGeometry args={[0.112, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.74]} />
        </mesh>
        {/* Hai tay co gọn phía trước ngực/vai (không chọc ngược ra sau đầu vào thân đồng đội) */}
        <group position={[0.1, 0.38, -0.22]} rotation={[0.24, 0.18, -0.38]}>
          <mesh position={[0.17, 0, 0]} geometry={rbox(0.35, 0.11, 0.11, 0.04)} material={jerseyMat} castShadow />
        </group>
        <group position={[0.1, 0.38, 0.22]} rotation={[-0.24, -0.18, -0.34]}>
          <mesh position={[0.17, 0, 0]} geometry={rbox(0.35, 0.11, 0.11, 0.04)} material={jerseyMat} castShadow />
        </group>
      </group>
    </group>
  );
};

const C02S10: React.FC = () => {
  const t = useT();
  const pose = shipPose(0, 0, 251.4, 35.0, t, SWELL);

  // --- 1. Chiếc #15 phía trước gầm rú phóng đi dọc vạch trắng (x = +35 → +155 m, propFast = true) ---
  // Giữ #15 gầm tối đa lấy đà ở x = +35..+45 m đầu cảnh rồi vọt ngang đảo chỉ huy tới +155 m (tại 340.5 s ở x ~ +64 m cực rõ nét!)
  const p15Spool = prog(t, 330.86, 337.2);
  const p15Takeoff = prog(t, 337.2, 343.8);
  const p15X =
    t <= 337.2
      ? lerp(35.0, 44.0, p15Spool)
      : lerp(44.0, 155.0, Math.pow(p15Takeoff, 1.45));
  const p15Lift = Math.max(0, (p15X - 122.0) / 33.0);
  const p15Y = HORNET_DECK_Y + Math.pow(p15Lift, 1.5) * 6.8;
  const p15Pitch = prog(t, 341.8, 343.8) * 0.17;
  const showPlane15 = t < 344.5;

  // --- 2. Chiếc #16 "Bat Out of Hell" (Billy Farrow) nhích lên & bị gió xoáy cánh quạt quật chao đảo ---
  const edgeFwd = prog(t, 338.12, 343.35);
  const p16X = lerp(-28.0, -16.6, edgeFwd);

  // Luồng prop wash dữ dội từ #15 quật #16 chao nghiêng trượt ngang trên sàn ướt (339.88–342.4 s)
  const washEnv = prog(t, 339.35, 340.05) * (1 - prog(t, 342.25, 343.25));
  const slipJolt = bump(t, CUE.c02_s10_deckhand_slips, 0.7);

  const p16Roll =
    washEnv * (Math.sin((t - 339.55) * 6.4) * 0.098 + 0.036) +
    Math.sin(t * 2.9) * 0.008;
  const p16Yaw =
    lerp(0.035, 0, edgeFwd) +
    washEnv * Math.sin((t - 339.75) * 4.8) * 0.075;
  const p16Pitch = washEnv * Math.sin((t - 339.6) * 7.5) * 0.018;
  const p16Z =
    lerp(-1.32, HORNET_B25_Z, edgeFwd) +
    washEnv * Math.sin((t - 339.7) * 4.6) * 0.85;
  const p16Y = HORNET_DECK_Y + Math.abs(Math.sin((t - 339.6) * 6.4)) * washEnv * 0.12;

  const p16Pos: V3 = [p16X, p16Y, p16Z];
  const p16Rot: V3 = [p16Roll, p16Yaw, p16Pitch];
  const isBrokenNose = t >= 347.0;
  const p16PropFast = t >= 338.15;

  // --- 3. Diễn hoạt tiết chế sự cố thủy thủ chèn bánh áo xanh trượt chân & đồng đội lao tới kéo lùi (342.7–347.0 s) ---
  const showDeckIncident = t >= 342.4 && t < 347.12;
  const slipProg = prog(t, 343.22, 343.92);
  const rescueRush = prog(t, 343.86, 344.68);
  const dragBack = prog(t, 344.48, 346.7);

  // Thủy thủ trượt chân về phía đĩa cánh quạt trái (z_prop = p16Z - 3.05 = -3.90, mép ngoài cánh quạt tại z = -5.82)
  // rồi được 2 đồng đội khom thấp ôm vai kéo lùi khẩn cấp ra ngoài z = -6.05
  const sailorX = p16X + lerp(4.05, 4.55, slipProg) - dragBack * 0.78;
  const sailorZ = p16Z - lerp(4.95, 4.15, slipProg) - dragBack * 1.38;

  // Hai đồng đội boong tàu tách rộng ~1.32 m hai bên vai sau lưng thủy thủ ngã (0% chồng lấp 3D lẫn 2D!)
  // FallenDeckhandCrew xoay yaw = -0.55 (chân duỗi về phía trước-mạn trong hướng cánh quạt, đầu ngả về phía sau-mạn ngoài):
  // - rescuer1 (áo xanh, phía sau-mạn trong) nắm bờ vai phải [sailorX - 0.44, sailorZ - 0.01]
  // - rescuer2 (áo vàng Hạ sĩ, phía sau-mạn ngoài, cách rescuer1 1.32 m) nắm bờ vai trái [sailorX - 0.21, sailorZ - 0.39]
  const rescuer1X = lerp(p16X + 1.85, sailorX - 1.12, rescueRush);
  const rescuer1Z = lerp(p16Z - 5.55, sailorZ + 0.26, rescueRush);
  const rescuer2X = lerp(p16X + 2.45, sailorX - 0.68, rescueRush);
  const rescuer2Z = lerp(p16Z - 7.15, sailorZ - 0.98, rescueRush);

  // Khối gỗ chèn bánh vàng văng trượt trên mặt sàn gỗ ướt
  const chockSlide = prog(t, 343.68, 345.6);
  const chockX = p16X + lerp(4.15, 2.55, chockSlide);
  const chockZ = p16Z - lerp(4.2, 4.9, chockSlide);

  // --- 4. Hạt sương bụi nước mù mịt từ cánh quạt chiếc #15 và trên mặt sàn ướt ---
  const sprayItems = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      seedA: rnd(i * 17 + 5),
      seedB: rnd(i * 31 + 11),
      seedC: rnd(i * 47 + 19),
      lane: i % 2 === 0 ? -4.2 : 2.5,
    }));
  }, []);

  // --- 5. Đạo diễn Camera 4 nhịp mạch lạc (biến đổi chuẩn xác sang World Space theo shipPose) ---
  let camPosWorld: V3;
  let camLookWorld: V3;
  let camFov = 39;
  let camRoll = -pose.roll * 0.35;

  if (t < 337.5) {
    // Nhịp 1 (330.86–337.50 s): Góc trung-thấp chéo trước mũi mạn phải sàn tàu giới thiệu chiếc #16 lẻ loi cuối hàng
    const p = prog(t, 330.86, 337.5);
    const localPos: V3 = [lerp(-7.4, -10.8, p), lerp(20.72, 20.38, p), lerp(8.5, 6.2, p)];
    const localLook: V3 = [lerp(-26.2, -24.8, p), lerp(20.22, 20.36, p), lerp(-1.15, -1.0, p)];
    camPosWorld = shipToWorld(localPos, pose);
    camLookWorld = shipToWorld(localLook, pose);
    camFov = 39;
  } else if (t < 342.72) {
    // Nhịp 2 (337.50–342.72 s): Góc 3/4 sau đuôi lấy trọn cả sải cánh #16 đang chao nghiêng lẫn chiếc #15 đang gầm rú phóng đi phía trước!
    const p = prog(t, 337.5, 342.72);
    const shakeY = washEnv * Math.sin(t * 17.0) * 0.09;
    const localPos: V3 = [
      lerp(-40.5, -33.2, p),
      lerp(23.25, 22.45, p) + shakeY,
      lerp(-6.1, -5.2, p),
    ];
    const localLook: V3 = [
      lerp(22.0, 38.0, p),
      lerp(20.3, 20.6, p),
      lerp(-1.15, -0.95, p),
    ];
    camPosWorld = shipToWorld(localPos, pose);
    camLookWorld = shipToWorld(localLook, pose);
    camFov = 42;
    camRoll += washEnv * Math.sin(t * 6.2) * 0.025;
  } else if (t < 347.12) {
    // Nhịp 3 (342.72–347.12 s): Góc tầm mắt boong tàu ngoài mạn trái mũi #16 tách rõ silhouette cả 3 thủy thủ & đĩa cánh quạt trái
    const p = prog(t, 342.72, 347.12);
    const joltY = slipJolt * (Math.sin(t * 46) * 0.22 - 0.1);
    const joltZ = slipJolt * Math.cos(t * 39) * 0.18;
    const localPos: V3 = [
      lerp(-8.15, -8.95, p),
      lerp(20.58, 20.36, p) + joltY,
      lerp(-9.05, -8.65, p) + joltZ,
    ];
    const localLook: V3 = [
      lerp(-12.35, -12.85, p),
      lerp(19.08, 18.92, p) + joltY * 0.4,
      lerp(-4.95, -5.45, p),
    ];
    camPosWorld = shipToWorld(localPos, pose);
    camLookWorld = shipToWorld(localLook, pose);
    camFov = 38;
    camRoll += slipJolt * 0.055 * Math.sin(t * 34);
  } else {
    // Nhịp 4 (347.12–354.86 s): Đẩy mượt từ góc trung-cận đầu mũi B-25 vào cận cảnh sắc nét lỗ vỡ 1 foot tại local [7.96, 2.38, -0.13]
    const push = prog(t, 347.15, 352.1);
    const holdDrift = prog(t, 352.1, 354.86);
    const planeCamPos: V3 = [
      lerp(10.55, 9.08, push) - holdDrift * 0.12,
      lerp(3.02, 2.6, push) - holdDrift * 0.03,
      lerp(-2.22, -1.04, push) + holdDrift * 0.07,
    ];
    const planeCamLook: V3 = [
      lerp(7.15, 7.83, push),
      lerp(2.38, 2.34, push),
      lerp(-0.04, -0.11, push),
    ];
    camPosWorld = shipToWorld(planeToShip(planeCamPos, p16Pos, p16Rot), pose);
    camLookWorld = shipToWorld(planeToShip(planeCamLook, p16Pos, p16Rot), pose);
    camFov = lerp(38, 34, push);
  }

  const preset = STAGE_PRESETS.stormDawn;
  const oceanPalette: OceanSurfaceProps['palette'] = 'stormPacific';

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        {...preset}
        shadowArea={52}
        shadowCenter={[camLookWorld[0], camLookWorld[1], camLookWorld[2]]}
      >
        <Cam pos={camPosWorld} look={camLookWorld} fov={camFov} roll={camRoll} />

        {/* Đại dương bão 30 ft */}
        <OceanSurface t={t} swell={SWELL} size={960} seg={160} center={[0, 0]} palette={oceanPalette} />

        {/* Toàn bộ USS Hornet + máy bay & thủy thủ trên mặt sàn nhấp nhô đồng bộ theo shipPose */}
        <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
          <USSHornet hullNumber="8" showLaunchLines flagWave={t * 5.2} aaYaw={0.18} />

          {/* Chiếc #15 phía trước đang gầm rú phóng dọc vạch trắng ra mũi tàu */}
          {showPlane15 && (
            <group position={[p15X, p15Y, HORNET_B25_Z]} rotation={[0, 0, p15Pitch]}>
              <B25Mitchell
                gear={1}
                propFast
                propSpin={t * 38}
                navLights
                broomsticks
                lowerTurret={false}
                seed={15}
              />
            </group>
          )}

          {/* Chiếc #16 "Bat Out of Hell" của Trung úy Billy Farrow ở cuối sàn tàu */}
          <group position={p16Pos} rotation={p16Rot}>
            <B25Mitchell
              gear={1}
              propFast={p16PropFast}
              propSpin={t * (p16PropFast ? 34 : 18)}
              brokenNose={isBrokenNose}
              navLights
              broomsticks
              lowerTurret={false}
              chained={false}
              seed={16}
            />
            <Plane16CrewAndBrokenDetail t={t} broken={isBrokenNose} />
          </group>

          {/* Phân đoạn tài liệu tiết chế: Thủy thủ chèn bánh trượt ngã trên sàn ướt & 2 đồng đội khom người kéo lùi khẩn cấp */}
          {showDeckIncident && (
            <group>
              {/* Thủy thủ áo xanh trượt ngã trên mặt ván gỗ ướt (chân trượt về phía cánh quạt bên trái, lưng ngả về sau-ngoài hoàn toàn không bị che khuất) */}
              <group position={[sailorX, HORNET_DECK_Y, sailorZ]} rotation={[0, -0.55, 0]}>
                <FallenDeckhandCrew slipProg={slipProg} />
              </group>

              {/* Đồng đội 1 (áo xanh Hải quân, đứng tách phía sau-mạn trong) khom người nắm bờ vai phải kéo lùi */}
              <group position={[rescuer1X, HORNET_DECK_Y, rescuer1Z]} rotation={[0, 0.38, 0]}>
                <StandingRescuerCrew
                  jerseyColor="#234e80"
                  vestColor="#354b63"
                  helmetColor="#1b3b63"
                  crouch={0.42 * rescueRush}
                  stride={Math.sin(t * 13) * 0.22 * (1 - dragBack * 0.4)}
                />
              </group>

              {/* Đồng đội 2 (Hạ sĩ boong tàu áo vàng, đứng tách phía sau-mạn ngoài 1.32 m) khom người nắm bờ vai trái kéo lùi */}
              <group position={[rescuer2X, HORNET_DECK_Y, rescuer2Z]} rotation={[0, -0.9, 0]}>
                <StandingRescuerCrew
                  jerseyColor="#c89622"
                  vestColor="#36485c"
                  helmetColor="#9c7216"
                  crouch={0.44 * rescueRush}
                  stride={Math.cos(t * 13) * 0.22 * (1 - dragBack * 0.4)}
                />
              </group>

              {/* Khối gỗ chèn bánh vàng văng trượt trên sàn gỗ ướt */}
              <mesh
                position={[chockX, HORNET_DECK_Y + 0.11, chockZ]}
                rotation={[0, 0.4 + chockSlide * 1.8, 0]}
                geometry={rbox(0.24, 0.2, 0.48, 0.03)}
                material={plain(PAINT.deckStripeYellow, 0.72, 0.1)}
                castShadow
              />
            </group>
          )}

          {/* Luồng bụi nước từ cánh quạt #15 quét dọc hai bên vạch phóng về phía #16 (độ mờ vừa phải để thấy sắc nét thân #15 phía trước!) */}
          {t < 347.1 &&
            sprayItems.map((sp, idx) => {
              const flow = ((t * 0.88 + sp.seedA) % 1 + 1) % 1;
              const xStart = Math.min(p15X - 7, 72);
              const px = lerp(xStart, p16X - 12, flow);
              const spread = 1.6 + flow * (5.4 + washEnv * 3.5);
              const pz = HORNET_B25_Z + sp.lane + (sp.seedB - 0.5) * spread;
              const py = HORNET_DECK_Y + 0.5 + sp.seedC * (1.8 + washEnv * 1.5) + flow * 1.1;
              const baseOp = (0.09 + washEnv * 0.14) * Math.sin(flow * Math.PI);
              return (
                <SprayPuff
                  key={`wash-${idx}`}
                  pos={[px, py, pz]}
                  size={2.5 + flow * 5.2 + sp.seedB * 2.0}
                  opacity={baseOp}
                  color="#d9e6ef"
                  rot={sp.seedA * 6.28 + t * 0.8}
                />
              );
            })}

          {/* Màn bụi nước mù quanh đĩa cánh quạt trái chiếc #16 che tiết chế vùng mũi giày sát cánh quạt (342.8–346.9 s) */}
          {showDeckIncident &&
            Array.from({ length: 14 }, (_, k) => {
              const cyc = ((t * 1.95 + k * 0.11) % 1 + 1) % 1;
              const burstBoost = 0.24 + slipJolt * 0.34;
              const sx = p16X + 4.9 - cyc * 3.6;
              const sy = HORNET_DECK_Y + 0.55 + rnd(k * 19 + 2) * 2.25;
              const sz = p16Z - 3.15 - (rnd(k * 23 + 9) - 0.35) * (1.2 + cyc * 1.35);
              return (
                <SprayPuff
                  key={`prop-veil-${k}`}
                  pos={[sx, sy, sz]}
                  size={1.85 + cyc * 2.8}
                  opacity={burstBoost * Math.sin(cyc * Math.PI)}
                  color="#e2edf5"
                  rot={k * 1.1 + t * 2.2}
                />
              );
            })}
        </group>
      </Stage>

      <Label
        t={t}
        text="PLANE #16 · BAT OUT OF HELL"
        x={540}
        y={195}
        from={CUE.c02_s10_plane_16}
        until={337.2}
      />
    </div>
  );
};

export default C02S10;
