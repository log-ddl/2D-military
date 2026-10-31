import React from 'react';
import * as THREE from 'three';
import { AbsoluteFill } from 'remotion';
import { useT, prog, lerp, bump } from '@core/time';
import { useSize } from '@core/frame';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, heightField } from '@skill/military/3d/terrain';
import { plain } from '@skill/military/3d/materials';
import { rbox } from '@skill/military/3d/geom';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { TurretInterior3D } from '../parts/TurretInterior3D';

const BAY_FLOOR_H = heightField({
  seed: 18,
  amp: 0.12,
  scale: 48,
  flats: [[1.5, 0.5, 16, 0]],
});

const BAY_RINGS = [1.45, 2.35, 3.6, 5.2, 7.4] as const;

const MAT_SUIT = plain('#6d7458', 0.82, 0.05);
const MAT_GLOVE_LEATHER = plain('#a68b65', 0.68, 0.06);
const MAT_GLOVE_CUFF = plain('#47503e', 0.74, 0.08);
const MAT_CONSOLE_STEEL = plain('#3c4551', 0.52, 0.34);
const MAT_DARK_BEZEL = plain('#20262e', 0.62, 0.24);
const MAT_HOOD_RUBBER = plain('#171b20', 0.86, 0.06);

/** Mục tiêu T-72 mô phỏng dạng khung hologram chiến thuật ở xa trong khoang studio để phản xạ tia laser đo xa. */
const SimulatedTargetHull: React.FC<{ hitGlow: number; active: number }> = ({ hitGlow, active }) => {
  const frameOpacity = 0.26 + active * 0.4 + hitGlow * 0.34;
  return (
    <group position={[7.25, 1.46, 0.66]}>
      <mesh position={[0, -1.43, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.92, 1.08, 36]} />
        <meshBasicMaterial
          color={PAL.cyan}
          transparent
          opacity={0.32 + hitGlow * 0.5}
          side={THREE.DoubleSide}
          toneMapped={false}
        />
      </mesh>

      <group>
        <mesh position={[0, 0.14, 0]} geometry={rbox(1.9, 0.44, 1.38, 0.04)}>
          <meshStandardMaterial
            color="#1c3242"
            emissive={hitGlow > 0.02 ? PAL.cyan : '#143848'}
            emissiveIntensity={0.55 + hitGlow * 2.2}
            transparent
            opacity={frameOpacity}
            roughness={0.25}
          />
        </mesh>
        <mesh position={[-0.08, 0.52, 0]}>
          <sphereGeometry args={[0.46, 22, 14, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
          <meshStandardMaterial
            color="#243c4e"
            emissive={hitGlow > 0.02 ? PAL.cyan : '#184456'}
            emissiveIntensity={0.6 + hitGlow * 2.4}
            transparent
            opacity={frameOpacity}
            roughness={0.2}
          />
        </mesh>
        <mesh position={[-1.06, 0.48, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.04, 0.046, 1.4, 14]} />
          <meshBasicMaterial color={PAL.cyan} transparent opacity={0.38 + hitGlow * 0.5} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
          <boxGeometry args={[1.96, 0.72, 1.44]} />
          <meshBasicMaterial color={PAL.cyan} wireframe transparent opacity={0.38 + hitGlow * 0.55} toneMapped={false} />
        </mesh>
      </group>

      {hitGlow > 0.005 && (
        <group position={[-0.96, 0.28, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <sphereGeometry args={[0.075 + hitGlow * 0.055, 16, 16]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </mesh>
          {[0, 1, 2].map((ri) => {
            const rScale = 0.14 + ((1 - hitGlow) * 0.72 + ri * 0.22);
            return (
              <mesh key={ri}>
                <ringGeometry args={[rScale, rScale + 0.032, 32]} />
                <meshBasicMaterial
                  color={ri === 0 ? '#ffffff' : PAL.cyan}
                  transparent
                  opacity={Math.max(0, hitGlow * (1 - ri * 0.25))}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
          <pointLight color={PAL.cyan} intensity={15 * hitGlow} distance={4.5} decay={1.6} />
        </group>
      )}
    </group>
  );
};

/**
 * Cặp cẳng tay áo lính tăng + găng tay da chiến thuật khớp động nối liền từ bắp tay/khuỷu tay pháo thủ
 * vòng gọn bên trong vành ổ bi tháp pháo (không giao cắt Turret Ring) nắm chặt trực tiếp lên 2 tay cầm chữ U Cadillacs,
 * ngón cái tay phải đặt và nhấn trực tiếp lên nút đỏ đo xa laser.
 */
const GunnerForearmsAndGloves: React.FC<{ cadillacTurn: number; thumbPress: number }> = ({
  cadillacTurn,
  thumbPress,
}) => {
  const cadBasePos = new THREE.Vector3(0.86, 0.96, 0.72);
  const cadBaseEuler = new THREE.Euler(0, 0.28, 0, 'XYZ');
  const cadTurnEuler = new THREE.Euler(cadillacTurn * 0.58, 0, 0, 'XYZ');
  const gripTiltEuler = new THREE.Euler(0, 0, -0.22, 'XYZ');

  const sleeveGeos = [0, 1].map((i) => {
    const zArm = i === 0 ? -0.135 : 0.135;
    const zGrip = i === 0 ? -0.15 : 0.15;

    // Điểm nối trên ống bắp tay của TankCrewFigure pose="gunner" tại [0.54, 0.41, 0.72]
    const shoulderPos = new THREE.Vector3(0.59, 0.8, 0.72 + zArm);
    const upperArmEuler = new THREE.Euler(cadillacTurn * (i === 0 ? 0.22 : -0.22), 0, -0.46, 'XYZ');
    const upperJoin = new THREE.Vector3(0.19, 0.005, 0).applyEuler(upperArmEuler).add(shoulderPos);
    const elbowBend = new THREE.Vector3(
      0.745,
      0.755,
      i === 0 ? 0.585 : 0.79,
    );
    // Điểm uốn trung gian nằm gọn trong lòng vành Turret Ring (r < 1.07 < 1.108) để không chạm vành thép đen y=0.85
    const midForearm = new THREE.Vector3(
      0.765,
      0.86,
      i === 0 ? 0.58 : 0.795,
    );

    // Điểm kết thúc lồng gọn vào trong miệng cổ găng tay (tránh hoàn toàn z-fighting)
    const wristPos = new THREE.Vector3(0.002, -0.056, i === 0 ? -0.008 : 0.008)
      .applyEuler(gripTiltEuler)
      .add(new THREE.Vector3(-0.02, 0.07, zGrip))
      .applyEuler(cadTurnEuler)
      .applyEuler(cadBaseEuler)
      .add(cadBasePos);

    const curve = new THREE.CatmullRomCurve3([upperJoin, elbowBend, midForearm, wristPos]);
    return new THREE.TubeGeometry(curve, 18, 0.037, 14, false);
  });

  return (
    <group>
      {/* Ống cẳng tay bộ đồ bay màu ô-liu (#6d7458) uốn tự nhiên từ bắp tay qua khuỷu lên thẳng cổ găng tay */}
      {sleeveGeos.map((geo, i) => (
        <mesh key={`forearm_${i}`} geometry={geo} material={MAT_SUIT} castShadow />
      ))}

      {/* Đôi bàn tay đeo găng da chiến thuật màu cát-ôliu tương phản sắc nét trên nền tay nắm cao su đen Cadillacs */}
      <group position={[0.86, 0.96, 0.72]} rotation={[0, 0.28, 0]}>
        <group rotation={[cadillacTurn * 0.58, 0, 0]}>
          {[-0.15, 0.15].map((zGrip, i) => {
            const side = i === 0 ? -1 : 1;
            const isRight = i === 1;
            const pressDrop = isRight ? thumbPress * 0.012 : 0;
            return (
              <group key={`glove_${i}`} position={[-0.02, 0.07, zGrip]}>
                <group rotation={[0, 0, -0.22]}>
                  {/* Cổ găng loe nhẹ (r=0.043 > r_sleeve=0.037) ôm trọn đầu ống tay áo không z-fighting */}
                  <mesh position={[0.002, -0.064, side * 0.008]} material={MAT_GLOVE_CUFF} castShadow>
                    <cylinderGeometry args={[0.041, 0.045, 0.044, 16]} />
                  </mesh>
                  {/* Khối bàn tay da màu cát chiến thuật & tấm Kevlar bảo vệ mu bàn tay */}
                  <mesh
                    position={[-0.02, -0.006, side * 0.021]}
                    geometry={rbox(0.052, 0.094, 0.046, 0.014)}
                    material={MAT_GLOVE_LEATHER}
                    castShadow
                  />
                  <mesh
                    position={[-0.029, -0.005, side * 0.027]}
                    geometry={rbox(0.036, 0.074, 0.034, 0.008)}
                    material={MAT_GLOVE_CUFF}
                    castShadow
                  />
                  {/* 4 ngón tay da màu cát quấn chặt quanh mặt trước trụ cao su đen Cadillacs */}
                  {[-0.036, -0.014, 0.008, 0.03].map((fy, fi) => (
                    <mesh
                      key={fi}
                      position={[0.016, fy, side * 0.004]}
                      geometry={rbox(0.052, 0.017, 0.06, 0.007)}
                      material={MAT_GLOVE_LEATHER}
                      castShadow
                    />
                  ))}
                </group>

                {/* Ngón cái: tay phải đặt trực tiếp lên nút đỏ đo xa laser [0.028, 0.058, 0] và ấn xuống khi bắn laser */}
                {isRight ? (
                  <group>
                    <mesh
                      position={[0.003, 0.05, 0.024]}
                      rotation={[0.42, -0.35, -0.45]}
                      geometry={rbox(0.044, 0.022, 0.024, 0.008)}
                      material={MAT_GLOVE_LEATHER}
                      castShadow
                    />
                    <mesh
                      position={[0.026, 0.074 - pressDrop, 0.005]}
                      rotation={[0.12, -0.1, -0.16]}
                      geometry={rbox(0.036, 0.02, 0.024, 0.008)}
                      material={MAT_GLOVE_LEATHER}
                      castShadow
                    />
                  </group>
                ) : (
                  <mesh
                    position={[0.012, 0.052, -0.02]}
                    rotation={[-0.32, 0.25, -0.35]}
                    geometry={rbox(0.044, 0.021, 0.023, 0.008)}
                    material={MAT_GLOVE_LEATHER}
                    castShadow
                  />
                )}
              </group>
            );
          })}

          {/* Xung sáng kích hoạt nút đỏ đo xa laser ngay dưới đầu ngón cái tay phải */}
          {thumbPress > 0.01 && (
            <group position={[0.008, 0.128, 0.15]}>
              <mesh scale={1 + thumbPress * 0.55}>
                <sphereGeometry args={[0.026, 14, 14]} />
                <meshBasicMaterial color="#ff4242" transparent opacity={0.85 * thumbPress} toneMapped={false} />
              </mesh>
              <mesh rotation={[0, Math.PI / 2, 0]}>
                <ringGeometry args={[0.034 + (1 - thumbPress) * 0.045, 0.046 + (1 - thumbPress) * 0.045, 24]} />
                <meshBasicMaterial
                  color={PAL.cyan}
                  transparent
                  opacity={thumbPress}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
              <pointLight color="#ff4242" intensity={2.2 * thumbPress} distance={0.65} decay={2} />
            </group>
          )}
        </group>
      </group>
    </group>
  );
};

/**
 * Cụm màn hình/thị kính ngắm nhiệt FLIR sắc nét đặt nhô về phía mắt pháo thủ (x = 0.838 < 0.90, y_bottom = 1.158 > 1.124),
 * nằm hoàn toàn phía trên tay cầm Cadillacs và 100% KHÔNG giao cắt với bệ má giáp phải hay bất kỳ khối giáp nào,
 * đồng thời ốp kín mặt hổ phách cũ bị vát cắt của base thành vỏ hộp máy tính thép sạch sẽ.
 */
const GunnerFlirSightAssembly: React.FC<{
  cadillacTurn: number;
  flirYardageLock: number;
  flirFlash: number;
}> = ({ cadillacTurn, flirYardageLock, flirFlash }) => {
  const screenEmissive = 0.48 + flirFlash * 0.32;

  return (
    <group>
      {/* 1. Ốp mặt thép kỹ thuật che kín hoàn toàn tấm màn hổ phách thấp bị bệ má giáp phải (y=1.11) cắt lẹm trong base */}
      <group position={[1.08, 1.08, 0.72]} rotation={[0, 0.38, 0]}>
        <group position={[-0.145, 0.04, 0.02]} rotation={[0, 0.18, -0.12]}>
          <mesh position={[-0.012, 0, 0]} geometry={rbox(0.054, 0.244, 0.314, 0.012)} material={MAT_CONSOLE_STEEL} castShadow />
          <mesh position={[-0.04, 0, 0]} geometry={rbox(0.008, 0.19, 0.26, 0.004)} material={MAT_DARK_BEZEL} />
        </group>
        <mesh position={[0.02, 0.05, 0.214]} geometry={rbox(0.196, 0.156, 0.018, 0.004)} material={MAT_CONSOLE_STEEL} />
      </group>

      {/* 2. Khớp khuỷu ống dẫn quang học nối từ trụ kính GPS [1.08, 1.34, 0.68] ra cụm màn hình FLIR trước mắt pháo thủ */}
      <mesh position={[0.96, 1.275, 0.705]} rotation={[0.14, 0.22, 1.32]} material={MAT_CONSOLE_STEEL} castShadow>
        <cylinderGeometry args={[0.046, 0.054, 0.26, 16]} />
      </mesh>

      {/* 3. Màn hình ngắm nhiệt FLIR chính diện pháo thủ (x = 0.838 < 0.90, y = 1.158..1.330 — vuông vức 100%, không bị bất kỳ khối giáp nào chạm!) */}
      <group position={[0.838, 1.244, 0.728]} rotation={[0, 0.34, -0.06]}>
        {/* Thân vỏ bọc thép & vành chắn sáng cao su (brow hood) */}
        <mesh position={[0.018, 0, 0]} geometry={rbox(0.056, 0.174, 0.254, 0.012)} material={MAT_CONSOLE_STEEL} castShadow />
        <mesh position={[-0.008, 0, 0]} geometry={rbox(0.024, 0.166, 0.244, 0.01)} material={MAT_DARK_BEZEL} />
        {/* Mái che chống loá phía trên & hai bên màn hình FLIR */}
        <mesh position={[-0.028, 0.079, 0]} geometry={rbox(0.036, 0.012, 0.248, 0.004)} material={MAT_HOOD_RUBBER} />
        <mesh position={[-0.026, 0, -0.118]} geometry={rbox(0.032, 0.162, 0.012, 0.004)} material={MAT_HOOD_RUBBER} />
        <mesh position={[-0.026, 0, 0.118]} geometry={rbox(0.032, 0.162, 0.012, 0.004)} material={MAT_HOOD_RUBBER} />

        {/* Mặt kính hiển thị ảnh nhiệt FLIR màu hổ phách tương phản cao, không cháy loá */}
        <mesh position={[-0.021, 0, 0]}>
          <boxGeometry args={[0.004, 0.138, 0.214]} />
          <meshStandardMaterial
            color="#e89a20"
            emissive="#cf7208"
            emissiveIntensity={screenEmissive}
            roughness={0.28}
          />
        </mesh>

        {/* Dải mặt đất nhiệt tối hơn ở nửa dưới màn hình tạo chiều sâu chiến trường trên màn FLIR */}
        <mesh position={[-0.0235, -0.034, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.21, 0.068]} />
          <meshBasicMaterial color="#5c2d04" transparent opacity={0.46} side={THREE.DoubleSide} />
        </mesh>

        {/* Bóng nhiệt xe tăng mục tiêu dịch chuyển vào đúng tâm ngắm theo tay xoay Cadillacs */}
        <group position={[-0.0245, 0.004, cadillacTurn * 0.03]}>
          <mesh>
            <boxGeometry args={[0.002, 0.022, 0.052]} />
            <meshBasicMaterial color={flirYardageLock > 0.2 ? '#fff6d6' : '#1b1005'} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.015, 0]}>
            <boxGeometry args={[0.002, 0.015, 0.03]} />
            <meshBasicMaterial color={flirYardageLock > 0.2 ? '#fff6d6' : '#1b1005'} toneMapped={false} />
          </mesh>
          <mesh position={[0, 0.013, -0.028]}>
            <boxGeometry args={[0.002, 0.004, 0.034]} />
            <meshBasicMaterial color={flirYardageLock > 0.2 ? '#fff6d6' : '#1b1005'} toneMapped={false} />
          </mesh>
        </group>

        {/* Thước ngắm chữ thập & 4 góc khung chia độ sắc lẹm trên màn FLIR */}
        <mesh position={[-0.025, 0, 0]}>
          <boxGeometry args={[0.002, 0.112, 0.004]} />
          <meshBasicMaterial color="#241404" />
        </mesh>
        <mesh position={[-0.025, 0, 0]}>
          <boxGeometry args={[0.002, 0.004, 0.168]} />
          <meshBasicMaterial color="#241404" />
        </mesh>
        {[-0.082, 0.082].map((zc) =>
          [-0.048, 0.048].map((yc) => (
            <mesh key={`${zc}_${yc}`} position={[-0.025, yc, zc]}>
              <boxGeometry args={[0.002, 0.014, 0.014]} />
              <meshBasicMaterial color="#1e1104" />
            </mesh>
          )),
        )}

        {/* Khung thoi khoá mục tiêu Cyan & dải chỉ số cự ly laser (exact yardage) tương phản cao khi laser dội về */}
        {flirYardageLock > 0.01 && (
          <group position={[-0.0265, 0.004, 0]} rotation={[0, -Math.PI / 2, 0]}>
            <mesh position={[0, 0, -0.0005]}>
              <ringGeometry args={[0.033, 0.051, 4]} />
              <meshBasicMaterial
                color="#091a22"
                transparent
                opacity={0.85 * flirYardageLock}
                side={THREE.DoubleSide}
              />
            </mesh>
            <mesh>
              <ringGeometry args={[0.036, 0.047, 4]} />
              <meshBasicMaterial
                color={PAL.cyan}
                transparent
                opacity={flirYardageLock}
                side={THREE.DoubleSide}
                toneMapped={false}
              />
            </mesh>
            {flirFlash > 0.02 && (
              <mesh scale={1 + (1 - flirFlash) * 0.42}>
                <ringGeometry args={[0.052, 0.06, 28]} />
                <meshBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={flirFlash * 0.82}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                />
              </mesh>
            )}
            <mesh position={[0, -0.053, 0]}>
              <planeGeometry args={[0.146, 0.018]} />
              <meshBasicMaterial color="#091a22" transparent opacity={0.85 * flirYardageLock} side={THREE.DoubleSide} />
            </mesh>
            {[-0.054, -0.018, 0.018, 0.054].map((zBar, bi) => (
              <mesh key={bi} position={[zBar, -0.053, 0.001]}>
                <planeGeometry args={[0.024, 0.011]} />
                <meshBasicMaterial color={PAL.cyan} toneMapped={false} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
        )}
      </group>
    </group>
  );
};

const C01S08: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  const pitchVib = Math.sin(t * 7.4) * 0.006 + Math.sin(t * 13.1) * 0.0025;
  const rollVib = Math.cos(t * 6.2) * 0.005;

  // Thao tác bóp và xoay cụm tay cầm đôi Cadillacs (132.40 -> 135.72 s) để ghim mục tiêu
  const pGrip = prog(t, CUE.c01_s08_grip_handles - 0.15, CUE.c01_s08_cadillacs + 0.45);
  const pFine = prog(t, CUE.c01_s08_cadillacs + 0.25, CUE.c01_s08_laser_fire);
  const cadillacTurn =
    t < CUE.c01_s08_grip_handles - 0.15
      ? Math.sin(t * 1.8) * 0.08
      : lerp(0, 1, pGrip) * (Math.sin(pGrip * Math.PI * 1.65) * 0.72) * (1 - pFine * 0.72) + pFine * 0.16;

  // Ngón cái ấn nút đỏ đo xa laser ngay mốc bounces a laser (135.72 s)
  const thumbPress = bump(t, CUE.c01_s08_laser_fire - 0.26, 0.82);

  // Tiến độ xung tia laser đo xa (135.72 -> chạm mục tiêu 137.16 -> phản hồi làm sáng cự ly trên FLIR 137.68)
  const laserOutP = prog(t, CUE.c01_s08_laser_fire, CUE.c01_s08_laser_return);
  const laserRetP = prog(t, CUE.c01_s08_laser_return, CUE.c01_s08_yardage);
  const laserActive = t >= CUE.c01_s08_laser_fire && t <= 138.95;
  const laserFade = t > 138.65 ? 1 - prog(t, 138.65, 138.98) : 1;
  const targetHit = Math.max(
    bump(t, CUE.c01_s08_laser_return - 0.06, 1.45),
    t >= CUE.c01_s08_laser_return ? 0.36 * laserFade : 0,
  );
  const flirYardageLock = prog(t, CUE.c01_s08_yardage - 0.12, CUE.c01_s08_yardage + 0.22);
  const flirFlash = bump(t, CUE.c01_s08_yardage - 0.05, 1.15);

  // Quỹ đạo Camera:
  // - 129.0..135.3 s: Góc qua vai pháo thủ ôm trọn cả khuỷu tay -> cẳng tay -> đôi bàn tay găng chiến thuật nắm Cadillacs
  //   lẫn toàn bộ màn hình ngắm nhiệt FLIR vuông vức ngay phía trên tay cầm!
  // - 135.2..139.0 s: Kéo ra góc rộng khoang studio thấy trọn hộp gương GPS trên nóc bắn tia laser Cyan dội từ vỏ mục tiêu truyền xuống màn hình FLIR.
  const cPush = prog(t, 129.0, 132.4);
  const cLaserView = prog(t, 135.25, 136.25);

  const pos1: V3 = [0.02, 1.44, 1.42];
  const look1: V3 = [0.86, 1.08, 0.72];

  const pos2: V3 = [0.18, 1.38, 1.28];
  const look2: V3 = [0.85, 1.09, 0.73];

  const pos3: V3 = [-0.3, 1.54, 1.84];
  const look3: V3 = [1.64, 1.41, 0.64];

  const midPos: V3 = [lerp(pos1[0], pos2[0], cPush), lerp(pos1[1], pos2[1], cPush), lerp(pos1[2], pos2[2], cPush)];
  const midLook: V3 = [lerp(look1[0], look2[0], cPush), lerp(look1[1], look2[1], cPush), lerp(look1[2], look2[2], cPush)];

  const camPos: V3 = [
    lerp(midPos[0], pos3[0], cLaserView),
    lerp(midPos[1], pos3[1], cLaserView),
    lerp(midPos[2], pos3[2], cLaserView),
  ];
  const camLook: V3 = [
    lerp(midLook[0], look3[0], cLaserView),
    lerp(midLook[1], look3[1], cLaserView),
    lerp(midLook[2], look3[2], cLaserView),
  ];
  const camFov = lerp(lerp(37, 36, cPush), 40, cLaserView);

  const xLaserStart = 1.36;
  const xLaserEnd = 6.29;
  const fullBeamLen = xLaserEnd - xLaserStart;
  const curOutLen = Math.max(0.01, fullBeamLen * laserOutP);
  const xRetPacket = lerp(xLaserEnd, xLaserStart, laserRetP);

  const darkFloorLineMat = plain('#36495e', 0.6, 0.3);

  return (
    <AbsoluteFill>
      <Stage {...LOOK_INTERIOR_BAY.stage} shadowCenter={[0.85, 1.05, 0.72]}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Mặt sàn khoang cơ khí studio thép tối có vòng chia độ kỹ thuật */}
        <Terrain h={BAY_FLOOR_H} size={140} seg={96} center={[2, 0]} colors={LOOK_INTERIOR_BAY.terrain} grainRepeat={28} />
        <group position={[0.6, 0.014, 0.55]}>
          {BAY_RINGS.map((r, idx) => (
            <mesh key={idx} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[r, r + 0.018, 64]} />
              <meshBasicMaterial color="#3b546e" transparent opacity={0.32 - idx * 0.04} side={THREE.DoubleSide} />
            </mesh>
          ))}
          <mesh position={[3.2, 0, 0.11]} geometry={rbox(7.8, 0.008, 0.02, 0.002)} material={darkFloorLineMat} />
        </group>

        {/* Đèn studio bổ trợ làm nổi rõ găng tay, tay cầm đôi Cadillacs và vỏ thép màn hình FLIR mà không gây loá */}
        <pointLight position={[0.45, 1.54, 1.4]} color="#e2f0ff" intensity={1.85} distance={4.2} decay={1.6} />
        <pointLight
          position={[0.66, 1.12, 0.74]}
          color={flirYardageLock > 0.3 ? PAL.amberHot : PAL.amber}
          intensity={0.22 + flirFlash * 0.75 + flirYardageLock * 0.28}
          distance={1.2}
          decay={2.0}
        />

        {/* Khoang tháp pháo cắt bổ 1:1 kèm cẳng tay/găng tay khớp động & cụm màn hình FLIR không giao cắt */}
        <group rotation={[rollVib, 0, pitchVib]}>
          <TurretInterior3D
            showCrew={true}
            blastDoorOpen={0}
            cadillacTurn={cadillacTurn}
            mirrorTilt={[-pitchVib, -rollVib]}
            gunPitch={0.015}
          />

          <GunnerForearmsAndGloves cadillacTurn={cadillacTurn} thumbPress={thumbPress} />

          <GunnerFlirSightAssembly
            cadillacTurn={cadillacTurn}
            flirYardageLock={flirYardageLock}
            flirFlash={flirFlash}
          />
        </group>

        {/* Mục tiêu vỏ xe tăng địch mô phỏng ở xa để phản hồi tia laser */}
        <SimulatedTargetHull hitGlow={targetHit} active={prog(t, 134.8, 135.8)} />

        {/* XUNG TIA LASER ĐO XA CYAN (PAL.cyan): Phóng từ kính GPS -> chạm vỏ xe địch -> phản hồi xuống cụm màn hình FLIR mới */}
        {laserActive && (
          <group>
            <mesh position={[xLaserStart + curOutLen * 0.5, 1.74, 0.66]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.014, 0.014, curOutLen, 12]} />
              <meshBasicMaterial color="#e6ffff" transparent opacity={0.95 * laserFade} toneMapped={false} />
            </mesh>
            <mesh position={[xLaserStart + curOutLen * 0.5, 1.74, 0.66]} rotation={[0, 0, Math.PI / 2]}>
              <cylinderGeometry args={[0.04, 0.04, curOutLen, 14]} />
              <meshBasicMaterial color={PAL.cyan} transparent opacity={0.38 * laserFade} toneMapped={false} />
            </mesh>

            {t >= CUE.c01_s08_laser_return &&
              [2.2, 3.2, 4.2, 5.2].map((xt) => (
                <mesh key={xt} position={[xt, 1.74, 0.66]} rotation={[0, Math.PI / 2, 0]}>
                  <ringGeometry args={[0.055, 0.075, 20]} />
                  <meshBasicMaterial
                    color={PAL.cyanSoft}
                    transparent
                    opacity={0.75 * laserFade}
                    side={THREE.DoubleSide}
                    toneMapped={false}
                  />
                </mesh>
              ))}

            {laserOutP > 0.01 && laserOutP < 0.995 && (
              <group position={[xLaserStart + curOutLen, 1.74, 0.66]}>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.028, 0.006, 0.55, 12]} />
                  <meshBasicMaterial color="#ffffff" toneMapped={false} />
                </mesh>
                <pointLight color={PAL.cyan} intensity={10} distance={3.2} decay={1.6} />
              </group>
            )}

            {t >= CUE.c01_s08_laser_return && (
              <group>
                {laserRetP < 0.995 && (
                  <group position={[xRetPacket, 1.74, 0.66]}>
                    <mesh rotation={[0, Math.PI / 2, 0]}>
                      <ringGeometry args={[0.055, 0.09, 24]} />
                      <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} toneMapped={false} />
                    </mesh>
                    <mesh rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.03, 0.03, 0.62, 12]} />
                      <meshBasicMaterial color={PAL.amberHot} transparent opacity={0.9} toneMapped={false} />
                    </mesh>
                    <pointLight color={PAL.cyan} intensity={12} distance={3.5} decay={1.6} />
                  </group>
                )}

                {/* Tia quang học dẫn truyền từ gương GPS [1.08, 1.74, 0.68] dọc trụ kính rồi khuỷu sang màn hình FLIR [0.85, 1.25, 0.73] */}
                {laserRetP > 0.55 && (
                  <group>
                    <mesh position={[1.22, 1.74, 0.67]} rotation={[0, 0, Math.PI / 2]}>
                      <cylinderGeometry args={[0.02, 0.02, 0.3, 10]} />
                      <meshBasicMaterial color={PAL.cyan} transparent opacity={0.92 * laserFade} toneMapped={false} />
                    </mesh>
                    <mesh position={[1.08, 1.52, 0.685]}>
                      <cylinderGeometry args={[0.024, 0.024, 0.44, 12]} />
                      <meshBasicMaterial color={PAL.cyan} transparent opacity={0.88 * laserFade} toneMapped={false} />
                    </mesh>
                    <mesh position={[0.96, 1.28, 0.71]} rotation={[0.14, 0.22, 1.32]}>
                      <cylinderGeometry args={[0.022, 0.022, 0.26, 12]} />
                      <meshBasicMaterial color={PAL.cyan} transparent opacity={0.88 * laserFade} toneMapped={false} />
                    </mesh>
                  </group>
                )}
              </group>
            )}
          </group>
        )}
      </Stage>

      <Label
        t={t}
        text="CADILLACS"
        x={W * 0.16}
        y={H * 0.87}
        from={CUE.c01_s08_cadillacs}
        until={137.4}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C01S08;
