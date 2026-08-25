/**
 * A run: the rules that turn a physics step into a lap time.
 *
 * Kept apart from both React and the canvas so the same code that decides
 * whether a lap counted can be driven headlessly by a test. Time here is
 * SIMULATED time — the sum of the fixed steps taken — never the wall clock.
 * That is what makes a lap time mean the same thing on a 60 Hz laptop, a
 * 144 Hz monitor, and a machine that stuttered halfway round.
 */

import { createCar, GEOMETRY, speedOf, step, type Car, type Input } from "./physics";
import {
  CENTER,
  GATE_COUNT,
  GATE_DISTANCES,
  HALF_WIDTH,
  LAP_LENGTH,
  outwardNormalAt,
  outwardOf,
  project,
  startPose,
  surfaceAt,
  tangentAt,
  WALL_OFFSET,
} from "./track";

/**
 * The finish line as a plane, not a distance.
 *
 * A point on the chequered band and the direction the road faces there.
 * `axialOf` below is metres in front of that plane; crossing it from negative
 * to positive IS the finish, which is the whole point of this file's rewrite.
 */
const LINE = (() => {
  const p = CENTER[0];
  const t = tangentAt(0);
  return { x: p.x, y: p.y, tx: t.x, ty: t.y };
})();

/** Half the car body: where the nose sits ahead of the centre of mass. */
const NOSE = GEOMETRY.HALF_LEN;

/**
 * The four body corners, in car-local metres.
 *
 * Collision is done per corner rather than at the centre of mass. A car whose
 * CENTRE stops at the barrier has already buried a metre of bodywork in it,
 * which is exactly the clipping you can see from the chase camera.
 */
const CORNERS: ReadonlyArray<readonly [number, number]> = [
  [GEOMETRY.HALF_LEN, GEOMETRY.HALF_WID],
  [GEOMETRY.HALF_LEN, -GEOMETRY.HALF_WID],
  [-GEOMETRY.HALF_LEN, GEOMETRY.HALF_WID],
  [-GEOMETRY.HALF_LEN, -GEOMETRY.HALF_WID],
];

/** Metres the nose is in front of the finish plane. Negative = not there yet. */
function noseAxial(car: Car): number {
  const nx = car.x + Math.cos(car.heading) * NOSE - LINE.x;
  const ny = car.y + Math.sin(car.heading) * NOSE - LINE.y;
  return nx * LINE.tx + ny * LINE.ty;
}

/* --- the barrier ------------------------------------------------------- */

/** How much of the impact the wall gives back. Enough to read as steel. */
const WALL_BOUNCE = 0.3;
/** What is left of the speed along the wall after a scrape. */
const WALL_SCRUB = 0.85;
/** Seconds of crawling off the road before the car is put back on it. */
const STUCK_SECONDS = 2.5;

export const LAPS = 2;
export const DT = 1 / 120;
/** Seconds of lights before the timer starts. */
export const COUNTDOWN = 3;

export type Phase = "menu" | "countdown" | "racing" | "finished";

/** One frame of a recorded run. 30 a second is plenty to interpolate from. */
export type GhostSample = {
  /** Simulated seconds since GO. */
  t: number;
  /** Total metres covered — how a ghost is compared at the same point on track. */
  d: number;
  x: number;
  y: number;
  heading: number;
  steer: number;
};

const GHOST_HZ = 30;

export type RunEvent = "lap" | "finish" | "invalid" | "respawn";

export type Session = {
  phase: Phase;
  car: Car;
  /** Counts down to GO, then stops mattering. */
  countdown: number;
  /** Simulated seconds since GO. */
  elapsed: number;
  /** Completed, valid laps. */
  lap: number;
  lapTimes: number[];
  /** Metres into the current lap. Used to arm the finish line, nothing else. */
  lapProgress: number;
  /** Metres the nose is in front of the finish plane. Negative = not there yet. */
  axial: number;
  /** Metres covered in the whole run — the ghost comparison key. */
  distance: number;
  gatesHit: number;
  /** Set when a gate was missed; cleared when the lap is re-run. */
  missedGate: boolean;
  /** Seconds spent crawling off the road — the trigger for a rescue. */
  stuckFor: number;
  trackIndex: number;
  offset: number;
  grip: number;
  /** Recording of the run in progress. */
  recording: GhostSample[];
  nextGhostAt: number;
  /** The run being chased, if there is one. */
  ghost: GhostSample[] | null;
  /** Final time in ms once finished. */
  result: number | null;
};

export function createSession(ghost: GhostSample[] | null): Session {
  const pose = startPose();
  return {
    phase: "countdown",
    car: createCar(pose.x, pose.y, pose.heading),
    countdown: COUNTDOWN,
    elapsed: 0,
    lap: 0,
    lapTimes: [],
    lapProgress: 0,
    axial: NOSE,
    distance: 0,
    gatesHit: 0,
    missedGate: false,
    stuckFor: 0,
    trackIndex: -1,
    offset: 0,
    grip: 1,
    recording: [],
    nextGhostAt: 0,
    ghost,
    result: null,
  };
}

const IDLE: Input = { throttle: 0, brake: 0, steer: 0, handbrake: false };

/**
 * Advance one fixed step, and report anything the interface should react to.
 *
 * During the countdown the car is stepped with no input at all rather than
 * being frozen, so the lights are running against the same simulation the race
 * uses — no discontinuity at GO.
 */
export function advance(s: Session, input: Input, dt = DT): RunEvent | null {
  if (s.phase === "finished" || s.phase === "menu") return null;

  const racing = s.phase === "racing";
  if (!racing) {
    s.countdown -= dt;
    if (s.countdown <= 0) {
      s.phase = "racing";
      s.countdown = 0;
    }
  }

  const hit = project(s.car.x, s.car.y, s.trackIndex);
  s.trackIndex = hit.index;
  s.offset = hit.offset;
  s.grip = surfaceAt(hit.offset);

  const before = hit.s;
  const wasX = s.car.x;
  const wasY = s.car.y;
  step(s.car, racing ? input : IDLE, dt, s.grip);
  if (!racing) return null;

  s.elapsed += dt;

  /* --- how far round did that step actually get us? ---------------------
     Taken from the projection onto the centre line, then clamped to what the
     car could physically have covered. Without the clamp, cutting across the
     infield makes the projection jump hundreds of metres in one step and hands
     out a lap for free. */
  const after = project(s.car.x, s.car.y, s.trackIndex);

  /* --- the barrier -----------------------------------------------------
     One wall, on the outside only. The circuit is a closed loop, so that ring
     bounds everything: cut across the infield and you are still inside it.
     An inner barrier would collapse to a point at the hairpin and would not be
     guarding anything anyway.

     Tested at all four body corners and resolved against the deepest one, so
     no part of the shell can be on the wrong side of the steel. */
  {
    const ch = Math.cos(s.car.heading);
    const sh = Math.sin(s.car.heading);
    let deepest = -Infinity;
    let index = after.index;
    let rx = 0;
    let ry = 0;
    for (const [lx, ly] of CORNERS) {
      // Corner offset from the centre of mass, rotated into the world.
      const ox = lx * ch - ly * sh;
      const oy = lx * sh + ly * ch;
      const hit2 = project(s.car.x + ox, s.car.y + oy, s.trackIndex);
      const depth = outwardOf(hit2, s.car.x + ox, s.car.y + oy);
      if (depth > deepest) {
        deepest = depth;
        index = hit2.index;
        rx = ox;
        ry = oy;
      }
    }

    if (deepest > WALL_OFFSET) {
      const n = outwardNormalAt(index);
      // Slide the whole car back until that corner is on the face, not in it.
      s.car.x -= n.x * (deepest - WALL_OFFSET);
      s.car.y -= n.y * (deepest - WALL_OFFSET);

      /* A proper impulse at the contact point, not just a reflected centre
         velocity. The lever arm is what makes a corner strike spin the car
         and a flat, square-on hit stop it dead — which is the difference
         between hitting a wall and bouncing off a bumper. */
      let vx = s.car.u * ch - s.car.v * sh;
      let vy = s.car.u * sh + s.car.v * ch;
      // Velocity of the contact patch itself: centre plus the spin about it.
      const into = (vx - s.car.omega * ry) * n.x + (vy + s.car.omega * rx) * n.y;
      if (into > 0) {
        const lever = rx * n.y - ry * n.x;
        const j =
          -(1 + WALL_BOUNCE) * into /
          (1 / GEOMETRY.MASS + (lever * lever) / GEOMETRY.INERTIA);
        vx += (j * n.x) / GEOMETRY.MASS;
        vy += (j * n.y) / GEOMETRY.MASS;
        s.car.omega += (lever * j) / GEOMETRY.INERTIA;
        // Friction along the face, so riding the barrier costs time rather
        // than working as a free guide rail.
        const alongX = vx - (vx * n.x + vy * n.y) * n.x;
        const alongY = vy - (vx * n.x + vy * n.y) * n.y;
        vx += alongX * (WALL_SCRUB - 1);
        vy += alongY * (WALL_SCRUB - 1);
      }
      s.car.u = vx * ch + vy * sh;
      s.car.v = -vx * sh + vy * ch;
    }
  }

  let ds = after.s - before;
  if (ds < -LAP_LENGTH / 2) ds += LAP_LENGTH;
  if (ds > LAP_LENGTH / 2) ds -= LAP_LENGTH;
  const reach = speedOf(s.car) * dt * 1.6 + 0.02;
  if (ds > reach) ds = reach;
  if (ds < -reach) ds = -reach;

  s.lapProgress += ds;
  s.distance += ds;

  /* --- gates ----------------------------------------------------------
     Five of them, evenly spaced, and all five have to be behind you before the
     start line will end a lap. Belt and braces against a cut the clamp above
     somehow let through — and the reason a shortcut says so rather than
     silently handing over a time nobody could match. */
  while (s.gatesHit < GATE_COUNT && s.lapProgress >= GATE_DISTANCES[s.gatesHit]) {
    // Only counts if the car is actually on the road at the gate.
    if (s.offset <= HALF_WIDTH + 3) s.gatesHit += 1;
    else break;
  }

  if (s.recording.length === 0 || s.elapsed >= s.nextGhostAt) {
    s.recording.push({
      t: s.elapsed,
      d: s.distance,
      x: s.car.x,
      y: s.car.y,
      heading: s.car.heading,
      steer: s.car.steer,
    });
    s.nextGhostAt = s.elapsed + 1 / GHOST_HZ;
  }

  /* --- stuck, and the way out ------------------------------------------
     The barrier means nobody can get lost any more, but it does not stop a car
     ending up parked against it pointing at the scenery. Crawling along off
     the asphalt is the signal. The clock keeps running through it, so this is
     a rescue and never a shortcut. */
  if (speedOf(s.car) < 1.5 && s.offset > HALF_WIDTH) s.stuckFor += dt;
  else s.stuckFor = 0;
  if (s.stuckFor >= STUCK_SECONDS) {
    const t = tangentAt(after.index);
    s.car.x = CENTER[after.index].x;
    s.car.y = CENTER[after.index].y;
    s.car.heading = Math.atan2(t.y, t.x);
    s.car.u = 0;
    s.car.v = 0;
    s.car.omega = 0;
    s.car.steer = 0;
    s.stuckFor = 0;
    // The car just teleported, so last step's reading of the finish plane
    // describes a place it is no longer in. Re-seed it or the jump can read as
    // a crossing and hand out a lap.
    s.axial = noseAxial(s.car);
    return "respawn";
  }

  /* --- the finish line -------------------------------------------------
     A lap ends where the chequered band is, not where a counter says it
     should be. `lapProgress` is a sum of per-step deltas clamped by `reach`
     above, so it drifts behind the car's real position every time a corner is
     cut — which is why the race used to end metres past the stripe. It is now
     only an arming heuristic; the trigger is geometry.

     Measured at the NOSE, because that is the part of a car that breaks a
     timing beam, and `lateral` keeps the infinite plane from catching anything
     that is not actually on the road. */
  const axial = noseAxial(s.car);
  const noseX = s.car.x + Math.cos(s.car.heading) * NOSE;
  const noseY = s.car.y + Math.sin(s.car.heading) * NOSE;
  const lateral = Math.abs((noseX - LINE.x) * -LINE.ty + (noseY - LINE.y) * LINE.tx);
  const wasAxial = s.axial;
  s.axial = axial;

  // Half a lap of arming, so sitting on the grid — or reversing back over the
  // stripe — cannot hand out a lap.
  const crossed =
    wasAxial < 0 && axial >= 0 && lateral <= HALF_WIDTH && s.lapProgress > LAP_LENGTH / 2;
  if (!crossed) return null;

  /* Land ON the line, not one step past it. The crossing happened part-way
     through this step, so rewind the pose and the clock by the overshoot. At
     120 Hz that is centimetres, but centimetres are the difference between a
     car parked on the chequers and a car parked beyond them. */
  const over = axial / (axial - wasAxial);
  s.elapsed -= over * dt;
  s.distance -= over * ds;
  s.car.x -= (s.car.x - wasX) * over;
  s.car.y -= (s.car.y - wasY) * over;
  s.axial = 0;
  s.lapProgress = 0;
  // The clock just went backwards; drop any sample recorded past the line so
  // the ghost's timeline stays monotonic for ghostAtTime's binary search.
  while (s.recording.length > 1 && s.recording[s.recording.length - 1].t > s.elapsed) {
    s.recording.pop();
  }

  const gatesOk = s.gatesHit >= GATE_COUNT;
  s.gatesHit = 0;
  const isFinalLap = s.lap + 1 >= LAPS;
  if (!gatesOk && !isFinalLap) {
    // Round again. The clock keeps running, which is punishment enough.
    s.missedGate = true;
    return "invalid";
  }
  s.missedGate = !gatesOk;
  const previous = s.lapTimes.reduce((a, b) => a + b, 0);
  s.lapTimes.push(s.elapsed - previous);
  s.lap += 1;
  if (s.lap < LAPS) return "lap";

  s.car.u = 0;
  s.car.v = 0;
  s.car.omega = 0;
  s.phase = "finished";
  s.result = s.elapsed * 1000;
  // One last sample at the exact stopping pose, so a ghost replayed from this
  // run parks on the line too instead of up to 1/30 s short of it.
  s.recording.push({
    t: s.elapsed,
    d: s.distance,
    x: s.car.x,
    y: s.car.y,
    heading: s.car.heading,
    steer: s.car.steer,
  });
  return "finish";
}

/**
 * Where the ghost was at a given distance around the track, and how long it
 * had taken to get there. Comparing at the same DISTANCE rather than the same
 * time is what makes the delta mean "ahead/behind on track" instead of
 * "ahead/behind in space", which is the number a driver can act on.
 */
export function ghostAt(ghost: GhostSample[], distance: number): { sample: GhostSample; time: number } | null {
  if (ghost.length === 0) return null;
  if (distance <= ghost[0].d) return { sample: ghost[0], time: ghost[0].t };
  const last = ghost[ghost.length - 1];
  if (distance >= last.d) return { sample: last, time: last.t };

  let lo = 0;
  let hi = ghost.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ghost[mid].d <= distance) lo = mid;
    else hi = mid;
  }
  const a = ghost[lo];
  const b = ghost[hi];
  const span = b.d - a.d || 1;
  const k = (distance - a.d) / span;
  return {
    sample: {
      t: a.t + (b.t - a.t) * k,
      d: distance,
      x: a.x + (b.x - a.x) * k,
      y: a.y + (b.y - a.y) * k,
      // Shortest way round the circle, or the ghost spins on the spot when its
      // heading wraps from +pi to -pi.
      heading: a.heading + wrapPi(b.heading - a.heading) * k,
      steer: a.steer + (b.steer - a.steer) * k,
    },
    time: a.t + (b.t - a.t) * k,
  };
}

/**
 * Where the ghost was after `t` seconds of its run.
 *
 * Deliberately a different lookup from ghostAt() above, and the difference
 * matters. The DELTA is a comparison at the same point on track, which is why
 * it searches by distance. The ghost CAR has to be placed by time, or it sits
 * permanently on the player bumper — at the same distance it is, by
 * definition, in the same place, and a ghost you can never see ahead of you is
 * not worth recording. Placed by time, a faster ghost pulls away up the road,
 * which is the entire point of racing one.
 */
export function ghostAtTime(ghost: GhostSample[], t: number): GhostSample | null {
  if (ghost.length === 0) return null;
  if (t <= ghost[0].t) return ghost[0];
  const last = ghost[ghost.length - 1];
  // Past the end the ghost has already finished; park it on the line.
  if (t >= last.t) return last;

  let lo = 0;
  let hi = ghost.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (ghost[mid].t <= t) lo = mid;
    else hi = mid;
  }
  const a = ghost[lo];
  const b = ghost[hi];
  const k = (t - a.t) / (b.t - a.t || 1);
  return {
    t,
    d: a.d + (b.d - a.d) * k,
    x: a.x + (b.x - a.x) * k,
    y: a.y + (b.y - a.y) * k,
    heading: a.heading + wrapPi(b.heading - a.heading) * k,
    steer: a.steer + (b.steer - a.steer) * k,
  };
}

function wrapPi(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/** Seconds up or down on the ghost at this point on track. */
export function ghostDelta(s: Session): number | null {
  if (!s.ghost) return null;
  const at = ghostAt(s.ghost, s.distance);
  if (!at) return null;
  return s.elapsed - at.time;
}
