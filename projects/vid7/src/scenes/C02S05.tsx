import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Wheel } from '@skill/military/3d/parts';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { GasCan5Gal } from '../parts/Ordnance3D';

// Cùng địa hình sân bay Eglin, Florida với C02S04 nhưng đảo ngược hoàn toàn trục nhìn ra sau cánh đuôi H-tail
const floridaHeight = heightField({
  seed: 42,
  amp: 4.8,
  scale: 140,
  flats: [[0, 0, 96, 0]],
  add: (x, z) => (Math.hypot(x, z) > 125 ? 3.5 * Math.sin(x * 0.016) * Math.cos(z * 0.015) : 0),
});

const avoidAirfield = (x: number, z: number) =>
  Math.hypot(x, z) < 84 || (Math.abs(z + 44) < 22 && Math.abs(x) < 210) || (Math.abs(z - 46) < 20 && Math.abs(x) < 190);

/** Bối cảnh sân đỗ Eglin nhìn về hướng Đông (+X): bê tông kẻ vạch, hangar, tháp chỉ huy, xe hậu cần & thang kỹ thuật đuôi */
const EglinTailBackdrop: React.FC = () => {
  const mats = useMemo(
    () => ({
      concrete: paint({
        color: '#b9b4a6',
        camo: ['#afa99a', '#c6c0b2'],
        wear: 0.22,
        dirt: 0.25,
        roughness: 0.88,
        metalness: 0.04,
        repeat: 14,
        seed: 31,
      }),
      runwayAsphalt: paint({
        color: '#6e6c66',
        camo: ['#62605a', '#7a7770'],
        wear: 0.18,
        dirt: 0.22,
        roughness: 0.9,
        metalness: 0.04,
        repeat: 18,
        seed: 53,
      }),
      tarJoint: plain('#3c3a36', 0.92, 0.02),
      paintYellow: plain('#dcb13c', 0.72, 0.05),
      paintWhite: plain('#e9ece8', 0.75, 0.04),
      hangarWall: paint({
        color: '#6c7362',
        camo: ['#5f6656', '#79806e'],
        wear: 0.2,
        dirt: 0.22,
        roughness: 0.72,
        metalness: 0.24,
        repeat: 4,
        seed: 81,
      }),
      hangarRoof: plain('#4f5649', 0.66, 0.32),
      hangarDark: plain('#1d201c', 0.92, 0.08),
      oliveTruck: paint({
        color: PAINT.usaafOlive,
        camo: [...PAINT.usaafOliveCamo],
        wear: 0.24,
        dirt: 0.28,
        roughness: 0.68,
        metalness: 0.22,
        repeat: 2,
        seed: 64,
      }),
      canvasTan: plain('#8c7f5e', 0.88, 0.03),
      ladderWood: plain('#8a6d48', 0.82, 0.04),
      blackPaintTin: plain('#2b2f33', 0.45, 0.65),
      flatBlackPaint: plain('#151618', 0.95, 0.03),
    }),
    [],
  );

  return (
    <group>
      {/* Sân đỗ bê tông */}
      <mesh position={[0, 0.006, 0]} receiveShadow material={mats.concrete}>
        <boxGeometry args={[86, 0.012, 62]} />
      </mesh>
      {[-18, -12, -6, 0, 6, 12, 18, 24].map((xLine) => (
        <mesh key={`jx-${xLine}`} position={[xLine, 0.013, 0]} material={mats.tarJoint} receiveShadow>
          <boxGeometry args={[0.045, 0.002, 58]} />
        </mesh>
      ))}
      {[-18, -12, -6, 0, 6, 12, 18].map((zLine) => (
        <mesh key={`jz-${zLine}`} position={[0, 0.013, zLine]} material={mats.tarJoint} receiveShadow>
          <boxGeometry args={[82, 0.002, 0.045]} />
        </mesh>
      ))}
      <mesh position={[2, 0.014, 0]} material={mats.paintYellow}>
        <boxGeometry args={[48, 0.002, 0.18]} />
      </mesh>
      <mesh position={[9.2, 0.014, 0]} material={mats.paintWhite}>
        <boxGeometry args={[0.24, 0.002, 8.5]} />
      </mesh>

      {/* Đường băng phía xa (+X / -Z) */}
      <mesh position={[0, 0.008, -44]} receiveShadow material={mats.runwayAsphalt}>
        <boxGeometry args={[360, 0.014, 24]} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={`rw-${i}`} position={[-100 + i * 20, 0.017, -44]} material={mats.paintWhite}>
          <boxGeometry args={[9, 0.003, 0.42]} />
        </mesh>
      ))}

      {/* Hangar & tháp chỉ huy phía trước mũi B-25 (+X) tạo chiều sâu khi nhìn từ đuôi tới */}
      {[
        [54, -26, -0.18],
        [62, 24, 0.25],
      ].map(([hx, hz, rotY], idx) => (
        <group key={`hangar-fwd-${idx}`} position={[hx, 0, hz]} rotation={[0, rotY, 0]}>
          <mesh position={[0, 4.2, 0]} material={mats.hangarWall} castShadow receiveShadow>
            <boxGeometry args={[26, 8.4, 20]} />
          </mesh>
          <mesh position={[0, 8.4, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.hangarRoof} castShadow>
            <cylinderGeometry args={[10.1, 10.1, 26.4, 20, 1, false, 0, Math.PI]} />
          </mesh>
          <mesh position={[-13.05, 3.6, 0]} material={mats.hangarDark}>
            <boxGeometry args={[0.12, 7.2, 13.5]} />
          </mesh>
        </group>
      ))}

      <group position={[44, 0, -45]}>
        <mesh position={[0, 5.5, 0]} material={mats.hangarWall} castShadow>
          <boxGeometry args={[3.6, 11, 3.6]} />
        </mesh>
        <mesh position={[0, 12.1, 0]} material={mats.paintWhite} castShadow>
          <boxGeometry args={[4.6, 2.2, 4.6]} />
        </mesh>
        <mesh position={[0, 13.5, 0]} material={mats.hangarRoof}>
          <coneGeometry args={[3.6, 1.1, 4]} />
        </mesh>
      </group>

      {/* Xe tải quân sự USAAF ở phía trước sân đỗ */}
      <group position={[26, 0.012, 14]} rotation={[0, -2.4, 0]}>
        <mesh position={[1.6, 1.15, 0]} geometry={rbox(1.7, 1.45, 2.1, 0.12)} material={mats.oliveTruck} castShadow />
        <mesh position={[2.55, 0.88, 0]} geometry={rbox(1.1, 0.92, 1.9, 0.1)} material={mats.oliveTruck} castShadow />
        <mesh position={[-0.8, 1.55, 0]} geometry={rbox(3.6, 1.85, 2.2, 0.22)} material={mats.canvasTan} castShadow />
        {[-2.0, -0.9, 2.3].map((wx, wi) => (
          <React.Fragment key={wi}>
            <Wheel r={0.46} width={0.26} tire="#232527" rim="#4d5738" position={[wx, 0.46, 0.96]} />
            <Wheel r={0.46} width={0.26} tire="#232527" rim="#4d5738" position={[wx, 0.46, -0.96]} />
          </React.Fragment>
        ))}
      </group>

      {/* Bục thang gỗ thợ máy & lon sơn đen mờ đặt dưới gầm đuôi bên mạn trái (-Z) */}
      <group position={[-7.65, 0.012, -1.55]} rotation={[0, 0.28, 0]}>
        <mesh position={[0, 1.38, 0]} geometry={rbox(0.82, 0.05, 0.56, 0.008)} material={mats.ladderWood} castShadow receiveShadow />
        {([-0.36, 0.36] as const).map((lx) =>
          ([-0.23, 0.23] as const).map((lz) => (
            <mesh key={`tl-${lx}-${lz}`} position={[lx, 0.69, lz]} material={mats.ladderWood} castShadow>
              <boxGeometry args={[0.055, 1.38, 0.055]} />
            </mesh>
          )),
        )}
        {[0.38, 0.74, 1.1].map((sy, i) => (
          <mesh key={`st-${i}`} position={[0.38, sy, 0]} geometry={rbox(0.08, 0.035, 0.5, 0.005)} material={mats.ladderWood} />
        ))}
        {/* Lon sơn đen mờ (Flat Black Paint Tin) & cọ sơn trên mặt bục gỗ */}
        <mesh position={[-0.18, 1.5, 0.08]} material={mats.blackPaintTin} castShadow>
          <cylinderGeometry args={[0.085, 0.085, 0.19, 16]} />
        </mesh>
        <mesh position={[-0.18, 1.596, 0.08]} material={mats.flatBlackPaint}>
          <cylinderGeometry args={[0.076, 0.076, 0.006, 16]} />
        </mesh>
        <mesh position={[0.06, 1.42, -0.05]} rotation={[0, 0.4, 0]} geometry={rbox(0.24, 0.018, 0.055, 0.004)} material={mats.ladderWood} />
        <mesh position={[0.16, 1.42, -0.09]} rotation={[0, 0.4, 0]} geometry={rbox(0.08, 0.016, 0.058, 0.003)} material={mats.flatBlackPaint} />
      </group>

      {/* Vài can xăng 5-gal đặt cạnh thân giữa để nối liên tục với C02S04 */}
      <group position={[2.8, 0.012, 1.65]} rotation={[0, 0.3, 0]}>
        <GasCan5Gal punctured={false} seed={61} />
      </group>
      <group position={[3.15, 0.012, 1.85]} rotation={[0, -0.5, 0]}>
        <GasCan5Gal punctured={false} seed={68} />
      </group>
    </group>
  );
};

/**
 * 2 thanh cán chổi gỗ sơn đen mờ diễn hoạt đâm xuyên qua chóp kính/bạt đuôi tại 236.62 s,
 * khớp chính xác từng milimét với `broomsticks={true}` của `B25Mitchell` ở [-7.68, 2.94, 0]!
 */
const AnimatedTailBroomsticks: React.FC<{ t: number }> = ({ t }) => {
  const broomWoodMat = useMemo(() => plain('#18191b', 0.94, 0.04), []);
  const clampWoodMat = useMemo(() => plain('#5e4934', 0.85, 0.05), []);

  // 233.44 s ("Two wooden broomsticks, painted flat black"): đưa 2 cán chổi vào bên trong vòm kính đuôi
  // 236.62 s ("and poked through the rear plexiglass"): đâm nhô thẳng ra sau xuyên qua cổ bạt chóp đuôi
  // 239.06 s ("to look like twin .50 caliber machine guns"): nhích góc ngẩng đe doạ khớp đúng -0.06 rad của base
  const enterCone = prog(t, 233.15, 234.4);
  const pokeOut = prog(t, 236.25, 237.45);
  const menaceTilt = prog(t, 237.45, 239.1);

  if (t < 233.15) return null;

  // Khi ở trong chóp kính (233.4–236.2 s): hai đầu cán chổi vừa chấm mép cổ bạt (xRetract = 0.36 m) nhìn rõ thân gỗ đen xuyên qua kính trong;
  // đúng từ "poked through the rear plexiglass" (236.62 s): đâm nhô thẳng ra tới x = -8.48 m ngoài chóp đuôi!
  const xRetract = lerp(0.56, 0.36, enterCone) * (1 - pokeOut);
  const pitch = lerp(-0.01, -0.06, menaceTilt);

  return (
    <group position={[-7.68 + xRetract, 2.94, 0]} rotation={[0, 0, pitch]}>
      <mesh position={[0.1, 0, 0]} material={clampWoodMat}>
        <boxGeometry args={[0.08, 0.08, 0.28]} />
      </mesh>
      {([-0.085, 0.085] as const).map((zb, idx) => (
        <group key={`anim-broom-${idx}`} position={[-0.36, 0, zb]}>
          <mesh rotation={[0, 0, Math.PI / 2]} material={broomWoodMat} castShadow>
            <cylinderGeometry args={[0.019, 0.022, 0.82, 12]} />
          </mesh>
          <mesh position={[-0.39, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={broomWoodMat}>
            <cylinderGeometry args={[0.024, 0.022, 0.05, 12]} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const C02S05: React.FC = () => {
  const t = useT();

  // Sau khi diễn hoạt xong ở 239.2 s, bàn giao mượt 100% sang prop `broomsticks={true}` của B25Mitchell
  const lockBaseBroomsticks = t >= 239.2;

  // Ngôn ngữ camera:
  // Pha 1 (228.04–233.2 s): Góc 3/4 cao sau cánh đuôi kép H-tail lượn vòng ra sau đuôi thấy chóp kính trống trơn không súng
  // Pha 2 (233.2–241.18 s): Ép sát vào góc POV tiêm kích bám đuôi ngay sau chóp đuôi (hơi thấp dưới + lệch nhẹ mạn phải
  //                         để 2 thanh cán chổi đen mờ nổi bật sắc nét trên nền bầu trời xanh sáng Florida!)
  const pOrbit = prog(t, CUE.c02_s05_start, 233.2);
  const pPov = prog(t, 233.2, 236.2);
  const pTight = prog(t, 236.2, 241.0);

  const tailWidePos: V3 = [
    lerp(-13.4, -10.8, pOrbit),
    lerp(3.92, 3.22, pOrbit),
    lerp(-4.85, -1.45, pOrbit),
  ];
  const tailWideLook: V3 = [
    lerp(-6.8, -7.65, pOrbit),
    lerp(2.88, 2.95, pOrbit),
    lerp(0.0, 0.0, pOrbit),
  ];

  // POV tiêm kích bám đuôi (x ≈ -9.45 → -9.12 m, y ≈ 2.66 m nhìn chéo nhẹ lên y = 2.97 m để 2 cán chổi đen in lên nền trời sáng!)
  const povStartPos: V3 = [-9.58, 2.7, 0.56];
  const povStartLook: V3 = [-7.88, 2.96, -0.02];

  const povEndPos: V3 = [-9.16, 2.66, 0.42];
  const povEndLook: V3 = [-8.02, 2.97, -0.03];

  const camPos: V3 = [
    lerp(lerp(tailWidePos[0], povStartPos[0], pPov), povEndPos[0], pTight),
    lerp(lerp(tailWidePos[1], povStartPos[1], pPov), povEndPos[1], pTight),
    lerp(lerp(tailWidePos[2], povStartPos[2], pPov), povEndPos[2], pTight),
  ];
  const camLook: V3 = [
    lerp(lerp(tailWideLook[0], povStartLook[0], pPov), povEndLook[0], pTight),
    lerp(lerp(tailWideLook[1], povStartLook[1], pPov), povEndLook[1], pTight),
    lerp(lerp(tailWideLook[2], povStartLook[2], pPov), povEndLook[2], pTight),
  ];
  const camFov = lerp(lerp(40, 36, pPov), 34, pTight);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_PRESETS.floridaSun} shadowArea={18} shadowCenter={[-4, 2.2, 0]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình & rừng thông Florida ở xa */}
        <Terrain h={floridaHeight} size={640} seg={200} colors={TERRAIN_PALETTE.florida} />
        <Scatter
          kind="pine"
          count={260}
          area={[-260, -260, 260, 260]}
          h={floridaHeight}
          seed={14}
          scale={[1.15, 1.95]}
          avoid={avoidAirfield}
        />
        <Scatter
          kind="bush"
          count={140}
          area={[-200, -200, 200, 200]}
          h={floridaHeight}
          seed={29}
          scale={[0.8, 1.4]}
          avoid={avoidAirfield}
        />

        {/* Sân đỗ bê tông, đường băng, hangar phía trước & thang gỗ thợ máy dưới đuôi */}
        <EglinTailBackdrop />

        {/* Chiếc B-25B Mitchell nhìn từ sau cánh đuôi kép chữ H (H-tail) */}
        <group position={[0, 0.012, 0]}>
          <B25Mitchell
            gear={1}
            lowerTurret={false}
            broomsticks={lockBaseBroomsticks}
            bombBay={0}
            propSpin={0}
            chained={false}
          />
          {!lockBaseBroomsticks && <AnimatedTailBroomsticks t={t} />}

          {/* Chèn bánh gỗ vàng dưới bánh chính */}
          {([-2.95, 2.95] as const).map((wz, idx) => (
            <group key={`chk-${idx}`}>
              <mesh position={[1.8, 0.09, wz]} geometry={rbox(0.2, 0.18, 0.46, 0.025)} material={plain(PAINT.deckStripeYellow, 0.76, 0.08)} castShadow />
              <mesh position={[0.68, 0.09, wz]} geometry={rbox(0.2, 0.18, 0.46, 0.025)} material={plain(PAINT.deckStripeYellow, 0.76, 0.08)} castShadow />
            </group>
          ))}
        </group>
      </Stage>

      <Label
        t={t}
        text="TWIN BROOMSTICK BLUFF"
        x={1380}
        y={880}
        from={CUE.c02_s05_broomsticks}
        until={240.75}
      />
    </AbsoluteFill>
  );
};

export default C02S05;
