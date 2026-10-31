// C01S08 (45.10–51.54 s): Macro 1.8 m giải phẫu cắt bổ 180° đầu đạn nổ lõm HEAT ngay trên nóc tháp pháo MBT.
// Chạm ngòi áp điện (46.02) -> Xung điện chạy dọc dây dẫn -> Kích nổ RDX (47.18) -> Sóng nổ ép sập phễu đồng 60° (48.42) -> Phóng luồng kim loại Munroe (50.30).
import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Trail } from '@skill/military/3d/fx';
import { rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { CUE } from '../cues';
import { HUDLabel, STAGE_LAB, THEME } from '../design';
import { ShapedChargeCutaway } from '../parts/ShapedChargeCutaway';

const ARMOR_THICK = 0.10;
const ARMOR_HALF_W = 0.65;
const ARMOR_DEPTH = 0.43;
const BOLT_X = [-0.55, -0.43, -0.31, 0.31, 0.43, 0.55];

// Dây dẫn tín hiệu điện đối xứng hai bên vách trong từ tinh thể áp điện mũi (y = 0.042) lên kíp nổ đuôi (y = 0.995)
const WIRE_PATH_LEFT: V3[] = [
  [-0.005, 0.042, 0.005],
  [-0.010, 0.118, 0.005],
  [-0.068, 0.170, 0.005],
  [-0.118, 0.250, 0.005],
  [-0.148, 0.330, 0.005],
  [-0.160, 0.365, 0.005],
  [-0.160, 0.520, 0.005],
  [-0.160, 0.690, 0.005],
  [-0.158, 0.840, 0.005],
  [-0.158, 0.945, 0.005],
  [-0.105, 0.978, 0.005],
  [-0.020, 0.995, 0.005],
];
const WIRE_PATH_RIGHT: V3[] = WIRE_PATH_LEFT.map(([x, y, z]) => [-x, y, z]);

const WIRE_CURVE_L = new THREE.CatmullRomCurve3(WIRE_PATH_LEFT.map((p) => new THREE.Vector3(...p)));
const WIRE_CURVE_R = new THREE.CatmullRomCurve3(WIRE_PATH_RIGHT.map((p) => new THREE.Vector3(...p)));
const WIRE_SAMPLES_L: V3[] = Array.from({ length: 64 }, (_, i) => {
  const p = WIRE_CURVE_L.getPointAt(i / 63);
  return [p.x, p.y, p.z];
});
const WIRE_SAMPLES_R: V3[] = Array.from({ length: 64 }, (_, i) => {
  const p = WIRE_CURVE_R.getPointAt(i / 63);
  return [p.x, p.y, p.z];
});

// Vật liệu đồng bộ chính xác với tấm giáp nóc trong ShapedChargeCutaway & MBT để ăn khớp liền khối 100%
const MAT_ROOF_CAMO = paint({
  color: '#939d89',
  camo: ['#77806f', '#aea893'],
  camoScale: 1.15,
  wear: 0.34,
  dirt: 0.26,
  roughness: 0.56,
  metalness: 0.38,
  repeat: 0.5,
  seed: 41,
});
const MAT_TURRET_SIDE = paint({
  color: '#879378',
  camo: ['#65705a', '#a69d7e'],
  camoScale: 1.1,
  wear: 0.3,
  dirt: 0.24,
  roughness: 0.58,
  metalness: 0.36,
  repeat: 0.45,
  seed: 17,
});
const MAT_STEEL_CUT = plain('#8b97a4', 0.34, 0.66);
const MAT_BEVEL_LINE = plain('#4e5863', 0.45, 0.6);
const MAT_SPALL_LINER = plain('#30382c', 0.78, 0.08);
const MAT_DARK_HARDWARE = plain('#343d47', 0.42, 0.62);
const MAT_OPTIC_GREEN = plain('#14c97e', 0.12, 0.86, { emissive: '#095937', emissiveIntensity: 0.45 });
const MAT_OPTIC_AMBER = plain('#f5a618', 0.14, 0.84, { emissive: '#8c5200', emissiveIntensity: 0.42 });
const MAT_PERISCOPE = plain('#142532', 0.16, 0.8);
const MAT_INTERIOR_RIB = plain('#141c25', 0.75, 0.42);

/** Tấm giáp trung tâm nguyên vẹn ở y = 0 trước thời điểm ngòi chạm nóc (t < 46.02 s) để đầu đạn lao từ y = +0.35 xuống y = 0 mà nóc xe đứng yên. */
const PreContactCenterArmor: React.FC = () => {
  const geo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-ARMOR_HALF_W, 0);
    s.lineTo(ARMOR_HALF_W, 0);
    s.lineTo(ARMOR_HALF_W, -ARMOR_DEPTH + 0.05);
    s.lineTo(ARMOR_HALF_W - 0.05, -ARMOR_DEPTH);
    s.lineTo(-ARMOR_HALF_W + 0.05, -ARMOR_DEPTH);
    s.lineTo(-ARMOR_HALF_W, -ARMOR_DEPTH + 0.05);
    s.closePath();

    const slab = new THREE.ExtrudeGeometry(s, { depth: ARMOR_THICK, bevelEnabled: false });
    slab.rotateX(Math.PI / 2);
    slab.computeVertexNormals();

    const liner = new THREE.ExtrudeGeometry(s, { depth: 0.011, bevelEnabled: false });
    liner.rotateX(Math.PI / 2);
    liner.translate(0, -ARMOR_THICK, 0);
    liner.computeVertexNormals();

    const cutShape = new THREE.Shape([
      new THREE.Vector2(-ARMOR_HALF_W, -ARMOR_THICK),
      new THREE.Vector2(ARMOR_HALF_W, -ARMOR_THICK),
      new THREE.Vector2(ARMOR_HALF_W, 0),
      new THREE.Vector2(-ARMOR_HALF_W, 0),
    ]);
    const cutFace = new THREE.ShapeGeometry(cutShape, 1);
    return { slab, liner, cutFace };
  }, []);

  return (
    <group>
      <mesh geometry={geo.slab} material={MAT_ROOF_CAMO} castShadow receiveShadow />
      <mesh geometry={geo.liner} material={MAT_SPALL_LINER} receiveShadow />
      <mesh geometry={geo.cutFace} material={MAT_STEEL_CUT} position={[0, 0, 0.0004]} receiveShadow />
      <mesh
        geometry={rbox(ARMOR_HALF_W * 2, 0.003, 0.0015, 0.0005)}
        material={MAT_BEVEL_LINE}
        position={[0, -0.0018, 0.0008]}
      />
      <mesh
        geometry={rbox(ARMOR_HALF_W * 2, 0.011, 0.002, 0.001)}
        material={MAT_SPALL_LINER}
        position={[0, -ARMOR_THICK - 0.0055, 0.0004]}
      />
      <mesh
        geometry={rbox(1.16, 0.013, 0.034, 0.004)}
        material={MAT_DARK_HARDWARE}
        position={[0, 0.006, -0.32]}
        castShadow
      />
      {BOLT_X.map((bx, idx) => (
        <mesh key={idx} position={[bx, 0.009, -0.19]} material={MAT_DARK_HARDWARE} castShadow>
          <cylinderGeometry args={[0.016, 0.016, 0.018, 6]} />
        </mesh>
      ))}
    </group>
  );
};

/** Kết cấu nóc tháp pháo MBT mở rộng xung quanh (y <= 0, z < 0) với nắp trưởng xe, vòng kính tiềm vọng & CITV mờ phía sau. */
const TurretRoofContext: React.FC = () => {
  return (
    <group>
      {/* Hai cánh tấm thép nóc mở rộng sang trái (-X) và phải (+X) ăn khớp phẳng với mặt cắt z = 0 */}
      {([-1, 1] as const).map((sgn) => (
        <group key={sgn}>
          <mesh
            position={[sgn * 1.451, -0.05, -0.825]}
            geometry={rbox(1.598, 0.10, 1.65, 0.004)}
            material={MAT_ROOF_CAMO}
            receiveShadow
          />
          <mesh position={[sgn * 1.451, -0.05, 0.0003]} material={MAT_STEEL_CUT}>
            <planeGeometry args={[1.596, 0.10]} />
          </mesh>
          <mesh
            position={[sgn * 1.451, -0.1055, -0.825]}
            geometry={rbox(1.598, 0.011, 1.65, 0.002)}
            material={MAT_SPALL_LINER}
          />
          <mesh
            position={[sgn * 2.32, -0.26, -0.85]}
            rotation={[0, 0, -sgn * 0.48]}
            geometry={rbox(0.42, 0.46, 1.65, 0.012)}
            material={MAT_TURRET_SIDE}
          />
        </group>
      ))}

      {/* Phần tấm nóc nối liền phía sau rãnh cắt trung tâm (z = -1.65 .. -0.432) */}
      <mesh
        position={[0, -0.05, -1.041]}
        geometry={rbox(1.304, 0.10, 1.218, 0.003)}
        material={MAT_ROOF_CAMO}
        receiveShadow
      />
      <mesh
        position={[0, -0.1055, -1.041]}
        geometry={rbox(1.304, 0.011, 1.218, 0.002)}
        material={MAT_SPALL_LINER}
      />

      {/* Xà gân chịu lực dưới trần khoang chiến đấu ở hai bên xa (để trống hoàn toàn vùng trung tâm cho luồng xuyên & mảnh spall) */}
      {[-1.15, 1.15].map((xr, i) => (
        <mesh
          key={i}
          position={[xr, -0.42, -0.82]}
          geometry={rbox(0.09, 0.64, 1.56, 0.01)}
          material={MAT_INTERIOR_RIB}
        />
      ))}
      <mesh
        position={[0, -0.52, -1.58]}
        geometry={rbox(4.4, 0.92, 0.1, 0.01)}
        material={MAT_INTERIOR_RIB}
      />

      {/* Cụm kính ngắm toàn cảnh trưởng xe (CITV) bên trái phía sau */}
      <group position={[-1.02, 0.0, -0.68]} rotation={[0, 0.38, 0]}>
        <mesh position={[0, 0.06, 0]} material={MAT_TURRET_SIDE} castShadow>
          <cylinderGeometry args={[0.19, 0.23, 0.12, 24]} />
        </mesh>
        <mesh position={[0, 0.19, 0]} material={MAT_TURRET_SIDE} castShadow>
          <cylinderGeometry args={[0.17, 0.18, 0.19, 24]} />
        </mesh>
        <mesh position={[0.02, 0.295, 0]} material={MAT_DARK_HARDWARE}>
          <cylinderGeometry args={[0.14, 0.175, 0.036, 24]} />
        </mesh>
        <mesh position={[0.13, 0.19, 0]} geometry={rbox(0.1, 0.12, 0.19, 0.01)} material={MAT_DARK_HARDWARE} />
        <mesh position={[0.178, 0.19, -0.04]} geometry={rbox(0.014, 0.08, 0.075, 0.003)} material={MAT_OPTIC_GREEN} />
        <mesh position={[0.178, 0.19, 0.055]} geometry={rbox(0.014, 0.065, 0.055, 0.003)} material={MAT_OPTIC_AMBER} />
      </group>

      {/* Vòng tháp chỉ huy trưởng xe & 6 kính tiềm vọng bên phải phía sau */}
      <group position={[1.08, 0.0, -0.66]}>
        <mesh position={[0, 0.045, 0]} material={MAT_TURRET_SIDE} castShadow>
          <cylinderGeometry args={[0.37, 0.40, 0.09, 26]} />
        </mesh>
        <mesh position={[0, 0.10, 0]} material={MAT_DARK_HARDWARE}>
          <cylinderGeometry args={[0.30, 0.30, 0.035, 26]} />
        </mesh>
        {Array.from({ length: 6 }, (_, pi) => {
          const a = (pi / 6) * Math.PI * 2 + 0.3;
          return (
            <group key={pi} position={[Math.cos(a) * 0.33, 0.115, Math.sin(a) * 0.33]} rotation={[0, -a, 0]}>
              <mesh geometry={rbox(0.078, 0.065, 0.09, 0.008)} material={MAT_DARK_HARDWARE} />
              <mesh position={[0.036, 0.004, 0]} geometry={rbox(0.015, 0.038, 0.07, 0.002)} material={MAT_PERISCOPE} />
            </group>
          );
        })}
      </group>

      {/* Hộp kính ngắm chính pháo thủ (GPS Doghouse) ở góc phải xa */}
      <group position={[1.64, 0.105, -1.08]} rotation={[0, -0.22, 0]}>
        <mesh geometry={rbox(0.48, 0.21, 0.36, 0.02)} material={MAT_TURRET_SIDE} castShadow />
        <mesh position={[0, 0.11, 0.02]} geometry={rbox(0.52, 0.026, 0.40, 0.008)} material={MAT_DARK_HARDWARE} />
        <mesh position={[0, -0.005, 0.175]} geometry={rbox(0.32, 0.14, 0.04, 0.006)} material={MAT_DARK_HARDWARE} />
        <mesh position={[-0.06, -0.005, 0.194]} geometry={rbox(0.12, 0.09, 0.012, 0.002)} material={MAT_OPTIC_GREEN} />
        <mesh position={[0.08, -0.005, 0.194]} geometry={rbox(0.08, 0.075, 0.012, 0.002)} material={MAT_OPTIC_AMBER} />
      </group>

      {/* Vạch thước kỹ thuật 3D trên mặt cắt tháp pháo trong buồng STAGE_LAB */}
      {[-1.8, -1.5, -1.2, -0.9, 0.9, 1.2, 1.5, 1.8].map((xt, idx) => (
        <mesh key={idx} position={[xt, -0.05, 0.002]}>
          <boxGeometry args={[0.004, 0.036, 0.002]} />
          <meshBasicMaterial color={THEME.apsCyan} transparent opacity={0.35} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
};

const C01S08: React.FC = () => {
  const t = useT();
  const { W, H, SAFE } = useSize();

  // ---------------- 1. DIỄN HOẠT VẬT LÝ GIẢI PHẪU KHỚP TỪNG MỐC CUE ----------------
  // (1) 45.10 -> 46.02 s: Đầu đạn lao nốt 0.35 m cuối cùng chạm khít mũi ngòi áp điện xuống mặt thép nóc y = 0 đúng 46.02 s
  const approachP = prog(t, CUE.c01_roof_approach, CUE.c01_roof_contact, Easing.in(Easing.quad));
  const warheadY = lerp(0.35, 0.0, approachP);
  const hasContacted = t >= CUE.c01_roof_contact;

  // Tia lửa áp điện xanh-trắng tại mũi ngòi (46.02 s) & xung điện cao thế chạy dọc dây dẫn lên kíp nổ đuôi (46.02 -> 47.18 s)
  const piezoFlash = bump(t, CUE.c01_roof_contact, 0.72);
  const wirePulseU = prog(
    t,
    CUE.c01_roof_contact,
    CUE.c01_heat_trigger - 0.02,
    Easing.inOut(Easing.quad),
  );
  const wireActive = t >= CUE.c01_roof_contact && t <= CUE.c01_heat_trigger + 0.45;
  const wireGlowFade = 1 - prog(t, CUE.c01_heat_trigger, CUE.c01_heat_trigger + 0.45);
  const baseDetFlash = bump(t, CUE.c01_heat_trigger - 0.08, 0.48);

  const pulsePtL = WIRE_CURVE_L.getPointAt(Math.min(1, Math.max(0, wirePulseU)));
  const pulsePtR = WIRE_CURVE_R.getPointAt(Math.min(1, Math.max(0, wirePulseU)));

  // (2) 47.18 -> 48.90 s: Mặt sóng kích nổ Chapman-Jouguet quét từ kíp nổ đuôi qua đĩa nắn sóng trùm xuống thuốc nổ RDX
  const detonate = prog(
    t,
    CUE.c01_heat_trigger,
    CUE.c01_cone_collapse + 0.48,
    Easing.out(Easing.quad),
  );

  // (3) 48.42 -> 50.55 s: Sóng nổ ép bẹp phễu đồng 60° khép vào trục tâm tạo cổ hội tụ chữ Y rực lửa
  const collapse = prog(
    t,
    CUE.c01_cone_collapse,
    CUE.c01_copper_jet + 0.25,
    Easing.out(Easing.quad),
  );

  // (4) 50.30 -> 51.54 s: Luồng kim loại đồng nóng chảy Munroe phóng vọt khỏi đỉnh phễu đâm xuyên tấm giáp thép nóc:
  // Đồng bộ vật lý giữa mũi luồng xuyên (jet: 0.30 chạm mặt trên y=0, 0.40 chạm mặt dưới y=-0.10) và lỗ khoan thép (pierce: 0.48 thủng đáy tấm giáp)
  const jetStandoff = prog(t, CUE.c01_copper_jet, CUE.c01_copper_jet + 0.24, Easing.in(Easing.quad));
  const jetArmor = prog(t, CUE.c01_copper_jet + 0.24, CUE.c01_copper_jet + 0.62, Easing.linear);
  const jetThrough = prog(
    t,
    CUE.c01_copper_jet + 0.62,
    CUE.c01_jet_interior,
    Easing.out(Easing.quad),
  );

  let jet = 0;
  if (t >= CUE.c01_copper_jet) {
    if (t < CUE.c01_copper_jet + 0.24) {
      jet = lerp(0, 0.30, jetStandoff);
    } else if (t < CUE.c01_copper_jet + 0.62) {
      jet = lerp(0.30, 0.40, jetArmor);
    } else {
      jet = lerp(0.40, 0.82, jetThrough);
    }
  }

  let pierce = 0;
  if (t >= CUE.c01_copper_jet + 0.24) {
    if (t < CUE.c01_copper_jet + 0.62) {
      pierce = lerp(0, 0.49, jetArmor);
    } else {
      pierce = lerp(0.49, 0.68, jetThrough);
    }
  }

  // ---------------- 2. CHUYỂN ĐỘNG CAMERA MACRO NGANG MẶT CẮT 180° (KHÔNG CẮT ĐỈNH ĐẦU ĐẠN) ----------------
  // Mở đầu ở [0.24, 0.72, 2.76] nhìn vào [0.02, 0.60, 0] để thấy trọn cả đuôi đầu đạn lúc lao xuống từ y=+0.35 m,
  // giữ trọn thân đầu đạn trong suốt quá trình truyền sóng nổ & sập phễu đồng, rồi hạ máy cận cảnh lỗ xuyên giáp ở giây cuối!
  const pCamApproach = prog(t, CUE.c01_roof_approach, CUE.c01_heat_trigger, Easing.out(Easing.cubic));
  const pCamCollapse = prog(t, CUE.c01_heat_trigger, CUE.c01_copper_jet, Easing.inOut(Easing.cubic));
  const pCamJet = prog(t, CUE.c01_copper_jet, CUE.c01_jet_interior, Easing.inOut(Easing.quad));

  const camX1 = lerp(0.24, 0.08, pCamApproach);
  const camY1 = lerp(0.72, 0.56, pCamApproach);
  const camZ1 = lerp(2.76, 2.38, pCamApproach);
  const lookX1 = lerp(0.02, 0.04, pCamApproach);
  const lookY1 = lerp(0.60, 0.48, pCamApproach);

  const camX2 = lerp(camX1, -0.04, pCamCollapse);
  const camY2 = lerp(camY1, 0.50, pCamCollapse);
  const camZ2 = lerp(camZ1, 2.26, pCamCollapse);
  const lookX2 = lerp(lookX1, 0.14, pCamCollapse);
  const lookY2 = lerp(lookY1, 0.45, pCamCollapse);

  const camPos: V3 = [
    lerp(camX2, -0.12, pCamJet),
    lerp(camY2, 0.34, pCamJet),
    lerp(camZ2, 1.92, pCamJet),
  ];
  const camLook: V3 = [
    lerp(lookX2, 0.14, pCamJet),
    lerp(lookY2, 0.22, pCamJet),
    0,
  ];
  const camFov = lerp(36.0, 34.5, pCamCollapse);

  return (
    <AbsoluteFill>
      {/* Hạ cường độ nắng xiên & nâng ngưỡng bloomThreshold=0.93 để thuốc nổ RDX cam đậm & vỏ thép sắc nét, không bị cháy sáng trắng, tôn nổi mặt sóng nổ Chapman-Jouguet và xung điện lam ngọc */}
      <Stage
        width={W}
        height={H}
        {...STAGE_LAB}
        sun={[-34, 24, 22]}
        sunIntensity={1.25}
        env={0.26}
        ambient={0.18}
        exposure={0.94}
        shadowArea={4.5}
        shadowCenter={[0, 0.35, 0]}
        post={{
          bloom: 0.56,
          bloomThreshold: 0.97,
          ao: 2.3,
          aoRadius: 1.8,
          vignette: 0.52,
        }}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Đèn fill nhẹ tôn ánh kim phễu đồng 60° mà không làm lóa mặt cắt RDX */}
        <pointLight
          position={[-0.65, 0.58, 1.55]}
          color="#d8ebff"
          intensity={0.48}
          distance={4.5}
          decay={1.5}
        />
        <pointLight
          position={[0.72, 0.32, 1.28]}
          color="#ffe3c2"
          intensity={0.38}
          distance={3.8}
          decay={1.5}
        />

        {/* 1. KẾT CẤU NÓC THÁP PHÁO XE TĂNG MỞ RỘNG XUNG QUANH */}
        <TurretRoofContext />

        {/* 2. ĐẦU ĐẠN NỔ LÕM HEAT CẮT BỔ 180° & TẤM GIÁP NÓC TRUNG TÂM */}
        {!hasContacted ? (
          <>
            <PreContactCenterArmor />
            <ShapedChargeCutaway
              position={[0, warheadY, 0]}
              orientation="vertical"
              showArmor={false}
              detonate={0}
              collapse={0}
              jet={0}
              pierce={0}
            />
          </>
        ) : (
          <ShapedChargeCutaway
            position={[0, 0, 0]}
            orientation="vertical"
            showArmor
            detonate={detonate}
            collapse={collapse}
            jet={jet}
            pierce={pierce}
          />
        )}

        {/* 3. HIỆU ỨNG CHỚP ÁP ĐIỆN MŨI NGÒI (46.02 s) & XUNG ĐIỆN CHẠY DỌC DÂY DẪN LÊN KÍP NỔ ĐUÔI */}
        {piezoFlash > 0.01 && (
          <group position={[0, 0.014, 0.016]}>
            <mesh scale={0.025 + 0.04 * piezoFlash}>
              <octahedronGeometry args={[1, 0]} />
              <meshBasicMaterial color="#ebfeff" toneMapped={false} />
            </mesh>
            <mesh scale={0.052 + 0.075 * piezoFlash}>
              <octahedronGeometry args={[1, 1]} />
              <meshBasicMaterial
                color={THEME.apsCyan}
                transparent
                opacity={0.62 * piezoFlash}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <mesh position={[0, -0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry
                args={[
                  0.022 + 0.15 * (1 - piezoFlash * 0.4),
                  0.038 + 0.19 * (1 - piezoFlash * 0.4),
                  32,
                ]}
              />
              <meshBasicMaterial
                color="#8cf6ff"
                transparent
                opacity={0.8 * piezoFlash}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const ang = -0.95 + (i / 5) * 1.9;
              return (
                <mesh
                  key={i}
                  position={[Math.sin(ang) * 0.046, Math.cos(ang) * 0.035, 0.008]}
                  rotation={[0, 0, -ang]}
                  scale={[0.0038, 0.036 + 0.032 * piezoFlash, 0.0038]}
                >
                  <octahedronGeometry args={[1, 0]} />
                  <meshBasicMaterial color="#c4fcff" toneMapped={false} />
                </mesh>
              );
            })}
            <pointLight
              color="#4df0ff"
              intensity={2.2 * piezoFlash}
              distance={0.95}
              decay={1.6}
            />
          </group>
        )}

        {/* Xung tín hiệu kích nổ chạy dọc hai nhánh dây dẫn từ mũi áp điện lên kíp nổ đuôi */}
        {wireActive && wirePulseU > 0.005 && (
          <group>
            <Trail
              points={WIRE_SAMPLES_L}
              upto={wirePulseU}
              color={THEME.apsCyan}
              width={0.0082}
              opacity={0.95 * wireGlowFade}
              glow
            />
            <Trail
              points={WIRE_SAMPLES_R}
              upto={wirePulseU}
              color={THEME.apsCyan}
              width={0.0082}
              opacity={0.95 * wireGlowFade}
              glow
            />
            <Trail
              points={WIRE_SAMPLES_L}
              upto={wirePulseU}
              color="#eaffff"
              width={0.0038}
              opacity={0.98 * wireGlowFade}
              glow
            />
            <Trail
              points={WIRE_SAMPLES_R}
              upto={wirePulseU}
              color="#eaffff"
              width={0.0038}
              opacity={0.98 * wireGlowFade}
              glow
            />

            {wirePulseU < 0.995 && (
              <>
                <mesh position={[pulsePtL.x, pulsePtL.y, pulsePtL.z + 0.006]} scale={0.022}>
                  <octahedronGeometry args={[1, 1]} />
                  <meshBasicMaterial color="#f0ffff" toneMapped={false} />
                </mesh>
                <mesh position={[pulsePtR.x, pulsePtR.y, pulsePtR.z + 0.006]} scale={0.022}>
                  <octahedronGeometry args={[1, 1]} />
                  <meshBasicMaterial color="#f0ffff" toneMapped={false} />
                </mesh>
                <pointLight
                  position={[0, pulsePtL.y, 0.18]}
                  color="#3beeff"
                  intensity={1.25 * wireGlowFade}
                  distance={0.75}
                  decay={1.6}
                />
              </>
            )}
          </group>
        )}

        {/* Chớp kích nổ tại kíp nổ đuôi & trạm booster đúng khoảnh khắc 47.18 s */}
        {baseDetFlash > 0.01 && (
          <group position={[0, 0.985, 0.014]}>
            <mesh scale={0.028 + 0.045 * baseDetFlash}>
              <octahedronGeometry args={[1, 1]} />
              <meshBasicMaterial color="#fff8d6" toneMapped={false} />
            </mesh>
            <mesh scale={0.056 + 0.08 * baseDetFlash}>
              <sphereGeometry args={[1, 16, 12]} />
              <meshBasicMaterial
                color="#ffae2b"
                transparent
                opacity={0.58 * baseDetFlash}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
            <pointLight
              color="#ffd275"
              intensity={1.9 * baseDetFlash}
              distance={0.95}
              decay={1.5}
            />
          </group>
        )}
      </Stage>

      {/* HUD giải phẫu vật lý ở góc phải thoáng, không che mặt cắt đầu đạn */}
      <HUDLabel
        t={t}
        from={CUE.c01_cone_collapse}
        text="PHỄU ĐỒNG NỔ LÕM (HEAT)"
        sub="SÓNG NỔ ÉP THÀNH LUỒNG KIM LOẠI"
        accent={THEME.copperJet}
        x={W * 0.73}
        y={SAFE * 2.2}
      />
    </AbsoluteFill>
  );
};

export default C01S08;
