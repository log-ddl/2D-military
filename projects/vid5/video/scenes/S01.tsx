import React from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { Label, useT } from '@kit/motion';
import { lerp, prog } from '@kit/theme';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { paint, plain } from '@lib/3d/materials';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { CUE } from '../cues';
import { P, STAGE_DAWN_TARMAC } from '../local/palette';
import { F15EX, F35A } from '../local/models';

// Địa hình sân bay quân sự USAF: bãi đường băng phẳng lớn y = 0 ở trung tâm, bao quanh bởi dải đồi xa mờ sương bình minh
const AIRBASE_H = heightField({
  seed: 101,
  amp: 5.5,
  scale: 150,
  flats: [
    [0, 0, 125, 0],
    [-115, 0, 95, 0],
    [115, 0, 95, 0],
  ],
  add: (x, z) => {
    const distZ = Math.max(0, Math.abs(z) - 85);
    const hillRidge = 24 * Math.exp(-(((z + 185) / 72) ** 2)) + 19 * Math.exp(-(((z - 195) / 80) ** 2));
    const backRange = x < -145 ? 28 * Math.exp(-(((x + 260) / 95) ** 2)) : 0;
    return hillRidge + backRange + Math.min(18, (distZ / 120) ** 2 * 10);
  },
});

const avoidAirfield = (x: number, z: number) =>
  (Math.abs(z) < 48 && Math.abs(x) < 195) || (x < -70 && x > -158 && z < -18 && z > -92);

const DAWN_GRASS = {
  low: '#2a3c2f',
  high: '#4c6143',
  rock: '#575652',
  dry: '#766b52',
};

// Vật liệu đường băng nhựa đường / bê tông ướt sương sớm
const matAsphalt = () =>
  paint({
    color: '#252b34',
    camo: ['#2e3540', '#1d222a'],
    camoScale: 1.5,
    wear: 0.16,
    dirt: 0.22,
    roughness: 0.34,
    metalness: 0.16,
    repeat: 22,
    seed: 42,
  });

const matWetSheen = () => plain('#222935', 0.28, 0.22);
const matShoulder = () =>
  paint({
    color: '#464d57',
    camo: ['#525a66', '#3b414a'],
    camoScale: 1.8,
    wear: 0.2,
    dirt: 0.25,
    roughness: 0.56,
    metalness: 0.1,
    repeat: 16,
    seed: 19,
  });

const matWhiteMark = () => plain('#e2e8f0', 0.52, 0.06);
const matYellowMark = () => plain('#eab034', 0.48, 0.08);
const matLightFixture = () => plain('#1c222b', 0.5, 0.55);
const matAmberBulb = () =>
  new THREE.MeshStandardMaterial({
    color: '#ffcf70',
    emissive: '#ff9d24',
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
const matGreenBulb = () =>
  new THREE.MeshStandardMaterial({
    color: '#8affc1',
    emissive: '#2ce68b',
    emissiveIntensity: 2.1,
    roughness: 0.2,
  });
const matRedBeacon = () =>
  new THREE.MeshStandardMaterial({
    color: '#ff6b78',
    emissive: '#ff2942',
    emissiveIntensity: 3.2,
    roughness: 0.2,
  });
const matHangar = () => plain('#323c4a', 0.65, 0.35);
const matHangarRoof = () => plain('#465366', 0.52, 0.42);
const matTowerGlass = () => plain('#7ec4e6', 0.18, 0.75);

const CENTER_DASHES = Array.from({ length: 28 }, (_, i) => -130 + i * 9.5);
const PIANO_KEYS = [-14.2, -11.6, -9.0, -6.4, -3.8, 3.8, 6.4, 9.0, 11.6, 14.2];
const EDGE_LIGHT_X = Array.from({ length: 21 }, (_, i) => -135 + i * 13.5);
const THRESH_LIGHT_Z = [-15.6, -12.4, -9.2, -6.0, -2.8, 2.8, 6.0, 9.2, 12.4, 15.6];

const RunwayAndBase: React.FC = () => {
  const asphalt = matAsphalt();
  const wet = matWetSheen();
  const shoulder = matShoulder();
  const whiteM = matWhiteMark();
  const yellowM = matYellowMark();
  const fixture = matLightFixture();
  const amberBulb = matAmberBulb();
  const greenBulb = matGreenBulb();
  const redBeacon = matRedBeacon();
  const hangarWall = matHangar();
  const hangarRoof = matHangarRoof();
  const towerGlass = matTowerGlass();

  return (
    <group>
      {/* Lề bê tông hai bên đường băng */}
      <mesh position={[0, 0.008, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shoulder} receiveShadow>
        <planeGeometry args={[420, 44]} />
      </mesh>

      {/* Mặt đường băng nhựa đường chính rộng 37m */}
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]} material={asphalt} receiveShadow>
        <planeGeometry args={[420, 37]} />
      </mesh>

      {/* Các vệt ẩm sương sớm phản chiếu ánh bình minh nhẹ */}
      <mesh position={[5, 0.017, 6.2]} rotation={[-Math.PI / 2, 0, 0]} material={wet} receiveShadow>
        <planeGeometry args={[46, 11.5]} />
      </mesh>
      <mesh position={[4, 0.017, -6.8]} rotation={[-Math.PI / 2, 0, 0]} material={wet} receiveShadow>
        <planeGeometry args={[52, 13]} />
      </mesh>

      {/* Vạch biên trắng dọc hai mép đường băng */}
      {[-17.1, 17.1].map((z) => (
        <mesh key={z} position={[0, 0.021, z]} rotation={[-Math.PI / 2, 0, 0]} material={whiteM} receiveShadow>
          <planeGeometry args={[380, 0.48]} />
        </mesh>
      ))}

      {/* Vạch đứt trắng trục tâm đường băng (chia đôi F-35A và F-15EX) */}
      {CENTER_DASHES.map((x) => (
        <mesh key={x} position={[x, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]} material={whiteM} receiveShadow>
          <planeGeometry args={[5.2, 0.56]} />
        </mesh>
      ))}

      {/* Vạch vàng dừng chờ (Hold-short) phía trước mũi hai tiêm kích */}
      <mesh position={[12.6, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]} material={yellowM} receiveShadow>
        <planeGeometry args={[0.28, 33.4]} />
      </mesh>
      <mesh position={[13.15, 0.022, 0]} rotation={[-Math.PI / 2, 0, 0]} material={yellowM} receiveShadow>
        <planeGeometry args={[0.28, 33.4]} />
      </mesh>

      {/* Dải vạch ngưỡng đường băng (Piano keys) phía trước */}
      {PIANO_KEYS.map((z) => (
        <mesh key={z} position={[22.5, 0.022, z]} rotation={[-Math.PI / 2, 0, 0]} material={whiteM} receiveShadow>
          <planeGeometry args={[8.5, 1.15]} />
        </mesh>
      ))}

      {/* Khối điểm chạm bánh phía sau */}
      {[-9.5, 9.5].map((z) => (
        <mesh key={z} position={[-34, 0.021, z]} rotation={[-Math.PI / 2, 0, 0]} material={whiteM} receiveShadow>
          <planeGeometry args={[15, 2.6]} />
        </mesh>
      ))}

      {/* Dãy đèn lề đường băng hổ phách hai bên */}
      {EDGE_LIGHT_X.map((x) =>
        [-18.3, 18.3].map((z) => (
          <group key={`${x}_${z}`} position={[x, 0.02, z]}>
            <mesh position={[0, 0.16, 0]} material={fixture} castShadow>
              <cylinderGeometry args={[0.07, 0.11, 0.32, 8]} />
            </mesh>
            <mesh position={[0, 0.36, 0]} material={amberBulb}>
              <sphereGeometry args={[0.11, 10, 8]} />
            </mesh>
          </group>
        )),
      )}

      {/* Đèn ngưỡng đường băng xanh lục phát sáng */}
      {THRESH_LIGHT_Z.map((z) => (
        <mesh key={z} position={[17.2, 0.07, z]} material={greenBulb}>
          <sphereGeometry args={[0.09, 8, 6]} />
        </mesh>
      ))}

      {/* Khu nhà chứa máy bay (Hangars) và đài kiểm soát không lưu USAF ở hậu cảnh */}
      <group position={[-108, 0, -52]}>
        <mesh position={[0, 4.2, 0]} material={hangarWall} castShadow receiveShadow>
          <boxGeometry args={[28, 8.4, 24]} />
        </mesh>
        <mesh position={[0, 8.4, 0]} rotation={[0, 0, Math.PI / 2]} material={hangarRoof} castShadow>
          <cylinderGeometry args={[12.1, 12.1, 28.4, 18, 1, false, 0, Math.PI]} />
        </mesh>
      </group>

      <group position={[-132, 0, -24]}>
        <mesh position={[0, 3.8, 0]} material={hangarWall} castShadow receiveShadow>
          <boxGeometry args={[24, 7.6, 20]} />
        </mesh>
        <mesh position={[0, 7.6, 0]} rotation={[0, 0, Math.PI / 2]} material={hangarRoof} castShadow>
          <cylinderGeometry args={[10.1, 10.1, 24.4, 16, 1, false, 0, Math.PI]} />
        </mesh>
      </group>

      {/* Đài chỉ huy không lưu + đèn cảnh báo hàng không đỏ */}
      <group position={[-92, 0, -68]}>
        <mesh position={[0, 9.5, 0]} material={hangarWall} castShadow>
          <boxGeometry args={[4.6, 19, 4.6]} />
        </mesh>
        <mesh position={[0, 20.6, 0]} material={towerGlass} castShadow>
          <cylinderGeometry args={[4.2, 3.3, 3.4, 8]} />
        </mesh>
        <mesh position={[0, 22.6, 0]} material={hangarRoof}>
          <cylinderGeometry args={[4.6, 4.3, 0.6, 8]} />
        </mesh>
        <mesh position={[0, 24.8, 0]} material={fixture}>
          <cylinderGeometry args={[0.06, 0.08, 3.8, 6]} />
        </mesh>
        <mesh position={[0, 26.8, 0]} material={redBeacon}>
          <sphereGeometry args={[0.24, 10, 8]} />
        </mesh>
      </group>
    </group>
  );
};

const lerpV3 = (a: V3, b: V3, p: number): V3 => [lerp(a[0], b[0], p), lerp(a[1], b[1], p), lerp(a[2], b[2], p)];

const S01: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Cửa khoang vũ khí bụng F-35A mở ra quanh 14.3–19.7s lộ đạn bên trong rồi khép phẳng
  const bayOpen = prog(t, 14.3, 15.35) * (1 - prog(t, 18.35, 19.65));

  // Chuyển động máy quay điện ảnh liên tục qua 4 nhịp lời thoại:
  // 1) 0.0–12.0s: Dolly thấp dọc đường băng bình minh đặt F-35A cạnh F-15EX ("Which fighter belongs to the future of war?")
  // 2) 12.0–20.2s: Ép thấp sát góc trước-dưới bụng F-35A soi khoang đạn giấu kín mở rồi đóng phẳng
  // 3) 20.2–28.0s: Nâng độ cao (crane up) và lia sang phải hé lộ toàn bộ khối F-15EX cao 5.63m hai đuôi đứng và 12 tên lửa
  const p1 = prog(t, 0.0, 12.0);
  const p2 = prog(t, 12.2, 15.2);
  const p2Drift = prog(t, 15.2, 19.8);
  const p3 = prog(t, 19.9, 23.8);
  const p4 = prog(t, 23.8, 28.0);

  let pos: V3 = lerpV3([25.2, 2.05, 9.8], [18.8, 1.38, 8.0], p1);
  let look: V3 = lerpV3([0.6, 1.85, 0.8], [0.9, 1.62, 2.8], p1);

  // Góc thấp dưới cằm F-35A vừa giữ trọn mũi máy bay vừa nhìn rõ bên trong khoang đạn bụng mở
  pos = lerpV3(pos, [13.2, 0.66, 11.4], p2);
  look = lerpV3(look, [1.2, 1.18, 6.8], p2);

  pos = lerpV3(pos, [12.4, 0.72, 10.4], p2Drift);
  look = lerpV3(look, [0.9, 1.14, 6.7], p2Drift);

  // Vòng cung dolly rộng ra phía trước khi lia sang phải để mũi F-15EX không bị cắt mép ở giữa cú lia
  pos = lerpV3(pos, [16.4, 2.85, -12.6], p3);
  pos = [pos[0] + 4.4 * Math.sin(p3 * Math.PI), pos[1], pos[2]];
  look = lerpV3(look, [-0.5, 2.18, -6.5], p3);

  pos = lerpV3(pos, [14.8, 3.25, -13.6], p4);
  look = lerpV3(look, [-0.9, 2.28, -6.2], p4);

  const fov = lerp(lerp(38, 37, p2), 39, p3);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_DAWN_TARMAC} shadowArea={34} shadowCenter={[1, 0, 0]}>
        <Cam pos={pos} look={look} fov={fov} />

        <Terrain h={AIRBASE_H} size={900} seg={220} colors={DAWN_GRASS} grainRepeat={48} />
        <Scatter
          kind="pine"
          count={140}
          area={[-260, -260, 220, 260]}
          h={AIRBASE_H}
          seed={7}
          scale={[0.85, 1.5]}
          avoid={avoidAirfield}
          tint="#8fa698"
        />
        <Scatter
          kind="broadleaf"
          count={85}
          area={[-240, -240, 200, 240]}
          h={AIRBASE_H}
          seed={19}
          scale={[0.8, 1.35]}
          avoid={avoidAirfield}
          tint="#99a88c"
        />
        <Scatter
          kind="bush"
          count={110}
          area={[-190, -180, 190, 180]}
          h={AIRBASE_H}
          seed={31}
          scale={[0.7, 1.25]}
          avoid={avoidAirfield}
          tint="#8ca084"
        />

        <RunwayAndBase />

        {/* F-35A Lightning II đỗ bên trái đường băng (z = +7.0), khoang bụng khép kín tàng hình */}
        <group position={[1.2, 0.022, 7.0]}>
          <F35A gear={1} bayOpen={bayOpen} />
        </group>

        {/* Đèn hắt dịu dưới khoang bụng giúp thấy rõ tên lửa AIM-120 bên trong mà không chói mặt nhựa đường */}
        {bayOpen > 0.02 && (
          <pointLight position={[1.3, 0.92, 7.0]} color="#ffdca8" intensity={1.15 * bayOpen} distance={4.5} decay={2} />
        )}

        {/* F-15EX Eagle II sừng sững bên phải đường băng (z = -7.2), cao 5.63m, hai đuôi đứng và đầy đủ 12 tên lửa */}
        <group position={[0.0, 0.022, -7.2]}>
          <F15EX gear={1} wingTipMissiles fullLoad />
        </group>
      </Stage>

      <Label
        t={t}
        text="1972"
        x={1540}
        y={175}
        from={CUE.s01_y1972}
        until={27.8}
        bg={P.amber}
        fg={P.ink}
      />
    </AbsoluteFill>
  );
};

export default S01;
