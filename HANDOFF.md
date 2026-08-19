# Handoff — portfolio ("Windows 7 in a CRT")

Snapshot for starting a fresh session. Read this + [CLAUDE.md](CLAUDE.md) first —
CLAUDE.md is *how* to work with Ayushman, this doc is *where the project is*.

## Run it

```bash
npm run dev
```
`localhost:3000`. Not a git repo — no version control, so deletes are permanent.

## What this is

A portfolio styled as a beige CRT monitor standing in a dark room, with
Windows 7 running inside the glass.

**2026-08-19: the previous design was scrapped.** It was a pastel "Sherbet"
desktop with doodle icons, a video wallpaper of an island house, a Times New
Roman wordmark and a `/tune` positioning tool. All of that is gone — moved to
the session scratchpad, not deleted from disk, but not in the repo either.
Don't reintroduce any of it.

## Current visible state

- **Monitor**: beige CRT filling the whole viewport — putty plastic, curved
  glass (barrel vignette + specular streak + scanlines), deeper bottom edge
  carrying MULTISYNC and a green power LED. **No stand, no fixed aspect
  ratio.**
- **Screen**: whatever shape the viewer's window is, minus the frame. Win7
  "Harmony" wallpaper set to fill and crop. Nothing else on it.
- **Desktop icons**: six folders — About Me, Projects, Experience, Education,
  Resume, Contact. All use the same folder icon. Draggable on an invisible
  92×80 grid with collision avoidance, clamped to bounds (fixed a bug where
  dragging past the bottom edge bounced icons to the wrong cell instead of
  the last row). Bottom row now uses the taskbar height, not a whole extra
  cell. Double-clicking one opens it.
- **Folder windows**: every folder opens the same **Windows 7 Explorer
  chrome** — back/forward, breadcrumb address bar, search box, the command
  bar (Organize / Include in library / Share with / Burn / New folder), the
  navigation tree (Favorites, Computer, Network — Libraries and Burn were
  both removed on request) and a details pane at the foot. Draggable,
  resizable, minimise/maximise/close, cascading on open. Tree groups collapse,
  back and forward work.
- **Navigation is real.** `components/win7/fs.ts` is the single file tree, read
  by the desktop, the tree, the address bar, the listings and the window
  caption. Desktop holds the six folders plus the Recycle Bin; C:\ holds
  Desktop and Downloads; folders open on double-click from any listing. **The
  caption follows where you are** — walk from About Me to Desktop and the
  title bar, taskbar button, breadcrumb and search box all say Desktop
  (`setTitle` on the window store, called from an effect in Explorer).
- **Recycle Bin**: on the desktop, drawn as SVG (Microsoft's own icon can't
  ship). Three ways to delete — select and press Delete, right-click > Delete,
  or **drag the folder onto the bin** (the bin highlights on hover, from the
  same `dropCell()` the drop itself uses). The bin's icon switches to the full
  variant, paper above the rim; the first version drew that paper *below* the
  rim line at y=8.5, so it was painted over and the bin looked empty when it
  wasn't. **Nothing can be permanently destroyed**: `store/recycleBin.ts` has
  no empty(). Inside the bin, right-click > **Restore** puts a folder back in
  the exact grid slot it left, because deleted icons keep their slot rather
  than reflowing — same as Windows. A reload also restores everything.
- **Marquee selection**: drag on bare desktop and the Win7 rubber band picks
  up every icon it touches, live as you drag. Ctrl adds to a selection;
  clicking bare desktop clears it. **A selection drags in formation** — grab
  any selected icon and the whole group moves by one shared delta, keeping its
  arrangement; drop it on the bin and all of them go.

  Three traps here, all of them cost real time once:
  1. Icon drags run on **window listeners, not pointer capture**. Capture
     silently stopped engaging after a marquee and the press went dead.
  2. `.desktop-icons` sets `user-select: none` and the icons are
     `draggable={false}`. Without it the band drags a *text selection* across
     the labels, and pressing an icon afterwards starts a native HTML5 file
     drag — which fires **pointercancel** and kills the real drag one frame in.
     This was the actual cause of "only the clicked icon moves".
  3. When placing a group, members must block **each other**: the ignore-set
     passed to `freeCellNear` has to be empty, because the working map already
     has the group lifted out and re-adds each one as it lands. Passing the
     group made them invisible to each other and stacked two icons in one cell.
  Both drags also bail on `ev.buttons === 0` and on `pointercancel`, so a
  release the page never sees can't leave the band painted or icons glued to
  the pointer. **Delete is bound on the document**, not on
  the icons — a marquee captures the pointer on the container, so afterwards
  no icon button holds focus and a handler bound to one silently never fires.
  It skips INPUT/TEXTAREA so the console keeps its own Delete, and an empty
  selection is the guard that keeps it quiet while a window has focus.
- **Right-click menu is target-aware.** Bare desktop gets the Win7 desktop menu
  (Gadgets removed on request). A folder gets Open / Delete / greyed-out
  extras; the same folder inside the bin gets Restore instead. It works on
  desktop icons and on folder rows alike because both tag themselves
  `data-node-id`, and `data-in-bin` when drawn inside the bin — the menu never
  needs to know either component exists.
- **Network** shows one line: Status / Connected, live off `navigator.onLine`.
  It was briefly a six-row panel of speed and latency estimates; he cut it
  back to this. **SSID and carrier are impossible** — no browser exposes the
  network name to a page on any platform, so don't offer to add it.
- **Local Disk (C:)** opens: 69.00 GB total, 2.00 GB free, so the capacity bar
  goes red — Windows' own rule is red under 10% free. Both numbers come from
  one `DRIVE` constant in `Explorer.tsx`.
- **Right-click menu**: real Win7 desktop context menu — View/Sort by/
  Refresh/Paste (greyed)/Paste shortcut (greyed)/New/Screen resolution/
  Gadgets/Personalize — replaces Chrome's inside the screen, flips inside
  near edges. Refresh repaints icons without rearranging them. Submenus (▸)
  don't open yet.
- **About Me has content**: his name centred in **Libre Bodoni** 50px over a
  short masthead rule, then three paragraphs in **Public Sans**. Both come from
  `next/font/google` in `app/layout.tsx`, self-hosted at build — no runtime
  request to Google, no layout shift. He chose this pairing off a five-way
  Lavish mockup; the other four were Space Mono/IBM Plex Sans, Poiret
  One/Didact Gothic, Yeseva One/Lora, Josefin Sans/Karla.
  **Only the name is centred**; body copy stays left-aligned on a measured
  column. Historia Sky is gone — he called it shitty, and the woff2 moved to
  the scratchpad.

  **The words live in `content/about.ts`.** Plain strings, no JSX, no HTML
  entities — that file exists so he can fix copy without opening a component.
  Links are written `[words](address)`; an address of `#` renders bold instead
  of as an anchor, so the page never ships a dead link. Unitwise and RBI
  Sentinel are both `#` until he supplies URLs.
- **Command Prompt**: opens from the Start menu, captioned "Ayush". Prints a
  cmd-shaped banner, takes a line, keeps scrollback, blinking block caret,
  up/down recalls history. **No commands exist yet** — anything typed gets
  cmd's own "is not recognized" reply. `run()` in `Terminal.tsx` is the seam:
  a command is a case in that function and nothing else.
- **Taskbar**: Aero glass bar with a Start orb and a working Start menu
  (About Me pinned, stock Win7 shortcuts, Shut down). Menu runs at 90% scale.
  Rest of the bar still empty — no tray, no clock, no pinned apps.
- **Fonts**: Segoe UI for all OS chrome (system, no webfont). Libre Bodoni and
  Public Sans for the About pane only, via `next/font`.

## Key files

| File | What it is |
|---|---|
| `app/globals.css` | Everything visual. Room, CRT, glass, taskbar, orb. |
| `app/page.tsx` | Composes Monitor → wallpaper → Taskbar. Where icons will go. |
| `components/Monitor.tsx` | The CRT plastic. Children render into the glass. |
| `components/Taskbar.tsx` | Bar, Start orb, open/close state for the menu. |
| `components/win7/StartMenu.tsx` | The Start menu. Placeholder items. |
| **`components/win7/fs.ts`** | **The file tree — what contains what. One source for everything.** |
| `components/win7/Explorer.tsx` | The folder window: tree, listings, navigation, details pane. |
| `components/win7/Network.tsx` | The Network place. Real connection readings. |
| `store/recycleBin.ts` | Which nodes are deleted. In memory; a reload undoes everything. |
| **`content/about.ts`** | **The About Me words. Edit this to fix copy — plain text, no JSX.** |
| `components/win7/folders/About.tsx` | Renders About Me and turns `[words](url)` into links. |
| `components/win7/Terminal.tsx` | The Command Prompt. `run()` is where commands go. |
| `components/win7/apps.ts` | Ids/titles/sizes for windows that aren't folders. |
| `components/win7/DesktopIcons.tsx` | Desktop folders + the drag-to-grid logic. |
| `components/win7/DesktopSurface.tsx` | Wraps icons + context menu, owns Refresh. |
| `components/win7/ContextMenu.tsx` | The Win7 right-click menu. |
| `components/win7/icons.tsx` | Hand-drawn Aero-style SVG icons. Not Microsoft's. |
| `components/DebugOverlay.tsx` | `?debug=1` — window size, pixel ratio, centre crosshair. |
| `store/windows.ts` | Window manager state — open/focus/minimise/maximise/cascade. |
| `public/letterbox/` | Where Ayushman drops assets. |

## The three sizing variables

All defined on `.crt` in `app/globals.css`:

- **`--bezel`** — frame thickness on top/left/right, `clamp(14px, 3.4vmin, 56px)`.
- **`--chin`** — the deeper bottom edge, `clamp(38px, 8vmin, 124px)`.
- **`--px`** — one Windows-7 pixel, **fixed at `1px`**. `--os-px` is the true
  value; `--px` is what components read, so one panel can scale itself by
  overriding `--px` against `--os-px`. The Start menu does exactly this to run
  at 90% without changing a single measurement of its own.

Two rules that matter:

1. **Frame sizes use `vmin`, never `vw`.** `vmin` is the smaller viewport side.
   A percentage of width becomes a giant slab of plastic on an ultrawide.
2. **`--px` is fixed on purpose.** A bigger screen shows *more desktop*, not a
   scaled-up UI — same as a real monitor at higher resolution. So the taskbar
   is literally Win7's 40px. Never hardcode a px value inside the screen; write
   the real Win7 number times `--px`.

There is no aspect-ratio anywhere. The glass fills the padding box, so its
shape is the viewer's screen shape. This is what removed every gap-and-clip
problem the earlier fixed-ratio version had.

## Assets in `public/letterbox/`

- `Z0Ts3J2-windows-7-official-wallpapers.jpg` — the Win7 wallpaper, in use.
- `pngs/` — eight cut-out stickers (Coke can, skull, badge, Charminar,
  Mustang, kitten, headphone cat, POW). Left over from the scrapped collage.
  **Unused.**
- `wallpaper-4k.mp4`, `wallpaper-1440.mp4`, `wallpaper-poster.jpg`,
  `wallpaper.jpg` — from the old island-house design. **Unused.** Delete when
  he confirms he doesn't want them back.

## Debugging pattern established (see CLAUDE.md for the full rule)

He reports visual problems from *feel*, often via screenshot, and doesn't know
CSS. Measure before touching code; check cache and browser zoom first. Twice the
cause turned out not to be the code at all — once a stale cached image, once a
font weight he mistook for a font family.

## Open / not yet decided

- **Taskbar contents** — deferred deliberately, needs a conversation.
- **What goes INSIDE a folder** — the window and its chrome exist; the content
  pane is empty on purpose. Three directions have now been rejected: an
  editorial magazine set (Vogue/Tom Ford/GQ/Gentlewoman/i-D), and a
  free-canvas sticker collage that got built, arranged by hand, and scrapped
  on sight. Plain Win7 Explorer is where he landed, and he asked for it by
  name. **Don't propose more directions unprompted** — the next move is his
  call on content.
- **Scrapped, in the session scratchpad** (`scrapped-canvas/`): the whole
  `components/win7/canvas/` tree, a drag-and-drop arranger page, and the
  route handler that saved its layout. Recoverable, not in the repo.
- **Icon positions don't persist** across reloads, by choice. localStorage
  would be a few lines if he asks.
- **Wallpaper on extreme shapes** — fills and crops, so an ultrawide loses a
  lot of sky and the logo drifts off-centre on very narrow windows. He picked
  this over letterboxing; revisit only if it bothers him.
- **Window chrome** — the old pastel `WindowFrame` was deleted rather than
  restyled. Aero windows get written fresh with the first folder.
- No mobile/small-screen fallback. Explicitly deferred again on 2026-08-19 —
  on a phone this becomes a very tall skinny monitor. It doesn't break, it's
  just wrong.
- Not a git repo. Worth asking, don't set it up unprompted.

## Stack

Next.js 16 (App Router, Turbopack) + Tailwind v4 + zustand. `motion` and
`react-rnd` are installed but currently unused — they come back with windows.
`roughjs` and `server-only` were removed with the old design. No test suite;
verification is Playwright screenshots each session.
