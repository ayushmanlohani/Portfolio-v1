# HANDOFF

Short status log for new sessions. Keep entries terse; full context lives in
git history and CLAUDE.md, not here. Prune old entries once superseded.

## Where things stand (2026-08-21)

Windows 7 desktop redesign is the live design (CRT frame concept still in
CSS but toggled off — see CLAUDE.md "Decisions already made").

**Desktop / window chrome**
- Real Win7 Explorer windows, inline rename, marquee multi-select, permanent
  (recoverable-via-git) delete, working Start menu.
- Taskbar has notification tray, pinning, and apps: Calculator, Notepad
  (saves real desktop files), Windows Media Player, Photo Viewer, and a
  read-only PDF viewer (pdf.js).
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
- Projects — folders only; RBI Sentinel and Unitwise each have a project
  page with a GitHub source button; Unitwise also has a hovering tech stack
  and a "Problem" section. Also two design-experiment folders that open as
  plain chrome-only windows instead of file listings: Creative (a custom
  dither-cursor effect) and Clouds (Aceternity UI's WebGL cloud shader) —
  these two exist only on the CREATIVE worktree/branch, not yet merged.
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
- Taskbar: no clock, no pinned-apps beyond the current set — deferred.
- Whether the CRT frame comes back on (`data-frame` toggle) — his call.
- No mobile/small-screen layout yet.
- Creative and Clouds (see above) exist only on the CREATIVE branch —
  merge into main once approved.
