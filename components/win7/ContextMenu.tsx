"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { type FsNode, node, unregisterFile } from "@/components/win7/fs";
import { launchWindow, PERSONALIZE_ID } from "@/components/win7/apps";
import { CloseIcon, PinIcon } from "@/components/win7/icons";
import { type IconSize, type SortMode, useDesktopView } from "@/store/desktopView";
import { useFiles } from "@/store/files";
import { useFolders } from "@/store/folders";
import { useInlineEdit } from "@/store/inlineEdit";
import { useRecycleBin } from "@/store/recycleBin";
import { useWindowStore } from "@/store/windows";

/**
 * The Windows 7 right-click menu.
 *
 * Two menus behind one listener, chosen by what was actually clicked — same as
 * Windows, where right-clicking a folder and right-clicking bare desktop give
 * different things.
 *
 * A folder gets Open, **Delete** and **Rename**. Rename only ever lights up
 * for a Notepad file — the six content folders keep the name their content
 * file gives them. Rename doesn't open a dialog: it hands off to
 * `store/inlineEdit.ts`, which turns the item's own label into a text box —
 * same as real Windows. The same item seen inside the Recycle Bin gets
 * **Restore** and, for a file or a folder New Folder made, a permanent
 * **Delete** behind a confirm dialog — the six content folders are the one
 * thing that can never go all the way, since there's no path from "in the
 * bin" to "gone" for them, only Restore. Permanent Delete covers the whole
 * selection — select a handful of items and it destroys every file or
 * created folder among them, leaving the six content folders to be restored
 * — and its dialog never names them, it just asks for confirmation.
 *
 * Restoring a file whose old name collides with one already on the Desktop
 * doesn't rename anything for you — it refuses and raises the same balloon
 * warning `inlineEdit.ts` uses for a rename collision, every time it's tried,
 * until the item in the bin gets a new name from an explicit Rename.
 *
 * Anything that wants an item menu tags itself `data-node-id`, and adds
 * `data-in-bin` when it is drawn inside the bin. Desktop icons and folder rows
 * both do, which is why the menu works in both places without knowing either
 * of them exists.
 *
 * A **taskbar button** tags itself `data-task-id` and gets the jump-list menu
 * instead: pin or unpin, and close if the window is actually running. It is
 * handled here rather than in a second menu component because two listeners
 * on the same document would both fire and open two menus at once.
 */

type Entry =
  | { kind: "sep" }
  | {
      kind: "item";
      label: string;
      submenu?: boolean;
      /** The two submenus this menu actually opens — View's icon-size and
          arrangement options, and Sort by's reflow actions. "New" is still
          just the arrow, unwired. */
      opens?: "view" | "sort";
      disabled?: boolean;
      action?: Action;
      /** Jump-list rows carry an icon; desktop rows don't. */
      icon?: React.ReactNode;
    };

/** One row of the View submenu — a size to pick, or a plain on/off toggle. */
type ViewEntry =
  | { kind: "sep" }
  | { kind: "radio"; label: string; active: boolean; onSelect: () => void }
  | { kind: "check"; label: string; active: boolean; disabled?: boolean; onToggle: () => void };

/** One row of the Sort by submenu — a plain action, not a mode that sticks. */
type SortEntry = { label: string; onSelect: () => void };

type Action =
  | "refresh"
  | "delete"
  | "restore"
  | "rename"
  | "destroy"
  | "open"
  | "pin"
  | "unpin"
  | "close"
  | "personalize";

/** Bare desktop. Gadgets was removed on request. */
const DESKTOP_ENTRIES: Entry[] = [
  { kind: "item", label: "View", submenu: true, opens: "view" },
  { kind: "item", label: "Sort by", submenu: true, opens: "sort" },
  { kind: "item", label: "Refresh", action: "refresh" },
  { kind: "sep" },
  { kind: "item", label: "Paste", disabled: true },
  { kind: "item", label: "Paste shortcut", disabled: true },
  { kind: "sep" },
  { kind: "item", label: "New", submenu: true },
  { kind: "sep" },
  { kind: "item", label: "Screen resolution" },
  { kind: "item", label: "Personalize", action: "personalize" },
];

/**
 * A Notepad file or a folder New Folder made can both be permanently
 * destroyed. The six content folders are `kind === "folder"` too, but they
 * aren't in `useFolders` — that's what tells them apart from anything New
 * Folder created, and it's the only thing standing between the bin and gone
 * for them.
 *
 * Rename lights up for the same two — checked against `useFolders` rather
 * than `deletable`, since the six content folders are deletable too but
 * keep the name their content file gives them.
 */
const itemEntries = (inBin: boolean, item: FsNode | undefined): Entry[] => {
  const deletable = !!item?.deletable;
  const isFile = item?.kind === "file";
  const isCreatedFolder = !!item && useFolders.getState().folders.some((f) => f.id === item.id);
  const canRename = isFile || isCreatedFolder;
  const canDestroy = isFile || isCreatedFolder;

  return inBin
    ? [
        { kind: "item", label: "Restore", action: "restore" },
        { kind: "sep" },
        // The bin can hold one of the six content folders (sent there by
        // mistake) as well as a file or a created folder — only the latter
        // two can go all the way and be destroyed.
        { kind: "item", label: "Delete", action: "destroy", disabled: !canDestroy },
        { kind: "item", label: "Cut", disabled: true },
        { kind: "item", label: "Properties", disabled: true },
      ]
    : [
        { kind: "item", label: "Open", action: "open" },
        { kind: "sep" },
        { kind: "item", label: "Cut", disabled: true },
        { kind: "item", label: "Copy", disabled: true },
        { kind: "sep" },
        // The Recycle Bin itself can't go in the Recycle Bin.
        { kind: "item", label: "Delete", action: "delete", disabled: !deletable },
        { kind: "item", label: "Rename", action: "rename", disabled: !canRename },
        { kind: "sep" },
        { kind: "item", label: "Properties", disabled: true },
      ];
};

/** Right-clicking a taskbar button gives the jump list; Windows drops
 *  "Close window" when there is no window open behind the button. */
const taskEntries = (pinned: boolean, running: boolean): Entry[] => [
  pinned
    ? { kind: "item", label: "Unpin from Taskbar", action: "unpin", icon: <PinIcon className="ctx-icon" /> }
    : { kind: "item", label: "Pin to Taskbar", action: "pin", icon: <PinIcon className="ctx-icon" /> },
  ...(running
    ? ([{ kind: "item", label: "Close window", action: "close", icon: <CloseIcon className="ctx-icon" /> }] as Entry[])
    : []),
];

type Target =
  | { kind: "node"; id: string; inBin: boolean; selection: string[] }
  | { kind: "task"; id: string; running: boolean }
  | null;

/** The one modal this menu still opens itself — the permanent-delete warning.
    It can cover a whole selection, so it carries the ids to destroy rather
    than a name: naming files is exactly what the user asked not to see.
    Rename and Restore no longer go through a dialog; see `store/inlineEdit.ts`. */
type ConfirmDialog = { ids: string[] };

/** Roughly the menu's rendered box, used to flip it away from screen edges. */
const MENU_W = 190;
const MENU_H = 264;
/** Height of one jump-list row — taller than a desktop row, it carries an icon. */
const TASK_ROW = 30;

export function DesktopContextMenu({
  onRefresh,
  onOpen,
}: {
  onRefresh?: () => void;
  onOpen?: (id: string) => void;
}) {
  const [at, setAt] = useState<{ x: number; y: number } | null>(null);
  const [target, setTarget] = useState<Target>(null);
  const [confirm, setConfirm] = useState<ConfirmDialog | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<"view" | "sort" | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const remove = useRecycleBin((s) => s.remove);
  const purge = useRecycleBin((s) => s.purge);
  const startRename = useInlineEdit((s) => s.start);
  const tryRestore = useInlineEdit((s) => s.tryRestore);
  const pinned = useWindowStore((s) => s.pinned);
  const pin = useWindowStore((s) => s.pin);
  const unpin = useWindowStore((s) => s.unpin);
  const closeWindow = useWindowStore((s) => s.close);

  const iconSize = useDesktopView((s) => s.iconSize);
  const setIconSize = useDesktopView((s) => s.setIconSize);
  const autoArrange = useDesktopView((s) => s.autoArrange);
  const toggleAutoArrange = useDesktopView((s) => s.toggleAutoArrange);
  const alignToGrid = useDesktopView((s) => s.alignToGrid);
  const toggleAlignToGrid = useDesktopView((s) => s.toggleAlignToGrid);
  const showIcons = useDesktopView((s) => s.showIcons);
  const toggleShowIcons = useDesktopView((s) => s.toggleShowIcons);
  const requestSort = useDesktopView((s) => s.requestSort);

  const close = useCallback(() => setAt(null), []);

  // A closed top-level menu shouldn't reopen with a submenu already expanded.
  useEffect(() => {
    if (!at) setOpenSubmenu(null);
  }, [at]);

  useEffect(() => {
    const onContextMenu = (e: MouseEvent) => {
      // Only inside the simulated screen; anything outside it isn't "desktop".
      const screen = document.querySelector(".win7");
      if (!screen?.contains(e.target as Node)) return;

      e.preventDefault();

      const el = e.target as HTMLElement;
      const task = el.closest<HTMLElement>("[data-task-id]");
      const hit = task ? null : el.closest<HTMLElement>("[data-node-id]");

      // Capture the selection for the surface the item lives in. The desktop
      // and each Explorer window keep their own, so scope it to the container
      // the right-clicked element came from (`.desktop-icons` or `.ex-tiles`).
      // Windows rule: a right-click on something that ISN'T in the selection
      // collapses the menu's target to just that one item.
      let selection: string[] = [];
      if (hit) {
        const scope = hit.closest<HTMLElement>(".ex-tiles, .desktop-icons");
        if (scope) {
          selection = [...scope.querySelectorAll<HTMLElement>("[data-node-id][data-selected]")]
            .map((n) => n.dataset.nodeId!)
            .filter(Boolean);
        }
      }
      const nodeId = hit?.dataset.nodeId;

      // Read the store directly: this listener is registered once, so a
      // captured `windows` value would be the one from first render forever.
      const running = task
        ? useWindowStore.getState().windows.some((w) => w.id === task.dataset.taskId)
        : false;

      setTarget(
        task
          ? { kind: "task", id: task.dataset.taskId!, running }
          : hit
            ? {
                kind: "node",
                id: nodeId!,
                inBin: hit.dataset.inBin === "true",
                selection: nodeId && selection.includes(nodeId) ? selection : nodeId ? [nodeId] : [],
              }
            : null,
      );

      // Windows opens the menu at the cursor, and flips it back inside when
      // there isn't room to the right or below. The jump list is only ever a
      // row or two, so it gets its own height rather than the desktop menu's
      // — reusing that one would fling it far up the screen.
      const height = task ? (running ? 2 : 1) * TASK_ROW + 8 : MENU_H;
      const box = screen.getBoundingClientRect();
      const x = e.clientX + MENU_W > box.right ? e.clientX - MENU_W : e.clientX;
      const y = e.clientY + height > box.bottom ? e.clientY - height : e.clientY;
      setAt({ x: Math.max(0, x), y: Math.max(0, y) });
    };

    document.addEventListener("contextmenu", onContextMenu);
    return () => document.removeEventListener("contextmenu", onContextMenu);
  }, []);

  useEffect(() => {
    if (!at) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [at, close]);

  // The menu closes the instant an action is picked (see `run` below), so by
  // the time the confirm dialog is showing `at` is already null — this needs
  // its own Escape handler rather than reusing the one above.
  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setConfirm(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [confirm]);

  if (!at && !confirm) return null;

  const entries =
    target?.kind === "task"
      ? taskEntries(pinned.includes(target.id), target.running)
      : target
        ? itemEntries(target.inBin, node(target.id))
        : DESKTOP_ENTRIES;

  const sizeLabel = (size: IconSize) => `${size[0].toUpperCase()}${size.slice(1)} icons`;
  const viewEntries: ViewEntry[] = [
    ...(["large", "medium", "small"] as const).map(
      (size): ViewEntry => ({
        kind: "radio",
        label: sizeLabel(size),
        active: iconSize === size,
        onSelect: () => setIconSize(size),
      }),
    ),
    { kind: "sep" },
    { kind: "check", label: "Auto arrange icons", active: autoArrange, onToggle: toggleAutoArrange },
    // Auto Arrange makes grid alignment automatic and non-optional, same as
    // real Windows greying this row out the moment the one above is checked.
    {
      kind: "check",
      label: "Align icons to grid",
      active: alignToGrid || autoArrange,
      disabled: autoArrange,
      onToggle: toggleAlignToGrid,
    },
    { kind: "check", label: "Show desktop icons", active: showIcons, onToggle: toggleShowIcons },
  ];

  const sortLabel: Record<SortMode, string> = { name: "Name", size: "Size", cv: "CV order" };
  const sortEntries: SortEntry[] = (["name", "size", "cv"] as const).map((mode) => ({
    label: sortLabel[mode],
    onSelect: () => requestSort(mode),
  }));

  const run = (action?: Action) => {
    if (!action) return;
    // Both bare-desktop actions fire with `target` null, so they run before
    // the guard below rather than behind it.
    if (action === "refresh") onRefresh?.();
    if (action === "personalize") {
      launchWindow(PERSONALIZE_ID);
      return;
    }
    if (!target) return;

    if (action === "open") onOpen?.(target.id);
    if (action === "delete" && target.kind === "node") {
      // Delete moves the whole selection to the bin — a selected folder goes
      // too, but only the deletable items can. Like Windows, a right-click on
      // something outside the selection already collapsed `target.selection`
      // to just that item, so an unselected single right-click still deletes
      // one thing.
      target.selection.filter((sid) => node(sid)?.deletable).forEach(remove);
    }
    if (action === "rename") startRename(target.id);
    if (action === "restore" && target.kind === "node") {
      target.selection.forEach(tryRestore);
    }

    // Permanent delete works on the whole selection. Only the six content
    // folders in the bin are un-destroyable, so a mixed selection deletes
    // every file and created folder and spares only those.
    if (action === "destroy" && target.kind === "node") {
      const createdFolderIds = useFolders.getState().folders.map((f) => f.id);
      const ids = target.selection.filter(
        (sid) => node(sid)?.kind === "file" || createdFolderIds.includes(sid),
      );
      if (ids.length > 0) setConfirm({ ids });
    }

    if (action === "pin") pin(target.id);
    if (action === "unpin") unpin(target.id);
    if (action === "close") closeWindow(target.id);
  };

  return (
    <>
      {at && (
        <div
          className="ctx-menu"
          ref={menuRef}
          role="menu"
          data-jump={target?.kind === "task" || undefined}
          style={{ left: at.x, top: at.y }}
        >
          {entries.map((entry, i) =>
            entry.kind === "sep" ? (
              <div key={`sep-${i}`} className="ctx-sep" role="separator" />
            ) : entry.opens ? (
              <div
                key={entry.label}
                className="ctx-item-wrap"
                onMouseEnter={() => setOpenSubmenu(entry.opens!)}
                onMouseLeave={() => setOpenSubmenu(null)}
              >
                <button type="button" role="menuitem" aria-haspopup="menu" className="ctx-item">
                  <span className="ctx-label">{entry.label}</span>
                  <span className="ctx-arrow" aria-hidden="true" />
                </button>
                {openSubmenu === "view" && entry.opens === "view" && (
                  <div className="ctx-menu ctx-submenu" role="menu">
                    {viewEntries.map((ve, vi) =>
                      ve.kind === "sep" ? (
                        <div key={`vsep-${vi}`} className="ctx-sep" role="separator" />
                      ) : (
                        <button
                          key={ve.label}
                          type="button"
                          role={ve.kind === "radio" ? "menuitemradio" : "menuitemcheckbox"}
                          aria-checked={ve.active}
                          className="ctx-item"
                          data-disabled={("disabled" in ve && ve.disabled) || undefined}
                          disabled={"disabled" in ve && ve.disabled}
                          onClick={() => {
                            if (ve.kind === "radio") ve.onSelect();
                            else ve.onToggle();
                            close();
                          }}
                        >
                          {ve.active && (
                            <span className="ctx-mark" data-kind={ve.kind === "radio" ? "radio" : "check"} />
                          )}
                          <span className="ctx-label">{ve.label}</span>
                        </button>
                      ),
                    )}
                  </div>
                )}
                {openSubmenu === "sort" && entry.opens === "sort" && (
                  <div className="ctx-menu ctx-submenu" role="menu">
                    {sortEntries.map((se) => (
                      <button
                        key={se.label}
                        type="button"
                        role="menuitem"
                        className="ctx-item"
                        onClick={() => {
                          se.onSelect();
                          close();
                        }}
                      >
                        <span className="ctx-label">{se.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <button
                key={entry.label}
                type="button"
                role="menuitem"
                className="ctx-item"
                data-disabled={entry.disabled || undefined}
                disabled={entry.disabled}
                onClick={() => {
                  run(entry.action);
                  close();
                }}
              >
                {entry.icon}
                <span className="ctx-label">{entry.label}</span>
                {entry.submenu && <span className="ctx-arrow" aria-hidden="true" />}
              </button>
            ),
          )}
        </div>
      )}

      {confirm && (
        <div className="win7-dialog-layer">
          <div className="win7-dialog" role="dialog" aria-modal="true" aria-label="Confirm Delete">
            <div className="win7-dialog-caption">Confirm Delete</div>
            <div className="win7-dialog-body">
              <p className="win7-dialog-message">
                {confirm.ids.length === 1
                  ? "Permanently delete this item? This can't be undone."
                  : `Permanently delete these ${confirm.ids.length} items? This can't be undone.`}
              </p>
            </div>
            <div className="win7-dialog-buttons">
              <button
                type="button"
                className="win7-dialog-btn"
                onClick={() => {
                  confirm.ids.forEach((id) => {
                    unregisterFile(id);
                    useFiles.getState().forget(id);
                    useFolders.getState().forget(id);
                    purge(id);
                  });
                  setConfirm(null);
                }}
              >
                Delete
              </button>
              <button type="button" className="win7-dialog-btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
