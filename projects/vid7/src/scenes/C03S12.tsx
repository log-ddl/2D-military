import React, { useMemo } from 'react';
import * as THREE from 'three';
import { useT, prog, lerp, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Terrain, Scatter } from '@skill/military/3d/terrain';
import { softDot } from '@skill/military/3d/fx';
import { fbm } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { STAGE_PRESETS, TERRAIN_PALETTE } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { FactoryComplex, OilRefineryCluster } from '../parts/JapanTargetBlocks';
import { OceanSurface } from '../parts/OceanSurface';

/**
 * Đường bờ biển vách đá Nhật Bản uốn lượn tự nhiên tạo thành vịnh công nghiệp ở hậu cảnh trái
 * và đại dương Thái Bình Dương mênh mông ở trung tâm & bên phải khung hình:
 * - x < coastX(z): đất liền / mũi đá thông ven biển & bán đảo công nghiệp phía bắc
 * - x > coastX(z): mặt biển khơi bao la (OceanSurface palette="japanShore")
 */
const coastX = (z: number): number => {
  const capeForeground = 26 * Math.exp(-(((z - 18) / 48) ** 2));
  const bayMid = -12 * Math.exp(-(((z + 62) / 44) ** 2));
  // Bán đảo đất liền phía bắc vươn nhẹ sang phải ở hậu cảnh xa (z ≈ -140..-240) để giữ trọn khu công nghiệp bốc khói trong khung
  const peninsulaFar = 58 * (1 / (1 + Math.exp((z + 118) / 26)));
  const jag = (fbm(z * 0.026 + 11, 3.7, 19, 3) - 0.5) * 24;
  return 24 + capeForeground + bayMid + peninsulaFar + jag;
};

const INDUSTRIAL_PADS: readonly [number, number, number, number][] = [
  [4, -108, 30, 16],
  [36, -162, 34, 19],
  [54, -218, 36, 22],
];

const COAST_CLIFF_H = (x: number, z: number): number => {
  const cx = coastX(z);
  const inland = cx - x; // > 0 là đất liền, < 0 là đáy biển dưới lớp sóng OceanSurface
  if (inland <= -24) return -14;
  if (inland < 0) {
    const u = (inland + 24) / 24;
    return lerp(-14, -0.35, u * u * (3 - 2 * u));
  }
  const cliffRise = 1 - Math.exp(-inland / 14);
  const ridge = (fbm(x * 0.014 + 30, z * 0.014 + 30, 73, 4) - 0.42) * 26;
  const crag = (fbm(x * 0.055 + 7, z * 0.055 + 9, 41, 3) - 0.5) * 7.2;
  let h = cliffRise * (21 + Math.max(-5, ridge)) + crag * cliffRise;

  for (const [fx, fz, r, fh] of INDUSTRIAL_PADS) {
    const d = Math.hypot(x - fx, z - fz);
    if (d < r * 1.6) {
      const w = Math.max(0, Math.min(1, 1 - Math.max(0, d - r) / (r * 0.6)));
      const s = w * w * (3 - 2 * w);
      h = lerp(h, fh, s);
    }
  }
  return h;
};

/** Cột khói cháy đen đặc + lửa cam rực ở khu công nghiệp đất liền phía sau đoàn B-25 */
const MainlandSmokePlume: React.FC<{
  t: number;
  pos: V3;
  height: number;
  radius: number;
  seed: number;
}> = ({ t, pos, height, radius, seed }) => {
  const baseMat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  const count = 24;
  return (
    <group position={pos}>
      {/* Lõi lửa cháy rực tại chân nhà máy/kho dầu ở hậu cảnh */}
      <pointLight position={[0, 6, 0]} color="#ff7320" intensity={160} distance={75} decay={1.6} />
      <mesh position={[0, 3.8, 0]}>
        <icosahedronGeometry args={[radius * 0.54, 1]} />
        <meshBasicMaterial color="#ff6a18" transparent opacity={0.9} toneMapped={false} />
      </mesh>
      <mesh position={[radius * 0.16, 5.6, -radius * 0.1]}>
        <icosahedronGeometry args={[radius * 0.32, 1]} />
        <meshBasicMaterial color="#ffe08c" transparent opacity={0.88} toneMapped={false} />
      </mesh>

      {Array.from({ length: count }, (_, i) => {
        const u = ((t * 0.12 + i / count + rnd(seed * 13 + i) * 0.06) % 1 + 1) % 1;
        const y = 4.5 + u * height;
        const wx = -u * u * 16 + Math.sin(u * 4.5 + seed + i) * radius * 0.4;
        const wz = -u * 8 + Math.cos(u * 3.8 + seed * 2 + i) * radius * 0.35;
        const sz = radius * (1.05 + u * 2.65) * (0.86 + 0.28 * rnd(seed * 5 + i));
        const op = Math.sin(Math.pow(u, 0.58) * Math.PI) * 0.88;
        if (op <= 0.01) return null;
        const m = baseMat.clone();
        m.color.set(u < 0.14 ? '#63361d' : u < 0.55 ? '#1b1918' : '#2b2724');
        m.opacity = op;
        m.rotation = i * 0.9 + t * 0.12 * (i % 2 === 0 ? 1 : -1);
        return <sprite key={`msmoke-${i}`} material={m} position={[wx, y, wz]} scale={[sz, sz, sz]} />;
      })}
    </group>
  );
};

// Cấu hình đủ 16 chiếc B-25B Mitchell (4 biên đội × 4 chiếc) tách khoảng thoáng, không chồng đè hình chiếu,
// trải từ cận-trung cảnh hùng tráng ngay trên vách biển ra tới khơi xa
type RaiderSlot = {
  x0: number;
  y0: number;
  z0: number;
  bank: number;
  brokenNose?: boolean;
  flakDamage?: boolean;
};

const RAIDER_FORMATION_16: RaiderSlot[] = [
  // Biên đội 1 (Tiền cảnh hùng tráng — 4 chiếc tách rõ cao độ & khoảng ngang, bay vọt qua bờ vách đá ra biển)
  { x0: 6, y0: 88, z0: 34, bank: -0.08 }, // Chiếc dẫn đầu tiền cảnh nổi bật
  { x0: -22, y0: 95, z0: 44, bank: -0.06, brokenNose: true }, // #16 Bat Out of Hell bên cánh trái cao
  { x0: 30, y0: 76, z0: 26, bank: -0.1 }, // Cánh phải thấp ngay trên mặt sóng
  { x0: -10, y0: 79, z0: 6, bank: -0.07, flakDamage: true }, // #10 Joyce bên trong

  // Biên đội 2 (Trung cảnh vừa vượt qua dải bọt sóng bờ biển)
  { x0: 62, y0: 74, z0: -12, bank: -0.07 },
  { x0: 36, y0: 81, z0: -24, bank: -0.05 },
  { x0: 86, y0: 66, z0: -18, bank: -0.08 },
  { x0: 56, y0: 68, z0: -44, bank: -0.06 },

  // Biên đội 3 (Ngoài mặt biển khơi xanh thẳm phía đông)
  { x0: 118, y0: 65, z0: -56, bank: -0.05 },
  { x0: 94, y0: 71, z0: -68, bank: -0.04 },
  { x0: 142, y0: 59, z0: -66, bank: -0.06 },
  { x0: 116, y0: 61, z0: -92, bank: -0.05 },

  // Biên đội 4 (Tốp tiên phong ngoài khơi xa hướng thẳng ra chân trời đại dương)
  { x0: 174, y0: 58, z0: -104, bank: -0.04 },
  { x0: 152, y0: 63, z0: -116, bank: -0.03 },
  { x0: 196, y0: 54, z0: -116, bank: -0.05 },
  { x0: 172, y0: 56, z0: -138, bank: -0.04 },
];

const C03S12: React.FC = () => {
  const t = useT();

  // Tiến độ mượt suốt cảnh cuối Chương C03 (609.90–614.40s, bao gồm cả biên mở sớm -0.2s & chồng +0.4s)
  const dt = t - 609.9;
  const p = prog(t, 609.7, 614.8);
  const surge = prog(t, CUE.c03_s12_incredibly, CUE.c03_s12_none_shot_down + 2.2);

  // Hướng bay của toàn đoàn 16 chiếc B-25: vượt đường bờ biển tiến thẳng ra đại dương (+X, -Z) với yaw = +0.36 rad
  const headingYaw = 0.36;
  const speed = 15.0;
  const vx = Math.cos(headingYaw) * speed;
  const vz = -Math.sin(headingYaw) * speed;

  // Camera đại cảnh uy nghi trên cao bờ vách biển Nhật (y = 104 -> 114 m):
  // giữ trọn khu công nghiệp bốc khói đen ở 1/3 trái hậu cảnh và mở toang đại dương bao la ở 2/3 phải suốt cả cảnh!
  const camPos: V3 = [lerp(-38, -26, p), lerp(104, 113, p), lerp(84, 70, p)];
  const camLook: V3 = [lerp(82, 102 + surge * 4, p), lerp(46, 52 + surge * 1.5, p), lerp(-74, -88, p)];

  const avoidOceanAndPads = useMemo(
    () => (x: number, z: number) => {
      if (x > coastX(z) - 4) return true;
      for (const [fx, fz, r] of INDUSTRIAL_PADS) {
        if (Math.hypot(x - fx, z - fz) < r + 4) return true;
      }
      return false;
    },
    [],
  );

  const avoidCliffInterior = useMemo(
    () => (x: number, z: number) => {
      const cx = coastX(z);
      return x < cx - 16 || x > cx + 4;
    },
    [],
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Stage {...STAGE_PRESETS.tokyoFire} shadowArea={150} shadowCenter={[30, 34, -15]}>
        <Cam pos={camPos} look={camLook} fov={48} roll={-0.025} />

        {/* Đại dương bao la phía ngoài bờ biển Nhật Bản (palette="japanShore", swell=1.1) */}
        <OceanSurface t={t} palette="japanShore" swell={1.1} size={1200} seg={180} center={[290, -95]} />

        {/* Bờ vách đá & rừng thông ven biển Nhật Bản (TERRAIN_PALETTE.japanCoast) */}
        <Terrain h={COAST_CLIFF_H} size={780} seg={196} center={[-70, -65]} colors={TERRAIN_PALETTE.japanCoast} />

        <Scatter
          kind="pine"
          count={340}
          area={[-170, -255, 92, 125]}
          h={COAST_CLIFF_H}
          seed={81}
          scale={[0.85, 1.55]}
          avoid={avoidOceanAndPads}
        />
        <Scatter
          kind="bush"
          count={150}
          area={[-145, -240, 88, 118]}
          h={COAST_CLIFF_H}
          seed={85}
          scale={[0.9, 1.5]}
          avoid={avoidOceanAndPads}
        />
        <Scatter
          kind="rock"
          count={155}
          area={[-20, -245, 98, 122]}
          h={COAST_CLIFF_H}
          seed={89}
          scale={[1.4, 3.3]}
          avoid={avoidCliffInterior}
        />

        {/* Khu công nghiệp ven vịnh ở hậu cảnh đất liền phía sau vẫn cuồn cuộn các cột khói cháy đen cao ngất suốt cả cảnh */}
        <group position={[4, 16, -108]} rotation={[0, 0.38, 0]}>
          <OilRefineryCluster damage={0.9} />
        </group>
        <group position={[36, 19, -162]} rotation={[0, -0.28, 0]}>
          <FactoryComplex damage={0.9} variant={0} />
        </group>
        <group position={[54, 22, -218]} rotation={[0, 0.15, 0]}>
          <FactoryComplex damage={0.85} variant={1} />
        </group>

        <MainlandSmokePlume t={t} pos={[6, 17, -105]} height={112} radius={9.8} seed={51} />
        <MainlandSmokePlume t={t} pos={[-10, 18, -122]} height={95} radius={8.5} seed={57} />
        <MainlandSmokePlume t={t} pos={[34, 20, -158]} height={128} radius={11.2} seed={63} />
        <MainlandSmokePlume t={t} pos={[18, 21, -176]} height={108} radius={9.6} seed={69} />
        <MainlandSmokePlume t={t} pos={[52, 23, -214]} height={135} radius={11.8} seed={75} />

        {/* Toàn bộ đoàn 16 chiếc B-25B Mitchell bay vượt đường bờ biển tiến thẳng ra đại dương không mất một chiếc nào */}
        {RAIDER_FORMATION_16.map((slot, idx) => {
          const px = slot.x0 + vx * dt;
          const pz = slot.z0 + vz * dt;
          const py = slot.y0 + Math.sin(t * 1.6 + idx * 1.3) * 0.42;
          const gentleRoll = slot.bank + Math.sin(t * 1.35 + idx * 0.9) * 0.02;
          return (
            <group key={`b25-${idx}`} position={[px, py, pz]} rotation={[gentleRoll, headingYaw, 0.025]}>
              <B25Mitchell
                gear={0}
                propFast={true}
                propSpin={t * 42 + idx * 0.7}
                broomsticks={true}
                brokenNose={slot.brokenNose}
                flakDamage={slot.flakDamage}
                navLights={false}
                turretYaw={Math.PI}
                turretPitch={0.18}
                seed={18}
              />
            </group>
          );
        })}
      </Stage>

      <Label
        t={t}
        text="16 / 16 B-25s CLEAR JAPAN"
        x={1340}
        y={885}
        from={611.26}
        until={614.1}
        size={48}
      />
    </div>
  );
};

export default C03S12;
