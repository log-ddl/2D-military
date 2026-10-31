import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, rnd, useT } from '@core/time';
import { Label } from '@skill/military/label';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { heightField, Scatter, Terrain, type HeightFn } from '@skill/military/3d/terrain';
import { pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { softDot } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_STEPPE_OVERCAST } from '../design/stage';
import { M1A2Abrams } from '../parts/M1A2Abrams';
import { FpvDrone3D } from '../parts/FpvDrone3D';

const DECK_Y = 1.2;
const WATER_Y = -1.65;

const smooth01 = (a: number, b: number, v: number) => {
  const x = Math.max(0, Math.min(1, (v - a) / (b - a)));
  return x * x * (3 - 2 * x);
};

const riverCenterX = (z: number) => Math.sin(z * 0.022) * 3.8 * smooth01(6.5, 28.0, Math.abs(z));

const BASE_STEPPE = heightField({ seed: 406, amp: 1.65, scale: 84 });

const STEPPE_RIVER_H: HeightFn = (x, z) => {
  const rx = x - riverCenterX(z);
  const absRx = Math.abs(rx);
  const absZ = Math.abs(z);

  const farMask = smooth01(8.0, 22.0, absRx) * smooth01(5.0, 15.0, absZ);
  const base = BASE_STEPPE(x, z) * (0.2 + 0.8 * farMask);

  const roadCorridor = 1 - smooth01(2.9, 6.4, absZ);
  const nearBridgeRoad = roadCorridor * (1 - smooth01(26.0, 48.0, absRx));
  const leveeCrest = (1 - smooth01(11.5, 36.0, absRx)) * DECK_Y;
  const rawLand = base * (1 - roadCorridor * 0.88) + Math.max(leveeCrest, roadCorridor * DECK_Y);
  const landY = rawLand * (1 - nearBridgeRoad) + DECK_Y * nearBridgeRoad;

  // Lòng sông Đông Âu & hai bờ đê dốc xuống lạch nước
  const bankT = smooth01(5.2, 10.8, absRx);
  const bedRipple = Math.sin(z * 0.14 + x * 0.28) * 0.07;
  const channelY = -2.85 + bedRipple;

  return channelY * (1 - bankT) + landY * bankT;
};

const AVOID_BUSH = (x: number, z: number) => {
  const rx = Math.abs(x - riverCenterX(z));
  if (Math.abs(z) < 5.6) return true; // đường đê & cầu
  if (rx < 6.7) return true; // lòng sông ngập nước
  if (x > -21 && x < -4 && z > -16.5 && z < -6.0) return true; // hành lang camera bờ sông
  return false;
};

const AVOID_ROCK = (x: number, z: number) => {
  const rx = Math.abs(x - riverCenterX(z));
  if (Math.abs(z) < 4.5) return true;
  if (rx < 5.5 || rx > 13.5) return true; // chỉ rải đá dọc hai sườn bờ sông
  if (x > -20 && x < -5 && z > -16 && z < -6.5) return true;
  return false;
};

const AVOID_TREES = (x: number, z: number) => {
  const rx = Math.abs(x - riverCenterX(z));
  if (z < 12) return true; // chỉ dựng hàng cây thảo nguyên hậu cảnh để thoáng tiền cảnh
  if (rx < 11.5) return true;
  return false;
};

type DebrisSpec = {
  x0: number;
  y0: number;
  z0: number;
  vx: number;
  vy: number;
  vz: number;
  sx: number;
  sy: number;
  sz: number;
  delay: number;
  rx: number;
  ry: number;
};

const DEBRIS_LIST: DebrisSpec[] = Array.from({ length: 26 }, (_, i) => {
  const fromPier = i % 3 !== 0;
  const pierX = i % 2 === 0 ? -4.2 : 4.2;
  const x0 = fromPier ? pierX + (rnd(i * 11 + 1) - 0.5) * 0.85 : (rnd(i * 11 + 2) - 0.5) * 3.4;
  const y0 = fromPier ? -0.35 + rnd(i * 11 + 3) * 0.95 : 0.42 + rnd(i * 11 + 4) * 0.24;
  const z0 = -2.35 + rnd(i * 11 + 5) * 3.1;
  return {
    x0,
    y0,
    z0,
    vx: (rnd(i * 11 + 6) - 0.5) * 1.6,
    vy: 0.25 + rnd(i * 11 + 7) * 0.85,
    vz: -0.45 - rnd(i * 11 + 8) * 1.15,
    sx: 0.11 + rnd(i * 11 + 9) * 0.16,
    sy: 0.08 + rnd(i * 11 + 10) * 0.13,
    sz: 0.09 + rnd(i * 11 + 12) * 0.14,
    delay: rnd(i * 11 + 13) * 0.34,
    rx: 3 + rnd(i * 11 + 14) * 7,
    ry: 4 + rnd(i * 11 + 15) * 6,
  };
});

const SoftSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({
  pos,
  size,
  color,
  opacity,
  rot = 0,
}) => {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ map: softDot(), transparent: true, depthWrite: false }),
    [],
  );
  if (opacity <= 0.004) return null;
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/** Một đoạn dầm cầu bê tông cốt thép (gồm bản mặt cầu, 3 dầm chữ T chịu lực, gờ chắn bánh & lan can sắt rỉ). */
const BridgeSpanSegment: React.FC<{
  len: number;
  xCenter: number;
  concreteMat: THREE.Material;
  deckMat: THREE.Material;
  rustMat: THREE.Material;
  postXs: number[];
}> = ({ len, xCenter, concreteMat, deckMat, rustMat, postXs }) => {
  const railGeo = useMemo(
    () =>
      pipe(
        [
          [xCenter - len / 2 + 0.05, 0.58, 0],
          [xCenter + len / 2 - 0.05, 0.58, 0],
        ],
        0.024,
        8,
      ),
    [xCenter, len],
  );
  const midRailGeo = useMemo(
    () =>
      pipe(
        [
          [xCenter - len / 2 + 0.05, 0.34, 0],
          [xCenter + len / 2 - 0.05, 0.34, 0],
        ],
        0.018,
        8,
      ),
    [xCenter, len],
  );

  return (
    <group>
      {/* Lớp mặt đường bê tông nhựa mòn (đỉnh tại y_local = 0) */}
      <mesh position={[xCenter, -0.03, 0]} geometry={rbox(len, 0.06, 4.92, 0.015)} material={deckMat} receiveShadow castShadow />
      {/* Bản mặt cầu bê tông cốt thép */}
      <mesh position={[xCenter, -0.15, 0]} geometry={rbox(len, 0.20, 5.44, 0.025)} material={concreteMat} receiveShadow castShadow />

      {/* 3 dầm dọc chịu lực chữ I/T dưới bản cầu */}
      {[-2.12, 0, 2.12].map((gz, gi) => (
        <group key={gi} position={[xCenter, 0, gz]}>
          <mesh position={[0, -0.44, 0]} geometry={rbox(len - 0.04, 0.42, 0.34, 0.02)} material={concreteMat} castShadow receiveShadow />
          <mesh position={[0, -0.64, 0]} geometry={rbox(len - 0.04, 0.12, 0.48, 0.02)} material={concreteMat} castShadow receiveShadow />
        </group>
      ))}

      {/* Gờ bó vỉa bê tông + lan can ống thép nông thôn hai bên (thấp 0.58 m để không che thân xe/APU) */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh
            position={[xCenter, 0.11, side * 2.58]}
            geometry={rbox(len - 0.03, 0.22, 0.26, 0.02)}
            material={concreteMat}
            castShadow
            receiveShadow
          />
          {postXs.map((px, pi) => (
            <mesh
              key={pi}
              position={[px, 0.39, side * 2.58]}
              geometry={rbox(0.08, 0.42, 0.08, 0.01)}
              material={rustMat}
              castShadow
            />
          ))}
          <group position={[0, 0, side * 2.58]}>
            <mesh geometry={railGeo} material={rustMat} castShadow />
            <mesh geometry={midRailGeo} material={rustMat} />
          </group>
        </group>
      ))}
    </group>
  );
};

/** Cầu bê tông nông thôn Đông Âu 3 nhịp + 2 trụ sông + vết nứt toác & mảnh vỡ khi xe 73.6 tấn đè lên nhịp giữa. */
const RuralConcreteBridge: React.FC<{ t: number; crackS: number }> = ({ t, crackS }) => {
  const concreteMat = useMemo(
    () =>
      paint({
        color: '#8f928c',
        camo: ['#777a74', '#a3a69f'],
        camoScale: 1.5,
        wear: 0.34,
        dirt: 0.46,
        roughness: 0.88,
        metalness: 0.06,
        repeat: 0.48,
        seed: 61,
      }),
    [],
  );

  const dampConcreteMat = useMemo(
    () =>
      paint({
        color: '#767b73',
        camo: ['#60665e', '#8a8e86'],
        camoScale: 1.35,
        wear: 0.36,
        dirt: 0.54,
        roughness: 0.9,
        metalness: 0.05,
        repeat: 0.5,
        seed: 67,
      }),
    [],
  );

  const spallEdgeMat = useMemo(() => plain('#bec2ba', 0.88, 0.04), []);

  const deckAsphaltMat = useMemo(
    () =>
      paint({
        color: '#46494c',
        camo: ['#383b3e', '#585b58'],
        camoScale: 1.7,
        wear: 0.3,
        dirt: 0.48,
        roughness: 0.9,
        metalness: 0.05,
        repeat: 0.42,
        seed: 73,
      }),
    [],
  );

  const rustMat = plain('#5b4133', 0.78, 0.45);
  const rebarMat = plain('#7b3d26', 0.65, 0.55);
  const crackVoidMat = plain('#0c0e11', 0.96, 0.04);
  const bearingMat = plain('#26292c', 0.82, 0.35);

  const sagAngle = crackS * 0.064; // ~3.7 độ oằn võng chữ V ở nhịp giữa
  const dtCrack = t - CUE.c04_s06_crack;

  return (
    <group>
      {/* Mặt đường dẫn bê tông nhựa cũ hai bờ đê nối vào đầu cầu */}
      {([-1, 1] as const).map((side) => (
        <group key={side}>
          <mesh
            position={[side * 25.8, DECK_Y - 0.025, 0]}
            geometry={rbox(30.4, 0.06, 4.86, 0.02)}
            material={deckAsphaltMat}
            receiveShadow
          />
          {/* Mố cầu bê tông hai đầu bờ đê + tường cánh */}
          <mesh
            position={[side * 10.75, DECK_Y - 1.35, 0]}
            geometry={rbox(1.3, 2.7, 5.75, 0.04)}
            material={dampConcreteMat}
            castShadow
            receiveShadow
          />
          {([-1, 1] as const).map((wz) => (
            <mesh
              key={wz}
              position={[side * 11.55, DECK_Y - 1.05, wz * 3.15]}
              rotation={[0, side * wz * 0.34, 0]}
              geometry={rbox(1.9, 2.1, 0.38, 0.03)}
              material={dampConcreteMat}
              castShadow
              receiveShadow
            />
          ))}
        </group>
      ))}

      {/* 2 Trụ cầu bê tông cốt thép đứng dưới lòng sông (x = -4.2 m và x = +4.2 m) */}
      {([-4.2, 4.2] as const).map((px, pIdx) => (
        <group key={px} position={[px, 0, 0]}>
          {/* Bệ móng trụ ngập sát mặt nước */}
          <mesh position={[0, -2.05, 0]} geometry={rbox(1.65, 0.95, 5.85, 0.06)} material={dampConcreteMat} receiveShadow />
          {/* 2 cột trụ bê tông vát cạnh + vách giằng ngang */}
          {([-1.82, 1.82] as const).map((cz) => (
            <mesh
              key={cz}
              position={[0, -0.62, cz]}
              geometry={rbox(1.06, 2.05, 1.12, 0.06)}
              material={dampConcreteMat}
              castShadow
              receiveShadow
            />
          ))}
          <mesh position={[0, -0.68, 0]} geometry={rbox(0.62, 1.88, 2.7, 0.04)} material={dampConcreteMat} castShadow receiveShadow />
          {/* Xà mũ trụ cầu (pier cap) & gối đỡ dầm */}
          <mesh position={[0, 0.31, 0]} geometry={rbox(1.32, 0.36, 5.64, 0.04)} material={concreteMat} castShadow receiveShadow />
          {[-2.12, 0, 2.12].map((bz, bi) => (
            <mesh key={bi} position={[0, 0.51, bz]} geometry={rbox(0.58, 0.07, 0.52, 0.01)} material={bearingMat} />
          ))}

          {/* Khe nứt đen toác dọc mặt trước trụ cầu & xà mũ khi xe tăng 73.6 tấn đè nhịp giữa */}
          {crackS > 0.01 && (
            <group>
              {[
                { x: -0.08, y: 0.30, z: -2.83, h: 0.38, w: 0.115 * crackS, rot: 0.16 * (pIdx === 0 ? 1 : -1) },
                { x: -0.04, y: 0.04, z: -2.39, h: 0.58, w: 0.125 * crackS, rot: -0.22 * (pIdx === 0 ? 1 : -1) },
                { x: 0.07, y: -0.44, z: -2.39, h: 0.66, w: 0.118 * crackS, rot: 0.25 * (pIdx === 0 ? 1 : -1) },
                { x: -0.03, y: -0.98, z: -2.39, h: 0.68, w: 0.095 * crackS, rot: -0.18 * (pIdx === 0 ? 1 : -1) },
                // Nhánh nứt phụ toác chéo trên thân cột trụ
                { x: 0.24, y: -0.22, z: -2.39, h: 0.48, w: 0.075 * crackS, rot: -0.62 },
              ].map((cr, ci) => (
                <group key={ci} position={[cr.x, cr.y, cr.z]} rotation={[0, 0, cr.rot]}>
                  <mesh position={[0, 0, -0.006]} geometry={rbox(cr.w * 1.65, cr.h * 1.03, 0.035, 0.004)} material={spallEdgeMat} />
                  <mesh geometry={rbox(cr.w, cr.h, 0.055, 0.005)} material={crackVoidMat} />
                </group>
              ))}
            </group>
          )}
        </group>
      ))}

      {/* Nhịp biên trái (-10.6 .. -4.2) và nhịp biên phải (+4.2 .. +10.6) */}
      <group position={[0, DECK_Y, 0]}>
        <BridgeSpanSegment
          len={6.4}
          xCenter={-7.4}
          concreteMat={concreteMat}
          deckMat={deckAsphaltMat}
          rustMat={rustMat}
          postXs={[-10.2, -8.8, -7.4, -6.0, -4.6]}
        />
        <BridgeSpanSegment
          len={6.4}
          xCenter={7.4}
          concreteMat={concreteMat}
          deckMat={deckAsphaltMat}
          rustMat={rustMat}
          postXs={[4.6, 6.0, 7.4, 8.8, 10.2]}
        />
      </group>

      {/* Nhịp giữa (-4.2 .. +4.2): tách làm 2 nửa oằn võng xuống tại tâm cầu khi CUE.c04_s06_crack kích hoạt */}
      <group position={[-4.2, DECK_Y, 0]} rotation={[0, 0, -sagAngle]}>
        <BridgeSpanSegment
          len={4.18}
          xCenter={2.09}
          concreteMat={concreteMat}
          deckMat={deckAsphaltMat}
          rustMat={rustMat}
          postXs={[0.45, 1.85, 3.35]}
        />
        {crackS > 0.01 && (
          <>
            {[
              { x: 3.1, y: -0.48, h: 0.44, rot: 0.28 },
              { x: 3.85, y: -0.40, h: 0.54, rot: -0.18 },
              { x: 2.25, y: -0.52, h: 0.34, rot: -0.34 },
            ].map((fc, fi) => (
              <mesh
                key={fi}
                position={[fc.x, fc.y, -2.37]}
                rotation={[0, 0, fc.rot]}
                geometry={rbox(0.075 * crackS, fc.h, 0.06, 0.005)}
                material={crackVoidMat}
              />
            ))}
          </>
        )}
      </group>

      <group position={[4.2, DECK_Y, 0]} rotation={[0, 0, sagAngle]}>
        <BridgeSpanSegment
          len={4.18}
          xCenter={-2.09}
          concreteMat={concreteMat}
          deckMat={deckAsphaltMat}
          rustMat={rustMat}
          postXs={[-3.35, -1.85, -0.45]}
        />
        {crackS > 0.01 && (
          <>
            {[
              { x: -3.75, y: -0.40, h: 0.56, rot: 0.2 },
              { x: -2.85, y: -0.48, h: 0.42, rot: -0.26 },
            ].map((fc, fi) => (
              <mesh
                key={fi}
                position={[fc.x, fc.y, -2.37]}
                rotation={[0, 0, fc.rot]}
                geometry={rbox(0.075 * crackS, fc.h, 0.06, 0.005)}
                material={crackVoidMat}
              />
            ))}
          </>
        )}
      </group>

      {/* Khe gãy toác chữ V & cốt thép lộ ra ngay giữa bụng dầm nhịp chính (x = 0) */}
      {crackS > 0.02 && (
        <group position={[0, DECK_Y - 4.2 * Math.sin(sagAngle), 0]}>
          <mesh position={[0, -0.38, -2.14]} geometry={rbox(0.16 * crackS, 0.62, 0.54, 0.01)} material={crackVoidMat} />
          <mesh position={[0, -0.05, 0]} geometry={rbox(0.11 * crackS, 0.14, 5.46, 0.008)} material={crackVoidMat} />
          {[-0.60, -0.46, -0.28].map((ry, ri) => (
            <mesh
              key={ri}
              position={[0, ry, -2.32]}
              rotation={[0, 0, (ri - 1) * 0.12]}
              geometry={rbox(0.46, 0.022, 0.022, 0.004)}
              material={rebarMat}
            />
          ))}
        </group>
      )}

      {/* Mảnh vỡ bê tông rơi xuống suối + vòng sóng bắn tung toé + bụi xi-măng mù dưới gầm cầu */}
      {dtCrack > 0 && dtCrack < 5.5 && (
        <group>
          {DEBRIS_LIST.map((d, idx) => {
            const age = dtCrack - d.delay;
            if (age <= 0) return null;
            const x = d.x0 + d.vx * age;
            const y = d.y0 + d.vy * age - 4.9 * age * age;
            const z = d.z0 + d.vz * age;

            // Thời điểm mảnh bê tông chạm mặt nước WATER_Y
            const disc = d.vy * d.vy - 4 * 4.9 * (WATER_Y - d.y0);
            const tSplash = disc > 0 ? (d.vy + Math.sqrt(disc)) / 9.8 : 0.65;
            const splashAge = age - tSplash;

            return (
              <React.Fragment key={idx}>
                {y >= WATER_Y - 0.15 && (
                  <mesh
                    position={[x, y, z]}
                    rotation={[age * d.rx, age * d.ry, age * 4.2]}
                    geometry={rbox(d.sx, d.sy, d.sz, 0.015)}
                    material={idx % 2 === 0 ? concreteMat : dampConcreteMat}
                    castShadow
                  />
                )}
                {splashAge > 0 && splashAge < 1.15 && idx % 2 === 0 && (
                  <group position={[d.x0 + d.vx * tSplash, WATER_Y + 0.02, d.z0 + d.vz * tSplash]}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[0.10 + splashAge * 0.72, 0.16 + splashAge * 0.82, 22]} />
                      <meshBasicMaterial
                        color="#cfd9de"
                        transparent
                        opacity={0.34 * (1 - splashAge / 1.15)}
                        side={THREE.DoubleSide}
                      />
                    </mesh>
                    {splashAge < 0.5 && (
                      <SoftSprite
                        pos={[0, 0.16 + splashAge * 0.6, 0]}
                        size={0.42 + splashAge * 0.75}
                        color="#e2ebef"
                        opacity={0.48 * (1 - splashAge / 0.5)}
                        rot={idx}
                      />
                    )}
                  </group>
                )}
              </React.Fragment>
            );
          })}

          {/* Màn bụi bê tông xám trắng rụng dọc gầm nhịp giữa & hai đầu trụ cầu */}
          {Array.from({ length: 18 }, (_, i) => {
            const born = (i / 18) * 0.45;
            const age = dtCrack - born;
            if (age <= 0 || age > 4.2) return null;
            const anchorX = i % 3 === 0 ? -4.15 : i % 3 === 1 ? 4.15 : (rnd(i * 19 + 1) - 0.5) * 3.6;
            const px = anchorX + (rnd(i * 19 + 2) - 0.5) * 0.9 + age * 0.25;
            const py = 0.42 - Math.min(1.65, age * 0.55) - rnd(i * 19 + 3) * 0.35;
            const pz = -2.25 + (rnd(i * 19 + 4) - 0.3) * 1.6;
            const op = 0.52 * (1 - age / 4.2) * Math.min(1, age * 5);
            return (
              <SoftSprite
                key={`dust_${i}`}
                pos={[px, py, pz]}
                size={1.05 + age * 0.95}
                color="#b8bdb8"
                opacity={op}
                rot={i * 1.3}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

/** Mặt nước lạch sông Đông Âu xám lạnh có vân dòng chảy (tránh loá trắng phản xạ gương). */
const CreekWater: React.FC<{ t: number }> = ({ t }) => {
  const waterMat = useMemo(
    () =>
      paint({
        color: '#3f535d',
        camo: ['#32444d', '#4f646e'],
        camoScale: 2.4,
        wear: 0.08,
        dirt: 0.18,
        roughness: 0.48,
        metalness: 0.2,
        repeat: 3.5,
        seed: 91,
      }),
    [],
  );

  return (
    <group position={[0, WATER_Y, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} material={waterMat} receiveShadow>
        <planeGeometry args={[26, 260]} />
      </mesh>
      {/* Vệt bọt nước lăn tăn quanh hai chân trụ cầu bê tông */}
      {([-4.2, 4.2] as const).map((px, i) => {
        const pulse = 0.94 + 0.06 * Math.sin(t * 2.2 + i * 2.1);
        return (
          <mesh key={px} position={[px, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[pulse, 1, pulse]}>
            <ringGeometry args={[0.92, 1.24, 28]} />
            <meshBasicMaterial color="#bfd0d6" transparent opacity={0.22} side={THREE.DoubleSide} />
          </mesh>
        );
      })}
    </group>
  );
};

const C04S06: React.FC = () => {
  const t = useT();

  // ---------------- 1. CHUYỂN ĐỘNG M1A2 SEPv3, APU SILENT WATCH & ĐỘ LÚN CẦU ----------------
  // Đậu gác im lặng ở đầu cầu bên trái (581.34..591.15s), sau đó bò nặng nề lên nhịp giữa cầu (591.15..597.35s)
  const crawlP = prog(t, 591.15, 597.35, Easing.bezier(0.38, 0.0, 0.22, 1));
  const tankX = lerp(-12.4, -0.35, crawlP);
  const travel = tankX - -12.4;

  // Nhịp cầu gãy sụp tại CUE.c04_s06_crack (596.52s)
  const crackBase = prog(t, CUE.c04_s06_crack, CUE.c04_s06_crack + 0.46, Easing.out(Easing.cubic));
  const crackVib =
    t >= CUE.c04_s06_crack
      ? Math.exp(-(t - CUE.c04_s06_crack) * 4.2) * Math.sin((t - CUE.c04_s06_crack) * 26) * 0.09
      : 0;
  const crackS = Math.max(0, Math.min(1.12, crackBase + crackVib));

  // Độ lún mặt cầu ngay dưới trọng tâm xe tăng + góc khựng mũi xe hullPitch
  const onMidSpan = Math.max(0, 1 - Math.abs(tankX) / 4.2);
  const sagUnderTank = onMidSpan * crackS * 0.25;
  const tankY = DECK_Y - sagUnderTank;
  const joltPitch = -0.052 * bump(t, CUE.c04_s06_crack, 0.68) - 0.024 * crackBase * onMidSpan;
  const startSettle = -0.012 * bump(t, 591.15, 0.9); // nhấc mũi nhẹ khi bắt đầu bò
  const hullPitch = joltPitch + startSettle;

  // Silent watch: kính ngắm CITV & trạm CROWS quét tuần tra liên tục, tháp pháo giữ cảnh giới
  const turretYaw = Math.sin(t * 0.28) * 0.07 + 0.05;
  const citvYaw = Math.sin(t * 1.15) * 0.82 + 0.3;
  const crowsYaw = Math.sin(t * 0.88 - 0.7) * 0.62 - 0.25;
  const gunPitch = 0.025 + Math.sin(t * 0.4) * 0.008;

  // Nhịp rung & đèn báo xanh-vàng trên hộp máy phát phụ APU bên đuôi trái [-3.68, 1.52, -1.34]
  const apuActive = prog(t, 581.3, 582.0) * (1 - prog(t, 592.2, 593.5) * 0.35);
  const apuBoost = prog(t, CUE.c04_s06_apu - 0.15, CUE.c04_s06_apu + 0.35);
  const apuAmberBlink = 0.45 + 0.55 * Math.max(0, Math.sin((t - CUE.c04_s06_apu) * 9.5));
  const apuVibY = Math.sin(t * 58) * 0.0045 * (0.4 + 0.6 * apuBoost);

  // ---------------- 2. ĐÀN 3 CHIẾC FPV DRONE $500 LAO VÀO TIỀN CẢNH (t >= 599.82s) ----------------
  const showDrones = t >= 599.82;
  const droneP = prog(t, 599.85, 603.2, Easing.out(Easing.cubic));
  const targetRoof: V3 = [tankX + 0.1, tankY + 2.35, 0];

  const droneConfigs = useMemo(
    () => [
      // Drone 1 (dẫn đầu trung tâm bầu trời tiền cảnh, sắc nét trên nền trời xám hướng mũi đạn PG-7VL xuống xe tăng)
      {
        start: [-8.4, 3.12, -13.5] as V3,
        mid: [-6.85, 2.72, -11.05] as V3,
        end: [-6.25, 2.62, -10.15] as V3,
        bank: 0.2,
        phase: 0.0,
        scale: 1.16,
      },
      // Drone 2 (cánh phải cao hơn trong đội hình bậc thang)
      {
        start: [-7.45, 3.62, -13.8] as V3,
        mid: [-5.82, 3.2, -11.15] as V3,
        end: [-5.1, 3.06, -9.95] as V3,
        bank: -0.26,
        phase: 1.9,
        scale: 1.12,
      },
      // Drone 3 (cánh trái nghiêng người bổ xuống cầu)
      {
        start: [-9.1, 3.26, -13.0] as V3,
        mid: [-7.55, 2.86, -10.55] as V3,
        end: [-6.95, 2.74, -9.55] as V3,
        bank: 0.28,
        phase: 3.4,
        scale: 1.12,
      },
    ],
    [],
  );

  // ---------------- 3. NGÔN NGỮ CAMERA 3/4 BỜ SÔNG -> CẦU NỨT -> BẦU TRỜI FPV ----------------
  // Nhịp 1 (581.54..591.2s): Góc 3/4 bờ sông sát đuôi trái SEPv3 thấy rõ hộp APU & toàn cảnh cầu bê tông phía trước
  // Nhịp 2 (591.2..599.6s): Lùi xuống triền bờ sông nhìn chếch lên nhịp giữa cầu bê tông đang oằn võng & nứt toác
  // Nhịp 3 (599.6..603.16s): Lia chếch lên khoảng trời xám trên cầu đón 3 chiếc FPV Drone vọt vào tiền cảnh
  const pToBridge = prog(t, 590.8, 596.3, Easing.inOut(Easing.cubic));
  const pSilentDrift = prog(t, 581.54, 590.8, Easing.inOut(Easing.quad));
  const pToSky = prog(t, 599.7, 600.85, Easing.out(Easing.cubic));

  const pos1: V3 = [
    lerp(-18.2, -15.4, pSilentDrift),
    lerp(2.65, 2.42, pSilentDrift),
    lerp(-6.4, -8.8, pSilentDrift),
  ];
  const look1: V3 = [
    lerp(-13.6, -11.4, pSilentDrift),
    lerp(1.62, 1.58, pSilentDrift),
    lerp(-0.45, -0.15, pSilentDrift),
  ];

  const pos2: V3 = [-6.9, 1.38, -13.1];
  const look2: V3 = [-0.65, 0.92, 0.0];

  const pos3: V3 = [-7.8, 1.95, -12.6];
  const look3: V3 = [-1.15, 4.55, -1.2];

  const midPos: V3 = [
    lerp(pos1[0], pos2[0], pToBridge),
    lerp(pos1[1], pos2[1], pToBridge),
    lerp(pos1[2], pos2[2], pToBridge),
  ];
  const midLook: V3 = [
    lerp(look1[0], look2[0], pToBridge),
    lerp(look1[1], look2[1], pToBridge),
    lerp(look1[2], look2[2], pToBridge),
  ];

  const shakeCrack = bump(t, CUE.c04_s06_crack, 0.5) * 0.14;
  const rawCamX = lerp(midPos[0], pos3[0], pToSky);
  const rawCamZ = lerp(midPos[2], pos3[2], pToSky);
  const rawCamY = lerp(midPos[1], pos3[1], pToSky) + Math.sin(t * 36) * shakeCrack;
  const safeCamY = Math.max(rawCamY, STEPPE_RIVER_H(rawCamX, rawCamZ) + 1.1);

  const camPos: V3 = [rawCamX, safeCamY, rawCamZ];
  const camLook: V3 = [
    lerp(midLook[0], look3[0], pToSky),
    lerp(midLook[1], look3[1], pToSky) - Math.cos(t * 42) * shakeCrack * 0.8,
    lerp(midLook[2], look3[2], pToSky),
  ];

  const greenLedMat = useMemo(
    () =>
      plain('#2ee86e', 0.25, 0.1, {
        emissive: '#25e062',
        emissiveIntensity: 2.8,
      }),
    [],
  );

  const amberLedMat = useMemo(
    () =>
      plain('#ffaa2b', 0.25, 0.1, {
        emissive: '#ff9d1c',
        emissiveIntensity: 3.0,
      }),
    [],
  );

  return (
    <AbsoluteFill>
      <Stage
        {...LOOK_STEPPE_OVERCAST.stage}
        shadowArea={34}
        shadowCenter={[lerp(-11, -1, pToBridge), 1.0, -1.0]}
      >
        <Cam pos={camPos} look={camLook} fov={44} />
        {/* Ánh sáng bầu trời tán xạ từ phía bờ sông (-Z) để nổi rõ vân nguỵ trang Woodland, bánh xích, Trophy APS & khe nứt trụ cầu */}
        <directionalLight position={[-16, 20, -26]} intensity={1.18} color="#dde7f0" />

        {/* Địa hình thảo nguyên Đông Âu, hai bờ đê, lạch nước & thảm cỏ olive / đá bờ suối */}
        <Terrain
          h={STEPPE_RIVER_H}
          size={420}
          seg={240}
          center={[0, 0]}
          colors={LOOK_STEPPE_OVERCAST.terrain}
          grainRepeat={44}
        />
        <CreekWater t={t} />
        <Scatter
          kind="bush"
          count={220}
          area={[-110, -90, 110, 110]}
          h={STEPPE_RIVER_H}
          seed={4061}
          scale={[0.55, 1.15]}
          avoid={AVOID_BUSH}
          tint={LOOK_STEPPE_OVERCAST.scatterTint}
        />
        <Scatter
          kind="rock"
          count={95}
          area={[-36, -65, 36, 75]}
          h={STEPPE_RIVER_H}
          seed={4062}
          scale={[0.35, 0.85]}
          avoid={AVOID_ROCK}
          tint="#7d8078"
        />
        <Scatter
          kind="broadleaf"
          count={65}
          area={[-130, 16, 130, 135]}
          h={STEPPE_RIVER_H}
          seed={4063}
          scale={[0.85, 1.45]}
          avoid={AVOID_TREES}
          tint="#7d8a72"
        />

        {/* Cầu bê tông nông thôn Đông Âu oằn võng & nứt toác dưới tải trọng 73.6 tấn */}
        <RuralConcreteBridge t={t} crackS={crackS} />

        {/* M1A2 SEPv3 nguỵ trang NATO Woodland: gác im lặng (exhaustHeat=0, APU hoạt động) rồi bò lên cầu */}
        <M1A2Abrams
          variant="sepv3"
          camo="woodland"
          position={[tankX, tankY, 0]}
          turretYaw={turretYaw}
          gunPitch={gunPitch}
          citvYaw={citvYaw}
          crowsYaw={crowsYaw}
          travel={travel}
          hullPitch={hullPitch}
          exhaustHeat={0}
        />

        {/* Cụm đèn báo xanh-vàng, khung rung nhẹ & làn khói mỏng của máy phát phụ APU bên đuôi trái SEPv3 */}
        {apuActive > 0.01 && (
          <group position={[tankX, tankY + 0.65, 0]} rotation={[0, 0, hullPitch]}>
            <group position={[-3.68, 1.52 - 0.65 + apuVibY, -1.34]}>
              {/* Bảng đèn trạng thái Silent Watch APU ở sườn trái (-Z) */}
              <mesh position={[0.16, 0.08, -0.268]} geometry={rbox(0.036, 0.036, 0.016, 0.006)} material={greenLedMat} />
              <mesh
                position={[0.08, 0.08, -0.268]}
                scale={0.75 + 0.35 * apuAmberBlink}
                geometry={rbox(0.036, 0.036, 0.016, 0.006)}
                material={amberLedMat}
              />
              {/* Vành viền sáng mảnh báo hiệu cụm APU đang chạy ngầm dưới giáp */}
              {apuBoost > 0.02 && (
                <>
                  <mesh position={[0, 0.145, -0.255]} geometry={rbox(0.56, 0.016, 0.02, 0.004)} material={amberLedMat} />
                  <pointLight
                    color="#78f09c"
                    intensity={(0.9 + 0.7 * apuAmberBlink) * apuBoost}
                    distance={2.6}
                    decay={1.8}
                    position={[0.1, 0.14, -0.42]}
                  />
                </>
              )}
            </group>

            {/* Làn khói xả nhẹ mát của máy phát phụ APU (đối lập hẳn với vỉ đuôi tuabin tắt lạnh) */}
            {Array.from({ length: 7 }, (_, ki) => {
              const cycle = ((t * 1.15 + ki / 7) % 1);
              const px = -4.12 - cycle * 0.55;
              const py = 1.44 - 0.65 + cycle * 0.72;
              const pz = -1.50 - cycle * 0.28 + Math.sin(t * 2.4 + ki) * 0.06;
              const op = Math.sin(cycle * Math.PI) * 0.24 * (0.45 + 0.55 * apuBoost);
              return (
                <SoftSprite
                  key={ki}
                  pos={[px, py, pz]}
                  size={0.22 + cycle * 0.42}
                  color="#cad6dc"
                  opacity={op}
                  rot={ki * 0.9}
                />
              );
            })}
          </group>
        )}

        {/* 3 chiếc FPV Drone cảm tử $500 lao vọt vào khoảng trời xám tiền cảnh bổ thẳng về phía xe tăng */}
        {showDrones &&
          droneConfigs.map((dc, idx) => {
            const u = droneP;
            const omt = 1 - u;
            const pos: V3 = [
              omt * omt * dc.start[0] + 2 * omt * u * dc.mid[0] + u * u * dc.end[0],
              omt * omt * dc.start[1] + 2 * omt * u * dc.mid[1] + u * u * dc.end[1],
              omt * omt * dc.start[2] + 2 * omt * u * dc.mid[2] + u * u * dc.end[2],
            ];
            const dx = targetRoof[0] - pos[0];
            const dy = targetRoof[1] - pos[1];
            const dz = targetRoof[2] - pos[2];
            const horiz = Math.max(0.01, Math.hypot(dx, dz));
            const yaw = Math.atan2(-dz, dx);
            const divePitch = Math.atan2(dy, horiz) - 0.16;

            return (
              <FpvDrone3D
                key={idx}
                position={pos}
                rotation={[dc.bank, yaw, 0]}
                pitch={divePitch}
                rotorSpin={t * 82 + dc.phase}
                scale={dc.scale}
              />
            );
          })}
      </Stage>

      {/* Nhãn thông số (tối đa 1 <Label> xuất hiện tại một thời điểm, đặt vùng an toàn góc trên trái) */}
      <Label
        t={t}
        text="M1A2 SEPv3"
        x={300}
        y={165}
        from={CUE.c04_s06_sepv3}
        until={590.4}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="73.6 TONS"
        x={285}
        y={165}
        from={CUE.c04_s06_weight}
        until={598.8}
        bg={PAL.cream}
        fg={PAL.ink}
      />
      <Label
        t={t}
        text="$500"
        x={230}
        y={165}
        from={CUE.c04_s06_drones}
        until={602.8}
        bg={PAL.amber}
        fg={PAL.ink}
      />
    </AbsoluteFill>
  );
};

export default C04S06;
