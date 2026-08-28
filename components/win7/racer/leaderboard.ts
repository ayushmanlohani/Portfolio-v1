/**
 * Who you are, what your best lap was, and the global top five.
 *
 * One player is one browser: a UUID minted on the first visit and kept in
 * localStorage next to the name and the personal best. The ghost car replays
 * that best run, so everything needed to race is local and the network is only
 * ever asked about other people. A board that will not load is an empty board,
 * never a lost lap.
 *
 * Anything the browser sends can be forged, so /api/scores — not this file —
 * is where a submitted time is checked before it reaches the store.
 */

/** One row of the global board. */
export type Score = { userId: string; name: string; ms: number };

/**
 * This browser's player.
 *
 * `name` being absent is what decides whether we have ever asked for one: an
 * empty string is a real answer ("leave me anonymous"), a missing one means the
 * question has not been put yet. Same idea for `boardAsked` — it is the record
 * that the top-five prompt has been shown, so it only ever interrupts once.
 */
export type Me = {
  id: string;
  name?: string;
  boardAsked?: boolean;
  /** Personal best in milliseconds. The ghost blob is the run that set it. */
  bestMs?: number;
};

const ME_KEY = "win7.racer.me.v2";

/** How many places the board shows. The server trims to the same number. */
export const BOARD_SIZE = 5;

function store(me: Me) {
  try {
    window.localStorage.setItem(ME_KEY, JSON.stringify(me));
  } catch {
    /* private mode or a full quota — the run still counts for this session */
  }
}

export function readMe(): Me {
  let me: Partial<Me> = {};
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(ME_KEY) ?? "{}");
    if (raw && typeof raw === "object") me = raw as Partial<Me>;
  } catch {
    /* unreadable is the same as new here */
  }
  if (!me.id) {
    me = { ...me, id: crypto.randomUUID() };
    store(me as Me);
  }
  return me as Me;
}

/** Merge a change into the stored player and hand back the result. */
export function updateMe(patch: Partial<Me>): Me {
  const next = { ...readMe(), ...patch };
  store(next);
  return next;
}

/**
 * Which question a personal best earns, given who the player is and the board
 * they can see. Null means ask nothing and just update the row.
 *
 * A player is interrupted at most twice in their life: once for a name at all,
 * and once — louder — the first time a lap of theirs is going somewhere other
 * people will read it. Every best after that is silent, which is the whole
 * point of racing your own ghost.
 */
export function askFor(me: Me, ms: number, board: Score[]): "board" | "personal" | null {
  const qualifies = board.length < BOARD_SIZE || ms < board[board.length - 1].ms;
  if (qualifies && !me.boardAsked) return "board";
  if (me.name === undefined) return "personal";
  return null;
}

async function api(init?: RequestInit): Promise<{ scores: Score[]; rank?: number } | null> {
  try {
    const res = await fetch("/api/scores", init);
    if (!res.ok) return null;
    const data = (await res.json()) as { scores?: Score[]; rank?: number };
    return Array.isArray(data.scores) ? { scores: data.scores, rank: data.rank } : null;
  } catch {
    return null;
  }
}

/** The global top five. Empty when there is no store, or no network. */
export async function topScores(): Promise<Score[]> {
  return (await api())?.scores ?? [];
}

/**
 * Put a run on the global board.
 *
 * The server keeps one row per player and only ever lets that row get faster,
 * so this is safe to call on every personal best without checking first.
 * `scores` comes back null when the board could not be reached, which is the
 * caller's cue to keep showing the one it already has.
 */
export async function submitScore(
  name: string,
  ms: number,
): Promise<{ rank: number; scores: Score[] | null }> {
  const data = await api({
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId: readMe().id, name, ms }),
  });
  return { rank: data?.rank ?? 0, scores: data?.scores ?? null };
}

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
