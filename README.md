# Portfolio — Desktop OS

A personal portfolio styled as a desktop operating system. Visitors land on a
desktop and open folders to browse content.

```bash
npm run dev
```

## Where things live

| Path | What it is |
| --- | --- |
| `lib/desktop-items.tsx` | **The content.** One array entry per desktop icon. |
| `lib/palette.ts` | Sherbet palette hexes, mirrored from `@theme` in `app/globals.css`. |
| `store/windows.ts` | Window manager — positions, sizes, z-order, open/close. |
| `components/WindowFrame.tsx` | Window chrome + react-rnd drag/resize wiring. |
| `components/icons/doodles.ts` | Doodle icon geometry, on a 64×64 grid. |
| `components/RoughShapes.tsx` | Turns that geometry into rough.js SVG paths. |
| `components/BootSequence.tsx` | The boot-up screen. |

## Adding a folder

Append to `desktopItems` in `lib/desktop-items.tsx`:

```tsx
{
  id: "writing",             // must be unique — it's the window key
  title: "Writing",
  icon: "page",              // a key from components/icons/doodles.ts
  window: { width: 500, height: 420 },
  content: <YourContent />,
}
```

Nothing else needs to change — the icon grid, window manager, and title bars all
read from this array. The grid fills top-to-bottom and wraps into a second
column after six items.

## Adding a doodle icon

Add a named entry to `doodles` in `components/icons/doodles.ts`. Shapes are
`circle`, `ellipse`, `rect`, `line`, `polygon`, `curve`, or raw SVG `path`,
drawn on a 64×64 grid and rendered back-to-front. rough.js supplies the
hand-drawn wobble, so keep the underlying geometry blunt.

## Notes

- **No minimize/maximize and no dock** — deliberate for v1. Window state is
  centralised in `store/windows.ts` specifically so a dock can read from it
  later without reworking the window components.
- **Motion**: windows use fixed-duration easing, never springs — no bounce in
  window physics. The only spring is the icon hover flourish.
- **`suppressHydrationWarning` on rough.js paths** is intentional: rough's
  curve math drifts in the last float digits between Node and the browser, so
  the server and client produce slightly different (equally valid) wobble.
