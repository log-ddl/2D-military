// Tổ hợp phòng vệ chủ động Hard-Kill APS (kiểu Trophy HV / Iron Fist):
// - Bệ giáp gắn tháp pháo vát cạnh (~0.95 m × 0.75 m × 0.78 m, đáy y = 0, hướng chính +X)
// - Khối radar mảng pha chủ động AESA bát giác nghiêng 25° (gốm điện môi vi mạch đồng/cyan + dải LED trạng thái)
// - Hộp xử lý tín hiệu sau có 13 cánh tản nhiệt nhôm phay & tuyến ống cáp bọc thép đan kim loại (pipe)
// - Tháp phóng đánh chặn 2 trục Gimbal (yaw + pitch) đỡ 2 ống phóng song song, đai khóa, nắp chắn nổ & cảm biến quang-điện tử đồng trục
// - Đạn đánh chặn phân mảnh có 4 cánh ổn định đuôi lao vọt dọc trục ống kèm chớp lửa đầu ống & vệt khói mảnh
// - Vòm sóng radar 360° (scanPhase > 0) + cung khóa mục tiêu đỏ (alertAngle)
import React, { useMemo } from 'react';
import * as THREE from 'three';
import { softDot } from '@skill/military/3d/fx';
import { extrude, extrudeTop, lathe, pipe, rbox, type P2 } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Rivets } from '@skill/military/3d/parts';
import { turntable } from '@skill/military/3d/turntable';

// Bảng màu đồng bộ 1:1 từ `src/design/index.ts`
const THEME = {
  armorBase: '#4c5642',
  armorCamo1: '#353d30',
  armorCamo2: '#6e6850',
  armorDark: '#262b24',
  steelRaw: '#8b95a1',
  steelDark: '#39414a',
  rubber: '#1f2124',
  threatRed: '#ff3b30',
  apsCyan: '#00e5ff',
  amberGold: '#ffb703',
} as const;

export type APSRadarPodProps = {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
  /** Góc xoay phương vị bệ phóng đánh chặn quanh Y (rad), mặc định 0. */
  yaw?: number;
  /** Góc nâng tầm ống phóng đánh chặn (rad), mặc định 0.35. */
  pitch?: number;
  /** 0..1 tiến độ phóng đạn đánh chặn rời ống (0 = nằm trong ống, >0 = lao ra ngoài kèm lửa). */
  fireProgress?: number;
  /** Pha quét radar 360° (undefined hoặc <= 0 = tắt vòm sóng radar; >0 = vẽ vòm/vòng sóng radar quét theo góc scanPhase * 2π). */
  scanPhase?: number;
  /** Bán kính vòm sóng radar 360° (m), mặc định 14. */
  scanRadius?: number;
  /** Góc phương vị mối đe dọa bị khóa mục tiêu đỏ trên vòm radar (rad), undefined = không khóa. */
  alertAngle?: number;
};

// ---------------- Biến hình học bát giác chuẩn hóa UV 0..1 ----------------
const octPts = (w: number, h: number, cut: number): P2[] => {
  const hw = w / 2;
  const hh = h / 2;
  const cx = Math.min(cut, hw * 0.55);
  const cy = Math.min(cut, hh * 0.55);
  return [
    [-hw + cx, -hh],
    [hw - cx, -hh],
    [hw, -hh + cy],
    [hw, hh - cy],
    [hw - cx, hh],
    [-hw + cx, hh],
    [-hw, hh - cy],
    [-hw, -hh + cy],
  ];
};

const aesaGeoCache = new Map<string, THREE.BufferGeometry>();
/** Tấm bát giác nằm trong mặt Y–Z (pháp tuyến hướng +X), chuẩn hóa UV [0..1] trên mặt trước. */
const makeOctPlateX = (wZ: number, hY: number, thickX: number, cut: number, bevel = 0.006) => {
  const key = `octX_${wZ}_${hY}_${thickX}_${cut}_${bevel}`;
  if (aesaGeoCache.has(key)) return aesaGeoCache.get(key)!;
  const g = extrude(octPts(wZ, hY, cut), thickX, bevel).clone();
  const pos = g.attributes.position;
  const uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / wZ + 0.5, pos.getY(i) / hY + 0.5);
  }
  uv.needsUpdate = true;
  g.rotateY(Math.PI / 2);
  g.computeVertexNormals();
  aesaGeoCache.set(key, g);
  return g;
};

let cachedAesaMat: THREE.MeshStandardMaterial | null = null;
/** Vật liệu mặt gốm điện môi AESA xám đen sẫm có lưới ô thu phát T/R vi mạch đồng & cyan sắc nét. */
const getAesaCeramicMat = (): THREE.MeshStandardMaterial => {
  if (cachedAesaMat) return cachedAesaMat;
  const N = 512;

  const cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const ctx = cv.getContext('2d')!;

  // Nền gốm điện môi Si3N4 xám đen sẫm
  const bg = ctx.createRadialGradient(N * 0.5, N * 0.48, N * 0.04, N * 0.5, N * 0.5, N * 0.72);
  bg.addColorStop(0, '#25313e');
  bg.addColorStop(0.6, '#18212b');
  bg.addColorStop(1, '#10161e');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, N, N);

  // Rãnh chia 4 phân mảng sóng milimet
  ctx.strokeStyle = 'rgba(8, 12, 17, 0.95)';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(N * 0.5, 0);
  ctx.lineTo(N * 0.5, N);
  ctx.moveTo(0, N * 0.5);
  ctx.lineTo(N, N * 0.5);
  ctx.stroke();

  // Lưới 16 × 12 phần tử thu phát T/R (Transmit/Receive micro-patch array)
  const cols = 16;
  const rows = 12;
  const padX = 28;
  const padY = 28;
  const cellW = (N - padX * 2) / cols;
  const cellH = (N - padY * 2) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padX + c * cellW;
      const y = padY + r * cellH;
      const raw = Math.sin(c * 19.31 + r * 43.17) * 43758.5453;
      const h = raw - Math.floor(raw);

      // Rãnh cách ly sóng bề mặt
      ctx.fillStyle = '#0d131a';
      ctx.fillRect(x + 1.4, y + 1.4, cellW - 2.8, cellH - 2.8);

      // Đế cộng hưởng điện môi
      ctx.fillStyle = h > 0.62 ? '#293746' : '#1f2a36';
      ctx.fillRect(x + 3.2, y + 3.2, cellW - 6.4, cellH - 6.4);

      // Viền anten vi dải mạ đồng-vàng RF
      ctx.strokeStyle = `rgba(232, 162, 88, ${0.52 + h * 0.3})`;
      ctx.lineWidth = 1.65;
      ctx.strokeRect(x + 5.2, y + 5.2, cellW - 10.4, cellH - 10.4);

      // Cực tiếp sóng đồng trung tâm
      ctx.fillStyle = `rgba(245, 188, 112, ${0.65 + h * 0.3})`;
      ctx.beginPath();
      ctx.arc(x + cellW * 0.5, y + cellH * 0.5, 2.2, 0, Math.PI * 2);
      ctx.fill();

      // Đường vi mạch dịch pha cyan tinh tế
      ctx.strokeStyle = `rgba(0, 229, 255, ${0.24 + (h > 0.68 ? 0.32 : 0.08)})`;
      ctx.lineWidth = 1.25;
      ctx.beginPath();
      ctx.moveTo(x + 4, y + cellH * 0.25);
      ctx.lineTo(x + cellW * 0.52, y + cellH * 0.25);
      ctx.moveTo(x + cellW * 0.48, y + cellH * 0.75);
      ctx.lineTo(x + cellW - 4, y + cellH * 0.75);
      ctx.stroke();
    }
  }

  // Đường viền mạch chuẩn hóa chu vi mảng pha
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.45)';
  ctx.lineWidth = 2.4;
  ctx.strokeRect(20, 20, N - 40, N - 40);

  const map = new THREE.CanvasTexture(cv);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;

  const ecv = document.createElement('canvas');
  ecv.width = ecv.height = N;
  const ectx = ecv.getContext('2d')!;
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, N, N);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = padX + c * cellW;
      const y = padY + r * cellH;
      const raw = Math.sin(c * 19.31 + r * 43.17) * 43758.5453;
      const h = raw - Math.floor(raw);
      ectx.strokeStyle = h > 0.7 ? 'rgba(0, 229, 255, 0.52)' : 'rgba(216, 150, 78, 0.18)';
      ectx.lineWidth = 1.15;
      ectx.strokeRect(x + 5.5, y + 5.5, cellW - 11, cellH - 11);
    }
  }
  const emap = new THREE.CanvasTexture(ecv);
  emap.colorSpace = THREE.SRGBColorSpace;

  cachedAesaMat = new THREE.MeshStandardMaterial({
    map,
    emissive: new THREE.Color('#ffffff'),
    emissiveMap: emap,
    emissiveIntensity: 0.42,
    roughness: 0.3,
    metalness: 0.5,
  });
  return cachedAesaMat;
};

// ---------------- Cụm mặt phẳng Radar AESA bát giác ----------------
const AESAPanelUnit: React.FC<{
  w: number;
  h: number;
  armorMat: THREE.Material;
  darkArmorMat: THREE.Material;
  steelMat: THREE.Material;
  compact?: boolean;
}> = ({ w, h, armorMat, darkArmorMat, steelMat, compact = false }) => {
  const bezelGeo = useMemo(() => makeOctPlateX(w, h, compact ? 0.028 : 0.046, Math.min(w, h) * 0.24, 0.008), [w, h, compact]);
  const innerRimGeo = useMemo(
    () => makeOctPlateX(w - 0.042, h - 0.046, compact ? 0.018 : 0.024, Math.min(w, h) * 0.21, 0.004),
    [w, h, compact],
  );
  const gasketGeo = useMemo(
    () => makeOctPlateX(w - 0.054, h - 0.058, compact ? 0.016 : 0.022, Math.min(w, h) * 0.2, 0.003),
    [w, h, compact],
  );
  const ceramicGeo = useMemo(
    () => makeOctPlateX(w - 0.068, h - 0.072, compact ? 0.013 : 0.017, Math.min(w, h) * 0.185, 0.003),
    [w, h, compact],
  );
  const ceramicMat = useMemo(() => getAesaCeramicMat(), []);

  // Hàng bu lông lục giác quanh vành bát giác
  const boltPts = useMemo<[number, number, number][]>(() => {
    const pts = octPts(w - 0.021, h - 0.022, Math.min(w, h) * 0.22);
    const out: [number, number, number][] = [];
    const xFace = compact ? 0.016 : 0.024;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      out.push([xFace, a[1], a[0]]);
      if (!compact) {
        out.push([xFace, (a[1] + b[1]) * 0.5, (a[0] + b[0]) * 0.5]);
      }
    }
    return out;
  }, [w, h, compact]);

  const xFront = compact ? 0.021 : 0.032;

  return (
    <group>
      {/* Khung giáp bát giác vát cạnh */}
      <mesh geometry={bezelGeo} material={armorMat} castShadow receiveShadow />
      {/* Vành kim loại phay tiếp sóng bao quanh gioăng */}
      <mesh position={[compact ? 0.01 : 0.015, -0.002, 0]} geometry={innerRimGeo} material={steelMat} />
      {/* Mí thép chắn mảnh văng đặt nhô CAO HƠN mép trên để không che khuất dải đèn trạng thái */}
      {!compact && (
        <mesh position={[0.02, h * 0.5 + 0.007, 0]} geometry={rbox(0.044, 0.015, w * 0.58, 0.004)} material={darkArmorMat} castShadow />
      )}
      {/* Gioăng cao su giảm chấn */}
      <mesh position={[compact ? 0.012 : 0.018, -0.002, 0]} geometry={gasketGeo} material={plain(THEME.rubber, 0.88, 0.08)} />
      {/* Mặt gốm điện môi AESA */}
      <mesh position={[compact ? 0.016 : 0.025, -0.002, 0]} geometry={ceramicGeo} material={ceramicMat} castShadow receiveShadow />

      {/* Gân chia phân mảng vi sóng & 4 chốt hiệu chuẩn đồng vàng trên mặt gốm */}
      {!compact && (
        <>
          <mesh position={[xFront + 0.002, -0.002, 0]} material={plain('#3c4b5c', 0.32, 0.82)}>
            <boxGeometry args={[0.003, h - 0.08, 0.0045]} />
          </mesh>
          <mesh position={[xFront + 0.002, -0.002, 0]} material={plain('#3c4b5c', 0.32, 0.82)}>
            <boxGeometry args={[0.003, 0.0045, w - 0.076]} />
          </mesh>
          {([-1, 1] as const).map((sy) =>
            ([-1, 1] as const).map((sz) => (
              <mesh
                key={`pin_${sy}_${sz}`}
                position={[xFront + 0.004, -0.002 + sy * (h * 0.255), sz * (w * 0.305)]}
                rotation={[0, 0, Math.PI / 2]}
                material={plain('#e0a358', 0.25, 0.88)}
              >
                <cylinderGeometry args={[0.005, 0.005, 0.008, 12]} />
              </mesh>
            )),
          )}
        </>
      )}

      {/* Dải đèn trạng thái hệ thống THEME.apsCyan đặt nổi rõ trên gờ trán bezel */}
      <group position={[compact ? 0.017 : 0.026, h * 0.5 - (compact ? 0.013 : 0.016), 0]}>
        <mesh material={plain('#081018', 0.45, 0.5)}>
          <boxGeometry args={[0.007, compact ? 0.012 : 0.016, w * 0.5]} />
        </mesh>
        {(compact ? [-1, 0, 1] : [-2, -1, 0, 1, 2]).map((k) => (
          <mesh key={k} position={[0.004, 0, k * (w * (compact ? 0.135 : 0.09))]}>
            <boxGeometry args={[0.004, compact ? 0.007 : 0.0095, w * (compact ? 0.1 : 0.072)]} />
            <meshBasicMaterial color={THEME.apsCyan} toneMapped={false} />
          </mesh>
        ))}
      </group>

      {/* Hai đèn chỉ thị đồng bộ góc dưới mặt radar */}
      {!compact &&
        ([-1, 1] as const).map((sz) => (
          <mesh key={`led_bot_${sz}`} position={[0.027, -h * 0.5 + 0.015, sz * (w * 0.2)]}>
            <boxGeometry args={[0.004, 0.007, 0.026]} />
            <meshBasicMaterial color={THEME.apsCyan} toneMapped={false} />
          </mesh>
        ))}

      <Rivets points={boltPts} r={compact ? 0.0048 : 0.0064} color={THEME.steelRaw} />
    </group>
  );
};

// ---------------- Một ống phóng đạn đánh chặn + đai khóa + nắp chắn nổ ----------------
const InterceptorTube: React.FC<{
  zOffset: number;
  openProgress: number;
  armorMat: THREE.Material;
  darkArmorMat: THREE.Material;
  steelMat: THREE.Material;
  darkSteelMat: THREE.Material;
}> = ({ zOffset, openProgress, armorMat, darkArmorMat, steelMat, darkSteelMat }) => {
  // Biên dạng tiện tròn ống phóng thép parkerized đen nhám + gờ gia cường + lòng ống sâu
  const barrelGeo = useMemo(
    () =>
      lathe(
        [
          [0.044, -0.278],
          [0.069, -0.278],
          [0.069, -0.244],
          [0.057, -0.222],
          [0.064, -0.195],
          [0.064, -0.095],
          [0.069, -0.09],
          [0.069, -0.052],
          [0.064, -0.047],
          [0.064, 0.072],
          [0.069, 0.077],
          [0.069, 0.114],
          [0.064, 0.119],
          [0.064, 0.256],
          [0.073, 0.265],
          [0.073, 0.318],
          [0.055, 0.318],
          [0.053, 0.296],
          [0.053, -0.195],
          [0.001, -0.2],
        ],
        36,
      ),
    [],
  );

  const clampBandGeo = useMemo(
    () =>
      lathe(
        [
          [0.064, -0.024],
          [0.076, -0.021],
          [0.076, 0.021],
          [0.064, 0.024],
        ],
        32,
      ),
    [],
  );

  const muzzleRingGeo = useMemo(
    () =>
      lathe(
        [
          [0.054, 0.314],
          [0.074, 0.314],
          [0.074, 0.324],
          [0.054, 0.324],
        ],
        32,
      ),
    [],
  );

  const breechCableGeo = useMemo(
    () =>
      pipe(
        [
          [-0.27, -0.015, zOffset * 0.78],
          [-0.302, -0.01, zOffset * 0.52],
          [-0.232, 0.014, zOffset * 0.2],
        ],
        0.009,
        20,
      ),
    [zOffset],
  );

  const capAngle = Math.min(1, openProgress * 15) * 1.96;

  return (
    <group>
      <group position={[0, 0, zOffset]}>
        {/* Thân ống phóng thép đen nhám parkerized */}
        <mesh geometry={barrelGeo} material={plain('#242b33', 0.5, 0.6)} castShadow receiveShadow />
        {/* Vành thép gia cường miệng ống */}
        <mesh geometry={muzzleRingGeo} material={steelMat} castShadow />
        {/* Vạch cảnh báo an toàn vàng hổ phách sát miệng ống */}
        <mesh position={[0.246, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#d89622', 0.45, 0.25)}>
          <cylinderGeometry args={[0.0648, 0.0648, 0.014, 28]} />
        </mesh>

        {/* 4 gân tản nhiệt thép phay sáng giữa thân ống */}
        {[-0.024, -0.002, 0.02, 0.042].map((xRib) => (
          <mesh key={xRib} position={[xRib, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMat}>
            <cylinderGeometry args={[0.068, 0.068, 0.007, 28]} />
          </mesh>
        ))}

        {/* 4 thanh ray dẫn hướng bên trong lòng ống phóng */}
        {[0, 1, 2, 3].map((i) => {
          const a = (i * Math.PI) / 2 + Math.PI / 4;
          return (
            <mesh
              key={`rail_${i}`}
              position={[0.14, Math.cos(a) * 0.052, Math.sin(a) * 0.052]}
              rotation={[a, 0, 0]}
              material={steelMat}
            >
              <boxGeometry args={[0.34, 0.004, 0.006]} />
            </mesh>
          );
        })}

        {/* 2 Đai khóa cơ khí hạng nặng ôm ống phóng */}
        {[-0.072, 0.096].map((xClamp) => (
          <group key={xClamp} position={[xClamp, 0, 0]}>
            <mesh geometry={clampBandGeo} material={armorMat} castShadow receiveShadow />
            {/* Khóa cam siết bu lông trên đỉnh đai */}
            <mesh position={[0, 0.081, 0]} geometry={rbox(0.038, 0.024, 0.036, 0.004)} material={darkSteelMat} castShadow />
            <mesh position={[0, 0.083, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
              <cylinderGeometry args={[0.0065, 0.0065, 0.046, 6]} />
            </mesh>
            {/* Vấu ngàm nối cứng vào khung giữa */}
            <mesh
              position={[0, 0, -Math.sign(zOffset) * 0.058]}
              geometry={rbox(0.046, 0.058, 0.048, 0.006)}
              material={darkArmorMat}
              castShadow
            />
          </group>
        ))}

        {/* Cụm khóa đuôi & giắc điểm hỏa đồng */}
        <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={darkSteelMat} castShadow>
          <cylinderGeometry args={[0.048, 0.055, 0.02, 22]} />
        </mesh>
        <mesh position={[-0.292, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={steelMat}>
          <cylinderGeometry args={[0.022, 0.026, 0.012, 16]} />
        </mesh>
        <mesh position={[-0.288, -0.014, -Math.sign(zOffset) * 0.022]} rotation={[0, 0, Math.PI / 2]} material={plain('#c99650', 0.3, 0.85)}>
          <cylinderGeometry args={[0.012, 0.012, 0.018, 12]} />
        </mesh>

        {/* Cụm tai bản lề kép & lò xo đẩy nắp chắn nổ trên đỉnh miệng ống */}
        <mesh position={[0.308, 0.079, 0]} geometry={rbox(0.038, 0.022, 0.038, 0.004)} material={darkSteelMat} castShadow />
        <mesh position={[0.322, 0.082, 0]} rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
          <cylinderGeometry args={[0.006, 0.006, 0.046, 12]} />
        </mesh>

        {/* Nắp chắn nổ mở bung quanh chốt bản lề khi fireProgress > 0 */}
        <group position={[0.322, 0.082, 0]} rotation={[0, 0, capAngle]}>
          <group position={[0.007, -0.082, 0]}>
            <mesh rotation={[0, 0, Math.PI / 2]} material={armorMat} castShadow>
              <cylinderGeometry args={[0.072, 0.07, 0.014, 28]} />
            </mesh>
            {/* Vành đệm thép quanh mép nắp */}
            <mesh rotation={[0, 0, Math.PI / 2]} material={darkSteelMat}>
              <cylinderGeometry args={[0.0735, 0.0735, 0.006, 28]} />
            </mesh>
            {/* Mặt trong nắp ám muội thuốc phóng */}
            <mesh position={[-0.0075, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#16191d', 0.88, 0.2)}>
              <cylinderGeometry args={[0.056, 0.056, 0.003, 24]} />
            </mesh>
            <mesh position={[-0.0085, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
              <ringGeometry args={[0.022, 0.048, 24]} />
              <meshBasicMaterial color="#2c3035" side={THREE.DoubleSide} />
            </mesh>
            {/* Gân gia cường chữ thập và chốt đồng cắt nổ mặt ngoài */}
            <mesh position={[0.008, 0, 0]} material={darkSteelMat}>
              <boxGeometry args={[0.005, 0.132, 0.01]} />
            </mesh>
            <mesh position={[0.008, 0, 0]} material={darkSteelMat}>
              <boxGeometry args={[0.005, 0.01, 0.132]} />
            </mesh>
            <mesh position={[0.01, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#d69e52', 0.3, 0.85)}>
              <cylinderGeometry args={[0.013, 0.013, 0.007, 12]} />
            </mesh>
            {/* Đôi tay đòn bản lề nối cứng vào chốt xoay */}
            {[-0.012, 0.012].map((zh) => (
              <mesh key={zh} position={[-0.001, 0.056, zh]} geometry={rbox(0.014, 0.058, 0.008, 0.002)} material={steelMat} castShadow />
            ))}
          </group>
        </group>
      </group>

      {/* Cáp bọc kim loại điểm hỏa phía đuôi */}
      <mesh geometry={breechCableGeo} material={plain('#64707d', 0.36, 0.8)} castShadow />
    </group>
  );
};

// ---------------- Đạn đánh chặn phân mảnh (Hard-Kill Interceptor) + Lửa & Khói ----------------
const HardKillInterceptorShot: React.FC<{
  fireProgress: number;
  zOffset: number;
}> = ({ fireProgress, zOffset }) => {
  // Biên dạng đạn đánh chặn: mũi ogive 16 điểm mượt + thân phân mảnh + loa phụt đuôi
  const bodyGeo = useMemo(() => {
    const prof: P2[] = [
      [0.016, -0.172],
      [0.036, -0.172],
      [0.026, -0.146],
      [0.044, -0.13],
      [0.045, -0.032],
      [0.048, -0.026],
      [0.048, 0.076],
    ];
    const noseSteps = 16;
    for (let i = 1; i <= noseSteps; i++) {
      const u = i / noseSteps;
      const x = 0.076 + u * 0.096;
      const r = 0.048 * Math.pow(1 - u * u, 0.62) + 0.0055 * (1 - u);
      prof.push([Math.max(0.001, r), x]);
    }
    return lathe(prof, 30);
  }, []);

  // Cánh ổn định đuôi khí động bằng thép titan sáng
  const finGeo = useMemo(
    () =>
      extrude(
        [
          [-0.044, 0.042],
          [0.02, 0.042],
          [0.002, 0.106],
          [-0.038, 0.11],
        ],
        0.0045,
        0.001,
      ),
    [],
  );

  const puffTex = useMemo(() => softDot(), []);

  if (fireProgress <= 0) return null;

  const p = Math.max(0, fireProgress);
  // Quỹ đạo đẩy rời ống + tăng tốc động cơ:
  // p = 0.12 -> travel = 0.70 m (đuôi đạn cách miệng ống ~25 cm để lộ rõ cả chớp lửa đầu nòng, vệt khói mảnh & 4 cánh đuôi);
  // p = 1.00 -> travel = 12.0 m chuẩn cự ly đánh chặn.
  const travel = 5.0 * p + 7.0 * p * p;
  const projX = 0.045 + travel;
  const muzzleX = 0.326;
  const tailX = projX - 0.172;
  const finOpen = Math.min(1, Math.max(0, (travel - 0.12) / 0.24));
  const flash = Math.max(0, 1 - Math.max(0, p - 0.02) / 0.3);
  const trailLen = Math.max(0, tailX - muzzleX);

  return (
    <group position={[0, 0, zOffset]}>
      {/* 1. Chớp lửa đầu ống phóng gọn sắc nét ngay miệng nòng */}
      {flash > 0.01 && (
        <group position={[muzzleX + 0.012, 0, 0]}>
          <mesh position={[0.042 * flash, 0, 0]} scale={[0.085 * (0.45 + flash), 0.042 * (0.4 + flash), 0.042 * (0.4 + flash)]}>
            <sphereGeometry args={[1, 14, 10]} />
            <meshBasicMaterial color="#fff7d4" transparent opacity={0.9 * flash} toneMapped={false} depthWrite={false} />
          </mesh>
          {[0, 1, 2, 3].map((i) => (
            <mesh
              key={i}
              position={[0.024, 0, 0]}
              rotation={[(i * Math.PI) / 2 + 0.38, 0, 0.36]}
              scale={[0.036, 0.11 * (0.45 + flash * 0.65), 0.018]}
            >
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial color="#ff8f26" transparent opacity={0.72 * flash} toneMapped={false} depthWrite={false} />
            </mesh>
          ))}
          <mesh position={[0.008, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
            <ringGeometry args={[0.052, 0.086 + (1 - flash) * 0.04, 24]} />
            <meshBasicMaterial
              color="#ffb74d"
              transparent
              opacity={0.48 * flash}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      )}

      {/* 2. Vệt khói mảnh nối liền miệng ống tới loa phụt đuôi đạn */}
      {trailLen > 0.02 && (
        <group>
          <mesh position={[muzzleX + trailLen * 0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.012, 0.028, trailLen, 12, 1, true]} />
            <meshBasicMaterial
              color="#e3ddd2"
              transparent
              opacity={0.34 * Math.max(0.24, 1 - p * 0.5)}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <mesh position={[tailX - Math.min(trailLen, 0.32) * 0.5, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <cylinderGeometry args={[0.005, 0.013, Math.min(trailLen, 0.32), 10, 1, true]} />
            <meshBasicMaterial color="#ffc46b" transparent opacity={0.68} toneMapped={false} depthWrite={false} />
          </mesh>
          {Array.from({ length: 14 }, (_, i) => {
            const u = (i + 0.35) / 14;
            const x = muzzleX + trailLen * u;
            const jitY = Math.sin(i * 17.3 + 1.2) * 0.009 * (1 - u);
            const jitZ = Math.cos(i * 23.7 + 0.5) * 0.009 * (1 - u);
            const sz = (0.048 + (1 - u) * 0.068) * (1 + Math.min(0.7, trailLen * 0.07));
            const op = (0.18 + 0.24 * (1 - u)) * Math.max(0.22, 1 - p * 0.48);
            return (
              <sprite key={i} position={[x, jitY, jitZ]} scale={[sz, sz, sz]}>
                <spriteMaterial
                  map={puffTex}
                  color={u > 0.84 ? '#ffe4b2' : '#d8d2c8'}
                  transparent
                  opacity={op}
                  depthWrite={false}
                />
              </sprite>
            );
          })}
        </group>
      )}

      {/* 3. Viên đạn đánh chặn phân mảnh (Hard-Kill Interceptor) */}
      <group position={[projX, 0, 0]} rotation={[travel * 7.5, 0, 0]}>
        <mesh geometry={bodyGeo} material={plain('#323c47', 0.38, 0.68)} castShadow />

        {/* Đai thuốc nổ mạnh màu vàng chiến thuật + vòng ngòi nổ cận đích sóng milimet cyan */}
        <mesh position={[0.054, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain(THEME.amberGold, 0.36, 0.22)}>
          <cylinderGeometry args={[0.0488, 0.0488, 0.02, 24]} />
        </mesh>
        <mesh position={[0.084, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.0472, 0.0472, 0.0085, 24]} />
          <meshBasicMaterial color={THEME.apsCyan} toneMapped={false} />
        </mesh>

        {/* Đai mảnh văng hợp kim tungsten chia khía cơ khí */}
        {[-0.02, -0.001, 0.018, 0.035].map((xf) => (
          <mesh key={xf} position={[xf, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#6c7886', 0.3, 0.82)}>
            <cylinderGeometry args={[0.0494, 0.0494, 0.0095, 22]} />
          </mesh>
        ))}

        {/* Chóp cảm biến ngòi nổ cận đích bằng đồng thau ở mũi đạn */}
        <mesh position={[0.17, 0, 0]} rotation={[0, 0, -Math.PI / 2]} material={plain('#e3a456', 0.24, 0.88)}>
          <coneGeometry args={[0.0115, 0.024, 16]} />
        </mesh>

        {/* 4 Cánh ổn định đuôi thép sáng bung mở sau khi thoát miệng ống */}
        {[0, 1, 2, 3].map((i) => (
          <group key={i} rotation={[(i * Math.PI) / 2 + Math.PI / 4, 0, 0]}>
            <group position={[-0.122, 0.042, 0]} rotation={[0, 0, -(1 - finOpen) * 1.15]}>
              <mesh position={[0, -0.042, 0]} geometry={finGeo} material={plain('#b2bcc7', 0.26, 0.86)} castShadow />
            </group>
          </group>
        ))}

        {/* Tia lửa phản lực tập trung gọn sắc ở loa phụt đuôi (không che khuất cánh đuôi) */}
        <mesh position={[-0.204, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.02, 0.072, 14]} />
          <meshBasicMaterial color="#fff7d1" transparent opacity={0.95} toneMapped={false} depthWrite={false} />
        </mesh>
        <mesh position={[-0.232, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
          <coneGeometry args={[0.028, 0.125, 14]} />
          <meshBasicMaterial color="#ff7f1e" transparent opacity={0.72} toneMapped={false} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
};

// ---------------- Vòm Sóng Radar Quét 360° & Khóa Mục Tiêu Đỏ ----------------
const RadarDome360: React.FC<{
  scanPhase: number;
  scanRadius: number;
  alertAngle?: number;
}> = ({ scanPhase, scanRadius, alertAngle }) => {
  const R = Math.max(1.5, scanRadius);
  const sweepAngle = scanPhase * Math.PI * 2;
  const pulseA = (scanPhase * 1.8) % 1;
  const pulseB = (scanPhase * 1.8 + 0.5) % 1;
  const lockPulse = 0.72 + 0.28 * Math.sin(scanPhase * Math.PI * 14);
  const lineW = Math.max(0.035, R * 0.0055);

  return (
    <group position={[0, 0.24, 0]}>
      {/* 1. Hệ vòng tròn đồng tâm phát sáng mảnh */}
      {[0.25, 0.5, 0.75, 1.0].map((f, idx) => {
        const r = R * f;
        const w = idx === 3 ? lineW * 1.65 : lineW;
        return (
          <mesh key={f} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[Math.max(0.05, r - w), r + w * 0.5, 96]} />
            <meshBasicMaterial
              color={THEME.apsCyan}
              transparent
              opacity={idx === 3 ? 0.56 : 0.28 + idx * 0.05}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* 2 vòng sóng xung radar lan tỏa từ tâm ra biên */}
      {[pulseA, pulseB].map((p, idx) => {
        const rp = R * (0.06 + 0.94 * p);
        const op = Math.pow(1 - p, 1.45) * 0.52;
        return (
          <mesh key={`pulse_${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
            <ringGeometry args={[Math.max(0.04, rp - lineW * 1.3), rp + lineW * 0.9, 96]} />
            <meshBasicMaterial
              color={THEME.apsCyan}
              transparent
              opacity={op}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* 8 tia chia phương vị chiến thuật */}
      {Array.from({ length: 8 }, (_, i) => (
        <group key={`spoke_${i}`} rotation={[0, (i * Math.PI) / 4, 0]}>
          <mesh position={[R * 0.54, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[R * 0.92, lineW * 0.75]} />
            <meshBasicMaterial
              color={THEME.apsCyan}
              transparent
              opacity={0.14}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        </group>
      ))}

      {/* 2. Vòm lưới bán cầu mờ rất tinh tế */}
      <mesh>
        <sphereGeometry args={[R, 36, 16, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshBasicMaterial
          color={THEME.apsCyan}
          transparent
          opacity={0.028}
          side={THREE.DoubleSide}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[R, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.48]} />
        <meshBasicMaterial
          color={THEME.apsCyan}
          wireframe
          transparent
          opacity={0.085}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>
      {[24, 48].map((elevDeg) => {
        const el = (elevDeg * Math.PI) / 180;
        const rl = R * Math.cos(el);
        const yl = R * Math.sin(el);
        return (
          <mesh key={elevDeg} position={[0, yl, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[rl - lineW * 0.7, rl + lineW * 0.7, 84]} />
            <meshBasicMaterial
              color={THEME.apsCyan}
              transparent
              opacity={0.2}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
        );
      })}

      {/* 3. Cánh quạt quét radar 3D xoay tròn theo scanPhase * 2π */}
      <group rotation={[0, sweepAngle, 0]}>
        <mesh position={[R * 0.51, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[R * 0.98, lineW * 1.9]} />
          <meshBasicMaterial
            color="#b5fcff"
            transparent
            opacity={0.9}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        <mesh>
          <ringGeometry args={[R * 0.992, R * 1.006, 40, 1, 0, 1.18]} />
          <meshBasicMaterial
            color="#a6f9ff"
            transparent
            opacity={0.82}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
        {Array.from({ length: 10 }, (_, i) => {
          const segSpan = 0.085;
          const start = -(i + 1) * segSpan;
          const fade = Math.pow(1 - i / 10, 1.65);
          return (
            <React.Fragment key={`fan_${i}`}>
              <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[R * 0.05, R, 12, 1, start, segSpan * 1.04]} />
                <meshBasicMaterial
                  color={THEME.apsCyan}
                  transparent
                  opacity={0.22 * fade}
                  blending={THREE.AdditiveBlending}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
              <mesh rotation={[0, start + segSpan * 0.5, 0]}>
                <ringGeometry args={[R * 0.985, R * 1.002, 24, 1, 0, 0.95]} />
                <meshBasicMaterial
                  color={THEME.apsCyan}
                  transparent
                  opacity={0.14 * fade}
                  blending={THREE.AdditiveBlending}
                  side={THREE.DoubleSide}
                  toneMapped={false}
                  depthWrite={false}
                />
              </mesh>
            </React.Fragment>
          );
        })}
      </group>

      {/* 4. Cung cảnh báo khóa mục tiêu đỏ (alertAngle !== undefined) */}
      {alertAngle !== undefined && (
        <group rotation={[0, alertAngle, 0]}>
          <mesh position={[0, 0.026, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[R * 0.968, R * 1.022, 36, 1, -0.32, 0.64]} />
            <meshBasicMaterial
              color={THEME.threatRed}
              transparent
              opacity={0.92 * lockPulse}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          {[0.48, 0.74].map((fr) => (
            <mesh key={fr} position={[0, 0.024, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <ringGeometry args={[R * fr - lineW * 1.4, R * fr + lineW * 1.4, 28, 1, -0.24, 0.48]} />
              <meshBasicMaterial
                color={THEME.threatRed}
                transparent
                opacity={0.68 * lockPulse}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          ))}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[R * 0.08, R, 24, 1, -0.28, 0.56]} />
            <meshBasicMaterial
              color={THEME.threatRed}
              transparent
              opacity={0.16 * lockPulse}
              blending={THREE.AdditiveBlending}
              side={THREE.DoubleSide}
              toneMapped={false}
              depthWrite={false}
            />
          </mesh>
          {[-0.22, 0, 0.22].map((azOff, idx) => (
            <mesh key={azOff} rotation={[0, azOff, 0]}>
              <ringGeometry args={[R * 0.986, R * (idx === 1 ? 1.016 : 1.004), 32, 1, 0, 1.24]} />
              <meshBasicMaterial
                color={THEME.threatRed}
                transparent
                opacity={(idx === 1 ? 0.9 : 0.48) * lockPulse}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          ))}
          <group rotation={[0, 0, 0.46]}>
            <mesh position={[R * 0.5, 0, 0]}>
              <boxGeometry args={[R * 0.96, lineW * 1.2, lineW * 1.2]} />
              <meshBasicMaterial color={THEME.threatRed} transparent opacity={0.78 * lockPulse} toneMapped={false} depthWrite={false} />
            </mesh>
            <mesh position={[R * 0.99, 0, 0]} rotation={[0, Math.PI / 2, Math.PI / 4]}>
              <ringGeometry args={[R * 0.042, R * 0.058, 4]} />
              <meshBasicMaterial
                color={THEME.threatRed}
                transparent
                opacity={0.95}
                side={THREE.DoubleSide}
                toneMapped={false}
                depthWrite={false}
              />
            </mesh>
          </group>
        </group>
      )}
    </group>
  );
};

// ---------------- Mô hình chính APSRadarPod ----------------
export const APSRadarPod: React.FC<APSRadarPodProps> = ({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  yaw = 0,
  pitch = 0.35,
  fireProgress = 0,
  scanPhase,
  scanRadius = 14,
  alertAngle,
}) => {
  // Vật liệu sơn quân sự chuẩn NATO Olive-Slate có vết mòn lộ thép & vân camo rõ khối
  const armorMat = useMemo(
    () =>
      paint({
        color: THEME.armorBase,
        camo: [THEME.armorCamo2, THEME.armorCamo1],
        camoScale: 1.3,
        wear: 0.34,
        dirt: 0.14,
        roughness: 0.52,
        metalness: 0.22,
        repeat: 0.5,
        seed: 19,
      }),
    [],
  );

  const darkArmorMat = useMemo(
    () =>
      paint({
        color: THEME.armorDark,
        wear: 0.3,
        dirt: 0.12,
        roughness: 0.56,
        metalness: 0.3,
        repeat: 0.5,
        seed: 31,
      }),
    [],
  );

  const steelMat = useMemo(() => plain(THEME.steelRaw, 0.32, 0.8), []);
  const darkSteelMat = useMemo(() => plain(THEME.steelDark, 0.42, 0.68), []);
  // Cáp bọc lưới thép không gỉ sáng rõ nét cơ khí
  const conduitMat = useMemo(() => plain('#687482', 0.36, 0.8), []);
  const brassMat = useMemo(() => plain('#cc9852', 0.3, 0.86), []);

  // 1. Đế thép bát giác gắn nóc tháp pháo (~0.95 m × 0.75 m, đáy tại y = 0)
  const basePlinthGeo = useMemo(
    () =>
      extrudeTop(
        [
          [-0.34, -0.368],
          [0.34, -0.368],
          [0.468, -0.24],
          [0.468, 0.24],
          [0.34, 0.368],
          [-0.34, 0.368],
          [-0.468, 0.24],
          [-0.468, -0.24],
        ],
        0.046,
        0.01,
      ),
    [],
  );

  // 2. Thân vỏ giáp chính vát mặt trước đúng góc 25° đỡ cụm radar AESA
  const mainHullGeo = useMemo(
    () =>
      extrude(
        [
          [-0.36, 0.04],
          [0.416, 0.04],
          [0.436, 0.082],
          [0.313, 0.346],
          [-0.255, 0.346],
          [-0.36, 0.285],
        ],
        0.59,
        0.02,
      ),
    [],
  );

  // Giáp má sườn hai bên vát cạnh
  const cheekArmorGeo = useMemo(
    () =>
      extrude(
        [
          [-0.285, 0.044],
          [0.305, 0.044],
          [0.345, 0.115],
          [0.245, 0.305],
          [-0.225, 0.305],
          [-0.305, 0.235],
        ],
        0.072,
        0.014,
      ),
    [],
  );

  // Càng chữ U nâng tầm (U-Yoke Gimbal Arm)
  const yokeArmGeo = useMemo(() => {
    const pts: P2[] = [
      [-0.108, 0.025],
      [0.108, 0.025],
      [0.09, 0.145],
    ];
    for (let i = 0; i <= 16; i++) {
      const a = (i / 16) * Math.PI;
      pts.push([Math.cos(a) * 0.066, 0.205 + Math.sin(a) * 0.066]);
    }
    pts.push([-0.09, 0.145]);
    return extrude(pts, 0.05, 0.008);
  }, []);

  // Tuyến ống cáp bọc thép đan kim loại (pipe)
  const rightArmoredCable = useMemo(
    () =>
      pipe(
        [
          [-0.355, 0.135, 0.218],
          [-0.392, 0.115, 0.318],
          [-0.16, 0.106, 0.36],
          [0.08, 0.118, 0.36],
          [0.255, 0.156, 0.312],
          [0.306, 0.186, 0.238],
        ],
        0.019,
        42,
      ),
    [],
  );

  const leftArmoredCable = useMemo(
    () =>
      pipe(
        [
          [-0.355, 0.155, -0.218],
          [-0.395, 0.182, -0.312],
          [-0.24, 0.296, -0.336],
          [-0.14, 0.364, -0.256],
          [-0.075, 0.372, -0.196],
        ],
        0.017,
        38,
      ),
    [],
  );

  const gimbalCable = useMemo(
    () =>
      pipe(
        [
          [-0.055, 0.05, -0.186],
          [-0.118, 0.116, -0.25],
          [-0.108, 0.205, -0.248],
          [-0.045, 0.24, -0.176],
        ],
        0.013,
        28,
      ),
    [],
  );

  // Hệ đinh tán cơ khí trên đế, má giáp, cổ xoay và càng gimbal
  const baseRivets = useMemo<[number, number, number][]>(() => {
    const pts: [number, number, number][] = [];
    for (let i = -3; i <= 3; i++) {
      pts.push([i * 0.095, 0.048, 0.344]);
      pts.push([i * 0.095, 0.048, -0.344]);
    }
    for (const sz of [-1, 1] as const) {
      for (let k = 0; k < 5; k++) {
        pts.push([-0.21 + k * 0.105, 0.28, sz * 0.339]);
        pts.push([-0.24 + k * 0.115, 0.08, sz * 0.339]);
      }
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      pts.push([-0.045 + Math.cos(a) * 0.216, 0.386, Math.sin(a) * 0.216]);
    }
    return pts;
  }, []);

  const aesaTilt = (25 * Math.PI) / 180;

  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ==================== 1. BỆ GIÁP & KHỐI RADAR AESA + HỘP XỬ LÝ TÍN HIỆU ==================== */}
      <mesh geometry={basePlinthGeo} material={darkArmorMat} castShadow receiveShadow />

      {/* 4 vấu chân neo bu lông lục giác hạng nặng (đáy chuẩn tại y = 0) */}
      {([-1, 1] as const).map((sx) =>
        ([-1, 1] as const).map((sz) => (
          <group key={`foot_${sx}_${sz}`} position={[sx * 0.398, 0, sz * 0.33]}>
            <mesh position={[0, 0.022, 0]} geometry={rbox(0.112, 0.044, 0.09, 0.008)} material={darkArmorMat} castShadow receiveShadow />
            <mesh position={[sx * 0.018, 0.054, sz * 0.01]} material={steelMat} castShadow>
              <cylinderGeometry args={[0.017, 0.017, 0.024, 6]} />
            </mesh>
            <mesh position={[sx * 0.018, 0.044, sz * 0.01]} material={darkSteelMat}>
              <cylinderGeometry args={[0.026, 0.026, 0.006, 16]} />
            </mesh>
          </group>
        )),
      )}

      {/* Khối thân giáp chính */}
      <mesh geometry={mainHullGeo} material={armorMat} castShadow receiveShadow />

      {/* Hai tấm giáp má sườn + cửa bảo dưỡng + tai cẩu + radar phụ góc sườn */}
      {([-1, 1] as const).map((sz) => (
        <group key={`cheek_${sz}`}>
          <mesh position={[0, 0, sz * 0.302]} geometry={cheekArmorGeo} material={armorMat} castShadow receiveShadow />
          {/* Cửa nắp hộp kỹ thuật sườn có tay khóa thép */}
          <mesh position={[-0.135, 0.176, sz * 0.341]} geometry={rbox(0.19, 0.115, 0.012, 0.004)} material={darkArmorMat} castShadow />
          <mesh position={[-0.135, 0.176, sz * 0.348]} geometry={rbox(0.048, 0.02, 0.008, 0.002)} material={steelMat} />
          {/* 2 tai cẩu thép rèn trên nóc sườn */}
          {[-0.21, 0.2].map((lx) => (
            <mesh
              key={`lug_${lx}`}
              position={[lx, 0.312, sz * 0.312]}
              rotation={[0, Math.PI / 2, 0]}
              material={steelMat}
              castShadow
            >
              <torusGeometry args={[0.023, 0.0065, 8, 16, Math.PI]} />
            </mesh>
          ))}
          {/* Mặt phẳng radar AESA phụ mở rộng góc quét bán cầu sườn trước */}
          <group position={[0.148, 0.188, sz * 0.338]} rotation={[0, -sz * 1.18, 0]}>
            <group rotation={[0, 0, 0.35]}>
              <AESAPanelUnit w={0.188} h={0.138} armorMat={armorMat} darkArmorMat={darkArmorMat} steelMat={steelMat} compact />
            </group>
          </group>
        </group>
      ))}

      {/* Khối mặt phẳng Radar Mảng Pha Chủ Động AESA bát giác chính nghiêng 25° hướng +X */}
      <group position={[0.374, 0.216, 0]} rotation={[0, 0, aesaTilt]}>
        <AESAPanelUnit w={0.505} h={0.318} armorMat={armorMat} darkArmorMat={darkArmorMat} steelMat={steelMat} />
      </group>

      {/* Hộp xử lý tín hiệu cao tần (SPU) phía sau (-X) có 13 cánh tản nhiệt phay & giắc MIL-STD */}
      <group position={[-0.365, 0.175, 0]}>
        <mesh geometry={rbox(0.148, 0.218, 0.474, 0.016)} material={darkArmorMat} castShadow receiveShadow />
        {/* Khung gờ bảo vệ dàn tản nhiệt */}
        <mesh position={[-0.072, 0.098, 0]} geometry={rbox(0.036, 0.014, 0.43, 0.003)} material={steelMat} />
        <mesh position={[-0.072, -0.092, 0]} geometry={rbox(0.036, 0.014, 0.43, 0.003)} material={steelMat} />
        {/* 13 cánh tản nhiệt nhôm phay đứng */}
        {Array.from({ length: 13 }, (_, i) => {
          const zFin = (i - 6) * 0.0315;
          return (
            <group key={`fin_${i}`} position={[-0.088, 0.003, zFin]}>
              <mesh material={darkSteelMat} castShadow>
                <boxGeometry args={[0.046, 0.176, 0.0085]} />
              </mesh>
              <mesh position={[-0.022, 0, 0]} material={steelMat}>
                <boxGeometry args={[0.005, 0.174, 0.009]} />
              </mesh>
            </group>
          );
        })}
        {/* Cụm đầu nối cáp quân sự tròn mạ đồng/thép hai bên hộp xử lý */}
        {([-1, 1] as const).map((sz) => (
          <group key={`plug_${sz}`} position={[0.008, -0.028, sz * 0.244]} rotation={[Math.PI / 2, 0, 0]}>
            <mesh material={steelMat} castShadow>
              <cylinderGeometry args={[0.027, 0.029, 0.034, 16]} />
            </mesh>
            <mesh position={[0, sz * 0.02, 0]} material={brassMat}>
              <cylinderGeometry args={[0.022, 0.022, 0.016, 16]} />
            </mesh>
          </group>
        ))}
        {/* Bảng khắc thông số kỹ thuật */}
        <mesh position={[-0.075, 0.078, 0.155]} material={steelMat}>
          <boxGeometry args={[0.004, 0.032, 0.088]} />
        </mesh>
      </group>

      {/* Tuyến ống cáp bọc thép đan kim loại + đai kẹp thép + đầu cút đồng */}
      <mesh geometry={rightArmoredCable} material={conduitMat} castShadow />
      <mesh geometry={leftArmoredCable} material={conduitMat} castShadow />
      {[
        [-0.16, 0.106, 0.36],
        [0.08, 0.118, 0.36],
        [-0.24, 0.296, -0.336],
      ].map(([cx, cy, cz], idx) => (
        <group key={`clamp_${idx}`} position={[cx, cy, cz]}>
          <mesh rotation={[0, Math.PI / 2, 0]} material={darkSteelMat} castShadow>
            <cylinderGeometry args={[0.024, 0.024, 0.024, 16]} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, 0]} material={steelMat}>
            <cylinderGeometry args={[0.0255, 0.0255, 0.008, 16]} />
          </mesh>
        </group>
      ))}
      {/* Hộp đấu nối cổ góp điện bên trái và hộp tiếp sóng AESA bên phải có đầu nối đồng */}
      <mesh position={[-0.075, 0.368, -0.196]} geometry={rbox(0.078, 0.05, 0.07, 0.008)} material={darkArmorMat} castShadow />
      <mesh position={[-0.112, 0.368, -0.228]} rotation={[0.3, 0.6, Math.PI / 2]} material={brassMat}>
        <cylinderGeometry args={[0.021, 0.021, 0.018, 14]} />
      </mesh>
      <mesh position={[0.304, 0.186, 0.242]} geometry={rbox(0.068, 0.058, 0.06, 0.008)} material={darkArmorMat} castShadow />
      <mesh position={[0.28, 0.172, 0.278]} rotation={[0.2, -0.5, Math.PI / 2]} material={brassMat}>
        <cylinderGeometry args={[0.022, 0.022, 0.018, 14]} />
      </mesh>

      {/* Vành đai giáp vát côn bảo vệ ổ xoay phương vị trên mặt boong */}
      <mesh position={[-0.045, 0.364, 0]} material={armorMat} castShadow receiveShadow>
        <cylinderGeometry args={[0.232, 0.258, 0.044, 36]} />
      </mesh>
      <mesh position={[-0.045, 0.388, 0]} material={steelMat}>
        <cylinderGeometry args={[0.192, 0.196, 0.01, 36]} />
      </mesh>

      <Rivets points={baseRivets} r={0.007} color={THEME.steelRaw} />

      {/* ==================== 2. THÁP PHÓNG ĐÁNH CHẶN 2 TRỤC GIMBAL TỐC ĐỘ CAO ==================== */}
      <group position={[-0.045, 0.392, 0]} rotation={[0, yaw, 0]}>
        {/* Mâm xoay phương vị & dầm ngang chữ U */}
        <mesh position={[0, 0.018, 0]} material={darkArmorMat} castShadow receiveShadow>
          <cylinderGeometry args={[0.184, 0.192, 0.036, 36]} />
        </mesh>
        <mesh position={[0, 0.036, 0]} geometry={rbox(0.218, 0.036, 0.462, 0.01)} material={armorMat} castShadow receiveShadow />

        {/* Mô-tơ dẫn động phương vị tốc độ cao bên trái mâm xoay */}
        <group position={[-0.096, 0.064, -0.145]}>
          <mesh material={darkSteelMat} castShadow>
            <cylinderGeometry args={[0.045, 0.047, 0.084, 20]} />
          </mesh>
          <mesh position={[0, 0.045, 0]} material={steelMat}>
            <cylinderGeometry args={[0.035, 0.043, 0.012, 16]} />
          </mesh>
        </group>

        {/* Hai nhánh càng chữ U nâng tầm (U-Yoke) có hốc gân cơ khí & nắp ổ trục trunnion */}
        {([-1, 1] as const).map((sz) => (
          <group key={`yoke_${sz}`}>
            <mesh position={[0, 0, sz * 0.206]} geometry={yokeArmGeo} material={armorMat} castShadow receiveShadow />
            {/* Hốc giảm trọng lượng mặt ngoài càng gimbal */}
            <mesh position={[0, 0.108, sz * 0.232]} geometry={rbox(0.11, 0.082, 0.006, 0.003)} material={darkArmorMat} />
            {/* Nắp ổ bi trunnion & vòng bu lông thép sáng */}
            <mesh position={[0, 0.205, sz * 0.24]} rotation={[Math.PI / 2, 0, 0]} material={darkSteelMat} castShadow>
              <cylinderGeometry args={[0.058, 0.062, 0.034, 24]} />
            </mesh>
            <mesh position={[0, 0.205, sz * 0.258]} rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
              <cylinderGeometry args={[0.032, 0.036, 0.012, 16]} />
            </mesh>
          </group>
        ))}

        {/* Bầu mô-tơ servo trực tiếp trục nâng tầm bên phải (+Z) có cánh tản nhiệt */}
        <group position={[0, 0.205, 0.276]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={darkArmorMat} castShadow>
            <cylinderGeometry args={[0.052, 0.052, 0.05, 22]} />
          </mesh>
          {[-0.015, 0, 0.015].map((zo) => (
            <mesh key={zo} position={[0, 0, zo]} rotation={[Math.PI / 2, 0, 0]} material={steelMat}>
              <cylinderGeometry args={[0.056, 0.056, 0.0045, 22]} />
            </mesh>
          ))}
        </group>

        {/* Cáp bọc thép mềm nối lên cụm nâng tầm */}
        <mesh geometry={gimbalCable} material={conduitMat} castShadow />

        {/* Cụm Nâng Tầm (Pitch Cradle): Trục ngang + Cảm biến Quang-Điện Tử + 2 Ống Phóng Song Song */}
        <group position={[0, 0.205, 0]} rotation={[0, 0, pitch]}>
          {/* Trục thép chịu lực xuyên tâm */}
          <mesh rotation={[Math.PI / 2, 0, 0]} material={steelMat} castShadow>
            <cylinderGeometry args={[0.027, 0.027, 0.455, 20]} />
          </mesh>
          {/* Khung giá đỡ trung tâm nối cứng hai ống phóng */}
          <mesh position={[0.012, 0, 0]} geometry={rbox(0.25, 0.09, 0.148, 0.014)} material={darkArmorMat} castShadow receiveShadow />

          {/* Cảm biến quang-điện tử / hồng ngoại đồng trục ở giữa có mặt kính phản quang xanh */}
          <group position={[0.044, 0.09, 0]}>
            <mesh geometry={rbox(0.238, 0.096, 0.122, 0.014)} material={armorMat} castShadow receiveShadow />
            {/* Mái vòm che nắng / mảnh văng */}
            <mesh position={[0.118, 0.04, 0]} geometry={rbox(0.058, 0.016, 0.12, 0.004)} material={darkArmorMat} castShadow />
            <mesh position={[0.118, 0, 0.056]} geometry={rbox(0.054, 0.088, 0.012, 0.003)} material={darkArmorMat} />
            <mesh position={[0.118, 0, -0.056]} geometry={rbox(0.054, 0.088, 0.012, 0.003)} material={darkArmorMat} />

            {/* Mặt bích quang học trước phay kim loại (+X) */}
            <mesh position={[0.116, 0, 0]} geometry={rbox(0.014, 0.084, 0.106, 0.006)} material={darkSteelMat} />

            {/* Ống kính quang-nhiệt chính phản quang xanh lam-ngọc sâu */}
            <group position={[0.123, 0.006, -0.016]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={steelMat}>
                <cylinderGeometry args={[0.03, 0.032, 0.014, 24]} />
              </mesh>
              <mesh position={[0.005, 0, 0]} rotation={[0, 0, Math.PI / 2]} material={plain('#0c131b', 0.35, 0.65)}>
                <cylinderGeometry args={[0.0255, 0.0255, 0.009, 24]} />
              </mesh>
              <mesh
                position={[0.007, 0, 0]}
                scale={[0.4, 1, 1]}
                material={plain('#0d5987', 0.05, 0.9, {
                  emissive: new THREE.Color('#00a8e0'),
                  emissiveIntensity: 0.55,
                })}
              >
                <sphereGeometry args={[0.024, 22, 16]} />
              </mesh>
            </group>

            {/* Thấu kính đo xa laser đồng trục bên cạnh */}
            <group position={[0.123, -0.014, 0.029]}>
              <mesh rotation={[0, 0, Math.PI / 2]} material={steelMat}>
                <cylinderGeometry args={[0.0155, 0.0165, 0.014, 18]} />
              </mesh>
              <mesh
                position={[0.006, 0, 0]}
                scale={[0.38, 1, 1]}
                material={plain('#0a6a73', 0.06, 0.88, {
                  emissive: new THREE.Color(THEME.apsCyan),
                  emissiveIntensity: 0.52,
                })}
              >
                <sphereGeometry args={[0.0125, 16, 12]} />
              </mesh>
            </group>

            {/* Đèn báo khóa mục tiêu quang học + ăng-ten lập trình ngòi nổ trên nóc cảm biến */}
            <mesh position={[0.124, 0.026, 0.035]}>
              <sphereGeometry args={[0.0045, 10, 8]} />
              <meshBasicMaterial color={THEME.apsCyan} toneMapped={false} />
            </mesh>
            <mesh position={[-0.055, 0.054, 0]} geometry={rbox(0.058, 0.012, 0.058, 0.003)} material={darkSteelMat} castShadow />
            <mesh position={[-0.085, 0.065, 0]} material={steelMat} castShadow>
              <cylinderGeometry args={[0.0055, 0.0085, 0.034, 10]} />
            </mesh>
          </group>

          {/* Ống phóng trái (-Z): đạn dự phòng số 2 (nắp chắn nổ đóng kín) */}
          <InterceptorTube
            zOffset={-0.133}
            openProgress={0}
            armorMat={armorMat}
            darkArmorMat={darkArmorMat}
            steelMat={steelMat}
            darkSteelMat={darkSteelMat}
          />

          {/* Ống phóng phải (+Z): ống khai hỏa số 1 (nắp chắn nổ mở bung khi fireProgress > 0) */}
          <InterceptorTube
            zOffset={0.133}
            openProgress={fireProgress}
            armorMat={armorMat}
            darkArmorMat={darkArmorMat}
            steelMat={steelMat}
            darkSteelMat={darkSteelMat}
          />

          {/* ==================== 3. ĐẠN ĐÁNH CHẶN PHÂN MẢNH LAO RA KHỎI NÒNG ==================== */}
          <HardKillInterceptorShot fireProgress={fireProgress} zOffset={0.133} />
        </group>
      </group>

      {/* ==================== 4. VÒM SÓNG RADAR QUÉT 360° ==================== */}
      {scanPhase !== undefined && scanPhase > 0 && (
        <RadarDome360 scanPhase={scanPhase} scanRadius={scanRadius} alertAngle={alertAngle} />
      )}
    </group>
  );
};

const APSPreview: React.FC = () => (
  <APSRadarPod yaw={0.4} pitch={0.38} fireProgress={0.12} scanPhase={0} />
);

export const preview = turntable(APSPreview, { size: 1.55, center: [0, 0.38, 0] });
export default APSRadarPod;
