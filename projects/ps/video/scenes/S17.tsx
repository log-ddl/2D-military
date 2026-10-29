import React, { useMemo } from 'react';
import { AbsoluteFill, Easing } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { Terrain, heightField } from '@lib/3d/terrain';
import { Explosion, Trail, softDot } from '@lib/3d/fx';
import { CUE } from '../cues';
import { PAL3D, STAGE_STRATO, TERRAIN_STEPPE } from '../local/palette';
import { Kinzhal, PAC3 } from '../local/models';

// Trục đối đầu chéo ở tầng bình lưu (18–25 km): PAC-3 vọt chéo lên 18° từ trái-dưới, Kinzhal bổ xuống từ phải-trên
const ALPHA = (18 * Math.PI) / 180;
const UX = Math.cos(ALPHA);
const UY = Math.sin(ALPHA);
const NX = -UY;
const NY = UX;

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const COLLISION_NORMAL = new THREE.Vector3(UX, UY, 0);

// Địa hình dãy núi & thung lũng bình yên nhìn từ tầng bình lưu (y = -145 m)
const STRATO_VALLEY_H = heightField({
  seed: 17,
  amp: 16,
  scale: 185,
  oct: 5,
  add: (x, z) => {
    const valleyTrough = -14 * Math.exp(-(((z + 150) / 110) ** 2));
    const farRange = 34 * Math.exp(-(((z + 360) / 130) ** 2));
    const gentleRidges = 8 * Math.sin(x * 0.014) * Math.cos(z * 0.012);
    return valleyTrough + farRange + gentleRidges;
  },
});

const detRand = (i: number, k: number) => {
  const v = Math.sin(i * 19.731 + k * 91.337 + 17.51) * 43758.5453;
  return v - Math.floor(v);
};

/** Khoảng cách từ điểm va chạm [0,0,0] tới ĐẦU MŨI mỗi tên lửa (m) — luôn đồng bộ với khung ngắm camera. */
function tipDistances(t: number): { dPac: number; dKin: number } {
  const tHit = CUE.s17_kinetic_vaporize; // 315.40s
  if (t >= tHit) return { dPac: 0, dKin: 0 };

  if (t <= 304.5) {
    // Đại cảnh ngang chéo rộng: hai đối thủ lao thẳng vào nhau
    const p = prog(t, 295.45, 304.5, (x) => x);
    return {
      dPac: lerp(11.8, 3.35, p),
      dKin: lerp(13.2, 3.85, p),
    };
  }
  if (t <= 313.35) {
    // Bullet-time quay chậm cận hông: hai mũi tên lửa trôi chậm từ 7.2 m xuống 2.15 m
    const p = prog(t, 304.5, 313.35, (x) => x);
    return {
      dPac: lerp(3.35, 1.0, p),
      dKin: lerp(3.85, 1.15, p),
    };
  }
  // Nhịp kết liễu: "Định luật vật lý là tuyệt đối" -> đâm trực diện lúc 315.40s
  const p = prog(t, 313.35, tHit, Easing.in(Easing.quad));
  return {
    dPac: lerp(1.0, 0, p),
    dKin: lerp(1.15, 0, p),
  };
}

/** Độ lệch ngang & chuỗi nổ vi điều chỉnh của 180 khối nổ đẩy ngang ACM dưới bụng mũi PAC-3. */
function pacLateralState(t: number) {
  // Trước khi kích hoạt ACM, trục PAC-3 thấp hơn tâm mũi Kinzhal ~0.48 m
  const lift1 = prog(t, CUE.s17_acm_burst1, CUE.s17_acm_burst1 + 0.65, Easing.out(Easing.cubic));
  const lift1b = prog(t, 307.25, 307.85, Easing.out(Easing.quad));
  const lift2 = prog(t, CUE.s17_acm_burst2, CUE.s17_acm_burst2 + 0.65, Easing.out(Easing.cubic));
  const lift3 = prog(t, CUE.s17_acm_snap, CUE.s17_acm_snap + 0.55, Easing.out(Easing.back(1.25)));

  const latOffset = -0.48 + 0.16 * lift1 + 0.07 * lift1b + 0.13 * lift2 + 0.12 * lift3;

  // 3 cụm nổ chính tại đúng CUE + các xung nổ vi chỉnh liên tiếp trong nhịp quay chậm Bullet-Time
  const bMain1 = bump(t, CUE.s17_acm_burst1, 0.85) * 1.32;
  const bMicro1 = bump(t, 307.2, 0.85) * 1.15;
  const bMain2 = bump(t, CUE.s17_acm_burst2, 0.85) * 1.36;
  const bMicro2 = bump(t, 309.55, 0.65) * 0.95;
  const bSnap = bump(t, CUE.s17_acm_snap, 0.88) * 1.42;
  // Xung hãm quán tính trên lưng ngay sau cú giật cuối để khóa cứng trục đâm 100% mũi-đối-mũi
  const bArrest = bump(t, CUE.s17_acm_snap + 0.78, 0.34) * 0.62;

  const bellyFire = Math.max(bMain1, bMicro1, bMain2, bMicro2, bSnap);
  const acmFire = bellyFire >= bArrest ? bellyFire : bArrest;
  const acmAngle = bellyFire >= bArrest ? Math.PI : 0;

  const pitchKick =
    -0.024 * (1 - lift3) +
    0.026 * bump(t, CUE.s17_acm_burst1, 0.55) +
    0.018 * bump(t, 307.2, 0.55) +
    0.026 * bump(t, CUE.s17_acm_burst2, 0.55) +
    0.032 * bump(t, CUE.s17_acm_snap, 0.52);

  return { latOffset, acmFire, acmAngle, pitchKick };
}

/** Khói thuốc nổ trắng xám của các khối nổ ACM vương lại dưới bụng quỹ đạo PAC-3. */
const AcmResidualPuffs: React.FC<{ t: number }> = ({ t }) => {
  const baseMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        color: '#f4eadc',
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  const bursts = [CUE.s17_acm_burst1, 307.25, CUE.s17_acm_burst2, 309.6, CUE.s17_acm_snap];
  return (
    <>
      {bursts.map((bt, idx) => {
        const dt = t - bt;
        if (dt <= 0.04 || dt > 4.6 || t >= CUE.s17_kinetic_vaporize + 0.15) return null;
        const { dPac } = tipDistances(bt + 0.1);
        const { latOffset } = pacLateralState(bt + 0.08);
        const sAcm = -(dPac + 1.18);
        const jetDrift = 0.28 + dt * 0.88;
        const backDrift = dt * 0.55;
        const px = (sAcm - backDrift) * UX + (latOffset - jetDrift) * NX;
        const py = (sAcm - backDrift) * UY + (latOffset - jetDrift) * NY;

        const m = baseMat.clone();
        m.opacity = Math.max(0, 0.52 * (1 - dt / 4.6));
        const sc = 0.38 + dt * 0.52;
        return <sprite key={idx} material={m} position={[px, py, 0]} scale={[sc, sc, sc]} />;
      })}
    </>
  );
};

/** Vòng sóng xung kích phẳng mở rộng nhanh & mây kim loại nóng chảy bốc hơi hoàn toàn ở > Mach 10. */
const KineticVaporizeFx: React.FC<{ t: number; at: number }> = ({ t, at }) => {
  const dt = t - at;
  const shockQuat = useMemo(() => new THREE.Quaternion().setFromUnitVectors(Y_AXIS, COLLISION_NORMAL), []);
  const glowSpriteMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: softDot(),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    [],
  );

  if (dt < 0) return null;

  const flash = Math.max(0, 1 - dt / 0.36);
  const ring1P = Math.min(1, dt / 1.65);
  const ring1R = 0.8 + (1 - (1 - ring1P) ** 3) * 36;
  const ring1Op = Math.max(0, 1 - ring1P) ** 1.55;

  const ring2P = Math.min(1, dt / 2.6);
  const ring2R = 0.6 + (1 - (1 - ring2P) ** 2.6) * 24;
  const ring2Op = Math.max(0, 1 - ring2P) ** 1.75;

  // Quầng nhiệt mềm ở tâm vụ nổ dùng softDot() (không có viền mép cứng)
  const coreHeatOp = Math.max(0, 1 - dt / 7.2);
  const coreGlowMat = glowSpriteMat.clone();
  coreGlowMat.color.set(dt < 1.6 ? '#ff9b38' : '#d1431b');
  coreGlowMat.opacity = coreHeatOp * 0.52;
  const coreGlowScale = 11 + Math.min(15, dt * 2.4);

  return (
    <group position={[0, 0, 0]}>
      {flash > 0 && (
        <>
          <pointLight color="#fff6df" intensity={5600 * flash} distance={150} decay={1.35} />
          <mesh scale={2.0 + (1 - flash) * 10.0}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshBasicMaterial
              color="#ffffff"
              transparent
              opacity={flash * 0.96}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh scale={3.5 + (1 - flash) * 15.5}>
            <sphereGeometry args={[1, 24, 18]} />
            <meshBasicMaterial
              color={PAL3D.flame}
              transparent
              opacity={flash * 0.65}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </>
      )}

      {/* Vòng sóng xung kích phẳng mở rộng nhanh vuông góc trục đâm */}
      {ring1Op > 0.005 && (
        <group quaternion={shockQuat}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(0.1, ring1R * 0.83), ring1R, 64]} />
            <meshBasicMaterial
              color="#fff4d6"
              transparent
              opacity={ring1Op * 0.92}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(0.1, ring1R * 0.6), ring1R * 1.05, 64]} />
            <meshBasicMaterial
              color={PAL3D.plasma}
              transparent
              opacity={ring1Op * 0.5}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {ring2Op > 0.005 && (
        <group quaternion={shockQuat}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(0.1, ring2R * 0.78), ring2R, 56]} />
            <meshBasicMaterial
              color="#ffd6a6"
              transparent
              opacity={ring2Op * 0.56}
              side={THREE.DoubleSide}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      )}

      {/* Quầng sáng nhiệt mềm bằng Sprite không viền */}
      {coreHeatOp > 0.01 && (
        <sprite material={coreGlowMat} scale={[coreGlowScale, coreGlowScale, 1]} />
      )}

      {/* 44 mảnh kim loại nóng đỏ bốc hơi bắn toả rồi nguội dần trên bầu trời tầng bình lưu */}
      {dt < 9.6 &&
        Array.from({ length: 44 }, (_, i) => {
          const theta = detRand(i, 1) * Math.PI * 2;
          const axialSpread = (detRand(i, 2) - 0.52) * 1.1;
          const radialSpeed = 4.2 + detRand(i, 3) * 13.8;
          const dragDecay = (1 - Math.exp(-dt * 0.72)) / 0.72;

          const rCos = Math.cos(theta) * radialSpeed;
          const rSin = Math.sin(theta) * radialSpeed;
          const vx = axialSpread * radialSpeed * UX + rCos * NX;
          const vy = axialSpread * radialSpeed * UY + rCos * NY;
          const vz = rSin;

          const px = vx * dragDecay;
          const py = vy * dragDecay - 0.48 * dt * dt;
          const pz = vz * dragDecay;

          const life = 5.2 + detRand(i, 4) * 4.2;
          if (dt > life) return null;
          const heat = Math.max(0, 1 - dt / life);
          const col =
            heat > 0.72 ? '#fff6cf' : heat > 0.4 ? '#ff8e26' : heat > 0.16 ? '#d93814' : '#5e2a1e';
          const emberScale = (0.13 + detRand(i, 5) * 0.2) * (0.45 + 0.55 * heat);

          const haloMat = glowSpriteMat.clone();
          haloMat.color.set(col);
          haloMat.opacity = heat * 0.75;

          return (
            <group key={i} position={[px, py, pz]}>
              <mesh rotation={[dt * 5 + i, dt * 3.7, i]}>
                <dodecahedronGeometry args={[emberScale, 0]} />
                <meshBasicMaterial color={col} toneMapped={false} />
              </mesh>
              <sprite material={haloMat} scale={[emberScale * 5.4, emberScale * 5.4, 1]} />
            </group>
          );
        })}
    </group>
  );
};

const S17: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);
  const tHit = CUE.s17_kinetic_vaporize; // 315.40s
  const vaporized = t >= tHit;

  const { dPac, dKin } = tipDistances(t);
  const { latOffset, acmFire, acmAngle, pitchKick } = pacLateralState(t);

  // Tâm PAC-3 lùi 2.60 m từ đầu mũi; tâm Kinzhal lùi 3.60 m từ đầu mũi
  const sPacCenter = -(dPac + 2.6);
  const pacPos: V3 = [sPacCenter * UX + latOffset * NX, sPacCenter * UY + latOffset * NY, 0];

  const sKinCenter = dKin + 3.6;
  const kinPos: V3 = [sKinCenter * UX, sKinCenter * UY, 0];

  const pacEuler = useMemo((): V3 => {
    const ang = ALPHA + pitchKick;
    const dir = new THREE.Vector3(Math.cos(ang), Math.sin(ang), 0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    return [e.x, e.y, e.z];
  }, [pitchKick]);

  const kinEuler = useMemo((): V3 => {
    const dir = new THREE.Vector3(-UX, -UY, 0).normalize();
    const q = new THREE.Quaternion().setFromUnitVectors(X_AXIS, dir);
    const e = new THREE.Euler().setFromQuaternion(q);
    return [e.x, e.y, e.z];
  }, []);

  // Vệt bay tan nhanh trong 2.8s ngay sau khi hai tên lửa bốc hơi để không còn que khói cứng trên trời
  const trailDissolve = prog(t, tHit, tHit + 2.8);
  const trailFade = 1 - trailDissolve;

  const pacTrailPts = useMemo((): V3[] => {
    const tailEndS = vaporized ? lerp(-2.6, -24, trailDissolve) : sPacCenter - 2.6;
    const startS = -88;
    const n = 26;
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      const s = lerp(startS, tailEndS, u);
      const lat = s > -9 ? lerp(-0.48, vaporized ? 0 : latOffset, prog(s, -9, tailEndS, (x) => x)) : -0.48;
      return [s * UX + lat * NX, s * UY + lat * NY, 0];
    });
  }, [vaporized, sPacCenter, latOffset, trailDissolve]);

  const kinTrailPts = useMemo((): V3[] => {
    const tailEndS = vaporized ? lerp(3.6, 26, trailDissolve) : sKinCenter + 3.6;
    const startS = 94;
    const n = 22;
    return Array.from({ length: n }, (_, i) => {
      const u = i / (n - 1);
      const s = lerp(startS, tailEndS, u);
      return [s * UX, s * UY, 0];
    });
  }, [vaporized, sKinCenter, trailDissolve]);

  // Camera khoá toán học theo khoảng cách hai mũi đạn (dPac + dKin):
  // Đảm bảo CẢ HAI TÊN LỬA luôn nằm gọn trong 65% trung tâm khung hình từ 295.65s đến 315.40s!
  const noseSpan = dPac + dKin;
  const pBulletBlend = prog(t, 303.6, 305.4, Easing.inOut(Easing.cubic));
  const pPullOut = prog(t, 313.35, tHit, Easing.inOut(Easing.quad));
  const pOutro = prog(t, tHit, 325.85, Easing.out(Easing.cubic));

  // Khi wide: thấy trọn thân cả 2 đạn + vệt lửa; khi bullet-time: ép cận hông thấy rõ 180 lỗ ACM & mũi Kinzhal
  const wideZ = (noseSpan + 13.5) * 1.05;
  const bulletZ = (noseSpan + 4.8) * 0.76;
  const trackZ = lerp(wideZ, bulletZ, pBulletBlend);

  // Tâm nhìn luôn bám điểm giữa hai chóp mũi tên lửa
  const midS = (dKin - dPac) * 0.45;
  let lookX = midS * UX;
  let lookY = midS * UY - lerp(1.1, 0.08, pBulletBlend);
  let lookZ = 0;

  let camX = lookX - lerp(1.6, 0.35, pBulletBlend);
  let camY = lookY + lerp(2.2, 0.22, pBulletBlend);
  let camZ = trackZ;
  let fov = lerp(38, 34, pBulletBlend);

  if (t > 313.35) {
    // Kéo lùi đón vụ nổ bốc hơi > Mach 10
    camX = lerp(camX, 1.6, pPullOut);
    camY = lerp(camY, 2.8, pPullOut);
    camZ = lerp(camZ, 24.5, pPullOut);
    lookX = lerp(lookX, 0.0, pPullOut);
    lookY = lerp(lookY, -0.8, pPullOut);
    fov = lerp(34, 41, pPullOut);
  }
  if (t > tHit) {
    // Sau va chạm: mây khói nóng đỏ tan dần trên nền trời tầng bình lưu & thung lũng bình yên phía dưới
    camX = lerp(1.6, 5.2, pOutro);
    camY = lerp(2.8, 7.6, pOutro);
    camZ = lerp(24.5, 36.0, pOutro);
    lookX = 0.0;
    lookY = lerp(-0.8, -4.8, pOutro);
    lookZ = lerp(0.0, -18.0, pOutro);
    fov = lerp(41, 43, pOutro);
  }

  const dtImpact = Math.max(0, t - tHit);
  const shakeAmp = t >= tHit ? 0.52 * Math.exp(-dtImpact * 3.8) : 0;
  const sx = shakeAmp * Math.sin(dtImpact * 41);
  const sy = shakeAmp * Math.cos(dtImpact * 47);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_STRATO} shadowArea={20} shadowCenter={[0, 0, 0]}>
        <Cam pos={[camX + sx, camY + sy, camZ]} look={[lookX, lookY, lookZ]} fov={fov} />

        {/* Thung lũng đồi núi bình yên ở tầng thấp xa phía dưới (y = -145 m), dành trọn bầu trời cô-ban cho trận đấu */}
        <group position={[0, -145, 0]}>
          <Terrain
            h={STRATO_VALLEY_H}
            size={1800}
            seg={160}
            center={[0, -240]}
            colors={TERRAIN_STEPPE}
            grainRepeat={72}
          />
        </group>

        {/* Vệt khói PAC-3 & sóng nhiệt ma sát sau Kinzhal (tự tan sau va chạm) */}
        {trailFade > 0.01 && (
          <>
            <Trail
              points={pacTrailPts}
              upto={1}
              color="#ffe2a8"
              width={0.14}
              opacity={0.8 * trailFade}
              glow
            />
            <Trail
              points={kinTrailPts}
              upto={1}
              color="#ff7e36"
              width={0.22}
              opacity={0.46 * trailFade}
              glow
            />
          </>
        )}

        <AcmResidualPuffs t={t} />

        {/* Cả hai tên lửa BỐC HƠI HOÀN TOÀN ngay tích tắc t >= 315.40s — tuyệt đối không bay xuyên qua nhau */}
        {!vaporized && (
          <>
            <PAC3
              position={pacPos}
              rotation={pacEuler}
              plume={1.15}
              acmAngle={acmAngle}
              acmFire={acmFire}
            />
            <Kinzhal
              position={kinPos}
              rotation={kinEuler}
              plume={0}
              heatGlow={0.95}
            />
          </>
        )}

        {/* Bùng nổ siêu động năng > Mach 10 lưu mây khói mỏng tới hết cảnh 325.85s */}
        <Explosion
          t={t}
          at={CUE.s17_kinetic_vaporize}
          pos={[0, -4.25, 0]}
          size={8.5}
          smokeLife={12.2}
          seed={17}
          smoke="#6b655f"
        />
        <KineticVaporizeFx t={t} at={CUE.s17_kinetic_vaporize} />
      </Stage>

      <Label t={t} text="> MACH 10" x={960} y={145} from={317.8} until={321.6} />
    </AbsoluteFill>
  );
};

export default S17;
