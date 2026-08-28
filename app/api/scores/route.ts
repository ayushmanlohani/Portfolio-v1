/**
 * The global scoreboard, stored as one Redis sorted set on Upstash.
 *
 * Score = lap time in milliseconds, so Redis keeps the board sorted for us and
 * ZREMRANGEBYRANK throws away everything past tenth place. No schema, no
 * migrations, no table to manage — the whole store is one key.
 *
 * Talks to Upstash over its REST API with plain fetch, so there is no client
 * library to install. Env vars come from Vercel's Upstash integration; the two
 * names differ depending on when the integration was added, so accept either.
 */

const BASE = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

const KEY = "win7:racer:scores:v1";
const MAX = 10;

/**
 * Times outside this range did not come from driving two laps. Cheap to check,
 * and it keeps the obvious "0.001" submission off the board. Anyone determined
 * can still POST a plausible-looking time — real proof means re-simulating the
 * run server-side, which is a much bigger job than this board is worth.
 */
const MIN_MS = 45_000;
const MAX_MS = 600_000;

type Row = { name: string; ms: number; at: number };

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

/** ZRANGE ... WITHSCORES answers with a flat [member, score, member, score] list. */
function decode(flat: unknown): Row[] {
  if (!Array.isArray(flat)) return [];
  const rows: Row[] = [];
  for (let i = 0; i < flat.length - 1; i += 2) {
    try {
      const { name, at } = JSON.parse(String(flat[i])) as { name: string; at: number };
      const ms = Number(flat[i + 1]);
      if (typeof name === "string" && Number.isFinite(ms)) rows.push({ name, ms, at: at || 0 });
    } catch {
      /* somebody's hand-written member — skip the row, keep the board */
    }
  }
  return rows;
}

const READ = ["ZRANGE", KEY, "0", String(MAX - 1), "WITHSCORES"];

export async function GET() {
  if (!BASE || !TOKEN) return Response.json({ error: "no store" }, { status: 503 });
  try {
    const [flat] = await redis(READ);
    return Response.json({ scores: decode(flat) });
  } catch {
    return Response.json({ error: "unreachable" }, { status: 503 });
  }
}

export async function POST(req: Request) {
  if (!BASE || !TOKEN) return Response.json({ error: "no store" }, { status: 503 });

  let body: { name?: unknown; ms?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "bad body" }, { status: 400 });
  }

  const ms = Math.round(Number(body.ms));
  if (!Number.isFinite(ms) || ms < MIN_MS || ms > MAX_MS) {
    return Response.json({ error: "implausible time" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim().slice(0, 14) || "Anonymous";
  const member = JSON.stringify({ name, at: Date.now() });

  try {
    const results = await redis(
      ["ZADD", KEY, String(ms), member],
      ["ZREMRANGEBYRANK", KEY, String(MAX), "-1"],
      READ,
    );
    return Response.json({ scores: decode(results[2]) });
  } catch {
    return Response.json({ error: "unreachable" }, { status: 503 });
  }
}
