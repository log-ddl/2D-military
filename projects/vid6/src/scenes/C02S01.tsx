import React, { useMemo } from 'react';
import * as THREE from 'three';
import { bump, lerp, prog, useT } from '@core/time';
import { useSize } from '@core/frame';
import { Cam, Stage, type V3 } from '@skill/military/3d/stage';
import { plain } from '@skill/military/3d/materials';
import { rbox } from '@skill/military/3d/geom';
import { softDot } from '@skill/military/3d/fx';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAL } from '../design/palette';
import { LOOK_INTERIOR_BAY } from '../design/stage';
import { TurretInterior3D } from '../parts/TurretInterior3D';
import { Ammo120mm3D } from '../parts/Ammo120mm3D';

const lerpV3 = (a: V3, b: V3, p: number): V3 => [
  lerp(a[0], b[0], p),
  lerp(a[1], b[1], p),
  lerp(a[2], b[2], p),
];

// Sàn bệ studio kỹ thuật thép tối đặt dưới giỏ tháp pháo để khung hình có chiều sâu cơ khí
const BayInspectionDeck: React.FC = () => {
  const matDeck = useMemo(() => plain('#151f2b', 0.76, 0.38), []);
  const matInner = useMemo(() => plain('#1c2938', 0.64, 0.46), []);
  const matRim = useMemo(() => plain('#2e455e', 0.42, 0.72), []);
  const matAccent = useMemo(
    () =>
      plain('#29e3d4', 0.25, 0.4, {
        emissive: new THREE.Color('#19b8ab'),
        emissiveIntensity: 0.45,
      }),
    [],
  );

  return (
    <group position={[0.06, 0, 0]}>
      <mesh position={[0, -0.04, 0]} material={matDeck} receiveShadow>
        <cylinderGeometry args={[4.6, 4.8, 0.08, 64]} />
      </mesh>
      <mesh position={[0, 0.004, 0]} material={matInner} receiveShadow>
        <cylinderGeometry args={[2.35, 2.4, 0.012, 56]} />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[Math.PI / 2, 0, 0]} material={matRim}>
        <torusGeometry args={[1.48, 0.016, 10, 64]} />
      </mesh>
      <mesh position={[0, 0.013, 0]} rotation={[Math.PI / 2, 0, 0]} material={matAccent}>
        <torusGeometry args={[1.18, 0.005, 8, 64]} />
      </mesh>
      {Array.from({ length: 8 }, (_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 1.82, 0.011, Math.sin(a) * 1.82]}
            rotation={[0, -a, 0]}
            material={matRim}
          >
            <boxGeometry args={[0.58, 0.008, 0.024]} />
          </mesh>
        );
      })}
    </group>
  );
};

// Khung wireframe đồng thau của vỏ đạn pháo cổ điển (hiện rồi tắt dứt khoát: "no giant brass casing ever clatters")
const GhostBrassCasing: React.FC<{ opacity: number; t: number }> = ({ opacity, t }) => {
  if (opacity <= 0.005) return null;

  const wobble = Math.sin((t - CUE.c02_s01_no_brass) * 7.5) * 0.04;
  const brassGlow = '#f7c552';
  const cancelCol = PAL.crimson;

  return (
    <group position={[-0.14, 0.66, 0.18]} rotation={[0.16, 0.28 + wobble, -0.34]}>
      {/* Vỏ lưới wireframe đồng thau */}
      <mesh rotation={[0, 0, -Math.PI / 2]}>
        <cylinderGeometry args={[0.064, 0.078, 0.68, 16, 5, true]} />
        <meshBasicMaterial color={brassGlow} wireframe transparent opacity={opacity * 0.85} toneMapped={false} />
      </mesh>
      {/* Vành móc vỏ đồng lớn ở đáy */}
      <mesh position={[-0.34, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[0.088, 0.006, 8, 28]} />
        <meshBasicMaterial color={brassGlow} transparent opacity={opacity * 0.95} toneMapped={false} />
      </mesh>
      {/* Các vòng gân đồng dọc thân */}
      {[-0.22, -0.06, 0.1, 0.26].map((xPos, idx) => (
        <mesh key={idx} position={[xPos, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[lerp(0.076, 0.065, idx / 3), 0.004, 8, 24]} />
          <meshBasicMaterial color="#ffe49c" transparent opacity={opacity * 0.9} toneMapped={false} />
        </mesh>
      ))}
      {/* Vòng gạch chéo huỷ bỏ màu đỏ cảnh báo */}
      <group rotation={[0, 0.2, 0]}>
        <mesh>
          <torusGeometry args={[0.26, 0.008, 10, 40]} />
          <meshBasicMaterial color={cancelCol} transparent opacity={opacity * 0.94} toneMapped={false} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 4]}>
          <boxGeometry args={[0.5, 0.015, 0.012]} />
          <meshBasicMaterial color={cancelCol} transparent opacity={opacity * 0.96} toneMapped={false} />
        </mesh>
      </group>
    </group>
  );
};

// Buồng đạn M256 bổ đôi 180° gắn đồng trục sát mặt cắt khoá nòng để phô diễn trọn vẹn viên đạn 120mm tự cháy
const CutawayChamberModule: React.FC<{
  reveal: number;
  burnProgress: number;
  afterglow: number;
  shotLaunch: number;
  breechOpen: number;
}> = ({ reveal, burnProgress, afterglow, shotLaunch, breechOpen }) => {
  const matOuter = useMemo(() => {
    const m = plain('#556678', 0.36, 0.82).clone();
    m.side = THREE.DoubleSide;
    return m;
  }, []);
  const matChromeBore = useMemo(() => {
    const m = plain('#d8e4f0', 0.16, 0.92).clone();
    m.side = THREE.DoubleSide;
    return m;
  }, []);
  const matCutRed = useMemo(() => plain('#cc3b28', 0.44, 0.32), []);
  const matDatum = useMemo(
    () =>
      plain('#29e3d4', 0.2, 0.4, {
        emissive: new THREE.Color('#20cfc0'),
        emissiveIntensity: 0.75,
      }),
    [],
  );

  const outerHalfGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.114, 0.12, 1.04, 32, 1, true, Math.PI / 2, Math.PI);
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);

  const innerHalfGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.086, 0.09, 1.03, 32, 1, true, Math.PI / 2, Math.PI);
    g.rotateZ(-Math.PI / 2);
    return g;
  }, []);

  if (reveal <= 0.005) return null;

  const activeFire =
    burnProgress > 0.01 && burnProgress < 0.995
      ? Math.max(0.28, Math.sin(burnProgress * Math.PI))
      : 0;
  const fireGlow = Math.max(activeFire, afterglow * 0.75);
  const firedAlready = shotLaunch > 0.001;

  return (
    <group
      position={[-0.44, 0.01, lerp(0.18, 0.34, reveal)]}
      scale={[1, reveal, reveal]}
    >
      {/* Thanh gióng kỹ thuật nối mặt cắt buồng đạn vào đúng tâm khoá nòng M256 */}
      {[-0.44, 0.38].map((xp, idx) => (
        <mesh key={idx} position={[xp, 0, -0.09]} material={matDatum}>
          <boxGeometry args={[0.012, 0.012, 0.16]} />
        </mesh>
      ))}

      {/* Lòng buồng đạn 120mm bổ đôi 180° có bề dày thành crôm sáng bóng (DoubleSide để nhìn rõ lòng máng cong) */}
      <mesh geometry={outerHalfGeo} material={matOuter} castShadow receiveShadow />
      <mesh geometry={innerHalfGeo} material={matChromeBore} receiveShadow />

      {/* Cổ họng buồng đạn phía đầu nòng */}
      <mesh position={[0.515, 0, 0]} rotation={[0, Math.PI / 2, Math.PI / 2]} material={matCutRed}>
        <torusGeometry args={[0.1, 0.015, 10, 24, Math.PI]} />
      </mesh>

      {/* Hai dải mép cắt kỹ thuật màu đỏ ở thành trên & thành dưới buồng đạn */}
      {[0.102, -0.102].map((yCut, idx) => (
        <mesh key={idx} position={[0, yCut, 0.002]} material={matCutRed}>
          <boxGeometry args={[1.04, 0.026, 0.02]} />
        </mesh>
      ))}

      {/* Mặt bích khoá nòng cắt bổ phía đuôi (trượt mở xuống đồng bộ với breechOpen) */}
      <group position={[-0.54, -0.25 * breechOpen, -0.02]}>
        <mesh geometry={rbox(0.065, 0.25, 0.14, 0.01)} material={matChromeBore} castShadow />
        <mesh position={[0, 0, 0.072]} material={matCutRed}>
          <boxGeometry args={[0.062, 0.24, 0.01]} />
        </mesh>
      </group>

      {/* Viên đạn 120mm M829A4 trước và trong khi vỏ thuốc phóng cứng tự cháy */}
      {!firedAlready ? (
        <Ammo120mm3D kind="m829a4_cartridge" burnProgress={burnProgress} position={[0, 0, 0]} />
      ) : (
        <group>
          {/* Khi thuốc phóng vừa cháy hết: mũi lao + sabot phóng vọt về phía nòng (+X) */}
          {shotLaunch < 0.98 && (
            <Ammo120mm3D
              kind="m829a4_flight"
              sabotSep={0}
              position={[0.092 + shotLaunch * 1.45, 0, 0]}
            />
          )}
          {/* Trong buồng đạn chỉ còn trơ lại duy nhất chiếc đế kim loại cỡ gạt tàn trước khi trượt rơi */}
          {breechOpen < 0.55 && (
            <group
              position={[-0.492 - breechOpen * 0.08, -breechOpen * 0.06, 0]}
              rotation={[0, 0, -Math.PI / 2 + breechOpen * 0.35]}
              scale={[1.0, 0.64, 1.0]}
            >
              <Ammo120mm3D kind="base_puck" />
            </group>
          )}
        </group>
      )}

      {/* Quầng lửa hổ phách, tàn lửa & khí cháy rực trong lòng buồng đạn */}
      {fireGlow > 0.01 && (
        <group>
          <pointLight
            position={[-0.14 + burnProgress * 0.24, 0.02, 0.14]}
            color="#ff7414"
            intensity={fireGlow * 10.5}
            distance={2.8}
            decay={1.5}
          />
          <mesh position={[-0.15 + burnProgress * 0.14, 0, -0.01]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.074, 0.078, 0.66, 24]} />
            <meshBasicMaterial
              color="#ff8c24"
              transparent
              opacity={fireGlow * 0.38}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          {[0, 1, 2, 3].map((k) => {
            const xRing = -0.34 + ((burnProgress * 1.2 + afterglow * 0.5 + k * 0.21) % 0.8);
            return (
              <mesh key={k} position={[xRing, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <torusGeometry args={[0.064 * (1 - afterglow * 0.25), 0.0075, 8, 28]} />
                <meshBasicMaterial
                  color={afterglow > 0.1 ? '#ffb35c' : '#ffe89e'}
                  transparent
                  opacity={fireGlow * 0.7}
                  toneMapped={false}
                />
              </mesh>
            );
          })}
        </group>
      )}
    </group>
  );
};

// Sợi khói mảnh bốc lên từ lòng chiếc đế kim loại cỡ gạt tàn sau khi rơi xuống sàn giỏ
const PuckSmokeWisps: React.FC<{ t: number; at: number; pos: V3 }> = ({ t, at, pos }) => {
  const matBase = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const dt = t - at;
  if (dt <= 0) return null;

  return (
    <group position={pos}>
      {Array.from({ length: 10 }, (_, i) => {
        const cycle = (dt * 0.62 + i / 10) % 1;
        const fadeIn = Math.min(1, dt * 1.8);
        const y = 0.055 + cycle * 0.34;
        const x = Math.sin(cycle * 5.2 + i * 1.3) * 0.03 * cycle;
        const z = Math.cos(cycle * 4.4 + i * 0.9) * 0.025 * cycle;
        const s = 0.055 + cycle * 0.145;
        const op = Math.sin(cycle * Math.PI) * 0.28 * fadeIn;
        if (op <= 0.004) return null;

        const m = matBase.clone();
        m.color.set(cycle < 0.25 ? '#ebd0aa' : '#b3c0cd');
        m.opacity = op;
        m.rotation = cycle * 2.2 + i;
        return <sprite key={i} material={m} position={[x, y, z]} scale={[s, s, s]} />;
      })}
    </group>
  );
};

const C02S01: React.FC = () => {
  const t = useT();
  const { W, H } = useSize();

  // 1. Dư chấn hồi nòng ngay đầu cảnh (183.90 -> 185.05s) + nhịp giật nhẹ khi viên mẫu phóng khỏi buồng đạn (195.0s)
  const openingRecoil = (1 - prog(t, 183.85, 185.05)) * 0.88;
  const demoShotKick = bump(t, CUE.c02_s01_burn_chamber + 0.12, 0.42) * 0.46;
  const totalRecoil = Math.min(1, openingRecoil + demoShotKick);

  // 2. Wireframe vỏ đồng cổ điển hiện ở `no@185.46` rồi tắt dứt khoát ở `clatters@187.16`
  const brassIn = prog(t, CUE.c02_s01_no_brass, CUE.c02_s01_no_brass + 0.32);
  const brassOut = prog(t, CUE.c02_s01_no_clatter - 0.15, CUE.c02_s01_no_clatter + 0.1);
  const ghostBrassOpacity = brassIn * (1 - brassOut);

  // 3. Mở mặt cắt buồng đạn 120mm (188.15s); vỏ thuốc phóng cứng bắt đầu nung sáng ở `rigid@192.48` và cháy sạch tới `195.02s`
  const chamberRevealIn = prog(t, 188.15, 189.05);
  const chamberHideOut = prog(t, CUE.c02_s01_breech_drop + 0.32, CUE.c02_s01_breech_drop + 0.92);
  const chamberReveal = chamberRevealIn * (1 - chamberHideOut);

  const preBurn = prog(t, 192.05, CUE.c02_s01_rigid_propellant + 0.35) * 0.22;
  const mainBurn = prog(t, CUE.c02_s01_rigid_propellant + 0.35, 195.02) * 0.78;
  const burnProgress = Math.min(1, preBurn + mainBurn);
  const afterglow = bump(t, 194.92, 0.62);
  const shotLaunch = prog(t, 194.96, CUE.c02_s01_breech_drop + 0.18);

  // 4. Khoá nòng M256 mở trượt đứng (`dropping@195.12`) & nhả chiếc đế kim loại cỡ gạt tàn (`ashtray@196.30`)
  const breechOpen = prog(t, CUE.c02_s01_breech_drop, CUE.c02_s01_breech_drop + 0.56);
  const puckFall = prog(t, CUE.c02_s01_breech_drop + 0.18, CUE.c02_s01_ashtray_puck);

  // Đế gạt tàn rơi xuống vị trí trống sạch `[-0.255, 0.20, +0.085]` trên khay cao su (không chạm 2 vòng đế cũ trên khay!)
  const hitDt = Math.max(0, t - CUE.c02_s01_ashtray_puck);
  const puckBounce =
    t >= CUE.c02_s01_ashtray_puck
      ? Math.abs(Math.sin(hitDt * 11.5)) * Math.exp(-hitDt * 5.4) * 0.05
      : 0;
  const heroPuckX = lerp(0.18, -0.255, puckFall);
  const heroPuckY = lerp(1.06, 0.2, puckFall * puckFall) + puckBounce;
  const heroPuckZ = lerp(0.06, 0.085, puckFall);
  const heroPuckTilt = (1 - puckFall) * 1.35 + Math.sin(hitDt * 14) * Math.exp(-hitDt * 5.6) * 0.13;

  // 5. Chuyển động Camera 3 nhịp mượt mà, nâng góc nhịp A vượt qua vành Turret Ring & tránh mọi vật cản:
  const camToChamber = prog(t, 187.75, 189.6);
  const chamberDrift = prog(t, 189.6, 195.08);
  const camToPuck = prog(t, CUE.c02_s01_breech_drop + 0.16, CUE.c02_s01_ashtray_puck + 0.58);
  const puckOrbit = prog(t, CUE.c02_s01_ashtray_puck, 198.4);

  const posA: V3 = [0.38, 1.54, 1.58];
  const lookA: V3 = [0.05, 0.78, -0.03];

  const posB: V3 = [lerp(0.36, 0.44, chamberDrift), lerp(1.42, 1.38, chamberDrift), lerp(1.36, 1.24, chamberDrift)];
  const lookB: V3 = [lerp(0.56, 0.62, chamberDrift), 1.22, 0.24];

  const posC: V3 = [lerp(0.04, -0.05, puckOrbit), lerp(0.74, 0.64, puckOrbit), lerp(0.96, 0.84, puckOrbit)];
  const lookC: V3 = [-0.26, lerp(0.3, 0.23, puckOrbit), 0.06];

  const camPos = lerpV3(lerpV3(posA, posB, camToChamber), posC, camToPuck);
  const camLook = lerpV3(lerpV3(lookA, lookB, camToChamber), lookC, camToPuck);
  const camFov = lerp(lerp(42, 35, camToChamber), 32, camToPuck);

  return (
    <div style={{ position: 'relative', width: W, height: H, overflow: 'hidden', background: PAL.bgDeep }}>
      <Stage {...LOOK_INTERIOR_BAY.stage} shadowCenter={[0.1, 0.9, 0]} width={W} height={H}>
        <Cam pos={camPos} look={camLook} fov={camFov} />

        {/* Đèn studio nội thất khoang cơ khí làm nổi lớp mạ crôm khoá nòng, vỏ thuốc phóng kem và đế thép gạt tàn */}
        <pointLight position={[1.45, 2.15, 2.05]} color="#fff3e2" intensity={3.8} distance={7.5} decay={1.4} />
        <pointLight position={[-1.4, 2.05, 1.35]} color="#8fd4ff" intensity={2.4} distance={6.5} decay={1.5} />
        <pointLight position={[0.12, 0.84, 0.92]} color="#ffebd2" intensity={3.1} distance={3.2} decay={1.5} />

        {/* Chớp dư chấn phát bắn đầu cảnh ở khe khoá nòng */}
        {openingRecoil > 0.1 && (
          <pointLight
            position={[0.25, 1.25, 0.2]}
            color="#ff9938"
            intensity={openingRecoil * 4.5}
            distance={2.5}
            decay={1.6}
          />
        )}

        <BayInspectionDeck />

        {/* Khoang tháp pháo M1A2 cắt bổ */}
        <TurretInterior3D
          gunPitch={0.02}
          recoil={totalRecoil}
          breechOpen={breechOpen}
          puckDrop={puckFall}
          blastDoorOpen={0}
          showCrew={false}
        />

        {/* Khung wireframe đồng thau hiện thoáng qua rồi tắt ở "no giant brass casing ever clatters" */}
        <GhostBrassCasing opacity={ghostBrassOpacity} t={t} />

        {/* Buồng đạn M256 bổ đôi đồng trục phô diễn vỏ thuốc phóng cứng cháy sạch hoàn toàn */}
        <group position={[1.12, 1.22, 0]} rotation={[0, 0, 0.02]}>
          <group position={[-0.32 * totalRecoil, 0, 0]}>
            <CutawayChamberModule
              reveal={chamberReveal}
              burnProgress={burnProgress}
              afterglow={afterglow}
              shotLaunch={shotLaunch}
              breechOpen={breechOpen}
            />
          </group>
        </group>

        {/* Đế kim loại rỗng lòng cỡ gạt tàn (`Ammo120mm3D kind="base_puck"`, tỉ lệ squat cỡ gạt tàn) rơi xuống khay sàn & bốc khói mảnh */}
        {puckFall > 0.02 && (
          <group>
            <group
              position={[heroPuckX, heroPuckY, heroPuckZ]}
              rotation={[heroPuckTilt * 0.35, hitDt * 0.4, heroPuckTilt]}
              scale={[1.04, 0.64, 1.04]}
            >
              <Ammo120mm3D kind="base_puck" />
            </group>
            <PuckSmokeWisps
              t={t}
              at={CUE.c02_s01_ashtray_puck - 0.08}
              pos={[-0.255, 0.2, 0.085]}
            />
          </group>
        )}
      </Stage>

      <Label
        t={t}
        text="M256 120mm"
        x={W * 0.24}
        y={H * 0.85}
        from={CUE.c02_s01_shell_120mm}
        until={193.1}
        bg={PAL.cream}
        fg={PAL.ink}
      />
    </div>
  );
};

export default C02S01;
