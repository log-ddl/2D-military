// Hình chiếu kỹ thuật 2D dùng chung cho dự án vid5 — quy đổi 1:1 từ kích thước mét thật (PX_PER_M = 24 px/m).
// Đổ khối 3 tông (sáng / trung / tối) + viền mực P.ink đồng bộ tuyệt đối với các mô hình 3D trong local/models/.
import React from 'react';
import { P } from './palette';

export const PX_PER_M = 24;

type TransformProps = {
  x?: number;
  y?: number;
  scale?: number;
  rot?: number;
  flip?: boolean;
  opacity?: number;
};

const wrapTf = ({ x = 0, y = 0, scale = 1, rot = 0, flip = false }: TransformProps) =>
  `translate(${x} ${y}) rotate(${rot}) scale(${flip ? -scale : scale} ${scale})`;

/** Nền bàn vẽ kỹ thuật hàng không có chiều sâu (gradient + vạch chia tọa độ + khung ngắm tinh tế). */
export const BlueprintGrid: React.FC<{
  x0?: number;
  y0?: number;
  w?: number;
  h?: number;
  step?: number;
  id?: string;
  tint?: string;
}> = ({ x0 = -400, y0 = -300, w = 2720, h = 1680, step = 120, id = 'bp', tint = P.bgMid }) => {
  const cols = Math.ceil(w / step);
  const rows = Math.ceil(h / step);
  return (
    <g>
      <defs>
        <radialGradient id={`${id}_rg`} cx="50%" cy="44%" r="68%">
          <stop offset="0%" stopColor={P.bgPanel} />
          <stop offset="55%" stopColor={tint} />
          <stop offset="100%" stopColor={P.bgDeep} />
        </radialGradient>
      </defs>
      <rect x={x0} y={y0} width={w} height={h} fill={`url(#${id}_rg)`} />
      {Array.from({ length: cols + 1 }, (_, i) => {
        const gx = x0 + i * step;
        const major = i % 4 === 0;
        return (
          <line
            key={`c${i}`}
            x1={gx}
            y1={y0}
            x2={gx}
            y2={y0 + h}
            stroke={major ? P.gridBright : P.grid}
            strokeWidth={major ? 1.2 : 0.7}
            opacity={major ? 0.32 : 0.16}
          />
        );
      })}
      {Array.from({ length: rows + 1 }, (_, j) => {
        const gy = y0 + j * step;
        const major = j % 4 === 0;
        return (
          <line
            key={`r${j}`}
            x1={x0}
            y1={gy}
            x2={x0 + w}
            y2={gy}
            stroke={major ? P.gridBright : P.grid}
            strokeWidth={major ? 1.2 : 0.7}
            opacity={major ? 0.32 : 0.16}
          />
        );
      })}
    </g>
  );
};

/** Vũ khí & thùng dầu phụ tỉ lệ 1:1 (24 px/m), mũi hướng +X (sang phải). */
export const Weapon2D: React.FC<
  TransformProps & {
    kind: 'amraam' | 'aim9x' | 'hypersonic' | 'droptank' | 'bunkerbuster';
    flame?: number;
    accent?: string;
  }
> = ({ kind, flame = 0, accent, opacity = 1, ...tf }) => {
  return (
    <g transform={wrapTf(tf)} opacity={opacity}>
      {kind === 'amraam' && (
        // AIM-120D AMRAAM: dài 3.66 m -> 87.8 px, Ø 4.3 px
        <g>
          {flame > 0 && (
            <g>
              <polygon points={`${-44},0 ${-44 - 38 * flame},${-6 * flame} ${-44 - 56 * flame},0 ${-44 - 38 * flame},${6 * flame}`} fill={P.flame} opacity={0.55} />
              <polygon points={`${-44},0 ${-44 - 22 * flame},${-3 * flame} ${-44 - 36 * flame},0 ${-44 - 22 * flame},${3 * flame}`} fill={P.amberHot} />
            </g>
          )}
          <polygon points="-43,-2.4 -35,-2.4 -39,-8.5 -43,-8.5" fill={P.ordDark} stroke={P.ink} strokeWidth={1.1} />
          <polygon points="-43,2.4 -35,2.4 -39,8.5 -43,8.5" fill={P.ordDark} stroke={P.ink} strokeWidth={1.1} />
          <polygon points="-4,-2.4 6,-2.4 0,-9.2 -6,-9.2" fill={P.ordMid} stroke={P.ink} strokeWidth={1.1} />
          <polygon points="-4,2.4 6,2.4 0,9.2 -6,9.2" fill={P.ordMid} stroke={P.ink} strokeWidth={1.1} />
          <path d="M-44,-2.5 L28,-2.5 Q39,-2.2 44,0 Q39,2.2 28,2.5 L-44,2.5 Z" fill={P.ordWhite} stroke={P.ink} strokeWidth={1.3} />
          <path d="M-44,0.4 L36,0.4 Q41,0.2 44,0 Q39,2.2 28,2.5 L-44,2.5 Z" fill={P.ordMid} opacity={0.65} />
          <rect x={10} y={-2.4} width={4} height={4.8} fill={accent ?? P.amber} />
          <rect x={-20} y={-2.4} width={3.5} height={4.8} fill="#7a5a3a" />
        </g>
      )}
      {kind === 'aim9x' && (
        // AIM-9X Sidewinder: dài 3.02 m -> 72.5 px
        <g>
          {flame > 0 && (
            <polygon points={`${-36},0 ${-36 - 30 * flame},${-4.5 * flame} ${-36 - 44 * flame},0 ${-36 - 30 * flame},${4.5 * flame}`} fill={P.amberHot} />
          )}
          <polygon points="-35,-2 -28,-2 -32,-7.2 -36,-7.2" fill={P.ordDark} stroke={P.ink} strokeWidth={1} />
          <polygon points="-35,2 -28,2 -32,7.2 -36,7.2" fill={P.ordDark} stroke={P.ink} strokeWidth={1} />
          <polygon points="18,-2 25,-2 22,-6.8 17,-6.8" fill={P.ordDark} stroke={P.ink} strokeWidth={1} />
          <polygon points="18,2 25,2 22,6.8 17,6.8" fill={P.ordDark} stroke={P.ink} strokeWidth={1} />
          <path d="M-36,-2.1 L29,-2.1 Q35,-1.8 36.5,0 Q35,1.8 29,2.1 L-36,2.1 Z" fill={P.ordWhite} stroke={P.ink} strokeWidth={1.2} />
          <path d="M29,-2.1 Q35,-1.8 36.5,0 Q35,1.8 29,2.1 Z" fill="#2c3542" />
          <rect x={6} y={-2} width={3.2} height={4} fill={accent ?? P.amber} />
        </g>
      )}
      {kind === 'hypersonic' && (
        // Tên lửa siêu vượt âm ngoại cỡ 22 ft (6.71 m -> 161 px) x Ø 0.58 m (14 px), 7.000 lb
        <g>
          {flame > 0 && (
            <g>
              <polygon points={`${-80},0 ${-80 - 75 * flame},${-16 * flame} ${-80 - 125 * flame},0 ${-80 - 75 * flame},${16 * flame}`} fill={P.flame} opacity={0.5} />
              <polygon points={`${-80},0 ${-80 - 46 * flame},${-9 * flame} ${-80 - 84 * flame},0 ${-80 - 46 * flame},${9 * flame}`} fill={P.amberHot} />
            </g>
          )}
          <polygon points="-78,-7 -60,-7 -70,-19 -80,-19" fill={P.ordDark} stroke={P.ink} strokeWidth={1.6} />
          <polygon points="-78,7 -60,7 -70,19 -80,19" fill={P.ordDark} stroke={P.ink} strokeWidth={1.6} />
          {/* Thân tầng đẩy rocket */}
          <path d="M-80,-7 L22,-7 L46,-4.6 L80.5,0 L46,4.6 L22,7 L-80,7 Z" fill={P.ordWhite} stroke={P.ink} strokeWidth={1.8} />
          <path d="M-80,1.5 L22,1.5 L46,1.2 L80.5,0 L46,4.6 L22,7 L-80,7 Z" fill={P.ordMid} opacity={0.7} />
          {/* Đầu lượn siêu vượt âm phủ carbon chịu nhiệt */}
          <path d="M22,-7 L48,-4.5 L80.5,0 L48,4.5 L22,7 Z" fill="#272f3b" stroke={P.ink} strokeWidth={1.6} />
          <line x1={22} y1={0} x2={79} y2={0} stroke={accent ?? P.amber} strokeWidth={1.6} />
          <rect x={-10} y={-6.8} width={10} height={13.6} fill={accent ?? P.amber} />
          <rect x={-52} y={-6.8} width={5} height={13.6} fill="#272f3b" />
        </g>
      )}
      {kind === 'droptank' && (
        // Thùng dầu phụ 600-gal Sargent Fletcher: dài 6.00 m -> 144 px, Ø 19 px
        <g>
          <polygon points="-70,-3 -56,-5 -66,-14 -72,-12" fill={P.f15Dark} stroke={P.ink} strokeWidth={1.3} />
          <polygon points="-70,3 -56,5 -66,14 -72,12" fill={P.f15Dark} stroke={P.ink} strokeWidth={1.3} />
          <path
            d="M-72,0 Q-54,-9.5 -10,-9.8 L18,-9.5 Q54,-8.2 72,0 Q54,8.2 18,9.5 L-10,9.8 Q-54,9.5 -72,0 Z"
            fill={P.f15Light}
            stroke={P.ink}
            strokeWidth={1.7}
          />
          <path
            d="M-72,0 Q-54,3 -10,3 L18,3 Q54,2.5 72,0 Q54,8.2 18,9.5 L-10,9.8 Q-54,9.5 -72,0 Z"
            fill={P.f15Dark}
            opacity={0.55}
          />
          <line x1={-24} y1={-9.4} x2={-24} y2={9.4} stroke={P.ink} strokeWidth={1.1} opacity={0.5} />
          <line x1={22} y1={-9.1} x2={22} y2={9.1} stroke={P.ink} strokeWidth={1.1} opacity={0.5} />
        </g>
      )}
      {kind === 'bunkerbuster' && (
        // Bom xuyên boong-ke GBU-28 / 5.000 lb: dài 5.80 m -> 139 px
        <g>
          <polygon points="-69,-5 -53,-5 -61,-15 -69,-15" fill="#465242" stroke={P.ink} strokeWidth={1.4} />
          <polygon points="-69,5 -53,5 -61,15 -69,15" fill="#465242" stroke={P.ink} strokeWidth={1.4} />
          <path d="M-69,-5.5 L34,-5.5 L56,-2.5 L70,0 L56,2.5 L34,5.5 L-69,5.5 Z" fill="#5b6953" stroke={P.ink} strokeWidth={1.6} />
          <rect x={24} y={-5.3} width={6} height={10.6} fill={P.amber} />
        </g>
      )}
    </g>
  );
};

/**
 * F-15EX / F-15C/D nhìn ngang tỉ lệ 1:1 (19.43 m x 5.63 m -> 466.3 px x 135.1 px ở 24 px/m).
 * Mũi hướng +X (sang phải, x = +233), loa phụt ở x = -233, đỉnh đuôi đứng y = -104, bánh xe chạm y = +31.
 */
export const F15Side2D: React.FC<
  TransformProps & {
    legacy?: boolean;
    singleSeat?: boolean;
    epawss?: boolean;
    cft?: boolean;
    dropTank?: boolean;
    hypersonic?: boolean;
    gear?: boolean;
    afterburner?: number;
    xray?: number;
    backSeatEmpty?: boolean;
  }
> = ({
  legacy = false,
  singleSeat = false,
  epawss,
  cft = false,
  dropTank = false,
  hypersonic = false,
  gear = false,
  afterburner = 0,
  xray = 0,
  backSeatEmpty = false,
  opacity = 1,
  ...tf
}) => {
  const cL = legacy ? P.legLight : P.f15Light;
  const cM = legacy ? P.legMid : P.f15Mid;
  const cD = legacy ? P.legDark : P.f15Dark;
  const showEpawss = epawss ?? !legacy;
  const uid = `f15s_${Math.round((tf.x ?? 0) * 10)}_${Math.round((tf.y ?? 0) * 10)}`;

  return (
    <g transform={wrapTf(tf)} opacity={opacity}>
      {/* Buồng đốt hậu F110-GE-129 */}
      {afterburner > 0 && (
        <g>
          <ellipse cx={-234 - 58 * afterburner} cy={3} rx={72 * afterburner} ry={12 * afterburner} fill={P.flame} opacity={0.38} />
          <polygon
            points={`-233,-7 ${-233 - 135 * afterburner},3 -233,13`}
            fill={P.amber}
            opacity={0.85}
          />
          <polygon
            points={`-233,-4 ${-233 - 86 * afterburner},3 -233,10`}
            fill={P.amberHot}
          />
          {[0, 1, 2, 3].map((k) => (
            <ellipse
              key={k}
              cx={-246 - k * 22 * afterburner}
              cy={3}
              rx={5 * afterburner}
              ry={4.2 * afterburner}
              fill="#ffffff"
              opacity={0.75 - k * 0.15}
            />
          ))}
        </g>
      )}

      {/* Càng đáp 3 điểm khi ở mặt đất */}
      {gear && (
        <g>
          <line x1={116} y1={13} x2={120} y2={30} stroke={P.ordWhite} strokeWidth={3.2} />
          <line x1={110} y1={14} x2={119} y2={25} stroke={P.ordMid} strokeWidth={2} />
          <circle cx={120} cy={31} r={6.5} fill="#20262e" stroke={P.ink} strokeWidth={1.6} />
          <circle cx={120} cy={31} r={2.6} fill={P.ordWhite} />

          <line x1={-22} y1={14} x2={-26} y2={28} stroke={P.ordWhite} strokeWidth={4} />
          <line x1={-10} y1={14} x2={-24} y2={25} stroke={P.ordMid} strokeWidth={2.2} />
          <circle cx={-26} cy={29} r={9.5} fill="#20262e" stroke={P.ink} strokeWidth={1.8} />
          <circle cx={-26} cy={29} r={4.2} fill={P.ordWhite} />
        </g>
      )}

      {/* Vũ khí / thùng dầu dưới bụng */}
      {dropTank && (
        <g>
          <polygon points="-24,14 28,14 20,23 -18,23" fill={cD} stroke={P.ink} strokeWidth={1.4} />
          <Weapon2D kind="droptank" x={2} y={29} />
        </g>
      )}
      {hypersonic && (
        <g>
          <polygon points="-38,13 42,13 32,22 -28,22" fill={cD} stroke={P.ink} strokeWidth={1.5} />
          <Weapon2D kind="hypersonic" x={6} y={28} />
        </g>
      )}

      {/* Cánh đuôi đứng xa (hơi lệch tạo chiều sâu) */}
      <polygon points="-198,-8 -134,-8 -174,-101 -204,-101" fill={cD} stroke={P.ink} strokeWidth={1.6} />
      {showEpawss && <rect x={-207} y={-105} width={36} height={5} rx={2.5} fill={cM} stroke={P.ink} strokeWidth={1.2} />}

      {/* Thân chính F-15 (3 tông sáng / trung / tối) */}
      <path
        d="M233,4 Q205,-6 168,-10 L134,-12 Q102,-28 58,-28 L12,-23 L-112,-17 L-214,-11 L-214,15 L-108,17 L56,17 L138,13 Q192,11 233,4 Z"
        fill={cM}
        stroke={P.ink}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      {/* Mảng lưng sáng */}
      <path
        d="M168,-10 L134,-12 L58,-18 L-112,-17 L-214,-11 L-214,-3 L58,-4 L168,-4 Z"
        fill={cL}
        opacity={0.78}
      />
      {/* Mảng bụng tối */}
      <path
        d="M-214,6 L138,6 Q192,7 233,4 Q192,11 138,13 L56,17 L-108,17 L-214,15 Z"
        fill={cD}
        opacity={0.75}
      />
      {/* Radome mũi */}
      <path
        d="M233,4 Q207,-5.5 174,-9.5 L172,11 Q204,9.5 233,4 Z"
        fill={legacy ? '#7b8fa3' : P.f15Radome}
        stroke={P.ink}
        strokeWidth={1.8}
      />

      {/* Cửa hút khí chữ nhật vát góc đặc trưng F-15 */}
      <polygon points="74,-7 58,15 -36,16 -36,-9" fill={cM} stroke={P.ink} strokeWidth={2} />
      <polygon points="74,-7 62,-7 50,14 58,15" fill="#172230" stroke={P.ink} strokeWidth={1.4} />
      <line x1={54} y1={-6} x2={-28} y2={-6} stroke={cL} strokeWidth={2} opacity={0.7} />

      {/* Thùng dầu khí động Conformal Fuel Tank (CFT) ốp sát hông */}
      {cft && (
        <g>
          <path
            d="M46,2 Q10,-2 -96,0 L-138,8 Q-96,19 14,19 Q40,17 46,2 Z"
            fill={cD}
            stroke={P.ink}
            strokeWidth={1.8}
          />
          <path d="M36,5 L-118,6" stroke={P.amber} strokeWidth={1.4} strokeDasharray="6 4" opacity={0.85} />
          {/* Đạn AIM-120 / giá bom tiếp tuyến trên CFT */}
          <Weapon2D kind="amraam" x={-26} y={19} scale={0.88} />
        </g>
      )}

      {/* Cánh chính nhìn ngang + mấu treo cánh */}
      <polygon points="28,1 -118,5 -130,9 14,7" fill={cL} stroke={P.ink} strokeWidth={1.8} />
      {!dropTank && !hypersonic && !legacy && <Weapon2D kind="amraam" x={-16} y={17} scale={0.95} />}

      {/* Vòm kính buồng lái bọt nước (đôi cho F-15EX / F-15D, đơn khi singleSeat) */}
      <path
        d={
          singleSeat
            ? 'M148,-10 Q122,-31 82,-27 Q62,-24 50,-16 Z'
            : 'M148,-10 Q116,-33 62,-30 Q30,-26 12,-17 Z'
        }
        fill={P.f15Canopy}
        fillOpacity={0.74}
        stroke={P.ink}
        strokeWidth={2}
      />
      {/* Ghế phóng ACES-5 & phi công bên trong vòm kính */}
      <polygon points="108,-11 114,-23 105,-24 98,-11" fill="#27313d" />
      <circle cx={113} cy={-21} r={4.2} fill={P.ordWhite} stroke={P.ink} strokeWidth={1} />
      {!singleSeat && (
        <g>
          <polygon points="60,-13 66,-25 57,-26 50,-13" fill="#27313d" />
          {!backSeatEmpty && <circle cx={65} cy={-23} r={4.1} fill={P.amber} stroke={P.ink} strokeWidth={1} />}
        </g>
      )}
      {/* Gọng vòm kính */}
      <path d="M126,-22 L119,-10" stroke={P.ink} strokeWidth={2} />
      {!singleSeat && <path d="M82,-29 L78,-12" stroke={P.ink} strokeWidth={1.8} />}

      {/* Loa phụt GE F110-GE-129 có cánh hoa kim loại */}
      <polygon points="-214,-10 -233,-7.5 -233,13.5 -214,15" fill="#2d3642" stroke={P.ink} strokeWidth={1.8} />
      {[-6, -1, 4, 9].map((ly, i) => (
        <line key={i} x1={-214} y1={ly} x2={-233} y2={ly * 0.82 + 2} stroke="#697789" strokeWidth={1.2} />
      ))}

      {/* Cánh đuôi đứng gần + u AN/ALQ-250 EPAWSS trên đỉnh */}
      <polygon points="-186,-9 -114,-9 -160,-104 -194,-104" fill={cL} stroke={P.ink} strokeWidth={2.1} strokeLinejoin="round" />
      <polygon points="-186,-9 -170,-9 -182,-98 -193,-98" fill={cM} opacity={0.65} />
      <line x1={-168} y1={-9} x2={-180} y2={-86} stroke={P.ink} strokeWidth={1.3} opacity={0.65} />
      {showEpawss && (
        <rect x={-198} y={-108} width={41} height={6} rx={3} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.5} />
      )}

      {/* Cánh đuôi ngang all-moving stabilator */}
      <polygon points="-172,5 -224,9 -231,13 -186,12" fill={cD} stroke={P.ink} strokeWidth={1.7} />

      {/* Lớp cắt X-Quang bóc vỏ theo tiến độ xray (0..1 từ mũi về đuôi) */}
      {xray > 0.01 && (
        <g>
          <defs>
            <clipPath id={uid}>
              <rect x={240 - 485 * xray} y={-120} width={485 * xray} height={170} />
            </clipPath>
          </defs>
          <g clipPath={`url(#${uid})`}>
            <path
              d="M231,4 Q205,-6 168,-10 L134,-12 L58,-18 L-112,-17 L-213,-10 L-213,14 L-108,16 L138,12 Q192,10 231,4 Z"
              fill="#0c1b30"
              stroke={P.cyan}
              strokeWidth={1.8}
            />
            {/* Khung sườn vách ngăn & dầm longeron gia cường */}
            {Array.from({ length: 14 }, (_, i) => {
              const rx = -195 + i * 26;
              return <line key={i} x1={rx} y1={-15} x2={rx} y2={14} stroke={P.gridBright} strokeWidth={1.8} opacity={0.8} />;
            })}
            <path d="M168,-8 L56,-14 L-198,-9" fill="none" stroke={P.amber} strokeWidth={3} />
            <path d="M166,9 L-198,11" fill="none" stroke={P.cyanSoft} strokeWidth={2} opacity={0.75} />
            {/* Mảng radar AESA AN/APG-82 nghiêng ở mũi */}
            <line x1={176} y1={-8} x2={182} y2={10} stroke={P.cyan} strokeWidth={4.5} />
            {/* Hộp siêu máy tính ADCP II sau buồng lái */}
            <rect x={22} y={-9} width={28} height={15} rx={2} fill={P.amber} stroke={P.amberHot} strokeWidth={1.5} />
            {/* Lõi động cơ F110 */}
            <rect x={-196} y={-6} width={104} height={16} rx={3} fill="#1e3859" stroke={P.flame} strokeWidth={1.5} />
          </g>
        </g>
      )}
    </g>
  );
};

/**
 * F-15EX / F-15C/D hình chiếu bằng (trên xuống hoặc dưới bụng `underside`), tỉ lệ 1:1 (466.3 px x 313.2 px).
 * Mũi hướng +X (sang phải, x = +233), cánh trái y < 0 (Station 1 ở y ≈ -141), cánh phải y > 0 (Station 9 ở y ≈ +141).
 */
export const F15Top2D: React.FC<
  TransformProps & {
    legacy?: boolean;
    underside?: boolean;
    wingTipMissiles?: boolean;
    fullLoad?: boolean;
    cft?: boolean;
    dropTanks?: boolean;
    flutterDeg?: number;
    highlightSta19?: boolean;
  }
> = ({
  legacy = false,
  underside = false,
  wingTipMissiles = false,
  fullLoad = false,
  cft = false,
  dropTanks = false,
  flutterDeg = 0,
  highlightSta19 = false,
  opacity = 1,
  ...tf
}) => {
  const cL = legacy ? P.legLight : P.f15Light;
  const cM = legacy ? P.legMid : P.f15Mid;
  const cD = legacy ? P.legDark : P.f15Dark;

  return (
    <g transform={wrapTf(tf)} opacity={opacity}>
      {/* Hai cánh chính quét 45 độ, đầu cánh vát chuẩn F-15 (có thể xoắn theo flutterDeg) */}
      <g transform={`translate(0 0) rotate(${flutterDeg * 0.35})`}>
        <polygon
          points="56,-28 -48,-156.6 -96,-150 -86,-28"
          fill={underside ? cM : cL}
          stroke={P.ink}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <polygon points="-64,-152 -96,-150 -86,-28 -68,-28" fill={cD} opacity={0.45} />
      </g>
      <g transform={`translate(0 0) rotate(${-flutterDeg * 0.35})`}>
        <polygon
          points="56,28 -48,156.6 -96,150 -86,28"
          fill={underside ? cM : cL}
          stroke={P.ink}
          strokeWidth={2.2}
          strokeLinejoin="round"
        />
        <polygon points="-64,152 -96,150 -86,28 -68,28" fill={cD} opacity={0.45} />
      </g>

      {/* Hai cánh đuôi ngang */}
      <polygon points="-148,-24 -204,-96 -228,-88 -206,-22" fill={cM} stroke={P.ink} strokeWidth={2} strokeLinejoin="round" />
      <polygon points="-148,24 -204,96 -228,88 -206,22" fill={cM} stroke={P.ink} strokeWidth={2} strokeLinejoin="round" />

      {/* Thùng dầu ốp thân CFT nhìn từ trên/dưới */}
      {cft && (
        <g>
          <path d="M54,-29 Q10,-43 -114,-39 L-144,-26 Z" fill={cD} stroke={P.ink} strokeWidth={1.8} />
          <path d="M54,29 Q10,43 -114,39 L-144,26 Z" fill={cD} stroke={P.ink} strokeWidth={1.8} />
        </g>
      )}

      {/* Thân nâng rộng phẳng Lifting-Body & hai cửa hút khí vuông + hai ống động cơ */}
      <path
        d="M233,0 Q198,-13 146,-16 L84,-19 L74,-31 L-152,-30 L-214,-24 L-214,-6 L-184,-3 L-184,3 L-214,6 L-214,24 L-152,30 L74,31 L84,19 L146,16 Q198,13 233,0 Z"
        fill={cM}
        stroke={P.ink}
        strokeWidth={2.3}
        strokeLinejoin="round"
      />
      {/* Khối nổi trung tâm & hai bầu động cơ */}
      <path
        d="M174,0 Q130,-11 66,-15 L-198,-18 L-198,-6 L-120,-4 L-120,4 L-198,6 L-198,18 L66,15 Q130,11 174,0 Z"
        fill={underside ? cD : cL}
        opacity={0.55}
      />
      {/* Chóp mũi Radome */}
      <path d="M233,0 Q206,-10 176,-13.5 Q182,0 176,13.5 Q206,10 233,0 Z" fill={P.f15Radome} stroke={P.ink} strokeWidth={1.6} />

      {/* Hai loa phụt F110 */}
      <rect x={-233} y={-22} width={19} height={15} rx={2} fill="#2c3542" stroke={P.ink} strokeWidth={1.7} />
      <rect x={-233} y={7} width={19} height={15} rx={2} fill="#2c3542" stroke={P.ink} strokeWidth={1.7} />

      {!underside ? (
        <>
          {/* Vòm kính nhìn từ trên */}
          <ellipse cx={96} cy={0} rx={52} ry={10.5} fill={P.f15Canopy} fillOpacity={0.78} stroke={P.ink} strokeWidth={1.9} />
          <line x1={116} y1={-9.5} x2={116} y2={9.5} stroke={P.ink} strokeWidth={1.7} />
          <line x1={82} y1={-10} x2={82} y2={10} stroke={P.ink} strokeWidth={1.6} />
          {/* Hai cánh đuôi đứng nhìn từ trên + u EPAWSS */}
          <rect x={-204} y={-37} width={76} height={5} rx={2} fill={cD} stroke={P.ink} strokeWidth={1.5} />
          <rect x={-204} y={32} width={76} height={5} rx={2} fill={cD} stroke={P.ink} strokeWidth={1.5} />
          {!legacy && (
            <>
              <rect x={-212} y={-38} width={22} height={7} rx={3} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.2} />
              <rect x={-212} y={31} width={22} height={7} rx={3} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.2} />
            </>
          )}
        </>
      ) : (
        <>
          {/* Mặt dưới bụng: các giá treo vũ khí (Station 1, 2, 5, 8, 9 & 4 góc thân) */}
          <rect x={-48} y={-4} width={78} height={8} rx={2} fill={cD} stroke={P.ink} strokeWidth={1.4} />
          <rect x={-44} y={-74} width={66} height={6} rx={2} fill={cD} stroke={P.ink} strokeWidth={1.4} />
          <rect x={-44} y={68} width={66} height={6} rx={2} fill={cD} stroke={P.ink} strokeWidth={1.4} />
          {/* Giá treo đầu cánh Station 1 (trái, y=-136) & Station 9 (phải, y=+136) */}
          <rect
            x={-76}
            y={-139}
            width={54}
            height={6}
            rx={2}
            fill={highlightSta19 ? P.amber : cD}
            stroke={highlightSta19 ? P.amberHot : P.ink}
            strokeWidth={highlightSta19 ? 2.2 : 1.4}
          />
          <rect
            x={-76}
            y={133}
            width={54}
            height={6}
            rx={2}
            fill={highlightSta19 ? P.amber : cD}
            stroke={highlightSta19 ? P.amberHot : P.ink}
            strokeWidth={highlightSta19 ? 2.2 : 1.4}
          />
        </>
      )}

      {/* Vũ khí gắn kèm nhìn từ trên/dưới */}
      {dropTanks && (
        <>
          <Weapon2D kind="droptank" x={-8} y={-71} scale={0.92} />
          <Weapon2D kind="droptank" x={-8} y={71} scale={0.92} />
        </>
      )}
      {fullLoad && (
        <>
          <Weapon2D kind="amraam" x={18} y={-27} scale={0.85} />
          <Weapon2D kind="amraam" x={18} y={27} scale={0.85} />
          <Weapon2D kind="amraam" x={-78} y={-27} scale={0.85} />
          <Weapon2D kind="amraam" x={-78} y={27} scale={0.85} />
          {!dropTanks && (
            <>
              <Weapon2D kind="amraam" x={-10} y={-64} scale={0.9} />
              <Weapon2D kind="amraam" x={-10} y={-78} scale={0.9} />
              <Weapon2D kind="amraam" x={-10} y={64} scale={0.9} />
              <Weapon2D kind="amraam" x={-10} y={78} scale={0.9} />
            </>
          )}
        </>
      )}
      {wingTipMissiles && (
        <>
          <Weapon2D kind="amraam" x={-48} y={-136} scale={0.92} />
          <Weapon2D kind="aim9x" x={-48} y={136} scale={0.92} />
        </>
      )}
    </g>
  );
};

/**
 * F-15EX hình chiếu trực diện từ mũi (sải cánh 13.05 m = 313.2 px, cao 5.63 m = 135.1 px ở 24 px/m).
 * Dùng cho S02 (RCS 200 sq ft), S13 (22 tên lửa AMBER + Vulcan 20mm), S24 (CFT vs thùng dầu phụ).
 */
export const F15Front2D: React.FC<
  TransformProps & {
    loadout?: 'clean' | 'standard12' | 'beast22' | 'heavyRadar' | 'dropTanks';
    cft?: boolean;
    gear?: boolean;
    highlightVulcan?: boolean;
  }
> = ({ loadout = 'standard12', cft = false, gear = false, highlightVulcan = false, opacity = 1, ...tf }) => {
  // Khi nhìn trực diện vào mũi F-15: cánh phải của máy bay nằm ở x < 0, cánh trái của máy bay nằm ở x > 0
  const missileDot = (mx: number, my: number, r = 4.2, hot = false) => (
    <g key={`${mx}_${my}`}>
      <line x1={mx} y1={5} x2={mx} y2={my - r} stroke={P.f15Dark} strokeWidth={2.2} />
      <circle cx={mx} cy={my} r={r} fill={hot ? P.amber : P.ordWhite} stroke={P.ink} strokeWidth={1.4} />
      <circle cx={mx} cy={my} r={r * 0.42} fill="#25303d" />
    </g>
  );

  return (
    <g transform={wrapTf(tf)} opacity={opacity}>
      {gear && (
        <g>
          <line x1={0} y1={18} x2={0} y2={42} stroke={P.ordWhite} strokeWidth={3.5} />
          <rect x={-4} y={38} width={8} height={13} rx={3} fill="#1d232b" stroke={P.ink} strokeWidth={1.4} />
          <line x1={-46} y1={14} x2={-52} y2={40} stroke={P.ordWhite} strokeWidth={4} />
          <rect x={-57} y={35} width={10} height={16} rx={3} fill="#1d232b" stroke={P.ink} strokeWidth={1.4} />
          <line x1={46} y1={14} x2={52} y2={40} stroke={P.ordWhite} strokeWidth={4} />
          <rect x={47} y={35} width={10} height={16} rx={3} fill="#1d232b" stroke={P.ink} strokeWidth={1.4} />
        </g>
      )}

      {/* Hai cánh đuôi đứng cao vút + u EPAWSS đỉnh đuôi */}
      <polygon points="-38,-6 -33,-6 -35,-88 -40,-88" fill={P.f15Light} stroke={P.ink} strokeWidth={2} />
      <polygon points="38,-6 33,-6 35,-88 40,-88" fill={P.f15Light} stroke={P.ink} strokeWidth={2} />
      <circle cx={-37.5} cy={-90} r={4.2} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.4} />
      <circle cx={37.5} cy={-90} r={4.2} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.4} />

      {/* Hai cánh chính và cánh đuôi ngang */}
      <polygon points="-86,9 -108,12 -108,15 -84,13" fill={P.f15Dark} stroke={P.ink} strokeWidth={1.4} />
      <polygon points="86,9 108,12 108,15 84,13" fill={P.f15Dark} stroke={P.ink} strokeWidth={1.4} />
      <polygon
        points="-34,-5 -156.6,3 -156.6,7 -34,4"
        fill={P.f15Light}
        stroke={P.ink}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />
      <polygon
        points="34,-5 156.6,3 156.6,7 34,4"
        fill={P.f15Light}
        stroke={P.ink}
        strokeWidth={2.2}
        strokeLinejoin="round"
      />

      {/* CFT phồng sát hai bên hông thân */}
      {cft && (
        <g>
          <ellipse cx={-39} cy={9} rx={13} ry={11} fill={P.f15Dark} stroke={P.ink} strokeWidth={1.8} />
          <ellipse cx={39} cy={9} rx={13} ry={11} fill={P.f15Dark} stroke={P.ink} strokeWidth={1.8} />
        </g>
      )}

      {/* Thân nâng rộng & hai cửa hút khí chữ nhật đặc trưng */}
      <polygon points="-40,-8 40,-8 36,16 -36,16" fill={P.f15Mid} stroke={P.ink} strokeWidth={2.2} strokeLinejoin="round" />
      <rect x={-35} y={-4} width={17} height={18} rx={1.5} fill="#141d29" stroke={P.ink} strokeWidth={1.8} />
      <rect x={18} y={-4} width={17} height={18} rx={1.5} fill="#141d29" stroke={P.ink} strokeWidth={1.8} />

      {/* Lưng, vòm kính & mũi radome */}
      <ellipse cx={0} cy={-16} rx={14} ry={15} fill={P.f15Canopy} fillOpacity={0.82} stroke={P.ink} strokeWidth={2} />
      <circle cx={0} cy={-17} r={5.2} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.1} />
      <ellipse cx={0} cy={2} rx={17} ry={15} fill={P.f15Light} stroke={P.ink} strokeWidth={2.1} />
      <circle cx={0} cy={3} r={10.5} fill={P.f15Radome} stroke={P.ink} strokeWidth={1.8} />

      {/* Cửa nòng pháo xoay 6 nòng 20mm M61A1 Vulcan ở gốc cánh phải máy bay (x = -38, y = -7) */}
      <circle
        cx={-41}
        cy={-5}
        r={highlightVulcan ? 5.2 : 2.8}
        fill={highlightVulcan ? P.amberHot : '#19222e'}
        stroke={highlightVulcan ? P.flame : P.ink}
        strokeWidth={1.5}
      />

      {/* Cấu hình vũ khí nhìn trực diện */}
      {loadout === 'standard12' && (
        <g>
          {/* Station 1 & 9 đầu cánh + Station 2 & 8 (kép) + 4 góc bụng */}
          {[-141, 141].map((mx) => missileDot(mx, 16, 4.2, true))}
          {[-88, -74, 74, 88].map((mx) => missileDot(mx, 19, 4.2))}
          {[-28, -18, 18, 28].map((mx) => missileDot(mx, 22, 4.0))}
          {[-108, 108].map((mx) => missileDot(mx, 18, 4.0))}
        </g>
      )}

      {loadout === 'beast22' && (
        <g>
          {/* 22 quả tên lửa trên giá đa đạn AMBER */}
          {[-144, -126, 126, 144].map((mx) => missileDot(mx, 16, 4.0, true))}
          {[-102, -90, -78, -66, 66, 78, 90, 102].map((mx) => missileDot(mx, 20, 4.0, true))}
          {[-44, -34, -24, -14, 14, 24, 34, 44].map((mx) => missileDot(mx, 24, 3.9))}
          {[-8, 8].map((mx) => missileDot(mx, 27, 4.1, true))}
        </g>
      )}

      {loadout === 'heavyRadar' && (
        <g>
          {/* Treo đầy thùng dầu phụ + bom + tên lửa làm bùng RCS 100-200 sq ft */}
          <line x1={-76} y1={6} x2={-76} y2={20} stroke={P.f15Dark} strokeWidth={3.5} />
          <circle cx={-76} cy={27} r={11} fill={P.f15Mid} stroke={P.ink} strokeWidth={1.8} />
          <line x1={76} y1={6} x2={76} y2={20} stroke={P.f15Dark} strokeWidth={3.5} />
          <circle cx={76} cy={27} r={11} fill={P.f15Mid} stroke={P.ink} strokeWidth={1.8} />
          <line x1={0} y1={16} x2={0} y2={24} stroke={P.f15Dark} strokeWidth={3.5} />
          <circle cx={0} cy={31} r={11.5} fill={P.amber} stroke={P.ink} strokeWidth={1.8} />
          {[-141, -112, -46, -26, 26, 46, 112, 141].map((mx) => missileDot(mx, 19, 4.4, true))}
        </g>
      )}

      {loadout === 'dropTanks' && (
        <g>
          <line x1={-78} y1={6} x2={-78} y2={20} stroke={P.f15Dark} strokeWidth={3.5} />
          <circle cx={-78} cy={28} r={11.5} fill={P.amber} stroke={P.ink} strokeWidth={1.8} />
          <line x1={78} y1={6} x2={78} y2={20} stroke={P.f15Dark} strokeWidth={3.5} />
          <circle cx={78} cy={28} r={11.5} fill={P.amber} stroke={P.ink} strokeWidth={1.8} />
          {[-141, -26, 26, 141].map((mx) => missileDot(mx, 19, 4.0))}
        </g>
      )}
    </g>
  );
};

/**
 * F-35A Lightning II nhìn ngang tỉ lệ 1:1 (15.67 m x 4.38 m -> 376.1 px x 105.1 px ở 24 px/m).
 * Mũi hướng +X (x = +188), loa phụt F135 ở x = -188.
 */
export const F35Side2D: React.FC<
  TransformProps & {
    afterburner?: number;
    bayOpen?: boolean;
    gear?: boolean;
    externalStores?: boolean;
  }
> = ({ afterburner = 0, bayOpen = false, gear = false, externalStores = false, opacity = 1, ...tf }) => (
  <g transform={wrapTf(tf)} opacity={opacity}>
    {afterburner > 0 && (
      <g>
        <polygon points={`-188,-6 ${-188 - 105 * afterburner},2 -188,10`} fill={P.flame} opacity={0.75} />
        <polygon points={`-188,-3.5 ${-188 - 64 * afterburner},2 -188,7.5`} fill={P.amberHot} />
      </g>
    )}
    {gear && (
      <g>
        <line x1={96} y1={12} x2={98} y2={28} stroke={P.ordWhite} strokeWidth={3} />
        <circle cx={98} cy={29} r={6} fill="#1d232b" stroke={P.ink} strokeWidth={1.5} />
        <line x1={-24} y1={13} x2={-26} y2={27} stroke={P.ordWhite} strokeWidth={3.6} />
        <circle cx={-26} cy={28} r={8.5} fill="#1d232b" stroke={P.ink} strokeWidth={1.6} />
      </g>
    )}
    {/* Cánh đuôi đứng nghiêng 25 độ phía xa */}
    <polygon points="-152,-8 -98,-8 -134,-74 -166,-72" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.5} />

    {/* Thân tàng hình vát chine sắc */}
    <path
      d="M188,3 L142,-9 L106,-11 Q74,-25 32,-21 L-156,-12 L-172,-9 L-172,13 L-144,15 L44,15 L136,11 Z"
      fill={P.f35Mid}
      stroke={P.ink}
      strokeWidth={2.1}
      strokeLinejoin="round"
    />
    {/* Gờ chine sáng chạy dọc thân */}
    <path d="M188,3 L138,1 L-168,2 L-172,-9 L32,-16 L142,-9 Z" fill={P.f35Light} opacity={0.62} />
    <line x1={186} y1={3} x2={-166} y2={2} stroke={P.f35Tape} strokeWidth={1.5} opacity={0.85} />

    {/* Lăng kính EOTS dưới cằm mũi */}
    <polygon points="142,10 132,15 122,11" fill={P.f35Canopy} stroke={P.ink} strokeWidth={1.2} />

    {/* Cửa hút khí DSI bầu tròn không vách tách */}
    <path d="M68,-5 Q54,2 56,14 L-18,14 L-18,-5 Z" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.7} />

    {/* Vòm kính mạ vàng liền khối không gọng giữa */}
    <path
      d="M126,-10 Q94,-28 48,-22 L34,-15 Z"
      fill={P.f35Canopy}
      fillOpacity={0.84}
      stroke={P.ink}
      strokeWidth={1.9}
    />

    {/* Cánh chính & loa phụt răng cưa F135 */}
    <polygon points="22,2 -88,5 -98,9 10,7" fill={P.f35Light} stroke={P.ink} strokeWidth={1.7} />
    <polygon points="-172,-8 -188,-6 -184,2 -188,10 -172,12" fill="#232933" stroke={P.ink} strokeWidth={1.7} />

    {/* Cánh đuôi đứng nghiêng gần & cánh đuôi ngang */}
    <polygon points="-142,-9 -84,-9 -124,-77 -158,-75" fill={P.f35Light} stroke={P.ink} strokeWidth={2} strokeLinejoin="round" />
    <polygon points="-138,5 -180,8 -186,12 -148,11" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.6} />

    {bayOpen && (
      <g>
        <polygon points="-48,15 36,15 30,24 -42,24" fill="#182230" stroke={P.f35Tape} strokeWidth={1.4} />
        <Weapon2D kind="amraam" x={-6} y={20} scale={0.92} />
      </g>
    )}
    {externalStores && (
      <g>
        <polygon points="-38,8 14,8 8,18 -30,18" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.4} />
        <Weapon2D kind="bunkerbuster" x={-12} y={23} scale={0.85} />
      </g>
    )}
  </g>
);

/**
 * F-35A hình chiếu bằng (trên xuống hoặc dưới bụng lộ khoang vũ khí 12 ft), tỉ lệ 1:1 (376.1 px x 256.8 px).
 */
export const F35Top2D: React.FC<
  TransformProps & {
    underside?: boolean;
    bayOpen?: boolean;
    externalStores?: boolean;
  }
> = ({ underside = false, bayOpen = false, externalStores = false, opacity = 1, ...tf }) => (
  <g transform={wrapTf(tf)} opacity={opacity}>
    {/* Cánh hình thang góc song song chuẩn tàng hình */}
    <polygon
      points="44,-26 -36,-128.4 -84,-128.4 -72,-28"
      fill={P.f35Mid}
      stroke={P.ink}
      strokeWidth={2.1}
      strokeLinejoin="round"
    />
    <polygon
      points="44,26 -36,128.4 -84,128.4 -72,28"
      fill={P.f35Mid}
      stroke={P.ink}
      strokeWidth={2.1}
      strokeLinejoin="round"
    />
    {/* Cánh đuôi ngang cùng góc quét */}
    <polygon points="-118,-22 -162,-78 -186,-78 -168,-20" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.9} />
    <polygon points="-118,22 -162,78 -186,78 -168,20" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.9} />

    {/* Thân tàng hình kim cương */}
    <path
      d="M188,0 L132,-18 L72,-29 L-144,-28 L-172,-14 L-172,14 L-144,28 L72,29 L132,18 Z"
      fill={P.f35Mid}
      stroke={P.ink}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
    <path d="M182,0 L124,-13 L-156,-14 L-156,14 L124,13 Z" fill={P.f35Light} opacity={0.42} />
    {/* Dải băng viền răng cưa RAM đặc trưng */}
    <path d="M42,-25 L-68,-26 M42,25 L-68,26" stroke={P.f35Tape} strokeWidth={2} strokeDasharray="7 4" />
    {/* Loa phụt đơn răng cưa F135 */}
    <polygon points="-172,-12 -188,-9 -184,-3 -188,0 -184,3 -188,9 -172,12" fill="#232933" stroke={P.ink} strokeWidth={1.6} />

    {!underside ? (
      <>
        <ellipse cx={78} cy={0} rx={42} ry={10} fill={P.f35Canopy} fillOpacity={0.86} stroke={P.ink} strokeWidth={1.8} />
        {/* Hai cánh đuôi đứng nghiêng ra ngoài */}
        <polygon points="-114,-24 -168,-44 -176,-38 -122,-20" fill={P.f35Light} stroke={P.ink} strokeWidth={1.7} />
        <polygon points="-114,24 -168,44 -176,38 -122,20" fill={P.f35Light} stroke={P.ink} strokeWidth={1.7} />
      </>
    ) : (
      <>
        {/* Hai khoang vũ khí giấu trong bụng dài đúng 12 ft (3.66 m -> 88 px) */}
        <rect
          x={-48}
          y={-23}
          width={90}
          height={17}
          rx={2}
          fill={bayOpen ? '#111a26' : P.f35Dark}
          stroke={P.f35Tape}
          strokeWidth={1.8}
        />
        <rect
          x={-48}
          y={6}
          width={90}
          height={17}
          rx={2}
          fill={bayOpen ? '#111a26' : P.f35Dark}
          stroke={P.f35Tape}
          strokeWidth={1.8}
        />
        {bayOpen && (
          <>
            <Weapon2D kind="amraam" x={-3} y={-19} scale={0.92} />
            <Weapon2D kind="amraam" x={-3} y={-10} scale={0.92} />
            <Weapon2D kind="amraam" x={-3} y={10} scale={0.92} />
            <Weapon2D kind="amraam" x={-3} y={19} scale={0.92} />
          </>
        )}
      </>
    )}

    {externalStores && (
      <>
        <Weapon2D kind="bunkerbuster" x={-18} y={-68} scale={0.82} />
        <Weapon2D kind="bunkerbuster" x={-18} y={68} scale={0.82} />
        <Weapon2D kind="aim9x" x={-36} y={-112} scale={0.85} />
        <Weapon2D kind="aim9x" x={-36} y={112} scale={0.85} />
      </>
    )}
  </g>
);

/** F-35A nhìn trực diện từ mũi (10.70 m = 256.8 px, cao 4.38 m = 105.1 px) cho S02 & S13. */
export const F35Front2D: React.FC<
  TransformProps & {
    bayOpen?: boolean;
    externalStores?: boolean;
  }
> = ({ bayOpen = false, externalStores = false, opacity = 1, ...tf }) => (
  <g transform={wrapTf(tf)} opacity={opacity}>
    {/* Hai cánh đuôi đứng nghiêng chữ V 25 độ */}
    <polygon points="-22,-6 -48,-66 -43,-68 -17,-6" fill={P.f35Light} stroke={P.ink} strokeWidth={1.9} />
    <polygon points="22,-6 48,-66 43,-68 17,-6" fill={P.f35Light} stroke={P.ink} strokeWidth={1.9} />
    {/* Cánh chính vát mỏng */}
    <polygon points="-28,-2 -128.4,3 -128.4,6 -28,5" fill={P.f35Mid} stroke={P.ink} strokeWidth={2} />
    <polygon points="28,-2 128.4,3 128.4,6 28,5" fill={P.f35Mid} stroke={P.ink} strokeWidth={2} />
    {/* Thân tàng hình thiết diện hình thoi vát chine */}
    <polygon
      points="0,-16 36,1 24,14 -24,14 -36,1"
      fill={P.f35Mid}
      stroke={P.ink}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
    <polygon points="0,-16 36,1 -36,1" fill={P.f35Light} opacity={0.55} />
    {/* Hốc hút khí DSI */}
    <polygon points="-31,1 -18,-3 -18,10 -26,11" fill="#131922" />
    <polygon points="31,1 18,-3 18,10 26,11" fill="#131922" />
    {/* Vòm kính vàng & mũi kim cương */}
    <ellipse cx={0} cy={-16} rx={12} ry={11} fill={P.f35Canopy} fillOpacity={0.86} stroke={P.ink} strokeWidth={1.9} />
    <polygon points="0,-5 16,1 0,8 -16,1" fill={P.f35Dark} stroke={P.f35Tape} strokeWidth={1.4} />

    {bayOpen && (
      <g>
        <line x1={-16} y1={14} x2={-22} y2={26} stroke={P.f35Tape} strokeWidth={2.4} />
        <line x1={16} y1={14} x2={22} y2={26} stroke={P.f35Tape} strokeWidth={2.4} />
        <circle cx={-8} cy={17} r={3.6} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.2} />
        <circle cx={8} cy={17} r={3.6} fill={P.ordWhite} stroke={P.ink} strokeWidth={1.2} />
      </g>
    )}
    {externalStores && (
      <g>
        {[-106, -68, 68, 106].map((mx, i) => (
          <g key={i}>
            <line x1={mx} y1={5} x2={mx} y2={18} stroke={P.f35Dark} strokeWidth={2.6} />
            <circle cx={mx} cy={22} r={i === 1 || i === 2 ? 7.5 : 4.2} fill={P.red} stroke={P.ink} strokeWidth={1.5} />
          </g>
        ))}
      </g>
    )}
  </g>
);

/** F-22A Raptor nhìn ngang tỉ lệ 1:1 (18.92 m -> 454 px) cho cảnh đua tốc độ Mach 2.25 (S16). */
export const F22Side2D: React.FC<TransformProps & { afterburner?: number }> = ({
  afterburner = 0,
  opacity = 1,
  ...tf
}) => (
  <g transform={wrapTf(tf)} opacity={opacity}>
    {afterburner > 0 && (
      <polygon points={`-227,-5 ${-227 - 95 * afterburner},2 -227,9`} fill={P.amber} opacity={0.82} />
    )}
    <polygon points="-192,-7 -118,-7 -158,-84 -198,-80" fill={P.f22Dark} stroke={P.ink} strokeWidth={1.5} />
    <path
      d="M227,3 L168,-8 L124,-11 Q90,-26 42,-20 L-198,-10 L-227,-6 L-227,10 L-196,13 L64,13 L158,9 Z"
      fill={P.f22Mid}
      stroke={P.ink}
      strokeWidth={2}
      strokeLinejoin="round"
    />
    <path d="M227,3 L162,1 L-220,1 L-198,-10 L42,-16 L168,-8 Z" fill={P.f22Light} opacity={0.6} />
    <polygon points="78,-4 64,12 -14,12 -14,-5" fill={P.f22Dark} stroke={P.ink} strokeWidth={1.6} />
    <path d="M142,-9 Q106,-27 54,-20 L40,-14 Z" fill={P.f35Canopy} fillOpacity={0.82} stroke={P.ink} strokeWidth={1.8} />
    <polygon points="-178,-8 -102,-8 -146,-88 -188,-84" fill={P.f22Light} stroke={P.ink} strokeWidth={1.9} />
  </g>
);

/** UAV tàng hình hiệp đồng CCA Loyal Wingman nhìn từ trên (9.14 m x 8.23 m -> 219 px x 198 px). */
export const DroneTop2D: React.FC<TransformProps & { accent?: string }> = ({
  accent = P.cyan,
  opacity = 1,
  ...tf
}) => (
  <g transform={wrapTf(tf)} opacity={opacity}>
    <polygon points="18,-14 -42,-99 -72,-92 -44,-16" fill={P.f22Mid} stroke={P.ink} strokeWidth={1.8} />
    <polygon points="18,14 -42,99 -72,92 -44,16" fill={P.f22Mid} stroke={P.ink} strokeWidth={1.8} />
    <polygon points="-76,-12 -106,-44 -112,-36 -94,-10" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.6} />
    <polygon points="-76,12 -106,44 -112,36 -94,10" fill={P.f35Dark} stroke={P.ink} strokeWidth={1.6} />
    <polygon
      points="110,0 64,-13 -88,-15 -110,-7 -104,0 -110,7 -88,15 64,13"
      fill={P.f22Light}
      stroke={P.ink}
      strokeWidth={1.9}
      strokeLinejoin="round"
    />
    <polygon points="22,-7 -16,-9 -24,0 -16,9 22,7" fill="#182230" stroke={P.ink} strokeWidth={1.3} />
    <polygon points="84,0 68,-5 56,0 68,5" fill={accent} />
  </g>
);
