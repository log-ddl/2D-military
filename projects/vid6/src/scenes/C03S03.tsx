import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useSize } from '@core/frame';
import { bump, lerp, prog, useT } from '@core/time';
import { rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT_PRESETS, PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { TurretInterior3D } from '../parts/TurretInterior3D';

const TURRET_Y = 0.64;

const lerp3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

// Sàn bệ studio cơ khí tối + Khung bụng thân xe cắt bổ & Cụm 6 ống đạn phụ dưới thân để rỗng hoàn toàn
const StudioBayAndEmptyHullRack: React.FC<{ emptyHighlight: number }> = ({ emptyHighlight }) => {
  const matFloorOuter = useMemo(
    () =>
      paint({
        color: '#17202b',
        camo: ['#131b24', '#1e2a38'],
        camoScale: 1.6,
        wear: 0.15,
        dirt: 0.2,
        roughness: 0.78,
        metalness: 0.32,
        repeat: 3,
        seed: 71,
      }),
    [],
  );
  const matDeckSteel = useMemo(
    () =>
      paint({
        color: '#222d3a',
        camo: ['#1c2530', '#2a3746'],
        camoScale: 2.0,
        wear: 0.22,
        dirt: 0.18,
        roughness: 0.56,
        metalness: 0.52,
        repeat: 2,
        seed: 73,
      }),
    [],
  );
  const matHullArmor = useMemo(
    () =>
      paint({
        ...PAINT_PRESETS.abramsDesert,
        camo: [...PAINT_PRESETS.abramsDesert.camo],
        seed: 19,
      }),
    [],
  );
  const matHullLiner = useMemo(() => plain('#7d8985', 0.76, 0.22), []);
  const matDarkSteel = useMemo(() => plain('#1e242c', 0.54, 0.7), []);
  const matTubeInside = useMemo(() => plain('#12161c', 0.62, 0.65, { side: THREE.DoubleSide }), []);
  const matCollarChrome = useMemo(() => plain('#cfdbe6', 0.22, 0.9), []);
  const matMidAlloy = useMemo(() => plain('#5c6b7a', 0.42, 0.74), []);
  const matBrass = useMemo(() => plain('#dba93d', 0.28, 0.85), []);
  const matYellow = useMemo(() => plain('#f2b61d', 0.36, 0.24), []);
  const matCutEdge = useMemo(() => plain('#c43b29', 0.46, 0.35), []);

  const collarGeo = useMemo(() => {
    const sh = new THREE.Shape();
    sh.absarc(0, 0, 0.082, 0, Math.PI * 2, false);
    const hole = new THREE.Path();
    hole.absarc(0, 0, 0.063, 0, Math.PI * 2, true);
    sh.holes.push(hole);
    return new THREE.ExtrudeGeometry(sh, { depth: 0.032, bevelEnabled: false, curveSegments: 24 });
  }, []);

  // 2 hàng x 3 cột = đúng 6 ống đạn phụ dưới sàn thân xe (rỗng 100%)
  const slotOffsets = useMemo<[number, number][]>(() => {
    const rows = [-0.095, 0.095];
    const cols = [-0.21, 0, 0.21];
    const out: [number, number][] = [];
    for (let r = 0; r < rows.length; r++) {
      const stag = r === 1 ? 0.025 : -0.025;
      for (let c = 0; c < cols.length; c++) {
        out.push([cols[c] + stag, rows[r]]);
      }
    }
    return out;
  }, []);

  return (
    <group>
      {/* Sàn studio cơ khí tối rộng + bệ kiểm định tròn có gân thép hướng tâm */}
      <mesh position={[0, -0.04, 0]} receiveShadow material={matFloorOuter}>
        <cylinderGeometry args={[16, 16, 0.08, 64]} />
      </mesh>
      <mesh position={[-0.2, 0.01, 0]} receiveShadow material={matDeckSteel}>
        <cylinderGeometry args={[4.6, 4.75, 0.03, 56]} />
      </mesh>
      <mesh position={[-0.2, 0.028, 0]} rotation={[-Math.PI / 2, 0, 0]} material={matYellow}>
        <ringGeometry args={[4.46, 4.53, 56]} />
      </mesh>
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[-0.2 + Math.cos(a) * 3.1, 0.02, Math.sin(a) * 3.1]}
            rotation={[0, -a, 0]}
            material={matDarkSteel}
            receiveShadow
          >
            <boxGeometry args={[2.7, 0.018, 0.12]} />
          </mesh>
        );
      })}

      {/* Bụng thân xe cắt bổ dưới giỏ tháp pháo (Lower Hull Cutaway Floor & Torsion Bar Ribs) */}
      <group position={[0, 0.03, 0]}>
        <mesh position={[-0.18, 0.025, 0]} geometry={rbox(5.1, 0.05, 3.16, 0.015)} material={matHullArmor} receiveShadow castShadow />
        <mesh position={[-0.18, 0.054, -0.04]} geometry={rbox(4.86, 0.016, 2.96, 0.006)} material={matHullLiner} receiveShadow />
        {/* Viền đỏ mặt cắt dọc theo mép cắt thân xe (+Z) đồng bộ ngôn ngữ với TurretInterior3D */}
        <mesh position={[-0.18, 0.038, 1.575]} material={matCutEdge}>
          <boxGeometry args={[5.08, 0.054, 0.024]} />
        </mesh>
        {/* Vách hậu ngăn khoang động cơ phía sau (-X) cắt thấp */}
        <mesh position={[-2.62, 0.34, 0]} geometry={rbox(0.09, 0.62, 3.12, 0.015)} material={matHullArmor} castShadow receiveShadow />
        <mesh position={[-2.62, 0.655, 0]} material={matCutEdge}>
          <boxGeometry args={[0.095, 0.02, 3.12]} />
        </mesh>
        {/* Vách sườn trái thân xe (-Z) */}
        <mesh position={[-0.18, 0.34, -1.54]} geometry={rbox(5.02, 0.62, 0.1, 0.015)} material={matHullArmor} castShadow receiveShadow />
        <mesh position={[-0.18, 0.655, -1.54]} material={matCutEdge}>
          <boxGeometry args={[5.02, 0.02, 0.105]} />
        </mesh>

        {/* Các ống bọc thanh xoắn chạy ngang sàn thân xe */}
        {[-1.88, -1.24, -0.58, 0.08, 0.74, 1.4, 2.04].map((xRib, idx) => (
          <mesh key={idx} position={[xRib, 0.078, -0.02]} rotation={[Math.PI / 2, 0, 0]} material={matDarkSteel} castShadow receiveShadow>
            <cylinderGeometry args={[0.034, 0.034, 2.94, 14]} />
          </mesh>
        ))}

        {/* Khung trụ thép đỡ vành ổ bi tháp pháo đặt gọn phía vách sau-trái để mặt cắt tiền cảnh thoáng sạch */}
        {[
          [1.04, -1.24],
          [-1.04, -1.24],
          [-1.52, -0.45],
        ].map(([px, pz], idx) => (
          <mesh key={idx} position={[px, 0.72, pz]} material={matDarkSteel} castShadow>
            <cylinderGeometry args={[0.052, 0.068, 1.34, 14]} />
          </mesh>
        ))}

        {/* ==================== CỤM 6 ỐNG CHỨA ĐẠN PHỤ DƯỚI SÀN THÂN XE (RỖNG HOÀN TOÀN) ==================== */}
        <group position={[-0.58, 0.31, 0.78]} rotation={[0, 0.24, 0]}>
          {/* Vỏ hộp bọc thép khoang đạn thân xe (cắt bổ mặt trên & hông phải để lộ trọn 6 ống rỗng bên trong) */}
          <mesh position={[0, -0.21, -0.02]} geometry={rbox(0.76, 0.04, 0.96, 0.01)} material={matMidAlloy} castShadow receiveShadow />
          <mesh position={[-0.36, 0, -0.02]} geometry={rbox(0.04, 0.42, 0.96, 0.01)} material={matMidAlloy} castShadow />
          <mesh position={[0, 0, -0.49]} geometry={rbox(0.76, 0.42, 0.04, 0.01)} material={matMidAlloy} castShadow />
          <mesh position={[0.36, -0.11, -0.02]} geometry={rbox(0.04, 0.2, 0.96, 0.008)} material={matMidAlloy} castShadow />
          {/* Phần nắp trên cắt một nửa phía sau kèm viền mặt cắt đỏ kỹ thuật */}
          <mesh position={[0, 0.21, -0.27]} geometry={rbox(0.76, 0.036, 0.46, 0.008)} material={matHullLiner} castShadow />
          <mesh position={[0, 0.21, -0.038]} material={matCutEdge}>
            <boxGeometry args={[0.765, 0.038, 0.02]} />
          </mesh>
          <mesh position={[0.36, -0.005, -0.02]} material={matCutEdge}>
            <boxGeometry args={[0.044, 0.018, 0.96]} />
          </mesh>

          {/* Khung mặt trước khoang 6 viên + cửa trượt nhỏ đang mở sang bên trái để lộ rõ 6 miệng ống rỗng */}
          <mesh position={[0, 0.205, 0.45]} geometry={rbox(0.78, 0.045, 0.04, 0.008)} material={matYellow} castShadow />
          <mesh position={[0, -0.205, 0.45]} geometry={rbox(0.78, 0.045, 0.04, 0.008)} material={matDarkSteel} castShadow />
          <mesh position={[-0.52, 0, 0.46]} geometry={rbox(0.28, 0.39, 0.026, 0.006)} material={matMidAlloy} castShadow />

          {/* Vách đỡ tổ ong giữa hộp */}
          <mesh position={[0, 0, 0.02]} material={matDarkSteel}>
            <boxGeometry args={[0.7, 0.38, 0.025]} />
          </mesh>

          {/* 6 ỐNG CHỨA ĐẠN 120MM TRỐNG RỖNG (2 hàng x 3 cột = 6 slots empty) */}
          {slotOffsets.map(([sx, sy], i) => (
            <group key={i} position={[sx, sy, 0]}>
              {/* Ống thép tròn rỗng lòng kéo dài 0.88 m, KHÔNG có bất kỳ viên đạn nào bên trong */}
              <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]} material={matTubeInside} castShadow receiveShadow>
                <cylinderGeometry args={[0.064, 0.064, 0.88, 24, 1, true]} />
              </mesh>
              {/* Đáy tối sâu bên trong ống để tương phản rõ độ rỗng */}
              <mesh position={[0, 0, -0.455]} material={matDarkSteel}>
                <circleGeometry args={[0.063, 20]} />
              </mesh>
              {/* Vòng cổ thép tiện sáng bóng ở miệng từng ống rỗng */}
              <mesh position={[0, 0, 0.425]} geometry={collarGeo} material={matCollarChrome} castShadow />
              {/* Vòng đai đỡ phía sau qua phần cắt bổ */}
              <mesh position={[0, 0, 0.16]} geometry={collarGeo} material={matMidAlloy} />
              {/* Ngàm khoá đồng giữ đế đạn đang nằm chờ trống */}
              <mesh position={[0, 0.076, 0.445]} material={matBrass}>
                <boxGeometry args={[0.026, 0.022, 0.024]} />
              </mesh>
              {/* Vòng viền nhấn mảnh cyan/hổ phách khi camera liếc xuống kiểm tra 6 ống trống */}
              {emptyHighlight > 0.01 && (
                <mesh position={[0, 0, 0.459]}>
                  <ringGeometry args={[0.064, 0.074, 28]} />
                  <meshStandardMaterial
                    color={PAL.cyanSoft}
                    emissive={PAL.cyan}
                    emissiveIntensity={1.35 * emptyHighlight}
                    transparent
                    opacity={0.85 * emptyHighlight}
                    roughness={0.2}
                  />
                </mesh>
              )}
            </group>
          ))}
        </group>
      </group>
    </group>
  );
};

const C03S03: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // Cặp cửa chống nổ trượt khép chặt từ 0.65 -> 0.0 đúng CUE.c03_s03_blast_doors (339.36)
  const closeP = prog(t, CUE.c03_s03_blast_doors, CUE.c03_s03_blast_doors + 1.25);
  const blastDoorOpen = lerp(0.65, 0.0, closeP);

  // Chuyển động nhẹ sống động của lính nạp đạn & pháo thủ trong khoang tổ lái phía trước
  const loaderPhase = 0.28 + 0.05 * Math.sin((t - 328.0) * 1.1);
  const cadillacTurn = 0.12 * Math.sin((t - 328.0) * 0.85);

  // Mức sáng nhấn nhẹ vào vách ngăn lúc "Save the crew" / đóng cửa chống nổ và vào 6 ống rỗng lúc 342.12s
  const doorSealPulse = bump(t, CUE.c03_s03_blast_doors + 0.9, 1.5);
  const emptyHullHighlight = prog(t, CUE.c03_s03_hull_empty - 0.35, CUE.c03_s03_hull_empty + 0.55);

  // Quỹ đạo <Cam> 4 nhịp có chủ đích rõ ràng:
  // 1) 328.00..333.80: Góc cao chéo 3/4 từ phía sau nhìn xuống mặt cắt TurretInterior3D (thấy rõ vách ngăn chia đôi tổ lái vs khoang đạn đuôi)
  // 2) 333.80..338.30: Đẩy cận vào giá tổ ong 36 viên đạn 120mm xếp cô lập ở đuôi bustle (334.24 -> 335.70 -> 338.26)
  // 3) 338.30..340.90: Lượn nhẹ sang góc nhìn thẳng mặt vách ngăn để thấy cặp cửa chống nổ thuỷ lực trượt khép chặt (339.36)
  // 4) 341.20..344.10: Liếc nhẹ xuống cụm 6 ống chứa đạn phụ dưới sàn thân xe bên dưới giỏ đang để rỗng hoàn toàn (342.12)
  const pDrift = prog(t, 328.0, 333.8);
  const pBustle = prog(t, CUE.c03_s03_42_rounds - 0.4, CUE.c03_s03_bustle + 0.1);
  const pDoors = prog(t, CUE.c03_s03_bustle + 0.15, CUE.c03_s03_blast_doors + 0.85);
  const pHull = prog(t, CUE.c03_s03_hull_empty - 0.85, CUE.c03_s03_hull_empty + 1.05);

  const posStart: V3 = [-3.05, 3.62, 4.82];
  const posCrewWall: V3 = [-2.62, 3.32, 4.46];
  const posBustle: V3 = [-2.82, 2.18, 2.86];
  const posDoors: V3 = [-0.16, 2.28, 3.34];
  const posHullSlots: V3 = [0.24, 1.36, 2.52];

  const lookStart: V3 = [-0.36, 1.62, -0.04];
  const lookCrewWall: V3 = [-0.58, 1.66, -0.05];
  const lookBustle: V3 = [-1.52, 1.84, -0.1];
  const lookDoors: V3 = [-1.12, 1.88, -0.06];
  const lookHullSlots: V3 = [-0.56, 0.42, 0.66];

  let camPos = lerp3(posStart, posCrewWall, pDrift);
  camPos = lerp3(camPos, posBustle, pBustle);
  camPos = lerp3(camPos, posDoors, pDoors);
  camPos = lerp3(camPos, posHullSlots, pHull);

  let camLook = lerp3(lookStart, lookCrewWall, pDrift);
  camLook = lerp3(camLook, lookBustle, pBustle);
  camLook = lerp3(camLook, lookDoors, pDoors);
  camLook = lerp3(camLook, lookHullSlots, pHull);

  const fov = lerp(lerp(39, 36, pBustle), 38, pHull);

  return (
    <div style={{ position: 'relative', width: W, height: H, background: '#111923', overflow: 'hidden' }}>
      <Stage {...LOOK_INTERIOR_BAY.stage} shadowCenter={[-0.4, 1.3, 0]} width={W} height={H}>
        <Cam pos={camPos} look={camLook} fov={fov} />

        {/* Đèn studio bổ trợ bên trong mặt cắt để giá 36 viên đạn dưới nắp blowout, cửa chống nổ và 6 ống đạn thân xe rõ nét 100% */}
        <pointLight position={[-1.65, 2.18, 1.15]} color="#fff3df" intensity={2.4} distance={4.8} decay={1.6} />
        <pointLight position={[-0.35, 2.35, 1.35]} color="#eef6ff" intensity={1.9 + doorSealPulse * 0.9} distance={5.2} decay={1.6} />
        <pointLight position={[-0.25, 0.72, 1.75]} color="#dff8ff" intensity={1.5 + emptyHullHighlight * 1.4} distance={3.8} decay={1.6} />

        <StudioBayAndEmptyHullRack emptyHighlight={emptyHullHighlight} />

        <TurretInterior3D
          position={[0, TURRET_Y, 0]}
          showCrew
          blastDoorOpen={blastDoorOpen}
          breechOpen={0}
          blowoutOpen={0}
          loaderPhase={loaderPhase}
          cadillacTurn={cadillacTurn}
        />
      </Stage>

      <Label
        t={t}
        text="36 / 42 ROUNDS"
        x={Math.round(W * 0.17)}
        y={Math.round(H * 0.1)}
        from={CUE.c03_s03_36_isolated}
        until={340.3}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C03S03;
