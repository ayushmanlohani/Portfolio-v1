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
const BASE_CONTROL: Vec[] = [
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
/* A throwaway test loop, on `?tiny=1` only.
   A long thin oval with sample 0 in the MIDDLE of the bottom straight, so the
   last 25 m before the chequered band is dead straight. Paired with the tiny
   start in createSession(), checking the finish line costs three seconds of
   holding accelerate instead of two laps of driving.
   ponytail: delete this and the branch below once the finish line is signed off. */
const TINY_CONTROL: Vec[] = [
  { x: 0, y: 0 },
  { x: 40, y: 0 },
  { x: 62, y: 6 },
  { x: 68, y: 15 },
  { x: 62, y: 24 },
  { x: 40, y: 30 },
  { x: -40, y: 30 },
  { x: -62, y: 24 },
  { x: -68, y: 15 },
  { x: -62, y: 6 },
  { x: -40, y: 0 },
];
export const TINY =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).has("tiny");
const CONTROL: Vec[] = TINY ? TINY_CONTROL : BASE_CONTROL;

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
  return { index: bestI, offset: Math.sqrt(bestD), s: CUM[bestI] + segLen * bestT };
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
