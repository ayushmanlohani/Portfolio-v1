/**
 * Graphics settings: what the player trades away, stated plainly.
 *
 * The renderer's cost is dominated by things a player cannot see missing at
 * speed — backbuffer pixels beyond CSS resolution, grass detail, rubber too
 * old to matter. Every field here is one of those trade-offs with a name on
 * it. Draw distance is deliberately NOT one of them: the circuit is drawn
 * whole, every frame, because detail appearing out of nothing ahead of the car
 * is worse to look at than anything it saves.
 *
 * Two presets ship with the game and a "custom" state is reached the moment
 * any single option is moved off its preset. Settings persist in localStorage
 * and survive new fields by merging over defaults rather than trusting the
 * saved blob's shape.
 */

export type GfxSettings = {
  /** Which preset the current values match, or "custom" when none do. */
  preset: "balanced" | "potato" | "custom";
  /** Backbuffer scale cap. 1 = CSS pixels regardless of HiDPI display. */
  dprCap: number;
  /** Frame limiter. Simulation is timestep-based; nothing else moves. */
  fpsCap: number;
  /** Ground tuft density — the only thing that makes open grass readable. */
  tufts: "full" | "sparse" | "off";
  /** Rubber history left on the track. */
  skids: "normal" | "short" | "off";
  /** Tyre smoke and dust particles. */
  smoke: boolean;
  /** Ghost as four blocks instead of the full nine-box model. */
  ghostSimple: boolean;
};

/**
 * The default. Chosen so the game looks essentially unchanged while dropping
 * every cost that buys nothing visible: native-DPI pixels nobody can count,
 * tuft spacing the eye smooths over, skid marks older than a lap.
 */
export const BALANCED: GfxSettings = {
  preset: "balanced",
  dprCap: 1,
  fpsCap: 60,
  tufts: "sparse",
  skids: "short",
  smoke: false,
  ghostSimple: true,
};

/** Emergency mode for machines that are still struggling on Balanced. */
export const POTATO: GfxSettings = {
  preset: "potato",
  dprCap: 1,
  fpsCap: 30,
  tufts: "off",
  skids: "off",
  smoke: false,
  ghostSimple: true,
};

const KEY = "win7.racer.gfx.v1";

const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

/** Everything except `preset` — preset is derived, never trusted. */
function sameGfx(a: GfxSettings, b: GfxSettings): boolean {
  return (
    a.dprCap === b.dprCap &&
    a.fpsCap === b.fpsCap &&
    a.tufts === b.tufts &&
    a.skids === b.skids &&
    a.smoke === b.smoke &&
    a.ghostSimple === b.ghostSimple
  );
}

/** Coerce anything into valid settings; unknown shapes fall back to defaults. */
export function normalizeGfx(input: unknown): GfxSettings {
  const raw = (typeof input === "object" && input !== null ? input : {}) as Partial<GfxSettings>;
  const s: GfxSettings = {
    dprCap: raw.dprCap === 2 ? 2 : 1,
    fpsCap: raw.fpsCap === 30 ? 30 : 60,
    tufts: pick(raw.tufts, ["full", "sparse", "off"] as const, BALANCED.tufts),
    skids: pick(raw.skids, ["normal", "short", "off"] as const, BALANCED.skids),
    smoke: typeof raw.smoke === "boolean" ? raw.smoke : BALANCED.smoke,
    ghostSimple: typeof raw.ghostSimple === "boolean" ? raw.ghostSimple : BALANCED.ghostSimple,
    preset: "custom",
  };
  s.preset = sameGfx(s, BALANCED) ? "balanced" : sameGfx(s, POTATO) ? "potato" : "custom";
  return s;
}

export function loadGfx(): GfxSettings {
  if (typeof window === "undefined") return { ...BALANCED };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { ...BALANCED };
    return normalizeGfx(JSON.parse(raw));
  } catch {
    // Private mode or a hand-edited key. Defaults are always safe.
    return { ...BALANCED };
  }
}

export function saveGfx(settings: GfxSettings): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    /* the session still runs on these settings either way */
  }
}
