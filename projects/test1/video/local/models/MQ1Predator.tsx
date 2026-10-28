// Mô hình 3D tỉ lệ thật 1:1 (mét) của UAV thế hệ trước MQ-1 Predator (General Atomics) để đối chiếu quy mô với MQ-9 ở S01:
// - Chiều dài: 8.22 m (x từ -4.05 tới +4.17), Sải cánh: 14.80 m (z từ -7.40 tới +7.40), Cao: 2.10 m.
// - Đặc điểm nhận dạng khác biệt rõ với MQ-9: thân mảnh nhẹ, cánh thẳng không vểnh nhiều, ĐUÔI CHỮ V CHÚC XUỐNG (-35 độ), cánh quạt đẩy 2 lá Rotax 914, chỉ 2 giá treo Hellfire đơn.
import React, { useMemo } from 'react';
import { extrude, lathe, rbox } from '@lib/3d/geom';
import { paint, plain } from '@lib/3d/materials';
import { Wheel } from '@lib/3d/parts';
import { airfoilWing } from './aero';
import { AGM114Hellfire } from './Munitions3D';

export type MQ1Props = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  propSpin?: number;
  gearDown?: number;
  armed?: boolean;
};

export const MQ1Predator: React.FC<MQ1Props> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  propSpin = 0.6,
  gearDown = 1,
  armed = true,
}) => {
  // Thân ống mảnh đặc trưng của MQ-1 + bầu mũi SATCOM tròn nhỏ gọn hơn hẳn MQ-9
  const boomGeo = useMemo(
    () =>
      lathe(
        [
          [0.001, -3.98],
          [0.14, -3.92],
          [0.22, -3.2],
          [0.27, -1.4],
          [0.31, 0.8],
          [0.32, 2.3],
          [0.27, 3.45],
          [0.16, 3.98],
          [0.001, 4.17],
        ],
        32,
      ),
    [],
  );

  // Bướu mũi dạng muỗng mượt đặc trưng MQ-1 Predator
  const noseDome = useMemo(() => {
    const pts: [number, number][] = [];
    for (let i = 0; i <= 18; i++) {
      const u = i / 18;
      const x = 1.15 + u * 2.98;
      const dome = Math.sin(Math.pow(u, 0.8) * Math.PI);
      pts.push([x, 0.05 + 0.4 * Math.pow(Math.max(0, dome), 0.85)]);
    }
    pts.push([3.75, -0.14], [1.35, -0.14]);
    return extrude(pts, 0.64, 0.2);
  }, []);

  // Vỏ động cơ piston Rotax 914 phía đuôi
  const enginePod = useMemo(
    () =>
      extrude(
        [
          [-3.94, 0.08],
          [-3.72, 0.34],
          [-2.75, 0.35],
          [-2.5, 0.18],
          [-3.88, 0.05],
        ],
        0.38,
        0.08,
      ),
    [],
  );

  // Cánh chính mảnh sải 14.80 m (mỗi bên từ z=0.30 tới z=7.40 -> span = 7.10 m)
  const rightWing = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.96,
        rootX: 0.08,
        tipChord: 0.38,
        tipX: -0.08,
        span: 7.1,
        thickness: 0.13,
        camber: 0.03,
        dihedralY: 0.12,
        washout: -0.02,
        side: 1,
        segSpan: 12,
        segProfile: 26,
      }),
    [],
  );
  const leftWing = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.96,
        rootX: 0.08,
        tipChord: 0.38,
        tipX: -0.08,
        span: 7.1,
        thickness: 0.13,
        camber: 0.03,
        dihedralY: 0.12,
        washout: -0.02,
        side: -1,
        segSpan: 12,
        segProfile: 26,
      }),
    [],
  );

  // ĐUÔI CHỮ V CHÚC XUỐNG ĐẶC TRƯNG CỦA MQ-1 (anhedral dihedralY = -0.92 m)
  const rightInvVTail = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.72,
        rootX: 0,
        tipChord: 0.36,
        tipX: -0.34,
        span: 1.42,
        thickness: 0.09,
        camber: 0,
        dihedralY: -0.88,
        washout: 0,
        side: 1,
        segSpan: 8,
        segProfile: 20,
      }),
    [],
  );
  const leftInvVTail = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.72,
        rootX: 0,
        tipChord: 0.36,
        tipX: -0.34,
        span: 1.42,
        thickness: 0.09,
        camber: 0,
        dihedralY: -0.88,
        washout: 0,
        side: -1,
        segSpan: 8,
        segProfile: 20,
      }),
    [],
  );

  // Cánh quạt đẩy 2 lá nhỏ gọn
  const bladeGeo = useMemo(
    () =>
      airfoilWing({
        rootChord: 0.12,
        rootX: 0,
        tipChord: 0.065,
        tipX: 0.01,
        span: 0.92,
        thickness: 0.09,
        camber: 0.02,
        washout: -0.28,
        side: 1,
        segSpan: 7,
        segProfile: 16,
      }),
    [],
  );

  const pylonGeo = useMemo(
    () =>
      extrude(
        [
          [-0.28, 0.02],
          [0.34, 0.02],
          [0.24, -0.2],
          [-0.2, -0.2],
        ],
        0.06,
        0.012,
      ),
    [],
  );

  const bodyPaint = paint({
    color: '#c2cad3',
    camo: ['#b7c0ca', '#ccd3dc'],
    camoScale: 1.0,
    wear: 0.1,
    dirt: 0.08,
    roughness: 0.5,
    metalness: 0.2,
    repeat: 0.45,
    seed: 111,
  });
  const underPaint = paint({
    color: '#919ba8',
    camo: ['#85909e'],
    wear: 0.14,
    dirt: 0.14,
    roughness: 0.58,
    metalness: 0.24,
    repeat: 0.45,
    seed: 112,
  });
  const propMat = plain('#262a30', 0.45, 0.4);
  const strutMat = plain('#c5ccd4', 0.4, 0.7);
  const opticMat = plain('#18c89b', 0.08, 0.9);

  // Khi gearDown=1 nâng thân lên y=0.98 m để bánh chạm đất và đuôi chữ V chúc xuống không chạm sàn
  const liftY = 0.98 * gearDown;

  return (
    <group position={position} rotation={rotation}>
      <group position={[0, liftY, 0]}>
        <mesh geometry={boomGeo} material={bodyPaint} castShadow receiveShadow />
        <mesh geometry={noseDome} material={bodyPaint} castShadow receiveShadow />
        <mesh geometry={enginePod} material={underPaint} castShadow receiveShadow />

        {/* Cánh chính sải 14.8 m */}
        <group position={[0, -0.06, 0.3]}>
          <mesh geometry={rightWing} material={bodyPaint} castShadow receiveShadow />
        </group>
        <group position={[0, -0.06, -0.3]}>
          <mesh geometry={leftWing} material={bodyPaint} castShadow receiveShadow />
        </group>

        {/* Đuôi chữ V chúc xuống (Inverted V-Tail) */}
        <group position={[-3.48, 0.06, 0.1]}>
          <mesh geometry={rightInvVTail} material={underPaint} castShadow receiveShadow />
        </group>
        <group position={[-3.48, 0.06, -0.1]}>
          <mesh geometry={leftInvVTail} material={underPaint} castShadow receiveShadow />
        </group>

        {/* Cánh quạt đẩy 2 lá phía đuôi */}
        <mesh position={[-4.02, 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={underPaint}>
          <coneGeometry args={[0.12, 0.22, 18]} />
        </mesh>
        <group position={[-4.0, 0.02, 0]} rotation={[propSpin, 0, 0]}>
          {[0, 1].map((i) => (
            <group key={i} rotation={[i * Math.PI, 0.24, 0]}>
              <mesh geometry={bladeGeo} material={propMat} castShadow />
            </group>
          ))}
        </group>

        {/* Quả cầu cảm biến AN/AAS-52 nhỏ hơn dưới cằm */}
        <group position={[2.75, -0.34, 0]}>
          <mesh material={underPaint} castShadow>
            <sphereGeometry args={[0.16, 22, 16]} />
          </mesh>
          <mesh position={[0.14, -0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={opticMat}>
            <cylinderGeometry args={[0.05, 0.05, 0.03, 16]} />
          </mesh>
        </group>

        {/* 2 Giá treo đơn mang 2 quả AGM-114 Hellfire */}
        {armed &&
          [-1, 1].map((s) => (
            <group key={s} position={[0.06, -0.09, s * 1.95]}>
              <mesh geometry={pylonGeo} material={underPaint} castShadow />
              <mesh position={[0.02, -0.21, 0]} geometry={rbox(0.85, 0.05, 0.08, 0.01)} material={underPaint} />
              <AGM114Hellfire position={[0.04, -0.31, 0]} />
            </group>
          ))}

        {/* Càng đáp 3 bánh mảnh */}
        {gearDown > 0.02 && (
          <group>
            <group position={[2.95, -0.22, 0]} rotation={[0, 0, (1 - gearDown) * 1.4]}>
              <mesh position={[0, -0.3, 0]} material={strutMat} castShadow>
                <cylinderGeometry args={[0.024, 0.02, 0.58, 10]} />
              </mesh>
              <Wheel r={0.16} width={0.09} position={[0, -0.6, 0]} rim="#8c96a2" tire="#25282c" bolts={6} />
            </group>
            {[-1, 1].map((s) => (
              <group key={s} position={[-0.25, -0.18, s * 0.35]} rotation={[(1 - gearDown) * s * -1.4, 0, 0]}>
                <mesh position={[0, -0.29, s * 0.42]} rotation={[s * -0.94, 0, 0]} material={strutMat} castShadow>
                  <cylinderGeometry args={[0.028, 0.024, 0.96, 10]} />
                </mesh>
                <group position={[0, -0.59, s * 0.85]} scale={[1, 1, s]}>
                  <Wheel r={0.21} width={0.12} rim="#8c96a2" tire="#25282c" bolts={6} />
                </group>
              </group>
            ))}
          </group>
        )}
      </group>
    </group>
  );
};
