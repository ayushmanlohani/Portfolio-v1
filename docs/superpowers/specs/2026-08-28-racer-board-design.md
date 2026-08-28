# Racer: one result per player, and a trackside top five

Date: 2026-08-28
Status: built

## The rule

A player is a browser. One row on the global board, one personal best, one
ghost. A run only matters if it beats your own best; then it becomes the ghost
you race next time and it is sent to the board, which keeps whichever of your
times is fastest.

## Where the state lives

- `win7.racer.me.v2` — `{ id, name?, boardAsked?, bestMs? }`. The id is a
  `crypto.randomUUID()` minted on the first visit. `name` absent means we have
  never asked; an empty string is a real answer meaning Anonymous.
- `win7.racer.ghost.v1` — the recording of the run that set `bestMs`. Unchanged.
- Upstash: `win7:racer:board:v2` (ZSET, member = id, score = ms) and
  `win7:racer:names:v2` (HASH, id to name). `ZADD ... LT` is what enforces
  "one row, and it only gets faster" on the server rather than on trust.
  Nothing is trimmed off the ZSET: a player who drops out of the top five keeps
  their row, so a later slower run cannot look like a first submission.

## When it asks for a name

`askFor(me, ms, board)` in `leaderboard.ts` is the whole rule, and it only ever
runs on a personal best:

| Situation | Prompt |
|---|---|
| The run makes the top five and the loud ask has not been spent | `board` |
| Otherwise, and we have never asked for a name | `personal` |
| Otherwise | none, the row just updates |

So a player is interrupted at most twice in their life: once quietly for a
name, and once loudly the first time a lap of theirs goes somewhere other
people read it. Blank is accepted both times and shows as Anonymous. The loud
ask is only marked spent once the submission actually reached the board, so a
store that was down when they qualified gets to ask again.

## The board on the track

`drawLedBoard` in `render.ts`, drawn after the wall and before the cars. It
stands on the grass on the right at sample 6, roughly 25 m past the start line,
turned *across* the road rather than along it so it is square to everyone still
on the straight. The face is drawn in a flat 200x110 space and squashed onto
the projected quad, which leans the rows with the board instead of pasting them
flat in front of it. Five rows always, dashes where there is no name yet.

The board starts empty and fills as people play. There are no shipped target
times any more.

## Known ceilings

- The cheat check is still only the 45s to 600s range in `app/api/scores`. Real
  proof means re-simulating the run server-side.
- The ZSET and the names hash grow without bound. Fine at this scale; a
  `ZREMRANGEBYRANK` would have to keep the names hash in step and would break
  the "keeps their row" property above.
- One browser is one player, so clearing site data is a new identity.
