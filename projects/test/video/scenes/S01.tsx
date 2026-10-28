// Cảnh S01 (0.00–4.05 s, thuần 3D):
// Góc thấp 3/4 trực diện mũi xe sát mặt đường thảo nguyên hoàng hôn — Xe tăng chủ lực 60 tấn, 10 triệu USD lao tới cuốn bụi.
import React from 'react';
import { AbsoluteFill } from 'remotion';
import { bump, lerp, prog } from '@kit/theme';
import { Label, useT } from '@kit/motion';
import { Cam, Stage, type V3 } from '@lib/3d/stage';
import { heightField, Scatter, Terrain } from '@lib/3d/terrain';
import { fbm } from '@lib/3d/materials';
import { DustTrail } from '@lib/3d/fx';
import { CUE } from '../cues';
import { P2D, STAGE_DUSK, STEPPE_COLORS } from '../local/palette';
import { MBT } from '../local/models';

const smooth01 = (v: number) => {
  const c = Math.max(0, Math.min(1, v));
  return c * c * (3 - 2 * c);
};

// Tâm mô đất nhẹ ngang đường để thân xe 60 tấn nhún nặng đúng mốc CUE.s01_weight_60t (1.72 s)
const TANK_X0 = -16.0;
const TANK_SPEED = 7.2; // m/s (~26 km/h tốc độ hành tiến thực địa)
const HUMP_X = TANK_X0 + TANK_SPEED * 1.48; // ~ -5.34 m (mũi xe leo lên trước 1.72 s và dập giảm xóc đúng 1.72 s)

const tankXAt = (tau: number) => TANK_X0 + TANK_SPEED * tau;

// Địa hình thảo nguyên cấp module: đường đất đắp nổi nhẹ dọc trục X (z ∈ [-4.2, 4.2]), hai bên có thảm đồi thoải & dãy sống đồi xa tự nhiên
const H_STEPPE = heightField({
  seed: 17,
  amp: 0.06,
  scale: 42,
  oct: 3,
  add: (x, z) => {
    const az = Math.abs(z);
    // Mặt nạ hành lang đường đất mở thoải rộng ra hai bên (không tạo vách dựng gần máy quay)
    const roadMask = smooth01((az - 4.5) / 14.0);

    // Mặt đường đất đầm hơi tôn cao hơn rãnh cỏ ven đường để nổi sắc đất khô vàng thảo nguyên
    const roadCrown = 0.36 * Math.exp(-((z / 3.9) ** 2));
    const trackRut = -0.045 * Math.exp(-(((az - 1.48) / 0.52) ** 2));
    const swale = -0.42 * Math.exp(-(((az - 6.8) / 3.2) ** 2));

    // Mô đất gợn nhẹ ngang đường cho cú nhún 60 tấn lúc 1.72 s
    const roadHump = 0.20 * Math.exp(-(((x - HUMP_X) / 2.9) ** 2)) * Math.exp(-((z / 6.5) ** 2));

    // Gò thảo nguyên thấp gợn tự nhiên hai bên đường (kết hợp nhiều tần số fBm, tránh hoàn toàn dạng ụ tròn đơn lẻ)
    const midUndulation =
      (fbm(x / 48 + 7.3, z / 48 - 4.1, 29, 4) - 0.42) * 4.6 +
      (fbm(x / 22 - 3.7, z / 22 + 9.2, 53, 3) - 0.5) * 1.4;

    // Sống đồi dài chạy chéo nơi chân trời phía hậu cảnh (-X, -Z), đón ánh nắng xiên hoàng hôn
    const ridgeCoord1 = (x + 118) * 0.78 + (z + 55) * 0.62;
    const ridgeAlong1 = (x + 118) * -0.62 + (z + 55) * 0.78;
    const crestMod1 = 0.58 + 0.75 * fbm(ridgeAlong1 / 65 + 11, ridgeCoord1 / 50, 41, 4);
    const farHorizonRidge1 =
      9.2 * Math.exp(-((ridgeCoord1 / 38) ** 2)) * Math.exp(-(((ridgeAlong1 - 12) / 135) ** 2)) * crestMod1;

    const ridgeCoord2 = (x + 175) * 0.85 + (z + 20) * 0.52;
    const crestMod2 = 0.62 + 0.72 * fbm(z / 75 - 15, x / 75 + 8, 67, 4);
    const farHorizonRidge2 = 13.5 * Math.exp(-((ridgeCoord2 / 46) ** 2)) * crestMod2;

    // Giữ vùng +Z gần ống kính (bên trái khung hình) thoải thấp để bầu trời góc trên-trái thoáng đãng cho <Label>
    const camLeftClear = z > 6 && x > -95 ? 1 - 0.72 * smooth01((z - 6) / 18) * smooth01((x + 95) / 45) : 1;

    return (
      roadCrown +
      trackRut +
      swale +
      roadHump +
      roadMask * camLeftClear * (Math.max(-0.6, midUndulation) + farHorizonRidge1 + farHorizonRidge2)
    );
  },
});

// Tránh rải cây/đá vào lòng đường xe chạy và hành lang lùi của máy quay thấp bên phải
const AVOID_ROAD_AND_CAM = (x: number, z: number) =>
  Math.abs(z) < 4.9 || (x > -12 && x < 34 && z > 1.8 && z < 9.5);

const AVOID_ROADSIDE_STONES = (x: number, z: number) =>
  Math.abs(z) < 3.7 || Math.abs(z) > 12.0 || (x > -12 && x < 34 && z > 2.2 && z < 9.2);

const trackGroundY = (x: number) => 0.5 * (H_STEPPE(x, -1.48) + H_STEPPE(x, 1.48));

const leftDustPath = (tau: number): V3 => {
  const rx = tankXAt(tau) - 3.35;
  return [rx, H_STEPPE(rx, -1.52), -1.52];
};

const rightDustPath = (tau: number): V3 => {
  const rx = tankXAt(tau) - 3.35;
  return [rx, H_STEPPE(rx, 1.52), 1.52];
};

const frontRightDustPath = (tau: number): V3 => {
  const fx = tankXAt(tau) + 0.55;
  return [fx, H_STEPPE(fx, 1.64), 1.64];
};

const S01: React.FC<{ t0: number }> = ({ t0 }) => {
  const t = useT(t0);

  // Vị trí dọc trục +X và quãng đường lăn xích (cộng bù 18 m để bánh/xích có pha sẵn từ t=0)
  const tankX = tankXAt(t);
  const travel = 18.0 + TANK_SPEED * t;

  // Bám mặt đất chính xác theo hai đầu dải xích trước/sau + độ lún giảm xóc thanh xoắn 60 tấn lúc 1.72 s
  const yRear = trackGroundY(tankX - 2.45);
  const yMid = trackGroundY(tankX);
  const yFront = trackGroundY(tankX + 2.45);

  const thudMain = bump(t, CUE.s01_weight_60t - 0.06, 0.44);
  const thudRebound = bump(t, CUE.s01_weight_60t + 0.36, 0.34);

  // Lấy cao độ trung bình hai vệt bánh có bù vấu xích 1.8 cm để xích luôn tì đầm lên mặt đường cả khi leo đỉnh mô đất
  const baseGroundY = 0.35 * yMid + 0.325 * (yFront + yRear) - 0.018;
  const suspSink = -0.044 * thudMain + 0.014 * thudRebound;
  const tankY = baseGroundY + suspSink;

  const terrainPitch = Math.atan2(yFront - yRear, 4.9);
  const suspPitch = -0.034 * thudMain + 0.012 * thudRebound;
  const hullPitch = terrainPitch + suspPitch;

  // Hệ thống ổn định pháo 2 mặt phẳng giữ nòng 120mm ghìm vững vào đường chân trời khi thân xe nhún
  const turretYaw = -0.09 + Math.sin(t * 0.55) * 0.016;
  const gunElev = 0.036 - hullPitch * 0.85;
  const citvYaw = 0.25 + t * 0.65;

  // Góc máy thấp 3/4 trực diện phía trước bên phải mũi xe, lia lùi chậm hơn xe để chủ thể lao tới đầy uy lực
  const pCam = prog(t, 0.0, 4.25);
  const relCamX = lerp(11.8, 8.65, pCam);
  const relCamZ = lerp(5.6, 4.45, pCam);
  const camX = tankX + relCamX;
  const camZ = relCamZ;

  // Rung chấn mặt đất khi khối thép 60 tấn gầm rú tiến sát ống kính & dập qua mô đất lúc 1.72 s
  const proximity = lerp(0.35, 1.0, pCam);
  const tremorAmp = 0.008 * proximity + 0.034 * bump(t, CUE.s01_weight_60t, 0.38);
  const shakeY = Math.sin(t * 37.0) * tremorAmp + Math.cos(t * 53.0) * tremorAmp * 0.5;
  const shakeZ = Math.cos(t * 31.0) * tremorAmp * 0.6;

  const camGround = H_STEPPE(camX, camZ);
  const camPos: V3 = [camX, Math.max(camGround + 0.82, lerp(1.42, 1.56, pCam)) + shakeY, camZ + shakeZ];
  const camLook: V3 = [
    tankX + lerp(1.12, 0.85, pCam),
    tankY + lerp(1.34, 1.40, pCam) + shakeY * 0.35,
    lerp(-0.10, -0.20, pCam),
  ];

  // Đảm bảo tuyệt đối tối đa 1 <Label> trên màn hình tại mọi thời điểm (thu gọn hoàn toàn trước khi nhãn sau bật)
  const fadeOut60t = 1 - prog(t, 2.72, 2.98);
  const fadeOut10m = 1 - prog(t, 3.80, 4.02);

  return (
    <AbsoluteFill>
      <Stage {...STAGE_DUSK} shadowArea={18} shadowCenter={[tankX + 0.8, 0.8, 0]}>
        <Cam pos={camPos} look={camLook} fov={38} roll={-0.016 * thudMain} />

        {/* Ánh sáng phản xạ bụi đất thảo nguyên ấm áp giúp nổi rõ chi tiết mũi giáp dưới, móc kéo & bánh chịu nặng */}
        <directionalLight position={[20, 5, 26]} intensity={0.62} color="#ffdba8" />

        {/* Địa hình thảo nguyên khô & thảm thực vật bụi/đá hai bên đường */}
        <Terrain h={H_STEPPE} colors={STEPPE_COLORS} size={420} seg={240} center={[-40, -25]} />
        <Scatter
          kind="bush"
          count={135}
          area={[-175, -135, 65, 85]}
          h={H_STEPPE}
          seed={11}
          scale={[0.55, 1.25]}
          avoid={AVOID_ROAD_AND_CAM}
          tint="#c4ae78"
        />
        <Scatter
          kind="rock"
          count={105}
          area={[-165, -125, 65, 80]}
          h={H_STEPPE}
          seed={23}
          scale={[0.45, 1.2]}
          avoid={AVOID_ROAD_AND_CAM}
          tint="#8c8479"
        />
        <Scatter
          kind="rock"
          count={72}
          area={[-45, -12, 42, 12]}
          h={H_STEPPE}
          seed={37}
          scale={[0.16, 0.38]}
          avoid={AVOID_ROADSIDE_STONES}
          tint="#a3947d"
        />

        {/* Xe tăng chủ lực hiện đại 60 tấn */}
        <group position={[tankX, tankY, 0]} rotation={[0, 0, hullPitch]}>
          <MBT travel={travel} turretYaw={turretYaw} gunElev={gunElev} citvYaw={citvYaw} />
        </group>

        {/* Bụi vàng thảo nguyên cuộn dày phía sau hai dải xích ngay từ khung đầu (from = -2.6 s) */}
        <DustTrail t={t} from={-2.6} to={4.5} path={leftDustPath} rate={10} size={2.35} color="#cbb489" life={2.8} />
        <DustTrail t={t} from={-2.6} to={4.5} path={rightDustPath} rate={11} size={2.55} color="#d6bf93" life={2.9} />
        <DustTrail t={t} from={-1.8} to={4.5} path={frontRightDustPath} rate={7} size={1.15} color="#dcc79d" life={1.4} />
      </Stage>

      {/* Nhãn 1: "60 TẤN" đặt ở bầu trời thoáng góc trên-trái (1.72 -> tắt hẳn ở 2.98, trước mốc 3.12) */}
      {t >= CUE.s01_weight_60t && t < 3.0 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: fadeOut60t }}>
          <Label
            t={t}
            text="60 TẤN"
            x={290}
            y={170}
            from={CUE.s01_weight_60t}
            until={2.74}
            size={58}
            bg={P2D.slatePanel}
            fg="#ffd89b"
          />
        </div>
      )}

      {/* Nhãn 2: "$10 TRIỆU" ở cùng vị trí góc trên-trái thoáng đãng (3.12 -> tắt hẳn ở 4.02) */}
      {t >= CUE.s01_cost_10m && t < 4.04 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', opacity: fadeOut10m }}>
          <Label
            t={t}
            text="$10 TRIỆU"
            x={315}
            y={170}
            from={CUE.s01_cost_10m}
            until={3.82}
            size={58}
            bg="#ffd28a"
            fg={P2D.slateDeep}
          />
        </div>
      )}
    </AbsoluteFill>
  );
};

export default S01;
