"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { RACER_ID } from "@/components/win7/apps";
import { useWindowStore } from "@/store/windows";

import { driftAngle, speedOf, wheelPositions, type Input } from "./physics";
import { formatDelta, formatTime, leaderboard, type Score } from "./leaderboard";
import {
  applyGfx,
  chaseCamera,
  clearSkids,
  createSkidTrail,
  drawCar,
  drawGround,
  drawMinimap,
  drawParticles,
  drawShadow,
  drawSkids,
  drawSky,
  drawStartLine,
  drawTrack,
  drawWall,
  GHOST_PAINT,
  PLAYER_PAINT,
  pushSkid,
  quality,
  spawnSmoke,
  trackCameraYaw,
  trimSkids,
  updateParticles,
  type Particle,
  type SkidTrail,
} from "./render";
import {
  advance,
  createSession,
  ghostAtTime,
  ghostDelta,
  DT,
  LAPS,
  type GhostSample,
  type Session,
} from "./session";
import { BALANCED, loadGfx, POTATO, saveGfx, type GfxSettings } from "./settings";
import { HALF_WIDTH } from "./track";

/** Physics steps between skid marks. See where the marks are laid for why. */
const SKID_EVERY = 3;

/** Where a personal best and its ghost are kept between visits. */
const GHOST_KEY = "win7.racer.ghost.v1";

/**
 * A ghost is ~1,600 samples. Stored raw as JSON that is a third of a megabyte
 * of needless precision — centimetres and milliseconds are far finer than
 * anything the eye can see at this scale, so everything is rounded on the way
 * out and localStorage gets a quarter of the bytes.
 */
function packGhost(samples: GhostSample[]): string {
  return JSON.stringify(
    samples.map((s) => [
      Math.round(s.t * 1000) / 1000,
      Math.round(s.d * 100) / 100,
      Math.round(s.x * 100) / 100,
      Math.round(s.y * 100) / 100,
      Math.round(s.heading * 1000) / 1000,
      Math.round(s.steer * 1000) / 1000,
    ]),
  );
}

function unpackGhost(raw: string): GhostSample[] | null {
  try {
    const rows: unknown = JSON.parse(raw);
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return rows.map((r) => {
      const a = r as number[];
      return { t: a[0], d: a[1], x: a[2], y: a[3], heading: a[4], steer: a[5] };
    });
  } catch {
    return null;
  }
}

type Phase = "menu" | "racing" | "finished";

/** Which physical keys do what. Everything else is ignored. */
const KEYS: Record<string, keyof HeldKeys> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "handbrake",
};

type HeldKeys = { up: boolean; down: boolean; left: boolean; right: boolean; handbrake: boolean };

/** True while the keystroke belongs to a text field rather than to the car. */
function isTyping(e: React.KeyboardEvent): boolean {
  const el = e.target as HTMLElement | null;
  return el?.tagName === "INPUT" || el?.tagName === "TEXTAREA";
}

export function Racer() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* HUD nodes are written to directly. Putting the clock in React state would
     re-render the whole component sixty times a second to change six
     characters, which is exactly the kind of cost a game cannot pay. */
  const timeRef = useRef<HTMLSpanElement>(null);
  const deltaRef = useRef<HTMLSpanElement>(null);
  const speedRef = useRef<HTMLSpanElement>(null);
  const lapRef = useRef<HTMLSpanElement>(null);
  const driftRef = useRef<HTMLDivElement>(null);
  const lightsRef = useRef<HTMLDivElement>(null);
  const warnRef = useRef<HTMLDivElement>(null);

  const sessionRef = useRef<Session | null>(null);
  const skidRef = useRef<SkidTrail>(createSkidTrail());
  /* The camera's own heading. It trails the car rather than matching it, so it
     has to persist between frames instead of being derived from the car. */
  const camYawRef = useRef(0);
  /* Where each wheel was when the last skid mark was laid — see the step loop. */
  const skidAnchorRef = useRef<ReturnType<typeof wheelPositions> | null>(null);
  const skidTickRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const heldRef = useRef<HeldKeys>({ up: false, down: false, left: false, right: false, handbrake: false });
  const pausedRef = useRef(false);
  const bestGhostRef = useRef<GhostSample[] | null>(null);

  const [phase, setPhase] = useState<Phase>("menu");
  const [paused, setPaused] = useState(false);
  const [focused, setFocused] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [personalBest, setPersonalBest] = useState<number | null>(null);
  const [board, setBoard] = useState<Score[]>([]);
  const [rank, setRank] = useState(0);
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState(false);
  /* Copied out of the session when the flag falls. Reading the live session
     while rendering the results card would be reading a mutable object React
     knows nothing about. */
  const [splits, setSplits] = useState<number[]>([]);

  /* Graphics settings load synchronously with the first render so the menu
     shows the saved setup immediately; they are only rendered client-side,
     inside an open window, so there is no SSR value to disagree with. */
  const [gfx, setGfx] = useState<GfxSettings>(() => loadGfx());
  /* The loop reads settings through a ref — same reasoning as phaseRef below. */
  const gfxRef = useRef(gfx);
  /* True while the Win7 window holding this game is minimised: it is still
     mounted (display:none), so without this check the loop would keep waking
     the CPU every frame to draw into a zero-size canvas nobody can see. */
  const hiddenRef = useRef(false);
  const winMinimized = useWindowStore((s) =>
    s.windows.some((w) => w.id === RACER_ID && w.minimized),
  );

  /* ------------------------------------------------------------ loading */

  useEffect(() => {
    let alive = true;
    void leaderboard.top().then((s) => alive && setBoard(s));
    void leaderboard.best().then((s) => alive && setPersonalBest(s?.ms ?? null));
    try {
      const raw = window.localStorage.getItem(GHOST_KEY);
      if (raw) bestGhostRef.current = unpackGhost(raw);
    } catch {
      /* no ghost is a fine state to be in */
    }
    return () => {
      alive = false;
    };
  }, []);

  /* Settings changes reach three places at once: the loop's ref, the
     renderer's live quality object, and storage. Shrinking the skid cap also
     truncates what is already on the track, or old marks would outlive their
     setting until overwritten. */
  useEffect(() => {
    gfxRef.current = gfx;
    applyGfx(gfx);
    trimSkids(skidRef.current);
    saveGfx(gfx);
  }, [gfx]);

  useEffect(() => {
    hiddenRef.current = winMinimized;
  }, [winMinimized]);

  /* ------------------------------------------------------------ control */

  const start = useCallback(() => {
    sessionRef.current = createSession(bestGhostRef.current);
    particlesRef.current = [];
    clearSkids(skidRef.current);
    // Snap the camera straight behind the grid slot; easing in from wherever
    // the last run ended would swing the world round during the countdown.
    camYawRef.current = sessionRef.current.car.heading;
    heldRef.current = { up: false, down: false, left: false, right: false, handbrake: false };
    pausedRef.current = false;
    setPaused(false);
    setResult(null);
    setSplits([]);
    setRank(0);
    setSubmitted(false);
    setPhase("racing");
    rootRef.current?.focus();
  }, []);

  const finish = useCallback((session: Session) => {
    const ms = session.result ?? 0;
    setResult(ms);
    setSplits([...session.lapTimes]);
    setPhase("finished");
    // A ghost is only worth keeping if it is the fastest one this browser has.
    void leaderboard.best().then((best) => {
      if (!best || ms < best.ms) {
        bestGhostRef.current = session.recording;
        try {
          window.localStorage.setItem(GHOST_KEY, packGhost(session.recording));
        } catch {
          /* the ghost still works for this session */
        }
      }
    });
  }, []);

  const submit = useCallback(async () => {
    if (result === null || submitted) return;
    const { rank: place, scores } = await leaderboard.submit(name, result);
    setRank(place);
    setBoard(scores);
    setSubmitted(true);
    void leaderboard.best().then((s) => setPersonalBest(s?.ms ?? null));
  }, [name, result, submitted]);

  /* -------------------------------------------------------------- input */

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // A name being typed owns its keystrokes; space belongs in the field
      // rather than on the handbrake.
      if (isTyping(e)) return;

      if (e.code === "Escape") {
        pausedRef.current = !pausedRef.current;
        setPaused(pausedRef.current);
        e.preventDefault();
        return;
      }
      if (e.code === "KeyR" && phase !== "menu") {
        start();
        e.preventDefault();
        return;
      }
      // Outside a race the arrows and space still belong to the buttons on
      // screen, so the car only claims them while there is a race to drive.
      if (phase !== "racing") return;

      const key = KEYS[e.code];
      if (key) {
        heldRef.current[key] = true;
        // Arrows and space scroll a page and press buttons. Not in here.
        e.preventDefault();
      }
    },
    [phase, start],
  );

  const onKeyUp = useCallback((e: React.KeyboardEvent) => {
    if (isTyping(e)) return;
    const key = KEYS[e.code];
    if (key) {
      heldRef.current[key] = false;
      e.preventDefault();
    }
  }, []);

  /* The loop is created once and never torn down, so anything it needs to read
     that changes has to reach it through a ref rather than a closure. The
     writes happen in an effect rather than during render: a render can be
     thrown away and re-run, and a ref written on a discarded render would
     leave the loop reading something that never happened. One frame of lag on
     a pause or a focus change is not something anyone can perceive. */
  const phaseRef = useRef(phase);
  const focusedRef = useRef(focused);
  const finishRef = useRef(finish);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);
  useEffect(() => {
    focusedRef.current = focused;
  }, [focused]);
  useEffect(() => {
    finishRef.current = finish;
  }, [finish]);

  /* --------------------------------------------------------- the loop */

  useEffect(() => {
    const canvas = canvasRef.current;
    const root = rootRef.current;
    if (!canvas || !root) return;
    // Opaque: the game paints every pixel of itself every frame, so an alpha
    // channel is a compositing cost paid for nothing.
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;
    // The menu sits over a live track rather than a black rectangle: the car
    // is already on the grid, waiting, before anything is pressed.
    if (!sessionRef.current) {
      sessionRef.current = createSession(bestGhostRef.current);
      camYawRef.current = sessionRef.current.car.heading;
    }

    let raf = 0;
    let last = performance.now();
    let accumulator = 0;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      /* A minimised window is still mounted, so this branch is what actually
         stops the spend: no resize, no sim, no draw — and `last` moves with
         the clock so nothing sprints to catch up on restore. */
      if (hiddenRef.current) {
        last = now;
        accumulator = 0;
        return;
      }

      // Frame limiter. RAF fires at the display's rate; on a 144 Hz panel
      // that is 2.4x the work for motion the eye cannot separate from 60.
      // Holding frames rather than skipping them keeps wall time honest: the
      // accumulator simply grows across held frames and the fixed steps run
      // when we next get through.
      const interval = 1000 / gfxRef.current.fpsCap;
      const span = now - last;
      if (span < interval - 0.5) return;
      last = now;

      const wall = Math.min(span / 1000, 0.25);

      // The cap replaces the old floor-at-1 rule: "1x" means CSS pixels even
      // on a HiDPI screen, which is exactly the trade the player asked for.
      const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 0.5), gfxRef.current.dprCap);
      const w = Math.max(1, Math.round(root.clientWidth * dpr));
      const h = Math.max(1, Math.round(root.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      const view = { width: w, height: h };

      const session = sessionRef.current;
      if (!session) return;

      // Paused freezes the CANVAS too: the overlay is DOM, and the frame
      // underneath it costs nothing standing still.
      if (pausedRef.current) {
        accumulator = 0;
        return;
      }

      /* --- simulate ---------------------------------------------------
         A fixed step, however long the frame took. The clock in this game is
         the number of steps taken, so a dropped frame costs the player
         nothing and a 144 Hz monitor buys them nothing either. */
      const running = phaseRef.current === "racing" && !pausedRef.current && focusedRef.current;
      if (running) {
        accumulator += wall;
        let steps = 0;
        while (accumulator >= DT && steps < 240) {
          const held = heldRef.current;
          const input: Input = {
            throttle: held.up ? 1 : 0,
            brake: held.down ? 1 : 0,
            // Positive steer turns the car toward increasing heading, which is
            // clockwise once the world is drawn with y pointing down — so the
            // right-hand key is the positive one.
            steer: (held.right ? 1 : 0) - (held.left ? 1 : 0),
            handbrake: held.handbrake,
          };

          const event = advance(session, input, DT);
          const wheels = wheelPositions(session.car);

          /* Rubber is laid every few steps rather than every one. At 120 Hz a
             mark per step per wheel fills the whole trail in about six seconds
             of drifting and the earlier marks vanish; spanning several steps
             gives segments long enough to see and a trail that outlives a lap.
             The anchor is where each wheel was when the last mark was laid,
             and it is dropped the moment the tyres bite again so a new slide
             never draws a line across the gap. */
          const car = session.car;
          if (session.phase === "racing" && (car.skidRear || car.skidFront)) {
            const trail = skidRef.current;
            const onGrass = session.offset > HALF_WIDTH;
            const anchor = skidAnchorRef.current;
            skidTickRef.current += 1;

            if (!anchor) {
              skidAnchorRef.current = wheels;
            } else if (skidTickRef.current % SKID_EVERY === 0) {
              if (car.skidRear) {
                const heat = Math.min(1, Math.abs(car.slipRear) / 0.6);
                pushSkid(trail, anchor.rearLeft, wheels.rearLeft, heat, onGrass);
                pushSkid(trail, anchor.rearRight, wheels.rearRight, heat, onGrass);
              }
              if (car.skidFront) {
                const heat = Math.min(1, Math.abs(car.slipFront) / 0.6);
                pushSkid(trail, anchor.frontLeft, wheels.frontLeft, heat * 0.6, onGrass);
                pushSkid(trail, anchor.frontRight, wheels.frontRight, heat * 0.6, onGrass);
              }
              skidAnchorRef.current = wheels;
            }

            if (car.skidRear && Math.random() < 0.06 + (onGrass ? 0.05 : 0)) {
              const speed = speedOf(car);
              spawnSmoke(
                particlesRef.current,
                wheels.rearLeft.x,
                wheels.rearLeft.y,
                -Math.cos(car.heading) * speed,
                -Math.sin(car.heading) * speed,
                onGrass,
              );
            }
          } else {
            skidAnchorRef.current = null;
          }

          if ((event === "invalid" || event === "respawn") && warnRef.current) {
            warnRef.current.textContent =
              event === "respawn"
                ? "Back on track — clock never stopped"
                : "Gate missed — lap does not count";
            warnRef.current.dataset.show = "1";
            window.setTimeout(() => {
              if (warnRef.current) warnRef.current.dataset.show = "";
            }, 2600);
          }
          if (event === "finish") {
            finishRef.current(session);
            accumulator = 0;
            break;
          }

          accumulator -= DT;
          steps += 1;
        }
      } else {
        // Do not bank time while paused, or the sim sprints to catch up the
        // moment the player comes back.
        accumulator = 0;
      }

      updateParticles(particlesRef.current, wall);
      // Swung by wall time, not sim time: the camera is presentation, and it
      // should keep gliding at the same rate whether or not the race is paused.
      camYawRef.current = trackCameraYaw(camYawRef.current, session.car, wall);

      /* --- draw --------------------------------------------------------
         Strictly back to front. Everything is on one plane, so there is no
         depth buffer to sort it out — the order these run in IS the depth. */
      const cam = chaseCamera(session.car, camYawRef.current, view);
      drawSky(ctx, cam, view);
      drawGround(ctx, cam, view);
      drawTrack(ctx, cam);
      drawStartLine(ctx, cam);
      drawSkids(ctx, cam, skidRef.current);
      // After the flat world, before the cars: the barrier is the only upright
      // thing out there, and the cars are always inside the ring it makes.
      drawWall(ctx, cam);

      let ghostPose: { x: number; y: number } | null = null;
      if (session.ghost) {
        // By time, not by distance — see ghostAtTime for why.
        const at = ghostAtTime(session.ghost, session.elapsed);
        if (at) {
          ghostPose = at;
          drawShadow(ctx, cam, at);
          drawCar(ctx, cam, at, GHOST_PAINT, false, quality.ghostSimple ? "simple" : "full");
        }
      }
      drawShadow(ctx, cam, session.car);
      drawCar(ctx, cam, session.car, PLAYER_PAINT, heldRef.current.down);
      // Smoke last of the world layers: it hangs in the air above everything.
      drawParticles(ctx, cam, particlesRef.current);
      drawMinimap(ctx, view, session.car, ghostPose, dpr);

      /* --- HUD --------------------------------------------------------- */
      if (timeRef.current) timeRef.current.textContent = formatTime(session.elapsed * 1000);
      if (speedRef.current) {
        speedRef.current.textContent = String(Math.round(speedOf(session.car) * 3.6));
      }
      if (lapRef.current) {
        lapRef.current.textContent = `${Math.min(session.lap + 1, LAPS)}/${LAPS}`;
      }
      if (deltaRef.current) {
        const d = ghostDelta(session);
        deltaRef.current.textContent = d === null ? "" : formatDelta(d * 1000);
        deltaRef.current.dataset.sign = d === null ? "" : d <= 0 ? "up" : "down";
      }
      if (driftRef.current) {
        const angle = (driftAngle(session.car) * 180) / Math.PI;
        driftRef.current.style.width = `${Math.min(100, (angle / 45) * 100)}%`;
        driftRef.current.dataset.hot = angle > 22 ? "1" : "";
      }
      if (lightsRef.current) {
        if (session.phase === "countdown") {
          const n = Math.ceil(session.countdown);
          lightsRef.current.textContent = n > 0 ? String(n) : "GO";
          lightsRef.current.dataset.show = "1";
        } else if (session.elapsed < 0.7 && session.phase === "racing") {
          lightsRef.current.textContent = "GO";
          lightsRef.current.dataset.show = "1";
        } else {
          lightsRef.current.dataset.show = "";
        }
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* ------------------------------------------------------------ render */

  const showMenu = phase === "menu";
  const showResult = phase === "finished";
  const beatenBest = result !== null && personalBest !== null && result <= personalBest;

  return (
    <div
      className="rc"
      ref={rootRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onPointerDown={() => rootRef.current?.focus()}
    >
      <canvas className="rc-canvas" ref={canvasRef} />

      <div className="rc-hud" data-hidden={showMenu ? "1" : ""}>
        <div className="rc-panel rc-clock">
          <span className="rc-label">Time</span>
          <span className="rc-time" ref={timeRef}>
            0:00.000
          </span>
          <span className="rc-delta" ref={deltaRef} />
        </div>
        <div className="rc-panel rc-lap">
          <span className="rc-label">Lap</span>
          <span className="rc-lapno" ref={lapRef}>
            1/{LAPS}
          </span>
        </div>
        <div className="rc-panel rc-speedo">
          <span className="rc-speed" ref={speedRef}>
            0
          </span>
          <span className="rc-unit">km/h</span>
          <div className="rc-drift">
            <div className="rc-drift-fill" ref={driftRef} />
          </div>
        </div>
      </div>

      <div className="rc-lights" ref={lightsRef} />
      <div className="rc-warn" ref={warnRef} />

      {!focused && !showMenu && (
        <div className="rc-focus-note">Click to take the wheel</div>
      )}

      {paused && !showMenu && !showResult && (
        <div className="rc-overlay">
          <div className="rc-card">
            <h2>Paused</h2>
            <p className="rc-muted">Esc to resume · R to restart</p>
            <button type="button" className="rc-btn" onClick={() => { pausedRef.current = false; setPaused(false); rootRef.current?.focus(); }}>
              Resume
            </button>
          </div>
        </div>
      )}

      {showMenu && (
        <div className="rc-overlay">
          <div className="rc-card rc-menu">
            <div className="rc-menu-head">
              <div className="rc-menu-badge">Time Trial • {LAPS} Laps</div>
              <h2>Time Attack</h2>
              <p className="rc-muted">
                One clock, rear-wheel slip. Throttle in, handbrake to break the rear, counter-steer to catch it — three laps to find the line.
              </p>
            </div>
            <div className="rc-menu-body">
              <div className="rc-menu-col">
                <div className="rc-keys">
                  <div><kbd>↑</kbd> / <kbd>W</kbd><span>Throttle</span></div>
                  <div><kbd>↓</kbd> / <kbd>S</kbd><span>Brake &amp; reverse</span></div>
                  <div><kbd>←</kbd> <kbd>→</kbd><span>Steer</span></div>
                  <div><kbd>Space</kbd><span>Handbrake</span></div>
                  <div><kbd>R</kbd><span>Restart</span></div>
                  <div><kbd>Esc</kbd><span>Pause</span></div>
                </div>
                <button type="button" className="rc-btn rc-btn-go rc-btn-primary" onClick={start}>
                  {personalBest === null ? "Start race" : "Race again"}
                  <span aria-hidden="true"> →</span>
                </button>
                {personalBest !== null ? (
                  <p className="rc-muted rc-pb">
                    Your best: <strong>{formatTime(personalBest)}</strong> — ghost drives it with you.
                  </p>
                ) : (
                  <p className="rc-muted rc-pb">Set a time and race your ghost.</p>
                )}
              </div>
              <div className="rc-menu-col">
                <GraphicsPanel gfx={gfx} onChange={setGfx} />
              </div>
            </div>
            {(board.length > 0 || personalBest !== null) && (
              <div className="rc-menu-foot">
                <Board scores={board} highlight={null} />
                <p className="rc-muted" style={{ margin: 0, textAlign: "center", marginTop: board.length ? 8 : 0 }}>
                  {board.length === 0 ? "No scores yet — be the first on the board." : "Top 10 • Ghost saves in this browser"}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {showResult && (
        <div className="rc-overlay">
          <div className="rc-card">
            <h2>{beatenBest ? "New personal best" : "Finished"}</h2>
            <p className="rc-final">{formatTime(result ?? 0)}</p>
            {splits.length > 0 && (
              <p className="rc-muted">
                {splits.map((t, i) => `Lap ${i + 1}  ${formatTime(t * 1000)}`).join("  ·  ")}
              </p>
            )}

            {!submitted ? (
              <form
                className="rc-submit"
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <input
                  className="rc-input"
                  value={name}
                  maxLength={14}
                  placeholder="Your name"
                  onChange={(e) => setName(e.target.value)}
                  aria-label="Name for the scoreboard"
                />
                <button type="submit" className="rc-btn">
                  Put me on the board
                </button>
              </form>
            ) : (
              <p className="rc-rank">
                {rank > 0 ? `#${rank} on the board` : "Not quite a top ten time"}
              </p>
            )}

            <Board scores={board} highlight={submitted && rank > 0 ? rank : null} />
            <button type="button" className="rc-btn rc-btn-go" onClick={start}>
              Race again
            </button>
            <p className="rc-muted rc-note">Scores are saved in this browser.</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Board({ scores, highlight }: { scores: Score[]; highlight: number | null }) {
  if (scores.length === 0) return null;
  return (
    <table className="rc-board">
      <tbody>
        {scores.map((s, i) => (
          <tr
            key={`${s.name}-${s.at}-${i}`}
            data-target={s.target ?? ""}
            data-me={highlight === i + 1 ? "1" : ""}
          >
            <td className="rc-pos">{i + 1}</td>
            <td className="rc-name">{s.name}</td>
            <td className="rc-score">{formatTime(s.ms)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** One segmented control — the Win7 flavour of a radio group. */
function Seg({
  options,
  value,
  onChange,
}: {
  options: { v: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <span className="rc-seg">
      {options.map((o) => (
        <button
          key={o.v}
          type="button"
          data-active={o.v === value ? "1" : ""}
          onClick={() => onChange(o.v)}
        >
          {o.label}
        </button>
      ))}
    </span>
  );
}

/**
 * Graphics options, shown on the menu where a player meets them once rather
 * than buried in an in-race menu they would never open mid-corner. Moving any
 * single option flips the state to custom; presets snap everything back.
 */
function GraphicsPanel({ gfx, onChange }: { gfx: GfxSettings; onChange: (g: GfxSettings) => void }) {
  const set = (patch: Partial<GfxSettings>) =>
    onChange({ ...gfx, ...patch, preset: "custom" });
  const preset = (p: "balanced" | "potato") =>
    onChange({ ...(p === "balanced" ? BALANCED : POTATO) });

  const bool = (v: boolean) => (v ? "1" : "0");

  return (
    <div className="rc-gfx">
      <div className="rc-gfx-title">
        <span>Graphics</span>
        <span data-preset={gfx.preset}>
          {gfx.preset === "balanced" ? "Balanced" : gfx.preset === "potato" ? "Potato" : "Custom"}
        </span>
      </div>
      <div className="rc-gfx-row">
        <span>Presets</span>
        <Seg
          options={[
            { v: "balanced", label: "Balanced" },
            { v: "potato", label: "Potato" },
          ]}
          value={gfx.preset === "custom" ? "" : gfx.preset}
          onChange={(v) => preset(v as "balanced" | "potato")}
        />
      </div>
      <div className="rc-gfx-row">
        <span>FPS cap</span>
        <Seg
          options={[
            { v: "60", label: "60" },
            { v: "30", label: "30" },
          ]}
          value={String(gfx.fpsCap)}
          onChange={(v) => set({ fpsCap: Number(v) })}
        />
      </div>
      <div className="rc-gfx-row">
        <span>Resolution</span>
        <Seg
          options={[
            { v: "1", label: "1x" },
            { v: "2", label: "Native" },
          ]}
          value={String(gfx.dprCap)}
          onChange={(v) => set({ dprCap: Number(v) })}
        />
      </div>
      <div className="rc-gfx-row">
        <span>Grass detail</span>
        <Seg
          options={[
            { v: "full", label: "Full" },
            { v: "sparse", label: "Light" },
            { v: "off", label: "Off" },
          ]}
          value={gfx.tufts}
          onChange={(v) => set({ tufts: v as GfxSettings["tufts"] })}
        />
      </div>
      <div className="rc-gfx-row">
        <span>Skid marks</span>
        <Seg
          options={[
            { v: "normal", label: "Long" },
            { v: "short", label: "Short" },
            { v: "off", label: "Off" },
          ]}
          value={gfx.skids}
          onChange={(v) => set({ skids: v as GfxSettings["skids"] })}
        />
      </div>
      <div className="rc-gfx-row">
        <span>Smoke</span>
        <Seg
          options={[
            { v: "1", label: "On" },
            { v: "0", label: "Off" },
          ]}
          value={bool(gfx.smoke)}
          onChange={(v) => set({ smoke: v === "1" })}
        />
      </div>
      <div className="rc-gfx-row">
        <span>Ghost car</span>
        <Seg
          options={[
            { v: "1", label: "Simple" },
            { v: "0", label: "Full" },
          ]}
          value={bool(gfx.ghostSimple)}
          onChange={(v) => set({ ghostSimple: v === "1" })}
        />
      </div>
    </div>
  );
}
