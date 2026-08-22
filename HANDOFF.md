# HANDOFF

Short status log for new sessions. Keep entries terse; full context lives in
git history and CLAUDE.md, not here. Prune old entries once superseded.
Newest entries at the top.

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
