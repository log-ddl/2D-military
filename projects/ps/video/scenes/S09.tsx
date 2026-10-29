import React from 'react';
import { AbsoluteFill } from 'remotion';
import { Label, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Terrain, heightField, ridgeX } from '@lib/3d/terrain';
import { MuzzleBlast, Trail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL2D, STAGE_STRATO } from '../local/palette';
import { Kinzhal, MIG31_PYLON_OFFSET, MiG31K } from '../local/models';

const T_START = 127.3;
const T_TRAIL_END = 143.25;
const V_MIG = 24; // m/s trong không gian cảnh tầng bình lưu

// Địa hình dãy núi cao xa mờ dưới tầng bình lưu (đặt ở y = -110 m)
const STRATO_TERRAIN_H = heightField({
  seed: 91,
  amp: 26,
  scale: 190,
  oct: 5,
  add: (x, z) =>
    ridgeX(140, 34, 150)(x, z) +
    ridgeX(460, 42, 180)(x, z) +
    22 * Math.exp(-(((z + 210) / 160) ** 2)) +
    26 * Math.exp(-(((z - 240) / 175) ** 2)),
});

const STRATO_MOUNTAIN_COLORS = {
  low: '#23394f',
  high: '#4b6884',
  rock: '#5e7389',
  dry: '#9fb6cc',
};

/** Trạng thái bay của tiêm kích mẹ MiG-31K theo giây tuyệt đối τ. */
function migState(tau: number): { pos: V3; rot: V3 } {
  const x = (tau - T_START) * V_MIG;
  // Sau khi cắt đạn 7.2m nặng 4.3 tấn, tiêm kích nhẹ tải nâng nhẹ độ cao và nghiêng thoát ly sang trái (-Z)
  const lift = prog(tau, CUE.s09_drop + 0.15, 139.6);
  const bankAway = prog(tau, CUE.s09_ignite + 0.4, 142.8);
  const y = lift * 1.15;
  const z = -bankAway * 4.2;
  const pitch = lift * 0.024;
  const yaw = bankAway * 0.032;
  const roll = -0.15 * prog(tau, CUE.s09_ignite + 0.3, 139.2) * (1 - 0.35 * prog(tau, 140.8, 142.8));
  return { pos: [x, y, z], rot: [roll, yaw, pitch] };
}

/** Vị trí thế giới của quả Kinzhal theo giây tuyệt đối τ (3 pha: treo giá AKU -> cắt chốt rơi 3.2m -> đốt động cơ rắn leo 22°). */
function kinzhalPos(tau: number): V3 {
  const baseMigX = (tau - T_START) * V_MIG;

  // Pha 1: Treo khít 100% dưới giá bụng trung tâm MIG31_PYLON_OFFSET = [0.4, -1.25, 0]
  if (tau <= CUE.s09_drop) {
    return [
      baseMigX + MIG31_PYLON_OFFSET[0],
      MIG31_PYLON_OFFSET[1],
      MIG31_PYLON_OFFSET[2],
    ];
  }

  // Pha 2: Cắt chốt rơi tự do ~3.2 m dưới bụng máy bay (135.45 -> 136.35s)
  const dropDur = CUE.s09_ignite - CUE.s09_drop; // 0.90 s
  if (tau <= CUE.s09_ignite) {
    const u = (tau - CUE.s09_drop) / dropDur; // 0..1
    const smoothDrop = 3 * u * u - 2 * u * u * u;
    const dx = MIG31_PYLON_OFFSET[0] - 1.0 * u * u; // tụt nhẹ từ +0.4 về -0.6 m do sức cản gió
    const y = MIG31_PYLON_OFFSET[1] - 3.15 * smoothDrop; // rơi từ -1.25 xuống -4.40 m
    return [baseMigX + dx, y, 0];
  }

  // Pha 3: Kích hoạt động cơ nhiên liệu rắn (τ > 136.35s), bứt tốc vượt trước mũi MiG-31K rồi ngóc ~22° vọt lên Mach 10
  const s = tau - CUE.s09_ignite;
  // Quãng đường tương đối dọc +X: vượt qua mũi MiG-31K (+11.31 m) tại s ≈ 1.85s khi vẫn thấp hơn mũi tiêm kích,
  // để khoảng 138.5–139.8s thấy rõ Kinzhal vọt chéo qua ngay phía trước mũi MiG-31K trong cùng khung hình
  const dxRel = -0.6 - 1.9 * s + 4.85 * s * s;
  const worldX = baseMigX + dxRel;

  // Bắt đầu kéo mũi ngóc 22° (tan 22° ≈ 0.404) sau khi đã lao vọt qua phía trước bụng trước
  const sPull = 1.15;
  const xAtPull = (CUE.s09_ignite + sPull - T_START) * V_MIG + (-0.6 - 1.9 * sPull + 4.85 * sPull * sPull);
  const dX = Math.max(0, worldX - xAtPull);
  const turnLen = 26.0;
  const settleDip = 0.15 * Math.sin(Math.min(1, s / sPull) * Math.PI * 0.5);
  const climbY = 0.404 * (dX - turnLen * (1 - Math.exp(-dX / turnLen)));
  const worldY = -4.40 - settleDip + climbY;

  return [worldX, worldY, 0];
}

/** Góc ngóc pitch (rad) quanh trục +Z của Kinzhal khớp chính xác vector vận tốc bay. */
function kinzhalPitch(tau: number): number {
  if (tau <= CUE.s09_drop) return 0;
  if (tau <= CUE.s09_ignite) {
    const u = (tau - CUE.s09_drop) / (CUE.s09_ignite - CUE.s09_drop);
    // Hơi chúi nhẹ -1.8° lúc mới tách chốt rồi cánh đuôi ổn định về ngang trước khi đốt động cơ
    return -0.032 * Math.sin(u * Math.PI);
  }
  const dt = 0.025;
  const p0 = kinzhalPos(Math.max(CUE.s09_ignite, tau - dt));
  const p1 = kinzhalPos(tau + dt);
  const rawPitch = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
  const blend = prog(tau, CUE.s09_ignite, CUE.s09_ignite + 0.28);
  return rawPitch * blend;
}

/** Vị trí loa phụt đuôi Kinzhal (x cục bộ = -3.60 m). */
function kinzhalTailPos(tau: number): V3 {
  const [kx, ky, kz] = kinzhalPos(tau);
  const p = kinzhalPitch(tau);
  return [kx - Math.cos(p) * 3.6, ky - Math.sin(p) * 3.6, kz];
}

// Dãy điểm vệt khói lửa động cơ rắn Kinzhal từ lúc châm lửa (136.35s) tới hết cảnh
const TRAIL_SAMPLES = 180;
const KINZHAL_TRAIL_PTS: V3[] = Array.from({ length: TRAIL_SAMPLES }, (_, i) => {
  const tau = CUE.s09_ignite + (i / (TRAIL_SAMPLES - 1)) * (T_TRAIL_END - CUE.s09_ignite);
  return kinzhalTailPos(tau);
});

const IGNITE_TAIL_POS: V3 = kinzhalTailPos(CUE.s09_ignite);

// Vệt ngưng tụ khí động mờ ở hai đầu mút cánh MiG-31K tạo chiều sâu tốc độ tầng bình lưu
const WINGTIP_SAMPLES = 120;
const WINGTIP_RIGHT_PTS: V3[] = Array.from({ length: WINGTIP_SAMPLES }, (_, i) => {
  const tau = 126.8 + (i / (WINGTIP_SAMPLES - 1)) * (T_TRAIL_END - 126.8);
  const { pos, rot } = migState(tau);
  return [pos[0] - 3.6, pos[1] + 0.34 - Math.sin(rot[0]) * 6.7, pos[2] + 6.72];
});
const WINGTIP_LEFT_PTS: V3[] = Array.from({ length: WINGTIP_SAMPLES }, (_, i) => {
  const tau = 126.8 + (i / (WINGTIP_SAMPLES - 1)) * (T_TRAIL_END - 126.8);
  const { pos, rot } = migState(tau);
  return [pos[0] - 3.6, pos[1] + 0.34 + Math.sin(rot[0]) * 6.7, pos[2] - 6.72];
});

const S09: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const mig = migState(t);
  const kPos = kinzhalPos(t);
  const kPitch = kinzhalPitch(t);

  // Động cơ rắn bùng lực đẩy từ CUE.s09_ignite (136.35s) và mũi nóng sáng khi lên Mach 10
  const plume = t < CUE.s09_ignite ? 0 : 0.92 + 0.22 * prog(t, CUE.s09_ignite, CUE.s09_ignite + 0.16);
  const heatGlow = prog(t, 138.2, CUE.s09_mach10) * 0.78;

  // Chuyển động Camera 3 nhịp mượt mà, luôn đặt lệch sang sườn phải (+Z) để không trùng trục với <Trail>
  // Nhịp 1 (127.3–134.8s): Lướt dưới bụng sườn phải ở cự ly vừa vặn để thấy rõ cả quả Kinzhal ôm giá AKU lẫn toàn thân MiG-31K
  const pSweep = prog(t, 127.2, 134.9);
  // Nhịp 2 (134.8–138.8s): Mở rộng sườn phải thu trọn cú tách giá 3.2m, châm lửa và khoảnh khắc Kinzhal vọt chéo qua mũi MiG-31K
  const pDropView = prog(t, 134.8, 137.6);
  // Nhịp 3 (138.6–141.6s): Chuyển mượt sang bám sát sườn quả Kinzhal đang leo 22° lên bầu trời cô-ban Mach 10
  const pChase = prog(t, 138.7, 141.4);

  const bellyCamOffset: V3 = [
    lerp(10.8, -4.8, pSweep) - pDropView * 4.5,
    lerp(-3.35, -2.95, pSweep) - pDropView * 0.45,
    lerp(10.4, 11.8, pSweep) + pDropView * 5.2,
  ];
  const bellyLookOffset: V3 = [
    lerp(1.2, 0.2, pSweep) + pDropView * 4.6,
    lerp(-0.55, -0.78, pSweep) - pDropView * 0.45,
    0,
  ];

  const migCamPos: V3 = [
    mig.pos[0] + bellyCamOffset[0],
    mig.pos[1] + bellyCamOffset[1],
    mig.pos[2] + bellyCamOffset[2],
  ];
  const migCamLook: V3 = [
    mig.pos[0] + bellyLookOffset[0],
    mig.pos[1] + bellyLookOffset[1],
    mig.pos[2] + bellyLookOffset[2],
  ];

  // Góc máy bám đuổi Kinzhal lệch sườn phải-dưới (+Z = 10.5 m) thấy rõ mũi đạn, thân đạn và dải Trail cam kéo dài phía sau
  const kinCamPos: V3 = [kPos[0] - 9.2, kPos[1] - 3.6, 10.6];
  const kinCamLook: V3 = [kPos[0] + 1.6, kPos[1] + 0.55, 0];

  const camPos: V3 = [
    lerp(migCamPos[0], kinCamPos[0], pChase),
    lerp(migCamPos[1], kinCamPos[1], pChase),
    lerp(migCamPos[2], kinCamPos[2], pChase),
  ];
  const camLook: V3 = [
    lerp(migCamLook[0], kinCamLook[0], pChase),
    lerp(migCamLook[1], kinCamLook[1], pChase),
    lerp(migCamLook[2], kinCamLook[2], pChase),
  ];

  const shadowCenter: V3 = [
    lerp(mig.pos[0], kPos[0], pChase),
    lerp(mig.pos[1], kPos[1], pChase),
    0,
  ];

  const trailUpto = t <= CUE.s09_ignite + 0.04 ? 0 : prog(t, CUE.s09_ignite, T_TRAIL_END, (x) => x);
  const wingTrailUpto = prog(t, 126.8, T_TRAIL_END, (x) => x);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_STRATO} shadowCenter={shadowCenter} shadowArea={24} fog={[250, 1180]}>
        <Cam pos={camPos} look={camLook} fov={lerp(39, 43, pChase)} roll={lerp(0.03, -0.04, pChase)} />

        {/* Dãy núi xa mờ sương ở y = -110 m tạo cảm giác độ cao hùng vĩ của tầng bình lưu */}
        <group position={[0, -110, 0]}>
          <Terrain
            h={STRATO_TERRAIN_H}
            size={1400}
            seg={160}
            center={[230, 0]}
            colors={STRATO_MOUNTAIN_COLORS}
            grainRepeat={30}
          />
        </group>

        {/* Tiêm kích mang phóng MiG-31K Foxhound */}
        <MiG31K afterburner={0.85} position={mig.pos} rotation={mig.rot} />

        {/* Vệt xoáy ngưng tụ mảnh ở đầu mút cánh MiG-31K */}
        <Trail points={WINGTIP_RIGHT_PTS} upto={wingTrailUpto} color="#d6e6f5" width={0.042} opacity={0.22} glow={false} />
        <Trail points={WINGTIP_LEFT_PTS} upto={wingTrailUpto} color="#d6e6f5" width={0.042} opacity={0.22} glow={false} />

        {/* Tên lửa đường đạn phóng từ trên không Kh-47M2 Kinzhal (gốc Iskander) */}
        <Kinzhal
          plume={plume}
          heatGlow={heatGlow}
          position={kPos}
          rotation={[0, 0, kPitch]}
        />

        {/* Chớp khói tách chốt cơ khí nhỏ dưới giá phóng AKU lúc CUE.s09_drop */}
        <MuzzleBlast
          t={t}
          at={CUE.s09_drop}
          pos={[migState(CUE.s09_drop).pos[0] + 0.4, -0.88, 0]}
          dir={[0, -1, 0]}
          size={0.45}
          seed={31}
        />

        {/* Bùng nổ kích hoạt động cơ tên lửa rắn lúc CUE.s09_ignite */}
        <MuzzleBlast
          t={t}
          at={CUE.s09_ignite}
          pos={IGNITE_TAIL_POS}
          dir={[-1, 0, 0]}
          size={1.85}
          seed={47}
        />

        {/* Vệt lửa và khói đẩy rực sáng của động cơ rắn Kinzhal */}
        {trailUpto > 0.002 && (
          <>
            <Trail points={KINZHAL_TRAIL_PTS} upto={trailUpto} color="#ffaa38" width={0.28} opacity={0.9} />
            <Trail points={KINZHAL_TRAIL_PTS} upto={trailUpto} color="#fff2c2" width={0.11} opacity={0.95} />
          </>
        )}
      </Stage>

      {/* Nhãn tối giản (tối đa 1 nhãn trên màn hình mỗi thời điểm) */}
      <Label
        t={t}
        text="MiG-31K"
        x={960}
        y={126}
        from={CUE.s09_mig31}
        until={137.0}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="MACH 10"
        x={960}
        y={132}
        from={141.2}
        until={142.7}
        bg={PAL2D.amberHot}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S09;
