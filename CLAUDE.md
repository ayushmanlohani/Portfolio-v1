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

## Decisions already made

*(2026-08-19: the Sherbet/pastel design was scrapped wholesale. Everything below
is the Windows 7 redesign. Old files are in the session scratchpad, not the repo.)*

- **The concept:** a beige CRT monitor; inside the glass is Windows 7. Chose
  the chunky beige CRT over a black LCD and a black CRT.
- **The CRT frame is currently OFF.** `Monitor.tsx` renders `data-frame="off"`,
  which zeroes `--bezel` and `--chin` — Windows runs edge to edge and no
  plastic, MULTISYNC or LED is on screen. The whole CRT is still in the CSS;
  flipping that one attribute to `"on"` brings it back. Read the CRT notes
  below as *how the frame works*, not as what's visible right now.
- **The monitor fills the viewport. No stand, no fixed aspect ratio.** The
  glass takes the *viewer's* screen shape, so an ultrawide gets a wide desktop
  and a laptop gets a laptop-shaped one. This was a deliberate reversal of the
  original 4:3 idea — he wants it to adapt to whoever's visiting, not to his
  own PC. Nothing gaps at the sides or clips at the bottom because there is
  nothing left over to place.
- **Bottom edge stays deeper than the other three** so MULTISYNC and the green
  power LED survive. Asked and answered — don't make it uniform.
- **Wallpaper fills and crops** (`cover`, centred), like Windows' own "Fill".
- **Wallpaper:** the real Win7 "Harmony" blue-sky image he supplied,
  `public/letterbox/Z0Ts3J2-windows-7-official-wallpapers.jpg`.
- **Font:** Segoe UI, Win7's own system font — already installed on Windows, so
  no webfont. Montserrat is gone. Tahoma is the period-correct fallback.
- **Taskbar:** Aero bar, Start orb, a working Start menu, and a button per open
  window. Still no tray, no clock, no pinned apps — deferred on purpose.
- **Six desktop folders** — About Me, Projects, Experience, Education, Resume,
  Contact — plus a Recycle Bin. Each opens a real Win7 Explorer window.
  **Only About Me has content**; the other five read "This folder is empty."

- **Three media apps** (2026-08-21, Start menu updated 2026-08-21): Windows
  Media Player (video, real transport controls, opens on an empty Music
  library like real WMP — Organize ▸ Manage libraries reaches the videos),
  Windows Photo Viewer (pictures, the pill toolbar), and a read-only PDF
  viewer built on pdf.js. WMP and Resume (PDF) launch from the Start menu;
  Photo Viewer does not — like real Windows, it has no launcher entry and is
  only what a picture opens in. Every PNG lives in a real **Pictures** folder
  (desktop's Start ▸ Pictures, and C:\Pictures), each tile its own thumbnail;
  double-clicking one opens Photo Viewer. `components/win7/media.ts` is the
  library index — drop a file in `public/letterbox/`, add a line there.
- **PDFs are blocked by his Internet Download Manager.** IDM's browser
  integration intercepts anything served as `application/pdf` and hands the
  page a 204 with no body, so the viewer shows "This document could not be
  opened" on his machine while working everywhere else. Verified: the same
  bytes at a non-PDF URL render fine. The fix is in IDM's file-type list, not
  in the code.

## Project rules

- **Assets go in `public/letterbox/`.** He drops files there, I wire them up.
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
- Verify with Playwright screenshots before saying something is done.
- Only one dev server alive at a time. He watches compute spend — kill
  throwaway pages and extra servers as soon as they've done their job.

## Still open

- Taskbar contents — deliberately deferred, needs a conversation.
- **What goes inside the five empty folders.** Chrome is done, content panes
  are not. His call — three directions were already rejected, so don't propose
  more unprompted.
- Whether the CRT frame comes back on. It's one attribute either way.
- No mobile/small-screen design yet.
- **It is a git repo now** (`main` + feature branches, work in worktrees under
  `.claude/worktrees/`). Deletes are recoverable, so `rm` is fine on tracked
  files. Commit or push only when he asks.
