// C01S02 (24.32–38.68 s, 3D): Hành lang Đài chỉ huy Open Conn của Đảo USS Hornet (Trung tá Jimmy Doolittle nhìn xuống 16 B-25)
// → đẩy sát trinh sát viên khựng lại ép ống nhòm (33.02 s) → phóng tele (fov 40 → 23) qua vai lộ rõ tàu tuần tiễu Nitto Maru
// ở 20.000 yards & Hornet bắt đầu nghiêng bẻ lái sang mạn phải (37.64 s).
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Label } from '@skill/military/label';
import { lathe, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { softDot } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { STAGE_PRESETS } from '../design/palette';
import { USSHornet, HORNET_DECK_Y } from '../parts/USSHornet';
import { B25Mitchell } from '../parts/B25Mitchell';
import { NittoMaru } from '../parts/NittoMaru';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';

/** Đổi toạ độ cục bộ gắn với tàu sang hệ toạ độ thế giới (world space) cho <Cam>. */
function shipToWorld(
  local: V3,
  pose: { y: number; pitch: number; roll: number },
  heading = 0,
  shipXZ: [number, number] = [0, 0],
): V3 {
  const v = new THREE.Vector3(local[0], local[1], local[2]);
  v.applyEuler(new THREE.Euler(pose.roll, heading, pose.pitch, 'XYZ'));
  return [v.x + shipXZ[0], v.y + pose.y, v.z + shipXZ[1]];
}

/** Đội hình 16 chiếc B-25B trên sàn đáp USS Hornet (thống nhất tuyệt đối với C01.md & C01S01). */
const DECK_B25_LAYOUT: { id: number; pos: V3; rotY: number; seed: number }[] = [
  { id: 1, pos: [16.0, HORNET_DECK_Y, -1.1], rotY: 0, seed: 18 },
  ...Array.from({ length: 15 }, (_, idx) => {
    const k = idx + 1;
    const isOdd = k % 2 === 1;
    return {
      id: k + 1,
      pos: [1.0 - (k - 1) * 8.5, HORNET_DECK_Y, isOdd ? -6.2 : 5.8] as V3,
      rotY: isOdd ? 0.14 : -0.14,
      seed: 18,
    };
  }),
];

/** Trung tá Jimmy Doolittle (áo khoác da bay A-2 nâu, quần khaki, mũ sĩ quan USAAF) tựa lan can Open Conn nhìn xuống dãy B-25. */
const JimmyDoolittleFigure: React.FC<{
  position: V3;
  rotY: number;
  alertTurn: number;
  t: number;
}> = ({ position, rotY, alertTurn, t }) => {
  const mats = useMemo(
    () => ({
      leatherA2: paint({
        color: '#4e2f1e',
        camo: ['#3d2315', '#613c27'],
        wear: 0.28,
        dirt: 0.16,
        roughness: 0.44,
        metalness: 0.12,
        seed: 18,
      }),
      ribKnit: plain('#382115', 0.84, 0.04),
      khaki: paint({
        color: '#9c8a6b',
        wear: 0.12,
        dirt: 0.08,
        roughness: 0.82,
        metalness: 0.03,
        seed: 19,
      }),
      capKhaki: paint({
        color: '#8e7d5f',
        wear: 0.22,
        dirt: 0.16,
        roughness: 0.72,
        metalness: 0.06,
        seed: 20,
      }),
      capVisor: plain('#2b190f', 0.25, 0.2),
      brassBadge: plain('#dfB44a', 0.26, 0.84),
      silverLeaf: plain('#cfd6dc', 0.3, 0.82),
      skin: plain('#d5a482', 0.64, 0.04),
      shoes: plain('#2c1b12', 0.45, 0.15),
    }),
    [],
  );

  const geos = useMemo(
    () => ({
      // Mũ sĩ quan USAAF kiểu "50-mission crush" mềm ở hai bên vành
      capCrown: lathe(
        [
          [0.098, 0.0],
          [0.102, 0.032],
          [0.128, 0.068],
          [0.115, 0.082],
          [0.055, 0.09],
          [0.005, 0.093],
        ],
        22,
      ),
      collar: pipe(
        [
          [0.05, 0.53, -0.095],
          [-0.055, 0.565, -0.075],
          [-0.075, 0.57, 0],
          [-0.055, 0.565, 0.075],
          [0.05, 0.53, 0.095],
        ],
        0.026,
        16,
      ),
    }),
    [],
  );

  const braceSway = Math.sin(t * 1.45) * 0.02;
  // Khi trinh sát viên hô lớn (alertTurn 0 → 1), Doolittle nhổm dậy & ngoảnh đầu nhanh về phía mũi đài chỉ huy (+Z cục bộ)
  const torsoLean = lerp(0.16, 0.05, alertTurn) + braceSway;
  const headYaw = lerp(0.36, -1.05, alertTurn);
  const headPitch = lerp(0.24, -0.04, alertTurn);

  return (
    <group position={position} rotation={[0, rotY, 0]}>
      {/* Đôi giày da nâu & quần âu sĩ quan khaki (mũi giày hướng về +X phía trước) */}
      {([-0.125, 0.125] as const).map((lz, idx) => (
        <group key={idx} position={[idx === 0 ? -0.015 : 0.015, 0, lz]}>
          <mesh position={[0.045, 0.055, 0]} geometry={rbox(0.25, 0.11, 0.105, 0.03)} material={mats.shoes} castShadow />
          <mesh position={[0, 0.48, 0]} rotation={[0, 0, idx === 0 ? 0.025 : -0.02]} material={mats.khaki} castShadow>
            <cylinderGeometry args={[0.088, 0.076, 0.86, 12]} />
          </mesh>
        </group>
      ))}

      {/* Thân trên mặc áo khoác da bay A-2 USAAF hơi nghiêng tựa về phía lan can (+X) */}
      <group position={[0, 0.89, 0]} rotation={[0, 0, -torsoLean]}>
        {/* Đai thun len gấu áo A-2 */}
        <mesh position={[0, 0.05, 0]} geometry={rbox(0.24, 0.09, 0.36, 0.04)} material={mats.ribKnit} castShadow />
        {/* Thân áo da A-2, khoá kéo đồng chính giữa ngực & 2 túi hộp trước bụng */}
        <mesh position={[0.01, 0.3, 0]} geometry={rbox(0.265, 0.48, 0.41, 0.075)} material={mats.leatherA2} castShadow />
        <mesh position={[0.144, 0.3, 0]} geometry={rbox(0.014, 0.44, 0.018, 0.004)} material={mats.brassBadge} />
        {([-0.108, 0.108] as const).map((pz, idx) => (
          <mesh
            key={`pkt-${idx}`}
            position={[0.138, 0.205, pz]}
            geometry={rbox(0.026, 0.135, 0.115, 0.01)}
            material={mats.leatherA2}
          />
        ))}
        {/* Bảng tên da & cấp hiệu lá sồi bạc Trung tá (Lt. Col.) trên hai cầu vai */}
        <mesh position={[0.142, 0.39, -0.095]} geometry={rbox(0.018, 0.032, 0.085, 0.004)} material={mats.khaki} />
        {([-0.165, 0.165] as const).map((sz, idx) => (
          <group key={`ep-${idx}`} position={[0.01, 0.535, sz]}>
            <mesh geometry={rbox(0.11, 0.02, 0.075, 0.008)} material={mats.leatherA2} />
            <mesh position={[0, 0.014, 0]} geometry={rbox(0.036, 0.012, 0.036, 0.005)} material={mats.silverLeaf} />
          </group>
        ))}
        {/* Cổ sơ-mi khaki bên trong & cổ bẻ áo da A-2 */}
        <mesh position={[0.04, 0.52, 0]} material={mats.khaki}>
          <cylinderGeometry args={[0.068, 0.076, 0.09, 12]} />
        </mesh>
        <mesh geometry={geos.collar} material={mats.leatherA2} castShadow />

        {/* Hai cánh tay đưa ra PHÍA TRƯỚC (+X, góc xoay Z dương cho vector -Y) nắm gờ trên lan can thép (y ≈ 32.48 m) */}
        {([-1, 1] as const).map((s) => (
          <group key={`arm-${s}`} position={[0.04, 0.46, s * 0.215]}>
            {/* Bắp tay trên hướng xuống -Y xoay dương quanh Z để vươn ra trước +X */}
            <group rotation={[s * 0.05, -s * 0.1, lerp(0.56, 0.38, alertTurn)]}>
              <mesh position={[0, -0.145, 0]} material={mats.leatherA2} castShadow>
                <cylinderGeometry args={[0.061, 0.053, 0.3, 12]} />
              </mesh>
              {/* Khuỷu tay & cẳng tay đặt bàn tay đúng lên gờ lan can thép chắn mảnh đạn */}
              <group position={[0, -0.285, 0]} rotation={[-s * 0.06, s * 0.14, lerp(0.34, 0.28, alertTurn)]}>
                <mesh position={[0, -0.125, 0]} material={mats.leatherA2} castShadow>
                  <cylinderGeometry args={[0.051, 0.043, 0.25, 12]} />
                </mesh>
                <mesh position={[0, -0.245, 0]} material={mats.ribKnit}>
                  <cylinderGeometry args={[0.043, 0.041, 0.042, 10]} />
                </mesh>
                <mesh position={[0.025, -0.285, 0]} geometry={rbox(0.092, 0.058, 0.078, 0.022)} material={mats.skin} castShadow />
              </group>
            </group>
          </group>
        ))}

        {/* Cổ, gương mặt nghiêng 3/4 rõ sống mũi - cằm - tai & mũ sĩ quan USAAF */}
        <group position={[0.03, 0.61, 0]} rotation={[0, headYaw, -headPitch]}>
          <mesh position={[0, -0.03, 0]} material={mats.skin}>
            <cylinderGeometry args={[0.056, 0.062, 0.08, 12]} />
          </mesh>
          <mesh position={[0.01, 0.055, 0]} scale={[1.06, 1.12, 0.96]} material={mats.skin} castShadow>
            <sphereGeometry args={[0.102, 18, 14]} />
          </mesh>
          {/* Sống mũi, gò mày, cằm & vành tai giúp góc máy 3/4 sắc nét */}
          <mesh position={[0.112, 0.048, 0]} rotation={[0, 0, -0.2]} geometry={rbox(0.036, 0.044, 0.026, 0.009)} material={mats.skin} />
          <mesh position={[0.092, 0.002, 0]} geometry={rbox(0.045, 0.034, 0.058, 0.014)} material={mats.skin} />
          {([-0.096, 0.096] as const).map((ez, idx) => (
            <mesh key={`ear-${idx}`} position={[0.005, 0.05, ez]} geometry={rbox(0.024, 0.042, 0.016, 0.007)} material={mats.skin} />
          ))}

          {/* Mũ sĩ quan USAAF "50-mission crush": đai nâu sẫm, lưỡi trai da bóng, phù hiệu đại bàng vàng & chóp khaki */}
          <group position={[0.005, 0.1, 0]} rotation={[0, 0, -0.07]}>
            <mesh rotation={[0, 0, Math.PI / 2]} geometry={geos.capCrown} material={mats.capKhaki} castShadow />
            <mesh position={[0, 0.014, 0]} material={mats.capVisor}>
              <cylinderGeometry args={[0.101, 0.1, 0.032, 20]} />
            </mesh>
            {/* Lưỡi trai cong phía trước (+X) */}
            <mesh
              position={[0.098, 0.002, 0]}
              rotation={[0, 0, -0.26]}
              scale={[1.0, 0.18, 1.15]}
              material={mats.capVisor}
              castShadow
            >
              <cylinderGeometry args={[0.075, 0.082, 0.04, 16]} />
            </mesh>
            {/* Quân hiệu đại bàng đồng vàng trước trán mũ */}
            <mesh position={[0.106, 0.045, 0]} geometry={rbox(0.018, 0.042, 0.048, 0.006)} material={mats.brassBadge} />
          </group>
        </group>
      </group>
    </group>
  );
};

/** Trinh sát viên Hải quân Mỹ mặc áo mưa vải dầu sẫm & mũ chắn bão Sou'wester, giật khựng ép ống nhòm 7×50 tại 33.02 s. */
const NavyLookoutFigure: React.FC<{
  position: V3;
  baseRotY: number;
  freezeProg: number;
  t: number;
}> = ({ position, baseRotY, freezeProg, t }) => {
  const mats = useMemo(
    () => ({
      // Áo mưa vải dầu Hải quân (wet dark navy-slate foul-weather oilcloth) lì tự nhiên, không loá nhựa
      oilskin: paint({
        color: '#24303c',
        wear: 0.18,
        dirt: 0.14,
        roughness: 0.62,
        metalness: 0.06,
        seed: 51,
      }),
      oilskinHat: paint({
        color: '#263340',
        wear: 0.16,
        dirt: 0.14,
        roughness: 0.56,
        metalness: 0.07,
        seed: 52,
      }),
      corduroyCollar: plain('#151a20', 0.78, 0.06),
      gloves: plain('#1d2024', 0.64, 0.1),
      skin: plain('#cfa07d', 0.62, 0.04),
      binocBody: plain('#181c20', 0.38, 0.54),
      binocBrass: plain('#5a626a', 0.32, 0.72),
      binocLens: plain('#5f93b2', 0.1, 0.82),
      strapLeather: plain('#352116', 0.72, 0.08),
    }),
    [],
  );

  const geos = useMemo(
    () => ({
      // Mũ mưa Hải quân Sou'wester vành rộng dốc nước phía sau gáy
      hat: lathe(
        [
          [0.178, -0.02],
          [0.146, 0.012],
          [0.112, 0.032],
          [0.106, 0.082],
          [0.072, 0.118],
          [0.01, 0.128],
        ],
        22,
      ),
      // Áo choàng vai dốc tròn trùm kín bả vai (sloped storm cape) không lộ khớp tay phía sau
      cape: lathe(
        [
          [0.225, 0.0],
          [0.214, 0.055],
          [0.18, 0.125],
          [0.118, 0.175],
          [0.09, 0.192],
        ],
        22,
      ),
      leftArm: pipe(
        [
          [0.05, 0.415, -0.158],
          [0.165, 0.38, -0.15],
          [0.242, 0.37, -0.134],
          [0.23, 0.535, -0.096],
          [0.205, 0.672, -0.062],
        ],
        0.048,
        14,
      ),
      rightArm: pipe(
        [
          [0.05, 0.415, 0.158],
          [0.165, 0.38, 0.15],
          [0.242, 0.37, 0.134],
          [0.23, 0.535, 0.096],
          [0.205, 0.672, 0.062],
        ],
        0.048,
        14,
      ),
      neckStrap: pipe(
        [
          [0.185, 0.68, -0.045],
          [0.075, 0.56, -0.085],
          [-0.045, 0.57, 0],
          [0.075, 0.56, 0.085],
          [0.185, 0.68, 0.045],
        ],
        0.008,
        14,
      ),
    }),
    [],
  );

  // Trước 33.02 s: trinh sát viên lia ống nhòm quét chân trời; đúng tại freezes@33.02: khựng cứng khóa chết vào Nitto Maru!
  const scanSweep = Math.sin(t * 1.25 - 0.6) * 0.15 * (1 - freezeProg);
  const joltImpulse = Math.sin(prog(t, CUE.c01_s02_freezes - 0.08, CUE.c01_s02_freezes + 0.34) * Math.PI);
  const forwardHunch = lerp(0.09, 0.19, freezeProg) + joltImpulse * 0.048;

  return (
    <group position={position} rotation={[0, baseRotY + scanSweep, 0]}>
      {/* Hai chân ủng cao su chống sóng */}
      {([-0.13, 0.13] as const).map((lz, idx) => (
        <group key={idx} position={[0, 0, lz]}>
          <mesh position={[0.035, 0.06, 0]} geometry={rbox(0.25, 0.12, 0.115, 0.03)} material={mats.gloves} castShadow />
          <mesh position={[0, 0.46, 0]} material={mats.oilskin} castShadow>
            <cylinderGeometry args={[0.095, 0.085, 0.82, 12]} />
          </mesh>
        </group>
      ))}

      {/* Vạt dưới áo choàng mưa dài tới gối */}
      <mesh position={[-0.01, 0.72, 0]} material={mats.oilskin} castShadow>
        <cylinderGeometry args={[0.19, 0.242, 0.46, 16]} />
      </mesh>

      {/* Thân trên mặc áo mưa dầu có choàng vai dốc nước, khựng chúi về trước khi phát hiện tàu lạ */}
      <group position={[0, 0.89, 0]} rotation={[0, 0, -forwardHunch]}>
        <mesh position={[0.01, 0.28, 0]} geometry={rbox(0.255, 0.5, 0.39, 0.085)} material={mats.oilskin} castShadow />
        {/* Áo choàng vai dốc tròn trùm mượt qua hai vai & lưng (local Y = chiều trước-sau, local Z = bề rộng vai) */}
        <mesh
          position={[0.01, 0.362, 0]}
          rotation={[0, 0, Math.PI / 2]}
          scale={[1.0, 0.84, 1.18]}
          geometry={geos.cape}
          material={mats.oilskin}
          castShadow
        />
        <mesh position={[0.02, 0.555, 0]} material={mats.corduroyCollar} castShadow>
          <cylinderGeometry args={[0.086, 0.102, 0.095, 14]} />
        </mesh>
        <mesh geometry={geos.neckStrap} material={mats.strapLeather} />

        {/* Hai ống tay áo mưa gập khuỷu tự nhiên liền khối & đôi găng tay nắm chặt hai thân ống nhòm */}
        <mesh geometry={geos.leftArm} material={mats.oilskin} castShadow />
        <mesh geometry={geos.rightArm} material={mats.oilskin} castShadow />
        {([-1, 1] as const).map((s) => (
          <mesh
            key={`glv-${s}`}
            position={[0.205, 0.685, s * 0.062]}
            rotation={[0, s * 0.16, 0.18]}
            geometry={rbox(0.082, 0.058, 0.056, 0.02)}
            material={mats.gloves}
            castShadow
          />
        ))}

        {/* Đầu + gương mặt dưới vành mũ mưa Sou'wester + Ống nhòm Hải quân Bausch & Lomb 7×50 ép sát mắt */}
        <group position={[0.04, 0.65, 0]} rotation={[0, 0, 0.08]}>
          <mesh position={[0.01, 0.048, 0]} scale={[1.05, 1.1, 0.96]} material={mats.skin} castShadow>
            <sphereGeometry args={[0.1, 16, 14]} />
          </mesh>
          {/* Sống mũi, cằm & tai lộ dưới vành mũ mưa */}
          <mesh position={[0.108, 0.036, 0]} rotation={[0, 0, -0.18]} geometry={rbox(0.034, 0.04, 0.025, 0.008)} material={mats.skin} />
          <mesh position={[0.088, -0.006, 0]} geometry={rbox(0.044, 0.034, 0.056, 0.014)} material={mats.skin} />
          {([-0.094, 0.094] as const).map((ez, idx) => (
            <mesh key={`lear-${idx}`} position={[0.004, 0.044, ez]} geometry={rbox(0.022, 0.04, 0.015, 0.006)} material={mats.skin} />
          ))}

          {/* Mũ mưa Sou'wester hơi nghiêng chắn nước gáy */}
          <mesh
            position={[-0.015, 0.095, 0]}
            rotation={[0, 0, Math.PI / 2 + 0.17]}
            geometry={geos.hat}
            material={mats.oilskinHat}
            castShadow
          />

          {/* Cụm ống nhòm Hải quân 7×50 (2 thân lăng kính Porro + bản lề giữa + thấu kính phản quang xanh) */}
          <group position={[0.165, 0.045, 0]}>
            <mesh position={[-0.02, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.binocBrass}>
              <cylinderGeometry args={[0.012, 0.012, 0.11, 10]} />
            </mesh>
            {([-0.044, 0.044] as const).map((bz, idx) => (
              <group key={idx} position={[0, 0, bz]}>
                <mesh position={[-0.062, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.binocBody}>
                  <cylinderGeometry args={[0.018, 0.02, 0.045, 12]} />
                </mesh>
                <mesh position={[-0.014, -0.006, 0]} geometry={rbox(0.076, 0.056, 0.048, 0.012)} material={mats.binocBody} castShadow />
                <mesh position={[0.068, -0.008, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.binocBody} castShadow>
                  <cylinderGeometry args={[0.032, 0.024, 0.115, 14]} />
                </mesh>
                <mesh position={[0.126, -0.008, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.binocLens}>
                  <cylinderGeometry args={[0.027, 0.027, 0.006, 14]} />
                </mesh>
              </group>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
};

/** Thiết bị hàng hải trên mũi Đài chỉ huy lộ thiên Open Conn (la bàn ngắm Pelorus & ống truyền lệnh đồng). */
const OpenConnBridgeFittings: React.FC = () => {
  const mats = useMemo(
    () => ({
      pedestalGrey: plain('#4b5d70', 0.56, 0.38),
      brass: plain('#b59044', 0.32, 0.78),
      darkMetal: plain('#212830', 0.5, 0.55),
      dialFace: plain('#d8dfe4', 0.4, 0.15),
    }),
    [],
  );

  const voiceTubeGeo = useMemo(
    () =>
      pipe(
        [
          [43.16, 31.65, 12.46],
          [43.16, 32.38, 12.46],
          [43.0, 32.62, 12.46],
        ],
        0.032,
        12,
      ),
    [],
  );

  return (
    <group>
      {/* Bệ la bàn ngắm phương vị Pelorus ở góc mũi trái Open Conn */}
      <group position={[42.68, 31.65, 12.78]}>
        <mesh position={[0, 0.52, 0]} material={mats.pedestalGrey} castShadow>
          <cylinderGeometry args={[0.12, 0.17, 1.04, 14]} />
        </mesh>
        <mesh position={[0, 1.08, 0]} material={mats.brass} castShadow>
          <cylinderGeometry args={[0.16, 0.14, 0.12, 16]} />
        </mesh>
        <mesh position={[0, 1.145, 0]} material={mats.dialFace}>
          <cylinderGeometry args={[0.135, 0.135, 0.015, 16]} />
        </mesh>
        <mesh position={[0, 1.17, 0]} rotation={[0, -0.12, 0]} geometry={rbox(0.28, 0.03, 0.022, 0.004)} material={mats.darkMetal} />
      </group>

      {/* Ống đồng truyền lệnh xuống Buồng lái (Voice Tube) & hộp đựng ống nhòm gắn thành chắn mũi */}
      <mesh geometry={voiceTubeGeo} material={mats.brass} castShadow />
      <mesh
        position={[42.94, 32.63, 12.46]}
        rotation={[0, 0, Math.PI / 2 + 0.4]}
        material={mats.brass}
      >
        <cylinderGeometry args={[0.058, 0.032, 0.11, 12]} />
      </mesh>
      <mesh position={[43.25, 32.18, 15.55]} geometry={rbox(0.18, 0.24, 0.28, 0.02)} material={mats.pedestalGrey} castShadow />
    </group>
  );
};

/** Bụi mưa & sương muối quật ngang qua ngoài rìa Đài chỉ huy Open Conn (giữ khoảng cách >= 5 m khỏi ống kính tele). */
const BridgeSprayAndRain: React.FC<{ t: number; teleFade: number }> = ({ t, teleFade }) => {
  const tex = useMemo(() => softDot(), []);
  const opacityScale = lerp(1.0, 0.48, teleFade);

  const rainMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#d4e4ef',
        transparent: true,
        opacity: 0.17,
        depthWrite: false,
      }),
    [],
  );

  const drops = useMemo(
    () =>
      Array.from({ length: 68 }, (_, i) => {
        // Chia 3 vùng ngoài hành lang máy quay: (0) xa phía trước mũi x >= 49 m, (1) ngoài sàn bay mạn trái z <= 8.6 m, (2) ngoài biển mạn phải z >= 18.2 m
        const zone = i % 3;
        if (zone === 0) {
          return {
            x0: 53.0 + rnd(i * 3 + 1) * 16.0,
            y0: 29.0 + rnd(i * 3 + 2) * 9.0,
            z0: 9.0 + rnd(i * 3 + 3) * 12.5,
            len: 0.8 + rnd(i * 7 + 5) * 0.85,
            phase: rnd(i * 11 + 9),
          };
        }
        if (zone === 1) {
          return {
            x0: 22.0 + rnd(i * 3 + 1) * 18.0,
            y0: 25.5 + rnd(i * 3 + 2) * 8.5,
            z0: 1.0 + rnd(i * 3 + 3) * 7.4,
            len: 0.9 + rnd(i * 7 + 5) * 0.95,
            phase: rnd(i * 11 + 9),
          };
        }
        return {
          x0: 41.0 + rnd(i * 3 + 1) * 11.0,
          y0: 29.5 + rnd(i * 3 + 2) * 7.5,
          z0: 18.6 + rnd(i * 3 + 3) * 7.5,
          len: 0.85 + rnd(i * 7 + 5) * 0.9,
          phase: rnd(i * 11 + 9),
        };
      }),
    [],
  );

  const sprayPuffs = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        zOff: i % 2 === 0 ? 3.5 + rnd(i * 5 + 2) * 5.0 : 18.5 + rnd(i * 5 + 2) * 5.5,
        yOff: 28.5 + rnd(i * 5 + 3) * 5.2,
        speed: 0.52 + rnd(i * 5 + 4) * 0.32,
        phase: rnd(i * 13 + 7),
        size: 2.4 + rnd(i * 17 + 1) * 2.4,
      })),
    [],
  );

  return (
    <group>
      {drops.map((d, idx) => {
        const p = (t * 3.2 + d.phase) % 1;
        const x = d.x0 - p * 3.8;
        const y = d.y0 - p * 5.8;
        const z = d.z0 - p * 0.6;
        return (
          <mesh key={`r-${idx}`} position={[x, y, z]} rotation={[0.12, 0, -0.78]} material={rainMat}>
            <boxGeometry args={[0.009, d.len, 0.009]} />
          </mesh>
        );
      })}
      {sprayPuffs.map((sp, idx) => {
        const p = (t * sp.speed + sp.phase) % 1;
        const x = lerp(49, 26, p);
        const arc = Math.sin(p * Math.PI);
        return (
          <sprite key={`s-${idx}`} position={[x, sp.yOff + arc * 0.8, sp.zOff]} scale={[sp.size * 1.5, sp.size * 0.85, 1]}>
            <spriteMaterial
              map={tex}
              color="#dceaf2"
              transparent
              opacity={0.13 * arc * opacityScale}
              depthWrite={false}
            />
          </sprite>
        );
      })}
    </group>
  );
};

/** Bọt sóng trắng xung quanh chân thân tàu tuần tiễu Nitto Maru ở chân trời giúp tách bạch rõ bóng tàu xám sẫm. */
const HorizonTargetWake: React.FC<{ pos: V3; t: number }> = ({ pos, t }) => {
  const tex = useMemo(() => softDot(), []);
  return (
    <group position={pos}>
      {[-12, -5, 2, 9, 15].map((ox, i) => {
        const pulse = 0.75 + 0.25 * Math.sin(t * 2.6 + i * 1.4);
        const sz = (5.2 + (i % 3) * 1.8) * pulse;
        return (
          <sprite key={i} position={[ox * 0.55, 0.4, (i - 2) * 1.8]} scale={[sz * 1.7, sz * 0.55, 1]}>
            <spriteMaterial map={tex} color="#e7f3f9" transparent opacity={0.44 * pulse} depthWrite={false} />
          </sprite>
        );
      })}
    </group>
  );
};

const C01S02: React.FC = () => {
  const t = useT();

  // Tại "Turn to starboard!" (37.64 s), tàu sân bay USS Hornet bắt đầu nghiêng và lượn mũi sang mạn phải (+Z)
  const turnStarboard = prog(t, CUE.c01_s02_starboard, 38.68);
  const hornetHeading = -0.046 * turnStarboard;
  const rawHornetPose = shipPose(0, 0, 251.4, 35.0, t, 4.2, hornetHeading);
  const hornetPose = {
    y: rawHornetPose.y,
    pitch: rawHornetPose.pitch,
    roll: rawHornetPose.roll + 0.038 * turnStarboard,
  };

  // Tàu tuần tiễu Nhật No. 23 Nitto Maru nhấp nhô dữ dội ở chân trời hướng mũi phải (~240 m trước đài chỉ huy)
  const nittoXZ: [number, number] = [282, 35.5];
  const nittoHeading = 1.08; // chếch ngang 3/4 phô bày rõ biên dạng buồng lái & 2 cột ăng-ten cao 13 m
  const nittoPose = shipPose(nittoXZ[0], nittoXZ[1], 30.0, 5.8, t, 4.2, nittoHeading);
  const nittoY = Math.max(nittoPose.y + 0.65, waveY(nittoXZ[0], nittoXZ[1], t, 4.2) + 0.35);

  // Tiến độ diễn xuất nhân vật theo đúng từng từ trong voice
  const pFreeze = prog(t, CUE.c01_s02_freezes - 0.18, CUE.c01_s02_freezes + 0.14);
  const pAlertDoolittle = prog(t, CUE.c01_s02_freezes + 0.15, CUE.c01_s02_binoculars + 0.35);

  // ---------------- Quỹ đạo Camera 3 nhịp liền mạch trên Đài chỉ huy Open Conn (floor y = 31.65 m) ----------------
  // Nhịp 1 (24.32–30.80 s): Góc 3/4 phía trước-ngoài lan can trái Open Conn (tránh sạch 100% khối Mk 37),
  // thu trọn Trung tá Jimmy Doolittle bên trái khung hình & toàn bộ 16 chiếc B-25B trải dài khắp sàn đáp bên dưới!
  const pBeat1 = prog(t, 24.32, 30.8);
  const beat1LocalPos: V3 = [
    lerp(39.85, 40.55, pBeat1),
    lerp(33.32, 33.3, pBeat1),
    lerp(11.62, 11.82, pBeat1),
  ];
  const beat1LocalLook: V3 = [
    lerp(6.0, 3.5, pBeat1),
    lerp(22.9, 22.45, pBeat1),
    lerp(3.8, 2.8, pBeat1),
  ];

  // Nhịp 2 (30.85–34.45 s): Lướt vòng qua mạn trái mũi Open Conn tới cận cảnh 3/4 trước-nghiêng trinh sát viên
  // đúng lúc anh ta khựng cứng ghì chặt ống nhòm 7×50 (33.02 s, giữ Nitto Maru ngoài khung tới mốc 34.84 s)
  const pToLookout = prog(t, 30.85, 32.72);
  const beat2LocalPos: V3 = [43.16, 33.18, 13.48];
  const beat2LocalLook: V3 = [42.98, 33.08, 14.88];

  const preTeleLocalPos: V3 = [
    lerp(beat1LocalPos[0], beat2LocalPos[0], Math.pow(pToLookout, 0.72)),
    lerp(beat1LocalPos[1], beat2LocalPos[1], pToLookout),
    lerp(beat1LocalPos[2], beat2LocalPos[2], Math.pow(pToLookout, 1.25)),
  ];
  const preTeleLocalLook: V3 = [
    lerp(beat1LocalLook[0], beat2LocalLook[0], pToLookout),
    lerp(beat1LocalLook[1], beat2LocalLook[1], pToLookout),
    lerp(beat1LocalLook[2], beat2LocalLook[2], pToLookout),
  ];

  // Nhịp 3 (34.48–38.68 s): Vòng mượt ra sau vai trái trinh sát viên & thu hẹp tiêu cự tele (fov 40 → 22.5)
  // tại "Surface vessel ahead! 20,000 yards!" khoá thẳng vào Nitto Maru nhấp nhô ở chân trời
  const pToTele = prog(t, 34.48, 35.85);
  const telePush = prog(t, 35.85, 38.68);
  const beat3LocalPos: V3 = [
    lerp(41.44, 41.58, telePush),
    lerp(33.34, 33.33, telePush),
    lerp(14.23, 14.26, telePush),
  ];

  const finalLocalPos: V3 = [
    lerp(preTeleLocalPos[0], beat3LocalPos[0], pToTele),
    lerp(preTeleLocalPos[1], beat3LocalPos[1], pToTele),
    lerp(preTeleLocalPos[2], beat3LocalPos[2], pToTele),
  ];

  // Chuyển sang toạ độ thế giới để <Cam> luôn bám khít sàn Đài chỉ huy Open Conn khi Hornet nhấp nhô & bẻ lái
  const camPos = shipToWorld(finalLocalPos, hornetPose, hornetHeading);
  const preTeleWorldLook = shipToWorld(preTeleLocalLook, hornetPose, hornetHeading);

  // Điểm ngắm tele khoá vào Nitto Maru (dịch nhẹ sang phải 2.5 m để Nitto Maru nằm gọn trung tâm-trái, vai trinh sát viên giữ mép phải)
  const nittoTeleWorldLook: V3 = [nittoXZ[0], nittoY + 3.7, nittoXZ[1] + 2.5];
  const camLook: V3 = [
    lerp(preTeleWorldLook[0], nittoTeleWorldLook[0], pToTele),
    lerp(preTeleWorldLook[1], nittoTeleWorldLook[1], pToTele),
    lerp(preTeleWorldLook[2], nittoTeleWorldLook[2], pToTele),
  ];

  const camFov = lerp(40, 22.5, pToTele);
  const camRoll = hornetPose.roll * lerp(0.55, 0.35, pToTele);

  // Nới nhẹ sương mù khi phóng ống nhòm tele để bóng tàu Nitto Maru hiện lên sắc nét giữa mưa bão
  const fogNear = lerp(95, 142, pToTele);
  const fogFar = lerp(480, 620, pToTele);

  // Bóng đổ siêu nét trên Đài chỉ huy Open Conn & sàn máy bay phía trước
  const shadowCenter = shipToWorld([36, 28, 10], hornetPose, hornetHeading);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage
        {...STAGE_PRESETS.stormDawn}
        fog={[fogNear, fogFar]}
        shadowArea={42}
        shadowCenter={shadowCenter}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {/* Mặt biển bão 30 ft mở rộng tới tận sau đường chân trời của Nitto Maru */}
        <OceanSurface t={t} swell={4.2} size={1200} seg={132} center={[140, 10]} palette="stormPacific" />

        {/* Toàn bộ USS Hornet + 16 B-25B + Doolittle + Trinh sát viên gắn đồng bộ trên cùng nhóm shipPose & hướng bẻ lái */}
        <group
          position={[0, hornetPose.y, 0]}
          rotation={[hornetPose.roll, hornetHeading, hornetPose.pitch]}
        >
          <USSHornet hullNumber="8" showLaunchLines flagWave={t * 5.4} aaYaw={0.18} />

          {DECK_B25_LAYOUT.map((b) => (
            <group key={b.id} position={b.pos} rotation={[0, b.rotY, 0]}>
              <B25Mitchell
                gear={1}
                chained
                broomsticks
                lowerTurret={false}
                propSpin={b.id * 0.68 + Math.sin(t * 0.85 + b.id * 1.3) * 0.035}
                seed={b.seed}
              />
            </group>
          ))}

          {/* Thiết bị hàng hải trên mũi Đài lộ thiên Open Conn (y = 31.65 m) */}
          <OpenConnBridgeFittings />

          {/* Trung tá Jimmy Doolittle đứng tựa hai tay lên lan can trái Open Conn (z = 11.75) nhìn xuống 16 chiếc B-25B */}
          <JimmyDoolittleFigure
            position={[36.85, 31.65, 12.16]}
            rotY={1.48}
            alertTurn={pAlertDoolittle}
            t={t}
          />

          {/* Trinh sát viên Hải quân mặc áo mưa dầu ở mũi phải Open Conn khựng lại ép ống nhòm */}
          <NavyLookoutFigure
            position={[42.98, 31.65, 14.82]}
            baseRotY={-0.115}
            freezeProg={pFreeze}
            t={t}
          />

          {/* Mưa bão & bụi sóng tạt ngang qua ngoài rìa Đài chỉ huy */}
          <BridgeSprayAndRain t={t} teleFade={pToTele} />
        </group>

        {/* Bóng tàu tuần tiễu vũ trang Nhật No. 23 Nitto Maru nhấp nhô trên cồn sóng chân trời */}
        <HorizonTargetWake pos={[nittoXZ[0], nittoY, nittoXZ[1]]} t={t} />
        <group
          position={[nittoXZ[0], nittoY, nittoXZ[1]]}
          rotation={[nittoPose.roll * 1.15, nittoHeading, nittoPose.pitch * 1.15]}
          scale={1.08}
        >
          <NittoMaru damage={0} wheelhouseGlow={false} />
        </group>
      </Stage>

      {/* Duy nhất 1 nhãn cự ly phát hiện mục tiêu theo đúng quy chuẩn Label */}
      <Label
        t={t}
        text="20,000 YARDS"
        x={1470}
        y={165}
        from={CUE.c01_s02_yards}
        until={38.45}
      />
    </div>
  );
};

export default C01S02;
