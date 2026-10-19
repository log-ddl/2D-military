import * as A from './shared/art';
import * as K from './shared/camera';
import { P, LINE } from './shared/palette';

export type ViewMode = 'side' | 'top' | 'cutaway' | 'front';

// Helper: stroke width scaled cleanly with transform or world
function lwOuter(c: CanvasRenderingContext2D) {
  return A.px(c, LINE.outer);
}
function lwInner(c: CanvasRenderingContext2D) {
  return A.px(c, LINE.inner);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. BACKGROUNDS (WORLD-SPACE)
// ═══════════════════════════════════════════════════════════════════════════

export function drawTechnicalBg(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  opts: { showFloor?: boolean; floorY?: number; gridStep?: number } = {},
) {
  A.clear(c, P.bg);
  const v = K.view(cam, 200);
  const step = opts.gridStep ?? 120;
  const xStart = Math.floor(v.x0 / step) * step;
  const yStart = Math.floor(v.y0 / step) * step;

  c.save();
  c.strokeStyle = P.bg2;
  c.lineWidth = A.px(c, 1.5);
  c.beginPath();
  for (let x = xStart; x <= v.x1; x += step) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = yStart; y <= v.y1; y += step) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();

  if (opts.showFloor) {
    const fy = opts.floorY ?? 260;
    c.fillStyle = P.bg2;
    c.fillRect(v.x0, fy, v.x1 - v.x0, Math.max(0, v.y1 - fy));
    A.line(c, [[v.x0, fy], [v.x1, fy]], P.ink2, lwInner(c));
  }
  c.restore();
}

export function drawAirspaceBg(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  opts: { groundY?: number; ridgeX?: number; ridgeH?: number; showBands?: boolean } = {},
) {
  A.clear(c, P.bg);
  const v = K.view(cam, 300);
  const gy = opts.groundY ?? 320;
  const lo = lwOuter(c);
  const li = lwInner(c);

  c.save();
  if (opts.showBands) {
    // Subtle altitude strata bands
    c.fillStyle = P.bg2;
    c.fillRect(v.x0, -520, v.x1 - v.x0, 220);
    A.line(c, [[v.x0, -300], [v.x1, -300]], P.light, li, [10, 10]);
    A.line(c, [[v.x0, -60], [v.x1, -60]], P.light, li, [10, 10]);
  }

  // Soft stylized clouds
  const cloudSeeds = [-700, -220, 320, 780];
  for (let i = 0; i < cloudSeeds.length; i++) {
    const cx = cloudSeeds[i]!;
    const cy = -180 + (i % 2) * 70;
    A.rrect(c, cx - 90, cy - 18, 180, 36, 18, P.paper, P.light, li);
    A.circle(c, cx - 30, cy - 16, 26, P.paper, null, 0);
    A.circle(c, cx + 25, cy - 20, 32, P.paper, null, 0);
  }

  // Ground + optional hill ridge
  c.beginPath();
  c.moveTo(v.x0, gy);
  if (opts.ridgeX !== undefined) {
    const rx = opts.ridgeX;
    const rh = opts.ridgeH ?? 180;
    c.lineTo(rx - 260, gy);
    c.quadraticCurveTo(rx - 90, gy - rh, rx, gy - rh);
    c.quadraticCurveTo(rx + 90, gy - rh, rx + 260, gy);
  }
  c.lineTo(v.x1, gy);
  c.lineTo(v.x1, v.y1 + 400);
  c.lineTo(v.x0, v.y1 + 400);
  c.closePath();
  A.fs(c, P.bg2, P.ink, lo);

  // Sub-surface hatching line
  A.line(c, [[v.x0, gy + 28], [v.x1, gy + 28]], P.light, li);
  c.restore();
}

export function drawTacticalMapBg(
  c: CanvasRenderingContext2D,
  cam: K.Cam,
  opts: { frontX?: number; showFrontStrip?: boolean; stripWidth?: number } = {},
) {
  A.clear(c, P.bg);
  const v = K.view(cam, 300);
  const li = lwInner(c);

  c.save();
  // Topographic contour patches
  A.ellipse(c, -480, -220, 260, 150, 0.2, P.bg2, P.light, li);
  A.ellipse(c, -480, -220, 160, 90, 0.2, P.bg, P.light, li);
  A.ellipse(c, 460, 210, 280, 160, -0.15, P.bg2, P.light, li);
  A.ellipse(c, 460, 210, 170, 95, -0.15, P.bg, P.light, li);

  // Subtle map grid
  const step = 160;
  const x0 = Math.floor(v.x0 / step) * step;
  const y0 = Math.floor(v.y0 / step) * step;
  c.strokeStyle = P.bg2;
  c.lineWidth = A.px(c, 1.4);
  c.beginPath();
  for (let x = x0; x <= v.x1; x += step) {
    c.moveTo(x, v.y0);
    c.lineTo(x, v.y1);
  }
  for (let y = y0; y <= v.y1; y += step) {
    c.moveTo(v.x0, y);
    c.lineTo(v.x1, y);
  }
  c.stroke();

  // Road network landmark
  A.line(
    c,
    [
      [v.x0, 90],
      [-260, 60],
      [120, -40],
      [v.x1, -80],
    ],
    P.light,
    A.px(c, 8),
  );

  if (opts.showFrontStrip) {
    const fx = opts.frontX ?? 0;
    const sw = opts.stripWidth ?? 260;
    A.withA(c, 0.16, () => {
      c.fillStyle = P.enemy;
      c.fillRect(fx - sw / 2, v.y0, sw, v.y1 - v.y0);
    });
    A.line(c, [[fx - sw / 2, v.y0], [fx - sw / 2, v.y1]], P.oliveDark, li, [12, 8]);
    A.line(c, [[fx + sw / 2, v.y0], [fx + sw / 2, v.y1]], P.enemy, li, [12, 8]);
    A.line(c, [[fx, v.y0], [fx, v.y1]], P.ink2, li, [6, 8]);
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 2. HALE DRONE (High-Altitude Long-Endurance UAV — Global Hawk style)
// ═══════════════════════════════════════════════════════════════════════════

export function drawHaleDrone(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: {
    view?: ViewMode;
    rot?: number;
    cutaway?: boolean;
    wingStretch?: number; // 1 = normal long wing, <1 = compact morph
    sensorScan?: number;  // 0..1 scan cone intensity
    color?: string;
  } = {},
) {
  const view = opts.view ?? 'side';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const bodyCol = opts.color ?? P.olive;
  const topCol = opts.color === P.enemy ? P.enemyLight : P.oliveLight;
  const ws = opts.wingStretch ?? 1;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(scale, scale);

  if (view === 'top') {
    const halfSpan = 280 * ws;
    // V-tail stabilizers
    A.poly(
      c,
      [
        [-88, 0],
        [-125, -48],
        [-108, -52],
        [-70, 0],
        [-108, 52],
        [-125, 48],
      ],
      topCol,
      P.ink,
      lo,
    );
    // Ultra-long glider wings
    A.poly(
      c,
      [
        [15, -16],
        [-5, -halfSpan],
        [-24, -halfSpan],
        [-22, -16],
        [-22, 16],
        [-24, halfSpan],
        [-5, halfSpan],
        [15, 16],
      ],
      bodyCol,
      P.ink,
      lo,
    );
    // Wing spar rib lines
    A.line(c, [[-6, -halfSpan * 0.85], [4, -20]], P.ink2, li);
    A.line(c, [[-6, halfSpan * 0.85], [4, 20]], P.ink2, li);

    // Slender fuselage
    A.rrect(c, -105, -16, 210, 32, 16, bodyCol, P.ink, lo);
    // Bulbous satellite/radome hump at nose
    A.ellipse(c, 58, 0, 38, 15, 0, topCol, P.ink, lo);
    // Dorsal turbofan intake + exhaust at rear
    A.rrect(c, -92, -10, 36, 20, 6, P.slate, P.ink, li);
    // Ventral sensor indicator ring
    A.circle(c, 35, 0, 7, P.glass, P.ink, li);
  } else if (view === 'front') {
    const halfSpan = 280 * ws;
    // V-tail
    A.line(c, [[0, -10], [-42, -48]], P.ink, lo);
    A.line(c, [[0, -10], [42, -48]], P.ink, lo);
    // Long high-aspect wings
    A.poly(
      c,
      [
        [-halfSpan, -6],
        [-30, 4],
        [30, 4],
        [halfSpan, -6],
        [halfSpan, 2],
        [30, 14],
        [-30, 14],
        [-halfSpan, 2],
      ],
      bodyCol,
      P.ink,
      lo,
    );
    // Dorsal intake pod
    A.circle(c, 0, -22, 12, P.slate, P.ink, lo);
    // Fuselage & bulbous dome
    A.ellipse(c, 0, 0, 24, 20, 0, topCol, P.ink, lo);
    // Underbelly camera ball
    A.circle(c, 0, 22, 9, P.glass, P.ink, li);
  } else {
    // 'side' or 'cutaway'
    if (opts.sensorScan && opts.sensorScan > 0) {
      A.withA(c, 0.22 * opts.sensorScan, () => {
        A.poly(c, [[52, 22], [-180, 320], [280, 320]], P.sky, null, 0);
      });
      A.line(c, [[52, 22], [-180, 320]], P.sky, li, [8, 6]);
      A.line(c, [[52, 22], [280, 320]], P.sky, li, [8, 6]);
    }

    // V-tail side profile
    A.poly(c, [[-115, -4], [-152, -56], [-128, -56], [-88, -4]], topCol, P.ink, lo);
    // Dorsal engine nacelle
    A.rrect(c, -118, -28, 56, 22, 8, P.slate, P.ink, lo);
    // Fuselage with signature bulbous nose hump
    c.beginPath();
    c.moveTo(-135, 0);
    c.lineTo(-85, -14);
    c.lineTo(15, -14);
    c.quadraticCurveTo(55, -34, 95, -18);
    c.quadraticCurveTo(128, -6, 125, 8);
    c.lineTo(80, 14);
    c.lineTo(-105, 14);
    c.closePath();
    A.fs(c, bodyCol, P.ink, lo);

    // Top dome highlight
    A.ellipse(c, 64, -12, 34, 11, -0.08, topCol, P.ink, li);

    // Ventral EO/IR sensor ball
    A.circle(c, 52, 18, 11, P.dark, P.ink, lo);
    A.circle(c, 55, 19, 5, P.glass, P.ink, li);

    // Long wing root extending slightly in profile
    A.poly(
      c,
      [
        [-25, 4],
        [20, 2],
        [45, 18 * ws],
        [-45, 22 * ws],
      ],
      topCol,
      P.ink,
      lo,
    );

    if (opts.cutaway || view === 'cutaway') {
      // Internal cutaway: large fuel tank in center, small fuel-sipping engine in rear, sensor in nose
      A.rrect(c, -52, -10, 74, 20, 6, P.amber, P.ink, li);
      A.rrect(c, -108, -24, 38, 14, 4, P.amber, P.ink, li);
      A.circle(c, 82, -4, 9, P.sky, P.ink, li);
    }
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SMALL AIRLINER (Reference scale comparison)
// ═══════════════════════════════════════════════════════════════════════════

export function drawAirliner(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { view?: ViewMode; rot?: number; ghost?: boolean } = {},
) {
  const view = opts.view ?? 'top';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const fill = opts.ghost ? P.bg2 : P.paper;
  const wingFill = opts.ghost ? P.bg2 : P.light;
  const stroke = opts.ghost ? P.slate : P.ink;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(scale, scale);

  if (view === 'top') {
    // Swept wings (narrower span than HALE: halfSpan = 165 vs HALE 280!)
    A.poly(
      c,
      [
        [25, -22],
        [-35, -165],
        [-58, -165],
        [-25, -22],
        [-25, 22],
        [-58, 165],
        [-35, 165],
        [25, 22],
      ],
      wingFill,
      stroke,
      lo,
    );
    // 2 Underwing engines
    A.rrect(c, -8, -82, 34, 18, 6, P.slate, stroke, li);
    A.rrect(c, -8, 64, 34, 18, 6, P.slate, stroke, li);
    // Tailplane
    A.poly(
      c,
      [
        [-105, -12],
        [-138, -58],
        [-152, -58],
        [-128, 0],
        [-152, 58],
        [-138, 58],
        [-105, 12],
      ],
      wingFill,
      stroke,
      lo,
    );
    // Wide passenger fuselage
    A.rrect(c, -140, -24, 285, 48, 24, fill, stroke, lo);
    // Cockpit windshield
    A.poly(c, [[118, -13], [132, -7], [132, 7], [118, 13]], P.glass, stroke, li);
  } else {
    // Side view
    A.poly(c, [[-115, -18], [-152, -72], [-128, -72], [-85, -18]], wingFill, stroke, lo);
    A.rrect(c, -135, -24, 275, 46, 22, fill, stroke, lo);
    // Passenger windows
    for (let wx = -85; wx <= 75; wx += 18) {
      A.rrect(c, wx, -10, 9, 11, 3, P.glass, stroke, li * 0.8);
    }
    // Cockpit window
    A.poly(c, [[105, -12], [128, -4], [128, 4], [105, 4]], P.glass, stroke, li);
    // Wing + engine pod
    A.poly(c, [[-25, 8], [28, 6], [5, 24], [-42, 24]], wingFill, stroke, lo);
    A.rrect(c, -12, 18, 40, 18, 7, P.slate, stroke, li);
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. CARGO SHIP & ROWING BOAT (Analogy in sc02)
// ═══════════════════════════════════════════════════════════════════════════

export function drawCargoShip(c: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Stacked containers on deck
  const cols = [P.olive, P.sand, P.slate, P.oliveLight, P.amber];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const cx = -210 + col * 62;
      const cy = -36 - (row + 1) * 24;
      A.rrect(c, cx, cy, 58, 22, 3, cols[(row + col) % cols.length]!, P.ink, li);
    }
  }
  // Bridge superstructure at stern
  A.rrect(c, -285, -118, 58, 82, 4, P.paper, P.ink, lo);
  A.rrect(c, -278, -106, 44, 14, 2, P.glass, P.ink, li);
  // Massive hull
  A.poly(
    c,
    [
      [-310, -36],
      [250, -36],
      [290, -44],
      [265, 18],
      [-295, 18],
    ],
    P.dark,
    P.ink,
    lo,
  );
  A.line(c, [[-295, 2], [268, 2]], P.enemy, lo);
  c.restore();
}

export function drawRowBoat(c: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  // Tiny wooden/metal hull
  A.poly(
    c,
    [
      [-36, -10],
      [38, -12],
      [26, 10],
      [-28, 10],
    ],
    P.sand,
    P.ink,
    lo,
  );
  // Oar
  A.line(c, [[-4, -8], [-18, 22]], P.ink, li);
  A.rrect(c, -24, 18, 10, 14, 3, P.amber, P.ink, li);
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 5. QUADCOPTER / FPV / FIBER / AI DRONE
// ═══════════════════════════════════════════════════════════════════════════

export function drawQuadDrone(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: {
    view?: ViewMode;
    rot?: number;
    rotorPhase?: number;
    cutaway?: boolean;
    batteryLevel?: number; // 0..1
    fpvWarhead?: boolean;
    fiberSpool?: boolean;
    aiSeeker?: boolean;
    showLiftVectors?: boolean;
    color?: string;
  } = {},
) {
  const view = opts.view ?? 'side';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const bodyCol = opts.color ?? P.olive;
  const topCol = opts.color === P.enemy ? P.enemyLight : P.oliveLight;
  const phase = opts.rotorPhase ?? 0;
  const bat = opts.batteryLevel ?? 1;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(scale, scale);

  if (view === 'top') {
    const arms: [number, number][] = [
      [-48, -44],
      [48, -44],
      [-48, 44],
      [48, 44],
    ];
    // 4 Diagonal arms
    for (const [ax, ay] of arms) {
      A.line(c, [[0, 0], [ax, ay]], P.dark, lo * 1.3);
      // Rotor disc
      A.withA(c, 0.25, () => {
        A.circle(c, ax, ay, 26, P.sky, P.ink2, li);
      });
      const ang = phase + (ax * ay > 0 ? 0.6 : -0.6);
      const bx = Math.cos(ang) * 24;
      const by = Math.sin(ang) * 24;
      A.line(c, [[ax - bx, ay - by], [ax + bx, ay + by]], P.ink, lo);
      A.circle(c, ax, ay, 6, P.slate, P.ink, li);
    }
    // Optional FPV warhead protruding forward
    if (opts.fpvWarhead) {
      A.rrect(c, 18, -9, 34, 18, 6, P.amber, P.ink, lo);
      A.poly(c, [[52, -7], [66, 0], [52, 7]], P.enemy, P.ink, li);
    }
    // Optional rear optical fiber spool
    if (opts.fiberSpool) {
      A.rrect(c, -48, -11, 24, 22, 5, P.sky, P.ink, lo);
    }
    // Center body
    A.rrect(c, -26, -18, 52, 36, 9, bodyCol, P.ink, lo);
    // Battery block on back
    A.rrect(c, -16, -11, 30 * Math.max(0.2, bat), 22, 4, P.amber, P.ink, li);
    // Front camera lens
    A.circle(c, 24, 0, 7, opts.aiSeeker ? P.sky : P.glass, P.ink, li);
  } else {
    // 'side' or 'cutaway'
    if (opts.showLiftVectors) {
      for (const rx of [-54, 54]) {
        A.line(c, [[rx, 8], [rx, 46]], P.amber, li, [6, 5]);
        A.poly(c, [[rx - 6, 42], [rx + 6, 42], [rx, 52]], P.amber, null, 0);
      }
    }

    // Arms left & right
    A.line(c, [[-58, -6], [58, -6]], P.dark, lo * 1.2);
    // Motor pods & spinning blades
    for (const rx of [-56, 56]) {
      A.rrect(c, rx - 8, -16, 16, 14, 3, P.slate, P.ink, lo);
      const bladeW = 28 * (0.45 + 0.55 * Math.abs(Math.cos(phase + rx)));
      A.line(c, [[rx - bladeW, -20], [rx + bladeW, -20]], P.ink, lo);
      A.circle(c, rx, -20, 3.5, P.ink, null, 0);
    }

    // Landing skids
    A.line(c, [[-28, 12], [-34, 28], [34, 28], [28, 12]], P.dark, li);

    // Optional under-slung FPV warhead (RPG/shaped-charge cylinder)
    if (opts.fpvWarhead) {
      A.rrect(c, -18, 12, 46, 16, 6, P.amber, P.ink, lo);
      A.poly(c, [[28, 13], [44, 20], [28, 27]], P.enemy, P.ink, li);
    }

    // Optional rear optical fiber spool cylinder
    if (opts.fiberSpool) {
      A.rrect(c, -52, -4, 24, 18, 5, P.sky, P.ink, lo);
      A.line(c, [[-44, -4], [-44, 14]], P.ink, li);
      A.line(c, [[-36, -4], [-36, 14]], P.ink, li);
    }

    // Main body shell
    A.rrect(c, -30, -14, 60, 26, 8, bodyCol, P.ink, lo);
    A.rrect(c, -22, -20, 38, 8, 4, topCol, P.ink, li);

    // Radio antenna whip
    A.line(c, [[-18, -20], [-24, -42]], P.ink, li);
    A.circle(c, -24, -42, 4, P.sky, P.ink, li);

    // Front camera gimbal (or AI target recognition module)
    A.circle(c, 30, 2, 9, opts.aiSeeker ? P.sky : P.dark, P.ink, lo);
    A.circle(c, 33, 2, 4.5, P.glass, P.ink, li);

    if (opts.cutaway || view === 'cutaway') {
      // Battery compartment inside body
      A.rrect(c, -22, -10, 38, 18, 4, P.paper, P.ink, li);
      if (bat > 0.02) {
        A.rrect(c, -20, -8, 34 * bat, 14, 3, P.amber, null, 0);
      }
      // Radio module chip
      A.rrect(c, -28, -8, 6, 12, 2, P.sky, P.ink, li * 0.8);
    }
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 6. MALE DRONE (Medium-Altitude Armed Drone — TB2 / Reaper hybrid)
// ═══════════════════════════════════════════════════════════════════════════

export function drawMaleDrone(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: {
    view?: ViewMode;
    rot?: number;
    missiles?: number; // 0, 1, 2
    propPhase?: number;
    damaged?: boolean;
  } = {},
) {
  const view = opts.view ?? 'side';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const missiles = opts.missiles ?? 2;
  const prop = opts.propPhase ?? 0;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(scale, scale);

  if (view === 'top') {
    // Straight medium-span wings
    A.poly(
      c,
      [
        [15, -14],
        [-5, -145],
        [-24, -145],
        [-20, -14],
        [-20, 14],
        [-24, 145],
        [-5, 145],
        [15, 14],
      ],
      P.olive,
      P.ink,
      lo,
    );
    // Twin tail booms + inverted V-tail
    A.line(c, [[-15, -36], [-95, -36]], P.oliveDark, lo);
    A.line(c, [[-15, 36], [-95, 36]], P.oliveDark, lo);
    A.line(c, [[-95, -36], [-95, 36]], P.oliveLight, lo);
    // Underwing missiles
    if (missiles >= 1) A.rrect(c, -8, -76, 36, 8, 3, P.amber, P.ink, li);
    if (missiles >= 2) A.rrect(c, -8, 68, 36, 8, 3, P.amber, P.ink, li);
    // Fuselage pod
    A.rrect(c, -62, -16, 136, 32, 14, P.oliveLight, P.ink, lo);
    // Pusher prop at rear
    const pw = 22 * Math.cos(prop);
    A.line(c, [[-66, -pw], [-66, pw]], P.ink, lo);
  } else {
    // Side view
    // Twin-boom tail + inverted V fin
    A.line(c, [[-25, 0], [-115, -4]], P.oliveDark, lo);
    A.poly(c, [[-95, -4], [-125, -46], [-105, -46], [-78, -4]], P.oliveLight, P.ink, lo);

    // Main fuselage pod
    c.beginPath();
    c.moveTo(-68, -8);
    c.lineTo(25, -16);
    c.quadraticCurveTo(68, -16, 85, 2);
    c.lineTo(68, 12);
    c.lineTo(-68, 12);
    c.closePath();
    A.fs(c, opts.damaged ? P.slate : P.olive, P.ink, lo);

    // Rear pusher propeller
    const ph = 26 * (0.35 + 0.65 * Math.abs(Math.sin(prop)));
    A.line(c, [[-72, -ph], [-72, ph]], P.ink, lo);
    A.circle(c, -70, 0, 5, P.slate, P.ink, li);

    // Chin EO/IR camera turret
    A.circle(c, 42, 16, 10, P.dark, P.ink, lo);
    A.circle(c, 45, 17, 4.5, P.glass, P.ink, li);

    // Wing + pylon + guided missiles
    A.rrect(c, -24, -2, 42, 10, 4, P.oliveLight, P.ink, lo);
    if (missiles >= 1) {
      A.line(c, [[-4, 8], [-4, 22]], P.ink, li);
      A.rrect(c, -26, 20, 48, 10, 4, P.paper, P.ink, li);
      A.poly(c, [[22, 20], [34, 25], [22, 30]], P.amber, P.ink, li);
    }
    if (missiles >= 2) {
      A.rrect(c, -20, 31, 44, 9, 4, P.paper, P.ink, li);
      A.poly(c, [[24, 31], [35, 35.5], [24, 40]], P.amber, P.ink, li);
    }
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 7. LOITERING MUNITION (Cruciform-wing diving drone — Lancet / Switchblade)
// ═══════════════════════════════════════════════════════════════════════════

export function drawLoiterDrone(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { view?: ViewMode; rot?: number; propPhase?: number } = {},
) {
  const view = opts.view ?? 'side';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const prop = opts.propPhase ?? 0;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(scale, scale);

  if (view === 'top') {
    // Front X-wings and rear X-wings
    A.poly(c, [[10, -56], [22, -56], [8, 56], [-4, 56]], P.oliveLight, P.ink, lo);
    A.poly(c, [[-34, -44], [-22, -44], [-34, 44], [-46, 44]], P.oliveLight, P.ink, lo);
    // Tubular fuselage
    A.rrect(c, -56, -10, 108, 20, 10, P.olive, P.ink, lo);
    // Warhead nose
    A.poly(c, [[44, -9], [66, 0], [44, 9]], P.amber, P.ink, lo);
    A.circle(c, 60, 0, 4, P.glass, P.ink, li);
  } else {
    // Side view
    // Cruciform wings angled
    A.poly(c, [[4, -38], [18, -38], [4, 38], [-10, 38]], P.oliveLight, P.ink, lo);
    A.poly(c, [[-38, -28], [-26, -28], [-38, 28], [-50, 28]], P.oliveLight, P.ink, lo);
    // Cylindrical body
    A.rrect(c, -56, -11, 104, 22, 10, P.olive, P.ink, lo);
    // Warhead section in nose
    A.rrect(c, 16, -9, 28, 18, 4, P.amber, P.ink, li);
    // Optical camera cone
    A.poly(c, [[44, -10], [66, 0], [44, 10]], P.dark, P.ink, lo);
    A.circle(c, 56, 0, 4.5, P.sky, P.ink, li);
    // Pusher propeller
    const ph = 18 * (0.4 + 0.6 * Math.abs(Math.cos(prop)));
    A.line(c, [[-60, -ph], [-60, ph]], P.ink, lo);
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 8. LONG-RANGE ONE-WAY DRONE (Delta-wing propeller — Shahed style)
// ═══════════════════════════════════════════════════════════════════════════

export function drawOneWayDrone(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: {
    view?: ViewMode;
    rot?: number;
    cutaway?: boolean;
    propPhase?: number;
    color?: string;
  } = {},
) {
  const view = opts.view ?? 'top';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const bodyCol = opts.color ?? P.olive;
  const topCol = opts.color === P.enemy ? P.enemyLight : P.oliveLight;
  const prop = opts.propPhase ?? 0;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(scale, scale);

  if (view === 'top') {
    // Signature clipped delta wing
    A.poly(
      c,
      [
        [52, -8],
        [-58, -76],
        [-74, -76],
        [-74, 76],
        [-58, 76],
        [52, 8],
      ],
      bodyCol,
      P.ink,
      lo,
    );
    // Wingtip vertical fins
    A.rrect(c, -76, -80, 24, 6, 2, P.dark, P.ink, li);
    A.rrect(c, -76, 74, 24, 6, 2, P.dark, P.ink, li);
    // Cylindrical center body + nose cone
    A.poly(
      c,
      [
        [-74, -14],
        [45, -12],
        [82, 0],
        [45, 12],
        [-74, 14],
      ],
      topCol,
      P.ink,
      lo,
    );
    // Pusher prop at tail
    const pw = 22 * (0.4 + 0.6 * Math.abs(Math.sin(prop)));
    A.line(c, [[-80, -pw], [-80, pw]], P.ink, lo);

    if (opts.cutaway) {
      // Warhead in nose, GNSS receiver in middle, small engine in rear
      A.rrect(c, 22, -9, 32, 18, 5, P.amber, P.ink, li);
      A.rrect(c, -18, -8, 26, 16, 4, P.sky, P.ink, li);
      A.rrect(c, -68, -9, 26, 18, 4, P.slate, P.ink, li);
    }
  } else {
    // 'side' or 'cutaway'
    // Wingtip stabilizer fin at rear
    A.poly(c, [[-45, 4], [-76, -34], [-56, -34], [-28, 4]], P.dark, P.ink, lo);
    // Fuselage + delta wing root
    A.poly(
      c,
      [
        [-74, -12],
        [42, -14],
        [84, 0],
        [42, 14],
        [-74, 14],
      ],
      bodyCol,
      P.ink,
      lo,
    );
    // Delta wing edge line
    A.poly(c, [[-68, 4], [25, 4], [5, 16], [-68, 16]], topCol, P.ink, li);
    // Rear piston engine block + pusher prop
    A.rrect(c, -82, -8, 12, 16, 3, P.slate, P.ink, li);
    const ph = 26 * (0.35 + 0.65 * Math.abs(Math.cos(prop)));
    A.line(c, [[-86, -ph], [-86, ph]], P.ink, lo);

    if (opts.cutaway || view === 'cutaway') {
      // 1. Nose warhead (amber/enemy)
      A.poly(c, [[22, -10], [46, -10], [72, 0], [46, 10], [22, 10]], P.amber, P.ink, li);
      // 2. Satellite navigation receiver + dorsal patch antenna (sky)
      A.rrect(c, -16, -9, 28, 16, 4, P.sky, P.ink, li);
      A.rrect(c, -10, -18, 16, 6, 2, P.sky, P.ink, li);
      // 3. Small piston engine at rear
      A.rrect(c, -68, -9, 32, 18, 4, P.slate, P.ink, li);
      A.circle(c, -52, 0, 5, P.amber, P.ink, li * 0.8);
    }
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 9. MANNED FIGHTER JET (With removable cockpit / pilot cutaway)
// ═══════════════════════════════════════════════════════════════════════════

export function drawFighterJet(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: {
    view?: ViewMode;
    rot?: number;
    cutaway?: boolean;
    pilotExtractY?: number; // 0 = inside, <0 = lifted up out of fuselage
    afterburner?: number;   // 0..1
    heavyLoad?: boolean;
  } = {},
) {
  const view = opts.view ?? 'side';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const extractY = opts.pilotExtractY ?? 0;

  c.save();
  c.translate(x, y);
  if (opts.rot) c.rotate(opts.rot);
  c.scale(scale, scale);

  if (view === 'top') {
    // Swept delta/trapezoid fighter wings
    A.poly(
      c,
      [
        [18, -18],
        [-42, -118],
        [-72, -118],
        [-58, -18],
        [-58, 18],
        [-72, 118],
        [-42, 118],
        [18, 18],
      ],
      P.olive,
      P.ink,
      lo,
    );
    // Horizontal stabilizers
    A.poly(
      c,
      [
        [-78, -16],
        [-112, -56],
        [-126, -56],
        [-105, 0],
        [-126, 56],
        [-112, 56],
        [-78, 16],
      ],
      P.oliveLight,
      P.ink,
      lo,
    );
    // Fuselage + pointed radome
    A.poly(
      c,
      [
        [-115, -16],
        [45, -16],
        [115, 0],
        [45, 16],
        [-115, 16],
      ],
      P.oliveLight,
      P.ink,
      lo,
    );
    // Canopy
    A.ellipse(c, 32, 0, 28, 10, 0, P.glass, P.ink, li);
  } else {
    // 'side' or 'cutaway'
    if (opts.afterburner && opts.afterburner > 0) {
      const ab = opts.afterburner;
      A.poly(
        c,
        [
          [-132, -10],
          [-132 - 85 * ab, 0],
          [-132, 10],
        ],
        P.amber,
        null,
        0,
      );
    }

    // Tail fin
    A.poly(c, [[-75, -12], [-128, -74], [-96, -74], [-42, -12]], P.oliveLight, P.ink, lo);
    // Engine exhaust nozzle
    A.rrect(c, -134, -13, 24, 26, 4, P.dark, P.ink, lo);

    // Main fighter fuselage
    c.beginPath();
    c.moveTo(-115, -16);
    c.lineTo(10, -18);
    c.lineTo(75, -10);
    c.lineTo(132, 4);
    c.lineTo(75, 16);
    c.lineTo(-115, 16);
    c.closePath();
    A.fs(c, P.olive, P.ink, lo);

    // Underwing heavy weapons
    if (opts.heavyLoad) {
      A.rrect(c, -35, 18, 68, 14, 6, P.amber, P.ink, lo);
      A.poly(c, [[33, 18], [52, 25], [33, 32]], P.enemy, P.ink, li);
    }

    // Wing root
    A.poly(c, [[-45, 4], [25, 4], [5, 18], [-62, 18]], P.oliveLight, P.ink, lo);

    // Cockpit cavity inside fuselage when cutaway or extracting pilot
    if (opts.cutaway || view === 'cutaway' || extractY < -2) {
      A.rrect(c, -2, -16, 68, 18, 4, P.bg2, P.ink2, li);
    }

    // Cockpit module (can be lifted out via pilotExtractY!)
    c.save();
    c.translate(0, extractY);
    if (opts.cutaway || view === 'cutaway' || extractY !== 0) {
      // Highlight box around human support system when extracting
      if (extractY < -5) {
        A.rrect(c, -8, -58, 76, 56, 8, P.bg2, P.amber, li);
      }
      // Ejection seat (slate + amber handles)
      A.poly(c, [[10, -12], [18, -44], [28, -44], [24, -6], [42, -6], [42, -12]], P.slate, P.ink, li);
      // Life support oxygen cylinder (sky)
      A.rrect(c, 0, -34, 10, 22, 4, P.sky, P.ink, li);
      // Pilot torso + head + helmet visor
      A.rrect(c, 20, -30, 18, 22, 5, P.oliveDark, P.ink, li);
      A.circle(c, 30, -38, 9, P.paper, P.ink, li);
      A.rrect(c, 31, -41, 8, 6, 2, P.dark, P.ink, li * 0.8);
      // Instrument panel
      A.poly(c, [[46, -12], [58, -28], [64, -28], [64, -12]], P.dark, P.ink, li);
    }
    // Canopy glass arch
    c.beginPath();
    c.moveTo(-4, -16);
    c.quadraticCurveTo(32, -52, 72, -12);
    c.closePath();
    A.withA(c, 0.65, () => A.fs(c, P.glass, P.ink, lo));
    c.restore();
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 10. SAM SYSTEM, MISSILE & GROUND STATION
// ═══════════════════════════════════════════════════════════════════════════

export function drawSamSystem(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { view?: ViewMode; radarAngle?: number; missiles?: number; elevateDeg?: number } = {},
) {
  const view = opts.view ?? 'side';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const missiles = opts.missiles ?? 2;

  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  if (view === 'top') {
    A.rrect(c, -56, -30, 112, 60, 10, P.enemy, P.ink, lo);
    A.rrect(c, -36, -22, 64, 18, 4, P.enemyLight, P.ink, li);
    A.rrect(c, -36, 4, 64, 18, 4, P.enemyLight, P.ink, li);
    // Rotating radar bar
    const ra = opts.radarAngle ?? 0;
    c.save();
    c.translate(-32, 0);
    c.rotate(ra);
    A.rrect(c, -6, -24, 12, 48, 4, P.amber, P.ink, li);
    c.restore();
  } else {
    // Side view (ground at y = 0)
    // Heavy wheeled/tracked chassis
    A.rrect(c, -68, -42, 136, 28, 6, P.enemy, P.ink, lo);
    for (const wx of [-46, -16, 16, 46]) {
      A.circle(c, wx, -12, 12, P.dark, P.ink, lo);
      A.circle(c, wx, -12, 5, P.slate, P.ink, li);
    }
    // Rotating radar mast
    A.rrect(c, -52, -74, 22, 32, 4, P.enemyLight, P.ink, lo);
    A.ellipse(c, -41, -84, 8, 18, 0.25, P.amber, P.ink, lo);

    // Angled missile launch rails
    c.save();
    c.translate(10, -48);
    c.rotate(((opts.elevateDeg ?? -38) * Math.PI) / 180);
    A.rrect(c, -35, -18, 82, 16, 4, P.enemyLight, P.ink, lo);
    if (missiles >= 1) {
      A.poly(c, [[47, -16], [66, -10], [47, -4]], P.amber, P.ink, li);
    }
    if (missiles >= 2) {
      A.rrect(c, -35, -34, 82, 14, 4, P.enemyLight, P.ink, lo);
      A.poly(c, [[47, -33], [66, -27], [47, -21]], P.amber, P.ink, li);
    }
    c.restore();
  }
  c.restore();
}

export function drawMissile(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleRad: number,
  scale = 1,
  opts: { color?: string; flame?: boolean } = {},
) {
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  c.save();
  c.translate(x, y);
  c.rotate(angleRad);
  c.scale(scale, scale);

  if (opts.flame !== false) {
    A.poly(c, [[-34, -6], [-68, 0], [-34, 6]], P.amber, null, 0);
  }
  A.rrect(c, -34, -6, 56, 12, 4, opts.color ?? P.paper, P.ink, lo);
  A.poly(c, [[22, -6], [38, 0], [22, 6]], P.enemy, P.ink, li);
  A.poly(c, [[-34, -6], [-42, -14], [-26, -6]], P.slate, P.ink, li);
  A.poly(c, [[-34, 6], [-42, 14], [-26, 6]], P.slate, P.ink, li);
  c.restore();
}

export function drawGroundStation(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { cutaway?: boolean; activeLink?: boolean } = {},
) {
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);

  // Container cabin on ground (y = 0 is ground)
  A.rrect(c, -120, -96, 240, 96, 8, opts.cutaway ? P.paper : P.olive, P.ink, lo);
  // Roof antenna mast
  A.line(c, [[70, -96], [70, -142]], P.ink, lo);
  A.circle(c, 70, -146, 7, opts.activeLink ? P.sky : P.slate, P.ink, li);

  if (opts.cutaway) {
    // Container frame ribs
    A.rrect(c, -112, -88, 224, 80, 4, P.bg, P.ink2, li);
    // 2 Operator consoles + glowing screens
    for (const ox of [-55, 35]) {
      // Desk + dual screens
      A.rrect(c, ox - 8, -52, 42, 6, 2, P.slate, P.ink, li);
      A.rrect(c, ox + 4, -78, 26, 24, 3, opts.activeLink ? P.sky : P.glass, P.ink, li);
      // Seated operator
      A.circle(c, ox - 18, -66, 9, P.skin, P.ink, li);
      A.rrect(c, ox - 26, -54, 18, 28, 5, P.oliveDark, P.ink, li);
      // Chair
      A.line(c, [[ox - 28, -60], [ox - 28, -22], [ox - 12, -22]], P.ink, li);
    }
  } else {
    // Exterior container corrugations
    for (let cx = -90; cx <= 90; cx += 30) {
      A.line(c, [[cx, -84], [cx, -12]], P.oliveDark, li);
    }
  }
  c.restore();
}

export function drawSatDish(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: { dir?: 1 | -1 } = {},
) {
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const d = opts.dir ?? 1;
  c.save();
  c.translate(x, y);
  c.scale(scale * d, scale);
  // Base pedestal
  A.poly(c, [[-22, 0], [-8, -42], [8, -42], [22, 0]], P.slate, P.ink, lo);
  // Parabolic dish tilted up
  c.save();
  c.translate(0, -48);
  c.rotate(-0.65);
  c.beginPath();
  c.arc(0, 0, 38, -Math.PI * 0.45, Math.PI * 0.45);
  A.fs(c, P.paper, P.ink, lo);
  A.line(c, [[6, 0], [32, 0]], P.ink, li);
  A.circle(c, 34, 0, 5, P.sky, P.ink, li);
  c.restore();
  c.restore();
}

export function drawSatellite(c: CanvasRenderingContext2D, x: number, y: number, scale = 1) {
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  c.save();
  c.translate(x, y);
  c.scale(scale, scale);
  // Solar panels
  A.rrect(c, -86, -12, 58, 24, 3, P.sky, P.ink, lo);
  A.rrect(c, 28, -12, 58, 24, 3, P.sky, P.ink, lo);
  A.line(c, [[-57, -12], [-57, 12]], P.ink2, li);
  A.line(c, [[57, -12], [57, 12]], P.ink2, li);
  // Satellite bus
  A.rrect(c, -22, -18, 44, 36, 6, P.paper, P.ink, lo);
  // Downward dish
  A.poly(c, [[-14, 18], [14, 18], [22, 30], [-22, 30]], P.amber, P.ink, li);
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 11. SOLDIER UNIT (Controller / FPV / Backpack / Jammer / Shotgun / MG)
// ═══════════════════════════════════════════════════════════════════════════

export function drawSoldierUnit(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale = 1,
  opts: {
    view?: ViewMode;
    role?: 'controller' | 'fpv' | 'backpack' | 'jammer' | 'shotgun' | 'mg';
    enemy?: boolean;
    facing?: 1 | -1;
    aimAngle?: number;
  } = {},
) {
  const view = opts.view ?? 'side';
  const lo = lwOuter(c) / scale;
  const li = lwInner(c) / scale;
  const col = opts.enemy ? P.enemy : P.olive;
  const colLight = opts.enemy ? P.enemyLight : P.oliveLight;
  const dir = opts.facing ?? 1;
  const role = opts.role ?? 'controller';

  c.save();
  c.translate(x, y);
  c.scale(scale * dir, scale);

  if (view === 'top') {
    // Shoulders + helmet top-down
    A.rrect(c, -18, -24, 36, 48, 14, col, P.ink, lo);
    A.circle(c, 0, 0, 14, colLight, P.ink, lo);
    if (role === 'controller' || role === 'fpv') {
      A.rrect(c, 14, -10, 14, 20, 3, P.dark, P.ink, li);
      A.line(c, [[28, 0], [42, 0]], P.sky, li);
    } else if (role === 'jammer' || role === 'shotgun') {
      A.rrect(c, 12, -4, 34, 8, 2, P.dark, P.ink, li);
    }
  } else {
    // Side view (ground at y = 0)
    // Legs
    A.capsule(c, [-8, -28], [-12, -4], 9, col, P.ink, lo);
    A.capsule(c, [8, -28], [12, -4], 9, col, P.ink, lo);
    // Backpack if backpack role
    if (role === 'backpack') {
      A.rrect(c, -28, -64, 16, 30, 5, P.sand, P.ink, lo);
    }
    // Torso
    A.rrect(c, -14, -68, 28, 42, 9, col, P.ink, lo);
    // Head + helmet
    A.circle(c, 0, -82, 12, P.skin, P.ink, lo);
    c.beginPath();
    c.arc(0, -84, 14, Math.PI, 0);
    c.closePath();
    A.fs(c, colLight, P.ink, lo);

    if (role === 'fpv') {
      // FPV goggles over eyes
      A.rrect(c, 4, -87, 14, 9, 3, P.dark, P.ink, li);
      A.circle(c, 16, -83, 2.5, P.sky, null, 0);
    }

    if (role === 'controller' || role === 'fpv' || role === 'backpack') {
      // Holding RC box / tablet with antenna
      A.capsule(c, [4, -56], [22, -48], 8, col, P.ink, lo);
      A.rrect(c, 20, -56, 18, 12, 3, P.dark, P.ink, li);
      A.line(c, [[34, -56], [38, -74]], P.ink, li);
      A.circle(c, 38, -74, 3.5, P.sky, P.ink, li);
    } else if (role === 'jammer') {
      // Anti-drone directional EW rifle + supporting arm
      A.capsule(c, [4, -56], [22, -62], 8, col, P.ink, lo);
      c.save();
      c.translate(8, -58);
      c.rotate(opts.aimAngle ?? -0.45);
      A.rrect(c, -6, -8, 48, 16, 4, P.slate, P.ink, lo);
      A.poly(c, [[42, -14], [58, -18], [58, 18], [42, 14]], P.amber, P.ink, lo);
      c.restore();
    } else if (role === 'shotgun') {
      A.capsule(c, [4, -56], [22, -64], 8, col, P.ink, lo);
      c.save();
      c.translate(8, -58);
      c.rotate(opts.aimAngle ?? -0.55);
      A.rrect(c, -8, -4, 56, 7, 2, P.dark, P.ink, lo);
      c.restore();
    } else if (role === 'mg') {
      // Pintle-mounted machine gun on tripod + hands on grips
      A.capsule(c, [6, -56], [22, -52], 8, col, P.ink, lo);
      A.line(c, [[34, -52], [18, 0]], P.dark, lo);
      A.line(c, [[34, -52], [52, 0]], P.dark, lo);
      c.save();
      c.translate(34, -54);
      c.rotate(opts.aimAngle ?? -0.45);
      A.rrect(c, -14, -7, 58, 12, 3, P.dark, P.ink, lo);
      A.circle(c, 22, -12, 5, P.amber, P.ink, li); // simple ring sight
      c.restore();
    }
  }
  c.restore();
}

// ═══════════════════════════════════════════════════════════════════════════
// 12. SIGNALS, EXPLOSIONS & MINIMAL CALLOUTS
// ═══════════════════════════════════════════════════════════════════════════

export function drawSignalLink(
  c: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  t: number,
  opts: {
    mode?: 'radio' | 'fiber' | 'jammed';
    jamProgress?: number; // 0..1
  } = {},
) {
  const mode = opts.mode ?? 'radio';
  const li = lwInner(c);
  const lo = lwOuter(c);

  c.save();
  if (mode === 'fiber') {
    // Crisp continuous optical fiber filament with light pulses
    const mx = (x0 + x1) * 0.5;
    const my = Math.max(y0, y1) + 28;
    c.beginPath();
    c.moveTo(x0, y0);
    c.quadraticCurveTo(mx, my, x1, y1);
    A.fs(c, null, P.sky, li * 1.1);

    // Traveling light packets along curve
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.9 + i * 0.25) % 1 + 1) % 1;
      const px = (1 - u) * (1 - u) * x0 + 2 * (1 - u) * u * mx + u * u * x1;
      const py = (1 - u) * (1 - u) * y0 + 2 * (1 - u) * u * my + u * u * y1;
      A.circle(c, px, py, A.px(c, 5), P.paper, P.sky, li);
    }
  } else if (mode === 'radio') {
    A.line(c, [[x0, y0], [x1, y1]], P.sky, li, [10, 8]);
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.75 + i / 3) % 1 + 1) % 1;
      const px = A.lerp(x0, x1, u);
      const py = A.lerp(y0, y1, u);
      A.circle(c, px, py, A.px(c, 5), P.sky, P.ink, li * 0.7);
    }
  } else {
    // Jammed link: broken line + jagged red interference
    const jp = A.clamp01(opts.jamProgress ?? 1);
    const midX = A.lerp(x0, x1, 0.5);
    const midY = A.lerp(y0, y1, 0.5);
    A.line(c, [[x0, y0], [A.lerp(x0, midX, 1 - jp * 0.4), A.lerp(y0, midY, 1 - jp * 0.4)]], P.sky, li, [8, 10]);
    // Jagged EW noise bolt across midpoint
    const pts: A.Pt[] = [];
    for (let i = -3; i <= 3; i++) {
      pts.push([midX + i * 18, midY + (i % 2 === 0 ? -22 : 22) * jp]);
    }
    A.line(c, pts, P.enemy, lo);
  }
  c.restore();
}

export function drawExplosion(
  c: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  p: number, // 0..1 progress
) {
  if (p <= 0 || p >= 1) return;
  const lo = lwOuter(c);
  const li = lwInner(c);
  c.save();
  c.translate(x, y);

  // Expanding shockwave ring
  A.withA(c, 1 - p, () => {
    A.circle(c, 0, 0, radius * (0.4 + 1.1 * p), null, P.enemy, lo);
  });

  // Smoke & fire puffs
  const coreScale = Math.sin(p * Math.PI);
  if (coreScale > 0.05) {
    for (let i = 0; i < 6; i++) {
      const ang = (i * Math.PI) / 3 + 0.3;
      const dist = radius * 0.45 * p;
      const r = radius * (0.32 + 0.12 * (i % 2)) * coreScale;
      A.circle(c, Math.cos(ang) * dist, Math.sin(ang) * dist, r, P.slate, P.ink, li);
    }
    A.circle(c, 0, 0, radius * 0.42 * coreScale, P.amber, P.ink, lo);
  }
  c.restore();
}

export function drawCallout(
  c: CanvasRenderingContext2D,
  anchorScreen: A.Pt,
  boxScreen: A.Pt,
  text: string,
  alpha = 1,
  accent: string = P.amber,
) {
  if (alpha <= 0.01) return;
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  A.withA(c, alpha, () => {
    c.font = '700 26px system-ui, -apple-system, sans-serif';
    const tw = c.measureText(text).width;
    const bw = tw + 32;
    const bh = 46;
    const [bx, by] = boxScreen;
    // Leader line + dot
    A.line(c, [anchorScreen, [bx, by]], P.ink, 3);
    A.circle(c, anchorScreen[0], anchorScreen[1], 6, accent, P.ink, 2.5);
    // Pill badge
    A.rrect(c, bx - bw / 2, by - bh / 2, bw, bh, 10, P.paper, P.ink, 3.5);
    A.rrect(c, bx - bw / 2, by - bh / 2, 8, bh, 4, accent, null, 0);
    c.fillStyle = P.ink;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, bx + 2, by + 1);
  });
  c.restore();
}
