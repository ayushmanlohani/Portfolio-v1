/**
 * A run: the rules that turn a physics step into a lap time.
 *
 * Kept apart from both React and the canvas so the same code that decides
 * whether a lap counted can be driven headlessly by a test. Time here is
 * SIMULATED time — the sum of the fixed steps taken — never the wall clock.
 * That is what makes a lap time mean the same thing on a 60 Hz laptop, a
 * 144 Hz monitor, and a machine that stuttered halfway round.
 */

import { createCar, speedOf, step, type Car, type Input } from "./physics";
import { GATE_COUNT, GATE_DISTANCES, HALF_WIDTH, LAP_LENGTH, project, startPose, surfaceAt } from "./track";

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

export type RunEvent = "lap" | "finish" | "invalid";

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
  /** Metres into the current lap. */
  lapProgress: number;
  /** Metres covered in the whole run — the ghost comparison key. */
  distance: number;
  gatesHit: number;
  /** Set when a gate was missed; cleared when the lap is re-run. */
  missedGate: boolean;
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
    distance: 0,
    gatesHit: 0,
    missedGate: false,
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
  step(s.car, racing ? input : IDLE, dt, s.grip);
  if (!racing) return null;

  s.elapsed += dt;

  /* --- how far round did that step actually get us? ---------------------
     Taken from the projection onto the centre line, then clamped to what the
     car could physically have covered. Without the clamp, cutting across the
     infield makes the projection jump hundreds of metres in one step and hands
     out a lap for free. */
  const after = project(s.car.x, s.car.y, s.trackIndex);
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

  if (s.lapProgress >= LAP_LENGTH) {
    if (s.gatesHit < GATE_COUNT) {
      // Round again. The clock keeps running, which is punishment enough.
      s.lapProgress -= LAP_LENGTH;
      s.gatesHit = 0;
      s.missedGate = true;
      return "invalid";
    }
    s.lapProgress -= LAP_LENGTH;
    s.gatesHit = 0;
    s.missedGate = false;
    const previous = s.lapTimes.reduce((a, b) => a + b, 0);
    s.lapTimes.push(s.elapsed - previous);
    s.lap += 1;
    if (s.lap >= LAPS) {
      s.phase = "finished";
      s.result = s.elapsed * 1000;
      return "finish";
    }
    return "lap";
  }

  return null;
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
