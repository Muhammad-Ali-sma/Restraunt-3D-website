/**
 * An original, procedurally drawn warrior silhouette used whenever no licensed
 * character artwork or model has been supplied (see `lib/assets.ts`).
 *
 * Everything is plain SVG path data in a 1000 × 1500 box, so the same shapes
 * feed both the inline-SVG fallback scene and the WebGL textures (via Path2D).
 * The figure is split into layers so the transformation can recolour and
 * regrow the hair instead of stretching a single image:
 *
 *   body      – head, torso, gi, arms, legs, boots
 *   hairBase  – the resting, wild spiky silhouette
 *   hairSsj   – taller, upswept flame-like spikes for the golden form
 *   details   – thin lines (collar, belt, wristbands, folds) caught by rim light
 */

type P = readonly [number, number];

export const FIGURE_SIZE = { width: 1000, height: 1500 } as const;
/** Where the soles touch the ground, in figure units. */
export const FIGURE_GROUND_Y = 1450;
/** Approximate head centre — used to aim eye glints and aura cores. */
export const FIGURE_HEAD: P = [500, 494];

const n = (v: number) => Math.round(v * 10) / 10;
const pt = ([x, y]: P) => `${n(x)} ${n(y)}`;
const deg = Math.PI / 180;
const polar = (c: P, r: number, a: number): P => [c[0] + Math.cos(a * deg) * r, c[1] + Math.sin(a * deg) * r];

function circle([cx, cy]: P, r: number) {
  return `M${n(cx - r)} ${n(cy)}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
}

function ellipse([cx, cy]: P, rx: number, ry: number, rot = 0) {
  const a: P = [cx - Math.cos(rot * deg) * rx, cy - Math.sin(rot * deg) * rx];
  const b: P = [cx + Math.cos(rot * deg) * rx, cy + Math.sin(rot * deg) * rx];
  return `M${pt(a)}A${rx} ${ry} ${rot} 1 0 ${pt(b)}A${rx} ${ry} ${rot} 1 0 ${pt(a)}Z`;
}

/** A limb segment: two circles joined by their (approximate) tangents. */
function capsule(a: P, b: P, ra: number, rb: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const a1: P = [a[0] + nx * ra, a[1] + ny * ra];
  const a2: P = [a[0] - nx * ra, a[1] - ny * ra];
  const b1: P = [b[0] + nx * rb, b[1] + ny * rb];
  const b2: P = [b[0] - nx * rb, b[1] - ny * rb];
  return `M${pt(a1)}L${pt(b1)}A${rb} ${rb} 0 0 0 ${pt(b2)}L${pt(a2)}A${ra} ${ra} 0 0 0 ${pt(a1)}Z`;
}

/** Smooth closed outline through points (Catmull-Rom → cubic Bézier). */
function smooth(points: P[], tension = 0.5) {
  const p = points;
  const len = p.length;
  let d = `M${pt(p[0])}`;
  for (let i = 0; i < len; i++) {
    const p0 = p[(i - 1 + len) % len];
    const p1 = p[i];
    const p2 = p[(i + 1) % len];
    const p3 = p[(i + 2) % len];
    const c1: P = [p1[0] + ((p2[0] - p0[0]) / 6) * tension * 2, p1[1] + ((p2[1] - p0[1]) / 6) * tension * 2];
    const c2: P = [p2[0] - ((p3[0] - p1[0]) / 6) * tension * 2, p2[1] - ((p3[1] - p1[1]) / 6) * tension * 2];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + "Z";
}

/** Open smooth stroke (for detail lines). */
function stroke(points: P[]) {
  let d = `M${pt(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid: P = [(points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2];
    d += `Q${pt(points[i])} ${pt(i === points.length - 2 ? points[i + 1] : mid)}`;
  }
  if (points.length === 2) d += `L${pt(points[1])}`;
  return d;
}

const mirror = (points: P[]): P[] => points.map(([x, y]) => [1000 - x, y] as P);

/**
 * A chunky, curved hair spike rooted on the skull.
 * angle: direction in degrees (-90 = straight up, y-down space)
 * length: how far the tip reaches past the skull
 * half: half-width of the root, in figure units
 * bend: how far the tip swings (degrees), giving the spike its curve
 */
function spike(c: P, r: number, angle: number, length: number, half: number, bend: number) {
  const root = polar(c, r * 0.62, angle);
  const px = -Math.sin(angle * deg);
  const py = Math.cos(angle * deg);
  const b1: P = [root[0] + px * half, root[1] + py * half];
  const b2: P = [root[0] - px * half, root[1] - py * half];
  const tip = polar(c, r + length, angle + bend);
  const mid = polar(c, r + length * 0.38, angle + bend * 0.4);
  const k1: P = [mid[0] + px * half * 0.85, mid[1] + py * half * 0.85];
  const k2: P = [mid[0] - px * half * 0.85, mid[1] - py * half * 0.85];
  return `M${pt(b1)}Q${pt(k1)} ${pt(tip)}Q${pt(k2)} ${pt(b2)}Z`;
}

const HEAD = FIGURE_HEAD;

// ── Body ──────────────────────────────────────────────────────────────────
function leftLeg(): P[] {
  return [
    [412, 858],
    [500, 870],
    [503, 975],
    [474, 1052],
    [446, 1140],
    [418, 1228],
    [404, 1268],
    [400, 1306],
    [330, 1310],
    [318, 1268],
    [328, 1222],
    [346, 1140],
    [362, 1050],
    [384, 958],
  ];
}

function torso(): P[] {
  return [
    [470, 572],
    [530, 572],
    [606, 604],
    [628, 652],
    [598, 702],
    [590, 772],
    [574, 836],
    [500, 842],
    [426, 836],
    [410, 772],
    [402, 702],
    [372, 652],
    [394, 604],
  ];
}

function arm(side: 1 | -1) {
  const m = (p: P): P => (side === 1 ? p : [1000 - p[0], p[1]]);
  return [
    circle(m([386, 642]), 46), // deltoid
    capsule(m([380, 662]), m([318, 786]), 40, 31), // upper arm
    ellipse(m([350, 716]), 33, 52, side === 1 ? 26 : -26), // bicep
    capsule(m([318, 786]), m([350, 878]), 33, 26), // forearm
    ellipse(m([328, 816]), 29, 42, side === 1 ? -18 : 18), // forearm mass
    capsule(m([347, 866]), m([354, 896]), 29, 29), // wristband
    ellipse(m([360, 924]), 31, 34, side === 1 ? -10 : 10), // fist
  ];
}

function boot(side: 1 | -1) {
  const pts: P[] = [
    [334, 1296],
    [398, 1296],
    [400, 1360],
    [404, 1420],
    [410, 1446],
    [296, 1450],
    [300, 1426],
    [326, 1414],
    [330, 1360],
  ];
  return smooth(side === 1 ? pts : mirror(pts), 0.35);
}

const BODY = [
  // head, ears, jaw, neck, traps
  ellipse(HEAD, 50, 61),
  smooth(
    [
      [456, 504],
      [544, 504],
      [534, 544],
      [500, 566],
      [466, 544],
    ],
    0.4,
  ),
  ellipse([452, 502], 9, 16),
  ellipse([548, 502], 9, 16),
  smooth(
    [
      [468, 536],
      [532, 536],
      [540, 590],
      [598, 610],
      [500, 640],
      [402, 610],
      [460, 590],
    ],
    0.35,
  ),
  smooth(torso(), 0.4),
  // belt band and the gi top's hem flaring over the trousers
  smooth(
    [
      [424, 826],
      [576, 826],
      [596, 900],
      [500, 914],
      [404, 900],
    ],
    0.35,
  ),
  // trousers
  smooth(leftLeg(), 0.42),
  smooth(mirror(leftLeg()), 0.42),
  // arms, boots
  ...arm(1),
  ...arm(-1),
  boot(1),
  boot(-1),
];

// ── Hair ──────────────────────────────────────────────────────────────────
const HAIR_BASE = [
  ellipse([500, 462], 62, 40),
  ...(
    [
      // angle°, length, root half-width, bend°
      [164, 40, 30, 20],
      [-176, 88, 40, -8],
      [-152, 108, 42, -14],
      [-127, 120, 40, -12],
      [-103, 118, 38, -8],
      [-80, 124, 38, 6],
      [-56, 120, 40, 12],
      [-31, 100, 42, 14],
      [-6, 80, 40, 10],
      [16, 38, 30, -20],
    ] as const
  ).map(([a, l, w, b]) => spike(HEAD, 60, a, l, w, b)),
  // bangs falling over the forehead
  spike([500, 462], 30, 112, 70, 24, 20),
  spike([500, 462], 30, 78, 58, 22, -14),
  spike([500, 462], 30, 140, 44, 20, 18),
];

const HAIR_SSJ = [
  ellipse([500, 460], 64, 40),
  ...(
    [
      [162, 50, 30, -32],
      [-168, 112, 36, 28],
      [-146, 166, 36, 24],
      [-124, 208, 34, 16],
      [-105, 236, 32, 8],
      [-89, 250, 32, 0],
      [-73, 234, 32, -8],
      [-54, 204, 34, -16],
      [-33, 162, 36, -24],
      [-12, 108, 36, -28],
      [18, 48, 30, 32],
    ] as const
  ).map(([a, l, w, b]) => spike(HEAD, 62, a, l, w, b)),
  // the single bang that drops across the forehead
  spike([500, 456], 26, 102, 92, 18, 22),
];

// ── Details caught by the rim light ───────────────────────────────────────
const DETAILS: { d: string; w: number }[] = [
  // gi collar
  {
    d: stroke([
      [466, 590],
      [492, 660],
      [500, 700],
    ]),
    w: 5,
  },
  {
    d: stroke([
      [534, 590],
      [508, 660],
      [500, 700],
    ]),
    w: 5,
  },
  // belt edges
  {
    d: stroke([
      [428, 830],
      [500, 836],
      [572, 830],
    ]),
    w: 4,
  },
  {
    d: stroke([
      [420, 862],
      [500, 868],
      [580, 862],
    ]),
    w: 4,
  },
  // wristbands
  {
    d: stroke([
      [322, 862],
      [378, 858],
    ]),
    w: 4,
  },
  {
    d: stroke([
      [678, 862],
      [622, 858],
    ]),
    w: 4,
  },
  // trouser folds
  {
    d: stroke([
      [402, 946],
      [420, 1010],
      [414, 1080],
    ]),
    w: 3,
  },
  {
    d: stroke([
      [598, 946],
      [580, 1010],
      [586, 1080],
    ]),
    w: 3,
  },
  {
    d: stroke([
      [372, 1150],
      [392, 1200],
      [386, 1250],
    ]),
    w: 3,
  },
  {
    d: stroke([
      [628, 1150],
      [608, 1200],
      [614, 1250],
    ]),
    w: 3,
  },
  // boot tops
  {
    d: stroke([
      [334, 1300],
      [398, 1300],
    ]),
    w: 5,
  },
  {
    d: stroke([
      [602, 1300],
      [666, 1300],
    ]),
    w: 5,
  },
  // pectoral / abdominal shadow lines under the gi
  {
    d: stroke([
      [438, 712],
      [470, 728],
      [490, 716],
    ]),
    w: 3,
  },
  {
    d: stroke([
      [562, 712],
      [530, 728],
      [510, 716],
    ]),
    w: 3,
  },
];

export const WARRIOR = {
  body: BODY,
  hairBase: HAIR_BASE,
  hairSsj: HAIR_SSJ,
  details: DETAILS,
} as const;
