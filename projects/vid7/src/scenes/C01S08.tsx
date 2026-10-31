import React, { useMemo } from 'react';
import * as THREE from 'three';
import { lerp, prog, rnd, useT } from '@core/time';
import { softDot } from '@skill/military/3d/fx';
import { lathe, pipe, rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose } from '../parts/OceanSurface';
import { HORNET_DECK_Y, USSHornet } from '../parts/USSHornet';

// ==================== HÌNH HỌC DÙNG CHUNG CẤP MODULE CHO C01S08 ====================

// Kèn loa phóng thanh thép lớn 5MC trên vách Đảo chỉ huy (dài 1.15 m, miệng loe Ø 0.84 m để đọc cực rõ ở góc máy boong tàu)
const BULLHORN_BELL_GEO = (() => {
  const g = lathe(
    [
      [0.11, 0.0],
      [0.14, 0.22],
      [0.21, 0.52],
      [0.34, 0.86],
      [0.43, 1.1],
      [0.45, 1.15],
      [0.41, 1.15],
      [0.31, 0.88],
      [0.18, 0.52],
      [0.11, 0.2],
    ],
    20,
  );
  // lathe tạo dọc trục +X; giữ nguyên mũi loa hướng +X để xoay dễ dàng
  return g;
})();

const CHOCK_BLOCK_GEO = rbox(0.24, 0.21, 0.5, 0.03);
const TORSO_GEO = rbox(0.3, 0.48, 0.42, 0.07);
const MAE_WEST_GEO = rbox(0.34, 0.36, 0.45, 0.09);
const LIMB_UPPER_GEO = rbox(0.13, 0.4, 0.13, 0.05);
const LIMB_LOWER_GEO = rbox(0.115, 0.4, 0.115, 0.045);
const BOOT_GEO = rbox(0.22, 0.11, 0.12, 0.03);

// Vật liệu nhân vật & đạo cụ cache cấp module
const MAT_LEATHER_A2 = plain('#4c2d1c', 0.52, 0.12);
const MAT_MAE_WEST = plain('#f4c42c', 0.58, 0.06); // Áo phao vàng sáng Mae West nổi bật trên nền sàn ướt xám đen
const MAT_KHAKI_PANTS = plain('#70664a', 0.78, 0.05);
const MAT_BOOT_DARK = plain('#211813', 0.65, 0.12);
const MAT_SKIN = plain('#d9a986', 0.68, 0.04);
const MAT_FLIGHT_HELMET = plain('#382115', 0.55, 0.1);
const MAT_GOGGLES = plain('#c5d3de', 0.22, 0.78);
const MAT_OFFICER_CAP = plain('#5d553e', 0.68, 0.08);

const MAT_NAVY_DUNGAREE = plain('#25374d', 0.78, 0.06);
const MAT_NAVY_JERSEY = plain('#2f4c6e', 0.74, 0.06);
const MAT_DECK_HELMET_BLUE = plain('#1f3854', 0.65, 0.08);
const MAT_DECK_HELMET_YELLOW = plain('#dba82e', 0.62, 0.08);

const MAT_BULLHORN_STEEL = plain('#9ab0c4', 0.34, 0.58);
const MAT_BULLHORN_INNER = plain('#1d242c', 0.75, 0.35);
const MAT_BRACKET_DARK = plain('#384654', 0.52, 0.65);
const MAT_CHOCK_YELLOW = plain(PAINT.deckStripeYellow, 0.7, 0.1);
const MAT_CHAIN_STEEL = plain('#2e353d', 0.48, 0.78);

// ==================== COMPONENT: MÔ HÌNH PHI CÔNG LỤC QUÂN USAAF CHẠY GẤP TRÊN SÀN TÀU ====================
const RunningArmyPilot: React.FC<{
  pos: V3;
  yaw: number;
  stridePhase: number;
  running: number; // 0 = đứng khom chống gió cạnh cửa đảo, 1 = chạy nước rút
  officerCap?: boolean;
}> = ({ pos, yaw, stridePhase, running, officerCap = false }) => {
  const swing = Math.sin(stridePhase) * 0.78 * running;
  const oppSwing = -swing;
  const kneeL = Math.max(0.08, -Math.cos(stridePhase) * 0.85 * running + 0.25 * running);
  const kneeR = Math.max(0.08, Math.cos(stridePhase) * 0.85 * running + 0.25 * running);
  const bounce = Math.abs(Math.sin(stridePhase)) * 0.075 * running;
  const forwardLean = lerp(0.14, 0.28, running);
  const torsoTwist = Math.sin(stridePhase) * 0.14 * running;

  return (
    <group position={[pos[0], pos[1] + bounce, pos[2]]} rotation={[0, yaw, 0]}>
      {/* Hông & hai chân bước sải dài (đáy giày chạm đúng y = 0 của mặt sàn tàu khi trụ) */}
      <group position={[0, 0.88, 0]}>
        {/* Chân trái */}
        <group position={[0, 0, -0.11]} rotation={[0, 0, swing]}>
          <mesh position={[0, -0.2, 0]} geometry={LIMB_UPPER_GEO} material={MAT_KHAKI_PANTS} castShadow />
          <group position={[0, -0.4, 0]} rotation={[0, 0, -kneeL]}>
            <mesh position={[0, -0.2, 0]} geometry={LIMB_LOWER_GEO} material={MAT_KHAKI_PANTS} castShadow />
            <mesh position={[0.04, -0.42, 0]} geometry={BOOT_GEO} material={MAT_BOOT_DARK} castShadow />
          </group>
        </group>

        {/* Chân phải */}
        <group position={[0, 0, 0.11]} rotation={[0, 0, oppSwing]}>
          <mesh position={[0, -0.2, 0]} geometry={LIMB_UPPER_GEO} material={MAT_KHAKI_PANTS} castShadow />
          <group position={[0, -0.4, 0]} rotation={[0, 0, -kneeR]}>
            <mesh position={[0, -0.2, 0]} geometry={LIMB_LOWER_GEO} material={MAT_KHAKI_PANTS} castShadow />
            <mesh position={[0.04, -0.42, 0]} geometry={BOOT_GEO} material={MAT_BOOT_DARK} castShadow />
          </group>
        </group>

        {/* Thân trên mặc áo da nâu A-2 + áo phao vàng Mae West rực rỡ */}
        <group rotation={[0, torsoTwist, -forwardLean]}>
          <mesh position={[0, 0.25, 0]} geometry={TORSO_GEO} material={MAT_LEATHER_A2} castShadow />
          {/* Áo phao vàng B-3 Mae West ôm ngực & cổ */}
          <mesh position={[0.03, 0.27, 0]} geometry={MAE_WEST_GEO} material={MAT_MAE_WEST} castShadow />
          <mesh position={[0.01, 0.48, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_MAE_WEST} castShadow>
            <torusGeometry args={[0.14, 0.052, 8, 16, Math.PI * 1.35]} />
          </mesh>
          {/* Đai đen ngang bụng giữ áo phao */}
          <mesh position={[0.03, 0.14, 0]} material={MAT_BOOT_DARK}>
            <boxGeometry args={[0.35, 0.045, 0.46]} />
          </mesh>

          {/* Tay trái đánh mạnh khi chạy */}
          <group position={[0, 0.44, -0.25]} rotation={[0, 0, oppSwing * 0.9 + 0.18]}>
            <mesh position={[0, -0.17, 0]} geometry={LIMB_UPPER_GEO} material={MAT_LEATHER_A2} castShadow />
            <group position={[0, -0.34, 0]} rotation={[0, 0, 0.85]}>
              <mesh position={[0, -0.16, 0]} geometry={LIMB_LOWER_GEO} material={MAT_LEATHER_A2} castShadow />
            </group>
          </group>

          {/* Tay phải đánh ngược pha */}
          <group position={[0, 0.44, 0.25]} rotation={[0, 0, swing * 0.9 + 0.18]}>
            <mesh position={[0, -0.17, 0]} geometry={LIMB_UPPER_GEO} material={MAT_LEATHER_A2} castShadow />
            <group position={[0, -0.34, 0]} rotation={[0, 0, 0.85]}>
              <mesh position={[0, -0.16, 0]} geometry={LIMB_LOWER_GEO} material={MAT_LEATHER_A2} castShadow />
            </group>
          </group>

          {/* Đầu, mũ bay da + kính phi công bạc (hoặc mũ sĩ quan crush cap cho Doolittle) */}
          <group position={[0.02, 0.61, 0]} rotation={[0, -torsoTwist * 0.6, forwardLean * 0.55]}>
            <mesh material={MAT_SKIN} castShadow>
              <sphereGeometry args={[0.115, 14, 12]} />
            </mesh>
            {officerCap ? (
              <group position={[0, 0.06, 0]} rotation={[0, 0, -0.08]}>
                <mesh material={MAT_OFFICER_CAP} castShadow>
                  <cylinderGeometry args={[0.145, 0.12, 0.08, 16]} />
                </mesh>
                <mesh position={[0.1, -0.03, 0]} rotation={[0, 0, -0.2]} material={MAT_BOOT_DARK}>
                  <boxGeometry args={[0.1, 0.018, 0.18]} />
                </mesh>
              </group>
            ) : (
              <group>
                <mesh position={[-0.01, 0.02, 0]} material={MAT_FLIGHT_HELMET} castShadow>
                  <sphereGeometry args={[0.124, 14, 12]} />
                </mesh>
                {/* Kính bay gắn trán mũ da */}
                <mesh position={[0.095, 0.055, -0.042]} rotation={[0, Math.PI / 2, 0]} material={MAT_GOGGLES}>
                  <cylinderGeometry args={[0.036, 0.036, 0.04, 10]} />
                </mesh>
                <mesh position={[0.095, 0.055, 0.042]} rotation={[0, Math.PI / 2, 0]} material={MAT_GOGGLES}>
                  <cylinderGeometry args={[0.036, 0.036, 0.04, 10]} />
                </mesh>
              </group>
            )}
          </group>
        </group>
      </group>
    </group>
  );
};

// ==================== COMPONENT: THUỶ THỦ BOONG TÀU RÚT CHÈN BÁNH VÀNG & THÁO XÍCH ====================
const DeckChockSailor: React.FC<{
  wheelPos: V3;
  pullDir: V3; // Hướng kéo chèn bánh ra khỏi lốp về sát mép hành lang an toàn
  t: number;
  startAt: number;
  yellowHelmet?: boolean;
}> = ({ wheelPos, pullDir, t, startAt, yellowHelmet = false }) => {
  // Tiến độ giật phăng chèn bánh vàng (115.62s -> 116.45s) rồi chạy dạt hẳn ra rìa sàn tàu tránh cánh quạt (116.45s -> 119.3s)
  const pYank = prog(t, startAt, startAt + 0.8);
  const pClear = prog(t, startAt + 0.75, startAt + 3.6);

  const pullDist = lerp(0.42, 1.85, pYank) + pClear * 9.8;
  const sx = wheelPos[0] + pullDir[0] * (pullDist + 0.65);
  const sz = wheelPos[2] + pullDir[2] * (pullDist + 0.65);
  // Khi đã dạt ra sát hành lang súng phòng không mép sàn (|z| > 15.8) thì nhảy xuống hành lang an toàn
  if (Math.abs(sz) > 15.8 || sz > 10.6) return null;

  const isRunningClear = pClear > 0.04 && pClear < 0.99;
  const faceYaw = isRunningClear
    ? Math.atan2(-pullDir[2], pullDir[0])
    : Math.atan2(-pullDir[2], -pullDir[0]);
  const crouch = lerp(0.55, 0.16, Math.min(1, pClear * 2.2));
  const stride = isRunningClear ? Math.sin((t - startAt) * 16.5) * 0.68 : 0;

  // Cặp chèn bánh gỗ vàng được thuỷ thủ xách/kéo theo ra rìa boong
  const chockX = wheelPos[0] + pullDir[0] * (pullDist + (isRunningClear ? 0.35 : 0));
  const chockZ = wheelPos[2] + pullDir[2] * (pullDist + (isRunningClear ? 0.35 : 0));
  const chockY = HORNET_DECK_Y + (isRunningClear ? 0.42 : 0.105);
  const showPulledChock = t >= startAt + 0.08;

  return (
    <group>
      {showPulledChock && (
        <group position={[chockX, chockY, chockZ]} rotation={[0, faceYaw + 0.3 * pYank, 0]}>
          <mesh position={[0.12, 0, 0]} geometry={CHOCK_BLOCK_GEO} material={MAT_CHOCK_YELLOW} castShadow />
          <mesh position={[-0.12, 0, 0.15]} rotation={[0, 0.28, 0]} geometry={CHOCK_BLOCK_GEO} material={MAT_CHOCK_YELLOW} castShadow />
          {!isRunningClear && (
            <mesh
              geometry={pipe(
                [
                  [0.12, 0.02, 0],
                  [0.56, 0.36 - crouch * 0.16, 0.05],
                ],
                0.022,
                6,
              )}
              material={MAT_CHAIN_STEEL}
            />
          )}
        </group>
      )}

      {/* Mô hình thuỷ thủ Hải quân khom người giật dây chèn bánh rồi chạy dạt ra biên */}
      <group position={[sx, HORNET_DECK_Y, sz]} rotation={[0, faceYaw, 0]}>
        <group position={[0, 0.84 - crouch * 0.22, 0]}>
          <group position={[0, 0, -0.11]} rotation={[0, 0, stride - crouch * 0.4]}>
            <mesh position={[0, -0.32, 0]} geometry={LIMB_UPPER_GEO} material={MAT_NAVY_DUNGAREE} castShadow />
            <mesh position={[0.04, -0.62 + crouch * 0.2, 0]} geometry={BOOT_GEO} material={MAT_BOOT_DARK} />
          </group>
          <group position={[0, 0, 0.11]} rotation={[0, 0, -stride + crouch * 0.25]}>
            <mesh position={[0, -0.32, 0]} geometry={LIMB_UPPER_GEO} material={MAT_NAVY_DUNGAREE} castShadow />
            <mesh position={[0.04, -0.62 + crouch * 0.2, 0]} geometry={BOOT_GEO} material={MAT_BOOT_DARK} />
          </group>

          <group rotation={[0, 0, -(0.22 + crouch * 0.65)]}>
            <mesh position={[0, 0.24, 0]} geometry={TORSO_GEO} material={MAT_NAVY_JERSEY} castShadow />
            {/* Hai tay vươn về trước nắm dây kéo chèn bánh */}
            <mesh position={[0.2, 0.28, -0.18]} rotation={[0, 0, 1.05]} geometry={LIMB_UPPER_GEO} material={MAT_NAVY_JERSEY} castShadow />
            <mesh position={[0.2, 0.28, 0.18]} rotation={[0, 0, 1.05]} geometry={LIMB_UPPER_GEO} material={MAT_NAVY_JERSEY} castShadow />
            <group position={[0.04, 0.56, 0]} rotation={[0, 0, 0.35]}>
              <mesh material={MAT_SKIN}>
                <sphereGeometry args={[0.11, 12, 10]} />
              </mesh>
              <mesh position={[-0.01, 0.025, 0]} material={yellowHelmet ? MAT_DECK_HELMET_YELLOW : MAT_DECK_HELMET_BLUE}>
                <sphereGeometry args={[0.122, 12, 10]} />
              </mesh>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

// ==================== COMPONENT: CỤM 3 LOA PHÓNG THANH KÈN THÉP 5MC RUNG PHÁT SÓNG ÂM ====================
const IslandBullhornCluster: React.FC<{
  pos: V3;
  t: number;
  activeAt: number;
  scale?: number;
}> = ({ pos, t, activeAt, scale = 1 }) => {
  const isBlaring = t >= activeAt;
  const dt = Math.max(0, t - activeAt);
  const vib = isBlaring ? Math.sin(dt * 68) * 0.032 : 0;

  // Xếp 3 kèn loa thép theo cụm tam giác 3 chiều (2 dưới xoè hai bên, 1 trên nhô cao ở giữa) để tách rõ cả 3 loa ở mọi góc nhìn!
  const hornMounts: { offset: V3; yaw: number; pitch: number }[] = [
    { offset: [-0.66, -0.22, 0.0], yaw: Math.PI / 2 - 0.28, pitch: -0.32 },
    { offset: [0.0, 0.36, -0.1], yaw: Math.PI / 2 + 0.12, pitch: -0.22 },
    { offset: [0.66, -0.22, 0.0], yaw: Math.PI / 2 + 0.48, pitch: -0.32 },
  ];

  return (
    <group position={pos} scale={scale}>
      {/* Khung giá đỡ thép chữ A vươn rộng khỏi vách Đảo chỉ huy (z = +11.25 -> nhô ra hướng -Z về sàn bay) */}
      <mesh position={[0, 0.05, 0.1]} material={MAT_BRACKET_DARK} castShadow>
        <boxGeometry args={[1.95, 0.92, 0.14]} />
      </mesh>
      <mesh position={[-0.72, -0.24, -0.28]} rotation={[0.48, 0, 0]} material={MAT_BRACKET_DARK}>
        <boxGeometry args={[0.13, 0.13, 0.92]} />
      </mesh>
      <mesh position={[0.72, -0.24, -0.28]} rotation={[0.48, 0, 0]} material={MAT_BRACKET_DARK}>
        <boxGeometry args={[0.13, 0.13, 0.92]} />
      </mesh>
      {/* Hộp đấu dây truyền thanh 5MC & đèn đỏ cảnh báo phát lệnh */}
      <mesh position={[0, 0.06, -0.44]} material={MAT_BRACKET_DARK} castShadow>
        <boxGeometry args={[1.65, 0.42, 0.46]} />
      </mesh>
      <mesh
        position={[0, 0.36, -0.52]}
        material={
          isBlaring
            ? plain('#ff4b38', 0.2, 0.1, { emissive: new THREE.Color('#ff3820'), emissiveIntensity: 3.4 })
            : plain('#5e221c', 0.4, 0.2)
        }
      >
        <sphereGeometry args={[0.085, 10, 8]} />
      </mesh>

      {/* Cụm 3 kèn loa thép loe rộng rung lên bần bật khi phát lệnh */}
      <group position={[vib * 0.45, vib, -0.56]}>
        {hornMounts.map((hm, idx) => (
          <group
            key={`horn-${idx}`}
            position={hm.offset}
            rotation={[0, hm.yaw, hm.pitch]}
          >
            <mesh geometry={BULLHORN_BELL_GEO} material={MAT_BULLHORN_STEEL} castShadow />
            {/* Vành miệng loa sáng kim loại + họng loa tối bên trong */}
            <mesh position={[1.13, 0, 0]} rotation={[0, Math.PI / 2, 0]} material={plain('#c2d3e3', 0.28, 0.72)}>
              <torusGeometry args={[0.43, 0.026, 8, 24]} />
            </mesh>
            <mesh position={[0.92, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={MAT_BULLHORN_INNER}>
              <cylinderGeometry args={[0.31, 0.14, 0.32, 16]} />
            </mesh>
            <mesh position={[0.96, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={MAT_BULLHORN_STEEL}>
              <coneGeometry args={[0.11, 0.28, 14]} />
            </mesh>
          </group>
        ))}

        {/* Vòng sóng xung âm thanh hơi mờ nhẹ lan ra trong sương bão từ miệng cụm 3 loa (118.36 s+) */}
        {isBlaring &&
          [0, 1, 2].map((wIdx) => {
            const period = 1.05;
            const age = (dt - wIdx * (period / 3)) % period;
            if (age < 0 || dt < wIdx * (period / 3)) return null;
            const p = age / period;
            const dist = 1.15 + p * 3.8;
            const radius = 0.68 + p * 1.85;
            const op = Math.sin(p * Math.PI) * (1 - p * 0.6) * 0.24;
            if (op <= 0.008) return null;

            return (
              <group
                key={`sound-ring-${wIdx}`}
                position={[-dist * 0.14, -dist * 0.27, -dist * 0.95]}
                rotation={[0.27, -0.14, 0]}
              >
                <mesh>
                  <torusGeometry args={[radius, 0.026 * (1 - p * 0.35), 8, 32]} />
                  <meshBasicMaterial
                    color="#cfe5f7"
                    transparent
                    opacity={op}
                    depthWrite={false}
                  />
                </mesh>
                <mesh scale={[1.15, 0.76, 1]}>
                  <ringGeometry args={[radius * 0.88, radius * 0.98, 32]} />
                  <meshBasicMaterial
                    color="#c2dcf2"
                    transparent
                    opacity={op * 0.42}
                    depthWrite={false}
                  />
                </mesh>
              </group>
            );
          })}
      </group>
    </group>
  );
};

// ==================== COMPONENT: LUỒNG KHÓI XẢ TRẮNG XÁM ĐỘNG CƠ WRIGHT R-2600 NỔ MÁY ====================
const EngineStartupExhaust: React.FC<{
  enginePos: V3; // Vị trí cổ xả vỏ động cơ trong hệ toạ độ máy bay
  t: number;
  startAt: number;
  seed: number;
}> = ({ enginePos, t, startAt, seed }) => {
  const tex = useMemo(() => softDot(), []);
  if (t < startAt) return null;

  const rate = 14; // 14 cụm khói/giây cho luồng khói xả dày và liền mạch
  const life = 1.55;
  const t0 = Math.max(startAt, t - life);
  const kMin = Math.ceil(t0 * rate);
  const kMax = Math.floor(t * rate);

  const puffs: React.ReactNode[] = [];
  for (let k = kMin; k <= kMax; k++) {
    const born = k / rate;
    const age = t - born;
    if (age < 0 || age > life) continue;

    // Giai đoạn đầu lúc mới sặc xăng nổ máy (0.8s đầu) khói phun thành từng bụm trắng đậm hơn
    const sinceStart = born - startAt;
    const richBurst = sinceStart < 0.9 ? 1.28 : 0.95;
    const normAge = age / life;

    // Gió cánh quạt + gió bão tạt chéo từ mạn phải thổi khói xả phả mạnh ngược ra sau cánh (-X) và tạt rõ sang mạn trái (-Z)
    const speedX = sinceStart < 0.9 ? 6.4 : 10.6;
    const dx = -age * speedX - 1.4 * age * age;
    const dy = -0.08 * age + (rnd(k * 3.1 + seed) - 0.42) * (0.38 + age * 1.0);
    const dz = -age * 2.15 + (rnd(k * 7.7 + seed) - 0.5) * (0.48 + age * 1.2);

    // Tách 2 họng xả hai bên hông dưới vỏ cowling
    const sideSign = k % 2 === 0 ? 1 : -1;
    const px = enginePos[0] + dx;
    const py = enginePos[1] - 0.18 + dy;
    const pz = enginePos[2] + sideSign * 0.58 + dz;

    const size = (0.68 + age * 2.45) * richBurst;
    const fadeIn = Math.min(1, age / 0.08);
    const opacity = fadeIn * Math.pow(1 - normAge, 1.3) * (sinceStart < 0.95 ? 0.68 : 0.54);
    if (opacity <= 0.008) continue;

    const col = sinceStart < 0.55 ? '#edf3f7' : '#cfd9e2';
    puffs.push(
      <sprite key={`ex-${seed}-${k}`} position={[px, py, pz]} scale={[size, size * 0.86, size]}>
        <spriteMaterial
          map={tex}
          color={col}
          transparent
          opacity={opacity}
          depthWrite={false}
          rotation={k * 1.37}
        />
      </sprite>,
    );
  }

  return <>{puffs}</>;
};

// ==================== CẢNH CHÍNH C01S08 (115.38–124.26 s) ====================

const C01S08: React.FC = () => {
  const t = useT();

  // Tư thế nhấp nhô, chúi mũi & nghiêng mạn của tàu sân bay USS Hornet (251.4m × 35.0m) trên sóng bão 30 ft (swell = 4.2)
  const pose = shipPose(0, 0, 251.4, 35.0, t, 4.2);

  // Chuyển đổi chính xác toạ độ cục bộ trên boong tàu sang World Space cho <Cam> theo Euler(roll, 0, pitch, 'XYZ') + [0, pose.y, 0]
  const shipEuler = useMemo(() => new THREE.Euler(pose.roll, 0, pose.pitch, 'XYZ'), [pose.roll, pose.pitch]);
  const toWorld = (lx: number, ly: number, lz: number): V3 => {
    const v = new THREE.Vector3(lx, ly, lz).applyEuler(shipEuler);
    return [v.x, v.y + pose.y, v.z];
  };

  // ==================== QUỸ ĐẠO CAMERA GÓC THẤP ANH HÙNG TRÊN SÀN GỖ ƯỚT ====================
  // Đặt phía trước-trái chiếc B-25 #1 sát mặt sàn (cao hơn sàn 1.15m -> 1.45m), lấy trọn:
  // - Toàn bộ 3 bánh xe B-25 #1 bám sàn + thuỷ thủ rút chèn bánh vàng (115.62 s)
  // - Vách thép Đảo chỉ huy & cụm 3 loa phóng thanh kèn thép rung phát sóng âm (118.36 s)
  // - 12 phi công áo da nâu + áo phao vàng Mae West chạy băng ngang sàn (118.8–124.26 s)
  // - Cánh quạt Wright R-2600 giật quay rồi tăng tốc vù vù + khói xả trắng xám + dãy 16 chiếc B-25 phía sau!
  const pCam = prog(t, 115.38, 124.26);
  const shakeX = Math.sin(t * 7.3) * 0.045 + Math.cos(t * 11.9) * 0.025;
  const shakeY = Math.cos(t * 8.7) * 0.032;

  const localCamPos: V3 = [
    lerp(34.4, 30.8, pCam) + shakeX,
    lerp(HORNET_DECK_Y + 1.14, HORNET_DECK_Y + 1.44, pCam) + shakeY,
    lerp(-7.6, -9.5, pCam),
  ];
  const localCamLook: V3 = [
    lerp(13.2, 8.8, pCam),
    lerp(HORNET_DECK_Y + 2.52, HORNET_DECK_Y + 2.28, pCam),
    lerp(2.6, 1.6, pCam),
  ];

  const worldCamPos = toWorld(...localCamPos);
  const worldCamLook = toWorld(...localCamLook);
  const camFov = lerp(47, 45.2, pCam);
  const camRoll = pose.roll * 0.42 + Math.sin(t * 3.1) * 0.008;

  // ==================== CÔNG THỨC CHUẨN 16 CHIẾC B-25B TRÊN SÀN USS HORNET ====================
  const bombers = useMemo(() => {
    const list: { id: number; x: number; z: number; yaw: number; startEngineAt: number; unchainAt: number }[] = [
      { id: 1, x: 16.0, z: -1.1, yaw: 0, startEngineAt: 119.95, unchainAt: 115.72 },
    ];
    for (let k = 1; k <= 15; k++) {
      const bx = 1.0 - (k - 1) * 8.5;
      const bz = k % 2 === 1 ? -6.2 : 5.8;
      const byaw = k % 2 === 1 ? 0.14 : -0.14;
      // 4 chiếc đầu hàng bắt đầu nổ máy quay cánh quạt nối tiếp nhau trong cao trào 120.0–124.26 s
      const startEngineAt = k === 1 ? 120.75 : k === 2 ? 121.35 : k === 3 ? 122.15 : 999;
      list.push({
        id: k + 1,
        x: bx,
        z: bz,
        yaw: byaw,
        startEngineAt,
        unchainAt: 115.85 + k * 0.14,
      });
    }
    return list;
  }, []);

  // ==================== LỘ TRÌNH 12 PHI CÔNG LỤC QUÂN (ÁO PHAO VÀNG MAE WEST) CHẠY GẤP ====================
  // Xuất phát từ dãy cửa thép chân Đảo chỉ huy (z = +10.85, x = +12..+31) băng ngang sàn gỗ ướt tới các máy bay
  const raiders = useMemo(
    () => [
      // Tổ bay #1 (Jimmy Doolittle dẫn đầu đội mũ sĩ quan, chạy cắt tiền cảnh rộng rãi trên sàn ướt tới B-25 #1)
      { x0: 27.6, z0: 10.6, x1: 22.1, z1: -1.4, goAt: 118.48, dur: 4.8, phase: 0.2, officer: true },
      { x0: 26.2, z0: 10.8, x1: 23.6, z1: -3.5, goAt: 118.82, dur: 4.9, phase: 1.7, officer: false },
      { x0: 29.4, z0: 10.6, x1: 25.4, z1: -5.4, goAt: 119.35, dur: 5.0, phase: 3.1, officer: false },
      { x0: 24.4, z0: 10.8, x1: 15.6, z1: 0.2, goAt: 119.08, dur: 4.8, phase: 4.4, officer: false },
      { x0: 28.8, z0: 10.8, x1: 21.2, z1: -6.2, goAt: 120.1, dur: 4.6, phase: 2.3, officer: false },

      // Tổ bay #2 (chạy băng qua khoảng trống giữa chiếc #1 và chiếc #2 sang mạn trái z = -5.8)
      { x0: 22.0, z0: 10.8, x1: 6.2, z1: -5.2, goAt: 118.92, dur: 5.2, phase: 0.9, officer: false },
      { x0: 19.6, z0: 10.8, x1: 3.6, z1: -6.6, goAt: 119.52, dur: 5.1, phase: 2.8, officer: false },
      { x0: 23.2, z0: 10.8, x1: 10.8, z1: -4.2, goAt: 120.18, dur: 4.6, phase: 5.1, officer: false },

      // Tổ bay #3 & #4 (chạy từ cửa sau Đảo chỉ huy về phía chiếc #3 mạn phải và chiếc #4 mạn trái)
      { x0: 16.4, z0: 10.8, x1: -3.0, z1: 4.5, goAt: 119.22, dur: 5.1, phase: 1.3, officer: false },
      { x0: 14.8, z0: 10.8, x1: -5.6, z1: 6.2, goAt: 119.82, dur: 4.9, phase: 3.8, officer: false },
      { x0: 13.4, z0: 10.7, x1: -9.2, z1: -3.8, goAt: 119.42, dur: 5.3, phase: 4.9, officer: false },
      { x0: 25.8, z0: 10.8, x1: 12.8, z1: -6.4, goAt: 120.48, dur: 4.4, phase: 0.6, officer: false },
    ],
    [],
  );

  // Vật liệu vũng nước mưa bóng loáng trên mặt sàn gỗ ướt để bắt phản chiếu đèn hành trình & bầu trời bão
  const wetSheenMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#202b36',
        roughness: 0.08,
        metalness: 0.62,
        transparent: true,
        opacity: 0.28,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    [],
  );

  const navLightsActive = t >= 119.15;

  return (
    <Stage
      {...STAGE_PRESETS.stormDawn}
      shadowArea={46}
      shadowCenter={[14, pose.y + HORNET_DECK_Y + 2, 1]}
    >
      <Cam pos={worldCamPos} look={worldCamLook} fov={camFov} roll={camRoll} />

      {/* Mặt biển Thái Bình Dương giông bão sóng cồn 30 ft */}
      <OceanSurface t={t} swell={4.2} size={1150} seg={168} palette="stormPacific" />

      {/* Toàn bộ tàu USS Hornet, 16 chiếc B-25B, loa phóng thanh, thuỷ thủ & 12 phi công đồng bộ tuyệt đối theo shipPose */}
      <group position={[0, pose.y, 0]} rotation={[pose.roll, 0, pose.pitch]}>
        <USSHornet hullNumber="8" showLaunchLines={true} flagWave={t * 6.5} aaYaw={0.18} />

        {/* Bóng nước ướt loang trên sàn gỗ tạo chiều sâu phản chiếu dưới gầm B-25 #1 và lối chạy của phi công */}
        <mesh position={[18, HORNET_DECK_Y + 0.008, -1.5]} rotation={[-Math.PI / 2, 0, 0]} material={wetSheenMat} receiveShadow>
          <planeGeometry args={[48, 24]} />
        </mesh>

        {/* Ánh sáng môi trường ấm hổ phách hắt nhẹ từ cửa Đảo chỉ huy + ánh trời lạnh tôn khối cụm 3 loa thép */}
        <pointLight position={[22.5, HORNET_DECK_Y + 3.4, 10.2]} color="#ffd59e" intensity={4.5} distance={22} decay={1.8} />
        <pointLight position={[20.5, 24.4, 8.2]} color="#bcd4eb" intensity={3.2} distance={14} decay={1.8} />

        {/* Cụm 3 loa phóng thanh kèn thép 5MC trên vách Đảo chỉ huy rung mạnh & phát sóng âm từ 118.36 s */}
        <IslandBullhornCluster
          pos={[19.6, 23.35, 11.16]}
          t={t}
          activeAt={CUE.c01_s08_loudspeakers}
          scale={1.15}
        />
        <IslandBullhornCluster
          pos={[28.2, 23.5, 11.16]}
          t={t}
          activeAt={CUE.c01_s08_loudspeakers}
          scale={1.0}
        />

        {/* 3 thuỷ thủ boong tàu rút phăng chèn bánh vàng & tháo dây xích cho chiếc B-25 #1 ngay từ 115.62 s rồi chạy dạt ra mép sàn */}
        <DeckChockSailor
          wheelPos={[16.0 + 5.68, HORNET_DECK_Y, -1.1]}
          pullDir={[0.38, 0, -0.925]}
          t={t}
          startAt={CUE.c01_s08_neither_hesitates}
          yellowHelmet={true}
        />
        <DeckChockSailor
          wheelPos={[16.0 + 1.24, HORNET_DECK_Y, -1.1 - 2.95]}
          pullDir={[0.22, 0, -0.975]}
          t={t}
          startAt={CUE.c01_s08_neither_hesitates + 0.12}
          yellowHelmet={false}
        />
        <DeckChockSailor
          wheelPos={[16.0 + 1.24, HORNET_DECK_Y, -1.1 + 2.95]}
          pullDir={[0.35, 0, 0.935]}
          t={t}
          startAt={CUE.c01_s08_neither_hesitates + 0.22}
          yellowHelmet={false}
        />

        {/* Đội hình 16 chiếc B-25B Mitchell xếp kín sàn đáp (bánh xe chạm khít y = HORNET_DECK_Y = 18.3 m) */}
        {bombers.map((b) => {
          const dtStart = Math.max(0, t - b.startEngineAt);
          // Động cơ Wright R-2600 đề máy khởi động tại chỗ: 3 lá cánh quạt 3D giật quay rồi tăng tốc ấm máy liền mạch (propFast = false)
          const propSpin =
            dtStart <= 0
              ? b.id * 0.55
              : dtStart < 2.4
                ? b.id * 0.55 + dtStart * dtStart * 6.8
                : b.id * 0.55 + 39.17 + (dtStart - 2.4) * 32.64;
          const isChained = t < b.unchainAt;
          const planeNavOn = navLightsActive && t >= 119.15 + Math.min(2.2, (b.id - 1) * 0.16);

          return (
            <group key={`b25-${b.id}`} position={[b.x, HORNET_DECK_Y, b.z]} rotation={[0, b.yaw, 0]}>
              <B25Mitchell
                gear={1}
                chained={isChained}
                broomsticks={true}
                lowerTurret={false}
                navLights={planeNavOn}
                propSpin={propSpin}
                propFast={false}
                seed={18}
              />

              {/* Luồng khói xả trắng xám phả ngược ra sau cánh cho 4 chiếc B-25 đầu hàng khi động cơ Wright R-2600 nổ máy */}
              {b.startEngineAt < 200 && (
                <>
                  <EngineStartupExhaust
                    enginePos={[3.35, 2.58, -3.05]}
                    t={t}
                    startAt={b.startEngineAt + 0.12}
                    seed={b.id * 11 + 1}
                  />
                  <EngineStartupExhaust
                    enginePos={[3.35, 2.58, 3.05]}
                    t={t}
                    startAt={b.startEngineAt + 0.38}
                    seed={b.id * 11 + 2}
                  />
                </>
              )}
            </group>
          );
        })}

        {/* 12 phi công & xạ thủ Lục quân (áo da nâu + áo phao vàng Mae West) chạy băng ngang sàn tàu tới máy bay */}
        {raiders.map((r, idx) => {
          // Trước khi xuất phát từ cửa Đảo chỉ huy: một số đứng nép sát chân vách đảo chờ hiệu lệnh, số trong khoang bước ra khi t >= goAt - 0.25
          if (t < r.goAt - 0.35 && idx > 3) return null;

          const pRun = prog(t, r.goAt, r.goAt + r.dur);
          const isRunning = t >= r.goAt ? (pRun < 0.99 ? 1 : 0.25) : 0;
          const rx = lerp(r.x0, r.x1, pRun);
          const rz = lerp(r.z0, r.z1, pRun);
          const runYaw = Math.atan2(-(r.z1 - r.z0), r.x1 - r.x0);
          const stridePhase = (t - r.goAt) * 16.5 + r.phase;

          return (
            <RunningArmyPilot
              key={`raider-${idx}`}
              pos={[rx, HORNET_DECK_Y, rz]}
              yaw={runYaw}
              stridePhase={stridePhase}
              running={isRunning}
              officerCap={r.officer}
            />
          );
        })}
      </group>
    </Stage>
  );
};

export default C01S08;
