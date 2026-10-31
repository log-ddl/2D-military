import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { bump, lerp, prog, useT } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Label } from '@skill/military/label';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { B25Mitchell } from '../parts/B25Mitchell';
import { GasCan5Gal } from '../parts/Ordnance3D';
import { OceanSurface, waveY } from '../parts/OceanSurface';

// Hướng bay về phía Tây - Tây Nam qua Biển Hoa Đông hướng vào hoàng hôn chinaDusk (sun: [-64, 17, 24]).
// Với heading = Math.PI - 0.24, mạn trái B-25 (local -Z) quay ra hướng thế giới +Z đón trọn nắng chiều vàng hổ phách.
const HEADING = Math.PI - 0.24;
const FLIGHT_SPEED = 23.5; // m/s ở độ cao thấp ~35 m trên mặt sóng

function leadPoseAt(sec: number) {
  const dt = sec - 614.4;
  const fwdX = Math.cos(HEADING);
  const fwdZ = -Math.sin(HEADING);
  const x = 112 + fwdX * FLIGHT_SPEED * dt;
  const z = 22 + fwdZ * FLIGHT_SPEED * dt;
  const y = 34.6 + Math.sin(sec * 1.12) * 0.34;
  const roll = Math.sin(sec * 0.82 + 0.4) * 0.024;
  const pitch = 0.018 + Math.cos(sec * 0.94) * 0.008;
  return { pos: [x, y, z] as V3, roll, pitch };
}

function leadLocalToWorld(sec: number, lx: number, ly: number, lz: number): THREE.Vector3 {
  const { pos, roll, pitch } = leadPoseAt(sec);
  const v = new THREE.Vector3(lx, ly, lz);
  v.applyEuler(new THREE.Euler(roll, 0, pitch, 'XYZ'));
  v.applyEuler(new THREE.Euler(0, HEADING, 0, 'XYZ'));
  v.add(new THREE.Vector3(pos[0], pos[1], pos[2]));
  return v;
}

const v3Tuple = (v: THREE.Vector3): V3 => [v.x, v.y, v.z];

/** Tính vị trí & điểm nhìn thế giới của <Cam> tại giây sec (dùng chung cho cả Cam lẫn quỹ đạo rơi can xăng) */
function evalCameraAt(sec: number): { pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll: number } {
  const pPush = prog(sec, 616.3, 618.7);
  const pTight = prog(sec, 621.72, 622.25);
  const pDrop = prog(sec, 624.08, 625.38);

  // Giai đoạn 1 (614.2..616.3): Trung-cận dọc sườn trái B-25 bay thấp 35 m trên sóng chiều tà, thấy rõ 2 đồng đội phía trước
  // Giai đoạn 2 (618.7..621.7): Đẩy sát ô cửa hông sau thân nơi kỹ thuật viên nghiêng can 5-gal rót cạn dòng xăng vàng vào phễu
  // Giai đoạn 3 (622.2..624.0): Góc cận 34° trực diện mặt vai can xăng để thấy thật lớn lưỡi rìu thép & 2 lỗ đục tam giác toác mép
  // Giai đoạn 4 (624.1..625.5+): Lùi nhẹ ra ngoài sườn, nghiêng roll & chúi ống kính theo 4 can xăng rơi xoay vòng xuống sóng bọt trắng
  let lxCam = lerp(-5.15, -1.96, pPush);
  let lyCam = lerp(3.14, 2.48, pPush);
  let lzCam = lerp(-5.35, -2.04, pPush);

  lxCam = lerp(lxCam, -1.78, pTight);
  lyCam = lerp(lyCam, 2.64, pTight);
  lzCam = lerp(lzCam, -1.88, pTight);

  lxCam = lerp(lxCam, -2.95, pDrop);
  lyCam = lerp(lyCam, 2.12, pDrop);
  lzCam = lerp(lzCam, -3.32, pDrop);

  const vibY = Math.sin(sec * 17.3) * 0.005 + Math.cos(sec * 7.1) * 0.007;
  const vibZ = Math.cos(sec * 14.9) * 0.004;
  const camWorld = leadLocalToWorld(sec, lxCam, lyCam + vibY, lzCam + vibZ);

  let lxLook = lerp(1.38, -1.16, pPush);
  let lyLook = lerp(2.22, 2.18, pPush);
  let lzLook = lerp(-1.72, -0.95, pPush);

  lxLook = lerp(lxLook, -1.27, pTight);
  lyLook = lerp(lyLook, 2.12, pTight);
  lzLook = lerp(lzLook, -0.99, pTight);

  // Khi chúi theo can rơi, điểm nhìn quét xuống mặt sóng bên dưới nhưng vẫn giữ dải chân trời chiều tà ở mép trên khung hình
  lxLook = lerp(lxLook, -14.5, pDrop);
  lyLook = lerp(lyLook, -16.8, pDrop);
  lzLook = lerp(lzLook, -15.6, pDrop);

  const lookWorld = leadLocalToWorld(sec, lxLook, lyLook, lzLook);

  let fov = lerp(41, 36, pPush);
  fov = lerp(fov, 34.5, pTight);
  fov = lerp(fov, 45.5, pDrop);

  const roll = lerp(lerp(0.02, 0.012, pPush), -0.15, pDrop);
  return { pos: camWorld, look: lookWorld, fov, roll };
}

let cachedFoamTex: THREE.CanvasTexture | null = null;
/**
 * Texture quầng bọt sóng trắng xoá phân giải cao (256x256), rìa ngoài tắt hẳn alpha = 0
 * trước biên ảnh để không bao giờ lộ viền vuông, không chứa đốm khói đen.
 */
function seaFoamRingTex(): THREE.CanvasTexture {
  if (cachedFoamTex) return cachedFoamTex;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const ctx = cv.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 256);

  const hash = (i: number, k: number) => {
    const v = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return v - Math.floor(v);
  };

  // Vành bọt sóng chính & quầng bọt xoáy tâm va chạm (lòng trong trong trẻo để lộ màu nước biển dưới bọt)
  const gOuter = ctx.createRadialGradient(128, 128, 8, 128, 128, 118);
  gOuter.addColorStop(0.0, 'rgba(255, 252, 246, 0.48)');
  gOuter.addColorStop(0.24, 'rgba(250, 244, 236, 0.14)');
  gOuter.addColorStop(0.54, 'rgba(255, 250, 244, 0.08)');
  gOuter.addColorStop(0.73, 'rgba(255, 253, 249, 0.86)');
  gOuter.addColorStop(0.85, 'rgba(248, 240, 230, 0.38)');
  gOuter.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
  ctx.fillStyle = gOuter;
  ctx.beginPath();
  ctx.arc(128, 128, 118, 0, Math.PI * 2);
  ctx.fill();

  // Các cụm bọt biển li ti tự nhiên dọc theo vành sóng va chạm
  for (let i = 0; i < 110; i++) {
    const ang = (i / 110) * Math.PI * 2 + hash(i, 1) * 0.25;
    const band = i % 3 === 0 ? 34 + hash(i, 2) * 28 : 78 + hash(i, 2) * 24;
    const bx = 128 + Math.cos(ang) * band;
    const by = 128 + Math.sin(ang) * band;
    const br = 3.5 + hash(i, 3) * 8.5;
    const bg = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    const a0 = 0.35 + hash(i, 4) * 0.5;
    bg.addColorStop(0, `rgba(255, 254, 250, ${a0.toFixed(3)})`);
    bg.addColorStop(1, 'rgba(255, 254, 250, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }

  // Khoá cứng mặt nạ tròn mềm ở biên r = 120 để biên canvas tuyệt đối alpha = 0
  ctx.globalCompositeOperation = 'destination-in';
  const mask = ctx.createRadialGradient(128, 128, 70, 128, 128, 120);
  mask.addColorStop(0, 'rgba(0,0,0,1)');
  mask.addColorStop(0.82, 'rgba(0,0,0,0.9)');
  mask.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = mask;
  ctx.fillRect(0, 0, 256, 256);
  ctx.globalCompositeOperation = 'source-over';

  cachedFoamTex = new THREE.CanvasTexture(cv);
  cachedFoamTex.colorSpace = THREE.SRGBColorSpace;
  return cachedFoamTex;
}

/**
 * Thảm bọt sóng lưới 24x24 bám sát từng đỉnh sóng 3D waveY(x, z, t) (không bao giờ cắt xuyên mặt biển hay lộ khung vuông)
 * kết hợp vương miện tia nước trắng tung vọt lên khi can xăng 5-gal đã đục lỗ lao xuống Biển Hoa Đông.
 */
const OceanCanSplash: React.FC<{ t: number; at: number; x: number; z: number; scale?: number }> = ({
  t,
  at,
  x,
  z,
  scale = 1,
}) => {
  const dt = t - at;
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: seaFoamRingTex(),
        color: new THREE.Color('#f7ece0'),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [],
  );
  const dropletMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#fbf4ec'),
        transparent: true,
        depthWrite: false,
      }),
    [],
  );

  if (dt < 0 || dt > 2.5) return null;
  const pOut = Math.min(1, dt / 1.15);
  const easeOut = 1 - Math.pow(1 - pOut, 3);
  const fade = Math.max(0, 1 - dt / 2.25);
  const plumeFade = Math.max(0, 1 - dt / 0.92);

  const outerR = (1.15 + easeOut * 4.4) * scale;
  const diam = outerR * 2.35;

  // Xây mặt lưới ngang 22x22 uốn chuẩn theo độ cao sóng waveY(x + lx, z + lz, t, 1.6)
  const segs = 22;
  const foamGeo = new THREE.PlaneGeometry(diam, diam, segs, segs);
  foamGeo.rotateX(-Math.PI / 2);
  const posAttr = foamGeo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const lx = posAttr.getX(i);
    const lz = posAttr.getZ(i);
    posAttr.setY(i, waveY(x + lx, z + lz, t, 1.6) + 0.38);
  }
  posAttr.needsUpdate = true;

  mat.opacity = 0.92 * fade;
  dropletMat.opacity = 0.88 * plumeFade;

  return (
    <group>
      <mesh position={[x, 0, z]} geometry={foamGeo} material={mat} />

      {/* Vương miện tia nước trắng tung vọt lên khỏi tâm va chạm trong 0.9 s đầu */}
      {plumeFade > 0.02 &&
        Array.from({ length: 16 }, (_, k) => {
          const a = (k / 16) * Math.PI * 2 + 0.25;
          const r = (0.28 + easeOut * 1.55) * scale * (0.75 + (k % 3) * 0.16);
          const px = x + Math.cos(a) * r;
          const pz = z + Math.sin(a) * r;
          const baseW = waveY(px, pz, t, 1.6);
          const vUp = (7.4 + (k % 4) * 1.9) * scale;
          const dropY = Math.max(0, vUp * dt - 11.5 * dt * dt);
          const tiltOut = 0.32 + pOut * 0.42;
          return (
            <mesh
              key={`cr-${k}`}
              position={[px, baseW + 0.18 + dropY, pz]}
              rotation={[Math.sin(a) * tiltOut, 0, -Math.cos(a) * tiltOut]}
              scale={[0.11 * scale, (0.34 - dt * 0.18) * scale, 0.11 * scale]}
              material={dropletMat}
            >
              <sphereGeometry args={[1, 8, 6]} />
            </mesh>
          );
        })}
    </group>
  );
};

/**
 * Ô cửa hông/cửa thoát thân sau B-25 mở toang (mạn trái local -Z, x = -1.32 m),
 * kèm phễu thép mạ kẽm cắm cổ bình xăng phụ, kỹ thuật viên áo bay da A-2 rót dòng xăng hổ phách cuối cùng,
 * rồi dùng rìu phá hiểm USAAF đục thủng 2 lỗ tam giác trên vai can xăng lúc 622.32 s.
 */
const OpenAftHatchRig: React.FC<{ t: number }> = ({ t }) => {
  const mats = useMemo(
    () => ({
      oliveFrame: paint({
        color: PAINT.usaafOlive,
        camo: [...PAINT.usaafOliveCamo],
        repeat: 0.45,
        wear: 0.28,
        dirt: 0.24,
        roughness: 0.62,
        metalness: 0.32,
        seed: 18,
      }),
      chromate: plain('#5d703d', 0.72, 0.26),
      cavityDark: new THREE.MeshBasicMaterial({ color: '#080b09' }),
      sillAlu: plain('#adb6bd', 0.34, 0.78),
      galvFunnel: plain('#cfd8de', 0.24, 0.86, { side: THREE.DoubleSide }),
      brassRim: plain('#d8aa49', 0.25, 0.85),
      rubberHose: plain('#242628', 0.84, 0.08),
      leatherJacket: plain('#271810', 0.78, 0.06),
      maeWestVest: plain('#9e7b22', 0.82, 0.04),
      fleeceCollar: plain('#9e8664', 0.9, 0.03),
      workGlove: plain('#6e4e2c', 0.82, 0.05),
      gloveCuff: plain('#543b20', 0.86, 0.04),
      skinTone: plain('#9e7154', 0.74, 0.03),
      axeHandle: plain('#4c5635', 0.68, 0.15),
      axeSteel: plain('#e4ecf2', 0.18, 0.92),
      axeEdge: plain('#ffffff', 0.12, 0.95),
      fuelStream: new THREE.MeshBasicMaterial({
        color: '#ffae24',
        transparent: true,
        opacity: 0.92,
        toneMapped: false,
      }),
      fuelCore: new THREE.MeshBasicMaterial({
        color: '#fff1a8',
        transparent: true,
        opacity: 0.96,
        toneMapped: false,
      }),
    }),
    [],
  );

  const geos = useMemo(() => {
    const funnelProfile: P2[] = [
      [0.022, -0.09],
      [0.026, -0.015],
      [0.062, 0.035],
      [0.118, 0.11],
      [0.128, 0.132],
      [0.121, 0.134],
      [0.056, 0.036],
      [0.021, -0.015],
    ];
    const funnel = lathe(funnelProfile, 28).clone();
    funnel.rotateZ(Math.PI / 2);

    const hose = pipe(
      [
        [-1.02, 1.93, -0.97],
        [-0.99, 1.89, -0.89],
        [-0.95, 1.89, -0.80],
      ],
      0.024,
      14,
    );
    return { funnel, hose };
  }, []);

  // Tiến độ các hành động tại cửa hông:
  // 1) Nghiêng can xăng 5-gal quanh trọng tâm (y=0.22) để vòi đồng chúc cao trên miệng phễu, lộ rõ dòng xăng vàng chảy vào phễu!
  const pTiltPour = prog(t, 616.5, 618.75);
  const pSetSill = prog(t, 621.74, 622.14);
  const isTossed = t >= CUE.c04_s01_toss_overboard;
  const isPunctured = t >= CUE.c04_s01_puncture;

  // Hai nhát đục mạnh bằng rìu phá hiểm USAAF ngay mốc puncture 622.32 s
  const strike1 = bump(t, 622.18, 0.25);
  const strike2 = bump(t, 622.52, 0.24);
  const pAxeReady = prog(t, 621.8, 622.12);
  const pAxePoise = prog(t, 622.74, 622.94); // Sau nhát đục thứ 2, giữ lưỡi rìu thép ngay sát cạnh vai can trong khung hình!
  const pShoveOut = prog(t, 624.12, 624.55);

  // Dòng xăng hổ phách chảy rõ nét từ vòi đồng xuống phễu (618.2..621.7 s, cạn dần thành giọt cuối cùng)
  const pourFlow = prog(t, 618.15, 618.78) * (1 - prog(t, 621.22, 621.74));
  const sputter = t > 620.95 ? 0.6 + 0.4 * Math.sin(t * 26) : 1;
  const activeStream = pourFlow * sputter;

  // Toạ độ TÂM XOAY (giữa thân can, cách đáy 0.22 m) của chiếc GasCan5Gal chủ đạo:
  // - Khi rót (pTiltPour=1, pSetSill=0): tâm tại [-1.24, 2.35, -0.99], xoay rz = -1.96 rad (-112°).
  //   Khi đó vòi đồng (local [+0.108, +0.188, 0] tính từ tâm) nằm ở [-1.24 + 0.108*(-0.38) - 0.188*(-0.925), 2.35 + 0.108*(-0.925) + 0.188*(-0.38)]
  //   = [-1.107, 2.179, -0.99] -> treo cao 13 cm ngay phía trên miệng phễu [-1.04, 2.045, -0.98], lộ trọn dòng xăng vàng rực!
  // - Khi đục (pSetSill=1): tâm hạ xuống [-1.31, 2.13, -1.05], xoay rx = -0.78 rad, ry = -0.24 rad, rz = -0.14 rad
  //   phơi trọn mặt vai có 2 lỗ đục tam giác toác mép kim loại sáng vào ống kính & nắng chiều!
  const pivotX = lerp(lerp(-1.31, -1.24, pTiltPour), -1.31, pSetSill);
  const pivotY = lerp(lerp(2.2, 2.36, pTiltPour), 2.13 - (strike1 + strike2) * 0.018, pSetSill);
  const pivotZ = lerp(lerp(-0.95, -0.99, pTiltPour), -1.05, pSetSill);

  const canRx = lerp(0.06, -0.78, pSetSill);
  const canRy = lerp(0.08, -0.24, pSetSill);
  const canRz = lerp(lerp(-0.35, -1.96, pTiltPour), -0.14, pSetSill);

  return (
    <group>
      {/* Đèn khoang dịu ấm đặt lùi ra ngoài chút để tôn khối kim loại mà không làm cháy sáng mặt nhân vật */}
      <pointLight position={[-1.18, 2.6, -1.52]} color="#ffc175" intensity={1.55} distance={3.8} decay={2} />

      {/* Hốc tối sâu bên trong khoang thân sau B-25 */}
      <mesh position={[-1.32, 2.36, -0.806]} material={mats.cavityDark}>
        <boxGeometry args={[0.74, 0.88, 0.016]} />
      </mesh>

      {/* Khung bao ô cửa thoát hiểm / cửa hông mở (x = -1.73..-0.91, y = 1.89..2.83) */}
      <mesh position={[-1.32, 2.83, -0.812]} geometry={rbox(0.84, 0.055, 0.06, 0.01)} material={mats.oliveFrame} castShadow />
      <mesh position={[-1.32, 1.89, -0.848]} geometry={rbox(0.84, 0.05, 0.135, 0.01)} material={mats.sillAlu} castShadow receiveShadow />
      <mesh position={[-0.91, 2.36, -0.812]} geometry={rbox(0.055, 0.94, 0.06, 0.01)} material={mats.oliveFrame} castShadow />
      <mesh position={[-1.73, 2.36, -0.812]} geometry={rbox(0.055, 0.94, 0.06, 0.01)} material={mats.oliveFrame} castShadow />

      {/* Gân sườn nhôm sơn xanh kẽm (Zinc Chromate) bên trong mép cửa mở */}
      <mesh position={[-0.96, 2.36, -0.818]} material={mats.chromate}>
        <boxGeometry args={[0.035, 0.86, 0.035]} />
      </mesh>
      <mesh position={[-1.68, 2.36, -0.818]} material={mats.chromate}>
        <boxGeometry args={[0.035, 0.86, 0.035]} />
      </mesh>
      <mesh position={[-1.32, 2.77, -0.818]} material={mats.chromate}>
        <boxGeometry args={[0.72, 0.035, 0.035]} />
      </mesh>
      {/* Tấm nắp cửa hông đã mở gài nghiêng ở mép trên ô cửa */}
      <group position={[-1.32, 2.84, -0.82]} rotation={[0.52, 0, 0]}>
        <mesh position={[0, 0.16, -0.02]} geometry={rbox(0.76, 0.34, 0.026, 0.008)} material={mats.oliveFrame} castShadow />
        <mesh position={[0, 0.16, -0.034]} geometry={rbox(0.68, 0.26, 0.008, 0.003)} material={mats.chromate} />
      </group>

      {/* 1 can xăng 5-gal dự phòng xếp gọn sát góc sau sàn khoang (không chạm vào tay kỹ thuật viên) */}
      {t < 624.48 && (
        <group position={[-1.58, 1.915, -0.84]} rotation={[0, 0.22, 0]} scale={0.86}>
          <GasCan5Gal punctured={t >= 623.4} seed={67} />
        </group>
      )}

      {/* Phễu thép mạ kẽm & ống dẫn vào bình xăng phụ gắn ở góc trước-dưới bệ cửa (miệng phễu ở y ≈ 2.04 m) */}
      <group position={[-1.04 + pSetSill * 0.06, 1.92, -0.975 + pSetSill * 0.06]} rotation={[-0.1, 0, -0.14]}>
        <mesh geometry={geos.funnel} material={mats.galvFunnel} castShadow receiveShadow />
        <mesh position={[0, 0.132, 0]} rotation={[Math.PI / 2, 0, 0]} material={mats.brassRim}>
          <torusGeometry args={[0.125, 0.0075, 10, 24]} />
        </mesh>
      </group>
      <mesh geometry={geos.hose} material={mats.rubberHose} />

      {/* Dòng xăng hổ phách óng ánh dài 17 cm chảy rõ từ vòi đồng của can [-1.09, 2.18, -0.985] thẳng xuống lòng phễu [-1.04, 2.02, -0.98] */}
      {activeStream > 0.03 && !isTossed && (
        <group position={[-1.065, 2.10, -0.982]} rotation={[0, 0, 0.28]}>
          <mesh material={mats.fuelStream}>
            <cylinderGeometry args={[0.015 * activeStream + 0.004, 0.01 * activeStream + 0.003, 0.175, 14]} />
          </mesh>
          <mesh material={mats.fuelCore}>
            <cylinderGeometry args={[0.0075 * activeStream + 0.0015, 0.0045 * activeStream + 0.001, 0.17, 10]} />
          </mesh>
          {/* Giọt xăng bắn lấp lánh do gió lùa ngoài cửa hông */}
          {[0, 1, 2, 3, 4].map((dIdx) => {
            const phase = (t * 8.5 + dIdx * 0.2) % 1;
            return (
              <mesh
                key={dIdx}
                position={[-0.01 - phase * 0.055, 0.06 - phase * 0.14, -phase * 0.024]}
                material={dIdx % 2 === 0 ? mats.fuelCore : mats.fuelStream}
              >
                <sphereGeometry args={[0.0085, 8, 8]} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Bóng thân áo bay da A-2, áo phao vàng Mae West & hai tay găng da kỹ thuật viên khoang B-25 */}
      <group position={[-1.35, 2.34, -0.825]}>
        {/* Thân trên mặc áo da A-2 nâu sẫm + dây đai áo phao Mae West */}
        <mesh position={[0, 0.03, 0.01]} geometry={rbox(0.36, 0.46, 0.15, 0.05)} material={mats.leatherJacket} castShadow />
        <mesh position={[0, 0.07, -0.04]} geometry={rbox(0.24, 0.34, 0.06, 0.025)} material={mats.maeWestVest} />
        <mesh position={[0.01, 0.26, -0.01]} rotation={[Math.PI / 2, 0, 0]} material={mats.fleeceCollar}>
          <torusGeometry args={[0.088, 0.028, 10, 18]} />
        </mesh>
        <mesh position={[0.02, 0.36, -0.015]} material={mats.skinTone}>
          <sphereGeometry args={[0.082, 16, 14]} />
        </mesh>
        <mesh position={[0.015, 0.385, -0.01]} material={mats.leatherJacket}>
          <sphereGeometry args={[0.088, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65]} />
        </mesh>

        {/* Tay trái giữ chắc hông sau can xăng (lùi xuống dưới-phải khi đục để tách thoáng hẳn khỏi lưỡi rìu thép) -> đẩy mạnh can ra ngoài lúc 624.18 s */}
        <group
          position={[
            -0.08 - pSetSill * 0.09 + pShoveOut * 0.11,
            0.14 - pSetSill * 0.19 + pShoveOut * 0.08,
            -0.04 - pShoveOut * 0.18,
          ]}
          rotation={[0.46 + pSetSill * 0.28 - pShoveOut * 0.34, -0.18, -0.22]}
        >
          <mesh position={[0, -0.09, -0.08]} rotation={[0.98, 0, 0]} material={mats.leatherJacket} castShadow>
            <cylinderGeometry args={[0.048, 0.042, 0.24, 12]} />
          </mesh>
          <mesh position={[0, -0.15, -0.16]} rotation={[0.98, 0, 0]} material={mats.gloveCuff}>
            <cylinderGeometry args={[0.045, 0.043, 0.06, 12]} />
          </mesh>
          <mesh position={[0, -0.185, -0.21]} geometry={rbox(0.078, 0.068, 0.1, 0.022)} material={mats.workGlove} castShadow />
        </group>

        {/* Tay phải: nâng đỡ thân can khi rót -> cầm rìu phá hiểm USAAF bổ thủng 2 lỗ tam giác lúc 622.32 s -> đẩy văng can */}
        {pAxeReady < 0.45 || isTossed ? (
          <group
            position={[0.15, 0.13 + pTiltPour * 0.04, -0.04 - pShoveOut * 0.2]}
            rotation={[0.42 - pShoveOut * 0.36, 0.18, 0.18]}
          >
            <mesh position={[0, -0.09, -0.08]} rotation={[0.98, 0, 0]} material={mats.leatherJacket} castShadow>
              <cylinderGeometry args={[0.048, 0.042, 0.24, 12]} />
            </mesh>
            <mesh position={[0, -0.15, -0.16]} rotation={[0.98, 0, 0]} material={mats.gloveCuff}>
              <cylinderGeometry args={[0.045, 0.043, 0.06, 12]} />
            </mesh>
            <mesh position={[0, -0.185, -0.21]} geometry={rbox(0.078, 0.068, 0.1, 0.022)} material={mats.workGlove} castShadow />
          </group>
        ) : (
          // Tay phải cầm gốc cán rìu phá hiểm USAAF bổ mạnh đầu mỏ thép nhọn xuống đúng mặt vai can xăng tại 622.32 s,
          // rồi dừng ngay phía trên vai can để lộ trọn cả đầu rìu mỏ nhọn thép sáng lẫn 2 lỗ đục tam giác!
          <group
            position={[
              0.24,
              0.19 - (strike1 + strike2) * 0.13 - pAxePoise * 0.015,
              -0.11,
            ]}
            rotation={[
              0.42 + (strike1 + strike2) * 0.56 - pAxePoise * 0.06,
              0.14,
              0.06,
            ]}
          >
            <mesh position={[0, -0.05, -0.07]} rotation={[1.05, 0, 0]} material={mats.leatherJacket} castShadow>
              <cylinderGeometry args={[0.048, 0.042, 0.22, 12]} />
            </mesh>
            <mesh position={[0, -0.11, -0.165]} geometry={rbox(0.078, 0.07, 0.1, 0.022)} material={mats.workGlove} castShadow />
            {/* Găng tay nắm gốc cán rìu tại [0, -0.115, -0.175]; cán vươn sang -X tới đầu rìu thép sáng [-0.195, 0, 0] chúc mỏ nhọn xuống 2 lỗ tam giác! */}
            <group position={[-0.01, -0.115, -0.175]} rotation={[0.26, 0.16, 0.2]}>
              <mesh position={[-0.095, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.axeHandle} castShadow>
                <cylinderGeometry args={[0.015, 0.018, 0.26, 10]} />
              </mesh>
              {/* Lưỡi rìu thép bản rộng hướng lên + mũi mỏ chim tam giác sắc bén chúc thẳng xuống lỗ đục trên vai can */}
              <mesh position={[-0.195, 0.046, 0]} geometry={rbox(0.064, 0.078, 0.016, 0.003)} material={mats.axeSteel} castShadow />
              <mesh position={[-0.195, 0.086, 0]} geometry={rbox(0.068, 0.011, 0.006, 0.001)} material={mats.axeEdge} />
              <mesh position={[-0.195, -0.056, -0.012]} rotation={[0.25, 0, Math.PI]} material={mats.axeSteel} castShadow>
                <coneGeometry args={[0.022, 0.11, 4]} />
              </mesh>
            </group>
          </group>
        )}
      </group>

      {/* Tia giọt xăng & mạt kim loại bắn toé khoảnh khắc lưỡi rìu đục thủng mặt vai can (622.18..622.76 s) */}
      {(strike1 > 0.05 || strike2 > 0.05) && (
        <group position={[-1.31, 2.28, -1.24]}>
          {Array.from({ length: 8 }, (_, k) => {
            const burst = Math.max(strike1, strike2);
            const ang = (k / 8) * Math.PI * 2 + 0.4;
            const rad = 0.04 + (1 - burst) * 0.18;
            return (
              <mesh
                key={k}
                position={[Math.cos(ang) * rad, Math.sin(ang) * rad * 0.7 + 0.04, -0.04 - rad * 0.5]}
                material={k % 2 === 0 ? mats.axeEdge : mats.fuelCore}
              >
                <octahedronGeometry args={[0.011, 0]} />
              </mesh>
            );
          })}
        </group>
      )}

      {/* Chiếc can xăng thép 5-gallon chủ đạo xoay quanh trọng tâm (y = -0.22 m) */}
      {!isTossed && (
        <group position={[pivotX, pivotY, pivotZ]} rotation={[canRx, canRy, canRz]}>
          <group position={[0, -0.22, 0]}>
            <GasCan5Gal punctured={isPunctured} seed={61} />
          </group>
        </group>
      )}
    </group>
  );
};

const C04S01: React.FC = () => {
  const t = useT();
  const preset = STAGE_PRESETS.chinaDusk;

  const lead = leadPoseAt(t);
  const cam = evalCameraAt(t);

  // Hai chiếc B-25 đồng đội bay đội hình thấp phía trước trong ráng chiều Biển Hoa Đông (dùng chung seed={18}, tách thoáng khỏi vòng cánh quạt chiếc #1)
  const wingmanA = useMemo(() => ({ lx: 52, ly: -1.4, lz: 23.5 }), []);
  const wingmanB = useMemo(() => ({ lx: 84, ly: 6.8, lz: 44.5 }), []);
  const wingAWorld = v3Tuple(
    leadLocalToWorld(t, wingmanA.lx, wingmanA.ly + Math.sin(t * 1.05 + 1.2) * 0.4, wingmanA.lz),
  );
  const wingBWorld = v3Tuple(
    leadLocalToWorld(t, wingmanB.lx, wingmanB.ly + Math.cos(t * 0.92 + 2.1) * 0.45, wingmanB.lz),
  );

  // Tính toán chính xác 4 quỹ đạo parabol Newton của 4 chiếc GasCan5Gal (punctured={true}) văng khỏi cửa hông từ 624.18 s
  const tossedCans = useMemo(() => {
    const tRef = 625.03;
    const camRef = evalCameraAt(tRef);
    const fwd = camRef.look.clone().sub(camRef.pos).normalize();
    const upHint = new THREE.Vector3(Math.sin(camRef.roll), Math.cos(camRef.roll), 0);
    const right = new THREE.Vector3().crossVectors(fwd, upHint).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd).normalize();

    const makeSolver = (
      tRel: number,
      targetAtT: { sec: number; worldPos: THREE.Vector3 },
      accelY: number,
      seed: number,
      rotAtRef: V3,
      spinVel: V3,
      hitSec?: number,
    ) => {
      const p0 = leadLocalToWorld(tRel, -1.31, 2.02, -1.05);
      const dtTarget = targetAtT.sec - tRel;
      const acc = new THREE.Vector3(3.5, accelY, 1.8);
      const v0 = targetAtT.worldPos
        .clone()
        .sub(p0)
        .sub(acc.clone().multiplyScalar(0.5 * dtTarget * dtTarget))
        .divideScalar(dtTarget);
      return { tRel, p0, v0, acc, seed, rotAtRef, spinVel, hitSec };
    };

    // Tìm giao điểm tia nhìn xuống dưới-phải của camera với mặt biển y ≈ 0 để đặt điểm rơi tung vòng bọt trắng thật chuẩn bố cục
    const splashDir0 = fwd.clone().add(up.clone().multiplyScalar(-0.14)).add(right.clone().multiplyScalar(0.06)).normalize();
    const distToSea0 = Math.max(24, (camRef.pos.y - 0.5) / Math.max(0.25, -splashDir0.y));
    const splashTarget0 = camRef.pos.clone().add(splashDir0.multiplyScalar(distToSea0));
    splashTarget0.y = waveY(splashTarget0.x, splashTarget0.z, 624.85, 1.6);

    const splashTarget1 = camRef.pos
      .clone()
      .add(fwd.clone().multiplyScalar(8.4))
      .add(right.clone().multiplyScalar(-0.65))
      .add(up.clone().multiplyScalar(-1.35));

    // Can #2 lộn vòng ở trung cảnh (cách ống kính 3.35 m về phía dưới-phải, kích thước vừa đẹp)
    const midTarget2 = camRef.pos
      .clone()
      .add(fwd.clone().multiplyScalar(3.35))
      .add(right.clone().multiplyScalar(0.82))
      .add(up.clone().multiplyScalar(-0.24));

    // Can #3 lướt lớn ở tiền cảnh ống kính (cách ống kính 1.24 m bên trái tâm, phơi rõ gân chữ X & 2 lỗ đục tam giác toác mép sáng!)
    const heroTarget3 = camRef.pos
      .clone()
      .add(fwd.clone().multiplyScalar(1.24))
      .add(right.clone().multiplyScalar(-0.26))
      .add(up.clone().multiplyScalar(0.08));

    return [
      makeSolver(624.18, { sec: 624.85, worldPos: splashTarget0 }, -46, 61, [1.2, 0.5, 0.8], [5.4, 3.8, -4.6], 624.85),
      makeSolver(624.33, { sec: tRef, worldPos: splashTarget1 }, -38, 67, [0.85, 1.1, -0.6], [-4.8, 4.2, 5.1]),
      makeSolver(624.46, { sec: tRef, worldPos: midTarget2 }, -34, 73, [-0.65, 0.55, 0.85], [4.6, -3.9, 4.4]),
      // Góc xoay [-0.96, -0.32, 0.34] tại tRef=625.03 phơi trực diện cả mặt vai có 2 lỗ đục tam giác kim loại sáng lẫn sườn chữ X!
      makeSolver(624.62, { sec: tRef, worldPos: heroTarget3 }, -26, 79, [-0.96, -0.32, 0.34], [3.5, -2.7, 3.1]),
    ];
  }, []);

  const shadowFocus = v3Tuple(
    cam.pos.clone().lerp(new THREE.Vector3(lead.pos[0], lead.pos[1], lead.pos[2]), 0.62),
  );

  return (
    <AbsoluteFill>
      <Stage {...preset} shadowArea={24} shadowCenter={shadowFocus}>
        <Cam pos={v3Tuple(cam.pos)} look={v3Tuple(cam.look)} fov={cam.fov} roll={cam.roll} />

        {/* Mặt biển Hoa Đông chiều tà tím-hổ phách (swell = 1.6 m, trải rộng 1.400 m phủ kín chân trời sương mù) */}
        <OceanSurface t={t} swell={1.6} size={1400} seg={184} center={[20, 0]} palette="eastChinaDusk" />

        {/* Chiếc B-25B Mitchell dẫn đầu bay thấp ~35 m kèm ô cửa hông mở, kỹ thuật viên rót & đục thủng can xăng 5-gal */}
        <group position={lead.pos} rotation={[0, HEADING, 0]}>
          <group rotation={[lead.roll, 0, lead.pitch]}>
            <B25Mitchell
              propFast={true}
              navLights={true}
              gear={0}
              bombBay={0}
              broomsticks={true}
              lowerTurret={false}
              turretYaw={0.18}
              turretPitch={0.08}
              seed={18}
            />
            <OpenAftHatchRig t={t} />
          </group>
        </group>

        {/* 2 chiếc B-25B đồng đội bay đội hình thấp phía xa trên sóng hoàng hôn (dùng chung seed={18}) */}
        <group position={wingAWorld} rotation={[0, HEADING, 0]}>
          <group rotation={[Math.sin(t * 0.76 + 1.1) * 0.03, 0, 0.016]}>
            <B25Mitchell
              propFast={true}
              navLights={true}
              gear={0}
              bombBay={0}
              broomsticks={true}
              lowerTurret={false}
              seed={18}
            />
          </group>
        </group>

        <group position={wingBWorld} rotation={[0, HEADING, 0]}>
          <group rotation={[Math.cos(t * 0.71 + 2.3) * 0.028, 0, 0.016]}>
            <B25Mitchell
              propFast={true}
              navLights={true}
              gear={0}
              bombBay={0}
              broomsticks={true}
              lowerTurret={false}
              seed={18}
            />
          </group>
        </group>

        {/* 4 chiếc can xăng 5-gallon đã đục lỗ (punctured={true}) văng khỏi cửa hông lúc 624.18 s, xoay vòng rơi xuống sóng */}
        {tossedCans.map((c, idx) => {
          const dt = t - c.tRel;
          if (dt < 0) return null;
          const pos = c.p0
            .clone()
            .add(c.v0.clone().multiplyScalar(dt))
            .add(c.acc.clone().multiplyScalar(0.5 * dt * dt));
          const yWater = waveY(pos.x, pos.z, t, 1.6);

          if (c.hitSec !== undefined && t >= c.hitSec) {
            const sinkDt = t - c.hitSec;
            if (sinkDt > 0.45) return null;
            pos.y = yWater - sinkDt * 2.2;
          }

          const dtFromRef = t - 625.03;
          const rx = c.rotAtRef[0] + c.spinVel[0] * dtFromRef;
          const ry = c.rotAtRef[1] + c.spinVel[1] * dtFromRef;
          const rz = c.rotAtRef[2] + c.spinVel[2] * dtFromRef;

          return (
            <group key={`toss-can-${idx}`} position={v3Tuple(pos)} rotation={[rx, ry, rz]}>
              <group position={[0, -0.21, 0]}>
                <GasCan5Gal punctured={true} seed={c.seed} />
              </group>
            </group>
          );
        })}

        {/* Vòng bọt trắng 3D bám sóng & cột bụi nước tung lên nơi các can xăng đục lỗ lao xuống */}
        {tossedCans.map((c, idx) => {
          if (c.hitSec === undefined) return null;
          const dtHit = c.hitSec - c.tRel;
          const hitPos = c.p0
            .clone()
            .add(c.v0.clone().multiplyScalar(dtHit))
            .add(c.acc.clone().multiplyScalar(0.5 * dtHit * dtHit));
          return (
            <OceanCanSplash
              key={`splash-${idx}`}
              t={t}
              at={c.hitSec}
              x={hitPos.x}
              z={hitPos.z}
              scale={idx === 0 ? 1.25 : 1.0}
            />
          );
        })}
      </Stage>

      {/* Nhãn duy nhất trong cảnh: "LAST 5-GAL CANS" (620.10–624.90 s) đặt ở góc dưới-trái an toàn, không đè chủ thể */}
      <Label
        t={t}
        text="LAST 5-GAL CANS"
        x={410}
        y={895}
        from={CUE.c04_s01_five_gal}
        until={624.9}
        size={50}
      />
    </AbsoluteFill>
  );
};

export default C04S01;
