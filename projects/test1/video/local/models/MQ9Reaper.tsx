// Mô hình 3D tỉ lệ thật 1:1 (mét) của UAV MQ-9 Reaper (General Atomics):
// - Chiều dài: 11.00 m (x từ -5.45 tới +5.55), Sải cánh: 20.12 m (z từ -10.06 tới +10.06), Cao: 3.81 m.
// - Mũi hướng +X, trên +Y, cánh phải +Z.
// - Khi gearDown=1 (mặc định để kiểm trên bàn xoay y=0), bánh xe tiếp đất đúng y=0; khi bay truyền gearDown=0 để tâm xoay nằm đúng trục thân y=0.
import React, { useMemo } from 'react';
import { extrude, lathe, pipe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Rivets, Wheel } from '@lib/3d/parts';
import { airfoilWing } from './aero';
import { DualHellfireRack, GBU12Paveway } from './Munitions3D';

/** Tọa độ cục bộ của tâm cầu quang học MTS-B dưới cằm (khi gearDown = 0) để cảnh nối tia laser chính xác. */
export const MQ9_MTSB_POS: [number, number, number] = [3.35, -0.66, 0];
/** Tọa độ cục bộ giá treo GBU-12 bên phải (+Z) và bên trái (-Z) khi gearDown = 0. */
export const MQ9_GBU12_RIGHT: [number, number, number] = [0.22, -0.46, 2.08];
export const MQ9_GBU12_LEFT: [number, number, number] = [0.22, -0.46, -2.08];

export type MQ9Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  /** Góc quay cánh quạt đẩy đuôi (rad) */
  propSpin?: number;
  /** Xoay ngang / chúc dọc cụm cầu mắt thần MTS-B (rad) */
  sensorYaw?: number;
  sensorPitch?: number;
  /** 1 = thả càng đỗ trên mặt đất (bánh chạm y=0); 0 = thu càng khi bay (tâm thân ở y=0) */
  gearDown?: number;
  /** Cấu hình vũ khí dưới cánh */
  loadout?: 'full' | 'clean' | 'noRightGBU12';
};

export const MQ9Reaper: React.FC<MQ9Props> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  propSpin = 0.4,
  sensorYaw = 0,
  sensorPitch = 0.25,
  gearDown = 1,
  loadout = 'full',
}) => {
  // Thân chính tiện tròn khí động dọc trục X (từ đuôi -5.15 tới mũi +5.55)
  const coreFuselage = useMemo(
    () =>
      lathe(
        [
          [0.001, -5.16],
          [0.18, -5.12],
          [0.29, -4.45],
          [0.38, -3.1],
          [0.46, -1.2],
          [0.48, 0.8],
          [0.47, 2.4],
          [0.43, 3.8],
          [0.34, 4.75],
          [0.2, 5.32],
          [0.07, 5.51],
          [0.001, 5.55],
        ],
        36,
      ),
    [],
  );

  // Bướu lưng SATCOM phình khí động mượt phía mũi của MQ-9 (nội suy cong 24 điểm để không gãy đa giác)
  const satcomHump = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 22; i++) {
      const u = i / 22;
      const x = 0.35 + u * 5.12; // 0.35 -> 5.47
      // Đường vòm mượt kiểu giọt nước lệch về phía mũi (đỉnh ở x ~ 3.45, cao y = 0.72)
      const dome = Math.sin(Math.pow(u, 0.78) * Math.PI);
      const y = 0.06 + 0.66 * Math.pow(Math.max(0, dome), 0.85) * (1 - 0.12 * (1 - u));
      pts.push([x, y]);
    }
    pts.push([5.15, -0.14], [1.05, -0.16]);
    return extrude(pts, 0.84, 0.24);
  }, []);

  // Sống bụng khí tài (ventral canoe fairing) chạy dọc thân dưới
  const bellyCanoe = useMemo(
    () =>
      extrude(
        [
          [-2.9, -0.15],
          [4.35, -0.15],
          [4.75, -0.28],
          [3.95, -0.44],
          [-1.85, -0.43],
          [-2.75, -0.3],
        ],
        0.62,
        0.13,
      ),
    [],
  );

  // Khớp yên gắn cánh trên bụng/thân giữa
  const wingSaddle = useMemo(
    () =>
      extrude(
        [
          [-1.05, -0.28],
          [0.95, -0.24],
          [0.82, 0.14],
          [-0.95, 0.12],
        ],
        1.14,
        0.12,
      ),
    [],
  );

  // Hốc hút gió lưng động cơ tuốc-bin cánh quạt Honeywell TPE331
  const engineIntake = useMemo(
    () =>
      extrude(
        [
          [-4.95, 0.16],
          [-4.55, 0.46],
          [-2.85, 0.54],
          [-2.58, 0.34],
          [-2.42, 0.22],
          [-4.85, 0.12],
        ],
        0.48,
        0.09,
      ),
    [],
  );

  // Cánh chính sải 20.12 m (mỗi bên vươn từ z=0.44 tới z=10.06 -> span = 9.62 m, vểnh dihedral +0.44 m)
  const rightWing = useMemo(
    () =>
      airfoilWing({
        rootChord: 1.38,
        rootX: 0.12,
        tipChord: 0.48,
        tipX: -0.26,
        span: 9.62,
        thickness: 0.135,
        camber: 0.028,
        dihedralY: 0.44,
        washout: -0.025,
        side: 1,
        segSpan: 14,
        segProfile: 30,
      }),
    [],
  );
  const leftWing = useMemo(
    () =>
      airfoilWing({
        rootChord: 1.38,
        rootX: 0.12,
        tipChord: 0.48,
        tipX: -0.26,
        span: 9.62,
        thickness: 0.135,
        camber: 0.028,
        dihedralY: 0.44,
        washout: -0.025,
        side: -1,
        segSpan: 14,
        segProfile: 30,
      }),
    [],
  );

  // Cánh đuôi chữ Y: 2 cánh V hướng lên (±37 độ, dài 2.35 m) + 1 vây đuôi dưới bụng (ventral fin)
  const rightVTail = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.96,
        rootX: 0,
        tipChord: 0.46,
        tipX: -0.58,
        span: 1.92,
        thickness: 0.1,
        camber: 0,
        dihedralY: 1.48,
        washout: 0,
        side: 1,
        segSpan: 8,
        segProfile: 22,
      }),
    [],
  );
  const leftVTail = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.96,
        rootX: 0,
        tipChord: 0.46,
        tipX: -0.58,
        span: 1.92,
        thickness: 0.1,
        camber: 0,
        dihedralY: 1.48,
        washout: 0,
        side: -1,
        segSpan: 8,
        segProfile: 22,
      }),
    [],
  );
  const ventralFin = useMemo(
    () =>
      extrude(
        [
          [-4.05, -0.18],
          [-5.02, -0.14],
          [-4.88, -1.04],
          [-4.36, -0.92],
        ],
        0.09,
        0.025,
      ),
    [],
  );

  // Spinner & Lá cánh quạt đẩy 3 lá TPE331 ở đuôi (x = -5.22)
  const spinnerGeo = useMemo(
    () =>
      lathe(
        [
          [0.001, -5.48],
          [0.09, -5.42],
          [0.18, -5.26],
          [0.18, -5.15],
          [0.001, -5.15],
        ],
        24,
      ),
    [],
  );
  const propBladeGeo = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.16,
        rootX: 0,
        tipChord: 0.09,
        tipX: 0.02,
        span: 1.28,
        thickness: 0.09,
        camber: 0.02,
        washout: -0.32,
        side: 1,
        segSpan: 8,
        segProfile: 18,
      }),
    [],
  );

  // Cặp ống xả động cơ kim loại sẫm hai bên lưng đuôi
  const exhaustR = useMemo(
    () =>
      pipe(
        [
          [-4.35, 0.26, 0.16],
          [-4.75, 0.28, 0.24],
          [-4.96, 0.31, 0.27],
        ],
        0.068,
        16,
      ),
    [],
  );
  const exhaustL = useMemo(
    () =>
      pipe(
        [
          [-4.35, 0.26, -0.16],
          [-4.75, 0.28, -0.24],
          [-4.96, 0.31, -0.27],
        ],
        0.068,
        16,
      ),
    [],
  );

  // Giá treo dưới cánh (pylon)
  const pylonGeo = useMemo(
    () =>
      extrude(
        [
          [-0.42, 0.04],
          [0.52, 0.04],
          [0.36, -0.27],
          [-0.32, -0.27],
        ],
        0.09,
        0.018,
      ),
    [],
  );

  // Đinh tán dọc các đường ghép tấm thân chính
  const rivetPts = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i < 14; i++) {
      const x = -2.6 + i * 0.42;
      pts.push([x, 0.14, 0.46], [x, 0.14, -0.46]);
    }
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      pts.push([1.2, Math.sin(a) * 0.47, Math.cos(a) * 0.47]);
      pts.push([-1.4, Math.sin(a) * 0.45, Math.cos(a) * 0.45]);
    }
    return pts;
  }, []);

  // Vật liệu đa tầng USAF Ghost Gray + Gunship Belly + Kim loại + Quang học
  const upperPaint = paint({
    color: '#9ea8b6',
    camo: ['#949fad', '#a9b3c0'],
    camoScale: 1.0,
    wear: 0.14,
    dirt: 0.1,
    roughness: 0.52,
    metalness: 0.26,
    repeat: 1,
    seed: 101,
  });
  const bellyPaint = paint({
    color: '#6b7584',
    camo: ['#616b79', '#75808f'],
    camoScale: 1.0,
    wear: 0.16,
    dirt: 0.18,
    roughness: 0.58,
    metalness: 0.3,
    repeat: 0.45,
    seed: 102,
  });
  const radomePaint = paint({
    color: '#a7b0bd',
    camo: ['#9da7b5'],
    camoScale: 0.8,
    wear: 0.08,
    dirt: 0.06,
    roughness: 0.46,
    metalness: 0.22,
    repeat: 0.35,
    seed: 103,
  });
  const darkIntakeMat = plain('#181c22', 0.85, 0.2);
  const burntSteelMat = plain('#3a3532', 0.42, 0.78);
  const strutMat = plain('#bfc6cf', 0.38, 0.72);
  const bladeMat = plain('#23272f', 0.42, 0.45);
  const bladeTipMat = plain('#f0b429', 0.45, 0.2);
  const mtsHousingMat = paint({ color: '#535c68', camo: ['#444c57'], wear: 0.2, dirt: 0.15, roughness: 0.5, metalness: 0.45, seed: 104 });
  const lensEmerald = plain('#16d69f', 0.06, 0.92);
  const lensAmber = plain('#d9822b', 0.08, 0.88);
  const darkOpticBezel = plain('#1a1e24', 0.35, 0.7);

  // Khi đỗ (gearDown=1), nâng trục thân lên y=1.18 m để 3 bánh xe chạm đúng mặt phẳng y=0.
  const liftY = 1.18 * gearDown;

  return (
    <group position={position} rotation={rotation}>
      <group position={[0, liftY, 0]}>
        {/* Thân chính + Bướu mũi SATCOM + Sống bụng + Yên cánh */}
        <mesh geometry={coreFuselage} material={upperPaint} castShadow receiveShadow />
        <mesh geometry={satcomHump} material={radomePaint} castShadow receiveShadow />
        <mesh geometry={bellyCanoe} material={bellyPaint} castShadow receiveShadow />
        <mesh geometry={wingSaddle} material={bellyPaint} castShadow receiveShadow />

        {/* Hốc hút gió động cơ lưng & Cửa hút gió tối + Ống xả đôi */}
        <mesh geometry={engineIntake} material={upperPaint} castShadow receiveShadow />
        <mesh position={[-2.54, 0.42, 0]} geometry={rbox(0.12, 0.18, 0.34, 0.03)} material={darkIntakeMat} />
        <mesh geometry={exhaustR} material={burntSteelMat} castShadow />
        <mesh geometry={exhaustL} material={burntSteelMat} castShadow />

        {/* Ống đo áp suất không khí Pitot trước mũi & Anten vây lưng UHF/SATCOM */}
        <mesh position={[5.68, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={strutMat}>
          <cylinderGeometry args={[0.008, 0.014, 0.36, 8]} />
        </mesh>
        <mesh position={[0.45, 0.56, 0]} geometry={rbox(0.32, 0.24, 0.03, 0.01)} material={radomePaint} castShadow />
        <mesh position={[-1.65, 0.52, 0]} geometry={rbox(0.26, 0.2, 0.03, 0.01)} material={radomePaint} castShadow />
        <mesh position={[-0.8, -0.5, 0]} geometry={rbox(0.24, 0.18, 0.025, 0.008)} material={bellyPaint} />

        <Rivets points={rivetPts} r={0.013} color="#525b68" />

        {/* Cánh chính sải 20.12 m */}
        <group position={[0, -0.1, 0.44]}>
          <mesh geometry={rightWing} material={upperPaint} castShadow receiveShadow />
          {/* Đèn đầu mút cánh phải (xanh lá) */}
          <mesh position={[-0.24, 0.45, 9.62]} material={plain('#28e070', 0.2, 0.3)}>
            <sphereGeometry args={[0.045, 10, 8]} />
          </mesh>
        </group>
        <group position={[0, -0.1, -0.44]}>
          <mesh geometry={leftWing} material={upperPaint} castShadow receiveShadow />
          {/* Đèn đầu mút cánh trái (đỏ) */}
          <mesh position={[-0.24, 0.45, -9.62]} material={plain('#ff3b3b', 0.2, 0.3)}>
            <sphereGeometry args={[0.045, 10, 8]} />
          </mesh>
        </group>

        {/* Cụm đuôi chữ Y (2 cánh V hướng lên + 1 vây bụng dưới) */}
        <group position={[-4.55, 0.16, 0.14]}>
          <mesh geometry={rightVTail} material={upperPaint} castShadow receiveShadow />
        </group>
        <group position={[-4.55, 0.16, -0.14]}>
          <mesh geometry={leftVTail} material={upperPaint} castShadow receiveShadow />
        </group>
        <mesh geometry={ventralFin} material={bellyPaint} castShadow receiveShadow />

        {/* Cụm cánh quạt đẩy 3 lá Honeywell TPE331 phía đuôi */}
        <mesh geometry={spinnerGeo} material={bellyPaint} castShadow />
        <group position={[-5.24, 0, 0]} rotation={[propSpin, 0, 0]}>
          {[0, 1, 2].map((i) => (
            <group key={i} rotation={[(i * Math.PI * 2) / 3, 0.28, 0]}>
              <mesh geometry={propBladeGeo} material={bladeMat} castShadow />
              <mesh position={[0.02, 0, 1.24]} geometry={rbox(0.085, 0.016, 0.09, 0.005)} material={bladeTipMat} />
            </group>
          ))}
        </group>

        {/* Cầu mắt thần đa quang phổ AN/DAS-1 MTS-B dưới cằm (x = 3.35, y = -0.66) */}
        <group position={[3.35, -0.46, 0]} rotation={[0, sensorYaw, 0]}>
          {/* Khớp cổ xoay Azimuth */}
          <mesh position={[0, -0.04, 0]} material={mtsHousingMat} castShadow>
            <cylinderGeometry args={[0.19, 0.22, 0.16, 24]} />
          </mesh>
          {/* Khảu cầu quang học xoay Pitch */}
          <group position={[0, -0.2, 0]} rotation={[0, 0, -sensorPitch]}>
            <mesh material={mtsHousingMat} castShadow receiveShadow>
              <sphereGeometry args={[0.23, 28, 22]} />
            </mesh>
            {/* Khung viền cửa sổ đa thấu kính */}
            <mesh position={[0.16, -0.02, 0]} geometry={rbox(0.14, 0.24, 0.24, 0.04)} material={darkOpticBezel} />
            {/* Thấu kính chính FLIR / TV lớn */}
            <mesh position={[0.22, 0.02, 0.05]} rotation={[0, 0, Math.PI / 2]} material={lensEmerald}>
              <cylinderGeometry args={[0.068, 0.068, 0.03, 20]} />
            </mesh>
            {/* Thấu kính SWIR / Ngày-Đêm */}
            <mesh position={[0.22, 0.03, -0.065]} rotation={[0, 0, Math.PI / 2]} material={lensAmber}>
              <cylinderGeometry args={[0.042, 0.042, 0.03, 18]} />
            </mesh>
            {/* Cửa phát Laser đo xa & chiếu xạ mục tiêu */}
            <mesh position={[0.22, -0.075, 0]} rotation={[0, 0, Math.PI / 2]} material={lensEmerald}>
              <cylinderGeometry args={[0.032, 0.032, 0.03, 16]} />
            </mesh>
          </group>
        </group>

        {/* 6 Giá treo dưới cánh & Cấu hình vũ khí tiêu chuẩn (2x GBU-12 + 4x AGM-114 Hellfire) */}
        {[-1, 1].map((s) => (
          <React.Fragment key={s}>
            {/* Pylon trong (z = ±2.08 m): GBU-12 Paveway II */}
            <group position={[0.18, -0.13, s * 2.08]}>
              <mesh geometry={pylonGeo} material={bellyPaint} castShadow />
              {loadout !== 'clean' && !(loadout === 'noRightGBU12' && s === 1) && (
                <GBU12Paveway position={[0.04, -0.34, 0]} />
              )}
            </group>
            {/* Pylon giữa (z = ±3.65 m): Giá đôi M299 mang 2x AGM-114 Hellfire (tổng 4 quả) */}
            <group position={[0.1, -0.06, s * 3.65]}>
              <mesh geometry={pylonGeo} material={bellyPaint} castShadow />
              {loadout !== 'clean' && <DualHellfireRack position={[0.06, -0.28, 0]} count={2} />}
            </group>
            {/* Pylon ngoài nhẹ (z = ±5.15 m) */}
            <group position={[0.02, 0.01, s * 5.15]} scale={[0.75, 0.75, 0.75]}>
              <mesh geometry={pylonGeo} material={bellyPaint} castShadow />
            </group>
          </React.Fragment>
        ))}

        {/* Càng đáp 3 bánh thu thả được (gearDown: 1 = thả đỗ trên mặt đất, 0 = thu gọn vào khoang bụng) */}
        {gearDown > 0.02 && (
          <group>
            {/* Càng mũi (x = 3.95, bánh r = 0.20 m -> trục bánh ở y = -0.98 để chạm đất -1.18) */}
            <group position={[3.95, -0.38, 0]} rotation={[0, 0, (1 - gearDown) * 1.45]}>
              <mesh position={[0, -0.3, 0]} material={strutMat} castShadow>
                <cylinderGeometry args={[0.032, 0.028, 0.62, 12]} />
              </mesh>
              <mesh position={[-0.1, -0.18, 0]} rotation={[0, 0, 0.45]} material={strutMat}>
                <cylinderGeometry args={[0.018, 0.018, 0.38, 8]} />
              </mesh>
              {/* Nắp khoang càng mũi */}
              <mesh position={[0, -0.12, 0.14]} geometry={rbox(0.54, 0.24, 0.02, 0.008)} material={bellyPaint} />
              <Wheel r={0.2} width={0.12} position={[0, -0.6, 0]} rim="#7b848f" tire="#232528" bolts={6} />
            </group>

            {/* Hai càng chính chữ A (x = -0.32, z = ±1.42 m, bánh r = 0.27 m -> trục bánh ở y = -0.91) */}
            {[-1, 1].map((s) => (
              <group key={s} position={[-0.32, -0.32, s * 0.55]} rotation={[(1 - gearDown) * s * -1.4, 0, 0]}>
                {/* Thanh chống chính nghiêng ra ngoài tới z = ±1.42, y = -0.91 */}
                <mesh
                  position={[0, -0.3, s * 0.43]}
                  rotation={[s * -0.96, 0, 0]}
                  material={strutMat}
                  castShadow
                >
                  <cylinderGeometry args={[0.04, 0.034, 1.06, 12]} />
                </mesh>
                <group position={[0, -0.59, s * 0.87]} scale={[1, 1, s]}>
                  <Wheel r={0.27} width={0.16} rim="#7b848f" tire="#222428" bolts={8} />
                </group>
              </group>
            ))}
          </group>
        )}
      </group>
    </group>
  );
};
