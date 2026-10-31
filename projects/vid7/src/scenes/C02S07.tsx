// C02S07 (269.60–291.28 s) — 3D 08:20 AM trên USS Hornet giữa bão khơi:
// 1) Cận góc thấp trước mũi-buồng lái chiếc #1 với bóng Trung tá Jimmy Doolittle trong buồng lái sáng ấm.
// 2) Hạ sát mặt sàn ướt trên vạch sơn trắng HORNET_STRIPE_Z = -3.80 đóng khung lốp chính bên trái đè chuẩn xác vạch trắng.
// 3) Trượt ngang sang mạn phải nhìn xuyên dọc khe hở < 6 ft (1.80 m) giữa mút cánh phải B-25 (z = +9.45) và vách thép Đảo chỉ huy (z = +11.25).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lerp, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { softDot } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose, type OceanSurfaceProps } from '../parts/OceanSurface';
import { HORNET_B25_Z, HORNET_DECK_Y, HORNET_STRIPE_Z, USSHornet } from '../parts/USSHornet';

type ShipPose = ReturnType<typeof shipPose>;

/** Chuyển toạ độ cục bộ trên sàn tàu Hornet sang world space khớp tuyệt đối với <group position={[0,pose.y,0]} rotation={[pose.roll,0,pose.pitch]}> */
const shipToWorld = (local: V3, pose: ShipPose): V3 => {
  const v = new THREE.Vector3(local[0], local[1], local[2])
    .applyEuler(new THREE.Euler(pose.roll, 0, pose.pitch, 'XYZ'))
    .add(new THREE.Vector3(0, pose.y, 0));
  return [v.x, v.y, v.z];
};

// Danh sách 15 chiếc B-25B xếp so le 2 hàng chéo nhẹ ở nửa sau sàn tàu (x = -33..-119 m), dùng chung seed=18 để dùng lại cache texture sơn
const WAITING_BOMBERS: { x: number; z: number; yaw: number }[] = Array.from({ length: 15 }, (_, i) => {
  const isPort = i % 2 === 0;
  return {
    x: -33.2 - i * 6.1,
    z: isPort ? -5.35 : 4.55,
    yaw: isPort ? 0.065 : -0.055,
  };
});

/** Tổ bay Doolittle (ghế trái), Cole (ghế phải) & Braemer (mũi kính) ngồi trong buồng lái sáng đèn ấm */
const CockpitCrew: React.FC<{ t: number }> = ({ t }) => {
  const leatherMat = plain('#382317', 0.68, 0.06);
  const helmetMat = plain('#281911', 0.74, 0.05);
  const maeWestMat = plain('#d9a822', 0.66, 0.04);
  const skinMat = plain('#c7926c', 0.72, 0.02);
  const goggleRimMat = plain('#4a4134', 0.52, 0.35);
  const goggleLensMat = plain('#14191e', 0.28, 0.25);
  const strapMat = plain('#463d30', 0.8, 0.05);
  const dialGlowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#ffb04f',
        toneMapped: false,
      }),
    [],
  );

  const headScan = 0.05 * Math.sin(t * 1.15);

  return (
    <group>
      {/* Ánh sáng hổ phách ấm hắt từ bảng đồng hồ từ dưới lên khuôn mặt & áo bay của Doolittle */}
      <pointLight position={[4.86, 2.78, -0.18]} color="#ff9936" intensity={4.2} distance={2.7} decay={2} />

      {/* Các cụm đồng hồ phát sáng trên mặt sau bảng tap-lô (x = 4.90) */}
      {([-0.36, -0.22, -0.08, 0.16, 0.32] as const).map((zd, i) => (
        <mesh key={`dial-${i}`} position={[4.89, 2.79 + (i % 2) * 0.06, zd]} rotation={[0, -Math.PI / 2, 0]} material={dialGlowMat}>
          <circleGeometry args={[0.03, 12]} />
        </mesh>
      ))}

      {/* Phi công chính (ghế trái z = -0.34: Trung tá Jimmy Doolittle) & Cơ phó (ghế phải z = +0.34: Trung úy Richard Cole) */}
      {([-0.34, 0.34] as const).map((zp, idx) => {
        const isDoolittle = idx === 0;
        const yaw = isDoolittle ? headScan : -headScan * 0.6;
        return (
          <group key={`pilot-${idx}`} position={[4.28, 2.56, zp]}>
            {/* Thân áo bay da A-2 */}
            <mesh position={[0.02, 0.26, 0]} rotation={[0, 0, -0.08]} geometry={rbox(0.26, 0.46, 0.36, 0.06)} material={leatherMat} castShadow />
            {/* Phao cứu sinh vàng Mae West quàng cổ & ngực */}
            <mesh position={[0.09, 0.29, 0]} rotation={[0, 0, -0.12]} geometry={rbox(0.16, 0.34, 0.31, 0.04)} material={maeWestMat} />
            {/* Vai & hai tay nắm vô lăng chữ U / cần ga trung tâm */}
            <mesh
              position={[0.21, 0.34, isDoolittle ? -0.14 : 0.14]}
              rotation={[0, isDoolittle ? 0.12 : -0.12, -0.16]}
              geometry={rbox(0.36, 0.1, 0.1, 0.03)}
              material={leatherMat}
            />
            <mesh
              position={[0.22, 0.3, isDoolittle ? 0.16 : -0.13]}
              rotation={[0, isDoolittle ? -0.28 : 0.12, isDoolittle ? -0.28 : -0.16]}
              geometry={rbox(0.36, 0.1, 0.1, 0.03)}
              material={leatherMat}
            />
            {/* Đầu + Mũ bay da B-6 + Kính phi công đẩy lên trán mũ */}
            <group position={[0.05, 0.61, 0]} rotation={[0, yaw, -0.05]}>
              <mesh material={skinMat}>
                <sphereGeometry args={[0.112, 16, 14]} />
              </mesh>
              {/* Mũ bay da ôm đầu & gáy */}
              <mesh position={[-0.014, 0.018, 0]} material={helmetMat}>
                <sphereGeometry args={[0.121, 16, 14, 0, Math.PI * 2, 0, Math.PI * 0.72]} />
              </mesh>
              {/* Dây quai cằm & chụp tai nghe radio */}
              <mesh position={[0.02, -0.055, 0]} geometry={rbox(0.08, 0.09, 0.215, 0.02)} material={helmetMat} />
              {([-0.114, 0.114] as const).map((ze, ei) => (
                <mesh key={`ear-${ei}`} position={[-0.01, -0.01, ze]} rotation={[Math.PI / 2, 0, 0]} material={goggleLensMat}>
                  <cylinderGeometry args={[0.04, 0.04, 0.028, 12]} />
                </mesh>
              ))}
              {/* Quai kính & Kính bay AN-6530 gài cao trên vòm trán mũ da (không loé trắng vào mắt) */}
              <mesh position={[0.01, 0.068, 0]} rotation={[0, 0, -0.22]} material={strapMat}>
                <cylinderGeometry args={[0.123, 0.123, 0.024, 16, 1, true]} />
              </mesh>
              {([-0.042, 0.042] as const).map((zg, gi) => (
                <group key={`gog-${gi}`} position={[0.094, 0.072, zg]} rotation={[0, 0, -0.25]}>
                  <mesh rotation={[0, Math.PI / 2, 0]} material={goggleRimMat}>
                    <torusGeometry args={[0.028, 0.006, 8, 12]} />
                  </mesh>
                  <mesh position={[0.003, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={goggleLensMat}>
                    <circleGeometry args={[0.025, 10]} />
                  </mesh>
                </group>
              ))}
            </group>
          </group>
        );
      })}

      {/* Xạ thủ cắt bom kiêm hoa tiêu (Sgt. Fred Braemer) quỳ quan sát ở khoang mũi kính */}
      <group position={[6.78, 1.82, 0.02]}>
        <mesh position={[0, 0.22, 0]} rotation={[0, 0, -0.32]} geometry={rbox(0.28, 0.36, 0.28, 0.05)} material={leatherMat} />
        <mesh position={[0.07, 0.25, 0]} rotation={[0, 0, -0.32]} geometry={rbox(0.14, 0.26, 0.25, 0.03)} material={maeWestMat} />
        <mesh position={[0.14, 0.44, 0]} material={helmetMat}>
          <sphereGeometry args={[0.105, 14, 12]} />
        </mesh>
      </group>
    </group>
  );
};

/** Thủy thủ chèn bánh (Deck Crew) cúi thấp tránh gió cạnh đường catwalk */
const DeckCrewCrouched: React.FC<{ pos: V3; yaw: number; jerseyColor: string }> = ({ pos, yaw, jerseyColor }) => {
  const jerseyMat = plain(jerseyColor, 0.74, 0.05);
  const pantsMat = plain('#1d2a3a', 0.8, 0.05);
  const helmetMat = plain(jerseyColor, 0.7, 0.06);
  const chockMat = plain(PAINT.deckStripeYellow, 0.72, 0.08);

  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      {/* Hai chân khuỵu chống gió */}
      <mesh position={[-0.08, 0.28, -0.11]} rotation={[0, 0, 0.22]} geometry={rbox(0.13, 0.54, 0.13, 0.03)} material={pantsMat} castShadow />
      <mesh position={[0.1, 0.28, 0.11]} rotation={[0, 0, -0.18]} geometry={rbox(0.13, 0.54, 0.13, 0.03)} material={pantsMat} castShadow />
      {/* Thân cúi thấp */}
      <mesh position={[0.08, 0.68, 0]} rotation={[0, 0, -0.45]} geometry={rbox(0.26, 0.46, 0.34, 0.06)} material={jerseyMat} castShadow />
      {/* Đầu + mũ vải boong tàu */}
      <mesh position={[0.25, 0.94, 0]} material={helmetMat} castShadow>
        <sphereGeometry args={[0.11, 12, 10]} />
      </mesh>
      {/* Tay ôm khối gỗ chèn bánh vừa rút khỏi chiếc #1 */}
      <mesh position={[0.28, 0.6, 0]} geometry={rbox(0.22, 0.18, 0.38, 0.03)} material={chockMat} castShadow />
    </group>
  );
};

/** Khói xả lờ mờ lúc nổ máy chờ xuất kích & bụi mưa muối tạt dọc sàn tàu */
const IdlingSprayAndExhaust: React.FC<{ t: number }> = ({ t }) => {
  const exhaustMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#b8c3cc',
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
      }),
    [],
  );
  const sprayMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#dce8f0',
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
      }),
    [],
  );

  return (
    <group>
      {/* Khói nổ máy nhẹ bay về sau từ 2 cổ xả chiếc #1 (x = -16.6 + 3.4 = -13.2, z = -0.85 ± 3.05) */}
      {([-3.9, 2.2] as const).map((ze, sideIdx) =>
        Array.from({ length: 5 }, (_, k) => {
          const cycle = ((t * 1.6 + k * 0.2 + sideIdx * 0.37) % 1 + 1) % 1;
          const sx = -13.25 - cycle * 4.8;
          const sy = HORNET_DECK_Y + 2.52 + cycle * 0.35;
          const sz = ze + (rnd(k * 7 + sideIdx) - 0.5) * 0.35;
          const sc = 0.65 + cycle * 1.5;
          return <sprite key={`exh-${sideIdx}-${k}`} material={exhaustMat} position={[sx, sy, sz]} scale={[sc, sc * 0.75, sc]} />;
        }),
      )}

      {/* Bụi sóng bão bay là là từ mũi về đuôi ở ngoài rìa boong (không che lốp xe hay mút cánh) */}
      {Array.from({ length: 14 }, (_, i) => {
        const cycle = ((t * 0.55 + rnd(i * 13)) % 1 + 1) % 1;
        const sx = lerp(95, -45, cycle);
        const side = i % 2 === 0 ? -1 : 1;
        const sz = side * lerp(11.8, 16.5, rnd(i * 19 + 3));
        const sy = HORNET_DECK_Y + 0.9 + rnd(i * 29) * 3.2;
        const sc = 4.5 + rnd(i * 31) * 4.0;
        return <sprite key={`mist-${i}`} material={sprayMat} position={[sx, sy, sz]} scale={[sc * 1.8, sc * 0.7, sc]} />;
      })}
    </group>
  );
};

const C02S07: React.FC = () => {
  const t = useT();
  const swell: OceanSurfaceProps['swell'] = 4.2;
  const pose = shipPose(0, 0, 251.4, 35.0, t, swell);

  // Rung động nhẹ theo tiếng nổ máy chờ của chiếc #1 (chỉ rung trục Y rất nhỏ để bánh trái z = -3.80 không lệch 1 mm!)
  const idleVibY = 0.004 * Math.sin(t * 44);
  const idleVibRoll = 0.0012 * Math.sin(t * 37);

  // ---------------- Ba cú máy chuẩn xác trong hệ toạ độ sàn tàu (chuyển sang world bằng shipToWorld) ----------------
  let localPos: V3;
  let localLook: V3;
  let fov = 35;

  if (t < 278.12) {
    // Shot 1 (269.60–278.12 s): Cận góc thấp trước mũi-buồng lái chiếc #1, nhìn rõ Doolittle trong buồng lái sáng ấm
    const p1 = prog(t, 269.6, 278.1);
    localPos = [lerp(-6.75, -7.85, p1), lerp(20.42, 20.78, p1), lerp(-2.92, -2.32, p1)];
    localLook = [lerp(-12.55, -12.35, p1), lerp(21.22, 21.38, p1), lerp(-0.66, -0.58, p1)];
    fov = lerp(38, 34, p1);
  } else {
    // Shot 2 (278.12–281.55 s): Hạ sát mặt sàn ướt trên vạch sơn trắng HORNET_STRIPE_Z = -3.80 đóng khung lốp chính bên trái
    const p2 = prog(t, 278.12, 281.55);
    const s2Pos: V3 = [lerp(-18.65, -18.2, p2), lerp(18.92, 18.88, p2), lerp(HORNET_STRIPE_Z - 0.34, HORNET_STRIPE_Z - 0.28, p2)];
    const s2Look: V3 = [lerp(2.0, 9.0, p2), 18.56, HORNET_STRIPE_Z + 0.03];

    // Shot 3 (281.55–291.28 s): Trượt ngang sang mạn phải nhìn xuyên dọc hành lang hẹp < 6 ft (1.80 m) giữa mút cánh phải (z=+9.44) & vách thép Đảo chỉ huy (z=+11.25)
    const pSlide = prog(t, 281.55, 282.45);
    const p3 = prog(t, 282.45, 291.28);
    const s3Pos: V3 = [lerp(-23.2, -20.6, p3), lerp(22.72, 22.38, p3), lerp(10.18, 10.28, p3)];
    const s3Look: V3 = [lerp(24.0, 30.0, p3), lerp(22.15, 22.05, p3), 9.92];

    if (pSlide <= 0) {
      localPos = s2Pos;
      localLook = s2Look;
      fov = 33;
    } else if (pSlide < 1) {
      // Lượn mượt vòng qua sau đuôi để không bao giờ xuyên qua thân hoặc cánh ngang máy bay
      const arcAft = -1.65 * Math.sin(pSlide * Math.PI);
      localPos = [
        lerp(s2Pos[0], s3Pos[0], pSlide) + arcAft,
        lerp(s2Pos[1], s3Pos[1], pSlide * pSlide),
        lerp(s2Pos[2], s3Pos[2], pSlide),
      ];
      localLook = [
        lerp(s2Look[0], s3Look[0], pSlide),
        lerp(s2Look[1], s3Look[1], pSlide),
        lerp(s2Look[2], s3Look[2], pSlide),
      ];
      fov = lerp(33, 37, pSlide);
    } else {
      localPos = s3Pos;
      localLook = s3Look;
      fov = 37;
    }
  }

  const worldPos = shipToWorld(localPos, pose);
  const worldLook = shipToWorld(localLook, pose);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...STAGE_PRESETS.stormDawn} shadowCenter={[4, 20, 2]} shadowArea={78}>
        <Cam pos={worldPos} look={worldLook} fov={fov} />

        {/* Đại dương Tây Thái Bình Dương sóng bão 30 ft (swell = 4.2) */}
        <OceanSurface t={t} swell={swell} size={1000} seg={128} palette="stormPacific" />

        {/* Toàn bộ USS Hornet + 16 chiếc B-25B gắn chung trong hệ quy chiếu nhấp nhô của thân tàu */}
        <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
          <USSHornet hullNumber="8" showLaunchLines={true} flagWave={t} />
          <IdlingSprayAndExhaust t={t} />

          {/* Chiếc B-25B #1 của Trung tá Jimmy Doolittle tại vạch xuất phát 467 ft (x = -16.6, y = 18.3, z = -0.85) */}
          <group position={[-16.6, HORNET_DECK_Y + idleVibY, HORNET_B25_Z]} rotation={[idleVibRoll, 0, 0]}>
            <B25Mitchell
              gear={1}
              chained={false}
              lowerTurret={false}
              broomsticks={true}
              navLights={true}
              propSpin={t * 14}
              seed={18}
            />
            <CockpitCrew t={t} />
            {/* Ánh sáng xanh lục dịu hắt lên đầu mút cánh phải từ đèn hành trình sẵn có của B25Mitchell (z_ship = +9.44 m) */}
            <pointLight position={[1.34, 2.5, 10.34]} color="#28ff64" intensity={1.6} distance={1.8} decay={2} />
          </group>

          {/* Thủy thủ boong tàu vừa tháo chèn bánh chiếc #1 nép sát mép trái sàn tàu */}
          <DeckCrewCrouched pos={[-13.8, HORNET_DECK_Y, -9.8]} yaw={0.45} jerseyColor="#d8a828" />
          <DeckCrewCrouched pos={[-15.4, HORNET_DECK_Y, -10.9]} yaw={0.32} jerseyColor="#2e5484" />

          {/* 15 chiếc B-25B phía sau đang nổ máy chờ tới lượt (chỉ nằm trong khung nhìn ở Shot 1 khi camera hướng về đuôi) */}
          {t < 278.12 &&
            WAITING_BOMBERS.map((b, idx) => (
              <group key={`wait-b25-${idx}`} position={[b.x, HORNET_DECK_Y, b.z]} rotation={[0, b.yaw, 0]}>
                <B25Mitchell
                  gear={1}
                  chained={idx < 4}
                  lowerTurret={false}
                  broomsticks={true}
                  navLights={false}
                  propSpin={t * (10.5 + (idx % 4) * 1.15) + idx * 1.7}
                  seed={18}
                />
              </group>
            ))}
        </group>
      </Stage>

      {/* Tối đa 1 <Label> trên màn hình tại một thời điểm (cách nhau > 7 giây) */}
      <Label
        t={t}
        text="08:20 AM · PLANE #1"
        x={470}
        y={185}
        from={CUE.c02_s07_820am}
        until={276.8}
      />
      <Label
        t={t}
        text="< 6 FT ISLAND CLEARANCE"
        x={520}
        y={185}
        from={CUE.c02_s07_six_feet}
        until={290.95}
      />
    </div>
  );
};

export default C02S07;
