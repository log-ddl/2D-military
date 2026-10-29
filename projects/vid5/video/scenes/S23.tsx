import React, { useMemo } from 'react';
import { Easing } from 'remotion';
import { prog, lerp } from '@kit/theme';
import { useT, Label } from '@kit/motion';
import { Stage, Cam, type V3 } from '@lib/3d/stage';
import { paint, plain } from '@lib/3d/materials';
import { heightField, Terrain, Scatter } from '@lib/3d/terrain';
import { Explosion, MuzzleBlast, Trail, ballistic, ballisticPoints } from '@lib/3d/fx';
import { CUE } from '../cues';
import { P, STAGE_CONTESTED_DUSK, TERRAIN_PACIFIC_ISLAND } from '../local/palette';
import {
  F15EX,
  F15_STA1_POS,
  F15_STA9_POS,
  F15_CENTERLINE_POS,
  F35A,
  LoyalWingman,
  SamBattery,
  HypersonicMissile,
  AMRAAM,
} from '../local/models';

// Quần đảo Thái Bình Dương thoải rộng để đón trọn ánh chiều (không bị vách núi dốc che tối), mở rõ chân trời biển
const PACIFIC_ISLAND_H = heightField({
  seed: 531,
  amp: 1.8,
  scale: 92,
  oct: 5,
  flats: [
    // Thềm bờ biển đặt khẩu đội SamBattery #1
    [336, 8, 18, 9.2],
    // Thềm đồi giữa đảo đặt khẩu đội SamBattery #2
    [364, -18, 16, 13.6],
  ],
  add: (x, z) => {
    let h = -5.4;
    // Đảo chính thoải rộng xanh mướt
    const dMain = Math.hypot((x - 355) / 86, (z + 4) / 76);
    h += 24 * Math.exp(-(dMain * dMain));
    // Đồi radar phía đông-bắc đảo
    const dRidge = Math.hypot((x - 392) / 48, (z + 28) / 42);
    h += 14 * Math.exp(-(dRidge * dRidge));
    // Mũi đất nhô ra biển phía nam
    const dCape = Math.hypot((x - 318) / 42, (z - 26) / 34);
    h += 13 * Math.exp(-(dCape * dCape));
    // Hai đảo đá tiền tiêu trên mặt biển
    const dIsle1 = Math.hypot((x - 258) / 22, (z - 54) / 18);
    h += 12.5 * Math.exp(-(dIsle1 * dIsle1));
    const dIsle2 = Math.hypot((x - 278) / 24, (z + 64) / 20);
    h += 14 * Math.exp(-(dIsle2 * dIsle2));
    return h;
  },
});

const avoidTrees = (x: number, z: number) =>
  PACIFIC_ISLAND_H(x, z) < 2.0 ||
  Math.hypot(x - 336, z - 8) < 21 ||
  Math.hypot(x - 364, z + 18) < 19;

const avoidRocks = (x: number, z: number) =>
  PACIFIC_ISLAND_H(x, z) < 0.2 ||
  Math.hypot(x - 336, z - 8) < 18 ||
  Math.hypot(x - 364, z + 18) < 16;

// Hướng bay Euler [0, yaw, pitch] bám sát tiếp tuyến quỹ đạo 3D
const orientAlong = (a: V3, b: V3): [number, number, number] => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const yaw = -Math.atan2(dz, dx);
  const pitch = Math.atan2(dy, Math.max(1e-4, Math.hypot(dx, dz)));
  return [0, yaw, pitch];
};

// Quỹ đạo UAV Loyal Wingman #1: lao thấp từ trái sang phải (+X) qua đảo SAM, rồi tại 673.5s ngoặt vòng về +Z ngay ở trung tâm tiền cảnh
const cca1Pos = (t: number): V3 => {
  const u = Math.max(0, t - 666.0);
  if (t <= CUE.s23_droneDrawFire) {
    const dive = prog(t, 666.0, CUE.s23_droneDrawFire, Easing.inOut(Easing.quad));
    return [
      214 + u * 15.6,
      lerp(42.0, 23.5, dive),
      6.0 + Math.sin(u * 0.7) * 3.5,
    ];
  }
  const pTurn = prog(t, CUE.s23_droneDrawFire, 677.6, Easing.out(Easing.quad));
  const ang = pTurn * 1.32;
  const base0 = cca1Pos(CUE.s23_droneDrawFire); // [331, 23.5, 4.1]
  return [
    base0[0] + Math.sin(ang) * 24,
    base0[1] + pTurn * 4.2,
    base0[2] + (1 - Math.cos(ang)) * 24,
  ];
};

// Quỹ đạo UAV Loyal Wingman #2 bay biên đội bên cánh trái-sau chiếc #1, cùng ngoặt thoát đạn SAM
const cca2Pos = (t: number): V3 => {
  const u = Math.max(0, t - 666.0);
  if (t <= CUE.s23_droneDrawFire + 0.18) {
    const dive = prog(t, 666.2, CUE.s23_droneDrawFire + 0.18, Easing.inOut(Easing.quad));
    return [
      204 + u * 15.5,
      lerp(45.5, 26.8, dive),
      -7.5 + Math.cos(u * 0.65) * 3.0,
    ];
  }
  const pTurn = prog(t, CUE.s23_droneDrawFire + 0.18, 677.6, Easing.out(Easing.quad));
  const ang = pTurn * 1.18;
  const base0 = cca2Pos(CUE.s23_droneDrawFire + 0.18);
  return [
    base0[0] + Math.sin(ang) * 26,
    base0[1] + pTurn * 5.2,
    base0[2] + (1 - Math.cos(ang)) * 20,
  ];
};

type SalvoSpec = {
  kind: 'hypersonic' | 'amraam';
  at: number;
  startOffset: V3;
  target: V3;
  apex: number;
  dur: number;
  seed: number;
};

const S23: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const oceanMat = useMemo(
    () =>
      paint({
        color: '#123050',
        camo: ['#0b2038', '#1d4770'],
        camoScale: 0.7,
        wear: 0.1,
        dirt: 0.06,
        roughness: 0.24,
        metalness: 0.65,
        repeat: 34,
        seed: 93,
      }),
    [],
  );
  const cyanNodeMat = useMemo(() => plain(P.cyan, 0.2, 0.1), []);

  // =========================================================================
  // NHỊP 1 (649.1–666.4s): BIÊN ĐỘI 2 F-15EX (WSO GHẾ SAU) NHẬN DỮ LIỆU TỪ F-35A & PHÓNG LOẠT ĐẠN
  // =========================================================================
  const dt = t - 649.1;
  const f15Speed = 10.8;
  const leadX = -92 + dt * f15Speed;
  const leadPos: V3 = [leadX, 86, 0];
  const wingPos: V3 = [leadX - 15.0, 90.2, -17.0];
  const f35Pos: V3 = [leadX + 41, 78.5, 11.0];

  const dlSend = prog(t, CUE.s23_datalink, CUE.s23_datalink + 1.35, Easing.out(Easing.cubic));
  const dlFade = 1 - prog(t, CUE.s23_salvoLaunch + 0.6, CUE.s23_salvoLaunch + 1.6);

  const datalinkMainPts = useMemo<V3[]>(() => {
    const a: V3 = [f35Pos[0] - 2.0, f35Pos[1] + 1.9, f35Pos[2]];
    const b: V3 = [leadPos[0] + 1.8, leadPos[1] + 3.35, leadPos[2]];
    return ballisticPoints(a, b, 5.0, 40);
  }, [f35Pos[0], f35Pos[1], f35Pos[2], leadPos[0], leadPos[1], leadPos[2]]);

  const datalinkWingPts = useMemo<V3[]>(() => {
    const a: V3 = [leadPos[0] + 1.8, leadPos[1] + 3.35, leadPos[2]];
    const b: V3 = [wingPos[0] + 1.8, wingPos[1] + 3.35, wingPos[2]];
    return ballisticPoints(a, b, 2.8, 24);
  }, [leadPos[0], leadPos[1], leadPos[2], wingPos[0], wingPos[1], wingPos[2]]);

  // Loạt đạn Hypersonic & AMRAAM cầu vồng cao (apex 52..62 m để bay vọt cao trên đầu drone ở 671.6s rồi bổ nhào xuống đảo ở 675..677.6s)
  const salvoSpecs = useMemo<SalvoSpec[]>(() => {
    const xAt = (at: number) => -92 + (at - 649.1) * f15Speed;
    return [
      {
        kind: 'hypersonic',
        at: CUE.s23_salvoLaunch,
        startOffset: [
          xAt(CUE.s23_salvoLaunch) + F15_CENTERLINE_POS[0],
          86 + F15_CENTERLINE_POS[1] - 0.5,
          F15_CENTERLINE_POS[2],
        ],
        target: [338, 10.5, 7],
        apex: 56,
        dur: 17.2,
        seed: 11,
      },
      {
        kind: 'hypersonic',
        at: CUE.s23_salvoLaunch + 0.35,
        startOffset: [
          xAt(CUE.s23_salvoLaunch + 0.35) - 15.0 + F15_CENTERLINE_POS[0],
          90.2 + F15_CENTERLINE_POS[1] - 0.5,
          -17.0 + F15_CENTERLINE_POS[2],
        ],
        target: [364, 14.8, -17],
        apex: 62,
        dur: 17.4,
        seed: 12,
      },
      {
        kind: 'amraam',
        at: CUE.s23_salvoLaunch + 1.15,
        startOffset: [
          xAt(CUE.s23_salvoLaunch + 1.15) + F15_STA9_POS[0],
          86 + F15_STA9_POS[1] - 0.25,
          F15_STA9_POS[2],
        ],
        target: [344, 12, 12],
        apex: 48,
        dur: 16.4,
        seed: 13,
      },
      {
        kind: 'amraam',
        at: CUE.s23_salvoLaunch + 1.75,
        startOffset: [
          xAt(CUE.s23_salvoLaunch + 1.75) + F15_STA1_POS[0],
          86 + F15_STA1_POS[1] - 0.25,
          F15_STA1_POS[2],
        ],
        target: [352, 13, -4],
        apex: 52,
        dur: 16.0,
        seed: 14,
      },
      {
        kind: 'amraam',
        at: CUE.s23_salvoLaunch + 2.65,
        startOffset: [
          xAt(CUE.s23_salvoLaunch + 2.65) - 15.0 + F15_STA9_POS[0],
          90.2 + F15_STA9_POS[1] - 0.25,
          -17.0 + F15_STA9_POS[2],
        ],
        target: [358, 15, -12],
        apex: 54,
        dur: 15.3,
        seed: 15,
      },
      {
        kind: 'amraam',
        at: CUE.s23_salvoLaunch + 3.35,
        startOffset: [
          xAt(CUE.s23_salvoLaunch + 3.35) + 1.2,
          84.8,
          2.6,
        ],
        target: [340, 11.5, 4],
        apex: 45,
        dur: 14.6,
        seed: 16,
      },
    ];
  }, []);

  const salvoCurves = useMemo(
    () => salvoSpecs.map((s) => ballisticPoints(s.startOffset, s.target, s.apex, 72)),
    [salvoSpecs],
  );

  // =========================================================================
  // NHỊP 2 (666.5–677.60s): 2 UAV LOYAL WINGMAN QUẦN THẢO TRÊN ĐẢO NHỬ ĐẠN SAM
  // =========================================================================
  const d1 = cca1Pos(t);
  const d1Next = cca1Pos(t + 0.04);
  const d1Rot = orientAlong(d1, d1Next);
  const d1Bank =
    0.22 * Math.sin((t - 666) * 1.1) +
    1.02 * prog(t, CUE.s23_droneDrawFire - 0.05, CUE.s23_droneDrawFire + 1.0, Easing.out(Easing.cubic));

  const d2 = cca2Pos(t);
  const d2Next = cca2Pos(t + 0.04);
  const d2Rot = orientAlong(d2, d2Next);
  const d2Bank =
    -0.18 * Math.cos((t - 666) * 0.9) +
    0.94 * prog(t, CUE.s23_droneDrawFire + 0.15, CUE.s23_droneDrawFire + 1.2, Easing.out(Easing.cubic));

  const d1TrailPts = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    const tStart = Math.max(666.0, t - 2.6);
    for (let i = 0; i <= 26; i++) {
      const ti = lerp(tStart, Math.max(tStart + 0.05, t), i / 26);
      const p = cca1Pos(ti);
      const nxt = cca1Pos(ti + 0.04);
      const len = Math.max(1e-4, Math.hypot(nxt[0] - p[0], nxt[1] - p[1], nxt[2] - p[2]));
      pts.push([
        p[0] - ((nxt[0] - p[0]) / len) * 4.2,
        p[1] + 1.15 - ((nxt[1] - p[1]) / len) * 4.2,
        p[2] - ((nxt[2] - p[2]) / len) * 4.2,
      ]);
    }
    return pts;
  }, [t]);

  const d2TrailPts = useMemo<V3[]>(() => {
    const pts: V3[] = [];
    const tStart = Math.max(666.2, t - 2.6);
    for (let i = 0; i <= 26; i++) {
      const ti = lerp(tStart, Math.max(tStart + 0.05, t), i / 26);
      const p = cca2Pos(ti);
      const nxt = cca2Pos(ti + 0.04);
      const len = Math.max(1e-4, Math.hypot(nxt[0] - p[0], nxt[1] - p[1], nxt[2] - p[2]));
      pts.push([
        p[0] - ((nxt[0] - p[0]) / len) * 4.2,
        p[1] + 1.15 - ((nxt[1] - p[1]) / len) * 4.2,
        p[2] - ((nxt[2] - p[2]) / len) * 4.2,
      ]);
    }
    return pts;
  }, [t]);

  // Đạn SAM #1 khai hỏa lúc 673.50s nổ trên không sát chiếc Loyal Wingman lúc 674.30s
  const sam1Muzzle: V3 = [339.2, 17.1, 8.2];
  const sam1Burst: V3 = [333.0, 26.2, 5.5];
  const sam1Pts = useMemo(() => ballisticPoints(sam1Muzzle, sam1Burst, 2.0, 28), []);
  const sam1P = prog(t, CUE.s23_droneDrawFire, 674.30, Easing.out(Easing.quad));

  // Đạn SAM #2 khai hỏa bồi lúc 675.25s nổ cầu lửa rực trên không lúc 676.85s (thấy rõ cả cầu lửa + khói ở khung 677.23s!)
  const sam2Muzzle: V3 = [367.0, 21.5, -17.6];
  const sam2Burst: V3 = [351.0, 29.8, -4.0];
  const sam2Pts = useMemo(() => ballisticPoints(sam2Muzzle, sam2Burst, 2.6, 28), []);
  const sam2P = prog(t, 675.25, 676.85, Easing.out(Easing.quad));

  // Tia điều khiển WSO nối xuống 2 chiếc Loyal Wingman
  const ccaLinkOp = prog(t, 667.8, 669.0) * (1 - prog(t, 673.0, 673.8));
  const ccaLink1 = useMemo(
    () => ballisticPoints([d1[0] - 68, d1[1] + 36, d1[2] - 6], [d1[0] + 1.8, d1[1] + 1.4, d1[2]], 3, 20),
    [d1[0], d1[1], d1[2]],
  );
  const ccaLink2 = useMemo(
    () => ballisticPoints([d2[0] - 68, d2[1] + 36, d2[2] - 4], [d2[0] + 1.8, d2[1] + 1.4, d2[2]], 3, 20),
    [d2[0], d2[1], d2[2]],
  );

  // =========================================================================
  // CAMERA 3D: NHẤT QUÁN HƯỚNG TIẾN CÔNG TRÁI -> PHẢI (+X), LẤY TRỌN ÁNH NẮNG CHIỀU TRÊN MẶT BIỂN
  // =========================================================================
  const pToLink = prog(t, 654.8, 656.2);
  const pToSalvo = prog(t, 660.7, 661.7);

  const cam1PosA: V3 = [leadX + 13.5, 91.5, 20.0];
  const cam1LookA: V3 = [leadX - 2.5, 87.2, -5.5];

  // Khung rộng thấy trọn 100% cả 2 chiếc F-15EX (bên trái) lẫn chiếc F-35A (bên phải) & đường truyền dữ liệu cyan
  const cam1PosB: V3 = [leadX - 11.5, 97.5, 44.5];
  const cam1LookB: V3 = [leadX + 12.5, 83.5, 1.5];

  // Khung hông-dưới hoành tráng đón loạt đạn AMRAAM & Hypersonic vọt lên cao
  const cam1PosC: V3 = [leadX + 9.0, 83.5, 38.5];
  const cam1LookC: V3 = [leadX + 12.0, 90.0, -5.0];

  const cam1Pos: V3 = [
    lerp(lerp(cam1PosA[0], cam1PosB[0], pToLink), cam1PosC[0], pToSalvo),
    lerp(lerp(cam1PosA[1], cam1PosB[1], pToLink), cam1PosC[1], pToSalvo),
    lerp(lerp(cam1PosA[2], cam1PosB[2], pToLink), cam1PosC[2], pToSalvo),
  ];
  const cam1Look: V3 = [
    lerp(lerp(cam1LookA[0], cam1LookB[0], pToLink), cam1LookC[0], pToSalvo),
    lerp(lerp(cam1LookA[1], cam1LookB[1], pToLink), cam1LookC[1], pToSalvo),
    lerp(lerp(cam1LookA[2], cam1LookB[2], pToLink), cam1LookC[2], pToSalvo),
  ];

  // Nhịp 2: Camera ở phía +Z nhìn về hướng mặt trời (+X, -Z) lấy ráng chiều vàng rực trên biển,
  // giữ trọn cả 2 chiếc Loyal Wingman đang ngoặt vòng ở tiền cảnh lẫn 2 khẩu đội SamBattery & vụ nổ SAM trên đảo!
  const rushToIsland = prog(t, 666.4, 668.4, Easing.bezier(0.45, 0, 0.15, 1));
  const pSamAction = prog(t, 673.1, 675.0);

  const cam2FollowPos: V3 = [d1[0] - 18.0, d1[1] + 7.2, d1[2] + 19.5];
  const cam2FollowLook: V3 = [lerp(d1[0] + 14, 344, 0.45), lerp(d1[1] - 2.5, 15.5, 0.45), -3.5];

  const cam2ArenaPos: V3 = [318 + prog(t, 673.5, 677.6) * 14, 34.5, 52.0];
  const cam2ArenaLook: V3 = [347, 22.5, 2.0];

  const cam2Pos: V3 = [
    lerp(cam2FollowPos[0], cam2ArenaPos[0], pSamAction),
    lerp(cam2FollowPos[1], cam2ArenaPos[1], pSamAction),
    lerp(cam2FollowPos[2], cam2ArenaPos[2], pSamAction),
  ];
  const cam2Look: V3 = [
    lerp(cam2FollowLook[0], cam2ArenaLook[0], pSamAction),
    lerp(cam2FollowLook[1], cam2ArenaLook[1], pSamAction),
    lerp(cam2FollowLook[2], cam2ArenaLook[2], pSamAction),
  ];

  const camPos: V3 = [
    lerp(cam1Pos[0], cam2Pos[0], rushToIsland),
    lerp(cam1Pos[1], cam2Pos[1], rushToIsland),
    lerp(cam1Pos[2], cam2Pos[2], rushToIsland),
  ];
  const camLook: V3 = [
    lerp(cam1Look[0], cam2Look[0], rushToIsland),
    lerp(cam1Look[1], cam2Look[1], rushToIsland),
    lerp(cam1Look[2], cam2Look[2], rushToIsland),
  ];
  const camFov = lerp(lerp(40, 44, pToLink), 43, rushToIsland);

  const shadowCenter: V3 = [
    lerp(leadX + 6, 346, rushToIsland),
    lerp(86, 16, rushToIsland),
    lerp(-4, 0, rushToIsland),
  ];

  return (
    <>
      <Stage {...STAGE_CONTESTED_DUSK} shadowCenter={shadowCenter}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Mặt biển Thái Bình Dương thẫm phản chiếu ráng chiều + Cụm đảo núi xanh */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[200, 0, 0]} material={oceanMat} receiveShadow>
          <planeGeometry args={[2400, 2400]} />
        </mesh>
        <Terrain
          h={PACIFIC_ISLAND_H}
          size={1150}
          seg={240}
          center={[250, 0]}
          colors={TERRAIN_PACIFIC_ISLAND}
          grainRepeat={48}
        />
        <Scatter
          kind="broadleaf"
          count={135}
          area={[250, -90, 430, 88]}
          h={PACIFIC_ISLAND_H}
          seed={235}
          scale={[0.85, 1.38]}
          avoid={avoidTrees}
        />
        <Scatter
          kind="bush"
          count={95}
          area={[245, -90, 430, 88]}
          h={PACIFIC_ISLAND_H}
          seed={239}
          scale={[0.8, 1.3]}
          avoid={avoidTrees}
        />
        <Scatter
          kind="rock"
          count={55}
          area={[240, -96, 440, 95]}
          h={PACIFIC_ISLAND_H}
          seed={243}
          scale={[0.85, 1.75]}
          avoid={avoidRocks}
        />

        {/* =================================================================
            TRẬN ĐỊA PHÒNG KHÔNG SAM TRÊN CỤM ĐẢO TIỀN DUYÊN
           ================================================================= */}
        <group position={[336, 9.2, 8]} rotation={[0, Math.PI - 0.14, 0]}>
          <SamBattery
            elev={1.0}
            radarSpin={t * 3.4}
            openTubes={t >= CUE.s23_droneDrawFire ? 1 : 0}
          />
        </group>
        <group position={[364, 13.6, -18]} rotation={[0, Math.PI - 0.32, 0]}>
          <SamBattery
            elev={0.96}
            radarSpin={-t * 2.9}
            openTubes={t >= 675.25 ? 1 : 0}
          />
        </group>

        {/* Đạn SAM #1 khai hỏa lúc 673.50s + nổ trên không gần UAV lúc 674.30s */}
        <MuzzleBlast
          t={t}
          at={CUE.s23_droneDrawFire}
          pos={sam1Muzzle}
          dir={[-0.48, 0.86, -0.15]}
          size={2.8}
          seed={31}
        />
        {t >= CUE.s23_droneDrawFire && (
          <Trail
            points={sam1Pts}
            upto={sam1P}
            color="#ff6b2b"
            width={0.24}
            opacity={Math.max(0, 1 - prog(t, 675.2, 677.5))}
            glow
          />
        )}
        {t >= CUE.s23_droneDrawFire && t < 674.30 && (
          <group
            position={ballistic(sam1P, sam1Muzzle, sam1Burst, 2.0)}
            rotation={orientAlong(
              ballistic(Math.max(0, sam1P - 0.04), sam1Muzzle, sam1Burst, 2.0),
              ballistic(Math.min(1, sam1P + 0.04), sam1Muzzle, sam1Burst, 2.0),
            )}
            scale={1.4}
          >
            <AMRAAM flame={1} />
          </group>
        )}
        <Explosion t={t} at={674.30} pos={sam1Burst} size={5.0} smokeLife={6.0} seed={73} />

        {/* Đạn SAM #2 khai hỏa bồi lúc 675.25s + nổ cầu lửa rực lúc 676.85s */}
        <MuzzleBlast
          t={t}
          at={675.25}
          pos={sam2Muzzle}
          dir={[-0.5, 0.82, 0.34]}
          size={2.5}
          seed={39}
        />
        {t >= 675.25 && (
          <Trail
            points={sam2Pts}
            upto={sam2P}
            color="#ff7a36"
            width={0.22}
            opacity={0.94}
            glow
          />
        )}
        {t >= 675.25 && t < 676.85 && (
          <group
            position={ballistic(sam2P, sam2Muzzle, sam2Burst, 2.6)}
            rotation={orientAlong(
              ballistic(Math.max(0, sam2P - 0.04), sam2Muzzle, sam2Burst, 2.6),
              ballistic(Math.min(1, sam2P + 0.04), sam2Muzzle, sam2Burst, 2.6),
            )}
            scale={1.38}
          >
            <AMRAAM flame={1} />
          </group>
        )}
        <Explosion t={t} at={676.85} pos={sam2Burst} size={5.2} smokeLife={6.0} seed={81} />

        {/* =================================================================
            BIÊN ĐỘI 2 F-15EX (WSO GHẾ SAU) & F-35A LIÊN KẾT DỮ LIỆU + LOẠT ĐẠN
           ================================================================= */}
        <group position={leadPos} rotation={[0.02, 0, 0.03]}>
          <F15EX
            gear={0}
            afterburner={t >= CUE.s23_salvoLaunch - 0.2 ? 0.94 : 0.75}
            backSeatOccupied={true}
            wingTipMissiles
            fullLoad
            bellyOutsized={t < CUE.s23_salvoLaunch}
          />
          {t >= CUE.s23_datalink + 0.6 && t < 668.5 && (
            <pointLight position={[1.8, 3.3, 0]} color={P.cyan} intensity={8} distance={5.5} />
          )}
        </group>

        <group position={wingPos} rotation={[0.02, 0, 0.04]}>
          <F15EX
            gear={0}
            afterburner={t >= CUE.s23_salvoLaunch ? 0.94 : 0.75}
            backSeatOccupied={true}
            wingTipMissiles
            fullLoad
            bellyOutsized={t < CUE.s23_salvoLaunch + 0.35}
          />
        </group>

        <group position={f35Pos} rotation={[0.01, 0, -0.04]}>
          <F35A gear={0} afterburner={0.45} bayOpen={0} />
        </group>

        {/* Xung dữ liệu mã hóa màu cyan từ F-35A truyền ngược về buồng lái sau WSO của F-15EX (656.0s) */}
        {t >= CUE.s23_datalink && dlFade > 0.01 && (
          <>
            <Trail
              points={datalinkMainPts}
              upto={dlSend}
              color={P.cyan}
              width={0.15}
              opacity={0.9 * dlFade}
              glow
            />
            {dlSend > 0.85 && (
              <Trail
                points={datalinkWingPts}
                upto={prog(t, CUE.s23_datalink + 1.05, CUE.s23_datalink + 1.75)}
                color={P.cyanSoft}
                width={0.12}
                opacity={0.82 * dlFade}
                glow
              />
            )}
            {[0, 0.25, 0.5, 0.75].map((off, idx) => {
              const pPacket = ((t - CUE.s23_datalink) * 0.68 + off) % 1;
              if (pPacket > dlSend) return null;
              const idxPt = Math.min(datalinkMainPts.length - 1, Math.floor(pPacket * (datalinkMainPts.length - 1)));
              return (
                <mesh key={idx} position={datalinkMainPts[idxPt]} material={cyanNodeMat}>
                  <octahedronGeometry args={[0.42, 0]} />
                </mesh>
              );
            })}
          </>
        )}

        {/* LOẠT TÊN LỬA HYPERSONIC & AMRAAM KHAI HỎA VỌT CẦU VỒNG ĐẠN ĐẠO LÊN CAO */}
        {salvoSpecs.map((s, idx) => {
          if (t < s.at) return null;
          const p = prog(t, s.at, s.at + s.dur, Easing.out(Easing.quad));
          const pts = salvoCurves[idx];
          const cur = ballistic(p, s.startOffset, s.target, s.apex);
          const nxt = ballistic(Math.min(1, p + 0.02), s.startOffset, s.target, s.apex);
          const rot = orientAlong(cur, nxt);
          const isHyper = s.kind === 'hypersonic';
          return (
            <React.Fragment key={`salvo_${idx}`}>
              <MuzzleBlast
                t={t}
                at={s.at}
                pos={s.startOffset}
                dir={[1, 0.24, 0]}
                size={isHyper ? 2.3 : 1.45}
                seed={s.seed}
              />
              <Trail
                points={pts}
                upto={p}
                color={isHyper ? '#ff9d3b' : '#ffd280'}
                width={isHyper ? 0.27 : 0.16}
                opacity={0.92}
                glow
              />
              {isHyper && (
                <Trail points={pts} upto={p} color="#fff7d6" width={0.11} opacity={0.95} glow />
              )}
              {p < 0.99 && (
                <group position={cur} rotation={rot}>
                  {isHyper ? <HypersonicMissile flame={1} /> : <AMRAAM flame={1} />}
                </group>
              )}
            </React.Fragment>
          );
        })}

        {/* =================================================================
            2 CHIẾC UAV LOYAL WINGMAN CCA BỔ NHÀO & NGOẶT GẮT TRÊN ĐẢO SAM
           ================================================================= */}
        {t >= 665.8 && (
          <>
            {ccaLinkOp > 0.02 && (
              <>
                <Trail points={ccaLink1} upto={1} color={P.cyan} width={0.08} opacity={0.68 * ccaLinkOp} glow />
                <Trail points={ccaLink2} upto={1} color={P.cyan} width={0.07} opacity={0.58 * ccaLinkOp} glow />
              </>
            )}

            <Trail points={d1TrailPts} upto={1} color="#ffd79e" width={0.095} opacity={0.62} glow />
            <Trail points={d2TrailPts} upto={1} color="#ffd79e" width={0.085} opacity={0.55} glow />

            <group position={d1} rotation={d1Rot}>
              <LoyalWingman
                gear={0}
                afterburner={t >= CUE.s23_droneDrawFire - 0.1 ? 0.98 : 0.85}
                bank={d1Bank}
              />
            </group>

            <group position={d2} rotation={d2Rot}>
              <LoyalWingman
                gear={0}
                afterburner={t >= CUE.s23_droneDrawFire + 0.1 ? 0.95 : 0.85}
                bank={d2Bank}
              />
            </group>
          </>
        )}
      </Stage>

      <Label
        t={t}
        text="60 MILES BACK"
        x={960}
        y={108}
        from={649.28}
        until={653.0}
        size={50}
        bg={P.amber}
        fg={P.ink}
      />
      <Label
        t={t}
        text="LOYAL WINGMAN CCA"
        x={960}
        y={108}
        from={670.50}
        until={675.5}
        size={50}
        bg={P.cyan}
        fg={P.ink}
      />
    </>
  );
};

export default S23;
