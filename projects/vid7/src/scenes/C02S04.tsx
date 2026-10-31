import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import { lerp, prog, useT } from '@core/time';
import { rbox, pipe } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Wheel } from '@skill/military/3d/parts';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Scatter, Terrain, heightField } from '@skill/military/3d/terrain';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { GasCan5Gal, MarkTwainSight } from '../parts/Ordnance3D';

// Địa hình sân bay Eglin, Florida: khu sân đỗ & đường lăn phẳng tuyệt đối y = 0 trong bán kính 96 m, đồi cát thấp ở xa
const floridaHeight = heightField({
  seed: 42,
  amp: 4.8,
  scale: 140,
  flats: [[0, 0, 96, 0]],
  add: (x, z) => (Math.hypot(x, z) > 125 ? 3.5 * Math.sin(x * 0.016) * Math.cos(z * 0.015) : 0),
});

const avoidAirfield = (x: number, z: number) =>
  Math.hypot(x, z) < 84 || (Math.abs(z + 44) < 22 && Math.abs(x) < 210) || (Math.abs(z - 46) < 20 && Math.abs(x) < 190);

/** Sân đỗ bê tông, đường băng phụ, nhà chứa máy bay Quonset/USAAF & xe kỹ thuật xa tạo chiều sâu căn cứ Eglin */
const EglinAirfieldBackdrop: React.FC<{ t: number }> = ({ t }) => {
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
      oilStain: plain('#2b2926', 0.85, 0.08, { transparent: true, opacity: 0.35 }),
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
      steelPole: plain('#747b80', 0.52, 0.55),
      sockOrange: plain('#d95b26', 0.78, 0.04),
    }),
    [],
  );

  return (
    <group>
      {/* Sân đỗ bê tông chính tại y = 0.012 m */}
      <mesh position={[0, 0.006, 0]} receiveShadow material={mats.concrete}>
        <boxGeometry args={[86, 0.012, 62]} />
      </mesh>

      {/* Khe co giãn nhựa đường chia ô sân đỗ bê tông */}
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

      {/* Vạch sơn vàng dẫn lăn bánh sân đỗ & vệt dầu dưới 2 động cơ Wright */}
      <mesh position={[2, 0.014, 0]} material={mats.paintYellow}>
        <boxGeometry args={[48, 0.002, 0.18]} />
      </mesh>
      <mesh position={[9.2, 0.014, 0]} material={mats.paintWhite}>
        <boxGeometry args={[0.24, 0.002, 8.5]} />
      </mesh>
      {([-3.05, 3.05] as const).map((ez, idx) => (
        <mesh key={`oil-${idx}`} position={[3.2, 0.014, ez]} rotation={[-Math.PI / 2, 0, 0]} material={mats.oilStain}>
          <circleGeometry args={[1.05, 18]} />
        </mesh>
      ))}

      {/* Đường băng cất hạ cánh chạy song song phía xa (z = -44 m) có vạch kẻ trắng */}
      <mesh position={[0, 0.008, -44]} receiveShadow material={mats.runwayAsphalt}>
        <boxGeometry args={[360, 0.014, 24]} />
      </mesh>
      {Array.from({ length: 11 }, (_, i) => (
        <mesh key={`rw-${i}`} position={[-100 + i * 20, 0.017, -44]} material={mats.paintWhite}>
          <boxGeometry args={[9, 0.003, 0.42]} />
        </mesh>
      ))}

      {/* Nhà chứa máy bay Hangar mái vòm USAAF ở xa phía Tây-Bắc (-X, -Z) */}
      {[
        [-54, -26, 0.22],
        [-22, -66, 0.0],
      ].map(([hx, hz, rotY], idx) => (
        <group key={`hangar-${idx}`} position={[hx, 0, hz]} rotation={[0, rotY, 0]}>
          <mesh position={[0, 4.2, 0]} material={mats.hangarWall} castShadow receiveShadow>
            <boxGeometry args={[26, 8.4, 20]} />
          </mesh>
          <mesh position={[0, 8.4, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.hangarRoof} castShadow>
            <cylinderGeometry args={[10.1, 10.1, 26.4, 20, 1, false, 0, Math.PI]} />
          </mesh>
          {/* Cửa hangar trượt mở một nửa */}
          <mesh position={[13.05, 3.6, 0]} material={mats.hangarDark}>
            <boxGeometry args={[0.12, 7.2, 13.5]} />
          </mesh>
        </group>
      ))}

      {/* Tháp kiểm soát không lưu khung thép + ống gió cam-trắng ở xa */}
      <group position={[34, 0, -28]}>
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

      {/* Cột ống chỉ gió sân bay (Windsock) khẽ bay trong nắng */}
      <group position={[-28, 0, -18]}>
        <mesh position={[0, 3.2, 0]} material={mats.steelPole} castShadow>
          <cylinderGeometry args={[0.06, 0.09, 6.4, 10]} />
        </mesh>
        <group position={[0, 6.2, 0]} rotation={[0, 0.35 + Math.sin(t * 1.6) * 0.08, 0]}>
          <mesh position={[0.75, -0.08, 0]} rotation={[0, 0, Math.PI / 2 + 0.12]} material={mats.sockOrange}>
            <cylinderGeometry args={[0.14, 0.32, 1.5, 12]} />
          </mesh>
        </group>
      </group>

      {/* Xe tải hậu cần quân sự USAAF GMC CCKW 2.5 tấn đỗ phía sau sân đỗ */}
      {[
        [-24, -13, 0.45],
        [-32, 16, -0.35],
      ].map(([tx, tz, ry], idx) => (
        <group key={`truck-${idx}`} position={[tx, 0.012, tz]} rotation={[0, ry, 0]}>
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
      ))}
    </group>
  );
};

/** Xe đẩy kỹ thuật chở khối tháp pháo bụng Bendix nặng nề vừa tháo rời khỏi bụng B-25B */
const RemovedLowerTurretDolly: React.FC<{ slideZ: number }> = ({ slideZ }) => {
  const mats = useMemo(
    () => ({
      cartYellow: paint({
        color: '#c99b2e',
        camo: ['#b58922', '#d8ab3e'],
        wear: 0.34,
        dirt: 0.32,
        roughness: 0.62,
        metalness: 0.28,
        seed: 19,
      }),
      turretBelly: paint({
        color: PAINT.usaafBelly,
        camo: ['#7e858a', '#9aa1a6'],
        wear: 0.22,
        dirt: 0.26,
        roughness: 0.56,
        metalness: 0.36,
        seed: 23,
      }),
      chromate: plain('#5d703d', 0.7, 0.24),
      gunSteel: plain('#23272c', 0.38, 0.78),
      darkSteel: plain('#363b40', 0.52, 0.6),
      cableBlack: plain('#1b1d1f', 0.85, 0.1),
      periscopeGlass: plain(PAINT.cockpitGlass, 0.16, 0.25),
    }),
    [],
  );

  const cableGeo = useMemo(
    () =>
      pipe(
        [
          [0.12, 0.92, 0.18],
          [0.34, 0.65, 0.36],
          [0.48, 0.31, 0.32],
          [0.28, 0.29, 0.44],
        ],
        0.016,
        20,
      ),
    [],
  );
  const handleGeo = useMemo(
    () =>
      pipe(
        [
          [0, 0.24, 0.68],
          [0, 0.54, 1.18],
          [0.24, 0.54, 1.22],
        ],
        0.02,
        16,
      ),
    [],
  );

  const spin = slideZ / 0.13;

  return (
    <group position={[-1.25, 0.012, slideZ]}>
      {/* Khung bàn xe đẩy kỹ thuật 4 bánh sắt */}
      <mesh position={[0, 0.25, 0]} geometry={rbox(1.22, 0.07, 1.32, 0.015)} material={mats.cartYellow} castShadow receiveShadow />
      {([-0.48, 0.48] as const).map((wx) =>
        ([-0.5, 0.5] as const).map((wz) => (
          <group key={`cw-${wx}-${wz}`} position={[wx, 0.13, wz]} rotation={[0, Math.PI / 2, 0]}>
            <Wheel r={0.13} width={0.07} spin={spin} tire="#222426" rim="#b88c28" bolts={5} />
          </group>
        )),
      )}
      {/* Gối đỡ gỗ chữ V trên mặt xe đẩy */}
      {([-0.32, 0.32] as const).map((cx, i) => (
        <mesh key={i} position={[cx, 0.33, 0]} geometry={rbox(0.14, 0.11, 0.86, 0.01)} material={plain('#6e5539', 0.84, 0.05)} castShadow />
      ))}
      <mesh geometry={handleGeo} material={mats.darkSteel} castShadow />

      {/* Khối tháp pháo bụng Bendix (trụ thuỷ lực + bầu bán cầu kính tiềm vọng + cặp súng máy đôi .50 cal) */}
      <group position={[0, 0.56, -0.04]}>
        {/* Trụ treo thuỷ lực rút vào trong thân vừa tháo rời */}
        <mesh position={[0, 0.34, 0]} material={mats.chromate} castShadow>
          <cylinderGeometry args={[0.26, 0.32, 0.38, 24]} />
        </mesh>
        <mesh position={[0, 0.54, 0]} material={mats.darkSteel} castShadow>
          <cylinderGeometry args={[0.38, 0.38, 0.06, 24]} />
        </mesh>
        {/* Vỏ tháp cầu xoay bên dưới */}
        <mesh position={[0, 0.05, 0]} material={mats.turretBelly} castShadow>
          <cylinderGeometry args={[0.37, 0.35, 0.34, 28]} />
        </mesh>
        <mesh position={[0, -0.11, 0]} rotation={[Math.PI, 0, 0]} material={mats.turretBelly} castShadow>
          <sphereGeometry args={[0.35, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        </mesh>
        {/* Cửa kính tiềm vọng ngắm bắn dưới đáy */}
        <mesh position={[0.18, -0.14, 0.12]} rotation={[0.3, 0.4, 0]} material={mats.periscopeGlass}>
          <cylinderGeometry args={[0.065, 0.065, 0.05, 16]} />
        </mesh>
        {/* Cặp súng máy hạng nặng .50 cal Browning chĩa xéo trên giá */}
        {([-0.11, 0.11] as const).map((zg, idx) => (
          <group key={`lgun-${idx}`} position={[-0.28, 0.02, zg]} rotation={[0, 0.22, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={mats.darkSteel} castShadow>
              <cylinderGeometry args={[0.034, 0.034, 0.38, 12]} />
            </mesh>
            <mesh position={[-0.36, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.gunSteel} castShadow>
              <cylinderGeometry args={[0.017, 0.015, 0.56, 10]} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh geometry={cableGeo} material={mats.cableBlack} />
    </group>
  );
};

/** Cụm linh kiện nặng tháo bỏ xếp trên sân đỗ: Điện đài tầm xa SCR-287, các tấm giáp thép ghế lái & can xăng 5-gal */
const StrippedEquipmentPile: React.FC = () => {
  const mats = useMemo(
    () => ({
      palletWood: plain('#7d6344', 0.86, 0.04),
      radioBlack: plain('#222629', 0.62, 0.38),
      dialSilver: plain('#c8d0d6', 0.28, 0.78),
      armorSteel: paint({
        color: '#485042',
        camo: ['#3d4438', '#586151'],
        wear: 0.35,
        dirt: 0.22,
        roughness: 0.52,
        metalness: 0.58,
        seed: 91,
      }),
      copperCoil: plain('#c87d44', 0.35, 0.75),
      redToolbox: plain('#8f2b24', 0.55, 0.35),
    }),
    [],
  );

  const wireCoil = useMemo(
    () =>
      pipe(
        [
          [0.36, 0.16, 0.25],
          [0.52, 0.15, 0.35],
          [0.58, 0.15, 0.16],
          [0.42, 0.16, 0.08],
        ],
        0.014,
        18,
      ),
    [],
  );

  return (
    <group position={[0, 0.012, 0]}>
      {/* Pallet gỗ đặt khối điện đài tầm xa (Long-range Radios BC-348 / BC-375) dịch về trước x = 1.48 m để mở thoáng hoàn toàn đường trượt xe đẩy tháp pháo bụng */}
      <group position={[1.48, 0, 1.56]} rotation={[0, -0.32, 0]}>
        <mesh position={[0, 0.06, 0]} geometry={rbox(1.08, 0.12, 0.82, 0.012)} material={mats.palletWood} castShadow receiveShadow />
        {/* Máy phát điện đài lớn */}
        <mesh position={[-0.2, 0.31, -0.04]} geometry={rbox(0.54, 0.38, 0.42, 0.02)} material={mats.radioBlack} castShadow />
        {/* Mặt đồng hồ tần số & núm chỉnh */}
        {[-0.32, -0.08].map((dx, i) => (
          <mesh key={i} position={[dx, 0.36, 0.172]} rotation={[Math.PI / 2, 0, 0]} material={mats.dialSilver}>
            <cylinderGeometry args={[0.062, 0.062, 0.015, 18]} />
          </mesh>
        ))}
        {/* Bộ thu phụ xếp chồng + máy biến áp dynamotor */}
        <mesh position={[0.26, 0.24, -0.06]} geometry={rbox(0.36, 0.25, 0.34, 0.018)} material={mats.radioBlack} castShadow />
        <mesh position={[-0.18, 0.59, -0.05]} geometry={rbox(0.42, 0.19, 0.32, 0.015)} material={mats.radioBlack} castShadow />
        <mesh geometry={wireCoil} material={mats.copperCoil} />
      </group>

      {/* Các tấm giáp thép ghế lái & vách chống đạn tháo rời (Steel Armor Plates) tại [2.52, 0, 1.38] */}
      <group position={[2.52, 0, 1.38]} rotation={[0, -0.44, 0]}>
        <mesh position={[0, 0.17, -0.16]} geometry={rbox(0.66, 0.34, 0.4, 0.015)} material={mats.palletWood} castShadow receiveShadow />
        {/* Tấm giáp lưng ghế phi công dày có lỗ bắt bu-lông dựa nghiêng */}
        <group position={[-0.14, 0.42, 0.08]} rotation={[-0.28, 0.08, 0]}>
          <mesh geometry={rbox(0.5, 0.82, 0.032, 0.008)} material={mats.armorSteel} castShadow />
          <mesh position={[0, 0.5, 0]} geometry={rbox(0.3, 0.22, 0.032, 0.008)} material={mats.armorSteel} castShadow />
        </group>
        {/* Tấm giáp ghế lái phụ xếp cạnh */}
        <group position={[0.25, 0.39, 0.13]} rotation={[-0.34, -0.15, 0.06]}>
          <mesh geometry={rbox(0.48, 0.78, 0.032, 0.008)} material={mats.armorSteel} castShadow />
        </group>
        {/* Hộp đồ nghề cơ khí đỏ */}
        <mesh position={[0.56, 0.13, 0.2]} rotation={[0, 0.4, 0]} geometry={rbox(0.44, 0.23, 0.22, 0.015)} material={mats.redToolbox} castShadow />
      </group>

      {/* Cụm 4 can xăng 5-gallon xếp cạnh tấm giáp thép ngay dưới cửa khoang bom để thấy trọn vẹn trong khung 1-3 */}
      {[
        [1.96, 0.86, 0.28],
        [2.32, 0.94, -0.35],
        [2.16, 1.2, 0.75],
        [1.76, 1.14, -0.14],
      ].map(([gx, gz, ry], idx) => (
        <group key={`gcan-${idx}`} position={[gx, 0, gz]} rotation={[0, ry, 0]}>
          <GasCan5Gal punctured={false} seed={60 + idx * 7} />
        </group>
      ))}
    </group>
  );
};

/**
 * Giá gá hiệu chỉnh kỹ thuật đặt sát bên ngoài chóp mũi kính Bombardier (x ≈ +7.90 m, z = +0.52 m):
 * - Hộp máy ngắm tuyệt mật Norden M-9 trùm bạt bảo mật được kéo trượt sang bên (217.8–220.5 s)
 * - Phô bày cận cảnh sắc nét chiếc thước ngắm nhôm phế liệu 20 xu <MarkTwainSight /> dưới nắng Florida!
 */
const BombardierNoseCalibrationRig: React.FC<{ t: number }> = ({ t }) => {
  const nordenOut = prog(t, 218.1, 220.6);
  const sightSettle = prog(t, 218.5, 220.4);
  const aimAngle = lerp(0.19, 0.45, prog(t, 221.4, 227.4));

  const mats = useMemo(
    () => ({
      standSteel: plain('#3f4835', 0.58, 0.42),
      benchWood: paint({
        color: '#8e714c',
        camo: ['#7c613f', '#9e805a'],
        wear: 0.22,
        dirt: 0.18,
        roughness: 0.78,
        metalness: 0.05,
        repeat: 2,
        seed: 44,
      }),
      mountPlate: plain('#535b61', 0.46, 0.62),
      nordenShroud: paint({
        color: '#7a7254',
        camo: ['#6b6347', '#8b8262'],
        wear: 0.24,
        dirt: 0.2,
        roughness: 0.88,
        metalness: 0.04,
        repeat: 2,
        seed: 77,
      }),
      nordenMetal: plain('#2a2e30', 0.45, 0.65),
      brassLens: plain('#cca043', 0.25, 0.82),
      rope: plain('#bfb28e', 0.9, 0.02),
    }),
    [],
  );

  return (
    <group position={[7.88, 0.012, 0.54]}>
      {/* Khung chân giá gá kỹ thuật cao tới tầm mũi kính Bombardier (mặt bàn y = 1.88 m) */}
      <mesh position={[0, 1.86, 0.16]} geometry={rbox(0.68, 0.045, 0.72, 0.008)} material={mats.benchWood} castShadow receiveShadow />
      {([-0.28, 0.28] as const).map((lx) =>
        ([-0.14, 0.46] as const).map((lz) => (
          <mesh key={`leg-${lx}-${lz}`} position={[lx, 0.93, lz]} material={mats.standSteel} castShadow>
            <cylinderGeometry args={[0.022, 0.026, 1.86, 10]} />
          </mesh>
        )),
      )}
      {/* Thanh giằng ngang chân giá */}
      <mesh position={[0, 1.15, 0.16]} geometry={rbox(0.6, 0.03, 0.64, 0.005)} material={mats.standSteel} />

      {/* Bệ gá kim loại chuẩn USAAF kẹp sát phía mũi kính Bombardier (z_local = -0.02 → z_world = +0.52 m, cách vỏ kính mũi 18 cm không chạm kính!) */}
      <mesh position={[0.02, 1.895, -0.02]} geometry={rbox(0.36, 0.026, 0.15, 0.004)} material={mats.mountPlate} castShadow receiveShadow />

      {/* Thước ngắm nhôm phế liệu 20 xu "Mark Twain" của Đại úy Ross Greening */}
      <group
        position={[0.02, 1.908 + (1 - sightSettle) * 0.015, -0.02]}
        rotation={[0, 0.14, 0]}
        scale={1.06}
      >
        <MarkTwainSight aimAngle={aimAngle} />
      </group>

      {/* Khối máy ngắm ném bom tuyệt mật Norden M-9 trùm bạt bảo mật được rút lùi sang bên trái/sau để lộ rõ MarkTwainSight bên cạnh */}
      {nordenOut < 0.995 && (
        <group
          position={[
            lerp(-0.18, -0.82, nordenOut),
            1.885 - nordenOut * 0.06,
            lerp(0.22, 0.88, nordenOut),
          ]}
          rotation={[0, lerp(-0.12, 0.48, nordenOut), 0]}
        >
          {/* Đế khay gỗ trượt đỡ máy ngắm Norden */}
          <mesh position={[0, 0.015, 0]} geometry={rbox(0.34, 0.026, 0.28, 0.005)} material={mats.benchWood} castShadow />
          {/* Thân con quay hồi chuyển Norden lộ một phần dưới lớp bạt */}
          <mesh position={[0.02, 0.11, 0]} geometry={rbox(0.24, 0.16, 0.2, 0.025)} material={mats.nordenMetal} castShadow />
          <mesh position={[0.13, 0.09, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.brassLens}>
            <cylinderGeometry args={[0.048, 0.052, 0.06, 18]} />
          </mesh>
          {/* Túi vải bạt bảo mật trùm kín đỉnh máy ngắm Norden buộc dây thừng */}
          <mesh position={[-0.01, 0.2, 0]} geometry={rbox(0.28, 0.22, 0.24, 0.06)} material={mats.nordenShroud} castShadow />
          <mesh position={[-0.01, 0.13, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.rope}>
            <torusGeometry args={[0.132, 0.009, 8, 24]} />
          </mesh>
        </group>
      )}
    </group>
  );
};

const C02S04: React.FC = () => {
  const t = useT();

  // Tiến độ kéo xe đẩy tháp pháo bụng ra khỏi gầm bụng B-25B
  const creepEarly = prog(t, CUE.c02_s04_start, 212.6);
  const pullTurret = prog(t, 212.6, 217.1);
  const turretSlideZ = lerp(0.28, 0.62, creepEarly) + pullTurret * 1.48;

  // Ngôn ngữ camera 3 pha mượt mà:
  // Pha 1 (205.64–216.8 s): Góc 3/4 thấp luồn dưới gầm bụng thấy tháo tháp pháo Bendix, điện đài, giáp thép & can xăng
  // Pha 2 (216.8–220.4 s): Nâng dọc sườn mũi lên sát giá gá cạnh mũi kính Bombardier khi hộp Norden rút lui
  // Pha 3 (220.4–228.04 s): Ép cận cảnh sắc nét vào thước ngắm nhôm 20 xu Mark Twain dưới nắng Florida
  const pBelly = prog(t, CUE.c02_s04_start, 216.7);
  const pToNose = prog(t, 216.7, 218.65);
  const pMacro = prog(t, 220.1, 227.8);

  // Pha 1 đi hoàn toàn trong hành lang thoáng dưới gốc cánh hải âu (z = 2.42 -> 2.12 < 2.95 m của bánh chính) để không bao giờ bị bánh xe che khuất!
  const bellyPos: V3 = [
    lerp(4.65, 3.45, pBelly),
    lerp(1.16, 1.02, pBelly),
    lerp(2.44, 2.14, pBelly),
  ];
  const bellyLook: V3 = [
    lerp(0.45, -0.45, pBelly),
    lerp(0.84, 0.76, pBelly),
    lerp(0.82, 1.15, pBelly),
  ];

  const noseMidPos: V3 = [8.52, 2.18, 1.44];
  const noseMidLook: V3 = [7.78, 2.01, 0.56];

  const macroPos: V3 = [8.24, 2.08, 0.98];
  const macroLook: V3 = [7.9, 2.03, 0.49];

  const camPos: V3 = [
    lerp(lerp(bellyPos[0], noseMidPos[0], pToNose), macroPos[0], pMacro),
    lerp(lerp(bellyPos[1], noseMidPos[1], pToNose), macroPos[1], pMacro),
    lerp(lerp(bellyPos[2], noseMidPos[2], pToNose), macroPos[2], pMacro),
  ];
  const camLook: V3 = [
    lerp(lerp(bellyLook[0], noseMidLook[0], pToNose), macroLook[0], pMacro),
    lerp(lerp(bellyLook[1], noseMidLook[1], pToNose), macroLook[1], pMacro),
    lerp(lerp(bellyLook[2], noseMidLook[2], pToNose), macroLook[2], pMacro),
  ];
  const camFov = lerp(lerp(40, 37, pToNose), 34, pMacro);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_PRESETS.floridaSun} shadowArea={18} shadowCenter={[3.5, 1.4, 0.5]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Địa hình Florida + rừng thông xa > 84 m */}
        <Terrain h={floridaHeight} size={640} seg={128} colors={TERRAIN_PALETTE.florida} />
        <Scatter
          kind="pine"
          count={160}
          area={[-260, -260, 260, 260]}
          h={floridaHeight}
          seed={14}
          scale={[1.15, 1.95]}
          avoid={avoidAirfield}
        />
        <Scatter
          kind="bush"
          count={70}
          area={[-200, -200, 200, 200]}
          h={floridaHeight}
          seed={29}
          scale={[0.8, 1.4]}
          avoid={avoidAirfield}
        />

        {/* Sân đỗ bê tông, đường băng, hangar & xe hậu cần Eglin */}
        <EglinAirfieldBackdrop t={t} />

        {/* Chiếc B-25B Mitchell đỗ trên sân bê tông (propSpin=0 dạng chữ Y cao ráo không chắn tầm nhìn gầm máy bay) */}
        <group position={[0, 0.012, 0]}>
          <B25Mitchell
            gear={1}
            lowerTurret={false}
            broomsticks={false}
            bombBay={0.35}
            propSpin={0}
            chained={false}
          />
          {/* Chèn bánh gỗ vàng dưới 2 bánh đáp chính */}
          {([-2.95, 2.95] as const).map((wz, idx) => (
            <group key={`chk-${idx}`}>
              <mesh position={[1.8, 0.09, wz]} geometry={rbox(0.2, 0.18, 0.46, 0.025)} material={plain(PAINT.deckStripeYellow, 0.76, 0.08)} castShadow />
              <mesh position={[0.68, 0.09, wz]} geometry={rbox(0.2, 0.18, 0.46, 0.025)} material={plain(PAINT.deckStripeYellow, 0.76, 0.08)} castShadow />
            </group>
          ))}
        </group>

        {/* Đạo cụ nửa đầu cảnh: Xe đẩy kéo tháp pháo bụng Bendix + điện đài + giáp thép + can xăng 5-gal */}
        <RemovedLowerTurretDolly slideZ={turretSlideZ} />
        <StrippedEquipmentPile />

        {/* Đạo cụ nửa sau cảnh: Giá gá mũi kính Bombardier rút Norden lộ thước ngắm nhôm 20 xu Mark Twain */}
        <BombardierNoseCalibrationRig t={t} />
      </Stage>

      <Label
        t={t}
        text="MARK TWAIN · 20¢ SIGHT"
        x={1380}
        y={175}
        from={CUE.c02_s04_20_cents}
        until={227.75}
      />
    </AbsoluteFill>
  );
};

export default C02S04;
