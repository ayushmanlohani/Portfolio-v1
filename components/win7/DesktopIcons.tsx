"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { launchWindow } from "@/components/win7/apps";
import { DESKTOP_FOLDERS, node } from "@/components/win7/fs";
import { RecycleBinIcon } from "@/components/win7/icons";
import { RenameField } from "@/components/win7/RenameField";
import { useMarquee } from "@/components/win7/useMarquee";
import { useFiles } from "@/store/files";
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

/* What sits on the desktop, from the shared tree — the same list Explorer
   shows inside the Desktop folder. Chrome is a program rather than a place,
   the one installed app with a desktop shortcut. The bin goes last, where
   Windows keeps it, and anything Notepad has saved lands after it. */
const FIXED_ITEMS = [...DESKTOP_FOLDERS, "chrome", "recycle"];

type Cell = { c: number; r: number };
type Layout = Record<string, Cell>;

/** Pixels the pointer must travel before a click becomes a drag. */
const DRAG_THRESHOLD = 4;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Where the icons sit when the page loads — Ayushman's own arrangement, taken
 * from a screenshot of how he'd dragged them.
 *
 * Two columns. The bin and Resume share the top row, About Me and Contact the
 * next, and the remaining three run down the first column. Cells are adjacent;
 * there are no gaps.
 *
 *     c0          c1
 *   ┌───────────┬───────────┐
 * r0│ Recycle   │ Resume    │
 * r1│ About Me  │ Contact   │
 * r2│ Experience│ Chrome    │
 * r3│ Projects  │           │
 * r4│ Education │           │
 *   └───────────┴───────────┘
 */
const DEFAULT_LAYOUT: Layout = {
  recycle: { c: 0, r: 0 },
  resume: { c: 1, r: 0 },
  about: { c: 0, r: 1 },
  contact: { c: 1, r: 1 },
  experience: { c: 0, r: 2 },
  chrome: { c: 1, r: 2 },
  projects: { c: 0, r: 3 },
  education: { c: 0, r: 4 },
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
 */
function computeCells(moved: Layout, rows: number, items: readonly string[]): Layout {
  const cells: Layout = {};
  const fits = rows >= DEFAULT_ROWS;

  // Every icon keeps its default slot whether or not it is currently on the
  // desktop, so deleting one does not shuffle the ones below it up a row.
  // DEFAULT_LAYOUT only names the eight fixed items — a file Notepad just
  // saved isn't in it, so it falls through to the column-major position like
  // everything does when the window's too short for the named arrangement.
  items.forEach((id, i) => {
    cells[id] =
      moved[id] ??
      (fits && DEFAULT_LAYOUT[id]) ??
      { c: Math.floor(i / rows), r: i % rows };
  });
  return cells;
}

export function DesktopIcons() {
  const rootRef = useRef<HTMLDivElement>(null);
  const deleted = useRecycleBin((s) => s.deleted);
  // Saved text files join the desktop the moment Notepad writes one. The store
  // is what makes this re-render; the file itself lives in the shared tree.
  const files = useFiles((s) => s.files);
  // Everything the desktop can show, in slot order. Declared here rather than
  // at render because the drag handlers below need the same list.
  const items = [...FIXED_ITEMS, ...files.map((f) => f.id)];
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

    setGrid({
      w,
      h,
      cols: Math.max(1, Math.floor((box.width - w) / w) + 1),
      rows: Math.max(1, Math.floor((box.height - iconH) / h) + 1),
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

  /** Where the whole group lands. */
  const drop = (d: { id: string; ids: string[] }, dx: number, dy: number) => {
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
  const openItem = useCallback((id: string) => launchWindow(id), []);

  const cells = computeCells(layout, grid.rows, items);
  const onDesktop = items.filter((id) => !deleted.includes(id));

  // True while a deletable folder is being dragged over the bin. Computed from
  // the same dropCell() the drop uses, so the highlight cannot promise
  // something the release then doesn't do.
  const overBin =
    !!dragging &&
    !dragging.ids.includes("recycle") &&
    dragging.ids.some((gid) => node(gid)?.deletable) &&
    (() => {
      const want = dropCell(dragging.primary, dragging.dx, dragging.dy, cells);
      return want.c === cells.recycle.c && want.r === cells.recycle.r;
    })();

  return (
    <div className="desktop-icons" ref={rootRef} onPointerDown={startBand}>
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

        const cell = cells[id];
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
              transform: `translate(${cell.c * grid.w + (isDragging ? dragging!.dx : 0)}px, ${
                cell.r * grid.h + (isDragging ? dragging!.dy : 0)
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
            {warning?.id === id && <div className="win7-warn">{warning.text}</div>}
          </button>
        );
      })}
    </div>
  );
}
