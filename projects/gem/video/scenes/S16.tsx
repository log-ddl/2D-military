import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, ridgeX, Scatter, Terrain } from '@lib/3d/terrain';
import { Explosion } from '@lib/3d/fx';
import { pipe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL2D, PAL3D, STAGE_PREDAWN, TERRAIN_PREDAWN } from '../local/palette';
import {
  ChuContainer,
  HescoWall,
  NightHawkMast,
  SHAHED_CENTER_Y,
  Shahed136,
  TWall,
} from '../local/models';

// Địa hình sa mạc đá sỏi bazan Rukban rạng sáng 05:31 — san phẳng nền doanh trại Tháp 22 ở y = 0
const H_S16 = heightField({
  seed: 161,
  amp: 4.8,
  scale: 115,
  flats: [[0, 0, 30, 0]],
  add: (x, z) =>
    ridgeX(-95, 11, 38)(x, z) +
    ridgeX(105, 8.5, 42)(x, z) +
    6.5 * Math.exp(-(((z + 88) / 34) ** 2)),
});

const avoidCompound = (x: number, z: number) => Math.abs(x) < 25 && Math.abs(z) < 18;

const IMPACT_POS: V3 = [0, 2.62, 0];
const SHAHED_START: V3 = [17.5, 15.6, 1.8];

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

// Vật liệu tĩnh khởi tạo 1 lần ở cấp module (tái sử dụng cache 100%, không sinh lại theo frame)
const CANOPY_STEEL_MAT = paint({
  color: '#697480',
  camo: ['#5a6470', '#7a8694'],
  camoScale: 3,
  repeat: 0.6,
  wear: 0.2,
  dirt: 0.28,
  roughness: 0.56,
  metalness: 0.34,
  seed: 165,
});

const CANOPY_SHEET_MAT = paint({
  color: '#98a2ac',
  camo: ['#87919b', '#abb4be'],
  camoScale: 3,
  repeat: 0.5,
  wear: 0.18,
  dirt: 0.3,
  roughness: 0.68,
  metalness: 0.26,
  seed: 167,
});

const CANOPY_CHAR_MAT = paint({
  color: '#202226',
  camo: ['#141518', '#35312e'],
  camoScale: 3,
  repeat: 0.8,
  dirt: 0.8,
  wear: 0.15,
  roughness: 0.92,
  metalness: 0.14,
  seed: 169,
});

const WALKWAY_WOOD_MAT = paint({
  color: '#8a7254',
  camo: ['#755f44', '#9c8364'],
  camoScale: 3,
  repeat: 0.9,
  dirt: 0.38,
  wear: 0.22,
  roughness: 0.88,
  metalness: 0.04,
  seed: 171,
});

const WALKWAY_GRAVEL_MAT = paint({
  color: '#5a616c',
  camo: ['#4d545e', '#686f7a'],
  camoScale: 4,
  repeat: 3.5,
  dirt: 0.35,
  wear: 0.15,
  roughness: 0.96,
  metalness: 0.04,
  seed: 173,
});

const CONDUIT_MAT = plain('#3e4650', 0.55, 0.4);
const POLE_MAT = plain('#56616d', 0.55, 0.45);
const LAMP_HEAD_MAT = plain('#ffe0a3', 0.2, 0.05, {
  emissive: new THREE.Color(PAL3D.sodiumLamp),
  emissiveIntensity: 2.6,
});

/** Giàn khung thép & mái hiên cứng bắc ngang hành lang ở độ cao y ≈ 2.6 m giữa hai dãy CHU CC và Z. */
const CorridorCanopyTruss: React.FC<{ damaged: number }> = ({ damaged }) => {
  const dmg = clamp01(damaged);
  const broken = dmg > 0.04;
  const steelMat = CANOPY_STEEL_MAT;
  const canopySheetMat = CANOPY_SHEET_MAT;
  const charSteelMat = CANOPY_CHAR_MAT;

  const conduitGeo = useMemo(
    () =>
      pipe(
        [
          [-4.2, 2.48, -1.42],
          [-2.0, 2.52, -1.35],
          [0.0, 2.52, -1.35],
          [2.0, 2.52, -1.35],
          [4.2, 2.48, -1.42],
        ],
        0.032,
        24,
      ),
    [],
  );

  const postXs = [-3.4, -1.15, 1.15, 3.4];

  return (
    <group>
      {/* 8 cột thép chữ H đỡ giàn mái hiên cứng dọc hai mép hành lang CC & Z */}
      {postXs.map((px, i) =>
        ([-1.52, 1.52] as const).map((pz) => {
          const isInner = Math.abs(px) < 1.5;
          const tiltZ = isInner ? (pz > 0 ? 1 : -1) * 0.16 * dmg : 0;
          const tiltX = isInner ? (px > 0 ? 1 : -1) * 0.12 * dmg : 0;
          return (
            <group key={`post_${i}_${pz}`} position={[px, 0, pz]} rotation={[tiltZ, 0, -tiltX]}>
              <mesh
                geometry={rbox(0.09, 2.62, 0.09, 0.008)}
                position={[0, 1.31, 0]}
                material={isInner && broken ? charSteelMat : steelMat}
                castShadow
                receiveShadow
              />
              <mesh
                geometry={rbox(0.22, 0.03, 0.22, 0.004)}
                position={[0, 0.015, 0]}
                material={steelMat}
              />
            </group>
          );
        }),
      )}

      {/* Xà dọc hai bên & máng cáp điện/ống điều hòa chạy dọc hành lang */}
      {([-1.52, 1.52] as const).map((pz) => (
        <React.Fragment key={`hdr_${pz}`}>
          {!broken ? (
            <mesh
              geometry={rbox(7.4, 0.11, 0.1, 0.008)}
              position={[0, 2.6, pz]}
              material={steelMat}
              castShadow
            />
          ) : (
            <>
              <mesh
                geometry={rbox(2.3, 0.11, 0.1, 0.008)}
                position={[-2.55, 2.6, pz]}
                material={steelMat}
                castShadow
              />
              <mesh
                geometry={rbox(2.3, 0.11, 0.1, 0.008)}
                position={[2.55, 2.6, pz]}
                material={steelMat}
                castShadow
              />
              <mesh
                geometry={rbox(1.5, 0.1, 0.09, 0.008)}
                position={[-0.75, 2.42 - 0.35 * dmg, pz + (pz > 0 ? 0.18 : -0.18) * dmg]}
                rotation={[0.2 * dmg, 0.15 * dmg, -0.38 * dmg]}
                material={charSteelMat}
                castShadow
              />
            </>
          )}
        </React.Fragment>
      ))}

      <mesh geometry={conduitGeo} material={CONDUIT_MAT} />

      {/* Nhịp giàn khung thép cứng & lam chắn nắng hở ở y = 2.62..2.82 m (tâm va chạm kích nổ, không che khuất khe trời) */}
      {!broken ? (
        <group>
          {[-3.4, -2.25, -1.15, 0, 1.15, 2.25, 3.4].map((tx, idx) => (
            <group key={`truss_${idx}`} position={[tx, 2.64, 0]}>
              <mesh geometry={rbox(0.085, 0.1, 3.16, 0.006)} material={steelMat} castShadow />
              <mesh
                geometry={rbox(0.06, 0.06, 1.58, 0.005)}
                position={[0, 0.12, -0.76]}
                rotation={[-0.14, 0, 0]}
                material={steelMat}
                castShadow
              />
              <mesh
                geometry={rbox(0.06, 0.06, 1.58, 0.005)}
                position={[0, 0.12, 0.76]}
                rotation={[0.14, 0, 0]}
                material={steelMat}
                castShadow
              />
            </group>
          ))}
          {/* Xà gồ thép dọc & cụm mái kỹ thuật cứng tập trung quanh vùng x = -1.6..+1.6 */}
          {[-1.1, 0, 1.1].map((gz, gi) => (
            <mesh
              key={`p_${gi}`}
              geometry={rbox(7.2, 0.055, 0.065, 0.005)}
              position={[0, 2.76 - Math.abs(gz) * 0.08, gz]}
              material={steelMat}
              castShadow
            />
          ))}
          {/* Mái che cứng khu trung tâm x = -1.75..+1.75 nơi Shahed đâm nổ tung */}
          <mesh
            geometry={rbox(3.5, 0.038, 1.58, 0.005)}
            position={[0, 2.77, -0.78]}
            rotation={[-0.12, 0, 0]}
            material={canopySheetMat}
            castShadow
            receiveShadow
          />
          <mesh
            geometry={rbox(3.5, 0.038, 1.58, 0.005)}
            position={[0, 2.77, 0.78]}
            rotation={[0.12, 0, 0]}
            material={canopySheetMat}
            castShadow
            receiveShadow
          />
          {/* Hộp ống gió kỹ thuật cứng & đèn pha hành lang gắn dưới bụng giàn thép */}
          <mesh
            geometry={rbox(4.6, 0.2, 0.34, 0.014)}
            position={[0, 2.49, 0.52]}
            material={canopySheetMat}
            castShadow
          />
          {[-2.25, 0, 2.25].map((lx, li) => (
            <mesh
              key={`lamp_${li}`}
              geometry={rbox(0.34, 0.06, 0.16, 0.01)}
              position={[lx, 2.56, -0.15]}
              material={LAMP_HEAD_MAT}
            />
          ))}
        </group>
      ) : (
        /* Sau CUE.s16_detonate: giàn kết cấu cứng ở giữa (x = -1.8..+1.8, y ≈ 2.6m) bị đâm toạc gãy sập, cháy đen */
        <group>
          {[-3.4, -2.35, 2.35, 3.4].map((tx, idx) => (
            <mesh
              key={`rem_${idx}`}
              geometry={rbox(0.08, 0.09, 3.16, 0.006)}
              position={[tx, 2.64, 0]}
              material={Math.abs(tx) < 2.6 ? charSteelMat : steelMat}
              castShadow
            />
          ))}
          {/* Hai đầu mái hiên còn sót lại bị xé cong, ám khói */}
          {([-2.85, 2.85] as const).map((sx, si) => (
            <group
              key={`wing_${si}`}
              position={[sx, 2.72 - 0.08 * dmg, 0]}
              rotation={[0.08 * dmg, 0, (sx < 0 ? 1 : -1) * 0.14 * dmg]}
            >
              <mesh
                geometry={rbox(1.55, 0.036, 1.58, 0.005)}
                position={[0, 0, -0.78]}
                rotation={[-0.12, 0, 0]}
                material={charSteelMat}
                castShadow
              />
              <mesh
                geometry={rbox(1.55, 0.036, 1.58, 0.005)}
                position={[0, 0, 0.78]}
                rotation={[0.12, 0, 0]}
                material={charSteelMat}
                castShadow
              />
            </group>
          ))}
          {/* Dầm thép & tấm tôn trung tâm gãy gập cắm xiên xuống hành lang */}
          <mesh
            geometry={rbox(0.1, 0.1, 2.7, 0.008)}
            position={[-0.35, 2.05 - 0.45 * dmg, -0.15]}
            rotation={[0.52 * dmg, 0.28 * dmg, -0.35 * dmg]}
            material={charSteelMat}
            castShadow
          />
          <mesh
            geometry={rbox(0.1, 0.1, 2.6, 0.008)}
            position={[0.48, 2.12 - 0.5 * dmg, 0.22]}
            rotation={[-0.58 * dmg, -0.22 * dmg, 0.3 * dmg]}
            material={charSteelMat}
            castShadow
          />
          <mesh
            geometry={rbox(1.65, 0.04, 1.25, 0.005)}
            position={[-0.65, 1.85 - 0.65 * dmg, -0.62]}
            rotation={[0.68 * dmg, 0.25 * dmg, -0.45 * dmg]}
            material={charSteelMat}
            castShadow
          />
          <mesh
            geometry={rbox(1.5, 0.04, 1.18, 0.005)}
            position={[0.72, 1.78 - 0.6 * dmg, 0.58]}
            rotation={[-0.72 * dmg, -0.3 * dmg, 0.42 * dmg]}
            material={charSteelMat}
            castShadow
          />
        </group>
      )}
    </group>
  );
};

/** Ván gỗ pallet lát lối đi bộ & cột đèn pha vàng natri dọc hành lang doanh trại. */
const CorridorWalkwayProps: React.FC = () => (
  <group>
    {/* Nền sỏi đầm phẳng khu nhà ngủ CHU */}
    <mesh
      geometry={rbox(26.5, 0.03, 13.8, 0.01)}
      position={[0, 0.005, 0]}
      material={WALKWAY_GRAVEL_MAT}
      receiveShadow
    />
    {/* Dải ván gỗ duckboard dọc giữa hành lang */}
    {[-9.6, -7.2, -4.8, -2.4, 2.4, 4.8, 7.2, 9.6].map((wx, idx) => (
      <group key={`db_${idx}`} position={[wx, 0.035, 0]}>
        <mesh geometry={rbox(2.15, 0.04, 0.96, 0.006)} material={WALKWAY_WOOD_MAT} receiveShadow castShadow />
      </group>
    ))}
    {/* Cột đèn pha natri ở hai đầu hành lang chiếu sáng rạng sáng */}
    {([-10.8, 10.8] as const).map((px, idx) => (
      <group key={`lp_${idx}`} position={[px, 0, idx === 0 ? -4.35 : 4.35]}>
        <mesh position={[0, 2.6, 0]} material={POLE_MAT} castShadow>
          <cylinderGeometry args={[0.045, 0.06, 5.2, 10]} />
        </mesh>
        <mesh
          geometry={rbox(0.34, 0.12, 0.24, 0.015)}
          position={[0, 5.18, idx === 0 ? 0.25 : -0.25]}
          rotation={[idx === 0 ? 0.35 : -0.35, 0, 0]}
          material={LAMP_HEAD_MAT}
        />
      </group>
    ))}
  </group>
);

const S16: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Tiến độ hư hại sau khoảnh khắc nổ CUE.s16_detonate (317.80s)
  const dmg = prog(t, CUE.s16_detonate, CUE.s16_detonate + 0.38);
  // Lượng tử hóa damaged cho ChuContainer để cache paint() tái sử dụng tức thì
  const chuDmgMain = t >= CUE.s16_detonate + 0.05 ? 1 : 0;
  const chuDmgSide = t >= CUE.s16_detonate + 0.12 ? 0.35 : 0;
  const dtBlast = t - CUE.s16_detonate;

  // -------------------- Động học Shahed-136 lao xiên xuống kết cấu cứng y = 2.62 m --------------------
  const diveStart = 313.35;
  const showShahed = t >= diveStart && t < CUE.s16_detonate;
  const diveP = prog(t, diveStart, CUE.s16_detonate, (x) => x);
  const shahedPos = lerpV3(SHAHED_START, IMPACT_POS, diveP);

  const diveVec = useMemo(() => {
    const dx = IMPACT_POS[0] - SHAHED_START[0];
    const dy = IMPACT_POS[1] - SHAHED_START[1];
    const dz = IMPACT_POS[2] - SHAHED_START[2];
    const len = Math.hypot(dx, dy, dz);
    const ux = dx / len;
    const uy = dy / len;
    const uz = dz / len;
    return {
      yaw: Math.atan2(-uz, ux),
      pitch: Math.asin(uy),
    };
  }, []);

  // -------------------- Đường máy quay 5 nhịp khác biệt hoàn toàn với S01 --------------------
  // Nhịp 1 (299.7..306.4s): Trượt thấp dọc hành lang hẹp giữa hai dãy CHU CC & Z sáng đèn vàng
  // Nhịp 2 (306.4..313.4s): Lướt cận vách tôn sóng mỏng, cửa sổ chớp & cục nóng điều hòa cửa sổ
  // Nhịp 3 (313.4..317.8s): Hơi ngước dọc khe trời hẹp giữa hai dãy nhà đón Shahed lao xuống giàn thép y = 2.62m
  // Nhịp 4 (317.8..320.7s): Chấn động lùi dọc hành lang khi cầu lửa bùng nổ xé toạc dãy CC & Z
  // Nhịp 5 (320.7..327.3s): Nâng cao & xoay vòng rộng ra ngoài lộ hai dãy T-Wall 3.66m + rọ HESCO vây kín khói lửa
  const p2 = prog(t, 299.9, 306.4);
  const p3 = prog(t, 306.4, 313.4);
  const p4 = prog(t, 313.4, CUE.s16_detonate);
  const p5 = prog(t, CUE.s16_detonate, 320.7);
  const p6 = prog(t, 320.7, 327.1);

  let camPos: V3 = lerpV3([-10.6, 1.48, 0.24], [-6.4, 1.44, -0.28], p2);
  let camLook: V3 = lerpV3([1.8, 1.72, -0.1], [-2.2, 1.66, 1.35], p2);

  // Cận cảnh cục nóng điều hòa & vách tôn mỏng rồi lùi nhẹ ngắm lên giàn khung cứng
  camPos = lerpV3(camPos, [-4.8, 1.38, -0.46], p3);
  camLook = lerpV3(camLook, [-1.4, 2.05, 0.95], p3);

  // Ngước lên dọc khe hành lang (đứng lùi ngoài rìa mái che tại x = -7.8) để thấy trọn Shahed lao xuống giàn cứng y = 2.62 m
  camPos = lerpV3(camPos, [-7.8, 1.36, 0.18], p4);
  camLook = lerpV3(camLook, [3.6, 5.45, 0.32], p4);

  // Giật lùi dọc khe hành lang khi vụ nổ bùng lửa giữa hai dãy CC & Z
  camPos = lerpV3(camPos, [-9.4, 2.15, 0.05], p5);
  camLook = lerpV3(camLook, [0.0, 2.45, 0.0], p5);

  // Nâng cao và vòng cung rộng ra ngoài mở lộ tường chữ T (3.66m) & HESCO vây chặt hai bên
  const orbitMidPos: V3 = [-14.2, 7.8, 8.6];
  const orbitEndPos: V3 = [-14.6, 9.8, 13.2];
  if (p6 > 0) {
    // Nội suy bậc hai mượt qua điểm vòng cung ngoài tường T-Wall để không xuyên tường
    const u = p6;
    const oneMinus = 1 - u;
    camPos = [
      oneMinus * oneMinus * camPos[0] + 2 * oneMinus * u * orbitMidPos[0] + u * u * orbitEndPos[0],
      oneMinus * oneMinus * camPos[1] + 2 * oneMinus * u * orbitMidPos[1] + u * u * orbitEndPos[1],
      oneMinus * oneMinus * camPos[2] + 2 * oneMinus * u * orbitMidPos[2] + u * u * orbitEndPos[2],
    ];
    camLook = lerpV3(camLook, [0.2, 2.15, 0.0], p6);
  }

  // Rung chấn xung kích ngay khoảnh khắc nổ 317.80s
  const shakeDecay = dtBlast > 0 && dtBlast < 1.8 ? Math.exp(-dtBlast * 2.6) * 0.28 : 0;
  const finalCamPos: V3 = [
    camPos[0] + Math.sin(t * 47) * shakeDecay,
    camPos[1] + Math.cos(t * 59) * shakeDecay * 0.8,
    camPos[2] + Math.sin(t * 53 + 1.2) * shakeDecay,
  ];
  const fov = lerp(44, 48, p4) - 4 * p6;

  // Ánh lửa cháy âm ỉ kẹt trong hành lang sau vụ nổ
  const fireAfterglow =
    dtBlast > 0 ? clamp01(1 - dtBlast / 12) * (0.78 + 0.22 * Math.sin(t * 19)) : 0;

  return (
    <AbsoluteFill>
      <Stage {...STAGE_PREDAWN} shadowArea={32} shadowCenter={[0, 1.5, 0]}>
        <Cam pos={finalCamPos} look={camLook} fov={fov} />

        {/* Địa hình sa mạc đá sỏi bazan Rukban rạng sáng */}
        <Terrain h={H_S16} size={440} seg={200} colors={TERRAIN_PREDAWN} grainRepeat={44} />
        <Scatter
          kind="rock"
          count={220}
          area={[-150, -140, 150, 140]}
          h={H_S16}
          seed={162}
          scale={[0.35, 1.15]}
          avoid={avoidCompound}
          tint="#69717d"
        />

        {/* Đèn pha vàng natri hắt ấm dọc hành lang khu nhà ngủ trước vụ nổ */}
        <pointLight
          position={[-5.5, 3.3, 0]}
          color={PAL3D.sodiumLamp}
          intensity={14}
          distance={18}
          decay={1.7}
        />
        <pointLight
          position={[5.5, 3.3, 0]}
          color={PAL3D.sodiumLamp}
          intensity={14}
          distance={18}
          decay={1.7}
        />

        {/* Ánh lửa đỏ cam cuộn sáng bên trong hẻm tường chữ T sau khi nổ */}
        {fireAfterglow > 0.01 && (
          <pointLight
            position={[0, 2.5, 0]}
            color="#ff7426"
            intensity={85 * fireAfterglow}
            distance={24}
            decay={1.6}
          />
        )}

        <CorridorWalkwayProps />
        <CorridorCanopyTruss damaged={dmg} />

        {/* ==================== DÃY NHÀ CONTAINER CHU "CC" (BÊN BẮC / TRÁI HÀNH LANG, z = -2.85 m) ==================== */}
        <group position={[-7.2, 0, -2.85]}>
          <ChuContainer warmLight damaged={chuDmgSide} />
        </group>
        <group position={[0, 0, -2.85]}>
          <ChuContainer warmLight damaged={chuDmgMain} />
        </group>
        <group position={[7.2, 0, -2.85]}>
          <ChuContainer warmLight damaged={chuDmgSide} />
        </group>

        {/* ==================== DÃY NHÀ CONTAINER CHU "Z" (BÊN NAM / PHẢI HÀNH LANG, z = +2.85 m) ==================== */}
        <group position={[-7.2, 0, 2.85]} rotation={[0, Math.PI, 0]}>
          <ChuContainer warmLight damaged={chuDmgSide} />
        </group>
        <group position={[0, 0, 2.85]} rotation={[0, Math.PI, 0]}>
          <ChuContainer warmLight damaged={chuDmgMain} />
        </group>
        <group position={[7.2, 0, 2.85]} rotation={[0, Math.PI, 0]}>
          <ChuContainer warmLight damaged={chuDmgSide} />
        </group>

        {/* Dãy CHU lân cận phía xa bên kia tường chữ T để rõ quy mô khu nhà ngủ 350 lính */}
        <group position={[-3.8, 0, -9.8]}>
          <ChuContainer warmLight />
        </group>
        <group position={[4.2, 0, -9.8]}>
          <ChuContainer warmLight />
        </group>
        <group position={[15.5, 0, -11.5]}>
          <NightHawkMast yaw={0.65} strobe={0} />
        </group>

        {/* ==================== VÒNG VÂY TƯỜNG BÊ TÔNG CHỮ T (CAO 3.66 M > NÓC CHU 2.59 M) ==================== */}
        {/* Hai bức tường chữ T thẳng tắp kẹp sát lưng hai dãy CC & Z */}
        <group position={[0, 0, -5.05]}>
          <TWall count={19} />
        </group>
        <group position={[0, 0, 5.05]}>
          <TWall count={19} />
        </group>
        {/* Tường chữ T chắn hai đầu hồi khu nhà ngủ tạo thế hộp khóa kín */}
        <group position={[-12.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <TWall count={7} />
        </group>
        <group position={[12.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <TWall count={7} />
        </group>

        {/* ==================== VÒNG RỌ ĐẤT CÔNG SỰ HESCO BASTION BAO NGOÀI ==================== */}
        <group position={[-5.4, 0, -6.55]}>
          <HescoWall cells={7} />
        </group>
        <group position={[5.4, 0, -6.55]}>
          <HescoWall cells={7} />
        </group>
        <group position={[-5.4, 0, 6.55]}>
          <HescoWall cells={7} />
        </group>
        <group position={[5.4, 0, 6.55]}>
          <HescoWall cells={7} />
        </group>
        <group position={[-13.7, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <HescoWall cells={6} />
        </group>
        <group position={[13.7, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <HescoWall cells={6} />
        </group>

        {/* ==================== SHAHED-136 LAO XIÊN ĐÂM TRÚNG KẾT CẤU CỨNG Y ≈ 2.62 M ==================== */}
        {showShahed && (
          <group position={shahedPos} rotation={[0, diveVec.yaw, 0]}>
            {/* Ánh đèn hắt nhẹ lên thân cánh tam giác để nổi khối sắc nét trên nền trời rạng sáng */}
            <pointLight position={[-1.2, 1.4, 0]} color="#cbe2ff" intensity={8} distance={7} decay={1.5} />
            <group position={[0, -SHAHED_CENTER_Y, 0]}>
              <Shahed136 propSpin={t * 52} pitch={diveVec.pitch} bank={0.14} />
            </group>
          </group>
        )}

        {/* ==================== VỤ NỔ CHÍNH TRÊN KẾT CẤU CỨNG Y = 2.62 M & ĐÁM CHÁY ÂM Ỉ ==================== */}
        <Explosion
          t={t}
          at={CUE.s16_detonate}
          pos={IMPACT_POS}
          size={5.2}
          seed={16}
          smokeLife={10.5}
          smoke="#49433d"
        />
        {/* Mảnh vỡ khung thép & vách tôn cháy âm ỉ nằm rải rác dưới nền hành lang sau vụ nổ */}
        {dtBlast > 0.25 && (
          <group>
            {[
              [-0.85, 0.08, -0.72, 0.75, 0.07, 0.42, 0.35],
              [0.68, 0.07, 0.64, 0.68, 0.06, 0.38, -0.48],
              [-0.18, 0.09, 0.22, 0.54, 0.08, 0.32, 0.82],
              [1.15, 0.06, -0.48, 0.62, 0.05, 0.35, -0.22],
            ].map(([fx, fy, fz, sx, sy, sz, rotY], fi) => (
              <mesh
                key={`debris_${fi}`}
                geometry={rbox(sx, sy, sz, 0.008)}
                position={[fx, fy, fz]}
                rotation={[0.08 * (fi % 2 === 0 ? 1 : -1), rotY, 0.06]}
                material={CANOPY_CHAR_MAT}
                castShadow
                receiveShadow
              />
            ))}
          </group>
        )}
      </Stage>

      {/* Tối đa 1 <Label> trên màn hình tại mọi thời điểm */}
      <Label
        t={t}
        text="05:31"
        x={220}
        y={128}
        from={CUE.s16_time}
        until={304.0}
        size={56}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="KHU NHÀ CHU"
        x={280}
        y={128}
        from={CUE.s16_chu}
        until={312.4}
        size={52}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="DÃY CC & Z"
        x={960}
        y={136}
        from={CUE.s16_cc_z}
        until={322.6}
        size={54}
        bg={PAL2D.threatMid}
        fg={PAL2D.paper}
      />
      <Label
        t={t}
        text="T-WALL · HESCO"
        x={960}
        y={136}
        from={CUE.s16_twall}
        until={326.95}
        size={54}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S16;
