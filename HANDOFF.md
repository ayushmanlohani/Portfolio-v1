# HANDOFF

Short status log for new sessions. Keep entries terse; full context lives in
git history and CLAUDE.md, not here. Prune old entries once superseded.

## Where things stand (2026-08-21)

Windows 7 desktop redesign is the live design (CRT frame concept still in
CSS but toggled off — see CLAUDE.md "Decisions already made").

**Desktop / window chrome**
- Real Win7 Explorer windows, inline rename, marquee multi-select, permanent
  (recoverable-via-git) delete, working Start menu.
- Taskbar has notification tray, pinning, and three apps: Calculator,
  Notepad (saves real desktop files), and Google Chrome, dressed as it
  looked circa 2011 — trapezoid tabs, a wrench menu, Aero glass. Has its own
  desktop icon and Start menu entry, same as any installed program.
- Folder listings use Large Icons view; default icon arrangement is set.
- Marquee/blue selection box only fires on left-click drag (past bug fixed).

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
  and ICSE); University of Lucknow and NCIC crest logos added.
- Resume — real resume page (not a stub).
- Contact — page done.
- Recycle Bin — present, no special content.

## Still open
- Taskbar: no clock, no pinned-apps beyond current two — deferred.
- Whether the CRT frame comes back on (`data-frame` toggle) — his call.
- No mobile/small-screen layout yet.
