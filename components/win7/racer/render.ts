/**
 * Everything that turns metres into pixels — now from behind the car.
 *
 * There is no 3D engine here and there does not need to be one. Every surface
 * in this game lies on the same plane (z = 0): the road, the grass, the rubber
 * on the road. A chase camera over a single plane is one pinhole projection and
 * some clipping, which is a few dozen lines rather than a dependency.
 *
 * The camera sits behind and above the car and looks slightly over its roof.
 * World space is unchanged from the top-down version — x/y are still the ground,
 * still in metres — so physics, track and lap rules never learned that the view
 * moved. Only this file did.
 *
 * Coordinates: x/y are the ground plane exactly as the physics uses them, and z
 * is UP. Because canvas y points down, a heading that increases turns the car
 * clockwise on screen, and the driver's right hand points along +y. That is the
 * one sign convention the whole projection rests on.
 */

import {
  BOUNDS,
  CENTER,
  HALF_WIDTH,
  outwardNormalAt,
  SEGMENTS,
  tangentAt,
  WALL_HEIGHT,
  WALL_OFFSET,
} from "./track";
import { GEOMETRY, type Car } from "./physics";
import { formatTime, type Score } from "./leaderboard";
import { type GfxSettings } from "./settings";

export type View = { width: number; height: number };

/** Nothing closer than this to the lens survives; it would project to infinity. */
const NEAR = 0.4;

/* Palette. Flat, saturated, cel-shaded — the road has to read instantly at
   speed, which fine gradients do not. */
const SKY_TOP = "#2f8ed6";
const SKY_LOW = "#bfe6fb";
const GRASS = "#54833d";
const GRASS_TUFT = "#476f33";
const ASPHALT = "#54545c";
const LINE = "#e8e8ee";
const KERB_A = "#d94b3f";
const KERB_B = "#f2f2f4";
/* The boundary wall. Two panel tones so it flickers past at speed the way the
   kerbs do — on a blank slab you cannot tell 40 km/h from 140 — plus a darker
   cap so the top edge reads as an edge against the sky rather than a colour
   change in mid-air. */
const WALL_A = "#b7bec9";
const WALL_B = "#cdd4de";
const WALL_CAP = "#6f7784";

/* ---------------------------------------------------------------- quality */

/**
 * Everything the player's settings toggle, in one place.
 *
 * The draw functions read this object rather than receiving it as a parameter,
 * because quality changes rarely and every draw signature already has four
 * arguments. `applyGfx` is the only writer.
 */
export type RenderQuality = {
  /** Backbuffer scale cap; 1 renders at CSS pixels. */
  dprCap: number;
  skidRange: number;
  tufts: boolean;
  /** Draw every Nth precomputed tuft. 1 is all of them. */
  tuftStride: number;
  maxSkids: number;
  smoke: boolean;
  ghostSimple: boolean;
};

/* Starts at full quality so a page that never loads settings looks exactly
   like the pre-settings renderer did. Racer applies real values on mount. */
export const quality: RenderQuality = {
  dprCap: 2,
  skidRange: 85,
  tufts: true,
  tuftStride: 1,
  maxSkids: 1400,
  smoke: true,
  ghostSimple: false,
};

const SKID_CAPS = { normal: 1400, short: 600, off: 0 } as const;

/** Push a settings object into the live render state. */
export function applyGfx(s: GfxSettings): void {
  quality.dprCap = s.dprCap;
  quality.skidRange = SKID_CAPS[s.skids] === 0 ? 0 : 85;
  quality.tufts = s.tufts !== "off";
  quality.tuftStride = s.tufts === "full" ? 1 : 2;
  quality.maxSkids = SKID_CAPS[s.skids];
  quality.smoke = s.smoke;
  quality.ghostSimple = s.ghostSimple;
}


/* ------------------------------------------------------------------ camera */

export type Cam = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  focal: number;
  /* Precomputed once per frame — these are read a few thousand times each. */
  cy: number;
  sy: number;
  cp: number;
  sp: number;
  hw: number;
  hh: number;
  /** Screen y where the ground plane vanishes. */
  horizon: number;
};

/** How fast the camera swings round to line up behind the car, in seconds. */
export const CAM_LAG = 0.17;

const wrapPi = (a: number) => {
  let v = a;
  while (v > Math.PI) v -= 2 * Math.PI;
  while (v < -Math.PI) v += 2 * Math.PI;
  return v;
};

/**
 * Ease the camera's yaw toward the car's heading.
 *
 * Deliberately a lag rather than a hard lock. Bolted rigidly to the heading,
 * the whole world snaps sideways the instant the back steps out, which is both
 * ugly and disorienting — the one moment the player most needs to read the
 * road. Lagging it means a drift shows you your own car at an angle, which is
 * the shot every kart game uses because it is the one that looks fast.
 */
export function trackCameraYaw(yaw: number, car: Car, dt: number): number {
  const k = 1 - Math.exp(-dt / CAM_LAG);
  return yaw + wrapPi(car.heading - yaw) * k;
}

/**
 * Build the chase camera for this frame.
 *
 * It drifts back and up with speed. That is not decoration: widening the view
 * as the car accelerates is what makes speed legible without touching the
 * clock, and it buys the player more road to read exactly when they need it.
 */
export function chaseCamera(car: Car, yaw: number, view: View): Cam {
  const speed = Math.hypot(car.u, car.v);
  const pace = Math.min(speed / GEOMETRY.TOP_SPEED, 1);

  const dist = 9.4 + pace * 2.4;
  const height = 3.6 + pace * 0.55;
  /* Aim past the car rather than at it, so the nose sits low on screen and the
     road ahead gets the space instead of the bodywork. */
  const ahead = 5.2;
  const aimZ = 0.95;

  const cx = car.x - Math.cos(yaw) * dist;
  const cyw = car.y - Math.sin(yaw) * dist;
  const pitch = Math.atan2(height - aimZ, dist + ahead);

  const focal = view.height * 0.92;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const hh = view.height / 2;

  return {
    x: cx,
    y: cyw,
    z: height,
    yaw,
    pitch,
    focal,
    cy: Math.cos(yaw),
    sy: Math.sin(yaw),
    cp,
    sp,
    hw: view.width / 2,
    hh,
    // Points infinitely far away land here: depth -> f*cp, up -> f*sp.
    horizon: hh - focal * (sp / cp),
  };
}

/* -------------------------------------------------------------- projection */

/* Scratch buffers. A polygon is clipped and projected thousands of times a
   frame; allocating per call would hand the garbage collector the frame time. */
const CAM_BUF = new Float64Array(96);
const CLIP_BUF = new Float64Array(96);

/**
 * Clip a polygon to the near plane and append it to a path.
 *
 * `target` is normally the canvas context, but anything with path commands
 * works — drawSkids hands in Path2D objects so two materials can share one
 * walk over the marks. Returns false when the polygon cannot be seen, which
 * is most of the track most of the time.
 */
function addPoly(target: CanvasPath, cam: Cam, pts: number[]): boolean {
  const n = pts.length / 3;
  if (n < 3 || n * 3 > CAM_BUF.length) return false;

  // World -> camera space (depth, right, up). The furthest forward point is
  // tracked on the way: if even the closest-possible reading of it sits
  // behind the near plane, the whole polygon is behind us and the clip below
  // would produce nothing anyway. Skipping straight out keeps fully-behind
  // quads to a dozen multiplies instead of a clip plus a projection.
  let maxF = -Infinity;
  for (let i = 0; i < n; i += 1) {
    const dx = pts[i * 3] - cam.x;
    const dy = pts[i * 3 + 1] - cam.y;
    const dz = pts[i * 3 + 2] - cam.z;
    const f = dx * cam.cy + dy * cam.sy;
    CAM_BUF[i * 3] = f * cam.cp - dz * cam.sp;
    if (CAM_BUF[i * 3] > maxF) maxF = CAM_BUF[i * 3];
    CAM_BUF[i * 3 + 1] = -dx * cam.sy + dy * cam.cy;
    CAM_BUF[i * 3 + 2] = f * cam.sp + dz * cam.cp;
  }
  if (maxF < NEAR) return false;

  // Sutherland-Hodgman against depth >= NEAR. Interpolating camera-space
  // coordinates linearly is exact here: the clip plane is flat in that space.
  let out = 0;
  for (let i = 0; i < n; i += 1) {
    const j = (i + 1) % n;
    const d0 = CAM_BUF[i * 3];
    const d1 = CAM_BUF[j * 3];
    const in0 = d0 >= NEAR;
    const in1 = d1 >= NEAR;

    if (in0) {
      CLIP_BUF[out] = d0;
      CLIP_BUF[out + 1] = CAM_BUF[i * 3 + 1];
      CLIP_BUF[out + 2] = CAM_BUF[i * 3 + 2];
      out += 3;
    }
    if (in0 !== in1) {
      const t = (NEAR - d0) / (d1 - d0);
      CLIP_BUF[out] = NEAR;
      CLIP_BUF[out + 1] =
        CAM_BUF[i * 3 + 1] + (CAM_BUF[j * 3 + 1] - CAM_BUF[i * 3 + 1]) * t;
      CLIP_BUF[out + 2] =
        CAM_BUF[i * 3 + 2] + (CAM_BUF[j * 3 + 2] - CAM_BUF[i * 3 + 2]) * t;
      out += 3;
    }
  }

  const verts = out / 3;
  if (verts < 3) return false;

  for (let i = 0; i < verts; i += 1) {
    const d = CLIP_BUF[i * 3];
    const sx = cam.hw + (CLIP_BUF[i * 3 + 1] / d) * cam.focal;
    const sy = cam.hh - (CLIP_BUF[i * 3 + 2] / d) * cam.focal;
    if (i === 0) target.moveTo(sx, sy);
    else target.lineTo(sx, sy);
  }
  target.closePath();
  return true;
}

/** Project a single world point. Returns null when it is behind the lens. */
function projectPoint(cam: Cam, wx: number, wy: number, wz: number) {
  const dx = wx - cam.x;
  const dy = wy - cam.y;
  const dz = wz - cam.z;
  const f = dx * cam.cy + dy * cam.sy;
  const r = -dx * cam.sy + dy * cam.cy;
  const d = f * cam.cp - dz * cam.sp;
  if (d < NEAR) return null;
  return {
    x: cam.hw + (r / d) * cam.focal,
    y: cam.hh - (f * cam.sp + dz * cam.cp) / d * cam.focal,
    d,
  };
}

/* ------------------------------------------------------- static road shape */

/* The edges never move, so they are built once rather than every frame. */
const EDGE_L = new Float64Array(SEGMENTS * 2);
const EDGE_R = new Float64Array(SEGMENTS * 2);
const KERB_L = new Float64Array(SEGMENTS * 2);
const KERB_R = new Float64Array(SEGMENTS * 2);
const KERB_W = 0.85;

for (let i = 0; i < SEGMENTS; i += 1) {
  const p = CENTER[i];
  const t = tangentAt(i);
  // Normal, i.e. the road's own left/right.
  const nx = -t.y;
  const ny = t.x;
  EDGE_L[i * 2] = p.x - nx * HALF_WIDTH;
  EDGE_L[i * 2 + 1] = p.y - ny * HALF_WIDTH;
  EDGE_R[i * 2] = p.x + nx * HALF_WIDTH;
  EDGE_R[i * 2 + 1] = p.y + ny * HALF_WIDTH;
  KERB_L[i * 2] = p.x - nx * (HALF_WIDTH + KERB_W);
  KERB_L[i * 2 + 1] = p.y - ny * (HALF_WIDTH + KERB_W);
  KERB_R[i * 2] = p.x + nx * (HALF_WIDTH + KERB_W);
  KERB_R[i * 2 + 1] = p.y + ny * (HALF_WIDTH + KERB_W);
}

/* The barrier ring, built once alongside the road edges. */
const WALL = new Float64Array(SEGMENTS * 2);
for (let i = 0; i < SEGMENTS; i += 1) {
  const p = CENTER[i];
  const n = outwardNormalAt(i);
  WALL[i * 2] = p.x + n.x * WALL_OFFSET;
  WALL[i * 2 + 1] = p.y + n.y * WALL_OFFSET;
}

/* The grass, generated once over the whole walled area. Same integer hash as
   before, so the field looks identical — it just no longer follows the car. */
const TUFTS = (() => {
  const STEP = 4.6;
  const out: number[] = [];
  for (let gx = Math.floor(BOUNDS.minX / STEP); gx <= Math.ceil(BOUNDS.maxX / STEP); gx += 1) {
    for (let gy = Math.floor(BOUNDS.minY / STEP); gy <= Math.ceil(BOUNDS.maxY / STEP); gy += 1) {
      const hsh = (gx * 73856093) ^ (gy * 19349663);
      out.push(gx * STEP + (((hsh >>> 8) & 255) / 255) * STEP);
      out.push(gy * STEP + (((hsh >>> 16) & 255) / 255) * STEP);
    }
  }
  return Float64Array.from(out);
})();

const quad: number[] = new Array(12).fill(0);

const near2 = (cam: Cam, x: number, y: number, range: number) => {
  const dx = x - cam.x;
  const dy = y - cam.y;
  return dx * dx + dy * dy < range * range;
};

/* ------------------------------------------------------------------ sky */

export function drawSky(ctx: CanvasRenderingContext2D, cam: Cam, view: View) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const h = Math.max(0, Math.min(view.height, cam.horizon));

  const sky = ctx.createLinearGradient(0, 0, 0, Math.max(h, 1));
  sky.addColorStop(0, SKY_TOP);
  sky.addColorStop(1, SKY_LOW);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, view.width, h);
}

/* --------------------------------------------------------------- ground */

/**
 * Grass, plus a scatter of darker tufts.
 *
 * The tufts are the only thing on an open plain that moves past the camera, so
 * without them the grass is a dead flat colour and the car reads as stationary
 * whenever it leaves the road. They are placed from a hash of their own grid
 * cell rather than stored, which means an unlimited field that costs no memory
 * and never shifts between frames. Density is a quality option: a wider grid
 * step costs a fraction of the quads and reads the same at speed.
 */
export function drawGround(ctx: CanvasRenderingContext2D, cam: Cam, view: View) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const h = Math.max(0, Math.min(view.height, cam.horizon));
  ctx.fillStyle = GRASS;
  ctx.fillRect(0, h, view.width, view.height - h);

  /* No horizon treatment. The barrier is tall enough to stand above the
     horizon from anywhere on the circuit, so the ground plane never actually
     ends in view — there is no seam left for a haze gradient to hide. */

  if (!quality.tufts) return;

  /* Every tuft on the map, every frame. They used to be generated in a window
     around the camera, which is why the grass kept growing in ahead of the car
     and vanishing behind it. The map is small and walled, so the whole field
     is a fixed list that costs one pass — addPoly rejects the off-screen ones
     in a few multiplies each. */
  ctx.fillStyle = GRASS_TUFT;
  ctx.beginPath();
  for (let i = 0; i < TUFTS.length; i += 2 * quality.tuftStride) {
    const x = TUFTS[i];
    const y = TUFTS[i + 1];
    quad[0] = x - 0.34; quad[1] = y - 0.3; quad[2] = 0;
    quad[3] = x + 0.34; quad[4] = y - 0.24; quad[5] = 0;
    quad[6] = x + 0.28; quad[7] = y + 0.34; quad[8] = 0;
    quad[9] = x - 0.32; quad[10] = y + 0.28; quad[11] = 0;
    addPoly(ctx, cam, quad);
  }
  ctx.fill();
}

/* ---------------------------------------------------------------- track */

export function drawTrack(ctx: CanvasRenderingContext2D, cam: Cam) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  /* Asphalt. Every visible quad goes into one path and is filled once —
     thousands of individual fill() calls is what makes a canvas renderer slow,
     not the arithmetic. */
  ctx.fillStyle = ASPHALT;
  ctx.beginPath();
  for (let i = 0; i < SEGMENTS; i += 1) {
    const j = (i + 1) % SEGMENTS;
    quad[0] = EDGE_L[i * 2]; quad[1] = EDGE_L[i * 2 + 1]; quad[2] = 0;
    quad[3] = EDGE_R[i * 2]; quad[4] = EDGE_R[i * 2 + 1]; quad[5] = 0;
    quad[6] = EDGE_R[j * 2]; quad[7] = EDGE_R[j * 2 + 1]; quad[8] = 0;
    quad[9] = EDGE_L[j * 2]; quad[10] = EDGE_L[j * 2 + 1]; quad[11] = 0;
    addPoly(ctx, cam, quad);
  }
  ctx.fill();

  /* Kerbs. Alternating blocks rather than a solid line: a solid edge gives no
     sense of how fast it is going past, and the flicker rate of the blocks is
     read as speed without anyone thinking about it. */
  for (const [phase, colour] of [[0, KERB_A], [1, KERB_B]] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (let i = 0; i < SEGMENTS; i += 1) {
      if ((i >> 1) % 2 !== phase) continue;
      const j = (i + 1) % SEGMENTS;
      for (const [inner, outer] of [[EDGE_L, KERB_L], [EDGE_R, KERB_R]] as const) {
        quad[0] = inner[i * 2]; quad[1] = inner[i * 2 + 1]; quad[2] = 0.02;
        quad[3] = outer[i * 2]; quad[4] = outer[i * 2 + 1]; quad[5] = 0.02;
        quad[6] = outer[j * 2]; quad[7] = outer[j * 2 + 1]; quad[8] = 0.02;
        quad[9] = inner[j * 2]; quad[10] = inner[j * 2 + 1]; quad[11] = 0.02;
        addPoly(ctx, cam, quad);
      }
    }
    ctx.fill();
  }

  // Centre dashes.
  ctx.fillStyle = LINE;
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  for (let i = 0; i < SEGMENTS; i += 2) {
    const j = (i + 1) % SEGMENTS;
    const a = CENTER[i];
    const b = CENTER[j];
    const t = tangentAt(i);
    const nx = -t.y * 0.16;
    const ny = t.x * 0.16;
    quad[0] = a.x - nx; quad[1] = a.y - ny; quad[2] = 0.02;
    quad[3] = a.x + nx; quad[4] = a.y + ny; quad[5] = 0.02;
    quad[6] = b.x + nx; quad[7] = b.y + ny; quad[8] = 0.02;
    quad[9] = b.x - nx; quad[10] = b.y - ny; quad[11] = 0.02;
    addPoly(ctx, cam, quad);
  }
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The chequered band across the road at sample 0. */
export function drawStartLine(ctx: CanvasRenderingContext2D, cam: Cam) {
  const p = CENTER[0];
  const t = tangentAt(0);
  const nx = -t.y;
  const ny = t.x;
  const CELLS = 10;
  const cell = (HALF_WIDTH * 2) / CELLS;

  for (const [phase, colour] of [[0, "#26262b"], [1, "#f2f2f4"]] as const) {
    ctx.fillStyle = colour;
    ctx.beginPath();
    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < CELLS; col += 1) {
        if ((row + col) % 2 !== phase) continue;
        const o0 = -HALF_WIDTH + col * cell;
        const o1 = o0 + cell;
        const f0 = (row - 1) * cell;
        const f1 = f0 + cell;
        quad[0] = p.x + nx * o0 + t.x * f0; quad[1] = p.y + ny * o0 + t.y * f0; quad[2] = 0.03;
        quad[3] = p.x + nx * o1 + t.x * f0; quad[4] = p.y + ny * o1 + t.y * f0; quad[5] = 0.03;
        quad[6] = p.x + nx * o1 + t.x * f1; quad[7] = p.y + ny * o1 + t.y * f1; quad[8] = 0.03;
        quad[9] = p.x + nx * o0 + t.x * f1; quad[10] = p.y + ny * o0 + t.y * f1; quad[11] = 0.03;
        addPoly(ctx, cam, quad);
      }
    }
    ctx.fill();
  }
}

/**
 * The wall round the outside of the circuit — the edge of the world.
 *
 * This is the one thing in the renderer that stands up, and it is tall on
 * purpose. Anything above the camera projects above the horizon from any
 * distance, so a ring this high closes the view off completely: road, wall,
 * sky, and no seam where the ground plane runs out. That seam is what the old
 * horizon gradient existed to hide, which is why it could be deleted.
 *
 * Because it has height, paint order stops agreeing with depth — a near
 * section genuinely has to cover a far one, and index order would drape the
 * far side of the circuit over the near. Hence the sort: strict back to front,
 * the whole painter's algorithm this file gets away with instead of a depth
 * buffer.
 *
 * Each panel is also filled on its own rather than batched into one path per
 * colour, and that is not a style choice. Going round the ring, i -> i+1 runs
 * left to right across the near wall and right to left across the far one, so
 * the two have opposite winding on screen. Inside a single path, nonzero
 * winding reads that as a hole and the grass and track behind show straight
 * through the wall. Batching a flat surface is safe because projecting a plane
 * cannot flip orientation; batching a standing one is not.
 */
const wallOrder: number[] = [];
const wallDist = new Float64Array(SEGMENTS);

export function drawWall(ctx: CanvasRenderingContext2D, cam: Cam) {
  wallOrder.length = 0;
  for (let i = 0; i < SEGMENTS; i += 1) {
    const dx = WALL[i * 2] - cam.x;
    const dy = WALL[i * 2 + 1] - cam.y;
    wallDist[i] = dx * dx + dy * dy;
    wallOrder.push(i);
  }
  wallOrder.sort((a, b) => wallDist[b] - wallDist[a]);

  const CAP = WALL_HEIGHT * 0.16;
  for (const k of wallOrder) {
    /* Each panel spans two segments so it overlaps its neighbour. Butt-jointed
       quads leave a hairline of background between them the moment the canvas
       antialiases the shared edge; an overlap has nothing to show through. The
       extra 2 m of chord across a 14 m-radius ring is not measurable. */
    const j = (k + 2) % SEGMENTS;
    const ax = WALL[k * 2];
    const ay = WALL[k * 2 + 1];
    const bx = WALL[j * 2];
    const by = WALL[j * 2 + 1];

    quad[0] = ax; quad[1] = ay; quad[2] = 0;
    quad[3] = bx; quad[4] = by; quad[5] = 0;
    quad[6] = bx; quad[7] = by; quad[8] = WALL_HEIGHT - CAP;
    quad[9] = ax; quad[10] = ay; quad[11] = WALL_HEIGHT - CAP;
    ctx.fillStyle = (k >> 2) % 2 ? WALL_B : WALL_A;
    ctx.beginPath();
    if (addPoly(ctx, cam, quad)) ctx.fill();

    quad[2] = WALL_HEIGHT - CAP;
    quad[5] = WALL_HEIGHT - CAP;
    quad[8] = WALL_HEIGHT;
    quad[11] = WALL_HEIGHT;
    ctx.fillStyle = WALL_CAP;
    ctx.beginPath();
    if (addPoly(ctx, cam, quad)) ctx.fill();
  }
}

/* ---------------------------------------------------------- score board */

/**
 * The trackside board, standing on the grass a short way down the opening
 * straight and facing back at the grid.
 *
 * Facing matters: a billboard turned along the road is edge-on until you are
 * level with it, which is one frame of reading. Turned across the road it is
 * square to everyone still on the straight, so the top five is legible from the
 * start line and again on every lap.
 */
const BOARD_AT = 6; /* sample index — the first straight, about 25 m past the line */
const BOARD_OUT = 10.4; /* metres right of centre: clear of the 6.5 m kerb, inside the 14 m wall */
const BOARD_W = 8;
const BOARD_H = 4.4;
const BOARD_FOOT = 2.6; /* ground clearance, so the panel clears the barrier behind it */

/**
 * The face is drawn in its own flat space and then squashed onto the projected
 * quad, which is what leans the text with the board instead of pasting it flat
 * in front. Every size below is in these panel units, not pixels.
 */
const PANEL_W = 200;
const PANEL_H = 110;

export function drawLedBoard(ctx: CanvasRenderingContext2D, cam: Cam, board: Score[]) {
  const p = CENTER[BOARD_AT];
  const t = tangentAt(BOARD_AT);
  /* The road's right-hand normal. Canvas y points down, so the driver's right
     is (-t.y, t.x) — getting this backwards puts the board on the far side of
     the track and mirrors every row on it. The face looks back down the
     straight, along -t. */
  const nx = -t.y;
  const ny = t.x;
  const cx = p.x + nx * BOARD_OUT;
  const cy = p.y + ny * BOARD_OUT;

  const half = BOARD_W / 2;
  const ax = cx - nx * half;
  const ay = cy - ny * half;
  const bx = cx + nx * half;
  const by = cy + ny * half;
  const top = BOARD_FOOT + BOARD_H;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  /* Two legs, then the panel over them. Without the legs it reads as a sign
     hovering over the grass. */
  ctx.fillStyle = "#2b3038";
  for (const side of [-1, 1]) {
    const lx = cx + nx * half * 0.6 * side;
    const ly = cy + ny * half * 0.6 * side;
    const w = 0.16;
    ctx.beginPath();
    if (
      addPoly(ctx, cam, [
        lx - t.x * w, ly - t.y * w, 0,
        lx + t.x * w, ly + t.y * w, 0,
        lx + t.x * w, ly + t.y * w, BOARD_FOOT,
        lx - t.x * w, ly - t.y * w, BOARD_FOOT,
      ])
    ) {
      ctx.fill();
    }
  }

  ctx.fillStyle = "#10161d";
  ctx.beginPath();
  if (!addPoly(ctx, cam, [ax, ay, BOARD_FOOT, bx, by, BOARD_FOOT, bx, by, top, ax, ay, top])) return;
  ctx.fill();
  ctx.strokeStyle = "#39434f";
  ctx.lineWidth = 2;
  ctx.stroke();

  /* Past the board, you are looking at its back: a real one is a blank panel,
     and so is this. It also saves drawing the rows mirrored. */
  if ((cam.x - cx) * -t.x + (cam.y - cy) * -t.y <= 0) return;

  /* Three corners fix the whole face. The fourth follows from them, and a panel
     this size is close enough to a parallelogram on screen that the difference
     between that and a true projective fit does not read. */
  const tl = projectPoint(cam, ax, ay, top);
  const tr = projectPoint(cam, bx, by, top);
  const bl = projectPoint(cam, ax, ay, BOARD_FOOT);
  if (!tl || !tr || !bl) return;
  /* Too far away, or too oblique, for any of it to be readable. */
  if (Math.hypot(tr.x - tl.x, tr.y - tl.y) < 40) return;

  ctx.save();
  ctx.setTransform(
    (tr.x - tl.x) / PANEL_W,
    (tr.y - tl.y) / PANEL_W,
    (bl.x - tl.x) / PANEL_H,
    (bl.y - tl.y) / PANEL_H,
    tl.x,
    tl.y,
  );

  ctx.fillStyle = "#05090e";
  ctx.fillRect(3, 3, PANEL_W - 6, PANEL_H - 6);

  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.fillStyle = "#ffc233";
  ctx.font = "700 13px ui-monospace, monospace";
  ctx.fillText("TOP 5", PANEL_W / 2, 16);
  ctx.fillRect(12, 26, PANEL_W - 24, 1);

  /* Five rows always, so an empty board looks like a board waiting for names
     rather than like a bug. */
  ctx.font = "700 14px ui-monospace, monospace";
  for (let i = 0; i < 5; i += 1) {
    const row = board[i];
    const y = 40 + i * 15;
    ctx.fillStyle = row ? "#ffe066" : "#28332c";
    ctx.textAlign = "left";
    ctx.fillText(String(i + 1), 12, y);
    ctx.fillText(row ? row.name.slice(0, 9).toUpperCase() : "-----", 30, y);
    ctx.textAlign = "right";
    ctx.fillText(row ? formatTime(row.ms) : "--:--.---", PANEL_W - 12, y);
  }

  ctx.restore();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/* ----------------------------------------------------------- skid marks */

export type SkidMark = { x1: number; y1: number; x2: number; y2: number; w: number; g: boolean };

/**
 * Rubber, as world-space segments.
 *
 * The top-down version painted these onto an offscreen canvas and blitted the
 * whole thing in one call. That cannot survive a chase camera: laying a texture
 * onto a receding plane is a projective transform, and Canvas2D only offers
 * affine ones. So each mark is now a quad in its own right, and intensity is
 * carried as WIDTH rather than opacity — that keeps every mark on one path at
 * one alpha, which is what lets a thousand of them cost a single fill.
 */
export type SkidTrail = { marks: SkidMark[]; next: number };

export function createSkidTrail(): SkidTrail {
  return { marks: [], next: 0 };
}

export function clearSkids(trail: SkidTrail) {
  trail.marks.length = 0;
  trail.next = 0;
}

export function pushSkid(
  trail: SkidTrail,
  from: { x: number; y: number },
  to: { x: number; y: number },
  intensity: number,
  grass: boolean,
) {
  const max = quality.maxSkids;
  // "Off" is a setting, not an absence of code: one branch and out.
  if (max === 0) return;
  const mark = {
    x1: from.x,
    y1: from.y,
    x2: to.x,
    y2: to.y,
    w: 0.17 + Math.min(intensity, 1) * 0.2,
    g: grass,
  };
  // A ring buffer: the oldest mark is overwritten rather than the array
  // growing without limit over a long session.
  if (trail.marks.length < max) trail.marks.push(mark);
  else trail.marks[trail.next % max] = mark;
  trail.next += 1;
}

/** Drop marks beyond the current cap — called when the cap shrinks mid-session. */
export function trimSkids(trail: SkidTrail) {
  if (trail.marks.length > quality.maxSkids) {
    trail.marks.length = quality.maxSkids;
    trail.next %= Math.max(quality.maxSkids, 1);
  }
}

export function drawSkids(ctx: CanvasRenderingContext2D, cam: Cam, trail: SkidTrail) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (trail.marks.length === 0 || quality.skidRange === 0) return;

  /* One walk over the marks builds two paths — asphalt rubber and grass
     mulch — instead of the old two full passes with their doubled distance
     checks. ctx.fill(path) keeps each material to its own alpha in a single
     rasterisation call. */
  const road = new Path2D();
  const grass = new Path2D();
  let anyRoad = false;
  let anyGrass = false;
  for (const m of trail.marks) {
    if (!near2(cam, m.x1, m.y1, quality.skidRange)) continue;
    const dx = m.x2 - m.x1;
    const dy = m.y2 - m.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = (-dy / len) * m.w;
    const ny = (dx / len) * m.w;
    quad[0] = m.x1 - nx; quad[1] = m.y1 - ny; quad[2] = 0.01;
    quad[3] = m.x1 + nx; quad[4] = m.y1 + ny; quad[5] = 0.01;
    quad[6] = m.x2 + nx; quad[7] = m.y2 + ny; quad[8] = 0.01;
    quad[9] = m.x2 - nx; quad[10] = m.y2 - ny; quad[11] = 0.01;
    if (m.g) {
      anyGrass = true;
      addPoly(grass, cam, quad);
    } else {
      anyRoad = true;
      addPoly(road, cam, quad);
    }
  }
  if (anyRoad) {
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = "#1e1e22";
    ctx.fill(road);
  }
  if (anyGrass) {
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#3b5527";
    ctx.fill(grass);
  }
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------------- car */

export type CarPaint = {
  top: string;
  side: string;
  end: string;
  cabin: string;
  cabinTop: string;
  trim: string;
  ghost?: boolean;
};

export const PLAYER_PAINT: CarPaint = {
  top: "#ef5a4c",
  side: "#c8352b",
  end: "#9c241b",
  cabin: "#26313f",
  cabinTop: "#3d4c5e",
  trim: "#f2f2f4",
};

export const GHOST_PAINT: CarPaint = {
  top: "#a8dcff",
  side: "#7cc2ee",
  end: "#5aa3d4",
  cabin: "#cfe9fa",
  cabinTop: "#e6f5ff",
  trim: "#ffffff",
  ghost: true,
};

type Box = {
  /** Centre in body space: x forward, y right, z up. */
  c: [number, number, number];
  s: [number, number, number];
  kind: "body" | "cabin" | "wheel" | "trim";
  /** Front wheels turn with the rack. */
  steers?: boolean;
};

/* A chunky kart rather than a scale model: at this camera distance, fine
   detail is a few pixels wide and reads as noise, while big flat panels read
   as a car instantly. */
const CAR_BOXES: Box[] = [
  { c: [0, 0, 0.55], s: [4.0, 1.86, 0.52], kind: "body" },
  { c: [-0.35, 0, 1.02], s: [1.7, 1.44, 0.46], kind: "cabin" },
  { c: [-1.92, 0, 1.2], s: [0.24, 1.62, 0.11], kind: "trim" },
  { c: [-1.84, 0.6, 1.0], s: [0.16, 0.13, 0.36], kind: "trim" },
  { c: [-1.84, -0.6, 1.0], s: [0.16, 0.13, 0.36], kind: "trim" },
  { c: [GEOMETRY.A, GEOMETRY.HALF_TRACK, 0.35], s: [0.74, 0.3, 0.7], kind: "wheel", steers: true },
  { c: [GEOMETRY.A, -GEOMETRY.HALF_TRACK, 0.35], s: [0.74, 0.3, 0.7], kind: "wheel", steers: true },
  { c: [-GEOMETRY.B, GEOMETRY.HALF_TRACK, 0.35], s: [0.78, 0.32, 0.74], kind: "wheel" },
  { c: [-GEOMETRY.B, -GEOMETRY.HALF_TRACK, 0.35], s: [0.78, 0.32, 0.74], kind: "wheel" },
];

/* The simplified model: body, cabin, and one axle bar per end standing in for
   both wheels. Four boxes instead of nine is a third of the faces to
   transform and sort — spent on the ghost, which runs at 45% alpha where the
   missing trim never reads anyway. */
const SIMPLE_BOXES: Box[] = [
  { c: [0, 0, 0.55], s: [4.0, 1.86, 0.52], kind: "body" },
  { c: [-0.35, 0, 1.02], s: [1.7, 1.44, 0.46], kind: "cabin" },
  { c: [GEOMETRY.A, 0, 0.35], s: [0.74, 1.9, 0.7], kind: "wheel", steers: true },
  { c: [-GEOMETRY.B, 0, 0.35], s: [0.78, 1.94, 0.74], kind: "wheel" },
];

/* The six faces of a unit cube as corner-sign triples, plus which way each
   one looks. Order matters only in that opposite faces must not be adjacent. */
const FACES: { n: [number, number, number]; v: [number, number, number][] }[] = [
  { n: [0, 0, 1], v: [[-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]] },
  { n: [0, 0, -1], v: [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]] },
  { n: [1, 0, 0], v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] },
  { n: [-1, 0, 0], v: [[-1, -1, -1], [-1, -1, 1], [-1, 1, 1], [-1, 1, -1]] },
  { n: [0, 1, 0], v: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] },
  { n: [0, -1, 0], v: [[-1, -1, -1], [1, -1, -1], [1, -1, 1], [-1, -1, 1]] },
];

type Facet = { pts: number[]; depth: number; colour: string };
const facets: Facet[] = [];

export function drawCar(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  pose: { x: number; y: number; heading: number; steer: number },
  paint: CarPaint,
  braking = false,
  detail: "full" | "simple" = "full",
) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const ch = Math.cos(pose.heading);
  const sh = Math.sin(pose.heading);
  facets.length = 0;

  for (const box of detail === "simple" ? SIMPLE_BOXES : CAR_BOXES) {
    const yo = box.steers ? pose.steer : 0;
    const cyo = Math.cos(yo);
    const syo = Math.sin(yo);

    for (const face of FACES) {
      // Face normal in world, to drop the faces pointing away from the lens.
      const bnx = face.n[0] * cyo - face.n[1] * syo;
      const bny = face.n[0] * syo + face.n[1] * cyo;
      const wnx = bnx * ch - bny * sh;
      const wny = bnx * sh + bny * ch;
      const wnz = face.n[2];

      const pts: number[] = [];
      let sumD = 0;
      for (const v of face.v) {
        const lx = (v[0] * box.s[0]) / 2;
        const ly = (v[1] * box.s[1]) / 2;
        const lz = (v[2] * box.s[2]) / 2;
        const bx = box.c[0] + lx * cyo - ly * syo;
        const by = box.c[1] + lx * syo + ly * cyo;
        const bz = box.c[2] + lz;
        const wx = pose.x + bx * ch - by * sh;
        const wy = pose.y + bx * sh + by * ch;
        pts.push(wx, wy, bz);
        const dx = wx - cam.x;
        const dy = wy - cam.y;
        const dz = bz - cam.z;
        sumD += (dx * cam.cy + dy * cam.sy) * cam.cp - dz * cam.sp;
      }

      // Backface cull: is the face turned toward the camera at all?
      const mx = (pts[0] + pts[3] + pts[6] + pts[9]) / 4 - cam.x;
      const my = (pts[1] + pts[4] + pts[7] + pts[10]) / 4 - cam.y;
      const mz = (pts[2] + pts[5] + pts[8] + pts[11]) / 4 - cam.z;
      if (wnx * mx + wny * my + wnz * mz > 0) continue;

      let colour: string;
      if (box.kind === "wheel") colour = face.n[2] !== 0 ? "#2a2a30" : "#17171c";
      else if (box.kind === "cabin") colour = face.n[2] === 1 ? paint.cabinTop : paint.cabin;
      else if (box.kind === "trim") colour = paint.trim;
      else if (face.n[2] === 1) colour = paint.top;
      else if (face.n[0] === -1) colour = braking && !paint.ghost ? "#ff4436" : paint.end;
      else if (face.n[0] === 1) colour = paint.end;
      else colour = paint.side;

      facets.push({ pts, depth: sumD / 4, colour });
    }
  }

  // Painter's algorithm. A car is small and convex enough that sorting whole
  // faces is exact in practice, and it costs a sort of about thirty items.
  facets.sort((a, b) => b.depth - a.depth);

  ctx.globalAlpha = paint.ghost ? 0.45 : 1;
  for (const f of facets) {
    ctx.fillStyle = f.colour;
    ctx.beginPath();
    if (addPoly(ctx, cam, f.pts)) ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/** A soft blob under the car, so it sits on the road instead of hovering. */
export function drawShadow(
  ctx: CanvasRenderingContext2D,
  cam: Cam,
  pose: { x: number; y: number; heading: number },
) {
  const ch = Math.cos(pose.heading);
  const sh = Math.sin(pose.heading);
  const hx = 2.1;
  const hy = 1.05;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 0.26;
  ctx.fillStyle = "#101a10";
  ctx.beginPath();
  const corners: [number, number][] = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
  const pts: number[] = [];
  for (const [bx, by] of corners) {
    pts.push(pose.x + bx * ch - by * sh, pose.y + bx * sh + by * ch, 0.015);
  }
  addPoly(ctx, cam, pts);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/* ------------------------------------------------------------ particles */

export type Particle = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  grass: boolean;
};

const MAX_PARTICLES = 200;

export function spawnSmoke(
  list: Particle[],
  x: number,
  y: number,
  vx: number,
  vy: number,
  grass: boolean,
) {
  // Smoke is a quality option; the call sites stay untouched either way.
  if (!quality.smoke || list.length >= MAX_PARTICLES) return;
  list.push({
    x,
    y,
    z: 0.25,
    vx: vx * 0.1 + (Math.random() - 0.5) * 1.6,
    vy: vy * 0.1 + (Math.random() - 0.5) * 1.6,
    vz: 0.5 + Math.random() * 0.9,
    life: 1,
    grass,
  });
}

export function updateParticles(list: Particle[], dt: number) {
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const p = list[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.vx *= 0.94;
    p.vy *= 0.94;
    p.vz *= 0.96;
    p.life -= dt * 1.35;
    if (p.life <= 0) list.splice(i, 1);
  }
}

export function drawParticles(ctx: CanvasRenderingContext2D, cam: Cam, list: Particle[]) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  // Far ones first, so nearer puffs layer over them.
  const shown: { x: number; y: number; r: number; a: number; g: boolean; d: number }[] = [];
  for (const p of list) {
    const s = projectPoint(cam, p.x, p.y, p.z);
    if (!s) continue;
    const size = 0.4 + (1 - p.life) * 1.6;
    shown.push({ x: s.x, y: s.y, r: (size / s.d) * cam.focal, a: p.life * 0.42, g: p.grass, d: s.d });
  }
  shown.sort((a, b) => b.d - a.d);
  for (const s of shown) {
    ctx.globalAlpha = s.a;
    ctx.fillStyle = s.g ? "#8a7448" : "#dcdce2";
    ctx.beginPath();
    ctx.arc(s.x, s.y, Math.max(1, s.r), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

/* -------------------------------------------------------------- minimap */

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * The whole circuit, from above, in the corner.
 *
 * This mattered when the camera was overhead; now that the view is down at
 * road level and can see perhaps a hundred metres, it is the only way to know
 * what the next corner does before arriving in it.
 *
 * The panel and track never change, so they are drawn once into an offscreen
 * canvas and blitted; only the two dots are painted per frame. The cache is
 * keyed on the pixel size of the panel, so a resize or a DPR change rebuilds
 * it exactly once.
 */
let miniCache: HTMLCanvasElement | null = null;
let miniKey = "";

export function drawMinimap(
  ctx: CanvasRenderingContext2D,
  view: View,
  car: { x: number; y: number },
  ghost: { x: number; y: number } | null,
  ui = 1,
) {
  const w = 132 * ui;
  const h = 96 * ui;
  const pad = 12 * ui;
  const x0 = view.width - w - pad;
  const y0 = pad;

  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const key = `${Math.ceil(w)}x${Math.ceil(h)}`;
  if (!miniCache || miniKey !== key) {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    const g = c.getContext("2d");
    if (g) {
      g.globalAlpha = 0.72;
      g.fillStyle = "#10161f";
      roundRect(g, 0, 0, w, h, 6 * ui);
      g.fill();
      g.globalAlpha = 1;
      g.strokeStyle = "rgba(255,255,255,0.35)";
      g.lineWidth = 1 * ui;
      g.stroke();

      const spanX = BOUNDS.maxX - BOUNDS.minX;
      const spanY = BOUNDS.maxY - BOUNDS.minY;
      const k = Math.min((w - 16 * ui) / spanX, (h - 16 * ui) / spanY);
      // Panel-local origin — the caller adds x0/y0 back for the dots.
      miniOrigin.k = k;
      miniOrigin.ox = (w - spanX * k) / 2 - BOUNDS.minX * k;
      miniOrigin.oy = (h - spanY * k) / 2 - BOUNDS.minY * k;

      g.beginPath();
      for (let i = 0; i <= SEGMENTS; i += 1) {
        const p = CENTER[i % SEGMENTS];
        const sx = miniOrigin.ox + p.x * k;
        const sy = miniOrigin.oy + p.y * k;
        if (i === 0) g.moveTo(sx, sy);
        else g.lineTo(sx, sy);
      }
      g.strokeStyle = "rgba(255,255,255,0.55)";
      g.lineWidth = 3 * ui;
      g.stroke();
    }
    miniCache = c;
    miniKey = key;
  }
  ctx.drawImage(miniCache, x0, y0);

  if (ghost) {
    ctx.fillStyle = "#8fd0ff";
    ctx.beginPath();
    ctx.arc(x0 + miniOrigin.ox + ghost.x * miniOrigin.k, y0 + miniOrigin.oy + ghost.y * miniOrigin.k, 2.5 * ui, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#ff4b3e";
  ctx.beginPath();
  ctx.arc(x0 + miniOrigin.ox + car.x * miniOrigin.k, y0 + miniOrigin.oy + car.y * miniOrigin.k, 3.2 * ui, 0, Math.PI * 2);
  ctx.fill();
}

const miniOrigin = { k: 1, ox: 0, oy: 0 };
