/**
 * The global scoreboard: one row per player, stored on Upstash Redis.
 *
 *   board — ZSET win7:racer:board:v2, member is the player's id and score is
 *           the lap time in ms, so Redis keeps the ranking for us.
 *   names — HASH win7:racer:names:v2, id to display name, so a player can
 *           rename without moving.
 *
 * `ZADD ... LT` is what makes "one result per person, and it is their best"
 * true on the server rather than on trust: it inserts a new player, and for one
 * already there it only ever lowers the time. Nobody is trimmed off the ZSET —
 * a player who drops out of the top five keeps their row, which is what stops a
 * later slower run from looking like a first submission.
 *
 * Talks to Upstash over its REST API with plain fetch, so there is no client
 * library to install. Env vars come from Vercel's Upstash integration; the two
 * names differ depending on when the integration was added, so accept either.
 */

const BASE = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const BOARD = "win7:racer:board:v2";
const NAMES = "win7:racer:names:v2";
const MAX = 5;

/**
 * Times outside this range did not come from driving the full distance. Cheap
 * to check, and it keeps the obvious "0.001" submission off the board. Anyone
 * determined can still POST a plausible-looking time — real proof means
 * re-simulating the run server-side, which is a much bigger job than this
 * board is worth.
 */
const MIN_MS = 45_000;
const MAX_MS = 600_000;

/** The id is a key, so it is matched strictly. crypto.randomUUID only makes v4. */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Row = { userId: string; name: string; ms: number };

async function redis(...commands: string[][]): Promise<unknown[]> {
  const res = await fetch(`${BASE}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`upstash ${res.status}`);
  const out = (await res.json()) as { result?: unknown; error?: string }[];
  return out.map((r) => r.result);
}

/**
 * The top five with names attached. Two round trips rather than one: HMGET
 * needs the ids, and the ids only exist once ZRANGE has answered.
 */
async function board(): Promise<Row[]> {
  /* ZRANGE ... WITHSCORES answers with a flat [member, score, member, ...] list. */
  const [flat] = await redis(["ZRANGE", BOARD, "0", String(MAX - 1), "WITHSCORES"]);
  if (!Array.isArray(flat) || flat.length === 0) return [];

  const ids = flat.filter((_, i) => i % 2 === 0).map(String);
  const [names] = await redis(["HMGET", NAMES, ...ids]);
  const list: unknown[] = Array.isArray(names) ? names : [];

  return ids.map((userId, i) => ({
    userId,
    name: String(list[i] ?? "") || "Anonymous",
    ms: Number(flat[i * 2 + 1]),
  }));
}

export async function GET() {
  if (!BASE || !TOKEN) return Response.json({ error: "no store" }, { status: 503 });
  try {
    return Response.json({ scores: await board() });
  } catch {
    return Response.json({ error: "unreachable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!BASE || !TOKEN) return Response.json({ error: "no store" }, { status: 503 });

  let body: { userId?: unknown; name?: unknown; ms?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad body" }, { status: 400 });
  }

  const userId = String(body.userId ?? "").trim();
  if (!UUID_RE.test(userId)) return Response.json({ error: "bad id" }, { status: 400 });

  const ms = Math.round(Number(body.ms));
  if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) {
    return Response.json({ error: "implausible time" }, { status: 400 });
  }

  /* The name is a string we render, not a key we look anything up by, so it is
     stripped to something safe rather than rejected. Blank is a real answer:
     leaving the field empty is how a player stays anonymous. */
  const name =
    String(body.name ?? "")
      .replace(/[^A-Za-z0-9 _-]/g, "")
      .trim()
      .slice(0, 14) || "Anonymous";

  try {
    await redis(["ZADD", BOARD, "LT", String(ms), userId], ["HSET", NAMES, userId, name]);
    const scores = await board();
    return Response.json({ scores, rank: scores.findIndex((s) => s.userId === userId) + 1 });
  } catch {
    return Response.json({ error: "unreachable" }, { status: 503 });
  }
}
