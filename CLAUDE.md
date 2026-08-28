# CLAUDE.md

Notes for Claude on how to work on this project with Ayushman.
Keep this file updated as we learn more.

## Who I'm working with

- Ayushman doesn't do frontend design. He judges by feel, not by technical terms.
- He describes problems by what he *sees*, often with screenshots. Translate that into the actual CSS/layout cause.
- He is technical enough to understand explanations — don't dumb things down, just don't assume design vocabulary.
- He will tell me when I'm wrong, and he's often right. Take it seriously.

## How he wants me to talk

- Short and direct. Long explanations waste his tokens and his time.
- **Target length: ~5-10 lines.** He explicitly approved this style: a one-line answer, a short table or tight bullet list, then one line of "why". Nothing more.
- Lead with the direct answer, even when it contradicts his assumption. Then explain.
- During back-and-forth debugging, keep replies to a few lines.
- Say the finding first, then the fix. Don't narrate the journey.
- Don't re-explain things he already understood.

## How he wants me to decide

- **Ask before implementing.** He'd rather answer a question than unwind wrong work.
- Batch questions into one round, up front. Don't drip them out.
- Give him options with real trade-offs, and mark my recommendation.
- Don't ask about things he already delegated to me — make the call, say it's easy to change.
- If a constraint makes his request impossible, say so plainly and explain why, then offer the closest real options.

## How to debug a visual problem

This is the workflow he wants to learn, so make it explicit each time.

- **Measure before changing code.** Never adjust values because something "looks off".
- Reproduce at *his* window size, not mine. His screen has display scaling (~1.22 pixel ratio).
- Use `localhost:3000/?debug=1` — it shows window size, pixel ratio, image size, and a red crosshair on true center.
- Ask him for a screenshot of the debug view. It answers "is it really off-center?" instantly.
- **Check the boring causes first:** browser cache, browser zoom (Ctrl+0), stale dev server.
- Real example: wallpaper looked "zoomed and off-center". It was neither — his Chrome had cached a 511px image and stretched it 3×. Incognito proved it. Cache, not code.

## Where the code lives

`README.md` has the map. The short version: `content/` holds every word,
`public/letterbox/` holds every asset, `components/win7/fs.ts` is the one file
tree everything reads, `components/win7/apps.ts` is every non-folder window, and
`app/globals.css` is the entire Windows 7 skin.

## Decisions already made

*(2026-08-19: Sherbet/pastel design scrapped for the Windows 7 redesign below.)*

- **The concept:** a beige CRT monitor; inside the glass is Windows 7.
- **The CRT frame is currently OFF.** `Monitor.tsx` renders `data-frame="off"`,
  which zeroes `--bezel` and `--chin` — Windows runs edge to edge and no
  plastic, MULTISYNC or LED is on screen. The whole CRT is still in the CSS;
  flipping that one attribute to `"on"` brings it back. Read the CRT notes
  below as *how the frame works*, not as what's visible right now.
- **The monitor fills the viewport — no stand, no fixed aspect ratio.** The
  glass takes the *viewer's* screen shape (ultrawide → wide desktop, laptop →
  laptop-shaped), a deliberate reversal of the original 4:3 idea. Nothing gaps
  or clips because there's nothing left over to place.
- **Bottom edge stays deeper than the other three** so MULTISYNC and the green
  power LED survive. Asked and answered — don't make it uniform.
- **Wallpaper fills and crops** (`cover`, centred), like Windows' own "Fill".
  Ten stills plus one live video, switchable from Personalization.
- **Font:** Segoe UI, Win7's own system font — already installed on Windows, so
  no webfont. Tahoma is the period-correct fallback.
- **Taskbar:** Aero bar, Start orb, a working Start menu, notification tray,
  clock, pinning, and a button per open window.
- **Six desktop folders** — About Me, Projects, Experience, Education, Resume,
  Contact — plus a Recycle Bin, all with content. Each opens a real Win7
  Explorer window.
- **Nothing persists.** Icon positions, the Recycle Bin, Notepad saves and
  folders you create are all in memory and gone on reload — deliberately, so
  nobody's visit leaks into the next visitor's. The only exceptions are Time
  Attack's personal best and graphics settings (`localStorage`) and its global
  board (Redis).
- **Three media apps:** Windows Media Player (video, opens on an empty Music
  library like the real thing — Organize ▸ Manage libraries reaches the
  videos), Windows Photo Viewer (pictures, the pill toolbar), and a read-only
  PDF viewer on pdf.js. Photo Viewer has no launcher entry — like real Windows,
  it's only what a picture opens in. `components/win7/media.ts` is the library
  index: drop a file in `public/letterbox/`, add a line there.
- **PDFs are blocked by his Internet Download Manager** — it intercepts
  `application/pdf` responses and hands back an empty 204, so the viewer shows
  "This document could not be opened" only on his machine. Verified the same
  bytes work at a non-PDF URL. Fix lives in IDM's settings, not the code.
- **A cosmetic Chrome** with real tabs, history and bookmarks. Behind its
  shortcuts: hand-built GitHub and LinkedIn profile snapshots, an About Me
  landing page, and the Unitwise and RBI Sentinel project pages.
- **Two games.** Time Attack (`components/win7/racer/`) is a real driving game
  — Canvas 2D, no libraries, two laps against the clock with a ghost of your
  personal best and a global top five. The car is a bicycle model with tyre
  slip and a friction circle, so drifting is earned rather than faked. **The
  front/rear grip split is structural, not taste** — one shared coefficient
  makes the car spin from a steady steering input. Ping Pong
  (`components/win7/pingpong/`) is the breakout arcade game.
- **The global leaderboard is done** (2026-08-28): one Upstash Redis sorted set
  behind `app/api/scores/route.ts`, hit with plain fetch — no client library.
  The route rejects times outside 45s–10min; that is the only cheat check. Real
  proof would mean re-simulating the run server-side. The board silently falls
  back to an empty board when the store is unreachable.

## Project rules

- **Assets go in `public/letterbox/`.** He drops files there, I wire them up.
- **Words go in `content/`.** Never in a component.
- **`--px` is one Windows-7 pixel, fixed at `1px`.** Write OS measurements as
  their real Win7 values (taskbar is `calc(40 * var(--px))`). It is fixed on
  purpose: a bigger screen should show *more desktop*, not a scaled-up UI,
  exactly like a real monitor at a higher resolution. He chose this.
- **Frame sizes key off `vmin`, never `vw`.** `--bezel` and `--chin` on `.crt`
  in `app/globals.css`. A percentage of *width* turns into a giant slab of
  plastic on an ultrawide — that's the bug `vmin` exists to prevent.
- **Verify at more than one screen shape.** Ultrawide, laptop, and tall/narrow
  at minimum. A change that looks right at one aspect routinely breaks another.
- **No bounce in window physics.** Fixed-duration easing only.
- **Window state lives in `store/windows.ts`**, not in components.
- **Keep it lean.** The repo was audited for over-engineering on 2026-08-28.
  Before adding a dependency, an abstraction, or a config knob, check that
  something actually calls it. One caller means inline it.
- Verify with Playwright screenshots before saying something is done.
- Only one dev server alive at a time. He watches compute spend — kill
  throwaway pages and extra servers as soon as they've done their job.
- **Git repo, worktrees.** Work happens in worktrees under
  `.claude/worktrees/`. Deletes are recoverable, so `rm` is fine on tracked
  files. Commit or push only when he asks.
- **No agent handoff docs in the repo.** HANDOFF.md, game.md and `docs/` were
  deleted in the 2026-08-28 tidy. Anything worth keeping goes in this file or
  in README.md; anything else goes in the session scratchpad.

## Still open

- Whether the CRT frame comes back on. It's one attribute either way.
- No mobile/small-screen design yet. There is a `mobile-website-setup` worktree
  under `.claude/worktrees/`; it is not working yet and main does not depend on
  it. Leave it alone unless he asks.
- Two animation libraries ship: `gsap` (the About Me page's mouse effects) and
  `motion` (three landing pages). Consolidating means rewriting
  `aboutme/MouseEffects.tsx`'s timelines, which is a design change — his call,
  not a tidy-up.
- `content/pages.ts` supports nesting a folder inside a folder (`Group` /
  `isGroup`). Nothing uses it. Kept on purpose so he can nest content later;
  cut it if that never happens.

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.
