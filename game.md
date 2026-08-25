# Time Attack — game context

This is the handoff doc for work happening in the `CarFeel` worktree. Read
this before touching anything in `components/win7/racer/`. Keep it updated —
this is meant to be picked up cold by any agent, including a future you.

## What this is

A real driving game inside a Windows 7-style desktop portfolio
(`components/win7/racer/`), opened from a desktop icon, the Start menu, or the
taskbar. Canvas 2D, no rendering libraries, no image assets — everything is
drawn with primitives. Two laps of a 695m circuit, a clock, a personal-best
ghost car, and a local scoreboard.

Controls: Arrows/WASD to drive, Space for handbrake, R to restart, Esc to
pause. Keys are only captured while the window is focused and a race is live.

## Current focus: car feel

**The goal of this worktree is improving how the car handles** — drift,
weight transfer, steering response, grip balance. Not visuals, not new
features (those are explicitly out of scope here unless they turn out to be
required to test a feel change).

**How this work actually proceeds — read this before changing physics:**

Ayushman doesn't have a fixed spec for "correct" car feel. He drives, forms an
opinion by feel, then reports it in plain language ("it feels floaty",
"it doesn't want to rotate", "handbrake feels too strong"). He does **not**
give numeric targets.

The expected workflow for whichever agent is doing this work:

1. He describes a problem, in feel terms, informally, whenever he notices one.
2. The agent's job is to propose **multiple concrete configurations** (i.e.
   different constant values / small model tweaks) that could address it —
   not one guess. He wants to A/B by playing, not read a diff and trust it.
3. He plays each, picks by feel, and reports back. The chosen values become
   the new baseline; log the decision (see below).
4. Repeat. This is iterative and driven by his sense while playing, not by a
   physics-correctness argument. Don't over-engineer a "correct" model when
   the ask is "make it feel right."

**Whenever he mentions a problem — even offhand, even if not immediately
actioned — add it to "Problems to solve" below**, so it survives context
resets and doesn't get forgotten between sessions.

## Problems to solve

*(Living list. Append here the moment a problem is mentioned, even before
it's worked on. Move to "Resolved" once he's confirmed a fix by feel, with a
one-line note on what changed and why.)*

- *(none reported yet — first play-test pending)*

- **Handling had a Grip/Drift toggle; drift felt loose and lost grip on A/D.**
  Removed entirely (2026-08-25) — grip is the only model now, at the values the
  toggle used for "Grip". No mode button in the menu.

### Resolved

- **Car could drive off and get lost forever** (2026-08-25). The circuit is a
  closed loop, so a single OUTER barrier bounds everything — cut across the
  infield and you are still inside the ring. There is deliberately no inner
  wall: an inner offset would collapse to a point at the hairpin and would not
  be guarding anything. `WALL_OFFSET` is 14 m from the centre line, well
  outside the kerbs, so running wide stays a mistake you can gather up rather
  than a rail to scrape. Which way is "out" is read from the signed area of the
  centre line (`OUTWARD` in track.ts), so re-shaping the track cannot silently
  flip it. Impact keeps 0.3 restitution and scrubs 15% of the speed along the
  wall, so riding the barrier costs time. Backstop: crawling off the asphalt
  for 2.5 s puts the car back on the racing line with the clock still running
  (`"respawn"` event). Collision is tested at all four **body corners** and
  resolved against the deepest one, with a real contact impulse (lever arm, so
  a corner strike spins the car). Resolving at the centre of mass instead is
  what let the shell clip visibly through the wall.

  The wall is 18 m tall and is the edge of the world. Anything above camera
  height projects above the horizon at any distance, so it hides the seam where
  the ground plane ends — which is why the horizon haze and the asphalt
  distance-fade gradients could both be deleted outright.

- **The wall was see-through where track lay behind it** (2026-08-25). Not
  alpha and not draw order — a nonzero-winding cancellation. `drawWall` batched
  every panel into one path and filled once, but going round the ring `i -> i+1`
  runs left to right across the near wall and right to left across the far one,
  so the two halves have opposite winding on screen (measured: 39 panels one
  way, 205 the other). Nonzero fill reads an overlap between them as a hole, so
  the grass and track drawn underneath showed through. Panels are now filled
  one at a time, back to front, which also fixes far caps poking over near
  panels. Batching a FLAT surface stays safe — projecting a plane cannot flip
  orientation — so the road and kerbs still share one fill each.

- **Scenery popped in as you drove** (2026-08-25). The circuit was distance-
  culled per frame (`roadRange`/`kerbRange`/`dashRange`) and grass tufts were
  generated in a moving window around the camera, so detail grew in ahead of
  the car and vanished behind it. The whole circuit and the whole tuft field
  are now drawn every frame from fixed lists (~3.3k quads, each early-rejected
  off-screen). Deleted the "Draw distance" and "Gradients" graphics settings —
  they no longer controlled anything.

- **Race ended metres past the chequered line** (2026-08-25). Root cause: the
  finish fired on `s.lapProgress`, an accumulated sum of per-step deltas that
  are clamped by `reach` in `advance()`. That sum drifts away from the car's
  real position every time a corner is cut — measured at ~41 m of error over
  two laps. It is now only an *arming* heuristic (half a lap). The trigger is
  geometry: the nose crossing the plane of the chequered band at `CENTER[0]`,
  with a lateral check so the infinite plane cannot catch a car off in the
  infield. On the crossing the pose and clock are rewound by the sub-step
  overshoot, so the car lands ON the line rather than one step past it, then
  freezes. A final ghost sample is recorded at that exact pose, so a replayed
  ghost parks on the line too instead of up to 1/30 s short of it. Deleted the
  previous nose-offset / `nearFinish` / teleport patches — they treated the
  symptom.

  `?tiny=1` is test scaffolding for this: it swaps in a small oval whose
  sample 0 sits mid-straight and starts the car 25 m short of the line on the
  final lap, aimed at it. Holding accelerate ends a race in ~2.5 s. Both the
  flag and the `TINY` branch in `createSession()` are marked `ponytail:` and
  are safe to delete once nobody needs a fast finish-line check.

## Architecture map

| File | Role |
|---|---|
| [Racer.tsx](components/win7/racer/Racer.tsx) | React shell: canvas mount, RAF loop, input handling, HUD (written direct to DOM refs, not React state), menus/overlays, graphics settings panel, ghost pack/unpack for localStorage. |
| [physics.ts](components/win7/racer/physics.ts) | The car itself. Bicycle model, `Car` state, `step()`. Pure simulation — no rendering or DOM knowledge. **This is almost certainly where feel work happens.** |
| [render.ts](components/win7/racer/render.ts) | All drawing: camera, projection/clipping, sky/ground/track/kerbs/car/particles/minimap. Not the focus of this worktree, but skid marks and drift visualization live here and read physics state. |
| [session.ts](components/win7/racer/session.ts) | Race rules on top of physics: fixed-step driver, lap/gate logic, ghost recording and lookup. |
| [track.ts](components/win7/racer/track.ts) | Track spline, closest-point projection, per-surface grip (`surfaceAt`), gates, start pose. |
| [leaderboard.ts](components/win7/racer/leaderboard.ts) | Local scoreboard, 4-method interface (`top/submit/best/clear`) designed so a real backend can swap in later. |
| [settings.ts](components/win7/racer/settings.ts) | Graphics quality settings — unrelated to feel work, don't touch unless a feel change needs a new toggle. |

Hosting: [apps.ts](components/win7/apps.ts) registers the window
(`RACER_ID`, size 880×520, tuned to a specific screen); `WindowLayer.tsx`
mounts `<Racer />`; `store/windows.ts` is the generic window store the
component subscribes to (pauses the loop when minimized).

## The physics model (what you're tuning)

Bicycle model in SI units, in [physics.ts](components/win7/racer/physics.ts).

**State** (`Car` type, physics.ts:27-46): position `x,y`, heading, body-frame
velocities `u` (forward) / `v` (lateral), yaw rate `omega`, `steer`,
longitudinal accel `ax`, per-axle slip angles and skid state.

**`step(car, input, dt, grip)`** (physics.ts:155-260) — the whole update per
fixed tick:
steering rack lag → axle loads with weight transfer → slip angles
(`alphaFront/alphaRear`) → longitudinal forces (drive/brake/handbrake) →
lateral forces from cornering stiffness → **friction circle** clamp
(combines fx/fy against `MU * grip * load`, can't exceed the tyre's total
grip budget) → low-speed yaw damping → rigid-body integration.

**Grip split is structural, not a preference.** `MU_FRONT = 1.5`,
`MU_REAR = 1.66` (physics.ts:80-81). With one shared coefficient, static axle
loads make `a·Fzf` and `b·Fzr` exactly equal at the grip limit — the yaw
moment is identically zero there, so the car has *no restoring force* and
spins from a steady steering input, full stop. The ~11% extra rear grip
creates understeer-at-limit instead, which is catchable, while handbrake/power
can still deliberately overwhelm the rear. **Don't remove or "simplify" this
asymmetry — it's the reason the car doesn't spin out on every corner.** Tuning
the *amount* of asymmetry, or other constants, is fair game.

**Handbrake**: locks rear longitudinal force to the friction limit and cuts
rear lateral force by ×0.22 (physics.ts:199-206). Likely tuning target if the
handbrake feels wrong.

**Fixed timestep**: `DT = 1/120` (session.ts:15), accumulator-driven, capped
at 240 steps/frame. Camera and skid-mark rendering read this state but run on
wall-clock smoothing separately — changing physics constants doesn't affect
render smoothness.

Grip is passed into `step()` from `track.ts`'s `surfaceAt()` rather than
looked up internally — physics stays track-agnostic. Relevant if a "problem"
turns out to be surface-specific (e.g. grass vs asphalt feel).

## Decisions already made

- **Bicycle model with real slip/friction-circle physics, not an arcade
  approximation.** Drift falls out of the rear axle losing grip; it isn't a
  scripted mode. Established before this worktree — see HANDOFF.md.
- **Feel-first, config-comparison workflow** (this worktree, 2026-08-25): no
  numeric target physics. Agent proposes multiple parameter sets, human picks
  by playing, not by reading numbers.
- **Chase camera, not top-down** (2026-08-23, HANDOFF.md) — out of scope here
  but touches perceived "feel" since drift is easier to read from behind the
  car. If handling changes make the camera lag/framing feel wrong, that's a
  render.ts problem, not a physics one — don't conflate them.
- **No settings for physics** — unlike graphics (which has a real settings
  panel), there's no in-game way to switch handling models. All comparison
  happens by the agent editing constants and the user reloading. No plan yet
  to build a live tuning UI unless iteration speed becomes the actual
  bottleneck (ask before building one — it's scope creep on "just fix the
  feel").

## What's next

- First play-test pending — no specific complaints logged yet (see "Problems
  to solve").
- Once problems come in: for each, propose 2-3 concrete constant/model
  changes as separate testable configs (e.g. via git stash/branch swaps, or
  a temporary in-code toggle) rather than one best-guess edit.
- Not planned in this worktree unless it turns out necessary for a feel fix:
  visual changes, new track content, settings UI, leaderboard/backend work.
  Those live in other worktrees — see root [CLAUDE.md](../../../CLAUDE.md)
  "Still open" section for the project-wide backlog.

## Known architecture friction (not this worktree's job, but relevant if a
## feel fix requires touching render.ts)

Full breakdown in the codebase-analysis this doc was built from — summary:
render.ts is a single ~970-line file, draw order is the only z-ordering
(no depth buffer for anything but the car itself), colors/magic numbers are
scattered literals not a central table, and skid/particle spawning happens
inside the physics step loop rather than as a separate effects system. None
of this blocks physics tuning, but if a chosen car-feel fix wants a new visual
tell (e.g. tire smoke intensity tied to slip angle), expect to touch that
loop directly rather than finding a clean hook.
