import React, { useMemo } from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Terrain, type TerrainColors } from '@lib/3d/terrain';
import { ballistic, Explosion, Trail } from '@lib/3d/fx';
import { lathe, rbox } from '@lib/3d/geom';
import { plain } from '@lib/3d/materials';
import { CUE } from '../cues';
import { PAL2D, STAGE_DUSK_STRIKE } from '../local/palette';
import { B1B_AFT_BAY_POS, B1B_FWD_BAY_POS, B1BLancer } from '../local/models';

const GROUND_OFFSET_Y = -110;

// Địa hình sa mạc đêm Iraq - Syria sâu 110 m bên dưới tầng bình lưu
const NIGHT_DESERT_H = heightField({
  seed: 1902,
  amp: 13,
  scale: 190,
  oct: 5,
  add: (x, z) =>
    10.0 * Math.exp(-(((z - 210) / 80) ** 2)) +
    7.5 * Math.exp(-(((x - 420) / 110) ** 2)) -
    3.5 * Math.exp(-(((z - 95) / 48) ** 2)),
});

const NIGHT_DESERT_COLORS: TerrainColors = {
  low: '#111521',
  high: '#24293b',
  rock: '#0b0e16',
  dry: '#2f2431',
};

const groundWorldY = (x: number, z: number) => GROUND_OFFSET_Y + NIGHT_DESERT_H(x, z);

// Thân đạn dẫn đường chính xác (AGM-158 JASSM / GBU-31 JDAM) tách khỏi khoang xoay CSRL
const GUIDED_MUNITION_GEO = lathe(
  [
    [0.01, -2.05],
    [0.15, -1.82],
    [0.19, -0.9],
    [0.19, 1.15],
    [0.12, 1.72],
    [0.01, 2.15],
  ],
  16,
);
const MUNITION_FIN_GEO = rbox(0.55, 0.04, 0.92, 0.01);

type StrikeWave = {
  releaseAt: number;
  impactAt: number;
  bay: 'fwd' | 'aft';
  zBayOffset: number;
  targetX: number;
  targetZ: number;
  blastSize: number;
  seed: number;
};

// 8 mục tiêu trải rộng trên thung lũng sa mạc đêm phía trước-dưới bên mạn phải (+X, +Z),
// đảm bảo không cột khói nào bốc che thân máy bay và thấy rõ thảm chớp nổ liên hoàn từ 387.4s -> 391.2s.
const STRIKE_WAVES: StrikeWave[] = [
  { releaseAt: 386.65, impactAt: 387.44, bay: 'fwd', zBayOffset: 0.36, targetX: 258, targetZ: 46, blastSize: 8.2, seed: 11 },
  { releaseAt: 386.92, impactAt: 387.78, bay: 'aft', zBayOffset: -0.34, targetX: 292, targetZ: 92, blastSize: 9.0, seed: 17 },
  { releaseAt: 387.22, impactAt: 388.16, bay: 'fwd', zBayOffset: -0.32, targetX: 315, targetZ: 34, blastSize: 7.8, seed: 23 },
  { releaseAt: 387.55, impactAt: 388.58, bay: 'aft', zBayOffset: 0.36, targetX: 346, targetZ: 124, blastSize: 9.6, seed: 29 },
  { releaseAt: 387.90, impactAt: 389.02, bay: 'fwd', zBayOffset: 0.34, targetX: 364, targetZ: 68, blastSize: 8.6, seed: 37 },
  { releaseAt: 388.28, impactAt: 389.50, bay: 'aft', zBayOffset: -0.32, targetX: 396, targetZ: 146, blastSize: 9.4, seed: 43 },
  { releaseAt: 388.68, impactAt: 389.98, bay: 'fwd', zBayOffset: -0.36, targetX: 412, targetZ: 52, blastSize: 8.4, seed: 53 },
  { releaseAt: 389.08, impactAt: 390.52, bay: 'aft', zBayOffset: 0.32, targetX: 444, targetZ: 104, blastSize: 9.8, seed: 61 },
];

/** Tính toạ độ và góc bay của B-1B Lancer theo giây tuyệt đối t. */
function getB1BState(t: number) {
  const dt = Math.max(0, t - 373.8);
  const x = -168 + dt * 19.5;
  const climbP = prog(t, 373.8, 383.8);
  const y = lerp(-4.0, 11.0, climbP);
  const z = 0;

  const pitch = lerp(0.088, -0.016, prog(t, 381.8, 386.6));
  // Nghiêng cánh mượt khi khép cánh biến hình (383.8 - 386.8s) rồi mở nhẹ bụng về hướng mục tiêu
  const sweepBank = Math.sin(prog(t, 383.5, 387.0) * Math.PI) * -0.24;
  const strikeBank = prog(t, 386.4, 388.4) * 0.12;
  const bank = sweepBank + strikeBank;

  return { pos: [x, y, z] as V3, pitch, bank };
}

/** Khu mục tiêu căn cứ/kho đạn dưới mặt đất sa mạc đêm kèm chớp sáng & sóng xung kích lan rộng. */
const GroundTargetsLayer: React.FC<{ t: number }> = ({ t }) => {
  const bunkerMat = useMemo(() => plain('#1b1f2a', 0.9, 0.15), []);

  return (
    <group>
      {STRIKE_WAVES.map((w, idx) => {
        const gy = groundWorldY(w.targetX, w.targetZ);
        const dtHit = t - w.impactAt;
        const hitActive = dtHit >= 0;
        const flashP = hitActive ? Math.max(0, 1 - dtHit / 1.25) : 0;
        const ringScale = hitActive ? 2.5 + Math.min(1, dtHit / 1.3) * (w.blastSize * 2.9) : 0.1;

        return (
          <group key={idx}>
            <group position={[w.targetX, gy, w.targetZ]}>
              <mesh position={[0, 1.1, 0]} geometry={rbox(8.0, 2.4, 5.2, 0.15)} material={bunkerMat} />
              <mesh position={[6.5, 0.9, 3.0]} geometry={rbox(5.4, 1.9, 3.8, 0.12)} material={bunkerMat} />
              <mesh position={[-5.6, 0.8, -2.6]} geometry={rbox(4.6, 1.7, 3.5, 0.12)} material={bunkerMat} />

              {/* Đốm đèn khu mục tiêu trước khi trúng đạn & quầng lửa cháy thứ cấp sau khi nổ */}
              <mesh position={[0.4, 1.7, 0.3]}>
                <sphereGeometry args={[hitActive ? 1.8 : 0.72, 10, 8]} />
                <meshBasicMaterial color={hitActive ? '#ff7b24' : '#ffb85c'} toneMapped={false} />
              </mesh>
              <mesh position={[6.2, 1.35, 2.8]}>
                <sphereGeometry args={[hitActive ? 1.1 : 0.52, 8, 6]} />
                <meshBasicMaterial color="#ff9d42" toneMapped={false} />
              </mesh>

              {/* Vòng sóng xung kích phát sáng rõ nét từ tầng bình lưu */}
              {hitActive && dtHit < 1.35 && (
                <mesh position={[0, 0.7, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[ringScale, ringScale, 1]}>
                  <ringGeometry args={[0.72, 1.0, 28]} />
                  <meshBasicMaterial
                    color="#ffd280"
                    transparent
                    opacity={flashP * 0.9}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              )}
              {hitActive && dtHit < 4.2 && (
                <mesh position={[0, 0.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                  <circleGeometry args={[w.blastSize * 1.15, 20]} />
                  <meshBasicMaterial
                    color="#ff621a"
                    transparent
                    opacity={0.55 * Math.max(0, 1 - dtHit / 4.2)}
                    depthWrite={false}
                    toneMapped={false}
                  />
                </mesh>
              )}
            </group>

            <Explosion
              t={t}
              at={w.impactAt}
              pos={[w.targetX, gy + 0.35, w.targetZ]}
              size={w.blastSize}
              seed={w.seed}
              smokeLife={4.4}
              smoke="#443c42"
            />
          </group>
        );
      })}
    </group>
  );
};

/**
 * Loạt đạn dẫn đường tách khỏi khoang vũ khí trước & sau của B-1B kèm vệt sáng mảnh ngắn phía đuôi đạn,
 * lao xiên về phía trước-dưới (+X, -Y, +Z) lệch hẳn trục camera (không bao giờ quét ngang dưới ống kính).
 */
const MunitionsSalvoLayer: React.FC<{ t: number }> = ({ t }) => {
  const munitionMat = useMemo(() => plain('#9aa8b8', 0.34, 0.55), []);
  const finMat = useMemo(() => plain('#515d6b', 0.42, 0.48), []);

  return (
    <group>
      {STRIKE_WAVES.map((w, idx) => {
        if (t < w.releaseAt) return null;
        const flightDur = w.impactAt - w.releaseAt;
        const u = Math.min(1, Math.max(0, (t - w.releaseAt) / flightDur));
        const fadeAfter = t > w.impactAt ? Math.max(0, 1 - (t - w.impactAt) / 0.55) : 1;
        if (fadeAfter <= 0.01) return null;

        // Đạn mang quán tính dọc +X của máy bay siêu thanh khi tách khỏi bụng
        const relState = getB1BState(w.releaseAt);
        const bayLocal = w.bay === 'fwd' ? B1B_FWD_BAY_POS : B1B_AFT_BAY_POS;
        const start: V3 = [
          relState.pos[0] + bayLocal[0] + 14,
          relState.pos[1] + bayLocal[1] - 0.5,
          relState.pos[2] + bayLocal[2] + w.zBayOffset,
        ];
        const end: V3 = [w.targetX, groundWorldY(w.targetX, w.targetZ) + 0.5, w.targetZ];

        // Chỉ vẽ đuôi vệt sáng mảnh bám theo quả đạn (độ dài 42% quỹ đạo) để vệt lao xiên sắc gọn, không cắt lùi qua ống kính
        const uTail = Math.max(0, u - 0.44);
        const segPts: V3[] = [];
        const SEG_N = 18;
        for (let k = 0; k <= SEG_N; k++) {
          const s = lerp(uTail, Math.max(uTail + 0.01, u), k / SEG_N);
          segPts.push(ballistic(Math.min(1, s), start, end, 7.5));
        }

        const curPos = ballistic(u, start, end, 7.5);
        const nextPos = ballistic(Math.min(1, u + 0.025), start, end, 7.5);
        const dir = new THREE.Vector3(
          nextPos[0] - curPos[0],
          nextPos[1] - curPos[1],
          nextPos[2] - curPos[2],
        ).normalize();
        const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir);

        return (
          <group key={idx}>
            {u > 0.015 && (
              <Trail
                points={segPts}
                upto={1}
                color={idx % 2 === 0 ? '#ffd88a' : '#ff9f4d'}
                width={0.16}
                opacity={0.88 * fadeAfter}
                glow
              />
            )}
            {u < 0.995 && (
              <group position={curPos} quaternion={quat} scale={[1.2, 1.2, 1.2]}>
                <mesh geometry={GUIDED_MUNITION_GEO} material={munitionMat} />
                <mesh position={[-0.45, 0, 0]} geometry={MUNITION_FIN_GEO} material={finMat} />
                <mesh position={[-2.1, 0, 0]}>
                  <sphereGeometry args={[0.3, 10, 8]} />
                  <meshBasicMaterial color="#ffecb3" toneMapped={false} />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
};

const S19: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  const b1b = getB1BState(t);

  // Động học chuẩn B-1B Lancer:
  // - Thu càng đáp 0.5 -> 0 ở đầu cảnh (373.8 - 376.8s), 4 động cơ đốt sau rực cháy (0.95)
  // - Khép cánh biến hình từ 0.15 -> 1.0 siêu thanh (383.8 - 386.8s)
  // - Mở khoang vũ khí bụng (bayOpen = 1) trút loạt đạn dẫn đường (386.5 - 391.4s)
  const gear = lerp(0.55, 0, prog(t, 373.8, 376.8));
  const wingSweep = lerp(0.15, 1.0, prog(t, 383.8, 386.8));
  const bayOpen = prog(t, 386.35, 387.15);
  const afterburner = 0.94 + 0.04 * Math.sin(t * 17.5);

  // Camera 3 pha giữ trọn vẹn 100% sải thân 44.5 m trong khung hình (không cắt mũi hay đuôi):
  const p1 = prog(t, 373.8, 383.8);
  const p2 = prog(t, 383.8, 386.85);
  const p3 = prog(t, 386.85, 391.46);

  // Pha 1: 3/4 trước-dưới rộng rãi thấy trọn mũi radome, buồng lái, thu càng, đôi cánh xòe & 4 luồng đốt sau
  const relPos1: V3 = [lerp(36, 25, p1), lerp(-9.5, -6.5, p1), lerp(-34, -35, p1)];
  // Pha 2 & 3: Vòng mượt mở vòng cung ngang (sideArcZ) lên cao bên mạn cánh trái để 100% thân 44.5 m luôn có khoảng thở rộng
  const relPos2: V3 = [-36, 14.5, -32];
  const relPos3: V3 = [-40, 17.0, -30];
  const sideArcZ = -11 * Math.sin(p2 * Math.PI);

  const relLook1: V3 = [lerp(1.5, 0.0, p1), lerp(0.2, 0.6, p1), 0.0];
  const relLook2: V3 = [18, -16, 13];
  const relLook3: V3 = [28, -22, 20];

  const camOffset: V3 = [
    lerp(lerp(relPos1[0], relPos2[0], p2), relPos3[0], p3),
    lerp(lerp(relPos1[1], relPos2[1], p2), relPos3[1], p3),
    lerp(lerp(relPos1[2], relPos2[2], p2), relPos3[2], p3) + sideArcZ,
  ];
  const lookOffset: V3 = [
    lerp(lerp(relLook1[0], relLook2[0], p2), relLook3[0], p3),
    lerp(lerp(relLook1[1], relLook2[1], p2), relLook3[1], p3),
    lerp(lerp(relLook1[2], relLook2[2], p2), relLook3[2], p3),
  ];

  const camPos: V3 = [
    b1b.pos[0] + camOffset[0],
    b1b.pos[1] + camOffset[1],
    b1b.pos[2] + camOffset[2],
  ];
  const camLook: V3 = [
    b1b.pos[0] + lookOffset[0],
    b1b.pos[1] + lookOffset[1],
    b1b.pos[2] + lookOffset[2],
  ];
  const camFov = lerp(lerp(42, 45, p2), 46, p3);
  const camRoll = Math.sin(p2 * Math.PI) * 0.045;

  return (
    <AbsoluteFill>
      <Stage {...STAGE_DUSK_STRIKE} shadowArea={48} shadowCenter={b1b.pos}>
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Hệ đèn key/rim/belly cục bộ (decay=0, cutoff=85m < 110m) điêu khắc sáng rõ từng đường cong thân cổ thiên nga & cánh cụp B-1B
            trên nền hoàng hôn cam-tím, mà giữ mặt đất sa mạc đêm ở y = -110 m tối thẫm để tôn chớp nổ! */}
        <group position={b1b.pos}>
          <pointLight position={[36, 16, -34]} color="#ffe0ba" intensity={5.4} distance={85} decay={0} />
          <pointLight position={[-6, 38, -22]} color="#bed9ff" intensity={3.6} distance={85} decay={0} />
          <pointLight position={[12, -22, -24]} color="#ffba7a" intensity={3.3} distance={78} decay={0} />
        </group>

        {/* Oanh tạc cơ siêu thanh Rockwell B-1B Lancer (dài 44.50 m) */}
        <group position={b1b.pos} rotation={[0, 0, b1b.pitch]}>
          <group rotation={[b1b.bank, 0, 0]}>
            <B1BLancer
              wingSweep={wingSweep}
              afterburner={afterburner}
              gear={gear}
              bayOpen={bayOpen}
            />
          </group>
        </group>

        {/* Địa hình sa mạc đêm rộng lớn 1400 m sâu bên dưới y = -110 m */}
        <group position={[0, GROUND_OFFSET_Y, 0]}>
          <Terrain
            h={NIGHT_DESERT_H}
            size={1400}
            seg={192}
            center={[240, 95]}
            colors={NIGHT_DESERT_COLORS}
            grainRepeat={52}
          />
        </group>

        {/* Loạt đạn dẫn đường tách khỏi khoang bụng & 8 vụ nổ liên hoàn dưới mặt đất */}
        <MunitionsSalvoLayer t={t} />
        <GroundTargetsLayer t={t} />
      </Stage>

      {/* Tối đa 1 Label trên màn hình tại mọi thời điểm */}
      <Label
        t={t}
        text="02/02/2024"
        x={320}
        y={915}
        from={CUE.s19_date}
        until={380.8}
        size={52}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="B-1B LANCER"
        x={350}
        y={915}
        from={CUE.s19_b1b}
        until={385.0}
        size={54}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
      <Label
        t={t}
        text="125 ĐẠN · 85 MỤC TIÊU"
        x={465}
        y={915}
        from={CUE.s19_strike125}
        until={391.0}
        size={50}
        bg={PAL2D.paper}
        fg={PAL2D.ink}
      />
    </AbsoluteFill>
  );
};

export default S19;
