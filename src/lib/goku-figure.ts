/**
 * A code-drawn, cel-shaded fan illustration of Son Goku in his power-up
 * stance, used whenever no licensed artwork or model has been supplied (see
 * `lib/assets.ts`). Everything is SVG path data in a 1000 × 1500 box, so the
 * same layers render as inline SVG (CSS fallback scene) and are rasterised
 * into WebGL textures (via Path2D).
 *
 * The drawing is split so the forms can change without stretching an image:
 * the costume and body are shared, while hair, eyes and brows exist once per
 * form (base, Super Saiyan, Ultra Instinct).
 */

export type Shape = {
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
  /** Optional clip path (for cel shading inside a parent shape). */
  clip?: string;
  opacity?: number;
};

export type Form = "base" | "ssj" | "ultra";

type P = readonly [number, number];

export const FIGURE_SIZE = { width: 1000, height: 1500 } as const;
/** Where the soles touch the ground, in figure units. */
export const FIGURE_GROUND_Y = 1450;

// ── palette ────────────────────────────────────────────────────────────────
const C = {
  line: "#0d0b10",
  gi: "#f2731c",
  giShade: "#c24f17",
  giLight: "#ff9a45",
  blue: "#22409a",
  blueShade: "#132559",
  blueLight: "#3a5fc4",
  skin: "#f6c6a0",
  skinShade: "#d9946c",
  skinDeep: "#b9714f",
  bootTrim: "#d23a2a",
  sole: "#e8dcc8",
  badge: "#f7f3ea",
  hair: "#141419",
  hairSheen: "#2f3346",
  ssj: "#ffe24f",
  ssjShade: "#e7a81f",
  ssjLight: "#fff7c2",
  ultra: "#e6eaf6",
  ultraShade: "#a1a9c8",
  ultraLight: "#ffffff",
  white: "#ffffff",
  mouth: "#5a1d1d",
} as const;

// ── path helpers ───────────────────────────────────────────────────────────
const n = (v: number) => Math.round(v * 10) / 10;
const pt = ([x, y]: P) => `${n(x)} ${n(y)}`;
const deg = Math.PI / 180;
const polar = (c: P, r: number, a: number): P => [c[0] + Math.cos(a * deg) * r, c[1] + Math.sin(a * deg) * r];
const mirrorPts = (points: P[]): P[] => points.map(([x, y]) => [1000 - x, y] as P);

function ellipse([cx, cy]: P, rx: number, ry: number, rot = 0) {
  const a: P = [cx - Math.cos(rot * deg) * rx, cy - Math.sin(rot * deg) * rx];
  const b: P = [cx + Math.cos(rot * deg) * rx, cy + Math.sin(rot * deg) * rx];
  return `M${pt(a)}A${rx} ${ry} ${rot} 1 0 ${pt(b)}A${rx} ${ry} ${rot} 1 0 ${pt(a)}Z`;
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
    const k = tension / 3;
    const c1: P = [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k];
    const c2: P = [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k];
    d += `C${pt(c1)} ${pt(c2)} ${pt(p2)}`;
  }
  return d + "Z";
}

/** Straight-edged closed polygon. */
const poly = (points: P[]) => `M${points.map(pt).join("L")}Z`;

/** Open smooth line. */
function line(points: P[]) {
  let d = `M${pt(points[0])}`;
  for (let i = 1; i < points.length - 1; i++) {
    const mid: P = [(points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2];
    d += `Q${pt(points[i])} ${pt(i === points.length - 2 ? points[i + 1] : mid)}`;
  }
  if (points.length === 2) d += `L${pt(points[1])}`;
  return d;
}

/** Tapered limb: two circles joined by their tangents. */
function capsule(a: P, b: P, ra: number, rb: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  return `M${pt([a[0] + nx * ra, a[1] + ny * ra])}L${pt([b[0] + nx * rb, b[1] + ny * rb])}A${rb} ${rb} 0 0 0 ${pt([
    b[0] - nx * rb,
    b[1] - ny * rb,
  ])}L${pt([a[0] - nx * ra, a[1] - ny * ra])}A${ra} ${ra} 0 0 0 ${pt([a[0] + nx * ra, a[1] + ny * ra])}Z`;
}

/**
 * A curved hair spike. `root` sits on the scalp, `dir` is the direction in
 * degrees (-90 = up), `bend` swings the tip, `half` is the root half-width.
 */
function spike(root: P, dir: number, length: number, half: number, bend = 0) {
  const px = -Math.sin(dir * deg);
  const py = Math.cos(dir * deg);
  const b1: P = [root[0] + px * half, root[1] + py * half];
  const b2: P = [root[0] - px * half, root[1] - py * half];
  const tip = polar(root, length, dir + bend);
  const mid = polar(root, length * 0.45, dir + bend * 0.4);
  const k1: P = [mid[0] + px * half * 0.9, mid[1] + py * half * 0.9];
  const k2: P = [mid[0] - px * half * 0.9, mid[1] - py * half * 0.9];
  return `M${pt(b1)}Q${pt(k1)} ${pt(tip)}Q${pt(k2)} ${pt(b2)}Z`;
}

/** Places a glyph outline (normalised to a 100-unit em box) at a centre and size. */
function placeGlyph(d: string, cx: number, cy: number, size: number) {
  const s = size / 100;
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+/g) ?? [];
  let out = "";
  let cmd = "";
  let pair: number[] = [];
  for (const t of tokens) {
    if (/[A-Za-z]/.test(t)) {
      cmd = t;
      out += t;
      pair = [];
      continue;
    }
    const v = parseFloat(t);
    if (cmd === "H") out += `${n(cx + (v + 1) * s)} `;
    else if (cmd === "V") out += `${n(cy + (v - 50) * s)} `;
    else {
      pair.push(v);
      if (pair.length === 2) {
        out += `${n(cx + (pair[0] + 1) * s)} ${n(cy + (pair[1] - 50) * s)} `;
        pair = [];
      }
    }
  }
  return out.trim();
}

// 悟 ("go", from Goku's name) from Noto Sans JP Black (SIL OFL), em box 100.
const GO_GLYPH =
  "M-2 82H31V94H-2ZM-12 6H45V18H-12ZM-14 44H47V56H-14ZM-10 61H42V97H28V73H3V97H-10ZM4 11 19 12Q18 18 17 25Q16 32 14 38Q13 44 12 48H-2Q-1 45 -1 40Q0 36 1 31Q2 26 3 20Q4 15 4 11ZM-11 23H29V36H-11ZM26 23H27L29 23L40 24Q40 30 39 37Q38 44 38 49L24 48Q24 44 25 40Q25 36 25 32Q25 28 26 25ZM-35 2H-21V98H-35ZM-44 23 -34 24Q-34 28 -34 34Q-35 39 -36 44Q-37 49 -38 53L-49 49Q-48 46 -47 41Q-46 37 -45 32Q-45 27 -44 23ZM-25 23 -16 19Q-14 22 -13 26Q-11 30 -10 33Q-9 36 -8 39L-18 44Q-19 41 -20 38Q-21 34 -23 30Q-24 27 -25 23Z";

const fill = (d: string, color: string, extra: Partial<Shape> = {}): Shape => ({ d, fill: color, ...extra });
const ink = (d: string, width = 5, color: string = C.line): Shape => ({ d, stroke: color, width });
/** Filled shape with an ink outline. */
const inked = (d: string, color: string, width = 5): Shape[] => [fill(d, color), ink(d, width)];
/**
 * Several overlapping parts that should read as one form (an arm): a double
 * width stroke behind every part, then the fills, so only the outer edge of
 * the union keeps a line.
 */
const merged = (parts: string[], color: string, width = 5): Shape[] => [
  ...parts.map((d) => ink(d, width * 2)),
  ...parts.map((d) => fill(d, color)),
];

// ── body ───────────────────────────────────────────────────────────────────

const leftLeg: P[] = [
  [410, 870],
  [500, 878],
  [503, 985],
  [474, 1060],
  [448, 1145],
  [420, 1232],
  [408, 1272],
  [404, 1312],
  [330, 1316],
  [318, 1272],
  [328, 1222],
  [345, 1140],
  [360, 1050],
  [382, 958],
];
const LEG_L = smooth(leftLeg, 0.42);
const LEG_R = smooth(mirrorPts(leftLeg), 0.42);

const bootPts: P[] = [
  [334, 1300],
  [402, 1300],
  [404, 1360],
  [408, 1418],
  [414, 1446],
  [294, 1450],
  [298, 1426],
  [326, 1414],
  [330, 1360],
];
const BOOT_L = smooth(bootPts, 0.32);
const BOOT_R = smooth(mirrorPts(bootPts), 0.32);
const BOOT_TRIM_L = poly([
  [331, 1300],
  [404, 1300],
  [404, 1330],
  [331, 1330],
]);
const BOOT_TRIM_R = poly(
  mirrorPts([
    [331, 1300],
    [404, 1300],
    [404, 1330],
    [331, 1330],
  ]),
);

const torsoPts: P[] = [
  [466, 578],
  [534, 578],
  [622, 604],
  [660, 640],
  [652, 694],
  [612, 716],
  [600, 780],
  [584, 840],
  [500, 846],
  [416, 840],
  [400, 780],
  [388, 716],
  [348, 694],
  [340, 640],
  [378, 604],
];
const TORSO = smooth(torsoPts, 0.38);
const HEM = smooth(
  [
    [420, 832],
    [580, 832],
    [602, 908],
    [500, 922],
    [398, 908],
  ],
  0.32,
);
const UNDERSHIRT = poly([
  [462, 584],
  [538, 584],
  [522, 640],
  [500, 702],
  [478, 640],
]);
// The gi lapels cross left over right, so the V is slightly asymmetric.
const LAPEL_L = line([
  [458, 586],
  [478, 642],
  [503, 712],
]);
const LAPEL_R = line([
  [542, 586],
  [522, 640],
  [506, 690],
]);
const BELT = smooth(
  [
    [416, 826],
    [584, 826],
    [588, 870],
    [500, 878],
    [412, 870],
  ],
  0.25,
);
const KNOT = ellipse([538, 852], 20, 17, -10);
const SASH_A = smooth(
  [
    [528, 860],
    [552, 866],
    [566, 920],
    [560, 978],
    [538, 970],
    [542, 914],
  ],
  0.4,
);
const SASH_B = smooth(
  [
    [546, 862],
    [566, 858],
    [598, 906],
    [606, 962],
    [586, 958],
    [574, 912],
  ],
  0.4,
);
const BADGE_C: P = [565, 676];
const BADGE = ellipse(BADGE_C, 27, 27);

function arm(side: 1 | -1) {
  const m = (p: P): P => (side === 1 ? p : [1000 - p[0], p[1]]);
  const r = (a: number) => (side === 1 ? a : -a);
  return {
    skin: [
      capsule(m([372, 668]), m([304, 792]), 46, 36),
      ellipse(m([342, 728]), 39, 58, r(26)),
      capsule(m([304, 792]), m([344, 880]), 37, 29),
      ellipse(m([318, 820]), 34, 48, r(-18)),
    ],
    band: capsule(m([340, 866]), m([350, 906]), 34, 34),
    fist: smooth([m([322, 904]), m([384, 900]), m([400, 934]), m([390, 966]), m([340, 970]), m([320, 942])], 0.45),
    shoulderCap: smooth(
      [m([384, 600]), m([336, 620]), m([318, 662]), m([330, 696]), m([388, 708]), m([410, 666])],
      0.45,
    ),
    shade: poly([m([240, 700]), m([316, 770]), m([322, 910]), m([240, 910])]),
    muscle: [line([m([350, 760]), m([328, 780]), m([314, 794])]), line([m([330, 834]), m([328, 862])])],
    knuckles: [line([m([340, 926]), m([386, 924])]), line([m([342, 946]), m([388, 944])])],
  };
}

const ARM_L = arm(1);
const ARM_R = arm(-1);

const HEAD = smooth(
  [
    [443, 470],
    [448, 436],
    [500, 420],
    [552, 436],
    [557, 470],
    [553, 514],
    [539, 546],
    [516, 566],
    [500, 570],
    [484, 566],
    [461, 546],
    [447, 514],
  ],
  0.42,
);
const EAR_L = smooth(
  [
    [450, 486],
    [434, 480],
    [430, 500],
    [438, 520],
    [452, 524],
  ],
  0.5,
);
const EAR_R = smooth(
  mirrorPts([
    [450, 486],
    [434, 480],
    [430, 500],
    [438, 520],
    [452, 524],
  ]),
  0.5,
);
const NECK = poly([
  [462, 528],
  [538, 528],
  [544, 596],
  [500, 610],
  [456, 596],
]);
const TRAPS = smooth(
  [
    [458, 572],
    [542, 572],
    [592, 600],
    [500, 612],
    [408, 600],
  ],
  0.4,
);

const BODY: Shape[] = [
  // legs and boots
  ...inked(LEG_L, C.gi),
  ...inked(LEG_R, C.gi),
  fill(
    poly([
      [455, 900],
      [503, 985],
      [474, 1060],
      [448, 1145],
      [420, 1232],
      [470, 1232],
      [520, 1060],
    ]),
    C.giShade,
    { clip: LEG_L },
  ),
  fill(
    poly([
      [600, 880],
      [640, 1060],
      [670, 1240],
      [700, 1240],
      [680, 1040],
      [620, 870],
    ]),
    C.giShade,
    { clip: LEG_R },
  ),
  ink(
    line([
      [400, 950],
      [420, 1010],
      [412, 1080],
    ]),
    3.5,
  ),
  ink(
    line([
      [600, 950],
      [580, 1010],
      [588, 1080],
    ]),
    3.5,
  ),
  ink(
    line([
      [370, 1160],
      [392, 1205],
      [384, 1255],
    ]),
    3.5,
  ),
  ink(
    line([
      [630, 1160],
      [608, 1205],
      [616, 1255],
    ]),
    3.5,
  ),
  ...inked(BOOT_L, C.blue),
  ...inked(BOOT_R, C.blue),
  fill(BOOT_TRIM_L, C.bootTrim, { clip: BOOT_L }),
  fill(BOOT_TRIM_R, C.bootTrim, { clip: BOOT_R }),
  fill(
    poly([
      [290, 1432],
      [420, 1432],
      [420, 1452],
      [290, 1452],
    ]),
    C.sole,
    { clip: BOOT_L },
  ),
  fill(
    poly(
      mirrorPts([
        [290, 1432],
        [420, 1432],
        [420, 1452],
        [290, 1452],
      ]),
    ),
    C.sole,
    { clip: BOOT_R },
  ),
  fill(
    poly([
      [384, 1330],
      [404, 1330],
      [410, 1430],
      [392, 1430],
    ]),
    C.blueShade,
    { clip: BOOT_L },
  ),
  fill(
    poly(
      mirrorPts([
        [384, 1330],
        [404, 1330],
        [410, 1430],
        [392, 1430],
      ]),
    ),
    C.blueShade,
    { clip: BOOT_R },
  ),
  ink(BOOT_L, 5),
  ink(BOOT_R, 5),

  // gi top hem under the belt
  ...inked(HEM, C.gi),
  fill(
    poly([
      [540, 832],
      [610, 832],
      [610, 925],
      [540, 925],
    ]),
    C.giShade,
    { clip: HEM },
  ),

  // arms: one merged outline each, shaded on the outer side
  ...merged(ARM_L.skin, C.skin, 4.5),
  ...ARM_L.skin.map((d) => fill(ARM_L.shade, C.skinShade, { clip: d })),
  ...merged(ARM_R.skin, C.skin, 4.5),
  ...ARM_R.skin.map((d) => fill(ARM_R.shade, C.skinShade, { clip: d })),
  ...ARM_L.muscle.map((d) => ink(d, 3)),
  ...ARM_R.muscle.map((d) => ink(d, 3)),

  // torso: blue undershirt in the V, orange gi top, cel shading
  ...inked(TORSO, C.gi),
  fill(
    poly([
      [560, 600],
      [650, 640],
      [640, 700],
      [604, 712],
      [596, 778],
      [582, 845],
      [530, 845],
      [560, 760],
    ]),
    C.giShade,
    { clip: TORSO },
  ),
  fill(
    poly([
      [400, 640],
      [430, 640],
      [440, 700],
      [418, 760],
      [404, 760],
    ]),
    C.giLight,
    { clip: TORSO, opacity: 0.55 },
  ),
  ...inked(UNDERSHIRT, C.blue, 4.5),
  fill(
    poly([
      [500, 584],
      [540, 584],
      [500, 702],
    ]),
    C.blueShade,
    { clip: UNDERSHIRT },
  ),
  ink(LAPEL_L, 5),
  ink(LAPEL_R, 5),
  ink(
    line([
      [436, 744],
      [470, 760],
      [492, 750],
    ]),
    3,
  ),
  ink(
    line([
      [408, 800],
      [430, 812],
    ]),
    3,
  ),
  ink(
    line([
      [594, 800],
      [572, 812],
    ]),
    3,
  ),
  ...inked(BADGE, C.badge, 4),
  fill(placeGlyph(GO_GLYPH, BADGE_C[0], BADGE_C[1], 34), C.line),
  // shoulder caps of the gi over the deltoids
  ...inked(ARM_L.shoulderCap, C.gi, 4.5),
  ...inked(ARM_R.shoulderCap, C.gi, 4.5),
  fill(
    poly([
      [630, 590],
      [690, 640],
      [680, 712],
      [620, 712],
    ]),
    C.giShade,
    { clip: ARM_R.shoulderCap },
  ),

  // belt and sash
  ...inked(BELT, C.blue, 4.5),
  fill(
    poly([
      [500, 826],
      [590, 826],
      [590, 880],
      [500, 880],
    ]),
    C.blueShade,
    { clip: BELT },
  ),
  ...inked(SASH_A, C.blue, 4),
  ...inked(SASH_B, C.blueShade, 4),
  ...inked(KNOT, C.blueLight, 4),

  // wristbands and fists
  ...inked(ARM_L.band, C.blue, 4.5),
  ...inked(ARM_R.band, C.blue, 4.5),
  ...inked(ARM_L.fist, C.skin, 4.5),
  ...inked(ARM_R.fist, C.skin, 4.5),
  ...ARM_L.knuckles.map((d) => ink(d, 3)),
  ...ARM_R.knuckles.map((d) => ink(d, 3)),

  // neck, traps, head, ears
  ...inked(TRAPS, C.skin, 4.5),
  ...inked(NECK, C.skin, 4.5),
  fill(
    poly([
      [462, 528],
      [538, 528],
      [540, 566],
      [500, 586],
      [460, 566],
    ]),
    C.skinShade,
    { clip: NECK },
  ),
  ...inked(EAR_L, C.skin, 4),
  ...inked(EAR_R, C.skin, 4),
  ink(
    line([
      [440, 492],
      [446, 506],
      [442, 514],
    ]),
    2.5,
  ),
  ink(
    line([
      [560, 492],
      [554, 506],
      [558, 514],
    ]),
    2.5,
  ),
  ...inked(HEAD, C.skin, 5),
  // cheek and jaw shadow
  fill(
    poly([
      [532, 470],
      [560, 470],
      [556, 520],
      [520, 566],
      [510, 560],
      [534, 520],
    ]),
    C.skinShade,
    { clip: HEAD },
  ),
  ink(HEAD, 5),
];

// ── face per form ──────────────────────────────────────────────────────────
function face(iris: string, browColor: string, browInk: string): Shape[] {
  // Toriyama-style eyes: sharp almonds under a heavy lid line, tall pupils.
  const eye: P[] = [
    [458, 492],
    [476, 488],
    [495, 496],
    [491, 505],
    [474, 507],
    [462, 501],
  ];
  const eyeL = smooth(eye, 0.35);
  const eyeR = smooth(mirrorPts(eye), 0.35);
  const browPts: P[] = [
    [449, 470],
    [473, 473],
    [497, 485],
    [496, 494],
    [472, 484],
    [451, 480],
  ];
  const browL = poly(browPts);
  const browR = poly(mirrorPts(browPts));
  return [
    fill(eyeL, C.white),
    fill(eyeR, C.white),
    fill(ellipse([481, 498], 6.5, 8.5), iris, { clip: eyeL }),
    fill(ellipse([519, 498], 6.5, 8.5), iris, { clip: eyeR }),
    fill(ellipse([481, 498], 3, 4.5), C.line, { clip: eyeL }),
    fill(ellipse([519, 498], 3, 4.5), C.line, { clip: eyeR }),
    fill(ellipse([483, 494], 1.9, 1.9), C.white),
    fill(ellipse([521, 494], 1.9, 1.9), C.white),
    ink(
      line([
        [455, 492],
        [476, 486],
        [497, 495],
      ]),
      5.5,
    ),
    ink(
      line([
        [545, 492],
        [524, 486],
        [503, 495],
      ]),
      5.5,
    ),
    ink(
      line([
        [464, 503],
        [476, 507],
        [489, 505],
      ]),
      2,
    ),
    ink(
      line([
        [536, 503],
        [524, 507],
        [511, 505],
      ]),
      2,
    ),
    fill(browL, browColor),
    fill(browR, browColor),
    ink(browL, 2.5, browInk),
    ink(browR, 2.5, browInk),
    // the power-up frown
    ink(
      line([
        [497, 487],
        [499, 497],
      ]),
      2,
    ),
    ink(
      line([
        [503, 487],
        [501, 497],
      ]),
      2,
    ),
    // nose, mouth and chin
    fill(
      poly([
        [502, 512],
        [508, 526],
        [499, 527],
      ]),
      C.skinShade,
    ),
    ink(
      line([
        [502, 510],
        [507, 524],
        [499, 527],
      ]),
      3,
    ),
    ink(
      line([
        [485, 542],
        [500, 540],
        [515, 542],
      ]),
      3.5,
    ),
    ink(
      line([
        [493, 551],
        [507, 551],
      ]),
      2.2,
    ),
  ];
}

const FACE: Record<Form, Shape[]> = {
  base: face("#2a2320", C.hair, C.line),
  ssj: face("#1fb59a", C.ssjShade, "#9a6a12"),
  ultra: face("#b8c0dc", C.ultraShade, "#6c7598"),
};

// ── hair per form ──────────────────────────────────────────────────────────
type HairStyle = { color: string; shade: string; light: string; ink: string };

function hairLayer(style: HairStyle, spikes: [P, number, number, number, number][]) {
  const shapes: Shape[] = [];
  for (const [root, dir, len, half, bend] of spikes) {
    const d = spike(root, dir, len, half, bend);
    shapes.push(fill(d, style.color));
    // a darker underside on every spike keeps them reading as separate locks
    const shadeD = spike(root, dir + 6, len * 0.88, half * 0.5, bend);
    shapes.push(fill(shadeD, style.shade, { clip: d }));
    // and a thin sheen along the lit edge
    const sheen = spike(root, dir - 7, len * 0.7, half * 0.18, bend * 0.8);
    shapes.push(fill(sheen, style.light, { clip: d, opacity: 0.7 }));
    shapes.push(ink(d, 4.5, style.ink));
  }
  return shapes;
}

const BASE_STYLE: HairStyle = { color: C.hair, shade: "#060609", light: C.hairSheen, ink: C.line };
const SSJ_STYLE: HairStyle = { color: C.ssj, shade: C.ssjShade, light: C.ssjLight, ink: "#7a4d0b" };
const ULTRA_STYLE: HairStyle = { color: C.ultra, shade: C.ultraShade, light: C.ultraLight, ink: "#5a6284" };

/** Top of the skull every form shares; each form adds its own hairline. */
const CROWN_TOP: P[] = [
  [440, 480],
  [441, 440],
  [466, 416],
  [500, 408],
  [534, 416],
  [559, 440],
  [560, 480],
];

/**
 * The hair mass over the skull. Its lower edge is the hairline (listed right
 * to left); only that edge gets a line, so the cap melts into the spikes.
 */
function cap(style: HairStyle, hairline: P[]): Shape[] {
  return [
    fill(poly([...CROWN_TOP, ...hairline]), style.color),
    ink(line([CROWN_TOP[CROWN_TOP.length - 1], ...hairline, CROWN_TOP[0]]), 4.5, style.ink),
    fill(
      smooth(
        [
          [458, 432],
          [500, 416],
          [542, 432],
          [520, 428],
          [500, 426],
          [480, 428],
        ],
        0.4,
      ),
      style.light,
      { opacity: 0.3 },
    ),
  ];
}

const SKULL: P = [500, 466];
/** Spikes rooted on the skull: direction, length, root half-width, bend. */
const crown = (spikes: [number, number, number, number][]) =>
  spikes.map(
    ([dir, len, half, bend]) => [polar(SKULL, 40, dir), dir, len, half, bend] as [P, number, number, number, number],
  );

const BASE_BACK = crown([
  [164, 62, 26, 18],
  [-176, 116, 36, -6],
  [-152, 128, 38, -12],
  [-127, 124, 36, -10],
  [-101, 106, 34, -6],
  [-77, 112, 34, 6],
  [-52, 126, 36, 10],
  [-27, 120, 38, 12],
  [-4, 104, 36, 8],
  [16, 60, 26, -18],
]);
// Goku's bangs: a big lock sweeping down past his right brow, two short
// central locks and one flicking the other way.
const BASE_FRONT: [P, number, number, number, number][] = [
  [[474, 446], 116, 66, 25, 20],
  [[495, 450], 94, 50, 20, -2],
  [[515, 450], 74, 48, 18, -10],
  [[537, 448], 44, 46, 17, -16],
];
const BASE_HAIRLINE: P[] = [
  [554, 468],
  [540, 458],
  [522, 462],
  [506, 456],
  [490, 462],
  [474, 456],
  [458, 466],
  [446, 462],
];

const SSJ_BACK = crown([
  [168, 56, 24, -26],
  [-170, 104, 32, 24],
  [-150, 140, 34, 20],
  [-128, 166, 33, 14],
  [-106, 178, 32, 8],
  [-90, 182, 32, 0],
  [-74, 176, 32, -8],
  [-53, 164, 33, -14],
  [-31, 138, 34, -20],
  [-10, 102, 32, -24],
  [12, 56, 24, 26],
]);
// The single bang that drops across the forehead.
const SSJ_FRONT: [P, number, number, number, number][] = [[[486, 450], 104, 54, 12, 16]];
// Swept up and back, so the hairline sits high with a slight peak.
const SSJ_HAIRLINE: P[] = [
  [552, 466],
  [540, 452],
  [520, 446],
  [500, 442],
  [480, 446],
  [460, 452],
  [448, 466],
];

const ULTRA_BACK = crown([
  [160, 56, 24, 10],
  [-168, 112, 34, 4],
  [-146, 132, 36, -4],
  [-122, 134, 34, -4],
  [-98, 120, 32, -2],
  [-80, 124, 32, 2],
  [-56, 134, 34, 4],
  [-33, 128, 36, 4],
  [-12, 108, 34, -4],
  [20, 54, 24, -10],
]);
const ULTRA_FRONT: [P, number, number, number, number][] = [
  [[478, 448], 112, 50, 19, 14],
  [[506, 450], 86, 38, 15, -6],
];
const ULTRA_HAIRLINE: P[] = [
  [554, 466],
  [536, 456],
  [516, 458],
  [500, 452],
  [484, 458],
  [464, 456],
  [446, 466],
];

function hairForm(
  style: HairStyle,
  back: [P, number, number, number, number][],
  front: [P, number, number, number, number][],
  hairline: P[],
) {
  return { back: hairLayer(style, back), front: [...cap(style, hairline), ...hairLayer(style, front)] };
}

const HAIR = {
  base: hairForm(BASE_STYLE, BASE_BACK, BASE_FRONT, BASE_HAIRLINE),
  ssj: hairForm(SSJ_STYLE, SSJ_BACK, SSJ_FRONT, SSJ_HAIRLINE),
  ultra: hairForm(ULTRA_STYLE, ULTRA_BACK, ULTRA_FRONT, ULTRA_HAIRLINE),
};

/** Per-form layers around the shared body: back hair, face, front hair (cap + bangs). */
export function figureParts(form: Form) {
  return { back: HAIR[form].back, face: FACE[form], front: HAIR[form].front };
}
export const FIGURE_BODY = BODY;

/** Every layer for one form, back to front. */
export function figureLayers(form: Form): Shape[] {
  return [...HAIR[form].back, ...BODY, ...FACE[form], ...HAIR[form].front];
}

/** Just the hair of a form (for glow masks), back and front. */
export function hairLayers(form: Form): Shape[] {
  return [...HAIR[form].back, ...HAIR[form].front];
}
