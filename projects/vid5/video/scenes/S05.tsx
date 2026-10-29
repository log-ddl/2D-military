import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { DustTrail, Explosion, softDot, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { P, STAGE_HIGH_ALT, TERRAIN_OZARK } from '../local/palette';
import { F15_BREAK_POS, F15Legacy } from '../local/models';

// Địa hình đồi núi Ozark mùa thu sâu phía dưới (~18.000 ft cảm nhận không gian cao độ)
const BASE_GROUND_Y = -155;
const ozarkHeight = heightField({
  seed: 2007,
  amp: 24,
  scale: 165,
  oct: 5,
  add: (x, z) =>
    BASE_GROUND_Y +
    14 * Math.sin(x * 0.0085 + 0.6) * Math.cos(z * 0.0075 - 0.3) +
    9 * Math.cos((x + z) * 0.011),
});

// Hệ trục máy bay: mũi +X, đỉnh +Y, cánh phải +Z
const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

type FlightSample = {
  t: number;
  pos: V3;
  yaw: number;
  pitch: number;
  bank: number;
};

const T_MIN = 96.0;
const T_MAX = 128.0;
const DT = 0.05;

const smoothStep = (a: number, b: number, x: number) => {
  const u = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return u * u * (3 - 2 * u);
};

// Tính trước bảng quỹ đạo bay C1 mượt cho toàn cảnh S05
const FLIGHT_TABLE: FlightSample[] = (() => {
  const out: FlightSample[] = [];
  let px = -125;
  let py = 44;
  let pz = 68;
  let yaw = 0.06;

  const steps = Math.round((T_MAX - T_MIN) / DT);
  for (let i = 0; i <= steps; i++) {
    const t = T_MIN + i * DT;

    // Nghiêng cánh trái ~67° (-1.17 rad) từ 105.8s kéo vòng ngoặt 7.8G; sau cú nổ gãy 115.0s giảm tải dần về cân bằng
    const turnIn = smoothStep(105.7, 109.1, t);
    const unload = smoothStep(115.2, 121.0, t);
    const patrolSway = -0.1 + 0.035 * Math.sin((t - 96) * 0.75);
    const snapShudder =
      t >= CUE.s05_crackSnap && t < CUE.s05_crackSnap + 2.2
        ? 0.16 *
          Math.sin((t - CUE.s05_crackSnap) * 34) *
          Math.exp(-(t - CUE.s05_crackSnap) * 2.1)
        : 0;

    const bank =
      lerp(patrolSway, -1.17, turnIn) * (1 - unload * 0.94) + snapShudder;

    // Góc ngóc mũi nhẹ khi kéo G cao, sau khi gãy mũi thì chúc nhẹ
    const pitchPull = smoothStep(106.2, 109.8, t) * (1 - smoothStep(115.0, 118.5, t));
    const pitchDrop = smoothStep(117.8, 125.0, t);
    const pitch = 0.018 + 0.055 * pitchPull - 0.075 * pitchDrop;

    out.push({ t, pos: [px, py, pz], yaw, pitch, bank });

    // Tốc độ góc quay hướng (nghiêng trái -> mũi quay sang trái: dyaw > 0)
    const yawRate = 0.008 + 0.148 * turnIn * (1 - smoothStep(115.1, 119.5, t));
    const speed = lerp(15.2, 10.8, smoothStep(116.0, 123.5, t));

    const cosP = Math.cos(pitch);
    const vx = Math.cos(yaw) * cosP * speed;
    const vy = Math.sin(pitch) * speed;
    const vz = -Math.sin(yaw) * cosP * speed;

    px += vx * DT;
    py += vy * DT;
    pz += vz * DT;
    yaw += yawRate * DT;
  }
  return out;
})();

const sampleFlight = (t: number): FlightSample => {
  const clamped = Math.max(T_MIN, Math.min(T_MAX - 1e-4, t));
  const f = (clamped - T_MIN) / DT;
  const i = Math.min(FLIGHT_TABLE.length - 2, Math.max(0, Math.floor(f)));
  const u = f - i;
  const a = FLIGHT_TABLE[i];
  const b = FLIGHT_TABLE[i + 1];
  return {
    t: clamped,
    pos: [
      lerp(a.pos[0], b.pos[0], u),
      lerp(a.pos[1], b.pos[1], u),
      lerp(a.pos[2], b.pos[2], u),
    ],
    yaw: lerp(a.yaw, b.yaw, u),
    pitch: lerp(a.pitch, b.pitch, u),
    bank: lerp(a.bank, b.bank, u),
  };
};

/** Đổi điểm cục bộ trên F15Legacy sang toạ độ thế giới khớp tuyệt đối với chuỗi group [yaw -> pitch -> bank]. */
const jetLocalToWorld = (local: V3, s: FlightSample): V3 => {
  const v = new THREE.Vector3(local[0], local[1], local[2]);
  v.applyAxisAngle(X_AXIS, s.bank);
  v.applyAxisAngle(Z_AXIS, s.pitch);
  v.applyAxisAngle(Y_AXIS, s.yaw);
  return [v.x + s.pos[0], v.y + s.pos[1], v.z + s.pos[2]];
};

// Mây mỏng tầng cao tạo cảm giác độ cao 18.000 ft phía trên thung lũng Missouri
const HighClouds: React.FC = () => {
  const clouds = useMemo(() => {
    const r = (i: number, k: number) => {
      const x = Math.sin(i * 19.31 + k * 73.17 + 11.4) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: 48 }, (_, i) => {
      const highBand = i % 3 === 0;
      return {
        pos: [
          -320 + r(i, 1) * 720,
          highBand ? 18 + r(i, 2) * 38 : -26 + r(i, 2) * 32,
          highBand
            ? (r(i, 3) < 0.5 ? -290 - r(i, 7) * 140 : 120 + r(i, 7) * 180)
            : -280 + r(i, 3) * 560,
        ] as V3,
        sx: 95 + r(i, 4) * 125,
        sy: 18 + r(i, 5) * 20,
        opacity: highBand ? 0.24 + r(i, 6) * 0.16 : 0.22 + r(i, 6) * 0.18,
      };
    });
  }, []);

  const mats = useMemo(
    () =>
      clouds.map(
        (c) =>
          new THREE.SpriteMaterial({
            map: softDot(),
            color: '#f2f8ff',
            transparent: true,
            opacity: c.opacity,
            depthWrite: false,
          }),
      ),
    [clouds],
  );

  return (
    <group>
      {clouds.map((c, idx) => (
        <sprite
          key={idx}
          material={mats[idx]}
          position={c.pos}
          scale={[c.sx, c.sy, 1]}
        />
      ))}
    </group>
  );
};

const LEFT_WINGTIP_LOCAL: V3 = [-4.15, 2.27, -6.52];
const RIGHT_WINGTIP_LOCAL: V3 = [-4.15, 2.27, 6.52];

const S05: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const cur = sampleFlight(t);

  // Toạ độ điểm nổ gãy dầm upper-right longeron tại đúng giây sự kiện
  const snapBreakPos = useMemo(
    () => jetLocalToWorld(F15_BREAK_POS, sampleFlight(CUE.s05_crackSnap)),
    [],
  );
  const splitBreakPos = useMemo(
    () => jetLocalToWorld(F15_BREAK_POS, sampleFlight(CUE.s05_breakApart)),
    [],
  );

  // Quỹ đạo khói rò rỉ từ vách ngăn bị xé toác sau 115.00s
  const breakSmokePath = useMemo(
    () => (born: number): V3 =>
      jetLocalToWorld([3.05, 2.25, 0.35], sampleFlight(born)),
    [],
  );

  // Vệt hơi nước ngưng tụ đầu cánh (wingtip vortices) khi kéo vòng ngoặt 7.8G (106.2s -> 117.0s)
  const showVortex = t >= 106.25 && t <= 117.4;
  const vortexOpacity =
    0.58 * prog(t, 106.25, 107.6) * (1 - prog(t, 115.1, 117.3));

  const { leftTrail, rightTrail } = useMemo(() => {
    if (!showVortex) return { leftTrail: [] as V3[], rightTrail: [] as V3[] };
    const headT = Math.min(t, 115.45);
    const tailT = Math.max(106.1, headT - 2.35);
    const count = 42;
    const lPts: V3[] = [];
    const rPts: V3[] = [];
    for (let k = 0; k < count; k++) {
      const st = lerp(tailT, headT, k / (count - 1));
      const fs = sampleFlight(st);
      lPts.push(jetLocalToWorld(LEFT_WINGTIP_LOCAL, fs));
      rPts.push(jetLocalToWorld(RIGHT_WINGTIP_LOCAL, fs));
    }
    return { leftTrail: lPts, rightTrail: rPts };
  }, [showVortex, t]);

  // Tiến độ gãy rời cụm mũi và phóng ghế ACES II + bung dù C-9
  const breakSplit = prog(t, CUE.s05_breakApart, 124.5);
  const ejectProgress = prog(t, CUE.s05_eject, 126.5);
  const ab = lerp(0.55, 0.12, prog(t, CUE.s05_crackSnap, 119.5));

  // Chuyển động camera rượt đuổi trên không (lệch 55°–80° so với vector Trail, mở rộng trọn khung khi gãy & phóng ghế)
  const pTurn = prog(t, 105.4, 110.2);
  const pCrack = prog(t, 114.2, 118.4);
  const pWide = prog(t, 120.4, 125.6);

  // Hệ trục địa phương theo hướng bay ngang (yaw) để giữ góc máy luôn chuẩn
  const fwdX = Math.cos(cur.yaw);
  const fwdZ = -Math.sin(cur.yaw);
  const rightX = Math.sin(cur.yaw);
  const rightZ = Math.cos(cur.yaw);

  // Pha 1: 3/4 trước-trái trên cao -> Pha 2: bụng trong vòng lượn 7.8G (lấy trọn cả 2 đầu cánh & 2 vệt hơi nước) -> Pha 3: ngang 3/4 bắt trọn vết gãy -> Pha 4: mở trọn mũi rơi & vòm dù cứu sinh
  const camFwd = lerp(lerp(lerp(18, -7.5, pTurn), 6.5, pCrack), 5.5, pWide);
  const camSide = lerp(lerp(lerp(-23, -29.5, pTurn), -31, pCrack), -49, pWide);
  const camUp = lerp(lerp(lerp(10.5, 9.8, pTurn), 8.2, pCrack), 9.6, pWide);

  const shakeAmp =
    bump(t, CUE.s05_crackSnap, 0.65) * 0.95 +
    bump(t, CUE.s05_breakApart, 0.55) * 0.65 +
    bump(t, CUE.s05_eject, 0.45) * 0.4;
  const shakeY = Math.sin(t * 47) * shakeAmp;
  const shakeSide = Math.cos(t * 39) * shakeAmp * 0.8;

  const camPos: V3 = [
    cur.pos[0] + fwdX * camFwd + rightX * (camSide + shakeSide),
    cur.pos[1] + camUp + shakeY,
    cur.pos[2] + fwdZ * camFwd + rightZ * (camSide + shakeSide),
  ];

  // Điểm nhìn dịch dần lên tâm trọng học giữa thân chính, mũi rơi phía dưới và dù cứu sinh phía trên
  const lookFwd = lerp(lerp(1.2, 1.8, pCrack), 1.6, pWide);
  const lookUp = lerp(lerp(2.0, 1.8, pCrack), 6.8, pWide);
  const camLook: V3 = [
    cur.pos[0] + fwdX * lookFwd,
    cur.pos[1] + lookUp,
    cur.pos[2] + fwdZ * lookFwd,
  ];

  const camFov = lerp(lerp(41, 42.5, pCrack), 45.5, pWide);
  const camRoll = -0.04 * pTurn * (1 - pCrack);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_HIGH_ALT} shadowCenter={cur.pos} shadowArea={34}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Đồi núi mùa thu Missouri (Ozark) sâu phía dưới */}
        <Terrain
          h={ozarkHeight}
          size={1400}
          seg={200}
          center={[40, -40]}
          colors={TERRAIN_OZARK}
          grainRepeat={56}
        />
        <Scatter
          kind="broadleaf"
          tint="#d8a868"
          count={380}
          area={[-420, -440, 480, 380]}
          h={ozarkHeight}
          seed={51}
          scale={[2.2, 4.0]}
        />
        <Scatter
          kind="broadleaf"
          tint="#c96f3b"
          count={180}
          area={[-400, -420, 460, 360]}
          h={ozarkHeight}
          seed={52}
          scale={[2.0, 3.6]}
        />
        <Scatter
          kind="pine"
          tint="#698548"
          count={150}
          area={[-420, -440, 480, 380]}
          h={ozarkHeight}
          seed={53}
          scale={[2.2, 3.8]}
        />

        {/* Lớp mây mỏng lưng chừng trời */}
        <HighClouds />

        {/* Tiêm kích F-15C Vệ binh Quốc gia Missouri */}
        <group position={cur.pos}>
          <group rotation={[0, cur.yaw, 0]}>
            <group rotation={[0, 0, cur.pitch]}>
              <group rotation={[cur.bank, 0, 0]}>
                <F15Legacy
                  gear={0}
                  afterburner={ab}
                  breakSplit={breakSplit}
                  ejectProgress={ejectProgress}
                />
              </group>
            </group>
          </group>
        </group>

        {/* Hai dải vệt hơi nước đầu cánh khi kéo 7.8G */}
        {showVortex && leftTrail.length >= 2 && (
          <>
            <Trail
              points={leftTrail}
              color="#eef7ff"
              width={0.14}
              opacity={vortexOpacity}
              glow={false}
            />
            <Trail
              points={rightTrail}
              color="#eef7ff"
              width={0.14}
              opacity={vortexOpacity}
              glow={false}
            />
          </>
        )}

        {/* Chớp nổ xé khung dầm upper-right longeron lúc 115.00s và khoảnh khắc gãy đôi 118.00s */}
        <Explosion
          t={t}
          at={CUE.s05_crackSnap}
          pos={snapBreakPos}
          size={2.2}
          smokeLife={6.5}
          seed={5}
          smoke="#565e69"
        />
        <Explosion
          t={t}
          at={CUE.s05_breakApart}
          pos={splitBreakPos}
          size={1.65}
          smokeLife={5.5}
          seed={9}
          smoke="#4d5560"
        />

        {/* Vệt khói xám rò rỉ từ mặt cắt vách ngăn thân trên không */}
        {t >= CUE.s05_crackSnap && (
          <DustTrail
            t={t}
            from={CUE.s05_crackSnap}
            to={127.2}
            path={breakSmokePath}
            rate={11}
            size={1.45}
            color="#697380"
            life={2.8}
          />
        )}
      </Stage>

      <Label
        t={t}
        text="7.8G"
        x={1480}
        y={210}
        from={CUE.s05_gLoad}
        until={114.4}
        bg={P.amber}
        fg={P.ink}
        size={58}
      />
    </AbsoluteFill>
  );
};

export default S05;
