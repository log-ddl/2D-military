// C01S06 (68.56–92.48 s) — 2 nhịp liền mạch cắt tại CUE.c01_s06_bridge_cut (80.92 s):
// • Nhịp 1 (t < 80.92 s): Góc cao tele 35° nhìn xuống biển bão sóng 30 ft, chiếc Nitto Maru tý hon ẩn hiện giữa
//   hàng chục vệt đạn 6-inch (<Trail> xiên ~82° ngang khung) & rừng cột nước sủi bọt trắng xóa; bật <Label text="938 ROUNDS" />;
//   đúng 79.26 s ("blow ... apart"), loạt đạn trúng thẳng giữa thân xé đôi con tàu trong cầu lửa <Explosion>.
// • Nhịp 2 (t >= 80.92 s): Cắt vào nội cảnh thép xám Phòng thu vô tuyến / Đài chỉ huy Flag Bridge trên USS Hornet:
//   tiền cảnh trái là tủ máy thu Hải quân đồng hồ xanh lục + đèn cảnh báo đỏ chớp sáng lúc 85.04 s ("Tokyo got the message")
//   cùng sĩ quan nghe lén gỡ tai nghe quay mặt báo cáo; bên phải cạnh kính chắn bão mưa tạt là Phó Đô đốc William "Bull" Halsey
//   (góc nghiêng 3/4 rõ nét mũ Đô đốc thêu vàng, ống nhòm ngực, hai tay chống thanh đồng) nhìn xuống 16 chiếc B-25B trên sàn tàu.
import React, { useMemo } from 'react';
import { AbsoluteFill } from 'remotion';
import * as THREE from 'three';
import { useT, prog, lerp, rnd } from '@core/time';
import { Stage, Cam, type V3 } from '@skill/military/3d/stage';
import { Label } from '@skill/military/label';
import { lathe, pipe, rbox } from '@skill/military/3d/geom';
import { paint, plain } from '@skill/military/3d/materials';
import { Explosion, Trail, ballisticPoints, softDot } from '@skill/military/3d/fx';
import { CUE } from '../cues';
import { PAINT, STAGE_PRESETS } from '../design/palette';
import { NittoMaru } from '../parts/NittoMaru';
import { USSHornet, HORNET_DECK_Y } from '../parts/USSHornet';
import { B25Mitchell } from '../parts/B25Mitchell';
import { OceanSurface, shipPose, waveY } from '../parts/OceanSurface';

const SWELL_NITTO = 4.35;
const SWELL_HORNET = 4.2;

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Biến đổi tọa độ local của tàu sang world space khớp tuyệt đối với <group position={[sx, pose.y, sz]} rotation={[pose.roll, heading, pose.pitch]}> */
function shipToWorld(
  local: V3,
  pose: { y: number; pitch: number; roll: number },
  shipX = 0,
  shipZ = 0,
  heading = 0,
): V3 {
  const v = new THREE.Vector3(local[0], local[1], local[2]);
  v.applyEuler(new THREE.Euler(pose.roll, heading, pose.pitch, 'XYZ'));
  return [v.x + shipX, v.y + pose.y, v.z + shipZ];
}

// Công thức chuẩn của C01.md xếp 16 chiếc B-25B trên sàn đáp USS Hornet (y = HORNET_DECK_Y = 18.3 m)
const HORNET_B25_LAYOUT: { pos: V3; yaw: number; seed: number }[] = [
  { pos: [16.0, HORNET_DECK_Y, -1.1], yaw: 0, seed: 18 },
  ...Array.from({ length: 15 }, (_, idx) => {
    const k = idx + 1;
    return {
      pos: [1.0 - (k - 1) * 8.5, HORNET_DECK_Y, k % 2 === 1 ? -6.2 : 5.8] as V3,
      yaw: k % 2 === 1 ? 0.14 : -0.14,
      seed: 18,
    };
  }),
];

type SalvoShell = {
  at: number;
  flight: number;
  from: V3;
  to: V3;
  apex: number;
  height: number;
  hit?: boolean;
  seed: number;
};

// 38 phát đạn 6-inch nối đuôi nhau đại diện cho 938 viên đạn của tuần dương hạm USS Nashville:
// Xuất phát từ mạn trên-trái [-124..-98, 56..72, +88..+118] lao chéo xuống quanh Nitto Maru [0, 0, 0],
// vuông góc ~84° với hướng nhìn của Cam [+46, +29, +52] để mọi khung hình đều có 3–6 vệt cầu vồng <Trail> rõ nét!
const BARRAGE_SHELLS: SalvoShell[] = [
  ...Array.from({ length: 36 }, (_, i): SalvoShell => {
    const at = 67.55 + i * 0.33;
    const ringR = 5.5 + rnd(i * 7 + 1) * 16.5;
    // Chừa khe thoáng nhỏ ngay trước mũi số "23" để luôn đọc rõ con tàu giữa rừng cột nước
    const rawAng = i * 2.24 + rnd(i * 11 + 3) * 0.55;
    const tx = Math.cos(rawAng) * ringR * 1.25;
    const tz = Math.sin(rawAng) * ringR * 0.92;
    return {
      at,
      flight: 0.96,
      from: [
        -118 + (rnd(i * 5 + 2) - 0.5) * 18,
        58 + rnd(i * 5 + 3) * 13,
        102 + (rnd(i * 5 + 4) - 0.5) * 24,
      ],
      to: [tx, 0.2, tz],
      apex: 13 + rnd(i * 13 + 7) * 5,
      height: 15.5 + rnd(i * 17 + 9) * 7.0,
      seed: 100 + i,
    };
  }),
  // Loạt 3 viên đạn 6-inch trúng trực diện giữa thân ĐÚNG CUE.c01_s06_blow_apart (79.26 s) xé đôi Nitto Maru!
  { at: CUE.c01_s06_blow_apart, flight: 0.88, from: [-115, 63, 101], to: [1.6, 2.4, 0.0], apex: 14, height: 15, hit: true, seed: 202 },
  { at: CUE.c01_s06_blow_apart + 0.14, flight: 0.88, from: [-109, 60, 106], to: [-3.9, 2.8, 0.7], apex: 13, height: 13, hit: true, seed: 203 },
  { at: CUE.c01_s06_blow_apart + 0.28, flight: 0.88, from: [-118, 65, 97], to: [5.9, 2.5, -0.5], apex: 15, height: 12, hit: true, seed: 204 },
];

const FoamSprite: React.FC<{ pos: V3; size: number; color: string; opacity: number; rot?: number }> = ({
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
  mat.color.set(color);
  mat.opacity = opacity;
  mat.rotation = rot;
  if (opacity <= 0.004 || size <= 0.02) return null;
  return <sprite material={mat} position={pos} scale={[size, size, size]} />;
};

/** Một phát đạn 6-inch hoàn chỉnh: vệt bay cầu vồng <Trail> + cột nước bọt sương cuộn trào 100% hữu cơ */
const BarrageRoundView: React.FC<{
  t: number;
  shell: SalvoShell;
}> = ({ t, shell }) => {
  const pts = useMemo(
    () => ballisticPoints(shell.from, shell.to, shell.apex, 36),
    [shell.from, shell.to, shell.apex],
  );

  const tLaunch = shell.at - shell.flight;
  const dtImpact = t - shell.at;
  const life = 2.55;

  if (t < tLaunch || dtImpact > life) return null;

  const flightProg = clamp((t - tLaunch) / shell.flight, 0, 1);
  const trailFade = dtImpact > 0 ? clamp(1 - dtImpact / 0.45, 0, 1) : 1;

  const wy = waveY(shell.to[0], shell.to[2], t, SWELL_NITTO);
  const rise = dtImpact > 0 ? clamp(1 - Math.pow(1 - Math.min(1, dtImpact / 0.44), 3), 0, 1) : 0;
  const fall = dtImpact > 0.95 ? Math.pow((dtImpact - 0.95) / (life - 0.95), 1.55) : 0;
  const curH = Math.max(0.4, shell.height * rise * (1 - fall * 0.52));
  const fade = dtImpact > 0 ? clamp(1 - Math.pow(dtImpact / life, 1.9), 0, 1) : 0;
  const flash = dtImpact > 0 ? clamp(1 - dtImpact / 0.2, 0, 1) : 0;

  return (
    <group>
      {trailFade > 0.01 && (
        <Trail
          points={pts}
          upto={flightProg}
          color={shell.hit ? '#ffe494' : '#ffc266'}
          width={shell.hit ? 0.18 : 0.14}
          opacity={(shell.hit ? 0.96 : 0.88) * trailFade}
          glow
        />
      )}

      {dtImpact >= 0 && shell.height > 0 && (
        <group position={[shell.to[0], wy - 0.4, shell.to[2]]}>
          {flash > 0 && (
            <mesh position={[0, 1.2, 0]} scale={[2.0, 1.4, 2.0]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshBasicMaterial
                color={shell.hit ? '#ffd078' : '#f4fbff'}
                transparent
                opacity={flash * 0.85}
                toneMapped={false}
              />
            </mesh>
          )}
          {/* 20 cụm bọt sương xếp dọc cột nước cuộn trào hữu cơ (không dùng nón đặc bên trong để 100% tự nhiên như bọt biển) */}
          {Array.from({ length: 20 }, (_, i) => {
            const frac = i / 19;
            const ang = i * 2.39996 + shell.seed;
            const rad = (0.24 + Math.pow(frac, 1.65) * 2.05) * (0.65 + dtImpact * 0.32);
            return (
              <FoamSprite
                key={i}
                pos={[Math.cos(ang) * rad, curH * (0.06 + frac * 0.95), Math.sin(ang) * rad]}
                size={(2.7 + (1 - Math.abs(frac - 0.5)) * 2.35 + frac * 1.85 + dtImpact * 0.88) * (0.8 + rnd(shell.seed + i) * 0.38)}
                color={frac > 0.52 ? '#f4fbff' : '#d3e5f1'}
                opacity={(0.88 - frac * 0.2) * fade}
                rot={i * 1.1 + dtImpact * 0.35}
              />
            );
          })}
          {/* Vòng bọt sóng trắng xóa tỏa quanh chân cột nước */}
          {Array.from({ length: 8 }, (_, b) => {
            const ang = (b / 8) * Math.PI * 2 + shell.seed;
            const rad = 1.2 + Math.min(1, dtImpact / 1.35) * 4.5;
            return (
              <FoamSprite
                key={`r${b}`}
                pos={[Math.cos(ang) * rad, 0.75, Math.sin(ang) * rad]}
                size={3.0 + dtImpact * 1.15}
                color="#dfeef7"
                opacity={0.76 * fade}
                rot={b}
              />
            );
          })}
        </group>
      )}
    </group>
  );
};

/**
 * Nội cảnh Phòng thu tin vô tuyến & Đài chỉ huy Flag Bridge trên USS Hornet (Nhịp 2: t >= 80.92 s)
 * - Không dùng tấm kính phản xạ gương gây đốm sáng giả trên bầu trời; dùng khung đố thép, đĩa quay gạt mưa Kent Clear-View
 *   và vệt mưa thật nên đội hình 16 chiếc B-25B trên sàn đáp hiện lên sắc nét tuyệt đối!
 * - Sĩ quan nghe lén (trái) gỡ tai nghe và xoay người hướng mặt 3/4 về phía Đô đốc Halsey & ống kính báo cáo.
 * - Phó Đô đốc William "Bull" Halsey (phải) đứng nghiêng 3/4 rõ nét khuôn mặt, mũ Đô đốc thêu vàng, ống nhòm ngực, hai tay nắm thanh đồng.
 */
const HornetFlagBridgeInterior: React.FC<{ t: number }> = ({ t }) => {
  const mats = useMemo(
    () => ({
      bulkheadSteel: paint({
        color: PAINT.navySuper,
        camo: [PAINT.navyHull, '#6b8096'],
        camoScale: 1.6,
        wear: 0.18,
        dirt: 0.18,
        roughness: 0.58,
        metalness: 0.34,
        repeat: 0.45,
        seed: 42,
      }),
      coamingDark: paint({
        color: PAINT.navyHull,
        wear: 0.22,
        dirt: 0.24,
        roughness: 0.64,
        metalness: 0.36,
        repeat: 0.5,
        seed: 44,
      }),
      deckRubber: plain('#222931', 0.86, 0.1),
      radioRack: paint({
        color: '#25303a',
        wear: 0.2,
        dirt: 0.18,
        roughness: 0.54,
        metalness: 0.45,
        repeat: 0.8,
        seed: 47,
      }),
      panelFace: plain('#192129', 0.46, 0.52),
      chromeSteel: plain('#9aa8b5', 0.3, 0.78),
      brass: plain('#cfa246', 0.3, 0.84),
      goldBraid: plain('#ebb93e', 0.34, 0.76, {
        emissive: new THREE.Color('#6e4e0c'),
        emissiveIntensity: 0.28,
      }),
      greenScope: plain('#4df596', 0.2, 0.0, {
        emissive: new THREE.Color('#1fd96c'),
        emissiveIntensity: 1.45,
      }),
      greenDial: plain('#9ef7c6', 0.25, 0.0, {
        emissive: new THREE.Color('#2ec46a'),
        emissiveIntensity: 0.95,
      }),
      amberMeter: plain('#ffdca0', 0.28, 0.0, {
        emissive: new THREE.Color('#d98d26'),
        emissiveIntensity: 0.75,
      }),
      msgPaper: plain('#f2e194', 0.78, 0.02, {
        emissive: new THREE.Color('#6b591e'),
        emissiveIntensity: 0.2,
      }),
      chartBlue: plain('#24435e', 0.72, 0.05),
      chartLand: plain('#cbb993', 0.76, 0.03),
      halseyCoat: paint({
        color: '#1d2938',
        camo: ['#16202c', '#28374a'],
        wear: 0.14,
        dirt: 0.12,
        roughness: 0.78,
        metalness: 0.08,
        repeat: 0.9,
        seed: 61,
      }),
      khakiUniform: paint({
        color: '#b49a6e',
        camo: ['#a1875d', '#c4ab7f'],
        wear: 0.14,
        dirt: 0.14,
        roughness: 0.8,
        metalness: 0.04,
        repeat: 0.9,
        seed: 63,
      }),
      darkTrousers: plain('#18202b', 0.82, 0.06),
      visorBlack: plain('#12151a', 0.24, 0.32),
      skinTone: plain('#d6a27e', 0.64, 0.04),
      eyeDark: plain('#1e2229', 0.4, 0.1),
      hairGrey: plain('#9ba2a8', 0.78, 0.05),
      hairBrown: plain('#3b2c22', 0.8, 0.04),
      rainStreak: new THREE.MeshBasicMaterial({
        color: '#d4e8f7',
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      }),
    }),
    [],
  );

  // Dây tai nghe nối từ giắc cắm tủ máy thu tới ghế sĩ quan nghe lén
  const cordGeo = useMemo(
    () =>
      pipe(
        [
          [42.02, 24.4, 10.42],
          [42.1, 24.16, 10.22],
          [42.22, 24.34, 10.02],
        ],
        0.011,
        12,
      ),
    [],
  );

  const capCrownGeo = useMemo(() => {
    const g = lathe(
      [
        [0.108, 0.0],
        [0.112, 0.032],
        [0.144, 0.072],
        [0.136, 0.09],
        [0.05, 0.098],
        [0.0, 0.1],
      ],
      20,
    );
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);

  // Thân áo khoác Đô đốc vát vai tự nhiên bằng lathe xoay quanh trục Y
  const coatTorsoGeo = useMemo(() => {
    const g = lathe(
      [
        [0.165, 0.0],
        [0.178, 0.18],
        [0.205, 0.42],
        [0.225, 0.56],
        [0.11, 0.63],
      ],
      18,
    );
    g.rotateZ(Math.PI / 2);
    g.scale(1.08, 1, 0.68);
    return g;
  }, []);

  const officerTorsoGeo = useMemo(() => {
    const g = lathe(
      [
        [0.145, 0.0],
        [0.155, 0.18],
        [0.182, 0.4],
        [0.095, 0.48],
      ],
      16,
    );
    g.rotateZ(Math.PI / 2);
    g.scale(1.06, 1, 0.66);
    return g;
  }, []);

  // Diễn xuất Sĩ quan nghe lén: gỡ tai nghe lúc 82.46 s -> xoay mặt 3/4 về phía Đô đốc Halsey (+X, -Z) báo tin dữ!
  const pRemovePhone = prog(t, CUE.c01_s06_interceptors - 0.15, CUE.c01_s06_interceptors + 1.3);
  const pTurnReport = prog(t, CUE.c01_s06_interceptors + 0.3, CUE.c01_s06_tokyo_msg + 0.15);

  // Đèn báo động đỏ chớp sáng khẩn cấp tại CUE.c01_s06_tokyo_msg = 85.04 s ("Tokyo got the message")
  const alertTriggered = t >= CUE.c01_s06_tokyo_msg;
  const redPulse = alertTriggered
    ? 0.35 + 0.65 * Math.pow(0.5 + 0.5 * Math.sin((t - CUE.c01_s06_tokyo_msg) * Math.PI * 2 * 3.1), 1.3)
    : 0;

  // Diễn xuất Phó Đô đốc William "Bull" Halsey: đứng nghiêng 3/4 nhìn ra sàn tàu, khẽ ngoái nghe báo cáo lúc 85.04 s rồi cúi trầm ngâm lúc 89.72 s
  const halseyAck =
    prog(t, CUE.c01_s06_tokyo_msg - 0.1, CUE.c01_s06_tokyo_msg + 0.8) *
    (1 - prog(t, CUE.c01_s06_hornet_bridge + 0.1, CUE.c01_s06_halsey));
  const halseyHeavyNod = prog(t, CUE.c01_s06_halsey, CUE.c01_s06_brutal_choice + 0.5);

  const glassRainDrops = useMemo(
    () =>
      Array.from({ length: 38 }, (_, i) => ({
        xBase: 39.35 + rnd(i * 5 + 1) * 7.1,
        yOff: rnd(i * 5 + 2),
        spd: 0.8 + rnd(i * 5 + 3) * 0.65,
        len: 0.15 + rnd(i * 5 + 4) * 0.17,
      })),
    [],
  );

  return (
    <group>
      {/* ==================== 1. KẾT CẤU THÉP ĐÀI CHỈ HUY FLAG BRIDGE (SÀN SẠCH 100%, KHÔNG ĐỐM PHẢN XẠ KÍNH) ==================== */}
      {/* Sàn thép bọc thảm cao su chống trượt (y = 23.38 m) & dầm đỡ đặt sâu bên dưới sàn (y = 22.85 m, không xuyên sàn!) */}
      <mesh position={[43.3, 23.35, 9.6]} geometry={rbox(8.4, 0.08, 2.92, 0.01)} material={mats.deckRubber} receiveShadow />
      {[40.0, 42.2, 44.4, 46.6].map((bx) => (
        <mesh
          key={`br${bx}`}
          position={[bx, 22.92, 9.65]}
          geometry={rbox(0.24, 0.72, 2.75, 0.02)}
          material={mats.bulkheadSteel}
        />
      ))}

      {/* Vách thép bên trong giáp thân Đảo chỉ huy (z = 11.00 m — bên trái khung hình) */}
      <mesh position={[43.3, 24.82, 11.0]} geometry={rbox(8.4, 2.88, 0.08, 0.01)} material={mats.bulkheadSteel} receiveShadow />
      {[40.1, 41.3, 43.3, 44.9, 46.6].map((rx) => (
        <mesh key={`rib${rx}`} position={[rx, 24.82, 10.94]} geometry={rbox(0.085, 2.84, 0.08, 0.01)} material={mats.coamingDark} />
      ))}
      <mesh position={[43.3, 25.86, 10.93]} geometry={rbox(8.2, 0.048, 0.048, 0.01)} material={mats.chromeSteel} />
      {/* Bảng hải đồ khu vực Bắc Thái Bình Dương trên vách thép phía sau tủ điện đài */}
      <group position={[40.45, 25.02, 10.94]}>
        <mesh geometry={rbox(1.06, 0.76, 0.03, 0.005)} material={mats.coamingDark} />
        <mesh position={[0, 0, -0.014]} geometry={rbox(0.96, 0.66, 0.015, 0.002)} material={mats.chartBlue} />
        <mesh position={[-0.24, 0.08, -0.024]} rotation={[0, 0, 0.38]} geometry={rbox(0.32, 0.15, 0.01, 0.002)} material={mats.chartLand} />
        <mesh position={[0.22, -0.06, -0.024]} geometry={rbox(0.055, 0.055, 0.012, 0.002)} material={mats.goldBraid} />
      </group>

      {/* Trần thép Đài chỉ huy + dầm ngang (castShadow = false để khoang luôn sáng rõ có chiều sâu) */}
      <mesh position={[43.3, 26.24, 9.6]} geometry={rbox(8.45, 0.07, 2.96, 0.01)} material={mats.coamingDark} />
      {[40.4, 42.4, 44.4, 46.4].map((cx) => (
        <mesh key={`cb${cx}`} position={[cx, 26.15, 9.6]} geometry={rbox(0.14, 0.12, 2.86, 0.01)} material={mats.bulkheadSteel} />
      ))}

      {/* Bệ giáp chắn mảnh đạn tầm gối (y = 23.38..24.05 m) & thanh tì tay bằng đồng đánh bóng (y = 24.42 m, z = 8.36 m) */}
      <mesh position={[43.3, 23.71, 8.2]} geometry={rbox(8.36, 0.66, 0.1, 0.015)} material={mats.coamingDark} receiveShadow />
      <mesh position={[39.18, 23.71, 9.6]} geometry={rbox(0.1, 0.66, 2.86, 0.015)} material={mats.coamingDark} receiveShadow />
      <mesh position={[43.3, 24.05, 8.22]} geometry={rbox(8.38, 0.06, 0.16, 0.01)} material={mats.bulkheadSteel} />
      <mesh position={[39.2, 24.05, 9.6]} geometry={rbox(0.16, 0.06, 2.86, 0.01)} material={mats.bulkheadSteel} />

      <mesh position={[43.1, 24.42, 8.36]} rotation={[0, 0, Math.PI / 2]} material={mats.brass}>
        <cylinderGeometry args={[0.026, 0.026, 7.6, 12]} />
      </mesh>
      {[39.6, 41.5, 44.05, 45.8].map((sx) => (
        <mesh key={`st${sx}`} position={[sx, 24.23, 8.31]} rotation={[0.35, 0, 0]} geometry={rbox(0.035, 0.38, 0.035, 0.005)} material={mats.brass} />
      ))}

      {/* Khung cửa kính chắn bão toàn cảnh mở tầm nhìn trong vắt 100% ra 16 chiếc B-25B trên sàn đáp */}
      <mesh position={[43.3, 26.05, 8.18]} geometry={rbox(8.42, 0.34, 0.14, 0.01)} material={mats.bulkheadSteel} />
      <mesh position={[39.18, 26.05, 9.6]} geometry={rbox(0.14, 0.34, 2.88, 0.01)} material={mats.bulkheadSteel} />
      {[39.2, 44.05, 45.7, 47.2].map((mx) => (
        <mesh key={`wm${mx}`} position={[mx, 24.98, 8.19]} geometry={rbox(0.085, 1.88, 0.1, 0.01)} material={mats.coamingDark} />
      ))}
      <mesh position={[39.18, 24.98, 10.18]} geometry={rbox(0.1, 1.88, 0.085, 0.01)} material={mats.coamingDark} />
      <mesh position={[39.18, 24.8, 10.6]} geometry={rbox(0.09, 2.2, 0.78, 0.01)} material={mats.bulkheadSteel} />

      {/* Đĩa quay gạt mưa ly tâm Kent Clear-View Screen (thép xám sẫm không chói Bloom) & các vệt mưa trượt chéo */}
      <group position={[43.32, 25.44, 8.19]}>
        <mesh material={mats.coamingDark}>
          <torusGeometry args={[0.17, 0.012, 8, 24]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.coamingDark}>
          <cylinderGeometry args={[0.024, 0.024, 0.036, 12]} />
        </mesh>
        <mesh position={[0.095, 0.072, 0]} rotation={[0, 0, 0.6]} geometry={rbox(0.19, 0.012, 0.014, 0.002)} material={mats.coamingDark} />
      </group>
      {glassRainDrops.map((dr, idx) => {
        const cyc = (dr.yOff + (t - 80.0) * dr.spd) % 1;
        const ry = 25.82 - cyc * 1.65;
        const rx = dr.xBase - cyc * 0.35;
        return (
          <mesh
            key={`gr${idx}`}
            position={[rx, ry, 8.18]}
            rotation={[0, 0, -0.24]}
            geometry={rbox(0.008, dr.len, 0.008, 0.001)}
            material={mats.rainStreak}
          />
        );
      })}

      {/* Hệ chiếu sáng nội thất 3 điểm êm dịu (tôn khối gương mặt Halsey & Sĩ quan vô tuyến, không gây lóa kính) */}
      <pointLight position={[42.6, 25.35, 8.48]} color="#c4dbf2" intensity={19} distance={10.5} decay={1.4} />
      <pointLight position={[44.2, 25.92, 9.95]} color="#ffe5bd" intensity={15} distance={9.5} decay={1.45} />
      <pointLight position={[42.1, 24.95, 10.32]} color="#4eff9d" intensity={3.4} distance={3.0} decay={1.6} />

      {/* ==================== 2. TỦ MÁY THU VÔ TUYẾN HẢI QUÂN MỸ + ĐỒNG HỒ XANH LỤC + ĐÈN ĐỎ CHỚP SÁNG ==================== */}
      {/* Đặt tại x = 42.22 m để trọn bộ tủ máy, đèn cảnh báo đỏ & sĩ quan nghe lén luôn nằm gọn tiền cảnh trái suốt cả nhịp 2! */}
      <group position={[42.22, 23.38, 10.68]}>
        <mesh position={[0, 0.98, 0.04]} geometry={rbox(1.44, 1.94, 0.48, 0.02)} material={mats.radioRack} />
        <mesh position={[0, 0.76, -0.34]} geometry={rbox(1.48, 0.055, 0.44, 0.01)} material={mats.bulkheadSteel} />
        {[1.04, 1.42, 1.76].map((py, idx) => (
          <mesh key={`pf${idx}`} position={[0, py, -0.195]} geometry={rbox(1.32, 0.31, 0.03, 0.005)} material={mats.panelFace} />
        ))}

        {/* Màn hình dao động ký CRT tròn xanh lục & 2 đồng hồ dò tần số phát sáng xanh lục sắc nét */}
        <group position={[-0.36, 1.42, -0.212]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.chromeSteel}>
            <cylinderGeometry args={[0.108, 0.108, 0.022, 20]} />
          </mesh>
          <mesh position={[0, 0, -0.008]} rotation={[Math.PI / 2, 0, 0]} material={mats.greenScope}>
            <cylinderGeometry args={[0.09, 0.09, 0.016, 20]} />
          </mesh>
          <mesh
            position={[0, Math.sin(t * 9.5) * 0.016, -0.019]}
            rotation={[0, 0, Math.sin(t * 6.2) * 0.18]}
            geometry={rbox(0.14, 0.011, 0.006, 0.001)}
          >
            <meshBasicMaterial color="#e8fff0" toneMapped={false} />
          </mesh>
        </group>

        {([0.06, 0.42] as const).map((dx, dIdx) => (
          <group key={`dl${dIdx}`} position={[dx, 1.42, -0.212]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} material={mats.chromeSteel}>
              <cylinderGeometry args={[0.09, 0.09, 0.02, 18]} />
            </mesh>
            <mesh position={[0, 0, -0.007]} rotation={[Math.PI / 2, 0, 0]} material={mats.greenDial}>
              <cylinderGeometry args={[0.076, 0.076, 0.015, 18]} />
            </mesh>
            <mesh
              position={[0, -0.01, -0.018]}
              rotation={[0, 0, -0.45 + dIdx * 0.7 + Math.sin(t * 2.3 + dIdx) * 0.08]}
              geometry={rbox(0.01, 0.064, 0.006, 0.001)}
              material={mats.panelFace}
            />
          </group>
        ))}

        {([-0.4, -0.13, 0.13, 0.4] as const).map((mx, mIdx) => (
          <React.Fragment key={`mt${mIdx}`}>
            <mesh position={[mx, 1.76, -0.212]} rotation={[Math.PI / 2, 0, 0]} material={mIdx < 2 ? mats.greenDial : mats.amberMeter}>
              <cylinderGeometry args={[0.052, 0.052, 0.016, 14]} />
            </mesh>
            <mesh position={[mx, 1.04, -0.22]} rotation={[Math.PI / 2, 0, 0]} material={mats.chromeSteel}>
              <cylinderGeometry args={[0.04, 0.044, 0.03, 14]} />
            </mesh>
            <mesh position={[mx + 0.1, 0.98, -0.22]} rotation={[Math.PI / 2, 0, 0]} material={mats.panelFace}>
              <cylinderGeometry args={[0.02, 0.022, 0.026, 10]} />
            </mesh>
          </React.Fragment>
        ))}

        <mesh position={[0.25, 0.795, -0.34]} rotation={[0, 0.16, 0]} geometry={rbox(0.3, 0.012, 0.22, 0.002)} material={mats.msgPaper} />

        {/* ĐÈN BÁO ĐỘNG ĐỎ CHỚP SÁNG TẠI CUE.c01_s06_tokyo_msg = 85.04 s ("Tokyo got the message") */}
        <group position={[0.42, 2.0, -0.12]}>
          <mesh material={mats.chromeSteel}>
            <cylinderGeometry args={[0.08, 0.092, 0.055, 16]} />
          </mesh>
          <mesh position={[0, 0.072, 0]}>
            <cylinderGeometry args={[0.06, 0.066, 0.115, 16]} />
            <meshStandardMaterial
              color={alertTriggered ? '#ff2626' : '#4a1414'}
              emissive={new THREE.Color('#ff1c1c')}
              emissiveIntensity={alertTriggered ? 1.1 + redPulse * 3.1 : 0.08}
              roughness={0.22}
              toneMapped={!alertTriggered}
            />
          </mesh>
          {alertTriggered && (
            <mesh position={[0, 0.075, 0]} scale={0.105 + redPulse * 0.04}>
              <sphereGeometry args={[1, 12, 10]} />
              <meshBasicMaterial color="#ff4b40" transparent opacity={0.24 + redPulse * 0.34} toneMapped={false} />
            </mesh>
          )}
        </group>

        {/* Đèn báo đỏ thứ hai trên mặt máy thu */}
        <mesh position={[0.56, 1.46, -0.218]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.036, 0.036, 0.024, 14]} />
          <meshStandardMaterial
            color={alertTriggered ? '#ff2e2e' : '#421212'}
            emissive={new THREE.Color('#ff1a1a')}
            emissiveIntensity={alertTriggered ? 1.2 + redPulse * 2.8 : 0.05}
            toneMapped={!alertTriggered}
          />
        </mesh>

        {alertTriggered && (
          <pointLight
            position={[0.35, 1.95, -0.32]}
            color="#ff2b2b"
            intensity={11 * redPulse}
            distance={5.5}
            decay={1.5}
          />
        )}
      </group>

      <mesh geometry={cordGeo} material={mats.panelFace} />

      {/* ==================== 3. SĨ QUAN NGHE LÉN VÔ TUYẾN GỠ TAI NGHE & QUAY MẶT 3/4 BÁO CÁO ==================== */}
      {/* Đặt tại x = 42.25, z = 9.98; khi xoay yaw -> +2.26 rad (hướng +X, -Z), mặt ông hướng thẳng về Halsey & ống kính! */}
      <group position={[42.25, 23.38, 9.98]}>
        <mesh position={[0, 0.26, 0]} material={mats.coamingDark}>
          <cylinderGeometry args={[0.045, 0.075, 0.52, 10]} />
        </mesh>
        <mesh position={[0, 0.53, 0]} material={mats.panelFace}>
          <cylinderGeometry args={[0.17, 0.17, 0.05, 14]} />
        </mesh>
        <group rotation={[0, lerp(0.22, 1.92, pTurnReport), 0]}>
          <mesh position={[-0.07, 0.56, 0.14]} rotation={[1.42, 0.12, 0]} geometry={rbox(0.13, 0.36, 0.13, 0.04)} material={mats.khakiUniform} />
          <mesh position={[0.07, 0.56, 0.14]} rotation={[1.4, -0.12, 0]} geometry={rbox(0.13, 0.36, 0.13, 0.04)} material={mats.khakiUniform} />
          <mesh position={[-0.08, 0.27, 0.28]} geometry={rbox(0.115, 0.44, 0.115, 0.03)} material={mats.khakiUniform} />
          <mesh position={[0.08, 0.27, 0.28]} geometry={rbox(0.115, 0.44, 0.115, 0.03)} material={mats.khakiUniform} />
        </group>

        {/* Thân trên vát vai tự nhiên xoay từ bàn máy thu (yaw = 0.22) sang phía Đô đốc Halsey (yaw = 2.26 rad)! */}
        <group position={[0, 0.56, 0]} rotation={[lerp(0.16, 0.02, pRemovePhone), lerp(0.22, 2.26, pTurnReport), 0]}>
          <mesh geometry={officerTorsoGeo} material={mats.khakiUniform} castShadow />
          {/* Cổ áo sơ-mi khaki, cà-vạt đen Hải quân & cầu vai sĩ quan */}
          <mesh position={[0, 0.46, 0.03]} geometry={rbox(0.15, 0.06, 0.13, 0.015)} material={mats.khakiUniform} />
          <mesh position={[0, 0.35, 0.112]} geometry={rbox(0.042, 0.2, 0.015, 0.003)} material={mats.visorBlack} />
          <mesh position={[-0.14, 0.465, 0]} geometry={rbox(0.09, 0.018, 0.055, 0.004)} material={mats.panelFace} />
          <mesh position={[0.14, 0.465, 0]} geometry={rbox(0.09, 0.018, 0.055, 0.004)} material={mats.panelFace} />

          {/* Đầu có mũi, quai hàm, chân mày & tóc sĩ quan rõ nét khi quay mặt 3/4 báo cáo */}
          <group position={[0, 0.61, 0.01]} rotation={[lerp(0.08, -0.06, pTurnReport), lerp(0, 0.14, pTurnReport), 0]}>
            <mesh position={[0, -0.06, 0]} material={mats.skinTone}>
              <cylinderGeometry args={[0.048, 0.055, 0.09, 12]} />
            </mesh>
            <mesh material={mats.skinTone}>
              <sphereGeometry args={[0.102, 16, 14]} />
            </mesh>
            <mesh position={[0, -0.04, 0.035]} geometry={rbox(0.115, 0.072, 0.105, 0.03)} material={mats.skinTone} />
            <mesh position={[0, 0.0, 0.102]} rotation={[-0.22, 0, 0]} geometry={rbox(0.024, 0.042, 0.036, 0.008)} material={mats.skinTone} />
            <mesh position={[-0.036, 0.022, 0.092]} geometry={rbox(0.028, 0.011, 0.015, 0.003)} material={mats.hairBrown} />
            <mesh position={[0.036, 0.022, 0.092]} geometry={rbox(0.028, 0.011, 0.015, 0.003)} material={mats.hairBrown} />
            <mesh position={[-0.035, 0.01, 0.096]} material={mats.eyeDark}>
              <sphereGeometry args={[0.01, 8, 6]} />
            </mesh>
            <mesh position={[0.035, 0.01, 0.096]} material={mats.eyeDark}>
              <sphereGeometry args={[0.01, 8, 6]} />
            </mesh>
            <mesh position={[0, 0.025, -0.018]} rotation={[-0.22, 0, 0]} material={mats.hairBrown}>
              <sphereGeometry args={[0.106, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
            </mesh>

            {pRemovePhone < 0.55 && (
              <group>
                <mesh rotation={[0, Math.PI / 2, 0]} material={mats.chromeSteel}>
                  <torusGeometry args={[0.112, 0.011, 6, 16, Math.PI]} />
                </mesh>
                <mesh position={[-0.108, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.panelFace}>
                  <cylinderGeometry args={[0.036, 0.036, 0.028, 12]} />
                </mesh>
                <mesh position={[0.108, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.panelFace}>
                  <cylinderGeometry args={[0.036, 0.036, 0.028, 12]} />
                </mesh>
              </group>
            )}
          </group>

          {/* Tay phải gỡ tai nghe khỏi đầu rồi cầm tai nghe ngang ngực */}
          <group
            position={[-0.19, 0.42, 0.02]}
            rotation={[lerp(-1.18, -0.58, pRemovePhone), 0, lerp(-0.2, -0.06, pRemovePhone)]}
          >
            <mesh position={[0, -0.14, 0]} geometry={rbox(0.084, 0.28, 0.084, 0.03)} material={mats.khakiUniform} />
            <mesh position={[0, -0.29, 0.02]} material={mats.skinTone}>
              <sphereGeometry args={[0.04, 10, 8]} />
            </mesh>
            {pRemovePhone >= 0.55 && (
              <group position={[0.03, -0.31, 0.05]} rotation={[0.4, 0.3, 0]}>
                <mesh material={mats.chromeSteel}>
                  <torusGeometry args={[0.09, 0.01, 6, 14, Math.PI]} />
                </mesh>
                <mesh position={[-0.086, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.panelFace}>
                  <cylinderGeometry args={[0.032, 0.032, 0.024, 10]} />
                </mesh>
                <mesh position={[0.086, -0.01, 0]} rotation={[0, 0, Math.PI / 2]} material={mats.panelFace}>
                  <cylinderGeometry args={[0.032, 0.032, 0.024, 10]} />
                </mesh>
              </group>
            )}
          </group>

          {/* Tay trái giơ tờ bức điện mật màu vàng về phía Đô đốc Halsey khi báo tin "Tokyo got the message" */}
          <group
            position={[0.19, 0.42, 0.02]}
            rotation={[lerp(-0.72, -1.02, pTurnReport), lerp(0, -0.18, pTurnReport), 0.14]}
          >
            <mesh position={[0, -0.14, 0]} geometry={rbox(0.084, 0.28, 0.084, 0.03)} material={mats.khakiUniform} />
            <mesh position={[0, -0.29, 0.02]} material={mats.skinTone}>
              <sphereGeometry args={[0.04, 10, 8]} />
            </mesh>
            {pTurnReport > 0.25 && (
              <mesh
                position={[0.01, -0.33, 0.08]}
                rotation={[0.42, 0.15, -0.12]}
                geometry={rbox(0.18, 0.008, 0.14, 0.001)}
                material={mats.msgPaper}
              />
            )}
          </group>
        </group>
      </group>

      {/* ==================== 4. PHÓ ĐÔ ĐỐC WILLIAM "BULL" HALSEY (GÓC NGHIÊNG 3/4 RÕ NÉT BÊN CỬA KÍNH MƯA TẠT) ==================== */}
      {/* Đặt tại x = 43.32, z = 8.64, xoay yaw = +2.54 rad (hướng +0.57 X, -0.82 Z) để lộ rõ biên dạng mặt nghiêng,
          mũ Đô đốc thêu vàng, ống nhòm Hải quân đeo ngực & hai bàn tay nắm thanh đồng cửa sổ! */}
      <group position={[43.32, 23.38, 8.64]} rotation={[0, 2.54, 0]}>
        <mesh position={[-0.11, 0.44, 0]} rotation={[0, 0, 0.035]} geometry={rbox(0.145, 0.88, 0.155, 0.05)} material={mats.darkTrousers} castShadow />
        <mesh position={[0.11, 0.44, 0]} rotation={[0, 0, -0.035]} geometry={rbox(0.145, 0.88, 0.155, 0.05)} material={mats.darkTrousers} castShadow />
        <mesh position={[-0.115, 0.04, 0.04]} geometry={rbox(0.135, 0.08, 0.23, 0.02)} material={mats.visorBlack} />
        <mesh position={[0.115, 0.04, 0.04]} geometry={rbox(0.135, 0.08, 0.23, 0.02)} material={mats.visorBlack} />

        {/* Thân áo khoác cầu tàu Hải quân vát vai tự nhiên + cổ bẻ + cầu vai vàng Phó Đô đốc + ống nhòm đeo trước ngực */}
        <group position={[0, 0.86, 0]} rotation={[0.09 + halseyHeavyNod * 0.045, 0, 0]}>
          <mesh geometry={coatTorsoGeo} material={mats.halseyCoat} castShadow />
          {/* Đai lưng áo khoác cầu tàu & hàng cúc đồng Hải quân */}
          <mesh position={[0, 0.18, 0]} scale={[1.09, 1, 0.7]} material={mats.visorBlack}>
            <cylinderGeometry args={[0.182, 0.18, 0.045, 18]} />
          </mesh>
          {[0.26, 0.38, 0.49].map((by) => (
            <React.Fragment key={`bt${by}`}>
              <mesh position={[-0.055, by, 0.136]} material={mats.goldBraid}>
                <sphereGeometry args={[0.012, 8, 6]} />
              </mesh>
              <mesh position={[0.055, by, 0.136]} material={mats.goldBraid}>
                <sphereGeometry args={[0.012, 8, 6]} />
              </mesh>
            </React.Fragment>
          ))}
          {/* Cổ sơ-mi khaki, ve áo khoác & cầu vai vàng Đô đốc */}
          <mesh position={[0, 0.59, 0.03]} geometry={rbox(0.19, 0.08, 0.15, 0.02)} material={mats.khakiUniform} />
          <mesh position={[-0.1, 0.52, 0.115]} rotation={[0, 0, -0.34]} geometry={rbox(0.085, 0.17, 0.04, 0.008)} material={mats.halseyCoat} />
          <mesh position={[0.1, 0.52, 0.115]} rotation={[0, 0, 0.34]} geometry={rbox(0.085, 0.17, 0.04, 0.008)} material={mats.halseyCoat} />
          <mesh position={[-0.17, 0.605, 0.0]} rotation={[0, 0, 0.1]} geometry={rbox(0.125, 0.022, 0.072, 0.004)} material={mats.goldBraid} />
          <mesh position={[0.17, 0.605, 0.0]} rotation={[0, 0, -0.1]} geometry={rbox(0.125, 0.022, 0.072, 0.004)} material={mats.goldBraid} />

          {/* Ống nhòm Hải quân 7x50 treo trước ngực Đô đốc Halsey */}
          <group position={[0, 0.37, 0.155]} rotation={[0.18, 0, 0]}>
            <mesh position={[-0.028, 0, 0]} material={mats.visorBlack}>
              <cylinderGeometry args={[0.02, 0.026, 0.12, 10]} />
            </mesh>
            <mesh position={[0.028, 0, 0]} material={mats.visorBlack}>
              <cylinderGeometry args={[0.02, 0.026, 0.12, 10]} />
            </mesh>
            <mesh position={[0, 0.02, 0]} geometry={rbox(0.07, 0.02, 0.024, 0.003)} material={mats.chromeSteel} />
          </group>

          {/* Hai cánh tay đưa ra nắm vững thanh đồng cửa sổ cầu tàu (có vạch tay áo vàng cấp Phó Đô đốc) */}
          <group position={[-0.22, 0.53, 0.02]} rotation={[-0.78, 0.16, 0.12]}>
            <mesh position={[0, -0.15, 0]} geometry={rbox(0.105, 0.31, 0.105, 0.035)} material={mats.halseyCoat} />
            <mesh position={[0, -0.34, 0.06]} rotation={[-0.36, 0, 0]} geometry={rbox(0.096, 0.25, 0.096, 0.03)} material={mats.halseyCoat} />
            <mesh position={[0, -0.41, 0.085]} rotation={[-0.36, 0, 0]} geometry={rbox(0.102, 0.036, 0.102, 0.005)} material={mats.goldBraid} />
            <mesh position={[0, -0.48, 0.11]} material={mats.skinTone}>
              <sphereGeometry args={[0.046, 10, 8]} />
            </mesh>
          </group>
          <group position={[0.22, 0.53, 0.02]} rotation={[-0.72, -0.18, -0.1]}>
            <mesh position={[0, -0.15, 0]} geometry={rbox(0.105, 0.31, 0.105, 0.035)} material={mats.halseyCoat} />
            <mesh position={[0, -0.34, 0.06]} rotation={[-0.34, 0, 0]} geometry={rbox(0.096, 0.25, 0.096, 0.03)} material={mats.halseyCoat} />
            <mesh position={[0, -0.41, 0.085]} rotation={[-0.34, 0, 0]} geometry={rbox(0.102, 0.036, 0.102, 0.005)} material={mats.goldBraid} />
            <mesh position={[0, -0.48, 0.11]} material={mats.skinTone}>
              <sphereGeometry args={[0.046, 10, 8]} />
            </mesh>
          </group>

          {/* Khuôn mặt nghiêng góc cạnh của "Bull" Halsey + Mũ lưỡi trai Phó Đô đốc thêu lá sồi vàng */}
          <group
            position={[0, 0.74, 0.02]}
            rotation={[0.08 + halseyHeavyNod * 0.08, halseyAck * 0.35, 0]}
          >
            <mesh position={[0, -0.065, -0.01]} material={mats.skinTone}>
              <cylinderGeometry args={[0.056, 0.064, 0.1, 12]} />
            </mesh>
            <mesh material={mats.skinTone}>
              <sphereGeometry args={[0.11, 18, 14]} />
            </mesh>
            {/* Quai hàm vuông, sóng mũi cao, gờ lông mày hoa râm rậm đặc trưng của "Bull" Halsey & tai */}
            <mesh position={[0, -0.046, 0.042]} geometry={rbox(0.128, 0.082, 0.118, 0.032)} material={mats.skinTone} />
            <mesh position={[0, 0.004, 0.112]} rotation={[-0.24, 0, 0]} geometry={rbox(0.028, 0.048, 0.044, 0.01)} material={mats.skinTone} />
            <mesh position={[0, 0.036, 0.098]} geometry={rbox(0.108, 0.022, 0.036, 0.006)} material={mats.hairGrey} />
            <mesh position={[-0.038, 0.018, 0.098]} material={mats.eyeDark}>
              <sphereGeometry args={[0.011, 8, 6]} />
            </mesh>
            <mesh position={[0.038, 0.018, 0.098]} material={mats.eyeDark}>
              <sphereGeometry args={[0.011, 8, 6]} />
            </mesh>
            <mesh position={[0.105, -0.005, 0]} geometry={rbox(0.02, 0.048, 0.032, 0.008)} material={mats.skinTone} />
            {/* Tóc mai hoa râm gọn phía gáy & thái dương (không che lấp má/mặt nghiêng!) */}
            <mesh position={[0, 0.015, -0.032]} rotation={[-0.38, 0, 0]} material={mats.hairGrey}>
              <sphereGeometry args={[0.108, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
            </mesh>

            {/* Mũ lưỡi trai Phó Đô đốc Hải quân Mỹ */}
            <group position={[0, 0.05, 0]} rotation={[0.05, 0, 0]}>
              <mesh geometry={capCrownGeo} material={mats.khakiUniform} castShadow />
              <mesh position={[0, 0.016, 0]} material={mats.visorBlack}>
                <cylinderGeometry args={[0.113, 0.111, 0.032, 20]} />
              </mesh>
              <mesh position={[0, 0.004, 0.004]} material={mats.goldBraid}>
                <cylinderGeometry args={[0.115, 0.115, 0.011, 20]} />
              </mesh>
              <mesh position={[0, 0.042, 0.124]} geometry={rbox(0.048, 0.038, 0.018, 0.004)} material={mats.goldBraid} />
              <group position={[0, 0.002, 0.096]} rotation={[0.24, 0, 0]}>
                <mesh scale={[1.05, 0.12, 0.78]} material={mats.visorBlack}>
                  <cylinderGeometry args={[0.105, 0.112, 0.08, 18]} />
                </mesh>
                <mesh position={[-0.045, 0.007, 0.025]} rotation={[0, 0.35, 0]} geometry={rbox(0.055, 0.008, 0.026, 0.002)} material={mats.goldBraid} />
                <mesh position={[0.045, 0.007, 0.025]} rotation={[0, -0.35, 0]} geometry={rbox(0.055, 0.008, 0.026, 0.002)} material={mats.goldBraid} />
              </group>
            </group>
          </group>
        </group>
      </group>
    </group>
  );
};

const C01S06: React.FC = () => {
  const t = useT();
  const isBeat1 = t < CUE.c01_s06_bridge_cut;

  let camPos: V3;
  let camLook: V3;
  let camFov: number;
  let camRoll = 0;

  const nittoBase = shipPose(0, 0, 30.0, 5.8, t, SWELL_NITTO, 0.18);
  const pPreHit = prog(t, 68.56, 78.8);
  const pBlow = prog(t, CUE.c01_s06_blow_apart, CUE.c01_s06_blow_apart + 0.62);
  const nittoDamage = t < CUE.c01_s06_blow_apart ? lerp(0.24, 0.36, pPreHit) : lerp(0.36, 0.94, pBlow);
  const nittoSinkY = pBlow * 1.15;

  const nittoPose = {
    y: nittoBase.y - nittoSinkY,
    pitch: nittoBase.pitch * 1.3 + Math.sin(t * 1.85) * 0.06,
    roll: nittoBase.roll * 1.45 + Math.cos(t * 2.05) * 0.18 + pBlow * 0.28,
  };

  const hornetPose = shipPose(0, 0, 251.4, 35.0, t, SWELL_HORNET, 0);

  if (isBeat1) {
    const pCam1 = prog(t, 68.56, 80.6);
    const dtBlast = t - CUE.c01_s06_blow_apart;
    const blastShake =
      dtBlast > 0 && dtBlast < 1.8 ? Math.exp(-dtBlast * 2.3) * Math.sin(dtBlast * 21.0) * 0.65 : 0;

    camPos = [
      lerp(54.0, 37.5, pCam1) + blastShake * 0.55,
      lerp(34.5, 23.8, pCam1) + Math.abs(blastShake) * 0.45,
      lerp(62.0, 41.5, pCam1) - blastShake * 0.4,
    ];
    camLook = [
      lerp(0.0, 1.2, pCam1),
      2.3 + nittoBase.y * 0.35,
      lerp(0.0, -0.4, pCam1),
    ];
    camFov = 35;
    camRoll = blastShake * 0.025;
  } else {
    // Khóa khung chặt chẽ để suốt từ 80.92..92.48 s đều thấy trọn Đèn đỏ máy thu + Sĩ quan báo cáo (trái),
    // 16 chiếc B-25B trên sàn tàu (giữa) và Phó Đô đốc Bull Halsey nghiêng 3/4 (phải)!
    const pDolly = prog(t, CUE.c01_s06_bridge_cut, 92.3);
    const pHalsey = prog(t, CUE.c01_s06_hornet_bridge - 0.25, 92.0);

    const localCam: V3 = [
      lerp(46.22, 45.42, pDolly),
      lerp(25.2, 25.12, pDolly),
      lerp(10.16, 9.86, pHalsey),
    ];
    const localLook: V3 = [
      lerp(19.5, 16.5, pHalsey),
      lerp(20.5, 20.3, pHalsey),
      lerp(3.0, 0.9, pHalsey),
    ];

    camPos = shipToWorld(localCam, hornetPose, 0, 0, 0);
    camLook = shipToWorld(localLook, hornetPose, 0, 0, 0);
    camFov = lerp(42, 39.5, pHalsey);
    camRoll = -hornetPose.roll * 0.35;
  }

  return (
    <AbsoluteFill>
      <Stage
        {...STAGE_PRESETS.stormDawn}
        shadowArea={isBeat1 ? 58 : 96}
        shadowCenter={isBeat1 ? [0, 3, 0] : [18, 21, 3]}
        fog={isBeat1 ? [105, 500] : [125, 560]}
      >
        <Cam pos={camPos} look={camLook} fov={camFov} roll={camRoll} />

        {isBeat1 ? (
          <>
            <OceanSurface t={t} swell={SWELL_NITTO} size={1100} seg={172} palette="stormPacific" />

            <group position={[0, nittoPose.y, 0]} rotation={[nittoPose.roll, 0.18, nittoPose.pitch]}>
              <NittoMaru damage={nittoDamage} wheelhouseGlow={t < CUE.c01_s06_blow_apart + 0.15} />
            </group>

            {BARRAGE_SHELLS.map((sh, idx) => (
              <BarrageRoundView key={idx} t={t} shell={sh} />
            ))}

            {/* Cụm 3 cầu lửa <Explosion> xé đôi Nitto Maru đúng CUE.c01_s06_blow_apart (79.26 s — "blow ... apart") */}
            <Explosion
              t={t}
              at={CUE.c01_s06_blow_apart}
              pos={[1.4, nittoBase.y + 2.3, 0.0]}
              size={7.8}
              seed={31}
              smokeLife={6}
              smoke="#262321"
            />
            <Explosion
              t={t}
              at={CUE.c01_s06_blow_apart + 0.14}
              pos={[-4.0, nittoBase.y + 2.7, 0.7]}
              size={6.2}
              seed={47}
              smokeLife={6}
              smoke="#322e2b"
            />
            <Explosion
              t={t}
              at={CUE.c01_s06_blow_apart + 0.28}
              pos={[5.8, nittoBase.y + 2.5, -0.5]}
              size={5.4}
              seed={59}
              smokeLife={6}
              smoke="#22201e"
            />
          </>
        ) : (
          <>
            <OceanSurface t={t} swell={SWELL_HORNET} size={1200} seg={168} palette="stormPacific" />

            <group position={[0, hornetPose.y, 0]} rotation={[hornetPose.roll, 0, hornetPose.pitch]}>
              <USSHornet hullNumber="8" showLaunchLines flagWave={t * 5.2} aaYaw={0.18} />

              {HORNET_B25_LAYOUT.map((b, idx) => (
                <group key={idx} position={b.pos} rotation={[0, b.yaw, 0]}>
                  <B25Mitchell
                    gear={1}
                    chained
                    broomsticks
                    lowerTurret={false}
                    navLights={false}
                    propSpin={0.4 + idx * 0.25}
                    seed={b.seed}
                  />
                </group>
              ))}

              <HornetFlagBridgeInterior t={t} />
            </group>
          </>
        )}
      </Stage>

      <Label
        t={t}
        text="938 ROUNDS"
        x={1520}
        y={160}
        from={CUE.c01_s06_rounds_938}
        until={80.5}
      />
    </AbsoluteFill>
  );
};

export default C01S06;
