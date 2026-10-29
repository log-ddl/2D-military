// S21 (383.35 – 397.00s, 3D — STAGE_DAWN):
// Bệ phóng Patriot bắn dốc 2 quả đạn cuối cùng (quả #15 @384.2s, quả #16 @385.6s) khi mưa đầu đạn Oreshnik ập xuống;
// máy đẩy sát mặt trước giàn 4×4 lộ rõ cả 16 ống phóng mở tung 4 cánh nắp cháy sém, lòng ống tối đen rỗng không,
// trong khi đài radar AN/MPQ-65 phía sau vẫn sáng nguyên vẹn.
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { Easing } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Scatter, Terrain, heightField } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, Trail, softDot } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL2D, STAGE_DAWN, TERRAIN_STEPPE } from '../local/palette';
import { OreshnikRV, PAC3, PatriotLauncher, PatriotRadar, patriotMuzzlePos } from '../local/models';

const ELEV_HERO = 32;
const AZ_HERO = 0;

// Địa hình thảo nguyên bình minh có bãi phẳng rộng cho 2 bệ phóng Patriot và gò chỉ huy thoáng cho đài AN/MPQ-65
const H_S21 = heightField({
  seed: 2107,
  amp: 3.4,
  scale: 120,
  flats: [
    [0, 0, 14.5, 0.0],          // Bệ phóng Patriot tiền cảnh (mặt phẳng rộng cho chân chống)
    [-20.5, -3.5, 11.0, 0.45],  // Bệ phóng Patriot số 2 bên sườn trái hậu cảnh
    [-9.2, -13.2, 10.5, 2.10],  // Gò chỉ huy thoáng bên phải đặt đài PatriotRadar (không bị xe nào che khuất)
  ],
  add: (x, z) => {
    const ridge = 5.5 * Math.exp(-(((x + 52) / 30) ** 2)) * Math.exp(-(((z + 38) / 95) ** 2));
    const farHill = 6.2 * Math.exp(-(((z + 115) / 40) ** 2));
    return ridge + farHill;
  },
});

const avoidPads = (x: number, z: number) =>
  Math.hypot(x, z) < 15.5 ||
  Math.hypot(x + 20.5, z + 3.5) < 12.5 ||
  Math.hypot(x + 9.2, z + 13.2) < 12.5 ||
  (x > -6 && x < 12 && z > -10 && z < 9);

const X_AXIS = new THREE.Vector3(1, 0, 0);
const dirQuat = (d: V3) => {
  const v = new THREE.Vector3(d[0], d[1], d[2]);
  if (v.lengthSq() < 1e-8) return new THREE.Quaternion();
  return new THREE.Quaternion().setFromUnitVectors(X_AXIS, v.normalize());
};

const r01 = (i: number, k: number) => {
  const v = Math.sin(i * 19.173 + k * 91.731 + 21.37) * 43758.5453;
  return v - Math.floor(v);
};

/** Quỹ đạo đạn đánh chặn PAC-3 phóng vọt lên tầng cao theo hướng giàn nâng 32°. */
function pac3Point(muzzle: V3, dir: V3, s: number): V3 {
  const dist = s * 98;
  const climb = s * s * 18;
  return [
    muzzle[0] + dir[0] * dist,
    muzzle[1] + dir[1] * dist + climb,
    muzzle[2] + dir[2] * dist,
  ];
}

function makePac3Segment(muzzle: V3, dir: V3, s0: number, s1: number, n = 28): V3[] {
  const a = Math.max(0, Math.min(1, s0));
  const b = Math.max(a + 0.01, Math.min(1, s1));
  return Array.from({ length: n }, (_, i) => pac3Point(muzzle, dir, lerp(a, b, i / (n - 1))));
}

type IncomingRV = {
  start: V3;
  end: V3;
  t0: number;
  dur: number;
  explode?: boolean;
};

// 8 đầu đạn hồi quyển OreshnikRV bổ nhào chéo ngang bầu trời phía sau trận địa (lệch góc lớn với trục Cam)
const INCOMING_RVS: IncomingRV[] = [
  { start: [-62, 92, -32], end: [-24, 2.5, -58], t0: 387.85, dur: 2.75, explode: true },
  { start: [-46, 98, -18], end: [-8, 3.0, -52], t0: 388.18, dur: 2.85, explode: true },
  { start: [-74, 88, -42], end: [-34, 2.0, -68], t0: 388.52, dur: 2.70 },
  { start: [-35, 102, -26], end: [6, 3.5, -56], t0: 388.88, dur: 2.82, explode: true },
  { start: [-56, 96, -12], end: [-16, 2.5, -46], t0: 389.25, dur: 2.75 },
  { start: [-26, 94, -34], end: [16, 3.0, -64], t0: 389.62, dur: 2.78 },
  { start: [-66, 104, -24], end: [-26, 2.5, -54], t0: 390.05, dur: 2.65, explode: true },
  { start: [-42, 95, -38], end: [-2, 3.2, -66], t0: 390.42, dur: 2.65 },
];

/** Khói thuốc phóng trắng xám mỏng còn lơ lửng quanh miệng giàn 4×4 vừa bắn cạn sạch đạn. */
const MuzzleLingeringSmoke: React.FC<{ t: number; slots: V3[] }> = ({ t, slots }) => {
  const tex = useMemo(() => softDot(), []);
  // Khói bốc mạnh ngay sau loạt bắn cuối (384.2–391.5s) và dịu mảnh dần ở cận cảnh (392.5–397s) để không che 16 lòng ống đen
  const closeFade = 1 - 0.62 * prog(t, 391.8, 393.3);
  const items: React.ReactNode[] = [];

  for (let i = 0; i < 14; i++) {
    const slotIdx = i % slots.length;
    const base = slots[slotIdx];
    const fireRef = i < 5 ? CUE.s21_last_salvo1 : i < 10 ? CUE.s21_last_salvo2 : 383.0;
    const dt = t - fireRef;
    if (dt < 0) continue;
    const cycle = (dt * 0.42 + r01(i, 1)) % 1;
    const driftUp = cycle * 1.65;
    const driftFwd = 0.22 + cycle * 0.85;
    const sideZ = (r01(i, 2) - 0.5) * 0.9;
    // Đẩy nhẹ khói lệch lên trên & hai bên vành giàn ở pha cận cảnh để 16 miệng ống sắc nét tuyệt đối
    const liftClear = prog(t, 391.6, 393.2) * 0.45;
    const pos: V3 = [
      base[0] + driftFwd * 0.82,
      base[1] + driftUp + liftClear,
      base[2] + sideZ,
    ];
    const sz = (0.45 + cycle * 1.15) * (0.75 + 0.25 * closeFade);
    const op = Math.sin(cycle * Math.PI) * 0.26 * closeFade;
    if (op <= 0.005) continue;
    items.push(
      <sprite key={i} position={pos} scale={[sz, sz, sz]}>
        <spriteMaterial map={tex} color="#d8dde2" transparent opacity={op} depthWrite={false} />
      </sprite>,
    );
  }
  return <>{items}</>;
};

const S21: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Số đạn còn lại trong bệ phóng tiền cảnh: đầu cảnh còn đúng 2 quả cuối (2 -> 1 -> 0)
  const loadedCount = t < CUE.s21_last_salvo1 ? 2 : t < CUE.s21_last_salvo2 ? 1 : 0;

  // PatriotLauncher mở nắp theo idx >= loadedCount:
  // loadedCount = 2 -> còn slot 0 và slot 1; bắn quả #15 ở slot 1 (@384.2s), bắn quả #16 cuối cùng ở slot 0 (@385.6s)
  const muzzleSlot1 = useMemo(() => patriotMuzzlePos(ELEV_HERO, AZ_HERO, 1), []);
  const muzzleSlot0 = useMemo(() => patriotMuzzlePos(ELEV_HERO, AZ_HERO, 0), []);
  const smokeAnchorSlots = useMemo(
    () => [
      patriotMuzzlePos(ELEV_HERO, AZ_HERO, 0),
      patriotMuzzlePos(ELEV_HERO, AZ_HERO, 1),
      patriotMuzzlePos(ELEV_HERO, AZ_HERO, 3),
      patriotMuzzlePos(ELEV_HERO, AZ_HERO, 4),
    ],
    [],
  );

  const elRad = (ELEV_HERO * Math.PI) / 180;
  const dir1 = useMemo<V3>(() => [Math.cos(elRad), Math.sin(elRad), 0.035], [elRad]);
  const dir0 = useMemo<V3>(() => [Math.cos(elRad), Math.sin(elRad), -0.035], [elRad]);

  const rvPaths = useMemo(
    () =>
      INCOMING_RVS.map((rv) => {
        const pts: V3[] = Array.from({ length: 32 }, (_, k) => {
          const u = k / 31;
          return [
            lerp(rv.start[0], rv.end[0], u),
            lerp(rv.start[1], rv.end[1], u),
            lerp(rv.start[2], rv.end[2], u),
          ];
        });
        const dir: V3 = [
          rv.end[0] - rv.start[0],
          rv.end[1] - rv.start[1],
          rv.end[2] - rv.start[2],
        ];
        return { ...rv, pts, quat: dirQuat(dir) };
      }),
    [],
  );

  // ---------------- Chuyển động Camera 2 pha ----------------
  // Pha 1 (383.35 – 391.4s): Góc máy thấp sát mặt đất cạnh trận địa Patriot, ngước nhìn 2 phát bắn cuối & mưa OreshnikRV
  // Pha 2 (391.4 – 397.0s): Đẩy thẳng vào cận cảnh chính diện chéo mặt trước giàn 4×4 (16 ống mở toác đen khói) + Radar sáng phía sau
  const pDrift1 = prog(t, 383.15, 391.4, Easing.out(Easing.quad));
  const pPush2 = prog(t, 391.35, 393.25, Easing.bezier(0.38, 0.0, 0.18, 1.0));
  const pCreep2 = prog(t, 393.25, 397.0, Easing.linear);

  const pos1: V3 = [
    lerp(8.4, 7.1, pDrift1),
    lerp(1.52, 2.08, pDrift1),
    lerp(6.9, 5.1, pDrift1),
  ];
  const look1: V3 = [
    lerp(-1.8, -4.2, pDrift1),
    lerp(4.2, 7.6, pDrift1),
    lerp(-2.4, -6.5, pDrift1),
  ];

  const pos2: V3 = [
    lerp(5.12, 4.76, pCreep2),
    lerp(5.06, 4.98, pCreep2),
    lerp(1.62, 1.46, pCreep2),
  ];
  const look2: V3 = [
    lerp(1.30, 1.38, pCreep2),
    lerp(4.60, 4.63, pCreep2),
    lerp(-0.52, -0.44, pCreep2),
  ];

  // Rung chấn nhẹ khi 2 quả đạn cuối rời ống và khi đầu đạn hạng nặng dội xuống
  const shakeAmp =
    0.055 * Math.max(0, 1 - Math.abs(t - CUE.s21_last_salvo1) / 0.35) +
    0.065 * Math.max(0, 1 - Math.abs(t - CUE.s21_last_salvo2) / 0.35) +
    0.04 * prog(t, 390.4, 391.9) * (1 - pPush2);
  const sx = Math.sin(t * 37.0) * shakeAmp;
  const sy = Math.cos(t * 43.0) * shakeAmp * 0.7;

  const camPos: V3 = [
    lerp(pos1[0], pos2[0], pPush2) + sx,
    lerp(pos1[1], pos2[1], pPush2) + sy,
    lerp(pos1[2], pos2[2], pPush2),
  ];
  const camLook: V3 = [
    lerp(look1[0], look2[0], pPush2),
    lerp(look1[1], look2[1], pPush2),
    lerp(look1[2], look2[2], pPush2),
  ];
  const fov = lerp(44, 37.5, pPush2);

  // Tiến độ bay của 2 quả đạn đánh chặn PAC-3 cuối cùng (#15 và #16)
  const sPac15 = (t - CUE.s21_last_salvo1) / 3.1;
  const sPac16 = (t - CUE.s21_last_salvo2) / 3.1;

  return (
    <div style={{ position: 'relative', width: 1920, height: 1080, overflow: 'hidden', background: '#0d1b2a' }}>
      <Stage {...STAGE_DAWN} shadowArea={46} shadowCenter={[-4, 0, -5]}>
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Địa hình thảo nguyên Đông Âu lúc bình minh + rừng thông thưa */}
        <Terrain h={H_S21} size={460} seg={220} center={[-15, -25]} colors={TERRAIN_STEPPE} />
        <Scatter
          kind="pine"
          count={140}
          area={[-150, -165, 110, 75]}
          h={H_S21}
          seed={211}
          scale={[0.85, 1.45]}
          avoid={avoidPads}
          tint="#9ab09c"
        />
        <Scatter
          kind="bush"
          count={110}
          area={[-80, -90, 55, 45]}
          h={H_S21}
          seed={212}
          scale={[0.65, 1.2]}
          avoid={avoidPads}
          tint="#8fa488"
        />
        <Scatter
          kind="rock"
          count={48}
          area={[-75, -80, 48, 38]}
          h={H_S21}
          seed={213}
          scale={[0.45, 0.95]}
          avoid={avoidPads}
        />

        {/* 1. BỆ PHÓNG PATRIOT TIỀN CẢNH: bắn dốc nốt 2 quả cuối (loadedCount: 2 -> 1 -> 0) */}
        <PatriotLauncher position={[0, 0, 0]} elev={ELEV_HERO} azimuth={AZ_HERO} loadedCount={loadedCount} />

        {/* 2. BỆ PHÓNG PATRIOT PHỤ BÊN SƯỜN TRÁI HẬU CẢNH (đã bắn cạn sạch 0/16 từ trước, không chắn tầm nhìn Radar) */}
        <PatriotLauncher
          position={[-20.5, 0.45, -3.5]}
          rotation={[0, 0.22, 0]}
          elev={36}
          loadedCount={0}
        />

        {/* 3. ĐÀI RADAR MẢNG PHA AN/MPQ-65 TRÊN GÒ CHỈ HUY PHÍA PHẢI: 100% thông thoáng, mặt mảng pha vẫn phát sáng & quét tia */}
        <PatriotRadar
          position={[-9.2, 2.10, -13.2]}
          rotation={[0, -0.18, 0]}
          activeGlow={0.98}
          showBeam
          beamAngle={[Math.sin(t * 2.4) * 0.14, 0.38 + Math.cos(t * 1.9) * 0.06]}
        />

        {/* Lửa đầu ống + luồng khói phản lực thoát đuôi cho quả đạn thứ 15 (@384.2s) và quả thứ 16 cuối cùng (@385.6s) */}
        <MuzzleBlast t={t} at={CUE.s21_last_salvo1} pos={muzzleSlot1} dir={dir1} size={1.85} seed={2101} />
        <MuzzleBlast t={t} at={CUE.s21_last_salvo1} pos={[-2.15, 1.55, 0.34]} dir={[-0.86, -0.26, 0.08]} size={1.15} seed={2102} />

        <MuzzleBlast t={t} at={CUE.s21_last_salvo2} pos={muzzleSlot0} dir={dir0} size={1.95} seed={2103} />
        <MuzzleBlast t={t} at={CUE.s21_last_salvo2} pos={[-2.15, 1.55, 0.74]} dir={[-0.86, -0.26, 0.12]} size={1.25} seed={2104} />

        {/* Khói trắng xám mỏng còn lơ lửng quanh miệng giàn 4×4 sau khi cạn đạn */}
        <MuzzleLingeringSmoke t={t} slots={smokeAnchorSlots} />

        {/* Quả đạn PAC-3 thứ 15 và vệt khói phản lực rời khỏi miệng ống theo đà bay */}
        {sPac15 > 0 && sPac15 < 1.05 && (
          <>
            <Trail
              points={makePac3Segment(muzzleSlot1, dir1, Math.max(0, (sPac15 - 0.28) * 1.15), Math.min(1, sPac15))}
              color="#ffe5b4"
              width={0.085}
              opacity={0.85 * Math.max(0, 1 - Math.max(0, sPac15 - 0.65) * 2.4)}
            />
            {sPac15 <= 1 && (
              <group
                position={pac3Point(muzzleSlot1, dir1, sPac15)}
                quaternion={dirQuat([
                  pac3Point(muzzleSlot1, dir1, Math.min(1, sPac15 + 0.02))[0] - pac3Point(muzzleSlot1, dir1, sPac15)[0],
                  pac3Point(muzzleSlot1, dir1, Math.min(1, sPac15 + 0.02))[1] - pac3Point(muzzleSlot1, dir1, sPac15)[1],
                  pac3Point(muzzleSlot1, dir1, Math.min(1, sPac15 + 0.02))[2] - pac3Point(muzzleSlot1, dir1, sPac15)[2],
                ])}
              >
                <PAC3 plume={1.05} />
              </group>
            )}
          </>
        )}

        {/* Quả đạn PAC-3 thứ 16 (viên cuối cùng trong bệ phóng!) và vệt khói phản lực tách sạch miệng ống */}
        {sPac16 > 0 && sPac16 < 1.05 && (
          <>
            <Trail
              points={makePac3Segment(muzzleSlot0, dir0, Math.max(0, (sPac16 - 0.28) * 1.15), Math.min(1, sPac16))}
              color="#ffebbf"
              width={0.09}
              opacity={0.88 * Math.max(0, 1 - Math.max(0, sPac16 - 0.65) * 2.4)}
            />
            {sPac16 <= 1 && (
              <group
                position={pac3Point(muzzleSlot0, dir0, sPac16)}
                quaternion={dirQuat([
                  pac3Point(muzzleSlot0, dir0, Math.min(1, sPac16 + 0.02))[0] - pac3Point(muzzleSlot0, dir0, sPac16)[0],
                  pac3Point(muzzleSlot0, dir0, Math.min(1, sPac16 + 0.02))[1] - pac3Point(muzzleSlot0, dir0, sPac16)[1],
                  pac3Point(muzzleSlot0, dir0, Math.min(1, sPac16 + 0.02))[2] - pac3Point(muzzleSlot0, dir0, sPac16)[2],
                ])}
              >
                <PAC3 plume={1.1} />
              </group>
            )}
          </>
        )}

        {/* Mưa đầu đạn siêu vượt âm OreshnikRV rực plasma đỏ cam rạch chéo bầu trời phía sau (387.85 – 393.1s) */}
        {rvPaths.map((rv, idx) => {
          const u = (t - rv.t0) / rv.dur;
          const trailFade = u > 1 ? Math.max(0, 1 - (u - 1) * 1.35) : 1;
          return (
            <React.Fragment key={idx}>
              {u > 0.01 && trailFade > 0.02 && (
                <>
                  <Trail
                    points={rv.pts}
                    upto={Math.min(1, u)}
                    color="#ff4d1a"
                    width={0.34}
                    opacity={0.78 * trailFade}
                  />
                  <Trail
                    points={rv.pts}
                    upto={Math.min(1, u)}
                    color="#ffc66b"
                    width={0.14}
                    opacity={0.95 * trailFade}
                  />
                </>
              )}
              {u > 0 && u <= 1.0 && (
                <group
                  position={[
                    lerp(rv.start[0], rv.end[0], u),
                    lerp(rv.start[1], rv.end[1], u),
                    lerp(rv.start[2], rv.end[2], u),
                  ]}
                  quaternion={rv.quat}
                >
                  <OreshnikRV plasma={1.15} scale={1.38} />
                </group>
              )}
              {rv.explode && (
                <Explosion
                  t={t}
                  at={rv.t0 + rv.dur}
                  pos={rv.end}
                  size={4.8}
                  smokeLife={6.5}
                  seed={2150 + idx}
                />
              )}
            </React.Fragment>
          );
        })}
      </Stage>

      {/* Nhãn duy nhất khắc họa cơ số đạn đã cạn sạch 0 / 16 */}
      <Label
        t={t}
        text="0 / 16 ĐẠN"
        x={960}
        y={150}
        from={393.4}
        until={396.7}
        bg={PAL2D.red}
        fg={PAL2D.paper}
      />
    </div>
  );
};

export default S21;
