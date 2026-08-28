# Portfolio — Windows 7

Ayushman Lohani's portfolio, built as a Windows 7 desktop. You sign in, you get
a wallpaper and six folders, and everything you'd reach for is there: Explorer,
Notepad, a calculator, Chrome, Media Player, a Control Panel, and two games.

```bash
npm install
npm run dev     # localhost:3000
```

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4. State is Zustand,
windows are `react-rnd`, animation is `motion` and `gsap`, and the PDF viewer is
`pdfjs-dist`. Nothing else.

## Where things live

| Path | What it is |
| --- | --- |
| `content/` | **The words.** Plain data files, no components. Edit these. |
| `public/letterbox/` | **The assets.** Drop a file here, wire it up in code. |
| `components/win7/fs.ts` | The file tree — one map of what contains what. |
| `components/win7/apps.ts` | Every non-folder window: its id, size and title. |
| `store/windows.ts` | The window manager — positions, z-order, pinning. |
| `app/globals.css` | The whole Windows 7 skin, in one stylesheet. |
| `app/api/scores/route.ts` | Time Attack's global board, on Upstash Redis. |

The rest of `components/win7/` is one directory per application. `racer/` and
`pingpong/` are the two games; `chrome/`, `clouds/`, `sentinel/`, `aboutme/`,
`github/` and `linkedin/` are the pages the fake browser can reach.

## Editing content

Every folder's contents are in `content/`, and each file says at the top how to
edit it. Roles go in `content/experience.ts`, qualifications in
`content/education.ts`, everything else in `content/folders.ts`. Links are
written `[the words](the address)`; an address of `#` renders bold instead, so
a page never carries a link that goes nowhere.

## Adding an image or a video

Drop it in `public/letterbox/` and add a line to `components/win7/media.ts`.
It then appears in Media Player's library (videos) or the Pictures folder
(images), each with its own window.

## Notes

- **`--px` is one Windows 7 pixel, fixed at `1px`.** OS measurements are written
  at their real Win7 values — the taskbar is `calc(40 * var(--px))`. A bigger
  screen shows *more desktop*, not a scaled-up UI, like a real monitor at a
  higher resolution.
- **The CRT frame is off.** `Monitor.tsx` renders `data-frame="off"`, which
  zeroes the bezel and chin so Windows runs edge to edge. The whole beige CRT is
  still in the CSS; flipping that one attribute brings it back.
- **No bounce in window physics** — fixed-duration easing only.
- **Nothing persists.** Icon positions, the Recycle Bin, files you save in
  Notepad: all in memory, all gone on reload. This is a portfolio, not storage.
  The two exceptions are Time Attack's personal best and graphics settings,
  which are in `localStorage`, and its global board, which is in Redis.
- **`localhost:3000/?debug=1`** shows window size, pixel ratio, image size and a
  crosshair on true centre. Measure with it before changing a layout value.
