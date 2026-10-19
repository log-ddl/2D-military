// characters/drawCharacter.ts
// Bộ hàm vẽ nhân vật bằng Canvas 2D Context, tương thích với kit/art.ts của pdoom-video

export interface CharacterOpts {
  x: number;
  y: number;
  scale?: number;
  flipX?: boolean;
  eyeLook?: [number, number]; // [-1..1, -1..1]
  blink?: number;            // 0: mở to, 1: nhắm mắt
  tilt?: number;             // góc nghiêng radian (ví dụ khi nhún nhảy, nói chuyện)
}

/**
 * Vẽ nhân vật Bà Lão (Granny)
 */
export function drawGranny(ctx: CanvasRenderingContext2D, opts: CharacterOpts) {
  const { x, y, scale = 1, flipX = false, tilt = -0.05, eyeLook = [-0.3, 0.2], blink = 0 } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.rotate(tilt);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Thân áo (Váy dưới)
  ctx.fillStyle = '#61412a';
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-64, 40);
  ctx.bezierCurveTo(-66, 85, -64, 145, -56, 195);
  ctx.bezierCurveTo(-53, 220, -32, 230, 6, 230);
  ctx.bezierCurveTo(44, 230, 65, 220, 68, 195);
  ctx.bezierCurveTo(74, 145, 74, 85, 68, 40);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 2. Thân áo trên (Áo bà ba)
  ctx.fillStyle = '#785338';
  ctx.beginPath();
  ctx.moveTo(-48, -65);
  ctx.bezierCurveTo(-64, -40, -68, -2, -64, 42);
  ctx.lineTo(68, 42);
  ctx.bezierCurveTo(74, -10, 66, -50, 42, -65);
  ctx.bezierCurveTo(20, -78, -5, -74, -25, -74);
  ctx.bezierCurveTo(-36, -74, -44, -72, -48, -65);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cổ áo
  ctx.beginPath();
  ctx.moveTo(-48, -65);
  ctx.bezierCurveTo(-36, -38, -10, -38, 2, -65);
  ctx.stroke();

  // Nẹp áo / vạt chéo
  ctx.beginPath();
  ctx.moveTo(-28, -42);
  ctx.bezierCurveTo(-34, -18, -32, 8, -26, 42);
  ctx.stroke();

  // Đường viền ngang eo
  ctx.beginPath();
  ctx.moveTo(-64, 42);
  ctx.bezierCurveTo(-25, 54, 28, 54, 68, 42);
  ctx.stroke();

  // Túi áo bên hông phải
  ctx.fillStyle = '#61412a';
  ctx.beginPath();
  ctx.moveTo(8, -8);
  ctx.lineTo(38, -8);
  ctx.bezierCurveTo(42, -8, 44, 16, 40, 26);
  ctx.bezierCurveTo(36, 34, 12, 34, 8, 26);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Cổ
  ctx.fillStyle = '#ffede6';
  ctx.fillRect(-36, -95, 24, 35);

  // 3. Đầu & Búi tóc
  ctx.save();
  ctx.translate(18, -160);

  // Búi tóc sau gáy
  ctx.fillStyle = '#9c9c9c';
  ctx.beginPath();
  ctx.arc(76, -30, 30, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(76, -30, 16, 0.4, Math.PI * 1.6);
  ctx.stroke();

  // Khuôn mặt (Tròn bầu, cằm hơi nhô về trước)
  ctx.lineWidth = 5.5;
  ctx.fillStyle = '#ffede6';
  ctx.beginPath();
  ctx.moveTo(-72, 35);
  ctx.bezierCurveTo(-84, 82, -58, 128, -12, 132);
  ctx.bezierCurveTo(34, 135, 74, 102, 78, 52);
  ctx.bezierCurveTo(82, -10, 50, -52, -5, -52);
  ctx.bezierCurveTo(-55, -52, -68, -10, -72, 35);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tai
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(65, 52, 16, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.stroke();

  // Tóc xám chải ngược
  ctx.fillStyle = '#9c9c9c';
  ctx.beginPath();
  ctx.moveTo(-66, -5);
  ctx.bezierCurveTo(-66, -40, -38, -74, 16, -72);
  ctx.bezierCurveTo(62, -70, 86, -38, 80, 18);
  ctx.bezierCurveTo(76, 48, 70, 80, 56, 90);
  ctx.bezierCurveTo(50, 94, 44, 80, 46, 66);
  ctx.bezierCurveTo(48, 48, 52, 32, 48, 18);
  ctx.bezierCurveTo(42, 0, 26, -15, 6, -26);
  ctx.bezierCurveTo(-24, -44, -52, -28, -66, -5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lọn tóc mai ôm trước tai
  ctx.beginPath();
  ctx.moveTo(48, 18);
  ctx.bezierCurveTo(38, 30, 40, 52, 43, 60);
  ctx.bezierCurveTo(45, 66, 52, 64, 52, 56);
  ctx.bezierCurveTo(51, 44, 52, 30, 48, 18);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Các đường chải tóc
  ctx.strokeStyle = '#686868';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-42, -38); ctx.bezierCurveTo(-14, -58, 28, -56, 56, -42);
  ctx.moveTo(-20, -24); ctx.bezierCurveTo(6, -42, 42, -36, 64, -18);
  ctx.moveTo(4, -8); ctx.bezierCurveTo(28, -18, 52, -6, 64, 14);
  ctx.stroke();

  // Chân mày đăm chiêu
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(-55, 8); ctx.bezierCurveTo(-44, -4, -24, 0, -16, 14);
  ctx.moveTo(12, 14); ctx.bezierCurveTo(20, 0, 40, -4, 52, 8);
  ctx.stroke();

  // Mắt
  if (blink < 0.9) {
    const eyeH = 11 * (1 - blink);
    ctx.lineWidth = 4.5;
    // Mắt trái
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-36, 28, 13, eyeH, -0.1, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Mắt phải
    ctx.beginPath();
    ctx.ellipse(20, 28, 13, eyeH, 0.1, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Đồng tử
    ctx.fillStyle = '#181818';
    const pxL = -38 + eyeLook[0] * 5;
    const pyL = 29 + eyeLook[1] * 3;
    ctx.beginPath(); ctx.arc(pxL, pyL, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(pxL - 2, pyL - 2, 2.2, 0, Math.PI * 2); ctx.fill();

    const pxR = 18 + eyeLook[0] * 5;
    const pyR = 29 + eyeLook[1] * 3;
    ctx.fillStyle = '#181818';
    ctx.beginPath(); ctx.arc(pxR, pyR, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(pxR - 2, pyR - 2, 2.2, 0, Math.PI * 2); ctx.fill();

    // Lông mi ngang khóe mắt
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-68, 22); ctx.lineTo(-58, 24);
    ctx.moveTo(-69, 32); ctx.lineTo(-59, 31);
    ctx.moveTo(42, 28); ctx.lineTo(52, 25);
    ctx.moveTo(42, 36); ctx.lineTo(52, 37);
    ctx.stroke();
  } else {
    // Nhắm mắt
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-49, 28); ctx.bezierCurveTo(-41, 35, -31, 35, -23, 28);
    ctx.moveTo(7, 28); ctx.bezierCurveTo(15, 35, 25, 35, 33, 28);
    ctx.stroke();
  }

  // Khóe miệng / Vết nhăn ngoặc đơn biểu cảm bực tức
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 6.5;
  ctx.beginPath();
  ctx.moveTo(24, 58);
  ctx.bezierCurveTo(32, 68, 31, 78, 27, 86);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}

/**
 * Vẽ nhân vật Ông Chú (Man with Mustache)
 */
export function drawMan(ctx: CanvasRenderingContext2D, opts: CharacterOpts) {
  const { x, y, scale = 1, flipX = false, tilt = 0, eyeLook = [0, 0], blink = 0 } = opts;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flipX ? -scale : scale, scale);
  ctx.rotate(tilt);

  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // 1. Quần sọc dọc (Trousers)
  ctx.save();
  ctx.fillStyle = '#6a9ad6';
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 5.5;

  ctx.beginPath();
  ctx.moveTo(-78, 90);
  ctx.lineTo(78, 90);
  ctx.lineTo(78, 205);
  ctx.bezierCurveTo(78, 220, 55, 225, 0, 225);
  ctx.bezierCurveTo(-55, 225, -78, 220, -78, 205);
  ctx.closePath();
  ctx.fill();

  // Clip để vẽ các sọc dọc màu xanh sẫm
  ctx.clip();
  ctx.fillStyle = '#3f6ea8';
  [-78, -40, -2, 36, 74].forEach((sx) => {
    ctx.fillRect(sx, 80, 19, 160);
  });
  ctx.restore();

  // Viền quần
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(-78, 90);
  ctx.lineTo(-78, 205);
  ctx.bezierCurveTo(-78, 220, -55, 225, 0, 225);
  ctx.bezierCurveTo(55, 225, 78, 220, 78, 205);
  ctx.lineTo(78, 90);
  ctx.stroke();

  // 2. Áo Len Gile (Sweater Vest) có bụng phệ sang bên trái
  ctx.fillStyle = '#fcf6ce';
  ctx.beginPath();
  ctx.moveTo(-42, -85);
  ctx.bezierCurveTo(-62, -55, -92, -10, -90, 45); // Bụng phệ lồi sang trái
  ctx.bezierCurveTo(-89, 70, -84, 84, -78, 92);
  ctx.lineTo(78, 92);
  ctx.bezierCurveTo(80, 84, 82, 60, 80, 35);
  ctx.bezierCurveTo(78, -25, 65, -60, 42, -85);
  ctx.bezierCurveTo(24, -100, 5, -96, -8, -96);
  ctx.bezierCurveTo(-22, -96, -34, -98, -42, -85);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Vải sơ mi caro trong cổ V
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-32, -96);
  ctx.lineTo(-2, -44);
  ctx.lineTo(28, -96);
  ctx.closePath();
  ctx.fillStyle = '#4d7eb8';
  ctx.fill();
  ctx.strokeStyle = '#a2c8f6';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Nơ/cổ áo sơ mi
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(-32, -96); ctx.lineTo(-4, -64); ctx.lineTo(-2, -94);
  ctx.moveTo(28, -96); ctx.lineTo(0, -64); ctx.lineTo(-2, -94);
  ctx.stroke();

  // Viền cổ chữ V đan len (dashed trim)
  ctx.lineWidth = 6.5;
  ctx.strokeStyle = '#181818';
  ctx.setLineDash([4, 5]);
  ctx.beginPath();
  ctx.moveTo(-34, -96); ctx.lineTo(-2, -42); ctx.lineTo(30, -96);
  ctx.stroke();
  ctx.setLineDash([]);

  // Viền gấu áo len đáy (waistband trim)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-78, 78, 156, 14);
  ctx.lineWidth = 3;
  ctx.strokeRect(-78, 78, 156, 14);
  ctx.lineWidth = 8.5;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(-75, 85); ctx.lineTo(75, 85);
  ctx.stroke();
  ctx.setLineDash([]);

  // Cổ
  ctx.fillStyle = '#ffede6';
  ctx.fillRect(-18, -115, 32, 22);

  // 3. Đầu & Khuôn mặt
  ctx.save();
  ctx.translate(0, -195);

  // Khuôn mặt bầu bĩnh, nọng cằm
  ctx.fillStyle = '#ffede6';
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 5.5;
  ctx.beginPath();
  ctx.moveTo(-78, 5);
  ctx.bezierCurveTo(-82, 65, -56, 110, 0, 114);
  ctx.bezierCurveTo(56, 110, 82, 65, 78, 5);
  ctx.bezierCurveTo(74, -55, 52, -98, 0, -98);
  ctx.bezierCurveTo(-52, -98, -74, -55, -78, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Tai phải
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.arc(75, 15, 16, -Math.PI / 2, Math.PI / 2);
  ctx.fill();
  ctx.stroke();

  // Tóc đen rẽ ngôi mượt
  ctx.fillStyle = '#181818';
  // Ngôi lệch trái
  ctx.beginPath();
  ctx.moveTo(-54, -32);
  ctx.bezierCurveTo(-70, -60, -55, -88, -30, -94);
  ctx.bezierCurveTo(-28, -72, -36, -52, -54, -32);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Mái tóc vuốt sang phải
  ctx.beginPath();
  ctx.moveTo(-30, -94);
  ctx.bezierCurveTo(8, -102, 50, -98, 80, -58);
  ctx.bezierCurveTo(96, -30, 88, 24, 78, 34);
  ctx.bezierCurveTo(68, 28, 66, 4, 68, -8);
  ctx.bezierCurveTo(70, -35, 64, -60, 42, -74);
  ctx.bezierCurveTo(15, -87, -10, -84, -30, -94);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Chân mày đậm, cong xếch
  ctx.lineWidth = 8.5;
  ctx.beginPath();
  ctx.moveTo(-55, -30); ctx.bezierCurveTo(-44, -40, -25, -38, -15, -28);
  ctx.moveTo(15, -28); ctx.bezierCurveTo(25, -38, 44, -40, 55, -30);
  ctx.stroke();

  // Nếp nhăn trán
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(8, -32); ctx.lineTo(12, -24);
  ctx.stroke();

  // Mắt trợn trắng ngơ ngác hài hước
  if (blink < 0.9) {
    const eyeH = 12 * (1 - blink);
    ctx.lineWidth = 5;
    ctx.fillStyle = '#ffffff';

    // Mắt trái
    ctx.beginPath();
    ctx.ellipse(-34, -6, 14, eyeH, -0.1, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Mắt phải
    ctx.beginPath();
    ctx.ellipse(34, -6, 14, eyeH, 0.1, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();

    // Nếp mí trên & dưới
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-42, -20); ctx.bezierCurveTo(-34, -23, -26, -22, -22, -18);
    ctx.moveTo(-42, 8); ctx.bezierCurveTo(-35, 12, -28, 12, -22, 8);
    ctx.moveTo(22, -18); ctx.bezierCurveTo(26, -22, 34, -23, 42, -20);
    ctx.moveTo(22, 8); ctx.bezierCurveTo(28, 12, 35, 12, 42, 8);
    ctx.stroke();
  } else {
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(-48, -6); ctx.bezierCurveTo(-38, 2, -28, 2, -18, -6);
    ctx.moveTo(18, -6); ctx.bezierCurveTo(28, 2, 38, 2, 48, -6);
    ctx.stroke();
  }

  // Ria mép hình vòm tròn đen
  ctx.fillStyle = '#181818';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(-24, 36);
  ctx.bezierCurveTo(-24, 6, 24, 6, 24, 36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Rãnh khía sợi ria mép
  ctx.strokeStyle = '#ffede6';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-8, 22); ctx.lineTo(-8, 34);
  ctx.moveTo(0, 18); ctx.lineTo(0, 34);
  ctx.moveTo(8, 22); ctx.lineTo(8, 34);
  ctx.stroke();

  // Miệng nhỏ dưới ria mép
  ctx.strokeStyle = '#181818';
  ctx.lineWidth = 4.5;
  ctx.beginPath();
  ctx.moveTo(-12, 46); ctx.bezierCurveTo(-2, 52, 4, 52, 12, 46);
  ctx.stroke();

  // Nọng cằm đôi (double chin)
  ctx.beginPath();
  ctx.moveTo(-18, 68); ctx.bezierCurveTo(-5, 76, 7, 76, 18, 68);
  ctx.stroke();

  ctx.restore();
  ctx.restore();
}
