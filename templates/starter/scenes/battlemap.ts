// FIG. EX-3 — "Operation Double Pincer" (Tactical Military Battle Map)
// A 10-second deterministic tactical war room map visualization:
// - Two army wings (Task Force Alpha - North, Task Force Bravo - South) advancing along tactical axes
// - Topographic elevation contour lines, coordinate grid, and rotating defense radar
// - Neutralizing enemy forward outposts, breaching outer perimeters, and converging to encircle the military base
// - Complete with NATO tactical symbology, distance/speed telemetry, and defensive status alerts.
// NO SCRIPTED VOICE LYRICS — PURE MILITARY STRATEGY CARTOGRAPHY.
import * as THREE from 'three';
import { Scene, type Frame, type PostOverrides } from '@engine/scene';
import { FSPass, Layer2D, W, H } from '@engine/gl';
import { LineBatch } from '@engine/lines';
import { LIN, rgba } from '@engine/palette';
import { F, font } from '@engine/type';
import { clamp, ease, lerp, prog, smoothstep, TAU } from '@engine/util';

type Point2D = { x: number; y: number };

// Cubic Bézier calculation
function bezierPoint(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

function bezierTangent(p0: Point2D, p1: Point2D, p2: Point2D, p3: Point2D, t: number): Point2D {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  const dx = 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x);
  const dy = 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y);
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

// Tactical Waypoints for the Convergence on Military Base
const BASE_POS: Point2D = { x: 1420, y: 540 };

// Northern Wing (Task Force Alpha - Mountain Pass Route)
const NORTH_ROUTE: [Point2D, Point2D, Point2D, Point2D] = [
  { x: 180, y: 190 },
  { x: 560, y: 160 },
  { x: 980, y: 320 },
  { x: 1350, y: 460 },
];

// Southern Wing (Task Force Bravo - Valley River Route)
const SOUTH_ROUTE: [Point2D, Point2D, Point2D, Point2D] = [
  { x: 220, y: 890 },
  { x: 620, y: 910 },
  { x: 1020, y: 760 },
  { x: 1350, y: 620 },
];

export default class BattleMapScene extends Scene {
  private ui = new Layer2D();
  private lines = new LineBatch(4000);

  // Background Tactical Map Shader (Topography, Grids, Radar Sweep)
  private mapPass = new FSPass(/* glsl */ `
    uniform float time, p, kick;
    uniform vec2 res;
    uniform vec2 basePos;

    void main() {
      vec2 uv = gl_FragCoord.xy / res.y;
      vec2 normUv = gl_FragCoord.xy / res;

      // 1. Procedural Topographic Elevation & Contours
      float elev = fbm(uv * 2.8 + vec2(1.2, 0.8), 5);
      // River valley running east-west
      float valley = smoothstep(0.08, 0.0, abs(uv.y - 0.55 + 0.12 * sin(uv.x * 4.0)));
      elev = mix(elev, 0.15, valley * 0.7);

      // Topographic Contour Lines (hairlines every 0.1 elevation step)
      float contourStep = fract(elev * 10.0);
      float contour = smoothstep(0.06, 0.0, abs(contourStep - 0.5));

      // 2. Tactical Military UTM Coordinate Grid
      vec2 gridUv = fract(normUv * vec2(16.0, 9.0)) - 0.5;
      float gridLines = smoothstep(0.025, 0.0, abs(gridUv.x)) + smoothstep(0.025, 0.0, abs(gridUv.y));

      // Base position in screen UV
      vec2 bUv = basePos / res;
      vec2 toBase = normUv - bUv;
      toBase.x *= res.x / res.y;
      float distToBase = length(toBase);

      // 3. Rotating Defense Radar Sweep from Military Base
      float radarAngle = atan(toBase.y, toBase.x) + time * 2.4;
      float radarBeam = smoothstep(0.85, 1.0, cos(radarAngle)) * smoothstep(0.65, 0.0, distToBase);

      // Radar Range Rings
      float ring1 = smoothstep(0.006, 0.0, abs(distToBase - 0.15));
      float ring2 = smoothstep(0.006, 0.0, abs(distToBase - 0.30));
      float ring3 = smoothstep(0.006, 0.0, abs(distToBase - 0.45));
      float rings = ring1 + ring2 + ring3;

      // Color Composition
      vec3 bg = mix(C_INK, C_INK2, elev * 0.6);
      bg += C_GRAPHITE * 0.18 * contour;
      bg += C_ASH * 0.08 * gridLines;
      bg += C_SIGNAL * 0.35 * rings;
      bg += C_SIGNAL * 0.25 * radarBeam * (1.0 + kick * 0.8);

      // Base Warning Pulse
      float baseAlarm = sin(time * 6.0) * 0.5 + 0.5;
      float alertGlow = smoothstep(0.12, 0.0, distToBase) * baseAlarm * smoothstep(0.5, 0.85, p);
      bg += C_BLOOD * 0.6 * alertGlow;

      // Dark edge vignette
      vec2 v = normUv - 0.5;
      bg *= 1.0 - dot(v, v) * 0.65;

      fragColor = vec4(bg, 1.0);
    }`, {
    time: { value: 0 },
    p: { value: 0 },
    kick: { value: 0 },
    res: { value: new THREE.Vector2(W, H) },
    basePos: { value: new THREE.Vector2(BASE_POS.x, BASE_POS.y) },
  });

  render(f: Frame, out: THREE.WebGLRenderTarget): PostOverrides {
    const { renderer, comp } = this.ctx;
    const t = f.t;
    const p = f.p; // 0..1 across the 10-second sequence

    // Update map shader uniforms
    const u = this.mapPass.u;
    u.time!.value = t;
    u.p!.value = p;
    u.kick!.value = f.a.kick;
    (u.basePos!.value as THREE.Vector2).set(BASE_POS.x, BASE_POS.y);

    // 1. Render Background Tactical Map Pass
    this.mapPass.render(renderer, out);

    // 2. Vector Layer for Pincer Arrows, Military Base, and Telemetry
    const L = this.ui;
    L.clear();
    const c = L.ctx;

    // Tactical Advance Progress: smooth exponential drive into the perimeter
    const marchProgress = ease.inOutCubic(clamp(p * 1.15));

    // Draw Military Base Compound at BASE_POS
    this.drawMilitaryBase(c, BASE_POS, p, t);

    // Draw Advance Routes and Pincer Arrows
    this.drawAssaultWing(c, NORTH_ROUTE, marchProgress, t, 'TASK FORCE ALPHA', '4TH ARMORED DIV [NORTH]');
    this.drawAssaultWing(c, SOUTH_ROUTE, marchProgress, t, 'TASK FORCE BRAVO', '7TH MECH INFANTRY [SOUTH]');

    // Draw Forward Defense Outposts / Checkpoints along the way
    this.drawCheckpoints(c, p);

    // Draw Tactical HUD & War Room Telemetry
    this.drawTacticalHUD(c, p, t, f);

    // Composite vector UI onto the map
    comp.draw(renderer, L.upload(), out);

    // Subtle camera shake on perimeter breach
    const breachShake = p > 0.72 ? Math.sin(t * 70) * (p - 0.72) * 4.0 : 0;

    return {
      bloom: 0.45 + (p > 0.85 ? 0.35 : 0.0) + f.a.kick * 0.25,
      halation: 0.15,
      grain: 0.035,
      shake: [breachShake, breachShake * 0.6],
    };
  }

  // --- Tactical Assault Route with Marching Column & Arrow Head ---
  private drawAssaultWing(
    c: CanvasRenderingContext2D,
    route: [Point2D, Point2D, Point2D, Point2D],
    progress: number,
    time: number,
    unitTag: string,
    unitSub: string,
  ) {
    if (progress <= 0.01) return;

    const [p0, p1, p2, p3] = route;
    const nSteps = Math.floor(progress * 120);

    // 1. Glowing Route Trail Underlay
    c.save();
    c.beginPath();
    c.moveTo(p0.x, p0.y);
    for (let i = 1; i <= nSteps; i++) {
      const pt = bezierPoint(p0, p1, p2, p3, i / 120);
      c.lineTo(pt.x, pt.y);
    }
    c.strokeStyle = rgba('signal', 0.25);
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.stroke();

    // 2. High-Contrast Tactical Arrow Path
    c.strokeStyle = rgba('signal', 0.95);
    c.lineWidth = 4;
    c.stroke();

    // 3. Animated Chevron Pulses Running Along the Advance Axis
    const chevronDist = 0.08;
    const pulseOffset = (time * 0.6) % chevronDist;
    for (let frac = pulseOffset; frac < progress; frac += chevronDist) {
      if (frac < 0.05 || frac > progress - 0.04) continue;
      const pt = bezierPoint(p0, p1, p2, p3, frac);
      const tang = bezierTangent(p0, p1, p2, p3, frac);
      const norm = { x: -tang.y, y: tang.x };

      c.beginPath();
      c.moveTo(pt.x - tang.x * 12 + norm.x * 8, pt.y - tang.y * 12 + norm.y * 8);
      c.lineTo(pt.x, pt.y);
      c.lineTo(pt.x - tang.x * 12 - norm.x * 8, pt.y - tang.y * 12 - norm.y * 8);
      c.strokeStyle = rgba('ember', 0.9);
      c.lineWidth = 2.5;
      c.stroke();
    }

    // 4. Spearhead Arrow Tip & Armor Unit Icon
    const tip = bezierPoint(p0, p1, p2, p3, progress);
    const tipTang = bezierTangent(p0, p1, p2, p3, progress);
    const tipNorm = { x: -tipTang.y, y: tipTang.x };

    // Big Sharp Arrowhead
    c.beginPath();
    c.moveTo(tip.x + tipTang.x * 24, tip.y + tipTang.y * 24);
    c.lineTo(tip.x - tipTang.x * 18 + tipNorm.x * 16, tip.y - tipTang.y * 18 + tipNorm.y * 16);
    c.lineTo(tip.x - tipTang.x * 6, tip.y - tipTang.y * 6);
    c.lineTo(tip.x - tipTang.x * 18 - tipNorm.x * 16, tip.y - tipTang.y * 18 - tipNorm.y * 16);
    c.closePath();
    c.fillStyle = rgba('signal', 1);
    c.fill();
    c.strokeStyle = rgba('bone', 0.9);
    c.lineWidth = 1.5;
    c.stroke();

    // 5. Marching Armored Column Markers (Convoy dots following behind)
    const convoySpacings = [0.06, 0.12, 0.18, 0.25];
    convoySpacings.forEach((offset, idx) => {
      const cFrac = progress - offset;
      if (cFrac > 0.02) {
        const cp = bezierPoint(p0, p1, p2, p3, cFrac);
        c.beginPath();
        c.arc(cp.x, cp.y, 4 - idx * 0.6, 0, TAU);
        c.fillStyle = rgba('ember', 0.95);
        c.fill();
        c.strokeStyle = rgba('bone', 0.7);
        c.lineWidth = 1;
        c.stroke();
      }
    });

    // 6. NATO Tactical Symbology Tag attached to Spearhead
    c.restore();
    const isNorth = route === NORTH_ROUTE;
    const tagX = tip.x - 210;
    const tagY = isNorth ? tip.y - 58 : tip.y + 22;

    c.fillStyle = rgba('ink2', 0.85);
    c.strokeStyle = rgba('signal', 0.85);
    c.lineWidth = 1;
    c.fillRect(tagX, tagY, 175, 42);
    c.strokeRect(tagX, tagY, 175, 42);

    // NATO Armor / Mechanized Division Icon: Rectangle with oval inside
    c.strokeRect(tagX + 8, tagY + 8, 26, 16);
    c.beginPath();
    c.ellipse(tagX + 21, tagY + 16, 9, 5, 0, 0, TAU);
    c.strokeStyle = rgba('bone', 0.9);
    c.stroke();

    // Unit Label Text
    c.font = font(F.mono(600), 11);
    c.fillStyle = rgba('bone', 0.95);
    c.fillText(unitTag, tagX + 42, tagY + 18);

    c.font = font(F.mono(400), 9);
    c.letterSpacing = '1px';
    c.fillStyle = rgba('ash', 0.85);
    c.fillText(unitSub, tagX + 8, tagY + 34);
    c.letterSpacing = '0px';
  }

  // --- Military Base Compound & Defense Perimeters ---
  private drawMilitaryBase(c: CanvasRenderingContext2D, base: Point2D, p: number, time: number) {
    const isEncircled = p > 0.82;
    const isBreached = p > 0.68;

    // 1. Concentric Defense Rings
    const ringRadii = [240, 160, 90];
    ringRadii.forEach((r, idx) => {
      c.beginPath();
      c.arc(base.x, base.y, r, 0, TAU);
      c.setLineDash(idx === 0 ? [10, 8] : idx === 1 ? [16, 6] : [6, 4]);
      c.strokeStyle = isEncircled && idx === 2 ? rgba('signal', 0.95) : rgba('ash', 0.35);
      c.lineWidth = isEncircled && idx === 2 ? 2.5 : 1.2;
      c.stroke();
      c.setLineDash([]);

      // Ring elevation / azimuth tick labels
      c.font = font(F.mono(400), 9);
      c.fillStyle = rgba('graphite', 0.8);
      c.fillText(`PERIMETER ${idx + 1} // R=${r}M`, base.x + r + 8, base.y - 4);
    });

    // 2. Base Compound Architecture (Fortress walls, bunkers, radar mast)
    c.save();
    c.translate(base.x, base.y);

    // Outer Bastion Wall (Octagonal perimeter)
    c.beginPath();
    const octR = 52;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU + Math.PI / 8;
      const bx = Math.cos(a) * octR;
      const by = Math.sin(a) * octR;
      if (i === 0) c.moveTo(bx, by);
      else c.lineTo(bx, by);
    }
    c.closePath();
    c.fillStyle = isBreached ? rgba('blood', 0.4) : rgba('ink2', 0.9);
    c.fill();
    c.strokeStyle = isBreached ? rgba('signal', 1) : rgba('bone', 0.8);
    c.lineWidth = 2;
    c.stroke();

    // 4 Corner Watchtowers / Sentry Bunkers
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU + Math.PI / 4;
      const tx = Math.cos(a) * (octR + 8);
      const ty = Math.sin(a) * (octR + 8);
      c.fillStyle = rgba('bone', 0.85);
      c.fillRect(tx - 6, ty - 6, 12, 12);
      c.strokeStyle = rgba('ink', 1);
      c.lineWidth = 1;
      c.strokeRect(tx - 6, ty - 6, 12, 12);
    }

    // Central Command Bunker (HQ)
    c.fillStyle = isBreached ? rgba('signal', 0.9) : rgba('bone', 0.95);
    c.fillRect(-18, -18, 36, 36);
    c.strokeStyle = rgba('ink', 1);
    c.lineWidth = 2;
    c.strokeRect(-18, -18, 36, 36);

    // Radar dish rotating cross
    c.beginPath();
    c.moveTo(-12, 0); c.lineTo(12, 0);
    c.moveTo(0, -12); c.lineTo(0, 12);
    c.strokeStyle = rgba('ink', 1);
    c.lineWidth = 2;
    c.stroke();

    c.restore();

    // Base Label & Warning Beacon
    c.font = font(F.mono(700), 14);
    c.fillStyle = isBreached ? rgba('signal', 1) : rgba('bone', 0.95);
    c.fillText('MILITARY STRONGHOLD [SECTOR-9]', base.x - 120, base.y + 80);

    c.font = font(F.mono(500), 11);
    c.letterSpacing = '1px';
    c.fillStyle = isEncircled ? rgba('signal', 1) : isBreached ? rgba('ember', 0.9) : rgba('ash', 0.8);
    const statusText = isEncircled
      ? 'CRITICAL ALERT: FULL PINCER ENCIRCLEMENT'
      : isBreached
      ? 'WARNING: OUTER DEFENSE LINE BREACHED'
      : 'DEFENSE STATUS: SURVEILLANCE ACTIVE';
    c.fillText(statusText, base.x - 120, base.y + 98);
    c.letterSpacing = '0px';
  }

  // --- Forward Enemy Outposts Destroyed Along the Way ---
  private drawCheckpoints(c: CanvasRenderingContext2D, p: number) {
    const cpNorth = { x: 740, y: 250 };
    const cpSouth = { x: 780, y: 820 };

    const northDestroyed = p > 0.42;
    const southDestroyed = p > 0.48;

    const drawOutpost = (pt: Point2D, destroyed: boolean, label: string) => {
      c.save();
      c.beginPath();
      c.arc(pt.x, pt.y, 8, 0, TAU);
      c.fillStyle = destroyed ? rgba('blood', 0.3) : rgba('ash', 0.4);
      c.fill();
      c.strokeStyle = destroyed ? rgba('signal', 0.9) : rgba('bone', 0.7);
      c.lineWidth = 1.5;
      c.stroke();

      if (destroyed) {
        // Red cross over captured outpost
        c.beginPath();
        c.moveTo(pt.x - 6, pt.y - 6); c.lineTo(pt.x + 6, pt.y + 6);
        c.moveTo(pt.x + 6, pt.y - 6); c.lineTo(pt.x - 6, pt.y + 6);
        c.strokeStyle = rgba('signal', 1);
        c.lineWidth = 2;
        c.stroke();
      }

      c.font = font(F.mono(400), 10);
      c.fillStyle = destroyed ? rgba('signal', 0.9) : rgba('ash', 0.7);
      c.fillText(`${label} [${destroyed ? 'OVERRUN' : 'ACTIVE'}]`, pt.x + 14, pt.y + 4);
      c.restore();
    };

    drawOutpost(cpNorth, northDestroyed, 'OUTPOST BRAVO-1');
    drawOutpost(cpSouth, southDestroyed, 'OUTPOST CHARLIE-2');
  }

  // --- Tactical War Room Telemetry & HUD ---
  private drawTacticalHUD(c: CanvasRenderingContext2D, p: number, time: number, f: Frame) {
    // 1. Top Header Banner
    c.textAlign = 'left';
    c.font = font(F.mono(700), 18);
    c.letterSpacing = '3px';
    c.fillStyle = rgba('signal', 1);
    c.fillText('TACTICAL THEATER: OPERATION DOUBLE PINCER', 96, 72);

    c.font = font(F.mono(400), 12);
    c.letterSpacing = '1px';
    c.fillStyle = rgba('bone', 0.75);
    c.fillText('MAP PROJECTION: TOPOGRAPHIC CONTOUR // STRATEGIC THEATER 04', 96, 94);

    // Top Right Situation Report (SITREP)
    c.textAlign = 'right';
    c.font = font(F.mono(600), 13);
    c.fillStyle = rgba('bone', 0.9);
    c.fillText(`T+${(p * 10.0).toFixed(1)}S  [T-CLOCK 00:10:00]`, W - 96, 72);

    c.font = font(F.mono(500), 12);
    c.fillStyle = p > 0.85 ? rgba('signal', 1) : rgba('ember', 0.9);
    c.fillText(p > 0.85 ? 'STAGE: FINAL ENCIRCLEMENT COMPLETE' : 'STAGE: RAPID CONVERGING ADVANCE', W - 96, 94);

    // 2. Bottom Left Navigation Telemetry
    c.textAlign = 'left';
    c.letterSpacing = '0px';

    const distRemaining = Math.max(0, (1 - p) * 18.5);
    const speed = 45 + Math.sin(time * 3.0) * 4.0;

    c.font = font(F.mono(500), 12);
    c.fillStyle = rgba('graphite', 0.95);
    c.fillText('WING TELEMETRY (TASK FORCE ALPHA & BRAVO)', 96, H - 110);

    c.font = font(F.mono(600), 15);
    c.fillStyle = rgba('bone', 0.95);
    c.fillText(`DISTANCE TO STRONGHOLD: ${distRemaining.toFixed(1)} KM`, 96, H - 85);

    c.font = font(F.mono(500), 12);
    c.fillStyle = rgba('signal', 0.95);
    c.fillText(`MARCH VELOCITY: ${speed.toFixed(0)} KM/H  |  PINCER ANGLE: 82°`, 96, H - 65);

    // Mini March Progress Bar
    c.strokeStyle = rgba('graphite', 0.6);
    c.strokeRect(96, H - 52, 280, 8);
    c.fillStyle = rgba('signal', 0.95);
    c.fillRect(96, H - 52, 280 * clamp(p * 1.15), 8);

    // 3. Bottom Right Coordinates Matrix
    c.textAlign = 'right';
    c.font = font(F.mono(400), 11);
    c.fillStyle = rgba('ash', 0.7);
    c.fillText(`ALPHA LEAD:  LAT 44°14'18"N  LON 08°31'04"E`, W - 96, H - 85);
    c.fillText(`BRAVO LEAD:  LAT 44°08'42"N  LON 08°33'12"E`, W - 96, H - 65);
    c.fillText(`TARGET HQ:   LAT 44°11'00"N  LON 08°38'20"E`, W - 96, H - 45);
  }
}
