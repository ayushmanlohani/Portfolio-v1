# HANDOFF

Short status log for new sessions. Keep entries terse; full context lives in
git history and CLAUDE.md, not here. Prune old entries once superseded.
Newest entries at the top.

## Chase camera (2026-08-23)

Time Attack is now third person — behind and above the car, Smash-Karts style
— instead of top-down. **Only `render.ts` changed.** Physics, track, session
rules and the leaderboard never learned the view moved.

**Why there is no 3D library.** Every surface in this game is on one plane
(z = 0). A chase view over a single plane is one pinhole projection plus near-
plane clipping, which is a few dozen lines in `render.ts` — a 3D engine would
have sat almost entirely unused. World space is unchanged: x/y are still the
ground in metres, exactly as the physics writes them.

**The sign convention everything rests on:** canvas y points down, so an
increasing heading turns the car clockwise on screen and the driver's right
hand points along +y. That is why the camera's right vector is
`(-sin yaw, cos yaw)`. Get that backwards and the world mirrors.

**Camera lags, deliberately.** `trackCameraYaw` eases toward the car's heading
over ~0.17 s rather than locking to it. Locked, the world snaps sideways the
instant the rear steps out — ugly, and disorienting exactly when the road most
needs reading. Lagged, a drift shows you your own car at an angle. It is eased
by WALL time, not sim time, so it keeps gliding while paused.

**Skid marks had to change model.** They used to be painted onto an offscreen
canvas and blitted in one call. That cannot survive a chase camera: laying a
texture onto a receding plane is a *projective* transform and Canvas2D only
offers affine ones. Marks are now world-space quads in a 1400-entry ring
buffer, laid every 3rd physics step (every step fills the ring in ~6 s), with
intensity carried as WIDTH not opacity — that keeps them all on one path at
one alpha, so a thousand marks cost a single fill.

**Batching is what makes it fast.** Every polygon of a given colour goes into
one path and is filled once. Benchmarked on the real canvas: the worst-case
load (~2500 quads) costs **2.4 ms** against a 16.7 ms frame budget. Everything
is culled by world distance before it is ever projected — see the `*_RANGE`
constants.

**Not verified:** real frame rate. Headless Chromium does not composite, so
rAF is pinned at 1 Hz there and the game runs in slow motion — fine for
checking geometry and state, useless for fps. The 2.4 ms figure above is a
synchronous canvas benchmark, which is the part that does hold.

## Desktop icons stacked in the corner on short windows (2026-08-23)

Pre-existing bug, found while testing the game, fixed in `DesktopIcons.tsx`.

`cells[id] = moved[id] ?? (fits && DEFAULT_LAYOUT[id]) ?? {column-major}`

`??` only falls through on null/undefined — **not** on `false`. So whenever
`fits` was false (any desktop too short for the 5-row arrangement) every icon
got `false` for its cell, `cell.c` was undefined, and the transform came out
`translate(NaNpx, NaNpx)`: the entire desktop piled up at the top-left. Now a
ternary yielding `undefined`, so the column-major fallback actually runs.
Triggers below roughly 480px of desktop height, which is why it had not been
seen at the usual review size.

## Time Attack, the racing game (2026-08-23)

A real driving game in a Win7 window. `components/win7/racer/`, five files,
no new dependencies, plain canvas 2D.

**What it is**
- Top-down time attack. 2 laps of a 695 m circuit, one clock, a ghost car
  replaying your personal best, and a scoreboard.
- Arrows/WASD, Space handbrake, R restart, Esc pause. Keys are only claimed
  while the window has focus and a race is running, so they never leak to the
  desktop or steal Space from the name field.

**The physics is real, and the numbers matter**
- Bicycle model in SI units: per-axle slip angles, cornering stiffness,
  friction circle, weight transfer. Drifting is not a mode — it falls out of
  the rear axle running out of grip. Countersteer works for the same reason.
- `MU_FRONT` 1.5 / `MU_REAR` 1.66, and the asymmetry is **load-bearing**.
  With one shared coefficient, `a*Fzf` and `b*Fzr` are exactly equal, the yaw
  moment at full saturation is identically zero, and the car spins from a
  steady steering input at 60 km/h. Do not "simplify" those to one constant.
- `YAW_DAMP` only exists below 6 m/s, where dividing by forward speed stops
  describing anything real. It cannot affect racing speeds.
- Verified headlessly: step-steer settles (front slip 8.4 deg vs rear 4.0 =
  stable understeer), handbrake gives 22 deg of drift and countersteer
  recovers to 0, AI laps at ~29 s with no spins.

**Timing is simulated time, never the wall clock**
Fixed 120 Hz steps; the clock is the number of steps taken. Same lap time on
60 Hz and 144 Hz, and a dropped frame costs the player nothing. The flip side:
a slow machine plays in slow motion for the same recorded time. Irrelevant
for a local board; a **global** board would need the server to reject runs
where sim time and wall time diverge.

**Anti-cut** Progress comes from projecting onto the centre line, clamped to
what the car could physically have covered, plus five ordered gates. Teleporting
the car across the infield gains 0.27 m. Grass drops grip to ~0.38.

**The leaderboard is a seam, not a database.** `leaderboard.ts` exports one
interface with four async methods and a localStorage implementation behind it.
Going global = write another object with those methods and change the last
line. The three medal rows are shipped *target times*, deliberately rendered
as medals so they are never mistaken for someone's lap.

**Wiring** — the id `racer` threads the usual five files (`apps.ts`,
`WindowLayer`, `Taskbar`, `StartMenu`, `fs.ts`) plus `DesktopIcons` and
`icons.tsx`. The Start menu's Games entry was inert and now opens it. The
desktop icon sits at c1/r4 — the one gap his arrangement already had, so
nothing moved.

**Sized 880x520** so it opens whole on his 1252x585 review viewport, where the
desktop is only 545 tall. Verified there end to end: race, finish, submit,
board, ghost.

## Personalization window (2026-08-22)

The desktop right-click menu's **Personalize** now opens a working Control
Panel page (`components/win7/Personalize.tsx`).

**What it is**
- Explorer chrome minus tree/command bar: dead back/forward, address bar
  reading just "Personalization" beside its logo (no breadcrumb trail — his
  call), search box. Heading: "Change the wallpaper on your computer".
- Two galleries of **placeholder tiles**: Static Wallpaper (6) and Live
  Wallpaper (4). Tiles are gradients standing in for wallpapers he will drop
  into `public/letterbox/`. Clicking moves the blue selection ring only —
  nothing re-skins the desktop yet.
- A foot row of Desktop Background/Window Color/Sounds/Screen Saver links
  existed and was **removed on request**; do not rebuild it unasked.

**Wiring map** (the id `personalize` threads through five files)
- `ContextMenu.tsx` — `"personalize"` action fires `launchWindow(PERSONALIZE_ID)`
  *before* its `!target` guard (bare desktop has no target).
- `apps.ts` — id, size (820×600), title, launch case. Deliberately NOT in
  `CAPTION_ICONS`: Personalize keeps the centred folder-style caption.
- `WindowLayer.tsx` renders `<Personalize />`; `Taskbar.tsx` maps its button
  icon; `icons.tsx` has `PersonalizeIcon`; styles are the `.cp-*` block at
  the end of `app/globals.css`.

**Caption/layout facts learned here**
- `.w7-caption-buttons` is vertically centred now (`top: 50%` +
  `translateY(-50%)`) — global change, all windows.
- Icon-carrying windows (WMP) keep left-aligned icon+title via
  `.w7-window:has(.w7-caption-icon)` rules; anything given a CAPTION_ICONS
  entry gets that treatment, which is why Personalize was excluded.
- `.cp` must carry the dark ink (`color: #1a1a1a`) the same way `.ex` does,
  or inherited-colour text disappears against the white bars.
- His viewport during review: 1252×585 — short; verify layouts there too.

**Verification recipe for this machine** (dev server already lives on
`:3200`, don't start another)
- Playwright isn't a repo dependency. Run scripts with:
  `$env:NODE_PATH = "<npx cache>\9833c18b2d85bc59\node_modules;<npx cache>\e41f203b7505f1fb\node_modules"`
  and launch chromium via
  `executablePath: ...\ms-playwright\chromium-1234\chrome-win64\chrome.exe`.
- The session model can't read images — assert on DOM/computed styles, and
  leave screenshots for HIM to open, never claim visual sign-off.

## Where things stand (2026-08-21)

Windows 7 desktop redesign is the live design (CRT frame concept still in
CSS but toggled off — see CLAUDE.md "Decisions already made").

**Desktop / window chrome**
- Real Win7 Explorer windows, inline rename, marquee multi-select, permanent
  (recoverable-via-git) delete, working Start menu.
- Taskbar has notification tray, pinning, and apps: Calculator, Notepad
  (saves real desktop files), Windows Media Player, Photo Viewer, a
  read-only PDF viewer (pdf.js), and Google Chrome, dressed as it looked
  circa 2011 — trapezoid tabs, a wrench menu, Aero glass. Chrome has its
  own desktop icon and Start menu entry, same as any installed program.
- PDF Viewer is its own Start-menu app now (opens empty, like WMP opens on
  an empty Music library) instead of a "Resume (PDF)" shortcut. PDF links
  are clickable — blue overlay boxes over pdf.js's canvas, tracking zoom.
- Pictures is a real folder (Start > Pictures, C:\Pictures) — thumbnail
  tiles that open Photo Viewer on double-click, same as real Windows.
- Folder listings use Large Icons view; default icon arrangement is set.
- Marquee/blue selection box only fires on left-click drag (past bug fixed).
- Explorer panes no longer show a phantom scrollbar on short pages.

**Content per folder**
- About Me — has content.
- Projects — RBI Sentinel and Unitwise each have a project page with a
  GitHub source button; Unitwise also has a hovering tech stack and a
  "Problem" section. `unitwise.interactive` sits alongside them as a
  document, not a folder — double-clicking it opens Chrome already on a
  from-scratch rebuild of the Unitwise marketing page (`components/win7/
  clouds/`), reachable the same way from Chrome's own new-tab bookmarks.
  Chrome's tabs live in `store/chrome.ts`, not component state, so either
  entry point reaches the same running browser.
- Experience — three role folders; Research Assistant has dates.
- Education — three folders (Nirmala Convent merged into one, holding ISC
  and ICSE); University of Lucknow and NCIC crest logos added, sized up,
  one-line taglines.
- Resume — folder holds the real PDF now (the old prose page is gone);
  double-click opens the PDF viewer with clickable links and a red
  download button.
- Contact — two rows: email (display-only, no mailto) and LinkedIn (real
  link).
- Recycle Bin — present, no special content.

## Still open
- **Personalize next step:** when he supplies wallpapers into
  `public/letterbox/`, wire them into the Static Wallpaper tiles and make a
  tile's selection actually swap the desktop background (page.tsx owns the
  current hardcoded `WALLPAPER` — that needs to become state). Live Wallpaper
  tiles are meant to end up video-based (`wallpaper-*.mp4` already in
  letterbox).
- Taskbar: no clock, no pinned-apps beyond the current set — deferred.
- Whether the CRT frame comes back on (`data-frame` toggle) — his call.
- No mobile/small-screen layout yet.
- A third Projects tile, Creative (a custom dither-cursor canvas), exists
  only on the CREATIVE worktree/branch — held back on request, not yet
  merged.
