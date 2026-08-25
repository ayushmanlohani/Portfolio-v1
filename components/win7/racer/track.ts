/**
 * The circuit: a closed loop of control points, smoothed into a dense
 * polyline, plus everything the game asks of it — where the asphalt is, how
 * far around a car has got, and where the gates are.
 *
 * Everything here is in METRES, the same units the physics uses. Pixels only
 * exist in render.ts. Keeping the world metric is what lets the tyre model be
 * a real one instead of a set of numbers tuned until they looked right.
 */

export type Vec = { x: number; y: number };

/**
 * Hand-placed corners, anticlockwise from the start line: a long straight to
 * build speed, a fast right sweeper, a second-gear hairpin, then a technical
 * link section that punishes anyone still sideways from the hairpin.
 */
const CONTROL: Vec[] = [
  { x: 40, y: 60 },
  { x: 140, y: 48 },
  { x: 224, y: 54 },
  { x: 266, y: 86 },
  { x: 270, y: 132 },
  { x: 238, y: 163 },
  { x: 194, y: 150 },
  { x: 178, y: 114 },
  { x: 143, y: 104 },
  { x: 122, y: 142 },
  { x: 88, y: 166 },
  { x: 48, y: 150 },
  { x: 24, y: 112 },
  { x: 24, y: 80 },
];
/** Points generated per control segment. 24 keeps corners smooth at any zoom. */
const SUBDIV = 24;

/** Half the asphalt. A 13 m road: wide enough to drift, tight enough to matter. */
export const HALF_WIDTH = 6.5;

/** Beyond this the car is on grass — see `surfaceAt`. */
export const GRASS_EDGE = HALF_WIDTH;

const at = (i: number) => CONTROL[(i + CONTROL.length) % CONTROL.length];

/** Centripetal-ish Catmull-Rom. Passes through every control point. */
function spline(p0: Vec, p1: Vec, p2: Vec, p3: Vec, t: number): Vec {
  const t2 = t * t;
  const t3 = t2 * t;
  const f = (a: number, b: number, c: number, d: number) =>
    0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
  return { x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) };
}

/** The racing surface as a closed polyline, one entry per sample. */
export const CENTER: Vec[] = (() => {
  const out: Vec[] = [];
  for (let i = 0; i < CONTROL.length; i += 1) {
    for (let s = 0; s < SUBDIV; s += 1) {
      out.push(spline(at(i - 1), at(i), at(i + 1), at(i + 2), s / SUBDIV));
    }
  }
  return out;
})();

export const SEGMENTS = CENTER.length;

/** Cumulative distance to each point, and the total lap length. */
const { CUM, LENGTH } = (() => {
  const cum = new Float64Array(SEGMENTS + 1);
  for (let i = 0; i < SEGMENTS; i += 1) {
    const a = CENTER[i];
    const b = CENTER[(i + 1) % SEGMENTS];
    cum[i + 1] = cum[i] + Math.hypot(b.x - a.x, b.y - a.y);
  }
  return { CUM: cum, LENGTH: cum[SEGMENTS] };
})();

export const LAP_LENGTH = LENGTH;

/** Unit tangent at a sample — the direction the road is pointing. */
export function tangentAt(i: number): Vec {
  const a = CENTER[(i - 1 + SEGMENTS) % SEGMENTS];
  const b = CENTER[(i + 1) % SEGMENTS];
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const m = Math.hypot(dx, dy) || 1;
  return { x: dx / m, y: dy / m };
}

export type TrackHit = {
  /** Index of the closest sample. */
  index: number;
  /** Perpendicular distance from the centre line, metres. */
  offset: number;
  /** Distance travelled around the lap at that point, metres. */
  s: number;
  /** The closest point itself, so a signed offset needs no second search. */
  px: number;
  py: number;
};

/**
 * Closest point on the centre line.
 *
 * `near` restricts the search to a window around the last known index, which
 * is what makes this cheap enough to call every physics step. A car cannot
 * teleport, so the window is always right once it has been seeded — pass -1
 * on the first call (or after a reset) to search the whole lap.
 */
export function project(x: number, y: number, near = -1): TrackHit {
  let lo = 0;
  let hi = SEGMENTS;
  if (near >= 0) {
    lo = near - 24;
    hi = near + 24;
  }

  let bestD = Infinity;
  let bestI = 0;
  let bestT = 0;

  for (let k = lo; k < hi; k += 1) {
    const i = ((k % SEGMENTS) + SEGMENTS) % SEGMENTS;
    const a = CENTER[i];
    const b = CENTER[(i + 1) % SEGMENTS];
    const ex = b.x - a.x;
    const ey = b.y - a.y;
    const len2 = ex * ex + ey * ey || 1;
    let t = ((x - a.x) * ex + (y - a.y) * ey) / len2;
    t = t < 0 ? 0 : t > 1 ? 1 : t;
    const px = a.x + ex * t;
    const py = a.y + ey * t;
    const d = (x - px) * (x - px) + (y - py) * (y - py);
    if (d < bestD) {
      bestD = d;
      bestI = i;
      bestT = t;
    }
  }

  const segLen = CUM[bestI + 1] - CUM[bestI];
  const a = CENTER[bestI];
  const b = CENTER[(bestI + 1) % SEGMENTS];
  return {
    index: bestI,
    offset: Math.sqrt(bestD),
    s: CUM[bestI] + segLen * bestT,
    px: a.x + (b.x - a.x) * bestT,
    py: a.y + (b.y - a.y) * bestT,
  };
}

/* ----------------------------------------------------------- the barrier */

/**
 * Metres from the centre line to the barrier.
 *
 * Deliberately well outside the kerbs. Running wide has to stay a mistake you
 * can gather up — a wall at the edge of the asphalt turns every overshoot into
 * a rail to scrape, which is both uglier and easier than driving the corner.
 */
export const WALL_OFFSET = 14;

/**
 * How tall the barrier stands. Render only; the collision is a 2D line.
 *
 * Tall on purpose. Anything above eye level projects above the horizon from
 * any distance, so a wall this size closes the world off completely: the eye
 * goes road, wall, sky, and never finds the seam where the ground plane ends.
 * That seam is what the horizon haze gradient used to be hiding.
 */
export const WALL_HEIGHT = 18;

/**
 * Which way is "out".
 *
 * The circuit is one closed loop, so the left-hand normal points inward all
 * the way round or outward all the way round — never both. Which one depends
 * on the winding of CONTROL, so it is read from the signed area rather than
 * written down, and re-shaping the track above cannot silently flip it.
 */
export const OUTWARD = (() => {
  let twiceArea = 0;
  for (let i = 0; i < SEGMENTS; i += 1) {
    const a = CENTER[i];
    const b = CENTER[(i + 1) % SEGMENTS];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  // Left normal is (-t.y, t.x). On an anticlockwise loop that faces the
  // infield, so the outward side is the other one.
  return twiceArea > 0 ? -1 : 1;
})();

/** The outward unit normal at a sample — which way the barrier faces. */
export function outwardNormalAt(i: number): Vec {
  const t = tangentAt(i);
  return { x: -t.y * OUTWARD, y: t.x * OUTWARD };
}

/**
 * Signed metres from the centre line, positive OUTSIDE the loop.
 *
 * `offset` on a TrackHit is an unsigned distance, which cannot tell a car that
 * has run wide from one cutting the infield. The barrier only exists on one of
 * those sides, so it needs the sign.
 */
export function outwardOf(hit: TrackHit, x: number, y: number): number {
  const n = outwardNormalAt(hit.index);
  return (x - hit.px) * n.x + (y - hit.py) * n.y;
}

/** Grip multiplier where the car is standing: 1 on asphalt, much less on grass. */
export function surfaceAt(offset: number): number {
  if (offset <= GRASS_EDGE) return 1;
  // A short verge rather than a cliff edge, so clipping a kerb is survivable
  // and running wide is a mistake you feel building rather than a wall.
  const over = Math.min((offset - GRASS_EDGE) / 2.5, 1);
  return 1 - 0.62 * over;
}

/**
 * Gates that must be crossed in order for a lap to count. Derived from the
 * centre line rather than placed by hand, so re-shaping the track above keeps
 * them evenly spread without any second edit.
 */
export const GATE_COUNT = 5;
export const GATE_DISTANCES = Array.from(
  { length: GATE_COUNT },
  (_, g) => ((g + 1) * LAP_LENGTH) / (GATE_COUNT + 1),
);

/** Where the car sits on the grid, and which way it faces. */
export function startPose() {
  const p = CENTER[0];
  const t = tangentAt(0);
  return { x: p.x, y: p.y, heading: Math.atan2(t.y, t.x) };
}

/** World-space extents of the asphalt, used to size the skid-mark layer. */
export const BOUNDS = (() => {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of CENTER) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const pad = HALF_WIDTH + 8;
  return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
})();
