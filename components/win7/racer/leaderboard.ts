/**
 * The scoreboard, behind one small interface.
 *
 * Every method is async because the board is now a network call: submit and
 * top hit /api/scores (Upstash Redis, one sorted set), and fall back to this
 * browser's localStorage when no store is configured or the network is down.
 * Personal best stays local either way — the ghost car replays it offline.
 * Nothing that renders a score has to know which one it is talking to.
 *
 * Anything the browser sends can be forged, so the route handler — not this
 * file — rejects implausible times before they reach the store.
 */

export type Score = {
  name: string;
  /** Total time for the run, milliseconds. */
  ms: number;
  /** When it was set. */
  at: number;
  /** Target times shipped with the game rather than driven by a player. */
  target?: "gold" | "silver" | "bronze";
};

export interface Leaderboard {
  top(limit?: number): Promise<Score[]>;
  /** Returns the new board and where this run landed (1-based, 0 = off the board). */
  submit(name: string, ms: number): Promise<{ rank: number; scores: Score[] }>;
  /** The fastest run this browser has driven, ghost included. */
  best(): Promise<Score | null>;
  clear(): Promise<void>;
}

/**
 * Times to beat, shipped with the game. They are goals, not people — the board
 * renders them as medals rather than as names, so nobody is being credited
 * with a lap they did not drive. A leaderboard with nothing on it reads as
 * broken; a leaderboard with three targets reads as a challenge.
 */
export const TARGETS: Score[] = [
  { name: "Gold", ms: 62000, at: 0, target: "gold" },
  { name: "Silver", ms: 70000, at: 0, target: "silver" },
  { name: "Bronze", ms: 80000, at: 0, target: "bronze" },
];

const KEY = "win7.racer.scores.v1";
const MAX = 10;

const byTime = (a: Score, b: Score) => a.ms - b.ms;

function read(): Score[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is Score =>
          !!s && typeof s === "object" && typeof (s as Score).name === "string" && Number.isFinite((s as Score).ms),
      )
      .sort(byTime)
      .slice(0, MAX);
  } catch {
    // Private mode, a full quota, or somebody editing the key by hand. An
    // unreadable board is an empty board, never a crash mid-race.
    return [];
  }
}

function write(scores: Score[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(scores));
  } catch {
    /* nothing to do — the run still counted for this session */
  }
}

function makeEntry(name: string, ms: number): Score {
  return { name: name.trim().slice(0, 14) || "Anonymous", ms, at: Date.now() };
}

/**
 * Keep the run in this browser regardless of what the network board says. The
 * ghost car replays your personal best, so best() has to answer even offline.
 */
function recordLocal(entry: Score): Score[] {
  const scores = [...read(), entry].sort(byTime).slice(0, MAX);
  write(scores);
  return scores;
}

const localBoard: Leaderboard = {
  async top(limit = MAX) {
    return [...read(), ...TARGETS].sort(byTime).slice(0, limit);
  },

  async submit(name, ms) {
    const entry = makeEntry(name, ms);
    const merged = [...recordLocal(entry), ...TARGETS].sort(byTime);
    // Identity, not equality: two runs can tie to the millisecond.
    const rank = merged.findIndex((s) => s === entry) + 1;
    return { rank, scores: merged.slice(0, MAX) };
  },

  async best() {
    return read()[0] ?? null;
  },

  async clear() {
    try {
      window.localStorage.removeItem(KEY);
    } catch {
      /* see write() */
    }
  },
};

/**
 * The global board: /api/scores, backed by one Redis sorted set on Upstash.
 *
 * Every network call falls back to the local board rather than throwing. With
 * no store configured (a fresh clone, dev without env vars) the game behaves
 * exactly as it did before this file grew a second implementation — nobody
 * loses a lap to a 503.
 */
async function fetchBoard(init?: RequestInit): Promise<Score[] | null> {
  try {
    const res = await fetch("/api/scores", init);
    if (!res.ok) return null;
    const { scores } = (await res.json()) as { scores?: Score[] };
    return Array.isArray(scores) ? scores : null;
  } catch {
    return null;
  }
}

const remoteBoard: Leaderboard = {
  async top(limit = MAX) {
    const scores = await fetchBoard();
    if (!scores) return localBoard.top(limit);
    return [...scores, ...TARGETS].sort(byTime).slice(0, limit);
  },

  async submit(name, ms) {
    const entry = makeEntry(name, ms);
    recordLocal(entry);
    const scores = await fetchBoard({
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: entry.name, ms }),
    });
    if (!scores) {
      const merged = [...read(), ...TARGETS].sort(byTime);
      const rank = merged.findIndex((s) => s.name === entry.name && s.ms === entry.ms) + 1;
      return { rank, scores: merged.slice(0, MAX) };
    }
    const merged = [...scores, ...TARGETS].sort(byTime);
    // The server sent back its own objects, so match on the run rather than on
    // identity. A tie to the millisecond with the same name is the same driver.
    const rank = merged.findIndex((s) => s.name === entry.name && s.ms === entry.ms) + 1;
    return { rank, scores: merged.slice(0, MAX) };
  },

  /** Personal best and the ghost it drives are this browser's, not the world's. */
  best: localBoard.best,
  clear: localBoard.clear,
};

/** The board the game talks to. One line to fall back to local-only. */
export const leaderboard: Leaderboard = remoteBoard;

/** 1:04.312 — the format every racing game has used for forty years. */
export function formatTime(ms: number): string {
  if (!Number.isFinite(ms)) return "--:--.---";
  const total = Math.max(0, Math.round(ms));
  const m = Math.floor(total / 60000);
  const s = Math.floor((total % 60000) / 1000);
  const cs = total % 1000;
  return `${m}:${String(s).padStart(2, "0")}.${String(cs).padStart(3, "0")}`;
}

/** Gap to the run being chased: +1.204 or -0.318. */
export function formatDelta(ms: number): string {
  const sign = ms >= 0 ? "+" : "-";
  const a = Math.abs(ms);
  return `${sign}${Math.floor(a / 1000)}.${String(Math.round(a % 1000)).padStart(3, "0")}`;
}
