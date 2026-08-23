/**
 * The car.
 *
 * This is a bicycle model with real tyre slip, not an arcade fudge. Each axle
 * gets a slip angle, turns that into a lateral force, and that force is capped
 * by a friction circle against whatever the same tyre is already spending on
 * accelerating or braking. Drifting is not a mode: it is what happens when the
 * rear axle asks its tyres for more than the circle has left, exactly as in a
 * real car. Which is also why countersteering works — nobody wrote that part.
 *
 * SI units throughout: metres, seconds, kilograms, newtons, radians.
 *
 * Body frame is x forward, y to the car's LEFT. `heading` is where the body's
 * x axis points in the world.
 */

export type Input = {
  /** 0..1 */
  throttle: number;
  /** 0..1 */
  brake: number;
  /** -1 (right) .. 1 (left) */
  steer: number;
  handbrake: boolean;
};

export type Car = {
  x: number;
  y: number;
  heading: number;
  /** Forward velocity, body frame. */
  u: number;
  /** Lateral velocity, body frame — this is what "sideways" means. */
  v: number;
  /** Yaw rate, rad/s. */
  omega: number;
  /** Actual road-wheel angle, rad. Lags the input; steering racks have a speed. */
  steer: number;
  /** Longitudinal acceleration, kept for weight transfer on the next step. */
  ax: number;
  slipFront: number;
  slipRear: number;
  /** True while an axle is sliding hard enough to leave rubber on the road. */
  skidFront: boolean;
  skidRear: boolean;
};

const G = 9.81;

/* Chassis. A light, rear-drive coupe: the mass sits slightly back, which is
   what makes the rear step out willingly instead of ploughing. */
const MASS = 1180;
const INERTIA = 1400;
/** CG to front axle / to rear axle. Their sum is the wheelbase. */
const A = 1.32;
const B = 1.42;
const WHEELBASE = A + B;
/** CG height — the lever weight transfer acts through. */
const CG_HEIGHT = 0.52;
/** Half the axle track. Only used to place the four contact patches. */
export const HALF_TRACK = 0.78;

/* Tyres. Cornering stiffness is force per radian of slip, per axle. */
const C_FRONT = 105000;
const C_REAR = 118000;
/**
 * Peak grip on dry asphalt, per axle, scaled by the surface underneath.
 *
 * The rear is deliberately grippier than the front, and that asymmetry is
 * load-bearing rather than cosmetic. Static axle loads are defined by where
 * the CG sits — Fzf = mg*b/L and Fzr = mg*a/L — so with one shared friction
 * coefficient, a*Fzf and b*Fzr come out exactly equal, the yaw moment at full
 * saturation is identically zero, and the car has no restoring force at all at
 * the limit. It spins from a steady steering input. Giving the rear axle ~11%
 * more grip tips that balance into understeer at the limit, which is what a
 * human can actually catch. The rear still lets go on demand: the handbrake
 * strips its lateral force outright, and full throttle eats its friction
 * circle, so power oversteer on corner exit is intact.
 */
const MU_FRONT = 1.5;
const MU_REAR = 1.66;

/* Drivetrain. */
const DRIVE_FORCE = 9600;
const TOP_SPEED = 48;
const BRAKE_FORCE = 13500;
/** Front/rear brake split — front-biased, like every road car. */
const BRAKE_BIAS = 0.62;
const REVERSE_FORCE = 3800;

/* Resistance. */
const DRAG = 0.42;
const ROLL = 13.5;

/* Steering. */
const MAX_STEER = 0.62;
/** How fast the rack can move, rad/s. Slow enough that a drift must be planned. */
const STEER_RATE = 4.4;
/** Fraction of lock removed by the time the car is at TOP_SPEED. */
const STEER_FALLOFF = 0.7;

/** Slip angle past which a tyre is sliding, not gripping — draws rubber. */
const SKID_ANGLE = 0.16;

/**
 * Yaw damping, and why it exists.
 *
 * A bicycle model divides by forward speed to get slip angles, so as the car
 * approaches a standstill the maths stops describing anything real — a car
 * left spinning at walking pace will sit there rotating and shivering forever.
 * Real tyres do not: they scrub, and the contact patch takes time to build
 * force at all. This term stands in for both. It is scaled to nothing by
 * DAMP_SPEED, so it cannot touch how the car handles at any speed a player is
 * actually racing at — it only makes the aftermath of a spin behave.
 */
const YAW_DAMP = 3.2;
const DAMP_SPEED = 6;

export function createCar(x: number, y: number, heading: number): Car {
  return {
    x,
    y,
    heading,
    u: 0,
    v: 0,
    omega: 0,
    steer: 0,
    ax: 0,
    slipFront: 0,
    slipRear: 0,
    skidFront: false,
    skidRear: false,
  };
}

const clamp = (n: number, lo: number, hi: number) => (n < lo ? lo : n > hi ? hi : n);

/** Speed in m/s, ignoring which way the car happens to be pointing. */
export const speedOf = (car: Car) => Math.hypot(car.u, car.v);

/**
 * How sideways the car is, in radians — the angle between where it points and
 * where it is actually going. The HUD drift meter reads this.
 */
export const driftAngle = (car: Car) =>
  speedOf(car) < 2 ? 0 : Math.abs(Math.atan2(car.v, Math.abs(car.u)));

/**
 * Advance one fixed step.
 *
 * `grip` is the surface multiplier under the car (1 on asphalt, less on
 * grass). It arrives as an argument rather than being looked up here so this
 * file never needs to know a track exists.
 */
export function step(car: Car, input: Input, dt: number, grip: number): void {
  /* --- steering rack ------------------------------------------------- */
  const speed = Math.abs(car.u);
  const lock = MAX_STEER * (1 - STEER_FALLOFF * clamp(speed / TOP_SPEED, 0, 1));
  const target = clamp(input.steer, -1, 1) * lock;
  const maxMove = STEER_RATE * dt;
  car.steer += clamp(target - car.steer, -maxMove, maxMove);

  /* --- axle loads, including weight transfer under power and braking -- */
  const staticFront = (MASS * G * B) / WHEELBASE;
  const staticRear = (MASS * G * A) / WHEELBASE;
  const transfer = (MASS * car.ax * CG_HEIGHT) / WHEELBASE;
  const loadFront = Math.max(staticFront - transfer, 200);
  const loadRear = Math.max(staticRear + transfer, 200);

  /* --- slip angles ---------------------------------------------------
     The denominator is floored so that a stationary car does not report an
     infinite slip angle and spin on the spot. */
  const denom = Math.max(Math.abs(car.u), 2.2);
  const alphaFront = Math.atan2(car.v + A * car.omega, denom) - car.steer * Math.sign(car.u || 1);
  const alphaRear = Math.atan2(car.v - B * car.omega, denom);
  car.slipFront = alphaFront;
  car.slipRear = alphaRear;

  /* --- longitudinal forces ------------------------------------------- */
  const reversing = input.brake > 0 && car.u < 0.6;
  let driveRear = 0;
  if (!input.handbrake) {
    if (reversing) {
      driveRear = -REVERSE_FORCE * input.brake;
    } else {
      // Falls off with speed, which is what a gearbox and drag together feel
      // like without simulating either.
      driveRear = input.throttle * DRIVE_FORCE * Math.max(0, 1 - car.u / TOP_SPEED);
    }
  }

  const braking = reversing ? 0 : input.brake * BRAKE_FORCE * Math.sign(car.u || 1);
  let fxFront = -braking * BRAKE_BIAS;
  let fxRear = driveRear - braking * (1 - BRAKE_BIAS);

  /* The handbrake locks the rear wheels. A locked tyre spends its entire
     friction budget resisting the direction it is being dragged, which leaves
     nothing for cornering — so the back of the car simply lets go. */
  if (input.handbrake) {
    fxRear = -Math.sign(car.u || 1) * MU_REAR * grip * loadRear * 0.9;
  }

  /* --- lateral forces, then the friction circle ----------------------- */
  let fyFront = -C_FRONT * alphaFront;
  let fyRear = -C_REAR * alphaRear;
  if (input.handbrake) fyRear *= 0.22;

  const limitFront = MU_FRONT * grip * loadFront;
  const limitRear = MU_REAR * grip * loadRear;

  const magFront = Math.hypot(fxFront, fyFront);
  if (magFront > limitFront) {
    const k = limitFront / magFront;
    fxFront *= k;
    fyFront *= k;
  }
  const magRear = Math.hypot(fxRear, fyRear);
  if (magRear > limitRear) {
    const k = limitRear / magRear;
    fxRear *= k;
    fyRear *= k;
  }

  car.skidFront = Math.abs(alphaFront) > SKID_ANGLE && speed > 3;
  car.skidRear =
    (Math.abs(alphaRear) > SKID_ANGLE || (input.handbrake && speed > 2) || magRear >= limitRear) &&
    speed > 3;

  /* --- resistance ------------------------------------------------------ */
  const resist = -DRAG * car.u * Math.abs(car.u) - ROLL * car.u * (2 - grip);

  /* --- rigid body ------------------------------------------------------ */
  const cs = Math.cos(car.steer);
  const sn = Math.sin(car.steer);
  const fx = fxFront * cs - fyFront * sn + fxRear + resist;
  const fy = fxFront * sn + fyFront * cs + fyRear;
  const crawling = Math.max(0, 1 - speedOf(car) / DAMP_SPEED);
  const mz =
    A * (fyFront * cs + fxFront * sn) - B * fyRear - car.omega * YAW_DAMP * crawling * INERTIA;

  car.ax = fx / MASS;
  const av = fy / MASS;

  car.u += (car.ax + car.v * car.omega) * dt;
  car.v += (av - car.u * car.omega) * dt;
  car.omega += (mz / INERTIA) * dt;

  // Kill the numerical shiver a car at rest would otherwise sit in forever.
  if (Math.abs(car.u) < 0.12 && input.throttle === 0 && input.brake === 0) {
    car.u = 0;
    car.v *= 0.5;
    car.omega *= 0.5;
  }

  const ch = Math.cos(car.heading);
  const sh = Math.sin(car.heading);
  car.x += (car.u * ch - car.v * sh) * dt;
  car.y += (car.u * sh + car.v * ch) * dt;
  car.heading += car.omega * dt;
}

/** The four contact patches in world space — where skid marks get drawn. */
export function wheelPositions(car: Car) {
  const ch = Math.cos(car.heading);
  const sh = Math.sin(car.heading);
  const place = (bx: number, by: number) => ({
    x: car.x + bx * ch - by * sh,
    y: car.y + bx * sh + by * ch,
  });
  return {
    frontLeft: place(A, HALF_TRACK),
    frontRight: place(A, -HALF_TRACK),
    rearLeft: place(-B, HALF_TRACK),
    rearRight: place(-B, -HALF_TRACK),
  };
}

export const GEOMETRY = { A, B, WHEELBASE, HALF_TRACK, TOP_SPEED };
