// scenes/_assets.ts — Toàn bộ vật vẽ và nền của project 8_new.
// Quy chuẩn nét vẽ: code-video-2d; bảng màu duy nhất: P trong ./shared/palette.
import * as A from './shared/art';
import { P, LINE } from './shared/palette';
import { rig } from './shared/rig';

export type TankView = 'side' | 'cutaway' | 'top' | 'top-cutaway' | 'front';

export interface TankOpts {
  x: number;
  y: number;
  s?: number;
  dir?: 1 | -1;
  view?: TankView;
  side?: 'ally' | 'foe';
  /** Góc xoay thân xe (radian, dùng khi leo dốc/lún bùn hoặc xoay trên bản đồ top) */
  hullRot?: number;
  /** Góc nâng/hạ nòng ở góc side/cutaway (radian, dương = nâng lên, âm = chúc xuống) */
  gunPitch?: number;
  /** Góc quay tháp pháo ở góc top/top-cutaway (radian so với thân) */
  turretYaw?: number;
  /** Độ giật lùi của nòng pháo 0..1 */
  recoil?: number;
  /** Pha lăn xích */
  wheelPhase?: number;
  /** Kiểu bố trí khoang đạn khi ở cutaway / top-cutaway: 'bustle' (khoang đuôi có blow-off) | 'carousel' (vòng đạn dưới sàn) | 'manual' (nạp tay 4 người) */
  ammoLayout?: 'bustle' | 'carousel' | 'manual';
  /** Số đạn hiển thị (tối đa 12 ở mặt cắt ngang, 20 ở mặt cắt tròn) */
  ammoCount?: number;
  /** Độ sáng nhấn vào vùng đạn / thuốc phóng 0..1 */
  ammoGlow?: number;
  /** Nhấn sáng các hệ thống bên trong khi giải thích (breech, sight, computer, engine, armor, crew) */
  highlightPart?: 'none' | 'ammo' | 'breech' | 'sight' | 'computer' | 'engine' | 'armor' | 'crew' | 'autoloader';
  /** Có gắn gạch giáp phản ứng nổ ERA bên ngoài không */
  hasERA?: boolean;
  /** Có gắn lồng thép chống drone trên nóc không */
  hasCage?: boolean;
  /** Trạng thái đứt xích 0..1 */
  brokenTrack?: number;
  /** Trạng thái bung tấm thoát nổ (blow-off panel) 0..1 */
  blowOffOpen?: number;
  /** Độ bung rời tháp pháo (turret toss) 0..1 */
  turretToss?: number;
  /** Trạng thái bị cháy đen bên trong nhưng nguyên vỏ ngoài 0..1 */
  burntInside?: number;
}

export interface TankSockets {
  muzzle: A.Pt;
  muzzleAng: number;
  breech: A.Pt;
  sight: A.Pt;
  turretCenter: A.Pt;
  ammoCenter: A.Pt;
  engineCenter: A.Pt;
}

/** Vẽ xe tăng chủ lực (MBT) ở 5 chế độ nhìn: side, cutaway, top, top-cutaway, front */
export function drawTank(c: CanvasRenderingContext2D, o: TankOpts): TankSockets {
  const s = o.s ?? 1;
  const dir = o.dir ?? 1;
  const view = o.view ?? 'side';
  const isFoe = o.side === 'foe';
  const bodyCol = isFoe ? P.enemy : P.olive;
  const darkCol = isFoe ? P.ink : P.oliveDark;
  const lightCol = isFoe ? P.enemyLight : P.oliveLight;
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);

  const hullRot = o.hullRot ?? 0;
  const gunPitch = o.gunPitch ?? 0;
  const recoil = (o.recoil ?? 0) * 18;
  const layout = o.ammoLayout ?? 'bustle';
  const hl = o.highlightPart ?? 'none';

  // Điểm trả về mặc định
  let muzzleLocal: A.Pt = [310 - recoil, -98];
  let breechLocal: A.Pt = [30, -96];
  let sightLocal: A.Pt = [58, -142];
  let turretLocal: A.Pt = [0, -102];
  let ammoLocal: A.Pt = layout === 'carousel' ? [0, -44] : [-105, -104];
  let engineLocal: A.Pt = [-155, -52];

  c.save();
  c.translate(o.x, o.y);
  if (view === 'top' || view === 'top-cutaway') {
    c.rotate(hullRot);
    c.scale(s, s);
  } else {
    c.rotate(hullRot);
    c.scale(dir * s, s);
  }

  if (view === 'side' || view === 'cutaway') {
    const isCut = view === 'cutaway';
    const isCarousel = layout === 'carousel';
    // 1. Dải xích và 6 bánh chịu nặng (y=0 là mặt đất tiếp xúc đáy xích)
    const brk = o.brokenTrack ?? 0;
    if (brk > 0.01) {
      // Xích bị đứt tuột ra phía trước/sau
      A.poly(
        c,
        [
          [-235 - brk * 55, -6],
          [225 + brk * 65, -6],
          [240, -34],
          [-240, -34],
        ],
        P.dark,
        P.ink,
        lwO
      );
      A.line(
        c,
        [
          [175, -12],
          [255 + brk * 80, -3],
          [295 + brk * 90, -14],
        ],
        P.enemy,
        lwO * 1.2
      );
    } else {
      // Bao xích nguyên vẹn
      A.rrect(c, -238, -56, 476, 56, 26, P.dark, P.ink, lwO);
      A.rrect(c, -226, -48, 452, 40, 18, darkCol, P.ink2, lwI);
    }

    // 6 bánh chịu nặng + 2 bánh dẫn động đầu/cuối
    const wp = o.wheelPhase ?? 0;
    for (let i = 0; i < 6; i++) {
      const wx = -165 + i * 66;
      const wy = -25;
      A.circle(c, wx, wy, 21, P.slate, P.ink, lwO * 0.85);
      A.circle(c, wx, wy, 9, P.light, P.ink2, lwI);
      const a = wp + i * 0.7;
      A.line(
        c,
        [
          [wx + Math.cos(a) * 16, wy + Math.sin(a) * 16],
          [wx - Math.cos(a) * 16, wy - Math.sin(a) * 16],
        ],
        P.ink2,
        lwI
      );
    }
    // Bánh chủ động sau & bánh dẫn hướng trước
    A.circle(c, -212, -33, 16, P.slate, P.ink, lwI);
    A.circle(c, 212, -33, 16, P.slate, P.ink, lwI);

    // 2. Thân xe (Hull)
    const hullPts: A.Pt[] = [
      [-242, -46],
      [-232, -82],
      [158, -82],
      [252, -56],
      [230, -36],
      [-235, -36],
    ];
    A.poly(c, hullPts, isCut ? P.paper : bodyCol, P.ink, lwO);

    if (!isCut) {
      // Váy chắn xích (side skirts)
      A.poly(
        c,
        [
          [-228, -42],
          [-228, -72],
          [218, -72],
          [236, -50],
          [215, -42],
        ],
        bodyCol,
        P.ink,
        lwI
      );
      for (let i = -3; i <= 2; i++) {
        A.line(c, [[i * 64, -72], [i * 64, -42]], P.ink2, lwI);
      }
      // Giáp trước mũi dày
      A.poly(
        c,
        [
          [148, -82],
          [252, -56],
          [230, -36],
          [148, -50],
        ],
        hl === 'armor' ? P.amber : lightCol,
        P.ink,
        lwI
      );
    } else {
      // MẶT CẮT THÂN XE (Cutaway Hull)
      // Viền vỏ thép mặt cắt dày ở mũi trước, mỏng ở gầm và sau
      A.poly(
        c,
        [
          [152, -82],
          [252, -56],
          [230, -36],
          [145, -46],
        ],
        hl === 'armor' ? P.amber : P.slate,
        P.ink,
        lwI
      );
      // Khoang động cơ phía sau (-230..-105)
      const engFill = hl === 'engine' ? P.amber : P.light;
      A.rrect(c, -224, -76, 110, 36, 6, engFill, P.ink, lwI);
      for (let i = 0; i < 4; i++) {
        A.rrect(c, -214 + i * 24, -71, 16, 26, 3, P.slate, P.ink2, lwI * 0.8);
      }
      // Vách ngăn khoang máy
      A.line(c, [[-110, -82], [-110, -36]], P.ink, lwO * 0.8);

      // Lái xe nằm/ngồi nghiêng ở mũi xe (x = 112, y = -36)
      const crewAlpha = o.burntInside ? 0.25 : 1;
      rig(c, {
        x: 112,
        y: -36,
        s: 0.56,
        dir: 1,
        skin: hl === 'crew' ? { body: P.amber, limb: P.oliveDark, hat: true } : 'ally',
        weapon: null,
        aim: 0.35,
        alpha: crewAlpha,
      });

      // Nếu là bố trí vòng đạn dưới sàn (carousel): vẽ băng chuyền đạn màu amber ngay dưới chân kíp lái
      if (isCarousel) {
        const glow = o.ammoGlow ?? 0;
        const cCol = A.lerpColor(P.amber, P.enemy, glow);
        A.rrect(c, -86, -54, 168, 16, 5, P.dark, P.ink, lwI);
        const nRounds = Math.min(10, o.ammoCount ?? 10);
        for (let i = 0; i < nRounds; i++) {
          const rx = -76 + i * 16;
          A.rrect(c, rx, -51, 12, 10, 2, cCol, P.ink, lwI * 0.7);
        }
        if (hl === 'autoloader' || hl === 'ammo') {
          // Tay gắp đạn từ sàn lên khóa nòng
          A.line(c, [[-10, -46], [10, -92]], P.amber, lwO);
        }
      } else {
        // Sàn giỏ tháp pháo thông thường + vài viên đạn dự trữ trong thân
        A.line(c, [[-95, -42], [95, -42]], P.slate, lwI);
        const nHullAmmo = Math.min(6, Math.floor((o.ammoCount ?? 12) / 3));
        for (let i = 0; i < nHullAmmo; i++) {
          A.rrect(c, -92 + i * 14, -72, 10, 26, 2, P.amber, P.ink, lwI * 0.7);
        }
      }
    }

    // 3. Tháp pháo & Pháo chính (có thể bị hất tung nếu turretToss > 0)
    const toss = o.turretToss ?? 0;
    const tossY = -toss * 210;
    const tossX = -toss * 45;
    const tossRot = -toss * 0.65;

    c.save();
    c.translate(tossX, tossY);
    c.rotate(tossRot);

    // Cụm nòng pháo 120mm (xoay quanh trục khóa nòng [35, -98])
    c.save();
    c.translate(35, -98);
    c.rotate(-gunPitch);
    const gx = -recoil;
    // Thân nòng chính
    A.rrect(c, gx, -7, 275, 14, 3, P.dark, P.ink, lwO);
    // Bầu hút khói thuốc phóng (bore evacuator) ở giữa nòng — dấu nhận dạng đặc trưng của MBT
    A.rrect(c, gx + 105, -12, 56, 24, 5, lightCol, P.ink, lwO);
    // Đầu nòng có cảm biến chuẩn trực (muzzle reference sensor)
    A.rrect(c, gx + 262, -9, 16, 18, 2, P.slate, P.ink, lwI);
    A.rrect(c, gx + 266, -16, 8, 7, 1, P.amber, P.ink, lwI * 0.8);
    c.restore();

    // Tính vị trí đầu nòng sau khi nâng/hạ
    const mDist = 275 - recoil;
    muzzleLocal = [35 + Math.cos(-gunPitch) * mDist, -98 + Math.sin(-gunPitch) * mDist];

    // Khung tháp pháo (Turret)
    // Nếu là carousel (kiểu phương Đông), tháp pháo thấp và vòm hơn một chút; mặc định vát đa diện hiện đại
    const turPts: A.Pt[] = isCarousel
      ? [
          [-105, -82],
          [-95, -124],
          [45, -126],
          [115, -98],
          [85, -82],
        ]
      : [
          [-155, -82],
          [-148, -132],
          [55, -134],
          [128, -98],
          [92, -82],
        ];

    const turFill = isCut
      ? o.burntInside && o.burntInside > 0.3
        ? '#3b2f2f'
        : P.paper
      : lightCol;
    A.poly(c, turPts, turFill, P.ink, lwO);

    if (!isCut) {
      // Mặt vát giáp trước tháp pháo dày
      A.poly(
        c,
        [
          [42, -134],
          [128, -98],
          [92, -82],
          [38, -82],
        ],
        hl === 'armor' ? P.amber : bodyCol,
        P.ink,
        lwI
      );
      // Khoang đạn đuôi tháp pháo (bustle) bên ngoài
      if (!isCarousel) {
        A.rrect(c, -150, -128, 78, 40, 4, bodyCol, P.ink, lwI);
      }
    } else {
      // MẶT CẮT THÁP PHÁO (Cutaway Turret)
      // Lớp giáp phức hợp mặt trước tháp pháo (steel - ceramic - steel)
      const armCol = hl === 'armor' ? P.amber : P.slate;
      A.poly(
        c,
        [
          [50, -134],
          [128, -98],
          [92, -82],
          [46, -82],
        ],
        armCol,
        P.ink,
        lwI
      );
      A.line(c, [[68, -126], [96, -86]], P.paper, lwI);
      A.line(c, [[82, -118], [108, -88]], P.ink, lwI);

      // Khóa nòng pháo (Gun breech) ở giữa tháp pháo
      const brCol = hl === 'breech' ? P.amber : P.slate;
      A.rrect(c, -2, -112, 48, 28, 4, brCol, P.ink, lwO * 0.85);

      // Máy tính đường đạn (Ballistic computer) & cảm biến
      const compCol = hl === 'computer' ? P.sky : P.dark;
      A.rrect(c, 32, -128, 24, 14, 3, compCol, P.ink, lwI);

      // Kíp lái trong tháp pháo: Pháo thủ (trước) & Trưởng xe (sau)
      const crewSkin = hl === 'crew' ? { body: P.amber, limb: P.oliveDark, hat: true } : 'ally';
      const crewAlpha = o.burntInside ? 0.2 : 1;
      // Pháo thủ ngồi ngắm
      rig(c, {
        x: 24,
        y: -44,
        s: 0.62,
        dir: 1,
        skin: crewSkin,
        weapon: null,
        aim: 0.2,
        alpha: crewAlpha,
      });
      // Trưởng xe ngồi cao hơn
      rig(c, {
        x: -24,
        y: -46,
        s: 0.68,
        dir: 1,
        skin: crewSkin,
        weapon: null,
        aim: 0.05,
        alpha: crewAlpha,
      });

      // Nếu nạp đạn bằng người (manual): vẽ người thứ 4 đứng nạp viên đạn nặng 20kg
      if (layout === 'manual') {
        rig(c, {
          x: -58,
          y: -42,
          s: 0.72,
          dir: 1,
          skin: crewSkin,
          weapon: null,
          aim: 0.4,
          alpha: crewAlpha,
        });
        // Viên đạn trên tay người nạp
        A.rrect(c, -46, -98, 38, 10, 3, P.amber, P.ink, lwI);
      }

      // Khoang chứa đạn đuôi tháp pháo (Bustle ammo rack) + Vách ngăn + Blow-off panel
      if (!isCarousel) {
        // Vách ngăn an toàn (blast door) giữa kíp lái và khoang đạn đuôi
        A.line(c, [[-76, -128], [-76, -82]], P.ink, lwO);
        const glow = o.ammoGlow ?? 0;
        const rCol = A.lerpColor(P.amber, P.enemy, glow);
        const nBustle = Math.min(12, o.ammoCount ?? 12);
        for (let i = 0; i < nBustle; i++) {
          const col = i % 4;
          const row = Math.floor(i / 4);
          const rx = -144 + col * 16;
          const ry = -120 + row * 12;
          A.rrect(c, rx, ry, 13, 9, 2, rCol, P.ink, lwI * 0.75);
        }
        // Tấm bung thoát nổ trên nóc khoang đuôi (Blow-off panels)
        const bo = o.blowOffOpen ?? 0;
        c.save();
        c.translate(-148, -128);
        c.rotate(-bo * 1.15);
        A.rrect(c, 0, -5, 36, 6, 2, bo > 0.05 ? P.amber : P.oliveDark, P.ink, lwI);
        c.restore();

        c.save();
        c.translate(-78, -128);
        c.rotate(bo * 1.15);
        A.rrect(c, -36, -5, 36, 6, 2, bo > 0.05 ? P.amber : P.oliveDark, P.ink, lwI);
        c.restore();
      }
    }

    // Kính ngắm nhiệt & đo xa laser trên nóc tháp pháo (CITV / Gunner primary sight)
    const sCol = hl === 'sight' ? P.sky : P.glass;
    A.rrect(c, 42, -148, 28, 18, 4, bodyCol, P.ink, lwO * 0.85);
    A.rrect(c, 58, -145, 12, 12, 2, sCol, P.ink, lwI);
    // Nắp trưởng xe
    A.rrect(c, -38, -138, 34, 10, 3, darkCol, P.ink, lwI);

    // Gạch giáp phản ứng nổ ERA bên ngoài nếu bật hasERA
    if (o.hasERA) {
      for (let i = 0; i < 4; i++) {
        A.rrect(c, 62 + i * 15, -124 + i * 7, 14, 9, 2, P.oliveDark, P.ink, lwI);
      }
      for (let i = 0; i < 6; i++) {
        A.rrect(c, -40 + i * 38, -74, 32, 16, 2, P.oliveDark, P.ink, lwI);
      }
    }

    // Lồng thép chống drone trên nóc (Cope cage) nếu bật hasCage
    if (o.hasCage) {
      A.line(c, [[-130, -128], [-140, -172]], P.slate, lwO * 0.8);
      A.line(c, [[55, -130], [65, -172]], P.slate, lwO * 0.8);
      A.line(c, [[-155, -172], [80, -172]], P.ink, lwO);
      for (let i = -145; i <= 70; i += 24) {
        A.line(c, [[i, -172], [i + 8, -162]], P.slate, lwI);
      }
    }

    c.restore(); // end turret toss
  } else if (view === 'top' || view === 'top-cutaway') {
    const isCut = view === 'top-cutaway';
    const isCarousel = layout === 'carousel';
    // Thân xe nhìn từ trên xuống: dài 460 (-230..230), rộng 230 (-115..115)
    // Hai dải xích hai bên
    A.rrect(c, -232, -118, 464, 42, 10, P.dark, P.ink, lwO);
    A.rrect(c, -232, 76, 464, 42, 10, P.dark, P.ink, lwO);
    for (let x = -210; x <= 210; x += 28) {
      A.line(c, [[x, -116], [x, -78]], P.ink2, lwI * 0.8);
      A.line(c, [[x, 78], [x, 116]], P.ink2, lwI * 0.8);
    }

    // Thân chính giữa hai dải xích
    const hullTopPts: A.Pt[] = [
      [-226, -84],
      [195, -84],
      [236, -54],
      [236, 54],
      [195, 84],
      [-226, 84],
    ];
    A.poly(c, hullTopPts, isCut ? P.paper : bodyCol, P.ink, lwO);

    // Nếu highlightPart === 'armor', tô rõ giáp trước rất dày và giáp sườn/sau mỏng
    if (hl === 'armor') {
      // Giáp trước thân dày (màu amber/oliveDark nổi bật)
      A.poly(
        c,
        [
          [165, -84],
          [236, -54],
          [236, 54],
          [165, 84],
        ],
        P.amber,
        P.ink,
        lwO
      );
      // Viền mỏng hai bên sườn và đuôi
      A.line(c, [[-226, -84], [165, -84]], P.enemy, lwO);
      A.line(c, [[-226, 84], [165, 84]], P.enemy, lwO);
    } else {
      // Lưới tản nhiệt động cơ phía sau (-215..-130)
      A.rrect(c, -212, -64, 76, 56, 4, darkCol, P.ink2, lwI);
      A.rrect(c, -212, 8, 76, 56, 4, darkCol, P.ink2, lwI);
    }

    // Tháp pháo xoay theo turretYaw
    const yaw = o.turretYaw ?? 0;
    c.save();
    c.rotate(yaw);

    if (isCarousel && isCut) {
      // Băng chuyền đạn tròn (Carousel ring) dưới sàn tháp pháo nhìn từ trên xuống!
      A.circle(c, 0, 0, 74, P.dark, P.ink, lwO);
      A.circle(c, 0, 0, 40, P.paper, P.ink2, lwI);
      const nR = o.ammoCount ?? 18;
      const glow = o.ammoGlow ?? 0;
      const rCol = A.lerpColor(P.amber, P.enemy, glow);
      for (let i = 0; i < nR; i++) {
        const a = (i / 18) * Math.PI * 2;
        c.save();
        c.rotate(a);
        A.rrect(c, 44, -5, 26, 10, 3, rCol, P.ink, lwI * 0.75);
        c.restore();
      }
    }

    // Hình dáng tháp pháo nhìn từ trên
    const turTopPts: A.Pt[] = isCarousel
      ? [
          [-92, -68],
          [35, -76],
          [98, -38],
          [98, 38],
          [35, 76],
          [-92, 68],
        ]
      : [
          [-145, -66],
          [42, -74],
          [108, -38],
          [108, 38],
          [42, 74],
          [-145, 66],
        ];
    A.withA(c, isCarousel && isCut ? 0.35 : 1, () => {
      A.poly(c, turTopPts, isCut ? P.paper : lightCol, P.ink, lwO);
    });

    if (hl === 'armor') {
      // Giáp mặt trước tháp pháo rất dày
      A.poly(
        c,
        [
          [42, -74],
          [108, -38],
          [108, 38],
          [42, 74],
          [64, 28],
          [64, -28],
        ],
        P.amber,
        P.ink,
        lwO
      );
    }

    // Nếu là top-cutaway với khoang đạn đuôi (bustle): vẽ các viên đạn xếp ngang ở đuôi tháp pháo + tấm thoát nổ
    if (isCut && !isCarousel) {
      A.line(c, [[-68, -66], [-68, 66]], P.ink, lwO);
      const glow = o.ammoGlow ?? 0;
      const rCol = A.lerpColor(P.amber, P.enemy, glow);
      const nB = Math.min(14, o.ammoCount ?? 14);
      for (let i = 0; i < nB; i++) {
        const side = i < 7 ? -1 : 1;
        const idx = i % 7;
        A.rrect(c, -136 + idx * 9, side < 0 ? -56 : 12, 7, 42, 2, rCol, P.ink, lwI * 0.7);
      }
      // Khóa nòng ở giữa
      A.rrect(c, -18, -16, 62, 32, 4, P.slate, P.ink, lwI);
      // Đầu kíp lái nhìn từ trên
      A.circle(c, 22, -36, 13, P.oliveDark, P.ink, lwI);
      A.circle(c, -24, 34, 13, P.oliveDark, P.ink, lwI);
    } else if (!isCut) {
      // Nắp trưởng xe, pháo thủ và tấm blow-off trên nóc
      A.circle(c, -22, 32, 18, darkCol, P.ink, lwI);
      A.circle(c, 18, -32, 15, darkCol, P.ink, lwI);
      if (!isCarousel) {
        A.rrect(c, -134, -52, 56, 44, 3, bodyCol, P.ink2, lwI);
        A.rrect(c, -134, 8, 56, 44, 3, bodyCol, P.ink2, lwI);
      }
    }

    // Nòng pháo 120mm vươn ra phía trước
    const gx = 88 - recoil;
    A.rrect(c, gx, -8, 225, 16, 3, P.dark, P.ink, lwO);
    A.rrect(c, gx + 88, -13, 52, 26, 5, lightCol, P.ink, lwO);

    c.restore(); // end turretYaw

    const mDist = 313 - recoil;
    muzzleLocal = [Math.cos(yaw) * mDist, Math.sin(yaw) * mDist];
    turretLocal = [0, 0];
    breechLocal = [0, 0];
    sightLocal = [30, -30];
    ammoLocal = isCarousel ? [0, 0] : [-105, 0];
    engineLocal = [-175, 0];
  } else if (view === 'front') {
    // Góc nhìn chính diện (Front view): dùng khi đối chiếu chiều cao/bề rộng xe 3 người vs 4 người hoặc áp suất mặt đất
    const hScale = layout === 'carousel' ? 0.86 : 1;
    // Hai dải xích hai bên
    A.rrect(c, -132, -58, 52, 58, 8, P.dark, P.ink, lwO);
    A.rrect(c, 80, -58, 52, 58, 8, P.dark, P.ink, lwO);
    for (let y = -48; y <= -10; y += 12) {
      A.line(c, [[-126, y], [-86, y]], P.slate, lwI);
      A.line(c, [[86, y], [126, y]], P.slate, lwI);
    }
    // Thân xe giữa
    A.rrect(c, -86, -82 * hScale, 172, 62 * hScale, 6, bodyCol, P.ink, lwO);
    // Tháp pháo vát hai má
    const ty = -82 * hScale;
    const th = 52 * hScale;
    A.poly(
      c,
      [
        [-96, ty],
        [-72, ty - th],
        [72, ty - th],
        [96, ty],
      ],
      lightCol,
      P.ink,
      lwO
    );
    // Mặt nạ pháo & miệng nòng nhìn thẳng
    A.rrect(c, -22, ty - th * 0.75, 44, th * 0.55, 5, P.dark, P.ink, lwI);
    A.circle(c, 0, ty - th * 0.48, 13, P.slate, P.ink, lwO);
    A.circle(c, 0, ty - th * 0.48, 7, P.ink, null, 0);
    // Kính ngắm trên nóc
    A.rrect(c, 28, ty - th - 16, 22, 16, 3, P.glass, P.ink, lwI);
    muzzleLocal = [0, ty - th * 0.48];
  }

  c.restore();

  // Đổi điểm local sang toạ độ người gọi
  const toWorldPt = (p: A.Pt): A.Pt => {
    const sx = view === 'top' || view === 'top-cutaway' ? p[0] * s : p[0] * dir * s;
    const sy = p[1] * s;
    const cs = Math.cos(hullRot);
    const sn = Math.sin(hullRot);
    return [o.x + sx * cs - sy * sn, o.y + sx * sn + sy * cs];
  };

  return {
    muzzle: toWorldPt(muzzleLocal),
    muzzleAng:
      view === 'top' || view === 'top-cutaway'
        ? hullRot + (o.turretYaw ?? 0)
        : dir > 0
          ? hullRot - gunPitch
          : Math.PI - hullRot + gunPitch,
    breech: toWorldPt(breechLocal),
    sight: toWorldPt(sightLocal),
    turretCenter: toWorldPt(turretLocal),
    ammoCenter: toWorldPt(ammoLocal),
    engineCenter: toWorldPt(engineLocal),
  };
}

/** Vẽ viên đạn pháo 120mm nguyên vẹn hoặc đạn thanh xuyên dưới cỡ APFSDS đang tách guốc / đang bay */
export function drawRound(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  ang = 0,
  mode: 'full' | 'separating' | 'dart' = 'full',
  sepProgress = 0,
  glow = 0
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);

  if (mode === 'full') {
    // Vỏ liều phóng cháy (propellant case) màu vàng cam P.amber
    const col = A.lerpColor(P.amber, P.enemy, glow);
    A.rrect(c, -70, -16, 96, 32, 5, col, P.ink, lwO);
    // Đế đạn bằng thép
    A.rrect(c, -76, -18, 12, 36, 3, P.dark, P.ink, lwO);
    // Các hạt thuốc phóng bên trong (nửa lộ để thấy cấu tạo)
    for (let i = 0; i < 12; i++) {
      const gx = -56 + (i % 4) * 20;
      const gy = -9 + Math.floor(i / 4) * 9;
      A.circle(c, gx, gy, 3.2, P.paper, P.ink2, lwI * 0.6);
    }
    // Guốc giữ thanh xuyên (sabot petals)
    A.poly(
      c,
      [
        [26, -15],
        [52, -7],
        [52, 7],
        [26, 15],
      ],
      P.slate,
      P.ink,
      lwI
    );
    // Mũi tên kim loại nặng (dart) nhô ra ở đầu và xuyên dọc bên trong
    A.line(c, [[-55, 0], [88, 0]], P.ink, lwO * 1.4);
    A.poly(
      c,
      [
        [80, -4],
        [98, 0],
        [80, 4],
      ],
      P.ink,
      P.ink,
      lwI
    );
    // Cánh đuôi ổn định trong vỏ
    A.poly(
      c,
      [
        [-58, -12],
        [-44, -3],
        [-44, 3],
        [-58, 12],
      ],
      P.slate,
      P.ink,
      lwI
    );
  } else if (mode === 'separating' || mode === 'dart') {
    const sp = mode === 'dart' ? 1 : A.clamp01(sepProgress);
    // Thanh xuyên kim loại nặng (dense metal dart) rất mảnh và sắc
    A.poly(
      c,
      [
        [-75, -11],
        [-55, -3.5],
        [-55, 3.5],
        [-75, 11],
      ],
      P.slate,
      P.ink,
      lwI
    );
    A.rrect(c, -62, -4, 145, 8, 2, P.dark, P.ink, lwO * 0.9);
    A.poly(
      c,
      [
        [82, -4],
        [108, 0],
        [82, 4],
      ],
      P.ink,
      P.ink,
      lwI
    );

    // 3 mảnh guốc (sabot petals) bung ra hai phía khi vừa rời nòng
    if (mode === 'separating' && sp < 0.98) {
      const dy = 12 + sp * 55;
      const rot = sp * 0.55;
      A.withA(c, 1 - sp * 0.8, () => {
        for (const sgn of [-1, 1] as const) {
          c.save();
          c.translate(10 - sp * 35, sgn * dy);
          c.rotate(sgn * rot);
          A.poly(
            c,
            [
              [-28, -6 * sgn],
              [28, -12 * sgn],
              [22, 4 * sgn],
              [-24, 4 * sgn],
            ],
            P.slate,
            P.ink,
            lwI
          );
          c.restore();
        }
      });
    }
  }
  c.restore();
}

/** Vẽ đạn nổ lõm (Shaped Charge / RPG / ATGM) ở góc nhìn ngoài hoặc mặt cắt phễu đồng chữ V */
export function drawShapedCharge(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  ang = 0,
  cutaway = true,
  jetProgress = 0
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);

  // Ống động cơ tên lửa phía sau + cánh ổn định
  A.rrect(c, -115, -10, 58, 20, 3, P.oliveDark, P.ink, lwO);
  A.poly(
    c,
    [
      [-112, -10],
      [-126, -28],
      [-98, -10],
    ],
    P.slate,
    P.ink,
    lwI
  );
  A.poly(
    c,
    [
      [-112, 10],
      [-126, 28],
      [-98, 10],
    ],
    P.slate,
    P.ink,
    lwI
  );

  // Bầu đầu đạn hình thoi phình
  const bodyPts: A.Pt[] = [
    [-58, -14],
    [-18, -34],
    [42, -34],
    [86, -8],
    [86, 8],
    [42, 34],
    [-18, 34],
    [-58, 14],
  ];
  A.poly(c, bodyPts, cutaway ? P.paper : P.enemy, P.ink, lwO);

  if (cutaway) {
    // Khối thuốc nổ mạnh phía sau phễu (màu P.amber)
    A.poly(
      c,
      [
        [-52, -12],
        [-16, -30],
        [36, -30],
        [-4, 0],
        [36, 30],
        [-16, 30],
        [-52, 12],
      ],
      P.amber,
      P.ink,
      lwI
    );
    // Phễu lót kim loại hình nón rỗng (Hollow copper cone) mở về phía trước
    A.poly(
      c,
      [
        [38, -30],
        [-6, 0],
        [38, 30],
        [44, 26],
        [6, 0],
        [44, -26],
      ],
      P.enemy,
      P.ink,
      lwI
    );
    // Khoang rỗng phía trước giúp hội tụ luồng kim loại
    A.line(c, [[86, -6], [86, 6]], P.enemy, lwO);
  }

  // Luồng kim loại siêu tốc (narrow metal jet) phóng ra khi kích nổ
  if (jetProgress > 0.01) {
    const jLen = jetProgress * 220;
    A.poly(
      c,
      [
        [4, -8],
        [86 + jLen, -2.5],
        [98 + jLen, 0],
        [86 + jLen, 2.5],
        [4, 8],
      ],
      P.amber,
      P.enemy,
      lwI
    );
  }

  c.restore();
}

/** Vẽ mặt cắt cụm giáp phức hợp (Composite Armor) & Giáp phản ứng nổ (ERA) */
export function drawArmorCutaway(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  opts: {
    mode?: 'composite' | 'era';
    impactP?: number; // 0..1 tiến độ đạn xuyên hoặc ERA nổ
    eraTriggered?: boolean;
  } = {}
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  const mode = opts.mode ?? 'composite';
  const p = opts.impactP ?? 0;

  c.save();
  c.translate(x, y);
  c.scale(s, s);

  // Khối giáp chính đặt nghiêng 28 độ
  c.save();
  c.rotate(0.42);

  // Lớp 1: Thép độ cứng cao ngoài cùng
  A.rrect(c, -90, -180, 34, 360, 4, P.slate, P.ink, lwO);
  // Lớp 2: Các viên gốm kỹ thuật (Ceramics) + lớp đàn hồi ở giữa
  A.rrect(c, -54, -180, 68, 360, 4, P.paper, P.ink, lwO);
  for (let row = -160; row < 160; row += 44) {
    const damaged = mode === 'composite' && p > 0.35 && Math.abs(row) < 48;
    A.rrect(
      c,
      -48,
      row,
      56,
      38,
      4,
      damaged ? P.amber : P.light,
      P.ink2,
      lwI
    );
    if (damaged) {
      // Vết nứt gốm hấp thụ động năng thanh xuyên
      A.line(c, [[-44, row + 6], [4, row + 30]], P.enemy, lwI);
      A.line(c, [[-10, row + 4], [-36, row + 34]], P.enemy, lwI);
    }
  }
  // Lớp 3: Thép dẻo đỡ phía trong + tấm chắn mảnh văng
  A.rrect(c, 16, -180, 36, 360, 4, P.dark, P.ink, lwO);
  A.rrect(c, 54, -180, 12, 360, 2, P.oliveLight, P.ink2, lwI);

  // Nếu là chế độ ERA: gắn 3 hộp gạch phản ứng nổ bên ngoài mặt giáp
  if (mode === 'era') {
    for (let i = -1; i <= 1; i++) {
      const ey = i * 95;
      const isHitBlock = i === 0;
      const trig = isHitBlock && p > 0.25;
      const blast = trig ? A.clamp01((p - 0.25) / 0.5) : 0;

      if (!trig) {
        // Hộp ERA nguyên vẹn: 2 tấm thép kẹp lớp thuốc nổ P.amber ở giữa
        A.rrect(c, -132, ey - 38, 36, 76, 4, P.oliveDark, P.ink, lwO);
        A.rrect(c, -122, ey - 32, 16, 64, 2, P.amber, P.ink2, lwI);
      } else {
        // Hộp ERA phát nổ đẩy tấm thép bay chéo ra ngoài cắt ngang luồng xuyên lõm!
        const fly = blast * 85;
        c.save();
        c.translate(-132 - fly, ey - fly * 0.2);
        c.rotate(-blast * 0.35);
        A.rrect(c, -8, -38, 12, 76, 2, P.oliveDark, P.ink, lwO);
        c.restore();
        // Quầng nổ phản ứng
        if (blast < 0.95) {
          A.circle(c, -125 - fly * 0.5, ey, 34 * Math.sin(blast * Math.PI), P.amber, P.enemy, lwI);
        }
      }
    }
  }

  c.restore();
  c.restore();
}

/** Vẽ động cơ xe tăng: 'turbine' (Tuabin khí nhỏ gọn, cánh quạt nhiều tầng) vs 'diesel' (Piston V12 lớn, tiết kiệm) */
export function drawEngine(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  kind: 'turbine' | 'diesel' = 'turbine',
  phase = 0
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.scale(s, s);

  if (kind === 'turbine') {
    // Vỏ tuabin khí thuôn gọn như động cơ trực thăng
    A.poly(
      c,
      [
        [-130, -52],
        [-45, -38],
        [65, -48],
        [125, -34],
        [125, 34],
        [65, 48],
        [-45, 38],
        [-130, 52],
      ],
      P.paper,
      P.ink,
      lwO
    );
    // Trục giữa
    A.rrect(c, -120, -8, 235, 16, 4, P.dark, P.ink, lwI);
    // Các tầng cánh nén khí (trái) và buồng đốt rực lửa (giữa)
    A.rrect(c, -25, -32, 68, 64, 8, P.amber, P.enemy, lwI);
    for (let i = 0; i < 4; i++) {
      const bx = -105 + i * 20;
      const h = 44 - i * 3;
      const off = Math.sin(phase * 10 + i) * 6;
      A.rrect(c, bx, -h, 12, h * 2, 3, P.sky, P.ink, lwI);
      A.line(c, [[bx + 6, -h + 6 + off], [bx + 6, h - 6 + off]], P.ink, lwI);
    }
    // Tầng tuabin xả bên phải
    for (let i = 0; i < 3; i++) {
      const bx = 55 + i * 22;
      A.rrect(c, bx, -36, 14, 72, 3, P.slate, P.ink, lwI);
    }
  } else {
    // Động cơ Diesel 12 xi-lanh: khối gang đồ sộ hơn, piston lên xuống nhịp nhàng
    A.rrect(c, -150, -72, 300, 144, 12, P.slate, P.ink, lwO);
    A.rrect(c, -136, -58, 272, 92, 8, P.paper, P.ink, lwI);
    // 6 cặp xi-lanh và piston chuyển động theo phase
    for (let i = 0; i < 6; i++) {
      const cx = -112 + i * 45;
      const py = Math.sin(phase * 6 + i * 1.05) * 18;
      // Lòng xi-lanh
      A.rrect(c, cx - 15, -50, 30, 76, 3, P.bg2, P.ink2, lwI * 0.8);
      // Đỉnh lửa buồng đốt khi piston lên đỉnh
      if (py < -10) {
        A.rrect(c, cx - 13, -48, 26, 12, 2, P.amber, null, 0);
      }
      // Quả piston + thanh truyền
      A.rrect(c, cx - 13, -18 + py, 26, 22, 3, P.dark, P.ink, lwI);
      A.line(c, [[cx, 4 + py], [cx + Math.cos(phase * 6 + i) * 8, 46]], P.ink, lwO * 0.8);
    }
    // Trục khuỷu phía dưới
    A.line(c, [[-128, 46], [128, 46]], P.dark, lwO);
  }

  c.restore();
}

/** Vẽ xe tải bồn tiếp vận hậu cần / xe kéo hạng nặng / xe bắc cầu ở góc side hoặc top */
export function drawSupportTruck(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  view: 'side' | 'top' = 'side',
  kind: 'fuel' | 'transporter' | 'bridgelayer' = 'fuel',
  dir: 1 | -1 = 1,
  sinkY = 0
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  c.save();
  c.translate(x, y + sinkY);
  if (view === 'side') {
    c.scale(dir * s, s);
    if (kind === 'fuel') {
      // Khung gầm & cabin xe tải quân sự 6x6
      A.rrect(c, -135, -36, 260, 14, 4, P.dark, P.ink, lwO);
      // Cabin trước
      A.poly(
        c,
        [
          [55, -36],
          [55, -96],
          [105, -96],
          [125, -68],
          [125, -36],
        ],
        P.olive,
        P.ink,
        lwO
      );
      A.poly(
        c,
        [
          [82, -90],
          [102, -90],
          [118, -68],
          [82, -68],
        ],
        P.glass,
        P.ink,
        lwI
      );
      // Bồn nhiên liệu lớn màu cát/vàng cam phía sau
      A.rrect(c, -130, -94, 176, 58, 24, P.sand, P.ink, lwO);
      A.rrect(c, -110, -74, 136, 18, 6, P.amber, P.ink2, lwI);
      // 3 bánh lốp cao su (tiếp xúc nhỏ nên dễ lún bùn)
      for (const wx of [-95, -42, 88]) {
        A.circle(c, wx, -22, 22, P.dark, P.ink, lwO);
        A.circle(c, wx, -22, 10, P.slate, P.ink2, lwI);
      }
    } else if (kind === 'transporter') {
      // Đầu kéo hạng nặng + rơ-moóc sàn thấp chở xe tăng (HET)
      A.rrect(c, -260, -28, 360, 12, 3, P.dark, P.ink, lwO);
      A.poly(
        c,
        [
          [100, -28],
          [125, -52],
          [220, -52],
          [220, -28],
        ],
        P.dark,
        P.ink,
        lwO
      );
      A.rrect(c, 145, -108, 72, 58, 6, P.olive, P.ink, lwO);
      A.rrect(c, 182, -100, 30, 24, 3, P.glass, P.ink, lwI);
      for (const wx of [-230, -185, -140, -95, 130, 190]) {
        A.circle(c, wx, -16, 16, P.dark, P.ink, lwI);
      }
    } else if (kind === 'bridgelayer') {
      // Thân xe bắc cầu + nhịp cầu thép chữ A trên lưng
      A.rrect(c, -180, -48, 360, 48, 20, P.dark, P.ink, lwO);
      A.rrect(c, -170, -76, 340, 32, 6, P.olive, P.ink, lwO);
      // Dầm cầu thép xếp trên nóc
      A.poly(
        c,
        [
          [-240, -82],
          [-210, -104],
          [210, -104],
          [240, -82],
        ],
        P.sand,
        P.ink,
        lwO
      );
      for (let bx = -190; bx <= 170; bx += 45) {
        A.line(c, [[bx, -82], [bx + 22, -104]], P.ink, lwI);
        A.line(c, [[bx + 22, -104], [bx + 44, -82]], P.ink, lwI);
      }
    }
  } else {
    // Góc nhìn từ trên xuống (top view)
    c.rotate(dir > 0 ? 0 : Math.PI);
    c.scale(s, s);
    // Thân xe tải nhìn từ trên
    A.rrect(c, -120, -48, 240, 96, 10, P.olive, P.ink, lwO);
    if (kind === 'fuel') {
      // Bồn xăng elip màu vàng cam
      A.rrect(c, -112, -40, 152, 80, 28, P.amber, P.ink, lwO);
      // Cabin trước
      A.rrect(c, 48, -42, 64, 84, 8, P.oliveLight, P.ink, lwI);
      A.rrect(c, 84, -34, 18, 68, 3, P.glass, P.ink2, lwI);
    }
  }
  c.restore();
}

/** Vẽ Drone 4 cánh quạt thả đạn (FPV / Quadcopter bomber) hoặc Tên lửa chống tăng đột nóc (Top-attack missile) */
export function drawTopThreat(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  kind: 'drone' | 'missile' = 'drone',
  ang = 0,
  dropProgress = 0,
  rotorPhase = 0
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);

  if (kind === 'drone') {
    // Khung ngang drone + 4 motor cánh quạt
    A.line(c, [[-68, -8], [68, -8]], P.dark, lwO);
    A.rrect(c, -26, -20, 52, 24, 6, P.slate, P.ink, lwO);
    A.circle(c, 0, -4, 6, P.enemy, P.ink, lwI);
    for (const rx of [-64, -36, 36, 64]) {
      A.rrect(c, rx - 5, -22, 10, 14, 2, P.dark, P.ink, lwI);
      const w = 22 * (0.4 + 0.6 * Math.abs(Math.cos(rotorPhase * 18 + rx)));
      A.line(c, [[rx - w, -25], [rx + w, -25]], P.ink2, lwI * 1.2);
    }
    // Quả đạn lõm nhỏ treo dưới bụng (rơi xuống theo dropProgress)
    const dy = dropProgress * 260;
    c.save();
    c.translate(0, 18 + dy);
    A.poly(
      c,
      [
        [-8, -18],
        [8, -18],
        [10, 8],
        [0, 24],
        [-10, 8],
      ],
      P.enemy,
      P.ink,
      lwI
    );
    A.poly(
      c,
      [
        [-12, -26],
        [12, -26],
        [6, -18],
        [-6, -18],
      ],
      P.slate,
      P.ink,
      lwI
    );
    c.restore();
  } else {
    // Tên lửa chống tăng đột nóc (Javelin-style) lao chúc xuống
    A.rrect(c, -52, -11, 92, 22, 6, P.enemy, P.ink, lwO);
    A.poly(
      c,
      [
        [38, -11],
        [64, 0],
        [38, 11],
      ],
      P.amber,
      P.ink,
      lwO
    );
    // Cánh giữa & cánh đuôi chữ X
    A.poly(
      c,
      [
        [-8, -11],
        [-18, -32],
        [6, -11],
      ],
      P.dark,
      P.ink,
      lwI
    );
    A.poly(
      c,
      [
        [-8, 11],
        [-18, 32],
        [6, 11],
      ],
      P.dark,
      P.ink,
      lwI
    );
    A.poly(
      c,
      [
        [-48, -11],
        [-62, -26],
        [-36, -11],
      ],
      P.slate,
      P.ink,
      lwI
    );
    A.poly(
      c,
      [
        [-48, 11],
        [-62, 26],
        [-36, 11],
      ],
      P.slate,
      P.ink,
      lwI
    );
  }

  c.restore();
}

/** Vẽ người lính nhìn từ trên xuống (Top-down soldier) có vai, đầu mũ và hướng súng rõ ràng */
export function drawSoldierTop(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  s = 1,
  ang = 0,
  side: 'ally' | 'foe' = 'ally',
  weapon: 'rifle' | 'rpg' = 'rifle'
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  const bodyCol = side === 'ally' ? P.olive : P.enemy;
  const hatCol = side === 'ally' ? P.oliveDark : P.ink;

  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);

  // Vai áo
  A.rrect(c, -14, -24, 28, 48, 12, bodyCol, P.ink, lwO * 0.85);
  // Vũ khí vươn ra trước
  if (weapon === 'rifle') {
    A.line(c, [[6, 8], [38, 4]], P.dark, lwO * 0.9);
  } else {
    // Ống phóng RPG vác vai có đầu đạn đỏ
    A.line(c, [[-22, 12], [36, 10]], P.dark, lwO * 1.1);
    A.poly(
      c,
      [
        [34, 4],
        [48, 10],
        [34, 16],
      ],
      P.enemy,
      P.ink,
      lwI
    );
  }
  // Mũ sắt tròn ở tâm
  A.circle(c, 0, 0, 13, hatCol, P.ink, lwI);

  c.restore();
}

/** Vẽ khẩu đội pháo binh đồng minh ở góc top hoặc side (dùng trong Chương 5 hệ thống hiệp đồng) */
export function drawArtilleryTop(c: CanvasRenderingContext2D, x: number, y: number, s = 1, ang = 0) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  c.save();
  c.translate(x, y);
  c.rotate(ang);
  c.scale(s, s);
  // Hai càng pháo mở chữ V phía sau
  A.line(c, [[-10, -8], [-68, -36]], P.oliveDark, lwO);
  A.line(c, [[-10, 8], [-68, 36]], P.oliveDark, lwO);
  // Hai bánh pháo
  A.rrect(c, -16, -38, 28, 12, 3, P.dark, P.ink, lwI);
  A.rrect(c, -16, 26, 28, 12, 3, P.dark, P.ink, lwI);
  // Lá chắn & nòng pháo dài
  A.rrect(c, -12, -24, 24, 48, 4, P.olive, P.ink, lwO);
  A.rrect(c, 8, -5, 86, 10, 2, P.dark, P.ink, lwO);
  c.restore();
}

/** Vẽ nền bối cảnh: 'cutaway-grid' (nền kỹ thuật sáng), 'field' (đồng bằng/đồi ngang), 'ridge' (sườn đồi hull-down), 'bridge' (cầu qua sông), 'top-map' (sa bàn chiến thuật), 'top-town' (góc phố đô thị) */
export function drawStageBg(
  c: CanvasRenderingContext2D,
  kind: 'cutaway-grid' | 'field' | 'ridge' | 'bridge' | 'top-map' | 'top-town',
  opts: {
    groundY?: number;
    scrollX?: number;
    bridgeCollapse?: number;
    mudZone?: boolean;
  } = {}
) {
  const lwO = A.px(c, LINE.outer);
  const lwI = A.px(c, LINE.inner);
  const gy = opts.groundY ?? 220;
  const sx = opts.scrollX ?? 0;

  if (kind === 'cutaway-grid') {
    // Lưới kỹ thuật mảnh + mặt đất chuẩn ở gy
    c.save();
    c.strokeStyle = 'rgba(71, 85, 105, 0.10)';
    c.lineWidth = lwI * 0.6;
    c.beginPath();
    for (let x = -1600; x <= 1600; x += 80) {
      c.moveTo(x, -900);
      c.lineTo(x, gy);
    }
    for (let y = -800; y <= gy; y += 80) {
      c.moveTo(-1600, y);
      c.lineTo(1600, y);
    }
    c.stroke();
    c.restore();

    // Mặt sàn cắt ngang
    A.poly(
      c,
      [
        [-1800, gy],
        [1800, gy],
        [1800, gy + 500],
        [-1800, gy + 500],
      ],
      P.bg2,
      null,
      0
    );
    A.line(c, [[-1800, gy], [1800, gy]], P.ink, lwO);
  } else if (kind === 'field') {
    // Dải đồi mờ phía xa
    const hillPts: A.Pt[] = [];
    for (let x = -1800; x <= 1800; x += 120) {
      const h = Math.sin((x + sx * 0.25) * 0.003) * 45 + Math.cos((x + sx * 0.15) * 0.007) * 22;
      hillPts.push([x, gy - 95 - h]);
    }
    hillPts.push([1800, gy + 400], [-1800, gy + 400]);
    A.poly(c, hillPts, P.bg2, P.light, lwI);

    // Mặt đất chính
    const gPts: A.Pt[] = [];
    for (let x = -1800; x <= 1800; x += 60) {
      const bump = opts.mudZone
        ? Math.sin((x + sx) * 0.02) * 4
        : Math.sin((x + sx) * 0.012) * 8;
      gPts.push([x, gy + bump]);
    }
    gPts.push([1800, gy + 600], [-1800, gy + 600]);
    A.poly(c, gPts, opts.mudZone ? P.sand : P.bg2, P.ink, lwO);
  } else if (kind === 'ridge') {
    // Sườn đồi dốc ngược (reverse slope) để xe tăng đứng hull-down chỉ lộ đỉnh tháp pháo
    const ridgePts: A.Pt[] = [
      [-1800, gy + 140],
      [-520, gy + 95],
      [-120, gy - 68], // Đỉnh gờ đồi che toàn bộ thân xe
      [280, gy + 125],
      [1800, gy + 150],
      [1800, gy + 650],
      [-1800, gy + 650],
    ];
    A.poly(c, ridgePts, P.bg2, P.ink, lwO);
    // Lớp đất đá cắt ngang dưới đồi
    A.line(c, [[-480, gy + 135], [-120, gy - 20], [260, gy + 165]], P.slate, lwI);
  } else if (kind === 'bridge') {
    // Hai bờ sông và lòng sông ở giữa (-320..320)
    const col = opts.bridgeCollapse ?? 0;
    // Nước sông
    A.rrect(c, -360, gy + 35, 720, 260, 0, P.glass, P.sky, lwI);
    // Bờ trái & bờ phải
    A.poly(
      c,
      [
        [-1800, gy],
        [-330, gy],
        [-280, gy + 260],
        [-1800, gy + 260],
      ],
      P.bg2,
      P.ink,
      lwO
    );
    A.poly(
      c,
      [
        [330, gy],
        [1800, gy],
        [1800, gy + 260],
        [280, gy + 260],
      ],
      P.bg2,
      P.ink,
      lwO
    );
    // Nhịp cầu gỗ/bê tông nhẹ bị gãy sập ở giữa khi col > 0
    c.save();
    c.translate(-330, gy);
    c.rotate(col * 0.42);
    A.rrect(c, 0, -16, 330, 18, 2, P.sand, P.ink, lwO);
    c.restore();

    c.save();
    c.translate(330, gy);
    c.rotate(-col * 0.42);
    A.rrect(c, -330, -16, 330, 18, 2, P.sand, P.ink, lwO);
    c.restore();
  } else if (kind === 'top-map' || kind === 'top-town') {
    // Nền bản đồ sa bàn sáng sạch
    c.save();
    c.strokeStyle = 'rgba(71, 85, 105, 0.09)';
    c.lineWidth = lwI * 0.6;
    c.beginPath();
    for (let x = -1800; x <= 1800; x += 120) {
      c.moveTo(x, -1200);
      c.lineTo(x, 1200);
    }
    for (let y = -1200; y <= 1200; y += 120) {
      c.moveTo(-1800, y);
      c.lineTo(1800, y);
    }
    c.stroke();
    c.restore();

    // Tuyến đường chính chạy ngang qua tâm
    A.rrect(c, -1800, -95, 3600, 190, 0, P.bg2, P.slate, lwI);
    A.line(c, [[-1800, 0], [1800, 0]], P.slate, lwI, [24, 20]);

    if (kind === 'top-town') {
      // Các dãy nhà phố hai bên đường tạo điểm mù sát xe tăng
      const blocks = [
        { x: -560, y: -390, w: 320, h: 220 },
        { x: -140, y: -390, w: 360, h: 220 },
        { x: 310, y: -390, w: 320, h: 220 },
        { x: -480, y: 170, w: 360, h: 220 },
        { x: 20, y: 170, w: 380, h: 220 },
      ];
      for (const b of blocks) {
        A.rrect(c, b.x, b.y, b.w, b.h, 8, P.light, P.ink, lwO);
        A.rrect(c, b.x + 18, b.y + 18, b.w - 36, b.h - 36, 4, P.paper, P.ink2, lwI);
      }
      // Một số tán cây ven đường
      for (const [tx, ty] of [
        [-680, 220],
        [520, 230],
        [720, -240],
      ] as const) {
        A.circle(c, tx, ty, 48, P.oliveLight, P.ink, lwI);
        A.circle(c, tx - 10, ty - 8, 22, P.olive, null, 0);
      }
    }
  }
}
