import { fetchNotes } from "./drive";
import { systemPrompt } from "./knowledge";

/**
 * POST { question } -> { answer }.
 *
 * One Groq call per question. There is no retrieval step and no conversation
 * history: the entire corpus is a few thousand words, so it all goes in the
 * system prompt every time, and each question is answered on its own.
 *
 * Cost control is a per-IP counter in the same Upstash the leaderboard uses.
 * With no Upstash configured the limiter opens rather than closes, so `npm run
 * dev` works on a laptop with only a Groq key.
 */

const BASE = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

/** Groq's catalog turns over — Llama 3.3 70B was retired off it. Check
 *  `GET /openai/v1/models` with the key before assuming a name still works. */
const MODEL = "openai/gpt-oss-120b";
const LIMIT = 20;
const WINDOW_SECONDS = 3600;
const MAX_QUESTION = 500;

/**
 * Counts this IP's questions in the current hour and says whether it may ask
 * another. The key carries the hour, so it expires itself and there is no
 * sliding window to maintain — a burst at :59 gets a fresh 20 at :00, which is
 * the trade a fixed window makes and is fine for a portfolio.
 *
 * ponytail: fixed window, per-IP. Swap for a sorted-set sliding window only if
 * someone actually abuses the :59/:00 seam.
 */
async function underLimit(ip: string): Promise<boolean> {
  if (!BASE || !TOKEN) return true;

  const key = `win7:ask:${ip}:${Math.floor(Date.now() / (WINDOW_SECONDS * 1000))}`;
  try {
    const res = await fetch(`${BASE}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, String(WINDOW_SECONDS)],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return true;
    const [incr] = (await res.json()) as { result?: unknown }[];
    return Number(incr?.result ?? 0) <= LIMIT;
  } catch {
    // The store being down is not a reason to take the assistant down with it.
    return true;
  }
}

export async function POST(request: Request) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return Response.json({ error: "The assistant isn't configured." }, { status: 503 });

  let body: { question?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }

  const question = String(body.question ?? "").trim().slice(0, MAX_QUESTION);
  if (!question) return Response.json({ error: "Ask something first." }, { status: 400 });

  /* Typing "/refresh" in the ask bar re-reads the Doc past the cache and
     reports what came back, so Ayushman can confirm an edit landed without
     waiting out CACHE_SECONDS or opening a second tab. Not advertised
     anywhere; a visitor who guesses it only spends one Drive call. */
  if (question.toLowerCase() === "/refresh") {
    const notes = await fetchNotes(true);
    return Response.json({
      answer: notes
        ? `Notes reloaded from Drive — ${notes.length} characters, starting "${notes.slice(0, 60)}".`
        : "Reloaded, but the Drive notes came back empty. Check the doc is named \"knowledge\" and shared with the service account.",
    });
  }

  /* Vercel puts the client first in x-forwarded-for. Everyone behind one NAT
     shares a bucket; that is the cost of not setting a cookie for this. */
  const ip = (request.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim();
  if (!(await underLimit(ip))) {
    return Response.json({ error: "That's a lot of questions. Try again later." }, { status: 429 });
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: systemPrompt(await fetchNotes()) },
          { role: "user", content: question },
        ],
      }),
      cache: "no-store",
    });
    /* Groq's free tier meters tokens per minute, not just requests, and one
       question costs ~3k of them — so a second asker inside the same minute is
       the failure people will actually hit. Say that, rather than reporting it
       as the assistant being down. */
    if (res.status === 429) {
      return Response.json({ error: "Busy right now — try again in a few seconds." }, { status: 429 });
    }
    if (!res.ok) throw new Error(`groq ${res.status}`);

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const answer = data.choices?.[0]?.message?.content?.trim();
    if (!answer) throw new Error("empty answer");

    return Response.json({ answer });
  } catch {
    return Response.json({ error: "Couldn't reach the assistant. Try again." }, { status: 502 });
  }
}
