import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { bump, lerp, prog, useT } from '@core/time';
import { Explosion, MuzzleBlast } from '@skill/military/3d/fx';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { FactoryComplex, TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';
import { JapaneseFighter } from '../parts/JapaneseFighter';
import { OceanSurface } from '../parts/OceanSurface';
import { Type88Flak } from '../parts/Type88Flak';

// Đường bờ biển chéo vịnh Tokyo: đất liền công nghiệp ở (x - 0.72*z < 355), mặt biển OceanSurface mở rộng về phía đông (+X, -Z)
const TOKYO_COAST_H = heightField({
  seed: 308,
  amp: 4.2,
  scale: 155,
  flats: [
    [60, 45, 70, 5.5],
    [185, -35, 65, 5.0],
    [275, 55, 65, 4.5],
  ],
  add: (x, z) => {
    const d = x - 0.72 * z - 355;
    if (d < -42) return 5.2;
    if (d > 42) return -14.5;
    const u = (d + 42) / 84;
    const s = u * u * (3 - 2 * u);
    return lerp(5.2, -14.5, s);
  },
});

const avoidCoastOrBuildings = (x: number, z: number) =>
  x - 0.72 * z > 328 ||
  Math.hypot(x - 60, z - 45) < 48 ||
  Math.hypot(x - 185, z + 35) < 46 ||
  Math.hypot(x - 275, z - 55) < 46;

// Mạng lưới các cụm đạn cao xạ 75mm nổ đen đặc quanh hành lang thoát ly của chiếc B-25 #10
const AMBIENT_FLAK: { at: number; pos: V3; size: number; seed: number }[] = [
  { at: 520.6, pos: [-48, 173, -15], size: 3.3, seed: 7 },
  { at: 521.1, pos: [-35, 170, -14], size: 3.1, seed: 11 },
  { at: 521.6, pos: [-24, 174, -20], size: 3.4, seed: 17 },
  { at: 522.0, pos: [-40, 163, -18], size: 3.0, seed: 23 },
  { at: 523.55, pos: [14, 162, -22], size: 3.1, seed: 29 },
  { at: 524.25, pos: [26, 175, 16], size: 3.1, seed: 31 },
  { at: 527.4, pos: [68, 172, -18], size: 3.3, seed: 41 },
  { at: 529.3, pos: [108, 160, 18], size: 3.2, seed: 47 },
  { at: 531.5, pos: [148, 174, -17], size: 3.4, seed: 53 },
  { at: 533.8, pos: [194, 162, 20], size: 3.2, seed: 59 },
  { at: 536.1, pos: [238, 173, -19], size: 3.3, seed: 67 },
  { at: 538.2, pos: [282, 164, -20], size: 3.4, seed: 73 },
  { at: 540.4, pos: [324, 175, -22], size: 3.2, seed: 79 },
];

const lerp3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

const DIVE_START_AT = 541.85;

const C03S08: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const shrapnelMat = useMemo(() => plain(PAINT.aluminumScrap, 0.25, 0.85), []);
  const sparkMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: '#ffd98a', toneMapped: false }),
    [],
  );
  const holeSmokeMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#22201e',
        roughness: 0.95,
        transparent: true,
        opacity: 0.36,
        depthWrite: false,
      }),
    [],
  );

  // Hàm tính toạ độ & tư thế bay của chiếc B-25 #10 (Lt. Richard Joyce) theo giây tuyệt đối sec
  const evalPlaneState = (sec: number) => {
    const preT = Math.min(sec, DIVE_START_AT);
    let x = -45 + (preT - 522.5) * 20;
    let y = 166 + Math.sin(sec * 1.6) * 0.45;
    let z = Math.sin(sec * 0.85) * 0.5;

    // Rung chấn & hất nghiêng thân máy bay khi đạn cao xạ 75mm nổ cách mạn phải ~4 m (525.04 s) và xé vỏ (526.56 s)
    const blastKick = bump(sec, CUE.c03_s08_shell_explodes, 1.15);
    const ripKick = bump(sec, CUE.c03_s08_shrapnel_hole_8in, 0.85);
    y += blastKick * 1.05 + ripKick * 0.45;
    z -= blastKick * 0.85 + ripKick * 0.35;

    let pitch = 0.015 * Math.sin(sec * 1.3);
    let roll = -0.17 * blastKick - 0.1 * ripKick + 0.04 * Math.sin(sec * 1.05);
    let yaw = 0;

    // Từ 541.85 s ("Joyce shoves@542.14 the nose into a 300@543.38-mph power dive"): chúi mũi lao dốc vọt tốc độ ra biển
    if (sec > DIVE_START_AT) {
      const dtDive = sec - DIVE_START_AT;
      const pDive = prog(sec, DIVE_START_AT, 547.86, Easing.bezier(0.3, 0, 0.65, 1));
      const pEntry = prog(sec, DIVE_START_AT, 543.05);
      const pLevelCoast = prog(sec, 546.4, 547.86);

      // Vận tốc tăng vọt từ 20 m/s lên ~54 m/s trong cú bổ nhào 300 mph lao ra biển
      x += 20 * dtDive + 2.85 * dtDive * dtDive;
      y -= 128 * pDive;
      z -= 54 * pDive;

      pitch = lerp(pitch, -0.44, pEntry) * (1 - 0.3 * pLevelCoast);
      roll = lerp(roll, 0.16, pEntry) * (1 - 0.22 * pLevelCoast);
      yaw = lerp(0, 0.16, pEntry);
    }

    return { pos: [x, y, z] as V3, pitch, roll, yaw };
  };

  const b25 = evalPlaneState(t);
  const hasFlakHole = t >= CUE.c03_s08_shrapnel_hole_8in;

  // Quả đạn cao xạ 75mm nổ chớp lửa cách mạn phải thân sau đúng ~3.9 m tại t = 525.04 s (CUE.c03_s08_shell_explodes)
  const hitMomentPlane = evalPlaneState(CUE.c03_s08_shell_explodes).pos;
  const nearMissBurstPos: V3 = [
    hitMomentPlane[0] - 2.15,
    hitMomentPlane[1] + 2.48,
    hitMomentPlane[2] + 4.65,
  ];

  // Cử động tháp pháo lưng Bendix của Trung sĩ Edwin Horton:
  // Giật mạnh khi mảnh đạn găm vào thân sau (526.56 s), xoay kiểm tra khi Joyce hỏi thăm (534.44 s), rồi quay về đuôi gác 2 tiêm kích Nhật
  const hortonJolt = bump(t, CUE.c03_s08_shrapnel_hole_8in, 1.1);
  const pCheck = prog(t, CUE.c03_s08_horton_check, 537.5);
  const pGuardTail = prog(t, 538.6, 540.4);
  const turretYaw = lerp(
    lerp(0.55 + 0.22 * Math.sin(t * 0.9) + hortonJolt * 0.65, 1.15, pCheck),
    Math.PI - 0.2,
    pGuardTail,
  );
  const turretPitch = lerp(0.24 + hortonJolt * 0.28 + 0.12 * bump(t, 536.6, 1.1), 0.38, pGuardTail);

  // ==================== 2 CHIẾC TIÊM KÍCH NHẬT (scheme="green") BỔ NHÀO CHẶN ĐẦU & BỊ BỎ XA ====================
  const showFighters = t >= 538.4;
  const pIntercept = prog(t, 538.5, 542.1);
  const pOutrun = prog(t, 542.4, 547.86, Easing.bezier(0.28, 0, 0.72, 1));

  // Đội hình bậc thang chiến đấu (combat echelon) tách biệt rõ bóng dáng 2 tiêm kích Nhật ở góc trên-trái bầu trời:
  // không chồng lấp lên nhau hay lên cánh đuôi đứng H-tail của B-25, áp sát ở 542.6 s rồi tụt xa dần phía sau khi B-25 bổ nhào 300 mph ra biển!
  const f1Rel: V3 = [
    lerp(lerp(-34, -12.4, pIntercept), -22.8, pOutrun),
    lerp(lerp(26, 3.1, pIntercept), -1.2, pOutrun),
    lerp(lerp(-38, -17.5, pIntercept), -38.5, pOutrun),
  ];
  const f2Rel: V3 = [
    lerp(lerp(-44, -19.2, pIntercept), -32.0, pOutrun),
    lerp(lerp(22, -0.2, pIntercept), -5.0, pOutrun),
    lerp(lerp(-48, -23.5, pIntercept), -46.5, pOutrun),
  ];
  const fighter1Pos: V3 = [b25.pos[0] + f1Rel[0], b25.pos[1] + f1Rel[1], b25.pos[2] + f1Rel[2]];
  const fighter2Pos: V3 = [b25.pos[0] + f2Rel[0], b25.pos[1] + f2Rel[1], b25.pos[2] + f2Rel[2]];
  const fighterPitch = lerp(-0.46, -0.24, pOutrun);
  const fighterRoll = lerp(0.46, 0.24, pOutrun);
  const fighterYaw = lerp(-0.28, 0.14, pOutrun);

  // ==================== NGÔN NGỮ CAMERA 3 GIAI ĐOẠN ====================
  // Giai đoạn 1 (522.5–525.5 s): Bám trung-cận mạn phải thân sau (+Z) đón quả đạn flak 75mm nổ sát sườn 4 m (525.04 s)
  const camFlakRel: V3 = [-4.45, 3.32, 6.35];
  const lookFlakRel: V3 = [-1.5, 2.66, 1.55];

  // Giai đoạn 2 (525.4–536.4 s): Đẩy cận-trung đóng khung rõ toàn bộ thân sau mạn phải B-25, ngôi sao USAAF, lỗ thủng 8-inch [-2.35, 2.48, +0.76] và vòm tháp lưng Edwin Horton [-0.60, 3.39, 0]
  const pToHole = prog(t, 525.4, 527.35);
  const pHoleDrift = prog(t, 527.35, 536.2, Easing.linear);
  const camHoleRel: V3 = [
    lerp(-3.75, -3.1, pHoleDrift),
    lerp(3.12, 3.3, pHoleDrift),
    lerp(4.75, 5.25, pHoleDrift),
  ];
  const lookHoleRel: V3 = [
    lerp(-1.85, -1.35, pHoleDrift),
    lerp(2.74, 2.88, pHoleDrift),
    0.35,
  ];

  // Giai đoạn 3 (536.3–547.86 s): Nới rộng ra sát sau-ngoài cánh phải & nghiêng chúc gắt bám theo cú bổ nhào 300 mph,
  // thu trọn chiếc B-25 mang vết toác bên sườn lao thẳng ra mặt biển OceanSurface ở tiền cảnh và 2 tiêm kích Nhật bị bỏ xa ở hậu cảnh trên-trái
  const pToDiveChase = prog(t, 536.3, 539.7);
  const pDivePush = prog(t, 542.0, 547.6);
  const camDiveRel: V3 = [
    lerp(-4.6, -3.7, pDivePush),
    lerp(6.4, 5.9, pDivePush),
    lerp(17.6, 17.0, pDivePush),
  ];
  const lookDiveRel: V3 = [
    lerp(-0.9, -0.4, pDivePush),
    lerp(1.15, 0.45, pDivePush),
    lerp(-1.4, -1.85, pDivePush),
  ];

  const camRelA = lerp3(camFlakRel, camHoleRel, pToHole);
  const lookRelA = lerp3(lookFlakRel, lookHoleRel, pToHole);
  const fovA = lerp(46, 41, pToHole);

  const camRel = lerp3(camRelA, camDiveRel, pToDiveChase);
  const lookRel = lerp3(lookRelA, lookDiveRel, pToDiveChase);
  const camFov = lerp(fovA, 48, pToDiveChase);

  // Rung giật camera dữ dội đúng khoảnh khắc đạn cao xạ nổ sát mạn phải (525.04 s) và mảnh đạn xé vỏ (526.56 s)
  const camShake =
    bump(t, CUE.c03_s08_shell_explodes, 0.85) * 0.52 +
    bump(t, CUE.c03_s08_shrapnel_hole_8in, 0.65) * 0.34 +
    prog(t, 542.2, 545.5) * 0.06;

  const camPos: V3 = [
    b25.pos[0] + camRel[0] + Math.sin(t * 53) * camShake,
    b25.pos[1] + camRel[1] + Math.cos(t * 47) * camShake * 0.85,
    b25.pos[2] + camRel[2] + Math.sin(t * 41) * camShake * 0.6,
  ];
  const camLook: V3 = [
    b25.pos[0] + lookRel[0],
    b25.pos[1] + lookRel[1],
    b25.pos[2] + lookRel[2],
  ];
  const camRoll =
    -0.14 * bump(t, CUE.c03_s08_shell_explodes, 0.9) -
    0.21 * prog(t, 541.9, 543.5) * (1 - 0.22 * prog(t, 546.5, 547.86));

  const ripAge = t - CUE.c03_s08_shrapnel_hole_8in;

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.tokyoFire}
        width={W}
        height={H}
        shadowCenter={b25.pos}
        shadowArea={lerp(18, 52, pToDiveChase)}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Đất liền ven vịnh Tokyo chuyển mượt ra mặt biển OceanSurface trải rộng tới tận chân trời mù khói phía đông */}
        <Terrain
          h={TOKYO_COAST_H}
          size={2000}
          seg={144}
          center={[80, 220]}
          colors={TERRAIN_PALETTE.tokyoUrban}
        />
        <OceanSurface
          t={t}
          palette="japanShore"
          swell={0.78}
          size={3600}
          seg={160}
          center={[700, -700]}
        />
        <Scatter
          kind="pine"
          count={140}
          area={[-180, -220, 390, 260]}
          h={TOKYO_COAST_H}
          seed={83}
          scale={[0.85, 1.4]}
          tint="#7c876c"
          avoid={avoidCoastOrBuildings}
        />

        {/* Nhà máy, phố gỗ & các khẩu đội Type 88 75mm dưới đất bắn đuổi theo chiếc B-25 #10 */}
        <group position={[60, 5.5, 45]} rotation={[0, 0.3, 0]}>
          <FactoryComplex variant={1} damage={0.85} />
        </group>
        <group position={[185, 5.0, -35]} rotation={[0, -0.25, 0]}>
          <FactoryComplex variant={0} damage={0.45} />
        </group>
        <group position={[275, 4.5, 55]}>
          <TokyoRowhouseBlock variant={1} />
        </group>
        <group position={[135, 5.2, 72]}>
          <TokyoRowhouseBlock variant={0} />
        </group>

        <group position={[118, 5.2, 18]} rotation={[0, -0.2, 0]}>
          <Type88Flak sandbags elev={1.24} yaw={0.15} recoil={bump(t, 524.7, 0.35)} />
          <MuzzleBlast t={t} at={524.7} pos={[0.8, 3.8, 0.2]} dir={[0.3, 0.94, 0.1]} size={1.8} seed={12} />
        </group>
        <group position={[242, 4.8, -14]} rotation={[0, 0.35, 0]}>
          <Type88Flak sandbags elev={1.2} yaw={-0.25} recoil={bump(t, 533.4, 0.35)} />
          <MuzzleBlast t={t} at={533.4} pos={[0.8, 3.7, -0.2]} dir={[0.35, 0.92, -0.12]} size={1.8} seed={18} />
        </group>

        {/* Cột khói đen bốc cao từ nhà máy luyện thép vừa bị đánh nổ phía sau */}
        <Explosion t={t} at={519.5} pos={[60, 11, 45]} size={16} seed={17} smokeLife={32} smoke="#2e2a27" />

        {/* Các cầu khói flak đen nổ dồn dập quanh chiếc B-25 #10 */}
        {AMBIENT_FLAK.map((f, idx) => (
          <Explosion
            key={idx}
            t={t}
            at={f.at}
            pos={f.pos}
            size={f.size}
            seed={f.seed}
            smokeLife={10}
            smoke="#252321"
          />
        ))}

        {/* QUẢ ĐẠN CAO XẠ 75MM NỔ CHỚP LỬA NGAY CÁCH MẠN PHẢI ~4 M TẠI 525.04 S (CUE.c03_s08_shell_explodes) */}
        <Explosion
          t={t}
          at={CUE.c03_s08_shell_explodes}
          pos={nearMissBurstPos}
          size={4.2}
          seed={88}
          smokeLife={8}
          smoke="#22201e"
        />

        {/* ==================== CHIẾC B-25B #10 CỦA LT. RICHARD JOYCE (flakDamage BẬT TẠI 526.56 S) ==================== */}
        <group position={b25.pos} rotation={[b25.roll, b25.yaw, b25.pitch]}>
          <B25Mitchell
            gear={0}
            bombBay={0}
            propFast
            propSpin={t * 45}
            broomsticks
            flakDamage={hasFlakHole}
            turretYaw={turretYaw}
            turretPitch={turretPitch}
            seed={10}
          />

          {/* Đèn hắt ấm nhẹ mạn phải giúp nổi bật các cánh vỏ nhôm duralumin toác nham nhở tại [-2.35, 2.48, +0.76] */}
          <pointLight
            position={[-2.1, 2.25, 2.05]}
            color="#ffe0b5"
            intensity={1.85}
            distance={4.2}
            decay={1.6}
          />

          {/* Chớp tia lửa kim loại & mảnh nhôm bắn tung về phía tháp lưng Edwin Horton đúng khoảnh khắc xé vỏ 526.56 s */}
          {ripAge >= 0 && ripAge < 1.35 && (
            <group position={[-2.35, 2.48, 0.8]}>
              {ripAge < 0.22 && (
                <>
                  <pointLight color="#ffb85c" intensity={18 * (1 - ripAge / 0.22)} distance={5} decay={1.8} />
                  <mesh scale={0.22 + ripAge * 1.1} material={sparkMat}>
                    <icosahedronGeometry args={[1, 1]} />
                  </mesh>
                </>
              )}
              {Array.from({ length: 12 }, (_, k) => {
                const ang = (k / 12) * Math.PI * 2 + 0.4;
                const vx = 1.4 + (k % 3) * 0.7;
                const vy = 0.8 + Math.sin(ang) * 0.9;
                const vz = 1.1 + Math.cos(ang) * 0.85;
                return (
                  <mesh
                    key={k}
                    position={[vx * ripAge, vy * ripAge - 1.8 * ripAge * ripAge, vz * ripAge]}
                    rotation={[ripAge * 14 + k, ripAge * 11, k]}
                    material={shrapnelMat}
                  >
                    <boxGeometry args={[0.075, 0.045, 0.014]} />
                  </mesh>
                );
              })}
            </group>
          )}

          {/* Luồng tàn khói mảnh rỉ ra từ tâm hốc thủng 8-inch bên sườn sau mạn phải suốt hành trình thoát ly */}
          {hasFlakHole && (
            <group position={[-2.42, 2.46, 0.8]}>
              {Array.from({ length: 6 }, (_, i) => {
                const cycle = ((t * 3.1 + i / 6) % 1);
                const appear = Math.min(1, Math.max(0, (t - CUE.c03_s08_shrapnel_hole_8in - cycle * 0.35) * 4));
                if (appear <= 0.01 || cycle < 0.14) return null;
                const s = 0.09 + cycle * 0.26;
                return (
                  <mesh
                    key={i}
                    position={[-0.22 - cycle * 2.4, cycle * 0.18 + Math.sin(t * 7 + i) * 0.03, 0.04 + cycle * 0.16]}
                    scale={[s * 1.5, s * 0.95, s * 0.95]}
                    material={holeSmokeMat}
                  >
                    <icosahedronGeometry args={[1, 1]} />
                  </mesh>
                );
              })}
            </group>
          )}
        </group>

        {/* ==================== 2 TIÊM KÍCH NHẬT (scheme="green") BỔ NHÀO TRUY KÍCH & BỊ CẮT ĐUÔI ==================== */}
        {showFighters && (
          <>
            <group position={fighter1Pos} rotation={[fighterRoll, fighterYaw, fighterPitch]}>
              <JapaneseFighter scheme="green" gear={0} propFast propSpin={t * 52} seed={31} />
            </group>
            <group position={fighter2Pos} rotation={[fighterRoll * 0.88, fighterYaw * 0.92, fighterPitch * 0.95]}>
              <JapaneseFighter scheme="green" gear={0} propFast propSpin={t * 50} seed={37} />
            </group>
          </>
        )}
      </Stage>

      <Label
        t={t}
        text="300 MPH POWER DIVE"
        x={470}
        y={875}
        from={CUE.c03_s08_power_dive_300mph}
        until={547.62}
        size={46}
      />
    </AbsoluteFill>
  );
};

export default C03S08;
