"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { launchWindow } from "@/components/win7/apps";
import { node } from "@/components/win7/fs";
import { RecycleBinIcon } from "@/components/win7/icons";
import { RenameField } from "@/components/win7/RenameField";
import { useMarquee } from "@/components/win7/useMarquee";
import { type SortMode, useDesktopView } from "@/store/desktopView";
import { useFiles } from "@/store/files";
import { useFolders } from "@/store/folders";
import { useInlineEdit } from "@/store/inlineEdit";
import { useRecycleBin } from "@/store/recycleBin";

/**
 * Desktop icons, draggable on an invisible grid.
 *
 * Windows snaps icons to a fixed grid and fills it column-major — top to
 * bottom, then across. Same here: drag an icon anywhere and it lands in the
 * nearest cell; if that cell is taken it spirals outwards to the closest free
 * one, so two icons can never stack.
 *
 * Double-click (or Enter, when one is selected) opens the folder —
 * Windows' own default, rather than single-click-to-open. Delete sends the
 * selected folder to the Recycle Bin; the bin itself can't be deleted.
 *
 * Positions are in-memory only. Reloading restores the default arrangement,
 * which is deliberate for a portfolio — every visitor gets the intended
 * layout. Persisting to localStorage would be a few lines if that changes.
 */

type Cell = { c: number; r: number };
type Layout = Record<string, Cell>;

/** Pixels the pointer must travel before a click becomes a drag. */
const DRAG_THRESHOLD = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** The order the six content folders appear in Ayushman's own resume. */
const CV_ORDER = ["about", "education", "experience", "projects", "contact", "resume"];

/**
 * A stand-in for file size, since nothing on this desktop has a real one.
 *
 * A Notepad file's size is its actual text — the one item here with real
 * bytes to count. Everything else is a place rather than a document, so its
 * "size" is how much it holds: a folder with more inside it sorts as bigger,
 * the same intuition real Explorer gives a folder even though it never
 * actually shows one a byte count.
 */
function sizeOf(id: string): number {
  const item = node(id);
  if (!item) return 0;
  if (item.kind === "file") return useFiles.getState().read(id)?.text.length ?? 0;
  return item.children?.length ?? 0;
}

/**
 * Size's own head of the line, biggest first — Ayushman's call on what
 * actually weighs the most, ahead of anything a child count could prove.
 * Time Attack is a real game, not a folder of text files, so it leads; the
 * rest of the desktop falls in behind by the ordinary size rule below.
 */
const SIZE_PRIORITY = ["racer", "chrome", "computer", "recycle", "contact", "about"];

/** Comparator for one Sort by mode. Ties fall back to name, same as Explorer
 *  breaking a Size or Type tie alphabetically rather than leaving it to
 *  chance. `order` gives every id still outside the CV a stable spot after
 *  the six folders, in whatever order they already sit on the desktop. */
function compareBy(mode: SortMode, order: readonly string[]): (a: string, b: string) => number {
  const label = (id: string) => node(id)?.label ?? "";
  const byName = (a: string, b: string) => label(a).localeCompare(label(b));

  if (mode === "name") return byName;
  if (mode === "size") {
    return (a, b) => {
      const pa = SIZE_PRIORITY.indexOf(a);
      const pb = SIZE_PRIORITY.indexOf(b);
      if (pa !== -1 || pb !== -1) {
        if (pa === -1) return 1;
        if (pb === -1) return -1;
        return pa - pb;
      }
      return sizeOf(a) - sizeOf(b) || byName(a, b);
    };
  }

  const rank = (id: string) => {
    const i = CV_ORDER.indexOf(id);
    return i === -1 ? CV_ORDER.length + order.indexOf(id) : i;
  };
  return (a, b) => rank(a) - rank(b);
}

/**
 * Where the icons sit when the page loads — Ayushman's own arrangement, taken
 * from a screenshot of how he'd dragged them, with My Computer added at the
 * head of the first column the way real Windows leads with it.
 *
 * Two full columns, five rows each, no gaps: My Computer leads, then the bin,
 * Chrome and the six content folders fill in around them.
 *
 *     c0          c1
 *   ┌───────────┬───────────┐
 * r0│ My Computer│ About Me  │
 * r1│ Recycle   │ Experience│
 * r2│ Chrome    │ Education │
 * r3│ Contact   │ Projects  │
 * r4│ Resume    │ Time Attack│
 *   └───────────┴───────────┘
 */
const DEFAULT_LAYOUT: Layout = {
  computer: { c: 0, r: 0 },
  about: { c: 1, r: 0 },
  recycle: { c: 0, r: 1 },
  experience: { c: 1, r: 1 },
  chrome: { c: 0, r: 2 },
  education: { c: 1, r: 2 },
  contact: { c: 0, r: 3 },
  projects: { c: 1, r: 3 },
  resume: { c: 0, r: 4 },
  // The one gap his arrangement left open, so nothing else has to move.
  racer: { c: 1, r: 4 },
};

/** How many rows the arrangement above needs to fit. */
const DEFAULT_ROWS = Math.max(...Object.values(DEFAULT_LAYOUT).map((cell) => cell.r)) + 1;

/**
 * Effective cell for every icon: an explicit position if the user has moved it,
 * otherwise its default slot. Derived rather than stored, so only icons that
 * were actually dragged are pinned.
 *
 * A window too short for the arrangement falls back to Windows' own
 * column-major fill — top to bottom, then across — which fits any height. It's
 * all-or-nothing on purpose: letting only the icons that don't fit fall back
 * would drop them on top of the ones that do.
 *
 * Anything left over after those two — a New Folder, a saved file, or (when
 * the window's too short) every icon — doesn't get a slot computed from its
 * own index. That ignored whatever the user had actually dragged elsewhere,
 * so a new folder could land straight on top of a moved icon. Instead it
 * scans the grid the way Windows fills a desktop, top to bottom then across,
 * and takes the first cell nothing else already claimed.
 */
function computeCells(moved: Layout, rows: number, items: readonly string[]): Layout {
  const cells: Layout = {};
  const fits = rows >= DEFAULT_ROWS;
  const taken = new Set<string>();
  const pending: string[] = [];

  // Every icon keeps its default slot whether or not it is currently on the
  // desktop, so deleting one does not shuffle the ones below it up a row.
  // DEFAULT_LAYOUT only names the eight fixed items — a file Notepad just
  // saved isn't in it, so it goes to `pending` like everything does when the
  // window's too short for the named arrangement.
  items.forEach((id) => {
    const explicit = moved[id] ?? (fits ? DEFAULT_LAYOUT[id] : undefined);
    if (explicit) {
      cells[id] = explicit;
      taken.add(`${explicit.c},${explicit.r}`);
    } else {
      pending.push(id);
    }
  });

  let c = 0;
  let r = 0;
  const nextFreeCell = (): Cell => {
    while (taken.has(`${c},${r}`)) {
      r++;
      if (r >= rows) {
        r = 0;
        c++;
      }
    }
    return { c, r };
  };

  pending.forEach((id) => {
    const cell = nextFreeCell();
    cells[id] = cell;
    taken.add(`${cell.c},${cell.r}`);
  });

  return cells;
}

export function DesktopIcons() {
  const rootRef = useRef<HTMLDivElement>(null);
  const deleted = useRecycleBin((s) => s.deleted);
  // A saved file or a New Folder joins the desktop the moment it's created
  // by pushing its id onto the `desktop` node's own `children` — these two
  // stores exist only so components have something to subscribe to for the
  // re-render; the actual list comes from the tree.
  useFiles((s) => s.files);
  useFolders((s) => s.folders);
  // Everything the desktop can show, in slot order. Declared here rather than
  // at render because the drag handlers below need the same list.
  const items = node("desktop")?.children ?? [];
  const remove = useRecycleBin((s) => s.remove);
  const binEmpty = deleted.length === 0;
  // A set, not a single id: the marquee below can pick up several at once.
  const [selected, setSelected] = useState<string[]>([]);
  const { band, startBand } = useMarquee(rootRef, ".desktop-icon", selected, setSelected);
  const editingId = useInlineEdit((s) => s.editingId);
  const warning = useInlineEdit((s) => s.warning);
  const commitRename = useInlineEdit((s) => s.commit);
  const cancelRename = useInlineEdit((s) => s.cancel);
  const [layout, setLayout] = useState<Layout>({});
  // `measured` guards the default layout: laying icons out before the real
  // row count is known packs them into a single row instead of a column.
  const [grid, setGrid] = useState({ w: 80, h: 92, cols: 1, rows: 1, measured: false });

  const iconSize = useDesktopView((s) => s.iconSize);
  const autoArrange = useDesktopView((s) => s.autoArrange);
  const alignToGrid = useDesktopView((s) => s.alignToGrid);
  const showIcons = useDesktopView((s) => s.showIcons);
  const sortRequest = useDesktopView((s) => s.sortRequest);
  const clearSortRequest = useDesktopView((s) => s.clearSortRequest);
  // Pixel positions used only while Align to grid is off — an icon's spot the
  // moment it goes freeform. Keyed the same as `layout`, but in raw pixels
  // rather than cells, since that's the whole point of turning grid snap off.
  const [freePos, setFreePos] = useState<Record<string, { x: number; y: number }>>({});

  // Drag state lives in a ref so pointermove doesn't re-render on every frame;
  // only `dragging` (which moves the element) is state.
  const drag = useRef<{
    id: string;
    /** Everything picked up with it — the selection, when it was selected. */
    ids: string[];
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  // `ids` is everything being carried; `primary` is the one under the pointer,
  // which is what the drop position is measured from.
  const [dragging, setDragging] = useState<{
    primary: string;
    ids: string[];
    dx: number;
    dy: number;
  } | null>(null);

  /** Reads the cell size straight off the CSS so the two can't drift apart. */
  const measure = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;

    const cs = getComputedStyle(root);
    const w = parseFloat(cs.getPropertyValue("--cell-w")) || 80;
    const h = parseFloat(cs.getPropertyValue("--cell-h")) || 92;
    const box = root.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) return;

    // The last row only needs room for the ICON, not for a whole cell — a cell
    // is taller than the icon it holds. Counting whole cells silently threw
    // away a usable row of desktop that still looked free.
    const iconH = root.querySelector(".desktop-icon")?.getBoundingClientRect().height ?? h;

    // Keep the original 80×92 distance for every row, but open the last
    // visual strip: +1 row beyond the strict fit so the bottom gap becomes a
    // real snap target instead of a dead zone that snaps back (the screenshot).
    setGrid({
      w,
      h,
      cols: Math.max(1, Math.floor((box.width - w) / w) + 1),
      rows: Math.max(1, Math.floor((box.height - iconH) / h) + 2),
      measured: true,
    });
  }, []);

  useLayoutEffect(() => {
    measure();
    const root = rootRef.current;
    if (!root) return;
    const ro = new ResizeObserver(measure);
    ro.observe(root);
    return () => ro.disconnect();
  }, [measure]);

  // Large/Small icons change --cell-w/--cell-h without changing the root's
  // own box size, so the ResizeObserver above never fires for them — this
  // re-measures on exactly the one thing it misses.
  useLayoutEffect(() => {
    measure();
  }, [iconSize, measure]);

  // Auto Arrange means there is no custom layout any more — every icon goes
  // back to its default slot the instant it's switched on, same as real
  // Windows snapping the desktop back into order.
  useEffect(() => {
    if (autoArrange) setLayout({});
  }, [autoArrange]);

  // A New Folder (or a file Notepad just saved) isn't in DEFAULT_LAYOUT, so
  // `computeCells` gives it the first free cell through its fallback scan —
  // but that fallback is recomputed fresh on every render, not stored. Left
  // alone, deleting or moving some OTHER icon frees up an earlier cell and
  // the new folder silently drifts into it on the next render, which reads
  // as it teleporting itself. This pins that first-computed cell into
  // `layout` the moment it appears, exactly as if the user had dragged it
  // there themselves — after which it only moves if they actually drag it.
  useEffect(() => {
    if (!grid.measured || autoArrange) return;
    const unpinned = items.filter((id) => !layout[id] && !DEFAULT_LAYOUT[id]);
    if (unpinned.length === 0) return;

    setLayout((moved) => {
      const cells = computeCells(moved, grid.rows, items);
      const next = { ...moved };
      for (const id of unpinned) next[id] = cells[id];
      return next;
    });
  }, [items, layout, grid.measured, grid.rows, autoArrange]);

  // Turning Align to grid back on captures wherever freeform dragging left
  // every icon and settles each one into the nearest cell, same collision
  // avoidance a normal drop uses so two icons can't land on top of each
  // other. Freeform positions are then cleared — the next time grid snap
  // comes off, icons start from where they actually are now, not from
  // wherever they were the last time freeform was in use.
  useEffect(() => {
    if (!alignToGrid || Object.keys(freePos).length === 0) return;

    setLayout((moved) => {
      const cellsNow = computeCells(moved, grid.rows, items);
      const settled: Layout = { ...cellsNow };
      const next = { ...moved };

      for (const [gid, pos] of Object.entries(freePos)) {
        const want = {
          c: clamp(Math.round(pos.x / grid.w), 0, grid.cols - 1),
          r: clamp(Math.round(pos.y / grid.h), 0, grid.rows - 1),
        };
        delete settled[gid];
        const cell = freeCellNear(want, new Set(), settled);
        settled[gid] = cell;
        next[gid] = cell;
      }
      return next;
    });
    setFreePos({});
    // Only the on/off edge should fire this — it reads grid/items/freePos as
    // of the render where alignToGrid flips, not on every change to them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alignToGrid]);

  // Sort by: a one-off reflow into a fresh column-major grid, not a mode
  // that sticks — dragging an icon afterward moves it same as always. Clears
  // any freeform positions too, since a sort is only visible as a grid.
  useEffect(() => {
    if (!sortRequest) return;

    const onDesktopNow = items.filter((id) => !deleted.includes(id));
    const sorted = [...onDesktopNow].sort(compareBy(sortRequest.mode, onDesktopNow));

    setLayout(() => {
      const next: Layout = {};
      sorted.forEach((id, i) => {
        next[id] = { c: Math.floor(i / grid.rows), r: i % grid.rows };
      });
      return next;
    });
    setFreePos({});
    clearSortRequest();
    // The nonce inside sortRequest is what makes choosing the same mode
    // twice in a row still fire this — not a dependency on everything it
    // closes over (items/deleted/grid.rows as of the render it landed on).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortRequest]);

  // Clicking bare desktop clears the selection, same as Windows.
  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setSelected([]);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  /**
   * Delete sends the whole selection to the bin.
   *
   * Listens on the document rather than on the icons: a marquee drag captures
   * the pointer on the container, so afterwards no icon button holds focus and
   * a key handler bound to one would never fire. An empty selection is also
   * the guard that keeps this from firing while a window has the user's
   * attention — clicking into one clears the desktop selection.
   */
  useEffect(() => {
    if (selected.length === 0) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete") return;

      // The console has a real text input; Delete belongs to it there.
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return;

      const going = selected.filter((id) => node(id)?.deletable);
      if (going.length === 0) return;

      e.preventDefault();
      setSelected([]);
      going.forEach(remove);
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected, remove]);

  /**
   * Nearest free cell to `want`, searching outwards in rings. Returns `want`
   * itself when it's empty or already belongs to the icon being moved.
   */
  const freeCellNear = useCallback(
    (want: Cell, ignore: ReadonlySet<string>, current: Layout): Cell => {
      // A set rather than one id: a group drag moves several at once, and none
      // of them should be treated as blocking the others.
      const taken = new Set(
        Object.entries(current)
          .filter(([id]) => !ignore.has(id))
          .map(([, cell]) => `${cell.c},${cell.r}`),
      );

      const fits = (c: number, r: number) =>
        c >= 0 && r >= 0 && c < grid.cols && r < grid.rows && !taken.has(`${c},${r}`);

      if (fits(want.c, want.r)) return want;

      for (let ring = 1; ring <= grid.cols + grid.rows; ring++) {
        for (let dc = -ring; dc <= ring; dc++) {
          for (let dr = -ring; dr <= ring; dr++) {
            // Only the perimeter of this ring — the inside was already checked.
            if (Math.max(Math.abs(dc), Math.abs(dr)) !== ring) continue;
            const c = want.c + dc;
            const r = want.r + dr;
            if (fits(c, r)) return { c, r };
          }
        }
      }
      return want;
    },
    [grid.cols, grid.rows],
  );

  /**
   * Picking an icon up.
   *
   * Movement is tracked on `window`, not through pointer capture on the
   * button. Capture is the tidier-looking option and it is what this used to
   * do, but it silently stopped engaging after a marquee drag, leaving the
   * press dead. Window listeners have no such failure mode, they end the drag
   * even when the release lands outside the page, and they match how the
   * rubber band above already works.
   */
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>, id: string) => {
    if (e.button !== 0) return;
    // Auto Arrange locks the layout — there is nothing to pick up.
    if (autoArrange) return;

    const additive = e.ctrlKey || e.metaKey;
    const group = additive
      ? [id]
      : // Grabbing one of several selected icons carries all of them; grabbing
        // an unselected one drops the old selection and takes just that.
        selected.includes(id)
        ? selected
        : [id];

    setSelected((prev) => {
      if (additive) {
        return prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id];
      }
      return prev.includes(id) ? prev : [id];
    });

    const d = { id, ids: group, startX: e.clientX, startY: e.clientY, active: false };
    drag.current = d;

    const move = (ev: PointerEvent) => {
      // A release the page never saw — outside the window, or taken over by
      // the browser. Without this the icons stay stuck to the pointer.
      if (ev.buttons === 0) {
        finish(ev.clientX, ev.clientY);
        return;
      }

      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (!d.active && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;

      d.active = true;
      setDragging({ primary: d.id, ids: d.ids, dx, dy });
    };

    const finish = (clientX: number, clientY: number) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onCancel);
      window.removeEventListener("blur", onCancel);

      drag.current = null;
      setDragging(null);
      if (!d.active) return;

      drop(d, clientX - d.startX, clientY - d.startY);
    };

    const onUp = (ev: PointerEvent) => finish(ev.clientX, ev.clientY);
    const onCancel = () => finish(d.startX, d.startY);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    window.addEventListener("blur", onCancel);
  };

  /** An icon's rendered pixel position — its freeform spot when there is one
   *  and grid snap is off, its grid cell converted to pixels otherwise. Both
   *  rendering and hit-testing (the bin, freeform's own drop) read this, so
   *  what's drawn is exactly what a drop will act on. */
  const effectivePos = (id: string, cellsNow: Layout): { x: number; y: number } => {
    if (!autoArrange && !alignToGrid) {
      const free = freePos[id];
      if (free) return free;
    }
    const cell = cellsNow[id];
    return { x: cell.c * grid.w, y: cell.r * grid.h };
  };

  /** Freeform counterpart to `drop` below, used while Align to grid is off:
   *  no snapping, no collision avoidance — pixel for pixel, the way an
   *  unaligned Windows desktop actually behaves. The bin is still a real
   *  target, tested by proximity rather than by sharing a cell. */
  const dropFree = (d: { id: string; ids: string[] }, dx: number, dy: number) => {
    const box = rootRef.current?.getBoundingClientRect();
    const maxX = box ? Math.max(0, box.width - grid.w) : Infinity;
    const maxY = box ? Math.max(0, box.height - grid.h) : Infinity;
    const cellsNow = computeCells(layout, grid.rows, items);
    const clampToDesktop = (p: { x: number; y: number }) => ({
      x: clamp(p.x + dx, 0, maxX),
      y: clamp(p.y + dy, 0, maxY),
    });

    const group = new Set(d.ids);
    if (!group.has("recycle")) {
      const primary = clampToDesktop(effectivePos(d.id, cellsNow));
      const bin = effectivePos("recycle", cellsNow);
      const onBin = Math.abs(primary.x - bin.x) < grid.w * 0.6 && Math.abs(primary.y - bin.y) < grid.h * 0.6;
      if (onBin) {
        const going = d.ids.filter((gid) => node(gid)?.deletable);
        if (going.length > 0) {
          setSelected([]);
          going.forEach(remove);
          return;
        }
      }
    }

    setFreePos((prev) => {
      const next = { ...prev };
      for (const gid of d.ids) next[gid] = clampToDesktop(prev[gid] ?? effectivePos(gid, cellsNow));
      return next;
    });
  };

  /** Where the whole group lands. */
  const drop = (d: { id: string; ids: string[] }, dx: number, dy: number) => {
    if (!alignToGrid) {
      dropFree(d, dx, dy);
      return;
    }

    const cellsNow = computeCells(layout, grid.rows, items);
    const want = dropCell(d.id, dx, dy, cellsNow);
    const bin = cellsNow.recycle;
    const group = new Set(d.ids);

    // Dropped on the bin: delete instead of moving. Each icon keeps the cell it
    // came from, so restoring puts it back exactly where it was. Dragging the
    // bin onto itself is not a delete, hence the group check.
    if (!group.has("recycle") && want.c === bin.c && want.r === bin.r) {
      const going = d.ids.filter((gid) => node(gid)?.deletable);
      if (going.length > 0) {
        setSelected([]);
        going.forEach(remove);
        return;
      }
    }

    setLayout((moved) => {
      const cells = computeCells(moved, grid.rows, items);
      // One delta for the whole group, taken from the icon actually under the
      // pointer, so the arrangement they were in survives the move.
      const target = dropCell(d.id, dx, dy, cells);
      const dc = target.c - cells[d.id].c;
      const dr = target.r - cells[d.id].r;

      // Lift the group out first: while they are in the air they must not be
      // treated as blocking each other.
      const settled: Layout = { ...cells };
      for (const gid of group) delete settled[gid];

      // Nothing is ignored from here on. `settled` already has the group lifted
      // out, and each one is written back as it lands — so a member that has
      // already settled DOES block the next one. Passing the group here instead
      // made them invisible to each other, and two icons stacked in one cell.
      const NOTHING: ReadonlySet<string> = new Set();

      const next = { ...moved };
      // The dragged icon lands first; it is the one aimed at a cell.
      for (const gid of [d.id, ...d.ids.filter((g) => g !== d.id)]) {
        const from = cells[gid];
        const cell = freeCellNear(
          {
            c: clamp(from.c + dc, 0, grid.cols - 1),
            r: clamp(from.r + dr, 0, grid.rows - 1),
          },
          NOTHING,
          settled,
        );
        settled[gid] = cell;
        next[gid] = cell;
      }
      return next;
    });
  };


  /**
   * Where a drag would land, in grid cells. The drop test and the bin's
   * highlight both read this, so what lights up is exactly what will happen.
   */
  const dropCell = (id: string, dx: number, dy: number, cells: Layout) => {
    const from = cells[id];
    // Clamp into the grid BEFORE anything else. Without this, a drag past the
    // bottom edge lands out of bounds, the ring search treats it as blocked,
    // and the icon jumps somewhere unrelated — so dragging down felt like the
    // last row simply refused to accept it.
    return {
      c: clamp(Math.round(from.c + dx / grid.w), 0, grid.cols - 1),
      r: clamp(Math.round(from.r + dy / grid.h), 0, grid.rows - 1),
    };
  };

  // `launchWindow` already knows every id's title and opening size, folder or
  // program, so the desktop doesn't keep a second copy of that table.
  const openItem = useCallback(
    (id: string) => {
      // Enter on a multi-selection opens everything, not just the focused icon
      if (selected.includes(id) && selected.length > 1) {
        selected.forEach((sid) => launchWindow(sid));
        return;
      }
      launchWindow(id);
    },
    [selected],
  );

  const cells = computeCells(layout, grid.rows, items);
  const onDesktop = items.filter((id) => !deleted.includes(id));

  // True while a deletable folder is being dragged over the bin. Computed from
  // the same hit test the drop itself uses (grid cell match when aligned,
  // pixel proximity when freeform), so the highlight cannot promise
  // something the release then doesn't do.
  const overBin =
    !!dragging &&
    !dragging.ids.includes("recycle") &&
    dragging.ids.some((gid) => node(gid)?.deletable) &&
    (alignToGrid
      ? (() => {
          const want = dropCell(dragging.primary, dragging.dx, dragging.dy, cells);
          return want.c === cells.recycle.c && want.r === cells.recycle.r;
        })()
      : (() => {
          const base = effectivePos(dragging.primary, cells);
          const bin = effectivePos("recycle", cells);
          const x = base.x + dragging.dx;
          const y = base.y + dragging.dy;
          return Math.abs(x - bin.x) < grid.w * 0.6 && Math.abs(y - bin.y) < grid.h * 0.6;
        })());

  return (
    <div
      className="desktop-icons"
      data-size={iconSize === "medium" ? undefined : iconSize}
      data-hidden={showIcons ? undefined : "1"}
      ref={rootRef}
      onPointerDown={startBand}
    >
      {band && (
        <div
          className="desktop-band"
          style={{
            left: Math.min(band.x0, band.x1) - band.left,
            top: Math.min(band.y0, band.y1) - band.top,
            width: Math.abs(band.x1 - band.x0),
            height: Math.abs(band.y1 - band.y0),
          }}
        />
      )}

      {onDesktop.map((id) => {
        const item = node(id);
        if (!item) return null;

        const pos = effectivePos(id, cells);
        const isDragging = !!dragging?.ids.includes(id);
        const isBin = id === "recycle";

        return (
          <button
            key={id}
            type="button"
            className="desktop-icon"
            data-node-id={id}
            data-selected={selected.includes(id) || undefined}
            data-dragging={isDragging || undefined}
            // Lights up while a folder is being dragged over it.
            data-drop={isBin && overBin ? "true" : undefined}
            style={{
              transform: `translate(${pos.x + (isDragging ? dragging!.dx : 0)}px, ${
                pos.y + (isDragging ? dragging!.dy : 0)
              }px)`,
            }}
            // The browser will happily start a native HTML5 drag from an icon
            // (its label is text, its glyph is an SVG), and the moment it does
            // it fires pointercancel and the real drag dies mid-gesture. This
            // is why dragging worked until a marquee had been used: the band
            // left the labels text-selected, and dragging selected text is
            // exactly what triggers it.
            draggable={false}
            onDragStart={(e) => e.preventDefault()}
            onPointerDown={(e) => onPointerDown(e, id)}
            onDoubleClick={() => openItem(id)}
            onKeyDown={(e) => {
              if (e.key === "Enter") openItem(id);
              // Windows deletes the selected icon on Delete. Nothing is ever
              // destroyed here — see store/recycleBin.ts.
              // Delete is handled on the document — see the effect above.
            }}
          >
            {isBin ? (
              <RecycleBinIcon className="di-icon" full={!binEmpty} />
            ) : (
              <item.Icon className="di-icon" />
            )}
            {editingId === id ? (
              <RenameField id={id} label={item.label} onCommit={commitRename} onCancel={cancelRename} />
            ) : (
              <span className="di-label">{item.label}</span>
            )}
            {/* `warning.id` is the desktop icon's own id for a rename
                collision here, but it's the *parent folder's* id for New
                Folder's limit warning raised from inside an Explorer window
                — and one of the six content folders can be both at once
                (Education is a desktop icon AND a valid New Folder parent),
                so this only lights up for the collision that's actually
                its own. */}
            {warning?.id === id && warning.kind === "rename" && (
              <div className="win7-warn">{warning.text}</div>
            )}
          </button>
        );
      })}
    </div>
  );
}
