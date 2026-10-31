import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import { useSize } from '@core/frame';
import { bump, lerp, prog, useT } from '@core/time';
import { Explosion } from '@skill/military/3d/fx';
import { pipe, rbox } from '@skill/military/3d/geom';
import { plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain } from '@skill/military/3d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { FactoryComplex, TokyoRowhouseBlock } from '../parts/JapanTargetBlocks';
import { BombANM64 } from '../parts/Ordnance3D';
import { Type88Flak } from '../parts/Type88Flak';

// Địa hình khu công nghiệp luyện thép Tokyo (tạo cấp module để không dựng lại lưới mỗi khung)
const STEEL_DISTRICT_H = heightField({
  seed: 307,
  amp: 3.6,
  scale: 155,
  flats: [
    [345, -14, 125, 0],
    [155, -60, 85, 0],
    [185, 65, 85, 0],
    [35, -85, 75, 0],
    [-40, -95, 75, 0],
    [485, -55, 85, 0],
    [475, 65, 85, 0],
  ],
});

const avoidIndustrial = (x: number, z: number) =>
  Math.hypot(x - 345, z + 14) < 92 ||
  Math.abs(z + 52) < 9 ||
  Math.abs(x - 282) < 8 ||
  (Math.abs(z) < 62 && x > 85 && x < 495);

// Mốc tách giá treo bom 500-lb gắn huy chương ("returning@516.30 Tokyo's peace tokens with high explosives")
const BOMB_RELEASE_AT = 516.3;

// Toạ độ gắn quả bom 500-lb đặc tả trong khoang bom chiếc B-25 #10
const HERO_BOMB_LOCAL: V3 = [1.36, 1.2, -0.05];
// Góc xoay quanh trục dọc +X đưa tấm huy chương hoa cúc vàng & ruy-băng đỏ-trắng ra đúng mặt dưới-phải (+Z, -Y)
const HERO_BOMB_ROLL_X = 0.72;

const FLAK_PUFFS: { at: number; pos: V3; size: number; seed: number }[] = [
  { at: 499.8, pos: [-115, 110, -28], size: 3.8, seed: 7 },
  { at: 500.6, pos: [-82, 102, -36], size: 3.6, seed: 11 },
  { at: 501.4, pos: [-54, 118, -22], size: 3.5, seed: 19 },
  { at: 502.4, pos: [-18, 106, -30], size: 3.7, seed: 23 },
  { at: 504.1, pos: [42, 112, -26], size: 3.5, seed: 31 },
  { at: 505.8, pos: [92, 108, -32], size: 3.6, seed: 37 },
  { at: 507.6, pos: [148, 116, 26], size: 3.4, seed: 41 },
  { at: 515.6, pos: [276, 102, -24], size: 3.5, seed: 53 },
  { at: 517.1, pos: [306, 82, 24], size: 3.6, seed: 59 },
  { at: 518.7, pos: [324, 58, -20], size: 3.4, seed: 67 },
];

const lerp3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

const C03S07: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const shackleMat = useMemo(() => plain('#394034', 0.52, 0.62), []);
  const roadMat = useMemo(() => plain('#3a3936', 0.94, 0.05), []);
  const pipeSteelMat = useMemo(() => plain('#555a5e', 0.55, 0.58), []);
  const slagGlowMat = useMemo(() => plain('#ff7a24', 0.4, 0.1), []);
  const steamPipeGeo = useMemo(
    () =>
      pipe(
        [
          [-12, 6.8, -10],
          [-12, 9.2, -10],
          [-12, 9.2, -24],
          [-12, 6.8, -24],
        ],
        0.42,
        20,
      ),
    [],
  );

  // Khoá giảm rung thân máy bay trong đoạn siêu cận khoang bom (510.2–516.3 s) để đọc rõ từng chi tiết huy chương
  const macroSteady = prog(t, 509.6, 511.2) * (1 - prog(t, 516.1, 516.6));
  const airAmp = 1 - 0.88 * macroSteady;

  // Quỹ đạo bay chiếc B-25 #10 của Trung uý Richard Joyce ở độ cao 114 m trên bầu trời ám khói Tokyo
  const planePos = (sec: number): V3 => {
    const x = -105 + (sec - 502.0) * 25;
    const y = 114 + Math.sin(sec * 1.35) * 0.36 * airAmp;
    const z = Math.sin(sec * 0.72) * 0.42 * airAmp;
    return [x, y, z];
  };

  const pNow = planePos(t);
  const planeRoll = 0.045 * Math.sin(t * 0.85) * airAmp;

  // Trạng thái quả bom 500-lb AN-M64 gắn huy chương hữu nghị Nhật Bản
  const released = t >= BOMB_RELEASE_AT;
  const impacted = t >= CUE.c03_s07_blasts_steel_mill;
  const uDrop = prog(t, BOMB_RELEASE_AT, CUE.c03_s07_blasts_steel_mill, Easing.linear);

  // Vị trí tách móc chính xác tại t = 516.30 s (planeX = 252.5 -> bombX = 253.86, bombY = 115.2)
  const relOrigin: V3 = [252.5 + HERO_BOMB_LOCAL[0], 114 + HERO_BOMB_LOCAL[1], HERO_BOMB_LOCAL[2]];
  const targetPoint: V3 = [345.0, 9.2, 2.0];

  const dropX = lerp(relOrigin[0], targetPoint[0], uDrop * (1.14 - 0.14 * uDrop));
  const dropY = lerp(relOrigin[1], targetPoint[1], uDrop * uDrop);
  const dropZ = lerp(relOrigin[2], targetPoint[2], uDrop);
  const dropVx = (targetPoint[0] - relOrigin[0]) * (1.14 - 0.28 * uDrop);
  const dropVy = (targetPoint[1] - relOrigin[1]) * (2 * Math.max(0.03, uDrop));
  const dropPitch = released ? Math.atan2(dropVy, dropVx) * prog(t, BOMB_RELEASE_AT, BOMB_RELEASE_AT + 0.55) : 0;

  // Rung ruy-băng nhẹ trong luồng gió khoang bom
  const windFlutter = Math.sin(t * 26) * 0.018;

  // Mức phá huỷ nhà máy luyện thép lớn (0 -> 0.9 ngay khi nổ ở 520.80 s)
  const millDamage = prog(t, CUE.c03_s07_blasts_steel_mill, CUE.c03_s07_blasts_steel_mill + 0.55) * 0.9;

  // ==================== NGÔN NGỮ CAMERA 4 NHỊP LIỀN MẠCH ====================
  // Nhịp 1 (502.0–508.8 s): Góc chéo trên-ngang thấy rõ B-25 #10 bay trên bầu trời ám khói & nhà xưởng Tokyo, rồi vòng xuống bụng khoang bom
  const pHero = prog(t, 502.2, 508.8);
  const camHeroRel: V3 = [lerp(13.6, 5.8, pHero), lerp(4.8, -1.15, pHero), lerp(12.2, 5.2, pHero)];
  const lookHeroRel: V3 = [lerp(0.4, 1.4, pHero), lerp(0.6, 1.45, pHero), lerp(-2.2, 0, pHero)];

  // Nhịp 2 (508.8–516.3 s): Đẩy siêu cận dưới khoang bom, đóng khung trực diện tấm huy chương vàng, dây đồng & ruy-băng đỏ-trắng
  const pToMacro = prog(t, 508.8, 511.35);
  const pMacroDrift = prog(t, 511.35, 516.25, Easing.linear);
  const camMacroRel: V3 = [
    lerp(1.74, 1.54, pMacroDrift),
    lerp(0.86, 0.91, pMacroDrift),
    lerp(0.51, 0.475, pMacroDrift),
  ];
  const lookMacroRel: V3 = [
    lerp(1.43, 1.39, pMacroDrift),
    lerp(1.18, 1.2, pMacroDrift),
    0.11,
  ];

  const camInPlaneRel = lerp3(camHeroRel, camMacroRel, pToMacro);
  const lookInPlaneRel = lerp3(lookHeroRel, lookMacroRel, pToMacro);
  const camBeforeDrop: V3 = [
    pNow[0] + camInPlaneRel[0],
    pNow[1] + camInPlaneRel[1],
    pNow[2] + camInPlaneRel[2],
  ];
  const lookBeforeDrop: V3 = [
    pNow[0] + lookInPlaneRel[0],
    pNow[1] + lookInPlaneRel[1],
    pNow[2] + lookInPlaneRel[2],
  ];
  const fovBeforeDrop = lerp(lerp(44, 39, pHero), 31, pToMacro);

  // Nhịp 3 (516.3–520.5 s): Chúc nghiêng bám sát sau cánh đuôi hộp của quả bom gắn huy chương lao thẳng xuống nhà máy thép
  // Giữ trọn thân bom & cánh đuôi hộp ở 1/3 trên-trái khung hình (không bị cắt mép) trong khi mái nhà máy luyện thép nằm ngay bên dưới mũi bom
  const pToChase = prog(t, BOMB_RELEASE_AT - 0.05, BOMB_RELEASE_AT + 0.65);
  const camChaseWorld: V3 = [
    dropX - lerp(1.45, 2.35, uDrop),
    dropY + lerp(1.25, 2.45, uDrop),
    dropZ + lerp(0.92, 1.48, uDrop),
  ];
  const lookChaseWorld: V3 = [
    dropX + lerp(1.15, 2.85, uDrop),
    dropY - lerp(1.55, 4.1, uDrop),
    dropZ - lerp(0.12, 0.25, uDrop),
  ];

  const camMid = lerp3(camBeforeDrop, camChaseWorld, pToChase);
  const lookMid = lerp3(lookBeforeDrop, lookChaseWorld, pToChase);
  const fovMid = lerp(fovBeforeDrop, 46, pToChase);

  // Nhịp 4 (520.35–522.74 s): Hãm độ cao mở góc nhìn trọn quả cầu lửa khổng lồ đánh nổ tung nhà máy luyện thép
  const pBlastView = prog(t, 520.32, 521.05);
  const pBlastDrift = prog(t, 520.8, 522.74, Easing.linear);
  const shakeBlast = bump(t, CUE.c03_s07_blasts_steel_mill, 1.05) * 1.35;
  const camBlastWorld: V3 = [
    lerp(286, 276, pBlastDrift) + Math.sin(t * 47) * shakeBlast,
    lerp(44, 52, pBlastDrift) + Math.cos(t * 41) * shakeBlast * 0.8,
    lerp(52, 62, pBlastDrift) + Math.sin(t * 37) * shakeBlast * 0.5,
  ];
  const lookBlastWorld: V3 = [345, lerp(11.5, 15.5, pBlastDrift), -6];

  const camPos = lerp3(camMid, camBlastWorld, pBlastView);
  const camLook = lerp3(lookMid, lookBlastWorld, pBlastView);
  const camFov = lerp(fovMid, 46, pBlastView);
  const camRoll = lerp(lerp(0.03, 0, pToMacro), 0.08 * (1 - pBlastView), pToChase);

  // Tâm vùng bóng đổ 4096px bám sát chủ thể chính (máy bay -> quả bom rơi -> nhà máy thép nổ)
  const shadowFocus: V3 = impacted
    ? [345, 8, -6]
    : released
      ? [dropX, dropY, dropZ]
      : [pNow[0] + 1.4, pNow[1] + 1.5, pNow[2]];
  const shadowRadius = impacted ? 88 : released ? lerp(18, 72, uDrop) : lerp(22, 10, pToMacro);

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.tokyoFire}
        width={W}
        height={H}
        shadowCenter={shadowFocus}
        shadowArea={shadowRadius}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Mặt đất đô thị - khu công nghiệp luyện thép Tokyo */}
        <Terrain
          h={STEEL_DISTRICT_H}
          size={1200}
          seg={144}
          center={[230, -15]}
          colors={TERRAIN_PALETTE.tokyoUrban}
        />
        <Scatter
          kind="broadleaf"
          count={155}
          area={[-180, -260, 620, 250]}
          h={STEEL_DISTRICT_H}
          seed={71}
          scale={[0.8, 1.35]}
          tint="#8b8f7d"
          avoid={avoidIndustrial}
        />

        {/* Tuyến đường trục vận tải công nghiệp nối các phân xưởng thép */}
        <mesh position={[240, 0.08, -52]} geometry={rbox(560, 0.12, 9.5, 0.02)} material={roadMat} receiveShadow />
        <mesh position={[282, 0.08, -8]} geometry={rbox(9.0, 0.12, 220, 0.02)} material={roadMat} receiveShadow />

        {/* ==================== KHU LIÊN HỢP NHÀ MÁY LUYỆN THÉP MỤC TIÊU (x = 345, z = 0) ==================== */}
        <group position={[345, 0, 4]}>
          {/* Phân xưởng luyện thép chính mái răng cưa + 2 ống khói gạch cao 24.6 m (variant=1) */}
          <FactoryComplex variant={1} damage={millDamage} />
          {/* Phân xưởng cán thép & lò cao đối diện qua giàn ống dẫn hơi nóng */}
          <group position={[-4, 0, -40]} rotation={[0, Math.PI, 0]}>
            <FactoryComplex variant={1} damage={millDamage * 0.85} />
          </group>
          <mesh geometry={steamPipeGeo} material={pipeSteelMat} castShadow />
          <mesh position={[10, 0, -20]} geometry={steamPipeGeo} material={pipeSteelMat} castShadow />
          {/* Ánh lửa lò cao âm ỉ giữa hai dãy xưởng */}
          <mesh position={[-2, 2.2, -18]} geometry={rbox(14, 3.0, 3.8, 0.15)} material={slagGlowMat} />
          {impacted && (
            <pointLight
              position={[0, 16, -4]}
              color="#ff8c34"
              intensity={165 * (1 - 0.35 * prog(t, 520.8, 522.74))}
              distance={145}
              decay={1.6}
            />
          )}
        </group>

        {/* Các xưởng cơ khí, dãy phố gỗ & cột khói cháy dọc dưới đường bay từ đầu cảnh */}
        <group position={[-42, 0, -96]} rotation={[0, 0.25, 0]}>
          <FactoryComplex variant={0} damage={0.8} />
        </group>
        <group position={[35, 0, -84]} rotation={[0, -0.15, 0]}>
          <TokyoRowhouseBlock variant={1} />
        </group>
        <group position={[160, 0, -64]} rotation={[0, 0.15, 0]}>
          <FactoryComplex variant={0} damage={0.75} />
        </group>
        <group position={[192, 0, 68]} rotation={[0, -0.2, 0]}>
          <FactoryComplex variant={0} damage={0.65} />
        </group>
        <group position={[482, 0, -56]} rotation={[0, 1.57, 0]}>
          <FactoryComplex variant={1} damage={0} />
        </group>
        <group position={[474, 0, 66]}>
          <FactoryComplex variant={0} damage={0} />
        </group>

        <group position={[105, 0, 48]}>
          <TokyoRowhouseBlock variant={0} />
        </group>
        <group position={[122, 0, -46]}>
          <TokyoRowhouseBlock variant={1} />
        </group>
        <group position={[258, 0, 74]}>
          <TokyoRowhouseBlock variant={2} />
        </group>
        <group position={[264, 0, -78]}>
          <TokyoRowhouseBlock variant={0} />
        </group>
        <group position={[418, 0, 74]}>
          <TokyoRowhouseBlock variant={1} />
        </group>
        <group position={[422, 0, -76]}>
          <TokyoRowhouseBlock variant={2} />
        </group>

        {/* 2 ụ pháo phòng không Type 88 75mm dưới mặt đất bảo vệ nhà máy thép */}
        <group position={[292, 0, 48]} rotation={[0, -0.7, 0]}>
          <Type88Flak sandbags elev={1.16} yaw={0.25} recoil={bump(t, 517.0, 0.38)} />
        </group>
        <group position={[404, 0, -52]} rotation={[0, 2.35, 0]}>
          <Type88Flak sandbags elev={1.22} yaw={-0.18} recoil={bump(t, 518.6, 0.38)} />
        </group>

        {/* Các cột khói cháy âm ỉ ở hậu cảnh từ đợt rải bom cháy của Doolittle vài phút trước */}
        <Explosion t={t} at={496.5} pos={[-42, 7, -96]} size={15} seed={3} smokeLife={28} smoke="#2e2a27" />
        <Explosion t={t} at={497.4} pos={[160, 7, -64]} size={15} seed={5} smokeLife={28} smoke="#2e2a27" />
        <Explosion t={t} at={498.8} pos={[192, 7, 68]} size={13.5} seed={9} smokeLife={28} smoke="#35302c" />

        {/* Các cụm khói pháo phòng không đen lơ lửng trên bầu trời Tokyo */}
        {FLAK_PUFFS.map((f, idx) => (
          <Explosion
            key={idx}
            t={t}
            at={f.at}
            pos={f.pos}
            size={f.size}
            seed={f.seed}
            smokeLife={14}
            smoke="#252321"
          />
        ))}

        {/* ==================== CHIẾC B-25B #10 CỦA TRUNG UÝ RICHARD JOYCE ==================== */}
        <group position={pNow} rotation={[planeRoll, 0, 0]}>
          <B25Mitchell
            gear={0}
            bombBay={1}
            propFast
            propSpin={t * 42}
            broomsticks
            turretYaw={0.32 * Math.sin(t * 0.55)}
            turretPitch={0.22}
            seed={10}
          />

          {/* Ngàm giá treo bom thép trung tâm ăn khớp chính xác với 2 móc treo lưng quả bom gắn huy chương */}
          <group position={HERO_BOMB_LOCAL} rotation={[HERO_BOMB_ROLL_X, 0, 0]}>
            <mesh position={[0.065, 0.255, 0]} geometry={rbox(0.34, 0.09, 0.055, 0.008)} material={shackleMat} />
            <mesh position={[0.065, 0.44, -0.14]} rotation={[0.55, 0, 0]} geometry={rbox(0.18, 0.36, 0.05, 0.006)} material={shackleMat} />
          </group>

          {/* Hệ đèn điểm ấm bố trí bên trong & dưới khoang bom để tôn rõ huy chương vàng + ruy-băng lụa, chống tối bóng đổ */}
          <pointLight
            position={[1.76, 0.92, 0.49]}
            color="#ffe2b0"
            intensity={2.9}
            distance={3.4}
            decay={1.55}
          />
          <pointLight
            position={[1.06, 1.66, -0.22]}
            color="#ffd399"
            intensity={1.7}
            distance={3.1}
            decay={1.6}
          />

          {/* Quả bom phá 500-lb AN-M64 buộc huy chương hữu nghị Nhật Bản khi còn treo trong khoang bom (t < 516.30 s) */}
          {!released && (
            <group
              position={HERO_BOMB_LOCAL}
              rotation={[HERO_BOMB_ROLL_X + windFlutter, 0, 0]}
            >
              <BombANM64 medal seed={10} />
            </group>
          )}
        </group>

        {/* ==================== QUẢ BOM 500-LB GẮN HUY CHƯƠNG RƠI TỰ DO XUỐNG NHÀ MÁY THÉP (516.30–520.80 s) ==================== */}
        {released && !impacted && (
          <group position={[dropX, dropY, dropZ]}>
            {/* Đèn điểm ấm bám theo quả bom trên không để thấy rõ cánh đuôi hộp, dây đồng & huy chương */}
            <pointLight position={[-0.4, 0.65, 1.15]} color="#ffe0ad" intensity={2.3} distance={4.4} decay={1.5} />
            <group rotation={[0, 0, dropPitch]}>
              <group rotation={[HERO_BOMB_ROLL_X, 0, 0]}>
                <BombANM64 medal seed={10} />
              </group>
            </group>
          </group>
        )}

        {/* ==================== VỤ NỔ QUẢ CẦU LỬA KHỔNG LỒ ĐÁNH SẬP NHÀ MÁY LUYỆN THÉP (t >= 520.80 s) ==================== */}
        <Explosion
          t={t}
          at={CUE.c03_s07_blasts_steel_mill}
          pos={[345, 6.5, 4]}
          size={18}
          seed={17}
          smokeLife={8}
          smoke="#342f2b"
        />
        {/* Nổ dây chuyền lò cao & bồn khí than luyện kim giữ cầu lửa rực sáng suốt cuối cảnh */}
        <Explosion
          t={t}
          at={CUE.c03_s07_blasts_steel_mill + 0.48}
          pos={[332, 5.5, -18]}
          size={13.5}
          seed={29}
          smokeLife={8}
          smoke="#2c2825"
        />
        <Explosion
          t={t}
          at={CUE.c03_s07_blasts_steel_mill + 1.08}
          pos={[357, 7.0, 10]}
          size={14.5}
          seed={43}
          smokeLife={8}
          smoke="#302b28"
        />
      </Stage>

      <Label
        t={t}
        text="PLANE #10 · LT. RICHARD JOYCE"
        x={495}
        y={140}
        from={504.94}
        until={509.2}
        size={44}
      />
    </AbsoluteFill>
  );
};

export default C03S07;
